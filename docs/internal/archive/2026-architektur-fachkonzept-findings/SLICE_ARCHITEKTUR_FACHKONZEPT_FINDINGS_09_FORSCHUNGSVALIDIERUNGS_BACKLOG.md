# Slice 9 – Forschungsvalidierungs-Backlog operationalisieren

**Stand:** 2026-07-17

**Status:** implementiert; Review ausstehend

**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`

**GitHub-Status:** Branch nur lokal; Veröffentlichung nicht beauftragt

**Übergeordneter Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)

## Ziel

FR-01 bis FR-12 und FQ-01 bis FQ-10 werden in einen priorisierten,
ausführbaren Forschungsvalidierungs-Backlog überführt. Der Backlog definiert
gemeinsame Eingangsgates, Owner, Eingaben, Mindestnachweise,
Abbruchkriterien, Ergebnisartefakte und gesperrte Wirksamkeitsaussagen. Er
schließt keine Forschungsfrage und hebt keinen Evidenzstatus allein durch
Planung an.

## Akzeptanzkriterien

- Jede FR-/FQ-ID besitzt einen nächsten ausführbaren Schritt oder eine
  begründete externe Daten-, Methodikreview- oder Replikationsabhängigkeit.
- FQ-01 bis FQ-04 sind als Priorität-1-Pakete mit Eingangsgates,
  Mindestnachweisen, Abbruchkriterien, Ownern und Ergebnisartefakten
  operationalisiert.
- FQ-05 bis FQ-10 besitzen mindestens Owner, Eingaben, nächsten Schritt,
  Ergebnisartefakte und Freigabegrenze.
- Datenmanifest, Kosten-/Steuervertrag, PD-01, PD-02, vollständiges
  Trial-Logging und unangetastete Holdouts sind als explizite Abhängigkeiten
  dokumentiert.
- Jedes Forschungspaket benötigt vor Programmänderungen ein eigenes
  Arbeitsdokument; jeder spätere Slice bleibt auf höchstens zehn
  Programmdateien begrenzt.
- Kein offenes Risiko wird als erledigt geführt. Formulierungen wie
  „verbessert Robustheit“, „senkt Risiko“ oder „optimiert Entnahmen“ bleiben
  bis zum jeweils definierten Mindestnachweis gesperrt.
- Hauptdokument, Forschungsregister, interner Doku-Index und Korrekturplan
  verweisen widerspruchsfrei auf den neuen Backlog.

## Scope

### Dokumentation

- `docs/internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md` (neu)
- diese Slice-Datei (neu)
- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`
- `docs/internal/README.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`

### Programm- und Testdateien

- keine

## Nicht-Scope

- Durchführung einer FQ-Studie oder Erhebung neuer externer Daten;
- Implementierung von Datenimport, Kostenmodell, Trial-Logger, Holdout-Runner,
  neuen KPIs oder Pflegekalibrierung;
- Änderung von Evidenzstatus, FR-/FQ-Status oder Wirksamkeitsaussagen;
- Änderung von Engine-, Simulator-, Worker-, Persistenz- oder UI-Semantik;
- Änderungen an `minimumFlexAnnual`, `engine/`, `engine.js`, `dist/` oder
  `RuheStandSuite.exe`;
- Live-HTTP-Prüfung, Commit, Push oder Veröffentlichung;
- vorbestehende ungetrackte Playwright-Dateien unter `node_modules/`.

## Branch- und Statusnachweis vor dem ersten Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git rev-parse --short HEAD`: `ee359f9`
- sicherer Vorgänger: freigegebener Slice-08-Commit
  `ee359f9 docs/test/kpi: Slice 08 (Präzisierung des
  Depot-Erschöpfungs-Labels) freigegeben`
- getrackte Voränderungen: keine;
- vorbestehend und außerhalb des Auftrags: ungetrackte Playwright-Dateien
  unter `node_modules/`.

## Diff-Risiko vor der Umsetzung

**Geplante Dateien:**

- die sechs Markdown-Dateien aus dem Scope, darunter zwei neue Dateien.

**Voraussichtliche Änderungstiefe:**

- mittel; keine Laufzeitänderung, aber ein normativer Forschungs-, Freigabe-
  und Aussagevertrag mit zehn Folgepaketen.

**Gefährdete bestehende Tests und Verträge:**

- lokale Links zwischen Hauptdokument, Forschungsregister und internem
  Backlog;
- vollständige und widerspruchsfreie Zuordnung von FR-01 bis FR-12 und FQ-01
  bis FQ-10;
- Offline-Evidenzvalidator für die drei normativen Referenzdokumente;
- Aussagegrenze aus E.8 des Hauptdokuments.

**Nicht anfassen:**

- alle Programm-, Test-, Build- und generierten Dateien;
- bestehende FOR-/MAP-Records, deren Evidenzstatus und Quellenstand;
- PD-01-/PD-02-Implementierung, `minimumFlexAnnual` und `node_modules/`.

**Rollback-Strategie:**

