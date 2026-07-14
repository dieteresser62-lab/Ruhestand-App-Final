# Slice Tranchenmanagement 03: Persistenz, Profil-Handoff und Recovery

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
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
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

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

- auf den freigegebenen Slice-02-Commit zurück; Recovery- und Handoff-Änderungen nicht teilweise zurückrollen.

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

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Ein bereits korrupter Registry-Snapshot kann zusätzliche Recovery-Grenzen erfordern.
- Browser und Tauri unterscheiden sich bei Lifecycle-Ereignissen.
- Ein raw-preserving Reset muss verhindern, dass sensible Daten versehentlich in Testlogs gelangen.

## Rückdokumentation

- Tatsächliche Recovery-Zustände, Handoff-Events und Import-/Exportentscheidung in Hauptplan und GAP-Analyse eintragen.
- Nutzeranleitung erst in Slice 09 aktualisieren, aber Entscheidung hier festschreiben.

## Freigabestatus

Nicht freigegeben. Persistenz- und Datenverlustreview ausstehend.

## Review-Feedback von Gemini

Ausstehend: Crashpunkte, Rejection-Pfade, Profilverwechslung, Recovery-Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: Lifecycle-, IndexedDB-/Tauri- und Import-/Export-Vertrag.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
