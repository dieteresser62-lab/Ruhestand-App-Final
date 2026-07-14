# Balance-App – Modulübersicht

Die Balance-App besteht aus 36 ES6-Modulen unter `app/balance/`. Das folgende Dokument fasst Verantwortung, Exporte und wichtige Abhängigkeiten zusammen.
Dateinamen werden unten kurz ohne Präfix genannt; tatsächlicher Pfad ist in der Regel `app/balance/<datei>.js`.
Ausnahmen: Profilverbund-Module liegen unter `app/profile/`, Shared-Formatter unter `app/shared/`.

**Stand:** 2026-07-14

## Vollstaendige Datei-Inventur

Die folgende Inventur wurde vor dem Balance-App-Hardening direkt gegen `app/balance/` abgeglichen. Sie ist die verbindliche Scope-Kontrolle fuer die geplanten Slices; gruppierte Detailbeschreibungen folgen darunter.

| Datei | Primaere Verantwortung |
|---|---|
| `balance-action-postprocessor.js` | Single-Profil-3-Bucket-Nachbearbeitung und Weitergabe der finalen Profilverbund-Aktion |
| `balance-annual-inflation.js` | Inflationsabruf und Bedarfs-/Faktorfortschreibung |
| `balance-annual-marketdata.js` | ETF-, ATH-, CAPE- und Nachruecken-Workflow |
| `balance-annual-modal.js` | Ergebnisdialog des Jahresupdates |
| `balance-annual-orchestrator.js` | Reihenfolge und explizites Erfolgs-/Fehlerresultat des Jahresupdates |
| `balance-annual-period.js` | DOM-freier Jahresperioden-, Legacy- und Recovery-Contract |
| `balance-binder-annual.js` | Fassade fuer Annual-Handler |
| `balance-binder-diagnosis.js` | Diagnose-Export und Copytext |
| `balance-binder-imports.js` | Versionierter Balance-JSON-Import/Export mit Dry-Run/Recovery sowie Markt-CSV-Import |
| `balance-binder-snapshots.js` | Periodengebundener Jahresprozess-Coordinator, Recovery und Snapshot-Aktionen |
| `balance-binder.js` | zentraler UI-Event-Hub |
| `balance-config.js` | App-Konfiguration, Engine-Versionsanforderung und Fehlertypen |
| `balance-diagnosis-chips.js` | Diagnose-Chips |
| `balance-diagnosis-decision-tree.js` | Entscheidungsbaum-Darstellung |
| `balance-diagnosis-format.js` | Normalisierung des Diagnose-Payloads |
| `balance-diagnosis-guardrails.js` | Guardrail-Diagnosekarten |
| `balance-diagnosis-keyparams.js` | Schluesselparameter und VPW-/Mindest-Flex-Diagnose |
| `balance-diagnosis-transaction.js` | Transaktionsdiagnostik und Blockgruende |
| `balance-expenses-csv.js` | Parser fuer kategorisierte Ausgaben-CSV |
| `balance-expenses-metrics.js` | DOM-freie Ausgabenkennzahlen und Forecasts |
| `balance-expenses-renderer.js` | Ausgabentabelle, Summary und Detaildialog |
| `balance-expenses-storage.js` | Ausgabenstore und Jahres-/Monatscontainer |
| `balance-expenses.js` | Controller/Fassade des Ausgaben-Checks |
| `balance-guardrail-reset.js` | Reset-Entscheidung bei relevanten Inputaenderungen |
| `balance-health-bucket.js` | DOM-freie Pflegebucket-Diagnose |
| `balance-main-profile-sync.js` | Profilwerte in Balance-DOM synchronisieren |
| `balance-main-profilverbund.js` | Haushalts-Engine-Lauf, einmalige 3-Bucket-Verarbeitung, Profilattribution und UI-Anbindung |
| `balance-main.js` | Bootstrap und zentrale Update-Pipeline |
| `balance-reader.js` | DOM-Eingaben und profil-/tranchenbezogene Overrides lesen |
| `balance-renderer-action.js` | Handlungsempfehlung und Profilquellen rendern |
| `balance-renderer-diagnosis.js` | Diagnose-Teilrenderer koordinieren |
| `balance-renderer-summary.js` | Summary, Liquiditaet, Marktstatus und Bedarf rendern |
| `balance-renderer.js` | Renderer-Fassade, Fehler und Theme |
| `balance-storage.js` | Balance-State, Migration, Snapshot-Archiv, Import-Recovery und Restore |
| `balance-update-pipeline.js` | Validierung, Last-State, Diagnose und Persistenzentscheidung |
| `balance-utils.js` | Zahlen-/Waehrungsformatierung und UI-Hilfen |

