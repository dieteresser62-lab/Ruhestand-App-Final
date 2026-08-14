# Überarbeitung des Benutzerhandbuchs: Arbeitsplan

**Stand:** 2026-08-13

**Status:** Planentwurf; Review, nutzerseitige Freigabe und Umsetzung stehen aus

**Autor:** Codex (Implementer; keine Eigenfreigabe)

**Feature-Branch:** `codex/handbuch-ueberarbeitung`

**Arbeitsplan:** `docs/internal/handbuch.md`
**Späterer Umsetzungspfad:** `Handbuch.html`

## 1. Ziel

`Handbuch.html` wird zu einer vollständigen, korrekten und gut lesbaren
Nutzerreferenz für den aktuellen Stand der Ruhestand-Suite überarbeitet. Das
Handbuch soll einen Nutzer von Start und Datensicherung über Balance-,
Simulator-, Profilverbund- und Tranchenabläufe bis zur vorsichtigen Deutung der
Ergebnisse führen. Sichtbare Bezeichnungen, Bedienfolgen und fachliche
Aussagegrenzen müssen dem tatsächlich ausgelieferten Verhalten entsprechen.

Die Überarbeitung soll insbesondere:

- falsche oder veraltete Start-, Persistenz-, Backup- und Offline-Aussagen
  korrigieren;
- die aktuellen Balance- und Simulatorfunktionen entlang realer Nutzeraufgaben
  erklären, ohne eine Entwicklerreferenz zu duplizieren;
- Runway, Notfallpuffer, Floor/Flex, Dynamic Flex, Pflegebucket, Monte Carlo,
  Backtest, Sweep und Auto-Optimize begrifflich sauber voneinander abgrenzen;
- Profil- und Tranchenoperationen einschließlich Recovery, Realbestandsabgleich
  und manuellem Cashnachweis nachvollziehbar beschreiben;
- Ergebniskennzahlen, Unsicherheit, Missingness sowie Modell- und
  Beratungsgrenzen so formulieren, dass keine falsche Sicherheit entsteht;
- Ansparer- und Best-Practice-Inhalte auf tatsächlich vorhandene Funktionen
  begrenzen und allgemeine Orientierung, Beispiel und konkrete
  Handlungsanweisung klar voneinander trennen;
- Inhaltsverzeichnis, Tabs, Anker, FAQ und Glossar als konsistente
  Orientierungsschicht nutzbar machen;
- Wiederholungen reduzieren und lange technische Passagen in handlungsnahe,
  scanbare Abschnitte überführen.

## 2. Nicht-Scope

- Keine Änderung an Produktivlogik, Engine-Semantik, Datenverträgen, UI-Labels
  oder Persistenz.
- Keine Änderung an `README.md`, Referenzdokumenten, Guides, Quellmodulen,
  Stylesheets, Assets, generierten Artefakten, Tests oder Konfigurationen.
- Keine manuelle Änderung von `engine.js`, `dist/` oder
  `RuhestandSuite.exe`.
- Keine neuen Produktfunktionen und keine Korrektur eines im Handbuchabgleich
  entdeckten Produktfehlers. Ein solcher Befund wird dokumentiert und löst eine
  Stopbedingung aus.
- Keine fachliche Neuentscheidung zu Finanz-, Steuer-, Pflege-,
  Langlebigkeits- oder Optimierungsmodellen.
- Keine Zusage von Supportkanälen, Reaktionszeiten, Veröffentlichung,
  Plattformunterstützung oder externer Validierung, die nicht durch eine
  maßgebliche Repositoryquelle belegt ist.
- Keine Umgestaltung zu einer allgemeinen Entwicklerdokumentation. Interne
  Contractnamen werden nur genannt, wenn sie für Export, Diagnose oder
  Fehlersuche einen unmittelbaren Nutzwert haben.

## 3. Relevante Ist-Architektur

### 3.1 Nutzeroberflächen und Laufzeit

Die Suite besitzt fünf lokale Einstiegspunkte:

| Einstieg | Nutzerzweck |
| --- | --- |
| `index.html` | Startseite, Profilverwaltung, Handoff und Komplettbackup |
| `Balance.html` | Jahresabschluss, Liquiditäts- und Entnahmeplanung, Diagnose und Ausgaben-Check |
| `Simulator.html` | Monte Carlo, Backtest, Sweep, Auto-Optimize und Szenarioauswertung |
| `depot-tranchen-manager.html` | Profilbezogene Tranchenpflege, Quotes, Recovery und bestätigter Realbestandsabgleich |
| `Handbuch.html` | Browserbasiertes Benutzerhandbuch und Gegenstand dieser Überarbeitung |

Browser- und Desktopbetrieb teilen die Frontendmodule, unterscheiden sich aber
bei Start, Persistenz und Live-Datenzugriff. Wegen nativer ES-Module und Worker
wird die Browservariante über den lokalen HTTP-Start betrieben; die
Tauri-Variante lädt den synchronisierten `dist/`-Stand. Berechnungen und lokale
Eingaben sind grundsätzlich offline nutzbar, optionale Live-Abrufe nicht. Ein
bereits begonnener, periodengebundener Jahresabschluss darf bei einem
erforderlichen fehlgeschlagenen Datenschritt bewusst im Recovery-Zustand
bleiben.

### 3.2 Fachliche und technische Schichten

- `app/balance/` enthält die UI-nahe Balance-Logik einschließlich
  Jahresprozess, Diagnose, Ausgaben und Profilverbund.
- `app/simulator/` enthält Simulatorsteuerung, Monte-Carlo-Runner,
  Backtesting, Sweep, Auto-Optimize, Ergebnisaufbereitung und Dateninventar.
- `app/profile/` und `app/tranches/` besitzen Profil-, Persistenz-,
  Tranchen- und Reconcile-Verantwortung.
- `app/shared/` enthält unter anderem gemeinsame Persistenz-, Formatierungs-
  und CAPE-Hilfen.
- `engine/` ist die deterministische fachliche Kernlogik; `workers/` bildet
  parallele Rechenpfade ab.
