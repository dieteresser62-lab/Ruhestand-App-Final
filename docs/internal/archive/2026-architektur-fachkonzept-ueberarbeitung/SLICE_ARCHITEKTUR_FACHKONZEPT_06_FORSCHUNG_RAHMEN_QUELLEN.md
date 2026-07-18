# Slice 06: Wissenschaftlicher Rahmen und Quellenkorpus

**Stand:** 2026-07-15
**Status:** freigegeben; Nutzerfreigabe U-06 erteilt am 2026-07-15
**Feature-Branch:** `codex/architektur-fachkonzept-doku`
**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push nicht beauftragt
**Übergeordneter Plan:**
[`ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`](ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md)

## Auftrag und Freigabegrundlage

Der Nutzer hat am 2026-07-15 mit „Implementiere slice 06 des doku projekts“
Slice 6 separat beauftragt. Slice 5 und der Freigabepunkt U-05 waren zuvor
freigegeben. Für diesen rein dokumentarischen Auftrag gilt weiterhin die im
Arbeitsplan festgehaltene Prozessentscheidung: Nutzerreview statt
Gemini-/Claude-Review; Codex erteilt keine Eigenfreigabe und erstellt keinen
Commit.

## Ziel

Slice 6 schafft den belastbaren wissenschaftlichen Rahmen für die spätere
Tiefeneinordnung in Slice 7. Dazu werden ein verbindlicher Zitier- und
Evidenzstandard, ein thematisch breites und qualitätsbewertetes Quellenkorpus
sowie eine einheitliche Mapping-Struktur zwischen Suite-Mechanismen und
Forschungsfeldern dokumentiert. Der Slice bewertet noch nicht abschließend,
ob einzelne Suite-Mechanismen wissenschaftlich bestätigt sind.

## Akzeptanzkriterien

- Die Quellenbasis geht deutlich über Morningstar-, Kitces- und
  Community-Artikel hinaus.
- Zentrale Methoden besitzen mindestens eine geeignete Primär- oder
  institutionelle Quelle, soweit verfügbar.
- Quellenart, Evidenzqualität, Übertragbarkeit und wesentliche Einschränkungen
  sind nachvollziehbar dokumentiert.
- Externe Befunde, institutionelle Methoden, Practitioner Research,
  Fachliteratur, offizielle deutsche Daten und Community-Quellen werden
  getrennt klassifiziert.
- DOI, dauerhafter Link und Abrufdatum sind soweit verfügbar erfasst.
- Eine einheitliche Mapping-Struktur bereitet für jeden zentralen
  Suite-Mechanismus den späteren Abgleich von Forschungsgrundlage,
  Suite-Adaption, Abweichung, Validierung und Restrisiko vor.
- Literaturergebnisse werden nicht als eigene Ergebnisse der Ruhestand-Suite
  dargestellt.
- Laufzeitcode, Engine-Semantik, Tests und generierte Artefakte bleiben
  unverändert.
- Der Quellenkorpus und die Evidenztaxonomie werden dem Nutzer als U-06 zur
  Entscheidung vorgelegt; Codex erteilt keine Eigenfreigabe.

## Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-Datei
- der übergeordnete Arbeitsplan für Status und Ergebnisrückdokumentation
- wissenschaftliche und institutionelle Quellen zu Entnahmemethoden,
  Lifecycle Finance, Langlebigkeit, Simulation, Modellrisiko, CAPE,
  Pflege/Selbstversicherung, Asset-/Bucket-Strategien und deutschen
  Referenzdaten

## Nicht-Scope

- keine abschließende Bewertung einzelner Suite-Algorithmen; diese erfolgt in
  Slice 7
- keine neuen Produkt- oder Wirksamkeitsbehauptungen
- keine eigenen Benchmarks, Kalibrierungen oder empirischen Suite-Ergebnisse
- keine Änderungen an Programm-, Test-, Build- oder Konfigurationsdateien
- keine Änderungen an Engine-Semantik, Snapshots oder generierten Artefakten
- keine personenbezogenen Finanzdaten, lokalen Exporte oder Logs

## Branch- und Git-Status vor Start

