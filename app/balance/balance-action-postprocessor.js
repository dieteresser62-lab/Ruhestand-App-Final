/**
 * Module: Balance Action Postprocessor
 * Purpose: Exposes the already finalized Balance action and 3-bucket diagnosis.
 */
"use strict";

export function postprocessBalanceAction({ modelResult, profilverbundRuns, mergeProfilverbundActions }) {
    if (profilverbundRuns && modelResult.ui) {
        modelResult.ui.action = mergeProfilverbundActions(profilverbundRuns);
        return { threeBucketDiagnosis: profilverbundRuns.threeBucketDiagnosis || null };
    }

    return { threeBucketDiagnosis: modelResult?.ui?.threeBucket || null };
}
