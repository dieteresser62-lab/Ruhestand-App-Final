# Slice Balance Hardening 02: Jahresperioden-Contract

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** erledigt; durch Gemini freigegeben und als `21a0e0f` committed
**Prioritaet:** P0

## Ziel

Ein DOM-freier Perioden- und Zustandsvertrag legt fest, welches Kalenderjahr abgeschlossen wird, welche Schritte geplant sind und ob ein Aufruf neu, bereits abgeschlossen oder recovery-pflichtig ist.

## Akzeptanzkriterien

- Perioden-ID ist stabil und unabhaengig vom Ausfuehrungszeitpunkt.
- Preflight und Planerstellung mutieren weder DOM noch Persistenz.
- Status mindestens: `ready`, `already_committed`, `incomplete_recovery`, `invalid`.
- Derselbe abgeschlossene Zeitraum kann nicht zweimal committed werden.
- Der Vertrag beschreibt Alter vorher/nachher, Bedarfsinflation, Marktdatenjahr und Ausgabenjahr konsistent.
- Definierte Fehlerobjekte sind fuer UI und Tests stabil.
- Legacy-State ohne Periodenmetadaten liefert `legacy_confirmation_required`, nicht automatisch `already_committed` oder `incomplete_recovery`.

## Scope

Programmdateien, maximal 2:

- neues DOM-freies Modul `app/balance/balance-annual-period.js`
- neuer Contract-Test `tests/balance-annual-period.test.mjs`

## Nicht-Scope

- noch keine Integration in Buttons oder Storage;
- keine Netzwerkabrufe;
- keine Engine-Aenderung.

## Diff-Risiko vor Start

Startstatus am 2026-07-13 vor Coding:
- aktiver Branch: `codex/balance-app-hardening`;
- `git status --short`: ausschliesslich fremde untracked Playwright-Dateien unter `node_modules`;
- Basis-Commit: `dabd3d8` (`feat(balance-hardening): implement Slice 01 - Profilverbund net allocation (D-01 Variant A)`);
- Nutzerauftrag zum Beginn von Slice 02 liegt vor.

Geplante Dateien:
- `app/balance/balance-annual-period.js` (neu);
- `tests/balance-annual-period.test.mjs` (neu);
- diese Slice-MD und der Hauptplan nur zur Rueckdokumentation.

Voraussichtliche Aenderungstiefe: **mittel**, da ein neuer reiner Contract ohne Laufzeitintegration entsteht.
Gefaehrdete Tests: keine direkten; Folge-Slice 03 integriert den Contract und ist auf stabile Status-/Fehlerwerte angewiesen.
Nicht anfassen: bestehende Orchestratoren, Persistenzadapter, `engine/`, `engine.js`, `dist/` und fremde Playwright-Dateien unter `node_modules`.
Rollback: neue Dateien nur nach Freigabe loeschen; Doku gezielt mit `git checkout -- <datei>` zuruecknehmen.

## Umsetzungsschritte

1. Perioden-ID und Zustandsuebergaenge als Datenmodell definieren.
2. Pure Funktionen fuer Preflight, Plan und Commit-Pruefung implementieren.
3. Grenzfaelle testen: Jahresmitte, Jahresanfang, wiederholter Aufruf, fehlende Metadaten, halbfertiger Commit.
4. Datenvertrag fuer Slice 03 dokumentieren.

## Legacy-Migration

- Es erfolgt keine Heuristik aus Alter, `lastInflationAppliedAtAge`, Dateinamen oder aktuellem Kalenderjahr, weil diese Werte keinen abgeschlossenen Jahresprozess beweisen.
- Beim ersten Lauf mit Legacy-State erzeugt der Preflight `legacy_confirmation_required` und schlaegt die aus Systemdatum und Eingaben abgeleitete Zielperiode nur als Vorschlag vor.
- Der Nutzer bestaetigt einmalig: Zielperiode und Status `noch nicht abgeschlossen` oder `bereits abgeschlossen`.
- `noch nicht abgeschlossen` erzeugt nur Baseline-Metadaten; der anschliessende Jahresprozess darf einmal committen.
- `bereits abgeschlossen` setzt `lastCommittedPeriod` auf die bestaetigte Periode, ohne Alter, Bedarf oder Marktdaten erneut zu mutieren.
- Abbruch laesst den Legacy-State unveraendert und blockiert den Jahresprozess.
- Pflichttests: beide Bestaetigungsvarianten, Abbruch, Wiederholung und State mit teilweise vorhandenen neuen Metadaten.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-period.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

