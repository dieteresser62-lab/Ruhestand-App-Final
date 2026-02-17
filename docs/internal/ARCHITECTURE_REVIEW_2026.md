# Architektur-Review: Ruhestand-Suite
## Vollständiges Gutachten — Fachlich, Technisch, Methodisch

---

## Meta & Analysebasis

| | |
|---|---|
| **Datum** | 2026-02-17 |
| **Engine-Version** | 31.0 (Build 2025-12-22) |
| **Analysierte Dateien** | engine/core.mjs, engine/config.mjs, engine/analyzers/MarketAnalyzer.mjs, engine/planners/SpendingPlanner.mjs, engine/transactions/*, engine/tax-settlement.mjs, engine/validators/InputValidator.mjs, app/simulator/simulator-data.js (DATASET_META), app/simulator/monte-carlo-runner.js, app/simulator/sweep-runner.js, app/simulator/auto-optimize-params.js, app/simulator/simulator-engine-direct.js, workers/worker-pool.js, workers/mc-worker.js, tests/* (57 Dateien), docs/reference/TECHNICAL.md, engine/README.md |
| **Analysemethode** | Statische Code-Analyse, Dokumentationsauswertung, Architektur-Review |
| **Analysegrenzen** | Kein Live-Lauf der Software; keine statistische Stichprobenvalidierung gegen unabhängige Referenzimplementierungen; keine Überprüfung der historischen Rohdaten gegen Originalquellen |

**Bewertungsmaßstab:** „Würde ich mich selbst — oder meine Familie — auf diese Suite verlassen?"

---

## 1. Überblick & Einordnung

Die Ruhestand-Suite ist eine browserbasierte, vollständig lokal laufende Eigenentwicklung für persönliche Ruhestands- und Entnahmeplanung. Sie besteht aus zwei Anwendungen (Balance-App für Jahresplanung, Simulator für Monte-Carlo-Analyse) und einem gemeinsamen Rechenmotor.

**Technische Eckdaten:** ca. 37.000 LOC, 87 Module, 3-Layer-Architektur (Engine / App / Workers), 57 Testdateien, keine externen Runtime-Abhängigkeiten.

**Was die Suite ist:** Ein ernsthaftes Planungswerkzeug für einen selbstkritischen, technisch versierten Privatnutzer, der seine Entscheidungen nachvollziehbar dokumentieren und jährlich überprüfen will.

**Was die Suite nicht ist:** Ein institutionelles Portfolio-Management-System, ein reguliertes Finanzberatungsprodukt, ein akademisch peer-reviewtes Modell.

**Einordnung im Markt:**

Die Suite übersteigt das Niveau gängiger Privatnutzer-Rechner und kommerzielle Ruhestandsplanungs-Tools in fast jeder Dimension. Sie ist — soweit beurteilbar — das anspruchsvollste bekannte Eigenentwicklungs-Tool für Privatanleger im deutschsprachigen Raum. Sie bleibt hinter institutionellen Systemen zurück, was Korrelationsmodellierung, Fat-Tail-Statistik und externe Validierung betrifft. Das ist für den beschriebenen Verwendungszweck kein Mangel, sondern eine erwartbare Grenze.

---

## 2. Fachliche Analyse

### 2.1 Entnahmestrategien

**Floor/Flex-Trennung:** Konzeptionell korrekt und Best Practice. Die Trennung in essenzielle Grundausgaben (Floor) und diskretionäre Ausgaben (Flex) erlaubt eine differenzierte Krisenreaktion: Floor bleibt geschützt, Flex wird als Puffer eingesetzt. Das ist nachweislich besser als ein monolithischer Entnahmebetrag.

**Flex-Rate-Mechanismus:** Eine 6-stufige sequenzielle Cap-Kaskade steuert, wie viel des Flex-Bedarfs tatsächlich entnommen wird. Die Reihenfolge ist dokumentiert und wird im Code eingehalten:

1. S-Kurven-Cap (basierend auf Flex-Anteil an Gesamtbedarf)
2. Vermögensadjustierte Reduktion (hohes Vermögen → niedrigerer relativer Bedarf)
3. Flex-Budget-Cap (Begrenzung in Bärenmärkten)
4. Recovery-Guardrail (ATH-distanzbasierte Kürzung)
5. Finale Delta-Limits (±12 Pp pro Jahr, ±10 Pp im Bär)
6. Anti-Pseudo-Accuracy-Quantisierung (Rundung auf 50–250 € monatlich)

Die Implementierung dieser Kaskade ist korrekt und intern konsistent. Dass falsche Präzision durch Quantisierung verhindert wird (Punkt 6), ist ein seltenes, aber richtiges Designprinzip.

**VPW / Dynamic Flex:** Die Formel `rate = r / (1 - (1+r)^(-n))` ist mathematisch korrekt umgesetzt. Der dreistufige Safety-Stage-Automat (normal → GoGo-off → static flex) ist konzeptionell durchdacht und verhindert, dass das VPW-Modell mechanisch in Krisenszenarien durchgezogen wird.

Zwei Schwächen:

- Die Realrendite wird auf [0%, 5%] begrenzt. Das schließt ZIRP-Szenarien (negative Realrenditen, wie 2012–2021 erlebt) an der Untergrenze aus. Es schließt historisch hohe Renditen (1980er: Realrenditen 7–10%) an der Obergrenze aus. Bei r nahe 0 wäre die numerisch korrekte Annäherung `rate ≈ 1/n`; dieser Grenzfall wird durch den Clamp implizit behandelt, aber nicht explizit dokumentiert.
- Das CAPE-to-Return-Mapping ist in nur 4 diskreten Stufen kodiert: CAPE ≤15 → 8%, 15–30 → 7%, 30–35 → 5%, >35 → 4% (Nominalrenditen). Das ist funktional, aber grob. Zwischen CAPE 29 und CAPE 31 springt die erwartete Rendite von 7% auf 5% — ein diskreter Sprung, der VPW-Entnahmeraten nicht-kontinuierlich beeinflusst.

**Guardrails:** 25% realer Drawdown als ALARM-Auslöser ist historisch begründbar (entspricht grob den Korrekturniveaus von 1987, 2001, 2008). Runway-Ziele von 36–60 Monaten je Marktregime sind konservativ und schützend.

### 2.2 Sequence-of-Returns-Risiko (SORR)

SORR wird adressiert durch:
- Marktregime-abhängige Cash-Runway (60 Monate im tiefen Bären, 5 Jahre)
- Regime-spezifische Transaktionslogik (kein aggressives Rebalancing im Bär)
- Recovery-Guardrails (ATH-Distance-basierte Flex-Kürzung)

Das ist konzeptionell besser als die meisten Standardstrategien. Das Hauptproblem: Die Effektivität dieser Schutzmechanismen hängt davon ab, das Marktregime korrekt zu klassifizieren. Bei Frühphasen eines Bären (Drawdown noch unter 20%) klassifiziert die Engine den Markt nicht als `bear_deep`, und die vollen Schutzmaßnahmen greifen nicht. Dies ist die strukturelle Schwäche des gesamten regime-basierten Ansatzes (→ 2.5).

### 2.3 Asset-Allokation & Rebalancing

**Drei-Asset-Modell (Aktien, Gold, Liquidität/Safe):** Einfach, handhabbar, angemessen für Privatanleger. Keine überflüssige Komplexität.

**Annahmen im Code:**
- Gold Realrendite: +1,0% (config.mjs, `GOLD_REAL_RETURN: 0.01`). Historisch vertretbar über 100-Jahr-Zeiträume, mit sehr hoher Volatilität und unsicherer Zukunftsperspektive.
- Safe-Asset Realrendite: +0,5% (`SAFE_ASSET_REAL_RETURN: 0.005`). In Niedrigzinsphasen zu optimistisch; in normalen Zinsphasen vertretbar.

**Fehlendes:** Anleihen als eigenständige Asset-Klasse mit Laufzeitrisiko existieren nicht. „Safe" bedeutet ausschließlich Tagesgeld + Geldmarkt-ETF. Für Nutzer, die Laufzeitrisiko aktiv steuern wollen, fehlt dieses Instrument. Für den beschriebenen Verwendungszweck (Liquiditätspuffer) ist die Vereinfachung aber sachgerecht.

**Rebalancing-Mechanik:** Regime-aware, FIFO/Verlust-optimiert, mit Mindesthandelsgrößen. Technisch gut umgesetzt. Die Gold-Floor-Logik (Minimum-Allocation-Schutz außer in echten Notfällen) ist sinnvoll.

### 2.4 Monte-Carlo-Simulation

**Methode:** Historical Bootstrap — Resampling von Jahresdaten aus dem historischen Datensatz (Primärstichprobe: 1950–2024). Im Vergleich zu parametrischer Normalverteilung hat Bootstrap den entscheidenden Vorteil, dass Fat Tails und historische Korrelationsstrukturen (Equity/Gold/Inflation) implizit erhalten bleiben, weil jeweils ein komplettes historisches Jahr gesampelt wird.

**Stichprobengröße:** ~75 Jahre Primärdaten. Das ist für historische Simulationen wenig. Der Standardfehler des 5. Perzentils bei 75 Datenpunkten ist erheblich — Konfidenzintervalle für Ruin-Wahrscheinlichkeiten liegen grob bei ±5–8 Prozentpunkten. Das ist kein Fehler des Tools, aber eine strukturelle Grenze, die beim Lesen der Ergebnisse bekannt sein muss.

**Recency-Weighting:** Optionale exponentielle Halbwertszeit-Gewichtung der historischen Startjahre. Konzeptionell problematisch, weil es einen Momentum-Bias einführt: Die letzten Jahrzehnte (Bullenmarkt 1982–2000, 2009–2024) werden übergewichtet. Das kann Ruin-Wahrscheinlichkeiten systematisch unterschätzen, wenn man die letzten Jahrzehnte als Blaupause für die Zukunft behandelt. Empfehlung: Uniform-Sampling als Standard verwenden; Recency als explizit bewusst gewählte Option.

**CAPE-Sampling:** Optionale Übersteuerung des Start-Jahr-Samplings nach aktuellem CAPE-Regime. Konzeptionell interessant, aber empirisch schwach begründet — CAPE hat nachgewiesene Erklärungskraft für 10-Jahres-Renditen, aber nicht für den nächsten Startjahr-Verlauf.

**Pfadabhängigkeit:** Korrekt modelliert. Jede Simulation ist ein jahresweise fortlaufender Pfad mit State-Carryover (Steuerverlusttopf, Safety-Stage, Loss-Carry, realer Vermögenspeak). Das ist methodisch sauber.

### 2.5 Marktregime-Klassifikation — Die kritischste Einzelschwäche

Die sieben Regime werden durch drei Eingaben klassifiziert: ATH-Abstand, 1-Jahres-Momentum, Monate seit ATH. Die Entscheidungslogik ist deterministisch und hart kodiert.

**Cliff-Effect-Problem:** Die Schwellen sind binäre Grenzen ohne gleitende Übergänge:

- ATH-Abstand >20% → `bear_deep` (Runway-Ziel: 60 Monate, drastische Kürzungen)
- ATH-Abstand 19,9% → `corr_young` oder `side_long` (Runway-Ziel: 36 Monate, normale Entnahme)

Der Unterschied in der Strategie zwischen -19,9% und -20,1% ATH-Abstand ist erheblich. Ein Nutzer, der seinen Status-Report liest, sieht ein anderes Entnahmeprofil — obwohl die wirtschaftliche Realität nahezu identisch ist.

**1-Jahres-Momentum-Abhängigkeit:** Ein ATH-Markt mit +10,1% 1-Jahres-Performance wird als `peak_hot` klassifiziert (Runway-Ziel: 48 Monate). Ein ATH-Markt mit +9,9% wird als `peak_stable` klassifiziert (Runway-Ziel: 36 Monate). Einen 12-Monats-Unterschied beim Runway-Ziel an einem 0,2%-Performance-Unterschied festzumachen ist fragil.

**Recovery-in-Bear-Erkennung:** Die Kombination aus 1J-Performance ≥15% ODER Rally-from-Low ≥30% bei gleichzeitig >15% ATH-Abstand triggert `recovery_in_bear`. Diese Schwellen sind ohne empirische Kalibrierung aus der Historik gesetzt. Das ist keine Kritik an der Idee (die konzeptionell sinnvoll ist), aber an der fehlenden Begründung der konkreten Werte.

**Fazit zu 2.5:** Der regime-basierte Ansatz ist konzeptionell richtig — unterschiedliche Marktlagen erfordern unterschiedliche Schutzmaßnahmen. Die Implementierung mit harten Schwellenwerten und rauschbehafteten 1-Jahres-Momentum-Signalen ist die größte fachliche Einzelschwäche der Suite. Sie erzeugt Sprünge im Entnahmeprofil, die wirtschaftlich nicht begründbar sind, und kann als "Cliff Effect" das Sicherheitsgefühl des Nutzers trügen.

**Besser:** Weiche Übergänge zwischen Regime-Zielwerten (lineare Interpolation der Runway-Ziele basierend auf ATH-Abstand), kombiniert mit Glättung des Momentum-Signals (z. B. 3-Monats-Durchschnitt statt 1-Jahres-Punkt).

### 2.6 Backtests

**Datenbasis:** 1925–2024. Pre-1950-Daten sind im Code explizit als `estimated/normalized` markiert. Die Normalisierungsmethode ist im Code (`DATASET_META`) dokumentiert als: „Years 1925-1949 are normalized to connect to the 1950 level." Die Glättungsmethodik selbst ist nicht weiter spezifiziert.

**MSCI-Variante (kritisch):** `DATASET_META.historicalData.series.msci_eur.variantStatus = 'undocumented'` — der Code selbst benennt dies als bekanntes Problem. Der implizit erkennbare CAGR von ~7,9% für MSCI 1978–2024 deutet stark auf einen Price Index hin, nicht auf einen Total Return Index. Ein MSCI World Net Return in EUR über denselben Zeitraum liegt bei ~10,5–11%. Der Unterschied: ca. 2–3 Prozentpunkte p.a. durch Dividenden, die im Price Index fehlen.

Konsequenz: Wenn die Annahme korrekt ist, sind alle historischen Renditen in der Simulation um 2–3% p.a. systematisch unterschätzt. Das macht die Simulation konservativer (höhere scheinbare Ruin-Risiken), kalibriert aber gleichzeitig die Empfehlungen zu vorsichtig. Die Verzerrung ist asymmetrisch: Man wird nicht ruiniert — man gibt zu wenig aus.

Das ist kein triviales Problem und das einzige, das ich als **Blocker-Severity** bezeichnen würde: Es muss geklärt werden, welcher Index verwendet wurde.

**Survivorship-Bias:** MSCI World ist implizit Survivorship-bereinigt — er enthält die Märkte, die heute noch existieren, nicht die, die untergegangen sind. Für sehr langfristige historische Analysen ist das eine bekannte und akzeptierte Einschränkung. Sie sollte beim Interpretieren der Ergebnisse bewusst sein.

**Einzelpfad-Natur des Backtests:** Ein Backtest-Lauf zeigt genau einen historischen Pfad. Das ist korrekt als Plausibilitätscheck, aber nicht als statistische Validierung der Strategie. Der Unterschied zwischen „hat 1929 funktioniert" und „funktioniert in 97% aller Monte-Carlo-Pfade" ist grundlegend.

### 2.7 Inflation, Steuern, Real vs. Nominal

**Reale Kaufkraft-Verfolgung:** Drawdown-Berechnung erfolgt real (inflationsadjustiert), nicht nominal. Das ist methodisch korrekt und wird von den meisten vergleichbaren Tools nicht gemacht. Ein nominaler Vermögenspeak ist für Rentner irrelevant — die Kaufkraft ist entscheidend.

**Steuermodellierung (Deutschland):** Die Umsetzung ist überdurchschnittlich präzise:
- Abgeltungsteuer (25% + 5,5% Soli + optionale Kirchensteuer)
- Teilfreistellungsquote (30% für Aktienfonds) korrekt angewendet
- Sparer-Pauschbetrag progressiv aufgebraucht
- Verlusttopf mit Jahres-Carryforward
- FIFO-Reihenfolge für Verkäufe

Kaum ein kommerzielles Tool für den deutschen Markt bildet diesen Steuerumfang vollständig ab. Das ist eine echte Stärke.

**Rentenpension-Indexierung:** Drei Varianten (fix, Lohnwachstum, CPI). Korrekt und vollständig für die gängigen deutschen Rentenadjustierungen.

### 2.8 Stress- und Extremszenarien

Backtest-Presets (2000-Crash, 2008, Stagflation 1970er) sind vorhanden und konzeptionell sinnvoll.

**Fehlende Extremszenarien:**
- Kein Hyperinflations-Stress (1923-Analogon, >100% p.a. Inflation)
- Kein Japan-Szenario (30 Jahre Stagnation, NIKKEI 1989–2024)
- Keine Modellierung von Sequenzextremen außerhalb der historischen Stichprobe (z. B. 6 aufeinanderfolgende Jahre mit -20% p.a. — in den historischen Daten selten, aber nicht ausschließbar)

Diese Lücken sind hinnehmbar für persönliche Planung, sollten aber beim Interpretieren der Robustheitsergebnisse bedacht werden.

---

## 3. Technische Analyse

### 3.1 Architektur

Die 3-Layer-Trennung (Engine als pure function / App-Layer mit DOM / Workers für Parallelisierung) ist architektonisch der wertvollste Entscheid. Die Engine kennt kein DOM, keinen globalen State, keine Seiteneffekte. Sie ist vollständig deterministisch und damit testbar und reproduzierbar.

**87 Module:** 28 Module im Balance-App, 59 im Simulator. Für eine Einzelanwendung ist 59 Simulator-Module hoch — nicht übertrieben, aber am oberen Rand des Wartbaren für eine Einzelperson. Die Komplexität ist real, nicht nur nominell.

**ES6 native modules ohne Bundler:** Pragmatisch für local-first (kein Build-Step außer für die Engine). Erschwert globales Refactoring (keine Abhängigkeitsgraphen ohne Tooling), aber der Trade-off ist angemessen.

**DOM-freie Runner (`*-runner.js`):** Ermöglicht Web-Worker-Kompatibilität ohne Code-Duplikation. Gutes, konsequent eingehaltenes Design-Pattern.

### 3.2 Kopplung, Kohäsion, Erweiterbarkeit

**Engine:** Gute Kohäsion. Klare Verantwortlichkeiten. Jede Datei hat einen definierten Scope.

**Simulator-App-Schicht:** Implizite Verträge zwischen Simulator-Inputs und Engine-Erwartungen. Feldnamen-Mappings sind an mehreren Stellen verteilt (simulator-portfolio-inputs.js, simulator-engine-direct.js, engine/validators/InputValidator.mjs). Eine zukünftige Engine-API-Änderung erfordert Suche in mehreren Dateien, um alle Mapping-Punkte zu finden. Das ist eine bekannte und handhabbare technische Schuld.

**SWEEP_ALLOWED_KEYS als explizite Whitelist:** Gute Sicherheitsmaßnahme gegen versehentliche Parametersatz-Mutation bei Sweep-Läufen.

### 3.3 Determinismus & Reproduzierbarkeit

**Xorshift32 RNG:** Schnell, deterministisch, für finanzielle Simulation ausreichend (keine kryptographischen Anforderungen). Per-Run-Seeding via `makeRunSeed(baseSeed, comboIdx, runIdx)` stellt sicher, dass jeder Simulationspfad reproduzierbar ist.

**Worker-Parity:** Durch Tests verifiziert (`worker-parity.test.mjs`). Chunk-basierte Worker-Aufteilung beeinflusst die Ergebnisse nicht. Das ist eine wichtige Garantie für das Vertrauen in parallele Läufe.

**Reproduzierbarkeit insgesamt:** Vollständig gegeben. Ein gespeicherter Seed + gespeicherte Inputs erzeugen identische Ergebnisse. Für ein Planungstool ist das eine Grundanforderung, die erfüllt ist.

### 3.4 Tests

**Abdeckung:** 57 Testdateien, ~835 Assertions. Eigenes Test-Framework mit drei Assertion-Methoden (`assert`, `assertEqual`, `assertClose`).

**Stärken:**
- Engine-Kernlogik gut abgedeckt (~85–90% Schätzung)
- Input-Validierung mit Edge-Cases (NaN, Infinity, Grenzwerte)
- Determinismus-Verifikation
- Steuerabrechnung mit Verlusttopf
- CAPE-Fetch-Fallback-Kette

**Kritische Lücken:**

1. **Keine End-to-End-Integrationstests** für die vollständige Pipeline (Monte Carlo → Sweep → Auto-Optimize). Jede Stufe ist einzeln getestet, aber das Zusammenspiel über alle Stufen nicht.

2. **VPW Safety-Stage-Zustandsmaschine** (Übergänge 0→1→2 und Re-Entry) hat keine End-to-End-Transition-Tests. Die Zustandsmaschine ist konzeptionell komplex (2 konsekutive schlechte Jahre → Eskalation; 2 konsekutive gute Jahre → Deeskalation; 3-Jahres-Re-Entry-Rampe). Fehler in diesen Übergängen würden durch Unit-Tests nicht aufgedeckt.

3. **Mehrstufige State-Carryover-Tests fehlen:** Der Steuer-Verlusttopf, Safety-Stage, und kumulative Inflation werden über Jahre weitergegeben. Es gibt keine Tests, die diesen Carryover über 10+ Jahre hinweg verifizieren.

4. **Eigenes Test-Framework:** Funktioniert, aber kein Coverage-Enforcement in CI, kein Test-Watch, keine Parallelisierung. Der Aufwand für Qualitäts-Gate-Erweiterungen ist höher als mit Standard-Tooling.

### 3.5 Performance & Skalierung

**Web Worker Parallelisierung:** Adaptives Chunk-Sizing basierend auf Zeitbudget. Stall-Detection via Progress-Timestamps. Fallback auf seriellen Betrieb bei Worker-Fehler. Technisch solide.

**Worker-Cache unbegrenzt:** `scenarioCache` und `sweepCache` in `mc-worker.js` werden nie automatisch invalidiert. Bei langen Sessions (Stunden) können diese Caches wachsen. Das ist ein potenzielles Memory-Leak.

**Kein Worker-Heartbeat:** Hängende Worker werden nur durch Timeout erkannt. Kein aktives Ping/Pong für frühzeitige Stall-Detection.

### 3.6 Logging & Nachvollziehbarkeit

**Diagnosis-Objekt:** Strukturiertes Entscheidungsprotokoll pro Simulationsjahr. Enthält Gründe für Regime-Klassifikation, Guardrail-Aktivierungen, Transaktionsentscheidungen. Das ist für Nachvollziehbarkeit und Vertrauen in das Tool entscheidend — wer sehen will, warum das Tool eine Empfehlung macht, kann das lesen.

**Kein persistentes Mehrjahres-Log:** Es gibt keine gespeicherte Protokollkette über mehrere Jahre der Balance-App. Wenn man wissen will, warum 2023 eine andere Strategie galt als 2024, muss man in gespeicherten Snapshots suchen.

---

## 4. Methodische Risiken

### 4.1 CAPE als Jahres-Steuerungssignal

CAPE hat empirisch nachgewiesene Erklärungskraft für 10-Jahres-Renditen (R² ~0,6 für US-Märkte). Für 1–3-Jahres-Renditen ist R² nahe 0. Die Verwendung des aktuellen CAPE-Werts als direkten Einflussfaktor auf die jährliche Entnahme (über VPW-Realrenditeberechnung und CAPE-Sampling) setzt implizit voraus, dass CAPE kurzfristig informativ ist. Das ist methodisch angreifbar.

**Konkret:** Bei CAPE = 36 berechnet das Tool eine erwartete Nominalrendite von 4%. Bei CAPE = 34 sind es 5%. Dieser Sprung beeinflusst die VPW-Rate direkt. Ob CAPE 36 vs. 34 tatsächlich unterschiedliche Erwartungen für das nächste Jahr rechtfertigt, ist empirisch nicht belegt.

### 4.2 Diskrete CAPE-Buckets

Vier Stufen für CAPE-to-Return: 8% / 7% / 5% / 4% bei Grenzen 15 / 25 / 30 / 35. Diese Grenzen sind nicht aus der Literatur abgeleitet, sondern vom Entwickler gesetzt. Eine kontinuierliche Funktion (z. B. Excess CAPE Earnings Yield: `1/CAPE - safe_real_rate`) wäre methodisch besser begründbar und würde die diskontinuierlichen Sprünge in der VPW-Rate vermeiden.

### 4.3 Bootstrap-Stichprobengröße und Autokorrelation

75 Primärjahre sind für Monte-Carlo-Bootstrapping wenig. Bei einer Simulationslänge von 30 Jahren werden pro Lauf ~30 von 75 verfügbaren Jahren gezogen. Das führt zu strukturell hoher Ähnlichkeit zwischen Läufen und unterschätzt die wahre Varianz möglicher Zukünfte. Die ausgegebenen Erfolgsquoten haben breite unausgewiesene Konfidenzintervalle.

### 4.4 Pre-1950-Datennormalisierung

Die Jahresdaten 1925–1949 werden auf das 1950er Niveau normalisiert. Die Methodik dieser Normalisierung ist im Code nicht dokumentiert. Der Zweck ist, Extremszenarien (Weltkrieg, Weltwirtschaftskrise) zu machen — aber eine undokumentierte Normalisierung kann diese Extrema glätten und damit genau die Szenarien entschärfen, für die sie gedacht sind. Die Default-Option, diese Daten im Monte Carlo auszuschließen (`exclude estimated history`), ist die methodisch sauberere Wahl und sollte als Standard empfohlen werden.

### 4.5 Auto-Optimizer: Overfitting-Risiko

Der 4-stufige Auto-Optimizer (Latin Hypercube Sampling → Filter → Refine → Train/Test) optimiert 10 Parameter gegen eine historische Stichprobe. Mit 10 Freiheitsgraden und 75 Datenpunkten ist Overfitting auf die spezifische Vergangenheit real. Die Train/Test-Aufteilung hilft, ist aber keine echte Out-of-Sample-Validierung — beide Subsets sind historische Daten. Das Ergebnis des Optimierers ist nicht „die beste Strategie für die Zukunft", sondern „die Strategie, die in dieser spezifischen Vergangenheit optimal war".

### 4.6 Periodentafeln statt Kohortentafeln

Die eingebetteten Sterbetafeln sind Periodentafeln (Querschnitt 2024). Kohortentafeln, die den Trend zur steigenden Lebenserwartung projizieren, ergeben systematisch höhere Lebenserwartungen. Konkret: Ein 65-Jähriger hat laut Periodentafel eine Restlebenserwartung von ca. 18 Jahren (Männer) bzw. 22 Jahren (Frauen). Mit Kohortentafel (DAV 2004 R oder ähnlich) wären es 2–4 Jahre mehr. Das macht den VPW-Horizont zu kurz und die Entnahmeraten tendenziell zu hoch — ein systematischer Fehler in Richtung erhöhtes Ruin-Risiko.

### 4.7 Verhaltens-Modellierung fehlt

Das gesamte Modell setzt voraus, dass der Nutzer die empfohlenen Entnahmen auch tatsächlich umsetzt. In der Praxis neigen Menschen dazu, Flex-Kürzungen von 50% nicht zu akzeptieren und ihre Strategie aufzugeben. Dieser Behavioral-Bias ist in keinem quantitativen Planungstool modelliert — das ist eine grundlegende, strukturelle Grenze.

### 4.8 Währungsrisikomismatch

Die historischen Daten verwenden German CPI als Inflationsdeflator für einen global diversifizierten Aktienindex (MSCI World in EUR). MSCI World in EUR enthält USD/EUR-Währungsrisiko, das in den historischen Renditen implizit enthalten ist. Die CAPE-basierten Erwartungsrenditen beziehen sich auf US-Earnings-Yields. Diese konzeptionelle Mischung (US-Bewertungssignal, EUR-realisierte Renditen, DE-Inflation) ist undokumentiert und methodisch nicht sauber begründet.

---

## 5. Stärken der Suite

1. **Reale Kaufkraft-Verfolgung:** Drawdown ist real, nicht nominal. Kaum ein Privatnutzer-Tool macht das konsequent.

2. **Multi-Layer Guardrails mit Redundanz:** 6 sequenzielle Caps auf die Flex-Rate bedeuten, dass kein einzelner Fehler in einer Berechnungsstufe zu katastrophalen Entnahmen führen kann.

3. **Deutsche Steuergenauigkeit:** Abgeltungsteuer, Teilfreistellungsquote, Sparerpauschbetrag, Verlusttopf, Kirchensteuer — vollständig und korrekt modelliert. Einzigartig im Privatnutzer-Bereich.

4. **Dynamischer Runway nach Marktregime:** 36–60 Monate je Phase sind ein marktadaptives Konzept. Das ist konzeptionell besser als statische Liquiditätspuffer.

5. **Determinismus & Reproduzierbarkeit:** Vollständige Reproduzierbarkeit aller Simulationen. Vertrauen in Ergebnisse setzt voraus, dass man sie reproduzieren kann.

6. **Pflegefall-Modellierung:** Stochastische Integration von Pflegekostenrisiken (BARMER-Daten, altersabhängige Eintrittswahrscheinlichkeiten pro Pflegegrad) in den Monte Carlo. Im Privatnutzer-Bereich einzigartig.

7. **Local-First:** Keine Cloud-Abhängigkeit. Keine Drittanbieter-Risiken. Volle Datensouveränität. Für finanzielle Planung eine Grundsatzentscheidung mit starken Argumenten.

8. **Transparenz:** Vollständig auditierbare Codebasis. Kein Black-Box-Verhalten. Jede Entscheidung im Diagnosis-Objekt nachvollziehbar.

9. **VPW Safety-Stages:** Der dreistufige Eskalationsautomat verhindert, dass das VPW-Modell in Krisenszenarien mechanisch hohe Entnahmen erzeugt.

10. **Anti-Pseudo-Accuracy:** Quantisierung auf sinnvolle Einheiten (50–250 € monatlich) verhindert den Irrtum, dass eine Zahl wie „1.387,42 €/Monat" eine verlässliche Empfehlung darstellt.

---

## 6. Schwächen & Verbesserungspotenzial

### Kritisch (Vertrauen gefährdend)

**S1 — MSCI-Variante undokumentiert**

`DATASET_META.msci_eur.variantStatus = 'undocumented'` — vom Code selbst so markiert. Alle historischen Renditeberechnungen, alle Erfolgsquoten, alle Optimierungsergebnisse hängen davon ab, welcher MSCI-Index verwendet wurde. Vermutlich Price Index, nicht Net Return. Wenn korrekt: systematische Unterschätzung historischer Renditen um 2–3 Pp p.a.

**Verbesserung:** Datenquelle und Index-Variante in `docs/reference/DATA_SOURCES.md` explizit dokumentieren. Wenn Price Index: durch MSCI World Net Return EUR ersetzen (verfügbar ab ca. 1970 über verschiedene Quellen).

**S2 — Hard-Threshold-Regime-Klassifikation**

Bin-äre Schwellenwerte erzeugen Cliff-Effects im Entnahmeprofil. -19,9% und -20,1% ATH-Abstand → sehr unterschiedliche Strategieempfehlung. Das ist fachlich nicht begründbar.

**Verbesserung:** Runway-Zielwerte linear zwischen Regime-Schwellen interpolieren. Beispiel: ATH-Abstand 15–20% → Runway interpoliert zwischen 36 und 60 Monaten, statt abrupt zu springen.

**S3 — CAPE-to-Return: 4 diskrete Stufen**

Sprünge in der Erwartungsrendite bei CAPE-Grenzen erzeugen nicht-kontinuierliche VPW-Raten. Methodisch nicht begründet.

**Verbesserung:** Excess CAPE Earnings Yield als kontinuierliche Funktion: `equityExpectedReturn = (1/CAPE) + risikoprämie - safe_rate`. Eliminiert die diskreten Sprünge und ist in der akademischen Literatur besser fundiert.

### Signifikant

**S4 — VPW Realrendite-Clamp [0%, 5%]**

Untere Grenze schließt ZIRP- und Deflationsszenarien mit negativen Realrenditen aus. Obere Grenze ist bei historisch sehr hohen Renditen zu konservativ.

**Verbesserung:** Untere Grenze auf -1,5% senken; obere Grenze auf 7% anheben. r≈0-Grenzfall explizit dokumentieren (Annäherung `rate ≈ 1/n`).

**S5 — Statische Periodentafeln**

Systematisch zu kurze Lebenserwartungen → VPW-Horizont zu kurz → Entnahmeraten tendenziell zu hoch.

**Verbesserung:** Expliziter Longevity-Zuschlag (+2 Jahre auf alle Erwartungswerte) als Default. Oder: Nutzeroption für Kohortentafel-basierte Berechnungen. DAV-Kohortentafeln sind öffentlich verfügbar.

**S6 — Keine End-to-End-Integrationstests**

MC → Sweep → Optimize als vollständige Pipeline ist nicht durch Tests abgedeckt.

**Verbesserung:** 2–3 Referenz-Szenarien mit bekannten Outputs definieren und als Integrationstests implementieren. Testlaufzeit: ~5 Minuten.

**S7 — Safety-Stage-Zustandsmaschine ohne E2E-Tests**

Konzeptionell komplex; Übergangslogik nicht durch Transition-Tests verifiziert.

**Verbesserung:** Dedizierter Testfall, der 10 Jahre simuliert, gezielt schlechte/gute Jahre injiziert und prüft, ob Stage-Übergänge korrekt ausgelöst werden.

### Technisch

**S8 — Worker-Cache unbegrenzt:** Memory-Leak bei langen Sessions. Verbesserung: LRU-Cache mit max. 5 Einträgen.

**S9 — Recency-Weighting als Standardoption:** Führt zu Momentum-Bias. Verbesserung: Uniform-Sampling als Default; Recency explizit opt-in mit Warnung.

**S10 — Pre-1950-Normalisierungsmethodik:** Undokumentiert. Verbesserung: In DATA_SOURCES.md explizieren.

---

## 7. Vergleich mit etablierten Ansätzen

| Kriterium | 4%-Regel (Trinity) | Kommerzielle Rechner (DE) | Institutionell | Diese Suite |
|---|---|---|---|---|
| Entnahmestrategie | Statisch | Meist statisch | Dynamic LDI / CDI | Variabel + Guardrails |
| SORR-Schutz | Nicht explizit | Selten | Futures/Hedging | Runway + Guardrails |
| Steuermodell (DE) | Nicht vorhanden | Rudimentär | Vollständig | Vollständig |
| Pflegefall | Nicht modelliert | Selten | Aufwändig | Stochastisch |
| Transparenz | Hoch (public paper) | Meist Black-Box | Meist Black-Box | Vollständig |
| Datenbasis | US-Daten | Meist US/global | Proprietär | DE/EUR (mit Lücken) |
| CAPE-Anpassung | Nein | Selten | Ja | Ja (grob) |
| Langlebigkeitsrisiko | Implizit | Meist rudimentär | Vollständig | Teilweise |
| Externe Validierung | Peer-reviewed | Selten | Reguliert | Keine |
| Wartung | Einmalig / veraltet | Professionell | Professionell | Einzelperson |
| Lokale Datensouveränität | N/A | Nein (Cloud) | Nein | Ja |

**Gegenüber 4%-Regel:** Die Suite ist in jeder Dimension anspruchsvoller. Die 4%-Regel ist ein Faustmaß, keine Strategie. Variable Entnahme + Guardrails + Steueroptimierung ist konzeptionell überlegen.

**Gegenüber kommerziellen Rechnern:** Die Suite ist bei Steuergenauigkeit, Pflegefall-Modellierung, Transparenz und lokaler Datenhaltung überlegen. Kommerzielle Rechner haben professionelle Datenbasis und werden gewartet.

**Gegenüber institutionellen Systemen:** Institutionelle Systeme verfügen über Korrelationsmatrizen, Fat-Tail-Modellierung, dynamisches Liability-Matching, regulatorische Validierung und externe Prüfung. Diese Lücken sind für persönliche Planung hinnehmbar, sollten aber beim Interpretieren der Ergebnisgenauigkeit bekannt sein.

---

## 8. Gesamturteil

### Tragfähigkeitsbewertung

**Eingeschränkt tragfähig — geeignet als primäres Planungswerkzeug mit explizit benannten Grenzen.**

Die Suite ist für ihren Bestimmungszweck — informierte, jährlich überprüfte persönliche Ruhestandsplanung durch einen technisch versierten Einzelnutzer — gut konzipiert und sorgfältig umgesetzt. Sie ist das anspruchsvollste bekannte Eigenentwicklungs-Tool in diesem Bereich und übertrifft alle gängigen kommerziellen Alternativen für den deutschen Markt in mehreren wichtigen Dimensionen.

Das Prädikat „eingeschränkt" bezieht sich nicht auf technische Fehler, sondern auf strukturelle Modellgrenzen, die für jeden quantitativen Planungsansatz gelten, hier aber explizit benannt werden müssen.

### Persönliche Einschätzung

**Würde ich mich darauf verlassen?**

Ja — als primäres Planungsinstrument für jährliche Überprüfung und qualitative Szenarienanalyse.

Konkret: Ich würde die Suite nutzen für:
- **Jahresweise Balance-Prüfung:** Bin ich mit meinen Entnahmen im Plan? Ist mein Runway ausreichend?
- **Szenarienanalyse:** Was passiert mit meiner Planung bei einem 40%-Crash in Jahr 5?
- **Steueroptimierung:** Wann und wie viel sollte ich aus welchem Tranche verkaufen?
- **Sensitivitätsanalyse:** Wie wirkt sich 1% mehr Inflation über 10 Jahre aus?
- **Pflegeszenario-Bewertung:** Wie viel Puffer benötige ich für Pflegefall in Jahr 20?

Ich würde die Suite **nicht als alleinigen Entscheidungsgrundlage** verwenden für:
- Absolute Ruin-Wahrscheinlichkeiten (die ausgegebenen Prozentzahlen haben breite, nicht ausgewiesene Konfidenzintervalle)
- Exakte Parameteroptimierungsergebnisse (Overfitting-Risiko)
- Planungsaussagen für Szenarien, die außerhalb des historischen Stichprobenraums liegen

### Die drei kritischsten Schwachstellen

**1. MSCI-Variante undokumentiert (Blocker)**

Solange unbekannt ist, ob der verwendete Index ein Price Index oder Total Return Index ist, sind alle absoluten Erfolgsquoten mit einer Unsicherheit von ±5–10 Prozentpunkten behaftet. Das untergräbt das Vertrauen in alle quantitativen Ausgaben der Simulation. Diese Frage muss zuerst geklärt werden.

**2. Hard-Threshold-Regime-Klassifikation (Design-Schwäche)**

Die diskreten Schwellen erzeugen Cliff-Effects, die wirtschaftlich nicht begründbar sind. Ein Nutzer, der nicht weiß, dass -19,9% und -20,1% ATH-Abstand zu sehr unterschiedlichen Empfehlungen führen, kann aus dem Tool ein Sicherheitsgefühl ableiten, das durch die Entscheidungslogik nicht gestützt wird. Diese Schwäche ist behebbar ohne Architektur-Änderung.

**3. Keine externe Validierung (strukturell)**

Das Tool ist vollständig selbstreferentiell. Es gibt keine unabhängige Überprüfung der Kalkulationsergebnisse gegen externe Referenzimplementierungen (cFIREsim, FIRECalc, institutionelle Modelle). Das ist bei Eigenentwicklungen strukturell unvermeidlich — aber es muss im Nutzungskontext explizit stehen: Die Ergebnisse wurden von keiner unabhängigen Stelle validiert.

---

*Dieser Bericht basiert auf statischer Code-Analyse ohne Live-Ausführung der Software. Alle Bewertungen sind fachlich und technisch begründet. Keine Aussage in diesem Dokument ist eine Finanzberatung.*
