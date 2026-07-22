# Slice 10: Ressourcenvertrag, UI und Barrierefreiheit

**Stand:** 2026-07-19  
**Status:** Implementierung abgeschlossen; Fremdreview und Nutzerfreigabe ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 05, 08 und 09 sowie Entscheidung D-08

## Ziel

Monte-Carlo-Parameter werden einmal strikt validiert und in UI, direktem
Runner, Worker und Auto-Optimize identisch verwendet. Die UI erklaert Kosten,
Fortschritt, Abbruch, Endzustaende und Exporte auch per Tastatur und
Assistenztechnik.

## Akzeptanzkriterien

- `MonteCarloParametersV1` weist Dezimalzahlen, Suffixe, NaN/Infinity,
  ungueltige Enums und Abhaengigkeitsfehler explizit ab.
- Der sichtbare, bei leerem/neuem Profil verwendete MC-Default betraegt
  10.000 Runs. HTML-Attribut, zentraler Parameterfallback, Persistenzmigration
  und Testfixtures verwenden denselben Wert; ein explizit gespeicherter
  gueltiger Nutzerwert wird nicht ueberschrieben.
- D-08 legt begruendete Grenzen fuer Runs, Dauer, Blocklaenge, Worker und
  Budget fest; kein fachlicher Wert wird still geklemmt.
- Der normale empfohlene Bereich endet bei 100.000 Runs. Oberhalb davon zeigt
  die UI eine Grosslastwarnung und verlangt Bestaetigung. 1.000.000 Runs bei
  35 Jahren, 8 Workern und 500 ms bleiben als harte Obergrenze startbar und
  bilden ein Stresstest-Regressionsgate; groessere Werte werden explizit
  abgewiesen.
- Die UI zeigt vor Grosslaeufen mindestens geschaetzte Run-Jahre und
  Speicherklasse. Oberhalb der Warnschwelle ist eine explizite Bestaetigung
  erforderlich; erst die gemessene harte Grenze fuehrt zur Ablehnung.
- Vor Start wird eine nachvollziehbare Kostenschaetzung oder Belastungsstufe
  angezeigt; unvertretbare Kombinationen werden verstaendlich blockiert.
- Start/Cancel/Neustart haben eindeutige disabled-/busy-Zustaende.
- Parameteraenderungen starten keinen Lauf automatisch. Waehrend
  `cancelling` bleibt Start deaktiviert; wiederholte Klicks erzeugen weder
  parallele Generationen noch Worker-Neuaufbauschleifen.
- Fortschritt besitzt Name, `aria-valuemin/max/now`, Statusmeldung und
  sinnvolle Fokusbehandlung; Fehler sind nicht nur farblich erkennbar.
- Outcome-Inventar, Unsicherheit, Samplingwarnungen und Export sind ohne
  widerspruechliche Labels bedienbar.
- UI-, direkter Runner- und Worker-Validator akzeptieren/abweisen dieselben
  Contractfixtures.

## Scope

- gemeinsamer Parameterparser/-validator,
- UI-Bounds, Kostenhinweis, Cancel und Ergebnis-/Exportbedienung,
- minimale HTML/CSS-A11y-Anpassungen,
- Contract- und DOM-Tests.

## Nicht-Scope

- kein komplettes Simulator-Redesign,
- keine automatische Wahl einer "optimalen" Runzahl,
- keine Tauri-Releaseartefakte.

## Geplante Dateien

