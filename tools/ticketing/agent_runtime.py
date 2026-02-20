from __future__ import annotations

import os
import selectors
import shutil
import socket
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


@dataclass
class OrchestratorConfig:
    dry_run: bool = False
    agent_output_mode: str = "summary"
    agent_output_max_chars: int = 1800
    agent_live_stream: bool = False
    agent_live_stream_mode: str = "compact"
    agent_live_stream_channels: str = "both"
    allow_fallback_to_gemini: bool = False


@dataclass
class StreamResult:
    returncode: int
    stdout: str
    stderr: str


BASE_CODEX_COMMAND = [
    "codex",
    "exec",
    "--skip-git-repo-check",
    "--sandbox",
    "workspace-write",
    "--color",
    "never",
]

AGENTS = {
    "codex": {
        "command": BASE_CODEX_COMMAND,
        "timeout": 1800,
        "env": {"NO_COLOR": "1"},
        "required_hosts": ("chatgpt.com", "api.openai.com"),
    },
    "claude": {
        "command": [
            "claude",
            "-p",
            "--output-format",
            "text",
            "--no-session-persistence",
            "--model",
            "opus",
        ],
        "timeout": 1800,
        "env": {"NO_COLOR": "1"},
        "required_hosts": ("api.anthropic.com",),
    },
    "gemini": {
        "command": [
            "gemini",
            "-p",
        ],
        "timeout": 1800,
        "env": {"NO_COLOR": "1"},
        "required_hosts": ("generativelanguage.googleapis.com",),
    },
}


def can_resolve_host(hostname: str) -> bool:
    try:
        socket.getaddrinfo(hostname, None)
        return True
    except socket.gaierror:
        return False


def run_local_command(args: list[str], timeout: int = 20) -> tuple[int, str, str]:
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return result.returncode, (result.stdout or ""), (result.stderr or "")
    except Exception as exc:
        return 1, "", str(exc)


def repo_snapshot(max_diff_chars: int) -> str:
    if shutil.which("git") is None:
        return "Git is not available in PATH."

    status_rc, status_out, status_err = run_local_command(["git", "status", "--short"])
    diffstat_rc, diffstat_out, diffstat_err = run_local_command(["git", "diff", "--stat"])
    diff_rc, diff_out, diff_err = run_local_command(["git", "diff"])

    sections: list[str] = []
    sections.append("=== git status --short ===")
    sections.append((status_out if status_rc == 0 else status_err).strip() or "(empty)")
    sections.append("\n=== git diff --stat ===")
    sections.append((diffstat_out if diffstat_rc == 0 else diffstat_err).strip() or "(empty)")
    sections.append("\n=== git diff (possibly truncated) ===")

    raw_diff = (diff_out if diff_rc == 0 else diff_err).strip()
    if not raw_diff:
        sections.append("(empty)")
    else:
        sections.append(raw_diff[:max_diff_chars])
        if len(raw_diff) > max_diff_chars:
            sections.append("\n...[truncated]")

    return "\n".join(sections).strip()


def run_tests_snapshot(
    *,
    config: OrchestratorConfig,
    test_timeout_seconds: int,
    shorten: Callable[[str | None, int], str],
) -> tuple[int, str]:
    if config.dry_run:
        return 0, "Exit code: 0\n[dry-run] npm test wurde simuliert."
    if shutil.which("npm") is None:
        return 1, "npm not available in PATH."
    rc, stdout, stderr = run_local_command(["npm", "test"], timeout=test_timeout_seconds)
    combined = (stdout + "\n" + stderr).strip()
    return rc, f"Exit code: {rc}\n{shorten(combined, 7000)}"


def build_dry_run_agent_output(agent_key: str, prompt: str) -> str:
    lines = [
        f"# Dry Run Output ({agent_key})",
        "",
        "Diese Antwort wurde vom Orchestrator simuliert.",
    ]
    if "CODEX_APPROVAL:" in prompt:
        lines.append("CODEX_APPROVAL: YES")
    if "OPEN_FINDINGS:" in prompt:
        lines.append("OPEN_FINDINGS: NONE")
    if "CLAUDE_APPROVAL:" in prompt:
        lines.append("CLAUDE_APPROVAL: YES")
    if "IMPLEMENTATION_READY:" in prompt:
        lines.append("IMPLEMENTATION_READY: YES")
    lines.append("STATUS: DONE")
    return "\n".join(lines)


def print_agent_output(
    agent_key: str,
    log_path: Path,
    attempt: int,
    output: str,
    *,
    config: OrchestratorConfig,
    shorten: Callable[[str | None, int], str],
) -> None:
    if config.agent_output_mode == "none":
        return

    print(f"[AGENT] {agent_key} attempt={attempt} log={log_path}")
    if config.agent_live_stream:
        print("[AGENT] live stream was enabled; final response saved to log.")
        return
    if config.agent_output_mode == "full":
        print(output.strip())
        return

    print(shorten(output, config.agent_output_max_chars))


