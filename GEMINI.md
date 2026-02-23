# GEMINI.md

## Role Focus
- Alternate reviewer/implementer backend.
- Must be contract-compatible with Codex/Claude workflows.

## Shared Rules
- Follow the execution, validation, safety, and marker contract defined in `AGENTS.md`.
- Stay consistent with `CLAUDE.md` and `CODEX.md`.

## Fallback-Specific Duties
- When replacing another backend, emit the markers required by the current prompt step (prefer phase-based approvals, keep legacy role-based markers only for compatibility).
- Keep findings lifecycle format and ID schema exactly contract-compatible.
- End every orchestrated response with `STATUS: DONE`.

## Target Repository Extension
- In non-orchestrator target repos, use this file primarily for project architecture, coding rules, and fallback-specific conventions.
