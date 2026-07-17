# Slice Findings 02 – Markt-Evidenzregister und kompakter Hauptblock

**Stand:** 2026-07-17<br>
**Status:** implementiert – Review durch Gemini und Nutzerfreigabe ausstehend<br>
**Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)<br>
**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`<br>
**GitHub-Status:** nur lokal angelegt; Veröffentlichung nicht beauftragt

## Ziel

Slice 2 überführt die 69 Marktquellen-Records verlustfrei in ein normatives
Evidenzregister und verdichtet den Marktvergleich im Hauptdokument auf
Methodik, Stichprobe, Kriterien, Referenzfälle, Kernergebnisse,
Positionierung, Grenzen und Aktualisierung. Das Hauptdokument bleibt ohne
Öffnen des Registers verständlich; Detailbelege bleiben über stabile Anker
prüfbar.

## Akzeptanzkriterien

- Genau 69 eindeutige MKT-IDs sind im Markt-Evidenzregister definiert.
- Jede MKT-ID besitzt einen stabilen, eindeutigen Registeranker; alle
  Verwendungen im Hauptdokument sind auflösbar.
- Produktstufe, Region, Erhebungsstichtag, Evidenzklasse und Evidenzgrenze
  bleiben je Record erhalten.
- Stichprobe, K-01 bis K-18, RH-01 bis RH-04, Segmentbefunde,
  Positionierung, GAP-MKT-01 bis GAP-MKT-08 und Pflegevertrag bleiben im
  Hauptdokument eigenständig verständlich.
- Es entsteht keine Rangliste, Gesamtwertung oder unbeschränkte
  Exklusivitätsbehauptung.
- Der Forschungsblock bleibt unverändert; sein Umbau ist Scope von Slice 3.

## Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`;
- neues `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md`;
- diese Slice-Datei und die Rückdokumentation im Arbeitsplan;
- mechanische Prüfung von IDs, Ankern, lokalen Links und Wortumfang.

## Nicht-Scope

- neue Markt- oder Produktrecherche;
- Aktualisierung des eingefrorenen Erhebungsstands 2026-07-15;
- Änderungen am Forschungsblock oder Anlage des Forschungsregisters;
- Programm-, Test-, Build-, Paket- oder Konfigurationsänderungen;
- Änderungen an `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Commit, Push oder Veröffentlichung;
- die vorbestehenden ungetrackten Playwright-Dateien unter `node_modules/`.

## Branch- und Statusnachweis vor dem ersten Codex-Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git status --short --branch`:
  aktiver Branch wie vorgesehen; keine getrackten Änderungen; vorbestehend
  und außerhalb des Auftrags ausschließlich ungetrackte Playwright-Dateien
  unter `node_modules/`
- `git rev-parse HEAD`:
  `edd2088`
- sicherer Vorgängerstand:
  `docs: Slice 01 (Baseline und Messvertrag) abgeschlossen und freigegeben`

Die ungetrackten Abhängigkeiten werden weder verändert noch in den Scope
aufgenommen.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md` (neu)
- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_02_MARKT_EVIDENZREGISTER.md` (neu)
- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`

**Voraussichtliche Änderungstiefe:**

- mittel; ausschließlich Dokumentarchitektur, keine Laufzeitsemantik

**Gefährdete bestehende Tests:**

- keine Programmtests;
- redaktionelles Risiko bei MKT-ID-Verlust, defekten Ankern,
  Stufen-/Stichtagsverlust und zu starker Kürzung des eigenständig
  verständlichen Haupttexts.

**Nicht anfassen:**

- Programm-, Test-, Build- und Konfigurationsdateien;
- `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`;
- Forschungsblock ab `# Wissenschaftlicher Rahmen ...`.

**Rollback-Strategie:**

- bestehende Dokumente gezielt mit `git checkout -- <datei>` zurücksetzen;
- neue Register- und Slice-Datei nur nach ausdrücklicher Nutzerfreigabe
  entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regel für mehr als zehn Programmdateien greift nicht: Slice 2
verändert null Programmdateien.

## Geplante Validierung

- 69 eindeutige MKT-Definitionen und 69 eindeutige HTML-Anker zählen;
- für jede MKT-Verwendung im Hauptdokument eine Definition und einen
  Registeranker nachweisen;
