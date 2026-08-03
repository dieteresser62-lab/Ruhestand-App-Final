"use strict";

import { validateTailRiskHorizonCompatibility } from './tail-risk-contract.js';
import {
    LIQUIDITY_RUNWAY_CONTRACT_V1,
    isValidLiquidityRunwayYears,
    resolveLiquidityRunwayYears
} from '../../types/liquidity-runway-contract.js';

export class SimulatorValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'SimulatorValidationError';
        this.errors = Array.isArray(errors) ? errors : [];
    }
}

export function validateSimulatorInputs(inputs = {}) {
    const errors = [];
    const minimumFlexAnnualInput = inputs.minimumFlexAnnual;
    const minimumFlexAnnualMissing = minimumFlexAnnualInput == null || minimumFlexAnnualInput === '';
    let minimumFlexAnnual = 0;
    if (!minimumFlexAnnualMissing) {
        try {
            minimumFlexAnnual = Number(minimumFlexAnnualInput);
        } catch {
            minimumFlexAnnual = Number.NaN;
        }
    }
    const startFlexBedarfRaw = Number(inputs.startFlexBedarf);
    const startFlexBedarf = Number.isFinite(startFlexBedarfRaw) ? startFlexBedarfRaw : 0;
    const liquidityRunwayYears = resolveLiquidityRunwayYears(inputs).years;

    if (!Number.isFinite(minimumFlexAnnual)) {
        errors.push({ fieldId: 'minimumFlexAnnual', message: 'Mindest-Flex p.a. muss eine gueltige Zahl sein.' });
    } else if (minimumFlexAnnual < 0) {
        errors.push({ fieldId: 'minimumFlexAnnual', message: 'Mindest-Flex p.a. darf nicht negativ sein.' });
    }
    if (Number.isFinite(minimumFlexAnnual) && minimumFlexAnnual > startFlexBedarf) {
        errors.push(
            { fieldId: 'minimumFlexAnnual', message: 'Mindest-Flex p.a. darf nicht größer als Flex-Bedarf p.a. sein.' },
            { fieldId: 'startFlexBedarf', message: 'Flex-Bedarf p.a. ist die Obergrenze für Mindest-Flex.' }
        );
    }
    if (
        !Number.isFinite(liquidityRunwayYears)
        || liquidityRunwayYears < LIQUIDITY_RUNWAY_CONTRACT_V1.minimumYears
        || liquidityRunwayYears > LIQUIDITY_RUNWAY_CONTRACT_V1.maximumYears
        || !isValidLiquidityRunwayYears(liquidityRunwayYears)
    ) {
        errors.push({
            fieldId: 'liquidityRunwayYears',
            message: `Liquiditäts-Runway muss zwischen ${LIQUIDITY_RUNWAY_CONTRACT_V1.minimumYears} und ${LIQUIDITY_RUNWAY_CONTRACT_V1.maximumYears} Jahren in ${LIQUIDITY_RUNWAY_CONTRACT_V1.stepYears}-Jahres-Schritten liegen.`
        });
    }

    const tailRiskValidation = validateTailRiskHorizonCompatibility(inputs, inputs.tailRiskHorizonYears);
    const tailRiskInputErrors = Array.isArray(inputs.tailRiskValidationErrors)
        ? inputs.tailRiskValidationErrors
        : [];
    if (!tailRiskValidation.valid) {
        for (const error of tailRiskValidation.errors) {
            errors.push({
                fieldId: error.fieldId,
                message: error.message || 'Ungueltiger Tail-Risk-Parameter.'
            });
        }
    }
    if (tailRiskInputErrors.length > 0) {
        for (const error of tailRiskInputErrors) {
            const alreadyReported = errors.some(existing => existing.fieldId === error.fieldId && existing.message === error.message);
            if (!alreadyReported) {
                errors.push({
                    fieldId: error.fieldId,
                    message: error.message || 'Ungueltiger Tail-Risk-Parameter.'
                });
            }
        }
    }

    if (errors.length > 0) {
        const first = errors[0];
        throw new SimulatorValidationError(
            first?.message || 'Ungueltige Simulator-Eingaben.',
            errors
        );
    }

    return inputs;
}

