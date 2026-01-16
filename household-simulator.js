// @ts-check

import { ensureProfileRegistry, listProfiles, getProfileMeta, getProfileData } from './profile-storage.js';
import { buildSimulatorInputsFromProfileData, combineHouseholdInputs, buildWithdrawalShares } from './household-inputs.js';
import { readMonteCarloParameters } from './monte-carlo-ui.js';
import { normalizeWidowOptions } from './simulator-sweep-utils.js';
import { prepareHistoricalDataOnce } from './simulator-engine-helpers.js';
import { createMonteCarloBuffers, buildMonteCarloAggregates, MC_HEATMAP_BINS, runMonteCarloChunk, runMonteCarloSimulation } from './monte-carlo-runner.js';
import { formatCurrencyRounded } from './simulator-utils.js';

const STORAGE_KEYS = {
    selection: 'household_selected_profiles',
    primary: 'household_primary_profile',
    aggregation: 'household_aggregation_strategy',
    cashEnabled: 'household_cash_buffer_enabled',
    cashMonths: 'household_cash_buffer_months',
    withdrawalPolicy: 'household_withdrawal_policy',
    riskMaxDrawdown: 'household_risk_max_drawdown',
    riskMaxDepletion: 'household_risk_max_depletion',
    riskMinSuccess: 'household_risk_min_success'
};

function byId(id) {
    return document.getElementById(id);
}

function readSelectedIds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.selection);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeSelectedIds(ids) {
    localStorage.setItem(STORAGE_KEYS.selection, JSON.stringify(ids));
}

function renderProfileList(container, profiles, selectedIds) {
    container.innerHTML = '';
    profiles.forEach(profile => {
        const row = document.createElement('label');
        row.className = 'household-profile-row';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = profile.id;
        checkbox.checked = selectedIds.includes(profile.id);
        checkbox.addEventListener('change', () => {
            const updated = Array.from(container.querySelectorAll('input[type="checkbox"]'))
                .filter(el => el.checked)
                .map(el => el.value);
            writeSelectedIds(updated);
            refreshPrimaryOptions(profiles, updated);
        });
        const label = document.createElement('span');
        label.textContent = profile.name || profile.id;
        row.appendChild(checkbox);
        row.appendChild(label);
        container.appendChild(row);
    });
}

function refreshPrimaryOptions(profiles, selectedIds) {
    const select = byId('householdPrimaryProfile');
    if (!select) return;
    const current = localStorage.getItem(STORAGE_KEYS.primary);
    const allowed = selectedIds.length ? selectedIds : profiles.map(p => p.id);
    select.innerHTML = '';
    allowed.forEach(id => {
        const meta = profiles.find(p => p.id === id);
        const option = document.createElement('option');
        option.value = id;
        option.textContent = meta?.name || id;
        select.appendChild(option);
    });
    if (current && allowed.includes(current)) {
        select.value = current;
    } else if (allowed.length) {
        select.value = allowed[0];
        localStorage.setItem(STORAGE_KEYS.primary, allowed[0]);
    }
}

function setStatus(message, kind = '') {
    const status = byId('householdStatus');
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind;
}

function readCashBufferSettings() {
    const enabled = byId('householdCashBufferEnabled')?.checked === true;
    const months = parseInt(byId('householdCashBufferMonths')?.value || '0', 10);
    return {
        enabled,
        months: Number.isFinite(months) ? Math.max(0, months) : 0
    };
}

function readAggregationStrategy() {
    const select = byId('householdAggregationStrategy');
    if (select && select.value) return select.value;
    return localStorage.getItem(STORAGE_KEYS.aggregation) || 'additive';
}

function applyCashBufferToInputs(inputs, cashBuffer) {
    if (!inputs) return inputs;
    if (!cashBuffer?.enabled) return inputs;
    const months = cashBuffer.months || 0;
    return {
        ...inputs,
        runwayMinMonths: (inputs.runwayMinMonths || 0) + months,
        runwayTargetMonths: (inputs.runwayTargetMonths || 0) + months
    };
}

function buildRiskTotalsFromPrimary(primaryChunk) {
    if (!primaryChunk) {
        return {
            pflegeTriggeredCount: 0,
            totalSimulatedYears: 0,
            totalYearsQuoteAbove45: 0,
            shortfallWithCareCount: 0,
            shortfallNoCareProxyCount: 0,
            p2TriggeredCount: 0
        };
    }
    return primaryChunk.totals;
}