- `Handbuch.html` ist eine eigenständige HTML-Seite mit Inline-Styles,
  Quickstart- und Handbuch-Tab, Inhaltsverzeichnis, Hash-Ankern, FAQ, Glossar
  und einer kleinen Inline-Navigation. Vorhandene SVG-Abbildungen werden nur
  referenziert; ihre Änderung ist nicht Teil dieses Plans.

### 3.3 Persistenz- und Sicherheitsgrenzen

- Im Browser ist IndexedDB die lokale Source of Truth; Tauri nutzt lokale
  Dateien im App-Datenverzeichnis.
- Das zentrale Komplettbackup auf der Startseite ist der vorgesehene
  Übertragungspfad zwischen Browser und Desktop. Jahresabschluss-Snapshots sind
  davon getrennte fachliche Sicherungspunkte.
- Tranchenempfehlungen sind schreibfrei. Ein realer Verkauf verändert den
  Bestand erst nach Vorschau und expliziter Bestätigung; Verkaufserlöse werden
  nicht automatisch als freie Liquidität gebucht. Cashabschluss und
  Korrekturen bleiben append-only nachvollziehbar.
- Monte-Carlo-, Szenario- und Backup-Exporte können persönliche Finanzannahmen
  enthalten und sind entsprechend als vertraulich zu behandeln.

### 3.4 Maßgebliche Lesebasis

Die spätere Handbuchänderung wird gegen folgende, nur lesend verwendete Quellen
abgeglichen:

| Quelle | Prüfschwerpunkt |
| --- | --- |
| `package.json` | Laufzeit- und Validierungskommandos |
| `start_suite.cmd`, `start_suite.ps1` | tatsächlicher lokaler Browserstart und optionale Proxy-Grenze |
| `README.md` | Produktumfang, Startpfade, Release- und Nutzerüberblick |
| `CHANGELOG.md` | zuletzt hinzugekommene oder geänderte Nutzerfunktionen |
| `QUICKSTART.md` | kurzer Einstieg und Terminologieabgleich |
| `docs/guides/GUIDED_TOURS.md` | aufgabenorientierte Abläufe |
| `docs/reference/TECHNICAL.md` | Architektur, Persistenz, Laufzeit und Datenflüsse |
| `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` | fachliche Mechanismen und Aussagegrenzen |
| `docs/reference/BALANCE_MODULES_README.md` | Balance-Module und Jahresprozess |
| `docs/reference/SIMULATOR_MODULES_README.md` | Simulatorfunktionen, Runner und Ergebnisverträge |
| `docs/reference/PROFILVERBUND_FEATURES.md` | Profilverbund und Begrenzungen |
| `docs/reference/TRANCHEN_MODULES_README.md` | Tranchen-, Persistenz-, Recovery- und Reconcile-Vertrag |
| `docs/reference/AUTO_OPTIMIZE_DETAILS.md` | Sweep-/Optimizer-Grenzen und Interpretation |
| `docs/reference/DATA_SOURCES.md` | externe und historische Datenquellen |
| `engine/README.md` | Engine-Grenzen und öffentliche Semantik |
| `tests/README.md` sowie vorhandene Tests | belegte Nutzerverträge und verfügbare Validierungsgates |
| `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html`, `app/`, `engine/`, `types/` | tatsächliche sichtbare Labels und ausführbare Verträge bei Widersprüchen |

Ändert sich eine Nutzerbeschreibung gegenüber einer Referenz, wird nicht
automatisch die jüngste oder ausführlichste Formulierung übernommen. Sichtbare
UI und ausführbarer Contract werden gemeinsam geprüft. Bleibt ein
semantischer Widerspruch bestehen, wird die Umsetzung gestoppt statt eine neue
Semantik im Handbuch zu erfinden.

## 4. Festgestellte Ausgangslücken

Der Planungsabgleich hat bereits folgende konkrete Arbeitsfelder ergeben:

1. **Startpfad:** `Handbuch.html` empfiehlt noch, `index.html` direkt im
   Browser zu öffnen. Der dokumentierte Browserbetrieb verlangt wegen
   ES-Modulen und Workern den lokalen HTTP-Start.
2. **Desktopdaten und Backup:** Die Aussage, die portable EXE zusammen mit
   einem „Konfigurationsordner“ zu sichern, bildet den aktuellen
   App-Daten-/Komplettbackup-Vertrag nicht korrekt ab.
3. **Offlinegrenze:** „Simulation funktioniert offline“ ist als Grundsatz
   richtig, benötigt aber die Trennung von lokalen Rechenpfaden, optionalen
   Live-Abrufen und dem fail-safe Recovery-Verhalten eines bereits begonnenen
   Jahresabschlusses.
4. **Tail Risk:** Die Parameterbeschreibung klingt so, als würden pessimistische
   Tails generell verstärkt. Das aktuelle Fat-Tail-/Crash-Overlay ist ein
   ausdrücklich zuschaltbarer Stresstest.
5. **Runway:** Beispiele mit pauschal zwölf Monaten und gesamtem Monatsbedarf
   bilden weder den konfigurierbaren Netto-Runway noch den getrennten
   Brutto-Notfallpuffer und die festgelegte Messphase vollständig ab.
6. **Parameter Sweep:** Der Glossareintrag nennt noch Sparrate und
   Rentenbeginn. Der aktuelle Sweep verwendet sieben andere sichtbare
   Dimensionen; Auto-Optimize verwendet davon sechs.
7. **Aktuelle Verträge:** Notfallpuffer, CAPE-Return-Policy und einige
   Persistenz-, Recovery-, Provenienz- und Ergebnisgrenzen sind nicht oder nur
   fragmentarisch nutzerverständlich eingebunden.
8. **Navigation:** Der Abschnitt „Stresstests & Presets“ besitzt einen Anker,
   ist aber im Inhaltsverzeichnis nicht direkt auffindbar. Das gesamte TOC ist
   nach der Inhaltsänderung neu gegen vorhandene und eindeutige Ziele zu
   prüfen.
9. **Lesbarkeit:** Technische Contractdetails, Handlungsschritte und
   Interpretation stehen teilweise ohne klare Priorisierung nebeneinander;
   gleichzeitig wiederholen Quickstart, Haupttext, FAQ und Glossar einzelne
   Aussagen mit abweichender Genauigkeit.
