# Slice Tranchenmanagement 05: Quote-, Währungs- und Resilienzvertrag

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
**Abhängigkeiten:** Slices 02 und 03 abgeschlossen und freigegeben
**GAPs:** TM-05, TM-11

## Ziel

Onlinekurse werden nicht länger als unkommentierte Zahl übernommen. Browser, Node-Proxy und Tauri liefern denselben geprüften Quote-Vertrag mit Symbol, Preis, Währung, Stichtag und Quelle; Batchabrufe bleiben abbrechbar, begrenzt und fehlertolerant.

## Verbindliche Nutzerentscheidungen und technische Reviewpunkte

- O-03: Die Anwendung arbeitet ausschließlich in EUR; Nicht-EUR- und Quotes ohne eindeutige Währung werden fail-closed abgewiesen.
- O-05: Teilerfolge werden übernommen, Fehler behalten den alten Kurs und der Batch wird genau einmal bestätigt persistiert.
- Technischer Reviewpunkt: maximal zulässiges Kursalter und Zeitzonenbezug.
- Technischer Reviewpunkt: verbindliches Yahoo-Symbolformat ohne proprietären `@exchange`-Suffix.

## Akzeptanzkriterien

- Der Service liefert ein normalisiertes Objekt `{ symbol, price, currency, asOf, source }` statt einer rohen Zahl.
- `price` ist positiv und endlich, `currency` und `asOf` sind vorhanden und das Symbol entspricht der Anfrage beziehungsweise einer dokumentierten Normalisierung.
- Nicht-EUR-Quotes und Antworten ohne eindeutige Währung werden sichtbar abgewiesen und niemals als EUR gespeichert.
- Veraltete Quotes werden gemäß der reviewten Stichtagsregel abgewiesen oder ausdrücklich als reviewbedürftig markiert; fehlende Zeitstempel gelten nicht still als aktuell.
- Node-Proxy und Tauri-Command haben für Erfolg und Fehler denselben fachlichen Antwortvertrag.
- Der dokumentierte Symbolvertrag ist in UI, Proxy und Tests identisch; die Oberfläche empfiehlt kein Format, das der Proxy nicht unterstützt.
- Mehrfachklicks starten pro Symbol höchstens einen aktiven Abruf; ein neuer Batch kann den alten abbrechen oder dessen verspätetes Ergebnis sicher ignorieren.
- Batchabrufe besitzen eine enge Gesamtdauer und begrenzte Parallelität; ein fehlerhaftes Symbol blockiert nicht alle übrigen.
- Teilerfolge werden pro Tranche angezeigt, Fehler verändern den vorherigen Wert nicht und ein erfolgreicher Batch wird nur einmal persistiert.
- Jede Ablehnung besitzt einen stabilen Fehlercode und sichtbaren Grund, etwa `UNSUPPORTED_CURRENCY: USD`; die Anzeige bleibt auch nach Abschluss des Batches nachvollziehbar.
- Healthcheck und Fehlertexte unterscheiden Proxy nicht erreichbar, Symbol unbekannt, ungültige Antwort, Währungs- und Stichtagskonflikt.
- Tests verwenden deterministische Stubantworten und keinen Live-Netzzugriff.

## Scope

- Kanonischer Quote-Datentyp und Validierung im Preisservice.
- Vertragsparität der Browser-/Node- und Tauri-Pfade.
- Batch-Single-Flight, Abbruch, Timeout und Teilerfolg.
- UI-nahe Anzeige von Quelle, Währung, Stichtag und Fehlergrund.

## Nicht-Scope

- Keine FX-Engine oder automatische Fremdwährungsumrechnung.
- Kein historischer Kursimport.
- Kein Wechsel des Datenanbieters.
- Kein Release-EXE-Build.

## Geplante Programmdateien

Maximal acht:

- `app/tranches/tranchen-price-service.js`
- `app/tranches/tranchen-manager-page.js`
- `tools/yahoo-proxy.cjs`
- `src-tauri/src/lib.rs`
- `tests/tranchen-price-service.test.mjs`
- `tests/tranchen-manager-page.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/tauri-csp.test.mjs`

## Git- und Diff-Risiko vor Coding

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

Geplante Dateien:

- die acht oben genannten Programmdateien sowie Slice-/Plan-MD.

Voraussichtliche Änderungstiefe:

- riskant; externer IO-Vertrag, zwei Laufzeitumgebungen und Bestandsbewertung.

Gefährdete bestehende Tests:

- Preisservice und Manager-Page,
- Proxy-Start/Healthcheck,
- Tauri-CSP-/Command-Vertrag,
- Persistenztests durch geändertes Quote-Ergebnis.

Nicht anfassen:

- Proxy-URL-/CSP-Freigaben ohne eng begründeten Bedarf,
- Portfolio-Werte bei fehlgeschlagenem Quote,
- globale Netzwerk- oder Tauri-Konfiguration außerhalb des Quote-Pfads,
- `engine.js`, `dist/`, Release-Artefakte.

Rollback-Strategie:

- auf den zuletzt freigegebenen Slice-Commit zurück; Proxy-, Rust- und JS-Vertragsänderungen nicht getrennt ausrollen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/tranchen-price-service.test.mjs
node tests/run-single.mjs tests/tranchen-manager-page.test.mjs
node tests/run-single.mjs tests/tauri-csp.test.mjs
npm test
npm run test:browser
cargo test --manifest-path src-tauri/Cargo.toml
```

Pflichtfälle: EUR-Erfolg, USD/GBP/GBX- und fehlende-Währung-Ablehnung mit sichtbarem Fehlercode, fehlende/alte Zeit, `NaN`/0/negativer Preis, 404/429/500, Timeout, Abbruch, verspätete Antwort, gemischter Batch mit genau einem Commit und Node-/Rust-Vertragsparität.

## Ergebnisse

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Datenanbieter können Währung oder Zeitzonen anders melden als erwartet.
- Browserabbruch beendet nicht zwingend die upstream Anfrage im Proxy.
- Eine spätere FX-Unterstützung benötigt einen eigenen Stichtags- und Rundungsvertrag.

## Rückdokumentation

- Quote-Schema, Symbolformat, Stichtagsregel, Timeout und Laufzeitparität in Hauptplan/GAP-Analyse festhalten.
- Technische und Nutzer-Dokumentation in Slice 09 aktualisieren.

## Freigabestatus

Nicht freigegeben. IO-, Währungs- und Tauri-Review ausstehend.

## Review-Feedback von Gemini

Ausstehend: adversarial Providerantworten, Timeout-/Batchversagen, Währungsrisiko und Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: JS-/Rust-Vertragsparität, Abort-/Race-Verhalten und CSP-Grenzen.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
