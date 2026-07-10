# Engine Contract Hardening: Spezifikation und Umsetzungsplan

**Stand:** 2026-07-10  
**Status:** implementierungsreif - Slice 2 umgesetzt, Review ausstehend
**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** Branch nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Autor:** Codex (Implementer)  
**Reviewer:** Gemini/Antigravity, optional Claude Code, Nutzer

## Zweck

Dieser Plan spezifiziert vier bei der Analyse der zentralen Engine reproduzierte bzw. abgeleitete Aenderungsbereiche:

1. konsistenter Steuer-, Bruttoverkaufs-, Nettoerloes- und Liquiditaets-Contract,
2. harter Contract fuer den optionalen Engine-Input `aktuelleLiquiditaet`,
3. expliziter Fallback bei fehlenden Markt-/ATH-Daten,
4. Entscheidung ueber eine spaetere Zerlegung von `engine/core.mjs`; die Extraktion selbst wird nach Review zurueckgestellt.

Die Spezifikation ist bewusst vor der Implementierung angelegt. Kein Slice darf beginnen, bevor dieser Plan durch Gemini und optional Claude adversarial reviewed, die Findings durch Codex beantwortet und der Status durch Reviewer und Nutzer auf `implementierungsreif` gesetzt wurde.

## Ausgangsbefunde

### B1 - Steuer und Nettoerloes verwenden unterschiedliche Steuerstaende

`transaction-action.mjs` verteilt den von `sale-engine.mjs` mit einer Plansteuer berechneten Nettoerloes. `core.mjs` ersetzt anschliessend nur `action.steuer` durch die finale Jahressteuer aus `settleTaxYear()`. `action.nettoErloes`, `action.verwendungen` und der daraus berechnete Runway werden nicht neu abgestimmt.

Reproduzierter synthetischer Fall:

| Groesse | Wert |
|---|---:|
| Bruttoverkauf | 30.000,00 EUR |
| Plansteuer | 3.692,50 EUR |
| Finale Steuer nach 5.000 EUR LossCarry | 2.373,75 EUR |
| aktuell ausgewiesener Nettoerloes | 26.307,50 EUR |
| rechnerischer Nettoerloes nach finaler Steuer | 27.626,25 EUR |
| Differenz | 1.318,75 EUR |

Eine reine nachtraegliche Cash-Korrektur reicht nicht: Der Gross-up kann bereits zu einem zu hohen Bruttoverkauf gefuehrt haben.

### B2 - `aktuelleLiquiditaet` umgeht Normalisierung und Validierung

Der Simulator verwendet `aktuelleLiquiditaet` als operativen Liquiditaets-Override. Der Wert wird in `core.mjs` direkt uebernommen. Reproduziert wurden:

- String `"50000"` fuehrt durch String-Konkatenation zu 50.000.050.000 EUR Gesamtvermoegen,
- `NaN` propagiert in Vermoegen und Runway,
- negative Werte werden nicht abgelehnt.

### B3 - fehlende Marktdaten werden als ATH interpretiert

Wenn `ath`, `endeVJ` und Vorjahreswerte `0` sind, berechnet `MarketAnalyzer` einen ATH-Abstand von `0` und klassifiziert `peak_stable` mit der Begruendung `Neues Allzeithoch`. Nullwerte bedeuten jedoch fehlende Daten, nicht ATH.

### B4 - `core.mjs` vermischt mehrere Verantwortungen

`engine/core.mjs` umfasst rund 916 Zeilen und enthaelt Input-Normalisierung, VPW-/Safety-State, Jahresorchestrierung, Steuer-Integration, Diagnoseanreicherung und Result-Aufbau. Die fachlichen Module sind bereits gut getrennt; der Core bleibt der groesste verbleibende Kopplungspunkt.

## Zielbild und verbindliche Contracts

### Contract C1 - Liquiditaets-Override

`aktuelleLiquiditaet` ist optional und folgt diesem Contract:

| Rohwert | Ergebnis |
|---|---|
| Property fehlt, `undefined` oder `null` | Fallback `tagesgeld + geldmarktEtf` |
| endliche Zahl >= 0 | unveraendert uebernehmen |
| beliebiger String, einschliesslich `"50000"`, `"50.000,00"` und `"50000.00"` | `ValidationError` fuer `aktuelleLiquiditaet` |
| `NaN`, `Infinity`, `-Infinity` | `ValidationError` |
| negative Zahl | `ValidationError` |

`aktuelleLiquiditaet` ist ein interner Engine-Contract, kein lokalisiertes UI-Eingabefeld. Locale-Parsing bleibt Aufgabe der bestehenden UI-Reader. Der Simulator-Builder muss nachweisen, dass er eine Zahl liefert; die Balance-App setzt diesen Override im normalen Einzelprofilpfad nicht. Nach erfolgreicher Validierung muessen `gesamtwert`, `runway.months`, Deckungswerte und alle aus Liquiditaet abgeleiteten Betragsfelder endlich oder fachlich explizit `Infinity` bei Bedarf `0` sein. Es darf keine stille Begrenzung und keinen Fallback fuer explizit ungueltige Werte geben.

