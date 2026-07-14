# Slice Tranchenmanagement 05: Quote-, Währungs- und Resilienzvertrag

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
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
git branch --show-current: codex/tranchenmanagement-hardening
git status --short:
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die unversionierten Playwright-Dateien sind vorbestehende lokale Abhaengigkeiten,
liegen ausserhalb des Slice-Scope und werden nicht veraendert oder aufgenommen.

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

- die oben genannten Slice-Dateien gemeinsam auf den Ausgangsstand `e554062`
  zurueckfuehren; Proxy-, Rust- und JS-Vertragsaenderungen nicht getrennt ausrollen.

## Reviewte technische Festlegungen vor Umsetzung

- Yahoo-Symbole werden getrimmt und in Grossbuchstaben normalisiert. Erlaubt sind
  1 bis 32 ASCII-Zeichen aus Buchstaben, Ziffern, `.`, `-`, `^` und `=`; der
  proprietaere Suffix `@exchange` ist unzulaessig.
- `asOf` ist eine ganzzahlige Unixsekunde und bezeichnet damit einen eindeutigen
  UTC-Zeitpunkt ohne lokale Zeitzoneninterpretation.
- Ein Quote darf hoechstens sieben Kalendertage alt sein. Mehr als fuenf Minuten
  in der Zukunft liegende Zeitpunkte werden ebenfalls abgewiesen.
- Der Browser-Request hat ein enges Einzelzeitlimit; der gesamte Batch endet nach
  spaetestens 12 Sekunden und verarbeitet hoechstens drei Tranchen parallel.
- Node- und Tauri-Proxy liefern bei Erfolg exakt
  `{ symbol, price, currency, asOf, source }`; Fehler liefern
  `{ status: "error", code, message }` mit stabilen Codes.

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

- Browser, Node-Proxy und Tauri-Proxy verwenden denselben Quote-Erfolgsvertrag
  `{ symbol, price, currency, asOf, source }`. `asOf` ist eine UTC-Unixsekunde;
  Preis, Symbol, Waehrung, Alter und Quelle werden fail-closed validiert.
- Automatische Uebernahme ist ausschliesslich fuer EUR moeglich. USD, GBP, GBX,
  fehlende Waehrung, fehlender/alter/zukuenftiger Stichtag, Symbolabweichung und
  ungueltiger Preis besitzen stabile, im UI sichtbare Fehlercodes.
- Der Manager verarbeitet maximal drei Tranchen parallel, dedupliziert identische
  Symbol- und Suchanfragen innerhalb eines Batches, ignoriert spaete Ergebnisse
  nach Profilwechsel und beendet den Batch nach zwoelf Sekunden.
- Gemischte Batches behalten bei Fehlern den alten Kurs, zeigen pro Tranche Erfolg
  oder Fehler und schreiben alle validen Teilerfolge mit genau einem bestaetigten
  Persistenz-Commit. Ein Batch ohne Erfolg erzeugt keinen unnoetigen Write.
- Die Browser-Gegenprobe aktualisiert einen deterministischen EUR-Quote ohne
  Live-Netzzugriff und zeigt Symbol, Waehrung, Quelle und UTC-Stichtag.

## Durchgeführte Änderungen

- `tranchen-price-service.js` normalisiert Yahoo-Symbole ohne `@exchange`, fuehrt
  den Quote- und Fehlerdatentyp ein, validiert EUR und die Sieben-Tage-Regel und
  trennt Proxy-Nichterreichbarkeit, Provider-/HTTP-Fehler, Timeout und Abbruch.
- `tranchen-manager-page.js` implementiert Batch-Single-Flight, Request-Deduplizierung,
  Parallelitaet 3, 12-Sekunden-Abbruch, Profilwechsel-Invalidierung, Teilerfolge,
  Per-Lot-Status und den einzelnen Persistenz-Commit.
- `tools/yahoo-proxy.cjs` und `src-tauri/src/lib.rs` extrahieren nur noch den
  kanonischen Quote-Shape, pruefen denselben Symbol-/EUR-/Stichtagsvertrag, nutzen
  vier Sekunden Upstream-Timeout und liefern identische Fehlerobjekte. Die fruehere
  stille GBP-/GBX-Umrechnung wurde entfernt.
- Die vier geplanten Testdateien pruefen Browser-/Node-/Rust-Paritaet, alle
  Waehrungs- und Stichtagsablehnungen, Transportfehler, Doppelklick/identische
  Symbole, gemischten Batch, einzigen Write und den echten Browserpfad.

## Ausgeführte Tests

- `node tests/run-single.mjs tests/tranchen-price-service.test.mjs`: 37/37
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/tranchen-manager-page.test.mjs`: 59/59
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/tauri-csp.test.mjs`: 83/83 Assertions,
  0 Fehler.
