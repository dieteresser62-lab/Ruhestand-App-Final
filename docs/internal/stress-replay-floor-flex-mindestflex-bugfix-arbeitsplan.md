# Stresspfad-Replay: Floor, Flex und Mindest-Flex im Varianteneditor

**Stand:** 2026-08-16

**Status:** Planentwurf; externes Review ausstehend

**Autor:** Codex (Implementer, keine Eigenfreigabe)

**Zielbranch:** `codex/stress-pfad-replay`

**Planungsbaseline:** Branch `codex/stress-pfad-replay`, HEAD `ebb9f235`

**Branch-Status:** lokal vorhanden; kein Upstream eingetragen, Veröffentlichung ausstehend

**Orchestrierung:** State v3, `PLAN_ONLY`; Umsetzung erst nach geprüftem und
committetem Plan-Handoff

## 1. Anlass und Zielbild

Der bestehende Stresspfad-Editor zeigt neben dem Variantennamen unmittelbar
alle 17 Felder der Whitelist `StressReplayVariantWhitelistV1`. Die für den
beabsichtigten Hauptworkflow maßgeblichen Ausgangsbedarfe sind dagegen nicht
editierbar. `strategy.minimumFlexAnnual` ist in
`STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1` sogar ausdrücklich gesperrt;
`startFloorBedarf` und `startFlexBedarf` fehlen in Whitelist und
Baseline-Projektion.

Nach diesem Bugfix sind neben dem Variantennamen standardmäßig genau diese
drei leeren Eingabefelder sichtbar:

- Floor-Bedarf p. a. (`startFloorBedarf`);
- Flex-Bedarf p. a. (`startFlexBedarf`);
- Mindest-Flex p. a. (`minimumFlexAnnual`).

Jedes Feld zeigt seinen eingefrorenen Baseline-Wert getrennt und als
Eurobetrag an. Ein leerer Wert bedeutet „nicht überschrieben“, während `0`
ein expliziter numerischer Patchwert ist. Die bisherigen 17 Variantenfelder
bleiben vollständig erhalten und liegen in einem initial geschlossenen,
tastaturbedienbaren Bereich „Expertenfelder“.

Der Bugfix verändert ausschließlich die Ausgangswerte einer Replay-Variante.
Er verändert weder die fachliche Bedarfs- oder Mindest-Flex-Semantik noch den
materialisierten Markt-, Stress-, Tail-Risk-, Pflege-, Mortalitäts- oder
Haushaltsereignispfad.

## 2. Verifizierte Repository-Ausgangslage

Die Planung beruht auf folgenden aktuellen Integrationspunkten:

- `Simulator.html` enthält den Replay-Editor in
  `#stressReplayVariantEditor`. Alle bisherigen Variantenfelder stehen im
  selben `.stress-replay-editor-grid`; ein Expertenbereich existiert nicht.
- `readVariantPatch()` in `app/simulator/stress-replay-ui.js` überspringt
  Controls nur bei `control.value === ''` und wandelt Zahlen mit
  `Number(control.value)` um. Damit kann die UI `0` bereits grundsätzlich von
  leer unterscheiden; dieser Vertrag muss durch alle weiteren Stufen
  erhalten und explizit getestet werden.
- `app/simulator/stress-replay-contract.js` definiert 17 V1-Whitelistfelder,
  ihre Normalisierung, die Baseline-Strategieprojektion sowie Varianten- und
  Workspace-Fingerprints. `strategy.minimumFlexAnnual` ist derzeit verboten.
- `app/simulator/stress-replay-variant.js` entfernt wirkungsgleiche Blätter,
  erzeugt Materialitätsgruppen und schreibt Patchwerte über deren
  `inputPath` in eine Kopie der Baseline. Die relevanten Prüfungen verwenden
  bereits `!== undefined`; diese Eigenschaft muss für die neuen Felder
  bestehen bleiben.
- `runStressReplayPathV1()` in
  `app/simulator/stress-replay-runner.js` wendet die Variante auf eine Kopie
  von `baselineInputs` an und initialisiert danach den bestehenden
  DOM-/Worker-/RNG-freien Jahreslauf. Der Runner ist damit der verbindliche
  Nachweisrand dafür, dass die drei Werte tatsächlich die Replay-Rechnung
  erreichen.
- `initMcRunState()` in `app/simulator/simulator-engine-helpers.js` übernimmt
  `startFloorBedarf`, `startFlexBedarf` und `minimumFlexAnnual` in
  `baseFloor`, `baseFlex` und `baseMinimumFlexAnnual`.
  `buildSimulatorEngineInput()` gibt sie als `floorBedarf`, `flexBedarf` und
  `minimumFlexAnnual` an die Engine weiter.
