# Auto-Optimize: Technische Details

Die Auto-Optimierung ("Auto-Optimize") ist ein Feature des Simulators, das automatisch geeignete Parameterkombinationen für eine gegebene Rentenstrategie ermittelt. Statt manuell hunderte Kombinationen im Sweep-Modus durchzuprobieren, nutzt der Auto-Optimizer Algorithmen, um den Suchraum systematisch zu durchlaufen.

## Architektur

Die Optimierung ist modular aufgebaut und nutzt Web Worker für parallele Berechnungen.

### Module

*   **`auto_optimize.js`**: Haupt-Orchestrator. Steuert den Ablauf der Optimierung (LHS -> Quick-Filter -> volle Evaluation -> Verfeinerung -> Validierung).
*   **`auto_optimize_ui.js`**: UI-Integration. Verbindet den Orchestrator mit dem DOM (Progressbars, Ergebnisanzeige, Abbruch).
*   **`auto-optimize-worker.js`**: Der Worker-Code. Führt die eigentlichen Monte-Carlo-Simulationen für eine Menge von Kandidaten durch.
*   **`auto-optimize-sampling.js`**: Algorithmen für die Generierung von Parameter-Kandidaten (Latin Hypercube Sampling, Nachbarschaftssuche).
*   **`auto-optimize-evaluate.js`**: Bewertungslogik. Vergleicht Kandidaten basierend auf der gewählten Zielfunktion (z.B. "Erfolgswahrscheinlichkeit maximieren").
*   **`auto-optimize-metrics.js`**: Definition der Metriken und Constraints (z.B. "Erfolg > 95%").
*   **`auto-optimize-params.js`**: Definition und Normalisierung der optimierbaren Parameter (Mapping zwischen UI-Formular und internem Vektor).
*   **`auto-optimize-utils.js`**: Hilfsfunktionen (Cache-Keys, Logging).

## Algorithmus

Die Optimierung verläuft mehrphasig. LHS erzeugt zuerst den Kandidatenraum; danach folgen Quick-Filter, volle Evaluation, lokale Verfeinerung und finale Validierung.

### Stage 0: Candidate Generation (LHS)
- **Methode**: Latin Hypercube Sampling (LHS).
- **Ziel**: Den gesamten Parameterraum gleichmäßig, aber zufällig abtasten.
- **Details**: Es werden Kandidaten generiert und vorgefiltert, bevor teure Monte-Carlo-Bewertungen starten.

### Stage 1: Quick Filter
- **Methode**: Reduzierte Run-Zahl und wenige Trainings-Seeds.
- **Ziel**: Offensichtlich schwache Kandidaten früh aussortieren.
- **Details**: Constraints werden hier wegen hoher Varianz noch nicht hart angewendet.

### Stage 2: Full Evaluation
- **Methode**: Volle Evaluation der Top-Kandidaten aus dem Quick-Filter.
- **Ziel**: Objective und Constraints belastbarer bewerten.
- **Details**: Nur Kandidaten, die Constraints erfüllen, gehen in die weitere Sortierung.

### Stage 3: Refinement (Verfeinerung)
- **Methode**: Lokale Suche um die besten vollständig evaluierten Kandidaten.
- **Ziel**: Das lokale Optimum in den identifizierten Regionen finden.
- **Details**: Für Top-Kandidaten werden neue Kandidaten in der unmittelbaren "Nachbarschaft" generiert und erneut bewertet.

### Stage 4: Final Verification (Validierung)
- **Methode**: Prüfung der Top-Kandidaten auf separaten Test-Seeds.
- **Ziel**: Overfitting auf Trainings-Seeds reduzieren.
- **Details**: Der Champion wird anhand der Test-Objective gewählt; Train- und Test-Metriken bleiben unterscheidbar.

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
