# Balance-App – Modulübersicht

Die Balance-App besteht aus 30 ES6-Modulen unter `app/balance/`. Das folgende Dokument fasst Verantwortung, Exporte und wichtige Abhängigkeiten zusammen.
Dateinamen werden unten kurz ohne Präfix genannt; tatsächlicher Pfad ist in der Regel `app/balance/<datei>.js`.
Ausnahmen: Profilverbund-Module liegen unter `app/profile/`, Shared-Formatter unter `app/shared/`.

**Stand:** Januar 2026

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
Persistenzschicht für `localStorage` und File-System-Snapshots.

**Exports:**
- `initStorageManager(domRefs, state, renderer)` – initialisiert Abhängigkeiten
- `StorageManager`
  - `loadState()` / `saveState(state)` / `resetState()`
  - `initSnapshots()` / `renderSnapshots(listEl, statusEl, handle)`
  - `createSnapshot(handle)` / `restoreSnapshot(key, handle)` / `deleteSnapshot(key, handle)`
  - `connectFolder()` – öffnet File-System-Handle

**Dependencies:** `balance-config.js` (Konfiguration & Fehlerklassen)

---

## 4. `balance-reader.js`
Liest UI-Eingaben und kümmert sich um UI-Side-Effects.

**Exports:**
- `initUIReader(domRefs)`
- `UIReader`
  - `readAllInputs()`
  - `applyStoredInputs(storedInputs)`
  - `applySideEffectsFromInputs()` – zeigt/verbirgt Panels (z. B. Gold, zweite Rente)

**Dependencies:** `balance-utils.js`

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
- `balance-renderer-action.js` – Handlungsempfehlungen & Cash-Rebalancing
- `balance-renderer-diagnosis.js` – Diagnose-Chips, Guardrails, Kennzahlen
- `balance-diagnosis-format.js` – Diagnose-Payload normalisieren
- `balance-diagnosis-chips.js` – Diagnose-Chips (Runway, Quote, Drawdown)
- `balance-diagnosis-decision-tree.js` – Entscheidungsbaum
- `balance-diagnosis-guardrails.js` – Guardrail-Karten
- `balance-diagnosis-transaction.js` – Transaktionsdiagnostik (Status, Schwellen)
- `balance-diagnosis-keyparams.js` – Schlüsselkennzahlen

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
  - `handleJahresUpdate()` – **Jahres-Update mit Online-API-Zugriff:** Ruft automatisch Inflationsdaten (ECB → World Bank → OECD Fallback-Kette) und ETF-Kurse (VWCE.DE via Yahoo Finance über lokalen Proxy) ab, führt Nachrücken durch und aktualisiert ATH. Zeigt detailliertes Protokoll mit Datenquellen und Werten.
  - `handleExport()` / `handleImport(e)` / `handleCsvImport(e)` – Datenimporte/-exporte
  - `handleJahresabschluss()` – Snapshot & Jahreswechsel
  - `handleSnapshotActions(e)` – Snapshot verwalten (restore/delete)
  - `handleCopyDiagnosis()` – Diagnose in Zwischenablage

**Dependencies:** `balance-config.js`, `balance-utils.js`, `balance-reader.js`, `balance-renderer.js`, `balance-storage.js`

**Helper-Module (ausgelagert):**
- `balance-binder-annual.js` – Jahres-Update, Inflation, ETF-Nachrücken, Modal-Logik
- `balance-binder-imports.js` – Import/Export/CSV
- `balance-binder-snapshots.js` – Snapshot-Handling
- `balance-binder-diagnosis.js` – Diagnose-Export

---

## 7. `balance-main.js`
Einstiegspunkt und Orchestrator.

**Aufgaben:**
- Initialisiert DOM-Referenzen, Module und Anwendungszustand.
- Prüft Engine-Kompatibilität (`initVersionHandshake`).
- Definiert `update()` / `debouncedUpdate()` und reicht Eingaben an `EngineAPI.simulateSingleYear()` weiter.
- Übergibt Engine-Ergebnisse an Renderer und Storage.

