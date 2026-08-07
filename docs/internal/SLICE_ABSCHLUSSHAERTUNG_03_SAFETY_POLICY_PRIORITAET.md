# Slice Abschlusshaertung 03: Safety-Policy-Prioritaet

**Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** noch nicht angelegt/veroeffentlicht<br>
**Status:** Entwurf v7; Nutzerentscheidung NE-03 sowie Claudes fuenfte Reviewrunde C-14/C-15 eingearbeitet; struktureller Jahr-1-Evidenzlauf und Claude-/Gemini-Re-Review ausstehend; nicht gestartet<br>
**Hauptplan:** [FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md](FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md)

## Ziel

Der nach interner Flexraten-Glättung und den dortigen Hard Caps verbleibende
Kandidat eines strukturell aktiven **Alarm- oder Guardrail-Signals** wird zu
einer harten Safety-Obergrenze gegen spaetere Aufwaertsglättung. Ausserhalb
einer schweren Flex-Notlage bleibt Mindest-Flex jedoch die marktbedingte
Untergrenze. Nur die Konjunktion aus extremem Bärenmarkt und bereits deutlich
geschaedigtem realem aktivem Gesamtvermoegen aktiviert den harten Null-Flex-Cap.
Der separate Floor ist absolut vorrangig und wird von keiner Flex-Policy
gekuerzt. Alarm und Guardrail werden nicht als gleichzeitig aktiv vorausgesetzt.

### Beleg des dokumentierten Schadensfalls

Der erneut gepruefte Worst-Case-Record fuer Jahr 1 weist
`Alarm: false`, `entscheidung.kuerzungQuelle: "Glättung (Final-Guardrail)"`,
`minimumFlexEffectiveBefore: 12.144,2912`,
`minimumFlexEffectiveAfter: 30.000` und
`minimumFlexEffectiveFinal: 53.400` aus. Jahr 1 lag damit im
**Nicht-Alarm-Pfad**. Der Record belegt die spaetere Anhebung, aber wegen des
ueberschriebenen Strings `kuerzungQuelle` noch **nicht**, welcher strukturelle
Safety-Trigger den Wert 12.144,2912 erzeugte. Vor dem ersten Code-Edit ist der
Fall deshalb mit unveraenderten Eingaben lesend zu reproduzieren und zu
protokollieren: `market.sKey`, `alarmStatus.active`, Kandidat nach interner
Glättung, bindende Flexraten-Hard-Caps, bindender Spending-Guardrail sowie
`currentRealVermoegen`, `peakRealVermoegen` und der daraus berechnete
`realerDepotDrawdown`. Ist weder ein strukturelles Safety-Signal noch eine
eindeutige Einordnung des konjunktiven Notfallgates nachweisbar, stoppt der Slice
als Contractabweichung; der Fall darf nicht ueber eine Textheuristik passend
gemacht werden. Die 12.144,2912 EUR allein beweisen keine schwere Flex-Notlage.

Der Produktionsrecord dient nur als belegte Planungsbaseline und wird wegen
seiner personenbezogenen Finanzwerte nicht als Testfixture eingecheckt.

## Fachliche Nutzerentscheidung

- **NE-03 liegt vor:** `minimumFlexAnnual` ist Teil des flexiblen
  Lebensqualitaetsbudgets und kein zweiter Floor. In einer schweren
  Flex-Notlage darf der gesamte geplante Flex einschliesslich Mindest-Flex auf
  `0` gesetzt werden.
- Eine marktbedingte schwere Flex-Notlage liegt nur bei
  `market.sKey === 'bear_deep'` **und zugleich**
  `state.keyParams.realerDepotDrawdown > CONFIG.THRESHOLDS.ALARM.realDrawdown`
  vor. Die bestehende Schwelle ist 0,25. Exakt 25 Prozent genuegen nicht.
- Diese beiden Bedingungen sind vollstaendig. `wealthFactor`,
  `wealthSufficient` und `alarmStatus.active` sind keine dritte Bedingung. Der
  Faktor beschreibt die Entnahmebelastung und wird primaer aus der realen
  Vorjahresentnahme geteilt durch das aktuelle reale Depot abgeleitet. Eine
  Null-Flex-Kuerzung wuerde ihn daher selbst senken und koennte ein daran
  gekoppeltes Gate im Folgejahr unbeabsichtigt abschalten.
- Der historische Name `realerDepotDrawdown` ist missverstaendlich, die Quelle
  aber geeignet: `SpendingPlanner` berechnet ihn aus dem inflationsbereinigten
  aktiven Gesamtvermoegen `gesamtwert` – Depot plus freie Liquiditaet – gegen
  `peakRealVermoegen`. Er bezeichnet fuer dieses Gate deshalb einen realen
  aktiven **Gesamtvermoegens**drawdown, keinen lokalen Aktienindexverlust.
- `bear_deep` allein, ein hoher Gesamtvermoegensdrawdown in einem anderen
  Marktregime sowie ein fortgeschleppter Alarm ausserhalb des aktuellen
  `bear_deep` reichen jeweils nicht fuer Null-Flex. Fehlende oder nicht endliche
  Gatewerte stoppen fail-closed, statt die Null-Flex-Freigabe still zu
  aktivieren oder zu unterdruecken.
- Bei aktivem Gate gilt `severeFlexEmergencyActive: true`,
  `minimumFlexOverrideAllowed: true` und der harte Kandidat
  `safetyCapFlexRatePct: 0` mit Quelle
  `severe_bear_wealth_emergency`. Mindest-Flex, Flex-Budget-Minimum, der interne
  35-Prozent-Alarm-Flexfloor und finale Aufwaertsglättung duerfen diesen Cap
  nicht anheben.
- Das Gate bleibt auch bei `wealthFactor === 0`, `wealthSufficient: true` und
  `alarmStatus.active: false` aktiv, sofern die beiden NE-03-Bedingungen
  vorliegen. Die Diagnose darf dann nicht behaupten, der Alarm habe Null-Flex
  ausgeloest: Alarmunterdrueckung wegen niedriger Entnahmebelastung und
  Null-Flex wegen `bear_deep` plus Gesamtvermoegensdrawdown werden als getrennte
  Tatsachen ausgewiesen.
- Ausserhalb der schweren Flex-Notlage bleibt Mindest-Flex die Untergrenze fuer
  rein marktbedingte Safety-Caps. Ein Kandidat unterhalb der von
  `applyMinimumFlexFloor` ermittelten erforderlichen Rate wird auf diese
  Untergrenze begrenzt; finale Glättung darf die wirksame Obergrenze nicht
  ueberschreiten.
- Unabhaengig vom Markt bleibt die vorhandene Solvenzprioritaet bestehen: Wenn
  Floor plus Flex nicht finanzierbar sind, wird jeder Flex einschliesslich
  Mindest-Flex vor dem Floor preisgegeben. Der geplante Floor selbst wird von
  keiner Flex-Policy reduziert: `calculateFinalWithdrawal` begrenzt die geplante
  Entnahme mindestens auf ihn. Kann der direkte Simulator den Netto-Floor aus
  dem vorhandenen Gesamtvermoegen nicht decken, liefert er bereits
  `kind: 'ruin'` mit `requiredFloorNominal`, `coveredFloorNominal` und
  `shortfallNominal`. Die normalen App-, MC- und Backtestpfade verwenden
  `BREAK_ON_RUIN = true`; der optionale historische Diagnosemodus
  `breakOnRuin: false` und bestehende Floor-Shortfall-Metriken bleiben
  unveraendert. `floor_shortfall_years` kann bereits die terminale Ruinzeile
  zaehlen und unterstuetzt ausserdem den expliziten Diagnosemodus; die Metrik
  belegt keine Fortsetzung des normalen Pfads.
- `safetyCapFlexRatePct` ist fuer normale Quellen der Flexrate-Kandidat am
  quellenspezifischen Anker. Fuer `alarm`, `bear_deep` und
  `flex_rate_hard_cap` gilt
  `post_internal_smoothing_and_flex_rate_hard_caps`, fuer
  `spending_guardrail` `post_spending_guardrails` und fuer den Null-Flex-Cap
  `post_total_wealth_drawdown_gate`.
- Der normale Trigger bleibt strukturell: `alarmStatus.active`, ein positiver
  `bear_deep`-Rohcut oberhalb der Toleranz, eine tatsaechlich reduzierende
  Flexraten-Hard-Cap-Bindung oder eine tatsaechlich reduzierende Recovery-/
  Caution-Guardrail-Bindung. `kuerzungQuelle` bleibt reiner Anzeigetext.
- `bear_deep` mit `wealthFactor === 0` beziehungsweise ohne positive Rohkuerzung
  erzeugt keinen normalen Bear-Kandidaten. Es erzeugt auch keinen Null-Flex-Cap,
  solange der separate Gesamtvermoegensdrawdown nicht groesser als 25 Prozent
  ist. Oberhalb der Schwelle aktiviert die NE-03-Konjunktion den separaten
  Null-Flex-Cap dagegen bewusst auch bei `wealthFactor === 0`.
- Fuer alle strukturell wirksamen Quellen gilt das Minimum. Bei gleichem Wert
  lautet die Diagnoseprioritaet `severe_bear_wealth_emergency` vor
  `spending_guardrail` vor `flex_rate_hard_cap` vor `alarm` vor `bear_deep`.
