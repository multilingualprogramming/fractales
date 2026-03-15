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
    "attracteur_de_peter_de_jong",
    "attracteur_ikeda",
    "attracteur_de_henon",
    "lorenz_attractor",
    "rossler_attractor",
    "aizawa_attractor",
    "sprott_attractor",
    "feigenbaum_tree",
    "barnsley",
    "sierpinski",
    "tapis_sierpinski",
    "menger_sponge",
    "mandelbulb",
    "tetraedre_sierpinski",
    "julia_quaternion",
    "mandelbox",
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
    "interpoler_lineaire",
    "interpoler_logarithmique",
    "ajuster_iterations_export",
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
        fail("unable to parse MODES_* from src/main.ml")
    names: set[str] = set()
    for raw_list in mode_lists:
        names.update(re.findall(r'"([^"]+)"', raw_list))
    return names


def extract_source_function_names() -> set[str]:
    names: set[str] = set()
    for path in SRC.glob("*.ml"):
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
        "mandelbrot_classe",
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
    for path in SRC.glob("*.ml"):
        text = path.read_text(encoding="utf-8")
        if "fonction " in text:
            fail(f"legacy keyword 'fonction' still present in {path.relative_to(ROOT)}")


def check_fractal_registration_consistency() -> None:
    main_text = (SRC / "main.ml").read_text(encoding="utf-8")
    renderer_text = (PUBLIC / "js" / "renderer.js").read_text(encoding="utf-8")

    main_names = extract_main_mode_names(main_text)
    source_functions = extract_source_function_names()
    renderer_names = extract_renderer_family_names(renderer_text)

    missing_source_impl = sorted((main_names - {"mandelbrot_classe"}) - source_functions)
    if missing_source_impl:
        fail(f"fractals registered in src/main.ml without source implementation: {missing_source_impl}")

    missing_in_renderer = sorted(main_names - renderer_names)
    if missing_in_renderer:
        fail(f"fractals registered in src/main.ml but missing from renderer families: {missing_in_renderer}")

    missing_in_exports = sorted((main_names - {"mandelbrot_classe"}) - REQUIRED_EXPORTS)
    if missing_in_exports:
        fail(f"fractals registered in src/main.ml but missing from REQUIRED_EXPORTS: {missing_in_exports}")


def main() -> None:
    print("[integration] running checks...")
    require_file(PUBLIC / "main.ml")
    require_file(PUBLIC / "main_wasm_bundle.ml")
    require_file(PUBLIC / "mandelbrot_transpiled.py")
    require_file(PUBLIC / "benchmark.json")

    check_wat()
    check_wasm_exports()
    check_renderer_contract()
    check_source_keywords()
    check_fractal_registration_consistency()

    print("[integration] all checks passed")


if __name__ == "__main__":
    main()
