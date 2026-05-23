#!/usr/bin/env python3
"""Fast checks for keeping fractal math canonical in French .multi sources.

This is intentionally static. It catches newly generated formula-style JS before
the project quietly grows a second source of truth outside src/*.multi.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PUBLIC_JS = ROOT / "public" / "js"
SRC = ROOT / "src"


FORMULA_FUNCTION_RE = re.compile(
    r"^(?:export\s+)?function\s+("
    r"(?:etape|projeter|generer|calculer|iteration)[A-Za-z0-9_]*"
    r"|[A-Za-z0-9_]*(?:Step|Generate|JS)"
    r")\s*\(",
    re.MULTILINE,
)


# Each formula-like browser helper must be declared here. Entries with
# backend_refs point at French .multi functions that own the corresponding
# fractal formula. Entries with browser_only are explicit drawing/orchestration
# exceptions that should not become canonical fractal definitions.
JS_FORMULA_CONTRACT: dict[str, dict[str, object]] = {
    "renderer.js:barnsleyStep": {"backend_refs": ["barnsley_etape_x", "barnsley_etape_y"]},
    "renderer.js:sierpinskiStep": {"backend_refs": ["sierpinski_etape_x", "sierpinski_etape_y"]},
    "renderer.js:etapeTapisSierpinski": {
        "backend_refs": ["tapis_sierpinski_etape_x", "tapis_sierpinski_etape_y"]
    },
    "renderer.js:etapeMengerSponge": {
        "backend_refs": ["menger_etape_x", "menger_etape_y", "menger_etape_z"]
    },
    "renderer.js:projeterMengerSponge": {"backend_refs": ["projeter_menger_x", "projeter_menger_y"]},
    "renderer.js:etapeVicsekFractal": {"backend_refs": ["vicsek_etape_x", "vicsek_etape_y"]},
    "renderer.js:etapeLichtenberg": {"backend_refs": ["lichtenberg_figures"]},
    "renderer.js:etapeMandelbulb": {
        "backend_refs": ["mandelbulb_etape_x", "mandelbulb_etape_y", "mandelbulb_etape_z"]
    },
    "renderer.js:projeterPoint3D": {
        "browser_only": "view projection combines renderer camera settings and depth shading"
    },
    "renderer.js:projeterMandelbulb": {"backend_refs": ["projeter_menger_x", "projeter_menger_y"]},
    "renderer.js:etapeTetraedre": {
        "backend_refs": ["tetraedre_etape_x", "tetraedre_etape_y", "tetraedre_etape_z"]
    },
    "renderer.js:projeterTetraedre": {"backend_refs": ["projeter_menger_x", "projeter_menger_y"]},
    "renderer.js:etapeMandelbox": {"backend_refs": ["mandelbox"]},
    "renderer.js:projeterMandelbox": {
        "browser_only": "view projection combines renderer camera settings and depth shading"
    },
    "renderer.js:etapeJuliaQuaternion": {"backend_refs": ["julia_quaternion"]},
    "renderer.js:projeterJuliaQuaternion": {
        "browser_only": "view projection combines renderer camera settings and depth shading"
    },
    "renderer.js:projeterFractalePonctuelle": {
        "browser_only": "dispatches to browser projection helpers for density rendering"
    },
    "renderer.js:etapeAttracteurClifford": {
        "backend_refs": ["attracteur_de_clifford_etape_x", "attracteur_de_clifford_etape_y"]
    },
    "renderer.js:etapeAttracteurPeterDeJong": {
        "backend_refs": ["attracteur_de_peter_de_jong_etape_x", "attracteur_de_peter_de_jong_etape_y"]
    },
    "renderer.js:etapeAttracteurIkeda": {
        "backend_refs": ["attracteur_ikeda_etape_x", "attracteur_ikeda_etape_y"]
    },
    "renderer.js:etapeAttracteurHenon": {
        "backend_refs": ["attracteur_de_henon_etape_x", "attracteur_de_henon_etape_y"]
    },
    "renderer.js:etapeLorenzAttractor": {
        "backend_refs": ["lorenz_attractor_etape_x", "lorenz_attractor_etape_y", "lorenz_attractor_etape_z"]
    },
    "renderer.js:projeterLorenzAttractor": {"backend_refs": ["projeter_lorenz_x", "projeter_lorenz_y"]},
    "renderer.js:etapeRosslerAttractor": {
        "backend_refs": ["rossler_attractor_etape_x", "rossler_attractor_etape_y", "rossler_attractor_etape_z"]
    },
    "renderer.js:projeterRosslerAttractor": {"backend_refs": ["projeter_rossler_x", "projeter_rossler_y"]},
    "renderer.js:etapeAizawaAttractor": {
        "backend_refs": ["aizawa_attractor_etape_x", "aizawa_attractor_etape_y", "aizawa_attractor_etape_z"]
    },
    "renderer.js:projeterAizawaAttractor": {"backend_refs": ["projeter_aizawa_x", "projeter_aizawa_y"]},
    "renderer.js:etapeSprottAttractor": {
        "backend_refs": ["sprott_attractor_etape_x", "sprott_attractor_etape_y", "sprott_attractor_etape_z"]
    },
    "renderer.js:projeterSprottAttractor": {"backend_refs": ["projeter_sprott_x", "projeter_sprott_y"]},
    "renderer.js:etapeDuffingAttractor": {
        "backend_refs": ["duffing_attractor_etape_x", "duffing_attractor_etape_y"]
    },
    "renderer.js:kochGenerate": {"backend_refs": ["koch_generer"]},
    "renderer.js:genererDragonHeighway": {"backend_refs": ["dragon_heighway"]},
    "renderer.js:genererCourbeLevyC": {"backend_refs": ["courbe_levy_c"]},
    "renderer.js:genererGosper": {"backend_refs": ["gosper_curve"]},
    "renderer.js:genererHilbert": {"backend_refs": ["hilbert_curve"]},
    "renderer.js:genererPeano": {"backend_refs": ["peano_curve"]},
    "renderer.js:iterationsDepuisGenerationLSysteme": {
        "browser_only": "maps the proposed L-system generation slider to the shared iteration budget"
    },
    "renderer-ifs.js:etapePresetIFS": {
        "backend_refs": [
            "barnsley_etape_x",
            "barnsley_etape_y",
            "sierpinski_etape_x",
            "sierpinski_etape_y",
            "tapis_sierpinski_etape_x",
            "tapis_sierpinski_etape_y",
            "vicsek_etape_x",
            "vicsek_etape_y",
            "menger_etape_x",
            "menger_etape_y",
            "menger_etape_z",
            "tetraedre_etape_x",
            "tetraedre_etape_y",
            "tetraedre_etape_z",
        ]
    },
    "renderer-lsystem.js:genererPropositionLSysteme": {
        "browser_only": "user-authored L-system preview, not a canonical fractal"
    },
    "renderer3d.js:genererMenger": {
        "backend_refs": ["menger_etape_x", "menger_etape_y", "menger_etape_z"]
    },
    "renderer3d.js:genererTetraedre": {"backend_refs": ["tetraedre_etape", "tetraedre_sierpinski"]},
    "renderer3d.js:etapeJuliaQuaternion": {"backend_refs": ["julia_quaternion"]},
    "renderer3d.js:genererJuliaQuaternion": {"backend_refs": ["julia_quaternion"]},
    "renderer3d.js:etapeMandelbox": {"backend_refs": ["mandelbox"]},
    "renderer3d.js:genererMandelbox": {"backend_refs": ["mandelbox"]},
    "renderer3d.js:genererNuage3D": {
        "browser_only": "fills WebGL typed arrays from canonical fractal generators"
    },
    "renderer-ifs.js:projeter3DIFS": {
        "browser_only": "isometric view projection combining camera/perspective settings — mirrors renderer.js:projeterPoint3D"
    },
    "render-worker.js:calculerTuile": {
        "browser_only": "Web Worker tile-dispatch orchestration — calls canonical WASM fractal exports by name, no formula"
    },
    "renderer-exploration.js:calculerOrbite": {
        "backend_refs": [
            "mandelbrot",
            "julia",
            "burning_ship",
            "burning_julia",
            "burning_ship_lisse",
            "buffalo",
            "celtic",
            "perpendicular_celtic",
            "heart",
            "tricorn",
            "tricorn_lisse",
            "duck",
            "perpendicular_burning_ship",
            "perpendicular_mandelbrot",
            "newton",
            "bassin_newton_generalise",
            "phoenix",
        ]
    },
}


SPECIAL_WASM_EXPORTS = {
    "interpoler_lineaire",
    "interpoler_logarithmique",
    "ajuster_iterations_export",
    "easer_cubique",
    "interpoler_pixelsize_nav",
    "interpoler_angle_nav",
}


def fail(message: str) -> None:
    print(f"[js-backend-contract] FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def source_functions() -> set[str]:
    names: set[str] = set()
    for path in SRC.glob("*.multi"):
        text = path.read_text(encoding="utf-8")
        names.update(re.findall(r"^déf\s+([a-zA-Z0-9_]+)\s*\(", text, re.MULTILINE))
    return names


def js_formula_functions() -> set[str]:
    found: set[str] = set()
    for path in PUBLIC_JS.glob("*.js"):
        text = path.read_text(encoding="utf-8")
        for name in FORMULA_FUNCTION_RE.findall(text):
            found.add(f"{path.name}:{name}")
    return found


def renderer_wasm_function_keys() -> set[str]:
    renderer = (PUBLIC_JS / "renderer.js").read_text(encoding="utf-8")
    return set(
        re.findall(
            r'([a-zA-Z0-9_]+):\s*typeof exports\.\1 === "function"',
            renderer,
        )
    )


def main() -> None:
    print("[js-backend-contract] running checks...")
    src_names = source_functions()
    js_names = js_formula_functions()

    untracked = sorted(js_names - JS_FORMULA_CONTRACT.keys())
    if untracked:
        fail(
            "formula-like JS helpers need an explicit backend contract: "
            + ", ".join(untracked)
        )

    stale_contract = sorted(JS_FORMULA_CONTRACT.keys() - js_names)
    if stale_contract:
        fail(
            "stale JS backend contract entries no longer found in public/js: "
            + ", ".join(stale_contract)
        )

    for js_name, contract in sorted(JS_FORMULA_CONTRACT.items()):
        backend_refs = contract.get("backend_refs", [])
        browser_only = contract.get("browser_only")
        if backend_refs and browser_only:
            fail(f"{js_name} cannot be both backend-backed and browser-only")
        if not backend_refs and not browser_only:
            fail(f"{js_name} must declare backend_refs or browser_only")
        missing = sorted(set(backend_refs) - src_names)
        if missing:
            fail(f"{js_name} references missing French .multi functions: {missing}")

    wasm_keys = renderer_wasm_function_keys()
    missing_sources = sorted((wasm_keys - SPECIAL_WASM_EXPORTS) - src_names)
    if missing_sources:
        fail(f"renderer wasmFunctions entries without French .multi definitions: {missing_sources}")

    print("[js-backend-contract] all checks passed")


if __name__ == "__main__":
    main()
