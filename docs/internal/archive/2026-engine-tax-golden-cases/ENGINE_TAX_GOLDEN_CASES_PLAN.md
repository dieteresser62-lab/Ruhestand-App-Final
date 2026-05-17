# Engine-/Tax-Golden-Cases: Umsetzungsplan

**Stand:** 2026-05-12  
**Zweck:** Arbeitsplan zur Absicherung der fachlich kritischsten Steuer-, Tranchen- und Engine-Contracts mit kleinen, synthetischen Golden-Cases.  
**Status:** abgeschlossen und archiviert.  
**Scope:** `engine/`, steuer- und transaktionsnahe Simulator-Pfade, Tranchenverkauf, Settlement-Recompute, bestehende Engine-/Tax-Tests und Referenzdokumentation.  
**Nicht-Scope:** UI-Redesign, Profilverwaltung/Tranchenmanager-UI, Tauri-Release-Artefakte, neue Steuerberatung oder fachliche Neudefinition des deutschen Steuerrechts.

## Ausgangspunkt

Die vorherigen Slices haben die Grundlage gelegt:

- Simulator-/Worker-Paritaet ist abgesichert.
- Balance-Jahresworkflows, Storage und Diagnose sind abgesichert.
- Profilverbund-/Tranchen-Contracts sind abgesichert, inklusive profilbezogener Tranche-IDs und `sourceProfileId`.

Dieser Slice geht nun an die hoechsten fachlichen Risiken aus der Projektuebersicht: Engine, Tranchen/Steuern, FIFO/TQF, LossCarry und Settlement. Ziel ist nicht, die Steuerlogik neu zu bauen, sondern typische und kritische Faelle so explizit zu machen, dass kuenftige Refactorings sofort fachlich auffallen.

## Zielbild

Golden-Cases sollen fuer zentrale Steuer- und Transaktionspfade reproduzierbare Erwartungswerte liefern. Ein Golden-Case ist ein kleiner synthetischer Fall mit klarer Rechnung, stabilen Inputs und enger Erwartung an Rohaggregate, finale Steuer, Verlusttopf und Portfolio-Nachzustand.

Erfolgreich ist der Slice, wenn:

- die bestehenden Tax-/Settlement-/Tranchen-Tests einer Contract-Matrix zugeordnet sind,
- Luecken gegen typische Haushalts- und Depotfaelle priorisiert sind,
- neue Golden-Cases nur dort entstehen, wo sie echte Fachrisiken abdecken,
- Engine- und Simulator-Steuerpfade dieselben Settlement-Prinzipien sichtbar einhalten,
- `sourceProfileId` und Tranche-Herkunft fuer mehrprofilige Steuerfaelle vorbereitet oder abgesichert sind,
- alle Codeaenderungen durch fokussierte Tests und Abschlussvalidierung gedeckt sind.

## Relevante Dateien

| Bereich | Dateien |
| --- | --- |
| Engine Core | `engine/core.mjs`, `engine/config.mjs`, `engine/validators/InputValidator.mjs` |
| Transaktionen | `engine/transactions/TransactionEngine.mjs`, `engine/planners/SpendingPlanner.mjs` |
| Settlement | `engine/tax-settlement.mjs` |
| Simulator-Steuern | `app/simulator/simulator-tax-recompute.js`, `simulator-forced-sale.js`, `simulator-engine-direct.js`, `simulator-year-result.js` |
| Simulator-Portfolio | `app/simulator/simulator-portfolio-tranches.js`, `simulator-portfolio-init.js`, `simulator-year-portfolio.js` |
| Profil-/Tranchen-Herkunft | `app/simulator/simulator-profile-inputs.js`, `app/profile/profilverbund-balance.js` |
| Balance-Integration | `app/balance/balance-update-pipeline.js`, `balance-renderer-action.js`, `balance-diagnosis-transaction.js` |
| Bestehende Tests | `tests/transaction-tax.test.mjs`, `tax-settlement.test.mjs`, `core-tax-settlement.test.mjs`, `simulator-tax-settlement.test.mjs`, `depot-tranches.test.mjs`, `transaction-*.test.mjs`, `core-engine.test.mjs`, `engine-robustness.test.mjs` |
| Referenzen | `engine/README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/BALANCE_MODULES_README.md`, `tests/README.md`, `docs/internal/PROJEKTUEBERSICHT.md` |