**Inventurergebnis:** 36 von 36 Dateien erfasst.

---

## 1. `balance-config.js`
Konfiguration, Fehlertypen und Debug-Utilities.

**Exports:**
- `REQUIRED_ENGINE_API_VERSION_PREFIX`
- `CONFIG`
- `AppError`
- `ValidationError`
- `FinancialCalculationError`
- `StorageError`


---

## 2. `balance-utils.js`
Formatierungs- und Hilfsfunktionen für die UI.

**Exports:**
- `UIUtils`
  - `EUR_FORMATTER` / `NUM_FORMATTER`
  - `formatCurrency(val)`
  - `formatNumber(num)`
  - `formatPercent(value, options)`
  - `formatPercentValue(value, options)`
  - `formatPercentRatio(value, options)`
  - `formatMonths(value, options)`
  - `parseCurrency(str)`
  - `getThreshold(path, defaultValue)` – greift sicher auf Engine-Konfigurationen zu

**Dependencies:** `app/shared/shared-formatting.js`

---

## 3. `balance-storage.js`
Persistenzschicht fuer Balance-State ueber `app/shared/persistence-facade.js` und das interne Snapshot-Archiv. Im Browser nutzt die Facade IndexedDB als lokale Source of Truth und migriert erlaubte Legacy-Keys automatisch aus `localStorage`; in Tauri nutzt sie JSON-Dateien im App-Datenverzeichnis und migriert erlaubte Legacy-Keys aus der WebView-`localStorage`-Ablage. Feature-Code nutzt weiter die synchrone Storage-like API.

**Exports:**
- `initStorageManager(domRefs, state, renderer)` – initialisiert Abhängigkeiten
- `StorageManager`
  - `loadState()` / `saveState(state)` / `resetState()`
  - `replaceStateFromImport(state)` – ersetzt nur den schema-validierten Balance-State nach bestaetigtem Import-Recovery-Snapshot
  - `rollbackImportReplace(receipt)` – stellt bei einem spaeten Importfehler alle im Recovery-Snapshot erfassten erlaubten Live-Daten wieder her
  - `initSnapshots()` / `renderSnapshots(listEl, statusEl, handle)`
  - `createSnapshot(handle)` / `restoreSnapshot(key, handle)` / `deleteSnapshot(key, handle)`
  - `connectFolder()` – Kompatibilitaets-/UI-Pfad fuer aeltere Ordnerbindung; neue Snapshots liegen im internen Archiv

**Dependencies:** `balance-config.js` (Konfiguration & Fehlerklassen), `app/shared/persistence-facade.js`, `app/shared/snapshot-archive.js`

**Snapshot-Archiv:** Jahresabschluss- und Import-Recovery-Snapshots werden als `persistence-records-v1` gespeichert. Import-Recovery-Punkte tragen den Kind-Wert `balance-import-recovery` und werden vor dem ersten Balance-Replace geschrieben und zurueckgelesen. Browser nutzt die IndexedDB-Datenbank `ruhestand-suite` Version 2 mit separatem Store `snapshots`; Tauri nutzt neben `ruhestand_suite_data.json` die separate Datei `ruhestand_suite_snapshots.json`. Ein optionales File-System-Verzeichnis-Handle liegt getrennt in `ruhestand-suite-snapshot-handles`; ein vorhandenes Handle aus der historischen `snapshotDB` wird uebernommen und die Legacy-Verbindung danach geschlossen. Blockiert ein anderer Tab deren Cleanup, setzt der Adapter keinen falschen Marker und setzt die Bereinigung bei einem spaeteren Lauf fort, ohne die Snapshot-Liste aufzuhalten. `listSnapshots()` zeigt nur Indexdaten ohne Vollpayload. Standard-Restore erhaelt die Snapshot-Historie, bewahrt die Profil-Registry und setzt nur das aktive Profil zurueck, wenn `snapshot.activeProfileId` in der aktuellen Registry existiert.

