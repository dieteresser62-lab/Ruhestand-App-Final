# Analyse: Fehlender Variantenvergleich im Stresspfad-Replay

**Stand:** 2026-08-17

**Analysierter Branch:** `codex/stress-pfad-replay`

**Baseline:** `e51c163c514f304b86d5d18bb6ec72fb64180fe0` (Produktcode
gegenüber dessen Parent `5eeca8b2` unverändert)

**Rolle:** Codex als Implementer; keine Eigenfreigabe

## Kurzantwort und Klassifikation

**Nein, die Eingabe 28.000 EUR Flex-Bedarf und 12.000 EUR Mindest-Flex ist bei
einer Baseline von 90.000/30.000 EUR kein Bedienfehler.** Beide Werte sind
endlich, nicht negativ, und Mindest-Flex liegt unter Flex-Bedarf. Auf dem
vorhandenen echten 60-Jahres-E2E-Pfad erreicht genau dieser Patch die Engine
unverändert; beide Replay-Läufe und der Vergleich schließen erfolgreich ab.

Der gemeldete Gesamtzustand enthält dagegen einen **sicher belegten
Softwaredefekt in der UI-Orchestrierung**: Wenn die Vergleichsrechnung wirft,
setzt `computeComparison()` den Vergleich korrekt auf `null` und meldet den
Fehler. `addVariant()`, `removeVariant()` und der registrierte Recompute-
Click-Handler überschreiben diesen Fehler danach jeweils bedingungslos mit
einer Erfolgsmeldung. Deshalb können gleichzeitig der Leertext „Noch kein
Variantenvergleich berechnet.“ und eine irreführende Erfolgsmeldung sichtbar
sein.

Die **konkrete erste Ausnahme der ursprünglich beobachteten Rechnung** ist
ohne Originalexport beziehungsweise den kurzzeitig sichtbaren Fehlertext
nicht rekonstruierbar. Sie trat mit dem synthetisch angepassten, gültigen
Workspace auf der aktuellen Baseline nicht auf. Eine export-, laufzeit- oder
versionsspezifische Dateninkompatibilität ist deshalb weder belegt noch
ausgeschlossen. Der nachgewiesene UI-Defekt erklärt, warum der ursprüngliche
Fehler aus der Oberfläche verschwunden ist; er beweist nicht, welche
Berechnungsfunktion im ursprünglichen Lauf zuerst warf.

## Reproduktionsaufbau

### Datenbasis und Bedienfolge

Verwendet wurde der unveränderte 60-Jahres-Aufbau aus
`tests/stress-replay-e2e.test.mjs` mit historischem Datenbestand, echtem
`EngineAPI`, per-run Seed und materialisiertem Stresspfad. Nur für den über
Standard-Eingabe ausgeführten Nachweis wurden im Speicher folgende Werte
gesetzt; keine Repositorydatei, Fixture oder gespeicherte Nutzerdaten wurde
verändert:

1. Baseline `startFlexBedarf = 90000` und `minimumFlexAnnual = 30000`.
2. Form-Control-Zeichenfolgen `'28000'` und `'12000'`; alle übrigen
   Variantenfelder bleiben `''`.
3. Vorschau, Variantenerzeugung, Anwendung und getrennte Läufe für Baseline
   und „Reduziert“.
4. Aufruf von `buildStressReplayComparisonV1()` mit genau diesen Varianten
   und Resultaten.
5. Aufbau eines initialen und eines um „Reduziert“ erweiterten Workspace zur
   Prüfung von Reihenfolge, Baseline-, Pfad- und Workspace-Identität.

Der stdin-Nachweis ist reproduzierbar, indem der Setup-Teil bis einschließlich
Pfadmaterialisierung (Zeilen 1–136) aus `tests/stress-replay-e2e.test.mjs` an
`node --input-type=module` geleitet wird, die beiden Baseline-Literale im
Stream auf 90000/30000 ersetzt werden und danach diese Funktionsfolge läuft:

```text
patch = { strategy: {
  startFlexBedarf: Number('28000'),
  minimumFlexAnnual: Number('12000')
} }
previewStressReplayVariantPatchV1({ baselineInputs, patch })
createStressReplayBaselineVariantV1({ baselineInputs })
createStressReplayVariantV1({ id: 'reduced', label: 'Reduziert', baselineInputs, patch })
applyStressReplayVariantV1({ baselineInputs, variant })
runStressReplayPathV1(...) für Baseline und Alternative
buildStressReplayComparisonV1({ variants, results })
createStressReplayWorkspaceV1(...) vor und nach Hinzufügen der Alternative
```