## Risiko- und Ertragsbewertung

| Thema | Aufwand | Aenderungsrisiko | Ertrag | Entscheidung |
| --- | --- | --- | --- | --- |
| Baseline und Contract-Matrix | niedrig | niedrig | hoch | zuerst angehen |
| Settlement-Golden-Cases | mittel | niedrig-mittel | sehr hoch | priorisieren |
| FIFO/TQF-Tranchen-Golden-Cases | mittel | mittel | sehr hoch | priorisieren |
| Verlustpositionen und LossCarry | mittel | mittel | sehr hoch | priorisieren |
| Core-Engine-End-to-End-Steuerfall | mittel | mittel | hoch | nach reinen Tax-Contracts |
| Simulator-Recompute mit Notfallverkauf | mittel-hoch | mittel | hoch | gezielt absichern |
| Mehrprofiliger Steuerfall mit `sourceProfileId` | mittel-hoch | mittel | mittel-hoch | nur Contract-nah, kein Profil-Refactor |
| Produktivcode-Refactor | hoch | hoch | unklar | nur bei belegter Luecke |

## Arbeitsprinzipien

1. Erst Baseline und Contract-Matrix, dann Tests oder Fixes.
2. Golden-Cases muessen synthetisch, klein und nachrechenbar sein.
3. Keine echten lokalen Finanzdaten, Snapshots oder Exporte verwenden.
4. Steuernahe Rohaggregate (`sumRealizedGainSigned`, `sumTaxableAfterTqfSigned`) nicht durch reine UI-Erwartungen ersetzen.
5. Settlement-Steuer ist die finale Steuer; geplante Verkaufssteuer bleibt nur Vorab-Schaetzung.
6. Verlustpositionen muessen signiert sichtbar bleiben, waehrend planbare Verkaufsauswahl weiterhin keine negativen Steuern suggeriert.
7. Wenn `engine/` oder die oeffentliche `EngineAPI` geaendert wird: `npm run build:engine` zusaetzlich zur Test-Suite.
8. `engine.js` nicht manuell editieren.

## Phase 0: Baseline und Arbeitsgrenze

**Ziel:** Aktuellen Engine-/Tax-Teststand reproduzierbar erfassen.

Arbeitsschritte:

1. `git status --short` pruefen und fremde Aenderungen notieren.
2. Fokussierte Baseline ausfuehren:
   - `node tests/run-single.mjs tests/transaction-tax.test.mjs`
   - `node tests/run-single.mjs tests/tax-settlement.test.mjs`
   - `node tests/run-single.mjs tests/core-tax-settlement.test.mjs`
   - `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`
   - `node tests/run-single.mjs tests/depot-tranches.test.mjs`
3. Je nach Befund zusaetzlich:
   - `node tests/run-single.mjs tests/transaction-engine-ath.test.mjs`
   - `node tests/run-single.mjs tests/transaction-engine-rebal.test.mjs`
   - `node tests/run-single.mjs tests/transaction-gold-liquidity.test.mjs`
   - `node tests/run-single.mjs tests/transaction-quantization.test.mjs`
   - `node tests/run-single.mjs tests/core-engine.test.mjs`
   - `node tests/run-single.mjs tests/engine-robustness.test.mjs`
4. Fehler klassifizieren:
   - bestehender Defekt,
   - instabile Testannahme,
   - echte Fach-/Contract-Luecke,
   - Doku-/Contract-Widerspruch.

**Reviewzeitpunkt R0:** Nach Baseline. Entscheidung: weiter mit Contract-Matrix oder zuerst bestehenden Fehler isolieren.

### Phase-0-Ergebnis: Baseline

Die fokussierte und erweiterte Engine-/Tax-Baseline lief am 2026-05-12 gruen.

Arbeitsbaum-Hinweis:

- Vor Phase 0 waren bereits offene Aenderungen aus den abgeschlossenen Simulator-, Balance- und Profilverbund-/Tranchen-Slices vorhanden.
- Der neue Plan-Slice `docs/internal/2026-engine-tax-golden-cases/` war ebenfalls offen.
- Git meldete weiterhin fehlenden Zugriff auf `C:\Users\Diete\.config\git\ignore`, ohne die Tests zu blockieren.

Ausgefuehrte fokussierte Baseline:

```bash
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/tax-settlement.test.mjs
node tests/run-single.mjs tests/core-tax-settlement.test.mjs
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
```

Ausgefuehrte erweiterte steuer-/engine-nahe Tests:

```bash
node tests/run-single.mjs tests/transaction-engine-ath.test.mjs
node tests/run-single.mjs tests/transaction-engine-rebal.test.mjs
node tests/run-single.mjs tests/transaction-gold-liquidity.test.mjs
node tests/run-single.mjs tests/transaction-quantization.test.mjs
node tests/run-single.mjs tests/core-engine.test.mjs
node tests/run-single.mjs tests/engine-robustness.test.mjs
```

Ergebnis:

- alle ausgefuehrten Phase-0-Tests bestanden,
- keine bestehende steuer-/enginebezogene Baseline-Luecke gefunden,
- keine Produktivcode-Aenderung in Phase 0,
- keine Engine-Aenderung, daher kein `npm run build:engine` erforderlich.

**R0-Entscheidung:** Weiter mit Phase 1, Contract-Matrix. Die bestehende Testabdeckung wirkt breit; Phasen 2 bis 5 duerfen aber erst nach testfallnaher Zuordnung als "durch Baseline bestaetigt" bewertet werden.

## Phase 1: Contract-Matrix

**Ziel:** Bestehende Abdeckung den fachlichen Steuer- und Transaktions-Contracts zuordnen.

Zu erfassen:

| Contract-Bereich | Leitfragen | Erwarteter Fokus |
| --- | --- | --- |
| Verkaufssteuer-Vorplanung | Welche Steuerwerte sind Plan-/Schaetzwerte, welche finale Settlement-Werte? | `TransactionEngine`, `action.steuer`, Renderer/Diagnose |
| FIFO und Tranchenauswahl | Wird die erwartete Reihenfolge bei Aktien, Gold und Geldmarkt stabil eingehalten? | `depot-tranches`, `transaction-tax` |
| TQF | Wird Teilfreistellung symmetrisch auf Gewinne und Verluste angewandt? | Aktienfonds, Verlustpositionen, Rohaggregate |
| Sparer-Pauschbetrag | Wird SPB vor finaler Steuer korrekt verbraucht und berichtet? | `tax-settlement`, Core-Output |
| LossCarry | Wird Verlusttopf additiv fortgeschrieben, verbraucht und nicht mutiert? | `tax-settlement`, `core-tax-settlement` |
| Negative Jahressalden | Fuehren Verluste zu Zero Tax und korrektem Verlusttopf? | Settlement-Golden-Case |
| Core-Engine Integration | Propagiert `lastState.taxState.lossCarry` korrekt in `ui.action` und naechsten State? | `core.mjs`, `EngineAPI.simulateSingleYear()` |
| Simulator-Recompute | Kombiniert der Simulator regulaere und Notfallverkaeufe vor Settlement neu? | `simulator-tax-recompute`, `simulator-forced-sale` |
| Mehrprofil-/Herkunftsfelder | Bleiben `sourceProfileId` und Tranche-IDs fuer steuernahe Nachvollziehbarkeit erhalten? | Simulator-Profilinput, Portfolio-Tranchen |
| UI-/Diagnose-Sicht | Zeigen Renderer und Diagnose finale Steuer und Rohaggregate ohne Vermischung? | Balance-Renderer, Diagnosis |

Artefakt:

- Contract-Matrix als Abschnitt in diesem Plan ergaenzen.
- Luecken nach fachlichem Risiko priorisieren.
- Bewusst ausgelassene Faelle als Folgerisiko dokumentieren.

**Reviewzeitpunkt R1:** Nach Matrix. Entscheidung: Welche Golden-Cases werden in diesem Slice umgesetzt.

## Phase 2: Settlement-Golden-Cases

**Ziel:** Reine Settlement-Logik mit nachrechenbaren Jahresfaellen absichern.

Geplante Pruefpunkte:

1. Gewinnjahr ohne LossCarry:
   - taxable Gewinn,
   - SPB-Verbrauch,
   - finale Steuer.
2. Gewinnjahr mit vorhandenem LossCarry:
   - LossCarry wird vor SPB verbraucht,
   - Rest-LossCarry oder Rest-SPB nachvollziehbar.
3. Verlustjahr:
   - finale Steuer 0,
   - LossCarry additiv erhoeht,
   - SPB nicht sinnlos verbraucht.
