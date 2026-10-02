# Slice 1 von 1 – Haupttabvertrag und Monte-Carlo-Bedienweg korrigieren

<!-- audit:status:begin -->
In Arbeit · Runde 2
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die beiden veralteten Testannahmen an die vorhandene Oberfläche anpassen und mit unveränderten fachlichen Nachweisen das vollständige Browser-Gate wiederherstellen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
1. An der Quellgrenze fordert `runSimulatorSmoke()` genau die fünf vorgesehenen Haupttabs mit Identität, Beschriftung und Reihenfolge. Im echten Browser bei der vorhandenen Desktop-Viewportgröße 1366 × 900 sind alle fünf sichtbar, mit positiver Breite kleiner als die Leistenbreite; `scrollWidth <= clientWidth + 1` bleibt verbindlich. Die eigenständigen fünf MC-Ergebnisansichten behalten ihre bisherigen Assertions.
2. An der Browser-Bediengrenze öffnet `runFailedReplayProjectionCase()` vor `fill()` sichtbar den Rahmendatenbereich und gegebenenfalls das Portfolio-Fieldset, bestätigt den Wert `2000000` und kehrt vor dem Start sichtbar zum Monte-Carlo-Tab zurück. An der Exportgrenze bestätigt der reale Lauf denselben Floor in seinen normalisierten Eingaben.
3. An der fachlichen Browsergrenze erzeugt der unverändert kleine deterministische Lauf ein fehlgeschlagenes charakteristisches Szenario mit Logzeilen. Dessen Auswahl zeigt `FAILED` vor dem Fixieren; nach der Statusmeldung „Stresspfad fixiert“ bleibt die Anzeige `FAILED`. Die bestehende Kontrolle unerwarteter Browserfehler bleibt wirksam.
4. An der Testquellgrenze bleiben alle registrierten Browserfälle und sämtliche bisherigen fachlichen, Export-, Worker-, Lifecycle-, Layout-, Tastatur- und Druckprüfungen erhalten; Änderungen betreffen nur die beiden korrigierten Erwartungen beziehungsweise Bedienwege und ihre zusätzlichen Nachweise. Das Gate hat keine neuen Ausnahmen, Auslassungen oder erhöhten Timeouts.
5. An der Ausführungsgrenze laufen die gezielten Fälle `Simulator.html` und `Simulator Monte-Carlo E2E` außerhalb einer gegebenenfalls blockierenden Sandbox jeweils mit ihrer Erfolgsmeldung und Exitcode 0. Anschließend bestätigt der Orchestrator auf dem fertigen Slice-Stand `npm run test:browser` ohne `--only` mit Erfolg für sämtliche registrierten Fälle und Exitcode 0 sowie `npm test` mit Exitcode 0.
6. An der Berichtsgrenze enthält der vom Orchestrator geführte Slice-Bericht für beide Fälle eine separate, belegte Begründung der Testkorrektur und unterscheidet ausgeführte erfolgreiche Prüfungen von in der Sandbox nicht ausführbaren Prüfungen.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `docs/internal/a-browser-smoke-gruen-implement-review-3bfc070b.md`
- `docs/internal/slice-a-browser-smoke-gruen-arbeitsplan-01-haupttabvertrag-und-monte-carlo-bedienweg-korrigieren.md`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-monte-carlo-browser.mjs`
<!-- audit:scope:end -->

## Umsetzung

> ### Fall „Simulator.html“
>
> Die bisherige Assertion in `runSimulatorSmoke()` erwartete vier Haupttabs. `Simulator.html` enthält dagegen genau `rahmendaten` / Rahmendaten, `montecarlo` / Monte-Carlo, `backtesting` / Backtesting, `sweep` / Parameter-Sweep und `auto-optimize` / Auto-Optimize in dieser Reihenfolge. `tests/simulator-tab-layout.test.mjs` bestätigt diesen Vertrag einschließlich der getrennten Sweep-/Optimizer-Panels. Damit ist die Vier-Tab-Erwartung als veralteter Test belegt.
>
> `tests/browser-smoke.test.mjs` prüft nun innerhalb der vorhandenen `.tab-buttons` genau diese fünf Identitäten und Beschriftungen in Reihenfolge. Jeder `.tab-buttons .tab-btn` muss sichtbar sein; jede Breite muss positiv und kleiner als die Leistenbreite sein. Die Overflow-Grenze `scrollWidth <= clientWidth + 1` bleibt erhalten. Der vorhandene Browserkontext verwendet weiterhin 1366 × 900 Pixel. Die separaten fünf `.mc-view-tab` und alle nachfolgenden Assertions bleiben erhalten.
>
> ### Fall „Simulator Monte-Carlo E2E“
>
> `configureMonteCarloRun()` aktiviert Monte Carlo und setzt den Ausgangsfloor auf `24000`. Die bisher unmittelbar folgende `fill('2000000')`-Eingabe in `runFailedReplayProjectionCase()` zielte jedoch auf ein Feld im Portfolio-Fieldset von `#tab-rahmendaten`. Die Tabsteuerung in `app/simulator/simulator-main-tabs.js` aktiviert jeweils nur das gewählte Panel; `simulator.css` blendet inaktive `.tab-panel` aus. Der vorhandene Legenden-Klick in `Simulator.html` öffnet oder schließt das Portfolio-Fieldset. Damit fehlt im bisherigen Test der sichtbare Bedienweg zum Feld; die Testsituation widerspricht dem vorhandenen Tabvertrag.
>
> `tests/simulator-monte-carlo-browser.mjs` wechselt nun sichtbar zu Rahmendaten, öffnet bei Bedarf das Portfolio-Fieldset über seine Legende, wartet auf das sichtbare Feld und prüft dessen Bedienbarkeit. Nach `fill('2000000')` bestätigt `inputValue()` den Wert. Danach wechselt der Test sichtbar zurück zu Monte Carlo und wartet auf Panel und Startknopf. Der Konfigurationshelper wird nicht erneut aufgerufen. Runzahl 1, Dauer 2, Workerzahl 1 und Seed 818181 bleiben unverändert.
>
> Nach dem abgeschlossenen echten Lauf prüft der vorhandene Downloadhelper weiterhin den V2-Exportvertrag und zusätzlich `request.scenario.normalizedInputs.startFloorBedarf === 2000000`. Die Auswahl eines fehlgeschlagenen charakteristischen Szenarios mit Logzeilen, `FAILED` vor der Fixierung und nach „Stresspfad fixiert“ sowie die Kontrolle unerwarteter Browserfehler bleiben erhalten. Alle übrigen registrierten Fälle, Worker-/Fallback-/Technikfehler-/Abbruch-/Neustartprüfungen, Timeouts und Fehlerfilter bleiben unverändert. Es wurden keine Produktdateien oder generierten Artefakte geändert.

