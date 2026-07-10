# Slice Engine Hardening 03: Missing-Market-Data-Fallback

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** umgesetzt - Review und Nutzerabnahme ausstehend
**Aenderungsbereich:** Punkt 3 / Contract C3

## Ziel

Fehlende Kurs-/ATH-Daten duerfen nicht mehr als neues Allzeithoch diagnostiziert werden. Der Analyzer liefert einen expliziten Datenqualitaetsstatus und einen nachvollziehbaren neutralen Fallback.

## Akzeptanzkriterien

- Ein ATH-/Drawdown-Regime wird nur bei `ath > 0` und `endeVJ > 0` abgeleitet.
- Bei fehlenden Kerndaten gilt `marketDataStatus: 'missing'` und `sKey: 'side_long'`.
- In diesem Fall erscheinen weder `Neues Allzeithoch` noch Momentum-/Recovery-Gruende.
- Der Missing-Data-Grund wird genau einmal ausgegeben.
- Ohne gueltige ATH-Basis gelten `abstandVomAthProzent = null` und `seiATH = null`; `perf1Y` ist nur bei gueltigem aktuellem und Vorjahreswert berechnet, sonst `0`.
- Consumer duerfen fuer operative ATH-Skalierung neutral `1` verwenden, muessen diesen Wert jedoch als Fallback behandeln und duerfen daraus kein echtes ATH diagnostizieren.
- Ein gueltiges CAPE-Signal wird unabhaengig ausgewertet; fehlendes CAPE nutzt weiter den dokumentierten CAPE-Fallback.
- `partial` ist exakt spezifiziert: aktueller Wert plus ATH ohne Vorjahreswert erlaubt Drawdown ohne Momentum; aktueller plus Vorjahreswert ohne ATH erlaubt nur Performance-Diagnose und verwendet `side_long`.
- Vollstaendige bestehende Peak-, Bear-, Recovery- und Stagflationsfaelle bleiben unveraendert.
- Nutzer hat die Semantikaenderung `peak_stable -> side_long` fuer Missing Data vor Coding ausdruecklich freigegeben.

## Scope

- `engine/analyzers/MarketAnalyzer.mjs`,
- `tests/market-analyzer.test.mjs`,
- `tests/core-engine.test.mjs`,
- `engine.js` generiert.

Nicht-Scope:

- Bear-/Krisenfallback,
- neue Prognose,
- Datenabruf oder Retry,
- Simulator-Sampler,
- Regime-Smoothing-Schwellen.

## Git- und Diff-Risiko vor Coding

```text
Branch bei Planung: codex/engine-contract-hardening
Status bei Planung: fremde Doku-/node_modules-Aenderungen und Planungsdateien vorhanden

Geplante Dateien:
- engine/analyzers/MarketAnalyzer.mjs
- tests/market-analyzer.test.mjs
- tests/core-engine.test.mjs
- engine.js (generiert)

Voraussichtliche Aenderungstiefe:
- mittel bis riskant (fachliche Engine-Semantik)

Gefaehrdete bestehende Tests:
- market-analyzer
- core-engine
- regime-signals
- balance/simulator backtest and worker parity

Nicht anfassen:
- CONFIG-Regime-Schwellen
- regime-signals.mjs
- CAPE-Return-Policy
- minimumFlexAnnual
- dist/ und EXE

Rollback-Strategie:
- git checkout -- engine/analyzers/MarketAnalyzer.mjs tests/market-analyzer.test.mjs tests/core-engine.test.mjs engine.js
```

Branch/Status und ausdrueckliche Semantikfreigabe sind vor Coding zu dokumentieren.
Vor dem ersten Edit ist ausserdem eine unveraenderte Backtest-/Result-Baseline fuer Missing Data, vollstaendigen Peak und vollstaendigen Bear zu dokumentieren.

### Tatsaechlicher Startcheck 2026-07-10

```text
Branch: codex/engine-contract-hardening
Status vor Coding:
- fremde, bereits vorhandene Doku-Aenderungen in README-/Referenzdateien
- fremde node_modules-Aenderungen durch Playwright-Installation
- keine offenen Engine- oder Slice-3-Testaenderungen

Nutzerfreigabe:
- am 2026-07-10 mit "Dann mache erstmal Slice 3" ausdruecklich erteilt
```

Baseline vor dem ersten Code-Edit:

| Fall | sKey | perf1Y | ATH-Abstand | seiATH | Diagnose |
|---|---|---:|---:|---:|---|
| alle Kurswerte `0` | `peak_stable` | 0 | 0 | 1 | faelschlich `Neues Allzeithoch` |
| vollstaendiger Peak 100/95/ATH 100 | `peak_stable` | 5,2632 | 0 | 1 | `Neues Allzeithoch` |
| vollstaendiger Bear 70/100/ATH 100 | `bear_deep` | -30 | 30 | 0,7 | `ATH-Abstand > 20%` |

Repräsentativer Simulator-Backtest 2000-2025 vor Coding:

```text
Zeilen: 26
Endvermoegen: 3.231.509,060520708 EUR
Aktien: 3.113.598,016622829 EUR
Gold: 0 EUR
Liquiditaet: 117.911,04389787915 EUR
max. absoluter bestehender FlowDelta: 662,5194428726099 EUR
Testlauf: 39/39 Assertions gruen
```

Der bereits in der Baseline vorhandene FlowDelta wird nicht als Folge von Slice 3 behandelt;
nach dem Edit darf er weder zunehmen noch in zuvor unauffaellige Vergleichsfaelle wandern.

## Geplante Tests

```text
node tests/run-single.mjs tests/market-analyzer.test.mjs
node tests/run-single.mjs tests/core-engine.test.mjs
node tests/run-single.mjs tests/regime-signals.test.mjs
node tests/run-single.mjs tests/worker-parity.test.mjs
node tests/run-single.mjs tests/simulator-backtest.test.mjs
npm run build:engine
npm test
```

Testmatrix: alle Kurswerte `0`, fehlender aktueller Wert, aktueller Wert ohne ATH/Vorjahr, aktueller plus ATH ohne Vorjahr, aktueller plus Vorjahr ohne ATH, nur CAPE, vollstaendiger Peak und vollstaendiger Bear.

## Durchgefuehrte Aenderungen

- `MarketAnalyzer` bewertet Kurswerte nur noch als gueltig, wenn sie endliche positive Zahlen sind.
- `marketDataStatus` unterscheidet die spezifizierten Zustaende `missing`, `partial` und `complete`.
- Ohne gueltige ATH-Basis bleiben `abstandVomAthProzent` und `seiATH` `null`; der operative Fallback ist `side_long`.
- Missing Data erhaelt genau einmal den Grund `Marktdaten fehlen; neutraler Fallback aktiv` und kann kein ATH-, Momentum- oder Recovery-Signal erzeugen.
- `endeVJ + ath` erlaubt im Partial-Fall weiterhin Drawdown-Klassifikation, jedoch kein Momentum; `endeVJ + endeVJ_1` exponiert Performance nur diagnostisch und bleibt ohne ATH im Fallback.
- CAPE-Auswertung und vollstaendige Peak-/Bear-/Recovery-Klassifikation bleiben unabhaengig bzw. unveraendert.
- Contract-Tests decken die Datenstatus-Matrix und den Core-Durchgriff ab.
- `engine/README.md` und `docs/reference/TECHNICAL.md` dokumentieren den neuen Ausgabecontract.
- `npm run build:engine` wurde ausgefuehrt; der Modul-Wrapper `engine.js` blieb dabei inhaltlich unveraendert.

## Ausgefuehrte Tests mit Ergebnis

