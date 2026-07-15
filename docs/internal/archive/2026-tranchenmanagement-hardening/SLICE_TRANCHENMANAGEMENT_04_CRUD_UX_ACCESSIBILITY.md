# Slice Tranchenmanagement 04: CRUD, UX und Accessibility

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
**Abhängigkeit:** Slice 03 abgeschlossen und freigegeben
**GAPs:** TM-18, TM-20

## Ziel

Der Tranchenmanager wird zu einer robusten, tastaturbedienbaren CRUD-Oberfläche. Eingaben werden vor jeder Zustandsänderung gegen den kanonischen Vertrag validiert, Statusmeldungen sind eindeutig und die Tabelle bleibt auch auf schmalen Viewports innerhalb ihres Containers bedienbar.

## Verbindliche Nutzerentscheidung und technische Planfestlegungen

- O-01: Die UI bietet ausschließlich die festgelegten Kategorie-/Typ-Kombinationen an.
- Gold und sonstige Nicht-Wertpapier-Tranchen folgen dem kanonischen Vertrag aus Slice 02.
- `shares = 0` ist bei marktpreisbasierter Bewertung kein gültiger speicherbarer Bestand; eine abweichende fachliche Notwendigkeit löst die Stop-Regel aus.

## Akzeptanzkriterien

- Anlegen und Bearbeiten akzeptieren nur endliche, fachlich gültige Zahlen; negative Stückzahlen, Preise, Werte und Einstandskosten werden abgewiesen.
- Kategorie und Typ können keine widersprüchliche Klassifikation erzeugen; die UI bietet nur vom kanonischen Vertrag erlaubte Kombinationen an.
- Ein strukturierter Engine-Validierungsfehler beendet den Vorgang kontrolliert und erscheint als blockierender, zugänglicher Hinweis mit Tranche-/Feldbezug; kein stiller Absturz oder Empty-Fallback.
- `trancheId` bleibt beim Editieren stabil; neue IDs sind kollisionssicher und Duplikate werden vor dem Persistieren abgewiesen.
- Löschen und vollständiger Reset verlangen eine eindeutige Bestätigung und zeigen Persistenzfehler gemäß Slice 03 an.
- Profilwerte werden nur nach vollständig gültiger Eingabe übernommen; schnelle Eingaben erzeugen keinen Zwischenstand mit `NaN` oder Teilwerten.
- Gold wird als Gold, nicht als Geldmarkt, bezeichnet; Kategorie und Typ sind im Tabellenkontext nachvollziehbar.
- Negative Renditen werden mit genau einem Minuszeichen dargestellt; es entstehen keine Anzeigen wie `+-1,2 %`.
- Der leere Zustand meldet nicht „FIFO aktiv“, wenn keine Tranchen geladen sind.
- Der Editor hat `role="dialog"`, `aria-modal="true"`, einen zugänglichen Namen, initialen Fokus, Fokusfalle, Escape-Schließen und Fokus-Rückgabe an den Auslöser.
- Icon-Aktionen besitzen zugängliche Namen; Fehler und Save-Status werden über eine geeignete Live-Region angekündigt.
- Bei 390 CSS-Pixeln verursacht der Tranchenbereich keinen horizontalen Overflow des Dokuments; eine erforderliche Tabellenbewegung bleibt im gekennzeichneten Tabellencontainer.
- Zurücknavigation und sichtbare Profilkennung stimmen mit dem tatsächlich geladenen Profil überein.

## Scope

- Modalvalidierung und zugänglicher Dialog-Lifecycle.
- Renderersemantik, Status- und Leerzustände.
- Responsive Tabellenhülle und Manager-Navigation.
- Validierte Übernahme profilnaher Assetwerte.
- Browserbasierte Tastatur-, Fokus- und Mobile-Regressionen.

## Nicht-Scope

- Keine Änderung der Verkaufs- oder Steuermethodik.
- Keine Kurswährungslogik; Slice 05.
- Keine neue Design-System-Abhängigkeit.
- Kein Persistenz-Recovery außerhalb des in Slice 03 definierten Vertrags.

## Geplante Programmdateien

Maximal zehn:

- `depot-tranchen-manager.html`
- `app/tranches/tranchen-manager-modal.js`
- `app/tranches/tranchen-manager-renderer.js`
- `app/tranches/tranchen-manager-page.js`
- `app/profile/profile-asset-values.js`
- `tests/tranchen-manager-modal.test.mjs`
- `tests/tranchen-manager-renderer.test.mjs`
- `tests/tranchen-manager-page.test.mjs`
- `tests/profile-asset-values.test.mjs`
- `tests/browser-smoke.test.mjs`

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