- bestehende Scope-Dateien gezielt mit `git checkout -- <datei>` auf den
  Slice-08-Stand zurücksetzen;
- die beiden neuen Markdown-Dateien nur nach ausdrücklicher Nutzerfreigabe
  entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regeln greifen nicht: Der Slice verändert null Programmdateien,
keinen Contract und keine Engine-Semantik. Sobald eine Forschungsausführung,
eine Wirksamkeitsaussage oder Programmänderung erforderlich würde, stoppt der
Slice und verweist auf das dafür freizugebende Folgearbeitsdokument.

## Vorher-Baseline

Vor den normativen Doku-Edits werden erhoben:

1. grüner Stand des Offline-Evidenzvalidators;
2. vollständiges Vorkommen von FR-01 bis FR-12 und FQ-01 bis FQ-10 im
   Hauptdokument;
3. Fehlen eines eigenständigen operationalisierten Forschungsbacklogs;
4. aktueller Branch-, Status- und Scope-Stand.

Die Baseline wurde am 2026-07-17 auf `ee359f9` erhoben:

| Prüfung | Vorher-Ergebnis |
| --- | --- |
| `npm run docs:evidence` | bestanden; 69 MKT-, 55 FOR-Records, 17 MAP-Anker und 18 Aktualitätsscopes |
| FR-/FQ-Definitionen im Hauptdokument | 12 FR- und 10 FQ-Tabellenzeilen vollständig |
| eigenständiger Forschungsvalidierungs-Backlog | nicht vorhanden |
| Branch/Status | korrekter Feature-Branch; keine getrackte Voränderung; nur vorbestehendes ungetracktes Playwright unter `node_modules/` |

## Geplante Validierung

- `npm run docs:evidence` vor und nach den Edits;
- `node tests/run-single.mjs tests/architecture-evidence.test.mjs`;
- `npm test` als reguläres Repository-Gate;
- statische Prüfung, dass FR-01 bis FR-12 und FQ-01 bis FQ-10 jeweils im
  Backlog abgebildet sind;
- Link- und Ankerprüfung für die neuen Querverweise;
- Suche nach unzulässigen Status- oder Wirksamkeitsformulierungen;
- `git diff --check` sowie abschließender Branch-, Status- und Scope-Check.

Ein Engine-Build und Browser-Gate sind nicht vorgesehen, weil weder EngineAPI
noch sichtbare Anwendung geändert werden.

## Ergebnisse

### Durchgeführte Änderungen

- `FORSCHUNGSVALIDIERUNGS_BACKLOG.md` führt die Nachweisstufen FV0 bis FV5
  ein. FV0 ist ausschließlich Planung; eine enge Wirksamkeitsaussage ist
  frühestens nach unabhängigem Methodikreview auf FV4 vorschlagbar,
  Übertragbarkeit über den geprüften Datenraum erst nach FV5 oder externer
  Evidenzsynthese.
- Acht gemeinsame Eingangsgates definieren eingefrorene Baseline und
  Protokoll, Forschungsdatenmanifest, Kosten-/Steuervertrag, PD-01-/PD-02-
  Einheitenvertrag, append-only Trial-Logging, echte Holdout-Sperre,
  mehrdimensionales Ergebnisbündel sowie Reproduktion und Review.
- FQ-01 bis FQ-04 sind als Priorität-1-Pakete mit Owner-Rollen, Eingaben,
  nächstem Schritt, Mindestnachweis, Ergebnisartefakten, Abbruchkriterien,
  Aussagegrenzen und erwarteten Programmdateien operationalisiert.
- FQ-05 bis FQ-10 besitzen als nachgelagerte Pakete dieselben ausführbaren
  Kernelemente und jeweils eine konkrete Scope-/Freigabegrenze.
- Alle zehn Pakete benötigen vor Programmänderungen ein eigenes
  Arbeitsdokument und bleiben je Umsetzungsslice unter zehn Programmdateien.
  Größere oder semantisch erweiterte Vorhaben müssen vor Coding geteilt oder
  neu entschieden werden.
- Die FR-Matrix weist FR-01 bis FR-12 jeweils einem nächsten Schritt und einem
  oder mehreren FQ-Paketen zu. Steuer/Recht, internationale Daten,
  Zeitreihen-/Risikomethodik, Aktuariat/Pflege, tatsächliche
  Nutzerpräferenzen und unabhängige Replikation sind dort als nicht lokal
  ersetzbare Abhängigkeiten markiert.
- Hauptdokument und Forschungsregister verweisen auf den Backlog, stellen aber
  klar, dass er keine FR/FQ schließt und keinen MAP-Evidenzstatus anhebt. Der
  interne Doku-Index führt Plan und Backlog als aktive Dokumente.

Alle zwölf FRs und alle zehn FQs bleiben offen; alle FQ-Statuszeilen stehen auf
FV0. Es wurde keine Produkt-, Test-, Build- oder generierte Datei geändert.

### Ausgeführte Validierung

