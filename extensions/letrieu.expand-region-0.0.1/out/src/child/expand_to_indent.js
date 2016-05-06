var baseexpander_1 = require('../baseexpander');
var indentReg = /^(\s*)/;
function empty_line(text, line) {
    return text.substring(line.start, line.end).trim() === '';
}
function get_indent(text, line) {
    var line_str = text.substring(line.start, line.end);
    var m = line_str.match(indentReg);
    console.log(m);
    if (m) {
        return m[0].length;
    }
    return 0;
}
function expand_to_indent(text, startIndex, endIndex) {
    var line = baseexpander_1.get_line(text, startIndex, endIndex);
    var indent = get_indent(text, line);
    var start = line.start;
    var end = line.end;
    var before_line = line;
    while (true) {
        var pos = before_line.start - 1;
        if (pos <= 0)
            break;
        before_line = baseexpander_1.get_line(text, pos, pos);
        var before_indent = get_indent(text, before_line);
        //done if the line has a lower indent
        if (!(indent <= before_indent) && !empty_line(text, before_line)) {
            break;
        }
        if (!empty_line(text, before_line) && indent == before_indent) {
            start = before_line.start;
        }
    }
    var after_line = line;
    while (true) {
        //get the line after_line
        var pos = after_line.end + 1;
        if (pos >= text.length)
            break;
        after_line = baseexpander_1.get_line(text, pos, pos);
        var after_indent = get_indent(text, after_line);
        //done if the line has a lower indent
        if (!(indent <= after_indent) && !empty_line(text, after_line)) {
            break;
        }
        //move the end
        if (!empty_line(text, after_line)) {
            end = after_line.end;
        }
    }
    return baseexpander_1.getResult(start, end, text, "indent");
}
exports.expand_to_indent = expand_to_indent;
//# sourceMappingURL=expand_to_indent.js.map