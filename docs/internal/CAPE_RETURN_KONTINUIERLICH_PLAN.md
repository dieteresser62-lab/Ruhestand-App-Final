# Arbeitsdokument: CAPE-to-Return kontinuierlich modellieren

**Stand:** 2026-06-15  
**Status:** Slice 03 Engine-Integration umgesetzt, Review ausstehend
**Autor:** Codex  
**Verbesserungspunkt:** 2 - CAPE-to-Return kontinuierlicher modellieren  
**Geplanter Feature-Branch:** `codex/cape-return-kontinuierlich`  
**GitHub-Status:** Feature-Branch lokal angelegt, noch nicht veroeffentlicht.

## Einordnung in Roadmap

Dieses Arbeitsdokument ist Schritt 2 der freigegebenen Roadmap `docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md`.

Rolle in der Roadmap:

- Zweiter deterministischer Engine-Baustein nach der Regime-Glattung.
- Definiert die kontinuierliche Renditeerwartung fuer Dynamic-Flex/VPW.
- Muss vor der konservativeren Langlebigkeitslogik stabil sein, damit Renditeannahme und Entnahmehorizont getrennt validiert werden koennen.

Startvoraussetzungen:

- Schritt 1 `Regime-Uebergaenge glaetten` ist reviewed oder explizit fuer Schritt 2 freigegeben.
- Eigener Feature-Branch gemaess Projektregeln.
- Legacy-Verhalten und neues CAPE-Verhalten sind ueber Feature-Flag vergleichbar geplant.

Uebergabegate zu Schritt 3:

- Return-Policy ist als abgegrenzter Engine-Contract dokumentiert oder umgesetzt.
- Auswirkungen auf `expectedRealReturn` sind fuer Grenz-, Normal- und Extremwerte dokumentiert.
- Keine stillen Aenderungen an Dynamic-Flex ausserhalb des geplanten Policy-Pfads.

## Ziel

Dynamic-Flex/VPW soll erwartete Realrenditen nicht mehr ueber grobe CAPE-Stufen ableiten, sondern ueber eine kontinuierliche, nachvollziehbare Funktion. Dadurch sollen Entnahmeraten weniger sprunghaft reagieren, wenn CAPE knapp ueber oder unter einer Schwelle liegt.

## Ausgangslage

Relevante Bereiche:

- `engine/core.mjs`: Dynamic-Flex/VPW-Berechnung, `expectedRealReturn`, `vpwRate`.
- `engine/config.mjs`: CAPE-Schwellen, Fallback-Realrendite, Dynamic-Flex-Konfiguration.
- `app/shared/cape-utils.js`: historische CAPE-Helfer.
- `app/balance/balance-annual-marketdata.js`: Auto-CAPE im Jahreswechsel.
- `app/simulator/*`: Backtest, MC, Sweep, Auto-Optimize, Logspalten.
- Tests: `vpw-dynamic-flex.test.mjs`, `dynamic-flex-horizon.test.mjs`, `simulator-backtest.test.mjs`, `worker-parity.test.mjs`.

Die heutige Logik ist stabil und getestet, aber methodisch diskret. Das macht Grenzfaelle schwerer zu erklaeren.

## Fachlicher Vorschlag

Die erwartete reale Aktienrendite wird aus einem CAPE-Earnings-Yield abgeleitet:

```text
earningsYield = 1 / CAPE
expectedEquityRealReturn = earningsYield + equityRiskPremiumAdjustment - valuationDrag
portfolioExpectedRealReturn =
  equityWeight * expectedEquityRealReturn +
  defensiveWeight * safeRealReturn
```

Der konkrete Formelvorschlag muss vor Umsetzung reviewt werden. Minimalvariante:

```text
expectedRealReturn = clamp((1 / CAPE) + premium - inflationAdjustedSafeRate, min, max)
```

Wichtig: Die Formel soll konservativ bleiben und darf keine Pseudo-Praezision erzeugen.

## Designprinzipien

- Die bisherige Stufenlogik bleibt zunaechst als Legacy-/Fallback-Modus verfuegbar.
- Default-Wechsel erst nach Review und Backtest-Vergleich.
- Jede Ausgabe muss die verwendete Methode anzeigen.
- CAPE `null`, `0`, unplausibel oder Fetch-Fehler fallen sauber auf vorhandene Fallbacks zurueck.