- Der Status `overridden_by_severe_flex_emergency` weist die bewusste
  Mindest-Flex-Unterschreitung aus. Andere bestehende
  `blocked_emergency`-Gruende bleiben sichtbar und duerfen nicht faelschlich als
  marktbedingter Null-Flex-Trigger ausgegeben werden.
- ENG-07 aus
  `docs/internal/archive/2026-suite-datenintegritaet-hardening/SLICE_SUITE_DATA_15_MODEL_TRANSPARENCY.md`
  wird minimal-invasiv geschlossen: Der Basis-Alarmcut wird ehrlich als
  Konstante `10` Prozentpunkte benannt. Die bestehende Skalierung mit
  `wealthFactor` bleibt erhalten und wird als
  `effectiveAlarmCutPct = 10 * wealthFactor` diagnostiziert. Es wird keine
  unkalibrierte monotone Pseudoformel eingefuehrt.

## Akzeptanzkriterien

- `calculateFlexRate` liefert eine strukturierte Safety-Evidenz mit `active`,
  `source`, `candidateFlexRatePct` und dem fuer diese Quelle korrekten
  `anchorStage: post_internal_smoothing_and_flex_rate_hard_caps`.
- Die Pipeline vergleicht Ein- und Ausgangsrate von `applyGuardrails` und setzt
  `rateCapApplied: true` nur, wenn die Ausgangsrate die Eingangsrate um mehr als
  die im Testcontract fixierte numerische Toleranz reduziert; Textlabel zaehlen
  nicht als Binding. `spending-guardrails.mjs` bleibt unveraendert.
- Pipeline exponiert `safetyCapFlexRatePct`, `safetyCapSource`,
  `safetyCapBinding`, `safetyCapAnchorStage` und den final begrenzenden
  Policy-Schritt.
- Pipeline exponiert fuer das Notfallgate zusaetzlich
  `severeFlexEmergencyActive`, `marketExtremeBear`,
  `realTotalWealthDrawdownRatio`, `realTotalWealthDrawdownThresholdRatio` und
  `minimumFlexOverrideAllowed`. Schwelle und Istwert sind endliche Ratios.
  `alarmActive`, `withdrawalBurdenFactor` und `alarmWealthSufficient` werden als
  getrennte Diagnostik sowie
  `withdrawalBurdenGateRole: diagnostic_only` exponiert. Fehlende Diagnostik
  darf das zweigliedrige Gate weder aktivieren noch deaktivieren.
- Bei `safetyCapSource: spending_guardrail` muss
  `safetyCapAnchorStage: post_spending_guardrails` gelten; bei `alarm`,
  `bear_deep` oder `flex_rate_hard_cap` gilt
  `post_internal_smoothing_and_flex_rate_hard_caps`. Quelle und Anker duerfen
  nicht auseinanderfallen.
- Bei `safetyCapSource: severe_bear_wealth_emergency` gelten exakt
  `safetyCapAnchorStage: post_total_wealth_drawdown_gate`,
  `safetyCapFlexRatePct: 0`, `minimumFlexOverrideAllowed: true` und finaler
  Flex `0` innerhalb der fixierten numerischen Toleranz.
- Der schwere Null-Flex-Cap bleibt bei `wealthFactor === 0`,
  `wealthSufficient: true` und `alarmStatus.active: false` aktiv, wenn
  `bear_deep` und der kritische Gesamtvermoegensdrawdown vorliegen. Quelle und
  Copy nennen dann nicht den Alarm, sondern die beiden NE-03-Bedingungen; der
  unterdrueckte Alarm bleibt als separate Diagnose sichtbar.
- Ausserhalb der schweren Flex-Notlage ist der finale Flexwert niemals hoeher
  als die wirksame Safety-Obergrenze und – sofern kein bestehender
  Solvenz-/Runway-Blocker greift – niemals niedriger als die erforderliche
  Mindest-Flex-Rate. Ein lokales `bear_deep` allein darf Mindest-Flex nicht
  uebersteuern.
- Kein Test und keine Dokumentation darf `minimumFlexAnnual` dabei als gesamten
  Haushaltsgrundbedarf oder als Floor bezeichnen. Floor und flexibler
  Mindestbetrag bleiben in Diagnose, Delta und Nutzerhinweis getrennt.
- Ohne wirksames normales Alarm-/Guardrail-Safety-Signal **und** ohne aktives
  NE-03-Gate ist der Cap `null`; bestehende Golden-Cases bleiben unveraendert.
- Eine Aenderung nur von `kuerzungQuelle` bei identischer struktureller Evidenz
  darf das Cap-Ergebnis nicht aendern.
- Diagnose benennt die final begrenzende Policy.
- Die Alarmdiagnose nennt `baseAlarmCutPct: 10`, `wealthFactor` und den daraus
  berechneten `effectiveAlarmCutPct`; es gibt keinen scheinbar abgestuften
  Shortfall-Parameter mehr.
- Eine aktive schwere Flex-Notlage erhaelt
  `overridden_by_severe_flex_emergency`; Mindest-Flex gilt als bewusst nicht
  erfuellt und darf keinen Erfolgsstatus tragen. Andere
  `blocked_emergency`-Gruende bleiben getrennt diagnostiziert.
- In jedem nichtterminalen finanzierbaren Jahresresultat gilt
  `endgueltigeEntnahme >= inflatedBedarf.floor`. Bei schwerer Flex-Notlage gilt
  fuer die geplante Portfolioentnahme exakt der Netto-Floor. Reicht das aktive
  Vermoegen dafuer nicht, folgt der bereits vorhandene direkte
  `kind: 'ruin'`-Jahresvertrag mit Deckungs- und Shortfallwerten statt eines
  scheinbar erfolgreichen Resultats. Slice 3 veraendert weder `BREAK_ON_RUIN`
  noch historische Shortfall-Metriken.
- Nicht-Alarm-Golden-Cases **ohne wirksamen Guardrail** bleiben unveraendert.
- Erwartete Crash-Deltas sind von unerwarteten Seiteneffekten getrennt.
- Engine, direkte Runner und Worker bleiben vertragsgleich.

### Vorab festgelegtes Delta-Orakel

| Fall | Baseline | Erwartung nach Slice 3 |
| --- | ---: | ---: |
| dokumentiertes Worst-Case-Jahr 1, `Alarm: false` | Guardrail-Signal 12.144,29 EUR; Mindest-Flex 30.000 EUR; final 53.400 EUR | erst nach Evidenzlauf: bei `bear_deep` und >25 % realem Gesamtvermoegensdrawdown finaler Flex 0; sonst marktbedingte Untergrenze 30.000 EUR und keine erneute Anhebung auf 53.400 EUR |
| synthetischer lokaler Extrembär | `bear_deep`, realer Gesamtvermoegensdrawdown 24,99 %, Safety-Kandidat 20 %, Mindest-Flex-Rate 50 % | Notfallgate aus; final 50 %, Mindest-Flex bleibt Untergrenze |
| synthetische schwere Flex-Notlage | `bear_deep`, realer Gesamtvermoegensdrawdown 25,01 %, Mindest-Flex-Rate 50 %, alle Aufwaertsfloors aktiv | Notfallgate an; final 0 %, Status `overridden_by_severe_flex_emergency`, Netto-Floor unveraendert |
| schwere Flex-Notlage bei unterdruecktem Alarm | `bear_deep`, Gesamtvermoegensdrawdown 25,01 %, `wealthFactor: 0`, `wealthSufficient: true`, `alarmStatus.active: false` | Notfallgate bleibt an und final 0 %; Alarmunterdrueckung sowie separater Null-Flex-Grund beide sichtbar |
| Grenzwert exakt 25,00 % | `bear_deep`, Gesamtvermoegensdrawdown exakt Schwelle | Notfallgate aus, weil bestehender Contract strikt `>` verwendet |
| Vermoegensschaden ohne Extrembär | anderes Regime, Gesamtvermoegensdrawdown 40 % | kein marktbedingter Null-Flex-Cap; normale Solvenz-/Guardrailregeln bleiben |
| Floor nicht finanzierbar | beliebiges Regime, aktives Vermoegen unter aktuellem Netto-Floor | explizite Floor-Unterdeckung/Ruin; niemals stiller kleinerer Floor oder Erfolgsstatus |

Der reale Backtest darf von den bedingten Jahr-1-Zahlen abweichen, wenn der
Evidenzlauf die Notfallkonjunktion anders klassifiziert oder bestehende
Solvenzregeln zusaetzlich begrenzen. Ein nahezu nulles Gesamtdelta ist **kein**
Abnahmenachweis; die synthetische Wahrheitsmatrix muss alle vier Kombinationen
aus `bear_deep` ja/nein und Vermoegensdrawdown ober-/unterhalb der Schwelle
einschliesslich des exakten Grenzwerts pruefen.

Im vollstaendigen Neulauf duerfen die Zahlen ab Jahr 2 pfadbedingt abweichen,
weil Jahr 1 `state.flexRate` und Portfolio veraendert. Verbindliches Re-Run-
Orakel ist deshalb je Jahr: schwere Flex-Notlage ergibt Flexrate `0`; ausserhalb
davon gilt die Schnittmenge aus wirksamer Safety-Obergrenze und Mindest-Flex-
Untergrenze; finanzierbarer Floor bleibt voll, nicht finanzierbarer Floor wird
explizit als Unterdeckung/Ruin ausgewiesen.

