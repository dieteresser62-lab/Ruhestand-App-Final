<script lang="ts">
    import { userInput } from "$lib/stores/user-input";
    import { slide } from "svelte/transition";
    import "../styles/simulator.css";

    // UI Logic for Collapsible Fieldsets
    // Default open based on screenshot
    let collapsed: Record<string, boolean> = {
        rahmendaten: false,
        gold: true, // Only showing one open in screenshot for cleanliness, but user can open others
        runway: true,
        personen: true,
        anspar: true,
        pflege: true,
    };

    function toggle(section: string) {
        collapsed[section] = !collapsed[section];
    }

    // Derived Values for "Finale Start-Allokation"
    $: totalAssets = $userInput.startKapital || 0;
    $: liquidity = $userInput.zielLiquiditaet || 0;
    $: goldValue = $userInput.goldAktiv
        ? totalAssets * ($userInput.goldZielProzent / 100)
        : 0;
    $: stockValue = Math.max(0, totalAssets - liquidity - goldValue);

    // Sync to Model (WASM Engine Input)

    // Formatting helper
    const fmt = (n: number) =>
        new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
        }).format(n);
</script>

<div class="panel main-panel">
    <!-- CONTENT: RAHMENDATEN (Now purely the form content) -->

    <!-- 1. STARTPORTFOLIO -->
    <fieldset class="collapsible" class:collapsed={collapsed.rahmendaten}>
        <legend on:click={() => toggle("rahmendaten")}>
            <span class="legend-text"
                ><span class="section-icon">💰</span>Startportfolio & Bedarf</span
            >
            <span class="progress-indicator"></span>
        </legend>
        <div class="fieldset-content" hidden={collapsed.rahmendaten}>
            <div class="form-grid-three-col">
                <div class="form-group">
                    <label for="startKapital">Gesamtvermögen (€)</label>
                    <input
                        type="number"
                        id="startKapital"
                        bind:value={$userInput.startKapital}
                        min="0"
                        step="1000"
                    />
                </div>
                <div class="form-group">
                    <label for="depotwertAlt">Depotwert Alt (€)</label>
                    <input
                        type="number"
                        id="depotwertAlt"
                        bind:value={$userInput.depotwertAlt}
                        min="0"
                        step="1000"
                    />
                </div>
                <div class="form-group">
                    <label for="zielLiquiditaet">Ziel-Liquidität (€)</label>
                    <input
                        type="number"
                        id="zielLiquiditaet"
                        bind:value={$userInput.zielLiquiditaet}
                        min="0"
                        step="1000"
                    />
                </div>
                <div class="form-group">
                    <label for="floorBedarf">Floor-Bedarf p.a. (€)</label>
                    <input
                        type="number"
                        id="floorBedarf"
                        bind:value={$userInput.floorBedarf}
                        min="0"
                        step="500"
                    />
                </div>
                <div class="form-group">
                    <label for="flexBedarf">Flex-Bedarf p.a. (€)</label>
                    <input
                        type="number"
                        id="flexBedarf"
                        bind:value={$userInput.flexBedarf}
                        min="0"
                        step="500"
                    />
                </div>
                <div class="form-group">
                    <label for="marketCape">CAPE (Shiller)</label>
                    <input
                        type="number"
                        id="marketCape"
                        bind:value={$userInput.capeRatio}
                        min="0"
                        step="0.1"
                    />
                </div>
                <div class="form-group">
                    <label for="einstandAlt">Einstand Alt (€)</label>
                    <input
                        type="number"
                        id="einstandAlt"
                        bind:value={$userInput.einstandAlt}
                        min="0"
                        step="1000"
                    />
                </div>
                <div class="form-group">
                    <label for="einstandNeu">Einstand Neu (€)</label>
                    <input
                        type="number"
                        id="einstandNeu"
                        bind:value={$userInput.einstandNeu}
                        min="0"
                        step="1000"
                    />
                </div>
            </div>

            <!-- Finale Start-Allokation Visualization -->
            <div
                style="margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--border-color);"
            >
                <h4 style="text-align: center; margin-bottom: 15px;">
                    Finale Start-Allokation
                </h4>

                <div
                    style="display: flex; height: 30px; width: 100%; border-radius: 6px; overflow: hidden; margin-bottom: 8px;"
                >
                    <div
                        style="background-color: #dbeafe; width: {(stockValue /
                            totalAssets) *
                            100}%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #1e40af; font-weight: bold;"
                    >
                        {stockValue > 0
                            ? ((stockValue / totalAssets) * 100).toFixed(0) +
                              "%"
                            : ""}
                    </div>
                    <div
                        style="background-color: #fef9c3; width: {(goldValue /
                            totalAssets) *
                            100}%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #854d0e; font-weight: bold;"
                    >
                        {goldValue > 0
                            ? ((goldValue / totalAssets) * 100).toFixed(1) + "%"
                            : ""}
                    </div>
                    <div
                        style="background-color: #dcfce7; width: {(liquidity /
                            totalAssets) *
                            100}%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #166534; font-weight: bold;"
                    >
                        {liquidity > 0
                            ? ((liquidity / totalAssets) * 100).toFixed(1) + "%"
                            : ""}
                    </div>
                </div>

                <div
                    style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-light);"
                >
                    <div style="width: 33%;">
                        <span style="display: block; font-weight: 500;"
                            >Depot (Aktien)</span
                        >
                        <strong style="color: #1e40af;"
                            >{fmt(stockValue)}</strong
                        >
                    </div>
                    <div style="width: 33%; text-align: center;">
                        <span style="display: block; font-weight: 500;"
                            >Depot (Gold)</span
                        >
                        <strong style="color: #854d0e;">{fmt(goldValue)}</strong
                        >
                    </div>
                    <div style="width: 33%; text-align: right;">
                        <span style="display: block; font-weight: 500;"
                            >Liquidität</span
                        >
                        <strong style="color: #166534;">{fmt(liquidity)}</strong
                        >
                    </div>
                </div>
            </div>
        </div>
    </fieldset>

    <!-- 2. GOLD STRATEGIE -->
    <fieldset class="collapsible" class:collapsed={collapsed.gold}>
        <legend on:click={() => toggle("gold")}>
            <span class="legend-text"
                ><span class="section-icon">🥇</span>Gold-Strategie</span
            >
            <span class="progress-indicator"></span>
        </legend>
        <div class="fieldset-content" hidden={collapsed.gold}>
            <div class="form-group" style="margin-bottom: 15px;">
                <label
                    style="flex-direction: row; align-items: center; cursor: pointer;"
                >
                    <input
                        type="checkbox"
                        bind:checked={$userInput.goldAktiv}
                        style="width: auto; margin-right: 8px;"
                    />
                    Gold-Allokation aktiv
                </label>
            </div>
            <div
                class="form-grid-three-col"
                class:disabled={!$userInput.goldAktiv}
            >
                <div class="form-group">
                    <label for="goldAllo">Ziel-Allokation (%)</label>
                    <input
                        type="number"
                        id="goldAllo"
                        bind:value={$userInput.goldZielProzent}
                        min="0"
                        max="100"
                        stepping="0.5"
                        disabled={!$userInput.goldAktiv}
                    />
                </div>
                <div class="form-group">
                    <label for="goldFloor">Gold-Floor (%)</label>
                    <input
                        type="number"
                        id="goldFloor"
                        bind:value={$userInput.goldFloorProzent}
                        min="0"
                        max="100"
                        stepping="0.5"
                        disabled={!$userInput.goldAktiv}
                    />
                </div>
                <div class="form-group">
                    <label for="goldRebal">Rebalancing-Band (± %)</label>
                    <input
                        type="number"
                        id="goldRebal"
                        bind:value={$userInput.goldRebalancingBand}
                        min="0"
                        max="100"
                        disabled={!$userInput.goldAktiv}
                    />
                </div>
                <div class="form-group" style="align-self: flex-end;">
                    <label
                        style="flex-direction: row; align-items: center; cursor: pointer;"
                    >
                        <input
                            type="checkbox"
                            bind:checked={$userInput.goldSteuerfrei}
                            style="width: auto; margin-right: 8px;"
                            disabled={!$userInput.goldAktiv}
                        />
                        Gold steuerfrei (>1J)
                    </label>
                </div>
            </div>
        </div>
    </fieldset>

    <!-- 3. RUNWAY & STRATEGIE -->
    <fieldset class="collapsible" class:collapsed={collapsed.runway}>
        <legend on:click={() => toggle("runway")}>
            <span class="legend-text"
                ><span class="section-icon">⚖️</span>Runway & Rebalancing</span
            >
            <span class="progress-indicator"></span>
        </legend>
        <div class="fieldset-content" hidden={collapsed.runway}>
            <div class="form-grid-three-col">
                <div class="form-group">
                    <label for="targetEq">Ziel-Aktienquote (%)</label>
                    <input
                        type="number"
                        id="targetEq"
                        bind:value={$userInput.targetEq}
                        min="0"
                        max="100"
                    />
                </div>
                <div class="form-group">
                    <label for="rebalBand">Rebalancing-Band (± %)</label>
                    <input
                        type="number"
                        id="rebalBand"
                        bind:value={$userInput.rebalBand}
                        min="0"
                        max="100"
                    />
                </div>
                <div class="form-group">
                    <label for="runwayMin">Runway Min (Monate)</label>
                    <input
                        type="number"
                        id="runwayMin"
                        bind:value={$userInput.runwayMinMonths}
                        min="0"
                    />
                </div>
                <div class="form-group">
                    <label for="runwayTarget">Runway Target (Monate)</label>
                    <input
                        type="number"
                        id="runwayTarget"
                        bind:value={$userInput.runwayTargetMonths}
                        min="0"
                    />
                </div>
                <div class="form-group">
                    <label for="maxSkim">Max. Skim (Aktien) (%)</label>
                    <input
                        type="number"
                        id="maxSkim"
                        bind:value={$userInput.maxSkimPctOfEq}
                        min="0"
                    />
                </div>
                <div class="form-group">
                    <label for="maxBear">Max. Refill (Bär) (%)</label>
                    <input
                        type="number"
                        id="maxBear"
                        bind:value={$userInput.maxBearRefillPctOfEq}
                        min="0"
                    />
                </div>
            </div>
        </div>
    </fieldset>

    <!-- 4. PERSONEN -->
    <fieldset class="collapsible" class:collapsed={collapsed.personen}>
        <legend on:click={() => toggle("personen")}>
            <span class="legend-text"
                ><span class="section-icon">👤</span>Personen & Rente</span
            >
            <span class="progress-indicator"></span>
        </legend>
        <div class="fieldset-content" hidden={collapsed.personen}>
            <h4 style="margin-bottom: 10px;">Person 1</h4>
            <div class="form-grid-four-col">
                <div class="form-group">
                    <label for="p1Alter">Alter</label>
                    <input
                        type="number"
                        id="p1Alter"
                        bind:value={$userInput.aktuellesAlter}
                    />
                </div>
                <div class="form-group">
                    <label for="p1Rente">Rente (mtl.)</label>
                    <input
                        type="number"
                        id="p1Rente"
                        bind:value={$userInput.renteMonatlich}
                    />
                </div>
                <div class="form-group">
                    <label for="p1Start">Start in ... Jahren</label>
                    <input
                        type="number"
                        id="p1Start"
                        bind:value={$userInput.p1StartInJahren}
                    />
                </div>
                <div class="form-group">
                    <label for="p1Steuer">Steuerpflichtig (%)</label>
                    <input
                        type="number"
                        id="p1Steuer"
                        bind:value={$userInput.renteSteuerpflichtigPct}
                    />
                </div>
            </div>

            <div class="section-divider"></div>

            <div class="form-group" style="margin-bottom: 15px;">
                <label
                    style="flex-direction: row; align-items: center; cursor: pointer;"
                >
                    <input
                        type="checkbox"
                        bind:checked={$userInput.partnerAktiv}
                        style="width: auto; margin-right: 8px;"
                    />
                    Partner aktivieren (Person 2)
                </label>
            </div>

            {#if $userInput.partnerAktiv}
                <h4 style="margin-bottom: 10px;">Person 2</h4>
                <div class="form-grid-four-col">
                    <div class="form-group">
                        <label for="p2Alter">Alter</label>
                        <input
                            type="number"
                            id="p2Alter"
                            bind:value={$userInput.p2AktuellesAlter}
                        />
                    </div>
                    <div class="form-group">
                        <label for="p2Rente">Rente (mtl.)</label>
                        <input
                            type="number"
                            id="p2Rente"
                            bind:value={$userInput.p2RenteMonatlich}
                        />
                    </div>
                    <div class="form-group">
                        <label for="p2Start">Start in ... Jahren</label>
                        <input
                            type="number"
                            id="p2Start"
                            bind:value={$userInput.p2StartInJahren}
                        />
                    </div>
                    <div class="form-group">
                        <label for="p2Steuer">Steuerpflichtig (%)</label>
                        <input
                            type="number"
                            id="p2Steuer"
                            bind:value={$userInput.p2Steuerquote}
                        />
                    </div>
                </div>
            {/if}

            <div class="section-divider"></div>
            <h4 style="margin-bottom: 10px;">Hinterbliebenenrente</h4>
            <div class="form-grid-four-col">
                <div class="form-group">
                    <label for="widowMode">Modus</label>
                    <select
                        id="widowMode"
                        bind:value={$userInput.widowPensionMode}
                    >
                        <option value="stop">Rente endet</option>
                        <option value="percent">Witwenrente (%)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="widowPct">Witwenrente (%)</label>
                    <input
                        type="number"
                        id="widowPct"
                        bind:value={$userInput.widowPensionPct}
                        disabled={$userInput.widowPensionMode !== "percent"}
                    />
                </div>
            </div>
        </div>
    </fieldset>

    <!-- 5. ANSPARPHASE -->
    <fieldset class="collapsible" class:collapsed={collapsed.anspar}>
        <legend on:click={() => toggle("anspar")}>
            <span class="legend-text"
                ><span class="section-icon">📈</span>Ansparphase</span
            >
            <span class="progress-indicator"></span>
        </legend>
        <div class="fieldset-content" hidden={collapsed.anspar}>
            <div class="form-group" style="margin-bottom: 15px;">
                <label
                    style="flex-direction: row; align-items: center; cursor: pointer;"
                >
                    <input
                        type="checkbox"
                        bind:checked={$userInput.ansparphaseAktiv}
                        style="width: auto; margin-right: 8px;"
                    />
                    Ansparphase aktivieren
                </label>
            </div>
            <div
                class="form-grid-three-col"
                class:disabled={!$userInput.ansparphaseAktiv}
            >
                <div class="form-group">
                    <label for="ansparDauer">Dauer (Jahre)</label>
                    <input
                        type="number"
                        id="ansparDauer"
                        bind:value={$userInput.ansparphaseDauerJahre}
                        disabled={!$userInput.ansparphaseAktiv}
                    />
                </div>
                <div class="form-group">
                    <label for="ansparRate">Sparrate (mtl.)</label>
                    <input
                        type="number"
                        id="ansparRate"
                        bind:value={$userInput.ansparrateMonatlich}
                        disabled={!$userInput.ansparphaseAktiv}
                    />
                </div>
                <div class="form-group">
                    <label for="ansparIndex">Indexierung</label>
                    <select
                        id="ansparIndex"
                        bind:value={$userInput.sparrateIndexing}
                        disabled={!$userInput.ansparphaseAktiv}
                    >
                        <option value="none">Keine</option>
                        <option value="inflation">Inflation</option>
                        <option value="wage">Lohnentwicklung</option>
                    </select>
                </div>
            </div>
        </div>
    </fieldset>

    <!-- 6. PFLEGE -->
    <fieldset class="collapsible" class:collapsed={collapsed.pflege}>
        <legend on:click={() => toggle("pflege")}>
            <span class="legend-text"
                ><span class="section-icon">🏥</span
                >Pflegefall-Absicherung</span
            >
            <span class="progress-indicator"></span>
        </legend>
        <div class="fieldset-content" hidden={collapsed.pflege}>
            <div class="form-group" style="margin-bottom: 15px;">
                <label
                    style="flex-direction: row; align-items: center; cursor: pointer;"
                >
                    <input
                        type="checkbox"
                        bind:checked={$userInput.pflegefallLogikAktiv}
                        style="width: auto; margin-right: 8px;"
                    />
                    Pflege-Logik aktivieren
                </label>
            </div>

            <div class:disabled={!$userInput.pflegefallLogikAktiv}>
                <div class="care-section">
                    <div class="care-section-header">
                        <h4>Matrix (Kosten & Mortalität)</h4>
                    </div>
                    <div class="care-grade-matrix">
                        <div class="care-grade-row care-grade-header">
                            <div>Stufe</div>
                            <div>Zusatz (€ p.a.)</div>
                            <div>Flex-Cut (%)</div>
                            <div>Mortality</div>
                        </div>
                        <!-- STUFEN 1-5 -->
                        {#each [1, 2, 3, 4, 5] as stufe}
                            <div class="care-grade-row">
                                <div class="care-grade-label">
                                    <strong>Pflegegrad {stufe}</strong>
                                </div>
                                <div class="form-group" style="margin:0">
                                    <input
                                        type="number"
                                        bind:value={
                                            $userInput[
                                                `pflegeStufe${stufe}Zusatz`
                                            ]
                                        }
                                        disabled={!$userInput.pflegefallLogikAktiv}
                                    />
                                </div>
                                <div class="form-group" style="margin:0">
                                    <input
                                        type="number"
                                        bind:value={
                                            $userInput[
                                                `pflegeStufe${stufe}FlexCut`
                                            ]
                                        }
                                        disabled={!$userInput.pflegefallLogikAktiv}
                                    />
                                </div>
                                <div class="form-group" style="margin:0">
                                    <input
                                        type="number"
                                        bind:value={
                                            $userInput[
                                                `pflegeStufe${stufe}Mortality`
                                            ]
                                        }
                                        step="0.1"
                                        disabled={!$userInput.pflegefallLogikAktiv}
                                    />
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </fieldset>
</div>

<style>
    /* Styling overrides for nicer form look */
    .panel {
        background: transparent; /* Main wrapper is transparent, fieldsets provide bg */
        padding: 0;
        box-shadow: none;
        border: none;
    }

    /* Style the fieldsets to look like the "Cards" in the screenshot */
    :global(fieldset.collapsible) {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        padding: 0;
        overflow: hidden;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    :global(fieldset.collapsible legend) {
        width: 100%;
        background: #fafafa;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #f3f4f6;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 1rem;
    }

    :global(fieldset.collapsible legend:hover) {
        background: #f3f4f6;
    }

    :global(.fieldset-content) {
        padding: 1.5rem;
    }

    :global(.section-icon) {
        margin-right: 0.5rem;
    }
</style>
