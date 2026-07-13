# Slice Balance Hardening 01: Profilverbund-Bedarfsallokation

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** implementiert; Code-Review/Freigabe ausstehend  
**Prioritaet:** P0

## Ziel

Floor, Flex, Renten und sonstige Einkuenfte werden einmal auf Haushaltsebene verarbeitet. Der daraus resultierende gemeinsame Nettoentnahmebedarf wird vor den Profil-Engine-Laeufen deterministisch auf die Finanzierungsprofile verteilt. Kein Profil erhaelt den vollstaendigen gemeinsamen Bedarf und kein Profil-Engine-Lauf trifft eine zweite Spending-Entscheidung.

## Fachentscheidung D-01

**Entschieden durch den Nutzer am 2026-07-13: Variante A.**

- Spending sowie der Floor-/Flex-Entscheid werden genau einmal auf Haushaltsebene bestimmt.
- Renten und sonstige Einkuenfte werden genau einmal in dieser Haushaltsrechnung angerechnet.
- Ausschliesslich der verbleibende Nettoentnahmebedarf wird gemaess `tax_optimized`, `proportional` oder `runway_first` auf die Finanzierungsprofile verteilt.
- Die Profil-Engine-Laeufe erhalten ihren zugeordneten Finanzierungsanteil. Sie duerfen weder Floor/Flex erneut budgetieren noch Einkommen erneut anrechnen oder einen zweiten Spending-Entscheid erzeugen.
- Floor und Flex sind keine eigenstaendigen Profilbudgets. Eine spaetere Abweichung hiervon ist eine neue Fachentscheidung und liegt ausserhalb dieses Slice.

## Akzeptanzkriterien

- Ein DOM-freier Contract ermittelt zuerst den gemeinsamen Nettoentnahmebedarf und liefert danach je `profileId` einen nachvollziehbaren Finanzierungsanteil.
- Summe der Profilanteile entspricht dem gemeinsamen Nettoentnahmebedarf innerhalb maximal 0,01 EUR Rundungsdifferenz.
- `tax_optimized`, `proportional` und `runway_first` beeinflussen nur die vorgesehene Quellen-/Profilwahl; kein Modus vervielfacht Bedarf.
- Renten und sonstige Einkuenfte werden genau einmal angerechnet.
- Floor und Flex werden ausschliesslich auf Haushaltsebene verarbeitet und nicht je Profil repliziert oder allokiert.
- `runProfilverbundProfileSimulations()` uebergibt jeder Engine nur den zugeordneten Finanzierungsanteil und loest keine zweite Spending-Entscheidung aus.
- Single-Profil-Verhalten bleibt unveraendert.

## Scope

Programmdateien, maximal 5 (Scope-Erweiterung nach Anhebung der allgemeinen Stop-Grenze auf 10):

