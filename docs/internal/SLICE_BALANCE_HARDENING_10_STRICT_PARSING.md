# Slice Balance Hardening 10: Striktes Zahlen- und CSV-Parsing

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** durch Codex implementiert; Review/Freigabe ausstehend

**Prioritaet:** P2  
**Abhaengigkeit:** Slices 04, 05 und 08

## Ziel

Fachlich relevante Eingaben und CSV-Daten werden vollstaendig validiert. Teilstrings, ungueltige Kalenderdaten und unvollstaendige Zeitreihen werden nicht still als Zahl, Null oder Leerfeld akzeptiert.

## Akzeptanzkriterien

- Zahlenparser akzeptieren definierte deutsche/englische Formate nur als vollstaendigen String.
- `12abc`, mehrdeutige Separatoren, `Infinity` und leere Pflichtfelder erzeugen strukturierte Fehler.
- Gueltige Nullwerte bleiben von fehlenden/ungueltigen Werten unterscheidbar.
- CSV-Datumswerte werden auf echtes Kalenderdatum und Zieljahr geprueft.
- Markt-CSV verlangt alle fuer den Contract notwendigen Jahreswerte oder meldet exakt, welche fehlen.
- Ausgaben-CSV behandelt reservierte Objekt-Keys sicher und verwirft keine Zeilen still ohne Zusammenfassung.
- `minimumFlexAnnual` muss endlich sein und `0 <= minimumFlexAnnual <= flexBedarf` erfuellen. Negative Werte erzeugen `Mindest-Flex p.a. darf nicht negativ sein.`; Werte oberhalb `flexBedarf` erzeugen die bestehenden feldbezogenen Fehler fuer `minimumFlexAnnual` und `flexBedarf`. Bei Reject bleibt der eingegebene Wert sichtbar, Engine-Aufruf und Persistenz werden blockiert; es findet kein Clamp statt.

## Scope

Programmdateien, maximal 7 (Scope-Erweiterung durch Nutzer am 2026-07-14 bestaetigt; aktuelle `AGENTS.md`-Grenze: 10):

- `app/balance/balance-utils.js`
- `app/balance/balance-reader.js`
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-expenses-csv.js`
- `tests/balance-reader.test.mjs`
- `tests/balance-expenses.test.mjs`
- `tests/balance-smoke.test.mjs` (bestehendes Mock-DOM an die bereits im realen HTML vorbelegten Pflichtfelder angleichen)

## Nicht-Scope

- Engine-Validator aendern;
- allgemeiner CSV-Frameworkwechsel;
- Simulator-Parser.

## Diff-Risiko vor Start

**Erfasst am:** 2026-07-14, vor dem ersten Code-Edit

**Aktiver Branch:** `codex/balance-app-hardening` (entspricht dem Arbeitsplan)

**Git-Status vor Coding:** ausschliesslich unversionierte Playwright-Installationsdateien unter `node_modules/.bin/`, `node_modules/playwright/` und `node_modules/playwright-core/`; diese vorhandenen Fremdaenderungen bleiben unangetastet.

**Geplante Dateien:**

- `app/balance/balance-utils.js`
- `app/balance/balance-reader.js`
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-expenses-csv.js`
- `tests/balance-reader.test.mjs`
- `tests/balance-expenses.test.mjs`
- `tests/balance-smoke.test.mjs`
- ergaenzend nur diese Slice-MD und der uebergeordnete Hauptplan

**Voraussichtliche Aenderungstiefe:** **riskant**, weil viele bestehende Eingaben durch den gemeinsamen Parser laufen.

**Gefaehrdete bestehende Tests:** Reader, Formatting, Expenses, Import, UI-Orchestrierung und Browser-Smoke.

**Nicht anfassen:** Engine, Simulator-Parser, Shared-Formatter, generierte Artefakte und die vorhandenen unversionierten Playwright-Dateien.

**Rollback-Strategie:** die sieben Scope-Dateien sowie die beiden Dokumentationsdateien gezielt per `git checkout -- <datei>` zuruecksetzen; vorhandene Fremdaenderungen nicht veraendern.

