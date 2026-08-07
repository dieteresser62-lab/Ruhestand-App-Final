# Slice Abschlusshaertung 03: Safety-Policy-Prioritaet

**Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** noch nicht angelegt/veroeffentlicht<br>
**Status:** Implementierung nach dem Claude/Opus-Code-Review vom 2026-08-07 korrigiert; S3-01 bis S3-08 sind im Coding und in den Test-/Messvertraegen bearbeitet, die interne Vollvalidierung ist gruen. Das Claude-Code-Re-Review vom 2026-08-07 hat jede Nachbesserung einzeln gegen den unveraenderten Stand nachgemessen; Ergebnis **freigegeben**, offen bleiben S3-09 und S3-10 (mittel) sowie S3-11 (niedrig). Externe Codefreigabe ausstehend<br>
**Hauptplan:** [FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md](FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md)

## Ziel

Der nach interner Flexraten-Glättung und den dortigen Hard Caps verbleibende
Kandidat eines strukturell aktiven **Alarm- oder Guardrail-Signals** wird zum
Safety-Policy-Ziel gegen spaetere Aufwaertsglättung. Seine im aktuellen Jahr
harte Obergrenze respektiert die bestehenden Flex-Aenderungsgrenzen. Ausserhalb
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
  Untergrenze begrenzt. Das tiefere Policy-Ziel wird nur innerhalb der
  bestehenden jaehrlichen Auf-/Abwaertsgrenzen erreicht; finale Glättung darf
  die fuer dieses Jahr wirksame Obergrenze nicht ueberschreiten.
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
| dokumentiertes Worst-Case-Jahr 1, `Alarm: false` | Guardrail-Signal 12.144,29 EUR; Mindest-Flex 30.000 EUR; final 53.400 EUR | erst nach Evidenzlauf: bei `bear_deep` und >25 % realem Gesamtvermoegensdrawdown finaler Flex 0; sonst normales Safety-Ziel mindestens auf Mindest-Flex anheben und nur innerhalb der Jahres-Abwaertsgrenze annaehren |
| synthetischer lokaler Extrembär | `bear_deep`, realer Gesamtvermoegensdrawdown 20 %, Safety-Kandidat 20 %, Mindest-Flex-Rate 50 %, Vorjahresrate 100 % | Notfallgate aus; Policy-Ziel 50 %, wirksame Jahresobergrenze und finaler Flex 90 %, Mindest-Flex erfuellt |
| synthetische schwere Flex-Notlage | `bear_deep`, realer Gesamtvermoegensdrawdown 25,01 %, Mindest-Flex-Rate 50 %, alle Aufwaertsfloors aktiv | Notfallgate an; final 0 %, Status `overridden_by_severe_flex_emergency`, Netto-Floor unveraendert |
| schwere Flex-Notlage bei unterdruecktem Alarm | `bear_deep`, Gesamtvermoegensdrawdown 25,01 %, `wealthFactor: 0`, `wealthSufficient: true`, `alarmStatus.active: false` | Notfallgate bleibt an und final 0 %; Alarmunterdrueckung sowie separater Null-Flex-Grund beide sichtbar |
| Grenzwert exakt 25,00 % | `bear_deep`, Gesamtvermoegensdrawdown exakt Schwelle | Notfallgate aus, weil bestehender Contract strikt `>` verwendet |
| Vermoegensschaden ohne Extrembär | anderes Regime, Gesamtvermoegensdrawdown 40 % | kein marktbedingter Null-Flex-Cap; normale Solvenz-/Guardrailregeln bleiben |
| Floor nicht finanzierbar | beliebiges Regime, aktives Vermoegen unter aktuellem Netto-Floor | explizite Floor-Unterdeckung/Ruin; niemals stiller kleinerer Floor oder Erfolgsstatus |
| Schwellen-Flip ueber drei Jahre (C-16) | `bear_deep`, Drawdownfolge 25,3 -> 24,5 -> 25,3 Prozent bei ansonsten unveraenderten exogenen Bedingungen | Null-Flex -> normaler Flexcontract -> Null-Flex; der abrupte Ruecksprung ist als bewusste Folge des binaeren Gates sichtbar |

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
- `engine/planners/alarm-policy.mjs`
- `engine/planners/spending-diagnosis.mjs`
- `app/balance/balance-diagnosis-keyparams.js`
- `app/balance/balance-binder-diagnosis.js`
- `app/simulator/simulator-year-result.js`
- `engine.js` als erwartetes, von `npm run build:engine` generiertes und
  versioniertes Build-Artefakt

Zusammen mit der nachfolgend deklarierten Handbuchaenderung umfasst die
Plan-/Aenderungsunion nach der Reviewkorrektur zehn produktive beziehungsweise
generierte Dateien; `engine.js` blieb davon bytegleich. Tatsaechlich geaendert
sind neun Produktdateien. Die zahlreichen betroffenen Testdateien sind bewusst
nicht Teil dieser Zaehlung. Ab einer elften Programmdatei gilt zwingend die
Nutzer-/Teilungs-Stop-Regel.

**Planergaenzung vor der Handbuchaenderung am 2026-08-07:** Der verpflichtende
Nutzerhinweis in `Handbuch.html` ist eine HTML-Programmdatei und wird deshalb
als achte tatsaechlich geaenderte Produktdatei gezaehlt. Das vorab erwartete
Build-Artefakt `engine.js` wurde ausschliesslich durch `npm run build:engine`
erzeugt/geprueft, blieb wegen des unveraenderten Fallback-Wrappers aber
bytegleich und erscheint nicht im Diff. Der damalige produktive Scope blieb
damit bei acht statt neun Dateien; `dist/` und Releaseartefakte blieben
unberuehrt.

**Scope-Ergaenzung nach S3-05 am 2026-08-07:** Opus hat zu Recht die doppelte
Alarmunterdrueckungsschwelle `0,5` beanstandet. Deshalb ist
`engine/planners/alarm-policy.mjs` als neunte tatsaechlich geaenderte
Produktdatei aufgenommen. Sie exportiert die gemeinsame Konstante; die
Pipeline konsumiert denselben Wert. Die 10-Dateien-Stopregel bleibt eingehalten.

## Diff-Risiko vor Coding

**Umsetzungsstand vor erstem Programmcode-Edit am 2026-08-07.** Dies ist eine bewusste
Engine-Semantikaenderung und daher der riskanteste Slice.