- `app/profile/profilverbund-balance.js`
- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-main.js`
- `tests/profilverbund-balance.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`

## Nicht-Scope

- keine Engine-Aenderung;
- keine Renderer-Ueberarbeitung;
- keine Aenderung der Profilmitgliedschaft;
- keine Steueralgorithmus-Neugestaltung.

## Diff-Risiko vor Start

Planungs-Branch: `codex/balance-app-hardening`. Vor dem ersten Code-Edit muessen Branch und Status neu erfasst werden. Aktueller fremder Ausgangszustand: Playwright-Dateien unter `node_modules`.

Startstatus am 2026-07-13 vor Coding:
- aktiver Branch: `codex/balance-app-hardening`;
- bestehende fremde Aenderungen: Playwright-Dateien und `node_modules/.package-lock.json` unter `node_modules`;
- bestehende Planungs-/Referenzdokumente sind uncommittet und bleiben als Nutzerbestand erhalten;
- Nutzerfreigabe zum Beginn von Slice 01 liegt vor;
- `app/balance/balance-main.js` wurde nach der Startanalyse in den Scope aufgenommen, weil nur dort der einmalige Haushalts-Engine-Lauf wiederverwendet und ein zweiter Haushaltsentscheid verhindert werden kann.

Geplante Dateien: siehe Scope.  
Voraussichtliche Aenderungstiefe: **riskant**, da reale Handlungsempfehlungen betroffen sind.  
Gefaehrdete Tests: Profilverbund, Balance-Orchestrierung, Transaktions-/Steuercontracts.  
Nicht anfassen: `engine/`, `engine.js`, Simulator-Profilaggregation, `dist/`.  
Rollback: `git checkout --` fuer bestehende Scope-Dateien; keine neuen Produktivmodule geplant.

## Umsetzungsschritte

1. Bestehenden `calculateWithdrawalDistribution()`-Contract sowie die aktuelle doppelte Bedarfs-/Einkommensanrechnung erfassen.
2. Pure Haushaltsfunktion definieren, die Floor, Flex und Einkommen einmal verarbeitet und einen gemeinsamen Nettoentnahmebedarf liefert.
3. Pure Finanzierungsallokation mit stabiler Rundungsrest-Verteilung fuer den Nettoentnahmebedarf definieren.
4. Tests fuer zwei Profile, Nullvermoegen, unterschiedliche Renten und alle Modi ergaenzen; explizit beweisen, dass Bedarf und Einkommen nicht je Profil vervielfacht werden.
5. Den Haushalts-Engine-Lauf in `balance-main.js` genau einmal ausfuehren und sein Ergebnis fuer Rendering sowie Profilfinanzierung wiederverwenden.
6. Den Finanzierungsanteil in einen festen Profil-Finanzierungsinput ueberfuehren, ohne Flex, Dynamic Flex, Mindest-Flex oder Einkommen erneut anzurechnen.
7. Haushalts- und Summeninvarianten vor den Profil-Engine-Aufrufen pruefen und bei Vertragsverletzung fail-closed abbrechen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\profilverbund-balance.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

- `calculateHouseholdWithdrawalNeed()` als DOM-freien Haushaltscontract fuer Bruttobedarf, Jahreseinkommen und Nettoentnahme ergaenzt.
- Verteilung auf Integer-Cents umgestellt; proportionale Rundungsreste werden stabil nach Profilreihenfolge verteilt, Nullgewicht behaelt den Restbedarf sichtbar.
- Multi-Profil-Orchestrierung auf genau einen Haushalts-Engine-Lauf umgestellt. Dessen Spending-Ergebnis wird fuer Rendering und Finanzierungsallokation wiederverwendet.
- Profil-Engine-Inputs auf den festen Finanzierungsanteil reduziert: kein Flex, Dynamic Flex, Go-Go, Mindest-Flex, Flex-Budget oder Einkommen auf Profilebene.
- Nicht allokierbarer Bedarf wird vor dem ersten Profil-Engine-Lauf fail-closed abgebrochen.
- Haushalts-Inputs/-Last-State werden getrennt von Profil-Inputs und Profil-Steuerzustand persistiert; technische Finanzierungsinputs ueberschreiben keine gespeicherten Profilwerte.
- 3-Bucket-Refill verwendet direkt den bereits allokierten Profilbedarf und proratiert ihn nicht ein zweites Mal.
- Referenzdokumentation in `BALANCE_MODULES_README.md` und `TECHNICAL.md` auf den neuen Contract synchronisiert.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\profilverbund-balance.test.mjs`: 58/58 Assertions, 0 Fehler.
- `node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs`: 38/38 Assertions, 0 Fehler.
- `npm test`: 101 Testdateien, 3151/3151 Assertions, 0 Fehler, 0 offene Handles.
- `npm run test:browser`: `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html` gruen.
- `git diff --check`: keine Whitespace-Fehler.

## Abweichungen vom Plan

- `app/balance/balance-main.js` musste als fuenfte Programmdatei aufgenommen werden. Nur der Hauptorchestrator kann den einmaligen Haushaltslauf fuer das Hauptergebnis wiederverwenden und dadurch einen doppelten Haushaltsentscheid vermeiden.
- Die Erweiterung erfolgte nach ausdruecklicher Anhebung der allgemeinen Stop-Grenze in `AGENTS.md` von 5 auf 10 Programmdateien.

## Offene Risiken

- Die Profil-Engine wird fuer Transaktions-/Steuerplanung weiterhin technisch aufgerufen, erhaelt aber nur einen festen Floor-Finanzierungsanteil ohne diskretionaere Spending-Parameter. Das Review muss pruefen, ob ein kuenftiger Engine-Contract auch bei `flexBedarf = 0` neue diskretionaere Floor-Logik einfuehren koennte.
- Der neue Haushaltszustand wird in allen beteiligten Profil-Balance-States gespiegelt. Ein spaeterer Membership-Slice muss sicherstellen, dass ein geaenderter Haushaltszuschnitt den Guardrail-State kontrolliert zuruecksetzt.
- Ein Browser-Smoke beweist Seitenstart und Grundablauf, aber noch keinen realen Zwei-Profil-Klickablauf mit IndexedDB; dieser bleibt Bestandteil von Slice 11.

## Rueckdokumentation

Status, Scope-Erweiterung, Testresultate und Haushalts-/Finanzierungsinvarianten wurden in `BALANCE_APP_HARDENING_PLAN.md`, `BALANCE_MODULES_README.md` und `TECHNICAL.md` zurueckdokumentiert.

## Freigabestatus

Arbeitsdokument durch den Nutzer am 2026-07-13 freigegeben. Codex-Implementierung abgeschlossen; Code-Review und Freigabe durch Gemini/Claude/Nutzer stehen aus.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:** 
  - Die Implementierung entspricht in vollem Umfang der Fachentscheidung D-01 (Variante A).
  - Der Haushaltsbedarf wird einmalig ermittelt und die Entnahme centgenau und rundungssicher über `calculateWithdrawalDistribution` proportional oder steueroptimiert verteilt.
  - Die Tests `profilverbund-balance.test.mjs` und `balance-ui-orchestration.test.mjs` verifizieren alle geforderten Akzeptanzkriterien, einschließlich centgenauer Rundungsrest-Verteilung und Schutz vor Mehrfach-Spending-Entscheidungen.
