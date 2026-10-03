# Slice 2 von 5 – Hinweise korrekt kennzeichnen und interne Sperren erklären

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
H-01 und H-03 erledigen, ohne den Jahresprozess oder vorhandene Toastaufrufe still umzudeuten.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Standard-/`true`-Aufrufe bleiben Erfolg und `false` bleibt Fehler; der explizite Hinweis-Typ liefert „Hinweis: “, neutrales Symbol und eigene Formklasse. Originaltexte einschließlich enthaltenen Symbolen bleiben bytegleich.
- SOURCE: Die genannten Fortschritts-, Warn- und No-op-Meldungen erscheinen als Hinweis, ohne zusätzliches „Erfolg:“/✓ oder „Fehler:“. Bestätigte Jahres-/Importerfolge und echte Fehlertoasts behalten ihren Typ.
- SOURCE: Alle drei Toasttypen bestehen die 6000-ms-, Timerersetzungs-, identische-Folgetext-, Neuinitialisierungs- und Kanaltrennungstests. Der Browser prüft Typ und Originaltext an einem tatsächlichen Jahresprozess sowie mindestens 3000 ms Sichtbarkeit der Abschlussmeldung.
- SOURCE: Kommentare kennzeichnen die zusätzlichen Sperren als intern. Ihre bisherigen Rückgaben/Fehlercodes, die Jahresabschluss-Sperre und `nested`-Fehlergrenzen bleiben unverändert; der bestehende Test für genau einen Jahrescommit bei Doppelklick bleibt grün.
- SOURCE: Die gezielten Läufe für `balance-messages.test.mjs` und die vier genannten Annual-Testdateien bestehen; `npm test` folgt durch den Orchestrator. Die neuen Browserprüfungen sind für den späteren externen Lauf vorhanden.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-annual-inflation.js`
- `app/balance/balance-annual-marketdata.js`
- `app/balance/balance-annual-orchestrator.js`
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-renderer.js`
- `css/balance.css`
- `docs/internal/f2-meldungen-rest-implement-review-e848a1f3.md`
- `docs/internal/slice-f2-meldungen-rest-arbeitsplan-02-hinweise-korrekt-kennzeichnen-und-interne-sperren-erklaren.md`
- `tests/balance-annual-cape.test.mjs`
- `tests/balance-annual-inflation.test.mjs`
- `tests/balance-annual-marketdata.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-messages.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `UIRenderer.toast(text, 'info')` kennzeichnet Hinweise mit „Hinweis: “, dem dekorativen neutralen Symbol `i` und der Klasse `toast-info`. Die bestehende boolesche API bleibt erhalten; Meldungstext, `.toast-text`, 6000-ms-Timer und Identitätsschutz wurden nicht verändert. Die lokale CSS-Regel unterscheidet Hinweise durch einen gepunkteten Rahmen und eine eigene Symbolform.
> - Jahresupdate-Start, interne Inflations-/ETF-Abrufstarts, CAPE-Warnungen zum lokalen Stand, bereits angewendete Inflation, bereits abgeschlossene Jahresperioden, der bereits laufende Jahresprozess und Export-Validierungswarnungen verwenden den expliziten Hinweis-Typ. Bestätigte Erfolge und Fehler behalten ihre bisherigen Typen und Originaltexte samt eingebetteten Symbolen.
> - Kommentare an `inFlight`, `fetchInFlight` und `etfInFlight` erklären ihre interne Absicherung direkter Aufrufe. Die Tests unterscheiden diese Aufrufe vom tatsächlichen UI-Jahresabschluss. Leere Rückgaben, `in_flight`, `inflation_fetch_in_flight`, `etf_fetch_in_flight`, `nested`-Grenzen und `annualCloseInFlight` bleiben erhalten.
> - Fake-Clock-Prüfungen sichern alle drei Typen gegen vorzeitigen Ablauf, alte Timer, identische Folgetexte, Neuinitialisierung desselben bzw. eines neuen Containers und Eingriffe in Berechnungs-/Aktionsfehler ab. Der echte Exporthandler wird mit erfolgreichem und warnendem Export geprüft. Annual-Tests prüfen Fortschritts-/No-op-Typen, CAPE-Warnungen und bestätigte Erfolge sowie genau einen Jahrescommit bei Doppelklick.
> - Der vorhandene Browser-Jahresabschluss hält testseitig den echten Inflationsabruf zurück, prüft den sichtbaren Start-Hinweis und gibt den Abruf kontrolliert frei. Abschluss und Perioden-No-op werden auf Originaltext, zugängliches Typpräfix, Symbol und Klasse geprüft. Die bestehende Sichtbarkeitsmessung nach einer und drei Sekunden prüft zusätzlich den Erfolgstyp.

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
> Korrektheit: Der Renderer erkennt nur den exakten Wert 'info'. Dafür liefert er „Hinweis: “, das Symbol 'i' und toast-info. Standard und true bleiben Erfolg, false bleibt Fehler. msg geht weiter unverändert über textContent ein. Umgestellt sind Fortschrittsmeldungen (Jahres-Update-Start, Inflations- und ETF-Abrufstart), die CAPE-Warnung, die No-ops (Inflation bereits angewendet, Periode bereits abgeschlossen, Jahresprozess läuft) und der Export mit Validierungswarnung. Bestätigte Erfolge behalten den Standardtyp. Die Sperren tragen nur Kommentare. Rückgaben, Fehlercodes und nested-Grenzen sind nicht geändert. Test 7 sichert das ab: undefined-Rückgabe und Codes inflation_fetch_in_flight/etf_fetch_in_flight. Abdeckung: balance-messages.test.mjs läuft für alle drei Typen durch Ablauf bei 6000 ms, Timerersetzung, identischen Folgetext, Neuinitialisierung und Kanaltrennung. Dazu kommt der echte Exporthandler mit den Klassen toast-info/toast-success. Die Annual-Tests prüfen Wortlaut und Typ. Test 6 prüft commitCount===1 beim Doppelklick. browser-smoke prüft den Start-Hinweis, den Erfolg über 1 s + 2 s sowie den Perioden-No-op-Hinweis. Pfade: Alle 13 Diffpfade liegen in der Slice-Allowlist. Validierung: npm test PASS mit passendem Fingerprint [Hash ausgelassen]….

Größtes Restrisiko:
> Nicht prüfbar aus dem Snapshot: Ob der Browser-Smoke im echten Jahresprozess „Starte Jahres-Update...“ beobachten kann, bevor ein weiterer Toast den Text ersetzt. Ein Kandidat wäre „Versuche Inflationsdaten…“, falls im UI ein btnFetchInflation existiert. Die Kommentare zum fehlenden Direktpfad sprechen dagegen. Der Quelltext von handleFetchInflation, die btn-Ermittlung und Balance.html sind aber nicht im Paket enthalten. Auch die Wiederherstellung von global.setTimeout im finally von balance-annual-workflow-contract.test.mjs ist nicht prüfbar, weil dieser Teil nicht im Diff liegt. Der grüne Gesamtlauf mindert dieses Risiko.

Bruchbedingung:
> Die Freigabe fällt, wenn der spätere externe Browser-Smoke an assertBalanceBrowserToast für den Start-Hinweis scheitert. Sie fällt auch, wenn ein vorhandener Aufrufer toast-success/toast-error als einzig mögliche Klasse voraussetzt, oder wenn eine im Plan als echter Fehler genannte Meldung nun als Hinweis erscheint.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag nach dem Merge: Der externe Browser-Smoke wird rot, weil der Start-Hinweis synchron von einem Folgetoast überschrieben wird. Dann ist nur das Testszenario betroffen, nicht das Produktverhalten. Weniger wahrscheinlich: Die Einstufung des Doppelklicks „Der Jahresprozess laeuft bereits.“ als Hinweis statt Fehler weicht von Nutzererwartungen ab. Rückgabe und Commit-Sperre bleiben dabei unverändert.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-135954.330992Z-fd7253ade355`, Arbeitseinheit(en) 3; Nachweise in der Recordkette.
<!-- audit:reference:end -->
