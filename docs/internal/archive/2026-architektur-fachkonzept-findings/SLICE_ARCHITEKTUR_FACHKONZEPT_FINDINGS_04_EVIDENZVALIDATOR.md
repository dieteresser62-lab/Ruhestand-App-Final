# Slice Findings 04 – Evidenzaktualität und statischer Dokumentvalidator

**Stand:** 2026-07-17<br>
**Status:** implementiert – Review durch Gemini und Nutzerfreigabe ausstehend<br>
**Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)<br>
**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`<br>
**GitHub-Status:** nur lokal angelegt; Veröffentlichung nicht beauftragt

## Ziel

Slice 4 macht Pflichtfelder, IDs, lokale Links, Anker, Datumsfelder und
Fälligkeiten der beiden normativen Evidenzregister deterministisch und
offline prüfbar. Das reguläre `npm test`-Gate muss bei einem Vertragsbruch
scheitern, ohne externe Ressourcen anzufordern. Live-Erhebungen bleiben ein
getrennter, datierter und quellennaher Pflegevorgang.

## Akzeptanzkriterien

- Der Validator arbeitet bei identischen Dateien, Prüfdatum und Optionen
  deterministisch und ohne Netzwerkzugriff.
- Genau 69 MKT- und 55 FOR-Records sowie MAP-01 bis MAP-17 sind eindeutig und
  strukturell vollständig.
- Jeder Record wird von genau einem Aktualitätsscope mit gültigem Datum der
  letzten und nächsten Prüfung erfasst.
- Ungültige oder doppelte IDs/Anker, leere Pflichtfelder, ungültige Datumswerte,
  defekte lokale Datei-/Ankerlinks und überfällige Scopes erzeugen klare
  Fehlercodes und einen fehlgeschlagenen Prozess.
- `npm run docs:evidence` bietet das fokussierte lokale Gate an.
- Eine gezielte Testdatei bindet positive und negative Contractfälle in
  `npm test` ein; das Testgate benötigt kein Internet.
- Die volatile Marktstichprobe wird am Umsetzungstag über offizielle
  Produkt-/Preis-/Methodenanker erneut geprüft und mit Datum, Quelle und
  Änderungsbefund dokumentiert.
- Wissenschaftliche und amtliche Quellen behalten ihre historische Version;
  ein Record wird nur bei nachgewiesen geändertem Daten- oder Berichtsstand
  inhaltlich aktualisiert.

## Scope

- neues `scripts/check-architecture-evidence.mjs`;
- neue gezielte Testdatei unter `tests/`;
- Scriptregistrierung in `package.json`;
- Aktualitäts- und Fälligkeitsvertrag in
  `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md` und
  `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`;
- Testinfrastruktur-Dokumentation in `tests/README.md`;
- diese Slice-Datei und Rückdokumentation im Arbeitsplan.

## Nicht-Scope

- Netzwerkzugriff aus Validator, Testdatei oder `npm test`;
- eine vollständige neue Markt- oder Literaturerhebung;
- Änderung von Produktpositionierung, Kriterienmatrix, Forschungsbefunden,
  MAP-/FR-/FQ-Verträgen oder Haupttext-Wortumfang;
- Paketinstallation, Dependency- oder Lockfile-Änderung;
- Änderungen an Engine-, Worker-, UI-, Persistenz- oder Datenverträgen;
- Änderungen an `engine.js`, `dist/`, `RuheStandSuite.exe` oder
  `node_modules/`;
- Commit, Push oder Veröffentlichung.

## Branch- und Statusnachweis vor dem ersten Codex-Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git status --short --branch`:
  aktiver Branch wie vorgesehen; keine getrackten Änderungen; vorbestehend
  und außerhalb des Auftrags ausschließlich ungetrackte Playwright-Dateien
  unter `node_modules/`
- `git rev-parse HEAD`:
  `a1aa070`
- sicherer Vorgängerstand:
  `docs: Slice 03 (Forschungs-Evidenzregister und Hauptblock-Kompaktierung) freigegeben`

