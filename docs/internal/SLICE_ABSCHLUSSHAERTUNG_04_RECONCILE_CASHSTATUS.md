# Slice Abschlusshaertung 04: Verbindlicher Reconcile-Cashstatus

**Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** noch nicht angelegt/veroeffentlicht<br>
**Status:** Entwurf v6; Gemini G-P-02 durch append-only Korrekturkette geschlossen, G-P-07 sachlich zurueckgewiesen; Gemini-Re-Review ausstehend; nicht gestartet<br>
**Hauptplan:** [FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md](FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md)

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
  muss exakt diesem Wert entsprechen. Dieselbe
  normalisierte Bestaetigung liefert `duplicate`; abweichender Betrag,
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
  Commit stabil. Eine byte-/wertgleiche Wiederholung desselben Records liefert
  `duplicate` und haengt nichts an; dieselbe ID mit abweichendem Payload
  blockiert als Konflikt. Nach einem erfolgreichen neuen Zwischenstand wird die
  naechste Revision erzeugt.
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
- Legacy-Aktionen blockieren den neuen Workflow nicht und werden nicht als
  `pending`-Rueckstand behandelt. Fuer den Workflow gelten sie als
  **abgeschlossen**, tragen aber den eigenen Nachweisstatus
  „Abgeschlossen (Altfall – Cashstatus nicht dokumentiert)“ und duerfen nicht
  als „Cash bestaetigt“ erscheinen. Eine freiwillige spaetere Ergaenzung des
  Nachweises per Folgeereignis ist erlaubt.
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

Die produktive Dateiliste umfasst maximal diese sechs Programmdateien. Eine
Anhebung der Historien-Schemaversion, Mutation bestehender Records oder der
Bedarf einer siebten produktiven Datei ist eine Contractabweichung und stoppt
den Slice vor Coding. Die Direktableitung der ID liegt in
`tranche-reconciliation.js`; es wird keine Hashhilfe und keine siebte Datei
eingefuehrt.

## Diff-Risiko vor Coding

**Planungsstand:** noch nicht gestartet. Die Versionsentscheidung ist gefallen:
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
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND

Geplante Dateien:
- nach Persistenz-Contractpruefung finalisieren

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
- Slice-3-Commit ist Sicherheitspunkt
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

Nicht gestartet.

## Ausgefuehrte Tests mit Ergebnis

Nicht gestartet.

## Abweichungen vom Plan

Keine; Umsetzung noch nicht begonnen.

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

Nicht implementierungsreif; C-09 ist durch die einfachere Direktableitung aus
C-10 ueberholt, C-10 und G-P-02 sind eingearbeitet. G-P-07 wird wegen seiner
ungueltigen 129-Zeichen-Vorbedingung abgelehnt. Gesamtplan- und Gemini-Re-Review
stehen aus.

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
  produktive Dateiliste aufgenommen; der Slice bleibt mit maximal sechs Dateien
  unter der Stop-Grenze.
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
| C-06 | Claude | Dateiliste um Statusanzeige und Bestätigungsdialog ergänzen | angenommen | beide Dateien aufgenommen; maximal sechs |
| C-07 | Claude (Re-Review) | Folgeereignis ohne regulaeres `actionId` macht die Historie unlesbar | angenommen | `actionId === confirmationActionId`; Namespace, Kollision, Mixed-Event und Preview-Test |
| C-08 | Claude (Re-Review) | Additive v1-Erweiterung widerspricht globaler Versionsregel | angenommen | ausdrueckliche testpflichtige Ausnahme im Hauptplan; Consumer-Filter dokumentieren |
| C-09 | Claude (3. Runde) | Hashquelle fuer synchronen Commitpfad nicht verbindlich | teilweise angenommen, durch C-10 ueberholt | synchroner Commit und kein Simulatorimport; Direktableitung braucht keinen Hash |
| C-10 | Claude (4. Runde) | Private SHA-256-Kopie ist vermeidbar; direkte Ziel-ID-Ableitung ist injektiv und lesbar | angenommen mit abweichender Laengenregel | direkte ID; Verkauf/Ziel max. 128, Abschluss max. 149; eventtypspezifischer Leser |
| G-P-02 | Gemini | Tippfehler im bestaetigten Cashstand ist wegen Append-only unkorrigierbar | angenommen | lineares `cash_posting_corrected` mit Revision, Rueckverweis, Pflichtgrund und effektiver Projektion |
| G-P-07 | Gemini | 129-Zeichen-Ziel erzeugt blockierte 150-Zeichen-Bestaetigungs-ID | abgelehnt; Vorbedingung ungueltig | Ziel max. 128, daraus exakt 149; eventtypspezifische verstaendliche Laengenfehler |
