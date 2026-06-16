import { buildBacktestColumnDefinitions } from '../app/simulator/simulator-main-helpers.js';
import { getWorstRunColumnDefinitions } from '../app/simulator/simulator-results.js';

console.log('--- Simulator Log Columns Tests ---');

const hasHeader = (cols, header) => cols.some(col => col?.header === header);

{
    const normalCols = buildBacktestColumnDefinitions('normal');
    const detailedCols = buildBacktestColumnDefinitions('detailed');

    assert(!hasHeader(normalCols, 'VPW%'), 'Backtest normal should not include VPW%');
    assert(!hasHeader(normalCols, 'ER(real)'), 'Backtest normal should not include ER(real)');
    assert(!hasHeader(normalCols, 'RetPol'), 'Backtest normal should not include return policy');
    assert(!hasHeader(normalCols, 'CAPESt'), 'Backtest normal should not include CAPE input status');
    assert(!hasHeader(normalCols, 'Safe'), 'Backtest normal should not include Safe');
    assert(!hasHeader(normalCols, 'VTopf'), 'Backtest normal should not include VTopf');
    assert(!hasHeader(normalCols, 'StSave'), 'Backtest normal should not include StSave');
    assert(!hasHeader(normalCols, 'EntPlan'), 'Backtest normal should not include payout detail columns');
    assert(!hasHeader(normalCols, 'Liq>P'), 'Backtest normal should not include payout liquidity columns');
    assert(hasHeader(detailedCols, 'VPW%'), 'Backtest detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Backtest detailed should include ER(real)');
    assert(hasHeader(detailedCols, 'RetPol'), 'Backtest detailed should include return policy');
    assert(hasHeader(detailedCols, 'RetSrc'), 'Backtest detailed should include return source');
    assert(hasHeader(detailedCols, 'CAPESt'), 'Backtest detailed should include CAPE input status');
    assert(hasHeader(detailedCols, 'ERRaw'), 'Backtest detailed should include raw expected return');
    assert(hasHeader(detailedCols, 'ERClamp'), 'Backtest detailed should include clamped expected return');
    assert(hasHeader(detailedCols, 'SafeR'), 'Backtest detailed should include safe real return');
    assert(hasHeader(detailedCols, 'SafeSrc'), 'Backtest detailed should include safe return source');
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
    assert(hasHeader(detailedCols, 'PortAkt'), 'Backtest detailed should include active portfolio end value');
    assert(hasHeader(detailedCols, 'PortEnd'), 'Backtest detailed should include portfolio end value');
    assert(hasHeader(detailedCols, 'FlowΔ'), 'Backtest detailed should include active flow delta');
    assert(hasHeader(detailedCols, 'TrAct'), 'Backtest detailed should include action trace total');
    assert(hasHeader(detailedCols, 'TrPay'), 'Backtest detailed should include payout trace total');
    assert(hasHeader(detailedCols, 'TrBond'), 'Backtest detailed should include bond refill trace total');
    assert(hasHeader(detailedCols, 'HBEnd'), 'Backtest detailed should include health bucket end value');
    assert(hasHeader(detailedCols, 'HBDeck%'), 'Backtest detailed should include health bucket real coverage');
    assert(hasHeader(detailedCols, 'HBWarn'), 'Backtest detailed should include health bucket warning');
    assert(hasHeader(normalCols, 'MinFlex€'), 'Backtest normal should include minimum flex amount');
    assert(hasHeader(normalCols, 'MinFSt'), 'Backtest normal should include minimum flex status');
    assert(hasHeader(detailedCols, 'MinFBlock'), 'Backtest detailed should include minimum flex block reason');
    assert(hasHeader(detailedCols, 'MinFEff'), 'Backtest detailed should include minimum flex effect amount');

    const noGoldNormalCols = buildBacktestColumnDefinitions('normal', { goldAktiv: false });
    const noGoldDetailedCols = buildBacktestColumnDefinitions('detailed', { goldAktiv: false });
    assert(!hasHeader(noGoldNormalCols, 'Pf.Gld%'), 'Backtest normal should hide gold return when gold is inactive');
    assert(!hasHeader(noGoldNormalCols, 'Handl.G'), 'Backtest normal should hide gold trades when gold is inactive');
    assert(!hasHeader(noGoldNormalCols, 'Gold'), 'Backtest normal should hide gold value when gold is inactive');
    assert(!hasHeader(noGoldDetailedCols, 'GuardG'), 'Backtest detailed should hide gold guard column when gold is inactive');
    assert(!hasHeader(noGoldDetailedCols, 'Gld_vorR'), 'Backtest detailed should hide gold detail columns when gold is inactive');
}