## Vorgeschlagene Architektur

### Neues Policy-Modul

Moeglicher Pfad:

- `engine/planners/vpw-return-policy.mjs`

Exports:

- `deriveVpwExpectedRealReturn(context)`
- `deriveCAPEContinuousReturn(cape, options)`
- `deriveCAPELegacyStepReturn(cape, options)`
- `normalizeVpwReturnPolicyOptions(input, config)`

### Konfiguration

In `engine/config.mjs`:

- `DYNAMIC_FLEX.RETURN_POLICY = 'legacy_step' | 'cape_continuous'`
- `CAPE_CONTINUOUS.MIN_REAL_RETURN`
- `CAPE_CONTINUOUS.MAX_REAL_RETURN`
- `CAPE_CONTINUOUS.EQUITY_RISK_PREMIUM`
- `CAPE_CONTINUOUS.SAFE_REAL_RETURN`
- `CAPE_CONTINUOUS.DEFAULT_CAPE`

### Diagnosefelder

In `result.ui.vpw`:

- `returnPolicy`
- `capeRatioUsed`
- `earningsYield`
- `equityRiskPremium`
- `safeRealReturn`
- `expectedRealReturnRaw`
- `expectedRealReturnClamped`
- `expectedReturnSource`

Bestehende Felder wie `expectedRealReturn` bleiben erhalten.

## Umsetzungspakete

### Paket 1: Formel- und Contract-Entscheidung

- Fachliche Formel im Arbeitsdokument finalisieren.
- Legacy- und Continuous-Modus als expliziten Contract definieren.
- Grenzwerte fuer CAPE und Rendite-Clamps festlegen.

Akzeptanz:

- Reviewer koennen die Formel ohne Codekontext nachvollziehen.
- Kein Default-Wechsel ohne explizite Freigabe.

### Paket 2: Policy-Modul und Unit-Tests

- Neues Policy-Modul erstellen.
- Unit-Tests fuer CAPE 10, 15, 20, 25, 30, 35, 45, `null`, `0`, `NaN`.

Akzeptanz:

- Monotonie: Hoeheres CAPE fuehrt nicht zu hoeherer erwarteter Rendite.
- Clamps greifen transparent.

### Paket 3: Engine-Integration hinter Modus

- `engine/core.mjs` nutzt Policy-Modul.
- Legacy-Modus bleibt Default.
- Diagnosepayload erweitern.

Akzeptanz:

- Bestehende Tests bleiben im Legacy-Modus unveraendert.
- Continuous-Modus hat eigene Tests.

### Paket 4: Simulator-/Balance-Durchreichung

- Inputs/Profil/Auto-Optimize/Sweep optional erweitern, falls Nutzersteuerung gewollt ist.
- Alternativ: Modus nur config-basiert halten.

Akzeptanz:

- Backtest, MC, Worker und Sweep nutzen dieselbe Policy.
- Worker-Paritaet bleibt erhalten.

### Paket 5: Default-Entscheidung und Doku

- Vergleichsbericht Legacy vs. Continuous.
- Entscheidung dokumentieren, ob Continuous Default wird.
- README/TECHNICAL/ARCHITEKTUR aktualisieren.

## Betroffene Dateien voraussichtlich

- `engine/core.mjs`
- `engine/config.mjs`
- `engine/planners/vpw-return-policy.mjs` (neu)
- `engine/README.md`
- `app/simulator/simulator-year-result.js`
- `app/simulator/simulator-results.js`
- `app/balance/balance-diagnosis-keyparams.js`
- Tests: `vpw-dynamic-flex.test.mjs`, `simulator-backtest.test.mjs`, `worker-parity.test.mjs`, ggf. neue `vpw-return-policy.test.mjs`
- Referenzdoku

Mehr als 5 Dateien sind wahrscheinlich betroffen; Umsetzung nur in Slices.

## Risiken

- Ergebnisabweichungen in Dynamic-Flex koennen fachlich gross sein.
- Eine scheinbar akademisch bessere Formel kann schlechter kalibriert sein.
- Auto-Optimize koennte aggressivere Loesungen finden, wenn erwartete Renditen steigen.
- Logs koennen verwirrender werden, wenn Legacy- und Continuous-Begriffe vermischt werden.

## Stop-Regeln fuer Umsetzung