- relative lokale Links und Markdown-Anker mechanisch prüfen;
- Forschungsblock bytegenau mit dem Vorgängerstand vergleichen;
- Wortzählung nach dem Vertrag aus Slice 1 wiederholen;
- nachweisen, dass Markt und Forschung zusammen im Zielkorridor liegen oder
  die endgültige Zielmessung ausdrücklich Slice 3 zuordnen;
- `git diff --check` und abschließenden Scope-Check ausführen.

`npm test` ist für diesen reinen Dokumentationsslice nicht erforderlich. Der
statische Evidenzvalidator wird erst in Slice 4 Teil des regulären Testgates.

## Durchgeführte Änderungen

- `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md` als normativen
  Beleganhang angelegt.
- Alle 69 bisherigen Recordzeilen inhaltlich unverändert übernommen und je
  MKT-ID mit einem eindeutigen HTML-Anker versehen.
- Die vollständige K-01-bis-K-18-Matrix beim Register geführt; Statuslexikon,
  Evidenzklassen und Pflegevertrag als gemeinsame Aussagegrenze ergänzt.
- Den Marktblock des Hauptdokuments auf Methodik, Stichprobe, Status- und
  Kriterienvertrag, RH-Referenzfälle, stufenscharfe Preisübersicht,
  Segmentbefunde, RH-Ergebniskarte, Positionierung, GAP-MKT-Register und
  Aktualisierungsroutine verdichtet.
- Alle 60 konkreten MKT-ID-Nennungen des Hauptblocks direkt auf den jeweiligen
  Registeranker verlinkt.
- Slice-Datei im Arbeitsplan verlinkt und den Implementierungsstand
  zurückdokumentiert.

## Ergebnisse

### Akzeptanznachweis

| Kriterium | Ergebnis |
| --- | --- |
| 69 von 69 MKT-IDs | 69 Definitionen, 69 eindeutige IDs und 69 eindeutige Anker |
| verlustfreie Recordübernahme | 69 alte und 69 neue Recordzeilen; nach Entfernen des neuen Ankers 0 Inhaltsdifferenzen |
| auflösbare Verwendungen | 0 undefinierte explizite oder slash-verkürzte MKT-Verwendungen |
| Haupttext-Anker | 60 MKT-ID-Links, 0 falsche oder fehlende Ziele, 0 unverlinkte konkrete MKT-IDs |
| Stufe, Region, Stichtag, Evidenzgrenze | durch inhaltsgleiche Records erhalten; Haupttext führt zusätzlich eine stufenscharfe Region-/Preisübersicht |
| eigenständiges Hauptdokument | Methodik, Stichprobe, K-01 bis K-18, RH-01 bis RH-04, Segmentbefunde, Positionierung, GAPs und Pflegevertrag bleiben enthalten |
| Forschungs-Scope | Block ab `# Wissenschaftlicher Rahmen ...` normalisiert bytegleich zum Vorgängerstand |
| Rangliste/Gesamtwertung | weiterhin ausdrücklich ausgeschlossen; keine neue Gesamtwertung eingeführt |

### Wortmessung nach dem Vertrag aus Slice 1

| Messgröße | Slice-1-Baseline | Nach Slice 2 | Delta |
| --- | ---: | ---: | ---: |
| Nenner | 34.582 | 28.561 | -6.021 |
| Markt | 8.860 | 2.839 | -6.021 |
| Forschung | 7.842 | 7.842 | 0 |
| Markt und Forschung | 16.702 | 10.681 | -6.021 |
| gemeinsamer Anteil | 48,30 % | 37,40 % | -10,90 Prozentpunkte |

Der Forschungsblock ist nun 5.003 Wörter größer als der Marktblock. Der
gemeinsame Zielkorridor von 20 bis 25 % ist erwartungsgemäß noch nicht
erreicht, weil die Forschungsrecords und Dossiers erst in Slice 3 ausgelagert
werden. U-K03 bleibt offen.

### Ausgeführte Validierung

- PowerShell-Recordvergleich gegen `HEAD`: 69/69 Recordzeilen, 0
  Inhaltsdifferenzen.
- ID-/Ankerprüfung: 69 Definitionen, 69 eindeutige IDs, 69 eindeutige Anker,
  0 Anker-/ID-Abweichungen.
- Verwendungsprüfung über Hauptdokument und Register: 0 undefinierte MKT-IDs;
  slash-verkürzte Matrixverweise wurden mit expandiert.
- Haupttext-Linkprüfung: 60 direkte MKT-ID-Links, 0 falsche Ziele und 0
  unverlinkte konkrete MKT-ID-Nennungen.
