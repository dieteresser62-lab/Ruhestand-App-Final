# Slice Test Coverage 08: Tranchenmanager, Profil-UI und Preisservice

**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** nicht veroeffentlicht in diesem Slice  
**Status:** umgesetzt und freigegeben


## Ziel

Nicht geladene Profil- und Tranchenmodule sowie der Live-Preisservice werden mit kontrollierten Contract-Tests abgesichert. Der Slice prueft Storage-Zustaende, degradierende Preisservice-Fehlerpfade, Profil-Handoff-Lifecycle und Profilverbund-UI-Vertraege ohne echte Netzwerkaufrufe.

## Akzeptanzkriterien

- Tranchenmanager-Seite initialisiert mit leerem, gueltigem und korruptem Storage.
- Preisservice wird mit Fake-Fetch getestet: Erfolg, Timeout, HTTP-Fehler, unvollstaendige Antwort.
- Dauerhaft offlineer Preisservice blockiert die UI nicht; vorhandene lokale Daten bleiben nutzbar und es gibt einen sichtbaren degradierenden Status.
- Profil-Bridge behandelt fehlende Profile und Handoff-Daten kontrolliert.
- Profilverbund-UI rendert keine doppelt gezaehlten Assets.
- Keine echten Netzwerkaufrufe in `npm test`.

## Scope

- Neue Contract-Tests fuer Tranchenmanager-Seite, Preisservice und Profil-UI.
- Rueckdokumentation im uebergeordneten Testabdeckungsplan.

## Nicht-Scope

- Keine Aenderung an Engine-Semantik oder Rechenmodellen.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.
- Keine echten Live-Daten- oder Netzwerkaufrufe.
- Keine Aenderung an Preisservice-Retry- oder Timeout-Semantik.

## Git-Status vor Start

Branch:

```text
codex/test-coverage-expansion
```

Status:

```text
 M node_modules/.package-lock.json
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Die `node_modules`-Aenderungen stammen aus dem Playwright-Setup und werden in diesem Slice nicht angefasst.

## Diff-Risiko-Block

Geplante Dateien:

- `tests/tranchen-manager-page.test.mjs`
- `tests/tranchen-price-service.test.mjs`
- `tests/profile-ui-contract.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_08_TRANCHES_PROFILE_PRICE_SERVICE.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- `tests/tranchen-manager-state.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/profile-navigation.test.mjs`
- `tests/browser-smoke.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- lokale `node_modules`-Artefakte
- fachliche Engine- oder Preisservice-Semantik

Rollback-Strategie:

- `git checkout -- docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- Neue Dateien `tests/tranchen-manager-page.test.mjs`, `tests/tranchen-price-service.test.mjs`, `tests/profile-ui-contract.test.mjs` und diese Slice-Datei nur nach Freigabe entfernen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\tranchen-manager-state.test.mjs
node tests\run-single.mjs tests\tranchen-manager-page.test.mjs
node tests\run-single.mjs tests\tranchen-price-service.test.mjs
node tests\run-single.mjs tests\profile-ui-contract.test.mjs
npm test
```

## Durchgefuehrte Änderungen

- `tests/tranchen-manager-page.test.mjs` angelegt:
  - laeuft nur bei direktem Aufruf oder via `tests/run-single.mjs`, damit der DOM-nahe Test nicht im gemeinsamen `npm test`-Prozess ausgefuehrt wird,
  - initialisiert die Tranchenmanager-Seite mit leerem Storage,
  - initialisiert mit gueltigem Tranchen- und Profilwert-Storage,
  - prueft einen dauerhaft offlineen Preisupdate-Pfad mit Fake-Fetch, sichtbarem Fehlerstatus und unveraenderten lokalen Kursdaten,
  - initialisiert mit korruptem `depot_tranchen`-JSON und normalisiert auf den Empty-State.
- `tests/tranchen-price-service.test.mjs` angelegt:
  - prueft `fetchProxyPrice()` fuer Erfolg, HTTP-Fehler, unvollstaendige Antwort und Timeout/Abort,
  - prueft `fetchProxySymbol()` fuer exakten Symboltreffer und Name-Hint-Aufloesung,
  - prueft `checkProxyHealth()` mit sichtbarem degradierendem Status bei Offline-Fehlern,
  - nutzt ausschliesslich Fake-Fetch und keine echten Netzwerkaufrufe.
- `tests/profile-ui-contract.test.mjs` angelegt:
  - prueft Profilverbund-Selector und Toggle-Zielbereiche,
  - prueft, dass Profilverbund-Summaries detaillierte Tranchen gegen aggregierte Fallback-Felder nicht doppelt zaehlen,
  - prueft kontrollierte Profilmanager-Fehlermeldung beim Wechsel auf ein fehlendes Profil,
  - prueft, dass `profile-bridge.js` ungueltige Handoff-Daten toleriert und Lifecycle-Hooks installiert.
- Keine Produktionsdateien geaendert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\tranchen-manager-state.test.mjs
```

