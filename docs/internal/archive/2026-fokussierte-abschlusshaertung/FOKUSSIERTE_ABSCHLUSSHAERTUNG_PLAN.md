# Fokussierte Abschlusshaertung der Ruhestand-Suite: Arbeitsplan

**Stand:** 2026-08-09<br>
**Status:** Slice 1 mit Commit `55bdd84`, Slice 2 mit Commit `c322bbe` und Slice 3 nach Claude-/Gemini-Abnahme mit Commit `68e9e0f` abgeschlossen; Slice 4 im Claude-Re-Review freigegeben, S4-08 nach Nutzerentscheidung umgesetzt und S4-09 als niedriges Restrisiko akzeptiert. 19.507/19.507 Assertions, 29/29 Browserworkflows und Coverage-Gates gruen; finale Gemini-Scope-/Abnahmepruefung und lokaler Commit ausstehend<br>
**Autor:** Codex<br>
**Entscheider und einziger Produktnutzer:** Nutzer<br>
**Vorgesehener Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** Branch lokal angelegt; nicht veroeffentlicht, da keine Push-Freigabe vorliegt<br>
**Planungsbranch:** `main`<br>
**Planungs-HEAD:** `27b9264`

## 1. Verbindliche Produktentscheidung

Die Ruhestand-Suite bleibt dauerhaft ein persoenliches Werkzeug fuer genau einen
bekannten Nutzer. Sie wird nicht zu einem allgemeinen Mehrbenutzer-, Beratungs-
oder Vertriebsprodukt ausgebaut.

Aus den drei Bewertungen von Claude, Codex und Gemini sowie der konsolidierten
Bewertung wird deshalb keine allgemeine Professionalisierungsinitiative
abgeleitet. Stattdessen wird genau eine letzte, begrenzte Hardening-Runde mit
vier Umsetzungsslices durchgefuehrt:

1. Monte-Carlo-Exportvertrag fachlich eindeutig und versioniert machen.
2. Entscheidungsrelevante Risikoanzeigen wahrheitsgetreu darstellen.
3. Die jeweils wirksame Sicherheitsbegrenzung aus Alarm oder Guardrail gegen
   nachgelagerte Komfortanhebungen schuetzen.
4. Den Cashstatus nach realem Tranchen-Reconcile verpflichtend schließen.

Nach erfolgreicher Abnahme von Slice 4 wechselt die Suite in einen
**persoenlichen Wartungsmodus**. Danach werden neue Funktionen nur aufgenommen,
wenn mindestens eine der folgenden Bedingungen eintritt:

- ein Fehler ist am aktuellen Stand reproduzierbar und kann eine reale
  Entscheidung oder Bestandsfortschreibung wesentlich verfaelschen;
- die tatsaechliche persoenliche Nutzung oder das Portfolio verlaesst den
  dokumentierten Geltungsbereich;
- eine Rechts-, Daten- oder Plattformänderung macht einen bestehenden Ablauf
  unbrauchbar;
- ein manueller Kontrollschritt erweist sich im realen Jahresprozess als nicht
  verlaesslich durchfuehrbar.

Komfort, allgemeine Produktreife oder eine bessere Bewertungsnote allein sind
kein ausreichender Anlass fuer weitere Entwicklung.

### 1.1 Umsetzungsfreigabe vom 2026-08-07

Claude hat Entwurf v8 in seiner sechsten Runde ohne Blocker freigegeben. Der
Nutzer hat danach ausdruecklich angewiesen, mit Slice 1 zu beginnen. Diese
Anweisung ersetzt fuer den Umsetzungsstart das im Plan noch offene
Gemini-Re-Review; sie wird nicht als tatsaechlich erfolgte Gemini-Freigabe
dargestellt. C-16 ist eine nicht blockierende Testergänzung fuer Slice 3 und
beruehrt den Start von Slice 1 nicht.

### 1.2 Umsetzungsfreigabe fuer Slice 4 vom 2026-08-07

Nach lokaler Abnahme und Commit von Slice 3 hat der Nutzer ausdruecklich
angewiesen, Slice 4 zu beginnen und das Slice-03-Dokument als Eingangsgröße zu
verwenden. Diese Anweisung ersetzt fuer den Umsetzungsstart das im Slice-04-
Entwurf noch offene Gemini-Re-Review; sie wird nicht als tatsaechlich erfolgte
Gemini-Freigabe dargestellt. Der technische Preflight muss die slice-eigene
Dateigrenze weiterhin einhalten und erkannte Scopeabweichungen vor Coding
stoppen.

## 2. Grundlage der Entscheidung

### 2.1 Bewertungsgrundlage

| Dokument | Kernaussage |
| --- | --- |
| `BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Claude.md` | 78 Prozent; technisch stark, fachliche und operative Grenzen deutlich gewichtet |
| `BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Codex.md` | 82 Prozent; gute Eignung im engen Scope, verbleibende Ergebnis- und Modellrisiken |
| `BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Gemini.md` | 84,2 Prozent; hohe technische und fachliche Reife, aber teilweise zu optimistische Tatsachenannahmen |
| `BEWERTUNG_RUHESTANDSSUITE_2026-08-06_KONSOLIDIERT.md` | 80 Prozent; belastbarer gemeinsamer Wert nach Aufloesung der Widersprueche |
| `MC_LAUF_ANALYSE_2026-08-04_DATENPRUEFUNG_ROBUSTHEIT.md` | konkrete Export-, Darstellungs-, Policy- und Szenariofindings am produktiven MC-Lauf |

### 2.2 Technische Baseline

Die am Bewertungsstichtag ausgefuehrten Nachweise ergaben:

| Gate | Ergebnis |
| --- | --- |
| `npm test` | 167 Testdateien, 18.977/18.977 Assertions, 0 Fehler, 0 offene Handles |
| `npm run test:browser` | 29/29 Workflows bestanden |
| `npm run test:coverage` | 78,88 Prozent approximative V8-Zeilenabdeckung |
| `cargo test --locked` | 8/8 Rust-Tests bestanden |
| `npm run docs:evidence` | Markt-, Forschungs- und Mechanismusregister bestanden |

Diese Baseline belegt eine hohe Regressionsabsicherung. Sie belegt nicht die
externe fachliche Richtigkeit der Modelle.

### 2.3 Auswahlregel fuer die vier Slices

Ein Punkt wird nur umgesetzt, wenn er alle folgenden Bedingungen erfuellt:

1. Er betrifft einen tatsaechlich genutzten persoenlichen Ablauf.
2. Er kann eine reale finanzielle Interpretation oder Bestandsfortschreibung
   wesentlich beeinflussen.
3. Das Sollverhalten kann mit einem klaren Contract und Testorakel festgelegt
   werden.
4. Der Fix bleibt in einem kleinen, reviewbaren Slice ohne allgemeinen
   Produktausbau.
5. Der Fix erzeugt keine dauerhafte externe Daten-, Rechts- oder
   Wartungsabhaengigkeit.

Die vier ausgewaehlten Punkte erfuellen diese Bedingungen:

- MC-Exporte wurden bereits mit Codex beziehungsweise Claude analysiert; die
  maschinelle Auswertung ist damit ein realer persoenlicher Workflow.
- P10 und Drawdown koennen direkt die Hoehe des angenommenen sicheren Konsums
  beeinflussen.
- Die Policy-Reihenfolge kann den beabsichtigten Crashschutz neutralisieren.
- Ein offener Cashstatus nach einem realen Verkauf kann App- und Brokerzustand
  auseinanderlaufen lassen.

### 2.4 Warum nicht einfach alles unveraendert bleibt

Ein Einzelnutzer reduziert Verteilungs-, Support-, Mehrbenutzer- und
Barrierefreiheitsrisiken. Er reduziert nicht das persoenliche Schadensrisiko
durch falsch bezeichnete Ergebnisse, optimistische Downside-Anzeigen, eine
unerwartete Policy-Reihenfolge oder einen unvollstaendigen Realbestandsabgleich.

Gerade diese vier Punkte liegen an der Grenze zwischen Simulation und realer
Entscheidung. Sie werden deshalb nicht als rein dokumentierbares Restrisiko
akzeptiert.

### 2.5 Korrekturgrundlage aus den Planreviews

Claudes erster Planreview hat vier Blocker nachgewiesen. Sie werden nicht als
Formulierungsfragen behandelt, sondern fuehren zu folgenden verbindlichen
Neuschnitten:

1. Der Worst-Case-Record von Jahr 1 wurde erneut direkt geprueft. Er enthaelt
   `Alarm: false`, die Quelle `Glättung (Final-Guardrail)` und die Folge
   12.144,29 EUR Guardrail-Signal -> 30.000 EUR Mindest-Flex -> 53.400 EUR nach
   Glättung. Der Safety-Contract muss daher Alarm **oder** Guardrail umfassen.
2. Der reale Drawdown ist keine reine Anzeige, sondern eine neue Buffer-,
   Chunk-, Aggregat- und Export-KPI. Er wird deshalb bereits in Slice 1 in den
   einmalig eingefrorenen V2-Vertrag aufgenommen.
3. Slice 1 verwendet einen V2-Projektionsadapter statt einer projektweiten
   internen Feldumbenennung. So bleibt er bei maximal zehn produktiven Dateien;
   reicht das nicht, wird vor Coding gestoppt.
4. Slice 4 hebt die Historien-Schemaversion nicht an. Der Cashabschluss wird als
   append-only Folgeereignis modelliert; valide v1-Historien bleiben ohne
   produktive Migration lesbar.

Claudes zweite Reviewrunde hat drei weitere Vertragsluecken offengelegt. Daraus
folgen diese verbindlichen Korrekturen:

5. Auch der separat exportierte Szenario-Log erhaelt einen eigenen
   `ScenarioLogExportV2`-Envelope. JSON und CSV werden aus derselben
   V2-Projektion erzeugt; ein nacktes Rohzeilenarray ist kein neuer Export mehr.
6. Ein Safety-Signal wird aus strukturellen Tatsachen abgeleitet, niemals aus
   dem mehrfach ueberschriebenen Anzeigetext `kuerzungQuelle`. Der Cap ankert
   bewusst erst **nach** der internen Flexraten-Glättung und den dortigen Hard
   Caps, aber vor Mindest-Flex und finaler Pipeline-Glättung.
7. Jedes Cashabschlussereignis traegt eine fuer alle Historienrecords gueltige
   `actionId`, die exakt seiner `confirmationActionId` entspricht. Gemischte
   Eventhistorien werden beim Lesen und in der Verkaufsvorschau nach
   `eventType` behandelt.
8. Das Jahr-2-Beispiel in Slice 3 ist nur ein isoliertes
   Ein-Jahres-Kontrafaktum. Fuer einen vollstaendigen Neulauf gilt ausschliesslich
   die jahresweise Invariante `finaler Flex <= aktuell wirksamer Safety-Cap`;
   ein niedrigeres Policy-Ziel darf die bestehende Jahres-Abwaertsgrenze nicht
   umgehen.

Claudes dritte Reviewrunde hat fuenf Detailauflagen ergaenzt:

9. `bear_deep` erzeugt nur bei einem positiven Rohcut oberhalb der numerischen
   Toleranz einen Safety-Cap. Ein blosses Regime-Label ohne wirkliche Reduktion
   reicht nicht.
10. Die Vorentscheidungsquote heisst im V2-Vertrag
    `preDecisionWithdrawalRatePct`; Vorjahres-Flexrate, Messphase und Nenner
    stehen woertlich im Unit-Contract.
11. Die Rollback-Regel gilt auch fuer die zwischen Slice 1 und 2 geteilte Datei
    `simulator-results.js`. Slice 1 besitzt mit zehn produktiven Dateien keine
    Reserve; jede elfte produktive Abhaengigkeit stoppt vor ihrem Edit.
12. Der Cashabschluss bleibt in einem synchronen atomaren Commitpfad und zieht
    weder `crypto.subtle` noch ein fachfremdes Simulator-/Marktdatenmodul in den
    Tranchenbereich. Die in Runde 3 noch vorgesehene private Hashhilfe wird
    durch die einfachere Entscheidung aus Runde 4 ueberholt.
13. `safetyCapAnchorStage` ist quellenspezifisch: Alarm, Bear-Deep und
    Flexraten-Hard-Cap ankern nach interner Glättung/Hard-Caps, ein
    Spending-Guardrail nach `applyGuardrails`.

Claudes vierte Reviewrunde fuehrt zu drei weiteren verbindlichen
Planentscheidungen:

14. Die sichtbare 4,5-Prozent-Kennzahl bleibt im Scope. V2 deklariert sie als
    Auswertung der **realisierten** Entnahmequote und nicht als Alarm- oder
    Guardrail-Schwelle. Der strikt-`> 4,5 %`-KPI und die wegen der Binbildung
    `>= 4,5 %` umfassende Heatmap-Ueberlagerung erhalten getrennte
    Vergleichsoperatoren. Slice 2 beschriftet alle normalen sichtbaren
    Entscheidungsflaechen entsprechend; Slice 1 muss dafuer nicht geteilt
    werden.
15. Die Cashabschluss-ID wird ohne Hash direkt und injektiv als
    `cash-confirmation:v1:<normalizedTargetActionId>` abgeleitet. Verkaufs-IDs
    und Ziel-IDs bleiben auf 128 Zeichen begrenzt; nur
    `cash_posting_confirmed.actionId` beziehungsweise `confirmationActionId`
    darf wegen des 21-Zeichen-Prefixes bis zu 149 Zeichen lang sein.
16. Diese Korrekturhistorie bleibt vollstaendig, damit spaetere Leser erkennen,
    welche Entscheidung eine aeltere Zwischenloesung ersetzt hat.

Geminis erste Reviewrunde fuehrt zu einer substanziellen Korrektur und mehreren
Praezisierungen; sachlich nicht zutreffende Blocker werden nicht ungeprueft in
den Vertrag uebernommen:

17. G-P-01 ist durch Nutzerentscheidung NE-03 geschlossen. Mindest-Flex ist
    echter Flex und darf in einer **schweren Flex-Notlage** bis auf null
    entfallen. Marktbedingt gilt dies nur bei der Konjunktion aus aktuellem
    `market.sKey === 'bear_deep'` und einem realen Drawdown des aktiven
    Gesamtvermoegens von mehr als 25 Prozent gegen seinen realen Hoechststand.
    Ein lokal extremer Aktienmarkt allein reicht nicht. Der separate Floor wird
    von keiner Flex-Policy gekuerzt; ist er im direkten Simulator finanziell
    nicht deckbar, entsteht der vorhandene `ruin`-Jahresvertrag. Die normalen
    Pfade beenden daraufhin den Lauf, statt einen scheinbar gueltigen niedrigeren
    Floor auszugeben.
18. G-P-02 wird angenommen. Slice 4 erhaelt neben der Erstbestaetigung ein
    append-only `cash_posting_corrected`-Ereignis mit lueckenloser Revision und
    Rueckverweis auf den aktuell wirksamen Cashnachweis. Tippfehler werden damit
    korrigierbar, ohne einen Auditrecord zu mutieren.
19. G-P-03 ist als Blocker sachlich nicht zutreffend: Die MC-Aggregate liefern
    Maximum-Drawdowns als positive Verlustbetraege. Der Vertrag fixiert dennoch
    den Wertebereich `[0, 100]`, lehnt negative Werte fail-closed ab und rundet
    eine optionale Grobanzeige ausschliesslich auf diesem positiven Betrag
    konservativ nach oben.
20. G-P-04 ist bereits durch die verbindliche Arbeitsbaumtrennung vor dem ersten
    Code-Edit abgedeckt. Der aktuelle unsaubere Planungsbaum bleibt ausdruecklich
    keine Implementierungsbaseline.
21. G-P-05 wird in seiner hohen Einstufung abgelehnt. Der Szenariologexport
    projiziert genau den bereits materialisierten, ausgewaehlten und durch die
    validierte Laufzeit begrenzten Einzelpfad; er verspricht kein Streaming und
    haelt nicht alle Monte-Carlo-Laeufe. Diese Speicherannahme wird als
    ausdruecklicher Contract und Grenztest dokumentiert.
22. G-P-06 wird als sinnvolle, nicht blockierende Auflage angenommen. Slice 2
    prueft centgenaue grosse Betraege in schmalen und regulaeren Viewports auf
    Umbruch, Ueberlappung, Abschneiden und horizontalen Seitenoverflow.
23. G-P-07 beruht auf einer ungueltigen Vorbedingung: Eine 129 Zeichen lange
    Verkaufs-/Ziel-ID wird bereits vor der Ableitung abgewiesen; aus einer
    gueltigen 128-Zeichen-ID entsteht exakt die erlaubte 149-Zeichen-ID. Die
    vorhandenen Grenztests und eine verstaendliche fail-closed Fehlermeldung
    bleiben verbindlich.

Claudes fuenfte Reviewrunde fuehrt zu zwei weiteren Praezisierungen, aber nicht
zu einer dritten fachlichen Null-Flex-Bedingung:

24. C-14 wird als fehlender Randfall im Contract und in der Testmatrix
    angenommen. Die empfohlene Kopplung an `wealthFactor >= 0.5` wird dagegen
    abgelehnt: `wealthFactor` misst ueberwiegend die reale Vorjahresentnahme im
    Verhaeltnis zum aktuellen realen Depot und damit eine **endogene
    Entnahmebelastung**, nicht den von NE-03 gemeinten Schaden am aktiven
    Gesamtvermoegen. Die Null-Flex-Entscheidung bleibt exakt zweigliedrig:
    aktuelles `bear_deep` und mehr als 25 Prozent realer
    Gesamtvermoegensdrawdown. Sie gilt bewusst auch bei `wealthFactor === 0`
    beziehungsweise unterdruecktem Alarm. Dieser Zustand wird als getrennte
    Policy diagnostiziert und mit einem Zwei-Jahres-Regressionstest gegen
    selbstinduziertes Ein-/Ausschalten abgesichert.
25. C-15 wird als berechtigte Forderung nach einem Quellbeleg angenommen; eine
    neue Ruin-Semantik wird nicht eingefuehrt. Die Planung schuetzt den Floor in
    `calculateFinalWithdrawal`. Kann der Simulator ihn aus dem vorhandenen
    Gesamtvermoegen nicht decken, liefert `simulator-engine-direct.js` bereits
    `kind: 'ruin'` mit Pflicht-, Deckungs- und Shortfallwerten. Die normalen
    App-, MC- und Backtestpfade verwenden `BREAK_ON_RUIN = true`. Der generische
    historische Runner bleibt fuer explizite Diagnoselaeufe mit
    `breakOnRuin: false` konfigurierbar; Slice 3 aendert weder diese Option noch
    die bestehenden Floor-Shortfall-Metriken. Eine Metrik
    `floor_shortfall_years` beweist keine Fortsetzung im Normalpfad: Sie kann
    bereits die eine terminale Ruinzeile zaehlen und unterstuetzt zusaetzlich
    den ausdruecklichen Diagnosemodus.

Die personenbezogenen Produktionsartefakte belegen nur die Planungsbaseline.
Sie werden nicht als Testfixtures in das Repository uebernommen.

## 3. Arbeitsbaum- und Branch-Baseline

Bei Erstellung dieses Plans gilt:

```text
Branch: main
HEAD: 27b9264

 M .claude/settings.local.json
 M README.md
 M docs/README.md
 M docs/internal/README.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md
 M docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md
 M tests/project-license-metadata.test.mjs
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Claude.md
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Codex.md
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Gemini.md
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06_KONSOLIDIERT.md
?? docs/internal/MC_LAUF_ANALYSE_2026-08-04_DATENPRUEFUNG_ROBUSTHEIT.md
?? docs/reference/MARKTVERGLEICH.md
?? docs/reference/WISSENSCHAFTLICHER_RAHMEN.md
```

Dieser Zustand ist nur die Planungsbaseline und **keine zulaessige
Implementierungsbaseline**. Die vorhandenen Aenderungen gehoeren nicht
automatisch zum Scope dieses Plans.

Vor dem ersten Code-Edit muessen:

1. Claudes fuenf Reviewrunden sowie Geminis Erstrunde G-P-01 bis G-P-07
   vollstaendig dokumentiert und wie in Entwurf v8 entschieden sein;
2. Nutzerentscheidung NE-03 mit dem konjunktiven Notfallgate und absoluter
   Floor-Prioritaet dokumentiert sein;
3. der korrigierte Entwurf v8 adversarial re-reviewt sein; Claude hat ihn
   freigegeben, und der Nutzer hat am 2026-08-07 den Start vor dem noch
   ausstehenden Gemini-Re-Review ausdruecklich autorisiert;
4. alle Review-Findings durch Codex beantwortet und eingearbeitet sein;
5. der Planstatus aufgrund dieser Nutzerfreigabe `implementierungsreif` lauten;
6. `codex/fokussierte-abschlusshaertung` angelegt und aktiv sein;
7. der Arbeitsbaum entweder sauber oder jede Fremdaenderung explizit vom
   Slice-Scope getrennt sein;
8. die jeweilige Slice-MD den aktuellen Branch, `git status --short` und den
   konkreten Diff-Risiko-Block enthalten.

## 4. Nutzungseinschraenkungen und bleibende Kontrollpflichten

### 4.1 Bis zur jeweiligen Slice-Abnahme

- MC- und Szenario-JSON/CSV-Exporte nicht ohne Kenntnis der Bin-, Einheiten-,
  Quotendefinitions-, Missingness- und Terminalrecord-Probleme maschinell
  interpretieren.
- Entscheidungen nicht allein an einer gerundeten P10-Anzeige treffen; den
  exakten Exportwert mitlesen.
- Die Kachel beziehungsweise Heatmap „Quote > 4,5 %“ bis zur Abnahme von
  Slice 1 und 2 ausschliesslich als Auswertung der realisierten Entnahmequote
  lesen, nicht als Eintrittshaeufigkeit der Strategie-/Guardrail-Schwelle.
- `Guardrail` im aktuellen Stand nicht als harte Auszahlungsobergrenze
  interpretieren.
- Nach realem Verkauf den Nettoerloes manuell in den Rahmendaten nachfuehren und
  Appbestand gegen Broker und Bankkonto pruefen.

### 4.2 Dauerhaft auch nach Abschluss

- Ein Guardrail ist nur dann eine harte Obergrenze, wenn der neue Contract fuer
  das konkrete Jahr einen aktiven `safetyCap` aus Alarm oder Guardrail ausweist.
  Ohne wirksames Safety-Signal besteht keine allgemeine harte Obergrenze.
- Die 4,5-Prozent-Auswertung bleibt auch nach der Copy-Korrektur eine
  Berichtsreferenz auf Basis der realisierten Entnahmequote. Sie misst nicht,
  wie oft die fachliche Alarm-/Guardrail-Policy ausgeloest hat.
- F7 und F10 bleiben akzeptierte Steuerabweichungen: Die Behandlung negativer
  Cashzinsen ist eine ungeklaerte Modellannahme; die Kirchensteuernaeherung ist
  konservativ, aber nicht rechtsformelgenau. Steuerergebnisse sind gegen reale
  Bescheide beziehungsweise eine externe Berechnung zu plausibilisieren.
