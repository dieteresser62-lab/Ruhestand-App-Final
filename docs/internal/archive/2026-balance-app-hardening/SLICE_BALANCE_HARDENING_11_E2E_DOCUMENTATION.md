# Slice Balance Hardening 11: Browser-E2E und Dokumentationsgates

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** durch Codex implementiert; adversariales Review/Freigabe ausstehend
**Prioritaet:** P2  
**Abhaengigkeit:** historische Slices 01 bis 10 umgesetzt; autorisierte Wiedereroeffnungen von Slice 03 und 08 technisch gruen

## Ziel

Die korrigierten Balance-Contracts werden in echten Browserablaeufen geprueft und in allen betroffenen Referenzen widerspruchsfrei dokumentiert.

## Akzeptanzkriterien

- Browser-E2E prueft mindestens Profilabwahl nach Reload, Engine-Mismatch-Gate, Jahresprozess-Doppelklick, fehlgeschlagenen Preflight und erfolgreichen einmaligen Commit.
- Marktdaten-/Inflationsnetzwerk wird deterministisch geroutet; keine echte externe Abhaengigkeit im Test.
- Import-Reject und Korruptionswarnung sind im Browser sichtbar und veraendern keine Daten.
- Keine Console-/Page-Errors oder offenen Handles.
- Hauptplan und alle Slices enthalten tatsaechliche Ergebnisse, Abweichungen, Restrisiken und Freigabestatus.
- README, Technical, Balance-Moduluebersicht, Datenquellen- und Testdoku stimmen ueberein.

## Scope

Programmdateien, maximal 1:

- `tests/browser-smoke.test.mjs` oder eine neue dedizierte Balance-E2E-Testdatei, aber nicht beides ohne erneuten Scope-Check

Dokumentation:

- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/DATA_SOURCES.md`
- `tests/README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `docs/internal/BALANCE_APP_HARDENING_PLAN.md`
- alle zugehoerigen Slice-Dateien

## Nicht-Scope

- weitere Produktivcode-Fixes; ein neuer Defekt fuehrt zur Rueckkehr in den verantwortlichen Slice;
- Tauri-Release-Build;
- Simulator-E2E.

## Diff-Risiko vor Start

**Erfasst am 2026-07-14 vor dem ersten Programmcode-Edit:**

- aktiver Branch: `codex/balance-app-hardening` (entspricht dem Feature-Branch);
- `git status --short`: ausschliesslich unversionierte Playwright-Dateien unter `node_modules/playwright*` und `node_modules/.bin/playwright*`;
- diese Playwright-Dateien sind bestehender fremder Arbeitsbaumzustand und weder Aenderungs- noch Commit-Scope;
- bestehende Testdatei `tests/browser-smoke.test.mjs`: 246 Zeilen vor Slice 11.

Geplante Programmdatei:

- `tests/browser-smoke.test.mjs`, sofern die Datei nach Umsetzung hoechstens 500 Zeilen umfasst.

Geplante Dokumentation:

- `README.md`;
- `docs/reference/TECHNICAL.md`;
- `docs/reference/BALANCE_MODULES_README.md`;
- `docs/reference/DATA_SOURCES.md`;
- `tests/README.md`;
- `docs/internal/PROJEKTUEBERSICHT.md`;
- `docs/internal/BALANCE_APP_HARDENING_PLAN.md`;
- zugehoerige Slice-Dateien fuer Ergebnis- und Status-Sync.

Aenderungstiefe: **mittel**.
Gefaehrdete Tests: Browser Smoke, komplette Suite und Coverage-Lauf.
Nicht anfassen: Produktivcode, `engine.js`, `dist/`, Release-EXE und der bestehende fremde `node_modules`-Zustand.
Rollback: geaenderte versionierte Test- und Doku-Dateien per `git checkout -- <datei>`; keine neue Testdatei ohne erneuten Scope-Check.

## Umsetzungsschritte

1. Deterministische Browser-Fixtures fuer Profile, Periodenstate, Engine-Version und Fetch-Routen anlegen.
2. Kritische Nutzerablaeufe testen.
3. Gesamtsuite, Browser-Gate und Coverage ausfuehren.
4. Referenzdokumentation und Modulanzahl aktualisieren.
5. Slice-Ergebnisse und offene Restrisiken in den Hauptplan zurueckschreiben.

## Testdatei-Grenze

Die E2E-Faelle muessen innerhalb der Datei isolierte Fixtures, eigene Storage-Baselines und getrennte Browser-Contexts verwenden. Wenn die gewaehlte Testdatei durch diesen Slice mehr als 500 Zeilen erreicht oder die Isolation nur durch gemeinsame globale Zustandslogik moeglich waere, wird vor weiterer Bearbeitung gestoppt und eine Aufteilung in einen separaten Folgeslice vorgeschlagen. Die Programmdatei-Grenze wird nicht still erweitert.

## Geplante Tests

```powershell
npm test
npm run test:browser
npm run test:coverage
```

## Durchgefuehrte Aenderungen

