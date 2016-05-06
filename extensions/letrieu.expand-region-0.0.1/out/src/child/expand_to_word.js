var expand_to_regex_set_1 = require('./expand_to_regex_set');
function expand_to_word(text, startIndex, endIndex) {
    var regex = /[\u00BF-\u1FFF\u2C00-\uD7FF\w$]/;
    return expand_to_regex_set_1.expand_to_regex_set(text, startIndex, endIndex, regex, 'word');
}
exports.expand_to_word = expand_to_word;
function expand_to_word_with_dot(text, startIndex, endIndex) {
    var regex = /[\u00BF-\u1FFF\u2C00-\uD7FF\w\.$]/;
    return expand_to_regex_set_1.expand_to_regex_set(text, startIndex, endIndex, regex, 'word_with_dot');
}
exports.expand_to_word_with_dot = expand_to_word_with_dot;
//# sourceMappingURL=expand_to_word.js.map