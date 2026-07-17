# Slice 7 – Pflegekosten-Einheitenvertrag

**Stand:** 2026-07-17  
**Status:** implementiert; Review ausstehend  
**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`  
**GitHub-Status:** Branch nur lokal; Veröffentlichung nicht beauftragt  
**Übergeordneter Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)

## Ziel

PD-02/MR-10 wird behoben, indem die zusätzliche Pflegekosten-Drift an den
beiden fachlichen Input-Grenzen genau einmal von einem Prozentwert in ein
Verhältnis umgerechnet und downstream ohne weitere Skalierung verwendet wird.
Ein gespeicherter beziehungsweise angezeigter Wert von `3,5` muss dadurch im
Laufzeitvertrag als `0,035` und in der Jahresfortschreibung als Faktor `1,035`
wirken, nicht als `0,00035` beziehungsweise `1,00035`.

Der Nutzerauftrag „Implementiere Slice 7“ vom 2026-07-17 bestätigt U-K07 für
den im freigegebenen Korrekturplan definierten kanonischen Einheitenvertrag.
Das dortige Reviewer-Gate wurde durch das Planreview von Gemini ohne Blocker
für diese Vertragsrichtung erfüllt. Die Implementierung selbst bleibt
separat review- und freigabepflichtig.

## Akzeptanzkriterien

- UI und persistierte Profile speichern beziehungsweise zeigen weiterhin
  Prozentwerte wie `3.5`; das JSON-Profilformat wird nicht migriert.
- UI-Reader und Profil-Builder normalisieren Prozentwerte genau einmal auf
  ein nicht negatives, endliches Verhältnis.
- `0 %`, `3,5 %` und ein hoher gültiger Grenzwert werden an beiden
  Input-Grenzen konsistent behandelt.
- Negative Werte werden an der jeweiligen Input-Grenze auf `0` normalisiert.
- Nicht endliche oder nicht numerische UI-Werte verwenden den bestehenden
  UI-Default `3,5 %`; nicht lesbare beziehungsweise fehlende Profilwerte
  verwenden aus Kompatibilitätsgründen weiterhin `0 %`.
- Simulator, Monte-Carlo-Runner und Worker transportieren anschließend
  ausschließlich das Verhältnis; `simulator-engine-helpers.js` teilt nicht
  erneut durch `100` und begrenzt den bereits normalisierten Wert nicht still.
- Ein deterministischer Pflegefall weist für `3,5 %` den Faktor `1,035` und
  die erwartete mehrjährige Kostenfortschreibung nach.
- Pflege-Cap und Ramp-up bleiben fachlich unverändert und werden mit
  deterministischen Jahren geprüft.
- Serial-/Chunk-/Worker-Verträge bleiben paritätisch; auffälliger FlowDelta
  oder unerklärte Snapshot-/Backtest-Deltas stoppt den Slice.

## Scope

### Programm- und Testdateien

- `app/simulator/simulator-input-care.js`
- `app/simulator/simulator-profile-inputs.js`
- `app/simulator/simulator-engine-helpers.js`
- `tests/simulator-input-readers.test.mjs`
- `tests/simulator-multiprofile-aggregation.test.mjs`
- `tests/care-meta.test.mjs`
- `tests/worker-parity.test.mjs`

Damit umfasst der vorab festgelegte Programmscope sieben Dateien und bleibt
unter der Stop-Schwelle von zehn Programmdateien.

### Dokumentation

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`
- `tests/README.md`
- diese Slice-Datei und der übergeordnete Korrekturplan
- nur bei nachgewiesenem Synchronisationsbedarf:
  `docs/reference/TECHNICAL.md`,
  `docs/reference/SIMULATOR_MODULES_README.md` und `tests/README.md`

## Nicht-Scope

