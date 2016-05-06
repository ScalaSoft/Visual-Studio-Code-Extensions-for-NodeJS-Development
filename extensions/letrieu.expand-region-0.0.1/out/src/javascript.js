var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var baseexpander_1 = require('./baseexpander');
var ex = require('./child/_expand_all');
var javascript = (function (_super) {
    __extends(javascript, _super);
    function javascript() {
        _super.apply(this, arguments);
    }
    javascript.prototype.expand = function (text, start, end) {
        var selection_is_in_string = ex.expand_to_quotes(text, start, end);
        if (selection_is_in_string) {
            var string_result = this.expand_agains_string(selection_is_in_string.selectionText, start - selection_is_in_string.end, end - selection_is_in_string.end);
            if (string_result) {
                string_result.end = string_result.end + selection_is_in_string.end;
                string_result.start = string_result.start + selection_is_in_string.end;
                string_result.selectionText = text.substring(string_result.end, string_result.start);
                return string_result;
            }
        }
        if (!baseexpander_1.selection_contain_linebreaks(text, start, end)) {
            var line = baseexpander_1.get_line(text, start, end);
            var line_string = text.substring(line.start, line.end);
            var line_result = this.expand_agains_line(line_string, start - line.start, end - line.start);
            if (line_result) {
                line_result.end = line_result.end + line.start;
                line_result.start = line_result.start + line.start;
                line_result.selectionText = text.substring(line_result.end, line_result.start);
                return line_result;
            }
        }
        var expand_stack = ["semantic_unit"];
        var result = ex.expand_to_semantic_unit(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("symbols");
        result = ex.expand_to_symbols(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        return null;
    };
    javascript.prototype.expand_agains_line = function (text, start, end) {
        var expand_stack = [];
        expand_stack.push("subword");
        var result = ex.expand_to_subword(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("word");
        result = ex.expand_to_word(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("quotes");
        result = ex.expand_to_quotes(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("semantic_unit");
        result = ex.expand_to_semantic_unit(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("symbols");
        result = ex.expand_to_symbols(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
        }
        return result;
    };
    javascript.prototype.expand_agains_string = function (text, start, end) {
        var expand_stack = [];
        expand_stack.push("semantic_unit");
        var result = ex.expand_to_semantic_unit(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("symbols");
        result = ex.expand_to_symbols(text, start, end);
        if (result)
            result["expand_stack"] = expand_stack;
        return result;
    };
    return javascript;
})(baseexpander_1.BaseExpander);
exports.javascript = javascript;
//# sourceMappingURL=javascript.js.map