# Slice Abschlusshaertung 04: Verbindlicher Reconcile-Cashstatus

**Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** Feature-Branch lokal vorhanden; nicht veroeffentlicht, da keine Push-Freigabe vorliegt<br>
**Status:** Alle Claude-Code-Review-Findings S4-01 bis S4-08 sind behoben und einzeln nachgemessen; S4-09 ist als niedriges Restrisiko bewusst zurueckgestellt und die Begruendung im dritten Claude-Review geprueft und akzeptiert. Ergebnis des dritten Claude-Reviews vom 2026-08-09: **freigegeben, keine offenen Findings**. Gates eigenstaendig reproduziert: 19.507/19.507 Assertions, 29/29 Browserworkflows, `git diff --check` gruen, genau sieben produktive Dateien. Finale Gemini-Scope-/Abnahmepruefung und lokaler Commit ausstehend.<br>
**Vorheriger Status:** Claude-Code-Review-Findings S4-01 bis S4-07 technisch nachgebessert; 19.506/19.506 Assertions, 29 Browserworkflows, Coverage-Gates und `git diff --check` lokal gruen. Externes Re-Review/Freigabe und Commit ausstehend.<br>
**Bisheriger Status:** lokal umgesetzt und technisch gruen; externes Codereview/Freigabe sowie Commit ausstehend. Die ausdrueckliche Nutzeranweisung ersetzte fuer den Umsetzungsstart das offene Gemini-Plan-Re-Review, ohne eine tatsaechliche Gemini-Freigabe zu behaupten. `Handbuch.html` war als siebte produktive Datei ausdruecklich freigegeben<br>
**Hauptplan:** [FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md](FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md)

## Eingangsstand aus Slice 03

- Verbindliche Eingangsbaseline ist der lokal abgenommene Slice-03-Commit
  `68e9e0f` auf `codex/fokussierte-abschlusshaertung`.
- Slice 03 ist mit 19.382 Node-Assertions, 29 Browserworkflows und
  `git diff --check` gruen; es besteht kein roter Zwischenzustand.
- Die offenen, nicht blockierenden Slice-03-Findings S3-09 bis S3-11 betreffen
  Safety-Cap-Erwartung, Alarmtrigger/Glaettungsreferenz und deren Diagnose-
  Schreibstellen. Slice 04 veraendert weder `engine/` noch diese Contracts und
  zieht die Findings nicht verdeckt in seinen Scope.
- Zwischen den produktiven Slice-03-Modulen und den sechs geplanten
  Tranchenmodulen besteht keine Dateiüberschneidung. Gemeinsam betroffen sind
  nur uebergeordnete Dokumentation und bei vollstaendiger Nutzerworkflow-
  Dokumentation erneut `Handbuch.html`.

## Ziel

Ein bestaetigter realer Verkauf darf nicht als vollstaendig abgeschlossen
erscheinen, solange unklar ist, ob sein Nettoerloes in der freien Liquiditaet
enthalten ist.

## Fachliche Nutzerentscheidung

Der Verkaufserloes wird nicht ungefragt automatisch zur freien Liquiditaet
addiert. Der bestehende append-only Reconcile-Auditvertrag bleibt erhalten:
Neue Verkaufsrecords tragen einen initialen Cashstatus; ein spaeterer Abschluss
erfolgt ausschliesslich durch ein append-only Folgeereignis
`cash_posting_confirmed`. Ein falsch erfasster bestaetigter Cashstand wird
ebenfalls append-only durch `cash_posting_corrected` berichtigt. Bestehende
Verkaufs-, Bestaetigungs- und Korrekturrecords werden nie mutiert.

Die Historien-Schemaversion bleibt fuer diesen kompatiblen Zusatz auf `1`.
Bestehende Records ohne `eventType` werden beim Lesen als historische
`sale_reconciled`-Events projiziert, aber nicht umgeschrieben. Dadurch gibt es
keine produktive v1-zu-v2-Migration und keinen fail-closed Versionsbruch.

## Akzeptanzkriterien

- Jede neue Verkaufsaktion besitzt `eventType: sale_reconciled` und einen
  validierten initialen Cashstatus.
- Nach Lot-Commit ist der Default `pending_manual_posting`, sofern der Nutzer
  nicht explizit `confirmed_already_reflected` waehlt.
- Wird `confirmed_already_reflected` bereits beim Verkaufscommit gewaehlt,
  speichert der Verkaufsrecord neben seinem vorhandenen `actual.netProceeds`
  auch den bestaetigten `cashBalanceAfterPostingEur` und `cashConfirmedAt`; der
  Dialog zeigt diese Bezugsdaten vor dem Commit.
- Offener Cashstatus bleibt nach Reload und Seitenwechsel sichtbar.
- Der Nutzer schliesst einen offenen Status nach manueller Aktualisierung durch
  ein append-only `cash_posting_confirmed`-Folgeereignis mit
  `targetActionId` auf den Verkauf.
- **Jedes** `cash_posting_confirmed`-Abschlussereignis besitzt ein regulaeres
  `actionId`-Feld und es gilt zwingend
  `actionId === confirmationActionId`. Damit erfuellt der Record den bestehenden
  Lesercontract fuer alle Historienrecords. Fuer Korrekturereignisse gilt der
  unten definierte Gleichheitscontract `actionId === correctionActionId`.
- Die kanonische ID ist direkt
  `cash-confirmation:v1:<normalizedTargetActionId>`, wobei
  `normalizedTargetActionId` zuerst den Verkaufs-/Ziel-ID-Contract
  durchlaeuft. Die Abbildung ist fuer unterschiedliche normalisierte Ziel-IDs
  injektiv und im Audit ohne Werkzeug lesbar. Die Prefixe
  `cash-confirmation:` und `cash-correction:` sind fuer neue Verkaufs-`actionId`
  reserviert und dort unzulaessig.
- Die Laengenpruefung ist eventtypspezifisch:
  `sale_reconciled.actionId` und `targetActionId` besitzen weiterhin maximal
  128 Zeichen; nur `cash_posting_confirmed.actionId` und
  `confirmationActionId` duerfen aus Prefix (21 Zeichen) plus vollstaendig
  gueltiger Ziel-ID maximal 149 Zeichen besitzen. `cash_posting_corrected`-
  Records duerfen fuer `actionId` und `correctionActionId` maximal 154 Zeichen
  besitzen. Neue Verkaufs-IDs werden **nicht** auf 107 Zeichen verkuerzt.
- `readReconciliationHistory` bestimmt zuerst den Eventtyp; fehlendes
  `eventType` wird wie bisher als Legacy-Verkauf behandelt. Danach gilt das
  passende 128-/149-/154-Zeichen-Limit. Unbekannte Eventtypen, 129 Zeichen bei
  Verkauf/Ziel, 150 Zeichen bei einem Abschlussrecord und 155 Zeichen bei einem
  Korrekturrecord scheitern fail-closed. Die Fehlermeldung nennt Eventtyp,
  tatsaechliche Laenge und das fuer diesen Typ gueltige Maximum.
- Vor dem Append wird die kanonische ID gegen **alle** vorhandenen Records
  geprueft. Kollision mit einer Verkaufs-ID oder einer Bestaetigung fuer ein
  anderes `targetActionId` blockiert fail-closed; es wird nie automatisch eine
  Ersatz-ID erzeugt.
- `deriveCashConfirmationActionId` fuehrt nur Prefix und normalisierte Ziel-ID
  zusammen. Es wird weder eine private Hash-/Kryptoimplementierung noch
  `crypto.subtle` oder ein Import aus
  `app/simulator/historical-backtest-contract.js` eingefuehrt. Der synchrone
  atomare Lot-/Registry-Commitpfad bleibt unveraendert.
- Die `confirmationActionId` wird kanonisch aus `targetActionId` abgeleitet und
  muss exakt diesem Wert entsprechen. Dieselbe fachliche Bestaetigung liefert
  auch bei einem neu erzeugten Submit-Zeitstempel `duplicate`; der zuerst
  gespeicherte Nachweiszeitpunkt bleibt erhalten. Abweichender Betrag,
  Cashstand oder Zielbezug mit derselben ID blockiert als Konflikt fail-closed.
- Pro Verkauf ist hoechstens ein wirksames Abschlussereignis erlaubt. Ein Event
  mit derselben `targetActionId`, aber nichtkanonischer ID ist ungueltig. Eine
  Korrektur ist kein zweites Abschlussereignis, sondern ersetzt nur in der
  effektiven Projektion den Cashstand des bisherigen Nachweises.
- Das Folgeereignis speichert `targetActionId`, den aus
  `actual.netProceeds` des Verkaufs kopierten `confirmedNetProceedsEur`, den
  bestaetigten `cashBalanceAfterPostingEur` und `confirmedAt`. Der Nettoerloes
  muss centgenau mit dem Verkaufsrecord uebereinstimmen.
- Ein `cash_posting_corrected`-Record darf nur fuer einen Verkauf mit wirksamer
  initialer Bestaetigung angehaengt werden. Er besitzt
  `actionId === correctionActionId`, `targetActionId`, `correctsActionId`,
  `correctionRevision`, den centgleich aus dem Verkauf kopierten und nicht
  editierbaren `confirmedNetProceedsEur`, den neuen
  `cashBalanceAfterPostingEur`, einen nach Trim nichtleeren
  `correctionReason` und `correctedAt`.
- Die erste Korrektur besitzt `correctionRevision: 1`. Bei
  `confirmed_already_reflected` verweist `correctsActionId` auf die Verkaufs-
  `actionId`; bei spaeterem Abschluss verweist sie auf die
  `confirmationActionId`. Jede weitere Korrektur erhoeht die Revision exakt um
  eins und verweist auf die `actionId` der aktuell wirksamen Korrektur.
- Die effektive Projektion akzeptiert nur eine lineare Kette. Fehlende
  Revisionen, mehrere Nachfolger derselben Revision, veraltete Rueckverweise,
  Zielwechsel, ein geaenderter Nettoerloes oder eine Korrektur ohne vorherige
  Bestaetigung scheitern fail-closed. Ausschliesslich der Cashstand der letzten
  gueltigen Korrektur wird angezeigt; alle frueheren Records bleiben im Audit
  sichtbar.
- Die kanonische Korrektur-ID lautet
  `cash-correction:v1:<normalizedTargetActionId>:<revision>`. Die Revision ist
  eine kanonische Ganzzahl von 1 bis 999999 ohne fuehrende Nullen. Aus einer
  gueltigen 128-Zeichen-Ziel-ID und Revision 999999 entstehen maximal 154
  Zeichen. Revision 1000000 sowie eine nichtkanonische ID sind ungueltig.
- Die UI haelt die in der Vorschau erzeugte Revision und Korrektur-ID bis zum
  Commit stabil und reicht auch den erwarteten Vorgaenger unveraendert durch.
  Eine fachlich gleiche Wiederholung liefert unabhaengig von einem neu erzeugten
  Submit-Zeitstempel `duplicate`, haengt nichts an und bewahrt den ersten
  Nachweiszeitpunkt; dieselbe ID mit abweichendem fachlichem Payload blockiert
  als Konflikt. Nach einem erfolgreichen neuen Zwischenstand wird die naechste
  Revision erst in einem neu geoeffneten Dialog erzeugt.
- Der Korrekturdialog zeigt bisherigen und neuen Cashstand, den unveraenderten
  Nettoerloes, Korrekturgrund und Zielverkauf vor der expliziten Bestaetigung.
  Die Korrektur aendert weder Verkauf noch Nettoerloes und fuehrt keine
  automatische Cashbuchung aus.
- UI sagt nicht „vollstaendig abgeschlossen“, solange Cash offen ist.
- Vorschau/Abbruch bleiben schreibfrei; Lot-/Registry-Commit bleibt atomar.
- `comparableAction` bleibt auf die urspruenglichen Verkaufsausfuehrungsdaten
  begrenzt; Cashstatus und Folgeereignisse duerfen eine wiederholte
  Verkaufsvorschau nicht in einen Konflikt verwandeln.
- `previewTrancheReconciliation` prueft Verkaufsduplikate ausschliesslich gegen
  `sale_reconciled` beziehungsweise kompatibel projizierte Legacy-Verkaeufe;
  weder `cash_posting_confirmed` noch `cash_posting_corrected` duerfen als
  Verkaufsduplikat gefunden werden.
- Jeder Leser oder kuenftige Consumer der heterogenen `actions`-Liste muss vor
  einer fachlichen Auswertung nach `eventType` filtern. Dieser Contract wird in
  `docs/reference/TRANCHEN_MODULES_README.md` festgehalten.
- Eine synthetische bestehende v1-Historie bleibt byteinhaltlich unveraendert
  lesbar. Fehlendes `eventType` ergibt den abgeleiteten Status
  `legacy_unknown`, nicht einen Lesefehler.
- Auch ein Legacy-Verkaufsrecord muss `schemaVersion: 1` tragen. Fehlender
  `eventType` ist die einzige Legacy-Projektion; eine abweichende Recordversion
  scheitert fail-closed und wird nicht als gueltiger Altfall kaschiert.