- Änderungen unter `engine/` oder an der öffentlichen `EngineAPI`;
- manuelle Änderungen an `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Änderung des persistierten Profil-/JSON-Schemas oder Migration alter
  Profile;
- Änderung der Einheit von `pflegeRegionalZuschlag` oder anderer Care-Felder;
- Änderung von Pflegeeintritt, Gradprogression, Mortalität, Ramp-up- oder
  Cap-Semantik;
- PD-03/KPI-Label und Forschungsvalidierungs-Backlog;
- Änderung, Begrenzung oder Umbenennung von `minimumFlexAnnual`;
- Commit, Push oder Veröffentlichung;
- vorbestehende ungetrackte Playwright-Dateien unter `node_modules/`.

## Kanonischer Einheiten- und Fehlervertrag vor dem ersten Code-Edit

1. Persistierte beziehungsweise im DOM gelesene Werte sind Prozentwerte.
2. `readCareInputs()` und `buildSimulatorInputsFromProfileData()` sind die
   beiden Normalisierungsgrenzen. Beide verwenden denselben reinen
   Normalisierungshelfer.
3. Der Normalisierungshelfer erhält einen bereits numerisch gelesenen
   Prozentwert, ersetzt nicht endliche Werte durch den grenzspezifischen
   Fallback, setzt negative Werte auf `0` und teilt genau einmal durch `100`.
4. Der bestehende UI-Fallback bleibt `3,5 %`; der bestehende Profilfallback
   bleibt `0 %`. Diese unterschiedlichen Missing-Value-Defaults ändern nicht
   die Einheit des gemeinsamen Vertrags.
5. Ab Rückgabe der Reader ist `pflegeKostenDrift` stets ein nicht negatives,
   endliches Verhältnis. Runner und Worker kopieren beziehungsweise
   serialisieren diesen Wert unverändert.
6. `updateCareMeta()` vertraut dem normalisierten Laufzeitvertrag und verwendet
   das Verhältnis direkt als `1 + pflegeKostenDrift`. Es führt keine zweite
   Prozentnormalisierung und keine stille Negativbegrenzung aus.
7. Der regionale Zuschlag bleibt unverändert und ist nicht Teil von PD-02.

## Branch- und Statusnachweis vor dem ersten Codex-Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git rev-parse --short HEAD`: `77e1034`
- sicherer Vorgänger: freigegebener Slice-06-Commit
  `77e1034 feat/test/docs: Slice 06 (Real-/Nominalvertrag im Simulator)
  freigegeben`
- getrackte Voränderungen: keine;
- vorbestehend und außerhalb des Auftrags: ungetrackte Playwright-Dateien
  unter `node_modules/`.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- die sieben Programm-/Testdateien aus dem Scope;
- das Hauptdokument nach erfolgreicher Laufzeitvalidierung;
- diese Slice-Datei und der übergeordnete Korrekturplan.

**Voraussichtliche Änderungstiefe:**

- mittel; beabsichtigte Erhöhung der Pflegekostenwirkung bei positiven
  Driftwerten, ohne Änderung der EngineAPI oder anderer Pflegeparameter.

**Gefährdete bestehende Tests:**

- `care-meta.test.mjs`;
- `simulator-input-readers.test.mjs`;
- `simulator-multiprofile-aggregation.test.mjs`;
- `simulator-monte-carlo.test.mjs` und `worker-parity.test.mjs`;
- Backtest-/Snapshot- und FlowDelta-Assertions der Gesamtsuite.

**Nicht anfassen:**

- `engine/`, `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`;
- Persistenzschema, Regionalzuschlag, Pflegewahrscheinlichkeiten,
  Pflegeprogression, Mortalität, PD-03 und `minimumFlexAnnual`.

**Rollback-Strategie:**

- bestehende Scope-Dateien gezielt mit `git checkout -- <datei>` auf den
  Slice-06-Stand zurücksetzen;
- die neue Slice-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regel für mehr als zehn Programmdateien greift nicht. Vor jedem
zusätzlichen Programmscope wird erneut gezählt; eine achte bis zehnte Datei
benötigt Datenflussnachweis, eine elfte Datei stoppt den Slice.