- `node --check tools/yahoo-proxy.cjs`: gruen.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 8/8 Rust-Tests, 0 Fehler.
- `npm test`: 104 Testdateien, 4204/4204 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:browser`: elf von elf Browser-Smoke-Szenarien gruen.
- `git diff --check`: gruen.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: nicht gruen, weil
  die vorbestehenden kompletten Dateien `build.rs`, `src/lib.rs` und `src/main.rs`
  nicht dem rustfmt-Standard entsprechen. Kein Formatierungswrite ausgefuehrt, um
  einen grossflaechigen slice-fremden Diff zu vermeiden; Kompilierung und Rust-
  Tests sind gruen.

## Abweichungen vom Plan

- Keine Scope- oder Dateizahlabweichung: exakt die acht geplanten Programmdateien
  wurden geaendert; hinzu kommen Slice-, Hauptplan- und GAP-Rueckdokumentation.
- Der Tauri-Pfad ist wie im Bestand als lokaler HTTP-Proxy implementiert, nicht als
  neu eingefuehrtes Invoke-Command. Sein fachlicher HTTP-Vertrag ist mit dem
  Node-Proxy identisch und wird durch Rust- plus statischen Paritaetstest belegt.
- Kein Live-Yahoo-Test wurde ausgefuehrt; alle Providerantworten sind gemaess
  Akzeptanzkriterium deterministisch gestubbt.

## Offene Risiken

- Eine Yahoo-Antwort ohne die erwarteten Metadaten wird bewusst abgelehnt, auch
  wenn ein nackter Kurs vorhanden waere. Provider-Shape-Aenderungen koennen daher
  zunaechst sichtbare `INVALID_RESPONSE`-Fehler erzeugen.
- Browserabbruch beendet nicht in jedem Laufzeitszenario sofort den bereits
  gestarteten Upstream-Abruf; beide Proxys begrenzen ihn deshalb separat auf vier
  Sekunden und spaete Browserergebnisse koennen nicht mehr persistieren.
- Die Sieben-Tage-Grenze deckt uebliche Wochenenden und Feiertage ab. Aussergewoehnlich
  lange Marktschliessungen verlangen manuelle Kurspflege oder eine eigene Reviewentscheidung.
- Eine spaetere FX-Unterstuetzung benoetigt einen neuen Stichtags-, Quellen- und
  Rundungsvertrag und ist nicht durch diesen Slice vorbereitet.

## Rückdokumentation

- Quote-Schema, Symbolformat, Stichtagsregel, Timeout und Laufzeitparität sind in
  Hauptplan und GAP-Analyse festgehalten.
- Technische und Nutzer-Dokumentation in Slice 09 aktualisieren.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien wurden vollständig und fehlerfrei erfüllt. Der Quote-Währungs- und Resilienzvertrag (EUR-Erzwingung, 7 Tage Höchstalter, future tolerance) wird im Browser, im Node-Proxy und im Tauri-Rust-Proxy absolut synchron eingehalten.
* **Vertragstreue:** Die Proxys liefern die exakten kanonischen Quote-Datenfelder.
* **Fehlerbehandlung:** HTTP- und Providerstörungen werden in stabile Fehlercodes übersetzt. Timeout und Abort-Signale werden getrennt verarbeitet, sodass transiente Verzögerungen nicht das Abbrechen einer User-Aktion verschleiern.
* **Seiteneffekte:** CSP-Regeln erlauben den reibungslosen Ablauf des TCP-Servers in Tauri und werden durch das CSP-Gate permanent getestet.
* **Was könnte brechen:** Strukturelle Modifikationen bei Yahoo Finance (API-Wechsel). Diese werden jedoch durch die v8-Chart und v7-Quote Fallbacks minimiert.

### 2. Findings

* **G5-01 (Kanalerreichbarkeit & CORS):** In Tauri wird der Proxy als lokaler TCP-Server gestartet. Wenn ein anderer Prozess den TCP-Port belegt oder die CSP-Regeln (Content Security Policy) blockieren, kommt es zum Ausfall des Proxys. Das CSP-Gate in `tauri-csp.test.mjs` validiert die Regeln jedoch permanent.
  * *Entscheidung:* Akzeptiert, da CSP-Tests vorhanden.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Yahoo Finance ändert die V8-Chart-API oder blockiert IP-Adressbereiche. Da der Proxy fail-closed arbeitet, meldet die App `PROVIDER_UNAVAILABLE` und verweigert die Aktualisierung. Der Nutzer muss den Kurswert manuell im Tranchenmanager eintragen.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Künftige API-Modifikationen durch Yahoo Finance.
  * Port-Kollisionen bei lokalen TCP-Servern in Tauri.

## Review-Feedback von Claude

Ausstehend: JS-/Rust-Vertragsparität, Abort-/Race-Verhalten und CSP-Grenzen.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
