# Slice 8 – Depot-Erschöpfungs-KPI präzisieren

**Stand:** 2026-07-17

**Status:** implementiert; Review ausstehend

**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`

**GitHub-Status:** Branch nur lokal; Veröffentlichung nicht beauftragt

**Übergeordneter Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)

## Ziel

PD-03 wird als reine Label- und Beschreibungskorrektur umgesetzt. Das
Monte-Carlo-Dashboard benennt die bestehende Kennzahl so, dass ihre zwei
Auslöser erkennbar sind: ein als `isRuin` fehlgeschlagener Lauf oder ein
Aktien-plus-Gold-Endbestand von höchstens 100 Euro. Freie Liquidität und der
optionale Pflegebucket werden ausdrücklich als nicht in dieser
100-Euro-Teilgröße enthalten ausgewiesen.

Der Nutzer hat die Labelroute bereits am 2026-07-16 als U-K08 bestätigt und
mit „Slice 8 implementieren“ am 2026-07-17 die Umsetzung dieses Slices
beauftragt. Die Berechnung, der technische Key
`depotErschoepfungsQuote`, Worker-/Merge-Verträge und Optimizerziele bleiben
unverändert.

## Akzeptanzkriterien

- Der primäre KPI-Titel benennt Ruin und den Aktien-/Gold-Restwert, ohne eine
  vollständige Vermögenslosigkeit zu behaupten.
- Die KPI-Beschreibung nennt `isRuin`, die Schwelle Aktien plus Gold kleiner
  oder gleich 100 Euro sowie den Ausschluss freier Liquidität und des
  Pflegebuckets aus dieser Schwelle.
- Die zugehörige Alters-KPI verwendet dieselbe Begrifflichkeit und beschreibt
  nur die entsprechend markierten Läufe.
- Der technische Key `depotErschoepfungsQuote`, seine Prozentformatierung,
  Ton-Schwellen und die Aggregation bleiben unverändert.
- Ein fokussierter DOM-freier UI-Vertragstest sichert Titel, Beschreibung,
  Wert, Tone und das Fehlen der irreführenden Formulierung.
- Bestehende Monte-Carlo- und Auto-Optimize-Tests belegen, dass Aggregation,
  Workertransport und Optimizervertrag unverändert bleiben.
- Dashboard, Handbuch und technische Referenzen verwenden denselben
  abgegrenzten Begriff; PD-03 wird erst nach grünen UI-/Dokumentationsgates
  als behoben dokumentiert.

## Scope

### Programm- und Testdateien

- `app/simulator/results-metrics.js`
- `tests/results-metrics.test.mjs` (neu)
- `Handbuch.html`

Damit umfasst der Programmscope einschließlich der HTML-Nutzeroberfläche drei
Dateien und bleibt
unter der Stop-Schwelle von zehn Programmdateien.

### Dokumentation

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `tests/README.md`
- diese Slice-Datei und der übergeordnete Korrekturplan

## Nicht-Scope

- Änderungen an `mc-run-metrics.js`, `monte-carlo-runner.js`,
  `monte-carlo-aggregates.js`, Worker-Buffern oder Auto-Optimize-Auswertung;
- Umbenennung des technischen Keys `depotErschoepfungsQuote`;
- Erweiterung der KPI-Berechnungsbasis um freie Liquidität, Pflegebucket oder
  weitere Vermögenswerte;
- Änderungen unter `engine/`, an der öffentlichen `EngineAPI`, `engine.js`,
  `dist/` oder `RuheStandSuite.exe`;
- Änderungen an Ergebnissemantik, Seeds, Szenarien oder Optimizerzielen;
- Änderung von `minimumFlexAnnual`;
- Commit, Push oder Veröffentlichung;
- vorbestehende ungetrackte Playwright-Dateien unter `node_modules/`.

## Branch- und Statusnachweis vor dem ersten Code-Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git rev-parse --short HEAD`: `bde708c`
- sicherer Vorgänger: freigegebener Slice-07-Commit
  `bde708c feat/test/docs: Slice 07 (Pflegekosten-Einheitenvertrag)
  freigegeben`
- getrackte Voränderungen: keine;
- vorbestehend und außerhalb des Auftrags: ungetrackte Playwright-Dateien
  unter `node_modules/`.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- die drei Programm-/Test-/HTML-Dateien aus dem Scope;
- die fünf betroffenen Architektur-, Modul-, Test-, Slice- und
  Planreferenzen im Markdown-Format;
- diese neue Slice-Datei.

**Voraussichtliche Änderungstiefe:**

- klein; ausschließlich sichtbare KPI-Texte, ein DOM-freier Vertragstest und
  synchronisierte Dokumentation.

**Gefährdete bestehende Tests:**

- Monte-Carlo-Aggregation und Worker-/Auto-Optimize-Transport als indirekte
  Contract-Gates;
