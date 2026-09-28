"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var {
      types: { isUint8Array }
    } = require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter2 = require("events");
    var https = require("https");
    var http = require("http");
    var net = require("net");
    var tls = require("tls");
    var { randomBytes, createHash } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL } = require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter2 {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module2.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter2 = require("events");
    var http = require("http");
    var { Duplex } = require("stream");
    var { createHash } = require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter2 {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  startApp: () => startApp
});
module.exports = __toCommonJS(main_exports);
var import_electron = require("electron");
var import_promises4 = require("node:fs/promises");
var import_node_path4 = __toESM(require("node:path"));

// src/app-store.ts
var import_promises = require("node:fs/promises");
var import_node_path = __toESM(require("node:path"));
var DEFAULT_SETTINGS = {
  launchAtStartup: false,
  language: "tr",
  notifyDisconnect: true,
  historyEnabled: true
};
var HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1e3;
var HISTORY_SAMPLE_MS = 5 * 60 * 1e3;
var MAX_POINTS_PER_DEVICE = 2500;
var AppStore = class {
  filePath;
  data = { settings: { ...DEFAULT_SETTINGS }, history: {} };
  writeQueue = Promise.resolve();
  constructor(userDataPath) {
    this.filePath = import_node_path.default.join(userDataPath, "app-data.json");
  }
  async load() {
    try {
      const parsed = JSON.parse(await (0, import_promises.readFile)(this.filePath, "utf8"));
      const language = parsed.settings?.language === "en" ? "en" : "tr";
      this.data = {
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings, language },
        history: parsed.history && typeof parsed.history === "object" ? parsed.history : {}
      };
      this.pruneHistory();
    } catch {
      this.data = { settings: { ...DEFAULT_SETTINGS }, history: {} };
    }
  }
  get settings() {
    return { ...this.data.settings };
  }
  get history() {
    return structuredClone(this.data.history);
  }
  async updateSettings(patch) {
    const next = { ...this.data.settings, ...patch };
    next.language = next.language === "en" ? "en" : "tr";
    this.data.settings = next;
    await this.persist();
    return this.settings;
  }
  async recordBattery(device) {
    if (!this.data.settings.historyEnabled || device.percentage === void 0) return;
    const series = this.data.history[device.stableKey] ?? { name: device.name, points: [] };
    series.name = device.name;
    const last = series.points.at(-1);
    const now = Date.now();
    const changed = !last || last.percentage !== device.percentage || last.charging !== device.charging;
    if (!changed && now - last.timestamp < HISTORY_SAMPLE_MS) return;
    series.points.push({ timestamp: now, percentage: device.percentage, charging: device.charging });
    this.data.history[device.stableKey] = series;
    this.pruneHistory();
    await this.persist();
  }
  async clearHistory() {
    this.data.history = {};
    await this.persist();
  }
  pruneHistory() {
    const cutoff = Date.now() - HISTORY_RETENTION_MS;
    for (const [key, series] of Object.entries(this.data.history)) {
      series.points = series.points.filter((point) => Number.isFinite(point.timestamp) && point.timestamp >= cutoff).slice(-MAX_POINTS_PER_DEVICE);
      if (series.points.length === 0) delete this.data.history[key];
    }
  }
  async persist() {
    const serialized = JSON.stringify(this.data, null, 2);
    this.writeQueue = this.writeQueue.catch(() => {
    }).then(async () => {
      await (0, import_promises.mkdir)(import_node_path.default.dirname(this.filePath), { recursive: true });
      await (0, import_promises.writeFile)(this.filePath, serialized, "utf8");
    });
    await this.writeQueue;
  }
};

// src/battery-events.ts
var LOW_BATTERY_THRESHOLDS = [20, 10, 5, 3];
function initialStoredState(payload) {
  return {
    percentage: payload.percentage,
    charging: Boolean(payload.charging),
    fullyCharged: Boolean(payload.fullyCharged || payload.percentage >= 100),
    notifiedThresholds: [],
    emptyNotified: payload.percentage <= 0
  };
}
function detectBatteryEvents(previous, current) {
  if (!previous) {
    return { state: initialStoredState(current), events: [] };
  }
  const percentage = Math.max(0, Math.min(100, Math.round(current.percentage)));
  const charging = Boolean(current.charging);
  const fullyCharged = Boolean(current.fullyCharged || percentage >= 100);
  const events = [];
  let notifiedThresholds = [...previous.notifiedThresholds];
  let emptyNotified = previous.emptyNotified;
  if (!previous.charging && charging) {
    events.push({ type: "charging", percentage });
    notifiedThresholds = [];
    emptyNotified = false;
  }
  if (fullyCharged && !previous.fullyCharged) {
    events.push({ type: "full", percentage });
  }
  if (!charging && percentage < previous.percentage) {
    if (percentage <= 0 && !emptyNotified) {
      events.push({ type: "empty", percentage: 0 });
      emptyNotified = true;
      notifiedThresholds = [...LOW_BATTERY_THRESHOLDS];
    } else {
      const reached = LOW_BATTERY_THRESHOLDS.filter(
        (threshold) => percentage <= threshold && previous.percentage > threshold && !notifiedThresholds.includes(threshold)
      );
      if (reached.length > 0) {
        const mostCritical = Math.min(...reached);
        events.push({
          type: "low",
          percentage,
          threshold: mostCritical
        });
        notifiedThresholds = [
          .../* @__PURE__ */ new Set([...notifiedThresholds, ...reached])
        ];
      }
    }
  }
  return {
    state: {
      percentage,
      charging,
      fullyCharged,
      notifiedThresholds,
      emptyNotified
    },
    events
  };
}

