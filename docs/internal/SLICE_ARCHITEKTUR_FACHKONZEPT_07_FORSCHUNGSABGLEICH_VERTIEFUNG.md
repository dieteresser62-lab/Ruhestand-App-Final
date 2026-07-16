# Slice 07: Wissenschaftliche Tiefeneinordnung

**Stand:** 2026-07-15  
**Status:** freigegeben  
**Feature-Branch:** `codex/architektur-fachkonzept-doku`  
**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push nicht beauftragt  
**Übergeordneter Plan:** `ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`  
**Zieldokument:** `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`

## Auftrag und Freigabegrundlage

Der Nutzer hat Slice 07 am 2026-07-15 mit „Implementiere Slice 07“ separat
beauftragt. U-06 für Quellenkorpus und Evidenztaxonomie ist erteilt. Für diese
reine Dokumentationsarbeit gilt weiterhin die im Arbeitsplan festgehaltene
Prozessentscheidung: Der Nutzer übernimmt die Zwischen- und
Abschlussfreigaben; Codex implementiert, erteilt aber keine Eigenfreigabe und
erstellt keinen Git-Commit.

## Ziel

Die in Slice 06 vorbereiteten 17 Mechanismus-Mappings werden zu einem
wissenschaftlichen Fachabgleich vertieft. Für jeden Mechanismus werden
Forschungsgrundlage, tatsächliche Suite-Umsetzung, Abweichung, Evidenzstatus,
interne Validierung und Restrisiko getrennt ausgewiesen. Literaturbefunde
dürfen weder als Suite-Messergebnisse noch interne Tests als empirischer
Wirksamkeitsnachweis erscheinen.

## Akzeptanzkriterien

- Jeder zentrale Mechanismus ist als etabliert, adaptiert, heuristisch oder
  experimentell einordenbar.
- Keine Literaturzahl erscheint ohne klaren Urheber und Kontext als
  Suite-Ergebnis.
- Validierungsnachweise werden nicht mit empirischer Güte gleichgesetzt.
- Übertragbarkeits- und Modellgrenzen sind sichtbar.
- Safe Withdrawal, Bootstrap/Regime/Tail Risk, CAPE, Backtest/Optimierung,
  Mortalität, Pflege, Asset-/Bucket-Annahmen und Ergebnisgrößen werden mit den
  im Plan geforderten Risikodimensionen behandelt.
- Ein konsolidiertes Modellrisiko- und Forschungsfragenregister ist vorhanden.
- Der Nutzer hat die wissenschaftliche Einordnung als U-07 freigegeben.

## Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-Datei
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`
- ausschließlich die in Slice 06 freigegebenen Quellenrecords und die lokale
  Source of Truth als Belegbasis

## Nicht-Scope

- Programm-, Test-, Build- oder generierte Dateien;
- Änderungen an Engine-Semantik, Defaults oder Produktfunktionen;
- neue eigene Backtests, Kalibrierungen oder Wirksamkeitsbehauptungen;
- Rechts-, Steuer-, Anlage-, Versicherungs- oder Pflegeberatung;
- redaktionelle Gesamtintegration und Archivierung aus Slice 08.

## Branch- und Git-Status vor Start

Ausgeführt am 2026-07-15 vor dem ersten Slice-07-Edit:

- `git branch --show-current`
  - Ergebnis: `codex/architektur-fachkonzept-doku`
- `git status --short`
  - bereits geändert aus den freigegebenen Slices 01 bis 06:
    - `README.md`
    - `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
    - `docs/reference/DATA_SOURCES.md`
    - `docs/reference/SIMULATOR_MODULES_README.md`
    - `docs/reference/TECHNICAL.md`
    - `engine/README.md`
    - übergeordneter Arbeitsplan und Slice-Dateien 01 bis 06 untracked
  - vorbestehend und nicht Teil des Auftrags:
    - ungetrackte Playwright-Dateien unter `node_modules`

