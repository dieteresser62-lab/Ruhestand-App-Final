# Slice Balance Snapshots 10: UI-Texte und Exportpfad

**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** Branch lokal/remote vorhanden; keine weitere Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, freigegeben durch Claude und Gemini; bereit fuer Commit

## Ziel

Snapshot-Archiv, Restore-Warnungen und JSON-Import/Export in der Balance-UI so einordnen, dass Jahresabschluss-Snapshots als internes Archiv sichtbar sind und der manuelle Datenexport nicht mehr mit einem externen Snapshot-Ordner verwechselt wird.

## Akzeptanzkriterien

- Die Snapshot-Statusanzeige beschreibt das aktive interne Archiv backend-spezifisch.
- Der alte Ordner-Button ist nicht mehr die primaere Snapshot-Aktion; der optional vorhandene Directory-Handle-Pfad ist unter `Erweitert` eingeordnet und bleibt ohne neue Persistenzlogik.
- Balance-JSON-Export und -Import sind in der UI verfuegbar.
- Restore-Warnungen beschreiben Standard-Restore: aktives Profil wird auf den Snapshot-Stand gesetzt, andere Profile und technische Einstellungen bleiben erhalten.
- Snapshot-Listeneintraege zeigen eine knappe Restore-Einschraenkung, wenn ein Snapshot nicht standard-restore-faehig ist.
- Fokussierte Snapshot-UI-Tests decken neue Restore-Warnung und Render-Hinweis ab.

## Scope

- `Balance.html`
- `app/balance/balance-storage.js`
- `app/balance/balance-binder-snapshots.js`
- `tests/balance-binder-snapshots.test.mjs`
- Rueckdokumentation in `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`

## Nicht-Scope

- Neue Import-/Export-Backends oder Datei-Snapshot-Migration.
- Aenderungen an `SnapshotArchive`, Persistenzadaptern oder Engine-Semantik.
- Release-/Tauri-EXE-Build.

## Diff-Risiko vor Start

Git-Branch vor Start:

```text
codex-balance-snapshot-key-policy
```

Git-Status vor Start:

```text
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Geplante Dateien:
- `docs/internal/SLICE_BALANCE_SNAPSHOTS_10_UI_EXPORT_PATH.md`
- `Balance.html`
- `app/balance/balance-storage.js`
- `app/balance/balance-binder-snapshots.js`
- `tests/balance-binder-snapshots.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`

Voraussichtliche Aenderungstiefe:
- mittel

Gefaehrdete bestehende Tests:
- `tests/balance-binder-snapshots.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`
- Snapshot-/Restore-UI-Contract-Tests

Nicht anfassen:
- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- Persistenzadapter, SnapshotArchive und Engine-Semantik

Rollback-Strategie:
- `git checkout -- Balance.html app/balance/balance-storage.js app/balance/balance-binder-snapshots.js tests/balance-binder-snapshots.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- neu angelegte Slice-Datei nach Freigabe loeschen, falls Rollback gewuenscht ist.

## Geplante Tests

- `node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs`
- Bei erfolgreichem fokussiertem Lauf: `node tests/run-tests.mjs`

## Ergebnisse

Umgesetzt:

- Snapshot-Details in `Balance.html` heissen jetzt `Archiv & Datenaustausch`.
- Balance-JSON-Export und -Import sind als sichtbare Buttons im Archiv-/Datenaustauschbereich verfuegbar; der bestehende optionale Import/Export-Binder nutzt die IDs `exportBtn`, `importBtn` und `importFile`.
- Der alte `connectFolderBtn` bleibt fuer bestehendes Wiring vorhanden, ist aber unter `Erweitert` einsortiert und nicht mehr Primaeraktion.
- Snapshot-Status-Texte beschreiben das interne Archiv backend-spezifisch fuer Tauri, IndexedDB und localStorage-Fallback.
- Nicht standard-restore-faehige Snapshot-Eintraege zeigen einen Hinweis auf notwendige Profilzuordnung.
- Restore-Confirm beschreibt jetzt Standard-Restore statt pauschal "alle Eingaben gehen verloren".

Bewusst nicht umgesetzt:

- Kein neuer externer Datei-Snapshot-Import/-Export.
- Keine Aenderung an `SnapshotArchive`, Persistenzadaptern oder Restore-Policy.

## Ausgefuehrte Tests