Ein verbindlicher Zwei-Jahres-Fall haelt `bear_deep` und den Drawdown oberhalb
der Schwelle konstant: Die durch Null-Flex gesunkene Vorjahresentnahme darf ueber
`wealthFactor` oder Alarmunterdrueckung das Gate in Jahr 2 nicht deaktivieren.
Erst wenn `bear_deep` endet oder der Drawdown nicht mehr strikt oberhalb der
Schwelle liegt, faellt das Gate weg.

## Scope

- Spending-Policy-Pipeline und Alarmcut-Modul.
- konjunktives Null-Flex-Gate auf bestehendem realem
  Gesamtvermoegensdrawdown-Contract.
- Diagnosefelder/-texte fuer Safety-Cap, Notfallgate, Floor-Schutz und
  begrenzende Policy.
- fokussierte Golden-/Grenzwerttests und Delta-Nachweis.
- Engine- und Referenzdokumentation.

## Nicht-Scope

- keine neue Entnahmestrategie;
- keine Aenderung von Steuer, Sampling, Renten, Pflege oder Assetrenditen;
- keine allgemeine Neukalibrierung aller Guardrail-Schwellen;
- keine allgemeine Neukalibrierung des bestehenden 35-Prozent-Alarm-Flexfloors;
  er bleibt im Normalpfad erhalten und wird nur bei aktivem konjunktivem
  Null-Flex-Gate ueberstimmt;
- keine Aenderung daran, dass Alarm und Guardrail im aktuellen Contract
  gegenseitig ausschliessend ausgefuehrt werden;
- keine Erweiterung von Runway- oder Goldlogik;
- kein stilles Aktualisieren großer Backtest-Fixtures ohne Delta-Erklaerung.

## Voraussichtlich geplante Programmdateien

- `engine/planners/spending-policy-pipeline.mjs`
- `engine/planners/flex-rate-policy.mjs`
- `engine/planners/SpendingPlanner.mjs`
- `engine/planners/spending-diagnosis.mjs`
- `app/balance/balance-diagnosis-keyparams.js`
- `app/balance/balance-binder-diagnosis.js`
- `app/simulator/simulator-year-result.js`
- `engine.js` als erwartetes, von `npm run build:engine` generiertes und
  versioniertes Build-Artefakt

Damit sind maximal diese acht produktiven beziehungsweise generierten
Programmdateien vorab deklariert. Die zahlreichen betroffenen Testdateien sind
bewusst nicht Teil dieser Zaehlung. Erfordert die Status-/Diagnoseprojektion
eine neunte oder zehnte Datei, stoppt der Slice vor Coding und der Plan wird
explizit ergaenzt; ab der elften gilt zwingend die
Nutzer-/Teilungs-Stop-Regel.

## Diff-Risiko vor Coding

**Planungsstand:** noch nicht gestartet. Dies ist eine bewusste
Engine-Semantikaenderung und daher der riskanteste Slice.

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND

Geplante Dateien:
- nach Branch- und Contractreview finalisieren

Voraussichtliche Änderungstiefe:
- riskant: Auszahlungshoehe und Backtest-/MC-Ergebnisse koennen sich aendern

Gefährdete bestehende Tests:
- spending-planner und policy-order-contract
- liquidity-guardrail / recovery-guardrail
- liquidity-runway-contract
- minimum-flex einschließlich `blocked_emergency` und Status-Copy
- final-smoothing / flex-budget
- Balance-Diagnose, keyparams und copy-contract
- auto-optimize-fidelity
- historical-backtest-* und Monte-Carlo-*
- browser-smoke sowie Worker-/Runner-Paritaet

Nicht anfassen:
- Steuer- und Transaktionsengine
- Sampling
- Reconcile
- historische Daten
- dist/ und Releaseartefakte; `engine.js` ist die dokumentierte Ausnahme

Rollback-Strategie:
- Slice-2-Commit ist Sicherheitspunkt
- Revert des exakten Slice-3-Commits oder nach dokumentierter Diff- und
  Delta-Pruefung gezielte Hunk-Ruecknahme
- `simulator-year-result.js` enthaelt bereits Slice-1-Hunks und darf niemals als
  ganze Datei auf den Vor-Slice-3-Stand zurueckgesetzt werden
```

## Geplante Tests

- `node tests/run-single.mjs tests/spending-planner.test.mjs`
- `node tests/run-single.mjs tests/liquidity-guardrail.test.mjs`
- `node tests/run-single.mjs tests/liquidity-runway-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-guardrails.test.mjs`
- Copy-/Keyparam-Contracttests fuer `overridden_by_severe_flex_emergency`,
  `blocked_emergency`, Gatewerte, Cap-Quelle, Floor-Schutz und final begrenzende
  Policy
- synthetischer Nicht-Alarm-Guardrailfall 20 -> Mindest-Flex 50 -> Glättung 80
  ausserhalb der schweren Notlage mit final exakt 50: Obergrenze begrenzt die
  Glättung, Mindest-Flex bleibt Untergrenze
- synthetischer Alarmfolgefall ausserhalb der schweren Notlage inklusive
  unveraendertem 35-Prozent-Alarm-Flexfloor
- konjunktive Notfall-Wahrheitsmatrix: `bear_deep` ja/nein gekreuzt mit realem
  Gesamtvermoegensdrawdown 24,99/25,00/25,01 Prozent sowie jeweils
  `wealthFactor` 0/1 und Alarm aktiv/inaktiv; nur `bear_deep + 25,01 %` ergibt
  Flexrate 0, Entnahmebelastung und Alarmstatus sind diagnostisch
- explizite C-14-Matrixzelle `bear_deep`, 25,01 Prozent Drawdown,
  `wealthFactor === 0`, `wealthSufficient: true` und Alarm aus: Gate aktiv,
  Null-Flex, getrennte Copy fuer
  Alarmunterdrueckung und Gesamtvermoegensnotlage
- Zwei-Jahres-Regressionsfall mit fortbestehendem `bear_deep` und Drawdown ueber
  25 Prozent: Null-Flex in Jahr 1 senkt `lastEntnahmeReal`/`wealthFactor`, darf
  das Gate in Jahr 2 aber nicht selbst abschalten
- schwerer Notfall mit aktivem Mindest-Flex-, Flex-Budget-, 35-Prozent-Alarm-
  und finalem Glättungsfloor: alle Flex-Anhebungen bleiben wirkungslos, Floor
  bleibt centgenau unveraendert
- Floor-Invariante und bestehender Ruinvertrag: finanzierbarer Floor wird voll
  geplant; nicht finanzierbarer Floor liefert im direkten Jahresrunner
  `kind: 'ruin'` mit Pflicht-, Deckungs- und Shortfallbetrag ohne Erfolgsstatus
- Runner-Nichtregression: normale App-, MC- und Backtestpfade behalten
  `BREAK_ON_RUIN = true`; ein expliziter historischer Diagnoselauf mit
  `breakOnRuin: false` sowie Floor-Shortfall-Metriken bleiben unveraendert
- fehlender, `NaN`- oder unendlicher Gesamtvermoegensdrawdown stoppt fail-closed
- strukturelle Trigger-Matrix: Alarm, `bear_deep`, bindender Flexraten-Hard-Cap,
  bindender Spending-Guardrail sowie reine Glättung ohne Signal; eine reine
  Aenderung von `kuerzungQuelle` bleibt wirkungslos
- Golden-Case `bear_deep` + `wealthFactor === 0` + Gesamtvermoegensdrawdown
  unterhalb/auf 25 Prozent: kein positiver normaler Rohcut, kein Null-Flex-Gate
  und Mindest-Flex unveraendert
- Gegenfall `bear_deep` + `wealthFactor === 0` + Gesamtvermoegensdrawdown ueber
  25 Prozent: kein normaler Bear-Kandidat, aber separater NE-03-Null-Flex-Cap
- Anchor-Matrix: `post_internal_smoothing_and_flex_rate_hard_caps` fuer Alarm,
  Bear-Deep und Flexraten-Hard-Cap; `post_spending_guardrails` fuer bindenden
  Spending-Guardrail; `post_total_wealth_drawdown_gate` fuer die schwere
  Flex-Notlage
- Jahr-1-Evidenzlauf mit unveraenderten Eingaben dokumentiert Trigger,
  Anchor-Stage, Kandidat vor Mindest-Flex, reales aktives Gesamtvermoegen,
  realen Peak und Drawdown; fehlende strukturelle Evidenz stoppt den Slice
- Golden-Cases ohne Safety-Signal unveraendert
- relevante `auto-optimize-fidelity`, Backtest-, MC-, Browser- und
  Worker-/Runner-Paritaetstests
- dokumentierter Vorher-/Nachher-Nachweis fuer Worst-Case-Jahr 1; Jahr 2 nur
  als isoliertes Kontrafaktum sowie jahresweise Re-Run-Invariante ohne Uebernahme
  des Produktionslogs als Fixture
- `npm test`
- `npm run build:engine`
- `npm run test:browser`
- `git diff --check`

## Durchgefuehrte Änderungen

Nicht gestartet.

## Ausgefuehrte Tests mit Ergebnis

Planungsvalidierung ohne Implementierungsaenderung am 2026-08-06:

- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`:
  136/136 Assertions bestanden;