## Vorher-Baseline und zulässige Delta-Klassen

Vor dem ersten Produktcode-Edit werden erhoben:

1. fokussierte Care-, Input-, Profil- und Worker-Paritätsgates;
2. UI- und Profilnormalisierung für `0`, `3,5`, negative und nicht numerische
   Prozentwerte;
3. deterministischer aktiver Pflegefall ohne Inflation, bei dem der aktuelle
   doppelte Skalierungspfad für `0,035` als Laufzeitwert sichtbar wird;
4. bestehende Gesamtsuite aus dem sicheren Slice-06-Stand.

Die Vorher-Baseline wurde am 2026-07-17 auf `77e1034` vor dem ersten
Produktcode-Edit erhoben:

| Fixture | Vorher-Ergebnis |
| --- | --- |
| UI-Reader `0 / 3,5 / 100 / -1 / ungültig` Prozent | `0 / 0,035 / 1 / 0 / 0,035`; UI-Grenze normalisiert bereits konsistent und nutzt bei ungültigem Wert den Default |
| Profil-Builder `0 / 3,5 / 100 / -1 / ungültig` Prozent | `0 / 0,035 / 1 / -0,01 / 0`; negativer Profilwert verletzt den nicht negativen Laufzeitvertrag |
| aktiver Pflegefall, 0 % Inflation, Laufzeitwert `pflegeKostenDrift=0,035` | Ziel Jahr 1 `1.000,35`, Jahr 2 `1.000,7001225`; nachgewiesene fälschliche Faktoren `1,00035` je Jahr |
| `simulator-input-readers.test.mjs` | 48/48 Assertions grün |
| `simulator-multiprofile-aggregation.test.mjs` | 40/40 Assertions grün |
| `care-meta.test.mjs` | 16/16 Assertions grün |
| `worker-parity.test.mjs` | 354/354 Assertions grün |

Die Gesamtsuite des sicheren Vorgängercommits ist durch Slice 6 mit
4.533/4.533 Assertions belegt. Sie wird nach dem Edit vollständig erneut
ausgeführt.

### Erwartete Deltas

- Bei `0 %` bleibt die Pflegekosten-Drift wirkungslos.
- Bei `3,5 %` wechselt der jährliche Zusatzfaktor von fälschlich `1,00035`
  auf `1,035`.
- Positive Pflegezielwerte, Pflege-Caps und davon abhängige Portfolio-/KPI-
  Ergebnisse dürfen sich ausschließlich aufgrund dieser korrigierten
  Driftwirkung verändern.

### Unerwartete und blockierende Deltas

- erneute Skalierung oder Transport als Prozentwert nach der Input-Grenze;
- geändertes Persistenzformat;
- unterschiedliche Einheiten zwischen DOM-, Profil-, Serial-, Chunk- und
  Workerpfad;
- Änderung von Regionalzuschlag, Eintritt, Progression, Mortalität, Ramp-up
  oder Cap-Formel außerhalb der erwarteten Driftwirkung;
- auffälliger FlowDelta;
- unerklärte Snapshot-, Backtest-, MC- oder Optimizerdeltas;
- Änderung von `minimumFlexAnnual`.

## Geplante Validierung

- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`;
- `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs`;
- `node tests/run-single.mjs tests/care-meta.test.mjs`;
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`;
- `node tests/run-single.mjs tests/worker-parity.test.mjs` als Pflichtgate;
- fokussierte Backtest-/Headless-Gates zur Deltaabgrenzung;
- `npm test`;
- `git diff --check` sowie abschließender Branch-, Status- und Scope-Check.

Ein Engine-Build ist nicht vorgesehen, weil weder `engine/` noch die
öffentliche `EngineAPI` geändert werden. Wenn das nicht ausreicht, greift vor
der Scope-Erweiterung die Stop-Regel.

## Ergebnisse

### Durchgeführte Änderungen