- Legacy-Aktionen blockieren den neuen Workflow nicht und werden nicht als
  `pending`-Rueckstand behandelt. Fuer den Workflow gelten sie als
  **abgeschlossen**, tragen aber den eigenen Nachweisstatus
  „Abgeschlossen (Altfall – Cashstatus nicht dokumentiert)“ und duerfen nicht
  als „Cash bestaetigt“ erscheinen. Eine freiwillige spaetere Ergaenzung des
  Nachweises per Folgeereignis ist erlaubt.
- Ein unlesbarer Cash-Audit besitzt im Manager einen eigenen Fehlerzustand und
  darf nie als leere Verkaufshistorie erscheinen. Manager, Balance und Simulator
  weisen `legacy_unknown` in ihren Zusammenfassungen sichtbar als Altfall ohne
  dokumentierten Cashstatus aus; nur ein vollstaendig bestaetigter Bestand darf
  den gruenen Cash-All-clear-Hinweis tragen.
- Vor dem ersten Einsatz des geaenderten Tranchenmanagers wird unter
  `index.html` -> „Profile“ -> „Erweitert“ -> „Backup exportieren“
  (`#fullBackupBtn`) ein zentrales Komplettbackup erstellt. Der bestehende
  Vertrag in `app/shared/persistence-backup.js` umfasst den Registry-Key
  `rs_profiles_v1`; der Ablaufschritt wird im Handbuch dokumentiert.

## Scope

- kompatible Erweiterung des Reconcile-Contracts ohne Anhebung der
  Historien-Schemaversion.
- additive v1-Ausnahme fuer optionale Felder und heterogene `eventType`-Records
  samt dokumentierter Consumer-Filterpflicht.
- initialer Status am Verkaufsrecord sowie append-only Abschluss- und
  Korrekturereignisse.
- Statusdarstellung, expliziter Abschluss und explizite Cashstandkorrektur im
  Tranchenmanager.
- Persistenz, Reload, Idempotenz und Recoverytests.
- Dokumentation des manuellen Cashprozesses.

## Nicht-Scope

- keine automatische Addition zu Tagesgeld/Geldmarkt;
- keine zweite Buchhaltungs- oder Cash-Datenbank;
- kein Broker-/Bankimport und kein Orderrouting;
- keine automatische Steuerbuchung;
- keine Mutation bestehender Auditrecords;
- kein Loeschen oder In-place-Storno; eine Berichtigung bleibt ein sichtbares
  Folgeereignis;
- keine produktive Schemamigration und kein automatisches Umschreiben alter
  Aktionen;
- kein erfundener Cashstatus fuer Altaktionen;
- keine neue Abhaengigkeit des Tranchenbereichs von Simulator- oder historischen
  Marktdatenmodulen.

## Voraussichtlich geplante Programmdateien

- `app/tranches/tranche-reconciliation.js`
- `app/tranches/tranchen-manager-page.js`
- `app/tranches/tranchen-manager-renderer.js`
- `app/tranches/tranchen-manager-state.js`
- `app/tranches/depot-tranchen-status.js`
- `app/tranches/tranchen-manager-modal.js`
- `Handbuch.html`

Die produktive Dateiliste umfasst nach ausdruecklicher Nutzerfreigabe maximal
diese sieben Programmdateien. Eine
Anhebung der Historien-Schemaversion, Mutation bestehender Records oder der
Bedarf einer achten produktiven Datei ist eine Contractabweichung und stoppt
den Slice vor Coding. Die Direktableitung der ID liegt in
`tranche-reconciliation.js`; es wird keine Hashhilfe und keine achte Datei
eingefuehrt.

**Im Preflight erkannte und entschiedene Scope-Kollision:** Akzeptanzkriterium und
Rueckdokumentation verlangen den manuellen Backup-/Cashprozess im
`Handbuch.html`. Nach den Projektregeln ist diese HTML-Datei eine produktive
Programmdatei. Der Nutzer hat am 2026-08-07 ihre Aufnahme als siebte Datei
ausdruecklich freigegeben. Die Slice-Grenze wird deshalb vor Coding von sechs
auf sieben erweitert; ab einer achten Datei gilt der slice-eigene Stopp.

## Diff-Risiko vor Coding

**Preflight-Stand:** 2026-08-07. Die Versionsentscheidung ist gefallen:
Die Historie bleibt `schemaVersion: 1`; neue optionale Eventfelder werden durch
einen kompatiblen Leser validiert und projiziert. Der zentrale Vollbackupweg
und die Einbeziehung von `rs_profiles_v1` sind im bestehenden Code und in den
Persistenztests nachgewiesen.

Diese additive lokale Persistenzerweiterung ist die eng begrenzte Ausnahme von
der globalen Versionsregel des Hauptplans: keine Entfernung oder Umdeutung
bestehender Felder, kein Rewrite valider Altverlaeufe, unbekannte/korrupte
Events fail-closed und verpflichtender Mixed-Event-Recoverytest. Die Ausnahme
gilt nicht fuer Exporte.

```text
git branch --show-current: codex/fokussierte-abschlusshaertung
git status --short: sauber
git rev-parse HEAD: 68e9e0fed034861dd22b403a4bc0580ae687e7e2

Geplante Dateien:
- app/tranches/tranche-reconciliation.js
- app/tranches/tranchen-manager-page.js
- app/tranches/tranchen-manager-renderer.js
- app/tranches/tranchen-manager-state.js
- app/tranches/depot-tranchen-status.js
- app/tranches/tranchen-manager-modal.js
- Handbuch.html; am 2026-08-07 ausdruecklich als siebte Datei freigegeben

Voraussichtliche Änderungstiefe:
- riskant: persistenter Realbestands-/Auditworkflow

Gefährdete bestehende Tests:
- tranche-reconciliation
- tranchen-manager-page/state/renderer
- depot-tranchen-status / tranchen-manager-modal
- profile registry/recovery
- browser reconciliation workflow

Nicht anfassen:
- Balance-/Simulator-Empfehlungsberechnung
- Steuerengine
- automatische Cashmutation
- dist/ und Releaseartefakte

Rollback-Strategie:
- Slice-3-Commit 68e9e0f ist sauberer Sicherheitspunkt
- nur exakten Slice-4-Commit revertieren oder uncommittete Slice-4-Hunks nach
  dokumentierter Dateipruefung gezielt zuruecknehmen; kein Hard-Reset
- vor Ruecknahme Registry-/Tranchendatenvertrag und Testfixtures pruefen
- vor erstem produktivem Einsatz Registry-Backup erstellen und Lesbarkeit
  pruefen
```

## Geplante Tests

- `node tests/run-single.mjs tests/tranche-reconciliation.test.mjs`
- `node tests/run-single.mjs tests/tranchen-manager-page.test.mjs`
- `node tests/run-single.mjs tests/tranchen-manager-state.test.mjs`
- synthetisches v1-Recoveryfixture: unveraendert lesbar, `legacy_unknown`, kein
  automatisches Rewrite, unbekannte/korrupt strukturierte Events fail-closed
- Append-only-Test: Verkauf bleibt unveraendert; Abschluss ist zweites Event
- Initialbestaetigungstest: `confirmed_already_reflected` speichert
  Nettoerloesbezug, Cashstand und Zeitpunkt bereits am Verkaufsrecord
- Idempotenz-/Konflikttest fuer deterministische `confirmationActionId`,
  Zielverkauf, Nettoerloes und Cashstand
- `actionId === confirmationActionId`, reservierter Prefix, Laengenlimit sowie
  fail-closed Kollision gegen Verkaufs-, Bestaetigungs- und Korrekturrecords
- Grenzlaengen: 128-Zeichen-Verkaufs-/Ziel-ID ist gueltig und erzeugt eine
  149-Zeichen-Abschluss-ID; Verkauf/Ziel mit 129 Zeichen und Abschluss-ID mit
  150 Zeichen scheitern fail-closed. Der Mixed-Event-Leser wendet die Grenzen
  nach Ableitung des Eventtyps an
- Direktableitungs-Golden: unterschiedliche normalisierte Ziel-IDs ergeben
  unterschiedliche lesbare Abschluss-IDs; kein Hashcode, kein Import aus dem
  Simulator-Domainmodul und kein asynchroner Commitpfad
- Mixed-Event-Roundtrip: Verkauf, Cashabschluss und Cashkorrektur schreiben, neu
  lesen, global eindeutige `actionId` und korrekte Projektion aller drei
  Eventtypen pruefen
- Korrektur-Roundtrip fuer beide Startformen: initial
  `confirmed_already_reflected` sowie `pending_manual_posting` plus
  `cash_posting_confirmed`; Verkauf und Bestaetigung bleiben byte-/wertgleich
- Mehrfachkorrektur: Revisionen sind lueckenlos, jede zeigt auf den aktuell
  wirksamen Vorgaenger und nur die letzte bestimmt den projizierten Cashstand
- Korrektur-Fail-closed-Matrix: ohne Bestaetigung, fehlende Revision, Fork,
  veralteter Rueckverweis, Zielwechsel, geaenderter Nettoerloes, leerer Grund,
  nichtkanonische ID und gleicher ID mit abweichendem Payload
- Korrektur-Idempotenz: exakte Wiederholung erzeugt kein Event; der im
  Vorschaudialog gezeigte `correctionActionId` bleibt bis zum Commit stabil
- Korrektur-Grenzlaenge: 128-Zeichen-Ziel plus Revision 999999 erzeugt exakt
  154 Zeichen; Revision 1000000 und 155-Zeichen-Korrektur-ID scheitern
  fail-closed
- `comparableAction`-Regression: Statuswechsel veraendert duplicate-Erkennung
  einer identischen Verkaufsvorschau nicht
- Preview-Regression: `cash_posting_confirmed` und `cash_posting_corrected`
  werden niemals als bestehende Verkaufsausfuehrung oder Verkaufsduplikat
  behandelt
- relevante Profil-/Recoverytests
- bestehender Vollbackup-Contract: Export enthaelt `rs_profiles_v1` und kann
  ihn bytegleich wiederherstellen
- Browsertest: Verkauf, pending, Reload, Dialog mit Nettoerloes/Cashstand,
  manueller Abschluss, fehlerhaften Cashstand append-only korrigieren, erneuter
  Reload, Auditkette, idempotente Wiederholung und Legacy-Anzeige
- `npm test`
- `npm run test:browser`
- `git diff --check`

## Durchgefuehrte Änderungen

- `tranche-reconciliation.js` liest eine heterogene, additive v1-Historie mit
  `sale_reconciled`, `cash_posting_confirmed` und `cash_posting_corrected`,
  validiert eventtypspezifische ID-Grenzen, globale Eindeutigkeit, kanonische
  Direktableitungen, centgleichen Nettoerloes und lineare Korrekturketten
  fail-closed.
- Neue Verkaufsrecords erhalten den expliziten Default
  `pending_manual_posting`; `confirmed_already_reflected` speichert Cashstand und
  Zeitpunkt bereits am unveraenderten Verkaufsrecord. Cashstatus bleibt aus dem
  bestehenden Verkaufsvergleich ausgeschlossen.
- Cashabschluss und -korrektur besitzen eigene schreibfreie Vorschauen und
  append-only Commitpfade mit Profil-/Stale-Gate, Flush, Rollback, Duplicate und
  Konflikt. Lots und fruehere Auditrecords werden dabei nie mutiert.
- Legacy-Verkaeufe ohne `eventType` werden nur im Leser als
  `legacy_unknown` projiziert, operativ nicht als Pending gezaehlt und beim
  Append nicht umgeschrieben.
- Der Tranchenmanager erzeugt die Cashstatuswahl und den Cashdialog aus den
  freigegebenen JS-Modulen. Er zeigt Zielverkauf, unveraenderten Nettoerloes,
  kanonische ID, bisherigen/neuen Cashstand, Revision und Korrekturgrund vor der
  expliziten Bestaetigung.
- Offene Cashrueckstaende bleiben nach Reload sichtbar und werden auch in den
  Tranchenstatusanzeigen von Balance und Simulator ausgegeben; die eingeklappte
  Balance-Detailanzeige oeffnet sich bei Pending oder korruptem Audit.
- Handbuch, Hauptplan, README, technische Referenz, Architektur-/Fachkonzept,
  Tranchenmodul-Referenz und Testinventar wurden auf den realisierten manuellen
  Cashprozess einschliesslich Pflicht-Komplettbackup aktualisiert.

## Ausgefuehrte Tests mit Ergebnis

- fokussierte Modul-Gates: 342/342 Assertions gruen
  (`tranche-reconciliation`, Manager-Page/-State/-Renderer/-Modal und
  Depot-Tranchen-Status);
- `npm test`: 169 Testdateien, 19.506/19.506 Assertions, 0 fehlgeschlagene
  Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles;
- `npm run test:browser`: 29 Browserworkflows gruen, darunter Pending nach
  Seitenwechsel/Reload, Abschluss, Korrektur, exakter Retry und Legacy-Anzeige;
- `npm run test:coverage`: 19.506/19.506 Assertions gruen, approximative
  Gesamt-Line-Coverage 79,34 Prozent (44.296/55.830), alle obligatorischen
  Dateigates bestanden;
- `git diff --check`: gruen.

## Abweichungen vom Plan

