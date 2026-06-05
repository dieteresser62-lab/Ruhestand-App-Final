# Bugfix: IndexedDB Profil-Gold-Persistenz

## Kontext

- Datum: 2026-06-05
- Arbeitskontext: Browserlauf mit IndexedDB-Persistenz
- Branch zum Zeitpunkt der Umsetzung: `codex-balance-snapshot-key-policy`
- Betroffener Nutzer-Workflow:
  1. In `depot-tranchen-manager.html` bei einem Profil `Gold-Strategie aktiv` zwischen Ja/Nein wechseln.
  2. Profil-Assets-Seite verlassen.
  3. Ein anderes Profil ansehen.
  4. Zum ersten Profil zurueckwechseln.

## Fehlerbild

Die Gold-Aktiv-Aenderung war im Browserlauf nach Profilwechseln nicht stabil sichtbar. In der generierten EXE trat der Fehler nicht auf.

## Ursache

Die EXE nutzt den Tauri-Persistenzpfad und zeigt den Fehler nicht. Der Browserlauf nutzt dagegen IndexedDB ueber die Persistenz-Fassade mit synchronem In-Memory-Cache und asynchronem, debounced Backend-Flush.

`saveProfileAssetValues()` und `saveCurrentProfileFromLocalStorage()` schrieben die Profilwerte zwar synchron in den Live-Cache und die Profil-Registry, aber beim schnellen Wechsel von der Profil-Assets-Seite zur Profiluebersicht konnte die Zielseite aus IndexedDB initialisieren, bevor der vorherige Flush abgeschlossen war. Dadurch wurde ein aelterer Registry-Stand geladen.

Nach Nutzer-Reproduktion mit mehreren Sekunden Wartezeit wurde klar: Das Flush-Race allein erklaert den Fehler nicht. Im Browser kann die Startseite beim Zurueck-Navigieren aus dem Back/Forward-Cache wiederhergestellt werden. Dann arbeitet die Profiluebersicht mit ihrem alten `PersistenceFacade`-In-Memory-Cache weiter und kann beim naechsten Profilwechsel den inzwischen in IndexedDB gespeicherten Profilstand mit alten Live-Daten ueberschreiben.

## Umsetzung

- `app/profile/profile-navigation.js`
  - Profil-Handoff-Links rufen nach dem Export einen expliziten `PersistenceFacade.flush()` auf.
  - Wenn der Flush ein Promise liefert, wird die Navigation kurz per `preventDefault()` angehalten und nach Abschluss fortgesetzt.
  - `beforeunload` und `visibilitychange` speichern weiterhin das aktuelle Profil, triggern danach aber ebenfalls einen Persistenz-Flush.
  - `pageshow` mit `event.persisted === true` loest einen Reload der Profilseite aus, damit der Persistenz-Cache nach Browser-BFCache-Rueckkehr frisch aus IndexedDB initialisiert wird.

- `app/tranches/tranchen-manager-page.js`
  - Profilwert-Aenderungen, inklusive `profileGoldAktiv`, triggern nach `saveProfileAssetValues()` und `saveCurrentProfileFromLocalStorage()` einen direkten `PersistenceFacade.flush()`.
  - Tranchen-Aenderungen triggern nach dem Profil-Snapshot ebenfalls einen direkten Flush.

- `tests/profile-navigation.test.mjs`
  - Der Handoff-Test prueft jetzt, dass ein geeigneter Link-Klick den Persistenz-Flush ausloest.
  - Der Lifecycle-Test prueft jetzt, dass `beforeunload` und `visibilitychange` neben dem Profil-Save auch flushen.
  - Der BFCache-Test prueft, dass normale `pageshow`-Events keinen Reload ausloesen, BFCache-Restores aber schon.

## Validierung

Ausgefuehrt:

```powershell
node tests\run-single.mjs tests\profile-navigation.test.mjs
node tests\run-single.mjs tests\profile-asset-values.test.mjs
node tests\run-single.mjs tests\profile-storage.test.mjs
npm test
```