- Vor einer tragenden Ruhestandsentscheidung sind mindestens folgende
  Gegenlaeufe zu dokumentieren: `UNIFORM` statt `RECENCY`, alternativer
  Partner-Rentenbeginn 63/67, Tail-Risk aktiv sowie mehrere feste Seeds. P10,
  realer Drawdown, Kuerzungsjahre und Horizon-Censoring werden verglichen.
- Rentenbeginn und -hoehe werden gegen Bescheid/Vertrag geprueft. Sampling-
  Abdeckung, Langlebigkeitsannahmen und Modellrisiko werden nicht durch eine
  gruene Testsuite oder 0 Prozent Ruin als validiert betrachtet.

## 5. Zielzustand

Nach Abschluss der vier Slices gilt:

1. Jeder neu erzeugte MC-V2-Export und jeder `ScenarioLogExportV2` besitzt
   eindeutige Einheiten, Quotendefinitionen und Terminalrecord-Typen; der
   MC-Export enthaelt zusaetzlich eindeutige Intervalle, Applicability,
   nominalen/reellen Drawdown und unterscheidbare Mindest-Flex-Messungen.
2. Entscheidungsrelevante Nutzen- und Belastungswerte zeigen den exakten Wert
   primaer; jede nachrangige Grobrundung folgt einem KPI-spezifischen
   konservativen Orakel.
3. Nominaler und realer Drawdown sind sichtbar unterscheidbar.
4. Heatmap, KPI und Auto-Optimize nennen fuer die 4,5-Prozent-Auswertung die
   realisierte Quotenbasis, den richtigen Vergleichsoperator und die reine
   Berichtsrolle.
5. Ein wirksamer Safety-Cap aus Alarm oder Guardrail kann nicht durch finale
   Glättung nach oben ueberstimmt werden. Mindest-Flex bleibt ausserhalb einer
   schweren Flex-Notlage die Untergrenze. Nur bei `bear_deep` **und** mehr als
   25 Prozent realem aktivem Gesamtvermoegensdrawdown darf der gesamte Flex
   einschliesslich Mindest-Flex auf null fallen. Der Floor bleibt absolut
   vorrangig und wird nie als Flex behandelt.
6. Der Basis-Alarmcut ist ehrlich als konstante 10 Prozentpunkte benannt; seine
   bestehende Skalierung mit `wealthFactor` wird separat diagnostiziert.
7. Ein bestaetigter realer Verkauf besitzt einen persistenten, eindeutigen
   Cashstatus. Ein offener manueller Cashnachtrag bleibt sichtbar
   unvollstaendig; ein Abschluss ist append-only nachvollziehbar.
8. Alle vier Slices sind einzeln getestet, reviewt, dokumentiert und lokal
   committet; Push erfolgt nur nach ausdruecklicher Nutzerfreigabe.

## 6. Globale Nicht-Ziele

- keine vollstaendige deutsche Einkommensteuer-, Rentensteuer-, KV- oder
  PV-Engine;
- keine automatische Broker-, Bank- oder Rentenkontenanbindung;
- keine monatliche automatische Portfolio- oder Entnahmeorchestrierung;
- kein Immobilien-, Kredit-, Erbschafts-, Schenkungs- oder freies
  Ereignislistenmodell;
- kein allgemeiner Einsteiger-Wizard und keine formale WCAG-Zertifizierung;
- keine Mehrbenutzer-, Cloud- oder Beraterplattform;
- keine Erweiterung auf beliebige Fremdwaehrungen oder Assetklassen;
- keine vollstaendige externe wissenschaftliche Zertifizierung;
- kein projektweites Grossrefactoring, keine Volltypisierung und kein
  allgemeines UI-Redesign;
- keine Release-Signierung oder kommerzielle Distributionspipeline;
- kein Tauri-Release-Build ohne separaten ausdruecklichen Nutzerauftrag;
- keine manuelle Aenderung von `engine.js`, `dist/` oder
  `RuheStandSuite.exe`.

## 7. Slice-Uebersicht und Reihenfolge

| Slice | Datei | Ziel | Abhaengigkeit | Status |
| ---: | --- | --- | --- | --- |
| 1 | [SLICE_ABSCHLUSSHAERTUNG_01_MC_EXPORTVERTRAG_V2.md](SLICE_ABSCHLUSSHAERTUNG_01_MC_EXPORTVERTRAG_V2.md) | einmaliger MC- und Szenario-V2-Schnitt inklusive realem Drawdown, Mindest-Flex- und 4,5-Prozent-Messcontract | keine | mit Commit `55bdd84` abgeschlossen und Baseline fuer Slice 2 |
| 2 | [SLICE_ABSCHLUSSHAERTUNG_02_RISIKOANZEIGEN.md](SLICE_ABSCHLUSSHAERTUNG_02_RISIKOANZEIGEN.md) | exakte KPI-Anzeige mit Nutzen-/Kostenorakel und eindeutiger 4,5-Prozent-Beschriftung | Slice 1 | mit Commit `c322bbe` abgeschlossen; 168 Testdateien/19.222 Assertions und 29 Browserworkflows gruen |
| 3 | [SLICE_ABSCHLUSSHAERTUNG_03_SAFETY_POLICY_PRIORITAET.md](SLICE_ABSCHLUSSHAERTUNG_03_SAFETY_POLICY_PRIORITAET.md) | struktureller Safety-Cap mit konjunktivem Null-Flex-Notfallgate und absolutem Floor-Schutz | Slice 2 abgeschlossen; fachlich unabhaengig | nach Opus-Findings korrigiert, durch Claude/Gemini abgenommen und mit Commit `68e9e0f` abgeschlossen |
| 4 | [SLICE_ABSCHLUSSHAERTUNG_04_RECONCILE_CASHSTATUS.md](SLICE_ABSCHLUSSHAERTUNG_04_RECONCILE_CASHSTATUS.md) | append-only Cashstatus nach Realverkauf | Slice 3 mit Commit `68e9e0f` abgeschlossen; fachlich unabhaengig | Claude-Re-Review freigegeben; S4-08 umgesetzt, S4-09 als niedriges datenwirkungsfreies Restrisiko akzeptiert; 169 Testdateien/19.507 Assertions, 40 fokussierte S4-08-Assertions und 29 Browserworkflows gruen; finale Gemini-Abnahme und Commit offen |

Die Slices werden seriell umgesetzt. Dadurch besitzt jeder Slice einen eigenen
Review- und Commit-Sicherheitspunkt. Ein dauerhaft roter Zwischenstand ist
nicht vorgesehen.

## 8. Slice 1 – MC-Exportvertrag V2

### Ziel

Die Findings F1 bis F4, F8, der reale Drawdown C1 und die Mindest-Flex-
Namenskollision aus R5 werden in einem neuen Ergebnis-/Exportvertrag behoben,
ohne alte V1-Dateien still umzudeuten. V2 wird erst am Ende dieses Slices
eingefroren und in Slice 2 nicht mehr erweitert.

### Verbindlicher Zielcontract

- Der bestehende Request kann V1 bleiben, sofern sich seine Eingabesemantik
  nicht aendert.
- Neue Ergebnisse beziehungsweise Dokumente verwenden
  `MonteCarloRunResultV2` und `MonteCarloExportV2`.
- Der Schnitt erfolgt ueber einen V2-Projektionsadapter. Bestehende interne
  Feldnamen werden nicht projektweit umbenannt.
- Der getrennte Szenarioexport verwendet `ScenarioLogExportV2` als Objekt mit
  `schemaVersion: "ScenarioLogExportV2"`,
  `unitContract.schemaVersion: "ScenarioLogUnitContractV2"` und `records`; ein neu erzeugtes nacktes
  Zeilenarray ist unzulaessig. Der V1-Zweig erkennt alte Arrays, gibt sie nur
  mit verpflichtenden Warnungen zu F2/F3/F8/R5 frei und weist unbekannte
  Objektversionen fail-closed ab.
- JSON und CSV des Szenariologs stammen aus derselben Funktion
  `projectScenarioLogV2(rows)`. Jeder projizierte Record traegt `recordType`
  (`financial_year`, `terminal_ruin` oder `terminal_death`) und
  `financiallyEvaluable`; nur `financial_year` ist finanziell auswertbar. Der
  Typ wird in den Row-Buildern strukturell gesetzt und nie aus Anzeigetext
  erraten.
- Die Projektion erfolgt erst bei der ausdruecklichen Exportaktion. Ein
  Szenariowechsel invalidiert vorher den alten Exportzustand; ein
  Projektionsfehler erzeugt einen sichtbaren Fehler und niemals einen Download
  des zuvor gewaehlten Szenarios.
- Akkumulationsjahre bleiben finanzielle Jahresrecords, kennzeichnen Entnahme-
  und Mindest-Flex-Gruppen aber als nicht anwendbar (`null`, stabiler Grund,
  Count 0). Beobachtete Marktreturns bleiben davon unberuehrt.
- Der Policy-Mindest-Flex stammt aus dem verschachtelten Post-Policy-Wert, die
  Erfuellung aus der Top-Level-Ausfuehrungsmessung. Der kollidierende
  verschachtelte Legacy-Name wird aus V2 entfernt.
- V2 wird ueber `MONTE_CARLO_EXPORT_V2_VERSION` angesprochen; der deprecated
  unqualifizierte Altbezeichner behaelt seine historische V1-Bedeutung.
- Der CSV-Header ist die stabile Vereinigungsmenge aller Schluessel aller
  projizierten Records und enthaelt dadurch auch Terminalfelder. Jede CSV-Zeile
  traegt ausserdem `scenarioLogSchemaVersion` und `unitContractVersion`.
  Objektzellen werden kanonisch als JSON serialisiert; Semikolon, Anfuehrungs-
  zeichen und Zeilenumbrueche werden CSV-konform maskiert.
- Die Vereinigungsmenge wird bewusst ueber den bereits vollstaendig
  materialisierten ausgewaehlten Szenariopfad gebildet. Der Pfad ist durch die
  validierte Laufzeit des Requests begrenzt und enthaelt nicht die Records aller
  MC-Laeufe. Weder Streaming noch konstante Speichernutzung sind Teil dieses
  persoenlichen Exportvertrags; ein oberer gueltiger Laufzeit-Grenzfall muss den
  Export dennoch ohne Fehler und ohne semantischen Zeilenverlust durchlaufen.
- Heatmap-Eintraege besitzen explizit `lowerBoundPct`, `upperBoundPct`,
  `lowerInclusive`, `upperExclusive`, `openEnded` und `observationCount`; Bin-
  und Zaehllisten sind gleich lang.
- Der V2-`unitContract` deklariert fuer Heatmap und 4,5-Prozent-KPI jeweils
  `basisField: "realizedWithdrawalRatePct"`, `thresholdPct: 4.5` und
  `thresholdRole: "reporting_reference_not_guardrail_trigger"`. Der KPI
  `timeShareQuoteAbove45` traegt
  `comparison: "strictly_greater_than"`; die bin-basierte Heatmap-
  Ueberlagerung traegt
  `comparison: "greater_than_or_equal_at_bin_resolution"`. Beide duerfen
  weder `preDecisionWithdrawalRatePct` als Basis nennen noch als fachliche
  Alarm-/Guardrail-Ausloesung ausgegeben werden.
- Ratio-Felder tragen `...Ratio`; Prozentpunktfelder tragen `...Pct`.
- Policy- und realisierte Entnahmequote besitzen unterschiedliche Namen sowie
  dokumentierten Nenner und Messzeitpunkt.
- Nicht anwendbare beziehungsweise nicht beobachtete Werte sind `null` plus
  stabiler Applicability-/Missingness-Grund und Beobachtungszahl.
- `observationCount` ist ein JSON-serialisierbares Objekt mit nichtnegativen
  Zahlwerten und darf nicht als `{}` aus einer `Map` verloren gehen.
- Nominaler und realer Maximum-Drawdown werden mit identischem Pfad und
  identischen Zeitgrenzen aggregiert; fehlende Inflation ergibt beim realen
  Wert `null` plus Grund, niemals 0.
- Beide V2-Drawdownwerte sind positive Verlustbetraege in Prozentpunkten mit der
  Domaene `[0, 100]`. Negative oder groessere Werte scheitern fail-closed; der
  Projektor darf sie weder per Betrag noch per Clamp scheinbar reparieren.
- Der geplante Policy-Mindest-Flex und die kanonische Erfuellungsmessung tragen
  in beiden V2-Artefakten die getrennten Namen
  `minimumFlexPolicyEffectiveAnnualEur` und
  `minimumFlexFulfilledAnnualEur`.
- Szenario-Renditen werden als `...Ratio`, Entnahmequoten als
  `realizedWithdrawalRatePct` beziehungsweise `preDecisionWithdrawalRatePct`
  projiziert. Der Unit-Contract nennt fuer beide Quoten Nenner und
  Messzeitpunkt; `entnahmequote` wird dabei von Ratio auf Prozentpunkte mit 100
  multipliziert, `QuoteEndPct` nicht erneut skaliert. Fuer
  `preDecisionWithdrawalRatePct` steht woertlich im Contract: „vorlaeufige
  Entnahme auf Basis der Vorjahres-Flexrate, vor Transaktions- und
  Auszahlungsphase; Nenner Depot ohne Liquiditaet und Health-Bucket“. Interne
  Legacy-Namen bleiben ausdruecklich keine oeffentlichen Exportfeldnamen.
- Auf nicht finanziell auswertbaren Terminalrecords sind Renditen, Quoten und
  Mindest-Flex-Messungen `null` plus Grund, nicht scheinbar beobachtete 0.
- Terminalrecords besitzen einen expliziten Recordtyp und sind nicht als
  finanziell auswertbares Jahresrecord markiert.
- Ein Dispatcher liest V1 mit verpflichtender Kompatibilitaetswarnung und V2;
  unbekannte Versionen bleiben fail-closed. Es gibt keine stille
  In-place-Semantikaenderung von V1.
- Maximal zehn produktive Dateien sind geplant. Reicht der Adapterzuschnitt
  nicht, stoppt der Slice vor Coding; die Zehn-Dateien-Regel wird nicht
  nachtraeglich aufgeweicht.

### Abnahme

- Golden-Schema V2 und V1-Kompatibilitaet sind gruen.
- Grenzwerte landen exakt im richtigen Heatmap-Intervall.
- Ein Golden-Test mit exakt 4,5 Prozent belegt die unterschiedliche
  Vergleichssemantik: nicht im strikt-`>`-KPI, aber im ab 4,5 Prozent
  beginnenden Heatmap-Bin. Basisfeld, Schwelle, Operator und reine
  Berichtsrolle ueberstehen den V2-JSON-Roundtrip.
- Bin-/Count-Laengen stimmen ueberein und `observationCount` uebersteht
  JSON-Roundtrip mit seinen Zahlwerten.
- Faktor-100-Verwechslungen werden durch Contracttests ausgeschlossen.
- Keine deaktivierte oder unbeobachtete KPI erscheint als beobachtete Null.
- Realer Drawdown besteht Buffer-/Chunk-/Worker-Paritaet und identisches
  Pfad-/Zeitraum-Orakel zum nominalen Drawdown.
- Nominaler und realer Drawdown bestehen die Domaenengrenzen 0/100; negative
  und groessere Werte werden vor dem Export fail-closed abgewiesen.
- Beide Mindest-Flex-Messungen sind in einem Golden-Export nicht mehr
  verwechselbar.
- JSON und CSV des Szenariologs besitzen semantische Paritaet; alle Records sind
  typisiert, und ein nur im Terminalrecord vorkommendes Feld steht trotzdem im
  CSV-Header.
- Ein synthetischer ausgewaehlter Szenariopfad an der oberen gueltigen
  Laufzeitgrenze bleibt materialisiert exportierbar; der Test behauptet weder
  Streaming noch eine von der Lauflaenge unabhaengige Speichergrenze.
- Ein altes nacktes Szenarioarray ist nur mit Kompatibilitaetswarnung lesbar;
  neue und alte Szenarioartefakte sind anhand der Version unterscheidbar.
- Exporte lassen sich mit eindeutigen Einheiten und Definitionen ohne
  Quellcodewissen auswerten.

## 9. Slice 2 – Wahrheitsgetreue Risikoanzeigen

### Ziel

Die UI darf eine entscheidungsrelevante Nutzen- oder Belastungskennzahl nicht
durch Rundung, Preisbasismischung oder Quantilverkürzung verfälschen. Der Slice
ist ein reiner Anzeige-/Copy-Slice und konsumiert V2 unveraendert.

### Verbindlicher Zielcontract

- Exakte Werte sind fuer reale Depotentnahme P10, Median der Run-P10,
  Steuer-Median, Verlustvortragsersparnis und nominalen/reellen Drawdown die
  primaere sichtbare Kartenanzeige; ein Tooltip allein reicht nicht.
- Nachrangige Grobrundung ist bei Nutzen nur kleiner/gleich Messwert, bei
  Kosten/Belastung nur groesser/gleich Messwert zulaessig und muss als gerundet
  gekennzeichnet sein.
- EUR-Werte erscheinen primaer centgenau; Drawdown mindestens mit zwei
  Nachkommastellen, sofern das validierte Aggregat diese Genauigkeit liefert.
- Nominale und reale Maximum-Drawdowns sind positive Verlustbetraege im
  geschlossenen Wertebereich `[0, 100]`. Negative oder groessere Werte werden
  nicht gerundet oder als Prozentzahl angezeigt, sondern fail-closed als
  ungueltig behandelt. Eine nachrangige Grobanzeige rundet ausschliesslich den
  positiven Verlustbetrag konservativ nach oben.
- Nominaler und realer Maximum-Drawdown aus Slice 1 werden ohne UI-Neuberechnung
  nebeneinander benannt.
- Die Karten lesen weiterhin das vom Runner validierte `aggregatedResults` und
  nicht das erst im Exportpfad erzeugte V2-Dokument. Ein endlicher Aggregatwert
  wird unveraendert formatiert; `null`, fehlender Wert oder ein Missingness-
  Grund erscheint als `—` plus stabiler Grund und Beobachtungszahl, niemals als
  numerische 0.
- Ein ausgewaehlter P10-Pfad wird als P10 nur bezueglich seines tatsaechlichen
  Auswahlkriteriums bezeichnet, nicht als universell konservativer Pfad.
- Nicht kausale Pflege-Gruppenvergleiche bleiben als solche sichtbar markiert.
- Ergebniskarte und Auto-Optimize bezeichnen `timeShareQuoteAbove45` als
  Zeitanteil mit **realisierter** Entnahmequote strikt groesser 4,5 Prozent.
  Die Heatmap bezeichnet ihre bin-basierte Ueberlagerung dagegen korrekt als
  realisierte Entnahmequote groesser/gleich 4,5 Prozent. Ein sichtbarer Hinweis
  stellt klar, dass 4,5 Prozent hier eine Berichtsreferenz und keine
  Alarm-/Guardrail-Schwelle ist.
- Die internen stabilen Metric-Keys duerfen aus Kompatibilitaetsgruenden
  unveraendert bleiben; keine normale sichtbare Entscheidungsflaeche darf die
  Quotenbasis oder den Vergleichsoperator weiter verschweigen.
- Synthetische Invarianten- und Copy-Contract-Tests sichern Werttreue,
  Pfadauswahltext und Pflege-Nichtkausalitaet. Produktionswerte werden nicht als
  Fixture eingecheckt.
- Responsive Browsertests sichern bei grossen centgenauen EUR-Werten mindestens
  einen schmalen mobilen und einen regulaeren Desktop-Viewport. Der vollstaendige
  Exaktwert bleibt lesbar, ohne Ueberlappung, Abschneiden oder horizontalen
  Seitenoverflow.
- Der optionale CAPE-Inaktivhinweis ist ausdruecklich nicht Teil des Slices.

### Abnahme

- Ein synthetischer Nutzenwert erscheint primaer exakt und niemals hoeher; ein
  synthetischer Kostenwert primaer exakt und niemals niedriger.
- Ein positiver Kleinstwert darf nicht durch die Hauptanzeige auf 0 vernichtet
  werden.
- Nominal und real sind in Kartenwert, Label und Preisbasis nicht verwechselbar.
- Copy-Contract- und Browsertests sichern die beiden Interpretationshinweise.
- Copy-Contract- und Browsertests sichern zusaetzlich die Basis-, Operator- und
  Rollenhinweise der 4,5-Prozent-Kennzahl in Ergebniskarte, Heatmap,
  Auto-Optimize-Konfiguration und Auto-Optimize-Ergebnis.

## 10. Slice 3 – Safety-Policy-Prioritaet

### Nutzerentscheidung

NE-03 ersetzt das fruehere offene Ja/Nein-Gate durch eine differenzierte
verbindliche Entscheidung:

- Der konfigurierte Mindest-Flex ist Teil des flexiblen Lebensqualitaetsbudgets,
  kein zweiter Floor. In einer schweren Flex-Notlage darf der gesamte geplante
  Flex einschliesslich Mindest-Flex auf `0` gesetzt werden.
- Eine marktbedingte schwere Flex-Notlage liegt nur bei der **Konjunktion** aus
  `market.sKey === 'bear_deep'` und
  `state.keyParams.realerDepotDrawdown > CONFIG.THRESHOLDS.ALARM.realDrawdown`
  vor. Die bestehende Schwelle betraegt 0,25 beziehungsweise mehr als
  25 Prozent.
- Diese beiden Bedingungen sind vollstaendig. `wealthFactor` beziehungsweise
  das daraus abgeleitete `wealthSufficient` sind **keine dritte
  Gatebedingung**. Sie beschreiben die Entnahmebelastung und werden durch die
  reale Vorjahresentnahme beeinflusst; eine Kopplung wuerde die Null-Flex-
  Entscheidung durch ihre eigene Wirkung im Folgejahr abschalten koennen.
- `realerDepotDrawdown` ist historisch benannt, wird aber aus dem
  inflationsbereinigten aktiven Gesamtvermoegen (`gesamtwert`: Depot plus freie
  Liquiditaet) gegen dessen realen Hoechststand berechnet. Damit ist gerade
  nicht ein lokal extremer Aktienmarkt allein ausreichend.
- Ausserhalb dieser Konjunktion bleibt Mindest-Flex die Untergrenze fuer
  marktbedingte Safety-Caps. Guardrail und finale Glättung duerfen den Wert nicht
  oberhalb der fuer dieses Jahr unter den bestehenden Aenderungsgrenzen
  wirksamen Obergrenze anheben. Ein niedrigeres Policy-Ziel wird schrittweise
  erreicht; der Safety-Cap darf Mindest-Flex nicht allein wegen eines lokalen
  `bear_deep` unterschreiten.
- Unabhaengig vom Markt gilt die bestehende Floor-Prioritaet: Keine Flex-Policy
  reduziert den geplanten Floor. `calculateFinalWithdrawal` begrenzt die
  geplante Entnahme mindestens auf den Netto-Floor. Kann der Simulator diesen
  aus dem vorhandenen Gesamtvermoegen nicht decken, liefert der direkte
  Jahresrunner bereits `kind: 'ruin'` mit erforderlichem, gedecktem und fehlendem
  Floorbetrag. Die normalen App-, MC- und Backtestpfade beenden den Pfad mit
  `BREAK_ON_RUIN = true`; ein bewusst mit `breakOnRuin: false` gestarteter
  historischer Diagnoselauf und die bestehenden Shortfall-Metriken bleiben
  unveraendert.
