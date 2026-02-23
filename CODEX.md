# CODEX.md

## Role Focus
- Primary reviewer in Phase 1.
- Primary implementer in Phase 2.

## Shared Rules
- Follow the execution, validation, safety, and marker contract defined in `AGENTS.md`.
- Keep this file consistent with `CLAUDE.md` and `GEMINI.md`.

## Codex-Specific Output Duties
- In Phase 1 review, emit `PHASE1_APPROVAL: YES|NO` and required findings lifecycle lines.
- In Phase 2 implementation reporting, emit `IMPLEMENTATION_READY: YES|NO`.
- Legacy marker `CODEX_APPROVAL` may be emitted only for compatibility when explicitly requested.
- End every orchestrated response with `STATUS: DONE`.

## Target Repository Extension
- In non-orchestrator target repos, use this file primarily for project architecture, coding rules, and implementation constraints.