def should_emit_live_line(
    agent_key: str,
    channel: str,
    line: str,
    stream_state: dict[str, str | bool],
    *,
    config: OrchestratorConfig,
) -> bool:
    if config.agent_live_stream_channels == "stdout" and channel != "stdout":
        return False
    if config.agent_live_stream_channels == "stderr" and channel != "stderr":
        return False
    if config.agent_live_stream_mode == "full":
        return True

    txt = line.strip()
    if not txt:
        return False

    if agent_key == "codex" and channel == "stderr":
        if txt == "user":
            stream_state["skip_prompt_echo"] = True
            return False
        if bool(stream_state.get("skip_prompt_echo", False)):
            if txt.startswith("mcp startup:") or txt in {"thinking", "codex", "exec"}:
                stream_state["skip_prompt_echo"] = False
            else:
                return False

        noisy_prefixes = (
            "Reading prompt from stdin...",
            "OpenAI Codex ",
            "workdir:",
            "model:",
            "provider:",
            "approval:",
            "sandbox:",
            "reasoning effort:",
            "reasoning summaries:",
            "session id:",
            "mcp startup:",
            "--------",
            "diff --git ",
            "index ",
            "--- a/",
            "+++ b/",
            "@@",
            "deleted file mode ",
            "new file mode ",
            "file update:",
            "apply_patch(",
            "/bin/bash -lc ",
            "succeeded in ",
            "tokens used",
        )
        if txt.startswith(noisy_prefixes):
            return False
        if txt.startswith("202") and "ERROR codex_core::rollout::list" in txt:
            return False
        if txt.startswith(("+", "-")) and len(txt) > 2:
            return False

    last_line = str(stream_state.get("last_emitted_line", ""))
    if txt == last_line:
        return False
    stream_state["last_emitted_line"] = txt
    return True


def run_agent(
    agent_key: str,
    prompt: str,
    *,
    config: OrchestratorConfig,
    agents: dict,
    shorten: Callable[[str | None, int], str],
) -> str:
    if config.dry_run:
        return build_dry_run_agent_output(agent_key, prompt)

    agent_config = agents[agent_key]
    command_parts = list(agent_config["command"])
    use_stdin_prompt = True
    if agent_key == "gemini":
        # Gemini headless mode requires the prompt as CLI argument.
        command_parts.extend([prompt])
        use_stdin_prompt = False
    env = os.environ.copy()
    env.update(agent_config.get("env", {}))
    timeout_seconds = agent_config.get("timeout", 600)

    last_message_file = None
    if agent_key == "codex":
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".txt",
            prefix=f"{agent_key}-last-message-",
            delete=False,
        ) as tmp:
            last_message_file = tmp.name
        command_parts.extend(["--output-last-message", last_message_file])

    try:
        try:
            if config.agent_live_stream:
                process = subprocess.Popen(
                    command_parts,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=env,
                    bufsize=1,
                )
                assert process.stdin is not None
                assert process.stdout is not None
                assert process.stderr is not None

                if use_stdin_prompt:
                    process.stdin.write(prompt)
                process.stdin.close()

                selector = selectors.DefaultSelector()
                selector.register(process.stdout, selectors.EVENT_READ, "stdout")
                selector.register(process.stderr, selectors.EVENT_READ, "stderr")

                stdout_chunks: list[str] = []
                stderr_chunks: list[str] = []
                start = time.monotonic()
                stream_state: dict[str, str | bool] = {
                    "skip_prompt_echo": False,
                    "last_emitted_line": "",
                }

                while True:
                    if time.monotonic() - start > timeout_seconds:
                        process.kill()
                        raise subprocess.TimeoutExpired(command_parts, timeout_seconds)

                    events = selector.select(timeout=0.2)
                    if not events:
                        if process.poll() is not None:
                            break
                        continue

                    for key, _ in events:
                        stream = key.fileobj
                        channel = key.data
                        line = stream.readline()
                        if line == "":
                            try:
                                selector.unregister(stream)
                            except Exception:
                                pass
                            try:
                                stream.close()
                            except Exception:
                                pass
                            continue
                        if channel == "stdout":
                            stdout_chunks.append(line)
                        else:
                            stderr_chunks.append(line)
                        if should_emit_live_line(
                            agent_key, channel, line, stream_state, config=config
                        ):
                            print(f"[{agent_key}:{channel}] {line.rstrip()}")

                try:
                    selector.close()
                except Exception:
                    pass

                process.wait(timeout=1)

                result = StreamResult(
                    process.returncode if process.returncode is not None else 1,
                    "".join(stdout_chunks),
                    "".join(stderr_chunks),
                )
            else:
                result = subprocess.run(
                    command_parts,
                    input=(prompt if use_stdin_prompt else None),
                    capture_output=True,
                    text=True,
                    env=env,
                    timeout=timeout_seconds,
                    check=False,
                )
        except subprocess.TimeoutExpired:
            raise RuntimeError(f"{agent_key} timed out after {timeout_seconds}s.")

        stdout = (result.stdout or "").strip()
        if last_message_file and Path(last_message_file).exists():
            last_message = Path(last_message_file).read_text(encoding="utf-8").strip()
            if last_message:
                stdout = last_message

        stderr = (result.stderr or "").strip()
        if result.returncode != 0:
            error_text = shorten(stderr or stdout or "Unknown CLI error without output.")
            raise RuntimeError(f"{agent_key} failed: {error_text}")

        if not stdout:
            raise RuntimeError(f"{agent_key} returned empty output.")

        return stdout
    finally:
        if last_message_file:
            try:
                Path(last_message_file).unlink(missing_ok=True)
            except OSError:
                pass