4. Exakter Aufbrauch:
   - Floating-Point-robust, keine Mini-Reststeuer.
5. Non-Mutation:
   - Vorjahres-`taxState` bleibt unveraendert.

Moegliche Dateien:

- bevorzugt `tests/tax-settlement.test.mjs`
- bei wachsendem Umfang: neue Datei `tests/tax-settlement-golden.test.mjs`

**Reviewzeitpunkt R2:** Nach Settlement-Golden-Cases. Entscheidung: Nur Testausbau oder gezielter Fix in `engine/tax-settlement.mjs`.

### Phase-2-Ergebnis: Settlement-Golden-Cases

Die bestehende Datei `tests/tax-settlement.test.mjs` deckte die geplanten Kernfaelle bereits weitgehend ab:

- Gewinnjahr ohne LossCarry: SPB reduziert steuerpflichtige Basis vor Steuer.
- Verlustjahr: finale Steuer 0, LossCarry wird additiv erhoeht, SPB wird nicht verbraucht.
- Exakter LossCarry-Aufbrauch: keine Reststeuer und kein Mini-Rest-LossCarry.
- Gewinnjahr mit LossCarry plus SPB: LossCarry wird vor SPB verbraucht, SPB absorbiert die Restbasis.
- Non-Mutation: `taxStatePrev` bleibt unveraendert.

Ergaenzt wurde ein weiterer Golden-Case fuer partiellen LossCarry-Verbrauch:

- Start-LossCarry 2.000 EUR,
- signierte steuerpflichtige Jahresbasis 6.000 EUR,
- SPB 1.000 EUR,
- Kirchensteuer 9%,
- erwartete Baseline-Steuerbasis vor LossCarry: 5.000 EUR,
- erwartete finale Steuerbasis nach LossCarry und SPB: 3.000 EUR,
- `taxSavedByLossCarry` entspricht 2.000 EUR * effektivem Steuersatz,
- LossCarry ist danach auf 0 reduziert.

Damit ist die Trennung zwischen `taxBeforeLossCarry`, `taxAfterLossCarry`/`taxDue` und `taxSavedByLossCarry` explizit abgesichert.

Produktivcode-Aenderung war nicht noetig.

Validierung:

```bash
node tests/run-single.mjs tests/tax-settlement.test.mjs
```

Ergebnis: gruen.

**R2-Entscheidung:** Phase 2 ist abgeschlossen. Weiter mit Phase 3, FIFO/TQF/LossCarry-Tranchen-Golden-Cases.

## Phase 3: FIFO/TQF/LossCarry-Tranchen-Golden-Cases

**Ziel:** Tranchenverkaeufe und Rohaggregate gegen typische Depotfaelle absichern.

Geplante Pruefpunkte:

1. Aktienfonds-Gewinnposition:
   - TQF reduziert steuerpflichtigen Gewinn,
   - Plansteuer und Rohaggregate bleiben konsistent.
2. Aktienfonds-Verlustposition:
   - signierter Verlust bleibt in Rohaggregaten sichtbar,
   - TQF-Symmetrie reduziert steuerlich nutzbaren Verlust korrekt.
3. Mischverkauf:
   - eine Gewinn- und eine Verlusttranche im selben Jahr,
   - Settlement verrechnet vor SPB/Steuer.
4. Gold- und Geldmarkt-Tranchen:
   - Gold ohne Aktien-TQF,
   - Geldmarkt ohne Aktien-TQF,
   - keine falsche Kategoriebehandlung.
5. FIFO/Cost-Basis-Reduktion:
   - Teilverkauf reduziert Marktwert und Cost Basis proportional,
   - mehrere Kategorien bleiben getrennt.

Moegliche Dateien:

- `tests/transaction-tax.test.mjs`
- `tests/depot-tranches.test.mjs`
- ggf. neue Datei `tests/transaction-tax-golden.test.mjs`, falls bestehende Dateien zu gross werden.

**Reviewzeitpunkt R3:** Nach Tranchen-Golden-Cases. Entscheidung: Produktivfix nur bei reproduzierter Contract-Luecke.

### Phase-3-Ergebnis: FIFO/TQF/LossCarry-Tranchen-Golden-Cases

Die bestehenden Tests deckten bereits wichtige Tranchen-Contracts ab:

- `tests/transaction-tax.test.mjs`
  - KESt-Grundrechnung,
  - TQF fuer Aktienfonds-Gewinne,
  - SPB in der Plansteuer,
  - Gold steuerfrei vs. steuerpflichtig,
  - steueroptimierte Verkaufsreihenfolge,
  - mehrere detaillierte Tranchen mit gleicher ISIN,
  - Sale-Budget-Caps,
  - signierte Verlust-Gewinnquote,
  - TQF-Symmetrie auf Verlust-Rohaggregate.
- `tests/depot-tranches.test.mjs`
  - FIFO-Sortierung,
  - Teilverkauf mit proportionaler Cost-Basis-Reduktion,
  - FIFO-Reduktion ueber mehrere passende Tranchen,
  - Aktien-, Gold- und Geldmarkt-Kategorien im Portfolio-Nachzustand.

Ergaenzt wurden zwei Golden-Cases in `tests/transaction-tax.test.mjs`:

1. **Mischverkauf aus Gewinn- und Verlusttranche**
   - zwei detaillierte Aktienfonds-Tranchen mit gleicher ISIN,
   - eine Verlustposition und eine Gewinnposition,
   - Brutto-Ziel erzwingt Verkauf beider Tranchen,
   - `sumRealizedGainSigned` bleibt als Netto-Saldo aus Gewinn und Verlust erhalten,
   - `sumTaxableAfterTqfSigned` wendet TQF symmetrisch auf Gewinn und Verlust an,
   - Plansteuer entsteht nur auf der positiven Gewinntranche.

2. **Detaillierte Gold-Tranche vs. Aktienfonds-TQF**
   - steuerpflichtige Gold-Tranche nutzt keine Aktien-TQF,
   - detaillierte Aktien-Tranche behaelt 30% TQF,
   - defensiver Verkauf nutzt Gold zuerst und macht die Kategorieentscheidung explizit sichtbar.

Produktivcode-Aenderung war nicht noetig.

Validierung:

```bash
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
```

Ergebnis: beide fokussierten Tests gruen.

**R3-Entscheidung:** Phase 3 ist abgeschlossen. Weiter mit Phase 4, Core-Engine-End-to-End-Steuerfaelle.

## Phase 4: Core-Engine-End-to-End-Steuerfaelle

**Ziel:** `EngineAPI.simulateSingleYear()` gegen steuerliche Golden-Cases absichern.

Geplante Pruefpunkte:

1. `lastState.taxState.lossCarry` wird gelesen und im Ergebnis fortgeschrieben.
2. `ui.action.steuer` zeigt finale Settlement-Steuer, nicht nur Plansteuer.
3. `taxRawAggregate` bleibt vorhanden und erklaerbar.
4. Guardrail-/Liquiditaetslogik triggert keinen Steuerzustandsverlust.
5. Default-Robustheit: `lastState: {}` bleibt funktionsfaehig.

Moegliche Dateien:

- `tests/core-tax-settlement.test.mjs`
- `tests/core-engine.test.mjs`

**Reviewzeitpunkt R4:** Nach Core-Integration. Wenn Engine-Code geaendert wurde, danach `npm run build:engine` einplanen.

### Phase-4-Ergebnis: Core-Engine-End-to-End-Steuerfaelle

Erweitert wurde `tests/core-tax-settlement.test.mjs`.

Die bestehenden Tests prueften bereits:

- Core-Lauf mit vorbefuelltem `taxState.lossCarry`,
- `newState.taxState` ist vorhanden,
- `ui.action.taxRawAggregate` und `ui.action.taxSettlement` werden exponiert,
- `action.steuer` entspricht `taxSettlement.taxAfterLossCarry`,
- leerer `lastState` erzeugt robust einen Default-`taxState`.

Ergaenzt wurden konkrete Golden-Case-Erwartungen fuer denselben synthetischen Core-Fall:

- Rohaggregate aus dem Core-Verkauf:
  - `sumRealizedGainSigned` = 15.000 EUR,
  - `sumTaxableAfterTqfSigned` = 15.000 EUR.
- Mit 5.000 EUR Start-LossCarry und 1.000 EUR SPB:
  - `taxBaseBeforeCarry` = 14.000 EUR,
  - `taxBaseAfterCarry` = 9.000 EUR,
  - `taxSavedByLossCarry` = 1.318,75 EUR,
  - finale `action.steuer` = 2.373,75 EUR,
  - `newState.taxState.lossCarry` = 0.