- Lokale Markdown-Ziele im Register: keine fehlende Datei; alle bekannten
  Haupttext-Ankerziele vorhanden.
- Forschungsblock: nach Zeilenendennormalisierung vollständig identisch mit
  `HEAD`.
- Wortzählung nach dem Slice-1-Vertrag: Nenner 28.561, Markt 2.839,
  Forschung 7.842, gemeinsam 10.681 beziehungsweise 37,40 %.
- `git diff --check`: grün, keine Ausgabe.
- Scope-Check: ausschließlich die vier geplanten Markdown-Dateien geändert
  beziehungsweise neu angelegt; die vorbestehenden Playwright-Dateien unter
  `node_modules/` blieben unangetastet.

`npm test` wurde nicht ausgeführt, weil keine Programm-, Test-, Build- oder
Konfigurationsdatei und keine Laufzeitsemantik geändert wurden. Das reguläre
Offline-Evidenzgate entsteht planmäßig erst in Slice 4.

## Abweichungen vom Plan

Keine Scope-Abweichung. Zusätzlich zu den 69 Quellenrecords wurde die
vollständige Kriterienmatrix in dasselbe normative Register verlagert. Das
ist die im Plan verlangte Konkretisierung „Kriterien im Hauptdokument
zusammenfassen“ und erhält die detaillierte Auditierbarkeit.

## Offene Risiken

- Die endgültige kombinierte Zielmessung für Markt und Forschung hängt vom
  noch ausstehenden Forschungsumbau in Slice 3 ab.
- Volatile externe Aussagen bleiben auf den eingefrorenen Stand 2026-07-15
  begrenzt; ihre erneute Erhebung ist Scope von Slice 4.
- Der statische Validator aus Slice 4 muss die heute manuell geprüften
  ID-, Anker-, Pflichtfeld- und Fälligkeitsverträge automatisieren.

## Rückdokumentation in den Arbeitsplan

Der Arbeitsplan verlinkt diese Slice-Datei, führt Slice 2 als implementiert
mit ausstehendem Review und dokumentiert Recordzahl, Wortmessung sowie das
weiter offene U-K03-Gate.

## Freigabestatus

Implementiert. Codex erteilt keine Eigenfreigabe; adversariales Review durch
Gemini und Nutzerfreigabe stehen aus. Commit und Push sind nicht erfolgt.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Auslagerung der 69 Marktquellenrecords ist verlustfrei erfolgt. Die Querverweise zwischen Hauptdokument und Register sind lückenlos verlinkt (60 Haupttext-Links).
2. **Vertragstreue:** Der Wortzählvertrag wurde eingehalten. Der Marktblock sank um 6.021 Wörter. Der Forschungsblock blieb bytegenau identisch mit dem Vorzustand.
3. **Fehlerbehandlung:** Keine Programmdateien editiert. Die Link- und Ankerstruktur wurde manuell auf Auflösbarkeit verifiziert.
4. **Seiteneffekte:** Das Hauptdokument gewinnt an Lesbarkeit. Die detaillierte Kriterienmatrix und das Statuslexikon wurden ebenfalls ins Register verschoben, was die logische Trennung zwischen Zusammenfassung und Evidenzebene schärft.
5. **Was könnte brechen?** Die bidirektionalen Links zwischen den beiden Dateien können bei künftigen Edits ohne statische Validierung leicht brechen. Dies wird erst in Slice 4 abgesichert.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 2) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Modifikationen an den Wettbewerberdaten (z. B. durch neue Versionen) werden unvollständig eingetragen (z. B. Aktualisierung des Haupttextes ohne Anpassung des Registers), wodurch Widersprüche zwischen den aggregierten Befunden im Hauptdokument und den Belegrecords im Evidenzregister entstehen.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Link-Integrität:* Möglicher Bruch der Querverweise bei künftigen Edits bis zur Einführung des Validators in Slice 4.
  - *Konsistenz bei Aktualisierungen:* Gefahr von Abweichungen zwischen Zusammenfassung und Register bei künftigen Aktualisierungen.
- Pre-Mortem: (Siehe oben – unvollständige Pflege bei Wettbewerber-Updates führt zu Widersprüchen zwischen Doku und Belegregister).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-02 | Nutzer | Slice 02 der Findings implementieren | freigegeben am 2026-07-17 | abgeschlossen |
