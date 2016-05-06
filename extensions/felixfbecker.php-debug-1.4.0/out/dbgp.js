var iconv = require('iconv-lite');
var xmldom_1 = require('xmldom');
/** The encoding all XDebug messages are encoded with */
var ENCODING = 'iso-8859-1';
function parseResponse(response) {
    var xml = iconv.decode(response, ENCODING);
    var parser = new xmldom_1.DOMParser();
    var document = parser.parseFromString(xml, 'application/xml');
    return document;
}
/** The two states the connection switches between */
var ParsingState;
(function (ParsingState) {
    ParsingState[ParsingState["DataLength"] = 0] = "DataLength";
    ParsingState[ParsingState["Response"] = 1] = "Response";
})(ParsingState || (ParsingState = {}));
;
/** Wraps the NodeJS Socket and calls handleResponse() whenever a full response arrives */
var DbgpConnection = (function () {
    function DbgpConnection(socket) {
        var _this = this;
        this._socket = socket;
        this._parsingState = ParsingState.DataLength;
        this._chunksDataLength = 0;
        this._chunks = [];
        socket.on('data', function (data) { return _this._handleDataChunk(data); });
    }
    DbgpConnection.prototype._handleDataChunk = function (data) {
        // Anatomy of packets: [data length] [NULL] [xml] [NULL]
        // are we waiting for the data length or for the response?
        if (this._parsingState === ParsingState.DataLength) {
            // does data contain a NULL byte?
            var nullByteIndex = data.indexOf(0);
            if (nullByteIndex !== -1) {
                // YES -> we received the data length and are ready to receive the response
                this._dataLength = parseInt(iconv.decode(data.slice(0, nullByteIndex), ENCODING));
                // reset buffered chunks
                this._chunks = [];
                this._chunksDataLength = 0;
                // switch to response parsing state
                this._parsingState = ParsingState.Response;
                // if data contains more info (except the NULL byte)
                if (data.length > nullByteIndex + 1) {
                    // handle the rest of the packet as part of the response
                    var rest = data.slice(nullByteIndex + 1);
                    this._handleDataChunk(rest);
                }
            }
            else {
                // NO -> this is only part of the data length. We wait for the next data event
                this._chunks.push(data);
                this._chunksDataLength += data.length;
            }
        }
        else if (this._parsingState === ParsingState.Response) {
            // does the new data together with the buffered data add up to the data length?
            if (this._chunksDataLength + data.length >= this._dataLength) {
                // YES -> we received the whole response
                // append the last piece of the response
                var lastResponsePiece = data.slice(0, this._dataLength - this._chunksDataLength);
                this._chunks.push(lastResponsePiece);
                this._chunksDataLength += data.length;
                var response = Buffer.concat(this._chunks, this._chunksDataLength);
                // call response handler
                this.handleResponse(parseResponse(response));
                // reset buffer
                this._chunks = [];
                this._chunksDataLength = 0;
                // switch to data length parsing state
                this._parsingState = ParsingState.DataLength;
                // if data contains more info (except the NULL byte)
                if (data.length > lastResponsePiece.length + 1) {
                    // handle the rest of the packet (after the NULL byte) as data length
                    var rest = data.slice(lastResponsePiece.length + 1);
                    this._handleDataChunk(rest);
                }
            }
            else {
                // NO -> this is not the whole response yet. We buffer it and wait for the next data event.
                this._chunks.push(data);
                this._chunksDataLength += data.length;
            }
        }
    };
    DbgpConnection.prototype.write = function (command) {
        this._socket.write(command);
    };
    /** closes the underlying socket */
    DbgpConnection.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._socket.once('close', resolve);
            _this._socket.end();
        });
    };
    return DbgpConnection;
})();
exports.DbgpConnection = DbgpConnection;
//# sourceMappingURL=dbgp.js.map