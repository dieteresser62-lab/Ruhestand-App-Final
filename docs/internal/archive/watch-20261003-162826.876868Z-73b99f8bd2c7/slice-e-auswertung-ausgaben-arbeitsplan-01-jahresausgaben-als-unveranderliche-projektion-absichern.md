# Slice 1 von 5 – Jahresausgaben als unveränderliche Projektion absichern

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Eine DOM-freie, mit dem Ausgaben-Check identische Jahresprojektion bereitstellen, bevor die neue Darstellung eingebunden wird.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Synthetisch ergeben Profil A mit Kategorien −100/20 und Profil B mit +30 für denselben Monat 110 Euro; zwei Profile im selben Monat zählen zusammen genau einen Datenmonat. Für jedes ausgewertete Jahr stimmen Summe, Anzahl und Ø exakt mit `computeYearStats()` überein.
- SOURCE: Fixtures mit mehreren Jahren, zwölf Monaten, einem laufenden Teiljahr, historischem Teiljahr, Nullimportjahr und rein leeren Containern prüfen Reihenfolge, Markierung, Nullwerte und Auswahl. Das gewählte Ausgabenjahr beeinflusst weder die Jahresliste noch die Laufend-Markierung.
- SOURCE: Keine Änderung an Eingaben oder Store, keine Speicherzugriffe, keine Budget-/Abweichungswerte in der Projektion und keine Änderung der bestehenden Ausgaben-Check-Semantik.
- SOURCE: `node tests/run-single.mjs tests/balance-expenses-history.test.mjs` und `node tests/run-single.mjs tests/balance-expenses.test.mjs` bestehen; der Orchestrator führt anschließend `npm test` aus.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-expenses-metrics.js`
- `docs/internal/e-auswertung-ausgaben-implement-review-8b7f18fb.md`
- `docs/internal/slice-e-auswertung-ausgaben-arbeitsplan-01-jahresausgaben-als-unveranderliche-projektion-absichern.md`
- `tests/balance-expenses-history.test.mjs`
- `tests/balance-expenses.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `prepareExpensesHistoryMetrics(store, currentYear)` in `app/balance/balance-expenses-metrics.js` ergänzt. Das aktuelle lokale Kalenderjahr wird ausdrücklich übergeben; die Funktion liest weder Uhr, DOM noch Persistenz und verändert keine Eingaben.
> - Die Projektion liefert chronologisch aufsteigende Zeilen mit `year`, `annualUsed`, `monthsWithData`, `avgMonthly` und `isCurrentPartialYear`. Die drei Kennzahlen stammen direkt aus `computeYearStats({ yearData })`; dessen Berechnung bleibt unverändert. Die Markierung gilt ausschließlich für das übergebene Kalenderjahr mit weniger als zwölf gezählten Ausgabenmonaten, unabhängig von `activeYear`.
> - Jahresauswahlcontainer ohne importierte Kategorienobjekte werden ausgelassen. Ein importiertes leeres Kategorienobjekt oder ein Nullimport genügt zur Aufnahme eines Jahres. Nur Monate 1–12 belegen einen Import und tragen zur bestehenden Jahresberechnung bei. Ungültige Jahreskennungen und strukturell unbrauchbare Container erzeugen keine erfundenen Jahreszeilen.
> - `tests/balance-expenses-history.test.mjs` sichert den konkreten 110-Euro-Fall, exakte Kennzahlenparität, Reihenfolge, Voll-/Teiljahre, Nullimporte, leere Container, Jahresauswahl und Kalenderjahrwechsel ab. Tief eingefrorene Eingaben, veränderte Ausgabeobjekte und gesperrte Browserglobals prüfen die rein lesende Verarbeitung.
> - `tests/balance-expenses.test.mjs` ergänzt Mehrprofil-/Nullmonatsgegenbeispiele einschließlich Budget- und Prognosesemantik. Die vorhandene UI-Fixture enthält zusätzlich ein gespeichertes Profil ohne sichtbare Profilspalte, dessen Ausgaben weiterhin zur Monatssumme beitragen.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
Keine.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft habe ich Korrektheit, Vertrag, Fehlerpfade, Sicherheit, Scope und Resume/Idempotenz anhand des kanonischen Diffs. Scope: Alle drei geänderten Pfade (app/balance/balance-expenses-metrics.js, tests/balance-expenses-history.test.mjs, tests/balance-expenses.test.mjs) liegen in der Slice-Allowlist. Korrektheit: prepareExpensesHistoryMetrics nimmt nur kanonische, positive, ganzzahlige Jahresschlüssel an (String(year) !== key verwirft '02026', '2026.5', '0' und 'kein-jahr'). Ein Jahr wird nur aufgenommen, wenn mindestens ein Kalendermonat 1–12 ein Profil mit categories-Record hat. Summe, Monate und Ø stammen unverändert aus computeYearStats({ yearData }), sodass die Werte per Konstruktion mit dem Ausgaben-Check übereinstimmen. isCurrentPartialYear hängt nur von currentYear und monthsWithData ab, nicht von activeYear. Testabdeckung je Kriterium: Kriterium 1 decken die Assertions zu singleMonth (110, 1, 110) und die Schleife über alle rows mit Vergleich gegen computeYearStats ab. Kriterium 2 decken die Assertions zu Reihenfolge '2023,2024,2025,2026,2028', zum Teiljahr, zum historischen und zukünftigen Jahr, zum Volljahr 780/12/65, zum Nulljahr 0/0/0 und zur activeYear-Schleife über 2023/2026/2030 ab. Kriterium 3 decken die Assertions zu deepFreeze plus JSON-Vergleich, zu environmentReads === 0 mit werfenden Gettern für localStorage/window/document, zu den Zeilenschlüsseln ohne Budgetfelder sowie die unveränderten ytdBudget/ytdDelta/annualForecast-Assertions in tests/balance-expenses.test.mjs ab. Kriterium 4 belegt die Attestation validation-[Hash ausgelassen] mit npm test PASS, exit_code 0.

Größtes Restrisiko:
> Das größte Restrisiko: Die Projektion zählt ein Jahr mit categories-Record, aber leeren Kategorien als Nullimportjahr. Ob ein solcher Container in echten Stores nur ein Auswahlartefakt ist, lässt sich am Snapshot nicht entscheiden, denn der Diff enthält nicht den Code, der solche Container erzeugt. Das Verhalten ist aber bewusst getestet (Jahr 2023, Monat 2) und entspricht dem Kriterium 'Nullimportjahr sichtbar'. Die Einbindung in die UI folgt erst in Slice 2.

Bruchbedingung:
> Diese Bewertung kippt in zwei Fällen: wenn computeYearStats außerhalb der Monate 1–12 aggregiert oder globale Zustände liest, oder wenn sumMonthProfiles im Basisstand fehlt. Beides widerlegt die bestandene npm-test-Attestation, denn die Assertions zu partial.annualUsed 160 und zum Import von sumMonthProfiles würden dann scheitern.

Vorab-Risikoanalyse:
> Denkbarer Fehlschlag: Slice 2 übergibt currentYear aus einer anderen Zeitzone oder als String. Dann fehlt die Laufend-Markierung, weil auf strikte Gleichheit mit einer Zahl geprüft wird. Das ist kein Defekt dieses Slices, denn der Vertrag legt die Bestimmung von currentYear beim Aufrufer fest. Die Integration muss es aber in Slice 2 prüfen. Ebenfalls unkritisch ist der Test, der globalThis-Deskriptoren im In-Process-Runner überschreibt: Er stellt sie im finally-Block wieder her.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-162826.876868Z-73b99f8bd2c7`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
