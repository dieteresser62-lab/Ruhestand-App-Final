# Slice 3 von 5 – Kurszeitpunkte der bewerteten Tranchen rückwärtskompatibel speichern

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die vom Kursdienst bereits gelieferte Zeitprovenienz an genau dem übernommenen Preis erhalten und den vollständigen produktiven Persistenzweg vor Aktivierung der Importautomatik absichern.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: V0-/V1-/V2-Tranchen ohne `asOf` sowie mit `null` laden weiter; die normalisierte Ausgabe hat kein erfundenes Datum. Ein gültiger positiver UTC-Sekundenwert bleibt bei wiederholter Normalisierung, Save/Load und Engineprojektion identisch. Strings, leere Strings, Nullwert 0, negative/gebrochene/nicht endliche beziehungsweise nicht darstellbare Zeitwerte werden feldbezogen abgelehnt; eine alte gültige Kurszeit bleibt strukturell gültig und wird erst im Frischegate als alt bewertet.
- SOURCE: Der reale Manager-Kurslistener speichert bei erfolgreicher Quote Preis, aufgelösten Ticker und exakt `quote.asOf` zusammen, auch bei gleichem Preis und mehreren Tranchen desselben Symbols. Live-Store, bestätigte Registrykopie und nach Reload geladene Tranche stimmen überein. Teilfehler, Abbruch, fehlgeschlagener Flush und Profilwechsel erzeugen keinen fälschlich neuen Kurszeitpunkt.
- SOURCE: Eine reine Notiz-/Anteils-/Steueränderung erhält die Zeitprovenienz des gleichen Kurses; manuelle Preis-/ISIN-/Ticker-/Kategorie-/Typänderung entfernt sie. Neuanlage besitzt kein `asOf`. Form-, Manager- und Normalisierungstests belegen diese Regeln einschließlich Kaufpreis-Fallback und Wiedereintragen eines früheren Preises.
- SOURCE: Profilbundle und Vollbackup erhalten gültiges `asOf` im exportierten und wieder importierten Tranchenbestand einschließlich anschließendem Profilwechsel. Altdatenimporte ohne Feld laden unverändert als unbekannt. Ein ungültiges vorhandenes Feld wird von den bestehenden Domainvalidatoren vor dem Importwrite erkannt, ohne fremde Daten, Ausgaben oder Vermögensverlauf zu ändern.
- SOURCE: Profilverbundprojektion erhält Preis und Zeit je realer beitragender Tranche samt Eigentümer; synthetische Bestände und positive ETF-Aggregate ohne Tranchenprovenienz bleiben undatiert. Weder Profil-`updatedAt` noch Strategie-ETF-`annualMarketDataMeta` oder Exportzeitpunkt ersetzen das Kursdatum. Keine Veränderung der Engine-/Steuer-/Bewertungssemantik und keine Änderung der Ausgaben-/Verlaufsformate.
- SOURCE: Wegen des geänderten Persistenzvertrags sind gemäß AGENTS.md gezielte Läufe von `tranche-contract.test.mjs`, `tranchen-manager-state.test.mjs`, `tranchen-manager-modal.test.mjs`, `tranchen-manager-page.test.mjs`, `profile-storage.test.mjs`, `persistence.test.mjs` und `profilverbund-balance.test.mjs` über `node tests/run-single.mjs` verpflichtend. Zusätzlich bestehende `tranche-reconciliation.test.mjs`, `simulator-portfolio-tranches.test.mjs` und `depot-tranchen-status.test.mjs` unverändert als Regression ausführen. Die volle Pflichtsuite `npm test` führt anschließend ausschließlich der Orchestrator aus; Browserprüfung bleibt extern.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `app/tranches/tranchen-manager-modal.js`
- `app/tranches/tranchen-manager-page.js`
- `app/tranches/tranchen-manager-state.js`
- `docs/internal/e-auswertung-ausgaben-implement-review-8b7f18fb.md`
- `docs/internal/slice-e-auswertung-ausgaben-arbeitsplan-03-kurszeitpunkte-der-bewerteten-tranchen-ruckwartskompatibel-speichern.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/browser-smoke.test.mjs`
- `tests/persistence.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/profilverbund-balance.test.mjs`
- `tests/tranche-contract.test.mjs`
- `tests/tranchen-manager-modal.test.mjs`
- `tests/tranchen-manager-page.test.mjs`
- `tests/tranchen-manager-state.test.mjs`
- `types/tranche-contract.js`
<!-- audit:scope:end -->

## Umsetzung