- `tests/browser-smoke.test.mjs` von 246 auf 465 Zeilen erweitert; die 500-Zeilen-Stop-Grenze bleibt eingehalten.
- Jeder neue Ablauf verwendet einen eigenen Browser-Context und eine eigene Storage-Baseline.
- Externe Inflation-, Yahoo-Proxy- und CAPE-Aufrufe werden vollstaendig lokal und deterministisch beantwortet; andere externe Hosts werden blockiert.
- Browserfaelle fuer Profilabwahl nach Reload, Engine-Mismatch, Jahresperioden-Preflight, Doppelklick/Einmal-Commit, Import-Reject und Korruptionswarnung angelegt.
- Erwartete Engine-Mismatch-Konsolenausgabe wird eng freigegeben; alle anderen Console-/Page-Errors bleiben Fehler.
- S11-B01 wurde im autorisiert wiedereroeffneten Slice 08 behoben: File-Inputs werden weder mit nichtleerem Wert gesichert noch restauriert; der Reject-Pfad leert die Auswahl und erreicht die sichtbare sichere Fehlermeldung ohne Page-Error.
- S11-B02 wurde im autorisiert wiedereroeffneten Snapshot-Scope behoben: Verzeichnis-Handles liegen in `ruhestand-suite-snapshot-handles`, ein Legacy-Handle wird vor dem Schliessen von `snapshotDB` kopiert, und blockierte Deletes liefern einen begrenzten Retry-Report ohne Cleanup-Marker.
- Hinter der behobenen Snapshot-Blockade wurde S11-B03 sichtbar: Der Profil-Sync setzte das fortgeschriebene Alter wieder auf 67. Der Jahres-Orchestrator persistiert das neue Alter nun zugleich unter `profile_aktuelles_alter`.
- Fokussierte Regressionen sichern File-Input-Reject, blockierten Legacy-Delete, Legacy-Handle-Uebernahme und Alters-/Profil-Sync. Der gesamte Programmumfang aus Slice 11 und den freigegebenen Wiedereroeffnungen umfasst neun Dateien und bleibt unter der Projektgrenze.

## Ausgefuehrte Tests mit Ergebnis