Der Prozess endete mit Exitcode 0. Ein zweiter stdin-Nachweis verwendete den
Fake-DOM-Aufbau aus `tests/stress-replay-ui.test.mjs` und eine injizierte
`runComparison()`-Funktion, die
`CONTROLLED_COMPARISON_FAILURE: kontrollierter Vergleichsfehler` wirft. Damit
wurden `addVariant()`, `removeVariant()`, `recomputeComparison()` und der echte
registrierte Recompute-Click-Handler getrennt durchlaufen; auch dieser Prozess
endete mit Exitcode 0.

### Abgrenzung zum Originalfall

Der Originalexport und dessen Laufzeit-Fingerprints lagen nicht vor. Der
synthetische Workspace nutzt dieselben Contract-, Runner- und Comparison-
Funktionen und einen echten materialisierten Pfad, kann aber eine nur im
Original vorhandene Beschädigung oder einen abweichenden Build nicht
nachbilden. Es wird daher keine unbekannte Originalausnahme als konkrete
Ursache ausgegeben.

## Wert- und Identitätsfluss

| Stufe | Beobachtung | Ergebnis |
|---|---|---|
| Form-Control | `'28000'`, `'12000'`, übrige Controls `''` | Strings; `''` wird übersprungen |
| `readVariantPatch()` | `Number()` erzeugt `28000` und `12000` | beide Blätter vorhanden, Typ `number` |
| Patch-Vorschau | `{strategy:{startFlexBedarf:28000, minimumFlexAnnual:12000}}` | unverändert normalisiert; zwei Materialgruppen |
| Variantenerzeugung | gespeicherter Patch identisch | `id = reduced`, Rolle `alternative` |
| Anwendung | effektiv `28000`/`12000` | kein Clamping, keine stille Begrenzung |
| Baseline-Runner | `horizon_exhausted`, `technicalError = null` | erstes Finanzjahr führt Mindest-Flex 30000 |
| Alternativ-Runner | `horizon_exhausted`, `technicalError = null` | erstes Finanzjahr führt Mindest-Flex 12000 |
| Comparison-Builder | kein Fehler, Rückgabewert ist ein Vergleich | `overallStatus = complete`, Pair `comparable = true` |
| Controller/Renderer im Erfolgsfall | nicht `null` | der Leerzustand ist für diesen Durchstich nicht zu erwarten |

Die Leerwertabgrenzung ist explizit: `readVariantPatch()` prüft in
`app/simulator/stress-replay-ui.js:83-93` auf die exakte Zeichenfolge `''`.
Damit fehlen unveränderte Blätter tatsächlich, während `Number('0') === 0`
als eigenes Blatt erhalten bleibt. Im exakten Nachweis ergab
`Object.hasOwn(patch.strategy, ...)` für beide eingegebenen Werte `true`.

### Konkrete Fingerprints und Bindungen

| Identität | Beobachteter Wert beziehungsweise Beziehung |
|---|---|
| Baseline-Szenario | `2a35ea7aa62b21a9e344c21c7fd812b4b5aaa00f29798e300c6081441fef2cec` |
| normalisierter Alternativ-Input | `731ccfb08ef3eb14d7ca50a49b5c9c47c844be2acbf9fca8d765ac5aefe3dfb7` |
| angewandter Input | identisch zum normalisierten Alternativ-Input |
| Variante „Reduziert“ | `622f0756c2dbf6e7ef0c8056b6cb914da122333e498c6086bff76966e7154cdc` |
| Baseline-Variante | `cf01728ad5d9cdca61b61d2b97bb109b624b2fdb6690dfe1763c3632dc9e4ecb` |
| Pfad in Workspace, beiden Resultaten und Vergleich | `589d426dfb8ee3d72c3b3c2dc746f6d7b9d23cba11d184f7917ee4556af93464` |
| Vergleich | `367cffdd302bc18c33c6e78bc96b4f8c03c4ce1ca83175313b1658cb026456b5` |
| Source Identity | `81b704cffa4aa524339e486c445ea0a311cb2ea1ad29148b544662701d0d0f35` |
| initialer Workspace | `8ab1a8e60e812a0a38763892a957a0ec2ff95e9301ba0e826026e38140bfbd50` |
| erweiterter Workspace | `d51726acdd837b2c398bb3dcdf61efa1f5e01a0b5d384a174575b65189e17407` |