- `engine/validators/InputValidator.mjs` lehnt negative, nicht endliche und
  über dem effektiven `flexBedarf` liegende Mindest-Flex-Werte ab. Die
  `Math.min`-/`Math.max`-Berechnungen in Mindest-Flex-Diagnostik und
  Jahresergebnis beschreiben erfüllten Betrag und Fehlbetrag; sie dürfen
  nicht als Erlaubnis dienen, einen ungültigen Varianten-Input zu klemmen.
- Workspace und Export verwenden V1-Hüllen und den aktiven
  Persistenzschlüssel `sim.stressReplay.active.v1`. Import und Laden
  validieren aktuell nur die eine bekannte Varianten-Whitelistversion.
- Relevante Testgrenzen liegen in `tests/stress-replay-contract.test.mjs`,
  `stress-replay-variant.test.mjs`, `stress-replay-runner.test.mjs`,
  `stress-replay-persistence.test.mjs`, `stress-replay-export.test.mjs`,
  `stress-replay-ui.test.mjs`, `stress-replay-renderer.test.mjs`,
  `stress-replay-e2e.test.mjs` und `browser-smoke.test.mjs`.

Der Arbeitsbaum war bei der Planung sauber. Vor jedem Umsetzungsslice werden
Branch, Status, Scope und Diff-Risiko gemäß
`docs/internal/SLICE_EXECUTION_RULES.md` neu erfasst.

## 3. Vertragsentscheidung und Abwärtskompatibilität

### 3.1 Versionierungsgrenze

Der Pfad-, Ergebnis-, Vergleichs-, Workspace- und Exportaufbau ändert seine
Form nicht. Deshalb werden diese V1-Hüllen nicht unnötig umbenannt. Die
fachliche Erweiterung wird an der bereits vorhandenen, im Variantenobjekt
fingerprintgebundenen Revisionsgrenze vorgenommen:

- `StressReplayVariantWhitelistV1` bleibt unverändert mit ihren bisherigen
  17 Feldern und ihren bisherigen Verbots- und Normalisierungsregeln erhalten.
- Eine `StressReplayVariantWhitelistV2` ergänzt genau
  `strategy.startFloorBedarf`, `strategy.startFlexBedarf` und
  `strategy.minimumFlexAnnual` mit den jeweiligen direkten Inputpfaden.
- Neu erzeugte Baseline- und Alternativvarianten verwenden V2. Validator,
  Patchanwendung und Materialitätsprüfung dispatchen ausdrücklich anhand von
  `variant.whitelistVersion`; es gibt keinen impliziten „aktuellsten Vertrag“
  beim Prüfen persistierter Varianten.
- Unbekannte zukünftige Whitelist-, Schema- oder Contractversionen bleiben
  fail-closed und liefern einen stabilen, verständlichen Versionsfehler.

Diese Grenze vermeidet eine semantische Umschreibung von V1-Fingerprints.
Eine bislang gültige V1-Variante wird zunächst exakt nach der alten
V1-Whitelist geprüft. Erst danach darf sie in einem Workspace ausgeführt oder
neben neu erzeugten V2-Varianten weiterverwendet werden. Eine V1-Variante mit
einem damals verbotenen Mindest-Flex-Patch wird nicht nachträglich gültig.
Die weiterhin `StressReplayVariantV1` benannte Variantenhülle wird dabei nicht
allein anhand ihres Namens als Whitelist V1 interpretiert. Ihre gespeicherte
`whitelistVersion` wählt Deskriptoren, Verbote, Projektion, Normalisierung,
Materialitätsprüfung und Patchanwendung aus. Neu erzeugende APIs verwenden
V2; validierende und ausführende APIs respektieren die gespeicherte Version.

### 3.2 Bestehende Workspaces, Persistenz und Exporte

Für vorhandene Daten gilt:

- Ein V1-Workspace beziehungsweise `StressReplayComparisonExportV1` wird mit
  seinen gespeicherten V1-Regeln und Fingerprints validiert. Erfolgreicher
  Import verändert die gespeicherten Pfad-, Baseline-, Profil-, Tranchen- und
  Herkunftsdaten nicht.
- Fehlen die drei neuen Patchblätter, werden sie nicht synthetisch ergänzt.
  Die Replay-Anwendung liest unverändert die Werte aus dem eingefrorenen
  `baselineSnapshot`.
- Alte Varianten- und Workspace-Fingerprints bleiben beim bloßen Laden oder
  Export/Import erhalten. Erst eine ausdrücklich vom Nutzer ausgelöste
  Workspace-Änderung erzeugt den ohnehin vorgesehenen neuen Workspace-
  Fingerprint; alte Varianten behalten dabei ihre eigene Identität.