Ausgeführt vor dem ersten inhaltlichen Edit:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-doku`
- `git status --short --branch`:
  - Branch: `codex/architektur-fachkonzept-doku`
  - bereits geändert aus Slice 1 bis 5:
    `README.md`,
    `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`,
    `docs/reference/DATA_SOURCES.md`,
    `docs/reference/SIMULATOR_MODULES_README.md`,
    `docs/reference/TECHNICAL.md`,
    `engine/README.md`
  - bereits ungetrackt aus Slice 1 bis 5:
    übergeordneter Arbeitsplan und Slice-Dateien 01 bis 05
  - vorbestehend und außerhalb des Auftrags:
    ungetrackte Playwright-Dateien unter `node_modules`

Der aktive Branch entspricht dem im Arbeitsplan vorgegebenen Feature-Branch.
Die vorhandenen Markdown-Änderungen werden bewahrt; die Playwright-Dateien
bleiben unangetastet.

## Diff-Risiko vor Coding

```text
Geplante Dateien:
- docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_06_FORSCHUNG_RAHMEN_QUELLEN.md (neu)
- docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
- docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md

Voraussichtliche Änderungstiefe:
- mittel (umfangreiche, aber rein dokumentarische Quellen- und Taxonomiearbeit)

Gefährdete bestehende Tests:
- keine Laufzeittests; gefährdet sind Markdown-Tabellen, Anker, Quellen-IDs und relative Links

Nicht anfassen:
- Programm-, Test-, Build- und Konfigurationsdateien
- generierte Artefakte
- bestehende Slice-1-bis-5-Inhalte außer notwendigen Übergangsverweisen
- vorbestehende Playwright-Dateien unter node_modules

