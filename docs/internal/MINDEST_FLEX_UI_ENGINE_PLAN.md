# Mindest-Flex p.a. in UI und Engine

Status: in Umsetzung (Slice 1-3 umgesetzt)
Datum: 2026-06-01

## Anlass

Der Backtest 2000-2025 zeigt in den Jahren 2005-2014 sehr harte Flex-Reduktionen. Diese Reduktionen sind als Sequenzrisiko-Bremse fachlich nachvollziehbar, koennen aber als reale Lebensstrategie zu asketisch sein.

Der Floor sollte nicht kuenstlich erhoeht werden, nur um einen Mindest-Lebenskomfort in Krisenjahren abzubilden. Floor bleibt der unverzichtbare Basisbedarf. Fuer den Komfort-/Flex-Anteil braucht es deshalb ein eigenes Feld.

## Zielbild

Die App erhaelt ein Eingabefeld **Mindest-Flex p.a. (EUR)**.

Das Feld definiert eine **bedingte Komfort-Untergrenze** fuer Flex-Ausgaben. Es soll die brutalsten Kuerzungsjahre entschaerfen, ohne die normale Spending-Logik oder den Floor-Begriff zu verwaessern.

Wichtig: `Mindest-Flex p.a.` ist keine harte Garantie. Der Wert wird nur gehalten, solange keine explizit definierten Notfallbedingungen greifen.

Gewaehlte Produktentscheidung:

- Feldtyp: absoluter Euro-Betrag pro Jahr.
- Wirkung: als bedingte Untergrenze fuer Flex-Ausgaben in kuerzenden Safety-/Guardrail-Situationen, sowohl mit Dynamic Flex als auch ohne Dynamic Flex.
- Finanzierung: ueber die normale bestehende Engine-Logik; keine Sonderregel "immer ETF verkaufen".
- Pipeline-Position: ein einheitlicher Schritt `applyMinimumFlexFloor` in der Spending-Policy-Pipeline; keine zweite Sondermutation in `core.mjs`.
- Standardwert: `0`, damit bestehende Profile und alte Backtests unveraendert bleiben.

## Fachliche Regeln

- `minimumFlexAnnual = 0` oder leer bedeutet: heutiges Verhalten.
- Der Mindest-Flex ist kein Floor und ersetzt den Floor nicht.
- Der Mindest-Flex greift, wenn die Engine Flex-Ausgaben unter diesen Betrag kuerzen wuerde.
- Mit Dynamic Flex wirkt er in kuerzenden Safety-/Guardrail-Phasen, einschliesslich `safety_static_flex` / Stage 2.
- Ohne Dynamic Flex bezieht er sich auf den normalen Parameter `Flex Bedarf p.a.` und verhindert, dass gekuerzte Flex-Ausgaben unter den Mindest-Flex fallen, sofern keine Notfallbedingungen greifen.
- Der Mindest-Flex hebt den gekuerzten Flex nur bis zum definierten Betrag an.
- Wenn keine Kuerzung unterhalb des Mindest-Flex entsteht, greift der Mindest-Flex nicht.
- `Flex Bedarf p.a.` bleibt die fachliche Obergrenze: `0 <= minimumFlexAnnual <= flexBedarf`.

### Prioritaet bei Stress und echter Notlage

Der Mindest-Flex ist eine bedingte Komfort-Untergrenze, aber keine harte Zahlungsgarantie. Die Prioritaeten sind:

1. Zahlungsfaehigkeit erhalten.
2. Floor-Bedarf schuetzen.
3. Notfall-/Runway-Regeln einhalten.
4. Flex-Budget-Cap und endliche Flex-Reserve respektieren.
5. Mindest-Flex halten, wenn keine Notfallbedingungen greifen.
6. Restlichen Flex-Bedarf freigeben, wenn die Strategie es erlaubt.