- `node tests/run-single.mjs tests/simulation.test.mjs`: 84/84 Assertions
  bestanden;
- `node tests/run-single.mjs tests/historical-backtest-metrics.test.mjs`:
  374/374 Assertions bestanden.

Diese Laeufe belegen den bestehenden Ruin-/Shortfall-Contract zu C-15. Die
eigentlichen Slice-3-Implementierungstests sind noch nicht gestartet.

## Abweichungen vom Plan

Keine; Umsetzung noch nicht begonnen.

## Offene Risiken

- NE-03 erlaubt im schweren konjunktiven Notfall bewusst die vollstaendige
  Streichung des Flex einschliesslich Mindest-Flex. Das ist keine offene
  Nutzerfreigabe mehr, muss aber in Diagnose, Delta und Handbuch deutlich
  sichtbar sein. Der separate Floor bleibt unveraendert.
- `wealthFactor` und `wealthSufficient` koennen wegen der niedrigen
  Vorjahresentnahme einen unterdrueckten Alarm anzeigen, waehrend das separate
  NE-03-Gate aktiv bleibt. Ohne getrennte Quelle und Copy wirkt das
  widerspruechlich. Sie duerfen deshalb nur diagnostisch sein; eine Kopplung
  koennte ein selbstinduziertes Pendeln der Flexrate erzeugen.
- Der historische Feldname `realerDepotDrawdown` kann als reiner Depot- oder
  Aktienwert missverstanden werden. Contract und UI muessen deshalb den
  tatsaechlichen Bezug auf inflationsbereinigtes aktives Gesamtvermoegen und
  dessen realen Peak explizit benennen.
- Die 25-Prozent-Schwelle ist die bereits bestehende Alarmkonfiguration, keine
  neue Kalibrierung. Aendert sich diese Konfiguration spaeter, muss ein
  Contracttest verhindern, dass Diagnosewert und Gate auseinanderlaufen.
- Der Cap macht Guardrails nicht in jedem Jahr zu einer Obergrenze. Er ist nur
  bindend, wenn Alarm oder Guardrail tatsaechlich ein Safety-Signal liefert;
  dieser zustandsbezogene Hinweis bleibt dauerhaft im Handbuch.
- Die konstante Basisalarmkuerzung bleibt durch `wealthFactor` skaliert. Ohne
  fachliche Kalibrierung wird bewusst keine Shortfall-Abstufung erfunden.
- Der normale Cap-Anker schuetzt weiterhin nicht den rohen `bear_deep`-Cut vor
  der internen EMA-/MAX_DOWN-/S-Kurven-Glättung. Nur das separate konjunktive
  Notfallgate setzt danach deterministisch den harten Null-Flex-Cap.
- In fortgesetzten Alarmjahren kann der Cap hauptsaechlich die Aufwaertsglättung
  verhindern und deshalb nur ein kleines Delta erzeugen. Das ist erwartbar und
  im Delta-Nachweis separat auszuweisen, nicht durch Nachkalibrierung zu
  vergroessern.
- Die vorhandene Ruinbehandlung ist je Runner konfigurierbar. Slice 3 darf weder
  `BREAK_ON_RUIN` noch die Floor-Shortfall-Metriken aendern; sein Contract endet
  an der unveraenderten `ruin`-Schnittstelle des direkten Jahresrunners.

## Rueckdokumentation

Nach Abschluss: Hauptplan, `engine/README.md`, Architektur-/Fachkonzept,
Handbuch und betroffene Test-/Delta-Register aktualisieren.

## Freigabestatus

Nicht implementierungsreif; C-12/C-13, C-14/C-15, G-P-01 und
Nutzerentscheidung NE-03 sind
eingearbeitet. Das fruehere Nutzerfreigabegate zur Mindest-Flex-Unterschreitung
ist geschlossen. Struktureller Jahr-1-Evidenzlauf, Gesamtplanfreigabe sowie
Claude- und Gemini-Re-Review des Entwurfs v7 stehen aus.

## Review-Feedback von Gemini

G-P-01 war zum Zeitpunkt des Gemini-Reviews berechtigt: Der damalige Entwurf
hatte die konkrete Unterschreitung des Mindest-Flex noch nicht durch eine
Nutzerentscheidung legitimiert. NE-03 schliesst dieses Gate nun fachlich und
praezisiert zugleich die Grenze. Der marktbedingte Null-Flex-Cap greift nur bei
aktuellem `bear_deep` **und** mehr als 25 Prozent realem Drawdown des aktiven
Gesamtvermoegens. Ein lokaler Extrembär allein reicht nicht; der Floor bleibt
unter allen Umstaenden ungekürzt.

Geminis Pre-Mortem setzt `minimumFlexAnnual` mit dem Haushaltsgrundbedarf gleich.
Das widerspricht dem bestehenden und nun bestaetigten Produktcontract:
Mindest-Flex ist eine Untergrenze fuer flexible Ausgaben und kein zweiter Floor.
Entwurf v7 macht diese Abgrenzung, den engen Notfalltrigger und die absolute
Floor-Prioritaet sichtbar, ohne die wirtschaftliche Tragweite von Null-Flex
kleinzureden.

## Antwort auf Claudes fuenfte Reviewrunde

- **C-14:** Die fehlende Matrixzelle und die Gefahr widerspruechlicher Diagnose
  werden angenommen. Die vorgeschlagene dritte Gatebedingung
  `wealthFactor >= 0.5` wird nicht uebernommen. Der Faktor misst primaer
  `lastEntnahmeReal / depotwertReal`; er ist damit eine durch Null-Flex selbst
  beeinflusste Entnahmebelastung und kein Mass fuer den von NE-03 definierten
  Gesamtvermoegensschaden. Der korrigierte Contract prueft das Gate deshalb
  ausdruecklich auch bei Faktor 0, unterdruecktem Alarm und ueber zwei
  aufeinanderfolgende Krisenjahre.
- **C-15:** Die vorhandene Floor-/Ruin-Semantik ist nun mit ihren tatsaechlichen
  Quellankern dokumentiert. Der direkte Jahresrunner erzeugt bereits
  `kind: 'ruin'` mit Pflicht-, Deckungs- und Shortfallwert. Die normalen Pfade
  verwenden `BREAK_ON_RUIN = true`; der optionale historische Diagnosemodus und
  seine Shortfall-Metriken bleiben unveraendert. Die Jahresanzahlmetrik kann
  bereits eine terminale Ruinzeile zaehlen und beweist keine Fortsetzung im
  Normalpfad. Die fokussierten Planungslaeufe fuer Runner, Simulation und
  Metriken bestanden mit 136/136, 84/84 und 374/374 Assertions. Slice 3 fuehrt
  daher keine neue Terminierung ein.

**Historienhinweis:** Die nachfolgenden Claude-Abschnitte bis zur
„abschliessenden Freigabe“ beziehen sich auf den Stand bis Entwurf v4; die
spaeter darunter dokumentierte fuenfte Runde prueft Entwurf v6. Ihre damals
offene Nutzerbestaetigung wurde durch NE-03 geschlossen. Keiner dieser
historischen Staende ist eine Freigabe des korrigierten Entwurfs v7.

## Review-Feedback von Claude

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Planreview siehe
`FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md` (C-P-01 bis C-P-15).

### 1. Prüfdimensionen

**Korrektheit vs. Akzeptanzkriterien.** Das Ziel beschreibt eine „nach Alarm
und Guardrail bestimmte Flexgrenze". Diesen Zustand gibt es im Code nicht –
siehe C-01. Damit ist das zentrale AK „Finaler Flexwert ist bei aktivem Alarm
niemals höher als der Safety-Cap" zwar prüfbar, trifft aber möglicherweise
nicht den dokumentierten Schadensfall.

**Vertragstreue.** `SPENDING_POLICY_ORDER_CONTRACT`
(`spending-policy-pipeline.mjs:6-15`) und `assertPolicyOrder` prüfen nur die
Reihenfolge der Schritte, nicht deren Wirkungsrichtung. Ein Safety-Cap ist
darin ergänzbar, ohne die Reihenfolge zu verletzen – vertragstechnisch ist
der Slice also machbar. Nicht geregelt ist das Verhältnis des Caps zum harten
35-Prozent-Floor aus `flex-rate-policy.mjs:68, :85` (C-03).

**Fehlerbehandlung.** Der Mindest-Flex kennt heute den Zustand
`blocked_emergency` (`minimum-flex-policy.mjs:169`). Ob ein Safety-Cap diesen
Zustand ebenfalls unterschreiten darf, ist nicht entschieden. Wird er
ausgenommen, entsteht ein zweiter Pfad, auf dem die Auszahlung doch wieder
über dem Cap liegt.

**Seiteneffekte.** Deutlich unterschätzt (C-04): `minimumFlex` wird in den
Tests 273-mal referenziert, verteilt über mehr als 20 Dateien.

**Was könnte brechen?** Der Slice wird grün abgenommen, ohne wirtschaftlich
etwas zu verändern – siehe C-02.

### 2. Findings

