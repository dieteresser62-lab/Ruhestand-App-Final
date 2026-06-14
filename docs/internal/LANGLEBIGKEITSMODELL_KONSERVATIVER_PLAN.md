# Arbeitsdokument: Langlebigkeitsmodell konservativer machen

**Stand:** 2026-06-14  
**Status:** Entwurf fuer Review  
**Autor:** Codex  
**Verbesserungspunkt:** 5 - Langlebigkeitsmodell konservativer machen  
**Geplanter Feature-Branch:** `codex/langlebigkeitsmodell-konservativer`  
**GitHub-Status:** Noch nicht veroeffentlicht; vor Umsetzung Freigabe und Branch-Anlage erforderlich.

## Ziel

Dynamic-Flex/VPW und Monte-Carlo-Lebenspfade sollen Langlebigkeitsrisiko konservativer und transparenter abbilden. Das reduziert das Risiko, dass Entnahmehorizonte zu kurz angesetzt werden und VPW-Entnahmen dadurch zu hoch ausfallen.

## Ausgangslage

Relevante Bereiche:

- `engine/core.mjs`: Dynamic-Flex nutzt `horizonYears`, `horizonMethod`, `survivalQuantile`.
- `engine/validators/InputValidator.mjs`: Grenzen fuer Dynamic-Flex-Horizont und Quantile.
- `app/simulator/monte-carlo-runner.js`: berechnet den Dynamic-Flex-Horizont jahrweise neu.
- `app/simulator/mc-life-events.js`: Life-State-Initialisierung.
- `app/simulator/care-meta` und Pflegekonfigurationen: Mortalitaetsfaktoren bei Pflege.
- `app/simulator/simulator-main-dynamic-flex.js`: Presets fuer Defensiv/Ausgewogen/Offensiv.
- Tests: `dynamic-flex-horizon.test.mjs`, `vpw-dynamic-flex.test.mjs`, `simulator-monte-carlo.test.mjs`.

Der aktuelle Contract unterstuetzt bereits `horizonMethod='survival_quantile'` und `survivalQuantile`, aber die fachliche Kalibrierung kann konservativer werden.

## Fachlicher Vorschlag

Es gibt zwei moegliche Ausbaustufen:

### Variante A: Expliziter Longevity-Zuschlag

Ein pauschaler Zuschlag wird auf den berechneten VPW-Horizont addiert:

```text
effectiveHorizonYears = mortalityTableHorizon + longevityBufferYears
```

Default-Vorschlag fuer Review:

- `longevityBufferYears = 2`
- min/max weiterhin durch bestehende Horizon-Grenzen begrenzt.

Vorteile:

- Einfach, robust, gut erklaerbar.
- Geringer Datenbedarf.

Nachteile:

- Pauschal und nicht kohortenspezifisch.

### Variante B: Kohortentafel-Option

Statt Periodentafel wird eine kohortenbezogene Fortschreibung verwendet.

Vorteile:

- Fachlich genauer.

Nachteile:

- Datenquelle, Lizenz, Updateprozess und Doku deutlich komplexer.

Empfehlung fuer Version 1: Variante A als Default- oder Expertenoption, Variante B als spaeteres separates Feature.

## Vorgeschlagene Architektur

### Neues/erweitertes Horizon-Modul

Falls bereits Horizon-Logik verteilt ist, sollte sie gebuendelt werden:

- `app/simulator/dynamic-flex-horizon.js` oder bestehendes Modul erweitern.
- Engine-nahe Normalisierung in `engine/core.mjs` minimal halten.

Exports:

- `deriveDynamicFlexHorizon(context)`
- `applyLongevityBuffer(horizonYears, options)`
- `normalizeLongevitySettings(input)`

### Neue Eingabefelder

Moegliche Contract-Felder:

- `longevityMode`: `'none' | 'buffer_years' | 'cohort_table'`
- `longevityBufferYears`: Zahl, z. B. 0..10

Alternative fuer kleinen Scope:

- Nur configbasierter Default-Zuschlag ohne UI.

### Diagnosefelder

In `result.ui.vpw`:

- `horizonYearsRaw`
- `longevityMode`
- `longevityBufferYears`
- `horizonYears`
- `horizonSource`

Bestehendes `horizonYears` bleibt der effektiv genutzte Wert.

## Umsetzungspakete

### Paket 1: Entscheidung Default vs. Option

- Festlegen, ob der +2-Jahre-Puffer Default wird.
- Migrations-/Kompatibilitaetswirkung pruefen.

Akzeptanz:

- Review bestaetigt, ob bestehende Presets geaendert werden duerfen.

### Paket 2: Horizon-Contract und Tests

- Contract-Felder und Grenzen definieren.
- Tests fuer Single und Paar, Mean und Survival-Quantile.

