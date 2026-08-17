# Stresspfad-Replay: Variantenvergleich nach gueltiger Flex-Reduktion

**Stand:** 2026-08-17

**Status:** Planentwurf; externes Review ausstehend

**Autor:** Codex (Implementer, keine Eigenfreigabe)

**Zielbranch:** `codex/stress-pfad-replay`

**Planungsbaseline:** Branch `codex/stress-pfad-replay`, HEAD `daa4767421c6`

**Branch-Status:** lokal vorhanden; kein Upstream eingetragen, Veroeffentlichung
ausstehend

**Orchestrierung:** State v3, `PLAN_ONLY`; Umsetzung erst nach geprueftem und
committetem Plan-Handoff

## 1. Anlass und Zielbild

Auf einem fixierten Stresspfad kann eine fachlich gueltige Variante mit
`startFlexBedarf = 28000` und `minimumFlexAnnual = 12000` gespeichert werden,
waehrend der Variantenvergleich leer bleibt. Der beobachtete Ausgangsfall
verwendete eine Baseline von 90.000 EUR Flex-Bedarf und 30.000 EUR
Mindest-Flex. Die Wertebeziehung ist gueltig; sie darf weder abgewiesen noch
still geklemmt werden.

Der Bugfix verfolgt zwei voneinander unabhaengige Ziele:

1. Der Baseline-Abgleich trifft beim erstmaligen Lauf gegen die Originalzeilen
   und beim spaeteren Lauf gegen die persistierte Source Identity fuer
   dieselben Daten dieselbe toleranzgebundene Entscheidung. Diese
   Vertragsaenderung wird nur umgesetzt, wenn ein synthetischer Test den
   aktuellen Widerspruch vor dem ersten Produktcode-Edit reproduziert.
2. Jeder UI-Ablauf meldet einen Vergleichserfolg nur bei einem tatsaechlich
   erzeugten Vergleich. Ein Fehler bleibt mit Code und verstaendlicher
   Meldung in Status- und Vergleichsregion sichtbar; eine erfolgreiche
   Workspace- oder Variantenmutation wird davon getrennt beschrieben.

Engine-, Entnahme-, Mindest-Flex-, Monte-Carlo- und
Stresspfadmaterialisierungssemantik bleiben unveraendert. Reale Workspace-
Daten, lokale Exporte und beobachtete Fingerprints werden nicht in Tests oder
Dokumentation uebernommen.

## 2. Verifizierte Repository-Ausgangslage

Die Planung beruht auf dem aktuellen Code und dem nur als Kontext gelesenen
Bericht
`docs/internal/STRESS_REPLAY_FEHLENDER_VARIANTENVERGLEICH_ANALYSE.md`:

- `reconcileRows()` in `app/simulator/stress-replay-runner.js` verwendet bei
  Originalzeilen die im Pfad gespeicherten Toleranzen. Geldfelder werden
  standardmaessig mit 0,01 EUR, Verhaeltnisfelder mit `1e-9` abgeglichen;
  `recordType`, `jahr`, `histJahr` und Reihenfolge bleiben strikt.
- Sobald eine erwartete Zeile eine `reconciliationFingerprint` besitzt,
  ueberspringt dieselbe Funktion den feldweisen Abgleich und verlangt den
  exakten Hash der gegenwaertig erzeugten Zeile. Damit ist die im Auftrag
  vermutete unterschiedliche Entscheidung direkt im Code belegt. Ein
  fokussierter synthetischer Red-Test muss vor der Vertragsaenderung dennoch
  zeigen, dass ein innerhalb der bestehenden Toleranz akzeptiertes Paar nach
  Source-Identity-Erzeugung und Reload aktuell abgelehnt wird.
- `createStressReplaySourceIdentityV1()` speichert je Zeile nur die strikten
  Strukturfelder und einen exakten Hash einer feldpraesenzabhaengigen
  Projektion. Die urspruenglichen Vergleichswerte sind danach nicht mehr
  vorhanden. Ein exakter Hash kann den bestehenden absoluten
  Toleranzvergleich nicht semantisch ersetzen.
