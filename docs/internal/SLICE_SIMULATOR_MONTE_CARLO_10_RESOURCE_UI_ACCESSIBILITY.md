# Slice 10: Ressourcenvertrag, UI und Barrierefreiheit

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
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

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: riskant; mehrere Eingangswege und die Hauptinteraktion sind
  betroffen.
- Gefaehrdete Tests: Persistenz, UI-Orchestrierung, Worker-Contract,
  Auto-Optimize, Browser-Smoke.
- Nicht anfassen: Engine, allgemeine Simulatorfelder ausser MC, generierte
  Artefakte.
- Rollback: nur gelistete Dateien auf die freigegebenen Vor-Slices; bei mehr als
  neun geplanten Produktivdateien vor Edit stoppen und Slice aufteilen.

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

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Konkrete Grenzen sind Produktentscheidungen und duerfen nicht aus aktueller
  Hardwareleistung abgeleitet werden, ohne D-08 und schwache Systeme zu pruefen.

## Rueckdokumentation und Freigabe

Grenzentabelle, Parsercontract, A11y-Nachweis und UI-Screens/Prufergebnisse in
den Hauptplan uebernehmen. Implementierung und Freigaben: ausstehend.

## Review-Feedback von Gemini

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice-spezifische Re-Review ist ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-05 | Gemini | Terminate-/Recreate-Leak bei schneller UI | angenommen | kein Auto-Run, single-flight UI-Zustaende |
| C-03 | Claude | kritische Coverage ohne Mindestziel | angenommen | Abschlussgate in Slice 12 verschaerft |
| U-01 | Nutzer | 1 Mio. Runs standardnah erfolgreich | angenommen | startbarer Stresstest und harte Rungrenze |
| U-02 | Nutzer | 100k praktisch ausreichend | angenommen | Empfehlung 100k, Warnbereich bis 1 Mio., harte Grenze 1 Mio. |
| U-03 | Nutzer | Standardwert auf 10.000 setzen | angenommen | HTML/Fallback/Persistenz/Test als Slice-10-Akzeptanzkriterium |