10. **Unbelegte Zusagen:** Der Supportabschnitt enthält konkrete Kontakt- und
    Reaktionszeitaussagen, deren belastbare Grundlage im maßgeblichen
    Repositorykontext zu prüfen und andernfalls zu entfernen ist.
11. **Unbelegte oder veraltete Handlungsempfehlungen:** Ansparer-, Quickstart-,
    FAQ- und Best-Practice-Texte empfehlen unter anderem feste Sparquoten,
    Beispielallokationen, einen pauschalen Rebalancing-Rhythmus und das genaue
    Befolgen von App-Anweisungen. Mehrere Ansparerabläufe verwenden zudem die
    nicht mehr interaktiven Sweep-Dimensionen Sparrate und Rentenbeginn. Diese
    Aussagen sind gegen die sichtbaren Funktionen zu prüfen und entweder als
    rein synthetische Beispiele mit Grenzen zu kennzeichnen oder zu entfernen.

Diese Liste ist eine Ausgangsbasis, keine abschließende Fehlerliste. Slice 1
erstellt vor Textänderungen eine vollständige Soll-/Ist-Matrix für alle
Nutzeroberflächen und zentralen Workflows.

## 5. Anforderungen und Invarianten

### 5.1 Inhaltliche Anforderungen

1. Jeder Nutzerworkflow nennt Einstieg, Voraussetzungen, geordnete Schritte,
   erwartetes Ergebnis und relevante Fehler-/Recovery-Reaktion.
2. Die Startanleitung unterscheidet Tauri-EXE, Browserstart mit lokalem Server,
   optionale Node.js-Abhängigkeit für Browser-Livekurse und Offlinebetrieb.
3. Profilwechsel, Komplettbackup, Jahresabschluss-Snapshot und Export werden
   nicht als austauschbare Sicherungsmechanismen dargestellt.
4. Balance erklärt Jahres-Preflight, Recovery-Snapshot, periodengebundene
   Marktdaten, Ausgabenjahr, Diagnose, Runway/Notfallpuffer, Pflegebucket,
   Handlungsschritte und tatsächliche manuelle Nachführung.
5. Simulator erklärt Eingaben, Personen/Renten, Sampling, Stressoptionen,
   Dynamic Flex, Mindest-Flex, Monte-Carlo-Ressourcen/Abbruch, Backtest,
   Ergebnisse, Exporte, Sweep und Auto-Optimize in der Reihenfolge realer
   Nutzung.
6. Profilverbundgrenzen, insbesondere die Demografiebegrenzung auf höchstens
   zwei Personen, werden von der Finanzaggregation mehrerer Profile getrennt.
7. Tranchenpflege trennt Aggregatsicht, validen Detailbestand, korrupte Daten,
   schreibfreie Empfehlung, bestätigten Reconcile und manuellen Cashnachweis.
8. Ergebnisbegriffe nennen Einheit, Messphase oder Grundgesamtheit, soweit dies
   für eine richtige Nutzerinterpretation erforderlich ist.
9. Monte-Carlo-Ergebnisse werden als modellinterne Schätzungen mit
   Unsicherheit und Missingness beschrieben; Backtests als historische
   In-sample-Diagnose; Sweep/Auto-Optimize als experimentelle
   Sensitivitäts-/Kandidatensuche und nicht als Finanzempfehlung oder globales
   Optimum.
10. Reale Steuer-, Rechts-, Pflege- und Anlageentscheidungen werden nicht als
    durch die Suite abschließend geklärt dargestellt.
11. Ansparphase und Übergang in die Entnahmephase werden nur mit tatsächlich
    vorhandenen Eingaben und Auswertungen beschrieben. Allgemeine Finanzbildung
    und App-Bedienung bleiben sprachlich getrennt; das Handbuch gibt keine
    unbelegte Zielquote, Erfolgsgrenze, Asset-Allokation oder
    Rebalancing-Empfehlung als Produktregel aus.

### 5.2 Struktur- und Lesbarkeitsanforderungen

1. Der Quickstart bleibt kurz und verweist für Ausnahmen auf die passenden
   Detailanker.
2. Hauptabschnitte folgen der Nutzerreise: Start und Datensicherheit, Profile
   und Tranchen, Simulator, Balance/Jahrespflege, Fehlerhilfe und Begriffe.
   Persona- oder Ansparphasen-Einstiege dürfen diese kanonischen Abläufe nur
   kurz erschließen, nicht mit abweichenden Feldnamen oder Regeln duplizieren.
3. Absätze behandeln jeweils eine Aussage; längere Abläufe verwenden
   nummerierte Schritte, Alternativen oder Warnboxen.
4. Nutzerbegriffe und sichtbare UI-Labels stehen im Vordergrund. Interne
   Feldnamen erscheinen nur ergänzend in `code`, wenn sie im Export oder in
   einer Diagnose sichtbar sind.
5. Beispiele werden als Beispiele gekennzeichnet und dürfen Defaults,
   Einheiten, Grenzwerte oder Garantieaussagen nicht verfälschen.
6. FAQ und Glossar definieren Begriffe nicht abweichend vom Haupttext, sondern
   verlinken auf dessen kanonischen Abschnitt.
7. Überschriften, TOC-Texte und Linkziele sind eindeutig; jeder interne
   `href="#…"` verweist auf genau ein vorhandenes Ziel.
8. Vorhandene Tabsteuerung, direkte Hash-Navigation, responsive Darstellung,
   Bilder, Alternativtexte, Fokusführung und Tastaturbedienung dürfen nicht
   verschlechtert werden.

### 5.3 Fachliche Invarianten

- Floor und Flex bleiben getrennt; `minimumFlexAnnual` ist eine validierte
  optionale Untergrenze und darf niemals als still begrenzter Wert beschrieben
  werden.
- Runway-Ziel, Brutto-Notfallpuffer, Pflegebucket und freie Liquidität sind
  unterschiedliche Konzepte.
- Runway-KPIs und Transaktionsziel verwenden die dokumentierte Messphase und
  Bedarfsbasis; ein vereinfachendes Beispiel darf diesen Vertrag nicht
  umdeuten.
- Pflegebucket ist in Balance `diagnostic_only`; im Simulator kann er unter
  den dokumentierten Pflegebedingungen wirksam werden.