Der Mindest-Flex darf unterschritten werden, wenn sonst Floor-Deckung, Liquiditaet, Runway-Notfallregeln, Flex-Budget-Cap oder technische Finanzierbarkeit verletzt wuerden. In diesem Fall darf die Engine Flex-Ausgaben bis auf `0` reduzieren; die effektive Entnahme kann dann bis auf den Floor bzw. den nach Rente verbleibenden Floor-Bedarf fallen.

Diese Unterschreitung muss in Diagnose und Backtest sichtbar sein, z. B. mit Status `Mindest-Flex unterschritten wegen Notfall/Floor-Schutz`.

### Konkrete Notfallbedingungen

`applyMinimumFlexFloor` darf den Flex nicht anheben, wenn eine der folgenden Bedingungen gilt:

- Alarmmodus ist aktiv (`alarmStatus.active === true`).
- Vermoegensdeckungs-Proxy zeigt, dass der netto Floor plus Mindest-Flex nicht tragfaehig ist.
- Vermoegensdeckungs-Proxy zeigt, dass der Mindest-Runway nach plausibler Wiederauffuellung nicht wiederherstellbar waere.
- `inflatedBedarf.flex <= 0`, weil kein offener Flex-Bedarf mehr existiert, z. B. durch Rentenueberschuss.

Diese Bedingungen verwenden bewusst nur Informationen aus dem Spending-Layer. Der Spending-Planner prueft keine Tranchen, Steuern, Mindesthandelsvolumen oder konkrete Transaktionsausfuehrung; diese Verantwortung bleibt bei der Transaction-Engine.

Der Vermoegensdeckungs-Proxy nutzt Gesamtvermoegen und Jahresbedarf, nicht nur die aktuelle Liquiditaet vor Transaktionen. Dadurch wird keine Schein-Notlage erzeugt, wenn Cash am Jahresanfang niedrig ist, aber das Depot gross genug ist, um die Liquiditaet regulaer wieder aufzufuellen.

### Flex-Budget-Prioritaet

Wenn Flex-Budget-Cap und Mindest-Flex kollidieren, gewinnt der Flex-Budget-Cap.

Begruendung: Das Flex-Budget bildet eine endliche Reserve fuer Flex-Ausgaben ab. Ein Mindest-Flex, der den Cap uebersteuert, wuerde diesen Reserveschutz aushebeln.

Um keine Budget-Logik zu duplizieren, laeuft `applyMinimumFlexFloor` vor `applyFlexBudgetCap()`. Wenn der Mindest-Flex die Rate anhebt, prueft der bestehende Flex-Budget-Cap anschliessend die erhoehte Rate und kuerzt sie bei Bedarf wieder. Die Diagnose muss diesen Fall explizit ausweisen, z. B. `Mindest-Flex durch Flex-Budget-Cap begrenzt`.

### Inflationsbehandlung

`minimumFlexAnnual` ist ein real gemeinter Jahresbetrag und muss denselben Inflationspfad wie `floorBedarf`, `flexBedarf`, `flexBudgetAnnual` und `flexBudgetRecharge` durchlaufen.

- Balance-Jahresupdate: `minimumFlexAnnual` wird in `applyInflationToBedarfe()` mit angepasst.
- Simulator/Backtest: Der Wert wird in derselben Input-Fortschreibung wie `flexBedarf` weitergegeben.
- Profilverbund: Inflation bleibt profilbezogen.
- Validierung `minimumFlexAnnual <= flexBedarf` erfolgt nach derselben nominalen/fortgeschriebenen Wertbasis.

## Engine-Integration

Die Eingabe wird als neuer Input-Parameter eingefuehrt, fachlich `minimumFlexAnnual`.

Validierung und Normalisierung:

- akzeptiert nichtnegative Jahresbetraege;
- leere, fehlende oder ungueltige Werte fallen auf `0` zurueck;
- fachlicher Gueltigkeitsbereich: `0 <= minimumFlexAnnual <= flexBedarf`;
- wenn `minimumFlexAnnual > flexBedarf`, soll die UI sichtbar warnen und das Speichern bzw. Anwenden verhindern; keine stille automatische Begrenzung;
- funktioniert unabhaengig davon, ob Dynamic Flex aktiv ist.

