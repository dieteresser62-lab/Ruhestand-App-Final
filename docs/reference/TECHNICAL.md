# Technische Dokumentation – Ruhestand-App-Final

Dieses Dokument beschreibt die Architektur und zentrale Datenflüsse der Ruhestand-App. Die Anwendung besteht aus zwei getrennten Oberflächen (Balance & Simulator) und einer gemeinsam genutzten Engine.

**Dokumentrolle:** Operative Entwickler-Referenz für aktuelle Modulzuständigkeiten, Datenflüsse und Laufzeitverhalten.
**Abgrenzung:** Vertiefte fachliche Herleitungen, Marktvergleiche und Forschungsabgleich stehen in `ARCHITEKTUR_UND_FACHKONZEPT.md`.

---

## Architekturüberblick

### Komponenten

| Komponente | Dateien | Zweck |
|------------|---------|-------|
| Balance-App | `Balance.html`, `app/balance/*.js`, `css/balance.css` | Jahresabschluss, Liquiditäts- und Entnahmeplanung, Diagnosen, Ausgaben-Check mit Jahreshistorie |
| Simulator | `Simulator.html`, `app/simulator/*.js`, `simulator.css` | Monte-Carlo-Simulationen, Parameter-Sweeps, Pflegefall-Szenarien, Pflegebucket-Wirklogik |
| Profil/Verbund | `index.html`, `app/profile/*.js`, `app/tranches/*.js` | Profilverwaltung, Profilverbund, Tranchen-Sync, Pflegebucket-Definition |
| Shared | `app/shared/*.js` | Gemeinsame Formatter, Feature-Flags, CAPE-Helfer, Persistenz-Facade |
| Engine | `engine/` (ESM) → `engine.js` | Validierung, Marktanalyse, Spending- und Transaktionslogik |

Alle Skripte sind ES6-Module. Die Engine wird per `build-engine.mjs` mit esbuild (oder Modul-Fallback) gebündelt und stellt eine globale `EngineAPI` bereit.  
Für CI/Release ist Strict-Mode vorgesehen (`npm run build:engine:strict`), der ohne `esbuild` fehlschlägt.

### Tauri Desktop-Build und Live-Daten

Die Desktop-App lädt das Frontend direkt aus `dist/` (`src-tauri/tauri.conf.json -> build.frontendDist = "../dist"`). Für Windows ist der praktische Build-Pfad:

1. `build-tauri.bat`
2. `scripts/build-tauri.ps1`
3. `npm run sync-dist`
4. `npm run tauri:build`
5. Kopie der erzeugten Binary nach `RuhestandSuite.exe`

Wichtig für Live-Daten:

* ETF-Kurse laufen in der EXE über den in `src-tauri/src/lib.rs` gestarteten lokalen Yahoo-Proxy auf `127.0.0.1:8787`.
* Inflation (ECB, World Bank, OECD) und CAPE (`r.jina.ai` -> Yale/Mirror) laufen in der EXE direkt aus der Tauri-WebView.
* Die dafür nötigen Ziele stehen explizit in `src-tauri/tauri.conf.json` unter `app.security.csp.connect-src`.
* Web-Worker laufen aus dem gebündelten Frontend und bleiben über `worker-src 'self' blob:` erlaubt.
* `dangerousDisableAssetCspModification` ist bewusst gesetzt, damit die handgepflegte CSP aus `tauri.conf.json` unverändert gilt und nicht durch Tauri-Asset-Rewrites erweitert wird. Breite Einträge wie `unsafe-inline`, `unsafe-eval` und Inline-Styles bleiben nur wegen bestehender HTML-/Modul-Patterns erlaubt und sind kein Freibrief fuer neue externe Quellen.
* In der Browser-Variante wird der Yahoo-Proxy weiterhin über `start_suite.cmd` / `start_suite.ps1` gestartet und benötigt dafür Node.js.

**Tauri-Yahoo-Proxy-Contract (`src-tauri/src/lib.rs`):**

* Bindet nur auf `127.0.0.1:8787`.
* Endpunkte:
  * `/quote?symbol=...` -> aktueller Preis, bevorzugt Yahoo Chart API, Fallback Quote API.
  * `/search?q=...` -> Yahoo-Suche.
  * `/chart?symbol=...&period1=...&period2=...&interval=...` -> Yahoo Chart API.
* CORS erlaubt Tauri-Urspruenge (`null`, `tauri://localhost`, `https://tauri.localhost`, `http://tauri.localhost`) sowie lokale Entwicklungsurspruenge auf `localhost`/`127.0.0.1`. Externe Origins erhalten `Access-Control-Allow-Origin: null`.
* Fehler werden als JSON gemeldet: fehlende Parameter mit `400`, nicht gefundene Preise mit `404`, Upstream-/JSON-Fehler mit `502`.
* London-Preise in GBp/GBX werden fuer `.L`-Symbole auf Pfund normalisiert.
* Wenn Port `8787` bereits belegt ist, wird der Proxy-Start geloggt abgebrochen; die Tauri-App selbst startet weiter, ETF-Live-Kurse koennen dann aber nicht ueber den integrierten Proxy geladen werden.

**Manuelle Desktop-Smoke-Checks nach `build-tauri.bat`:**

Nach einem erfolgreichen manuellen EXE-Build sollte die erzeugte `RuhestandSuite.exe` kurz geprueft werden:

1. EXE startet ohne separates lokales Webserver- oder Node-Proxy-Setup.
2. Startseite/Profilverwaltung laedt.
3. Balance-App laedt, fuehrt eine Aktualisierung aus und zeigt keine Asset-/Engine-Fehler.
4. Simulator laedt; ein kleiner Monte-Carlo- oder Backtest-Smoke-Lauf startet ohne Worker-Fehler.
5. Tranchenmanager laedt leere oder synthetische Tranchen ohne Fehler.
6. Handbuch laedt.
7. Optionaler Live-Daten-Check mit Internet: ETF-Kurs via integriertem Proxy, Inflation/CAPE via freigegebene Endpunkte.
8. Optionaler Offline-Check: Ohne Internet darf die App nicht hart abbrechen; Live-Daten-Fetches muessen als Fallback/Warnung degradieren.
9. Keine Log-/Console-Hinweise auf fehlende `dist`-Assets oder blockierte Worker.

---

## Engine

Die Engine besteht aus zentralen ES-Modulen, die von `build-engine.mjs` zu `engine.js` zusammengeführt werden. Die Reihenfolge entspricht zugleich der internen Verarbeitungskette:

1. **`engine/validators/InputValidator.mjs`** – prüft sämtliche Eingaben auf Vollständigkeit, Wertebereiche und Konsistenz. Liefert strukturierte Fehlermeldungen.
2. **`engine/analyzers/MarketAnalyzer.mjs`** – klassifiziert Marktregime, berechnet Drawdowns und leitet Kennzahlen für Guardrails ab. Additiv liefert `engine/analyzers/regime-signals.mjs` kontinuierliche Signal-Severities fuer Drawdown, CAPE und Runway. Die Stuetzwerte bleiben richtungssensitiv: aufsteigende Skalen wie Drawdown und absteigende Skalen wie Runway duerfen nicht per `Math.min`/`Math.max` sortiert werden.
   - `engine/planners/vpw-return-policy.mjs` kapselt die erwartete VPW-Realrendite. `legacy_step` bleibt Default; `cape_continuous` ist ein expliziter Config-Modus mit robuster CAPE-Normalisierung, separaten Aktien-/Portfolio-Clamps und Diagnosefeldern.