Rollback-Strategie:
- git checkout -- docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md
- neue Slice-06-Datei nur nach ausdrücklicher Freigabe löschen
```

Keine Stop-Regel aus `AGENTS.md` greift: Der Slice bleibt dokumentationsrein,
ändert keinen Contract und umfasst keine Programmdatei.

## Geplante Umsetzung

1. Bestehenden Forschungsblock und Quellenbestand gegen die Slice-6-Themen
   inventarisieren.
2. Evidenzstufen, Quellenrollen, Übertragbarkeitsklassen und Zitierstandard
   verbindlich definieren.
3. Offizielle, institutionelle und wissenschaftliche Primärquellen je
   Themenfeld recherchieren und als eindeutige Quellenrecords erfassen.
4. Quellenkorpus nach Themen, Quellenart, Aussagebeitrag, Grenzen und
   Übertragbarkeit auf die Suite strukturieren.
5. Eine Mechanismus-Mapping-Struktur als Eingabevertrag für Slice 7 ergänzen.
6. Arbeitsplan, Dokumentmetadaten und Freigabepunkt U-06 konsistent
   rückdokumentieren.

## Geplante Validierung

- Vollständigkeitsaudit gegen alle Slice-6-Aufgaben und Akzeptanzkriterien
- Themenabdeckungsaudit über alle im Arbeitsplan genannten Forschungsfelder
- Audit auf Primär-/institutionelle Quellen je zentraler Methode, soweit
  verfügbar
- Quellen-ID-, DOI-/URL-, Abrufdatums- und Klassifikationsaudit
- Negativsuche nach Literaturzahlen, die unbelegt als Suite-Ergebnis
  erscheinen
- Markdown-Überschriften-, Tabellen-, Anker- und relative-Link-Prüfung
- Linkerreichbarkeitsprüfung, soweit Anbieter automatisierte Abrufe zulassen
- `git diff --check`
- abschließender Scope-Check gegen den Diff-Risiko-Block

Ein `npm test`-Lauf ist für reine Markdown-Änderungen nicht vorgesehen. Es
werden keine neuen Laufzeit- oder Testergebnisse behauptet.

## Durchgeführte Änderungen

- Den alten, nicht hinreichend kontextualisierten Forschungsblock im
  Hauptdokument durch Kapitel E „Wissenschaftlicher Rahmen und Quellenkorpus“
  ersetzt.
- Acht Quellenklassen (`W1`, `W2`, `I1`, `I2`, `P1`, `WP`, `B1`, `C1`), drei
  Evidenzstufen (`A` bis `C`) und vier Übertragbarkeitsklassen (`T1` bis `T4`)
  definiert. Quellenherkunft, Belastbarkeit und Übertragbarkeit werden damit
  getrennt beurteilt.
- Einen Zitier-, Versions- und Aktualitätsstandard für Journalartikel, Working
  Paper, amtliche/institutionelle Quellen, dynamische Daten und konkrete
  Zahlenbehauptungen dokumentiert.
- Ein Korpus aus 55 eindeutigen Quellenrecords aufgebaut:
  - 10 zu Safe Withdrawal, dynamischen Entnahmen, Guardrails, RMD und VPW;
  - 8 zu Floor-and-Upside, Lifecycle Finance, Konsumglättung und
    Langlebigkeit;
  - 10 zu Bootstrap, Regime, Fat Tails und Stresstests;
  - 10 zu CAPE, Prognosegrenzen, Backtests, Optimierung und Data Snooping;
  - 3 zu Pflege und Mental Accounting;
  - 7 zu Asset-, Gold-, Glidepath- und Bucket-Fragen;
  - 7 amtliche deutsche Records zu Sterblichkeit, Rente, Pflege und Preisen.
- Den Community-Ursprung von VPW ausdrücklich von den wissenschaftlichen
  Annuitätenankern und der amtlichen US-RMD-Regel getrennt.
- Direkte Primärquellen für Liability Matching/Floor-and-Upside sowie für
  bedürfnis-/wunschbasierte dynamische Entnahmen ergänzt.
- Einen Pflichtfeldvertrag und 17 Startmappings für den Mechanismusabgleich in
  Slice 7 dokumentiert.
- Nicht belastbare Aussagen der Altfassung entfernt beziehungsweise als
  prüfpflichtig gekennzeichnet, insbesondere unkontextualisierte
  Entnahmeraten, als Suite-Ergebnis lesbare Literaturwerte und pauschale
  Gleichsetzungen von Suite- und Literaturmethoden.
- Dokumentkopf, Inhaltsverzeichnis, Quellenhinweis, Freigabepunkt U-06 und den
  übergeordneten Arbeitsplan auf den Slice-6-Stand gebracht.

## Ausgeführte Validierung

- Vollständigkeitsaudit gegen Aufgaben und Akzeptanzkriterien: alle zehn im
  Arbeitsplan genannten Themenfelder sind im Korpus und/oder Mapping vertreten.
- Automatischer Quellen-ID-Audit:
  - 55 Quellenzeilen und 55 eindeutige `FOR-*`-IDs;
  - keine doppelte ID und keine unbekannte referenzierte Quellen-ID;
  - Klassenverteilung: 34 `W1`, 2 `W2`, 11 `I1`, 2 `I2`, 4 `P1`, 1 `B1`,
    1 `C1`;
  - Evidenzverteilung: 47 Stufe A, 6 Stufe B, 2 Stufe C.
- Automatischer Mapping-Audit: 17 Zeilen und 17 eindeutige `MAP-*`-IDs, keine
  Dublette.
- Automatischer Markdown-Audit über Hauptdokument, Slice-Datei und Arbeitsplan:
  keine inkonsistenten Tabellen, keine fehlenden relativen Linkziele und keine
  gebrochenen internen Überschriftenanker. Im Hauptdokument wurden dabei 246
  Überschriften und 26 interne Links abgeglichen.
- URL-Syntaxaudit des Hauptdokuments: alle 55 Quellenzeilen besitzen einen
  `https`-Link; 128 externe Markdown-Links mit 111 eindeutigen Zielen, kein
  syntaktisch ungültiges Ziel.
- Quellen und Metadaten wurden während der Recherche über DOI-Landingpages,
  Originalarchive und amtliche Herausgeberseiten gezielt gegengeprüft.
- Negativsuche nach den problematischen Altwertaussagen und pauschalen
  Wirksamkeitsformulierungen: keine Fundstelle.
- `git diff --check`: bestanden; keine nachlaufenden Leerzeichen in den drei
  Slice-6-Dateien.
- `npm test` nicht ausgeführt: Der Slice ändert ausschließlich Markdown und
  behauptet keine neuen Laufzeitergebnisse.

## Abweichungen vom Plan

- Keine inhaltliche Scope-Abweichung.
- Statt eines vollständigen automatisierten Erreichbarkeits-Crawls aller
  externen Ziele wurden die fachlich zentralen Quellen gezielt über
  DOI-, Journal-, Institutions- und Behördenseiten geprüft. Volltextabrufe sind
  je nach Verlag kostenpflichtig oder gegen automatisierte Zugriffe geschützt;
  dauerhafte DOI- beziehungsweise Herausgeberlinks bleiben daher der
  verbindliche Nachweis.

## Offene Risiken

- Das Korpus ist kuratiert und thematisch breit, aber keine erschöpfende
  systematische Literaturübersicht oder Meta-Analyse.
- Quellenklasse und Evidenzstufe bewerten die zulässige Quellenrolle, nicht die
  Wahrheit einer konkreten Suite-Behauptung. Die Mechanismen werden erst in
  Slice 7 tiefengeprüft.
- US-, internationale und institutionelle Forschung ist häufig nur strukturell
  auf deutsche Haushalte übertragbar; Steuern, Sozialversicherung,
  Produktuniversum und Nutzermodelle weichen ab.
- Amtliche deutsche Pflegequerschnitte liefern keine individuellen
  Übergangsmatrizen. Pflegeeintritt, Progression, Dauer und Kosten benötigen in
  Slice 7 getrennte Daten- und Modellgrenzen.
- Amtliche Daten, Rechtsstände und dynamische Webquellen können nach dem
  Abrufstichtag revidiert werden; der dokumentierte Aktualitätsstandard muss bei
  späteren Updates angewendet werden.
- Eine zugängliche DOI- oder Herausgeberseite ersetzt nicht in jedem Fall eine
  vollständige Replikation, Kalibrierung oder Prüfung des Originaldatensatzes.

## Rückdokumentation in den Arbeitsplan

- Planstatus nach der Umsetzung zunächst als zur U-06-Entscheidung vorgelegt
  und nach Nutzerfreigabe auf „Slice 6 und U-06 freigegeben – Slice 7 bereit
  zur separaten Beauftragung“ gesetzt.
- Umsetzungsergebnis mit 55 Quellenrecords, Taxonomie und 17 Mappings in
  Abschnitt 13 ergänzt.
- U-06 als am 2026-07-15 mit „U-06 freigegeben“ erteilt dokumentiert.
- Slice-Statuszeile 6 auf „freigegeben“ gesetzt; Slice 7 bleibt geplant und
  unbeauftragt.

## Ergebnisse

Die Akzeptanzkriterien sind als Implementierungsstand erfüllt: Das
Hauptdokument besitzt nun einen belastbaren, klassifizierten und
übertragbarkeitsbewussten Quellenrahmen, der deutlich über die bisherige
Morningstar-/Kitces-/Community-Basis hinausgeht. Primär- und institutionelle
Anker sind für die zentralen Methoden vorhanden, Literaturergebnisse werden
nicht als eigene Suite-Ergebnisse ausgegeben, und der Mapping-Vertrag bereitet
den späteren Tiefenabgleich vor.

Dieser Abschluss ist keine fachliche Eigenfreigabe durch Codex. Der Nutzer hat
U-06 am 2026-07-15 erteilt. Slice 7 ist damit freigabeseitig vorbereitet, aber
weder umgesetzt noch separat beauftragt.

## Freigabestatus

- Implementierung durch Codex: inhaltlich umgesetzt, keine Eigenfreigabe
- Nutzerfreigabe U-06: erteilt am 2026-07-15
- Review durch Gemini/Claude: gemäß Prozessentscheidung nicht erforderlich
- Commit/Push: nicht durch Codex; separate Nutzerentscheidung erforderlich

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-06-START | Nutzer | Slice 6 separat umsetzen | angenommen | Auftrag vom 2026-07-15; Umsetzung gestartet |
| U-06-M01 | Quellenprüfung | VPW besitzt einen dokumentierten Community-Ursprung; Annuitätenrechnung und RMD sind davon getrennte Anker | angenommen | `C1` für VPW, `W1` für den Annuitätenanker und `I1` für die RMD-Regel getrennt erfasst |
| U-06-M02 | Quellenprüfung | Der erste Lifecycle-Block deckte Safety-first/Floor-and-Upside nur indirekt ab | angenommen | Sexauer/Peskin/Cassidy (2012) und Blanchett (2023) als direkte Primäranker ergänzt |
| U-06-M03 | Altbestandsaudit | Unkontextualisierte Entnahmeraten und Literaturwerte waren als Suite-Ergebnis missverständlich | angenommen | aus dem normativen Forschungsblock entfernt und für Slice 7 prüfpflichtig dokumentiert |
| U-06-READY | Codex | Taxonomie, Quellenkorpus, Mapping und technische Markdown-Prüfungen sind umgesetzt | dokumentiert, nicht freigegeben | U-06 dem Nutzer zur Entscheidung vorgelegt; keine Eigenfreigabe und kein Commit |
| U-06-APPROVAL | Nutzer | „U-06 freigegeben“ | freigegeben | Nutzerfreigabe am 2026-07-15 dokumentiert; Slice 7 bleibt separat zu beauftragen |