## Umsetzungsschritte

1. Parser-Contract mit `valid/value/error` statt stiller Null definieren, ohne alle Aufrufer auf einmal zu brechen.
2. Kritische Balance-Reader-/Importpfade auf strikt umstellen.
3. Markt-CSV auf Header, Datum und historische Vollstaendigkeit pruefen.
4. Ausgaben-CSV mit Null-Prototyp-Map und Importzusammenfassung haerten.
5. Positiv-/Negativmatrix fuer deutsche und englische Formate testen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-reader.test.mjs
node tests\run-single.mjs tests\balance-expenses.test.mjs
node tests\run-single.mjs tests\formatting.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
npm test
npm run test:browser
```

## Durchgefuehrte Aenderungen

- `parseLocalizedNumber()` liefert fuer deutsche und englische Vollformate einen stabilen `valid/value/error`-Contract mit den Codes `number_required`, `number_invalid_format`, `number_ambiguous_separator` und `number_non_finite`. Gueltige `0`, optionales Missing und ungueltige Werte bleiben unterscheidbar; der bestehende `parseCurrency()`-Aufruf behaelt fuer noch nicht migrierte Legacy-Aufrufer den 0-Fallback.
- `balance-reader.js` verwendet den strukturierten Contract fuer alle Waehrungsfelder. Leere Pflichtfelder `floorBedarf`, `flexBedarf` und `minimumFlexAnnual` sowie ungueltige nichtleere optionale Werte liefern feldbezogene `ValidationError`-Eintraege. Optionale Leerwerte bleiben kompatibel bei 0.
- `minimumFlexAnnual` wird im echten Update-Pfad fuer leer, nicht endlich, negativ und oberhalb `flexBedarf` ohne Clamp abgewiesen. Der sichtbare Eingabewert bleibt stehen; Engine und Persistenz werden nicht aufgerufen.
- Markt-CSV wird vor jeder DOM-Mutation auf Pflichtheader, einheitliche Spaltenzahl, vollstaendige Zahlen, eindeutige Daten, echte `DD.MM.YYYY`-Kalenderdaten und die drei exakten Vorjahre relativ zum letzten Stichtag geprueft. Ein Stichtag 29.02. faellt in Nicht-Schaltjahren auf 28.02. zurueck. Fehlende Jahre und verworfene Zeilen werden strukturiert und im Nutzertext genannt.
- Ausgaben-CSV verlangt die Header `Kategorie` und `Betrag`, prueft jede nichtleere Zeile und bricht bei Teilfehlern mit einer Importzusammenfassung ab. Kategorien werden in einer Null-Prototyp-Map aggregiert; `__proto__`, `constructor`, `toString` und `importSummary` bleiben sichere normale Kategorien. Metadaten liegen kollisionsfrei an einem nicht enumerierbaren Symbol.
- Der Balance-Smoke-Fixture belegt nun dieselben drei Pflichtfelder vor, die auch `Balance.html` mit Startwerten versieht, und prueft die fail-closed Mindest-Flex-Matrix einschliesslich unveraendert sichtbarem Rohwert.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-reader.test.mjs` -> **94/94**, gruen.
- `node tests\run-single.mjs tests\balance-expenses.test.mjs` -> **gruen** (Datei nutzt `node:assert`, der Single-Runner weist deshalb keine eigene Assertion-Anzahl aus).
- `node tests\run-single.mjs tests\formatting.test.mjs` -> **19/19**, gruen.
- `node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs` -> **115/115**, gruen.
- `node tests\run-single.mjs tests\balance-decumulation.test.mjs` -> **38/38**, gruen.
- `node tests\run-single.mjs tests\balance-smoke.test.mjs` -> **gruen**, einschliesslich leer/`Infinity`/negativ/oberhalb Flex und Engine-/Persistenzsperre.
- `npm test` -> **103 Testdateien, 3356/3356 Assertions, 0 Fehler, 0 offene Handles**.
- `npm run test:browser` -> **alle fuenf Einstiegspunkte gruen** (`index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html`, `Handbuch.html`).
- `git diff --check` -> **gruen**.

