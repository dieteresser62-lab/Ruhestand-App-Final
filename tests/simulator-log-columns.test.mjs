import { buildBacktestColumnDefinitions } from '../app/simulator/simulator-main-helpers.js';
import { getWorstRunColumnDefinitions } from '../app/simulator/simulator-results.js';

console.log('--- Simulator Log Columns Tests ---');

const hasHeader = (cols, header) => cols.some(col => col?.header === header);

{
    const normalCols = buildBacktestColumnDefinitions('normal');
    const detailedCols = buildBacktestColumnDefinitions('detailed');

    assert(!hasHeader(normalCols, 'VPW%'), 'Backtest normal should not include VPW%');
    assert(!hasHeader(normalCols, 'ER(real)'), 'Backtest normal should not include ER(real)');
    assert(!hasHeader(normalCols, 'Safe'), 'Backtest normal should not include Safe');
    assert(!hasHeader(normalCols, 'VTopf'), 'Backtest normal should not include VTopf');
    assert(!hasHeader(normalCols, 'StSave'), 'Backtest normal should not include StSave');
    assert(hasHeader(detailedCols, 'VPW%'), 'Backtest detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Backtest detailed should include ER(real)');
    assert(hasHeader(detailedCols, 'Safe'), 'Backtest detailed should include Safe');
    assert(hasHeader(detailedCols, 'VTopf'), 'Backtest detailed should include VTopf');
    assert(hasHeader(detailedCols, 'StSave'), 'Backtest detailed should include StSave');
}

{
    const normalCols = getWorstRunColumnDefinitions({ logDetailLevel: 'normal' });
    const detailedCols = getWorstRunColumnDefinitions({ logDetailLevel: 'detailed' });

    assert(!hasHeader(normalCols, 'VPW%'), 'Worst-run normal should not include VPW%');
    assert(!hasHeader(normalCols, 'ER(real)'), 'Worst-run normal should not include ER(real)');
    assert(!hasHeader(normalCols, 'Safe'), 'Worst-run normal should not include Safe');
    assert(!hasHeader(normalCols, 'VTopf'), 'Worst-run normal should not include VTopf');
    assert(!hasHeader(normalCols, 'StSave'), 'Worst-run normal should not include StSave');
    assert(hasHeader(detailedCols, 'VPW%'), 'Worst-run detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Worst-run detailed should include ER(real)');
    assert(hasHeader(detailedCols, 'Safe'), 'Worst-run detailed should include Safe');
    assert(hasHeader(detailedCols, 'VTopf'), 'Worst-run detailed should include VTopf');
    assert(hasHeader(detailedCols, 'StSave'), 'Worst-run detailed should include StSave');
}

console.log('✅ Simulator log columns tests passed');
