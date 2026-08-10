# Tranchenmanagement – Modul- und Vertragsreferenz

**Stand:** 2026-08-07
**Rolle:** Verbindliche Referenz fuer Ownership, Datenvertrag und Grenzen zwischen
Profil-Assets-Manager, Persistenz, Balance, Simulator und Engine.

## 1. Ownership und Einstiegspunkte

| Bereich | Primaere Module | Verantwortung |
| --- | --- | --- |
| Kanonischer Vertrag | `types/tranche-contract.js` | Schema, Kategorie-/Typ-Matrix, Normalisierung, abgeleitete Werte, strukturierte Validierungsfehler |
| Manager-State | `app/tranches/tranchen-manager-state.js` | mutationsfreies Laden, kanonisches Speichern, `empty`/`valid`/`corrupt`/`unavailable` |
| Manager-UI | `depot-tranchen-manager.html`, `tranchen-manager-page.js`, `tranchen-manager-modal.js`, `tranchen-manager-renderer.js` | Profilkontext, CRUD, Recovery, Kursbatch, Barrierefreiheit und bestaetigte Writes |
| Quotes | `app/tranches/tranchen-price-service.js` | Yahoo-Symbol-, Preis-, Waehrungs-, Zeit- und Quellenvalidierung |
| Status/Consumer | `app/tranches/depot-tranchen-status.js` | fail-closed Status fuer Balance und Simulator |
| Reconcile | `app/tranches/tranche-reconciliation.js` | Vorschau, explizit bestaetigte Fortschreibung real ausgefuehrter Verkaeufe und append-only Cashnachweis/-korrektur |
| Profilgrenze | `app/profile/profile-*.js`, `profilverbund-balance.js` | profilgebundener Rohbestand, Handoff/Flush, Haushaltsaggregation und Herkunft |
| Simulator | `simulator-profile-inputs.js`, `simulator-portfolio-init.js`, `simulator-portfolio-tranches.js` | Deep-Copy, Simulationslots und mutationsfreie Verwendung des Realbestands |
| Engine | `engine/transactions/sale-engine.mjs` | steuerbewusste Verkaufsplanung und Breakdown; keine Realbestandspersistenz |

Der Nutzerzugang liegt auf `index.html`: Zuerst wird ein Profil gewaehlt, dann der
**Profil-Assets Manager** geoeffnet. Der Manager zeigt Name und ID des tatsaechlich
geladenen Profils. Der Link wartet auf den Persistenz-Flush; ein fehlgeschlagener
Handoff navigiert nicht weiter.

## 2. Kanonischer Datenvertrag

Persistiert wird unter dem profilbezogenen Key `depot_tranchen` ein JSON-Array.
Der Feldname fuer Engine- und Simulatorinputs bleibt bewusst
`detailledTranches`. Beide Namen haben unterschiedliche Ebenen und duerfen nicht
umbenannt oder vermischt werden.

Eine persistierte Schema-2-Tranche enthaelt:

- `schemaVersion: 2`, stabile `trancheId` und einen nichtleeren `name`;
- optionale, normalisierte Identifikatoren `isin` und `ticker`;
- positive endliche `shares`, `purchasePrice` und `currentPrice`;
- optionales ISO-Kaufdatum `purchaseDate` (`JJJJ-MM-TT`);
- ein zulaessiges Paar aus `category` und `type`;
- explizit bestaetigte Teilfreistellung `tqf` zwischen `0` und `1`;
- den expliziten booleschen Steuerfreiheitsstatus `taxExempt`;
- optionale `notes`.

`marketValue`, `costBasis` und `instrumentId` werden abgeleitet. Persistierte
Fremdwerte fuer Marktwert/Cost Basis sind nicht die Rechenquelle. Beim
Profilverbund kommt `sourceProfileId` erst an der Engine-/Simulationsgrenze hinzu.
Die Laufzeit-`trancheId` wird dort als `<profileId>:<trancheId>` profilbezogen,
damit gleiche profilinterne IDs im Haushalt eindeutig bleiben. Der Manager
schreibt weder Provenienz noch die profilbezogene Laufzeit-ID in den Realbestand.

| `category` | Zulaessiger `type` |
| --- | --- |
| `equity` | `aktien_alt`, `aktien_neu` |
| `bonds` | `anleihe` |
| `money_market` | `geldmarkt` |
| `gold` | `gold` |