// src/dashboard.ts
var DASHBOARD_PRELOAD = `
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("logitechApi", {
  getState: () => ipcRenderer.invoke("dashboard:get-state"),
  updateSettings: (settings) => ipcRenderer.invoke("dashboard:update-settings", settings),
  refresh: () => ipcRenderer.invoke("dashboard:refresh"),
  reconnect: () => ipcRenderer.invoke("dashboard:reconnect"),
  checkUpdate: () => ipcRenderer.invoke("dashboard:check-update"),
  restartUpdate: () => ipcRenderer.invoke("dashboard:restart-update"),
  clearHistory: () => ipcRenderer.invoke("dashboard:clear-history"),
  openLog: () => ipcRenderer.invoke("dashboard:open-log"),
  copyDiagnostics: () => ipcRenderer.invoke("dashboard:copy-diagnostics"),
  minimizeWindow: () => ipcRenderer.invoke("dashboard:window-minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("dashboard:window-toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("dashboard:window-close"),
  onState: (callback) => ipcRenderer.on("dashboard:state", (_event, state) => callback(state)),
});
`;
function createDashboardHtml() {
  return `<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>Logitech Battery API</title>
<style>
:root{color-scheme:dark;--bg:#06070b;--glass:rgba(22,26,36,.72);--line:rgba(255,255,255,.105);--soft:rgba(255,255,255,.06);--text:#f7f9ff;--muted:#929aab;--blue:#58a6ff;--green:#39d98a;--yellow:#f5c451;--orange:#ff8c42;--red:#ff5d6c;--radius:20px}
*{box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden}body{margin:0;color:var(--text);font:13px/1.45 "Segoe UI Variable",Inter,"Segoe UI",sans-serif;background:var(--bg)}button,input,select{font:inherit}button{color:inherit}.backdrop{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 54% -25%,#203c6d 0,transparent 48%),linear-gradient(145deg,#05060a,#090c14 58%,#05070c)}.orb{position:absolute;border-radius:50%;filter:blur(75px);opacity:.15}.orb.a{width:380px;height:380px;background:#187bff;right:5%;top:-210px}.orb.b{width:300px;height:300px;background:#21d4b4;left:12%;bottom:-220px;opacity:.08}
.app{position:relative;display:grid;grid-template-rows:46px 1fr;height:100%}.titlebar{-webkit-app-region:drag;display:flex;align-items:center;justify-content:space-between;padding-left:14px;border-bottom:1px solid var(--soft);background:rgba(8,10,16,.78);backdrop-filter:blur(30px) saturate(150%);user-select:none}.brand{display:flex;align-items:center;gap:10px;font-weight:650}.logo{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(145deg,#67b5ff,#2867e8);box-shadow:inset 0 1px 1px #ffffff80,0 7px 22px #1d6cff47}.logo svg{width:14px}.title-state{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:11px}.dot{width:7px;height:7px;border-radius:50%;background:#626b7b}.dot.online{background:var(--green);box-shadow:0 0 12px #39d98aaa}.window-actions{-webkit-app-region:no-drag;display:flex;align-self:stretch}.window-button{width:46px;border:0;background:transparent;display:grid;place-items:center;color:#aeb5c2;transition:.16s}.window-button:hover{background:#ffffff13;color:white}.window-button.close:hover{background:#e5484d}.window-button svg{width:12px;height:12px}
.workspace{min-height:0;display:grid;grid-template-columns:210px 1fr}.sidebar{padding:16px 12px 14px;border-right:1px solid var(--soft);background:#080a108a;backdrop-filter:blur(26px);display:flex;flex-direction:column}.nav-label{margin:7px 10px 8px;color:#586174;font-size:10px;text-transform:uppercase;letter-spacing:.13em;font-weight:700}.nav{display:grid;gap:5px}.nav button{border:1px solid transparent;background:transparent;border-radius:12px;padding:10px 11px;display:flex;align-items:center;gap:11px;text-align:left;color:var(--muted);cursor:pointer;transition:.18s}.nav button:hover{color:#e9edf7;background:#ffffff0b}.nav button.active{color:white;border-color:#6cb1ff33;background:linear-gradient(120deg,#2b7dff36,#3e8fff12);box-shadow:inset 0 1px #ffffff0f}.nav svg{width:17px;height:17px}.sidebar-foot{margin-top:auto;padding:12px;border:1px solid var(--soft);border-radius:14px;background:#ffffff07}.sidebar-foot strong{display:block}.sidebar-foot small{color:#626b7b}.content{min-width:0;overflow:auto;scrollbar-color:#334052 transparent;scrollbar-width:thin}main{max-width:1280px;margin:auto;padding:26px 28px 42px}.page{display:none;animation:enter .22s ease}.page.active{display:block}@keyframes enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:21px}.eyebrow{color:var(--blue);font-size:10px;text-transform:uppercase;letter-spacing:.16em;font-weight:750;margin-bottom:6px}h1,h2,p{margin:0}h1{font-size:25px;line-height:1.2;letter-spacing:-.035em;font-weight:680}h2{font-size:15px;letter-spacing:-.015em}.subtitle{color:var(--muted);margin-top:6px;max-width:650px}.actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.button{border:1px solid var(--line);background:#ffffff0e;color:#dde3ef;padding:8px 12px;border-radius:10px;cursor:pointer;transition:.16s;box-shadow:inset 0 1px #ffffff0a}.button:hover{background:#ffffff18;transform:translateY(-1px)}.button.primary{color:white;border-color:#56a4ff80;background:linear-gradient(135deg,#258cff,#1265d8);box-shadow:0 8px 24px #186ee73d,inset 0 1px #ffffff42}.button.danger{color:#ff9da6;border-color:#ff5d6c38;background:#ff5d6c12}.button:disabled{opacity:.5;cursor:default;transform:none}
.glass{position:relative;border:1px solid var(--line);background:linear-gradient(145deg,#1c212dc4,#0e1119a8);backdrop-filter:blur(28px) saturate(155%);box-shadow:inset 0 1px #ffffff12,0 24px 80px #0000006b;border-radius:var(--radius);overflow:hidden}.glass:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(125deg,#ffffff0b,transparent 34%,transparent 72%,#569fff09)}.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin-bottom:16px}.stat{padding:15px 16px;min-height:90px}.stat-top{display:flex;align-items:center;justify-content:space-between;color:var(--muted)}.stat-icon{width:28px;height:28px;border:1px solid var(--line);border-radius:9px;display:grid;place-items:center;background:#ffffff0a;color:var(--blue)}.stat-icon svg{width:14px}.stat-value{margin-top:9px;font-size:22px;font-weight:700;letter-spacing:-.03em}.section-row{margin:19px 1px 10px}.section-row p{color:var(--muted);font-size:11px;margin-top:2px}.device-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(265px,1fr));gap:12px}.device-card{padding:18px;min-height:170px}.device-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.device-ident{display:flex;align-items:center;gap:12px;min-width:0}.device-icon{width:42px;height:42px;border:1px solid var(--line);border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#ffffff1c,#ffffff07)}.device-icon svg{width:22px}.device-name{font-size:14px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.device-model{color:var(--muted);font-size:11px;margin-top:2px}.battery-number{font-size:25px;font-weight:720;letter-spacing:-.04em}.battery-track{height:7px;background:#ffffff10;border-radius:99px;overflow:hidden;margin:19px 0 10px;box-shadow:inset 0 1px 2px #0006}.battery-fill{height:100%;border-radius:inherit;box-shadow:0 0 18px currentColor;transition:width .4s}.device-foot{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:11px}.inline-status{display:flex;align-items:center;gap:6px}.mini-dot{width:6px;height:6px;border-radius:50%;background:currentColor}.empty{min-height:150px;display:grid;place-items:center;text-align:center;color:var(--muted);padding:32px}.empty strong{color:#e5e9f1;display:block;margin-bottom:4px}
.analytics-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.75fr);gap:13px;align-items:start}.panel,.update-card,.diagnostic-card,.settings-card{padding:19px}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px}.segmented{display:flex;gap:3px;padding:3px;border:1px solid var(--soft);border-radius:10px;background:#0003}.segmented button{border:0;border-radius:7px;background:transparent;color:var(--muted);padding:5px 9px;cursor:pointer;font-size:11px}.segmented button.active{color:white;background:#ffffff18}.series-tabs{display:flex;gap:7px;overflow:auto;margin-bottom:13px}.series-tab{border:1px solid var(--soft);background:#ffffff06;border-radius:99px;color:var(--muted);padding:6px 10px;white-space:nowrap;cursor:pointer}.series-tab.active{color:white;border-color:#4b9aff6b;background:#2c84ff24}.chart-wrap{position:relative;height:285px;border:1px solid var(--soft);border-radius:15px;background:linear-gradient(180deg,#4076c212,#0002);overflow:hidden}.chart-wrap svg{width:100%;height:100%;display:block}.chart-grid{stroke:#ffffff12;stroke-width:1;vector-effect:non-scaling-stroke}.chart-scale{position:absolute;z-index:2;left:9px;top:17px;bottom:15px;display:flex;flex-direction:column;justify-content:space-between;color:#697386;font-size:10px;pointer-events:none}.chart-line{fill:none;stroke:url(#lineGradient);stroke-width:2.4;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 5px #4397ff80)}.chart-area{fill:url(#areaGradient)}.chart-cursor{stroke:#ffffff47;stroke-width:1;stroke-dasharray:3 4;vector-effect:non-scaling-stroke;opacity:0}.chart-point{fill:white;stroke:#3c98ff;stroke-width:2;vector-effect:non-scaling-stroke;opacity:0}.tooltip{position:absolute;pointer-events:none;opacity:0;min-width:125px;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:#0b0e15ed;backdrop-filter:blur(18px);box-shadow:0 12px 35px #0006;font-size:11px;transform:translate(-50%,-112%)}.tooltip strong{display:block;font-size:14px}.tooltip span{color:var(--muted)}.chart-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px}.metric{padding:10px 11px;border:1px solid var(--soft);border-radius:12px;background:#ffffff06}.metric span{color:var(--muted);font-size:10px}.metric strong{display:block;margin-top:3px;font-size:14px}.badge{padding:4px 8px;border:1px solid var(--line);border-radius:99px;background:#ffffff0a;color:#c7ceda;font-size:10px}
.charge-total{font-size:29px;font-weight:720;letter-spacing:-.04em;margin-top:4px}.charge-total small{display:block;color:var(--muted);font-size:11px;font-weight:500;letter-spacing:0;margin-top:2px}.timeline{position:relative;height:88px;margin:18px 0 8px;border-radius:13px;border:1px solid var(--soft);background:repeating-linear-gradient(90deg,transparent 0,transparent calc(25% - 1px),#ffffff0e 25%);overflow:hidden}.timeline:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#ffffff0f}.charge-segment{position:absolute;top:21px;height:44px;min-width:2px;border-radius:5px;background:linear-gradient(180deg,#49e49a,#23bd70);box-shadow:0 0 15px #30da8547}.timeline-labels{display:flex;justify-content:space-between;color:#626b7b;font-size:9px}.facts{display:grid;gap:8px;margin-top:17px}.fact,.data-row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid var(--soft)}.fact:last-child,.data-row:last-child{border-bottom:0}.fact span,.data-row span:first-child{color:var(--muted)}.stack{display:grid;gap:3px}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#cbd2df;font:11px/1.65 "Cascadia Code",Consolas,monospace}.setting{padding:13px 0;border-bottom:1px solid var(--soft)}.setting:last-child{border-bottom:0}.setting-copy strong{display:block;font-size:12px}.setting-copy small{color:var(--muted)}input[type=checkbox]{appearance:none;width:36px;height:20px;border-radius:99px;background:#343946;border:1px solid var(--line);position:relative;cursor:pointer;transition:.18s}input[type=checkbox]:after{content:"";position:absolute;width:14px;height:14px;left:2px;top:2px;border-radius:50%;background:#c6ccd7;transition:.18s}input[type=checkbox]:checked{background:#2188ff}input[type=checkbox]:checked:after{left:18px;background:white}select{color:var(--text);background:#202530;border:1px solid var(--line);padding:7px 9px;border-radius:9px}
@media(max-width:980px){.workspace{grid-template-columns:72px 1fr}.sidebar{padding-inline:9px}.nav-label,.nav span,.sidebar-foot small{display:none}.nav button{justify-content:center}.sidebar-foot{text-align:center;padding:9px}.stats{grid-template-columns:repeat(2,1fr)}.analytics-grid{grid-template-columns:1fr}}@media(max-width:720px){main{padding:20px 16px}.page-head{display:block}.page-head>.actions{margin-top:13px}.chart-summary{grid-template-columns:1fr}.title-state{display:none}}
</style></head><body>
<div class="backdrop"><i class="orb a"></i><i class="orb b"></i></div><div class="app">
<header class="titlebar"><div class="brand"><i class="logo"><svg viewBox="0 0 24 24" fill="none"><path d="M7 7.5a5 5 0 0 1 10 0V14a5 5 0 0 1-10 0V7.5Z" stroke="white" stroke-width="1.7"/><path d="M12 3v7.5M7 11h10" stroke="white" stroke-width="1.5" opacity=".75"/></svg></i><span>Logitech Battery API</span></div><div class="title-state"><i id="title-dot" class="dot"></i><span id="title-state"></span></div><div class="window-actions"><button class="window-button" data-window="minimize" aria-label="K\xFC\xE7\xFClt"><svg viewBox="0 0 12 12"><path d="M2 6.5h8" stroke="currentColor"/></svg></button><button class="window-button" data-window="maximize" aria-label="B\xFCy\xFCt"><svg viewBox="0 0 12 12"><rect x="2.2" y="2.2" width="7.6" height="7.6" fill="none" stroke="currentColor"/></svg></button><button class="window-button close" data-window="close" aria-label="Kapat"><svg viewBox="0 0 12 12"><path d="m2.2 2.2 7.6 7.6m0-7.6-7.6 7.6" stroke="currentColor"/></svg></button></div></header>
<div class="workspace"><aside class="sidebar"><div class="nav-label">Workspace</div><nav id="nav" class="nav"></nav><div class="sidebar-foot"><strong id="version"></strong><small id="side-state"></small></div></aside><div class="content"><main>
<section id="overview" class="page active"><div class="page-head"><div><div class="eyebrow" data-t="liveOverview"></div><h1 data-t="dashboardTitle"></h1><p class="subtitle" data-t="dashboardSubtitle"></p></div><div class="actions"><button class="button" data-action="reconnect"></button><button class="button primary" data-action="refresh"></button></div></div><div id="stats" class="stats"></div><div class="section-row"><h2 data-t="devicesTitle"></h2><p data-t="devicesSubtitle"></p></div><div id="devices" class="device-grid"></div></section>
<section id="history" class="page"><div class="page-head"><div><div class="eyebrow" data-t="analytics"></div><h1 data-t="analyticsTitle"></h1><p class="subtitle" data-t="analyticsSubtitle"></p></div><div id="ranges" class="segmented"><button data-range="24" class="active">24h</button><button data-range="168">7d</button></div></div><div id="series-tabs" class="series-tabs"></div><div class="analytics-grid"><div id="chart" class="glass panel"></div><div id="charge" class="glass panel"></div></div><div class="actions" style="margin-top:13px"><button class="button danger" data-action="clear-history"></button></div></section>
<section id="updates" class="page"><div class="page-head"><div><div class="eyebrow" data-t="maintenance"></div><h1 data-t="updatesTitle"></h1><p class="subtitle" data-t="updatesSubtitle"></p></div></div><div id="update" class="glass update-card"></div></section>
<section id="diagnostics" class="page"><div class="page-head"><div><div class="eyebrow" data-t="support"></div><h1 data-t="diagnosticsTitle"></h1><p class="subtitle" data-t="diagnosticsSubtitle"></p></div><div class="actions"><button class="button" data-action="copy-diagnostics"></button><button class="button" data-action="open-log"></button></div></div><div class="glass diagnostic-card"><pre id="diagnostics-text"></pre></div></section>
<section id="settings" class="page"><div class="page-head"><div><div class="eyebrow" data-t="preferences"></div><h1 data-t="settingsTitle"></h1><p class="subtitle" data-t="settingsSubtitle"></p></div></div><div class="glass settings-card" id="settings-list"></div></section>
</main></div></div></div>
<script>
const api=window.logitechApi;
const words={tr:{overview:'Genel Bak\u0131\u015F',history:'Analiz',updates:'G\xFCncellemeler',diagnostics:'Tan\u0131lama',settings:'Ayarlar',liveOverview:'Canl\u0131 g\xF6r\xFCn\xFCm',dashboardTitle:'Cihazlar\u0131na genel bak\u0131\u015F',dashboardSubtitle:'Logitech cihazlar\u0131n\u0131n pil durumunu, ba\u011Flant\u0131s\u0131n\u0131 ve son etkinli\u011Fini tek ekrandan izle.',devicesTitle:'Ba\u011Fl\u0131 cihazlar',devicesSubtitle:'G HUB taraf\u0131ndan bildirilen pil destekli donan\u0131mlar',analytics:'Pil analizi',analyticsTitle:'Pil ge\xE7mi\u015Fi ve \u015Farj etkinli\u011Fi',analyticsSubtitle:'T\xFCketim e\u011Frisini incele, \u015Farj s\xFCrelerini ve kullan\u0131m e\u011Filimini kar\u015F\u0131la\u015Ft\u0131r.',maintenance:'Bak\u0131m',updatesTitle:'Uygulama g\xFCncellemeleri',updatesSubtitle:'Commit tabanl\u0131 g\xFCncelleme durumunu ve son de\u011Fi\u015Fikli\u011Fi g\xF6r\xFCnt\xFCle.',support:'Destek',diagnosticsTitle:'Tan\u0131lama bilgileri',diagnosticsSubtitle:'Ba\u011Flant\u0131 ve \xE7al\u0131\u015Fma ortam\u0131n\u0131 sorun giderme i\xE7in incele.',preferences:'Tercihler',settingsTitle:'Uygulama ayarlar\u0131',settingsSubtitle:'Ba\u015Flang\u0131\xE7, bildirim, ge\xE7mi\u015F ve dil tercihlerini y\xF6net.',connected:'G HUB ba\u011Fl\u0131',disconnected:'G HUB bekleniyor',refresh:'\u015Eimdi yenile',reconnect:'Yeniden ba\u011Flan',noDevices:'Pil destekli cihaz bulunamad\u0131',noDevicesHelp:'G HUB a\xE7\u0131kken cihaz\u0131n\u0131 yeniden ba\u011Flamay\u0131 dene.',charging:'\u015Earj oluyor',online:'\xC7evrimi\xE7i',offline:'\xC7evrimd\u0131\u015F\u0131',clearHistory:'Ge\xE7mi\u015Fi temizle',noHistory:'Hen\xFCz pil ge\xE7mi\u015Fi yok',noHistoryHelp:'Veriler geldik\xE7e geli\u015Fmi\u015F grafik burada olu\u015Facak.',checkUpdate:'G\xFCncellemeleri denetle',restart:'Uygula ve yeniden ba\u015Flat',updateState:'Durum',commit:'Commit',message:'De\u011Fi\u015Fiklik',checkedAt:'Son kontrol',copyDiagnostics:'Tan\u0131lamay\u0131 kopyala',openLog:'Log dosyas\u0131n\u0131 a\xE7',launchAtStartup:'Windows ile otomatik ba\u015Flat',launchAtStartupHelp:'Oturum a\xE7\u0131ld\u0131\u011F\u0131nda bildirim alan\u0131nda \xE7al\u0131\u015Ft\u0131r.',notifyDisconnect:'Ba\u011Flant\u0131 kesilince bildir',notifyDisconnectHelp:'G HUB veya cihaz ba\u011Flant\u0131s\u0131 koptu\u011Funda bildir.',historyEnabled:'Pil ge\xE7mi\u015Fini kaydet',historyEnabledHelp:'Yedi g\xFCnl\xFCk pil ve \u015Farj etkinli\u011Fini yerel olarak sakla.',language:'Dil',languageHelp:'Kontrol panelinin dilini se\xE7.',turkish:'T\xFCrk\xE7e',english:'English',idle:'G\xFCncel',checking:'Denetleniyor',ready:'Yeniden ba\u015Flatmaya haz\u0131r',error:'Hata',copied:'Kopyaland\u0131',deviceCount:'Aktif cihaz',averageBattery:'Ortalama pil',chargingNow:'\u015Earjda',lastSync:'Son e\u015Fitleme',minLevel:'En d\xFC\u015F\xFCk',maxLevel:'En y\xFCksek',change:'De\u011Fi\u015Fim',chargingActivity:'\u015Earj etkinli\u011Fi',last24Hours:'Son 24 saat',totalChargeTime:'Toplam \u015Farj s\xFCresi',sessions:'\u015Earj oturumu',currentState:'Mevcut durum',notCharging:'\u015Earj edilmiyor',hoursShort:'sa',minutesShort:'dk',dataPoints:'veri noktas\u0131',trendStable:'Dengeli',trendDown:'Azal\u0131yor',trendUp:'Y\xFCkseliyor'},en:{overview:'Overview',history:'Analytics',updates:'Updates',diagnostics:'Diagnostics',settings:'Settings',liveOverview:'Live overview',dashboardTitle:'Your devices at a glance',dashboardSubtitle:'Monitor battery, connection and recent activity for Logitech devices in one place.',devicesTitle:'Connected devices',devicesSubtitle:'Battery-powered hardware reported by G HUB',analytics:'Battery analytics',analyticsTitle:'Battery history and charging activity',analyticsSubtitle:'Explore the discharge curve, charging duration and recent usage trend.',maintenance:'Maintenance',updatesTitle:'Application updates',updatesSubtitle:'View commit-based update status and the latest change.',support:'Support',diagnosticsTitle:'Diagnostic information',diagnosticsSubtitle:'Use connection and environment details for troubleshooting.',preferences:'Preferences',settingsTitle:'Application settings',settingsSubtitle:'Manage startup, notification, history and language preferences.',connected:'G HUB connected',disconnected:'Waiting for G HUB',refresh:'Refresh now',reconnect:'Reconnect',noDevices:'No battery-powered devices found',noDevicesHelp:'Try reconnecting your device while G HUB is open.',charging:'Charging',online:'Online',offline:'Offline',clearHistory:'Clear history',noHistory:'No battery history yet',noHistoryHelp:'The advanced chart will appear as readings arrive.',checkUpdate:'Check for updates',restart:'Apply and restart',updateState:'Status',commit:'Commit',message:'Change',checkedAt:'Last checked',copyDiagnostics:'Copy diagnostics',openLog:'Open log file',launchAtStartup:'Start automatically with Windows',launchAtStartupHelp:'Run in the notification area when you sign in.',notifyDisconnect:'Notify when disconnected',notifyDisconnectHelp:'Notify when G HUB or a device disconnects.',historyEnabled:'Record battery history',historyEnabledHelp:'Keep seven days of battery and charging activity locally.',language:'Language',languageHelp:'Choose the dashboard language.',turkish:'T\xFCrk\xE7e',english:'English',idle:'Up to date',checking:'Checking',ready:'Ready to restart',error:'Error',copied:'Copied',deviceCount:'Active devices',averageBattery:'Average battery',chargingNow:'Charging',lastSync:'Last sync',minLevel:'Lowest',maxLevel:'Highest',change:'Change',chargingActivity:'Charging activity',last24Hours:'Last 24 hours',totalChargeTime:'Total charge time',sessions:'Charging sessions',currentState:'Current state',notCharging:'Not charging',hoursShort:'h',minutesShort:'m',dataPoints:'data points',trendStable:'Stable',trendDown:'Falling',trendUp:'Rising'}};
const icons={overview:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-12h6V4h-6v4Z" stroke="currentColor" stroke-width="1.7"/></svg>',history:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 18 9 12l4 3 7-9" stroke="currentColor" stroke-width="1.8"/><path d="M4 20h16" stroke="currentColor" opacity=".5"/></svg>',updates:'<svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.7M20 4v4.7h-4.7" stroke="currentColor" stroke-width="1.7"/></svg>',diagnostics:'<svg viewBox="0 0 24 24" fill="none"><path d="M9 4h6l1 3 3 1v8l-3 1-1 3H9l-1-3-3-1V8l3-1 1-3Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor"/></svg>',settings:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h10M18 7h2M4 17h2m4 0h10M14 4v6M6 14v6" stroke="currentColor" stroke-width="1.7"/></svg>'};
let state,activeTab='overview',activeRange=24,activeSeriesKey;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const t=k=>words[state?.settings?.language||'tr'][k]||k;const color=v=>v==null?'#70798a':v<=5?'#ff5d6c':v<=20?'#ff8c42':v<=50?'#f5c451':'#39d98a';const date=v=>v?new Intl.DateTimeFormat(state.settings.language,{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'\u2014';const time=v=>v?new Intl.DateTimeFormat(state.settings.language,{hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'\u2014';const duration=ms=>{const n=Math.max(0,Math.round(ms/60000)),h=Math.floor(n/60),m=n%60;return(h?h+' '+t('hoursShort')+' ':'')+m+' '+t('minutesShort')};
function renderNav(){const tabs=['overview','history','updates','diagnostics','settings'];document.getElementById('nav').innerHTML=tabs.map(id=>'<button data-tab="'+id+'" class="'+(id===activeTab?'active':'')+'">'+icons[id]+'<span>'+t(id)+'</span></button>').join('');document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id===activeTab))}
function renderStats(){const online=state.devices.filter(d=>d.connected),levels=online.filter(d=>d.percentage!=null),avg=levels.length?Math.round(levels.reduce((a,d)=>a+d.percentage,0)/levels.length):null,charging=online.filter(d=>d.charging).length,latest=Math.max(0,...state.devices.map(d=>d.updatedAt||0));const items=[[t('deviceCount'),online.length,icons.overview],[t('averageBattery'),avg==null?'\u2014':avg+'%',icons.history],[t('chargingNow'),charging,icons.updates],[t('lastSync'),latest?time(latest):'\u2014',icons.diagnostics]];document.getElementById('stats').innerHTML=items.map(x=>'<article class="glass stat"><div class="stat-top"><span>'+x[0]+'</span><i class="stat-icon">'+x[2]+'</i></div><div class="stat-value">'+x[1]+'</div></article>').join('')}
function renderDevices(){const el=document.getElementById('devices');if(!state.devices.length){el.innerHTML='<div class="glass empty"><div><strong>'+t('noDevices')+'</strong>'+t('noDevicesHelp')+'</div></div>';return}el.innerHTML=state.devices.map(d=>{const c=color(d.percentage);return'<article class="glass device-card"><div class="device-top"><div class="device-ident"><i class="device-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M8 3.5h8a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z" stroke="currentColor" stroke-width="1.5"/><path d="M9 7h6M9 17h6" stroke="currentColor" opacity=".55"/></svg></i><div style="min-width:0"><div class="device-name">'+esc(d.name)+'</div><div class="device-model">'+esc(d.model)+'</div></div></div><div class="battery-number" style="color:'+c+'">'+(d.percentage==null?'\u2014':d.percentage+'%')+'</div></div><div class="battery-track"><div class="battery-fill" style="width:'+(d.percentage||0)+'%;background:'+c+';color:'+c+'"></div></div><div class="device-foot"><span class="inline-status" style="color:'+(d.charging?'var(--green)':d.connected?'#aeb7c7':'var(--red)')+'"><i class="mini-dot"></i>'+(d.charging?t('charging'):d.connected?t('online'):t('offline'))+'</span><span>'+date(d.updatedAt)+'</span></div></article>'}).join('')}
const entries=()=>Object.entries(state.history).filter(([,s])=>s.points?.length).sort((a,b)=>(b[1].points.at(-1)?.timestamp||0)-(a[1].points.at(-1)?.timestamp||0));function filtered(points,hours){const cut=Date.now()-hours*3600000,before=[...points].reverse().find(p=>p.timestamp<cut),inside=points.filter(p=>p.timestamp>=cut);return before?[{...before,timestamp:cut},...inside]:inside}function smooth(c){if(c.length<2)return c.length?'M '+c[0][0]+' '+c[0][1]:'';let d='M '+c[0][0]+' '+c[0][1];for(let i=1;i<c.length;i++){const a=c[i-1],b=c[i],m=(a[0]+b[0])/2;d+=' C '+m+' '+a[1]+' '+m+' '+b[1]+' '+b[0]+' '+b[1]}return d}
function renderSeries(){const e=entries();if(!activeSeriesKey||!state.history[activeSeriesKey])activeSeriesKey=e[0]?.[0];document.getElementById('series-tabs').innerHTML=e.map(([k,s])=>'<button class="series-tab '+(k===activeSeriesKey?'active':'')+'" data-series="'+esc(k)+'">'+esc(s.name)+'</button>').join('');document.querySelectorAll('#ranges button').forEach(b=>b.classList.toggle('active',Number(b.dataset.range)===activeRange))}
function renderChart(){const panel=document.getElementById('chart'),series=state.history[activeSeriesKey];if(!series){panel.innerHTML='<div class="empty"><div><strong>'+t('noHistory')+'</strong>'+t('noHistoryHelp')+'</div></div>';document.getElementById('charge').innerHTML=panel.innerHTML;return}const pts=filtered(series.points,activeRange);if(!pts.length){panel.innerHTML='<div class="empty"><div><strong>'+t('noHistory')+'</strong>'+t('noHistoryHelp')+'</div></div>';renderCharge(series.points);return}const start=Date.now()-activeRange*3600000,end=Date.now(),coords=pts.map(p=>[Math.max(0,Math.min(100,(p.timestamp-start)/(end-start)*100)),92-p.percentage*.82]),line=smooth(coords),area=line+' L '+coords.at(-1)[0]+' 96 L '+coords[0][0]+' 96 Z',levels=[100,75,50,25,0],grid=levels.map(v=>{const y=92-v*.82;return'<line class="chart-grid" x1="6" y1="'+y+'" x2="98" y2="'+y+'"/>'}).join(''),first=pts[0].percentage,last=pts.at(-1).percentage,min=Math.min(...pts.map(p=>p.percentage)),max=Math.max(...pts.map(p=>p.percentage)),delta=last-first;panel.innerHTML='<div class="panel-head"><div><h2>'+esc(series.name)+'</h2><p class="subtitle">'+pts.length+' '+t('dataPoints')+'</p></div><span class="badge">'+(delta<-1?t('trendDown'):delta>1?t('trendUp'):t('trendStable'))+'</span></div><div class="chart-wrap" id="chart-wrap"><div class="chart-scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="lineGradient"><stop stop-color="#67e8f9"/><stop offset="1" stop-color="#388bff"/></linearGradient><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#368eff" stop-opacity=".34"/><stop offset="1" stop-color="#368eff" stop-opacity="0"/></linearGradient></defs>'+grid+'<path class="chart-area" d="'+area+'"/><path class="chart-line" d="'+line+'"/><line id="cursor" class="chart-cursor" y1="6" y2="96"/><circle id="point" class="chart-point" r="1.5"/><rect id="hit" width="100" height="100" fill="transparent" style="cursor:crosshair"/></svg><div id="tip" class="tooltip"></div></div><div class="chart-summary"><div class="metric"><span>'+t('minLevel')+'</span><strong>'+min+'%</strong></div><div class="metric"><span>'+t('maxLevel')+'</span><strong>'+max+'%</strong></div><div class="metric"><span>'+t('change')+'</span><strong style="color:'+(delta<0?'var(--orange)':delta>0?'var(--green)':'#cbd2df')+'">'+(delta>0?'+':'')+delta+'%</strong></div></div>';bindChart(pts,start,end);renderCharge(series.points)}
function bindChart(pts,start,end){const wrap=document.getElementById('chart-wrap'),hit=document.getElementById('hit'),tip=document.getElementById('tip'),cursor=document.getElementById('cursor'),dot=document.getElementById('point');hit.addEventListener('pointermove',e=>{const rect=wrap.getBoundingClientRect(),target=start+Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*(end-start);let n=pts[0];for(const p of pts)if(Math.abs(p.timestamp-target)<Math.abs(n.timestamp-target))n=p;const x=Math.max(0,Math.min(100,(n.timestamp-start)/(end-start)*100)),y=92-n.percentage*.82;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);dot.setAttribute('cx',x);dot.setAttribute('cy',y);cursor.style.opacity=dot.style.opacity=tip.style.opacity='1';tip.style.left=x+'%';tip.style.top=y+'%';tip.innerHTML='<strong>'+n.percentage+'%</strong><span>'+date(n.timestamp)+(n.charging?' \xB7 '+t('charging'):'')+'</span>'});hit.addEventListener('pointerleave',()=>{cursor.style.opacity=dot.style.opacity=tip.style.opacity='0'})}
function chargeData(points){const start=Date.now()-86400000,end=Date.now(),all=points.filter(p=>p.timestamp<=end),before=[...all].reverse().find(p=>p.timestamp<start),active=(before?[{...before,timestamp:start}]:[]).concat(all.filter(p=>p.timestamp>=start));let total=0,sessions=0,was=false;const seg=[];for(let i=0;i<active.length;i++){const p=active[i],next=Math.min(end,active[i+1]?.timestamp||end);if(p.charging&&next>p.timestamp){if(was&&seg.length)seg[seg.length-1][1]=next;else{seg.push([p.timestamp,next]);sessions++}total+=next-p.timestamp}was=p.charging}return{start,end,total,sessions,seg,current:active.at(-1)?.charging||false}}
function renderCharge(points){const d=chargeData(points),span=d.end-d.start,bars=d.seg.map(s=>'<i class="charge-segment" style="left:'+((s[0]-d.start)/span*100)+'%;width:'+((s[1]-s[0])/span*100)+'%"></i>').join('');document.getElementById('charge').innerHTML='<div class="panel-head"><div><h2>'+t('chargingActivity')+'</h2><p class="subtitle">'+t('last24Hours')+'</p></div><span class="badge" style="color:'+(d.current?'var(--green)':'#c7ceda')+'">'+(d.current?t('charging'):t('notCharging'))+'</span></div><div class="charge-total">'+duration(d.total)+' <small>'+t('totalChargeTime').toLowerCase()+'</small></div><div class="timeline">'+bars+'</div><div class="timeline-labels"><span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>'+time(Date.now())+'</span></div><div class="facts"><div class="fact"><span>'+t('sessions')+'</span><strong>'+d.sessions+'</strong></div><div class="fact"><span>'+t('currentState')+'</span><strong>'+(d.current?t('charging'):t('notCharging'))+'</strong></div></div>'}
function renderUpdate(){const u=state.update;document.getElementById('update').innerHTML='<div class="panel-head"><div><h2>'+t('updateState')+'</h2><p class="subtitle">'+t(u.phase)+'</p></div><span class="badge">'+t(u.phase)+'</span></div><div class="stack"><div class="data-row"><span>'+t('commit')+'</span><strong>'+esc(u.commit||'\u2014')+'</strong></div><div class="data-row"><span>'+t('message')+'</span><strong>'+esc(u.message||u.detail||'\u2014')+'</strong></div><div class="data-row"><span>'+t('checkedAt')+'</span><strong>'+date(u.checkedAt)+'</strong></div></div><div class="actions" style="margin-top:16px"><button class="button" data-action="check-update" '+(u.phase==='checking'?'disabled':'')+'>'+t('checkUpdate')+'</button>'+(u.phase==='ready'?'<button class="button primary" data-action="restart-update">'+t('restart')+'</button>':'')+'</div>'}
function renderDiagnostics(){const d=state.diagnostics;document.getElementById('diagnostics-text').textContent=['App: '+state.app.name+' '+state.app.version,'Platform: '+d.platform+' '+d.arch,'Electron: '+d.electron,'Node: '+d.node,'G HUB: '+(state.connection.connected?'connected':'disconnected'),'Last connected: '+date(state.connection.lastConnectedAt),'Last disconnected: '+date(state.connection.lastDisconnectedAt),'Last error: '+(state.connection.lastError||'\u2014'),'Devices: '+state.devices.length,'Update: '+state.update.phase,'User data: '+d.userData,'Log: '+d.logPath].join('\\n')}
function renderSettings(){const s=state.settings,set=(key,help,input)=>'<label class="setting" style="display:flex;align-items:center;justify-content:space-between;gap:20px"><span class="setting-copy"><strong>'+t(key)+'</strong><small>'+t(help)+'</small></span>'+input+'</label>';document.getElementById('settings-list').innerHTML=set('launchAtStartup','launchAtStartupHelp','<input type="checkbox" data-setting="launchAtStartup" '+(s.launchAtStartup?'checked':'')+'>')+set('notifyDisconnect','notifyDisconnectHelp','<input type="checkbox" data-setting="notifyDisconnect" '+(s.notifyDisconnect?'checked':'')+'>')+set('historyEnabled','historyEnabledHelp','<input type="checkbox" data-setting="historyEnabled" '+(s.historyEnabled?'checked':'')+'>')+set('language','languageHelp','<select data-setting="language"><option value="tr" '+(s.language==='tr'?'selected':'')+'>'+t('turkish')+'</option><option value="en" '+(s.language==='en'?'selected':'')+'>'+t('english')+'</option></select>')}
function render(next){state=next;document.documentElement.lang=state.settings.language;document.getElementById('title-state').textContent=state.connection.connected?t('connected'):t('disconnected');document.getElementById('title-dot').classList.toggle('online',state.connection.connected);document.getElementById('version').textContent='v'+state.app.version;document.getElementById('side-state').textContent=state.connection.connected?t('connected'):t('disconnected');document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));renderNav();renderStats();renderDevices();renderSeries();renderChart();renderUpdate();renderDiagnostics();renderSettings();for(const [a,k] of [['refresh','refresh'],['reconnect','reconnect'],['clear-history','clearHistory'],['copy-diagnostics','copyDiagnostics'],['open-log','openLog']]){const el=document.querySelector('[data-action="'+a+'"]');if(el)el.textContent=t(k)}}
document.addEventListener('click',async e=>{const w=e.target.closest('[data-window]')?.dataset.window;if(w==='minimize')return api.minimizeWindow();if(w==='maximize')return api.toggleMaximizeWindow();if(w==='close')return api.closeWindow();const tab=e.target.closest('[data-tab]');if(tab){activeTab=tab.dataset.tab;renderNav();return}const range=e.target.closest('[data-range]');if(range){activeRange=Number(range.dataset.range);renderSeries();renderChart();return}const series=e.target.closest('[data-series]');if(series){activeSeriesKey=series.dataset.series;renderSeries();renderChart();return}const a=e.target.closest('[data-action]')?.dataset.action;if(a==='refresh')await api.refresh();if(a==='reconnect')await api.reconnect();if(a==='check-update')await api.checkUpdate();if(a==='restart-update')await api.restartUpdate();if(a==='clear-history')await api.clearHistory();if(a==='open-log')await api.openLog();if(a==='copy-diagnostics'){await api.copyDiagnostics();e.target.textContent=t('copied')}});document.addEventListener('change',async e=>{const k=e.target.dataset.setting;if(k)await api.updateSettings({[k]:e.target.type==='checkbox'?e.target.checked:e.target.value})});document.querySelector('.titlebar').addEventListener('dblclick',e=>{if(!e.target.closest('[data-window]'))api.toggleMaximizeWindow()});api.onState(render);api.getState().then(render);
</script></body></html>`;
}

