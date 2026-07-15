# Profil-Assets und Depot-Tranchen – Anleitung

Mit dem Profil-Assets-Manager pflegen Sie einzelne Depotlots getrennt nach
Profil. Die Daten verbessern Steuer-, FIFO- und Herkunftsberechnungen in Balance
und Simulator. Alle Beispiele in dieser Anleitung sind abstrakt; es werden keine
realen Personen-, Depot- oder Portfoliowerte vorausgesetzt.

## 1. Profil waehlen und Manager oeffnen

1. Oeffnen Sie `index.html` beziehungsweise die Startseite der Desktop-App.
2. Waehlen Sie das Profil, zu dem der Bestand gehoert.
3. Oeffnen Sie **Profil-Assets Manager**.
4. Kontrollieren Sie oben Profilname und Profil-ID, bevor Sie Daten aendern.

Der Wechsel wartet auf die dauerhafte Speicherung der Profilwahl. Bei einer
Fehlermeldung bleiben Sie auf der Startseite und koennen den Vorgang wiederholen.
Jedes Profil ist ein eigenes logisches Depot; FIFO wird nur innerhalb dieses
Profils und Instruments angewandt.

## 2. Eine Tranche anlegen

Waehlen Sie **Neue Tranche** und erfassen Sie:

- einen eindeutigen Namen sowie optional ISIN und Yahoo-Ticker;
- positive Stueckzahl, Kaufpreis und aktuellen Preis;
- optional das Kaufdatum im Format `JJJJ-MM-TT`;
- Kategorie und den dazu passenden Typ;
- die bewusst bestaetigte Teilfreistellung als Quote, zum Beispiel `0,30` fuer
  30 Prozent, sofern dies fuer das Instrument tatsaechlich zutrifft;
- optionale Notizen.

Zulaessige Paare sind:

| Kategorie | Typ |
| --- | --- |
| Aktien | Altbestand oder Neubestand |
| Anleihen | Anleihe |
| Geldmarkt | Geldmarkt-ETF |
| Gold | Gold-ETC |

Die App blockiert fehlende oder unendliche Werte, doppelte IDs,
Kategorie-/Typ-Widersprueche und unbestaetigte TQF. Marktwert und Einstand werden
aus Stueckzahl und Preisen berechnet. Eine Aenderung gilt erst als dauerhaft, wenn
die Speicherstatusanzeige den erfolgreichen Abschluss meldet.

## 3. Bearbeiten und loeschen

Die Schaltflaechen in jeder Tabellenzeile besitzen zugaengliche Namen und
oeffnen Bearbeiten beziehungsweise Loeschen. Beim Bearbeiten bleibt die interne
Lot-ID stabil. **Alle loeschen** leert nur den Bestand des aktuell angezeigten
Profils und verlangt eine Bestaetigung.

Der Editor ist per Tastatur bedienbar: Der Fokus bleibt im Dialog, `Escape`
schliesst ihn und gibt den Fokus an den Ausloeser zurueck. Auf schmalen Displays
scrollt nur die Tabelle horizontal; die Seite selbst bleibt innerhalb des
Viewports.

## 4. Kurse aktualisieren

Der Online-Abruf ist optional. Im Browser benoetigt er den lokalen Proxy aus dem
Suite-Startskript; die Desktop-App verwendet den integrierten Tauri-Pfad.
Automatisch uebernommen werden nur EUR-Quotes mit passendem Symbol, positivem
Preis, plausibler UTC-Zeit und ausgewiesener Quelle.

Bei einem Batch koennen einzelne Lots erfolgreich sein und andere fehlschlagen.
Gueltige Teilerfolge werden gemeinsam gespeichert, fehlgeschlagene Lots behalten
den alten Kurs. Die Statusanzeige meldet einen erfolgreichen Lauf knapp; bei
Fehlern nennt sie nur die betroffene Tranche und den verstaendlichen Grund. Ohne
einen gueltigen Quote wird nichts geschrieben.

## 5. Wirkung in Balance und Simulator

