# Arbeitsdokument: MC-Ergebnis-Cockpit

Status: Planentwurf fuer fingerprintgebundene Reviews; noch nicht freigegeben und noch nicht umgesetzt  
Stand: 2026-08-17  
Ziel-Branch: `feature/mc-ergebnis-cockpit`  
Branch-Status: lokal vorhanden; eine Veroeffentlichung auf GitHub ist in diesem Planungslauf nicht autorisiert  
Rollenvertrag: Codex plant und implementiert, genehmigt die eigene Arbeit aber nicht. Freigaben erfolgen ausschliesslich durch die vorgesehenen Reviewer beziehungsweise den Nutzer.

---

## 1. Ziel

Der Monte-Carlo-Bereich des Simulators wird von einer langen, gleichrangigen
Abfolge in ein Ergebnis-Cockpit ueberfuehrt. Die Bedienreihenfolge lautet:

1. Parameter einstellen und Lauf starten,
2. Laufstatus verfolgen,
3. Ergebnisansichten auswerten,
4. einen ausgewaehlten Lauf im Stresspfad-Replay vertiefen.

Das Cockpit gruppiert vorhandene Inhalte, macht Setup und Laufstatus kompakt,
verteilt die Ergebnisse auf eine eigene Unteransicht und ordnet das
Stresspfad-Replay als Vertiefung ein. Die vorhandene Simulatorfachlogik,
Monte-Carlo-Berechnung und Replay-Berechnung bleiben unveraendert.

## 2. Ausgangslage und Repository-Befund

Der aktuelle Quellstand belegt folgende Struktur und Laufzeitvertraege:

| Bereich | Aktueller Beleg | Folgerung fuer die Umsetzung |
| --- | --- | --- |
| DOM-Reihenfolge | In `Simulator.html` folgen auf vier MC-Parameter-`fieldset`, Start/Abbruch, Progress, Status, Fehler und Export zuerst `#stressReplayWorkspace`, dann `#print-footer` und zuletzt `#monteCarloResults`. | Ergebnisse muessen vor die Replay-Vertiefung; alle bestehenden IDs bleiben eindeutig. |
| Haupttabs | `app/simulator/simulator-main-tabs.js` bindet global auf `.tab-btn` und `.tab-panel`; `tests/browser-smoke.test.mjs` erwartet genau vier Haupttabs und genau eine `.tab-buttons`-Leiste. | Die Cockpit-Navigation verwendet weder diese Klassen noch `.tab-buttons`. |
| Ergebnisprojektion | `displayMonteCarloResults()` in `app/simulator/simulator-results.js` rendert Summary, Dashboards, Pflege und Szenario-Logs, schreibt `#scenarioSelector` per `innerHTML` neu und setzt `#monteCarloResults` sichtbar. | Die Projektion darf keine inaktive Unteransicht wieder einblenden. Verschoben wird nur der stabile Container `#scenarioSelector`, nie das dynamische `#scenarioSelect`. |
| Laufabschluss | `createMonteCarloUI()` in `app/simulator/monte-carlo-ui.js` fokussiert bei Erfolg `#monteCarloResults`, bei Fehler `#mc-error-container`, bei Abbruch `#mcButton` und waehrend des Starts die Progressbar. | Erfolgsfokus muss zuerst die Uebersicht aktivieren. Fehler-, Abbruch- und Progressfokus bleiben unveraendert sichtbar. |
| Replay-Controller | `app/simulator/stress-replay-ui.js` schreibt per ID in Banner, Status, Editor, Variantenliste und Vergleich. Fokusziele sind `#stressReplayStatus`, `#stressReplayBanner`, `#stressReplayComparison` und nach Verwerfen `#stressReplayFixButton`. | Jeder Replay-Fokus laeuft ueber denselben zentralen Aktivierungspfad, auch wenn der Nutzer waehrend einer asynchronen Aktion die Ansicht wechselt. |
| Replay-Renderer | `app/simulator/stress-replay-renderer.js` ersetzt den Inhalt von `#stressReplayComparison` bei jedem Render und erzeugt die Sektionen mit `#stressReplayKpiHeading`, `#stressReplayDeltaHeading` und `#stressReplayYearHeading`. | Vergleichs-Unteransichten muessen dynamisches Rerendern ueberstehen; Initialisierung nur an einmalig erzeugten Kindknoten ist unzulaessig. |
| Setup-Disclosure | Das generische `.collapsible`-Muster in `Simulator.html` reagiert nur auf `click` an einer `legend`; `simulator.css` begrenzt `.fieldset-content` auf `max-height: 2000px`. | Das Muster ist fuer den grossen MC-Setupblock weder tastaturzugaenglich noch sicher gegen Abschneiden und wird dort nicht wiederverwendet. |
| Druck | Fuer den Simulator existiert derzeit kein fachlicher Print-Controller; `#print-footer` ist ein leerer, eindeutiger DOM-Knoten. | Die neue Drucksemantik wird ausschliesslich per CSS abgesichert; der Footer bleibt eindeutig und wandert ans Ende des MC-Bereichs. |
| Dokumentation/Screenshots | `Handbuch.html`, `README.md`, `CHANGELOG.md` und die Referenzdokumente sind versioniert. Das lokal vorhandene Verzeichnis `Screenshots/` ist durch `.gitignore` ausgeschlossen. | Keine ignorierten Screenshotdateien werden in einen Slice aufgenommen. Visuelle Evidenz entsteht im Browser-Smoke beziehungsweise in der manuellen Abnahme, nicht als neues Build- oder Bildartefakt. |

### 2.1 Aktuelle fachliche Ursache der Unuebersichtlichkeit