function buildRiskListsFromPrimary(primaryChunk) {
    if (!primaryChunk) {
        return {
            entryAges: [],
            entryAgesP2: [],
            careDepotCosts: [],
            endWealthWithCareList: [],
            endWealthNoCareList: [],
            p1CareYearsTriggered: [],
            p2CareYearsTriggered: [],
            bothCareYearsOverlapTriggered: [],
            maxAnnualCareSpendTriggered: []
        };
    }
    return primaryChunk.lists;
}

async function runHouseholdAccountsSimulation({ profileInputs, primaryProfileId, monteCarloParams, useCapeSampling, cashBuffer }, onProgress) {
    const totalRuns = monteCarloParams.anzahl;
    const primaryEntry = profileInputs.find(entry => entry.profileId === primaryProfileId) || profileInputs[0];
    const primaryInputsRaw = primaryEntry?.inputs;
    const primaryInputs = applyCashBufferToInputs(primaryInputsRaw, cashBuffer);
    const primaryWeights = profileInputs.map(entry => entry.inputs.startVermoegen || 0);
    const totalWeight = primaryWeights.reduce((sum, val) => sum + val, 0);

    const profileChunks = [];
    for (let idx = 0; idx < profileInputs.length; idx++) {
        const entry = profileInputs[idx];
        const adjustedInputs = applyCashBufferToInputs(entry.inputs, cashBuffer);
        const widowOptions = normalizeWidowOptions(adjustedInputs.widowOptions);
        const chunk = await runMonteCarloChunk({
            inputs: adjustedInputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling,
            runRange: { start: 0, count: totalRuns },
            onProgress: pct => {
                if (typeof onProgress === 'function') {
                    const perProfilePct = (idx / profileInputs.length) * 100;
                    const chunkPct = pct / profileInputs.length;
                    onProgress(perProfilePct + chunkPct);
                }
            }
        });
        profileChunks.push({ entry, chunk });
    }

    const combinedBuffers = createMonteCarloBuffers(totalRuns);
    const combinedHeatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    const DEPOT_DEPLETION_THRESHOLD = 100;

    const primaryChunk = profileChunks.find(item => item.entry.profileId === primaryProfileId)?.chunk || profileChunks[0]?.chunk;

    for (let i = 0; i < totalRuns; i++) {
        let sumFinal = 0;
        let sumTax = 0;
        let maxDrawdown = 0;
        let weightedVol = 0;

        profileChunks.forEach((item, idx) => {
            const buffers = item.chunk.buffers;
            sumFinal += buffers.finalOutcomes[i] || 0;
            sumTax += buffers.taxOutcomes[i] || 0;
            maxDrawdown = Math.max(maxDrawdown, buffers.maxDrawdowns[i] || 0);
            weightedVol += (buffers.volatilities[i] || 0) * (primaryWeights[idx] || 0);
        });

        combinedBuffers.finalOutcomes[i] = sumFinal;
        combinedBuffers.taxOutcomes[i] = sumTax;
        combinedBuffers.maxDrawdowns[i] = maxDrawdown;
        combinedBuffers.volatilities[i] = totalWeight > 0 ? weightedVol / totalWeight : 0;
        combinedBuffers.depotErschoepft[i] = sumFinal <= DEPOT_DEPLETION_THRESHOLD ? 1 : 0;
    }

    if (primaryChunk) {
        combinedBuffers.kpiLebensdauer.set(primaryChunk.buffers.kpiLebensdauer);
        combinedBuffers.kpiKuerzungsjahre.set(primaryChunk.buffers.kpiKuerzungsjahre);
        combinedBuffers.kpiMaxKuerzung.set(primaryChunk.buffers.kpiMaxKuerzung);
        combinedBuffers.anteilJahreOhneFlex.set(primaryChunk.buffers.anteilJahreOhneFlex);
        combinedBuffers.alterBeiErschoepfung.set(primaryChunk.buffers.alterBeiErschoepfung);
        combinedBuffers.stress_maxDrawdowns.set(primaryChunk.buffers.stress_maxDrawdowns);
        combinedBuffers.stress_timeQuoteAbove45.set(primaryChunk.buffers.stress_timeQuoteAbove45);
        combinedBuffers.stress_cutYears.set(primaryChunk.buffers.stress_cutYears);
        combinedBuffers.stress_CaR_P10_Real.set(primaryChunk.buffers.stress_CaR_P10_Real);
        combinedBuffers.stress_recoveryYears.set(primaryChunk.buffers.stress_recoveryYears);
        for (let year = 0; year < combinedHeatmap.length; year++) {
            combinedHeatmap[year].set(primaryChunk.heatmap[year] || []);
        }
    }

    const failCount = Array.from(combinedBuffers.finalOutcomes).filter(val => val <= DEPOT_DEPLETION_THRESHOLD).length;

    const aggregatedResults = buildMonteCarloAggregates({
        inputs: primaryInputs,
        totalRuns,
        buffers: combinedBuffers,
        heatmap: combinedHeatmap.map(row => Array.from(row)),
        bins: MC_HEATMAP_BINS,
        totals: buildRiskTotalsFromPrimary(primaryChunk),
        lists: buildRiskListsFromPrimary(primaryChunk),
        allRealWithdrawalsSample: primaryChunk?.allRealWithdrawalsSample || []
    });

    return {
        aggregatedResults,
        failCount
    };
}

