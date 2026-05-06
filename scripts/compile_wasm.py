#!/usr/bin/env python3
"""Strict launcher: transpile scripts/compile_wasm.multi and execute main()."""

import io
import os
import sys
from pathlib import Path


def ajouter_depot_multilingual_au_chemin(racine: Path) -> None:
    chemin_dev = os.environ.get("MULTILINGUAL_DEV_PATH", "").strip()
    if not chemin_dev:
        return

    candidat = Path(chemin_dev).expanduser()
    if not candidat.is_absolute():
        candidat = (racine / candidat).resolve()
    if not (candidat / "multilingualprogramming" / "__init__.py").exists():
        raise RuntimeError(
            "MULTILINGUAL_DEV_PATH ne pointe pas vers un depot multilingual valide: "
            f"{candidat}"
        )
    if str(candidat) not in sys.path:
        sys.path.insert(0, str(candidat))


def main() -> None:
    if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if sys.stderr.encoding and sys.stderr.encoding.lower() not in ("utf-8", "utf8"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    racine = Path(__file__).parent.parent
    script_multi = racine / "scripts" / "compile_wasm.multi"
    if not script_multi.exists():
        raise RuntimeError(f"Script multilingual introuvable: {script_multi}")

    ajouter_depot_multilingual_au_chemin(racine)
    from multilingualprogramming import ProgramExecutor
    from multilingualprogramming.codegen.runtime_builtins import RuntimeBuiltins

    source_multi = script_multi.read_text(encoding="utf-8")
    code_python = ProgramExecutor(language="fr").transpile(source_multi)
    if not code_python or not code_python.strip():
        raise RuntimeError("Transpilation vide pour scripts/compile_wasm.multi")

    espace_builtins = RuntimeBuiltins("fr").namespace()
    espace_execution = dict(espace_builtins)
    espace_execution.update({"__name__": "__compile_wasm_multi__", "__file__": str(script_multi)})
    exec(code_python, espace_execution)

    point_entree = espace_execution.get("main")
    if not callable(point_entree):
        raise RuntimeError("Fonction main() introuvable dans scripts/compile_wasm.multi")
    point_entree()


if __name__ == "__main__":
    main()
