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
    assert(!hasHeader(normalCols, 'EntPlan'), 'Backtest normal should not include payout detail columns');
    assert(!hasHeader(normalCols, 'Liq>P'), 'Backtest normal should not include payout liquidity columns');
    assert(hasHeader(detailedCols, 'VPW%'), 'Backtest detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Backtest detailed should include ER(real)');
    assert(hasHeader(detailedCols, 'Safe'), 'Backtest detailed should include Safe');
    assert(hasHeader(detailedCols, 'VTopf'), 'Backtest detailed should include VTopf');
    assert(hasHeader(detailedCols, 'StSave'), 'Backtest detailed should include StSave');
    assert(hasHeader(detailedCols, 'EntPlan'), 'Backtest detailed should include planned withdrawal');
    assert(hasHeader(detailedCols, 'EntEff'), 'Backtest detailed should include effective withdrawal');
    assert(hasHeader(detailedCols, 'VPW€'), 'Backtest detailed should include VPW total');
    assert(hasHeader(detailedCols, 'VPWFlex'), 'Backtest detailed should include VPW dynamic flex');
    assert(hasHeader(detailedCols, 'StatFlex'), 'Backtest detailed should include static flex baseline');
    assert(hasHeader(detailedCols, 'Liq>P'), 'Backtest detailed should include liquidity before payout');
    assert(hasHeader(detailedCols, 'Liq<P'), 'Backtest detailed should include liquidity after payout');
    assert(hasHeader(detailedCols, 'Liq>Z'), 'Backtest detailed should include liquidity after interest');
    assert(hasHeader(detailedCols, 'Port>P'), 'Backtest detailed should include portfolio before payout');
    assert(hasHeader(detailedCols, 'PortEnd'), 'Backtest detailed should include portfolio end value');
}

{
    const normalCols = getWorstRunColumnDefinitions({ logDetailLevel: 'normal' });
    const detailedCols = getWorstRunColumnDefinitions({ logDetailLevel: 'detailed' });

    assert(!hasHeader(normalCols, 'VPW%'), 'Worst-run normal should not include VPW%');
    assert(!hasHeader(normalCols, 'ER(real)'), 'Worst-run normal should not include ER(real)');
    assert(!hasHeader(normalCols, 'Safe'), 'Worst-run normal should not include Safe');
    assert(!hasHeader(normalCols, 'VTopf'), 'Worst-run normal should not include VTopf');
    assert(!hasHeader(normalCols, 'StSave'), 'Worst-run normal should not include StSave');
    assert(!hasHeader(normalCols, 'EntPlan'), 'Worst-run normal should not include payout detail columns');
    assert(!hasHeader(normalCols, 'Liq>P'), 'Worst-run normal should not include payout liquidity columns');
    assert(hasHeader(detailedCols, 'VPW%'), 'Worst-run detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Worst-run detailed should include ER(real)');
    assert(hasHeader(detailedCols, 'Safe'), 'Worst-run detailed should include Safe');
    assert(hasHeader(detailedCols, 'VTopf'), 'Worst-run detailed should include VTopf');
    assert(hasHeader(detailedCols, 'StSave'), 'Worst-run detailed should include StSave');
    assert(hasHeader(detailedCols, 'EntPlan'), 'Worst-run detailed should include planned withdrawal');
    assert(hasHeader(detailedCols, 'EntEff'), 'Worst-run detailed should include effective withdrawal');
    assert(hasHeader(detailedCols, 'VPW€'), 'Worst-run detailed should include VPW total');
    assert(hasHeader(detailedCols, 'VPWFlex'), 'Worst-run detailed should include VPW dynamic flex');
    assert(hasHeader(detailedCols, 'StatFlex'), 'Worst-run detailed should include static flex baseline');
    assert(hasHeader(detailedCols, 'Liq>P'), 'Worst-run detailed should include liquidity before payout');
    assert(hasHeader(detailedCols, 'Liq<P'), 'Worst-run detailed should include liquidity after payout');
    assert(hasHeader(detailedCols, 'Liq>Z'), 'Worst-run detailed should include liquidity after interest');
    assert(hasHeader(detailedCols, 'Port>P'), 'Worst-run detailed should include portfolio before payout');
    assert(hasHeader(detailedCols, 'PortEnd'), 'Worst-run detailed should include portfolio end value');
}

console.log('✅ Simulator log columns tests passed');