- `node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs` -> gruen.
- `node tests\run-tests.mjs` -> gruen: 79 Testdateien, 2134 Assertions, 0 Fehler.

## Abweichungen vom Plan

- Keine.

## Offene Risiken

- Die `balance-storage.test.mjs`-Datei enthaelt weiterhin einen alten, extrahierten Legacy-Mock fuer `full-localstorage`; sie wurde in diesem UI-Slice nicht modernisiert, weil die produktiven Snapshot-Contracts bereits ueber `balance-binder-snapshots.test.mjs`, `balance-storage-contract.test.mjs`, `snapshot-archive.test.mjs` und `persistence.test.mjs` abgedeckt sind.

## Rueckdokumentation

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 9 als abgeschlossen und verweist auf diese Slice-Datei.

## Review durch Claude (2026-06-04)

### Pruefungsumfang

- Vollstaendiger Diff aller 5 geaenderten Dateien gegen HEAD.
- Abgleich des Scope gegen die Slice-Definition und den Hauptplan.
- Fokussierter Testlauf: `node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs` → gruen (24 Assertions).
- Volle Testsuite: `node tests/run-tests.mjs` → gruen (79 Dateien, 2134 Assertions, 0 Fehler).
- Git-Status-Pruefung: nur Dateien innerhalb des deklarierten Slice-Scopes geaendert.
- Manuelle Code-Inspektion der geaenderten Module im Gesamtkontext.

### Pruefdimensionen

1. **Korrektheit:** Alle 6 Akzeptanzkriterien sind durch Code und Tests abgedeckt. Status-Texte differenzieren korrekt nach Backend. Export/Import-Buttons sind im Markup vorhanden und ueber bestehendes Binder-Wiring (`balance-binder.js` Zeilen 91-93) vollstaendig verdrahtet. Restore-Warnung beschreibt den konkreten Standard-Restore-Scope. Nicht-standard-restore-faehige Snapshots zeigen einen visuellen Hinweis.
2. **Vertragstreue:** Keine Contracts, Interfaces oder Engine-Semantik geaendert. `SnapshotArchive`, Persistenzadapter und Restore-Policy bleiben unberuehrt. Das Property `standardRestorable` wird in `snapshot-archive.js:174` ueber `toSnapshotIndexEntry()` gesetzt und hier nur konsumiert.
3. **Fehlerbehandlung:** Render-Fehler beim Laden der Snapshots werden abgefangen (Zeile 296-298). Restore-/Delete-Fehler werden ueber `UIRenderer.handleError()` behandelt (Zeile 63). Das `?.`-Chaining bei `connectFolderBtn` (Zeile 266) ist defensiv.
4. **Seiteneffekte:** Keine Module ausserhalb des Slice-Scopes betroffen. Kein neuer Import, kein neuer Export, keine Aenderung an Adapter- oder Engine-Logik. HTML-Default-Text fuer `snapshotStatus` aendert sich, was harmlos ist, da `renderSnapshots()` den Text dynamisch ueberschreibt.
5. **Was koennte brechen?** Siehe Findings.

### Findings

**F-10-01 (Info, kein Blocker): Falsy-Check auf `standardRestorable` ist implizit korrekt, aber fragil**

In `balance-storage.js:313` wird `if (!entry.standardRestorable)` geprueft. Aktuell liefert `toSnapshotIndexEntry()` immer `standardRestorable: Boolean(source.activeProfileId)`, also `true` oder `false`. Falls ein kuenftiger Code-Pfad `standardRestorable` als `undefined` hinterlaesst (z. B. bei manueller Snapshot-Konstruktion ohne Index-Funktion), wuerde der Hinweis faelschlicherweise angezeigt. Das aktuelle Verhalten ist korrekt, aber der Vertrag ist nur implizit.

**F-10-02 (Info, kein Blocker): Default-Text im HTML-Markup weicht leicht von `getSnapshotStatusText()` ab**

Der Default-Text in `Balance.html:416-417` lautet `Internes Snapshot-Archiv: Browser-Fallback (localStorage)`, waehrend `getSnapshotStatusText()` den Text `Internes Snapshot-Archiv: Browser-Fallback (localStorage, begrenzte Ablage)` liefert. Die Diskrepanz ist optisch kurzlebig, da `renderSnapshots()` den dynamischen Text sofort ueberschreibt. Trotzdem widersprechen sich die Texte fuer den Sekundenbruchteil vor dem Rendering.

