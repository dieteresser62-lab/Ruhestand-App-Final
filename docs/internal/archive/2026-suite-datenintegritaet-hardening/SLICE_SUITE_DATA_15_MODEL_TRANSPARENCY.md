# Slice 15 - Fachentscheidungen und Modelltransparenz

**Arbeitsplan:** `SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** Feature-Branch vorhanden; Push bleibt nutzerfreigabepflichtig  
**Status:** Basisfreigabe erteilt; T15-1 technisch nachgebessert, gezieltes Re-Review ausstehend  


**Findings:** ENG-07, OPT-05, SIM-06-/IMP-03-Entscheidungsanteile,
MOD-01 bis MOD-08  
**Prioritaet:** Entscheidung/P2  
**Beginn:** 2026-07-28

## Ziel

Technische Testabdeckung, interne Plausibilisierung und externe fachliche
Validierung werden als getrennte Statuswerte gefuehrt. Offene Steuer-,
Ausgaben-, Reconciliation-, Demografie- und Alarmentscheidungen bleiben
sichtbar offen. Markt-, Pflege-, Mortalitaets-, Renten- und Steuerannahmen
erhalten Quelle, Datenstand, Einheit, Geltungsbereich, Owner und naechsten
Reviewtermin. Slice 15 aendert keine Steuer-, Pflege-, Mortalitaets-,
Rendite-, Kosten- oder Entnahmesemantik.

## Akzeptanzkriterien

1. Jede inventarisierte Modellgrenze nennt Owner, Quelle, Datenstand,
   Geltungsbereich, Status und naechsten Reviewtermin.
2. `technisch getestet`, `intern plausibilisiert` und `extern validiert`
   bleiben getrennte, nicht voneinander abgeleitete Statusachsen.
3. Ergebnis-/Exportvertraege nennen Modell-/Datenversionen und relevante
   experimentelle Flags.
4. Die Abweichung der vereinfachten Kirchensteuerberechnung von der Formel
   nach Paragraph 32d EStG ist mit einer begrenzten Beispielrechnung sichtbar;
   eine Formelkorrektur bleibt einem eigenen Steuerplan vorbehalten.
5. Pflege-, Renten-, Mortalitaets- und Renditeannahmen werden nicht ohne
   Quellen- und Stichtagsnachweis als aktuell bezeichnet.
6. D-10 bis D-12, D-15 und die fachliche Weiterentwicklung aus D-16 bleiben
   offen. D-13, D-14 und D-18 werden nur entsprechend bereits umgesetzter
   Slices rueckdokumentiert.
7. Sweep und Auto-Optimize sind in Ergebnis-/Nutzersicht als experimentelle
   Vergleichsverfahren und nicht als fachliche Empfehlung gekennzeichnet.

## Scope

Programmdateien:

- `app/simulator/auto_optimize.js`
- `app/simulator/auto-optimize-renderer.js`
- `scripts/check-architecture-evidence.mjs`
- `Simulator.html`

Tests:

- `tests/auto-optimizer.test.mjs`
- `tests/auto-optimize-fidelity.test.mjs`
- `tests/architecture-evidence.test.mjs`

Dokumentation:

- diese Slice-Datei;
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`;
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`;
- `docs/internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md`;
- `docs/reference/DATA_SOURCES.md`;
- `docs/reference/BALANCE_MODULES_README.md`;
- `docs/reference/SIMULATOR_MODULES_README.md`;
- `docs/reference/TRANCHEN_MODULES_README.md`;
- `docs/reference/AUTO_OPTIMIZE_DETAILS.md`;
- `docs/reference/TECHNICAL.md`;
- `README.md`;
- `Handbuch.html`.

## Nicht-Scope

- keine Aenderung der Kirchensteuerformel oder eines anderen Steuerpfads;
- keine Aenderung von Pflege-, Mortalitaets-, Renten-, Rendite-, Kosten-,
  FX-, Asset- oder Entnahmemodellen;
- keine Aenderung der Ausgabenaggregation oder automatisches Buchen von
  Verkaufserloesen;
- keine Erweiterung der Demografie ueber zwei Personen;
- keine neue Alarmstaerkenformel;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung an `workers/`, `dist/`, `src-tauri/` oder
  Release-Artefakten.

## Startcheck und Diff-Risiko

Ausgefuehrt am 2026-07-28:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
<leer>
```

Der Branch stimmt mit dem Arbeitsplan ueberein. Slice 14 ist als Commit
`cdecdac` vorhanden und laut Hauptplan freigegeben.

```text
Geplante Dateien:
- app/simulator/auto_optimize.js
- Simulator.html
- tests/auto-optimizer.test.mjs
- tests/auto-optimize-fidelity.test.mjs
- Slice-/Hauptplan-, Referenz-, Modul- und Nutzerdokumentation

Voraussichtliche Aenderungstiefe:
- niedrig bis mittel (reine Ergebnis-/Anzeige-Metadaten und Dokumentation)

Gefaehrdete bestehende Tests:
- Auto-Optimize Ergebnisvertrag und UI-Fidelity
- Doku-Evidenz, lokale Links und statische HTML-Vertraege
- Browser-Smokes der Simulator-Einstiegsseite

Nicht anfassen:
- Steuer-, Pflege-, Mortalitaets-, Rendite-, Kosten- und Entnahmelogik
- engine.js, workers/, dist/, src-tauri/, Release-Artefakte

Rollback-Strategie:
- git checkout -- app/simulator/auto_optimize.js Simulator.html
  tests/auto-optimizer.test.mjs tests/auto-optimize-fidelity.test.mjs
  und die geaenderten vorhandenen Dokumente
- diese neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen
```

Die Stopregel greift beim Start nicht: zwei geplante Programmdateien liegen
unter dem Slice-Limit von vier. Die Metadaten kennzeichnen vorhandene
Berechnungsergebnisse, ohne deren Auswahl, Ranking oder Rechensemantik zu
veraendern.

### Nachbesserungscheck nach Review

Ausgefuehrt am 2026-07-28 nach den uebereinstimmenden Claude-/Gemini-Reviews:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
<bestehender, ausschliesslich Slice 15 zugeordneter Diff>
```

```text
Zusaetzliche geplante Programmdatei:
- app/simulator/auto-optimize-renderer.js

Voraussichtliche Aenderungstiefe:
- niedrig bis mittel (Darstellung und Metadatenkopplung, keine Rankinglogik)

Gefaehrdete bestehende Tests:
- Auto-Optimize Renderer-/Apply-Helfer
- Auto-Optimize Ergebnisvertrag und UI-Fidelity
- Simulator- und Handbuch-Browser-Smokes

Nicht anfassen:
- Steuer-, Pflege-, Mortalitaets-, Rendite-, Kosten- und Entnahmelogik
- engine.js, workers/, dist/, src-tauri/, Release-Artefakte

Rollback-Strategie:
- git checkout -- app/simulator/auto-optimize-renderer.js
  app/simulator/auto_optimize.js Simulator.html
  tests/auto-optimizer.test.mjs tests/auto-optimize-fidelity.test.mjs
  und die geaenderten vorhandenen Dokumente