Ergebnis:

- Fokussierte Profiltests erfolgreich.
- Gesamtsuite erfolgreich.
- `npm test`: 2140 Assertions, 0 Fehler.

## Review-Status

- Implementierung durch Codex erstellt.
- Finales Review & Analyse der 2. Runde durch Gemini (Antigravity) am 2026-06-05 durchgeführt.

### Analysierte Prüfdimensionen

1. **Korrektheit**:
   - **BFCache-Problem**: Wurde durch Einführung des `pageshow`-Listeners mit Abfrage auf `event.persisted` gelöst. Bei BFCache-Rückkehr (`persisted === true`) wird über `location.reload()` die Seite neu geladen, was die Persistenz sauber neu initialisiert und das Überschreiben mit veralteten In-Memory-Daten effektiv verhindert.
   - Die Unit-Tests in `tests/profile-navigation.test.mjs` (Test 4) prüfen die korrekte Unterscheidung: Normale Navigation löst keinen Reload aus, BFCache-Wiederherstellung triggert den Reload.
   - Alle 2140 Assertions der Testsuite laufen fehlerfrei durch.

2. **Vertragstreue**:
   - Die API-Verträge und Signaturen von `initProfileIndexLifecycle` und `initProfileSubpageLifecycle` bleiben abwärtskompatibel.
   - Die Option `reload` in `installProfileBfcacheRefresh` ermöglicht eine saubere Kapselung und Testbarkeit ohne tatsächliche Browser-Navigationen im Testlauf.

3. **Fehlerbehandlung**:
   - Die Kapselung in `installProfileBfcacheRefresh` prüft das Vorhandensein von `win` und `win.addEventListener`, um Abstürze in Nicht-Browser-Kontexten (z. B. Node.js-Testumgebung) sicher zu vermeiden.
   - `event?.persisted` fängt Fälle ab, in denen das Event-Objekt unvollständig oder undefiniert übergeben wird.

4. **Seiteneffekte**:
   - **Kurzes Flackern beim Zurück-Navigieren**: Beim Klick auf den "Zurück"-Button im Browser führt der erzwungene Reload zu einem kurzen Flackern der Profilseite, da die Seite neu aufgebaut wird. Dies ist für den Datenkonsistenz-Garanten im Multi-Page-IndexedDB-Szenario ein absolut vertretbarer Trade-Off.
   - **Modifier-Klicks (Ctrl/Cmd/Shift + Klick)**: Bleiben (wie in Runde 1 analysiert) abgefangen. Dies ist aufgrund der `window.name`-Bindung für Handoffs verschmerzbar, da neue Tabs ohnehin einen leeren `window.name`-Kontext erzeugen würden.

5. **Was könnte brechen?**:
   - Sollten Browser-Engines in zukünftigen Updates fälschlicherweise `event.persisted` auch bei normalen Reloads auf `true` setzen, könnte eine Endlosschleife entstehen. Dies ist jedoch extrem unwahrscheinlich, da dies den HTML5-Spezifikationen widerspräche.
   - Falls ein Benutzer Formularwerte auf der Profilseite editiert, aber nicht speichert, und per Zurück-Button zurückkehrt, verwirft der Reload alle ungespeicherten Formularzustände. Da Navigationen jedoch ohnehin über Save-Hooks gesichert werden, ist dies unkritisch.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Kurzes Neuaufbauen der Seite (Flackern) bei der Rückwärtsnavigation im Browser.
  - Modifier-Klicks (Ctrl/Cmd/Shift + Klick) auf Handoff-Links führen zur Navigation im selben Tab.
- Pre-Mortem:
  - Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
    * "Ein exotischer Browser oder ein sehr restriktives Browser-Sicherheitsupdate unterdrückt das `pageshow`-Event bei BFCache-Restores oder führt `location.reload()` asynchron so verzögert aus, dass der Benutzer in der Zwischenzeit eine Interaktion auf veralteten UI-Daten tätigen kann, welche IndexedDB mit altem Zustand überschreibt."
