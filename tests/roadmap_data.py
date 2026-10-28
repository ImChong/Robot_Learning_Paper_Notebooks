"""Read _data/roadmap.yml (the home page talent tree) without a PyYAML dependency.

The file has a fixed shape: a list of branches (``- id:`` at column 0, fields
indented by two spaces) whose ``nodes`` are listed at four spaces (``- id:``)
with fields at six; ``notes`` nests one more level. Only that shape is parsed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROADMAP_YML = ROOT / "_data" / "roadmap.yml"

_FIELD = re.compile(r"^( *)([A-Za-z_][\w]*):\s*(.*)$")


def _value(raw: str):
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        return [item.strip() for item in raw[1:-1].split(",") if item.strip()]
    if raw.startswith('"') and raw.endswith('"'):
        return json.loads(raw)
    if re.fullmatch(r"\d+", raw):
        return int(raw)
    if re.fullmatch(r"\d+\.\d+", raw):
        return float(raw)
    return raw


def load_roadmap(path: Path = ROADMAP_YML) -> list[dict]:
    branches: list[dict] = []
    branch: dict | None = None
    node: dict | None = None
    note_key: str | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith("- id: "):
            branch = {"id": _value(line[len("- id: ") :]), "nodes": []}
            branches.append(branch)
            node = None
            continue
        if line.startswith("    - id: "):
            assert branch is not None, line
            node = {"id": _value(line[len("    - id: ") :]), "after": [], "related": [], "notes": {}}
            branch["nodes"].append(node)
            note_key = None
            continue
        match = _FIELD.match(line)
        assert match, f"unexpected line in roadmap.yml: {line!r}"
        indent, key, value = len(match.group(1)), match.group(2), match.group(3)
        if indent == 2 and key != "nodes":
            branch[key] = _value(value)
        elif indent == 6:
            node[key] = _value(value) if value else {}
        elif indent == 8:
            note_key = key
            node["notes"][note_key] = {}
        elif indent == 10:
            node["notes"][note_key][key] = _value(value)
    return branches


def all_nodes(branches: list[dict]) -> dict[str, dict]:
    nodes: dict[str, dict] = {}
    for branch in branches:
        for node in branch["nodes"]:
            nodes[node["id"]] = {**node, "branch": branch["id"]}
    return nodes