```text
git branch --show-current: codex/fokussierte-abschlusshaertung
git status --short: sauber

Geplante Dateien:
- engine/planners/spending-policy-pipeline.mjs
- engine/planners/flex-rate-policy.mjs
- engine/planners/SpendingPlanner.mjs
- engine/planners/spending-diagnosis.mjs
- app/balance/balance-diagnosis-keyparams.js
- app/balance/balance-binder-diagnosis.js
- app/simulator/simulator-year-result.js
- engine.js als generiertes Build-Artefakt

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

### Struktureller Jahr-1-Evidenzlauf vor Coding

Am 2026-08-07 wurde der unveraenderte produktive
`MonteCarloExportV1`-Request mit 10.000 Laeufen, Seed 12345 und der aktuellen
Runtime deterministisch wiederholt. Der Worst Run blieb Run 3960 mit
297.763,8444 EUR nominalem Endvermoegen; sein Jahr 1 reproduzierte den
archivierten Record exakt. Danach wurde nur dieser Index mit vollstaendigem
Logging erneut ausgefuehrt.

| Evidenz | Reproduzierter Wert | Einordnung fuer Slice 3 |
| --- | ---: | --- |
| Marktregime | `bear_deep` | aktuelles extremes Baerenregime belegt |
| Alarm | `false` | normaler Nicht-Alarm-Pfad |
| positiver Bear-Rohcut | `true`, `wealthFactor = 1` | strukturelles normales Safety-Signal; keine Textheuristik |
| Kandidat nach interner Glaettung/S-Kurve/Hard-Caps | 20,2404853493 % | Cap-Anker fuer den normalen Bear-Pfad |
| bindender Flexraten-Hard-Cap | `false` | Quelle bleibt der positive Bear-Rohcut |
| bindender Spending-Guardrail | `false` | kein Guardrail-Rate-Cap in diesem Jahr |
| reales aktives Gesamtvermoegen | 1.930.896,2238 EUR | entspricht im Initialjahr dem realen Peak |
| realer Peak | 1.930.896,2238 EUR | Initialpeak |
| realer Gesamtvermoegensdrawdown | 0 | NE-03-Null-Flex-Gate aus |
| Mindest-Flex erforderliche Rate | 50 % | hebt den Kandidaten im Normalpfad auf die marktbedingte Untergrenze |
| finaler Baseline-Flex | 89 % | bisherige finale Aufwaertsglaettung uebersteuert Safety und Mindest-Flex |

Damit war das Vor-Coding-Gate erfuellt. Die damalige Erwartung eines sofortigen
finalen Werts von 50 Prozent beziehungsweise 30.000 EUR Haushalts-Flex ist
durch S3-01 ueberholt: Das Policy-Ziel bleibt 50 Prozent, darf aber die
bestehende Jahres-Abwaertsgrenze nicht umgehen. Die personenbezogenen Eingaben
und vollstaendigen Logs werden weiterhin nicht als Fixture eingecheckt.

## Geplante Tests

- `node tests/run-single.mjs tests/spending-planner.test.mjs`
- `node tests/run-single.mjs tests/liquidity-guardrail.test.mjs`
- `node tests/run-single.mjs tests/liquidity-runway-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-guardrails.test.mjs`
- Copy-/Keyparam-Contracttests fuer `overridden_by_severe_flex_emergency`,
  `blocked_emergency`, Gatewerte, Cap-Quelle, Floor-Schutz und final begrenzende
  Policy
- synthetischer normaler Safety-Fall mit Vorjahresrate 80, Kandidat 20 und
  Mindest-Flex-Ziel 50: aktueller Flex 70, also maximal 10 Prozentpunkte
  Absenkung; das Policy-Ziel 50 bleibt sichtbar aufgeschoben und Mindest-Flex
  erfuellt
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
- C-16-Drei-Jahres-Flipfall mit `bear_deep` und Drawdownfolge
  25,3 -> 24,5 -> 25,3 Prozent: Flexfolge 0 -> normaler Contract -> 0; kein
  Hystereseverhalten erfinden
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

Die Implementierung fuehrt `SpendingPolicyOrderV2` mit dem abschliessenden
Schritt `safety_cap` ein und transportiert strukturierte Safety-Evidenz statt
Textheuristiken. Als normale Quellen gelten aktiver Alarm, positiver
`bear_deep`-Rohcut, ein tatsaechlich bindender Flexraten-Hard-Cap oder ein
tatsaechlich bindender Spending-Guardrail. Je Quelle werden Kandidat,
Anchor-Stage und Bindungsstatus festgehalten; bei mehreren Kandidaten gilt die
niedrigste Rate, bei Gleichstand die dokumentierte Quellenprioritaet.

Das normale Safety-Policy-Ziel wird nach Mindest-Flex, Flex-Budget und finaler
Glaettung geprueft. Seine im aktuellen Jahr wirksame Obergrenze wird mit
denselben bestehenden Auf-/Abwaertsgrenzen wie die finale Flexrate bestimmt;
der Cap kann `MAX_DOWN_IN_BEAR_PP` daher nicht mehr umgehen. Ein noch nicht
erreichbares Ziel wird mit `safetyCapDeferredByRateLimit` sichtbar auf
Folgejahre verschoben. Bei rein marktbedingten Safety-Caps bleibt Mindest-Flex
ausserhalb einer schweren Flex-Notlage die Untergrenze, sofern kein bestehender
Alarm-, Solvenz- oder Runway-Blocker greift. Der konstante Alarmcut betraegt
ehrlich ausgewiesene 10 Prozentpunkte und wird mit dem vorhandenen
Entnahmebelastungsfaktor multipliziert; die diagnostische Schwelle `0,5` stammt
nun gemeinsam aus `alarm-policy.mjs`.

Das separate schwere Notfallgate ist exakt die Konjunktion aus
`market.sKey === 'bear_deep'` und einem realen Drawdown des aktiven
Gesamtvermoegens von **mehr als** 25 Prozent. Exakt 25 Prozent aktiviert es
nicht. Ein negativer, vor der Peak-Aktualisierung technisch moeglicher
Drawdownwert wird semantisch als neues Hoch und damit 0 Prozent interpretiert;
fehlende oder nicht-endliche Werte stoppen fail-closed. Alarm,
`wealthFactor` und `wealthSufficient` bleiben reine Diagnose und sind keine
dritte Gatebedingung.

Bei aktivem schweren Gate wird der gesamte Flex einschliesslich Mindest-Flex,
35-Prozent-Alarmfloor, Budgetfloor und finaler Glaettung auf 0 gesetzt. Der
Status lautet `overridden_by_severe_flex_emergency`. Der separat geplante
Floor wird weder gekuerzt noch neu berechnet. Engine-Diagnose, Balance-
Schluesselparameter und Simulator-Jahreslog weisen Safety-Quelle, Roh- und
wirksamen Cap, Gatewerte, final begrenzende Policy, Mindest-Flex-Ueberstimmung,
Alarmdiagnose und Floor-Schutz getrennt aus.

Der persistierte Jahres-Istwert bleibt im schweren Gate exakt 0 Prozent. Fuer
die Folgejahresglaettung wird getrennt der normale Wert unmittelbar vor dem
Notfallgate gespeichert. Damit kann ein einzelnes Krisenjahr die Flex-Erholung
nicht mehr ueber `MAX_UP_PP` fuer mehrere Jahre unter das wieder anwendbare
Mindest-Flex druecken. In allen normalen Jahren bleibt die nach
Monatsquantisierung tatsaechliche Flexrate der Glaettungsanker; die Korrektur
veraendert diesen etablierten Vertrag nicht.

Geaendert wurden acht Engine-/App-Dateien sowie die Nutzererlaeuterung in
`Handbuch.html`. Hinzu kamen `tests/spending-safety-cap.test.mjs`, angepasste
Integrations-/Messvertraege und die neue unveraenderliche Pending-Fixture
`tests/fixtures/safety-policy-slice-03-measurement-v1.json`. Persoenliche
Replaydaten wurden nicht eingecheckt.

## Ausgefuehrte Tests mit Ergebnis

Planungsvalidierung ohne Implementierungsaenderung am 2026-08-06:

- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`:
  136/136 Assertions bestanden;
- `node tests/run-single.mjs tests/simulation.test.mjs`: 84/84 Assertions
  bestanden;
- `node tests/run-single.mjs tests/historical-backtest-metrics.test.mjs`:
  374/374 Assertions bestanden.

Diese Laeufe belegen den bestehenden Ruin-/Shortfall-Contract zu C-15.

Implementierungsvalidierung am 2026-08-07:

- `tests/spending-safety-cap.test.mjs`: 119/119 Assertions; enthalten sind
  Wahrheitsmatrix, Schwellen 24,99/25,00/25,01 Prozent, Faktor 0/1,
  Alarmunabhaengigkeit, Mindest-Flex-/Guardrail-/Alarm-Caps, fail-closed
  Gatewerte, neues Vermoegenshoch, C-16-Folge 0 -> normal -> 0, die
  10-Prozentpunkte-Abwaertsgrenze, persistente Krisenjahre, sofortige
  Mindest-Flex-Erholung und reale Evidenzerzeuger;
- `tests/spending-planner.test.mjs`: 159/159;
- Balance-Keyparam-/Copy-Vertraege: 37/37 und 28/28;
- Guardrail-/Runway-/Simulation-/Core-Steuervertraege: 12/12, 26/26,
  91/91 und 88/88;
