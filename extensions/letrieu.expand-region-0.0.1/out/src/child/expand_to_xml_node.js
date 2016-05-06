var baseexpander_1 = require('../baseexpander');
function expand_to_xml_node(text, start, end) {
    var tag_properties = get_tag_properties(text.substring(start, end));
    //if we are selecting a tag, then select the matching tag
    //console.log(tag_properties)
    var tag_name;
    if (tag_properties) {
        tag_name = tag_properties["name"];
        if (tag_properties["type"] == "closing") {
            var stringStartToTagStart = text.substring(0, start);
            var openingTagPosition = find_tag(stringStartToTagStart, "backward", tag_name);
            if (openingTagPosition) {
                return baseexpander_1.getResult(openingTagPosition["start"], end, text, "complete_node");
            }
        }
        else if (tag_properties["type"] == "opening") {
            var stringNodeEndToStringEnd = text.substring(end, text.length);
            var closingTagPosition = find_tag(stringNodeEndToStringEnd, "forward", tag_name);
            if (closingTagPosition) {
                return baseexpander_1.getResult(start, end + closingTagPosition["end"], text, "complete_node");
            }
        }
    }
    //check if current selection is within a tag, if it is expand to the tag
    //first expand to inside the tag and then to the whole tag
    var is_within_tag_result = is_within_tag(text, start, end);
    if (is_within_tag_result) {
        var inner_start = is_within_tag_result["start"] + 1;
        var inner_end = is_within_tag_result["end"] - 1;
        if (start == inner_start && end == inner_end)
            return baseexpander_1.getResult(is_within_tag_result["start"], is_within_tag_result["end"], text, "complete_node");
        else
            return baseexpander_1.getResult(inner_start, inner_end, text, "inner_node");
    }
    //expand selection to the "parent" node of the current selection
    var stringStartToSelectionStart = text.substring(0, start);
    var parent_opening_tag = find_tag(stringStartToSelectionStart, "backward");
    var newStart = 0, newEnd = 0;
    if (parent_opening_tag) {
        //find closing tag
        var stringNodeEndToStringEnd = text.substring(parent_opening_tag["end"], text.length);
        var closingTagPosition = find_tag(stringNodeEndToStringEnd, "forward", parent_opening_tag["name"]);
        if (closingTagPosition) {
            //set positions to content of node, w / o the node tags
            newStart = parent_opening_tag["end"];
            newEnd = parent_opening_tag["end"] + closingTagPosition["start"];
        }
        //if this is the current selection, set positions to content of node including start and end tags
        if (newStart == start && newEnd == end) {
            newStart = parent_opening_tag["start"];
            newEnd = parent_opening_tag["end"] + closingTagPosition["end"];
        }
        return baseexpander_1.getResult(newStart, newEnd, text, "parent_node_content");
    }
    return null;
}
exports.expand_to_xml_node = expand_to_xml_node;
function is_within_tag(text, startIndex, endIndex) {
    var openingRe = /</;
    var closingRe = />/;
    //// look back
    var searchIndex = startIndex - 1;
    var newStartIndex = 0;
    while (true) {
        ////begin of text is reached, let's return here
        if (searchIndex < 0) {
            return false;
        }
        var char = text.substring(searchIndex, searchIndex + 1);
        //# tag start found!
        if (openingRe.test(char)) {
            newStartIndex = searchIndex;
            break;
        }
        //# closing tag found, let's return here
        if (closingRe.test(char)) {
            return false;
        }
        searchIndex -= 1;
    }
    //# look forward
    searchIndex = endIndex;
    while (true) {
        //# end of text is reached, let's return here
        if (searchIndex > text.length - 1) {
            return false;
        }
        var char = text.substring(searchIndex, searchIndex + 1);
        //# tag start found!
        if (closingRe.test(char)) {
            return { "start": newStartIndex, "end": searchIndex + 1 };
        }
        //# closing tag found, let's return here
        if (openingRe.test(char)) {
            return false;
        }
        searchIndex += 1;
    }
}
exports.is_within_tag = is_within_tag;
function get_tag_properties(text) {
    var regex = /<\s*(\/?)\s*([^\s\/]*)\s*(?:.*?)(\/?)\s*>/;
    var tag_name, tag_type;
    var void_elements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];
    var result = regex.exec(text);
    if (!result)
        return null;
    tag_name = result[2];
    if (result[1]) {
        tag_type = "closing";
    }
    else if (result[3]) {
        tag_type = "self_closing";
    }
    else if (void_elements.indexOf(tag_name) !== -1) {
        tag_type = "self_closing";
    }
    else {
        tag_type = "opening";
    }
    return { "name": tag_name, "type": tag_type };
}
exports.get_tag_properties = get_tag_properties;
function find_tag(text, direction, tag_name) {
    if (tag_name === void 0) { tag_name = ""; }
    // search for opening and closing tag with a tag_name.If tag_name = "", search
    // for all tags.
    var regexString = "<\s*" + tag_name + ".*?>|<\/\s*" + tag_name + "\s*>";
    var regex = new RegExp(regexString, 'g');
    // direction == "forward" implies that we are looking for closing tags (and
    // vice versa
    var target_tag_type = (direction == "forward" ? "closing" : "opening");
    // set counterpart
    var target_tag_type_counterpart = (direction == "forward" ? "opening" : "closing");
    // found tags will be added/ removed from the stack to eliminate complete nodes
    // (opening tag + closing tag).
    var symbolStack = [];
    // since regex can't run backwards, we reverse the result
    var tArr = [];
    var r;
    while ((r = regex.exec(text)) !== null) {
        var tag_name_1 = r[0];
        var start = r.index;
        var end = regex.lastIndex;
        tArr.push({ name: tag_name_1, start: start, end: end });
    }
    if (direction == "backward") {
        tArr.reverse();
    }
    var result = null;
    tArr.forEach(function (value) {
        var tag_string = value.name;
        // ignore comments
        if (result) {
            return;
        }
        if (tag_string.indexOf("<!--") === 0 || tag_string.indexOf("<![") === 0) {
            return;
        }
        var tag_type = get_tag_properties(tag_string)["type"];
        if (tag_type == target_tag_type) {
            if (symbolStack.length === 0) {
                result = { "start": value.start, "end": value.end, "name": get_tag_properties(tag_string)["name"] };
                return;
            }
            symbolStack.pop();
        }
        else if (tag_type == target_tag_type_counterpart) {
            symbolStack.push(tag_type);
        }
    });
    return result;
}
exports.find_tag = find_tag;
//# sourceMappingURL=expand_to_xml_node.js.map