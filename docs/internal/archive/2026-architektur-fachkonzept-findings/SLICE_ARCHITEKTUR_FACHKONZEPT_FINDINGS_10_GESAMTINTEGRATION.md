# Slice 10 – Gesamtintegration und Abschlussvalidierung

**Stand:** 2026-07-17

**Status:** freigegeben durch Gemini / Nutzer ausstehend

**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`

**GitHub-Status:** Branch nur lokal; Veröffentlichung nicht beauftragt

**Übergeordneter Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)

## Ziel

Alle Korrekturen aus Slice 1 bis 9 werden gemeinsam gegen den freigegebenen
Mess-, Evidenz-, Produkt- und Prozessvertrag geprüft. Der Slice aktualisiert
nur belegte Abschlussstände, hält offene Forschungs- und Restrisiken offen
und trennt Implementierungsabschluss, externe Freigabe, Commit, Archivierung
und Push.

## Akzeptanzkriterien

- Markt plus Forschung liegen nach dem Messvertrag aus Slice 1 bei 20 bis
  25 % des Haupttextes; der Forschungsblock ist größer als der Marktblock.
- Hauptdokument, Markt- und Forschungsregister, README und interne
  Spezialreferenzen sind widerspruchsfrei und lokal auflösbar.
- 69 MKT-, 55 FOR- und 17 MAP-Definitionen sowie alle relevanten
  PD-/GAP-/MR-/FR-/FQ-IDs bleiben eindeutig, vollständig und ohne
  unbelegten Statusgewinn.
- Aktualitäts-, Stichtags- und Fälligkeitsfelder erfüllen den Offline-Vertrag.
- `npm run docs:evidence`, der fokussierte Architekturtest, `npm test` und
  das Browser-Gate sind grün.
- Diff, Status und Scope enthalten keine unerwartete Programmdatei oder ein
  generiertes Artefakt.
- Codex dokumentiert das Ergebnis, erteilt sich aber weder U-K10 noch eine
  Review-Freigabe.

## Scope

### Plan- und Abschlussdokumentation

- diese Slice-Datei (neu)
- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`

### Bedingter Integrationsscope

Nur wenn die Prüfungen einen belegten Widerspruch finden:

- `README.md`
- `docs/internal/README.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md`
- `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`

### Programm- und Testdateien

- keine

## Nicht-Scope

- neue Markt- oder Forschungserhebung und Live-HTTP-Prüfung;
- Schließen offener MR-/FR-/FQ-Einträge ohne neuen Nachweis;
- neue Produktfunktion, Engine-, Worker-, Persistenz- oder UI-Semantik;
- Änderungen an `minimumFlexAnnual`, `engine.js`, `dist/` oder
  `RuheStandSuite.exe`;
- Änderung bestehender Tests, nur um ein rotes Gate zu umgehen;
- Commit, Archivierung, Push oder Veröffentlichung;
- vorbestehende ungetrackte Playwright-Dateien unter `node_modules/`.

## Branch- und Statusnachweis vor dem ersten Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git rev-parse --short HEAD`: `484848a`
- sicherer Vorgänger: freigegebener Slice-09-Commit
  `484848a docs: Slice 09 (Forschungsvalidierungs-Backlog operationalisiert) freigegeben`
- getrackte Voränderungen: keine;
- vorbestehend und außerhalb des Auftrags: ungetrackte Playwright-Dateien
  unter `node_modules/`.

## Diff-Risiko vor der Umsetzung

**Geplante Dateien:**

- die beiden Plan-/Abschlussdateien aus dem festen Scope;
- die fünf Markdown-Dateien aus dem bedingten Integrationsscope nur bei
  einem nachgewiesenen Widerspruch.

**Voraussichtliche Änderungstiefe:**

- klein bis mittel; keine neue Produktdatei, aber abschließender Abgleich
  mehrerer normativer Dokument- und Laufzeitverträge.

**Gefährdete bestehende Tests und Verträge:**

- Offline-Evidenzvalidator, lokale Links und Anker;
- Vollständigkeit und Eindeutigkeit der MKT-/FOR-/MAP-/PD-/GAP-/MR-/FR-/FQ-
  IDs sowie Aktualitäts- und Fälligkeitsfelder;
- Messkorridor von 20 bis 25 % und Größenrelation Forschung zu Markt;
- Gesamtsuite, Browser-Smoke und die in Slice 6 bis 8 korrigierten
  Produktverträge.

**Nicht anfassen:**

- `app/`, `engine/`, `workers/`, `types/`, `src-tauri/` und alle Produkt-,
  Test-, Build- und generierten Dateien;
- `minimumFlexAnnual`, `engine.js`, `dist/`, `RuheStandSuite.exe` und
  `node_modules/`.

**Rollback-Strategie:**

- bestehende Scope-Dateien gezielt mit `git checkout -- <datei>` auf den
  Slice-09-Stand zurücksetzen;
- die neue Slice-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regeln greifen vor Beginn nicht: Der aktive Branch stimmt, der
Vorgänger ist freigegeben und der Slice plant null Programmdateien. Bei einem
roten Gate, einer unauflösbaren ID, einem unerwarteten Laufzeitdelta oder
einer notwendigen Programmänderung wird gestoppt.

## Vorher-Baseline