- neu `app/simulator/monte-carlo-parameters.js`,
- `app/simulator/monte-carlo-ui.js`,
- `app/simulator/simulator-monte-carlo.js`,
- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/auto-optimize-worker.js`,
- `workers/mc-worker.js`,
- `Simulator.html`,
- optional `app/simulator/simulator-main-input-persist.js`,
- eine bestehende Simulator-CSS-Datei,
- Tests/Fixtures.

Produktive Programm-/Konfigurationsdateien: **maximal 9**.

## Diff-Risiko vor Coding

- Branch vor Coding am 2026-07-22:
  `codex/simulator-monte-carlo-gap-plan`.
- Git-Status vor Coding am 2026-07-22: ausschliesslich bereits vorgefundene,
  unversionierte Playwright-Dateien unter `node_modules/.bin/`,
  `node_modules/playwright-core/` und `node_modules/playwright/`; keine
  Slice-10-Aenderung vorhanden.
- Geplante produktive Dateien:
  - neu `app/simulator/monte-carlo-parameters.js`,
  - `app/simulator/monte-carlo-ui.js`,
  - `app/simulator/simulator-monte-carlo.js`,
  - `app/simulator/monte-carlo-runner.js`,
  - `app/simulator/auto-optimize-worker.js`,
  - `workers/mc-worker.js`,
  - `app/simulator/simulator-main-input-persist.js`,
  - `Simulator.html`,
  - `simulator.css`.
- Aenderungstiefe: riskant; vier Eingangswege und die Hauptinteraktion sind
  betroffen. Mit neun produktiven Dateien greift die Stop-Regel nicht.
- Gefaehrdete Tests: Persistenz, UI-Orchestrierung, Worker-Contract,
  Auto-Optimize, Monte-Carlo-Runner, Browser-Smoke.
- Nicht anfassen: Engine, allgemeine Simulatorfelder ausser MC, generierte
  Artefakte und die vorgefundenen Playwright-Dateien.
- Rollback: `git checkout -- app/simulator/monte-carlo-ui.js
  app/simulator/simulator-monte-carlo.js app/simulator/monte-carlo-runner.js
  app/simulator/auto-optimize-worker.js workers/mc-worker.js
  app/simulator/simulator-main-input-persist.js Simulator.html simulator.css`;
  die neue Datei `app/simulator/monte-carlo-parameters.js` nur nach
  ausdruecklicher Freigabe entfernen.

## Geplante Tests

- tabellarische Accept-/Reject-Fixtures fuer alle vier Consumer,
- neues/leeres Profil ergibt 10.000 Runs; bestehendes Profil mit explizitem
  Wert behaelt diesen Wert,
- Boundary- und Kostenwarnfaelle,
- 100.000 ohne Grosslastdialog, 100.001 bis 1.000.000 nur nach Bestaetigung,
  1.000.001 mit expliziter Ablehnung sowie 1.000.000 als Stresstest,
- DOM-Tests fuer Busy/Cancel/Error/ARIA/Fokus,
- schnelle Parameterfolgen sowie doppelte Start-/Cancelaktionen ohne
  automatischen Restart,
- Worker-/Orchestrierungsparitaet,
- `npm test` und fokussierter Browserlauf.

## Durchgefuehrte Aenderungen

- `MonteCarloParametersV1` zentralisiert den strikt ganzzahligen Parameter-,
  Enum- und Boolean-Vertrag fuer UI, direkten Runner, Worker und
  Auto-Optimize. Dezimalwerte, Suffixe, nicht endliche Werte und unbekannte
  Enums werden abgewiesen; fachliche Werte werden nicht still geklemmt.
- D-08 ist mit 1 bis 1.000.000 Runs, einem empfohlenen Hoechstwert von
  100.000, dynamischem Mortalitaetshorizont, Blocklaenge 1 bis 30, Seed im
  `uint32`-Bereich, 0/Auto oder 1 bis 32 Workern und 50 bis 5.000 ms Jobbudget
  umgesetzt. Auto-Worker werden auch bei groesseren Hardwarewerten auf 32
  begrenzt.
- Der neue Profil-/UI-Default ist 10.000 Runs. Leere oder neue Profile erhalten
  diesen Wert; ein vorhandener expliziter Persistenzwert bleibt unveraendert.
- Die UI zeigt Run-Jahre, geschaetzten Result-Speicher und Belastungsstufe.
  Oberhalb 100.000 Runs ist vor jedem Start eine explizite Bestaetigung
  erforderlich; eine Aenderung von Runzahl oder Dauer invalidiert sie.
- Start, Cancel und `cancelling` besitzen eindeutige Single-Flight- und
  Busy-Zustaende. Fortschritt, Live-Status, Fehler und Ergebnisse besitzen
  semantische Rollen, ARIA-Werte und eine explizite Fokusbehandlung.
- Contract-, Persistenz-, Worker-, Auto-Optimize-, DOM- und Browser-Smoke-Tests
  decken Grenzen, fehlerhafte Eingaben, Bestaetigung, Fokus und ARIA ab.

## Ausgefuehrte Tests

- 12 fokussierte Node-Suiten: 1.246/1.246 Assertions gruen, darunter der neue
  Parametervertrag, UI-Orchestrierung, Persistenz, direkter Runner, beide
  Worker-Eingaenge, Worker-Paritaet/-Lifecycle, Sampling, Horizont und Export.
- `npm run test:browser`: 14/14 Browser-Szenarien gruen; der Simulator-Smoke
  prueft zusaetzlich Default, Kostenschaetzung, Warnschwelle,
  Bestaetigungsinvalidierung und semantische Rollen.
- `npm test`: 6.858/6.859 Assertions gruen und 0 offene Handles. Der Testlauf
  innerhalb von `npm run test:coverage` bestaetigte dieselben Zahlen.
- Einzige Abweichung in beiden Vollsuiten ist das bereits vor Slice 10 rote
  Architektur-Linkgate mit sechs Verweisen auf zwei fehlende, archivierte
  Forschungsdokumente. Alle Slice-10- und uebrigen Tests sind gruen.
- `node tests/coverage-report.mjs`: approximative Gesamt-Zeilencoverage
  76,05 Prozent; `monte-carlo-parameters.js` 91,87 Prozent,
  `monte-carlo-ui.js` 88,98 Prozent und `monte-carlo-runner.js` 85,11 Prozent.
- Syntaxpruefung der geaenderten JavaScript-Quellmodule und `git diff --check`:
  gruen.

## Abweichungen vom Plan

- Die bisherigen UI-Grenzen 1926 bis 2010 fuer den historischen Startjahrfilter
  waren mit dem tatsaechlich verfuegbaren Datenbestand unvereinbar. Vertrag und
  HTML verwenden deshalb die aus den Jahresdaten abgeleiteten Grenzen 1925 bis
  2025; der Validator bleibt fuer andere Datenbestaende dynamisch.
- Der Browser-Smoke musste den Monte-Carlo-Tab fuer die neuen sichtbaren
  Kontrollen explizit aktivieren und vor den bestehenden Rahmendatenpruefungen
  wieder zurueckschalten. Das ist eine reine Testablaufanpassung.

## Offene Risiken

- Die harte Grenze von 1.000.000 Runs wird durch Contract-/Boundary-Tests und
  die Messwerte aus Slice 01 abgesichert; Slice 10 hat keinen erneuten
  vollstaendigen 1-Millionen-CPU-Lauf ausgefuehrt.
- Die Orchestrierungsdatei `simulator-monte-carlo.js` besitzt in der
  approximativen Node-Coverage weiterhin geringe direkte Abdeckung. Der reale
  Browser-Smoke deckt die neuen UI-Vertraege ab; ein vollstaendiger
  Browser-Run-/Cancel-Nachweis ist Bestandteil von Slice 11.
- Die sechs toten Architektur-Links sind ein vorbestehendes, fachfremdes
  Repository-Gate und bleiben ausserhalb des Slice-10-Scopes offen.

## Rueckdokumentation und Freigabe

Grenzen, Parsercontract, Ressourcenmodell, A11y-Nachweis und Testergebnisse
sind in Hauptplan, README und technischen Referenzen rueckdokumentiert.
Implementierung abgeschlossen; Gemini-/Nutzerreview, Freigabe und lokaler
Commit stehen aus. Codex erteilt keine eigene Freigabe.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 10 löst P0-GAP MC-14 und Teile von MC-15 vollständig.
  - **MC-14 (Resource Bounds & Parameter-Normierung):** `MONTE_CARLO_PARAMETER_LIMITS` und `normalizeMonteCarloParametersV1` in `app/simulator/monte-carlo-parameters.js` stellen sicher:
    - Standard: 10.000 Runs
    - Empfohlener Max: 100.000 Runs (Benötigt Checkbox im UI bei > 100.000)
    - Hard Stress-Test Limit: 1.000.000 Runs (Gegen Overflow geschützt)
  - **Dynamische Lastschätzung:** `initMonteCarloResourceControls` berechnet geschätzte Laufzeit, Speicherverbrauch (RSS/Worker-Buffers) und Laststufe ("Standard", "Erhöht", "Großlast").
  - **A11y (Barrierefreiheit):** Barrierefreie `role="progressbar"`, ARIA-Attribute (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`), Tastatur-Fokus-Markierungen in `simulator.css` und Screenreader-Labels.