- Replay steht vor den Ergebnissen, obwohl es einen abgeschlossenen Lauf und
  eine Szenarioauswahl voraussetzt.
- `#scenarioSelector` und `#stressReplayFixButton` liegen raeumlich weit
  auseinander.
- Alle Ergebnis-, Diagnose-, Editor- und Vergleichsinhalte sind gleichzeitig
  sichtbar und erzeugen einen langen Scrollpfad.
- Die vier Parametergruppen bleiben nach einem Lauf vollstaendig geoeffnet.
- Fingerprints und technische Diagnosewerte sind optisch ebenso dominant wie
  die fachlichen Kernaussagen.
- KPI-Tabelle, Delta-Timeline und Jahrestabelle des Replays werden immer
  gleichzeitig dargestellt.

## 3. Zielbild und beschlossene UI-Struktur

### 3.1 Zone 1 - Setup

Die vier bestehenden Parameter-`fieldset` bleiben als eigenstaendige
semantische Gruppen erhalten und werden gemeinsam von einer neuen nativen,
tastaturbedienbaren Setup-Disclosure umfasst. Der MC-Bereich verwendet dafuer
nicht das bestehende click-only `.collapsible`-Muster. Die Disclosure ist beim
ersten Seitenaufruf offen und wird nur nach einem erfolgreichen MC-Lauf
automatisch geschlossen. Validierungsfehler, technische Fehler und Abbruch
schliessen sie nicht automatisch.

Die sichtbare Zusammenfassung nennt Runzahl, Dauer, Methode und Seed aus den
aktuellen validierten UI-Werten. Sie ist reine Darstellung und keine zweite
Parameterquelle. `#mcButton`, `#mcCancelButton`, Progressbar und
`#mc-error-container` bleiben ihre kanonischen Knoten.

### 3.2 Zone 2 - Laufkopf

`#mcRunStatus` und `#mcRunExportActions` werden in einem Laufkopf gruppiert.
Der Status bleibt vor, waehrend und nach einem Lauf sichtbar und behaelt seine
Live-Region. Sticky-Verhalten gilt nur in der Bildschirmanzeige, sobald das
Cockpit Ergebnisinhalt zeigt. Ein neuer Button „Neu rechnen“ delegiert an den
einzigen `#mcButton`; er erhaelt keinen eigenen Rechenpfad und spiegelt dessen
disabled/busy-Zustand. Damit bleibt auch waehrend eines erneuten Laufs eindeutig,
dass nur eine Simulation aktiv sein kann.

### 3.3 Zone 3 - MC-Unteransichten

Unterhalb des Laufkopfs entsteht eine eigene Tablist mit den fuenf Ansichten:

| Ansicht | Vorhandene Inhalte |
| --- | --- |
| Ueberblick | `#monteCarloResults` mit `#monteCarloSummary` und `#unifiedKpiDashboard` |
| Risiko und Verteilung | `#advancedKpiDashboard`, `#withdrawalRateChartContainer` |
| Pflege | `#pflegeKpiResults` |
| Szenario-Logs | `#scenario-controls`, `#scenarioLogOutput`, `#scenarioExportButtons` und ein Rueckverweis zur Replay-Ansicht |
| Stresspfad-Replay | `#stressReplayWorkspace` einschliesslich des einzigen `#scenarioSelector` |

Die Navigation verwendet eigene Klassen (`.mc-view-nav`, `.mc-view-tab`,
`.mc-view-panel`) und kollidiert nicht mit der Haupttab-Steuerung. Sie folgt
dem ARIA-Tab-Muster: `role="tablist"`, `role="tab"`, `role="tabpanel"`,
eindeutige `aria-controls`/`aria-labelledby`, genau ein `tabindex="0"`,
`aria-selected`, Links-/Rechts-Pfeil sowie Home/End. Nicht aktive Panels sind
mit `hidden` aus Fokus- und Lesereihenfolge entfernt.

Vor einem Lauf bleibt die Navigation auffindbar, damit gespeicherte oder zu
importierende Replay-Arbeitsstaende weiterhin erreichbar sind. Nach jedem
erfolgreichen neuen Lauf ist „Ueberblick“ die aktive Ansicht. Der aktive
Ansichtszustand ist rein lokal, wird nicht persistiert und beeinflusst weder
Monte-Carlo- noch Replaydaten.

Eine einzige exportierte Funktion aktiviert die Unteransicht fuer eine View-ID
oder fuer einen enthaltenen Zielknoten. Alle programmatischen Fokuspfade des
MC-Cockpits muessen diese Funktion vor `focus()` verwenden. Direkte manuelle
Manipulation von `hidden`, `aria-selected` oder Tabindex ausserhalb dieses
Moduls ist unzulaessig.

### 3.4 Zone 4 - Stresspfad-Replay

Das Replay wird in drei visuelle Schritte gegliedert, ohne neuen fachlichen
State:

1. „Lauf waehlen“ ist aktiv, solange kein Workspace vorhanden ist. Hier stehen
   der stabile Container `#scenarioSelector` und `#stressReplayFixButton`
   nebeneinander.
2. „Fixierter Pfad“ ist aktiv, sobald `#stressReplayBanner` sichtbar ist.
   Quelle, Horizont und Terminalstatus erscheinen prominent; Modus,
   Fortsetzung und beide Fingerprints bleiben in einer zugaenglichen
   Detail-Disclosure innerhalb desselben Banners. Import, Export und Verwerfen
   bleiben in dieser Karte.
3. „Varianten“ ist aktiv, sobald `#stressReplayVariantFields` nicht mehr
   disabled ist. Variantenliste und Editor stehen ab 900 px nebeneinander,
   darunter untereinander. Der direkte-Kind-Vertrag des fokussierten
   `.stress-replay-editor-grid` bleibt bestehen; die 17 Expertenfelder und ihr
   ARIA-Disclosure-Vertrag bleiben erhalten.