- Das Null-Flex-Gate ist deterministisch und kein neues Nutzer-Setting. Bei
  aktiver schwerer Flex-Notlage gilt der harte Cap `0 %`; Flex-Budget-Minimum,
  Mindest-Flex, der 35-Prozent-Alarm-Flexfloor und finale Glättung duerfen ihn
  nicht anheben. Der aktuelle Code darf Alarm und Guardrail ansonsten weiterhin
  gegenseitig ausschliessend ausfuehren.
- Ein in demselben Jahr wegen niedriger Entnahmebelastung unterdrueckter Alarm
  deaktiviert dieses separate Gate nicht. Diagnose und UI muessen beide
  Tatsachen ohne Widerspruch benennen: Alarmstatus und `wealthFactor` sind
  diagnostisch; der Null-Flex-Grund ist ausschliesslich
  `bear_deep` plus kritischer realer Gesamtvermoegensdrawdown.

### Verbindlicher Zielcontract

- `calculateFlexRate` liefert zusaetzlich zu seinem Anzeigetext eine
  strukturierte Safety-Evidenz: aktiv bei `alarmStatus.active`, bei einem
  `bear_deep`-Rohcut mit `roheKuerzungProzent` oberhalb der fixierten
  numerischen Toleranz oder wenn ein Flexraten-Hard-Cap die Rate tatsaechlich
  reduziert hat. `bear_deep` allein ist kein Trigger; insbesondere liefert
  `wealthFactor === 0` ohne Rohkuerzung keinen **normalen Bear-Cap**.
  `kuerzungQuelle` ist nur Darstellung und darf den Trigger weder aktivieren
  noch deaktivieren. Das separate NE-03-Gate wird weiter unten unabhaengig
  davon bestimmt.
- Die Pipeline vergleicht Ein- und Ausgangsrate von `applyGuardrails` und leitet
  daraus strukturell ab, ob eine Recovery-/Caution-Begrenzung um mehr als die
  festgelegte numerische Toleranz reduziert hat. Nur ein wirklich bindender
  Guardrail erzeugt einen Kandidaten; `spending-guardrails.mjs` muss dafuer
  nicht veraendert werden.
- Die Pipeline exponiert das Policy-Ziel `safetyCapFlexRatePct`, die fuer das
  aktuelle Jahr rate-limitierte Obergrenze `safetyCapEffectiveFlexRatePct`,
  `safetyCapDeferredByRateLimit`, `safetyCapSource`, `safetyCapBinding`, einen
  **quellenspezifischen** `safetyCapAnchorStage` und die final begrenzende
  Policy.
  `safetyCapSource` ist `alarm`, `bear_deep`, `flex_rate_hard_cap`,
  `spending_guardrail`, `severe_bear_wealth_emergency` oder `null`.
- Das konjunktive Notfallgate exponiert
  `severeFlexEmergencyActive`, `marketExtremeBear`,
  `realTotalWealthDrawdownRatio`, `realTotalWealthDrawdownThresholdRatio` und
  `minimumFlexOverrideAllowed`. Zusaetzlich werden `alarmActive`,
  `withdrawalBurdenFactor` und `alarmWealthSufficient` als rein diagnostische
  Werte sowie `withdrawalBurdenGateRole: diagnostic_only` ausgegeben. Der
  historisch benannte Eingang
  `realerDepotDrawdown` wird nur unter seinem korrekten Gesamtvermoegensbezug
  projiziert; fehlt er oder ist er nicht endlich, stoppt die Entscheidung
  fail-closed statt Null-Flex still zu aktivieren oder zu unterdruecken.
- Fehlende oder nicht endliche Entnahmebelastungsdiagnostik wird als nicht
  verfuegbar ausgewiesen, darf das zweigliedrige Gate aber weder aktivieren noch
  deaktivieren.
- Bei aktivem Notfallgate gilt zusaetzlich der Kandidat `0 %` mit
  `safetyCapSource: severe_bear_wealth_emergency` und
  `safetyCapAnchorStage: post_total_wealth_drawdown_gate`. Er gewinnt als
  Minimum gegen alle anderen Kandidaten.
- Der tatsaechlich ausgezahlte Null-Flex-Satz bleibt als Jahres-Istwert
  erhalten, wird aber nicht zum Aufwaertsglaettungsanker der Folgejahre. Ein
  getrennt persistierter Vor-Gate-Anker verhindert nach Ende der schweren
  Notlage eine rein technisch verursachte, mehrjaehrige Mindest-Flex-
  Unterdeckung. In normalen Jahren bleibt dagegen weiterhin die tatsaechlich
  quantisierte Flexrate der Glaettungsanker.
- Fuer `alarm`, `bear_deep` und `flex_rate_hard_cap` lautet der Anker
  `post_internal_smoothing_and_flex_rate_hard_caps`: bewusst **nach** EMA,
  `MAX_DOWN`, S-Kurve sowie Bären-/Runway-Hard-Cap innerhalb von
  `calculateFlexRate`. Fuer `spending_guardrail` lautet er
  `post_spending_guardrails`, weil dieser Kandidat erst nach
  `applyGuardrails` entsteht. Beide liegen vor Mindest-Flex, Flex-Budget und
  finaler Pipeline-Glättung. Der rohe `basisKuerzung`-Wert ist kein Cap-Anker;
  es findet keine Neukalibrierung der internen Flexratenlogik statt.
- Spaetere Policies respektieren einen aktiven Cap fail-closed. Im normalen
  Pfad wird das Policy-Ziel zusaetzlich durch die bestehenden jaehrlichen
  Auf-/Abwaertsgrenzen in eine aktuell wirksame Obergrenze ueberfuehrt; nur das
  schwere Null-Flex-Gate darf diese Glaettung bewusst umgehen. Bei mehreren
  Safety-Signalen gilt das Minimum der Kandidaten. Bei exakt gleichem Minimum
  ist die Diagnosequelle deterministisch priorisiert:
  `severe_bear_wealth_emergency` vor `spending_guardrail` vor
  `flex_rate_hard_cap` vor `alarm` vor `bear_deep`.
- Ausserhalb der schweren Flex-Notlage wird die wirksame marktbedingte
  Obergrenze nicht unter die von `applyMinimumFlexFloor` bestimmte
  Mindest-Flex-Rate abgesenkt. Bei aktiver Notlage werden Mindest-Flex,
  Flex-Budget-Minimum, 35-Prozent-Alarm-Flexfloor und finale Aufwaertsglättung
  fuer den finalen Cap ueberstimmt; Diagnose-Status ist
  `overridden_by_severe_flex_emergency`, nicht „Mindest-Flex erfuellt“.
- Der normale `bear_deep`-Safety-Kandidat bleibt gemaess C-P-24 an einen
  positiven Rohcut gebunden. Das separate, durch NE-03 autorisierte
  Null-Flex-Gate gilt dagegen auch bei `wealthFactor === 0`; beide Contracts
  duerfen weder in Quelle noch Status miteinander vermischt werden.
- In jedem nichtterminalen, als finanzierbar ausgegebenen Jahresresultat gilt
  `endgueltigeEntnahme >= inflatedBedarf.floor` und bei Null-Flex exakt die
  geplante Netto-Floor-Entnahme. Ein Ausfuehrungs-Shortfall darf nur in einem
  expliziten `ruin`-Jahresresultat mit `ruinDetails` erscheinen. Slice 3 aendert
  weder `BREAK_ON_RUIN` noch die Semantik historischer Shortfall-Metriken.
- Diagnose und UI zeigen, welche Policy den finalen Betrag begrenzt hat.
- ENG-07 aus dem archivierten Model-Transparency-Slice wird geschlossen: Der
  Basis-Alarmcut ist ehrlich konstant 10 Prozentpunkte; die bestehende
  Skalierung `10 * wealthFactor` bleibt erhalten und wird separat
  diagnostiziert. Keine unkalibrierte Shortfall-Abstufung wird erfunden.
- Das Vorab-Delta-Orakel fuer den belegten Nicht-Alarm-Fall ist nun bedingt:
  Vor Coding werden Regime, reales aktives Gesamtvermoegen, realer Hoechststand
  und daraus berechneter Drawdown reproduziert. Liegt die Konjunktion vor, ist
  der finale geplante Flex `0`; liegt sie nicht vor, bleibt der Mindest-Flex von
  30.000 EUR marktbedingte Untergrenze und die bisherige Anhebung auf 53.400 EUR
  wird hoechstens bis dorthin zurueckgenommen. Die 12.144,29 EUR allein beweisen
  keine schwere Flex-Notlage. Im Re-Run gelten die jahresweisen Invarianten je
  Status; synthetische Wahrheitsmatrix und Floor-Schutz muessen eine positive,
  exakt erwartete Bindungswirkung zeigen.
- Backtest-/MC-Aenderungen werden als erwartete Engine-Semantikaenderung mit
  Vorher-/Nachher-Delta dokumentiert.

### Abnahme

- Ein Alarm- oder Nicht-Alarm-Guardrailfall kann nachgelagert nicht mehr
  oberhalb seiner fuer das Jahr wirksamen, rate-limitierten Obergrenze enden;
  das tiefere Policy-Ziel darf die konfigurierte Jahres-Abwaertsgrenze nicht
  umgehen. Ausserhalb der schweren Notlage bleibt Mindest-Flex dennoch die
  Untergrenze.
- `bear_deep` plus 25,01 Prozent realer Gesamtvermoegensdrawdown ergibt
  `severeFlexEmergencyActive: true`, finalen Flex `0` und unveraenderten Floor.
  `bear_deep` allein, exakt 25 Prozent oder ein gleich hoher Drawdown ausserhalb
  von `bear_deep` aktivieren den Null-Flex-Cap nicht.
- Derselbe aktive Null-Flex-Fall bleibt bei `wealthFactor === 0` und
  `alarmActive: false` aktiv. Diagnose und UI weisen dann den getrennten
  Alarmstatus sowie den zweigliedrigen Null-Flex-Grund aus. Bei unveraendertem
  `bear_deep` und Drawdown oberhalb der Schwelle darf die reduzierte
  Vorjahresentnahme das Gate im Folgejahr nicht selbst deaktivieren.
- Fehlender oder nicht endlicher Gesamtvermoegensdrawdown stoppt fail-closed.
  Ein nicht finanzierbarer Floor wird durch den bestehenden direkten Runner als
  `ruin` mit Deckungs- und Shortfallwerten ausgewiesen und nie durch eine still
  reduzierte Floor-Anforderung kaschiert.
- Der dokumentierte Worst-Case wird als gezielter Regressionstest abgebildet,
  jedoch ohne reale personenbezogene Exportdaten als Fixture zu uebernehmen.
- `npm test`, Engine-Build, Browser-Gate und relevante Backtest-/MC-Paritaeten
  sind gruen.
- Unerwartete Snapshot-, Backtest- oder FlowDelta-Abweichungen stoppen den
  Slice.
- Nutzerentscheidung NE-03 ist dokumentiert; ein weiteres fachliches
  Freigabegate zur Mindest-Flex-Unterschreitung besteht nicht. Offen bleibt der
  strukturelle Evidenzlauf, der den belegten Jahr-1-Fall korrekt als schwere
  Flex-Notlage oder als normalen Mindest-Flex-Fall klassifizieren muss.
- `engine.js` ist als erwartetes versioniertes Build-Artefakt vorab im
  Diff-Risiko deklariert.

## 11. Slice 4 – Reconcile-Cashstatus

### Nutzerentscheidung

Der Tranchenmanager soll den Nettoerloes nicht ungefragt automatisch auf freie
Liquiditaet addieren. Das koennte bei bereits extern nachgefuehrtem Bank-/Broker-
Cash doppelt buchen. Der bestehende append-only Auditvertrag bleibt erhalten;
ein spaeterer Cashabschluss wird als eigenes Folgeereignis dokumentiert.

### Verbindlicher Zielcontract

- Die Historie bleibt `schemaVersion: 1`; es gibt keine produktive Migration.
  Altverlaeufe bleiben unveraendert lesbar und werden im Speicher mit
  `legacy_unknown` projiziert.
- Nach bestaetigter realer Ausfuehrung besitzt jede neue Verkaufsaktion
  `eventType: sale_reconciled` und mindestens `pending_manual_posting` oder
  `confirmed_already_reflected`.
- Bei initialem `confirmed_already_reflected` speichert bereits der
  Verkaufsrecord bestaetigten Cashstand und Bestaetigungszeitpunkt; der
  Nettoerloes liegt in `actual.netProceeds` vor.
- `pending_manual_posting` bleibt in UI und Audit sichtbar unvollstaendig.
- Der Nutzer schliesst nach Aktualisierung der Rahmendaten append-only mit
  `cash_posting_confirmed`, eigener deterministischer `confirmationActionId`
  und Rueckverweis `targetActionId`; der Verkaufsrecord wird nicht mutiert.
- Jeder Abschlussrecord traegt `actionId === confirmationActionId`. Die ID ist
  direkt `cash-confirmation:v1:<normalizedTargetActionId>` und fuer
  unterschiedliche normalisierte Ziel-IDs injektiv. Der reservierte Prefix
  `cash-confirmation:` ist fuer neue Verkaufs-IDs verboten. Vor dem Append wird
  dennoch gegen **alle** vorhandenen `actionId` geprueft: eine Kollision mit
  einem Legacy-Verkaufsrecord oder einem anderen Ziel blockiert fail-closed.
- Die ID-Validierung ist eventtypspezifisch. `sale_reconciled.actionId` und
  `targetActionId` bleiben auf 128 Zeichen begrenzt. Nur
  `cash_posting_confirmed.actionId` und `confirmationActionId` duerfen wegen
  des 21 Zeichen langen Prefixes bis zu 149 Zeichen besitzen. Der Leser leitet
  zuerst den Eventtyp ab (`eventType` fehlt = Legacy-Verkauf) und wendet danach
  das passende Limit an; 129 Zeichen bei einem Verkauf beziehungsweise 150
  Zeichen bei einer Bestaetigung scheitern fail-closed.
- Die direkte Ableitung benoetigt weder Hash- noch Kryptoimplementierung und
  bleibt rein synchron. `crypto.subtle` und ein Import aus dem Simulator- oder
  Marktdatenbereich bleiben ausgeschlossen.
- Das Folgeereignis speichert den aus dem Verkauf centgleich uebernommenen
  Nettoerloes, den bestaetigten Cashstand und den Zeitpunkt. Wiederholung ist
  fachlich idempotent: Ein nur neu erzeugter Submit-Zeitstempel erzeugt keinen
  Konflikt, und der erste Nachweiszeitpunkt bleibt erhalten. Widerspruechlicher
  Betrag, Cashstand oder Zielbezug blockiert fail-closed.
- Ein falsch erfasster bestaetigter Cashstand wird niemals ueberschrieben,
  sondern durch `cash_posting_corrected` berichtigt. Der Record traegt
  `actionId === correctionActionId`, `targetActionId`, `correctsActionId`, eine
  lueckenlose `correctionRevision`, den unveraendert aus dem Verkauf kopierten
  `confirmedNetProceedsEur`, den korrigierten `cashBalanceAfterPostingEur`, einen
  zwingenden nichtleeren `correctionReason` und `correctedAt`.
- Die erste Korrektur verweist bei initialer Bestaetigung auf die Verkaufs-ID,
  sonst auf die `cash_posting_confirmed`-ID; jede weitere Korrektur muss exakt
  auf den aktuell wirksamen Nachweis verweisen. Nur die letzte lueckenlos
  verkettete Korrektur bestimmt den angezeigten Cashstand. Luecken, Forks,
  veraltete Rueckverweise und widerspruechliche Wiederholungen scheitern
  fail-closed; bestehende Records bleiben unveraendert.
- Die kanonische Korrektur-ID lautet
  `cash-correction:v1:<normalizedTargetActionId>:<revision>`. Revisionen sind
  kanonische Ganzzahlen von 1 bis 999999 ohne fuehrende Nullen. Damit bleiben
  Verkaufs-/Ziel-IDs bei maximal 128, Bestaetigungs-IDs bei 149 und
  Korrektur-IDs bei maximal 154 Zeichen. Die Prefixe `cash-confirmation:` und
  `cash-correction:` sind fuer neue Verkaufs-IDs reserviert; die globale
  Kollisionspruefung umfasst alle Eventtypen.
- Eine exakte Wiederholung desselben Korrekturrecords ist idempotent. Gleiche ID
  mit anderem fachlichem Payload, eine Korrektur ohne wirksame Bestaetigung oder
  Revision 1000000 blockiert. Der Dialog haelt Revision, kanonische Action-ID
  und Vorgaenger bis zum Submit stabil; ein inzwischen fortgeschriebener Verlauf
  scheitert vor der Nutzerbestaetigung. Der bisherige Cashstand fuer den finalen
  Dialog stammt aus dem beim Submit frisch gelesenen Verlauf.
- Cashstatus und Folgeereignis bleiben aus `comparableAction` ausgeschlossen,
  damit die bisherige Duplicate-/Conflict-Semantik des Verkaufs erhalten bleibt.
- Jede Verarbeitung der heterogenen `actions`-Historie filtert explizit nach
  `eventType`. Insbesondere darf `previewTrancheReconciliation` ein
  `cash_posting_confirmed`- oder `cash_posting_corrected`-Event niemals als
  Verkaufsduplikat behandeln.
- `legacy_unknown` gilt operativ als abgeschlossener Altfall und erzeugt keinen
  Rueckstand, bleibt aber sichtbar „Cashstatus nicht dokumentiert“ und darf
  nicht als Cash bestaetigt erscheinen; freiwillige Nachbestaetigung ist
  moeglich.
- Jeder Legacy-Verkaufsrecord muss weiterhin `schemaVersion: 1` tragen. Eine
  abweichende Recordversion wird nicht als Altfall akzeptiert.
- Ein unlesbarer Audit wird im Manager als unvollstaendige, blockierte Liste und
  niemals als leere Historie angezeigt. Balance, Simulator und Manager nennen
  `legacy_unknown`-Faelle in der Zusammenfassung; ein Legacy-only-Stand erhaelt
  keinen gruenen Cash-All-clear-Marker, bleibt aber ein neutraler Hinweis und
  oeffnet die Detailanzeige nicht zwangsweise.
- Die bestehende atomare Lot-/Registry-Persistenz und Recovery bleiben erhalten.
- Vor Erstnutzung wird unter `index.html` -> „Profile“ -> „Erweitert“ ->
  „Backup exportieren“ (`#fullBackupBtn`) ein Komplettbackup erstellt. Der
  bestehende Backupcontract umfasst `rs_profiles_v1` und kann diesen Registry-
  Record bytegleich wiederherstellen.
- Kein automatischer Broker- oder Bankabgleich und keine neue Buchhaltungs-
  datenbank werden eingefuehrt.

### Abnahme

- Kein realer Verkauf kann den Status „vollstaendig abgeschlossen“ tragen,
  solange sein Cashstatus offen ist.
- Wiederholte Bestätigung bucht oder schließt nichts doppelt.
- Ein synthetischer v1-Verlauf bleibt unveraendert lesbar; korrupte oder
  unbekannte Strukturen bleiben fail-closed.
- Vorschau und Abbruch bleiben schreibfrei.
- Browsertest prueft Verkauf, offenen Cashstatus, Nettoerloes/Cashstand im
  Dialog, append-only Abschluss, Korrektur, Reload, Legacy-Anzeige und
  idempotente Wiederholung.
- Ein Mixed-Event-Test schreibt und liest Verkaufs-, Abschluss- und
  Korrekturrecords neu, prueft die globale `actionId`-Eindeutigkeit und sichert,
  dass die Vorschau nur `sale_reconciled` als moegliches Verkaufsduplikat
  betrachtet.
- Grenztests belegen 128 Zeichen fuer Verkauf und Ziel, die daraus entstehende
  149-Zeichen-Bestaetigungs-ID sowie fail-closed Ablehnung bei 129
  beziehungsweise 150 Zeichen. Der Direktableitungspfad besitzt keine
  Hashhilfe, keinen Simulatorimport und keinen asynchronen Commitabschnitt.
- Korrekturtests belegen Erst- und Mehrfachkorrektur, letzte wirksame Revision,
  unveraenderte Alt-Events, Idempotenz, Pflichtgrund, lueckenlose Kette sowie
  fail-closed Forks, Luecken und veraltete Rueckverweise. Ein gueltiges
  128-Zeichen-Ziel erzeugt bei Revision 999999 eine 154-Zeichen-Korrektur-ID;
  Revision 1000000 ist ungueltig.

### Umsetzungsstand vom 2026-08-09

- Claudes zweites Code-Re-Review hat Slice 4 ohne Blocker freigegeben und
  S4-01 bis S4-07 einzeln bestaetigt.
- Das mittlere Darstellungsfinding S4-08 ist auf Nutzerentscheidung umgesetzt:
  Abgeschlossene Legacy-Verkaeufe bleiben neutral sichtbar, oeffnen Balance-
  und Simulator-Details aber nicht mehr alle fuenf Sekunden zwangsweise.
- Das niedrige Finding S4-09 ist bewusst nicht umgesetzt. Der seltene veraltete
  Korrekturdialog wird sicher vor Bestaetigung und Schreiben blockiert; offen
  bleibt nur eine technisch korrekte, aber weniger handlungsleitende Meldung.
  Wiederaufnahme erfolgt nur bei realer Fehlinterpretation im persoenlichen
  Betrieb.
- Nach der letzten Codeaenderung sind der fokussierte Test mit 40/40 Assertions,
  `npm test` mit 19.507/19.507 Assertions, 29/29 Browserworkflows und die
  Coverage-Pflichtgates bei 79,33 Prozent gruen. Der produktive Scope bleibt bei
  sieben Dateien; Engine, `dist` und EXE bleiben unberuehrt.
- Offen sind nur noch die finale Gemini-Scope-/Abnahmepruefung und der lokale
  Commit durch Gemini. Ein Push bleibt von einer ausdruecklichen
  Nutzerfreigabe abhaengig.

## 12. Bewusst nicht realisierte Punkte

Die folgende Tabelle ist eine verbindliche Nicht-Scope-Entscheidung. Diese
Punkte duerfen in Reviews als Restrisiko dokumentiert, aber nicht ohne neue
Nutzerentscheidung in den Scope der vier Slices gezogen werden.