Akzeptanz:

- Buffer erhoeht Horizont monoton.
- Max-Horizon wird nicht verletzt.

### Paket 3: Engine-/Runner-Integration

- Dynamic-Flex-Horizont in Balance, Backtest und MC konsistent anwenden.
- Worker-Payload erweitern, falls Felder nutzersteuerbar sind.

Akzeptanz:

- Balance, Backtest, MC, Sweep und Auto-Optimize verwenden denselben Effektivhorizont.

### Paket 4: UI/Preset-Anpassung

- Falls nutzersteuerbar: Feld im Dynamic-Flex-Detailbereich.
- Presets ggf. um konservativen Puffer ergaenzen.
- Copytext/Logs erweitern.

Akzeptanz:

- Nutzer erkennt, ob und wie der Puffer wirkt.

### Paket 5: Doku und Vergleich

- Referenzdoku um Langlebigkeitsannahmen erweitern.
- Vergleichsauswertung: 0 vs. +2 vs. +5 Jahre.

## Betroffene Dateien voraussichtlich

- `engine/core.mjs`
- `engine/validators/InputValidator.mjs`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/mc-life-events.js`
- `app/simulator/simulator-main-dynamic-flex.js`
- `app/simulator/simulator-input-strategy.js`
- `app/simulator/simulator-profile-inputs.js`
- `app/balance/balance-reader.js`
- `app/balance/balance-diagnosis-keyparams.js`
- `Simulator.html`, ggf. `Balance.html`
- Tests: `dynamic-flex-horizon.test.mjs`, `vpw-dynamic-flex.test.mjs`, `simulator-monte-carlo.test.mjs`, `simulator-sweep.test.mjs`, `worker-parity.test.mjs`
- Referenzdoku

Mehr als 5 Dateien betroffen; Umsetzung nur in Slices.

## Risiken

- Entnahmen sinken sichtbar; Nutzer koennen das als Regression wahrnehmen.
- Balance und Simulator koennten unterschiedliche Horizon-Defaults nutzen.
- Profilverbund mit zwei Personen ist fachlich sensibel: Joint-Horizon darf nicht doppelt gepuffert werden.
- Auto-Optimize koennte den Puffer durch andere Parameter kompensieren.

## Stop-Regeln fuer Umsetzung

Stoppen und nachfragen, wenn:

- Single- und Paar-Horizont fachlich nicht eindeutig definiert sind.
- Balance/Simulator verschiedene Defaults erhalten wuerden.
- Auto-Optimize aggressive Gegensteuerung erzeugt.
- Bestehende Dynamic-Flex-Tests nur durch pauschales Ersetzen erwarteter Werte gruen wuerden.

## Validierung

Mindestens:

- `node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs`
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm run build:engine`
- `npm test`

Vergleich:

- Referenzhaushalt mit Dynamic-Flex: Horizon 0/+2/+5.
- Kennzahlen: VPW-Rate, Flex freigegeben, Erfolgswahrscheinlichkeit, P10-Endvermoegen.

## Konkretisierung fuer Review

### Nicht-Ziele

- Keine Einfuehrung einer vollstaendigen DAV-/Kohortentafel in Version 1.
- Keine Aenderung der Pflegewahrscheinlichkeiten.
- Keine automatische Optimierung des Langlebigkeitsbuffers.
- Keine stille Absenkung bestehender Nutzerwerte ohne Diagnose.

### Vorlaeufiger Version-1-Contract

Empfehlung fuer Review: `longevityMode='buffer_years'` als expliziter Contract, aber Default-Entscheidung offen.

| Feld | Typ/Grenze | Default-Vorschlag | Bedeutung |
|---|---|---:|---|
| `longevityMode` | `'none' | 'buffer_years'` | `buffer_years` oder `none` offen | Aktiviert Horizon-Puffer |
| `longevityBufferYears` | Zahl 0..10 | 2 | Additiver Puffer auf finalen Horizon |
| `horizonYearsRaw` | Diagnose | - | Vor Puffer berechneter Horizon |
| `horizonYears` | bestehendes Feld | - | Effektiver Horizon nach Puffer und Clamp |

Fuer Paare gilt als bevorzugter Contract: erst Joint-Horizon aus bestehender Logik ableiten, dann den Buffer einmal auf den finalen Horizon anwenden. Keine doppelte Anwendung pro Person.

### Contract-Matrix