export const SIMULATOR_CONTRACT_ERROR_MESSAGES_DE = Object.freeze({
    SIMULATOR_STRESS_PRESET_UNKNOWN: 'Unbekanntes Stressszenario: Das gespeicherte Preset ist nicht mehr verfügbar. Öffnen Sie das Profil, wählen Sie ein vorhandenes Stressszenario und speichern Sie erneut.',
    SIMULATOR_STRESS_POOL_EMPTY: 'Historisches Stressszenario nicht ausführbar: Der zugehörige historische Rohpool ist leer. Wählen Sie ein synthetisches Stressszenario oder prüfen Sie den Datenbestand.',
    SIMULATOR_STRESS_SEQUENCE_INVALID: 'Stresssequenz unvollständig: Für mindestens ein Stressjahr fehlt eine gültige Rendite. Wählen Sie ein anderes Szenario oder prüfen Sie den Presetvertrag.',
    SIMULATOR_STRESS_INPUT_INVALID: 'Stressberechnung abgebrochen: Rendite-, Inflations- oder Golddaten sind ungültig. Prüfen Sie den historischen Datenbestand.',
    SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY: 'Historisches Stressszenario nicht ausführbar: Unter dem aktiven Startjahrfilter gibt es keine geeigneten Jahre. Setzen Sie die Grenze früher, erlauben Sie geschätzte Jahre oder wählen Sie ein synthetisches Stressszenario.',
    SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL: 'Historisches Stressszenario nicht belastbar: Unter dem aktiven Startjahrfilter bleiben zu wenige unterschiedliche Jahre. Setzen Sie die Grenze früher, erlauben Sie geschätzte Jahre oder wählen Sie ein synthetisches Stressszenario.',
    SIMULATOR_REGIME_INPUT_INVALID: 'Regimeklassifikation nicht möglich: Rendite oder Inflation ist ungültig. Prüfen Sie den historischen Datenbestand.',
    SIMULATOR_REGIME_TRANSITIONS_EMPTY: 'Historischer Regimevertrag unvollständig: Für mindestens ein Marktregime fehlen beobachtete Übergänge. Prüfen und bestätigen Sie die aktualisierte Datenklassifikation.',
    SIMULATOR_REGIME_DISTRIBUTION_DRIFT: 'Historischer Regimevertrag geändert: Die beobachtete Verteilung weicht vom geprüften Datenstand ab. Prüfen und aktualisieren Sie den Regimevertrag vor der Simulation.',
    SIMULATOR_REGIME_TRANSITIONS_INVALID: 'Regime-Sampling nicht möglich: Die Übergangsdaten des aktuellen Marktregimes fehlen oder sind ungültig. Prüfen Sie den Regimevertrag.',
    SIMULATOR_REGIME_TRANSITION_SELECTION_FAILED: 'Regime-Sampling abgebrochen: Die Übergangszähler ergeben keine gültige Auswahl. Prüfen Sie die Transitionsmatrix.',
    MC_SAMPLING_REGIME_POOL_EMPTY: 'Regime-Sampling nicht ausführbar: Der aktive Startjahrfilter enthält nicht alle erreichbaren Marktregime. Setzen Sie die Grenze früher oder wählen Sie eine andere Sampling-Methode.',
    SIMULATOR_REGIME_POOL_EMPTY: 'Regime-Sampling abgebrochen: Im wirksamen Jahresbereich fehlt das gezogene Marktregime. Setzen Sie die Startjahrgrenze früher oder wählen Sie eine andere Sampling-Methode.'
});

export function formatSimulatorValidationError(error) {
    if (error instanceof SimulatorValidationError) return error.message;
    if (error?.code && SIMULATOR_CONTRACT_ERROR_MESSAGES_DE[error.code]) {
        return SIMULATOR_CONTRACT_ERROR_MESSAGES_DE[error.code];
    }
    return error?.message || String(error || 'Unbekannter Validierungsfehler');
}