**Hinweis Steuerzustand:** `lastState.taxState.lossCarry` wird migriert/defaulted und bei Guardrail-Resets erhalten.

---

## 4. `balance-reader.js`
Liest UI-Eingaben und kümmert sich um UI-Side-Effects.

**Exports:**
- `initUIReader(domRefs)`
- `UIReader`
  - `readAllInputs()`
  - `applyStoredInputs(storedInputs)`
  - `applySideEffectsFromInputs()` – zeigt/verbirgt Panels (z. B. Gold, zweite Rente)

**Pflegebucket:** Liest die Profildefinition `profile_health_bucket` als optionalen Haushaltsbaustein. Die eigentliche Diagnose wird nicht im Reader berechnet, sondern an `balance-health-bucket.js` delegiert.

**Mindest-Flex:** Liest `minimumFlexAnnual` aus dem Feld `Mindest-Flex p.a. (EUR)` und gibt den Wert unverändert an die Engine weiter. Das Feld wird wie Floor, Flex und Flex-Budget inflationiert.

**Dependencies:** `balance-utils.js`, `balance-health-bucket.js`

---

## 5. `balance-renderer.js`
Renderlogik für KPIs, Guardrails, Diagnose, Toasts und Theme-Umschaltung.

**Exports:**
- `initUIRenderer(domRefs, storageManager)`
- `UIRenderer`
  - `render(ui)` – Hauptdarstellung
  - `renderMiniSummary(ui)` / `renderDiagnosis(diagnosis)` / `buildDecisionTree(treeData)`
  - `renderEntnahme(spending)` / `buildEntnahmeDetails(details, kuerzungQuelle)`
  - `renderMarktstatus(market)` / `buildGuardrails(guardrailData)`
  - `renderLiquidityBar(percent)` / `renderBedarfAnpassungUI(...)`
  - `toast(msg, isSuccess)` / `handleError(error)` / `clearError()`
  - `applyTheme(mode)`
  - Hilfsfunktionen wie `buildChips`, `buildKeyParams`, `determineInternalCashRebalance`

**Dependencies:** `balance-utils.js`, `balance-config.js`

**Helper-Module (ausgelagert):**
- `balance-renderer-summary.js` – KPIs, Marktstatus, Liquiditätsbalken
  - zeigt bei aktivem Pflegebucket Brutto-Liquidität, gesperrte Pflege-Zweckbindung, operative Liquidität, reale Zieldeckung und Ziel-Lücke
- `balance-renderer-action.js` – Handlungsempfehlungen & Cash-Rebalancing
  - gruppiert Transaktionen zusätzlich nach Zweck (`Liquidität`, `Gold`, `Aktien`, `Geldmarkt`, `Bonds`, `Steuer`, `Rest/Puffer`)
  - zeigt finale Settlement-Steuer (`action.steuer`) inkl. optionaler Aufschlüsselung
    (`taxBeforeLossCarry`, `taxAfterLossCarry`, `taxSavedByLossCarry`)
- `balance-renderer-diagnosis.js` – Diagnose-Chips, Guardrails, Kennzahlen
- `balance-diagnosis-format.js` – Diagnose-Payload normalisieren, inklusive Grenzfalltexten wie `Exakt auf Mindestniveau`
- `balance-diagnosis-chips.js` – Diagnose-Chips (Runway, Quote, Drawdown)
- `balance-diagnosis-decision-tree.js` – Entscheidungsbaum
- `balance-diagnosis-guardrails.js` – Guardrail-Karten mit Schwellenwert- und Grenzfallhinweisen
- `balance-diagnosis-transaction.js` – Transaktionsdiagnostik (Status, Schwellen, `Warum kein Goldkauf?`)
- `balance-diagnosis-keyparams.js` – Schlüsselkennzahlen, inklusive VPW-Trennung in Rahmen, freigegebenen Flex und nicht genutzten Spielraum
  - ergänzt Pflegebucket-Diagnose und weist `diagnostic_only` aus, wenn keine automatische Freigabe erfolgt
  - zeigt Mindest-Flex-Betrag, Status, Blockiergrund, erforderliche Rate und Effekt vor/nach dem Policy-Schritt

---

## 5a. `balance-health-bucket.js`
DOM-freie Diagnose des Pflegebuckets in der Balance-App.

