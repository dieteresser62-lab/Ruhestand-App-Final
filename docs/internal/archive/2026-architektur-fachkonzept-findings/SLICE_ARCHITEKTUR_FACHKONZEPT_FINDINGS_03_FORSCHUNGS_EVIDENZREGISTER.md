# Slice Findings 03 – Forschungs-Evidenzregister und kompakter Mechanismusabgleich

**Stand:** 2026-07-17<br>
**Status:** implementiert – Review durch Gemini und Nutzerfreigabe ausstehend<br>
**Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)<br>
**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`<br>
**GitHub-Status:** nur lokal angelegt; Veröffentlichung nicht beauftragt

## Ziel

Slice 3 überführt die 55 Forschungsquellen-Records und die ausführlichen
MAP-01-bis-MAP-17-Dossiers verlustfrei in ein normatives Evidenzregister. Der
Forschungsblock im Hauptdokument bleibt mit Evidenzvertrag,
Mechanismusergebnissen, Ergebnisgrenzen, FR-/FQ-Registern und offenen
V4-/V5-Prüfungen eigenständig verständlich.

## Akzeptanzkriterien

- Genau 55 eindeutige FOR-IDs sind im Forschungs-Evidenzregister definiert.
- MAP-01 bis MAP-17 besitzen je einen stabilen, eindeutigen Registeranker und
  sind aus dem Hauptdokument auflösbar.
- Quellenrolle, Übertragbarkeit, Suite-Abweichung, Evidenzstatus, lokale
  Validierungsgrenze sowie Restrisiko bleiben je Mechanismus erhalten.
- FR-01 bis FR-12 und FQ-01 bis FQ-10 bleiben normativ und eindeutig im
  Hauptdokument geführt.
- Keine Literaturzahl wird als Suite-Ergebnis dargestellt; offene V4-/V5-
  Prüfungen bleiben sichtbar.
- Der Forschungsblock ist größer als der Marktblock; Markt und Forschung
  liegen zusammen bei 20 bis 25 Prozent des Haupttextnenners.

## Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`;
- neues `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`;
- diese Slice-Datei;
- Rückdokumentation im Arbeitsplan;
- minimale Auflösung der vorbestehenden FR-ID-Kollision im Marktblock durch
  `FIRE-01`/`FIRE-02`;
- mechanische Prüfung von IDs, Ankern, lokalen Links, Record-/Dossierinhalt
  und Wortumfang.

## Nicht-Scope

- neue Literatur-, Quellen- oder Live-Web-Recherche;
- Aktualisierung des eingefrorenen Forschungsstands 2026-07-15;
- inhaltliche Änderungen am Marktblock oder Änderungen am
  Markt-Evidenzregister;
- Programm-, Test-, Build-, Paket- oder Konfigurationsänderungen;
- Änderungen an `engine.js`, `dist/`, `RuheStandSuite.exe` oder
  `node_modules/`;
- Commit, Push oder Veröffentlichung.

## Branch- und Statusnachweis vor dem ersten Codex-Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git status --short --branch`:
  aktiver Branch wie vorgesehen; keine getrackten Änderungen; vorbestehend
  und außerhalb des Auftrags ausschließlich ungetrackte Playwright-Dateien
  unter `node_modules/`
- `git rev-parse HEAD`:
  `dcbf4c7`
- sicherer Vorgängerstand:
  `docs: Slice 02 (Markt-Evidenzregister und Hauptblock-Kompaktierung) freigegeben`

