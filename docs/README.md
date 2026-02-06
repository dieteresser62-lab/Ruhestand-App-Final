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
  - Dateien:
    - `docs/internal/PROFILVERBUND_BALANCE_PROGRESS.md`
    - `docs/internal/PROFILVERBUND_BALANCE_PROMPT.md`
    - `docs/internal/PROFILVERBUND_BALANCE_SPEC.md`
- `tests/`
  - Testdokumentation (`tests/README.md`)
- `engine/`
  - Engine-spezifische Doku (`engine/README.md`)

## Root-Dokumente (bewusst beibehalten)

- `README.md` (Einstieg/Navigation)
- `QUICKSTART.md` (Schnellstart)
- `TECHNICAL.md` (technische Referenz)
- `ARCHITEKTUR_UND_FACHKONZEPT.md` (fachlich-technische Vertiefung)
- `BALANCE_MODULES_README.md` und `SIMULATOR_MODULES_README.md` (Modulreferenz)

Diese Root-Dateien bleiben vorerst erhalten, damit bestehende Links und externe Referenzen stabil bleiben.

## Hinweis zur Stabilitaet

- Die zentrale Einstiegsdokumentation bleibt im Projekt-Root (`README.md`, `QUICKSTART.md`, `TECHNICAL.md`).
- Guided Tours haben einen Root-Weiterleitungsstummel unter `GUIDED_TOURS.md`, der auf `docs/guides/GUIDED_TOURS.md` zeigt.
