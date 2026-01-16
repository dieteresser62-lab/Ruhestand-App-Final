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
- Policies werden aktuell als Reporting-Heuristik genutzt (keine Rueckwirkung auf Simulation).

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

---

## Offene Entscheidungen
- Additive vs Accounts als Standard
- Einheitlicher oder profil-spezifischer Entnahmeplan?
- Darstellung in der UI: eigener Tab vs eigener Screen
- Soll Haushalt einen eigenen Snapshot bekommen?
