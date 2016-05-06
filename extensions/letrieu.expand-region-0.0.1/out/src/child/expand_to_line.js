var baseexpander_1 = require('../baseexpander');
function expand_to_line(text, startIndex, endIndex) {
    var lineReg = /\n/;
    var spacesAndTabsRe = /(\s|\t)*/;
    var newStartIndex = 0, newEndIndex = 0;
    var i = 0;
    var searchIndex = startIndex - 1;
    while (true) {
        if (searchIndex < 0) {
            newStartIndex = searchIndex + 1;
            break;
        }
        var char = text.substring(searchIndex, searchIndex + 1);
        if (lineReg.test(char)) {
            newStartIndex = searchIndex + 1;
            break;
        }
        else {
            searchIndex -= 1;
        }
        i++;
    }
    searchIndex = endIndex;
    while (true) {
        if (searchIndex > text.length - 1) {
            newEndIndex = searchIndex;
            break;
        }
        var char = text.substring(searchIndex, searchIndex + 1);
        if (lineReg.test(char)) {
            newEndIndex = searchIndex;
            break;
        }
        else {
            searchIndex += 1;
        }
    }
    //remove blank space in top
    var s = text.substring(newStartIndex, newEndIndex);
    var r = spacesAndTabsRe.exec(s);
    if (r && r[0].length <= startIndex) {
        newStartIndex += r[0].length;
    }
    if (startIndex == newStartIndex && endIndex == newEndIndex) {
        return null;
    }
    return baseexpander_1.getResult(newStartIndex, newEndIndex, text, 'line');
}
exports.expand_to_line = expand_to_line;
//# sourceMappingURL=expand_to_line.js.map