Keine fachliche oder technische Contractabweichung. Die im Preflight erkannte
Aufnahme von `Handbuch.html` als siebte produktive Datei wurde vor Coding
ausdruecklich durch den Nutzer genehmigt. `depot-tranchen-manager.html` musste
nicht als achte Datei geaendert werden; die neue UI wird aus den geplanten
Renderer-/Modalmodulen erzeugt.

## Offene Risiken

- Ein Nutzer kann „bereits reflektiert“ falsch bestätigen. Die UI muss deshalb
  Nettoerloes, bestaetigten Cashstand, Zeitpunkt und Verantwortung klar
  anzeigen; Software kann eine Falschbestaetigung nicht vollstaendig verhindern.
  Ein falscher Cashstand ist nun nachvollziehbar korrigierbar, eine falsche reale
  Brokerbuchung oder ein falscher Verkauf wird dadurch jedoch nicht repariert.
- Der kompatible v1-Leser darf korrupte Auditverlaeufe nicht still als leer
  behandeln. Kompatibilitaet gilt nur fuer strukturell gueltige Altverlaeufe.
- Die Direktableitung selbst kann zwischen zwei gueltigen Ziel-IDs nicht
  kollidieren. Ein gleichlautender alter Verkaufsrecord im heute reservierten
  Namespace wird dennoch ueber die globale Bestandspruefung erkannt und
  blockiert den Append fail-closed; es gibt keine Ersatz-ID.
- Die Korrekturkette ist absichtlich linear. Bei konkurrierenden Tabs kann der
  spaeter commitende Dialog wegen einer inzwischen veralteten Revision
  fail-closed blockieren; er muss den neuen Stand laden und erneut bestaetigen,
  statt einen Fork zu erzeugen.

## Rueckdokumentation

Nach Abschluss: Hauptplan, `docs/reference/TRANCHEN_MODULES_README.md`,
Architektur-/Fachkonzept, Handbuch und `tests/README.md` aktualisieren.

## Freigabestatus

Die ausdrueckliche Nutzeranweisung vom 2026-08-07 ersetzt fuer den
Umsetzungsstart das im Dokument noch offene Gemini-Re-Review, wird aber nicht
als tatsaechliche Reviewerfreigabe dargestellt. C-09 ist durch die einfachere
Direktableitung aus C-10 ueberholt, C-10 und G-P-02 sind eingearbeitet; G-P-07
wird wegen seiner ungueltigen 129-Zeichen-Vorbedingung abgelehnt. Die
Scope-Entscheidung zu `Handbuch.html` ist erteilt und die Umsetzung ist technisch
abgeschlossen. Externe Codeabnahme/Freigabe und Commit bleiben offen; Codex
markiert die eigene Implementierung nicht selbst als freigegeben.

## Review-Feedback von Gemini

G-P-02 ist ein echter Blocker des Entwurfs v5: Ein Tippfehler im bestaetigten
Cashstand waere wegen Append-only und der eindeutigen Bestaetigungs-ID zwar
sichtbar, aber operativ nicht korrigierbar gewesen. Entwurf v6 ergaenzt deshalb
`cash_posting_corrected` als lineare, revisionssichere Folgeereigniskette. Die
Historie bleibt unveraendert; nur die effektive Cashstandprojektion folgt der
letzten gueltigen Korrektur.

G-P-07 ist sachlich nicht zutreffend. Eine Verkaufs-/Ziel-ID mit 129 Zeichen ist
bereits am 128-Zeichen-Eingangscontract ungueltig und darf nie zur
Bestaetigungs-ID abgeleitet werden. Der gueltige Randfall ist 128 plus 21 gleich
149 Zeichen und steht bereits im Grenztest. Entwurf v6 ergaenzt lediglich die
Anforderung, dass fail-closed Fehler Eventtyp, Ist- und Maximallaenge
verstaendlich benennen.

**Historienhinweis:** Die nachfolgenden Claude-Freigaben beziehen sich auf den
Stand bis Entwurf v5 und sind keine Freigabe der neuen Korrekturkette in v6.

## Review-Feedback von Claude

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Planreview siehe
`FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md` (C-P-01 bis C-P-15).

### 1. Prüfdimensionen

**Korrektheit vs. Akzeptanzkriterien.** Die fachliche Entscheidung – keine
automatische Cashbuchung, stattdessen ein sichtbarer Statusabschluss – ist
gegenüber einer Automatik die risikoärmere Wahl und schließt die
Doppelbuchungsgefahr aus. Die AK decken den Normalfall ab; der Altbestand ist
nur als Nicht-Scope-Satz erwähnt und nicht als AK geführt (C-01).

**Vertragstreue.** Der bestehende Vertrag ist append-only mit
Konfliktprüfung: `previewTrancheReconciliation` liefert bei bekannter
`actionId` und identischer Ausführung `status: 'duplicate'`
(`tranche-reconciliation.js:255-269`), das Commit weist eine bereits
gespeicherte `actionId` zurück (`:334-335`). Ein nachträglicher
Statusabschluss ist mit diesem Vertrag nicht vereinbar, ohne eine der beiden
Eigenschaften aufzugeben (C-02).

**Fehlerbehandlung.** Der kritischste Pfad ist ungeprüft: das Laden einer real
befüllten v1-Historie nach einer Schemaänderung (C-01).

**Seiteneffekte.** `sameExecution` (`:195`) vergleicht per
`JSON.stringify(comparableAction(...))`. Wird der Cashstatus in den
Auditrecord aufgenommen, ist zu sichern, dass er **nicht** in
`comparableAction` gerät – sonst schlägt jede Wiederholung nach einem
Statuswechsel fälschlich als `RECONCILIATION_ACTION_CONFLICT` fehl.

**Was könnte brechen?** Nach dem Update ist die reale Verkaufsdokumentation
nicht mehr lesbar (C-01) – der schwerste denkbare Schaden dieser
Abschlussrunde, weil er persistente Nutzerdaten betrifft.

### 2. Findings

#### C-01 (Blocker, entspricht C-P-04) – Schemaanhebung macht die bestehende Historie unlesbar