function readRiskBudgetSettings() {
    const maxDrawdown = parseFloat(byId('householdRiskMaxDrawdown')?.value || '0');
    const maxDepletion = parseFloat(byId('householdRiskMaxDepletion')?.value || '0');
    const minSuccess = parseFloat(byId('householdRiskMinSuccess')?.value || '0');
    return {
        maxDrawdownPct: Number.isFinite(maxDrawdown) ? maxDrawdown : 0,
        maxDepletionPct: Number.isFinite(maxDepletion) ? maxDepletion : 0,
        minSuccessPct: Number.isFinite(minSuccess) ? minSuccess : 0
    };
}

function renderRiskBudget(result, successProb, budget) {
    const drawdownP90 = (result.maxDrawdowns?.p90 || 0) * 100;
    const depletion = result.depotErschoepfungsQuote || 0;
    const success = successProb;

    const checks = [
        {
            label: 'Drawdown P90',
            value: `${drawdownP90.toFixed(1)} %`,
            limit: `<= ${budget.maxDrawdownPct.toFixed(1)} %`,
            ok: drawdownP90 <= budget.maxDrawdownPct
        },
        {
            label: 'Depot-Erschoepfung',
            value: `${depletion.toFixed(1)} %`,
            limit: `<= ${budget.maxDepletionPct.toFixed(1)} %`,
            ok: depletion <= budget.maxDepletionPct
        },
        {
            label: 'Success-Rate',
            value: `${success.toFixed(1)} %`,
            limit: `>= ${budget.minSuccessPct.toFixed(1)} %`,
            ok: success >= budget.minSuccessPct
        }
    ];

    const html = `
        <div class="household-withdrawals">
            <h4>Risiko-Budget Ergebnis</h4>
            <div class="household-risk-grid">
                ${checks.map(item => `
                    <div class="household-risk-item ${item.ok ? 'ok' : 'fail'}">
                        <div><strong>${item.label}</strong></div>
                        <div>${item.value}</div>
                        <div style="color:#64748b;">Limit: ${item.limit}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    return { html, allOk: checks.every(item => item.ok) };
}

function renderResults(result, warnings, withdrawalShares, cashBuffer, riskBudget, withdrawalPolicy) {
    const container = byId('householdResults');
    if (!container) return;

    if (!result) {
        container.innerHTML = '';
        return;
    }

    const { aggregatedResults, failCount, totalRuns } = result;
    const successProb = totalRuns > 0 ? ((totalRuns - failCount) / totalRuns) * 100 : 0;

    const summaryCards = [
        { label: 'Success-Rate', value: `${successProb.toFixed(1)} %` },
        { label: 'Depot-Erschoepfung', value: `${aggregatedResults.depotErschoepfungsQuote.toFixed(1)} %` },
        { label: 'P50 Endvermoegen', value: formatCurrencyRounded(aggregatedResults.finalOutcomes.p50 || 0) },
        { label: 'P10 Endvermoegen', value: formatCurrencyRounded(aggregatedResults.finalOutcomes.p10 || 0) },
        { label: 'P90 Endvermoegen', value: formatCurrencyRounded(aggregatedResults.finalOutcomes.p90 || 0) },
        { label: 'P90 Drawdown', value: `${(aggregatedResults.maxDrawdowns.p90 * 100).toFixed(1)} %` }
    ];

    const warningHtml = warnings.length
        ? `<div class="household-warnings">${warnings.map(w => `<div>! ${w}</div>`).join('')}</div>`
        : '';

    const cashHtml = cashBuffer.enabled
        ? `<div class="household-note">Gemeinsamer Cash-Puffer: ${cashBuffer.months} Monate (Runway-Min/Target erhoeht).</div>`
        : '';

    const policyLabelMap = {
        proportional: 'Proportional',
        runway_first: 'Runway-First',
        tax_first: 'Tax-First',
        stabilizer: 'Stabilizer'
    };
    const policyLabel = policyLabelMap[withdrawalPolicy] || 'Proportional';
    const withdrawalHtml = withdrawalShares.length
        ? `<div class="household-withdrawals">
                <h4>Entnahme-Orchestrator (${policyLabel})</h4>
                <div class="household-withdrawal-grid">
                    ${withdrawalShares.map(entry => `<div>${entry.name}: ${entry.pct.toFixed(1)} %</div>`).join('')}
                </div>
           </div>`
        : '';

    const riskOutput = renderRiskBudget(aggregatedResults, successProb, riskBudget);

    container.innerHTML = `
        ${warningHtml}
        ${cashHtml}
        <div class="household-kpi-grid">
            ${summaryCards.map(card => `<div class="household-kpi"><div class="label">${card.label}</div><div class="value">${card.value}</div></div>`).join('')}
        </div>
        ${withdrawalHtml}
        ${riskOutput.html}
    `;

    return riskOutput.allOk;
}