3. **`engine/planners/SpendingPlanner.mjs`** – orchestriert die Entnahmeplanung aus State, Alarm, initialer Flex-Rate, Policy-Pipeline, Entnahmeberechnung, Result und Diagnose. Reine Policy-Helper liegen in `engine/planners/spending-policy-helpers.mjs`, die vermögensbasierte Reduktionsdämpfung in `engine/planners/wealth-reduction.mjs`, Alarm-Aktivierung und Deeskalation in `engine/planners/alarm-policy.mjs`, Flex-Rate/S-Kurve/harte Caps in `engine/planners/flex-rate-policy.mjs`, Mindest-Flex in `engine/planners/minimum-flex-policy.mjs`, Flex-Budget-Cap/Recharge/Min-Rate in `engine/planners/flex-budget-policy.mjs`, Recovery-/Caution-Guardrails und Budget-Floor in `engine/planners/spending-guardrails.mjs`, finale Rate-Limits in `engine/planners/final-rate-policy.mjs`, die stabile Post-Flex-Policy-Reihenfolge in `engine/planners/spending-policy-pipeline.mjs`, finale Diagnose- und Runway-Ziel-Strukturen in `engine/planners/spending-diagnosis.mjs`.

### Flex-Reduktion: Reihenfolge der Caps/Limits

Das folgende Flussdiagramm zeigt die Reihenfolge, in der die Flex-Rate angepasst und begrenzt wird. Entscheidend ist die Abfolge im `SpendingPlanner` (siehe `determineSpending()`):

```plantuml
@startuml
start
:Start: Inputs + lastState;
:State initialisieren/laden;
:Alarmbedingungen evaluieren\n(Quote, Drawdown, Runway,\nVermögensfaktor);
:Wealth-Reduction-Faktor\n(aus Entnahmequote);
if (Alarm aktiv?) then (ja)
  :Alarm-Pfad:\n- Zielkürzung skalieren\n  (min. 35%)\n- Vermögensdämpfung\n- Alarm-Minrate halten;
else (nein)
  :Normal-Pfad:\n- Bear-Reduktion\n  (vermögensadj.)\n- Glättung (alpha)\n- Delta-Caps\n  (Up/Down)\n- Flex-Anteil S‑Kurve\n- Harte Caps\n  (Bär/Runway);
endif
if (Alarm aktiv?) then (ja)
  :Guardrails überspringen;
else (nein)
  :Guardrails anwenden\n- Recovery-Cap\n- Budget-Floor\n- weitere Guardrails;
endif
:Mindest-Flex anwenden\n- nur als Rate\n- keine Bedarfs-Mutation;
:Flex-Budget Cap\n- Euro-Topf (Cap)\n- Min-Rate;
:Finale Rate-Limits\n(Delta Caps + Final-Guardrail);
:Entnahme berechnen\n+ Quantisierung;
:Finale Flex-Rate ableiten\n& Ergebnisse bauen;
stop
@enduml
```

`applyMinimumFlexFloor()` nutzt nur Spending-Layer-Daten. Der Schritt blockiert eine Anhebung bei aktivem Alarm, bei unzureichendem Gesamtvermoegen fuer Netto-Floor plus Mindest-Flex oder wenn der Mindest-Runway nach dieser Zahlung nicht mehr aus dem Gesamtvermoegen wiederherstellbar waere. Niedrige aktuelle Liquiditaet allein ist kein Blocker, solange der Gesamtvermoegens-Proxy ausreichend ist. Flex-Budget-Cap und finale Rate-Limits laufen danach weiter und duerfen die Anhebung begrenzen.
4. **`engine/transactions/TransactionEngine.mjs`** – leitet Ziel-Liquidität ab, steuert Puffer-Schutz und führt **Gap-basiertes Surplus-Rebalancing** (Investition nur bis Ziel-Allokation) durch.
   - Unterteilt in `engine/transactions/transaction-action.mjs`, `transaction-opportunistic.mjs`, `transaction-surplus.mjs`, `sale-engine.mjs`, `three-bucket-logic.mjs` und `transaction-utils.mjs` für Entscheidungslogik, Rebalancing-Pfade, Verkauf/Steuern, 3-Bucket-Jilge-Bond-Logik und Hilfsfunktionen.
   - `transaction-utils.mjs` stellt neben dem kompatiblen Zahlenwert auch `calculateTargetLiquidityDetails()` bereit. Die Details enthalten `runwayTargetDiagnostics` mit Rohziel, effektivem Ziel, Severity, Fallback-Grund und harter Mindest-Runway. Die Zielwert-Glaettung ist per `CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED` geschaltet und bleibt im Default deaktiviert.
   - Detailtranchen-Verkaeufe geben `trancheId` und `sourceProfileId` in `breakdown[]` weiter, damit mehrprofilige Tranchen spaeter eindeutig und ohne Cost-Basis-Vermischung reduziert werden koennen.
   - Bond-/Anleihen-Tranchen werden ueber Typ oder Kategorie erkannt und im Modus `3_bucket_jilge` als defensiver Zwischenpuffer fuer schlechte Jahre und Bond-Refill in guten Jahren verwendet.
5. **`engine/core.mjs`** – orchestriert die oben genannten Module, exponiert `EngineAPI` (Version 31) und erzeugt Diagnose-/UI-Strukturen.
6. **`engine/tax-settlement.mjs`** – zentrale Jahressteuer-Settlement-Logik (Verlusttopf, SPB, finale Steuer).
7. **`engine/config.mjs`** – zentrale Konfiguration (Schwellenwerte, Regime-Mapping, Profile). Generiert zur Build-Zeit eine eindeutige Build-ID.
8. **`engine/errors.mjs`** – Fehlerklassen (`AppError`, `ValidationError`, `FinancialCalculationError`).


### Datenfluss innerhalb der Engine

```
Input → InputValidator.validate
      → MarketAnalyzer.analyzeMarket
      → SpendingPlanner.determineSpending
      → TransactionEngine.calculateTargetLiquidity + determineAction
      → tax-settlement (Jahresaggregation von Roh-Steuerdaten)
      → Ergebnisobjekt (UI-Daten, Diagnose, neuer State)
```

Die Engine gibt strukturierte Ergebnisse zurück. Fehler werden als `AppError`/`ValidationError` transportiert und von den UIs aufgefangen.

---

## Balance-App

**Pfadkonvention:** Die Balance-Module liegen unter `app/balance/`. Profilverbund-/Profilmodule liegen unter `app/profile/`, Shared-Utilities unter `app/shared/`.

### Modulübersicht