Widerspruechliche Schema-2-Paare, doppelte IDs, nicht endliche Finanzwerte,
fehlende TQF, fehlendes beziehungsweise nicht boolesches `taxExempt` oder
unbekannte Schema-Versionen werden gemeinsam und strukturiert abgelehnt.
Nur Aktien-/Aktienfonds-Tranchen duerfen eine positive TQF tragen. Geldmarkt,
Anleihen und Gold muessen `tqf: 0` verwenden. Es gibt keine Prioritaetsregel,
die einen aktuellen Widerspruch still korrigiert.

## 3. Legacy-Migration und Recovery

Unversionierte Datensaetze sowie `schemaVersion: 0` und `schemaVersion: 1` sind
ausschliesslich am Persistenzrand unterstuetzte Legacy-Eingaenge. Alte
Goldkodierung `tqf: 1` wird zu `tqf: 0` plus `taxExempt: true`; andere
Nicht-Aktien-TQF werden auf 0 gesetzt, waehrend Aktien-TQF erhalten bleibt.
Alle uebrigen Legacy-Tranchen erhalten `taxExempt: false`. Die Manager-UI zeigt
Anzahl und Art dieser Migration bis zur Nutzerbestaetigung an. `id` wird zu
`trancheId`, `kind` zu `type`; eine
fehlende Legacy-ID wird deterministisch aus Inhalt und Arrayposition erzeugt. Eine
fehlende Legacy-Kategorie darf eindeutig aus dem Typ abgeleitet werden, ein
fehlender Legacy-Aktuellkurs aus dem Kaufpreis. Fehlende optionale Text-/Datumsfelder
bleiben leer.

Die fruehere Manager-UI liess Kategorie und Typ unabhaengig auswaehlen. Deshalb
migriert der reine Persistenz-Lesepfad bei unversionierten Datensaetzen einen
alten Aktien-Typ (`aktien_alt`/`aktien_neu`) unter `bonds`, `money_market` oder
`gold` auf den jeweils einzigen kanonischen Typ. Diese enge Reparatur gilt nicht
fuer Schema 1, nicht an der Enginegrenze und nicht fuer andere Widersprueche.

Das Laden ist rein lesend und schreibt die normalisierte Darstellung nicht
automatisch zurueck. Dadurch gilt:

- gueltige Legacy-Daten normalisieren deterministisch und idempotent;
- `[]` bleibt ein explizit leerer Profilbestand und faellt nicht auf alte Live-Daten zurueck;
- nicht eindeutig migrierbarer Kategorie-/Typ-Widerspruch, Duplikat-ID und
  syntaktisch korrupter JSON-Rohtext enden `corrupt` und bleiben bytegleich erhalten;
- ein IO-/Backendfehler endet separat `unavailable` und bietet Retry, aber keinen Reset.

Im `corrupt`-Zustand blockiert der Manager alle normalen Writes. Nutzer koennen
zur Startseite abbrechen, das zentrale Komplettbackup wiederherstellen, den
Rohtext bewusst lokal anzeigen/kopieren oder einen ausdruecklich bestaetigten
Reset auf `[]` ausfuehren. Es gibt keinen separaten Tranchen-Teilimport oder
-export.

## 4. Persistenz und Profilgrenzen

Feature-Code nutzt `app/shared/persistence-facade.js`. Im Browser ist IndexedDB
die Source of Truth, in Tauri eine JSON-Datei im App-Datenverzeichnis;
`localStorage` ist nur Legacy-Migrations- beziehungsweise Fallbackpfad. Das
zentrale Komplettbackup auf der Startseite umfasst Registry und profilbezogene
Daten.

Create, Edit, Delete, Clear, Kursbatch, Profilwerte und Reconcile werden erst nach
erfolgreichem Facade-Flush als bestaetigt angezeigt. Bei Flushfehler stellt die UI
den letzten bestaetigten sichtbaren Cache-/Registrystand wieder her und laesst den
Vorgang retryfaehig. Wiederholte Initialisierung, BFCache und Tab-Rueckkehr duerfen
keine doppelten Listener oder Polling-Intervalle erzeugen.

Reconcile reduziert beziehungsweise entfernt das bestaetigte reale Lot und
protokolliert Brutto-/Nettoerloes sowie Kosten. Es bucht den Nettoerloes nicht
automatisch als freie Liquiditaet. Verbleibt der Brokererloes als Cash, muss
dieser in den Rahmendaten manuell nachgefuehrt werden. Neue Verkaeufe tragen
deshalb entweder den Default `pending_manual_posting` oder – nur nach expliziter
Nutzerwahl samt Cashstand – `confirmed_already_reflected`. Ein offener Verkauf
wird erst nach der manuellen Aktualisierung der freien Liquiditaet durch ein
eigenes `cash_posting_confirmed`-Ereignis geschlossen. Ein Tippfehler im
bestaetigten Cashstand wird nicht ueberschrieben, sondern durch eine lineare
Folge von `cash_posting_corrected`-Ereignissen berichtigt.

