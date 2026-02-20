from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def read_file(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def atomic_write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        delete=False,
    ) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, path)


def write_file(path: Path, content: str) -> None:
    atomic_write_file(path, content.strip() + "\n")


def append_markdown(path: Path, heading: str, body: str) -> None:
    stamp = now_iso()
    section = f"## {heading}\n\n_Zeit: {stamp}_\n\n{body.strip()}\n"
    existing = ""
    if path.exists():
        existing = path.read_text(encoding="utf-8")
    if existing.strip():
        next_content = existing.rstrip() + "\n\n---\n\n" + section
    else:
        next_content = section
    atomic_write_file(path, next_content)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")


def build_artifact_paths(run_id: str, artifact_runs_dir: Path) -> dict[str, str]:
    run_dir = artifact_runs_dir / run_id
    return {
        "run_id": run_id,
        "run_dir": str(run_dir),
        "task": str(run_dir / "00_task.md"),
        "phase1_shared": str(run_dir / "10_phase1_plan.md"),
        "phase2_shared": str(run_dir / "20_phase2_implementation.md"),
    }


def load_state(state_file: Path) -> dict:
    if not state_file.exists():
        return {}
    return json.loads(state_file.read_text(encoding="utf-8"))


def save_state(state_dir: Path, state_file: Path, state: dict) -> None:
    state_dir.mkdir(parents=True, exist_ok=True)
    atomic_write_file(state_file, json.dumps(state, indent=2, ensure_ascii=True) + "\n")


def init_state(
    task_file: Path,
    phase1_max_cycles: int,
    phase2_max_cycles: int,
    artifacts: dict[str, str],
) -> dict:
    return {
        "version": 2,
        "task_file": str(task_file),
        "started_at": now_iso(),
        "updated_at": now_iso(),
        "phase": "phase1",
        "artifacts": artifacts,
        "phase1": {
            "status": "pending",
            "cycle": 0,
            "max_cycles": phase1_max_cycles,
            "codex_approval": "NO",
            "claude_approval": "NO",
            "open_findings": [],
            "finding_history": {},
            "error": None,
            "completed_at": None,
        },
        "phase2": {
            "status": "pending",
            "cycle": 0,
            "max_cycles": phase2_max_cycles,
            "claude_approval": "NO",
            "open_findings": [],
            "finding_history": {},
            "implementation_ready": "NO",
            "last_test_exit": None,
            "error": None,
            "completed_at": None,
        },
    }


def ensure_state_shape(
    state: dict,
    task_file: Path,
    phase1_max_cycles: int,
    phase2_max_cycles: int,
    artifact_runs_dir: Path,
) -> dict:
    finding_id_pattern = re.compile(r"^F-\d{3}$")

    def sanitize_phase_findings(phase_state: dict) -> None:
        raw_open = phase_state.get("open_findings", [])
        sanitized_open = [
            str(fid).upper()
            for fid in raw_open
            if finding_id_pattern.match(str(fid).upper())
        ]
        phase_state["open_findings"] = sanitized_open

        raw_history = dict(phase_state.get("finding_history", {}))
        sanitized_history: dict[str, str] = {}
        for fid, status in raw_history.items():
            fid_up = str(fid).upper()
            if not finding_id_pattern.match(fid_up):
                continue
            sanitized_history[fid_up] = str(status).upper()
        phase_state["finding_history"] = sanitized_history

    if state.get("version") == 2 and "phase1" in state and "phase2" in state:
        state.setdefault("task_file", str(task_file))
        state.setdefault("phase", "phase1")
        state.setdefault("updated_at", now_iso())
        artifacts = state.setdefault("artifacts", {})
        if not artifacts.get("run_id"):
            migrated = build_artifact_paths(new_run_id(), artifact_runs_dir)
            artifacts.setdefault("run_id", migrated["run_id"])
            artifacts.setdefault("run_dir", migrated["run_dir"])
            artifacts.setdefault("task", migrated["task"])
            artifacts.setdefault("phase1_shared", migrated["phase1_shared"])
            artifacts.setdefault("phase2_shared", migrated["phase2_shared"])
        state["phase1"].setdefault("open_findings", [])
        state["phase1"].setdefault("finding_history", {})
        state["phase2"].setdefault("open_findings", [])
        state["phase2"].setdefault("finding_history", {})
        sanitize_phase_findings(state["phase1"])
        sanitize_phase_findings(state["phase2"])
        return state
    return init_state(
        task_file,
        phase1_max_cycles,
        phase2_max_cycles,
        build_artifact_paths(new_run_id(), artifact_runs_dir),
    )


def checkpoint_path(checkpoint_dir: Path, phase: str, cycle: int) -> Path:
    return checkpoint_dir / f"{phase}-cycle-{cycle}.json"


def write_cycle_checkpoint(checkpoint_dir: Path, phase: str, cycle: int, state: dict) -> Path:
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    path = checkpoint_path(checkpoint_dir, phase, cycle)
    atomic_write_file(path, json.dumps(state, indent=2, ensure_ascii=True) + "\n")
    return path


def load_cycle_checkpoint(checkpoint_dir: Path, phase: str, cycle: int) -> dict | None:
    path = checkpoint_path(checkpoint_dir, phase, cycle)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
