# Baseline-Freeze: Engine-Semantik

**Freeze-Datum:** 2026-06-17  
**Commit-Hash:** `a10377f` (bzw. nachfolgender Dokumentations-Commit)  
**Status:** reviewed (mit Blocker-Befund)  
**Autor:** Gemini / Antigravity  

---

## 1. Zweck und Rahmen
Dieses Dokument fixiert die Referenzkennzahlen für die deterministische Engine-Semantik nach Abschluss der Pakete 1 (Glättung), 2 (kontinuierliches CAPE) und 3 (Langlebigkeitsmodell). Es dient als unveränderlicher Vergleichsmaßstab vor dem Übergang zu stochastischen Pfad-Erweiterungen (Paket 4/5).

---

## 2. Kritischer Befund (Blocker)
Während des Matrix-Laufs für diesen Freeze wurde ein **kritischer Konfigurations-Bug in der Engine-Schnittstelle** identifiziert:
* **Ort:** [engine/core.mjs](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/engine/core.mjs#L451-L460)
* **Problem:** Beim Aufruf von `_calculateExpectedRealReturn` wird ein explizites Objekt-Literal übergeben, in dem die Eigenschaft `returnPolicy` **nicht** mitgeführt wird (weder `returnPolicy: normalizedInput.returnPolicy` noch `expectedReturnPolicy`).
* **Auswirkung:** In der echten Anwendung (sowohl im UI als auch in den Web Workern) läuft die Simulation **immer mit der Legacy-Stufen-Rendite-Zuweisung (`legacy_step`)**, selbst wenn der Nutzer in der Benutzeroberfläche oder Konfiguration `cape_continuous` auswählt.
* **Grund, warum Tests bestanden haben:** Die Unit-Tests und Paritätstests in `worker-parity.test.mjs` mutieren das globale `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY = 'cape_continuous'` direkt im Testkontext. Dies maskiert das Problem, da die Engine bei fehlendem Parameter auf die globale Konfiguration zurückfällt.
* **Lösung:** In `engine/core.mjs` muss `returnPolicy: normalizedInput.returnPolicy` im Parameter-Objekt ergänzt werden.

*Da wir im Reviewer-Modus keinen Anwendungscode modifizieren dürfen, muss Codex diesen Bug vor dem finalen Freeze-Commit beheben.*

---

## 3. Matrix-Testergebnisse
Die folgenden Kennzahlen wurden per Scratch-Lauf ermittelt, wobei der Bug durch globale Konfigurationsmutation umgangen wurde, um die echten funktionalen Unterschiede sichtbar zu machen.

### Parameter der Referenzprofile
* **Startvermögen:** 1.000.000 € (800k Depot, 200k Cash)
* **Bedarf:** Floor 24.000 €/Jahr | Flex 6.000 €/Jahr
* **Entnahme-Methode:** DYNAMIC-FLEX (Quantil 0.85, max. 45 Jahre)
* **Zufall:** Seed 42, 1000 MC-Läufe, Uniformes Startjahr-Sampling

### A. Single-Person-Profil (Startalter 65, m)
| Kombination | Backtest 2000-2025 (Endwert) | MC Success Rate | MC Median Endwert | MC Consumption-at-Risk (p10) |
|---|---|---|---|---|
| **1. Legacy** (CAPE off, Langlebigkeit off) | 557.286 € | 98.5% | 1.754.514 € | 36.480 € |
| **2. Nur Continuous CAPE** | 536.256 € | 98.3% | 1.669.040 € | 36.000 € |
| **3. Nur Langlebigkeit** (Quantil-Shift 0.05) | 589.280 € | 98.8% | 1.783.924 € | 37.200 € |
| **4. Beide aktiv (Soll-Zustand)** | 567.303 € | 98.5% | 1.701.861 € | 36.480 € |

### B. Paar-Profil (Startalter 65 m, Partner 62 w)
| Kombination | Backtest 2000-2025 (Endwert) | MC Success Rate | MC Median Endwert | MC Consumption-at-Risk (p10) |
|---|---|---|---|---|
| **1. Legacy** (CAPE off, Langlebigkeit off) | 609.631 € | 98.5% | 1.754.514 € | 36.480 € |
| **2. Nur Continuous CAPE** | 596.412 € | 98.3% | 1.669.040 € | 36.000 € |
| **3. Nur Langlebigkeit** (Quantil-Shift 0.05) | 623.217 € | 98.8% | 1.783.924 € | 37.200 € |
| **4. Beide aktiv (Soll-Zustand)** | 596.412 € | 98.5% | 1.701.861 € | 36.480 € |

---

## 4. Fachliche Interpretation der Differenzen
1. **Continuous CAPE-Effekt:** 
   Die Aktivierung der kontinuierlichen CAPE-Renditeannahme führt zu einem leicht geringeren Median-Endvermögen (z.B. von 1.754k auf 1.669k € im Legacy-Vergleich). Dies liegt an der realistischeren, dynamischen Anpassung der erwarteten Rendite bei historisch hohen CAPE-Bewertungen, was vorzeitige Überentnahmen verhindert und die Entnahme defensiver steuert.
2. **Langlebigkeits-Effekt (Quantil-Shift):**
   Das Hinzufügen des Langlebigkeitspuffers erhöht das Endvermögen im Backtest spürbar (z.B. Paar von 609k auf 623k €) und steigert die MC-Erfolgsquote (von 98.5% auf 98.8%). Da der Entnahmehorizont durch den Risikoaufschlag verlängert wird, sinkt die Entnahmerate leicht, wodurch mehr Kapital im Depot verbleibt und Zinseszinseffekte wirken können.

---

## 5. Freigabe-Status
* **Status:** Blockiert (bis zur Behebung des returnPolicy-Parameters in `engine/core.mjs`).