`#scenarioSelector` existiert genau einmal. `displayMonteCarloResults()` darf
seinen dynamischen Inhalt bei jedem Lauf neu erzeugen, ohne den Container, die
Replay-Ansicht oder die zentrale Navigation zu ersetzen. Die Szenario-Log-
Ansicht enthaelt statt eines zweiten Selects einen Button, der die
Replay-Ansicht aktiviert und den vorhandenen Select fokussiert.

### 3.5 Replay-Vergleich

Innerhalb von `#stressReplayComparison` entsteht eine zweite, eindeutig
benannte Untertablist fuer „Kennzahlen“, „Delta-Timeline“ und „Jahresverlauf“.
Sie verwendet eigene `data-*`-Selektoren, nicht die Haupttab- oder MC-View-
Klassen. Da der Renderer den Container per `innerHTML` ersetzt, werden Klick-
und Tastaturereignisse delegiert; ein Rerender stellt stets den definierten
Startzustand „Kennzahlen“ her.

Vor den Detailansichten steht eine priorisierte Kernaussage. Fuer jede
vergleichbare Alternative wird in der bestehenden Variantenreihenfolge die
erste endliche, von null verschiedene Abweichung aus folgender fachlicher
Prioritaet gezeigt:

1. Mindest-Flex-Luecke (`totalMinimumFlexShortfallEur`),
2. Jahr des Vermoegensaufbrauchs (`ruinYear`),
3. Endvermoegen real (`finalValueRealEur`),
4. Endvermoegen nominal (`finalValueNominalEur`).

Die Darstellung zeigt Baselinewert, Variantenwert und bereits berechnetes
Delta. Sie berechnet keine neue Metrik, waehlt keine „beste“ Variante und
sortiert Varianten nicht um. Nicht vergleichbare technische Fehler erzeugen
keine Kernaussage; wenn keine priorisierte materielle Abweichung vorhanden ist,
wird keine leere Highlight-Karte ausgegeben. Die vollstaendigen Tabellen und
die Warnung „keine allgemeine Rangfolge oder Strategieempfehlung“ bleiben
erhalten.

## 4. Unveraenderliche Vertraege

### 4.1 DOM- und Renderer-Vertraege

- Jede vorhandene ID im MC- und Replay-Bereich bleibt genau einmal erhalten.
- Insbesondere bleiben `#mcButton`, `#mcCancelButton`,
  `#mc-progress-bar-container`, `#mcRunStatus`, `#mc-error-container`,
  `#mcRunExportActions`, `#monteCarloResults`, `#stressReplayWorkspace`,
  `#stressReplayStatus`, `#stressReplayBanner`,
  `#stressReplayVariantFields`, `#stressReplayVariantList`,
  `#stressReplayComparison`, `#scenarioSelector`, `#scenarioLogOutput`,
  `#scenarioExportButtons` und `#print-footer` eindeutig.
- `#scenarioSelect` bleibt ein dynamisches Kind des einzigen
  `#scenarioSelector`; der Container wird verschoben, nicht geklont.
- `#stressReplayVariantFields > .stress-replay-editor-grid` bleibt ein
  direkter-Kind-Vertrag.
- `#stressReplayBanner` und `#stressReplayComparison` bleiben Nachfahren von
  `#stressReplayWorkspace`.
- Die drei Vergleichsueberschriften
  `#stressReplayKpiHeading`, `#stressReplayDeltaHeading` und
  `#stressReplayYearHeading` bleiben eindeutige Rendererziele.
- Die Zahl und die Klassen der vier Simulator-Haupttabs bleiben unveraendert.

### 4.2 ARIA-, Live-Region- und Fokusvertraege

- `#mcRunStatus` und `#stressReplayStatus` bleiben polite Live-Regionen;
  `#mc-error-container` bleibt assertive Alert und fokussierbar.
- `#stressReplayPatchPreview` bleibt eine polite Live-Region. Bestehende
  Vergleichsfehler bleiben `role="alert"` und werden nicht als neutraler
  Leerzustand gerendert.
- `#monteCarloResults`, `#stressReplayStatus`, `#stressReplayBanner` und
  `#stressReplayComparison` behalten ihre programmatische Fokussierbarkeit.
- Ein erfolgreicher MC-Lauf aktiviert „Ueberblick“ vor dem Fokus auf
  `#monteCarloResults`. Abbruch fokussiert weiterhin `#mcButton`; technische
  MC-Fehler fokussieren weiterhin `#mc-error-container`.
- Replay-Status-, Banner-, Vergleichs- und Fixierfokus aktivieren zuerst die
  Replay-Ansicht. Das gilt auch nach asynchronem Import, Fixieren,
  Neuberechnen oder Verwerfen.
- Beim Aktivieren einer Unteransicht per Maus bleibt der Fokus am ausloesenden
  Tab. Bei Pfeil/Home/End folgt der Fokus dem aktivierten Tab. Ein expliziter
  „in Replay anzeigen“-Button darf danach das fachliche Ziel fokussieren.
- Verborgene Panels und die geschlossene Setup-Disclosure enthalten keine
  erreichbaren Tabstopps. In der Druckdarstellung werden sie sichtbar, ohne
  dadurch den Bildschirm-Fokuszustand zu veraendern.

### 4.3 Fach- und Datenvertraege

- Keine Engine-, Worker-, Runner-, Persistenz-, Export-, Schema-,
  Fingerprint-, KPI- oder Vergleichssemantik wird geaendert.
