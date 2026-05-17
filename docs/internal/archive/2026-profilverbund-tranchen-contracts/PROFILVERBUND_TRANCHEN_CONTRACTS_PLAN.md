# Profilverbund-/Tranchen-Contracts: Umsetzungsplan

**Stand:** 2026-05-12  
**Zweck:** Arbeitsplan zur Absicherung der Datenvertraege zwischen Profilverbund, Tranchen, Balance, Simulator und steuerrelevanten Portfolio-Pfaden.  
**Status:** abgeschlossen, archivierungsbereit.  
**Scope:** `app/profile/`, `app/tranches/`, profilnahe Balance-/Simulator-Integrationen, bestehende Profilverbund-/Tranchen-/Steuertests und Referenzdokumentation.  
**Nicht-Scope:** Fachliche Neugestaltung von FIFO/TQF/LossCarry, Engine-Refactoring, UI-Redesign, Tauri-Release-Artefakte.

## Zielbild

Profilverbund und Tranchen sollen als stabile Verbindungsdaten zwischen den Apps pruefbar bleiben. Balance und Simulator duerfen Profil- und Tranchenwerte unterschiedlich darstellen, muessen aber dieselben fachlichen Grenzen einhalten: Profile bleiben getrennt, Aggregationen sind nachvollziehbar, Tranchen werden nicht doppelt gezaehlt und steuerrelevante Felder behalten ihre Bedeutung.

Erfolgreich ist der Slice, wenn:

- Profilauswahl, Profilwechsel und Haushaltszuordnung als Contracts dokumentiert sind.
- Balance-Entnahmeverteilung und Profilverbund-Aggregation gegen Grenzfaelle abgesichert sind.
- Simulator-Multiprofil-Inputs dieselben Profil-/Tranchenannahmen verwenden wie die Referenzdoku.
- Tranchenuebernahme, Fallbacks und aggregierte Assetwerte keine widerspruechlichen Summen erzeugen.
- Steuerrelevante Tranchenfelder fuer Folgearbeiten klar benannt sind, ohne die Steuerlogik in diesem Slice neu zu bauen.
- Doku und Tests den aktuellen Stand ohne Widerspruch abbilden.

## Relevante Dateien

