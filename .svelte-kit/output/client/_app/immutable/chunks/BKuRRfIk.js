var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a, _b;
import { o as Oe, t as J } from "./CArxwV3n.js";
import { w as we } from "./CGTK0Dt_.js";
class ve {
  constructor(t, n) {
    this.status = t, typeof n == "string" ? this.body = { message: n } : n ? this.body = n : this.body = { message: `Error: ${t}` };
  }
  toString() {
    return JSON.stringify(this.body);
  }
}
class ye {
  constructor(t, n) {
    this.status = t, this.location = n;
  }
}
class be extends Error {
  constructor(t, n, a) {
    super(a), this.status = t, this.text = n;
  }
}
new URL("sveltekit-internal://");
function lt(e, t) {
  return e === "/" || t === "ignore" ? e : t === "never" ? e.endsWith("/") ? e.slice(0, -1) : e : t === "always" && !e.endsWith("/") ? e + "/" : e;
}
function ut(e) {
  return e.split("%25").map(decodeURI).join("%25");
}
function ft(e) {
  for (const t in e) e[t] = decodeURIComponent(e[t]);
  return e;
}
function le({ href: e }) {
  return e.split("#")[0];
}
function dt(...e) {
  let t = 5381;
  for (const n of e) if (typeof n == "string") {
    let a = n.length;
    for (; a; ) t = t * 33 ^ n.charCodeAt(--a);
  } else if (ArrayBuffer.isView(n)) {
    const a = new Uint8Array(n.buffer, n.byteOffset, n.byteLength);
    let r = a.length;
    for (; r; ) t = t * 33 ^ a[--r];
  } else throw new TypeError("value must be a string or TypedArray");
  return (t >>> 0).toString(36);
}
new TextEncoder();
new TextDecoder();
function ht(e) {
  const t = atob(e), n = new Uint8Array(t.length);
  for (let a = 0; a < t.length; a++) n[a] = t.charCodeAt(a);
  return n;
}
const pt = window.fetch;
window.fetch = (e, t) => ((e instanceof Request ? e.method : (t == null ? void 0 : t.method) || "GET") !== "GET" && B.delete(ke(e)), pt(e, t));
const B = /* @__PURE__ */ new Map();
function _t(e, t) {
  const n = ke(e, t), a = document.querySelector(n);
  if (a == null ? void 0 : a.textContent) {
    a.remove();
    let { body: r, ...s } = JSON.parse(a.textContent);
    const o = a.getAttribute("data-ttl");
    return o && B.set(n, { body: r, init: s, ttl: 1e3 * Number(o) }), a.getAttribute("data-b64") !== null && (r = ht(r)), Promise.resolve(new Response(r, s));
  }
  return window.fetch(e, t);
}
function gt(e, t, n) {
  if (B.size > 0) {
    const a = ke(e, n), r = B.get(a);
    if (r) {
      if (performance.now() < r.ttl && ["default", "force-cache", "only-if-cached", void 0].includes(n == null ? void 0 : n.cache)) return new Response(r.body, r.init);
      B.delete(a);
    }
  }
  return window.fetch(t, n);
}
function ke(e, t) {
  let a = `script[data-sveltekit-fetched][data-url=${JSON.stringify(e instanceof Request ? e.url : e)}]`;
  if ((t == null ? void 0 : t.headers) || (t == null ? void 0 : t.body)) {
    const r = [];
    t.headers && r.push([...new Headers(t.headers)].join(",")), t.body && (typeof t.body == "string" || ArrayBuffer.isView(t.body)) && r.push(t.body), a += `[data-hash="${dt(...r)}"]`;
  }
  return a;
}
const mt = /^(\[)?(\.\.\.)?(\w+)(?:=(\w+))?(\])?$/;
function wt(e) {
  const t = [];
  return { pattern: e === "/" ? /^\/$/ : new RegExp(`^${yt(e).map((a) => {
    const r = /^\[\.\.\.(\w+)(?:=(\w+))?\]$/.exec(a);
    if (r) return t.push({ name: r[1], matcher: r[2], optional: false, rest: true, chained: true }), "(?:/([^]*))?";
    const s = /^\[\[(\w+)(?:=(\w+))?\]\]$/.exec(a);
    if (s) return t.push({ name: s[1], matcher: s[2], optional: true, rest: false, chained: true }), "(?:/([^/]+))?";
    if (!a) return;
    const o = a.split(/\[(.+?)\](?!\])/);
    return "/" + o.map((c, l) => {
      if (l % 2) {
        if (c.startsWith("x+")) return ue(String.fromCharCode(parseInt(c.slice(2), 16)));
        if (c.startsWith("u+")) return ue(String.fromCharCode(...c.slice(2).split("-").map((m) => parseInt(m, 16))));
        const f = mt.exec(c), [, h, w, u, _] = f;
        return t.push({ name: u, matcher: _, optional: !!h, rest: !!w, chained: w ? l === 1 && o[0] === "" : false }), w ? "([^]*?)" : h ? "([^/]*)?" : "([^/]+?)";
      }
      return ue(c);
    }).join("");
  }).join("")}/?$`), params: t };
}
function vt(e) {
  return e !== "" && !/^\([^)]+\)$/.test(e);
}
function yt(e) {
  return e.slice(1).split("/").filter(vt);
}
function bt(e, t, n) {
  const a = {}, r = e.slice(1), s = r.filter((i) => i !== void 0);
  let o = 0;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    let l = r[i - o];
    if (c.chained && c.rest && o && (l = r.slice(i - o, i + 1).filter((f) => f).join("/"), o = 0), l === void 0) {
      c.rest && (a[c.name] = "");
      continue;
    }
    if (!c.matcher || n[c.matcher](l)) {
      a[c.name] = l;
      const f = t[i + 1], h = r[i + 1];
      f && !f.rest && f.optional && h && c.chained && (o = 0), !f && !h && Object.keys(a).length === s.length && (o = 0);
      continue;
    }
    if (c.optional && c.chained) {
      o++;
      continue;
    }
    return;
  }
  if (!o) return a;
}
function ue(e) {
  return e.normalize().replace(/[[\]]/g, "\\$&").replace(/%/g, "%25").replace(/\//g, "%2[Ff]").replace(/\?/g, "%3[Ff]").replace(/#/g, "%23").replace(/[.*+?^${}()|\\]/g, "\\$&");
}
function kt({ nodes: e, server_loads: t, dictionary: n, matchers: a }) {
  const r = new Set(t);
  return Object.entries(n).map(([i, [c, l, f]]) => {
    const { pattern: h, params: w } = wt(i), u = { id: i, exec: (_) => {
      const m = h.exec(_);
      if (m) return bt(m, w, a);
    }, errors: [1, ...f || []].map((_) => e[_]), layouts: [0, ...l || []].map(o), leaf: s(c) };
    return u.errors.length = u.layouts.length = Math.max(u.errors.length, u.layouts.length), u;
  });
  function s(i) {
    const c = i < 0;
    return c && (i = ~i), [c, e[i]];
  }
  function o(i) {
    return i === void 0 ? i : [r.has(i), e[i]];
  }
}
function Be(e, t = JSON.parse) {
  try {
    return t(sessionStorage[e]);
  } catch {
  }
}
function Pe(e, t, n = JSON.stringify) {
  const a = n(t);
  try {
    sessionStorage[e] = a;
  } catch {
  }
}
const x = ((_a = globalThis.__sveltekit_1vobysx) == null ? void 0 : _a.base) ?? "", St = ((_b = globalThis.__sveltekit_1vobysx) == null ? void 0 : _b.assets) ?? x ?? "", Et = "1766579095746", Ke = "sveltekit:snapshot", Me = "sveltekit:scroll", Fe = "sveltekit:states", Rt = "sveltekit:pageurl", D = "sveltekit:history", M = "sveltekit:navigation", O = { tap: 1, hover: 2, viewport: 3, eager: 4, off: -1, false: -1 }, Se = location.origin;
function Ge(e) {
  if (e instanceof URL) return e;
  let t = document.baseURI;
  if (!t) {
    const n = document.getElementsByTagName("base");
    t = n.length ? n[0].href : document.URL;
  }
  return new URL(e, t);
}
function oe() {
  return { x: pageXOffset, y: pageYOffset };
}
function N(e, t) {
  return e.getAttribute(`data-sveltekit-${t}`);
}
const Ce = { ...O, "": O.hover };
function We(e) {
  let t = e.assignedSlot ?? e.parentNode;
  return (t == null ? void 0 : t.nodeType) === 11 && (t = t.host), t;
}
function Ye(e, t) {
  for (; e && e !== t; ) {
    if (e.nodeName.toUpperCase() === "A" && e.hasAttribute("href")) return e;
    e = We(e);
  }
}
function he(e, t, n) {
  let a;
  try {
    if (a = new URL(e instanceof SVGAElement ? e.href.baseVal : e.href, document.baseURI), n && a.hash.match(/^#[^/]/)) {
      const i = location.hash.split("#")[1] || "/";
      a.hash = `#${i}${a.hash}`;
    }
  } catch {
  }
  const r = e instanceof SVGAElement ? e.target.baseVal : e.target, s = !a || !!r || se(a, t, n) || (e.getAttribute("rel") || "").split(/\s+/).includes("external"), o = (a == null ? void 0 : a.origin) === Se && e.hasAttribute("download");
  return { url: a, external: s, target: r, download: o };
}
function X(e) {
  let t = null, n = null, a = null, r = null, s = null, o = null, i = e;
  for (; i && i !== document.documentElement; ) a === null && (a = N(i, "preload-code")), r === null && (r = N(i, "preload-data")), t === null && (t = N(i, "keepfocus")), n === null && (n = N(i, "noscroll")), s === null && (s = N(i, "reload")), o === null && (o = N(i, "replacestate")), i = We(i);
  function c(l) {
    switch (l) {
      case "":
      case "true":
        return true;
      case "off":
      case "false":
        return false;
      default:
        return;
    }
  }
  return { preload_code: Ce[a ?? "off"], preload_data: Ce[r ?? "off"], keepfocus: c(t), noscroll: c(n), reload: c(s), replace_state: c(o) };
}
function je(e) {
  const t = we(e);
  let n = true;
  function a() {
    n = true, t.update((o) => o);
  }
  function r(o) {
    n = false, t.set(o);
  }
  function s(o) {
    let i;
    return t.subscribe((c) => {
      (i === void 0 || n && c !== i) && o(i = c);
    });
  }
  return { notify: a, set: r, subscribe: s };
}
const ze = { v: () => {
} };
function xt() {
  const { set: e, subscribe: t } = we(false);
  let n;
  async function a() {
    clearTimeout(n);
    try {
      const r = await fetch(`${St}/_app/version.json`, { headers: { pragma: "no-cache", "cache-control": "no-cache" } });
      if (!r.ok) return false;
      const o = (await r.json()).version !== Et;
      return o && (e(true), ze.v(), clearTimeout(n)), o;
    } catch {
      return false;
    }
  }
  return { subscribe: t, check: a };
}
function se(e, t, n) {
  return e.origin !== Se || !e.pathname.startsWith(t) ? true : n ? e.pathname !== location.pathname : false;
}
function en(e) {
}
const He = /* @__PURE__ */ new Set(["load", "prerender", "csr", "ssr", "trailingSlash", "config"]);
[...He];
const At = /* @__PURE__ */ new Set([...He]);
[...At];
function Lt(e) {
  return e.filter((t) => t != null);
}
function Ee(e) {
  return e instanceof ve || e instanceof be ? e.status : 500;
}
function Ut(e) {
  return e instanceof be ? e.text : "Internal Error";
}
let k, F, fe;
const Tt = Oe.toString().includes("$$") || /function \w+\(\) \{\}/.test(Oe.toString());
Tt ? (k = { data: {}, form: null, error: null, params: {}, route: { id: null }, state: {}, status: -1, url: new URL("https://example.com") }, F = { current: null }, fe = { current: false }) : (k = new class {
  constructor() {
    __publicField(this, "data", $state.raw({}));
    __publicField(this, "form", $state.raw(null));
    __publicField(this, "error", $state.raw(null));
    __publicField(this, "params", $state.raw({}));
    __publicField(this, "route", $state.raw({ id: null }));
    __publicField(this, "state", $state.raw({}));
    __publicField(this, "status", $state.raw(-1));
    __publicField(this, "url", $state.raw(new URL("https://example.com")));
  }
}(), F = new class {
  constructor() {
    __publicField(this, "current", $state.raw(null));
  }
}(), fe = new class {
  constructor() {
    __publicField(this, "current", $state.raw(false));
  }
}(), ze.v = () => fe.current = true);
function $t(e) {
  Object.assign(k, e);
}
const It = /* @__PURE__ */ new Set(["icon", "shortcut icon", "apple-touch-icon"]), C = Be(Me) ?? {}, G = Be(Ke) ?? {}, I = { url: je({}), page: je({}), navigating: we(null), updated: xt() };
function Re(e) {
  C[e] = oe();
}
function Ot(e, t) {
  let n = e + 1;
  for (; C[n]; ) delete C[n], n += 1;
  for (n = t + 1; G[n]; ) delete G[n], n += 1;
}
function W(e, t = false) {
  return t ? location.replace(e.href) : location.href = e.href, new Promise(() => {
  });
}
async function Je() {
  if ("serviceWorker" in navigator) {
    const e = await navigator.serviceWorker.getRegistration(x || "/");
    e && await e.update();
  }
}
function Ne() {
}
let xe, pe, Q, U, _e, v;
const Z = [], ee = [];
let A = null;
function ge() {
  var _a2;
  (_a2 = A == null ? void 0 : A.fork) == null ? void 0 : _a2.then((e) => e == null ? void 0 : e.discard()), A = null;
}
const H = /* @__PURE__ */ new Map(), Xe = /* @__PURE__ */ new Set(), Pt = /* @__PURE__ */ new Set(), K = /* @__PURE__ */ new Set();
let g = { branch: [], error: null, url: null }, Qe = false, te = false, De = true, Y = false, V = false, Ze = false, Ae = false, et, y, R, P;
const ne = /* @__PURE__ */ new Set(), qe = /* @__PURE__ */ new Map();
async function rn(e, t, n) {
  var _a2, _b2, _c, _d, _e2;
  ((_a2 = globalThis.__sveltekit_1vobysx) == null ? void 0 : _a2.data) && globalThis.__sveltekit_1vobysx.data, document.URL !== location.href && (location.href = location.href), v = e, await ((_c = (_b2 = e.hooks).init) == null ? void 0 : _c.call(_b2)), xe = kt(e), U = document.documentElement, _e = t, pe = e.nodes[0], Q = e.nodes[1], pe(), Q(), y = (_d = history.state) == null ? void 0 : _d[D], R = (_e2 = history.state) == null ? void 0 : _e2[M], y || (y = R = Date.now(), history.replaceState({ ...history.state, [D]: y, [M]: R }, ""));
  const a = C[y];
  function r() {
    a && (history.scrollRestoration = "manual", scrollTo(a.x, a.y));
  }
  n ? (r(), await zt(_e, n)) : (await q({ type: "enter", url: Ge(v.hash ? Xt(new URL(location.href)) : location.href), replace_state: true }), r()), Yt();
}
function Ct() {
  Z.length = 0, Ae = false;
}
function tt(e) {
  ee.some((t) => t == null ? void 0 : t.snapshot) && (G[e] = ee.map((t) => {
    var _a2;
    return (_a2 = t == null ? void 0 : t.snapshot) == null ? void 0 : _a2.capture();
  }));
}
function nt(e) {
  var _a2;
  (_a2 = G[e]) == null ? void 0 : _a2.forEach((t, n) => {
    var _a3, _b2;
    (_b2 = (_a3 = ee[n]) == null ? void 0 : _a3.snapshot) == null ? void 0 : _b2.restore(t);
  });
}
function Ve() {
  Re(y), Pe(Me, C), tt(R), Pe(Ke, G);
}
async function jt(e, t, n, a) {
  let r;
  t.invalidateAll && ge(), await q({ type: "goto", url: Ge(e), keepfocus: t.keepFocus, noscroll: t.noScroll, replace_state: t.replaceState, state: t.state, redirect_count: n, nav_token: a, accept: () => {
    t.invalidateAll && (Ae = true, r = [...qe.keys()]), t.invalidate && t.invalidate.forEach(Wt);
  } }), t.invalidateAll && J().then(J).then(() => {
    qe.forEach(({ resource: s }, o) => {
      var _a2;
      (r == null ? void 0 : r.includes(o)) && ((_a2 = s.refresh) == null ? void 0 : _a2.call(s));
    });
  });
}
async function Nt(e) {
  if (e.id !== (A == null ? void 0 : A.id)) {
    ge();
    const t = {};
    ne.add(t), A = { id: e.id, token: t, promise: rt({ ...e, preload: t }).then((n) => (ne.delete(t), n.type === "loaded" && n.state.error && ge(), n)), fork: null };
  }
  return A.promise;
}
async function de(e) {
  var _a2;
  const t = (_a2 = await ie(e, false)) == null ? void 0 : _a2.route;
  t && await Promise.all([...t.layouts, t.leaf].map((n) => n == null ? void 0 : n[1]()));
}
async function at(e, t, n) {
  var _a2;
  g = e.state;
  const a = document.querySelector("style[data-sveltekit]");
  if (a && a.remove(), Object.assign(k, e.props.page), et = new v.root({ target: t, props: { ...e.props, stores: I, components: ee }, hydrate: n, sync: false }), await Promise.resolve(), nt(R), n) {
    const r = { from: null, to: { params: g.params, route: { id: ((_a2 = g.route) == null ? void 0 : _a2.id) ?? null }, url: new URL(location.href) }, willUnload: false, type: "enter", complete: Promise.resolve() };
    K.forEach((s) => s(r));
  }
  te = true;
}
function ae({ url: e, params: t, branch: n, status: a, error: r, route: s, form: o }) {
  let i = "never";
  if (x && (e.pathname === x || e.pathname === x + "/")) i = "always";
  else for (const u of n) (u == null ? void 0 : u.slash) !== void 0 && (i = u.slash);
  e.pathname = lt(e.pathname, i), e.search = e.search;
  const c = { type: "loaded", state: { url: e, params: t, branch: n, error: r, route: s }, props: { constructors: Lt(n).map((u) => u.node.component), page: Ie(k) } };
  o !== void 0 && (c.props.form = o);
  let l = {}, f = !k, h = 0;
  for (let u = 0; u < Math.max(n.length, g.branch.length); u += 1) {
    const _ = n[u], m = g.branch[u];
    (_ == null ? void 0 : _.data) !== (m == null ? void 0 : m.data) && (f = true), _ && (l = { ...l, ..._.data }, f && (c.props[`data_${h}`] = l), h += 1);
  }
  return (!g.url || e.href !== g.url.href || g.error !== r || o !== void 0 && o !== k.form || f) && (c.props.page = { error: r, params: t, route: { id: (s == null ? void 0 : s.id) ?? null }, state: {}, status: a, url: new URL(e), form: o ?? null, data: f ? l : k.data }), c;
}
async function Le({ loader: e, parent: t, url: n, params: a, route: r, server_data_node: s }) {
  var _a2, _b2;
  let o = null;
  const i = { dependencies: /* @__PURE__ */ new Set(), params: /* @__PURE__ */ new Set(), parent: false, route: false, url: false, search_params: /* @__PURE__ */ new Set() }, c = await e();
  return { node: c, loader: e, server: s, universal: ((_a2 = c.universal) == null ? void 0 : _a2.load) ? { type: "data", data: o, uses: i } : null, data: o ?? (s == null ? void 0 : s.data) ?? null, slash: ((_b2 = c.universal) == null ? void 0 : _b2.trailingSlash) ?? (s == null ? void 0 : s.slash) };
}
function Dt(e, t, n) {
  let a = e instanceof Request ? e.url : e;
  const r = new URL(a, n);
  r.origin === n.origin && (a = r.href.slice(n.origin.length));
  const s = te ? gt(a, r.href, t) : _t(a, t);
  return { resolved: r, promise: s };
}
function qt(e, t, n, a, r, s) {
  if (Ae) return true;
  if (!r) return false;
  if (r.parent && e || r.route && t || r.url && n) return true;
  for (const o of r.search_params) if (a.has(o)) return true;
  for (const o of r.params) if (s[o] !== g.params[o]) return true;
  for (const o of r.dependencies) if (Z.some((i) => i(new URL(o)))) return true;
  return false;
}
function Ue(e, t) {
  return (e == null ? void 0 : e.type) === "data" ? e : (e == null ? void 0 : e.type) === "skip" ? t ?? null : null;
}
function Vt(e, t) {
  if (!e) return new Set(t.searchParams.keys());
  const n = /* @__PURE__ */ new Set([...e.searchParams.keys(), ...t.searchParams.keys()]);
  for (const a of n) {
    const r = e.searchParams.getAll(a), s = t.searchParams.getAll(a);
    r.every((o) => s.includes(o)) && s.every((o) => r.includes(o)) && n.delete(a);
  }
  return n;
}
function Bt({ error: e, url: t, route: n, params: a }) {
  return { type: "loaded", state: { error: e, url: t, route: n, params: a, branch: [] }, props: { page: Ie(k), constructors: [] } };
}
async function rt({ id: e, invalidating: t, url: n, params: a, route: r, preload: s }) {
  if ((A == null ? void 0 : A.id) === e) return ne.delete(A.token), A.promise;
  const { errors: o, layouts: i, leaf: c } = r, l = [...i, c];
  o.forEach((p) => p == null ? void 0 : p().catch(() => {
  })), l.forEach((p) => p == null ? void 0 : p[1]().catch(() => {
  }));
  const f = g.url ? e !== re(g.url) : false, h = g.route ? r.id !== g.route.id : false, w = Vt(g.url, n);
  let u = false;
  const _ = l.map(async (p, d) => {
    var _a2;
    if (!p) return;
    const S = g.branch[d];
    return p[1] === (S == null ? void 0 : S.loader) && !qt(u, h, f, w, (_a2 = S.universal) == null ? void 0 : _a2.uses, a) ? S : (u = true, Le({ loader: p[1], url: n, params: a, route: r, parent: async () => {
      var _a3;
      const T = {};
      for (let L = 0; L < d; L += 1) Object.assign(T, (_a3 = await _[L]) == null ? void 0 : _a3.data);
      return T;
    }, server_data_node: Ue(p[0] ? { type: "skip" } : null, p[0] ? S == null ? void 0 : S.server : void 0) }));
  });
  for (const p of _) p.catch(() => {
  });
  const m = [];
  for (let p = 0; p < l.length; p += 1) if (l[p]) try {
    m.push(await _[p]);
  } catch (d) {
    if (d instanceof ye) return { type: "redirect", location: d.location };
    if (ne.has(s)) return Bt({ error: await z(d, { params: a, url: n, route: { id: r.id } }), url: n, params: a, route: r });
    let S = Ee(d), E;
    if (d instanceof ve) E = d.body;
    else {
      if (await I.updated.check()) return await Je(), await W(n);
      E = await z(d, { params: a, url: n, route: { id: r.id } });
    }
    const T = await Kt(p, m, o);
    return T ? ae({ url: n, params: a, branch: m.slice(0, T.idx).concat(T.node), status: S, error: E, route: r }) : await st(n, { id: r.id }, E, S);
  }
  else m.push(void 0);
  return ae({ url: n, params: a, branch: m, status: 200, error: null, route: r, form: t ? void 0 : null });
}
async function Kt(e, t, n) {
  for (; e--; ) if (n[e]) {
    let a = e;
    for (; !t[a]; ) a -= 1;
    try {
      return { idx: a + 1, node: { node: await n[e](), loader: n[e], data: {}, server: null, universal: null } };
    } catch {
      continue;
    }
  }
}
async function Te({ status: e, error: t, url: n, route: a }) {
  const r = {};
  let s = null;
  try {
    const o = await Le({ loader: pe, url: n, params: r, route: a, parent: () => Promise.resolve({}), server_data_node: Ue(s) }), i = { node: await Q(), loader: Q, universal: null, server: null, data: null };
    return ae({ url: n, params: r, branch: [o, i], status: e, error: t, route: null });
  } catch (o) {
    if (o instanceof ye) return jt(new URL(o.location, location.href), {}, 0);
    throw o;
  }
}
async function Mt(e) {
  const t = e.href;
  if (H.has(t)) return H.get(t);
  let n;
  try {
    const a = (async () => {
      let r = await v.hooks.reroute({ url: new URL(e), fetch: async (s, o) => Dt(s, o, e).promise }) ?? e;
      if (typeof r == "string") {
        const s = new URL(e);
        v.hash ? s.hash = r : s.pathname = r, r = s;
      }
      return r;
    })();
    H.set(t, a), n = await a;
  } catch {
    H.delete(t);
    return;
  }
  return n;
}
async function ie(e, t) {
  if (e && !se(e, x, v.hash)) {
    const n = await Mt(e);
    if (!n) return;
    const a = Ft(n);
    for (const r of xe) {
      const s = r.exec(a);
      if (s) return { id: re(e), invalidating: t, route: r, params: ft(s), url: e };
    }
  }
}
function Ft(e) {
  return ut(v.hash ? e.hash.replace(/^#/, "").replace(/[?#].+/, "") : e.pathname.slice(x.length)) || "/";
}
function re(e) {
  return (v.hash ? e.hash.replace(/^#/, "") : e.pathname) + e.search;
}
function ot({ url: e, type: t, intent: n, delta: a, event: r }) {
  let s = false;
  const o = $e(g, n, e, t);
  a !== void 0 && (o.navigation.delta = a), r !== void 0 && (o.navigation.event = r);
  const i = { ...o.navigation, cancel: () => {
    s = true, o.reject(new Error("navigation cancelled"));
  } };
  return Y || Xe.forEach((c) => c(i)), s ? null : o;
}
async function q({ type: e, url: t, popped: n, keepfocus: a, noscroll: r, replace_state: s, state: o = {}, redirect_count: i = 0, nav_token: c = {}, accept: l = Ne, block: f = Ne, event: h }) {
  const w = P;
  P = c;
  const u = await ie(t, false), _ = e === "enter" ? $e(g, u, t, e) : ot({ url: t, type: e, delta: n == null ? void 0 : n.delta, intent: u, event: h });
  if (!_) {
    f(), P === c && (P = w);
    return;
  }
  const m = y, p = R;
  l(), Y = true, te && _.navigation.type !== "enter" && I.navigating.set(F.current = _.navigation);
  let d = u && await rt(u);
  if (!d) {
    if (se(t, x, v.hash)) return await W(t, s);
    d = await st(t, { id: null }, await z(new be(404, "Not Found", `Not found: ${t.pathname}`), { url: t, params: {}, route: { id: null } }), 404, s);
  }
  if (t = (u == null ? void 0 : u.url) || t, P !== c) return _.reject(new Error("navigation aborted")), false;
  if (d.type === "redirect") {
    if (i < 20) {
      await q({ type: e, url: new URL(d.location, t), popped: n, keepfocus: a, noscroll: r, replace_state: s, state: o, redirect_count: i + 1, nav_token: c }), _.fulfil(void 0);
      return;
    }
    d = await Te({ status: 500, error: await z(new Error("Redirect loop"), { url: t, params: {}, route: { id: null } }), url: t, route: { id: null } });
  } else d.props.page.status >= 400 && await I.updated.check() && (await Je(), await W(t, s));
  if (Ct(), Re(m), tt(p), d.props.page.url.pathname !== t.pathname && (t.pathname = d.props.page.url.pathname), o = n ? n.state : o, !n) {
    const b = s ? 0 : 1, j = { [D]: y += b, [M]: R += b, [Fe]: o };
    (s ? history.replaceState : history.pushState).call(history, j, "", t), s || Ot(y, R);
  }
  const S = u && (A == null ? void 0 : A.id) === u.id ? A.fork : null;
  A = null, d.props.page.state = o;
  let E;
  if (te) {
    const b = (await Promise.all(Array.from(Pt, ($) => $(_.navigation)))).filter(($) => typeof $ == "function");
    if (b.length > 0) {
      let $ = function() {
        b.forEach((ce) => {
          K.delete(ce);
        });
      };
      b.push($), b.forEach((ce) => {
        K.add(ce);
      });
    }
    g = d.state, d.props.page && (d.props.page.url = t);
    const j = S && await S;
    j ? E = j.commit() : (et.$set(d.props), $t(d.props.page), E = void 0), Ze = true;
  } else await at(d, _e, false);
  const { activeElement: T } = document;
  await E, await J(), await J();
  let L = n ? n.scroll : r ? oe() : null;
  if (De) {
    const b = t.hash && document.getElementById(it(t));
    if (L) scrollTo(L.x, L.y);
    else if (b) {
      b.scrollIntoView();
      const { top: j, left: $ } = b.getBoundingClientRect();
      L = { x: pageXOffset + $, y: pageYOffset + j };
    } else scrollTo(0, 0);
  }
  const ct = document.activeElement !== T && document.activeElement !== document.body;
  !a && !ct && Jt(t, L), De = true, d.props.page && Object.assign(k, d.props.page), Y = false, e === "popstate" && nt(R), _.fulfil(void 0), K.forEach((b) => b(_.navigation)), I.navigating.set(F.current = null);
}
async function st(e, t, n, a, r) {
  return e.origin === Se && e.pathname === location.pathname && !Qe ? await Te({ status: a, error: n, url: e, route: t }) : await W(e, r);
}
function Gt() {
  let e, t, n;
  U.addEventListener("mousemove", (i) => {
    const c = i.target;
    clearTimeout(e), e = setTimeout(() => {
      s(c, O.hover);
    }, 20);
  });
  function a(i) {
    i.defaultPrevented || s(i.composedPath()[0], O.tap);
  }
  U.addEventListener("mousedown", a), U.addEventListener("touchstart", a, { passive: true });
  const r = new IntersectionObserver((i) => {
    for (const c of i) c.isIntersecting && (de(new URL(c.target.href)), r.unobserve(c.target));
  }, { threshold: 0 });
  async function s(i, c) {
    const l = Ye(i, U), f = l === t && c >= n;
    if (!l || f) return;
    const { url: h, external: w, download: u } = he(l, x, v.hash);
    if (w || u) return;
    const _ = X(l), m = h && re(g.url) === re(h);
    if (!(_.reload || m)) if (c <= _.preload_data) {
      t = l, n = O.tap;
      const p = await ie(h, false);
      if (!p) return;
      Nt(p);
    } else c <= _.preload_code && (t = l, n = c, de(h));
  }
  function o() {
    r.disconnect();
    for (const i of U.querySelectorAll("a")) {
      const { url: c, external: l, download: f } = he(i, x, v.hash);
      if (l || f) continue;
      const h = X(i);
      h.reload || (h.preload_code === O.viewport && r.observe(i), h.preload_code === O.eager && de(c));
    }
  }
  K.add(o), o();
}
function z(e, t) {
  if (e instanceof ve) return e.body;
  const n = Ee(e), a = Ut(e);
  return v.hooks.handleError({ error: e, event: t, status: n, message: a }) ?? { message: a };
}
function Wt(e) {
  if (typeof e == "function") Z.push(e);
  else {
    const { href: t } = new URL(e, location.href);
    Z.push((n) => n.href === t);
  }
}
function Yt() {
  var _a2;
  history.scrollRestoration = "manual", addEventListener("beforeunload", (t) => {
    let n = false;
    if (Ve(), !Y) {
      const a = $e(g, void 0, null, "leave"), r = { ...a.navigation, cancel: () => {
        n = true, a.reject(new Error("navigation cancelled"));
      } };
      Xe.forEach((s) => s(r));
    }
    n ? (t.preventDefault(), t.returnValue = "") : history.scrollRestoration = "auto";
  }), addEventListener("visibilitychange", () => {
    document.visibilityState === "hidden" && Ve();
  }), ((_a2 = navigator.connection) == null ? void 0 : _a2.saveData) || Gt(), U.addEventListener("click", async (t) => {
    if (t.button || t.which !== 1 || t.metaKey || t.ctrlKey || t.shiftKey || t.altKey || t.defaultPrevented) return;
    const n = Ye(t.composedPath()[0], U);
    if (!n) return;
    const { url: a, external: r, target: s, download: o } = he(n, x, v.hash);
    if (!a) return;
    if (s === "_parent" || s === "_top") {
      if (window.parent !== window) return;
    } else if (s && s !== "_self") return;
    const i = X(n);
    if (!(n instanceof SVGAElement) && a.protocol !== location.protocol && !(a.protocol === "https:" || a.protocol === "http:") || o) return;
    const [l, f] = (v.hash ? a.hash.replace(/^#/, "") : a.href).split("#"), h = l === le(location);
    if (r || i.reload && (!h || !f)) {
      ot({ url: a, type: "link", event: t }) ? Y = true : t.preventDefault();
      return;
    }
    if (f !== void 0 && h) {
      const [, w] = g.url.href.split("#");
      if (w === f) {
        if (t.preventDefault(), f === "" || f === "top" && n.ownerDocument.getElementById("top") === null) scrollTo({ top: 0 });
        else {
          const u = n.ownerDocument.getElementById(decodeURIComponent(f));
          u && (u.scrollIntoView(), u.focus());
        }
        return;
      }
      if (V = true, Re(y), e(a), !i.replace_state) return;
      V = false;
    }
    t.preventDefault(), await new Promise((w) => {
      requestAnimationFrame(() => {
        setTimeout(w, 0);
      }), setTimeout(w, 100);
    }), await q({ type: "link", url: a, keepfocus: i.keepfocus, noscroll: i.noscroll, replace_state: i.replace_state ?? a.href === location.href, event: t });
  }), U.addEventListener("submit", (t) => {
    if (t.defaultPrevented) return;
    const n = HTMLFormElement.prototype.cloneNode.call(t.target), a = t.submitter;
    if (((a == null ? void 0 : a.formTarget) || n.target) === "_blank" || ((a == null ? void 0 : a.formMethod) || n.method) !== "get") return;
    const o = new URL((a == null ? void 0 : a.hasAttribute("formaction")) && (a == null ? void 0 : a.formAction) || n.action);
    if (se(o, x, false)) return;
    const i = t.target, c = X(i);
    if (c.reload) return;
    t.preventDefault(), t.stopPropagation();
    const l = new FormData(i, a);
    o.search = new URLSearchParams(l).toString(), q({ type: "form", url: o, keepfocus: c.keepfocus, noscroll: c.noscroll, replace_state: c.replace_state ?? o.href === location.href, event: t });
  }), addEventListener("popstate", async (t) => {
    var _a3;
    if (!me) {
      if ((_a3 = t.state) == null ? void 0 : _a3[D]) {
        const n = t.state[D];
        if (P = {}, n === y) return;
        const a = C[n], r = t.state[Fe] ?? {}, s = new URL(t.state[Rt] ?? location.href), o = t.state[M], i = g.url ? le(location) === le(g.url) : false;
        if (o === R && (Ze || i)) {
          r !== k.state && (k.state = r), e(s), C[y] = oe(), a && scrollTo(a.x, a.y), y = n;
          return;
        }
        const l = n - y;
        await q({ type: "popstate", url: s, popped: { state: r, scroll: a, delta: l }, accept: () => {
          y = n, R = o;
        }, block: () => {
          history.go(-l);
        }, nav_token: P, event: t });
      } else if (!V) {
        const n = new URL(location.href);
        e(n), v.hash && location.reload();
      }
    }
  }), addEventListener("hashchange", () => {
    V && (V = false, history.replaceState({ ...history.state, [D]: ++y, [M]: R }, "", location.href));
  });
  for (const t of document.querySelectorAll("link")) It.has(t.rel) && (t.href = t.href);
  addEventListener("pageshow", (t) => {
    t.persisted && I.navigating.set(F.current = null);
  });
  function e(t) {
    g.url = k.url = t, I.page.set(Ie(k)), I.page.notify();
  }
}
async function zt(e, { status: t = 200, error: n, node_ids: a, params: r, route: s, server_route: o, data: i, form: c }) {
  Qe = true;
  const l = new URL(location.href);
  let f;
  ({ params: r = {}, route: s = { id: null } } = await ie(l, false) || {}), f = xe.find(({ id: u }) => u === s.id);
  let h, w = true;
  try {
    const u = a.map(async (m, p) => {
      const d = i[p];
      return (d == null ? void 0 : d.uses) && (d.uses = Ht(d.uses)), Le({ loader: v.nodes[m], url: l, params: r, route: s, parent: async () => {
        const S = {};
        for (let E = 0; E < p; E += 1) Object.assign(S, (await u[E]).data);
        return S;
      }, server_data_node: Ue(d) });
    }), _ = await Promise.all(u);
    if (f) {
      const m = f.layouts;
      for (let p = 0; p < m.length; p++) m[p] || _.splice(p, 0, void 0);
    }
    h = ae({ url: l, params: r, branch: _, status: t, error: n, form: c, route: f ?? null });
  } catch (u) {
    if (u instanceof ye) {
      await W(new URL(u.location, location.href));
      return;
    }
    h = await Te({ status: Ee(u), error: await z(u, { url: l, params: r, route: s }), url: l, route: s }), e.textContent = "", w = false;
  }
  h.props.page && (h.props.page.state = {}), await at(h, e, w);
}
function Ht(e) {
  return { dependencies: new Set((e == null ? void 0 : e.dependencies) ?? []), params: new Set((e == null ? void 0 : e.params) ?? []), parent: !!(e == null ? void 0 : e.parent), route: !!(e == null ? void 0 : e.route), url: !!(e == null ? void 0 : e.url), search_params: new Set((e == null ? void 0 : e.search_params) ?? []) };
}
let me = false;
function Jt(e, t = null) {
  const n = document.querySelector("[autofocus]");
  if (n) n.focus();
  else {
    const a = it(e);
    if (a && document.getElementById(a)) {
      const { x: s, y: o } = t ?? oe();
      setTimeout(() => {
        const i = history.state;
        me = true, location.replace(`#${a}`), v.hash && location.replace(e.hash), history.replaceState(i, "", e.hash), scrollTo(s, o), me = false;
      });
    } else {
      const s = document.body, o = s.getAttribute("tabindex");
      s.tabIndex = -1, s.focus({ preventScroll: true, focusVisible: false }), o !== null ? s.setAttribute("tabindex", o) : s.removeAttribute("tabindex");
    }
    const r = getSelection();
    if (r && r.type !== "None") {
      const s = [];
      for (let o = 0; o < r.rangeCount; o += 1) s.push(r.getRangeAt(o));
      setTimeout(() => {
        if (r.rangeCount === s.length) {
          for (let o = 0; o < r.rangeCount; o += 1) {
            const i = s[o], c = r.getRangeAt(o);
            if (i.commonAncestorContainer !== c.commonAncestorContainer || i.startContainer !== c.startContainer || i.endContainer !== c.endContainer || i.startOffset !== c.startOffset || i.endOffset !== c.endOffset) return;
          }
          r.removeAllRanges();
        }
      });
    }
  }
}
function $e(e, t, n, a) {
  var _a2, _b2;
  let r, s;
  const o = new Promise((c, l) => {
    r = c, s = l;
  });
  return o.catch(() => {
  }), { navigation: { from: { params: e.params, route: { id: ((_a2 = e.route) == null ? void 0 : _a2.id) ?? null }, url: e.url }, to: n && { params: (t == null ? void 0 : t.params) ?? null, route: { id: ((_b2 = t == null ? void 0 : t.route) == null ? void 0 : _b2.id) ?? null }, url: n }, willUnload: !t, type: a, complete: o }, fulfil: r, reject: s };
}
function Ie(e) {
  return { data: e.data, error: e.error, form: e.form, params: e.params, route: e.route, state: e.state, status: e.status, url: e.url };
}
function Xt(e) {
  const t = new URL(e);
  return t.hash = decodeURIComponent(e.hash), t;
}
function it(e) {
  let t;
  if (v.hash) {
    const [, , n] = e.hash.split("#", 3);
    t = n ?? "";
  } else t = e.hash.slice(1);
  return decodeURIComponent(t);
}
export {
  rn as a,
  en as l,
  I as s
};