- Neue Exporte dürfen V1- und V2-Whitelistvarianten in der unveränderten
  Exporthülle tragen, weil die verschachtelte `whitelistVersion` die
  Variantenregeln eindeutig festlegt und vom äußeren Fingerprint abgedeckt
  wird.
- Bei Workspace-Laden und Import wird jede bekannte Variante zusätzlich an
  den eingefrorenen `baselineSnapshot` gebunden geprüft: effektive
  Bedarfsrelation, Baseline-Fingerprint und der aus dem tatsächlich
  angewandten Patch resultierende `normalizedInputFingerprint` müssen
  zusammenpassen. Damit kann ein äußerlich neu fingerprinteter, aber
  semantisch unzulässiger Import nicht erst im späteren Runner scheitern.
- Der bestehende Storage-Key bleibt bestehen. Es gibt keine automatische
  Löschung, kein stilles Umschreiben beim Laden und keine Migration anderer
  Simulator-, Profil- oder Tranchenrecords.

Falls sich bei der Umsetzung zeigt, dass eine gültige produktiv erzeugte
V1-Baseline einen der drei Ausgangswerte nicht enthält, wird nicht geraten
oder auf null migriert. Dieser Fall stoppt den betreffenden Slice zur
Vertragsklärung, weil „eingefrorene Baseline übernehmen“ ohne eingefrorenen
Wert keine eindeutige Semantik besitzt.

## 4. Patch-, Validierungs- und Materialitätsvertrag

### 4.1 Kanonische Felder

| UI-Feld | Replay-Patchpfad V2 | Inputpfad | Domäne |
| --- | --- | --- | --- |
| Floor-Bedarf p. a. | `strategy.startFloorBedarf` | `startFloorBedarf` | endlich, `>= 0`, EUR/Jahr |
| Flex-Bedarf p. a. | `strategy.startFlexBedarf` | `startFlexBedarf` | endlich, `>= 0`, EUR/Jahr |
| Mindest-Flex p. a. | `strategy.minimumFlexAnnual` | `minimumFlexAnnual` | endlich, `>= 0`, EUR/Jahr |

Die drei Felder bilden drei eigenständige Materialitätsgruppen. Werden
mehrere gleichzeitig geändert, bleibt die bestehende Mehrfaktorwarnung aktiv.
Vorschau und Variantenliste verwenden verständliche Bezeichnungen statt der
rohen Contractpfade.

### 4.2 Leer und nullwertige Zahl

Der folgende Ablauf ist verbindlich:

1. Nur die exakte leere Control-Zeichenfolge `''` erzeugt kein Patchblatt.
2. Die Zeichenfolge `'0'` wird zu der Zahl `0`; `NaN`, `Infinity`, negative
   Werte und andere ungültige Eingaben werden abgewiesen.
3. Normalisierung, No-Op-Erkennung, Fingerprinting und Patchanwendung prüfen
   das Vorhandensein eines Blatts beziehungsweise `!== undefined` und nie
   dessen Truthiness.
4. Ein explizites `0` gegen eine positive Baseline ist materiell, bleibt im
   normalisierten Patch und erreicht den Runner als `0`.
5. Ein explizites `0` gegen eine Baseline von `0` darf erst nach korrekter
   Erkennung als explizite Zahl bei der Materialitätsprüfung entfernt werden.
   Eine dadurch vollständig wirkungsgleiche Alternative wird weiterhin als
   `STRESS_REPLAY_VARIANT_NO_OP` abgewiesen.

### 4.3 Effektive Mindest-Flex-Relation

Für Vorschau, Variantenerzeugung, Workspace-Validierung, Import und
Patchanwendung werden die effektiven Werte gebildet:

```text
effectiveFlex = Patch.startFlexBedarf, falls Blatt vorhanden,
                sonst Baseline.startFlexBedarf
effectiveMinimumFlex = Patch.minimumFlexAnnual, falls Blatt vorhanden,
                       sonst Baseline.minimumFlexAnnual
```

Dabei ist eine Null ein vorhandenes Blatt. Wenn
`effectiveMinimumFlex > effectiveFlex`, wird der Patch vor dem Replay-Lauf mit
einem stabilen Contractfehler abgewiesen. Fehlerdetails nennen beide Felder
und effektiven Werte; die UI zeigt eine deutschsprachige Erklärung. Es findet
weder im Editor noch im Variantencontract eine Korrektur, ein `Math.min`, ein
Defaulting auf die Baseline oder eine andere stille Begrenzung statt.

Die bestehende Engine-Prüfung bleibt als nachgelagertes Sicherheitsnetz
unverändert. Das fachlich richtige Begrenzen des *erfüllten* Mindest-Flex auf
die tatsächlich erfüllten Flexausgaben ist Ergebnissemantik und darf nicht
mit einer Begrenzung des konfigurierten `minimumFlexAnnual` verwechselt
werden.