- `simulator-input-care.js` exportiert den gemeinsamen reinen
  Prozent-zu-Verhältnis-Normalisierer. Er ersetzt nicht endliche Werte durch
  den grenzspezifischen Fallback, normalisiert negative Werte auf null und
  teilt genau einmal durch 100. Der DOM-Reader verwendet weiterhin 3,5 % als
  Default.
- `simulator-profile-inputs.js` verwendet denselben Normalisierer mit dem
  bisherigen Profilfallback 0 %. Persistierte Strings bleiben unverändert;
  eine Schemamigration findet nicht statt.
- `simulator-engine-helpers.js` verwendet `pflegeKostenDrift` direkt als
  Verhältnis. Die zweite Division und die redundante stille Begrenzung sind
  entfernt; Regionalzuschlag, Eintritt, Progression, Mortalität, Cap und
  Ramp-up wurden nicht umdefiniert.
- `simulator-input-readers.test.mjs` prüft fehlend, 0, 3,5, 100, negativ und
  ungültig an der DOM-Grenze.
- `simulator-multiprofile-aggregation.test.mjs` prüft dieselben Profilwerte,
  den kompatiblen Missing-Fallback und die unveränderten Persistenzstrings.
- `care-meta.test.mjs` weist Faktor 1,035, zweijährige Fortsetzung 1,035²,
  neutralen Nullwert, 100-Prozent-Grenze und deterministischen Cap/Ramp-up
  nach.
- `worker-parity.test.mjs` prüft den unveränderten Wert 0,035 nach dem
  strukturierten Szenario-Klon sowie identische vollständige und gechunkte
  Care-MC-Ergebnisse.
- Hauptdokument, Forschungsregister und Testkatalog dokumentieren den
  nachgewiesenen Ist-Vertrag. PD-02/MR-10 ist als Einheitenfehler behoben;
  MR-07/FR-10/FQ-04 bleiben wegen der nicht extern validierten
  Pflegeparameter ausdrücklich offen.

Es wurden keine Engine-Datei, keine öffentliche EngineAPI, kein
Persistenzschema, kein Regionalzuschlag, keine Pflegewahrscheinlichkeit, kein
Mortalitätsparameter, kein generiertes Artefakt und kein
`minimumFlexAnnual`-Vertrag geändert.

### Nachher-Messung und Delta-Klassifikation

| Fixture | Vorher | Nachher | Einordnung |
| --- | --- | --- | --- |
| UI `0 / 3,5 / 100 / -1 / ungültig` | `0 / 0,035 / 1 / 0 / 0,035` | identisch | bestehender UI-Vertrag erhalten |
| Profil `0 / 3,5 / 100 / -1 / ungültig` | `0 / 0,035 / 1 / -0,01 / 0` | `0 / 0,035 / 1 / 0 / 0` | negative Profilwerte erfüllen jetzt denselben nicht negativen Vertrag |
| aktiver Pflegefall, Jahr 1 | `1.000,35` | `1.035` | erwartete Korrektur von Faktor 1,00035 auf 1,035 |
| aktiver Pflegefall, Jahr 2 | `1.000,7001225` | `1.071,225` | erwartete einmalige jährliche Fortsetzung 1,035² |
| 0-%-Fall | `1.000` | `1.000` | bitgenau neutral |
| 100-%-Fall | fälschlich Faktor 1,01 | Faktor 2 | erwartete Grenzwertkorrektur |
| Cap/Ramp-up-Fixture | bestehende Formel | `517,5` bei 3,5 %, Zweijahresrampe und 500-EUR-Cap-Anker | Formel unverändert, korrigierter Driftfaktor wirkt einmal |

Die Standard-Backtest-, Headless-, MC- und Optimizerfixtures deaktivieren die
Pflegelogik und blieben grün. Im neuen Care-Worker-Fixture stimmen vollständige
und gechunkte Ergebnisse einschließlich Totals, Listen und Endvermögen exakt
überein. Es trat kein auffälliger FlowDelta und kein unerwartetes Snapshot-,
Backtest-, MC- oder Optimizerdelta auf.

