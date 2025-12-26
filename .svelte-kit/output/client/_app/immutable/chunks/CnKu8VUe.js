let _;
function y(n) {
  const e = _.__externref_table_alloc();
  return _.__wbindgen_externrefs.set(e, n), e;
}
function E(n) {
  const e = typeof n;
  if (e == "number" || e == "boolean" || n == null) return `${n}`;
  if (e == "string") return `"${n}"`;
  if (e == "symbol") {
    const c = n.description;
    return c == null ? "Symbol" : `Symbol(${c})`;
  }
  if (e == "function") {
    const c = n.name;
    return typeof c == "string" && c.length > 0 ? `Function(${c})` : "Function";
  }
  if (Array.isArray(n)) {
    const c = n.length;
    let i = "[";
    c > 0 && (i += E(n[0]));
    for (let o = 1; o < c; o++) i += ", " + E(n[o]);
    return i += "]", i;
  }
  const t = /\[object ([^\]]+)\]/.exec(toString.call(n));
  let r;
  if (t && t.length > 1) r = t[1];
  else return toString.call(n);
  if (r == "Object") try {
    return "Object(" + JSON.stringify(n) + ")";
  } catch {
    return "Object";
  }
  return n instanceof Error ? `${n.name}: ${n.message}
${n.stack}` : r;
}
function I(n, e) {
  return n = n >>> 0, p().subarray(n / 1, n / 1 + e);
}
let a = null;
function s() {
  return (a === null || a.buffer.detached === true || a.buffer.detached === void 0 && a.buffer !== _.memory.buffer) && (a = new DataView(_.memory.buffer)), a;
}
function l(n, e) {
  return n = n >>> 0, W(n, e);
}
let m = null;
function p() {
  return (m === null || m.byteLength === 0) && (m = new Uint8Array(_.memory.buffer)), m;
}
function u(n, e) {
  try {
    return n.apply(this, e);
  } catch (t) {
    const r = y(t);
    _.__wbindgen_exn_store(r);
  }
}
function f(n) {
  return n == null;
}
function A(n, e, t) {
  if (t === void 0) {
    const b = h.encode(n), d = e(b.length, 1) >>> 0;
    return p().subarray(d, d + b.length).set(b), g = b.length, d;
  }
  let r = n.length, c = e(r, 1) >>> 0;
  const i = p();
  let o = 0;
  for (; o < r; o++) {
    const b = n.charCodeAt(o);
    if (b > 127) break;
    i[c + o] = b;
  }
  if (o !== r) {
    o !== 0 && (n = n.slice(o)), c = t(c, r, r = o + n.length * 3, 1) >>> 0;
    const b = p().subarray(c + o, c + r), d = h.encodeInto(n, b);
    o += d.written, c = t(c, r, o, 1) >>> 0;
  }
  return g = o, c;
}
function w(n) {
  const e = _.__wbindgen_externrefs.get(n);
  return _.__externref_table_dealloc(n), e;
}
let S = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
S.decode();
const T = 2146435072;
let x = 0;
function W(n, e) {
  return x += e, x >= T && (S = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), S.decode(), x = e), S.decode(p().subarray(n, n + e));
}
const h = new TextEncoder();
"encodeInto" in h || (h.encodeInto = function(n, e) {
  const t = h.encode(n);
  return e.set(t), { read: n.length, written: t.length };
});
let g = 0;
function U(n, e) {
  const t = _.run_backtest_wasm(n, e);
  if (t[2]) throw w(t[1]);
  return w(t[0]);
}
function L(n, e) {
  const t = _.run_monte_carlo_wasm(n, e);
  if (t[2]) throw w(t[1]);
  return w(t[0]);
}
function D(n) {
  const e = _.run_simulation_poc(n);
  if (e[2]) throw w(e[1]);
  return w(e[0]);
}
const j = /* @__PURE__ */ new Set(["basic", "cors", "default"]);
async function R(n, e) {
  if (typeof Response == "function" && n instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function") try {
      return await WebAssembly.instantiateStreaming(n, e);
    } catch (r) {
      if (n.ok && j.has(n.type) && n.headers.get("Content-Type") !== "application/wasm") console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", r);
      else throw r;
    }
    const t = await n.arrayBuffer();
    return await WebAssembly.instantiate(t, e);
  } else {
    const t = await WebAssembly.instantiate(n, e);
    return t instanceof WebAssembly.Instance ? { instance: t, module: n } : t;
  }
}
function O() {
  const n = {};
  return n.wbg = {}, n.wbg.__wbg_Error_52673b7de5a0ca89 = function(e, t) {
    return Error(l(e, t));
  }, n.wbg.__wbg_String_fed4d24b68977888 = function(e, t) {
    const r = String(t), c = A(r, _.__wbindgen_malloc, _.__wbindgen_realloc), i = g;
    s().setInt32(e + 4 * 1, i, true), s().setInt32(e + 4 * 0, c, true);
  }, n.wbg.__wbg___wbindgen_boolean_get_dea25b33882b895b = function(e) {
    const t = e, r = typeof t == "boolean" ? t : void 0;
    return f(r) ? 16777215 : r ? 1 : 0;
  }, n.wbg.__wbg___wbindgen_debug_string_adfb662ae34724b6 = function(e, t) {
    const r = E(t), c = A(r, _.__wbindgen_malloc, _.__wbindgen_realloc), i = g;
    s().setInt32(e + 4 * 1, i, true), s().setInt32(e + 4 * 0, c, true);
  }, n.wbg.__wbg___wbindgen_in_0d3e1e8f0c669317 = function(e, t) {
    return e in t;
  }, n.wbg.__wbg___wbindgen_is_function_8d400b8b1af978cd = function(e) {
    return typeof e == "function";
  }, n.wbg.__wbg___wbindgen_is_object_ce774f3490692386 = function(e) {
    const t = e;
    return typeof t == "object" && t !== null;
  }, n.wbg.__wbg___wbindgen_is_string_704ef9c8fc131030 = function(e) {
    return typeof e == "string";
  }, n.wbg.__wbg___wbindgen_is_undefined_f6b95eab589e0269 = function(e) {
    return e === void 0;
  }, n.wbg.__wbg___wbindgen_jsval_loose_eq_766057600fdd1b0d = function(e, t) {
    return e == t;
  }, n.wbg.__wbg___wbindgen_number_get_9619185a74197f95 = function(e, t) {
    const r = t, c = typeof r == "number" ? r : void 0;
    s().setFloat64(e + 8 * 1, f(c) ? 0 : c, true), s().setInt32(e + 4 * 0, !f(c), true);
  }, n.wbg.__wbg___wbindgen_string_get_a2a31e16edf96e42 = function(e, t) {
    const r = t, c = typeof r == "string" ? r : void 0;
    var i = f(c) ? 0 : A(c, _.__wbindgen_malloc, _.__wbindgen_realloc), o = g;
    s().setInt32(e + 4 * 1, o, true), s().setInt32(e + 4 * 0, i, true);
  }, n.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(e, t) {
    throw new Error(l(e, t));
  }, n.wbg.__wbg_call_3020136f7a2d6e44 = function() {
    return u(function(e, t, r) {
      return e.call(t, r);
    }, arguments);
  }, n.wbg.__wbg_call_abb4ff46ce38be40 = function() {
    return u(function(e, t) {
      return e.call(t);
    }, arguments);
  }, n.wbg.__wbg_crypto_574e78ad8b13b65f = function(e) {
    return e.crypto;
  }, n.wbg.__wbg_done_62ea16af4ce34b24 = function(e) {
    return e.done;
  }, n.wbg.__wbg_error_7534b8e9a36f1ab4 = function(e, t) {
    let r, c;
    try {
      r = e, c = t, console.error(l(e, t));
    } finally {
      _.__wbindgen_free(r, c, 1);
    }
  }, n.wbg.__wbg_getRandomValues_b8f5dbd5f3995a9e = function() {
    return u(function(e, t) {
      e.getRandomValues(t);
    }, arguments);
  }, n.wbg.__wbg_get_6b7bd52aca3f9671 = function(e, t) {
    return e[t >>> 0];
  }, n.wbg.__wbg_get_af9dab7e9603ea93 = function() {
    return u(function(e, t) {
      return Reflect.get(e, t);
    }, arguments);
  }, n.wbg.__wbg_get_with_ref_key_bb8f74a92cb2e784 = function(e, t) {
    return e[t];
  }, n.wbg.__wbg_instanceof_ArrayBuffer_f3320d2419cd0355 = function(e) {
    let t;
    try {
      t = e instanceof ArrayBuffer;
    } catch {
      t = false;
    }
    return t;
  }, n.wbg.__wbg_instanceof_Uint8Array_da54ccc9d3e09434 = function(e) {
    let t;
    try {
      t = e instanceof Uint8Array;
    } catch {
      t = false;
    }
    return t;
  }, n.wbg.__wbg_isArray_51fd9e6422c0a395 = function(e) {
    return Array.isArray(e);
  }, n.wbg.__wbg_isSafeInteger_ae7d3f054d55fa16 = function(e) {
    return Number.isSafeInteger(e);
  }, n.wbg.__wbg_iterator_27b7c8b35ab3e86b = function() {
    return Symbol.iterator;
  }, n.wbg.__wbg_length_22ac23eaec9d8053 = function(e) {
    return e.length;
  }, n.wbg.__wbg_length_d45040a40c570362 = function(e) {
    return e.length;
  }, n.wbg.__wbg_msCrypto_a61aeb35a24c1329 = function(e) {
    return e.msCrypto;
  }, n.wbg.__wbg_new_1ba21ce319a06297 = function() {
    return new Object();
  }, n.wbg.__wbg_new_25f239778d6112b9 = function() {
    return new Array();
  }, n.wbg.__wbg_new_6421f6084cc5bc5a = function(e) {
    return new Uint8Array(e);
  }, n.wbg.__wbg_new_8a6f238a6ece86ea = function() {
    return new Error();
  }, n.wbg.__wbg_new_b546ae120718850e = function() {
    return /* @__PURE__ */ new Map();
  }, n.wbg.__wbg_new_no_args_cb138f77cf6151ee = function(e, t) {
    return new Function(l(e, t));
  }, n.wbg.__wbg_new_with_length_aa5eaf41d35235e5 = function(e) {
    return new Uint8Array(e >>> 0);
  }, n.wbg.__wbg_next_138a17bbf04e926c = function(e) {
    return e.next;
  }, n.wbg.__wbg_next_3cfe5c0fe2a4cc53 = function() {
    return u(function(e) {
      return e.next();
    }, arguments);
  }, n.wbg.__wbg_node_905d3e251edff8a2 = function(e) {
    return e.node;
  }, n.wbg.__wbg_process_dc0fbacc7c1c06f7 = function(e) {
    return e.process;
  }, n.wbg.__wbg_prototypesetcall_dfe9b766cdc1f1fd = function(e, t, r) {
    Uint8Array.prototype.set.call(I(e, t), r);
  }, n.wbg.__wbg_randomFillSync_ac0988aba3254290 = function() {
    return u(function(e, t) {
      e.randomFillSync(t);
    }, arguments);
  }, n.wbg.__wbg_require_60cc747a6bc5215a = function() {
    return u(function() {
      return module.require;
    }, arguments);
  }, n.wbg.__wbg_set_3fda3bac07393de4 = function(e, t, r) {
    e[t] = r;
  }, n.wbg.__wbg_set_7df433eea03a5c14 = function(e, t, r) {
    e[t >>> 0] = r;
  }, n.wbg.__wbg_set_efaaf145b9377369 = function(e, t, r) {
    return e.set(t, r);
  }, n.wbg.__wbg_stack_0ed75d68575b0f3c = function(e, t) {
    const r = t.stack, c = A(r, _.__wbindgen_malloc, _.__wbindgen_realloc), i = g;
    s().setInt32(e + 4 * 1, i, true), s().setInt32(e + 4 * 0, c, true);
  }, n.wbg.__wbg_static_accessor_GLOBAL_769e6b65d6557335 = function() {
    const e = typeof global > "u" ? null : global;
    return f(e) ? 0 : y(e);
  }, n.wbg.__wbg_static_accessor_GLOBAL_THIS_60cf02db4de8e1c1 = function() {
    const e = typeof globalThis > "u" ? null : globalThis;
    return f(e) ? 0 : y(e);
  }, n.wbg.__wbg_static_accessor_SELF_08f5a74c69739274 = function() {
    const e = typeof self > "u" ? null : self;
    return f(e) ? 0 : y(e);
  }, n.wbg.__wbg_static_accessor_WINDOW_a8924b26aa92d024 = function() {
    const e = typeof window > "u" ? null : window;
    return f(e) ? 0 : y(e);
  }, n.wbg.__wbg_subarray_845f2f5bce7d061a = function(e, t, r) {
    return e.subarray(t >>> 0, r >>> 0);
  }, n.wbg.__wbg_value_57b7b035e117f7ee = function(e) {
    return e.value;
  }, n.wbg.__wbg_versions_c01dfd4722a88165 = function(e) {
    return e.versions;
  }, n.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(e, t) {
    return l(e, t);
  }, n.wbg.__wbindgen_cast_4625c577ab2ec9ee = function(e) {
    return BigInt.asUintN(64, e);
  }, n.wbg.__wbindgen_cast_9ae0607507abb057 = function(e) {
    return e;
  }, n.wbg.__wbindgen_cast_cb9088102bce6b30 = function(e, t) {
    return I(e, t);
  }, n.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(e) {
    return e;
  }, n.wbg.__wbindgen_init_externref_table = function() {
    const e = _.__wbindgen_externrefs, t = e.grow(4);
    e.set(0, void 0), e.set(t + 0, void 0), e.set(t + 1, null), e.set(t + 2, true), e.set(t + 3, false);
  }, n;
}
function F(n, e) {
  return _ = n.exports, M.__wbindgen_wasm_module = e, a = null, m = null, _.__wbindgen_start(), _;
}
function k(n) {
  if (_ !== void 0) return _;
  typeof n < "u" && (Object.getPrototypeOf(n) === Object.prototype ? { module: n } = n : console.warn("using deprecated parameters for `initSync()`; pass a single object instead"));
  const e = O();
  n instanceof WebAssembly.Module || (n = new WebAssembly.Module(n));
  const t = new WebAssembly.Instance(n, e);
  return F(t, n);
}
async function M(n) {
  if (_ !== void 0) return _;
  typeof n < "u" && (Object.getPrototypeOf(n) === Object.prototype ? { module_or_path: n } = n : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), typeof n > "u" && (n = new URL("" + new URL("../assets/rust_engine_bg.C7JsDaaL.wasm", import.meta.url).href, import.meta.url));
  const e = O();
  (typeof n == "string" || typeof Request == "function" && n instanceof Request || typeof URL == "function" && n instanceof URL) && (n = fetch(n));
  const { instance: t, module: r } = await R(await n, e);
  return F(t, r);
}
export {
  M as default,
  k as initSync,
  U as run_backtest_wasm,
  L as run_monte_carlo_wasm,
  D as run_simulation_poc
};