* `app/balance/balance-config.js` – Konfiguration, Fehlertypen, Debug-Utilities.
* `app/balance/balance-utils.js` – Formatierungs- und Hilfsfunktionen (shared-formatting, Threshold-Zugriff).
* `app/balance/balance-storage.js` – Balance-Persistenz ueber `app/shared/persistence-facade.js` und Jahresabschluss-Snapshots ueber das interne Snapshot-Archiv.
* `app/balance/balance-reader.js` – liest Benutzerinputs aus dem DOM und setzt UI-Side-Effects.
* `app/balance/balance-health-bucket.js` – liest die Profildefinition des Pflegebuckets und erzeugt eine reine Diagnose zu Brutto-Liquidität, Pflege-Zweckbindung, operativer Liquidität, Zieldeckung und Freigabestatus.
* `app/balance/balance-renderer.js` – Darstellung der Ergebnisse (Summary, Guardrails, Entscheidungsdiagnose, Toasts, Themes).
* `app/balance/balance-binder.js` – Event-Hub mit Tastenkürzeln, Import/Export, Snapshots, Debug-Modus.
* `app/balance/balance-main.js` – Orchestrator: initiiert Module, führt `update()` aus und spricht `EngineAPI` an.
* `app/balance/balance-update-pipeline.js` / `balance-action-postprocessor.js` – Pipeline-Helfer fuer Last-State-Vorbereitung, Action-/3-Bucket-Postprocessing, Renderer-/Diagnose-Payload, Persistenz und Ausgabenbudget.
* `app/balance/balance-annual-marketdata.js` – Online-Marktdaten für Jahreswechsel (Inflation, ETF, CAPE inkl. Fallback-Kette).
* `app/balance/balance-annual-orchestrator.js` / `app/balance/balance-annual-modal.js` – nicht-blockierende Jahreswechsel-Pipeline und Ergebnisprotokoll.
* `app/balance/balance-expenses.js` – Controller/Fassade fuer den Ausgaben-Check: Initialisierung, Event-Wiring, CSV-Import-Ablauf und Jahrumschaltung.
* `app/balance/balance-expenses-storage.js` / `balance-expenses-csv.js` / `balance-expenses-metrics.js` / `balance-expenses-renderer.js` – Storage, CSV-Parsing, Kennzahlen und DOM-Rendering des Ausgaben-Checks.

### Ablauf einer Aktualisierung

1. `balance-binder.js` reagiert auf Eingaben (Formular, Tastenkürzel, Buttons) und ruft `debouncedUpdate()` auf.
2. `balance-reader.js` sammelt alle Inputs und gibt ein strukturiertes Objekt zurück.
3. `balance-update-pipeline.js` bereitet den Engine-Last-State vor, inklusive Guardrail-Reset und Tax-State-Erhalt.
4. `balance-main.js` reicht die Inputs an `EngineAPI.simulateSingleYear()` weiter.
5. `balance-action-postprocessor.js` merged Profilverbund-Actions und kapselt Single-3-Bucket-Postprocessing.
6. `balance-renderer.js` aktualisiert UI-Komponenten und Statusanzeigen mit dem Pipeline-Payload.
7. `balance-update-pipeline.js` kapselt Diagnose-Anreicherung, Persistenzentscheidung und Ausgabenbudget.

### Entscheidungsdiagnose (Balance)

Die Balance-App bezeichnet das Diagnose-Panel als `Entscheidungsdiagnose`, um die regelbasierte, pruefbare Logik klar von einer Blackbox-Interpretation abzugrenzen.

* `balance-diagnosis-format.js` normalisiert Guardrail-Zustaende und fuegt Grenzfallhinweise hinzu. Exakt erfuellte Mindestschwellen werden als `ok` behandelt und mit Texten wie `Exakt auf Mindestniveau` erklaert.
* `balance-diagnosis-transaction.js` rendert Transaktionsstatus, Schwellen und Erklaerkarten wie `Warum kein Goldkauf?`, wenn Zielwerte sichtbar sind, aber keine Aktion ausgelöst wird.
* `balance-diagnosis-keyparams.js` trennt Dynamic-Flex-Begriffe in `VPW-Rahmen`, `Statischer Flex-Bedarf`, `Flex freigegeben` und `Nicht genutzter Rahmen`, damit ein hoher VPW-Rahmen nicht als Konsumauftrag missverstanden wird.
* Regime-Smoothing-Felder werden als Erklaerung, nicht als Blackbox-Score gerendert: `runwayTargetSmoothing` zeigt Rohziel, Effektivziel, Drawdown-Severity, Stuetzwerte, Fallback und harte Mindestgrenze. Fallbacks werden nicht als angewandte Glaettung beschriftet.
* `balance-renderer-action.js` zeigt weiterhin Quellen und Verwendungen, ergänzt aber eine aggregierte Sicht `Plan nach Zweck` fuer Liquiditaet, Gold, Aktien, Geldmarkt, Bonds, Steuer und Rest/Puffer.

### Ausgaben-Check (Balance)

Der Ausgaben-Check verwendet einen separaten lokalen Datenspeicher (`balance_expenses_v1`) mit Jahrescontainer. Der Controller liegt in `app/balance/balance-expenses.js`; Storage-, CSV-, Metrik- und Rendering-Details sind in `balance-expenses-*` Module ausgelagert:

* `years[YYYY].months[1..12].profiles[profileId]` speichert importierte Kategorien je Monat/Profil.
* `activeYear` steuert, welches Jahr im Tab angezeigt wird.
* Beim Jahresabschluss wird der Ausgaben-Check auf `activeYear + 1` gestellt; bestehende Jahresdaten bleiben unverändert als Historie erhalten.

Die Kennzahlen im Tab berechnen sich wie folgt:

* `Monatssumme`: Summe aller Profil-Ausgaben des Monats.
* `Jahresrest`: `annualBudget - annualUsed`.
* `Hochrechnung`: bei 1 Datenmonat `Ø/Monat * 12`, ab 2 Datenmonaten `Median/Monat * 12`.
* `Soll/Ist`: basiert auf importierten Monaten (`monthlyBudget * monthsWithData`) statt auf Kalendermonaten.

### Jahreswechsel mit Auto-CAPE

Der Jahreswechsel ruft CAPE automatisiert und fehlertolerant ab:

* Quelle/Fallback: Yale (Primary) -> Mirror (`shillerdata`) -> letzter gespeicherter Wert.
* Requests laufen mit eigenem Timeout; Abort-/Timeout-Fehler werden in nutzbare Statusmeldungen übersetzt.
* Persistente Meta-Felder: `capeAsOf`, `capeSource`, `capeFetchStatus`, `capeUpdatedAt`.
* Der Ablauf ist non-blocking: fehlende CAPE-Daten werden als Warnung protokolliert, der Jahreswechsel läuft weiter.
* Vertragsdetails und Fehlerszenarien: `docs/internal/archive/2026-dynamic-flex/CAPE_AUTOMATION_CONTRACT.md`.

### Pflegebucket-Diagnose (Balance)

Die Balance-App ist aktuell Consumer der Profildefinition, aber nicht der operative Freigabeort des Pflegebuckets. `balance-reader.js` liest die gespeicherte Definition aus `profile_health_bucket`; `balance-health-bucket.js` berechnet daraus Diagnosewerte:

* `grossLiquidity`: operative Liquidität plus gesperrter Pflegebucket.
* `lockedAmount`: als Pflege-Zweckbindung reservierter Betrag.
* `lockedFromMoneyMarket` und `lockedFromCash`: Herkunft der Reserve, soweit aus Profil-/Tranchenwerten ableitbar.
* `operativeLiquidity`: frei verfügbare Liquidität nach Abzug der Zweckbindung.
* `targetInflationAdjusted`, `coveragePct`, `gap`: inflationsbezogene Zieldeckung.
* `releasePolicy: 'diagnostic_only'`, `releaseAllowed: false`, `releasedAmount: 0`: expliziter Contract, dass Balance den Bucket in Version 1 nicht automatisch entsperrt.

Diese Grenze ist fachlich gewollt: Balance kennt derzeit keinen belastbaren aktuellen Pflegegrad-Ist-Zustand. Reale Pflegeausgaben werden weiterhin über Bedarfswerte/Jahresplanung abgebildet; der Bucket bleibt transparent als Zweckbindung sichtbar.

---

## Simulator

**Pfadkonvention:** Die Simulator-Module liegen unter `app/simulator/`. Profil-/Verbundmodule liegen unter `app/profile/`, gemeinsame Utilities unter `app/shared/`, Tranchen-Status unter `app/tranches/`.

### Wichtige Module

* `app/simulator/simulator-main.js` – zentrale Steuerung, Parameter-Sweep-Logik, Self-Tests.
* `app/simulator/simulator-monte-carlo.js` – UI-Koordinator für Monte-Carlo (liest Inputs, setzt Progress, orchestriert Runner/Analyzer) inkl. Worker-Orchestrierung.
* `app/simulator/mc-run-context.js` – DOM-freie Chunk-Kontext-Erzeugung fuer Monte-Carlo (RunRange, RNG-Modus, Buffers, Progress-Intervall, LogIndexSet und Sampling-Konfiguration).
* `app/simulator/mc-year-sampling.js` – DOM-freie Startjahr-/CAPE-Sampling-Logik fuer Monte-Carlo inklusive FILTER-/RECENCY-CDF, Uniform-Fallback und Estimated-History-Filter.
* `app/simulator/mc-life-events.js` – DOM-freie Life-State-Initialisierung fuer Monte-Carlo (Care-Meta, Partnerstatus, Care-RNGs, Alive-Initialwerte, HouseholdContext); per-year Life-Events bleiben aus Performance-Gruenden im Runner-Hot-Path.
* `app/simulator/mc-stress-tracker.js` – DOM-freie Stress-Metrik-Kapselung fuer Monte-Carlo (Stress-Drawdown, Quote-Above-4.5, Cut-Years, Real-CaR, Recovery-Years) bei stabilen Worker-Buffer-Namen.
* `app/simulator/mc-log-builder.js` – DOM-freie Monte-Carlo-Logzeilen-Builder fuer Ruin-, Jahres- und Todesfall-Logs mit zentralen Alive-/Care-Feldern.
* `app/simulator/mc-run-metrics.js` – DOM-freie Run-Ende-Metrikfortschreibung fuer Monte-Carlo (Ergebnisbuffer, Pflege-Listen, Pflegebucket-Listen, Safety-Run-Zaehler, Worst-Runs, `runMeta`).
* `app/simulator/monte-carlo-runner.js` – DOM-freie Simulation (Jahresschleife, Pflege-KPIs) auf Basis von `simulator-engine-wrapper.js`. Unterstützt nun auch eine **Ansparphase** mit dynamischem Übergang in die Rentenphase (via `effectiveTransitionYear`).
* `app/simulator/dynamic-flex-longevity-contract.js`, `dynamic-flex-longevity-horizon.js` und `dynamic-flex-runner-horizon.js` – DOM-freier Contract, Horizon-Adjustment und Runner-Resolver fuer konservativere Dynamic-Flex-Langlebigkeitsannahmen.
* `app/simulator/monte-carlo-ui.js` – UI-Fassade für Progressbar/Parameter-Lesen; erlaubt Callbacks ohne DOM-Leaks.
* `app/simulator/scenario-analyzer.js` – wählt während der Simulation 30 Szenarien (Worst, Perzentile, Pflege, Zufall) aus.

* `app/simulator/simulator-engine-wrapper.js` – Facade für Engine-Aufrufe (verwendet `simulator-engine-direct.js`).
* `app/simulator/simulator-engine-direct.js` – Direkte Anbindung an die EngineAPI; nutzt den Pflegebucket vor Forced-Sale-Liquiditätsdeckung.
* `app/simulator/simulator-health-bucket.js` – DOM-freie Pflegebucket-Logik für Trigger, Deckungsbedarf, Bucket-Verbrauch, Verzinsung und inflationsindexierte Diagnosen.
* `app/simulator/simulator-year-portfolio.js` / `simulator-household-pension.js` / `simulator-engine-input.js` / `simulator-accumulation-year.js` / `simulator-tax-recompute.js` / `simulator-forced-sale.js` / `simulator-bond-refill.js` / `simulator-year-result.js` – DOM-freie Hilfsmodule fuer Markt-/Portfoliofortschreibung, Renten-/Haushaltsberechnung, EngineAPI-Input-Mapping, Ansparjahre, Tax-Recompute, Forced-Sale-Liquiditaetsdeckung inklusive Payout-Fallback, Bond-Refill und finalen Rueckgabe-/Logdatenaufbau innerhalb eines Simulationsjahres. `simulator-year-result.js` erzeugt dabei auch die flachen Entnahme-/Payout-/VPW-Logfelder fuer Scenario- und Backtest-Ausgaben.
* `app/simulator/simulator-portfolio.js` – Initialisierung, Portfolio-Berechnungen, Stress-Kontexte.
* `app/simulator/simulator-results.js` – Aggregiert MC-Ausgaben und delegiert an `results-metrics.js` / `results-renderers.js` / `results-formatting.js`.
* `app/simulator/simulator-sweep.js` – Sweep-Logik inkl. Whitelist/Blocklist, Heatmap und Worker-Orchestrierung.
* `app/simulator/sweep-runner.js` – DOM-freier Sweep-Runner (kombinierbar in Worker-Jobs).
* `app/simulator/simulator-optimizer.js` – Auto-Optimize-Kernlogik; Kandidatensuche und Bewertung laufen mehrphasig über LHS-Kandidaten, Quick-Filter, volle Evaluation, lokale Verfeinerung und Validierung.
* `app/simulator/auto_optimize.js` – Auto-Optimize-Orchestrator inkl. Worker-Parallelisierung, Kandidatenbewertung und Champion-Auswahl.
* `app/simulator/auto_optimize_ui.js` und `app/simulator/auto-optimize-{presets,param-meta,config-ui,renderer,apply}.js` – Auto-Optimize UI-Fassade, Preset-Konfigurationen, Config-Parsing, Ergebnis-Rendering und Champion-Apply-Flow (1-7 dynamische Parameter).
* `app/simulator/simulator-heatmap.js` – SVG-Rendering für Parameter-Sweeps inkl. Warnhinweise bei Verstößen.
* `app/simulator/simulator-utils.js` – Zufallszahlengenerator, Statistikfunktionen, Parser (Formatierung über `app/shared/shared-formatting.js`).
* `app/shared/shared-formatting.js` – gemeinsame Formatter für Balance und Simulator (Währung, Prozent, Monate).
* `app/shared/persistence-facade.js` – synchrone In-Memory-Persistenz-Fassade mit Runtime-Adapter-Aufloesung, debounced/serialisiertem Flush, Legacy-Migration und Statusauskunft.
* `app/shared/persistence-adapter-localstorage.js` – Legacy-Adapter, der localStorage an das Adapter-Interface anbindet.
* `app/shared/persistence-adapter-indexeddb.js` – Browser-Adapter fuer Phase 2; im Browser ist IndexedDB die lokale Source of Truth, sofern verfuegbar.
* `app/shared/persistence-adapter-tauri.js` – Tauri-Dateiadapter fuer Phase 3; liest/schreibt `ruhestand_suite_data.json` ueber Custom Rust Commands.
* `app/shared/persistence-key-policy.js` – Allowlist fuer Erstmigration, Restore und Import aus Legacy-/Fremdquellen.
* `app/shared/persistence-backup.js` – Zentrales Modul fuer Komplett-Export und Komplett-Import der Persistenzdaten mit Prototype-Pollution-Haertung.
* `app/shared/runtime-env.js` – Laufzeiterkennung fuer Browser/Tauri-Featureauswahl.
* `app/simulator/simulator-data.js` – Historische Daten (inkl. 1925-1949 Schwarze-Schwan-Erweiterung), Mortalitäts- und Stress-Presets.

