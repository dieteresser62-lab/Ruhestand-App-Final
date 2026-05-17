# Balance-Workflow-Hardening: Umsetzungsplan

**Stand:** 2026-05-11  
**Zweck:** Arbeitsplan zur Absicherung der operativen Balance-Workflows: Jahreswechsel, Jahresupdate, Storage, Snapshot/Restore, Diagnose-Payload und Smoke-Pfade.  
**Status:** abgeschlossen, archiviert.  
**Scope:** Balance-App unter `app/balance/`, relevante Profil-/Tranchen-Persistenzuebergaenge, bestehende Balance-Tests und Referenzdokumentation.  
**Nicht-Scope:** Fachliche Neugestaltung der Engine, Steuer-/Tranchenverkaufslogik, UI-Redesign, Tauri-Release-Artefakte.

## Zielbild

Die Balance-App soll in den operativen Jahresprozessen pruefbar und regressionsarm bleiben. Besonders kritisch sind gespeicherte Daten, Jahreswechsel, externe Jahresdaten-Fallbacks, Diagnose-Ausgaben und die Kopplung zwischen Engine-Ergebnis, Renderer und Persistenz.

Erfolgreich ist der Slice, wenn:

- Jahreswechsel/Jahresupdate, Storage-Migrationen und Snapshot/Restore als zusammenhaengende Workflows dokumentiert sind.
- bestehende Balance-Tests einem klaren Contract zugeordnet sind.
- offensichtliche Testluecken priorisiert sind.
- neue Tests nur dort ergaenzt werden, wo sie echte Workflow-Risiken abdecken.
- Doku und Tests den aktuellen Stand ohne Widerspruch abbilden.

## Relevante Dateien

