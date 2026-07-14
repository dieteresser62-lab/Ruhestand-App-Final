# Slice Tranchenmanagement 04: CRUD, UX und Accessibility

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
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
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

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

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Native Dialog- und manuelle Fokussteuerung können je nach Browser abweichen.
- Eine mobile Kartenansicht statt Tabellen-Scroll wäre ein größerer Scope und benötigt Review.
- Bestehende gespeicherte Datensätze können Werte enthalten, die der neue UI-Vertrag nicht mehr erzeugen würde.

## Rückdokumentation

- Tatsächliche Validierungsregeln und Accessibility-Entscheidungen in Hauptplan und GAP-Analyse eintragen.
- Nutzerworkflow und Screenshots erst nach Umsetzung in Slice 09 synchronisieren.

## Freigabestatus

Nicht freigegeben. UX-, Accessibility- und Regression-Review ausstehend.

## Review-Feedback von Gemini

Ausstehend: adversarial Input, Tastatur-/Fokuspfade, mobile Bruchstellen und Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: DOM-Lifecycle, Validierungsvertrag, Semantik und Browserkompatibilität.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