- `minimumFlexAnnual` wird weiterhin validiert und niemals still begrenzt.
- Der Replay-Schrittzustand wird aus Workspace/Banner/Fieldset abgeleitet und
  nicht separat gespeichert.
- Ein erneuter MC-Lauf darf den Replay-Workspace nicht duplizieren oder
  unbemerkt verwerfen. Er ersetzt nur die aktuelle MC-Auswahl und rendert den
  Inhalt des bestehenden `#scenarioSelector` neu.
- Bestehende Status- und Fehlertexte der Controller bleiben erhalten. Neue
  Texte sind auf Navigation, Gruppierung, Rueckverweis und Kernaussage
  begrenzt.

### 4.4 Druckvertrag

Im Druckmedium werden die Setup-Inhalte unabhaengig vom Bildschirmzustand
vollstaendig gezeigt. Alle fuenf MC-Panels und alle drei Replay-
Vergleichssektionen werden in DOM-Reihenfolge gedruckt; Tablisten, reine
Umschaltaktionen und Sticky-Verhalten werden deaktiviert. Kein Setup- oder
Tabinhalt darf durch `hidden`, feste Hoehen oder `overflow` abgeschnitten
werden. Breite Tabellen duerfen umbrechen beziehungsweise seitenweise
fortgesetzt werden, ohne horizontales Abschneiden von Kernaussagen. Der
eindeutige `#print-footer` bleibt am Ende des MC-Bereichs.

## 5. Nicht-Scope

- Aenderungen an Engine, `engine.js`, Workern, Monte-Carlo- oder Replay-Runnern.
- Neue KPIs, geaenderte KPI-Prioritaeten, Strategie-Rankings oder
  Finanzempfehlungen.
- Aenderungen an Persistenz, Exportformaten, Fingerprints, Quellidentitaeten,
  Profilen oder Tranchen.
- Ein fuenfter Simulator-Haupttab oder Wiederverwendung der globalen
  Haupttab-Klassen.
- Neue Charttypen, neue Szenarioauswahl oder Mehrfachauswahl von Laeufen.
- Manuelle Aenderungen an `engine.js`, `dist/`, `RuheStandSuite.exe`,
  Tauri-Releaseartefakten oder ignorierten `Screenshots/`-Dateien.
- Ein allgemeines Redesign anderer Simulator-Tabs oder des bestehenden
  generischen `.collapsible`-Musters.

## 6. Stopbedingungen fuer die Umsetzung

Die Umsetzung stoppt vor weiteren Codeaenderungen und eskaliert an den Nutzer
beziehungsweise Orchestrator, wenn mindestens einer der folgenden Faelle
eintritt:

- Eine geforderte Darstellung waere nur durch Aenderung von Engine-, Runner-,
  KPI-, Vergleichs-, Persistenz-, Export- oder Fingerprintsemantik erreichbar.
- UI und Engine verwenden unterschiedliche Parameternamen oder
  `minimumFlexAnnual` muesste geklemmt statt validiert werden.
- Eine bestehende ID muesste dupliziert oder ein Renderer-/Direkt-Kind-Vertrag
  gebrochen werden.
- Ein Fokusziel kann nicht verlaesslich vor `focus()` sichtbar aktiviert
  werden oder die neue Tabstruktur laesst verborgene fokussierbare Inhalte
  zurueck.
- Replay-Import beziehungsweise ein gespeicherter Replay-Workspace waere vor
  einem neuen MC-Lauf nicht mehr erreichbar.
- Ein zweiter MC-Lauf ersetzt `#scenarioSelector` selbst, erzeugt ein zweites
  `#scenarioSelect` oder verliert die Bindung zum Replay-Controller.
- Die Druckansicht kann geschlossene Setup- oder inaktive Tabinhalte nicht
  vollstaendig und ohne Abschneiden darstellen.
- Browser-Smoke-, Snapshot-, Backtest- oder FlowDelta-Ergebnisse weichen
  ausserhalb der ausdruecklich geplanten Sichtbarkeits-/Navigationsaenderung
  ab.
- Die Aenderung eines bestehenden Browser-Smoke-Asserts reduziert Abdeckung,
  ohne den neuen Bedienweg mindestens gleichwertig zu pruefen.
- Ein Slice benoetigt mehr als zehn produktive Dateien oder einen Pfad
  ausserhalb seines exakten Aenderungspfads.
- Die notwendige fokussierte oder abschliessende Validierung ist nicht
  ausfuehrbar und kann nicht sinnvoll gleichwertig ersetzt werden.

## 7. Implementierungsslices

Die Slices sind strikt in der folgenden Reihenfolge auszufuehren. Vor jedem
Slice gelten Branch-/Statuscheck, Diff-Risiko und Slice-Dokumentation aus
`docs/internal/SLICE_EXECUTION_RULES.md`. Kein Slice darf einen bewusst roten
Zwischenzustand an einen fachlich unabhaengigen Folgeslice weitergeben.

### Slice 01 - Cockpit-Grundstruktur, Setup und Laufkopf

**Zweck**

Die DOM-Reihenfolge wird in Setup, Laufkopf, Ergebnisbereich und Replay-
Vertiefung gegliedert. Eine native, tastaturbedienbare Setup-Disclosure ersetzt
fuer diesen Bereich die ungeeignete Wiederverwendung des click-only
Collapsible-Musters. Der Laufkopf erhaelt den delegierenden, zustandssynchronen
„Neu rechnen“-Button. Das neue UI-Modul kapselt Setup-Disclosure,
Parameterzusammenfassung und Laufkopfzustand; der App-Bootstrap initialisiert
es genau einmal.

**Abhaengigkeiten**

- Keine vorherigen Umsetzungsslices.
- Bestehende MC-UI-Lifecycle-Hooks in `createMonteCarloUI()` bleiben die
  einzige Quelle fuer begin/completed/error/cancel/finish.

