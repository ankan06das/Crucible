import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

OUTPUT_DIR = Path("outputs")

_RUNS: dict[str, str] = {}


def _ensure_dir() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def _snapshot(kind: str, run_id: str, data: dict) -> Path:
    dir_path = _ensure_dir()
    path = dir_path / f"{kind}_{run_id}.json"
    payload = {
        "kind": kind,
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": data,
    }
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return path


def save_pipeline_result(run_id: str, result) -> Path:
    data = result.model_dump() if hasattr(result, "model_dump") else vars(result)
    path = _snapshot("refine", run_id, data)
    _runs(run_id, f"refined pipeline -> {path}")
    return path


def save_generation_result(run_id: str, result) -> Path:
    data = result.model_dump() if hasattr(result, "model_dump") else vars(result)
    path = _snapshot("generate", run_id, data)
    _runs(run_id, f"generation pipeline -> {path}")
    return path


def _runs(run_id: str, line: str) -> None:
    _runs_path = _ensure_dir() / "runs.log"
    with _runs_path.open("a", encoding="utf-8") as fh:
        fh.write(f"{datetime.now(timezone.utc).isoformat()} {run_id} {line}\n")


def new_run_id(prefix: str = "run") -> str:
    return f"{prefix}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')[:-3]}_{uuid4().hex[:6]}"