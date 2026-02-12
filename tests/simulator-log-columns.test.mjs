import { buildBacktestColumnDefinitions } from '../app/simulator/simulator-main-helpers.js';
import { getWorstRunColumnDefinitions } from '../app/simulator/simulator-results.js';

console.log('--- Simulator Log Columns Tests ---');

const hasHeader = (cols, header) => cols.some(col => col?.header === header);

{
    const normalCols = buildBacktestColumnDefinitions('normal');
    const detailedCols = buildBacktestColumnDefinitions('detailed');

    assert(!hasHeader(normalCols, 'VPW%'), 'Backtest normal should not include VPW%');
    assert(!hasHeader(normalCols, 'ER(real)'), 'Backtest normal should not include ER(real)');
    assert(hasHeader(detailedCols, 'VPW%'), 'Backtest detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Backtest detailed should include ER(real)');
}

{
    const normalCols = getWorstRunColumnDefinitions({ logDetailLevel: 'normal' });
    const detailedCols = getWorstRunColumnDefinitions({ logDetailLevel: 'detailed' });

    assert(!hasHeader(normalCols, 'VPW%'), 'Worst-run normal should not include VPW%');
    assert(!hasHeader(normalCols, 'ER(real)'), 'Worst-run normal should not include ER(real)');
    assert(hasHeader(detailedCols, 'VPW%'), 'Worst-run detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Worst-run detailed should include ER(real)');
}

console.log('✅ Simulator log columns tests passed');
