#!/usr/bin/env python3
"""
generate_api.py — Génère les fichiers JSON de l'API statique pour les agents IA.

Lit public/js/renderer.js pour extraire le catalogue de fractales,
les préréglages de vue et la carte des sources, puis produit :
  public/api/fractals.json        — catalogue complet
  public/api/families.json        — index des familles
  public/api/families/{id}.json   — une famille par fichier
  public/api/palettes.json        — palettes disponibles
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

BASE_URL = "https://multilingualprogramming.github.io/fractales"
REFERENCE_WIDTH = 800  # largeur de référence pour calculer pixelSize

MODES_3D = {"tetraedre_sierpinski", "julia_quaternion", "mandelbox"}
JULIA_FRACTALS = {"julia", "burning_julia", "julia_lisse", "julia_piege_cercle"}
POWER_FRACTALS = {"multibrot"}

# Descriptions courtes pour les agents IA (non présentes dans le JS)
FRACTAL_DESCRIPTIONS: dict[str, str] = {
    "mandelbrot": "The canonical Mandelbrot set: z_{n+1} = z_n^2 + c, escape-time coloring.",
    "julia": "Julia set for a fixed complex parameter c, variable z_0.",
    "burning_ship": "Burning Ship fractal: abs(Re) and abs(Im) before squaring.",
    "tricorn": "Tricorn (Mandelbar): conjugate of z before squaring.",
    "multibrot": "Generalized Mandelbrot set z_{n+1} = z_n^d + c for integer d ≥ 2.",
    "celtic": "Celtic fractal variant: abs of real part inside the iteration.",
    "buffalo": "Buffalo fractal: abs applied to both components.",
    "perpendicular_burning_ship": "Perpendicular Burning Ship variant.",
    "heart": "Heart fractal variant of Mandelbrot.",
    "perpendicular_mandelbrot": "Perpendicular Mandelbrot variant.",
    "perpendicular_celtic": "Perpendicular Celtic variant.",
    "duck": "Duck fractal: logarithmic complex iteration.",
    "buddhabrot": "Buddhabrot: density of escaping trajectories over the complex plane.",
    "burning_julia": "Julia variant of the Burning Ship formula.",
    "biomorphe": "Pickover biomorph: trig functions modifying escape condition.",
    "newton": "Newton fractal for z^3 − 1 = 0, basins of attraction for the three roots.",
    "phoenix": "Phoenix fractal: two-term recurrence with memory term.",
    "lyapunov": "Lyapunov fractal: stability exponent along a symbolic sequence AB.",
    "lyapunov_multisequence": "Lyapunov fractal with custom multi-character sequences.",
    "bassin_newton_generalise": "Generalized Newton basin fractal.",
    "orbitale_de_nova": "Nova orbital fractal: Newton-like with additive perturbation.",
    "collatz_complexe": "Complex Collatz-inspired iteration.",
    "attracteur_de_clifford": "Clifford attractor: 4-parameter chaotic strange attractor.",
    "attracteur_de_peter_de_jong": "Peter de Jong attractor: sin/cos chaotic system.",
    "attracteur_ikeda": "Ikeda attractor: laser cavity chaotic dynamics.",
    "attracteur_de_henon": "Hénon attractor: 2D discrete chaotic map.",
    "lorenz_attractor": "Lorenz attractor: ODEs exhibiting butterfly chaos.",
    "rossler_attractor": "Rössler attractor: 3D continuous chaotic system.",
    "aizawa_attractor": "Aizawa attractor: 3D spiral chaotic dynamics.",
    "sprott_attractor": "Sprott attractor: minimal 3D chaotic system.",
    "feigenbaum_tree": "Feigenbaum bifurcation diagram of the logistic map.",
    "duffing_attractor": "Duffing attractor: forced non-linear oscillator chaos.",
    "barnsley": "Barnsley fern: iterated function system (IFS) botanical fractal.",
    "sierpinski": "Sierpiński triangle: self-similar IFS gasket.",
    "tapis_sierpinski": "Sierpiński carpet: square IFS analogue.",
    "menger_sponge": "Menger sponge: 3D IFS analogue of the Sierpiński carpet.",
    "mandelbulb": "Mandelbulb: 3D power-8 extension of the Mandelbrot set.",
    "tetraedre_sierpinski": "Sierpiński tetrahedron: 3D IFS in WebGL.",
    "julia_quaternion": "Quaternionic Julia set rendered in 3D WebGL.",
    "mandelbox": "Mandelbox: 3D folding and scaling IFS, rendered in WebGL.",
    "vicsek_fractal": "Vicsek fractal: cross-symmetric IFS.",
    "lichtenberg_figures": "Lichtenberg figures: branching discharge pattern simulation.",
    "koch": "Koch snowflake: L-system F→F+F--F+F, 60° angle.",
    "dragon_heighway": "Heighway dragon curve: L-system right-angle folding.",
    "courbe_levy_c": "Lévy C curve: L-system 45° self-similar curve.",
    "gosper_curve": "Gosper flowsnake: L-system space-filling hexagonal curve.",
    "cantor_set": "Cantor set: recursive middle-third removal.",
    "triangle_de_cercles_recursifs": "Recursive circle triangle: geometric IFS circles.",
    "apollonian_gasket": "Apollonian gasket: recursive circle packing.",
    "t_square_fractal": "T-square fractal: recursive centered squares.",
    "h_fractal": "H-fractal: recursive H-tree structure.",
    "hilbert_curve": "Hilbert curve: space-filling L-system curve.",
    "peano_curve": "Peano curve: first discovered space-filling curve.",
    "arbre_pythagore": "Pythagorean tree: right-triangle recursive branching.",
    "magnet1": "Magnet I fractal: magnetic renormalization group iteration.",
    "magnet2": "Magnet II fractal: higher-order magnetic renormalization.",
    "magnet3": "Magnet III fractal: third-order magnetic variant.",
    "lambda_fractale": "Lambda fractal: complex logistic map λz(1-z).",
    "lambda_cubique": "Cubic Lambda fractal: λz^2(1-z) variant.",
    "magnet_cosinus": "Magnetic cosine variant fractal.",
    "magnet_sinus": "Magnetic sine variant fractal.",
    "nova_magnetique": "Nova magnetic fractal: Newton-magnetic hybrid.",
    "mandelbrot_lisse": "Smooth Mandelbrot: continuous iteration count for band-free coloring.",
    "julia_lisse": "Smooth Julia set with continuous iteration count.",
    "burning_ship_lisse": "Smooth Burning Ship with continuous iteration count.",
    "tricorn_lisse": "Smooth Tricorn with continuous iteration count.",
    "mandelbrot_piege_cercle": "Mandelbrot with circular orbit trap coloring.",
    "mandelbrot_piege_croix": "Mandelbrot with cross orbit trap coloring.",
    "mandelbrot_piege_ligne": "Mandelbrot with line orbit trap coloring.",
    "julia_piege_cercle": "Julia set with circular orbit trap coloring.",
    "mandelbrot_classe": "Mandelbrot via object-oriented multilingual class (compatibility demo).",
}

FAMILY_DESCRIPTIONS: dict[str, str] = {
    "evasion": "Escape-time fractals: color each point by how many iterations before divergence.",
    "dynamique": "Dynamic systems: Newton basins, attractors, Lyapunov, and chaotic maps.",
    "ifs": "Iterated Function Systems: self-similar structures from affine maps and random chaos.",
    "lsystem": "L-system curves: geometric fractals from string-rewriting (Lindenmayer systems).",
    "magnetique": "Magnetic fractals: renormalization-group iterations from statistical physics.",
    "lisse": "Smooth coloring variants: continuous iteration count eliminates discrete color bands.",
    "orbitrap": "Orbit trap fractals: color by orbit proximity to a geometric shape.",
}

PALETTE_DESCRIPTIONS: dict[str, str] = {
    "aurora": "Synthwave aurora — electric void → neon teal → acid lime → gold. Default.",
    "feu": "Volcanic plasma — char-black → electric crimson → acid yellow → white-hot.",
    "ocean": "Electric deep ocean — void-black → midnight → neon cyan → white.",
    "braise": "Oxidized copper — umber → rust → copper → brass → champagne.",
    "lagon": "Glacier glass — polar night → slate blue → ice cyan → frozen white.",
    "crepuscule": "Velvet dusk — aubergine → orchid → rose → apricot → moonlight.",
    "neon": "Ultraviolet arcade — blacklight → violet → hot pink → laser blue → mint.",
    "infrared": "Mineral survey — basalt → indigo → cobalt → jade → sand → ivory.",
    "personnalisee": "Custom palette: user-defined gradient stops via the palette editor.",
}


# ── Extraction helpers ─────────────────────────────────────────────────────

def load_renderer() -> str:
    path = PUBLIC / "js" / "renderer.js"
    if not path.exists():
        sys.exit(f"[generate_api] renderer.js not found at {path}")
    return path.read_text(encoding="utf-8")


def extract_families(text: str) -> list[dict]:
    match = re.search(r"const FRACTAL_FAMILIES = \[(.*?)\n\];", text, re.DOTALL)
    if not match:
        sys.exit("[generate_api] Cannot parse FRACTAL_FAMILIES")
    raw = match.group(1)
    families = []
    for fm in re.finditer(
        r'id:\s*"([^"]+)",\s*\n\s*label:\s*"([^"]+)",\s*\n\s*fractales:\s*\[(.*?)\n\s*\],',
        raw, re.DOTALL
    ):
        fid = fm.group(1)
        flabel = fm.group(2)
        fractals = re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', fm.group(3))
        families.append({"id": fid, "label": flabel, "fractals": fractals})
    return families


def extract_view_presets(text: str) -> dict[str, dict]:
    match = re.search(r"const VIEW_PRESETS = \{(.*?)\n\};", text, re.DOTALL)
    if not match:
        sys.exit("[generate_api] Cannot parse VIEW_PRESETS")
    raw = match.group(1)
    presets: dict[str, dict] = {}
    for m in re.finditer(
        r'(\w+):\s*\{\s*centerX:\s*([-\d.]+),\s*centerY:\s*([-\d.]+),\s*span:\s*([-\d.]+)\s*\}',
        raw
    ):
        presets[m.group(1)] = {
            "centerX": float(m.group(2)),
            "centerY": float(m.group(3)),
            "span": float(m.group(4)),
        }
    return presets


def extract_source_map(text: str) -> dict[str, str]:
    match = re.search(r"const FRACTAL_SOURCE_MAP = \{(.*?)\n\};", text, re.DOTALL)
    if not match:
        sys.exit("[generate_api] Cannot parse FRACTAL_SOURCE_MAP")
    raw = match.group(1)
    src_map: dict[str, str] = {}
    for m in re.finditer(r'(\w+):\s*"(fractales_\w+)"', raw):
        src_map[m.group(1)] = m.group(2)
    return src_map


def extract_set(text: str, name: str) -> set[str]:
    match = re.search(rf'const {re.escape(name)} = new Set\(\[(.*?)\]\)', text)
    if not match:
        sys.exit(f"[generate_api] Cannot parse {name}")
    return set(re.findall(r'"([^"]+)"', match.group(1)))


# ── Build helpers ──────────────────────────────────────────────────────────

def render_mode(fid: str, point_fractals: set, line_fractals: set) -> str:
    if fid in MODES_3D:
        return "webgl_3d"
    if fid in point_fractals:
        return "point_cloud"
    if fid in line_fractals:
        return "line"
    return "escape_time"


def default_deeplink(fid: str, preset: dict) -> str:
    ps = preset["span"] / REFERENCE_WIDTH
    cx = preset["centerX"]
    cy = preset["centerY"]
    params = [
        f"f={fid}",
        f"x={cx}",
        f"y={cy}",
        f"ps={ps:.4e}",
        "i=256",
        "p=aurora",
    ]
    return BASE_URL + "/#" + "&".join(params)


def build_fractal_entry(
    fid: str,
    label: str,
    family_id: str,
    family_label: str,
    preset: dict,
    source_module: str,
    point_fractals: set,
    line_fractals: set,
) -> dict:
    mode = render_mode(fid, point_fractals, line_fractals)
    ps_default = preset["span"] / REFERENCE_WIDTH
    entry: dict = {
        "id": fid,
        "label": label,
        "description": FRACTAL_DESCRIPTIONS.get(fid, ""),
        "family": family_id,
        "family_label": family_label,
        "render_mode": mode,
        "is_3d": fid in MODES_3D,
        "parameters": {
            "has_julia_c": fid in JULIA_FRACTALS,
            "has_power": fid in POWER_FRACTALS,
        },
        "source": {
            "module": source_module,
            "language": "multilingual",
            "url": f"{BASE_URL}/{source_module}.multi",
            "python_url": f"{BASE_URL}/{source_module}.py",
        },
        "preset": preset,
        "default_pixelsize": round(ps_default, 10),
        "deep_link": default_deeplink(fid, preset),
        "viewer_url": f"{BASE_URL}/",
    }
    return entry


# ── Write helpers ──────────────────────────────────────────────────────────

def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  → {path.relative_to(ROOT)}")


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    print("[generate_api] Génération des fichiers JSON de l'API statique…")

    text = load_renderer()
    families_raw = extract_families(text)
    view_presets = extract_view_presets(text)
    source_map = extract_source_map(text)
    point_fractals = extract_set(text, "POINT_FRACTALS")
    line_fractals = extract_set(text, "LINE_FRACTALS")

    # Fallback preset for multibrot (dynamically computed in JS)
    if "multibrot" not in view_presets:
        view_presets["multibrot"] = {"centerX": 0.0, "centerY": 0.0, "span": 1.8}

    all_fractals: list[dict] = []
    families_index: list[dict] = []

    for family in families_raw:
        fid = family["id"]
        flabel = family["label"]
        family_fractals: list[dict] = []

        for fractal_id, fractal_label in family["fractals"]:
            preset = view_presets.get(fractal_id, {"centerX": 0.0, "centerY": 0.0, "span": 3.0})
            src_module = source_map.get(fractal_id, "fractales_escape")
            entry = build_fractal_entry(
                fractal_id, fractal_label, fid, flabel,
                preset, src_module, point_fractals, line_fractals,
            )
            all_fractals.append(entry)
            family_fractals.append(entry)

        # Write per-family JSON
        write_json(
            PUBLIC / "api" / "families" / f"{fid}.json",
            {
                "id": fid,
                "label": flabel,
                "description": FAMILY_DESCRIPTIONS.get(fid, ""),
                "count": len(family_fractals),
                "fractals": family_fractals,
            }
        )

        families_index.append({
            "id": fid,
            "label": flabel,
            "description": FAMILY_DESCRIPTIONS.get(fid, ""),
            "count": len(family_fractals),
            "url": f"{BASE_URL}/api/families/{fid}.json",
            "fractal_ids": [f["id"] for f in family_fractals],
        })

    # Write complete catalog
    write_json(
        PUBLIC / "api" / "fractals.json",
        {
            "schema": f"{BASE_URL}/schemas/fractal.schema.json",
            "generated_from": "public/js/renderer.js",
            "base_url": BASE_URL,
            "total": len(all_fractals),
            "fractals": all_fractals,
        }
    )

    # Write family index
    write_json(
        PUBLIC / "api" / "families.json",
        {
            "base_url": BASE_URL,
            "total_families": len(families_index),
            "total_fractals": len(all_fractals),
            "families": families_index,
        }
    )

    # Write palettes
    palettes = [
        {"id": pid, "description": desc}
        for pid, desc in PALETTE_DESCRIPTIONS.items()
    ]
    write_json(
        PUBLIC / "api" / "palettes.json",
        {
            "base_url": BASE_URL,
            "total": len(palettes),
            "default": "aurora",
            "palettes": palettes,
        }
    )

    print(f"[generate_api] Terminé — {len(all_fractals)} fractales dans {len(families_raw)} familles.")


if __name__ == "__main__":
    main()
