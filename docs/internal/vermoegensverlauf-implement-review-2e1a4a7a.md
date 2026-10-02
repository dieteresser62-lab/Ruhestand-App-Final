# Gesamtaudit – vermoegensverlauf-implement

<!-- audit:meta:begin -->
Aufgabe: vermoegensverlauf-implement · Zielbranch: `feature/vermoegensverlauf` · Lauf: `watch-20261002-194506.811440Z-1744300d869a` · Stand: abgeschlossen
Provider-Attempts:

| Slot | Rolle | Provider | Profil | Modell | Effort | Binary-Identität |
|---|---|---|---|---|---|---|
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| final_reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
<!-- audit:meta:end -->

## Übersicht

<!-- audit:overview:begin -->
| Slice | Titel | Stand | Commit | Runden | Befunde |
|---:|---|---|---|---:|---:|
| 1 | Verlaufvertrag und Persistenzgrenzen | freigegeben | 6ad6d751 | 1 | 0 |
| 2 | Bestände beim Jahresabschluss sicher erfassen | freigegeben | 7dc9a095 | 1 | 0 |
| 3 | Manuelle Erfassung und SVG-Verlaufsdiagramm | freigegeben | 657745b0 | 2 | 1 |
| 4 | Browserdurchstich und Dokumentations-Sync | freigegeben | 95fadb99 | 2 | 0 |
<!-- audit:overview:end -->

## Befunde

<!-- audit:findings:begin -->
| ID | Herkunft | Klasse | Stand | Titel |
|---|---|---|---|---|
| R-01 | Slice 3 | Befund | geschlossen | Die zum Fingerprint [Hash ausgelassen] passende Validierungsattestierung validation-[Hash ausgelassen] hat… |
| R-02 | Slice DISCOVERY | Befund | offen | Der zugängliche Name des Verlaufs-SVG widerspricht dem Browserdurchstich, deshalb muss das separate… |
| R-02 | Abnahme | Befund | offen | Der zugängliche Name des Verlaufs-SVG widerspricht dem Browserdurchstich, deshalb muss das separate Browsergate scheitern. `chartMarkup()` in app/balance/balance-wealth-history-renderer.js setzt `aria-labelledby="wealthChartTitle wealthChartDesc"`. Nach accname verkettet aria-labelledby die Texte aller referenzierten Elemente. Der Name lautet damit „Vermögensverlauf in nominalen Euro Gestapelte Säulen für Liquidität, …“, einschließlich der ganzen Beschreibung. `assertWealthBrowserTable()` in tests/browser-smoke.test.mjs verlangt dagegen `page.getByRole('img', { name: 'Vermögensverlauf in nominalen Euro', exact: true })` mit `count() === 1`. Mit exact:true gibt es 0 Treffer. Die Assertion „Der Verlauf besitzt ein benanntes SVG“ scheitert daher beim ersten Aufruf, sowohl in `Balance wealth history` als auch in `Balance annual commit`. Alle späteren Prüfungen werden nie erreicht: Tagesersetzung, Reload, Profilwechsel, 375px-Ansicht, Legacy-Import sowie Jahresstand-Wiederholung und -Reload. Damit sind die SOURCE-Kriterien von Slice 4 nicht belegt. Die Attestierung umfasst nur `npm test`, das dieses Gate nicht ausführt; ein Lauf von `npm run test:browser` ist im Snapshot nicht dokumentiert. Zugleich ist das ein Mangel bei der Barrierefreiheit: Die Langbeschreibung gehört in die Beschreibung, nicht in den Namen. |
<!-- audit:findings:end -->

## Halte und Entscheidungen

<!-- audit:holds:begin -->
Keine.
<!-- audit:holds:end -->

## Abnahmereview

<!-- audit:acceptance-review:begin -->
Abnahmereview abgeschlossen.

Geprüft:
> Vollständiger Branch-Diff gegen a942453 geprüft: Vertrag (types/wealth-history-contract.js), Lade-/Speicher-/Import-/Snapshot-/Profil-/Backupgrenzen, Jahres-Coordinator mit runAnnual/finalizeAnnual, Idempotenz und Recovery-Pfade, manueller Controller samt Debounce-Pause und Sperren, Renderer-Escaping (XSS), SVG-Koordinaten, Doku-Sync (README, Handbuch, TECHNICAL, BALANCE_MODULES_README, tests/README), Browser-Smoke sowie Scope. Alle Pfade liegen im autorisierten Umfang. Die Attestierung validation-[Hash ausgelassen] ist PASS für den aktuellen Fingerprint.

Größtes Restrisiko:
> Das Browsergate ist nicht attestiert. Ob die bestehende Update-Pipeline das Top-Level-Feld wealthHistory bei normalen PERSIST_INPUTS-Writes erhält und ob btnJahresUpdate `this` korrekt bindet (handleJahresUpdate ruft jetzt this.handleJahresabschluss), lässt sich aus dem Diff nicht entscheiden. Der Grund: Die betroffenen unveränderten Quelltexte (Update-Pipeline, bindUI-Listener) sind nicht im Snapshot enthalten. Belegt wäre das erst durch die Browser-Assertions, die wegen R-02 vorher abbrechen.

