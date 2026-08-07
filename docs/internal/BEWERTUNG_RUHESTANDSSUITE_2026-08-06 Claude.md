# Gesamtbewertung der Ruhestand-Suite

**Stand:** 2026-08-06
**Bewerteter Commit:** `27b9264` zuzüglich der unversionierten Arbeitskopie
**Rolle:** Claude als Reviewer/Analyst; adversariale Grundhaltung, keine Änderung an Anwendungscode
**Bewertungsart:** unabhängige Gesamtbewertung nach den Härtungsmaßnahmen der Slices 1–19

---

## 0. Wie dieses Dokument zu lesen ist

Jeder Abschnitt hat drei Ebenen:

| Symbol | Bedeutung | Für wen |
|---|---|---|
| 🟢 **Klartext** | Was der Punkt in Alltagssprache bedeutet | fachliche und technische Laien |
| 🔧 **Befund** | Was konkret geprüft wurde und was herauskam | Fachleute |
| 📊 **Note** | Bewertung 1–100 % mit Begründung | alle |

**Geltungsgrenze:** Diese Bewertung beurteilt Software, Dokumentation und
Modelleignung. Sie ist keine Anlageberatung, keine Steuerberatung und keine
Aussage darüber, ob ein konkreter Ruhestandsplan trägt.

**Was diese Bewertung *nicht* leisten kann:** Ich habe die Suite nicht
über ein reales Jahr betrieben, keine unabhängige Replikation der Renditereihen
gegen einen kommerziellen Weltindex durchgeführt und keine Nutzerstudie gemacht.
Wo mir dafür die Grundlage fehlt, sage ich das ausdrücklich.

---

## 1. Evidenzbasis — was ich tatsächlich ausgeführt und geprüft habe

Alle folgenden Zahlen stammen aus eigenen Läufen am 2026-08-06, nicht aus der
Dokumentation:

| Prüfung | Kommando | Ergebnis |
|---|---|---|
| Node-Standardsuite | `node tests/run-tests.mjs` | **18.977 Assertions, 18.977 bestanden, 0 Fehler, 0 offene Handles** |
| Browser-Pflichtgate | `node tests/browser-smoke.test.mjs` | **29 Workflows, 29 bestanden** |
| Coverage (Bestandsstand 2026-08-03) | `.coverage/summary.json` | **78,97 % Zeilenabdeckung (40.302/51.035)** |
| Codeumfang | Dateiinventar | **222 Module, 69.160 Zeilen** in `app/`, `engine/`, `workers/`, `types/` |
| Testumfang | Dateiinventar | **167 `*.test.mjs`-Dateien, 62.142 Zeilen Testcode** |
| Dokumentation | Zeilenzählung | **≈15.500 Zeilen** Referenz-/Internaldoku + 1.884 Zeilen `Handbuch.html` |
| Projektreife | `git rev-list --count` | **951 Commits über 9 Monate** (2025-11-05 bis 2026-08-04) |

Zusätzlich habe ich stichprobenartig verifiziert, ob die in
`MC_LAUF_ANALYSE_2026-08-04` dokumentierten Findings im heutigen Code noch
vorhanden sind. Ergebnis siehe Abschnitt 4.3.

---

# TEIL A — Technische Umsetzung, Dokumentation, Tests (50 % der Gesamtnote)

## A.1 Architektur und Modularisierung — 88 %

🟢 **Klartext:** Ist das Programm sauber in verständliche Bausteine zerlegt,
oder ist es ein Knäuel, bei dem eine Änderung an einer Stelle unvorhersehbar
an anderer Stelle etwas kaputt macht?

🔧 **Befund:**

*Was gut ist:*

- Klare Dreiteilung: `engine/` (reine Rechenlogik, kein Bezug zur
  Bildschirmoberfläche), `app/` (Bedienung und Ablaufsteuerung), `types/`
  (Datenverträge). Die Engine ist damit unabhängig testbar und wird in
  Browser, Desktop-App und Worker identisch verwendet.
- Die Engine selbst ist in 27 Module zerlegt, davon 12 reine
  Entnahme-Policy-Module (`alarm-policy`, `flex-rate-policy`,
  `minimum-flex-policy`, `final-rate-policy` …). Jede Regel der
  Entnahmestrategie ist eine eigene, einzeln testbare Datei. Das ist
  überdurchschnittlich diszipliniert.
- **Null Laufzeit-Abhängigkeiten.** `package.json` enthält exakt zwei
  Entwicklungsabhängigkeiten (Tauri-CLI, Playwright). Das Programm selbst
  benutzt keinerlei fremde Bibliotheken. Für eine Finanzanwendung, die
  10 Jahre laufen soll, ist das ein erheblicher Vorteil: keine
  Sicherheitslücken aus Fremdcode, keine Abhängigkeit von fremden
  Projektlebenszyklen.
- Versionierte Datenverträge (`MonteCarloSamplingContractV1`,
  `SimulatorExecutedTaxContractV1`, `HistoricalBacktestExportV2`, …). Änderungen
  an Datenformaten sind dadurch nachvollziehbar statt still.
- Worker-Parallelisierung mit eigenem Paritätstest: die parallele und die
  serielle Berechnung müssen bei gleichem Zufallsstartwert identische
  Ergebnisse liefern. Das ist ein Test, den die meisten Projekte nicht haben.

*Was nicht gut ist:*

- Einzelne Dateien sind zu groß geworden: `engine/core.mjs` (1.634 Zeilen),
  `app/balance/balance-binder-imports.js` (1.527), `app/tranches/
  tranchen-manager-page.js` (1.249). Bei dieser Größe ist eine
  Änderung schwer vollständig zu überblicken.
- `app/simulator/` enthält 116 Module in einer flachen Ebene ohne
  Unterordner. Die Namenspräfixe (`monte-carlo-*`, `auto-optimize-*`,
  `historical-backtest-*`) ersetzen eine echte Ordnerstruktur nur behelfsmäßig.
- Zwei Platzhalterdateien im Wurzelverzeichnis (`app_code.js` mit 280 Byte,
  `engine.js` mit 371 Byte) sind Altlasten ohne erkennbaren aktuellen Zweck.

📊 **Note: 88 %** — sehr solide Struktur mit einigen zu groß gewordenen
Dateien und einem unstrukturierten Simulator-Verzeichnis.

---

## A.2 Tests und Testinfrastruktur — 85 %

🟢 **Klartext:** Wie gut merkt das Projekt selbst, wenn eine Änderung etwas
kaputt gemacht hat? Ein Test ist ein automatischer Kontrollrechner, der nach
jeder Änderung prüft, ob die Ergebnisse noch stimmen.

🔧 **Befund:**

*Was gut ist:*

- **18.977 Prüfungen, alle bestanden.** Das habe ich selbst ausgeführt, nicht
  aus der Doku übernommen. Bei 69.160 Zeilen Programmcode stehen 62.142 Zeilen
  Testcode — ein Verhältnis von fast 1:1. Das ist deutlich über dem, was
  Softwareprojekte üblicherweise erreichen.
- **Mehrstufige Absicherung statt eines einzigen Tests:** Node-Standardsuite,
  29 echte Browser-Durchläufe mit Playwright (inklusive Korruptions- und
  Wiederherstellungsfällen), Coverage-Messung, Engine-Build, Tauri-Build.
- **Worker-Paritätstest** über 584 Assertions: Continuous-CAPE,
  Langlebigkeitshorizonte, Stationary Bootstrap und Tail-Risk werden explizit
  auf Gleichheit zwischen paralleler und serieller Rechnung geprüft.
- **Datenrekonstruktionstests**: für jede historische Datenreihe gibt es einen
  Test, der die Reihe aus den Originalquellen neu aufbaut und mit dem
  ausgelieferten Stand vergleicht, sowie teilweise „independent oracle"-Tests
  gegen eine zweite, unabhängige Berechnung.
- Ein **Dokumentations-Prüfgate** (`npm run docs:evidence`) ist Teil der
  Testsuite und prüft die Evidenzregister mechanisch auf Recordzahlen,
  Pflichtfelder, IDs, Anker und fällige Aktualitätsscopes.
- Engine-Abdeckung liegt bei **90,8 %** — genau dort, wo sie am wichtigsten ist.

*Was nicht gut ist:*

