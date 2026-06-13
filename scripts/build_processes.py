#!/usr/bin/env python3
"""Build semantic-core-v1 process manifests from src/process/*.multi.

Each French Multilingual process program (one defining a `processus` variable)
is compiled to a `program.<name>.v1.json` manifest under public/process/, which
the vendored stepper (public/js/process/process_core.js) advances in the
browser. This is the process-calculus / polymodal pipeline of multilingual
0.8.0, parallel to and independent of the escape-time WASM build.

Run from the repo root with MULTILINGUAL_DEV_PATH pointing at the multilingual
checkout, exactly like scripts/compile_wasm.py:

    MULTILINGUAL_DEV_PATH=/home/johnsamuel/multilingual python3 scripts/build_processes.py
"""

import io
import os
import sys
from pathlib import Path


def ajouter_depot_multilingual_au_chemin(racine: Path) -> None:
    # Optional, exactly like scripts/compile_wasm.py: if MULTILINGUAL_DEV_PATH
    # points at a local checkout we use it; otherwise we fall back to the
    # pip-installed multilingualprogramming package (the CI path).
    chemin_dev = os.environ.get("MULTILINGUAL_DEV_PATH", "").strip()
    if not chemin_dev:
        return
    candidat = Path(chemin_dev).expanduser()
    if not candidat.is_absolute():
        candidat = (racine / candidat).resolve()
    if not (candidat / "multilingualprogramming" / "__init__.py").exists():
        raise RuntimeError(
            "MULTILINGUAL_DEV_PATH ne pointe pas vers un dépôt multilingual valide: "
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
    dossier_source = racine / "src" / "process"
    dossier_sortie = racine / "public" / "process"
    dossier_sortie.mkdir(parents=True, exist_ok=True)

    ajouter_depot_multilingual_au_chemin(racine)
    from multilingualprogramming.codegen.process_program import build_process_core_file

    sources = sorted(dossier_source.glob("*.multi"))
    if not sources:
        raise RuntimeError(f"Aucun programme de processus dans {dossier_source}")

    # Build from the repo root so the manifest's embedded `source` field is a
    # relative path -- these manifests deploy to GitHub Pages and must not leak
    # an absolute local path (e.g. a home directory / username).
    os.chdir(racine)
    for source in sources:
        source_rel = source.relative_to(racine)
        sortie = dossier_sortie / f"program.{source.stem}.v1.json"
        sortie_rel = sortie.relative_to(racine)
        core = build_process_core_file(source_rel, sortie_rel, language="fr")
        topo = core.get("topology", {})
        sched = core.get("schedule", {})
        nb_loci = len(core.get("state", {}).get("loci", []))
        print(
            f"[processus] {sortie.name} kind={core.get('kind')} "
            f"topo={topo.get('kind')} schedule={sched.get('kind')} loci={nb_loci}"
        )


if __name__ == "__main__":
    main()