| Bereich | Bestehender Contract | Neuer/erweiterter Contract | Review-Fokus |
|---|---|---|---|
| Engine | `horizonYears` als effektiver VPW-Horizont | zusaetzlich Raw-/Buffer-Diagnose | Bestehendes Feld bleibt effektiv |
| Simulator | Horizon wird jahrweise neu berechnet | Buffer wird jahrweise nach Raw-Horizon angewandt | Paarlogik nicht doppelt puffern |
| Balance | liest/stellt Dynamic-Flex-Felder dar | gleiche Defaults und Diagnose wie Simulator | Kein App-Drift |
| Sweep/Optimizer | `horizonYears`/`survivalQuantile` optimierbar | Buffer ist Sicherheitsparameter, nicht Optimizer-Variable in V1 | Keine aggressive Kompensation |
| Persistenz | bestehende Dynamic-Flex-Keys | neue Keys optional/migrierbar | Alte Profile laden ohne Fehler |

### Messbare Akzeptanzkriterien

- `longevityBufferYears=0` erzeugt identische Ergebnisse zur Baseline.
- Bei Buffer > 0 ist `horizonYears >= horizonYearsRaw`, ausser Max-Clamp greift.
- Der effektive Horizon ueberschreitet nie die bestehende Max-Grenze 60.
- Bei Paaren wird der Buffer genau einmal auf den finalen Haushalts-Horizon angewandt.
- Diagnose und Copytext zeigen Raw-Horizon, Buffer und effektiven Horizon.
- Auto-Optimize darf `longevityBufferYears` in Version 1 nicht als Parameter aufnehmen.

### Referenzszenarien

| ID | Haushalt | Buffer | Erwartung |
|---|---|---:|---|
| L1 | Single, 65, Dynamic-Flex an | 0 | Baseline identisch |
| L2 | Single, 65 | 2 | VPW-Rate sinkt oder bleibt bei Clamp gleich |
| L3 | Paar, 65/63 | 2 | Buffer einmal auf Joint-Horizon |
| L4 | sehr hoher Raw-Horizon nahe 60 | 5 | Max-Clamp dokumentiert |
| L5 | Sweep/Auto-Optimize | 2 | Buffer bleibt fixer Sicherheitsparameter |

### Slice-Zuschnitt fuer spaetere Umsetzung

1. `SLICE_LONGEVITY_01_CONTRACT.md`: Default-Entscheidung, Paarlogik, Red-State-Tests.
2. `SLICE_LONGEVITY_02_HORIZON_MODULE.md`: Horizon-/Buffer-Helfer und Unit-Tests.
3. `SLICE_LONGEVITY_03_ENGINE_RUNNER.md`: Engine, Backtest, MC, Worker.
4. `SLICE_LONGEVITY_04_UI_PERSISTENCE.md`: Balance/Simulator Inputs, Diagnose, Copytext.
5. `SLICE_LONGEVITY_05_OPTIMIZER_DOCS.md`: Optimizer-Grenzen, Vergleichsreport, Doku-Sync.

### Reviewer-Pruefauftrag

- Pruefen, ob +2 Jahre als Default fachlich vertretbar oder nur als Option akzeptabel ist.
- Pruefen, ob die Paarlogik den Buffer korrekt genau einmal anwendet.
- Pruefen, ob die Aenderung als Sicherheitsparameter klar genug von Optimierungsparametern getrennt ist.
- Pruefen, ob Nutzer die niedrigeren VPW-Betraege als bewusste konservative Annahme erkennen koennen.

## Offene Fragen fuer Review

1. Soll +2 Jahre Default werden oder nur Option?
2. Soll der Puffer bei Paaren pro Person oder nur auf den finalen Joint-Horizon wirken?
3. Welche Maximalgrenze fuer `longevityBufferYears` ist sinnvoll?
4. Soll Auto-Optimize den Puffer veraendern duerfen oder ist er ein fester Sicherheitsparameter?

## Review-Feedback von Gemini

### Adversarieller Review & Systematische Analyse

#### 1. Korrektheit & Fachliche Modellierung (Das Alterseffekt-Paradoxon)
* **Regressiver Charakter des statischen Puffers (Szenario A vs. B):**
  * *Szenario A (Junger Rentner, 55 Jahre):* Berechneter VPW-Horizont von 40 Jahren. Ein Puffer von +2 Jahren erhöht den Horizont auf 42 Jahre (+5%). Die VPW-Entnahmerate sinkt minimal. Das Langlebigkeitsrisiko über 40 Jahre ist jedoch extrem unsicher (z. B. durch medizinischen Fortschritt). Hier ist +2 Jahre eigentlich zu wenig Schutz.
  * *Szenario B (Hohes Alter, 85 Jahre):* Berechneter VPW-Horizont von 8 Jahren. Ein Puffer von +2 Jahren erhöht den Horizont auf 10 Jahre (+25%). Die Entnahmerate sinkt massiv, was im sehr hohen Alter zu einer unnötigen Konsumeinschränkung führt, obwohl das Langlebigkeitsrisiko statistisch in diesem Alter bereits stark eingegrenzt ist.
  * **Urteil:** Der statische Puffer wirkt regressiv und bestraft fälschlicherweise ältere Kohorten überproportional, während er für jüngere Kohorten fast wirkungslos verpufft.
