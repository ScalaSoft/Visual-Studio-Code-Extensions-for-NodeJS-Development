var vscode = require('vscode');
var ExpanderManager = (function () {
    function ExpanderManager() {
    }
    ExpanderManager.prototype.expand = function () {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        var doc = editor.document;
        console.log(doc.languageId);
        if (doc.languageId) {
        }
    };
    return ExpanderManager;
})();
exports.ExpanderManager = ExpanderManager;
//# sourceMappingURL=expander.js.map