| Prüfung | Ergebnis |
| --- | --- |
| `npm run docs:evidence` | bestanden; 69 MKT-, 55 FOR-Records, 17 MAP-Anker und 18 Aktualitätsscopes; kein Netzwerk |
| `architecture-evidence.test.mjs` | 19/19 Assertions grün, einschließlich lokaler Datei-/Ankerlinks |
| statische FR-Abdeckung | FR-01 bis FR-12 jeweils im Backlog enthalten und in der Zuordnungsmatrix mit nächstem Schritt abgebildet |
| statische FQ-Abdeckung | zehn Paketüberschriften und zehn FV0/offen-Statuszeilen für FQ-01 bis FQ-10 |
| Paketverträge | Owner 28-mal, Abbruchvertrag 15-mal dokumentiert; alle Priorität-1-Pakete mit Mindestnachweis und erwarteter Programmdateigrenze |
| `npm test` | 111 entdeckte Testdateien; 4.585/4.585 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `git diff --check` sowie Branch-/Status-/Scope-Check | bestanden; sechs erwartete Markdown-Dateien; nur vorbestehendes Playwright unter `node_modules/` außerhalb des Scopes |

`npm run build:engine` und das Browser-Gate wurden vertragsgemäß nicht
ausgeführt: EngineAPI, Produktcode und sichtbare Anwendung sind unverändert.

## Abweichungen vom Plan

- Keine. Der tatsächliche Scope entspricht den geplanten sechs
  Markdown-Dateien und umfasst null Programmdateien.

## Offene Risiken

- Planung erzeugt noch keine externe Datenqualität, statistische Power,
  Unabhängigkeit oder Wirksamkeitsevidenz.
- Konkrete fachliche Owner-Personen und Holdout-Custodians sind erst vor Start
  des jeweiligen Pakets durch den Nutzer zu benennen; bis dahin bleibt FV0
  verbindlich.
- Die genaue `msci_eur`-Variante und weitere Daten-/Kostenverträge sind
  bewusst nicht in Slice 9 erfunden, sondern Abbruch- und Eingangsgates von
  FQ-01.
- Historisch bereits betrachtete Varianten und Testsets können nicht
  rückwirkend zu unabhängigen Holdouts erklärt werden.
- Der lokale Branch ist nicht veröffentlicht; dies ist ohne Push-Auftrag kein
  Implementierungsblocker.

## Rückdokumentation in den Arbeitsplan

Slice-Datei, Backlogvertrag, Paket-/FR-Abdeckung, Scope und Testergebnisse sind
im Korrekturplan dokumentiert. Slice 9 steht dort auf `implementiert`; U-K09
bleibt bis zum externen Review und zur Nutzerfreigabe ausstehend.

## Freigabestatus

- Implementierung durch Codex: abgeschlossen; keine Eigenfreigabe
- U-K09 / Forschungsvalidierungs-Backlog: ausstehend
- Review der Slice-Implementierung: ausstehend
- lokaler Commit: nicht durch Codex; erst nach positivem Review und
  Nutzerfreigabe
- Push: nicht beauftragt

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Strukturierung des Backlogs in sechs Nachweisstufen (FV0 bis FV5) und acht Eingangsgates ist hochgradig methodensicher und deckt alle Risiken ab.
2. **Vertragstreue:** Alle FR-01 bis FR-12 und FQ-01 bis FQ-10 sind vollständig, konsistent und nachvollziehbar abgebildet und bleiben korrekt als "offen (FV0)" klassifiziert.
3. **Fehlerbehandlung:** Keine Programmdatei-Änderungen. Die Querverweise zwischen den Dokumenten wurden durch den Evidenzvalidator (`npm run docs:evidence`) erfolgreich geprüft.
4. **Seiteneffekte:** Keine Auswirkungen auf den App-Laufzeitcode. Der interne Dokumentenindex `docs/internal/README.md` ist synchronisiert.
5. **Was könnte brechen?** Es handelt sich um ein reines Steuerungskonzept. Es gibt kein funktionales Bruchrisiko.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 9) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Das Team startet ein FQ-Vorhaben (z. B. FQ-01), verletzt dabei aber die strengen Eingangsgates (z. B. FV-G06 Holdout-Register), weil die Verlockung groß ist, den Code direkt zu patchen, ohne zuvor das Protokoll unbeeinflusst von Daten- und Optimizerergebnissen einzufrieren. Dies führt zu überoptimierten, im echten Leben fehlschlagenden Strategien.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Governance-Disziplin:* Der Backlog existiert nur auf dem Papier. Seine Wirksamkeit hängt zu 100 % davon ab, dass Entwickler und Nutzer die Eingangsgates und Sperren (z. B. Holdouts) in Folgeslices streng einhalten.
- Pre-Mortem: (Siehe oben – Missachtung der Holdout-Sperre bei künftigen FQ-Läufen).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Werden nach konkretem Slice-Feedback ergänzt. Codex erteilt keine
Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-K09 | Nutzer/Reviewer | Forschungsvalidierungs-Backlog | freigegeben am 2026-07-17 | abgeschlossen |
