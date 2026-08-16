# Slice 2 – Stress-Replay-Bedarfe: Editor und Expertenfelder

**Feature-Branch:** `codex/stress-pfad-replay`  
**Rolle:** Codex-Implementierung; keine Eigenfreigabe  
**Stand:** 2026-08-16

## Ziel

Der Varianteneditor zeigt im Hauptworkflow ausschließlich Variantenname,
Floor-Bedarf, Flex-Bedarf und Mindest-Flex. Die unverändert verfügbaren 17
Strategieparameter liegen in einem initial geschlossenen Expertenbereich.

## UI-Vertrag

- Die drei Bedarfsfelder verwenden
  `strategy.startFloorBedarf`, `strategy.startFlexBedarf` und
  `strategy.minimumFlexAnnual`, beginnen leer und akzeptieren Zahlen ab null.
- Ein leerer Controlwert erzeugt kein Patchblatt; die Zeichenfolge `0` wird
  als numerische Null an die V2-Vorschau weitergegeben.
- Separate Baselineoutputs verwenden ausschließlich für diese drei Felder
  das Formatmetadatum `currency-eur`. Auch null wird als Eurobetrag und nicht
  als fehlender Wert angezeigt.
- Der native Button `stressReplayExpertToggle` steuert über `aria-controls`
  den Container `stressReplayExpertFields`. `hidden` und `aria-expanded`
  bleiben synchron; der Zustand ist rein DOM-lokal.
- Öffnen und Schließen setzt keine Controls zurück, erzeugt keine Vorschau
  und ändert die Add-Button-Materialität nicht. Ein erfolgreicher Varianten-
  Add setzt die Formfelder zurück, lässt den Anzeigezustand aber unberührt.
- Die bestehenden bedingten Decumulation- und Langlebigkeitsfelder bleiben
  mit ihren bisherigen Pfaden und `data-active-when`-Regeln erhalten.

## Fehlerabbildung

`STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX` wird ohne automatische Korrektur als
deutschsprachige Meldung dargestellt. Die Meldung nennt Mindest-Flex und den
effektiven Flex-Bedarf mit ihren effektiven Eurobeträgen und erreicht sowohl
Patchvorschau als auch Statusregion.

## Validierung

Fokussiert ausgeführt:

- `tests/stress-replay-ui.test.mjs`: PASS (88/88)
- `tests/stress-replay-renderer.test.mjs`: PASS (41/41)
- `git diff --check`: PASS

Der geänderte `tests/browser-smoke.test.mjs` konnte in der Agentensandbox
nicht starten, weil das Binden des lokalen Testservers an `127.0.0.1` mit
`EPERM` blockiert wurde. Der autoritative Orchestratorlauf bleibt ausstehend.

## Restrisiko

Die echte Browserprüfung von Enter-/Leertastenaktivierung, Sichtbarkeit und
CSS hängt vom Orchestratorlauf ab. Codex erteilt keine Eigenfreigabe.
