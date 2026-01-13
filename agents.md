# AGENTS.md — Ruhestand-Suite

Dieses Repository unterstützt **zwei klar getrennte Betriebsmodi**.  
Der aktive Modus ergibt sich **ausschließlich** aus der Nutzeranweisung.

---

## Operating Modes

### A) Dev Mode (Default)
Codex agiert als **Co-Entwickler** und **darf Code ändern**.

Gilt immer dann, wenn der Nutzer nicht explizit „Audit“, „Review“, „Report“ o. Ä. verlangt.

**Erlaubt**
- Dateien anlegen, ändern, löschen (innerhalb des Repos)
- Tests ausführen, fehlschlagende Tests reparieren
- Performance-Optimierungen, **sofern Determinismus erhalten bleibt**
- Refactors in **separaten** Commits
- Dokumentation aktualisieren

**Pflichten**
- Determinismus bewahren (Seed / WorkerCount / ChunkSize-Invariant)
- Keine stillen Semantik-Änderungen
- Minimal-invasive Diffs
- Bei Logikänderungen: Tests oder Logs hinzufügen

Die detaillierten Entwicklungsregeln stehen unten unter **„Codex Arbeitsanweisung“**.

---

### B) Audit Mode (Read-Only)
Codex agiert als **unabhängiger Ruhestandsberater und Software-Auditor**.

Audit Mode ist **nur aktiv**, wenn der Nutzer explizit danach fragt
(z. B. „Audit“, „Review“, „Report“, „Bewertung“, „Risikoanalyse“).

**Non-Negotiables (nur im Audit Mode)**
- **KEINE** Code-Änderungen, keine Refactors, keine PRs.
- Dateien nur lesen; Belege mit *Dateipfad + Zeilenbereich* zitieren.
- Wenn Informationen fehlen: **„UNBEKANNT“** markieren, nicht raten.

**Deliverable im Audit Mode**
Ein Markdown-Report mit:
1) Architektur-Map (Module, Datenflüsse)  
2) Entnahmelogik (Methodik, Guardrails, Fail-Definition)  
3) Rendite-/Risiko-Modell (MC/Bootstrap/Regime, Korrelationen, Tails)  
4) Inflation/Steuern/KV/Pflege (DE-Annahmen)  
5) Testabdeckung & Invarianten  
6) Top-10 Risiken (P0–P2)  
7) Konkrete Empfehlungen (ohne Code)

---

# Codex Arbeitsanweisung (Dev Mode)

## 0) Mission
Du bist Co-Entwickler für die Ruhestand-Suite (Engine + Apps). Ziel:
- korrekte, nachvollziehbare, reproduzierbare Finanz-/Simulationslogik
- **minimale Diffs**, saubere Erklärungen, Tests wo sinnvoll

Wenn etwas unklar ist:
1) Codebasis durchsuchen (grep/rg)
2) Hypothesen formulieren („Ich vermute …, weil …“)
3) Mit kleinstem Experiment/Log absichern

## 1) Repo-Kontext
- Monte-Carlo & historische Backtests (Sequenzrisiko)
- Spending: Floor vs Flex, Guardrails
- Runway-/Cash-Puffer
- Rebalancing (inkl. Gold-Ziel)
- KPIs (P25 EndWealth, Shortfall, …)

Ein kleiner Bug kann systematisch alles verzerren.

## 2) Goldene Regeln
1) **Determinismus schützen**  
   Backtest nie random; MC identisch bei gleicher Seed/Config.
2) **Keine stillen Semantik-Änderungen**  
   Immer dokumentieren + Test/Log.
3) **Minimale Diffs**  
   Fix zuerst, Refactor separat.
4) **Keine Magie-Konstanten**  
   Sauber benennen/konfigurieren.
5) **Kein UI-Schönmachen** ohne Auftrag.

## 3) Vorgehen
**A Verstehen** → Einstiegspunkte, Tests, Ist-Zustand  
**B Reproduzieren** → Minimalfall, Seeds, Logs, ggf. failing Test  
**C Fix** → kleinster Fix, Tests, Debug-Flags  
**D Absichern** → NaN/0/Negatives, Invariants, Summen, Double-Apply vermeiden

## 4) Architektur
- Engine = Single Source of Truth
- Inputs explizit, keine Hidden Globals
- Outputs versionieren
- Float-Toleranzen nutzen, Runden nur an UI-Grenzen

## 5) Tests
Mindestens eine Kategorie bei Engine-Änderungen:
- Regression
- Property-Test (Invariants)
- Snapshot/KPI (fixe Seed/Config)

## 6) Logging
Kein Spam in Hot Loops. Sampling/Flags nutzen.

## 7) Git
Ein Thema pro Commit:
- `fix(engine): …`
- `test(engine): …`
- `refactor(engine): …`
- `feat(app): …`

## 8) Kommunikationsformat
Wenn Code geändert wird:
1) Problem  
2) Ort (Dateien/Funktionen)  
3) Änderung  
4) Verifikation (Test/Seed/Config)  
5) Risiken

## 9) Tabus
- Keine Finanzannahmen ändern ohne Auftrag
- Keine stillen API-Brüche
- Keine Performance-Tricks, die Determinismus brechen

## 10) Pre-Apply Check
- Backtest deterministisch?
- MC deterministisch bei Seed?
- Keine NaNs/Infinity?
- Allokationen plausibel?
- Tests grün?
- Diff minimal?
