# Slice Profilverbund Action Consistency 01: Household Attribution

**Feature-Branch:** `codex/balance-app-hardening`  
**Branch-Ausnahme:** Der Nutzer hat am 2026-07-14 ausdruecklich angeordnet, fuer diesen P0-Bugfix keinen eigenen Branch anzulegen und im bestehenden Entwicklungsbranch zu arbeiten.  
**GitHub-Status:** kein neuer Bugfix-Branch; kein Push ohne ausdrueckliche Nutzerfreigabe  
**Arbeitsdokument:** `BUGFIX_PROFILVERBUND_ACTION_CONSISTENCY.md`  
**Status:** Implementierung abgeschlossen; Implementierungsreview ausstehend

## Ziel

Die Haushaltsaktion bleibt im Profilverbund die einzige fachliche Entscheidung ueber Spending, Ziel-Liquiditaet und Transaktionszwecke. Die Profilverbundlogik attribuiert diese Aktion auf konkrete Profile und Quellen, ohne eigenstaendige Gegenkaeufe oder Gegenverkaeufe zu erzeugen. Profilsteuern und Verlustvortraege werden anschliessend ausschliesslich aus den tatsaechlich attribuierten Verkaufstranchen berechnet.

## Akzeptanzkriterien

1. Profilaktionen reproduzieren die finalisierte Haushaltsaktion je Zweck innerhalb 0,01 EUR.
2. Die Attribution erzeugt keine gegenlaeufige Transaktion, die im Haushaltsplan nicht enthalten ist.
3. Die Netto-Liquiditaetsaenderung der final gerenderten Aktion stimmt mit `deckungNachher` ueberein.
4. Jede finale Verkaufstranche besitzt genau eine `sourceProfileId` und wird genau einmal steuerlich erfasst.
5. `settleTaxYear()` reconciliert den Steuerzustand je Profil aus dessen final attribuierten Verkaeufen; Profile ohne Verkauf behalten ihren Verlustvortrag.
6. 3-Bucket-Logik und Bond-Wiederauffuellung laufen im Profilverbund genau einmal auf Haushaltsebene.
7. Unterdeckte oder nicht eindeutig attribuierbare Aktionen brechen sichtbar und fail-closed ab.
8. Der Single-Profil-Pfad und die Engine-Semantik bleiben unveraendert.

## Scope

Voraussichtlich maximal sieben Programmdateien:

- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-action-postprocessor.js`
- `app/profile/profilverbund-balance.js`
- optional ein neues DOM-freies Attributionsmodul unter `app/profile/`
- `tests/profilverbund-balance.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-decumulation.test.mjs`

Dokumentation:

- dieses Slice-Dokument;
- `docs/internal/BUGFIX_PROFILVERBUND_ACTION_CONSISTENCY.md`;
- `docs/internal/BALANCE_APP_HARDENING_PLAN.md`;
- bei Contract-Aenderungen `docs/reference/BALANCE_MODULES_README.md` und gegebenenfalls `docs/reference/TECHNICAL.md`.

## Nicht-Scope

- keine Aenderung unter `engine/`;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung der Entnahme-, Dynamic-Flex- oder VPW-Semantik;
- keine Bearbeitung von `dist/`, `RuheStandSuite.exe` oder fremden `node_modules`-Dateien;
- keine realen Profilnamen oder Finanzdaten in Tests und Dokumentation.

## Git- und Diff-Risiko vor Coding

Ausgefuehrt am 2026-07-14:

```text
git branch --show-current
codex/balance-app-hardening

git status --short
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die ungetrackten Playwright-Dateien sind bestehende Fremddateien und bleiben unangetastet.

**Bestaetigter Programmdatei-Scope vor dem ersten Code-Edit (7 Dateien):**

- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-action-postprocessor.js`
- `app/profile/profilverbund-balance.js`
- `app/profile/profilverbund-action-attribution.js` (neu)
- `tests/profilverbund-balance.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-decumulation.test.mjs`

Die Analyse hat bestaetigt, dass profilbezogene Steuerparameter eindeutig als Quote (`0`, `0.08`, `0.09`) vorliegen, vorhandene und synthetische Haushaltstranchen ohne Mutation mit `sourceProfileId` versehen werden koennen und keine Engine-Aenderung erforderlich ist. Keine Stop-Regel greift vor dem Coding.

**Voraussichtliche Aenderungstiefe:** riskant, weil Handlungsanweisungen, Profilsteuern, Verlustvortraege und Liquiditaetsdeckung betroffen sind.  
**Gefaehrdete bestehende Tests:** Profilverbund, Balance-Orchestrierung, Aktions-Postprocessing, Steuerreconciliation, 3-Bucket und Browser-Smoke.  
**Nicht anfassen:** `engine/`, `engine.js`, `dist/`, `RuheStandSuite.exe`, fremde Dateien unter `node_modules/`.  
**Rollback-Strategie:** nur die im final bestaetigten Scope geaenderten getrackten Dateien mit `git checkout -- <dateien>` zuruecksetzen; eine neue Moduldatei nur nach ausdruecklicher Freigabe loeschen. Keine destruktiven Git-Kommandos.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\profilverbund-balance.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
node tests\run-single.mjs tests\balance-decumulation.test.mjs
npm test
npm run test:browser
```

Contract-Faelle:

- Haushalts-Liquiditaetsluecke ohne gegenlaeufigen Profilkauf;
- Haushalts-Liquiditaetsueberschuss ohne gegenlaeufigen Profilverkauf;
- centgenaue Zweck-, Quellen-, Steuer- und Netto-Reconciliation;
- profilbezogene Gewinn-, Verlust- und Nullverkaufs-Settlements;
- genau einmalige 3-Bucket-/Bond-Verarbeitung;
- fail-closed bei fehlender Provenienz oder unzureichenden Quellen;
- unveraendertes Single-Profil-Verhalten.

## Durchgefuehrte Aenderungen

- `app/profile/profilverbund-balance.js`: vorhandene und synthetische Tranchen werden ohne Mutation mit Profilherkunft in einen vollstaendigen Haushaltspool ueberfuehrt; Bonds bleiben explizit klassifiziert.
- `app/profile/profilverbund-action-attribution.js` (neu): fail-closed Attribution der finalen Haushaltsaktion, globale profilsteuer-aware Verkaufsquellenplanung fuer `tax_optimized`, gewichtete Quellenattribution fuer `proportional`/`runway_first`, profilbezogene Steuer-Settlements, Quellen-/Verwendungs-Reconciliation und Liquiditaets-KPI-Abgleich.
- `app/balance/balance-main-profilverbund.js`: genau ein Haushalts-Engine-Lauf, genau eine Haushalts-3-Bucket-/Bond-Verarbeitung, danach reine Profilattribution ohne technische Profil-Engine-Laeufe; getrennte Guardrail-/Steuerpersistenz.
- `app/balance/balance-action-postprocessor.js`: im Profilverbund keine zweite 3-Bucket-Ausfuehrung; Weitergabe der bereits finalisierten Haushaltsaktion und Diagnose.
- `tests/profilverbund-balance.test.mjs`, `tests/balance-ui-orchestration.test.mjs` und `tests/balance-decumulation.test.mjs`: neue Contract-, Integrations- und Regressionsfaelle fuer die acht Akzeptanzkriterien.

## Ausgefuehrte Tests mit Ergebnis