`variant.id` und `result.variantId` waren paarweise `baseline`/`baseline` und
`reduced`/`reduced`; beide Listen ergaben die Reihenfolge
`baseline,reduced`. Alle Resultate trugen denselben Baseline- und
Pfadfingerprint. Nur die Baseline wurde gegen die gespeicherte Source Identity
reconciled; die Alternative trägt vertragsgemäß den Grund
`alternative_not_source_reconciled` (`stress-replay-runner.js:502-504`).
Baseline-JSON, Baseline-Fingerprint und Pfadfingerprint blieben vor und nach
der Workspace-Mutation identisch; nur der erwartungsgemäß umfassendere
Workspace-Fingerprint änderte sich.

Die relevanten Prüfgrenzen liegen in
`stress-replay-variant.js:100-141` (Vorschau), `:144-187` (Erzeugung) und
`:205-232` (Anwendung), `stress-replay-runner.js:249-293` und `:502-548`
(Lauf und Resultatidentität), `stress-replay-comparison.js:277-328`
(Paar-/Fingerprintabgleich) sowie `:340-401` (Vergleichsaufbau). Der Workspace
prüft dieselben Bindungen in `stress-replay-contract.js:1231-1287`.

## Bestimmung des ersten Fehlschlags

### Exakter 28.000/12.000-Durchstich

Es gibt auf der analysierten Baseline **keine fehlschlagende Funktion**:

- Vorschau, Erzeugung und Anwendung werfen nicht.
- Beide Runner liefern `technicalError = null`.
- `buildStressReplayComparisonV1()` wirft nicht und liefert den oben
  fingerprintgebundenen vollständigen Vergleich.
- Somit würde `defaultRunComparison()` in `stress-replay-ui.js:117-125` ein
  Objekt mit nichtleerem `comparison` und zwei Resultaten zurückgeben.

Insbesondere ist ein technischer Runner-Status nicht automatisch ein Grund
für `null`: Der Builder bildet technische Resultate als
`overallStatus = blocked_technical_error` ab
(`stress-replay-comparison.js:360-400`). Ein `null` aus `computeComparison()`
setzt daher einen tatsächlich geworfenen Fehler vor erfolgreicher Zuweisung
voraus oder eine injizierte/abweichende `runComparison()`-Implementierung.

### Kontrollierter Fehlerpfad

Im kontrollierten UI-Nachweis ist die erste fehlschlagende Funktion die
absichtlich injizierte `runComparison()` mit:

```text
name: Error
code: CONTROLLED_COMPARISON_FAILURE
message: kontrollierter Vergleichsfehler
details: { stage: 'comparison' }
return value: keiner (throw)
```

`computeComparison()` setzt zuvor `comparison = null` und `results = []`,
fängt den Fehler, meldet „Variantenvergleich fehlgeschlagen: kontrollierter
Vergleichsfehler“, rendert den Leerzustand und gibt `null` zurück
(`stress-replay-ui.js:388-410`). Diese Injektion belegt ausschließlich die
Aufrufer- und Statussemantik. Sie wird nicht als Primärfehler des
Originalfalls ausgegeben.

## UI-Abläufe und Statusüberschreibung

Der Renderer zeigt bei `comparison === null` den Text „Noch kein
Variantenvergleich berechnet.“ (`stress-replay-renderer.js:190-208`). Für
denselben kontrollierten Fehler ergaben sich folgende zeitlich getrennte
Zustände:

| Aufrufer | Rückgabe von `computeComparison()` | Status direkt im Catch | Status nach Rücksprung | Renderer | Fokus |
|---|---:|---|---|---|---|
| `addVariant()` | `null` | Fehlertext, `data-status=error` | „Variante „Reduziert“ wurde … berechnet.“, `ok` | Leertext | Live-Region fokussiert |
| `removeVariant()` | `null` | Fehlertext, `error` | „Variante entfernt; der Vergleich wurde neu berechnet.“, `ok` | Leertext | Live-Region fokussiert |
| direkter `recomputeComparison()`-Aufruf | `null` | Fehlertext, `error` | bleibt erhalten | Leertext | Live-Region fokussiert |
| registrierter Recompute-Click | `null` | Fehlertext, `error` | „Vergleich … neu berechnet.“, `ok` | Leertext | Live-Region fokussiert |

`finishBusyAction()` rendert erneut, ändert den Statustext aber nicht. Die
Überschreibung erfolgt vorher beziehungsweise beim Click direkt in den
Aufrufern:

- `addVariant()`: Rückgabewert wird in `stress-replay-ui.js:471` ignoriert,
  Erfolg folgt in `:478`.
- `removeVariant()`: Rückgabewert wird in `:495` ignoriert, Erfolg folgt in
  `:496`.
- `recomputeComparison()` selbst reicht `null` korrekt durch (`:413-420`).
  Erst der Click-Handler ignoriert ihn in `:767-770` und meldet Erfolg.

