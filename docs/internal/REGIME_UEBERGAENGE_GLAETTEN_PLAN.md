# Arbeitsdokument: Regime-Uebergaenge glaetten

**Stand:** 2026-06-14  
**Status:** In Umsetzung - Slice 5 implementiert, Review ausstehend  
**Autor:** Codex  
**Verbesserungspunkt:** 1 - Regime-Uebergaenge glaetten  
**Geplanter Feature-Branch:** `codex/regime-uebergaenge-glaetten`  
**GitHub-Status:** Noch nicht veroeffentlicht; vor Umsetzung Freigabe und Branch-Anlage erforderlich.

## Einordnung in Roadmap

Dieses Arbeitsdokument ist Schritt 1 der freigegebenen Roadmap `docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md`.

Rolle in der Roadmap:

- Fundament der deterministischen Engine-Semantik.
- Muss vor CAPE-to-Return, Langlebigkeit, Bootstrap und Fat-Tail/Crash umgesetzt und reviewed werden.
- Liefert die stabile Basis fuer spaetere Vergleichslaeufe und den Baseline-Freeze.

Startvoraussetzungen:

- Eigener Feature-Branch gemaess Projektregeln.
- Review-Findings aus diesem Arbeitsdokument beantwortet oder als Restrisiko dokumentiert.
- Slice-Plan, falls die Umsetzung mehr als 5 Dateien betrifft.

Uebergabegate zu Schritt 2:

- Regime-/Runway-/Refill-Glattung ist reviewed oder explizit fuer den naechsten Roadmap-Schritt freigegeben.
- `interpolateRange()` bzw. Severity-Logik ist fuer aufsteigende und absteigende Skalen spezifiziert und getestet.
- Bekannte Backtest-/Snapshot-Abweichungen sind dokumentiert.

## Ziel

Die App soll abrupte Handlungsspruenge reduzieren, die entstehen, wenn Marktregime, Drawdown-Schwellen oder Runway-Zielwerte an harten Grenzen wechseln. Kleine Aenderungen am ATH-Abstand, an CAPE oder an der Liquiditaetsdeckung duerfen nicht zu disproportional grossen Wechseln in Refill-Ziel, Guardrail-Status oder Handlungstext fuehren.

Das Ziel ist keine neue Anlagestrategie, sondern eine stabilere Uebersetzung bereits vorhandener Risikosignale.

## Ausgangslage

Relevante Bereiche:

- `engine/analyzers/MarketAnalyzer.mjs`: Marktregime, Drawdown- und CAPE-Signale.
- `engine/config.mjs`: Schwellenwerte fuer Spending, Runway, CAPE und Liquiditaet.
- `engine/planners/*`: Guardrails, Spending-Pipeline, finale Rate-Limits.
- `engine/transactions/*`: Ziel-Liquiditaet, Refill-Entscheidung, Rebalancing.
- `app/balance/*diagnosis*`: Darstellung der Entscheidung und Status-Chips.
- `app/simulator/*`: Backtest, MC, Sweep und Log-Ausgaben.

Bekanntes Risiko aus frueherem Architektur-Review: Harte Schwellen koennen fachlich richtige, aber UX-seitig schwer erklaerbare Spruenge erzeugen, z. B. Drawdown 19,9% vs. 20,1%.

## Fachliche Leitentscheidung

Die bestehende Klassifikation bleibt als erklaerbare Kategorie erhalten, aber abgeleitete Zielwerte werden geglaettet. Konkret:

- Regime-Label koennen diskret bleiben, z. B. `bear`, `sideways`, `recovery`.
- Quantitative Zielwerte sollen zwischen Schwellen interpolieren, z. B. Runway-Ziel, Refill-Intensitaet, Bear-Caps.
- Diagnose muss anzeigen, wenn ein Zielwert interpoliert wurde.

Nicht gewollt ist ein Blackbox-Scoring ohne nachvollziehbare Schwellen.

## Vorgeschlagene Architektur

### Neuer Layer: kontinuierliche Regime-Signale

Ein kleines DOM-freies Modul sollte aus bestehenden Rohdaten strukturierte Scores berechnen:

- `drawdownSeverity`: 0..1 zwischen definierten Drawdown-Schwellen.
- `capeSeverity`: 0..1 zwischen fair, teuer, extrem teuer.
- `runwaySeverity`: 0..1 zwischen Zieldeckung, Mindestdeckung, Krise.
- optional `regimeBlend`: Text-/Diagnoseobjekt mit Quellen.

Moeglicher Pfad:

- `engine/analyzers/regime-signals.mjs`

### Zielwert-Interpolation

Die Interpolation sollte nicht in UI-Modulen liegen, sondern nahe an der Engine:

- Runway-Ziel: zwischen z. B. normalem Ziel und Bear-Ziel interpolieren.
- Refill-Cap: zwischen Normal- und Bear-Cap interpolieren.
- Guardrail-Aktivierung: bestehende harte Mindeststopps bleiben hart, Warn- und Zielbereiche werden weich.

Beispiel:

```js
const severity = interpolateRange(drawdownPct, 0.10, 0.30);
const targetRunway = lerp(36, 60, severity);
```

Die Interpolation selbst ist ein eigener Contract und darf nicht ad hoc in mehreren Modulen nachgebaut werden:

```js
function interpolateRange(value, severity0Value, severity1Value, { scale = 'ascending' } = {}) {
  if (!Number.isFinite(value) || !Number.isFinite(severity0Value) || !Number.isFinite(severity1Value)) return 0;
  if (severity1Value === severity0Value) {
    return scale === 'descending' ? (value <= severity1Value ? 1 : 0) : (value >= severity1Value ? 1 : 0);
  }
  const raw = (value - severity0Value) / (severity1Value - severity0Value);
  return Math.max(0, Math.min(1, raw));
}
```

Contract:

- `interpolateRange()` liefert immer einen endlichen Wert in `[0, 1]`.
- `severity0Value` ist der Messwert, ab dem Severity `0` gilt; `severity1Value` ist der Messwert, ab dem Severity `1` gilt.
- Die Reihenfolge der Stuetzwerte ist fachlich relevant und darf nicht per `Math.min`/`Math.max` sortiert werden.
- Aufsteigende Skalen werden z. B. als `interpolateRange(drawdownPct, 0.10, 0.30)` modelliert.
- Absteigende Skalen werden z. B. als `interpolateRange(runwayMonths, 60, 36)` modelliert. Erwartung: `60 -> 0`, `36 -> 1`, `40 -> ca. 0.83`.
- `severity0Value === severity1Value` ist kein Fehlerpfad, sondern eine dokumentierte harte Schwelle. Fuer diesen zero-width-Fall muss die fachliche Skalenrichtung ueber `scale: 'ascending' | 'descending'` gesetzt werden.
- Alle Zielwert-Interpolationen nutzen diese zentrale Funktion.

### Diagnose-Contract

Neue Diagnosefelder sollten explizit sein:

- `diagnosis.general.regimeSmoothingApplied`
- `diagnosis.general.regimeSmoothingFactors`
- `diagnosis.general.runwayTargetRaw`
- `diagnosis.general.runwayTargetSmoothed`

Bestehende Felder duerfen nicht umgedeutet werden, ohne alle Aufrufer mitzuziehen.

### UI-Erklaerungs-Contract

Geglaettete Werte duerfen nicht nur als Zahl erscheinen. Jeder geglaettete Zielwert bekommt eine erklaerende Quelle:

- `smoothingLabel`: kurzer UI-Text, z. B. `zwischen Seitwaertsmarkt und Baer`.
- `smoothingExplanation`: ein Satz fuer Tooltip/Copytext.
- `smoothingSeverityPct`: gerundeter Wert 0..100 fuer Diagnose.
- `rawLowerTarget` / `rawUpperTarget`: die beiden Stuetzwerte.

Beispiel fuer Copytext:

```text
Runway-Ziel: 48 Monate (geglättet, 50% zwischen Normalziel 36 und Baer-Ziel 60).
Harte Mindestgrenze: 24 Monate, nicht geglättet.
```

## Umsetzungspakete

### Paket 1: Analyse und Contract-Test

- Bestehende Schwellen und Zielwerte kartieren.
- Contract fuer kontinuierliche Signale definieren.
- Red/Green-Tests fuer Grenzwerte erstellen.

Akzeptanz:

- Fuer Werte exakt an Schwellen sind Ergebnisse deterministisch.
- Fuer Werte knapp unter/ueber Schwellen gibt es keine grossen Zielwertspruenge.
- Division durch Null, nicht-finite Werte, aufsteigende Skalen, absteigende Skalen und Werte ausserhalb des Bereichs sind explizite Testfaelle.
- Die absteigende Runway-Skala `interpolateRange(runwayMonths, 60, 36)` muss mindestens die Faelle `60 -> 0`, `36 -> 1` und `40 -> ca. 0.83` abdecken.
- Die aufsteigende Drawdown-Skala `interpolateRange(drawdownPct, 0.10, 0.30)` muss mindestens die Faelle `0.10 -> 0`, `0.30 -> 1` und einen plausiblen Zwischenwert abdecken.

### Paket 2: Engine-Signale einfuehren

- `regime-signals.mjs` ergaenzen.
- `MarketAnalyzer` oder Engine-Core damit verdrahten.
- Keine UI-Aenderung ausser Diagnosepayload.

Akzeptanz:

- Bestehende Simulationen bleiben bei Default-Konfiguration plausibel nah an vorherigen Ergebnissen.
- Alte diskrete Regime-Labels bleiben vorhanden.

### Paket 3: Runway-/Refill-Ziele glaetten

- Zielwertberechnung in Transaktions-/Guardrail-Pfaden anpassen.
- Harte Notfallgrenzen bleiben hart.

Akzeptanz:

- Refill- und Runway-Ziele bewegen sich monoton mit Drawdown-/Runway-Schwere.
- Kein stilles Unterschreiten von Mindest-Runway.

### Paket 4: UI-/Log-Transparenz

- Balance-Diagnose und Copytext um geglaettete Zielwerte erweitern.
- Simulator-Detail-Logs optional mit geglaettetem Regime-/Runway-Ziel.

Akzeptanz:

- Nutzer sieht, warum ein Zielwert zwischen zwei Regimewerten liegt.
- Tooltip und Copytext nennen Rohziele, Severity und harte Mindestgrenzen.

### Paket 5: Regression und Doku

- Tests, README/TECHNICAL/ARCHITEKTUR aktualisieren.
- Vergleichsbacktests fuer Grenzfaelle dokumentieren.

## Betroffene Dateien voraussichtlich

- `engine/analyzers/MarketAnalyzer.mjs`
- `engine/analyzers/regime-signals.mjs` (neu)
- `engine/config.mjs`
- `engine/transactions/TransactionEngine.mjs` oder Teilmodule
- `engine/planners/spending-guardrails.mjs`
- `app/balance/balance-diagnosis-*.js`
- `app/simulator/simulator-year-result.js`
- Tests unter `tests/market-analyzer.test.mjs`, `tests/liquidity-guardrail.test.mjs`, `tests/transaction-engine-ath.test.mjs`, `tests/simulator-backtest.test.mjs`
- Referenzdoku

Mehr als 5 Dateien werden bei der Umsetzung wahrscheinlich betroffen sein. Die Umsetzung muss deshalb in Slices erfolgen.

## Risiken

- Versehentliche Aenderung der Engine-Semantik statt nur Glattung.
- Backtest-/Snapshot-Ergebnisse koennen abweichen.
- UI und Engine koennen verschiedene Zielbegriffe anzeigen.
- Zu starke Glattung kann echte Krisensignale verharmlosen.

## Stop-Regeln fuer Umsetzung

Stoppen und nachfragen, wenn:

- Snapshot-/Backtest-Ergebnisse unerwartet stark abweichen.
- Mindest-Runway oder Notfall-Refill durch Glattung abgeschwaecht wuerde.
- Engine- und UI-Begriffe nicht eindeutig mappbar sind.
- Mehr als ein fachlicher Zielwert gleichzeitig neu interpretiert werden muesste.

## Validierung

Mindestens:

- `node tests/run-single.mjs tests/market-analyzer.test.mjs`
- `node tests/run-single.mjs tests/liquidity-guardrail.test.mjs`
- `node tests/run-single.mjs tests/transaction-engine-ath.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `npm run build:engine`
- `npm test`

Optional:

- Vergleichsbacktest fuer Drawdown-Grenzwerte 9%, 10%, 19%, 20%, 29%, 30%.
- Browser-Smoke, wenn Diagnose-UI geaendert wird.

## Konkretisierung fuer Review

### Nicht-Ziele

- Keine Aenderung der steuerlichen Verkaufslogik.
- Keine neue Asset-Allokationsstrategie.
- Keine Entfernung bestehender diskreter Regime-Labels.
- Keine Glattung harter Notfallbedingungen wie unzureichender Mindest-Runway.

### Contract-Matrix

| Bereich | Bestehender Contract | Neuer/erweiterter Contract | Review-Fokus |
|---|---|---|---|
| Marktanalyse | Diskrete Regime- und Drawdown-Signale | Zusaetzliche kontinuierliche Severity-Werte 0..1 | Keine Umdeutung bestehender Labels |
| Spending | Guardrails und Final-Limits in fester Reihenfolge | Weiche Zielwerte nur vor bestehenden harten Caps | Pipeline-Reihenfolge bleibt stabil |
| Transaktionen | Ziel-Liquiditaet und Refill-Caps aus Regime/Input | Geglaettete Zielwerte mit Rohwert + Effektivwert | Mindest-Runway darf nie abgeschwaecht werden |
| Diagnose | Regime, Runway, Guardrail-Chips | Anzeige von `raw`, `smoothed`, `severity` | Keine widerspruechlichen UI-Begriffe |
| Simulator | Backtest/MC konsumieren Engine-Ergebnisse | Log kann Smoothing-Felder durchreichen | Worker-/Serial-Ergebnisgleichheit |

### Messbare Akzeptanzkriterien

- Bei deaktivierter Glattung sind Engine-Ergebnisse bitnah bzw. strukturell identisch zum heutigen Verhalten.
- Bei aktivierter Glattung darf ein Drawdown-Delta von 0,2 Prozentpunkten um eine Schwelle keinen Runway-Zielsprung von mehr als 3 Monaten erzeugen.
- `runwayTargetSmoothed` muss zwischen unterem und oberem Regime-Ziel liegen.
- Severity-Werte muessen monoton sein: groesserer Drawdown darf nie niedrigere Drawdown-Severity erzeugen.
- Notfall-Refill und Mindest-Runway-Blockaden muessen bei gleichen Inputs weiterhin ausloesen.
- `interpolateRange(value, severity0Value, severity1Value)` gibt fuer alle Kombinationen aus `NaN`, `Infinity`, identischen Stuetzwerten und Extremwerten einen endlichen Wert in `[0, 1]` oder einen validierten Fehlerstatus zurueck.
- `interpolateRange()` respektiert die Richtung der fachlichen Skala: `interpolateRange(drawdownPct, 0.10, 0.30)` ist aufsteigend, `interpolateRange(runwayMonths, 60, 36)` ist absteigend.
- Die Funktion darf Stuetzwerte nicht mit `Math.min`/`Math.max` sortieren, weil dadurch absteigende Severity-Skalen invertiert wuerden.
- Jede UI-Darstellung eines geglaetteten Werts enthaelt Rohwerte und Erklaertext; nackte Zwischenwerte ohne Begruendung sind nicht akzeptabel.

### Referenzszenarien

| ID | Szenario | Zweck | Erwartung |
|---|---|---|---|
| R1 | ATH-Abstand 9,9%, 10,0%, 10,1% | Untere Drawdown-Schwelle | Kein harter Handlungssprung |
| R2 | ATH-Abstand 19,9%, 20,0%, 20,1% | Bear-Uebergang | Runway-Ziel aendert sich graduell |
| R3 | Runway knapp unter Mindestwert | Harte Sicherheitsgrenze | Kein Weichzeichnen der Krise |
| R4 | CAPE fair vs. teuer, Drawdown konstant | Signaltrennung | CAPE-Severity beeinflusst nur definierte Zielwerte |
| R5 | Backtest 2000-2025 | Realistische Regression | Abweichungen werden dokumentiert, nicht still akzeptiert |

### Slice-Zuschnitt fuer spaetere Umsetzung

1. `SLICE_REGIME_SMOOTHING_01_CONTRACT.md`: Schwelleninventar, Contract-Matrix, Red-State-Tests. Status: freigegeben nach Review auf Branch `codex/regime-uebergaenge-glaetten`.
2. `SLICE_REGIME_SMOOTHING_02_SIGNAL_MODULE.md`: DOM-freies Signalmodul und Unit-Tests. Status: implementiert, Review ausstehend auf Branch `codex/regime-uebergaenge-glaetten`.
3. `SLICE_REGIME_SMOOTHING_03_ENGINE_TARGETS.md`: Engine-/Transaktionsintegration hinter Feature-Flag. Status: implementiert, Review ausstehend auf Branch `codex/regime-uebergaenge-glaetten`.
4. `SLICE_REGIME_SMOOTHING_04_DIAGNOSIS_UI.md`: Diagnose, Copytext, Logs. Status: implementiert, Review ausstehend auf Branch `codex/regime-uebergaenge-glaetten`.
5. `SLICE_REGIME_SMOOTHING_05_REGRESSION_DOCS.md`: Vergleichslaeufe, Doku-Sync, Entscheidung Default. Status: implementiert, Review ausstehend auf Branch `codex/regime-uebergaenge-glaetten`.

### Reviewer-Pruefauftrag

- Pruefen, ob die Glattung eine fachliche Semantikaenderung statt nur Zielwertstabilisierung ist.
- Pruefen, ob harte Sicherheitsgrenzen vollstaendig erhalten bleiben.
- Pruefen, ob die vorgeschlagenen Diagnosefelder fuer Nutzer erklaerbar sind.
- Pruefen, ob die Slice-Reihenfolge ausreichend kleine Review-Einheiten bildet.

## Offene Fragen fuer Review

1. Soll das diskrete Regime-Label nur Diagnose bleiben oder weiter operative Bedeutung behalten?
2. Welche Schwellen duerfen weich werden, welche muessen hart bleiben?
3. Wie gross darf die Abweichung gegenueber heutigen Backtests sein?
4. Soll die Glattung per Feature-Flag einfuehrbar sein?

## Review-Feedback von Gemini (Erstes Review - blockiert)

### 1. Korrektheit
- **Division-by-Zero-Gefahr**: Bei der linearen Interpolation (`lerp`/`interpolateRange`) besteht die Gefahr einer Division durch Null, falls Min- und Max-Grenzen in der Konfiguration identisch gesetzt werden (z. B. `minDrawdown = 10%`, `maxDrawdown = 10%`). Das Modul muss dies abfangen und standardmäßig eine Severity von `1.0` oder `0.0` zurückliefern.
- **Klammerung der Severity**: Es muss mathematisch garantiert sein, dass die berechnete Severity strikt im Intervall `[0.0, 1.0]` liegt, auch wenn die Eingabe außerhalb der Min/Max-Schwellen liegt (z. B. Drawdown von 45% bei einer Obergrenze von 30%). Ein fehlendes `clamp` führt hier zu unplausiblen Extrapolationen.

### 2. Vertragstreue
- **Sicherheitsmargen**: Die Interpolation von Zielwerten darf die Notfallgrenzen (z. B. absolute Mindest-Runway von 12 Monaten) niemals weicher machen. Es muss ein Contract etabliert werden, dass geglättete Zielwerte nach unten hin immer durch die härteste Notfallgrenze gedeckelt werden.

### 3. Fehlerbehandlung
- **Graceful Fallback**: Falls einzelne Schwellenwerte fehlerhaft konfiguriert sind oder fehlen, muss das System ohne Absturz auf die diskreten Stufen zurückfallen. Dies muss durch Tests mit manipulierten Konfigurationen abgesichert werden.

### 4. Seiteneffekte
- **UX-Verständlichkeit**: Wenn die App ein Runway-Ziel von `42,3 Monaten` ermittelt, der Anwender im UI aber nur die Stufen `Normal (36 Monate)` und `Bear (60 Monate)` kennt, führt dies zu Verwirrung. Das Diagnose-UI muss den Rechenweg und die Interpolations-Faktoren (z. B. "55% Bear-Severity angewandt") explizit ausweisen.

### 5. Was könnte brechen?
- **Knick-Instabilität am Übergang zu harten Grenzen**: Wenn das Verhalten bis knapp vor der Notfallgrenze geglättet wird und dann abrupt auf die harte Notfall-Logik umschaltet, entsteht eine neue, steilere Klippe im Systemverhalten (Control Cliff). Dies kann in Backtests zu sprunghaften Reaktionen der Entnahmeraten führen.

## Review-Ergebnis (Erstes Review)
- Status: blockiert
- Blocker: 
  - Fehlende Absicherung gegen Division durch Null bei der Interpolation.
  - Fehlendes Konzept zur dynamischen Anpassung der UI-Erklärungstexte für geglättete Zwischenwerte.
- Restrisiken: 
  - Unvorhergesehenes Schwingungsverhalten in historischen Backtests an den Schnittstellen zwischen geglätteten Werten und harten Notfall-Caps.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Konfigurationsfehler setzt `minDrawdown` und `maxDrawdown` auf den gleichen Wert. Die Division durch Null in der Signalberechnung liefert `Infinity`, was das Refill-Ziel sprengt und die jährliche Entnahme im Backtest auf 0 drückt.

## Review-Feedback von Gemini (Zweites Review - blockiert)

### 1. Korrektheit
- **Logikfehler bei absteigenden/invertierten Skalen (BLOCKER)**: Die vorgeschlagene Hilfsfunktion `interpolateRange()` sortiert die Grenzen mittels `Math.min(min, max)` und `Math.max(min, max)`. Dies bricht die Severity-Auswertung bei absteigenden Wertebereichen (wo `min > max` gilt, z. B. bei der Runway: 60 Monate = unkritisch / Severity 0.0, 36 Monate = kritisch / Severity 1.0).
  - **Beispiel**: Bei `min = 60` (Ausgangspunkt) und `max = 36` (Zielpunkt) führt ein kritischer Runway-Einbruch auf `40` Monate in Codex' Entwurf zu `low = 36, high = 60`. Die Rechnung `(40 - 36) / 24` liefert eine Severity von `0.17` (Fast keine Krise), während ein unkritischer Runway von `56` Monaten eine Severity von `0.83` (Extreme Krise) liefert. Die Steuerung der Sicherheitsmechanismen würde dadurch komplett invertiert!
  - **Korrekturempfehlung**: Die Sortierung der Grenzen über `Math.min` und `Math.max` muss entfernt werden. Die korrekte mathematische Formel lautet:
    `const raw = (value - min) / (max - min);`
    `return Math.max(0, Math.min(1, raw));`
    Dies liefert sowohl für ansteigende (`min < max`) als auch für absteigende (`min > max`) Grenzwerte die korrekte stufenlose Severity ohne Richtungsumkehr.

### 2. Vertragstreue
- **Ausschluss der Notfallgrenzen**: Die Ausgrenzung der harten Untergrenzen aus der Glättung wurde im UI-Erklärungs-Contract und den Akzeptanzkriterien korrekt umgesetzt.

### 3. Fehlerbehandlung
- **Fehlerhaftes Design**: Der Blocker in `interpolateRange()` ist so fundamental, dass er die Paritätsprüfungen und Simulationsläufe mit absteigenden Runway- und Liquiditätsschwellen korrumpieren wird.

### 4. Seiteneffekte
- Die UI-Texte und Diagnoseobjekte (`smoothingLabel`, etc.) sind konzeptionell sauber entworfen, zeigen aber aufgrund des Formelfehlers bei der Runway falsche Werte an.

### 5. Was könnte brechen?
- Ein verkehrtherum interpoliertes Runway-Ziel führt im Simulator dazu, dass bei sinkender Liquidität fälschlicherweise weniger statt mehr Refills angefordert werden, was zu verfrühtem Portfolioversagen führt.

## Review-Ergebnis (Zweites Review)
- Status: blockiert
- Blocker:
  - Logikfehler in `interpolateRange()` bei absteigenden Schwellenwerten (Richtungsverlust der Severity).
- Restrisiken: keine.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Durch die fehlerhafte Invertierung der Runway-Severity im Bärenmarkt fordert die TransactionEngine bei 38 Monaten Liquidität fast keine Refills an, wodurch das liquide Polster vollständig aufgebraucht wird, während bei vollen 58 Monaten Runway panikartig Aktien verkauft werden.

## Review-Feedback von Gemini (Drittes Review - freigegeben)

### 1. Korrektheit
- **Behebung der Runway-Inversion**: Durch den Verzicht auf die Sortierung über `Math.min`/`Math.max` und die Umstellung des Contracts auf `severity0Value` und `severity1Value` berechnet die Formel Severity-Werte sowohl auf aufsteigenden (Drawdown) als auch auf absteigenden (Runway) Skalen mathematisch fehlerfrei.
- **Klammerung**: Die Implementierung stellt durch den Klammerausdruck `Math.max(0, Math.min(1, raw))` sicher, dass Severity-Faktoren niemals außerhalb von `[0, 1]` liegen.

### 2. Vertragstreue
- Die messbaren Akzeptanzkriterien verlangen nun explizite Tests für aufsteigende und absteigende Skalen, was eine Regression in der Implementierungsphase wirksam verhindern wird.

### 3. Fehlerbehandlung
- **Robuste Typenprüfung**: Finite-Checks auf allen Eingangsparametern stellen sicher, dass das Modul bei fehlerhaften Inputs kontrolliert reagiert und `0` meldet, statt `NaN` in die nachgelagerte Engine-Logik durchzureichen.

### 4. Seiteneffekte
- Keine neuen Seiteneffekte identifiziert.

### 5. Was könnte brechen?
- Es wurden keine verbleibenden Blocker identifiziert.

## Review-Ergebnis (Drittes Review)
- Status: freigegeben
- Blocker: keine
- Restrisiken: keine.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Konfigurationsupdate führt dazu, dass `severity0Value` und `severity1Value` für einen Parameter vertauscht eingetragen werden, was stumm die Severity-Richtung umdreht, ohne dass die Typprüfung anschlägt.

## Review-Feedback von Claude

Noch offen.


## Review-Antworten von Codex

### Antwort auf Gemini-Feedback

- **Division durch Null / nicht-finite Interpolation:** Angenommen. Der Plan schreibt jetzt eine zentrale, getestete `interpolateRange()`-Funktion vor. Identische Stuetzwerte, `NaN`, `Infinity` und Out-of-Range-Werte sind explizite Contract- und Testfaelle.
- **Severity-Clamping:** Angenommen. Severity-Werte duerfen ausschliesslich endliche Werte in `[0, 1]` sein. Extrapolation wird ausgeschlossen.
- **UI-Erklaerungsnotstand:** Angenommen. Der Plan enthaelt jetzt einen UI-Erklaerungs-Contract mit `smoothingLabel`, `smoothingExplanation`, Severity-Prozent und Rohzielwerten. Tooltip und Copytext muessen diese Informationen enthalten.
- **Knick-Instabilitaet an Notfallgrenzen:** Angenommen. Harte Mindest-Runway- und Notfallgrenzen bleiben explizit ausserhalb der Glattung; nur Zielwerte duerfen weich werden.

### Antwort auf Gemini-Feedback aus zweitem Review

- **Richtungsverlust bei absteigenden Skalen:** Angenommen. Der Interpolations-Contract verwendet jetzt `severity0Value` und `severity1Value` statt `min`/`max`. Die Stuetzwert-Reihenfolge codiert die fachliche Richtung und wird nicht sortiert.
- **Runway-Inversion:** Behoben im Plan. Die absteigende Runway-Skala ist explizit als `interpolateRange(runwayMonths, 60, 36)` beschrieben und muss mit `60 -> 0`, `36 -> 1`, `40 -> ca. 0.83` getestet werden.
- **Reviewbarkeit:** Die messbaren Akzeptanzkriterien untersagen `Math.min`/`Math.max`-Sortierung fuer Stuetzwerte explizit und verlangen separate Tests fuer aufsteigende und absteigende Skalen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| 1 | Gemini | Division by Zero in Interpolation | Formel gegen `min === max` absichern | erledigt: zentraler `interpolateRange()`-Contract und Testspezifikation ergänzt |
| 2 | Gemini | UI-Erklärungsnotstand | Diagnose-Chips und Texte um Severity-Faktoren erweitern | erledigt: UI-Erklaerungs-Contract ergänzt |
| 3 | Gemini | Knick-Instabilität an Notfallgrenzen | Notfall-Schwellen von Glättung ausschließen und Übergänge glätten | erledigt: harte Grenzen explizit als Nicht-Glattungsbereich festgelegt |
| 4 | Gemini | Richtungsverlust in `interpolateRange()` bei absteigenden Skalen | Stuetzwert-Reihenfolge als fachliche Richtung behandeln und nicht sortieren | erledigt: Contract auf `severity0Value`/`severity1Value` umgestellt, Runway-Beispiel und Testspezifikation ergaenzt |
