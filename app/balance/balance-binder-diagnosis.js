/**
 * Module: Balance Binder Diagnosis
 * Purpose: Handles UI logic related to the Diagnosis Panel.
 *          It generates formatted diagnosis text for the user to copy/paste and formats guardrail/status information.
 * Usage: Used by balance-binder.js for diagnosis-related actions.
 * Dependencies: balance-config.js, balance-utils.js, balance-renderer.js
 */
import { CONFIG } from './balance-config.js';
import { UIUtils } from './balance-utils.js';
import { UIRenderer } from './balance-renderer.js';

export function createDiagnosisHandlers({ dom, appState }) {
    const generateDiagnosisText = (diagnosis) => {
        if (!diagnosis) return "Keine Diagnose-Daten verfügbar.";

        let text = `===== KI-Diagnose für Ruhestand-Balancing =====\n`;
        text += `Version: ${CONFIG.APP.VERSION}\n`;
        text += `Zeitstempel: ${new Date(appState.lastUpdateTimestamp).toLocaleString('de-DE')}\n\n`;
        text += `--- Status-Übersicht ---\n`;
        text += `Marktregime: ${diagnosis.general.marketSzenario}\n`;
        text += `Alarm-Modus: ${diagnosis.general.alarmActive ? 'AKTIV' : 'Inaktiv'}\n`;
        text += `Entnahmequote: ${UIUtils.formatPercentRatio(diagnosis.keyParams.entnahmequoteDepot, { fractionDigits: 2, invalid: 'n/a' })}\n`;
        text += `Realer Drawdown: ${UIUtils.formatPercentRatio(-diagnosis.keyParams.realerDepotDrawdown, { fractionDigits: 1, invalid: 'n/a' })}\n`;
        const formatCoverage = (value) => UIUtils.formatPercentValue(value, { fractionDigits: 0, invalid: 'n/a' });
        const coverageLine = `Liquiditätsdeckung: ${formatCoverage(diagnosis.general.deckungVorher)} → ${formatCoverage(diagnosis.general.deckungNachher)} (Ziel: 100%)`;
        text += `${coverageLine}\n`;
        const runwayMonate = diagnosis.general.runwayMonate;
        const runwayTarget = diagnosis.general.runwayTargetMonate;
        const runwaySourceInfo = UIUtils.describeRunwayTargetSource(diagnosis.general.runwayTargetQuelle);
        const formatRunwayValue = (value, fractionDigits = 1, invalid = '∞') => UIUtils.formatMonths(value, { fractionDigits, invalid, suffix: 'Monate' });
        const runwayLine = `Runway: ${formatRunwayValue(runwayMonate)} (Ziel: ${formatRunwayValue(runwayTarget, 0, 'n/a')}) -> Status: ${(diagnosis.general.runwayStatus || 'unbekannt').toUpperCase()} | Quelle: ${runwaySourceInfo.label}`;
        text += `${runwayLine}\nQuelle-Details: ${runwaySourceInfo.description}\n\n`;
        text += `--- Status-Übersicht ---\n`;
        text += `Marktregime: ${diagnosis.general.marketSzenario}\n`;
        text += `Alarm-Modus: ${diagnosis.general.alarmActive ? 'AKTIV' : 'Inaktiv'}\n`;
        text += `Entnahmequote: ${UIUtils.formatPercentRatio(diagnosis.keyParams.entnahmequoteDepot, { fractionDigits: 2, invalid: 'n/a' })}\n`;
        text += `Realer Drawdown: ${UIUtils.formatPercentRatio(-diagnosis.keyParams.realerDepotDrawdown, { fractionDigits: 1, invalid: 'n/a' })}\n\n`;
        text += `--- Entscheidungsbaum (Warum?) ---\n`;
        diagnosis.decisionTree.forEach(item => {
            if (dom.diagnosis.filterToggle.checked && item.status === 'inactive') return;
            text += `[${item.status === 'active' ? '⚡' : '✓'}] ${item.step}\n   ↳ ${item.impact}\n`;
        });
        text += `\n--- Guardrails ---\n`;
        diagnosis.guardrails.forEach(g => {
            if (dom.diagnosis.filterToggle.checked && g.status === 'ok') return;
            text += `${g.name}: ${g.value} (Schwelle: ${g.threshold}) -> Status: ${g.status.toUpperCase()}\n`;
        });

        const txnDiag = diagnosis.transactionDiagnostics;
        const describeReason = (reason) => {
            const map = {
                none: 'Keine Blockade',
                min_trade: 'Unter Mindestgröße',
                liquidity_sufficient: 'Liquidität ausreichend',
                guardrail_block: 'Guardrail verhindert Verkauf',
                cap_active: 'Cap begrenzt Trade',
                gold_floor: 'Gold-Floor aktiv'
            };
            if (!reason) return map.none;
            return map[reason.toLowerCase()] || reason.replace(/[_-]/g, ' ');
        };
        const determineReasonStatus = (reason, wasTriggered) => {
            const statusMap = {
                none: 'OK',
                min_trade: 'WARN',
                liquidity_sufficient: 'INFO',
                guardrail_block: 'DANGER',
                cap_active: 'WARN',
                gold_floor: 'DANGER'
            };
            return statusMap[reason?.toLowerCase()] || (wasTriggered ? 'OK' : 'INFO');
        };
        const formatThresholdValue = (key, value) => {
            if (typeof value === 'number' && isFinite(value)) {
                if (/pct|percent|quote|rate/i.test(key)) {
                    return UIUtils.formatPercentValue(value, { fractionDigits: 1, invalid: 'n/a' });
                }
                if (/amount|wert|value|eur|euro|betrag|volume|blocked/i.test(key)) {
                    return UIUtils.formatCurrency(value);
                }
                if (/month|monate|runway/i.test(key)) {
                    return UIUtils.formatMonths(value, { fractionDigits: 0, invalid: 'n/a', suffix: 'Monate' });
                }
                return value.toFixed(2);
            }
            return (value ?? 'n/a').toString();
        };
        const appendThresholdBlock = (label, thresholds) => {
            if (!thresholds || typeof thresholds !== 'object' || Object.keys(thresholds).length === 0) {
                text += `${label}: keine Daten\n`;
                return;
            }
            text += `${label}:\n`;
            Object.entries(thresholds).forEach(([key, value]) => {
                text += `  - ${key}: ${formatThresholdValue(key, value)}\n`;
            });
        };

        if (txnDiag) {
            text += `\n--- Transaktionsdiagnostik ---\n`;
            text += `Status: ${determineReasonStatus(txnDiag.blockReason, txnDiag.wasTriggered)} (${describeReason(txnDiag.blockReason)})\n`;
            text += `Ausgelöst: ${txnDiag.wasTriggered ? 'Ja' : 'Nein'}\n`;
            text += `Blockierter Betrag: ${UIUtils.formatCurrency(txnDiag.blockedAmount || 0)}\n`;
            if (txnDiag.blockReason && txnDiag.blockReason !== 'none') {
                text += `Grundcode: ${txnDiag.blockReason}\n`;
            }
            if (txnDiag.potentialTrade && typeof txnDiag.potentialTrade === 'object' && Object.keys(txnDiag.potentialTrade).length > 0) {
                const trade = txnDiag.potentialTrade;
                const tradeParts = [];
                if (trade.direction || trade.kind) {
                    tradeParts.push(trade.direction || trade.kind);
                }
                const tradeValue = [trade.netAmount, trade.netto, trade.amount].find(v => typeof v === 'number' && isFinite(v));
                if (typeof tradeValue === 'number') {
                    tradeParts.push(UIUtils.formatCurrency(tradeValue));
                }
                if (tradeParts.length > 0) {
                    text += `Geplante Aktion: ${tradeParts.join(' / ')}\n`;
                }
            }
            appendThresholdBlock('Aktien-Grenzen', txnDiag.equityThresholds);
            appendThresholdBlock('Gold-Grenzen', txnDiag.goldThresholds);
        }

        text += `\n--- Schlüsselparameter ---\n`;
        text += `Peak (real): ${UIUtils.formatCurrency(diagnosis.keyParams.peakRealVermoegen)}\n`;
        text += `Aktuell (real): ${UIUtils.formatCurrency(diagnosis.keyParams.currentRealVermoegen)}\n`;
        text += `Kumulierte Inflation: ${UIUtils.formatPercentRatio(diagnosis.keyParams.cumulativeInflationFactor - 1, { fractionDigits: 1, prefixPlus: true, invalid: 'n/a' })}\n`;
        if (typeof diagnosis.keyParams.aktuelleFlexRate === 'number') {
            text += `Effektive Flex-Rate: ${UIUtils.formatPercentValue(diagnosis.keyParams.aktuelleFlexRate, { fractionDigits: 1, invalid: 'n/a' })}\n`;
        }
        if (typeof diagnosis.keyParams.minFlexRatePct === 'number') {
            text += `Flex-Min-Rate: ${UIUtils.formatPercentValue(diagnosis.keyParams.minFlexRatePct, { fractionDigits: 1, invalid: 'n/a' })}\n`;
        }
        if (typeof diagnosis.keyParams.kuerzungProzent === 'number') {
            text += `Kürzung ggü. Flex-Bedarf: ${UIUtils.formatPercentValue(diagnosis.keyParams.kuerzungProzent, { fractionDigits: 1, invalid: 'n/a' })}\n`;
        }
        if (typeof diagnosis.keyParams.jahresentnahme === 'number') {
            text += `Jahresentnahme (brutto): ${UIUtils.formatCurrency(diagnosis.keyParams.jahresentnahme)}\n`;
        }
        const vpw = diagnosis.keyParams?.vpw;
        if (vpw && typeof vpw === 'object') {
            text += `\n--- Dynamic Flex (VPW) ---\n`;
            const methodLabel = vpw.horizonMethod === 'mean'
                ? 'Mean'
                : (vpw.horizonMethod === 'survival_quantile' ? 'Survival-Quantil' : (vpw.horizonMethod || 'n/a'));
            const statusLabelMap = {
                active: 'Aktiv',
                disabled: 'Inaktiv',
                contract_ready: 'Bereit (noch nicht aktiv)',
                safety_static_flex: 'Statisch (Safety)'
            };
            text += `Status: ${statusLabelMap[vpw.status] || (vpw.enabled ? 'Aktiv' : 'Inaktiv')}\n`;
            text += `Methode: ${methodLabel}\n`;
            if (typeof vpw.horizonYears === 'number' && isFinite(vpw.horizonYears)) {
                text += `Horizont: ${Math.round(vpw.horizonYears)} Jahre\n`;
            }
            if (typeof vpw.survivalQuantile === 'number' && isFinite(vpw.survivalQuantile)) {
                text += `Survival-Quantil: ${vpw.survivalQuantile.toFixed(2)}\n`;
            }
            if (typeof vpw.vpwRate === 'number' && isFinite(vpw.vpwRate)) {
                text += `VPW-Rate: ${UIUtils.formatPercentValue(vpw.vpwRate * 100, { fractionDigits: 1, invalid: 'n/a' })}\n`;
            }
            if (typeof vpw.expectedRealReturn === 'number' && isFinite(vpw.expectedRealReturn)) {
                text += `ER(real): ${UIUtils.formatPercentValue(vpw.expectedRealReturn * 100, { fractionDigits: 1, invalid: 'n/a' })}\n`;
            }
            if (typeof vpw.expectedReturnCape === 'number' && isFinite(vpw.expectedReturnCape)) {
                text += `ER(CAPE): ${UIUtils.formatPercentValue(vpw.expectedReturnCape * 100, { fractionDigits: 1, invalid: 'n/a' })}\n`;
            }
            if (typeof vpw.capeRatioUsed === 'number' && isFinite(vpw.capeRatioUsed)) {
                text += `CAPE: ${vpw.capeRatioUsed.toFixed(1)}\n`;
            }
            text += `Go-Go: ${vpw.goGoActive ? `Aktiv (x${Number.isFinite(vpw.goGoMultiplier) ? vpw.goGoMultiplier.toFixed(2) : '1.00'})` : 'Inaktiv'}\n`;
            if (typeof vpw.safetyStage === 'number' && isFinite(vpw.safetyStage)) {
                const stage = Math.max(0, Math.round(vpw.safetyStage));
                const stageText = stage === 0 ? 'Normal' : (stage === 1 ? 'Stufe 1 (Go-Go aus)' : 'Stufe 2 (Statischer Flex)');
                text += `VPW-Sicherheitsmodus: ${stageText}\n`;
            }
            if (typeof vpw.gesamtwert === 'number' && isFinite(vpw.gesamtwert)) {
                text += `VPW-Basisvermögen: ${UIUtils.formatCurrency(vpw.gesamtwert)}\n`;
            }
            if (typeof vpw.vpwTotal === 'number' && isFinite(vpw.vpwTotal)) {
                text += `VPW-Total: ${UIUtils.formatCurrency(vpw.vpwTotal)}\n`;
            }
            if (typeof vpw.dynamicFlex === 'number' && isFinite(vpw.dynamicFlex)) {
                text += `VPW-Flex (abgeleitet): ${UIUtils.formatCurrency(vpw.dynamicFlex)}\n`;
            }
            const warnings = [];
            if (typeof vpw.expectedRealReturn === 'number' && isFinite(vpw.expectedRealReturn) && vpw.expectedRealReturn < 0) {
                warnings.push('ER(real) negativ');
            }
            if (typeof vpw.horizonYears === 'number' && isFinite(vpw.horizonYears) && vpw.horizonYears <= 12) {
                warnings.push('sehr kurzer VPW-Horizont (<=12J)');
            }
            if (typeof vpw.vpwRate === 'number' && isFinite(vpw.vpwRate) && (vpw.vpwRate * 100) >= 8) {
                warnings.push('hohe VPW-Rate (>=8%)');
            }
            if (warnings.length > 0) {
                text += `Warnsignale: ${warnings.join('; ')}\n`;
            }
        }
        text += `\n===== Ende der Diagnose =====`;
        return text;
    };

    return {
        handleCopyDiagnosis() {
            const textToCopy = generateDiagnosisText(appState.diagnosisData);
            navigator.clipboard.writeText(textToCopy).then(() => UIRenderer.toast('Diagnose kopiert!'));
        },
        generateDiagnosisText
    };
}