Damit sind Leerzustand und Statusüberschreibung getrennt: Der Catch erzeugt
den leeren Vergleich als Reaktion auf einen vorgelagerten Throw; die späteren
Statusaufrufe verbergen nur dessen Diagnose.

## Minimaler Korrekturansatz

Der kleinste sichere UI-Fix liegt ausschließlich an den drei Aufrufstellen:

1. Rückgabewert von `computeComparison()` beziehungsweise
   `recomputeComparison()` prüfen.
2. Erfolg nur bei einem nichtleeren Vergleich melden.
3. Bei `null` den bereits von `computeComparison()` gesetzten Fehlerstatus
   unverändert lassen; keine zweite generische Meldung schreiben.
4. Für `addVariant()` und `removeVariant()` Mutation und Rechenerfolg in der
   Rückgabesemantik ausdrücklich trennen. Die persistierte Mutation darf nicht
   fälschlich als berechneter Vergleich bezeichnet werden.

Ein upstream Fix ist anhand dieser Analyse **nicht** seriös festlegbar. Dafür
muss zunächst der konkrete Fehler des Originalexports reproduziert werden.
Eine Änderung von Engine-Semantik, Replay-Vertrag, Fingerprints oder
`minimumFlexAnnual` ist durch den aktuellen Nachweis weder nötig noch
gerechtfertigt.

## Präziser Regressionstestumfang für eine spätere Behebung

In `tests/stress-replay-ui.test.mjs` sollten ergänzt werden:

- Formwerte `'28000'`/`'12000'` bei Baseline 90000/30000; leere Controls
  fehlen im Patch, `'0'` bleibt ein numerisches Blatt.
- `computeComparison()` bei Erfolg und bei geworfenem Fehler einschließlich
  `comparison`, Results, Live-Region, Fokus und Renderer-Leertext.
- `addVariant()`, `removeVariant()` und der registrierte Recompute-Click bei
  `null`: keine Erfolgsmeldung, Catch-Fehler bleibt sichtbar.
- Dieselben drei Pfade bei Erfolg: Erfolgsmeldung und sichtbarer Vergleich.

In `tests/stress-replay-e2e.test.mjs` sollte der bestehende V2-Durchstich um
das exakte Wertepaar 90000/30000 → 28000/12000 und den anschließenden
`buildStressReplayComparisonV1()`-Aufruf erweitert werden. Zu prüfen sind
Patchblätter, effektive Inputs, erster Engine-Jahreswert, `technicalError`,
IDs, Baseline-/Pfad-/Variantenfingerprints, vollständiger Vergleich und
Unveränderlichkeit von Baseline und Pfad.

Ein gezielt inkompatibler Negativfall gehört in
`tests/stress-replay-comparison.test.mjs`: abweichender Pfad-, Baseline- oder
Variantenfingerprint muss mit dem jeweiligen Contractcode werfen. Erst wenn
der Originalexport einen anderen ersten Fehler belegt, ist genau an dessen
Funktionsrand ein weiterer fokussierter Regressionstest zu ergänzen.

## Validierung

| Befehl/Nachweis | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/stress-replay-ui.test.mjs` | PASS, 98/98 Assertions, Exit 0 |
| `node tests/run-single.mjs tests/stress-replay-e2e.test.mjs` | PASS, 91/91 Assertions, Exit 0 |
| stdin-Durchstich 90000/30000 → 28000/12000 | PASS, vollständiger Vergleich, Exit 0 |
| stdin-Fake-DOM mit kontrolliertem Throw | PASS, alle vier Statusabläufe protokolliert, Exit 0 |

Die vollständige Validierungsmatrix wurde vertragsgemäß nicht im
Agentenprozess ausgeführt; sie bleibt dem Orchestrator vorbehalten. Produktcode,
Tests, Fixtures, Snapshots, Engine-Artefakte und Nutzerdaten wurden nicht
verändert.

## Verbleibende Unsicherheit

Das größte Restrisiko ist ein nur im fehlenden Originalexport oder in dessen
damaliger Laufzeit vorhandener Identitäts-/Versionsfehler. Realistisch bricht
die Übertragbarkeit dieser Analyse, wenn der Originalworkspace zwar formal
ladbar ist, aber erst beim Runner oder Comparison-Builder einen Fingerprint-
oder Resultatfehler auslöst, den der synthetische Workspace nicht enthält.
Der UI-Maskierungsdefekt bleibt davon unabhängig gültig; die upstream
Ursachenklasse darf erst nach Reproduktion dieses konkreten Fehlers enger als
„unbekannt“ gefasst werden.
