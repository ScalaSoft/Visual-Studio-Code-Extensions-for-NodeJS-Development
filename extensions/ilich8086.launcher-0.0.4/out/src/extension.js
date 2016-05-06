"use strict";
var vscode = require("vscode");
var launcher = require("./launcher");
function activate(context) {
    var runTerminalInItemFolder = vscode.commands.registerCommand("launcher.terminal", function () {
        var tools = new launcher.Launcher(vscode.window.activeTextEditor);
        tools.runTerminalInItemFolder();
    });
    var runTerminalInWorkspaceFolder = vscode.commands.registerCommand("launcher.terminalInWorkspace", function () {
        var tools = new launcher.Launcher(vscode.window.activeTextEditor);
        tools.runTerminalInWorkspaceFolder();
    });
    var runScriptsManager = vscode.commands.registerCommand("launcher", function () {
        var tools = new launcher.Launcher(vscode.window.activeTextEditor);
        tools.runScriptsManager();
    });
    context.subscriptions.push(runTerminalInItemFolder);
    context.subscriptions.push(runTerminalInWorkspaceFolder);
    context.subscriptions.push(runScriptsManager);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map