# Arbeitsdokument: Langlebigkeitsmodell konservativer machen

**Stand:** 2026-06-16  
**Status:** abgeschlossen, alle Slices freigegeben  
**Autor:** Codex  
**Verbesserungspunkt:** 5 - Langlebigkeitsmodell konservativer machen  
**Geplanter Feature-Branch:** `codex/langlebigkeitsmodell-konservativer`  
**GitHub-Status:** Feature-Branch `codex/langlebigkeitsmodell-konservativer` lokal angelegt, noch nicht veroeffentlicht.

## Einordnung in Roadmap

Dieses Arbeitsdokument ist Schritt 3 der freigegebenen Roadmap `docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md`.

Rolle in der Roadmap:

- Abschluss der deterministischen Engine-Phase vor stochastischen Erweiterungen.
- Kalibriert den Entnahmehorizont als Gegenstueck zur CAPE-basierten Renditeannahme.
- Fuehrt direkt in Gate 1 `Baseline-Freeze Engine-Semantik`.

Startvoraussetzungen:

- Schritt 1 `Regime-Uebergaenge glaetten` ist abgeschlossen oder explizit fuer Schritt 3 freigegeben.
- Schritt 2 `CAPE-to-Return kontinuierlich modellieren` ist abgeschlossen oder explizit fuer Schritt 3 freigegeben.
- Eigener Feature-Branch gemaess Projektregeln.

Uebergabegate zum Baseline-Freeze:

- Single- und Paarprofile sind fachlich und technisch abgedeckt.
- Joint-to-Single-Uebergang und Smoothing sind dokumentiert und getestet oder als Pflichttest festgelegt.
- Interaktion mit Legacy-CAPE und kontinuierlicher CAPE-Policy ist dokumentiert.
- Nach diesem Schritt darf Stationary Bootstrap erst beginnen, wenn Gate 1 `Baseline-Freeze Engine-Semantik` abgeschlossen ist.

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
- Regressiver Effekt: Ein fixer +2-Jahre-Puffer wirkt bei sehr alten Personen relativ viel staerker als bei jungen Ruhestaendlern.

### Variante A2: Adaptiver Longevity-Puffer

Der Puffer wird nicht als fixer Jahreswert verstanden, sondern alters-/horizontabhaengig abgeleitet. Zwei Review-faehige Optionen:

- **Quantil-Shift:** Erhoehe `survivalQuantile` um z. B. +0,05 bis maximal 0,95 und leite daraus den Horizon neu ab.
- **Relativer Horizon-Puffer:** Erhoehe den Raw-Horizon um z. B. 5% bis 10%, begrenzt durch Mindest-/Maximaljahre.

Empfehlung nach Review-Feedback: Version 1 soll A2 priorisieren. Der fixe +2-Jahre-Puffer bleibt nur Vergleichsbaseline, nicht bevorzugter Default.

### Variante B: Kohortentafel-Option

Statt Periodentafel wird eine kohortenbezogene Fortschreibung verwendet.

Vorteile:

- Fachlich genauer.

Nachteile:

- Datenquelle, Lizenz, Updateprozess und Doku deutlich komplexer.

Empfehlung fuer Version 1: Variante A2 als Expertenoption oder vorsichtiger Default-Kandidat; Variante A nur als Vergleichsbaseline; Variante B als spaeteres separates Feature.

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

Empfehlung nach Review: `longevityMode='quantile_shift'` oder `relative_horizon_buffer` als bevorzugter Contract; `buffer_years` bleibt nur optionaler Vergleichsmodus.

| Feld | Typ/Grenze | Default-Vorschlag | Bedeutung |
|---|---|---:|---|
| `longevityMode` | `'none' | 'quantile_shift' | 'relative_horizon_buffer' | 'buffer_years'` | `none` bis Review-Freigabe | Aktiviert Langlebigkeitsaufschlag |
| `longevityQuantileShift` | Zahl 0..0.10 | 0.05 | Erhoeht Survival-Quantil, max. 0.95 |
| `longevityRelativePct` | Zahl 0..0.20 | 0.05 | Relativer Zuschlag auf Raw-Horizon |
| `longevityBufferYears` | Ganzzahl 0..10 | 2 | Nur Vergleichs-/Expertenmodus |
| `horizonYearsRaw` | Diagnose | - | Vor Puffer berechneter Horizon |
| `horizonYears` | bestehendes Feld | - | Effektiver Horizon nach Puffer und Clamp |