**Akzeptanzkriterien**

- Alle vier Parameter-Fieldsets und alle vorhandenen IDs existieren genau
  einmal; die fachliche Feldreihenfolge bleibt erhalten.
- Setup ist initial offen, per Tastatur bedienbar und wird ausschliesslich
  nach `showCompleted()` automatisch geschlossen.
- Die Zusammenfassung aktualisiert Runzahl, Dauer, Methodenlabel und Seed,
  ohne Werte zu normalisieren oder zu speichern.
- Laufstatus und Progress bleiben waehrend des Laufs sichtbar; Fehler- und
  Abbruchfokus bleiben unveraendert.
- „Neu rechnen“ delegiert an `#mcButton`, ist waehrend Run/Cancelling gesperrt
  und erzeugt keinen zweiten Event- oder Runnerpfad.
- Es gibt keine feste Hoehe, die den geoeffneten Setup-Inhalt abschneiden kann.

**Risiken**

- Doppeltes Ausloesen durch Inline-`onclick` und neuen Delegationshandler.
- Versehentliches Schliessen bei Fehler oder Abbruch.
- Divergierende disabled/busy-Zustaende der beiden Startaktionen.

**Konkrete Validierung**

- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`
- Browser-Smoke: Setup mit Maus, Enter und Space oeffnen/schliessen; Fehler und
  Abbruch lassen Setup offen; Erfolg schliesst es; „Neu rechnen“ startet genau
  einen Lauf.
- DOM-Pruefung auf eindeutige Kern-IDs und weiterhin genau vier Haupttabs.

**Exakter Änderungspfad**

- `Simulator.html`
- `simulator.css`
- `app/simulator/mc-result-cockpit.js`
- `app/simulator/simulator-main-init.js`
- `app/simulator/monte-carlo-ui.js`
- `tests/mc-result-cockpit.test.mjs`
- `tests/browser-smoke.test.mjs`

### Slice 02 - Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad

**Zweck**

Die fuenf MC-Unteransichten werden mit eigenem ARIA-Tabvertrag umgesetzt. Die
vorhandenen Ergebniscontainer werden den Panels zugeordnet. Das Cockpit-Modul
stellt den einzigen Aktivierungspfad fuer View-ID und Zielknoten bereit;
Ergebnisprojektion und MC-Erfolgsfokus verwenden ihn.

**Abhaengigkeiten**

- Slice 01 ist gruen und reviewed.
- Der Laufkopf und das einmal initialisierte Cockpit-Modul sind vorhanden.

**Akzeptanzkriterien**

- Genau eine MC-View-Tablist mit fuenf Tabs und fuenf eindeutig zugeordneten
  Panels; die vier Haupttabs bleiben unveraendert.
- Maus, Links/Rechts, Home/End, roving Tabindex, `aria-selected`, `hidden` und
  Fokus folgen dem in Abschnitt 3.3 beschriebenen Vertrag.
- Vor einem Lauf ist die Replay-Ansicht ueber die Tablist erreichbar; Import
  und gespeicherte Workspaces bleiben bedienbar.
- Nach jedem erfolgreichen Lauf wird Ueberblick aktiviert, bevor
  `#monteCarloResults` fokussiert wird.
- `displayMonteCarloResults()` macht kein inaktives Panel nebenbei sichtbar.
- Der Varianten-Badge wird aus der vorhandenen Workspace-Variantenanzahl
  abgeleitet, ist rein informativ und wird fuer null Alternativen nicht
  angezeigt.
- Die bisherigen Browser-Smoke-Sichtbarkeitsasserts fuer Replay-Felder werden
  bewusst auf „Replay-Tab aktivieren, dann sichtbar“ umgestellt; Vorhandensein,
  disabled-Zustand, Feldzahl und ARIA bleiben gleichwertig abgesichert.

**Risiken**

- Kollision mit den globalen `.tab-btn`/`.tab-panel`-Selektoren.
- Erfolgsfokus landet im verborgenen Ueberblick.
- Inline-`display` aus der Ergebnisprojektion ueberstimmt den Panelzustand.
- Die neue Navigation verschlechtert die Auffindbarkeit des initialen
  Replay-Imports.

**Konkrete Validierung**

- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`
- `npm run test:browser` als orchestratorseitiges Browser-Gate.
- Browserasserts fuer genau vier Haupttabs, genau eine `.tab-buttons`-Leiste,
  fuenf MC-View-Tabs, alle Tastaturwege, verborgene Tabstopps und sichtbaren
  Erfolgsfokus.

**Exakter Änderungspfad**

- `Simulator.html`
- `simulator.css`
- `app/simulator/mc-result-cockpit.js`
- `app/simulator/monte-carlo-ui.js`
- `app/simulator/simulator-results.js`
- `tests/mc-result-cockpit.test.mjs`
- `tests/browser-smoke.test.mjs`

### Slice 03 - Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus

**Zweck**

Das Replay wird in die drei abgeleiteten Schrittkarten ueberfuehrt.
`#scenarioSelector` zieht neben `#stressReplayFixButton`; die Logansicht
erhaelt den Rueckverweis. Bannerdiagnose, Aktionen, Variantenliste und Editor
werden visuell priorisiert. Alle Replay-Fokusaufrufe aktivieren zentral die
Replay-Ansicht.

**Abhaengigkeiten**

- Slice 02 ist gruen und reviewed.
- Der zentrale Aktivierungspfad fuer enthaltene Zielknoten ist vorhanden.

**Akzeptanzkriterien**

- `#scenarioSelector` und das dynamische `#scenarioSelect` existieren jeweils
  hoechstens einmal; Auswahl und Fixieraktion stehen in derselben Karte.