`tagesgeld` und `geldmarktEtf` behalten ihren bestehenden Legacy-Contract: `Number(...)`-konvertierbare Werte werden normalisiert, NaN/Infinity fallen auf `0`, negative endliche Werte werden durch den Validator abgelehnt. Dieser Contract propagiert keine NaN-Werte und wird in diesem Vorhaben nicht verschaerft.

### Contract C2 - Verkauf, Steuerreserve und finales Netto-Cash

Die Engine trennt Plan-/Auswahlwerte von finalen Jahreswerten:

| Feld | Bedeutung |
|---|---|
| `bruttoVerkaufGesamt` | tatsaechlich geplanter Bruttoverkauf |
| `steuerPlanGesamt` | beim Gross-up konservativ reservierte Plansteuer |
| `nettoErlösPlan` | Bruttoverkauf minus reservierte Plansteuer |
| `steuer` | finale Jahressteuer aus `settleTaxYear()` |
| `taxCashAdjustment` | reservierte Steuer minus finale Steuer; genau einmal cashwirksam |
| `nettoErlös` | `nettoErlösPlan + taxCashAdjustment` im Core-Einzelverkaufspfad |
| `taxRawAggregate` | signierte Rohaggregate des Verkaufs |
| `taxSettlement` | finale Settlement-Diagnose |
| `verwendungen` | vollstaendige Verteilung von `nettoErloes` |

Bestehende Umlaute-Felder wie `nettoErlös` bleiben waehrend dieses Vorhabens aus Kompatibilitaetsgruenden erhalten. Neue ASCII-Aliasse duerfen nur additiv und dokumentiert eingefuehrt werden.

Verbindliche Invarianten mit Rundungstoleranz 0,01 EUR:

```text
bruttoVerkaufGesamt - steuer == nettoErlös
sum(verwendungen.liquiditaet, verwendungen.gold, verwendungen.aktien) == nettoErlös
action.steuer == action.taxSettlement.taxAfterLossCarry
newState.taxState == settleTaxYear(...).taxStateNext
```

Der urspruenglich vorgeschlagene Bisektions-Solver wird verworfen. Er vermischt Verkaufsoptimierung mit unterjaehrlich noch nicht finaler Jahressteuer und loest den Forced-Sale-Pfad nicht. Die ueberarbeitete Vorgehensweise ist ein Reserve-/Reconciliation-Modell:

1. Bestehender Gross-up und Sell-Order bleiben unveraendert und erzeugen eine konservative `steuerPlanGesamt`.
2. Diese Reserve wird wie bisher vom Bruttoerloes abgezogen.
3. `settleTaxYear()` berechnet die finale Jahressteuer aus den signierten Rohaggregaten.
4. `taxCashAdjustment = taxReservedTotal - taxDueFinal` wird genau einmal der operativen Liquiditaet gutgeschrieben.
5. Im Core-Einzelverkaufspfad ist `taxReservedTotal = steuerPlanGesamt`.
6. Im Simulator wird die regulaere Reserve mit demselben `regularSaleScale` skaliert wie der tatsaechlich gebuchte Nettoerloes; auch die regulaeren Rohaggregate werden mit diesem Faktor skaliert.
7. Im Simulator-Mehrfachverkaufspfad ist `taxReservedTotal` die Summe aus skalierter cashwirksamer Core-Steuer und konservativ reservierter Forced-Sale-Plansteuer.
8. Forced Sales verwenden fuer ihre Planreserve keinen weiteren SPB (`sparerPauschbetrag = 0`), damit der SPB nicht mehrfach reservemindernd wirkt.
9. Reconciliation laeuft bei Forced Sales oder wenn `regularSaleScale < 1`; ein negativer `taxCashAdjustment` unterhalb -0,01 EUR ist ein Contract-Verstoss.

Damit wird Cash-Konsistenz hergestellt, ohne zu behaupten, dass der Bruttoverkauf bereits steuerlich minimal ist. Eine spaetere Optimierung des Bruttoverkaufs ist ausdruecklich Nicht-Scope und darf erst nach stabiler Jahres-Reconciliation geplant werden.

Vorgesehene additive Felder ohne Aenderung der oeffentlichen `EngineAPI`:

```js
TransactionEngine.determineAction({
    // bestehende Felder,
    taxContext: {
        taxStatePrev,
        sparerPauschbetrag,
        kirchensteuerSatz
    }
});

// Transaktionsfall
action = {
    // bestehende Felder bleiben erhalten
    steuerPlanGesamt,
    steuer,              // finale Jahressteuer
    nettoErlösPlan,
    nettoErlös,          // bestehendes Kompatibilitaetsfeld
    taxCashAdjustment,
    taxRawAggregate,
    taxSettlement,
    verwendungen
};
```

Im normalen Core-Pfad ist die regulaere Transaktion die erste Engine-Verkaufsstufe des Jahres. Slice 2 reconciled nur diesen Pfad. Der Simulator-Mehrfachverkauf wird separat in Slice 8 reconciled; bis Slice 8 abgeschlossen ist, darf das Steuerpaket nicht als fachlich fertig gelten.

### Contract C3 - fehlende Marktdaten

Ein gueltiges ATH-Signal setzt mindestens `ath > 0` und `endeVJ > 0` voraus. Fehlen diese Werte:

- `marketDataStatus = 'missing'`,
- `sKey = 'side_long'` als vorlaeufig verhaltensnaher Fallback,
- `seiATH = null`, `perf1Y = 0`, `abstandVomAthProzent = null`,
- kein Grundtext `Neues Allzeithoch`,
- expliziter Grundtext `Marktdaten fehlen; neutraler Fallback aktiv`,
- CAPE darf unabhaengig davon ausgewertet werden, sofern gueltig.

`seiATH` ist eine Quote und kein Boolean. `null` bedeutet fachlich unbekannt. Bestehende Transaktionsconsumer duerfen fuer ihre operative Skalierung weiterhin neutral `1` verwenden, muessen diesen Wert aber als Fallback behandeln und duerfen daraus kein echtes ATH diagnostizieren.

Datenstatus-Matrix:

| endeVJ | ath | endeVJ_1 | Status | Regimebasis |
|---|---|---|---|---|
| ungueltig | beliebig | beliebig | `missing` | `side_long`-Fallback |
| gueltig | ungueltig | ungueltig | `missing` | `side_long`-Fallback |
| gueltig | gueltig | ungueltig | `partial` | ATH/Drawdown, kein Momentum |
| gueltig | ungueltig | gueltig | `partial` | `side_long`-Fallback, Performance nur Diagnose |
| gueltig | gueltig | gueltig | `complete` | bestehende Klassifikation |

Der Fallback `side_long` veraendert einzelne Spending-Transitions gegenueber `peak_stable`. Deshalb ist C3 eine fachliche Engine-Semantikaenderung und benoetigt vor Slice 3 eine ausdrueckliche Nutzerfreigabe nach Review. Ein defensiver Bear-Fallback ist nicht Teil dieses Plans.

### Contract C4 - Core-Zerlegung wird zurueckgestellt

Die Reviews zeigen, dass die geplanten Extraktionen noch keine sauberen Ownership-Grenzen besitzen und der Result-Builder fachliche Logik aufnehmen wuerde. Slices 4, 5, 6 und 7 werden daher nicht implementiert. Slice 6 wird nicht umgedeutet; fuer die Simulator-Steuer-Reconciliation entsteht der neue Slice 8. Eine spaetere Core-Zerlegung benoetigt einen separaten Plan nach Abschluss von C1-C3 und C2-Simulator-Reconciliation.

Nur als spaetere Zielkandidaten dokumentiert, nicht zur Umsetzung freigegeben:

| Modul | Verantwortung |
|---|---|
| `engine/engine-input-normalizer.mjs` | reine Normalisierung und Aliasaufloesung, keine fachliche Validierung |
| `engine/vpw-safety-state.mjs` | Laden, Ableiten und Fortschreiben des VPW-Safety-State |
| `engine/transaction-settlement.mjs` | Action-Rohaggregate, Jahres-Settlement und konsistente Action-Anreicherung |
| `engine/engine-result-builder.mjs` | finale Diagnose-/UI-/State-Komposition ohne Fachentscheidung |

Regeln fuer einen spaeteren Plan:

- `EngineAPI` und `_internal_calculateModel` behalten ihre Signaturen.
- Keine Umbenennung oder Entfernung oeffentlicher Felder.
- Keine Aenderung an Schwellenwerten, Rundung, Policy-Reihenfolge oder Regime-Mapping.
- Ownership wird durch reine Rueckgabewerte, gezieltes Kopieren geaenderter verschachtelter Pfade und Non-Mutation-Tests abgesichert. Eine pauschale Deep-Copy-Pflicht wird nicht uebernommen, weil sie Funktionen/Config-Strukturen unnoetig dupliziert und Performance-/Identitaetsrisiken erzeugt.
- Jeder Extraktionsslice muss vor/nachher dieselben fokussierten Tests und die gesamte Suite bestehen.
- Unerwartete Snapshot-/Backtest-Deltas stoppen die Umsetzung.

## Scope

