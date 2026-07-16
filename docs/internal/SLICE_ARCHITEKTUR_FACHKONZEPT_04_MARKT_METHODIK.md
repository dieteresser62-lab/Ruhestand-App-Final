# Slice 4: Methodik und Stichprobe des Marktvergleichs

**Stand:** 2026-07-15

**Status:** durch den Nutzer freigegeben

**Feature-Branch:** `codex/architektur-fachkonzept-doku`

**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push nicht beauftragt

**Übergeordneter Plan:**
[`ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`](ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md)

**Primäres Zieldokument:**
[`docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md)

## Auftrag und Freigabegrundlage

Der Nutzer hat Slice 4 am 2026-07-15 mit „Implementiere slice 04 des Doku
Projekt“ separat beauftragt. Slice 3 und der gemeinsame Freigabepunkt U-03
wurden zuvor vom Nutzer freigegeben. Für diesen dokumentationsreinen Auftrag
gilt die im Arbeitsplan festgehaltene Prozessentscheidung: Nutzerfreigaben
ersetzen Gemini-/Claude-Reviews; Codex implementiert und dokumentiert, erteilt
aber keine Eigenfreigabe und erstellt keinen Git-Commit.

Slice 4 definiert den Vergleichsrahmen und legt dem Nutzer die
Produktstichprobe, Kriterien und den synthetischen Referenzfall als
Freigabepunkt U-04 vor. Die eigentliche Produktbewertung und Positionierung
gehören erst zu Slice 5.

## Ziel

Einen fairen, reproduzierbaren und quellenklaren Rahmen für den späteren
Marktvergleich festlegen. Unterschiedliche Produktsegmente werden getrennt
ausgewertet, alle Produkte erhalten denselben operationalisierten
Kriterienkatalog, und fehlende öffentliche Dokumentation wird nicht als
fehlende Funktion ausgegeben. Ein synthetischer deutscher Referenzhaushalt
prüft Modellierbarkeit und notwendige Workarounds, ohne numerische Ergebnisse
unterschiedlicher Rechenmodelle als direkt vergleichbar zu behandeln.

## Akzeptanzkriterien

- Recherchezeitraum, Auswahlregeln, Vergleichseinheit und Grenzen sind
  eindeutig definiert.
- Consumer Planner, deutsche Vorsorge-/Entnahmewerkzeuge, Beratersoftware,
  Open-Source-/FIRE-Werkzeuge und Offline-/Tabellenlösungen werden als
  unterschiedliche Segmente geführt.
- Die vorgeschlagene Stichprobe ist je Produkt, Produktstufe und Auswahlgrund
  nachvollziehbar.
- Fachmodell, Steuern, Rente, Pflege, Haushalt, Datenbasis, Stochastik,
  Transparenz, Szenarien, Optimierung, Datenschutz, Offline-Fähigkeit, Export,
  Auditierbarkeit, UX, Barrierefreiheit, Preis und Lizenz sind operationalisiert.
- `vorhanden`, `teilweise`, `nicht öffentlich dokumentiert` und
  `nicht vorhanden` besitzen belastbare, nicht abwertende Vergaberegeln;
  Nicht-Anwendbarkeit und offene Prüfung sind zusätzlich unterscheidbar.
- Der Referenzhaushalt ist vollständig synthetisch, exakt reproduzierbar und
  trennt gemeinsamen Basiskern von deutschen Fach- und Stressproben.
- Quellenhierarchie, Quellen-ID, Abrufdatum, Produktstufe und
  Behauptungszuordnung sind verbindlich festgelegt.
- Der Altvergleich mit ungleichartigen Symbolwertungen, undatierten Preisen,
  Reviewer-Zitaten und unbelegten Exklusivitätsaussagen ist nicht mehr als
  aktueller Vergleich lesbar.
- Slice 5 wird nicht vorweggenommen: Es gibt noch keine vollständige
  Featurebewertung, Rangliste oder Positionierung.
- Keine Programm-, Test-, Build-, Konfigurations- oder generierte Datei wird
  geändert.
- Produktstichprobe, Kriterien und Referenzfall werden dem Nutzer als U-04 zur
  Entscheidung vorgelegt; Codex erteilt keine Eigenfreigabe.

## Scope

### Primärer Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-MD
- Rückdokumentation im übergeordneten Arbeitsplan

### Bedingter Konsistenz-Scope

Andere Markdown-Referenzen werden nur geändert, wenn Slice 4 einen konkreten
Widerspruch erzeugt. Funktions- oder Marktaussagen in Spezialreferenzen werden
nicht erweitert.

### Nicht-Scope

- vollständige Produktrecherche und Bewertung aus Slice 5;
- wissenschaftlicher Quellenkorpus und Evidenzeinordnung aus Slice 6 und 7;
- Kauf, Registrierung, Login oder Kontaktaufnahme für Vergleichsprodukte;
- numerischer Ergebnisvergleich zwischen unterschiedlichen Rechenmodellen;
- Änderungen an Laufzeit-, Test-, Build- oder Konfigurationscode;
- Änderungen an Engine-Semantik, Datenverträgen oder öffentlichen APIs;
- manuelle Änderungen an `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Commit, Push oder Veröffentlichung des Branches.

## Branch- und Git-Status vor Start

Ausgeführt am 2026-07-15 vor dem ersten Slice-4-Edit:

```text
git branch --show-current
codex/architektur-fachkonzept-doku

git status --short
 M README.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/DATA_SOURCES.md
 M docs/reference/SIMULATOR_MODULES_README.md
 M docs/reference/TECHNICAL.md
 M engine/README.md
?? docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md
?? docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_01_BESTAND_STRUKTUR.md
?? docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_02_ARCHITEKTUR_CONTRACTS.md
?? docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_03_FACHKONZEPT_MODELLGRENZEN.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die sechs geänderten Markdown-Dateien und die vier projektbezogenen
ungetrackten Markdown-Dateien stammen aus den vorangegangenen Doku-Slices
beziehungsweise deren Arbeitsplan. Die Playwright-Dateien waren bereits vor
dem Dokumentationsprojekt ungetrackt, gehören nicht zum Auftrag und bleiben
unverändert. Der Arbeitsplan weist Commit und Push ausdrücklich als separate
Nutzerentscheidung aus.

## Diff-Risiko vor Umsetzung

**Geplante Dateien:**

- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_04_MARKT_METHODIK.md` (neu)
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`

**Voraussichtliche Änderungstiefe:**

- mittel; umfangreiche methodische Neufassung des Marktblocks, aber
  ausschließlich Dokumentation und keine Änderung der Laufzeitsemantik

**Gefährdete bestehende Tests:**

- keine Laufzeittests;
- gefährdet sind Markdown-Anker, Tabellenkonsistenz, eindeutige
  Quellenzuordnung und die Grenze zur Produktbewertung aus Slice 5.

**Nicht anfassen:**

- alle Programm-, Test-, Build-, Konfigurations- und generierten Dateien;
- die Fach- und Forschungsbewertung außerhalb notwendiger Querverweise;
- bestehende Dokuänderungen aus Slice 1 bis 3 außerhalb klar abgrenzbarer
  Anschlüsse;
- die vorbestehenden ungetrackten Playwright-Dateien unter `node_modules/`.

**Rollback-Strategie:**

- Änderungen an den zwei bereits veränderten Markdown-Dateien wegen der
  überlappenden, uncommitteten Vorgängerslices nur anhand des dokumentierten
  Slice-4-Diffs zurückführen;
- die neue Slice-4-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- kein pauschales `git checkout`, weil dies freigegebene Änderungen aus Slice
  1 bis 3 überschreiben würde.

## Geplante Recherche und Abgrenzung

- Offizielle Landingpages werden in Slice 4 nur als Existenz-, Segment- und
  Produktstufen-Rekognoszierung geprüft.
- Funktions-, Preis-, Lizenz-, Datenschutz- und Methodikbehauptungen werden
  erst in Slice 5 vollständig erhoben und pro Aussage belegt.
- Die Stichprobe wird als bewusst ausgewählte Maximum-Variation-Stichprobe,
  nicht als statistisch repräsentativer Marktquerschnitt, gekennzeichnet.
- Segmentergebnisse werden getrennt interpretiert; es gibt keine additive
  Gesamtpunktzahl oder segmentübergreifende Rangliste.
- Fehlende öffentliche Information bleibt neutral und darf nicht in einen
  negativen Funktionsstatus umgedeutet werden.

## Geplante Validierung

- Vollständigkeitsaudit gegen alle Aufgaben und Akzeptanzkriterien aus
  Abschnitt 11 des Arbeitsplans;
- Statuslexikon-Audit auf saubere Trennung von fehlender Dokumentation,
  Nicht-Anwendbarkeit und nachgewiesener Abwesenheit;
- Stichprobenaudit auf alle fünf vorgeschriebenen Segmente, Produktstufen und
  begründete Auswahl;
- Referenzfallaudit auf synthetische Daten, Einheit, Stichtag, Zeitachse und
  reproduzierbare Varianten;
- Quellenschema-Audit auf Quellen-ID, Betreiber, Titel, URL, Abrufdatum,
  Produktstufe, Aussage, Evidenzklasse und Einschränkung;
- Suche nach verbleibenden undatierten Preisen, Reviewer-Zitaten,
  Symbolwertungen und unbelegten Absolutheiten im Marktblock;
- Markdown-Überschriften-, Anker-, Tabellen- und relative-Link-Prüfung;
- `git diff --check`;
- abschließender Scope-Check gegen den vorstehenden Diff-Risiko-Block.

Ein `npm test`-Lauf ist für reine Markdown-Änderungen nicht vorgesehen. Es
werden keine neuen Laufzeit- oder Testergebnisse behauptet.

## Durchgeführte Änderungen

- Slice-MD einschließlich Branch-/Status- und Diff-Risiko-Dokumentation vor
  dem ersten Inhaltsedit angelegt.
- Offizielle Einstiegsseiten der vorgeschlagenen Werkzeuge am 2026-07-15 auf
  Produktidentität, Stufe und Segment rekognosziert. Die Rekognoszierung wurde
  ausdrücklich von der Funktionsbewertung aus Slice 5 getrennt.
- Den bisherigen Marktblock im Hauptdokument vollständig methodisch neu
  gefasst. Undatierte Preis-/Featuretabellen, Symbolwertungen, Reviewer-Zitate
  und unbelegte Exklusivitätsaussagen wurden entfernt.
- Erkenntnisziel, Vergleichseinheit, 14-Tage-Recherchefenster,
  Vergleichsstichtag, Recheck-Regel und Zugriffsgrenzen definiert.
- Fünf Segmente mit eigener fairer Interpretation dokumentiert; eine
  segmentübergreifende Gesamtpunktzahl und Rangliste ausgeschlossen.
- Aufnahme-, Ausschluss-, Austausch- und Abbruchregeln für eine bewusst
  qualitative Maximum-Variation-Stichprobe festgelegt.
- Zehn externe Werkzeuge plus Ruhestand-Suite mit Produkt-ID, Stufe,
  Auswahlgrund und offizieller Einstiegsquelle vorgeschlagen:
  ProjectionLab Premium, Boldin PlannerPlus, BVI Entnahme-Rechner,
  Finanzfluss Entnahmeplan, Digitale Rentenübersicht, MoneyGuide, eMoney Pro,
  FI Calc, FIRECalc 3.0 und Pralana Gold.
- Sechs Statuswerte und sechs Evidenzklassen eingeführt. Insbesondere werden
  fehlende öffentliche Dokumentation, nachgewiesene Abwesenheit,
  Nicht-Anwendbarkeit und offene Prüfung getrennt.
- Alle 18 Plankriterien K-01 bis K-18 operationalisiert und Preis-, UX- sowie
  Barrierefreiheitsauswertung methodisch eingegrenzt.
- Synthetischen Referenzhaushalt RH-01 mit festen Personen-, Zeit-,
  Netto-Cashflow-, Portfolio-, Kosten-, Rendite- und Steuer-Testparametern
  sowie die Proben RH-02 Sequenzstress, RH-03 Pflege und RH-04 Hinterbliebene
  definiert.
- Suchpfad, Evidenzhierarchie, stabile Quellen-IDs und zehn Pflichtfelder je
  Quellenrecord festgelegt; lange Seitenkopien und Snippet-Belege
  ausgeschlossen.
- Dokumentkopf, Quellenblock und Schlussstand des Hauptdokuments auf Slice 4
  aktualisiert; veralteten doppelten BVI-Link entfernt.
- Slice 4 im Arbeitsplan verlinkt, Umsetzungsergebnis ergänzt und Status sowie
  Freigabepunkt U-04 zunächst zur Nutzerentscheidung vorgelegt.

## Ausgeführte Validierung

- Die zehn offiziellen externen Einstiegsquellen waren am 2026-07-15
  erreichbar und trugen die für Slice 4 benötigte Produkt-/Segmentzuordnung.
  Es wurde kein Kauf-, Login-, Demo- oder Kontaktpfad verwendet.
- Automatischer Vollständigkeitscheck des Marktblocks:
  - 18 Kriterienzeilen K-01 bis K-18;
  - fünf vorgeschriebene Segmentdefinitionen;
  - elf Stichprobenzeilen, davon zehn externe Produkte;
  - vier eindeutige Referenzfall-IDs RH-01 bis RH-04;
  - zehn Pflichtfelder des Quellenrecords.
- Negativsuche im Marktblock ohne Treffer für alte Reviewer-Zitate,
  Bewertungs-Emoji, undatierte Dollar-Preiszeilen und Formulierungen wie „kein
  anderes verglichenes Tool“.
- Strukturprüfung der drei Slice-4-Dateien ohne Befund: gerade Code-Fences,
  keine Heading-Level-Sprünge, konsistente Tabellenmarker und vorhandene
  relative Linkziele.
- 26 interne Markdown-Anker im Hauptdokument gegen die Überschriften geprüft;
  kein gebrochener Anker.
- `git diff --check` ohne Whitespace-Fehler.
- Branch erneut als `codex/architektur-fachkonzept-doku` bestätigt.
- Scope-Prüfung: Slice 4 änderte nur Hauptdokument, Arbeitsplan und neue
  Slice-MD. Keine Programm-, Test-, Build-, Konfigurations- oder generierte
  Datei und keine vorbestehende Playwright-Datei wurde berührt.
- Kein `npm test`: ausschließlich Markdown geändert; es wird kein neuer
  Laufzeitteststatus behauptet.

## Abweichungen vom Plan

- Keine Scope-Abweichung.
- Zusätzlich zu den vier im Arbeitsplan verlangten Kernstatus wurden
  `nicht anwendbar` und `nicht geprüft` aufgenommen. Ohne diese neutralen
  Zustände würden schmale Produkte oder nicht freigegebene Zugänge
  fälschlicherweise als Funktionsmangel erscheinen.
- Portfolio Visualizer wurde nicht erneut in die Kernstichprobe aufgenommen,
  weil Portfolioanalyse ohne vollständigen Haushalts-/Entnahmezweck die
  Segmentgrenze verwischen würde. Es bleibt bei Bedarf Kontextquelle in Slice
  5.
- Die wiederkehrenden Einkommen des Referenzfalls sind als
  Netto-Cashflows festgelegt. Dadurch hängt der gemeinsame Modellierbarkeitstest
  nicht von einer erfundenen künftigen Einkommensteuertabelle ab; die
  Brutto-/Netto- und Steuerfähigkeit wird separat unter K-02 bewertet.

## Offene Risiken

- Die vorgeschlagene Stichprobe ist bewusst qualitativ und kann keine Aussage
  über Marktanteile oder die Häufigkeit einzelner Funktionen im Gesamtmarkt
  tragen.
- Einzelne Beraterprodukte legen Methodik, Preise oder Testzugänge nur
  eingeschränkt öffentlich offen; dies muss in Slice 5 neutral sichtbar
  bleiben.
- Produktstufen und Preise können sich zwischen U-04 und Slice 5 ändern und
  müssen deshalb beim Abschluss der Recherche erneut geprüft werden.
- Der Referenzhaushalt spiegelt bewusst einen deutschen, komplexeren
  Zielhaushalt. Das kann die Ruhestand-Suite gegenüber schmalen oder
  US-spezifischen Werkzeugen begünstigen; Segmentauswertung,
  Nicht-Anwendbarkeit und Verzicht auf Ranglisten begrenzen dieses Risiko,
  beseitigen es aber nicht.
- Ohne freigegebenen Produktzugang können UX, Barrierefreiheit und interne
  Berechnungstiefe einzelner Produkte in Slice 5 nur als Dokumentationsbefund
  ausgewiesen werden.

## Rückdokumentation in den Arbeitsplan

- Slice-4-Datei im Paketregister verlinkt.
- Slice 4 zunächst als implementiert mit ausstehender Nutzerfreigabe U-04
  eingetragen und nach der Nutzerentscheidung auf freigegeben aktualisiert.
- Umsetzungsergebnis mit Stichprobe, Kriterien, Referenzfall,
  Methodik-/Quellenschema und Sperre von Slice 5 ergänzt.
- Freigabepunkt U-04 mit Vorlage und Nutzerfreigabe vom 2026-07-15
  dokumentiert.

## Ergebnisse

- Pre-Coding-Gates erfüllt und Marktvergleichsmethodik implementiert.
- Die implementierungsseitigen Akzeptanzkriterien sind abgearbeitet; eine
  Eigenfreigabe durch Codex erfolgt nicht.
- Die vorgeschlagene Entscheidungseinheit für U-04 umfasst Stichprobe,
  Produktstufen, Segmente, K-01 bis K-18, Statuslexikon, RH-01 bis RH-04,
  Recherchefenster und Quellenrecord.
- Der Nutzer hat U-04 am 2026-07-15 mit „U-04 ist freigegeben“ erteilt.
- Slice 5 ist damit methodisch entsperrt, bleibt aber bis zu einer separaten
  Beauftragung unangetastet.

## Freigabestatus

- Implementierung durch Codex: abgeschlossen, keine Eigenfreigabe
- Nutzerfreigabe U-04: erteilt am 2026-07-15
- Review durch Gemini/Claude: gemäß Prozessentscheidung nicht erforderlich
- Commit/Push: nicht durch Codex; separate Nutzerentscheidung erforderlich

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-04-START | Nutzer | Slice 4 separat umsetzen | angenommen | Auftrag vom 2026-07-15; Implementierung abgeschlossen |
| S4-01 | Methodikabgleich | Segmentübergreifende Scores würden ungleiche Produktzwecke als Qualitätsrang missdeuten | keine Gesamtpunktzahl oder Rangliste | fünf Segmente mit eigener Interpretation dokumentiert |
| S4-02 | Evidenzabgleich | Fehlende öffentliche Dokumentation beweist keine fehlende Funktion | neutralen Status und strenge Negativregel einführen | Statuslexikon und Suchprotokoll dokumentiert |
| S4-03 | Referenzfallabgleich | Künftige deutsche Einkommensteuerwerte wären erfunden und würden Ergebnisse scheingenau machen | gemeinsame wiederkehrende Einkommen als Netto-Cashflows fixieren; Steuerfähigkeit separat prüfen | RH-01 und K-02 entsprechend getrennt |
| U-04-FREIGABE | Nutzer | Produktstichprobe, Kriterien, Referenzfall und Methodenrahmen | freigegeben | 2026-07-15 – „U-04 ist freigegeben“ |