- Pfad und Source Identity sind ueber Source-Descriptor-, Pfad-, Identity-,
  Baseline- und Workspace-Fingerprints gebunden. Diese Bindungen duerfen
  nicht uebersprungen oder aus einem Pfad synthetisiert werden.
- `classifyStressReplayWorkspaceCompatibility()` behandelt derzeit jede
  vorhandene V1-Source-Identity als ausfuehrbar, sofern Contract-, Daten- und
  Engine-Fingerprints passen. Fuer eine neue toleranzfaehige Revision fehlt
  ein expliziter Kompatibilitaetspfad.
- `computeComparison()` in `app/simulator/stress-replay-ui.js` setzt
  Vergleich und Resultate vor dem Lauf zurueck, faengt Ausnahmen, setzt den
  Live-Status auf Fehler und gibt `null` zurueck.
- `addVariant()`, `removeVariant()` und der registrierte Recompute-Click
  ignorieren diese Rueckgabe und melden anschliessend bedingungslos Erfolg.
  `initialize()`, Import und Fixierung berechnen ebenfalls und schreiben
  danach unabhaengig vom Ergebnis eine allgemeine Erfolgs- beziehungsweise
  Lademeldung.
- `renderStressReplayComparisonV1()` in
  `app/simulator/stress-replay-renderer.js` deutet jedes
  `comparison === null` als „Noch kein Variantenvergleich berechnet.“ und
  besitzt keinen eigenen Fehlerzustand.
- Der aktuelle Variantencontract validiert
  `minimumFlexAnnual >= 0` und die effektive Relation
  `minimumFlexAnnual <= startFlexBedarf` bereits ohne Clamping. Die bestehende
  V2-Whitelist fuer Bedarfswerte und die Engine-Weitergabe werden nicht
  semantisch geaendert.

Der Arbeitsbaum war bei der Planung sauber; der aktive Branch entspricht dem
Zielbranch. Vor jedem Umsetzungsslice werden Branch, Status, Scope und
Diff-Risiko nach `docs/internal/SLICE_EXECUTION_RULES.md` erneut dokumentiert.

## 3. Reconciliation-Entscheidung und Vorab-Gate

### 3.1 Verbindlicher synthetischer Nachweis

Slice 1 beginnt mit einem fokussierten Regressionstest, bevor Produktcode
geaendert wird. Ein rein synthetischer Source-Log-Datensatz und die daraus
erzeugte Baseline muessen folgende Sequenz abbilden:

1. Strukturfelder, Reihenfolge und Pfadzugehoerigkeit stimmen exakt.
2. Mindestens ein Geldwert unterscheidet sich um hoechstens die bereits im
   Pfad gespeicherte Geldtoleranz und mindestens ein Verhaeltniswert um
   hoechstens die dort gespeicherte Ratentoleranz.
3. Der direkte Abgleich gegen die Originalzeilen ist erfolgreich.
4. Aus denselben Originalzeilen wird eine Source Identity erzeugt, durch den
   echten Workspace- und Export-/Importpfad serialisiert und erneut gelesen.
5. Der Baseline-Lauf gegen diese persistierte Identitaet muss dieselbe
   Entscheidung liefern. Auf der Planungsbaseline wird hier der erwartete
   Red-State `STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED` festgehalten.

Ein zweiter synthetischer Fall variiert ausschliesslich die Praesenz eines
optionalen Reconciliation-Feldes; fehlend und explizit vorhanden werden
kanonisch unterschieden, duerfen aber zwischen Direkt- und Reloadpfad keine
unterschiedliche Entscheidung erzeugen. Ein dritter Fall liegt knapp
ausserhalb der jeweiligen Pfadtoleranz und muss in beiden Pfaden fail-closed
bleiben.

Falls der erste Fall wider Erwarten keinen Widerspruch zeigt, werden keine
Source-Identity-, Reconciliation- oder Persistenzregeln geaendert. Der
Testaufbau und das Ergebnis werden im Slice-Dokument festgehalten; danach
werden nur die unabhaengigen UI-Slices umgesetzt. Ein temporaerer roter Test
darf dabei nicht im Branch verbleiben.

