# Slice 3: Fachkonzept, Annahmen und Modellgrenzen

**Stand:** 2026-07-15

**Status:** durch den Nutzer freigegeben

**Feature-Branch:** `codex/architektur-fachkonzept-doku`

**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push nicht beauftragt

**Übergeordneter Plan:**
[`ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`](ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md)

**Primäres Zieldokument:**
[`docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md)

## Auftrag und Freigabegrundlage

Der Nutzer hat Slice 3 am 2026-07-15 mit „Implementiere slice 03 des Doku
Projekt“ separat beauftragt. Slice 2 wurde zuvor vom Nutzer freigegeben. Für
diesen dokumentationsreinen Auftrag gilt die im Arbeitsplan festgehaltene
Prozessentscheidung: Nutzerfreigaben ersetzen Gemini-/Claude-Reviews; Codex
implementiert und dokumentiert, erteilt aber keine Eigenfreigabe und erstellt
keinen Git-Commit.

Nach Meldung der beiden code-/UI-seitigen Vertragsabweichungen entschied der
Nutzer am 2026-07-15 mit „Punkt 1 ist auch mein Weg“, Slice 3
dokumentationsrein fortzusetzen. Die Abweichungen werden deshalb als offene
Produktmängel beschrieben und nicht durch eine nachträgliche Soll-Erklärung
oder eine nicht beauftragte Codeänderung verdeckt.

## Ziel

Das Fachkonzept so vervollständigen, dass zentrale Begriffe,
Rechnungszeitpunkte, Fachinvarianten, Annahmen und Modellgrenzen eindeutig und
gegen die aktuelle Implementierung prüfbar beschrieben sind. Produktfunktionen,
automatische Policies, operative Nutzerentscheidungen und nicht implementierte
beziehungsweise nur vereinfachte Modellbestandteile werden klar getrennt. Der
Dokumenttext darf keine neue Laufzeit- oder Engine-Semantik erzeugen.

## Akzeptanzkriterien

- Floor, Flex, Bedarf, reale und nominale Werte, Runway, Reserve, Erfolg,
  Ruin und Pflegebucket sind eindeutig definiert.
- Rechnungs- und Zeitkonventionen für Jahresanfang und Jahresende, Inflation,
  Rentenzufluss, Verkäufe, Steuer-Settlement, Tod und Pflegeereignisse sind
  implementierungsgetreu dokumentiert.
- Anlagenmodell, unterstützte Asset-Grenzen und Zielgruppe sind präzise
  abgegrenzt.
- Gebühren, Transaktionskosten, Währungen, Datenrekonstruktion sowie Steuer-
  und Regulierungsänderungen sind als implementierte Funktion, Annahme oder
  Grenze klassifiziert.
- Ein strukturiertes Annahmen- und Modellrisikoregister nennt Wirkung,
  Behandlung und verbleibende Grenze.
- Zentrale Fachinvarianten und die Beziehungen zwischen Floor/Flex,
  Guardrails, VPW, Runway, Steuern, Rente und Pflege sind verständlich
  zusammengeführt.
- Operative Nutzerentscheidungen und automatische Policies sind ausdrücklich
  getrennt.
- Es wird keine neue fachliche Semantik durch Dokumentation erfunden.
- Jeder Widerspruch, der nur per Codeänderung lösbar wäre, wird als Stop-Punkt
  gemeldet.
- Keine Programm-, Test-, Build-, Konfigurations- oder generierte Datei wird
  geändert.

## Scope

### Primärer Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-MD
- Rückdokumentation im übergeordneten Arbeitsplan

### Bedingter Konsistenz-Scope

Folgende Referenzen werden gelesen und nur bei einem konkret nachgewiesenen
fachlichen Widerspruch geändert:

- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/DATA_SOURCES.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TRANCHEN_MODULES_README.md`
- `engine/README.md`
- `tests/README.md`

### Nicht-Scope

- Änderungen an Laufzeit-, Test-, Build- oder Konfigurationscode;
- Änderungen an Engine-Semantik, Datenverträgen oder öffentlichen APIs;
- manuelle Änderungen an `engine.js`, `dist/` oder `RuhestandSuite.exe`;
- Wettbewerbsrecherche, Marktpositionierung oder wissenschaftliche Bewertung
  aus den Slices 4 bis 7;
- Commit, Push oder Veröffentlichung des Branches.

## Branch- und Git-Status vor Start

Ausgeführt am 2026-07-15 vor dem ersten Slice-3-Edit:

```text
git branch --show-current
codex/architektur-fachkonzept-doku

git status --short
 M README.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/DATA_SOURCES.md
 M docs/reference/TECHNICAL.md
 M engine/README.md
?? docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md
?? docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_01_BESTAND_STRUKTUR.md
?? docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_02_ARCHITEKTUR_CONTRACTS.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die fünf geänderten Markdown-Dateien und die drei projektbezogenen
ungetrackten Markdown-Dateien stammen aus den vom Nutzer freigegebenen Slices
1 und 2. Die Playwright-Dateien waren bereits vor Slice 3 ungetrackt, gehören
nicht zum Auftrag und bleiben unverändert. Der Arbeitsplan weist Commit und
Push ausdrücklich als separate Nutzerentscheidung aus.

## Diff-Risiko vor Umsetzung

**Geplante Dateien:**

- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_03_FACHKONZEPT_MODELLGRENZEN.md`
  (neu)
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`
- weitere Markdown-Referenzen nur nach dokumentiertem Konsistenzbefund

**Voraussichtliche Änderungstiefe:**

- mittel; umfangreiche fachliche Konsolidierung, aber ausschließlich
  Dokumentation und keine Änderung der Laufzeitsemantik

**Gefährdete bestehende Tests:**

- keine Laufzeittests;
- gefährdet sind Markdown-Anker, Begriffs- und Zeitkonsistenz sowie die
  unbeabsichtigte Beschreibung neuer Semantik.

**Nicht anfassen:**

- alle Programm-, Test-, Build-, Konfigurations- und generierten Dateien;
- Marktvergleich und wissenschaftliche Bewertung außerhalb notwendiger
  Querverweise;
- die vorbestehenden ungetrackten Playwright-Dateien unter `node_modules/`.

**Rollback-Strategie:**

- Änderungen an bereits getrackten Dateien wegen der überlappenden,
  uncommitteten Slices 1 und 2 nur nach vorheriger Diff-Trennung dateiweise
  zurückführen;
- die neue Slice-3-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- Arbeitsplan und Hauptdokument anhand des dokumentierten Slice-3-Diffs
  getrennt von den vorhandenen Slice-1/2-Änderungen zurückführen.

## Geplanter Source-of-Truth-Abgleich

- Fachbegriffe und UI-Semantik: Balance-/Simulator-Einstiegspunkte, Binder,
  UI-nahe Fachmodule und Referenzdokumente.
- Rechnungsreihenfolge: Engine-Core, Jahresschritt-, Renten-, Steuer-, Pflege-
  und Tod/Langlebigkeitsmodule samt Contracttests.
- Floor/Flex, Guardrails, VPW und Runway: Entnahmemodule, Parameterverträge,
  Result Builder sowie zugehörige Tests.
- Anlagen, Gebühren, Transaktionskosten, Währungen und Datenrekonstruktion:
  Portfolio-, Kosten-, Steuer-, Tranchen- und Marktdatenmodule samt
  Datenquellenreferenz.
- Nutzerentscheidung versus Automatik: UI-Orchestrierung, Optimierungs- und
  Policygrenzen sowie dokumentierte Defaults.

## Geplante Validierung

- gezielter Source-of-Truth-Abgleich aller neu formulierten Fachverträge;
- Begriffsaudit für Glossarbegriffe und ihre Verwendung im Dokument;
- Reihenfolgeaudit der beschriebenen Jahresereignisse gegen Engine und
  Balance-Jahresworkflow;
- Suche nach unqualifizierten Aussagen zu Gebühren, Kosten, Währungen,
  Steuern, Pflege, Erfolg und Ruin;
- Markdown-Überschriften-, Anker-, Tabellen- und relative-Link-Prüfung;
- `git diff --check`;
- abschließender Scope-Check gegen den vorstehenden Diff-Risiko-Block.

Ein `npm test`-Lauf ist für reine Markdown-Änderungen nicht vorgesehen. Die
ausführbaren Tests werden als Vertragsquelle gelesen, nicht als neu
ausgeführte Ergebnisbaseline ausgegeben. Falls eine Aussage nur durch einen
aktuellen Lauf belastbar wäre, wird sie eingegrenzt oder als Stop-Punkt
gemeldet.

## Befunde und Nutzerentscheidung aus dem Source-of-Truth-Abgleich

### S3-STOP-01: Pflegekosten-Drift besitzt widersprüchliche Einheit

Das Simulator-UI beschreibt `pflegeKostenDrift = 3,5` als zusätzlichen
Kostenanstieg von 3,5 Prozent pro Jahr. `readCareInputs()` teilt den UI-Wert
bereits durch 100 und liefert `0,035`. `updateCareMeta()` behandelt diesen
Wert erneut als Prozentangabe und teilt nochmals durch 100. Im aktuellen
Laufzeitpfad wirken daher 0,035 Prozent statt der im UI beschriebenen
3,5 Prozent. UI-Vertrag, Reader-Vertrag und Rechenlogik sind damit nicht
eindeutig synchronisiert.

Eine Dokumentation als beabsichtigte Fachsemantik würde entweder die
UI-Aussage oder die aktuelle Rechenwirkung falsch wiedergeben. Die Korrektur
erfordert eine Codeentscheidung und liegt außerhalb des Slice-3-Scopes.

**Entscheidung:** Als Modellrisiko MR-10 und offener Produktmangel PD-02 im
Hauptdokument dokumentiert; keine Codeänderung in Slice 3.

### S3-STOP-02: Simulator-KPI `jahresentnahme_real` wird nicht deflationiert

`simulator-year-result.js` berechnet `jahresentnahme_real` als effektive
Jahresentnahme geteilt durch `spendingNewState.cumulativeInflationFactor`.
Der Simulator initialisiert diesen Engine-State ohne kumulierten Faktor und
schreibt ihn im mehrjährigen Simulatorpfad nicht fort; nur der separate
Balance-Jahresworkflow aktualisiert dieses Feld. Damit entspricht die
Simulator-KPI im aktuellen Pfad faktisch der nominalen Entnahme, obwohl UI und
Ergebnistext sie als real beziehungsweise inflationsbereinigt bezeichnen.

Eine echte Basisjahr-Deflation oder eine Umbenennung der KPI benötigt eine
Code-/UI-Entscheidung und liegt außerhalb des dokumentationsreinen Slice 3.

**Entscheidung:** Als Modellrisiko MR-09 und offener Produktmangel PD-01 im
Hauptdokument dokumentiert; abhängige Entnahme-KPIs werden bis zur Korrektur
als nominal eingegrenzt.

### S3-BEFUND-03: Depoterschöpfungslabel ist breiter als die Metrik

`depotErschoepfungsQuote` zählt einen fehlgeschlagenen Lauf oder einen
Aktien-plus-Gold-Endbestand von höchstens 100 Euro. Freie Liquidität und ein
verbleibender Pflegebucket gehören nicht zu dieser Teilgröße; die UI-Aussage
„Depot vollständig aufgebraucht“ ist daher weiter als die tatsächliche
Berechnungsbasis.

**Entscheidung:** Als Modellrisiko MR-08 und offener Produktmangel PD-03
dokumentiert. Die bestehende Berechnung und UI bleiben in Slice 3 unverändert.

### Nutzerentscheidung zur Fortsetzung

Der Nutzer wählte am 2026-07-15 ausdrücklich den dokumentationsreinen Weg.
Damit war der zuvor gemeldete Stop-Punkt für diesen Slice aufgelöst: Die
Fachkonzeptarbeit wurde fortgesetzt, ohne die widersprüchlichen Laufzeitpfade
als beabsichtigte Semantik darzustellen. Ein späteres Code-Hardening bleibt ein
separater Auftrag.

## Durchgeführte Änderungen

- Slice-MD einschließlich Branch-/Status- und Diff-Risiko-Dokumentation
  angelegt.
- Source-of-Truth-Abgleich durchgeführt; S3-STOP-01, S3-STOP-02 und
  S3-BEFUND-03 reproduzierbar eingegrenzt und nach Nutzerentscheidung als
  PD-01 bis PD-03 dokumentiert.
- Hauptbereich in `Fachkonzept und Rechenkonventionen` umbenannt und mit
  lokaler Navigation, verbindlichem Glossar, Jahreszeitachse,
  Rentenkonvention, Fachinvarianten und der Trennung von Nutzerentscheidung
  und automatischer Policy ergänzt.
- Floor-/Flex-Vertrag auf aktuelle nominale Jahreswerte und die tatsächliche
  Reihenfolge VPW → Guardrails → Mindest-Flex → Budget/Glättung korrigiert.
- Steuerkapitel auf parametrisiertes Settlement, signierte Rohwerte,
  tatsächliche Verkaufsreihenfolge und explizite Steuerflags eingegrenzt;
  automatische Altbestands-/Gold-Haltedauerannahmen und pauschale
  SPB-Defaults entfernt.
- Pflegekapitel auf effektiven PG1/PG2-Neueintritt, anschließende Progression,
  aktuelle UI-Defaults, Cap-/Ramp-Verhalten, konfigurierbare
  Mortalitätsfaktoren und den offenen Driftfehler aktualisiert.
- Ergebnissemantik für Erfolg, Ruin, Depoterschöpfung, Endvermögen, Runway,
  reale/nominale Entnahme und Optimierereinheiten präzisiert.
- Rentenkapitel auf die tatsächliche Floor-/Flex-Verrechnung, den nur für
  Person 2 vorhandenen Pauschalabzug und die verzögerte Aktivierung einer
  Hinterbliebenenleistung korrigiert.
- Eigenen Hauptbereich `Annahmen, Modellgrenzen und Validierung` mit
  Zielgruppen-/Asset-Grenze, Reservetaxonomie, 13 Annahmen, 12 Modellrisiken,
  drei offenen Produktmängeln, Ergebnisregister und sechs Validierungsstufen
  ergänzt.
- Nachgewiesene Konsistenzwidersprüche in `README.md`,
  `docs/reference/TECHNICAL.md` und
  `docs/reference/SIMULATOR_MODULES_README.md` korrigiert. Laufzeitcode,
  Tests, Konfigurationen und generierte Artefakte blieben unverändert.

### Verwendete Implementierungsquellen

| Fachbereich | Primär abgeglichene Quellen |
|-------------|-----------------------------|
| Jahresstate, Inflation und Entnahme | `simulator-engine-helpers.js`, `simulator-engine-direct.js`, `simulator-year-result.js`, Engine-Spending-/VPW-Module |
| Rente, Tod und Pflege | `simulator-household-pension.js`, `mc-life-events.js`, `simulator-engine-helpers.js`, `simulator-data.js`, Pflege-Input/UI |
| Steuer und Verkäufe | `sale-engine.mjs`, `tax-settlement.mjs`, Simulator-Steuer-Recompute und Tranchen-Reconciliation |
| Erfolg und Ergebnis-KPIs | `monte-carlo-runner.js`, `mc-run-metrics.js`, `monte-carlo-aggregates.js`, `simulator-results.js`, Sweep-/Optimizer-Aggregation |
| Kosten, Währung und Realbestand | Tranchen-Preisservice, EUR-Quote-Contract, Reconciliation sowie Datenquellenreferenz |

## Ausgeführte Validierung

- Feature-Branch erneut als `codex/architektur-fachkonzept-doku` bestätigt.
- Source-of-Truth-Audits für Zeitachse, Floor/Flex/VPW/Runway, Steuer,
  Rente, Pflege, Ruin/Erfolg, Kosten und Währung gegen die vorstehend genannten
  Module durchgeführt.
- Strukturprüfung über zehn betroffene beziehungsweise verknüpfte
  Markdown-Dateien: gerade Code-Fences, keine Heading-Level-Sprünge und
  konsistente Tabellenmarker.
- Relative Markdown-Links und GitHub-kompatible Heading-Anker in denselben
  zehn Dateien geprüft; ein zunächst falscher Doppelbindestrich-Anker wurde
  korrigiert, Abschlussprüfung danach ohne Befund.
- 22 verpflichtende Fachkonzept-/Grenzenmerkmale automatisiert auf Vorhandensein
  geprüft.
- Veraltete Steuer-/Pflegeformulierungen zu festem SPB, automatischem
  Altbestand, automatischer Gold-Steuerfreiheit, FIFO-Tie-Breaker und fester
  Mortalitätstabelle per Negativsuche ausgeschlossen.
- `git diff --check` ohne Whitespace-Fehler.
- Scope-Prüfung: keine Programm-, Test-, Build-, Konfigurations- oder
  generierte Datei durch Slice 3 geändert; vorbestehende Playwright-Dateien
  unter `node_modules/` unberührt.
- Kein `npm test`: ausschließlich Markdown geändert; es wird kein neuer
  Laufzeitteststatus behauptet.

## Abweichungen vom Plan

- Umsetzung vor dem ersten Hauptdokument-Edit wegen zweier nur per
  Codeentscheidung auflösbarer Vertragswidersprüche angehalten und nach
  ausdrücklicher Nutzerentscheidung dokumentationsrein fortgesetzt.
- Zusätzlich zum geplanten Hauptdokument wurden drei bedingte
  Konsistenzreferenzen geändert: `README.md` und `TECHNICAL.md` wegen der
  faktisch nominalen Real-CaR-Basis sowie `SIMULATOR_MODULES_README.md` wegen
  der falschen Gleichsetzung von Ruin und Depot-≤-100-Euro-Metrik.

## Offene Risiken

- Eine unqualifizierte Dokumentation des Pflegekostenanstiegs würde entweder
  die UI-Einheit oder die aktuelle Laufzeitwirkung falsch darstellen.
- Die als real bezeichnete Simulator-Entnahme-KPI kann derzeit nominale Werte
  als inflationsbereinigt erscheinen lassen.
- Die UI-Formulierung zur vollständigen Depoterschöpfung kann trotz
  verbleibender freier Liquidität oder Pflegebucket ausgelöst werden.
- Die externen Evidenz- und Kalibrierungsfragen zu Daten, Marktmethodik,
  Pflege und Mortalität bleiben bewusst den späteren Recherche-Slices
  vorbehalten; Implementierungsparität ist kein Wirksamkeitsnachweis.

## Rückdokumentation in den Arbeitsplan

- Slice-3-Datei im Paketregister verlinkt.
- Slice 3 als freigegeben mit Nutzerfreigabe vom 2026-07-15 eingetragen.
- Ergebnis, Nutzerentscheidung zu den Produktmängeln und erteilte Freigabe
  U-03 im Slice-3-Abschnitt ergänzt.

## Ergebnisse

- Pre-Coding-Gates erfüllt und Fachkonzeptblock implementiert.
- Die Akzeptanzkriterien sind implementierungsseitig abgearbeitet; eine
  Eigenfreigabe durch Codex erfolgt nicht.
- U-03 wurde durch den Nutzer am 2026-07-15 erteilt. Slice 4 bleibt bis zu
  einer separaten Beauftragung unangetastet.

## Freigabestatus

- Implementierung durch Codex: abgeschlossen, keine Eigenfreigabe
- Nutzerfreigabe U-03 des Architektur- und Fachkonzeptblocks: erteilt am 2026-07-15
- Review durch Gemini/Claude: gemäß Prozessentscheidung nicht erforderlich
- Commit/Push: nicht durch Codex; separate Nutzerentscheidung erforderlich

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-03-START | Nutzer | Slice 3 separat umsetzen | angenommen | Auftrag vom 2026-07-15; Implementierung abgeschlossen |
| U-S3-01 | Nutzer | Gefundene Laufzeitwidersprüche dokumentationsrein als offene Produktmängel behandeln | angenommen | Entscheidung „Punkt 1 ist auch mein Weg“ vom 2026-07-15 umgesetzt |
| U-03-FREIGABE | Nutzer | Architektur- und Fachkonzeptblock nach Slice 2 und 3 freigeben | freigegeben | 2026-07-15 – „Die Nutzerfreigabe u-03 ist erteilt“ |
| S3-STOP-01 | Source-of-Truth-Abgleich | Pflegekosten-Drift wird zwischen UI, Reader und Rechenlogik doppelt skaliert | als offener Produktmangel dokumentieren | MR-10 / PD-02; kein Code geändert |
| S3-STOP-02 | Source-of-Truth-Abgleich | Simulator-KPI `jahresentnahme_real` wird im mehrjährigen Pfad nicht mit einem fortgeschriebenen kumulierten Inflationsfaktor deflationiert | als offener Produktmangel dokumentieren | MR-09 / PD-01; abhängige KPIs eingegrenzt |
| S3-BEFUND-03 | Source-of-Truth-Abgleich | Depoterschöpfungslabel umfasst eine engere Vermögensbasis als die Formulierung nahelegt | als offener Produktmangel dokumentieren | MR-08 / PD-03; Berechnungsbasis erklärt |