## 5. UI- und Accessibility-Vertrag

Der Editor wird in zwei visuelle Gruppen geteilt:

1. Das Standardraster enthält Variantenname, Floor, Flex und Mindest-Flex.
2. Ein nativer `button type="button"` mit dem Text „Expertenfelder anzeigen“
   steuert einen eigenen Container mit sämtlichen bisherigen 17 Feldern.

Für den Toggle gelten folgende Orakel:

- initial `aria-expanded="false"`;
- `aria-controls` verweist auf die eindeutige ID des Expertencontainers;
- der Container ist initial über `hidden` geschlossen;
- Aktivierung per Maus, Enter oder Leertaste funktioniert durch native
  Buttonsemantik;
- Öffnen setzt `hidden = false` und `aria-expanded = true`, Schließen den
  umgekehrten Zustand;
- der Button ändert keine Control-Werte, löst keinen Patch aus und ruft keine
  Form-Rücksetzung auf;
- bereits eingegebene Expertenwerte bleiben nach Schließen und erneutem
  Öffnen bytegleich erhalten;
- bestehende `data-active-when`-Abhängigkeiten innerhalb der Expertenfelder
  bleiben wirksam;
- der Experten-Anzeigezustand wird nicht in Workspace, Export oder
  Variantenfingerprint persistiert.

Die drei Standardinputs haben keinen `value`-Default, verwenden
`placeholder="Baseline übernehmen"` und zeigen den Baseline-Betrag separat
über ein `output`. Nur diese drei Outputs werden über ausdrückliche
Formatmetadaten als deutschsprachige Eurobeträge gerendert; technische
Expertenwerte behalten ihre bestehenden Einheiten. Eine Baseline von `0`
darf nicht als „nicht gesetzt“ ausgegeben werden.

## 6. Unveränderliche Grenzen

Folgende Invarianten werden vor und nach jeder Variantenrechnung geprüft:

- `baselineSnapshot` und sein Fingerprint bleiben unverändert;
- Pfadinhalt, `pathFingerprint`, Herkunftsidentität, MC-Log und
  `initialMarketDataHist` bleiben unverändert;
- normale Monte-Carlo-Capture-, Worker-, Sampling- und RNG-Pfade bleiben
  unverändert;
- reale Profile, Tranchen sowie deren Persistenzschlüssel werden weder
  gelesen, geschrieben noch aus Variantenwerten abgeleitet;
- Engine-Feldnamen und Einheiten bleiben
  `floorBedarf`/`flexBedarf`/`minimumFlexAnnual` in EUR pro Jahr;
- Asset-, Steuer-, Pflege-, Renten- und Flexbudgetfelder bleiben außerhalb
  dieses Bugfixes;
- `engine.js`, `dist/` und `RuheStandSuite.exe` werden nicht manuell geändert;
- die leere Baseline reconciliert weiterhin gegen das Ursprungsszenario;
- erwartete Ergebnisabweichungen entstehen ausschließlich durch die drei
  geänderten Ausgangswerte oder weiterhin erlaubte Expertenpatches.

## 7. Geordnete Umsetzungsslices

Die folgenden Slices sind zukünftige Implementierungspakete. In diesem
`PLAN_ONLY`-Lauf werden weder ihre Slice-MDs noch Code oder Tests angelegt.

### Slice 1 – Whitelist V2, Patchanwendung und Legacy-Kompatibilität

**Ziel:** Den Variantenvertrag um die drei Bedarfswerte erweitern, ohne die
Regeln oder Fingerprints bestehender V1-Varianten umzudeuten. Explizite Null,
effektive Mindest-Flex-Relation, Runner-Anwendung, Persistenz und Export werden
an einem gemeinsamen Contractrand geschlossen.

**Exakter Änderungspfad**

- `app/simulator/stress-replay-contract.js`
- `app/simulator/stress-replay-variant.js`
- `app/simulator/stress-replay-runner.js`
- `app/simulator/stress-replay-persistence.js`
- `app/simulator/stress-replay-export.js`
- `tests/stress-replay-contract.test.mjs`
- `tests/stress-replay-variant.test.mjs`
- `tests/stress-replay-runner.test.mjs`
- `tests/stress-replay-persistence.test.mjs`
- `tests/stress-replay-export.test.mjs`
- `tests/fixtures/stress-replay-comparison-export-v1.json`
- `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`

Produktive Änderungsgruppen: 5.

**Umsetzung:**

- V1-Deskriptoren und V1-Verbote unverändert konservieren; V2-Deskriptoren
  und versionsabhängigen Dispatch ergänzen.