- Empfehlungen verändern keinen Realbestand. Ein bestätigter Tranchenverkauf
  erzeugt keine automatische Cashbuchung.
- Monte-Carlo-Quote, Wilson-Intervall, Quantile, Missingness und
  Drawdownanzeigen dürfen nicht als empirische Zukunftswahrscheinlichkeit oder
  Garantie bezeichnet werden.
- Die 4,5-Prozent-Auswertung ist eine Berichtsreferenz; sie ist keine Alarm-
  oder Guardrail-Schwelle. Die unterschiedliche Vergleichsgrenze von KPI und
  klassenbasierter Heatmap darf nicht verwischt werden.
- Ein Auto-Optimize-Champion ist ein modellinterner Szenariokandidat, kein
  globales Optimum.
- `legacy_step` bleibt die Default-CAPE-Return-Policy, solange kein gesondert
  freigegebener Produktentscheid den Default ändert; `cape_continuous` wird als
  auswählbarer Modus beschrieben.
- Browser- und Tauri-Persistenz sowie optionale Netzwerkpfade werden korrekt
  getrennt. Es wird kein Cloud-Sync behauptet.
- Bestehende Engine-, Export-, Persistenz- und UI-Verträge werden nur
  dokumentiert, nicht durch Dokumentation neu definiert.

### 5.4 Änderungsinvarianten

- Einziger Änderungspfad der späteren Umsetzung ist `Handbuch.html`.
- Alle Referenz-, Quell- und Testpfade bleiben unverändert und werden nur
  gelesen beziehungsweise ausgeführt.
- Die fünf Slices sind nacheinander auszuführen. Nach jedem Slice werden Diff,
  Pfadgrenze und betroffene Anker geprüft, bevor der nächste Slice beginnt.
- Codex dokumentiert Ergebnisse und reagiert auf Findings, markiert die eigene
  Umsetzung aber nie selbst als freigegeben.

## 6. Geordnete Implementierungsslices

Die folgenden Slices sind Inhalt dieses Arbeitsplans für eine spätere
`IMPLEMENT`-Aufgabe. Sie sind **keine** ausführbaren Slices des aktuellen
`PLAN_ONLY`-Laufs.

### Slice 1 – Inhaltsinventar, Einstieg und Datensicherheit

**Zweck**

Eine vollständige Soll-/Ist-Matrix herstellen und den Einstieg so korrigieren,
dass Nutzer die passende Laufzeitvariante wählen, Profile bewusst auswählen
und ihre Daten mit dem richtigen Mechanismus sichern können.

**Exakter Änderungspfad**

- `Handbuch.html`

**Nur lesend heranzuziehende Pfade**

- `README.md`
- `QUICKSTART.md`
- `docs/guides/GUIDED_TOURS.md`
- `docs/reference/TECHNICAL.md`
- `start_suite.cmd`
- `start_suite.ps1`
- `index.html`
- `app/profile/`
- `app/shared/`
- `src-tauri/tauri.conf.json`

**Arbeitsschritte**

1. Alle Handbuchabschnitte und TOC-Ziele den fünf Einstiegspunkten und den
   aktuellen Nutzerworkflows zuordnen; fehlende, doppelte und veraltete Themen
   markieren.
2. „Start in 2 Minuten“ und „Installation & Start“ für EXE und Browser neu
   ordnen; direkten `file://`-Start entfernen, HTTP-Start und optionale
   Live-Datenabhängigkeiten korrekt beschreiben.
3. Lokale Datenhaltung, fehlenden Cloud-Sync, Browser-/Tauri-Unterschied,
   Komplettbackup, Jahresabschluss-Snapshots, Exporte und Vertraulichkeit in
   einer kompakten Datensicherheitssektion abgrenzen.
4. Profilanlage, Profilwechsel, Handoff/Flush und Wiederherstellung so
   beschreiben, dass kein Schreiben in das falsche Profil nahegelegt wird.
5. Offlineaussagen um die Grenzen optionaler Abrufe und des Recovery-Zustands
   eines begonnenen Jahresabschlusses ergänzen.

**Akzeptanzkriterien**

- Kein Ablauf empfiehlt das direkte Öffnen von `index.html` als regulären
  Browserstart.
- EXE, Browserserver, Node.js-abhängige Livekurse und Offlinefähigkeit sind
  getrennt und widerspruchsfrei beschrieben.
- Speicherortbehauptungen und Sicherungsanweisungen entsprechen dem aktuellen
  Persistenzvertrag; ein nicht belegter „Konfigurationsordner“ wird nicht als
  Backupstrategie genannt.
- Komplettbackup, Snapshot und Ergebnisexport besitzen jeweils einen klaren
  Zweck und werden nicht gleichgesetzt.
- Jeder vorhandene oder neu angelegte Einstiegs-/Datensicherheitsanker ist im
  TOC erreichbar.

**Validierung**

- Manueller Satz-für-Satz-Abgleich mit den oben genannten Quellen und den
  sichtbaren Labels in `index.html`.
- Statische Prüfung auf veraltete Startaussagen (`index.html` direkt öffnen,
  Konfigurationsordner) und auf widersprüchliche Offline-/Backupformulierungen.
- Interne Hashlinks auf vorhandene, eindeutige IDs prüfen.
- Diff- und Scopeprüfung: ausschließlich `Handbuch.html`.

### Slice 2 – Balance, Jahresprozess und operative Umsetzung

**Zweck**

Den kompletten Balance-Nutzerweg vom Jahres-Preflight bis zur manuellen
Umsetzung korrekt, in sicherer Reihenfolge und mit verständlichen
Diagnosebegriffen darstellen.

**Exakter Änderungspfad**

- `Handbuch.html`

**Nur lesend heranzuziehende Pfade**

