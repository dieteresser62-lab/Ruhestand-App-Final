# Slice 2 von 4 – Bestände beim Jahresabschluss sicher erfassen

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den vorhandenen periodengebundenen Jahresabschluss mit einer dauerhaft bestätigten, profilbezogenen Verlaufserfassung verbinden.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Ein simulierter vollständiger Abschluss 2026 bei Referenzdatum 2027 liefert genau `annual:2026` am 2026-12-31 mit den erwarteten vier Quellbeträgen, beiden Summen und `calendar-year:2026`; Live-State und aktive Registry sind nach dem Readback gleich.
- SOURCE: Die Quelle entspricht `commitLiveState().inputData` einschließlich Verbund-/Tranchenaggregation, selbst wenn sichtbare Eingabefelder, frühere gespeicherte Inputs und simulierte `newState`-Beträge bewusst andere Werte enthalten. Andere Profilverläufe werden nicht verändert.
- SOURCE: Wiederholter Jahresknopf, zweiter Jahresknopf und Doppelklick erzeugen keine zweite Jahreserfassung und keinen zusätzlichen Engine-Periodencommit. Ein Abschluss vor 2026 erzeugt keinen Verlaufseintrag und behält seinen bestehenden Periodenvertrag.
- SOURCE: Snapshotfehler, Fehler im Jahresdatenschritt sowie Fehler bei Verlaufwrite/Readback/Flush erzeugen keinen falschen erfolgreichen Jahresstand. Der finale Persistenzfehler bewahrt vorherige Historie und Pending-Recovery; ein erneuter Klick bleibt bis zum Restore blockiert.
- SOURCE: Nach tatsächlichem Snapshot-Restore und anschließendem erfolgreichen Abschluss existiert genau ein Jahresrecord. Vorherige manuelle Records bleiben erhalten, soweit sie im wiederhergestellten Snapshot enthalten waren.
- SOURCE: Ein Profilwechsel während eines wartenden Persistenz-/Jahresschritts bricht die Verlaufsschreiboperation ohne Eintrag im fremden Profil ab. Manuelle und jährliche Schreibvorgänge können sich nicht gegenseitig mit veralteten States überschreiben.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-wealth-history.js`
- `docs/internal/slice-vermoegensverlauf-arbeitsplan-02-bestande-beim-jahresabschluss-sicher-erfassen.md`
- `docs/internal/vermoegensverlauf-implement-review-2e1a4a7a.md`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-wealth-history.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Neuer Dienst `createBalanceWealthHistoryService()` nutzt den Verlaufvertrag aus Slice 1. Jahreswerte stammen ausschließlich aus dem erfolgreichen `commitLiveState().inputData`; Stichtag und Identität stammen aus dem validierten Abschlussjahr. Es erfolgt kein zusätzlicher Engine-Periodencommit.
> - Der finale Verlauf und `annualPeriodMetadata` werden in einer gemeinsamen `replaceRecordsTransactional()`-Transaktion im Live-State und in der aktiven Registrykopie geschrieben und durch Backend-/Cache-Readback bestätigt. Andere Profilrecords und bestehende State-Felder bleiben erhalten. Bei Write-/Readbackfehlern kompensiert die vorhandene Facade auf den vorherigen Pending-State mit bisheriger Historie.
> - Eine gemeinsame Warteschlange je Storage serialisiert manuelle Writes und Jahresprozesse auch über mehrere Dienstinstanzen. State und Registry werden nach dem initialen Flush erneut gelesen; die finale Transaktion prüft Kontext und betroffene Records über ihre Key-Prüfung auch nach internen Wartepunkten. Manuelle Erfassungen während eines Jahresprozesses oder bei Pending-Recovery werden abgewiesen.
> - Der Coordinator sperrt schon vor der asynchronen Legacy-Persistenz. Profilidentität wird vor dem Warten erfasst und nach Vorprüfung, Flush, Snapshot, Jahresupdate und Engine-Commit erneut geprüft. Ein Wechsel verhindert weitere Verlaufwrites im fremden Profil.
> - Die injizierbare Zeitreferenz bleibt standardmäßig die lokale Systemzeit. Neue Jahresprüfungen verwenden Januar 2027 mit Abschlussjahr 2026. Abschlüsse vor 2026 behalten den bisherigen Periodenvertrag ohne neuen Verlaufrecord.
> - Ein Fehler beim Rendern nach dauerhaft bestätigtem Abschluss wird angezeigt, ohne den erfolgreichen Abschluss als ungespeichert oder recovery-pflichtig auszugeben.
> - Tests prüfen echte Verbund-/Tranchenaggregation, abweichende Quellalternativen, die beiden öffentlichen Binder-Einstiege, Doppelklick schon während Legacy-Flush, persistente Fehler, echte Snapshot-Wiederherstellung, Profilwechsel an Wartepunkten und konkurrierende manuelle/Jahreswrites.

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
> Geprüft wurden Korrektheit, Fehlerpfade, Idempotenz/Resume, Profilisolation, Nebenläufigkeit und Pfadgrenzen anhand des vollständigen Diffs im Review-Paket (5 Pfade, alle in der Slice-Allowlist; das Slice-MD ist eine Auditansicht des Orchestrators). Pfadgrenze: kein Pfad außerhalb des Umfangs. Quelle: finalizeAnnual verwendet ausschließlich commitResult.inputData; tests/balance-wealth-history.test.mjs prüft mit realem createProfilverbundHandlers().updateProfilverbundGlobals die aggregierten Werte 12000/23000/34000/45000 und total 114000 (Gold wird nicht addiert), obwohl DOM (tagesgeld 999), gespeicherte Inputs (4..7) und newState (999999) abweichen. Abnahme 2026/2027: tests/balance-annual-workflow-contract.test.mjs prüft id 'annual:2026', asOf '2026-12-31', periodId 'calendar-year:2026', vier Quellbeträge, aktienEtf 79000.875, total 114001.625, Live-State == Registry-Eintrag von Profil a und unverändertes Profil b. Idempotenz: Wiederholung liefert already_committed bei genau einem 'commit:'-Aufruf; der Doppelklick-Test mit Gate im Legacy-Flush liefert in_flight, weil annualCloseInFlight vor dem ersten await gesetzt wird; beide Binder-Knöpfe liefern already_committed mit updates == 0. Vor 2026: execute(null) ohne Verlaufsrecord, lastCommittedPeriod 'calendar-year:2025'. Fehlerpfade: Write-, Readback- und Flushfehler liefern jeweils incomplete_recovery bei unveränderter Historie, pendingCommit.phase 'validating' und blockierter Wiederholung; nach echtem StorageManager.restoreSnapshot entsteht genau ein annual:2026 neben dem erhaltenen manuellen Record. Profilwechsel: assertContext greift vor und nach jedem await sowie in allowKey/postValidate; die Tests 'annual'/'flush'/'read' bestätigen, dass Live-State und Registry von Profil b unverändert bleiben. Gegenseitiges Überschreiben: eine gemeinsame Warteschlange je Storage (WeakMap), das Lesen erst nach dem Flush und die allowKey-Prüfung auf previous/records verhindern veraltete States; der Test mit zwei Diensten ergibt 4 Einträge. Die Validierungsattestierung mit npm test ist PASS und passt zum Fingerprint [Hash ausgelassen]….

Größtes Restrisiko:
> Nicht verifizierbar ist, ob der produktive commitLiveState in app/balance/balance-binder.js tatsächlich { ok, inputData } zurückgibt und annualPeriodMetadata nicht verändert. Davon hängen die result.ok-Prüfung in finalizeAnnual und der expectedPending-Vergleich per JSON.stringify ab. Das Paket enthält für balance-binder.js nur drei Hunks (Kontext 'return result;' bei Zeile 83) und nicht die vollständige Funktion. Der Binder-Test durchläuft nur den already_committed-Pfad, und die gewünschte Begrenzung auf genau 6 Read-Aufrufe schließt das Nachlesen im Workspace aus. Läge hier eine Abweichung vor, würde jeder Abschluss ab 2026 produktiv fail-closed als incomplete_recovery enden, ohne Datenverlust.

Bruchbedingung:
> Das Review wäre falsch, wenn der produktive commitLiveState undefined oder ein Objekt ohne inputData zurückgibt oder wenn er annualPeriodMetadata umschreibt. Dann bricht jeder reale Jahresabschluss ab 2026 mit incomplete_recovery ab. Gleiches gilt, wenn replaceRecordsTransactional im Fehlerfall den Cache nicht zurückrollt, sodass der Pending-Marker oder die alte Historie im Live-State verloren ginge.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag nach Merge: Ein echter Jahresabschluss 2027 im Browser scheitert, weil die reale commitLiveState-Rückgabe nicht dem in den Tests gemockten Vertrag { ok: true, inputData } entspricht oder weil captureContext bei Nutzern ohne eindeutiges aktives Profil in der Registry den Abschluss blockiert. Beides wäre fail-closed und ohne Datenverlust, würde den Jahresabschluss aber bis zu einer Korrektur unbenutzbar machen. Den Browserdurchstich deckt planmäßig Slice 4 (tests/browser-smoke.test.mjs) ab.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-194506.811440Z-1744300d869a`, Arbeitseinheit(en) 3; Nachweise in der Recordkette.
<!-- audit:reference:end -->
