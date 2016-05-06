var vscode = require('vscode');
var baseexpander_1 = require('./baseexpander');
var expander = require('./_expander');
var ExpanderManager = (function () {
    function ExpanderManager() {
    }
    ExpanderManager.prototype.expand = function () {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        var exp;
        var doc = editor.document;
        if (doc.languageId) {
            switch (doc.languageId) {
                case baseexpander_1.LanguageType.HTML:
                    exp = new expander.html();
                    break;
                default:
                    exp = new expander.javascript();
                    break;
            }
        }
        var text = doc.getText();
        var start = doc.offsetAt(editor.selection.start);
        var end = doc.offsetAt(editor.selection.end);
        var result = exp.expand(text, start, end);
        if (result) {
            var startPos = doc.positionAt(result.end);
            var endPos = doc.positionAt(result.start);
            var newselection = new vscode.Selection(startPos, endPos);
            editor.selection = newselection;
        }
    };
    return ExpanderManager;
})();
exports.ExpanderManager = ExpanderManager;
//# sourceMappingURL=expandermanager.js.map