import { _ as o } from "./CmsKOCeN.js";
let a;
let __tla = (async () => {
  let e = null;
  a = async function() {
    if (e) return e;
    try {
      const t = await o(() => import("./CnKu8VUe.js"), [], import.meta.url);
      await t.default(), e = {
        runSimulation: (n) => {
          const r = t.run_simulation_poc(n);
          return {
            ...r,
            ui: JSON.parse(r.ui)
          };
        },
        runBacktest: (n, r) => t.run_backtest_wasm(n, r),
        runMonteCarlo: (n, r) => t.run_monte_carlo_wasm(n, r)
      };
    } catch (t) {
      throw console.error("Failed to load Rust/WASM Engine:", t), t;
    }
    return e;
  };
})();
export {
  __tla,
  a as initRustEngine
};