| Bereich | Dateien |
| --- | --- |
| Balance Bootstrap/Orchestrierung | `app/balance/balance-main.js`, `app/balance/balance-binder.js`, `app/balance/balance-update-pipeline.js`, `app/balance/balance-action-postprocessor.js` |
| Jahresupdate/Jahreswechsel | `app/balance/balance-binder-annual.js`, `app/balance/balance-annual-inflation.js`, `app/balance/balance-annual-marketdata.js`, `app/balance/balance-annual-modal.js`, `app/balance/balance-annual-orchestrator.js` |
| Storage/Snapshots | `app/balance/balance-storage.js`, `app/balance/balance-binder-snapshots.js`, `app/profile/profile-storage.js` |
| Eingaben/Side-Effects | `app/balance/balance-reader.js`, `app/balance/balance-main-profile-sync.js` |
| Diagnose/Rendering | `app/balance/balance-renderer.js`, `app/balance/balance-renderer-*.js`, `app/balance/balance-diagnosis-*.js`, `app/balance/balance-binder-diagnosis.js` |
| Ausgaben-Check | `app/balance/balance-expenses*.js` |
| Bestehende Tests | `tests/balance-smoke.test.mjs`, `tests/balance-storage.test.mjs`, `tests/balance-binder-snapshots.test.mjs`, `tests/balance-annual-inflation.test.mjs`, `tests/balance-annual-cape.test.mjs`, `tests/balance-decumulation.test.mjs`, `tests/balance-reader.test.mjs`, `tests/balance-diagnosis-*.test.mjs`, `tests/balance-renderer-*.test.mjs`, `tests/balance-expenses.test.mjs`, `tests/balance-dynamic-flex-gate.test.mjs` |
| Referenzen | `docs/reference/BALANCE_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `docs/internal/PROJEKTUEBERSICHT.md` |

## Risiko- und Ertragsbewertung

| Thema | Aufwand | Aenderungsrisiko | Ertrag | Entscheidung |
| --- | --- | --- | --- | --- |
| Baseline und Test-Mapping | niedrig | niedrig | hoch | zuerst angehen |
| Jahresupdate-/Jahreswechsel-Contract | mittel | niedrig-mittel | hoch | priorisieren |
| Storage-/Snapshot-Workflow | mittel | niedrig-mittel | hoch | priorisieren |
| Diagnose-Payload-Contract | mittel | mittel | mittel-hoch | nach Workflow-Matrix |
| Smoke-Pfad erweitern | mittel | mittel | mittel | nur mit klarer Luecke |
| Produktivcode refactoren | hoch | mittel-hoch | unklar | nur bei reproduzierter Luecke |

## Arbeitsprinzipien

1. Erst Baseline und Workflow-Matrix, dann Tests oder Fixes.
2. DOM-freie Helper und bestehende Module bevorzugen; UI-Bootstrap-Dateien nicht ohne Not anfassen.
3. Persistierte Daten in Tests synthetisch halten; keine lokalen Finanzdaten, Snapshots oder Exporte uebernehmen.
4. Storage-, Profil- und Tranchen-Contracts vor jeder Codeaenderung explizit benennen.
5. Doku-Sync nur bei tatsaechlicher Contract-, Workflow- oder Modulverantwortungs-Aenderung.

## Phase 0: Baseline und Arbeitsgrenze

**Ziel:** Aktuellen Balance-Teststand reproduzierbar erfassen.

Arbeitsschritte:

1. `git status --short` pruefen und fremde Aenderungen notieren.
2. Fokussierte Balance-Baseline ausfuehren:
   - `node tests/run-single.mjs tests/balance-smoke.test.mjs`
   - `node tests/run-single.mjs tests/balance-storage.test.mjs`
   - `node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs`
   - `node tests/run-single.mjs tests/balance-annual-inflation.test.mjs`
   - `node tests/run-single.mjs tests/balance-annual-cape.test.mjs`
   - `node tests/run-single.mjs tests/balance-decumulation.test.mjs`
   - `node tests/run-single.mjs tests/balance-reader.test.mjs`
   - `node tests/run-single.mjs tests/balance-diagnosis-format.test.mjs`
   - `node tests/run-single.mjs tests/balance-diagnosis-guardrails.test.mjs`
   - `node tests/run-single.mjs tests/balance-diagnosis-transaction.test.mjs`
   - `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`
   - `node tests/run-single.mjs tests/balance-renderer-action.test.mjs`
   - `node tests/run-single.mjs tests/balance-renderer-summary.test.mjs`
   - `node tests/run-single.mjs tests/balance-expenses.test.mjs`
   - `node tests/run-single.mjs tests/balance-dynamic-flex-gate.test.mjs`
3. Fehler klassifizieren, bevor neue Tests geschrieben werden:
   - bestehender Defekt,
   - zeit-/umgebungsabhaengiger Test,
   - echte Workflow-Luecke,
   - Doku-/Contract-Widerspruch.

**Reviewzeitpunkt R0:** Nach Baseline. Entscheidung: weiter mit Workflow-Matrix oder zuerst bestehenden Fehler isolieren.

## Phase 1: Workflow- und Contract-Matrix

**Ziel:** Bestehende Abdeckung den operativen Balance-Workflows zuordnen.

Zu erfassen:

| Workflow | Contract-Fragen | Relevante Tests |
| --- | --- | --- |
| Jahresupdate | Alterserhoehung, Inflation, ETF-Nachruecken, CAPE-Fallback, Modal-/Fehlerstatus | `balance-annual-inflation`, `balance-annual-cape` |
| Jahresabschluss | Snapshot-Erstellung, Jahreswechsel, Persistenz, steuerlicher `lastState` | `balance-binder-snapshots`, `balance-storage`, ggf. neue Tests |
| Storage-Migration | Defaults, kaputte JSON-Daten, alte Shapes, TaxState-Erhalt | `balance-storage`, `balance-reader`, `balance-decumulation` |
| Snapshot/Restore | Vollstaendige localStorage-Sicherung inkl. Tranchen, Fehlerpfade | `balance-binder-snapshots`, `balance-storage` |
| Diagnose-Payload | Engine-Diagnose, Transaktionsdiagnose, VPW-/3-Bucket-Felder, Grenzfalltexte | `balance-diagnosis-*`, `balance-decumulation` |
| Smoke-Pfad | Bootstrap, Engine-Aufruf, Input-Change, Footer/Version | `balance-smoke` |
| Ausgaben-Check | Budgetuebergabe, Jahrescontainer, Monats-/Jahresmetriken | `balance-expenses` |

**Reviewzeitpunkt R1:** Nach Matrix. Entscheidung: Welche Luecken werden mit Tests geschlossen, welche bleiben dokumentiert.

### Phase-1-Ergebnis: Workflow-/Contract-Matrix

| Workflow | Erwarteter Contract | Bestehende Abdeckung | Luecke | Prioritaet |
| --- | --- | --- | --- | --- |
| Jahresupdate-Orchestrator | Ablauf bleibt Alter -> Inflation -> ETF-Nachruecken -> CAPE -> Update -> Profil speichern -> Log/Modal. Teilerfolge und Fehler werden im Result-Shape stabil gesammelt. | `balance-annual-inflation.test.mjs` prueft Inflationsdaten/Fallbacks; `balance-annual-cape.test.mjs` prueft CAPE-Quelle, Stored-Fallback und Stale-Grenze. | Kein Test fuer `handleJahresUpdate()` als Gesamtworkflow: Reihenfolge, Button-/Log-Status, `setLastUpdateResults`, CAPE-Fehlerdetails und Profil-Save sind nicht als Contract abgesichert. | hoch |
| Jahresabschluss | Snapshot wird vor dem Jahreswechsel erstellt; Inflation/Jahresrollover/Renderer-Refresh laufen in nachvollziehbarer Reihenfolge; Fehler laufen ueber den zentralen Handler. | `balance-binder-snapshots.test.mjs` prueft Snapshot-Inhalt, Restore, Fehlerpfade und Tranchen-Sicherung. | `handleJahresabschluss()` selbst ist nicht als Ablauf getestet: `applyAnnualInflation()`, `debouncedUpdate()`, `StorageManager.createSnapshot()`, `rollExpensesYear()` und `renderSnapshots()` werden nicht gemeinsam validiert. | hoch |
| Storage-Migration | Echte Persistenz-Migrationen behalten neue Defaults, reparieren alte Shapes und erhalten `lastState.taxState.lossCarry` robust. | `balance-storage.test.mjs` prueft Storage-Verhalten mit einem lokalen Test-Mock; `balance-decumulation.test.mjs` deckt einige flache/nested Decumulation-Shapes ab. | Kein Import-Test gegen den echten `StorageManager` aus `app/balance/balance-storage.js`; reale Migrationen, kaputtes JSON und TaxState-Erhalt sind dadurch nur indirekt bzw. gar nicht abgesichert. | hoch |
| Snapshot/Restore | Balance-State, Inputs und `depot_tranchen` werden vollstaendig gesichert und kontrolliert wiederhergestellt. | `balance-binder-snapshots.test.mjs` deckt Vollsnapshot, Restore, mehrere Snapshots und Fehler beim Storage ab. | Gute Basisabdeckung vorhanden; offen bleibt nur die Einbettung in den Jahresabschluss-Ablauf. | niedrig |
| Profil-/Tranchen-Uebergang | Profilwerte ueberschreiben DOM-Werte kontrolliert; Tranchen-Aggregate bleiben Quelle fuer Depotwerte; Profilverbund-Persistenz schreibt die erwarteten Payloads. | `balance-reader.test.mjs` prueft Profil-Overrides, Tranchen-Aggregation und Side-Effects; `balance-decumulation.test.mjs` prueft Pipeline-Helfer und Profilverbund-Action-Merge. | Persistenzbranch in `persistBalanceUpdate()` ist nicht gezielt gegen Profilverbund-/Fallback-Save abgesichert. Relevanz mittel, da der kritische Leserpfad abgedeckt ist. | mittel |
| Diagnose-Payload | Engine-Diagnose, Transaction Diagnostics, Guardrails, VPW-KeyParams und 3-Bucket-Diagnose bleiben additiv und strukturell stabil. | `balance-diagnosis-format.test.mjs`, `balance-diagnosis-guardrails.test.mjs`, `balance-diagnosis-transaction.test.mjs`, `balance-diagnosis-keyparams.test.mjs`, `balance-decumulation.test.mjs`. | Breite Contract-Abdeckung vorhanden; Phase 4 sollte nur pruefen, ob neue Felder aus Workflow-Tests eine Doku-/Test-Ergaenzung brauchen. | niedrig |
| Renderer-Action/Summary | Handlungsanweisungen filtern Nullzeilen, zeigen Settlement-Felder korrekt und halten Summary-Texte stabil. | `balance-renderer-action.test.mjs`, `balance-renderer-summary.test.mjs`. | Keine unmittelbare Workflow-Luecke; spaeter nur regressionsorientiert pruefen. | niedrig |
| Smoke-Pfad | Balance-Bootstrap, Engine-Aufruf, Input-Change und Version/Footer bleiben lauffaehig. | `balance-smoke.test.mjs`. | Smoke-Test bleibt bewusst grob; Erweiterung nur sinnvoll, wenn Jahresupdate/Jahresabschluss nicht DOM-frei testbar waeren. | niedrig |
| Ausgaben-Check | Budget- und Jahrescontainer-Logik bleibt aus Engine-/Inputdaten ableitbar. | `balance-expenses.test.mjs`. | Keine priorisierte Luecke im aktuellen Slice. | niedrig |

**R1-Entscheidung:** Phase 2 sollte zuerst zwei hoch priorisierte Workflow-Tests ergaenzen:

1. Jahresupdate-Orchestrator als DOM-armer Contract-Test mit gemockten Handlern, Reihenfolge, Result-Shape, Profil-Save und Log-Button.
2. Jahresabschluss-Ablauf als Contract-Test fuer Snapshot-vor-Rollover, `rollExpensesYear()` und `renderSnapshots()`.

Phase 3 sollte danach den echten `StorageManager` direkt importieren und Migration/TaxState-Erhalt testen. Die Diagnose-, Renderer-, Smoke- und Ausgaben-Pfade bleiben vorerst unveraendert, weil die bestehende Abdeckung im Verhaeltnis zu Risiko und Ertrag ausreichend ist.

## Phase 2: Jahresupdate und Jahresabschluss absichern

**Ziel:** Operative Jahresprozesse gegen Regressionen sichern.

Geplante Pruefpunkte:

1. Jahresupdate-Orchestrator:
   - Reihenfolge Alter -> Inflation -> ETF/Nachruecken -> CAPE.
   - Fehlerpfade: CAPE lokal fallback, ETF-Fehler, Inflationsfehler.
   - Modal-/Result-Shape stabil.
2. Jahresabschluss:
   - Snapshot vor Jahreswechsel.
   - `lastState.taxState` bleibt erhalten, wo fachlich vorgesehen.
   - Persistenz schreibt erwartete Inputs/State.
3. Zeitdrift:
   - Tests duerfen nicht durch feste Alt-Daten kippen, wenn Stale-Grenzen rollen.

**Reviewzeitpunkt R2:** Nach Tests. Entscheidung: Nur Testausbau oder gezielter Fix.

### Phase-2-Ergebnis: Jahresworkflow-Contracts

Ergaenzt wurde `tests/balance-annual-workflow-contract.test.mjs` als DOM-armer Contract-Test fuer die beiden hoch priorisierten Workflow-Luecken aus R1.

Abgedeckte Contracts:

- `handleJahresUpdate()` erhoeht zuerst das Alter und fuehrt danach Inflation, ETF-Nachruecken, CAPE und `debouncedUpdate()` in stabiler Reihenfolge aus.
- CAPE-Hard-Failures mit `error_no_source_no_stored` werden als Fehler im Result-Shape gesammelt, inklusive Detailmeldungen aus den Quellen.
- Das Jahresupdate stellt Buttonstatus/-text wieder her, aktiviert den Log-Button, speichert `lastUpdateResults` und persistiert `ageAdjustedForInflation`.
- Das Jahresupdate ruft den Profil-Snapshot-Pfad auf; der Test prueft dies ueber die reale Profil-Registry in `localStorage`.
- `handleJahresabschluss()` fuehrt `applyAnnualInflation()`, `debouncedUpdate()`, Snapshot-Erstellung, Ausgaben-Rollover und `renderSnapshots()` in der erwarteten Reihenfolge aus.
- Snapshot-Handle, Profilname als Label sowie Snapshot-List-/Status-Refs werden an die Storage-Schicht weitergereicht.

Kein Produktivcode-Fix war noetig; die neuen Tests dokumentieren bestehendes korrektes Verhalten.

**R2-Entscheidung:** Phase 2 ist mit Testausbau abgeschlossen. Weiter mit Phase 3: echte `StorageManager`-Migrationen und TaxState-Erhalt direkt gegen `app/balance/balance-storage.js` absichern.

## Phase 3: Storage, Snapshot und Profiluebergaenge

**Ziel:** Persistenz-Contracts und Restore-Pfade als Workflow absichern.

Geplante Pruefpunkte:

1. Storage-Migrationen:
   - alte/nested Input-Shapes,
   - ungueltige Zahlen,
   - kaputtes JSON,
   - `taxState.lossCarry`.
2. Snapshot/Restore:
   - komplette localStorage-Abdeckung fuer Balance-State und Tranchen.
   - Restore ueberschreibt alte Werte kontrolliert.
   - Fehlerpfade geben Nutzerstatus/Toast nachvollziehbar weiter.
3. Profiluebergang:
   - Balance-State und profilbezogene Assetwerte bleiben getrennt von globalen Keys.

**Reviewzeitpunkt R3:** Nach Storage-/Snapshot-Pruefung.

### Phase-3-Ergebnis: Storage-/Snapshot-Contracts

Ergaenzt wurde `tests/balance-storage-contract.test.mjs` als direkter Import-Test gegen `app/balance/balance-storage.js`. Damit ist die Luecke aus R1 geschlossen, dass `balance-storage.test.mjs` zentrale Persistenzregeln nur ueber einen lokalen Mock prueft.

Abgedeckte Contracts:

- `StorageManager.loadState()` bereinigt beim ersten Lauf ungueltige Inflationswerte und setzt das Migrations-Flag.
- `lastState.taxState.lossCarry` wird auch dann ergaenzt oder repariert, wenn das alte Migrations-Flag bereits gesetzt ist.
- Ein gueltiger Verlusttopf bleibt unveraendert erhalten.
- Kaputtes State-JSON wirft den echten `StorageError` aus `balance-config.js`.
- `StorageManager.restoreSnapshot()` stellt Full-localStorage-Snapshots kontrolliert wieder her, filtert nicht erlaubte Keys aus und erhaelt den verwendeten Snapshot im Browser-Storage.
- `StorageManager.createSnapshot()` schreibt ein Full-localStorage-Payload inklusive Balance-State und `depot_tranchen`; Labels werden fuer Snapshot-Keys bereinigt.

Kein Produktivcode-Fix war noetig; die realen Storage-Contracts entsprechen dem gewuenschten Verhalten.

**R3-Entscheidung:** Phase 3 ist mit Testausbau abgeschlossen. Weiter mit Phase 4: Diagnose- und Renderer-Contracts nur gezielt pruefen, da die Matrix dort bereits breite Abdeckung gezeigt hat.

## Phase 4: Diagnose- und Renderer-Contracts

**Ziel:** Diagnose-Ausgaben bleiben erklaerbar und strukturell stabil.

Geplante Pruefpunkte:

1. Diagnose-Payload:
   - Transaktionsdiagnose,
   - Guardrails,
   - VPW-KeyParams,
   - 3-Bucket-Diagnose.
2. Renderer:
   - zentrale Texte fuer Grenzfaelle,
   - keine Vermischung von Plan, effektiver Entnahme und VPW-Rahmen.
3. Export/Kopie:
   - Diagnose-Text bleibt ohne DOM-Abhaengigkeit testbar.

**Reviewzeitpunkt R4:** Nach Diagnose-/Renderer-Pruefung.

### Phase-4-Ergebnis: Diagnose-/Renderer-Contracts

Ergaenzt wurde `tests/balance-diagnosis-copy-contract.test.mjs` als Contract-Test fuer den kopierbaren Diagnose-Exporttext aus `app/balance/balance-binder-diagnosis.js`.

Abgedeckte Contracts:

- Der Copytext enthaelt die Status-Uebersicht nur einmal.
- Transaktionsdiagnostik wird inklusive lesbarem Blockgrund, geplanter Aktion sowie Aktien-/Gold-Grenzen exportiert.
- Dynamic-Flex-/VPW-Daten bleiben im Copytext sichtbar: VPW-Block, Sicherheitsmodus und Warnsignale.
- Bestehende Diagnose-/Renderer-Tests fuer Formatierung, KeyParams, Transaktionsdiagnostik und Action-Rendering bleiben gruen.

Gefundener Fix:

- `balance-binder-diagnosis.js` enthielt den Block `--- Status-Übersicht ---` doppelt im generierten Copytext. Der doppelte Abschnitt wurde entfernt; die fachlichen Inhalte bleiben im ersten Statusblock erhalten.

**R4-Entscheidung:** Phase 4 ist mit einem gezielten Test und einem minimalen Fix abgeschlossen. Weiter mit Phase 5 nur als Review-/Kontrollphase: Es sind derzeit keine weiteren belegten Fix-Luecken offen.

## Phase 5: Gezielte Fixes nur bei belegter Luecke

**Ziel:** Falls neue Tests rot werden, minimalen Fix im passenden Modul setzen.

| Befund | Wahrscheinlicher Ort | Fix-Richtung |
| --- | --- | --- |
| Jahresupdate schreibt inkonsistente Result-Shapes | `balance-annual-orchestrator.js`, `balance-annual-modal.js` | Result-Contract stabilisieren |
| Jahresabschluss verliert State | `balance-binder.js`, `balance-storage.js`, `balance-update-pipeline.js` | Persistenz-/LastState-Grenze klaeren |
| Snapshot laesst relevante Keys aus | `balance-binder-snapshots.js`, `balance-storage.js` | Key-Auswahl/Restore-Verhalten absichern |
| Diagnosefelder fehlen nach Engine-Result | `balance-update-pipeline.js`, `balance-diagnosis-*.js` | additive Felder stabilisieren |
| Reader mutiert Inputs unerwartet | `balance-reader.js` | Side-Effects trennen oder testen |

**Reviewzeitpunkt R5:** Nach jedem Fix einzeln. Kein zweiter Fix, bevor der erste fokussiert validiert ist.

### Phase-5-Ergebnis: Kontrollphase und Abschluss

Phase 5 wurde als Kontrollphase ausgefuehrt. Aus den Phasen 2 bis 4 blieb nur eine belegte Fix-Luecke offen:

- Diagnose-Copytext enthielt `--- Status-Übersicht ---` doppelt.

Der Fix wurde bereits in Phase 4 minimal in `app/balance/balance-binder-diagnosis.js` umgesetzt und durch `tests/balance-diagnosis-copy-contract.test.mjs` abgesichert. Die Abschlussvalidierung `node tests/run-tests.mjs` lief danach gruen mit 74 Testdateien, 1563 Assertions und 0 Fehlern.

Weitere Befunde aus der Phase-5-Tabelle wurden nicht reproduziert:

- Jahresupdate-Result-Shapes: abgesichert durch `balance-annual-workflow-contract.test.mjs`.
- Jahresabschluss-/Snapshot-Ablauf: abgesichert durch `balance-annual-workflow-contract.test.mjs` und bestehende Snapshot-Tests.
- Storage-/Snapshot-Keys und TaxState: abgesichert durch `balance-storage-contract.test.mjs`.
- Diagnosefelder nach Engine-Result: bestehende Diagnose-Tests plus Copytext-Contract bleiben gruen.
- Reader-Side-Effects: bestehende Reader-/Decumulation-Tests bleiben unveraendert gruen.

**R5-Entscheidung:** Keine weiteren Produktivcode-Fixes noetig. Der Balance-Workflow-Hardening-Slice ist abgeschlossen.

## Phase 6: Doku-Abgleich und Abschlussvalidierung

**Ziel:** Neue/veraenderte Contracts auffindbar machen und abschliessend validieren.

Zu pruefen:

1. `docs/reference/BALANCE_MODULES_README.md`
   - Aktualisieren, wenn Modulverantwortungen oder Workflow-Vertraege geaendert wurden.
2. `docs/reference/TECHNICAL.md`
   - Aktualisieren, wenn Jahresupdate-, Storage- oder Diagnose-Architektur geaendert wurde.
3. `tests/README.md`
   - Aktualisieren, wenn neue Testdateien entstehen oder Coverage wesentlich erweitert wird.
4. `docs/internal/PROJEKTUEBERSICHT.md`
   - Balance-Punkt als umgesetzt markieren, wenn der Slice abgeschlossen ist.

Abschlussvalidierung:

```bash
node tests/run-tests.mjs
```

Wenn `npm test` lokal funktioniert, ist `npm test` der bevorzugte Befehl. Falls die lokale npm-CLI fehlt, wie im vorherigen Slice beobachtet, ist `node tests/run-tests.mjs` der direkte Runner aus `package.json`.

**Reviewzeitpunkt R6:** Abschlussentscheidung und ggf. Archivierung des Plans.

### Abschlussstatus

Der Slice wurde am 2026-05-12 abgeschlossen.

Abgeschlossene Arbeit:

- Workflow-/Contract-Matrix fuer Balance erstellt.
- Jahresupdate- und Jahresabschluss-Workflow mit neuem Contract-Test abgesichert.
- Echte `StorageManager`-Migrationen, TaxState-Erhalt und Snapshot-Restore-Filter direkt gegen das Produktivmodul abgesichert.
- Diagnose-Copytext mit neuem Contract-Test abgesichert.
- Doppelter Statusblock im Diagnose-Copytext entfernt.
- `tests/README.md` und `docs/internal/PROJEKTUEBERSICHT.md` synchronisiert.

Abschlussvalidierung:

```bash
node tests/run-tests.mjs
```

Ergebnis: 74 Testdateien, 1563 Assertions, 0 Fehler.

## Umsetzungsprotokoll

| Datum | Phase | Status | Ergebnis | Tests | Review |
| --- | --- | --- | --- | --- | --- |
| 2026-05-11 | Planung | abgeschlossen | Plan fuer Balance-Workflow-Hardening angelegt. | keine Tests ausgefuehrt; reine Planung/Doku | Start mit Phase 0 |
| 2026-05-11 | Phase 0: Baseline | abgeschlossen | Fokussierte Balance-Baseline ist gruen. Arbeitsbaum enthielt vor Teststart die offenen Doku-/Testaenderungen aus dem abgeschlossenen Simulator-Paritaets-Slice sowie den neuen Balance-Plan. Git meldete weiterhin fehlenden Zugriff auf `C:\Users\Diete\.config\git\ignore`, ohne die Tests zu blockieren. | `node tests/run-single.mjs tests/balance-smoke.test.mjs`; `node tests/run-single.mjs tests/balance-storage.test.mjs`; `node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs`; `node tests/run-single.mjs tests/balance-annual-inflation.test.mjs`; `node tests/run-single.mjs tests/balance-annual-cape.test.mjs`; `node tests/run-single.mjs tests/balance-decumulation.test.mjs`; `node tests/run-single.mjs tests/balance-reader.test.mjs`; `node tests/run-single.mjs tests/balance-diagnosis-format.test.mjs`; `node tests/run-single.mjs tests/balance-diagnosis-guardrails.test.mjs`; `node tests/run-single.mjs tests/balance-diagnosis-transaction.test.mjs`; `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`; `node tests/run-single.mjs tests/balance-renderer-action.test.mjs`; `node tests/run-single.mjs tests/balance-renderer-summary.test.mjs`; `node tests/run-single.mjs tests/balance-expenses.test.mjs`; `node tests/run-single.mjs tests/balance-dynamic-flex-gate.test.mjs` | R0: Weiter mit Phase 1, Workflow- und Contract-Matrix |
| 2026-05-11 | Phase 1: Workflow-/Contract-Matrix | abgeschlossen | Bestehende Balance-Abdeckung den operativen Workflows zugeordnet. Hoch priorisierte Luecken sind Jahresupdate-Orchestrator, Jahresabschluss-Ablauf und echte Storage-Migrationen; Diagnose-, Renderer-, Smoke- und Ausgaben-Pfade bleiben vorerst dokumentiert statt erweitert. | keine Tests ausgefuehrt; reine Analyse/Doku auf Basis der bestehenden Test- und Modulzuordnung | R1: Weiter mit Phase 2, zuerst Jahresupdate- und Jahresabschluss-Contract-Tests |
| 2026-05-12 | Phase 2: Jahresupdate/Jahresabschluss | abgeschlossen | Neuer Contract-Test fuer Jahresupdate-Orchestrator und Jahresabschluss-Ablauf angelegt. Keine Produktivcode-Aenderung noetig. Testdokumentation wurde um die neue Datei ergaenzt. | `node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs`; `node tests/run-single.mjs tests/balance-annual-inflation.test.mjs`; `node tests/run-single.mjs tests/balance-annual-cape.test.mjs`; `node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs` | R2: Weiter mit Phase 3, echte Storage-Migrationen direkt gegen `StorageManager` testen |
| 2026-05-12 | Phase 3: Storage/Snapshot/Profile | abgeschlossen | Neuer direkter StorageManager-Contract-Test angelegt. Reale Migrationen, TaxState-Erhalt, Snapshot-Restore-Filter und Full-localStorage-Snapshot-Erstellung sind abgesichert. Keine Produktivcode-Aenderung noetig. | `node tests/run-single.mjs tests/balance-storage-contract.test.mjs` | R3: Weiter mit Phase 4, Diagnose-/Renderer-Contracts gezielt pruefen |
| 2026-05-12 | Phase 4: Diagnose/Renderer | abgeschlossen | Neuer Copytext-Contract-Test angelegt. Dabei wurde ein doppelter `Status-Übersicht`-Block im Diagnose-Export entdeckt und minimal entfernt. VPW-/Dynamic-Flex- und Transaktionsdiagnostik bleiben im Copytext abgesichert. | `node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs`; `node tests/run-single.mjs tests/balance-diagnosis-format.test.mjs`; `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`; `node tests/run-single.mjs tests/balance-diagnosis-transaction.test.mjs`; `node tests/run-single.mjs tests/balance-renderer-action.test.mjs` | R4: Weiter mit Phase 5 als Kontrollphase, derzeit keine weiteren belegten Fix-Luecken |
| 2026-05-12 | Phase 5: Kontrollphase/Abschluss | abgeschlossen | Alle belegten Luecken sind geschlossen. Keine weiteren Fixes noetig. Slice wird in der Projektuebersicht als umgesetzt markiert und ins Archiv verschoben. | `node tests/run-tests.mjs` zuletzt gruen nach Phase 4: 74 Testdateien, 1563 Assertions, 0 Fehler | R5: Balance-Workflow-Hardening abgeschlossen |

## Testplan

### Fokussierte Tests waehrend der Umsetzung

```bash
node tests/run-single.mjs tests/balance-smoke.test.mjs
node tests/run-single.mjs tests/balance-storage.test.mjs
node tests/run-single.mjs tests/balance-storage-contract.test.mjs
node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs
node tests/run-single.mjs tests/balance-annual-inflation.test.mjs
node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs
node tests/run-single.mjs tests/balance-annual-cape.test.mjs
node tests/run-single.mjs tests/balance-decumulation.test.mjs
node tests/run-single.mjs tests/balance-reader.test.mjs
node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs
node tests/run-single.mjs tests/balance-diagnosis-format.test.mjs
node tests/run-single.mjs tests/balance-diagnosis-guardrails.test.mjs
node tests/run-single.mjs tests/balance-diagnosis-transaction.test.mjs
node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs
node tests/run-single.mjs tests/balance-renderer-action.test.mjs
node tests/run-single.mjs tests/balance-renderer-summary.test.mjs
node tests/run-single.mjs tests/balance-expenses.test.mjs
node tests/run-single.mjs tests/balance-dynamic-flex-gate.test.mjs
```

### Abschlussvalidierung

```bash
node tests/run-tests.mjs
```

## Review-Checkliste

- [x] Sind alle neuen Tests deterministisch und ohne reale Finanzdaten?
- [x] Sind Storage-Keys und Profil-/Global-Grenzen klar benannt?
- [x] Sind Jahresupdate-Fehlerpfade und lokale Fallbacks abgedeckt?
- [x] Bleiben Diagnosefelder additiv und rueckwaertskompatibel?
- [x] Wurden UI-Bootstrap-Dateien nur bei konkretem Workflow-Bedarf geaendert?
- [x] Wurde dokumentiert, falls nur fokussierte Tests statt Gesamtsuite liefen?
- [x] Wurde Doku nur dort geaendert, wo sich Contracts oder Modulverantwortung tatsaechlich geaendert haben?

## Abbruch- und Eskalationskriterien

Die Umsetzung sollte pausiert und neu bewertet werden, wenn:

- Baseline-Tests bereits ohne Aenderungen fehlschlagen und der Fehler nicht klar balancebezogen ist.
- ein Fix eine fachliche Engine-, Steuer- oder Tranchenentscheidung erfordert.
- reale Nutzerdaten, lokale Snapshots oder Exporte fuer Tests noetig waeren.
- ein Workflow nur durch groessere UI-/Bootstrap-Refactors testbar wird.
