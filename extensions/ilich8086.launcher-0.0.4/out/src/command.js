var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var cp = require("child_process");
var vscode = require("vscode");
var Command = (function () {
    function Command(description, executable, parameters, output, state) {
        this._description = description;
        this._executable = executable;
        this._parameters = parameters;
        this._output = output;
        if (typeof this._parameters !== "string") {
            this._parameters = "";
        }
        this._state = state;
    }
    Object.defineProperty(Command.prototype, "description", {
        get: function () {
            return this._description;
        },
        enumerable: true,
        configurable: true
    });
    Command.prototype.run = function (startIn) {
        var _this = this;
        var parameters = this.applyTemplate(this._parameters);
        startIn = this.applyTemplate(startIn);
        var command = "\"" + this._executable + "\" " + parameters;
        var options = {};
        if (startIn) {
            options.cwd = startIn;
        }
        cp.exec(command, options, function (error, stdout, stderr) {
            if (!_this._output) {
                return;
            }
            var output;
            if (error != null) {
                output = error.message;
            }
            else {
                output = stdout.toString();
                output += stderr.toString();
            }
            var outputChannel = vscode.window.createOutputChannel("Launcher: Command Output");
            outputChannel.append(output);
            outputChannel.show();
        });
    };
    Command.prototype.applyTemplate = function (str) {
        if (!str) {
            return str;
        }
        str = str.replace(/%item%/ig, this._state.activeItem);
        str = str.replace(/%item_path%/ig, this._state.activeItemPath);
        str = str.replace(/%workspace%/ig, this._state.workspacePath);
        return str;
    };
    return Command;
})();
exports.Command = Command;
var TerminalCommand = (function (_super) {
    __extends(TerminalCommand, _super);
    function TerminalCommand(state) {
        var config = vscode.workspace.getConfiguration("launcher.terminal");
        var executable = config.get("executable", "");
        var parameters = config.get("parameters", "");
        if (executable === "") {
            if (process.platform === "win32") {
                executable = "cmd.exe";
                parameters = "/c start /wait";
            }
            else if (process.platform === "darwin") {
                executable = "iTerm.sh";
                parameters = "";
            }
            else if (process.platform === "linux") {
                executable = "xterm";
                parameters = "";
            }
            else {
                // Use Windows command by default
                executable = "cmd.exe";
                parameters = "/c start /wait";
            }
        }
        _super.call(this, "Terminal", executable, parameters, false, state);
    }
    return TerminalCommand;
})(Command);
exports.TerminalCommand = TerminalCommand;
//# sourceMappingURL=command.js.map