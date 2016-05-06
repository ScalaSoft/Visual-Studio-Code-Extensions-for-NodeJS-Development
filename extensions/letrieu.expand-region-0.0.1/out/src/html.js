var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var baseexpander_1 = require('./baseexpander');
var ex = require('./child/_expand_all');
var html = (function (_super) {
    __extends(html, _super);
    function html() {
        _super.apply(this, arguments);
    }
    html.prototype.expand = function (text, start, end) {
        var expand_stack = [];
        expand_stack.push("subword");
        var result = ex.expand_to_subword(text, start, end);
        //console.log('step1');
        //console.log(result);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("word");
        result = ex.expand_to_word(text, start, end);
        //console.log('step2');
        //console.log(result);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        expand_stack.push("quotes");
        result = ex.expand_to_quotes(text, start, end);
        //console.log('step3');
        //console.log(result);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        result = ex.expand_to_xml_node(text, start, end);
        if (result) {
            result["expand_stack"] = expand_stack;
            return result;
        }
        //console.log('step5');
        //console.log(result);
        return null;
    };
    ;
    return html;
})(baseexpander_1.BaseExpander);
exports.html = html;
//# sourceMappingURL=html.js.map