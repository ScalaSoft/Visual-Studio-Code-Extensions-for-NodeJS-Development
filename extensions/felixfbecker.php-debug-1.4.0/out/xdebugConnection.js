var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var iconv = require('iconv-lite');
var dbgp_1 = require('./dbgp');
/** The encoding all XDebug messages are encoded with */
var ENCODING = 'iso-8859-1';
/** The first packet we receive from XDebug. Returned by waitForInitPacket() */
var InitPacket = (function () {
    /**
     * @param  {XMLDocument} document - An XML document to read from
     * @param  {Connection} connection
     */
    function InitPacket(document, connection) {
        var documentElement = document.documentElement;
        this.fileUri = documentElement.getAttribute('fileuri');
        this.language = documentElement.getAttribute('language');
        this.protocolVersion = documentElement.getAttribute('protocol_version');
        this.ideKey = documentElement.getAttribute('idekey');
        this.connection = connection;
    }
    return InitPacket;
})();
exports.InitPacket = InitPacket;
/** Error class for errors returned from XDebug */
var XDebugError = (function (_super) {
    __extends(XDebugError, _super);
    function XDebugError(message, code) {
        _super.call(this, message);
        this.code = code;
        this.name = 'XDebugError';
    }
    return XDebugError;
})(Error);
exports.XDebugError = XDebugError;
/** The base class for all XDebug responses to commands executed on a connection */
var Response = (function () {
    /**
     * contructs a new Response object from an XML document.
     * If there is an error child node, an exception is thrown with the appropiate code and message.
     * @param  {XMLDocument} document - An XML document to read from
     * @param  {Connection} connection
     */
    function Response(document, connection) {
        var documentElement = document.documentElement;
        if (documentElement.hasChildNodes() && documentElement.firstChild.nodeName === 'error') {
            var errorNode = documentElement.firstChild;
            var code = parseInt(errorNode.getAttribute('code'));
            var message = errorNode.textContent;
            throw new XDebugError(message, code);
        }
        this.transactionId = parseInt(documentElement.getAttribute('transaction_id'));
        this.command = documentElement.getAttribute('command');
        this.connection = connection;
    }
    return Response;
})();
exports.Response = Response;
/** A response to the status command */
var StatusResponse = (function (_super) {
    __extends(StatusResponse, _super);
    function StatusResponse(document, connection) {
        _super.call(this, document, connection);
        var documentElement = document.documentElement;
        this.status = documentElement.getAttribute('status');
        this.reason = documentElement.getAttribute('reason');
        if (documentElement.hasChildNodes()) {
            var messageNode = documentElement.firstChild;
            if (messageNode.hasAttribute('exception')) {
                this.exception = {
                    name: messageNode.getAttribute('exception'),
                    message: messageNode.textContent
                };
            }
            if (messageNode.hasAttribute('filename')) {
                this.fileUri = messageNode.getAttribute('filename');
            }
            if (messageNode.hasAttribute('lineno')) {
                this.line = parseInt(messageNode.getAttribute('lineno'));
            }
        }
    }
    return StatusResponse;
})(Response);
exports.StatusResponse = StatusResponse;
/** Abstract base class for all breakpoints */
var Breakpoint = (function () {
    function Breakpoint() {
        if (typeof arguments[0] === 'object') {
            // from XML
            var breakpointNode = arguments[0];
            this.connection = arguments[1];
            this.type = breakpointNode.getAttribute('type');
            this.id = parseInt(breakpointNode.getAttribute('id'));
            this.state = breakpointNode.getAttribute('state');
        }
        else {
            this.type = arguments[0];
        }
    }
    /** dynamically detects the type of breakpoint and returns the appropiate object */
    Breakpoint.fromXml = function (breakpointNode, connection) {
        switch (breakpointNode.getAttribute('type')) {
            case 'exception': return new ExceptionBreakpoint(breakpointNode, connection);
            case 'line': return new LineBreakpoint(breakpointNode, connection);
            case 'conditional': return new ConditionalBreakpoint(breakpointNode, connection);
        }
    };
    /** Removes the breakpoint by sending a breakpoint_remove command */
    Breakpoint.prototype.remove = function () {
        return this.connection.sendBreakpointRemoveCommand(this);
    };
    return Breakpoint;
})();
exports.Breakpoint = Breakpoint;
/** class for line breakpoints. Returned from a breakpoint_list or passed to sendBreakpointSetCommand */
var LineBreakpoint = (function (_super) {
    __extends(LineBreakpoint, _super);
    function LineBreakpoint() {
        if (typeof arguments[0] === 'object') {
            var breakpointNode = arguments[0];
            var connection = arguments[1];
            _super.call(this, breakpointNode, connection);
            this.line = parseInt(breakpointNode.getAttribute('line'));
        }
        else {
            // construct from arguments
            this.fileUri = arguments[0];
            this.line = arguments[1];
            _super.call(this, 'line');
        }
    }
    return LineBreakpoint;
})(Breakpoint);
exports.LineBreakpoint = LineBreakpoint;
/** class for exception breakpoints. Returned from a breakpoint_list or passed to sendBreakpointSetCommand */
var ExceptionBreakpoint = (function (_super) {
    __extends(ExceptionBreakpoint, _super);
    function ExceptionBreakpoint() {
        if (typeof arguments[0] === 'object') {
            // from XML
            var breakpointNode = arguments[0];
            var connection = arguments[1];
            _super.call(this, breakpointNode, connection);
            this.exception = breakpointNode.getAttribute('exception');
        }
        else {
            // from arguments
            _super.call(this, 'exception');
            this.exception = arguments[0];
        }
    }
    return ExceptionBreakpoint;
})(Breakpoint);
exports.ExceptionBreakpoint = ExceptionBreakpoint;
/** class for conditional breakpoints. Returned from a breakpoint_list or passed to sendBreakpointSetCommand */
var ConditionalBreakpoint = (function (_super) {
    __extends(ConditionalBreakpoint, _super);
    function ConditionalBreakpoint() {
        if (typeof arguments[0] === 'object') {
            // from XML
            var breakpointNode = arguments[0];
            var connection = arguments[1];
            _super.call(this, breakpointNode, connection);
            this.expression = breakpointNode.getAttribute('expression'); // Base64 encoded?
        }
        else {
            // from arguments
            _super.call(this, 'conditional');
            this.expression = arguments[0];
            this.fileUri = arguments[1];
            this.line = arguments[2];
        }
    }
    return ConditionalBreakpoint;
})(Breakpoint);
exports.ConditionalBreakpoint = ConditionalBreakpoint;
/** Response to a breakpoint_set command */
var BreakpointSetResponse = (function (_super) {
    __extends(BreakpointSetResponse, _super);
    function BreakpointSetResponse(document, connection) {
        _super.call(this, document, connection);
        this.breakpointId = parseInt(document.documentElement.getAttribute('id'));
    }
    return BreakpointSetResponse;
})(Response);
exports.BreakpointSetResponse = BreakpointSetResponse;
/** The response to a breakpoint_list command */
var BreakpointListResponse = (function (_super) {
    __extends(BreakpointListResponse, _super);
    /**
     * @param  {XMLDocument} document
     * @param  {Connection} connection
     */
    function BreakpointListResponse(document, connection) {
        _super.call(this, document, connection);
        this.breakpoints = Array.from(document.documentElement.childNodes).map(function (breakpointNode) { return Breakpoint.fromXml(breakpointNode, connection); });
    }
    return BreakpointListResponse;
})(Response);
exports.BreakpointListResponse = BreakpointListResponse;
/** One stackframe inside a stacktrace retrieved through stack_get */
var StackFrame = (function () {
    /**
     * @param  {Element} stackFrameNode
     * @param  {Connection} connection
     */
    function StackFrame(stackFrameNode, connection) {
        this.name = stackFrameNode.getAttribute('where');
        this.fileUri = stackFrameNode.getAttribute('filename');
        this.type = stackFrameNode.getAttribute('type');
        this.line = parseInt(stackFrameNode.getAttribute('lineno'));
        this.level = parseInt(stackFrameNode.getAttribute('level'));
        this.connection = connection;
    }
    /** Returns the available contexts (scopes, such as "Local" and "Superglobals") by doing a context_names command */
    StackFrame.prototype.getContexts = function () {
        return this.connection.sendContextNamesCommand(this).then(function (response) { return response.contexts; });
    };
    return StackFrame;
})();
exports.StackFrame = StackFrame;
/** The response to a stack_get command */
var StackGetResponse = (function (_super) {
    __extends(StackGetResponse, _super);
    /**
     * @param  {XMLDocument} document
     * @param  {Connection} connection
     */
    function StackGetResponse(document, connection) {
        _super.call(this, document, connection);
        this.stack = Array.from(document.documentElement.childNodes).map(function (stackFrameNode) { return new StackFrame(stackFrameNode, connection); });
    }
    return StackGetResponse;
})(Response);
exports.StackGetResponse = StackGetResponse;
var SourceResponse = (function (_super) {
    __extends(SourceResponse, _super);
    function SourceResponse(document, connection) {
        _super.call(this, document, connection);
        this.source = (new Buffer(document.documentElement.textContent, 'base64')).toString();
    }
    return SourceResponse;
})(Response);
exports.SourceResponse = SourceResponse;
/** A context inside a stack frame, like "Local" or "Superglobals" */
var Context = (function () {
    /**
     * @param  {Element} contextNode
     * @param  {StackFrame} stackFrame
     */
    function Context(contextNode, stackFrame) {
        this.id = parseInt(contextNode.getAttribute('id'));
        this.name = contextNode.getAttribute('name');
        this.stackFrame = stackFrame;
    }
    /**
     * Returns the properties (variables) inside this context by doing a context_get command
     * @returns Promise.<Property[]>
     */
    Context.prototype.getProperties = function () {
        return this.stackFrame.connection.sendContextGetCommand(this).then(function (response) { return response.properties; });
    };
    return Context;
})();
exports.Context = Context;
/** Response to a context_names command */
var ContextNamesResponse = (function (_super) {
    __extends(ContextNamesResponse, _super);
    /**
     * @param  {XMLDocument} document
     * @param  {StackFrame} stackFrame
     */
    function ContextNamesResponse(document, stackFrame) {
        _super.call(this, document, stackFrame.connection);
        this.contexts = Array.from(document.documentElement.childNodes).map(function (contextNode) { return new Context(contextNode, stackFrame); });
    }
    return ContextNamesResponse;
})(Response);
exports.ContextNamesResponse = ContextNamesResponse;
/** The parent for properties inside a scope and properties retrieved through eval requests */
var BaseProperty = (function () {
    function BaseProperty(propertyNode) {
        if (propertyNode.hasAttribute('name')) {
            this.name = propertyNode.getAttribute('name');
        }
        this.type = propertyNode.getAttribute('type');
        if (propertyNode.hasAttribute('classname')) {
            this.class = propertyNode.getAttribute('classname');
        }
        this.hasChildren = !!parseInt(propertyNode.getAttribute('children'));
        if (this.hasChildren) {
            this.numberOfChildren = parseInt(propertyNode.getAttribute('numchildren'));
        }
        else {
            var encoding = propertyNode.getAttribute('encoding');
            if (encoding) {
                this.value = iconv.encode(propertyNode.textContent, encoding) + '';
            }
            else {
                this.value = propertyNode.textContent;
            }
        }
    }
    return BaseProperty;
})();
exports.BaseProperty = BaseProperty;
/** a property (variable) inside a context or a child of another property */
var Property = (function (_super) {
    __extends(Property, _super);
    /**
     * @param  {Element} propertyNode
     * @param  {Context} context
     */
    function Property(propertyNode, context) {
        _super.call(this, propertyNode);
        this.fullName = propertyNode.getAttribute('fullname');
        this.context = context;
    }
    /**
     * Returns the child properties of this property by doing another property_get
     * @returns Promise.<Property[]>
     */
    Property.prototype.getChildren = function () {
        if (!this.hasChildren) {
            return Promise.reject(new Error('This property has no children'));
        }
        return this.context.stackFrame.connection.sendPropertyGetCommand(this).then(function (response) { return response.children; });
    };
    return Property;
})(BaseProperty);
exports.Property = Property;
/** The response to a context_get command */
var ContextGetResponse = (function (_super) {
    __extends(ContextGetResponse, _super);
    /**
     * @param  {XMLDocument} document
     * @param  {Context} context
     */
    function ContextGetResponse(document, context) {
        _super.call(this, document, context.stackFrame.connection);
        this.properties = Array.from(document.documentElement.childNodes).map(function (propertyNode) { return new Property(propertyNode, context); });
    }
    return ContextGetResponse;
})(Response);
exports.ContextGetResponse = ContextGetResponse;
/** The response to a property_get command */
var PropertyGetResponse = (function (_super) {
    __extends(PropertyGetResponse, _super);
    /**
     * @param  {XMLDocument} document
     * @param  {Property} property
     */
    function PropertyGetResponse(document, property) {
        _super.call(this, document, property.context.stackFrame.connection);
        this.children = Array.from(document.documentElement.firstChild.childNodes).map(function (propertyNode) { return new Property(propertyNode, property.context); });
    }
    return PropertyGetResponse;
})(Response);
exports.PropertyGetResponse = PropertyGetResponse;
/** class for properties returned from eval commands. These don't have a full name or an ID, but have all children already inlined. */
var EvalResultProperty = (function (_super) {
    __extends(EvalResultProperty, _super);
    function EvalResultProperty(propertyNode) {
        _super.call(this, propertyNode);
        if (this.hasChildren) {
            this.children = Array.from(propertyNode.childNodes).map(function (propertyNode) { return new EvalResultProperty(propertyNode); });
        }
    }
    return EvalResultProperty;
})(BaseProperty);
exports.EvalResultProperty = EvalResultProperty;
/** The response to an eval command */
var EvalResponse = (function (_super) {
    __extends(EvalResponse, _super);
    function EvalResponse(document, connection) {
        _super.call(this, document, connection);
        if (document.documentElement.hasChildNodes()) {
            this.result = new EvalResultProperty(document.documentElement.firstChild);
        }
    }
    return EvalResponse;
})(Response);
exports.EvalResponse = EvalResponse;
/** The response to an feature_set command */
var FeatureSetResponse = (function (_super) {
    __extends(FeatureSetResponse, _super);
    function FeatureSetResponse(document, connection) {
        _super.call(this, document, connection);
        this.feature = document.documentElement.getAttribute('feature');
    }
    return FeatureSetResponse;
})(Response);
exports.FeatureSetResponse = FeatureSetResponse;
/**
 * This class represents a connection to XDebug and is instantiated with a socket.
 */
