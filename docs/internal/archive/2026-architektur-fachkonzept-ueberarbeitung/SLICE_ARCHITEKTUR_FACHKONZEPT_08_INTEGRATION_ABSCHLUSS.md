# Slice 08: Redaktionelle Integration und Abschlussvalidierung

**Stand:** 2026-07-16  
**Status:** freigegeben am 2026-07-16  
**Feature-Branch:** `codex/architektur-fachkonzept-doku`  
**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push nicht beauftragt  
**Übergeordneter Plan:** `ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`  
**Zieldokument:** `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`

## Auftrag und Freigabegrundlage

Der Nutzer hat Slice 08 am 2026-07-15 mit „Implementiere slice 8“ separat
beauftragt. U-01 bis U-07 sind erteilt. Für diese reine Dokumentationsarbeit
gilt weiterhin die im Arbeitsplan festgehaltene Prozessentscheidung: Der
Nutzer übernimmt die Abschlussfreigabe; Codex implementiert, erteilt aber
keine Eigenfreigabe und erstellt keinen Git-Commit.

## Ziel

Die in Slice 01 bis 07 freigegebenen Architektur-, Fach-, Markt- und
Forschungsblöcke werden zu einer eigenständig verständlichen, navigierbaren
und redaktionell konsistenten Gesamtdokumentation zusammengeführt. Metadaten,
Querverweise, Quellenapparat und Release-Checkliste werden auf den finalen
Stand gebracht und der vollständige Dokumentationsdiff wird ohne Änderung von
Laufzeitsemantik oder Programmdateien validiert.

## Akzeptanzkriterien

- Das Hauptdokument ist als eigenständige Lektüre verständlich.
- Architektur- und Fachstand widersprechen den verbindlichen Referenzen nicht.
- Markt- und Forschungsaussagen sind belegt, datiert und methodisch
  eingegrenzt.
- Annahmen, Heuristiken, Experimente und offene Risiken sind sichtbar.
- Inhaltsverzeichnis, Überschriften, interne Anker, Querverweise, Tabellen,
  Glossar, Register und Quellenapparat sind konsistent.
- Dokumentkopf sowie Code-, Daten- und Quellenstand bilden den Abschlussstand
  nach Slice 08 ab.
- Die Release-Checkliste enthält die Markt- und Forschungsaktualisierung.
- Keine Programm-, Test-, Build- oder generierte Datei wurde geändert.
- Git-Diff und Status enthalten nur freigegebene Markdown-Dateien sowie die
  bereits vorbestehenden, nicht zum Auftrag gehörenden Playwright-Dateien unter
  `node_modules`.
- Der Nutzer hat das Gesamtdokument als U-08 abschließend freigegeben.

## Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-Datei
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`
- nur bei konkret nachgewiesenem Widerspruch bereits im Arbeitsplan
  freigegebene Markdown-Referenzen

## Nicht-Scope

- Programm-, Test-, Build- oder generierte Dateien;
- Änderungen an Engine-Semantik, Defaults oder Produktfunktionen;
- neue Markt- oder Forschungserhebung;
- neue eigene Backtests, Kalibrierungen oder Wirksamkeitsbehauptungen;
- Archivierung vor U-08 sowie Commit oder Push;
- `node_modules`, `engine.js`, `dist` und `RuheStandSuite.exe`.

## Branch- und Git-Status vor Start

Ausgeführt am 2026-07-15 vor dem ersten Slice-08-Edit:

- `git branch --show-current`
  - Ergebnis: `codex/architektur-fachkonzept-doku`
- `git status --short`
  - bereits geändert aus den freigegebenen Slices 01 bis 07:
    - `README.md`
    - `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
    - `docs/reference/DATA_SOURCES.md`
    - `docs/reference/SIMULATOR_MODULES_README.md`
    - `docs/reference/TECHNICAL.md`
    - `engine/README.md`
    - übergeordneter Arbeitsplan und Slice-Dateien 01 bis 07 untracked
  - vorbestehend und nicht Teil des Auftrags:
    - ungetrackte Playwright-Dateien unter `node_modules`