// src/ghub-client.ts
var import_node_events = require("node:events");
var import_node_crypto = require("node:crypto");

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);
var wrapper_default = import_websocket.default;

// src/ghub-client.ts
var GHubClient = class extends import_node_events.EventEmitter {
  socket;
  reconnectTimer;
  pollTimer;
  reconnectDelay = 2e3;
  stopped = false;
  start() {
    if (this.socket && this.socket.readyState !== wrapper_default.CLOSED) return;
    this.stopped = false;
    this.connect();
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pollTimer);
    this.socket?.close();
    this.socket = void 0;
  }
  refresh() {
    this.send("GET", "/devices/list");
  }
  reconnect() {
    this.stop();
    setTimeout(() => this.start(), 250);
  }
  connect() {
    if (this.stopped) return;
    this.socket = new wrapper_default("ws://127.0.0.1:9010", ["json"], {
      origin: "file://",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache"
      }
    });
    this.socket.on("open", () => {
      this.reconnectDelay = 2e3;
      this.emit("connected");
      this.refresh();
      this.subscribe();
      clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => this.refresh(), 6e4);
    });
    this.socket.on("message", (raw) => this.handleMessage(raw.toString()));
    this.socket.on("error", (error) => {
      this.emit("error", error);
    });
    this.socket.on("close", () => {
      clearInterval(this.pollTimer);
      this.emit("disconnected");
      this.scheduleReconnect();
    });
  }
  scheduleReconnect() {
    if (this.stopped) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 3e4);
  }
  send(verb, path5) {
    if (this.socket?.readyState !== wrapper_default.OPEN) return;
    this.socket.send(JSON.stringify({ msgId: (0, import_node_crypto.randomUUID)(), verb, path: path5 }));
  }
  subscribe() {
    this.send("SUBSCRIBE", "/battery/state/changed");
  }
  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.path === "/devices/list") {
      const devices2 = message.payload?.deviceInfos ?? [];
      this.emit("devices", devices2);
      for (const device of devices2) {
        if (device.capabilities?.hasBatteryStatus) {
          this.send("GET", `/battery/${device.id}/state`);
        }
      }
      return;
    }
    const isBatteryResponse = message.path?.startsWith("/battery/") && message.path.endsWith("/state") && message.path !== "/battery/state/changed";
    const isBatteryBroadcast = message.path === "/battery/state/changed";
    if ((isBatteryResponse || isBatteryBroadcast) && message.payload) {
      const { percentage } = message.payload;
      const deviceId = message.payload.deviceId ?? (isBatteryResponse ? message.path?.split("/")[2] : void 0);
      if (typeof deviceId === "string" && typeof percentage === "number") {
        this.emit("battery", {
          deviceId,
          percentage,
          charging: message.payload.charging,
          fullyCharged: message.payload.fullyCharged,
          criticalLevel: message.payload.criticalLevel,
          mileage: message.payload.mileage
        });
      }
    }
  }
};