**Hauptfunktionen / Contract:**
- Liest eine normalisierte `healthBucket`-Definition aus den Profil-/Reader-Daten.
- Berechnet Brutto-Liquidität, gesperrten Betrag, operative Liquidität, Zieldeckung und Ziellücke.
- Unterscheidet Herkunft aus Geldmarkt und Cash, soweit diese Werte im Profil-/Balance-Kontext verfügbar sind.
- Setzt die V1-Policy explizit auf `releasePolicy: 'diagnostic_only'`, `releaseAllowed: false` und `releasedAmount: 0`.
- Liefert Warnungen/Hinweise für Kappung, fehlende Zieldeckung und fehlende operative Freigabe.

**Abgrenzung:**
Balance entsperrt den Pflegebucket derzeit nicht automatisch. Dafür fehlt ein belastbarer aktueller Pflegegrad-Ist-Zustand in der Jahresplanung. Reale Pflegeausgaben werden weiterhin über Bedarf/Jahresplanung eingegeben; der Bucket wird transparent als Zweckbindung neben der freien Liquidität gezeigt.

**Dependencies:** Keine DOM-Abhängigkeit; nutzt nur übergebene Input-/Profilwerte.

---

## 6. `balance-binder.js`
Event-Hub der Anwendung.

**Exports:**
- `initUIBinder(domRefs, state, updateFn, debouncedUpdateFn)`
- `UIBinder`
  - `bindUI()` – registriert alle Event-Listener
  - `handleKeyboardShortcuts(e)` – u. a. Jahresabschluss, Import/Export, Marktdaten nachrücken
  - `handleFormInput(e)` / `handleFormChange()` – triggert Debounce-Updates
  - `handleTabClick(e)` – Tab-Navigation
  - `handleReset()` – Reset mit Bestätigung
  - `handleBedarfAnpassungClick(e)` – inflationsbedingte Anpassung
  - `handleNachruecken()` / `handleUndoNachruecken()` – Marktdatenpflege
  - `handleJahresUpdate()` – startet denselben fail-safe, periodengebundenen Coordinator wie der Jahresabschluss-Button; Online-Abrufe, Writes und Abschluss teilen dadurch Snapshot, In-Flight-Sperre und Perioden-ID.
  - `handleExport()` / `handleImport(e)` / `handleCsvImport(e)` – Datenimporte/-exporte
  - `handleJahresabschluss()` – Snapshot & Jahreswechsel
  - `handleSnapshotActions(e)` – Snapshot verwalten (restore/delete)
  - `handleCopyDiagnosis()` – Diagnose in Zwischenablage

**Dependencies:** `balance-config.js`, `balance-utils.js`, `balance-reader.js`, `balance-renderer.js`, `balance-storage.js`

**Helper-Module (ausgelagert):**
- `balance-binder-annual.js` – Jahres-Update, Inflation, ETF-Nachrücken, Modal-Logik
- `balance-binder-imports.js` – erzeugt `balance-state`-Exports mit stabiler App-ID und `schemaVersion: 1`; akzeptiert nur dieses Format oder die explizit migrierten v21.1-/v22.0-Legacy-Envelopes. Vor dem Replace validiert es Pflichtwerte und `lastState`, fuehrt `update({ persist: false })` aus und wertet den Slice-07-Ergebnisvertrag aus. Nach Recovery/Replace muss das persistente `update()` erfolgreich sein; andernfalls werden Storage und sichtbare Eingaben automatisch zurueckgerollt. File-Inputs werden dabei nie auf einen nichtleeren Wert restauriert, weil Browser nur das programmgesteuerte Leeren erlauben.
- `balance-binder-snapshots.js` – Snapshot-Handling und Jahresprozess-Coordinator; validiert den Live-State, flusht, bestaetigt den Snapshot vor fachlichen Writes und persistiert bei Teilfehlern Snapshot-ID sowie Recovery-Phase
- `balance-binder-diagnosis.js` – Diagnose-Export

---

## 7. `balance-main.js`
Einstiegspunkt und Orchestrator.