- `Balance.html`
- `app/balance/`
- `app/shared/`
- `engine/`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/ENGINE_DECISION_LOGIC.md`
- `docs/reference/DATA_SOURCES.md`

**Arbeitsschritte**

1. Balance-Schnellstart und Detailteil auf eine gemeinsame Reihenfolge bringen:
   Profil/Backup, Preflight, Ausgabenjahr, Recovery-Snapshot, Marktdaten,
   Post-Write-Validierung, Diagnose und reale Umsetzung.
2. Jahresabschluss und bloßes Nachrücken von Marktdaten sowie manuelle CSV- und
   Onlinepfade klar unterscheiden; Perioden-, Stichtags-, Provenienz- und
   Recovery-Hinweise nutzerverständlich einbauen.
3. Runway als konfigurierbares Nettoziel erklären und vom
   Brutto-Notfallpuffer, Pflegebucket und ungekürzten Bedarf abgrenzen. Veraltete
   pauschale Zwölfmonatsbeispiele ersetzen.
4. Floor/Flex, Mindest-Flex, Safety-/Guardrail-Grenzen, Messphasen und
   Diagnoseanzeigen konsistent erläutern, ohne Engineinternas unnötig
   auszubreiten.
5. Ausgaben-Check, Jahreswechsel, korrupte Daten, Recovery und Historie mit
   konkreten Nutzerreaktionen beschreiben.
6. Handlungsschritte als Empfehlung, Brokeraktion, Tranchen-Reconcile und
   manuelle Cashnachführung voneinander trennen.

**Akzeptanzkriterien**

- Der dokumentierte Jahresablauf überspringt weder Preflight noch
  Recovery-Snapshot oder Abschlussprüfung.
- Onlinefehler nach Beginn des periodengebundenen Ablaufs werden nicht als
  harmloser Offline-Fallback beschrieben.
- Runway, Notfallpuffer, Pflegebucket und freie Liquidität sind an allen
  Fundstellen widerspruchsfrei.
- `minimumFlexAnnual` wird als validierter Wert und nicht als still begrenzte
  Eingabe dargestellt.
- Nutzer können aus dem Handbuch erkennen, welche Schritte die App plant und
  welche real bei Bank/Broker und anschließend in der App bestätigt werden
  müssen.
- Quickstart, Haupttext, FAQ und Glossar verwenden für Balance dieselben
  Begriffe und Messgrundlagen.

**Validierung**

- Gegenprüfung jedes Prozessschritts mit sichtbaren Balance-Labels und den
  Balance-/Engine-Referenzen.
- Suche nach allen Vorkommen von `Runway`, `12 Monate`, `Floor`, `Flex`,
  `Pflegebucket`, `Snapshot`, `Recovery` und `Cash`; widersprüchliche
  Zweitdefinitionen beseitigen.
- Interne Links aus Diagnose, Handlungsschritten, FAQ und Glossar anklicken.
- Diff- und Scopeprüfung: ausschließlich `Handbuch.html`.

### Slice 3 – Simulator, Modellgrenzen und Ergebnisinterpretation

**Zweck**

Den Simulator entlang eines vollständigen Laufs erklären und sicherstellen,
dass Sampling, Stress, Ressourcensteuerung, Ergebniskennzahlen und
Optimierungsfunktionen weder technisch falsch noch zu optimistisch dargestellt
werden.

**Exakter Änderungspfad**

- `Handbuch.html`

**Nur lesend heranzuziehende Pfade**

- `Simulator.html`
- `app/simulator/`
- `workers/`
- `engine/`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/AUTO_OPTIMIZE_DETAILS.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/WISSENSCHAFTLICHER_RAHMEN.md`

**Arbeitsschritte**

1. Eingaben, Personen/Renten, Pflege, Portfolio, Kosten, Sampling und
   Dynamic-Flex-Einstellungen in UI-Reihenfolge erklären.
2. Die Ansparphase und den Übergang zur Entnahmephase gegen die tatsächlich
   sichtbaren Eingaben und Berechnungspfade prüfen; veraltete Sweep-Verweise
   sowie unbelegte Sparquoten-, Allokations-, Erfolgsgrenzen- und
   Rebalancing-Empfehlungen entfernen oder eindeutig als begrenzte Beispiele
   kennzeichnen.
3. Samplingmodi, Startjahr-/CAPE-Vorrang, Recency/Filter und das optionale
   Fat-Tail-/Crash-Overlay korrekt voneinander abgrenzen.
4. Monte-Carlo-Runzahl, Großlastbestätigung, Workerzahl/Jobbudget, Seed,
   Fortschritt und Abbruch als Nutzerworkflow ergänzen beziehungsweise
   konsolidieren.
5. Backtesting als historische In-sample-Diagnose sowie Monte Carlo als
   modellinterne Verteilung darstellen; Einsatz und Grenzen beider Werkzeuge
   vergleichbar formulieren.
6. Floor-Deckung, Wilson-Intervall, Endvermögen, reale Depotentnahme,
   Drawdowns, Steuern, Missingness und technische Fehler mit Einheiten,
   Grundgesamtheit und Aussagegrenze erklären.
7. Szenario-Log, MC-Gesamtexport und Backtest-/Szenarioexport in Zweck,
   Versionierung, Provenienz und Vertraulichkeit unterscheiden.
8. Sweep- und Auto-Optimize-Texte einschließlich Glossareintrag auf die sieben
   beziehungsweise sechs aktuellen Dimensionen und die experimentelle
   Modellgrenze korrigieren.
9. Dynamic-Flex-Profile, konservativen Horizont, Mindest-Flex und
   CAPE-Return-Policy (`legacy_step`/`cape_continuous`) verständlich und ohne
   Defaultverwechslung dokumentieren.

**Akzeptanzkriterien**

- Das Tail-Risk-Overlay wird nirgends als generell aktive Basissimulation
  beschrieben.
- Samplingmodus, Startjahr und CAPE-/Filtervorrang sind konsistent mit dem
  aktuellen Run-Contract.
- Runzahlgrenzen, Großlastdialog und Abbruchverhalten stimmen mit der sichtbaren
  Oberfläche überein.
- Jede entscheidungsrelevante Ergebniskennzahl besitzt eine verständliche
  Aussagegrenze; Missingness und technische Fehler werden nicht als Null oder
  Erfolg umgedeutet.
- Backtest, Monte Carlo, Sweep und Auto-Optimize werden nicht als externe
  Validierung, Garantie, empirische Zukunftswahrscheinlichkeit oder
  Finanzempfehlung bezeichnet.
- Der Sweep-Glossareintrag nennt keine veralteten Dimensionen. Unterschiede
  zwischen Sweep und Auto-Optimize sind ausdrücklich sichtbar.