Im Scope:

- Engine-Input-Contract,
- Engine-Steuer-/Nettoerloes-Contract,
- Markt-Datenqualitaets-Fallback,
- Entscheidung und Begruendung fuer die Zurueckstellung der Core-Extraktionen,
- fokussierte Contract-/Regressionstests,
- `engine.js` ausschliesslich ueber `npm run build:engine`,
- notwendiger Doku-Sync.

Nicht im Scope:

- neues deutsches Steuerrechtsmodell,
- Aenderung von TQF-, SPB- oder Kirchensteuerregeln,
- Redesign der Verkaufsreihenfolge,
- Aenderung der Dynamic-Flex-, Guardrail- oder 3-Bucket-Semantik,
- UI-Redesign,
- Tauri-Release oder `dist/`-Sync,
- neue Marktprognose oder defensiver Missing-Data-Modus,
- Entfernung bestehender Legacy-Felder.
- Core-Extraktionen aus den urspruenglichen Slices 4 bis 7.
- steuerlich minimaler Bruttoverkauf; zunaechst gilt konservative Reserve plus Reconciliation.

## Slice-Struktur und Abhaengigkeiten

| Slice | Aenderungsbereich | Abhaengigkeit | Status |
|---|---|---|---|
| [Slice 1](SLICE_ENGINE_HARDENING_01_LIQUIDITY_INPUT_CONTRACT.md) | C1 Liquiditaets-Override | Planfreigabe | abgeschlossen |
| [Slice 3](SLICE_ENGINE_HARDENING_03_MARKET_DATA_FALLBACK.md) | C3 Missing-Market-Fallback | Slice 1 + explizite Semantikfreigabe | abgeschlossen |
| [Slice 2](SLICE_ENGINE_HARDENING_02_TAX_NET_PROCEEDS_CONTRACT.md) | C2 Core-Einzelverkauf: Reserve/Reconciliation | Slice 3 | abgeschlossen |
| [Slice 8](SLICE_ENGINE_HARDENING_08_SIMULATOR_TAX_RECONCILIATION.md) | C2 Simulator-Mehrfachverkauf: finale Cash-Reconciliation | Slice 2 | geplant |
| [Slice 4](SLICE_ENGINE_HARDENING_04_INPUT_NORMALIZER_EXTRACTION.md) | C4 Input-Normalizer | - | zurueckgestellt |
| [Slice 5](SLICE_ENGINE_HARDENING_05_VPW_SAFETY_EXTRACTION.md) | C4 VPW-Safety | - | zurueckgestellt |
| [Slice 6](SLICE_ENGINE_HARDENING_06_SETTLEMENT_EXTRACTION.md) | C4 Settlement-Extraktion | - | zurueckgestellt |
| [Slice 7](SLICE_ENGINE_HARDENING_07_RESULT_BUILDER_DOCS.md) | C4 Result-Builder | - | zurueckgestellt |

Verbindliche Ausfuehrungsreihenfolge: `1 -> 3 -> 2 -> 8`. Danach erneutes Gesamt-Review. Slices 4 bis 7 duerfen in diesem Vorhaben nicht gestartet werden. Es gibt keine bewusst rote Contract-Slice; jeder aktive Slice muss gruen enden.

Slice-2-Ergebnis: Der Core-Einzelverkauf exponiert die Planwerte `steuerPlanGesamt` und `nettoErlösPlan`, die finale Cash-Anpassung `taxCashAdjustment` sowie `bruttoVerkaufGesamt`. Im 5.000-EUR-LossCarry-Golden-Case bleiben 30.000 EUR Bruttoverkauf und 3.692,50 EUR Plansteuer stabil; die finale Steuer betraegt 2.373,75 EUR und 1.318,75 EUR werden genau einmal als Liquiditaet freigegeben. Kein LossCarry, ueberdeckender LossCarry, No-Transaction sowie reine Verlust- und gemischte Tranchen sind durch Invariantentests abgedeckt. Die Full Suite ist mit 3.113/3.113 Assertions gruen; der Simulator-Mehrfachverkaufsabschluss bleibt Scope von Slice 8.

## Globale Validierung

Nach jedem Slice mit `engine/`-Aenderung verpflichtend:

```text
npm run build:engine
npm test
```

Vor Slice 3 und Slice 2 ist auf unveraendertem Produktivcode eine Baseline fuer Standard-, Bear-, LossCarry- und Missing-Market-Fall sowie ein repräsentativer Backtest zu speichern. Zusaetzlich je Slice die fokussierten Tests aus der Slice-Datei. Nach Slice 8 ist ein deterministischer 10-Jahres-Invariantentest mit regulaeren und erzwungenen Verkaeufen verpflichtend. Falls Backtest-/Snapshot-Ergebnisse ausserhalb der spezifizierten Fallklasse abweichen, greift die Stop-Regel.