**Aufgaben:**
- Initialisiert DOM-Referenzen, Module und Anwendungszustand.
- Bindet einen kompatiblen Engine-Vertrag (`initVersionHandshake`) und blockiert fehlende, inkompatible oder nachtraeglich ausgetauschte Engines.
- Definiert `update()` / `debouncedUpdate()`, liefert `success`, `validation_error`, `engine_error` oder `blocked` und reicht Eingaben nur nach erfolgreichem Gate an `EngineAPI.simulateSingleYear()` weiter.
- Übergibt erfolgreiche Engine-Ergebnisse an Renderer und Storage; blockierte und fehlerhafte Ergebnisse werden nicht persistiert.
- Erhält bei Guardrail-Resets den steuerlichen Zustand (`lastState.taxState`) explizit.

**Dependencies:** alle oben genannten Module sowie die globale `EngineAPI`.

**Helper-Module (ausgelagert):**
- `balance-main-profile-sync.js` – Profilwerte in Balance-Inputs spiegeln
- `balance-main-profilverbund.js` – einmalige Haushalts-Simulation, Profilattribution & UI-Handling
- `balance-update-pipeline.js` – Engine-Handshake/-Gate, Update-Ergebnisvertrag, Mindest-Flex-Validierung, Engine-Last-State, Renderer-/Diagnose-Payload, Persistenzentscheidung und Ausgabenbudget.
- `balance-action-postprocessor.js` – Single-Profil-3-Bucket-Postprocessing; im Profilverbund unveraenderte Weitergabe der bereits finalisierten Haushaltsaktion.

**Pflegebucket:** Der Update-Zyklus reicht die im Reader erzeugte Pflegebucket-Diagnose an Summary, Key-Parameter und Diagnose-Copytext weiter. Die Engine-Eingaben und die Handlungsempfehlung werden dadurch nicht operativ verändert.

---

## 8. `balance-expenses*.js`
Ausgaben-Check für monatliche CSV-Importe und Budgettracking.

**Exports:**
- `balance-expenses.js`
  - `initExpensesTab(domRefs, options?)` – initialisiert Tabellenaufbau, Detaildialog und Jahr-Selector; gibt beim Start den Store-Status zurueck und rendert Korruption als gesperrten Recovery-Zustand
  - `updateExpensesBudget({ monthlyBudget, annualBudget })` – übernimmt Budgetwerte aus der Balance-Berechnung
  - `rollExpensesYear()` – schaltet auf das nächste Ausgabenjahr (Historie bleibt erhalten)

**Module:**
- `balance-expenses.js` – Controller/Fassade fuer Initialisierung, Event-Wiring, Import-/Delete-Flows, Recovery-Export und bestaetigten Korruptions-Reset.
- `balance-expenses-storage.js` – Persistenzschema `balance_expenses_v1`, expliziter `ok`-/`empty`-/`corrupt`-Ladevertrag, schreibgesperrter Korruptionspfad, Recovery-Dokument und Jahr-/Monat-Container.
- `balance-expenses-csv.js` – CSV-Parser mit Delimiter-Erkennung (`;`, `,`, `Tab`) und Betragsnormalisierung.
- `balance-expenses-metrics.js` – Monats-, Jahres-, Median-, Forecast- und Soll/Ist-Kennzahlen ohne DOM/localStorage.
- `balance-expenses-renderer.js` – Year-Select, Tabelle, Summary-Karten und Detaildialog.

**Funktionen:**
- Monatliche Ablage pro Profil und Jahr ueber die Persistenz-Facade (`balance_expenses_v1`).
- Budgetmonitoring:
  - Monatsampel (`ok/warn/bad`) mit 5%-Warnschwelle
  - Jahresverbrauch, Restbudget
  - Jahreshochrechnung (ab 2 Datenmonaten Median statt Mittelwert)
  - Soll/Ist auf Basis importierter Monate
- Detaildialog mit sortierter Kategorieliste und „Top 3 Kategorien“.
- Ein JSON-/Shape-Fehler liefert ueber `loadExpensesStoreResult()` einen strukturierten `corrupt`-Status samt unveraendertem Rohinhalt. Der kompatible `loadExpensesStore()` wirft in diesem Fall, statt einen Leerzustand zu erfinden.
- Die Recovery-UI nennt Ausgabenbereich und Backend. Ein Reset bleibt bis zum erfolgreichen Rohdatenexport gesperrt, verlangt danach eine explizite Bestaetigung und gilt erst nach erfolgreichem Facade-Flush als abgeschlossen; Abbruch und Flush-Fehler lassen den Store im gesperrten Recovery-Zustand.