{
    const normalCols = getWorstRunColumnDefinitions({ logDetailLevel: 'normal' });
    const detailedCols = getWorstRunColumnDefinitions({ logDetailLevel: 'detailed' });

    assert(!hasHeader(normalCols, 'VPW%'), 'Worst-run normal should not include VPW%');
    assert(!hasHeader(normalCols, 'ER(real)'), 'Worst-run normal should not include ER(real)');
    assert(!hasHeader(normalCols, 'RetPol'), 'Worst-run normal should not include return policy');
    assert(!hasHeader(normalCols, 'CAPESt'), 'Worst-run normal should not include CAPE input status');
    assert(!hasHeader(normalCols, 'Safe'), 'Worst-run normal should not include Safe');
    assert(!hasHeader(normalCols, 'VTopf'), 'Worst-run normal should not include VTopf');
    assert(!hasHeader(normalCols, 'StSave'), 'Worst-run normal should not include StSave');
    assert(!hasHeader(normalCols, 'EntPlan'), 'Worst-run normal should not include payout detail columns');
    assert(!hasHeader(normalCols, 'Liq>P'), 'Worst-run normal should not include payout liquidity columns');
    assert(hasHeader(detailedCols, 'VPW%'), 'Worst-run detailed should include VPW%');
    assert(hasHeader(detailedCols, 'ER(real)'), 'Worst-run detailed should include ER(real)');
    assert(hasHeader(detailedCols, 'RetPol'), 'Worst-run detailed should include return policy');
    assert(hasHeader(detailedCols, 'RetSrc'), 'Worst-run detailed should include return source');
    assert(hasHeader(detailedCols, 'CAPESt'), 'Worst-run detailed should include CAPE input status');
    assert(hasHeader(detailedCols, 'ERRaw'), 'Worst-run detailed should include raw expected return');
    assert(hasHeader(detailedCols, 'ERClamp'), 'Worst-run detailed should include clamped expected return');
    assert(hasHeader(detailedCols, 'SafeR'), 'Worst-run detailed should include safe real return');
    assert(hasHeader(detailedCols, 'SafeSrc'), 'Worst-run detailed should include safe return source');
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
    assert(hasHeader(detailedCols, 'PortAkt'), 'Worst-run detailed should include active portfolio end value');
    assert(hasHeader(detailedCols, 'PortEnd'), 'Worst-run detailed should include portfolio end value');
    assert(hasHeader(detailedCols, 'FlowΔ'), 'Worst-run detailed should include active flow delta');
    assert(hasHeader(detailedCols, 'TrAct'), 'Worst-run detailed should include action trace total');
    assert(hasHeader(detailedCols, 'TrPay'), 'Worst-run detailed should include payout trace total');
    assert(hasHeader(detailedCols, 'TrBond'), 'Worst-run detailed should include bond refill trace total');
    assert(hasHeader(detailedCols, 'HBEnd'), 'Worst-run detailed should include health bucket end value');
    assert(hasHeader(detailedCols, 'HBDeck%'), 'Worst-run detailed should include health bucket real coverage');
    assert(hasHeader(detailedCols, 'HBWarn'), 'Worst-run detailed should include health bucket warning');
    assert(hasHeader(normalCols, 'MinFlex€'), 'Worst-run normal should include minimum flex amount');
    assert(hasHeader(normalCols, 'MinFSt'), 'Worst-run normal should include minimum flex status');
    assert(hasHeader(detailedCols, 'MinFBlock'), 'Worst-run detailed should include minimum flex block reason');
    assert(hasHeader(detailedCols, 'MinFEff'), 'Worst-run detailed should include minimum flex effect amount');

    const noGoldNormalCols = getWorstRunColumnDefinitions({ logDetailLevel: 'normal', goldAktiv: false });
    const noGoldDetailedCols = getWorstRunColumnDefinitions({ logDetailLevel: 'detailed', goldAktiv: false });
    assert(!hasHeader(noGoldNormalCols, 'Pf.Gld%'), 'Worst-run normal should hide gold return when gold is inactive');
    assert(!hasHeader(noGoldNormalCols, 'Handl.G'), 'Worst-run normal should hide gold trades when gold is inactive');
    assert(!hasHeader(noGoldNormalCols, 'Gold'), 'Worst-run normal should hide gold value when gold is inactive');
    assert(!hasHeader(noGoldDetailedCols, 'GuardG'), 'Worst-run detailed should hide gold guard column when gold is inactive');
    assert(!hasHeader(noGoldDetailedCols, 'Gld_vorR'), 'Worst-run detailed should hide gold detail columns when gold is inactive');
}

console.log('✅ Simulator log columns tests passed');