Ergebnis: erfolgreich.

- 6 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\tranchen-manager-page.test.mjs
```

Ergebnis: erfolgreich.

- 10 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

Hinweis: Der Test provoziert einen erwarteten `console.warn` fuer einen fehlgeschlagenen Yahoo-Lookup im Offline-Pfad.

```powershell
node tests\run-single.mjs tests\tranchen-price-service.test.mjs
```

Ergebnis: erfolgreich.

- 9 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\profile-ui-contract.test.mjs
```

Ergebnis: erfolgreich.

- 14 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

Hinweis: Der Test provoziert einen erwarteten `console.error` fuer ungueltige `window.name`-Handoff-Daten.

```powershell
npm test
```

Ergebnis: erfolgreich.

- 89 Testdateien gefunden.
- 2237 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

Bestehende Warnungen aus der Suite bleiben unveraendert sichtbar, insbesondere ``--localstorage-file` was provided without a valid path`, CAPE-Fallback-Logs und ein erwarteter Validierungslog fuer `goGoMultiplier`.

## Abweichungen vom Plan

- `tests/tranchen-manager-state.test.mjs` wurde nicht erweitert, weil die Storage-Zustaende leer/gueltig/korrupt im neuen Seiten-Contract-Test abgedeckt werden. Der bestehende State-Test bleibt als Pflicht-Gate unveraendert gruen.
- Der Profilverbund-Doppelzaehlungs-Contract wird im neuen `profile-ui-contract` ueber die Summary-Helfer abgesichert, weil die UI selbst diese vorbereiteten Werte rendert und keine eigene Asset-Arithmetik halten soll.

## Offene Risiken

