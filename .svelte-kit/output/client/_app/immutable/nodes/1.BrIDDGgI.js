import { s as E, n as b, d as S } from "../chunks/CArxwV3n.js";
import { S as x, i as j, d as p, s as _, b as u, c as d, e as f, f as g, g as h, h as k, j as v, k as $, l as q } from "../chunks/DK8bGZiz.js";
import { s as y } from "../chunks/BKuRRfIk.js";
const C = () => {
  const s = y;
  return { page: { subscribe: s.page.subscribe }, navigating: { subscribe: s.navigating.subscribe }, updated: s.updated };
}, H = { subscribe(s) {
  return C().page.subscribe(s);
} };
function P(s) {
  var _a;
  let t, r = s[0].status + "", o, n, i, c = ((_a = s[0].error) == null ? void 0 : _a.message) + "", l;
  return { c() {
    t = v("h1"), o = $(r), n = q(), i = v("p"), l = $(c);
  }, l(e) {
    t = f(e, "H1", {});
    var a = g(t);
    o = h(a, r), a.forEach(p), n = k(e), i = f(e, "P", {});
    var m = g(i);
    l = h(m, c), m.forEach(p);
  }, m(e, a) {
    u(e, t, a), d(t, o), u(e, n, a), u(e, i, a), d(i, l);
  }, p(e, [a]) {
    var _a2;
    a & 1 && r !== (r = e[0].status + "") && _(o, r), a & 1 && c !== (c = ((_a2 = e[0].error) == null ? void 0 : _a2.message) + "") && _(l, c);
  }, i: b, o: b, d(e) {
    e && (p(t), p(n), p(i));
  } };
}
function w(s, t, r) {
  let o;
  return S(s, H, (n) => r(0, o = n)), [o];
}
let D = class extends x {
  constructor(t) {
    super(), j(this, t, w, P, E, {});
  }
};
export {
  D as component
};
