from __future__ import annotations

import textwrap


def build_phase1_claude_plan_prompt(
    task_text: str,
    shared_text: str,
    cycle: int,
    open_block: str,
) -> str:
    return textwrap.dedent(
        f"""
        Du bist Claude Code. Wir sind in PHASE 1 (Planung), Zyklus {cycle}.

        Aufgabe:
        ---
        {task_text}
        ---

        Gemeinsame Plan-Datei (bisheriger Verlauf):
        ---
        {shared_text or '(leer)'}
        ---

        Noch offene Findings aus letztem Codex-Review:
        ---
        {open_block}
        ---

        Ziel:
        - Erstelle oder revidiere den Implementierungsplan so, dass alle offenen Findings geschlossen werden.
        - Fuege keine Nebenarbeiten hinzu, die nicht fuer Finding-Schliessung oder Task-Erfuellung noetig sind.

        Ausgabeformat (Markdown):
        - Abschnitte: Planstand, Arbeitspakete, Akzeptanzkriterien, Risiken, Teststrategie, Offene Fragen
        - Marker-Zeile: ADDRESSED_FINDINGS: <ID1,ID2,...> oder NONE
        - Marker-Zeile: CLAUDE_APPROVAL: YES oder CLAUDE_APPROVAL: NO
        - Letzte Zeile MUSS exakt sein: STATUS: DONE
        """
    ).strip()


def build_phase1_codex_review_prompt(
    task_text: str,
    shared_text: str,
    cycle: int,
    previous_open_block: str,
) -> str:
    return textwrap.dedent(
        f"""
        Du bist Codex Reviewer. Wir sind in PHASE 1 (Plan-Review), Zyklus {cycle}.

        Aufgabe:
        ---
        {task_text}
        ---

        Gemeinsame Plan-Datei (Claude + bisherige Historie):
        ---
        {shared_text}
        ---

        Offene Findings aus dem VORHERIGEN Zyklus:
        ---
        {previous_open_block}
        ---

        Aufgaben:
        1) Pruefe den Plan auf Luecken, Umsetzbarkeit und Testbarkeit.
        2) Schließe vorherige Findings explizit oder lasse sie offen, mit knapper Begruendung.
        3) Neue Findings NUR wenn sie blocker-relevant sind.
        4) Gib klare Freigabeentscheidung gemaess CONTRACT.

        CONTRACT (verpflichtend):
        - Fuer JEDES vorher offene Finding eine Zeile:
          FINDING_STATUS: <ID> | OPEN|CLOSED | <kurze Begruendung>
        - Fuer jedes NEUE offene Finding:
          NEW_FINDING: <ID> | <Kurzbeschreibung> | <Akzeptanztest>
        - Zusammenfassung:
          OPEN_FINDINGS: NONE
          oder
          OPEN_FINDINGS: <ID1,ID2,...>
        - Entscheidungsregel:
          CODEX_APPROVAL: YES NUR wenn OPEN_FINDINGS: NONE
          CODEX_APPROVAL: NO NUR wenn OPEN_FINDINGS nicht leer
        - ID-Format zwingend: F-001, F-002, ...

        Ausgabeformat (Markdown):
        - Abschnitte: Findings, Erforderliche Anpassungen, Konsolidierter Plan
        - CONTRACT-Zeilen wie oben
        - Marker-Zeile: CODEX_APPROVAL: YES oder CODEX_APPROVAL: NO
        - Letzte Zeile MUSS exakt sein: STATUS: DONE
        """
    ).strip()


def build_phase1_claude_confirm_prompt(
    task_text: str,
    shared_text: str,
    cycle: int,
    open_block: str,
    codex_approval: str,
) -> str:
    return textwrap.dedent(
        f"""
        Du bist Claude Code. Finale Bestaetigung fuer PHASE 1, Zyklus {cycle}.

        Aufgabe:
        ---
        {task_text}
        ---

        Gemeinsame Plan-Datei inkl. aktuellem Codex-Review:
        ---
        {shared_text}
        ---

        Codex-Contract in diesem Zyklus:
        - CODEX_APPROVAL: {codex_approval}
        - OPEN_FINDINGS: {open_block}

        Aufgaben:
        1) Bestimme, ob der aktuelle Plan implementierungsreif ist.
        2) Falls nein, nenne knappe Pflichtanpassungen fuer den naechsten Zyklus.
        3) Wenn CODEX_APPROVAL=NO oder OPEN_FINDINGS nicht leer ist, setze CLAUDE_APPROVAL zwingend auf NO.

        Ausgabeformat (Markdown):
        - Abschnitte: Entscheidung, Begruendung, Naechste Pflichtanpassungen
        - Marker-Zeile: CLAUDE_APPROVAL: YES oder CLAUDE_APPROVAL: NO
        - Letzte Zeile MUSS exakt sein: STATUS: DONE
        """
    ).strip()


