#!/usr/bin/env python3
"""Integration checks for strict multilingual WASM build outputs."""

from __future__ import annotations

import sys
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
    "newton",
    "phoenix",
    "barnsley",
    "sierpinski",
    "koch",
    "magnet1",
    "magnet2",
    "lambda_fractale",
}


def fail(msg: str) -> None:
    print(f"[integration] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def require_file(path: Path) -> None:
    if not path.exists() or not path.is_file():
        fail(f"missing file: {path.relative_to(ROOT)}")


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


def check_source_keywords() -> None:
    for path in SRC.glob("*.ml"):
        text = path.read_text(encoding="utf-8")
        if "fonction " in text:
            fail(f"legacy keyword 'fonction' still present in {path.relative_to(ROOT)}")


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

    print("[integration] all checks passed")


if __name__ == "__main__":
    main()