Commit-Granularitaet: Genau ein lokaler Commit pro freigegebenem Slice, ausgefuehrt durch den gemaess Projektregeln vorgesehenen Reviewer nach Scope-Pruefung. Bei Engine-Slices ist `engine.js` eine erwartete generierte Commit-Datei. Fremde Doku-/`node_modules`-Aenderungen duerfen in keinen Slice-Commit gelangen.

## Globale Stop-Regeln

Zusaetzlich zu `AGENTS.md` und `SLICE_EXECUTION_RULES.md` stoppen und Nutzerentscheidung einholen, wenn:

- ein Slice mehr als 5 Programmdateien benoetigt,
- `minimumFlexAnnual` beruehrt oder still begrenzt wird,
- `taxCashAdjustment` im konservativen Reservemodell kleiner als -0,01 EUR wird,
- der Forced-Sale-Recompute Steuer- oder Cash-Anpassung mehr als einmal anwendet,
- UI und Engine unterschiedliche Steuer-/Nettofeldbedeutungen verwenden,
- C3 andere Regime als `side_long`/`unknown` erfordern wuerde,
- einer der zurueckgestellten Core-Refactoring-Slices gestartet werden soll,
- Tests oder Build nicht ausfuehrbar sind.

## Risiken und Gegenmassnahmen

| Risiko | Gegenmassnahme |
|---|---|
| konservativer Gross-up verkauft trotz LossCarry mehr als minimal | bewusst akzeptiert; Cash wird reconciled, Optimierung spaeter separat |
| Breakdown-Plansteuer wird mit finaler Jahressteuer verwechselt | getrennte Top-Level-Felder und Doku |
| Forced Sale verrechnet Steuer doppelt | Simulator-Paritaetstest und Stop-Regel |
| regulaerer Verkauf wird ausgefuehrt skaliert, Rohaggregate aber nicht | identischer `regularSaleScale` fuer Cash, Reserve und Rohaggregate |
| Missing-Market-Fallback aendert Spending-State | ausdrueckliches Semantik-Gate und Vergleichstest |
| Refactoring verdeckt fachliche Aenderung | Core-Extraktionen aus diesem Vorhaben entfernt |
| bestehende Nutzer-Aenderungen geraten in Slice-Commit | `git status --short` vor jedem Slice und Scope-Abgleich |

## Pre-Mortem

Angenommen, die Umsetzung verursacht in drei Monaten einen Produktivfehler: Am wahrscheinlichsten wird ein regulaerer Verkauf wegen begrenzter realer Tranchen nur teilweise ausgefuehrt, Cash wird skaliert, aber Steuerreserve oder Rohaggregate bleiben unskaliert. Der finale Recompute schreibt dann eine scheinbar plausible, aber zu hohe Steuer fort. Slice 8 verlangt deshalb denselben Ausfuehrungsfaktor fuer Bruttoausfuehrung, Cash, Reserve und Rohaggregate sowie einen 10-Jahres-Invariantentest.

## Plan-Freigabegates

- [x] Gemini-Review gemaess Pflichtstruktur eingetragen
- [ ] Claude-Review eingetragen oder bewusst durch Nutzer abbedungen
- [x] alle Blocker beantwortet
- [x] C2-Solver verworfen und durch Reserve-/Reconciliation-Modell ersetzt
- [x] C3-Fallback-Semantik ausdruecklich durch Nutzer freigegeben
- [x] Status auf `implementierungsreif` gesetzt
- [x] Plan durch Reviewer/Nutzer freigegeben
- [x] aktive Reihenfolge `1 -> 3 -> 2 -> 8` durch Reviewer bestaetigt
- [x] Slice 1 gestartet

## Review-Feedback von Gemini

**Datum:** 2026-07-10
**Status:** freigegeben
**Vollständiges Review:** siehe unten

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - **Kriterium C1 (Liquiditäts-Override):** Die String-Normalisierung in der Engine wurde vollständig entfernt. Alle Strings werden nun strikt abgelehnt. Dies eliminiert das Parsing-Risiko (deutsches vs. englisches Zahlenformat) in der Engine vollständig und delegiert es sauber an die UI (gelöst, Finding **G-01**).
  - **Kriterium C2 (Verkauf & Steuer):** Der iterative Bisektions-Solver wurde verworfen und durch ein robustes Reserve- und Reconciliation-Modell ersetzt. Damit entfällt die Notwendigkeit eines mathematischen Monotonie-Nachweises für sprunghafte Steuertarife (gelöst, Finding **G-02**).
  - **Simulator Forced-Sale-Konsistenz:** Der neue Slice 8 regelt eine jahresweite Steuerreconciliation aller Reserven genau einmal nach allen simulator-induzierten Verkäufen. Dadurch werden Doppelverrechnungen vermieden und die Invarianten am Jahresende eingehalten (gelöst, Finding **G-03**).