- Browser-Smoke für das geladene Simulator-Dashboard;
- Offline-Evidenzvalidator wegen der PD-03-Rückdokumentation.

**Nicht anfassen:**

- Aggregation, technische Keys, Worker-Buffers, Optimizerlogik, `engine/`,
  `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`;
- PD-01/PD-02, Forschungsbacklog und `minimumFlexAnnual`.

**Rollback-Strategie:**

- bestehende Scope-Dateien gezielt mit `git checkout -- <datei>` auf den
  Slice-07-Stand zurücksetzen;
- die neue Slice- und Testdatei nur nach ausdrücklicher Nutzerfreigabe
  entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regeln greifen nicht. Eine Berechnungsänderung, ein zusätzlicher
Programmscope über zehn Dateien oder ein unerwartetes Ergebnisdelta stoppt den
Slice.

## Vorher-Baseline

Vor dem ersten Produktcode-Edit werden erhoben:

1. der aktuelle DOM-freie Dashboard-Descriptor mit dem irreführenden Titel
   und Beschreibungstext;
2. `simulator-monte-carlo.test.mjs` für die bestehende Aggregationsbasis;
3. `auto-optimize-worker-contract.test.mjs` für Key- und Workertransport;
4. das aktuelle Browser-Smoke-Gate.

Die Vorher-Baseline wurde am 2026-07-17 auf `bde708c` vor dem ersten
Produktcode-Edit erhoben:

| Fixture | Vorher-Ergebnis |
| --- | --- |
| Dashboard-Descriptor bei 12 % | Titel `Depot-Erschöpfungs-Quote`; Beschreibung behauptet, das Depot werde „vollständig aufgebraucht“; Wert `12,0 %`, Tone `warning` |
| `simulator-monte-carlo.test.mjs` | 110/110 Assertions grün; bestehende Erschöpfungsaggregation und Split-/Full-Parität bestätigt |
| `auto-optimize-worker-contract.test.mjs` | 7/7 Assertions grün; technischer Key und Worker-Aggregat paritätisch |
| Browser-Smoke des sicheren Vorgängercommits | alle Einstiegspunkte bis einschließlich Simulator und Handbuch ohne Page-Error; vollständiges 14-Szenarien-Gate ist zusätzlich nach dem Edit vorgeschrieben |

Die Produktänderung darf ausschließlich die sichtbaren Descriptor-Texte
verändern. Prozentwert `12,0 %`, Tone `warning`, Aggregatwert und technischer
Key müssen identisch bleiben.

## Geplante Validierung

- `node tests/run-single.mjs tests/results-metrics.test.mjs`;
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`;
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`;
- `npm test`;
- `npm run test:browser`;
- `npm run docs:evidence`;
- Suche nach „Depot vollständig aufgebraucht“ und widersprüchlichen
  UI-/Dokumentationstexten;
- `git diff --check` sowie abschließender Branch-, Status- und Scope-Check.

Ein Engine-Build ist nicht vorgesehen, weil weder `engine/` noch die
öffentliche `EngineAPI` geändert werden.

## Ergebnisse

### Durchgeführte Änderungen

- `results-metrics.js` zeigt die primäre Quote als „Ruin oder Aktien/Gold ≤
  100 €“ an. Der Beschreibungstext nennt `isRuin`, Aktien-plus-Gold-Endbestand
  und Schwelle sowie die nicht in dieser Schwelle erfasste freie Liquidität
  und den Pflegebucket.
- Die Alters-KPI verwendet dieselbe Auslösersemantik. Wertformatierung und
  bestehende Tone-Schwellen wurden nicht geändert.
- `results-metrics.test.mjs` sichert Titel, Beschreibungsgrenzen,
  Prozent-/Altersformatierung, Tone-Schwellen und das Fehlen der Aussage
  „vollständig aufgebraucht“.
- Das Handbuch erklärt die KPI im Monte-Carlo-Ablauf mit derselben
  Aussagegrenze.
- Architektur-/Fachkonzept, Simulator-Modulübersicht und Testkatalog wurden
  auf den nachgewiesenen Ist-Vertrag synchronisiert. PD-03/MR-08 nennen die
  Labelkorrektur, ohne eine Berechnungsänderung zu behaupten.

Es wurden keine Aggregations-, Runner-, Worker-, Optimizer-, Engine- oder
generierten Dateien geändert. `depotErschoepfungsQuote` bleibt als technischer
Key unverändert.

### Nachher-Messung und Delta-Klassifikation

| Fixture | Vorher | Nachher | Einordnung |
| --- | --- | --- | --- |
| primärer Titel | `Depot-Erschöpfungs-Quote` | `Ruin oder Aktien/Gold ≤ 100 €` | beabsichtigte Labelpräzisierung |
| Beschreibung | behauptet vollständige Aufzehrung | nennt `isRuin`, Teilgröße, Schwelle und ausgeschlossene Bestände | beabsichtigte Aussagekorrektur |
| Descriptor bei 12,34 % | `12,3 %`, `warning` | `12,3 %`, `warning` | Format und Tone unverändert |
| Tone-Grenzen | Erfolg bis 5 %, Warnung bis 20 %, Gefahr darüber | identisch | UI-Vertrag unverändert |
| Aggregation/Key | `depotErschoepfungsQuote` aus `isRuin` oder Aktien plus Gold ≤ 100 € | identisch | keine KPI-Neudefinition |