**Dependencies:** `balance-utils.js`, `balance-renderer.js`, `app/profile/profilverbund-balance.js`, `balance-expenses-*.js`

---

## 9. Jahres-Update Module (balance-annual-*.js)

### 9.1 `balance-annual-inflation.js`
Inflation-bezogene Operationen für das jährliche Update.

**Exports:**
- `createInflationHandlers({ dom, update, debouncedUpdate })`
  - `applyInflationToBedarfe()` – Wendet Inflationsrate auf Floor/Flex-Bedarfe an
  - `applyAnnualInflation()` – Fortschreibung der kumulierten Inflation
  - `handleFetchInflation()` – Holt Inflationsdaten via API-Kette (ECB → World Bank → OECD)

**Dependencies:** `balance-config.js`, `balance-utils.js`, `balance-reader.js`, `balance-renderer.js`, `balance-storage.js`

---

### 9.2 `balance-annual-marketdata.js`
Periodengebundene ETF-Jahresenddaten und davon unabhängige CAPE-Updates für den „Nachrücken"-Workflow. Der ETF-Pfad liest `calendar-year:<YYYY>` aus dem laufenden Commit, fragt Yahoo im UTC-Jahresendfenster ab und persistiert den akzeptierten Stichtagscontract unter `annualMarketDataMeta`.

**Exports:**
- `ANNUAL_MARKET_DATA_META_KEY` / `ANNUAL_MARKET_DATA_SCHEMA_VERSION` – stabiler Persistenzschlüssel und Schema-Version
- `createAnnualMarketDataRequest(periodId)` – bildet Zieljahr sowie `period1`/exklusives `period2` ohne Systemdatumsableitung
- `selectAnnualCloseQuote(data, context)` – wählt aus Yahoo-Daten unabhängig von deren Reihenfolge den letzten VWCE.DE-Schlusskurs von 0,50 bis 100.000 EUR vom 27.12. bis 31.12. des Zieljahres
- `createMarketdataHandlers({ dom, appState, debouncedUpdate, applyAnnualInflation })`
  - `handleNachruecken()` – verschiebt Vorjahreswerte und aktualisiert ATH; quellenloses manuelles Nachrücken invalidiert veraltete Online-Stichtagsmetadaten
  - `handleUndoNachruecken()` – macht Nachrücken einschließlich der Stichtagsmetadaten rückgängig
  - `handleNachrueckenMitETF()` – holt den VWCE.DE-Jahresendkurs via Yahoo-Proxy, prüft den vollständigen laufenden Commit-Kontext vor Fetch und Mutation, führt das Nachrücken durch und speichert Marktdateninputs gemeinsam mit Preis, ISO-Stichtag, Ticker, Quelle, Zieljahr, Perioden-ID sowie der stichtagsgleichen ATH-Auswertung; Fehler nach begonnener Mutation stellen den vorherigen DOM-/State-Stand wieder her
  - `handleFetchCapeAuto()` – Holt US-Shiller-CAPE via Yale/Mirror/r.jina.ai mit lokalem Fallback und persistiert `capeMeta`

**Dependencies:** `balance-config.js`, `balance-renderer.js`, `balance-storage.js`, `balance-annual-period.js`, `persistence-facade.js`

---

### 9.3 `balance-annual-modal.js`
UI-Modal für die Anzeige der Jahres-Update Ergebnisse.

**Exports:**
- `createAnnualModalHandlers({ getLastUpdateResults })`
  - `showUpdateResultModal(results)` – Zeigt Modal mit Erfolgen/Fehlern (Inflation, ETF, ATH)
  - `handleShowUpdateLog()` – Öffnet Protokoll des letzten Updates

**Dependencies:** `balance-utils.js`, `balance-renderer.js`

---

### 9.4 `balance-annual-orchestrator.js`
Koordiniert den komplexen Jahres-Update Workflow.

**Exports:**
- `createAnnualOrchestrator({ dom, debouncedUpdate, handleFetchInflation, handleNachrueckenMitETF, handleFetchCapeAuto, showUpdateResultModal, setLastUpdateResults })`
  - `handleJahresUpdate()` – Orchestriert: Alter erhoehen und im aktiven Profil persistieren → Inflation → ETF → CAPE → Protokoll