### Ausgeführte Validierung

| Prüfung | Ergebnis |
| --- | --- |
| Vorher-Gates auf `77e1034` | Input 48/48, Profil 40/40, Care 16/16, Worker-Parität 354/354 |
| `simulator-input-readers.test.mjs` | 53/53 Assertions grün |
| `simulator-multiprofile-aggregation.test.mjs` | 51/51 Assertions grün |
| `care-meta.test.mjs` | 21/21 Assertions grün |
| `simulation.test.mjs` | 1/1 instrumentierte Assertions grün; kein FlowDelta-Stop |
| `simulator-backtest.test.mjs` | 46/46 Assertions grün |
| `simulator-headless.test.mjs` | 26/26 Assertions grün |
| `simulator-monte-carlo.test.mjs` | 110/110 Assertions grün |
| `auto-optimizer.test.mjs` | 62/62 Assertions grün |
| `auto-optimize-worker-contract.test.mjs` | 7/7 Assertions grün |
| `worker-parity.test.mjs` | Pflichtgate 369/369 Assertions grün; Care-Verhältnis nach Szenario-Klon und Chunking unverändert |
| `npm test` | 110 entdeckte Testdateien, davon 109 im Node-Gate; 4.569/4.569 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 14/14 Playwright-Szenarien bestanden |
| `npm run docs:evidence` | bestanden; 69 MKT-, 55 FOR-Records, 17 MAP-Anker und 18 Aktualitätsscopes, kein Netzwerk |
| `git diff --check` und abschließender Branch-/Status-/Scope-Check | bestanden; sieben erwartete Programm-/Testdateien, fünf Dokumentationsdateien einschließlich neuer Slice-Datei; nur vorbestehendes Playwright unter `node_modules/` außerhalb des Scopes |

`npm run build:engine` wurde vertragsgemäß nicht ausgeführt: `engine/`,
öffentliche EngineAPI und `engine.js` sind unverändert.

## Abweichungen vom Plan

- Das normative Forschungsregister und `tests/README.md` enthielten direkte,
  nach der Korrektur veraltete PD-02- beziehungsweise Teststatus-Aussagen. Sie
  wurden nach den grünen Laufzeitgates zusätzlich synchronisiert. Dies
  erweitert nur den Dokumentationsscope; der Programmscope bleibt bei sieben
  Dateien.

## Offene Risiken

- Der stärkere positive Driftfaktor kann in lang laufenden Pflegefällen
  erhebliche, nun fachlich erwartete Ergebnisdeltas erzeugen; die lokale
  deterministische Stichprobe deckt nicht den gesamten Parameterraum ab.
- Die fachliche Kalibrierung von `3,5 %` bleibt MR-07/FR-10/FQ-04 und ist
  nicht Gegenstand dieser Einheitenkorrektur.
- Der lokale Branch ist nicht veröffentlicht; dies ist ohne Push-Auftrag kein
  Implementierungsblocker.

## Rückdokumentation in den Arbeitsplan

Scope, Einheitenvertrag, Vorher-/Nachher-Deltas, Testzahlen und der
PD-02/MR-10-Status sind im Korrekturplan zurückgeschrieben.

## Freigabestatus

- U-K07 / kanonischer Einheitenvertrag: durch Nutzerauftrag vom 2026-07-17
  bestätigt; Planreview durch Gemini ohne Blocker
- Implementierung durch Codex: abgeschlossen; keine Eigenfreigabe
- Review der Slice-Implementierung: ausstehend
- lokaler Commit: nicht durch Codex; erst nach positivem Review und
  Nutzerfreigabe
- Push: nicht beauftragt

## Review-Feedback von Gemini

Ausstehend.

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Werden nach konkretem Slice-Feedback ergänzt. Codex erteilt keine
Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-K07 | Nutzer/Reviewer | Pflegekosten-Einheitenvertrag | Prozentwerte in UI/Persistenz, einmalige In-memory-Normalisierung | implementiert; Implementierungsreview ausstehend |