Die unversionierten Playwright-Pakete waren vor Slice-Beginn vorhanden, liegen
außerhalb des Slice-Scopes und bleiben unangetastet. Slice 03 ist in seiner
Slice-Datei freigegeben und als Commit `13328fa` vorhanden.

Geplante Dateien:

- die zehn oben genannten Programmdateien sowie Slice-/Plan-MD.

Voraussichtliche Änderungstiefe:

- mittel; UI-Zustand, Validierung, Fokus und responsive Darstellung.

Gefährdete bestehende Tests:

- Manager-Modal/-Renderer/-Page,
- Profilwert-Synchronisation,
- Browser-Smokes aller Einstiegspunkte durch globale Styles oder Fokusänderungen.

Nicht anfassen:

- `engine/`, Verkaufsreihenfolge und Steuerberechnung,
- Persistenzformate,
- globale CSS-Regeln ohne nachgewiesenen Bedarf,
- `engine.js`, `dist/`, Release-Artefakte.

Rollback-Strategie:

- auf den freigegebenen Slice-03-Commit zurück; Modal-, Renderer- und HTML-Anpassungen nur gemeinsam zurücknehmen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/tranchen-manager-modal.test.mjs
node tests/run-single.mjs tests/tranchen-manager-renderer.test.mjs
node tests/run-single.mjs tests/tranchen-manager-page.test.mjs
node tests/run-single.mjs tests/profile-asset-values.test.mjs
npm test
npm run test:browser
```

Pflichtfälle: ungültige und sehr große Zahlen, Kategorie-/Typ-Konflikt, Duplikat-ID, Save-Rejection, Fokus vor/nach Dialog, Escape, reine Tastaturbedienung, 390-Pixel-Viewport, Gold- und Negativrenditeanzeige.

## Ergebnisse

- CRUD-Eingaben laufen vor jeder Mutation durch den kanonischen Tranche-Contract.
  Strukturierte Fehler erscheinen blockierend mit Fehlercode, Feld und vorhandener
  Tranche-ID; das zuerst betroffene Feld erhält Fokus und `aria-invalid`.
- Neue IDs werden gegen den aktuellen Profilbestand geprüft und bei Kollision neu
  erzeugt. Beim Editieren wird ausschließlich die vorhandene `trancheId` verwendet;
  die Collection-Validierung blockiert Duplikate weiterhin vor dem Storage-Write.
- Profilnahe Assetwerte werden streng auf vollständige, endliche Werte und die
  vorhandenen Wertebereiche geprüft. Eingaben werden 300 ms entprellt; ein während
  eines langsamen Flushs eintreffender neuer Wert wird seriell nachgespeichert.
- Der Browser-Smoke belegt Add/Edit/Delete, stabile ID, kontrollierten Negativfall,
  Fokusfalle, Escape/Fokus-Rückgabe, zugängliche Aktionen und 390-CSS-Pixel ohne
  Dokument-Overflow. Die breite Tabelle scrollt ausschließlich in `.table-scroll`.

## Durchgeführte Änderungen

- `tranchen-manager-modal.js` verwaltet die kanonische Kategorie-/Typ-Auswahl,
  kollisionsfreie ID-Erzeugung, strukturierte Fehlermeldungen sowie initialen Fokus,
  Fokusfalle, Escape und Fokus-Rückgabe.
- `tranchen-manager-page.js` fängt Contractfehler kontrolliert ab, hält Edit-IDs
  stabil, bestätigt Löschungen mit Tranchennamen, serialisiert Profilwert-Commits
  und synchronisiert Rücklink und sichtbare Profil-ID.
- `profile-asset-values.js` trennt weiterhin tolerantes Legacy-Laden von der neuen
  strikten UI-/Save-Validierung; negative, leere, nicht endliche und außerhalb der
  bestehenden Bereiche liegende Werte mutieren den Speicher nicht.
- Renderer und HTML unterscheiden Kategorie und Typ, zeigen Gold als Gold, formatieren
  negative Renditen ohne `+-`, benennen Icon-Aktionen, ergänzen Live-Regionen und
  kapseln die Tabelle responsiv. Das Modal trägt Dialogrolle, Modalstatus und Namen.
- Die fünf geplanten Tests decken die neuen Unit-, DOM-, Persistenz-Race-, Tastatur-
  und Browserverträge ab.

## Ausgeführte Tests

- `node tests/run-single.mjs tests/tranchen-manager-modal.test.mjs`: 27/27 Assertions,
  0 Fehler.
- `node tests/run-single.mjs tests/tranchen-manager-renderer.test.mjs`: 15/15
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/tranchen-manager-page.test.mjs`: 44/44 Assertions,
  0 Fehler.