// src/i18n.ts
var messages = {
  tr: {
    dashboard: "Kontrol paneli",
    connected: "G HUB ba\u011Fl\u0131",
    waiting: "G HUB bekleniyor",
    noDevices: "Pil destekli cihaz bulunamad\u0131",
    unknownBattery: "Pil bilinmiyor",
    charging: "\u015Earj oluyor",
    refresh: "\u015Eimdi yenile",
    checkUpdates: "G\xFCncellemeleri denetle",
    checkingUpdates: "G\xFCncelleme denetleniyor\u2026",
    updateReady: "G\xFCncelleme haz\u0131r",
    updateError: "G\xFCncelleme hatas\u0131",
    restart: "Yeniden ba\u015Flat",
    openGHub: "G HUB'\u0131 a\xE7",
    launchAtStartup: "Windows ile ba\u015Flat",
    language: "Dil",
    exit: "\xC7\u0131k\u0131\u015F",
    disconnectedTitle: "G HUB ba\u011Flant\u0131s\u0131 kesildi",
    disconnectedBody: "Ba\u011Flant\u0131 otomatik olarak yeniden kurulmaya \xE7al\u0131\u015F\u0131l\u0131yor.",
    deviceOfflineTitle: "Cihaz ba\u011Flant\u0131s\u0131 kesildi",
    deviceOfflineBody: "{device} art\u0131k \xE7evrimd\u0131\u015F\u0131."
  },
  en: {
    dashboard: "Dashboard",
    connected: "G HUB connected",
    waiting: "Waiting for G HUB",
    noDevices: "No battery-powered devices found",
    unknownBattery: "Battery unknown",
    charging: "Charging",
    refresh: "Refresh now",
    checkUpdates: "Check for updates",
    checkingUpdates: "Checking for updates\u2026",
    updateReady: "Update ready",
    updateError: "Update error",
    restart: "Restart",
    openGHub: "Open G HUB",
    launchAtStartup: "Start with Windows",
    language: "Language",
    exit: "Quit",
    disconnectedTitle: "G HUB disconnected",
    disconnectedBody: "The app is trying to reconnect automatically.",
    deviceOfflineTitle: "Device disconnected",
    deviceOfflineBody: "{device} is now offline."
  }
};
function translator(language) {
  return (key, variables = {}) => {
    let value = messages[language][key];
    for (const [name, replacement] of Object.entries(variables)) {
      value = value.replaceAll(`{${name}}`, replacement);
    }
    return value;
  };
}