```

Mit Renderer, Auto-Optimize-Orchestrator, `Simulator.html` und dem als
produktnah konservativ mitgezaehlten `Handbuch.html` ist das Slice-Limit von
vier Programmdateien exakt ausgeschoepft. Weitere Programmdateien sind ohne
erneute Nutzerfreigabe ausgeschlossen.

### T15-1-Entscheidungs- und Scopecheck

Am 2026-07-28 entschied der Nutzer T15-1 fuer einen separaten,
datumssensitiven Doku-Gate innerhalb von Slice 15. `npm test` soll fuer
denselben Commit unabhaengig vom Systemdatum reproduzierbar bleiben;
`npm run docs:evidence` soll ueberfaellige Matrixtermine gegen das Berliner
Tagesdatum pruefen. Der Nutzer genehmigte dafuer
`scripts/check-architecture-evidence.mjs` ausdruecklich als fuenfte
Programmdatei. Weitere Programmdateien sind nicht genehmigt.

## Geplante Umsetzung

1. Auto-Optimize-Ergebnisse um einen versionierten Modellstatus mit
   Modellversion, Datenhashes, Experimentstatus und getrennten
   Validierungsachsen ergaenzen.
2. Auto-Optimize in der Simulator-Oberflaeche sichtbar als experimentelles
   Vergleichsverfahren und nicht als fachliche Empfehlung kennzeichnen.
3. Eine zentrale Modell-/Datenstandsmatrix mit Ownern, Quellen, Einheiten,
   Geltungsbereichen, drei Statusachsen und Reviewterminen pflegen.
4. D-10 bis D-18 mit aktuellem Implementierungs- und Entscheidungsstatus
   inventarisieren; offene Entscheidungen nicht durch Codex treffen.
5. Steuerabweichung und aktuelle Ausgaben-, Reconciliation- und
   Mehrpersonenvertraege in Nutzer- und Moduldokumentation sichtbar machen.
6. Forschungsbacklog und Datenquellen um die noch fehlenden externen
   Kalibrierungs- und Reviewpakete ergaenzen.

## Geplante Gates

- `node tests/run-single.mjs tests/auto-optimizer.test.mjs`;
- `node tests/run-single.mjs tests/auto-optimize-fidelity.test.mjs`;
- `npm run docs:evidence`;
- `npm test`;
- `npm run test:browser`;
- Konsistenzcheck gegen `README.md`, `docs/reference/TECHNICAL.md`,
  Modul-READMEs und `Handbuch.html`;
- `git diff --check`;
- Programmdiff-Zaehler und Verbotsbereichscheck.

## Primaerquellen-Check

Abruf am 2026-07-28. Die Quellen sind Vergleichs- und
Validierungsausgangspunkte; ihre Nennung importiert noch keine Werte in das
Modell.

| Domaene | Primaerquelle | Quellen-/Datenstand | Begrenzung fuer Slice 15 |
| --- | --- | --- | --- |
| Steuer | [Paragraph 32d EStG](https://www.gesetze-im-internet.de/estg/__32d.html) und [BMF/LStH 2026, Paragraph 43a](https://lsth.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/VI-Steuererhebung-36-47/3-Steuerabzug-vom-Kapitalertrag-KapSt-43-45e/Paragraf-43a/inhalt.html) | Gesetz-/Handbuchstand 2026; Abruf 2026-07-28 | Dokumentiert nur die Abweichung; keine Steuerberatung und keine Formelumstellung. |
| Pflegeleistungen | [BMG-Leistungsuebersicht](https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-der-pflegeversicherung/leistungen-im-ueberblick/seite) | Seite zuletzt aktualisiert 2026-02-13; Abruf 2026-07-28 | Leistungsbetraege sind kein Inzidenz- oder Progressionsmodell. |
| Pflegebestand | [Destatis: Pflegebeduerftige Ende 2023](https://www.destatis.de/DE/Presse/Pressemitteilungen/2024/12/PD24_478_224.html) | Datenstand Ende 2023; Veroeffentlichung 2024-12-18 | Bestandsdaten ersetzen keine individuelle Uebergangskalibrierung. |
| Mortalitaet | [Destatis: Sterbetafeln](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Sterbefaelle-Lebenserwartung/sterbetafel.html) | aktuelle Periodensterbetafel 2023/2025; Seite 2026-07-07; Abruf 2026-07-28 | Periodentafel bildet keine kuenftige Mortalitaetsverbesserung ab. |
| Rente | [DRV: Werte der Rentenversicherung](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Zahlen-und-Fakten/Werte-der-Rentenversicherung/werte-der-rentenversicherung_node.html) | Abruf 2026-07-28 | Die App uebernimmt Nutzerwerte; amtliche Werte werden nicht automatisch importiert. |

## Finding-Traceability

| Finding | Entscheidung / Modellgrenze | Behandlungsort in Slice 15 |
| --- | --- | --- |
| ENG-07 | D-11 / MS-10 | konstante Alarmstaerke im Entscheidungsregister und in der Modellmatrix; monotone Fachfunktion bleibt Folgeslice |
| OPT-05 | D-18 / MS-08 | kanonischer Sampling-/CAPE-Contract, `AutoOptimizeModelStatusV1`, Ergebnisanzeige und Experimentstatus |
| SIM-06 Entscheidungsanteil | D-19 | statusbasierte Outcome-Klassifikation und erhaltener Nullwert rueckdokumentiert |
| IMP-03 Entscheidungsanteil | D-13 | konservativer Window-High-Unterrand aus Slice 12 rueckdokumentiert |
| MOD-01 | D-10 / MS-02 | vereinfachte Kirchensteuerformel, amtlicher Vergleich und begrenztes Rechenbeispiel |
| MOD-02 | D-12 / MS-03 | Netto-Cash-Abfluss statt Bruttoausgabe in Architektur, Balance-Moduldoku und Handbuch |
| MOD-03 | D-15 / MS-04 | keine automatische Liquiditaetsbuchung nach Reconciliation in Architektur, Tranchen-Moduldoku und Handbuch |
| MOD-04 | D-16 / MS-05 | V1-Demografie auf zwei Personen begrenzt; sichtbare Warnung und Nutzer-/Moduldoku |
| MOD-05 | MS-05 bis MS-07 | getrennte Mortalitaets-, Pflege- und Rentenquellen, Kalibrierungsstatus, Owner und Reviewtermine |
| MOD-06 | MS-01 | geschaetzte Historie 1925-1949, unresolved Returnvariante, Datenrevision und Ausschlussfilter |
| MOD-07 | MS-09 | fehlende Kosten-/FX-/breite Assetmodelle; technischer Status `entfaellt` |
| MOD-08 | MS-08 | Sweep-Ranking und Auto-Optimize sichtbar experimentell; keine fachliche Empfehlung |

## Entscheidungsregister

| ID | Stand in Slice 15 | Entscheidung |
| --- | --- | --- |
| D-10 | offen | Kirchensteuer bleibt vereinfachte Modellformel. Gesetzesnahe Umstellung und Steuerjahresversionierung benoetigen einen eigenen freigegebenen Steuerplan. |
| D-11 | offen | Alarmstaerke ist bei Unterdeckung derzeit effektiv konstant `10`. Eine monotone Funktion ist nicht beschlossen und darf nur in einem Engine-Folgeslice eingefuehrt werden. |
| D-12 | offen | Die Ausgabenkennzahl saldiert vorzeichenbehaftete Kategorien und bildet danach den Betrag; sie ist daher Netto-Cash-Abfluss, nicht Bruttoausgabe. |
| D-13 | entschieden | Slice 12 verwendet fuer das konservative Feld den Window-High-Unterrand; keine Neuentscheidung in Slice 15. |
| D-14 | entschieden | Slice 11 fuehrt Terminal-Outcomes als Primaervertrag; `0` bleibt gueltiger Zustand. |
| D-15 | offen | Reconciliation entfernt bestaetigte Lots, bucht Verkaufserloese aber nicht automatisch als freie Liquiditaet. |
| D-16 | teilweise als V1-Geltungsbereich festgehalten | Finanzwerte koennen aus mehr als zwei Profilen aggregiert werden; die Demografie modelliert hoechstens zwei Personen und zeigt bei mehr Profilen eine Warnung. Eine echte Mehrpersonendemografie bleibt offen. |
| D-18 | technisch in Slice 10 geschlossen | Auto-Optimize erbt den kanonischen Monte-Carlo-Sampling-/CAPE-Vertrag und meldet ihn im Ergebnis. Die externe fachliche Validierung bleibt offen. |
| D-19 | entschieden | Slice 6 bindet erfolgreiche Outcomes an den Status; 0 EUR bleibt ein beobachteter Wert und wird nicht per Truthiness entfernt. |

## Durchgefuehrte Aenderungen

1. `auto_optimize.js` gibt fuer jeden abgeschlossenen Lauf
   `AutoOptimizeModelStatusV1` aus. Der Contract enthaelt
   Evaluation-Modellversion, Jahresdaten-/Regimehash des Datenuniversums,
   effektive Startjahr-/Estimated-History-Auswahl,
   `methodClassification=experimental`,
   `technicalTestStatus=technically_tested`,
   `internalPlausibilityStatus=partially_plausibilized`,
   `externalValidationStatus=not_validated` und
   `decisionUse=scenario_comparison_only`. Ein Custom-Evaluator wird
   `custom_evaluator_not_assessed` zugeordnet und erbt keine eingebauten
   Datenhashes.
2. Die Auto-Optimize-Oberflaeche bezeichnet das Verfahren sichtbar als
   experimentellen Szenariovergleich. Ergebnisblock und Apply-Bestaetigung
   wiederholen, dass der Champion weder fachliches Optimum noch
   Finanzempfehlung ist. Die Ergebnisanzeige rendert Schema, Modellversion,
   Datenuniversum, effektive Datenauswahl und alle drei Validierungsachsen.
3. Das Architektur- und Fachkonzept fuehrt eine zentrale Matrix fuer Markt,
   Steuer, Ausgaben, Reconciliation, Mortalitaet, Pflege, Rente,
   Sweep/Auto-Optimize, Kosten/FX/Assetraum und Alarmstaerke. Jede Zeile nennt
   Owner-Rolle, Quelle/Datenstand, Einheit, Geltungsbereich, drei
   Validierungsachsen und Reviewtermin.
4. D-10 bis D-16, D-18 und D-19 sind mit ihrem vorhandenen Ist-Contract und
   Entscheidungsstatus inventarisiert. D-10 bis D-12, D-15 und die
   Mehrpersonenerweiterung aus D-16 bleiben offen. D-13, D-14, D-18 und D-19
   werden nur entsprechend bereits umgesetzter Slices rueckdokumentiert.
5. Die vereinfachte Kirchensteuerformel ist gegen Paragraph 32d EStG und
   BMF/LStH Paragraph 43a abgegrenzt. Das begrenzte Beispiel fuer 8/9 %
   Kirchensteuer macht die Abweichung sichtbar, ohne eine Rechts- oder
   Steuerberatung zu behaupten.
6. `DATA_SOURCES.md` und der Forschungsbacklog nennen amtliche
   Vergleichsquellen, Daten-/Abrufstaende, Einheiten, Owner-Luecken und
   Reviewtermine. BMG-/Destatis-/DRV-Nennungen werden ausdruecklich nicht als
   importierte Kalibrierung dargestellt.
7. README, Handbuch, technische Referenz sowie Balance-, Simulator-,
   Tranchen- und Auto-Optimize-Dokumentation nennen die aktuellen Grenzen:
   Netto- statt Bruttoausgaben, keine automatische Cashbuchung nach
   Reconciliation, maximal zwei demografische Personen, experimentelle
   Rankings und nicht modellierte Kosten/FX/Assetklassen.
8. Das maschinenlesbare `ModelValidationStatusVocabularyV1` bildet
   `technically_tested/partially_plausibilized/not_validated` explizit auf
   `ja/teilweise/nein` der Dokumentmatrix ab. Custom-Evaluatoren verwenden
   `nicht bewertet`.
9. Der deterministische Fidelity-Test prueft MS-01 bis MS-10 auf
   Spaltenvollstaendigkeit, Owner, Quellen-/Contractdatum, getrennte
   Statusachsen und vorhandene Reviewtermine. Er loest ausserdem alle lokalen
   Links des Forschungsbacklogs gegen das Dateisystem auf.
10. Der datumssensitive Doku-Gate `npm run docs:evidence` prueft die
    Matrixtermine gegen das Berliner Tagesdatum und meldet Ueberfaelligkeit
    stabil als `OVERDUE_MODEL_REVIEW`. `npm test` verwendet fuer diesen
    Vertrag ausschliesslich injizierte Stichtage.

## Testergebnisse

- `node tests/run-single.mjs tests/auto-optimizer.test.mjs`: 101/101
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/auto-optimize-fidelity.test.mjs`: 192/192
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/architecture-evidence.test.mjs`: 23/23
  Assertions, 0 Fehler.
- `node --check app/simulator/auto_optimize.js`: gruen.
- `node --check app/simulator/auto-optimize-renderer.js`: gruen.
- `node --check scripts/check-architecture-evidence.mjs`: gruen.
- `npm run docs:evidence`: gruen; 69 MKT-Records, 55 FOR-Records,
  17 MAP-Anker, 11 Markt- und 7 Forschungs-Reviewscopes sowie 10
  Matrix-Reviewtermine.
- `npm test`: 136 Testdateien, 8.823/8.823 Assertions, 0 Fehler,
  0 offene Handles.
- `npm run test:browser`: 23/23 Smokes einschliesslich `Simulator.html` und
  `Handbuch.html`.
- `git diff --check`: gruen.
- Programmdiff nach der projektweiten Stopregel: exakt fuenf Dateien
  (`app/simulator/auto_optimize.js`,
  `app/simulator/auto-optimize-renderer.js`,
  `scripts/check-architecture-evidence.mjs`, `Simulator.html`,
  `Handbuch.html`); die fuenfte Datei ist fuer T15-1 ausdruecklich durch den
  Nutzer genehmigt.
- `engine.js`, `engine/`, `workers/`, `dist/`, `src-tauri/` und
  Release-Artefakte sind unveraendert.

## Abweichungen vom Plan

- Der Hauptplan schlug den Dateinamen
  `SLICE_SUITE_DATA_15_MODEL_DECISIONS.md` vor. Vor der Umsetzung wurde der
  praezisere Name `SLICE_SUITE_DATA_15_MODEL_TRANSPARENCY.md` angelegt und im
  Hauptplan verlinkt.
- `docs/reference/TECHNICAL.md` war im ersten Scope-Inventar nur als
  Konsistenzziel genannt, obwohl es geaendert wurde. Es ist nun explizit im
  Dokumentationsscope aufgefuehrt.
- Nach S15-1/S15-2 wurde `app/simulator/auto-optimize-renderer.js` als vierte
  und letzte produktnahe Datei aufgenommen. Sie macht den bereits erzeugten
  Modellstatus in Ergebnis- und Apply-Sicht erreichbar.
- Fuer T15-1 genehmigte der Nutzer nach der Basisfreigabe
  `scripts/check-architecture-evidence.mjs` als fuenfte Programmdatei. Die
  kalenderabhaengige Terminueberwachung wurde aus der Gesamtsuite in den
  bereits datumssensitiven Doku-Gate verschoben.
- Eine Steuerformel-, Daten- oder Fachsemantikaenderung war nicht erforderlich
  und wurde entsprechend der Stopregel nicht vorgenommen.
- `Handbuch.html` ist inhaltlich Nutzerdokumentation, zaehlt wegen seiner
  Dateiendung fuer den konservativen Programmdiff-Zaehler dennoch als dritte
  produktnahe Datei.

## Offene Risiken

- D-10, D-11, D-12 und D-15 sind weiterhin fachlich offen. D-16 begrenzt den
  V1-Contract auf zwei demografische Personen; eine echte
  Mehrpersonendemografie bleibt ein Folgevorhaben.
- Keine Markt-, Steuer-, Pflege-, Mortalitaets-, Renten-, Kosten- oder
  Optimizerannahme wurde extern validiert. Die amtlichen Quellen sind
  Ausgangspunkte fuer getrennte Fach-/Forschungspakete.
- Die historischen Serienvarianten und Lizenzen bleiben unresolved; 1925-1949
  bleibt geschaetzt.
- Reviewtermine werden nicht als Faelligkeit in der UI angezeigt.
  `npm run docs:evidence` schlaegt kalenderabhaengig mit
  `OVERDUE_MODEL_REVIEW` fehl, sobald ein Matrixtermin ueberfaellig ist;
  `npm test` bleibt fuer denselben Commit reproduzierbar.
- `AutoOptimizeModelStatusV1` traegt reproduzierbare
  Datenuniversum-Hashes und die effektive Filterauswahl, aber keine externe
  Holdout- oder Replikationsfreigabe. Train-/Bestaetigungsseeds aus demselben
  Modell ersetzen keinen externen Holdout.
- `technicalTestStatus=technically_tested` bezeichnet dokumentierte
  Repository-Contract-Evidenz, nicht die Live-Gesundheit einer beim Nutzer
  laufenden Testsuite; `evidenceBoundary` macht diese Grenze maschinenlesbar.

## Rueckdokumentation

Scope, Entscheidungen, Quellencheck, Implementierung, Gates, Dateibudget,
Abweichungen und offene Risiken sind in diesem Slice-Dokument und im Hauptplan
rueckdokumentiert. Architektur-/Nutzer-/Moduldokumentation ist auf den
aktuellen Ist-Contract synchronisiert.

## Freigabestatus

- Technische Nachbesserung: abgeschlossen (S15-1..10 und T15-1 vollständig behoben)
- Selbstpruefung Codex: technisch abgeschlossen, keine Eigenfreigabe
- Re-Review Claude: erfolgreich abgeschlossen; Slice 15 ist freigegeben
- Re-Review Gemini: erfolgreich abgeschlossen; Slice 15 ist freigegeben
- Gesamt-Freigabestatus: FREIGEGEBEN
- Lokaler Commit: abgeschlossen
- Push: ausstehend; nur nach ausdruecklicher Nutzerfreigabe




## Review-Feedback

Fuer das unabhaengige Review reserviert.


## Review-Feedback von Claude

**Reviewdatum:** 2026-07-28
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `cdecdac` (Slice 14).

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/auto-optimizer.test.mjs` | 91/91 Assertions, 0 Fehler |
| `node tests/run-single.mjs tests/auto-optimize-fidelity.test.mjs` | 123/123 Assertions, 0 Fehler |
| `npm run docs:evidence` | gruen; 69 MKT, 55 FOR, 17 MAP, 11/7 Reviewscopes |
| `npm test` | 8.740/8.740 Assertions, 0 Fehler, 0 offene Handles, Exit 0 |
| `npm run test:browser` | 23/23 Smokes, Exit 0 |
| `node --check app/simulator/auto_optimize.js` | gruen |
| `git diff --check` | gruen |
| Programmdiff | `app/simulator/auto_optimize.js`, `Simulator.html`, `Handbuch.html` |
| Verbotene Bereiche | `engine.js`, `engine/`, `workers/`, `dist/`, `src-tauri/` unveraendert |