**Dependencies:** alle oben genannten Module sowie die globale `EngineAPI`.

**Helper-Module (ausgelagert):**
- `balance-main-profile-sync.js` – Profilwerte in Balance-Inputs spiegeln
- `balance-main-profilverbund.js` – Profilverbund-Simulationen & UI-Handling

---

## 8. `balance-expenses.js`
Ausgaben-Check für monatliche CSV-Importe und Budgettracking.

**Exports:**
- `initExpensesTab(domRefs)` – initialisiert Tabellenaufbau, Detaildialog und Jahr-Selector
- `updateExpensesBudget({ monthlyBudget, annualBudget })` – übernimmt Budgetwerte aus der Balance-Berechnung
- `rollExpensesYear()` – schaltet auf das nächste Ausgabenjahr (Historie bleibt erhalten)

**Funktionen:**
- CSV-Parser mit Delimiter-Erkennung (`;`, `,`, `Tab`) und Betragsnormalisierung.
- Monatliche Ablage pro Profil und Jahr in `localStorage` (`balance_expenses_v1`).
- Budgetmonitoring:
  - Monatsampel (`ok/warn/bad`) mit 5%-Warnschwelle
  - Jahresverbrauch, Restbudget
  - Jahreshochrechnung (ab 2 Datenmonaten Median statt Mittelwert)
  - Soll/Ist auf Basis importierter Monate
- Detaildialog mit sortierter Kategorieliste und „Top 3 Kategorien“.

**Dependencies:** `balance-utils.js`, `balance-renderer.js`, `app/profile/profilverbund-balance.js`

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
Marktdaten-Updates für das „Nachrücken"-Workflow.

**Exports:**
- `createMarketdataHandlers({ dom, appState, debouncedUpdate, applyAnnualInflation })`
  - `handleNachruecken()` – Verschiebt Vorjahreswerte und aktualisiert ATH
  - `handleUndoNachruecken()` – Macht Nachrücken rückgängig
  - `handleNachrueckenMitETF()` – Holt VWCE.DE-Kurs via Yahoo-Proxy und führt Nachrücken durch

**Dependencies:** `balance-config.js`, `balance-renderer.js`

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
- `createAnnualOrchestrator({ dom, debouncedUpdate, handleFetchInflation, handleNachrueckenMitETF, showUpdateResultModal, setLastUpdateResults })`
  - `handleJahresUpdate()` – Orchestriert: Alter erhöhen → Inflation → ETF → Protokoll

**Dependencies:** `balance-config.js`, `balance-renderer.js`, `balance-storage.js`

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
- `calculateTaxPerEuro(inputs)` – Berechnet Steuerlast pro Euro für ein Profil
- `selectTranchesForSale(tranches, targetAmount, taxRate)` – Wählt steueroptimale Tranchen für Verkauf
- `calculateWithdrawalDistribution(profileInputs, aggregated, mode)` – Verteilt Entnahme nach Modus (tax_optimized, proportional, runway_first)
- `buildProfilverbundAssetSummary(profileInputs)` – Vermögenszusammenfassung aller Profile
- `buildProfilverbundProfileSummaries(profileInputs)` – Einzelprofil-Übersichten

**Verteilungsmodi:**
- `tax_optimized` – Greedy: Profile mit niedrigster Steuerlast zuerst
- `proportional` – Nach Vermögensanteil
- `runway_first` – Nach Runway-Zielen gewichtet

**Dependencies:** `balance-config.js`, `app/profile/profile-storage.js`

---

### 11.2 `profilverbund-balance-ui.js`
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
  ├─ app/balance/balance-renderer.js
  └─ app/balance/balance-binder.js
```

Die Module kommunizieren über definierte Schnittstellen; Änderungen lassen sich damit auf einzelne Komponenten begrenzen.