* **Vertragstreue:** Der Parameter-Vertrag ist zentralisiert und wird sowohl von den UI-Readern als auch von den Worker-Entrypoints (`mc-worker.js`, `auto-optimize-worker.js`) konsistent verwendet.
* **Fehlerbehandlung:** 60 dedizierte Tests in `tests/monte-carlo-parameters.test.mjs` belegen Fail-Closed-Verhalten bei dezimalen Run-Zahlen, ungültigen Suffixen, negativen Seeds, überschrittenen Maximalwerten oder fehlender Großlast-Bestätigung.
* **Seiteneffekte:** Punktgenau **9 produktive Programmdateien** verändert (`Simulator.html`, `auto-optimize-worker.js`, `monte-carlo-runner.js`, `monte-carlo-ui.js`, `simulator-main-input-persist.js`, `simulator-monte-carlo.js`, `simulator.css`, `workers/mc-worker.js`, `monte-carlo-parameters.js`). Alle Dokumentationen (`README.md`, `TECHNICAL.md`, `SIMULATOR_MODULES_README.md`, Hauptplan, Slice-Dokument) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Auf leistungsschwachen Endgeräten bleibt bei bewusster Bestätigung von > 100.000 Läufen ein hohes Ressourcenrisiko bestehen (by design).

### 2. Nummerierte Findings
* **Finding G-01-S10 (Vollständige Validierung aller Parameter):** Durch die zentralisierte Validierung in `monte-carlo-parameters.js` können weder manipulierte UI-Felder noch ungültige Worker-Payloads (z. B. "10000abc" oder NaN) falsche Berechnungen auslösen.
* **Finding G-02-S10 (Barrierefreiheit & Last-Transparenz):** Progressbars und Warnhinweise erfüllen moderne WCAG-A11y-Standards und machen Ressourcenkosten vor der Ausführung transparent.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre ein Anwender, der auf einem Mobilgerät 1.000.000 Läufe ausführt, die Checkbox bestätigt und wegen Browser-RAM-Grenzen eine Tab-Schließung auslöst. Geschützt durch die Checkbox-Hürde und den Standard-Wert von 10.000 Läufen.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Auf leistungsschwachen Endgeräten bleibt bei bewusster Bestätigung von > 100.000 Läufen hohes Ressourcenrisiko bestehen (by design).
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 10 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S10 | Gemini | Vollständige Parameter-Validierung | angenommen | `monte-carlo-parameters.js` zentral im UI und Worker integriert |
| G-02-S10 | Gemini | Barrierefreiheit & Last-Transparenz | angenommen | ARIA-progressbar, Laststufe und Bestätigungs-Checkbox umgesetzt |
| G-05 | Gemini | Terminate-/Recreate-Leak bei schneller UI | angenommen | kein Auto-Run, single-flight UI-Zustaende |
| C-03 | Claude | kritische Coverage ohne Mindestziel | angenommen | Abschlussgate in Slice 12 verschaerft |
| U-01 | Nutzer | 1 Mio. Runs standardnah erfolgreich | angenommen | startbarer Stresstest und harte Rungrenze |
| U-02 | Nutzer | 100k praktisch ausreichend | angenommen | Empfehlung 100k, Warnbereich bis 1 Mio., harte Grenze 1 Mio. |
| U-03 | Nutzer | Standardwert auf 10.000 setzen | angenommen | HTML/Fallback/Persistenz/Test umgesetzt |
