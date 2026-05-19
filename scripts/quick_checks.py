#!/usr/bin/env python3
"""Run the fastest local checks before JS/backend migration work."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


COMMANDS = [
    ["node", "--check", "public/js/renderer.js"],
    ["node", "--check", "public/js/renderer-navigation.js"],
    ["node", "--check", "public/js/renderer-source-panel.js"],
    ["node", "--check", "public/js/renderer-bookmarks.js"],
    ["node", "--check", "public/js/renderer-export.js"],
    ["node", "--check", "public/js/renderer-exploration.js"],
    ["node", "--check", "public/js/renderer-lsystem.js"],
    ["node", "--check", "public/js/renderer3d.js"],
    ["node", "--test", "tests/navigation.test.js"],
    ["node", "--test", "tests/lsystem.test.js"],
    [sys.executable, "scripts/js_backend_contract_checks.py"],
    [sys.executable, "scripts/ui_smoke_checks.py"],
]


def main() -> None:
    for command in COMMANDS:
        print("[quick-checks]", " ".join(command), flush=True)
        subprocess.run(command, cwd=ROOT, check=True)
    print("[quick-checks] all checks passed")


if __name__ == "__main__":
    main()