- Non-Mutation:
  - der uebergebene Vorjahres-`lastState.taxState` bleibt unveraendert.
- Ueberdeckender LossCarry:
  - 20.000 EUR Start-LossCarry fuehren zu `signedAfterCarry` = -5.000 EUR,
  - finale Steuer = 0,
  - `newState.taxState.lossCarry` = 5.000 EUR.

Produktivcode-Aenderung war nicht noetig. Es gab keine Engine-Code-Aenderung, daher war `npm run build:engine` nicht erforderlich.

Validierung:

```bash
node tests/run-single.mjs tests/core-tax-settlement.test.mjs
node tests/run-single.mjs tests/core-engine.test.mjs
```

Ergebnis: beide fokussierten Tests gruen.

**R4-Entscheidung:** Phase 4 ist abgeschlossen. Weiter mit Phase 5, Simulator-Recompute und Notfallverkauf.

## Phase 5: Simulator-Recompute und Notfallverkauf

**Ziel:** Simulator-Steuerpfad mit regularem Verkauf plus Notfallverkauf konsistent halten.

Geplante Pruefpunkte:

1. Ohne Forced Sale bleibt Engine-Settlement unveraendert.
2. Mit Forced Sale werden reguläre und erzwungene Verkäufe vor Settlement zusammengefuehrt.
3. `totalTaxesThisYear` kommt aus dem Recompute-Settlement.
4. LossCarry wird bei Notfallverkauf korrekt verbraucht oder erhoeht.
5. Portfolio-Nachzustand und Steuerrohdaten bleiben konsistent.

Moegliche Dateien:

- `tests/simulator-tax-settlement.test.mjs`
- ggf. neue Datei `tests/simulator-tax-golden.test.mjs`

**Reviewzeitpunkt R5:** Nach Simulator-Recompute-Tests. Entscheidung: Abschluss moeglich oder gezielter Fix in Simulator-Steuerpfaden.

### Phase-5-Ergebnis: Simulator-Recompute und Notfallverkauf

Die bestehenden Tests in `tests/simulator-tax-settlement.test.mjs` deckten bereits ab:

- `buildTaxRawAggregate()` und `addTaxRawAggregate()` addieren skalierte Rohaggregate.
- `applySimulatorTaxRecompute()` setzt bei Forced Sales die finale Settlement-Steuer auf `actionResult.steuer`.
- `recomputedWithForcedSales` und `forcedSaleScaleApplied` werden im Settlement-Payload markiert.
- `spendingNewState.taxState` wird mit dem naechsten Steuerzustand aktualisiert.
- Forced-Sale-Liquiditaetsdeckung mutiert Portfolio und Steuerrohdaten.
- Payout-Fallback kann Floor-Deckung durch Assetverkauf herstellen.
- Voller Jahrespfad mit Forced Sale recomputet Steuer gegen das kombinierte Rohaggregat.
- Pfad ohne Forced Sale behaelt die Engine-Settlement-Steuer und markiert `recomputedWithForcedSales=false`.
- `totalTaxesThisYear` kommt aus `action.steuer`.

Ergaenzt wurde ein direkter Golden-Case fuer Forced-Sale-Recompute mit vorhandenem LossCarry:

- kombinierte steuerpflichtige Rohbasis: 6.000 EUR,
- realisierter Gewinn: 7.000 EUR,
- Start-LossCarry: 2.000 EUR,
- SPB: 1.000 EUR,
- Kirchensteuer: 9%,
- erwartete Baseline-Steuerbasis vor LossCarry: 5.000 EUR,
- erwartete finale Steuerbasis nach LossCarry und SPB: 3.000 EUR,
- `actionResult.steuer` und `totalTaxesThisYear` entsprechen der finalen Settlement-Steuer,
- `taxSavedByLossCarry` wird ausgewiesen,
- `spendingNewState.taxState.lossCarry` wird auf 0 fortgeschrieben,
- das kombinierte Rohaggregat wird zurueck auf `actionResult.taxRawAggregate` kopiert.

Produktivcode-Aenderung war nicht noetig.

Validierung:

```bash
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
```

Ergebnis: gruen.

**R5-Entscheidung:** Phase 5 ist abgeschlossen. Weiter mit Phase 6, Mehrprofil-/Herkunfts-Golden-Case.

