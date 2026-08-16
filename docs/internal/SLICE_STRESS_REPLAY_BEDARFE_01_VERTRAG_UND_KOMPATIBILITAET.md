# Slice 1 – Stress-Replay-Bedarfe: Vertrag und Kompatibilität

**Feature-Branch:** `codex/stress-pfad-replay`  
**Rolle:** Codex-Implementierung; keine Eigenfreigabe  
**Stand:** 2026-08-16

## Ziel

Die historische Whitelist V1 bleibt unverändert interpretierbar. Die neue
Whitelist V2 ergänzt `startFloorBedarf`, `startFlexBedarf` und
`minimumFlexAnnual`, bewahrt explizite Nullwerte und prüft Mindest-Flex gegen
den effektiven Flex-Wert aus Patch und eingefrorener Baseline.

## Vertrag

- Persistierte Varianten dispatchen ausschließlich über ihre gespeicherte
  `whitelistVersion`; unbekannte Versionen werden abgewiesen.
- Neu erzeugte Varianten verwenden V2. V1 kann nur ausdrücklich für
  Legacy-Verträge erzeugt werden.
- V1-Deskriptoren, V1-Verbote und V1-Patchprojektion bleiben unverändert.
- V2-Bedarfswerte sind endliche Zahlen größer oder gleich null. Ein Patch mit
  Bedarfswerten benötigt alle drei effektiven Werte aus Patch oder Baseline.
- `minimumFlexAnnual > startFlexBedarf` erzeugt
  `STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX`; es gibt kein Clamping.
- Workspace-, Persistenz- und Exportvalidierung wenden jede bekannte
  Variante auf die eingefrorene Baseline an und prüfen den resultierenden
  `normalizedInputFingerprint`.

## Kompatibilitätsnachweis

`tests/fixtures/stress-replay-comparison-export-v1.json` ist die fest
eingecheckte V1-Golden-Fixture. Die fokussierten Tests prüfen ihren
bytegleichen JSON-Roundtrip, unveränderte verschachtelte Fingerprints,
fehlende synthetische V2-Patchblätter sowie gemischte V1-/V2-Workspaces.

## Validierung

Fokussiert ausgeführt:

- `tests/stress-replay-contract.test.mjs`
- `tests/stress-replay-variant.test.mjs`
- `tests/stress-replay-runner.test.mjs`
- `tests/stress-replay-persistence.test.mjs`
- `tests/stress-replay-export.test.mjs`
- ergänzende Kompatibilitätssonde `tests/stress-replay-comparison.test.mjs`

Alle Läufe waren grün. Die autoritative Gesamtmatrix und Freigabe verbleiben
beim Orchestrator und den Reviewrollen.

## Restrisiko

Die V1-Hülle trägt weiterhin gemischte Whitelistrevisionen. Ein nachgelagerter
Consumer, der statt `whitelistVersion` pauschal V1 annimmt, könnte V2-Felder
ignorieren; die folgenden UI-/E2E-Slices schließen diese Integrationsgrenze.
