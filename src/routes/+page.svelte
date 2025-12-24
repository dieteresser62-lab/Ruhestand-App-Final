<script lang="ts">
    import MonteCarlo from '$lib/components/MonteCarlo.svelte';
    import { writable } from 'svelte/store';
    // import { userInput } from '$lib/stores/user-input'; // User mentioned this but implementation is missing. Mocking for now.

    // Mock store for verification demo
    const userInput = writable({
        age: 60,
        riskProfile: "wachstum"
    });

    // Mock Simulation Input
    $: simulationInput = {
        aktuellesAlter: $userInput.age,
        risikoprofil: $userInput.riskProfile,
        inflation: 2.0,
        tagesgeld: 50000.0,
        geldmarktEtf: 0.0,
        aktuelleLiquiditaet: 50000.0,
        depotwertAlt: 800000.0,
        depotwertNeu: 0.0,
        goldAktiv: true,
        goldWert: 100000.0,
        goldCost: 80000.0,
        goldZielProzent: 10.0,
        goldFloorProzent: 5.0,
        floorBedarf: 30000.0,
        flexBedarf: 12000.0,
        renteAktiv: false,
        renteMonatlich: 0.0,
        costBasisAlt: 600000.0,
        costBasisNeu: 0.0,
        sparerPauschbetrag: 1000.0,
        endeVJ: 100.0,
        endeVJ_1: 95.0,
        endeVJ_2: 90.0,
        endeVJ_3: 85.0,
        ath: 105.0,
        jahreSeitAth: 0,
        capeRatio: 20.0,
        runwayMinMonths: 24.0,
        runwayTargetMonths: 36.0,
        targetEq: 75.0,
        rebalBand: 5.0,
        maxSkimPctOfEq: 10.0,
        maxBearRefillPctOfEq: 20.0,
    };
</script>

<main>
    <h1>Ruhestand Planer (Rust Engine Demo)</h1>

    <div class="intro">
        <p>Dies ist eine Demonstration der neuen Rust/WASM Simulations-Engine.</p>
    </div>

    <!-- Existing input forms would act here -->

    <section class="simulation-section">
        <MonteCarlo input={simulationInput} />
    </section>
</main>

<style>
    main {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        font-family: system-ui, -apple-system, sans-serif;
    }
    h1 {
        color: #333;
    }
    .intro {
        margin-bottom: 2rem;
        color: #666;
    }
</style>