Browser-Persistenz seit Phase 2:

* App-Einstiegspunkte rufen `PersistenceFacade.init()` vor fachlichen Storage-Reads auf.
* Im Browser wird automatisch IndexedDB genutzt; beim ersten Start migriert die Facade erlaubte Legacy-Keys aus `localStorage`.
* IndexedDB nutzt die Datenbank `ruhestand-suite` in Version 2 mit den Stores `kv`, `metadata` und `snapshots`. Live-Daten liegen in `kv`; Jahresabschluss-Snapshots liegen im separaten Store `snapshots`.
* Nach erfolgreicher Migration markieren `ruhestandsapp_migrated_to_target`, `ruhestandsapp_migration_completed_at` und `ruhestandsapp_migration_checksum` den Legacy-Stand.
* Ist IndexedDB spaeter leer, obwohl der Marker vorhanden ist, wird nicht still aus altem `localStorage` zurueckmigriert; die Facade setzt stattdessen eine Migration-Warnung.
* Nach `PersistenceFacade.init()` wird `persistence:initialized` gesendet, damit frueh instanziierte Module wie Feature-Flags aus dem aktiven Backend neu laden koennen.
* Persistenz-Record-Maps werden defensiv als Null-Prototyp-Objekte gefuehrt, damit Daten-Keys wie `__proto__` nicht auf Objekt-Prototypen wirken.
* Tauri nutzt seit Phase 3 JSON-Dateien im App-Datenverzeichnis. Live-Daten liegen in `ruhestand_suite_data.json`; Jahresabschluss-Snapshots liegen getrennt in `ruhestand_suite_snapshots.json` und werden ueber das Adapter-Target `snapshots` geladen/gespeichert. Die Rust-Seite stellt `load_app_state`, `save_app_state`, `quarantine_app_state` und `confirm_app_close` bereit.
* Beim ersten Tauri-Start migriert die Facade erlaubte Legacy-Keys aus der WebView-`localStorage`-Ablage in die JSON-Datei und setzt denselben Migrationsmarker mit Target `tauri-json-file`.
* Beim nativen Fensterschluss verhindert Rust das sofortige Schliessen, sendet ein Frontend-Event, wartet auf den Facade-Flush und schliesst nach `confirm_app_close`. Um Hänger auf Seiten ohne Persistenz (z. B. Handbuch) oder bei WebView-Fehlern zu vermeiden, gibt es einen 3-Sekunden-Fallback in Rust, der das Schließen erzwungen durchführt.
* Korruptes Tauri-JSON wird quarantiniert; die Facade startet mit leerem Cache und Recovery-Warnung statt eine stille Rueckmigration oder einen White-Screen zu erzeugen.

Snapshot-Archiv seit Jahresabschluss-Snapshot-Slice:

* `app/shared/snapshot-archive.js` definiert das kanonische Schema `persistence-records-v1` mit `schemaVersion`, `id`, `kind`, `createdAt`, `label`, `activeProfileId`, `recordCount`, `records` und `restoreScope`.
* `listSnapshots()` liefert nur Indexdaten ohne `records`; Vollpayloads werden erst per `readSnapshot(id)` gelesen.
* Capture schliesst alte Snapshot-Keys aus, damit Archivdaten nie in neue Live-Snapshots eingebettet werden.
* Standard-Restore schreibt nur erlaubte Live-Keys zurueck, erhaelt Profil-Registry und Snapshot-Historie, setzt das aktive Profil und bricht ab, wenn `snapshot.activeProfileId` in der aktuellen Registry nicht mehr existiert.
* Legacy-Snapshots mit Prefix `ruhestandsmodell_snapshot_` werden in das kanonische Archiv migriert. Eintraege ohne eindeutige aktive Profilzuordnung bleiben lesbar, werden aber nicht als Standard-Restore-faehig angezeigt.

### Dynamic-Flex (VPW) Pipeline

Dynamic-Flex ist entlang der Simulator-Pipeline konsistent aktiviert:

* UI/Profile: `app/simulator/simulator-main-dynamic-flex.js`, `app/simulator/simulator-profile-inputs.js`.
* Input-Layer: `app/simulator/simulator-portfolio-inputs.js` normalisiert `dynamicFlex`, `horizonYears`, `horizonMethod`, `survivalQuantile`, `goGoMultiplier` sowie die Longevity-Felder `longevityMode`, `longevityQuantileShift`, `longevityRelativePct` und `longevityBufferYears`.
* Backtest/MC: `app/simulator/mc-run-context.js` bereitet den Chunk-Kontext vor; `app/simulator/mc-life-events.js` initialisiert den Life-State; `app/simulator/mc-stress-tracker.js` kapselt Stress-Metriken; `app/simulator/mc-log-builder.js` baut Monte-Carlo-Logzeilen; `app/simulator/mc-run-metrics.js` schreibt Run-Ende-Metriken fort; `app/simulator/monte-carlo-runner.js` berechnet den Raw-Horizont pro Simulationsjahr neu (Alter steigt im Loop) und wendet Longevity-Adjustment danach genau einmal auf den finalen Haushalts-Horizont an.
* Worker-Parität: `workers/mc-worker.js` erhält dieselben Dynamic-Flex Inputs; Seed/Chunking bleiben deterministisch.
* Longevity-Modi: `none` ist Default; `quantile_shift`, `relative_horizon_buffer` und `buffer_years` sind explizite konservative Modi. Bei Paaren wird erst der Joint-Horizon bestimmt und danach einmal gepuffert. Beim Joint-to-Single-Uebergang kann eine lineare Floor-Glaettung grosse Horizontspruenge im MC-Lauf dämpfen und diagnostizieren.
* Sweep/Heatmap: `app/simulator/sweep-runner.js` validiert Invariants; invalid Kombinationen werden markiert statt gerechnet. Longevity-Werte werden aus den Basisinputs geerbt, aber in Version 1 nicht als Sweep-Variationsparameter zugelassen.
* VPW-Return-Policy: `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY` akzeptiert `legacy_step` und `cape_continuous`. Der Default bleibt `legacy_step`; Continuous wird nicht ueber Profile oder Auto-Optimize optimiert und muss bewusst per Config aktiviert werden.
* Auto-Optimize: Dynamic-Flex-Basisparameter `horizonYears`, `survivalQuantile` und `goGoMultiplier` koennen optimiert werden; Longevity-Felder bleiben fixe Sicherheitsparameter und werden weder als Parameteroption noch per Champion-Apply ueberschrieben.
* Diagnose: `result.ui.vpw` enthaelt neben Rate und Flex-Betrag auch `returnPolicy`, `expectedReturnSource`, `capeInputStatus`, `expectedRealReturnRaw`, `expectedRealReturnClamped`, `safeRealReturn`, `safeRealReturnSource`, `horizonYearsRaw`, `longevityMode`, angewandte Shifts/Puffer, Clamp-Grund und Transition-Smoothing-Hinweise.

