# Slice Execution Rules

**Stand:** 2026-06-03  
**Status:** verbindliche interne Arbeitsregel fuer geplante Umsetzungsslices

## Zweck

Diese Regeln gelten fuer alle groesseren Umsetzungspakete, die in Slices geplant sind. Sie legen fest, wie Slices dokumentiert, getestet und abgenommen werden.

Rollenverteilung:
- **Codex (Implementer):** Implementiert den Code auf dem Feature-Branch. Erstellt die Slice-MD-Dateien vor Beginn der Arbeiten.
- **Antigravity / Gemini (Reviewer):** Agiert als **superkritischer Reviewer & Analyst**. Prüft die Slices, Pläne und Testergebnisse äußerst kritisch auf theoretische und praktische Lücken. Hat Lesezugriff auf Applikationscode und schreibt/editiert nur Dokumentation oder Pläne.
- **Claude Code (optionaler Reviewer):** Kann bei Bedarf/Verfügbarkeit als zweiter Reviewer herangezogen werden, um Pläne und Codeänderungen ebenfalls kritisch zu prüfen und Feedback zu hinterlassen.

## Feature-Branch vor Umsetzung

- Ein Arbeitsdokument ist ein zu implementierendes neues Feature oder ein komplexes Refactoring.
- Vor der ersten Umsetzung aus einem Arbeitsdokument muss ein eigener Feature-Branch angelegt oder ein passender bestehender Feature-Branch aktiv geschaltet werden.
- Der Branch-Name wird in der uebergeordneten Arbeitsplan-MD und in jeder zugehoerigen Slice-MD dokumentiert.
- Wenn GitHub-Zugriff verfuegbar und freigegeben ist, wird der Feature-Branch zu Beginn auf GitHub veroeffentlicht. Wenn das nicht moeglich ist, wird im Arbeitsplan dokumentiert, dass der Branch lokal ist bzw. die GitHub-Veroeffentlichung noch aussteht.
- Empfohlene Branch-Namen sind sprechend und praefixiert, z. B. `feature/<kurzname>` oder bei Codex-Branches `codex/<kurzname>`.

## Review von Arbeitsdokumenten (Planungsphase)

Bevor ein neues Feature oder Refactoring implementiert wird, entwirft Codex das Arbeitsdokument (z. B. `BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`) unter `docs/internal/`. Auch hier wird ein strukturierter Kommunikationsfluss auf Planebene etabliert:

1. **Erstellung:** Codex entwirft den Plan als Autor und beschreibt Ziele, Architektur, offene Fragen und die 1-basierten Umsetzungspakete.
2. **Review:** Gemini (Antigravity) und optional Claude Code lesen das Arbeitsdokument. Sie tragen ihre Kritik, Risikobewertungen und offenen Fragen direkt am Ende des Arbeitsdokuments unter der Sektion `## Review-Feedback von Gemini` (bzw. `## Review-Feedback von Claude`) ein.
3. **Korrektur:** Codex überarbeitet den Plan basierend auf diesem Feedback und dokumentiert seine Antworten unter `## Review-Antworten von Codex` am Ende des Plans.
4. **Freigabe & Commit:** Erst wenn Gemini das Review-Feedback als gelöst markiert und der Status auf `implementierungsreif` gesetzt ist (Freigabe erteilt), wird das finale Arbeitsdokument in Git committet und auf GitHub in den passenden Feature-Branch gepusht. Erst danach darf die Slice-Umsetzung begonnen werden.

## Ablage

- Jeder Slice bekommt eine eigene MD-Datei unter `docs/internal/`.
- Umsetzungs-, Paket- und Slice-Nummern sind immer 1-basiert. Neue Arbeitsplaene duerfen nicht mit Paket 0, Slice 0 oder Datei-Suffix `00` beginnen.
- Dateiname nach Muster:
  - `SLICE_<thema>_<nummer>_<kurztitel>.md`
  - Beispiel: `SLICE_BALANCE_SNAPSHOTS_01_KEY_POLICY.md`
- Die uebergeordnete Arbeitsplan-MD ist der konkrete Feature-Umsetzungsplan, z. B. `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`.
- Die uebergeordnete Arbeitsplan-MD verlinkt die Slice-MD.
- Der Agent schlaegt die Slices im Hauptplan vor und erstellt die jeweilige Slice-MD vor Beginn der Arbeiten selbststaendig.
- Nach Abschluss wird das Ergebnis in der Slice-MD dokumentiert und in der uebergeordneten Arbeitsplan-MD zurueckdokumentiert.

## Git-Status und Diff-Risiko vor Coding

Vor dem Start eines neuen Umsetzungsslices muss Codex zuerst `git status --short` ausführen und dokumentieren, um sicherzustellen, dass die Arbeitsumgebung sauber ist.
Erst danach gibt Codex vor dem ersten Code-Edit einen Diff-Risiko-Block aus:

```text
Geplante Dateien:
- ...

Voraussichtliche Änderungstiefe:
- klein / mittel / riskant

Gefährdete bestehende Tests:
- ...

Nicht anfassen:
- ...

Rollback-Strategie:
- git checkout -- <datei>
```

