# Changelog

## 2026-02-15

### Neu
- Verlustverrechnungstopf als jahresübergreifender Zustand (`lastState.taxState.lossCarry`) in Engine, Balance und Simulator integriert.
- Jahres-Settlement als zentrale Steuerwahrheit eingeführt (`engine/tax-settlement.mjs`).
- Simulator-Notfallverkäufe in Gesamt-Settlement-Recompute eingebunden.
- UI-Erweiterungen:
  - Balance zeigt finale Settlement-Steuer sowie Aufschlüsselung (vor/nach Verlusttopf, Ersparnis).
  - Simulator-Dashboard zeigt `Ø Steuerersparnis Verlusttopf`.

### Technisch
- `action.steuer` ist nun die finale Settlement-Steuer (kann von `sum(quellen[].steuer)` abweichen).
- Raw-Aggregate (`taxRawAggregate`) werden für Core-/Simulator-Settlement explizit geführt.
- Build-Härtung: `build-engine.mjs` unterstützt Strict-Mode (`ENGINE_BUILD_STRICT=1` oder `CI=true`), der ohne `esbuild` fehlschlägt.
- Dokumentation vollständig nachgezogen (inkl. `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`, `docs/reference/WORKFLOW_PSEUDOCODE.md`, `tests/README.md`, `Handbuch.html`, `README.md`, `docs/README.md`).

### Tests
- Neue/erweiterte Tests für Settlement, Core-Integration, Simulator-Recompute, MC-Determinismus und UI-Rendering.