var Connection = (function (_super) {
    __extends(Connection, _super);
    /** Constructs a new connection that uses the given socket to communicate with XDebug. */
    function Connection(socket) {
        var _this = this;
        _super.call(this, socket);
        /** a counter for unique transaction IDs. */
        this._transactionCounter = 1;
        /**
         * a map from transaction IDs to pending commands that have been sent to XDebug and are awaiting a response.
         * This should in theory only contain max one element at any time.
         */
        this._pendingCommands = new Map();
        /**
         * XDebug does NOT support async communication.
         * This means before sending a new command, we have to wait until we get a response for the previous.
         * This array is a stack of commands that get passed to _sendCommand once XDebug can accept commands again.
         */
        this._commandQueue = [];
        this.id = Connection._connectionCounter++;
        this.timeEstablished = new Date();
        this._initPromise = new Promise(function (resolve, reject) {
            _this._initPromiseResolveFn = resolve;
        });
        console.log('New XDebug Connection #' + this.id);
    }
    /** Returns a promise that gets resolved once the init packet arrives */
    Connection.prototype.waitForInitPacket = function () {
        return this._initPromise;
    };
    /**
     * Handles a response by firing and then removing a pending transaction callback.
     * After that, the next command in the queue is executed (if there is any).
     */
    Connection.prototype.handleResponse = function (response) {
        if (response.documentElement.nodeName === 'init') {
            this._initPromiseResolveFn(new InitPacket(response, this));
        }
        else {
            var transactionId = parseInt(response.documentElement.getAttribute('transaction_id'));
            if (this._pendingCommands.has(transactionId)) {
                var command = this._pendingCommands.get(transactionId);
                this._pendingCommands.delete(transactionId);
                command.resolveFn(response);
            }
            if (this._commandQueue.length > 0) {
                var command = this._commandQueue.shift();
                this._executeCommand(command);
            }
        }
    };
    /**
     * Pushes a new command to the queue that will be executed after all the previous commands have finished and we received a response.
     * If the queue is empty AND there are no pending transactions (meaning we already received a response and XDebug is waiting for
     * commands) the command will be executed emidiatly.
     */
    Connection.prototype._enqueueCommand = function (name, args, data) {
        var _this = this;
        return new Promise(function (resolveFn, rejectFn) {
            var command = { name: name, args: args, data: data, resolveFn: resolveFn, rejectFn: rejectFn };
            if (_this._commandQueue.length === 0 && _this._pendingCommands.size === 0) {
                _this._executeCommand(command);
            }
            else {
                _this._commandQueue.push(command);
            }
        });
    };
    /**
     * Sends a command to XDebug with a new transaction ID and calls the callback on the command. This can
     * only be called when XDebug can actually accept commands, which is after we received a response for the
     * previous command.
     */
    Connection.prototype._executeCommand = function (command) {
        var transactionId = this._transactionCounter++;
        var commandString = command.name + ' -i ' + transactionId;
        if (command.args) {
            commandString += ' ' + command.args;
        }
        if (command.data) {
            commandString += ' -- ' + (new Buffer(command.data)).toString('base64');
        }
        commandString += '\0';
        var data = iconv.encode(commandString, ENCODING);
        this.write(data);
        this._pendingCommands.set(transactionId, command);
    };
    // ------------------------ status --------------------------------------------
    /** Sends a status command */
    Connection.prototype.sendStatusCommand = function () {
        var _this = this;
        return this._enqueueCommand('status').then(function (document) { return new StatusResponse(document, _this); });
    };
    // ------------------------ feature negotiation --------------------------------
    /**
     * Sends a feature_get command
     * feature can be one of
     *  - language_supports_threads
     *  - language_name
     *  - language_version
     *  - encoding
     *  - protocol_version
     *  - supports_async
     *  - data_encoding
     *  - breakpoint_languages
     *  - breakpoint_types
     *  - multiple_sessions
     *  - max_children
     *  - max_data
     *  - max_depth
     *  - extended_properties
     * optional features:
     *  - supports_postmortem
     *  - show_hidden
     *  - notify_ok
     * or any command.
     */
    Connection.prototype.sendFeatureGetCommand = function (feature) {
        return this._enqueueCommand('feature_get', "-n feature");
    };
    /**
     * Sends a feature_set command
     * feature can be one of
     *  - multiple_sessions
     *  - max_children
     *  - max_data
     *  - max_depth
     *  - extended_properties
     * optional features:
     *  - show_hidden
     *  - notify_ok
     */
    Connection.prototype.sendFeatureSetCommand = function (feature, value) {
        var _this = this;
        return this._enqueueCommand('feature_set', "-n " + feature + " -v " + value).then(function (document) { return new FeatureSetResponse(document, _this); });
    };
    // ---------------------------- breakpoints ------------------------------------
    /**
     * Sends a breakpoint_set command that sets a breakpoint.
     * @param {Breakpoint} breakpoint - an instance of LineBreakpoint, ConditionalBreakpoint or ExceptionBreakpoint
     * @returns Promise.<BreakpointSetResponse>
     */
    Connection.prototype.sendBreakpointSetCommand = function (breakpoint) {
        var _this = this;
        var args = "-t " + breakpoint.type;
        var data;
        if (breakpoint instanceof LineBreakpoint) {
            args += " -f " + breakpoint.fileUri + " -n " + breakpoint.line;
        }
        else if (breakpoint instanceof ExceptionBreakpoint) {
            args += " -x " + breakpoint.exception;
        }
        else if (breakpoint instanceof ConditionalBreakpoint) {
            args += " -f " + breakpoint.fileUri;
            if (typeof breakpoint.line === 'number') {
                args += " -n " + breakpoint.line;
            }
            data = breakpoint.expression;
        }
        return this._enqueueCommand('breakpoint_set', args, data).then(function (document) { return new BreakpointSetResponse(document, _this); });
    };
    /** sends a breakpoint_list command */
    Connection.prototype.sendBreakpointListCommand = function () {
        var _this = this;
        return this._enqueueCommand('breakpoint_list').then(function (document) { return new BreakpointListResponse(document, _this); });
    };
    /** sends a breakpoint_remove command */
    Connection.prototype.sendBreakpointRemoveCommand = function (breakpoint) {
        var _this = this;
        return this._enqueueCommand('breakpoint_remove', "-d " + breakpoint.id).then(function (document) { return new Response(document, _this); });
    };
    // ----------------------------- continuation ---------------------------------
    /** sends a run command */
    Connection.prototype.sendRunCommand = function () {
        var _this = this;
        return this._enqueueCommand('run').then(function (document) { return new StatusResponse(document, _this); });
    };
    /** sends a step_into command */
    Connection.prototype.sendStepIntoCommand = function () {
        var _this = this;
        return this._enqueueCommand('step_into').then(function (document) { return new StatusResponse(document, _this); });
    };
    /** sends a step_over command */
    Connection.prototype.sendStepOverCommand = function () {
        var _this = this;
        return this._enqueueCommand('step_over').then(function (document) { return new StatusResponse(document, _this); });
    };
    /** sends a step_out command */
    Connection.prototype.sendStepOutCommand = function () {
        var _this = this;
        return this._enqueueCommand('step_out').then(function (document) { return new StatusResponse(document, _this); });
    };
    /** sends a stop command */
    Connection.prototype.sendStopCommand = function () {
        var _this = this;
        return this._enqueueCommand('stop').then(function (document) { return new StatusResponse(document, _this); });
    };
    // ------------------------------ stack ----------------------------------------
    /** Sends a stack_get command */
    Connection.prototype.sendStackGetCommand = function () {
        var _this = this;
        return this._enqueueCommand('stack_get').then(function (document) { return new StackGetResponse(document, _this); });
    };
    Connection.prototype.sendSourceCommand = function (uri) {
        var _this = this;
        return this._enqueueCommand('source', "-f " + uri).then(function (document) { return new SourceResponse(document, _this); });
    };
    // ------------------------------ context --------------------------------------
    /** Sends a context_names command. */
    Connection.prototype.sendContextNamesCommand = function (stackFrame) {
        return this._enqueueCommand('context_names', "-d " + stackFrame.level).then(function (document) { return new ContextNamesResponse(document, stackFrame); });
    };
    /** Sends a context_get comand */
    Connection.prototype.sendContextGetCommand = function (context) {
        return this._enqueueCommand('context_get', "-d " + context.stackFrame.level + " -c " + context.id).then(function (document) { return new ContextGetResponse(document, context); });
    };
    /** Sends a property_get command */
    Connection.prototype.sendPropertyGetCommand = function (property) {
        return this._enqueueCommand('property_get', "-d " + property.context.stackFrame.level + " -c " + property.context.id + " -n " + property.fullName).then(function (document) { return new PropertyGetResponse(document, property); });
    };
    // ------------------------------- eval -----------------------------------------
    /** sends an eval command */
    Connection.prototype.sendEvalCommand = function (expression) {
        var _this = this;
        return this._enqueueCommand('eval', null, expression).then(function (document) { return new EvalResponse(document, _this); });
    };
    /** a counter for unique connection IDs */
    Connection._connectionCounter = 1;
    return Connection;
})(dbgp_1.DbgpConnection);
exports.Connection = Connection;
//# sourceMappingURL=xdebugConnection.js.map