Erst danach darf der Slice umgesetzt werden. Wenn der Diff-Risiko-Block zeigt, dass Stop-Regeln greifen, muss Codex nachfragen statt zu implementieren.

## Agent Stop Rules

Es gelten die Stop-Regeln aus `AGENTS.md`.

Bei Widerspruechen zwischen dieser Datei und `AGENTS.md` gilt `AGENTS.md`. Diese Datei darf die Stop-Regeln nur konkretisieren, nicht abschwaechen oder anderslautend duplizieren.

## Red-State-Contract-Regel

Bewusst rote Contract-Slices (z.B. für Test-driven Development einer Schnittstelle) dürfen nur als temporärer Zustand entstehen. Sie müssen eine explizite Folge-Slice benennen, die den Red-State wieder grün macht. Solange ein erwarteter roter Test existiert, dürfen keine fachlich unabhängigen Slices begonnen werden. Dies verhindert, dass unabhängige Fehler unter dem Deckmantel bereits roter Tests unbemerkt bleiben.

## Slice-MD Inhalt

Jede Slice-MD enthaelt mindestens:

- Feature-Branch und GitHub-Status.
- Ziel des Slice.
- Scope und Nicht-Scope.
- Diff-Risiko-Block.
- Geplante Tests.
- Durchgefuehrte Änderungen.
- Ausgefuehrte Tests mit Ergebnis.
- Abweichungen vom Plan.
- Offene Risiken.
- Rueckdokumentation in die uebergeordnete Arbeitsplan-MD.
- Freigabestatus.

## Commit und GitHub

- Nach erfolgreicher Beendigung eines Slice durch Codex prüft Gemini (Antigravity) die Änderungen.
- Sobald das Review von Gemini und dem Nutzer **positiv ausfällt (Freigabe erteilt)**, führt Gemini (Antigravity) als Review-Abnahme sofort den **lokalen Git-Commit** aus. Codex selbst erstellt keine Commits.
- **Sicherheitsprüfung vor Commit:** Vor dem Commit MUSS Gemini `git status --short` ausführen und die Dateiliste dokumentieren. Diese Liste wird explizit gegen den Slice-Scope und die geänderten Dateien in der Slice-MD abgeglichen. Unerwartete Dateien (wie Logs, temporäre Testdateien oder unbeabsichtigte Modifikationen) blockieren den Commit sofort, bis sie entfernt/korrigiert sind.
- Dies stellt einen sicheren Speicherpunkt für eventuelle Rollbacks der folgenden Slices dar.
- Ein **Push nach GitHub** (bzw. die Freigabe des Remote-Branches) erfolgt erst nach ausdrücklicher Freigabe des Nutzers, niemals automatisch.
- Die Slice-MD muss vor dem Commit den tatsächlichen Stand dokumentieren.
- Die übergeordnete Arbeitsplan-MD muss den Slice-Status enthalten.

## Kommunikation zwischen Agenten (Review-Zyklus)

Da die Agenten (Codex, Gemini und Claude) keinen direkten flüchtigen Speicher teilen, wird der Kommunikationsfluss strukturiert über die Slice-Dateien gelenkt:

1. **Codex** schließt die Implementierung ab, trägt die Testergebnisse in die Slice-MD in einer Sektion `## Ergebnisse` ein, ergänzt die Entscheidungstabelle am Ende und fordert den Nutzer zum Review auf.
2. **Gemini** (und optional **Claude Code**) liest die geänderten Dateien und die Slice-MD und dokumentiert die Kritikpunkte direkt in der Slice-MD unter einer Sektion `## Review-Feedback von Gemini` (bzw. `## Review-Feedback von Claude`).
3. **Codex** liest beim nächsten Start dieses Review-Feedback ein, behebt die Schwachstellen und dokumentiert seine Antworten/Korrekturen unter `## Review-Antworten von Codex` (bzw. `## Review-Antworten auf Claude-Feedback`).
4. Dieser Zyklus wiederholt sich, bis Gemini (und ggf. Claude) grünes Licht gibt.
5. **Entscheidungstabelle:** Am Ende jeder Slice-MD muss eine kompakte Entscheidungstabelle gepflegt werden, um Review-Diskussionen strukturiert und übersichtlich abzuschließen:

### Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | ... | angenommen / abgelehnt | erledigt / Begründung |

## Rollback

Die Rollback-Strategie im Diff-Risiko-Block muss konkret sein:

- Bei wenigen Dateien und uncommitted Änderungen: `git checkout -- <datei1> <datei2>`.
- Bei neu angelegten Slice-Dateien: Datei explizit nennen und vor Löschung Freigabe einholen.
- Da nach jedem erfolgreichen Slice ein lokaler Commit erstellt wird, kann bei Fehlern im aktuellen Slice auch über `git reset --hard HEAD` auf den Stand des vorherigen Slice zurückgerollt werden.
- Keine destruktiven Git-Kommandos (wie Force-Push oder Löschen entfernter Branches) ohne ausdrückliche Freigabe.
