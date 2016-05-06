var vscode = require('vscode');
var beautify = require('js-beautify').html;
var beautifier = require('beautifier');

function format(document, range, options) {
  if (range === null) {
    var start = new vscode.Position(0, 0);
    var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
    range = new vscode.Range(start, end);
  }
  var result = [];
  var content = document.getText(range);

  var config = vscode.workspace.getConfiguration("editor");
  var tabSize = config.get("tabSize", "auto");

  var fieldPHP = new Array();
  var stringHTML = content.split('<?PHP').join('<?php');

  var nextNumber = -1;

  if (stringHTML.indexOf("<?php") > -1 && stringHTML.indexOf("?>") == -1) {
    stringHTML = PHPFormat(stringHTML, tabSize);
  } else {
    while (stringHTML.indexOf("<?php") != -1) {
      nextNumber++;
      var firstBracket = stringHTML.indexOf("<?php");
      var secondBracket = stringHTML.indexOf("?>");
      fieldPHP.push(stringHTML.substring(firstBracket, secondBracket + 2));
      var find = stringHTML.substring(firstBracket, secondBracket + 2);
      stringHTML = stringHTML.replace(find, "//Replace" + nextNumber);
    }

    stringHTML = beautify(stringHTML, { indent_size: tabSize });

    for (var index = 0; index < fieldPHP.length; index++) {
      stringHTML = stringHTML.replace("//Replace" + index, PHPFormat(fieldPHP[index], tabSize));
    }
  }

  if (stringHTML) {
    result.push(new vscode.TextEdit(range, stringHTML));
  }

  return result;
}

function PHPFormat(vst, tabSize) {
  var change = vst.replace("<?php", "//firstCH\n");
  var change = change.replace("?>", "//secondCH\n");
  var clear = beautifier.js_beautify(change, { indent_size: tabSize });
  var clear = clear.replace("//firstCH", "<?php");
  var clear = clear.replace("//secondCH", "?>");
  var clear = clear.replace(/\[\"\s*(\S?)/g, '["$1');
  var clear = clear.replace(/\s*\"\]/g, '"]');
  var clear = clear.replace(/(public|protected|private)\s*(\S?)/g, "$1 $2");
  var clear = clear.split(' - > ').join('->');
  var clear = clear.split('= >').join('=>');
  var clear = clear.split('. =').join(' .=');
  var clear = clear.split('< >').join('<>');
  var clear = clear.split('- >').join('->');
  var clear = clear.replace("\n", " ");
  return clear;
}

function activate(context) {
  context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('php', {
    provideDocumentFormattingEdits: function (document, options, token) {
      return format(document, null, options);
    }
  }));
  context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider('php', {
    provideDocumentRangeFormattingEdits: function (document, range, options, token) {
      var start = new vscode.Position(0, 0);
      var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
      return format(document, new vscode.Range(start, end), options);
    }
  }));
}

exports.activate = activate;