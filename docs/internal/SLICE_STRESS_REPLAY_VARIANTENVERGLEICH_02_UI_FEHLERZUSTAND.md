# Slice 2 – Dauerhafter Vergleichsfehler und wahrheitsgemäße Aufrufer

**Stand:** 2026-08-17

**Feature-Branch:** `codex/stress-pfad-replay`

**Rolle:** Codex-Implementierung; keine Eigenfreigabe

## Vorabprüfung

- Branch vor Coding: `codex/stress-pfad-replay` (entspricht dem Zielbranch).
- Status vor Coding: ausschließlich die vom Orchestrator für Slice 2
  angelegten Dokumente; keine unerwartete Änderung außerhalb der Slice-
  Allowlist.
- Diff-Risiko: mittel. Kritisch waren vor allem nachgelagerte Erfolgsmeldungen,
  die einen gefangenen Rechenfehler überschreiben konnten, sowie die Trennung
  eines erfolgreichen Persistenzvorgangs von einer fehlgeschlagenen
  Vergleichsrechnung.
- Scope: ausschließlich die für Slice 2 freigegebenen Produkt-, Test- und
  Dokumentationspfade. Verwaltete Auditblöcke wurden nicht verändert.

## Umsetzung

- Der Controller führt für den Variantenvergleich einen expliziten Zustand
  `idle`, `success` oder `error`. Nur ein Ergebnisobjekt mit einem nichtleeren
  Variantenfeld gilt als Erfolg; `null`, leere oder unbrauchbare Rückgaben
  werden mit `STRESS_REPLAY_COMPARISON_EMPTY` fail-closed behandelt.
- Fehlerdiagnosen werden auf einen stabilen Code, eine kontrollzeichenfreie
  Meldung und maximal 500 Zeichen begrenzt. Nicht vertrauenswürdige Codes
  werden durch `STRESS_REPLAY_COMPARISON_FAILED` ersetzt.
- Der Renderer zeigt den Fehlerzustand dauerhaft mit `role="alert"`, Fehlercode
  und HTML-escaped Meldung. Nur `idle` zeigt den neutralen Text „Noch kein
  Variantenvergleich berechnet.“; ein späterer erfolgreicher Vergleich
  ersetzt den Fehlerzustand.
- Direkter Recompute und der registrierte DOM-Click geben bei Rechenfehler
  `null` zurück beziehungsweise melden keinen Erfolg. Der explizite Click
  fokussiert die Vergleichsregion mit dem Alert; ein direkter Recompute ohne
  Fokusoption fokussiert den fehlerhaften Live-Status.
- Hinzufügen, Entfernen, Fixieren und Importieren bewahren ihren tatsächlichen
  Mutationserfolg und ihre bisherigen erfolgreichen Rückgabewerte. Wenn nur
  die anschließende Vergleichsrechnung scheitert, nennen die Live-Meldungen
  beide Tatsachen und bleiben als Fehler markiert.
- Initialisierung überschreibt einen Rechenfehler nicht mehr mit „geladen“.
  Bewusstes Verwerfen sowie ein ersetzender Import oder eine neue Fixierung
  setzen den zugehörigen Vergleichszustand passend zum neuen Arbeitsstand.

## Fokussierte Validierung

- `tests/stress-replay-ui.test.mjs`: 131/131 Assertions erfolgreich.
- `tests/stress-replay-renderer.test.mjs`: 46/46 Assertions erfolgreich.
- `tests/browser-smoke.test.mjs`: um einen echten DOM-Click mit kontrolliert
  werfender Rechenfunktion erweitert. Der lokale Start via
  `npm run test:browser` erreichte die Suite nicht, weil das Playwright-
  Chromium-Binary im Agent-Cache fehlt. Die autoritative Browserausführung
  bleibt entsprechend dem Orchestrator-Vertrag dessen Validierungsmatrix
  vorbehalten.
- `git diff --check`: ohne Befund.

Die Tests decken Throw und leere Rückgabe, Fehlerpersistenz und Erholung,
sanitizierte/escaped Diagnosen, Initialisierung, Fixierung, Import,
Hinzufügen, Entfernen, direkten Recompute und den registrierten Browser-DOM-
Click ab. Die vollständige Repository-Matrix wurde absichtlich nicht im
Implementer-Prozess ausgeführt.

## Abweichungen und offene Risiken

Keine fachliche Abweichung vom freigegebenen Slice-Plan. Das größte
Restrisiko liegt in künftigen Aufrufern, die `computeComparison()` umgehen
oder nach dessen Rückgabe wieder eine pauschale Erfolgsmeldung setzen. Die
aktuellen sieben Aufrufklassen und der echte DOM-Click sind deshalb explizit
abgesichert.

Die offenen Beobachtungen `C-02` und `C-03` betreffen den für Slice 3
freigegebenen Dokumentationsscope und bleiben dort umzusetzen.

Codex erteilt keine Freigabe. Slice 2 ist zur externen Validierung und zum
Review durch Claude und Antigravity bereit.