- Ein initialer Lauf, ein zweiter Lauf und ein Ergebnis-Rerender befuellen
  denselben Container, binden genau einen aktuellen Change-Handler und lassen
  Fixieren weiterhin funktionieren.
- Der Rueckverweis aus Szenario-Logs aktiviert Replay und fokussiert das
  vorhandene Select; ohne Lauf fokussiert er einen sinnvollen Replay-Hinweis.
- Banner-IDs und alle sieben vorhandenen `dt`/`dd`-Werte bleiben erhalten;
  Diagnosewerte in der Detail-Disclosure sind per Tastatur erreichbar.
- `.stress-replay-editor-grid` bleibt direktes Kind des Fieldsets; die vier
  fokussierten Felder, die 17 Expertenfelder, deren Werteerhalt und ARIA-
  Zustand bleiben unveraendert.
- Fokus auf Status, Banner, Vergleich oder Fixierbutton reaktiviert Replay
  auch dann, wenn waehrend einer asynchronen Operation ein anderes Panel
  ausgewaehlt wurde.
- Unter 900 px stapeln sich Variantenliste und Editor ohne horizontalen
  Seitenoverflow.

**Risiken**

- `innerHTML`-Rerender des Selects verliert Handler oder erzeugt Duplikate.
- Ein asynchroner Abschluss fokussiert einen Knoten in einem inzwischen
  verborgenen Panel.
- Neue Wrapper brechen direkte-Kind- oder Workspace-Nachfahrenvertraege.
- Detail-Disclosure verbirgt Diagnosewerte auch im Druck.

**Konkrete Validierung**

- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`
- `npm run test:browser` als orchestratorseitiges Browser-Gate.
- Echter Browserablauf: zwei kleine MC-Laeufe nacheinander, Worst-Run-Auswahl,
  Replay-Tab/Rueckverweis, Fixieren, Experten-Disclosure, Import/Verwerfen und
  Fokuswechsel waehrend einer kontrolliert verzoegerten Aktion.

**Exakter Änderungspfad**

- `Simulator.html`
- `simulator.css`
- `app/simulator/mc-result-cockpit.js`
- `app/simulator/simulator-results.js`
- `app/simulator/stress-replay-ui.js`
- `tests/mc-result-cockpit.test.mjs`
- `tests/stress-replay-ui.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-monte-carlo-browser.mjs`

### Slice 04 - Replay-Vergleichsansichten und priorisierte Kernaussage

**Zweck**

Der Renderer ergaenzt eine rerenderfeste, delegierte Untertablist fuer KPI,
Delta und Jahresverlauf sowie die in Abschnitt 3.5 festgelegte Kernaussage je
Alternative. Die bestehenden vollstaendigen Sektionen bleiben gerendert und
werden nur fuer die Bildschirmansicht umgeschaltet.

**Abhaengigkeiten**

- Slice 03 ist gruen und reviewed.
- Replay-Ansicht und zentral delegierte UI-Ereignisbehandlung sind vorhanden.

**Akzeptanzkriterien**

- Die drei vorhandenen Vergleichssektionen und Heading-IDs bleiben im HTML des
  Renderers erhalten; Standardansicht nach jedem Rerender ist Kennzahlen.
- Die Vergleichs-Tablist ist vollstaendig per Maus, Links/Rechts und Home/End
  bedienbar und kollidiert weder mit Haupttabs noch MC-View-Tabs.
- Pro vergleichbarer Alternative erscheint hoechstens eine Kernaussage in
  bestehender Reihenfolge und nach der festen KPI-Prioritaet; keine Sortierung,
  Empfehlung oder neue Rechenmetrik entsteht.
- Nullabweichungen, `not_applicable`, Missingness und technische Fehler werden
  nicht zu materiellen Highlights umgedeutet.
- Bestehende Delta-Einheiten fuer EUR, Jahre und Prozentpunkte bleiben
  eindeutig; Fehlerdiagnostik bleibt escaped und alert-semantisch.
- Rerender durch Hinzufuegen, Entfernen oder Neuberechnen einer Variante
  erzeugt keine doppelten Listener und keine verwaisten Tabs.

**Risiken**

- Der `innerHTML`-Austausch entkoppelt Tabs und Panels.
- Ruin-Missingness wird faelschlich als Nullabweichung interpretiert.
- Eine einzelne Highlight-Auswahl wird irrtuemlich als Variantenranking
  verstanden.
- Verborgene Vergleichsteile fehlen in der Druckansicht.

**Konkrete Validierung**

- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`
- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`
- Browser-Smoke fuer Tastaturumschaltung, Rerender, Fokus auf einen sichtbaren
  Vergleichsfehler und Drucksichtbarkeit aller drei Sektionen.

**Exakter Änderungspfad**

- `simulator.css`
- `app/simulator/mc-result-cockpit.js`
- `app/simulator/stress-replay-renderer.js`
- `tests/mc-result-cockpit.test.mjs`
- `tests/stress-replay-renderer.test.mjs`
- `tests/stress-replay-ui.test.mjs`
- `tests/browser-smoke.test.mjs`

### Slice 05 - Responsive-/Druckabschluss und Dokumentationssync

**Zweck**

Der implementierte Gesamtworkflow wird in den versionierten Nutzer-,
Architektur-, Modul-, Test- und Aenderungsdokumenten synchronisiert. Die
abschliessende Matrix prueft Bildschirm, Tastatur, Fokus und Druck. Es werden
keine ignorierten Screenshots und keine Build-/Releaseartefakte erzeugt oder
geaendert.

**Abhaengigkeiten**

- Slice 01 bis 04 sind gruen und jeweils reviewed.
- Alle produktiven Zielvertraege sind implementiert; dieser Slice erweitert
  keine Fach- oder UI-Semantik mehr.

**Akzeptanzkriterien**

- Handbuch und README beschreiben den Bedienweg Setup -> Laufstatus ->
  Ergebnisansichten -> Replay sowie die priorisierte, nicht empfehlende
  Replay-Kernaussage.
- Technische Referenzen dokumentieren das neue UI-Modul, Aktivierungs-/
  Fokuscontract, dynamischen Selector-Rerender und Druckvertrag.
- Testdokumentation nennt den neuen fokussierten Test und die erweiterte
  Browserabdeckung; Changelog benennt die UI-Neuordnung ohne fachliche
  Ergebnisveraenderung.
- Bei 320, 768, 900, 1280 und 1600 CSS-Pixeln entstehen weder Seitenoverflow
  noch abgeschnittene Setup-, Karten-, Tabellen- oder Navigationsinhalte.
- Kontrast, sichtbarer Fokus, Tab-Reihenfolge, Pfeil/Home/End, Disclosure-
  Bedienung und asynchrone Fokusreaktivierung sind manuell oder automatisiert
  geprueft.
- Print-Emulation zeigt Setup, alle MC-Panels und alle Vergleichssektionen,
  deaktiviert Sticky/Navigation und schneidet keine Inhalte durch feste Hoehen
  oder Overflow ab.
- `npm test` und `npm run test:browser` bestehen als orchestratorseitige
  Abschlussgates. Da weder `engine/` noch die oeffentliche `EngineAPI`
  geaendert werden, ist `npm run build:engine` nicht erforderlich.

**Risiken**

- Dokumentation beschreibt einen nicht implementierten Zwischenstand.
- Print-CSS macht Bildschirminhalte sichtbar, laesst aber `hidden`-Nachfahren
  oder geschlossene Details weiterhin aus.
- Das 900-px-Breakpointverhalten erzeugt genau an der Grenze Overflow.
- Lokale ignorierte Screenshots geraten unbeabsichtigt in den Scope.

**Konkrete Validierung**

- `npm test` durch den Orchestrator.
- `npm run test:browser` durch den Orchestrator.
- Playwright-Print-Emulation plus Druckvorschau in Chromium; Sichtpruefung der
  oben genannten Viewports und eines langen 35-Jahres-Vergleichs.
- `git diff --name-only` gegen die vereinigten exakten Slice-Pfade; kein Pfad
  unter `Screenshots/`, `dist/`, `src-tauri/` und kein `engine.js`.

**Exakter Änderungspfad**

- `README.md`
- `Handbuch.html`
- `CHANGELOG.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `tests/README.md`