- **Keine verbindliche Mindestabdeckung.** Die Coverage wird gemessen, aber
  nichts blockiert, wenn sie fällt. Die Dokumentation nennt das selbst
  „noch keine harte Mindestschwelle".
- **9 Dateien haben 0 % Abdeckung, 22 Dateien liegen unter 50 %.** Betroffen
  sind fast ausschließlich Bedienoberflächen-Module — aber darunter sind
  fachlich relevante:

  | Datei | Zeilen | Abdeckung |
  |---|---:|---:|
  | `app/simulator/simulator-sweep.js` | 431 | **6,5 %** |
  | `workers/worker-telemetry.js` | 363 | **12,9 %** |
  | `app/simulator/auto_optimize_ui.js` | 187 | 17,6 % |
  | `app/simulator/simulator-monte-carlo.js` | 517 | 28,1 % |
  | `app/simulator/simulator-optimizer.js` | 575 | 36,9 % |
  | `app/simulator/simulator-main-profiles.js` | 359 | **0 %** |
  | `app/simulator/simulator-ui-rente.js` | 191 | **0 %** |
  | `app/simulator/simulator-ui-pflege.js` | 128 | **0 %** |

  Dass die Renten- und Pflege-Eingabemasken bei 0 % liegen, ist heikel: das
  sind genau die Felder, über die der Nutzer die sensibelsten Annahmen eingibt.
- Der Coverage-Stand ist vom **2026-08-03** und wurde für die Slices 17–19
  nicht neu gemessen. Die Zahl 78,97 % beschreibt also einen älteren Codestand.
- Die **Testinfrastruktur trägt selbst technische Schulden**: `run-tests.mjs`
  enthält eine `TEST_EXECUTION_POLICY`-Liste mit Dateien, die isoliert laufen
  müssen und über einen `legacy-assertion-loader` gezählt werden — mit
  Begründungen wie „Uses legacy local assertion helpers". Das ist ein
  Sonderfallregister, das mit jedem weiteren Eintrag schwerer wartbar wird.
- Der Test-Runner ist eigenentwickelt. Das ist konsistent mit dem
  Null-Abhängigkeits-Ansatz, bedeutet aber, dass Fehler im Runner selbst
  niemand außerhalb des Projekts findet.

📊 **Note: 85 %** — quantitativ und methodisch stark, mit einer erkennbaren
blinden Zone in der Bedienoberfläche des Simulators und ohne harte
Coverage-Schwelle.

---

## A.3 Dokumentation — 86 %

🟢 **Klartext:** Kann jemand — der Nutzer selbst in fünf Jahren, oder ein
Fremder — verstehen, was das Programm tut, warum es das so tut, und wo es
seine Grenzen hat?

🔧 **Befund:**

*Was außergewöhnlich gut ist:*

Die Dokumentation dieses Projekts liegt qualitativ deutlich über dem, was
private oder auch viele kommerzielle Finanzsoftware bietet. Konkret:

- **Ein Ergebnisregister**, das für jede Kennzahl in einer Tabelle festhält:
  Berechnungsbasis · zulässige Aussage · *was ausdrücklich nicht daraus
  abgeleitet werden darf*. Beispiel Floor-Deckung: zulässig ist „modellinterne
  Deckung des Floors im gewählten Horizont", unzulässig ist „Garantie" oder
  „empirische Eintrittswahrscheinlichkeit". Solche Negativ-Spalten sind selten
  und genau das, was Fehlinterpretationen verhindert.
- **Ein Modellrisikoregister** MR-01 bis MR-12, das jedes bekannte
  Modellrisiko benennt, seine Wirkung beschreibt und den Behandlungsstatus
  festhält — inklusive unangenehmer Punkte wie „Gebühren fehlen als
  Cashflows, Endvermögen kann zu hoch ausfallen".
- **Ein Register offener Fachentscheidungen** D-10 bis D-19 mit dem
  jeweiligen Ist-Contract und dem Status „offen" / „entschieden".
- **Ein Produktmängelregister** PD-01 bis PD-03, das drei tatsächlich
  aufgetretene Fehler (falsche reale Entnahme, doppelte Prozentskalierung,
  irreführendes KPI-Label) benennt statt sie nachträglich wegzuerklären.
- **Validierungsstufen V1 bis V6** mit der durchgehenden, ehrlichen Aussage:
  „extern validiert: nein". Das Projekt behauptet an keiner Stelle eine
  Wirksamkeit, die es nicht belegt hat.
- **Zwei Evidenzregister** mit 69 Marktquellen- und 55 Forschungsrecords,
  jeweils mit Quellenklasse, Evidenzstufe, dauerhaftem Link und
  Übertragbarkeitsgrenze; 17 Rechenmechanismen sind einzeln zugeordnet.
- **Ein Marktvergleich**, der die Stärken der Wettbewerber ausdrücklich als
  „nicht zu relativieren" auflistet und acht eigene Lücken (GAP-MKT-01 bis 08)
  benennt.
- Für den Nutzer: `QUICKSTART.md`, 7 geführte Touren, `Handbuch.html` mit
  Inhaltsverzeichnis, FAQ und Glossar, Onboarding-Playbook „Erste Woche".

*Was nicht gut ist:*

- **Zahlendrift.** Das Architekturdokument nennt als reproduzierbare
  Momentaufnahme von Commit `dfc22a9` (2026-07-19):

  | Angabe im Dokument | Tatsächlich (2026-08-06) | Abweichung |
  |---|---|---|
  | 101 Simulator-Module | 116 | +15 % |
  | 119 Testdateien | 167 | **+40 %** |
  | 3 Module in `types/` | 7 | +133 % |
  | 12 Module in `app/shared/` | 13 | +8 % |

  Das Dokument kennzeichnet den Stand korrekt als Momentaufnahme, aber eine
  Testdateizahl, die um 40 % danebenliegt, taugt nicht mehr zur Orientierung.
  `tests/README.md` ist mit 166 Dateien / 18.822 Assertions näher dran, aber
  nennt 28 Browser-Workflows, während heute 29 laufen.
- **Der README ist unlesbar geworden.** 52 KB, und die Rubrik „Funktionen im
  Überblick" besteht aus Stichpunkten, die zu Absätzen von 300–400 Wörtern
  angewachsen sind. Der Stichpunkt zum Liquiditäts-Runway erklärt in einem
  einzigen Block sieben verschiedene Begriffe. Als Einstiegsdokument
  funktioniert das nicht mehr; der Inhalt gehört in die Referenz.
- **`CHANGELOG.md` hat 1.202 Byte** bei 951 Commits. Faktisch ungepflegt.
  Für ein Projekt, das ansonsten Provenienz und Nachvollziehbarkeit so ernst
  nimmt, ist das eine auffällige Lücke.
- **`docs/README.md` ist als Bestandsaufnahme unvollständig**: die Rubrik
  „Dateien" unter `docs/reference/` listet vier Dateien, tatsächlich liegen
  dort 15.
- Der README nennt als Dokumentationsstand den 2026-07-28, während der
  Code vom 2026-08-04/05 stammt.

📊 **Note: 86 %** — inhaltlich in der Spitzengruppe, mit einem echten
Aktualitäts- und Lesbarkeitsproblem in den Einstiegsdokumenten.

---

## A.4 Code-Qualität und Werkzeugkette — 62 %

🟢 **Klartext:** Gibt es automatische Helfer, die typische Programmierfehler
finden, bevor ein Mensch sie sucht? In der Software-Industrie sind das
„Linter" (Stilprüfer) und „Typprüfer" (kontrollieren, ob eine Zahl auch
wirklich eine Zahl ist).

🔧 **Befund:**

*Was gut ist:*

- **Null `TODO`, `FIXME` oder `HACK`** im gesamten Anwendungscode. Es gibt
  keine „das reparieren wir später"-Kommentare. Alles Offene steht stattdessen
  in den Registern der Dokumentation. Das ist eine bewusst gewählte und
  konsequent durchgehaltene Disziplin.
- 532 dokumentierte JSDoc-Parameter/Rückgabewerte; jedes Modul beginnt mit
  einem Kopfkommentar aus Purpose/Usage/Dependencies.
- **Kein `eval()` und kein `new Function()`** im gesamten Anwendungscode —
  die gefährlichste JavaScript-Konstruktion kommt schlicht nicht vor.