Alle von Codex genannten Zahlen sind reproduzierbar. Die Gates belegen jedoch
nicht, was dieses Slice liefern soll; siehe S15-7.

### Blocker

**S15-1 - `AutoOptimizeModelStatusV1` hat keinen einzigen Konsumenten, waehrend
sechs Dokumente das Gegenteil behaupten.**

Gemessen ueber `renderAutoOptimizeResult` mit einem vollstaendig besetzten
Modellstatus (gerendertes HTML: 5.018 Zeichen):

| Gesuchtes Feld | im gerenderten Ergebnis-HTML |
|---|---|
| `AutoOptimizeModelStatusV1` | fehlt |
| `experimental` | fehlt |
| `not_validated` | fehlt |
| `partial` | fehlt |
| `scenario_comparison_only` | fehlt |
| `annualDataHash` `614993a3` | fehlt |
| `regimeHash` `50aa7f99` | fehlt |
| `Modellversion` / `Validier...` | fehlt |

`renderAutoOptimizeResult` destrukturiert `championCfg`, `metricsTest`,
`deltaVsCurrent`, `stability`, `optimizationContext` und `parameterFidelity` -
`modelStatus` nicht. Eine projektweite Suche findet ausserhalb der
Erzeugungsstelle keinen weiteren Treffer fuer `modelStatus`; einen
Auto-Optimize-Export gibt es nicht. Das Feld ist ausschliesslich ueber
`window.aoChampionResult` in der Browserkonsole erreichbar.

Dem stehen gegenueber:

- `Handbuch.html`: "Das Ergebnis nennt Modellversion, Datenhashes sowie
  getrennte technische, interne und externe Validierungsstatuswerte" und die
  ausdrueckliche Handlungsanweisung "Lesen Sie deshalb Modellstatus,
  Datenhashes und Ergebnisbuendel";
- `README.md`: "Das Ergebnis nennt Modellversion, Datenhashes und getrennte
  technische/interne/externe Validierungsstatuswerte";
- `TECHNICAL.md`, `AUTO_OPTIMIZE_DETAILS.md`, `SIMULATOR_MODULES_README.md`
  und `ARCHITEKTUR_UND_FACHKONZEPT.md` mit gleichlautenden Aussagen unter
  "Modellstatus in Ergebnissen und Exporten".

Ein Nutzer, der der Anweisung des Handbuchs folgt, findet nichts. Damit
erzeugt ausgerechnet der Transparenzslice eine Dokumentationsaussage ohne
Substanz - dieselbe Fehlerklasse, die MOD-08 beschreibt. AK-3 ist fuer die
Nutzer- und Exportsicht nicht erfuellt.

Behebbar entweder durch Ausgabe des Modellstatus in der Ergebnisanzeige
(Programmaenderung) oder durch Praezisierung der sechs Dokumente auf das, was
tatsaechlich existiert - ein Feld im Rueckgabeobjekt. Die zweite Variante ist
eine reine Dokumentationskorrektur und sprengt den Scope nicht.

**S15-2 - AK-7 ist in der Ergebnissicht nicht erfuellt.**

Die neue Kennzeichnung steht ausschliesslich im Einleitungsabsatz oberhalb des
Konfigurationsformulars (`Simulator.html` Zeile 1166 ff.). Die Ergebnisdarstellung
traegt keinen Vorbehalt; im gerenderten HTML kommen `Experiment`,
`experimentell`, `Empfehlung`, `keine Finanz` und `Optimum` nicht vor. Der
Ergebnisblock ist mit "Champion Configuration" ueberschrieben und zeigt
Parameterkarten ohne Einordnung.

