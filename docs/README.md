# Dokumentationsstruktur

Diese Datei dient als Uebersicht und Bestandsaufnahme fuer die Dokumentation.

## Ordner

- `docs/guides/`
  - Nutzergefuehrte Schritt-fuer-Schritt-Anleitungen.
  - Aktuell: `docs/guides/GUIDED_TOURS.md`
- `docs/reference/`
  - Stabile Fach- und Technikreferenzen.
  - Dateien:
    - `docs/reference/AUTO_OPTIMIZE_DETAILS.md`
    - `docs/reference/PROFILVERBUND_FEATURES.md`
    - `docs/reference/WORKFLOW_PSEUDOCODE.md`
- `docs/internal/`
  - Arbeitsdokumente und Entwurfsartefakte.
  - Archiv-Ordner:
    - `docs/internal/archive/2026-dynamic-flex/` (Dynamic-Flex Umsetzung: Plan/Tickets/Rollout/Baseline/CAPE-Contract)
    - `docs/internal/archive/2025-profilverbund-balance/` (Profilverbund-Balance Umsetzung: Spec/Prompt/Progress)
    - `docs/internal/archive/2025-webworkers-rollout/` (WebWorker-Rollout-Plan)
    - `docs/internal/archive/2025-adapter-elimination/` (Adapter-Ablösung Report)
    - `docs/internal/archive/2025-gemini-notes/` (historische Notizen)
- `tests/`
  - Testdokumentation (`tests/README.md`)
- `engine/`
  - Engine-spezifische Doku (`engine/README.md`)

## Root-Dokumente (bewusst beibehalten)

- `README.md` (Einstieg/Navigation)
- `Handbuch.html` (interaktive Nutzerdokumentation)
- `CHANGELOG.md` (Release-Historie)
- `QUICKSTART.md` (Schnellstart)
- `LICENSE.md` (Lizenz)

## Referenzdokumente (unter `docs/reference/`)

- `docs/reference/TECHNICAL.md` (technische Referenz)
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` (fachlich-technische Vertiefung)
- `docs/reference/BALANCE_MODULES_README.md` und `docs/reference/SIMULATOR_MODULES_README.md` (Modulreferenz)

Diese Root-Dateien bleiben vorerst erhalten, damit bestehende Links und externe Referenzen stabil bleiben.

## Hinweis zur Stabilitaet

- Die zentrale Einstiegsdokumentation bleibt im Projekt-Root (`README.md`, `QUICKSTART.md`, `LICENSE.md`).
- Guided Tours liegen unter `docs/guides/GUIDED_TOURS.md`.
- Link-Check Kernpfade: `README.md` verlinkt auf `docs/README.md` und `Handbuch.html`; `Handbuch.html` verweist auf `README.md` und `CHANGELOG.md`.