Der Verlauf bleibt als additive heterogene `schemaVersion: 1`-Liste in
`rs_profiles_v1.trancheReconciliation.actions` gespeichert. Fuer jeden Consumer
gilt deshalb verbindlich: zuerst nach `eventType` unterscheiden, erst danach
fachlich auswerten. Die Typen sind:

- `sale_reconciled`: Realverkauf mit maximal 128 Zeichen langer `actionId` und
  initialem Cashstatus;
- `cash_posting_confirmed`: Abschluss mit
  `actionId === confirmationActionId === cash-confirmation:v1:<targetActionId>`,
  Zielverkauf, centgleich kopiertem Nettoerloes, bestaetigtem Cashstand und
  Zeitpunkt; die ID darf maximal 149 Zeichen besitzen;
- `cash_posting_corrected`: Korrektur mit
  `actionId === correctionActionId === cash-correction:v1:<targetActionId>:<revision>`,
  lueckenloser Revision 1 bis 999999, Rueckverweis auf den aktuell wirksamen
  Vorgaenger, unveraendertem Nettoerloes, neuem Cashstand, Pflichtgrund und
  Zeitpunkt; die ID darf maximal 154 Zeichen besitzen.

Alle `actionId` sind ueber saemtliche Eventtypen global eindeutig. Nichtkanonische
IDs, unbekannte Eventtypen, Ziel-/Profilwechsel, geaenderte Nettoerloese, Luecken,
Forks oder veraltete Rueckverweise blockieren fail-closed. Eine fachlich gleiche
Wiederholung eines Abschlusses oder einer Korrektur ist auch mit neu erzeugtem
Submit-Zeitstempel ein No-op; der zuerst gespeicherte Nachweiszeitpunkt bleibt
erhalten. Dieselbe ID mit abweichendem Cashstand, Nettoerloes, Ziel, Vorgaenger,
Revision oder Korrekturgrund ist ein Konflikt. Die effektive Anzeige verwendet
nur den Cashstand der letzten gueltigen Korrektur, waehrend alle frueheren
Records unveraendert im Audit bleiben.

Historische Records ohne `eventType` werden nur im Leser als `sale_reconciled`
mit `cashStatus: legacy_unknown` projiziert. Auch sie muessen die unterstuetzte
Recordversion `schemaVersion: 1` tragen; eine fremde Version bleibt fail-closed.
Sie werden nicht umgeschrieben, gelten operativ als abgeschlossen, erscheinen
aber in Zeile und Zusammenfassung ausdruecklich als „Cashstatus nicht
dokumentiert“ statt als „Cash bestaetigt“. Eine freiwillige spaetere
Nachbestaetigung bleibt moeglich.

Der Korrekturdialog bindet Revision, kanonische Action-ID und Vorgaenger an den
beim Oeffnen gezeigten Stand. Hat ein anderer Tab die Kette inzwischen
fortgeschrieben, blockiert der Submit vor der Nutzerbestaetigung; er leitet nie
still eine neue Revision ab. Ein unlesbarer Audit besitzt im Manager einen
eigenen Fehlerzustand „Liste unvollstaendig“ und wird nicht als leere Historie
dargestellt. Balance und Simulator nennen Legacy-Faelle im Statusbadge und
zeigen dafuer keinen gruenen Cash-All-clear-Marker.

Vor dem ersten produktiven Einsatz dieses Cashstatus-Workflows ist auf
`index.html` unter `Profile > Erweitert > Backup exportieren` ein zentrales
Komplettbackup anzulegen. Dieses Backup umfasst `rs_profiles_v1`; es gibt keinen
separaten Reconcile-Teilbackupweg.

## 5. Quote-Grenze

Automatische Kursupdates akzeptieren ausschliesslich normalisierte Yahoo-Symbole
und Quotes mit positivem endlichem Preis, `EUR`, plausibler UTC-Unixsekunde und
Quelle. Kurse duerfen maximal sieben Kalendertage alt und hoechstens fuenf Minuten
in der Zukunft liegen. Fremdwaehrung, fehlende Waehrung, Symbolabweichung,
Providerfehler, Rate-Limit, Timeout und Proxy-Nichterreichbarkeit besitzen stabile
Fehlercodes.