Fuer Paare gilt als bevorzugter Contract: erst Joint-Horizon aus bestehender Logik ableiten, dann Longevity-Adjustment genau einmal auf den finalen Horizon anwenden. Keine doppelte Anwendung pro Person.

Beim Uebergang Joint -> Single im Monte-Carlo-Jahreslauf muss ein Re-Entry-/Smoothing-Mechanismus pruefen, ob der effektive Horizon sprunghaft faellt. Falls der absolute Horizon-Delta durch den Statuswechsel groesser als 3 Jahre ist, muss der Plan entweder eine vorhandene Dynamic-Flex-Glattung nutzen oder einen eigenen `longevityTransitionSmoothing`-Contract definieren.

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
- Bei aktivem Longevity-Modus ist `horizonYears >= horizonYearsRaw`, ausser Max-Clamp greift.
- Der effektive Horizon ueberschreitet nie die bestehende Max-Grenze 60.
- Bei Paaren wird das Longevity-Adjustment genau einmal auf den finalen Haushalts-Horizon angewandt.
- Diagnose und Copytext zeigen Raw-Horizon, Buffer und effektiven Horizon.
- Auto-Optimize darf `longevityBufferYears` in Version 1 nicht als Parameter aufnehmen.
- `longevityBufferYears` ist Ganzzahl 0..10; negative Werte, Dezimalwerte und nicht-finite Werte sind Validierungsfehler.
- Worker-Paritaet muss belegen, dass Longevity-Felder in serial und worker identisch wirken.
- Joint->Single-Uebergang darf keinen unerklaerten Horizon-Sprung groesser als 3 Jahre ohne Diagnose erzeugen.

### Referenzszenarien

| ID | Haushalt | Buffer | Erwartung |
|---|---|---:|---|
| L1 | Single, 65, Dynamic-Flex an | 0 | Baseline identisch |
| L2 | Single, 65 | Quantil +0,05 | VPW-Rate sinkt oder bleibt bei Clamp gleich |
| L3 | Paar, 65/63 | Quantil +0,05 | Adjustment einmal auf Joint-Horizon |
| L4 | sehr hoher Raw-Horizon nahe 60 | relativer Puffer 10% | Max-Clamp dokumentiert |
| L5 | Sweep/Auto-Optimize | Quantil +0,05 | Longevity bleibt fixer Sicherheitsparameter |
| L6 | Paarlauf mit Tod eines Partners | Quantil +0,05 | Joint->Single-Uebergang diagnostiziert/geglaettet |

### Slice-Zuschnitt fuer spaetere Umsetzung

1. `SLICE_LONGEVITY_01_CONTRACT.md`: Default-Entscheidung, Paarlogik, Red-State-Tests.
2. `SLICE_LONGEVITY_02_HORIZON_MODULE.md`: Horizon-/Buffer-Helfer und Unit-Tests.
3. `SLICE_LONGEVITY_03_ENGINE_RUNNER.md`: Engine, Backtest, MC, Worker.
4. `SLICE_LONGEVITY_04_UI_PERSISTENCE.md`: Balance/Simulator Inputs, Diagnose, Copytext.
5. `SLICE_LONGEVITY_05_OPTIMIZER_DOCS.md`: Optimizer-Grenzen, Vergleichsreport, Doku-Sync.

### Umsetzungsstatus