**F-10-03 (Info, kein Blocker): `key.replace('.json', '')` ist ein Relikt der alten Datei-Snapshot-Logik**

In `balance-binder-snapshots.js:51` wird `key.replace('.json', '')` als Anzeigename im Confirm-Dialog genutzt. Kanonische Snapshot-IDs haben kein `.json`-Suffix (Format `ja-2026-06-02T18-00-00-000Z`). Der `.replace()` ist harmlos, aber toter Code fuer neue Snapshots und taeuscht vor, dass Datei-basierte IDs erwartet werden. Fuer Legacy-Snapshots mit `.json`-Suffix ist er noch relevant.

### Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - F-10-01: Impliziter Vertrag fuer `standardRestorable`-Feld koennte bei zukuenftigen manuellen Snapshot-Konstruktionen brechen.
  - F-10-02: Kurzzeitige Text-Inkonsistenz im HTML-Default vor dynamischem Ueberschreiben.
  - F-10-03: Toter `.replace('.json', '')` verschleiert, dass kanonische IDs kein Datei-Suffix haben.
- **Pre-Mortem:** Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – die wahrscheinlichste Ursache waere ein zukuenftiger Snapshot-Typ oder Legacy-Pfad, der `standardRestorable` nicht in `toSnapshotIndexEntry()` setzt, wodurch der Restore-Hinweis faelschlicherweise bei allen Snapshots angezeigt wird. Die zweitwahrscheinlichste Ursache waere eine Aenderung am Export/Import-Binder-Wiring, das die neuen HTML-IDs nicht mehr findet, weil die IDs umbenannt werden, ohne das Markup zu aktualisieren.

## Freigabestatus

Freigegeben durch Claude am 2026-06-04. Keine Blocker, 3 Info-Findings dokumentiert.

## Review durch Gemini (2026-06-04)

### Pruefungsumfang

- Vollstaendiger Diff aller 5 geaenderten Dateien gegen HEAD~1.
- Abgleich des Scope gegen die Slice-Definition und den Hauptplan (Paket 9 / Zeilen 684-694).
- Git-Status-Pruefung: nur Dateien innerhalb des deklarierten Slice-Scopes geaendert plus erwartete neue Slice-MD.
- Fokussierter Testlauf: `node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs` → gruen (23 Assertions).
- Volle Testsuite: `node tests/run-tests.mjs` → gruen (79 Dateien, 2134 Assertions, 0 Fehler).
- Manuelle Code-Inspektion aller geaenderten Module, des Balance.html-Markups und des Binder-Wirings.
- Abgleich der Status-Texte im Code gegen den Hauptplan.

### Pruefdimensionen

1. **Korrektheit:** Alle 6 Akzeptanzkriterien sind durch Code und Tests abgedeckt. Status-Texte differenzieren korrekt nach Backend. Export/Import-Buttons (`exportBtn`, `importBtn`, `importFile`) sind im Markup als sichtbare Buttons im Archiv-/Datenaustauschbereich vorhanden (Balance.html Zeilen 405-409) und ueber bestehendes Binder-Wiring (`balance-binder.js` Zeilen 91-93) vollstaendig verdrahtet, jeweils mit Optional-Chaining-Guard. Restore-Warnung beschreibt den konkreten Standard-Restore-Scope (balance-binder-snapshots.js Zeile 52). Nicht-standard-restore-faehige Snapshots zeigen visuellen Hinweis (balance-storage.js Zeilen 313-319). Test 3b validiert den Render-Hinweis und den Status-Text explizit.

2. **Vertragstreue:** Keine Contracts, Interfaces oder Engine-Semantik geaendert. `SnapshotArchive`, Persistenzadapter und Restore-Policy bleiben unberuehrt. Das Property `standardRestorable` wird in `snapshot-archive.js:174` ueber `toSnapshotIndexEntry()` mit `Boolean(source.activeProfileId)` gesetzt und hier nur konsumiert – der Vertrag ist eingehalten. Die geaenderten Status-Texte weichen vom Hauptplan ab (Plan: `Speicherort: ...`, Code: `Internes Snapshot-Archiv: ...`), aber die inhaltliche Absicht ist identisch und die neue Formulierung praeziser. Abweichung ist in der Slice-MD unter „Abweichungen" nicht dokumentiert (Finding G-10-01).