- Die V2-Baseline-Projektion um alle drei Werte erweitern.
- No-Op-Entfernung, Materialitätsgruppen und Patchanwendung an die konkrete
  Whitelistversion binden.
- Einen gemeinsamen effektiven Bedarfsvalidator verwenden, der alle drei
  Domänen sowie `minimumFlexAnnual <= startFlexBedarf` ohne Clamping prüft.
- Variante und Baseline über Fingerprints vor und nach Vorschau/Anwendung auf
  Mutation prüfen.
- V1-Workspace und V1-Export zuerst mit V1-Regeln validieren; gemischte
  bekannte Variantenrevisionen eindeutig und unbekannte Revisionen
  fail-closed behandeln.
- Workspace- und Importvalidierung wenden jede Variante kontrolliert auf eine
  Kopie der eingefrorenen Baseline an und gleichen dabei effektive
  Bedarfsrelation, Baseline- und normalisierten Inputfingerprint ab; ein
  Fehler bleibt vor Persistenz und Runner sichtbar.
- Nur falls die bestehende generische Runneranwendung den V2-Dispatch nicht
  ohne Änderung erreicht, `stress-replay-runner.js` minimal anpassen; keine
  Jahres- oder Engine-Semantik duplizieren.

**Akzeptanzorakel:**

- Leer fehlt im Patch; `0` bleibt gegen positive Baseline in Patch,
  Fingerprint, angewandten Inputs und Runnerabhängigkeit sichtbar.
- `0` gegen Baseline `0` wird erst als No-Op entfernt.
- Floor, Flex und Mindest-Flex lehnen negativ, nicht endlich und falsche
  Typen ab.
- Mindest-Flex größer als effektives Flex scheitert sowohl bei zwei
  eingegebenen Werten als auch bei je einem Patchwert plus Baseline-Gegenseite.
- Ein V1-Golden-Workspace und sein Export roundtrippen mit unveränderten
  Varianten-, Workspace- und Exportfingerprints. Die eingecheckte Fixture
  wird einmal mit dem unveränderten V1-Code erzeugt und danach nur gelesen.
- Ein nach alter Regel verbotener V1-Mindest-Flex-Patch bleibt verboten; ein
  unbekanntes V3-Whitelisttag wird verständlich abgewiesen.
- Pfad, Source Identity und Baselinebytes sind vor und nach Anwendung gleich.

**Fokussierte Entwicklerläufe:**

```text
node tests/run-single.mjs tests/stress-replay-contract.test.mjs
node tests/run-single.mjs tests/stress-replay-variant.test.mjs
node tests/run-single.mjs tests/stress-replay-runner.test.mjs
node tests/run-single.mjs tests/stress-replay-persistence.test.mjs
node tests/run-single.mjs tests/stress-replay-export.test.mjs
```

**Stopbedingungen:** Widersprüchliche Inputpfade/Einheiten, eine notwendige
Änderung der Engine-Semantik, ein produktiv erzeugter V1-Workspace ohne
eingefrorene Bedarfswerte, stilles Mindest-Flex-Clamping oder unerwartete
Baseline-/Pfad-/Reconciliation-Abweichungen.

### Slice 2 – Fokussierter Editor und Expertenfelder

**Abhängigkeit:** Slice 1 stellt den geprüften V2-Patchvertrag bereit.

**Ziel:** Initial nur Variantenname und die drei Bedarfsfelder anzeigen; alle
bisherigen Controls verlustfrei und zugänglich in den geschlossenen
Expertenbereich verschieben.

**Exakter Änderungspfad**

- `Simulator.html`
- `simulator.css`
- `app/simulator/stress-replay-ui.js`
- `app/simulator/stress-replay-renderer.js`
- `tests/stress-replay-ui.test.mjs`
- `tests/stress-replay-renderer.test.mjs`
- `tests/browser-smoke.test.mjs`
- `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`

Produktive Änderungsgruppen: 4.

**Umsetzung:**

- Standard- und Expertenraster semantisch trennen; kein bisheriges
  Expertencontrol entfernen oder umbenennen.
- Drei leere Zahlenfelder mit Minimum `0`, separaten Baseline-Outputs und
  direktem V2-Patchpfad ergänzen.
- Die drei Bedarfs-Baselinewerte über feldspezifische Formatmetadaten als EUR
  formatieren, einschließlich `0 €`; Expertenwerte behalten ihre Einheiten.
- Nativen Toggle samt `aria-expanded`, `aria-controls` und `hidden` anbinden;
  Anzeigezustand ausschließlich im DOM halten.
- Bestehende bedingte Decumulation-/Longevity-Controls und Busy-/Read-only-
  Sperren erhalten.
- Fehlermeldung für die effektive Mindest-Flex-Relation in Vorschau und
  Statusregion verständlich abbilden.
