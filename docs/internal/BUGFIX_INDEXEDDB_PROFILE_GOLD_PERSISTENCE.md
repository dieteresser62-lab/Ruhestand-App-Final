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

Die EXE nutzt den Tauri-Persistenzpfad, der beim relevanten Workflow ausreichend frueh schreibt. Der Browserlauf nutzt dagegen IndexedDB ueber die Persistenz-Fassade mit synchronem In-Memory-Cache und asynchronem, debounced Backend-Flush.

`saveProfileAssetValues()` und `saveCurrentProfileFromLocalStorage()` schrieben die Profilwerte zwar synchron in den Live-Cache und die Profil-Registry, aber beim schnellen Wechsel von der Profil-Assets-Seite zur Profiluebersicht konnte die Zielseite aus IndexedDB initialisieren, bevor der vorherige Flush abgeschlossen war. Dadurch wurde ein aelterer Registry-Stand geladen.

## Umsetzung

- `app/profile/profile-navigation.js`
  - Profil-Handoff-Links rufen nach dem Export einen expliziten `PersistenceFacade.flush()` auf.
  - Wenn der Flush ein Promise liefert, wird die Navigation kurz per `preventDefault()` angehalten und nach Abschluss fortgesetzt.
  - `beforeunload` und `visibilitychange` speichern weiterhin das aktuelle Profil, triggern danach aber ebenfalls einen Persistenz-Flush.

- `app/tranches/tranchen-manager-page.js`
  - Profilwert-Aenderungen, inklusive `profileGoldAktiv`, triggern nach `saveProfileAssetValues()` und `saveCurrentProfileFromLocalStorage()` einen direkten `PersistenceFacade.flush()`.
  - Tranchen-Aenderungen triggern nach dem Profil-Snapshot ebenfalls einen direkten Flush.

- `tests/profile-navigation.test.mjs`
  - Der Handoff-Test prueft jetzt, dass ein geeigneter Link-Klick den Persistenz-Flush ausloest.
  - Der Lifecycle-Test prueft jetzt, dass `beforeunload` und `visibilitychange` neben dem Profil-Save auch flushen.

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
- `npm test`: 2136 Assertions, 0 Fehler.

## Review-Status

- Implementierung durch Codex erstellt.
- Finales Review & Analyse durch Gemini (Antigravity) am 2026-06-05 durchgeführt.

### Analysierte Prüfdimensionen

1. **Korrektheit**:
   - Die Implementierung behebt die Race Condition beim in-app Handoff, indem `event.preventDefault()` genutzt wird, um die Seitennavigation zu verzögern, bis der asynchrone IndexedDB-Flush abgeschlossen ist.
   - Der synchrone Fallback bei unvollständig initialisierter Persistenz wurde durch Prüfung von `typeof flushResult.finally === 'function'` korrekt gelöst.
   - Alle Tests in `tests/profile-navigation.test.mjs` wurden aktualisiert und laufen erfolgreich durch (insgesamt 2136 Assertions in der gesamten Testsuite).

2. **Vertragstreue**:
   - Der Contract von `PersistenceFacade.flush` wird eingehalten.
   - Die Signatur von `bindProfileNavigationHandoff` und `installProfilePersistenceHooks` bleibt abwärtskompatibel.

3. **Fehlerbehandlung**:
   - `runPersistenceFlush` fängt sowohl synchrone Ausnahmen als auch asynchrone Promise-Rejections von `flusher()` ab und protokolliert sie, ohne dass unhandled rejections entstehen.
   - Tritt beim Flush ein Fehler auf, wird die Navigation im `.finally()`-Block dennoch fortgesetzt, wodurch verhindert wird, dass der Benutzer auf der Seite gefangen bleibt.

4. **Seiteneffekte**:
   - Durch die Verzögerung der Navigation via `finally()` entsteht eine minimale, kaum spürbare Latenz (Datenbankschreibzeit), die für die Konsistenz notwendig ist.
   - **Modifier-Klicks (Ctrl/Cmd/Shift + Klick)**: Da der Event-Listener `event.preventDefault()` unabhängig von gedrückten Tasten ausführt, werden Modifier-Klicks fälschlicherweise abgefangen und führen zur Navigation im selben Tab statt zum Öffnen eines neuen Tabs. Dies ist ein Usability-Seiteneffekt; da in-app Handoff-Links ohnehin auf `window.name` basieren (welcher nicht tab-übergreifend geteilt wird) und ein neuer Tab somit ohne den aktuellen In-Memory-Zustand gestartet worden wäre, ist dies kein funktionaler Regressionsfehler. Dennoch sollte dieses Verhalten perspektivisch verfeinert werden.

5. **Was könnte brechen?**:
   - Wenn das IndexedDB-Schreiben blockiert ist (z. B. durch vollen Speicher oder Browser-Sperren), kann die Navigation spürbar verzögert werden, da der Flush erst fehlschlagen oder ablaufen muss, bevor `.finally()` feuert.
   - Während `beforeunload` können manche Browser die asynchrone IndexedDB-Transaktion abbrechen, was das verbleibende Restrisiko beim Schließen des Tabs darstellt.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Bei hartem Schließen des Browsers oder des Tabs (z. B. Absturz oder schnelles Schließen) wird der asynchrone Flush in `beforeunload` evtl. vom Browser abgebrochen (bekanntes Browser-Lifecycle-Limit).
  - Modifier-Klicks (Ctrl/Cmd/Shift + Klick) auf Handoff-Links werden abgefangen und navigieren im selben Tab.
- Pre-Mortem:
  - Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
    * "Ein Benutzer versucht, die App über Tastatur-Shortcuts (z. B. Ctrl + Klick auf einen Profillink) in einem neuen Tab zu öffnen, um Daten zu vergleichen. Das Abfangen durch `preventDefault()` verhindert das Öffnen im neuen Tab und navigiert im aktuellen Tab, was zu Frustration führt. Alternativ führt eine temporäre Blockade von IndexedDB zu einer spürbaren Navigationsverzögerung beim Klick auf Handoff-Links."