- Worker-/Runner-Paritaet und Auto-Optimize: 584/584 und 184/184;
- historische Cohorts, Backtest-, Monte-Carlo- und Demografiemessungen:
  59/59, 260/260, 799/799 und 31/31;
- `npm run build:engine`: bestanden; der dokumentierte Fallback-Build wurde
  genutzt, weil `esbuild` lokal nicht verfuegbar war; `engine.js` blieb
  bytegleich;
- `npm test`: 169 Testdateien, 19.382/19.382 Assertions, 0 fehlgeschlagene
  Dateien und 0 offene Handles;
- `npm run test:browser`: erster Lauf nach sechs erfolgreichen Workflows mit
  lokalem Windows-`ERR_NO_BUFFER_SPACE` abgebrochen; unmittelbarer sauberer
  Wiederholungslauf mit allen 29 Browserworkflows bestanden;
- zusaetzliche In-App-Browser-Sichtpruefung: `Balance.html` geladen und die
  Entscheidungsdiagnose geoeffnet; der temporaere lokale Server wurde danach
  beendet.

Historisches Delta 2000-2025 aus der neuen Messfixture:

- 26/26 Jahre abgeschlossen, Outcome unveraendert, maximaler absoluter
  `portfolio_flow_delta` 0 EUR;
- schweres Gate bindet exakt 2002, 2003, 2004 und 2008; die jeweilige
  Auszahlung entspricht centgenau dem inflationierten Floor;
- 0 Floorverletzungen, 0 Mindest-Flex-Verletzungen im normalen Safety-Pfad
  und 0 Floor-Abweichungen im schweren Gate;
- der reale 2000-2025-Pfad enthaelt weiterhin keinen normalen bindenden oder
  aufgeschobenen Cap und behauptet auch keinen. Drei zusaetzliche, durch den
  echten `SpendingPlanner` erzeugte Messzeugen belegen stattdessen: normales
  Policy-Ziel 50 Prozent bei rate-limitierter Jahresrate 90 Prozent und
  erfuelltem Mindest-Flex; schwere Notlage mit positivem Mindest-Flex, final
  0 Prozent und exakt Floor; erstes Erholungsjahr mit 75 Prozent und
  erfuelltem Mindest-Flex;
- Gesamtentnahme +38.238,36 EUR, Endvermoegen -111.704,33 EUR und Steuer
  +6.248,90 EUR gegen die bytegeschuetzte Eingangsgrenze. Das korrigierte
  Ergebnis ist plausibel: normale Abwaertsglaettung bleibt erhalten und die
  Erholung nach dem Null-Flex-Gate wird nicht mehr kuenstlich verzoegert;
- alle drei Monte-Carlo-Projektionshashes aendern sich erwartungsgemaess bei
  8/8 finanziell auswertbaren Runs und 0 technischen Fehlern;
- die Demografie-/Pflegepfade behalten ihre fachlichen Invarianten; geaendert
  sind erwartungsgemaess nur die davon abhaengigen Finanzpfade.

## Abweichungen vom Plan

`engine.js` war als erwartetes achtes Build-Artefakt deklariert, blieb beim
Fallback-Build jedoch bytegleich. Stattdessen wurde die im Slice bereits
verlangte dauerhafte Nutzerinformation in `Handbuch.html` als achte
tatsaechlich geaenderte Produktdatei gezaehlt und vor ihrem Edit oben
nachdeklariert. Nach S3-05 kam `alarm-policy.mjs` fuer die gemeinsame
Alarmunterdrueckungsschwelle als neunte tatsaechlich geaenderte Produktdatei
hinzu. Die Plan-/Aenderungsunion umfasst damit zehn Dateien, die Stopregel ab
mehr als zehn Programmdateien ist eingehalten.

Der Planner kann vor der jaehrlichen Real-Peak-Aktualisierung bei einem neuen
Vermoegenshoch rechnerisch einen negativen Drawdown liefern. Der Planner reicht
diesen endlichen Rohwert jetzt unveraendert weiter; nur das Gate normalisiert
ihn semantisch auf 0. Fehlende, `NaN`- oder unendliche Werte bleiben
fail-closed. Dieser Randfall ist explizit vom echten Planner bis zum Gate
getestet und dokumentiert.

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
- Das bewusst binaere Gate kann bei einem Drawdown-Ruecksprung ueber die
  Schwelle die Flexrate abrupt 0 -> normal -> 0 wechseln lassen. C-16 verlangt
  deshalb einen sichtbaren Drei-Jahres-Delta-Test; dieser Slice fuehrt keine
  unentschiedene Hysterese oder neue Schwelle ein.
- Der Cap macht Guardrails nicht in jedem Jahr zu einer Obergrenze. Ein
  Policy-Ziel entsteht nur bei strukturellem Safety-Signal und kann wegen der
  jaehrlichen Aenderungsgrenzen im aktuellen Jahr noch nicht bindend sein. Ziel,
  wirksame Jahresobergrenze und Aufschub muessen deshalb getrennt angezeigt
  bleiben; der historische 2000-2025-Pfad enthaelt keinen normalen Bindungsfall.
- Die konstante Basisalarmkuerzung bleibt durch `wealthFactor` skaliert. Ohne
  fachliche Kalibrierung wird bewusst keine Shortfall-Abstufung erfunden.
- Der normale Cap-Anker schuetzt weiterhin nicht den rohen `bear_deep`-Cut vor
  der internen EMA-/MAX_DOWN-/S-Kurven-Glättung. Nur das separate konjunktive
  Notfallgate setzt danach deterministisch den harten Null-Flex-Cap.
- Der getrennte Krisen-Glaettungsanker ist absichtlich eine eng begrenzte
  Ausnahme. Wuerde er auch in normalen Jahren die unquantisierte Policy-Rate
  statt der tatsaechlichen Flexrate speichern, entstuende ein neuer verdeckter
  Mehrjahresvertrag. Ein Regressionstest und die Planner-Implementierung halten
  normale Jahre deshalb beim quantisierten Istwert.
- In fortgesetzten Alarmjahren kann der Cap hauptsaechlich die Aufwaertsglättung
  verhindern und deshalb nur ein kleines Delta erzeugen. Das ist erwartbar und
  im Delta-Nachweis separat auszuweisen, nicht durch Nachkalibrierung zu
  vergroessern.
- Die vorhandene Ruinbehandlung ist je Runner konfigurierbar. Slice 3 darf weder
  `BREAK_ON_RUIN` noch die Floor-Shortfall-Metriken aendern; sein Contract endet
  an der unveraenderten `ruin`-Schnittstelle des direkten Jahresrunners.

## Rueckdokumentation

Hauptplan, `README.md`, `docs/reference/TECHNICAL.md`, `engine/README.md`,
`tests/README.md`, Handbuch und dieses Slice-Dokument wurden mit Contract,
Delta und Validierungsstand synchronisiert. Die Messfixture bleibt bis zur
externen Pruefung auf `pending_external_review`.

## Freigabestatus

