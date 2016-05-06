var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var baseexpander_1 = require('./baseexpander');
var typescript = (function (_super) {
    __extends(typescript, _super);
    function typescript() {
        _super.apply(this, arguments);
    }
    typescript.prototype.expand = function (text, start, end) {
        return null;
    };
    return typescript;
})(baseexpander_1.BaseExpander);
exports.typescript = typescript;
//# sourceMappingURL=typescript.js.map