- Ansparer- und Best-Practice-Passagen verweisen nur auf vorhandene
  Bedienelemente und kennzeichnen synthetische Beispiele; sie geben keine
  unbelegte Erfolgsquote, Sparquote, Allokation oder Umschichtungsfrequenz als
  fachlich freigegebene Zielvorgabe aus.
- `legacy_step` und `cape_continuous` sind korrekt bezeichnet; es wird kein
  ungeprüfter Defaultwechsel behauptet.

**Validierung**

- Feld- und Buttonabgleich gegen `Simulator.html` sowie die zuständigen
  Simulator-Module.
- Begriffssuche über alle Vorkommen von Monte Carlo, Backtest, Fat Tail,
  Runzahl, Seed, Wilson, Missingness, Sweep, Auto-Optimize, Dynamic Flex und
  CAPE; Definitionen auf Widerspruch prüfen.
- Suche nach normativen Formulierungen und Zahlenbeispielen wie „Ziel“,
  „empfohlen“, „genau folgen“, Sparquote, Rebalancing und Erfolgsquote; jede
  Fundstelle auf Produktbeleg, Beispielkennzeichnung und Beratungsgrenze
  prüfen.
- Szenario- und Zahlenbeispiele gegen Einheiten, Vergleichsoperatoren und
  Grenzwerte der Referenzverträge prüfen.
- TOC-Ziel für „Stresstests & Presets“ und alle Simulator-Unterabschnitte
  verifizieren.
- Diff- und Scopeprüfung: ausschließlich `Handbuch.html`.

### Slice 4 – Profilverbund und Tranchen-Lebenszyklus

**Zweck**

Profilübergreifende Planung und den vollständigen Lebenszyklus eines realen
Tranchenvorgangs so erklären, dass Aggregation, Simulation, Empfehlung und
Realbestandsänderung nicht verwechselt werden.

**Exakter Änderungspfad**

- `Handbuch.html`

**Nur lesend heranzuziehende Pfade**

- `index.html`
- `depot-tranchen-manager.html`
- `app/profile/`
- `app/tranches/`
- `types/tranche-contract.js`
- `docs/reference/PROFILVERBUND_FEATURES.md`
- `docs/reference/TRANCHEN_MODULES_README.md`
- `docs/guides/MULTI-TRANCHEN-ANLEITUNG.md`

**Arbeitsschritte**

1. Einzelprofil, Profilverbund, finanzielle Aggregation und individuelle
   Demografie-/Rentenpfade trennscharf erläutern.
2. Profilzuordnung von Vermögen, Gold, Bedarf, Rente, Pflegebucket und Tranchen
   sowie Hauptprofilregeln und Warnungen in einen nachvollziehbaren Ablauf
   bringen.
3. Tranchenanlage, Quote-Aktualisierung, valider Leerbestand, korrupter
   Bestand, Backup und Recovery als getrennte Zustände dokumentieren.
4. Schreibfreie Simulation/Empfehlung, Vorschau, bestätigten idempotenten
   Reconcile, `pending_manual_posting`, bereits berücksichtigten Erlös,
   Cashabschluss, append-only Korrektur und Legacyanzeige in zeitlicher
   Reihenfolge erklären.
5. Klare Checkliste für den Abgleich zwischen App, Brokerbestand und freier
   Liquidität ergänzen.

**Akzeptanzkriterien**

- Finanzaggregation beliebig vieler ausgewählter Profile wird nicht mit mehr
  als zwei individuellen Demografiepfaden gleichgesetzt.
- Der Nutzer kann erkennen, welches Profil einen Wert besitzt und wann das
  Hauptprofil maßgeblich ist.
- Leerer, korrupter und nicht geladener Tranchenbestand werden nicht
  gleichgesetzt.
- Kein Text behauptet, eine Empfehlung oder Simulation ändere reale Lots.
- Kein Text behauptet, ein bestätigter Verkauf buche den Nettoerlös automatisch
  in freie Liquidität.
- Cash-Pending, Erstbestätigung und Korrektur sind als sichtbare,
  nicht-destruktive Folge dokumentiert.

**Validierung**

- Workflowvergleich mit den sichtbaren Profil-/Tranchenlabels und dem
  kanonischen Tranchenvertrag.
- Suche nach allen Vorkommen von Profil, Hauptprofil, Tranche, Verkauf,
  Reconcile, Cashstatus und Liquidität; Besitz- und Schreibsemantik prüfen.
- Handbuchschritte als Trockenlauf an einem synthetisch beschriebenen
  Zwei-Profil-Fall und an einem Verkauf mit nachgelagertem Cashabschluss
  nachvollziehen, ohne reale Nutzerdaten zu verwenden.
- Diff- und Scopeprüfung: ausschließlich `Handbuch.html`.

### Slice 5 – Informationsarchitektur, Konsistenz und Endvalidierung

**Zweck**

Die überarbeiteten Inhalte zu einer einheitlichen, navigierbaren und
verständlichen Nutzerreferenz zusammenführen und alle Querschnittswidersprüche
vor dem Review beseitigen.

**Exakter Änderungspfad**

- `Handbuch.html`

**Nur lesend heranzuziehende Pfade**

- alle in Abschnitt 3.4 genannten Quellen
- `tests/browser-smoke.test.mjs`
- `tests/README.md`

**Arbeitsschritte**

1. Quickstart, Inhaltsverzeichnis, Haupttext, Problemhilfe, Jahrespflege, FAQ
   und Glossar auf eine klare Nutzerreise und kanonische Begriffe ausrichten.
2. Wiederholungen entfernen oder durch Links ersetzen; technische Details in
   progressive Vertiefung verschieben.
3. Alle Überschriften, IDs, TOC-Einträge, Querverweise, Bildunterschriften,
   Alternativtexte, Warn-/Tippboxen und sichtbaren UI-Bezeichnungen prüfen.
4. Unbelegte Support-, Release-, Plattform- oder Validierungszusagen entfernen
   oder auf belastbare Repositoryquellen begrenzen.
5. Sprache vereinheitlichen: kurze aktive Sätze, konsistente Anrede,
   ausgeschriebene Erstnennung von Fachbegriffen, stabile Einheiten und
   Zahlenformate.
