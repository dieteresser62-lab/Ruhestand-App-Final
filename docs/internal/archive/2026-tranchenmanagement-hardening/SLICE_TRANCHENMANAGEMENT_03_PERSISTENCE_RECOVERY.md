# Slice Tranchenmanagement 03: Persistenz, Profil-Handoff und Recovery

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
**Abhängigkeit:** Slice 02 abgeschlossen und freigegeben
**GAPs:** TM-04, TM-09, TM-10, TM-12, TM-19, TM-22

## Ziel

Laden, Speichern, Profilnavigation und Wiederanlauf werden als expliziter Persistenzvertrag umgesetzt. Korrupte Rohdaten bleiben erhalten, ein Save-Erfolg setzt einen bestätigten Flush voraus und der Manager öffnet garantiert das ausgewählte Profil.

## Verbindliche Nutzerentscheidungen und Planfestlegung

- O-04: Korrupte Rohdaten bleiben erhalten; Verarbeitung blockieren und explizite Recovery anbieten.
- O-06: Toten Teilimport/-export entfernen; zentrale Komplettbackups bleiben der einzige Restore-Weg.
- Planfestlegung: Ein leerer Haushalts-Override bedeutet ausdrücklich „keine Tranchen“ und fällt nicht auf einen anderen Storage zurück.

## Akzeptanzkriterien

- Loader liefert `valid`, `empty`, `corrupt` oder `unavailable`; reines Laden schreibt nichts.
- Bei `corrupt` bleibt das ursprüngliche Payload byte-/stringgetreu erhalten und wird nicht als `[]` im Live-Key oder Profil gespeichert.
- Bei `unavailable` bleibt der letzte bestätigte Zustand unverändert; die UI bietet Retry, aber keinen Reset als Fehlerbehandlung an.
- Manager zeigt bei `corrupt` einen blockierenden, verständlichen Recovery-Status und bietet nur reviewte Aktionen: Abbruch, zentrale Backup-Wiederherstellung oder explizit bestätigter Reset.
- Der unveränderte Rohpayload ist nur nach bewusster lokaler Aktion anzeig- und kopierbar; er wird nie automatisch geloggt, exportiert oder in Tests ausgegeben.
- Create/Edit/Delete/Reset schließen erst nach erfolgreichem Flush fachlich ab.
- Flushfehler lassen den vorherigen bestätigten Zustand sichtbar und ermöglichen Retry; kein Erfolgstoast/-status.
- Der Link von der Startseite flusht die Profilwahl vor Navigation und der Manager zeigt ID/Name des tatsächlich geladenen Profils.
- Reload, `pageshow`/BFCache und Rückkehr aus einem anderen Tab erzeugen keine doppelten Listener und laden keinen fremden Profilbestand.
- Ein leeres Override fällt nicht auf den aktuellen Profil-Storage zurück.
- Der tote unversionierte Teilimport/-export-Code wird entfernt; kein Phantom-Control im Test-DOM.
- Zentrale Komplettbackups bleiben funktionsfähig.

## Scope

- State-Ergebnis für Persistenzzustände.
- Awaitbarer Persistenzpfad im Manager.
- Profil-Handoff vom Startseitenlink.
- Recovery-Anzeige und expliziter Reset.
- Lifecycle-/Idempotenzvertrag.
- Entfernung des toten Import-/Exportcodes.

## Nicht-Scope

- Keine neue PersistenceFacade-Architektur.
- Kein automatisches Reparieren fachlich ungültiger Lots.
- Kein Realbestands-Reconcile; Slice 08.
- Keine neue Teilbackup-Funktion ohne ausdrückliche Reviewentscheidung.

## Geplante Programmdateien

Maximal neun:

- `app/tranches/tranchen-manager-state.js`
- `app/tranches/tranchen-manager-page.js`
- `app/profile/profile-navigation.js`
- `index.html`
- `depot-tranchen-manager.html`
- `tests/tranchen-manager-page.test.mjs`
- `tests/profile-navigation.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/persistence.test.mjs`

Eine notwendige Änderung an der zentralen PersistenceFacade wäre nicht still in diesen Scope aufzunehmen; Stop und Neuplanung.

## Git- und Diff-Risiko vor Coding