- Eine zentrale `escapeHtml()`-Funktion für die sichere Ausgabe von
  Nutzertexten existiert.

*Was nicht gut ist:*

- **Kein Linter, kein Formatter, keine Typprüfung.** Es gibt weder eine
  ESLint-Konfiguration noch eine `tsconfig.json`/`jsconfig.json`. Von
  222 Modulen tragen **26** die Direktive `@ts-check` — also rund 12 %.
  Für 69.160 Zeilen JavaScript, das Geldbeträge und Steuern rechnet, ist das
  die deutlichste technische Lücke des Projekts. Ein Tippfehler in einem
  Feldnamen (`entnahmeQuote` statt `entnahmequote`) wird von JavaScript
  klaglos als `undefined` durchgereicht und fällt erst auf, wenn ein Test
  zufällig genau diesen Pfad abdeckt.
- **64 Verwendungen von `innerHTML`** im `app/`-Verzeichnis. Es gibt zwar die
  Escaping-Funktion, aber keinen Mechanismus, der ihre Verwendung erzwingt.
  Jede einzelne Stelle muss von Hand richtig sein. Bei einer rein lokalen
  Anwendung ohne fremde Inhalte ist das Risiko begrenzt — aber CSV-Importe
  und Profilnamen sind Fremdeingaben, die diesen Weg nehmen können.
- **Die Content-Security-Policy ist schwach und wird per Test eingefroren.**
  `src-tauri/tauri.conf.json` erlaubt `script-src 'self' 'unsafe-inline'
  'unsafe-eval'` und setzt `dangerousDisableAssetCspModification: true`.
  Gravierender als die Einstellung selbst ist, dass `tests/tauri-csp.test.mjs`
  in Zeile 50 aktiv prüft, *dass* `'unsafe-eval'` vorhanden ist. Der Test
  zementiert damit einen Schwachpunkt, statt zu seiner Beseitigung zu drängen —
  obwohl ich im Anwendungscode gar kein `eval()` gefunden habe, die Erlaubnis
  also vermutlich entbehrlich wäre.

📊 **Note: 62 %** — sauber geschriebener, disziplinierter Code, dem die
gesamte automatisierte Qualitätssicherungsschicht fehlt, die man bei dieser
Codegröße erwarten würde.

---

## A.5 Datenpipeline und Reproduzierbarkeit — 95 %

🟢 **Klartext:** Woher kommen die historischen Aktien-, Gold-, Inflations- und
Zinsdaten, auf denen alle Simulationen beruhen? Und kann jemand nachprüfen,
dass sie nicht manipuliert oder versehentlich verfälscht sind?

🔧 **Befund:**

Das ist die stärkste Einzelleistung des Projekts.

- Sechs historische Reihen (Weltaktien, deutscher Verbraucherpreisindex,
  deutscher Geldmarkt/Zins, Gold in EUR, US-Shiller-CAPE, deutscher
  Bruttolohnindex) plus ein Demografie-/Pflege-Vertrag werden **nicht als
  fertige Tabelle ausgeliefert, sondern aus den Originalquellen erzeugt.**
- Die **Originaldateien liegen im Repository**: die 8,6-MB-Bundesbank-PDF,
  die Shiller-Excel-Datei, der JST-Makrohistorien-Datensatz R6, die
  Destatis-Pflegestatistik. Jeder kann die Kette von der Quelle bis zur
  Laufzeitzahl nachvollziehen.
- Jedes Build-Skript hat einen `--verify-only`-Modus. `npm run
  verify:german-cpi-data` und sechs Geschwister prüfen, ob die ausgelieferte
  Reihe noch exakt aus der Quelle folgt.
- Die Bundesbank-Zinsreihe wird ab 1949 **koordinatenbasiert direkt aus der
  PDF gegen einen getrennten Layout-Extrakt geprüft.** Das ist ein Aufwand,
  den kaum jemand betreibt.
- SHA-256-Fingerabdrücke über die kanonischen Werte, `independent oracle`-Tests
  für Gold, Lohn und CAPE gegen eine zweite Berechnung.
- Ungeklärte Quelle, Lizenz oder Abrufstand bleiben `unresolved` und
  **blockieren** eine Behauptung externer Validierung.
- Für Exporte: `sync-dist` verlangt einen sauberen, committeten Quellbaum;
  ein Backtest-Raw-Export wird bei „dirty" Arbeitsverzeichnis mit stabilem
  Fehlercode verweigert. Ein exportiertes Ergebnis lässt sich damit immer
  einem exakten Codestand zuordnen.

*Was fehlt:*

- Die Aktienreihe (`global_equity_research_index`) ist **kein Anbieterindex**
  und wurde nie jahresgenau gegen einen kapitalgewichteten Weltindex geprüft
  (MR-02). Sie ist perfekt *reproduzierbar*, aber nicht *validiert*. Das ist
  ein wichtiger Unterschied — siehe B.3.
- 1925–1950 ein wirtschaftsgewichteter USD-Forschungsproxy, 2021–2025 ein
  eingefrorener Dividendenbaustein.

📊 **Note: 95 %** — technische Reproduzierbarkeit auf einem Niveau, das
wissenschaftlichen Standards genügt. Der Abzug betrifft ausschließlich die
fehlende externe Benchmarkvalidierung, die als eigenes Risiko dokumentiert ist.

---

## A.6 Fehlerbehandlung und Robustheit — 90 %

🟢 **Klartext:** Was passiert, wenn etwas schiefgeht — falsche Eingabe,
abgestürzte Internetverbindung, beschädigte Datei? Bricht die Anwendung
ordentlich ab, oder rechnet sie stillschweigend mit Müll weiter?

🔧 **Befund:**

- Durchgängiges **„fail-closed"-Prinzip**: bei fehlenden, ungültigen oder
  widersprüchlichen Planner-Werten stoppt der Produktivpfad, statt zu raten.
  `simulateSingleYear()` liefert entweder den vollständigen Erfolgs-Shape oder
  ein `error`-Envelope — nie ein halbes Ergebnis.
- **Recovery-Snapshot vor Mutation**: Der Jahresabschluss erzeugt erst einen
  verifizierten Sicherungspunkt, bevor irgendetwas geschrieben wird. Ein
  fehlgeschlagener CAPE-Abruf lässt den Snapshot und einen sichtbaren
  unvollständigen Periodenstatus bestehen, statt den Abschluss fälschlich als
  erfolgreich zu markieren.
- **Idempotenter Jahresabschluss** über eine stabile Perioden-ID —
  Doppelklick und Wiederholung können nichts doppelt buchen.
- **Korrupte Daten werden nicht als leer interpretiert.** Bei beschädigten
  Ausgaben-, Profil- oder Tranchendaten bleibt der Bereich schreibgesperrt und
  bietet Recovery-Export, bestätigten Reset oder Abbruch an. Ich habe die
  entsprechenden Browser-Tests laufen sehen: „Balance corrupt profile health",
  „tranche corrupt recovery", „profile registry recovery" — alle bestanden.
- Ungültige Parameter (Tail-Risk-Wahrscheinlichkeit > 5 %, Dauer > Horizont)
  **blockieren** den Lauf, statt still auf den Randwert geklemmt zu werden.
- Fremdwährungskurse werden abgelehnt statt implizit umgerechnet.

*Was fehlt:*

- Der Ausfall externer Datenquellen ist auf drei Inflationsanbieter und eine
  CAPE-Fallbackkette abgesichert, für den Yahoo-Kursproxy jedoch nicht — dort
  gibt es keinen zweiten Anbieter.
- `RunwayTargetRawMonths` wird auch dann nicht abgesenkt, wenn das Ziel über
  zwölf Jahre unerreichbar bleibt (siehe B.3). Das ist kein Absturz, aber
  eine Regel ohne Notausgang.

📊 **Note: 90 %**

---

## A.7 Automatisierte Prüfläufe und Auslieferung (CI/Release) — 75 %

🟢 **Klartext:** Laufen die Tests automatisch bei jeder Änderung, oder muss
jemand daran denken? Und wie kontrolliert entsteht die fertige `.exe`?

🔧 **Befund:**

