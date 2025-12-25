var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { r as h, n as p, i as N, h as A, j as E, k as v, l as C, m as w, p as j, q as b, v as B, w as I, x as L } from "./CArxwV3n.js";
let $ = false;
function q() {
  $ = true;
}
function P() {
  $ = false;
}
function T(e, t, n, i) {
  for (; e < t; ) {
    const l = e + (t - e >> 1);
    n(l) <= i ? e = l + 1 : t = l;
  }
  return e;
}
function D(e) {
  if (e.hydrate_init) return;
  e.hydrate_init = true;
  let t = e.childNodes;
  if (e.nodeName === "HEAD") {
    const r = [];
    for (let s = 0; s < t.length; s++) {
      const o = t[s];
      o.claim_order !== void 0 && r.push(o);
    }
    t = r;
  }
  const n = new Int32Array(t.length + 1), i = new Int32Array(t.length);
  n[0] = -1;
  let l = 0;
  for (let r = 0; r < t.length; r++) {
    const s = t[r].claim_order, o = (l > 0 && t[n[l]].claim_order <= s ? l + 1 : T(1, l, (d) => t[n[d]].claim_order, s)) - 1;
    i[r] = n[o] + 1;
    const f = o + 1;
    n[f] = r, l = Math.max(f, l);
  }
  const u = [], a = [];
  let c = t.length - 1;
  for (let r = n[l] + 1; r != 0; r = i[r - 1]) {
    for (u.push(t[r - 1]); c >= r; c--) a.push(t[c]);
    c--;
  }
  for (; c >= 0; c--) a.push(t[c]);
  u.reverse(), a.sort((r, s) => r.claim_order - s.claim_order);
  for (let r = 0, s = 0; r < a.length; r++) {
    for (; s < u.length && a[r].claim_order >= u[s].claim_order; ) s++;
    const o = s < u.length ? u[s] : null;
    e.insertBefore(a[r], o);
  }
}
function H(e, t) {
  if ($) {
    for (D(e), (e.actual_end_child === void 0 || e.actual_end_child !== null && e.actual_end_child.parentNode !== e) && (e.actual_end_child = e.firstChild); e.actual_end_child !== null && e.actual_end_child.claim_order === void 0; ) e.actual_end_child = e.actual_end_child.nextSibling;
    t !== e.actual_end_child ? (t.claim_order !== void 0 || t.parentNode !== e) && e.insertBefore(t, e.actual_end_child) : e.actual_end_child = t.nextSibling;
  } else (t.parentNode !== e || t.nextSibling !== null) && e.appendChild(t);
}
function X(e, t, n) {
  $ && !n ? H(e, t) : (t.parentNode !== e || t.nextSibling != n) && e.insertBefore(t, n || null);
}
function M(e) {
  e.parentNode && e.parentNode.removeChild(e);
}
function Y(e, t) {
  for (let n = 0; n < e.length; n += 1) e[n] && e[n].d(t);
}
function O(e) {
  return document.createElement(e);
}
function y(e) {
  return document.createTextNode(e);
}
function Z() {
  return y(" ");
}
function k() {
  return y("");
}
function ee(e, t, n, i) {
  return e.addEventListener(t, n, i), () => e.removeEventListener(t, n, i);
}
function te(e, t, n) {
  n == null ? e.removeAttribute(t) : e.getAttribute(t) !== n && e.setAttribute(t, n);
}
function ne(e) {
  return e.dataset.svelteH;
}
function ie(e) {
  return e === "" ? null : +e;
}
function z(e) {
  return Array.from(e.childNodes);
}
function F(e) {
  e.claim_info === void 0 && (e.claim_info = { last_index: 0, total_claimed: 0 });
}
function S(e, t, n, i, l = false) {
  F(e);
  const u = (() => {
    for (let a = e.claim_info.last_index; a < e.length; a++) {
      const c = e[a];
      if (t(c)) {
        const r = n(c);
        return r === void 0 ? e.splice(a, 1) : e[a] = r, l || (e.claim_info.last_index = a), c;
      }
    }
    for (let a = e.claim_info.last_index - 1; a >= 0; a--) {
      const c = e[a];
      if (t(c)) {
        const r = n(c);
        return r === void 0 ? e.splice(a, 1) : e[a] = r, l ? r === void 0 && e.claim_info.last_index-- : e.claim_info.last_index = a, c;
      }
    }
    return i();
  })();
  return u.claim_order = e.claim_info.total_claimed, e.claim_info.total_claimed += 1, u;
}
function R(e, t, n, i) {
  return S(e, (l) => l.nodeName === t, (l) => {
    const u = [];
    for (let a = 0; a < l.attributes.length; a++) {
      const c = l.attributes[a];
      n[c.name] || u.push(c.name);
    }
    u.forEach((a) => l.removeAttribute(a));
  }, () => i(t));
}
function re(e, t, n) {
  return R(e, t, n, O);
}
function U(e, t) {
  return S(e, (n) => n.nodeType === 3, (n) => {
    const i = "" + t;
    if (n.data.startsWith(i)) {
      if (n.data.length !== i.length) return n.splitText(i.length);
    } else n.data = i;
  }, () => y(t), true);
}
function le(e) {
  return U(e, " ");
}
function se(e, t) {
  t = "" + t, e.data !== t && (e.data = t);
}
function ae(e, t) {
  e.value = t ?? "";
}
function ce(e, t, n, i) {
  n == null ? e.style.removeProperty(t) : e.style.setProperty(t, n, "");
}
function ue(e, t, n) {
  for (let i = 0; i < e.options.length; i += 1) {
    const l = e.options[i];
    if (l.__value === t) {
      l.selected = true;
      return;
    }
  }
  (!n || t !== void 0) && (e.selectedIndex = -1);
}
function fe(e) {
  const t = e.querySelector(":checked");
  return t && t.__value;
}
function oe(e, t, n) {
  e.classList.toggle(t, !!n);
}
function _e(e, t) {
  return new e(t);
}
const m = /* @__PURE__ */ new Set();
let _;
function de() {
  _ = { r: 0, c: [], p: _ };
}
function me() {
  _.r || h(_.c), _ = _.p;
}
function V(e, t) {
  e && e.i && (m.delete(e), e.i(t));
}
function he(e, t, n, i) {
  if (e && e.o) {
    if (m.has(e)) return;
    m.add(e), _.c.push(() => {
      m.delete(e), i && (n && e.d(1), i());
    }), e.o(t);
  } else i && i();
}
function $e(e) {
  e && e.c();
}
function pe(e, t) {
  e && e.l(t);
}
function W(e, t, n) {
  const { fragment: i, after_update: l } = e.$$;
  i && i.m(t, n), b(() => {
    const u = e.$$.on_mount.map(B).filter(N);
    e.$$.on_destroy ? e.$$.on_destroy.push(...u) : h(u), e.$$.on_mount = [];
  }), l.forEach(b);
}
function G(e, t) {
  const n = e.$$;
  n.fragment !== null && (j(n.after_update), h(n.on_destroy), n.fragment && n.fragment.d(t), n.on_destroy = n.fragment = null, n.ctx = []);
}
function J(e, t) {
  e.$$.dirty[0] === -1 && (I.push(e), L(), e.$$.dirty.fill(0)), e.$$.dirty[t / 31 | 0] |= 1 << t % 31;
}
function ye(e, t, n, i, l, u, a = null, c = [-1]) {
  const r = E;
  w(e);
  const s = e.$$ = { fragment: null, ctx: [], props: u, update: p, not_equal: l, bound: v(), on_mount: [], on_destroy: [], on_disconnect: [], before_update: [], after_update: [], context: new Map(t.context || (r ? r.$$.context : [])), callbacks: v(), dirty: c, skip_bound: false, root: t.target || r.$$.root };
  a && a(s.root);
  let o = false;
  if (s.ctx = n ? n(e, t.props || {}, (f, d, ...x) => {
    const g = x.length ? x[0] : d;
    return s.ctx && l(s.ctx[f], s.ctx[f] = g) && (!s.skip_bound && s.bound[f] && s.bound[f](g), o && J(e, f)), d;
  }) : [], s.update(), o = true, h(s.before_update), s.fragment = i ? i(s.ctx) : false, t.target) {
    if (t.hydrate) {
      q();
      const f = z(t.target);
      s.fragment && s.fragment.l(f), f.forEach(M);
    } else s.fragment && s.fragment.c();
    t.intro && V(e.$$.fragment), W(e, t.target, t.anchor), P(), C();
  }
  w(r);
}
class xe {
  constructor() {
    __publicField(this, "$$");
    __publicField(this, "$$set");
  }
  $destroy() {
    G(this, 1), this.$destroy = p;
  }
  $on(t, n) {
    if (!N(n)) return p;
    const i = this.$$.callbacks[t] || (this.$$.callbacks[t] = []);
    return i.push(n), () => {
      const l = i.indexOf(n);
      l !== -1 && i.splice(l, 1);
    };
  }
  $set(t) {
    this.$$set && !A(t) && (this.$$.skip_bound = true, this.$$set(t), this.$$.skip_bound = false);
  }
}
const K = "4";
typeof window < "u" && (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(K);
export {
  ae as A,
  ee as B,
  Y as C,
  oe as D,
  ue as E,
  fe as F,
  xe as S,
  V as a,
  X as b,
  H as c,
  M as d,
  re as e,
  z as f,
  U as g,
  le as h,
  ye as i,
  O as j,
  y as k,
  Z as l,
  de as m,
  me as n,
  k as o,
  _e as p,
  G as q,
  $e as r,
  se as s,
  he as t,
  W as u,
  pe as v,
  te as w,
  ce as x,
  ie as y,
  ne as z
};