## Abweichungen vom Plan

> > Korrektur zu R-01: Der Zeigerklick im Setup-Disclosure-Test erhält ein explizites sichtbares Ziel innerhalb derselben nativen Summary. Der fachliche Disclosure-Vertrag bleibt erhalten.
>
> ### Korrektur zu R-01 – Zeigerziel im Setup-Disclosure
>
> `Simulator.html` enthält in `#mcSetupDisclosure > summary` neben dem Titel eine flexible Parameterzusammenfassung mit vier formulargebundenen `<output>`-Elementen und die gesonderte `.mc-setup-toggle`-Beschriftung. `simulator.css` verteilt diese Bereiche mittels Flexbox; `.mc-setup-summary` hat `flex: 1 1 auto`. Die bisherige Annahme, ein Klick auf die geometrische Mitte der gesamten Summary treffe stets die Toggle-Beschriftung, ist durch diese Struktur nicht gedeckt. Ein eingebettetes Ergebniselement ist kein eindeutiges Zeigerziel für die native Summary-Aktivierung.
>
> Der Test klickt deshalb jetzt mit Playwright auf die sichtbare Beschriftung „Setup ausblenden“ (`setupSummary.locator('.mc-setup-state-open').click()`). Diese liegt als `<span>` in derselben nativen Summary und wird laut CSS ausschließlich im geöffneten Zustand angezeigt. Es gibt keinen erzwungenen Klick, keine synthetische DOM-Aktivierung und kein Setzen von `details.open` für diesen Bediennachweis. Die unmittelbare Assertion `setup disclosure closes with the pointer` bleibt unverändert. Auch die Zustandsbeschriftungen, Chevron-Prüfung, Enter-/Space-Bedienung und Werterhaltung werden weiterhin geprüft. Geändert wird nur das unbestimmte Zeigerziel; die Erwartung, dass das Setup per Zeiger schließt, bleibt gültig.
>
> Der außerhalb der Sandbox gemeldete Fehler wird als R-01 angenommen. Die Quellstruktur belegt die Notwendigkeit eines eindeutigen Bedienziels; der tatsächliche Treffer des alten Mittelpunktklicks und der Erfolg des korrigierten Browserablaufs sind hier nicht dynamisch nachgewiesen. Der ungekürzte Browserlauf scheitert in der Agentensandbox bereits beim Serverstart mit `listen EPERM: operation not permitted 127.0.0.1`. Ein zusätzlicher isolierter Playwright-Start ohne Server fand hier kein zugängliches Browserexecutable. Gemäß `AGENTS.md` und `tests/README.md` bleibt der Browsernachweis deshalb dem Orchestrator außerhalb der Sandbox vorbehalten. Das betrifft auch den realen Floor-Export sowie `FAILED` und „Stresspfad fixiert“ im nachfolgenden Monte-Carlo-Fall. Es gibt keine neuen Fehlerausnahmen, ausgelassenen Fälle oder erhöhten Timeouts; `npm test` führt ausschließlich der Orchestrator aus.
>
> Gezielte Prüfungen des Korrekturstands:
>
> - `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`: Exitcode 0, 80 von 80 Assertions bestanden.
> - `node tests/run-single.mjs tests/simulator-tab-layout.test.mjs`: Exitcode 0, 28 von 28 Assertions bestanden.
> - `node --check tests/browser-smoke.test.mjs` und `node --check tests/simulator-monte-carlo-browser.mjs`: jeweils Exitcode 0.
> - `git diff --check`: Exitcode 0.
>
> Diese Prüfungen ersetzen weder das Browser-Gate noch die volle Suite. Eine Freigabe oder Schließung von R-01 wird damit nicht behauptet.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün, rot · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 1: Halt (instance failure). Grund: role=implementer step=implementer_implementation invocation=[Hash ausgelassen] kind=permission resume=manual resume required auto=false continuations=0 provider=[provider text redacted; sha256=[Hash ausgelassen]; utf8_bytes=107]
- Runde 1: Halt (geänderter Stand bei Wiederaufnahme). Grund: QUOTA-RESUME-DIFF \| repository changed while the role was waiting; expected [Hash ausgelassen], got [Hash ausgelassen]; paths=docs/internal/a-browser-smoke-gruen-implement-review-3bfc070b.md, docs/internal/slice-a-browser-smoke-gruen-arbeitsplan-01-haupttabvertrag-und-monte-carlo-bedienweg-korrigieren.md, tests/browser-smoke.test.mjs, tests/simulator-monte-carlo-browser.mjs; continue with --resume --approve-gate --gate-rationale '<reviewed reason>' and the unchanged --task-file
- Runde 2: Korrektur · Validierung grün, rot · Prüfurteil abgelehnt · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### R-01 – Das Browser-Gate ist auf dem geprüften Stand (Fingerprint [Hash ausgelassen]…) weiterhin rot