- **GitHub Actions** führt bei jedem Push auf `main` und jedem Feature-Branch
  die volle Suite mit Coverage aus und lädt die Coverage-Zusammenfassung als
  Artefakt hoch. `fetch-depth: 0`, weil die Slice-14-bis-16-Evidenz
  Vorgänger-Blobs per SHA liest — durchdacht.
- Die Auslieferung ist streng: `sync-dist` verlangt sauberen Git-Stand,
  kopiert ausschließlich das von Git gelistete Dateiinventar, blockiert
  unversionierte Dateien in Laufzeitpfaden und prüft Commit und Clean-Status
  noch einmal vor dem Schreiben der Desktop-Provenienz.
- Build-Provenienz wird in `__build-provenance.json` eingebettet und ist zur
  Laufzeit abrufbar.

*Was fehlt:*

- **Die Browser-Tests laufen nicht in der CI.** Der Workflow ruft nur
  `npm run test:coverage`. Die 29 Playwright-Workflows — also genau die
  Tests, die prüfen, ob die Anwendung im Browser überhaupt startet — sind ein
  rein lokales Gate. Ein Fehler, der nur im Browser auftritt, kommt durch die
  CI durch.
- **Der Tauri-Build läuft nicht in der CI.** Ob die Desktop-Anwendung baut,
  merkt man erst beim manuellen Release.
- Keine Release-Automatisierung, keine Versionstags erkennbar (`package.json`
  steht seit Beginn auf `1.0.0`), kein signiertes Installationspaket.

📊 **Note: 75 %**

---

## A.8 Repository-Hygiene — 50 %

🟢 **Klartext:** Ist das Projektverzeichnis aufgeräumt, oder liegen dort
Datenmüll, alte Protokolle und riesige Dateien herum, die dort nicht
hingehören?

🔧 **Befund:**

- **`RuheStandSuite.exe` (18 MB) ist versioniert** — obwohl `*.exe` in
  `.gitignore` steht. Die Datei wurde offenbar vor der Ignore-Regel
  aufgenommen und nie entfernt.
- **19 Dateien aus `node_modules/` sind versioniert**, darunter eine
  16-MB-Binärdatei (`cli.win32-x64-msvc.node`) — obwohl `node_modules/`
  ebenfalls in `.gitignore` steht.
- Das `.git`-Verzeichnis ist dadurch **295 MB** groß. Jeder Klon zieht diese
  Historie mit.
- Im Wurzelverzeichnis liegen `debug.log` (212 KB), `test_output.log` (76 KB),
  `test_output_all.log` (80 KB), `test_output.txt` (32 KB).
- Ebenfalls im Wurzelverzeichnis: `.tmp/`, `tmp/`, `scratch/`, `__pycache__/`,
  `.pytest_cache/`, `.agent/`, `.agents/`, `.antigravitycli/`, `.codex/`,
  `.orchestrator/`, `inbox/`, `outbox/`. Ein Teil ist ignoriert, aber die
  physische Unordnung bleibt.
- Eine LibreOffice-Sperrdatei (`.~lock.WISSENSCHAFTLICHER_RAHMEN.md#`) liegt
  offen in `docs/reference/`.

📊 **Note: 50 %** — funktional folgenlos, aber der einzige Bereich, in dem
das Projekt seine eigenen Regeln nicht einhält.

---

## Zwischennote Teil A

| Dimension | Gewicht | Note | Beitrag |
|---|---:|---:|---:|
| A.1 Architektur und Modularisierung | 15 % | 88 | 13,2 |
| A.2 Tests und Testinfrastruktur | 20 % | 85 | 17,0 |
| A.3 Dokumentation | 20 % | 86 | 17,2 |
| A.4 Code-Qualität und Werkzeugkette | 12 % | 62 | 7,4 |
| A.5 Datenpipeline und Reproduzierbarkeit | 13 % | 95 | 12,4 |
| A.6 Fehlerbehandlung und Robustheit | 10 % | 90 | 9,0 |
| A.7 CI und Release | 7 % | 75 | 5,3 |
| A.8 Repository-Hygiene | 3 % | 50 | 1,5 |
| **Summe Teil A** | **100 %** | | **83,0 %** |

---

# TEIL B — Fachliche Eignung und Umsetzung (50 % der Gesamtnote)

## B.1 Planungsfähigkeit — Was kann man vorab durchrechnen? — 82 %

🟢 **Klartext:** Bevor man in Rente geht, will man wissen: Reicht mein Geld?
Was passiert bei einem Börsencrash im ersten Jahr? Was, wenn ich pflegebedürftig
werde? Was, wenn ich 100 werde? Diese Dimension bewertet, wie gut die Suite
solche Fragen beantwortet.

🔧 **Befund:**

*Was die Suite kann — und zwar tiefer als die meisten Marktprodukte:*

| Fähigkeit | Umsetzung |
|---|---|
| **Zufallssimulation** | 4 Verfahren: unabhängige Ziehung, Regime-Markov-Kette, fester Block-Bootstrap, Stationary Bootstrap mit variabler Blocklänge |
| **Historische Datenbasis** | 1925–2025, sechs Reihen, mit ausgewiesenen Qualitätssegmenten |
| **Historischer Backtest** | deterministischer Durchlauf über echte Jahresfolgen, optional als rollierende Kohorten |
| **Stresstests** | Presets (u. a. rekonstruierte Fenster 1929–33, 1939–45) plus optionales synthetisches Tail-Risk-Overlay mit Doppelpessimismus-Schutz |
| **Pflegefall** | Pflegegrade 1–5, altersabhängiger Eintritt, Progression, Dauer, Mortalitätsmultiplikator, Dual-Care für Paare, getrennte KPIs für Person 1 und 2 |
| **Sterblichkeit** | Destatis-Sterbetafeln 2023/2025, Alter 18–100 reproduzierbar aus der amtlichen Quelle |
| **Paare** | zwei Depots, zwei Renten, Witwen-/Witwerleistung mit Mindestehezeit, gemeinsame Guardrails, getrennte Steuerattribution |
| **Ansparphase** | optional vor Renteneintritt, mit Sparrate und automatischem Übergang |
| **Entnahmestrategie** | Floor/Flex mit Guardrails, Alarmeskalation, Mindest-Flex, optional Dynamic Flex (VPW) mit CAPE-basierter Renditeerwartung |
| **Parametersuche** | Sweep über 7 Dimensionen; Auto-Optimize mit Latin-Hypercube-Sampling, Quick-Filter, Refinement und Bestätigungsseeds |
| **Reproduzierbarkeit** | vollständiger Exportvertrag mit Request, Ergebnis, Seeds, Datenhashes und Fingerabdruck |

Diese Kombination ist in dem Umfang tatsächlich ungewöhnlich. Insbesondere die
Verbindung von deutscher Kapitalertragsteuer auf Tranchenebene mit
Pflegegradmodellierung und Paarlogik ist im eigenen Marktvergleich bei keinem
der zehn untersuchten Produkte in einer Stufe gefunden worden.

*Was fehlt — und zwar spürbar:*

- **Keine frei definierbare Ereignis- und Zahlungsreihe** (GAP-MKT-02). Man
  kann kein „neues Auto in Jahr 4: 35.000 €", kein „Dachsanierung in Jahr 7",
  keine „Schenkung an die Kinder in Jahr 10" und keinen selbst definierten
  Rendite- oder Inflationspfad eingeben. Für eine reale Ruhestandsplanung ist
  das eine gewichtige Lücke: Einmalausgaben sind kein Sonderfall, sondern der
  Normalfall. ProjectionLab kann das, und die Dokumentation erkennt diesen
  Wettbewerbsvorteil ausdrücklich an.
- **Kein Szenariomanagement** (GAP-MKT-04). Man kann nicht „Plan A: Rente mit
  63" und „Plan B: Rente mit 67" nebeneinander speichern und vergleichen.
  Sweep und Backtest sind kein Ersatz dafür — sie variieren Strategieparameter,
  nicht Lebensentwürfe.
- **Kein deterministischer Pflegefall** (GAP-MKT-03). Man kann nicht sagen
  „nimm an, ich werde mit 82 Pflegegrad 3" und den Plan darauf prüfen. Pflege
  ist ausschließlich stochastisch.
- **Höchstens zwei Personen** in der Demografie (D-16). Finanzwerte
  mehrerer Profile lassen sich aggregieren, Lebensereignisse nicht.

