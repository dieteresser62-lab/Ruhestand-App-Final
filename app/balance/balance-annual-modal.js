/**
 * Module: Balance Annual Modal
 * Purpose: Controls the UI Modal that displays the results of the Annual Update process.
 *          It summarizes successes (Inflation, ATH) and errors for the user.
 * Usage: Used by balance-binder-annual.js to show update results.
 * Dependencies: balance-utils.js, balance-renderer.js
 */
"use strict";

import { UIUtils } from './balance-utils.js';
import { UIRenderer } from './balance-renderer.js';
import { escapeHtml } from '../shared/security-utils.js';

export function createAnnualModalHandlers({ getLastUpdateResults }) {
    const showUpdateResultModal = (results) => {
        const modal = document.getElementById('updateResultModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalResults = document.getElementById('modalResults');
        const modalDuration = document.getElementById('modalDuration');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const closeX = modal.querySelector('.modal-close');
        const modalOverlay = modal.querySelector('.modal-overlay');

        if (!modal) {
            console.error('Modal Element nicht gefunden!');
            return;
        }

        if (!results || typeof results.startTime !== 'number' || typeof results.endTime !== 'number') {
            console.error('Ungültiges Ergebnisobjekt für das Jahres-Update-Modul.', results);
            UIRenderer.toast('Kein gültiges Protokoll verfügbar.');
            return;
        }

        // Berechne Dauer
        const duration = results.endTime - results.startTime;
        const durationSeconds = (duration / 1000).toFixed(1);

        // Bestimme Titel basierend auf Erfolg/Fehler
        const hasErrors = results.errors.length > 0;
        const allFailed = false;

        if (allFailed) {
            modalTitle.innerHTML = '❌ Jahres-Update fehlgeschlagen';
        } else if (hasErrors) {
            modalTitle.innerHTML = '⚠️ Jahres-Update teilweise erfolgreich';
        } else {
            modalTitle.innerHTML = '✅ Jahres-Update erfolgreich';
        }

        // Baue Ergebnis-HTML
        let html = '';

        // Inflation
        if (results.inflation) {
            html += `
                <div class="modal-result-item success">
                    <div class="result-icon">📊</div>
                    <div class="result-content">
                        <div class="result-title">Inflation ${results.inflation.year}</div>
                        <div class="result-value">${UIUtils.formatPercentValue(results.inflation.rate, { fractionDigits: 1, invalid: 'n/a' })}</div>
                        <div class="result-details">Quelle: ${escapeHtml(results.inflation.source)} • Bedarfe automatisch angepasst</div>
                    </div>
                </div>
            `;
        } else if (results.errors.find(e => e.step === 'Inflation')) {
            const error = results.errors.find(e => e.step === 'Inflation');
            html += `
                <div class="modal-result-item error">
                    <div class="result-icon">❌</div>
                    <div class="result-content">
                        <div class="result-title">Inflation</div>
                        <div class="result-value">Fehler</div>
                        <div class="result-details">${escapeHtml(error.error)}</div>
                    </div>
                </div>
            `;
        }

        // ETF & Marktdaten
        if (results.etf) {
            const athIcon = results.etf.ath.isNew ? '🎯' : '📈';
            const athText = results.etf.ath.isNew
                ? `Neues Allzeithoch! (alt: ${results.etf.ath.old} €)`
                : `ATH: ${results.etf.ath.new} € • Jahre seit ATH: ${results.etf.ath.yearsSince}`;

            html += `
                <div class="modal-result-item success">
                    <div class="result-icon">${athIcon}</div>
                    <div class="result-content">
                        <div class="result-title">${escapeHtml(results.etf.ticker)} • Nachrücken durchgeführt</div>
                        <div class="result-value">${escapeHtml(String(results.etf.price))} €</div>
                        <div class="result-details">Stand: ${escapeHtml(results.etf.date)} • Quelle: ${escapeHtml(results.etf.source)}<br>${athText}</div>
                    </div>
                </div>
            `;
        } else if (results.errors.find(e => e.step === 'ETF & Nachrücken')) {
            const error = results.errors.find(e => e.step === 'ETF & Nachrücken');
            html += `
                <div class="modal-result-item error">
                    <div class="result-icon">❌</div>
                    <div class="result-content">
                        <div class="result-title">ETF & Nachrücken</div>
                        <div class="result-value">Fehler</div>
                        <div class="result-details">${escapeHtml(error.error)}</div>
                    </div>
                </div>
            `;
        }

        // CAPE
        if (results.cape && results.cape.capeFetchStatus !== 'error_no_source_no_stored') {
            const isWarning = results.cape.capeFetchStatus === 'warn_stale_source';
            const cssClass = isWarning ? 'warning' : 'success';
            const icon = isWarning ? '⚠️' : '📐';
            const capeAsOf = results.cape.capeAsOf
                ? new Date(results.cape.capeAsOf).toLocaleDateString('de-DE')
                : 'n/a';
            const sourceLabel = results.cape.sourceLabel || results.cape.capeSource || 'n/a';
            html += `
                <div class="modal-result-item ${cssClass}">
                    <div class="result-icon">${icon}</div>
                    <div class="result-content">
                        <div class="result-title">US Shiller CAPE</div>
                        <div class="result-value">${escapeHtml(String(results.cape.capeRatio ?? 'n/a'))}</div>
                        <div class="result-details">Stand: ${escapeHtml(capeAsOf)} • Quelle: ${escapeHtml(sourceLabel)}${isWarning ? ' • Quelle veraltet' : ''}</div>
                    </div>
                </div>
            `;
        } else if (results.errors.find(e => e.step === 'CAPE')) {
            const error = results.errors.find(e => e.step === 'CAPE');
            html += `
                <div class="modal-result-item error">
                    <div class="result-icon">❌</div>
                    <div class="result-content">
                        <div class="result-title">US Shiller CAPE</div>
                        <div class="result-value">Fehler</div>
                        <div class="result-details">${escapeHtml(error.error)}</div>
                    </div>
                </div>
            `;
        }

        // Alter
        html += `
            <div class="modal-result-item success">
                <div class="result-icon">🎂</div>
                <div class="result-content">
                    <div class="result-title">Aktuelles Alter</div>
                    <div class="result-value">${results.age.old} → ${results.age.new} Jahre</div>
                    <div class="result-details">Ein weiteres Jahr ist vergangen</div>
                </div>
            </div>
        `;

        modalResults.innerHTML = html;
        modalDuration.innerHTML = `⏱️ Dauer: ${durationSeconds} Sekunden`;

        // Event Handler für Schließen
        const closeModal = () => {
            modal.style.display = 'none';
        };

        // Entferne alte Event Listener (falls vorhanden)
        const newCloseBtn = modalCloseBtn.cloneNode(true);
        const newCloseX = closeX.cloneNode(true);
        const newOverlay = modalOverlay ? modalOverlay.cloneNode(true) : null;

        modalCloseBtn.parentNode.replaceChild(newCloseBtn, modalCloseBtn);
        closeX.parentNode.replaceChild(newCloseX, closeX);
        if (newOverlay) {
            modalOverlay.parentNode.replaceChild(newOverlay, modalOverlay);
        }

        // Neue Event Listener
        newCloseBtn.addEventListener('click', closeModal);
        newCloseX.addEventListener('click', closeModal);
        const activeOverlay = modal.querySelector('.modal-overlay');
        if (activeOverlay) {
            activeOverlay.addEventListener('click', closeModal);
        }

        // ESC-Taste zum Schließen
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Zeige Modal
        modal.style.display = 'flex';
    };

    const handleShowUpdateLog = () => {
        const last = getLastUpdateResults();
        if (!last) {
            UIRenderer.toast('Noch kein Jahres-Update durchgeführt.');
            return;
        }

        showUpdateResultModal(last);
    };

    return { showUpdateResultModal, handleShowUpdateLog };
}