Stoppen und nachfragen, wenn:

- VPW-Entnahmen in Referenzszenarien deutlich steigen.
- Auto-Optimize Top-Loesungen aggressiver werden, ohne Safety-Guard-Anpassung.
- CAPE-Fallbacks unklar werden.
- Bestehende Tests nur durch Anpassung erwarteter Werte statt durch Contract-Erweiterung gruen wuerden.

## Validierung

Mindestens:

- Neuer fokussierter Policy-Test.
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
- `node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm run build:engine`
- `npm test`

Vergleichsvalidierung:

- Backtest mit Legacy und Continuous fuer 2000-2025.
- MC-Kurzlauf mit gleichen Seeds fuer Legacy und Continuous.
- Report: Success Rate, P10/P50/P90, maximale Kuerzung, VPW-Rate.

## Konkretisierung fuer Review

### Nicht-Ziele

- Kein ungepruefter Default-Wechsel auf die neue Formel.
- Keine Entfernung der Legacy-Stufenlogik in der ersten Umsetzung.
- Keine automatische Online-Beschaffung neuer Kapitalmarktannahmen.
- Keine Veraenderung der CAPE-Fetch-Fallback-Kette im Jahreswechsel.

### Vorlaeufiger Formel-Contract

Dieser Contract ist Review-Gegenstand, nicht bereits Freigabe:

```text
cape = normalizeCape(inputCAPE, DEFAULT_CAPE)
earningsYield = 1 / cape
rawEquityRealReturn = earningsYield + EQUITY_PREMIUM_ADJUSTMENT
equityRealReturn = clamp(rawEquityRealReturn, MIN_EQUITY_REAL_RETURN, MAX_EQUITY_REAL_RETURN)
portfolioRealReturn = equityWeight * equityRealReturn + (1 - equityWeight) * safeRealReturn
expectedRealReturn = clamp(portfolioRealReturn, MIN_REAL_RETURN, MAX_REAL_RETURN)
```

`normalizeCape()` ist kein `inputCAPE || DEFAULT_CAPE`. Der Contract lautet:

- Nur endliche numerische CAPE-Werte innerhalb des bestehenden CAPE-Validierungsbereichs werden direkt verwendet.
- `null`, `undefined`, leerer String, `NaN`, `Infinity`, `0` und negative Werte fallen auf `DEFAULT_CAPE` zurueck oder werden durch den bestehenden InputValidator abgelehnt, je nachdem ob der Wert aus optionalem Live-Fallback oder Nutzerinput stammt.
- Negatives CAPE darf niemals durch `clamp(-5, 5, 80)` in ein extrem guenstiges CAPE 5 verwandelt werden.
- Der Diagnosepayload muss `capeInputStatus` ausgeben: `valid`, `fallback_missing`, `fallback_invalid`, `validated_error`.

Vorlaeufige Parameter nur fuer Review:

| Parameter | Vorschlag | Begruendung | Review-Frage |
|---|---:|---|---|
| `DEFAULT_CAPE` | 20 | heutiger neutraler Fallback nah an bestehender Logik | Ist 20 weiterhin angemessen? |
| `MIN_REAL_RETURN` | -0.015 | negative reale Erwartung zulassen | Zu pessimistisch/optimistisch? |
| `MAX_REAL_RETURN` | 0.07 | harte Obergrenze gegen Pseudo-Praezision | Soll Obergrenze niedriger sein? |
| `MIN_EQUITY_REAL_RETURN` | -0.03 | Aktienerwartung vor Portfolio-Mix begrenzen | Untergrenze ausreichend konservativ? |
| `MAX_EQUITY_REAL_RETURN` | 0.08 | extreme CAPE-Earnings-Yields vor Gewichtung deckeln | Obergrenze zu hoch? |
| `EQUITY_PREMIUM_ADJUSTMENT` | 0.015 | konservativer Zusatz zu Earnings Yield | Fachlich tragfaehig? |
| `SAFE_REAL_RETURN_MODE` | `config_or_zero` | zuerst Engine-/Input-Konfiguration, sonst 0 | Kopplung an bestehende Geldmarktannahme pruefen |

Safe-Rate-Contract:

- `safeRealReturn` darf nicht als zweiter, widerspruechlicher Geldmarktparameter entstehen.
- Wenn die Engine bereits einen realen defensiven Zinssatz aus Inputs/Konfiguration kennt, muss die CAPE-Policy diesen verwenden.
- Falls kein solcher Wert stabil verfuegbar ist, gilt fuer Version 1 `0.00` als dokumentierter neutraler Fallback mit Diagnose `safeRealReturnSource='fallback_zero'`.

### Contract-Matrix

| Bereich | Bestehender Contract | Neuer/erweiterter Contract | Review-Fokus |
|---|---|---|---|
| Engine | `expectedRealReturn` wird intern abgeleitet | Policy-Modul liefert Legacy oder Continuous | Keine versteckte Default-Aenderung |
| Diagnose | `result.ui.vpw.expectedRealReturn` | zusaetzliche Herleitungsfelder | Keine Pseudo-Genauigkeit |
| Balance | Auto-CAPE liefert CAPE-Wert | CAPE-Wert bleibt Input, Formel ist Engine-Sache | Fetch-Contract unveraendert |
| MC/Backtest | Runner uebergibt CAPE/Inputs | gleiche Policy in Serial und Worker | Paritaet |
| Optimizer/Sweep | Dynamic-Flex-Parameter optimierbar | Return-Policy nicht automatisch optimierbar | Keine aggressive Umgehung |

### Messbare Akzeptanzkriterien

- Legacy-Modus erzeugt fuer bestehende Tests unveraenderte Resultate.
- Continuous-Modus ist monoton fallend bezogen auf CAPE: CAPE 10 > CAPE 20 > CAPE 35 in erwarteter Realrendite.
- Unplausible CAPE-Werte (`0`, negativ, `NaN`, `Infinity`, >100) erzeugen keinen Crash und melden `expectedReturnSource='fallback'` oder Validierungsfehler gemaess bestehendem CAPE-Contract.
- `expectedRealReturnRaw` und `expectedRealReturnClamped` muessen beide im Diagnosepayload sichtbar sein, wenn ein Clamp greift.
- Backtest-Vergleich muss Entnahme-, Erfolgs- und P10/P50/P90-Deltas dokumentieren; keine stillen Golden-Value-Anpassungen.
- Negative CAPE-Werte duerfen nicht zu `cape=5` normalisiert werden; sie muessen Fallback oder Validierungsfehler erzeugen.
- Aktien-Realrendite und Portfolio-Realrendite werden separat geklammert und separat diagnostiziert.
- `safeRealReturnSource` muss in jedem Continuous-Policy-Ergebnis gesetzt sein.

### Referenzszenarien

| ID | CAPE | Aktienquote | Erwartung |
|---|---:|---:|---|
| C1 | 10 | 60% | Hohe, aber gedeckelte Realrendite |
| C2 | 20 | 60% | Neutraler Bereich nahe bestehendem Fallback |
| C3 | 35 | 60% | Niedrige Realrendite, ggf. Clamp-nah |
| C4 | 45 | 90% | Extrem teuer, klare Warn-/Diagnosewirkung |
| C5 | `null` | 60% | Fallback ohne Crash |

### Slice-Zuschnitt fuer spaetere Umsetzung

1. `SLICE_CAPE_RETURN_01_POLICY_CONTRACT.md`: Formelentscheidung, Parameter, Red-State-Tests.
2. `SLICE_CAPE_RETURN_02_POLICY_MODULE.md`: Policy-Modul mit Legacy/Continuous.
3. `SLICE_CAPE_RETURN_03_ENGINE_INTEGRATION.md`: Engine-Integration hinter Legacy-Default.
4. `SLICE_CAPE_RETURN_04_RUNNER_PARITY.md`: Backtest/MC/Worker/Sweep-Paritaet.
5. `SLICE_CAPE_RETURN_05_DIAGNOSIS_DOCS.md`: UI-/Log-Erklaerung, Vergleichsreport, Default-Entscheidung.

### Umsetzungsstatus

| Slice | Status | Branch | Ergebnis |
|---|---|---|---|
| `SLICE_CAPE_RETURN_02_POLICY_MODULE.md` | freigegeben | `codex/cape-return-kontinuierlich` | Policy-Modul, Config-Defaults und Unit-Tests erstellt; Legacy bleibt Default, keine Engine-Integration; B1/B2 behoben |
| `SLICE_CAPE_RETURN_03_ENGINE_INTEGRATION.md` | freigegeben | `codex/cape-return-kontinuierlich` | Policy-Modul in `engine/core.mjs` verdrahtet; Legacy bleibt Default; Continuous per Config aktivierbar und in `ui.vpw` diagnostiziert |

