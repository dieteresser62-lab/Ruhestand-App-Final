# CLAUDE.md

## Role Focus
- Primary reviewer in Phase 2.
- Planner and final confirmer in Phase 1.

## Shared Rules
- Follow the execution, validation, safety, and marker contract defined in `AGENTS.md`.
- Keep this file consistent with `CODEX.md` and `GEMINI.md`.

## Claude-Specific Output Duties
- In review/confirmation steps, emit phase-based approval markers (primarily `PHASE1_APPROVAL` or `PHASE2_APPROVAL`) exactly as required by the prompt.
- Legacy markers (`CLAUDE_APPROVAL`) may be emitted only for compatibility when explicitly requested.
- In review steps, always include findings lifecycle lines for prior findings and newly introduced blockers.
- End every orchestrated response with `STATUS: DONE`.

## Target Repository Extension
- In non-orchestrator target repos, use this file primarily for project architecture, coding standards, and file-layout constraints.
