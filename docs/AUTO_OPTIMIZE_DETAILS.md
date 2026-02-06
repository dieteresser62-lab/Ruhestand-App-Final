# Auto-Optimize: Technische Details

Die Auto-Optimierung ("Auto-Optimize") ist ein Feature des Simulators, das automatisch geeignete Parameterkombinationen für eine gegebene Rentenstrategie ermittelt. Statt manuell hunderte Kombinationen im Sweep-Modus durchzuprobieren, nutzt der Auto-Optimizer Algorithmen, um den Suchraum systematisch zu durchlaufen.

## Architektur

Die Optimierung ist modular aufgebaut und nutzt Web Worker für parallele Berechnungen.

### Module

*   **`auto_optimize.js`**: Haupt-Orchestrator. Steuert den Ablauf der Optimierung (LHS -> Verfeinerung -> Finalisierung).
*   **`auto_optimize_ui.js`**: UI-Integration. Verbindet den Orchestrator mit dem DOM (Progressbars, Ergebnisanzeige, Abbruch).
*   **`auto-optimize-worker.js`**: Der Worker-Code. Führt die eigentlichen Monte-Carlo-Simulationen für eine Menge von Kandidaten durch.
*   **`auto-optimize-sampling.js`**: Algorithmen für die Generierung von Parameter-Kandidaten (Latin Hypercube Sampling, Nachbarschaftssuche).
*   **`auto-optimize-evaluate.js`**: Bewertungslogik. Vergleicht Kandidaten basierend auf der gewählten Zielfunktion (z.B. "Erfolgswahrscheinlichkeit maximieren").
*   **`auto-optimize-metrics.js`**: Definition der Metriken und Constraints (z.B. "Erfolg > 95%").
*   **`auto-optimize-params.js`**: Definition und Normalisierung der optimierbaren Parameter (Mapping zwischen UI-Formular und internem Vektor).
*   **`auto-optimize-utils.js`**: Hilfsfunktionen (Cache-Keys, Logging).

## Algorithmus

Die Optimierung verläuft in drei Phasen ("Stages"):

### Stage 1: Coarse Search (Grobe Suche)
- **Methode**: Latin Hypercube Sampling (LHS).
- **Ziel**: Den gesamten Parameterraum gleichmäßig, aber zufällig abtasten, um vielversprechende Regionen zu finden.
- **Details**: Es werden z.B. 50-200 Kandidaten (abhängig von der Anzahl der Parameter) generiert und mit einer geringen Anzahl von Simulationen (z.B. 250 Runs) schnell bewertet.

### Stage 2: Refinement (Verfeinerung)
- **Methode**: Lokale Suche um die besten Kandidaten aus Stage 1.
- **Ziel**: Das lokale Optimum in den identifizierten Regionen finden.
- **Details**: Die Top-Kandidaten aus Stage 1 werden ausgewählt. Für jeden werden neue Kandidaten in der unmittelbaren "Nachbarschaft" generiert. Diese werden mit höherer Genauigkeit (z.B. 1000 Runs) evaluiert.

### Stage 3: Final Verification (Validierung)
- **Methode**: Präzisionsmessung des besten Kandidaten.
- **Ziel**: Statistisch signifikante Absicherung des Ergebnisses.
- **Details**: Der "Champion" aus Stage 2 wird mit der vollen Anzahl an Simulationen (z.B. 5000 oder wie im UI eingestellt) erneut gerechnet, um die finalen Metriken zu bestätigen.

## Parallelisierung

Derselbe Worker-Pool (`workers/worker-pool.js`) wie für Monte-Carlo-Simulationen wird genutzt.
1.  Der Orchestrator generiert Batches von Kandidaten.
2.  Diese Batches werden an freie Worker gesendet.
3.  Jeder Worker führt für seine Kandidaten die Simulationen durch (ohne UI-Updates pro Jahr, für maximale Geschwindigkeit).
4.  Ergebnisse werden aggregiert an den Main-Thread zurückgemeldet.

## Parameter-Mapping

Das System unterstützt dynamisch 1 bis 7 Parameter.
- **Kontinuierliche Parameter**: Z.B. "Aktienquote (40% - 100%)". Werden intern auf [0, 1] normalisiert.
- **Diskrete Parameter**: Z.B. "Anpassungsmodus (Fix, Inflation, Lohn)". Werden auf Integer-Indizes gemappt.

Die Definitionen in `auto-optimize-params.js` stellen sicher, dass ungültige Kombinationen (z.B. Rente 2 aktiv, aber Rente 2 Parameter verändert) vermieden oder gefiltert werden.