def is_quota_or_rate_limit_error(text: str) -> bool:
    raw = (text or "").lower()
    markers = (
        "quota",
        "hit your limit",
        "you've hit your limit",
        "usage cap",
        "rate limit",
        "too many requests",
        "429",
        "insufficient credits",
        "credit balance is too low",
        "usage limit",
        "resource exhausted",
    )
    return any(marker in raw for marker in markers)


def run_agent_checked(
    *,
    agent_key: str,
    prompt: str,
    log_prefix: str,
    max_retries: int,
    required_flags: list[str] | None,
    output_validator: Callable[[str], str | None] | None,
    config: OrchestratorConfig,
    agents: dict,
    log_dir: Path,
    write_file: Callable[[Path, str], None],
    shorten: Callable[[str | None, int], str],
    parse_flag: Callable[[str, str], str | None],
    validate_done_marker: Callable[[str], bool],
) -> str:
    required_flags = required_flags or []
    errors: list[str] = []

    def validate_output_contract(output: str) -> str | None:
        if not validate_done_marker(output):
            return "missing required final completion marker 'STATUS: DONE'"
        missing_flags = [flag for flag in required_flags if parse_flag(output, flag) is None]
        if missing_flags:
            return f"missing required flags: {', '.join(missing_flags)}"
        if output_validator:
            validation_error = output_validator(output)
            if validation_error:
                return validation_error
        return None

    for attempt in range(1, max_retries + 2):
        prompt_to_send = prompt
        if attempt > 1:
            prompt_to_send = (
                f"{prompt}\n\n"
                "Deine letzte Antwort war formal nicht akzeptabel. "
                "Korrigiere nur die genannten Maengel.\n"
                f"Fehlerkontext:\n{chr(10).join(errors[-2:])}\n"
            )

        try:
            output = run_agent(
                agent_key,
                prompt_to_send,
                config=config,
                agents=agents,
                shorten=shorten,
            )
            log_path = log_dir / f"{log_prefix}.attempt-{attempt}.log"
            write_file(log_path, output)
            print_agent_output(
                agent_key, log_path, attempt, output, config=config, shorten=shorten
            )
            validation_error = validate_output_contract(output)
            if validation_error:
                errors.append(validation_error)
                continue
            return output
        except Exception as exc:
            error_text = shorten(str(exc))
            errors.append(error_text)

            if (
                config.allow_fallback_to_gemini
                and agent_key == "claude"
                and is_quota_or_rate_limit_error(error_text)
            ):
                print("[WARN] Claude quota/rate limit erkannt. Versuche Fallback auf Gemini.")
                try:
                    fallback_output = run_agent(
                        "gemini",
                        prompt_to_send,
                        config=config,
                        agents=agents,
                        shorten=shorten,
                    )
                    fallback_log_path = log_dir / f"{log_prefix}.attempt-{attempt}.gemini-fallback.log"
                    write_file(fallback_log_path, fallback_output)
                    print(
                        "[AGENT] fallback "
                        f"from=claude to=gemini attempt={attempt} log={fallback_log_path}"
                    )
                    if config.agent_output_mode != "none":
                        print_agent_output(
                            "gemini",
                            fallback_log_path,
                            attempt,
                            fallback_output,
                            config=config,
                            shorten=shorten,
                        )

                    validation_error = validate_output_contract(fallback_output)
                    if validation_error:
                        errors.append(f"gemini fallback invalid output: {validation_error}")
                        continue
                    return fallback_output
                except Exception as fallback_exc:
                    errors.append(f"gemini fallback failed: {shorten(str(fallback_exc))}")

    raise RuntimeError(
        f"{agent_key} did not produce valid output after {max_retries + 1} attempts: "
        f"{shorten(chr(10).join(errors), 1200)}"
    )


def preflight(required_agents: list[str], strict: bool, agents: dict) -> bool:
    ok = True
    print("Preflight: checking CLI binaries and DNS resolution.")

    for agent_key in required_agents:
        agent_config = agents[agent_key]
        cli_binary = agent_config["command"][0]
        if shutil.which(cli_binary) is None:
            print(f"[ERROR] Missing CLI binary for '{agent_key}': {cli_binary}")
            ok = False

    missing_hosts: list[tuple[str, str]] = []
    for agent_key in required_agents:
        for host in agents[agent_key].get("required_hosts", ()):
            if not can_resolve_host(host):
                missing_hosts.append((agent_key, host))

    if missing_hosts:
        print("[WARN] DNS resolution failed for:")
        for agent_key, host in missing_hosts:
            print(f"  - {agent_key}: {host}")
        if strict:
            ok = False

    if ok:
        print("Preflight result: OK")
    else:
        print("Preflight result: FAILED")
    return ok