Der aktive Branch entspricht dem im Arbeitsplan festgelegten Feature-Branch.
Die bestehenden Dokumentationsänderungen werden fortgeführt; die
Playwright-Dateien bleiben unangetastet.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_07_FORSCHUNGSABGLEICH_VERTIEFUNG.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`

**Voraussichtliche Änderungstiefe:**

- mittel; umfangreicher, aber rein redaktioneller Mechanismusabgleich auf
  Grundlage des freigegebenen Quellenkorpus

**Gefährdete bestehende Tests:**

- keine Laufzeittests;
- redaktionelles Risiko bei Quellen-IDs, Tabellenkonsistenz, internen
  Verweisen, Evidenz-/Übertragbarkeitskennzeichen und Markdown-Formatierung

**Nicht anfassen:**

- alle Programm-, Test-, Build- und generierten Dateien;
- bestehende Slice-01-bis-06-Aussagen außer zwingenden Querverweisen;
- `node_modules`, `engine.js`, `dist` und `RuheStandSuite.exe`;
- externe Produktdaten aus dem Marktvergleich.

**Rollback-Strategie:**

- Änderungen am Hauptdokument und Arbeitsplan gezielt dateibezogen gegen den
  Stand vor Slice 07 zurücknehmen;
- die neue Slice-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- keine destruktiven Git-Kommandos verwenden.

## Geplante Umsetzung

1. Den Mapping-Vertrag MAP-01 bis MAP-17 in ein einheitliches
   Mechanismus-Dossier überführen.
2. Pro Dossier Forschungsgrundlage, Suite-Umsetzung, Abweichung,
   Evidenz-/Übertragbarkeitsstatus, interne Validierung und Restrisiko
   dokumentieren.
3. Ergebnisinterpretation um Konsumkürzung, Floor-Verletzung, Stressdauer,
   Nachlass, Steuerlast und Liquiditätsengpass ergänzen.
4. Offene Forschungsfragen priorisieren und das bestehende
   Modellrisikoregister um quellenbasierte Forschungsrisiken ergänzen.
5. Arbeitsplan und Slice-Datei mit dem tatsächlichen Ergebnis und den
   Validierungsnachweisen zurückdokumentieren.

## Geplante Validierung

- Vollständigkeitsabgleich MAP-01 bis MAP-17;
- Quellen-ID-Abgleich gegen E.4 und Prüfung auf verwaiste Referenzen;
- Suche nach unzulässigen Gleichsetzungen von Literatur-, Suite- und
  Testergebnissen;
- Prüfung der geforderten Risikobegriffe aus dem Arbeitsplan;
- Überschriften-, Tabellen- und interne Linkkontrolle;
- `git diff --check`;
- abschließender Scope-Check mit `git status --short`.

## Durchgeführte Änderungen

- Der Forschungsblock des Hauptdokuments wurde in
  „Wissenschaftlicher Rahmen, Quellenkorpus und Tiefeneinordnung“ umbenannt;
  Inhaltsverzeichnis, Zweck und historische U-06-Übergabe wurden angepasst.
- Ein verbindlicher Einordnungsmaßstab trennt `etabliert`, `adaptiert`,
  `heuristisch` und `experimentell` auf Ebene der konkreten Suite-Ausprägung.
- MAP-01 bis MAP-17 wurden vollständig als Mechanismus-Dossiers ausgeführt.
  Jedes Dossier enthält:
  - Suite-Mechanismus und Implementierungsanker;
  - Forschungsanker, Quellenrolle und Übertragbarkeit;
  - konkrete Suite-Umsetzung und Abweichung;
  - Evidenzstatus;
  - lokale Validierung mit ihrer V1-bis-V3-Grenze;
  - Restrisiko und offene V5-Prüfung.
- Safe-Withdrawal-Aussagen wurden explizit an Horizont, Asset-Allokation,
  Rebalancing, Inflation, Steuer/Kosten, Datenraum und Erfolgsdefinition
  gebunden. Es wird keine universelle sichere Rate genannt.
- Bootstrap, Regime, Tail Risk und CAPE wurden hinsichtlich Stationarität,
  Kalibrierung, Daten-/Horizontmismatch, EMA/Clamps und Szenario- versus
  Wahrscheinlichkeitsaussage begrenzt.
- Backtest, Sweep und Auto-Optimize wurden um Look-ahead, Survivorship/Easy-
  Data-Bias, Data Snooping, Mehrfachtests, Selection Bias, Train/Test-Nesting
  und das unbekannte Trial-Universum eingeordnet.
- Single-/Joint-Life, gesetzliche Rente/Witwenanteil, Pflegeprozess und
  Pflegebucket wurden einschließlich Perioden-/Kohortenproblem,
  Rechts-/Inputgrenze, Übergangs-/Kostenkalibrierung und Opportunitätskosten
  vertieft.
- Die Erfolgsquote wurde um ein verpflichtendes Ergebnisbündel mit
  Konsumkürzung, Floor-Verletzung, Stressdauer, Nachlass/Restvermögen,
  Steuerlast, Liquiditätsengpass und Pflegewirkung ergänzt.
- Ein Forschungs-/Modellrisikoregister FR-01 bis FR-12 und priorisierte offene
  Forschungsfragen FQ-01 bis FQ-10 wurden ergänzt.
- Die früher missverständlich der Suite zurechenbaren Kitces-/Morningstar-
  Zahlen wurden ausdrücklich nicht wiedereingeführt.
- Der übergeordnete Arbeitsplan wurde mit Umsetzungsergebnis, U-07-Status und
  Slice-Status zurückdokumentiert.

## Ausgeführte Validierung

- Branch-Check:
  - aktiver Branch `codex/architektur-fachkonzept-doku` stimmt mit dem Plan
    überein.
- MAP-Vollständigkeit:
  - 17 Dossierüberschriften gefunden;
  - IDs lückenlos `MAP-01` bis `MAP-17`;
  - 17-mal das Pflichtfeld „Suite-Mechanismus und Implementierungsanker“;
  - die weiteren Pflichtfelder wurden je Dossier strukturgleich geführt.
- Quellen-ID-Abgleich:
  - 55 eindeutige `FOR-*`-Definitionen in E.4;
  - 49 unterschiedliche Quellen-IDs im Slice-07-Abgleich verwendet;
  - keine verwendete Quellen-ID ohne Definition.
- Inhaltsprüfung:
  - die im Arbeitsplan geforderten Themen Look-ahead, Survivorship, Data
    Snooping, Mehrfachtests/Overfitting, Perioden-/Kohortenproblem,
    Joint-Life, Konsumkürzung, Floor-Verletzung, Stressdauer, Nachlass,
    Steuerlast und Liquiditätsengpass sind nachweisbar enthalten;
  - Suche nach unzulässigen Absolutheiten im neuen Forschungsblock ohne
    positiven Befund; das Wort „garantiert“ erscheint nur in der ausdrücklichen
    Verneinung einer Floor-Garantie.
- Markdown-/Diff-Prüfung:
  - `git diff --check` ohne Befund.
- Scope-Check:
  - Slice 07 änderte nur das Hauptdokument, diese Slice-MD und den
    übergeordneten Arbeitsplan;
  - keine Programm-, Test-, Build- oder generierte Datei wurde durch Slice 07
    verändert;
  - die vorbestehenden Playwright-Dateien unter `node_modules` blieben
    unangetastet.
- Laufzeittests:
  - nicht ausgeführt; gemäß Abschnitt 18 des Arbeitsplans ist für die rein
    dokumentarische Änderung kein `npm test` erforderlich. Es werden keine
    neuen Laufzeitergebnisse behauptet.

## Abweichungen vom Plan

- Keine Scope-Abweichung.
- Es wurden keine neuen externen Quellen ergänzt. Die Tiefeneinordnung konnte
  vollständig aus dem freigegebenen 55-Record-Korpus und der lokalen Source of
  Truth abgeleitet werden.
- Der Backtest erhielt den Status „etabliert als Diagnoseverfahren“. Diese
  enge Qualifikation ist keine Evidenzfreigabe seiner Resultate; die konkrete
  Suite-Policy bleibt aufgrund Look-ahead- und Datenrisiken begrenzt.

## Offene Risiken

- Das Quellenkorpus deckt nicht für jede konkrete Suite-Parametrisierung eine
  externe Kalibrierung oder unabhängige Replikation ab.
- US- und internationale Forschungsbefunde sind nur begrenzt auf deutsche
  Steuern, Rente, Pflege, Kosten und Anlegerumstände übertragbar.
- Eine dokumentarische Einordnung kann fehlende empirische Produktvalidierung
  sichtbar machen, aber nicht ersetzen.
- Die konkreten offenen Risiken sind im Hauptdokument als FR-01 bis FR-12
  priorisiert. Besonders hoch bleiben Daten-/Kostenprovenienz, CAPE- und
  Optimizer-Out-of-sample-Güte, Pflegekalibrierung, Kohortenmortalität und die
  Dominanz der binären Erfolgsquote.
- PD-01 und PD-02 begrenzen weiterhin die reale Entnahme-KPI beziehungsweise
  die Pflegekosten-Drift. Slice 07 dokumentiert diese Mängel, behebt sie gemäß
  Nicht-Scope aber nicht.

## Rückdokumentation in den Arbeitsplan

Umsetzungsergebnis, wesentliche Aussagegrenzen und U-07-Status sind in
Abschnitt 14 sowie in den Tabellen der Abschnitte 16 und 17 des
übergeordneten Arbeitsplans aktualisiert. Der Nutzer hat U-07 am 2026-07-15
mit „U-07 ist freigegeben“ erteilt.

## Ergebnisse

Slice 07 erfüllt die implementierungsseitigen Akzeptanzkriterien:

- alle 17 Mechanismen besitzen eine explizite Evidenz- und
  Übertragbarkeitseinordnung;
- Literatur-, Suite- und lokale Testergebnisse sind getrennt;
- Validierung wird nicht mit empirischer Güte gleichgesetzt;
- Safe Withdrawal, stochastische Modelle, CAPE, Validierungswerkzeuge,
  Demografie, Pflege, Assets/Buckets und Ergebnisinterpretation besitzen
  sichtbare Modellgrenzen;
- offene Forschungsfragen und Forschungsrisiken sind priorisiert.

Die abschließende Akzeptanzbedingung „Nutzer hat U-07 freigegeben“ ist durch
die Nutzerentscheidung vom 2026-07-15 erfüllt.

## Freigabestatus

- Implementierung: abgeschlossen
- Selbstfreigabe durch Codex: ausgeschlossen
- Nutzerfreigabe U-07: erteilt am 2026-07-15 – „U-07 ist freigegeben“
- Commit/Push: nicht beauftragt

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-07 | Nutzer | Wissenschaftliche Einordnung nach Slice 07 | angenommen | freigegeben am 2026-07-15 |
