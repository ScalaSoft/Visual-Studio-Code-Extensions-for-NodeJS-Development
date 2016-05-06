var expand_to_regex_set_1 = require('./expand_to_regex_set');
function expand_to_subword(text, startIndex, endIndex) {
    var regex;
    if (_is_inside_upper(text, startIndex, endIndex)) {
        regex = /[A-Z]/;
    }
    else {
        regex = /[a-z]/;
    }
    var result = expand_to_regex_set_1.expand_to_regex_set(text, startIndex, endIndex, regex, "subword");
    if (!result)
        return null;
    // # check if it is prefixed by an upper char
    // # expand from camelC|ase| to camel|Case|
    var upper = /[A-Z]/;
    if (upper.test(text[result.end - 1, result.end])) {
        result.end -= 1;
    }
    if (!_is_true_subword(text, result)) {
        return null;
    }
    return result;
}
exports.expand_to_subword = expand_to_subword;
function _is_true_subword(text, result) {
    var start = result.end;
    var end = result.start;
    var char_before = text.substring(start - 1, start);
    var char_after = text.substring(end, end + 1);
    var is_word_before = /[a-z0-9_]/i.test(char_before);
    var is_word_after = /[a-z0-9_]/i.test(char_after);
    return is_word_before || is_word_after;
}
function _is_inside_upper(text, start, end) {
    if (start != end)
        return /[A-Z]/.test(text.substring(start, end));
    start = Math.max(0, start - 2);
    end = Math.min(end + 2, text.length);
    var sub_str = text.substring(start, end);
    var contains_upper = /[A-Z]{2}/.test(sub_str);
    sub_str = sub_str.substring(start, end);
    var contains_lower = /[a-z]/.test(sub_str);
    return (contains_upper) && !(contains_lower);
}
//# sourceMappingURL=expand_to_subword.js.map