## 8. Abschlussvalidierung und Nachweis

Die Implementierung ist erst bereit fuer das branchweite Gesamtreview, wenn
alle Slice-Validierungen und folgende zusammenhaengende Nutzerablaeufe
bestanden sind:

1. Simulator per Tastatur oeffnen, MC-Haupttab aktivieren, Setup bedienen und
   einen kleinen Lauf starten.
2. Progress, Live-Status, Abbruch sowie ein kontrollierter Fehlerpfad bleiben
   sichtbar und fokussieren ihre bisherigen Ziele.
3. Erfolgreicher Lauf schliesst Setup, aktiviert Ueberblick und fokussiert
   sichtbar `#monteCarloResults`; „Neu rechnen“ startet genau einen Folgelauf.
4. Alle fuenf Ansichten sind per Tab und Pfeiltasten erreichbar. Verborgene
   Panels besitzen keine Tabstopps; Browser-Zurueck/Reload erzeugt keinen
   persistierten Viewzustand.
5. Szenario-Logs verweisen auf das einzige Select in Replay. Zwei aufeinander
   folgende MC-Laeufe lassen genau ein `#scenarioSelector` und ein
   `#scenarioSelect` mit aktueller Auswahlbindung zurueck.
6. Fixieren, Variantenpatch, Expertenfelder, Vergleich, Fehler, Import und
   Verwerfen funktionieren; programmatischer Fokus reaktiviert bei Bedarf das
   Replay-Panel.
7. Vergleichs-Untertabs ueberstehen Renderer-Rerender. Kernaussagen verwenden
   nur vorhandene Deltas, erhalten Missingness/Fehler und erzeugen kein
   Variantenranking.
8. Responsive- und Druckmatrix aus Slice 05 besteht, einschliesslich komplett
   geoeffnetem Setup und allen im Bildschirmmodus verborgenen Drucksektionen.
9. Standardsuite und separates Browser-Gate bestehen. Abweichungen von
   Snapshots, Backtests, FlowDelta oder Engineergebnissen stoppen das Handoff.

## 9. Reviewstatus und Restrisiken

Der fruehere Text „freigegeben“ war nur eine inhaltliche Vorpruefung und ist
keine fingerprintgebundene Freigabe. Dieser Plan ist bis zu den vorgesehenen
Claude- und Antigravity-Reviews nicht genehmigt. Codex erteilt keine
Selbstfreigabe.

Groesste verbleibende Risiken fuer das Review:

- Ein kuenftiger Fokusaufruf umgeht den zentralen Aktivierungspfad und landet
  in einem verborgenen Panel.
- Ein Rerender ersetzt dynamische Vergleichs- oder Selectknoten und verliert
  nicht delegierte Eventbindungen.
- Print-CSS beruecksichtigt `hidden` oder geschlossene native Details nicht
  vollstaendig.
- Die Kernaussage wird trotz unveraenderter Variantenreihenfolge sprachlich
  als Empfehlung missverstanden.

