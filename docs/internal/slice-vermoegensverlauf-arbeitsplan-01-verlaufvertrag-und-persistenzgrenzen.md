# Slice 1 von 4 – Verlaufvertrag und Persistenzgrenzen

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den optionalen Verlauf als validierten profilbezogenen State-Vertrag einführen und alle Import-/Ladewege rückwärtskompatibel absichern.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Für Tagesgeld 12000, Geldmarkt 23000, Alt-Depot 34000 und Neu-Depot 45000 entstehen Aktien-ETF 79000 und Summe 114000; nullwertige Komponenten bleiben gültig, das Eingabeobjekt bleibt unverändert.
- SOURCE: Zwei manuelle Erfassungen am selben lokalen Tag ersetzen genau einen manuellen Record; anderer Tag und Jahresabschluss am selben Datum bleiben eigenständige Records. Jahres-Upsert ist anhand der Periode eindeutig und eine Wiederholung verändert keinen bereits erfolgreichen Jahresstand.
- SOURCE: Ungültige Kalenderdaten einschließlich normalisierter Überlaufdaten, Stände vor 2026, widersprüchliche IDs/Perioden/Anlässe, doppelte IDs, negative/nichtendliche Beträge, falsche Summen und unbekannte Versionen werden abgelehnt und niemals still begrenzt.
- SOURCE: Speichern/Laden, Balance-V2-Export/-Import, Profilbundle-Export/-Import und Komplettbackup-Export/-Import erhalten alle Verlauffelder. Zwei Profile behalten getrennte Verläufe; auch ein beschädigter Verlauf eines inaktiven Profils wird vor Importwrites erkannt.
- SOURCE: Unterstützte Balance-V1-/Legacy-Exporte, Legacy-Profilbundles und Komplettbackups ohne Verlauf bleiben importierbar und zeigen eine leere Historie; der bisherige Verlauf wird bei einem Replace ohne Feld nicht übernommen.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-storage.js`
- `app/profile/profile-state.js`
- `app/shared/persistence-backup.js`
- `docs/internal/slice-vermoegensverlauf-arbeitsplan-01-verlaufvertrag-und-persistenzgrenzen.md`
- `docs/internal/vermoegensverlauf-implement-review-2e1a4a7a.md`
- `tests/balance-storage-contract.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/persistence.test.mjs`
- `tests/profile-state.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/wealth-history-contract.test.mjs`
- `types/wealth-history-contract.js`
<!-- audit:scope:end -->

## Umsetzung

> - `types/wealth-history-contract.js` stellt den DOM-/Storage-freien Vertrag für `wealthHistory` mit Schema 1 bereit. Datums-, Anlass-, Identitäts-, Betrags- und Summenvalidierung lehnen beschädigte Daten ab; Gleitkomma-Rauschen wird ausschließlich innerhalb der vereinbarten Toleranz akzeptiert.
> - Eintragsbildung übernimmt die vier aktuellen Eingabewerte ohne Rundung oder Mutation. Alt- und Neu-Depot ergeben Aktien-ETF; Gold und Pflegezweckbindung verändern die Summe nicht. Manuelle Identitäten verwenden das lokale Kalenderdatum, Jahresidentitäten das explizite Abschlussjahr.
> - Unverändernde Upserts ersetzen ausschließlich den manuellen Tagesrecord. Ein vorhandener Jahresrecord derselben Periode bleibt bei Wiederholung einschließlich aller Werte unverändert. Ein fehlendes State-Feld wird beim Lesen als leer ausgewertet, ohne es synthetisch anzulegen.
> - Balance lädt, speichert und migriert nur nach Verlaufvalidierung. Die Normalisierung aktueller, V1- und Legacy-Importe prüft vorhandene Verlauffelder vor JSON-Klonen und vor Writes. Der direkte Replace sowie Standard- und Recovery-Snapshot-Restore sichern den Verlauf ebenfalls ab.
> - Der profilbezogene Loader meldet beschädigte Verläufe als `CORRUPT` mit `PROFILE_WEALTH_HISTORY_INVALID` und erhält den Rohstate für Recovery. Die bestehende fachliche Backup-/Bundlevalidierung prüft damit Live-State und jedes Registryprofil, auch inaktive Profile; die Fehlermeldung benennt den betroffenen Persistenzpfad.
> - Die vorhandenen Transportpfade behalten das optionale Feld ohne neue Keys oder äußere Schemaversionen. Replace-Importe und Snapshot-Restore ohne Feld übernehmen keine bisherige Historie. Tests verwenden ausschließlich synthetische Bestände.
> - Erfassung im Jahresprozess, manuelle Bedienung und Diagramm bleiben Gegenstand der nachfolgenden Slices.

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
> Geprüft wurden Korrektheit, Verträge, Fehlerpfade, Sicherheit sowie Resume/Idempotenz anhand des kanonischen Diffs (11 Pfade, alle innerhalb der Slice-Allowlist) und der PASS-Attestierung von `npm test` mit passendem Fingerprint [Hash ausgelassen]…. Zum Vertrag in types/wealth-history-contract.js: Datum per Regex plus Monatslängen- und Schaltjahrprüfung ab 2026, daher werden Überlaufdaten wie 2026-02-30 abgelehnt. Anlass, ID und Periode werden gegeneinander geprüft, Beträge müssen endlich und nichtnegativ sein. Die Summen werden mit enger Toleranz geprüft, doppelte IDs und schemaVersion≠1 werden abgelehnt. Nur ein fehlendes Feld gilt als Legacy und ergibt eine leere Historie. Der Jahres-Upsert gibt bei vorhandener Periode den Verlauf unverändert zurück. Abdeckung der Kriterien: AC1 über tests/wealth-history-contract.test.mjs (aktienEtf 79000, total 114000, Nullwerte, Eingabe-JSON unverändert). AC2 über dieselbe Datei (replacement.entries.length 2, next 3, annualRetry identisch). AC3 über die rejects-Schleifen für Daten, Jahre, Beträge, Identitäten und Versionen. AC4 über tests/balance-storage-contract.test.mjs Test 11/12 (Save/Load, Replace, Snapshot-Restore ohne Writes), tests/balance-ui-orchestration.test.mjs (V2-Roundtrip, invalid_wealth_history), tests/profile-storage.test.mjs (Profiltrennung, Bundle-Roundtrip, writes===0 bei defektem inaktivem Profil) und tests/persistence.test.mjs (Vollbackup live/inaktiv, batches und snapshots unverändert). AC5 über die Legacy-Fälle in denselben Dateien (entries.length 0 nach Replace). Die Ladepfade prüfen vor Migrationswrites (MIGRATION_FLAG bleibt null), und profile-state liefert für einen beschädigten Verlauf CORRUPT mit bytegleichem raw.

Größtes Restrisiko:
> restoreImportRecoverySnapshot validiert jetzt auch den Verlauf im Recovery-Snapshot. Hatte der Live-State vor einem Import bereits einen beschädigten Verlauf, scheitert ein späterer Rollback dieses Imports mit WealthHistoryError, statt die vorherigen Bytes wiederherzustellen. Ob rollbackImportReplace diesen Pfad nutzt, ist nicht verifizierbar: Das Paket enthält nur die Diff-Hunks von app/balance/balance-storage.js, nicht den Rumpf von rollbackImportReplace. Test 11 deckt nur den Rollback eines gültigen Verlaufs ab. Die Folge wäre allerdings höchstens, dass der gültige Importstand bestehen bleibt. Eine stille Reparatur oder ein Datenverlust des neuen Stands entsteht dadurch nicht.

Bruchbedingung:
> Das Urteil kippt, wenn rollbackImportReplace nach einem fehlgeschlagenen Folgeschritt wegen eines vorbestehenden beschädigten Verlaufs einen inkonsistenten Teilzustand hinterlässt (Live-State und Registry auseinander). Es kippt ebenso, wenn ein Importpfad (Balance-V1/Legacy, Bundle, Vollbackup) einen vorhandenen gültigen Verlauf beim Migrieren verwirft oder Records vor der Verlaufsvalidierung schreibt.

Vorab-Risikoanalyse:
> Angenommen, die Slice scheitert später. Am wahrscheinlichsten liegt das daran, dass die neue strikte Verlaufsprüfung in loadState bzw. _runMigrations einen WealthHistoryError wirft, den Aufrufer in balance-main/Binder (Slice 2/3) nicht als eigenen Fehlerzustand behandeln. Dann blockiert ein beschädigter Verlauf den gesamten Balance-Start. Ein zweites Risiko ist der Recovery-Rollback eines Imports über einen bereits beschädigten Ausgangsstand. Beides ist innerhalb dieser Slice vertragskonform: Ablehnen statt still reparieren. Die nachfolgenden Slices müssen es jedoch sichtbar und recoverbar in der UI auflösen.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-194506.811440Z-1744300d869a`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
