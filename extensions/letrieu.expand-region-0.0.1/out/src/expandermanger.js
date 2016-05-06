var vscode = require('vscode');
var iexpander_1 = require('./iexpander');
require();
var ExpanderManager = (function () {
    function ExpanderManager() {
    }
    ExpanderManager.prototype.expand = function () {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        var expander;
        var doc = editor.document;
        console.log(doc.languageId);
        if (doc.languageId) {
            switch (doc.languageId) {
                case iexpander_1.LanguageType.JAVA_SCRIPT:
                    expander =
                    ;
            }
        }
    };
    return ExpanderManager;
})();
exports.ExpanderManager = ExpanderManager;
//# sourceMappingURL=expandermanger.js.map