* **Paar-Dynamik bei Todesfällen im Simulator:**
  * Der Simulator berechnet den Horizont jahrweise neu. Stirbt ein Partner während der MC-Simulation, wechselt das System zum Single-Horizont. Wenn der Puffer einfach statisch addiert wird, springt der Puffer logisch mit. Es muss sichergestellt werden, dass im Moment des Übergangs keine Sprünge entstehen, die den Algorithmus instabil machen oder künstliche Entnahme-Dips erzeugen.

#### 2. Vertragstreue (Engine & API)
* Die Parameter `longevityMode` und `longevityBufferYears` müssen lückenlos durch alle Berechnungsmodule (`core.mjs`, `monte-carlo-runner.js`, `sweep-runner.js`, etc.) geschleift werden. Da der Standardwert eventuell `none` ist, müssen alle Engine-Aufrufe abwärtskompatibel sein. Wenn ein Modul (z. B. Sweep) den Parameter nicht korrekt deserialisiert, kommt es zu einem unbemerkten Drift zwischen Simulator und Sweep/Auto-Optimize.

#### 3. Fehlerbehandlung (Validierungsgrenzen)
* In `InputValidator.mjs` muss sichergestellt werden, dass `longevityBufferYears` strikt auf `[0, 10]` begrenzt und als Ganzzahl validiert wird. Negative Werte oder Fließkommazahlen müssen abgefangen werden.

#### 4. Seiteneffekte & Interaktionseffekte
* **Interaktion mit dem Max-Horizon Clamp (60 Jahre):**
  * Rentner mit einem Alter von z. B. 45 Jahren haben bereits einen Raw-Horizon nahe 60. Wenn der Puffer addiert wird, greift der harte Clamp bei 60. Dadurch verpufft der Puffer für sehr junge Rentner vollständig. Dies ist ein systemischer Fehler, da gerade junge Rentner den Schutz am dringendsten benötigen.
* **Kompensationseffekt im Auto-Optimizer:**
  * Wenn der Optimizer den Puffer nicht direkt verändern darf (fester Sicherheitsparameter), wird er bei aktivem Puffer versuchen, die geringere Entnahmerate durch andere Anpassungen (z. B. aggressivere Aktienallokation oder engere Flex-Guardrails) zu kompensieren. Dies führt zu einer paradoxen Risikoerhöhung auf Portfolioebene.

#### 5. Was könnte brechen? (Pre-Mortem)
* *Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?*
  * Ein unentdeckter Deserialisierungsfehler im Web-Worker-Pool führt dazu, dass bei Monte-Carlo-Läufen im Hintergrund der Puffer stillschweigend auf `0` (oder `undefined`) fällt, während er in der UI-Berechnung (die synchron auf dem Hauptthread läuft) mit `+2` aktiv bleibt. Dies führt zu einer gravierenden Diskrepanz zwischen den in der UI angezeigten Kennzahlen und den stochastischen MC-Ergebnissen.

---

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Statischer Puffer ist regressiv (bestraft 85-Jährige mit -25% Entnahme, schützt 55-Jährige kaum mit -5%). | Angenommen. Codex soll prüfen, ob ein adaptiver Puffer (z.B. Erhöhung des survivalQuantile) fachlich vorzuziehen ist. | In Paket 1 zu klären. |
| F-02 | Gemini | Max-Horizon Clamp (60 Jahre) führt dazu, dass der Puffer für sehr junge Rentner (Alter < 50) wirkungslos verpufft. | Angenommen. Clamp-Verhalten muss in Kombination mit dem Puffer explizit dokumentiert und getestet werden. | In Paket 2 zu integrieren. |
| F-03 | Gemini | Auto-Optimizer könnte den Puffer durch aggressivere Allokation überkompensieren, was das Risiko erhöht. | Angenommen. Auto-Optimize-Verhalten bei Puffer > 0 muss evaluiert werden. | In Paket 5 zu integrieren. |
| F-04 | Gemini | Web-Worker-Drift-Gefahr: Parameter müssen zwingend im Worker-Payload serialisiert und im `worker-parity`-Test validiert werden. | Angenommen. `worker-parity.test.mjs` muss dieses Szenario abdecken. | In Paket 3 & 4 zu integrieren. |
| F-05 | Gemini | Paar-Dynamik-Sprünge beim Tod eines Partners im Simulator-Lauf können Dips erzeugen. | Angenommen. Die jahrweise Anpassung bei Übergang Joint -> Single muss glatt verlaufen. | In Paket 3 zu integrieren. |