Implementierung und Korrekturrunde am 2026-08-07 abgeschlossen und intern gegen
Unit-, Contract-, Backtest-, Monte-Carlo-, Demografie-, Paritaets- und
Browsergates validiert. C-12/C-13, C-14/C-15, G-P-01, C-16,
Nutzerentscheidung NE-03 sowie S3-01 bis S3-08 sind im Code- und Testcontract
bearbeitet. Claudes/Opus' dokumentiertes Review-Ergebnis bleibt als historischer
Reviewstand unveraendert; fuer die korrigierte Fassung sind externe Re-Review
und Freigabe offen. Codex erteilt keine Eigenfreigabe, fuehrt keinen Commit aus
und markiert die Messfixture nicht als reviewed.

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
  Richtung `finaler Flex <= aktuell wirksamer rate-limitierter Cap`.
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
| C-16 | Claude (6. Runde) | binaere Schwellenkante kann 0 -> normal -> 0 Flex ueber drei Jahre erzeugen | angenommen | Drei-Jahres-Flipfall als Delta- und Regressionstest aufgenommen; keine neue Hysterese |
| S3-01 | Claude (Code-Review) | Cap laeuft nach `final_smoothing` und hebt `MAX_DOWN_IN_BEAR_PP = 10` auf; gemessen 66 pp Ruecksprung in einem Jahr, -39.600 € | angenommen, korrigiert; im Re-Review bestaetigt | normales Policy-Ziel wird erneut durch `applyFinalRateLimits` gefuehrt; Vierjahresfolge 100 -> 90 -> 80 -> 70 -> 60 belegt maximal 10 pp |
| S3-02 | Claude (Code-Review) | ein Notfalljahr erzeugt ueber `MAX_UP_PP = 12` vier Folgejahre Mindest-Flex-Unterdeckung im erholten Markt; 48.000 € undeklariert | angenommen, korrigiert; im Re-Review bestaetigt | Ist-Nullrate und Vor-Gate-Glaettungsanker getrennt persistiert; erstes Erholungsjahr erreicht 75 % und erfuellt Mindest-Flex |
| S3-03 | Claude (Code-Review) | C-16-Orakel `rates[1] > 0` zu schwach; Istwert 12 % statt „normaler Flexcontract" | angenommen, korrigiert; im Re-Review bestaetigt | C-16 fordert im Mitteljahr mindestens die erforderlichen 50 % und `minimumFlexFulfilled: true` |
| S3-04 | Claude (Code-Review) | Messfixture belegt den normalen Cap nicht (0 bindende Jahre) und keinen positiven Mindest-Flex im Gate | Beweisluecke angenommen, historische Nichtbindung nicht umgedeutet; im Re-Review bestaetigt | Fixture weist 0 normale Bindungsjahre ehrlich aus und ergaenzt echte Planner-Zeugen fuer rate-limitiertes Normalziel, positives Mindest-Flex im Gate und erstes Erholungsjahr |
| S3-05 | Claude (Code-Review) | Schwelle 0,5 fuer die Alarmunterdrueckung in Pipeline und `alarm-policy.mjs` doppelt hartkodiert | angenommen, korrigiert; im Re-Review bestaetigt | exportierte gemeinsame `ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD` samt Grenztest |
| S3-06 | Claude (Code-Review) | geforderter Zwei-Jahres-Persistenztest fehlt; Persistenz im Review manuell nachgewiesen | angenommen, korrigiert; im Re-Review bestaetigt | acht aufeinanderfolgende schwere Jahre bleiben bei Ist-Flex 0, der Erholungsanker bleibt mindestens auf Mindest-Flex-Niveau und das erste Erholungsjahr erfuellt Mindest-Flex |
| S3-07 | Claude (Code-Review) | Drawdown-Klammer sitzt zusaetzlich an der Quelle; Gate-Klammer im Produktionspfad toter Code | angenommen, korrigiert; im Re-Review bestaetigt | Planner transportiert den endlichen negativen Rohwert bei neuem Hoch; ausschliesslich das Gate normalisiert auf 0 |
| S3-08 | Claude (Code-Review) | Wahrheitsmatrix speist handgebaute Evidenz; `bear_deep`- und Hard-Cap-Erzeugung nicht End-to-End geprueft | angenommen, korrigiert; im Re-Review bestaetigt | zusaetzliche Tests erzeugen `bear_deep`- und `flex_rate_hard_cap`-Evidenz ueber das reale `calculateFlexRate`; Text bleibt ohne Steuerwirkung |
| S3-09 | Claude (Re-Review) | normaler Cap bleibt im dokumentierten Schadensfall wirkungslos; alle fuenf Jahre identisch zur Baseline, nie bindend | offen (mittel) | offen |
| S3-10 | Claude (Re-Review) | Glaettungsreferenz wirkt zusaetzlich auf `entnahmequoteDepot` und damit auf den Alarmtrigger; nicht dokumentiert | offen (mittel) | offen |
| S3-11 | Claude (Re-Review) | `nextFlexRateSmoothingReferencePct` hat zwei Schreibstellen; Gleichheit nur fuer Notfalljahre getestet | offen (niedrig) | offen |

