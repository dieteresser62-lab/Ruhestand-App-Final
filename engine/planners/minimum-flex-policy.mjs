function clampRate(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
}

function effectiveFlexAmount(flex, rate) {
    return Math.max(0, Number(flex) || 0) * (clampRate(rate) / 100);
}

function evaluateEmergencyBlock(context, minimumFlexAnnual) {
    const inflatedBedarf = context.inflatedBedarf || {};
    const input = context.input || {};
    const profil = context.profil || {};
    const alarmStatus = context.alarmStatus || {};
    const floor = Math.max(0, Number(inflatedBedarf.floor) || 0);
    const flex = Math.max(0, Number(inflatedBedarf.flex) || 0);
    const minimumFlex = Math.min(flex, Math.max(0, Number(minimumFlexAnnual) || 0));
    const floorPlusMinimumFlex = floor + minimumFlex;
    const totalWealthRaw = Number(context.gesamtwert);
    const totalWealth = Number.isFinite(totalWealthRaw) ? Math.max(0, totalWealthRaw) : Infinity;
    const minRunwayMonthsRaw = Number.isFinite(profil.minRunwayMonths)
        ? profil.minRunwayMonths
        : Number(input.runwayMinMonths);
    const minRunwayMonths = Number.isFinite(minRunwayMonthsRaw) && minRunwayMonthsRaw > 0
        ? minRunwayMonthsRaw
        : 0;
    const minRunwayReserve = minRunwayMonths > 0
        ? (floorPlusMinimumFlex / 12) * minRunwayMonths
        : 0;
    const requiredWealthForRunway = floorPlusMinimumFlex + minRunwayReserve;

    if (alarmStatus.active === true) {
        return {
            blocked: true,
            reason: 'alarm_active',
            floorPlusMinimumFlex,
            minRunwayMonths,
            requiredWealthForRunway,
            totalWealth
        };
    }

    if (floorPlusMinimumFlex > 0 && totalWealth + 0.01 < floorPlusMinimumFlex) {
        return {
            blocked: true,
            reason: 'floor_minimum_flex_not_covered',
            floorPlusMinimumFlex,
            minRunwayMonths,
            requiredWealthForRunway,
            totalWealth
        };
    }

    if (minRunwayReserve > 0 && totalWealth + 0.01 < requiredWealthForRunway) {
        return {
            blocked: true,
            reason: 'minimum_runway_not_restorable',
            floorPlusMinimumFlex,
            minRunwayMonths,
            requiredWealthForRunway,
            totalWealth
        };
    }

    return {
        blocked: false,
        reason: null,
        floorPlusMinimumFlex,
        minRunwayMonths,
        requiredWealthForRunway,
        totalWealth
    };
}

export function applyMinimumFlexFloor(flexRate, context = {}, addDecision = () => {}) {
    const inflatedBedarf = context.inflatedBedarf || {};
    const input = context.input || {};
    const alarmStatus = context.alarmStatus || {};
    const flex = Math.max(0, Number(inflatedBedarf.flex) || 0);
    const minimumFlexAnnual = Math.max(0, Number(input.minimumFlexAnnual) || 0);
    const initialRate = clampRate(flexRate);
    const effectiveFlexBefore = effectiveFlexAmount(flex, initialRate);

    const baseResult = {
        rate: initialRate,
        applied: false,
        status: 'inactive_zero',
        requiredRate: 0,
        effectiveFlexBefore,
        effectiveFlexAfter: effectiveFlexBefore,
        blockReason: null
    };

    if (minimumFlexAnnual <= 0) {
        return baseResult;
    }

    if (flex <= 0) {
        return {
            ...baseResult,
            status: 'not_needed',
            blockReason: 'no_open_flex_need'
        };
    }

    const requiredRate = clampRate((minimumFlexAnnual / flex) * 100);
    if (effectiveFlexBefore + 0.01 >= minimumFlexAnnual || initialRate >= requiredRate) {
        return {
            ...baseResult,
            status: 'not_needed',
            requiredRate
        };
    }

    const emergency = evaluateEmergencyBlock(context, minimumFlexAnnual);
    if (emergency.blocked) {
        addDecision(
            'Mindest-Flex blockiert',
            `Mindest-Flex nicht angehoben (${emergency.reason}).`,
            'blocked',
            'warn'
        );
        return {
            ...baseResult,
            status: 'blocked_emergency',
            requiredRate,
            blockReason: emergency.reason,
            emergency
        };
    }

    const rate = Math.max(initialRate, requiredRate);
    const effectiveFlexAfter = effectiveFlexAmount(flex, rate);
    addDecision(
        'Mindest-Flex',
        `Flex-Rate auf ${rate.toFixed(1)}% angehoben, um Mindest-Flex ${minimumFlexAnnual.toFixed(0)}€ p.a. zu erreichen.`,
        'active',
        'guardrail'
    );

    return {
        rate,
        applied: true,
        status: 'applied',
        requiredRate,
        effectiveFlexBefore,
        effectiveFlexAfter,
        blockReason: null,
        emergency
    };
}

export function writeMinimumFlexDiagnostics(state, result, statusOverride = null) {
    if (!state?.keyParams || !result) return;
    state.keyParams.minimumFlexStatus = statusOverride || result.status;
    state.keyParams.minimumFlexBlockReason = result.blockReason || null;
    state.keyParams.minimumFlexRequiredRate = Number.isFinite(result.requiredRate) ? result.requiredRate : 0;
    state.keyParams.minimumFlexEffectiveBefore = Number.isFinite(result.effectiveFlexBefore) ? result.effectiveFlexBefore : 0;
    state.keyParams.minimumFlexEffectiveAfter = Number.isFinite(result.effectiveFlexAfter) ? result.effectiveFlexAfter : 0;
    if (result.emergency) {
        state.keyParams.minimumFlexEmergencyTotalWealth = Number.isFinite(result.emergency.totalWealth)
            ? result.emergency.totalWealth
            : null;
        state.keyParams.minimumFlexEmergencyRequiredWealth = Number.isFinite(result.emergency.requiredWealthForRunway)
            ? result.emergency.requiredWealthForRunway
            : null;
        state.keyParams.minimumFlexEmergencyFloorPlusMinimumFlex = Number.isFinite(result.emergency.floorPlusMinimumFlex)
            ? result.emergency.floorPlusMinimumFlex
            : null;
        state.keyParams.minimumFlexEmergencyMinRunwayMonths = Number.isFinite(result.emergency.minRunwayMonths)
            ? result.emergency.minRunwayMonths
            : null;
    }
}