**Dependencies:** `balance-config.js`, `balance-renderer.js`, `balance-storage.js`, `profile-state.js`, `profile-storage.js`, `persistence-facade.js`

---

### 9.5 `balance-annual-period.js`

Definiert den DOM-freien Jahresperioden-Contract. `balance-binder-snapshots.js` integriert ihn in beide Jahres-Buttons und speichert die Metadaten im Balance-State unter `annualPeriodMetadata`. Wiederholte Perioden und Doppelklicks starten keine zweite Mutation; `incomplete_recovery` blockiert bis zur Wiederherstellung des referenzierten Snapshots.
DOM- und persistenzfreier Contract fuer das abgeschlossene Kalenderjahr. Er erzeugt die stabile ID `calendar-year:<YYYY>`, plant Alter, Inflation, Marktdaten und Ausgaben-Rollover fuer dieselbe Periode und beschreibt die Zustaende `ready`, `already_committed`, `incomplete_recovery`, `legacy_confirmation_required` und `invalid`.

**Exports:**
- Schema-, Status- und Legacy-Entscheidungskonstanten
- `deriveCompletedCalendarYear(referenceDate)` / `createAnnualPeriodId(targetYear)`
- `createAnnualPeriodMetadata()` / `preflightAnnualPeriod()` / `createAnnualPeriodPlan()`
- `checkAnnualPeriodCommit()` / `startAnnualPeriodCommit()` / `completeAnnualPeriodCommit()`
- `resolveLegacyAnnualPeriod()` – explizite Baseline ohne Alter-/Datumsheuristik

**Dependencies:** Keine (Pure Logic)

---

## 10. `balance-guardrail-reset.js`
Logik zur Erkennung signifikanter Eingabeänderungen, die den historischen Guardrail-State invalidieren.

**Exports:**
- `shouldResetGuardrailState(prevInputs, nextInputs)` – Prüft ob lastState zurückgesetzt werden soll

**Kriterien für Reset:**
- Bedarf (Floor/Flex): Änderung ≥1.000€ oder ≥10%
- Vermögen: Änderung ≥10.000€ oder ≥10%
- Rente: Statuswechsel oder Änderung ≥1.000€
- Marktdaten: Jede Änderung (ATH, Jahre seit ATH)
- Flex-Budget: Änderung ≥1.000€ oder ≥20%

**Dependencies:** Keine (Pure Logic)

---

## 11. Profilverbund-Module

### 11.1 `profilverbund-balance.js`
Kernlogik für den Profilverbund (Multi-Profil-Modus).

**Exports:**
- `loadProfilverbundProfiles()` – Lädt alle Profile aus dem Haushalt
- `aggregateProfilverbundInputs(profileInputs, overrides)` – Aggregiert Bedarf, Rente, Depot über Profile
- `calculateHouseholdWithdrawalNeed(profileInputs, overrides)` – Berechnet Bruttobedarf, Jahreseinkommen und Nettoentnahme einmal auf Haushaltsebene
- `calculateTaxPerEuro(inputs)` – Berechnet Steuerlast pro Euro für ein Profil
- `selectTranchesForSale(tranches, targetAmount, taxRate)` – Wählt steueroptimale Tranchen für Verkauf
- `calculateWithdrawalDistribution(profileInputs, aggregated, mode)` – Verteilt Entnahme nach Modus (tax_optimized, proportional, runway_first)
- `buildProfilverbundAssetSummary(profileInputs)` – Vermögenszusammenfassung aller Profile
- `buildProfilverbundProfileSummaries(profileInputs)` – Einzelprofil-Übersichten

**Verteilungsmodi:**
- `tax_optimized` – globale, deterministische Verkaufsquellenwahl nach aktuellem marginalem Profilsteuerwert; Verlusttopf, Sparer-Pauschbetrag, Kirchensteuer, Kostenbasis und Teilfreistellung bleiben eigentuemerbezogen
- `proportional` – Quellenattribution nach Vermoegensanteil, innerhalb eines Profils steuerarm sortiert
- `runway_first` – Quellenattribution nach Runway-Zielen gewichtet, innerhalb eines Profils steuerarm sortiert

