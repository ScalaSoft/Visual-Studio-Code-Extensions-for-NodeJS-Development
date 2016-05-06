"use strict";
var vscode = require("vscode");
var cmd = require("./command");
var cfg = require("./configuration");
var Launcher = (function () {
    function Launcher(textEditor) {
        if (textEditor === void 0) { textEditor = null; }
        this._state = null;
        this._commands = null;
        this._startTerminal = null;
        this._state = new cfg.LauncherState(textEditor);
        this.initCommands();
    }
    Launcher.prototype.runTerminalInItemFolder = function () {
        if (this._startTerminal !== null) {
            var targetFolder = this._state.activeItemPath;
            if (!targetFolder) {
                targetFolder = this._state.workspacePath;
            }
            // Launch Terminal in workspace folder if there isn't an open file
            this._startTerminal.run(targetFolder);
        }
    };
    Launcher.prototype.runTerminalInWorkspaceFolder = function () {
        if (this._startTerminal !== null) {
            this._startTerminal.run(this._state.workspacePath);
        }
    };
    Launcher.prototype.runScriptsManager = function () {
        var _this = this;
        var menu = [];
        for (var command in this._commands) {
            menu.push(command);
        }
        vscode.window.showQuickPick(menu).then(function (value) {
            var item = _this._commands[value];
            if (!item) {
                return;
            }
            item.command.run(item.startIn);
        });
    };
    Launcher.prototype.initCommands = function () {
        var _this = this;
        this._commands = {};
        // Load commands from the configuration
        var config = vscode.workspace.getConfiguration("launcher");
        var commands = config.get("commands", []);
        commands.forEach(function (cfg) {
            _this._commands[cfg.description] = {
                command: new cmd.Command(cfg.description, cfg.executable, cfg.parameters, cfg.output, _this._state),
                startIn: cfg.startIn
            };
        });
        // Load terminal command
        this._startTerminal = new cmd.TerminalCommand(this._state);
    };
    return Launcher;
})();
exports.Launcher = Launcher;
//# sourceMappingURL=launcher.js.map