#### C-01 (Blocker, entspricht C-P-01) – Alarm und Guardrail schließen sich im Code aus

`spending-policy-pipeline.mjs:36-46` ruft `applyGuardrails` ausschließlich
unter `if (!alarmStatus.active)` auf. Im aktiven Alarm laufen die Guardrails
gar nicht; die Flexrate kommt allein aus `calculateFlexRate`
(`flex-rate-policy.mjs:56-92`). Eine „nach Alarm **und** Guardrail bestimmte"
Grenze existiert nicht.

Zusätzlich datiert die Analyse den Schadensfall auf **Worst-Case Jahr 1** und
den durchgängigen Alarm erst **ab Jahr 2**. Trifft das zu, lief Jahr 1 im
Nicht-Alarm-Pfad – also genau dort, wo dieser Slice ausdrücklich „das heutige
Verhalten" erhalten will. Der Fix ginge am dokumentierten Fall vorbei.

Vor dem ersten Code-Edit zu klären:
1. Alarmzustand des Worst-Case-Jahres 1 aus dem Szenario-Log belegen
   (`alarmActive`, `kuerzungQuelle` des Jahresrecords).
2. Safety-Cap als „stärkste im Jahr ermittelte Sicherheitskürzung aus Alarm
   **oder** Guardrail" definieren, nicht als Konjunktion. Andernfalls muss der
   Slice-Scope den Nicht-Alarm-Guardrailpfad ausdrücklich einschließen.

#### C-02 (hoch, entspricht C-P-10) – Wirkung konzentriert sich auf ein einziges Jahr

Im Auslösejahr gilt `geglätteteFlexRate = Math.max(35, state.flexRate -
zielCutScaled)`. In jedem Folgejahr mit aktivem Alarm dagegen
`geglätteteFlexRate = Math.max(35, state.flexRate)`
(`flex-rate-policy.mjs:85`) – es findet gar kein Cut mehr statt. Ein
Safety-Cap deckelt dort nur noch das Anheben durch Glättung. Die erwartete
Delta-Größe muss **vor** der Umsetzung als Zahl festgehalten werden, sonst ist
ein nahezu unverändertes Backtest-Ergebnis nicht unterscheidbar zwischen
„keine Nebenwirkung" und „Fix wirkungslos".

#### C-03 (hoch) – Verhältnis von Safety-Cap, 35-Prozent-Floor und Mindest-Flex unentschieden

Drei Untergrenzen wirken gleichzeitig: der harte 35-Prozent-Flexrate-Floor,
der Haushalts-Mindest-Flex (30.000 EUR laut Analyse) und der neue Cap. Der
Slice legt nur fest, dass Mindest-Flex den Cap nicht anheben darf. Offen
bleibt, ob der Cap den 35-Prozent-Floor unterschreiten darf und wie der
Zustand `blocked_emergency` behandelt wird. Ohne Entscheidung sind zwei
gegenläufige Implementierungen contractkonform.

#### C-04 (hoch, entspricht C-P-09) – Blast-Radius und Statusvertrag unterschätzt

Der Cap erzeugt zwangsläufig einen neuen `minimumFlexStatus` analog
`limited_by_flex_budget` und `applied_limited_by_final_smoothing`
(`spending-policy-pipeline.mjs:71, :103`), der in Diagnose- und Textverträgen
zu registrieren ist. Betroffen sind unter anderem
`balance-diagnosis-copy-contract`, `balance-diagnosis-keyparams`,
`auto-optimize-fidelity`, `historical-backtest-*`, `monte-carlo-*` und
`browser-smoke`. Die Liste „Gefährdete bestehende Tests" nennt sechs Einträge
und ist zu eng; die Dateiliste dürfte zusammen mit den Statuskonsumenten das
Zehn-Dateien-Limit erreichen.

#### C-05 (mittel, entspricht C-P-08) – „D-11" ist mehrdeutig

Der Bezeichner existiert in drei Registern. Gemeint ist ENG-07 aus
`archive/2026-suite-datenintegritaet-hardening/SLICE_SUITE_DATA_15_MODEL_TRANSPARENCY.md:247`.
Der Befund ist verifiziert: `flex-rate-policy.mjs:68` berechnet
`Math.min(10, Math.round(10 + 20 * shortfallRatio))`; wegen
`shortfallRatio >= 0` ist das Ergebnis konstant `10`. Quellregister und
Codestelle sind im Slice zu nennen.

Fachlich anzumerken: Da die Konstante über `zielCutScaled = zielCut *
wealthFactor` weiterhin skaliert wird, ist die Alarmkürzung nicht vollständig
konstant. Eine „ehrliche Konstante" muss diesen Zusammenhang mitbeschreiben,
sonst entsteht dieselbe Scheinabstufung an anderer Stelle.

#### C-06 (mittel, entspricht C-P-07) – Nutzungseinschränkung wird nur teilweise aufgehoben

Abschnitt 4 des Plans verbietet generell, Guardrails als harte Obergrenze zu
lesen. Dieser Slice stellt die Härte nur im Alarmzustand her. Die
Rückdokumentation muss die Einschränkung zustandsbezogen umformulieren statt
sie aufzuheben.

#### C-07 (niedrig, entspricht C-P-15) – generiertes `engine.js` im Commit

`npm run build:engine` schreibt das versionierte `engine.js`. Die
Commit-Sicherheitsprüfung blockiert bei unerwarteten Dateien. Das Artefakt ist
im Diff-Risiko-Block vorab als erwartet zu deklarieren.

### 3. Pre-Mortem

In drei Monaten zeigt ein neuer Crash-Lauf erneut eine Auszahlung weit
oberhalb des Sicherheitssignals, obwohl der Safety-Cap implementiert und
getestet ist – weil das entscheidende erste Crashjahr vor der
Alarmaktivierung liegt und der Cap dort per Definition nicht greift (C-01).
Das nahezu leere Backtest-Delta wurde bei der Abnahme als Beleg für
Nebenwirkungsfreiheit gelesen statt als Hinweis auf Wirkungslosigkeit (C-02).

### 4. Review-Ergebnis

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-01
- **Restrisiken:** C-02 bis C-07; verbleibend das Risiko, dass ein harter Cap
  in einer langen Krisensequenz den Haushalts-Mindest-Flex dauerhaft
  unterschreitet und damit die reale Lebenshaltung stärker begrenzt, als es
  die Guardrail-Logik je vorgesehen hat – dieser Effekt ist im Delta getrennt
  auszuweisen, nicht nur als Aggregat

## Re-Review von Claude (zweite Runde)

**Reviewstand:** 2026-08-06. C-01 der ersten Runde ist gelöst: Der Faktenbeleg
`Alarm: false` für Jahr 1 ist der entscheidende Schritt, und der Contract auf
„Alarm **oder** Guardrail" umzustellen war richtig. C-03 (35-Prozent-Floor,
`blocked_emergency`), C-05 (ENG-07 mit Quellregister und
`effectiveAlarmCutPct = 10 * wealthFactor`), C-06 und C-07 sind ebenfalls
gelöst. Die Klarstellung „ein nahezu nulles Gesamtdelta ist **kein**
Abnahmenachweis" adressiert C-02 korrekt.

Die Umsetzung des neuen Contracts wirft jedoch drei Fragen auf, die im Code
belegbar sind.

### Neue Findings

#### C-08 (Blocker, entspricht C-P-17) – `safetyCapSource` ist über `kuerzungQuelle` nicht bestimmbar

`kuerzungQuelle` ist ein einziger, mehrfach überschriebener String. Der
`bear_deep`-Zweig setzt `'Tiefer Bär'` (`flex-rate-policy.mjs:131`) oder
`'Tiefer Bär (vermögensadj.)'` (`:123`); unmittelbar danach überschreibt die
interne Glättung mit `'Glättung (Abfall)'` (`:162`) beziehungsweise
`'Glättung (Anstieg)'` (`:159`), anschließend die S-Kurve (`:177-179`).

Der Contract enthält damit zwei gleichzeitig anwendbare, widersprüchliche
Klauseln: „`guardrail_family` umfasst den dokumentierten Nicht-Alarm-
`bear_deep`-Kandidaten" und „reine Profil- oder Komfortglättung aktiviert
keinen Cap".

Für Jahr 1 ist nur die **finale** Quelle `'Glättung (Final-Guardrail)'` belegt.
Welche Quelle der Kandidat vor dem Mindest-Flex trug, ist nicht dokumentiert.
War es `'Glättung (Abfall)'`, ergibt eine quellenbasierte Implementierung
`safetyCapSource = null`, es entsteht kein Cap — und der dokumentierte
Schadensfall bleibt trotz dieses Slices ungefixt.

Erforderlich: strukturelles Triggerkriterium statt Quellenstring, zum Beispiel
„Cap aktiv, wenn `alarmStatus.active` oder `market.sKey === 'bear_deep'` oder
eine Guardrail-/Hard-Cap-Reduktion gebunden hat", plus Beleg der
Kandidatenquelle aus dem Jahr-1-Record vor dem ersten Code-Edit.

#### C-09 (hoch, entspricht C-P-18) – Der Cap ankert hinter der internen Glättung