📊 **Note: 82 %** — methodisch tief und breit, mit einer klaren Lücke bei
Einmalereignissen und Planvergleichen.

---

## B.2 Durchführungsfähigkeit — Was hilft im laufenden Ruhestand? — 72 %

🟢 **Klartext:** Planung ist das eine. Aber jedes Jahr muss man tatsächlich
entscheiden: Wie viel darf ich dieses Jahr ausgeben? Was muss ich verkaufen?
Wie viel Steuer fällt an? Diese Dimension ist der eigentliche
Unterscheidungspunkt der Suite gegenüber reinen Rechnern.

🔧 **Befund:**

*Was die Balance-App leistet:*

- **Ein geschlossener Jahresprozess:** Vorprüfung → Speicherung erzwingen →
  verifizierter Sicherungspunkt → Alter, Inflation (ECB/World Bank/OECD),
  ETF-Kurs (letzter Handelstag 27.–31.12.), CAPE, Bedarf und Ausgabenjahr
  fortschreiben → idempotenter Commit. Wenn irgendein Schritt scheitert,
  bleibt der Sicherungspunkt bestehen und der Zeitraum ist sichtbar
  unvollständig.
- **Ein konkreter, prüfbarer Handlungsvorschlag:** nicht „verkaufe ca.
  40.000 €", sondern Quellen (welche Tranche), Verwendungen, Brutto, Steuer,
  Netto — vorab gegen `types/planned-action-contract.js` validiert
  (Lot-Kapazität, Cost Basis, Teilfreistellung, Steuerfreiheit) und danach
  gegen `settleTaxYear()` abgeglichen.
- **Diagnose mit Entscheidungsbaum**, Guardrail-Status, Kennzahlen und
  Kopiertext.
- **Tranchenmanager** mit steuerorientierter Verkaufsreihenfolge,
  Kursaktualisierung (EUR-only, max. 7 Tage alt) und einem schreibfreien
  Vorschau-Schritt vor dem bestätigten, idempotenten Realbestandsabgleich.
- **Monatlicher Ausgaben-Check** mit CSV-Import, Budgetkontrolle,
  Top-3-Kategorien, Jahreshochrechnung ab zwei Datenmonaten und Jahreshistorie.
- **Komplett-Backup und -Import** plus internes Snapshot-Archiv.

Das ist deutlich mehr als ein Rechner. Es ist ein operatives Jahresverfahren.

*Wo es im Betrieb hakt:*

1. **D-15 — Der Verkaufserlös verschwindet.** Der bestätigte Realbestandsabgleich
   entfernt die verkauften Stücke und protokolliert Nettoerlös und Gebühr,
   **erhöht aber nicht automatisch die freie Liquidität.** Die Dokumentation
   sagt: „bis zu einer Accounting-Entscheidung muss verbleibender Cash separat
   in den Rahmendaten nachgeführt werden." Das ist eine manuelle Nachbuchung
   mitten im wichtigsten Arbeitsablauf des Produkts — genau dort, wo ein
   vergessener Schritt die Bilanz des Folgejahres verfälscht. Der Punkt ist
   seit Slice 15 als offen markiert.

2. **Keine Krankenversicherung, keine Rentenbesteuerung.** Ich habe den Code
   durchsucht: es gibt keinerlei Modellierung von KV-/PV-Beiträgen, keinen
   Grundfreibetrag, keine Steuerprogression, keinen Besteuerungsanteil nach
   Renteneintrittsjahr. Person 1 wird sogar **ganz ohne pauschalen Steuerabzug**
   in den Haushaltszufluss übernommen; nur Person 2 hat ein Feld
   `steuerquotePct`. Für einen deutschen Ruheständler mit Betriebsrente sind
   KV/PV-Beiträge (rund 20 % auf die Betriebsrente) und die Einkommensteuer auf
   die Rente reale, große und jährlich veränderliche Zahlungsströme. Der Nutzer
   muss sie vollständig selbst vorab herausrechnen und über Jahrzehnte
   konsistent halten. Das ist die größte praktische Fehlerquelle im
   Jahresbetrieb — die Dokumentation weist es korrekt aus (MR-05, GAP-MKT-01),
   aber Ausweisen beseitigt die Belastung nicht.

3. **Keine Gebühren, Spreads oder laufenden Produktkosten** als Cashflows
   (MR-03). Ein Verkaufsvorschlag über 40.000 € bringt real weniger als
   40.000 € aufs Konto. Über 30 Jahre summiert sich eine nicht modellierte
   TER von 0,2 % zu einem erheblichen Betrag. Nur der bestätigte Abgleich
   erfasst tatsächlich eingegebene Ausführungsgebühren — nachträglich.

4. **Alles läuft über CSV und manuelle Eingabe.** Keine Bank-, Broker- oder
   Rentenkontenanbindung (GAP-MKT-07). Der jährliche Pflegeaufwand ist real.

5. **Kein Immobilienbezug.** Wohneigentum ist in deutschen Haushalten über 60
   häufig der größte Vermögensposten und in Liquiditätsengpässen eine
   theoretische Reserve. Die Suite kennt es nicht — bewusst und dokumentiert,
   aber die Planungslücke bleibt.

📊 **Note: 72 %** — der operative Jahresprozess ist konzeptionell und technisch
stark gebaut, hat aber mit D-15 eine offene Bruchstelle und verlangt dem Nutzer
die gesamte Netto-Rechnung (Steuer, KV/PV, Kosten) außerhalb des Werkzeugs ab.

---

## B.3 Fachliche Modellqualität und Validierung — 70 %

🟢 **Klartext:** Rechnet das Modell fachlich richtig? Und weiß irgendjemand
außerhalb des Projekts, ob die Annahmen stimmen?

🔧 **Befund:**

*Was vorbildlich ist:*

Die intellektuelle Redlichkeit dieses Projekts ist bemerkenswert. Es behauptet
nirgends mehr, als es belegt hat:

- Die Floor-Deckungsquote wird ausdrücklich als „modellinterne Quote, keine
  Garantie" geführt, mit Wilson-95-%-Intervall und Unsicherheitswarnung unter
  1.000 Läufen.
- Terminale Ergebnisse werden disjunkt getrennt (`ruin`, `all_dead`,
  `horizon_exhausted`, `technical_error`); bei einem einzigen technischen
  Fehler wird die Quote fail-closed *nicht* ausgewiesen.
- Der historische Backtest wird durchgehend als **In-sample-Diagnose**
  bezeichnet — „weder Zukunftsvalidierung noch Erfolgswahrscheinlichkeit".
- Sweep-Rankings sind `experimental_point_estimate`; der Auto-Optimize-Champion
  ist „ein modellinterner Szenariokandidat, kein globales Optimum".
- Der Forschungsrahmen definiert acht Mindestbedingungen, bevor überhaupt
  „verbessert die Robustheit" geschrieben werden darf, und hat frühere
  konkrete Kitces-/Morningstar-Zahlen **aktiv entfernt**, weil der
  reproduzierbare Suite-Lauf dazu fehlte.

*Was substanziell dagegensteht:*

**1. Bestätigte, hoch priorisierte Exportvertragsfehler sind unrepariert.**