### 3.2 Source Identity V2 bei bestaetigtem Widerspruch

Bei bestaetigtem Widerspruch wird eine explizite
`StressReplaySourceIdentityV2` eingefuehrt. Die aeusseren V1-Huellen fuer
Pfad, Workspace und Vergleichsexport koennen bestehen bleiben, weil ihre
verschachtelte Source-Identity-Revision eindeutig validiert und von ihren
Fingerprints abgedeckt wird.

Die V2-Identitaet speichert fuer jede Zeile:

- strikt validierte Strukturwerte `recordType`, `jahr` und `histJahr` in
  unveraenderter Reihenfolge;
- eine auf die bestehende Reconciliation-Feldliste begrenzte Projektion der
  tatsaechlich vorhandenen Geld-, Verhaeltnis- und
  `entscheidung.jahresEntnahme`-Werte;
- die Feldpraesenz durch kanonische Objektpraesenz, ohne fehlende Werte als
  `0`, `null` oder Baselinewerte zu erfinden;
- die vorhandenen Descriptor- und Identity-Fingerprints als Integritaets- und
  Pfadbindung, nicht als strengeren Ersatz fuer den fachlichen Zahlenabgleich.

Eine gemeinsame DOM- und Engine-freie Reconciliation-Funktion prueft danach
sowohl Originalzeilen als auch die V2-Projektion. Strukturfelder bleiben
exakt, Geld- und Verhaeltniswerte verwenden ausschliesslich
`path.reconciliation.tolerances`; fuer fehlende Toleranzen gelten nur die
bereits heute implementierten Defaults 0,01 EUR und `1e-9`. Es werden keine
Toleranzen vergroessert und keine Werte fuer den Vergleich quantisiert oder
geklemmt. Eine Abweichung ausserhalb der Grenze wirft weiterhin
`STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED` mit index- und
feldbezogener Diagnose.

Neu fixierte Pfade erzeugen V2. Bestehende V1-Identitaeten werden weiterhin
strukturell validiert, fingerprintstabil gelesen, exportiert und importiert,
aber nicht still umgedeutet oder ausfuehrbar migriert: Die
Kompatibilitaetsklassifikation setzt sie auf Nur-Lesen und liefert einen
stabilen Grund, den die UI als „Stresspfad neu fixieren“ erklaert. Es gibt
keine automatische Loeschung, keine Ableitung der fehlenden Werte aus dem
materialisierten Pfad und kein Ueberspringen der Baseline-Reconciliation.

Die bestehenden Hoechstgrenzen von 60 Source-Zeilen, 1 MiB Pfad und 2 MiB
Workspace/Export bleiben erhalten, sofern die synthetische maximale V2-
Identitaet innerhalb dieser Grenzen liegt. Wuerde die echte kanonische
Maximalgroesse die Grenze ueberschreiten, stoppt Slice 1 zur
Vertragsentscheidung; ein stilles Anheben ist nicht erlaubt.

## 4. Wahrheitsgemäßer UI-Zustandsvertrag

Der Controller fuehrt neben `comparison` und `comparisonResults` einen
expliziten Vergleichszustand `idle | success | error`. Der Fehlerzustand
enthaelt mindestens den stabilen Fehlercode und die bereits formatierte,
nutzergerechte Meldung; rohe Stacks oder persoenliche Daten werden nicht
gerendert.

Es gelten folgende Uebergaenge:

- Vor der ersten Berechnung ist der Zustand `idle`; nur dann zeigt die
  Vergleichsregion den neutralen Leertext.
- Vor einem neuen Lauf werden alte Vergleichsdaten geloescht. Ein erfolgreicher
  nichtleerer Rueckgabewert setzt `success` und loescht einen alten Fehler.
- Eine Ausnahme oder ein leerer/ungueltiger Rueckgabewert setzt `error`, leert
  Vergleich und Resultate und zeigt Code plus Meldung in der Vergleichsregion
  mit `role="alert"`. Der bereits gesetzte Live-Fehler darf danach nicht von
  einem Aufrufer ueberschrieben werden.