- Rendererlabels und Variantenliste um die drei Materialitätsgruppen
  ergänzen.

**Akzeptanzorakel:**

- Im initialen Browserzustand sind als editierbare Felder genau Name, Floor,
  Flex und Mindest-Flex sichtbar; der Experten-Toggle ist verfügbar und die
  Expertencontrols existieren, sind aber verborgen.
- Alle drei Controls sind leer und zeigen einen getrennten Baselinebetrag.
- `0` wird in der Controller-Vorschau als Zahl übergeben; leer erzeugt kein
  Blatt.
- Togglezustand und ARIA-Attribute sind synchron; Tastaturaktivierung ist
  nachgewiesen.
- Expertenwert eingeben, schließen und wieder öffnen erhält den Wert exakt;
  reines Öffnen/Schließen ändert Patchvorschau und Add-Button-Materialität
  nicht.
- Form-Reset nach erfolgreicher Variante leert die Patchfelder, ohne
  Workspacewerte zu verändern; der Experten-Anzeigezustand wird nicht
  persistiert.
- `minimumFlexAnnual > effective startFlexBedarf` erscheint als verständlicher
  Fehler und startet keinen Replay-Lauf.

**Fokussierte Entwicklerläufe:**

```text
node tests/run-single.mjs tests/stress-replay-ui.test.mjs
node tests/run-single.mjs tests/stress-replay-renderer.test.mjs
node tests/browser-smoke.test.mjs
```

Die Browserausführung kann im Agentensandbox an Port-/Browserrestriktionen
scheitern; das ist allein kein Produktentscheid. In diesem Fall dokumentiert
Codex den fokussierten Stand und übergibt normal an die autoritative
Orchestratorvalidierung.

**Stopbedingungen:** Der Toggle müsste Werte löschen, eine bestehende
Expertenabhängigkeit ließe sich nicht erhalten, UI und Contract verwenden
andere Pfade oder Einheiten, oder Mindest-Flex würde im UI statt durch einen
Fehler automatisch angepasst.

### Slice 3 – Echter Replay-Durchstich, Dokumentation und Abschlussgates

**Abhängigkeit:** Slice 1 und 2 sind einzeln geprüft; es besteht kein roter
Zwischenvertrag.

**Ziel:** Mit echter MC-Pfadmaterialisierung und echter Jahresengine
nachweisen, dass alle drei Ausgangswerte den fixierten Pfad unverändert
erreichen und erwartungsgemäße Finanzwirkungen erzeugen; Nutzer- und
Architekturdokumentation synchronisieren.

**Exakter Änderungspfad**

- `tests/stress-replay-e2e.test.mjs`
- `tests/browser-smoke.test.mjs`
- `README.md`
- `Handbuch.html`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `tests/README.md`
- `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`

Produktive Änderungsgruppen: 1 (`Handbuch.html`); die übrigen Pfade sind
Tests oder Dokumentation.

**Umsetzung und Akzeptanzorakel:**

- Der E2E-Durchstich erstellt eine V2-Variante mit expliziten Bedarfswerten,
  rechnet auf demselben materialisierten 60-Jahres-Pfad und belegt gleiche
  Pfad-/Source-Fingerprints sowie unveränderte Baselineinputs.
- Gezielt gewählte Floor- und Flexänderungen verändern Entnahme- oder
  Endwertkennzahlen plausibel; eine Mindest-Flex-Änderung wird in
  `minimumFlexAnnual`, Mindest-Flex-Diagnostik beziehungsweise Fehlbetrag
  beobachtbar. Der Test behauptet keine allgemeine Vorteilhaftigkeit.
- Ein expliziter Nullfall wird über Export, Import und erneuten Runnerlauf
  geführt und bleibt null. Der Baseline-Lauf ohne Variantenpatch reproduziert
  weiterhin die Ursprungslauf-Reconciliation; ein leerer Alternativpatch
  bleibt wie bisher als No-Op unzulässig.
- Ein Legacy-V1-Export wird importiert und erneut ausgeführt; fehlende neue
  Patchblätter übernehmen nachweislich die drei Baselinewerte.
- Browser-Smoke deckt Fokusansicht, Toggle, ARIA, Datenhalt und verständliche
  Relationserroranzeige im realen DOM ab.
- README und Handbuch beschreiben den fokussierten Hauptworkflow;
  Referenzdokumente benennen Whitelist V2, Legacy-Dispatch, Nullvertrag,
  effektive Relation und Expertenbereich. Die frühere Aussage, Mindest-Flex
  sei kein Variantenfeld, wird entfernt.