Bruchbedingung:
> Fehler bei der Accessible-Name-Berechnung, ein nie ausgeführtes Browsergate oder ein Speicherpfad, der unbekannte State-Felder verwirft und damit den Verlauf beim nächsten Inputwrite still löscht.

Vorab-Risikoanalyse:
> Wahrscheinlichster Ausfall nach dem Merge: `npm run test:browser` wird erstmals im Release-Job ausgeführt und scheitert an R-02. Die eigentlichen End-to-End-Pfade (Verbundaggregation im Browser, Erhalt des Verlaufs bei normalen Eingabe-Writes, zweiter Jahresknopf) sind dann nie real geprüft worden. Ein dort verborgener Fehler, etwa ein Writer, der wealthHistory verwirft, würde erst beim Nutzer als stiller Verlust sichtbar.

### R-02 – Der zugängliche Name des Verlaufs-SVG widerspricht dem Browserdurchstich, deshalb muss das separate Browsergate scheitern. `chartMarkup()` in app/balance/balance-wealth-history-renderer.js setzt `aria-labelledby="wealthChartTitle wealthChartDesc"`. Nach accname verkettet aria-labelledby die Texte aller referenzierten Elemente. Der Name lautet damit „Vermögensverlauf in nominalen Euro Gestapelte Säulen für Liquidität, …“, einschließlich der ganzen Beschreibung. `assertWealthBrowserTable()` in tests/browser-smoke.test.mjs verlangt dagegen `page.getByRole('img', { name: 'Vermögensverlauf in nominalen Euro', exact: true })` mit `count() === 1`. Mit exact:true gibt es 0 Treffer. Die Assertion „Der Verlauf besitzt ein benanntes SVG“ scheitert daher beim ersten Aufruf, sowohl in `Balance wealth history` als auch in `Balance annual commit`. Alle späteren Prüfungen werden nie erreicht: Tagesersetzung, Reload, Profilwechsel, 375px-Ansicht, Legacy-Import sowie Jahresstand-Wiederholung und -Reload. Damit sind die SOURCE-Kriterien von Slice 4 nicht belegt. Die Attestierung umfasst nur `npm test`, das dieses Gate nicht ausführt; ein Lauf von `npm run test:browser` ist im Snapshot nicht dokumentiert. Zugleich ist das ein Mangel bei der Barrierefreiheit: Die Langbeschreibung gehört in die Beschreibung, nicht in den Namen.

Klasse: Befund · Stand: offen

Befund:
> Der zugängliche Name des Verlaufs-SVG widerspricht dem Browserdurchstich, deshalb muss das separate Browsergate scheitern. `chartMarkup()` in app/balance/balance-wealth-history-renderer.js setzt `aria-labelledby="wealthChartTitle wealthChartDesc"`. Nach accname verkettet aria-labelledby die Texte aller referenzierten Elemente. Der Name lautet damit „Vermögensverlauf in nominalen Euro Gestapelte Säulen für Liquidität, …“, einschließlich der ganzen Beschreibung. `assertWealthBrowserTable()` in tests/browser-smoke.test.mjs verlangt dagegen `page.getByRole('img', { name: 'Vermögensverlauf in nominalen Euro', exact: true })` mit `count() === 1`. Mit exact:true gibt es 0 Treffer. Die Assertion „Der Verlauf besitzt ein benanntes SVG“ scheitert daher beim ersten Aufruf, sowohl in `Balance wealth history` als auch in `Balance annual commit`. Alle späteren Prüfungen werden nie erreicht: Tagesersetzung, Reload, Profilwechsel, 375px-Ansicht, Legacy-Import sowie Jahresstand-Wiederholung und -Reload. Damit sind die SOURCE-Kriterien von Slice 4 nicht belegt. Die Attestierung umfasst nur `npm test`, das dieses Gate nicht ausführt; ein Lauf von `npm run test:browser` ist im Snapshot nicht dokumentiert. Zugleich ist das ein Mangel bei der Barrierefreiheit: Die Langbeschreibung gehört in die Beschreibung, nicht in den Namen.

Akzeptanztest:
> Das SVG in app/balance/balance-wealth-history-renderer.js hat als zugänglichen Namen genau „Vermögensverlauf in nominalen Euro“, z. B. über aria-labelledby="wealthChartTitle". Die Beschreibung hängt über aria-describedby="wealthChartDesc" am SVG. Ein Unit-Test in tests/balance-wealth-history-chart.test.mjs prüft, dass aria-labelledby nur die Titel-ID referenziert. `node tests/browser-smoke.test.mjs --only='Balance wealth history'` und `--only='Balance annual commit'` laufen außerhalb der Sandbox mit exit=0, und dieser Lauf ist dokumentiert.
<!-- audit:acceptance-review:end -->