## Abweichungen vom Plan

- Der urspruengliche Fuenf-Dateien-Scope liess `balance-reader.js` aus, obwohl Umsetzungsschritt 2 den kritischen Reader-Pfad explizit verlangt. Ein erster global fail-closed Versuch im gemeinsamen Legacy-Aufruf deckte diesen Widerspruch durch einen roten Smoke-Test auf, weil optionale leere Profilwerte erlaubt sind.
- Nach Nutzerhinweis auf die inzwischen auf zehn Programmdateien erhoehte `AGENTS.md`-Grenze wurde der Scope ausdruecklich auf sieben Dateien erweitert: `balance-reader.js` fuer die gezielte Pflichtfeldvalidierung und `balance-smoke.test.mjs` fuer den realitaetsgleichen Fixture-/Reject-Contract. Der finale Stand bleibt unter der Projektgrenze.

## Offene Risiken

- Ein einzelner Punkt oder ein einzelnes Komma mit exakt drei Folgeziffern bleibt aus Kompatibilitaetsgruenden als Tausendertrenner definiert (`1.234` und `1,234` -> `1234`). Dezimalwerte mit exakt drei Stellen muessen daher ungegruppiert mit fuehrender `0` oder mit mehr als drei Vorkommastellen eingegeben werden.
- Noch nicht migrierte Aufrufer von `parseCurrency()` besitzen weiterhin den historischen 0-Fallback. Fachlich kritische Balance-Reader- und CSV-Pfade verwenden jetzt den strukturierten Contract; weitere Aufrufer koennen in spaeteren Slices einzeln migriert werden.
- Beide CSV-Importe brechen bei einer einzigen ungueltigen nichtleeren Zeile vollstaendig ab. Das verhindert Teilimporte, kann bei bewusst unvollstaendigen Fremdexporten aber eine manuelle Bereinigung erfordern.

## Rueckdokumentation

Erledigt: akzeptierte Zahlen-/CSV-Formate, Pflichtfelder, Reject-Verhalten und Kompatibilitaetsgrenze sind im Hauptplan dokumentiert; Slice-Status und Umsetzungsprotokoll wurden aktualisiert.

## Freigabestatus

Implementierung und technische Selbstpruefung abgeschlossen. Review/Freigabe durch Gemini und Nutzer ausstehend; Codex markiert die eigene Implementierung nicht als freigegeben und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - **Zahlenparser:** `parseLocalizedNumber()` in `balance-utils.js` parst deutsche und englische Formate strikt. Ungültige Formate (`12abc`), unvollständige Separatoren und mehrdeutige Separatoren erzeugen strukturierte Fehler (`NUMBER_PARSE_ERROR_CODES`).
  - **Missing vs. 0:** Gültige Nullwerte bleiben von fehlenden/ungültigen Werten unterscheidbar. Optionale Währungsfelder bleiben bei leeren Strings kompatibel mit dem Default `0` oder `null`.
  - **Eingabevalidierung:** `balance-reader.js` validiert alle Währungs-Eingabewerte. Ungültige Eingaben führen zu einem feldbezogenen `ValidationError`.
  - **Mindest-Flex-Grenzen:** `minimumFlexAnnual` wird strikt auf den Bereich `[0, flexBedarf]` geprüft. Ungültige Werte führen zu einem Reject, blockieren Engine und Persistenz, wobei der fehlerhafte Wert im Eingabefeld sichtbar bleibt (kein Clamp).
  - **Markt-CSV:** Prüft Spaltenzahl, Datumsformat (Stichtag-Fallback im Nicht-Schaltjahr von 29.02. auf 28.02.), Zahlenwerte und verlangt exakt die drei abgeschlossenen Vorjahre (Stichtag `31.12.`) relativ zum letzten Stichtag.
  - **Ausgaben-CSV:** Liest Zeilen und aggregiert sie in einer Null-Prototyp-Map (`Object.create(null)`), was Prototypen-Injektion (`__proto__`, `constructor`, etc.) verhindert. Teilfehler erzeugen eine Importzusammenfassung, die an einem nicht-enumerierbaren Symbol angebunden ist.
  - **Tests:** Alle 94 assertions der Reader-Tests, 19 assertions der Formatting-Tests, 115 assertions der UI-Tests und 38 assertions der Decumulation-Tests laufen erfolgreich durch. Die gesamte Suite ist mit 3356 Assertions **grün**.