- `node tests/run-single.mjs tests/profile-asset-values.test.mjs`: 24/24 Assertions,
  0 Fehler.
- `npm test`: 104 Testdateien, 4117/4117 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:browser`: elf von elf Browser-Smoke-Szenarien grün.
- In-App-Browser-Gegenprüfung: Dialogrolle/Modalstatus, initialer Fokus und
  Escape-Fokus-Rückgabe bestätigt; mobile Dokumentbreite 375 px bei 375 px
  nutzbarer Breite sowie konsistente Profil-ID `default` in Anzeige und Rücklink.
- `git diff --check`: grün.

## Abweichungen vom Plan

- Keine Scope- oder Dateizahlabweichung: exakt die zehn geplanten Programmdateien
  wurden geändert.
- Ein erster Browserlauf las den bestätigten Managerwert testseitig fälschlich aus
  `localStorage`; der produktive Browseradapter verwendet IndexedDB. Der Smoke wurde
  auf die reale `kv`-Quelle korrigiert und ist im finalen Lauf grün.
- Die geplante mobile Tabellenbewegung wurde wie vorgesehen als gekennzeichneter
  Scrollcontainer umgesetzt; eine Kartenansicht war nicht erforderlich.

## Offene Risiken

- Native Dialog- und manuelle Fokussteuerung können je nach Browser abweichen.
- Bestehende gespeicherte Datensätze können Werte enthalten, die der neue UI-Vertrag nicht mehr erzeugen würde.
- Das Browser-Gate verwendet Chromium; das manuelle Fokusverhalten anderer Browser
  bleibt bis zum adversarialen Review ein Restrisiko.

## Rückdokumentation

- Tatsächliche Validierungsregeln und Accessibility-Entscheidungen sind in Hauptplan
  und GAP-Analyse eingetragen.
- Nutzerworkflow und Screenshots erst nach Umsetzung in Slice 09 synchronisieren.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien wurden vollständig und fehlerfrei erfüllt. Der Tranchenmanager fängt Formularfehler ab, zeigt blockierende Hinweise und fokussiert das erste fehlerhafte Feld. Die mobile Responsive-Breite wurde über Scrollcontainer korrekt gelöst.
* **Vertragstreue:** Die Schnittstelle hält sich strikt an die JSDoc-Typen aus Slice 02/03.
* **Fehlerbehandlung:** Robuste Validierung an allen Frontend-Grenzen. Fehlerhafte Eingaben bei den Profilwerten (z. B. negative Werte) mutieren den Speicher nicht mehr und zeigen verständliche Fehler.
* **Seiteneffekte:** Das Autosave-Debounce (300ms) verhindert unnötige IDB-Lese-Schreib-Zyklen und reiht in-flight-Flushes sauber aneinander.
* **Was könnte brechen:** Die Tastatur-Fokusfalle arbeitet mit vordefinierten Selektoren. Sollten künftig Custom Elements im Formular genutzt werden, könnten diese die Fokusfalle umgehen.

### 2. Findings

* **G4-01 (Tastatur-Fokus-Trap & Custom Elements):** Die Fokusfalle verwendet eine feste Liste von Selektoren (`button`, `input`, `select`, etc.). Wenn künftig andere interaktive Elemente (z. B. Web Components) im Formular genutzt werden, werden sie von `getFocusableElements` ignoriert.
  * *Entscheidung:* Akzeptiertes Restrisiko, da das Formular derzeit nur aus nativen HTML5-Elementen besteht.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Race-Condition-Fehler bei extrem schneller Tastatureingabe in den Profil-Feldern und gleichzeitigem Klick auf den Manager-Link, bevor der Debounce-Timer abläuft. Zwar bereinigt `resetRuntimeState` den Timer bei der Initialisierung des Managers, aber Timing-Differenzen bei asynchroner Profil-ID-Umschaltung bleiben das primäre Restrisiko im Multi-Tab-Betrieb.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Abhängigkeit der Fokusfalle von statischen CSS-Selektoren.
  * Race-Condition-Risiken bei extrem schnellen parallelen Eingaben und asynchronen Profil-ID-Umschaltungen.

## Review-Feedback von Claude

Ausstehend: DOM-Lifecycle, Validierungsvertrag, Semantik und Browserkompatibilität.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
