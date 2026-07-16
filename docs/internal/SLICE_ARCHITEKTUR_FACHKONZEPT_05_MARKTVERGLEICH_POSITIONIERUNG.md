# Slice 5: Marktvergleich und Positionierung

**Stand:** 2026-07-15

**Status:** freigegeben; Nutzerfreigabe U-05 am 2026-07-15 erteilt

**Feature-Branch:** `codex/architektur-fachkonzept-doku`

**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push nicht beauftragt

**Übergeordneter Plan:**
[`ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`](ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md)

**Primäres Zieldokument:**
[`docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md)

## Auftrag und Freigabegrundlage

Der Nutzer hat Slice 5 am 2026-07-15 mit „Implementiere slice 05 im doku
Projekt“ separat beauftragt. Slice 4 und der Freigabepunkt U-04 wurden zuvor
vom Nutzer freigegeben. Damit sind Produktstichprobe, Produktstufen,
Segmente, Kriterien K-01 bis K-18, Statuslexikon, Referenzfälle RH-01 bis
RH-04 und Quellenrecord die verbindliche Grundlage dieses Slices.

Für diesen dokumentationsreinen Auftrag gilt die im Arbeitsplan festgehaltene
Prozessentscheidung: Nutzerfreigaben ersetzen Gemini-/Claude-Reviews; Codex
implementiert und dokumentiert, erteilt aber keine Eigenfreigabe und erstellt
keinen Git-Commit.

## Ziel

Die freigegebene Produktstichprobe anhand öffentlicher offizieller Quellen
vergleichbar dokumentieren und die Ruhestand-Suite ausgewogen positionieren.
Der Vergleich soll Produktzweck, Produktstufe, Preis-/Lizenzstand,
Funktionsnachweise und Evidenzlücken sichtbar machen, die Modellierbarkeit des
synthetischen Referenzhaushalts getrennt vom bloßen Vorhandensein einzelner
Features beurteilen und sowohl Konkurrenzstärken als auch Grenzen und
strategische Lücken der Suite benennen.

## Akzeptanzkriterien

- Alle zehn freigegebenen externen Produkte und die Ruhestand-Suite werden in
  ihren Segmenten und auf der in Slice 4 festgelegten Produktstufe behandelt.
- Produktstufe, Preis-/Lizenzstand, Abrufdatum und wesentliche
  Funktionsaussagen besitzen eindeutige offizielle Quellenverweise.
- Die Vergleichsmatrix verwendet ausschließlich das freigegebene
  Statuslexikon; eine Evidenzlücke wird nicht als fehlende Funktion bewertet.
- Jede wesentliche Wettbewerbsbehauptung ist belegt oder ausdrücklich als
  Unsicherheit beziehungsweise nicht öffentlich dokumentiert markiert.
- Die Modellierbarkeit von RH-01 sowie der Proben RH-02 bis RH-04 wird getrennt
  von einer allgemeinen Featureliste und ohne scheinpräzisen Ergebnisvergleich
  eingeordnet.
- Konkurrenzstärken sowie Stärken, Grenzen und strategische Lücken der
  Ruhestand-Suite werden ausgewogen dargestellt.
- Es gibt keine segmentübergreifende Gesamtpunktzahl, Rangliste oder
  unbeschränkte Exklusivitätsbehauptung.
- Positionierung, Nicht-Zielsegmente und Aktualisierungsroutine für volatile
  Produktdaten sind klar formuliert.
- Werbe- und Reviewer-Zitate erscheinen nicht als Tatsachenbeleg.
- Keine Programm-, Test-, Build-, Konfigurations- oder generierte Datei wird
  geändert.
- Der Marktvergleich wird dem Nutzer als U-05 zur Entscheidung vorgelegt;
  Codex erteilt keine Eigenfreigabe.

## Scope

### Primärer Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-MD
- Rückdokumentation im übergeordneten Arbeitsplan

### Bedingter Konsistenz-Scope

Andere Markdown-Referenzen werden nur geändert, wenn der Marktvergleich einen
konkreten Widerspruch zu einer dortigen Markt- oder Positionierungsaussage
erzeugt. Produktdokumentation in Spezialreferenzen wird nicht ohne
nachgewiesenen Konsistenzbedarf erweitert.

### Nicht-Scope

- wissenschaftlicher Quellenkorpus und Evidenztaxonomie aus Slice 6;
- wissenschaftliche Tiefeneinordnung der Suite-Mechanismen aus Slice 7;
- Registrierung, Login, Kauf, Demoanforderung oder Kontaktaufnahme;
- Umgehung von Paywalls, Zugriffssperren oder nicht öffentlichen
  Beraterbereichen;
- numerischer Ergebnisvergleich zwischen unterschiedlichen Rechenmodellen;
- subjektive Produkttests ohne reproduzierbaren öffentlichen Nachweis;
- Änderungen an Laufzeit-, Test-, Build- oder Konfigurationscode;
- Änderungen an Engine-Semantik, Datenverträgen oder öffentlichen APIs;
- manuelle Änderungen an `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Commit, Push oder Veröffentlichung des Branches.

## Branch- und Git-Status vor Start

Ausgeführt am 2026-07-15 vor dem ersten Slice-5-Inhaltsedit:

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
?? docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_04_MARKT_METHODIK.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die sechs geänderten Markdown-Dateien und die fünf projektbezogenen
ungetrackten Markdown-Dateien stammen aus den vorangegangenen Doku-Slices
beziehungsweise deren Arbeitsplan. Die Playwright-Dateien waren bereits vor
dem Dokumentationsprojekt ungetrackt, gehören nicht zum Auftrag und bleiben
unverändert. Der Arbeitsplan weist Commit und Push ausdrücklich als separate
Nutzerentscheidung aus.

## Diff-Risiko vor Umsetzung

**Geplante Dateien:**

- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_05_MARKTVERGLEICH_POSITIONIERUNG.md` (neu)
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`

**Voraussichtliche Änderungstiefe:**

- mittel; umfangreiche quellenbasierte Ergänzung des Marktblocks, aber
  ausschließlich Dokumentation und keine Änderung der Laufzeitsemantik

**Gefährdete bestehende Tests:**

- keine Laufzeittests;
- gefährdet sind eindeutige Zell-/Quellenzuordnung, Aktualität von
  Produktstufen und Preisen, Statuslexikon, Segmentfairness, interne Anker,
  Tabellenkonsistenz und die Grenze zur Forschungseinordnung aus Slice 6/7.

**Nicht anfassen:**

- alle Programm-, Test-, Build-, Konfigurations- und generierten Dateien;
- die wissenschaftliche Quellen- und Methodenbewertung aus Slice 6/7;
- bestehende Dokuänderungen aus Slice 1 bis 4 außerhalb klar abgrenzbarer
  Anschlüsse;
- die vorbestehenden ungetrackten Playwright-Dateien unter `node_modules/`.

**Rollback-Strategie:**

- Änderungen an den zwei bereits veränderten Markdown-Dateien wegen der
  überlappenden, uncommitteten Vorgängerslices nur anhand des dokumentierten
  Slice-5-Diffs zurückführen;
- die neue Slice-5-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- kein pauschales `git checkout`, weil dies freigegebene Änderungen aus Slice
  1 bis 4 überschreiben würde.

## Geplante Recherche und Abgrenzung

- Recherche ausschließlich in öffentlich zugänglichen offiziellen
  Produkt-, Hilfe-, Methoden-, Preis-, Lizenz-, Datenschutz- und
  Barrierefreiheitsquellen.
- Pro wesentlicher Aussage werden Produkt-ID, Quellen-ID, Produktstufe,
  Abrufdatum und Einschränkung nachvollziehbar zugeordnet.
- Nicht zugängliche oder nicht öffentlich dokumentierte Funktionen erhalten
  einen neutralen Status; es werden keine Anmeldungen oder Käufe vorgenommen.
- Marketing-Selbstaussagen werden nur als offizieller Funktionsnachweis und
  nicht als unabhängiger Qualitäts- oder Wirksamkeitsbeleg behandelt.
- RH-01 bis RH-04 werden nur auf öffentlich belegbare Modellierbarkeit und
  erforderliche Workarounds geprüft; Rechenergebnisse verschiedener Produkte
  werden nicht gleichgesetzt.
- Preise werden mit Währung, Abrechnungsart, gegebenenfalls Steuerhinweis und
  Vergleichsstichtag dokumentiert; bei fehlender Veröffentlichung bleibt der
  Preisstatus neutral.

## Geplante Validierung

- Vollständigkeitsaudit gegen alle Aufgaben und Akzeptanzkriterien aus
  Abschnitt 12 des Arbeitsplans;
- Quellenabdeckungsaudit für Produktstufe, Preis/Lizenz und jede wesentliche
  Matrix- beziehungsweise Positionierungsbehauptung;
- Statuslexikon-Audit auf Trennung von `vorhanden`, `teilweise`,
  `nicht öffentlich dokumentiert`, `nicht vorhanden`, `nicht anwendbar` und
  `nicht geprüft`;
- Segmentaudit auf getrennte Interpretation ohne Gesamtpunktzahl oder
  Rangliste;
- Referenzfallaudit auf RH-01 bis RH-04, Workarounds und Unsicherheiten;
- Negativsuche nach unbelegten Absolutheiten, Reviewer-Zitaten und
  undatierten Preisen;
- Markdown-Überschriften-, Anker-, Tabellen-, Quellen-ID- und
  relative-Link-Prüfung;
- Linkerreichbarkeitsprüfung der verwendeten offiziellen Quellen, soweit die
  jeweiligen Server automatisierte Abrufe zulassen;
- `git diff --check`;
- abschließender Scope-Check gegen den vorstehenden Diff-Risiko-Block.

Ein `npm test`-Lauf ist für reine Markdown-Änderungen nicht vorgesehen. Es
werden keine neuen Laufzeit- oder Testergebnisse behauptet.

## Durchgeführte Änderungen

- Der Marktblock im Zieldokument wurde von der freigegebenen Methodik um die
  Abschnitte D.11 bis D.18 erweitert:
  - eingefrorener Stufen-, Zugangs-, Preis- und Lizenzstand für die
    Ruhestand-Suite und zehn externe Produkte;
  - 69 eindeutige Quellenrecords mit Evidenzklasse, Abruf-/Änderungsstand,
    Region, Fundstelle und Aussagegrenze;
  - fünf segmentierte K-01-bis-K-18-Matrizen mit insgesamt 90
    Kriterienzeilen und 198 stufenscharfen Statuszellen;
  - Modellierbarkeitskarte für elf Produktstufen und RH-01 bis RH-04 mit
    44 konservativen Befunden;
  - getrennte Segmentauswertung mit belegten Wettbewerberstärken;
  - Zielgruppe, eng begrenzte Differenzierung, acht eigene strategische
    Lücken, Nicht-Zielsegmente und Aktualisierungsroutine;
  - Freigabepunkt U-05 ohne Eigenfreigabe.
- Der Methodikkopf und der historische U-04-Übergang wurden auf die erfolgte
  Slice-5-Beauftragung aktualisiert.
- Das Quellenkapitel verweist nun auf die vollständigen Records in D.12; der
  Dokumentfuß nennt Slice 5 und U-05 als freigegeben.
- Der übergeordnete Arbeitsplan wurde auf „Slice 5 und U-05 freigegeben –
  Slice 6 bereit zur separaten Beauftragung“ gesetzt, um das
  Umsetzungsergebnis ergänzt und in der Slice-Statuszeile rückdokumentiert.
- Es wurden keine Programm-, Test-, Build-, Konfigurations- oder generierten
  Dateien geändert. Die vorbestehenden Markdown-Änderungen aus Slice 1 bis 4
  und die ungetrackten Playwright-Dateien blieben unangetastet.

## Ausgeführte Validierung

- Branch- und Statuskontrolle:
  - aktiver Branch: codex/architektur-fachkonzept-doku;
  - der abschließende Status entspricht dem dokumentierten Ausgangsbestand
    plus dieser Slice-5-Datei;
  - die übrigen geänderten Referenz-Markdown-Dateien und Slice-Dateien stammen
    aus den vorherigen Slices; node_modules/Playwright bleibt außerhalb des
    Auftrags.
- Öffentliche Quellenprüfung:
  - alle Produktgruppen wurden über offizielle Produkt-, Preis-, Hilfe-,
    Methoden-, Datenschutz-, Sicherheits-, Terms- oder Handbuchseiten
    erhoben;
  - keine Anmeldung, kein Kauf, keine Testphase und kein Beraterzugang;
  - die Schlussprüfung korrigierte den Accessibility-Befund der Digitalen
    Rentenübersicht anhand der offiziellen, am 2026-01-05 aktualisierten
    Erklärung auf „teilweise“;
  - ProjectionLab wurde wegen weiter lauffähiger Legacy-Self-Hosting-
    Installationen unter Offline-Fähigkeit konservativ auf „teilweise“
    gesetzt; MoneyGuide blieb mangels ausdrücklicher Negativaussage „nicht
    öffentlich dokumentiert“.
- Automatischer Marktblock-Audit:
  - 11 Preis-/Stufenzeilen;
  - 90 Kriterienzeilen;
  - 198 Statuszellen aus dem freigegebenen Lexikon;
  - 11 Produktzeilen und 44 zulässige RH-Statuszellen;
  - 69 Quellenrecords, alle eindeutig;
  - keine ungültigen vollständigen oder slash-verkürzten Quellenverweise.
- Markdown-Audit für Zieldokument, Arbeitsplan und Slice-Datei:
  - konsistente Pipe-Anzahl in allen Tabellen;
  - alle relativen Markdown-Ziele vorhanden;
  - Abschluss-Newline vorhanden;
  - kein nachgestellter Whitespace.
- Negativsuche im Slice-5-Marktblock:
  - keine Treffer für „einzigartig“, „kein anderes Tool“,
    „wissenschaftlich bewiesen“, „Marktführer“, Reviewer-Zitat oder
    Symbolwertungen;
  - die drei Vorkommen allgemeiner Wörter wie „alle“ stehen nur in
    Quellen-/Pflegeanweisungen und bilden keine Absolutheitsbehauptung.
- git diff --check: erfolgreich ohne Ausgabe.
- Scope-Prüfung: keine neue Programm- oder generierte Datei im Diff; nur die
  drei vorab benannten Slice-5-Markdown-Dateien wurden für diesen Slice
  bearbeitet.
- npm test wurde nicht ausgeführt, weil ausschließlich Markdown geändert und
  kein neues Laufzeit- oder Testergebnis behauptet wurde.

## Abweichungen vom Plan

- Keine Scope-Abweichung.
- Die Recherche führte zu zwei konservativen Statuskorrekturen gegenüber der
  ersten Arbeitsannahme: Digitale Rentenübersicht K-16 auf „teilweise“ sowie
  ProjectionLab K-12 auf „teilweise“. MoneyGuide K-12 blieb neutral. Diese
  Änderungen folgen dem Statuslexikon und sind keine Erweiterung des
  Produktumfangs.
- Der vollständige automatisierte HEAD-Check aller externen Links wurde nicht
  als eigener Beleg verwendet, weil dynamische Anbieter- und PDF-Seiten
  automatisierte Abrufe unterschiedlich behandeln. Verwendet wurden die im
  Recherchefenster tatsächlich aufgerufenen offiziellen Zielseiten; jede
  Einschränkung steht im Quellenrecord.

## Offene Risiken

- Preise, Tarife, Produktnamen, Hilfeseiten und Nutzungsbedingungen können
  nach dem Stichtag veralten; D.17 setzt deshalb die nächste Prüfung spätestens
  auf 2026-10-15 und definiert ereignisgetriebene Rechecks.
- eMoney Pro und Teile der Berater-/Premium-Produkte bleiben ohne
  freigegebenen Zugang öffentlich nur begrenzt prüfbar. Ihre neutralen
  Dokumentationsbefunde dürfen nicht als Funktionsabwesenheit gelesen werden.
- Öffentliche Anbieterquellen belegen zugesagte Funktionen, nicht deren
  Qualität, Fehlerfreiheit oder reale Wirksamkeit.
- Die Ruhestand-Suite besitzt keine externe Prognose-, Kalibrierungs- oder
  Entscheidungsvalidierung und keinen vollständigen UX-/WCAG-Nachweis.
- Die im Repository sichtbare MIT-Lizenz widerspricht dem ISC-Feld in
  package.json; Cargo.toml enthält keine Lizenz. Slice 5 dokumentiert diese
  Lücke, ändert die Metadaten aber nicht.

## Rückdokumentation in den Arbeitsplan

- Kopfstatus auf „Slice 5 und U-05 freigegeben – Slice 6 bereit zur separaten
  Beauftragung“ aktualisiert.
- Umsetzungsergebnis in Abschnitt 12 ergänzt.
- Slice-Statuszeile 5 auf „freigegeben“ gesetzt.
- U-05 mit Datum und Nutzerformulierung in der Freigabetabelle dokumentiert.
- Slice 6 wurde nicht begonnen.

## Ergebnisse

- Die freigegebene Stichprobe ist zum Stichtag 2026-07-15 reproduzierbar und
  ohne Gesamtscore dokumentiert.
- Jede Matrixzelle besitzt einen zulässigen Status und mindestens einen
  eindeutigen Beleg- oder Suchprotokollverweis.
- RH-01 bis RH-04 trennen native Modellierung, dokumentierte Workarounds,
  grobe Näherung und nicht prüfbare Fälle; numerische Ergebnisse werden nicht
  scheinpräzise verglichen.
- Konkurrenzstärken sowie eigene Stärken, Grenzen und strategische Lücken sind
  gemeinsam sichtbar.
- Die Positionierung ist auf Stichprobe, Produktstufe, öffentliche Evidenz und
  Stichtag begrenzt.
- Die technische Umsetzung von Slice 5 ist abgeschlossen; der Nutzer hat die
  fachliche Abnahme U-05 am 2026-07-15 erteilt.

## Freigabestatus

- Implementierung durch Codex: inhaltlich abgeschlossen, keine Eigenfreigabe
- Nutzerfreigabe U-05: erteilt am 2026-07-15 – „U-05 freigegeben“
- Review durch Gemini/Claude: gemäß Prozessentscheidung nicht erforderlich
- Commit/Push: nicht durch Codex; separate Nutzerentscheidung erforderlich

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-05-START | Nutzer | Slice 5 separat umsetzen | angenommen | Auftrag vom 2026-07-15; Umsetzung gestartet |
| U-05-E01 | offizielle ZfDR-Quelle | formale Accessibility-Selbsterklärung mit dokumentierten Restmängeln vorhanden | Status nicht neutral lassen | MKT-DR-04 ergänzt; K-16 auf „teilweise“ |
| U-05-E02 | offizielle ProjectionLab-/MoneyGuide-Quellen | Offline-Negativbefunde waren enger zu formulieren | konservatives Statuslexikon anwenden | ProjectionLab „teilweise“, MoneyGuide „nicht öffentlich dokumentiert“ |
| U-05-READY | Codex-Umsetzung | Akzeptanzkriterien technisch abgearbeitet | keine Eigenfreigabe | Marktvergleich wird dem Nutzer als U-05 vorgelegt |
| U-05-APPROVAL | Nutzer | „U-05 freigegeben“ | angenommen | Nutzerfreigabe am 2026-07-15 in Slice, Arbeitsplan und Hauptdokument rückdokumentiert |