- **Vertragstreue (bestehende Contracts/Interfaces):**
  - **Validierungs-Asymmetrie:** Die Normalisierung der Basisfelder (`tagesgeld`, `geldmarktEtf`) auf `0` im Normalizer wurde verifiziert. Die Asymmetrie wird als historischer Legacy-Contract akzeptiert und explizit getestet (akzeptiert, Finding **G-04**).

- **Fehlerbehandlung:**
  - **UI-Abbruch-Verhalten bei ValidationError:** Die Engine wirft keine ungefangenen Fehler mehr, sondern liefert ein `{ error }`-Objekt zurück, welches von den bestehenden try/catch-Pfaden der UI abgefangen wird. Der Slice 1 prüft und sichert diesen Consumer-Contract ab (gelöst, Finding **G-05**).

- **Seiteneffekte:**
  - **Regime-Änderung und Invarianten-Bruch bei fehlenden Marktdaten (C3):** Bei fehlenden Marktdaten werden `seiATH` und `abstandVomAthProzent` auf `null` gesetzt, was logische Widersprüche mit dem `side_long`-Regime-Fallback ausschließt. Die verhaltensändernden Auswirkungen des Regime-Wechsels werden vorab quantifiziert und bedürfen einer ausdrücklichen Nutzerfreigabe (gelöst, Finding **G-06**).

- **Was könnte brechen? (Versagensszenario):**
  - **Shallow-Copy-Risiko bei modularisierter Core-Extraktion (C4):** Die Core-Extraktionen (Slices 4 bis 7) wurden vollständig zurückgestellt, wodurch das Mutationsrisiko durch geteilte Referenzen im aktuellen Überarbeitungsprojekt entfällt (gelöst, Finding **G-07**).

### 2. Findings (Gemini)

| ID | Slice | Schwere | Kurzfassung | Status |
|---|---|---|---|---|
| G-01 | 01 | Hoch | String-Normalisierung von `aktuelleLiquiditaet` unpräzise | gelöst (Strings strikt abgelehnt) |
| G-02 | 02 | Hoch | Monotonie-Beweis für Bisektions-Solver fehlt | gelöst (Solver entfernt) |
| G-03 | 02 / 08 | Hoch | Forced-Sale-Steuerkonsistenz ungelöst | gelöst (Reconciliation-Modell in Slice 8) |
| G-04 | 01 | Mittel | Validierungs-Asymmetrie im InputValidator | akzeptiert (Legacy-Verhalten dokumentiert) |
| G-05 | 01 | Mittel | Unbehandelte `ValidationError`-Abbrüche in UI-Consumer-Komponenten | gelöst (kontrolliertes { error }-Handling) |
| G-06 | 03 | Mittel | Logischer Widerspruch bei `seiATH = 1` trotz fehlender Marktdaten und `side_long`-Fallback | gelöst (`seiATH = null`, Fallback separat) |
| G-07 | 04-07 | Hoch | Deep-Copy-Pflicht zur Vermeidung von Referenz-Mutationen | gelöst (Extraktionen zurückgestellt) |

### 3. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
Die wahrscheinlichste Ursache liegt in Slice 8: Ein regulärer Verkauf wird unterjährig aufgrund von realen Tranchenbeschränkungen skaliert, aber das kombinierte Rohaggregat für die Jahressteuerberechnung spiegelt diese Skalierung nicht korrekt wider. Dadurch wird die endgültige Jahressteuer auf Basis zu hoher fiktiver Gewinne berechnet, was zu einer fehlerhaften Reconciliation und einer schleichenden Vermögensdrift führt. Das Risiko wird durch Invarianten- und Paritätstests über 10 Jahre hinweg minimiert.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Konservativer Überverkauf bei LossCarry (bewusst in Kauf genommen), verhaltensändernder Regimefallback (Nutzer-Freigabepflicht).

## Review-Feedback von Claude

**Datum:** 2026-07-10
**Status:** bedingt freigegeben
**Vollständiges Review:** siehe Artefakt `claude_review_engine_contract_hardening.md`

### Blocker (vor Implementierungsbeginn zu klären)

1. **F-S02-01 (Hoch):** Solver-Monotonie für gemischte Tranchen als Beweisskizze dokumentieren. Die Monotonie ist mathematisch belegbar (Summe monoton steigender Funktionen ist monoton), muss aber explizit im Slice-Dokument festgehalten werden.
2. **F-S02-03 (Hoch):** Architekturentscheidung treffen: Solver ruft `settleTaxYear` intern auf (Variante a, empfohlen) oder konsistenter Parallel-Verbrauch mit Konsistenztest (Variante b). Forced-Sale-Recompute im Simulator darf keine doppelte Steuerverrechnung erzeugen.
3. **F-PLAN-03 (Niedrig, aber inkonsistent):** Abhängigkeitsdeklaration in Slice 03 korrigieren: Plan sagt Reihenfolge 01→03→02, Slice-Datei deklariert Abhängigkeit von Slice 02.

