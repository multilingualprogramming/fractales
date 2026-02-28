#!/usr/bin/env python3
"""Strict launcher: transpile scripts/compile_wasm.ml and execute main()."""

import io
import sys
from pathlib import Path


def ajouter_depot_multilingual_au_chemin(racine: Path) -> None:
    candidats = [
        racine.parent / "multilingual",
        Path.home() / "Documents" / "Research" / "Workspace" / "multilingual",
    ]
    for candidat in candidats:
        if (candidat / "multilingualprogramming" / "__init__.py").exists():
            if str(candidat) not in sys.path:
                sys.path.insert(0, str(candidat))
            return


def main() -> None:
    if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if sys.stderr.encoding and sys.stderr.encoding.lower() not in ("utf-8", "utf8"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

    racine = Path(__file__).parent.parent
    script_ml = racine / "scripts" / "compile_wasm.ml"
    if not script_ml.exists():
        raise RuntimeError(f"Script multilingual introuvable: {script_ml}")

    ajouter_depot_multilingual_au_chemin(racine)
    from multilingualprogramming import ProgramExecutor
    from multilingualprogramming.codegen.runtime_builtins import RuntimeBuiltins

    source_ml = script_ml.read_text(encoding="utf-8")
    code_python = ProgramExecutor(language="fr").transpile(source_ml)
    if not code_python or not code_python.strip():
        raise RuntimeError("Transpilation vide pour scripts/compile_wasm.ml")

    espace_builtins = RuntimeBuiltins("fr").namespace()
    espace_execution = dict(espace_builtins)
    espace_execution.update({"__name__": "__compile_wasm_ml__", "__file__": str(script_ml)})
    exec(code_python, espace_execution)

    point_entree = espace_execution.get("main")
    if not callable(point_entree):
        raise RuntimeError("Fonction main() introuvable dans scripts/compile_wasm.ml")
    point_entree()


if __name__ == "__main__":
    main()
