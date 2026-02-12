# IMPLEMENTATION TICKETS: Dynamic Flex (Simulator First)

Status: Draft v1  
Scope: Lokale Umsetzung im Arbeitsverzeichnis, spaeterer GitHub-Merge  
Reihenfolge: Backtest -> Monte Carlo -> Parameter Sweep -> Auto Optimize -> Balance-App

## Arbeitsregeln
- `dynamicFlex=false` muss in jeder Phase exakt das bisherige Verhalten behalten.
- Erst zur naechsten Phase wechseln, wenn alle DoD-Kriterien der aktuellen Phase erfuellt sind.
- Keine Balance-Integration, bevor Simulator-Pipeline stabil ist.
- Engine-Input fuer CAPE kanonisch auf `capeRatio` ausrichten.

## Ticket T00 - Baseline sichern (DONE)
Ziel: Vor dem Feature eine stabile Vergleichsbasis schaffen.

Umfang:
- Regressionslauf dokumentieren.
- Referenz-Szenarien fuer Backtest (ohne Dynamic Flex) speichern.
- Messpunkte fuer Performance erfassen.

Definition of Done:
- Testlauf erfolgreich dokumentiert.
- Referenzwerte fuer mindestens 3 Basisszenarien vorhanden.

## Ticket T01 - Engine-Vertrag Dynamic Flex (DONE)
Ziel: Sauberer, testbarer Engine-Input/Output fuer Dynamic Flex.

Umfang:
- Inputs finalisieren: `dynamicFlex`, `horizonYears`, `horizonMethod`, `survivalQuantile`, `goGoActive`, `goGoMultiplier`, `capeRatio`.
- Output `ui.vpw` mit stabilen Feldern liefern.
- `capeRatio`/`marketCapeRatio` Alias-Fallback klar und eindeutig behandeln.

Definition of Done:
- Engine-Tests fuer Input-Validierung und `ui.vpw` vorhanden.
- Alte Tests bleiben gruen.

## Ticket T02 - VPW Kernlogik in Engine (DONE)
Ziel: VPW inkl. Clamp/Smoothing robust integrieren.

Umfang:
- VPW-Rate-Funktion und Return-Berechnung integrieren.
- Real-Return Clamp und Smoothing einbauen.
- Go-Go Multiplikator und Grenzen beruecksichtigen.
- **NEU:** Joint-Life Restlaufzeit-Logik (`estimateJointRemainingLifeYears`) implementieren und testen.
- Joint-Life Berechnung explizit integrieren (inkl. eigener Hilfsfunktion `estimateJointRemainingLifeYears`).

Definition of Done:
- Unit-Tests fuer r=0-Fallback, Clamp, Smoothing, Go-Go erfolgreich.
- Unit-Tests fuer Joint-Life Logik (inkl. Plausibilitaet gegen Single-Life) erfolgreich.
- `dynamicFlex=false` bitgleich zum Altverhalten.

## Ticket T03 - Simulator UI und Input-Layer (DONE)
Ziel: Dynamic-Flex-Eingaben im Simulator sauber verfuegbar machen.

Umfang:
- UI-Elemente fuer Dynamic Flex, Quantil, Go-Go.
- Reader in `simulator-portfolio-inputs.js` erweitern.
- Defaults und Plausibilitaetsgrenzen sicherstellen.

Definition of Done:
- Eingaben landen vollstaendig im Input-Objekt.
- UI funktioniert ohne manuelle Nacharbeit.

## Ticket T04 - Backtest-Integration (Phase 1) (DONE)
Ziel: Erste voll nachvollziehbare End-to-End-Integration.

Umfang:
- Horizon-Berechnung pro Jahr in Backtest-Pfad.
- Engine-Aufruf auf kanonisches `capeRatio` ausrichten.
- `ui.vpw` in Backtest-Ausgabe sichtbar machen.

Definition of Done:
- Backtest mit `dynamicFlex=false` entspricht Baseline.
- Backtest mit `dynamicFlex=true` liefert nachvollziehbare Jahreswerte.

## Ticket T05 - Backtest Diagnostik und Export (DONE)
Ziel: Fachlich verstaendliche Nachvollziehbarkeit im Ergebnis.

Umfang:
- Diagnoseanzeige fuer VPW-Daten.
- Exportfelder fuer wichtige VPW-Metriken.
- Klarer Hinweis bei Fallbacks.

Definition of Done:
- Fachliche Pruefung kann Jahreswerte ohne Code-Inspektion nachvollziehen.

## Ticket T06 - Monte-Carlo Runner Integration (Phase 2) (DONE)
Ziel: Dynamic Flex in MC serial korrekt rechnen.

Umfang:
- MC-Runner uebernimmt neue Dynamic-Flex Inputs.
- Horizon/Go-Go/CAPE Konsistenz in allen MC-Pfaden.
- `horizonYears` wird pro Simulationsjahr neu berechnet (Alter steigt im Loop).

Definition of Done:
- MC-Serial Tests fuer Dynamic Flex bestehen.
- Keine Regression bei deaktiviertem Dynamic Flex.

## Ticket T07 - Worker Parity fuer Dynamic Flex (DONE)
Ziel: Gleiche MC-Ergebnisse in Worker- und Serial-Modus.