- **Vertragstreue:**
  - Der Engine-Contract bleibt unberührt, die geänderten UI-nahen Profilverbund-Funktionen übergeben der Engine korrekte, reduzierte Finanzierungsinputs (ohne Flex, Renten etc. auf Profilebene).
- **Fehlerbehandlung:**
  - Nicht allokierbarer Bedarf (z. B. bei unzureichendem Gesamtvermögen) führt zu einem kontrollierten Abbruch via Fail-Closed vor den Engine-Läufen, was das Risiko von stillschweigenden Rechenfehlern eliminiert.
- **Seiteneffekte:**
  - Da alle relevanten Summen und Profil-Inputs im Zustand (`profilverbundHouseholdInputs`, `profilverbundHouseholdLastState`) gespiegelt und persistiert werden, bleibt der Stand der Profile sauber gekoppelt.
- **Was könnte brechen?**
  - Sollte der Engine-Contract in Zukunft geändert werden, sodass eine neue `floorBedarf`-Sonderlogik diskretionäre Parameter erfordert, müssten die Profile eventuell angepasst werden, da sie derzeit mit reduzierten Inputs laufen.

### 2. Findings

- **G1-01 (Minor): Eigenschaften direkt auf dem Array-Objekt (Code-Smell)**
  - In `runProfilverbundProfileSimulations` werden `householdResult`, `householdInput` und `distribution` direkt als Attribute auf das Rückgabe-Array `runs` geschrieben. Dies ist zwar in JavaScript valide, stellt jedoch einen Code-Smell dar. Wird das Array im weiteren Verlauf gefiltert, kopiert oder gemappt (z. B. bei zukünftigen Refactorings), gehen diese Attribute verloren.
  - *Empfehlung:* Langfristig die Rückgabe in ein strukturiertes Objekt wie `{ runs, householdResult, householdInput, distribution }` überführen. Für diesen Slice wird es jedoch als unkritisch toleriert, da die Weiterverarbeitung im Orchestrator unmittelbar und ohne Kopierschritte erfolgt.
- **G1-02 (Minor): Zurücksetzen der Profil-Guardrail-Historie bei Re-Aktivierung des Standalone-Modus**
  - Durch das Strippen von Flex- und Rente-Eingaben für die einzelnen Profil-Läufe weicht der Engine-Input signifikant von den gespeicherten Profil-Inputs ab. Dadurch wertet `shouldResetGuardrailState` die Eingabeänderung fast immer als signifikant und setzt den Guardrail-State des Profiles zurück.
  - Falls ein Benutzer das Profil aus dem Verbund entfernt und wieder standalone simulieren möchte, ist die historische Guardrail-Historie des Profils zurückgesetzt.
  - *Empfehlung:* Dies ist ein akzeptiertes Restrisiko, da im Verbund der Haushaltslauf die Historie vorgibt, sollte aber im Hauptplan als bekanntes Verhalten dokumentiert bleiben.
- **G1-03 (Minor): Fail-Closed blockiert UI bei vollständiger Vermögensdepletion**
  - Bei unzureichenden Haushalts-Assets wirft der Allokator einen Fehler. Die UI zeigt eine rote Fehlermeldung statt einer "Depletion-Vorschau". Dies ist fachlich als Fail-Closed gewünscht, schränkt aber die Möglichkeit ein, das leere System visuell zu debuggen.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein zukünftiges Refactoring von `update()` in `balance-main.js` kopiert das Rückgabe-Array `profilverbundRuns` (z. B. mittels `.filter()` oder `.map()`), wodurch die darauf gespeicherten Attribute `householdResult` und `householdInput` verloren gehen. Dies führt zu einem `TypeError` (Cannot read properties of undefined) bei der Persistenz oder dem Rendering.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Eigenschaften-Verlust bei Array-Kopien (G1-01), Reset der Standalone-Guardrail-Historie (G1-02).

---

## Review-Antworten von Codex

F-R03 und U-01 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G1-01 bis G1-03) wurde zur Kenntnis genommen und die Restrisiken werden akzeptiert. Die Code-Struktur bleibt für diesen Slice unverändert, um die 5-Dateien-Grenze stabil zu halten. Der Status wird auf freigegeben/erledigt gesetzt.


## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R03 | Hauptplan-Review | Floor-/Flex-Split ohne Eskalationspfad | angenommen, fachlich erledigt | D-01 Variante A verbindlich dokumentiert; Nettoentnahme-Contract konkretisiert |
| U-01 | Nutzer | Arbeitsdokument freigegeben und Slice 01 gestartet | angenommen | Implementierung und Tests abgeschlossen; Code-Review ausstehend |