Der aktive Branch entspricht dem im Arbeitsplan festgelegten Feature-Branch.
Die bestehenden Dokumentationsänderungen werden fortgeführt; die
Playwright-Dateien bleiben unangetastet.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_08_INTEGRATION_ABSCHLUSS.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`
- nur bei konkret nachgewiesenem Widerspruch bereits freigegebene
  Markdown-Referenzen

**Voraussichtliche Änderungstiefe:**

- mittel; redaktionelle Konsolidierung und Abschlussvalidierung,
  ausschließlich Markdown

**Gefährdete bestehende Tests:**

- keine Laufzeittests;
- redaktionelles Risiko bei Ankern, Querverweisen, Tabellen, Quellen-IDs,
  Metadaten und widersprüchlichen Aussagen

**Nicht anfassen:**

- alle Programm-, Test-, Build- und generierten Dateien;
- `node_modules`, `engine.js`, `dist` und `RuheStandSuite.exe`;
- freigegebene fachliche Aussagen ohne nachgewiesenen Integrationskonflikt.

**Rollback-Strategie:**

- Änderungen am Hauptdokument und Arbeitsplan gezielt dateibezogen gegen den
  Stand vor Slice 08 zurücknehmen;
- die neue Slice-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- keine destruktiven Git-Kommandos verwenden.

## Geplante Umsetzung

1. Dokumentkopf, Einleitung, Inhaltsverzeichnis und Release-Checkliste auf den
   Abschlussstand bringen.
2. Überschriften, Anker, Querverweise, Tabellen, Glossar, Register und
   Quellenapparat mechanisch und redaktionell konsolidieren.
3. Dopplungen und Übergabetexte aus den Zwischenslices entfernen, ohne
   freigegebene Aussagegrenzen zu verwischen.
4. Das Hauptdokument gegen die verbindlichen Markdown-Referenzen abgleichen
   und nur nachgewiesene Widersprüche synchronisieren.
5. Den vollständigen Dokumentationsdiff und Scope validieren sowie Slice-Datei
   und Arbeitsplan mit dem tatsächlichen Ergebnis zurückdokumentieren.

## Geplante Validierung

- Dokumentkopf-, Inhaltsverzeichnis-, Überschriften- und Ankerprüfung;
- Prüfung lokaler Markdown-Links und Querverweise;
- Vollständigkeits- und Eindeutigkeitsprüfung der Markt- und Forschungsquellen;
- Kontrolle von Tabellenstruktur, Register-IDs und Übergabetexten;
- Suche nach veralteten Slice-, Versions-, Preis-, Modul-, Test- und
  Datumsangaben;
- Suche nach unbelegten Absolutheiten und vermischten Evidenzebenen;
- Abgleich mit `README.md`, `docs/reference/TECHNICAL.md`,
  `docs/reference/DATA_SOURCES.md`, den relevanten Modul-READMEs,
  `engine/README.md` und `tests/README.md`;
- `git diff --check`;
- abschließender Scope-Check mit `git status --short`.

## Durchgeführte Änderungen

- Dokumentkopf und Aktualitätsblock wurden auf den integrierten Abschlussstand
  gebracht. Der Mechanismusabgleich MAP-01 bis MAP-17 ist nicht mehr als
  zukünftige Arbeit bezeichnet.
- Der Einleitungsblock trennt nun Code-/Inventar-, Markt- und
  Forschungsstände und nennt deren jeweilige Aussagegrenzen.
- Die Release-Checkliste wurde von sieben allgemeinen auf zehn konkrete
  Pflegepunkte erweitert. Marktstichtag, Produktstufe, FOR-/MKT-Records,
  MAP-/FR-/FQ-Neubewertung, Quellenintegrität, Navigation und Scope sind eigene
  Prüfschritte.
- Prozessuale Zukunfts- und Übergabetexte aus dem Marktteil wurden in
  dauerhafte Methoden-, Stichproben-, Auswertungs- und Ergebnisaussagen
  überführt. Die belegführenden Quellenrecords und Ergebnismatrizen blieben
  erhalten.
- Der Forschungsblock verwendet keine offene Slice-7-Sprache mehr.
  Evidenztaxonomie, Korpus, Mapping-Grundlage und Mechanismusdossiers sind als
  abgeschlossener, aber nicht zeitloser Gesamtvertrag miteinander verknüpft.
- Zwei fehlerhafte Fachanker für Rentensystem und Dynamic Flex wurden
  korrigiert. Die doppelte Überschrift `Marktvergleich` im Quellenbereich
  heißt nun `Produktquellen des Marktvergleichs` und erzeugt keinen
  kollidierenden GitHub-Anker mehr.
- Der Appendix beschreibt sich als konzeptionelle Modulkarte statt als noch
  ausstehende Folgeslice-Aufgabe. Quellenabschluss und Dokumentfuß wurden auf
  den integrierten Stand gebracht.
- Der übergeordnete Arbeitsplan verlinkt nun alle Slice-Dateien 01 bis 08 und
  dokumentiert Umsetzungsergebnis sowie Status `implementiert`, U-08 aber
  weiterhin als ausstehend.
- Es waren keine weiteren Änderungen an aktiven Spezialreferenzen nötig, weil
  der Abschlussabgleich keinen neuen Contract-Widerspruch ergab.

## Ausgeführte Validierung

- Branch- und Scope-Check:
  - aktiver Branch `codex/architektur-fachkonzept-doku` stimmt mit dem Plan
    überein;
  - getrackte Änderungen betreffen ausschließlich Markdown-Dateien;
  - Slice 08 selbst änderte nur Hauptdokument, Arbeitsplan und diese Slice-MD;
  - die vorbestehenden Playwright-Dateien unter `node_modules` blieben
    unangetastet.
- Reproduzierbare Inventur gegen Commit `6ea3e7a` und die lokale Arbeitskopie:
  - `app/balance`: 36 JS-Module;
  - `app/simulator`: 95 JS-Module;
  - `app/profile`: 13 JS-Module;
  - `app/tranches`: 7 JS-Module;
  - `app/shared`: 12 JS-Module;
  - `types`: 3 JS-Module;
  - `engine`: 27 MJS-Module;
  - `workers`: 3 JS-Module;
  - `tests`: 107 entdeckte `*.test.mjs`-Dateien.
- Engine-Metadaten wurden durch direkten ESM-Import geprüft:
  - API `31.0`, Build `2025-12-22_16-35`;
  - acht enumerable Methoden, davon die fünf operativen Methoden und drei
    deprecated Kompatibilitäts-Stubs wie dokumentiert.
- Navigation und Markdown-Struktur des Hauptdokuments:
  - 277 Überschriften mit 277 eindeutigen berechneten Ankern;
  - 14 Inhaltsverzeichnislinks ohne defekten Anker;
  - keine fehlende lokal verlinkte Datei;
  - keine Tabelle mit abweichender Spalten-/Pipe-Struktur;
  - keine doppelte Überschrift im Hauptdokument.
- Quellen- und Registerintegrität:
  - 69 definierte und 69 referenzierte MKT-IDs, keine undefinierte ID;
  - 55 definierte und 55 referenzierte FOR-IDs, keine undefinierte ID;
  - MAP-01 bis MAP-17, FR-01 bis FR-12, FQ-01 bis FQ-10 und PD-01 bis
    PD-03 lückenlos vorhanden;
  - keine verbliebene offene Slice-/U-Übergabeformulierung und keine Treffer
    für die untersuchten unbelegten Absolutheiten.
- Referenzabgleich:
  - `README.md`, `docs/reference/TECHNICAL.md`,
    `docs/reference/DATA_SOURCES.md`, die relevanten Modul-READMEs,
    `engine/README.md` und `tests/README.md` wurden gegen Inventar,
    Engine-Oberfläche, Mindest-Flex-, Ergebnis-, Daten-, Profilverbund- und
    Tranchenverträge abgeglichen;
  - kein neuer fachlicher Contract-Widerspruch festgestellt.
- `git diff --check`: ohne Befund.
- Laufzeittests: nicht ausgeführt. Gemäß Abschnitt 18 des Arbeitsplans sind
  sie für die rein dokumentarische Änderung nicht erforderlich; Slice 08
  behauptet keine neue Laufzeitbaseline.

## Abweichungen vom Plan

- Keine Scope-Abweichung und keine Änderung von Laufzeitsemantik.
- Der redaktionelle Orientierungswert, Marktvergleich und Forschung zusammen
  auf ungefähr 20 bis 25 % des inhaltlichen Hauptdokuments zu begrenzen und
  den Forschungsblock größer als den Marktblock zu halten, wird nicht
  numerisch erreicht. Nach der Integration umfasst der Marktblock rund 9.224,
  der Forschungsblock rund 8.317 Wörter. Ursache sind vor allem die 69
  stufenscharfen MKT- und 55 wissenschaftlichen FOR-Auditrecords.
- Diese Records wurden nicht nur zur Erfüllung eines Umfangsziels gekürzt oder
  ausgelagert, weil Quellenqualität, Aussagegrenzen und Reproduzierbarkeit im
  Plan ausdrücklich Vorrang haben. Prozessdopplungen wurden reduziert; die
  belegführenden Inhalte blieben erhalten.
- Die Archivierung wurde entsprechend dem Plan noch nicht ausgeführt. Sie ist
  erst nach Nutzerfreigabe U-08 vorgesehen.

## Offene Risiken

- Marktpreise, Produktstufen, Funktionen sowie amtliche und institutionelle
  Daten veralten; die neue Release-Checkliste mindert dieses Risiko, ersetzt
  aber keine erneute Erhebung.
- Das große eingebettete Quelleninventar erhöht Auditierbarkeit, zugleich aber
  Dokumentlänge und Pflegeaufwand. Eine spätere Aufteilung in Beleganhänge
  wäre eine eigene redaktionelle Entscheidung.
- Dokumentationskonsistenz und lokale Tests sind kein externer
  Wirksamkeitsnachweis. FR-01 bis FR-12 und FQ-01 bis FQ-10 bleiben offen.
- Die offenen Produktmängel PD-01 bis PD-03 und die Lizenzmetadatenlücke
  GAP-MKT-06 werden in diesem dokumentationsreinen Slice nicht behoben.
- Externe HTTP-Ziele wurden in Slice 08 nicht neu inhaltlich erhoben. Für die
  Abschlussfassung gilt der dokumentierte Abruf- und Erhebungsstand
  2026-07-15.

## Rückdokumentation in den Arbeitsplan

Der Arbeitsplan verlinkt Slice 05 bis 08 nun ebenso wie Slice 01 bis 04. In
Abschnitt 15 sind Umsetzung, Validierungsbefunde und Archivierungsgrenze
dokumentiert; Abschnitt 17 führt Slice 08 als `implementiert` mit ausstehender
Nutzerfreigabe. U-08 und U-09 bleiben unverändert offen.

## Ergebnisse

Die implementierungsseitigen Akzeptanzkriterien sind abgearbeitet:

- das Hauptdokument besitzt einen integrierten Dokumentkopf und dauerhaft
  lesbare Übergänge zwischen Architektur, Fachkonzept, Markt und Forschung;
- Markt- und Forschungsaussagen behalten Stichtag, Quellen-IDs,
  Evidenzgrenzen und Aktualisierungsweg;
- Annahmen, Heuristiken, Experimente, Produktmängel und Forschungsrisiken
  bleiben sichtbar;
- Inhaltsverzeichnis, Anker, lokale Links, Tabellen und Register sind
  mechanisch konsistent;
- aktive Referenzen enthalten keinen neu festgestellten Contract-Widerspruch;
- keine Programm- oder generierte Datei wurde geändert.

Die letzte Akzeptanzbedingung, die Nutzerfreigabe U-08, ist noch nicht erfüllt.
Archivierung, Commit und Push sind daher nicht Teil dieses Ergebnisses.

## Freigabestatus

- Implementierung: abgeschlossen
- Selbstfreigabe durch Codex: ausgeschlossen
- Nutzerfreigabe U-08: erteilt am 2026-07-16
- Archivierung: vorbereitet / nach Commit auszuführen
- Commit/Push: freigegeben und lokal durchgeführt am 2026-07-16

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-08 | Nutzer | Gesamtdokument nach Slice 08 | freigegeben am 2026-07-16 | abgeschlossen |