- Eine bewusste Sitzungsaktion wie Verwerfen oder das Ersetzen durch einen
  neuen Arbeitsstand darf den alten Zustand loeschen. Scheitert die fuer den
  neuen Arbeitsstand unmittelbar gestartete Berechnung, gilt sofort wieder
  `error`.

`computeComparison()` liefert nur bei einem nichtleeren, renderbaren
Vergleich Erfolg. `recomputeComparison()` und der echte DOM-Click verwenden
dieselbe Rueckgabe und Statuslogik. Alle Aufrufer werden explizit behandelt:

- Variantenerzeugung: Die Variante darf erfolgreich gespeichert und
  zurueckgegeben werden; bei Rechenfehler lautet der sichtbare Teilzustand
  sinngemaess „Variante gespeichert, Vergleich fehlgeschlagen“. Es gibt keine
  Behauptung, sie sei berechnet worden.
- Variantenentfernung: Die Entfernung darf erfolgreich sein; nur ein
  nichtleerer Vergleich rechtfertigt „neu berechnet“.
- Direkter Recompute und Recompute-Click: identische Fehler-, Fokus- und
  Rueckgabesemantik.
- Initialisierung und kompatibler Import: Eine allgemeine Lade- oder
  Importmeldung darf einen unmittelbar entstandenen Vergleichsfehler nicht
  ersetzen.
- Fixierung: Der Pfad darf nur nach erfolgreichem initialem
  Baseline-Abgleich gespeichert werden. Scheitert die anschliessende
  Vergleichserzeugung, bleiben „fixiert“ und „Vergleich fehlgeschlagen“ als
  Teilzustand unterscheidbar; es wird kein Vergleichserfolg gemeldet.

Der Renderer escaped Code und Meldung. Ein technisches Variantenergebnis, das
der Comparison-Builder gueltig als `blocked_technical_error` abbildet, bleibt
ein erzeugter Vergleich und wird nicht mit einer geworfenen
Vergleichsberechnung verwechselt.

## 5. Fachliche und technische Invarianten

- `minimumFlexAnnual` ist endlich und nichtnegativ und darf den effektiven
  `startFlexBedarf` nicht ueberschreiten.
- Es gibt kein `Math.min`, Defaulting oder anderes stilles Clamping von
  `minimumFlexAnnual`.
- Die Variante 90.000/30.000 -> 28.000/12.000 aendert nur ihre beiden
  erlaubten Patchwerte. Baseline, Source Identity, materialisierter Pfad,
  Pfadfingerprint und urspruenglicher Workspace bleiben unveraendert.
- Baseline und Alternative laufen gegen denselben Pfadfingerprint; der
  vollstaendige Vergleich bindet beide Varianten- und Resultatfingerprints.
- Eine echte Source-Abweichung ausserhalb der Toleranz, eine andere
  Struktur, Reihenfolge, Pfadzugehoerigkeit oder ein veraenderter
  Identity-/Workspace-Fingerprint bleibt gesperrt.
- Engine-Module, `engine.js`, Worker, Monte-Carlo-Selektion,
  Pfadmaterialisierung, Entnahmelogik, Snapshot-/Backtest-Orakel, `dist/` und
  `RuheStandSuite.exe` sind Nicht-Scope.
- V1-Daten werden weder geloescht noch umgeschrieben. Ohne sichere V2-Evidenz
  sind sie nur inspizierbar und nennen den Refix-Schritt.
- Keine Testfixture enthaelt reale Nutzerdaten, reale Run-435-Fingerprints
  oder lokale Exportinhalte.

## 6. Geordnete Umsetzungsslices

Die folgenden Slices sind zukuenftige Implementierungspakete. In diesem
`PLAN_ONLY`-Lauf werden weder ihre Slice-MDs noch Produktcode oder Tests
angelegt.

### Slice 1 - Synthetischer Nachweis und einheitlicher Reconciliation-Vertrag

**Exakter Änderungspfad**