Ein valider nichtleerer Detailbestand aktiviert die lotbezogene Verkaufsplanung.
Ein explizites `[]` bedeutet dagegen: Dieses Profil besitzt bewusst keine
Detailtranchen. Korrupte oder nicht lesbare Daten werden nicht als leer behandelt;
die Berechnung stoppt mit einem sichtbaren Hinweis.

Balance und Simulator unterscheiden Aktien, Bonds, Geldmarkt und Gold disjunkt,
damit Detailwerte keine Aggregate verdoppeln. Bei mehreren Profilen bleiben die
Lots ueber `sourceProfileId` ihrem Ursprung zugeordnet.

Wichtig: Empfehlungen und Simulationen veraendern den realen Bestand nicht.
Backtest, Monte Carlo, Sweep, Optimierung und Balance-Berechnung arbeiten auf
Kopien beziehungsweise Rechenergebnissen.

## 6. Einen real ausgefuehrten Verkauf abgleichen

Erst nachdem der Verkauf beim Broker tatsaechlich ausgefuehrt wurde:

1. Oeffnen Sie im richtigen Profil den Bereich **Reale Ausfuehrung abgleichen**.
2. Vergeben Sie eine stabile Action-ID aus Ihrer eigenen, lokalen Zuordnung.
3. Waehlen Sie die exakte Tranche und erfassen Sie Datum, verkaufte Stuecke,
   Bruttoerloes und Kosten.
4. Optional koennen Sie die vorherige Empfehlung zum Vergleich erfassen.
5. Pruefen Sie die Vorschau mit altem und resultierendem Bestand.
6. Bestaetigen Sie die dauerhafte Fortschreibung separat.

Teilverkauf reduziert Stueckzahl, Marktwert und Einstand proportional;
Vollverkauf entfernt genau das gewaehlte Lot. Ueberverkauf, Profilwechsel oder ein
seit der Vorschau veraenderter Bestand werden blockiert. Eine identische Action-ID
mit denselben Daten wird nur einmal angewandt; abweichende Daten unter derselben ID
sind ein Konflikt.

## 7. Backup und Recovery

Verwenden Sie auf der Startseite unter **Profile > Erweitert** das zentrale
Komplettbackup. Es umfasst die Profilregistry und die zugehoerigen App-Daten. Der
Tranchenmanager besitzt bewusst keinen separaten Teilimport oder -export.

Bei beschaedigten Tranchendaten blockiert der Manager normale Aenderungen und
bietet vier kontrollierte Wege:

- zur Startseite abbrechen;
- ein zentrales Komplettbackup wiederherstellen;
- den unveraenderten Rohtext bewusst lokal anzeigen und kopieren;
- den beschaedigten Profilbestand nach ausdruecklicher Bestaetigung auf leer setzen.

Ein voruebergehender Speicherfehler ist kein Korruptionsfall: Er bietet Retry und
keinen Reset. Im Browser ist IndexedDB die normale lokale Datenquelle, in der
Desktop-App die Tauri-JSON-Datei. Browser-`localStorage` ist nur
Legacy-Migrations-/Fallbackpfad und kein empfohlener manueller Backupweg.

## 8. Fehlerhilfe

- **Falsches Profil sichtbar:** Zur Startseite zurueckkehren, korrektes Profil
  waehlen und den Manager erneut oeffnen.
- **Kurs bleibt alt:** Den Code und Grund im Kursstatus pruefen; Fremdwaehrungen
  werden nicht automatisch umgerechnet.
- **Datenfehler blockiert Berechnung:** Recovery-Hinweis lesen und vor einem Reset
  das zentrale Backup beziehungsweise den bewusst angezeigten Rohtext sichern.
- **Speichern fehlgeschlagen:** Nicht neu laden, bevor der sichtbare Stand geklaert
  ist; Retry verwenden. Die App stellt den letzten bestaetigten Stand wieder her.
- **Simulation passt nicht zum Depot:** Profilwahl, Kategorie-/Typ-Paare, TQF und
  Geldmarkt-/Goldklassifikation im Manager pruefen.

Technische Details stehen in
[`docs/reference/TRANCHEN_MODULES_README.md`](../reference/TRANCHEN_MODULES_README.md).
