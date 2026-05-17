#!/usr/bin/env python3
"""Integration checks for strict multilingual WASM build outputs."""

from __future__ import annotations

import sys
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SRC = ROOT / "src"

REQUIRED_EXPORTS = {
    "mandelbrot",
    "julia",
    "burning_ship",
    "tricorn",
    "multibrot",
    "celtic",
    "buffalo",
    "perpendicular_burning_ship",
    "heart",
    "perpendicular_mandelbrot",
    "perpendicular_celtic",
    "duck",
    "buddhabrot",
    "newton",
    "phoenix",
    "lyapunov",
    "lyapunov_multisequence",
    "bassin_newton_generalise",
    "orbitale_de_nova",
    "collatz_complexe",
    "attracteur_de_clifford",
    "attracteur_de_clifford_etape_x",
    "attracteur_de_clifford_etape_y",
    "attracteur_de_peter_de_jong",
    "attracteur_de_peter_de_jong_etape_x",
    "attracteur_de_peter_de_jong_etape_y",
    "attracteur_ikeda",
    "attracteur_ikeda_etape_x",
    "attracteur_ikeda_etape_y",
    "attracteur_de_henon",
    "attracteur_de_henon_etape_x",
    "attracteur_de_henon_etape_y",
    "lorenz_attractor",
    "lorenz_attractor_etape_x",
    "lorenz_attractor_etape_y",
    "lorenz_attractor_etape_z",
    "projeter_lorenz_x",
    "projeter_lorenz_y",
    "rossler_attractor",
    "rossler_attractor_etape_x",
    "rossler_attractor_etape_y",
    "rossler_attractor_etape_z",
    "projeter_rossler_x",
    "projeter_rossler_y",
    "aizawa_attractor",
    "aizawa_attractor_etape_x",
    "aizawa_attractor_etape_y",
    "aizawa_attractor_etape_z",
    "projeter_aizawa_x",
    "projeter_aizawa_y",
    "sprott_attractor",
    "sprott_attractor_etape_x",
    "sprott_attractor_etape_y",
    "sprott_attractor_etape_z",
    "projeter_sprott_x",
    "projeter_sprott_y",
    "feigenbaum_tree",
    "barnsley",
    "sierpinski",
    "tapis_sierpinski",
    "menger_sponge",
    "mandelbulb",
    "tetraedre_sierpinski",
    "julia_quaternion",
    "julia_quaternion_etape_x",
    "julia_quaternion_etape_y",
    "julia_quaternion_etape_z",
    "mandelbox",
    "mandelbox_etape_x",
    "mandelbox_etape_y",
    "mandelbox_etape_z",
    "vicsek_fractal",
    "lichtenberg_figures",
    "koch",
    "dragon_heighway",
    "courbe_levy_c",
    "gosper_curve",
    "cantor_set",
    "triangle_de_cercles_recursifs",
    "apollonian_gasket",
    "t_square_fractal",
    "h_fractal",
    "hilbert_curve",
    "peano_curve",
    "arbre_pythagore",
    "magnet1",
    "magnet2",
    "magnet3",
    "lambda_fractale",
    "lambda_cubique",
    "magnet_cosinus",
    "magnet_sinus",
    "nova_magnetique",
    "burning_julia",
    "biomorphe",
    "duffing_attractor",
    "duffing_attractor_etape_x",
    "duffing_attractor_etape_y",
    "mandelbrot_lisse",
    "julia_lisse",
    "burning_ship_lisse",
    "tricorn_lisse",
    "mandelbrot_piege_cercle",
    "mandelbrot_piege_croix",
    "mandelbrot_piege_ligne",
    "julia_piege_cercle",
    "interpoler_lineaire",
    "interpoler_logarithmique",
    "ajuster_iterations_export",
    "easer_cubique",
    "interpoler_pixelsize_nav",
    "interpoler_angle_nav",
}


