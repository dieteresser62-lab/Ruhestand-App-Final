# Slice 2 von 3 – Sichtbare Bestätigung nur nach neuer Jahresfinalisierung

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die Kurzmeldung des Jahresabschlusses verlässlich an den tatsächlich dauerhaft bestätigten neuen Jahresstand binden und den bereits bestehenden Fehlervertrag erhalten.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
1. Gemessen an SOURCE: Ein neuer dauerhaft bestätigter Abschluss 2026 erzeugt genau einmal den exakten Zusatz `Vermögensstand gesichert.` in der Kurzmeldung. Flag und UI-Rückruf folgen der erfolgreich zurückgekehrten Finalisierung, nicht einer erneut geprüften Jahresschwelle.
2. Gemessen an SOURCE: Node-Tests belegen ohne Zusatz: No-op desselben Handlers nach Erfolg, Abschluss 2025, fehlgeschlagener Readback und Zustand während blockiertem Readback. Nach erfolgreicher Readbackfreigabe erscheinen Zusatz und Rückruf genau einmal. Nachrichten werden je Aktion isoliert ausgewertet; `already_committed` allein gilt nicht als Erfolgsnachweis.
3. Gemessen an SOURCE: Node-Tests belegen bei UI-Rückruf-/Renderfehler nach Commit erhaltene finalisierte Daten und den zuvor ausgegebenen Zusatz. Die Rückgabe bleibt abgeschlossen, `pendingCommit` ist leer, Wiederholung erzeugt weder zweiten Engine-Commit noch neuen Zusatz. Ein Toastfehler ändert ebenfalls keine bestätigte Abschlusssemantik.
4. Gemessen an SOURCE: `Balance annual commit` prüft den Zusatz beim jeweils neuen Abschluss und sein Fehlen beim fachlich belegten No-op anhand eigener Meldungsindizes in `window.__browserSmokeMessages`, bei aktivem und inaktivem Verlauf. Bestehende fachliche und Persistenzprüfungen bleiben erhalten.
5. Gemessen an SOURCE: Die fokussierten Node-Prüfungen bestehen und die fünf betroffenen Dokumente beschreiben den endgültigen Meldevertrag konsistent.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder-snapshots.js`
- `docs/internal/d2-vermoegensverlauf-tab-rest-implement-review-e2196f18.md`
- `docs/internal/slice-d2-vermoegensverlauf-tab-rest-arbeitsplan-02-sichtbare-bestatigung-nur-nach-neuer-jahresfinalisierung.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `handleJahresabschluss()` setzt das pro Aufruf lokale Flag `annualWealthSaved` ausschließlich unmittelbar nach erfolgreich zurückgekehrtem `finalizeAnnual`. Der bestehende fachliche Jahreszweig bleibt erhalten; der UI-Rückruf prüft nur noch das Flag.
> - Nach `completedResult` erscheint zuerst die Kurzmeldung, bei neuer Finalisierung exakt `Ausgaben-Check auf ${nextYear} umgestellt. Vermögensstand gesichert.`. Danach folgen flaggebundener UI-Rückruf und Snapshot-Rendering. Der bestehende Catch-Vertrag erhält bestätigte Abschlüsse auch bei Rückruf-, Render- und Toastfehlern.
> - Node-Tests isolieren Meldungen je Aktion durch Nachrichtenindizes. Ein eigener Adapter-Gate hält den Backend-Readback nach dem finalen Write an: davor weder Zusatz noch Rückruf, danach beide genau einmal. Derselbe Handler bleibt danach ein fachlich belegter No-op. Weitere Nachweise umfassen 2025, Write-/Flush-/Readbackfehler, Restore, aktiven/inaktiven Verlauf und injizierte UI-Fehler mit finalem State, aktiver Registrykopie und leerem Pendingmarker.
> - `Balance annual commit` verwendet für beide Verlaufszustände eigene Meldungsindizes für neuen Abschluss und Wiederholung. Neue Abschlüsse verlangen die exakte Kurzmeldung genau einmal; Wiederholungen warten auf den fachlichen No-op-Text und verlangen keinen Zusatz. Fachliche Werte, State-/Registryprüfungen, Sperren, zweiter Jahresknopf und Reload bleiben erhalten.
> - README, Handbuch, technische Referenz, Balance-Modulreferenz und Test-README beschreiben denselben endgültigen Meldevertrag.

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
> Korrektheit: In `balance-binder-snapshots.js` wird `annualWealthSaved` pro Aufruf mit false initialisiert und nur direkt nach dem erfolgreichen `await wealthHistory.finalizeAnnual(...)` gesetzt. Der Else-Zweig (nur `persistMetadata`) setzt es nicht. Toast mit exaktem Zusatz und danach `onAnnualWealthSaved` hängen allein am Flag; die frühere Prüfung `planning.plan.targetYear >= 2026` ist entfernt. Fehlerpfade: Toast, Rückruf und Rendering laufen nach `completedResult`. Die Node-Schleife `callback/render/toast` prüft `already_committed`, `uiFailures === 1`, `assertFinalizedAnnual` (pendingCommit null, genau ein `annual:2026`, State = Registrykopie = Cache), dass die Wiederholung ein No-op ohne Zusatz bleibt und `commits === 1`. Readback: `annualReadGate` blockiert erst nach dem finalen Backendwrite. Die Assertions 'Während blockiertem Jahres-Readback kein Zusatz' und 'Genau ein Zusatz nach Readbackfreigabe' belegen AC2. Abgedeckt sind außerdem 2025 (Grundmeldung ohne Zusatz), Fehler bei Write/Readback/Flush und blockierter Wiederholung (Zählung ab eigenem Index) sowie aktiver und inaktiver Verlauf mit der Reihenfolge Toast vor Rückruf ('Kurzmeldung bereits vor UI-Rückruf ausgegeben'). Browser-Smoke: Indizes `commitMessageIndex`/`repeatMessageIndex` sind korrekt vor die jeweilige Aktion gesetzt; geprüft werden genau ein Zusatz und sein Fehlen beim No-op. Scope: Alle 8 Diffpfade liegen in der Allowlist. Validierung: Die Attestierung zu `npm test` ist PASS bei passendem Fingerprint. Doku: Die fünf Dokumente beschreiben den Vertrag konsistent.