**Monte-Carlo Startjahr-Sampling**
* Default ist uniformes Sampling über alle historischen Startjahre.
* Optional: `FILTER` (harte Startjahr-Grenze) oder `RECENCY` (Half-Life-Gewichtung).
* Die Gewichtung beeinflusst Startjahr und laufende Jahresdaten (Regime/Block/IID).
* CAPE-Sampling hat Vorrang; wenn aktiv, wird die Startjahr-Gewichtung ignoriert.

### Worker-Architektur (Monte Carlo, Sweep, Auto-Optimize)

Die Parallelisierung basiert auf Web-Workern und einer gemeinsamen Pool-Schicht:

* `workers/worker-pool.js` verwaltet einen Pool fester Worker-Instanzen, verteilt Jobs und ersetzt defekte Worker.
* `workers/mc-worker.js` hostet die DOM-freien Runner fuer Monte Carlo und Sweep (`monte-carlo-runner.js`, `sweep-runner.js`) und verarbeitet Job-Typen (`init`, `job`, `sweep-init`, `sweep`).
* `simulator-monte-carlo.js` orchestriert die Worker-Jobs, führt Chunking (Zeitbudget) durch, aggregiert Ergebnisse und fällt bei Stalls auf seriell zurück.
* `simulator-sweep.js` verteilt Parameter-Kombinationen auf Worker-Chunks und aggregiert Sweep-Metriken (Fallback seriell).
* `auto_optimize.js` bewertet Kandidaten in Promise-Batches; `auto-optimize-worker.js` nutzt denselben `workers/mc-worker.js`-Jobtyp `job` wie Monte Carlo, merged MC-Buffers/Heatmap/Totals/Listen selbst und faellt bei Worker-Fehlern auf seriell zurueck.

**Determinismus/Seeding**
* Jeder Run erhält einen deterministischen Seed (`per-run-seed`), damit Chunking/Worker keine Ergebnisse verändert.
* `legacy-stream` bleibt seriell, da Chunking dort den RNG-Stream verändern würde.

**Logs und Szenarioauswahl**
* Worker-Läufe sammeln nur aggregierte Daten; detaillierte Logs werden in einem zweiten, seriellen Pass für ausgewählte Runs erstellt.
* `ScenarioAnalyzer` wählt Worst-/Perzentil-/Pflege- und Zufalls-Szenarien aus.
* Monte-Carlo-Scenario-Logs und Backtest-Logs nutzen dieselben additiven Entnahme-/Payout-/VPW-Felder (`entnahme_plan`, `entnahme_effektiv`, `vpw_total`, `vpw_dynamic_flex`, `static_flex_baseline`, `liq_before_payout`, `liq_after_payout`, `liq_after_interest`, `portfolio_total_before_payout`, `portfolio_total_end`). Renderer zeigen diese Spalten nur im detaillierten Logmodus; die Normalansicht bleibt unveraendert.
* Im detaillierten Logmodus werden VPW-Return-Policy-Felder synchron angezeigt: `RetPol`, `RetSrc`, `CAPESt`, `ERRaw`, `ERClamp`, `SafeR`, `SafeSrc`. Damit sind Legacy- und Continuous-Renditeherleitung in Backtest und Scenario-Log vergleichbar.

**Performance-Details**
* Chunk-Größe wird über ein Zeitbudget dynamisch angepasst (glatt gefiltert), um kurze und lange Jobs auszugleichen.
* Stall-Detection nutzt Progress-Timestamps und skaliert das Timeout mit der zuletzt gemessenen Chunk-Dauer.

### Worker-Telemetrie (Dev-only)

Die Worker-Pools bieten ein opt-in Telemetrie-System für lokale Performance-Analyse. Aktivierung:
* URL-Parameter `?telemetry=true` oder
* `localStorage.setItem('enableWorkerTelemetry','true')` + Reload
* Dev-Panel via `?dev=true` (Toggle + Print/Export JSON).

**Was liefert der Report (Console)?**
* **Jobs:** `total/completed/failed/successRate%` – Stabilität der Jobs.
* **Performance:** `avg/min/max JobTime` + `throughput (jobs/sec)` – Zeitbudget-Treffer & Effizienz.
* **Chunking:** `avg/min/max/current` – Adaptives Chunking, ob sich die Größe stabilisiert.
* **Workers:** pro Worker `jobsCompleted`, `totalTime`, `idleTime`, `utilization%` – Lastverteilung/Idle-Anteile.
* **Memory:** nur wenn `performance.memory` verfügbar ist.

**Interpretation (Beispiel)**
* `successRate=100%` → keine Worker-Fehler.
* `avgJobTime ≈ timeBudget` → Chunking trifft das Ziel.
* `currentChunk` nahe `maxChunk` → System hat sich eingependelt.
* Große Unterschiede bei `utilization%` → einzelne Jobs dauern länger (normal bei MC).

**Beispielwerte (8 Worker, 500 ms Budget)**
* `avgJobTime ~302 ms`, `min/max ~58/515 ms`
* `chunk avg/current ~392/399`
* `utilization ~76–99%`, `jobVariance CoV ~0.28`

### Parameter-Sweep & Auto-Optimize

#### Schutzmechanismen

* **Whitelist** (`SWEEP_ALLOWED_KEYS`) beschränkt veränderbare Parameter.
* **Blocklist** verhindert Änderungen an sensiblen Feldern (z. B. Rente Person 2).
* **Deep-Clones** (`structuredClone`-Fallback) isolieren jeden Sweep-Case.
* **Rente-2-Wächter** markiert Heatmap-Zellen mit ⚠, wenn die zweite Rente variiert.
* **Self-Test** (`runSweepSelfTest`) prüft Whitelist/Clone-Mechanismen.