### Reviewer-Pruefauftrag

- Pruefen, ob die Formel fachlich vertretbar oder nur scheinbar praeziser ist.
- Pruefen, ob Legacy vollstaendig erhalten bleibt.
- Pruefen, ob Auto-Optimize durch hoehere erwartete Renditen zu aggressive Kandidaten bevorzugen koennte.
- Pruefen, ob Diagnose und Doku die Unsicherheit der Formel ausreichend offenlegen.

## Offene Fragen fuer Review

1. Welche konkrete CAPE-Formel ist akzeptabel konservativ?
2. Soll der Modus fuer Nutzer sichtbar sein oder nur intern konfiguriert werden?
3. Wird Continuous spaeter Default oder bleibt es ein Expertenmodus?
4. Welche Abweichung in Entnahmehoehe ist akzeptabel?

### Review-Feedback von Gemini (Erstes Review - blockiert)

### 1. Korrektheit
- **Eingabe-Validierung**: Der Ausdruck `inputCAPE || DEFAULT_CAPE` fängt ungültige Zahlen wie negative Werte (z. B. `-5`) oder `0` nicht ab, da sie im JavaScript-Kontext als truthy bzw. falsy gewertet werden. Ein negativer Wert wie `-5` umgeht das ODER und wird an `clamp(-5, 5, 80)` übergeben, was zu einem CAPE-Wert von `5` (und somit einer extrem hohen, unrealistischen Renditeerwartung von 20% + Premium) führt.
- **Formel-Klammerung**: Der Entwurf klammert die erwartete Rendite erst auf Portfolio-Ebene. Fachlich sinnvoller wäre es, die Aktienrendite (`rawEquityRealReturn`) selbst zu deckeln, um unplausible Extremwerte bei sehr niedrigem CAPE zu verhindern, bevor die Asset-Allokation einfließt.

### 2. Vertragstreue
- **Risikofreier Zins**: Die Festlegung von `SAFE_REAL_RETURN = 0.00` als Konstante weicht möglicherweise von bestehenden Annahmen in anderen Teilen der Engine oder historischen Backtest-Zinssätzen ab. Dies erzeugt eine stille Semantikänderung beim Wechsel des Modus.

### 3. Fehlerbehandlung
- **Typen-Sicherheit**: Es fehlen explizite Prüfungen auf `typeof cape !== 'number'` oder `Number.isNaN(cape)`. Strings wie `"abc"` würden die Berechnungen laut Entwurf mit `NaN` korrumpieren und zu unvorhersehbaren Abstürzen im Simulator führen.

### 4. Seiteneffekte
- **Auto-Optimize**: Durch den kontinuierlichen Übergang könnte der Auto-Optimizer bei niedrigen CAPE-Werten (hohen Renditeerwartungen) zu aggressive Entnahmestrategien wählen, die in realen historischen Stressszenarien (z. B. unmittelbarer Crash nach Niedrig-CAPE) scheitern.

### 5. Was könnte brechen?
- **Worker-Parität & Precision Drift**: Fließkomma-Präzisionsunterschiede zwischen Node.js (Tests) und V8 im Browser (Workers) bei der kontinuierlichen Division `1 / cape` können zu minimal abweichenden Endwerten führen, welche die Paritätsprüfung brechen.

## Review-Ergebnis (Erstes Review)
- Status: blockiert
- Blocker: 
  - Fehlende robuste Typ- und Werteprüfung von `inputCAPE` (insb. Abfangen von Werten <= 0, `NaN`, `Infinity` und Nicht-Nummern).
  - Fehlende Synchronisation des `SAFE_REAL_RETURN` mit den restlichen Engine-Vorgaben.
- Restrisiken: 
  - Kalibrierungsrisiko: Kontinuierliche Kurven können im Vergleich zur bewährten Stufenlogik in historischen Grenzszenarien zu optimistisches Verhalten induzieren.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein fehlerhafter API-Fetch liefert ein leeres oder korruptes CAPE-Objekt, das durch unvollständige Typprüfung als `NaN` in die Division einfließt und den Monte-Carlo-Runner lautlos mit `NaN`-Entnahmeraten abstürzen lässt.