- `app/simulator/stress-replay-contract.js`
- `app/simulator/stress-replay-runner.js`
- `app/simulator/stress-replay-persistence.js`
- `app/simulator/stress-replay-ui.js`
- `tests/stress-replay-contract.test.mjs`
- `tests/stress-replay-runner.test.mjs`
- `tests/stress-replay-persistence.test.mjs`
- `tests/stress-replay-export.test.mjs`
- `tests/stress-replay-ui.test.mjs`
- `docs/internal/SLICE_STRESS_REPLAY_VARIANTENVERGLEICH_01_RECONCILIATION.md`

**Ziel:** Den im Code sichtbaren Direkt-/Reload-Widerspruch zuerst mit
synthetischen Daten als Red-State belegen und nur danach einen versionierten,
toleranzgleichen Source-Identity-Vertrag implementieren.

**Umsetzung:**

- Vor dem ersten Produktcode-Edit den innerhalb-der-Toleranz-,
  Feldpraesenz- und ausserhalb-der-Toleranz-Fall gegen Originalzeilen sowie
  echte Persistenz-/Export-Roundtrips ausfuehren und das Vorher-Ergebnis in
  der Slice-MD dokumentieren.
- Bei bestaetigtem Widerspruch Source Identity V1 unveraendert lesbar halten,
  V2 mit begrenzter Reconciliation-Projektion einfuehren und alle Validatoren
  anhand der gespeicherten Revision fail-closed dispatchen.
- Direkten und persistierten Baseline-Abgleich ueber dieselbe
  Reconciliation-Funktion und dieselben Pfadtoleranzen fuehren; Struktur und
  Feldpraesenz kanonisch behandeln.
- Neu fixierte Arbeitsstaende auf V2 schreiben. V1-Identitaeten nicht
  migrieren, sondern in Persistenz und Import als Nur-Lesen mit stabilem
  `refix_required`-Grund klassifizieren; die UI nennt „Stresspfad neu
  fixieren“.
- Maximalgroesse, Mutation, Descriptor-, Pfad-, Baseline-, Identity-,
  Workspace- und Exportfingerprints sowie unbekannte Revisionen testen.
- Wenn der Vorab-Nachweis nicht gelingt, alle geplanten Produktcodeaenderungen
  dieses Slice auslassen und nur einen gruenen Charakterisierungstest sowie
  die dokumentierte Nichtbestaetigung behalten.

**Akzeptanzkriterien:**

- Derselbe synthetische Datensatz wird direkt und nach Persistenz/Reload
  gleich entschieden.
- Innerhalb bestehender Toleranzen wird akzeptiert; knapp ausserhalb sowie
  jede Struktur-, Reihenfolge-, Pfad- oder Fingerprintabweichung wird mit
  `STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED` beziehungsweise dem
  spezifischen Contractfehler abgelehnt.
- Optionale Feldpraesenz ist deterministisch und erfindet weder Null noch
  Zahlenwerte.
- V1-Golden-Export und V1-Workspace bleiben byte-/fingerprintstabil lesbar,
  aber nicht unsicher ausfuehrbar; der Refix-Hinweis ist verstaendlich.
- Kein Produktwert und keine Toleranz wird geklemmt oder erweitert.

**Fokussierte Validierung:**

- `node tests/run-single.mjs tests/stress-replay-contract.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-persistence.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-export.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`

**Diff-Risiko:** hoch. Der Source-Identity-Vertrag ist persistiert und
fingerprintgebunden. Das groesste Risiko ist eine scheinbar kompatible
Umdeutung alter Hashbeweise oder eine Toleranzfunktion, die Feldpraesenz und
Struktur versehentlich lockert. Rollback erfolgt ausschliesslich ueber den
Slice-Commit durch den Orchestrator/Reviewer; Codex fuehrt keinen Reset aus.

### Slice 2 - Dauerhafter Vergleichsfehler und wahrheitsgemäße Aufrufer

**Exakter Änderungspfad**

- `app/simulator/stress-replay-ui.js`
- `app/simulator/stress-replay-renderer.js`
- `tests/stress-replay-ui.test.mjs`
- `tests/stress-replay-renderer.test.mjs`
- `tests/browser-smoke.test.mjs`
- `docs/internal/SLICE_STRESS_REPLAY_VARIANTENVERGLEICH_02_UI_FEHLERZUSTAND.md`