### Weitere Findings (18 gesamt, davon 3 Hoch / 8 Mittel / 7 Niedrig)

| ID | Slice | Schwere | Kurzfassung |
|---|---|---|---|
| F-PLAN-01 | Plan | Niedrig | Branch-Name inkonsistent (`feature/` vs. `codex/`) |
| F-PLAN-02 | Plan | Mittel | Ein-Commit-pro-Slice-Regel fehlt |
| F-PLAN-03 | Plan | Niedrig | Slice-03-Abhängigkeit inkonsistent |
| F-S01-01 | 01 | Mittel | Asymmetrie: Override validiert strenger als reguläre Felder – dokumentieren |
| F-S01-02 | 01 | Mittel | Simulator-Aufrufpfad für leeren Override nicht getestet |
| F-S02-01 | 02 | Hoch | Solver-Monotonie unbelegbar → Beweisskizze erforderlich |
| F-S02-02 | 02 | Hoch | `breakdown[].steuer` vs. `action.steuer` semantisch doppeldeutig |
| F-S02-03 | 02 | Hoch | Forced-Sale-Recompute Double-Spending-Risiko |
| F-S02-04 | 02 | Niedrig | Scope-Grenze knapp bei 5 Programmdateien |
| F-S03-01 | 03 | Mittel | `peak_stable` → `side_long` ist nicht verhaltensneutral – Unterschiede auflisten |
| F-S03-02 | 03 | Niedrig | `partial` Status-Grenzfälle unspezifiziert |
| F-S04-01 | 04 | Niedrig | Modul-Name `engine-input-normalizer.mjs` vs. `input-normalizer.mjs` |
| F-S04-02 | 04 | Mittel | Shallow Copy schützt verschachtelte Objekte nicht automatisch |
| F-S05-01 | 05 | Mittel | Safety-State-Parität über Mehrjahressequenzen schwer testbar – Golden Sequence vor Extraktion erstellen |
| F-S07-01 | 07 | Mittel | Result-Builder enthält fachliche Logik (Reentry, Runway-Status, Guardrail-Patching) |
| F-RULES-01 | Rules | Niedrig | Commit-Granularität nicht definiert |
| F-CC-01 | Cross | Niedrig | `engine.js` als erwartete generierte Datei in Commit-Checkliste vermerken |
| F-CC-02 | Cross | Mittel | Backtest-Baseline für Slices 02 und 03 vor Implementierung erstellen |

### Pre-Mortem

Wahrscheinlichste Fehlerursache in 3 Monaten: Minimale Rundungsdifferenz zwischen Solver-internem LossCarry-Verbrauch und `settleTaxYear`-Ergebnis, die sich über 30 simulierte Jahre kumuliert. Mitigation: End-to-End-Invariantentest über 10+ Jahre.

## Review-Antworten von Codex

### Ueberarbeitete Gesamtvorgehensweise

1. Der Engine-Override akzeptiert nur echte Zahlen; locale-abhaengige Strings werden nicht in der Engine geparst.
2. Der Bisektions-Solver entfaellt. Steuerliche Minimalverkaufsoptimierung wird nicht mit der Cash-Korrektur vermischt.
3. Stattdessen gilt ein konservatives Steuerreserve-Modell mit genau einer finalen Cash-Reconciliation.
4. Core-Einzelverkauf und Simulator-Mehrfachverkauf werden in getrennten Slices 2 und 8 umgesetzt.
5. Missing-Market-Daten verwenden `null` fuer unbekannte ATH-Quoten und eine explizite Datenstatus-Matrix.
6. Core-Extraktionen 4 bis 7 werden vollstaendig zurueckgestellt.

### Antworten auf Claude

- **F-PLAN-01 abgelehnt:** In Plan und Slices ist konsistent `codex/engine-contract-hardening` dokumentiert.
- **F-PLAN-02/F-RULES-01 angenommen:** Genau ein lokaler Reviewer-Commit pro freigegebenem Slice; kein automatischer Push.
- **F-PLAN-03 geklaert:** Verbindliche Reihenfolge ist `1 -> 3 -> 2 -> 8`.
- **F-S01-01/F-S01-02 angenommen:** Bewusste Override-Grenze und realer Simulator-Builder-Test.
- **F-S02-01 angenommen:** Solver entfernt.
- **F-S02-02 angenommen:** Planreserve, Plan-Netto, finale Steuer und Cash-Anpassung erhalten getrennte Felder.
- **F-S02-03 angenommen:** Slice 8 reconciled alle cashwirksamen Reserven genau einmal gegen das finale Settlement.
- **F-S02-04 angenommen:** Slice 2 sinkt auf drei Programmdateien.
- **F-S03-01/F-S03-02 angenommen:** Vorher-Baseline und Datenstatus-Matrix ergaenzt.
- **F-S04-01/F-S04-02/F-S05-01/F-S07-01 angenommen:** Extraktionen zurueckgestellt; ein spaeterer Plan braucht Ownership-Tests und Golden Sequences.
- **F-CC-01/F-CC-02 angenommen:** `engine.js` ist erwartete generierte Commit-Datei; Baselines sind Pflicht.