6. Desktop- und schmale Browserdarstellung sowie Tab-/Hash-Navigation manuell
   prüfen; anschließend die bestehenden automatisierten Gates ausführen
   lassen.

**Akzeptanzkriterien**

- Alle Nutzeroberflächen und zentralen Workflows aus Abschnitt 3.1 sind im
  Handbuch auffindbar.
- Jeder interne Hashlink besitzt genau ein vorhandenes Ziel; IDs sind
  eindeutig, und die Navigation hinterlässt genau einen aktiven Tab.
- Quickstart und Detailkapitel widersprechen sich weder bei Reihenfolge noch
  bei Defaults, Grenzen oder Sicherheitsreaktionen.
- FAQ und Glossar enthalten keine eigenständigen veralteten Contracts.
- Es gibt keine unbelegte Support-SLA, Cloud-Sync-, Plattform- oder
  Modellfreigabeaussage.
- Bei 390 Pixel Breite und regulärer Desktopbreite entstehen kein horizontaler
  Seitenoverflow, keine unlesbaren Tabellen/Codefragmente und keine
  abgeschnittenen Bedienelemente.
- Die Browserkonsole bleibt beim Laden, Tabwechsel und Sprung zu jedem
  TOC-Anker ohne Fehler.
- Der kanonische Diff enthält ausschließlich `Handbuch.html`.

**Validierung**

1. Statischer HTML-/Ankercheck: eindeutige IDs, auflösbare Hashlinks,
   vorhandene Bildquellen und keine leeren Navigationsziele.
2. Manueller Browser-Smoke über lokalen HTTP-Server: Quickstart- und
   Handbuch-Tab, TOC-Sprünge, direkter Hash-Aufruf, Tastaturfokus, Desktopbreite
   und 390-Pixel-Viewport; Konsole kontrollieren.
3. Bestehendes Browser-Gate durch den Orchestrator: `npm run test:browser`.
   Es wird kein Test geändert; der bestehende Handbuch-Smoke prüft Laden und
   Tabzustand, während die erweiterten Inhalts-/Ankerprüfungen manuell und
   statisch erfolgen.
4. Bestehende Standardsuite durch den Orchestrator: `npm test`, sofern die für
   den späteren Umsetzungslauf geltenden Ausführungsregeln dieses Gate
   verlangen.
5. Abschlussabgleich mit `README.md`, `CHANGELOG.md`, den betroffenen
   Referenzdokumenten und den sichtbaren UI-Labels.
6. `git diff --check`, Status-/Branch-/Scopeprüfung durch den vorgesehenen
   Workflow; keine Stage-, Commit-, Push- oder Branchaktion durch Codex.

## 7. Gesamtabnahme für die spätere Umsetzung

Die Umsetzung ist erst reviewbereit, wenn alle folgenden Nachweise vorliegen:

- die Akzeptanzkriterien aller fünf Slices sind dokumentiert erfüllt;
- der einzige geänderte Umsetzungspfad ist `Handbuch.html`;
- alle festgestellten Ausgangslücken sind korrigiert oder als offener,
  begründeter Stopfall dokumentiert;
- statische Link-/ID-/Assetprüfungen und der manuelle Browser-Smoke sind grün;
- die vom Orchestrator angesetzten automatisierten Gates sind grün;
- es gibt keine unerwartete Änderung an Engine-Semantik, UI-Vertrag, Snapshot,
  Backtest oder FlowDelta;
- Claude und anschließend Antigravity können den fingerprintgebundenen Stand
  gemäß State-v3 prüfen; Codex erklärt keine Eigenfreigabe.

## 8. Risiken und Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
| --- | --- | --- |
| Referenzdokumente und Laufzeitcode widersprechen sich | Das Handbuch übernimmt eine falsche Semantik | Sichtbare UI und ausführbaren Contract gemeinsam prüfen; bei verbleibender Mehrdeutigkeit stoppen |
| Vollständigkeit führt zu technischer Überladung | Nutzer finden Handlungen nicht mehr | Nutzerreise, progressive Vertiefung, kurze Checklisten und Links auf Referenzdokumente |
| Vereinfachte Beispiele verändern den Contract | Falsche finanzielle Interpretation | Einheit, Messphase und Beispielcharakter nennen; Zahlen gegen Contract prüfen |
| Kopieren aus README erzeugt schnell neue Drift | Mehrere inkonsistente Langfassungen | Handlungsbeschreibung im Handbuch, technische Details per gezieltem Verweis |
| Mehrere Slices bearbeiten dieselbe HTML-Datei | Querschnittswidersprüche oder Mergefehler | Strikte Reihenfolge, Diff-/Ankercheck nach jedem Slice, finaler Gesamtwortschatzcheck |
| Lange Inline-HTML-Änderung bricht Struktur | Tabs, TOC oder Layout funktionieren nicht | Kleine Abschnitte, HTML-/ID-Prüfung und Browser-Smoke nach jedem strukturellen Umbau |
| Bestehender Browser-Smoke prüft Inhalte kaum | Semantischer Fehler bleibt trotz grünem Gate | Zusätzliche manuelle Soll-/Ist-Matrix, Begriffssuche und statische Ankerprüfung; Tests bleiben unverändert |
| Unbelegte Recht-/Steuer-/Supportaussage bleibt stehen | Nutzer überschätzt Verlässlichkeit oder Support | Nur belegte Aussagen; Modell- und Beratungsgrenzen prominent halten |
| Allgemeine Finanzregel erscheint als Produktempfehlung | Nutzer übernimmt unbelegte Spar-, Allokations- oder Rebalancingvorgaben | App-Bedienung, synthetisches Beispiel und allgemeine Orientierung sprachlich trennen; unbelegte Zielwerte entfernen |
| Vertrauliche reale Finanzdaten gelangen in Beispiele | Datenschutzverletzung | Ausschließlich synthetische, gerundete Beispiele ohne lokale Exporte oder Logs |

## 9. Stopbedingungen

Die spätere Umsetzung stoppt und fordert eine Entscheidung an, wenn einer der
folgenden Fälle eintritt:

1. **Branch- oder Scopeabweichung:** Der aktive Branch ist nicht
   `codex/handbuch-ueberarbeitung`, oder der kanonische Diff enthält neben
   `Handbuch.html` einen weiteren Änderungspfad.