**Ziel:** Neutralen Leerzustand, erfolgreichen Vergleich und fehlgeschlagene
Berechnung explizit unterscheiden und jede Aufrufstelle an dieselbe
Erfolgsbedingung binden.

**Umsetzung:**

- Vergleichszustand und sanitizierte Fehlerdiagnose im Controller einfuehren
  und an den Renderer reichen.
- `computeComparison()` auch bei leerer/ungueltiger Rueckgabe fail-closed
  behandeln; nur ein nichtleerer Vergleich setzt Erfolg.
- Variantenerzeugung, Entfernung, direkten Recompute, echten Click,
  Initialisierung, Import und Fixierung jeweils fuer Erfolg und kontrollierten
  Throw testen. Mutationserfolg und Rechenerfolg erhalten getrennte Texte und
  Rueckgabewerte.
- Fehlercode und Meldung in der Vergleichsregion alert-semantisch und escaped
  ausgeben; Live-Status, Fokus und Vergleichsregion duerfen sich nicht
  widersprechen.
- Im echten Browser-DOM einen Controller mit kontrolliert fehlschlagender
  Rechenfunktion ueber den registrierten Button ausloesen und dieselbe
  Semantik wie beim direkten Methodenaufruf verlangen.

**Akzeptanzkriterien:**

- Keine der sieben Aufrufklassen meldet Vergleichserfolg, wenn der Vergleich
  `null` bleibt oder die Rechnung wirft.
- Eine gespeicherte oder entfernte Variante bleibt als erfolgreiche Mutation
  erkennbar, waehrend der Rechenfehler sichtbar bleibt.
- Nur `idle` zeigt „Noch kein Variantenvergleich berechnet.“; `error` zeigt
  Code und verstaendliche Meldung bis zur erfolgreichen Rechnung oder einer
  bewussten ersetzenden Nutzeraktion.
- Direkter Recompute und realer DOM-Click haben identische Status-, Fokus- und
  Rueckgabesemantik; alle Erfolgswege behalten ihre bisherigen positiven
  Meldungen.

**Fokussierte Validierung:**

- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`
- `node tests/run-single.mjs tests/browser-smoke.test.mjs`

**Diff-Risiko:** mittel. Das groesste Risiko ist, dass ein allgemeiner Lade-
oder Mutationsstatus nach dem Catch doch wieder den Fehler ueberschreibt oder
ein gueltiger `blocked_technical_error`-Vergleich faelschlich als Throw
behandelt wird.

### Slice 3 - Exakter Flex-Durchstich, Kompatibilität und Dokumentationssync

**Exakter Änderungspfad**

- `tests/stress-replay-e2e.test.mjs`
- `tests/browser-smoke.test.mjs`
- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `Handbuch.html`
- `docs/internal/SLICE_STRESS_REPLAY_VARIANTENVERGLEICH_03_E2E_UND_DOKU.md`

**Ziel:** Den vollstaendigen realen Engine-Durchstich fuer die gemeldeten
Bedarfswerte, den Import-/Reloadpfad und den Nutzerworkflow abschliessend
absichern und dokumentieren.

**Umsetzung:**

- Im bestehenden synthetischen E2E-Aufbau die Baseline 90.000/30.000 und die
  Variante 28.000/12.000 ueber Vorschau, Erzeugung, Anwendung, beide echten
  Replay-Laeufe, Comparison-Builder, Workspace, Export, Import und erneuten
  Baseline-Abgleich fuehren.
- Vollstaendigen Vergleich, gemeinsame Pfadbindung, unterschiedliche
  Variantenidentitaeten, technische Fehlerfreiheit, 35-jaehrigen
  Horizontfall sowie Unveraenderlichkeit von Baseline, Pfad und
  Originalworkspace pruefen. Die Fixture bleibt synthetisch; sie bildet nicht
  Run 435 oder dessen echte Fingerprints nach.
- Browser-Smoke um sichtbaren Fehlerzustand und anschliessende erfolgreiche
  Erholung ergaenzen, soweit nicht bereits in Slice 2 vollstaendig abgedeckt.
- README, technische Referenz, Simulator-Modulreferenz und Handbuch auf Source
  Identity V2, V1-Nur-Lesen-/Refix-Verhalten sowie die getrennten
  Mutations-/Vergleichsstatus synchronisieren. Falls Slice 1 wegen fehlendem
  Nachweis keine Vertragsaenderung vorgenommen hat, dokumentieren diese Texte
  ausschliesslich den UI-Fix und die nicht bestaetigte Reconciliation-Ursache.

**Akzeptanzkriterien:**

- Der Patch 90.000/30.000 -> 28.000/12.000 erzeugt auf fachlich passender
  Source Identity einen vollstaendigen Vergleich mit demselben
  Pfadfingerprint und ohne Baseline-/Pfadmutation.
- Mindest-Flex erreicht Runner und Engine unveraendert als 30.000
  beziehungsweise 12.000 EUR; kein Test akzeptiert Clamping.
- Export/Import behaelt die ausfuehrbare V2-Identitaet und ihre Fingerprints;
  V1 bleibt inspizierbar und weist auf erneutes Fixieren hin.
- Nutzer- und Referenzdokumentation widersprechen weder dem Code noch
  untereinander und behaupten keine nicht nachgewiesene Ursache.

**Fokussierte Validierung:**

- `node tests/run-single.mjs tests/stress-replay-e2e.test.mjs`
- `node tests/run-single.mjs tests/browser-smoke.test.mjs`
- `git diff --check`

**Diff-Risiko:** mittel. Der echte Engine-Durchstich ist rechenintensiver und
kann unbeabsichtigte Contract- oder Fingerprintabweichungen sichtbar machen;
solche Abweichungen sind ein Stoppsignal und werden nicht durch Fixture-
Neuschreiben kaschiert.

## 7. Gesamtvalidierung und Stopregeln

Codex fuehrt waehrend der Slices nur die jeweils fokussierten Tests aus. Nach
Abschluss muss die Orchestrator-Matrix mindestens folgende Befehle fuer
denselben Diff-Fingerprint ausfuehren:

```text
node tests/run-single.mjs tests/stress-replay-contract.test.mjs
node tests/run-single.mjs tests/stress-replay-runner.test.mjs
node tests/run-single.mjs tests/stress-replay-persistence.test.mjs
node tests/run-single.mjs tests/stress-replay-ui.test.mjs
node tests/run-single.mjs tests/stress-replay-e2e.test.mjs
node tests/run-single.mjs tests/browser-smoke.test.mjs
npm test
```

Zusaetzlich laufen die in den Slices genannten Export- und Renderertests.
Ein lokales Port- oder Browserproblem im Agentensandbox ist kein
Produktentscheid; Codex dokumentiert es und uebergibt an die autoritative
Orchestrator-Validierung.

Die Umsetzung stoppt insbesondere, wenn:

- die Reconciliation-Behebung Engine-, Entnahme- oder Monte-Carlo-Semantik
  aendern wuerde;
- `minimumFlexAnnual` still begrenzt oder automatisch korrigiert werden
  muesste;
- Direkt- und Reloadabgleich nicht mit identischer, eindeutig formulierbarer
  Semantik implementiert werden koennen;
- V1 nur durch Ueberspringen der Baseline-Reconciliation ausfuehrbar bliebe;
- eine maximale V2-Identitaet die bestehenden Groessenlimits sprengt und
  damit eine neue Produktentscheidung benoetigt;
- UI und Runner unterschiedliche Parameterbezeichnungen verwenden;
- Snapshot-, Backtest- oder Monte-Carlo-Orakel unerwartet abweichen;
- mehr als zehn produktive Programm-/Konfigurationsdateien erforderlich
  werden oder ein Pfad ausserhalb eines freigegebenen Slice-Scopes noetig
  wird;
- die vorgeschriebenen Tests nicht ausfuehrbar sind und keine sinnvolle,
  freigegebene Ersatzvalidierung existiert.

Ueber alle Slices sind genau fuenf produktive Dateien moeglich:
`stress-replay-contract.js`, `stress-replay-runner.js`,
`stress-replay-persistence.js`, `stress-replay-ui.js` und
`stress-replay-renderer.js`. Generierte Artefakte sind ausgeschlossen.

## 8. Review- und Abschlussstatus

- Planreview durch Claude: ausstehend.
- Planreview durch Antigravity: ausstehend.
- Implementierungsfreigabe: nicht durch Codex erteilt.
- Umsetzung, Commit, Push, Merge und Release: in diesem `PLAN_ONLY`-Lauf
  nicht erfolgt.
- Nach jedem zukuenftigen Slice: fokussierte Implementer-Plausibilisierung,
  Orchestrator-Validierung, Claude-Review, danach Antigravity-Review gemaess
  State-v3-Vertrag. Codex markiert seine eigene Arbeit nie als freigegeben.

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-86f461682f72`
- Testdateien: keine
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-86f461682f72`
- Testdateien: keine
- Prüfdimensionen: Plan completeness, scope discipline, executable slice ordering, verification-first gate, Source Identity V2 versioning, UI error lifecycle across 7 callers, fail-closed boundaries, backward compatibility
- Größtes Restrisiko: Subtle discrepancies in canonical field projection or optional field serialization in Source Identity V2 between direct memory execution and reloaded persisted state
- Realistische Bruchbedingung: A multi-bucket scenario with dynamic horizon adjustments produces optional reconciliation fields in memory that are omitted or reordered during V2 persistence
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-86f461682f72`