def build_phase2_codex_implement_prompt(
    task_text: str,
    plan_text: str,
    shared_text: str,
    cycle: int,
    open_block: str,
) -> str:
    return textwrap.dedent(
        f"""
        Du bist Codex Implementierer in diesem Repository. Wir sind in PHASE 2, Zyklus {cycle}.

        Aufgabe:
        ---
        {task_text}
        ---

        Finaler abgestimmter Plan aus PHASE 1:
        ---
        {plan_text}
        ---

        Gemeinsame Implementierungs-Datei (bisheriger Verlauf inkl. Claude Findings):
        ---
        {shared_text or '(leer)'}
        ---

        Offene Claude-Findings aus dem VORHERIGEN Zyklus:
        ---
        {open_block}
        ---

        Auftrag:
        1) Implementiere/fixe im Repository gemaess Plan und bisherigen Findings.
        2) Beruecksichtige explizit die offenen Claude-Beanstandungen.
        3) Fasse umgesetzte Aenderungen knapp zusammen.

        Ausgabeformat (Markdown):
        - Abschnitte: Summary, Geaenderte Dateien, Umgesetzte Fixes, Restpunkte
        - Marker-Zeile: IMPLEMENTATION_READY: YES oder IMPLEMENTATION_READY: NO
        - Letzte Zeile MUSS exakt sein: STATUS: DONE
        """
    ).strip()


def build_phase2_claude_review_prompt(
    task_text: str,
    plan_text: str,
    shared_text: str,
    test_snapshot: str,
    cycle: int,
    previous_open_block: str,
    snapshot: str,
) -> str:
    return textwrap.dedent(
        f"""
        Du bist Claude Code Reviewer. Wir sind in PHASE 2 Review, Zyklus {cycle}.

        Aufgabe:
        ---
        {task_text}
        ---

        Abgestimmter Plan aus PHASE 1:
        ---
        {plan_text}
        ---

        Gemeinsame Implementierungs-Datei:
        ---
        {shared_text}
        ---

        Lokaler Test-Snapshot (npm test):
        ---
        {test_snapshot}
        ---

        Repository-Snapshot:
        ---
        {snapshot}
        ---

        Offene Findings aus dem VORHERIGEN Zyklus:
        ---
        {previous_open_block}
        ---

        Aufgaben:
        1) Pruefe Erfuellung der Aufgabe und Plan-Compliance.
        2) Finde Bugs, Regressionen, Sicherheits-/Wartungsrisiken und Test-Luecken.
        3) Falls nicht freigabefaehig, nenne konkrete Pflicht-Fixes fuer den naechsten Zyklus.

        CONTRACT (verpflichtend):
        - Fuer JEDES vorher offene Finding eine Zeile:
          FINDING_STATUS: <ID> | OPEN|CLOSED | <kurze Begruendung>
        - Fuer jedes NEUE offene Finding:
          NEW_FINDING: <ID> | <Kurzbeschreibung> | <Akzeptanztest>
        - Zusammenfassung:
          OPEN_FINDINGS: NONE
          oder
          OPEN_FINDINGS: <ID1,ID2,...>
        - Entscheidungsregel:
          CLAUDE_APPROVAL: YES NUR wenn OPEN_FINDINGS: NONE
          CLAUDE_APPROVAL: NO NUR wenn OPEN_FINDINGS nicht leer
        - ID-Format zwingend: F-001, F-002, ...

        Ausgabeformat (Markdown):
        - Abschnitte: Findings, Pflicht-Fixes, Freigabe
        - CONTRACT-Zeilen wie oben
        - Marker-Zeile: CLAUDE_APPROVAL: YES oder CLAUDE_APPROVAL: NO
        - Letzte Zeile MUSS exakt sein: STATUS: DONE
        """
    ).strip()