Die ungetrackten Abhängigkeiten werden weder verändert noch in den Scope
aufgenommen.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md` (neu)
- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_03_FORSCHUNGS_EVIDENZREGISTER.md` (neu)
- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`

**Voraussichtliche Änderungstiefe:**

- mittel; ausschließlich normative Dokumentarchitektur, keine
  Laufzeitsemantik

**Gefährdete bestehende Tests:**

- keine Programmtests;
- redaktionelles Risiko bei FOR-/MAP-Verlust, defekten Ankern,
  Bedeutungsverlust der Mechanismuseinordnung, verdeckten V4-/V5-Lücken oder
  Verfehlen des engen Wortkorridors.

**Nicht anfassen:**

- Programm-, Test-, Build- und Konfigurationsdateien;
- `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`;
- Marktblock und Markt-Evidenzregister mit Ausnahme der zwei notwendigen,
  inhaltsneutralen FIRE-ID-Umbenennungen.

**Rollback-Strategie:**

- bestehende Dokumente gezielt mit `git checkout -- <datei>` zurücksetzen;
- neue Register- und Slice-Datei nur nach ausdrücklicher Nutzerfreigabe
  entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regel für mehr als zehn Programmdateien greift nicht: Slice 3
verändert null Programmdateien.

## Geplante Validierung

- 55 eindeutige FOR-Definitionen zählen und mit dem Vorgängerstand
  inhaltsgleich vergleichen;
- MAP-01 bis MAP-17 vollständig und mit je einem eindeutigen Anker nachweisen;
- je MAP-Dossier alle sieben Pflichtfelder und deren inhaltliche Übernahme
  prüfen;
- FOR-/MAP-/FR-/FQ-Verwendungen, lokale Links und Markdown-Anker mechanisch
  prüfen;
- Marktblock nach Zeilenendennormalisierung und Rücknormalisierung der zwei
  dokumentierten FIRE-ID-Umbenennungen mit dem Vorgängerstand vergleichen;
- Wortzählung nach dem Vertrag aus Slice 1 wiederholen;
- `git diff --check` und abschließenden Scope-Check ausführen.

`npm test` ist für diesen reinen Dokumentationsslice nicht erforderlich. Das
statische Evidenzgate wird erst in Slice 4 implementiert.

## Durchgeführte Änderungen

- `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md` als normativen
  Beleganhang angelegt.
- Die bestehende Evidenztaxonomie, der Zitier-/Aktualitätsstandard, alle 55
  FOR-Recordzeilen, die Mechanismus-Quellen-Matrix, Statusdefinitionen und die
  ausführlichen MAP-01-bis-MAP-17-Dossiers in das Register übernommen.
- Jedem FOR-Record und MAP-Dossier einen eindeutigen stabilen HTML-Anker
  gegeben; Register und Hauptdokument bidirektional verlinkt.
- Den Forschungsblock im Hauptdokument auf Evidenzvertrag, Korpus- und
  Pflegegrenze, Mechanismusgruppen, 17 direkt verlinkte Kurzbewertungen,
  Ergebnisinterpretation, FR-01 bis FR-12, FQ-01 bis FQ-10 und
  Mindeststandard verdichtet.
- Quellenrolle, Übertragbarkeit, Suite-Abweichung, lokaler V1-bis-V3-Nachweis
  sowie offene V4-/V5-Prüfung für jeden Mechanismus in der Kurzbewertung
  sichtbar gehalten.
- Die vorbestehende ID-Kollision zwischen den FIRE-Werkzeug-IDs und den
  Forschungsrisiken durch die inhaltsneutrale Umbenennung `FR-01`/`FR-02` zu
  `FIRE-01`/`FIRE-02` im Marktblock aufgelöst.
- Slice-Datei im Arbeitsplan verlinkt und Implementierungsstand,
  Akzeptanzmessung sowie offenes U-K03-Gate zurückdokumentiert.

## Ergebnisse

### Akzeptanznachweis

| Kriterium | Ergebnis |
| --- | --- |
| 55 von 55 FOR-IDs | 55 inhaltsgleiche Recordzeilen, 55 eindeutige IDs und 55 eindeutige Anker |
| MAP-01 bis MAP-17 | 17 eindeutige Dossieranker und 17 Haupttextlinks; alle Dossiers inhaltsgleich übernommen |
| Dossier-Pflichtfelder | je Mechanismus alle sieben Felder zu Umsetzung, Forschungsanker, Abweichung, Status, lokaler Validierung und Restrisiko vorhanden |
| FR-/FQ-Ownership | genau 12 FR- und 10 FQ-Definitionen im Hauptdokument; keine Kollision mit den nun `FIRE-01`/`FIRE-02` benannten Markt-IDs |
| Literaturzahl vs. Suite-Ergebnis | Aussagegrenze im Hauptdokument und Register ausdrücklich erhalten; entfernte Altzahlen nicht wiedereingeführt |
| offene V4-/V5-Prüfungen | je MAP-Kurzzeile sichtbar; Registerdossiers inhaltsgleich mit vollständiger offener Prüfung |
| eigenständiges Hauptdokument | Evidenzvertrag, Mechanismusergebnis, Ergebnisbündel, Risiken, Forschungsfragen und Mindeststandard ohne Öffnen des Registers verständlich |

### Wortmessung nach dem Vertrag aus Slice 1

| Messgröße | Nach Slice 2 | Nach Slice 3 | Delta |
| --- | ---: | ---: | ---: |
| Nenner | 28.561 | 23.659 | -4.902 |
| Markt | 2.839 | 2.839 | 0 |
| Forschung | 7.842 | 2.940 | -4.902 |
| Markt und Forschung | 10.681 | 5.779 | -4.902 |
| gemeinsamer Anteil | 37,40 % | 24,43 % | -12,97 Prozentpunkte |

Der Forschungsblock ist 101 Wörter größer als der Marktblock. Damit sind
sowohl die Größenrelation als auch der Zielkorridor von 20 bis 25 Prozent
erfüllt. U-K03 bleibt dennoch bis zum adversarialen Review und zur
Nutzerfreigabe offen.

### Ausgeführte Validierung

- FOR-Recordvergleich gegen `HEAD`: 55/55 Recordzeilen; nach Entfernung der
  neuen HTML-Anker 0 Inhaltsdifferenzen.
- Dossiervergleich gegen `HEAD`: MAP-01 bis MAP-17 vollständig; je sieben
  Pflichtfelder; 0 Inhaltsdifferenzen zwischen alter Detailfassung und
  Register.
- ID-/Ankerprüfung: 55 eindeutige FOR-Anker, 17 eindeutige MAP-Anker, 12
  FR-Definitionen und 10 FQ-Definitionen; keine undefinierte explizite FOR-
  oder MAP-ID.
- Haupttext-Querverweise: 17 direkte MAP-Dossierlinks mit vorhandenen Zielen;
  bidirektionaler Hauptdokument-/Registerlink vorhanden.
- Marktblock: nach Rücknormalisierung von `FIRE-01`/`FIRE-02` vollständig
  identisch mit `HEAD`; keine weitere Marktänderung.
- Wortzählung: Nenner 23.659, Markt 2.839, Forschung 2.940, gemeinsam 5.779
  beziehungsweise 24,43 Prozent; Forschung plus 101 Wörter.
- Lokale Markdown-Ziele und explizite HTML-Anker in den geänderten Dokumenten:
  ohne fehlendes Ziel oder doppelten Anker.
- `git diff --check`: grün, keine Ausgabe.
- Scope-Check: ausschließlich die vier geplanten Markdown-Dateien geändert
  beziehungsweise neu angelegt; vorbestehende Playwright-Dateien unter
  `node_modules/` blieben unangetastet.

`npm test` wurde nicht ausgeführt, weil keine Programm-, Test-, Build-, Paket-
oder Konfigurationsdatei und keine Laufzeitsemantik geändert wurden. Das
reguläre Offline-Evidenzgate ist Scope von Slice 4.

## Abweichungen vom Plan

Die mechanische Eindeutigkeitsprüfung zeigte eine vorbestehende Kollision:
`FR-01` und `FR-02` bezeichneten im Marktblock zwei FIRE-Werkzeuge und im
Forschungsblock zugleich zwei Forschungsrisiken. Weil der Slice ausdrücklich
FOR-/MAP-/FR-/FQ-Eindeutigkeit verlangt, wurden ausschließlich diese beiden
Markt-IDs zu `FIRE-01` und `FIRE-02` umbenannt. Produktname, Beschreibung,
Quelle, Wortzahl und Markt-Evidenz blieben unverändert. Der Marktblock weist
darüber hinaus keine Abweichung zu `HEAD` auf.

## Offene Risiken

- Die endgültige redaktionelle Qualität und der nur 101 Wörter große Abstand
  zwischen Forschungs- und Marktblock benötigen adversariales Review; der
  Messvertrag allein bewertet keine Informationsqualität.
- Der statische Validator aus Slice 4 muss die heute mechanisch geprüften
  Pflichtfelder, IDs, Anker, lokalen Links, Stichtage und Fälligkeiten in das
  reguläre Offline-Gate überführen.
- Volatile externe Aussagen bleiben auf den eingefrorenen Stand 2026-07-15
  begrenzt; dieser Slice hat keine Live-Quelle neu erhoben.
- Die in FR-01 bis FR-12 und FQ-01 bis FQ-10 benannten Wirksamkeits- und
  Kalibrierungslücken bleiben offen und sind nicht durch die
  Dokumentverdichtung gelöst.

## Rückdokumentation in den Arbeitsplan

Der Arbeitsplan verlinkt diese Slice-Datei, führt Slice 3 als implementiert mit
ausstehendem Review und dokumentiert Record-/Dossierzahl, Wortmessung,
Größenrelation, Zielkorridor sowie das weiterhin offene U-K03-Gate.

## Freigabestatus

Implementiert. Codex erteilt keine Eigenfreigabe; adversariales Review durch
Gemini und Nutzerfreigabe stehen aus. U-K03, Commit und Push sind nicht
freigegeben beziehungsweise nicht erfolgt.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Auslagerung der 55 Forschungsquellenrecords und der 17 MAP-Dossiers ist vollständig und inhaltsgleich erfolgt. Die ID-Kollision wurde durch die Umbenennung der Markt-IDs `FR-01`/`FR-02` in `FIRE-01`/`FIRE-02` sachlich richtig und ohne Inhaltsdifferenzen gelöst.
2. **Vertragstreue:** Der Wortzählvertrag wurde buchstabengetreu eingehalten. Der Nenner sank auf 23.659 Wörter. Der Marktblock (2.839) und der Forschungsblock (2.940) liegen mit zusammen 24,43 % perfekt im 20-25 %-Zielkorridor. Die Bedingung Forschung > Markt (+101 Wörter) ist erfüllt.
3. **Fehlerbehandlung:** Keine Programmdateien editiert. Die Link- und Ankerstruktur wurde manuell auf Auflösbarkeit verifiziert.
4. **Seiteneffekte:** Durch die Auslagerung gewinnt das Hauptdokument signifikant an Lesbarkeit und Handhabbarkeit, während die Register als eigenständige normative Evidenzanhänge fungieren.
5. **Was könnte brechen?** Wie bei Slice 2 besteht bis Slice 4 ein erhöhtes Risiko für manuelle Linkbrüche bei künftigen Code- oder Doku-Änderungen.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 3) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Zukünftige Erweiterungen von Mechanismen oder Quellen werden nur im Hauptdokument ergänzt, wodurch der enge Zielkorridor von 20-25 % wieder verletzt wird, oder es entstehen fehlerhafte Ankerlinks zwischen Haupttext und Forschungsregister, weil die Links nicht automatisiert geprüft werden.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Link-Integrität:* Risiko von Linkbrüchen bei künftigen Edits vor Einführung des Validators.
  - *Verlust der Zähl-Disziplin:* Gefahr, dass künftige Textänderungen den 20-25 %-Wortzahlkorridor unbemerkt verletzen.
- Pre-Mortem: (Siehe oben – unvollständige Pflege bei künftigen Edits bricht Querverweise oder verletzt den Wortzahlvertrag).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-03 | Nutzer | Slice 03 implementieren | freigegeben am 2026-07-17 | abgeschlossen |
| S03-ID-01 | Codex-Validierung | `FR-01`/`FR-02` kollidierten mit FIRE-Werkzeug-IDs | notwendige Eindeutigkeitskorrektur | zu `FIRE-01`/`FIRE-02` umbenannt; Inhalt unverändert |
