# Slice Engine Hardening 03: Missing-Market-Data-Fallback

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** ueberarbeitet - abhaengig von Slice 1 und expliziter Nutzerfreigabe  
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

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine; Slice noch nicht gestartet.

## Offene Risiken

- `side_long` und `peak_stable` koennen unterschiedliche Alarm-Deeskalation ausloesen.
- `transaction-utils.mjs` und `transaction-opportunistic.mjs` verwenden fuer fehlende `seiATH` bereits operativ den neutralen Fallback `1`; dies ist zulaessig, solange `market.seiATH` selbst `null` bleibt.
- Ein `unknown`-Regime waere semantisch sauberer, vergroessert aber den Scope auf alle Consumer und ist nicht freigegeben.

## Rueckdokumentation

Fallback, Datenstatus und Vergleichsergebnisse in Hauptplan, `engine/README.md` und relevante technische Referenz eintragen.

## Freigabestatus

- [ ] Planreview abgeschlossen
- [ ] Nutzer hat Semantik ausdruecklich freigegeben
- [ ] Branch-/Statuscheck aktualisiert
- [ ] Implementierung abgeschlossen
- [ ] Full Suite und Engine-Build gruen
- [x] Gemini-Review
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