Spending-Logik:

- Heute wird der effektive Flex je nach Profil, Guardrails, Flex-Budget, Dynamic Flex und Safety-State gekuerzt.
- Neu wird ein benannter Pipeline-Schritt `applyMinimumFlexFloor` eingefuehrt.
- Der Schritt arbeitet auf der bereits berechneten Flex-Rate und hebt diese nur so weit an, dass der effektive Flex maximal `minimumFlexAnnual` erreicht.
- Die Berechnung erfolgt ueber die Rate, nicht durch Mutation von `inflatedBedarf.flex`.
- Dynamic-Flex-Stage-2 bleibt unveraendert bei seiner bestehenden internen Bodenlogik:
  - statischer Safety-Flex,
  - Anteil am Floor (`STAGE2_MIN_FLEX_OF_FLOOR_RATIO`),
  - Anteil an der letzten Dynamic-Flex-Hoehe (`STAGE2_MIN_FLEX_OF_PREV_DYNAMIC_RATIO`).
- `minimumFlexAnnual` wird nicht als weiterer Kandidat in diesen Stage-2-`Math.max()` aufgenommen. Dadurch gibt es nur einen Feature-Eingriffspunkt.
- Ohne Dynamic Flex ist `Flex Bedarf p.a.` die fachliche Obergrenze, und `minimumFlexAnnual` die bedingte Untergrenze fuer gekuerzten Flex.

Funktionssignatur und Datenfluss:

- `applyMinimumFlexFloor(flexRate, context, addDecision)` soll eine reine Policy-Funktion sein.
- `context` enthaelt mindestens `inflatedBedarf`, `input`, `market`, `profil`, `runwayMonate`, `alarmStatus`, `state`, `flexBudgetResult` und `kuerzungQuelle`.
- Rueckgabe: `{ rate, applied, status, requiredRate, effectiveFlexBefore, effectiveFlexAfter, blockReason }`.
- Die Funktion mutiert weder `inflatedBedarf` noch `input`.
- Falls Diagnosewerte in `state.keyParams` benoetigt werden, werden nur klar benannte Mindest-Flex-Felder geschrieben, z. B. `minimumFlexStatus`, `minimumFlexBlockReason`, `minimumFlexRequiredRate`.

Stage-2-Interaktion:

- Dynamic-Flex-Stage-2 darf weiterhin den Basis-Flex intern stark reduzieren.
- Mindest-Flex korrigiert diese Reduktion nur ueber den einheitlichen Pipeline-Schritt.
- Wenn Stage 2 aktiv ist und keine Notfallbedingung greift, kann Mindest-Flex die Rate anheben.
- Wenn Stage 2 wegen echter Notlage aktiv ist und Notfallbedingungen greifen, bleibt Mindest-Flex blockiert.
- Final-Rate-Limits koennen auch im Stage-2-Fall eine Anhebung begrenzen.

Pipeline-Position:

1. `calculateFlexRate()` inklusive bestehender S-Kurve und Hard Caps.
2. `applyGuardrails()`.
3. neu: `applyMinimumFlexFloor()`.
4. `applyFlexBudgetCap()`.
5. `applyFinalRateLimits()`.
6. finale Entnahmeberechnung.

Folge dieser Position:

- Guardrails duerfen zuerst kuerzen.
- Mindest-Flex hebt danach an, wenn keine Notfallbedingungen vorliegen.
- Flex-Budget-Cap prueft anschliessend die angehobene Rate und darf sie wieder kuerzen.
- Final-Rate-Limits glaetten auch die Mindest-Flex-Anhebung und verhindern sprunghafte Year-over-Year-Erhoehungen.
- Wenn die Final-Rate-Limits die Anhebung begrenzen, gilt der Status nicht als Fehler, sondern als geglaettete Teilanwendung. Der Komfortboden wird dann nicht sofort voll erreicht.
- Die Anhebung wird als eigener Diagnose-Schritt sichtbar und nicht als Veraenderung frueherer Policy-Schritte versteckt.