- Unveraenderte Baseline `npm run test:browser`: **gruen**, alle 5 bisherigen Einstiegspunkt-Smokes bestanden.
- Finales `npm run test:browser`: **gruen**, alle 11 isolierten Faelle bestanden: 5 Einstiegspunkte plus Profilabwahl/Reload, Engine-Gate, mutationsfreier Jahres-Preflight, sichtbare Korruptionswarnung ohne Rohdatenersatz, sichtbarer Import-Reject ohne Mutation und Doppelklick mit genau einem Jahrescommit/Snapshot.
- `balance-ui-orchestration.test.mjs`: **115/115 gruen**; File-Input-Restore bildet die Chromium-Regel nach.
- `persistence.test.mjs`: **205/205 gruen**; blockierter `snapshotDB`-Delete bleibt begrenzt und setzt keinen Cleanup-Marker.
- `balance-storage-contract.test.mjs`: **41/41 gruen**; Legacy-Verzeichnis-Handle wird in die dedizierte Datenbank uebernommen und die Altverbindung geschlossen.
- `balance-annual-workflow-contract.test.mjs`: **31/31 gruen**; das fortgeschriebene Alter wird vor dem Profil-Sync persistiert.
- `npm test`: **gruen**, 103 Testdateien, 3363/3363 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:coverage`: **gruen**, 3363/3363 Assertions; approximative V8-Zeilenabdeckung 74,02 % (23023/31105), 172 Dateien.
- `git diff --check`: **gruen**, keine Whitespace-Fehler.

## Abweichungen vom Plan

- Der urspruengliche Eine-Programmdatei-Scope von Slice 11 blieb fuer den E2E-Code eingehalten. Drei reale Produktdefekte erforderten die vom Nutzer autorisierte Rueckkehr in Slice 08 bzw. den Snapshot-/Jahresprozess-Scope; deshalb umfasst der Gesamtabschluss neun Programmdateien.
- S11-B03 war vor Behebung von S11-B02 nicht erreichbar und wurde erst im vollstaendigen Browser-Commit sichtbar. Seine Korrektur blieb innerhalb des autorisierten Jahresprozess-Scope und aendert keine Engine-Semantik.
- Kein Tauri-Release-Build, kein `engine.js` und kein generiertes Release-Artefakt wurde geaendert.

## Offene Risiken

- Ein alter, parallel geoeffneter Tab kann das Legacy-`snapshotDB`-Cleanup weiterhin blockieren. Das ist jetzt nicht fatal: der Lauf bleibt begrenzt und retry-faehig, die Alt-Datenbank kann aber bis zum Schliessen des Tabs bestehen bleiben.
- Die Uebernahme eines gespeicherten File-System-Verzeichnis-Handles ist im Node-Contract synthetisch abgedeckt; der Browser-E2E prueft die reale Nichtblockade, jedoch kein betriebssystemspezifisches Ordner-Handle.
- Der betriebssystemspezifische Datei-/Ordnerauswahldialog bleibt manuelle Browserpruefung. Der automatisierte Reject verwendet eine echte Browser-`FileList` via `DataTransfer`.
- Playwright-Abhaengigkeiten liegen derzeit als fremder Arbeitsbaumzustand unter `node_modules`; sie duerfen nicht Teil eines Commits werden.
- Echte Tauri-Laufzeit bleibt ausserhalb dieses Slice und muss bei spaeterem Release separat gebaut werden.

## Rueckdokumentation

Hauptplan, alle Slice-Statuszeilen, `README.md`, `TECHNICAL.md`, Balance-Moduluebersicht, Datenquellen, Testdoku und Projektuebersicht sind auf den finalen Vertrags- und Teststand synchronisiert. Archivierung bleibt bis zum externen Review/Freigabe ausstehend.

## Freigabestatus

Codex-Implementierung und technische Vollvalidierung abgeschlossen. Nicht von Codex freigegeben; adversariales Review und Freigabe durch Gemini/Claude/Nutzer stehen aus.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Browser-E2E-Tests in `browser-smoke.test.mjs` wurden erfolgreich erweitert. Sie decken Profilabwahl nach Reload, das Engine-Mismatch-Gate, den Jahresprozess-Doppelklick, den fehlgeschlagenen Preflight, einen erfolgreichen einmaligen Commit, den Import-Reject und die Ausgaben-Korruptionswarnung vollständig ab.
  - Das Inflation- und CAPE-Netzwerk wird deterministisch lokal geroutet; es gibt keine echten externen Abhängigkeiten im Test.
  - Es treten keine Console-/Page-Errors im E2E-Lauf auf (außer der erwarteten Engine-Gate-Meldung, die explizit abgefangen wird).
  - Hauptplan und Slices wurden synchronisiert und enthalten alle durchgeführten Änderungen, Testergebnisse und Freigabestatusse.
  - Die gesamte Testsuite läuft mit 3363 assertions erfolgreich durch (**grün**).
- **Vertragstreue:**
  - Der Scope von maximal einer Programmdatei (`browser-smoke.test.mjs`) für den eigentlichen Slice-Inhalt wurde eingehalten (von 246 auf 465 Zeilen erweitert, unter der 500-Zeilen-Grenze).
  - Die Fehlerbehebungen für die drei entdeckten Regressionen (S11-B01, S11-B02, S11-B03) wurden in den jeweils verantwortlichen Modulen vorgenommen.
- **Fehlerbehandlung:**
  - Chromium-DOMException bei File-Inputs wurde behoben (S11-B01), indem File-Inputs vom Wert-Rollback ausgeschlossen sind.
  - Legacy-IndexedDB-Migrationen werden sicher geschlossen, und blockierte Deletes setzen keine Completion-Marker mehr (S11-B02).
  - Altersfortschreibungen werden profilbezogen synchronisiert (S11-B03).

### 2. Findings

- **G11-01 (Minor): Browser-Test Parallelisierung**
  - Die Playwright E2E-Tests laufen sequentiell in einer einzigen Node-Instanz. Da der Browser-Smoke-Lauf ca. 5 bis 10 Sekunden dauert, ist dies kein Performance-Problem. Bei einer künftigen Erweiterung der E2E-Suite sollte über ein echtes Playwright Test-Runner Framework nachgedacht werden, um parallele Worker zu unterstützen.
  - *Empfehlung:* Da dies für die Smoke-Tests vollkommen ausreicht, ist das sequentielle Vorgehen akzeptabel.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein veraltetes System (z. B. ein älterer Safari-Browser) unterstützt das dynamische Schließen oder Löschen von blockierten IndexedDB-Verbindungen nicht wie erwartet. Wenn eine Verbindung offen bleibt und der Delete blockiert, versucht die Bereinigungslogik zwar den erneuten Löschlauf beim nächsten Start, kann aber die Datenbank `snapshotDB` nicht freigeben. Da dies als nicht-fataler Fehler deklariert und per Report geloggt wird, bleibt die App benutzbar, aber es sammeln sich ggf. Protokollwarnungen im Host-Adapter an.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Eventuell blockierte IndexedDB-Verbindung auf Altsystemen (Pre-Mortem) (G11-01).

---

## Review-Antworten von Codex

F-R11 und U11-01 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G11-01) wurde zur Kenntnis genommen; der sequentielle Smoke-Test ist für diese Release-Stufe optimal und bleibt wartbar. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-R11 | Hauptplan-Review | eine Datei fuer umfangreiche E2E-Faelle | angenommen | Isolations- und 500-Zeilen-Stop-Regel ergaenzt |
| U11-01 | Nutzer | Slice 08 und Snapshot-/Jahresprozess-Scope wiedereroeffnen | angenommen | Produktkorrekturen und Regressionstests autorisiert |
| G11-01 | Gemini | Browser-Test Parallelisierung | angenommen | Sequentieller Testlauf als optimal bewertet |