| ID | Nicht realisierte Erweiterung | Warum sie fuer den Einzelnutzer nicht umgesetzt wird | Persoenliche Kompensation | Wiederaufnahme nur wenn |
| --- | --- | --- | --- | --- |
| NR-01 | vollständige Rentensteuer-, Einkommensteuer-, KV- und PV-Engine | hohe Rechts- und Jahreswartung; der Nutzer kann belastbare Nettozufluesse extern ermitteln | jaehrliche Brutto-/Netto-Checkliste und aktuelle Bescheide | manuelle Nettoermittlung wiederholt fehlschlaegt oder gesetzliche Pflege ohnehin beauftragt wird |
| NR-02 | Kirchensteuer- und Negativzins-Sonderfaelle vollstaendig automatisieren | Kirchensteuernaeherung ist konservativ; Negativzinsfall klein und selten; Fachreview waere erforderlich | Steuerergebnis extern plausibilisieren | konkrete Steuerwirkung materiell wird |
| NR-03 | automatische Broker-, Bank- und Rentenkontenanbindung | schafft externe APIs, Secrets und Wartungsrisiko; widerspricht Local-First-Einfachheit | jaehrlicher Broker-/Bank-/Bescheidabgleich | manueller Prozess nicht mehr verlaesslich ist |
| NR-04 | monatlicher automatischer Entnahme- und Rebalancingmotor | Jahressteuerung plus Ausgabencheck genuegen dem persoenlichen Ablauf; hohe neue Engine-Komplexitaet | unterjaehrige Sonderfaelle manuell behandeln | regelmaessige unterjaehrige Fehlentscheidungen auftreten |
| NR-05 | Immobilien, Kredite, Vermietung, Erbschaften, Schenkungen und freie Ereignisliste | großer Scope mit wenig Nutzen im aktuellen Kernportfolio | relevante Netto-Cashflows außerhalb der Suite planen und als Szenarioinput uebernehmen | die persoenliche Vermoegensstruktur dies erfordert |
| NR-06 | gespeicherte Gesamtplanvergleiche und unbegrenztes Szenariomanagement | getrennte Exporte/Backups und benannte Gegenlaeufe reichen fuer einen Nutzer | Planvarianten manuell benennen und exportieren | Variantenmenge nicht mehr beherrschbar ist |
| NR-07 | beliebige Fremdwaehrungen und breites Multi-Asset-Modell | dokumentierter EUR-/ETF-/Cash-/Gold-/Bond-Proxy-Scope ist bewusst eng | nur passende Instrumente modellieren | reales Portfolio den Scope verlaesst |
| NR-08 | vollständige TER-, Spread-, Slippage- und Produktkostenengine | genaue Instrumentkosten waeren daten- und produktspezifisch; hohe Pflege fuer kleine Einzelwerte | Renditeannahmen konservativ reduzieren, reale Gebuehren beim Reconcile erfassen | Kosten materiell oder stark variabel werden |
| NR-09 | externe wissenschaftliche Vollvalidierung und Zertifizierung | unverhaeltnismaessig fuer ein nicht veroeffentlichtes persoenliches Werkzeug | mehrere Seeds, Uniform/CAPE, Stress, Tail und konservative Annahmen; externe Beratung nur bei tragender Entscheidung | Suite veroeffentlicht oder als Beratungssystem eingesetzt wird |
| NR-10 | vollstaendige aktuarielle Pflege-/Mortalitaetskalibrierung | keine individuelle Prognose erreichbar; hohe Fachkosten | Pflegekosten breit stressen und Versicherungsansprueche separat pruefen | reale Pflegeplanung oder Versicherungsentscheidung ansteht |
| NR-11 | Einsteiger-Wizard, Mehrbenutzer-UX und allgemeines Produkt-Onboarding | einziger Nutzer kennt Arbeitsweise und Begriffe | persoenliche Checkliste und bestehendes Handbuch | weiterer Nutzer hinzukommt |
| NR-12 | formale WCAG-/Screenreader-Zertifizierung | kein externer Nutzerkreis; aktuell kein dokumentierter persoenlicher Bedarf | bestehende Tastatur-/Labelhilfen | eigener Bedienbedarf oder weiterer Nutzer dies erfordert |
| NR-13 | Cloud, Mehrbenutzer-, Rollen- und Beraterbetrieb | nicht vorgesehen; wuerde Datenschutz- und Sicherheitsmodell grundlegend aendern | lokale Einzelgeraetenutzung | Produktzweck geaendert wird |
| NR-14 | Verschluesselungs-, CSP- und Security-Komplettprogramm | lokales Einzelgeraet und keine Verteilung; Aufwand steht derzeit nicht zum Nutzen | Betriebssystemschutz, keine fremden Browsererweiterungen, sichere Backups | Geraet geteilt, Daten ausgelagert oder App verteilt wird |
| NR-15 | projektweite strikte Typisierung, Lint-/Formatter-Migration und Großrefactoring | sehr hoher Token- und Regressionsaufwand ohne direkten persoenlichen Entscheidungsnutzen | bestehende Tests; neue Contracttests nur fuer beruehrte Pfade | Wartung durch weitere Entwickler oder deutlich steigende Fehlerquote |
| NR-16 | vollstaendige CI/CD-, Signierungs- und Distributionspipeline | keine externe Auslieferung; manueller Releasepfad genuegt | bestehende lokale Gates und Provenienz | regelmaessige oder externe Releases erforderlich werden |
| NR-17 | allgemeine Repository-Hygieneaktion | versionierte EXE/Abhaengigkeitsartefakte sind unschoen, aber kein aktueller Rechenfehler; Historienbereinigung waere riskant | keine neuen Artefakte einchecken | Clone-/Speicher-/Buildprobleme entstehen |
| NR-18 | allgemeine Dokumentations-, Changelog- und Versionsbereinigung | begrenzter Nutzen fuer einen bekannten Nutzer; keine funktionale Korrektur | Referenzdokumente nur fuer die vier Slices synchronisieren | aktueller Stand nicht mehr auffindbar ist |
| NR-19 | Gold-, Runway-, Pflege- und weitere Modellkomfort-Erweiterungen außerhalb der vier Contracts | offene Modellgrenzen sind bekannt; weitere Automatisierung wuerde die Abschlussrunde ausweiten | Startallokation und Gegenlaeufe manuell pruefen | dokumentierte manuelle Kontrolle scheitert |
| NR-20 | CAPE-Inaktivhinweis in der UI | Bei deaktiviertem CAPE-Sampling und deaktiviertem VPW ist die Nichtwirkung erwartetes Verhalten; ein neuer Zustandsindikator ist fuer die vier Korrekturvertraege nicht erforderlich | vor jedem MC-Lauf CAPE-Sampling-/VPW-Schalter bewusst pruefen und Run-Konfiguration im Export kontrollieren | die Schalterstellung im realen Ablauf wiederholt fehlinterpretiert wird |

## 13. Test- und Nachweisstrategie

### Pflichtgates je Slice

- fokussierte Tests der geaenderten Contracts;
- `npm test` vollstaendig;
- `npm run test:browser`, wenn sichtbare UI oder Persistenz betroffen ist;
- `npm run build:engine`, wenn `engine/` oder die oeffentliche EngineAPI
  betroffen ist;
- relevante Worker-/Main-Thread-Paritaet bei MC-Vertragsaenderungen;
- fail-closed Registrierung jedes neuen MC-Buffers im Chunk-Result-Vertrag;
- JSON-/CSV-Paritaet fuer `ScenarioLogExportV2`, einschliesslich stabiler
  Vereinigungsheader und typisierter Terminalrecords;
- materialisierter ScenarioLog-Grenztest am oberen gueltigen Laufzeithorizont;
- V2-Golden- und UI-Copy-Tests fuer Basis, Schwelle, Vergleichsoperator und
  reine Berichtsrolle der 4,5-Prozent-Kennzahl; exakt 4,5 Prozent muss im
  strikt-`>`-KPI und in der bin-basierten `>=`-Heatmap unterschiedlich, aber
  vertragstreu behandelt werden;
- konjunktive Null-Flex-Wahrheitsmatrix fuer Slice 3: `bear_deep` ja/nein
  gekreuzt mit realem aktivem Gesamtvermoegensdrawdown bei 24,99, exakt 25,00
  und 25,01 Prozent sowie jeweils `wealthFactor` 0/1 und Alarm aktiv/inaktiv;
  nur `bear_deep` plus 25,01 Prozent aktiviert den harten Null-Flex-Cap,
  Entnahmebelastung und Alarmstatus veraendern das Ergebnis nicht;
- Zwei-Jahres-Regression fuer Slice 3: Eine durch Null-Flex gesunkene
  Vorjahresentnahme darf das Gate bei fortbestehendem `bear_deep` und Drawdown
  oberhalb der Schwelle nicht selbst deaktivieren; erst eine der beiden
  fachlichen Gatebedingungen beendet es;
- Floor-Invariante fuer Slice 3: Ein finanzierbarer Netto-Floor bleibt auch bei
  Null-Flex centgenau erhalten; fehlende Finanzierbarkeit endet explizit als
  vorhandenes `ruin`-Jahresresultat mit `ruinDetails` und nie als scheinbar
  erfolgreicher kleinerer Floor. `BREAK_ON_RUIN = true` in den normalen Pfaden
  sowie der optionale historische Diagnosemodus bleiben unveraendert;
- Mixed-Event-, Korrekturketten-, Grenzlaengen- und Reloadtests fuer direkte
  injektive Cash-IDs mit 128-Zeichen-Verkaufs-/Ziellimit,
  149-Zeichen-Bestaetigungs- und 154-Zeichen-Korrekturlimit;
- `npm run docs:evidence`, wenn Evidenz-/Referenzregister beruehrt werden;
- `git diff --check`.

### Delta-Regel fuer Slice 3

Slice 3 veraendert bewusst Engine-Semantik. Vorher-/Nachher-Ergebnisse muessen
fuer feste Seeds und definierte Crashfaelle getrennt werden in:

- erwartete Aenderung durch den normalen Safety-Cap oder das konjunktive
  Null-Flex-Notfallgate;
- unveraenderte Ergebnisse ohne wirksames Alarm-/Guardrail-Safety-Signal und
  ohne erfuellte Null-Flex-Konjunktion;
- erhaltene Mindest-Flex-Untergrenze bei lokalem `bear_deep` ohne mehr als
  25 Prozent realen Gesamtvermoegensdrawdown;
- unveraenderter Floor in allen finanzierbaren Faellen;
- unerwartete Nebenwirkung.

Eine unerwartete Abweichung bei Steuer, Floor, Runway, Portfoliofluss,
Worker-Paritaet oder nicht betroffenen Szenarien blockiert die Abnahme.

## 14. Globale Stop- und Eskalationsregeln

Zusaetzlich zu `AGENTS.md` und `SLICE_EXECUTION_RULES.md` gilt:

- Mehr als zehn zu aendernde produktive Programm-/Konfigurationsdateien in
  einem Slice: stoppen und Slice teilen beziehungsweise Nutzer fragen.
  Testdateien, Testfixtures und reine Dokumentation sind gemaess `AGENTS.md`
  ausgenommen; das generierte, versionierte `engine.js` zaehlt in Slice 3 als
  vorab deklarierte Programmdatei.
- Stille Aenderung eines V1-Exportvertrags: verboten; versionieren.
- Eng begrenzte Ausnahme fuer die lokale Reconcile-Historie: `schemaVersion: 1`
  darf nur additiv um optionale Felder und neue `eventType`-Records erweitert
  werden, wenn bestehende Felder weder entfernt noch semantisch umgedeutet
  werden, valide Altverlaeufe ohne Rewrite lesbar bleiben, unbekannte oder
  korrupte Events fail-closed bleiben und ein Mixed-Event-Recoverytest besteht.
  Diese Ausnahme gilt nicht fuer Exportartefakte.
- Unklare Ratio-/Prozent- oder Brutto-/Netto-Einheit: stoppen.
- Null-Flex bei einem anderen als dem strikt konjunktiven Zustand aus aktuellem
  `bear_deep` und mehr als 25 Prozent realem aktivem
  Gesamtvermoegensdrawdown: stoppen.
- Kopplung des Null-Flex-Gates an `wealthFactor`, `wealthSufficient`,
  `alarmStatus.active` oder eine andere nicht von NE-03 bestimmte dritte
  Bedingung: stoppen.
- Fehlender oder nicht endlicher Wert im Null-Flex-Gate sowie jede stille
  Reduktion des Floor oder ein Erfolgsstatus trotz Floor-Unterdeckung: stoppen.
- Aenderung an `BREAK_ON_RUIN`, am bestehenden `ruin`-Jahresvertrag oder an den
  Floor-Shortfall-Metriken im Rahmen von Slice 3: stoppen und separat planen.
- Unerwartete Backtest-, Snapshot-, Worker- oder FlowDelta-Abweichung: stoppen.
- Automatische Cashbuchung ohne Schutz gegen Doppelzaehlung: stoppen.
- Guardrail-Aenderung ohne explizite Vorher-/Nachher-Orakel: stoppen.
- Tests nicht ausfuehrbar und keine gleichwertige Ersatzvalidierung: stoppen.
- Fremdaenderungen aus dem aktuellen Arbeitsbaum duerfen nicht in einen
  Slice-Commit geraten.
- Bei Dateien, die mehrere Slices teilen, ist ein dateiweises Wiederherstellen
  verboten. Ein Rollback erfolgt ueber den exakten Slice-Commit (`git revert`)
  oder nach dokumentierter Diff-Pruefung auf Hunk-Ebene.

## 15. Review-, Commit- und Pushprozess

1. Claudes fuenf Reviewrunden C-P-01 bis C-P-31 sowie C-14/C-15 und Geminis
   Erstrunde G-P-01 bis G-P-07 bleiben unveraendert als Reviewnachweis erhalten;
   Entwurf v8 dokumentiert die Antworten und Nutzerentscheidung NE-03.
2. Claude und Gemini re-reviewen den vollstaendigen korrigierten Entwurf v8
   adversarial und dokumentieren verbleibende Findings unten.
3. Codex beantwortet und korrigiert neue sachlich begruendete Findings.
4. Nutzerentscheidung NE-03 schliesst das fruehere Mindest-Flex-Freigabegate.
   Nach geloesten Findings und bestaetigtem konjunktivem Contract wird der Plan
   auf `implementierungsreif` gesetzt.
5. Codex legt beziehungsweise aktiviert den Feature-Branch und vervollstaendigt
   vor jedem Slice dessen Branch-/Status- und Diff-Risiko-Block.
6. Codex implementiert genau einen Slice und dokumentiert Ergebnisse.
7. Gemini und Nutzer reviewen den Slice.
8. Nach positiver Freigabe erstellt Gemini den lokalen Commit.
9. Push erfolgt nur nach ausdruecklicher Nutzerfreigabe.

## 16. Plan-Pre-Mortem

**Angenommen, diese Abschlussrunde verursacht in drei Monaten einen Fehler –
was ist die wahrscheinlichste Ursache?**

Am wahrscheinlichsten wird der Scope trotz der Einzelnutzerentscheidung wieder
ausgeweitet: Slice 1 zieht alle MC-Metriken in einen neuen Vertrag, Slice 2 wird
zum UI-Redesign, Slice 3 veraendert mehrere Entnahmepolicies gleichzeitig und
Slice 4 fuehrt unbemerkt eine zweite Cashbuchhaltung ein. Die Testmenge bleibt
gruen, aber Ursache und Wirkung sind nicht mehr einem Slice zuordenbar.

Das fachlich gefaehrlichste Einzelversagen waere in Slice 3 ein versehentliches
`ODER` statt der festgelegten Konjunktion: Dann koennte schon ein lokal extremer
Baerenmarkt den gesamten Flex streichen. Ebenso unzulaessig waere, den Floor beim
Null-Flex-Pfad still mitzukuerzen oder eine Floor-Unterdeckung als Erfolg
auszugeben.

Ein subtiler Gegenfehler waere, `wealthFactor` als vermeintliche dritte
Vermoegensbedingung einzubauen. Weil der Faktor primaer auf der realen
Vorjahresentnahme beruht, koennte Null-Flex dadurch im Folgejahr sein eigenes
Gate abschalten und bei anhaltender Krise ein schwer erklaerbares Pendeln
zwischen null und hoeherem Flex erzeugen.

Gegenmaßnahmen:

- vier feste Slices ohne Zusatzpakete;
- maximal zehn Programmdateien je Slice;
- keine allgemeine Aufraeumarbeit im selben Diff;
- fachliche Vorher-/Nachher-Orakel fuer Slice 3;
- konjunktive Grenzwertmatrix gegen ein versehentliches `ODER` im Null-Flex-Gate
  einschliesslich `wealthFactor === 0`, Zwei-Jahres-Persistenztest und
  centgenaue Floor-Invariante;
- keine automatische Cashmutation in Slice 4;
- jede Scope-Erweiterung benoetigt eine neue ausdrueckliche Nutzerentscheidung.

## 17. Abschlussdefinition

Der Plan ist abgeschlossen, wenn:

- alle vier Slices reviewt, freigegeben und lokal committet sind;
- die temporaeren Einschraenkungen aus Abschnitt 4.1 aufgehoben wurden und die
  dauerhaften Kontrollpflichten aus Abschnitt 4.2 als bleibende
  Handbuchhinweise verankert sind;
- Referenzdokumentation und offene Entscheidungsregister den neuen Ist-Contract
  wiedergeben;
- keine roten Tests oder unbeantworteten Review-Blocker bestehen;
- der Status dieses Plans auf `abgeschlossen – persoenlicher Wartungsmodus`
  gesetzt wurde.

## Review-Feedback von Gemini

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Adversariale Planprüfung von Gemini (Antigravity) für den Arbeitsplan Entwurf v5 und die vier Slice-Spezifikationen.

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:** Der Plan setzt richtigerweise fest, dass die Anwendung ein persönliches Werkzeug für genau einen Nutzer bleibt. In Slice 3 fehlt jedoch noch die verbindliche Nutzerentscheidung darüber, dass der Safety-Cap von 12.144,29 € im Crashjahr den deklarierten Haushalts-Mindest-Flex von 30.000 € übersteuern darf. Ohne diese explizite Freigabe wird eine wesentliche Lebenshaltungsentscheidung vorweggenommen.
- **Vertragstreue:** In Slice 4 erzwingt das Folgeereignis `cash_posting_confirmed` mit der abgeleiteten ID `cash-confirmation:v1:<normalizedTargetActionId>` ein striktes Append-Only. Bei fälschlicher Ersterfassung (z. B. Tippfehler im Cashstand) führt die Idempotenz-/Fail-Closed-Regel jedoch dazu, dass der Fehler im Tranchenmanager nie wieder korrigiert werden kann.
- **Fehlerbehandlung:** In Slice 2 verlangt das Rundungsorakel für Drawdowns „nur größer oder gleich Betrag des Verlusts“. Bei negativen Prozentwerten (z. B. `-34,25 %`) würde ein naive-mathematisches Aufrunden (`Math.ceil`) zu `-34,0 %` führen (optimistischer Fehler). Es muss strikt auf den Betrag des Verlustes angewendet werden.
- **Seiteneffekte:** In Slice 1 sind genau 10 produktive Dateien geplant. Bei null Dateireserve führt jede unerwartete Schnittstellenanpassung in Konsumentendateien (z. B. `simulator-main-helpers.js`) zum sofortigen Greifen der Stop-Regel.
- **Was könnte brechen?** In Slice 3 verringert sich die Entnahme in Jahr 1 um über 41.000 €. Dadurch startet Jahr 2 mit einem deutlich höheren Depotstand, was alle Folgejahre im Re-Run pfadabhängig verändert. Backtest-Snapshots ab Jahr 2 werden massiv abweichen.

### 2. Findings

#### G-P-01 (Blocker) – Ausstehende Nutzerentscheidung zu Slice 3 (Mindest-Flex-Übersteuerung)
Vor dem Start von Slice 3 muss der Nutzer explizit bestätigen, dass im dokumentierten Crashjahr (Jahr 1) der wirksame Haushalts-Flex auf maximal 12.144,29 € sinken darf und damit den deklarierten Mindest-Flex von 30.000 € übersteuert. „Safety vor Komfort“ allein ersetzt nicht die Bestätigung dieser konkreten Lebenshaltungskonsequenz.

#### G-P-02 (Blocker) – Unkorrigierbarkeit bei Erfassungsfehlern in Slice 4
Slice 4 ist strikt append-only und weist abweichende Beträge/Zielbezüge bei identischer Bestätigungs-ID als Konflikt (fail-closed) ab. Gibt der Nutzer versehentlich einen falschen Cashstand (`cashBalanceAfterPostingEur`) ein, ist dieser Eintrag unkorrigierbar im Tranchenmanager gefangen. Der Plan muss einen definierten Storno-/Korrekturpfad (oder ein Folge-Stornoereignis) festlegen.

#### G-P-03 (Blocker) – Betragsrundung bei negativen Kennzahlen (Drawdown-Rundungsfalle)
Für Drawdowns verlangt Slice 2 eine Rundung „nur größer oder gleich Betrag des Verlusts“. Das Rundungsorakel muss zwingend festlegen, dass sich die Richtung auf den *absoluten Betrag* (`|-34,25 %|` -> `34,3 %` -> `-34,3 %`) bezieht. Ein direktes Aufrunden der negativen Zahl würde `-34,0 %` liefern und den Verlust falsch-optimistisch verkleinern.

#### G-P-04 (hoch) – Arbeitsbaum-Unreinheit vor Branch-Erstellung
Der Plan setzt den HEAD `27b9264` voraus, im Arbeitsbaum befinden sich jedoch bereits modifizierte und ungesicherte Dokumentations- und Testdateien. Vor Erstellung des Feature-Branches `codex/fokussierte-abschlusshaertung` muss der Arbeitsbaum entweder committet oder die Baseline sauber getrennt werden.

#### G-P-05 (hoch) – Streaming- & Speicher-Invariante bei CSV-Header in Slice 1
Slice 1 definiert den CSV-Header des Szenario-Logs als Vereinigungsmenge aller Schlüssel *aller* Records. Dies verhindert Streaming-Generierung und erzwingt das vollständige Halten aller Zeilen im Speicher vor der ersten Ausgabegenerierung. Dies ist als Speicher- und Performance-Bedingung festzuhalten.

#### G-P-06 (mittel) – Layout- & Text-Overflows durch Centgenauigkeit
Slice 2 verpflichtet zur centgenauen EUR-Anzeige auf primären Ergebniskarten. Dies birgt bei mehrstelligen Beträgen ein erhöhtes Risiko für Zeilenumbrüche und Layout-Brechungen in den UI-Kacheln der Simulator-Matrix, was in den Browsertests gesichert werden muss.

#### G-P-07 (mittel) – 149-Zeichen-Grenzfall-Blockade bei derivierten IDs in Slice 4
Die Bestätigungs-ID `cash-confirmation:v1:<normalizedTargetActionId>` darf maximal 149 Zeichen lang sein. Erreicht eine Verkaufs-ID durch Normalisierung 129 Zeichen, scheitert der Append fail-closed mit 150 Zeichen. Der Leser muss Grenzfälle verlässlich und verständlich melden.

### 3. Pre-Mortem

**Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Der Nutzer erfasst nach einem realen ETF-Verkauf im Tranchenmanager eine Cash-Bestätigung mit einem Tippfehler im Betrag. Da Slice 4 Append-Only ohne Stornoereignis erzwingt, gerät die App in eine unauflösbare Konflikt-Sackgasse (Fail-Closed). Gleichzeitig löst im Simulator ein Bärenjahr den Safety-Cap aus Slice 3 aus, welcher die Entnahme unter den Haushalts-Grundbedarf drückt, wodurch die Simulation zwar „mathematisch depot-sicher“, aber für die reale Lebenshaltungsplanung unbrauchbar wird.

