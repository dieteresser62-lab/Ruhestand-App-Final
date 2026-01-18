# Haushalt: Simulation, Risiko-Budget, Entnahme-Orchestrator, Cash-Puffer

Dieses Dokument beschreibt konkrete Umsetzungsoptionen fuer profiluebergreifende Funktionen in der Ruhestand-Suite.

## Grundannahmen

- Profile bleiben getrennt und lokal gespeichert.
- Haushalt ist ein virtueller View, der Profile on-the-fly kombiniert.
- Marktannahmen sind global (einheitlich fuer alle Profile).
- Keine stillen Semantik-Aenderungen; deterministische Runs bleiben gleich.

---

## 1) Haushalts-Simulation (Aggregation)

### Ziel
Haushaltssicht, die 2+ Profile zusammenfasst, um Gesamtvermoegen, Entnahmesicherheit und Runway auf Haushaltsebene zu sehen.

### Datenmodell (minimal)
- HouseholdSelection
  - profileIds: string[]
  - aggregationStrategy: "additive" | "accounts"

- HouseholdSnapshot
  - profiles: ProfileData[]
  - combinedBalance: BalanceState
  - combinedSimulatorInput: SimulatorState
  - combinedTranchen: Tranche[]

### Aggregationsstrategie
1) **Additive (einfachste)**
   - Startvermoegen = Summe Startvermoegen
   - Cashflows = Summe aller Renten/Einnahmen
   - Entnahmen = gemeinsame Strategie
   - Ergebnis ist eine Simulation eines gemeinsamen Portfolios

2) **Accounts (konservativer)**
   - Pro Profil getrennte Portfolios
   - Gemeinsamer Marktpfad, aber getrennte Konten
   - Haushaltsergebnis = Summe ueber Konten
   - Vorteil: zeigt Verteilungs- und Liquiditaetsrisiken
   - MVP-Naeherung: Drawdown wird konservativ als Max je Profil aggregiert

### UI/UX
- Index: Auswahl mehrerer Profile mit Checkboxen
- Simulator: Tab "Haushalt" mit Ergebnis-Dashboard
- Anzeige: Gesamtvermoegen, Ruin-Rate, P25, Cash-Puffer
- Drilldown: Beitrag je Profil

### Minimal-Implementierung (Phase 1)
1) Profile-Auswahl in Index
2) CombinedSimulatorInput (Additive)
3) Household-Sim in Simulator mit eigenem Button
4) Ergebnis mit bestehenden KPI-Renderern anzeigen

---

## 2) Risiko-Budget

### Ziel
Das Haushaltsrisiko wird fair verteilt: jedes Profil hat ein Risiko-Budget, das nicht ueberschritten werden darf.

### Konzeption
- Definiere Haushaltsziel: max Drawdown, min Runway, max Ruin-Rate
- Teile Risiko auf Profile auf (z. B. prozentual nach Vermoegen)

### Datenmodell (minimal)
- RiskBudget
  - maxDrawdownPct: number
  - minRunwayMonths: number
  - maxRuinRatePct: number
- RiskAllocation
  - profileId: string
  - sharePct: number

### Logik
- Run Household-Sim und sammle Risiko-Metriken
- Verteile Limits je Profil nach sharePct
- Pruefe pro Profil (in Accounts-Strategie)
- Wenn Profil ueber Budget: Flag + Vorschlag (z. B. Cash-Puffer erhoehen)

### UI/UX
- Haushalt-Panel: Risiko-Budget aktivieren
- Slider fuer Budget-Anteile
- Ampel je Profil

### Minimal-Implementierung (Phase 1)
1) RiskBudget Objekt und einfache UI
2) Risikoauswertung nur auf Haushaltsebene (P90 Drawdown, Depot-Erschoepfung, Success-Rate)
3) Warnung, wenn Haushalt > Budget
4) Profil-Level spaeter in Accounts-Strategie

---