## Review-Feedback von Gemini (Zweites Review - freigegeben)

### 1. Korrektheit
- **Eingabe-Validierung**: Der neu eingeführte `normalizeCape()`-Contract fängt nicht-numerische, unendliche, Null- und negative Werte wirksam ab und fällt deterministisch auf `DEFAULT_CAPE` zurück.
- **Formel-Klammerung**: Die zweistufige Klammerung (Aktienrendite bei max. 8%, Portfolio bei max. 7%) begrenzt das Risiko unphysikalisch hoher Renditeerwartungen bei extrem niedrigem CAPE zuverlässig.

### 2. Vertragstreue
- **Safe-Rate-Integration**: Die Synchronisation über `SAFE_REAL_RETURN_MODE` stellt sicher, dass die Continuous Policy dieselbe Geldmarktannahme nutzt wie die übrige Simulation.

### 3. Fehlerbehandlung
- **Diagnose-Erweiterungen**: Die Diagnosefelder `capeInputStatus` und `safeRealReturnSource` machen Fehlverhalten (z. B. unbemerkte Fallbacks) im Simulationslauf unmittelbar sichtbar.

### 4. Seiteneffekte
- **Dynamik-Verlust bei CAPE < 12.5 (Restrisiko)**: Die starre Kappung der Aktien-Realrendite auf 8% (`MAX_EQUITY_REAL_RETURN = 0.08`) bedeutet, dass bei jedem CAPE-Wert unter 12.5 die erwartete Aktienrendite konstant flach bleibt. Für ein 60/40-Portfolio resultiert dies in einer Deckelung bei `4.8%` expected return. Die kontinuierliche Kurve verhält sich in diesem Bereich also exakt wie ein starrer Schritt. Dies drosselt die berechneten Entnahmeraten im Vergleich zur Legacy-Stufenlogik in extrem günstigen Phasen. Dieses Verhalten ist zwar konservativ, muss jedoch im Backtest-Bericht (Paket 5) verifiziert werden.

### 5. Was könnte brechen?
- Es wurden keine verbleibenden prozessualen oder mathematischen Blocker identifiziert.

## Review-Ergebnis (Zweites Review)
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Dämpfungseffekt bei extrem günstigen Bewertungen (CAPE < 12.5) durch den doppelten Clamp-Mechanismus.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein veraltetes Profil-State-Backup aus dem Browser überschreibt die neuen Config-Keys mit `null`, wodurch `normalizeCape` lautlos auf `DEFAULT_CAPE` zurückfällt und ein eigentlich günstiges Marktumfeld fälschlicherweise defensiv bewertet wird.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

### Antwort auf Gemini-Feedback

- **Ungenuegende CAPE-Validierung:** Angenommen. Der Plan ersetzt `inputCAPE || DEFAULT_CAPE` durch den expliziten `normalizeCape()`-Contract. Negative, nicht-finite und Null-Werte duerfen nicht zu guenstigem CAPE 5 geklemmt werden.
- **Formel-Klammerung:** Angenommen. Die Aktien-Realrendite wird vor dem Portfolio-Mix separat mit `MIN_EQUITY_REAL_RETURN` und `MAX_EQUITY_REAL_RETURN` geklammert. Die Portfolio-Realrendite wird danach nochmals geklammert.
- **Safe-Rate-Diskrepanz:** Angenommen. Der Plan fuehrt `SAFE_REAL_RETURN_MODE='config_or_zero'` and `safeRealReturnSource` ein. Die Policy muss zuerst bestehende Engine-/Input-Konfiguration nutzen und nur sonst auf `0.00` fallen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| 1 | Gemini | Ungenügende Validierung von `inputCAPE` | Validierung vor `clamp` erzwingen | erledigt: `normalizeCape()`-Contract und Diagnosefelder ergänzt |
| 2 | Gemini | Safe-Rate-Diskrepanz | Safe-Rate-Zinssatz konfigurierbar an Engine-Standard koppeln | erledigt: `SAFE_REAL_RETURN_MODE` und `safeRealReturnSource` ergänzt |
| 3 | Gemini | Aktienrendite erst nach Portfolio-Mix geklammert | Aktien- und Portfolio-Realrendite separat klammern | erledigt: zweistufiger Clamp-Contract ergänzt |