- Testdokumentation führt die neuen Orakel und die V1-Kompatibilitätsfixture
  auf. Die bestehende Performancefixture wird nur verändert, wenn die
  autoritative Messung eine erwartbare, begründete Budgetaktualisierung
  verlangt; unerwartete Performance- oder Ergebnisdeltas stoppen den Slice.

**Fokussierte Entwicklerläufe:**

```text
node tests/run-single.mjs tests/stress-replay-e2e.test.mjs
node tests/browser-smoke.test.mjs
git diff --check
```

## 8. Gesamtvalidierung

Codex führt in den Umsetzungsslices nur die jeweils fokussierten Läufe aus.
Nach Implementierungsbereitschaft führt ausschließlich der Orchestrator die
autoritative Matrix und fingerprintgebundene Attestierung aus:

```text
npm test
npm run test:browser
```

`npm run build:engine` ist nicht vorgesehen, weil weder `engine/` noch die
öffentliche `EngineAPI` geändert werden. Sollte eine Engineänderung doch
erforderlich werden, greift die Stopregel; sie wird nicht still in den Scope
aufgenommen.

Die Gesamtmatrix muss insbesondere belegen:

- Contract-, Varianten-, Runner-, Persistenz-, Export-, UI-, Renderer-, E2E-
  und Browsertests sind grün;
- bestehende Expertenvarianten bleiben ausführbar;
- V1-Golden-Import und neue V2-Variante funktionieren nebeneinander;
- Baseline-Reconciliation, Worker-/Direktparität und normale Monte-Carlo-
  Tests bleiben unverändert erfolgreich;
- keine Snapshot-, Backtest-, FlowDelta-, Daten- oder Enginefingerprints
  weichen außerhalb der erwarteten Replay-Variantenwirkung ab.

## 9. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme / Oracle |
| --- | --- |
| `0` geht durch Falsy-Defaulting verloren | Präsenzprüfungen statt Truthiness; Unit-, Runner- und Export/Import-Nullfall |
| Mindest-Flex wird nur gegen den Patch statt gegen effektive Werte geprüft | Gemeinsamer Validator mit Patch-plus-Baseline-Matrix in Contract- und UI-Tests |
| V1-Regeln werden durch die erweiterte Whitelist rückwirkend geändert | Unveränderliche V1-Deskriptoren; Dispatch über gespeicherte `whitelistVersion`; Golden-Fingerprints |
| Baseline oder Pfad wird beim Variantenlauf mutiert | Fingerprints vor/nach Vorschau und Lauf; E2E-Byte-/Fingerprintorakel |
| Experten-Toggle löscht Controls oder erzeugt einen Patch | Reiner `hidden`-/ARIA-Zustand; Browsertest mit eingegebenem Wert und unveränderter Vorschau |
| Neuer Bedarfswert erreicht nur die Vorschau, nicht die Engine | Dependency-Spy am Runner plus echter 60-Jahres-Durchstich und Ergebnisdelta |
| Konfiguriertes Mindest-Flex wird mit erfülltem Mindest-Flex verwechselt | Getrennte Contract- und Ergebnisbegriffe; keine Input-Klemmung; Dokumentationssync |
| Persistierter Legacy-Workspace wird beim Laden unbemerkt umgeschrieben | Nichtmutierender Load/Inspect-Test und byteidentischer V1-Roundtrip |
| UI-/Contractfeldnamen driften | Exakte Pfadtabelle und Browser-/Contractorakel; Drift ist Stopgrund |

## 10. Nicht-Scope

Nicht Bestandteil dieses Bugfixes sind:

- Änderungen der fachlichen Berechnung von Floor, Flex oder Mindest-Flex;
- Änderungen an Engine-Planern, Validatorsemantik oder Ergebnisdefinitionen;
- Änderungen des fixierten MC-Pfads, seiner Fortsetzung oder RNG-Aufrufreihenfolge;
- neue Asset-, Steuer-, Pflege-, Renten-, Flexbudget-, Profil- oder
  Tranchenvarianten;
- Entfernung oder inhaltliche Vereinfachung bestehender Expertenparameter;
- Persistenz des rein visuellen Experten-Anzeigezustands;
- Release-, Tauri-, `dist/`-, EXE- oder generierte Engine-Artefakte;
- Push, Merge, Commit oder Branchwechsel durch Codex.

## 11. Prozess- und Stopvertrag

Vor jedem Slice entsteht eine eigene 1-basierte Slice-MD mit Branch-/Status-
Preflight, exaktem Scope, Diff-Risiko, Testplan und Rückdokumentation. Codex
implementiert und plausibilisiert, genehmigt aber weder Plan noch eigene
Änderungen. Review, autoritative Validierung, Commit und weitere
Git-Transaktionen bleiben beim Orchestrator beziehungsweise den vorgesehenen
Reviewrollen.

