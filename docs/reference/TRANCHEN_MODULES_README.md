# Tranchenmanagement – Modul- und Vertragsreferenz

**Stand:** 2026-07-14  
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
| Reconcile | `app/tranches/tranche-reconciliation.js` | Vorschau und explizit bestaetigte Fortschreibung real ausgefuehrter Verkaeufe |
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

Eine persistierte Schema-1-Tranche enthaelt:

- `schemaVersion: 1`, stabile `trancheId` und einen nichtleeren `name`;
- optionale, normalisierte Identifikatoren `isin` und `ticker`;
- positive endliche `shares`, `purchasePrice` und `currentPrice`;
- optionales ISO-Kaufdatum `purchaseDate` (`JJJJ-MM-TT`);
- ein zulaessiges Paar aus `category` und `type`;
- explizit bestaetigte Teilfreistellung `tqf` zwischen `0` und `1`;
- optionale `notes`.

`marketValue`, `costBasis` und `instrumentId` werden abgeleitet. Persistierte
Fremdwerte fuer Marktwert/Cost Basis sind nicht die Rechenquelle. Beim
Profilverbund kommt `sourceProfileId` erst an der Engine-/Simulationsgrenze hinzu;
der Manager dupliziert es nicht in den Realbestand.

| `category` | Zulaessiger `type` |
| --- | --- |
| `equity` | `aktien_alt`, `aktien_neu` |
| `bonds` | `anleihe` |
| `money_market` | `geldmarkt` |
| `gold` | `gold` |

Widerspruechliche Paare, doppelte IDs, nicht endliche Finanzwerte, fehlende TQF
oder unbekannte Schema-Versionen werden gemeinsam und strukturiert abgelehnt.
Es gibt keine Prioritaetsregel, die einen Widerspruch still korrigiert.

## 3. Legacy-Migration und Recovery

Unversionierte Datensaetze beziehungsweise `schemaVersion: 0` sind der einzige
unterstuetzte Legacy-Eingang. `id` wird zu `trancheId`, `kind` zu `type`; eine
fehlende Legacy-ID wird deterministisch aus Inhalt und Arrayposition erzeugt. Eine
fehlende Legacy-Kategorie darf eindeutig aus dem Typ abgeleitet werden, ein
fehlender Legacy-Aktuellkurs aus dem Kaufpreis. Fehlende optionale Text-/Datumsfelder
bleiben leer.

Das Laden ist rein lesend und schreibt die normalisierte Darstellung nicht
automatisch zurueck. Dadurch gilt:

- gueltige Legacy-Daten normalisieren deterministisch und idempotent;
- `[]` bleibt ein explizit leerer Profilbestand und faellt nicht auf alte Live-Daten zurueck;
- Kategorie-/Typ-Widerspruch, Duplikat-ID und syntaktisch korrupter JSON-Rohtext
  enden `corrupt` und bleiben bytegleich erhalten;
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

## 8. Test- und Aenderungsgates

Pflichtgates fuer querschnittliche Tranchenaenderungen sind:

```powershell
npm test
npm run test:browser
npm run test:coverage
```

Das Browser-Gate verwendet isolierte synthetische Profile und deckt Profilwahl,
CRUD, Quote, Reload, Profil A/B, mutationsfreie Empfehlung/Simulation,
idempotentes Reconcile, Recovery, Tastaturfokus und 390-Pixel-Layout ab. Das
Coverage-Inventar fuehrt zentrale Tranchenmodule explizit; ein geladener
0-Prozent-Pfad bleibt als `runtime-loaded-uncovered` sichtbar und gilt niemals als
vollstaendig getestet.

Weiterfuehrend: [Nutzeranleitung](../guides/MULTI-TRANCHEN-ANLEITUNG.md),
[Technikreferenz](./TECHNICAL.md), [Balance-Module](./BALANCE_MODULES_README.md),
[Simulator-Module](./SIMULATOR_MODULES_README.md) und
[Engine-Module](../../engine/README.md).
