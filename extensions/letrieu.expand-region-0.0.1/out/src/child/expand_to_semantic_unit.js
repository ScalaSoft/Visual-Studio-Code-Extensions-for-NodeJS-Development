var baseexpander_1 = require('../baseexpander');
function expand_to_semantic_unit(text, startIndex, endIndex) {
    var symbols = "([{)]}";
    var breakSymbols = ",;=&|\n\r";
    var lookBackBreakSymbols = breakSymbols + "([{";
    var lookForwardBreakSymbols = breakSymbols + ")]}";
    var symbolsRe = new RegExp("[" + baseexpander_1.escapeRegExp(symbols) + baseexpander_1.escapeRegExp(breakSymbols) + "]");
    var counterparts = {
        "(": ")",
        "{": "}",
        "[": "]",
        ")": "(",
        "}": "{",
        "]": "["
    };
    var symbolStack = [];
    var searchIndex = startIndex - 1;
    var newStartIndex, newEndIndex;
    while (true) {
        if (searchIndex < 0) {
            newStartIndex = searchIndex + 1;
            break;
        }
        var char = text.substring(searchIndex, searchIndex + 1);
        var result = symbolsRe.exec(char);
        if (result) {
            var symbol = result[0];
            if (lookBackBreakSymbols.indexOf(symbol) != -1 && symbolStack.length == 0) {
                newStartIndex = searchIndex + 1;
                break;
            }
            if (symbols.indexOf(symbol) != -1) {
                if (symbolStack.length > 0 && symbolStack[symbolStack.length - 1] == counterparts[symbol]) {
                    symbolStack.pop();
                }
                else {
                    symbolStack.push(symbol);
                }
            }
        }
        searchIndex -= 1;
    }
    searchIndex = endIndex;
    while (true) {
        var char = text.substring(searchIndex, searchIndex + 1);
        var result = symbolsRe.exec(char);
        if (result) {
            var symbol = result[0];
            if (symbolStack.length == 0 && lookForwardBreakSymbols.indexOf(symbol) != -1) {
                newEndIndex = searchIndex;
                break;
            }
            if (symbols.indexOf(symbol) != -1) {
                if (symbolStack.length > 0 && symbolStack[symbolStack.length - 1] == counterparts[symbol]) {
                    symbolStack.pop();
                }
                else {
                    symbolStack.push(symbol);
                }
            }
        }
        if (searchIndex >= text.length - 1) {
            return null;
        }
        //# print(char, symbolStack, searchIndex)
        searchIndex += 1;
    }
    var s = text.substring(newStartIndex, newEndIndex);
    var trimResult = baseexpander_1.trim(s);
    if (trimResult) {
        newStartIndex = newStartIndex + trimResult.start;
        newEndIndex = newEndIndex - (s.length - trimResult.end);
    }
    if (newStartIndex == startIndex && newEndIndex == endIndex)
        return null;
    if (newStartIndex > startIndex || newEndIndex < endIndex)
        return null;
    return baseexpander_1.getResult(newStartIndex, newEndIndex, text, "semantic_unit");
    return null;
}
exports.expand_to_semantic_unit = expand_to_semantic_unit;
//# sourceMappingURL=expand_to_semantic_unit.js.map