- `node tests/run-single.mjs tests/profilverbund-balance.test.mjs`: **91/91 bestanden**
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`: **123/123 bestanden**
- `node tests/run-single.mjs tests/balance-decumulation.test.mjs`: **41/41 bestanden**
- `npm test`: **103 Testdateien, 3399/3399 bestanden, 0 fehlgeschlagen, 0 offene Handles**
- `npm run test:browser`: **11/11 Browserfaelle bestanden**
- `git diff --check`: **ohne Befund**

## Abweichungen vom Plan

- Auf ausdrueckliche Nutzeranweisung erfolgt die Umsetzung im bestehenden Entwicklungsbranch `codex/balance-app-hardening` statt im urspruenglich geplanten separaten Bugfix-Branch.
- Das optionale DOM-freie Attributionsmodul wurde verwendet. Der bestaetigte Umfang von sieben Programmdateien wurde exakt eingehalten; Engine- und Build-Artefakte blieben unveraendert.

## Offene Risiken

- Die Quellenoptimierung ist eine deterministische aktuelle-Jahr-Optimierung innerhalb der vom Haushaltsplan vorgegebenen Assetklassen, keine mehrjaehrige Steuer- oder Rechtsoptimierung.
- Reichen die eindeutig profilbezogenen Tranchen fuer die final versteuerte Neuplanung nicht aus, bricht die Attribution sichtbar ab und erfindet weder Quelle noch Vermoegensuebertragung.
- Synthetische Fallback-Tranchen koennen mangels Lot-Details nur aggregierte Einstandswerte tragen.
- Die reale Screenshot-Konstellation bleibt zusaetzlich zur gruenen automatisierten Suite als manueller Abnahmefall fuer den Implementierungsreview offen.

## Rueckdokumentation

Tatsaechlicher Dateiscope, Implementierung, Testresultate, Planabweichungen und Restrisiken sind in diesem Slice, im Arbeitsdokument und im `BALANCE_APP_HARDENING_PLAN.md` rueckdokumentiert. Nach dem Implementierungsreview werden Review-Findings, Entscheidung und ein gegebenenfalls durch den Reviewer erzeugter Commit ergaenzt.

## Freigabestatus

- Arbeitsdokument: **freigegeben**
- Gemini-Review des Arbeitsdokuments: **freigegeben**
- Nutzerfreigabe zur Implementierung: **erteilt**
- Nutzerfreigabe zur Branch-Ausnahme: **erteilt**
- Implementierung: **abgeschlossen**
- Implementierungsreview: **erledigt (freigegeben)**
- Commit/Push: **nicht erfolgt**

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit und fachliche Invarianten:**
  - **Household-first & Attribution:** Der Code setzt das "Household-first"-Prinzip tadellos um. Es gibt genau einen Haushalts-Engine-Lauf. Die resultierende Aktion wird sauber auf die Profilquellen aufgeteilt.
  - **Vermeidung von Gegenbewegungen:** Da die Profile keine eigenen Engine-Läufe zur Planung mehr durchführen, ist die Entstehung widersprüchlicher Transaktionen (z. B. gleichzeitiger Kauf und Verkauf von Aktien über Partner A & B) an der Wurzel unterbunden.
  - **Centgenaue Reconciliation:** `attributeHouseholdAction` prüft centgenau, ob die Summe der Netto-Erlöse der Profile mit den Netto-Verwendungen übereinstimmt. Falls nicht, bricht die Funktion mit einem Fehler ab (fail-closed).
  - **Steuerliche Invariante (G-P0-01):** Für jedes Profil werden die Steuern und Verlustvorträge separat mittels `settleTaxYear` berechnet. Hierbei werden ausschließlich die tatsächlich dem Profil attribuierten Verkaufstranchen im Roh-Steueraggregat berücksichtigt. Profile ohne Verkäufe behalten ihren Verlustvortrag exakt bei.
  - **Einmalige 3-Bucket-Logik (G-P0-02):** Die 3-Bucket- und Bond-Wiederauffüllung laufen genau einmal auf Haushaltsebene vor der Attribution. `balance-action-postprocessor.js` reicht das Ergebnis im Profilverbund-Pfad unverändert weiter, ohne eine zweite 3-Bucket-Schleife auszuführen.

### 2. Findings (Kritische Risiken)

- **Keine Blocker:** Alle kritischen Risiken (Drift des Verlustvortrags und doppelte 3-Bucket-Ausführung) wurden vollständig gelöst.
- **Hinweis zur langfristigen Wartung:** Das manuelle Recompute des Steuerstatus in `attributeHouseholdAction` mittels `settleTaxYear` ist eine exzellente, DOM-freie Abstraktion, die völlig unabhängig von Simulator-Bibliotheken läuft.

### 3. Pre-Mortem vor Freigabe

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Benutzer hat eine Tranche mit ungültigen Datums- oder TQ-Faktor-Rohdaten (z. B. durch manuellen CSV-Edit). Durch die strengere Provenienz-Validierung in `attributeHouseholdAction` (`!hasRealizedRaw || !hasTaxableRaw`) bricht der Ladevorgang im Profilverbund fail-closed ab.

### 4. Review-Ergebnis

- **Status:** freigegeben zur Übernahme (erledigt)
- **Blocker:** keine
- **Restrisiken:** Restriktives Scheitern bei korrupten Tranchen-Rohdaten (Pre-Mortem).

---

## Review-Feedback von Claude

Optional, noch ausstehend.

## Review-Antworten von Codex

Arbeitsdokument, Implementierungsreview und Freigabe erhalten. Alle Akzeptanzkriterien und Invariantentests sind grün. Wir übergeben die Moduldateien zur Übernahme und zum Commit durch den Reviewer.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| U-01 | Nutzer | Umsetzung des freigegebenen P0-Bugfixes beginnen | angenommen | Slice angelegt; Implementierung und Tests abgeschlossen, Implementierungsreview ausstehend |
| U-02 | Nutzer | Keinen eigenen Bugfix-Branch anlegen | angenommen | Bestehender Entwicklungsbranch dokumentiert und beibehalten |