Diagnose:

- Die Diagnose soll kenntlich machen, ob der Mindest-Flex aktiv war.
- Geeignete Ausgabe: gesetzter Betrag, effektiver Flex vor/nach Mindest-Flex, Aktivierungsstatus und Blockiergrund.
- Mögliche Statuswerte:
  - `inactive_zero`: kein Mindest-Flex gesetzt;
  - `not_needed`: effektiver Flex lag bereits oberhalb Mindest-Flex;
  - `applied`: Mindest-Flex hat die Flex-Rate angehoben;
  - `applied_limited_by_final_smoothing`: Mindest-Flex haette staerker angehoben, wurde aber durch Final-Rate-Limits geglaettet;
  - `blocked_emergency`: Notfall-/Floor-/Runway-Schutz hatte Vorrang;
  - `limited_by_flex_budget`: Mindest-Flex wurde angewandt, danach aber durch Flex-Budget-Cap begrenzt.
- Backtest und Balance sollen dadurch erklaeren koennen, warum die effektive Entnahme in kuerzenden Safety-/Guardrail-Phasen hoeher bleibt oder warum der Mindest-Flex unterschritten wurde.

## UI-Integration

### Balance

- Feld im Bereich Entnahme / Flex-Budget / Dynamic Flex platzieren.
- Label: `Mindest-Flex p.a. (EUR)`.
- Tooltip: `Bedingte Untergrenze fuer Flex-Ausgaben in kuerzenden Safety-/Guardrail-Phasen; ersetzt nicht den Floor.`
- Validierung: Wert darf nicht groesser als `Flex Bedarf p.a.` sein; bei Verletzung klare Fehlermeldung statt stiller Korrektur.
- Jahresupdate/Inflation: Feld wird gemeinsam mit `floorBedarf`, `flexBedarf`, `flexBudgetAnnual` und `flexBudgetRecharge` fortgeschrieben.
- Diagnose zeigt gesetzten Wert, Aktivierungsstatus und ggf. Blockiergrund.

### Simulator

- Gleiches Feld in den Simulator-Eingaben.
- Gleiche Validierung wie Balance: `Mindest-Flex p.a.` muss kleiner oder gleich `Flex Bedarf p.a.` sein.
- Wert wird in Backtest, Monte Carlo, Parameter Sweep und Optimierung ueber denselben Engine-Input verwendet.
- Backtest-Log soll den Effekt nachvollziehbar machen:
  - vorhandene Spalten `MinF%`, `Flex%`, `FlexEUR` weiter nutzen;
  - neue Diagnosefelder fuer Mindest-Flex-Status und Blockiergrund ergaenzen;
  - optional neue Spalte `MinFlexEUR`, falls die bestehende Ausgabe nicht eindeutig genug ist.

### Profilverbund

- Der Wert bleibt profilbezogen.
- Bei mehreren Profilen werden unterschiedliche Mindest-Flex-Werte nicht zu einem globalen Haushaltswert zusammengefuehrt.
- Die Profilverbund-Diagnose soll pro Profil nachvollziehbar bleiben.

## Tests

Pflichttests:

- `minimumFlexAnnual = 0` erzeugt identische Ergebnisse zum heutigen Verhalten.
- `minimumFlexAnnual > flexBedarf` wird in UI/Validator als Fehler behandelt und nicht still auf `flexBedarf` begrenzt.
- Balance-Inflationsupdate schreibt `minimumFlexAnnual` mit derselben Rate fort wie `flexBedarf`.
- Dynamic-Flex-Stage-2 mit niedrigem Safety-Flex kann durch `applyMinimumFlexFloor` angehoben werden, wenn keine Notfallbedingungen greifen.
- Ohne Dynamic Flex hebt eine kuerzende Guardrail-Situation den Flex mindestens auf `minimumFlexAnnual`, wenn keine Notfallbedingungen greifen.
- Ohne kuerzende Safety-/Guardrail-Situation greift `minimumFlexAnnual` nicht.
- Flex-Budget-Cap unterhalb Mindest-Flex gewinnt nachgelagert; Diagnose meldet `limited_by_flex_budget`.
- Alarmmodus oder Floor-/Runway-Notlage gewinnt; Diagnose meldet `blocked_emergency`.
- Final-Rate-Limits begrenzen grosse Mindest-Flex-Anhebungen; Diagnose meldet `applied_limited_by_final_smoothing`.
- Bei `inflatedBedarf.flex <= 0` greift Mindest-Flex nicht und erzeugt keine Division durch Null.
- Niedrige aktuelle Liquiditaet allein blockiert Mindest-Flex nicht, wenn das Gesamtvermoegen den Runway plausibel wiederherstellen kann.
- Ein Szenario mit echter Notlage darf `minimumFlexAnnual` unterschreiten und Flex bis auf `0` reduzieren; Diagnose erklaert die Unterschreitung.
- Backtest-Szenario 2005-2014 zeigt bei gesetztem Mindest-Flex hoehere Entnahmen und weiterhin unauffaelliges `FlowDelta`.
- UI-/DOM-Test: Feld wird in Balance und Simulator gelesen, gespeichert und an die Engine uebergeben.
- Profilverbund-Test: mehrere Profile mit unterschiedlichen Mindest-Flex-Werten bleiben getrennt nachvollziehbar, einschliesslich Profil A `0` und Profil B `> 0`.

Validierung nach Umsetzung:

- `npm test`
- bei Engine-Contract-Aenderung zusaetzlich `npm run build:engine`

## Umsetzungsslices

Die Umsetzung soll in kleinen, einzeln pruefbaren Schritten erfolgen. Jeder Slice wird separat implementiert, getestet und dokumentiert.

### Slice 1: Contract, Validierung und Inflation

Ziel:

- Der neue Parameter `minimumFlexAnnual` existiert im Engine-Input, ohne bestehende Profile oder Simulationen zu veraendern.
- Der Wert folgt derselben Inflationsfortschreibung wie `flexBedarf`.

Umsetzung:

- Input-Normalisierung und Validator um `minimumFlexAnnual` erweitern.
- Default auf `0` setzen.
- Gueltigkeitsregel `0 <= minimumFlexAnnual <= flexBedarf` durchsetzen.
- Bei `minimumFlexAnnual > flexBedarf` einen klaren Validierungsfehler liefern, keine stille Begrenzung.
- `minimumFlexAnnual` in die Balance-Inflationsfortschreibung aufnehmen.
- Simulator-/Backtest-Fortschreibung so pruefen bzw. erweitern, dass `minimumFlexAnnual` mit `flexBedarf` konsistent weitergegeben wird.

Tests:

- Fehlender Wert und `0` ergeben identisches Verhalten zum Bestand.
- Negative Werte werden abgefangen.
- Werte groesser als `flexBedarf` werden abgelehnt.
- Balance-Jahresupdate inflationiert `minimumFlexAnnual`.

Doku:

- Engine-/Input-Referenz aktualisieren, falls der Input dort dokumentiert ist.

Status 2026-06-01: umgesetzt. `minimumFlexAnnual` wird im Engine-Input auf `0` normalisiert, gegen `0 <= minimumFlexAnnual <= flexBedarf` validiert, in Balance gemeinsam mit den Bedarfen inflationiert und in Simulator/Backtest als nominal fortgeschriebener Jahreswert weitergegeben.

### Slice 2: Einheitlicher Engine-Schritt `applyMinimumFlexFloor`

Ziel:

- Mindest-Flex wirkt mit und ohne Dynamic Flex an einem einzigen klaren Pipeline-Punkt.