`readReconciliationHistory` (`tranche-reconciliation.js:156-164`) scheitert
fail-closed, sobald `history.schemaVersion !==
TRANCHE_RECONCILIATION_SCHEMA_VERSION` (heute `1`). Eine Anhebung auf `2`
lässt jede bereits gespeicherte Historie mit `RECONCILIATION_HISTORY_INVALID`
(„Der Reconcile-Verlauf ist beschädigt oder nicht unterstützt")
fehlschlagen – der Zugriff auf die reale Verkaufsdokumentation geht verloren.

Erforderlich:
1. AK ergänzen: „Eine bestehende v1-Historie bleibt nach dem Update lesbar und
   wird verlustfrei nach v2 migriert; Altaktionen erhalten
   `cashStatus: legacy_unknown`."
2. Recoverytest mit einer echten v1-Fixture (Struktur, keine
   personenbezogenen Beträge).
3. Vor der ersten Migration im Produktivprofil ein Backup der Registry als
   ausdrücklicher Ablaufschritt.
4. Alternativ prüfen, ob der Cashstatus als optionales Feld ohne
   Versionsanhebung eingeführt werden kann – dann entfällt das
   Migrationsrisiko vollständig. Der Diff-Risiko-Block nennt diese Frage
   bereits; sie ist vor dem ersten Code-Edit zu entscheiden, nicht währenddessen.

#### C-02 (Blocker, entspricht C-P-05) – Abschlussmechanik vertraglich unentschieden

„Explizit und idempotent schließen" ist auf zwei unvereinbare Arten
realisierbar:

- **Mutation** des bestehenden Auditrecords: bricht die Append-only-Eigenschaft
  und macht den Auditverlauf als Nachweis schwächer;
- **Folgeereignis** `cash_posting_confirmed` mit eigener `actionId` und
  Rückverweis: erhält Append-only, erfordert aber eine Ableitungsregel für den
  effektiven Status und eine Konfliktregel bei widersprüchlichen Folgeereignissen.

Der Slice entscheidet das nicht und überlässt damit eine Vertragsfrage der
Implementierung. Empfehlung: Folgeereignis, weil es Append-only, Idempotenz
und Recovery ohne Sonderfälle erhält.

#### C-03 (hoch) – Definition von „vollständig abgeschlossen" fehlt für Altaktionen

Das AK „UI sagt nicht ‚vollständig abgeschlossen', solange Cash offen ist"
kollidiert mit `cashStatus: legacy_unknown`. Aktionen aus der Zeit vor dem
Slice tragen dann dauerhaft einen unklaren Zustand. Zu entscheiden: Gelten sie
als abgeschlossen (Vergangenheit wurde manuell geführt) oder als offen (dann
erzeugt der Slice sofort eine Liste ungeklärter Altfälle)? Beides ist
vertretbar, aber die Wahl gehört in die AK, nicht in die Implementierung.

#### C-04 (mittel) – Idempotenzvertrag muss den Statuswechsel ausklammern

`comparableAction` (`:180-193`) definiert, was als „gleiche Ausführung" gilt.
Der Cashstatus darf dort nicht auftauchen, sonst führt eine wiederholte
Vorschau nach dem Abschluss zu `RECONCILIATION_ACTION_CONFLICT` statt zu
`status: 'duplicate'`. Als AK und als Test aufnehmen.

#### C-05 (mittel) – Nettoerlös als Bezugsgröße nicht fixiert

Der Nutzer bestätigt „bereits berücksichtigt" gegen einen Betrag. Der
Auditrecord führt `actual.netProceeds` (`:219`). Ob der Abschluss diesen
Betrag mitspeichert (und damit später gegen die Rahmendaten prüfbar wird) oder
nur ein Statusflag setzt, ist offen. Ohne gespeicherten Bezugsbetrag ist der
Statusabschluss im Nachhinein nicht überprüfbar – und genau die
Nachvollziehbarkeit ist der Zweck des Slice.

#### C-06 (niedrig) – Dateiliste unvollständig

`app/tranches/depot-tranchen-status.js` und
`app/tranches/tranchen-manager-modal.js` sind für Statusdarstellung und
Bestätigungsdialog wahrscheinlich betroffen, aber nicht gelistet. Das Limit
von zehn Dateien bleibt voraussichtlich eingehalten; die Liste ist dennoch vor
dem Start zu vervollständigen.

### 3. Pre-Mortem

In drei Monaten wird der Tranchenmanager nach einem Update geöffnet und zeigt
statt der Verkaufshistorie den Fehler „Der Reconcile-Verlauf ist beschädigt
oder nicht unterstützt", weil die Schemaversion angehoben und keine Migration
implementiert wurde (C-01). Zweitwahrscheinlichste Ursache: Ein bereits
geschlossener Cashstatus wird bei einer wiederholten Vorschau als
Ausführungskonflikt gewertet, weil der Status in den Vergleich geraten ist
(C-04).

### 4. Review-Ergebnis

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-01, C-02
- **Restrisiken:** C-03 bis C-06; verbleibend das im Slice bereits benannte
  Risiko der Falschbestätigung „bereits reflektiert". Dieses Restrisiko ist
  durch Software nicht auflösbar – wirksam ist allein die Anzeige von
  Nettoerlös, betroffenem Cashstand und Zeitpunkt im Bestätigungsdialog, was
  C-05 voraussetzt

## Re-Review von Claude (zweite Runde)

**Reviewstand:** 2026-08-06. C-01 bis C-06 der ersten Runde sind gelöst. Der
Verzicht auf die Schemaanhebung, das append-only Folgeereignis mit kanonisch
aus `targetActionId` abgeleiteter ID, der Ausschluss aus `comparableAction`,
der persistierte Bezugsbetrag und der Backupschritt über `#fullBackupBtn` sind
tragfähige Antworten. Die Legacy-Regel („abgeschlossen, aber Cashstatus nicht
dokumentiert") ist für den Einzelnutzer die richtige Wahl.

Eine Lücke bleibt und sie ist gravierend.

### Neues Finding

#### C-07 (Blocker, entspricht C-P-20) – Das Folgeereignis muss `actionId` tragen

`readReconciliationHistory` normalisiert **jeden** Record der Historie über
`normalizeRequiredId(record.actionId, 'actionId')`
(`app/tranches/tranche-reconciliation.js:170`) und erzwingt Eindeutigkeit über
alle Records (`:171-174`). Das gilt unabhängig vom Eventtyp.

Die Akzeptanzkriterien nennen für `cash_posting_confirmed` ausschließlich
`confirmationActionId`, `targetActionId`, `confirmedNetProceedsEur`,
`cashBalanceAfterPostingEur` und `confirmedAt` — **kein `actionId`**. Fehlt
dieses Feld im persistierten Record, wirft der nächste Lesevorgang
`RECONCILIATION_HISTORY_INVALID`, und die gesamte Historie inklusive aller
Verkaufsrecords ist unlesbar.

Das ist exakt die Fehlerklasse, die C-P-04 beseitigen sollte, hier durch die
Ersatzlösung wieder eingeführt — mit demselben Schadensbild: Verlust des
Zugriffs auf die reale Verkaufsdokumentation.

Erforderlich:
1. AK ergänzen: „Jedes Folgeereignis besitzt `actionId === confirmationActionId`;
   die abgeleitete ID kollidiert mit keiner Verkaufs-`actionId`."
2. Test: Historie mit gemischten Eventtypen schreiben, neu lesen und beide
   Typen korrekt projizieren — einschließlich der Prüfung, dass
   `previewTrancheReconciliation` (`:255`) ein Folgeereignis nicht
   fälschlich als Verkaufsduplikat findet.

#### C-08 (mittel, entspricht C-P-21) – Bewusste Ausnahme von der Versionierungsregel

Abschnitt 14 des Hauptplans verbietet die stille Änderung eines V1-Vertrags und
verlangt Versionierung. Dieser Slice erweitert `schemaVersion: 1` additiv, ohne
zu versionieren. Für eine lokale Persistenz mit optionalen Zusatzfeldern ist
das die richtige Wahl und die direkte Folge von C-P-04 — aber es ist eine
Ausnahme und gehört ausdrücklich in Abschnitt 14, sonst blockiert die eigene
Regel den Slice.

### Review-Ergebnis (zweite Runde)

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-07
- **Restrisiken:** C-08; verbleibend, dass die Historie nun heterogene
  Recordtypen enthält. Aktuell wird sie außerhalb von
  `tranche-reconciliation.js` nicht gelesen (nur `:254` und `:333`), das Risiko
  ist also klein — aber jede künftige Auswertung über `actions` muss nach
  `eventType` filtern. Das ist dieselbe Fehlerklasse wie F8 im MC-Log und
  sollte in `docs/reference/TRANCHEN_MODULES_README.md` festgehalten werden.

## Drittes Review von Claude

**Reviewstand:** 2026-08-06. C-07 ist vollständig gelöst: reguläres
`actionId`-Feld mit `actionId === confirmationActionId`, reservierter
Namespace, Kollisionsprüfung gegen alle Records, Preview-Filter auf
`sale_reconciled` und der `eventType`-Filtercontract für künftige Consumer
sind einzeln als Akzeptanzkriterien verankert. Damit erfüllt der Folgerecord
den bestehenden Lesercontract in
`tranche-reconciliation.js:170-174`. C-08 ist über die Ausnahme in Abschnitt 14
des Hauptplans geschlossen.

Nachgerechnet: `cash-confirmation:v1:` plus 64 Hexzeichen ergibt 85 Zeichen.
`normalizeRequiredId` (`:42-52`) prüft ausschließlich Länge (128) und
Steuerzeichen, keinen Zeichensatz — der Doppelpunkt ist zulässig.

### Neues Finding

#### C-09 (niedrig, entspricht C-P-27) – Hashquelle verbindlich benennen

Die kanonische ID verlangt SHA-256 in einem **synchronen** Commit-Pfad.
`crypto.subtle.digest` ist asynchron und würde die Atomarität des Lot-/
Registry-Commits aufbrechen. Das Projekt besitzt bereits eine synchrone
Implementierung: `sha256Hex` in
`app/simulator/historical-backtest-contract.js:87`, genutzt von
`fingerprintMonteCarloValue`. Diese Quelle ist im Slice verbindlich zu nennen;
der Import erhöht die Dateizahl nicht.

### Review-Ergebnis (dritte Runde)

- **Status:** freigegeben unter Auflagen
- **Blocker:** keine
- **Auflagen:** C-09 vor dem ersten Code-Edit ergänzen
- **Restrisiken:** C-09; verbleibend das nicht durch Software auflösbare Risiko
  einer falschen Bestätigung „bereits reflektiert". Die AK zu Nettoerlös,
  bestätigtem Cashstand und Zeitpunkt im Dialog sind die richtige und maximal
  mögliche Gegenmaßnahme.

## Viertes Review von Claude

**Reviewstand:** 2026-08-06. Die Ablehnung meiner Importquelle ist sachlich
berechtigt und belegt: `app/simulator/historical-backtest-contract.js:3`
importiert `HISTORICAL_DATA` aus `simulator-data.js`; ein Import von dort in
`app/tranches/` zöge die historischen Marktdaten als Laufzeitabhängigkeit in den
Tranchenbereich. Mein Vorschlag war insoweit die schlechtere Option.

### Neues Finding

#### C-10 (hoch, entspricht C-P-30) – Die private SHA-256-Kopie ist vermeidbar

Die gewählte Ersatzlösung ist die aufwendigste der verfügbaren: rund sechzig
Zeilen Kryptocode entstehen neu in `tranche-reconciliation.js` — in genau dem
Slice, dessen Zweck die Integrität persistierter Realdaten ist. Fehlerquellen
einer Neuimplementierung sind Padding, Endianness, Längenkodierung jenseits
2^32 und UTF-8-Kodierung.

Der Zweck der ID verlangt keinen Hash. Gefordert sind Determinismus,
Eindeutigkeit und Kollisionsfreiheit gegenüber Verkaufs-IDs. Die direkte
Ableitung

```text
cash-confirmation:v1:<normalizedTargetActionId>
```

leistet das besser: Sie ist **injektiv**, also kollisionsfrei per Konstruktion
statt nur praktisch kollisionsfrei, sie ist im Auditverlauf ohne Werkzeug
lesbar, und sie benötigt keinerlei neue Implementierung. Damit entfällt auch
die Notwendigkeit von Standardtestvektoren.

Einzige Nebenbedingung ist das 128-Zeichen-Limit aus
`tranche-reconciliation.js:44`: Der Prefix belegt 21 Zeichen, also ist für neue
Verkaufs-`actionId` eine fail-closed Obergrenze von 107 Zeichen zu setzen — eine
Prüfung, die ohnehin über `normalizeRequiredId` läuft. Die bereits beschlossene
Kollisionsprüfung gegen alle vorhandenen Records bleibt unverändert.

Wird eine feste ID-Länge dennoch bewusst gewünscht, bleibt die private
Implementierung die zweitbeste Option; dann sind die im Slice bereits
vorgesehenen Standardtestvektoren zwingend.

### Review-Ergebnis (vierte Runde)

- **Status:** freigegeben unter Auflagen
- **Blocker:** keine
- **Auflagen:** C-10 entscheiden — direkte Ableitung statt privater
  SHA-256-Kopie; bei Beibehaltung des Hashes Standardvektoren verbindlich
- **Restrisiken:** C-10; verbleibend das nicht durch Software auflösbare Risiko
  einer falschen Bestätigung „bereits reflektiert", das über Nettoerlös,
  Cashstand und Zeitpunkt im Dialog so weit wie möglich abgesichert ist

## Abschliessende Freigabe durch Claude

**Reviewstand:** 2026-08-06. C-10 ist umgesetzt: Die kanonische ID ist die
direkte injektive Ableitung, die private SHA-256-Hilfe entfällt ersatzlos.

Die abweichende Längenregel ist geprüft und **besser als mein Vorschlag**.
Statt neue Verkaufs-IDs auf 107 Zeichen zu kappen, bestimmt der Leser zuerst
den Eventtyp und wendet dann das passende Limit an: 128 Zeichen für
`sale_reconciled.actionId` und `targetActionId`, 149 Zeichen ausschließlich für
Abschlussrecords (21 Zeichen Prefix plus vollständig gültige Ziel-ID); 129
beziehungsweise 150 Zeichen scheitern fail-closed. Das verkleinert den
Namensraum bestehender und künftiger Verkaufs-IDs nicht ohne Not.

Kompatibilität geprüft: Alle Altrecords wurden unter dem bisherigen
128-Zeichen-Limit geschrieben und fallen in den Legacy-Verkaufspfad; sie
bleiben unverändert lesbar. Die Prefix-Reservierung und die Kollisionsprüfung
gegen alle vorhandenen Records bleiben wirksam.

### Review-Ergebnis (abschliessend)

- **Status:** freigegeben
- **Blocker:** keine
- **Offene Findings:** keine
- **Restrisiken:** unverändert das nicht durch Software auflösbare Risiko einer
  falschen Bestätigung „bereits reflektiert"; Nettoerlös, Cashstand und
  Zeitpunkt im Dialog sind die maximal mögliche Absicherung. Das Backup über
  `#fullBackupBtn` vor der Erstnutzung bleibt Pflicht.

## Review-Antworten von Codex

Alle zehn Findings werden in der Sache beantwortet. C-09 bleibt als
historischer Nachweis der Synchronitaetsanforderung erhalten, seine geplante
Hashloesung wird durch die einfachere Direktableitung aus C-10 ersetzt.

- C-01: Es gibt keine Schemaversionsanhebung. Die v1-Historie bleibt
  unveraendert lesbar und wird nur im Speicher als `legacy_unknown`
  projiziert. Recoveryfixture und Registry-Backup vor Erstnutzung sind
  verbindlich.
- C-02: Der Abschluss erfolgt eindeutig als append-only Folgeereignis
  `cash_posting_confirmed`; bestehende Verkaufsrecords werden nie mutiert.
- C-03: `legacy_unknown` gilt operativ als abgeschlossen und erzeugt keinen
  offenen Rueckstand, bleibt aber sichtbar „Cashstatus nicht dokumentiert“ und
  wird nicht als bestaetigter Cashabschluss ausgegeben. Freiwillige
  Nachbestaetigung bleibt moeglich.
- C-04: Cashstatus und Folgeereignisse sind ausdruecklich aus
  `comparableAction` ausgeschlossen; ein Regressionstest sichert die bisherige
  Duplicate-/Conflict-Semantik.
- C-05: Das Folgeereignis speichert Zielverkauf, den centgleich kopierten
  Nettoerloes, bestaetigten Cashstand und Zeitpunkt. Der Dialog zeigt diese
  Bezugsdaten vor der Bestaetigung.
- C-06: `depot-tranchen-status.js` und `tranchen-manager-modal.js` sind in die
  produktive Dateiliste aufgenommen. Dieser damalige Reviewstand umfasste sechs
  JS-Dateien; der spaetere Preflight ergaenzte nach ausdruecklicher
  Nutzerfreigabe `Handbuch.html` als siebte produktive Datei.
- C-07: Jeder Abschlussrecord besitzt das vom bestehenden Leser verlangte
  `actionId`, und es gilt `actionId === confirmationActionId`. Kanonischer
  reservierter Namespace, globale Kollisionspruefung, Mixed-Event-Roundtrip und
  eventtypgefilterte Vorschau sind verbindlich.
- C-08: Die additive v1-Erweiterung ist im Hauptplan als eng begrenzte Ausnahme
  dokumentiert. Sie verlangt Legacy-Lesbarkeit ohne Rewrite, fail-closed
  unbekannte Events und Mixed-Event-Recovery; sie gilt nicht fuer Exporte.
- C-09: Die ID-Ableitung bleibt verbindlich synchron und zieht weder
  `crypto.subtle` noch das Simulator-/Marktdatenmodul in den Tranchenpfad. Eine
  Hashhilfe ist nach C-10 nicht mehr erforderlich.
- C-10: Die Abschluss-ID wird direkt und injektiv als
  `cash-confirmation:v1:<normalizedTargetActionId>` gebildet. Der
  107-Zeichen-Vorschlag fuer neue Verkaufs-IDs wird nicht uebernommen, weil er
  bisher gueltige IDs unnoetig ausschliessen wuerde. Stattdessen gelten nach
  Eventtyp maximal 128 Zeichen fuer Verkauf/Ziel und 149 Zeichen fuer
  Abschluss-IDs; der Leser validiert erst nach Ableitung des Eventtyps.
- G-P-02: Angenommen. Ein bestaetigter Cashstand kann mit einem append-only
  `cash_posting_corrected`-Record berichtigt werden. Revision, Rueckverweis,
  unveraenderter Nettoerloes, Pflichtgrund, lineare Projektion und
  Idempotenz-/Konflikttests sind verbindlich.
- G-P-07: Abgelehnt. 129 Zeichen sind bereits fuer Verkauf/Ziel ungueltig;
  abgeleitet wird nur der gueltige Rand 128 auf 149. Die Fehlermeldung wird
  eventtypspezifisch und verstaendlich getestet.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| C-01 | Claude | Schemaanhebung macht bestehende v1-Historie fail-closed unlesbar; Migration und AK fehlen | angenommen | schemaVersion 1 bleibt; Memory-Projektion, Recoveryfixture und Backup |
| C-02 | Claude | Idempotenter Abschluss: Mutation oder Folgeereignis nicht entschieden | angenommen | append-only Folgeereignis verbindlich |
| C-03 | Claude | Status von Altaktionen gegenüber „vollständig abgeschlossen" undefiniert | angenommen | operativ abgeschlossen, Nachweisstatus `legacy_unknown`, nicht Cash-bestaetigt |
| C-04 | Claude | Cashstatus darf nicht in `comparableAction` geraten | angenommen | Contract und Regressionstest ergaenzt |
| C-05 | Claude | Bezugsbetrag des Abschlusses wird nicht persistiert | angenommen | Nettoerloes, Cashstand und Zeitpunkt im Folgeevent |
| C-06 | Claude | Dateiliste um Statusanzeige und Bestätigungsdialog ergänzen | angenommen | beide Dateien aufgenommen; damaliger Sechs-Dateien-Stand, spaeter genehmigt um `Handbuch.html` auf sieben erweitert |
| C-07 | Claude (Re-Review) | Folgeereignis ohne regulaeres `actionId` macht die Historie unlesbar | angenommen | `actionId === confirmationActionId`; Namespace, Kollision, Mixed-Event und Preview-Test |
| C-08 | Claude (Re-Review) | Additive v1-Erweiterung widerspricht globaler Versionsregel | angenommen | ausdrueckliche testpflichtige Ausnahme im Hauptplan; Consumer-Filter dokumentieren |
| C-09 | Claude (3. Runde) | Hashquelle fuer synchronen Commitpfad nicht verbindlich | teilweise angenommen, durch C-10 ueberholt | synchroner Commit und kein Simulatorimport; Direktableitung braucht keinen Hash |
| C-10 | Claude (4. Runde) | Private SHA-256-Kopie ist vermeidbar; direkte Ziel-ID-Ableitung ist injektiv und lesbar | angenommen mit abweichender Laengenregel | direkte ID; Verkauf/Ziel max. 128, Abschluss max. 149; eventtypspezifischer Leser |
| G-P-02 | Gemini | Tippfehler im bestaetigten Cashstand ist wegen Append-only unkorrigierbar | angenommen | lineares `cash_posting_corrected` mit Revision, Rueckverweis, Pflichtgrund und effektiver Projektion |
| G-P-07 | Gemini | 129-Zeichen-Ziel erzeugt blockierte 150-Zeichen-Bestaetigungs-ID | abgelehnt; Vorbedingung ungueltig | Ziel max. 128, daraus exakt 149; eventtypspezifische verstaendliche Laengenfehler |
| S4-01 | Claude (Code-Review) | Korrekturrevision wird beim Absenden neu abgeleitet statt aus dem Dialog uebernommen; Dialog nennt dann einen ueberholten bisherigen Cashstand, dokumentierte Fail-closed-Sperre greift nicht | angenommen | erledigt: Revision, Action-IDs und Vorgaenger aus Dialogkontext; frischer Verlauf liefert nur den tatsaechlichen bisherigen Cashstand; Zwei-Dialog-Zeuge blockiert vor `confirm()` |
| S4-02 | Claude (Code-Review) | Unlesbares Cash-Audit wird im Manager-Panel als „keine dokumentierten Realverkaeufe" dargestellt | angenommen | erledigt: eigener escaped Fehlerzustand „Liste unvollstaendig", keine Leermeldung |
| S4-03 | Claude (Code-Review) | Altfaelle sind in Panel- und Badge-Zusammenfassung nicht von bestaetigten Verkaeufen unterscheidbar; `legacyCount` wird berechnet und verworfen | angenommen | erledigt: Legacy-Zahl in beiden Zusammenfassungen und kein gruener All-clear-Marker; durch S4-08 als neutraler Hinweis ohne erzwungenes Aufklappen praezisiert |
| S4-04 | Claude (Code-Review) | Abschluss-Idempotenz haengt an `confirmedAt`; Konfliktmeldung behauptet einen abweichenden Payload, der nicht abweicht | angenommen | erledigt: generierter Zeitstempel aus fachlichem Vergleich entfernt; erster Nachweiszeitpunkt bleibt erhalten; symmetrisch auch fuer Korrekturen |
| S4-05 | Claude (Code-Review) | 245 neue Zeilen in `tranchen-manager-page.js` ohne einen einzigen neuen Unit-Test in der geplanten Testdatei | angenommen | erledigt: Manager-Unit-Tests fuer Stale-Dialog, unlesbaren Audit und echten Submit/Flush-Happy-Path |
| S4-06 | Claude (Code-Review) | `getReconciliationCashStatus` liefert `legacyCount`/`confirmedCount` nur im Valid-Zweig | angenommen | erledigt: beide Zaehler in allen Zweigen definiert und getestet |
| S4-07 | Claude (Code-Review) | Legacy-Records werden nicht auf die Record-Schemaversion geprueft | angenommen | erledigt: `schemaVersion: 1` fuer alle Verkaufsrecords verbindlich; Version 99 scheitert fail-closed |
| S4-08 | Claude (Re-Review) | Aufklappbedingung der Balance-/Simulator-Detailanzeige umfasst `legacyCount`; wegen des 5-Sekunden-Intervalls dauerhaft nicht einklappbar, obwohl Altfaelle als abgeschlossen definiert sind | angenommen | erledigt: `legacyCount` aus der Aufklappbedingung entfernt, Legacy-only-Hinweis neutral dargestellt und Negativassertion gegen erzwungenes Oeffnen ergaenzt; im dritten Claude-Review in allen fuenf Zustaenden nachgemessen und bestaetigt |
| S4-09 | Claude (Re-Review) | `RECONCILIATION_CORRECTION_CHAIN_STALE` ist ueber den UI-Pfad unerreichbar; der Nutzer sieht statt „aktuellen Stand neu laden" die Payload-Meldung | als niedriges Restrisiko akzeptiert | bewusst nicht umgesetzt: Der seltene Stale-Dialog bleibt fail-closed und ohne Datenwirkung; betroffen ist allein die weniger handlungsleitende Konfliktformulierung. Wiederaufnahme nur bei realer Fehlinterpretation im Einzelnutzerbetrieb |

## Code-Review von Claude (Slice-4-Implementierung)

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`,
Baseline `68e9e0f`, Arbeitsbaum uncommitted. Geprueft wurde der vollstaendige
Diff der sieben produktiven Dateien gegen den unveraenderten Stand, nicht die
Selbstauskunft der Umsetzung.

### 1. Nachgemessene Gates

Alle Angaben aus „Ausgefuehrte Tests mit Ergebnis" wurden selbst reproduziert,
nicht uebernommen:

| Gate | Angabe im Slice | Eigene Messung |
| --- | --- | --- |
| `npm test` | 19.473/19.473 | 19.473/19.473, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 29 Workflows | 29 registrierte Workflows, Exit 0, 0 Fehler |
| fokussierte Modul-Gates | 309/309 | alle sechs Dateien 0 fehlgeschlagene Assertions |
| `git diff --check` | gruen | gruen |

Die produktive Dateiliste ist eingehalten: genau `Handbuch.html` und die sechs
`app/tranches/`-Module. Es gibt keine achte produktive Datei;
`depot-tranchen-manager.html` ist unveraendert.

### 2. Pruefdimensionen

**Vertragstreue des Lesers (die C-01-Fehlerklasse).** Der neue Leser validiert
Altrecords erheblich schaerfer als der bisherige. Der Stand `HEAD` prueft pro
Record ausschliesslich `actionId` und globale Eindeutigkeit und reicht alles
Uebrige als `cloneJson(record)` durch. `normalizeSaleHistoryRecord`
(`tranche-reconciliation.js:302-367`) verlangt nun zusaetzlich fuer **jeden**
Legacy-Verkauf ein Objekt `actual`, `sharesSold > 0`, `grossProceeds > 0`,
`fees >= 0`, `fees <= grossProceeds`, einen centgenauen `netProceeds`, gueltige
`profileId`/`trancheId` und ein gueltiges `executedAt`. Jeder Verstoss macht
den **gesamten** Verlauf fail-closed unlesbar, also auch alle uebrigen
Verkaeufe.

Das ist geprueft und im Ergebnis unbedenklich: Das Modul besitzt genau einen
Commit (`382b15f`), und der dortige Schreibpfad erzwingt vor dem Persistieren
feldweise exakt dieselben Bedingungen — `sharesSold > 0`, `grossProceeds > 0`,
`fees >= 0`, `fees > grossProceeds` blockierend, `netProceeds` als
`grossProceeds - fees` berechnet, `executedAt` ueber dieselbe
`normalizeExecutionDate`. Ein real geschriebener v1-Record kann die neuen
Pruefungen nicht verletzen. Nachgestellt: ein Record in der Form des alten
Schreibpfads wird gelesen und als `legacy_unknown` projiziert.

**Append-only.** `registryWithAuditRecord` (`:794-809`) haengt an die **rohen**
`persistedActions` an, nicht an die projizierten. Legacy- und Bestandsrecords
werden dadurch byteinhaltlich nie umgeschrieben. Das ist die richtige
Konstruktion und im Browsertest zusaetzlich byte-vergleichend abgesichert.

**ID-Contract.** Nachgerechnet: `cash-confirmation:v1:` sind 21 Zeichen, mit
128er-Ziel exakt 149; `cash-correction:v1:` sind 19 Zeichen, mit 128er-Ziel,
Trenner und Revision 999999 exakt 154. Die Grenzen im Code (149/154) und die
Testassertions stimmen mit den Akzeptanzkriterien ueberein.

**`comparableAction`.** Cashstatus und Folgeereignisse sind ausgeschlossen
(`:632-645`); eine wiederholte Verkaufsvorschau mit geaendertem Cashstatus
liefert nachweislich `duplicate` statt Konflikt. C-04 ist eingehalten.

**Fehlerbehandlung.** Der Leser behandelt korrupte Verlaeufe korrekt
fail-closed. Die daraufsetzende UI-Schicht tut das nicht durchgaengig — siehe
S4-02.

**Seiteneffekte.** `depot-tranchen-status.js` zieht `tranche-reconciliation.js`
und damit `profile-storage.js` neu in den Statusbadge von Balance und
Simulator. Ein Zyklus entsteht nicht, und der Fehlerfall ist dort gekapselt.
Die Nicht-Scope-Regel (keine Abhaengigkeit zu Simulator-/Marktdatenmodulen)
ist eingehalten.

**Was koennte brechen?** Der am wenigsten durchdachte Pfad ist nicht die
Persistenz, sondern die Uebergabe zwischen Dialog und Vorschau. Genau dort
liegt S4-01.

### 3. Findings

#### S4-01 (Blocker) – Die Korrekturkette wird zum Submitzeitpunkt neu abgeleitet; der Dialog nennt dann einen falschen bisherigen Cashstand

`submitCashPosting` (`tranchen-manager-page.js:741-749`) uebergibt an
`previewCashPostingCorrection` nur `targetActionId`, Cashstand, Grund und
Zeitpunkt — **weder `correctionRevision` noch `correctionActionId`,
`actionId` oder `correctsActionId`**. Die Vorschau leitet die Revision deshalb
aus dem beim Absenden frisch gelesenen Verlauf ab
(`tranche-reconciliation.js:1046-1048`), statt die im Dialog erzeugte zu
pruefen.

Damit ist der Gleichheitstest in `:1109-1116` strukturell wirkungslos: Er
vergleicht die soeben aus demselben Verlauf abgeleitete Revision mit sich
selbst und kann nicht mehr fehlschlagen.

Nachgestellt mit zwei Dialogen auf demselben Verkauf (Ausgangscashstand 5000):

```text
Tab A oeffnet Korrekturdialog
   Modal zeigt an: Naechste Korrekturrevision: 1
   Modal zeigt an: Naechster Auditnachweis: cash-correction:v1:sale-1:1
Tab B committet Revision 1 -> Cashstand 4000
Tab A submit -> Ergebnis: ready        (nicht blockiert)
   geschriebene Revision: 2
   geschriebene actionId: cash-correction:v1:sale-1:2
confirm()-Text von Tab A:
   "... Bisheriger Cashstand 5000 EUR, neuer Cashstand 4500 EUR"
   wahr waere:  4000 EUR
```

Drei Auswirkungen, alle auf entscheidungsrelevanten Angaben:

1. Der finale `confirm()`-Dialog nennt einen **bisherigen Cashstand, der seit
   der Zwischenkorrektur nicht mehr gilt**. `previousCashBalance`
   (`:760-762`) stammt aus dem In-Memory-`state`, der zwischen Dialogoeffnung
   und Absenden nicht aufgefrischt wird. Genau dieser Dialog ist laut
   Akzeptanzkriterium die Kontrollinstanz („Der Korrekturdialog zeigt
   bisherigen und neuen Cashstand … vor der expliziten Bestaetigung").
2. Das Modal kuendigt eine Revision und eine kanonische ID an, die nicht
   geschrieben werden. Das Akzeptanzkriterium „Die UI haelt die in der
   Vorschau erzeugte Revision und Korrektur-ID bis zum Commit stabil" ist
   nicht umgesetzt; Stabilitaet entsteht nur zufaellig, solange niemand
   dazwischenschreibt.
3. Die Zusage im Abschnitt „Offene Risiken" — „Bei konkurrierenden Tabs kann
   der spaeter commitende Dialog wegen einer inzwischen veralteten Revision
   fail-closed blockieren" — trifft nicht zu. Er blockiert nicht, sondern
   ueberschreibt in der wirksamen Projektion einen Zwischenstand, den der
   Nutzer nie gesehen hat.

`expectedRegistryRaw` schliesst die Luecke nicht: Es wird erst beim Absenden
gelesen (`:739`) und deckt nur das Fenster zwischen Absenden und Commit ab,
nicht das zwischen Dialogoeffnung und Absenden.

Die Engine kann den Fall bereits korrekt. Gegenprobe mit uebergebener
Dialogrevision:

```text
previewCashPostingCorrection({ ..., correctionRevision: 1 })
-> RECONCILIATION_ACTION_CONFLICT
   actionId cash-correction:v1:sale-1:1 ist bereits mit einem abweichenden Payload belegt.
```

Erforderlich: `submitCashPosting` reicht `correctionRevision`,
`correctionActionId`, `actionId` und `correctsActionId` aus dem Dialogkontext
durch, und `previousCashBalance` wird aus dem beim Absenden gelesenen Verlauf
statt aus dem `state` bestimmt. Beides ist eine Aenderung in einer bereits
freigegebenen Datei.

#### S4-02 (hoch) – Bei unlesbarem Cash-Audit behauptet das Panel, es gebe keine Realverkaeufe

`refreshReconciliationCashStatuses` (`tranchen-manager-page.js:377-397`) setzt
im Fehlerfall `state.reconciliationCashStatuses = []`. Der Renderer
unterscheidet „leer" und „nicht lesbar" nicht:

```text
buildReconciliationCashStatusesHtml([])
-> <h3>Cashstatus der Realverkäufe</h3>
   <p>Noch keine dokumentierten Realverkäufe für dieses Profil.</p>
```

Die Fehlermeldung erscheint in `#reconciliationStatus` **innerhalb** des
Formulars, das Panel wird an `form.parentNode` **nach** dem Formular
angehaengt. Beide stehen gleichzeitig auf dem Schirm und widersprechen
einander; die falsche Aussage ist die konkretere und betrifft persistente
Realdaten.

Der Slice benennt diese Fehlerklasse selbst als Risiko: „Der kompatible
v1-Leser darf korrupte Auditverlaeufe nicht still als leer behandeln." Der
Leser tut es nicht — die UI-Schicht darueber tut es. Der Statusbadge auf
Balance und Simulator macht es richtig (`buildCashStatusNotice` besitzt einen
eigenen `error`-Zweig mit Warnung), das Manager-Panel nicht. Die Inkonsistenz
liegt innerhalb desselben Slice.

Erforderlich: eigener Fehlerzustand im Panel („Cashstatus-Audit nicht lesbar —
die Liste ist unvollstaendig"), nicht die Leermeldung.

#### S4-03 (mittel) – Altfaelle sind in beiden Zusammenfassungen nicht von bestaetigten Verkaeufen zu unterscheiden

Gemessen mit einer Historie, die ausschliesslich aus Legacy-Verkaeufen besteht:

```text
Projektion: cashStatus legacy_unknown | isPending false | isLegacy true
Panel-Zusammenfassung: "Kein offener manueller Cashrückstand."
Badge:                 "✅ Kein offener manueller Cashrückstand aus Realverkäufen."
Badge-Objekt: pendingCount 0 | legacyCount 1 | confirmedCount 0
```

`getReconciliationCashStatus` berechnet `legacyCount` und `confirmedCount`,
`buildCashStatusNotice` verwendet beide nicht. Im Tranchenmanager korrigiert
die Zeilendarstellung den Eindruck, weil dort je Verkauf „Abgeschlossen
(Altfall – Cashstatus nicht dokumentiert)" steht. Auf Balance und Simulator
gibt es keine Zeilen — dort ist das gruene Haekchen die einzige Aussage zum
Cash, obwohl fuer diese Verkaeufe gerade nicht dokumentiert ist, ob der Erloes
je in der Liquiditaet angekommen ist.

Das Akzeptanzkriterium verlangt, dass Altfaelle „nicht als ‚Cash bestaetigt'
erscheinen" duerfen. Wortwoertlich ist es eingehalten, der Sache nach nicht:
Der Nutzer kann aus dem Badge nicht ablesen, dass ueberhaupt undokumentierte
Faelle existieren. Die dafuer noetige Zahl ist bereits berechnet.

#### S4-04 (mittel) – Die Idempotenz des Abschlusses haengt am Zeitstempel; die Konfliktmeldung ist dann sachlich falsch

`sameConfirmationRecord` (`tranche-reconciliation.js:952-961`) vergleicht
`confirmedAt` mit; die UI erzeugt diesen Wert bei jedem Absenden neu
(`tranchen-manager-page.js:754`). Gemessen:

```text
Bestaetigung (Cashstand 5000, 10:00:00)     -> ready, angehaengt
Wiederholung (Cashstand 5000, 10:00:05)     -> RECONCILIATION_ACTION_CONFLICT
   "actionId cash-confirmation:v1:sale-legacy-1 ist bereits mit einem
    abweichenden Payload belegt."
```

Der Payload ist bis auf die Uhrzeit identisch; die Meldung schickt den Nutzer
auf die Suche nach einer inhaltlichen Abweichung, die es nicht gibt. Das
Akzeptanzkriterium nennt als Konfliktgruende ausdruecklich „abweichender
Betrag, Cashstand oder Zielbezug" — den Zeitpunkt nicht.

Einordnung: Der In-Memory-Retry nach einem Persistenzfehler (`:1330`)
verwendet dasselbe `pending`-Objekt und ist deshalb korrekt idempotent. Im
selben Tab blendet die Statusprojektion den Bestaetigungsknopf danach aus.
Erreichbar bleibt der Fall ueber einen zweiten Tab mit veralteter Statusliste
— dieselbe Konstellation wie S4-01, dort allerdings ohne Blockade.

#### S4-05 (mittel) – Die 245 neuen Zeilen der Managerseite haben keinen einzigen neuen Unit-Test

`tests/tranchen-manager-page.test.mjs` ist unveraendert (`git diff` leer),
obwohl `app/tranches/tranchen-manager-page.js` um 245 Zeilen waechst und der
Slice diese Testdatei unter „Geplante Tests" ausdruecklich auffuehrt. In
dieser Datei liegen `refreshReconciliationCashStatuses`,
`openCashStatusWorkflow`, `submitCashPosting` und `executeCashPosting` — also
die gesamte Ablauforchestrierung des neuen Workflows.

S4-01, S4-02 und S4-04 liegen genau dort beziehungsweise im Zusammenspiel
dieser Datei mit dem Renderer. Keiner der drei ist von einem Gate sichtbar:
Die Modultests pruefen `tranche-reconciliation.js` isoliert und finden dort
nichts, weil die Engine korrekt ist; der Browsertest faehrt einen seriellen
Einzeltab-Happy-Path und kann eine veraltete Statusliste nicht erzeugen.

Die Angabe „fokussierte Modul-Gates: 309/309 Assertions gruen (…
Manager-Page/-State/-Renderer/-Modal …)" zaehlt diese Datei mit und
suggeriert eine Abdeckung, die fuer den neuen Code nicht besteht. Das ist
keine falsche Zahl, aber eine irrefuehrende Aufzaehlung.

#### S4-06 (niedrig) – `getReconciliationCashStatus` liefert je nach Zweig eine andere Objektform

Gemessen: Im `valid`-Zweig sind `legacyCount` und `confirmedCount` Zahlen, in
den Zweigen `error` und `not_loaded` fehlen beide Felder und sind `undefined`.
Ein kuenftiger Consumer mit `if (status.legacyCount > 0)` liest im Fehlerfall
still `undefined` statt eines definierten Werts. Beide Felder gehoeren mit `0`
in alle Zweige.

#### S4-07 (niedrig) – Legacy-Records werden nicht auf die Schemaversion geprueft

`normalizeSaleHistoryRecord` (`:303`) prueft `record.schemaVersion` nur fuer
`!legacy`. Ein Altrecord mit `schemaVersion: 99` passiert den Leser und wird
als `legacy_unknown` projiziert. Der Container wird geprueft, der Record nicht.
Praktisch heute folgenlos, weil nur Version 1 je geschrieben wurde; als
bewusste Entscheidung gehoert es dennoch in den Contract, sonst ist die
Fail-closed-Regel fuer Altdaten unvollstaendig.

### 4. Restrisiken

- Die Falschbestaetigung „bereits reflektiert" bleibt durch Software nicht
  aufloesbar; das ist unveraendert und im Slice korrekt benannt.
- Die verschaerfte Leservalidierung ist fuer selbst geschriebene Records
  bewiesen unbedenklich, nicht jedoch fuer eine Registry, die aus einem
  fremden Backup oder von Hand eingespielt wurde. Dort macht ein einziger
  strukturell abweichender Altrecord den gesamten Verlauf unlesbar. Das
  Pflichtbackup vor Erstnutzung ist deshalb keine Formalie.
- Der gesamte Verlauf wird pro Cash-Commit fuenfmal vollstaendig validiert
  (`requireTargetSale` zweimal, `registryWithAuditRecord`, die
  Vorabpruefung vor dem Schreiben, die abschliessende Projektion). Bei der zu
  erwartenden Recordzahl irrelevant, aber es ist der Grund, warum ein spaeter
  wachsender Verlauf hier zuerst spuerbar wuerde.
- `depot-tranchen-status.js` enthaelt reine Einrueckungsaenderungen an
  unveraenderten Zeilen. Das erschwert kuenftige Diffs ohne Gegenwert.

### 5. Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb — die wahrscheinlichste Ursache:

Der Tranchenmanager ist in zwei Fenstern offen, weil parallel in Balance
gearbeitet wurde. Ein bestaetigter Cashstand wird im einen Fenster korrigiert.
Spaeter wird im zweiten, seit Stunden offenen Fenster erneut korrigiert. Der
Bestaetigungsdialog nennt als bisherigen Stand einen Wert, der laengst
ueberholt ist, der Nutzer bestaetigt ihn als plausibel, und die wirksame
Projektion springt auf eine Zahl, die aus einer veralteten Annahme abgeleitet
wurde. Der Auditverlauf bleibt dabei formal einwandfrei und linear — der
Fehler ist gerade deshalb schwer zu finden (S4-01).

Zweitwahrscheinlichste Ursache: Nach dem Zurueckspielen eines aelteren oder
fremden Backups ist der Verlauf nicht lesbar, und der Tranchenmanager meldet
„Noch keine dokumentierten Realverkäufe für dieses Profil". Der Nutzer
schliesst daraus, seine Verkaufsdokumentation sei verloren, und beginnt sie
neu zu erfassen — obwohl die Records unveraendert vorliegen (S4-02).

### 6. Review-Ergebnis

- **Status:** blockiert
- **Blocker:** S4-01
- **Weitere Findings:** S4-02 (hoch), S4-03 (mittel), S4-04 (mittel),
  S4-05 (mittel), S4-06 (niedrig), S4-07 (niedrig)
- **Nicht beanstandet:** Persistenz- und Auditkern. Append-only,
  Legacy-Lesbarkeit ohne Rewrite, ID-Ableitung, Laengencontract,
  `comparableAction`-Ausschluss, Kettenvalidierung und Rollback sind an der
  Ursache richtig gebaut und einzeln nachgemessen. Alle sieben Findings liegen
  in der Praesentations- und Ablaufschicht, nicht im Contract.
- **Empfehlung:** S4-01 und S4-02 zusammen beheben — beide betreffen
  `tranchen-manager-page.js` und beide erzeugen konkrete falsche Angaben in
  genau den Anzeigen, deren Wahrheitstreue der Zweck dieses Slice ist. S4-05
  gehoert unmittelbar dazu: Ohne Test in `tranchen-manager-page.test.mjs`
  waere derselbe Fehler beim naechsten Mal wieder unsichtbar.

## Review-Antworten auf Claude-Code-Review

**Korrekturstand:** 2026-08-07. S4-01 bis S4-07 wurden angenommen und
technisch nachgebessert. Diese Selbstauskunft ist keine Freigabe; Claude oder
Gemini muessen den neuen Stand erneut extern pruefen.

- **S4-01:** Der beim Oeffnen festgehaltene Dialogkontext traegt
  `correctionRevision`, `correctionActionId`, `actionId` und
  `correctsActionId` bis zur Vorschau und zum Commit. Der beim Submit frisch
  gelesene Verlauf darf nur den tatsaechlich wirksamen bisherigen Cashstand
  liefern. Hat ein zweiter Dialog inzwischen dieselbe Revision belegt oder den
  Vorgaenger veraendert, scheitert die Vorschau vor dem nativen
  Bestaetigungsdialog; es wird keine neue Revision still abgeleitet.
- **S4-02:** Der Manager-Renderer erhaelt neben der Statusliste einen eigenen
  escaped Fehlerzustand. Ein unlesbarer Verlauf zeigt „Cashstatus-Audit nicht
  lesbar - die Liste ist unvollstaendig“ und niemals die Leermeldung.
- **S4-03:** Manager-Panel und Suite-Badge nennen die Zahl der
  `legacy_unknown`-Verkaeufe. Legacy-only verwendet keinen gruenen All-clear-
  Marker und oeffnet eingeklappte Balance-Details sichtbar.
- **S4-04:** `confirmedAt` beziehungsweise `correctedAt` bleiben persistierter
  Nachweiszeitpunkt des zuerst angenommenen Events, sind aber kein fachlicher
  Konfliktbestandteil. Eine inhaltlich gleiche Wiederholung mit neu erzeugtem
  UI-Zeitstempel liefert `duplicate`; Cashstand, Nettoerloes, Ziel, Vorgaenger,
  Revision und Korrekturgrund bleiben konfliktwirksam.
- **S4-05:** `tests/tranchen-manager-page.test.mjs` prueft jetzt den echten
  Zwei-Dialog-Stale-Pfad, den unlesbaren Manager-Audit und den vollstaendigen
  Bestaetigungs-Submit bis zum Facade-Flush samt unveraendertem Verkaufsrecord.
- **S4-06:** `legacyCount` und `confirmedCount` sind in `valid`, `error` und
  `not_loaded` immer als Zahlen vorhanden.
- **S4-07:** Auch ein Record ohne `eventType` muss die unterstuetzte
  `schemaVersion: 1` tragen. Nur der fehlende Eventtyp aktiviert die
  Legacy-Projektion; eine fremde Recordversion bleibt fail-closed.

### Nachweise nach der Korrektur

- fokussierte sechs Modul-Gates: 342/342 Assertions;
- `npm test`: 169 Testdateien, 19.506/19.506 Assertions, keine Fehler;
- `npm run test:browser`: 29/29 Workflows;
- `npm run test:coverage`: 19.506/19.506 Assertions, 79,34 Prozent
  approximative Line-Coverage (44.296/55.830), alle Pflichtgates bestanden;
- produktiver Scope weiterhin exakt sieben Dateien; keine Engine-, `dist`- oder
  EXE-Artefakte betroffen.

**Freigabestatus:** technisch nachgebessert; externes Re-Review, Freigabe und
Commit ausstehend.

## Code-Re-Review von Claude (Slice 4, zweite Runde)

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`,
Baseline `68e9e0f`, Arbeitsbaum uncommitted. Jede der sieben Nachbesserungen
wurde einzeln gegen den beanstandeten Zustand nachgemessen; die Selbstauskunft
der Umsetzung wurde nicht uebernommen.

### 1. Verifikation S4-01 bis S4-07

**S4-01 (Blocker) – behoben, an der Ursache.** `openCashStatusWorkflow`
uebergibt jetzt `correctsActionId: status.effectiveActionId` in den
Modalkontext, `readCashPostingForm` reicht den vollstaendigen Kontext durch,
und `submitCashPosting` uebergibt `correctionRevision`, `correctionActionId`,
`actionId` und `correctsActionId` an die Vorschau. Damit vergleicht der
Kettentest nicht mehr eine soeben abgeleitete Revision mit sich selbst.
Derselbe Zwei-Dialog-Zeuge wie in Runde 1, jetzt ueber den echten UI-Pfad:

```text
Dialog Tab A: Revision 1 | cash-correction:v1:sale-1:1 | bisher wirksam 5000
Tab B committet Revision 1 -> 4000
Tab A submit -> blockiert mit RECONCILIATION_ACTION_CONFLICT
```

Vorher: `ready`, Revision 2 geschrieben. Der zweite Teil des Findings ist
ebenfalls behoben: `previousCashBalance` stammt jetzt aus
`preview.cashStatus` und damit aus dem beim Absenden gelesenen Verlauf.
Gemessen liefert es **4000** — den tatsaechlich wirksamen Stand — wo vorher
5000 aus dem veralteten `state` angezeigt wurde. Der neue Unit-Test sichert
zusaetzlich die schaerfere Eigenschaft ab, dass der Abbruch **vor** dem
`confirm()`-Dialog erfolgt (`confirmCalls === 0`); das ist ein besseres Orakel
als die blosse Pruefung auf einen Fehler.

**S4-02 (hoch) – behoben.** `buildReconciliationCashStatusesHtml` besitzt einen
eigenen, dem Leerzweig vorgelagerten Fehlerzustand. Gemessen:

```text
<h3>Cashstatus der Realverkäufe</h3>
<p ... role="alert"><strong>Cashstatus-Audit nicht lesbar – die Liste ist
unvollständig.</strong><br>Cashstatus-Audit blockiert: …</p>
```

Die Leermeldung erscheint nicht mehr. Der Fehlertext wird ueber `escapeHtml`
gefuehrt, obwohl er aus einer internen Fehlermeldung stammt — richtig, weil er
normalisierte Ziel-IDs enthalten kann. Der Unit-Test prueft ausdruecklich auch
die Abwesenheit der alten Aussage, nicht nur die Anwesenheit der neuen.

**S4-03 (mittel) – behoben.** Beide Zusammenfassungen weisen Altfaelle jetzt
getrennt aus. Gemessen mit reiner Legacy-Historie:

```text
Panel: "Kein offener manueller Cashrückstand. 1 Altverkauf/Altverkäufe ohne
        dokumentierten Cashstatus; operativ abgeschlossen, aber nicht als
        cashbestätigt ausgewiesen."
Badge: legacyCount 1, gruener All-clear-Marker entfaellt
```

Das gruene Haekchen erscheint nur noch, wenn `legacyCount === 0`. Die
Folgewirkung dieser Aenderung ist allerdings nicht zu Ende gedacht — siehe
S4-08.

**S4-04 (mittel) – behoben.** `confirmedAt` und `correctedAt` sind aus
`sameConfirmationRecord` und `sameCorrectionRecord` entfernt. Gemessen:

```text
gleicher Cashstand, 5 s spaeter -> duplicate
   erhaltener Zeitpunkt: 2026-08-07T10:00:00.000Z (der erste)
abweichender Cashstand         -> RECONCILIATION_ACTION_CONFLICT
```

Die Konfliktschwelle liegt jetzt genau auf den Groessen, die das
Akzeptanzkriterium nennt. Geprueft, ob dadurch echte Ereignisse verschluckt
werden koennen: Eine zweite echte Korrektur traegt eine andere Revision und
damit eine andere kanonische ID, ein zweiter Abschluss pro Verkauf ist
ausgeschlossen. Es gibt keinen Fall, in dem zwei fachlich verschiedene
Ereignisse jetzt als `duplicate` zusammenfallen. Nebeneffekt in die richtige
Richtung: Der In-Memory-Retry nach einem Persistenzfehler ist damit auch dann
idempotent, wenn der erste Schreibversuch bereits gelandet war.

**S4-05 (mittel) – behoben.** `tests/tranchen-manager-page.test.mjs` waechst um
181 Zeilen mit drei Tests, die genau die beanstandeten Pfade treffen: Test 10
den veralteten Korrekturdialog, Test 11 den unlesbaren Audit einschliesslich
der Negativassertion gegen die Leermeldung, Test 12 den echten Submit- und
Flush-Weg des Orchestrators. Die Luecke zwischen isolierten Modultests und
seriellem Browser-Happy-Path ist damit geschlossen.

**S4-06 (niedrig) – behoben.** Gemessen: `legacyCount 0 | confirmedCount 0` in
den Zweigen `error` und `not_loaded`; vorher `undefined`.

**S4-07 (niedrig) – behoben, mit gepruefter Rueckwaertsvertraeglichkeit.**
`normalizeSaleHistoryRecord` prueft `schemaVersion` jetzt fuer alle
Verkaufsrecords, auch fuer Legacy. Das ist genau die Verschaerfung, die die
C-01-Fehlerklasse ausloesen koennte, deshalb nachgeprueft statt angenommen:
`createAuditRecord` in `382b15f` schreibt `schemaVersion` als erstes Feld
jedes Records, und das Modul besitzt nur diesen einen Commit. Gemessen:

```text
Altrecord mit schemaVersion 1 (so schreibt 382b15f) -> legacy_unknown
schemaVersion 99                                    -> RECONCILIATION_HISTORY_INVALID
```

Real geschriebene Altrecords bleiben lesbar. Zusaetzlich ist die reine
Einrueckungsaenderung in `depot-tranchen-status.js` zurueckgenommen; `git diff`
und `git diff -w` melden beide 84 Einfuegungen und 0 Loeschungen, die Datei ist
jetzt rein additiv geaendert.

### 2. Gates

Alle Angaben selbst reproduziert:

| Gate | Angabe im Slice | Eigene Messung |
| --- | --- | --- |
| `npm test` | 19.506/19.506 | 19.506/19.506, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 29 Workflows | 29/29 bestanden, Exit 0 |
| `git diff --check` | gruen | gruen |
| Dateigrenze | sieben produktive Dateien | genau sieben; keine achte |

### 3. Neue Findings

#### S4-08 (mittel) – Altfaelle reissen die Balance-/Simulator-Detailanzeige dauerhaft auf

Die S4-03-Nachbesserung hat die Aufklappbedingung in
`renderTranchenStatusBadge` (`depot-tranchen-status.js:255-260`) um
`legacyCount > 0` erweitert:

```js
if (reconciliationCashStatus.pendingCount > 0
    || reconciliationCashStatus.legacyCount > 0
    || reconciliationCashStatus.state === 'error') {
    const collapsedDetails = container.closest?.('details');
    if (collapsedDetails) collapsedDetails.open = true;
}
```

`initTranchenStatus` ruft `renderTranchenStatusBadge` zusaetzlich alle fuenf
Sekunden per `setInterval` auf. Fuer die beiden anderen Ausloeser ist das
richtig: Ein offener Cashrueckstand und ein beschaedigter Audit sind
Handlungsaufforderungen und verschwinden, sobald der Nutzer handelt. Der
Legacy-Zustand verschwindet dagegen nur, wenn fuer **jeden** Altverkauf
freiwillig ein Nachweis ergaenzt wird. Fuer ein Profil mit Verkaeufen aus der
Zeit vor diesem Slice ist die Detailanzeige auf Balance und Simulator damit
dauerhaft nicht mehr einklappbar — jedes Zuklappen wird binnen fuenf Sekunden
rueckgaengig gemacht.

Das steht gegen das eigene Akzeptanzkriterium: „Legacy-Aktionen blockieren den
neuen Workflow nicht und werden nicht als `pending`-Rueckstand behandelt. Fuer
den Workflow gelten sie als **abgeschlossen**." Verstaerkt wird es dadurch,
dass `buildCashStatusNotice` den Legacy-Hinweis in
`class="tranchen-warning"` ausgibt — ein als abgeschlossen definierter Zustand
wird also im Warnstil und mit erzwungener Sichtbarkeit dauerpraesentiert.

Die Entscheidung ist bewusst getroffen und im Testfall festgeschrieben
(`assertEqual(details.open, true, …)`); beanstandet wird nicht die Absicht,
sondern die nicht mitbedachte Dauerwirkung. Angemessen waere, das Aufklappen
auf `pendingCount > 0` und `state === 'error'` zu begrenzen und den
Legacy-Hinweis in neutralem Stil im Badge zu belassen — sichtbar, aber ohne
Handlungsdruck. Die Aussage selbst ist richtig und soll bleiben.

#### S4-09 (niedrig) – Die fuer diesen Fall gebaute Fehlermeldung ist jetzt unerreichbar

Seit die UI die Dialogrevision durchreicht, kollidiert ein veralteter
Korrekturdialog immer schon auf der kanonischen ID und wird vom
`existing`-Zweig abgefangen. Der Nutzer sieht deshalb
`RECONCILIATION_ACTION_CONFLICT` — „ist bereits mit einem abweichenden Payload
belegt". Die eigens fuer diesen Fall formulierte Meldung
`RECONCILIATION_CORRECTION_CHAIN_STALE` („Cashkorrektur muss Revision N und
Vorgaenger X verwenden. Bitte aktuellen Stand neu laden.",
`tranche-reconciliation.js:1109-1116`) ist ueber den UI-Pfad nicht mehr
erreichbar: Revisionen wachsen nur, die Dialogrevision kann der Registry
deshalb nie voraus sein, und jede Abweichung entsteht durch angehaengte
Korrekturen, die die ID bereits belegen.

Sachlich ist das Verhalten korrekt und fail-closed. Der Nutzer bekommt aber
die technisch praezisere statt der handlungsleitenden Meldung: Der Payload
weicht ab, weil ein neuerer Stand existiert — genau das sagt der Satz nicht.
Der neue Unit-Test schreibt die schwaechere Formulierung zudem fest
(`textContent.includes('abweichenden Payload')`). Empfehlung: Im
`existing`-Zweig fuer Korrekturen den Hinweis „Der Cashstand wurde
zwischenzeitlich geaendert; bitte aktuellen Stand laden" ergaenzen oder die
Reihenfolge der beiden Pruefungen tauschen.

### 4. Restrisiken

- Die Falschbestaetigung „bereits reflektiert" bleibt durch Software nicht
  aufloesbar; unveraendert und im Slice korrekt benannt.
- Die verschaerfte Leservalidierung ist fuer selbst geschriebene Records
  bewiesen unbedenklich, nicht jedoch fuer eine von Hand oder aus fremder
  Quelle eingespielte Registry. Ein einziger strukturell abweichender
  Altrecord macht dort den gesamten Verlauf unlesbar. Das Pflichtbackup vor
  Erstnutzung bleibt deshalb ein echter Ablaufschritt, keine Formalie.
- Das Modal zeigt weiterhin den beim Oeffnen gelesenen „bisher wirksamen
  Cashstand". Bei einem veralteten Dialog ist diese Anzeige falsch, bis der
  Nutzer absendet; der Absendeweg blockiert dann fail-closed, sodass daraus
  keine Fehlbuchung entstehen kann. Der Rest ist eine Anzeigeverzoegerung,
  keine Datenwirkung.
- Der Verlauf wird pro Cash-Commit mehrfach vollstaendig validiert. Bei der
  erwartbaren Recordzahl irrelevant; es bleibt die Stelle, an der ein stark
  wachsender Verlauf zuerst spuerbar wuerde.

### 5. Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb — die wahrscheinlichste Ursache ist nicht mehr die
Korrekturkette, sondern der Umgang mit einer fremden Datenquelle: Nach dem
Zurueckspielen eines aelteren oder von Hand bearbeiteten Backups verletzt ein
einzelner Altrecord eine der jetzt strengeren Feldpruefungen, und der gesamte
Verlauf ist fail-closed unlesbar. Anders als vor dem Slice meldet die
Oberflaeche das inzwischen korrekt als „Liste unvollstaendig" statt als leer
(S4-02), sodass der Nutzer nicht mehr faelschlich auf Datenverlust schliesst —
aber der Zugriff auf die Verkaufsdokumentation ist bis zur manuellen
Bereinigung blockiert.

Zweitwahrscheinlichste Ursache: Der Nutzer gewoehnt sich daran, dass die
Tranchen-Detailanzeige auf Balance und Simulator wegen alter Verkaeufe immer
aufgeklappt und im Warnstil ist, und uebersieht deshalb einen echten offenen
Cashrueckstand in derselben Flaeche (S4-08).

### 6. Re-Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine — S4-01 ist an der Ursache behoben und mit demselben
  Zeugen nachgemessen, der ihn belegt hat
- **Im Re-Review bestaetigt:** S4-01 bis S4-07, jeweils einzeln nachgemessen
- **Offene Findings:** S4-08 (mittel), S4-09 (niedrig) — beide reine
  Darstellungsfragen ohne Datenwirkung
- **Empfehlung:** S4-08 vor dem Commit mitnehmen. Es ist eine Zeile
  (`legacyCount > 0` aus der Aufklappbedingung entfernen) plus die Anpassung
  der zugehoerigen Testassertion, und es beruehrt die beiden Seiten, die der
  Nutzer taeglich sieht. S4-09 kann in eine spaetere Runde.

## Abschlussantwort auf Claudes Re-Review

**Korrekturstand:** 2026-08-09. Der Nutzer hat der Empfehlung zugestimmt,
S4-08 vor dem Commit umzusetzen und S4-09 als niedriges Restrisiko bewusst
zurueckzustellen.

- **S4-08:** `renderTranchenStatusBadge` oeffnet eingeklappte Details nur noch
  bei einem echten offenen Cashrueckstand oder einem unlesbaren Audit. Ein
  Legacy-only-Stand bleibt mit Anzahl und fehlendem Nachweis sichtbar, wird
  aber neutral statt im Warnstil dargestellt. Der Test sichert sowohl den
  sichtbaren Hinweis als auch `details.open === false` ab.
- **S4-09:** Keine Codeaenderung. Der veraltete Korrekturdialog wird weiterhin
  vor Bestaetigung und Persistenz fail-closed blockiert. Die verbleibende
  Abweichung betrifft ausschliesslich die Formulierung „abweichender Payload"
  statt der handlungsleitenderen Aufforderung zum Neuladen. Fuer den einzigen
  Nutzer rechtfertigt dieser seltene, datenwirkungsfreie Fall keine weitere
  Aenderungs- und Re-Review-Runde. Das Finding wird wieder aufgenommen, falls
  die Meldung im realen Betrieb fehlinterpretiert wird.

### Nachweise nach S4-08

- fokussierter Test `tests/depot-tranchen-status.test.mjs`: 40/40 Assertions;
- `npm test`: 169 Testdateien, 19.507/19.507 Assertions, keine Fehler und keine
  offenen Handles;
- `npm run test:browser`: 29/29 Workflows;
- `npm run test:coverage`: 19.507/19.507 Assertions, 79,33 Prozent
  approximative Line-Coverage (44.291/55.829), alle Pflichtgates bestanden;
- produktiver Scope weiterhin exakt sieben Dateien; keine Engine-, `dist`- oder
  EXE-Artefakte betroffen.

**Freigabestatus:** Claudes Re-Review bleibt freigegeben und sein empfohlenes
Finding S4-08 ist umgesetzt. S4-09 ist per Nutzerentscheidung akzeptiertes
niedriges Restrisiko. Finale Gemini-Scope-/Abnahmepruefung und lokaler Commit
stehen noch aus; ein Push ist nicht freigegeben.

## Drittes Review von Claude (Slice 4, Abschluss S4-08/S4-09)

**Reviewstand:** 2026-08-09, Branch `codex/fokussierte-abschlusshaertung`,
Baseline `68e9e0f`, Arbeitsbaum uncommitted.

### 1. S4-08 – behoben, in allen fuenf Zustaenden nachgemessen

Die Aufklappbedingung in `depot-tranchen-status.js` enthaelt `legacyCount`
nicht mehr, und der Legacy-only-Hinweis steht nicht mehr in
`class="tranchen-warning"`, sondern im neutralen Stil des Entwarnungszweigs.
Der Hinweistext selbst ist unveraendert erhalten — auch im Mischfall, in dem er
an die Pending-Warnung angehaengt wird.

Gemessen wurde nicht der Erstaufbau, sondern der kritische Ablauf: rendern,
`details.open = false` setzen (der Nutzer klappt zu) und erneut rendern, also
genau das, was das 5-Sekunden-Intervall aus `initTranchenStatus` tut.

| Zustand | `details.open` nach Zuklappen und Re-Render | Stil | Cash-Hinweis |
| --- | --- | --- | --- |
| nur Altfaelle | **false** (vorher true) | neutral | ℹ️ Kein offener Rueckstand + Altfallsatz |
| alles bestaetigt | false | neutral | ✅ Kein offener Rueckstand |
| nur offener Rueckstand | **true** | Warnung | ⚠️ 1 Realverkauf mit offener Cashbuchung |
| offener Rueckstand + Altfall | **true** | Warnung | ⚠️ beide Saetze |
| korrupter Audit | **true** | Warnung | ⚠️ Audit beschaedigt, Cashaussagen blockiert |

Die drei Zustaende, die aufklappen **muessen**, tun es weiterhin; nur der als
abgeschlossen definierte Legacy-Zustand tut es nicht mehr. Der Unit-Test
sichert das jetzt mit einer Negativassertion
(`assertEqual(details.open, false, …)`) statt wie zuvor mit dem Gegenteil.

Auf Regression gegen die vorherige Runde geprueft: S4-01 bis S4-07 wurden mit
denselben Zeugen erneut gemessen und sind unveraendert behoben — der
konkurrierende Korrekturdialog blockiert weiterhin fail-closed, der
`previousCashBalance` liefert weiterhin den frischen Wert, die
Zeitstempelidempotenz, der Fehlerzustand des Panels, die Zaehlerform und die
Schemapruefung ebenfalls.

### 2. S4-09 – Zuruecksetzung akzeptiert

Die Entscheidung, S4-09 als niedriges Restrisiko nicht umzusetzen, ist
sachlich richtig und deckt sich mit der eigenen Einstufung des Findings sowie
mit der Empfehlung aus Runde 2, es in eine spaetere Runde zu geben. Das
Verhalten bleibt fail-closed und ohne Datenwirkung; betroffen ist allein die
Formulierung der Konfliktmeldung.

Eine Nebenwirkung bleibt bestehen und gehoert benannt: Der Zweig
`RECONCILIATION_CORRECTION_CHAIN_STALE` (`tranche-reconciliation.js:1109-1116`)
ist ueber den UI-Pfad nicht mehr erreichbar, bleibt aber im Modul stehen. Ein
spaeterer Leser kann daraus schliessen, dass diese Meldung im Stale-Fall
erscheint — sie erscheint nicht. Eine Zeile Kommentar an der Stelle waere
ausreichend.

### 3. Gates

| Gate | Eigene Messung |
| --- | --- |
| `npm test` | 19.507/19.507, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 29/29 bestanden |
| `git diff --check` | gruen |
| Dateigrenze | genau sieben produktive Dateien |

### 4. Keine neuen Findings – gepruefte Dimensionen

Die Aenderung dieser Runde ist klein (eine entfernte Bedingung, eine
geaenderte Stilklasse), die Pruefung war deshalb gezielt:

- **Korrektheit:** alle fuenf Kombinationen aus Pending, Legacy, Bestaetigt und
  Fehlerzustand einzeln gemessen, inklusive des Mischfalls mit eindeutigen
  Action-IDs.
- **Vertragstreue:** Der Legacy-Hinweis bleibt inhaltlich unveraendert; das
  Akzeptanzkriterium „Altfaelle gelten als abgeschlossen und duerfen nicht als
  Cash bestaetigt erscheinen" ist jetzt in Text **und** Verhalten erfuellt.
- **Fehlerbehandlung:** Der Fehlerzustand klappt weiterhin auf und behaelt den
  Warnstil; er wird durch die Aenderung nicht mit dem Legacy-Zweig vermischt.
- **Seiteneffekte:** keine Aenderung an Leser, Projektion oder Commitpfad;
  S4-01 bis S4-07 gegengemessen.

**Groesstes Restrisiko:** Der Legacy-Hinweis ist auf Balance und Simulator nur
noch sichtbar, wenn der Nutzer die Detailanzeige oeffnet. Das ist die bewusst
gewaehlte Kehrseite der Korrektur und richtig, weil Altfaelle keine
Handlungsaufforderung sind — der Tranchenmanager weist sie unabhaengig davon je
Verkauf aus. Es bleibt aber die einzige Stelle, an der Information gegen
Aufdringlichkeit getauscht wurde.

**Unter welcher Bedingung diese Aenderung brechen wuerde:** Wenn kuenftig ein
Cashzustand eingefuehrt wird, der wie Legacy dauerhaft besteht, aber anders als
Legacy eine Handlungsaufforderung ist, muesste die Aufklappbedingung erneut
erweitert werden. Sie ist heute eine feste Aufzaehlung zweier Ausloeser, keine
aus dem Statusobjekt abgeleitete Eigenschaft.

### 5. Review-Ergebnis (dritte Runde)

- **Status:** freigegeben
- **Blocker:** keine
- **Offene Findings:** keine
- **Bewusst zurueckgestellt:** S4-09 (niedrig), Begruendung geprueft und
  akzeptiert
- **Restrisiken:** unveraendert die durch Software nicht aufloesbare
  Falschbestaetigung „bereits reflektiert"; die strengere Leservalidierung
  gegenueber fremd eingespielten Registries, weshalb das Komplettbackup vor
  Erstnutzung Pflicht bleibt; die Sichtbarkeit des Legacy-Hinweises erst nach
  Oeffnen der Detailanzeige; der unerreichbare
  `RECONCILIATION_CORRECTION_CHAIN_STALE`-Zweig als Lesefalle
- **Pre-Mortem:** unveraendert gegenueber Runde 2 in der Reihenfolge, aber
  entschaerft in der zweiten Position. Wahrscheinlichste Ursache bleibt eine
  fremd eingespielte oder von Hand bearbeitete Registry, die an einer der
  strengeren Feldpruefungen fail-closed scheitert; die Oberflaeche meldet das
  seit S4-02 korrekt als unvollstaendige Liste statt als leer. Die
  zweitwahrscheinlichste Ursache aus Runde 2 — Gewoehnung an eine dauerhaft
  aufgeklappte Warnflaeche und dadurch uebersehener echter Cashrueckstand — ist
  mit S4-08 entfallen; an ihre Stelle tritt der umgekehrte, deutlich mildere
  Fall, dass ein Altfall laenger unbemerkt bleibt, weil er die Detailanzeige
  nicht mehr von selbst oeffnet.

## Abschliessendes Code-Review von Gemini (2026-08-10)

**Reviewstand:** 2026-08-10, Branch `codex/fokussierte-abschlusshaertung`, Baseline-Commit `68e9e0f`. Geprüft wurden die 7 produktiven Tranchen- und Handbuch-Dateien, die Test-Fixtures, der Diff sowie die vollständige Testsuite.

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:** Der Reconcile-Cashstatus ist verbindlich und append-only umgesetzt. Initialer Status, Bestätigungs- (`cash_posting_confirmed`) und lineare Korrektur-Events (`cash_posting_corrected`) schützen Audit-Unveränderlichkeit und Transparenz.
- **Vertragstreue:** Exakt 7 produktive Dateien wurden geändert (Dateilimit von max. 10 eingehalten). Historien-Schemaversion bleibt auf `1` ohne Bruch für Bestandsdaten.
- **Fehlerbehandlung:** Korrupte oder ungültige Audit-Einträge scheitern fail-closed. Der Manager-Renderer zeigt bei Audit-Fehlern eine explizite Warnung statt einer irreführenden Leermeldung.
- **Seiteneffekte & Validierung:** `npm test` lief mit 169 Testdateien und 19.507 Assertions (0 Fehler, 0 offene Handles) vollständig grün durch. `npm run test:browser` (29/29) und `git diff --check` sind sauber.
- **Was könnte brechen?** Die als niedrig eingestufte und akzeptierte UI-Payload-Konfliktmeldung (S4-09).

### 2. Pre-Mortem

**Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Eine manuell bearbeitete oder fremd eingespielte Registry verletzt eine der strengeren Feldprüfungen des Lesers, wodurch der Reconcile-Verlauf im Manager als unvollständig blockiert wird, bis ein Backup wiederhergestellt oder die Datei manuell korrigiert wird.

### 3. Review-Ergebnis

- **Status:** **freigegeben**
- **Blocker:** keine
- **Restrisiken:** Falschbestätigung durch Nutzer, strengere Leservalidierung bei fremden Backups, unerreichbarer `STALE`-Meldungszweig (S4-09).
- **Abnahme:** Slice 04 ist technisch und fachlich abgenommen und für den lokalen Commit freigegeben.

