#!/usr/bin/env python3
"""Scan stack (package.json / .nvmrc) and CI for the app family.

Stdlib only. JSON on stdout. Run from the Platform repo:

    python3 .cursor/skills/project-status/scripts/scan.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

TARGET = {
    "node": "24",
    "react": "19",
    "vite": "8",
    "typescript": "6",
    "tailwind": "4",
    "router": "7",
    "query": "5",
    "zod": "4",
}

PLATFORM_USES_RE = re.compile(
    r"hervegerard-org/platform/\.github/workflows/"
    r"([A-Za-z0-9_.-]+\.yml)@([^\s#]+)"
)
USES_LINE_RE = re.compile(r"^\s*-?\s*uses:\s*(.+?)\s*(?:#.*)?$", re.MULTILINE)
NODE_VERSION_RE = re.compile(
    r"node-version(?:-file)?:\s*['\"]?([^\s'\"]+)", re.IGNORECASE
)
CI_NODE_KEEP_RE = re.compile(r"^(\.nvmrc|\d+(?:\.\d+)*)$")
GITHUB_ORG_RE = re.compile(r"github\.com[:/]([^/]+)/")
SEMVER_RE = re.compile(r"(\d+(?:\.\d+){0,2})")

INLINE_PREFIXES = (
    "actions/checkout@",
    "actions/setup-node@",
    "supabase/setup-cli@",
    "SamKirkland/FTP-Deploy-Action@",
    "wlixcc/SFTP-Deploy-Action@",
    "appleboy/scp-action@",
    "easingthemes/ssh-deploy@",
)

PROJECTS: list[dict[str, Any]] = [
    {
        "id": "platform",
        "name": "Platform",
        "scan_root": "/Users/Herve/Development_Local/Platform",
        "package_rel": None,
        "kind": "hub",
    },
    {
        "id": "raf-ferme",
        "name": "raf-ferme",
        "scan_root": (
            "/Users/Herve/Library/Mobile Documents/com~apple~CloudDocs/"
            "Development/raf-ferme"
        ),
        "package_rel": ".",
        "kind": "app",
    },
    {
        "id": "ebrius",
        "name": "Ebrius",
        "scan_root": "/Users/Herve/Development_Local/Ebrius/ebrius",
        "package_rel": "apps/web",
        "kind": "app",
    },
    {
        "id": "emulatio",
        "name": "Emulatio",
        "scan_root": "/Users/Herve/Development_Local/Emulatio/emulatio",
        "package_rel": "apps/web",
        "kind": "app",
    },
    {
        "id": "atelier-int",
        "name": "atelier-int",
        "scan_root": (
            "/Users/Herve/Library/Mobile Documents/com~apple~CloudDocs/"
            "Development/Github/atelier-int"
        ),
        "package_rel": ".",
        "kind": "app",
    },
    {
        "id": "grange-dauphin",
        "name": "grange-dauphin-planner",
        "scan_root": (
            "/Users/Herve/Library/Mobile Documents/com~apple~CloudDocs/"
            "Development/Github/grange-dauphin-planner"
        ),
        "package_rel": ".",
        "kind": "app",
    },
    {
        "id": "artitemps",
        "name": "artiTemps",
        "scan_root": "/Users/Herve/Development_Local/artiTemps.cursor",
        "package_rel": "frontend",
        "kind": "app",
    },
]


def major(version: str | None) -> str | None:
    if not version:
        return None
    return version.split(".")[0]


def major_minor(version: str | None) -> str | None:
    if not version:
        return None
    parts = version.split(".")
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[1]}"
    return parts[0]


def parse_semver(spec: str | None) -> str | None:
    if not spec or not isinstance(spec, str):
        return None
    match = SEMVER_RE.search(spec)
    return match.group(1) if match else None


def dep_map(pkg: dict[str, Any]) -> dict[str, str]:
    merged: dict[str, str] = {}
    for key in ("dependencies", "devDependencies"):
        block = pkg.get(key) or {}
        if isinstance(block, dict):
            for name, spec in block.items():
                if isinstance(spec, str):
                    merged[name] = spec
    return merged


def pkg_version(deps: dict[str, str], *names: str) -> str | None:
    for name in names:
        if name in deps:
            return parse_semver(deps[name])
    return None


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def scan_stack(root: Path, package_rel: str | None) -> dict[str, Any] | None:
    if package_rel is None:
        return None
    pkg_path = (root / package_rel / "package.json").resolve()
    pkg = read_json(pkg_path)
    if pkg is None:
        return {
            "package_json": str(pkg_path),
            "missing": True,
        }

    deps = dep_map(pkg)
    engines = pkg.get("engines") if isinstance(pkg.get("engines"), dict) else {}
    node_engines = engines.get("node") if isinstance(engines, dict) else None

    nvmrc_paths = [
        root / package_rel / ".nvmrc",
        root / ".nvmrc",
    ]
    node_nvmrc = None
    nvmrc_file = None
    for candidate in nvmrc_paths:
        if candidate.is_file():
            node_nvmrc = candidate.read_text(encoding="utf-8").strip().lstrip("v")
            nvmrc_file = str(candidate)
            break

    react = pkg_version(deps, "react")
    vite = pkg_version(deps, "vite")
    typescript = pkg_version(deps, "typescript")
    tailwind = pkg_version(deps, "tailwindcss")
    router_name = (
        "react-router"
        if "react-router" in deps
        else "react-router-dom"
        if "react-router-dom" in deps
        else None
    )
    router = pkg_version(deps, "react-router", "react-router-dom")
    query = pkg_version(deps, "@tanstack/react-query")
    rhf = pkg_version(deps, "react-hook-form")
    zod = pkg_version(deps, "zod")
    vitest = pkg_version(deps, "vitest")

    node_major = parse_semver(node_nvmrc) or parse_semver(
        node_engines if isinstance(node_engines, str) else None
    )

    return {
        "package_json": str(pkg_path),
        "missing": False,
        "node_nvmrc": node_nvmrc,
        "node_nvmrc_file": nvmrc_file,
        "node_engines": node_engines if isinstance(node_engines, str) else None,
        "react": react,
        "vite": vite,
        "typescript": typescript,
        "tailwind": tailwind,
        "router_package": router_name,
        "router": router,
        "query": query,
        "rhf": rhf,
        "zod": zod,
        "vitest": vitest,
        "canvas": {
            "react": major_minor(react) or "non",
            "vite": major(vite) or "non",
            "typescript": major(typescript) or "non",
            "tailwind": major(tailwind) or "non",
            "router": (
                f"{router_name} {major(router)}" if router_name and router else "non"
            ),
            "query": f"TanStack Query {major(query)}" if query else "non",
            "forms": (
                "RHF + zod " + major(zod)
                if rhf and zod
                else "RHF (sans zod)"
                if rhf
                else "non"
            ),
            "node": format_node_canvas(node_nvmrc, node_engines),
        },
        "vs_target": {
            "node": compare_major(node_major, TARGET["node"]),
            "react": compare_major(react, TARGET["react"]),
            "vite": compare_major(vite, TARGET["vite"]),
            "typescript": compare_major(typescript, TARGET["typescript"]),
            "tailwind": compare_major(tailwind, TARGET["tailwind"]),
            "router": compare_major(router, TARGET["router"]),
            "query": compare_major(query, TARGET["query"]),
            "zod": compare_major(zod, TARGET["zod"]),
        },
    }


def format_node_canvas(nvmrc: str | None, engines: str | None) -> str:
    bits: list[str] = []
    if nvmrc:
        bits.append(nvmrc)
        bits.append(".nvmrc")
    if engines:
        bits.append(f"engines {engines}")
    return " · ".join(bits) if bits else "non"


def compare_major(actual: str | None, target_major: str) -> str:
    if not actual:
        return "missing"
    return "aligned" if major(actual) == target_major else "drift"


def scan_ci(root: Path, kind: str) -> dict[str, Any]:
    wf_dir = root / ".github" / "workflows"
    if not wf_dir.is_dir():
        return {
            "workflow_files": [],
            "count": 0,
            "platform_callers": [],
            "inline_actions": [],
            "ci_node": [],
            "platform_adopted": False,
            "reusable_definitions": (
                sorted(p.name for p in wf_dir.glob("*.yml")) if kind == "hub" else []
            ),
        }

    files = sorted(
        p for p in wf_dir.iterdir() if p.is_file() and p.suffix in {".yml", ".yaml"}
    )
    platform_callers: list[str] = []
    inline: list[str] = []
    ci_node: list[str] = []

    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        for name, pin in PLATFORM_USES_RE.findall(text):
            token = f"{name}@{pin}"
            if token not in platform_callers:
                platform_callers.append(token)
        for raw in USES_LINE_RE.findall(text):
            uses = raw.strip().strip("'\"")
            if "hervegerard-org/platform/" in uses:
                continue
            if any(uses.startswith(prefix) for prefix in INLINE_PREFIXES):
                if uses not in inline:
                    inline.append(uses)
        for match in NODE_VERSION_RE.findall(text):
            value = match.strip().strip("'\"")
            if CI_NODE_KEEP_RE.fullmatch(value) and value not in ci_node:
                ci_node.append(value)

    return {
        "workflow_files": [p.name for p in files],
        "count": len(files),
        "platform_callers": platform_callers,
        "inline_actions": inline,
        "ci_node": ci_node,
        "platform_adopted": bool(platform_callers),
        "reusable_definitions": [p.name for p in files] if kind == "hub" else [],
    }


def scan_git(root: Path) -> dict[str, Any]:
    try:
        proc = subprocess.run(
            ["git", "-C", str(root), "remote", "get-url", "origin"],
            check=False,
            capture_output=True,
            text=True,
            timeout=8,
        )
    except (OSError, subprocess.TimeoutExpired):
        return {"origin": None, "org": None}
    if proc.returncode != 0:
        return {"origin": None, "org": None}
    origin = proc.stdout.strip() or None
    org = None
    if origin:
        match = GITHUB_ORG_RE.search(origin)
        org = match.group(1) if match else None
    return {"origin": origin, "org": org}


def scan_project(cfg: dict[str, Any]) -> dict[str, Any]:
    root = Path(cfg["scan_root"])
    exists = root.is_dir()
    result: dict[str, Any] = {
        "id": cfg["id"],
        "name": cfg["name"],
        "kind": cfg["kind"],
        "path": cfg["scan_root"],
        "exists": exists,
        "package_rel": cfg["package_rel"],
    }
    if not exists:
        result["error"] = "scan_root missing"
        return result
    result["stack"] = scan_stack(root, cfg["package_rel"])
    result["ci"] = scan_ci(root, cfg["kind"])
    result["git"] = scan_git(root)
    return result


def main() -> int:
    payload = {
        "scanned_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "target": TARGET,
        "projects": [scan_project(cfg) for cfg in PROJECTS],
    }
    json.dump(payload, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