Umsetzung:

- Neues Planner-Modul oder Helper-Funktion `applyMinimumFlexFloor` anlegen.
- Funktion nach `applyGuardrails()` und vor `applyFlexBudgetCap()` einhaengen.
- Funktion berechnet aus `minimumFlexAnnual` eine erforderliche Flex-Rate:
  `requiredRate = minimumFlexAnnual / inflatedBedarf.flex * 100`, begrenzt auf `0..100`.
- Wenn aktuelle Flex-Rate bereits hoeher ist, keine Aenderung.
- Wenn `inflatedBedarf.flex <= 0`, keine Aenderung und Status `not_needed`.
- Wenn aktuelle Flex-Rate niedriger ist, nur anheben, wenn keine Notfallbedingungen greifen.
- `inflatedBedarf.flex` nicht fuer Mindest-Flex mutieren.
- `applyFlexBudgetCap()` bleibt danach aktiv und darf die Mindest-Flex-Anhebung begrenzen.
- `applyFinalRateLimits()` bleibt danach aktiv und darf die Mindest-Flex-Anhebung auf die erlaubte Year-over-Year-Aenderung begrenzen.

Tests:

- Dynamic-Flex- und Nicht-Dynamic-Flex-Pfade nutzen denselben Schritt.
- Ergebnis bleibt bei `minimumFlexAnnual = 0` identisch.
- Anhebung erfolgt als Rate, nicht durch Bedarfs-Mutation.
- `inflatedBedarf.flex <= 0` erzeugt weder `NaN` noch `Infinity`.
- Flex-Budget-Cap nach Mindest-Flex begrenzt die angehobene Rate ohne duplizierte Budget-Logik.
- Eine Mindest-Flex-Anhebung oberhalb des Final-Up-Limits wird durch `applyFinalRateLimits()` geglaettet.

Doku:

- Spending-/Guardrail-Doku um Pipeline-Position und Prioritaeten ergaenzen.

Status 2026-06-01: umgesetzt. `applyMinimumFlexFloor()` liegt als eigenes Planner-Modul vor, arbeitet ratenbasiert nach Guardrails und vor Flex-Budget, mutiert keine Bedarfs-/Inputdaten und schreibt Mindest-Flex-Diagnosefelder in `state.keyParams`. Flex-Budget und Final-Rate-Limits bleiben nachgelagert und koennen die Anhebung begrenzen.

### Slice 3: Notfall-, Runway- und Flex-Budget-Prioritaeten

Ziel:

- `finanzierbar` ist kein vager Begriff mehr, sondern eine getestete Regelmenge.

Umsetzung:

- Notfallbedingungen aus diesem Plan in `applyMinimumFlexFloor` pruefen.
- Vermoegensdeckungs-Proxy statt Transaktionssimulation verwenden.
- Diagnose mit Status `applied`, `not_needed`, `blocked_emergency`, `limited_by_flex_budget` ausgeben.

Tests:

- Alarmmodus blockiert Mindest-Flex.
- Floor-/Runway-Notlage auf Basis Gesamtvermoegen blockiert Mindest-Flex.
- Niedrige aktuelle Liquiditaet allein blockiert Mindest-Flex nicht, wenn Gesamtvermoegen ausreichend ist.
- Flex-Budget-Cap unter Mindest-Flex begrenzt die Anhebung nachgelagert.
- Normale kuerzende Guardrail ohne Notfall hebt bis Mindest-Flex an.

Doku:

- Diagnose-/Entscheidungslogik in technischer Referenz beschreiben.

Status 2026-06-01: umgesetzt. `applyMinimumFlexFloor()` blockiert die Anhebung bei aktivem Alarm, bei fehlender Gesamtvermoegensdeckung fuer Netto-Floor plus Mindest-Flex und wenn der Mindest-Runway nach dieser Zahlung auf Basis des Gesamtvermoegens nicht plausibel wiederherstellbar waere. Niedrige Anfangsliquiditaet allein blockiert nicht. Diagnosefelder enthalten Status, Blockiergrund und Proxy-Werte.