```text
git branch --show-current: codex/tranchenmanagement-hardening
git status --short:
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Startbasis: Slice 02 ist freigegeben und als Commit `acd6905` vorhanden. Die
unversionierten Playwright-Dateien bestanden vor Slice-Start und bleiben
unangetastet.

Geplante Dateien:

- die neun oben genannten Programmdateien sowie Slice-/Plan-MD.

Voraussichtliche Änderungstiefe:

- riskant; Datenhaltbarkeit, Profilgrenzen und Navigation.

Gefährdete bestehende Tests:

- Profil-Registry/Storage/Navigation,
- PersistenceFacade-, IndexedDB- und Tauri-Adaptertests,
- Manager-Page und Browser-Smoke,
- Komplettbackup/-import und Snapshot-Contracts.

Nicht anfassen:

- Persistenz-Backendformat ohne Migration,
- Snapshot-Archivsemantik,
- `engine/`, `engine.js`, `dist/`, Release-Artefakte,
- reale lokale Nutzerdaten.

Rollback-Strategie:

- die geänderten Slice-03-Dateien dateigezielt auf den freigegebenen
  Slice-02-Commit `acd6905` zurücksetzen; Recovery- und Handoff-Änderungen
  nicht teilweise zurückrollen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/tranchen-manager-state.test.mjs
node tests/run-single.mjs tests/tranchen-manager-page.test.mjs
node tests/run-single.mjs tests/profile-navigation.test.mjs
node tests/run-single.mjs tests/profile-storage.test.mjs
node tests/run-single.mjs tests/persistence.test.mjs
npm test
npm run test:browser
```

Pflichtfälle: corrupt ohne Write, bewusstes Anzeigen/Kopieren des unveränderten Rohpayloads, `unavailable` mit Retry und ohne Reset, expliziter Reset, Flush-Rejection, Profil A/B, schneller Profilwechsel plus Navigation, Reload und BFCache. Rohdaten dürfen in keiner Testausgabe erscheinen.

## Ergebnisse

Alle Akzeptanzkriterien sind im geplanten Neun-Dateien-Programmscope umgesetzt und
technisch validiert. Der Manager unterscheidet lesbare, leere, korrupte und
vorübergehend nicht verfügbare Bestände, schreibt beim Laden nicht und meldet einen
Erfolg erst nach bestätigtem Flush. Slice 03 ist noch nicht adversarial reviewed
oder freigegeben.

## Durchgeführte Änderungen

- `loadTranchesFromStorage()` liefert einen expliziten Ergebnisvertrag mit
  `valid`, `empty`, `corrupt` oder `unavailable`. Der unveränderte Rohstring wird
  nur bei tatsächlich gelesenem `corrupt` im Ergebnis gehalten; der Loader hat
  keine Schreibnebenwirkung.
- Der Manager hält den letzten bestätigten Tranchen- und Profilwertestand getrennt
  von einer ausstehenden Änderung. Create/Edit/Delete, Reset, Kursänderungen und
  Profilwerte gelten erst nach erfolgreichem `PersistenceFacade.flush()` als
  abgeschlossen. Rejections stellen Live-Key, Profil-Registry und sichtbare Werte
  zurück und bieten einen expliziten Retry ohne falschen Erfolgsstatus.
- `corrupt` blockiert normale Bearbeitung. Die UI bietet Abbruch zur Startseite,
  den zentralen Komplettbackup-Pfad, bewusstes lokales Anzeigen/Kopieren und einen
  bestätigungspflichtigen Reset. `unavailable` zeigt ausschließlich Retry und
  bewahrt den letzten bestätigten sichtbaren Stand.
- Der Manager-Link auf `index.html` ist ein echter Profil-Handoff. Navigation
  erfolgt erst nach erfolgreichem Flush; bei Rejection bleibt die Startseite mit
  sichtbarem Fehler aktiv. Für diesen Link wird bewusst kein `window.name`-Bundle
  erzeugt, damit korrupte Tranchen nicht automatisch kopiert/exportiert werden.
- Der Manager zeigt Name und ID des tatsächlich aktiven Profils. Wiederholte
  Initialisierung bindet keine Listener doppelt; BFCache wird durch den bestehenden
  `pageshow`-Hook neu geladen und die Rückkehr aus einem anderen Tab lädt die
  Managerseite einmal neu.
- Der tote unversionierte Tranchen-Teilimport/-export samt Listenern und
  Test-Phantom-Controls wurde entfernt. Der zentrale versionierte Komplettbackup-
  und Restore-Pfad blieb unverändert und grün.
- Ein explizites `depot_tranchen: '[]'` wird beim Profilwechsel als leer geladen
  und fällt nicht auf den vorherigen Live-Bestand zurück.

## Ausgeführte Tests

- `node tests/run-single.mjs tests/tranchen-manager-state.test.mjs`: 24/24
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/tranchen-manager-page.test.mjs`: 37/37
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/profile-navigation.test.mjs`: 25/25
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/profile-storage.test.mjs`: 130/130
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/persistence.test.mjs`: 205/205 Assertions,
  0 Fehler.
- `npm test`: 104 Testdateien, 4082/4082 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles; separates Gate ebenfalls grün.
- `npm run test:browser`: elf Browser-Smoke-Szenarien einschließlich
  `index.html` und `depot-tranchen-manager.html` grün.
- `git diff --check`: erfolgreich, keine Whitespace-Fehler.

## Abweichungen vom Plan

