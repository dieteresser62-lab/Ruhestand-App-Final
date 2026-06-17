# Roadmap: Engine- und Stochastik-Verbesserungen

**Stand:** 2026-06-14  
**Status:** Entwurf fuer Review  
**Autor:** Codex  
**Zweck:** Uebergeordnetes Steuerdokument fuer die koordinierte Abarbeitung der fuenf Arbeitsdokumente.  
**Geplanter Koordinations-Branch:** vor Umsetzung je Feature-Branch gemaess Einzelplan; dieses Dokument selbst kann auf dem Dokumentations-/Planungsstand gepflegt werden.

## Ziel

Dieses Dokument verbindet die fuenf Arbeitsdokumente zu einer fachlich und technisch geordneten Roadmap. Es definiert:

- verbindliche Umsetzungsreihenfolge,
- Zwischenaktivitaeten zwischen den Arbeitspaketen,
- Review- und Freeze-Gates,
- gemeinsame Validierungsartefakte,
- Stop-Regeln fuer den Uebergang zum naechsten Schritt.

Die Einzelplaene bleiben die fachliche und technische Detailquelle. Dieses Dokument entscheidet nur ueber Reihenfolge, Abhaengigkeiten und Uebergabekriterien.

## Geltungsbereich

| Reihenfolge | Arbeitsdokument | Rolle in der Roadmap |
|---|---|---|
| 1 | `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` | Deterministische Engine-Basis stabilisieren |
| 2 | `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md` | Erwartete Realrendite kontinuierlich modellieren |
| 3 | `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` | Entnahmehorizont und Langlebigkeitsrisiko konservativer behandeln |
| 4 | `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md` | Alternative stochastische Pfadgenerierung einfuehren |
| 5 | `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` | Optionales Extremrisiko-Overlay einfuehren |

## Leitprinzip

Die Roadmap wird von stabiler Kernsemantik zu komplexeren stochastischen Erweiterungen abgearbeitet:

1. Erst deterministische Engine-Entscheidungen stabilisieren.
2. Dann Entnahmerate ueber Renditeannahme und Horizont kalibrieren.
3. Danach Referenzbasis einfrieren.
4. Erst anschliessend Sampling und Crash-Overlays erweitern.

Dadurch werden Vergleichslaeufe und Review-Ergebnisse nicht durch nachtraegliche Grundsatzverschiebungen entwertet.

## Verbindliche Reihenfolge

### Schritt 1: Regime-Uebergaenge glaetten

Quelle: `REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`

Ziel:

- Harte Spruenge bei Regime-, Drawdown- und Runway-Uebergaengen reduzieren.
- Deterministische Engine-Semantik fuer Refill-, Runway- und Guardrail-nahe Entscheidungen stabilisieren.

Uebergabekriterien zu Schritt 2:

- Review-Findings im Arbeitsdokument beantwortet.
- Feature-Branch dokumentiert.
- Slice-Plan erstellt, falls Umsetzung mehr als 5 Dateien betrifft.
- Tests gemaess Einzelplan definiert oder ausgefuehrt.
- Bekannte Abweichungen aus Backtest-/Snapshot-Vergleichen dokumentiert.

Stop vor Schritt 2, wenn:

- Mindest-Runway oder Notfallgrenzen durch Glattung abgeschwaecht werden.
- `interpolateRange()` oder vergleichbare Severity-Logik nicht fuer aufsteigende und absteigende Skalen getestet ist.
- Engine- und UI-Begriffe fuer geglaettete Zielwerte auseinanderlaufen.

### Schritt 2: CAPE-to-Return kontinuierlich modellieren

Quelle: `CAPE_RETURN_KONTINUIERLICH_PLAN.md`

Ziel:

- Diskrete CAPE-Stufen durch eine kontrollierte kontinuierliche Return-Policy ergaenzen.
- Legacy-Verhalten hinter Feature-Flag vergleichbar halten.

Uebergabekriterien zu Schritt 3:

- Return-Policy ist als abgegrenztes Engine-Modul beschrieben oder umgesetzt.
- Legacy- und neue Policy sind per Flag vergleichbar.
- Auswirkungen auf `expectedRealReturn` sind mit Grenz- und Normalfaellen dokumentiert.
- Keine stillen Aenderungen an Dynamic-Flex ausserhalb des geplanten Policy-Pfads.

Stop vor Schritt 3, wenn:

- CAPE-Policy und bestehende VPW-/Dynamic-Flex-Logik unterschiedliche Einheiten oder Rundungen verwenden.
- Legacy-Flag keine belastbare Vergleichsbasis liefert.
- CAPE-Extremwerte nicht explizit begrenzt oder getestet sind.

### Schritt 3: Langlebigkeitsmodell konservativer machen

Quelle: `LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

Ziel:

- Entnahmehorizont konservativer modellieren.
- Paar-Dynamik, Todesfaelle im Jahreslauf und Joint-to-Single-Uebergang kontrolliert abbilden.

Uebergabekriterien zum Baseline-Freeze:

- Horizontberechnung ist fachlich dokumentiert.
- Single- und Paarprofile sind abgedeckt.
- Smoothing-/Uebergangslogik bei Partnersterben ist explizit getestet oder als Testfall festgelegt.
- Interaktion mit Legacy-CAPE und kontinuierlicher CAPE-Policy ist dokumentiert.

Stop vor Baseline-Freeze, wenn:

- `horizonYears` fuer gleiche Inputs nicht deterministisch reproduzierbar ist.
- Paar- und Single-Logik unterschiedliche Contract-Begriffe verwenden.
- Entnahmerate sprunghaft reagiert, ohne dass die Sprungstelle fachlich gewollt ist.

## Gate 1: Baseline-Freeze Engine-Semantik

Der Baseline-Freeze ist ein verbindliches Gate zwischen Schritt 3 und Schritt 4.

Stationary Bootstrap und Fat-Tail-/Crash-Modell duerfen nicht begonnen werden, solange dieses Gate nicht dokumentiert abgeschlossen ist.

### Zweck

Der Freeze fixiert die Referenzbasis nach Abschluss der deterministischen Engine-Aenderungen und vor Einfuehrung neuer stochastischer Pfadgeneratoren oder Crash-Overlays.

### Voraussetzungen und Rollback-Verfahren

- Schritt 1 bis 3 sind reviewed und fuer den Freeze freigegeben.
- Alle offenen Review-Findings sind beantwortet oder als bewusst akzeptiertes Restrisiko dokumentiert.
- Feature-Flags und Default-Verhalten sind dokumentiert.
- Tests gemaess Einzelplaenen sind ausgefuehrt.
- **Rollback-Verfahren:** Sollte an diesem Gate eine signifikante unerklaerte Abweichung oder ein Performance-Einbruch festgestellt werden, wird das Slice auf den Stand vor Beginn von Schritt 1 zurueckgesetzt (Rollback). Ein "Fix-Forward" im Hauptzweig ist unzulaessig.

### Pflichtartefakte

Der Freeze MUSS in einem separaten, unveraenderlichen Dokument unter `docs/internal/BASELINE_FREEZE_ENGINE_SEMANTIK.md` protokolliert werden. Es muss folgendes enthalten:

- Datum des Freeze, Branch und Commit-Hash.
- Dokumentation aller aktiven Feature-Flags.
- Verwendete Testkommandos und Referenzprofile.
- Zentrale Kennzahlen und bekannte Abweichungen zur alten Baseline.
- Offene Restrisiken und explizite Freigabe.

### Mindest-Referenzlaeufe & Flag-Matrix-Test

Es muss die komplette Matrix der zulaessigen Flag-Kombinationen validiert werden:
1. Legacy-Konfiguration (kontinuierliches CAPE aus, Langlebigkeitspuffer aus).
2. Nur kontinuierliches CAPE aktiv.
3. Nur Langlebigkeitspuffer aktiv.
4. Beide Features aktiv (Soll-Zustand).

Referenzprofile fuer jeden Lauf:
- Single-Person-Profil.
- Paar-Profil mit Joint-to-Single-Uebergang (Test auf sprunghaftes Verhalten).
- Historischer Backtest 2000-2025.
- Monte-Carlo Standardlauf mit fixiertem Seed.

## Schritt 4: Stationary Bootstrap ergaenzen

Quelle: `STATIONARY_BOOTSTRAP_PLAN.md`

Ziel:

- Stochastische Pfade mit Stationary Bootstrap erzeugen.
- Autokorrelation und Regime-Clustering besser erhalten als bei rein unabhaengiger Jahresziehung.

Startvoraussetzung:

- Gate 1 ist abgeschlossen.
- Freeze-Artefakt liegt vor oder ist im Roadmap-Dokument mit allen Pflichtfeldern protokolliert.

Uebergabekriterien zu Schritt 5:

- Klassischer Bootstrap und Stationary Bootstrap sind per Konfiguration getrennt ausfuehrbar.
- Seed-Verhalten ist reproduzierbar.
- Pfadlaengen, Blockwechsel und Randfaelle sind getestet.
- Vergleich gegen Freeze-Baseline ist dokumentiert.

Stop vor Schritt 5, wenn:

- Seed-Reproduzierbarkeit nicht stabil ist.
- Worker- und Serial-Pfade unterschiedliche Ergebnisse liefern.
- Bootstrap-Pfade nicht eindeutig als Eingabepfade, sondern faelschlich als Engine-Semantik interpretiert werden.

## Gate 2: Sampling-Freeze

Vor dem Fat-Tail-/Crash-Modell wird ein stochastischer Sampling-Freeze benoetigt.

### Zweck

Dieses Gate fixiert das Verhalten der Pfadgenerierung, bevor Extremereignisse als Overlay auf diese Pfade gelegt werden.

### Pflichtartefakt

Der Sampling-Freeze MUSS als eigenes, separates Dokument unter `docs/internal/SAMPLING_FREEZE_BOOTSTRAP.md` abgelegt werden. Es dokumentiert:

- Klassischer Bootstrap: Referenzlauf mit fixiertem Seed.
- Stationary Bootstrap: Referenzlauf mit fixiertem Seed (erwartete Blocklaenge 5).
- Dokumentation der Blockparameter und der RNG-Zufallszahlen-Verbrauchspfad.
- Kennzahlenvergleich gegen Baseline-Freeze.
- Entscheidung, welche Bootstrap-Variante fuer Fat-Tail-Tests als Default verwendet wird.

Stop vor Schritt 5, wenn:

- Sampling selbst noch nicht deterministisch reproduzierbar ist.
- Blockparameter unklar oder instabil sind.
- Historische Krisenjahre nicht fehlerfrei erkannt werden (Gefahr des Doppelpessimismus).

## Schritt 5: Fat-Tail- und Crash-Modell ergaenzen

Quelle: `FAT_TAIL_CRASH_MODELL_PLAN.md`

Ziel:

- Seltene Extremereignisse als optionales Stress-Overlay modellieren.
- Doppelpessimismus bei bereits historischen Krisenjahren vermeiden.

Startvoraussetzung:

- Gate 1 Baseline-Freeze abgeschlossen.
- Gate 2 Sampling-Freeze abgeschlossen.
- Stationary Bootstrap ist validiert oder bewusst fuer erste Fat-Tail-Slices deaktiviert.

Uebergabekriterien fuer Abschluss der Roadmap:

- Overlay ist optional und per Konfiguration deaktivierbar.
- Keine additiven Crash-Schocks auf bereits klassifizierte historische Krisenjahre ohne explizite Deckelung.
- **Bootstrap-Interaktionstest:** Es muss explizit nachgewiesen werden, dass der Doppelpessimismus-Schutz (Skip-Logik) auch bei sequenziellem Vorwaertslaufen und erzwungenen Restarts (z. B. Datenende-Wechsel im Stationary Bootstrap) vollstaendig synchron und korrekt arbeitet.
- Seed-Verhalten bleibt reproduzierbar.
- Stresskennzahlen sind gegen Freeze- und Sampling-Baseline interpretierbar.
- UI/Logs unterscheiden klar zwischen historischem Pfad, Bootstrap-Sampling und Fat-Tail-Overlay.
- **UI-Lauffaehigkeit:** Die Benutzeroberflaeche laesst sich nach dem Laden fehlerfrei bedienen und stuerzt bei Aktivierung des Overlays nicht ab (Browser-Smoke).

## Gemeinsame Review-Gates

Jeder Schritt braucht vor dem naechsten Schritt:

- aktualisierten Status im jeweiligen Arbeitsdokument,
- dokumentierte Review-Findings und Antworten,
- klare Entscheidung: `freigegeben`, `blockiert`, `freigegeben mit Restrisiko`,
- dokumentierte Test- oder Validierungslaeufe,
- aktualisierte offene Risiken.

Codex darf seine eigene Umsetzung nicht final freigeben. Die Freigabe erfolgt durch Gemini, Claude oder Nutzer.

## Gemeinsame Validierungslogik

Die Validierung soll pro Schritt erweitert, aber nicht jedes Mal neu erfunden werden.

Pflicht fuer Engine-nahe Schritte 1 bis 3:

- relevante fokussierte Tests gemaess Einzelplan,
- `npm run build:engine`, wenn Engine-API oder Engine-Module betroffen sind,
- `npm test`, wenn keine Stop-Regel greift.

Pflicht fuer stochastische Schritte 4 bis 5:

- reproduzierbare Seed-Laeufe,
- Worker-/Serial-Vergleich, falls beide Pfade existieren,
- Vergleich gegen Baseline-Freeze,
- Dokumentation der Konfiguration.

## Roadmap-Status

| Schritt | Status | Naechstes Gate | Bemerkung |
|---|---|---|---|
| 1 Regime-Uebergaenge | erledigt | freigegeben | In `ea863e86` umgesetzt und committed |
| 2 CAPE-to-Return | erledigt | freigegeben | In Slices 1-5 umgesetzt, reviewed und committed |
| 3 Langlebigkeit | erledigt | freigegeben | In `bed8d20` umgesetzt und committed |
| Gate 1 Baseline-Freeze | erledigt | freigegeben | Protokolliert in `BASELINE_FREEZE_ENGINE_SEMANTIK.md` (mit Blocker) |
| 4 Stationary Bootstrap | erledigt | freigegeben | Slices 1-5 umgesetzt und merged |
| Gate 2 Sampling-Freeze | erledigt | freigegeben | Protokolliert in `SAMPLING_FREEZE_BOOTSTRAP.md` |
| 5 Fat-Tail/Crash | geplant | Abschlussreview Roadmap | Start nach Behebung des returnPolicy-Blockers |

## Getroffene Review-Entscheidungen

Die offenen Punkte des Entwurfs wurden im Review am 2026-06-14 wie folgt entschieden:

- **Ablage der Freezes:** Die Freezes für Gate 1 und Gate 2 werden als separate, unveraenderliche Protokolldokumente (`BASELINE_FREEZE_ENGINE_SEMANTIK.md` und `SAMPLING_FREEZE_BOOTSTRAP.md`) gefuehrt. Das haelt die Roadmap uebersichtlich und sichert ein sauberes Audit-Trail.
- **Verweise in Einzelplaenen:** Jeder der fuenf Arbeitsplaene erhaelt in der Kopfzeile einen kurzen Verweis und Link auf dieses uebergeordnete Roadmap-Dokument, um die Kohaerenz zu wahren.
- **UI-Sicherheit:** Nach jedem Engine-Slice muss die Lauffaehigkeit der UI (fehlerfreies Starten und Rendering der App) verifiziert werden, um eine stille Degradierung der Frontend-Komponenten waehrend der Backend-Entwicklung zu verhindern.

## Review-Feedback von Gemini (Erstes Review - freigegeben)

### 1. Korrektheit
- Die Abarbeitungsreihenfolge ist logisch und minimiert das Risiko von doppelten Regressionstests bei Vergleichsbacktests.
- Die Integration von Flag-Matrix-Tests stellt sicher, dass unerwartete Mischzustaende der Feature-Flags systematisch aufgedeckt werden.

### 2. Vertragstreue
- Die Pflicht zur Erstellung separater Freeze-Protokolle (`BASELINE_FREEZE_ENGINE_SEMANTIK.md` und `SAMPLING_FREEZE_BOOTSTRAP.md`) sichert ein manipulationssicheres Audit-Trail.
- Die Verknuepfung der Arbeitsdokumente wurde geregelt.

### 3. Fehlerbehandlung
- Das eingefuehrte Rollback-Verfahren bei Gate-Fehlschlaegen verhindert unkontrollierte Commits im Hauptzweig.

### 4. Seiteneffekte
- Die explizite Interaktions-Pruefung des Doppelpessimismus-Schutzes im Zusammenspiel mit dem Stationary Bootstrap (Datenende-Szenarien) verhindert stummes Versagen der Ausschlusslogik bei komplexen Sampler-Schnittstellen.

### 5. Was könnte brechen?
- Ein schleichender Performance- und Memory-Drift bei sehr grossen Monte-Carlo-Laeufen im Web Worker. Die Lauffaehigkeits- und Smoke-Tests wurden daher fest in die Gates integriert.

## Review-Ergebnis (Erstes Review)
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Branch-Drift und Merge-Konflikte ueber fuenf sequenzielle Branches.
  - Hohe kombinatorische Parameterkomplexitaet.
- Pre-Mortem: Angenommen, diese koordinierte Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein unbemerktes Memory-Leak im Web-Worker-Pool bei aufeinanderfolgenden grossen MC-Laeufen, hervorgerufen durch unzureichende Speicherfreigabe geometrischer Bootstraps.