async function runHouseholdSimulation() {
    const profiles = listProfiles();
    const selectedIds = readSelectedIds();
    const activeIds = selectedIds.length ? selectedIds : profiles.map(p => p.id);

    if (activeIds.length < 2) {
        setStatus('Bitte mindestens zwei Profile auswaehlen.', 'error');
        return;
    }

    const primaryProfileId = localStorage.getItem(STORAGE_KEYS.primary) || activeIds[0];
    const aggregationStrategy = readAggregationStrategy();
    const cashBuffer = readCashBufferSettings();
    const riskBudget = readRiskBudgetSettings();

    const profileInputs = [];
    for (const id of activeIds) {
        const data = getProfileData(id);
        if (!data) continue;
        const inputs = buildSimulatorInputsFromProfileData(data);
        const meta = getProfileMeta(id);
        profileInputs.push({ profileId: id, name: meta?.name || id, inputs });
    }

    if (profileInputs.length < 2) {
        setStatus('Zu wenig Profile mit Daten gefunden.', 'error');
        return;
    }

    const { combined, warnings } = combineHouseholdInputs(profileInputs, primaryProfileId, cashBuffer.enabled ? cashBuffer.months : 0);
    if (!combined) {
        setStatus('Haushalts-Inputs konnten nicht erstellt werden.', 'error');
        return;
    }

    const withdrawalPolicy = localStorage.getItem(STORAGE_KEYS.withdrawalPolicy) || 'proportional';
    const withdrawalShares = buildWithdrawalShares(profileInputs, withdrawalPolicy);
    const warningsExtended = warnings.slice();
    if (aggregationStrategy === 'accounts') {
        warningsExtended.push('Accounts-Modus aggregiert Drawdowns konservativ (Max je Profil).');
    }
    if (withdrawalPolicy !== 'proportional') {
        warningsExtended.push('Entnahme-Policy ist eine Heuristik und wirkt aktuell nur im Reporting.');
    }

    const runButton = byId('householdRunBtn');
    const progressContainer = byId('household-progress-bar-container');
    const progressBar = byId('household-progress-bar');

    try {
        setStatus('Simulation laeuft...', '');
        if (runButton) runButton.disabled = true;
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';

        prepareHistoricalDataOnce();

        const params = readMonteCarloParameters();
        const useCapeSampling = byId('useCapeSampling')?.checked === true;
        let result = null;
        if (aggregationStrategy === 'accounts') {
            result = await runHouseholdAccountsSimulation({
                profileInputs,
                primaryProfileId,
                monteCarloParams: params,
                useCapeSampling,
                cashBuffer
            }, pct => {
                if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
            });
        } else {
            const widowOptions = normalizeWidowOptions(combined.widowOptions);
            result = await runMonteCarloSimulation({
                inputs: combined,
                widowOptions,
                monteCarloParams: params,
                useCapeSampling,
                onProgress: pct => {
                    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
                }
            });
        }

        const riskOk = renderResults({
            aggregatedResults: result.aggregatedResults,
            failCount: result.failCount,
            totalRuns: params.anzahl
        }, warningsExtended, withdrawalShares, cashBuffer, riskBudget, withdrawalPolicy);
        setStatus(riskOk ? 'Haushalts-Simulation abgeschlossen.' : 'Simulation abgeschlossen: Risiko-Budget verletzt.', riskOk ? 'ok' : 'error');
    } catch (err) {
        console.error('[Household] Simulation failed:', err);
        setStatus(`Fehler: ${err.message}`, 'error');
    } finally {
        if (progressBar) progressBar.style.width = '100%';
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 250);
        if (runButton) runButton.disabled = false;
    }
}