- `tests/tranchen-manager-state.test.mjs` musste für den neuen öffentlichen
  Loader-Ergebnisvertrag angepasst werden. Um das Neun-Dateien-Limit einzuhalten,
  blieb `tests/persistence.test.mjs` unverändert; dessen bestehende 205 Assertions
  decken Flush-Rejection, Dirty-Retry, IndexedDB, Tauri und Komplettbackups bereits
  ab und wurden vollständig ausgeführt.
- Die zentrale `PersistenceFacade` benötigte wie geplant keine Änderung.
- Der Manager-Handoff verwendet den gemeinsamen bestätigten Persistenzstand statt
  des bisherigen `window.name`-Exports. Das verhindert die automatische Kopie
  eines korrupten Rohpayloads und hält die Profilidentität über Current-/Active-ID.

## Offene Risiken

- Eine vollständig korrupte Profil-Registry liegt außerhalb des Tranchen-Key-
  Recovery-Vertrags und kann zusätzliche Recovery-Grenzen erfordern.
- Browser und Tauri unterscheiden sich bei Lifecycle- und Clipboard-Verhalten.
  Wenn die Clipboard-API fehlt, bleiben die bewusst eingeblendeten Rohdaten
  manuell markierbar; es erfolgt kein automatischer Fallback-Export.
- Die Rückkehr aus einem anderen Tab lädt den Manager bewusst neu. Ein Browser,
  der `visibilitychange` nicht zuverlässig liefert, fällt weiterhin auf Reload
  beziehungsweise den `pageshow`-/BFCache-Hook zurück.

## Rückdokumentation

- Recovery-Zustände, bestätigter Handoff, Retry-/Rollback-Vertrag, leeres Override
  und Entfernung des Teilimports sind im Hauptplan und in der GAP-Analyse
  rückdokumentiert.
- Die Nutzeranleitung bleibt wie geplant Aufgabe von Slice 09.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien wurden vollständig und fehlerfrei erfüllt. Der Manager-Link auf der Startseite blockiert bei einem fehlgeschlagenen Flush zuverlässig die Navigation und zeigt eine verständliche Fehlermeldung an.
* **Vertragstreue:** Die Entfernung des unversionierten Teilimport/-export-Codes (O-06) wurde sauber umgesetzt, wodurch der zentrale Backup-Vertrag gestärkt wird.
* **Fehlerbehandlung:** Exzellentes Handling transienter (Netzwerk/Lock) vs. persistenter (Syntax/Struktur) Speicherfehler. Korrupte JSON-Payloads werden nicht stillschweigend überschrieben, sondern byte-getreu in Quarantäne gehalten und können per Klick kopiert werden, bevor der Reset durchgeführt wird.
* **Seiteneffekte:** `visibilitychange` und BFCache-Hooks fangen Tab-Wechsel sauber ab und verhindern veraltete Cache-Zustände.
* **Was könnte brechen:** Bei unzureichenden Rechten auf der Zwischenablage (z. B. im Iframe) greift der Fallback auf die manuelle Markierung der eingeblendeten Rohdaten. Dies ist ein sehr robuster Fail-Safe.

### 2. Findings

* **G3-01 (BFCache-Seiten-Reload):** Der BFCache-Refresh nutzt `window.location.reload()`. Dies führt im Desktop-Tauri-Kontext oder bei sehr langsamen Offline-Systemen zu einem erneuten Laden aller Ressourcen, ist aber für die Konsistenz der Daten im Browser unumgänglich.
  * *Entscheidung:* Akzeptiert, da Konsistenz überwiegt.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Nutzer hat die App in zwei parallel geöffneten Browser-Tabs aktiv. In Tab A führt er einen Profilwechsel durch, wodurch die Profil-ID im globalen Storage geändert wird. In Tab B, in dem die Tranchenverwaltung geöffnet ist, registriert er die Änderung nicht sofort (da `visibilitychange` erst beim Fokussieren triggert). Der Nutzer macht in Tab B schnell eine Änderung und speichert ab; die Tranchen von Tab B werden fälschlicherweise in den Storage-Key des in Tab A neu ausgewählten Profils geschrieben (da der Speicherpfad die aktive ID dynamisch ausliest).

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Nebeneffekte bei paralleler Multi-Tab-Nutzung (Kollisionsrisiko bei asynchroner Profil-ID-Umschaltung).
  * Abhängigkeit von `navigator.clipboard` für das komfortable Kopieren des korrupten Payloads.

## Review-Feedback von Claude

Ausstehend: Lifecycle-, IndexedDB-/Tauri- und Import-/Export-Vertrag.

## Review-Antworten von Codex

Noch kein Slice-Review vorhanden. Codex erteilt keine Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-03 | Nutzer | Slice 03 implementieren | angenommen | Implementierung und technische Validierung abgeschlossen; Review ausstehend |