2. **Contract unklar:** UI, Engine/Typvertrag und maßgebliche Referenzen liefern
   für eine nutzerrelevante Aussage unterschiedliche Semantik, die nicht rein
   redaktionell auflösbar ist.
3. **Produktänderung erforderlich:** Eine korrekte Handbuchbeschreibung würde
   eine Änderung an Produktcode, UI-Label, Test, Konfiguration, Engine-Semantik
   oder generiertem Artefakt erfordern.
4. **Mehr als zehn Programmdateien:** Schon die notwendige Korrektur würde die
   projektweite produktive Dateigrenze überschreiten. Für diesen Plan ist
   ohnehin nur eine Programmdatei zugelassen.
5. **Validierung nicht verfügbar:** Statische Ankerprüfung, sinnvoller manueller
   Browser-Smoke oder ein vorgeschriebenes automatisiertes Gate kann nicht
   ausgeführt und nicht durch einen freigegebenen Ersatznachweis ersetzt
   werden.
6. **Unerwartete Regression:** Snapshot-/Backtest-Ergebnisse, FlowDelta,
   Browserkonsole, Tabnavigation oder Layout weichen unerwartet ab.
7. **Parameterdrift:** UI und Engine verwenden unterschiedliche Parameternamen
   oder Einheiten, insbesondere bei Runway, Mindest-Flex, Sweep oder
   Auto-Optimize.
8. **Stille Mindest-Flex-Begrenzung:** Im Abgleich wird ein Pfad entdeckt, der
   `minimumFlexAnnual` still begrenzt statt zu validieren.
9. **Unbelegte fachliche Entscheidung:** Eine Formulierung würde eine neue
   Steuer-, Rechts-, Anlage-, Langlebigkeits-, Pflege- oder Modellfreigabe
   voraussetzen.
10. **Unerwartete Fremdänderung:** Vorbestehende oder parallele Änderungen
    überlappen den zu bearbeitenden Bereich so, dass sie nicht sicher erhalten
    werden können.

## 10. Review- und Ausführungsgrenze

Dieser `PLAN_ONLY`-Lauf erzeugt ausschließlich dieses Arbeitsplandokument. Die
fünf in Abschnitt 6 beschriebenen Slices sind ein späterer, menschlich lesbarer
Umsetzungsplan und dürfen erst nach fingerprintgebundener Planprüfung und
expliziter Nutzerfreigabe in einer gesonderten `IMPLEMENT`-Aufgabe ausgeführt
werden. Codex erstellt oder wechselt keinen Branch, staged und committet nicht
und genehmigt weder Plan noch spätere Umsetzung selbst.

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-1f54cdd8dfec`
- Testdateien: keine
- Prüfdimensionen: plan-completeness (§1-§10 vs assignment checklist), scope-fence (diff path vs TASK_SCOPE/attestation changed_paths=1), PLAN_ONLY contract (slices=1/future_slices=5 in bound attestation), slice ordering/dependency structure, acceptance-criteria testability, validation-strategy realism (static+manual+existing automated gates only), stop-condition/machine-stop-rule mapping, domain invariant correctness (Floor/Flex, Pflegebucket, runway vs Notfallpuffer, tranche write-freedom, CAPE default)
- Größtes Restrisiko: Largest residual risk: no explicit mid-slice interruption/resume protocol for the single shared Handbuch.html across 5 sequential document-editing slices
- Realistische Bruchbedingung: Break condition: a future IMPLEMENT round resumes an interrupted slice with an undeclared, broader rewrite of Handbuch.html sections than the original partial edit, producing an unreviewable diff or duplicated/contradictory content that only surfaces during the Slice 5 consistency pass.
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-1f54cdd8dfec`
- Testdateien: keine
- Eigene Findings: `A-01`
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-1f54cdd8dfec`

- Diff-Fingerprint: `1f54cdd8dfecaf0c738afde24b96c6850e0b972ba127e267cea234d15eee1929`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `cc2b37df7a4b3d6b8d7e2cf9abea756cb57ca2b826c67538b1a2f946d758da5f`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=5; work_plan=docs/internal/handbuch.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months the most likely failure is that a mid-slice stop (e.g., CONTRACT-UNCLEAR during Slice 3) gets resumed without a clear boundary statement, so a later round silently rewrites more of Handbuch.html than intended, producing duplicated or contradictory sections (e.g., two Runway definitions) that are only caught late in Slice 5's link/anchor/term audit, forcing rework and re-review of an already-approved slice.
  - Ereignis 3: In three months, the most likely failure cause is that an agent inadvertently adds external resource dependencies (such as a CDN link for a font or stylesheet) while reformatting the HTML, breaking the app's offline usage guarantee without failing the automated HTML or link syntax checks.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `A-01` — `OPEN`

- Quelle: `antigravity`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Plan does not explicitly forbid the introduction of external network dependencies (e.g. remote fonts, CDN scripts, or external media) into Handbuch.html, which could silently break the app's strict offline capability requirement.
- Akzeptanztest: Validate that no &#96;&lt;link&gt;&#96;, &#96;&lt;script src&gt;&#96;, or &#96;&lt;img src&gt;&#96; tags pointing to external http:// or https:// URLs are introduced in any slice.
- Statusbegründung: –

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Plan has no explicit rule for resuming a slice interrupted mid-edit (partial section changes to the single shared Handbuch.html before a stop condition fires); only slice-boundary checks are specified in §5.4/§8
- Akzeptanztest: Before continuing any IMPLEMENT round of a previously interrupted slice, Codex's round report must state which Handbuch.html sections/anchors were already changed in the partial attempt and confirm via &#96;git diff&#96; that only those declared sections are re-touched, not a wider rewrite; reviewer accepts once such a resume statement appears in the first affected round's evidence.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| A-01 | antigravity | Plan does not explicitly forbid the introduction of external network dependencies (e.g. remote fonts, CDN scripts, or external media) into Handbuch.html, which could silently break the app's strict offline capability requirement. | OBSERVATION | offen | offen |
| C-01 | claude | Plan has no explicit rule for resuming a slice interrupted mid-edit (partial section changes to the single shared Handbuch.html before a stop condition fires); only slice-boundary checks are specified in §5.4/§8 | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `NO`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