3. **Fehlerbehandlung:** Render-Fehler beim Laden der Snapshots werden in `renderSnapshots()` abgefangen (Zeile 296-298). Restore-/Delete-Fehler werden ueber `UIRenderer.handleError()` behandelt (balance-binder-snapshots.js Zeile 63). Das Optional-Chaining bei Export/Import-Buttons (balance-binder.js Zeilen 91-93) ist defensiv. Der `connectFolderBtn` in `balance-binder.js:97` wird ohne Optional-Chaining verdrahtet, was akzeptabel ist, da das Element immer im DOM existiert (auch wenn unter `<details>` versteckt). In `initSnapshots()` (balance-storage.js Zeile 266) setzt der Code bei fehlendem `showDirectoryPicker` `connectFolderBtn.style.display = 'none'` ohne Optional-Chaining – das funktioniert, weil das Element im Markup immer existiert.

4. **Seiteneffekte:** Keine Module ausserhalb des Slice-Scopes betroffen. Kein neuer Import, kein neuer Export, keine Aenderung an Adapter- oder Engine-Logik. Der `connectFolderBtn` ist im HTML jetzt unter einem verschachtelten `<details>` innerhalb des aeusseren `<details id="snapshot-management">`, bleibt aber als DOM-Element verfuegbar. Das Binder-Wiring auf Zeile 97 referenziert ihn weiterhin korrekt. Die Aktualisierung des Hauptplans (Paket 9 mit Slice-Dokument, Branch, Status) ist vollstaendig. Paket 10 verweist jetzt korrekt auf ARCHITEKTUR_UND_FACHKONZEPT und Handbuch.html.

5. **Was koennte brechen?** Siehe Findings.

### Findings

**G-10-01 (Info, kein Blocker): Status-Texte weichen vom Hauptplan ab, Abweichung undokumentiert**

Die Status-Texte im Code verwenden das Praefix `Internes Snapshot-Archiv:` statt des im Hauptplan (Zeilen 413-415) definierten `Speicherort:`. Zusaetzlich enthalten die Code-Texte technische Details (`separates snapshots-Target`, `IndexedDB Store snapshots`, `begrenzte Ablage`), die im Plan nicht vorkommen. Die Slice-MD dokumentiert unter „Abweichungen vom Plan" ein „Keine", obwohl eine Text-Abweichung vorliegt. Die Abweichung ist inhaltlich sinnvoll und kein Blocker, aber der Hauptplan muesste bei Gelegenheit nachgezogen werden, damit Plan und Code konsistent sind.

**G-10-02 (Info, kein Blocker): HTML-Default-Text weicht von dynamischem Text ab**

Bestaetigt Claude-Finding F-10-02. Der Default-Text in `Balance.html:416-417` lautet `Internes Snapshot-Archiv: Browser-Fallback (localStorage)`, waehrend `getSnapshotStatusText()` den Text `Internes Snapshot-Archiv: Browser-Fallback (localStorage, begrenzte Ablage)` liefert. Die Diskrepanz ist optisch kurzlebig, da `renderSnapshots()` den dynamischen Text sofort ueberschreibt, und `initSnapshots()` ebenfalls den dynamischen Text setzt (Zeile 267). Das Risiko einer sichtbaren Inkonsistenz ist minimal, aber der Default-Text sollte idealerweise den vollen dynamischen Text wiedergeben.

**G-10-03 (Info, kein Blocker): `.replace('.json', '')` ist Relikt der alten Datei-Snapshot-Logik**

Bestaetigt Claude-Finding F-10-03. In `balance-binder-snapshots.js:51` wird `key.replace('.json', '')` als Anzeigename im Confirm-Dialog genutzt. Kanonische Snapshot-IDs haben kein `.json`-Suffix (Format `ja-2026-06-02T18-00-00-000Z`). Der `.replace()` ist harmlos und fuer Legacy-Snapshots mit `.json`-Suffix noch relevant. Fuer neue Snapshots ist er toter Code, der aber keinen Schaden verursacht.

**G-10-04 (Info, kein Blocker): Falsy-Check auf `standardRestorable` ist implizit korrekt, aber fragil**

Bestaetigt Claude-Finding F-10-01. In `balance-storage.js:313` wird `if (!entry.standardRestorable)` geprueft. `toSnapshotIndexEntry()` liefert immer `standardRestorable: Boolean(source.activeProfileId)`. Falls ein kuenftiger Code-Pfad `standardRestorable` als `undefined` hinterlaesst, wuerde der Hinweis faelschlicherweise angezeigt. Ein expliziter `entry.standardRestorable === false`-Check waere robuster, ist aber aktuell kein funktionales Problem.