## Phase 6: Mehrprofil-/Herkunfts-Golden-Case

**Ziel:** Den Profilverbund-/Tranchen-Slice steuerfachlich anschliessen, ohne Profilverwaltung neu anzufassen.

Geplante Pruefpunkte:

1. Zwei Profile liefern Tranchen mit gleicher Ursprungs-ID.
2. Kombinierter Simulatorinput macht IDs eindeutig und setzt `sourceProfileId`.
3. Ein steuerrelevanter Verkauf bleibt einer Tranche eindeutig zuordenbar.
4. Keine profiluebergreifende Cost-Basis-Vermischung.

Moegliche Entscheidung:

- Falls der produktive Steuerpfad `sourceProfileId` noch nicht nutzt, reicht ein Golden-Case auf Portfolio-/Tranche-Ebene plus Doku-Finding.
- Kein groesserer Umbau, nur um Reporting kosmetisch zu verbessern.

**Reviewzeitpunkt R6:** Nach Herkunfts-Check. Entscheidung: in diesem Slice fixen oder als separates Reporting-/Audit-Thema dokumentieren.

### Phase-6-Ergebnis: Mehrprofil-/Herkunfts-Golden-Case

Die bestehende Profilverbund-Baseline deckte bereits ab, dass der kombinierte Simulatorinput Tranche-IDs mit Profilpraefix eindeutig macht und `sourceProfileId` setzt. Die steuernahe Luecke lag danach in der Verkaufsaufschluesselung: `sale-engine.mjs` reichte `trancheId`, aber nicht die Profilherkunft weiter.

Umgesetzte Aenderung:

- `engine/transactions/sale-engine.mjs`
  - `breakdown[]` enthaelt fuer detaillierte Tranchen jetzt zusaetzlich `sourceProfileId`.
  - Die Aenderung ist additiv; bestehende `breakdown`-Felder bleiben unveraendert.

Neue Golden-Cases:

1. `tests/transaction-tax.test.mjs`
   - zwei gleich benannte ETF-Tranchen mit gleicher ISIN aus unterschiedlichen Profilen,
   - Verkauf ueber detaillierte Tranchen,
   - Assertion: `breakdown[]` bewahrt profilbezogene Tranche-ID und `sourceProfileId`.
2. `tests/depot-tranches.test.mjs`
   - zwei Profil-Tranchen mit gleicher fachlicher Position, aber unterschiedlichen Kostenbasen,
   - Verkauf nur der Profil-B-Tranche per eindeutiger `trancheId`,
   - Assertion: Profil A bleibt unveraendert, Profil B reduziert Marktwert und Cost Basis proportional.

Validierung:

```bash
npm run build:engine
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
node tests/run-single.mjs tests/core-tax-settlement.test.mjs
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
node tests/run-single.mjs tests/core-engine.test.mjs
node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs
node tests/run-tests.mjs
```

Ergebnis:

- Engine-Build lief gruen; lokal wurde der Fallback-Build ohne `esbuild` genutzt.
- Alle fokussierten Tests liefen gruen.
- Die komplette Suite lief gruen: 74 Testdateien, 1639 Assertions, 0 Fehler.

**R6-Entscheidung:** Die Contract-Luecke wurde im Slice geschlossen. Weiter mit Phase 7, Dokumentationsabgleich und Abschlussvalidierung.

## Phase 7: Dokumentationsabgleich und Abschlussvalidierung

**Ziel:** Neue oder geaenderte Contracts auffindbar machen und abschliessend validieren.

Zu pruefen:

1. `engine/README.md`
   - Aktualisieren, wenn Engine-/Settlement-Contracts oder Build-Regeln betroffen sind.
2. `docs/reference/TECHNICAL.md`
   - Aktualisieren, wenn Steuerdatenfluss, Settlement oder Simulator-Recompute konkretisiert wird.
3. `docs/reference/SIMULATOR_MODULES_README.md`
   - Aktualisieren, wenn Simulator-Steuerpfade oder Portfolio-Tranchen-Contracts geaendert werden.
4. `docs/reference/BALANCE_MODULES_README.md`
   - Aktualisieren, wenn Balance-Renderer-/Diagnose-Sicht auf Steuerdaten geaendert wird.
5. `tests/README.md`
   - Aktualisieren, wenn neue Testdateien entstehen oder Testabdeckung wesentlich erweitert wird.
