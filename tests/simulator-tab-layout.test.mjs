import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'Simulator.html'), 'utf8');

const tabButtons = [...html.matchAll(/<button\s+class="tab-btn(?: active)?"\s+data-tab="([^"]+)">([^<]+)<\/button>/g)]
    .map(([, id, label]) => ({ id, label: label.trim() }));
assert(JSON.stringify(tabButtons) === JSON.stringify([
    { id: 'rahmendaten', label: 'Rahmendaten' },
    { id: 'montecarlo', label: 'Monte-Carlo' },
    { id: 'backtesting', label: 'Backtesting' },
    { id: 'sweep', label: 'Parameter-Sweep' },
    { id: 'auto-optimize', label: 'Auto-Optimize' }
]), 'Simulator-Tab-Leiste enthält die fünf Tabs in der vorgesehenen Reihenfolge');

const sweepStart = html.indexOf('<div id="tab-sweep" class="tab-panel">');
const optimizeStart = html.indexOf('<div id="tab-auto-optimize" class="tab-panel">');
const scriptsStart = html.indexOf('<script type="module" src="app/profile/profile-bridge.js">');
assert(sweepStart >= 0 && optimizeStart > sweepStart && scriptsStart > optimizeStart,
    'Sweep- und Auto-Optimize-Panels sind getrennt und in Tab-Reihenfolge vorhanden');

const sweepPanel = html.slice(sweepStart, optimizeStart);
const optimizePanel = html.slice(optimizeStart, scriptsStart);
for (const id of ['sweepRuns', 'sweepGridSize', 'sweepButton', 'sweepCancelButton', 'sweepResults', 'sweepHeatmap']) {
    assert(sweepPanel.includes(`id="${id}"`), `${id} bleibt im Parameter-Sweep-Panel`);
    assert(!optimizePanel.includes(`id="${id}"`), `${id} liegt nicht im Auto-Optimize-Panel`);
}
for (const id of ['ao_metric', 'ao_presets_container', 'ao_parameters_container', 'ao_run_btn', 'ao_progress', 'ao_result', 'ao_apply_btn']) {
    assert(optimizePanel.includes(`id="${id}"`), `${id} liegt im Auto-Optimize-Panel`);
    assert(!sweepPanel.includes(`id="${id}"`), `${id} liegt nicht mehr im Parameter-Sweep-Panel`);
}