### Antworten auf Gemini

- **G-01 angenommen:** Keine String-Normalisierung in der Engine; alle Strings sind ungueltig.
- **G-02 angenommen:** Solver entfernt.
- **G-03 angenommen:** Jahresweite Mehrfachverkaufs-Reconciliation in Slice 8.
- **G-04 teilweise angenommen:** NaN/Infinity der Basisfelder werden bereits auf `0` normalisiert; die Asymmetrie wird dokumentiert, nicht erweitert.
- **G-05 teilweise angenommen:** Die Engine liefert `{ error }`; Balance und Simulator besitzen kontrollierte Consumer-Pfade. Diese werden getestet.
- **G-06 angenommen:** `seiATH` und ATH-Abstand werden bei fehlender Basis `null`; neutraler Consumer-Fallback ist kein beobachtetes ATH.
- **G-07 teilweise angenommen:** Mutationsrisiko ist real. Blanket Deep Copy wird zugunsten von Ownership-by-construction, gezielten Kopien und Deep-Freeze-/Non-Mutation-Tests abgelehnt. Die Extraktionen sind nicht mehr aktiv.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-PLAN-01 | Claude | Branch-Name inkonsistent | abgelehnt | Branch ist konsistent |
| F-PLAN-02 | Claude | Ein-Commit-pro-Slice-Regel fehlt | angenommen | globale Commit-Regel |
| F-PLAN-03 | Claude | Slice-03-Abhaengigkeit inkonsistent | geklaert | Reihenfolge `1 -> 3 -> 2 -> 8` |
| F-S01-01 | Claude | Override-Validierung asymmetrisch | angenommen | bewusste Contract-Grenze |
| F-S01-02 | Claude | Simulator-Aufrufpfad ungetestet | angenommen | `simulation.test.mjs` |
| F-S02-01 | Claude | Solver-Monotonie | angenommen | Solver entfernt |
| F-S02-02 | Claude | Steuerfeldsemantik doppeldeutig | angenommen | eindeutige additive Felder |
| F-S02-03 | Claude | Forced-Sale Double-Spending | angenommen | neuer Slice 8 |
| F-S02-04 | Claude | Scope-Grenze knapp | angenommen | Slice 2 nur 3 Programmdateien |
| F-S03-01 | Claude | Verhaltensaenderung unvollstaendig | angenommen | Baseline und Freigabe |
| F-S03-02 | Claude | partial-Status unspezifiziert | angenommen | Datenstatus-Matrix |
| F-S04-01 | Claude | Modul-Name inkonsistent | angenommen | spaeterer Plan |
| F-S04-02 | Claude | Shallow-Copy-Risiko | angenommen | Extraktion zurueckgestellt |
| F-S05-01 | Claude | Safety-State Golden Sequence fehlt | angenommen | spaetere Voraussetzung |
| F-S07-01 | Claude | Result-Builder enthaelt Fachlogik | angenommen | Extraktion zurueckgestellt |
| F-RULES-01 | Claude | Commit-Granularitaet undefiniert | angenommen | ein Reviewer-Commit pro Slice |
| F-CC-01 | Claude | engine.js in Commit-Checkliste | angenommen | globale Regel |
| F-CC-02 | Claude | Backtest-Baseline fehlt | angenommen | Pflicht vor Slice 3/2 |
| G-01 | Gemini | String-Normalisierung unpraezise | angenommen | alle Strings ungueltig |
| G-02 | Gemini | Solver-Monotonie fehlt | angenommen | Solver entfernt |
| G-03 | Gemini | Forced-Sale-Steuerkonsistenz | angenommen | Slice 8 |
| G-04 | Gemini | Validierungs-Asymmetrie | teilweise angenommen | Legacy-Contract dokumentiert |
| G-05 | Gemini | ValidationError in UI | teilweise angenommen | Consumer-Verarbeitung testen |
| G-06 | Gemini | `seiATH = 1` bei Missing Data | angenommen | raw `null`, Fallback separat |
| G-07 | Gemini | Deep-Copy-Pflicht | teilweise angenommen | Extraktionen zurueckgestellt |