Die projekteigene adversariale Analyse vom 2026-08-04
(`MC_LAUF_ANALYSE_2026-08-04_DATENPRUEFUNG_ROBUSTHEIT.md`, Status: „Korrekturen
nicht umgesetzt, keine Freigabe erteilt") hat vier Befunde der Stufe „hoch"
bestätigt. **Ich habe zwei davon heute im Code nachgeprüft — sie sind noch da:**

| Finding | Nachprüfung 2026-08-06 | Wirkung |
|---|---|---|
| **F1** Heatmap-Bins | `monte-carlo-contracts.js:499` exportiert weiterhin `upperBoundPct`, obwohl `MC_HEATMAP_BINS[b]` die *untere* Grenze ist | Jeder externe Auswerter liest sämtliche Heatmap-Bins um eine Position verschoben. Der Fehler ist bereits real aufgetreten. Zusätzlich stehen 12 Bin-Einträge nur 11 Zählwerten gegenüber. |
| **F2** Einheitenbruch | `simulator-year-result.js:306-309` liefert `RealReturnEquityPct`/`NominalReturnEquityPct` weiterhin als Bruchteil (−0,35), während `inflation`, `QuoteEndPct`, `RunwayCoveragePct` Prozentpunkte führen und `unitContract.percentages` ausdrücklich `percentage-points` festlegt | Faktor 100 bei jeder Weiterverarbeitung. Gleiche Konstruktion in `simulator-accumulation-year.js:192-193`. |
| **F3** zwei Entnahmequoten | `entnahmequote` (Basis der KPI „Zeitanteil Quote > 4,5 %") und `QuoteEndPct` (Basis der Guardrail-Steuerung) haben unterschiedliche Nenner und Messzeitpunkte, ohne dass der Export die Bezugsbasis nennt | Die berichtete KPI misst systematisch etwas anderes als das, womit das System steuert. |
| **F4** `zeroPolicy` verletzt | Der Export deklariert „unavailable-values-are-null-with-reason", liefert aber `depotExhaustionAgeYears.p50 = 0` ohne Beobachtung und Stress-Nullwerte bei `preset: NONE` | Nicht beobachtete Werte erscheinen als beobachtete Nullen. |

Für die manuelle Interpretation eines einzelnen Laufs sind die Rohwerte
weiterhin nutzbar. Für jede maschinelle oder externe Auswertung des
Exportvertrags sind das echte Blocker.

**2. Ein toter Parameter in der aktiven Entnahmelogik.**

`engine/planners/flex-rate-policy.mjs:67` berechnet die Alarmstärke als
`Math.min(10, Math.round(10 + 20 * shortfallRatio))`. Für jede nicht negative
Unterdeckungsquote ergibt das **konstant 10**. Die Formel suggeriert eine
Abstufung, die es nicht gibt. Als D-11 dokumentiert und offen — aber sie läuft
produktiv mit.

**3. Die Glättung kann die Guardrails im entscheidenden Moment überstimmen.**

Die Policy-Reihenfolge lautet `alarm → guardrails → minimum_flex →
flex_budget → final_smoothing`. Im dokumentierten Worst-Case-Lauf (Aktien
−34,76 % im ersten Jahr) signalisierte der Guardrail 12.144 €, ausgezahlt
wurden nach Mindest-Flex und Glättung **57.600 € — das 4,4-Fache.** Im zweiten
Crashjahr (erneut −35 %) folgten 52.800 €. Das erzeugt genau das
Sequence-of-Returns-Risiko, das die Strategie eindämmen soll. Als bewusste
Produktentscheidung dokumentiert und zur Klärung vorgemerkt — der Sollentscheid
steht aus.

**4. Der Liquiditätspuffer versagt im langen Krisenpfad.**

Im geprüften Worst-Case fiel die Liquidität ab Jahr 13 auf null und blieb es
bis Jahr 21 — neun Jahre in Folge. Der Zielwert von 60 Monaten blieb dabei
unverändert und wurde nie abgesenkt, obwohl er zwölf Jahre unerreichbar war.
Ab Jahr 13 wird jedes Jahr zwangsweise verkauft — exakt der Zustand, den ein
Fünfjahrespuffer verhindern soll.

**5. Gold existiert im Worst-Case nicht.**

Bei Zielquote 6,89 % und Startbestand 0 bleibt Gold im sofortigen Bärenpfad
über alle 24 Jahre bei 0. Die Diversifikation fehlt in genau dem Szenario,
für das sie gedacht ist. Eine bloße Zielquote garantiert den Schutz nicht.

**6. Die wichtigste Eingangsgröße ist nicht extern validiert.**

`global_equity_research_index` ist **kein Anbieterindex** und wurde nie
jahresgenau gegen einen kapitalgewichteten Weltindex geprüft (MR-02). Jede
Aussage der Suite hängt an dieser Reihe. Sie ist perfekt reproduzierbar —
das beweist, dass die Zahlen konsistent erzeugt wurden, nicht dass sie richtig
sind.

**7. Steuerliche Vereinfachungen.**

Die Kirchensteuerformel `25 % × (1 + Soli + KiSt)` weicht von § 32d Abs. 1 EStG
ab (bei 9 %: 28,625 % statt rund 27,995 %). Die Richtung ist konservativ, der
Betrag klein — aber es ist ein bekannter Rechtsabweichungspunkt, offen als D-10.
Zusätzlich erzeugen negative Zinsen im Modell eine sofortige Steuergutschrift
(F7), was steuerlich nicht zutrifft.

**8. Keine einzige externe Validierung.**

Alle V4-/V5-Prüfungen sind offen (GAP-MKT-08). Kein Mechanismus der Suite
wurde je unabhängig fachlich geprüft oder repliziert. Das ist ehrlich
dokumentiert — ändert aber nichts daran, dass die fachliche Absicherung
vollständig auf Selbstprüfung beruht.

📊 **Note: 70 %** — die Selbstkritik ist vorbildlich, aber Ehrlichkeit über
unvalidierte Modelle ersetzt keine Validierung. Vier bestätigte
Hoch-Priorität-Befunde sind unrepariert, ein Parameter der Live-Engine ist
mathematisch wirkungslos, und die zentrale Renditereihe hat keine externe
Benchmark.

---

## B.4 Verständlichkeit und Ergebnisinterpretation — 65 %

🟢 **Klartext:** Kann ein normal gebildeter Mensch die Ergebnisse richtig
lesen — oder verleitet die Darstellung zu falschen Schlüssen?

🔧 **Befund:**

*Was hilft:*

- Die verbindliche Lesereihenfolge und das Ergebnisregister mit
  „nicht daraus ableiten"-Spalte sind exzellente Leitplanken.
- Gedankenstriche statt Nullen bei fehlender Beobachtung in der Oberfläche.
- Sieben geführte Touren, Handbuch mit FAQ und Glossar, Onboarding-Playbook,
  Tastenkürzel, Tooltips.
- Stabile Fehlercodes mit Ursache und nächstem Schritt statt Stacktraces.

*Was dagegen wirkt:*

1. **Die Anzeigerundung verschiebt die wichtigste Sicherheitskennzahl nach
   oben.** Die „Reale Depotentnahme P10" — die Zahl, an der man abliest,
   wie schmal es im schlechten Fall wird — steht im Export bei **13.331 €**
   und in der Oberfläche bei **15.000 €**. Das sind **+12,5 % in die
   optimistische Richtung** bei einer Downside-Kennzahl. Die Rundungsstufe
   ist größenordnungsabhängig und nirgends offengelegt. Die
   Verlustvortrag-Steuerersparnis von 331 € erscheint als 0 €. Als
   „Anti-Pseudo-Accuracy" im Code begründet — aber bei Sicherheitskennzahlen
   muss konservativ abgerundet werden, nicht kaufmännisch gerundet.

2. **Die Pflege-Vergleichskachel lädt zur kausalen Fehllesung ein.** Läufe
   *mit* Pflegefall enden im Median **reicher** (12,5 Mio. € gegen 7,9 Mio. €),
   weil ohne Pflegefall überwiegend früh Verstorbene übrig bleiben
   (Immortal-Time-Bias). Der Export deklariert das korrekt als
   `unpaired_group_median_difference` — die Oberflächenkachel
   „Gruppenmedian-Differenz −4.575.000 €" tut es nicht. Die Kennzahl hat
   keinen Entscheidungswert.

3. **Begriffsdichte am Rand des Zumutbaren.** Rund um den Liquiditätspuffer
   existieren parallel: `liquidityRunwayYears`, `minCashBufferMonths`,
   `hardMinimumMonths`, `dynamicFlexSafetyRunwayBasis`, `RunwayCoveragePct`,
   `RunwayCoveragePostPayoutEndOfYearPct`, `runway_post_payout_end_of_year_months`
   und `RunwayMeasurementPhase`. Jeder einzelne Begriff ist sauber definiert.
   Zusammen sind es acht Konzepte für eine Frage, die der Nutzer als „wie
   lange reicht mein Bargeld?" stellt. Der erklärende README-Absatz ist rund
   400 Wörter lang.

4. **Der maximale Drawdown ist nominal, die Sicherheitskennzahl real.** Die
   UI beschreibt „größter Verlust von Peak zu Tief im Depot", ohne die
   Nominalbasis zu nennen. Im geprüften P10-Lauf: 34,83 % nominal gegen
   **52,84 % real**. Für eine Ruhestandsstrategie ist der reale Wert der
   entscheidende — und der wird nicht danebengestellt (C1).

5. **Die 4,5-%-Entnahmequoten-KPI** benutzt einen anderen Nenner als die
   Guardrail-Steuerung, ohne dass das sichtbar ist (F3).

6. **Keine formale Barrierefreiheitsprüfung** (GAP-MKT-05). `index.html`
   enthält **null** `aria-`-Attribute oder `role`-Angaben; Simulator (27) und
   Balance (21) haben punktuelle Auszeichnungen ohne systematischen Ansatz.

7. **Die Eingabe `capeRatio` kann wirkungslos sein**, ohne dass die Oberfläche
   das anzeigt (F6). Ein Feld, das aussieht, als steuere es etwas, tut es
   in bestimmten Konfigurationen nicht.

📊 **Note: 65 %** — die konzeptionellen Leitplanken sind hervorragend, aber
zwischen dem, was die Dokumentation sauber trennt, und dem, was der Bildschirm
zeigt, klafft eine Lücke. Bei der Downside-Kennzahl wirkt sie in die
gefährliche Richtung.

---

## B.5 Abdeckung der deutschen Ruhestandsrealität — 62 %

🟢 **Klartext:** Passt das Werkzeug auf die Lebenslage eines typischen
deutschen Haushalts kurz vor oder in der Rente?

🔧 **Befund:**

*Was spezifisch deutsch und gut getroffen ist:*

- Kapitalertragsteuer auf Tranchenebene mit Cost Basis, Teilfreistellung,
  Sparerpauschbetrag, Solidaritätszuschlag, Kirchensteuer und
  jahresübergreifendem Verlustvortrag
- Deutsche Verbraucherpreis-, Lohn- und Geldmarktreihen aus amtlichen Quellen
- Destatis-Sterbetafeln, Pflegegrade 1–5, Pflegekostenstaffeln
  (ambulant/stationär) mit Regionalzuschlag
- Hinterbliebenenleistung mit Mindestehezeit
- Rentenindexierung wahlweise fix, lohn- oder inflationsgekoppelt
- Der Pflegebucket als zweckgebundene, algorithmisch gesperrte Reserve —
  ein Konzept, das die deutsche Pflegerealität ernst nimmt

*Was fehlt:*

| Bereich | Status | Praktische Bedeutung |
|---|---|---|
| **Einkommensteuer auf Renten** | nicht modelliert | Besteuerungsanteil nach Kohorte, Grundfreibetrag, Progression — für die meisten Ruheständler ein vier- bis fünfstelliger Jahresbetrag |
| **KV-/PV-Beiträge** | nicht modelliert (kein Codetreffer) | auf Betriebsrenten rund 20 %; auf gesetzliche Rente ca. 8,5–11 % |
| **Immobilien** | nicht modelliert | in Haushalten 60+ häufig der größte Vermögensposten; Mieteinnahmen, Instandhaltung, Verkauf als Liquiditätsquelle fehlen alle |
| **Riester / Rürup / Betriebsrente** | keine eigene Logik | nur als generischer „Rentenstrom" abbildbar; Auszahlungsphasen, Kapitalwahlrecht, Förderrückzahlung fehlen |
| **Erbschaft / Schenkung** | nicht modelliert | weder Zufluss noch Abfluss, keine Erbschaftsteuer, keine Nachlassplanung |
| **Einmalausgaben** | nicht modelliert | siehe B.1 |
| **Rentenkontenaggregation** | nicht vorhanden | Digitale Rentenübersicht kann das; hier alles manuell |
| **Fremdwährung** | bewusst ausgeschlossen | Nicht-EUR-Kurse werden abgewiesen |

Sämtliche Punkte sind in der Dokumentation als Nicht-Ziel oder Modellgrenze
ausgewiesen. Das ist redlich — aber eine Scope-Entscheidung bleibt für die
Frage „taugt das Werkzeug für meinen Ruhestand?" trotzdem relevant. Der Nutzer
muss die gesamte Netto-Rechnung außerhalb der Suite führen und ihr nur noch
das Ergebnis eingeben. Jeder Fehler dabei schlägt ungebremst auf alle
Simulationen durch (MR-12).

📊 **Note: 62 %** — dort, wo die Suite deutsch ist, ist sie es gründlich. Aber
sie deckt die Vermögens- und Zahlungsstromseite eines typischen deutschen
Ruhestandshaushalts nur teilweise ab.

---

## Zwischennote Teil B

| Dimension | Gewicht | Note | Beitrag |
|---|---:|---:|---:|
| B.1 Planungsfähigkeit | 25 % | 82 | 20,5 |
| B.2 Durchführungsfähigkeit im Ruhestand | 25 % | 72 | 18,0 |
| B.3 Fachliche Modellqualität und Validierung | 22 % | 70 | 15,4 |
| B.4 Verständlichkeit und Ergebnisinterpretation | 15 % | 65 | 9,8 |
| B.5 Abdeckung der deutschen Ruhestandsrealität | 13 % | 62 | 8,1 |
| **Summe Teil B** | **100 %** | | **71,7 %** |

---

# GESAMTNOTE

| Teil | Gewicht | Note |
|---|---:|---:|
| **A — Technik, Dokumentation, Tests** | 50 % | **83 %** |
| **B — Fachliche Eignung und Umsetzung** | 50 % | **72 %** |
| | | |
| **Gesamtnote** | **100 %** | **77,5 % ≈ 78 %** |

### Einordnung der Gesamtnote

**78 % bedeutet:** Ein für ein Einzelprojekt außergewöhnlich gut gebautes,
außergewöhnlich ehrlich dokumentiertes Werkzeug, das in seinem definierten
Ausschnitt fachlich tiefer geht als praktisch alles Vergleichbare im
deutschsprachigen Raum — und das gleichzeitig mehrere konkrete, benannte
und noch nicht behobene Defekte mitführt sowie einen Ausschnitt gewählt hat,
der wesentliche Teile der realen deutschen Ruhestandsfinanzierung außen vor
lässt.

**Die Note ist kein Durchschnitt aus „gut" und „mittelmäßig".** Sie
entsteht aus einer klaren Asymmetrie: Die *Bauqualität* ist sehr hoch
(83 %). Die *Eignung als Entscheidungsgrundlage* ist deutlich niedriger
(72 %) — nicht weil schlecht gearbeitet wurde, sondern weil zwischen
„technisch korrekt implementiert" und „fachlich validiert" ein Schritt liegt,
den das Projekt selbst als offen ausweist und noch nicht gegangen ist.

---

# Die zehn wichtigsten Schwachstellen, priorisiert

| # | Schwachstelle | Wirkung | Aufwand |
|---|---|---|---|
| 1 | **F1/F2 Exportvertragsfehler unrepariert** — Heatmap-Bins invertiert benannt, Renditefelder mit `Pct`-Suffix enthalten Bruchteile | Jede maschinelle Auswertung des MC-Exports zieht falsche Schlüsse. Bereits real eingetreten. | klein (Vertrag versionieren) |
| 2 | **F5 Anzeigerundung bei der Downside-KPI** — reale Depotentnahme P10 wird von 13.331 € auf 15.000 € aufgerundet | +12,5 % zu optimistisch bei der sicherheitskritischsten Zahl | klein |
| 3 | **D-15 Verkaufserlös wird nicht in freie Liquidität gebucht** | Manuelle Nachbuchung mitten im Kernworkflow; vergisst der Nutzer sie, ist die Folgejahresbilanz falsch | mittel (Accounting-Entscheidung nötig) |
| 4 | **Keine KV-/PV- und Rentensteuerlogik** | Der Nutzer muss die größten laufenden Abzüge über Jahrzehnte selbst konsistent netto rechnen | groß |
| 5 | **D-11 Alarmstärke ist mathematisch konstant 10** | Ein Parameter der Live-Engine suggeriert eine Abstufung, die es nicht gibt | klein |
| 6 | **Keine Linter-/Typprüfung bei 69k Zeilen Finanz-JavaScript** | Feldnamen-Tippfehler werden zu stillen `undefined`-Werten | mittel (einmalige Einführung) |
| 7 | **Glättung überstimmt Guardrails im ersten Crashjahr** (4,4-fache Auszahlung gegenüber Guardrail-Signal) | Erzeugt das Sequence-of-Returns-Risiko, das die Strategie verhindern soll | Sollentscheid, dann mittel |
| 8 | **Browser- und Tauri-Gates laufen nicht in der CI** | Ein Fehler, der nur im Browser auftritt, passiert die automatische Prüfung | klein |
| 9 | **Keine frei definierbaren Einmalereignisse und kein Planvergleich** | Einmalausgaben und „Rente mit 63 vs. 67" sind nicht abbildbar | groß |
| 10 | **Nominaler vs. realer Drawdown nicht getrennt ausgewiesen** (34,8 % vs. 52,8 % im selben Lauf) | Die für Ruheständler entscheidende Größe fehlt neben der weniger relevanten | klein |

---

# Was dieses Projekt außergewöhnlich gut macht

Diese Punkte stehen bewusst *nach* der Findingdokumentation:

1. **Die Datenpipeline.** Sieben historische Reihen, aus Originalquellen
   reproduzierbar erzeugt, mit koordinatenbasierter PDF-Verifikation,
   SHA-256-Fingerabdrücken und unabhängigen Orakeltests. Das ist
   wissenschaftliches Arbeiten, nicht Anwendungsentwicklung.

2. **Die Selbstkritik als Institution.** Ein Modellrisikoregister, ein
   Produktmängelregister, ein Register offener Fachentscheidungen, eine
   Ergebnistabelle mit einer Spalte „was daraus nicht abgeleitet werden darf",
   sechs Validierungsstufen mit durchgehend ehrlichem „extern validiert: nein".
   Und eine adversariale Analyse des eigenen produktiven Laufs, die zum
   Ergebnis „blockiert — nicht geeignet als Entscheidungsgrundlage in der
   vorliegenden Form" kommt. Sehr wenige Projekte tun das.

3. **Null Laufzeit-Abhängigkeiten.** Ein Finanzwerkzeug, das in zehn Jahren
   noch startet, weil es von niemandem abhängt.

4. **Das Fail-closed-Prinzip durchgezogen.** Recovery-Snapshot vor Mutation,
   idempotente Perioden-Commits, korrupte Daten sperren statt zu löschen,
   Export blockiert bei unsauberem Quellbaum. Das ist die richtige Haltung für
   Software, die über Lebensersparnisse entscheidet.

5. **Der Worker-Paritätstest.** Der Nachweis, dass parallele und serielle
   Rechnung bei gleichem Seed identisch sind, über 584 Assertions inklusive
   aller neuen Stochastikmodule.

---

# Pre-Mortem

> *Angenommen, diese Suite verursacht in drei Monaten einen Fehler mit realer
> finanzieller Wirkung — was ist die wahrscheinlichste Ursache?*

**Rangfolge der wahrscheinlichsten Ursachen:**

1. **Eine Netto-/Brutto-Verwechslung bei Rente, KV/PV oder Steuer.** Weil die
   Suite diese Größen nicht rechnet, muss der Nutzer sie einmal jährlich
   selbst ermitteln und über Jahrzehnte konsistent halten. A-03 und MR-12
   benennen dieses Risiko. Es ist kein Softwarefehler — aber es ist der
   wahrscheinlichste Weg zu einem falschen Plan, und die Software tut nichts,
   um ihn zu verhindern.

2. **Ein vergessener Cash-Nachtrag nach dem Realbestandsabgleich (D-15).** Der
   Nutzer verkauft real, bestätigt den Abgleich, die Stücke verschwinden — und
   der Erlös taucht in der freien Liquidität nicht auf. Wird er nicht manuell
   in den Rahmendaten nachgeführt, plant das Folgejahr mit zu wenig Bargeld
   und löst unnötige Verkäufe aus.

3. **Eine Fehlinterpretation der Downside-Kennzahl.** Die Oberfläche zeigt
   15.000 € reale Depotentnahme, der Export 13.331 €. Wer den Plan an der
   Bildschirmzahl misst, plant 12,5 % zu großzügig — an genau der Stelle, an
   der Sicherheitspuffer entstehen sollen.

4. **Eine externe Auswertung mit falschen Einheiten (F1/F2).** Wer den
   MC-Export in eine Tabellenkalkulation zieht, liest Heatmap-Bins um eine
   Position verschoben und multipliziert Renditen mit 100.

5. **Die Freigabe einer Strategie auf Basis von „0 % Ruin".** Die eigene
   Analyse hat gezeigt, dass diese Aussage im geprüften Lauf primär aus
   Rentenannahmen und Sampling-Konfiguration folgt, nicht aus der Strategie —
   und dass sie unter Uniform-Sampling, späterem Rentenbeginn und aktivem
   Tail-Risk nicht nachgewiesen ist. Die empfohlenen Gegenläufe wurden nicht
   dokumentiert.

**Was am wenigsten wahrscheinlich ist:** ein Rechenfehler in der Engine. Die
Testabdeckung dort liegt bei 90,8 %, die Bilanzketten schließen im geprüften
Export in allen Jahren, und die Worker-Parität ist nachgewiesen. Das
Restrisiko liegt fast vollständig an den Rändern: bei den Eingaben, bei der
Darstellung und bei den Modellannahmen — nicht in der Rechnung selbst.

---

# Review-Ergebnis

- **Status:** freigegeben **mit Auflagen** — geeignet als persönliches
  Planungs- und Analysewerkzeug unter Beachtung der dokumentierten Grenzen;
  **nicht freigegeben** für maschinelle oder externe Auswertung der
  Monte-Carlo-Exporte und nicht als alleinige Entscheidungsgrundlage.

- **Blocker:**
  1. F1 — Heatmap-Bin-Semantik im Exportvertrag falsch benannt (im Code
     verifiziert am 2026-08-06, unrepariert)
  2. F2 — Einheitenbruch der Renditefelder (`Pct`-Suffix bei Bruchteilwerten;
     im Code verifiziert am 2026-08-06, unrepariert)
  3. F3 — zwei ununterscheidbare Entnahmequoten-Definitionen ohne
     Bezugsbasisangabe im Export
  4. F4 — deklarierte `zeroPolicy` wird im eigenen Export verletzt

- **Restrisiken:**
  - F5 — Anzeigerundung überzeichnet die reale Depotentnahme P10 um 12,5 %
    in die optimistische Richtung
  - D-15 — Verkaufserlös wird nicht automatisch in freie Liquidität gebucht;
    manuelle Nachführung mitten im Kernworkflow
  - D-11 — Alarmstärke ist mathematisch konstant 10 und läuft produktiv mit
  - MR-02 — die zentrale Renditereihe ist reproduzierbar, aber nicht extern
    validiert; alle V4-/V5-Prüfungen offen
  - R5 — Mindest-Flex und finale Glättung können Guardrail-Kürzungen im
    ersten Crashjahr überstimmen (Sollentscheid ausstehend)
  - C1 — nominaler und realer Drawdown werden nicht getrennt ausgewiesen
  - Fehlende KV-/PV- und Rentensteuerlogik verlagert die größte laufende
    Rechenlast auf den Nutzer
  - Keine Linter-/Typprüfung bei 69.160 Zeilen finanzrechnendem JavaScript
  - Browser- und Tauri-Gates laufen nicht in der CI
  - Dokumentationsdrift: Testdateizahl im Architekturdokument 40 % zu niedrig

- **Pre-Mortem:** siehe Abschnitt oben. Wahrscheinlichste Ursache eines
  realen Schadens in drei Monaten ist **nicht** ein Rechenfehler der Engine,
  sondern eine Netto-/Brutto-Verwechslung bei Rente, Krankenversicherung oder
  Steuer an der Eingabegrenze — gefolgt von einem vergessenen Cash-Nachtrag
  nach dem Realbestandsabgleich (D-15).

---

*Erstellt am 2026-08-06 durch Claude als Reviewer/Analyst. Alle Testzahlen,
Coverage-Werte und Code-Verifikationen stammen aus eigenen Läufen desselben
Tages gegen Commit `27b9264` zuzüglich unversionierter Arbeitskopie. Diese
Bewertung ist keine Anlage-, Steuer- oder Rechtsberatung.*