#### Auto-Optimize-Funktionen
* **Mehrphasige Optimierung:** Latin Hypercube Sampling → Quick-Filter → volle Evaluation → lokale Verfeinerung → Final Verification für deutlich weniger Kandidaten als ein exhaustiver Sweep.
* **Dynamische Parameter-UI:** Unterstützt 1-7 frei konfigurierbare Optimierungsparameter mit individuellen Bereichen.
* **Preset-Konfigurationen:** Vordefinierte Optimierungsszenarien (konservativ, moderat, risikobereit, etc.) für schnellen Einstieg.
* **Champion-Config-Output:** Detaillierte Ausgabe der optimalen Parameterkombination mit allen relevanten Metriken.
* **Constraint-basierte Filterung:** Automatische Verwerfung von Konfigurationen, die definierte Mindestanforderungen nicht erfüllen (z.B. Erfolgsquote, Erschöpfungsrate).
* **Dynamic-Flex-Modus:** `inherit`, `force_on`, `force_off`; Dynamic-Flex-Parameter sind nur bei effektiv aktivem Dynamic-Flex zulässig.
* **Safety-Guards:** Zusätzliche Zielstrafen verhindern überaggressive Dynamic-Flex-Lösungen in Top-Ergebnissen.
* **Longevity-Grenze:** Langlebigkeitsparameter sind in Version 1 bewusst keine Optimizer-Variablen. Auto-Optimize bewertet Kandidaten mit den aktuellen Basiswerten, darf `longevityMode`, `longevityQuantileShift`, `longevityRelativePct` und `longevityBufferYears` aber nicht selbst verändern.

### Ergebnisdarstellung

* KPIs (P10/P50/P90) und Worst-Run-Logs.
* **Heatmap (Renten-Fokus):** Die Heatmap visualisiert die Verteilung der Entnahmeraten. Um bei aktivierter Ansparphase (0% Entnahme) keine leeren Spalten zu zeigen, beginnt die Aufzeichnung der Heatmap erst mit dem ersten Jahr der Rentenphase.
* Pflegefall-Szenarien mit zusätzlichen Kostenverläufen.

### Pflegebucket / Health Bucket

Der Pflegebucket ist eine gesperrte Geldmarkt-/Cash-Reserve, die als Selbstversicherungsbaustein gegen schwere Pflegefälle modelliert wird. Die Core-Engine bleibt dabei unverändert: Sie erhält nur operative Liquidität. Die zweckgebundene Reserve wird außerhalb der Engine im Simulator-State geführt.

**Profildefinition**

Die dauerhafte Definition liegt im Profil-Key `profile_health_bucket`:

```js
{
  enabled: false,
  initialAmount: 150000,
  assetSource: 'money_market_first_then_cash',
  triggerMinGrade: 4,
  triggerMode: 'OR',
  coverageMode: 'care_additional_floor_only',
  returnMode: 'cash_return',
  targetMode: 'inflation_indexed_diagnostic'
}
```

Im Profilverbund ist das Primary-Profil die Source of Truth. Sekundäre Profile dürfen abweichen, werden aber nicht gemischt; `combineSimulatorProfiles()` erzeugt dafür Warnungen.

**Datenfluss**

```
Profilpflege (`profile_health_bucket`)
  -> simulator-profile-inputs.js
  -> aggregierte Haushaltsinputs
  -> simulator-portfolio-init.js
  -> Portfolio-State mit `healthBucketGeldmarkt`
  -> simulator-engine-input.js
  -> EngineAPI nur mit operativer Liquidität
  -> simulator-health-bucket.js vor Forced Sale
  -> Jahreslog, Backtest, Monte Carlo, Sweep/Optimize-Metriken
```

**Portfolio-State**

Der Simulator führt folgende zusätzliche Felder:

* `healthBucketGeldmarkt`: aktueller reservierter Bucket-Betrag.
* `healthBucketTranches`: aus Geldmarkt-Tranchen ausgegliederte Lots mit anteiliger Cost Basis.
* `healthBucketCashAmount`: Bucket-Anteil aus Tagesgeld/Cash.
* `healthBucketMeta`: Initialbetrag, verwendete Quelle, Kappung, fehlender Betrag und Warnungen.

Der Carve-Out erfolgt nach dem Profilverbund-Merge auf dem aggregierten Haushaltsportfolio. Die Quellenreihenfolge ist deterministisch:

1. `depotTranchesGeldmarkt` per FIFO nach Kaufdatum.
2. Ungültige oder fehlende Kaufdaten erhalten einen stabilen Fallback und destabilisieren die Sortierung nicht.
3. Ungetranchter `geldmarktEtf`.
4. `tagesgeld`/Cash.

Aktien, Gold und Bond-Tranchen werden für Version 1 nicht herangezogen. Reichen Geldmarkt/Cash nicht aus, wird der Bucket auf den verfügbaren Betrag gekappt und `healthBucketMeta.warnings` protokolliert.

**Engine-Air-Gap**

`simulator-engine-input.js` baut `aktuelleLiquiditaet` ausschließlich aus operativer Liquidität. `healthBucketGeldmarkt` und `healthBucketTranches` werden nicht an die Engine als frei verfügbare Liquidität oder normale Detailtranchen weitergereicht. Damit sinken VPW-Basis, Runway und Ziel-Liquidität um die zweckgebundene Reserve.

**Jahreslauf**

`simulator-engine-direct.js` ruft `simulator-health-bucket.js` nach der Engine-Entscheidung und vor `applyForcedSaleLiquidityCoverage()` auf. Der Trigger nutzt `householdContext.care.p1` und `.p2`, Mindestpflegegrad und `OR`/`AND`-Modus. Der genutzte Betrag erhöht temporär die operative Liquidität und reduziert den Forced-Sale-Shortfall. Der Restbucket wird in Entnahme- und Ansparjahren mit `rC` verzinst.

Die Coverage-Modi sind:

* `care_additional_floor_only`: Standard; deckt nur pflegebedingte Zusatzlücken.
* `floor_when_care_active`: deckt bei aktivem Pflege-Trigger den gesamten Floor-Shortfall.

Der inflationsindexierte Zielwert ist eine Diagnosegröße. Version 1 führt kein automatisches Refill und keine automatische Umschichtung zurück in den Bucket aus.

**Steuer-Contract**

Der Bucket-Verbrauch ist in Version 1 als cash-like Modellvereinfachung implementiert. Ausgegliederte Geldmarkt-Tranchen behalten zwar Herkunft und anteilige Cost Basis für Nachvollziehbarkeit, die spätere Nutzung erzeugt aber noch keine eigenen Tax-Aggregate im Jahres-Settlement. Eine steuerlich exakte Bucket-Verkaufslogik wäre ein separater Folgeschritt.

**Ergebnis- und Worker-Contracts**

Jahreslogs führen Start, Nutzung, Zins, Ende, Zielwert, reale Zieldeckung, Ziellücke, Trigger und Warnung. Monte Carlo aggregiert Nutzungsquote, Erschöpfungsquote, Median-/P90-Nutzung, Restbucket, Zieldeckung, Ziellücke und Zinsen. Worker-, Sweep- und Auto-Optimize-Merge-Pfade übernehmen dieselben Zähl- und Listenmetriken.

### Rentensteuerung & Witwenlogik

* `getCommonInputs()` bündelt sämtliche Rentenfelder inklusive gemeinsamer Indexierung, Hinterbliebenen-Optionen (Modus, Prozentsatz,
  Mindest-Ehejahre) und Partner:innen-spezifischer Parameter. Ältere Felder wie `r2Brutto` werden automatisch migriert, Pflege-
  Konfigurationen parallel gelesen und als strukturierte Inputs zurückgegeben.【F:simulator-portfolio.js†L57-L174】
