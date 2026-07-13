/**
 * Module: Balance Annual Period Contract
 * Purpose: Defines the DOM- and persistence-free contract for one completed calendar year.
 * Usage: Slice 03 consumes these pure functions before starting annual workflow mutations.
 * Dependencies: None
 */
"use strict";

export const ANNUAL_PERIOD_SCHEMA_VERSION = 1;

export const ANNUAL_PERIOD_STATUS = Object.freeze({
    READY: 'ready',
    ALREADY_COMMITTED: 'already_committed',
    INCOMPLETE_RECOVERY: 'incomplete_recovery',
    LEGACY_CONFIRMATION_REQUIRED: 'legacy_confirmation_required',
    INVALID: 'invalid'
});

export const LEGACY_PERIOD_DECISION = Object.freeze({
    NOT_COMMITTED: 'not_committed',
    ALREADY_COMMITTED: 'already_committed',
    CANCEL: 'cancel'
});

const PERIOD_PREFIX = 'calendar-year:';
const COMMIT_PHASES = new Set(['snapshot_confirmed', 'writes_started', 'validating']);

function error(code, field, message) {
    return { code, field, message };
}

function invalidResult(errors, periodId = null) {
    return {
        status: ANNUAL_PERIOD_STATUS.INVALID,
        periodId,
        errors
    };
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidYear(value) {
    return Number.isInteger(value) && value >= 1900 && value <= 9999;
}

function isValidPeriodId(value) {
    if (typeof value !== 'string' || !value.startsWith(PERIOD_PREFIX)) return false;
    const year = Number(value.slice(PERIOD_PREFIX.length));
    return isValidYear(year) && value === `${PERIOD_PREFIX}${year}`;
}

function cloneMetadata(metadata) {
    return {
        schemaVersion: metadata.schemaVersion,
        lastCommittedPeriod: metadata.lastCommittedPeriod,
        pendingCommit: metadata.pendingCommit
            ? { ...metadata.pendingCommit }
            : null
    };
}

function validateMetadata(metadata) {
    const errors = [];
    if (!isPlainObject(metadata)) {
        return [error(
            'ANNUAL_PERIOD_METADATA_INVALID',
            'metadata',
            'Jahresperioden-Metadaten muessen ein Objekt sein.'
        )];
    }
    if (metadata.schemaVersion !== ANNUAL_PERIOD_SCHEMA_VERSION) {
        errors.push(error(
            'ANNUAL_PERIOD_SCHEMA_UNSUPPORTED',
            'metadata.schemaVersion',
            `Jahresperioden-Schema ${ANNUAL_PERIOD_SCHEMA_VERSION} wird benoetigt.`
        ));
    }
    if (metadata.lastCommittedPeriod !== null && !isValidPeriodId(metadata.lastCommittedPeriod)) {
        errors.push(error(
            'ANNUAL_PERIOD_LAST_COMMITTED_INVALID',
            'metadata.lastCommittedPeriod',
            'Die zuletzt abgeschlossene Jahresperiode ist ungueltig.'
        ));
    }
    if (metadata.pendingCommit !== null) {
        if (!isPlainObject(metadata.pendingCommit)) {
            errors.push(error(
                'ANNUAL_PERIOD_PENDING_COMMIT_INVALID',
                'metadata.pendingCommit',
                'Der Recovery-Eintrag muss ein Objekt oder null sein.'
            ));
        } else {
            if (!isValidPeriodId(metadata.pendingCommit.periodId)) {
                errors.push(error(
                    'ANNUAL_PERIOD_PENDING_ID_INVALID',
                    'metadata.pendingCommit.periodId',
                    'Die Recovery-Periode ist ungueltig.'
                ));
            }
            if (!COMMIT_PHASES.has(metadata.pendingCommit.phase)) {
                errors.push(error(
                    'ANNUAL_PERIOD_PENDING_PHASE_INVALID',
                    'metadata.pendingCommit.phase',
                    'Die Recovery-Phase ist ungueltig.'
                ));
            }
            if (
                typeof metadata.pendingCommit.snapshotId !== 'string' ||
                metadata.pendingCommit.snapshotId.trim() === ''
            ) {
                errors.push(error(
                    'ANNUAL_PERIOD_SNAPSHOT_ID_INVALID',
                    'metadata.pendingCommit.snapshotId',
                    'Ein bestaetigter Recovery-Snapshot wird benoetigt.'
                ));
            }
        }
    }
    return errors;
}

export function createAnnualPeriodId(targetYear) {
    return isValidYear(targetYear) ? `${PERIOD_PREFIX}${targetYear}` : null;
}

export function deriveCompletedCalendarYear(referenceDate) {
    if (!(referenceDate instanceof Date) || !Number.isFinite(referenceDate.getTime())) return null;
    return referenceDate.getFullYear() - 1;
}

export function createAnnualPeriodMetadata({ lastCommittedPeriod = null } = {}) {
    if (lastCommittedPeriod !== null && !isValidPeriodId(lastCommittedPeriod)) return null;
    return {
        schemaVersion: ANNUAL_PERIOD_SCHEMA_VERSION,
        lastCommittedPeriod,
        pendingCommit: null
    };
}

export function preflightAnnualPeriod({ targetYear, currentAge, metadata } = {}) {
    const errors = [];
    if (!isValidYear(targetYear)) {
        errors.push(error(
            'ANNUAL_PERIOD_TARGET_YEAR_INVALID',
            'targetYear',
            'Das abzuschliessende Kalenderjahr muss zwischen 1900 und 9999 liegen.'
        ));
    }
    if (!Number.isSafeInteger(currentAge) || currentAge < 0) {
        errors.push(error(
            'ANNUAL_PERIOD_CURRENT_AGE_INVALID',
            'currentAge',
            'Das aktuelle Alter muss eine nichtnegative ganze Zahl sein.'
        ));
    }
    const periodId = createAnnualPeriodId(targetYear);
    if (errors.length > 0) return invalidResult(errors, periodId);

    if (metadata === undefined || metadata === null) {
        return {
            status: ANNUAL_PERIOD_STATUS.LEGACY_CONFIRMATION_REQUIRED,
            periodId,
            proposedTargetYear: targetYear,
            errors: [error(
                'ANNUAL_PERIOD_LEGACY_CONFIRMATION_REQUIRED',
                'metadata',
                'Bestehende Daten benoetigen eine einmalige Bestaetigung der Jahresperiode.'
            )]
        };
    }

    const metadataErrors = validateMetadata(metadata);
    if (metadataErrors.length > 0) return invalidResult(metadataErrors, periodId);

    if (metadata.pendingCommit !== null) {
        return {
            status: ANNUAL_PERIOD_STATUS.INCOMPLETE_RECOVERY,
            periodId,
            recovery: { ...metadata.pendingCommit },
            errors: [error(
                'ANNUAL_PERIOD_RECOVERY_REQUIRED',
                'metadata.pendingCommit',
                'Ein unvollstaendiger Jahresabschluss muss zuerst wiederhergestellt oder fortgesetzt werden.'
            )]
        };
    }

    if (metadata.lastCommittedPeriod === periodId) {
        return {
            status: ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED,
            periodId,
            errors: []
        };
    }

    if (
        metadata.lastCommittedPeriod !== null &&
        Number(metadata.lastCommittedPeriod.slice(PERIOD_PREFIX.length)) > targetYear
    ) {
        return invalidResult([error(
            'ANNUAL_PERIOD_BEFORE_LAST_COMMITTED',
            'targetYear',
            'Eine Periode vor dem zuletzt abgeschlossenen Kalenderjahr kann nicht committed werden.'
        )], periodId);
    }

    return {
        status: ANNUAL_PERIOD_STATUS.READY,
        periodId,
        errors: []
    };
}

export function createAnnualPeriodPlan({ targetYear, currentAge, metadata } = {}) {
    const preflight = preflightAnnualPeriod({ targetYear, currentAge, metadata });
    if (preflight.status !== ANNUAL_PERIOD_STATUS.READY) {
        return { ...preflight, plan: null };
    }

    return {
        ...preflight,
        plan: {
            schemaVersion: ANNUAL_PERIOD_SCHEMA_VERSION,
            periodId: preflight.periodId,
            targetYear,
            age: { before: currentAge, after: currentAge + 1 },
            inflation: { year: targetYear },
            marketData: { year: targetYear },
            expenses: { closingYear: targetYear, nextYear: targetYear + 1 },
            steps: ['age', 'inflation', 'market_data', 'expenses_rollover']
        }
    };
}

export function checkAnnualPeriodCommit({ plan, metadata } = {}) {
    if (!isPlainObject(plan)) {
        return {
            ...invalidResult([error(
                'ANNUAL_PERIOD_PLAN_INVALID',
                'plan',
                'Ein gueltiger Jahresperiodenplan wird benoetigt.'
            )]),
            canCommit: false
        };
    }

    const expectedPeriodId = createAnnualPeriodId(plan.targetYear);
    if (
        plan.schemaVersion !== ANNUAL_PERIOD_SCHEMA_VERSION ||
        plan.periodId !== expectedPeriodId ||
        !Number.isInteger(plan.age?.before) ||
        plan.age?.after !== plan.age.before + 1 ||
        plan.inflation?.year !== plan.targetYear ||
        plan.marketData?.year !== plan.targetYear ||
        plan.expenses?.closingYear !== plan.targetYear ||
        plan.expenses?.nextYear !== plan.targetYear + 1 ||
        !Array.isArray(plan.steps) ||
        plan.steps.join('|') !== 'age|inflation|market_data|expenses_rollover'
    ) {
        return {
            ...invalidResult([error(
                'ANNUAL_PERIOD_PLAN_INVALID',
                'plan',
                'Der Jahresperiodenplan ist inkonsistent oder unvollstaendig.'
            )], expectedPeriodId),
            canCommit: false
        };
    }

    const preflight = preflightAnnualPeriod({
        targetYear: plan.targetYear,
        currentAge: plan.age.before,
        metadata
    });
    return {
        ...preflight,
        canCommit: preflight.status === ANNUAL_PERIOD_STATUS.READY
    };
}

export function startAnnualPeriodCommit({ plan, metadata, snapshotId } = {}) {
    const commitCheck = checkAnnualPeriodCommit({ plan, metadata });
    if (!commitCheck.canCommit) return { ...commitCheck, metadata: null };
    if (typeof snapshotId !== 'string' || snapshotId.trim() === '') {
        return {
            ...invalidResult([error(
                'ANNUAL_PERIOD_SNAPSHOT_ID_INVALID',
                'snapshotId',
                'Ein bestaetigter Recovery-Snapshot wird vor dem Commit benoetigt.'
            )], plan.periodId),
            canCommit: false,
            metadata: null
        };
    }

    const nextMetadata = cloneMetadata(metadata);
    nextMetadata.pendingCommit = {
        periodId: plan.periodId,
        phase: 'snapshot_confirmed',
        snapshotId: snapshotId.trim()
    };
    return {
        status: ANNUAL_PERIOD_STATUS.INCOMPLETE_RECOVERY,
        periodId: plan.periodId,
        canCommit: true,
        metadata: nextMetadata,
        errors: []
    };
}

export function completeAnnualPeriodCommit({ periodId, metadata } = {}) {
    const metadataErrors = validateMetadata(metadata);
    if (metadataErrors.length > 0) return { ...invalidResult(metadataErrors, periodId), metadata: null };
    if (!isValidPeriodId(periodId) || metadata.pendingCommit?.periodId !== periodId) {
        return {
            ...invalidResult([error(
                'ANNUAL_PERIOD_COMMIT_MISMATCH',
                'periodId',
                'Die abzuschliessende Periode stimmt nicht mit dem laufenden Commit ueberein.'
            )], isValidPeriodId(periodId) ? periodId : null),
            metadata: null
        };
    }

    const nextMetadata = cloneMetadata(metadata);
    nextMetadata.lastCommittedPeriod = periodId;
    nextMetadata.pendingCommit = null;
    return {
        status: ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED,
        periodId,
        metadata: nextMetadata,
        errors: []
    };
}

export function resolveLegacyAnnualPeriod({ metadata, targetYear, decision } = {}) {
    const periodId = createAnnualPeriodId(targetYear);
    if (!periodId) {
        return { ...invalidResult([error(
            'ANNUAL_PERIOD_TARGET_YEAR_INVALID',
            'targetYear',
            'Das bestaetigte Kalenderjahr ist ungueltig.'
        )]), metadata: null };
    }
    if (metadata !== undefined && metadata !== null) {
        return { ...invalidResult([error(
            'ANNUAL_PERIOD_LEGACY_STATE_EXPECTED',
            'metadata',
            'Die Legacy-Bestaetigung ist nur ohne vorhandene Jahresperioden-Metadaten zulaessig.'
        )], periodId), metadata: null };
    }
    if (decision === LEGACY_PERIOD_DECISION.CANCEL) {
        return {
            status: ANNUAL_PERIOD_STATUS.LEGACY_CONFIRMATION_REQUIRED,
            periodId,
            metadata: null,
            errors: []
        };
    }
    if (
        decision !== LEGACY_PERIOD_DECISION.NOT_COMMITTED &&
        decision !== LEGACY_PERIOD_DECISION.ALREADY_COMMITTED
    ) {
        return { ...invalidResult([error(
            'ANNUAL_PERIOD_LEGACY_DECISION_INVALID',
            'decision',
            'Die Legacy-Entscheidung ist ungueltig.'
        )], periodId), metadata: null };
    }

    const nextMetadata = createAnnualPeriodMetadata({
        lastCommittedPeriod: decision === LEGACY_PERIOD_DECISION.ALREADY_COMMITTED
            ? periodId
            : null
    });
    return {
        status: decision === LEGACY_PERIOD_DECISION.ALREADY_COMMITTED
            ? ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED
            : ANNUAL_PERIOD_STATUS.READY,
        periodId,
        metadata: nextMetadata,
        errors: []
    };
}