Umfang:
- Worker-Job Payload um Dynamic-Flex Felder erweitern.
- Determinismus pruefen (Seed, Chunking, Aggregation).
- Sicherstellen, dass Sterbetafeln/benoetigte Statics im Worker-Kontext verfuegbar sind.
- Verifizieren, dass die jahrweise Horizon-Neuberechnung im Worker identisch zum Serial-Pfad ist.

Definition of Done:
- Worker-Paritaetstests gruen.
- Keine signifikanten Abweichungen zwischen Serial und Worker.

## Ticket T08 - Parameter Sweep Integration (Phase 3) (DONE)
Ziel: Kontrollierte Sweep-Integration neuer Stellschrauben.

Umfang:
- Sweep-Whitelist um geeignete Dynamic-Flex Parameter erweitern.
- Gueltigkeitsgrenzen und Guard-Regeln definieren.
- Unzulaessige Kombinationen als invalid markieren.

Definition of Done:
- Sweep laeuft stabil ohne Parameter-Explosion.
- Heatmap und Ergebnislogik bleiben konsistent.

## Ticket T09 - Sweep Robustheit und Invariants (DONE)
Ziel: Fehlkombinationen frueh abfangen.

Umfang:
- Invariant Checks fuer Quantil, Go-Go, Horizon.
- Tests fuer erlaubte/verbotene Parameterbereiche.

Definition of Done:
- Sweep-Selbsttests gruen.
- Keine blocklist/whitelist Verstosse.

## Ticket T10 - Auto Optimize Stufe A (Phase 4) (DONE)
Ziel: Optimizer mit Dynamic Flex nutzen, aber Suchraum klein halten.

Umfang:
- Dynamic Flex als Modus nutzbar machen.
- Bestehende Optimizer-Logik unveraendert auf Kernparameter laufen lassen.

Definition of Done:
- Optimizer laeuft stabil ohne starke Laufzeitverschlechterung.
- Ergebnisse bleiben interpretierbar.

## Ticket T11 - Auto Optimize Stufe B (neue Stellschrauben) (DONE)
Ziel: Ausgewaehlte Dynamic-Flex Parameter optimierbar machen.

Umfang:
- Kleinere Suchraeume fuer `survivalQuantile`, `konservativPlus`, `goGoJahre`, `goGoMultiplier`.
- Safety-Guards in Zielfunktion gegen ueberaggressive Loesungen.

Definition of Done:
- Optimizer produziert reproduzierbare, robuste Konfigurationen.
- Keine "unsafe" Extremloesungen in Top-Ergebnissen.

## Ticket T12 - CAPE Automatisierung fuer Jahreswechsel vorbereiten (DONE)
Ziel: Vorarbeit fuer spaetere Balance-Integration.

Umfang:
- Source-of-Truth festschreiben: US Shiller CAPE.
- Fallback-Kette festlegen: Yale -> Mirror -> letzter Wert.
- Persistenzschema festlegen: `capeAsOf`, `capeSource`, `capeFetchStatus`, `capeUpdatedAt`.

Definition of Done:
- Datenvertrag und Fehlerszenarien dokumentiert.
- Testfaelle fuer Fallback-Verhalten definiert.

## Ticket T13 - Balance-App Rollout (Phase 5, spaeter) (DONE)
Ziel: Erst nach stabiler Simulator-Pipeline in Balance integrieren.

Hinweis:
- Bewusst spaet eingeordnet, damit Backtest/MC/Sweep/Optimizer zuerst gehaertet werden.

Umfang:
- Dynamic-Flex UI und Reader in Balance.
- Jahreswechsel mit Auto-CAPE.
- Feature-Gate, falls noetige Profilfelder fehlen.

Definition of Done:
- Ein-Knopf-Jahreswechsel funktioniert robust.
- Fehlende CAPE-Daten blockieren den Jahreswechsel nicht.

## Ticket T14 - Dokumentation und Merge-Vorbereitung (DONE)
Ziel: Sauberer Abschluss fuer spaeteren GitHub-Import.

Umfang:
- Aenderungen in `README.md`, `TECHNICAL.md`, `engine/README.md` aktualisieren.
- Lokales Changelog und offene Risiken dokumentieren.
- Endgueltige Testmatrix mit Ergebnissen festhalten.

Definition of Done:
- Dokumentation konsistent.
- Merge-faehiges Paket mit klarer Historie vorhanden.

## Meilensteine (Go/No-Go)
- M1: T00-T05 fertig -> Backtest freigegeben.
- M2: T06-T07 fertig -> Monte Carlo freigegeben.
- M3: T08-T09 fertig -> Sweep freigegeben.
- M4: T10-T11 fertig -> Auto Optimize freigegeben.
- M5: T12-T14 fertig -> Balance + Merge freigegeben.

## Risiko-Liste (laufend pflegen)
- CAPE-Datenquelle temporaer nicht erreichbar.
- Suchraum-Explosion in Sweep/Optimizer.
- Paritaetsabweichungen Worker vs Serial.
- Unbeabsichtigte Verhaltensaenderungen bei `dynamicFlex=false`.