Die drei Slices benennen zusammen genau zehn eindeutige produktive
Anwendungs-/Konfigurationsdateien; Test- und reine Dokumentationspfade sind
dabei nicht mitgezählt. Jede zusätzliche produktive Datei erfordert vor ihrer
Aufnahme eine erneute Stopregel- und Scopeprüfung.

Zusätzlich zu den allgemeinen Stopregeln wird sofort angehalten, wenn:

- mehr als zehn produktive Dateien insgesamt erforderlich werden;
- eine Änderung bestehender Engine-Semantik nötig wird;
- UI, Replay-Contract und Engine widersprüchliche Pfade oder Einheiten zeigen;
- `minimumFlexAnnual` als Eingabewert irgendwo still begrenzt, ersetzt oder an
  Flex angepasst werden müsste;
- ein gültiger alter Workspace nicht ohne Raten seiner Baseline semantisch
  erhalten werden kann;
- Baseline-Reconciliation, Path-/Source-Fingerprint, Snapshot, Backtest,
  FlowDelta oder Workerparität unerwartet abweichen;
- die erforderlichen fokussierten Tests nicht ausführbar und nicht sinnvoll
  ersetzbar sind.

Dieser Plan ersetzt für den vorliegenden Bugfix die frühere Festlegung in
`docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md`, nach der Mindest-Flex und
Bedarfsfelder außerhalb der V1-Whitelist bleiben. Die historische V1-Regel
selbst bleibt für bereits gespeicherte V1-Varianten erhalten; nur neu erzeugte
V2-Varianten erhalten die drei zusätzlichen Felder.

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-56427478414a`
- Testdateien: keine
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-56427478414a`
- Testdateien: keine
- Prüfdimensionen: contract-versioning-v1-v2-dispatch, baseline-0-vs-empty-distinction, effective-mindest-flex-validation, expert-toggle-accessibility-and-state-retention, legacy-workspace-import-roundtrip, runner-engine-input-plumbing, slice-scope-discipline
- Größtes Restrisiko: A subtle discrepancy during Slice 1 between V1 and V2 baseline strategy projection where an existing V1 snapshot lacks the three baseline Bedarf fields, causing an unintended fallback or false-positive mutation during legacy workspace validation.
- Realistische Bruchbedingung: Importing a legacy V1 workspace export that was serialized without startFloorBedarf/startFlexBedarf/minimumFlexAnnual in its baseline snapshot causes the new V2 validator to fail with STRESS_REPLAY_CONTRACT_INVALID rather than falling back to the V1 contract validator.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-56427478414a`

- Diff-Fingerprint: `56427478414af174ce73ec96086ca4415ffefa2a1954688a44e08691b2e12ed1`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `f192f8572fac0d3f12977df25523321a7807e200893d8da63e808fa3a84f976c`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=3; work_plan=docs/internal/stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure cause is a partial V2 dispatch: Slice 1 implements whitelist/patch/runner V2 support, but a downstream consumer (e.g., variant-list rendering, comparison export summary, or an import code path not explicitly enumerated in Slice 1's file list) still assumes only V1 exists, so an effective-relation violation or a lost explicit &#96;0&#96; slips past validation into a rendered variant instead of being rejected — surfacing only when a real legacy V1 workspace containing an edge-case (baseline &#96;0&#96;) is imported alongside a newly created V2 variant in the same workspace.
  - Ereignis 3: The most likely failure cause in three months is an edge-case in legacy workspace import where a historical V1 export created prior to V2 contract introduction is imported into a runtime that performs cross-validation against the current input schema, causing an unhandled contract validation failure when encountering a variant that omits the three new Bedarfe fields or when an existing baseline contains 0 for Floor/Flex.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The plan explicitly states it supersedes &#96;docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md&#96;'s prior rule that Mindest-Flex/Bedarf fields stay outside the V1 whitelist (§11), but no Slice's exact path list (Slice 1/2/3) schedules an update or deprecation note in that older document. Left as-is, a future agent or reviewer reading only the legacy arbeitsplan could reintroduce the old restriction or treat V2 fields as still forbidden.
- Akzeptanztest: Before or during Slice 3 documentation sync, add &#96;docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md&#96; to the exact path allowlist (or an equivalent doc) with a short note pointing to the superseding V2 contract, verified by a manual doc-diff review, not a VALIDATE command.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The plan explicitly states it supersedes &#96;docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md&#96;'s prior rule that Mindest-Flex/Bedarf fields stay outside the V1 whitelist (§11), but no Slice's exact path list (Slice 1/2/3) schedules an update or deprecation note in that older document. Left as-is, a future agent or reviewer reading only the legacy arbeitsplan could reintroduce the old restriction or treat V2 fields as still forbidden. | OBSERVATION | offen | offen |
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