* `computeRentAdjRate()` und `computePensionNext()` sorgen dafür, dass beide Rentenstränge dieselbe Anpassungslogik (fix, Lohn,
  CPI) nutzen und dass Erstjahre sauber von Folgejahren getrennt bleiben.【F:simulator-portfolio.js†L285-L332】
  - 15 charakteristische Szenarien: Vermögens-Perzentile (Worst, P5-P95, Best), Pflege-Extremfälle (längste Dauer, höchste Kosten, frühester Eintritt), Risiko-Szenarien (längste Lebensdauer, maximale Kürzung)
  - 15 zufällige Szenarien: gleichmäßig über alle Runs verteilt für typisches Verhalten
* Dropdown-Auswahl mit Endvermögen und Pflege-Status pro Szenario
* Checkboxen für Pflege-Details und detailliertes Log, JSON/CSV-Export; detaillierte Logs enthalten zusaetzlich die konsistenten Entnahme-/Payout-/VPW-Felder fuer Monte-Carlo-Scenario-Log und Backtest.【F:simulator-results.js†L269-L427】【F:simulator-main.js†L1039-L1129】

---

## Multi-Profil Simulator

### Architektur

Die Simulator-Eingaben können aus mehreren Profilen aggregiert werden:

**Module:**
- `app/profile/profile-storage.js` – Profil-Registry und Persistenz-Fassade
- `app/profile/profile-key-policy.js` – Erkennung profilbezogener Persistenz-Keys fuer Snapshot, Clear und Restore
- `app/profile/profile-registry.js` – Registry-Parsing, Current-Profile-Key, Profil-Metadaten, CRUD und Profildaten-Merge
- `app/profile/profile-live-storage.js` – Snapshot, Clear, Load und Live-Data-Erkennung fuer profilbezogene Persistenz-Keys
- `app/profile/profile-bundle-io.js` – Bundle-Import/-Export, globale Profil-Transfer-Keys und `window.name`-Handoff
- `app/profile/profile-manager.js` – UI-Steuerung für Profilverwaltung (index.html)
- `app/simulator/simulator-profile-inputs.js` – Profilaggregation und Simulator-Input-Mapping

### Datenfluss

```
Profile (PersistenceFacade; aktuell Legacy-localStorage-Backend) → app/profile/profile-storage.js
                        ↓
          buildSimulatorInputsFromProfileData()
                        ↓
          profileInputs[] (pro Profil)
                        ↓
          combineSimulatorProfiles() → Combined Inputs
                        ↓
          getCommonInputs() → MC/Backtest/Optimize
```
- Eine gemeinsame Simulation mit kombinierten Inputs
- Tranchen aller Profile werden zusammengeführt
- Partner-Konfiguration wird deaktiviert (Renten summiert)

**Profilverbund (Simulator):**
- Gemeinsame Simulation mit kombinierten Inputs
- Tranchen der aktiven Profile werden zusammengeführt, mit Profilpräfix eindeutig gemacht und behalten `sourceProfileId`
- Engine-Verkaufsaufschluesselungen behalten diese Herkunft in `breakdown[].sourceProfileId`; Portfolio-Reduktion erfolgt ueber die eindeutige profilbezogene `trancheId`.
- Plausible Detailtranchen bestimmen das kombinierte Startvermögen zusammen mit Liquidität; Null-Marktwert-Tranchen fallen mit Warnung auf aggregierte Startwerte zurück
- Personen/Renten werden aus der Profilwahl abgeleitet (kein separater Partner-Tab)

### Profilverbund-Verteilung (Balance-App)

**Verteilungsmodi:**
- `tax_optimized`: Profil mit geringerer Steuerlast zuerst
- `proportional`: Nach Vermögensanteil (Default)
- `runway_first`: Profil mit größerer Runway trägt mehr
- Entnahmen nutzen Cash/Geldmarkt vor Tranchenauswahl; Asset-Summaries verwenden Detailtranchen statt aggregierte Depotwerte, wenn Detailtranchen vorhanden sind.

### Gold-Validierung

**Problem:** Inkonsistente Gold-Parameter beim Kombinieren von Profilen führten zu Engine-Validierungsfehlern.

**Lösung:**
`combineSimulatorProfiles()` berücksichtigt nur Profile mit `goldAktiv` und `goldZielProzent > 0` bei der Mittelung von Ziel/Floor.
Sind keine gültigen Gold-Profile aktiv, werden die kombinierten Goldwerte auf 0 gesetzt.

### Risiko-Budget

Optional können Limits für:
- Max-Drawdown (P90)
- Max-Depot-Erschöpfung
- Min-Success-Rate

definiert werden. Ergebnisse werden gegen diese Limits geprüft und als OK/Verletzt markiert.

---

## Build- und Laufzeit-Hinweise

* Engine anpassen → `npm run build:engine` ausführen, anschließend `engine.js` prüfen; für CI/Release `npm run build:engine:strict` nutzen.
* Desktop-Release auf Windows → `npm run build-tauri-exe` oder `build-tauri.bat`; der Workflow führt `npm run sync-dist`, `npm run tauri:build` und den geprüften Kopierschritt nach `RuhestandSuite.exe` aus.
* Reine Tauri-Bundles → vor `npm run tauri:build` immer `npm run sync-dist` ausführen, damit `src-tauri/tauri.conf.json` den aktuellen `dist/`-Stand lädt.
* Dateiimporte/-exporte benötigen Browser-Datei-/Download-Unterstuetzung. Jahresabschluss-Snapshots liegen intern im aktiven Persistenzadapter: Browser `IndexedDB` Store `snapshots`, Tauri `ruhestand_suite_snapshots.json`, localStorage-Fallback `rs_snapshot_archive_v1`.
* Tests/Smoketests:
  * `npm test` fuehrt die schnelle Node-Standardsuite aus.
  * `npm run test:coverage` erzeugt die V8-Coverage-Baseline fuer `app/`, `engine/`, `workers/` und `types/`.
  * `npm run test:browser` fuehrt Playwright-Smokes fuer die HTML-Einstiege mit lokalem Testserver aus.
  * Bei Aenderungen an `src-tauri/` ist zusaetzlich ein echter Tauri-/Rust-Build erforderlich, typischerweise `npm run tauri:build` oder der Windows-Release-Pfad.

---

## Weiterführende Dokumente

* **BALANCE_MODULES_README.md** – Detailtiefe zur Balance-App.
* **SIMULATOR_MODULES_README.md** – Detaillierte Modulübersicht des Simulators.
* **engine/README.md** – Engine-spezifische Informationen inkl. Build-Beschreibung.
* **tests/README.md** – Test-Suite-Dokumentation mit Standard-, Coverage-, Browser- und Tauri-Gates.
* **docs/reference/PROFILVERBUND_FEATURES.md** – Profilverbund-Design und -Module.
* **docs/internal/archive/2026-dynamic-flex/CAPE_AUTOMATION_CONTRACT.md** – CAPE-Quelle, Fallback-Vertrag und Jahreswechsel-Fehlerszenarien.
* **docs/internal/archive/2026-dynamic-flex/DYNAMIC_FLEX_ROLLOUT.md** – interner Rollout-Abschluss inkl. finaler Testmatrix.