def fail(msg: str) -> None:
    print(f"[integration] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def require_file(path: Path) -> None:
    if not path.exists() or not path.is_file():
        fail(f"missing file: {path.relative_to(ROOT)}")


def extract_js_array(text: str, name: str) -> list[str]:
    pattern = rf"const {re.escape(name)} = new Set\(\[(.*?)\]\);"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        fail(f"unable to parse {name} from public/js/renderer.js")
    values = re.findall(r'"([^"]+)"', match.group(1))
    return values


def extract_js_object_keys(text: str, name: str) -> list[str]:
    pattern = rf"const {re.escape(name)} = \{{(.*?)\n\}};"
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        fail(f"unable to parse {name} from public/js/renderer.js")
    return re.findall(r"^\s*([a-zA-Z0-9_]+)\s*:", match.group(1), re.MULTILINE)


def extract_main_mode_names(text: str) -> set[str]:
    mode_lists = re.findall(r'soit MODES_[A-Z_]+ = \[(.*?)\]', text)
    if not mode_lists:
        fail("unable to parse MODES_* from src/main.multi")
    names: set[str] = set()
    for raw_list in mode_lists:
        names.update(re.findall(r'"([^"]+)"', raw_list))
    return names


def extract_source_function_names() -> set[str]:
    names: set[str] = set()
    for path in SRC.glob("*.multi"):
        text = path.read_text(encoding="utf-8")
        names.update(re.findall(r"^déf\s+([a-zA-Z0-9_]+)\s*\(", text, re.MULTILINE))
    return names


def extract_renderer_family_names(text: str) -> set[str]:
    family_match = re.search(r"const FRACTAL_FAMILIES = \[(.*?)\n\];", text, re.DOTALL)
    if not family_match:
        fail("unable to parse FRACTAL_FAMILIES from public/js/renderer.js")
    return set(re.findall(r'\["([^"]+)",\s*"[^"]+"\]', family_match.group(1)))


def check_wat() -> None:
    wat_path = PUBLIC / "main.wat"
    require_file(wat_path)
    wat = wat_path.read_text(encoding="utf-8")
    if "unsupported call" in wat:
        fail("public/main.wat contains 'unsupported call'")
    if "unresolved:" in wat:
        fail("public/main.wat contains 'unresolved:'")


def check_wasm_exports() -> None:
    wasm_path = PUBLIC / "mandelbrot.wasm"
    require_file(wasm_path)

    try:
        import wasmtime
    except Exception as exc:  # pragma: no cover - CI dependency issue
        fail(f"cannot import wasmtime: {exc}")

    engine = wasmtime.Engine()
    module = wasmtime.Module.from_file(engine, str(wasm_path))
    exported = {e.name for e in module.exports}
    missing = sorted(REQUIRED_EXPORTS - exported)
    if missing:
        fail(f"missing wasm exports: {missing}")


def check_renderer_contract() -> None:
    renderer = (PUBLIC / "js" / "renderer.js")
    require_file(renderer)
    text = renderer.read_text(encoding="utf-8")

    required_imports = ["print_str", "print_f64", "print_bool", "print_sep", "print_newline"]
    missing = [name for name in required_imports if name not in text]
    if missing:
        fail(f"renderer.js missing WASM host imports: {missing}")

    mojibake_markers = ["Ã", "â", "�", "ðŸ"]
    for marker in mojibake_markers:
        if marker in text:
            fail(f"renderer.js contains encoding artifact marker: {marker!r}")

    point_fractals = set(extract_js_array(text, "POINT_FRACTALS"))
    line_fractals = set(extract_js_array(text, "LINE_FRACTALS"))
    view_presets = set(extract_js_object_keys(text, "VIEW_PRESETS"))
    source_map = set(extract_js_object_keys(text, "FRACTAL_SOURCE_MAP"))
    families = extract_renderer_family_names(text)
    wasm_keys = set(
        re.findall(
            r'([a-zA-Z0-9_]+):\s*typeof exports\.\1 === "function"',
            text,
        )
    )
    if not wasm_keys:
        fail("unable to parse wasmFunctions entries from public/js/renderer.js")

    special_non_fractal_exports = {
        "interpoler_lineaire",
        "interpoler_logarithmique",
        "ajuster_iterations_export",
        "easer_cubique",
        "interpoler_pixelsize_nav",
        "interpoler_angle_nav",
        "mandelbrot_classe",
        "julia_quaternion_etape_x",
        "julia_quaternion_etape_y",
        "julia_quaternion_etape_z",
        "mandelbox_etape_x",
        "mandelbox_etape_y",
        "mandelbox_etape_z",
        "attracteur_de_clifford_etape_x",
        "attracteur_de_clifford_etape_y",
        "attracteur_de_peter_de_jong_etape_x",
        "attracteur_de_peter_de_jong_etape_y",
        "attracteur_ikeda_etape_x",
        "attracteur_ikeda_etape_y",
        "attracteur_de_henon_etape_x",
        "attracteur_de_henon_etape_y",
        "lorenz_attractor_etape_x",
        "lorenz_attractor_etape_y",
        "lorenz_attractor_etape_z",
        "projeter_lorenz_x",
        "projeter_lorenz_y",
        "rossler_attractor_etape_x",
        "rossler_attractor_etape_y",
        "rossler_attractor_etape_z",
        "projeter_rossler_x",
        "projeter_rossler_y",
        "aizawa_attractor_etape_x",
        "aizawa_attractor_etape_y",
        "aizawa_attractor_etape_z",
        "projeter_aizawa_x",
        "projeter_aizawa_y",
        "sprott_attractor_etape_x",
        "sprott_attractor_etape_y",
        "sprott_attractor_etape_z",
        "projeter_sprott_x",
        "projeter_sprott_y",
        "duffing_attractor_etape_x",
        "duffing_attractor_etape_y",
    }
    registered_fractals = REQUIRED_EXPORTS - special_non_fractal_exports

    missing_family = sorted(registered_fractals - families)
    if missing_family:
        fail(f"fractals missing from FRACTAL_FAMILIES: {missing_family}")

    missing_presets = sorted(registered_fractals - view_presets)
    if missing_presets:
        fail(f"fractals missing from VIEW_PRESETS: {missing_presets}")

    missing_source_map = sorted(registered_fractals - source_map)
    if missing_source_map:
        fail(f"fractals missing from FRACTAL_SOURCE_MAP: {missing_source_map}")

    missing_wasm_keys = sorted(registered_fractals - wasm_keys)
    if missing_wasm_keys:
        fail(f"fractals missing from wasmFunctions mapping: {missing_wasm_keys}")

    render_classified = point_fractals | line_fractals | wasm_keys
    unclassified = sorted(registered_fractals - render_classified)
    if unclassified:
        fail(f"fractals not classified for rendering: {unclassified}")


def check_source_keywords() -> None:
    for path in SRC.glob("*.multi"):
        text = path.read_text(encoding="utf-8")
        if "fonction " in text:
            fail(f"legacy keyword 'fonction' still present in {path.relative_to(ROOT)}")


def check_fractal_registration_consistency() -> None:
    main_text = (SRC / "main.multi").read_text(encoding="utf-8")
    renderer_text = (PUBLIC / "js" / "renderer.js").read_text(encoding="utf-8")

    main_names = extract_main_mode_names(main_text)
    source_functions = extract_source_function_names()
    renderer_names = extract_renderer_family_names(renderer_text)

    missing_source_impl = sorted((main_names - {"mandelbrot_classe"}) - source_functions)
    if missing_source_impl:
        fail(f"fractals registered in src/main.multi without source implementation: {missing_source_impl}")

    missing_in_renderer = sorted(main_names - renderer_names)
    if missing_in_renderer:
        fail(f"fractals registered in src/main.multi but missing from renderer families: {missing_in_renderer}")

    missing_in_exports = sorted((main_names - {"mandelbrot_classe"}) - REQUIRED_EXPORTS)
    if missing_in_exports:
        fail(f"fractals registered in src/main.multi but missing from REQUIRED_EXPORTS: {missing_in_exports}")


def check_api_files() -> None:
    api = PUBLIC / "api"
    require_file(api / "fractals.json")
    require_file(api / "families.json")
    require_file(api / "palettes.json")

    families_dir = api / "families"
    expected_families = {"evasion", "dynamique", "ifs", "lsystem", "magnetique", "lisse", "orbitrap", "classe"}
    for fid in expected_families:
        require_file(families_dir / f"{fid}.json")

    require_file(PUBLIC / "tools.json")
    require_file(PUBLIC / "ai-manifest.json")

    try:
        import json
        data = json.loads((api / "fractals.json").read_text(encoding="utf-8"))
        count = data.get("total", 0)
        if count == 0:
            fail("public/api/fractals.json has total=0 — generate_api.py produced no fractals")
    except Exception as exc:
        fail(f"cannot parse public/api/fractals.json: {exc}")


def main() -> None:
    print("[integration] running checks...")
    require_file(PUBLIC / "main.multi")
    require_file(PUBLIC / "main_wasm_bundle.multi")
    require_file(PUBLIC / "mandelbrot_transpiled.py")
    require_file(PUBLIC / "benchmark.json")

    check_wat()
    check_wasm_exports()
    check_renderer_contract()
    check_source_keywords()
    check_fractal_registration_consistency()
    check_api_files()

    print("[integration] all checks passed")


if __name__ == "__main__":
    main()