function restoreHouseholdSettings() {
    const cashEnabled = localStorage.getItem(STORAGE_KEYS.cashEnabled);
    const cashMonths = localStorage.getItem(STORAGE_KEYS.cashMonths);
    const policy = localStorage.getItem(STORAGE_KEYS.withdrawalPolicy) || 'proportional';
    const aggregation = localStorage.getItem(STORAGE_KEYS.aggregation) || 'additive';
    const riskMaxDrawdown = localStorage.getItem(STORAGE_KEYS.riskMaxDrawdown);
    const riskMaxDepletion = localStorage.getItem(STORAGE_KEYS.riskMaxDepletion);
    const riskMinSuccess = localStorage.getItem(STORAGE_KEYS.riskMinSuccess);

    const cashToggle = byId('householdCashBufferEnabled');
    const cashInput = byId('householdCashBufferMonths');
    const policySelect = byId('householdWithdrawalPolicy');
    const aggregationSelect = byId('householdAggregationStrategy');
    const riskDrawdownInput = byId('householdRiskMaxDrawdown');
    const riskDepletionInput = byId('householdRiskMaxDepletion');
    const riskSuccessInput = byId('householdRiskMinSuccess');

    if (cashToggle) cashToggle.checked = cashEnabled === '1';
    if (cashInput && cashMonths) cashInput.value = cashMonths;
    if (policySelect) policySelect.value = policy;
    if (aggregationSelect) aggregationSelect.value = aggregation;
    if (riskDrawdownInput && riskMaxDrawdown) riskDrawdownInput.value = riskMaxDrawdown;
    if (riskDepletionInput && riskMaxDepletion) riskDepletionInput.value = riskMaxDepletion;
    if (riskSuccessInput && riskMinSuccess) riskSuccessInput.value = riskMinSuccess;
}

function bindHouseholdSettings() {
    const cashToggle = byId('householdCashBufferEnabled');
    const cashInput = byId('householdCashBufferMonths');
    const policySelect = byId('householdWithdrawalPolicy');
    const aggregationSelect = byId('householdAggregationStrategy');
    const riskDrawdownInput = byId('householdRiskMaxDrawdown');
    const riskDepletionInput = byId('householdRiskMaxDepletion');
    const riskSuccessInput = byId('householdRiskMinSuccess');

    if (cashToggle) {
        cashToggle.addEventListener('change', () => {
            localStorage.setItem(STORAGE_KEYS.cashEnabled, cashToggle.checked ? '1' : '0');
        });
    }
    if (cashInput) {
        cashInput.addEventListener('input', () => {
            localStorage.setItem(STORAGE_KEYS.cashMonths, cashInput.value);
        });
    }
    if (policySelect) {
        policySelect.addEventListener('change', () => {
            localStorage.setItem(STORAGE_KEYS.withdrawalPolicy, policySelect.value);
        });
    }
    if (aggregationSelect) {
        aggregationSelect.addEventListener('change', () => {
            localStorage.setItem(STORAGE_KEYS.aggregation, aggregationSelect.value);
        });
    }
    if (riskDrawdownInput) {
        riskDrawdownInput.addEventListener('input', () => {
            localStorage.setItem(STORAGE_KEYS.riskMaxDrawdown, riskDrawdownInput.value);
        });
    }
    if (riskDepletionInput) {
        riskDepletionInput.addEventListener('input', () => {
            localStorage.setItem(STORAGE_KEYS.riskMaxDepletion, riskDepletionInput.value);
        });
    }
    if (riskSuccessInput) {
        riskSuccessInput.addEventListener('input', () => {
            localStorage.setItem(STORAGE_KEYS.riskMinSuccess, riskSuccessInput.value);
        });
    }
}

function initHouseholdTab() {
    ensureProfileRegistry();

    const listContainer = byId('householdProfileList');
    const runButton = byId('householdRunBtn');
    const primarySelect = byId('householdPrimaryProfile');

    if (!listContainer || !runButton || !primarySelect) {
        return;
    }

    const profiles = listProfiles();
    const storedSelection = readSelectedIds();
    const fallbackSelection = storedSelection.length ? storedSelection : profiles.map(p => p.id);

    renderProfileList(listContainer, profiles, fallbackSelection);
    refreshPrimaryOptions(profiles, fallbackSelection);

    runButton.addEventListener('click', () => {
        runHouseholdSimulation();
    });

    primarySelect.addEventListener('change', () => {
        localStorage.setItem(STORAGE_KEYS.primary, primarySelect.value);
    });

    restoreHouseholdSettings();
    bindHouseholdSettings();
}

document.addEventListener('DOMContentLoaded', initHouseholdTab);