// src/logger.ts
var import_promises2 = require("node:fs/promises");
var import_node_path2 = __toESM(require("node:path"));
var AppLogger = class {
  filePath;
  writeQueue = Promise.resolve();
  constructor(userDataPath) {
    this.filePath = import_node_path2.default.join(userDataPath, "logs", "app.log");
  }
  info(message) {
    this.write("INFO", message);
  }
  error(message, error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : error ? String(error) : "";
    this.write("ERROR", detail ? `${message} | ${detail}` : message);
  }
  async tail(maxCharacters = 12e3) {
    try {
      const content = await (0, import_promises2.readFile)(this.filePath, "utf8");
      return content.slice(-maxCharacters);
    } catch {
      return "";
    }
  }
  write(level, message) {
    const clean = message.replace(/[\r\n]+/g, " ").slice(0, 4e3);
    const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${level} ${clean}
`;
    this.writeQueue = this.writeQueue.catch(() => {
    }).then(async () => {
      await (0, import_promises2.mkdir)(import_node_path2.default.dirname(this.filePath), { recursive: true });
      await (0, import_promises2.appendFile)(this.filePath, line, "utf8");
    });
  }
};

// src/state-store.ts
var import_promises3 = require("node:fs/promises");
var import_node_path3 = __toESM(require("node:path"));
var StateStore = class {
  filePath;
  states = {};
  writeQueue = Promise.resolve();
  constructor(userDataPath) {
    this.filePath = import_node_path3.default.join(userDataPath, "battery-state.json");
  }
  async load() {
    try {
      this.states = JSON.parse(await (0, import_promises3.readFile)(this.filePath, "utf8"));
    } catch {
      this.states = {};
    }
  }
  get(key) {
    return this.states[key];
  }
  async set(key, state) {
    this.states[key] = state;
    const serialized = JSON.stringify(this.states, null, 2);
    this.writeQueue = this.writeQueue.catch(() => {
    }).then(async () => {
      await (0, import_promises3.mkdir)(import_node_path3.default.dirname(this.filePath), { recursive: true });
      await (0, import_promises3.writeFile)(this.filePath, serialized, "utf8");
    });
    await this.writeQueue;
  }
};

// src/main.ts
var APP_ID = "com.battincik.logitechbatteryapi";
var updater;
var tray;
var client;
var store;
var appStore;
var logger;
var dashboardWindow;
var connected = false;
var hasConnected = false;
var lastConnectedAt;
var lastDisconnectedAt;
var lastConnectionError;
var devices = /* @__PURE__ */ new Map();
import_electron.app.setAppUserModelId(APP_ID);
var ICON_PNG = {
  green: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABvElEQVQ4y8XTz08TQRQH8O/s7jDQ1i7gLAk2NV5rPGA8uOUiHjgZ4M6Fv0EFTPgLVAT9F/on4I9TDxASbU1I9KJ4Fpsm7AS3urUdd7rPE6VFG5t48B1n8v3k5eU94H8XO/9ARHipqjMncbQammjuR6KnUpYIJpzMXtZJPV3yZg8YO4s558J2qV5+WNNq9XXjA2pthZ9kICx+KS+8Zd8tLIemuUlEG4wx09cBEaFUL29/an6+u6Mq0En8W7vC4rgjb+Ja+srmyvT8OmMM1unnC1WdqWk1MAwAOonxSr1FTau1naByA8AZEMbR2pvGx4HhXqTaOMQ307zXB5yY77eP2sFQkz/SAb6a6BYR2V2g1dFTMZmhgHYSI+q0cgCcLjBmi+MRiw8FCMaRssUxANMFJvmF/cvCGwrIj3q4yLO7jLFOF8ja6Se+W8DfuhAWR9EtYNzJPOob4pJXPMgJubUofYgBiLA4FmUROSGfLUj/HdCziYwxENGDUr3ccZ30eqVxiC86gE5ijDCO/KhE0b2KnJCPV6bnN07X+Y+38FxVr4dxdD800Vwr0d6YJYJxJ7M7wTNbC9J/33sL/1y/AMK/tR+ONtjoAAAAAElFTkSuQmCC",
  yellow: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABpElEQVQ4y8WTS04bQRCG/+p2u2fsBVgDLBhk8A2MxN7mDigmJ0BiR8JDygnCK8nKUm4Ayh1iYM0jEgewiWQWYDsoyPZ4xt3FgocNWMhSFqlllb6vS1VdwP8OeplgZnQuf2RtWFvlsJFn05wgmbymuHdAavSr4y8eE9FgATPLdrn42bR/r0a1nzCtC8CGgNSQiQyUl4N009tuZvkTEXWfCZgZ7XLxS/fv+Uqnuge2wet2hQM9uYDYyOy2m1leJ6KeIKjuZ6Ob07Og8n0g3C9xZpagRrJzztT7E/FYsGFjLaqV3oQBgG2AqH4IG918AIA+QW3etCpDTd60yuCwnmNmKXrZ5gRsONzuTADbvfUBxHoCmbyC1MMJpAOSySsA3SeBiI8dyURmOD4xA6HHS0RkegI1uqO8HEi83QUJB8rLQ6jU5rMhan/xWLrpXe0XQMIZDEsH2i9Auulv2i+cAUDsqUgEZt5ol4uGVGo9qh/AtCqA7QBCQ7rTUGPzkG566+En3nMvX2FmdKr7szZqfOTwT55Nc/z+FlIlEfd29eS7X/238M9xB7tUoVGaoF90AAAAAElFTkSuQmCC",
  orange: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABoElEQVQ4y8WTwU4TURSGv3Nn2oGpiZ2ibJjYTV1q2uqOMeIbiPUJDC+gIiY+gYooD9DEN2h8AwhOXKHFhSvYYIgLiTMu7GhLZ46Lmhak0SYuPMuT+3/3z3/Ogf9d8ntDVcl2XlW182WZTrxAL5kl7x5S8DZluvjC1BvbIjIeoKpWGjYfEx8sZ7tbaPQR0h7YDlIqYyoBeP6qFSw9EpH+CYCqkobN5/rpw92s3YKjH6f92g6mehPxL69awdKKiIwA6btWVQ/et9M3L8eLj0Gs+TvI3KWr1pXbb83QQRI9yHZf/1kM0O+S7YXo96/3AIYAOtENjfYnSl6jfejE11XVGgF6ySz93mSzO+pC99scYI8AefczOWcygO0M3kN/BCjMbEmpPJFeZspw5tyGiKRDgEyffWYqwYD+l99NJUDc4pMTIZp6YxvPXzO1RchNjRfnpjD1Bnj+uqndagPYQwciqOrDNGymluutZHvhIO1+D6w8UrqAuXgNPP/pr00c6E6NSJWs3appEt8niRfoJudxCoe4xQ1xS2umtrhz/Bb+uX4COnCVlohL8pQAAAAASUVORK5CYII=",
  red: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABhElEQVQ4y8WTy07CYBCFz5QydMFto4W4xX1J3AuFteFVvCc+gXd9lIYHKMa1StckrCm6shpCL3RcQKiKFxIXzvL/M19OzpwD/PfQ5wcRQdDpGOJ5e+J5NRmPV0nTniifv6Fs9oobjTsi+hogIinfso7j4XAvenhAPBwCYQgwQymVoBoGFF0/y7RaR0QUfQCICHzLupz0+9uhbUOCYFEvM7hWQ2p9/SzTah0QUQLwbduY9HrdoN3+evkdJLO1hVSlspFpNu+VuQLP24+63Z+XASAIEDkO5PV1BwASwPNzPXbdpZyPXRfieZsikkoA4/GqhOFSAPF9yGi0BkCdA0jTHimdXu72zCBNewQQJYBC4VYpl5cCKOUyqFjsENEkAWSz56phAL+pYIZqGKBc7uSDidxo3Cm6fsGmCWL+VjqbJhRdv2bT7AKAOv8kgogc+pY1oVzuIHIcxIPBNInp9DSJ1SoUXT+dJXG6t+CwCALbrsrLy+6sCyuzLnQon7/get1534U/zxspH6OtmBYulAAAAABJRU5ErkJggg==",
  gray: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABnklEQVQ4y8XTv0/bQBQH8O+V81GfGXJGZYEJ5LEkjieGCPiTyq9K/QugFNr/iKoeskDc0A0XRpBA2FnuItsXvQ4tLqRNFYmhb7y797l3T++A/x1sfIGIkCTnLa3NjtZmoyzLBSHEnefJz6778mMUtU4ZY38HiGgmjrv7eT7Yubj4jiwbYDSy4JzD930EwTKUahx2OmvvGGP2CUBEiOPu8fX1zZter4+qsn+UyzlHGL7G0tLiYaeztscYw4uHzSQ5b+X5YGIyAFhrkSTfkOeD3bOzfgTgN6C12U3Ty4nJj5E0vcJwONwaA/Tm/X0+VeezLIPWZp2IZmqgLKsFa+1UQFVZFEWxCIDXgBDOrePwqQDOOYQQtwBsDXie98X3/amA+XmFuTnvhDE2qgHXdT8EwTI4/3cVnHMEwQqkdA+eNDGKmqdKNY7a7VVMeorjcERRE0o1PrXbzQQA6pOMMRDR2zjujqSUe2l6hSzLYO3DJCoEwQqUarz/NYk/88ZvISL0ev3QmOG2MWajKMpXs7PiTkp54nnyKAxXvz7+C8+OH2b8r2Ld5lUAAAAAAElFTkSuQmCC",
  blue: "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABkklEQVQ4y8WTwU5TURBAz9zb93xd1FoTeU/o2rjEWNdCIuAHyIeoiIlfoCLqf9QvqAuMSy3BpYnbphZNwCfGPnu5d1xUnoCoTVw4yztzzp1MZuB/hxx/UFWeb4fZ3OlK7pgbep2qWvlYj3hRq/BkKbNdETlZoKq23fP3B4WuvNoJvC8UFyA2MFMVLjcMWSJry017T0T2jwhUlXbPP373RW92Bp5v4dd2YwPXUsvFmqwtN+2qiPwUdAZ+9u1e2HrW84xOgA9LbjQtF2qmdT2zm+YgkTu983on/BEGGAXo7gb2nN4CKAWfnM73C51o8v2hkjuuqqotBYVnyoWJeEYBvnqdASqlILF8iM1kgtiM64H9EjkTycvpqkwkmK4KjUg2RMSXglpFHrUahr91ERtoNQynI3lwZIhLmelmiawvpPa3klMGFlNLlsjTxdRsAVQOkiKCqt5t97yvR3a1uxvoD8ebGBk4nwhXzhqyRB7+2MQxd/wXVaWzHS59dno7d8wVXs8l41vYqEeyvpCaN4dv4Z/jO4SHmcufJV4PAAAAAElFTkSuQmCC"
};
function makePngIcon(tone) {
  return import_electron.nativeImage.createFromBuffer(Buffer.from(ICON_PNG[tone], "base64"));
}
function getBatteryIconTone(percentage) {
  if (percentage === void 0) return "gray";
  if (percentage <= 5) return "red";
  if (percentage <= 20) return "orange";
  if (percentage <= 50) return "yellow";
  return "green";
}
function makeTrayIcon(percentage, charging = false) {
  return makePngIcon(charging ? "blue" : getBatteryIconTone(percentage));
}
function makeBatteryLevelIcon(percentage) {
  return makePngIcon(getBatteryIconTone(percentage));
}
function makeConnectionIcon(isConnected) {
  return makePngIcon(isConnected ? "green" : "gray");
}
function getDisplayDevices() {
  return [...devices.values()].sort((a, b) => {
    if (a.percentage === void 0) return 1;
    if (b.percentage === void 0) return -1;
    return a.percentage - b.percentage;
  });
}
function updateTray() {
  const listed = getDisplayDevices();
  const t = translator(appStore?.settings.language ?? "tr");
  const active = listed.find((device) => !device.charging && device.percentage !== void 0) ?? listed.find((device) => device.percentage !== void 0);
  tray.setImage(makeTrayIcon(active?.percentage, active?.charging));
  tray.setToolTip(
    listed.length ? listed.map((device) => {
      const level = device.percentage === void 0 ? t("unknownBattery") : `%${device.percentage}`;
      return `${device.name}: ${level}${device.charging ? ` \xB7 ${t("charging")}` : ""}`;
    }).join("\n") : connected ? `${t("connected")} \xB7 ${t("noDevices")}` : t("waiting")
  );
  const deviceItems = listed.length ? listed.map((device) => ({
    label: `${device.name} \u2014 ${device.percentage === void 0 ? t("unknownBattery") : `%${device.percentage}`}${device.charging ? " \u26A1" : ""}`,
    icon: makeBatteryLevelIcon(device.percentage),
    enabled: false
  })) : [{ label: t("noDevices"), enabled: false }];
  tray.setContextMenu(
    import_electron.Menu.buildFromTemplate([
      {
        label: connected ? t("connected") : t("waiting"),
        icon: makeConnectionIcon(connected),
        enabled: false
      },
      { type: "separator" },
      ...deviceItems,
      { type: "separator" },
      { label: t("dashboard"), click: () => {
        void openDashboard();
      } },
      { label: t("refresh"), click: () => client.refresh() },
      {
        label: t("launchAtStartup"),
        type: "checkbox",
        checked: appStore?.settings.launchAtStartup ?? false,
        click: (item) => {
          void updateSettings({ launchAtStartup: item.checked });
        }
      },
      {
        label: t("language"),
        submenu: [
          { label: "T\xFCrk\xE7e", type: "radio", checked: appStore?.settings.language === "tr", click: () => {
            void updateSettings({ language: "tr" });
          } },
          { label: "English", type: "radio", checked: appStore?.settings.language === "en", click: () => {
            void updateSettings({ language: "en" });
          } }
        ]
      },
      {
        label: updater.status().phase === "checking" ? t("checkingUpdates") : t("checkUpdates"),
        enabled: updater.status().phase !== "checking",
        click: () => {
          void updater.check();
        }
      },
      ...updater.status().phase === "ready" ? [{ label: `${t("updateReady")} (${updater.status().detail}) \xB7 ${t("restart")}`, click: () => updater.restart() }] : [],
      ...updater.status().phase === "error" ? [{ label: `${t("updateError")}: ${updater.status().detail}`, enabled: false }] : [],
      {
        label: t("openGHub"),
        click: () => import_electron.shell.openPath(import_node_path4.default.join(process.env.ProgramFiles ?? "C:\\Program Files", "LGHUB", "lghub.exe"))
      },
      { type: "separator" },
      { label: t("exit"), click: () => import_electron.app.quit() }
    ])
  );
}
function applyLaunchAtStartup(enabled) {
  if (process.platform !== "win32") return;
  const executablePath = process.env.PORTABLE_EXECUTABLE_FILE ?? process.execPath;
  import_electron.app.setLoginItemSettings({
    openAtLogin: enabled,
    path: executablePath,
    args: process.defaultApp ? [import_electron.app.getAppPath()] : []
  });
}
async function updateSettings(patch) {
  const settings = await appStore.updateSettings(patch);
  if (patch.launchAtStartup !== void 0) applyLaunchAtStartup(settings.launchAtStartup);
  updateTray();
  await pushDashboardState();
}
function dashboardState() {
  return {
    app: { name: "Logitech Battery API", version: import_electron.app.getVersion() },
    settings: appStore.settings,
    history: appStore.history,
    devices: getDisplayDevices(),
    connection: { connected, lastConnectedAt, lastDisconnectedAt, lastError: lastConnectionError },
    update: updater.status(),
    diagnostics: {
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      userData: import_electron.app.getPath("userData"),
      logPath: logger.filePath
    }
  };
}
async function pushDashboardState() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  dashboardWindow.webContents.send("dashboard:state", dashboardState());
}
function diagnosticsText() {
  return JSON.stringify({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), ...dashboardState() }, null, 2);
}
function registerDashboardIpc() {
  import_electron.ipcMain.removeHandler("dashboard:get-state");
  import_electron.ipcMain.removeHandler("dashboard:update-settings");
  import_electron.ipcMain.removeHandler("dashboard:refresh");
  import_electron.ipcMain.removeHandler("dashboard:reconnect");
  import_electron.ipcMain.removeHandler("dashboard:check-update");
  import_electron.ipcMain.removeHandler("dashboard:restart-update");
  import_electron.ipcMain.removeHandler("dashboard:clear-history");
  import_electron.ipcMain.removeHandler("dashboard:open-log");
  import_electron.ipcMain.removeHandler("dashboard:copy-diagnostics");
  import_electron.ipcMain.removeHandler("dashboard:window-minimize");
  import_electron.ipcMain.removeHandler("dashboard:window-toggle-maximize");
  import_electron.ipcMain.removeHandler("dashboard:window-close");
  import_electron.ipcMain.handle("dashboard:get-state", () => dashboardState());
  import_electron.ipcMain.handle("dashboard:update-settings", async (_event, patch) => updateSettings(patch));
  import_electron.ipcMain.handle("dashboard:refresh", () => client.refresh());
  import_electron.ipcMain.handle("dashboard:reconnect", () => client.reconnect());
  import_electron.ipcMain.handle("dashboard:check-update", () => updater.check());
  import_electron.ipcMain.handle("dashboard:restart-update", () => updater.restart());
  import_electron.ipcMain.handle("dashboard:clear-history", async () => {
    await appStore.clearHistory();
    await pushDashboardState();
  });
  import_electron.ipcMain.handle("dashboard:open-log", () => import_electron.shell.showItemInFolder(logger.filePath));
  import_electron.ipcMain.handle("dashboard:copy-diagnostics", () => import_electron.clipboard.writeText(diagnosticsText()));
  import_electron.ipcMain.handle("dashboard:window-minimize", (event) => import_electron.BrowserWindow.fromWebContents(event.sender)?.minimize());
  import_electron.ipcMain.handle("dashboard:window-toggle-maximize", (event) => {
    const window = import_electron.BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  import_electron.ipcMain.handle("dashboard:window-close", (event) => import_electron.BrowserWindow.fromWebContents(event.sender)?.close());
}
async function openDashboard() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show();
    dashboardWindow.focus();
    await pushDashboardState();
    return;
  }
  const preloadDirectory = import_node_path4.default.join(import_electron.app.getPath("userData"), "runtime");
  const preloadPath = import_node_path4.default.join(preloadDirectory, "dashboard-preload.cjs");
  await (0, import_promises4.mkdir)(preloadDirectory, { recursive: true });
  await (0, import_promises4.writeFile)(preloadPath, DASHBOARD_PRELOAD, "utf8");
  dashboardWindow = new import_electron.BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 820,
    minHeight: 600,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#09090b",
    title: "Logitech Battery API",
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false, sandbox: false }
  });
  dashboardWindow.on("closed", () => {
    dashboardWindow = void 0;
  });
  dashboardWindow.webContents.on("did-finish-load", () => {
    void pushDashboardState();
  });
  await dashboardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createDashboardHtml())}`);
  dashboardWindow.show();
}
function notify(device, event) {
  const english = appStore.settings.language === "en";
  let title = device.name;
  let body = "";
  switch (event.type) {
    case "charging":
      title = english ? `${device.name} started charging` : `${device.name} \u015Farja tak\u0131ld\u0131`;
      body = english ? `Current battery level: ${event.percentage}%` : `Mevcut pil seviyesi: %${event.percentage}`;
      break;
    case "full":
      title = english ? `${device.name} is fully charged` : `${device.name} tamamen \u015Farj oldu`;
      body = english ? "Battery is at 100%. You can disconnect the charging cable." : "Pil seviyesi %100. \u015Earj kablosunu \xE7\u0131karabilirsin.";
      break;
    case "low":
      title = english ? `${device.name} battery is low` : `${device.name} pili azal\u0131yor`;
      body = english ? `Battery is at ${event.percentage}% and reached the ${event.threshold}% threshold.` : `Pil seviyesi %${event.percentage}; %${event.threshold} e\u015Fi\u011Fine ula\u015Ft\u0131.`;
      break;
    case "empty":
      title = english ? `${device.name} battery is empty` : `${device.name} pili bitti`;
      body = english ? "Battery is at 0%. Connect the device to a charger." : "Pil seviyesi %0. Cihaz\u0131 \u015Farja takmal\u0131s\u0131n.";
      break;
  }
  if (import_electron.Notification.isSupported()) {
    new import_electron.Notification({ title, body, urgency: event.type === "empty" ? "critical" : "normal" }).show();
  }
}
function notifyConnection(title, body) {
  if (import_electron.Notification.isSupported()) new import_electron.Notification({ title, body }).show();
}
function registerDevices(infos) {
  const t = translator(appStore.settings.language);
  const currentIds = new Set(infos.map((info) => info.id));
  for (const [id, device] of devices) {
    if (!currentIds.has(id) && device.connected) {
      device.connected = false;
      if (appStore.settings.notifyDisconnect) {
        notifyConnection(t("deviceOfflineTitle"), t("deviceOfflineBody", { device: device.name }));
      }
    }
  }
  for (const info of infos) {
    if (!info.capabilities?.hasBatteryStatus) continue;
    const name = info.extendedDisplayName ?? info.displayName ?? info.deviceModel ?? "Logitech cihaz\u0131";
    const old = devices.get(info.id);
    const nextConnected = info.isConnected !== false;
    if (old?.connected && !nextConnected && appStore.settings.notifyDisconnect) {
      notifyConnection(t("deviceOfflineTitle"), t("deviceOfflineBody", { device: name }));
    }
    devices.set(info.id, {
      id: info.id,
      stableKey: info.id,
      name,
      model: info.deviceModel ?? "unknown",
      connected: nextConnected,
      charging: old?.charging ?? false,
      fullyCharged: old?.fullyCharged ?? false,
      percentage: old?.percentage,
      mileage: old?.mileage,
      updatedAt: old?.updatedAt
    });
  }
  updateTray();
  void pushDashboardState();
}
async function updateBattery(payload) {
  const device = devices.get(payload.deviceId);
  if (!device || !Number.isFinite(payload.percentage)) return;
  device.percentage = Math.max(0, Math.min(100, Math.round(payload.percentage)));
  device.connected = true;
  device.charging = Boolean(payload.charging);
  device.fullyCharged = Boolean(payload.fullyCharged || device.percentage >= 100);
  device.mileage = payload.mileage;
  device.updatedAt = Date.now();
  const result = detectBatteryEvents(store.get(device.stableKey), { ...payload, percentage: device.percentage });
  await store.set(device.stableKey, result.state);
  await appStore.recordBattery(device);
  for (const event of result.events) notify(device, event);
  updateTray();
  await pushDashboardState();
}
function startApp(controller) {
  updater = controller;
  updater.onStatus(() => {
    if (tray && !tray.isDestroyed()) updateTray();
    void pushDashboardState();
  });
  void import_electron.app.whenReady().then(async () => {
    const userData = import_electron.app.getPath("userData");
    store = new StateStore(userData);
    appStore = new AppStore(userData);
    logger = new AppLogger(userData);
    await Promise.all([store.load(), appStore.load()]);
    applyLaunchAtStartup(appStore.settings.launchAtStartup);
    registerDashboardIpc();
    logger.info(`Application started (${import_electron.app.getVersion()})`);
    tray = new import_electron.Tray(makeTrayIcon());
    tray.setIgnoreDoubleClickEvents(true);
    tray.on("click", () => {
      void openDashboard().catch((error) => logger.error("Dashboard could not open", error));
    });
    updateTray();
    client = new GHubClient();
    client.on("connected", () => {
      connected = true;
      hasConnected = true;
      lastConnectedAt = Date.now();
      lastConnectionError = void 0;
      logger.info("Connected to G HUB");
      updateTray();
      void pushDashboardState();
    });
    client.on("disconnected", () => {
      const shouldNotify = connected && hasConnected && appStore.settings.notifyDisconnect;
      connected = false;
      lastDisconnectedAt = Date.now();
      for (const device of devices.values()) device.connected = false;
      logger.info("Disconnected from G HUB; reconnect scheduled");
      if (shouldNotify) {
        const t = translator(appStore.settings.language);
        notifyConnection(t("disconnectedTitle"), t("disconnectedBody"));
      }
      updateTray();
      void pushDashboardState();
    });
    client.on("devices", registerDevices);
    client.on("battery", (payload) => {
      void updateBattery(payload).catch((error) => {
        logger.error("Battery state could not be saved", error);
      });
    });
    client.on("error", (error) => {
      lastConnectionError = error.message;
      logger.error("G HUB WebSocket error", error);
      void pushDashboardState();
    });
    client.start();
    import_electron.app.on("second-instance", () => {
      void openDashboard();
    });
  }).catch((error) => {
    console.error("Ba\u015Flatma hatas\u0131:", error);
    logger?.error("Application startup failed", error);
  });
}
import_electron.app.on("before-quit", () => {
  client?.stop();
  import_electron.ipcMain.removeHandler("dashboard:get-state");
  import_electron.ipcMain.removeHandler("dashboard:update-settings");
  import_electron.ipcMain.removeHandler("dashboard:refresh");
  import_electron.ipcMain.removeHandler("dashboard:reconnect");
  import_electron.ipcMain.removeHandler("dashboard:check-update");
  import_electron.ipcMain.removeHandler("dashboard:restart-update");
  import_electron.ipcMain.removeHandler("dashboard:clear-history");
  import_electron.ipcMain.removeHandler("dashboard:open-log");
  import_electron.ipcMain.removeHandler("dashboard:copy-diagnostics");
  import_electron.ipcMain.removeHandler("dashboard:window-minimize");
  import_electron.ipcMain.removeHandler("dashboard:window-toggle-maximize");
  import_electron.ipcMain.removeHandler("dashboard:window-close");
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startApp
});