### Slice 4: Balance-UI und Diagnose

Ziel:

- Nutzer koennen den Mindest-Flex in Balance pflegen und in der Diagnose nachvollziehen.

Umsetzung:

- Feld `Mindest-Flex p.a. (EUR)` im Bereich Entnahme / Flex-Budget / Dynamic Flex platzieren.
- Tooltip ergaenzen: `Bedingte Untergrenze fuer Flex-Ausgaben in kuerzenden Safety-/Guardrail-Phasen; ersetzt nicht den Floor.`
- UI-Validierung gegen `Flex Bedarf p.a.` einbauen.
- Diagnoseanzeige um gesetzten Wert, Aktivierungsstatus und Blockiergrund erweitern.

Tests:

- Feld wird gelesen, gespeichert, inflationiert und an die Engine uebergeben.
- UI zeigt Fehler, wenn Mindest-Flex groesser als Flex-Bedarf ist.
- Diagnose zeigt `applied`, `not_needed`, `blocked_emergency`, `limited_by_flex_budget` und `applied_limited_by_final_smoothing` in passenden Szenarien.

Doku:

- Relevante Balance-Modul-Doku aktualisieren.

### Slice 5: Simulator, Backtest, Monte Carlo und Profilverbund

Ziel:

- Simulator, Backtest, Monte Carlo, Sweep, Optimierung und Profilverbund verwenden denselben Parameter konsistent.

Umsetzung:

- Simulator-Eingabe um dasselbe Feld und dieselbe Validierung erweitern.
- Parameter in Backtest, Monte Carlo, Sweep und Optimierung durchreichen.
- Profilverbund behandelt `minimumFlexAnnual` profilbezogen.
- Backtest-Diagnose/Log um Mindest-Flex-Status und ggf. `MinFlexEUR` ergaenzen, wenn die bestehende Ausgabe nicht eindeutig genug ist.

Tests:

- Backtest 2005-2014 zeigt mit Mindest-Flex hoehere Entnahmen und weiterhin unauffaelliges `FlowDelta`.
- Monte Carlo und Sweep laufen mit und ohne gesetzten Mindest-Flex.
- Profilverbund mit Profil A `minimumFlexAnnual = 0` und Profil B `minimumFlexAnnual > 0` bleibt getrennt nachvollziehbar.
- Kombination mit 3-Bucket bleibt buchhalterisch unauffaellig (`FlowDelta`).

Doku:

- Simulator-Modul-Doku und interne Entscheidungslogik aktualisieren.

### Slice 6: Gesamtabnahme und Regression

Ziel:

- Sicherstellen, dass die neue Funktion bestehende Strategien nicht unbeabsichtigt veraendert.

Umsetzung:

- Vergleichslauf mit `minimumFlexAnnual = 0` gegen Bestand.
- Beispiel-/Diagnosefall mit gesetztem Mindest-Flex dokumentieren.
- Falls Engine-Contract geaendert wurde, `engine.js` generieren.

Tests:

- `npm test`
- `npm run build:engine`, falls Engine-Contract oder Engine-Bundle betroffen ist.
- Optional gezielter Backtest-Export fuer das 2000-2025-Szenario.

Doku:

- Abschlussnotiz im internen Plan ergaenzen oder Status nach Umsetzung aktualisieren.

## Abgrenzung

Nicht Teil dieses Plans:

- Aenderung der Steuerlogik.
- Aenderung der Tranchenverkaufsreihenfolge.
- Aenderung von Gold-, Bond- oder 3-Bucket-Logik.
- Neue Pflichtfelder in bestehenden Profilen.
- Automatisches Rebalancing nur wegen Mindest-Flex ausserhalb der bestehenden Engine-Regeln.
- Ein harter zweiter Floor mit garantierter Durchsetzung in Extremkrisen.
