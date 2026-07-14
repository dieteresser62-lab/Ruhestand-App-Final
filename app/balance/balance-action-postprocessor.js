/**
 * Module: Balance Action Postprocessor
 * Purpose: Profilverbund action merge and single-profile 3-bucket postprocessing.
 */
"use strict";

import { applyThreeBucketLogic, sumBondBucketValuation, appendBondReplenishment } from '../../engine/transactions/three-bucket-logic.mjs';

function calculateAnnualWithdrawalTarget(inputData = {}) {
    const pensionAnnual = inputData.renteAktiv ? ((Number(inputData.renteMonatlich) || 0) * 12) : 0;
    return Math.max(0, (Number(inputData.floorBedarf) || 0) - pensionAnnual)
        + Math.max(0, Number(inputData.flexBedarf) || 0);
}

export function postprocessBalanceAction({ inputData, modelResult, profilverbundRuns, mergeProfilverbundActions }) {
    if (profilverbundRuns && modelResult.ui) {
        modelResult.ui.action = mergeProfilverbundActions(profilverbundRuns);
        return { threeBucketDiagnosis: profilverbundRuns.threeBucketDiagnosis || null };
    }

    if (
        !inputData.decumulation
        || inputData.decumulation.mode !== '3_bucket_jilge'
        || !modelResult.ui
        || !modelResult.ui.action
    ) {
        return { threeBucketDiagnosis: null };
    }

    const market = {
        realReturnEq: Number(modelResult.newState?.marketData?.returns?.realEq) || 0,
        sKey: modelResult.ui?.market?.sKey || 'neutral'
    };
    const tranches = inputData.detailledTranches || [];
    const bondBucketBefore = sumBondBucketValuation(tranches);
    const threeBucketResult = applyThreeBucketLogic(
        tranches,
        inputData,
        market,
        modelResult.ui.action,
        market.realReturnEq,
        bondBucketBefore
    );

    const replenishResult = appendBondReplenishment(
        tranches,
        inputData,
        threeBucketResult.updatedAction,
        market.realReturnEq,
        calculateAnnualWithdrawalTarget(inputData),
        bondBucketBefore,
        market
    );
    modelResult.ui.action = replenishResult.updatedAction;

    return { threeBucketDiagnosis: threeBucketResult.threeBucketState };
}