- Neues DOM- und persistenzfreies Modul mit Schema-Version 1, stabiler Perioden-ID `calendar-year:<YYYY>` und expliziten Statuswerten angelegt.
- Preflight und Planerstellung validieren Zieljahr, Alter und vollstaendige Metadaten fail-closed; teilweise vorhandene neue Metadaten werden nicht als Legacy umgedeutet.
- Der Plan bindet Alter vorher/nachher, Inflationsjahr, Marktdatenjahr sowie Ausgaben-Abschluss-/Folgejahr an dieselbe Zielperiode.
- Commit-Pruefung validiert den vollstaendigen abgeleiteten Plan und verhindert Rueckwaerts- oder Doppel-Commits.
- Pure Start-/Abschlussuebergaenge verlangen einen bestaetigten Snapshot, exponieren `incomplete_recovery` und mutieren die Eingangsmetadaten nicht.
- Legacy-Aufloesung implementiert die Entscheidungen `not_committed`, `already_committed` und `cancel` ohne Heuristik oder Mutation von Nutzerdaten.
- Contract und Modulbestand in Hauptplan, `TECHNICAL.md` und `BALANCE_MODULES_README.md` synchronisiert.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-annual-period.test.mjs`: 52/52 Assertions, 0 Fehler.
- `npm test`: 102 Testdateien, 3203/3203 Assertions, 0 Fehler, 0 offene Handles.
- Der bestehende Headless-Backtest 2000-2025 blieb unveraendert bei 416.201 EUR.
- `git diff --check`: erfolgreich, keine Whitespace-Fehler.

## Abweichungen vom Plan

- Keine Scope-Abweichung. Die geplanten zwei Programmdateien wurden eingehalten.
- Zusaetzlich zu Preflight, Plan und Commit-Pruefung wurden die reinen Metadatenuebergaenge fuer Commit-Start/-Abschluss aufgenommen, damit `incomplete_recovery` und Doppel-Commit-Schutz als geschlossener Contract testbar sind. Es erfolgte keine Persistenz- oder UI-Integration.

## Offene Risiken

- Die einmalige Legacy-Bestaetigung ist eine bewusste Nutzerentscheidung; eine automatische Inferenz ist ausgeschlossen.
- Slice 03 muss die Metadaten im realen Persistenzworkflow exakt in der vorgegebenen Reihenfolge schreiben; Slice 02 selbst beweist noch keine Browser-/Storage-Integration.
- Der Recovery-Contract speichert absichtlich nur Perioden-, Phasen- und Snapshot-ID. Adapterfehler und Wiederherstellungsdialoge bleiben Scope von Slice 03.

## Rueckdokumentation

Contract und Status sind im Hauptplan, in `docs/reference/TECHNICAL.md` und in `docs/reference/BALANCE_MODULES_README.md` nachgefuehrt.

## Freigabestatus

Gemini hat die Implementierung ohne Blocker freigegeben; lokaler Abschluss-Commit: `21a0e0f`.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Der Perioden-Contract ist als vollständig DOM- und persistenzfreies Modul (`balance-annual-period.js`) implementiert.
  - Das Perioden-ID-Format `calendar-year:<YYYY>` ist stabil und unabhängig vom Ausführungszeitpunkt.
  - Alle Statusübergänge (`READY`, `ALREADY_COMMITTED`, `INCOMPLETE_RECOVERY`, `LEGACY_CONFIRMATION_REQUIRED`, `INVALID`) sind präzise abgebildet.
  - Die Legacy-Resolution arbeitet heurisitkfrei und verlangt eine einmalige explizite Bestätigung durch den Benutzer (`resolveLegacyAnnualPeriod`).
  - Unit-Tests decken alle 12 Szenarien (Jahresmitte, Tampering, Legacy, Mismatch, etc.) lückenlos ab.
- **Vertragstreue:**
  - Der Contract bildet das Alter vorher/nachher, Inflationsjahr, Marktdatenjahr und Ausgabenjahr konsistent als geschlossenen Jahresplan ab.
- **Fehlerbehandlung:**
  - Ungültige Werte in den Eingangsdaten oder Metadaten führen konsequent zu `status: INVALID` mit strukturierten Fehlermeldungen.
- **Seiteneffekte:**
  - Keine, da das Modul komplett frei von DOM- und Persistenzzugriffen ist.
- **Was könnte brechen?**
  - Falls zukünftige Slices (z. B. Slice 03) die Metadaten in einer abweichenden Reihenfolge schreiben oder die Statusüberprüfung umgehen, wäre die Härtung wirkungslos. Die Einhaltung des Contracts muss in Slice 03 zwingend verifiziert werden.

### 2. Findings

- **G2-01 (Minor): Starres Recovery-Phasen-Set**
  - `COMMIT_PHASES` is hart auf `snapshot_confirmed`, `writes_started` und `validating` festgelegt. Sollte eine zukünftige Version des Jahresprozesses zusätzliche Phasen einführen, führt das Laden solcher Daten in einer älteren Codeversion zu einem `INVALID`-Status und blockiert die App komplett (Fail-Closed).
  - *Empfehlung:* Dies ist ein akzeptables Sicherheitsverhalten, sollte jedoch bei zukünftigen Schema-Erweiterungen bedacht werden.
- **G2-02 (Minor): `deriveCompletedCalendarYear` Jahresende-Einschränkung**
  - Die Funktion zieht pauschal `1` vom aktuellen Kalenderjahr ab. Führt ein Benutzer den Jahresabschluss extrem spät (z. B. im Folgejahr für das vorvergangene Jahr) durch, schlägt die UI das falsche Jahr vor.
  - *Empfehlung:* Da dies nur ein Vorschlag während des Legacy-Prozesses ist und der Benutzer das Jahr frei wählen/bestätigen kann, ist dies unkritisch.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Synchronisationsproblem im Multi-Profile-Kontext (Slice 01/06): Ein Profil im Verbund hat die Metadaten für das Jahr `2025` bereits committet, während ein anderes Profil bei einem temporären Fehler hängen bleibt. Da der Perioden-Contract nur Single-State-Metadaten validiert, muss die Verbund-Koordination in Slice 03 sicherstellen, dass unvollständige Commits über Profile hinweg erkannt und als `INCOMPLETE_RECOVERY` behandelt werden.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Fehlende Synchronisation verteilter Profile bei Recovery (Scope von Slice 03).

---

## Review-Antworten von Codex

F-R04 und U-02 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G2-01 bis G2-02) wurde zur Kenntnis genommen; die Restrisiken bezüglich Multi-Profile-Synchronisation und Phasen-Grenzwerte werden in Slice 03 durch die dortige Implementierung abgesichert. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R04 | Hauptplan-Review | Legacy-State ohne Perioden-ID | angenommen | Migrationsalgorithmus und Pflichttests ergaenzt |
| U-02 | Nutzer | Slice 02 implementieren | angenommen | Contract, Tests und Doku-Sync abgeschlossen; Review ausstehend |