6. `docs/internal/PROJEKTUEBERSICHT.md`
   - Engine-/Tax-Golden-Cases als umgesetzt markieren, wenn abgeschlossen.

Abschlussvalidierung:

```bash
node tests/run-tests.mjs
```

Zusaetzlich bei Engine- oder `EngineAPI`-Aenderungen:

```bash
npm run build:engine
node tests/run-tests.mjs
```

Wenn `npm test` lokal funktioniert, ist `npm test` der bevorzugte Befehl. Falls die lokale npm-CLI fehlt, ist `node tests/run-tests.mjs` der direkte Runner aus `package.json`.

**Reviewzeitpunkt R7:** Abschlussentscheidung und anschliessende Archivierung unter `docs/internal/archive/2026-engine-tax-golden-cases/`.

### Phase-7-Ergebnis: Dokumentationsabgleich und Abschlussvalidierung

Der Slice ist am 2026-05-12 abgeschlossen worden.

Aktualisierte Referenzen:

- `engine/README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `tests/README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `docs/internal/README.md`
- `docs/internal/archive/README.md`

Abschlussvalidierung:

```bash
npm run build:engine
node tests/run-tests.mjs
```

Ergebnis:

- Engine-Build lief gruen; lokal wurde der Fallback-Build ohne `esbuild` genutzt.
- Die komplette Suite lief gruen: 74 Testdateien, 1639 Assertions, 0 Fehler.
- Der Plan wurde unter `docs/internal/archive/2026-engine-tax-golden-cases/` archiviert.

## Testplan

### Fokussierte Baseline

```bash
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/tax-settlement.test.mjs
node tests/run-single.mjs tests/core-tax-settlement.test.mjs
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
```

### Erweiterte steuernahe Tests

```bash
node tests/run-single.mjs tests/transaction-engine-ath.test.mjs
node tests/run-single.mjs tests/transaction-engine-rebal.test.mjs
node tests/run-single.mjs tests/transaction-gold-liquidity.test.mjs
node tests/run-single.mjs tests/transaction-quantization.test.mjs
node tests/run-single.mjs tests/core-engine.test.mjs
node tests/run-single.mjs tests/engine-robustness.test.mjs
```

### Abschlussvalidierung

```bash
node tests/run-tests.mjs
```

### Engine-Build nur bei Engine-/API-Aenderungen

```bash
npm run build:engine
node tests/run-tests.mjs
```

## Review-Checkliste

- [x] Sind alle Golden-Cases synthetisch und ohne lokale Finanzdaten?
- [x] Sind Erwartungswerte nachrechenbar und nicht nur Snapshot-artig?
- [x] Wird zwischen Plansteuer und finaler Settlement-Steuer klar unterschieden?
- [x] Bleiben signierte Verlustaggregate erhalten?
- [x] Wird TQF symmetrisch auf Gewinne und Verluste angewandt?
- [x] Wird LossCarry vor SPB und Steuer korrekt behandelt?
- [x] Bleiben `taxStatePrev` und andere Eingabeobjekte non-mutating?
- [x] Sind Forced-Sale-Recompute und regulärer Verkauf im Simulator konsistent?
- [x] Wurde `engine.js` nicht manuell editiert?
- [x] Wurde bei Engine-Aenderungen `npm run build:engine` ausgefuehrt?
- [x] Wurde dokumentiert, wenn nur fokussierte Tests statt Gesamtsuite liefen?
- [x] Wurde Doku nur dort geaendert, wo sich Contracts oder Modulverantwortung tatsaechlich geaendert haben?

## Abbruch- und Eskalationskriterien

Die Umsetzung sollte pausiert und neu bewertet werden, wenn:

- Baseline-Tests bereits ohne Aenderungen fehlschlagen und der Fehler nicht klar steuer-/enginebezogen ist.
- ein erwarteter Golden-Case eine neue fachliche Steuerentscheidung statt eines bestehenden Contracts verlangt.
- Testwerte nur mit realen Nutzerdaten oder lokalen Snapshots plausibel gemacht werden koennen.
- ein Fix groessere Engine- oder Simulator-Refactors erfordert, bevor die Contract-Luecke isoliert ist.
- externe steuerliche Interpretation noetig wird; dann wird der Befund dokumentiert und nicht stillschweigend implementiert.