| Lauf | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/market-analyzer.test.mjs` | 41/41 Assertions gruen |
| `node tests/run-single.mjs tests/core-engine.test.mjs` | 20/20 Assertions gruen |
| `node tests/run-single.mjs tests/regime-signals.test.mjs` | 77/77 Assertions gruen |
| `node tests/run-single.mjs tests/worker-parity.test.mjs` | 354/354 Assertions gruen |
| `node tests/run-single.mjs tests/simulator-backtest.test.mjs` | 39/39 Assertions gruen |
| `npm run build:engine` | erfolgreich; Fallback-Build ohne esbuild, kein `engine.js`-Delta |
| `npm test` | 101 Dateien, 3062/3062 Assertions gruen |

Der Backtest-Vergleich 2000-2025 ist bitgenau zur Vorher-Baseline: 26 Zeilen,
3.231.509,060520708 EUR Endvermoegen und maximaler absoluter FlowDelta
662,5194428726099 EUR. Es entstand weder ein Snapshot-/Backtest-Delta noch eine
neue FlowDelta-Auffaelligkeit.

## Abweichungen vom Plan

- `engine.js` war als erwartetes generiertes Artefakt eingeplant, blieb beim erfolgreichen Fallback-Build jedoch unveraendert.
- Der bereits vor Slice 3 vorhandene Backtest-FlowDelta von 662,5194428726099 EUR blieb exakt stabil; er wurde nicht im fachlich fremden Slice veraendert.

## Offene Risiken

- `side_long` und `peak_stable` koennen unterschiedliche Alarm-Deeskalation ausloesen.
- `transaction-utils.mjs` und `transaction-opportunistic.mjs` verwenden fuer fehlende `seiATH` bereits operativ den neutralen Fallback `1`; dies ist zulaessig, solange `market.seiATH` selbst `null` bleibt.
- Ein `unknown`-Regime waere semantisch sauberer, vergroessert aber den Scope auf alle Consumer und ist nicht freigegeben.
- Externe Consumer, die `null` faelschlich als numerisches ATH-Signal interpretieren, bleiben ein Integrationsrisiko; die bekannten Engine-Consumer nutzen bereits neutrale Fallbacks.

## Rueckdokumentation

- Hauptplan: Slice-Status und ausdrueckliche Semantikfreigabe aktualisiert.
- `engine/README.md`: Marktdatenqualitaets-Contract ergaenzt.
- `docs/reference/TECHNICAL.md`: Analyzer-Pipeline und neue Feldsemantik ergaenzt.

## Freigabestatus

- [x] Planreview abgeschlossen
- [x] Nutzer hat Semantik ausdruecklich freigegeben
- [x] Branch-/Statuscheck aktualisiert
- [x] Implementierung abgeschlossen
- [x] Full Suite und Engine-Build gruen
- [x] Gemini-Planreview
- [x] Gemini-Implementierungsreview
- [ ] Nutzerfreigabe

### Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** `seiATH` und `abstandVomAthProzent` werden nun bei fehlender ATH-Basis auf `null` gesetzt. Dies löst den logischen Widerspruch und verhindert, dass Downstream-Module fälschlicherweise ein ATH annehmen. Skalierungen nutzen einen gesonderten Consumer-Fallback von `1` (gelöst, Finding **G-06**).
- **Seiteneffekte:** Die Baseline-Pflicht vor der Durchführung dieses Slice sichert ab, dass verhaltensändernde Effekte der Spending-Transitions exakt quantifiziert und durch den Nutzer explizit freigegeben werden.

### 2. Findings (Gemini)
- **G-06 (Mittel):** Logischer Widerspruch bei `seiATH = 1` trotz fehlender Marktdaten (gelöst, Werte werden `null`).

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Bei fehlenden Marktdaten wechselt die Engine auf `side_long`, meldet aber gleichzeitig `seiATH = 1`. Ein UI-Modul oder ein nachgelagerter Optimizer wertet das ATH-Flag aus und meldet dem Nutzer fälschlicherweise "Ihr Portfolio befindet sich auf einem historischen Höchststand", obwohl die Datenleitung unterbrochen ist.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Verhaltensänderung der Entnahmerate durch Regime-Wechsel (Nutzer-Freigabe erforderlich).

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

- **G-06 angenommen mit Praezisierung:** `seiATH` ist eine Quote, kein Flag. Bei fehlender ATH-Basis wird sie `null`, ebenso der ATH-Abstand. Consumer duerfen intern neutral `1` einsetzen, duerfen dies aber nicht als beobachtetes ATH ausgeben.
- **F-S03-01 angenommen:** Die Verhaltensaenderung wird vor Coding mit Missing-/Peak-/Bear-Baselines quantifiziert und bleibt nutzerfreigabepflichtig.
- **F-S03-02 angenommen:** `missing`, `partial` und `complete` sind im Hauptplan als Datenmatrix spezifiziert.
- **F-PLAN-03 nicht reproduzierbar, aber geklaert:** Der aktuelle Plan legt nun ausdruecklich die Reihenfolge `1 -> 3 -> 2 -> 8` fest; dieser Slice haengt nur von Slice 1 ab.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-06 | Gemini | Logischer Widerspruch seiATH = 1 bei missing data | gelöst | `seiATH = null`, operativer Fallback separat |
| F-S03-01 | Claude | Verhaltensaenderung unvollstaendig | angenommen | Baseline und Nutzerfreigabe |
| F-S03-02 | Claude | partial unspezifiziert | angenommen | Datenstatus-Matrix |
| F-PLAN-03 | Claude | Abhaengigkeit inkonsistent | geklaert | explizite Reihenfolge `1 -> 3 -> 2 -> 8` |