Der rohe `bear_deep`-Cut (`:111-112`,
`basisKuerzung = 50 + max(0, abstandVomAthProzent - 20)`) wird noch innerhalb
von `calculateFlexRate` EMA-geglättet (`:137-139`) und auf `MAX_DOWN` begrenzt
(`:155-163`) — beides Komfortmechanik, beides **vor** dem Kandidaten, auf den
der Cap ankert. Erst danach greifen die echten Hard Caps
`'Guardrail (Bären-Cap)'` (`:190`) und `'Guardrail (Runway-Cap)'` (`:212`).

„Die stärkste im jeweiligen Jahr wirksame Sicherheitsbegrenzung" ist damit
stärker formuliert als das, was der Slice liefert. Die Scope-Entscheidung ist
vertretbar — der dokumentierte Schaden entstand in den nachgelagerten
Schritten —, muss aber ausdrücklich benannt werden, sonst setzt ein späterer
Bearbeiter den Rohcut als Anker und verändert die Engine weit über diesen
Slice hinaus.

#### C-10 (hoch, entspricht C-P-19) – Das Jahr-2-Orakel ist im Re-Run nicht haltbar

`prevFlexRate = state.flexRate ?? 100` (`:136`) und der Depotwert des
Folgejahres hängen beide vom Vorjahresergebnis ab. Wird Jahr 1 von 53.400 EUR
auf höchstens 12.144,29 EUR gekappt, divergieren ab Jahr 2 sowohl Ratenanker
als auch Portfolio. Die Baseline-Zeile „Worst-Case-Jahr 2 … Cap-Delta 0 EUR"
gilt nur kontrafaktisch für ein isoliert betrachtetes Jahr.

Als Abnahmeorakel würde sie ein korrektes Ergebnis als Abweichung markieren
oder dazu verleiten, bis zur Übereinstimmung nachzujustieren. Die Zeile ist als
Ein-Jahres-Kontrafaktum zu kennzeichnen; für den Re-Run gilt nur die
Richtungsinvariante „finaler Flex ≤ Cap in jedem Jahr mit aktivem
Safety-Signal".

#### C-11 (mittel) – Rollback nimmt Slice-1-Änderungen mit

`simulator-year-result.js` und `mc-log-builder.js` wurden bereits in Slice 1
geändert. „Gezieltes Wiederherstellen der Slice-Dateien" würde diese
Änderungen zurücknehmen. Für beide Dateien ist auf `git revert` des
Slice-3-Commits beziehungsweise gezielte Hunk-Rücknahme umzustellen.

### Review-Ergebnis (zweite Runde)

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-08
- **Restrisiken:** C-09, C-10, C-11; verbleibend die wirtschaftliche Tragweite:
  Ein Cap bei 12.144,29 EUR statt 53.400 EUR im ersten Crashjahr unterschreitet
  den deklarierten Haushalts-Mindest-Flex von 30.000 EUR um mehr als die
  Hälfte. Das ist die ausdrückliche Nutzerentscheidung „Safety vor Komfort",
  sollte aber vor der Umsetzung als konkrete Konsumfolge bestätigt werden, weil
  sie in einer langen Krisensequenz über mehrere Jahre wirkt.

## Drittes Review von Claude

**Reviewstand:** 2026-08-06. C-08 (struktureller Trigger), C-09 (expliziter
Anker `post_internal_smoothing_and_flex_rate_hard_caps`), C-10 (Jahr 2 nur
noch als Ein-Jahres-Kontrafaktum) und C-11 (Rollback, `mc-log-builder.js`
entfernt) sind gelöst. Die Degradierung von `kuerzungQuelle` zu reinem
Anzeigetext plus das AK „Eine Änderung nur von `kuerzungQuelle` bei identischer
struktureller Evidenz darf das Cap-Ergebnis nicht ändern" macht den Trigger
prüfbar. Die aufgenommene Nutzerfreigabepflicht zur Konsumfolge ist der
richtige Schritt.

### Neue Findings

#### C-12 (hoch, entspricht C-P-24) – `bear_deep` triggert auch ohne jede Kürzung

Der Trigger verlangt für Hard-Cap und Guardrail ausdrücklich eine „tatsächlich
reduzierende" Bindung, für `market.sKey === 'bear_deep'` dagegen nichts.
Genau dort existiert aber ein kürzungsfreier Zustand: Bei `wealthFactor === 0`
ist `reductionFactor = 0`, damit `roheKuerzungProzent = 0` und
`roheFlexRate = 100` (`flex-rate-policy.mjs:110-121`); der Code protokolliert
„Keine Reduktion nötig – Entnahmequote unter dem Safe-Wert."

Der Cap wäre dort dennoch aktiv und würde den Mindest-Flex am Anheben hindern,
obwohl dieselbe Wealth-Logik gerade keine Sicherheitskürzung für nötig hält.

Erforderlich: `bear_deep` triggert nur bei `roheKuerzungProzent > 0`
beziehungsweise `wealthFactor > 0`. Golden-Case
`bear_deep` + `wealthFactor === 0` muss `safetyCapSource: null` liefern und
den Mindest-Flex unverändert wirken lassen.

#### C-13 (niedrig, entspricht C-P-28) – `safetyCapAnchorStage` passt nicht für alle Quellen

Bei `safetyCapSource: spending_guardrail` entsteht der Kandidat erst nach
`applyGuardrails`, also eine Stufe nach dem deklarierten Anker. Ein einziger
konstanter Ankerwert beschriftet diesen Fall falsch; der Anker ist je Quelle
auszuweisen.

### Review-Ergebnis (dritte Runde)

- **Status:** freigegeben unter Auflagen
- **Blocker:** keine
- **Auflagen:** C-12 vor dem ersten Code-Edit im Contract korrigieren; C-13
  nachziehen; die im Slice selbst verlangte Nutzerfreigabe zur Konsumfolge
  (12.144,29 EUR gegenüber 30.000 EUR Mindest-Flex) muss vorliegen
- **Restrisiken:** C-12, C-13; verbleibend, dass der Cap in fortgesetzten
  Alarmjahren wegen `geglätteteFlexRate = Math.max(35, state.flexRate)`
  (`flex-rate-policy.mjs:85`) im Wesentlichen nur die Aufwärtswirkung der
  Glättung unterbindet. Das ist korrekt und beabsichtigt, sollte aber im
  Delta-Nachweis sichtbar bleiben, damit die geringe Wirkung dieser Jahre nicht
  als Fehler gelesen wird.

## Abschliessende Freigabe durch Claude

**Reviewstand:** 2026-08-06. C-12 und C-13 sind umgesetzt: Der `bear_deep`-
Trigger verlangt einen positiven Rohcut oberhalb der Toleranz, `wealthFactor
=== 0` liefert `safetyCapSource: null` mit eigenem Golden-Case, und
`safetyCapAnchorStage` wird quellenspezifisch gesetzt.

### Review-Ergebnis (abschliessend)

- **Status:** freigegeben aus Sicht der Vertragsprüfung
- **Blocker:** keine
- **Offene Findings:** keine
- **Zwei Voraussetzungen aus dem Slice selbst bleiben bestehen** und sind keine
  Review-Findings:
  1. die ausdrückliche Nutzerbestätigung, dass der Safety-Cap von 12.144,29 EUR
     den deklarierten Haushalts-Mindest-Flex von 30.000 EUR im Crashjahr
     übersteuern darf;
  2. der strukturelle Evidenzlauf für Worst-Case-Jahr 1 vor dem ersten
     Code-Edit. Ergibt er weder einen `bear_deep`-Rohcut oberhalb der Toleranz
     noch eine tatsächlich reduzierende Hard-Cap-/Guardrail-Bindung, stoppt der
     Slice vertragsgemäß. Dieses Ergebnis ist aus den Planungsdokumenten heraus
     nicht vorhersagbar.
- **Restrisiken:** In fortgesetzten Alarmjahren gilt
  `geglätteteFlexRate = Math.max(35, state.flexRate)`
  (`flex-rate-policy.mjs:85`); der Cap unterbindet dort im Wesentlichen nur die
  Aufwärtswirkung der Glättung. Die geringe Wirkung dieser Jahre ist im
  Delta-Nachweis als erwartet auszuweisen, nicht als Fehler.

## Fünftes Review von Claude (NE-03 und Null-Flex-Gate)

**Reviewstand:** 2026-08-06. Geprüft wurde die Nutzerentscheidung NE-03 mit dem
konjunktiven Null-Flex-Notfallgate.

**Verifiziert und korrekt:** Schwelle `0.25` (`engine/config.mjs:37`);
`realerDepotDrawdown` auf dem **Gesamtvermögen** gebildet
(`SpendingPlanner.mjs:150-153`, `realVermögen = p.gesamtwert /
cumulativeInflationFactor` gegen `peakRealVermoegen`); Grenzwertmatrix
24,99/25,00/25,01 passt zum strikten `>`; der frühere Widerspruch zum
35-Prozent-Alarm-Flexfloor ist sauber aufgelöst (Normalpfad erhalten,
Übersteuerung nur bei aktivem Gate, konsistent im Nicht-Scope formuliert).

### Neue Findings

#### C-14 (Blocker) – Das Gate ignoriert genau die Bedingung, die den Alarm unterdrückt