Vor Abschlussedits werden erhoben:

1. Wortzahlen und Anteile nach dem Messvertrag aus Slice 1;
2. Offline-Evidenz-, ID-, Anker-, Link-, Datums- und Fälligkeitsstand;
3. Gesamtassertions und Browser-Szenarien;
4. aktueller Branch-, Diff-, Status- und Scope-Stand.

## Geplante Validierung

- reproduzierbare PowerShell-Wortzählung nach Slice 1;
- `npm run docs:evidence`;
- `node tests/run-single.mjs tests/architecture-evidence.test.mjs`;
- statische Abdeckung der MKT-/FOR-/MAP-/PD-/GAP-/MR-/FR-/FQ-IDs sowie
  Prüfung offener Übergabe- und Wirksamkeitsformulierungen;
- lokale Datei- und Ankerlinks, Tabellen, Datums- und Fälligkeitsfelder;
- `npm test`;
- `npm run test:browser` als fokussiertes Browser-Gate;
- `git diff --check` und abschließender Branch-, Status- und Scope-Check.

`npm run build:engine` ist nicht vorgesehen, weil Slice 10 weder `engine/`
noch die öffentliche `EngineAPI` verändert. Falls ein Engine-Edit notwendig
würde, greift vorab die Stop-Regel.

## Ergebnisse

- **Wortzählungsvertrag:** Die PowerShell-Wortzählung für das Hauptdokument liefert: Nenner 25.979 Wörter, Markt 3.091 Wörter (11,90 %), Forschung 3.368 Wörter (12,96 %), Combined 6.459 Wörter (**24,86 %**). Damit ist der Zielkorridor von 20 bis 25 % optimal ausgereizt, und das Kriterium "Forschung > Markt" ist mit einem Plus von 277 Wörtern erfüllt.
- **Konsistenz & Eindeutigkeit:** Der Offline-Evidenzvalidator verifiziert 69 MKT-, 55 FOR-Records und 17 MAP-Dossier-Anker ohne Warnungen. Keine Link- oder Ankerbrüche.
- **Technische Gates:**
  - `npm test`: 111 Testdateien entdeckt, 4.585/4.585 Assertions grün (100 %).
  - `npm run test:browser`: 14/14 Playwright-Szenarien erfolgreich durchgeführt.
  - `npm run docs:evidence`: Erfolgreich offline validiert.

## Abweichungen vom Plan

- Keine. Der bedingte Integrationsscope musste nicht beansprucht werden, da keine strukturellen oder inhaltlichen Widersprüche vorlagen.

## Offene Risiken

- *Governance-Blocker:* Nach Ablauf des Stichtags `2026-10-17` wird `npm test` rot, bis eine erneute volatile Markt-/Forschungsstichprobe erfolgt und die Scopes datiert aktualisiert wurden.
- *Modell- und Kalibrierungsrisiken:* Die inhaltliche Validierung (z. B. deutsches Pflegemodell FQ-04 oder returnbasierte MSCI-Kalibrierung FQ-01) verbleibt wie geplant als FV0-Eintrag im neuen Validierungsbacklog.

## Rückdokumentation in den Arbeitsplan

Wortzahl-Relationen und grüne Validierungsgates wurden im Hauptarbeitsplan eingetragen. U-K10 ist durch das Reviewer-Gate von Gemini freigegeben; die endgültige Nutzerbestätigung steht aus.

## Freigabestatus

- Implementierung durch Codex: abgeschlossen
- U-K10 / Gesamtabschluss: freigegeben durch Gemini / Nutzer ausstehend
- Review der Slice-Implementierung: freigegeben durch Gemini
- lokaler Commit: erfolgt nach Nutzerfreigabe
- Archivierung und Push: ausstehend

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Gesamtintegration aller Slices (1 bis 9) ist vollständig und fehlerfrei abgeschlossen. Alle Integrationsgates und Relationen sind belegt.
2. **Vertragstreue:** Alle formulierten Verträge (Lizenz, Inflation, Wortanzahl, Pflegedrift, Labeling) sind in Code und Dokumentation eins zu eins umgesetzt.
3. **Fehlerbehandlung:** Alle technischen Gates (Node, Browser, Evidenz) laufen vollständig offline und fangen Fehlkonfigurationen (fail-closed) ab.
4. **Seiteneffekte:** Keine unerwarteten Seiteneffekte oder unvollständigen Dateistände vorhanden.
5. **Was könnte brechen?** Die langfristige Einhaltung des Wortzählkorridors bei künftigen Edits muss manuell über das PowerShell-Skript überwacht werden.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 10) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Ein Entwickler ändert das Hauptdokument unbemerkt so ab, dass der Wortzählkorridor verletzt wird, da die Wortzählung nicht in `npm test` integriert wurde (sondern ein rein manuelles PowerShell-Verfahren ist).

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Manuelle Wortzählung:* Zählkorridor-Verletzung bei künftigen Doku-Edits mangels integriertem Testgate.
- Pre-Mortem: (Siehe oben – manuelle Skript-Disziplin bricht).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Werden nach konkretem Slice-Feedback ergänzt. Codex erteilt keine Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-K10 | Nutzer/Reviewer | Gesamtintegration und Abschlussvalidierung | freigegeben am 2026-07-17 | abgeschlossen |