**G-10-05 (Info, kein Blocker): Test 3b nutzt einen fragilen DOM-Mock**

Der neue Test 3b (Zeilen 131-180) baut einen minimalen `document`-Mock mit `createElement`, `createDocumentFragment`, `append` und `appendChild`. Dieser Mock ist eng an die aktuelle DOM-Erzeugungslogik in `renderSnapshots()` gekoppelt. Jede Aenderung an der Render-Logik (z. B. Hinzufuegen von `setAttribute`, `addEventListener` oder CSS-Klassen auf Kindelementen) wuerde den Mock brechen und den Test rot machen, ohne dass ein funktionaler Fehler vorliegt. Dies ist ein akzeptiertes Wartungsrisiko fuer headless DOM-Tests.

**G-10-06 (Info/Style, kein Blocker): Verwendung von undefinierter CSS-Variable `var(--muted-text)`**

In `app/balance/balance-storage.js:317` wird `restoreHint.style.color = 'var(--muted-text)'` gesetzt. Die CSS-Variable `--muted-text` ist jedoch in `css/balance.css` nicht definiert (dort existiert nur eine CSS-Klasse `.muted-text`, welche `var(--secondary-text)` verwendet). Dadurch hat die Zuweisung keine Wirkung und die Textfarbe faellt auf den Browser-Standard fuer `<small>`-Elemente zurueck. Dies beeintraechtigt die Funktion nicht, ist aber unsauber. *Empfehlung:* Verwende `restoreHint.className = 'muted-text'` oder direkt `var(--secondary-text)`.

### Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - G-10-01: Status-Texte im Code und Hauptplan divergieren; der Plan muesste bei Gelegenheit nachgezogen werden.
  - G-10-02: HTML-Default-Text ohne `begrenzte Ablage`-Zusatz; kurzlebige visuelle Inkonsistenz.
  - G-10-04: Impliziter Falsy-Check fuer `standardRestorable` koennte bei kuenftigen Snapshot-Quellen ohne expliziten Boolean-Wert falsch-positiv ausloesen.
  - G-10-05: DOM-Mock-Fragilitaet erhoet Wartungsrisiko bei Render-Aenderungen.
  - G-10-06: Styling-Fallback fuer den Restore-Hinweis wegen undefinierter CSS-Variable `--muted-text`.
- **Pre-Mortem:** Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – die wahrscheinlichste Ursache waere ein kuenftiger Snapshot-Typ, der `standardRestorable` nicht als expliziten Boolean in `toSnapshotIndexEntry()` setzt, wodurch der Restore-Hinweis bei allen Snapshots dieses Typs faelschlicherweise angezeigt wird. Die zweitwahrscheinlichste Ursache waere eine Umstrukturierung des `<details id="snapshot-management">`-Bereichs im HTML, bei der das verschachtelte `<details>` fuer den `connectFolderBtn` entfernt wird, ohne das Binder-Wiring (Zeile 97, ohne Optional-Chaining) anzupassen – was zu einem Crash beim App-Start fuehren wuerde.

Freigegeben durch Gemini am 2026-06-04. Keine Blocker, 6 Info-Findings dokumentiert (davon 3 uebereinstimmend mit Claude-Findings).

## Entscheidungstabelle

| Punkt | Entscheidung | Begruendung | Status |
| --- | --- | --- | --- |
| Status-Texte | Internes Archiv explizit benennen | Vermeidet Verwechslung mit externem Ordner | umgesetzt |
| Export/Import | Balance-JSON-Buttons im Archivbereich sichtbar machen | Bestehendes Binder-Wiring war vorhanden, aber ohne Markup nicht erreichbar | umgesetzt |
| Ordner verbinden | Button unter Erweitert einsortieren | Alter Directory-Handle-Pfad ist nicht der kanonische Archivpfad | umgesetzt |
| Restore-Warnung | Standard-Restore-Scope konkret benennen | Aktuelle Restore-Policy bewahrt andere Profile, technische Keys und Snapshot-Historie | umgesetzt |
| Seiteneffekte | Keine Adapter-/Engine-Aenderung | Slice bleibt UI-/Text-Scope | freigegeben (Claude + Gemini) |