## Code-Review von Claude (Slice-3-Implementierung)

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`,
Baseline `c322bbe`. Alle Zahlen unten sind eigene Messungen gegen einen aus
`git archive HEAD` extrahierten unveraenderten Engine-Stand, nicht uebernommene
Angaben aus dem Slice-Dokument.

### 1. Unabhaengig verifizierte Gates

- `npm test`: 19.342 von 19.342 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles — deckt sich exakt mit der Angabe im Dokument.
- `npm run test:browser`: Exitcode 0, alle Workflows bestanden.
- `git diff --check`: ohne Befund.
- Produktiver Dateiumfang: acht Dateien (`Handbuch.html`, drei App-Dateien,
  vier Engine-Planner). Die Zaehlung im Dokument stimmt.
- `engine.js`, `dist/` und Releaseartefakte sind unberuehrt.

### 2. Prueffdimensionen

**Korrektheit.** Die Wahrheitsmatrix des Notfallgates ist korrekt umgesetzt.
Eigene Messung des Grenzwerts: 0,249999 -> Gate aus, 0,25 exakt -> Gate aus,
0,2500000001 -> Gate an. Der strikte `>`-Contract haelt. Die
Zwei-Jahres-Persistenz haelt ebenfalls: bei konstantem `bear_deep` und 30 %
Drawdown bleibt das Gate ueber drei Jahre aktiv, obwohl der
Entnahmebelastungsfaktor in Jahr 1 auf 0 faellt und ab Jahr 2 auf 0,9963
springt. C-14 ist damit im Code geschlossen.

**Vertragstreue.** Der Cap wird als `SpendingPolicyOrderV2` sauber als
sechster Schritt eingehaengt; `assertPolicyOrder` deckt ihn ab.
`spending-guardrails.mjs` bleibt unveraendert. Verletzt wird jedoch ein
anderer, bestehender Contract — siehe S3-01.

**Fehlerbehandlung.** `evaluateSevereFlexEmergency` wirft bei nicht endlichem
Drawdown und bei ungueltiger Schwelle. Das ist fail-closed und getestet. Die
Schwelle wird korrekt aus `CONFIG.THRESHOLDS.ALARM.realDrawdown` gelesen, nicht
dupliziert — anders als der Faktorschwellwert in S3-05.

**Seiteneffekte.** Der Cap wirkt in jedem Jahr mit strukturellem Signal, nicht
nur im Krisenjahr. Die Nebenwirkung auf die Abwaertsglaettung und auf die
Folgejahre nach einem Notfalljahr ist im Plan nicht deklariert und in keiner
Messung sichtbar — S3-01, S3-02, S3-04.

**Was koennte brechen?** Der Nutzer erhaelt nach einem einzigen Krisenjahr
ueber fuenf Jahre weniger als seinen gesetzten Mindest-Flex, obwohl der Markt
vollstaendig erholt ist.

### 3. Findings

#### S3-01 (Blocker) – Der Safety-Cap hebt die konfigurierte Abwaertsglaettung auf

`CONFIG.SPENDING_MODEL.FLEX_RATE_FINAL_LIMITS.MAX_DOWN_IN_BEAR_PP = 10.0` ist
im Code ausdruecklich als „Sanfterer Abbau im Baerenmarkt" kommentiert und
begrenzt den jaehrlichen Flexrueckgang. Der neue Schritt `safety_cap` laeuft
laut Contract **nach** `final_smoothing` und ueberschreibt dessen Ergebnis
bedingungslos (`spending-policy-pipeline.mjs:274-276`). Damit ist die
Abwaertsbegrenzung in genau den Jahren wirkungslos, fuer die sie konfiguriert
wurde.

Eigene Messung, `bear_deep`, realer Gesamtvermoegensdrawdown 20 Prozent, also
**ohne** Notfallgate, gegen den unveraenderten Stand `c322bbe`:

| Jahr | Mindest-Flex 30.000 € (alt -> neu) | ohne Mindest-Flex (alt -> neu) |
| --- | --- | --- |
| 1 | 90 % -> 50 %, Entnahme 78.000 -> 54.000 € (**-24.000 €**) | 90 % -> 24 %, Entnahme 78.000 -> 38.400 € (**-39.600 €**) |
| 2 | 80 % -> 50 % (-18.000 €) | 80 % -> 24 % (-33.600 €) |
| 3 | 70 % -> 50 % (-12.000 €) | 70 % -> 24 % (-27.600 €) |
| 4 | 60 % -> 50 % (-6.000 €) | 60 % -> 24 % (-21.600 €) |

Der Ruecksprung im zweiten Fall betraegt **66 Prozentpunkte in einem Jahr** und
damit das 6,6-Fache des konfigurierten Baerenlimits von 10 pp.

Das widerspricht der Wirkungsbeschreibung des Slice an mehreren Stellen. Der
Plan formuliert die Capwirkung durchgaengig als Begrenzung der **Aufwaerts**-
glaettung („Ein Safety-Cap deckelt dort nur noch das Anheben durch Glaettung",
„In fortgesetzten Alarmjahren kann der Cap hauptsaechlich die
Aufwaertsglaettung verhindern und deshalb nur ein kleines Delta erzeugen"). Die
gemessene Hauptwirkung ist eine unbegrenzte Abwaertsstufe. Nicht-Scope nennt
zudem „keine allgemeine Neukalibrierung aller Guardrail-Schwellen"; faktisch
wird `MAX_DOWN_IN_BEAR_PP` in allen Signaljahren ausser Kraft gesetzt.

Erforderlich ist eine Entscheidung, keine Nachdokumentation: Entweder der Cap
wird ebenfalls durch `applyFinalRateLimits` gefuehrt — dann bleibt die
10-pp-Zusage erhalten und der Cap wirkt ueber mehrere Jahre —, oder die
Aufhebung wird als bewusste Nutzerentscheidung mit Zahl dokumentiert und
getestet. Kein bestehender Test pinnt die Sprunghoehe.

#### S3-02 (Blocker) – Ein Notfalljahr erzeugt vier Folgejahre Mindest-Flex-Unterdeckung im erholten Markt

NE-03 legitimiert Null-Flex **waehrend** der schweren Flex-Notlage. Gemessen
wird jedoch eine weit laengere Wirkung. Sequenz: ein Jahr `bear_deep` mit
30 Prozent Drawdown, danach vollstaendige Erholung
(`side_long`, `side_long`, `peak_hot` …), Mindest-Flex 30.000 €:

| Jahr | Markt | Flexrate | Entnahme | Mindest-Flex Ist | erfuellt |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | `bear_deep`, DD 30 % | 0 % | 24.000 € | 0 € | nein (NE-03) |
| 2 | `side_long`, DD 10 % | 12 % | 31.200 € | 7.200 € | **nein** |
| 3 | `side_long`, DD 5 % | 24 % | 38.400 € | 14.400 € | **nein** |
| 4 | `peak_hot`, DD 0 % | 36 % | 45.600 € | 21.600 € | **nein** |
| 5 | `peak_hot`, DD 0 % | 48 % | 52.800 € | 28.800 € | **nein** |
| 6 | `peak_hot`, DD 0 % | 50 % | 54.000 € | 30.000 € | ja |

Ursache ist die Kopplung des harten `flexRate = 0` mit dem bestehenden
Aufwaertslimit `MAX_UP_PP = 12`: Der Rueckweg aus der Null dauert vier
zusaetzliche Jahre. Die kumulierte Mindest-Flex-Unterdeckung betraegt
**78.000 €**, davon sind nur 30.000 € durch NE-03 gedeckt; **48.000 € sind
undeklarierte Folgewirkung**. Die Siebenjahressumme der Entnahmen faellt von
445.800 € auf 300.000 € (**-145.800 €**) — bei einer Notlage, die genau ein
Jahr dauerte. Im Baseline-Lauf ist der Mindest-Flex in allen sieben Jahren
erfuellt.

Das kollidiert direkt mit dem Akzeptanzkriterium „Ausserhalb der schweren
Flex-Notlage ist der finale Flexwert … niemals niedriger als die erforderliche
Mindest-Flex-Rate": Ab Jahr 2 liegt keine schwere Flex-Notlage mehr vor, und
der Wert liegt vier Jahre lang darunter. Formal rettet der Status
`applied_limited_by_final_smoothing` das Kriterium ueber die Klausel „sofern
kein bestehender Blocker greift"; fachlich ist die Zusage damit ausgehoehlt.

#### S3-03 (hoch) – Das C-16-Testorakel ist zu schwach und verdeckt S3-02

`tests/spending-safety-cap.test.mjs:287` prueft das mittlere Jahr des
Flipfalls nur mit `assert(rates[1] > 0, '24.5% drawdown returns to the normal
flex contract')`. Gemessener Istwert: **12 Prozent**. Der normale Contract
laege bei 50 Prozent (Mindest-Flex-Untergrenze); die tatsaechliche Entnahme
betraegt 31.200 € statt 54.000 €, der Mindest-Flex wird um 22.800 € verfehlt.
Die Assertion wuerde auch bei 0,0001 Prozent bestehen. Das Delta-Orakel im
Plan („Null-Flex -> normaler Flexcontract -> Null-Flex") beschreibt damit
einen Zustand, den der Code nicht herstellt; gemessen ist 0 -> 12 % -> 0.

#### S3-04 (hoch) – Die Messfixture belegt den normalen Safety-Cap nicht

`tests/fixtures/safety-policy-slice-03-measurement-v1.json` weist
`safetyCapActiveYearCount: 5` und `safetyCapAppliedYearCount: 4` aus. Alle vier
bindenden Jahre tragen `source: "severe_bear_wealth_emergency"`. Der **normale**
Safety-Cap — also genau der Mechanismus, der aus C-01/C-02 hervorging und den
groessten Teil des Codes ausmacht — hat in 26 historischen Jahren **null**
bindende Faelle. Zusaetzlich steht in allen vier Bindejahren
`minimumFlexAnnualNominalEur: 0`; der Kern von NE-03, das Ueberstimmen eines
**positiven** Mindest-Flex, ist im Realdatenlauf ebenfalls nicht belegt.

Das Akzeptanzkriterium „Erwartete Crash-Deltas sind von unerwarteten
Seiteneffekten getrennt" ist damit fuer den dominanten Normalpfad nicht
erfuellt. Der Plan warnt selbst: „Ein nahezu nulles Gesamtdelta ist kein
Abnahmenachweis." Hier liegt die Umkehrung vor — im Realdatenlauf unsichtbar,
in synthetischen Bedingungen bis -39.600 € pro Jahr (S3-01).

#### S3-05 (mittel) – Doppelte Magic Constant 0,5 fuer die Alarmunterdrueckung

`alarm-policy.mjs:40` berechnet `wealthSufficient = wealthFactor < 0.5`.
`spending-policy-pipeline.mjs:99` bildet denselben Sachverhalt als
`alarmWealthSufficient: withdrawalBurdenFactor < 0.5` erneut ab, ohne die
Quelle zu referenzieren. Beide Werte stimmen heute ueberein; kein Contracttest
bindet sie aneinander. Aendert sich die Schwelle in `alarm-policy.mjs`, meldet
die Diagnose „Alarm unterdrueckt" oder eben nicht — ohne dass ein Test
anschlaegt. Der Plan hat exakt diese Risikoklasse fuer die 25-Prozent-Schwelle
erkannt und dort korrekt ueber `CONFIG` geloest; hier fehlt die gleiche
Disziplin.

#### S3-06 (mittel) – Der geforderte Zwei-Jahres-Persistenztest fehlt

Der Plan verlangt unter „Geplante Tests" ausdruecklich einen
„Zwei-Jahres-Regressionsfall mit fortbestehendem `bear_deep` und Drawdown ueber
25 Prozent". `tests/spending-safety-cap.test.mjs` enthaelt nur den
C-16-Flipfall 25,3 -> 24,5 -> 25,3, der zwei aufeinanderfolgende Gatejahre
gerade nicht abbildet. Ich habe die Persistenz zur Laufzeit selbst geprueft
(drei Jahre, Gate durchgaengig aktiv) — es liegt kein Defekt vor, aber die
Zusage aus der C-14-Antwort ist unbelegt.

#### S3-07 (niedrig) – Die Drawdown-Klammer sitzt an der Quelle, nicht nur im Gate

Der Abschnitt „Abweichungen vom Plan" beschreibt, dass **das Gate** einen
negativen Rohwert auf 0 normalisiert. Tatsaechlich klammert
`SpendingPlanner.mjs:154` den geteilten Schluesselparameter
`realerDepotDrawdown` bereits an der Quelle; die Klammer im Gate
(`spending-policy-pipeline.mjs:82`) ist fuer den Produktionspfad damit toter
Code. Der Wert wird ausserdem von `alarm-policy.mjs` an drei Stellen und von
Balance/Simulator konsumiert. Ich habe alle drei Alarmvergleiche geprueft
(`<= 0.15`, `<= realDrawdown - 0.05`, `> realDrawdown`): sie sind gegen
nicht-negative Schwellen gerichtet, die Aenderung ist verhaltensneutral. Der
Fail-closed-Test fuer negative Werte am Gate prueft jedoch einen Zustand, den
der Planner nicht mehr erzeugen kann.

#### S3-08 (niedrig) – Die Wahrheitsmatrix umgeht den realen Evidenzerzeuger

`runMatrixCell` speist handgebaute `safetyEvidence`-Objekte direkt in
`applySpendingPolicyPipeline`. Die reale Evidenzerzeugung in
`calculateFlexRate` — insbesondere die Bedingung
`positiveBearDeepRawCut = market.sKey === 'bear_deep' && roheKuerzungProzent >
SAFETY_RATE_TOLERANCE_PCT` und die Quelle `flex_rate_hard_cap` — wird von
keinem Test End-to-End geprueft. Nur der Alarmpfad laeuft ueber den echten
Erzeuger.

### 4. Restrisiken

- Die Schwellenkante ist binaer und teuer: eigene Messung ergibt bei einer
  Drawdownaenderung von 1e-10 (0,25 -> 0,2500000001) einen Sprung der
  Jahresentnahme von 84.000 € auf 24.000 €, also **60.000 € an einer
  numerisch nicht belastbaren Kante**. Das ist als C-16 dokumentiert, aber ohne
  diese Groessenordnung.
- Der Entscheidungsbaum enthaelt im Notfalljahr weiterhin Zwischenschritte, die
  eine positive Flexrate behaupten („Flex-Rate wird auf 35.0% gesetzt",
  „Anstieg nach Guardrails auf max. 12 pp begrenzt"), bevor der letzte Eintrag
  auf 0 korrigiert. Das entspricht der bestehenden sequentiellen Logsemantik,
  bleibt aber missverstaendlich.
- `evaluateSevereFlexEmergency` wirft in einem Pfad, der pro Jahr und pro
  Monte-Carlo-Lauf ausgefuehrt wird. Ein nicht endliches `gesamtwert` fuehrt
  neu zum Laufabbruch statt zu stiller Fehlrechnung. Das ist die richtige
  Richtung, aber ein neuer Ausfallmodus.

### 5. Pre-Mortem

In drei Monaten meldet der Nutzer, dass die App ihm nach einem einzigen
Krisenjahr ueber fuenf Jahre weniger auszahlt als seinen gesetzten Mindest-Flex
von 30.000 € — bei einem Markt, der laengst wieder auf Allzeithoch steht. Er
haelt das fuer einen Rechenfehler. Ursache ist die undeklarierte Kopplung des
harten `flexRate = 0` mit dem Aufwaertslimit von 12 pp (S3-02); zweitwahr-
scheinlichste Ursache ist der in Signaljahren ausgehebelte
`MAX_DOWN_IN_BEAR_PP` (S3-01). Beide Effekte sind im Realdatenlauf unsichtbar,
weil dort kein Jahr mit positivem Mindest-Flex und normalem Cap vorkommt
(S3-04).

### 6. Review-Ergebnis

- **Status:** blockiert
- **Blocker:** S3-01 (Aufhebung der Abwaertsglaettung ohne Deklaration und
  ohne Test), S3-02 (vier Folgejahre Mindest-Flex-Unterdeckung ausserhalb der
  Notlage)
- **Weitere Findings:** S3-03 (hoch), S3-04 (hoch), S3-05 (mittel),
  S3-06 (mittel), S3-07 (niedrig), S3-08 (niedrig)
- **Restrisiken:** Abschnitt 4
- **Pre-Mortem:** Abschnitt 5

Die Gates sind gruen und das Notfallgate selbst ist korrekt und robust
implementiert. Blockierend ist nicht das Gate, sondern die Wirkungsbreite des
Caps ausserhalb der Notlage: Sie ist um Groessenordnungen groesser als der Plan
beschreibt, und der einzige Realdatennachweis enthaelt genau diesen Fall nicht.

## Korrekturrunde nach dem Claude/Opus-Code-Review

**Stand:** 2026-08-07. Dieser Abschnitt dokumentiert die nach dem vorstehenden
Review vorgenommenen Implementierungsaenderungen. Er ersetzt oder relativiert
nicht die damalige Reviewerentscheidung; die korrigierte Fassung benoetigt eine
externe Re-Review.

1. **S3-01:** Der normale Cap ist jetzt zweistufig. `safetyCapFlexRatePct` ist
   das fachliche Policy-Ziel; `safetyCapEffectiveFlexRatePct` ist die unter den
   bestehenden Jahreslimits aktuell zulaessige Obergrenze. Ein 50-Prozent-Ziel
   bei Vorjahresrate 80 endet im tiefen Baerenjahr deshalb bei 70 statt sofort
   bei 50 Prozent. `safetyCapDeferredByRateLimit` macht den Aufschub sichtbar.
2. **S3-02:** `newState.flexRate` bleibt der tatsaechlich ausgezahlte Istwert.
   Nur bei aktivem schweren Gate speichert
   `newState.flexRateSmoothingReference` getrennt den normalen Vor-Gate-Wert.
   Nach Ende der Notlage wird also nicht von 0 hochgeglaettet. Normale Jahre
   speichern weiterhin die quantisierte Ist-Flexrate und erhalten damit die
   bisherige Semantik.
3. **S3-03/S3-06:** C-16 verlangt im mittleren Jahr mindestens 50 Prozent und
   erfuelltes Mindest-Flex. Ein separater Persistenzfall prueft acht
   aufeinanderfolgende schwere Jahre, den Erholungsanker mindestens auf
   Mindest-Flex-Niveau und das erste Erholungsjahr.
4. **S3-04:** Die Messfixture behauptet keinen historischen normalen
   Bindungsfall: 2000-2025 enthaelt nach wie vor 0. Stattdessen erzeugt sie ueber
   den echten Planner drei reproduzierbare Zeugen mit positivem Mindest-Flex:
   normales rate-limitiertes Ziel, schwere Ueberstimmung bis exakt zum Floor und
   erstes Erholungsjahr. Damit wird die fehlende historische Beobachtung nicht
   durch einen kuenstlichen Realdatenclaim verdeckt.
5. **S3-05/S3-07/S3-08:** Die 0,5-Schwelle ist eine exportierte gemeinsame
   Konstante; der Planner reicht negative endliche Vor-Peak-Drawdowns roh an das
   allein normalisierende Gate weiter; reale `calculateFlexRate`-Laeufe pruefen
   die Erzeugung der Quellen `bear_deep` und `flex_rate_hard_cap`.

Die korrigierte 2000-2025-Messung endet weiterhin ohne Outcome- oder
FlowDelta-Aenderung. Gegen die bytegeschuetzte Eingangsgrenze betragen die nun
erklaerten Deltas +38.238,36 EUR Gesamtentnahme, -111.704,33 EUR Endvermoegen
und +6.248,90 EUR Steuer. Diese Richtung folgt daraus, dass weder der normale
Cap die Abwaertsglaettung umgeht noch ein Notfall-Nullwert die spaetere
Flex-Erholung kuenstlich verzoegert.

Die fokussierten Verträge bestanden mit 119/119 Spending-Safety-, 159/159
Planner-, 260/260 Backtest-, 799/799 Monte-Carlo-, 31/31 Demografie-, 584/584
Worker-Paritaets- und 184/184 Auto-Optimize-Assertions. Die vollstaendige
Node-Suite, der Engine-Build und das Browser-Pflichtgate sind im
Validierungsabschnitt dieses Dokuments nachgefuehrt. Der Status der Messfixture
bleibt `pending_external_review`.

## Code-Re-Review von Claude (Slice 3, zweite Runde)

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`,
Baseline `c322bbe`. Jede Nachbesserung ist gegen einen aus `git archive HEAD`
extrahierten unveraenderten Engine-Stand nachgemessen.

### 1. Verifikation der Findings S3-01 bis S3-08

**S3-01 (Blocker) – behoben.** Das Policy-Ziel wird vor der Durchsetzung durch
`applyFinalRateLimits` mit demselben `wealthFactor` gefuehrt; wirksam ist
`max(Policy-Ziel, ratelimitierte Rate)`. Eigene Messung, `bear_deep`,
20 Prozent Drawdown, gegen den unveraenderten Stand:

| Szenario | vor der Nachbesserung | jetzt |
| --- | ---: | ---: |
| mit Mindest-Flex, Jahr 1 | -24.000 € | **0 €** |
| ohne Mindest-Flex, Jahr 1 | -39.600 € | **0 €** |
| ohne Mindest-Flex, Jahre 1–4 | -122.400 € | **0 €** |

Ueber zehn Jahre betraegt das Delta in jedem Jahr 0 €; die Ratenfolge
`90/80/70/60/50/40/30/24/24/24` ist mit der Baseline identisch. Der Test pinnt
die Sprunghoehe jetzt doppelt: `previousRate - rate <= 10` je Jahr und die
exakte Folge `[90, 80, 70, 60]`. Die frueher fehlende Groessenordnung ist damit
fixiert.

**S3-02 (Blocker) – behoben.** `flexRateSmoothingReference` entkoppelt den
Glaettungsanker vom tatsaechlich gezahlten Wert, und zwar ausschliesslich im
schweren Notfall (`_buildResults` faellt sonst auf die quantisierte Istrate
zurueck). Eigene Sieben-Jahres-Messung, ein Notfalljahr gefolgt von
vollstaendiger Erholung:

| | vor der Nachbesserung | jetzt | Baseline |
| --- | ---: | ---: | ---: |
| Flexfolge ab Jahr 2 | 12/24/36/48/50 % | **85/70/58/50/50 %** | 85/70/58/50/50 % |
| kumulierte Mindest-Flex-Unterdeckung | 78.000 € | **30.000 €** | 0 € |
| Siebenjahressumme | 385.800 € | 385.800 € | 445.800 € |

Ab Jahr 2 ist der Pfad **exakt** der Baselinepfad. Die Unterdeckung entspricht
jetzt genau dem einen bewusst gewaehlten NE-03-Jahr; die 48.000 € undeklarierte
Folgewirkung sind verschwunden.

**S3-03 – behoben.** `assert(rates[1] > 0)` ist ersetzt durch
`assert(rates[1] >= 50)` **und** `assertEqual(fulfilled[1], true)`. Gemessener
Istwert des mittleren Jahres: 85 Prozent bei erfuelltem Mindest-Flex.

**S3-04 – angenommen und ehrlich beantwortet.** Die Fixture behauptet nichts,
was sie nicht belegt: `normalSafetyCapAppliedYearCount: 0` und
`normalSafetyCapDeferredYearCount: 0` sind explizit ausgewiesen, und der Text
sagt woertlich, der reale Pfad enthalte keinen normalen bindenden Cap „und
behauptet auch keinen". Statt fabrizierter Realdatenevidenz sind drei
`syntheticWitnesses` ergaenzt, die vom echten `SpendingPlanner` erzeugt werden,
darunter der Fall `normalRateLimitedCapWithPositiveMinimumFlex` (Policy-Ziel
50 %, Jahresrate 90 %, Mindest-Flex erfuellt) und ein schwerer Notfall mit
**positivem** Mindest-Flex. Die frueher fehlende NE-03-Kernevidenz ist damit
zumindest synthetisch geschlossen.

**S3-05 – behoben.** `ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD` wird aus
`alarm-policy.mjs` exportiert und von beiden Stellen verwendet; der Wert ist
zusaetzlich als `alarmWealthSufficientThreshold` diagnostiziert und im Test
gepinnt. `alarm-policy.mjs` ist als neunte Produktdatei vor dem Edit
nachdeklariert.

**S3-06 – behoben.** Neuer Acht-Jahres-Fall mit durchgehendem Gate plus
Erholungsjahr. Meine unabhaengige Drei-Jahres-Messung bestaetigt: Gate
durchgehend aktiv, Entnahme centgenau Floor, Status durchgehend
`overridden_by_severe_flex_emergency`.

**S3-07 – behoben.** Die Klammer im `SpendingPlanner` ist zurueckgenommen; der
rohe Vor-Peak-Negativwert erreicht die uebrigen Konsumenten unveraendert, nur
das Gate normalisiert ihn. Der Fail-closed-Test prueft damit wieder einen
erreichbaren Zustand.

**S3-08 – behoben.** Ein neuer Block laesst `calculateFlexRate` selbst laufen
und unterscheidet den positiven `bear_deep`-Rohcut vom bindenden
Flexraten-Hard-Cap.

### 2. Unabhaengig verifizierte Gates

- `npm test`: 19.382 von 19.382 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles (zuvor 19.342).
- `npm run test:browser`: Exitcode 0, alle Workflows bestanden.
- `git diff --check`: ohne Befund.
- Produktiver Umfang: neun Dateien, die neunte (`alarm-policy.mjs`) ist im
  Plan vorab nachdeklariert. `engine.js`, `dist/` und Releaseartefakte bleiben
  unberuehrt.
- Die Delta-Umkehr (+38.238,36 € Gesamtentnahme, -111.704,33 € Endvermoegen)
  ist im Dokument benannt und begruendet; sie folgt zwangslaeufig daraus, dass
  der normale Cap die Abwaertsglaettung nicht mehr umgeht.
- Kein Testorakel wurde abgeschwaecht; alle geaenderten Assertions sind
  strenger.

### 3. Neue Findings

#### S3-09 (mittel) – Der normale Safety-Cap bleibt im dokumentierten Schadensfall wirkungslos

Eigene Messung der im Slice dokumentierten Jahr-1-Konfiguration
(Vorjahresrate 100 %, `bear_deep`, Mindest-Flex-Rate 50 %), fuenf Jahre,
alt gegen neu:

| Jahr | Baseline | jetzt | Policy-Ziel | wirksamer Cap | bindend |
| ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 85 % | 85 % | 62,5 % | 87,5 % | nein |
| 2 | 75 % | 75 % | 50 % | 75 % | nein |
| 3 | 65 % | 65 % | 50 % | 65 % | nein |
| 4 | 54 % | 54 % | 50 % | 55 % | nein |
| 5 | 50 % | 50 % | 50 % | 50 % | nein |

In allen fuenf Jahren ist das Ergebnis mit der Baseline identisch; der Cap ist
durchgaengig `deferred` und nie `applied`. Das ist die logische Folge der
S3-01-Korrektur und **kein Defekt** — solange die bestehende EMA-/MAX_DOWN-
Absenkung ohnehin mit voller Schrittweite laeuft, kann eine Obergrenze, die
dieselbe Schrittweite respektiert, nicht zusaetzlich binden. Der normale Cap
wirkt nur noch dort, wo die Baseline seitwaerts laeuft oder **steigt**.

Zusammen mit `normalSafetyCapAppliedYearCount: 0` ueber 26 historische Jahre
heisst das: Der Mechanismus, der aus C-01/C-02 hervorging und den groessten
Teil des neuen Codes ausmacht, hat auf keinem realen Pfad eine messbare
Wirkung. Der wirtschaftliche Wert des Slice ruht damit vollstaendig auf dem
NE-03-Notfallgate. Das Delta-Orakel formuliert fuer den Schadensfall
inzwischen korrekt „nur innerhalb der Jahres-Abwaertsgrenze annaehern", sagt
aber nicht, dass diese Annaeherung im dokumentierten Jahr 1 exakt null
betraegt. Das gehoert in einem Satz in den Beleg des Schadensfalls, damit
spaeter niemand aus dem Slice-Titel eine Wirkung ableitet, die es dort nicht
gibt.

#### S3-10 (mittel) – Der Glaettungsanker wirkt zusaetzlich auf den Alarmtrigger

`_initializeOrLoadState` setzt `state.flexRate` fuer das laufende Jahr auf die
Referenz. Aus derselben Variablen wird jedoch auch `vorlaeufigeEntnahme` und
daraus `entnahmequoteDepot` berechnet — und `entnahmequoteDepot` ist ueber
`isQuoteCritical` eine **Alarmeingangsgroesse** (`alarm-policy.mjs:64`). Nach
einem Notfalljahr bewertet der Alarm damit eine Entnahmequote aus Geld, das nie
entnommen wurde: im gemessenen Fall 84.000 € statt 24.000 €, also der Faktor
3,5 auf einer Alarmschwelle.

Das Ergebnis ist fachlich vertretbar — der Alarm soll den Plan beurteilen, nicht
die Ausnahme — und es reproduziert genau den Baselinepfad. Entschieden und
dokumentiert ist es aber nicht: Dokumentation und Codekommentar beschreiben die
Referenz ausschliesslich als Glaettungsanker („the next year's smoothing
anchor"). Die Verbreiterung auf den Alarmpfad sollte benannt oder die Referenz
auf den Glaettungsaufruf begrenzt werden.

#### S3-11 (niedrig) – `nextFlexRateSmoothingReferencePct` hat zwei Schreibstellen

Die Pipeline schreibt den Wert aus der unquantisierten Rate in
`state.keyParams`; `_buildResults` ueberschreibt ihn anschliessend mit der
quantisierten Rate. Der exponierte Endwert ist korrekt und der neue Test pinnt
die Gleichheit von diagnostiziertem und persistiertem Anker — allerdings nur
fuer Notfalljahre, in denen beide Schreibstellen denselben Zweig nehmen. Fuer
normale Jahre bleibt eine doppelte Wahrheitsquelle ohne Test.

### 4. Restrisiken

- Die binaere Schwellenkante bleibt unveraendert teuer: 0,25 exakt gegen
  0,2500000001 verschiebt die Jahresentnahme weiterhin von 84.000 € auf
  24.000 €. Bewusste Entscheidung (C-16), aber unveraendert scharf.
- Der Glaettungsanker folgt im Notfall einem Kontrafaktum: Nach acht
  Notfalljahren kehrt die Flexrate in einem Schritt auf das Niveau zurueck, das
  ohne jede Krise gegolten haette. Das ist die gewollte Gegenmassnahme zu
  S3-02, macht die Notlage fuer die Folgejahresglaettung aber vollstaendig
  unsichtbar.
- `evaluateSevereFlexEmergency` wirft weiterhin pro Jahr und pro
  Monte-Carlo-Lauf; ein nicht endlicher Vermoegenswert fuehrt neu zum
  Laufabbruch statt zu stiller Fehlrechnung.
- Der Entscheidungsbaum nennt im Notfalljahr weiterhin zuerst positive
  Zwischenraten, bevor der letzte Eintrag auf 0 korrigiert.

### 5. Pre-Mortem

In drei Monaten faellt auf, dass der Slice in keinem realen Backtestjahr eine
normale Safety-Begrenzung ausgeloest hat und dass der dokumentierte
Schadensfall unveraendert 51.000 € Flex auszahlt. Die Diskussion dreht sich
dann darum, ob der normale Cap ueberhaupt je gebunden haette — und die Antwort
steht heute nur in einer Fixture-Zahl, nicht im Belegtext (S3-09).
Zweitwahrscheinlichste Ursache: eine Aenderung an der Alarmschwelle wirkt sich
unerwartet auf Jahre nach einem Notfall aus, weil die Alarmquote dort aus der
Glaettungsreferenz stammt (S3-10).

### 6. Re-Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine — S3-01 und S3-02 sind an der Ursache behoben und
  einzeln nachgemessen
- **Offene Findings:** S3-09 (mittel), S3-10 (mittel), S3-11 (niedrig)
- **Empfehlung:** S3-09 vor dem Commit als ein Satz in „Beleg des
  dokumentierten Schadensfalls" nachtragen — der Code ist richtig, nur die
  Wirkungserwartung darf nicht stehen bleiben. S3-10 und S3-11 koennen
  nachgezogen werden.
- **Restrisiken:** Abschnitt 4

## Abschliessendes Code-Review von Gemini (2026-08-07)

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`, Baseline-Commit `c322bbe`. Geprüft wurden die 9 produktiven Engine-/App-Moduldateien, `Handbuch.html`, die Test-Fixtures, der Diff sowie die vollständige Testsuite.

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:** `SpendingPolicyOrderV2` führt den `safety_cap`-Schritt korrekt ein. Das konjunktive Null-Flex-Gate (NE-03) schlägt präzise nur bei `bear_deep` **und** `realerDepotDrawdown > 0,25` zu.
- **Vertragstreue:** Exakt 9 produktive Dateien wurden geändert (Dateilimit von max. 10 eingehalten). Der separate Floor bleibt absolut vorrangig und ungekürzt. `engine.js` blieb bytegleich.
- **Fehlerbehandlung:** `evaluateSevereFlexEmergency` validiert fail-closed gegen ungültige, nicht endliche oder fehlende Drawdown-Werte.
- **Seiteneffekte & Validierung:** `npm test` lief mit 169 Testdateien und 19.382 Assertions (0 Fehler, 0 offene Handles) vollständig grün durch. `npm run test:browser` (29/29) und `git diff --check` sind sauber.
- **Was könnte brechen?** Die verbleibenden mittleren/niedrigen Restrisiken (S3-09, S3-10, S3-11).

### 2. Pre-Mortem

**Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Eine spätere Änderung an der Alarmschwelle wirkt sich unerwartet auf Jahre nach einem Notfall aus, weil die Alarmquote dort aus der Glättungsreferenz stammt (S3-10), oder der Nutzer erwartet im normalen Baerenmarkt eine sofortige Absenkung der Auszahlung, obwohl die 10-pp-Abwärtsglättung das Policy-Ziel aufschiebt (S3-09).

### 3. Review-Ergebnis

- **Status:** **freigegeben**
- **Blocker:** keine
- **Restrisiken:** S3-09 (Normaler Cap aufgeschoben durch Abwärtsglättung), S3-10 (Glättungsreferenz auf Alarmeingang), S3-11 (Zwei Schreibstellen für SmoothingReference).
- **Abnahme:** Slice 03 ist technisch und fachlich abgenommen und für den lokalen Commit freigegeben.

