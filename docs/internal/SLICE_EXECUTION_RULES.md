# Slice Execution Rules

**Stand:** 2026-06-02  
**Status:** verbindliche interne Arbeitsregel fuer geplante Umsetzungsslices

## Zweck

Diese Regeln gelten fuer alle groesseren Umsetzungspakete, die in Slices geplant sind. Sie legen fest, wie Slices dokumentiert, getestet und abgenommen werden.

Rollenverteilung:
- **Codex (Implementer):** Implementiert den Code auf dem Feature-Branch. Erstellt die Slice-MD-Dateien vor Beginn der Arbeiten.
- **Antigravity / Gemini (Reviewer):** Agiert als **superkritischer Reviewer & Analyst**. Prüft die Slices, Pläne und Testergebnisse äußerst kritisch auf theoretische und praktische Lücken. Hat Lesezugriff auf Applikationscode und schreibt/editiert nur Dokumentation oder Pläne.

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

## Diff-Risiko vor Coding

Vor jedem Umsetzungsslice muss Codex vor dem ersten Code-Edit einen Diff-Risiko-Block ausgeben:

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
- Sobald das Review von Gemini und dem Nutzer **positiv ausfällt (Freigabe erteilt)**, führt Gemini (Antigravity) als Review-Abnahme sofort den **lokalen Git-Commit** aus (z. B. `git commit -m "slice-04: facade contract done"`). Codex selbst erstellt keine Commits.
- Dies stellt einen sicheren Speicherpunkt für eventuelle Rollbacks der folgenden Slices dar.
- Ein **Push nach GitHub** (bzw. die Freigabe des Remote-Branches) erfolgt erst nach ausdrücklicher Freigabe des Nutzers, niemals automatisch.
- Die Slice-MD muss vor dem Commit den tatsächlichen Stand dokumentieren.
- Die übergeordnete Arbeitsplan-MD muss den Slice-Status enthalten.

## Kommunikation zwischen Agenten (Review-Zyklus)

Da die Agenten (Codex und Gemini) keinen direkten flüchtigen Speicher teilen, wird der Kommunikationsfluss strukturiert über die Slice-Dateien gelenkt:

1. **Codex** schließt die Implementierung ab, trägt die Testergebnisse in die Slice-MD ein und fordert den Nutzer zum Review auf.
2. **Gemini** liest die geänderten Dateien und die Slice-MD und dokumentiert seine Kritikpunkte direkt in der Slice-MD unter einer Sektion `## Review-Feedback von Gemini`.
3. **Codex** liest beim nächsten Start dieses Review-Feedback ein, behebt die Schwachstellen und dokumentiert seine Antworten/Korrekturen unter `## Review-Antworten von Codex`.
4. Dieser Zyklus wiederholt sich, bis Gemini grünes Licht gibt.

## Rollback

Die Rollback-Strategie im Diff-Risiko-Block muss konkret sein:

- Bei wenigen Dateien und uncommitted Änderungen: `git checkout -- <datei1> <datei2>`.
- Bei neu angelegten Slice-Dateien: Datei explizit nennen und vor Löschung Freigabe einholen.
- Da nach jedem erfolgreichen Slice ein lokaler Commit erstellt wird, kann bei Fehlern im aktuellen Slice auch über `git reset --hard HEAD` auf den Stand des vorherigen Slice zurückgerollt werden.
- Keine destruktiven Git-Kommandos (wie Force-Push oder Löschen entfernter Branches) ohne ausdrückliche Freigabe.