Die ungetrackten Abhängigkeiten werden weder verändert noch in den Scope
aufgenommen.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- `scripts/check-architecture-evidence.mjs` (neu)
- `tests/architecture-evidence.test.mjs` (neu)
- `package.json`
- `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md`
- `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`
- `tests/README.md`
- diese Slice-Datei
- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`

**Voraussichtliche Änderungstiefe:**

- mittel; drei Programm-/Konfigurationsdateien und normative Dokumentation,
  aber keine Laufzeit- oder Engine-Semantik

**Gefährdete bestehende Tests:**

- automatische Testdatei-Discovery im gemeinsamen Runner;
- das reguläre `npm test`-Gate, falls der neue Offline-Wrapper unerwartete
  vorbestehende Markdown-Inkonsistenzen sichtbar macht;
- lokale Querverweise und HTML-/Markdown-Anker der drei Evidenzdokumente.

**Nicht anfassen:**

- Engine-, Worker-, UI-, Persistenz- und Profilmodule;
- `package-lock.json`, weil eine reine Scriptregistrierung den Paketvertrag
  und die Dependency-Auflösung nicht ändert;
- `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`;
- Produktpositionierung und Forschungsbewertung.

**Rollback-Strategie:**

- bestehende Dateien gezielt mit `git checkout -- <datei>` zurücksetzen;
- neue Script-, Test- und Slice-Datei nur nach ausdrücklicher Nutzerfreigabe
  entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regel für mehr als zehn Programmdateien greift nicht: Slice 4 plant
drei Programm-/Konfigurationsdateien. Engine-Semantik, FlowDelta,
`minimumFlexAnnual` und UI-/Engine-Parameterverträge werden nicht berührt.

## Geplante Validierung

- fokussiert `node tests/run-single.mjs tests/architecture-evidence.test.mjs`;
- fokussiert `npm run docs:evidence`;
- vollständiges Pflichtgate `npm test`;
- negative Contractfälle für doppelte/undefinierte IDs, leere Pflichtfelder,
  ungültige und überfällige Datumswerte sowie defekte lokale Links;
- Determinismusprüfung mit festem Prüfdatum;
- statischer Nachweis, dass das Validator-Modul keine Netzwerkmodule oder
  `fetch` verwendet;
- `git diff --check` und abschließender Scope-/Statuscheck.

## Durchgeführte Änderungen

- `scripts/check-architecture-evidence.mjs` als DOM- und netzwerkfreien
  ESM-Validator angelegt. Das Modul bietet eine wiederverwendbare API und
  einen CLI-Pfad mit optional festem `--check-date`.
- MKT-/FOR-Recordtabellen auf erwartete Anzahl, Spaltenzahl, nicht leere
  Pflichtfelder, eindeutige IDs und ID-konforme explizite Anker abgesichert.
- MAP-01 bis MAP-17, lokale Markdown-Dateien und Zielanker sowie alle
  expliziten MKT-/FOR-/MAP-Verweise der drei Evidenzdokumente in denselben
  deterministischen Bericht aufgenommen.
- In beiden Evidenzregistern einen maschinenlesbaren Aktualitäts- und
  Fälligkeitsvertrag ergänzt: 11 Markt- und 7 Forschungs-Scopes decken jeden
  Record genau einmal ab und führen letzte/nächste Prüfung, Prüfklasse,
  Quellenbasis und Änderungsbefund.
- Die zehn volatilen Marktgruppen am 2026-07-17 über ihre offiziellen
  Produkt-, Preis-, Rechner-, FAQ- oder Methodeneinstiege geprüft. Das neue
  BVI-Seitendatum 2026-07-02 wurde übernommen; die übrigen für die
  Positionierung tragenden Befunde blieben unverändert.
- IRS Publication 590-B, Shillers laufende Datenseite, die Destatis-Tabelle
  61111-0002 und BMG-Pflegedaten als amtlich/dynamische Stichprobe geprüft.
  Die dokumentierten Versionen blieben unverändert; die Stichprobe wurde
  ausdrücklich nicht als vorgezogene Vollprüfung ausgegeben.
- `npm run docs:evidence` in `package.json` registriert und über
  `tests/architecture-evidence.test.mjs` in die automatische
  `npm test`-Discovery eingebunden.
- Positive Baseline, Determinismus und negative Fälle für Duplikate, leere
  Felder, Datumsfehler, Überfälligkeit, fehlende Scopes, defekte Datei-/
  Ankerlinks, undefinierte IDs sowie den Non-zero-CLI-Exit getestet.
- `tests/README.md` mit fokussiertem Befehl, Offline-Grenze, Testinventar und
  aktueller Suite-Messung synchronisiert.
- Slice-Datei im Arbeitsplan verlinkt und Implementierungsstand,
  Akzeptanzmessung sowie offenes U-K04-Gate zurückdokumentiert.

## Ergebnisse

### Akzeptanznachweis

| Kriterium | Ergebnis |
| --- | --- |
| deterministisch und offline | zwei Läufe mit identischen Dokumenten und festem Datum liefern bytegleiches JSON; Validator importiert nur lokale Node-Datei-/Pfadmodule und verwendet kein `fetch` |
| Record-/MAP-Vertrag | 69 eindeutige MKT-, 55 eindeutige FOR-Records und 17 eindeutige MAP-Anker |
| Pflichtfelder und IDs | Marktzeilen mit sieben, Forschungszeilen mit vier Pflichtfeldern; Duplikat-, Leerfeld-, Anker- und undefinierte-ID-Fehlercodes negativ getestet |
| Aktualität/Fälligkeit | 11 Markt- und 7 Forschungs-Scopes; jeder Record genau einmal zugeordnet; ISO-Datum, Reihenfolge, Zukunft und Überfälligkeit fail-closed |
| lokale Links und Anker | alle lokalen Datei-/Ankerziele in Hauptdokument und Registern auflösbar; Datei- und Ankerbruch separat negativ getestet |
| fokussiertes Gate | `npm run docs:evidence` erfolgreich; verständlicher CLI-Bericht und Non-zero-Exit bei überfälligem Prüfdatum |
| reguläres Testgate | neue Testdatei automatisch in `npm test`; kein Internet erforderlich |
| externe Aktualisierung | Marktprüfung 2026-07-17 pro Produktgruppe mit offiziellem Quellenanker dokumentiert; BVI-Revisionsdatum auf 2026-07-02 aktualisiert |
| Forschungs-/Amtsversionen | gezielte Stichprobe dokumentiert, kein geänderter Daten-/Berichtsstand bei den geprüften Ankern und kein historischer Recordaustausch |

### Ausgeführte Validierung

- `npm run docs:evidence`: grün; 69 MKT-, 55 FOR-Records, 17 MAP-Anker,
  11 Markt- und 7 Forschungs-Scopes; Netzwerkzugriff keiner.
- `node tests/run-single.mjs tests/architecture-evidence.test.mjs`: 19/19
  Assertions, 0 fehlgeschlagene Dateien.
- `npm test`: 108 Testdateien entdeckt, 107 im Node-Gate ausgeführt,
  4.460/4.460 Assertions, 0 fehlgeschlagene Dateien, 1 separates Browser-Gate
  und 0 offene Handles.
- `git diff --check`: grün, keine Ausgabe.
- Scope-Check: ausschließlich die acht geplanten Slice-Dateien geändert oder
  neu angelegt; die vorbestehenden ungetrackten Playwright-Dateien unter
  `node_modules/` blieben unangetastet.

Das Browser-Smoke-Gate wurde nicht ausgeführt, weil Slice 4 keine UI-, DOM-,
Layout- oder Browsersemantik ändert. Engine-Build, Tauri-Build und
`package-lock.json` sind ebenfalls nicht betroffen.

## Abweichungen vom Plan

- `package-lock.json` wurde wie vorgesehen nicht geändert: Das neue npm-Script
  verändert weder Abhängigkeiten noch Paketauflösung.
- Die volatile Marktprüfung ergab genau eine quellennahe Metadatenänderung:
  Der BVI-Rechner weist inzwischen den 2026-07-02 statt des zuvor
  dokumentierten 2026-06-15 aus. Methodik, Kriterienzuordnung und
  Positionierung änderten sich dadurch nicht.
- Es war keine Stop-Regel betroffen. Alle offiziellen Einstiegsquellen waren
  erreichbar; kein Widerspruch kippte einen zentralen Befund.

## Offene Risiken

- Ein statischer Validator belegt Struktur und Fälligkeit, nicht die
  inhaltliche Wahrheit externer Aussagen.
- Live-Quellen können zwischen zwei Fälligkeitsterminen geändert werden; das
  periodische Gate ersetzt keine ereignisgetriebene Marktbeobachtung.
- Automatisch erzeugte Markdown-Anker sind rendererabhängig. Normative
  Register-IDs verwenden deshalb explizite HTML-Anker; Überschriftenanker
  werden nur für vorhandene lokale Navigation geprüft.
- Nach Ablauf eines `Nächste Prüfung`-Datums wird `npm test` absichtlich rot,
  bis die betroffene Quellenfamilie geprüft und datiert rückdokumentiert ist.
  Das ist ein Governance-Gate, kein technischer Fallback.

## Rückdokumentation in den Arbeitsplan

Der Arbeitsplan verlinkt diese Slice-Datei, führt Slice 4 als implementiert
mit ausstehendem Review und dokumentiert Validatorumfang, 18 Fälligkeitsscopes,
externe Aktualitätsprüfung, BVI-Datumsänderung sowie Fokus- und
Gesamtsuite-Ergebnis. U-K04 bleibt bis zum adversarialen Review und zur
Nutzerfreigabe offen.

## Freigabestatus

Implementiert. Codex erteilt keine Eigenfreigabe; adversariales Review durch
Gemini und Nutzerfreigabe U-K04 stehen aus. Commit und Push sind nicht
freigegeben beziehungsweise nicht erfolgt.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Implementierung von `check-architecture-evidence.mjs` ist extrem sauber, modular und deterministisch gelöst.
2. **Vertragstreue:** Der Validator importiert keinerlei Netzwerkmodule und verwendet kein `fetch`. Die Offline-Validierung ist vollständig erfüllt.
3. **Fehlerbehandlung:** Der Validator und der Test-Runner prüfen negative Contractfälle (leere Felder, ID-Duplikate, ungültige Datumsformate und Fälligkeiten) ab. Ein Verstoß führt deterministisch zum Prozess-Fehlercode (exit 1).
4. **Seiteneffekte:** Keine Dependency-Upgrades. `package-lock.json` wurde nicht modifiziert. `package.json` führt ausschließlich das neue Dokumentenprüfskript `docs:evidence`.
5. **Was könnte brechen?** Die Überfälligkeit von Aktualisierungsterminen ist ein Governance-Blocker. Nach Erreichen des Datums `2026-10-17` wird `npm test` fehlschlagen. Dies ist beabsichtigt (fail-closed), erfordert aber kontinuierliche Dokumentationspflege.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 4) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Das Aktualitätsdatum eines Scopes (z. B. `MKT-RS`) läuft ab, und der CI-Build bricht ab. Wenn das Entwicklerteam unter Zeitdruck steht und die Quelle nicht sofort verifizieren kann, besteht die Gefahr, dass das Fälligkeitsdatum blind per Edit hochgesetzt wird (Sicherheitsumgehung), um das Gate grün zu bekommen, wodurch der eigentliche Aktualitätsabgleich wertlos wird.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Governance-Blockade:* CI/CD-Abbrüche bei abgelaufenen Fälligkeiten sind beabsichtigt, können aber bei Entwicklern zu Umgehungsversuchen führen.
- Pre-Mortem: (Siehe oben – blindes Hochschieben der Fälligkeiten zur Gate-Umgehung).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-04 | Nutzer | Slice 04 implementieren | freigegeben am 2026-07-17 | abgeschlossen |
| S04-AKT-01 | Live-Aktualitätsprüfung | BVI-Seite führt Revisionsdatum 2026-07-02 | quellennahe Aktualisierung | Recorddatum geändert; Methodik und Positionierung unverändert |
| S04-LOCK-01 | Scope-Prüfung | reine Scriptregistrierung benötigt kein Lockfile-Diff | `package-lock.json` nicht ändern | erledigt |