Klasse: Blocker · Stand: eskaliert

Befund:
> Das Browser-Gate ist auf dem geprüften Stand (Fingerprint [Hash ausgelassen]…) weiterhin rot. Die Validierungsattestierung validation-[Hash ausgelassen] meldet für `npm run test:browser` in beiden Läufen exit=1: `Browser smoke failed: Error: setup disclosure closes with the pointer at runSimulatorSmoke (tests/browser-smoke.test.mjs:1227:5)`. Die neue Haupttab-Assertion (Hunk ab Zeile 1155) läuft offenbar durch, dahinter scheitert im selben Fall `Simulator.html` aber eine weitere Assertion. Bisher hat die alte Tab-Assertion sie verdeckt. Damit sind die Slice-Abnahmekriterien nicht erfüllt: `Simulator.html` muss seine Erfolgsmeldung ausgeben und `npm run test:browser` ohne `--only` mit Exitcode 0 enden. Weil der Lauf abbricht, ist auch der Fall `Simulator Monte-Carlo E2E` mit dem geänderten Bedienweg in `runFailedReplayProjectionCase()` (tests/simulator-monte-carlo-browser.mjs) nicht ausgeführt. Floor-Export, FAILED-Anzeige und „Stresspfad fixiert“ sind deshalb unbelegt. Zu klären ist, ob die Disclosure-Erwartung eine dritte veraltete Testannahme ist oder ein echter UI-Defekt. Im ersten Fall ist sie im Slice-Umfang begründet zu korrigieren, ohne Prüfungen abzuschwächen. Im zweiten Fall ist über einen Stoppgrund (SCOPE-EXTENSION-REQUESTED oder CONTRACT-UNCLEAR) zu eskalieren, statt den Test anzupassen.