Das Gate prüft `bear_deep` und `realerDepotDrawdown > 0,25`, aber **nicht**
`wealthSufficient`. Genau diese Größe schaltet im selben Marktzustand den Alarm
ab: `alarm-policy.mjs:67-84` beendet beziehungsweise unterdrückt den Alarm bei
`isCrisis && wealthSufficient` mit dem Text „Vermögen ausreichend – kein
Alarm-Modus trotz Bärenmarkt."

Die Schwelle ist exakt berechenbar: `wealthSufficient = wealthFactor < 0.5`
(`alarm-policy.mjs:40`), `wealthFactor = smoothstep((quote − 0,015) / 0,02)`
(`wealth-reduction.mjs:38`, `config.mjs:108-109`), `smoothstep(t) = t²(3 − 2t)`
(`spending-policy-helpers.mjs:36-39`) mit `smoothstep(0,5) = 0,5`. Daraus folgt:
**`wealthSufficient` ⟺ Entnahmequote < 2,5 Prozent.**

| Zustand | Entnahme | Vermögen | Quote | `wealthSufficient` |
| --- | ---: | ---: | ---: | --- |
| Ausgangslage | 57.600 EUR | 2.769.486 EUR | 2,08 % | ja |
| nach 25 % realem Drawdown | 57.600 EUR | ~2.077.000 EUR | 2,77 % | nein |
| Worst Case nach Flex-Kürzung | 13.331–16.578 EUR | ~2.077.000 EUR | 0,64–0,80 % | ja |

Die dritte Zeile ist entscheidend. `entnahmequoteUsed` bevorzugt
`lastEntnahmeReal / depotwertReal` (`wealth-reduction.mjs:29-31`), also die
tatsächliche Vorjahresentnahme. Sobald das Gate die Auszahlung senkt, fällt die
Quote, `wealthFactor` geht gegen 0, der Alarm bleibt unterdrückt — und das Gate
feuert weiter, solange `bear_deep` und Drawdown über 25 Prozent bestehen. Der
Effekt des Gates stabilisiert das Signal, das gegen seine Notwendigkeit spricht.

Der gesamte flexible Lebensstandard kann damit auf `0` gesetzt werden, während
die Engine im selben Jahr „Vermögen ausreichend" protokolliert. Das
widerspricht der Bezeichnung „schwere Flex-Notlage" und der Korrektur aus
C-P-24, wonach `wealthFactor === 0` ohne Rohkürzung gerade **keinen** Cap
erzeugt.

Die Wahrheitsmatrix deckt diese Zelle nicht ab: Getestet wird `bear_deep` +
`wealthFactor === 0` + Drawdown **≤ 25 Prozent**. Der strittige Fall
`bear_deep` + `wealthFactor === 0` + Drawdown **> 25 Prozent** fehlt.

Empfehlung: dritte Konjunktion `wealthFactor >= 0,5` aufnehmen. Alternativ
entscheidet der Nutzer ausdrücklich dagegen; dann gehört die fehlende
Matrixzelle in die Tests und die Selbstverstärkung über `lastEntnahmeReal` in
die offenen Risiken.

#### C-15 (mittel) – „Vorhandene Solvenzpriorität" nicht belegt

Der Satz „Kann der aktuelle Netto-Floor nicht finanziert werden, muss der Lauf
explizit als Floor-Unterdeckung/Ruin enden" ist als bestehendes Verhalten
deklariert. Das Repository misst Floor-Unterdeckung jedoch als fortlaufende
Größe: `floor_shortfall_nominal` (`historical-backtest-export.js:556`) sowie
`floor_shortfall_occurred`, `floor_shortfall_years` und
`floor_shortfall_total_nominal_eur` (`historical-backtest-metrics.js:107-131`).
Eine gezählte Jahresanzahl setzt voraus, dass ein Lauf nach einer Unterdeckung
weiterläuft.

Vor dem ersten Code-Edit ist das tatsächliche Verhalten zu belegen. Ist die
Terminierung neu, ist sie als eigene Engine-Semantikänderung mit
Vorher-/Nachher-Delta zu deklarieren; andernfalls ist der Satz auf das
Bestehende zurückzunehmen.

### Review-Ergebnis (fünfte Runde)

- **Status:** blockiert
- **Blocker:** C-14
- **Restrisiken:** C-15; unverändert die geringe Cap-Wirkung in fortgesetzten
  Alarmjahren wegen `geglätteteFlexRate = Math.max(35, state.flexRate)`
  (`flex-rate-policy.mjs:85`)

## Sechstes Review von Claude (Entwurf v7 des Slice, Plan v8)

**Reviewstand:** 2026-08-06. Geprüft wurden die Antworten auf C-14 und C-15.

### C-14 – geschlossen; die Ablehnung meiner Empfehlung ist technisch berechtigt

Mein Vorschlag, `wealthFactor >= 0,5` als dritte Gatebedingung aufzunehmen, war
fehlerhaft. Codex' Einwand trifft zu: `wealthFactor` ist **endogen**. Er wird
bevorzugt aus `lastEntnahmeReal / depotwertReal` gebildet
(`wealth-reduction.mjs:29-31`) — also aus der Auszahlung, die das Gate selbst
steuert. Meine Bedingung hätte eine Schwingung erzeugt: Gate an → Flex 0 →
Quote bricht ein → `wealthFactor` fällt unter 0,5 → Gate im Folgejahr aus →
voller Flex → Quote steigt → Gate wieder an. Zwei exogene Bedingungen sind der
richtige Zuschnitt.

Der Sachgehalt des Findings ist über den zweiten der von mir genannten Wege
geschlossen, und zwar vollständig:

| Anforderung aus C-14 Option 2 | Umsetzung |
| --- | --- |
| Verhalten explizit im Contract | Zeile 73: Gate bleibt bei `wealthFactor === 0`, `wealthSufficient: true` und unterdrücktem Alarm aktiv |
| fehlende Matrixzelle | Zeile 325-327: `bear_deep`, 25,01 %, `wealthFactor === 0`, Alarm aus |
| Wahrheitsmatrix erweitert | Zeile 322-323: 24,99/25,00/25,01 gekreuzt mit `wealthFactor` 0/1 und Alarm an/aus |
| Selbstverstärkung dokumentiert | Zeile 396-398 als offenes Risiko; Zwei-Jahres-Regression Zeile 329-331 |
| Asymmetrie zum normalen Trigger begründet | Zeile 107-111: normaler `bear_deep`-Trigger schließt `wealthFactor === 0` aus, das Notfallgate bewusst nicht |

### C-15 – widerlegt; meine Schlussfolgerung war falsch

Der Beleg trägt. Ich habe ihn nachgeprüft:

- `BREAK_ON_RUIN = true` (`app/simulator/simulator-data.js:681`); der
  MC-Runner bricht entsprechend ab (`monte-carlo-runner.js:765, :860`).
- Der Kohortenlauf verwendet ebenfalls `breakOnRuin = true`
  (`historical-backtest-cohorts.js:200`).
- Das Ruinergebnis trägt `requiredFloorNominal`, `coveredFloorNominal`,
  `shortfallNominal` und `terminal_ruin_year: true`
  (`simulator-engine-direct.js:268-281`).
- Der abweichende Default `breakOnRuin = false` gilt nur für den generischen
  historischen Runner (`historical-backtest-runner.js:317`) — genau der
  Diagnosemodus, aus dem die von mir zitierte Metrik `floor_shortfall_years`
  stammt.

Aus der Existenz einer Jahresanzahlmetrik auf den regulären Pfad zu schließen,
war ein Fehlschluss. Die Terminierungssemantik ist bestehend, nicht neu.

### Neues Finding

#### C-16 (niedrig) – Die Gate-Schwelle erzeugt eine Alles-oder-nichts-Kante

Bei `wealthFactor === 0` greift der normale Cap nicht (C-P-24), das Notfallgate
dagegen ab 25,01 Prozent. Zwischen 24,99 und 25,01 Prozent realem
Gesamtvermögensdrawdown springt der wirksame Flex damit von **voll** auf
**null** — im dokumentierten Haushalt von 53.400 EUR auf 0 EUR bei einer
Änderung von zwei Hundertstel Prozentpunkten.

Das ist die Konsequenz eines bewusst binären Gates und kein Fehler. Die
Wahrheitsmatrix prüft die Kante jedoch nur innerhalb eines Jahres, und die
Zwei-Jahres-Regression prüft nur das **Fortbestehen**. Nicht geprüft ist der
Rücksprung: Ein Pfad mit 25,3 → 24,5 → 25,3 Prozent Drawdown liefert
0 → voll → 0 Flex in drei aufeinanderfolgenden Jahren.

Empfehlung: einen solchen Flip-Fall als Delta-Orakel ergänzen. Er ist billig,
und er macht die Schwankungsbreite sichtbar, bevor sie in einem realen
Gegenlauf auftritt.

### Review-Ergebnis (sechste Runde)

- **Status:** freigegeben
- **Blocker:** keine
- **Offene Findings:** C-16 (niedrig, Testergänzung)
- **Restrisiken:** unverändert die geringe Cap-Wirkung in fortgesetzten
  Alarmjahren (`flex-rate-policy.mjs:85`) sowie die in Zeile 396-398 bereits
  dokumentierte Selbstverstärkung über `lastEntnahmeReal`

## Review-Antworten von Codex

Alle dreizehn Findings werden angenommen.

