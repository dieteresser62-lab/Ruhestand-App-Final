"use strict";

import { formatDiagnosisPayload } from './balance-diagnosis-format.js';
import { buildDiagnosisChips } from './balance-diagnosis-chips.js';
import { buildDecisionTree } from './balance-diagnosis-decision-tree.js';
import { buildGuardrails } from './balance-diagnosis-guardrails.js';
import { buildTransactionDiagnostics } from './balance-diagnosis-transaction.js';
import { buildKeyParams } from './balance-diagnosis-keyparams.js';

/**
 * Renderer für Diagnoseansichten (Chips, Entscheidungsbaum, Kennzahlen).
 * Bündelt alle Diagnose-spezifischen Formatierungen und DOM-Schreiboperationen.
 */
export class DiagnosisRenderer {
    /**
     * @param {Object} domRefs - DOM-Referenzen für Diagnosebereiche.
     */
    constructor(domRefs) {
        this.dom = domRefs;
    }

    /**
     * Formatiert die Rohdaten aus der Engine für die Diagnoseansicht.
     *
     * @param {Object|null} raw - Unformatierte Diagnose.
     * @returns {Object|null} Formatierte Diagnose oder null.
     */
    formatPayload(raw) {
        return formatDiagnosisPayload(raw);
    }

    /**
     * Rendert die Diagnosebereiche in den jeweiligen Containern.
     *
     * @param {Object} diagnosis - Formatierte Diagnose-Daten.
     */
    renderDiagnosis(diagnosis) {
        if (!diagnosis || !this.dom?.diagnosis) return;
        this.dom.diagnosis.chips?.replaceChildren(this.buildChips(diagnosis));
        this.dom.diagnosis.decisionTree?.replaceChildren(this.buildDecisionTree(diagnosis.decisionTree));
        this.dom.diagnosis.guardrails?.replaceChildren(this.buildGuardrails(diagnosis.guardrails));
        if (this.dom.diagnosis.transaction) {
            this.dom.diagnosis.transaction.replaceChildren(
                this.buildTransactionDiagnostics(diagnosis.transactionDiagnostics)
            );
        }
        this.dom.diagnosis.keyParams?.replaceChildren(this.buildKeyParams(diagnosis.keyParams));
    }

    /**
     * Baut Diagnose-Chips basierend auf den Kennzahlen.
     *
     * @param {Object} d - Diagnose-Daten.
     * @returns {DocumentFragment} Fragment mit Chip-Elementen.
     */
    buildChips(d) {
        return buildDiagnosisChips(d);
    }

    /**
     * Erstellt den Entscheidungsbaum für die Diagnose.
     *
     * @param {Array} treeData - Schritte des Entscheidungsbaums.
     * @returns {DocumentFragment} Fragment mit Listenelementen.
     */
    buildDecisionTree(treeData = []) {
        return buildDecisionTree(treeData);
    }

    /**
     * Baut die Guardrail-Karten auf Basis der Schwellenwerte.
     *
     * @param {Array} guardrailData - Guardrail-Liste.
     * @returns {DocumentFragment} Fragment mit Karten.
     */
    buildGuardrails(guardrailData = []) {
        return buildGuardrails(guardrailData);
    }

    /**
     * Baut den Diagnoseabschnitt für Transaktions-Diagnostics auf.
     *
     * @param {Object|null} transactionDiag - Rohdaten aus der Engine, können fehlen.
     * @returns {DocumentFragment} – Fertiger DOM-Baum für das Panel.
     */
    buildTransactionDiagnostics(transactionDiag) {
        return buildTransactionDiagnostics(transactionDiag);
    }

    /**
     * Baut die Sektion mit Schlüsselparametern (Kennzahlen) auf.
     *
     * @param {Object} params - Schlüsselparameter aus der Diagnose.
     * @returns {HTMLElement} Grid mit den Kennzahlen.
     */
    buildKeyParams(params = {}) {
        return buildKeyParams(params);
    }
}
