# Changelog

## 2026-08-17

### Geaendert
- Der Monte-Carlo-Bereich ist als Ergebnis-Cockpit neu geordnet: kompaktes Setup, sichtbarer Laufkopf, fuenf tastaturbedienbare Ergebnisansichten und ein dreistufiges Stresspfad-Replay.
- Szenarioauswahl und Replay liegen in einem gemeinsamen, eindeutigen Arbeitsbereich; programmatische Fokuswechsel aktivieren zuerst die sichtbare Zielansicht.
- Der Replay-Vergleich bietet umschaltbare Kennzahlen-, Delta- und Jahresansichten sowie je Alternative hoechstens eine priorisierte Kernaussage. Diese Darstellung ist weder Variantenranking noch Finanzempfehlung.
- Responsive Layouts und die Druckansicht zeigen Setup, Ergebnisbereiche und Replay-Vergleich ohne fachliche Aenderung an Monte-Carlo-, Engine-, Persistenz- oder Exportvertraegen.

### Tests
- Fokussierte Cockpit-Contracttests und erweiterte Browser-Smokes decken ARIA-Tabs, Tastatur/Fokus, asynchrone Replay-Wechsel, responsive Viewports und Print-Emulation ab.

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