## 3) Entnahme-Orchestrator

### Ziel
Regeln festlegen, aus welchem Profil entnommen wird, um Steuern, Risiko und Runway zu optimieren.

### Regeln (Beispiele)
- **Proportional**: Entnahmen proportional zum Vermoegen
- **Tax-First**: Entnahmen erst aus Profil mit geringster Steuerlast (Schaetzung)
- **Runway-First**: Profil mit groesserer Runway traegt mehr Entnahmen
- **Stabilizer**: Heuristik aus Runway + Vermoegen (Schaetzung)

### Datenmodell (minimal)
- WithdrawalPolicy
  - mode: "proportional" | "tax_first" | "runway_first" | "stabilizer"
  - weights?: Record<profileId, number>

### Logik
- Bei jeder Entnahmeperiode: bestimme Entnahme-Quelle(n)
- Ziehe aus Portfolio(s) entsprechend der Policy
- Logge die Quelle fuer Reporting

### UI/UX
- Dropdown "Entnahme-Policy" im Haushalt-Tab
- Balkendiagramm: Entnahmeteile pro Profil

### Minimal-Implementierung (Phase 1)
1) Policy "proportional"
2) Entnahme pro Profil in Simulation beruecksichtigen (Accounts-Strategie)
3) Reporting: Anteil je Profil

### MVP-Status
- Policies werden im Accounts-Modus als Aufteilung der Floor/Flex-Bedarfe genutzt.
- Im Additiv-Modus bleiben Policies Reporting-Heuristiken.

---

## 4) Gemeinsamer Cash-Puffer

### Ziel
Ein Haushaltspuffer (gemeinsame Liquiditaet), der in schlechten Jahren Sicherheit bietet.

### Optionen
- **Virtueller Puffer**: nur als Berechnungsebene
- **Physischer Puffer**: wird einem Profil zugeordnet

### Datenmodell (minimal)
- SharedCashBuffer
  - enabled: boolean
  - targetMonths: number
  - allocationRule: "proportional" | "fixed"
  - ownerProfileId?: string

### Logik
- Pufferziel auf Haushaltsebene (Monate Floor-Bedarf)
- Befuellung: proportional aus Profilen
- Entnahmen: zuerst aus Puffer, dann aus Profilen

### UI/UX
- Toggle "Gemeinsamer Cash-Puffer"
- Ziel in Monaten
- Anzeige: aktueller Puffer vs Ziel

### Minimal-Implementierung (Phase 1)
1) Virtueller Puffer mit Ziel
2) Entnahme erst aus Puffer, dann aus Profilen
3) Anzeige in Haushalt-KPI

---

## Priorisierte Umsetzung (empfohlen)
1) Haushalts-Simulation (Additive) + Ergebnis-Tab
2) Gemeinsamer Cash-Puffer (virtuell)
3) Entnahme-Orchestrator (proportional)
4) Risiko-Budget (Haushaltsebene)
5) Accounts-Strategie (Profi-Phase)

---

## MVP-Annahmen (Additive)
- Demografie/Pflege kommt aus dem gewaehlten Hauptprofil.
- Partner-Konfiguration wird fuer den Haushalt deaktiviert; Renten werden summiert.
- Cash-Puffer erhoeht Runway-Min/Target um die Zielmonate.
- Entnahme-Orchestrator ist proportional und dient in Phase 1 nur als Reporting.

## MVP-Annahmen (Accounts)
- Pro Profil separate Simulationen mit gleichem Seed/Parametern.
- Endvermoegen wird pro Run summiert.
- Drawdown wird konservativ als Max je Profil aggregiert.
- Nicht-Portfolio-KPIs (Pflege, Lebensdauer) stammen aus dem Hauptprofil.
- Entnahme-Policy wirkt explizit im Accounts-Modus.
- Entnahme-Basis ist konfigurierbar:
  - Haushaltsbedarf verteilen (Default)
  - Profilbedarf skalieren
