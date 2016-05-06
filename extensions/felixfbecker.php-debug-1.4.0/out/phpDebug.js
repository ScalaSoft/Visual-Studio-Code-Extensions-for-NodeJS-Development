var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var vscode = require('vscode-debugadapter');
var net = require('net');
var xdebug = require('./xdebugConnection');
var urlRelative = require('url-relative');
var moment = require('moment');
var url = require('url');
var childProcess = require('child_process');
var path = require('path');
var util = require('util');
var terminal_1 = require('./terminal');
/** converts a path to a file URI */
function fileUrl(path) {
    var pathName = path.replace(/\\/g, '/');
    // Windows drive letter must be prefixed with a slash
    if (pathName[0] !== '/') {
        pathName = '/' + pathName;
    }
    return encodeURI('file://' + pathName);
}
/** formats a xdebug property value for VS Code */
function formatPropertyValue(property) {
    var displayValue;
    if (property.hasChildren || property.type === 'array' || property.type === 'object') {
        if (property.type === 'array') {
            // for arrays, show the length, like a var_dump would do
            displayValue = 'array(' + (property.hasChildren ? property.numberOfChildren : 0) + ')';
        }
        else if (property.type === 'object' && property.class) {
            // for objects, show the class name as type (if specified)
            displayValue = property.class;
        }
        else {
            // edge case: show the type of the property as the value
            displayValue = property.type;
        }
    }
    else {
        // for null, uninitialized, resource, etc. show the type
        displayValue = property.value || property.type === 'string' ? property.value : property.type;
        if (property.type === 'string') {
            displayValue = '"' + displayValue + '"';
        }
        else if (property.type === 'bool') {
            displayValue = !!parseInt(displayValue) + '';
        }
    }
    return displayValue;
}
var PhpDebugSession = (function (_super) {
    __extends(PhpDebugSession, _super);
    function PhpDebugSession(debuggerLinesStartAt1, isServer) {
        if (debuggerLinesStartAt1 === void 0) { debuggerLinesStartAt1 = true; }
        if (isServer === void 0) { isServer = false; }
        _super.call(this, debuggerLinesStartAt1, isServer);
        /**
         * A map from VS Code thread IDs to XDebug Connections.
         * XDebug makes a new connection for each request to the webserver, we present these as threads to VS Code.
         * The threadId key is equal to the id attribute of the connection.
         */
        this._connections = new Map();
        /** A set of connections which are not yet running and are waiting for configurationDoneRequest */
        this._waitingConnections = new Set();
        /** A counter for unique source IDs */
        this._sourceIdCounter = 1;
        /** A map of VS Code source IDs to XDebug file URLs for virtual files (dpgp://whatever) and the corresponding connection */
        this._sources = new Map();
        /** A counter for unique stackframe IDs */
        this._stackFrameIdCounter = 1;
        /** A map from unique stackframe IDs (even across connections) to XDebug stackframes */
        this._stackFrames = new Map();
        /** A map from XDebug connections to their current status */
        this._statuses = new Map();
        /** A counter for unique context, property and eval result properties (as these are all requested by a VariableRequest from VS Code) */
        this._variableIdCounter = 1;
        /** A map from unique VS Code variable IDs to XDebug statuses for virtual error stack frames */
        this._errorStackFrames = new Map();
        /** A map from unique VS Code variable IDs to XDebug statuses for virtual error scopes */
        this._errorScopes = new Map();
        /** A map from unique VS Code variable IDs to an XDebug contexts */
        this._contexts = new Map();
        /** A map from unique VS Code variable IDs to a XDebug properties */
        this._properties = new Map();
        /** A map from unique VS Code variable IDs to XDebug eval result properties, because property children returned from eval commands are always inlined */
        this._evalResultProperties = new Map();
    }
    PhpDebugSession.prototype.initializeRequest = function (response, args) {
        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = true;
        this.sendResponse(response);
    };
    PhpDebugSession.prototype.attachRequest = function (response, args) {
        this.sendErrorResponse(response, 0, 'Attach requests are not supported');
        this.shutdown();
    };
    PhpDebugSession.prototype.launchRequest = function (response, args) {
        var _this = this;
        this._args = args;
        var server = this._server = net.createServer();
        server.on('connection', function (socket) {
            // new XDebug connection
            var connection = new xdebug.Connection(socket);
            _this._connections.set(connection.id, connection);
            _this._waitingConnections.add(connection);
            connection.waitForInitPacket()
                .then(function () {
                _this.sendEvent(new vscode.ThreadEvent('started', connection.id));
            })
                .then(function (initPacket) { return connection.sendFeatureSetCommand('max_depth', '1'); })
                .then(function (response) { return connection.sendFeatureSetCommand('max_children', '9999'); })
                .then(function (response) { return _this.sendEvent(new vscode.InitializedEvent()); })
                .catch(function (error) {
                console.error('error: ', error);
            });
        });
        server.listen(args.port || 9000, function () {
            if (args.program) {
                var runtimeArgs = args.runtimeArgs || [];
                var runtimeExecutable = args.runtimeExecutable || 'php';
                var programArgs = args.args || [];
                var cwd = args.cwd || process.cwd();
                var env = args.env || process.env;
                // launch in CLI mode
                if (args.externalConsole) {
                    terminal_1.Terminal.launchInTerminal(cwd, [runtimeExecutable].concat(runtimeArgs, [args.program], programArgs), env)
                        .then(function (script) {
                        // we only do this for CLI mode. In normal listen mode, only a thread exited event is send.
                        script.on('exit', function () {
                            _this.sendEvent(new vscode.TerminatedEvent());
                        });
                    })
                        .catch(function (error) {
                        _this.sendEvent(new vscode.OutputEvent(error.message, 'stderr'));
                    });
                }
                else {
                    var script = childProcess.spawn(runtimeExecutable, runtimeArgs.concat([args.program], programArgs), { cwd: cwd, env: env });
                    // redirect output to debug console
                    script.stdout.on('data', function (data) {
                        _this.sendEvent(new vscode.OutputEvent(data + '', 'stdout'));
                    });
                    script.stderr.on('data', function (data) {
                        _this.sendEvent(new vscode.OutputEvent(data + '', 'stderr'));
                    });
                    // we only do this for CLI mode. In normal listen mode, only a thread exited event is send.
                    script.on('exit', function () {
                        _this.sendEvent(new vscode.TerminatedEvent());
                    });
                    script.on('error', function (error) {
                        _this.sendEvent(new vscode.OutputEvent(error.message, 'stderr'));
                    });
                }
            }
            _this.sendResponse(response);
        });
    };
    /** Checks the status of a StatusResponse and notifies VS Code accordingly */
    PhpDebugSession.prototype._checkStatus = function (response) {
        var _this = this;
        var connection = response.connection;
        this._statuses.set(connection, response);
        if (response.status === 'stopping') {
            connection.sendStopCommand().then(function (response) { return _this._checkStatus(response); });
        }
        else if (response.status === 'stopped') {
            this._connections.delete(connection.id);
            this.sendEvent(new vscode.ThreadEvent('exited', connection.id));
            connection.close();
        }
        else if (response.status === 'break') {
            // StoppedEvent reason can be 'step', 'breakpoint', 'exception' or 'pause'
            var stoppedEventReason;
            var exceptionText;
            if (response.exception) {
                stoppedEventReason = 'exception';
                exceptionText = response.exception.name + ': ' + response.exception.message; // this seems to be ignored currently by VS Code
            }
            else if (response.command.indexOf('step') === 0) {
                stoppedEventReason = 'step';
            }
            else {
                stoppedEventReason = 'breakpoint';
            }
            this.sendEvent(new vscode.StoppedEvent(stoppedEventReason, connection.id, exceptionText));
        }
    };
    /** converts a server-side XDebug file URI to a local path for VS Code with respect to source root settings */
    PhpDebugSession.prototype.convertDebuggerPathToClient = function (fileUri) {
        if (typeof fileUri === 'string') {
            fileUri = url.parse(fileUri);
        }
        // convert the file URI to a path
        var serverPath = decodeURI(fileUri.pathname);
        // strip the trailing slash from Windows paths (indicated by a drive letter with a colon)
        if (/^\/[a-zA-Z]:\//.test(serverPath)) {
            serverPath = serverPath.substr(1);
        }
        var localPath;
        if (this._args.serverSourceRoot && this._args.localSourceRoot) {
            // get the part of the path that is relative to the source root
            var pathRelativeToSourceRoot = path.relative(this._args.serverSourceRoot, serverPath);
            // resolve from the local source root
            localPath = path.resolve(this._args.localSourceRoot, pathRelativeToSourceRoot);
        }
        else {
            localPath = path.normalize(serverPath);
        }
        return localPath;
    };
    /** converts a local path from VS Code to a server-side XDebug file URI with respect to source root settings */
    PhpDebugSession.prototype.convertClientPathToDebugger = function (localPath) {
        var localFileUri = fileUrl(localPath);
        var serverFileUri;
        if (this._args.serverSourceRoot && this._args.localSourceRoot) {
            var localSourceRootUrl = fileUrl(this._args.localSourceRoot);
            if (!localSourceRootUrl.endsWith('/')) {
                localSourceRootUrl += '/';
            }
            var serverSourceRootUrl = fileUrl(this._args.serverSourceRoot);
            if (!serverSourceRootUrl.endsWith('/')) {
                serverSourceRootUrl += '/';
            }
            // get the part of the path that is relative to the source root
            var urlRelativeToSourceRoot = urlRelative(localSourceRootUrl, localFileUri);
            // resolve from the server source root
            serverFileUri = url.resolve(serverSourceRootUrl, urlRelativeToSourceRoot);
        }
        else {
            serverFileUri = localFileUri;
        }
        return serverFileUri;
    };
    /** Logs all requests before dispatching */
    PhpDebugSession.prototype.dispatchRequest = function (request) {
        var log = "-> " + request.command + "Request\n" + util.inspect(request, { depth: null }) + "\n\n";
        console.log(log);
        if (this._args && this._args.log) {
            this.sendEvent(new vscode.OutputEvent(log));
        }
        _super.prototype.dispatchRequest.call(this, request);
    };
    PhpDebugSession.prototype.sendEvent = function (event) {
        var log = "<- " + event.event + "Event\n" + util.inspect(event, { depth: null }) + "\n\n";
        console.log(log);
        if (this._args && this._args.log && !(event instanceof vscode.OutputEvent)) {
            this.sendEvent(new vscode.OutputEvent(log));
        }
        _super.prototype.sendEvent.call(this, event);
    };
    PhpDebugSession.prototype.sendResponse = function (response) {
        var log = "<- " + response.command + "Response\n" + util.inspect(response, { depth: null }) + "\n\n";
        console[response.success ? 'log' : 'error'](log);
        if (this._args && this._args.log) {
            this.sendEvent(new vscode.OutputEvent(log, response.success ? 'stdout' : 'stderr'));
        }
        _super.prototype.sendResponse.call(this, response);
    };
    /** This is called for each source file that has breakpoints with all the breakpoints in that file and whenever these change. */
    PhpDebugSession.prototype.setBreakPointsRequest = function (response, args) {
        var _this = this;
        var fileUri = this.convertClientPathToDebugger(args.source.path);
        var connections = Array.from(this._connections.values());
        var xdebugBreakpoints;
        response.body = { breakpoints: [] };
        // this is returned to VS Code
        var vscodeBreakpoints;
        var breakpointsSetPromise;
        if (connections.length === 0) {
            // if there are no connections yet, we cannot verify any breakpoint
            vscodeBreakpoints = args.breakpoints.map(function (breakpoint) { return new vscode.Breakpoint(false, breakpoint.line); });
            breakpointsSetPromise = Promise.resolve();
        }
        else {
            vscodeBreakpoints = [];
            // create XDebug breakpoints from the arguments
            xdebugBreakpoints = args.breakpoints.map(function (breakpoint) {
                if (breakpoint.condition) {
                    return new xdebug.ConditionalBreakpoint(breakpoint.condition, fileUri, breakpoint.line);
                }
                else {
                    return new xdebug.LineBreakpoint(fileUri, breakpoint.line);
                }
            });
            // for all connections
            breakpointsSetPromise = Promise.all(connections.map(function (connection, connectionIndex) {
                // clear breakpoints for this file
                return connection.sendBreakpointListCommand()
                    .then(function (response) { return Promise.all(response.breakpoints
                    .filter(function (breakpoint) { return breakpoint instanceof xdebug.LineBreakpoint && breakpoint.fileUri === fileUri; })
                    .map(function (breakpoint) { return breakpoint.remove(); })); })
                    .then(function () { return Promise.all(xdebugBreakpoints.map(function (breakpoint) {
                    return connection.sendBreakpointSetCommand(breakpoint)
                        .then(function (xdebugResponse) {
                        // only capture each breakpoint once
                        if (connectionIndex === 0) {
                            vscodeBreakpoints.push(new vscode.Breakpoint(true, breakpoint.line));
                        }
                    })
                        .catch(function (error) {
                        // only capture each breakpoint once
                        if (connectionIndex === 0) {
                            console.error('breakpoint could not be set: ', error.message);
                            vscodeBreakpoints.push(new vscode.Breakpoint(false, breakpoint.line));
                        }
                    });
                })); });
            }));
        }
        breakpointsSetPromise
            .then(function () {
            response.body = { breakpoints: vscodeBreakpoints };
            _this.sendResponse(response);
        })
            .catch(function (error) {
            _this.sendErrorResponse(response, error.code, error.message);
        });
    };
    /** This is called once after all line breakpoints have been set and whenever the breakpoints settings change */
    PhpDebugSession.prototype.setExceptionBreakPointsRequest = function (response, args) {
        var _this = this;
        // args.filters can contain 'all' and 'uncaught', but 'uncaught' is the only setting XDebug supports
        var breakOnExceptions = args.filters.indexOf('uncaught') !== -1;
        if (args.filters.indexOf('all') !== -1) {
            this.sendEvent(new vscode.OutputEvent('breaking on caught exceptions is not supported by XDebug', 'stderr'));
        }
        var connections = Array.from(this._connections.values());
        Promise.all(connections.map(function (connection) {
            // get all breakpoints
            return connection.sendBreakpointListCommand()
                .then(function (response) { return Promise.all(response.breakpoints
                .filter(function (breakpoint) { return breakpoint.type === 'exception'; })
                .map(function (breakpoint) { return breakpoint.remove(); })); })
                .then(function () {
                // if enabled, set exception breakpoint for all exceptions
                if (breakOnExceptions) {
                    return connection.sendBreakpointSetCommand(new xdebug.ExceptionBreakpoint('*'));
                }
            });
        })).then(function () {
            _this.sendResponse(response);
        }).catch(function (error) {
            _this.sendErrorResponse(response, error.code, error.message);
        });
    };
    /** Executed after all breakpoints have been set by VS Code */
    PhpDebugSession.prototype.configurationDoneRequest = function (response, args) {
        var _this = this;
        for (var _i = 0, _a = Array.from(this._waitingConnections); _i < _a.length; _i++) {
            var connection = _a[_i];
            // either tell VS Code we stopped on entry or run the script
            if (this._args.stopOnEntry) {
                this.sendEvent(new vscode.StoppedEvent('entry', connection.id));
            }
            else {
                connection.sendRunCommand().then(function (response) { return _this._checkStatus(response); });
            }
            this._waitingConnections.delete(connection);
        }
        this.sendResponse(response);
    };
    /** Executed after a successfull launch or attach request and after a ThreadEvent */
    PhpDebugSession.prototype.threadsRequest = function (response) {
        // PHP doesn't have threads, but it may have multiple requests in parallel.
        // Think about a website that makes multiple, parallel AJAX requests to your PHP backend.
        // XDebug opens a new socket connection for each of them, we tell VS Code that these are our threads.
        var connections = Array.from(this._connections.values());
        response.body = {
            threads: connections.map(function (connection) { return new vscode.Thread(connection.id, "Request " + connection.id + " (" + moment(connection.timeEstablished).format('LTS') + ")"); })
        };
        this.sendResponse(response);
    };
    /** Called by VS Code after a StoppedEvent */
    PhpDebugSession.prototype.stackTraceRequest = function (response, args) {
        var _this = this;
        var connection = this._connections.get(args.threadId);
        connection.sendStackGetCommand()
            .then(function (xdebugResponse) {
            // First delete the old stack trace info ???
            // this._stackFrames.clear();
            // this._properties.clear();
            // this._contexts.clear();
            var status = _this._statuses.get(connection);
            if (xdebugResponse.stack.length === 0 && status.exception) {
                // special case: if a fatal error occurs (for example after an uncaught exception), the stack trace is EMPTY.
                // in that case, VS Code would normally not show any information to the user at all
                // to avoid this, we create a virtual stack frame with the info from the last status response we got
                var status_1 = _this._statuses.get(connection);
                var id = _this._stackFrameIdCounter++;
                var name_1 = status_1.exception.name;
                var line = status_1.line;
                var source;
                var urlObject = url.parse(status_1.fileUri);
                if (urlObject.protocol === 'dbgp:') {
                    var sourceReference = _this._sourceIdCounter++;
                    _this._sources.set(sourceReference, { connection: connection, url: status_1.fileUri });
                    // for eval code, we need to include .php extension to get syntax highlighting
                    source = new vscode.Source(status_1.exception.name + '.php', null, sourceReference, status_1.exception.name);
                    // for eval code, we add a "<?php" line at the beginning to get syntax highlighting (see sourceRequest)
                    line++;
                }
                else {
                    // XDebug paths are URIs, VS Code file paths
                    var filePath = _this.convertDebuggerPathToClient(urlObject);
                    // "Name" of the source and the actual file path
                    source = new vscode.Source(path.basename(filePath), filePath);
                }
                _this._errorStackFrames.set(id, status_1);
                response.body = { stackFrames: [new vscode.StackFrame(id, name_1, source, status_1.line, 1)] };
            }
            else {
                response.body = {
                    stackFrames: xdebugResponse.stack.map(function (stackFrame) {
                        var source;
                        var line = stackFrame.line;
                        var urlObject = url.parse(stackFrame.fileUri);
                        if (urlObject.protocol === 'dbgp:') {
                            var sourceReference = _this._sourceIdCounter++;
                            _this._sources.set(sourceReference, { connection: connection, url: stackFrame.fileUri });
                            // for eval code, we need to include .php extension to get syntax highlighting
                            source = new vscode.Source(stackFrame.type === 'eval' ? 'eval.php' : stackFrame.name, null, sourceReference, stackFrame.type);
                            // for eval code, we add a "<?php" line at the beginning to get syntax highlighting (see sourceRequest)
                            line++;
                        }
                        else {
                            // XDebug paths are URIs, VS Code file paths
                            var filePath = _this.convertDebuggerPathToClient(urlObject);
                            // "Name" of the source and the actual file path
                            source = new vscode.Source(path.basename(filePath), filePath);
                        }
                        // a new, unique ID for scopeRequests
                        var stackFrameId = _this._stackFrameIdCounter++;
                        // save the connection this stackframe belongs to and the level of the stackframe under the stacktrace id
                        _this._stackFrames.set(stackFrameId, stackFrame);
                        // prepare response for VS Code (column is always 1 since XDebug doesn't tell us the column)
                        return new vscode.StackFrame(stackFrameId, stackFrame.name, source, line, 1);
                    })
                };
            }
            _this.sendResponse(response);
        })
            .catch(function (error) {
            _this.sendErrorResponse(response, error.code, error.message);
        });
    };
    PhpDebugSession.prototype.sourceRequest = function (response, args) {
        var _this = this;
        var _a = this._sources.get(args.sourceReference), connection = _a.connection, url = _a.url;
        connection.sendSourceCommand(url).then(function (xdebugResponse) {
            var content = xdebugResponse.source;
            if (!/^\s*<\?(php|=)/.test(content)) {
                // we do this because otherwise VS Code would not show syntax highlighting for eval() code
                content = '<?php\n' + content;
            }
            response.body = { content: content };
            _this.sendResponse(response);
        });
    };
    PhpDebugSession.prototype.scopesRequest = function (response, args) {
        var _this = this;
        if (this._errorStackFrames.has(args.frameId)) {
            // VS Code is requesting the scopes for a virtual error stack frame
            var status_2 = this._errorStackFrames.get(args.frameId);
            if (status_2 && status_2.exception) {
                var variableId = this._variableIdCounter++;
                this._errorScopes.set(variableId, status_2);
                response.body = { scopes: [new vscode.Scope(status_2.exception.name, variableId)] };
            }
            this.sendResponse(response);
        }
        else {
            var stackFrame = this._stackFrames.get(args.frameId);
            stackFrame.getContexts()
                .then(function (contexts) {
                response.body = {
                    scopes: contexts.map(function (context) {
                        var variableId = _this._variableIdCounter++;
                        // remember that this new variable ID is assigned to a SCOPE (in XDebug "context"), not a variable (in XDebug "property"),
                        // so when VS Code does a variablesRequest with that ID we do a context_get and not a property_get
                        _this._contexts.set(variableId, context);
                        // send VS Code the variable ID as identifier
                        return new vscode.Scope(context.name, variableId);
                    })
                };
                var status = _this._statuses.get(stackFrame.connection);
                if (status && status.exception) {
                    var variableId = _this._variableIdCounter++;
                    _this._errorScopes.set(variableId, status);
                    response.body.scopes.unshift(new vscode.Scope(status.exception.name, variableId));
                }
                _this.sendResponse(response);
            })
                .catch(function (error) {
                _this.sendErrorResponse(response, error.code, error.message);
            });
        }
    };
    PhpDebugSession.prototype.variablesRequest = function (response, args) {
        var _this = this;
        var variablesReference = args.variablesReference;
        if (this._errorScopes.has(variablesReference)) {
            // this is a virtual error scope
            var status_3 = this._errorScopes.get(variablesReference);
            response.body = {
                variables: [
                    new vscode.Variable('name', '"' + status_3.exception.name + '"'),
                    new vscode.Variable('message', '"' + status_3.exception.message + '"')
                ]
            };
            this.sendResponse(response);
        }
        else {
            // it is a real scope
            var propertiesPromise;
            if (this._contexts.has(variablesReference)) {
                // VS Code is requesting the variables for a SCOPE, so we have to do a context_get
                var context_1 = this._contexts.get(variablesReference);
                propertiesPromise = context_1.getProperties();
            }
            else if (this._properties.has(variablesReference)) {
                // VS Code is requesting the subelements for a variable, so we have to do a property_get
                var property = this._properties.get(variablesReference);
                propertiesPromise = property.hasChildren ? property.getChildren() : Promise.resolve([]);
            }
            else if (this._evalResultProperties.has(variablesReference)) {
                // the children of properties returned from an eval command are always inlined, so we simply resolve them
                var property = this._evalResultProperties.get(variablesReference);
                propertiesPromise = Promise.resolve(property.hasChildren ? property.children : []);
            }
            else {
                this.sendErrorResponse(response, 0, 'Unknown variable reference');
                return;
            }
            propertiesPromise
                .then(function (properties) {
                response.body = {
                    variables: properties.map(function (property) {
                        var displayValue = formatPropertyValue(property);
                        var variablesReference;
                        if (property.hasChildren || property.type === 'array' || property.type === 'object') {
                            // if the property has children, we have to send a variableReference back to VS Code
                            // so it can receive the child elements in another request.
                            // for arrays and objects we do it even when it does not have children so the user can still expand/collapse the entry
                            variablesReference = _this._variableIdCounter++;
                            if (property instanceof xdebug.Property) {
                                _this._properties.set(variablesReference, property);
                            }
                            else if (property instanceof xdebug.EvalResultProperty) {
                                _this._evalResultProperties.set(variablesReference, property);
                            }
                        }
                        else {
                            variablesReference = 0;
                        }
                        return new vscode.Variable(property.name, displayValue, variablesReference);
                    })
                };
                _this.sendResponse(response);
            })
                .catch(function (error) {
                console.error(util.inspect(error));
                _this.sendErrorResponse(response, error.code, error.message);
            });
        }
    };
    PhpDebugSession.prototype.continueRequest = function (response, args) {
        var _this = this;
        if (!args.threadId) {
            this.sendErrorResponse(response, 0, 'No active connection');
            return;
        }
        var connection = this._connections.get(args.threadId);
        connection.sendRunCommand()
            .then(function (response) { return _this._checkStatus(response); })
            .catch(function (error) { return _this.sendErrorResponse(response, error.code, error.message); });
        this.sendResponse(response);
    };
    PhpDebugSession.prototype.nextRequest = function (response, args) {
        var _this = this;
        if (!args.threadId) {
            this.sendErrorResponse(response, 0, 'No active connection');
            return;
        }
        var connection = this._connections.get(args.threadId);
        connection.sendStepOverCommand()
            .then(function (response) { return _this._checkStatus(response); })
            .catch(function (error) { return _this.sendErrorResponse(response, error.code, error.message); });
        this.sendResponse(response);
    };
    PhpDebugSession.prototype.stepInRequest = function (response, args) {
        var _this = this;
        if (!args.threadId) {
            this.sendErrorResponse(response, 0, 'No active connection');
            return;
        }
        var connection = this._connections.get(args.threadId);
        connection.sendStepIntoCommand()
            .then(function (response) { return _this._checkStatus(response); })
            .catch(function (error) { return _this.sendErrorResponse(response, error.code, error.message); });
        this.sendResponse(response);
    };
    PhpDebugSession.prototype.stepOutRequest = function (response, args) {
        var _this = this;
        if (!args.threadId) {
            this.sendErrorResponse(response, 0, 'No active connection');
            return;
        }
        var connection = this._connections.get(args.threadId);
        connection.sendStepOutCommand()
            .then(function (response) { return _this._checkStatus(response); })
            .catch(function (error) { return _this.sendErrorResponse(response, error.code, error.message); });
        this.sendResponse(response);
    };
    PhpDebugSession.prototype.pauseRequest = function (response, args) {
        this.sendErrorResponse(response, 0, 'Pausing the execution is not supported by XDebug');
    };
    PhpDebugSession.prototype.disconnectRequest = function (response, args) {
        var _this = this;
        Promise.all(Array.from(this._connections).map(function (_a) {
            var id = _a[0], connection = _a[1];
            return connection.sendStopCommand()
                .then(function (response) { return connection.close(); })
                .then(function () {
                _this._connections.delete(id);
                if (_this._waitingConnections.has(connection)) {
                    _this._waitingConnections.delete(connection);
                }
            })
                .catch(function () { });
        })).then(function () {
            _this._server.close(function () {
                _this.shutdown();
                _this.sendResponse(response);
            });
        }).catch(function (error) {
            _this.sendErrorResponse(response, error.code, error.message);
        });
    };
    PhpDebugSession.prototype.evaluateRequest = function (response, args) {
        var _this = this;
        var connection = this._stackFrames.get(args.frameId).connection;
        connection.sendEvalCommand(args.expression)
            .then(function (xdebugResponse) {
            if (xdebugResponse.result) {
                var displayValue = formatPropertyValue(xdebugResponse.result);
                var variablesReference;
                // if the property has children, generate a variable ID and save the property (including children) so VS Code can request them
                if (xdebugResponse.result.hasChildren || xdebugResponse.result.type === 'array' || xdebugResponse.result.type === 'object') {
                    variablesReference = _this._variableIdCounter++;
                    _this._evalResultProperties.set(variablesReference, xdebugResponse.result);
                }
                else {
                    variablesReference = 0;
                }
                response.body = { result: displayValue, variablesReference: variablesReference };
            }
            else {
                response.body = { result: 'no result', variablesReference: 0 };
            }
            _this.sendResponse(response);
        })
            .catch(function (error) {
            _this.sendErrorResponse(response, error.code, error.message);
        });
    };
    return PhpDebugSession;
})(vscode.DebugSession);
vscode.DebugSession.run(PhpDebugSession);
//# sourceMappingURL=phpDebug.js.map