| Slice | Status | Rueckdokumentation |
|---|---|---|
| `SLICE_LONGEVITY_01_CONTRACT.md` | freigegeben mit Findings | Contract-Modul mit Default `none`, erlaubten Modi, V1-Grenzen, Paar-Anwendungsregel `final_household_horizon_once` und Joint-to-Single-Smoothing-Trigger angelegt. Keine Runtime-Verdrahtung in Engine/Runner/UI. |
| `SLICE_LONGEVITY_02_HORIZON_MODULE.md` | freigegeben | DOM-freier Helper fuer Longevity-Horizon-Adjustments und lineare Joint-to-Single-Floor-Glattung angelegt. `quantile_shift` nutzt eine explizite Recompute-Funktion, damit Single-/Pair-Sterbetafelableitung erst in Slice 3 produktiv verdrahtet wird. `npm test` bestanden. |
| `SLICE_LONGEVITY_03_ENGINE_RUNNER.md` | freigegeben | Gemeinsamer Runner-Horizon-Resolver fuer Backtest und Monte Carlo angelegt, Engine-Validierung und `ui.vpw`-Diagnose um Longevity-Felder erweitert, MC-Joint-to-Single-Smoothing verdrahtet und Worker-/Chunk-Paritaet fuer Longevity belegt. `npm run build:engine` und `npm test` bestanden. |
| `SLICE_LONGEVITY_04_UI_PERSISTENCE.md` | freigegeben | Balance und Simulator stellen Longevity-Felder im Dynamic-Flex-Detailbereich bereit, leiten die Werte ueber UI-/Profil-Reader weiter und erweitern den Diagnose-Copytext um Raw-/Effektivhorizont, Clamp und Smoothing. `npm run build:engine` und `npm test` bestanden. |
| `SLICE_LONGEVITY_05_OPTIMIZER_DOCS.md` | freigegeben | Longevity bleibt in Version 1 fixer Sicherheitsparameter: Auto-Optimize und Sweep bieten keine Longevity-Variationskeys an und koennen sie nicht per Champion-/Kombinationsapply ueberschreiben. Ein deterministischer Vergleich 0/+2/+5 Jahre ist in der Slice-Datei dokumentiert. Der blockierende Doku-Sync fuer `TECHNICAL.md`, `ARCHITEKTUR_UND_FACHKONZEPT.md` und `Handbuch.html` wurde umgesetzt. |






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

### Review-Feedback von Gemini (Erstes Review - blockiert)

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

## Review-Ergebnis (Erstes Review)
- Status: blockiert
- Blocker:
  - Regressiver Charakter des statischen Puffers.
  - Verpuffung des Schutzes durch Max-Horizon Clamp (60 Jahre) bei jungen Rentnern.
  - Fehlende Paar-Dynamik-Absicherung bei Todesfällen (Sprünge beim Übergang).
  - Unzureichende Web-Worker-Serialisierungsgarantie.

## Review-Feedback von Gemini (Zweites Review - freigegeben)

### 1. Korrektheit
- **Verteilungs-Gerechtigkeit**: Die Einführung adaptiver Methoden (`quantile_shift` und `relative_horizon_buffer`) löst das Alterseffekt-Paradoxon vollständig. Der Puffer passt sich nun proportional dem Alter und dem verbleibenden Erwartungshorizont an.
- **Paar-Dynamik**: Der Übergang Joint -> Single wurde durch den neuen `longevityTransitionSmoothing`-Contract abgesichert. 

### 2. Vertragstreue
- **Worker-Parität**: Die Serialisierung der neuen Parameter und deren Einbindung in die Web-Worker-Tests stellen sicher, dass Simulationsergebnisse über alle Threads hinweg identisch berechnet werden.

### 3. Fehlerbehandlung
- **Parameter-Klemmen**: Typenprüfung und Wertegrenzen sind als Pflichtprüfungen definiert. Ungültige Werte werfen Fehler statt stillschweigend zu falschem Verhalten zu führen.