- Diff-Fingerprint: `86f461682f72e5de84fd77cc4860228eca66cef6837167ec8c535372276dd063`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `d3fa58112bed4c26b131da69b229544d5beb336f1e7f6cd5fee8467277ef6629`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=3; work_plan=docs/internal/stress-replay-variantenvergleich-bugfix-arbeitsplan.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In drei Monaten wäre die wahrscheinlichste Fehlerursache, dass Slice 1 den synthetischen Vorab-Nachweis zwar liefert, die anschließende V2-Projektion aber unbeabsichtigt eine Toleranz- oder Feldpräsenzregel lockert (z.B. durch Wiederverwendung derselben Projektionsfunktion für Direkt- und Reload-Pfad ohne ausreichende Abdeckung der "knapp außerhalb der Toleranz"-Fälle), wodurch eine echte Abweichung fälschlich akzeptiert würde — genau das im Diff-Risiko von Slice 1 bereits benannte Hauptrisiko.
  - Ereignis 3: In drei Monaten wäre die wahrscheinlichste Fehlerursache, dass bei der Umsetzung von Slice 1 die Source-Identity-V2-Projektion optionale Reconciliation-Felder (wie entscheidung.jahresEntnahme oder spezifische Flex-Raten) bei der Serialisierung nicht exakt kanonisch abbildet, wodurch bei Mehr-Bucket-Portfolios mit dynamischer Horizontanpassung nach Reload trotz eingehaltenem Toleranzband ein unerwarteter Reconcile-Fehlschlag auftritt.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Slice 3's "vollständiger Vergleich"-Akzeptanzkriterium ist nicht explizit an den in §3.1 beschriebenen Fallback (kein Vertragsnachweis -&gt; nur UI-Fix) gekoppelt, während das benachbarte Doku-Kriterium das bereits ist; dies könnte bei Slice-3-Planung ein unerreichbares Kriterium erzeugen, falls Slice 1 keinen Contract-Fix liefert.
- Akzeptanztest: Bei der Detailplanung/Review von Slice 3 sicherstellen, dass jedes Akzeptanzkriterium, das einen vollständigen Vergleich für die reduzierte Variante verlangt, explizit auf "sofern Slice 1 den Reconciliation-Vertrag angepasst hat" konditioniert ist, konsistent mit dem in §3.1 bereits vorgesehenen Fallback.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | Slice 3's "vollständiger Vergleich"-Akzeptanzkriterium ist nicht explizit an den in §3.1 beschriebenen Fallback (kein Vertragsnachweis -&gt; nur UI-Fix) gekoppelt, während das benachbarte Doku-Kriterium das bereits ist; dies könnte bei Slice-3-Planung ein unerreichbares Kriterium erzeugen, falls Slice 1 keinen Contract-Fix liefert. | OBSERVATION | offen | offen |
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