### Ausgeführte Validierung

| Prüfung | Ergebnis |
| --- | --- |
| `results-metrics.test.mjs` | 16/16 Assertions grün |
| `simulator-monte-carlo.test.mjs` | 110/110 Assertions grün; Aggregation und Split-/Full-Parität unverändert |
| `auto-optimize-worker-contract.test.mjs` | 7/7 Assertions grün; Key-/Workertransport unverändert |
| `npm test` | 111 entdeckte Testdateien; 4.585/4.585 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 14/14 Browser-Szenarien bestanden, einschließlich Simulator und Handbuch |
| `npm run docs:evidence` | bestanden; 69 MKT-, 55 FOR-Records, 17 MAP-Anker und 18 Aktualitätsscopes, kein Netzwerk |
| Suche nach „Depot vollständig aufgebraucht“ außerhalb interner Baseline-/Testdokumentation | keine Nutzer- oder Referenzfundstelle |
| `git diff --check` sowie Branch-/Status-/Scope-Check | bestanden; drei erwartete Programm-/Test-/HTML-Dateien und fünf Markdown-Dateien; nur vorbestehendes Playwright unter `node_modules/` außerhalb des Scopes |

`npm run build:engine` wurde vertragsgemäß nicht ausgeführt: `engine/`,
öffentliche EngineAPI und `engine.js` sind unverändert.

## Abweichungen vom Plan

- `Handbuch.html` war im Diff-Risiko von Beginn an als geplanter
  Nutzerdokumentationspfad aufgeführt, wurde zunächst aber unter
  „Dokumentation“ statt gemäß Projekt-Stop-Regel als Programmdatei gezählt.
  Der Abschluss-Scope korrigiert die Klassifikation auf drei Programmdateien;
  die Zehn-Dateien-Grenze war zu keinem Zeitpunkt annähernd erreicht.

## Offene Risiken

- Der technische Legacy-Key bleibt aus Kompatibilitätsgründen weiter gefasst
  benannt als das neue UI-Label; die Beschreibung muss diese Differenz
  dauerhaft auffangen.
- Der lokale Branch ist nicht veröffentlicht; dies ist ohne Push-Auftrag kein
  Implementierungsblocker.

## Rückdokumentation in den Arbeitsplan

Scope, Labelvertrag, Testzahlen und der behobene PD-03/MR-08-Status sind im
Korrekturplan zurückgeschrieben.

## Freigabestatus

- U-K08 / Labelroute: durch Nutzer bestätigt
- Implementierung durch Codex: abgeschlossen; keine Eigenfreigabe
- Review der Slice-Implementierung: ausstehend
- lokaler Commit: nicht durch Codex; erst nach positivem Review und
  Nutzerfreigabe
- Push: nicht beauftragt

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Label- und Beschreibungskorrektur der Depot-Erschöpfungs-KPI ist im Dashboard und im Handbuch präzise und fachlich korrekt vorgenommen worden.
2. **Vertragstreue:** Der technische Key `depotErschoepfungsQuote` und seine Berechnungsbasis (inklusive der 100-Euro-Grenze für Aktien/Gold und `isRuin` Trigger) wurden nicht verändert.
3. **Fehlerbehandlung:** Die Assertions in `tests/results-metrics.test.mjs` sichern die Schwellenwerte (Erfolg bei <= 5 %, Warnung bei <= 20 %, Gefahr darüber) und Titel/Beschreibungs-Inhalte exakt ab.
4. **Seiteneffekte:** Keine Änderungen an der Aggregationslogik, den Worker-Schnittstellen oder den Optimierer-Zielen.
5. **Was könnte brechen?** Die Textänderung hat keinerlei Auswirkung auf Berechnungen. Es gibt kein funktionales Bruchrisiko.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 8) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Ein externes Report-Skript parst den HTML-Dom der Applikation und sucht hartkodiert nach dem String `Depot-Erschöpfungs-Quote` statt nach den technischen Datenattributen, wodurch dieser Report fehlschlägt.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *DOM-Kopplung:* Falls Third-Party-Tools oder Scraper das HTML-Label direkt auslesen, brechen diese durch die Textanpassung.
- Pre-Mortem: (Siehe oben – Zerbrechen von HTML-Scrapern durch Textänderung).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Werden nach konkretem Slice-Feedback ergänzt. Codex erteilt keine
Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-K08 | Nutzer | PD-03-Route | Labelkorrektur (freigegeben am 2026-07-17) | abgeschlossen |