> - Der gemeinsame Tranchenvertrag erhält `asOf` additiv als optionales persistiertes Feld, ohne Schema-Versionswechsel. Fehlende und `null`-Werte werden entfernt; vorhandene Werte müssen positive ganzzahlige, als Datum darstellbare UTC-Sekunden sein. Fehler enthalten `TRANCHE_AS_OF_INVALID`, Feld und Tranche. Die Strukturprüfung lässt alte gültige Zeiten unverändert.
> - Der echte Manager-Kurslistener übernimmt exakt `quote.asOf`, Preis und aufgelösten Ticker gemeinsam. Die bestehenden Flush-/Rollback-/Retrywege sichern Livebestand und Registrykopie. Ein gleicher Preis erhält ebenfalls die neue Quotezeit; geteilte Symbole übernehmen denselben Zeitnachweis.
> - Der Formularleser erhält den bestehenden bestätigten Datensatz vom Manager. Bei unverändertem Preis, ISIN, Ticker, Kategorie und Typ bleibt die Zeit für Notiz-, Anteils-, Kaufpreis- und Steueränderungen erhalten. Manuelle Kurs-/Instrumentänderung, Kaufpreis-Fallback und Neuanlage sind undatiert; das Wiedereintragen eines früheren Preises stellt keine Zeit wieder her.
> - Die bestehenden Profilbundle-/Vollbackup-Domainvalidatoren und Profilverbundprojektionen verwenden den gemeinsamen Vertrag bereits. Tests sichern dort den produktiven Export-/Import-/Profilwechselweg und die Ablehnung ungültiger aktiver/inaktiver Daten vor Writes, einschließlich bytegleicher vorhandener Ausgaben-/Verlaufsdaten. Die Projektion erhält reale Preis-/Zeit-/Eigentümerzuordnung; synthetische Aggregate bleiben ohne Zeit trotz Profil-/Strategiemetadaten.
> - README, Handbuch, technische Referenz, Balance-Modulreferenz und Testreferenz dokumentieren die Zeitprovenienz. Der externe Browser-Smoke prüft Neuanlage, Quotezeit in IndexedDB und Registry, Notizänderung, Reload und Zeitverlust nach manueller Preisänderung.
> - Engine-, Steuer- und Bewertungssemantik sowie Ausgaben-/Verlaufsformate und generierte Artefakte bleiben unverändert. Keine Importautomatik aus Slice 4 aktiviert.

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
> Geprüft wurden Vertrag, Fehlerpfade, Persistenz/Resume und Scope. Alle 16 Diff-Pfade liegen in der Slice-Allowlist. Vertrag: readQuoteTimestamp in types/tranche-contract.js lässt undefined/null zu und entfernt das Feld. Abgelehnt werden Nicht-Number, Nicht-Integer, <=0 und nicht darstellbare Date-Werte ([Hash ausgelassen]), jeweils mit TRANCHE_AS_OF_INVALID samt Feld und Tranche. Das deckt tests/tranche-contract.test.mjs Test 11 für V0/V1/V2 in den Modi persisted und engine ab. Kurslistener: executePriceBatch in app/tranches/tranchen-manager-page.js übergibt quote.asOf gemeinsam mit Ticker und Preis. tests/tranchen-manager-page.test.mjs prüft lot.asOf===now bei gleichem Preis und geteiltem Symbol über Live-Store, Facade, Registry und Reload. Dort ist auch belegt, dass der USD-Teilfehler now-2000 behält, dass Abbruch oder Profilwechsel kein asOf schreiben und dass ein Flush-Rollback alle Stände bytegleich hinterlässt. Formular: readTrancheFromForm in app/tranches/tranchen-manager-modal.js übernimmt asOf nur bei gleicher trancheId, nicht leerem Kursfeld und identischen Werten für currentPrice, isin, ticker, category und type. tests/tranchen-manager-modal.test.mjs Test 12 und Page-Test 4b belegen Erhalt, Entfernung, Kaufpreis-Fallback, Wiedereintragen des Preises und Neuanlage. Import: tests/profile-storage.test.mjs 21d und tests/persistence.test.mjs prüfen Roundtrip, Profilwechsel sowie Ablehnung ohne Writes für aktive, inaktive und Live-Profile. Profilverbund: tests/profilverbund-balance.test.mjs Test 18 und die erweiterten Tests 7 und 8 decken die Zuordnung von Preis, Zeit und Eigentümer ab und zeigen, dass synthetische Bestände und Aggregate undatiert bleiben. npm test lief mit PASS.

Größtes Restrisiko:
> Im Kurslistener wird das Ergebnis von calculateTrancheDerivedValues per Object.assign auf die Tranche übertragen. Liefert ein Quote kein asOf, entfernt die Normalisierung das Feld zwar. Object.assign löscht dabei aber kein vorhandenes tranche.asOf, sodass ein alter Zeitpunkt am neuen Preis hängen bleiben könnte. Das Paket kann das nicht entscheiden, weil die Quote-Validierung des Kursdienstes nicht im Diff liegt. Laut Slice-Ziel liefert der Kursdienst asOf bereits mit, und die Tests prüfen nur Quotes mit asOf. Ein kleineres Risiko: Altbestände ohne isin-Schlüssel oder mit gerundeter Formularanzeige des Preises verlieren asOf bei einer reinen Notizänderung. Das schlägt in die sichere Richtung fehl und erfindet keine Zeit.

Bruchbedingung:
> Dieses Urteil wäre falsch, wenn der Kursdienst erfolgreiche Quotes ohne gültiges asOf an executePriceBatch durchreicht. Dann bliebe ein veralteter Zeitpunkt an einem neuen Preis stehen. Es wäre ebenso falsch, wenn currentPriceInput in readTrancheFromForm nicht der rohe Wert des Kursfelds ist. Dann würde bei Kaufpreis-Fallback ein Zeitnachweis bewahrt.

Vorab-Risikoanalyse:
> Scheitert der Slice später, dann am wahrscheinlichsten so: Ein Quote-Pfad liefert Preise ohne asOf, etwa ein anderer Provider oder ein Fixture. Object.assign behält dann das alte tranche.asOf, und das Frischegate in Slice 4 hält einen neuen Kurs fälschlich für alt oder einen alten Zeitpunkt für zum neuen Preis gehörig. Ein zweiter Weg: Die Formularanzeige rundet den Kurs, wodurch Notizänderungen den Zeitnachweis unerwartet verlieren. Für Slice 4 sollte geprüft werden, ob die Quote-Validierung asOf verpflichtend macht, oder ob executePriceBatch bei fehlendem asOf das Feld explizit entfernt.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-162826.876868Z-73b99f8bd2c7`, Arbeitseinheit(en) 4; Nachweise in der Recordkette.
<!-- audit:reference:end -->