Pre-Mortem fuer das spaetere Review: Angenommen, die Umsetzung verursacht in
drei Monaten einen Produktfehler, ist die wahrscheinlichste Ursache ein neuer
Renderer- oder Async-Pfad, der direkt `focus()` beziehungsweise `hidden`
manipuliert und dadurch den zentralen View-Aktivierungsvertrag umgeht. Der
Fehler zeigt sich dann als korrekte Live-Meldung ohne sichtbaren Kontext.

## Orchestrator-Pruefprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-fc3db1ff17d9`
- Testdateien: keine
- Prüfdimensionen: checked plan-contract structure/heading/path syntax, slice ordering and dependency chain, per-slice five-part completeness, productive-file counts vs. the 10-file stop rule, DOM/ARIA/focus/print invariants and their explicit slice-level acceptance coverage, non-scope/generated-artifact exclusions, and correction of the stale "freigegeben" status text against the fingerprint-bound attestation
- Größtes Restrisiko: Largest residual risk: a later implementation slice adds a new async or renderer focus/hidden path that bypasses the single central view-activation function described in §3.3, silently landing focus in a hidden panel (already self-flagged in the plan's own §9 pre-mortem)
- Realistische Bruchbedingung: Break condition: any Slice 02–04 implementation calls &#96;focus()&#96; or toggles &#96;hidden&#96;/&#96;aria-selected&#96; directly on a MC-view or replay panel without routing through the exported central activation function, or Slice 05's print emulation ships with a collapsed native &#96;&lt;details&gt;&#96; hiding diagnostic content.
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-fc3db1ff17d9`
- Testdateien: keine
- Prüfdimensionen: checked plan-contract structure, 1-based sequential slice hierarchy (Slices 01–05), canonical heading and exact path allowlist compliance, per-slice file count bounds (all &lt;= 10), non-scope boundaries and excluded generated/screenshot artifacts, DOM/ARIA/focus invariants (isolation of 4 main tabs from 5 MC sub-tabs, polite live regions, central view activation routing before focus), single #scenarioSelector lifecycle across rerenders, Replay 3-step cards, comparison sub-tabs with prioritized non-recommendation key messages, print disclosure overrides, and slice-level validation coverage against repository evidence
- Größtes Restrisiko: Largest residual risk: a future async callback or error handler in stress-replay-ui.js calls focus() directly on a sub-element rather than routing through the centralized mc-result-cockpit activation helper, stranding focus on an element inside a hidden tab panel
- Realistische Bruchbedingung: Break condition: any Slice 02–04 implementation bypasses the exported central activation function when focusing #monteCarloResults, #stressReplayBanner, #stressReplayStatus, or #stressReplayComparison, or mutates hidden/aria-selected directly outside mc-result-cockpit.js
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-fc3db1ff17d9`

- Diff-Fingerprint: `fc3db1ff17d9889df3f1cfad7ef3ce7c2691b8a10a886d507bf552d9b36dfdf7`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `17312ef5f2f98ad84eff5fc96a1196eb31d0cdadb546475a6cb1821227abed8b`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=5; work_plan=docs/internal/MC_ERGEBNIS_COCKPIT_UI_ARBEITSPLAN.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months the most likely failure is a maintenance patch to &#96;stress-replay-ui.js&#96; or the comparison renderer that adds a quick &#96;focus()&#96;/&#96;hidden&#96; toggle directly instead of going through the mc-result-cockpit central activation module (the exact anti-pattern the plan's own §9 pre-mortem names), producing a live-region announcement with no visible context, compounded by the print stylesheet still not force-opening the banner's diagnostic &#96;&lt;details&gt;&#96; from C-01.
  - Ereignis 3: In three months, the most likely failure cause is a maintenance patch adding an asynchronous notification or error branch in the stress replay workflow that calls focus() directly on a DOM element instead of going through the mc-result-cockpit activation helper, resulting in screen reader announcements and programmatic focus landing on an element whose enclosing tab panel is currently hidden.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: §4.4 and Slice 05's print acceptance criteria only name &#96;hidden&#96;, fixed heights, and &#96;overflow&#96; as forbidden content-hiding mechanisms; they do not explicitly require the print stylesheet to force open the native &#96;&lt;details&gt;&#96; "Detail-Disclosure" that carries the replay banner's mode/continuation/fingerprint diagnostics. §9 itself already flags "geschlossene native Details" as a residual print risk, so the gap is self-acknowledged but not yet turned into a checkable Slice-05 criterion, creating a risk that the print-emulation pass in Slice 05 exercises only the enumerated mechanisms and silently ships collapsed diagnostic details in print output.
- Akzeptanztest: Before/while implementing Slice 05, confirm the print stylesheet forces &#96;[open]&#96; (or an equivalent display override) on every native &#96;&lt;details&gt;&#96; used by the Setup summary and the Replay banner Detail-Disclosure, and confirm the Slice 05 print checklist explicitly asserts the banner's fingerprint/mode/continuation values are present in the printed DOM, not only that hidden/height/overflow rules were relaxed.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | §4.4 and Slice 05's print acceptance criteria only name &#96;hidden&#96;, fixed heights, and &#96;overflow&#96; as forbidden content-hiding mechanisms; they do not explicitly require the print stylesheet to force open the native &#96;&lt;details&gt;&#96; "Detail-Disclosure" that carries the replay banner's mode/continuation/fingerprint diagnostics. §9 itself already flags "geschlossene native Details" as a residual print risk, so the gap is self-acknowledged but not yet turned into a checkable Slice-05 criterion, creating a risk that the print-emulation pass in Slice 05 exercises only the enumerated mechanisms and silently ships collapsed diagnostic details in print output. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `NOT_RECORDED`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`
<!-- audit:approval-status:end -->
