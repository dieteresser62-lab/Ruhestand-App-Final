# Slice 4 von 4 – Browserdurchstich und Dokumentations-Sync

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die fertige Funktion über reale Balance-Bedienung prüfen und Nutzer-/Technikdokumentation mit der Umsetzung synchronisieren.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Der Browserdurchstich betätigt den echten Knopf und zeigt nach Reload dieselben gespeicherten Werte. Wiederholte Tageserfassung, Profilwechsel und Legacy-Import zeigen die jeweils richtige Anzahl und Quelle ohne Reste des zuvor angezeigten Profils.
- SOURCE: Der kontrollierte echte Jahresabschlussfall bestätigt genau einen Jahresrecord mit erwarteten Beständen und korrektem abgeschlossenen Jahr; Wiederholung und der vorhandene Recovery-Test zeigen keine Duplikate.
- SOURCE: Bei schmaler Ansicht, per Tastatur und mit einem einzelnen beziehungsweise nullwertigen Stand bleiben die Bedienung, Summe und Anlass zugänglich; es entsteht kein seitenweiter horizontaler Überlauf durch das Diagramm.
- SOURCE: README, Handbuch, TECHNICAL und Balance-Modulübersicht beschreiben dieselben tatsächlich implementierten Erfassungs-/Profil-/Recoveryverträge; die Testdoku nennt die neuen Tests und das separate Browsergate.
- SOURCE: Der Orchestrator bestätigt `npm test` auf dem fertigen Stand ohne Fehler; das separate Browsergate wird außerhalb einer gegebenenfalls browser-/portbeschränkten Agentensandbox ausgeführt und dokumentiert.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `docs/internal/slice-vermoegensverlauf-arbeitsplan-04-browserdurchstich-und-dokumentations-sync.md`
- `docs/internal/vermoegensverlauf-implement-review-2e1a4a7a.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `tests/browser-smoke.test.mjs` ergänzt den Fall `Balance wealth history`: echter Erfassungsknopf per Enter/Klick, festes lokales Datum bei noch vorherigem UTC-Tag, kontrollierte Profilverbund-/Tranchenwerte (116.000 EUR, nach Profilabwahl 114.000 EUR), Tagesersetzung, weiterer Tag, exakter Persistenz-/Tabellenvergleich und Reload. Der Profilwechsel erfolgt über die echte Startseitenauswahl; der zweite Profilverlauf bleibt ein eigenständiger Nullstand. Legacy-JSON-Replace ohne Verlauf leert Diagramm/Tabelle, auch nach Reload, ohne den zweiten Verlauf anzutasten.
> - Bei 375 CSS-Pixeln werden die Tab-Reihenfolge, ein einzelner Nullstand und interne SVG-/Tabellenscrollregionen geprüft. Eine Vorher-/Nachhermessung mit ausgeblendetem Verlauf prüft, dass das Diagramm keinen zusätzlichen seitenweiten horizontalen Überlauf verursacht.
> - Der vorhandene Fall `Balance annual commit` nutzt feste Zeit am 15.01.2027 sowie deterministisch geroutete ETF-/Inflations-/CAPE-Daten für 2026. Assertions prüfen genau `annual:2026` am 31.12.2026 mit Tagesgeld 100.000 EUR, Geldmarkt 0 EUR, Alt-Depot 500.000 EUR, Neu-Depot 0 EUR und Summe 600.000 EUR, dieselbe aktive Registrykopie sowie Reload. Ein vorübergehend zurückgehaltener ETF-Abruf macht die native Knopfsperre bei Mehrfachbedienung deterministisch; Wiederholung über den zweiten Jahresknopf muss den fachlichen No-op erreichen und darf keinen weiteren Record/Snapshot erzeugen.
> - README und Handbuch beschreiben Bedienung, Gruppen/Summen, lokale Tagesersetzung, Jahresstichtag/Start 2026, Profilverbundzuordnung, Export/Backup und Snapshot-Recovery. TECHNICAL und Balance-Modulübersicht dokumentieren die drei neuen Module, den Datenvertrag sowie Quellen-, Schreib-, Readback-, Idempotenz- und Recoverygrenzen. Die Inventur umfasst nun die tatsächlichen 39 Balance-Module. Die Testdoku nennt die neuen gezielten Prüfungen und das separate Browsergate; eine veraltete Beschreibung der Snapshotreihenfolge wurde korrigiert.
> - Ausschließlich synthetische Finanzdaten; keine Änderungen an Produktquellen, Engine, Build oder generierten Artefakten. Vorgefundene fremde Änderungen bleiben erhalten.

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
> Pfadgrenze: Der Diff umfasst ausschließlich Handbuch.html, README.md, docs/reference/BALANCE_MODULES_README.md, docs/reference/TECHNICAL.md, tests/README.md und tests/browser-smoke.test.mjs; alle Pfade liegen in der Slice-Allowlist. Attestierung: validation-[Hash ausgelassen] passt zum Fingerprint [Hash ausgelassen]… und meldet PASS (`npm test` exit=0). R-01 ist bereits CLOSED; im Paket gibt es keine offenen Findings. Browserdurchstich (runBalanceWealthHistory): Die Erfassung erfolgt über den echten Knopf per Tastatur (`button.focus()` + Enter). Geprüft wird der lokale Tag bei abweichendem UTC-Tag (fixedTime 2026-10-03T00:30+02:00, timezoneId Europe/Berlin, Assertion `first[0].asOf === '2026-10-03'`). Die Verbund-/Tranchenwerte stimmen rechnerisch: 12000+2000 Tagesgeld, 230·100 Geldmarkt, 340·100 Alt, 450·100 Neu, Summe 116000. Getestet sind außerdem die Tagesersetzung (length 1, total 114000), Reload mit exakter Gleichheit, ein anderer Tag (length 2) sowie der Abgleich der Registrykopie mit der Isolation von wealth-b. Der Profilwechsel über index.html zeigt `[zeroEntry]` und damit keine Reste. Beim Legacy-Import ist `!wealthHistory` gesetzt und es bleiben keine svg- oder table-Reste, auch nach Reload. Bei 375 px prüft der Test die Tab-Reihenfolge, das interne Scrollen (`overflow === 'auto'`) und den Seitenüberlauf. Jahresabschluss (runBalanceAnnualCommit): Mit fester Zeit im Januar 2027 und gerouteten 2026-Daten entsteht genau ein `annual:2026`/`2026-12-31`/`calendar-year:2026` mit den erwarteten Beständen. Bestätigt werden die aktive Registrykopie, die gesperrten Knöpfe, der No-op bei Wiederholung mit Snapshot-Anzahl 1 und der Reload. Doku: README, Handbuch, TECHNICAL und BALANCE_MODULES beschreiben übereinstimmend den lokalen Tagesersatz, die Gruppen ohne Gold/Anleihen, die Pflege-Zweckbindung, die Zuordnung nur zum aktiven Profil, den Beginn 2026, Restore/Replace sowie die Sperre bei incomplete_recovery. Die Inventur wurde von 36 auf 39 aktualisiert, die drei neuen Module sind gelistet.

Größtes Restrisiko:
> Die Attestierung deckt nur `npm test` ab. `npm run test:browser` ist dort nicht enthalten, und das Paket belegt keinen Lauf des neuen Browsergates. Ob die Browserfälle tatsächlich grün sind, ist aus dem Snapshot nicht entscheidbar. Das betrifft vor allem die Wirkung von `page.clock.setFixedTime` auf zeitabhängige App-Logik und die Annahme, dass `section.hidden = true` die `.wealth-history` trotz eventueller CSS-`display`-Regel wirklich ausblendet; css/balance.css ist nicht Teil dieses Diffs. Außerdem fehlt jetzt die frühere Assertion, dass ein Doppelklick die Meldung 'laeuft bereits' auslöst. Sie ist durch die Sperrprüfung der Knöpfe und die Snapshot-Anzahl 1 ersetzt, was laut test_changes_approved zulässig ist.

Bruchbedingung:
> Diese Freigabe ist falsch, wenn das außerhalb der Sandbox ausgeführte `npm run test:browser` in 'Balance wealth history' oder 'Balance annual commit' scheitert. Gleiches gilt, wenn die Overflow-Prüfung nur deshalb besteht, weil das `hidden`-Attribut per CSS wirkungslos ist und `before === withoutChart` trivial gilt. Und sie ist falsch, wenn die dokumentierten Verträge (Storage-Key `ruhestandsmodellValues_v29_guardrails`, Summen-Toleranz `8 * Number.EPSILON`, Export-Signaturen) vom tatsächlichen Code der früheren Slices abweichen.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag nach dem Commit: Das Browsergate läuft erstmals beim Orchestrator oder in der CI und scheitert an fixierter Zeit oder Timing. Ein Beispiel wäre eine Logik, die Date.now-Differenzen auswertet und bei fester Zeit nie abläuft; ein anderes eine Debounce- oder Statusmeldung, die nicht erscheint. Das würde den Browserdurchstich als Nachweis entwerten, ohne dass `npm test` es bemerkt. Gegenmaßnahme: den separaten Lauf von `npm run test:browser` außerhalb der Sandbox vor dem Finalreview dokumentieren. Zweites Risiko: Die Doku beschreibt Exportnamen und Toleranzen, die nicht exakt dem Code entsprechen. Das Finalreview sollte diese Stellen gegen types/wealth-history-contract.js und app/balance/balance-wealth-history.js abgleichen.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-194506.811440Z-1744300d869a`, Arbeitseinheit(en) 5; Nachweise in der Recordkette.
<!-- audit:reference:end -->