| Bereich | Dateien |
| --- | --- |
| Profil-Registry und Persistenz | `app/profile/profile-storage.js`, `profile-registry.js`, `profile-key-policy.js`, `profile-live-storage.js`, `profile-bundle-io.js`, `profile-state.js` |
| Profil-UI und Bridge | `app/profile/profile-manager.js`, `profile-bridge.js`, `profile-navigation.js` |
| Balance-Profilverbund | `app/profile/profilverbund-balance.js`, `profilverbund-balance-ui.js`, `app/balance/balance-main-profilverbund.js`, `balance-main-profile-sync.js`, `balance-action-postprocessor.js` |
| Tranchen | `app/tranches/depot-tranchen-status.js`, `tranchen-manager-state.js`, `tranchen-manager-renderer.js`, `tranchen-manager-modal.js`, `tranchen-manager-page.js` |
| Simulator-Profilverbund | `app/simulator/simulator-profile-inputs.js`, `simulator-main-profiles.js`, `simulator-portfolio-init.js`, `simulator-portfolio-tranches.js` |
| Steuer-/Portfolio-nahe Pfade | `engine/transactions/TransactionEngine.mjs`, `engine/tax-settlement.mjs`, `app/simulator/simulator-tax-recompute.js`, `simulator-forced-sale.js` |
| Bestehende Tests | `tests/profile-storage.test.mjs`, `profile-state.test.mjs`, `profile-navigation.test.mjs`, `profile-asset-values.test.mjs`, `profilverbund-balance.test.mjs`, `profilverbund-profile-gold-overrides.test.mjs`, `simulator-multiprofile-aggregation.test.mjs`, `depot-tranches.test.mjs`, `tranchen-manager-*.test.mjs`, `transaction-tax.test.mjs`, `tax-settlement.test.mjs`, `simulator-tax-settlement.test.mjs` |
| Referenzen | `docs/reference/PROFILVERBUND_FEATURES.md`, `docs/reference/TECHNICAL.md`, `docs/reference/BALANCE_MODULES_README.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `tests/README.md`, `docs/internal/PROJEKTUEBERSICHT.md` |

## Risiko- und Ertragsbewertung

| Thema | Aufwand | Aenderungsrisiko | Ertrag | Entscheidung |
| --- | --- | --- | --- | --- |
| Baseline und Contract-Matrix | niedrig | niedrig | hoch | zuerst angehen |
| Profil-Storage-/Profilwechsel-Contracts | mittel | niedrig-mittel | hoch | priorisieren |
| Balance-Entnahmeverteilung ueber Profile | mittel | mittel | hoch | priorisieren |
| Simulator-Multiprofil-/Tranchenaggregation | mittel | mittel | hoch | priorisieren |
| Tranchen-Fallbacks und Asset-Summen | mittel | mittel | hoch | priorisieren |
| Steuer-Golden-Cases | hoch | mittel-hoch | sehr hoch | als Folgeslice vorbereiten, hier nur Schnittstellen klaeren |
| UI-Refactor Profil-/Tranchenverwaltung | hoch | mittel-hoch | unklar | nicht anfassen ohne belegte Luecke |

## Arbeitsprinzipien

1. Erst Baseline und Contract-Matrix, dann Tests oder Fixes.
2. Profil- und Tranchen-Contracts vor Codeaenderungen explizit benennen.
3. Keine echten lokalen Finanzdaten, Snapshots oder Exporte in Tests oder Doku uebernehmen.
4. Aggregierte Werte und Detailtranchen nicht gleichzeitig als unabhaengige Quelle zaehlen.
5. Profile bleiben Transaktionsgrenzen; ein Profil darf nicht stillschweigend Vermoegen eines anderen Profils verkaufen.
6. Steuerlogik nur dort anfassen, wo ein reproduzierbarer Contract-Bruch im Profil-/Tranchenuebergang belegt ist.
7. Doku-Sync nur bei tatsaechlicher Contract-, Workflow- oder Modulverantwortungs-Aenderung.

## Phase 0: Baseline und Arbeitsgrenze

**Ziel:** Aktuellen Profilverbund-/Tranchen-Teststand reproduzierbar erfassen.

Arbeitsschritte:

1. `git status --short` pruefen und fremde Aenderungen notieren.
2. Fokussierte Baseline ausfuehren:
   - `node tests/run-single.mjs tests/profile-storage.test.mjs`
   - `node tests/run-single.mjs tests/profile-state.test.mjs`
   - `node tests/run-single.mjs tests/profile-navigation.test.mjs`
   - `node tests/run-single.mjs tests/profile-asset-values.test.mjs`
   - `node tests/run-single.mjs tests/profilverbund-balance.test.mjs`
   - `node tests/run-single.mjs tests/profilverbund-profile-gold-overrides.test.mjs`
   - `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs`
   - `node tests/run-single.mjs tests/depot-tranches.test.mjs`
   - `node tests/run-single.mjs tests/tranchen-manager-state.test.mjs`
   - `node tests/run-single.mjs tests/tranchen-manager-renderer.test.mjs`
   - `node tests/run-single.mjs tests/tranchen-manager-modal.test.mjs`
3. Bei steuer-/settlementnahen Befunden zusaetzlich fokussiert:
   - `node tests/run-single.mjs tests/transaction-tax.test.mjs`
   - `node tests/run-single.mjs tests/tax-settlement.test.mjs`
   - `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`
4. Fehler klassifizieren, bevor neue Tests geschrieben werden:
   - bestehender Defekt,
   - instabile Testannahme,
   - echte Contract-Luecke,
   - Doku-/Contract-Widerspruch.

**Reviewzeitpunkt R0:** Nach Baseline. Entscheidung: weiter mit Contract-Matrix oder zuerst bestehenden Fehler isolieren.

### Phase-0-Ergebnis: Baseline

Die fokussierte Profilverbund-/Tranchen-Baseline lief am 2026-05-12 gruen.

Ausgefuehrte Tests:

```bash
node tests/run-single.mjs tests/profile-storage.test.mjs
node tests/run-single.mjs tests/profile-state.test.mjs
node tests/run-single.mjs tests/profile-navigation.test.mjs
node tests/run-single.mjs tests/profile-asset-values.test.mjs
node tests/run-single.mjs tests/profilverbund-balance.test.mjs
node tests/run-single.mjs tests/profilverbund-profile-gold-overrides.test.mjs
node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
node tests/run-single.mjs tests/tranchen-manager-state.test.mjs
node tests/run-single.mjs tests/tranchen-manager-renderer.test.mjs
node tests/run-single.mjs tests/tranchen-manager-modal.test.mjs
```

Ergebnis:

- alle fokussierten Tests bestanden,
- keine steuer-/settlementnahe Fehlerspur gefunden,
- optionale Zusatztests `transaction-tax`, `tax-settlement` und `simulator-tax-settlement` deshalb nicht ausgefuehrt,
- Arbeitsbaum enthaelt bereits offene Aenderungen aus den abgeschlossenen Simulator-/Balance-Slices sowie diese neue Plan-Doku,
- Git meldete weiterhin fehlenden Zugriff auf `C:\Users\Diete\.config\git\ignore`, ohne Tests oder Dokuarbeit zu blockieren.

**R0-Entscheidung:** Weiter mit Phase 1, Contract-Matrix fuer Profilverbund, Tranchenuebernahme, Balance-Verteilung und Simulator-Multiprofil erstellen.

## Phase 1: Contract-Matrix

**Ziel:** Explizit festlegen, welche Profil-/Tranchenvertraege abgesichert werden sollen.

Zu erfassen:

| Contract-Bereich | Leitfragen | Erwarteter Fokus |
| --- | --- | --- |
| Profil-Registry | Welche Keys sind profilbezogen, welche global? Wie werden Default, Rename, Delete, Switch und Import/Export gesichert? | `profile-storage`, `profile-state`, Key-Policy |
| Haushaltsauswahl | Welche Profile gelten als aktiv? Wie wirken `belongsToHousehold` und aktuelle Auswahl in Balance und Simulator? | Profilselektion, Legacy-Keys, Default-Auswahl |
| Balance-Aggregation | Welche Werte werden summiert, ueberschrieben oder aus Tranchen abgeleitet? | Bedarf, Rente, Depot Alt/Neu, Gold, Cash |
| Entnahmeverteilung | Wie unterscheiden sich `tax_optimized`, `proportional` und `runway_first` bei Grenzfaellen? | Profilgrenzen, Rundung, Restbetrag, Nullvermoegen |
| Tranchenuebernahme | Wann schlagen Detailtranchen aggregierte Depotwerte, wann nicht? | `depot_tranchen`, Overrides, Fallbacks |
| Simulator-Aggregation | Welche Felder werden fuer Person 1/Partner und Portfolio zusammengefuehrt? | `combineSimulatorProfiles`, Gold-Overrides, >2 Profile |
| Steuernahe Felder | Welche Felder muessen fuer den Engine-/Tax-Folgeslice stabil bleiben? | `marketValue`, `costBasis`, `purchaseDate`, `tqf`, `type`, Gewinn-/Verlustpositionen |

Artefakt:

- Contract-Matrix als Abschnitt in diesem Plan ergaenzen.
- Priorisierte Luecken benennen, bevor Tests erweitert werden.

**Reviewzeitpunkt R1:** Nach Matrix. Entscheidung: Welche Contracts werden sofort mit Tests abgesichert, welche gehen in den Engine-/Tax-Folgeslice.

### Phase-1-Ergebnis: Contract-Matrix

| Contract | Produktiver Pfad | Bestehende Absicherung | Luecke / naechster Testfokus | Prioritaet |
| --- | --- | --- | --- | --- |
| Profilbezogene und globale Keys bleiben getrennt | `profile-key-policy.js`, `profile-live-storage.js`, `profile-storage.js` | `profile-storage.test.mjs` prueft scoped Keys, Clear/Load, globale Keys und Profilwechsel; `profile-state.test.mjs` prueft stabile Key-Konstanten | Bundle-Import/-Export enthaelt Profile und Globals, aber Tranchentransfer pro Profil ist nicht als eigener Contract sichtbar | mittel |
| Haushaltsauswahl respektiert `belongsToHousehold=false` | `loadProfilverbundProfiles()`, Profil-Registry | `profilverbund-profile-gold-overrides.test.mjs` prueft Ausschluss aus Balance-Profilverbund; `profile-storage.test.mjs` prueft Membership-Metadaten | Simulator-Selektion nutzt bereits uebergebene Profile; ein direkter Contract fuer "nur aktive Haushaltsprofile gehen in `combineSimulatorProfiles()`" liegt ausserhalb der Funktion und ist noch nicht testnah benannt | mittel |
| Profil-Fallbacks ohne gespeicherten Balance-State bleiben nutzbar | `loadProfilverbundProfiles()`, `parseProfileOverridesFromData()`, `parseStoredTranchesFromData()` | `profilverbund-balance.test.mjs` Test 7 prueft Overrides und Tranchen ohne Balance-State | Korrupte/teilweise leere Tranchendaten in solchen Fallback-Profilen sind noch nicht explizit abgesichert | mittel |
| Balance-Aggregation summiert Bedarf, Renten, Depot, Liquiditaet | `aggregateProfilverbundInputs()` | `profilverbund-balance.test.mjs` Test 1 prueft Kern-Summen und konservative Runway-Minimums | Asset-Summary-Helfer `buildProfilverbundAssetSummary()` und `buildProfilverbundProfileSummaries()` sind nicht direkt getestet, obwohl sie Detailtranchen vs. Aggregatwerte entscheiden | hoch |
| Detailtranchen ersetzen aggregierte Balance-Assetwerte, wenn vorhanden | `loadProfilverbundProfiles()`, `buildProfilverbundAssetSummary()`, `buildProfilverbundProfileSummaries()` | Test 7 prueft Equity- und Geldmarkt-Tranchen als Fallback | Alt/Neu/Gold/Money-Market-Split mit gleichzeitig vorhandenen aggregierten Inputs ist nicht direkt gegen Doppelzaehlung abgesichert | hoch |
| Steueroptimierte Tranchenauswahl nutzt nur Equity und sortiert Steuerlast vor FIFO | `selectTranchesForSale()` | `profilverbund-balance.test.mjs` Tests 5-6 pruefen Equity-Filter, Steuerlast und Datum; `depot-tranches.test.mjs` prueft FIFO-Reduktion im Simulator-Portfolio | Verlustpositionen bzw. negative Gewinnquoten werden in diesem Balance-Helper nicht als steuerlicher Golden-Case behandelt; gehoert voraussichtlich in Engine-/Tax-Folgeslice | niedrig fuer diesen Slice |
| Entnahmeverteilung proportional bleibt assetgewichtet | `calculateWithdrawalDistribution(..., 'proportional')` | `profilverbund-balance.test.mjs` Test 3 | Cash-first-Aufteilung, Restbetrag und Nullvermoegen sind nicht separat abgesichert | mittel |
| Entnahmeverteilung steueroptimiert bleibt greedy nach Steuerlast | `calculateWithdrawalDistribution(..., 'tax_optimized')` | `profilverbund-balance.test.mjs` Test 4 | Tranchenauswahl innerhalb der Verteilung und Cash-first-Verhalten ueber mehrere Profile sind nicht direkt getestet | hoch |
| Entnahmeverteilung `runway_first` nutzt Runway-Zielgewichte | `calculateWithdrawalDistribution(..., 'runway_first')` | keine explizite Testabdeckung gefunden | Neuer Contract-Test fuer Runway-Gewichte, Nullgewichte und Restbetrag noetig | hoch |
| Profilverbund-Action-Merge bleibt pro Profil nachvollziehbar | `balance-action-postprocessor.js`, `balance-main-profilverbund.js` | indirekte Abdeckung in Balance-/Decumulation-Tests, aber nicht in diesem Baseline-Set sichtbar | Quellen/Verwendungen je Profil und keine profiluebergreifenden Verkaeufe als eigener Contract fehlen | hoch |
| Simulator-Multiprofil summiert Startvermoegen, Floor/Flex und Renten | `combineSimulatorProfiles()` | `simulator-multiprofile-aggregation.test.mjs` Test 1 | Keine Detailtranchensummen im Test, obwohl produktiver Pfad `detailledTranches` merged und `startVermoegen` daraus neu ableitet | hoch |
| Simulator-Demografie begrenzt auf zwei Personen und warnt bei >2 Profilen | `combineSimulatorProfiles()` | `simulator-multiprofile-aggregation.test.mjs` Tests 1-2 | Keine Pruefung, dass das dritte Profil finanziell enthalten bleibt, obwohl Demografie begrenzt wird | mittel |
| Simulator ignoriert Dynamic-Flex-Profilunterschiede als Haushaltswarnung | `combineSimulatorProfiles()` | `simulator-multiprofile-aggregation.test.mjs` Test 3 | ausreichend fuer aktuellen Contract | niedrig |
| Simulator-Tranchen-Merge erzeugt eindeutige IDs und `sourceProfileId` | `combineSimulatorProfiles()` `normalizeTranche()` | keine explizite Testabdeckung gefunden | Neuer Test fuer gleiche Tranche-IDs in mehreren Profilen, Prefix/Suffix und `sourceProfileId` noetig | hoch |
| Simulator-Tranchen-Fallback bei unplausiblen Marktwerten | `combineSimulatorProfiles()` | keine explizite Testabdeckung gefunden | Warnung "Tranchen ohne Marktwert" und Rueckfall auf Aggregat bzw. `detailledTranches=null` pruefen | hoch |
| Tranchenmanager normalisiert IDs und berechnet derived values | `tranchen-manager-state.js`, `tranchen-manager-modal.js` | `tranchen-manager-state.test.mjs`, `tranchen-manager-modal.test.mjs` | UI-nahe Persistenz ist ausreichend fuer diesen Slice; keine neue Luecke ohne konkreten Defekt | niedrig |
| Steuernahe Tranchenfelder bleiben fuer Folgeslice benannt | `simulator-portfolio-tranches.js`, `TransactionEngine.mjs`, `tax-settlement.mjs` | `depot-tranches.test.mjs`, `transaction-tax.test.mjs`, `tax-settlement.test.mjs`, `simulator-tax-settlement.test.mjs` existieren | Haushalts-/Profil-Golden-Cases mit FIFO/TQF/LossCarry sind bewusst Folgeslice `2026-engine-tax-golden-cases` | niedrig fuer diesen Slice |

**R1-Entscheidung:** Phase 2 sollte zuerst die profil- und haushaltsnahen Luecken klein halten:

1. Tranchentransfer pro Profil im Bundle-/Profil-Storage-Kontext sichtbar absichern, falls bestehende Tests das ohne grosse Mocks erlauben.
2. `belongsToHousehold=false` fuer den gesamten Profilverbund-Ladepfad beibehalten; Simulator-Selektion nur dokumentieren, wenn kein passender Modul-Hook existiert.

Phase 3 sollte danach Balance-spezifisch ergaenzen:

1. `runway_first`-Entnahmeverteilung.
2. Cash-first/Tranchenauswahl in `tax_optimized`.
3. `buildProfilverbundAssetSummary()` und `buildProfilverbundProfileSummaries()` gegen Doppelzaehlung mit Detailtranchen.
4. Wenn gut isolierbar: Profilverbund-Action-Merge als eigener Contract.

Phase 4 sollte Simulator-spezifisch ergaenzen:

1. Detailtranchen-Merge mit eindeutigen IDs und `sourceProfileId`.
2. Startvermoegen aus Tranchensummen plus Liquiditaet.
3. >2 Profile: finanzielle Summen bleiben enthalten, Demografie bleibt begrenzt.
4. Tranche-ohne-Marktwert-Fallback und Warnung.

Phase 5 bleibt bewusst vorbereitend fuer den Engine-/Tax-Golden-Case-Slice; keine Steuerlogik-Aenderung ohne reproduzierten Profil-/Tranchen-Contract-Bruch.

## Phase 2: Profil-Storage und Haushaltsgrenzen absichern

**Ziel:** Profilwechsel, profilbezogene Keys und Haushaltsauswahl bleiben robust.

Geplante Pruefpunkte:

1. Profilwechsel loescht/ersetzt nur profilbezogene Keys.
2. Globale Keys wie Snapshot-/Meta-Strukturen bleiben erhalten.
3. `belongsToHousehold=false` wird in Balance/Simulator nicht versehentlich aggregiert.
4. Import/Export und Bundle-Transfer erhalten `depot_tranchen` eindeutig pro Profil.
5. Korrupte oder teilweise alte Profile degradieren kontrolliert statt falsche Summen zu erzeugen.

**Reviewzeitpunkt R2:** Nach Storage-/Haushalts-Tests. Entscheidung: Nur Testausbau oder gezielter Fix in `app/profile/`.

### Phase-2-Ergebnis: Profil-Storage und Haushaltsgrenzen

Ergaenzt wurde `tests/profile-storage.test.mjs` um den Contract `Export/Import preserves current profile tranches`.

Abgedeckte Contracts:

- `exportProfilesBundle()` speichert vor dem Export den aktuellen Live-Storage ins aktive Profil.
- `depot_tranchen` bleibt dabei profilbezogen im Bundle enthalten.
- `importProfilesBundle()` stellt das aktuelle Profil wieder in den Live-Storage her.
- Profilwerte wie `profile_tagesgeld` und Detailtranchen werden gemeinsam wiederhergestellt.

Der fokussierte Lauf `node tests/run-single.mjs tests/profile-storage.test.mjs` war gruen. Kein Produktivcode-Fix war noetig.

**R2-Entscheidung:** Phase 2 ist abgeschlossen. Weiter mit Phase 3, Balance-Profilverbund und Entnahmeverteilung.

## Phase 3: Balance-Profilverbund und Entnahmeverteilung

**Ziel:** Balance-Aggregation und Entnahmeverteilung ueber Profile als fachlicher Contract.

Geplante Pruefpunkte:

1. Aggregation summiert Bedarf, Renten, Liquiditaet und Assets ohne Doppelzaehlung.
2. Detailtranchen ueberschreiben Depot Alt/Neu nur in den dokumentierten Faellen.
3. Entnahmeverteilung:
   - proportional nach Asset-Anteil,
   - steueroptimiert nach erwarteter Steuerlast,
   - runway-first nach Liquiditaetsdeckung.
4. Null-/Negativ-/Restbetrag-Grenzfaelle erzeugen stabile Ergebnisse.
5. Profilverbund-Action-Merge laesst Quellen und Verwendungen pro Profil nachvollziehbar.

**Reviewzeitpunkt R3:** Nach Balance-Profilverbund-Tests. Entscheidung: Produktivfix nur bei reproduzierter Contract-Luecke.

### Phase-3-Ergebnis: Balance-Profilverbund und Entnahmeverteilung

Erweitert wurde `tests/profilverbund-balance.test.mjs`.

Neue/erweiterte Contracts:

- `runway_first` verteilt Entnahmen anhand der Runway-Zielgewichte.
- `tax_optimized` nutzt Tagesgeld und Geldmarkt vor Tranchenauswahl.
- Die Tranchenauswahl innerhalb der Verteilung verkauft nur den Restbedarf und waehlt zuerst die niedrigere Steuerlast.
- `buildProfilverbundAssetSummary()` und `buildProfilverbundProfileSummaries()` nutzen Detailtranchen statt aggregierter Assetwerte, wenn Tranchen vorhanden sind.
- Detailtranchen werden dadurch nicht mit `depotwertAlt`, `depotwertNeu`, `goldWert` oder `geldmarktEtf` doppelt gezaehlt.

Der fokussierte Lauf `node tests/run-single.mjs tests/profilverbund-balance.test.mjs` war gruen. Kein Produktivcode-Fix war noetig.

**R3-Entscheidung:** Phase 3 ist abgeschlossen. Weiter mit Phase 4, Simulator-Multiprofil und Tranchenaggregation.

## Phase 4: Simulator-Multiprofil und Tranchenaggregation

**Ziel:** Simulator-Inputs aus mehreren Profilen bleiben konsistent mit Profil- und Tranchen-Contracts.

Geplante Pruefpunkte:

1. `combineSimulatorProfiles()` summiert Vermoegen, Floor/Flex, Renten und Tranchen kontrolliert.
2. Profil 1/2 werden konsistent auf Person/Partner gemappt; >2 Profile erzeugen Warnung, aber keine stillen Datenverluste.
3. Gold-Strategie und Gold-Tranchen werden nicht doppelt in Zielwert und Detailtranche eingerechnet.
4. Unplausible Tranchensummen fallen auf aggregierte Werte zurueck und melden eine Warnung.
5. Startvermoegen, Depot Alt/Neu und liquide Werte bleiben zwischen Profilinputs und Portfolio-Initialisierung erklaerbar.

**Reviewzeitpunkt R4:** Nach Simulator-/Tranchen-Tests. Entscheidung: Abschluss moeglich oder gezielter Fix in `simulator-profile-inputs.js`/Portfolio-Tranchen.

### Phase-4-Ergebnis: Simulator-Multiprofil und Tranchenaggregation

Erweitert wurde `tests/simulator-multiprofile-aggregation.test.mjs`.

Neue/erweiterte Contracts:

- Bei mehr als zwei Profilen bleibt das dritte Profil finanziell in den Summen enthalten; nur die Demografie wird begrenzt.
- Detailtranchen mehrerer Profile werden zusammengefuehrt.
- Tranche-IDs werden mit Profilpraefix eindeutig gemacht.
- `sourceProfileId` bleibt am zusammengefuehrten Trancheneintrag erhalten.
- `startVermoegen` wird bei plausiblen Detailtranchen aus Tranchensummen plus Liquiditaet abgeleitet.
- Null-Marktwert-Tranchen erzeugen eine Warnung, werden aus den kombinierten Simulator-Inputs entfernt und fallen auf aggregierte Startwerte zurueck.

Gefundener Fix:

- `app/simulator/simulator-profile-inputs.js` setzte `combined.startVermoegen` bei Null-Marktwert-Tranchen bereits vor der Fallback-Entscheidung auf `0`, obwohl die Warnung "Additiv nutzt Aggregat" meldete. Der Fix verschiebt die Ueberschreibung in den plausiblen Tranchensummen-Pfad; bei `trancheWithCash <= 0` bleibt das vorher aggregierte Vermoegen erhalten und `detailledTranches` wird auf `null` gesetzt.

Der fokussierte Lauf `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs` war gruen.

**R4-Entscheidung:** Phase 4 ist abgeschlossen. Weiter mit Phase 5, steuernahe Schnittstellen nur dokumentieren.

## Phase 5: Steuernahe Schnittstellen fuer Folgeslice vorbereiten

**Ziel:** Keine neue Steuerlogik bauen, aber die Contract-Grenzen fuer `2026-engine-tax-golden-cases` festhalten.

Zu klaeren:

1. Welche Tranchenfelder sind Pflicht fuer FIFO/TQF/LossCarry?
2. Welche Felder duerfen aus Profil-/Simulator-Aggregation fehlen und brauchen Fallbacks?
3. Welche Testfaelle fehlen fuer typische Haushalts- und Depotkonstellationen?
4. Welche Golden-Cases gehoeren in den naechsten Slice statt in diesen?

**Reviewzeitpunkt R5:** Nach Schnittstellenklaerung. Entscheidung: Welche Findings werden in den naechsten Engine-/Tax-Plan uebernommen.

### Phase-5-Ergebnis: Steuernahe Schnittstellen

In diesem Slice wurde keine Steuerlogik geaendert. Die neuen Contracts grenzen nur ab, welche Profil-/Tranchenwerte in die nachgelagerten Steuerpfade gelangen.

Fuer den Folgeslice `2026-engine-tax-golden-cases` bleiben als Kandidaten:

- Haushalts-Golden-Case mit zwei Profilen, eindeutigen `sourceProfileId`s und FIFO-Verkaeufen je Profil.
- Verlustpositionen in Detailtranchen mit signierter Gewinnquote und LossCarry-Settlement.
- TQF-Grenzfall fuer Aktienfonds vs. Gold-/Geldmarkt-Tranchen.
- Notfallverkauf im Simulator mit regularem Verkauf und anschliessendem Settlement-Recompute.

**R5-Entscheidung:** Keine weiteren Steuer-/Engine-Aenderungen in diesem Slice. Weiter mit Phase 6, Doku-Abgleich und Abschlussvalidierung.

## Phase 6: Dokumentationsabgleich und Abschlussvalidierung

**Ziel:** Neue oder geaenderte Contracts auffindbar machen und abschliessend validieren.

Zu pruefen:

1. `docs/reference/PROFILVERBUND_FEATURES.md`
   - Aktualisieren, wenn Auswahl-, Aggregations- oder Tranchenregeln konkretisiert werden.
2. `docs/reference/TECHNICAL.md`
   - Aktualisieren, wenn Datenfluesse oder Modulverantwortungen geaendert werden.
3. `docs/reference/BALANCE_MODULES_README.md`
   - Aktualisieren, wenn Balance-Profilverbund-Contracts oder Modulverantwortungen geaendert werden.
4. `docs/reference/SIMULATOR_MODULES_README.md`
   - Aktualisieren, wenn Simulator-Multiprofil- oder Portfolio-Tranchen-Contracts geaendert werden.
5. `tests/README.md`
   - Aktualisieren, wenn neue Testdateien entstehen oder Testabdeckung wesentlich erweitert wird.
6. `docs/internal/PROJEKTUEBERSICHT.md`
   - Profilverbund-/Tranchen-Slice als umgesetzt markieren, wenn abgeschlossen.

Abschlussvalidierung:

```bash
node tests/run-tests.mjs
```

Wenn `npm test` lokal funktioniert, ist `npm test` der bevorzugte Befehl. Falls die lokale npm-CLI fehlt, ist `node tests/run-tests.mjs` der direkte Runner aus `package.json`.

**Reviewzeitpunkt R6:** Abschlussentscheidung und anschliessende Archivierung unter `docs/internal/archive/2026-profilverbund-tranchen-contracts/`.

### Phase-6-Ergebnis: Doku-Abgleich und Abschlussvalidierung

Der Doku-Abgleich wurde abgeschlossen.

Aktualisierte Referenzen:

- `docs/reference/PROFILVERBUND_FEATURES.md`
  - Simulator-Tranchen-Merge, `sourceProfileId`, Null-Marktwert-Fallback und Testreferenzen ergaenzt.
  - Doppelte Zwischenueberschrift "Verwandte Dokumentation" entfernt.
- `docs/reference/TECHNICAL.md`
  - Profilverbund-Simulator-Contract fuer profilbezogene Tranche-IDs, `sourceProfileId` und Null-Marktwert-Fallback ergaenzt.
  - Balance-Verteilungscontract um Cash-vor-Tranchen und Detailtranchen-vor-Aggregatwerte ergaenzt.
- `docs/reference/BALANCE_MODULES_README.md`
  - Cash-/Tranchensummary-Contract bei `profilverbund-balance.js` dokumentiert.
- `docs/reference/SIMULATOR_MODULES_README.md`
  - Simulator-Profilinput-Contract fuer Tranche-IDs, `sourceProfileId`, plausible Tranchensummen und Null-Marktwert-Fallback dokumentiert.
- `tests/README.md`
  - Erweiterte Testabdeckung fuer `profile-storage`, `profilverbund-balance` und `simulator-multiprofile-aggregation` aktualisiert.
- `docs/internal/PROJEKTUEBERSICHT.md`
  - Profilverbund-/Tranchen-Slice als umgesetzt markiert.

Abschlussvalidierung:

```bash
node tests/run-tests.mjs
```

Ergebnis: 74 Testdateien, 1597 Assertions, 0 Fehler.

Hinweise:

- Es wurde keine Engine- oder Steuerlogik geaendert.
- Der produktive Fix war auf `app/simulator/simulator-profile-inputs.js` begrenzt.
- `npm test` wurde nicht verwendet; der direkte Runner aus `package.json` lief erfolgreich.

**R6-Entscheidung:** Slice abgeschlossen. Plan wird nach `docs/internal/archive/2026-profilverbund-tranchen-contracts/` verschoben.

## Testplan

### Fokussierte Tests waehrend der Umsetzung

```bash
node tests/run-single.mjs tests/profile-storage.test.mjs
node tests/run-single.mjs tests/profile-state.test.mjs
node tests/run-single.mjs tests/profile-navigation.test.mjs
node tests/run-single.mjs tests/profile-asset-values.test.mjs
node tests/run-single.mjs tests/profilverbund-balance.test.mjs
node tests/run-single.mjs tests/profilverbund-profile-gold-overrides.test.mjs
node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
node tests/run-single.mjs tests/tranchen-manager-state.test.mjs
node tests/run-single.mjs tests/tranchen-manager-renderer.test.mjs
node tests/run-single.mjs tests/tranchen-manager-modal.test.mjs
```

### Steuernahe Zusatztests nur bei betroffenen Findings

```bash
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/tax-settlement.test.mjs
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
```

### Abschlussvalidierung

```bash
node tests/run-tests.mjs
```

## Review-Checkliste

- [ ] Sind alle neuen Tests synthetisch und ohne lokale Finanzdaten?
- [ ] Sind profilbezogene und globale Storage-Keys klar getrennt?
- [ ] Wird `belongsToHousehold=false` in Balance und Simulator respektiert?
- [ ] Werden aggregierte Depotwerte und Detailtranchen nicht doppelt gezaehlt?
- [ ] Bleiben Transaktionen und Entnahmen pro Profil nachvollziehbar?
- [ ] Sind Gold-, Geldmarkt- und Aktien-Tranchen getrennt genug fuer Simulator und Steuerlogik?
- [ ] Wurde dokumentiert, wenn nur fokussierte Tests statt Gesamtsuite liefen?
- [ ] Wurde Doku nur dort geaendert, wo sich Contracts oder Modulverantwortung tatsaechlich geaendert haben?

## Abbruch- und Eskalationskriterien

Die Umsetzung sollte pausiert und neu bewertet werden, wenn:

- Baseline-Tests bereits ohne Aenderungen fehlschlagen und der Fehler nicht klar profil-/tranchenbezogen ist.
- ein Fix eine fachliche Engine-, Steuer- oder TQF-Entscheidung erfordert.
- reale Nutzerdaten, lokale Snapshots oder Exporte fuer Tests noetig waeren.
- Profilverbund- oder Tranchen-Contracts nur durch groessere UI-/Bootstrap-Refactors testbar werden.