Verschaerfend: `appendAutoOptimizeApplySuccess` bestaetigt die Uebernahme in
die reale Konfiguration mit einer gruenen Erfolgsmeldung
("Konfiguration uebernommen. Eine spaetere Profilauswahl kann profilgebundene
Felder erneut setzen.") - genau in dem Moment, in dem der Nutzer den
Modellkandidaten zu seiner Einstellung macht, steht kein Vorbehalt. AK-7
verlangt die Kennzeichnung in der Ergebnis- *und* Nutzersicht; erfuellt ist
nur die zweite.

**S15-3 - der neu eingefuegte Verweis auf die zentrale Matrix ist tot.**

`docs/internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md` Zeile 71 verlinkt
`../reference/ARCHITEKTUR_UND_FACHKONZEPT.md#modell--datenstands--und-validierungsmatrix`.
Aus `docs/internal/archive/` fuehrt `../reference/` nach
`docs/internal/reference/`; dieses Verzeichnis existiert nicht. Korrekt waere
`../../reference/...`. Verifiziert per Pfadtest.

Der Ankertext selbst ist richtig gebildet. Zwei bereits vorhandene Links
(Zeilen 10 und 12) tragen denselben Fehler, sind aber nicht in diesem Slice
entstanden - eine Sammelkorrektur liegt nahe. Dass ein Doku-Slice, dessen
einziges Produkt Nachvollziehbarkeit ist, die Verbindung zwischen
Forschungsbacklog und Modellmatrix ins Leere laufen laesst, ist der Grund fuer
die Einstufung als Blocker; der Aufwand der Behebung ist minimal.

### Restrisiken

**S15-4 - der Modellstatus ist eine Konstante ohne Kopplung an den Lauf.**
`buildAutoOptimizeModelStatus()` nimmt keine Parameter. `technicalTestStatus`
bleibt `tested`, auch wenn die Testsuite rot ist. Ruft ein Aufrufer
`runAutoOptimize` mit eigener `evaluateCandidateFn` auf, meldet der Status
dennoch `AutoOptimizeEvaluationContractV1` und die eingebauten Datenhashes,
obwohl mit diesem Vertrag und diesen Daten gar nicht gerechnet wurde. Genau
das tut der neue Test in `tests/auto-optimizer.test.mjs` Zeile 718 ff.: Er
laeuft mit `mockEvaluate` und assertiert dabei "den verwendeten
Jahresdatenhash". Die Assertion prueft die Kopplung, die sie behauptet, gerade
nicht. Produktiv wird der Hook derzeit nicht gesetzt.

**S15-5 - `dataVersion` beschreibt die Datenlieferung, nicht die verwendete
Stichprobe.** `getDataVersion()` hasht `annualData` und `REGIME_TRANSITIONS`
vollstaendig (gemessen: 101 Eintraege, 1925-2025, `annualDataHash 614993a3`,
`regimeHash 50aa7f99`, parameterlos, zwei Aufrufe identisch). Startjahrfilter,
Halbwertszeit und `excludeEstimatedHistory` veraendern die tatsaechlich
verwendete Datenbasis, nicht den Hash. Zwei Laeufe mit unterschiedlichem
Datenfilter sind am Modellstatus ununterscheidbar. Reproduzierbar wird das
Ergebnis erst zusammen mit dem separat gefuehrten `dataFilter` des
Evaluation-Contracts - der Modellstatus allein traegt diese Zusage nicht.

**S15-6 - zwei Vokabulare fuer dieselben drei Achsen ohne Mapping.** Der Code
verwendet `tested` / `partial` / `not_validated`, die Matrix im Fachkonzept
`ja` / `teilweise` / `nein`. Es gibt weder ein Enum noch einen Validator noch
einen Test, der eine spaetere Anhebung von `externalValidationStatus` auf
`validated` an einen Nachweis bindet. AK-2 ("nicht voneinander abgeleitet")
ist damit eine Konvention, kein Mechanismus.

**S15-7 - die neue Matrix wird von keinem Gate erfasst.**
`scripts/check-architecture-evidence.mjs` erkennt ausschliesslich
`MKT-/FOR-/MAP-`Kennungen (Referenzmuster Zeile 449, Ankerpruefung Zeile 218).
Die neuen `MS-01` bis `MS-10` und saemtliche Reviewtermine liegen ausserhalb.
Ein gruenes `npm run docs:evidence` sagt ueber die Vollstaendigkeit und
Aktualitaet der Modellmatrix nichts aus. Codex nennt die fehlende
Terminueberwachung selbst als offenes Risiko; die Konsequenz ist, dass die
Matrix bei Fristablauf still veraltet.

**S15-8 - die Scope-Deklaration ist unvollstaendig.**
`docs/reference/TECHNICAL.md` ist geaendert, steht aber nicht in der
Scope-Liste des Slices; dort erscheint es nur als Ziel eines
Konsistenzchecks. Die "Abweichungen vom Plan" nennen `AUTO_OPTIMIZE_DETAILS.md`
und `TRANCHEN_MODULES_README.md` - beide standen bereits im Scope - und lassen
die tatsaechliche Erweiterung ungenannt. Ebenfalls unerwaehnt bleibt die
Umbenennung der Slice-Datei von `SLICE_SUITE_DATA_15_MODEL_DECISIONS.md` auf
`SLICE_SUITE_DATA_15_MODEL_TRANSPARENCY.md`.

**S15-9 - keine Zuordnung von Findings zu Behandlungsorten.** Der Kopf nennt
ENG-07, OPT-05, die Entscheidungsanteile von SIM-06 und IMP-03 sowie MOD-01
bis MOD-08. Im Dokument taucht keine dieser Kennungen wieder auf; die
Behandlung laeuft ausschliesslich ueber D-Nummern. Inhaltlich liess sich jede
Zuordnung rekonstruieren (MOD-01/D-10, MOD-02/D-12, MOD-03/D-15, MOD-04/D-16,
MOD-05/MS-05 bis MS-07, MOD-06/MS-01, MOD-07/MS-09, MOD-08/MS-08,
SIM-06/D-19, IMP-03/D-13, ENG-07/D-11, OPT-05/D-18), aber sie ist Handarbeit
des Reviewers. Fuer ein
Slice, dessen Produkt Nachvollziehbarkeit ist, gehoert diese Tabelle ins
Dokument.

**S15-10 - MS-09 fuehrt eine nicht pruefbare Statusaussage.** Die Zeile
Kosten/FX/Asset-Universum traegt "Technisch getestet: ja, Auslassungen und
Eingabegrenzen sind technisch sichtbar". Getestet werden kann ein
vorhandenes Modell; die Abwesenheit eines Kosten-, FX- und Assetmodells ist
kein Testgegenstand. Die Zeile beschreibt eine Modelluecke und sollte in der
technischen Achse `entfaellt` statt `ja` fuehren, sonst entsteht in der
Uebersicht der Eindruck einer geprueften Eigenschaft.

### Geprueft und widerlegt

Diese Verdachtsmomente haben der Messung nicht standgehalten und werden
ausdruecklich zurueckgezogen:

- **Timing der Datenhashes.** `export let annualData = []` legte nahe, dass
  ein frueher `getDataVersion()`-Aufruf den Hash eines leeren Arrays liefert.
  Die IIFE in `simulator-data.js` fuellt Array und Regimeuebergaenge synchron
  beim Modulimport; gemessen 101 Eintraege vor dem ersten Zugriff. Kein
  Timingrisiko.
- **D-10-Rechenbeispiel.** Nachgerechnet: bei 8 % Kirchensteuer ergibt
  `0,25 * (1 + 0,055 + 0,08) * 100` genau 28,375 EUR; nach Paragraph 32d
  Absatz 1 sind es `100 / 4,08 = 24,5098` zuzueglich 5,5 % Soli und 8 %
  Kirchensteuer, zusammen 27,8186 EUR. Bei 9 %: 28,625 EUR gegen
  `100 / 4,09 = 24,4499` plus Zuschlaege, zusammen 27,9951 EUR. Beide von
  Codex genannten Werte sind korrekt gerundet.
- **D-10-Pfadaussage.** Die Formel `0.25 * (1 + 0.055 + kiSt)` steht
  tatsaechlich in `engine/tax-settlement.mjs` und an zwei Stellen in
  `engine/transactions/sale-engine.mjs`; die Aussage "beide
  Verkaufs-/Settlementpfade" haelt.
- **D-11-Konstante.** `Math.min(10, Math.round(10 + 20 * shortfallRatio))` mit
  `shortfallRatio = Math.max(0, ...)` in `engine/planners/flex-rate-policy.mjs`
  Zeile 62 ergibt fuer jede nicht negative Unterdeckung exakt 10. Bestaetigt.
- **D-12-Semantik.** `computeSpent` in `app/balance/balance-expenses-metrics.js`
  bildet `sum < 0 ? -sum : sum`. Die Beschreibung als Betrag der saldierten
  Kategorien ist korrekt.
- **Toter Testzweig.** Die neuen Assertions in `tests/auto-optimizer.test.mjs`
  liegen in einem unbedingt ausgefuehrten Block, nicht in einem uebersprungenen
  Zweig.
- **Ankerform.** Der Fragmentbezeichner
  `#modell--datenstands--und-validierungsmatrix` ist korrekt aus der
  Ueberschrift gebildet; der Fehler in S15-3 liegt allein im Verzeichnispfad.
- **Manifestangaben.** Revision `2026-07-18.1` und Jahresspanne 1925-2025 in
  MS-01 stimmen mit `DATA_SOURCES.md` und dem geladenen Datensatz ueberein.

### Findings-Lifecycle

- Neu eingefuehrte Blocker: S15-1, S15-2, S15-3.
- Neu eingefuehrte Restrisiken: S15-4 bis S15-10.
- Uebernommene Findings aus fruehen Slices: keine; Slice 15 fuehrt keine
  offenen Findings vorheriger Slices fort.
- Vom Reviewer zurueckgezogene Verdachtsmomente: acht, siehe oben.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Ein Nutzer oder ein spaeterer Reviewer verlaesst sich auf die
Handbuchzusage, das Auto-Optimize-Ergebnis nenne Modellversion, Datenhashes
und Validierungsstatus, uebernimmt den Champion ohne diese Angaben je gesehen
zu haben, und haelt das Ergebnis fuer geprueft, weil die Dokumentation eine
Pruefspur beschreibt, die in der Oberflaeche nicht existiert. Der Fehler ist
schwer zu bemerken, weil alle Gates gruen sind: kein Test prueft, ob der
Modellstatus jemals einen Nutzer erreicht.

Zweitwahrscheinlich: Die Modellmatrix laeuft ueber ihre Reviewtermine
(2026-10-31, danach 2027-01-15), ohne dass ein Gate das meldet. Sie wird
weiterhin als aktueller Datenstand gelesen, obwohl sie es nicht mehr ist.

Drittens: Eine spaetere Aenderung hebt `externalValidationStatus` auf
`validated`, weil kein Vertrag, kein Enum und kein Test dies an einen Nachweis
bindet - und damit faellt genau die Trennung, die AK-2 sichern soll.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:** S15-1 (der Modellstatus erreicht weder Nutzersicht noch Export,
  waehrend sechs Dokumente das Gegenteil behaupten und das Handbuch zum Lesen
  auffordert), S15-2 (Ergebnisanzeige und Apply-Bestaetigung ohne
  Experiment-/Nicht-Empfehlungsvorbehalt; AK-7 nur fuer die Eingabesicht
  erfuellt), S15-3 (der neu eingefuegte Verweis vom Forschungsbacklog auf die
  zentrale Modellmatrix zeigt ins Leere)
- **Restrisiken:** S15-4 (Modellstatus ohne Laufkopplung), S15-5 (Datenhash
  ohne Filterbezug), S15-6 (zwei Statusvokabulare ohne Mapping und ohne
  Mechanismus), S15-7 (Matrix und Reviewtermine von keinem Gate erfasst),
  S15-8 (unvollstaendige Scope-Deklaration), S15-9 (keine Zuordnung der
  Findings zu Behandlungsorten), S15-10 (nicht pruefbare Statusaussage in
  MS-09)
- **Pre-Mortem:** siehe oben - die dokumentierte Pruefspur existiert in der
  Oberflaeche nicht, und kein Gate deckt diese Luecke auf.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Implementierung von Codex auf `codex/suite-datenintegritaet-hardening` für Slice 15 (2 Programmdateien, 14 Test-/Doku-Dateien).

### Evaluierung der Prüfdimensionen

1. **Korrektheit & Datenmodell:**
   - `auto_optimize.js` erzeugt das strukturierte Objekt `AutoOptimizeModelStatusV1` inklusive Datenhashes (`annualDataHash`, `regimeHash`), Versionsangaben und getrennten Validierungsachsen.
   - Die Rechenlogik für Steuern, Pflege, Mortalität, Renditen und Entnahmen blieb vollständig unberührt.

2. **Vertragstreue & Blocker (S15-1 bis S15-3):**
   - **S15-1 (BLOCKER):** Das erzeugte `modelStatus`-Objekt wird in `Simulator.html` weder im gerenderten Ergebnis noch in Exporte eingebunden. 6 Dokumentationsdateien (`Handbuch.html`, `README.md`, `TECHNICAL.md`, etc.) behaupten jedoch explizit, dass das Ergebnis Modellversion und Datenhashes nennt und fordern den Nutzer zum Lesen auf.
   - **S15-2 (BLOCKER):** Akzeptanzkriterium 7 fordert die sichtbare Kennzeichnung von Auto-Optimize als experimentelles Vergleichsverfahren und Nicht-Finanzempfehlung in Nutzereingabe **und** Ergebnissicht. Die Warnung steht derzeit nur oberhalb des Eingabeformulars, nicht aber in der Ergebnisanzeige („Champion Configuration“) oder bei der Apply-Bestätigung.
   - **S15-3 (BLOCKER):** In `docs/internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md` Zeile 71 zeigt der Pfad `../reference/ARCHITEKTUR_UND_FACHKONZEPT.md` ins Leere (`../../reference/` wäre korrekt).

3. **Fehlerbehandlung & Tests:**
   - `npm test`: **8.740 / 8.740 Assertions grün**.
   - `npm run test:browser`: **23 / 23 Smokes grün**.
   - `npm run docs:evidence`: **grün**.

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: S15-1 (modelStatus wird in Simulator.html nicht in die Nutzersicht gerendert), S15-2 (Experiment-/Nicht-Empfehlungshinweis fehlt in Ergebnisanzeige und Apply-Dialog), S15-3 (Toter Pfad im Forschungsbacklog zur Modellmatrix).
- Restrisiken: S15-4 bis S15-10.
- Pre-Mortem: Ein Nutzer verlässt sich auf die Handbuch-Zusage einer dokumentierten Prüfspur im Auto-Optimizer. Da der Modellstatus in der UI gar nicht gerendert wird, übernimmt der Nutzer eine ungeprüfte Parameterkombination im Glauben, eine validierte Finanzempfehlung erhalten zu haben.
```

## Technische Nachbesserung durch Codex nach S15-Review

Die folgenden Punkte sind technisch nachgebessert. Diese Dokumentation
veraendert den letzten Reviewerstatus nicht; Claude/Gemini muessen die
Nachbesserung unabhaengig re-reviewen.

| Finding | Technische Behandlung | Regressionsnachweis |
| --- | --- | --- |
| S15-1 | Der Champion-Renderer konsumiert `modelStatus` und zeigt Schema, Modell-/Datenversion, effektive Datenauswahl, Statusachsen, Entscheidungseinsatz und Evidenzgrenze unmittelbar in der Ergebnissicht. | `auto-optimizer.test.mjs` prueft den gerenderten Ergebnistext einschliesslich beider Hashes und aller Statuscodes. |
| S15-2 | Ergebnisblock und Apply-Bestaetigung nennen sichtbar „experimenteller Szenariokandidat“ und „keine Finanzempfehlung“. | Renderer- und Apply-Witness in `auto-optimizer.test.mjs`. |
| S15-3 | Der Matrixpfad sowie zwei vorhandene Protokollpfade im Forschungsbacklog wurden relativ zum Archivverzeichnis korrigiert. | Der Fidelity-Test loest alle lokalen Markdown-Links des Backlogs auf und fordert existierende Ziele. |
| S15-4 | `buildAutoOptimizeModelStatus` unterscheidet eingebaute Monte-Carlo-Evaluation und Custom-Evaluator. Custom-Evaluatoren erhalten keine eingebauten Datenhashes und keine eingebaute technische/interne Bewertung. | Custom-Evaluator-Witness prueft `custom_evaluator`, `dataVersion=null` und `custom_evaluator_not_assessed`. |
| S15-5 | Neben den Hashes des gesamten Datenuniversums wird die effektive Auswahl aus Modus, Startjahrfilter, Halbwertszeit und Ausschluss geschaetzter Historie ausgegeben. | Ergebnis- und Custom-Evaluator-Witnesses pruefen die effektive Filterauswahl. |
| S15-6 | `ModelValidationStatusVocabularyV1` bildet Maschinenstatus explizit auf `ja`, `teilweise`, `nein` beziehungsweise `nicht bewertet` der Dokumentmatrix ab. | Mapping-Assertions in `auto-optimizer.test.mjs`; Matrixbeschreibung synchronisiert. |
| S15-7 | MS-01 bis MS-10, Pflichtspalten, Owner, Quellen-/Contractdatum, Statusachsen und Reviewtermine besitzen einen deterministischen Fidelity-Gate; die kalenderabhaengige Faelligkeit liegt nach T15-1 im separaten Doku-Gate. | 192/192 Fidelity-Assertions sowie 23/23 Evidenzvertrags-Assertions mit injizierten Stichtagen. |
| S15-8 | `TECHNICAL.md`, die abweichende Slice-Dateibenennung und der nach Review erweiterte Renderer-Scope sind explizit nachgetragen. | Scope-, Abweichungs- und Programmdiff-Abschnitte dieses Dokuments. |
| S15-9 | ENG-07, OPT-05, SIM-06, IMP-03 und MOD-01 bis MOD-08 sind Entscheidungen/Modellgrenzen und konkreten Behandlungsorten zugeordnet. | Tabelle „Finding-Traceability“. |
| S15-10 | MS-09 bezeichnet den technischen Status fuer das nicht vorhandene Kosten-/FX-/breite Assetmodell als `entfaellt` statt `ja`. | Matrix-Assertion im Fidelity-Test. |

Nach der T15-1-Nachbesserung sind die fokussierten Tests mit 101/101,
192/192 und 23/23 Assertions, `npm run docs:evidence`, die Gesamtsuite mit
8.823/8.823
Assertions und 0 offenen Handles, der Browserlauf mit 23/23 Smokes, beide
Auto-Optimize-Syntaxchecks, der Evidenzchecker-Syntaxcheck sowie
`git diff --check` gruen. Exakt fuenf genehmigte Programmdateien sind
geaendert; Engine, Worker, generierte und Release-Artefakte bleiben
unveraendert. Eine Freigabe oder ein Commit erfolgt erst nach unabhaengigem
Re-Review der T15-1-Erweiterung.


## Re-Review durch Claude nach der S15-Nachbesserung

**Reviewdatum:** 2026-07-28
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `cdecdac` nach der Nachbesserung zu S15-1 bis S15-10.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/auto-optimizer.test.mjs` | 101/101 Assertions, 0 Fehler |
| `node tests/run-single.mjs tests/auto-optimize-fidelity.test.mjs` | 202/202 Assertions, 0 Fehler |
| `npm run docs:evidence` | gruen; 69 MKT, 55 FOR, 17 MAP, 11/7 Reviewscopes |
| `npm test` | 8.829/8.829 Assertions, 0 Fehler, 0 offene Handles, Exit 0 |
| `npm run test:browser` | 23/23 Smokes, Exit 0 |
| `node --check` fuer beide Programmdateien | gruen |
| `git diff --check` | gruen |
| Programmdiff | vier Dateien: `auto_optimize.js`, `auto-optimize-renderer.js`, `Simulator.html`, `Handbuch.html` |
| Verbotene Bereiche | `engine.js`, `engine/`, `workers/`, `dist/`, `src-tauri/` unveraendert (0 Eintraege) |

### Geschlossene Findings

**S15-1 geschlossen.** Der Renderer konsumiert `modelStatus`. Dieselbe Messung
wie im Erstreview, jetzt gegen den nachgebesserten Stand (gerendertes HTML:
6.631 statt 5.018 Zeichen):

| Gesuchtes Feld | Erstreview | jetzt |
|---|---|---|
| `AutoOptimizeModelStatusV1` | fehlt | im HTML |
| `ModelValidationStatusVocabularyV1` | - | im HTML |
| `technically_tested` / `partially_plausibilized` / `not_validated` | fehlt | im HTML |
| `annualDataHash 614993a3` | fehlt | im HTML |
| `regimeHash 50aa7f99` | fehlt | im HTML |
| effektive Datenauswahl (`Startjahr 1950`, `Halbwertszeit 20`) | - | im HTML |
| `repository_contract_evidence_not_live_test_health` | - | im HTML |

**S15-2 geschlossen.** Der Ergebnisblock traegt eine rot abgesetzte Notiz
"Experimenteller Szenariokandidat - keine Finanzempfehlung" oberhalb der
Champion-Kennzahlen, und die Apply-Bestaetigung lautet gemessen:
"Experimenteller Szenariokandidat uebernommen - keine Finanzempfehlung. Eine
spaetere Profilauswahl kann profilgebundene Felder erneut setzen." Beide
Stellen waren im Erstreview vorbehaltlos.

**S15-3 geschlossen.** Alle fuenf lokalen Markdown-Links des
Forschungsbacklogs loesen auf ein existierendes Ziel auf, einschliesslich der
zwei vorbestehenden Altlasten. Der neue Fidelity-Test macht die Aufloesung zur
Pflicht.

**S15-4 geschlossen und in der Aussage umgekehrt.**
`buildAutoOptimizeModelStatus` unterscheidet eingebauten und
benutzerdefinierten Evaluator. Gemessen fuer den Custom-Pfad:
`dataVersion = null`, `modelVersion = custom_evaluator`,
`evaluationMode = custom_evaluator`, technische und interne Achse
`custom_evaluator_not_assessed`, Matrixwert `nicht bewertet`,
`evidenceBoundary = custom_evaluator_outside_built_in_evidence`. Der Renderer
zeigt in diesem Fall `nicht anwendbar` statt eines Hashes; die eingebauten
Hashes tauchen nicht faelschlich auf. Der zugehoerige Test assertiert jetzt
genau das Gegenteil seiner fruehen Fassung.

**S15-5 geschlossen.** Der Statusblock trennt sichtbar "Datenuniversum"
(beide Hashes) von "Effektive Datenauswahl" (Modus, Startjahr, Halbwertszeit,
Ausschluss geschaetzter Historie). Damit steht der Geltungsbereich neben dem
Hash, statt von ihm suggeriert zu werden.

**S15-6 geschlossen.** `ModelValidationStatusVocabularyV1` bildet
`technically_tested -> ja`, `partially_plausibilized -> teilweise`,
`not_validated -> nein` und fuer den Custom-Pfad `nicht bewertet` ab; das
Mapping steht im Ergebnis, im Renderer und in der Matrixbeschreibung.

**S15-7 geschlossen, mit einer Nebenwirkung (siehe T15-1).** Der neue
Fidelity-Test prueft Zeilenzahl, ID-Folge MS-01 bis MS-10, acht Spalten,
Owner, Quellen-/Contractdatum, drei getrennte Statuszellen und einen
Reviewtermin je Zeile.

**S15-8 geschlossen.** `docs/reference/TECHNICAL.md` steht jetzt im
Dokumentationsscope, die Dateiumbenennung und der erweiterte Rendererscope
sind als Abweichung nachgetragen. Vier Programmdateien schoepfen das Limit
exakt aus.

**S15-9 geschlossen.** Die Tabelle "Finding-Traceability" ordnet ENG-07,
OPT-05, SIM-06, IMP-03 und MOD-01 bis MOD-08 je einer Entscheidung oder
Modellgrenze und einem Behandlungsort zu. Meine im Erstreview handisch
rekonstruierte Zuordnung deckt sich mit der dokumentierten.

**S15-10 geschlossen.** MS-09 fuehrt technisch `entfaellt, kein Kosten-/FX-/
breites Assetmodell vorhanden`; der Fidelity-Test haelt das fest.

### Neue Restrisiken

**T15-1 - die Testsuite faellt kalenderabhaengig aus, ohne dass sich Code
aendert.** Der neue Gate erzwingt `reviewDate >= heutiges Datum` fuer jede
Matrixzeile. Nachgestellt mit der Assertionlogik des Tests:

| Systemdatum | brechende Zeilen |
|---|---|
| 2026-07-28 (heute) | 0 von 10 |
| 2026-11-01 | 5 von 10 (MS-02, MS-03, MS-04, MS-08, MS-10) |
| 2027-01-16 | 10 von 10 |

Damit ist `npm test` ab dem 2026-11-01 rot - nicht wegen eines Defekts,
sondern wegen des Kalenders. Drei Folgen: ein gruener Gesamtlauf ist ohne
Dokumentaenderung nicht mehr erreichbar und blockiert jede spaetere
Sliceabnahme; ein Lauf ist nicht mehr reproduzierbar, weil derselbe Commit je
nach Systemdatum unterschiedlich ausgeht, was Bisect und Regressionsvergleich
entwertet; und der schnellste Weg zurueck zu Gruen ist das Hochsetzen des
Datums - genau die Statusanhebung ohne Nachweis, gegen die die Matrix selbst
schreibt ("Kein Termin hebt einen Status automatisch an").

Codex hat die Kalenderabhaengigkeit unter den offenen Risiken ausdruecklich
festgehalten, sie ist also gewollt und nicht verdeckt. Ob die Gesamtsuite das
richtige Druckmittel fuer Dokumentationspflege ist, ist eine Prozessentscheidung
des Nutzers und keine Implementierungsfrage; ich lege sie deshalb vor, statt zu
blockieren. Denkbare Milderungen ohne Verlust der Wirkung: ein eigener,
benannter Doku-Gate analog `docs:evidence` statt eines Treffers in der
Gesamtsuite; oder ein quittierbarer Zustand `ueberfaellig, bewusst getragen`
in der Matrix, den der Test akzeptiert und zaehlt.

**T15-2 - der Statusblock ist nur zur Haelfte uebersetzt.** Gemessen tragen
`technically_tested`, `partially_plausibilized` und `not_validated` ein
deutsches Label; `experimental`, `scenario_comparison_only`,
`built_in_monte_carlo`, `ModelValidationStatusVocabularyV1` und
`repository_contract_evidence_not_live_test_health` erscheinen als
Rohbezeichner. Fuer ein Feature, dessen Zweck Verstaendlichkeit ist, traegt
die rote Warnnotiz die Hauptlast allein; die Evidenzgrenze - fachlich der
wichtigste Satz des ganzen Blocks - steht in einer Form, die ein Nutzer
vermutlich ueberliest.

**T15-3 - der Matrix-Gate erzwingt das Statusvokabular nicht.** Je Achse wird
nur `length > 0` geprueft, inhaltlich festgelegt ist allein MS-09 auf
`entfaellt`. Gemessen sind heute alle zehn Zeilen vokabularkonform
(`ja`/`teilweise`/`nein`/`entfaellt`), aber eine spaetere Zelle
"weitgehend validiert" oder "extern geprueft (in Arbeit)" wuerde den Gate
passieren. Ebenso wenig prueft er, dass MS-08 den Laufzeitcodes des
Optimizers entspricht; die Kopplung Code-Matrix ist nur in der Richtung
Vokabularkonstante getestet.

**T15-4 - die beiden Doku-Gates liegen thematisch fremd.** Matrixvollstaendigkeit,
Reviewtermine und die Linkaufloesung des Forschungsbacklogs stehen in
`tests/auto-optimize-fidelity.test.mjs`. Wer die Modellmatrix pflegt, sucht
ihre Absicherung dort nicht; wer die Auto-Optimize-Tests umbaut, nimmt die
Doku-Gates ungewollt mit.

**T15-5 - ein fehlender Filterwert wird als Aussage gerendert.** Mit
`startYearMode: 'ALL'` und ohne `excludeEstimatedHistory` zeigt der
Statusblock gemessen "geschaetzte Historie ausgeschlossen: nein", waehrend
Startjahr und Halbwertszeit korrekt als "nicht ausgewiesen" erscheinen.
`formatBoolean` bildet `undefined` auf `nein` ab. In einem Block, der Fehlendes
sonst sauber als fehlend ausweist, wird an dieser Stelle Nichtwissen als
negative Tatsachenbehauptung dargestellt. Das Muster ist aus dem aelteren
Annahmenblock uebernommen, wirkt hier aber im Transparenzvertrag.

### Findings-Lifecycle

- Geschlossen in diesem Durchgang: S15-1 bis S15-10 (drei Blocker, sieben
  Restrisiken).
- Neu eingefuehrte Blocker: keine.
- Neu eingefuehrte Restrisiken: T15-1 bis T15-5.
- Unveraendert offen: keine Findings aus dem Erstreview.
- Zurueckgezogene Beobachtung: Meine Suche nach dem gerenderten Text
  "geschaetzte Historie ausgeschlossen: ja" schlug zunaechst fehl; Ursache war
  ein Zeilenumbruch im Template, nicht ein fehlender Wert. Der Wert wird
  korrekt gerendert.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Am 2026-10-31 laufen fuenf Matrixtermine ab. Ab dem Folgetag ist `npm test`
rot, ohne dass jemand Code angefasst hat. Wer dann an einem anderen Slice
arbeitet, sieht einen roten Gesamtlauf, dessen Ursache in einer
Dokumenttabelle liegt, und waehlt den schnellsten Weg zurueck zu Gruen: das
Datum hochsetzen. Damit wird der Termin zur Formalie und die Matrix behauptet
weiter Aktualitaet, die niemand geprueft hat - dieselbe Fehlerklasse, die
Slice 15 beheben sollte, nur eine Ebene hoeher.

Zweitwahrscheinlich: Ein Nutzer liest im Statusblock
`repository_contract_evidence_not_live_test_health` und `experimental`,
versteht die Evidenzgrenze nicht und liest `technisch getestet` als
Qualitaetssiegel - obwohl genau dieser Satz sagt, dass es keines ist.

Drittens: Eine spaetere Matrixzeile traegt einen Statuswert ausserhalb des
Vokabulars, weil der Gate nur auf Nichtleere prueft; Code und Dokument
divergieren, ohne dass ein Test es meldet.

## Re-Review-Ergebnis (Claude)

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** T15-1 (kalenderabhaengiger Ausfall der Gesamtsuite ab
  2026-11-01), T15-2 (unuebersetzte Rohbezeichner im Statusblock), T15-3
  (Statusvokabular vom Gate nicht erzwungen), T15-4 (Doku-Gates thematisch
  fremd abgelegt), T15-5 (fehlender Filterwert wird als `nein` gerendert)
- **Pre-Mortem:** siehe oben - der erste Matrixtermin laeuft am 2026-10-31 ab
  und macht die Gesamtsuite rot; der bequemste Ausweg ist genau die
  ungepruefte Terminverlaengerung, die die Matrix verbietet.

Die Freigabe bezieht sich auf die Behebung der Blocker S15-1 bis S15-3 und der
Restrisiken S15-4 bis S15-10 sowie auf die Einhaltung des deklarierten Scopes
mit exakt vier Programmdateien. Sie umfasst nicht die neuen Restrisiken; deren
Behandlung ist eine Nutzer- beziehungsweise Planungsentscheidung. Ausdruecklich
vor einem Commit vom Nutzer entschieden sehen moechte ich T15-1: ob die
Gesamtsuite ab dem 2026-11-01 kalenderabhaengig fehlschlagen soll oder ob die
Terminueberwachung in einen eigenen Doku-Gate gehoert.

## Re-Review durch Gemini nach der S15-Nachbesserung

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Re-Review der Nachbesserung von Codex auf `codex/suite-datenintegritaet-hardening` für Slice 15.

### Evaluierung der Nachbesserung (S15-1 bis S15-10)

1. **S15-1 (Behebung bestätigt):** `auto-optimize-renderer.js` bindet `modelStatus` vollständig in die Nutzersicht von `Simulator.html` ein. Schema, Modell-/Datenversion, Datenhashes (`annualDataHash`, `regimeHash`), effektive Filterauswahl sowie alle drei Validierungsachsen werden lesbar gerendert.
2. **S15-2 (Behebung bestätigt):** Der Ergebnisblock („Champion Configuration“) trägt nun prominent die rote Notiz „Experimenteller Szenariokandidat - keine Finanzempfehlung“. Ebenso enthält die Apply-Bestätigung den expliziten Nicht-Empfehlungsvorbehalt. AK-7 ist damit in Nutzereingabe und Ergebnissicht vollständig erfüllt.
3. **S15-3 (Behebung bestätigt):** Der Link in `docs/internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md` wurde auf `../../reference/ARCHITEKTUR_UND_FACHKONZEPT.md` korrigiert. Ein neuer Test in `tests/auto-optimize-fidelity.test.mjs` verifiziert alle Markdown-Links des Backlogs automatisiert gegen das Dateisystem.
4. **S15-4 bis S15-10 (Behebungen bestätigt):** 
   - Custom-Evaluatoren erhalten keine gefälschten Hashes (S15-4).
   - Effektiv ausgewählte Datenfilter werden separat neben den Universums-Hashes angezeigt (S15-5).
   - Statusvokabular-Mapping `technically_tested -> ja`, `partially_plausibilized -> teilweise`, `not_validated -> nein` ist implementiert (S15-6).
   - Die Modellmatrix MS-01 bis MS-10 wird per Automated Fidelity Gate (`tests/auto-optimize-fidelity.test.mjs`) geprüft (S15-7).
   - Programmdiff umfasst exakt 4 Dateien (`auto_optimize.js`, `auto-optimize-renderer.js`, `Simulator.html`, `Handbuch.html`) (S15-8).
   - Finding-Traceability-Tabelle wurde dokumentiert (S15-9).
   - MS-09 führt `entfaellt` für nicht vorhandenes Kosten-/FX-Modell (S15-10).

### Test-Gates Audit

- `npm test`: **8.829 / 8.829 Assertions grün** (136 Testdateien, 0 offene Handles).
- `npm run test:browser`: **23 / 23 Smokes grün**.
- `npm run docs:evidence`: **grün**.

### Re-Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. (S15-1 bis S15-3 sowie S15-4 bis S15-10 vollständig behoben).
- Restrisiken: T15-1 bis T15-5 (wie von Claude identifiziert; T15-1 kalenderabhängiger Testausfall ab 2026-11-01 als gewolltes Prozessdruckmittel dokumentiert).
- Pre-Mortem: Am 2026-10-31 laufen die ersten 5 Matrixtermine ab. Am 2026-11-01 schlägt npm test wegen T15-1 fehl. Der Entwickler verlängert das Datum in der Matrix ohne fachliche Prüfung um 6 Monate, um das Gate wieder grün zu bekommen.
```

## Nutzerentscheidung und technische Nachbesserung T15-1

**Nutzerentscheidung vom 2026-07-28:** T15-1 wird noch in Slice 15
behandelt. `npm test` darf nicht vom aktuellen Systemdatum abhaengen. Die
Faelligkeit der Modellmatrix gehoert in den separaten, bereits
datumssensitiven Gate `npm run docs:evidence`. Der Nutzer genehmigt
`scripts/check-architecture-evidence.mjs` hierfuer als fuenfte
Programmdatei.

Technische Umsetzung:

- `tests/auto-optimize-fidelity.test.mjs` prueft weiterhin deterministisch
  Inventar, Struktur und das Vorhandensein der zehn Reviewtermine, vergleicht
  sie aber nicht mehr mit der Systemuhr.
- `scripts/check-architecture-evidence.mjs` prueft alle MS-01-bis-MS-10-Termine
  gegen das Berliner Tagesdatum. Ein ueberfaelliger Termin liefert den
  stabilen Fehlercode `OVERDUE_MODEL_REVIEW` und Exit 1.
- `tests/architecture-evidence.test.mjs` injiziert feste Stichtage. Der
  2026-11-01-Witness meldet deterministisch exakt die fuenf am 2026-10-31
  faelligen Matrixzeilen; der CLI-Witness prueft den neuen Fehlercode.
- T15-2 bis T15-5 bleiben unveraenderte, nicht commitblockierende
  Restrisiken des Re-Reviews.

Gates nach T15-1:

- Auto-Optimize: 101/101 und 192/192 Assertions;
- Evidenzvertrag: 23/23 Assertions;
- `npm run docs:evidence`: gruen fuer 2026-07-28, inklusive zehn
  Matrix-Reviewterminen;
- `npm test`: 136 Testdateien, 8.823/8.823 Assertions, 0 Fehler und
  0 offene Handles;
- Browser: 23/23 Smokes;
- Syntax- und Diffchecks: gruen;
- exakt fuenf genehmigte Programmdateien; Engine, Worker, generierte und
  Release-Artefakte unveraendert.

Die Basisfreigabe fuer S15-1 bis S15-10 bleibt dokumentiert. Die nach dieser
Freigabe implementierte T15-1-Erweiterung benoetigt vor dem Commit ein
gezieltes unabhaengiges Re-Review; Codex erteilt keine Eigenfreigabe.


## Zweites Re-Review durch Claude nach der T15-1-Nachbesserung

**Reviewdatum:** 2026-07-28
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `cdecdac` nach der Verlagerung der Terminpruefung.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/auto-optimizer.test.mjs` | 101/101 Assertions |
| `node tests/run-single.mjs tests/auto-optimize-fidelity.test.mjs` | 192/192 Assertions (vorher 202) |
| `node tests/run-single.mjs tests/architecture-evidence.test.mjs` | 23/23 Assertions |
| `npm run docs:evidence` | gruen; 69 MKT, 55 FOR, 17 MAP, 11/7 Reviewscopes, **10 Matrix-Reviewtermine** |
| `npm test` | 8.823/8.823 Assertions, 0 Fehler, 0 offene Handles, Exit 0 |
| `npm run test:browser` | 23/23 Smokes, Exit 0 |
| `node --check` fuer alle drei Programmdateien | gruen |
| `git diff --check` | gruen |
| Programmdiff | fuenf Dateien (siehe U15-3) |
| Verbotene Bereiche | `engine.js`, `engine/`, `workers/`, `dist/`, `src-tauri/` unveraendert |

### T15-1 geschlossen

**Die Systemuhr ist aus der Testsuite entfernt.** Der Fidelity-Test enthaelt
keinen `currentDate`- oder `new Date`-Bezug mehr; er prueft weiterhin
deterministisch Inventar, Spalten und das Vorhandensein eines Termins je
Zeile. Die Assertionzahl faellt von 202 auf 192 - genau die zehn entfallenen
Terminvergleiche.

**Die Faelligkeit wirkt jetzt im Doku-Gate.** Gemessen ueber
`validateEvidenceDocuments` und ueber die CLI:

| Stichtag | `ok` | `OVERDUE_MODEL_REVIEW` | CLI-Exit |
|---|---|---|---|
| 2026-07-28 | true | 0 | 0 |
| 2026-10-31 | false | 0 (11 bestehende `OVERDUE_REVIEW_SCOPE`) | - |
| 2026-11-01 | false | 5 (MS-02, MS-03, MS-04, MS-08, MS-10) | 1 |
| 2027-01-16 | false | 10 (MS-01 bis MS-10) | 1 |

Die im Re-Review gemessenen Zahlen 5 und 10 treten unveraendert auf - nur
nicht mehr in `npm test`, sondern im benannten Gate, mit stabilem Fehlercode,
Datei- und Zeilenangabe.

**Die Verlagerung ist am richtigen Ort.** `docs:evidence` ist bereits ab dem
2026-10-31 durch elf bestehende `OVERDUE_REVIEW_SCOPE`-Fehler rot. Die
Modellmatrix schafft damit kein neues Faelligkeitsregime, sondern reiht sich in
das vorhandene ein; sie ist ab dem 2026-11-01 fuenf von dann sechzehn
Befunden.

**Die Testabsicherung ist deterministisch.** Alle dreizehn Aufrufe in
`architecture-evidence.test.mjs` injizieren ein Datum; der Basisfall verwendet
den vorbestehenden `fixedToday = 2026-07-17`, der November-Witness prueft
festverdrahtet die Zahl fuenf. `baseline.counts.modelMatrixRows === 10` bindet
den Checker an das erwartete Inventar.

**Die Zeitzonenbehandlung stimmt.** `getBerlinDate` liefert fuer
`2026-10-31T22:30:00Z` noch den 31.10. und fuer `2026-10-31T23:30:00Z` bereits
den 01.11.; die Winterzeitverschiebung ist korrekt abgebildet.

**Fail-closed bei kaputter Struktur.** Fehlt die achte Spalte, ist
`cells[7]` undefiniert, und die Zeile faellt mit `INVALID_MODEL_REVIEW_DATE`
statt stillschweigend durchzugehen.

### Neue Restrisiken

**U15-1 - eine verschwundene Matrix faellt im Doku-Gate nicht auf.** Gemessen:
Entfernt man alle `| MS-XX`-Zeilen aus dem Fachkonzept, meldet der Checker
`ok: true`, `modelMatrixRows: 0` und keinen einzigen Fehler; der Report
schreibt dann `Model matrix review dates: 0`. Der Schutz liegt allein in zwei
Assertions ausserhalb des Checkers (`modelMatrixRows === 10` im Evidenztest,
Zeilenzahl im Fidelity-Test). Wer den Gate als eigenstaendigen
Faelligkeitswaechter benutzt - genau der Zweck der Nutzerentscheidung -,
bekommt bei geloeschter oder umbenannter Matrix ein gruenes Ergebnis. Ein
`MISSING_MODEL_MATRIX` bei null Zeilen waere ein Einzeiler und schliesst die
Luecke im Werkzeug selbst.

**U15-2 - die Suite ist nicht datumsunabhaengig, nur Slice 15 ist es.** Die
dokumentierte Nutzervorgabe lautet, `npm test` duerfe nicht vom Systemdatum
abhaengen. Slice 15 hat seinen Beitrag dazu vollstaendig entfernt. Gemessen
bleiben in `tests/` zwanzig Bezuege auf die Systemuhr; die meisten sind
Cache-Buster, Zeitstempel oder Laufzeitmessungen, aber
`balance-annual-cape.test.mjs` und `balance-annual-workflow-contract.test.mjs`
leiten Pruefdaten aus `new Date()` ab. Ich habe fuer diese beiden kein
Brechen nachgewiesen; sie liegen ausserhalb des Slice-Scopes. Die Eigenschaft
"datumsunabhaengig" sollte deshalb fuer die Suite als Ganzes nicht als
erreicht dokumentiert werden.

**U15-3 - die Nutzerentscheidung und die fuenfte Programmdatei kann ich nicht
verifizieren.** Das Dokument haelt eine Nutzerentscheidung vom 2026-07-28 fest,
die `scripts/check-architecture-evidence.mjs` als fuenfte Programmdatei
genehmigt; das Slice-Limit liegt bei vier. Diese Freigabe liegt mir nicht vor -
ich kann sie weder bestaetigen noch bestreiten. Inhaltlich entspricht die
gewaehlte Loesung genau der Milderung, die ich im Re-Review vorgeschlagen habe,
und der Eingriff in den Checker ist eng begrenzt (eine Parserfunktion, eine
Validierungsfunktion, zwei Reportfelder). Die Scope-Entscheidung bleibt
dennoch eine Nutzerentscheidung.

**U15-4 - der Anreiz zur ungeprueften Terminverlaengerung besteht fort, jetzt
besser lokalisiert.** Es gibt weiterhin keinen Zustand "ueberfaellig, bewusst
getragen". Ab dem 2026-11-01 stehen sechzehn Befunde gleichzeitig an, und der
Weg des geringsten Widerstands bleibt das Hochsetzen der Daten. Verbessert hat
sich die Diagnostik: Der Fehler nennt Kennung, Faelligkeitsdatum, Datei und
Zeile und trifft nicht mehr die Gesamtsuite. Das ist die akzeptable Restform
meines urspruenglichen Pre-Mortems.

### Unveraendert offene Restrisiken

T15-2 (unuebersetzte Rohbezeichner im Statusblock), T15-3 (Statusvokabular vom
Gate nicht erzwungen), T15-4 (Doku-Gates thematisch fremd abgelegt) und T15-5
(fehlendes `excludeEstimatedHistory` wird als `nein` gerendert) bestehen als
bewusste Entscheidungen fort. T15-4 hat sich durch die Verlagerung teilweise
entspannt: Die Terminpruefung liegt jetzt im thematisch richtigen Werkzeug;
Matrixstruktur und Backlog-Links bleiben im Auto-Optimize-Fidelity-Test.

### Findings-Lifecycle

- Geschlossen in diesem Durchgang: T15-1.
- Zuvor geschlossen: S15-1 bis S15-10.
- Neu eingefuehrte Blocker: keine.
- Neu eingefuehrte Restrisiken: U15-1 bis U15-4.
- Unveraendert offen: T15-2, T15-3, T15-4 (teilweise entspannt), T15-5.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Am 2026-10-31 laufen elf bestehende Reviewscopes ab, einen Tag spaeter fuenf
Matrixtermine. `npm run docs:evidence` meldet dann sechzehn Fehler auf einmal.
Weil die Gesamtsuite gruen bleibt, wird der Doku-Gate als "der Test, der immer
rot ist" behandelt und irgendwann nicht mehr gefahren - die Faelligkeit
verschwindet nicht durch Uebergehen, sondern durch Gewoehnung. Der Schutz
haengt dann daran, dass jemand den Gate ueberhaupt noch aufruft.

Zweitwahrscheinlich: Die Modellmatrix wird bei einer Umstrukturierung des
Fachkonzepts verschoben oder umbenannt, der Checker findet null Zeilen und
meldet gruen (U15-1); die Faelligkeitsueberwachung ist dann lautlos weg.

Drittens: Ein Nutzer liest im Statusblock `experimental` und
`repository_contract_evidence_not_live_test_health` (T15-2), versteht die
Evidenzgrenze nicht und liest `technisch getestet` als Qualitaetssiegel.

## Zweites Re-Review-Ergebnis (Claude)

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** U15-1 (verschwundene Matrix faellt im Doku-Gate nicht auf),
  U15-2 (die Suite als Ganzes ist weiterhin nicht datumsunabhaengig),
  U15-3 (Nutzerentscheidung und fuenfte Programmdatei fuer mich nicht
  verifizierbar), U15-4 (Anreiz zur ungeprueften Terminverlaengerung bleibt)
  sowie unveraendert T15-2, T15-3, T15-4 und T15-5.
- **Pre-Mortem:** siehe oben - der Doku-Gate ist ab Ende Oktober dauerhaft rot
  und wird durch Gewoehnung entwertet, waehrend die Gesamtsuite gruen bleibt.

Die Loesung ist an der richtigen Stelle platziert: Faelligkeit gehoert in das
Werkzeug, das Faelligkeit bereits verwaltet, und die Testsuite bleibt
reproduzierbar. Der Eingriff bleibt eng, die Witnesses sind deterministisch,
und die zuvor gemessenen Zahlen fuenf und zehn treten unveraendert auf - nur
mit Fehlercode statt Suitefehlschlag. Die Freigabe bezieht sich auf die
Behebung von T15-1 und auf die Einhaltung des deklarierten Scopes mit Ausnahme
von U15-3. Sie umfasst nicht die offenen Restrisiken. Vor einem Commit moechte
ich die Genehmigung der fuenften Programmdatei vom Nutzer bestaetigt sehen.


### Nachtrag zu U15-3 (2026-07-28)

Der Nutzer hat gegenueber dem Reviewer bestaetigt, dass er die Genehmigung fuer
T15-1 erteilt hat. Damit ist die im Dokument festgehaltene Entscheidung
einschliesslich `scripts/check-architecture-evidence.mjs` als fuenfter
Programmdatei belegt.

**U15-3 ist geschlossen.** Der Vorbehalt im zweiten Re-Review-Ergebnis - die
Genehmigung der fuenften Programmdatei vor dem Commit bestaetigt zu sehen -
ist damit erfuellt und entfaellt. Am Pruefergebnis aendert sich sonst nichts:
Status weiterhin freigegeben, keine Blocker.

Offen bleiben die Restrisiken U15-1 (eine verschwundene Modellmatrix faellt im
Doku-Gate nicht auf), U15-2 (die Suite als Ganzes ist weiterhin nicht
datumsunabhaengig), U15-4 (kein Zustand "ueberfaellig, bewusst getragen")
sowie unveraendert T15-2, T15-3, T15-4 und T15-5. Sie sind
Planungsentscheidungen und blockieren den Commit nicht.

## Zweites Re-Review-Ergebnis von Gemini (T15-1 & 5. Programmdatei)

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Verlagerung der Terminüberwachung T15-1 in den Evidenz-Gate `scripts/check-architecture-evidence.mjs`.

### Evaluierung der T15-1-Verlagerung & Nutzergenehmigung

1. **Testsuite-Entkopplung von der Systemuhr:** `tests/auto-optimize-fidelity.test.mjs` enthält keinen `new Date()`-Bezug mehr und prüft deterministisch Inventar und Struktur. `npm test` schlägt somit nicht mehr kalenderabhängig am 01.11.2026 fehl.
2. **Evidenz-Gate Integration:** `scripts/check-architecture-evidence.mjs` prüft alle 10 Review-Termine MS-01 bis MS-10 gegen das Berliner Tagesdatum und wirft bei Überfälligkeit den stabilen Fehlercode `OVERDUE_MODEL_REVIEW` (Exit 1).
3. **Nutzergenehmigung der 5. Programmdatei:** Der Nutzer hat die Genehmigung für T15-1 und die Aufnahme von `scripts/check-architecture-evidence.mjs` als 5. Programmdatei explizit erteilt (U15-3 ist geschlossen).

### Test-Gates Audit

- `npm test`: **8.823 / 8.823 Assertions grün** (136 Testdateien, 0 offene Handles).
- `npm run docs:evidence`: **grün** (69 MKT-, 55 FOR-, 17 MAP-Records, 10 Matrix-Termine).
- `npm run test:browser`: **23 / 23 Smokes grün**.

### Re-Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine.
- Restrisiken: U15-1, U15-2, U15-4 sowie T15-2 bis T15-5 (wie von Claude dokumentiert).
- Pre-Mortem: Am 2026-10-31 laufen 11 Review-Scopes ab, am 2026-11-01 folgen 5 Matrixtermine. npm run docs:evidence meldet dann 16 Befunde. Da npm test grün bleibt, wird der Doku-Gate schleichend durch Gewöhnung vernachlässigt, wenn nicht regelmäßig gefahren.
```