**Haushalts-/Finanzierungscontract:**
- `balance-main.js` fuehrt im Multi-Profil-Fall genau einen Haushalts-Engine-Lauf fuer Floor, Flex, Dynamic Flex, Einkommen und Transaktionsplanung aus.
- Der Engine-Lauf erhaelt einen vollstaendigen Haushaltstranchenpool mit eindeutiger `sourceProfileId`. Die 3-Bucket-Logik und Bond-Wiederauffuellung finalisieren diese Haushaltsaktion genau einmal.
- Danach finden keine Profil-Engine-Laeufe statt. Die Profile erhalten ausschliesslich Quellen- und Verwendungsattributionen der finalen Haushaltsaktion; die Verteilungsmodi steuern diese Attribution, aber keine zweite Spending- oder Assetentscheidung.
- Quellen, Verwendungen und die Summe der finalen Profilsteuern muessen innerhalb 0,01 EUR reconciliert sein. Fehlende Herkunft oder nicht finanzierbare Restbetraege blockieren fail-closed.
- Haushalts-Guardrail-State und Profil-Steuer-State werden getrennt persistiert. Je Profil wird nur der aus den final attribuierten Verkaeufen berechnete `taxState` ersetzt; sonstige Profil-Last-State-Felder bleiben erhalten.

**Tranchen-/Cash-Contract:**
- Entnahmen nutzen zuerst Tagesgeld und Geldmarkt, bevor ein Verkauf aus Detailtranchen geplant wird.
- Vorhandene Detailtranchen werden ohne Mutation mit Profilherkunft kopiert. Fehlen Detailtranchen, entstehen profilmarkierte synthetische Fallback-Tranchen aus den aggregierten Werten.
- Detailtranchen ersetzen in Asset-Summaries die aggregierten Depot-/Gold-/Geldmarktwerte, damit Werte nicht doppelt gezählt werden. Bonds behalten ihre Assetklasse und fliessen fuer Legacy-Kompatibilitaet zugleich in die Depotaggregate ein.
- Der Pflegebucket wird als Haushaltsdefinition aus dem Primary-Profil gelesen und in Balance nur diagnostisch ausgewiesen. Er ist keine zusätzliche Entnahmequelle im Verteilungsmodus.

**Dependencies:** `balance-config.js`, `app/profile/profile-storage.js`

---

### 11.2 `profilverbund-action-attribution.js`

DOM-freier Contract zwischen finaler Haushaltsaktion, Profilquellen, Steuerzustand und Liquiditaets-KPIs.

**Aufgaben:**
- validiert die eindeutige Profilherkunft aller Verkaufsquellen und attribuiert Cash- und Assetquellen ohne gegenlaeufige Zusatztransaktion;
- plant die fuer die Haushaltszwecke erforderlichen Verkaufstranchen je vorgegebener Assetklasse neu; `tax_optimized` vergleicht die aktuelle marginale Steuer ueber alle geeigneten Profile, die beiden gewichteten Modi begrenzen jede Quelle auf den Bestand ihres Eigentuemers;
- aggregiert die finalen steuerlichen Rohwerte je Profil und ruft `settleTaxYear()` genau einmal je Profil auf;
- reconciliert Bruttoquellen, Profilsteuern und Nettoverwendungen innerhalb der Cent-Toleranz;
- erzeugt Profilaktionen als reine Aufschluesselung der Haushaltsaktion;
- berechnet Deckung und Runway aus dem Cashflow der final gerenderten Aktion neu und aktualisiert die zugehoerige Diagnose.

**Dependencies:** `engine/tax-settlement.mjs`, `profilverbund-balance.js`

---

### 11.3 `profilverbund-balance-ui.js`
DOM-Operationen für die Profilverbund-UI.

**Exports:**
- `renderProfilverbundProfileSelector(profiles, containerId)` – Rendert Profil-Checkboxen
- `toggleProfilverbundMode(enabled)` – Zeigt/verbirgt Profilverbund-spezifische UI-Elemente

**Dependencies:** Keine (Pure DOM)

---

## Abhängigkeiten

```
app/balance/balance-main.js
  ├─ app/balance/balance-config.js
  ├─ app/balance/balance-utils.js
  ├─ app/balance/balance-storage.js
  ├─ app/balance/balance-reader.js
  │    └─ app/balance/balance-health-bucket.js
  ├─ app/balance/balance-renderer.js
  └─ app/balance/balance-binder.js
```

Die Module kommunizieren über definierte Schnittstellen; Änderungen lassen sich damit auf einzelne Komponenten begrenzen.
