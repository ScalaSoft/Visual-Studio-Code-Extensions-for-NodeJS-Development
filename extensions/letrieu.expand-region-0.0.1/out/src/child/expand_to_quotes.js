var baseexpander_1 = require('../baseexpander');
function expand_to_quotes(text, startIndex, endIndex) {
    var quotes_regex = /(['\"])(?:\\.|.)*?\1/g;
    var r;
    // iterate over all found quotes pairs
    while ((r = quotes_regex.exec(text)) !== null) {
        var quotes_start = r.index;
        var quotes_end = quotes_regex.lastIndex;
        //quotes pair end is before selection, stop here and continue loop
        if (quotes_end < startIndex)
            continue;
        // quotes pair start is after selection, return, no need to continue loop
        if (quotes_start > startIndex)
            return null;
        if (startIndex == quotes_start && endIndex == quotes_end)
            return null;
        // the string w/o the quotes, "quotes content"
        var quotes_content_start = quotes_start + 1;
        var quotes_content_end = quotes_end - 1;
        // "quotes content" is selected, return with quotes
        if (startIndex == quotes_content_start && endIndex == quotes_content_end)
            return baseexpander_1.getResult(quotes_start, quotes_end, text, "quotes");
        //# selection is within the found quote pairs, return "quotes content"
        if (startIndex > quotes_start && endIndex < quotes_end)
            return baseexpander_1.getResult(quotes_content_start, quotes_content_end, text, "quotes");
    }
    return null;
}
exports.expand_to_quotes = expand_to_quotes;
//# sourceMappingURL=expand_to_quotes.js.map