Größtes Restrisiko:
> Wirft der Toast selbst, fällt auch der nachgelagerte `onAnnualWealthSaved`-Rückruf aus. Dann fehlt zusätzlich die Panelmeldung „Stand gesichert“. Der Test bestätigt das ausdrücklich (`confirmations === 0` bei toast). Die Doku nennt nur die ausbleibende sichtbare Ausgabe, nicht ausdrücklich den ausbleibenden Rückruf. Fachlich ist das unkritisch, weil die Abschlusssemantik erhalten bleibt. Der Browser-Smoke ist in der Sandbox nicht ausführbar; er läuft vor dem Merge in der gesteuerten Sitzung.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn `finalizeAnnual` ohne vollständigen State-/Registry-Readback zurückkehrt oder wenn es Jahre ab 2026 gibt, die über den Else-Zweig ohne Finalisierung laufen. Ebenso wäre sie falsch, wenn eine Ausnahme nach `completedResult` im äußeren Handler doch einen Pendingmarker oder `incomplete_recovery` erzeugt. Die Node-Tests mit Readback-Gate und UI-Fehlern sprechen gegen beides.

Vorab-Risikoanalyse:
> Das wahrscheinlichste spätere Versagen: Jemand verschiebt `annualWealthSaved = true` vor den Readback oder stellt die Jahresschwelle wieder her. Die Gate-Assertions und der 2025-Fall würden das erkennen. Ein zweites Risiko ist ein unvollständiges Mocking von `window.__browserSmokeMessages` im Browserlauf. Der bestehende No-op-Smoke nutzte diesen Puffer aber bereits erfolgreich.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-085329.964067Z-5b8857e8c98f`, Arbeitseinheit(en) 3; Nachweise in der Recordkette.
<!-- audit:reference:end -->
