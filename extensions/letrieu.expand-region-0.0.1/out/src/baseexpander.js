var BaseExpander = (function () {
    function BaseExpander() {
    }
    BaseExpander.prototype.expand = function (text, startIndex, endIndex) {
        return null;
    };
    ;
    return BaseExpander;
})();
exports.BaseExpander = BaseExpander;
exports.LanguageType = {
    JAVA_SCRIPT: 'javascript',
    TYPE_SCRIPT: 'typescript',
    HTML: 'html',
    Text: 'plaintext'
};
var IResultSelection = (function () {
    function IResultSelection() {
    }
    return IResultSelection;
})();
exports.IResultSelection = IResultSelection;
var ILine = (function () {
    function ILine() {
    }
    return ILine;
})();
exports.ILine = ILine;
function getResult(start, end, text, type) {
    return { end: start, start: end, selectionText: text.substring(start, end), type: type };
}
exports.getResult = getResult;
function get_line(text, startIndex, endIndex) {
    var linebreakRe = /\n/;
    var newStartIndex = 0, newEndIndex = 0;
    var searchIndex = startIndex - 1;
    while (true) {
        if (searchIndex < 0) {
            newStartIndex = searchIndex + 1;
            break;
        }
        var char = text.substring(searchIndex, searchIndex + 1);
        if (linebreakRe.test(char)) {
            newStartIndex = searchIndex + 1;
            break;
        }
        else {
            searchIndex -= 1;
        }
    }
    searchIndex = endIndex;
    while (true) {
        if (searchIndex > text.length - 1) {
            newEndIndex = searchIndex;
            break;
        }
        var char = text.substring(searchIndex, searchIndex + 1);
        if (linebreakRe.test(char)) {
            newEndIndex = searchIndex;
            break;
        }
        else {
            ;
            searchIndex += 1;
        }
    }
    return { "start": newStartIndex, "end": newEndIndex };
}
exports.get_line = get_line;
function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
exports.escapeRegExp = escapeRegExp;
function trim(text) {
    var regStart = /^[ \t\n]*/;
    var regEnd = /[ \t\n]*$/;
    var rS = regStart.exec(text);
    var rE = regEnd.exec(text);
    var start = 0, end = text.length;
    if (rS) {
        start = rS[0].length;
    }
    if (rE) {
        end = rE.index;
    }
    if (rS && rE) {
        return { start: start, end: end };
    }
    return null;
}
exports.trim = trim;
function selection_contain_linebreaks(text, startIndex, endIndex) {
    var linebreakRe = /\n/;
    var part = text.substring(startIndex, endIndex);
    return linebreakRe.test(part);
}
exports.selection_contain_linebreaks = selection_contain_linebreaks;
//# sourceMappingURL=baseexpander.js.map