Der Batch dedupliziert Symbole, arbeitet mit begrenzter Parallelitaet und schreibt
alle gueltigen Teilerfolge in genau einem bestaetigten Commit. Fehlerhafte Lots
behalten ihren alten Kurs; ohne einen einzigen Erfolg erfolgt kein Write.

## 6. Balance-, Simulator- und Engine-Grenzen

Balance liest nur einen validen nichtleeren Bestand fuer FIFO. `empty` nutzt den
vereinfachten Aggregatpfad, `corrupt`/`unavailable` blockieren fail-closed.
Geldmarkt, Gold, Bonds und Aktien folgen derselben disjunkten Klassifikation; ein
Detailbestand ersetzt ueberlappende Aggregate und wird nicht addiert.

Der Simulator tiefenkopiert Profilinputs vor Haushaltsmerge und
Portfolioinitialisierung. Profilinterne IDs werden mit der Profil-ID eindeutig und
`sourceProfileId` bleibt bis zum Verkaufs-Breakdown erhalten. Teilverkaeufe
reduzieren Stueckzahl, Marktwert und Cost Basis proportional; Vollverkaeufe
entfernen das Lot aus spaeteren Engineinputs. Simulierte Kaeufe erzeugen eigene
`simlot:`-Lots, Legacy-Aggregate stabile `simbase:`-Lots. Keine Simulation schreibt
diese Mutationen in `depot_tranchen` zurueck.

Die Engine plant Verkaeufe, validiert eindeutige Lots und liefert `trancheId` sowie
`sourceProfileId` im `breakdown[]`. Sie besitzt keinen Persistenzpfad zum realen
Depot.

## 7. Empfehlung versus reale Ausfuehrung

Balance-Empfehlung, Jahresrechnung, Backtest, Monte Carlo, Sweep und Optimierung
sind schreibfrei gegen den Realbestand. Nach einer tatsaechlichen Brokerausfuehrung
erfasst der Nutzer im Manager eine stabile `actionId`, Profil, Lot, Datum,
Stueckzahl, Bruttoerloes und Kosten; eine Empfehlungsreferenz ist optional.

Die Vorschau ist schreibfrei. Erst die separate Bestaetigung schreibt Live-Lot,
Profil-Lot und den datensparsamen Auditverlauf in einem Flush. Eine identische
Wiederholung ist ein No-op; dieselbe `actionId` mit anderen Daten ist ein Konflikt.
Ueberverkauf, Profilwechsel oder ein seit der Vorschau veraenderter Bestand brechen
fail-closed ab.

Die Verkaufsvorschau zeigt zusaetzlich den initialen Cashstatus. Solange
`pending_manual_posting` gilt, darf die UI den Vorgang nicht als vollstaendig
abgeschlossen bezeichnen. Nach der eigenen Buchung des Nettoerloeses in den
Rahmendaten bestaetigt der Nutzer Zielverkauf, unveraenderten Nettoerloes und den
Cashstand im Cashdialog. Balance und Simulator zeigen offene Cashrueckstaende
profilbezogen an; ein Tippfehler wird im selben Dialog als append-only Korrektur
mit altem/neuem Cashstand und Pflichtgrund erfasst.

## 8. Test- und Aenderungsgates

Pflichtgates fuer querschnittliche Tranchenaenderungen sind:

```powershell
npm test
npm run test:browser
npm run test:coverage
```

Das Browser-Gate verwendet isolierte synthetische Profile und deckt Profilwahl,
CRUD, Quote, Reload, Profil A/B, mutationsfreie Empfehlung/Simulation,
idempotentes Reconcile, Pending-Anzeige nach Seitenwechsel, Cashabschluss,
append-only Korrektur, exakten Retry, Legacy-Projektion, Recovery, Tastaturfokus
und 390-Pixel-Layout ab. Das
Coverage-Inventar fuehrt zentrale Tranchenmodule explizit; ein geladener
0-Prozent-Pfad bleibt als `runtime-loaded-uncovered` sichtbar und gilt niemals als
vollstaendig getestet.

Weiterfuehrend: [Nutzeranleitung](../guides/MULTI-TRANCHEN-ANLEITUNG.md),
[Technikreferenz](./TECHNICAL.md), [Balance-Module](./BALANCE_MODULES_README.md),
[Simulator-Module](./SIMULATOR_MODULES_README.md) und
[Engine-Module](../../engine/README.md).