- DOM-Mocks pruefen Contracts, aber keine echten Layout- oder Browser-Rendering-Details.
- Preisservice-Tests verwenden kontrollierte Fake-Antworten und pruefen bewusst nicht aktuelle Anbieterformate.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` dokumentiert Slice 8 als umgesetzt und listet die neuen Contract-Tests inklusive Validierungsergebnissen.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Initialisierung der Tranchenseite:** In `tests/tranchen-manager-page.test.mjs` wird die korrekte Initialisierung bei leerem, validem und korruptem Storage erfolgreich getestet. Die automatische Fehler-Korrektur und Normalisierung von fehlerhaftem JSON (`{bad json` -> `[]`) wird solide abgesichert.
- **Preisservice-Fehlerpfade:** `tests/tranchen-price-service.test.mjs` prüft die Reaktion des Proxy-Clients auf Erfolg, HTTP-Fehler (502), unvollständige Antworten (fehlendes price-Feld) und Timeout-Verhalten (Abort-Signale).
- **Offline-Degradierung:** Der Test verifiziert, dass ein fehlschlagendes Preis-Update die bestehenden lokalen Kursdaten nicht überschreibt und einen sichtbaren Warnhinweis in der UI hinterlässt.
- **Doppelzählungsschutz:** Der `profile-ui-contract.test.mjs` validiert den Schutz vor Doppelzählung im Profilverbund. Wenn Tranchen definiert sind, werden deren detaillierten Werte verwendet und die groben aggregierten Portfoliofelder des Profils ignoriert (100 Depot-Alt + 50 Depot-Neu + 20 Gold + 30 Geldmarkt + 10 Tagesgeld = 210 € Gesamtvermögen, statt der aggregierten Fallbacks).
- **Handoff-Daten und Hooks:** Es wird geprüft, ob `profile-bridge.js` ungültige Handoff-Daten im `window.name` ohne Absturz verarbeitet und die Persistenz-Hooks und BFCache-Refresh-Handler ordnungsgemäß registriert.

#### Vertragstreue
- **Prozess-Isolation:** Die beiden DOM-nahen Testdateien (`tranchen-manager-page.test.mjs` und `profile-ui-contract.test.mjs`) nutzen den `shouldRun()`-Guard. Sie werden im geteilten standardmäßigen `npm test`-Prozess nicht ausgeführt, um globale Verschmutzung zu vermeiden.
- **Price-Service-Test:** Da `tranchen-price-service.test.mjs` keine DOM-Abhängigkeiten besitzt, läuft es vertragsgemäß in der Hauptsuite mit (erhöht die Assertion-Zahl um 9). Seine geänderten globalen Mocks werden nach Testende sauber aufgeräumt.

#### Fehlerbehandlung
- **Strikte Mock-Bereinigung:** Alle temporär geänderten globalen Variablen (`fetch`, `performance`, `setTimeout`, `confirm`, `URL`, `Blob` etc.) werden in `finally`-Blöcken auf ihre ursprünglichen Werte zurückgesetzt.
- **Abfangen von Parserfehlern:** Parserfehler beim Storage-Laden oder Handoff-Import führen zu kontrollierten UI-Meldungen statt Anwendungsabstürzen.

#### Seiteneffekte
- **Keine Auswirkung auf Standard-Unit-Tests:** Die Standard-Suite läuft ungestört und ohne Assertion-Verluste durch.

#### Was könnte brechen?
- **Layout- und Stylesheet-Änderungen (Risiko):** Da DOM-Mocks keine echte CSS- oder Rendering-Engine besitzen, können visuelle Brüche (z. B. fehlerhafte CSS-Flex-Layouts) nur über Playwright-Smokes aus Slice 4 abgefangen werden.

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S8-01 | RISIKO | Hoher Pflegeaufwand für das benutzerdefinierte DOM-Mock bei zukünftigen UI-Erweiterungen. | Als Restrisiko akzeptiert. | Keine Änderung. |
| G-S8-02 | HINWEIS | Service verlässt sich auf eine moderne Laufzeitumgebung mit nativer `fetch`-Unterstützung. | Als Hinweis dokumentiert. | Keine Änderung. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Wartungsaufwand für Mock-Klassen bei Erweiterungen im Tranchen- oder Profil-Frontend.
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Yahoo Finance ändert das Antwortformat der JSON-API so, dass das `price`-Feld umbenannt wird (z. B. in `regularMarketPrice`). Der Offline-Fake-Fetch im Test meldet weiterhin Erfolg mit dem alten Format. In Produktion schlägt der Abruf fehl, und das UI wechselt dauerhaft in den fehlerhaften Zustand, da der API-Contract-Test nur das Mock-Szenario abdeckt und keine echten Live-Abrufe validiert.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S8-01 | Gemini | Wartungsaufwand für DOM-Mocks | Restrisiko akzeptiert | Keine |
| G-S8-02 | Gemini | Native `fetch`-Abhängigkeit des Preisservice | Hinweis dokumentiert | Keine |