- **Vertragstreue:**
  - Die Schnittstellengrenzen für den Reader, die Importe und das Expenses-CSV-Parsing wurden exakt eingehalten.
  - Der Legacy-Kompatibilitätspfad für `parseCurrency()` bleibt für noch unmigrierte Aufrufer erhalten.
- **Fehlerbehandlung:**
  - Robustes Fail-Closed: Jede ungültige CSV-Zeile oder Eingabe führt zum kontrollierten Abbruch des gesamten Imports/Berechnungsprozesses (kein Teilimport oder stille Fehlertoleranz).
  - Fehler geben exakte CSV-Zeilennummern oder fehlende Jahre aus, ohne sensible Payloads auszugeben.
- **Seiteneffekte:**
  - Die Korrektur der Mocks in `balance-smoke.test.mjs` stellt sicher, dass die Smoke-Tests dieselben Pflichtfelder vorbelegen wie das reale HTML, was zukünftige Testbrüche verhindert.
- **Was könnte brechen?**
  - Ein einzelner Punkt oder Komma mit genau drei Nachkommastellen (z. B. `1,234` oder `1.234`) wird aus Kompatibilitätsgründen weiterhin als Tausendertrenner (`1234`) und nicht als Dezimalwert (`1.234`) interpretiert. Dezimalwerte mit drei Nachkommastellen müssen daher zwingend ohne Gruppierung eingegeben werden (z. B. `0,234` oder `1.2340`). Dies ist jedoch ein geerbtes und dokumentiertes Verhalten.

### 2. Findings

- **G10-01 (Hinweis): CSV-Teilfehler verwerfen**
  - Tritt in einer Markt- oder Ausgaben-CSV-Datei an einer einzigen Zeile ein Fehler auf, bricht der gesamte Import ab.
  - *Empfehlung:* Das Verhalten ist absolut sicher (fail-closed). Bei künftigen Benutzerkomfort-Releases könnte überlegt werden, ungültige Zeilen optional zu überspringen und dem Benutzer eine Bereinigung anzubieten. Für dieses Hardening-Release ist der totale Abbruch jedoch das sicherste Vorgehen.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Benutzer versucht eine valide Ausgaben-CSV-Datei zu importieren, die eine Kategorie namens "importSummary" enthält. Da dieses Wort als Symbol-Feld für die Metadaten verwendet wird und die Implementierung den Namen über ein nicht-enumerierbares Symbol geschützt hat, sollte es theoretisch kollisionsfrei sein. Falls jedoch ein ungetrackter Codepfad (z. B. ein Serializer) die Keys der Map ohne Symbol-Prüfung ausliest oder in ein flaches Objekt überführt, könnte die Kategorie "importSummary" fälschlicherweise als Fehlermeldung oder Metadatenfeld interpretiert werden. Die Tests decken diesen Fall jedoch mit dem Symbol-Schutz ab.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Vollständiger Abbruch bei CSV-Teilfehlern (G10-01).

---

## Review-Antworten von Codex

F-R10 und U-10-01 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G10-01) wurde zur Kenntnis genommen. Die fail-closed Striktheit wird für die maximale Datensicherheit im Hardening-Scope als optimal bewertet. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-R10 | Hauptplan-Review | Mindest-Flex-Grenzen fehlen | angenommen | Wertebereich, Fehlermeldungen und Reject-Verhalten ergaenzt |
| U-10-01 | Nutzer | Projektgrenze laut aktueller `AGENTS.md` erhoeht | angenommen | Slice-Scope auf sieben Programmdateien erweitert; finale Grenze 7/10 |
| G10-01 | Gemini | CSV-Teilfehler verwerfen | angenommen | Abbruchverhalten für Datensicherheit dokumentiert |
