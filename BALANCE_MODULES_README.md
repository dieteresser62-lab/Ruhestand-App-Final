# Balance-App – Modulübersicht

Die Balance-App besteht aus sieben ES6-Modulen, die direkt nebeneinander im Repository liegen. Das folgende Dokument fasst Verantwortung, Exporte und wichtige Abhängigkeiten zusammen.

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
- `DebugUtils`

**Hinweise:** `DebugUtils` kapselt das Aktivieren/Deaktivieren des Debug-Modus (`Ctrl` + `Shift` + `D`) und synchronisiert den Status mit `localStorage`.

---

## 2. `balance-utils.js`
Formatierungs- und Hilfsfunktionen für die UI.

**Exports:**
- `UIUtils`
  - `EUR_FORMATTER` / `NUM_FORMATTER`
  - `formatCurrency(val)`
  - `formatNumber(num)`
  - `parseCurrency(str)`
  - `getThreshold(path, defaultValue)` – greift sicher auf Engine-Konfigurationen zu

**Dependencies:** keine

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

---

## 6. `balance-binder.js`
Event-Hub der Anwendung.

**Exports:**
- `initUIBinder(domRefs, state, updateFn, debouncedUpdateFn)`
- `UIBinder`
  - `bindUI()` – registriert alle Event-Listener
  - `handleKeyboardShortcuts(e)` – u. a. Jahresabschluss, Import/Export, Debug-Modus, Theme-Toggle
  - `handleFormInput(e)` / `handleFormChange()` – triggert Debounce-Updates
  - `handleTabClick(e)` – Tab-Navigation
  - `handleThemeToggle()` – Dark-/Light-Mode
  - `handleReset()` – Reset mit Bestätigung
  - `handleBedarfAnpassungClick(e)` – inflationsbedingte Anpassung
  - `handleNachruecken()` / `handleUndoNachruecken()` – Marktdatenpflege
  - `handleExport()` / `handleImport(e)` / `handleCsvImport(e)` – Datenimporte/-exporte
  - `handleJahresabschluss()` – Snapshot & Jahreswechsel
  - `handleSnapshotActions(e)` – Snapshot verwalten (restore/delete)
  - `handleCopyDiagnosis()` – Diagnose in Zwischenablage
  - `updateDebugModeUI(isActive)` – zeigt Debug-Indikator

**Dependencies:** `balance-config.js`, `balance-utils.js`, `balance-reader.js`, `balance-renderer.js`, `balance-storage.js`

---

## 7. `balance-main.js`
Einstiegspunkt und Orchestrator.

**Aufgaben:**
- Initialisiert DOM-Referenzen, Module und Anwendungszustand.
- Prüft Engine-Kompatibilität (`initVersionHandshake`).
- Definiert `update()` / `debouncedUpdate()` und reicht Eingaben an `EngineAPI.simulateSingleYear()` weiter.
- Übergibt Engine-Ergebnisse an Renderer und Storage.
- Startet Debug-Modus über `DebugUtils`.

**Dependencies:** alle oben genannten Module sowie die globale `EngineAPI`.

---

## Abhängigkeiten

```
balance-main.js
  ├─ balance-config.js
  ├─ balance-utils.js
  ├─ balance-storage.js
  ├─ balance-reader.js
  ├─ balance-renderer.js
  └─ balance-binder.js
```

Die Modules kommunizieren über klar definierte Schnittstellen und halten damit die Balance-App test- und wartbar.

