import { CONFIG } from '../config.mjs';
import { smoothstep } from './spending-policy-helpers.mjs';

export function calculateWealthAdjustedReductionFactor(params) {
    const cfg = CONFIG.SPENDING_MODEL?.WEALTH_ADJUSTED_REDUCTION;
    if (!cfg) return { factor: 1, entnahmequoteUsed: null };
    const safeRate = Number(cfg.SAFE_WITHDRAWAL_RATE);
    const fullRate = Number(cfg.FULL_WITHDRAWAL_RATE);
    if (!Number.isFinite(safeRate) || !Number.isFinite(fullRate) || fullRate <= safeRate) {
        return { factor: 1, entnahmequoteUsed: null };
    }

    const inflatedBedarf = params?.inflatedBedarf || {};
    const floor = Math.max(0, Number(inflatedBedarf.floor) || 0);
    const flex = Math.max(0, Number(inflatedBedarf.flex) || 0);
    const renteJahr = Math.max(0, Number(params?.renteJahr) || 0);
    const maxEntnahme = Math.max(0, floor + flex - renteJahr);
    const depotwertGesamt = Math.max(0, Number(params?.depotwertGesamt) || 0);
    const lastState = params?.lastState || {};
    const lastEntnahmeReal = Number.isFinite(lastState.lastEntnahmeReal)
        ? Math.max(0, lastState.lastEntnahmeReal)
        : null;
    const inflationFactor = Number.isFinite(lastState.cumulativeInflationFactor)
        ? Math.max(1e-9, lastState.cumulativeInflationFactor)
        : 1;
    const depotwertReal = depotwertGesamt / inflationFactor;

    let entnahmequoteUsed = null;
    if (lastEntnahmeReal !== null && depotwertReal > 0) {
        entnahmequoteUsed = lastEntnahmeReal / depotwertReal;
    } else if (depotwertGesamt > 0) {
        entnahmequoteUsed = maxEntnahme / depotwertGesamt;
    } else {
        entnahmequoteUsed = 1;
    }

    const linearT = (entnahmequoteUsed - safeRate) / (fullRate - safeRate);
    return { factor: smoothstep(linearT), entnahmequoteUsed };
}