### 4. Review-Ergebnis

- **Status:** **blockiert** (Plan ist noch nicht `implementierungsreif`)
- **Blocker:** G-P-01, G-P-02, G-P-03
- **Restrisiken:** G-P-04 bis G-P-07; Modellrisiken R1, R2, R8 verbleiben als dauerhafte Kontrollpflichten.

**Historienhinweis:** Claudes nachfolgende Reviewrunden eins bis vier beziehen
sich auf fruehere Entwurfsstaende bis v5; die fuenfte Runde prueft ausdruecklich
Entwurf v7. Alle bleiben als Reviewnachweis unveraendert erhalten, sind aber
keine Freigabe des korrigierten Entwurfs v8.

## Review-Feedback von Claude

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Geprüft wurden dieser Plan,
die vier Slice-MDs sowie der referenzierte Quellcode
(`engine/planners/`, `app/simulator/`, `app/tranches/`).

### 1. Prüfdimensionen

**Korrektheit vs. Akzeptanzkriterien.** Die sechs Priorität-A-Punkte aus
`MC_LAUF_ANALYSE_2026-08-04` (F1–F4, C1, F8) sind vollständig auf Slice 1 und 2
abgebildet. Zwei Befunde derselben Analyse fehlen jedoch in jedem Slice **und**
in der NR-Tabelle: die Namenskollision `minimumFlexEffectiveFinal` (Abschnitt
9.3 R5, dort ausdrücklich als „weiterer Export-Semantikfehler" bezeichnet) und
das leere `observationCount: {}`. Siehe C-P-06 und C-P-13.

**Vertragstreue.** Drei bestehende Contracts werden von den Slices berührt,
ohne dass der Plan ihre Bruchstellen benennt: der fail-closed Versionscheck in
`app/simulator/monte-carlo-export.js:191`, der fail-closed Chunk-Result-Vertrag
(unregistrierte Buffer werden abgewiesen) und die fail-closed Historienprüfung
in `app/tranches/tranche-reconciliation.js:161`. Siehe C-P-03, C-P-02, C-P-04.

**Fehlerbehandlung.** Der kritischste ungeprüfte Pfad ist das Laden einer
bestehenden, real befüllten Reconcile-Historie nach einer Schemaänderung
(C-P-04). Der Plan enthält keine Migrations- oder Lesbarkeitsgarantie für
persistierte Nutzerdaten.

**Seiteneffekte.** Die Dateilisten aller vier Slices sind unvollständig; bei
Slice 1 und 3 wird die Zehn-Dateien-Stopregel nach realistischer Zählung
gerissen (C-P-03, C-P-09). Damit greift die Stopregel erst mitten in der
Umsetzung – genau der Zustand, den Abschnitt 14 verhindern soll.

**Was könnte brechen?** Slice 3 kann vollständig grün abgenommen werden, ohne
den dokumentierten Schadensfall zu beheben (C-P-01). Slice 4 kann die real
vorhandene Verkaufshistorie unlesbar machen (C-P-04).

### 2. Findings

#### C-P-01 (Blocker) – Slice-3-Contract beschreibt einen Zustand, den der Code nicht kennt

`engine/planners/spending-policy-pipeline.mjs:36-46` ruft `applyGuardrails`
**ausschließlich** unter `if (!alarmStatus.active)` auf. Alarm und Guardrail
schließen sich damit gegenseitig aus. Die Formulierung „die nach Alarm und
Guardrail bestimmte Flexgrenze" (Plan Abschnitt 10, Slice 3 Ziel) beschreibt
keinen erreichbaren Programmzustand.

Verschärfend: Die Analyse datiert den Schadensfall auf **Worst-Case Jahr 1**
und den durchgängigen Alarmzustand erst **ab Jahr 2** (Abschnitt 5,
Zusammenfassung). Ist das korrekt, lag Jahr 1 im **Nicht-Alarm-Pfad** – und
genau für diesen bestimmt der Plan: „Außerhalb eines aktiven Alarmzustands
bleibt das heutige Verhalten erhalten." Der Slice würde den einzigen
dokumentierten Schadensfall nicht berühren.

Erforderlich vor Implementierungsfreigabe:
1. Alarmzustand des Worst-Case-Jahres 1 aus dem Szenario-Log belegen
   (`alarmActive`/`kuerzungQuelle` des Jahresrecords).
2. Den Safety-Cap fachlich neu fassen als „stärkste im Jahr ermittelte
   Sicherheitskürzung aus Alarm **oder** Guardrail", nicht als Konjunktion.

#### C-P-02 (Blocker) – Slice 2 ändert den in Slice 1 gerade eingefrorenen V2-Vertrag

Der reale MC-Drawdown (C1) existiert heute nur als Jahresfeld
`safety_real_drawdown_pct` (`simulator-year-result.js:328`). Als MC-Aggregat
erfordert er einen neuen Run-Buffer analog `maxDrawdowns`
(`monte-carlo-runner.js:950`, `monte-carlo-chunk-result.js:123`,
`monte-carlo-aggregates.js:401`, Projektion in
`monte-carlo-contracts.js:377`) plus Worker-Parität. Das ist keine
Anzeigeänderung, sondern eine KPI-Erweiterung des Ergebnisvertrags.

Folge: `MonteCarloRunResultV2` wird in Slice 1 versioniert und in Slice 2
erneut erweitert. Zwei Exportgenerationen tragen dann dasselbe Label V2.
Empfehlung: reale Drawdown-KPI in Slice 1 aufnehmen (Vertrag einmal
schneiden), Slice 2 auf Darstellung und Benennung begrenzen. Alternativ V2
erst nach Slice 2 einfrieren und Slice 1 als `V2-draft` kennzeichnen.

#### C-P-03 (Blocker) – Dateilisten unvollständig, Stopregel greift zu spät

Slice 1 nennt sieben Dateien. Tatsächlich zwingend berührt sind zusätzlich:

| Datei | Grund |
| --- | --- |
| `app/simulator/monte-carlo-export.js` | definiert `MONTE_CARLO_EXPORT_VERSION` und wirft bei jeder abweichenden Version (`:191`); der geforderte V1-Leser liegt hier |
| `app/simulator/monte-carlo-runner-utils.js` | `MC_HEATMAP_BINS` (`:3`) und `createMonteCarloBuffers` |
| `app/simulator/auto-optimize-worker.js` | eigenständiger Konsument von `MC_HEATMAP_BINS` (`:13, :69`) |
| `app/simulator/simulator-results.js` | Konsument `NominalReturnEquityPct` (`:416`) |
| `app/simulator/simulator-main-helpers.js` | Konsument `NominalReturnEquityPct` (`:430`) |
| `app/simulator/historical-backtest-runner.js` | setzt `NominalReturnEquityPct` (`:608`) |
| `app/simulator/mc-stress-tracker.js`, `simulator-engine-direct.js` | Konsumenten `entnahmequote` (F3) |

Damit stehen realistisch 13 bis 15 Programmdateien gegen ein Limit von zehn.
Die Stopregel würde erst nach begonnener Umsetzung auslösen. Entweder Slice 1
vorab in 1a (Heatmap/Einheiten) und 1b (Quoten/Missingness/Terminalrecord)
teilen oder das Limit für Slice 1 begründet anheben. Zusätzlich ist zu
klären, ob Testdateien unter „Programm-/Konfigurationsdateien" fallen; die
Regel in Abschnitt 14 lässt das offen.

#### C-P-04 (Blocker) – Slice 4 kann die reale Verkaufshistorie unlesbar machen

`readReconciliationHistory` (`app/tranches/tranche-reconciliation.js:156-164`)
scheitert fail-closed, sobald `history.schemaVersion !==
TRANCHE_RECONCILIATION_SCHEMA_VERSION` (heute `1`). Eine Anhebung auf `2` zur
Aufnahme des Cashstatus lässt jede bereits gespeicherte Historie mit
`RECONCILIATION_HISTORY_INVALID` („Der Reconcile-Verlauf ist beschädigt oder
nicht unterstützt") fehlschlagen. Für den Einzelnutzer bedeutet das den
Verlust des Zugriffs auf die reale Verkaufsdokumentation.

Der Plan formuliert dazu nur „Altaktionen erhalten einen expliziten
Legacy-/Unknown-Status" – ohne Migrationsschritt, ohne Lesepfad für v1 und
ohne Akzeptanzkriterium. Erforderlich: explizites AK „bestehende v1-Historie
bleibt nach dem Update lesbar und wird verlustfrei nach v2 migriert", plus ein
Recoverytest mit einer echten v1-Fixture und ein Backup-Schritt vor der
ersten Migration im Produktivprofil.

#### C-P-05 (hoch) – Abschlussmechanik in Slice 4 ist vertraglich unentschieden

Der heutige Vertrag ist append-only und weist eine bereits bekannte `actionId`
zurück (`:334-335`); `sameExecution` (`:195`) vergleicht nur
Ausführungsdaten. „Explizit und idempotent schließen" ist damit auf zwei
unvereinbare Arten realisierbar: als **Mutation** des bestehenden
Auditrecords (bricht die Append-only-Eigenschaft) oder als **zweites
Ereignis** `cash_posting_confirmed` mit eigener ID und Rückverweis. Der Plan
entscheidet das nicht, überlässt die Vertragsfrage also der Implementierung.
Diese Entscheidung gehört vor den ersten Code-Edit.

#### C-P-06 (hoch) – Bekannter Export-Semantikfehler ohne Slice und ohne NR-Zeile

Die Analyse dokumentiert in 9.3 (R5) zwei gleichnamige Messungen
`minimumFlexEffectiveFinal` mit unterschiedlicher Bedeutung – geplanter
Haushalts-Flex versus kanonische Erfüllungsmessung nach Auszahlung. Das
erfüllt die Auswahlregel aus Abschnitt 2.3 vollständig (falsche Information
mit direkter Entscheidungswirkung, klar contractfähig, kleiner Fix). Der Punkt
ist weder einem Slice zugeordnet noch als NR-Zeile bewusst abgelehnt. Er ist
in Slice 1 aufzunehmen oder mit Begründung in Abschnitt 12 zu übernehmen.

#### C-P-07 (mittel) – Aufhebung der Nutzungseinschränkung wäre nach Slice 3 zu weit

Abschnitt 4 verbietet, „`Guardrail` im aktuellen Stand als harte
Auszahlungsobergrenze zu interpretieren". Slice 3 stellt diese Härte
ausschließlich für den aktiven Alarmzustand her. Außerhalb des Alarms dürfen
Mindest-Flex und Glättung eine Guardrail-Kürzung weiterhin anheben.
Abschnitt 17 sieht vor, die Einschränkungen nach Abschluss aufzuheben oder in
Handbuchhinweise zu überführen. Ohne Präzisierung entsteht hier eine
dauerhafte Fehlinformation. Die Einschränkung muss zustandsbezogen
umformuliert und als bleibender Handbuchhinweis erhalten bleiben.

#### C-P-08 (mittel) – „D-11" ist im Repository dreifach belegt

Der Bezeichner existiert in drei Registern mit unterschiedlicher Bedeutung:
Mindest-Flex-Widerspruch (`BACKTEST_2000_2025_DATENPRUEFUNG.md:79`),
Snapshotpolicy (`SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md:189`) und konstante
Alarmstärke (`SLICE_SUITE_DATA_15_MODEL_TRANSPARENCY.md:247`, dort als ENG-07
geführt). Gemeint ist offenkundig das dritte. Der Befund ist verifiziert:
`engine/planners/flex-rate-policy.mjs:68` berechnet
`Math.min(10, Math.round(10 + 20 * shortfallRatio))`; da `shortfallRatio >= 0`
erzwungen wird, ist das Ergebnis konstant `10`. Plan und Slice 3 müssen das
Quellregister nennen, sonst greift ein späterer Implementierer den falschen
D-11 auf.

#### C-P-09 (mittel) – Blast-Radius von Slice 3 unterschätzt

`minimumFlex` wird in den Tests 273-mal referenziert, verteilt über mehr als
20 Testdateien, darunter `balance-diagnosis-copy-contract`,
`auto-optimize-fidelity`, `historical-backtest-*`, `monte-carlo-*` und
`browser-smoke`. Der Safety-Cap erzeugt zwangsläufig einen neuen
`minimumFlexStatus` (analog `limited_by_flex_budget`,
`applied_limited_by_final_smoothing` in
`spending-policy-pipeline.mjs:71, :103`), der in Diagnose- und
Textverträgen registriert werden muss. Die Slice-3-Liste „Gefährdete
bestehende Tests" nennt sechs Einträge und ist damit deutlich zu eng.

#### C-P-10 (mittel) – Erwartete Wirkung von Slice 3 ist auf ein Jahr konzentriert

Im Alarm-Folgejahr gilt `geglätteteFlexRate = Math.max(35, state.flexRate)`
(`flex-rate-policy.mjs:85`) – es findet **kein** weiterer Cut statt; zudem
wirkt ein harter 35-Prozent-Floor. Ein Safety-Cap begrenzt in diesen Jahren
also nur noch das Anheben durch Glättung. Der Delta-Nachweis nach Abschnitt 13
muss diese Erwartung **vorab** festhalten, sonst wird ein nahezu unverändertes
Backtest-Ergebnis fälschlich als Beleg für „keine Nebenwirkung" gelesen,
obwohl es ebenso „Fix wirkungslos" bedeuten kann. Das Verhältnis des Caps zum
35-Prozent-Floor ist ebenfalls festzulegen.

#### C-P-11 (mittel) – Rundungsrichtung ist nicht pro Kennzahl definiert

Finding F5 zeigt beide Fehlerrichtungen: Aufrundung überzeichnet die
Konsummöglichkeit (13.331,39 → 15.000), Abrundung untertreibt Kosten
(Steuermedian 335.938,20 → 325.000). Der Plan adressiert nur „Downside-Werte
nicht aufrunden" und definiert weder den Begriff noch die Behandlung von
Kosten- und Belastungskennzahlen. Erforderlich ist eine Tabelle
KPI → konservative Richtung → Anzeigegenauigkeit als Testorakel.

#### C-P-12 (mittel) – Testorakel von Slice 2 ist schwach und nicht reproduzierbar

Das Kriterium „13.331,39 EUR kann nicht mehr ausschließlich als 15.000 EUR
erscheinen" wird bereits durch einen Tooltip erfüllt, während der reale Fehler
beim Lesen der Ergebniskarte entstand. Zudem stammt der Wert aus einem
personenbezogenen Lauf; Slice 3 verbietet solche Fixtures ausdrücklich,
Slice 2 schweigt dazu. Erforderlich: synthetisches Fixture plus ein
regelbasierter Test („angezeigter Wert ist nie größer als der Messwert").

#### C-P-13 (niedrig) – Zwei Teilbefunde in Slice 1 nicht als AK geführt

`observationCount: {}` (nicht serialisierte Map, Analyse F4 Nebenbefund) und
das Verhältnis zwölf Bin-Einträge zu elf `countsByPlanYear`-Werten (F1
Zusatzbefund) sind in den Akzeptanzkriterien nicht explizit genannt. Beide
sind maschinell auswertungsrelevant und gehören als prüfbare AK aufgenommen.

#### C-P-14 (niedrig) – Bewusst akzeptierte Steuerabweichungen fehlen in Abschnitt 4

NR-02 akzeptiert F10 (Kirchensteuerformel, konservativ) und F7
(Negativzins-Steuergutschrift, antikonservativ) dauerhaft. Abschnitt 4 nennt
sie nicht. Da die Suite Steuerbeträge ausweist, die der Nutzer gegen reale
Bescheide hält, gehört diese bekannte Abweichung in die bleibenden
Handbuchhinweise nach Abschnitt 17.

#### C-P-15 (niedrig, Prozess) – generiertes `engine.js` versus Commit-Sicherheitsprüfung

`engine.js` ist versioniert und wird von `npm run build:engine` erzeugt.
Die Commit-Regel aus `SLICE_EXECUTION_RULES.md` blockiert bei „unerwarteten
Dateien". Slice 3 muss `engine.js` vorab als erwartetes Build-Artefakt
deklarieren, sonst blockiert die eigene Sicherheitsprüfung die Abnahme.

### 3. Pre-Mortem

**Angenommen, diese Abschlussrunde verursacht in drei Monaten einen Fehler –
was ist die wahrscheinlichste Ursache?**

Slice 3 ist umgesetzt, alle Gates sind grün, das Backtest-Delta ist nahezu
null – und der nächste reale Crash-Lauf zeigt erneut eine Auszahlung weit
oberhalb des Guardrail-Signals, weil das entscheidende erste Crashjahr vor der
Alarmaktivierung liegt und der Safety-Cap dort konstruktionsbedingt nicht
greift (C-P-01). Das nahezu leere Delta wird dabei als Beleg für
Nebenwirkungsfreiheit gelesen statt als Hinweis auf Wirkungslosigkeit
(C-P-10).

Zweitwahrscheinlichste Ursache: Slice 4 hebt die Registry-Schemaversion an,
und beim nächsten Öffnen des Tranchenmanagers ist die reale Verkaufshistorie
mit `RECONCILIATION_HISTORY_INVALID` nicht mehr lesbar (C-P-04).

### 4. Review-Ergebnis

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-P-01, C-P-02, C-P-03, C-P-04
- **Restrisiken:** C-P-05 bis C-P-15; darüber hinaus bleibt bestehen, dass die
  vier Slices die Vertrauenswürdigkeit der **Darstellung** erhöhen, nicht die
  der **Modellannahmen**. Die Restrisiken R1 (Rentenbeginn), R2
  (Sampling-Abdeckung) und R8 (Langlebigkeit) bleiben unverändert und werden
  durch keine der vier Umsetzungen berührt. Die in Abschnitt 6 der Analyse
  empfohlenen Gegenläufe sind daher keine Kür, sondern die eigentliche
  Absicherung der Entscheidungsgrundlage – sie sollten im Abschnitt
  „Nutzungseinschränkungen" als bleibende Pflicht verankert werden, nicht als
  Priorität C geführt.
- **Pre-Mortem:** siehe Abschnitt 3.

## Re-Review von Claude (zweite Runde)

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Geprüft wurden die
Korrekturen zu C-P-01 bis C-P-15 sowie die vier neu geschnittenen Slice-MDs
gegen den Quellcode.

### 1. Status der Erstrunden-Findings

| ID | Bewertung der Antwort |
| --- | --- |
| C-P-01 | **gelöst.** Der Faktenbeleg (`Alarm: false` in Jahr 1) ist entscheidend und der Contract auf „Alarm **oder** Guardrail" umgestellt. Die Umsetzung wirft jedoch zwei neue Fragen auf: C-P-17 und C-P-18. |
| C-P-02 | **gelöst.** Die gesamte Real-Drawdown-Kette liegt in Slice 1; Slice 2 ist explizit vertragsfrei gestellt. |
| C-P-03 | **gelöst.** Der V2-Projektionsadapter ist der richtige Schnitt: interne Feldnamen bleiben, die Konsumentendateien sind ausdrücklich Nicht-Scope. Neun produktive Dateien sind plausibel — mit der Einschränkung aus C-P-16. |
| C-P-04 | **gelöst.** Keine Versionsanhebung ist die richtige Entscheidung. Die gewählte Ersatzlösung führt das Risiko aber an anderer Stelle wieder ein: C-P-20. |
| C-P-05 | **gelöst.** Append-only Folgeereignis mit kanonisch abgeleiteter ID ist die tragfähige Variante. |
| C-P-06 | **gelöst.** |
| C-P-07 | **gelöst.** Abschnitt 4.2 ist die richtige Konstruktion. |
| C-P-08 | **gelöst.** ENG-07 mit Quellregister benannt; `effectiveAlarmCutPct = 10 * wealthFactor` entspricht dem Code. |
| C-P-09 | **gelöst.** |
| C-P-10 | **teilweise gelöst.** Das Orakel existiert nun, ist aber für Jahr 2 methodisch nicht haltbar: C-P-19. |
| C-P-11 | **gelöst.** Die Rundungstabelle mit Nutzen-/Kostenrichtung ist präzise und testbar. |
| C-P-12 | **gelöst.** |
| C-P-13 | **gelöst.** |
| C-P-14 | **gelöst.** |
| C-P-15 | **gelöst.** |

### 2. Neue Findings

#### C-P-16 (Blocker) – Das Szenario-Log bleibt vertragslos, obwohl F2, F3, F8 und R5 dort auftreten

Der V2-Vertrag deckt `MonteCarloExportV2`/`MonteCarloRunResultV2` ab. Die
Befunde F2 (`RealReturnEquityPct` als Ratio), F3 (`entnahmequote` gegen
`QuoteEndPct`), F8 (Terminalrecord) und die R5-Namenskollision treten jedoch
nicht im Exportdokument auf, sondern in den **Szenario-Logs** — den Artefakten,
an denen die Analyse tatsächlich durchgeführt wurde.

Deren Exportpfad ist `app/simulator/simulator-results.js:217`:

```js
new Blob([JSON.stringify(window.globalCurrentScenarioData.rows, null, 2)], …)
```

Das ist ein **nacktes Array von Rohzeilen**: keine `schemaVersion`, kein
`unitContract`, kein Dispatcher, keine Kompatibilitätswarnung. Dieselbe Datei
ist in Slice 1 ausdrücklich Nicht-Scope; das AK „Ein Versionsdispatcher liest
V1 und V2" greift für dieses Artefakt nicht.

Daraus folgt ein Dilemma, das der Plan nicht auflöst:

- Werden die Zeilen über die in Slice 1 eingeplanten Produzenten
  (`simulator-year-result.js`, `mc-log-builder.js`) korrigiert, ist das eine
  **stille In-place-Semantikänderung eines unversionierten Exportartefakts** –
  genau das, was Abschnitt 14 verbietet. Alte und neue `scenario-log.json`
  wären nicht unterscheidbar.
- Bleiben die Zeilen unverändert, bleiben F2, F3, F8 und R5 in dem Artefakt
  ungefixt, in dem sie gefunden wurden, und die Nutzungseinschränkung aus 4.1
  müsste für Szenario-Logs dauerhaft gelten.

Zusatzbefund zum CSV-Pfad (`:233`): `const headers = Object.keys(rows[0])`. Die
Spaltenliste stammt ausschließlich aus der **ersten** Zeile. Ein `recordType`,
den nur der Terminalrecord trägt, erscheint im CSV-Export nie – die
F8-Korrektur wäre dort unsichtbar.

Erforderlich vor Freigabe: eine ausdrückliche Entscheidung und ein AK dazu, wie
das Szenario-Log gekennzeichnet wird. Minimalvorschlag: Kopfobjekt mit
`schemaVersion` und `unitContract` statt nacktem Array, `recordType` auf
**allen** Zeilen, CSV-Header aus der Vereinigungsmenge aller Zeilenschlüssel.

#### C-P-17 (Blocker) – `safetyCapSource` ist über `kuerzungQuelle` nicht sicher bestimmbar

`kuerzungQuelle` ist ein einziger, mehrfach überschriebener String. In
`flex-rate-policy.mjs` setzt der `bear_deep`-Zweig zunächst `'Tiefer Bär'`
(`:131`) beziehungsweise `'Tiefer Bär (vermögensadj.)'` (`:123`). Direkt danach
überschreibt die interne Glättung die Quelle mit `'Glättung (Abfall)'`
(`:162`) beziehungsweise `'Glättung (Anstieg)'` (`:159`), und die S-Kurve
überschreibt erneut (`:177-179`).

Der Contract enthält damit zwei gleichzeitig anwendbare, widersprüchliche
Klauseln: „`guardrail_family` umfasst den dokumentierten Nicht-Alarm-
`bear_deep`-Kandidaten" **und** „reine Profil- oder Komfortglättung aktiviert
keinen Cap". In einem `bear_deep`-Jahr mit überschriebener Quelle greifen
beide.

Das trifft den dokumentierten Fall unmittelbar: Belegt ist für Jahr 1 nur die
**finale** Quelle `'Glättung (Final-Guardrail)'`. Welche Quelle der Kandidat
vor dem Mindest-Flex trug, ist nicht dokumentiert. War es `'Glättung
(Abfall)'`, liefert eine quellenbasierte Implementierung `safetyCapSource =
null`, es entsteht kein Cap – und der Schadensfall bleibt trotz Slice 3
ungefixt.

Erforderlich: ein **strukturelles** Triggerkriterium statt des Quellenstrings,
etwa „Cap aktiv, wenn `alarmStatus.active` **oder** `market.sKey ===
'bear_deep'` **oder** eine Guardrail-/Hard-Cap-Reduktion gebunden hat", sowie
der Beleg der Kandidatenquelle aus dem Jahr-1-Record.

#### C-P-18 (hoch) – Der Cap ankert hinter der internen Glättung

Der rohe `bear_deep`-Cut (`flex-rate-policy.mjs:111-112`,
`basisKuerzung = 50 + max(0, abstandVomAthProzent - 20)`) wird noch **innerhalb**
von `calculateFlexRate` EMA-geglättet (`:137-139`) und auf `MAX_DOWN` begrenzt
(`:155-163`). Beides ist Komfortmechanik und wirkt, **bevor** der Kandidat
entsteht, auf den der neue Cap ankert.

Der Slice verspricht „die stärkste im jeweiligen Jahr wirksame
Sicherheitsbegrenzung". Tatsächlich ankert er auf einem bereits
komfortgedämpften Wert. Als Scope-Entscheidung ist das vertretbar – der
dokumentierte Schaden entstand in den nachgelagerten Schritten –, aber es muss
ausdrücklich so benannt werden. Sonst setzt ein späterer Bearbeiter den Rohcut
als Anker und verändert die Engine weit über diesen Slice hinaus.

#### C-P-19 (hoch) – Das Jahr-2-Delta-Orakel ist pfadabhängig nicht haltbar

`prevFlexRate = state.flexRate ?? 100` (`flex-rate-policy.mjs:136`) und der
Depotwert des Folgejahres hängen beide vom Ergebnis des Vorjahres ab. Wird
Jahr 1 von 53.400 EUR auf höchstens 12.144,29 EUR gekappt, divergieren ab
Jahr 2 sowohl der Ratenanker als auch das Portfolio.

Die Zeile „Worst-Case-Jahr 2 … erwartetes Cap-Delta 0 EUR" mit den Baselines
48.632,40/48.550,20 EUR gilt daher nur kontrafaktisch für ein isoliert
betrachtetes Jahr, nicht für einen Re-Run. Als Abnahmeorakel würde sie
entweder ein korrektes Ergebnis als Abweichung markieren oder dazu verleiten,
so lange nachzujustieren, bis die Zahl passt.

Erforderlich: Jahr 2 ausdrücklich als Ein-Jahres-Kontrafaktum kennzeichnen; für
den Re-Run nur Richtungsinvarianten prüfen („finaler Flex ≤ Cap in jedem Jahr
mit aktivem Safety-Signal").

#### C-P-20 (Blocker) – Das Folgeereignis muss `actionId` tragen, sonst bricht die gesamte Historie

`readReconciliationHistory` normalisiert **jeden** Record über
`normalizeRequiredId(record.actionId, 'actionId')`
(`tranche-reconciliation.js:170`) und erzwingt Eindeutigkeit (`:171-174`).

Die Slice-4-AK nennen für `cash_posting_confirmed` ausschließlich
`confirmationActionId`, `targetActionId`, Beträge und Zeitpunkt – kein
`actionId`. Fehlt dieses Feld, wirft der nächste Lesevorgang
`RECONCILIATION_HISTORY_INVALID`, und die **komplette** Historie inklusive
aller Verkaufsrecords ist unlesbar. Das ist exakt die Fehlerklasse, die C-P-04
beseitigen sollte – hier durch die gewählte Ersatzlösung wieder eingeführt.

Erforderlich: AK „jedes Folgeereignis besitzt `actionId === confirmationActionId`
und kollidiert mit keiner Verkaufs-ID", plus ein Test, der eine Historie mit
gemischten Eventtypen schreibt, neu liest und beide Typen korrekt projiziert.

#### C-P-21 (mittel) – Slice 4 weicht bewusst von der eigenen Stop-Regel ab

Abschnitt 14 verbietet die stille Änderung eines V1-Vertrags und verlangt
Versionierung. Slice 4 erweitert den Inhalt von `schemaVersion: 1` additiv,
ohne zu versionieren. Für eine lokale Persistenz mit rein additiven,
optionalen Feldern ist das die richtige Wahl und die direkte Folge von C-P-04 –
aber es ist eine bewusste Ausnahme und gehört als solche in Abschnitt 14,
sonst blockiert die Regel den eigenen Slice.

#### C-P-22 (mittel) – Slice 1 und Slice 3 teilen sich zwei Dateien

`simulator-year-result.js` und `mc-log-builder.js` stehen in beiden
Dateilisten. Die Rollback-Strategie „gezieltes Wiederherstellen der
Slice-Dateien" würde in Slice 3 die bereits abgenommenen Slice-1-Änderungen
mit zurücknehmen. Für diese beiden Dateien ist auf `git revert` des
Slice-3-Commits beziehungsweise gezielte Hunk-Rücknahme umzustellen.

#### C-P-23 (niedrig) – Die Ergebniskarten lesen Aggregate, nicht die V2-Projektion

`displayMonteCarloResults(aggregatedResults, …)`
(`simulator-monte-carlo.js:576`) übergibt die Aggregate direkt an die UI; das
V2-Dokument entsteht erst im Exportpfad. Slice 2 spricht durchgängig vom
„V2-Exaktwert". Festzulegen ist, dass die Karte den `null`-plus-Grund-Fall als
Strich rendert und nicht als 0, solange sie weiterhin aus den Aggregaten liest.

### 3. Pre-Mortem (zweite Runde)

In drei Monaten wird erneut ein Szenario-Log ausgewertet – das Artefakt, an dem
die ganze Analyse hing – und es trägt weiterhin `RealReturnEquityPct` mit
Ratio-Werten beziehungsweise trägt sie plötzlich anders, ohne dass die Datei
sich von einer alten unterscheiden lässt (C-P-16). Zweitwahrscheinlichste
Ursache: Slice 3 ist implementiert, aber der Cap zündet im dokumentierten
Jahr 1 nicht, weil die Kandidatenquelle `'Glättung (Abfall)'` lautete und die
Ausschlussklausel für Komfortglättung gegriffen hat (C-P-17).

### 4. Review-Ergebnis (zweite Runde)

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-P-16, C-P-17, C-P-20
- **Restrisiken:** C-P-18, C-P-19, C-P-21, C-P-22, C-P-23
- **Einordnung:** Die Überarbeitung hat alle fünfzehn Erstrunden-Findings
  substanziell adressiert; der V2-Adapterschnitt, die Rundungstabelle und der
  Verzicht auf die Schemaanhebung sind tragfähige Lösungen. Die drei neuen
  Blocker betreffen ausnahmslos Stellen, an denen die neue Lösung an eine
  bestehende Codeeigenschaft grenzt, die im Plan nicht abgebildet ist – nicht
  die fachliche Richtung.

## Drittes Review von Claude (Abschluss der Planprüfung)

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Geprüft wurden die
Antworten auf C-P-16 bis C-P-23 sowie die daraus geänderten Slice-Verträge
gegen den Quellcode.

### 1. Prüfdimensionen

**Korrektheit.** Die drei Blocker der zweiten Runde sind geschlossen. Die
konkret benannten Einheiten-Mappings wurden numerisch gegen den Code geprüft
und sind korrekt:

| Zusage | Codebeleg | Ergebnis |
| --- | --- | --- |
| `entnahmequote` wird für `realizedWithdrawalRatePct` mit 100 multipliziert | `simulator-year-result.js:310` – `jahresEntnahmeEffektiv / depotwertGesamt`, also ein Quotient | korrekt |
| `QuoteEndPct` liefert bereits Prozentpunkte und wird durchgereicht | `simulator-year-result.js:224-226` – `entnahmequoteDepot * 100` | korrekt |
| Renditefelder werden ohne Faktorwechsel zu `...Ratio` | `simulator-year-result.js:306-309` – `rA`, `rG` sind Quotienten | korrekt |
| kanonische ID unter dem 128-Zeichen-Limit | `tranche-reconciliation.js:44` prüft Länge und Steuerzeichen, keine Zeichensatzbeschränkung; `cash-confirmation:v1:` + 64 Hex = 85 Zeichen | korrekt |

**Vertragstreue.** Der strukturelle Safety-Trigger löst C-P-17 an der richtigen
Stelle: `kuerzungQuelle` ist zu reinem Anzeigetext degradiert, und die
Zusatzregel „Eine Änderung nur von `kuerzungQuelle` bei identischer
struktureller Evidenz darf das Cap-Ergebnis nicht ändern" macht das prüfbar.
Der Anker `post_internal_smoothing_and_flex_rate_hard_caps` benennt C-P-18
offen. Eine Asymmetrie bleibt: C-01 unten.

**Fehlerbehandlung.** C-P-20 ist vollständig gelöst — reguläres `actionId`,
reservierter Namespace, Kollisionsprüfung gegen alle Records, Preview-Filter
und Mixed-Event-Read sind einzeln als AK verankert.

**Seiteneffekte.** Slice 1 steht bei exakt zehn von zehn zulässigen Dateien.
Durch die Aufnahme von `simulator-results.js` entsteht eine neue
Slice-Überschneidung: C-03 unten.

**Was könnte brechen?** Kein Pfad mehr, der persistente Nutzerdaten oder den
dokumentierten Schadensfall betrifft. Die verbleibenden Findings verändern
Verhalten in Randfällen oder betreffen Benennung und Prozess.

### 2. Findings

#### C-01 (hoch) – `bear_deep` löst den Cap auch ohne jede Sicherheitskürzung aus

Der Trigger verlangt für Hard-Cap und Guardrail ausdrücklich eine
„tatsächlich reduzierende" Bindung, für `market.sKey === 'bear_deep'` dagegen
nichts. Genau dort existiert aber ein Zustand ohne jede Kürzung:

`flex-rate-policy.mjs:110-121` – bei `wealthFactor === 0` ist
`reductionFactor = 0`, damit `roheKuerzungProzent = 0` und `roheFlexRate = 100`.
Der Code protokolliert ausdrücklich „Keine Reduktion nötig – Entnahmequote
unter dem Safe-Wert."

In einem solchen Jahr wäre der Cap dennoch aktiv und würde den Mindest-Flex
daran hindern, die Rate anzuheben — obwohl dieselbe Wealth-Logik gerade
festgestellt hat, dass keine Sicherheitskürzung erforderlich ist. Das ist eine
Verhaltensänderung ohne fachlichen Anlass und widerspricht der eigenen
Trigger-Systematik.

Erforderlich: `bear_deep` triggert nur bei `roheKuerzungProzent > 0`
(gleichwertig: `wealthFactor > 0`), analog zur „tatsächlich reduzierend"-
Bedingung der beiden anderen Quellen. Ein Golden-Case
`bear_deep` + `wealthFactor === 0` muss `safetyCapSource: null` liefern.

#### C-02 (mittel) – `policyWithdrawalRatePct` misst die Vorjahresrate

`QuoteEndPct` speist sich aus `spendingResult.details.entnahmequoteDepot`, und
dieser Wert entsteht in `SpendingPlanner.mjs:155-162` aus
`vorlaeufigeEntnahme = floor + flex * (previousFlexRate / 100)` — also aus der
**Flexrate des Vorjahres**, bevor die diesjährige Policy gelaufen ist.

Der neue Name `policyWithdrawalRatePct` legt nahe, es handle sich um die
Politikquote *dieses* Jahres. Das ist genau die Klasse von Fehlinterpretation,
die F3 beseitigen soll. Der `unitContract` muss den Messzeitpunkt wörtlich
festhalten: „vorläufige Entnahme auf Basis der Vorjahres-Flexrate, vor
Transaktions- und Auszahlungsphase, Nenner Depot ohne Liquidität".

#### C-03 (mittel) – neue Slice-Überschneidung bei `simulator-results.js`

Die Antwort zu C-P-22 stellt fest, geteilt bleibe nur
`simulator-year-result.js`. Durch die Aufnahme von `simulator-results.js` in
Slice 1 ist diese Datei nun zwischen Slice 1 und Slice 2 geteilt. Die dort
beschlossene Rollback-Regel (`git revert` des exakten Commits statt
dateibasierter Rücknahme) ist auf dieses Paar auszudehnen.

Ergänzend: Slice 1 liegt bei zehn von zehn Dateien und hat damit keinerlei
Reserve. Das ist konsequent dokumentiert, macht aber jede unerwartete
Abhängigkeit zu einem Stop. Das ist akzeptabel, solange die Stop-Regel
tatsächlich ausgelöst und nicht aufgeweicht wird.

#### C-04 (niedrig) – Hashquelle für die kanonische ID festlegen

Die kanonische ID verlangt SHA-256 in einem **synchronen** Commit-Pfad.
`crypto.subtle.digest` ist asynchron und würde die Atomarität des Lot-/
Registry-Commits aufbrechen. Das Projekt besitzt bereits eine synchrone
Implementierung: `sha256Hex` in
`app/simulator/historical-backtest-contract.js:87`, genutzt von
`fingerprintMonteCarloValue`. Der Slice sollte diese Quelle verbindlich
benennen; ein Import erhöht die Dateizahl nicht.

#### C-05 (niedrig) – `safetyCapAnchorStage` passt nicht für alle vier Quellen

Der Anker ist als `post_internal_smoothing_and_flex_rate_hard_caps` definiert.
Für `safetyCapSource: spending_guardrail` entsteht der Kandidat jedoch erst
nach `applyGuardrails`, also eine Stufe später. Ein einziger konstanter
Ankerwert beschriftet diesen Fall falsch. Entweder zwei Ankerwerte vorsehen
oder den Anker je Quelle ausweisen.

### 3. Pre-Mortem

In drei Monaten fällt in einem Bärenjahr mit hoher Vermögensdeckung die
Flexauszahlung unter den Mindest-Flex, obwohl die Engine im selben Jahr
„Vermögen ausreichend – keine Reduktion nötig" protokolliert. Ursache: Der
Cap wurde allein durch das Regime `bear_deep` aktiviert (C-01). Der Effekt ist
schwer zuzuordnen, weil alle Tests grün sind und der dokumentierte
Anwendungsfall korrekt funktioniert.

### 4. Review-Ergebnis (dritte Runde)

- **Status:** freigegeben unter Auflagen – keine Blocker mehr offen
- **Blocker:** keine
- **Auflagen vor dem ersten Code-Edit:**
  1. C-01 im Slice-3-Contract korrigieren (`bear_deep` nur bei tatsächlicher
     Kürzung) – dies ist die einzige Auflage mit Verhaltenswirkung;
  2. C-02 bis C-05 in den jeweiligen Slice-Verträgen nachziehen;
  3. die in Slice 3 selbst verlangte **ausdrückliche Nutzerfreigabe** zur
     Konsumfolge (Safety-Cap 12.144,29 EUR übersteuert den deklarierten
     Haushalts-Mindest-Flex von 30.000 EUR im Crashjahr) muss vorliegen;
  4. Gemini-Planreview gemäß Abschnitt 15.
- **Restrisiken:** C-01 bis C-05; unverändert bestehen die Modellrisiken R1,
  R2 und R8, die durch Abschnitt 4.2 nun korrekt als dauerhafte
  Kontrollpflichten geführt werden statt als erledigt zu gelten.
- **Einordnung:** Die dritte Fassung hält der Codeprüfung stand. Die
  Vertragsschnitte — V2-Projektionsadapter, `ScenarioLogExportV2` mit
  gemeinsamem JSON-/CSV-Projektor, struktureller Safety-Trigger, append-only
  Cash-Folgeereignis mit kanonischer ID — sind an den Stellen verankert, an
  denen der Code sie tatsächlich trägt, und die numerisch überprüfbaren
  Zusagen stimmen.

## Viertes Review von Claude

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Geprüft wurden die
Umsetzung der Auflagen C-P-24 bis C-P-28 sowie die dabei zusätzlich
vorgenommenen Änderungen.

### 1. Prüfung der fünf Auflagen

| Auflage | Umsetzung | Bewertung |
| --- | --- | --- |
| C-P-24 | Trigger verlangt `bear_deep` **und** `roheKuerzungProzent` oberhalb der Toleranz; `wealthFactor === 0` liefert ausdrücklich `safetyCapSource: null` mit eigenem Golden-Case | erfüllt; die Asymmetrie zur „tatsächlich reduzierend"-Bedingung ist beseitigt |
| C-P-25 | Umbenennung in `preDecisionWithdrawalRatePct` plus wörtlicher Messphasentext | über die Auflage hinaus — eine Umbenennung ist besser als eine bloße Dokumentation. Konsistent nachgezogen: `simulator-results.js` ist aus der Nicht-Scope-Liste von Slice 1 entfernt |
| C-P-26 | Neue globale Stop-Regel in Abschnitt 14 („dateiweises Wiederherstellen verboten") plus Rollbacktext in Slice 2 | erfüllt und allgemeiner gelöst als gefordert |
| C-P-27 | Synchronität angenommen, Importquelle abgelehnt | Ablehnung sachlich berechtigt (siehe unten); die gewählte Ersatzlösung ist jedoch nicht die einfachste: C-02 |
| C-P-28 | Zwei quellenspezifische Anker plus AK „Quelle und Anker dürfen nicht auseinanderfallen" | erfüllt |

Zur abgelehnten Importquelle: Der Einwand ist belegt.
`app/simulator/historical-backtest-contract.js:3` importiert `HISTORICAL_DATA`
aus `simulator-data.js`. Ein Import von dort in `app/tranches/` zöge tatsächlich
die historischen Marktdaten als Laufzeitabhängigkeit in den Tranchenbereich.
Mein Vorschlag war insoweit die schlechtere Option.

### 2. Findings

#### C-01 (hoch) – Die 4,5-Prozent-KPI deklariert ihre Quotenbasis weiterhin nicht

Dieser Punkt ist mir in den ersten drei Runden entgangen. F3 hat zwei Hälften:
die Feldbenennung — durch `realizedWithdrawalRatePct` und
`preDecisionWithdrawalRatePct` jetzt gelöst — und die davon **abgeleitete
Kennzahl**, die weiterhin offen ist.

Belege:

- Die Heatmap wird auf der realisierten Quote gebildet:
  `monte-carlo-runner.js:828` – `const quote = result.logData.entnahmequote * 100`.
- Die Schwelle 4,5 Prozent stammt aus
  `CONFIG.THRESHOLDS.STRATEGY.withdrawalRate = 0.045` und wird von der Engine
  auf `entnahmequoteDepot` angewendet (`alarm-policy.mjs:14, :29`) — also auf
  die **andere** der beiden Größen.
- `colSharesAbove45` entsteht in `app/simulator/simulator-heatmap.js:187`.
  Diese Datei steht in **keiner** Slice-Dateiliste.

Die Kennzahl „Zeitanteil Quote größer 4,5 Prozent" misst damit die realisierte
Quote gegen eine Schwelle, die im Modell für die Vorentscheidungsquote gilt.
Genau davor warnt die Analyse ausdrücklich: „Die 4,5-%-KPI darf nicht ohne
Definition mit der Guardrail-Schwelle gleichgesetzt werden."

Nach Abschluss der vier Slices wären die Exportfelder eindeutig benannt, die
sichtbare Kennzahl aber weiterhin eine stille Mischung zweier Definitionen —
und damit genau die Art von Fehlinformation, die diese Runde beseitigen soll.

Zu entscheiden ist eines von zwei:

1. **Aufnehmen:** V2 weist für Heatmap und abgeleitete Schwellen-KPIs die
   zugrunde liegende Definition aus (etwa `basis: realizedWithdrawalRatePct`),
   und Slice 2 beschriftet die Kachel entsprechend. Wird dafür
   `simulator-heatmap.js` benötigt, ist das die elfte Datei in Slice 1 — die
   Stop-Regel greift und der Slice müsste geteilt werden.
2. **Bewusst nicht aufnehmen:** eine neue NR-Zeile mit der Kompensation, dass
   die 4,5-Prozent-Kachel dauerhaft nicht gegen die Guardrail-Schwelle gelesen
   werden darf, und Aufnahme dieses Hinweises in Abschnitt 4.2.

Beides ist vertretbar. Nicht vertretbar ist, den Punkt unerwähnt zu lassen.

#### C-02 (hoch) – Die private SHA-256-Kopie ist vermeidbar

Die Ablehnung meiner Importquelle ist richtig, die Ersatzlösung aber die
aufwendigste der verfügbaren: rund sechzig Zeilen Kryptocode entstehen neu in
`tranche-reconciliation.js` — in genau dem Slice, dessen Zweck die Integrität
persistierter Realdaten ist. Fehlerquellen einer Neuimplementierung sind
Padding, Endianness, Längenkodierung jenseits 2^32 und UTF-8-Kodierung.

Der Zweck der ID verlangt keinen Hash. Gefordert sind Determinismus,
Eindeutigkeit und Kollisionsfreiheit gegenüber Verkaufs-IDs. Das leistet die
direkte Ableitung

```text
cash-confirmation:v1:<normalizedTargetActionId>
```

besser: Sie ist **injektiv**, also kollisionsfrei per Konstruktion statt nur
praktisch kollisionsfrei, sie ist im Auditverlauf ohne Werkzeug lesbar, und sie
benötigt keinerlei neue Implementierung. Einzige Nebenbedingung ist das
bestehende 128-Zeichen-Limit aus `tranche-reconciliation.js:44`: Der Prefix
belegt 21 Zeichen, also ist für neue Verkaufs-`actionId` eine fail-closed
Obergrenze von 107 Zeichen zu setzen — eine Prüfung, die ohnehin über
`normalizeRequiredId` läuft.

Empfehlung: direkte Ableitung ohne Hash. Wird eine feste Länge dennoch
gewünscht, bleibt die private Implementierung die zweitbeste Option; dann sind
die Standardtestvektoren zwingend, wie im Slice bereits vorgesehen.

#### C-03 (niedrig) – Abschnitt 2.5 endet bei Punkt 8

Die Statuszeile weist Entwurf v4 mit eingearbeiteten Auflagen der dritten Runde
aus; die Korrekturgrundlage in Abschnitt 2.5 listet jedoch nur die Ergebnisse
der Runden eins und zwei. Für die Nachvollziehbarkeit der Begründungskette
sollten die Punkte zu C-P-24 bis C-P-28 dort ergänzt werden.

### 3. Pre-Mortem

In drei Monaten wird ein MC-Lauf ausgewertet, dessen Exportfelder erstmals
eindeutig benannt sind — und die Entscheidung stützt sich trotzdem auf die
Kachel „Zeitanteil Quote größer 4,5 Prozent", die eine andere Quote misst als
die Schwelle, gegen die sie gelesen wird (C-01). Der Fehler ist besonders
schwer zu bemerken, weil alle umbenannten Felder daneben korrekt sind.

### 4. Nutzerentscheidungen vom 2026-08-06

Der Nutzer hat die beiden offenen Punkte entschieden:

**NE-01 zu C-01 / C-P-29 – Quotenbasis: Export **und** sichtbare Beschriftung.**
Der V2-Vertrag weist die zugrunde liegende Definition für Heatmap und
abgeleitete Schwellen-KPIs aus; dieser Teil liegt vollständig in bereits
gelisteten Slice-1-Dateien. Zusätzlich wird die 4,5-Prozent-Copy in
Ergebniskarte, Heatmap und Auto-Optimize so gefasst, dass sie nicht mit der
Guardrail-Schwelle verwechselt werden kann.

Die Umsetzung geht über die Nutzerentscheidung hinaus und ist dabei sachlich
begründet: Die Kennzahl ist nicht nur eine Anzeigekachel, sondern eine
**Optimierungsnebenbedingung**. `timeShareQuoteAbove45` beziehungsweise
`timeShareWRgt45` steuert Auswahl und Constraint im Auto-Optimizer
(`auto-optimize-evaluate.js:223, :233, :304`, `auto-optimize-metrics.js:81`,
`auto-optimize-renderer.js:255, :281`) und erscheint als Akzeptanzkriterium in
`Simulator.html:1304`. Eine nur auf die Ergebniskachel beschränkte Korrektur
hätte die Fehlbezeichnung dort stehen lassen, wo sie Parameterentscheidungen
beeinflusst.

Bestätigt ist auch der ergänzte `>`-/`>=`-Punkt: `colSharesAbove45` summiert in
`simulator-heatmap.js:187-192` ab `binIdx45` einschließlich des Intervalls
[4,5; 5,0). Die Kennzahl ist damit ein **größer-gleich**-Anteil, während die
sichtbare Beschriftung „größer 4,5 %" lautet.

Slice 2 wächst dadurch auf zehn produktive Dateien. Das ist als ausdrückliche
Planergänzung dokumentiert und bleibt innerhalb der Zehn-Dateien-Regel, jedoch
ohne Reserve. Entscheidend und ausreichend abgesichert ist die Scope-Grenze:
nur sichtbare Copy, **keine** Änderung der Messlogik und **keine** Umbenennung
der stabilen Metric-Keys. Damit bleiben `auto-optimize-utils.js` und
`auto_optimize.js`, die denselben Key nur lesen, zu Recht außerhalb der Liste.

**NE-02 zu C-02 / C-P-30 – kanonische Cash-ID ohne Hash.**
Die `confirmationActionId` lautet
`cash-confirmation:v1:<normalizedTargetActionId>` und ist damit injektiv,
kollisionsfrei per Konstruktion und im Audit lesbar. Die private SHA-256-Hilfe
entfällt ersatzlos, ebenso die Standardtestvektoren.

Von meinem Vorschlag abweichend wurde die Längenregel **eventtypspezifisch**
statt über eine Kappung der Verkaufs-IDs gelöst: `sale_reconciled.actionId` und
`targetActionId` behalten 128 Zeichen, nur Abschlussrecords dürfen 149 Zeichen
tragen (21 Zeichen Prefix plus vollständig gültige Ziel-ID); der Leser bestimmt
zuerst den Eventtyp und wendet dann das passende Limit an, 129 beziehungsweise
150 Zeichen scheitern fail-closed. Diese Lösung ist der von mir vorgeschlagenen
107-Zeichen-Kappung vorzuziehen, weil sie den Namensraum bestehender und
künftiger Verkaufs-IDs nicht ohne Not verkleinert. Bestehende Altrecords liegen
sämtlich unter 128 Zeichen und bleiben unverändert lesbar.

**C-03 / C-P-31** ist redaktionell erledigt.

### 5. Review-Ergebnis (vierte Runde, abschließend)

- **Status:** **freigegeben** – Planprüfung durch Claude abgeschlossen
- **Blocker:** keine
- **Offene Findings aus meinen Reviewrunden:** keine. C-P-01 bis C-P-28 sind
  umgesetzt, C-P-29 und C-P-30 sind durch NE-01 und NE-02 entschieden, C-P-31
  ist redaktionell.
- **Was noch fehlt, stammt nicht aus diesem Review, sondern aus dem Plan
  selbst:**
  1. die in Slice 3 verlangte ausdrückliche Nutzerbestätigung, dass der
     Safety-Cap von 12.144,29 EUR den deklarierten Haushalts-Mindest-Flex von
     30.000 EUR im Crashjahr übersteuern darf;
  2. der in Slice 3 vorgeschriebene strukturelle Evidenzlauf für
     Worst-Case-Jahr 1 vor dem ersten Code-Edit — ergibt er weder einen
     `bear_deep`-Rohcut oberhalb der Toleranz noch eine tatsächlich
     reduzierende Hard-Cap-/Guardrail-Bindung, stoppt der Slice
     vertragsgemäß;
  3. das Gemini-Planreview nach Abschnitt 15, das den Status auf
     `implementierungsreif` setzt.
- **Restrisiken:** unverändert die Modellrisiken R1 (Rentenbeginn), R2
  (Sampling-Abdeckung) und R8 (Langlebigkeit). Sie werden durch keinen der
  vier Slices berührt und sind über Abschnitt 4.2 korrekt als dauerhafte
  Kontrollpflichten verankert — nicht als erledigt.
- **Einordnung:** Über vier Reviewrunden wurden 31 Findings dokumentiert,
  darunter sieben Blocker. Alle sind geschlossen oder bewusst entschieden. Die
  Vertragsschnitte sind an den Stellen verankert, an denen der Code sie
  tatsächlich trägt; die numerisch überprüfbaren Zusagen wurden gegen den
  Quellcode nachgerechnet und stimmen.

## Fünftes Review von Claude (Entwurf v7, nach Gemini-Erstrunde und NE-03)

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Geprüft wurden die
Gemini-Findings G-P-01 bis G-P-07, deren Behandlung durch Codex und die neue
Nutzerentscheidung NE-03.

### 1. Prüfung der Gemini-Runde

**G-P-02 ist ein Finding, das ich in vier Runden nicht hatte.** Der Fall
„Tippfehler im Cashstand" trifft einen realen Bedienfehler, den der
Append-only-Vertrag unauflösbar gemacht hätte. Die Antwort — eine append-only
`cash_posting_corrected`-Kette mit `correctionRevision`, linearer
Kettenprüfung und fail-closed bei Lücken, Verzweigungen und veralteten
Rückverweisen — ist tragfähig und erhält die Append-only-Eigenschaft.

**Codex' zwei Zurückweisungen sind belegt und korrekt:**

| Finding | Prüfung | Ergebnis |
| --- | --- | --- |
| G-P-03 (negative Drawdown-Rundung) | `simulator-engine-helpers.js:524` liefert `maxDDpct = Math.abs(maxDD) * 100`, also einen positiven Betrag | Geminis Szenario `-34,25 % → -34,0 %` kann nicht eintreten; Herabstufung korrekt, die konservative Betragsrundung bleibt trotzdem spezifiziert |
| G-P-07 (149-Zeichen-Grenzfall) | Eine Verkaufs-ID mit 129 Zeichen scheitert bereits an `normalizeRequiredId` (`tranche-reconciliation.js:44`) und kann nie persistiert werden | Vorbedingung unmöglich; Zurückweisung korrekt |

**Die Tatsachenbehauptungen von NE-03 wurden gegen den Code geprüft und
stimmen:**

- Schwelle `CONFIG.THRESHOLDS.ALARM.realDrawdown = 0.25` (`engine/config.mjs:37`).
- `realerDepotDrawdown` wird tatsächlich auf dem **Gesamtvermögen** gebildet:
  `realVermögen = p.gesamtwert / cumulativeInflationFactor`, Drawdown gegen
  `peakRealVermoegen` (`SpendingPlanner.mjs:150-153`). Die Aussage, ein lokal
  extremer Aktienmarkt allein genüge nicht, hält.
- Die Grenzwertmatrix 24,99/25,00/25,01 Prozent passt zum strikten `>`.
- Der frühere Widerspruch zum 35-Prozent-Alarm-Flexfloor ist sauber aufgelöst:
  Normalpfad unverändert, Übersteuerung nur bei aktivem Gate, und genau so auch
  im Nicht-Scope formuliert.

### 2. Findings

#### C-14 (Blocker) – Das Null-Flex-Gate ignoriert genau die Bedingung, die den Alarm unterdrückt

Das Gate ist definiert als Konjunktion aus `market.sKey === 'bear_deep'` und
`realerDepotDrawdown > 0,25`. Es prüft **nicht** `wealthSufficient`. Genau
diese Größe schaltet im selben Marktzustand den Alarm ab:

`alarm-policy.mjs:67-84` – bei `isCrisis && wealthSufficient` wird der Alarm
ausdrücklich beendet beziehungsweise unterdrückt, mit dem Entscheidungstext
„Vermögen ausreichend – kein Alarm-Modus trotz Bärenmarkt."

Die Schwelle lässt sich exakt ausrechnen:

- `wealthSufficient = wealthFactor < 0.5` (`alarm-policy.mjs:40`)
- `wealthFactor = smoothstep((quote − 0,015) / 0,02)`
  (`wealth-reduction.mjs:38`, `config.mjs:108-109`)
- `smoothstep(t) = t²(3 − 2t)` (`spending-policy-helpers.mjs:36-39`), also
  `smoothstep(0,5) = 0,5`
- ⟹ **`wealthSufficient` ⟺ Entnahmequote < 2,5 Prozent**

Angewandt auf die dokumentierten Zahlen dieses Haushalts:

| Zustand | Entnahme | Vermögen | Quote | `wealthSufficient` |
| --- | ---: | ---: | ---: | --- |
| Ausgangslage | 57.600 EUR | 2.769.486 EUR | 2,08 % | ja |
| nach 25 % realem Drawdown | 57.600 EUR | ~2.077.000 EUR | 2,77 % | nein |
| Worst Case nach Flex-Kürzung | 13.331–16.578 EUR | ~2.077.000 EUR | 0,64–0,80 % | ja |

Entscheidend ist die dritte Zeile. `entnahmequoteUsed` bevorzugt
`lastEntnahmeReal / depotwertReal` (`wealth-reduction.mjs:29-31`), also die
**tatsächliche Vorjahresentnahme**. Sobald das Gate die Auszahlung senkt, fällt
die Quote, dadurch fällt `wealthFactor` gegen 0, dadurch bleibt der Alarm
unterdrückt — während das Gate weiter feuert, solange `bear_deep` und ein
Drawdown über 25 Prozent bestehen. Der Effekt des Gates stabilisiert genau das
Signal, das gegen seine Notwendigkeit spricht.

Damit kann der gesamte flexible Lebensstandard auf `0` gesetzt werden, während
die Engine im selben Jahr protokolliert, dass das Vermögen ausreicht und kein
Alarm nötig ist. Das widerspricht der Bezeichnung „schwere Flex-Notlage" und
steht in direktem Widerspruch zu der Korrektur, die für den normalen
`bear_deep`-Trigger gerade erst beschlossen wurde (C-P-24: `wealthFactor === 0`
ohne Rohkürzung erzeugt keinen Cap).

Die Wahrheitsmatrix im Slice hat diese Zelle nicht: Getestet wird
`bear_deep` + `wealthFactor === 0` + Drawdown **≤ 25 Prozent**. Der Fall
`bear_deep` + `wealthFactor === 0` + Drawdown **> 25 Prozent** — der einzige
strittige — fehlt.

Zu entscheiden ist eines von zwei:

1. **Dritte Konjunktion aufnehmen** (Empfehlung): Das Gate verlangt zusätzlich
   `wealthFactor >= 0,5`, also die Abwesenheit von „Vermögen ausreichend". Das
   ist konsistent mit C-P-24, mit der Bezeichnung „Notlage" und mit der
   bestehenden Alarmsystematik.
2. **Bewusst ohne Wealth-Bedingung:** Der Nutzer entscheidet ausdrücklich, dass
   ein realer Gesamtvermögensdrawdown über 25 Prozent im `bear_deep` auch dann
   Null-Flex rechtfertigt, wenn die Entnahmequote unter 2,5 Prozent liegt. Dann
   gehört die fehlende Matrixzelle explizit in die Tests, und die
   Selbstverstärkung über `lastEntnahmeReal` ist als bekannte Eigenschaft zu
   dokumentieren.

#### C-15 (mittel) – Die „vorhandene Solvenzpriorität" ist als bestehend deklariert, aber nicht belegt

Slice 3 formuliert: „Unabhaengig vom Markt bleibt die vorhandene
Solvenzprioritaet bestehen … Kann der aktuelle Netto-Floor nicht finanziert
werden, muss der Lauf explizit als Floor-Unterdeckung/Ruin enden."

Der erste Teil ist plausibel: Keine Flex-Policy kürzt den Floor. Der zweite
Teil ist zweifelhaft. Das Repository misst Floor-Unterdeckung als
**fortlaufende Größe**: `floor_shortfall_nominal` als Zeilenfeld
(`historical-backtest-export.js:556`) sowie die Metriken
`floor_shortfall_occurred`, `floor_shortfall_years` und
`floor_shortfall_total_nominal_eur` (`historical-backtest-metrics.js:107-131`).
Eine gezählte Jahresanzahl setzt voraus, dass ein Lauf nach einer
Floor-Unterdeckung **weiterläuft**, statt als Ruin zu enden.

Trifft das zu, beschreibt der Satz kein bestehendes Verhalten, sondern eine
**neue** Engine-Semantik — eingeführt unter der Bezeichnung „vorhanden" und
damit ohne eigenes Delta-Orakel. Das ist die Art stiller Semantikänderung, die
Abschnitt 14 untersagt.

Vor dem ersten Code-Edit ist zu belegen, welches Verhalten heute gilt. Ist die
Terminierung neu, muss sie als eigene Engine-Semantikänderung mit
Vorher-/Nachher-Delta deklariert werden — andernfalls wird der Satz auf das
tatsächlich Bestehende zurückgenommen („der Floor wird von keiner Flex-Policy
gekürzt; eine Unterdeckung wird als solche gemessen").

### 3. Pre-Mortem

In drei Monaten zeigt ein Gegenlauf mit `UNIFORM`-Sampling über mehrere Jahre
einen flexiblen Lebensstandard von exakt `0`, obwohl das Entscheidungsprotokoll
derselben Jahre „Vermögen ausreichend – kein Alarm-Modus trotz Bärenmarkt"
ausweist. Die Kombination wirkt wie ein Rechenfehler, ist aber die
vertragsgemäße Folge eines Gates ohne Wealth-Bedingung (C-14) — verstärkt
dadurch, dass die gekürzte Entnahme selbst die Quote drückt, die das
Wealth-Signal speist.

### 4. Review-Ergebnis (fünfte Runde)

- **Status:** blockiert – Entwurf v7 ist nicht freigegeben
- **Blocker:** C-14
- **Restrisiken:** C-15; unverändert R1, R2 und R8 als dauerhafte
  Kontrollpflichten nach Abschnitt 4.2
- **Einordnung:** Die Gemini-Runde hat mit G-P-02 eine Lücke geschlossen, die
  ich übersehen hatte, und Codex hat zwei Findings mit belegten Codestellen
  korrekt zurückgewiesen. NE-03 ist fachlich durchdacht und in ihren
  Tatsachenbehauptungen zutreffend. Der Blocker betrifft nicht die Richtung der
  Entscheidung, sondern eine fehlende Bedingung an ihrem Rand — die für die
  konkreten Vermögens- und Entnahmeverhältnisse dieses Haushalts allerdings
  nicht der Randfall ist, sondern der Regelfall.

## Sechstes Review von Claude (Entwurf v8, abschließend)

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Geprüft wurden die
Antworten auf C-14 und C-15.

### C-14 – geschlossen; die Ablehnung meiner Empfehlung ist berechtigt

Mein Vorschlag einer dritten Gatebedingung `wealthFactor >= 0,5` war fehlerhaft.
`wealthFactor` ist **endogen**: Er wird bevorzugt aus
`lastEntnahmeReal / depotwertReal` gebildet (`wealth-reduction.mjs:29-31`), also
aus der Auszahlung, die das Gate selbst steuert. Meine Bedingung hätte eine
Schwingung erzeugt — Gate an, Flex 0, Quote bricht ein, Gate im Folgejahr aus,
voller Flex, Gate wieder an. Zwei exogene Bedingungen sind der richtige
Zuschnitt.

Der Sachgehalt ist über den zweiten von mir genannten Weg vollständig
geschlossen: Das Verhalten steht ausdrücklich im Contract, die fehlende
Matrixzelle (`bear_deep`, 25,01 Prozent, `wealthFactor === 0`, Alarm aus) ist
Delta-Orakel, die Wahrheitsmatrix ist mit `wealthFactor` 0/1 und Alarm an/aus
gekreuzt, eine Zwei-Jahres-Regression sichert das Fortbestehen, und die
Selbstverstärkung über `lastEntnahmeReal` ist als offenes Risiko dokumentiert.
Auch die Asymmetrie zum normalen `bear_deep`-Trigger ist jetzt begründet
ausgewiesen.

### C-15 – widerlegt; meine Schlussfolgerung war falsch

Der Beleg trägt und wurde nachgeprüft: `BREAK_ON_RUIN = true`
(`simulator-data.js:681`), Abbruch im MC-Runner (`monte-carlo-runner.js:765,
:860`), `breakOnRuin = true` im Kohortenlauf
(`historical-backtest-cohorts.js:200`) und ein Ruinergebnis mit
`requiredFloorNominal`, `coveredFloorNominal`, `shortfallNominal` sowie
`terminal_ruin_year: true` (`simulator-engine-direct.js:268-281`). Der
abweichende Default `breakOnRuin = false` betrifft nur den generischen
historischen Runner (`historical-backtest-runner.js:317`) — genau den
Diagnosemodus, aus dem die von mir zitierte Metrik `floor_shortfall_years`
stammt. Von deren Existenz auf den regulären Pfad zu schließen, war ein
Fehlschluss. Die Terminierungssemantik ist bestehend, nicht neu.

### Neues Finding

#### C-16 (niedrig) – Alles-oder-nichts-Kante an der Gate-Schwelle

Bei `wealthFactor === 0` greift der normale Cap nicht (C-P-24), das Notfallgate
dagegen ab 25,01 Prozent. Zwischen 24,99 und 25,01 Prozent realem
Gesamtvermögensdrawdown springt der wirksame Flex von voll auf null — im
dokumentierten Haushalt von 53.400 EUR auf 0 EUR bei zwei Hundertstel
Prozentpunkten Unterschied.

Das ist die Folge eines bewusst binären Gates und kein Fehler. Geprüft wird die
Kante aber nur innerhalb eines Jahres, und die Zwei-Jahres-Regression prüft nur
das Fortbestehen. Nicht geprüft ist der Rücksprung: 25,3 → 24,5 → 25,3 Prozent
ergibt 0 → voll → 0 Flex in drei Folgejahren. Ein solcher Flip-Fall sollte als
Delta-Orakel ergänzt werden; er ist billig und macht die Schwankungsbreite
sichtbar, bevor sie in einem realen Gegenlauf auftritt.

### Review-Ergebnis (sechste Runde)

- **Status:** **freigegeben** – Planprüfung durch Claude abgeschlossen
- **Blocker:** keine
- **Offene Findings:** C-16 (niedrig, Testergänzung)
- **Was noch offen ist, stammt aus dem Plan selbst:** der strukturelle
  Jahr-1-Evidenzlauf vor dem ersten Code-Edit und das Gemini-Re-Review nach
  Abschnitt 15, das den Status auf `implementierungsreif` setzt.
- **Restrisiken:** unverändert R1, R2 und R8 als dauerhafte Kontrollpflichten
  nach Abschnitt 4.2; dazu die dokumentierte Selbstverstärkung über
  `lastEntnahmeReal` und die geringe Cap-Wirkung in fortgesetzten Alarmjahren.
- **Einordnung:** In dieser Runde waren beide meiner Findings falsch oder
  falsch adressiert — C-15 war ein Fehlschluss, C-14 hatte eine zutreffende
  Diagnose mit untauglicher Empfehlung. Beide Antworten sind mit Codestellen
  belegt und halten der Nachprüfung stand.

## Review-Antworten von Codex

Alle Findings C-P-01 bis C-P-31, C-14/C-15 und G-P-01 bis G-P-07 werden in der
Sache beantwortet. Die konkrete Nutzerentscheidung fuer Slice 3 liegt mit NE-03
vor. Der Plan bleibt bis zum strukturellen Evidenzlauf sowie Claude- und
Gemini-Re-Review des Entwurfs v8 gesperrt.

### Antworten auf Claudes fuenfte Runde

- C-14: Als fehlende Contract- und Testpraezisierung angenommen; die empfohlene
  dritte Gatebedingung wird sachlich abgelehnt. `wealthFactor` ist kein Mass des
  Gesamtvermoegensdrawdowns, sondern wird primaer aus
  `lastEntnahmeReal / depotwertReal` gebildet. Null-Flex senkt damit selbst den
  Wert, der das Gate im Folgejahr abschalten wuerde. NE-03 definiert bewusst die
  zwei exogenen Bedingungen `bear_deep` und mehr als 25 Prozent realen
  Gesamtvermoegensdrawdown. Der Contract nennt nun ausdruecklich, dass das Gate
  auch bei `wealthFactor === 0` und unterdruecktem Alarm aktiv bleibt; Diagnose,
  fehlende Matrixzelle und Zwei-Jahres-Regression werden ergaenzt.
- C-15: Die Forderung nach einem Quellbeleg wird angenommen, die vermutete neue
  Terminierungssemantik ist jedoch nicht vorhanden. Der direkte Jahresrunner
  liefert bereits vor beziehungsweise waehrend der Auszahlung `kind: 'ruin'`
  mit `requiredFloorNominal`, `coveredFloorNominal` und `shortfallNominal`, wenn
  der Netto-Floor nicht deckbar ist. App, MC und regulaerer Backtest verwenden
  `BREAK_ON_RUIN = true`. Dass der generische historische Runner optional mit
  `breakOnRuin: false` weitere Ruinzeilen erzeugen kann und die Metriken
  Shortfalljahre zaehlen, ist ein bestehender Diagnosecontract. Slice 3 aendert
  weder diesen Modus noch die Metriken. Die reine Existenz einer
  Jahresanzahlmetrik ist daher kein Beleg, dass der regulaere Pfad nach Ruin
  weiterlaeuft. Der lesende Planungsnachweis vom 2026-08-06 bestaetigt dies mit
  `historical-backtest-runner.test.mjs` (136/136), `simulation.test.mjs`
  (84/84) und `historical-backtest-metrics.test.mjs` (374/374 Assertions).

- C-P-01: Der Produktionsrecord belegt `Alarm: false` in Jahr 1. Slice 3 gilt
  nun fuer die wirksame Sicherheitsbegrenzung aus Alarm **oder** Guardrail.
- C-P-02: Buffer, Chunk, Aggregation, Missingness und V2-Projektion des realen
  Drawdowns liegen vollstaendig in Slice 1. Slice 2 veraendert V2 nicht mehr.
- C-P-03: Slice 1 verwendet einen V2-Adapter ohne globale interne
  Feldumbenennung und listet maximal zehn produktive Dateien. Reicht dies
  nicht, greift die Stop-Regel vor Coding.
- C-P-04: Slice 4 hebt die Historienversion nicht an; valide v1-Historien
  bleiben unveraendert lesbar. Recoveryfixture und Registry-Backup sind Pflicht.
- C-P-05: Der Cashabschluss ist eindeutig ein append-only Folgeereignis und
  keine Mutation des Verkaufsrecords.
- C-P-06: Die Mindest-Flex-Namenskollision wird im V2-Adapter in zwei fachlich
  eindeutige Felder aufgeloest.
- C-P-07: Die Guardrail-Einschraenkung wird dauerhaft und zustandsbezogen im
  Handbuch erhalten.
- C-P-08: Das Finding ist eindeutig als ENG-07 mit Quellregister benannt. Die
  Loesung ist eine ehrliche Basis-Konstante 10 mit separat ausgewiesener
  `wealthFactor`-Skalierung.
- C-P-09: Slice 3 deklariert maximal acht produktive/generierte Dateien und die
  breite Status-, Copy-, Fidelity-, Backtest-, MC-, Browser- und
  Paritaetstestmatrix.
- C-P-10: Das Vorab-Orakel beziffert Jahr 1 mit mindestens 41.255,71 EUR
  Cap-Wirkung, kennzeichnet Jahr 2 nur als isoliertes Kontrafaktum und verlangt
  zusaetzlich zwei synthetische positive Bindungsfaelle.
- C-P-11: Slice 2 besitzt ein KPI-spezifisches Nutzen-/Kosten-Rundungsorakel;
  exakte Werte sind primaer sichtbar.
- C-P-12: Personenbezogene Produktionswerte werden nicht als Fixtures genutzt;
  synthetische Nutzen-/Kosteninvarianten pruefen die Kartenanzeige.
- C-P-13: Bin-/Count-Laengengleichheit und serialisierbares
  `observationCount` sind eigene Akzeptanzkriterien und Tests.
- C-P-14: Die bekannten Steuerabweichungen F7/F10 stehen nun neben Renten-,
  Sampling-, Langlebigkeits- und Gegenlaufpflichten in Abschnitt 4.2.
- C-P-15: `engine.js` ist in Slice 3 als erwartetes, versioniertes
  Build-Artefakt vorab deklariert und wird bei der Dateigrenze mitgezaehlt.

Die Findings C-P-16 bis C-P-23 aus der zweiten Reviewrunde werden ebenfalls
angenommen. Die Dokumente bleiben bis zum erneuten externen Review gesperrt.

- C-P-16: Der bisherige nackte Szenario-Log wird zu einem eigenen
  `ScenarioLogExportV2` mit Envelope, Unit-Contract und typisierten Records.
  JSON und CSV nutzen denselben Projektionsadapter; der CSV-Header ist die
  stabile Vereinigungsmenge aller Recordschluessel. `simulator-results.js` ist
  als zehnte produktive Datei in Slice 1 aufgenommen.
- C-P-17: Der Safety-Trigger beruht auf `alarmStatus.active`, einem tatsaechlich
  positiven `bear_deep`-Rohcut und strukturell bindenden Hard-Cap-/Guardrail-
  Reduktionen. Der ueberschreibbare String `kuerzungQuelle` ist nur Diagnose und
  kein Trigger.
- C-P-18: Die Cap-Anker sind quellenspezifisch explizit. Der rohe Bear-Deep-Cut
  ist bewusst kein Cap-Wert dieses Slices.
- C-P-19: Jahr 2 ist nur noch als isoliertes Ein-Jahres-Kontrafaktum
  dokumentiert. Fuer einen Neulauf gilt pro aktivem Jahr allein
  `finaler Flex <= aktuell wirksamer rate-limitierter Cap`.
- C-P-20: Jeder Abschlussrecord besitzt
  `actionId === confirmationActionId`; reservierter Namespace,
  Kollisionspruefung, Mixed-Event-Read und Preview-Filter sind verbindlich.
- C-P-21: Abschnitt 14 enthaelt jetzt die eng begrenzte, testpflichtige Ausnahme
  fuer additive optionale Felder/Eventtypen der lokalen v1-Historie. Exporte
  bleiben von dieser Ausnahme ausgeschlossen.
- C-P-22: Bei sliceeigenen Commits und geteilten Dateien sind nur `git revert`
  des exakten Commits oder dokumentierte Hunk-Ruecknahmen zulaessig.
  `mc-log-builder.js` wurde aus Slice 3 entfernt; geteilt bleiben
  `simulator-year-result.js` zwischen Slice 1/3 und `simulator-results.js`
  zwischen Slice 1/2.
- C-P-23: Die Kartenquelle ist explizit das validierte Aggregat. Fehlende oder
  nicht anwendbare Werte erscheinen als `—` mit Grund und Count, niemals als 0.

Auch die Auflagen C-P-24 bis C-P-28 aus Claudes dritter Reviewrunde werden vor
dem ersten Code-Edit eingearbeitet:

- C-P-24: `bear_deep` aktiviert nur bei einem positiven Rohcut oberhalb der
  numerischen Toleranz einen **normalen Bear-Cap**. `bear_deep` mit
  `wealthFactor === 0` liefert fuer diesen normalen Pfad keine Quelle;
  Mindest-Flex bleibt aber nur wirksam, wenn nicht unabhaengig davon das
  zweigliedrige NE-03-Gate wegen mehr als 25 Prozent
  Gesamtvermoegensdrawdown greift.
- C-P-25: Das missverstaendliche Feld `policyWithdrawalRatePct` wird vor dem
  Einfrieren von V2 in `preDecisionWithdrawalRatePct` umbenannt. Der
  Unit-Contract nennt Vorjahres-Flexrate, Phase und Depotnenner woertlich.
- C-P-26: Die Rollback-Regel gilt ausdruecklich auch fuer die zwischen Slice 1
  und 2 geteilte `simulator-results.js`. Slice 1 besitzt mit zehn Dateien keine
  Reserve; jede elfte produktive Abhaengigkeit stoppt den Slice.
- C-P-27: Die Synchronitaetsanforderung und der Ausschluss von
  `crypto.subtle` bleiben angenommen; Claudes damals vorgeschlagene
  Simulator-Importquelle bleibt abgelehnt. Die zwischenzeitlich geplante
  private SHA-256-Hilfe wird durch C-P-30 vollstaendig entbehrlich.
- C-P-28: `safetyCapAnchorStage` wird je Quelle gesetzt:
  `post_internal_smoothing_and_flex_rate_hard_caps` fuer Alarm, Bear-Deep und
  Flexraten-Hard-Cap, `post_spending_guardrails` fuer Spending-Guardrails.

Die Auflagen C-P-29 bis C-P-31 aus Claudes vierter Reviewrunde werden ebenfalls
eingearbeitet:

- C-P-29: Der Punkt wird aufgenommen. Slice 1 ergaenzt im vorhandenen
  V2-Projektionszuschnitt Metadaten fuer Basis, Schwelle, Operator und reine
  Berichtsrolle. Slice 2 uebernimmt die sichtbare Korrektur in Ergebniskarte,
  Heatmap und Auto-Optimize. Der strikt-`>`-KPI und die bin-basierte
  `>=`-Heatmap werden nicht mehr gleich beschriftet. Slice 1 bleibt bei zehn,
  Slice 2 bei hoechstens zehn produktiven Dateien.
- C-P-30: Die Cashabschluss-ID wird direkt und injektiv als
  `cash-confirmation:v1:<normalizedTargetActionId>` gebildet. Anders als der
  107-Zeichen-Vorschlag bleiben alle bisher validen 128-Zeichen-Verkaufs-IDs
  zulaessig; der Leser verwendet stattdessen eventtypspezifisch 128 Zeichen
  fuer Verkauf/Ziel und 149 Zeichen fuer Abschluss-IDs. Hashcode und
  Standardvektoren entfallen.
- C-P-31: Abschnitt 2.5 dokumentiert nun auch die Korrekturen aus Runde 3 und
  die Entscheidungen aus Runde 4 einschliesslich ihrer Abloesungsbeziehungen.

### Antworten auf Geminis Erstrunde

- G-P-01: Durch NE-03 geschlossen. `minimumFlexAnnual` ist Flex und darf in der
  schweren Flex-Notlage bis auf null entfallen. Das marktbedingte Gate ist
  strikt konjunktiv: aktuelles `bear_deep` **und** mehr als 25 Prozent realer
  Drawdown des aktiven Gesamtvermoegens. Ausserhalb davon bleibt Mindest-Flex
  marktbedingte Untergrenze. Der Floor ist absolut vorrangig; fehlende
  Finanzierbarkeit fuehrt zu expliziter Unterdeckung/Ruin, nicht zu einem
  reduzierten Floor.
- G-P-02: Angenommen. Slice 4 erhaelt eine append-only Korrekturkette mit
  `cash_posting_corrected`, Revision, Rueckverweis, Pflichtgrund und eindeutiger
  effektiver Projektion. Kein bestehender Auditrecord wird veraendert.
- G-P-03: Die Blockereinstufung wird abgelehnt, weil der bestehende MC-Vertrag
  Maximum-Drawdowns als positive Verlustbetraege liefert. Die Domaene `[0, 100]`,
  fail-closed Behandlung negativer Werte und die Rundung des positiven Betrags
  werden dennoch explizit abgesichert.
- G-P-04: Bereits durch Abschnitt 3 geloest. Der dokumentierte unsaubere
  Planungsbaum darf nicht als Implementierungsbaseline dienen; vor jedem
  Code-Edit ist ein sauberer oder nachweislich separierter Arbeitsbaum Pflicht.
- G-P-05: Die hohe Einstufung und die implizite Streaming-Anforderung werden
  abgelehnt. Exportiert wird ein bereits materialisierter, laufzeitbegrenzter
  ausgewaehlter Einzelpfad, nicht die Gesamtheit aller MC-Runs. Annahme und
  oberer gueltiger Laufzeit-Grenztest werden nun ausdruecklich dokumentiert.
- G-P-06: Als nicht blockierende Auflage angenommen. Responsive Browsertests
  pruefen grosse centgenaue Werte auf Lesbarkeit und Layoutstabilitaet.
- G-P-07: Sachlich abgelehnt. Eine 129-Zeichen-Verkaufs-/Ziel-ID ist bereits
  ungueltig und wird nicht zur 150-Zeichen-Bestaetigungs-ID abgeleitet; 128 auf
  149 Zeichen ist der gueltige Randfall. Grenztests und verstaendliche Fehler
  bleiben bestehen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| C-P-01 | Claude | Safety-Cap-Contract setzt Alarm und Guardrail gleichzeitig voraus; Code schließt beides gegenseitig aus; dokumentierter Schadensfall liegt vermutlich im Nicht-Alarm-Pfad | angenommen | Jahr 1 direkt belegt; Contract Alarm oder Guardrail |
| C-P-02 | Claude | Realer MC-Drawdown erweitert in Slice 2 den in Slice 1 eingefrorenen V2-Vertrag | angenommen | gesamte KPI-Kette in Slice 1 |
| C-P-03 | Claude | Dateilisten unvollständig; Zehn-Dateien-Stopregel greift erst mitten in der Umsetzung | angenommen | V2-Adapter, zehn produktive Dateien, Vorab-Stop |
| C-P-04 | Claude | Schemaversionsanhebung macht bestehende Reconcile-Historie fail-closed unlesbar | angenommen | keine Versionsanhebung; v1-Recoveryfixture und Backup |
| C-P-05 | Claude | Idempotenter Cashabschluss vertraglich unentschieden (Mutation versus Folgeereignis) | angenommen | append-only Folgeereignis verbindlich |
| C-P-06 | Claude | Namenskollision `minimumFlexEffectiveFinal` weder Slice noch NR-Zeile | angenommen | getrennte V2-Feldnamen in Slice 1 |
| C-P-07 | Claude | Nutzungseinschränkung zu Guardrails wird durch Slice 3 nur teilweise aufgehoben | angenommen | dauerhafter zustandsbezogener Hinweis |
| C-P-08 | Claude | Bezeichner „D-11" dreifach belegt; Quellregister fehlt | angenommen | ENG-07 mit Quellregister und Konstantencontract |
| C-P-09 | Claude | Blast-Radius von Slice 3 unterschätzt (273 Testreferenzen, Diagnose-Textverträge) | angenommen | acht produktive/generierte Dateien und umfassende Testmatrix |
| C-P-10 | Claude | Erwartete Wirkung des Safety-Caps auf das Auslösejahr begrenzt; Delta-Erwartung fehlt | angenommen | numerisches Jahr-1-, isoliertes Jahr-2- und synthetisches Orakel |
| C-P-11 | Claude | Rundungsrichtung nicht pro KPI definiert; Kostenkennzahlen ungeschützt | angenommen | KPI-spezifisches Rundungsorakel |
| C-P-12 | Claude | Testorakel Slice 2 durch Tooltip erfüllbar; personenbezogener Referenzwert | angenommen | Exaktwert primaer; synthetische Fixtures |
| C-P-13 | Claude | `observationCount: {}` und Bin-/Count-Asymmetrie nicht als AK geführt | angenommen | explizite AK und Roundtrip-/Laengentests |
| C-P-14 | Claude | Akzeptierte Steuerabweichungen F7/F10 fehlen in den Nutzungseinschränkungen | angenommen | dauerhafte Kontrollpflichten Abschnitt 4.2 |
| C-P-15 | Claude | Generiertes `engine.js` kollidiert mit der Commit-Sicherheitsprüfung | angenommen | erwartetes Artefakt und mitgezaehlte Datei |
| C-P-16 | Claude (Re-Review) | Szenario-Log ist unversioniertes nacktes Zeilenarray; F2/F3/F8/R5 treten dort auf, Exportpfad ist Nicht-Scope; CSV-Header nur aus Zeile 0 | angenommen | eigener `ScenarioLogExportV2`; gemeinsame JSON-/CSV-Projektion; zehnte Datei in Slice 1 |
| C-P-17 | Claude (Re-Review) | `safetyCapSource` über `kuerzungQuelle` nicht bestimmbar; Glättung überschreibt die Quelle; Ausschlussklausel kann den dokumentierten Fall schlucken | angenommen | strukturelle Trigger- und Binding-Evidenz; positiver Bear-Deep-Rohcut; Anzeigetext ohne Steuerwirkung |
| C-P-18 | Claude (Re-Review) | Cap ankert hinter der internen EMA-/MAX_DOWN-Glättung; „stärkste wirksame Sicherheitsbegrenzung" ist stärker formuliert als geliefert | angenommen | quellenspezifische Anchor-Stage; Rohcut selbst ausdruecklich kein Cap-Wert |
| C-P-19 | Claude (Re-Review) | Jahr-2-Delta-Orakel ist pfadabhängig und im Re-Run nicht haltbar | angenommen | Jahr 2 nur Ein-Jahres-Kontrafaktum; Re-Run nur per jahresweiser Invariante |
| C-P-20 | Claude (Re-Review) | Folgeereignis ohne `actionId` macht die gesamte Reconcile-Historie fail-closed unlesbar | angenommen | `actionId === confirmationActionId`; Namespace/Kollision/Mixed-Event/Preview-Test |
| C-P-21 | Claude (Re-Review) | Slice 4 weicht bewusst von der Versionierungs-Stop-Regel in Abschnitt 14 ab, ohne dass die Ausnahme dort steht | angenommen | testpflichtige Ausnahme fuer lokale additive v1-Historie in Abschnitt 14 |
| C-P-22 | Claude (Re-Review) | Slice 1 und 3 teilen sich zwei Dateien; dateibasierter Rollback nimmt Slice-1-Änderungen mit zurück | angenommen | `mc-log-builder.js` aus Slice 3 entfernt; Commit-/Hunk-Rollback fuer `simulator-year-result.js` und `simulator-results.js` |
| C-P-23 | Claude (Re-Review) | Ergebniskarten lesen Aggregate statt V2-Projektion; `null`-Rendering festzulegen | angenommen | Aggregat als UI-Quelle; `—` plus Grund/Count, nie 0 |
| C-P-24 | Claude (3. Runde) | `bear_deep` triggert den normalen Cap auch bei `wealthFactor === 0`, wo der Code „keine Reduktion nötig" protokolliert; Asymmetrie zur „tatsächlich reduzierend"-Bedingung der anderen Quellen | angenommen | normaler Bear-Trigger nur bei positivem Rohcut; separates NE-03-Gate bleibt davon unabhaengig |
| C-P-25 | Claude (3. Runde) | `policyWithdrawalRatePct` beruht auf der Vorjahres-Flexrate; Messzeitpunkt muss wörtlich im `unitContract` stehen | angenommen | Umbenennung in `preDecisionWithdrawalRatePct`; Messphase und Nenner woertlich fixiert |
| C-P-26 | Claude (3. Runde) | `simulator-results.js` ist neu zwischen Slice 1 und 2 geteilt; Commit-Rollback-Regel ausdehnen; Slice 1 ohne Dateireserve | angenommen | geteilte Datei explizit; Commit-/Hunk-Rollback; elfte Datei stoppt |
| C-P-27 | Claude (3. Runde) | Kanonische ID braucht synchrones `sha256Hex` aus `historical-backtest-contract.js`; `crypto.subtle` wäre asynchron und bräche die Commit-Atomarität | teilweise angenommen, durch C-P-30 ueberholt | synchroner Commit und kein Simulatorimport; direkte ID macht Hashcode entbehrlich |
| C-P-28 | Claude (3. Runde) | `safetyCapAnchorStage` beschriftet die Quelle `spending_guardrail` falsch | angenommen | zwei quellenspezifische Anchor-Stage-Werte |
| C-P-29 | Claude (4. Runde) | Heatmap und KPI „Zeitanteil Quote > 4,5 %" beruhen auf `entnahmequote`, die 4,5-%-Schwelle gilt im Modell für `entnahmequoteDepot`; `simulator-heatmap.js` in keinem Slice gelistet | angenommen | V2-Messmetadaten in Slice 1; eindeutige `>`-/`>=`-Beschriftung und Berichtsrollenhinweis in Slice 2 |
| C-P-30 | Claude (4. Runde) | Private SHA-256-Kopie vermeidbar; `cash-confirmation:v1:<targetActionId>` ist injektiv und braucht keine neue Kryptoimplementierung | angenommen mit abweichender Laengenregel | direkte ID; Verkauf/Ziel max. 128, Abschluss max. 149; kein Hash oder Simulatorimport |
| C-P-31 | Claude (4. Runde) | Abschnitt 2.5 dokumentiert nur die Reviewrunden 1 und 2, Status weist v4 aus | angenommen | Runden 3 und 4 samt abgeloester Zwischenentscheidungen in Abschnitt 2.5 ergaenzt |
| C-14 | Claude (5. Runde) | Null-Flex-Gate prueft nicht die alarmunterdrueckende Entnahmebelastung `wealthFactor` | Contract-/Testluecke angenommen; dritte Gatebedingung abgelehnt | `wealthFactor` diagnostisch, Gate bewusst auch bei Faktor 0 aktiv; fehlende Matrixzelle und Zwei-Jahres-Test |
| C-15 | Claude (5. Runde) | Floor-Unterdeckung koennte entgegen dem Plan fortlaufend gemessen statt als Ruin beendet werden | Belegforderung angenommen; neue Semantikannahme abgelehnt | vorhandenes `ruin`-Jahresresultat und Standard-`BREAK_ON_RUIN = true` belegt; optionaler Diagnosemodus und Metriken unveraendert |
| C-16 | Claude (6. Runde) | Gate-Schwelle erzeugt Alles-oder-nichts-Kante; Ruecksprung ueber die Schwelle (25,3 → 24,5 → 25,3 %) ist nicht als Delta-Orakel abgedeckt | offen (niedrig) | - |

**Bestaetigungen aus Claudes sechster Runde:** C-14 ist geschlossen; die
Ablehnung der dritten Gatebedingung ist wegen der Endogenitaet von
`wealthFactor` technisch berechtigt. C-15 ist widerlegt; der Beleg
(`simulator-data.js:681`, `monte-carlo-runner.js:765/:860`,
`historical-backtest-cohorts.js:200`, `simulator-engine-direct.js:268-281`)
haelt der Nachpruefung stand.
| G-P-01 | Gemini | Nutzerentscheidung zur konkreten Mindest-Flex-Unterschreitung fehlt | durch NE-03 geschlossen | Null-Flex nur bei `bear_deep` und >25 % realem aktivem Gesamtvermoegensdrawdown; Floor absolut vorrangig |
| G-P-02 | Gemini | Tippfehler im bestaetigten Cashstand ist im Append-only-Modell unkorrigierbar | angenommen | revisionssicheres `cash_posting_corrected`-Folgeereignis |
| G-P-03 | Gemini | Negative Drawdownwerte koennten optimistisch gerundet werden | Blockereinstufung abgelehnt; Praezisierung angenommen | positive Verlustdomaene `[0, 100]`, negative Werte fail-closed, Betrag konservativ runden |
| G-P-04 | Gemini | unsauberer Arbeitsbaum vor Branch-Erstellung | bereits umgesetzt; Duplikat | Abschnitt 3 verbietet den Planungsbaum als Implementierungsbaseline |
| G-P-05 | Gemini | Vereinigungsheader verhindert Streaming und erzwingt Gesamtspeicherung | hohe Einstufung und Streamingforderung abgelehnt; Annahme dokumentiert | begrenzter bereits materialisierter Einzelpfad plus Laufzeit-Grenztest |
| G-P-06 | Gemini | centgenaue grosse Werte koennen Kartenlayout brechen | angenommen, nicht blockierend | responsive Browser-Layouttests |
| G-P-07 | Gemini | 129-Zeichen-Ziel erzeuge blockierte 150-Zeichen-Bestaetigung | abgelehnt; Vorbedingung ungueltig | Ziel max. 128, daraus Bestaetigung exakt 149; Fehler-/Grenztests bleiben |