- C-01: Das reale Jahr 1 ist mit `Alarm: false` belegt. Der Contract lautet nun
  Alarm **oder** Guardrail und schliesst den Nicht-Alarm-Guardrailpfad
  ausdruecklich ein.
- C-02: Ein numerisches Vorab-Delta fuer Jahr 1, ein ausdrücklich isoliertes
  Jahr-2-Kontrafaktum und zwei synthetische Bindungsorakel verhindern eine
  wirkungslose Null-Delta-Abnahme.
- C-03: Der 35-Prozent-Floor bleibt Bestandteil der Alarmberechnung; der Cap
  uebernimmt den danach bestimmten Kandidaten. `blocked_emergency` hebt den Cap
  nicht an und bleibt als eigener Status erhalten.
- C-04: Die produktive Dateiliste ist auf maximal acht Dateien einschliesslich
  `engine.js` erweitert. Die breite Testmatrix nennt nun Status-, Copy-,
  Fidelity-, Backtest-, MC-, Browser- und Paritaetsvertraege.
- C-05: „D-11“ wurde durch das eindeutige Quellfinding ENG-07 ersetzt. Der
  Basis-Cut ist ehrlich konstant 10 Prozentpunkte; die vorhandene
  `wealthFactor`-Skalierung wird separat benannt und diagnostiziert.
- C-06: Die Guardrail-Nutzungseinschraenkung wird nicht aufgehoben, sondern als
  zustandsbezogener dauerhafter Handbuchhinweis fortgefuehrt.
- C-07: Das generierte, versionierte `engine.js` ist in Dateiliste und
  Diff-Risiko als erwartetes Build-Artefakt deklariert.
- C-08: Die Cap-Aktivierung beruht ausschliesslich auf strukturierter Evidenz aus
  Alarmstatus, positivem Bear-Deep-Rohcut und tatsaechlich reduzierenden Hard-
  Cap-/Guardrail-Bindings. `kuerzungQuelle` ist nicht steuernd. Der reale
  Jahr-1-Fall benoetigt vor Coding einen dokumentierten Evidenzlauf; fehlt das
  Signal, wird gestoppt.
- C-09: Die Anker sind explizit und quellenspezifisch. EMA, `MAX_DOWN`, S-Kurve
  sowie interne Hard Caps sind fuer die Flexratenquellen vorgelagert; ein
  Spending-Guardrail erhaelt seinen spaeteren eigenen Anker. Der rohe
  Bear-Deep-Cut bleibt selbst kein Cap-Wert.
- C-10: Die 0-EUR-Aussage fuer Jahr 2 ist nur noch ein isoliertes
  Ein-Jahres-Kontrafaktum. Im Re-Run gilt ausschliesslich die jahresweise
  Richtung `finaler Flex <= aktiver Cap`.
- C-11: `mc-log-builder.js` wurde aus diesem Slice entfernt. Fuer die
  verbleibende geteilte Datei `simulator-year-result.js` sind nur Revert des
  exakten Slice-3-Commits oder dokumentierte Hunk-Ruecknahme zulaessig.
- C-12: `bear_deep` allein reicht nicht mehr. Nur ein positiver Rohcut oberhalb
  der Toleranz aktiviert den Kandidaten; `wealthFactor === 0` besitzt einen
  eigenen Golden-Case ohne **normalen** Bear-Kandidaten. Mindest-Flex bleibt
  dabei nur unveraendert, wenn der separate Gesamtvermoegensdrawdown nicht ueber
  25 Prozent liegt; andernfalls greift unabhaengig davon NE-03.
- C-13: `safetyCapAnchorStage` folgt der final diagnostizierten Quelle:
  `post_internal_smoothing_and_flex_rate_hard_caps` oder
  `post_spending_guardrails`. Eine Source-/Anchor-Matrix sichert die Zuordnung.
- C-14: Die fehlende Zelle wird aufgenommen, nicht jedoch die vorgeschlagene
  dritte Gatebedingung. `wealthFactor` ist wegen
  `lastEntnahmeReal / depotwertReal` endogen und misst nicht den realen
  Gesamtvermoegensdrawdown. Das NE-03-Gate bleibt deshalb bei Faktor 0 und
  unterdruecktem Alarm aktiv; ein Zwei-Jahres-Test verhindert, dass Null-Flex
  sein eigenes Gate abschaltet. Alarm- und Null-Flex-Diagnose bleiben getrennt.
- C-15: Der bestehende Contract ist belegt: Der direkte Jahresrunner liefert
  bei nicht deckbarem Netto-Floor bereits `kind: 'ruin'` samt
  `ruinDetails`. Normale Pfade nutzen `BREAK_ON_RUIN = true`; der optionale
  historische Diagnosemodus und seine Shortfall-Metriken bleiben unangetastet.
  Slice 3 fuehrt keine neue Terminierung ein.

Die von Claude benannte wirtschaftliche Tragweite ist durch NE-03 entschieden.
Nicht freigegeben ist dagegen irgendeine pauschale Mindest-Flex-Unterschreitung:
Der marktbedingte Null-Flex-Cap gilt ausschliesslich bei aktuellem `bear_deep`
und mehr als 25 Prozent realem Drawdown des aktiven Gesamtvermoegens. Ausserhalb
dieser Konjunktion bleibt Mindest-Flex die marktbedingte Untergrenze. Der Floor
ist davon getrennt und absolut vorrangig.

- G-P-01: Durch NE-03 geschlossen. Das fruehere offene Nutzergate wird durch
  einen deterministischen konjunktiven Null-Flex-Contract, Grenzwerttests und
  die Floor-Invariante ersetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| C-01 | Claude | Guardrails laufen im Alarm nicht; Zielcontract beschreibt nicht erreichbaren Zustand; Schadensfall vermutlich Nicht-Alarm-Jahr | angenommen | Jahr 1 belegt; Safety-Cap aus Alarm oder Guardrail |
| C-02 | Claude | Wirkung auf das Auslösejahr begrenzt; Delta-Erwartung vorab fehlt | angenommen | numerisches Jahr-1-, isoliertes Jahr-2- und synthetisches Delta-Orakel |
| C-03 | Claude | Verhältnis Cap / 35-Prozent-Floor / `blocked_emergency` unentschieden | angenommen | 35-Floor vorgelagert; `blocked_emergency` bleibt und hebt nicht an |
| C-04 | Claude | Blast-Radius und neuer Statusvertrag unterschätzt | angenommen | acht produktive/generierte Dateien und breite Testmatrix |
| C-05 | Claude | „D-11" mehrdeutig; Konstante wird zusätzlich mit `wealthFactor` skaliert | angenommen | ENG-07, Basis 10 und separate Wealth-Skalierung |
| C-06 | Claude | Nutzungseinschränkung darf nicht vollständig aufgehoben werden | angenommen | dauerhafter zustandsbezogener Handbuchhinweis |
| C-07 | Claude | Generiertes `engine.js` im Diff-Risiko-Block deklarieren | angenommen | als erwartetes Build-Artefakt aufgenommen |
| C-08 | Claude (Re-Review) | `kuerzungQuelle` ist ueberschreibbar und kein sicherer Cap-Trigger | angenommen | strukturelle Evidenz und Jahr-1-Evidenzgate; Text ohne Steuerwirkung |
| C-09 | Claude (Re-Review) | Cap ankert hinter interner Glättung; Ziel war zu stark formuliert | angenommen | Anchor-Stage explizit; Rohcut Nicht-Scope |
| C-10 | Claude (Re-Review) | Jahr-2-Null-Delta ist im Re-Run pfadbedingt unhaltbar | angenommen | nur Ein-Jahres-Kontrafaktum; Re-Run-Invariante je aktivem Jahr |
| C-11 | Claude (Re-Review) | Dateiweises Rollback nimmt Slice-1-Hunks mit | angenommen | Dateilistenueberschneidung reduziert; Commit-/Hunk-Rollback |
| C-12 | Claude (3. Runde) | `bear_deep` aktiviert auch ohne Rohkuerzung einen normalen Cap | angenommen | positiver Rohcut fuer normalen Bear-Cap erforderlich; separates NE-03-Gate unabhaengig |
| C-13 | Claude (3. Runde) | ein konstanter Anchor-Stage-Wert beschriftet Spending-Guardrails falsch | angenommen | zwei quellenspezifische Anchor-Werte und Zuordnungstest |
| C-14 | Claude (5. Runde) | Null-Flex-Gate ignoriert die alarmunterdrueckende Entnahmebelastung | Contract-/Testluecke angenommen; dritte Gatebedingung abgelehnt | Faktor 0 und Alarm aus sind explizite aktive Gatezelle; getrennte Diagnose und Zwei-Jahres-Test |
| C-15 | Claude (5. Runde) | vorhandene Floor-/Ruin-Prioritaet nicht belegt | Belegforderung angenommen; neue Semantikannahme abgelehnt | bestehendes `ruin`-Jahresresultat und Standardabbruch belegt; Diagnosemodus/Metriken unveraendert |
| G-P-01 | Gemini | konkrete Nutzerfreigabe fuer die Mindest-Flex-Unterschreitung fehlt | durch NE-03 geschlossen | Null-Flex nur bei `bear_deep` und >25 % realem aktivem Gesamtvermoegensdrawdown; Floor absolut vorrangig |