- Effektiver Gesamtbedarf (Floor/Flex) wird im Haushalt-Tab angezeigt.
- Profile ohne Simulator-Daten werden ignoriert (mit Warnhinweis).
- Startvermoegen wird aus Depot/Tagesgeld/Geldmarkt abgeleitet, falls simStartVermoegen nicht gespeichert ist.
- Haushalts-Startvermoegen nutzt pro Profil den groesseren Wert aus simStartVermoegen oder Depot+Liquiditaet, um Unterzaehlung zu vermeiden.
- Fallback fuer Floor/Flex: Balance-Werte werden genutzt, wenn Simulator-Werte fehlen.
- Profil-Check (Inputs) zeigt Start/Floor/Flex/Anteil pro Profil im Haushalt-Tab.
- Wenn ein Profil detaillierte Tranchen hat, werden Depotwert/Geldmarkt/Einstand aus den Tranchen abgeleitet, falls die Simulator-Felder leer sind.
- Additiv-Modus fuehrt detailledTranches aller Profile zusammen (sofern vorhanden).
- Wenn die Tranchen-Summe deutlich unter dem Startvermoegen liegt, faellt Additiv auf Aggregatwerte zurueck (Warnhinweis).

---

## Phase-1 Hardening
- Profile-Switch ist gegen Doppelklick (Race) abgesichert.
- Profil-Loeschung fragt per Confirm nach.
- LocalStorage-Quota wird abgefangen (Import/Registry speichern).
- Haushalt-Kombination prueft leere Profilelisten.

---

## Behobene Bugs (Phase 1)

### Bug 1: Ausgaben-Vervielfachung im Household-Modus
**Problem:** Im Household-Withdrawal-Mode bekam jedes Profil die VOLLEN Haushaltsausgaben zugewiesen, statt diese aufzuteilen.
- Bei 2 Profilen mit je 35k/36k Ausgaben → Haushalt 71k
- JEDES Profil wurde mit 71k simuliert → Effektiv 142k Gesamt-Entnahme
- **Folge:** Drastisch reduzierte Success Rate, viel zu frühe Depot-Erschöpfung

**Fix:** `applyWithdrawalShareToInputs()` unterscheidet nun korrekt:
- **'household'-Modus**: Haushaltsausgaben (71k) werden nach Withdrawal-Policy VERTEILT
- **'profile'-Modus**: Individuelle Profil-Ausgaben werden proportional skaliert

### Bug 2: Gold-Validierungs-Fehler
**Problem:** Inkonsistente Gold-Parameter beim Kombinieren von Profilen
- Profil A: `goldAktiv=true`, `goldZielProzent=10%`
- Profil B: `goldAktiv=false`, `goldZielProzent=0%`
- Naive Aggregation: `goldAktiv=true` aber `goldZielProzent=5%` oder 0%
- **Folge:** Engine-Validierung schlägt fehl (erwartet goldZielProzent > 0 wenn goldAktiv=true)

**Fix:** Drei-stufige Validierung:
1. `applyCashBufferToInputs()`: Prüft goldAktiv nur true wenn goldZielProzent > 0
2. `applyWithdrawalShareToInputs()`: Dieselbe Prüfung vor Engine-Übergabe
3. `combineHouseholdInputs()`: Filtert Profile ohne gültiges Gold vor Mittelung

### Regression Tests
- `tests/household-withdrawal-modes.test.mjs` Test 1-8
- Test 2: Household-Modus mit vollen Ausgaben
- Test 3: Profile-Modus mit proportionaler Skalierung
- Test 8: Gold-Validierungs-Regression

---

## Offene Entscheidungen
- Additive vs Accounts als Standard
- Einheitlicher oder profil-spezifischer Entnahmeplan?
- Darstellung in der UI: eigener Tab vs eigener Screen
- Soll Haushalt einen eigenen Snapshot bekommen?