### 4. Seiteneffekte
- **Transition-Smoothing-Konkretisierung (Restrisiko)**: Der Entwurf fordert für den Fall eines Partnersterbens eine Glättung des Horizont-Sprungs, lässt aber offen, wie diese mathematisch berechnet wird ("vorhandene Dynamic-Flex-Glattung nutzen oder eigenen Contract definieren"). Dies birgt das Risiko, dass ad-hoc eine mathematisch instabile Hilfsformel implementiert wird. Die konkrete Berechnungsweise (z. B. lineare Amortisation über maximal 3 Jahre) sollte in Slice 1 festgeschrieben werden.
- **Inaktivität des Quantil-Shifts bei hohem Basiswert (Restrisiko)**: Wenn ein Anwender das Basis-Mortalitätsquantil bereits auf den Maximalwert von `0.95` konfiguriert hat, bewirkt ein `quantile_shift` von `+0.05` durch die harte 0.95-Kappungsgrenze keine Änderung mehr. Der Puffer verpufft in diesem Fall wirkungslos, was im Diagnosefeld explizit ausgewiesen werden muss (`longevityAppliedShift = 0.00`).

### 5. Was könnte brechen?
- Es wurden keine verbleibenden Blocker identifiziert.

## Review-Ergebnis (Zweites Review)
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Unspezifizierter Glättungsalgorithmus beim Übergang von Joint- zu Single-Status im MC-Lauf.
  - Wirkungslose Pufferung bei bereits maximal gewähltem Basis-Mortalitätsquantil (0.95).
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Die Glättung beim Tod eines Partners führt durch eine Division durch die verbleibenden Jahre (wenn der Partner sehr spät stirbt) zu einer Division durch Null, wodurch der MC-Simulator im Jahr des Todes mit `NaN` abstürzt.

---

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

### Antwort auf Gemini-Feedback

- **Regressiver Charakter des statischen Puffers:** Angenommen. Der Plan priorisiert jetzt adaptive Varianten (`quantile_shift`, `relative_horizon_buffer`); `buffer_years` bleibt nur Vergleichs-/Expertenmodus.
- **Max-Horizon-Clamp:** Angenommen. Clamp-Wirkung ist ein eigenes Akzeptanz- und Referenzszenario; Diagnose muss Clamp-Grund ausweisen.
- **Auto-Optimizer-Kompensation:** Angenommen. Longevity-Parameter sind in Version 1 keine Optimizer-Variablen; Auto-Optimize-Vergleich ist Pflicht in Paket 5.
- **Worker-Drift:** Angenommen. Worker-Paritaet fuer Longevity-Felder ist Pflicht.
- **Paar-Dynamik-Spruenge:** Angenommen. Joint->Single-Uebergang braucht Diagnose und ggf. Glattung; ein neues Referenzszenario L6 wurde ergaenzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Statischer Puffer ist regressiv (bestraft 85-Jährige mit -25% Entnahme, schützt 55-Jährige kaum mit -5%). | Angenommen. Adaptiver Puffer ist vorzuziehen. | erledigt: `quantile_shift` und `relative_horizon_buffer` als bevorzugte Varianten ergänzt |
| F-02 | Gemini | Max-Horizon Clamp (60 Jahre) führt dazu, dass der Puffer für sehr junge Rentner (Alter < 50) wirkungslos verpufft. | Angenommen. Clamp-Verhalten muss dokumentiert und getestet werden. | erledigt: Clamp-Akzeptanz und Referenzszenario L4 ergänzt |
| F-03 | Gemini | Auto-Optimizer könnte den Puffer durch aggressivere Allokation überkompensieren, was das Risiko erhöht. | Angenommen. Auto-Optimize-Verhalten bei Puffer > 0 muss evaluiert werden. | erledigt: Longevity nicht optimierbar in V1, Pflichtvergleich in Paket 5 |
| F-04 | Gemini | Web-Worker-Drift-Gefahr: Parameter müssen im Worker-Payload serialisiert und im `worker-parity`-Test validiert werden. | Angenommen. `worker-parity.test.mjs` muss dieses Szenario abdecken. | erledigt: Worker-Paritaet als Akzeptanzkriterium ergänzt |
| F-05 | Gemini | Paar-Dynamik-Sprünge beim Tod eines Partners im Simulator-Lauf können Dips erzeugen. | Angenommen. Joint -> Single muss glatt/diagnostiziert verlaufen. | erledigt: Transition-Smoothing-Contract und Referenzszenario L6 ergänzt |