Akzeptanztest:
> Auf dem fertigen Slice-Stand endet `npm run test:browser` ohne `--only` mit Exitcode 0. `Browser smoke passed: Simulator.html` und die Erfolgsmeldung für `Simulator Monte-Carlo E2E` erscheinen, und `npm test` endet ebenfalls mit Exitcode 0. Die Assertion 'setup disclosure closes with the pointer' (tests/browser-smoke.test.mjs um Zeile 1227) bleibt in ihrer fachlichen Aussage erhalten. Falls sie angepasst wird, enthält der Slice-Bericht eine belegte Begründung, dass die Erwartung veraltet war. Es gibt keine neuen Ausnahmen, Auslassungen oder erhöhten Timeouts.

Antwort des Implementierers, Runde 2 (angenommen):
> Zeigerklick auf die sichtbare Beschriftung „Setup ausblenden“ präzisiert; Disclosure-Assertion unverändert. Begründung und Validierungsgrenzen im Slice-Bericht dokumentiert. 108 gezielte Assertions sowie Syntaxprüfungen bestanden. Browser-Gate hier durch listen EPERM blockiert; vollständiger Browsernachweis und npm test verbleiben beim Orchestrator.

Eskalation zum Blocker:
> The reviewer did not close the Finding; it is escalated to BLOCKER.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.

- Runde 1: `npm run test:browser` · rot · Exitcode 1.

```
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke passed: Balance wea
...[611 characters omitted]...
 smoke: Balance corrupt expenses
Browser smoke passed: Balance corrupt expenses
Running browser smoke: Simulator.html
Browser smoke failed:
Error: setup disclosure closes with the pointer
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at runSimulatorSmoke (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1227:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3335:13)
=== validation run 2/2: FAIL (exit=1) ===
> ruhestand-app-final@1.0.0 test:browser
> node tests/browser-smoke.test.mjs

Running browser smoke: index.html
Browser smoke passed: index.html
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke passed: Balance we
...[612 characters omitted]...
 smoke: Balance corrupt expenses
Browser smoke passed: Balance corrupt expenses
Running browser smoke: Simulator.html
Browser smoke failed:
Error: setup disclosure closes with the pointer
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at runSimulatorSmoke (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1227:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3335:13)
```

- Runde 2: `npm test` · grün · Exitcode 0.

- Runde 2: `npm run test:browser` · rot · Exitcode 1.

```
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke passed: Balance wea
...[623 characters omitted]...
nce corrupt expenses
Browser smoke passed: Balance corrupt expenses
Running browser smoke: Simulator.html
Browser smoke failed:
Error: setup chevron rotation follows the native open state
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at runSimulatorSmoke (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1234:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3336:13)
=== validation run 2/2: FAIL (exit=1) ===
> ruhestand-app-final@1.0.0 test:browser
> node tests/browser-smoke.test.mjs

Running browser smoke: index.html
Browser smoke passed: index.html
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke passed: Balance we
...[624 characters omitted]...
nce corrupt expenses
Browser smoke passed: Balance corrupt expenses
Running browser smoke: Simulator.html
Browser smoke failed:
Error: setup chevron rotation follows the native open state
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at runSimulatorSmoke (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1234:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3336:13)
```
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Noch nicht freigegeben.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-213118.040489Z-f6ca65e20948`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
