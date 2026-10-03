# Slice 5 von 5 – Bedienung und abschließende Prüfverträge dokumentieren

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die fünf geforderten Dokumente an die tatsächlich erreichbaren Funktionen anpassen und den externen Browserabschluss vorbereiten.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Alle fünf Dokumente beschreiben dieselbe Tabstruktur, Leseübersicht, Datenbasis über gespeicherte Profile, Monatszählung, Budgetabwesenheit, 1366-px-Grenze und unveränderte mobile/Printbedienung. „Vermögensverlauf“ bleibt Abschnittsname, nicht veralteter vierter Tabtitel.
- SOURCE: Automatische Sicherung, unbekannte/alte Kurse, Importunabhängigkeit, „Unterjährig“ bei gespeichertem `manual` und fehlende Tagesgeld-Altersprüfung sind nachvollziehbar dokumentiert. Dokumente erklären den produktiv wirksamen Managerupdatepfad mit gespeichertem `asOf`, Altdaten ohne Datum und manuell geänderte Preise als unbekannt; nur vollständig frische beitragende Bestände erlauben die Automatik. Ausgaben-/Verlaufsvertrag bleiben unverändert.
- SOURCE: Referenzen nennen tatsächlich vorhandene neue Module/Tests und bestehende Meldungs-APIs. Browser-Smoke ist als separates externes Gate benannt, synthetische und produktive Frischeevidenz werden unterschieden; keine Ausführung in der Agentensandbox als grüner Nachweis behaupten.
- SOURCE: Dokumentabgleich per `rg` und `git diff --check` besteht; `npm test` wird nach dieser Slice durch den Orchestrator ausgeführt. Außerhalb der Sandbox führt die gesteuerte Sitzung vor lokalem Merge `npm run test:browser` aus und bestätigt insbesondere die gemessene Tabzeile ab 1366 CSS-Pixeln.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `docs/internal/e-auswertung-ausgaben-implement-review-8b7f18fb.md`
- `docs/internal/slice-e-auswertung-ausgaben-arbeitsplan-05-bedienung-und-abschlieende-prufvertrage-dokumentieren.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
<!-- audit:scope:end -->

## Umsetzung

> - `README.md`, `Handbuch.html`, `docs/reference/TECHNICAL.md`, `docs/reference/BALANCE_MODULES_README.md` und `tests/README.md` mit der vorhandenen Implementierung abgeglichen. Die Tabreihenfolge lautet „Jahres-Update“, „Einstellungen & Strategie“, „Ausgaben-Check“, „Auswertung“; „Vermögensverlauf“ und „Ausgaben je Jahr“ bleiben die beiden Abschnitte der lesenden Auswertung.
> - Monatszählung präzisiert: Jeder Kalendermonat mit positiven Ausgaben zählt einmal über alle gespeicherten Profile, unabhängig von der Verbundauswahl. Ø pro Monat teilt die Jahressumme durch diese Monatszahl (0 bei null Datenmonaten). Nullimporte bleiben als Nulljahr sichtbar, reine Auswahljahre entfallen; nur das aktuelle Kalenderjahr mit weniger als zwölf Datenmonaten heißt „laufendes Teiljahr“. Historische Budgets fehlen und werden nicht rekonstruiert.
> - Produktiven Kursweg dokumentiert: Managerkurslistener speichert `quote.asOf` mit Preis/Ticker; erst bestätigter Flush von Livebestand und Registrykopie macht die Provenienz nach Rückkehr/Reload nutzbar. Altdaten ohne Datum und manuell geänderte Preise bleiben unbekannt. Alle beitragenden Aktien-/Geldmarkt-ETFs müssen vollständig belegt und höchstens sieben Tage alt sein; Teilupdates genügen nur bei insgesamt frischen Beständen. Tagesgeld hat keine Altersprüfung.
> - Import und optionale Sicherung bleiben unabhängig. Gespeichert bleibt `manual`, sichtbar „Unterjährig“, mit lokaler Tagesersetzung. Bestehende `UIRenderer.toast()`, `handleActionError()` und `clearActionError()` sowie unveränderte Ausgaben-/Verlaufsformate beschrieben; Module und Testdateien auf Existenz geprüft.
> - Synthetische Frischeprüfungen vom produktiven Manager-/CSV-/Enginepfad mit kontrollierten Kursantworten getrennt. Externes Browsergate mit gemessenen `Balance wealth layout SOURCE`-Werten, gemeinsamer Tabzeile ab 1366 CSS-Pixeln, 375-px-Drawer/Scrollbedienung und Druckausblendung vorbereitet. Keine Laufmessung oder Browserfreigabe behauptet.

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
> Umfang: Der Diff ändert nur Handbuch.html, README.md, docs/reference/BALANCE_MODULES_README.md, docs/reference/TECHNICAL.md und tests/README.md. Alle fünf Pfade stehen in der Slice-Allowlist; Code ist nicht betroffen. Inhalt: Alle fünf Dokumente beschreiben übereinstimmend die Tabreihenfolge „Jahres-Update“, „Einstellungen & Strategie“, „Ausgaben-Check“, „Auswertung“. „Vermögensverlauf“ ist dabei nur Abschnittsname. Ebenfalls einheitlich beschrieben sind die Datenbasis über alle gespeicherten Profile, die Monatszählung (jeder positive Kalendermonat genau einmal, Ø = Summe/Monate, bei null Monaten 0) und das Fehlen von Budgetspalten. Gleiches gilt für die 1366-CSS-Pixel-Grenze, Mobil- und Drawerbedienung sowie die Druckausblendung. Die Drucktexte in BALANCE_MODULES_README, TECHNICAL und tests/README wurden von „Vermögensverlauf“ auf „gesamte Auswertung“ korrigiert. Der Managerpfad mit `quote.asOf`, bestätigtem Flush und Altdaten bzw. manuell geänderten Preisen als „unbekannt“ ist dokumentiert. Dasselbe gilt für Teilupdates, die nur bei vollständig frischen beitragenden ETFs freigeben, für die fehlende Tagesgeld-Altersprüfung und für „Unterjährig“/`manual`. Die Meldungs-APIs `toast(text, true|'info')`, `handleActionError`/`clearActionError('expenses-wealth')` sind benannt. Der Browser-Smoke ist als externes Gate der gesteuerten Sitzung beschrieben, ausdrücklich nicht als grüner Sandbox-Nachweis. Synthetische und produktive Frischeevidenz werden getrennt. Validierung: Die Attestierung validation-[Hash ausgelassen] passt zum Fingerprint, `npm test` lief mit PASS (exit 0). R-01 ist bereits CLOSED; im Diff ist die Inventur weiterhin 41 von 41, keine Regression.

Größtes Restrisiko:
> Die Dokumentation beschreibt fachliche Regeln aus früheren Slices: Monatsdeduplikation über Profile, `avgMonthly = annualUsed / monthsWithData` und Teiljahrmarkierung nur im aktuellen Kalenderjahr mit weniger als zwölf Monaten. Dass diese Regeln exakt dem Code in app/balance/balance-expenses-metrics.js entsprechen, ist mit dem vorgegebenen Lesebudget von sechs Dateien nicht direkt am Quelltext verifizierbar. Der Review-Packet enthält nur den Doku-Diff. Es bleibt also das Risiko, dass ein Doku-Satz eine Randregel präziser formuliert als der Code. Kleinere Restinkonsistenz: TECHNICAL.md sagt in der Validierungsaufzählung weiterhin „eine Tabzeile ab 1366 px“ statt „CSS-Pixel“; das ist semantisch gleich.

Bruchbedingung:
> Diese Freigabe wäre falsch, wenn app/balance/balance-expenses-metrics.js Monate pro Profil statt pro Kalendermonat zählt oder bei null Datenmonaten einen anderen Durchschnitt als 0 liefert. Falsch wäre sie auch, wenn der Code ein Vorjahr als „laufendes Teiljahr“ markiert. Gleiches gilt, wenn tranchen-manager-page.js nicht exakt `quote.asOf` speichert oder ein in den Prüfzuordnungen genannter Test (z. B. tests/balance-messages.test.mjs, Browsertest „Balance automatic expenses capture“) nicht existiert. Ebenso, wenn die Druck-CSS die Auswertung nicht über die Formularspalte ausblendet.

Vorab-Risikoanalyse:
> Angenommen, diese Doku-Slice erweist sich später als fehlerhaft. Wahrscheinlichste Ursache ist eine Diskrepanz zwischen dem dokumentierten Rechen- und Frischevertrag und dem tatsächlichen Code der Slices 1 bis 4: Dann würden Nutzer und Finalprüfer aus Handbuch bzw. README falsche Erwartungen ableiten. Zweitwahrscheinlich: Die gesteuerte Sitzung überspringt das externe Browsergate, weil ein grünes `npm test` als ausreichend gelesen wird. Die Doku trennt beides allerdings jetzt mehrfach ausdrücklich. Beides betrifft weder Daten noch Persistenz oder Resume-Verhalten; die Slice ist rein dokumentarisch und idempotent.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-162826.876868Z-73b99f8bd2c7`, Arbeitseinheit(en) 6; Nachweise in der Recordkette.
<!-- audit:reference:end -->
