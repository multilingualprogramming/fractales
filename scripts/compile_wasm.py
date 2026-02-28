#!/usr/bin/env python3
"""
Strict multilingual build pipeline (no handwritten WASM bytecode).

Steps:
  1. Read src/main.ml
  2. Copy to public/main.ml
  3. Transpile with multilingual ProgramExecutor (strict: fail on any error)
  4. Generate WAT via official multilingual backend
  5. Compile WAT -> WASM via wasmtime.wat2wasm
  6. Validate required exports in generated WASM
  5. Benchmark Python transpiled code
  6. Write public/benchmark.json
"""

import io
import json
import shutil
import sys
from pathlib import Path

# Ensure UTF-8 console output on Windows.
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() not in ("utf-8", "utf8"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent.parent
SRC_ML = ROOT / "src" / "main.ml"
PUBLIC = ROOT / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

ML_OUT = PUBLIC / "main.ml"
PY_OUT = PUBLIC / "mandelbrot_transpiled.py"
BENCH_OUT = PUBLIC / "benchmark.json"
WASM_RS_OUT = PUBLIC / "wasm_intermediate.rs"
WAT_OUT = PUBLIC / "main.wat"
LEGACY_WASM_OUT = PUBLIC / "mandelbrot.wasm"

BENCH_GRID = 200
BENCH_ITERS = 100
SEPARATOR = "=" * 62


def add_local_multilingual_repo_to_path() -> None:
    """Prefer local sibling repo for development, if present."""
    candidates = [
        ROOT.parent / "multilingual",
        Path.home() / "Documents" / "Research" / "Workspace" / "multilingual",
    ]
    for candidate in candidates:
        if (candidate / "multilingualprogramming" / "__init__.py").exists():
            if str(candidate) not in sys.path:
                sys.path.insert(0, str(candidate))
            return


def transpile_strict(source: str) -> str:
    """Transpile multilingual source to Python. Any failure raises RuntimeError."""
    add_local_multilingual_repo_to_path()
    try:
        from multilingualprogramming import ProgramExecutor  # noqa: PLC0415
    except Exception as exc:  # pragma: no cover - explicit build failure path
        raise RuntimeError(
            "multilingualprogramming introuvable. Le build doit echouer."
        ) from exc

    try:
        executor = ProgramExecutor(language="fr")
        py_code = executor.transpile(source)
    except Exception as exc:  # pragma: no cover - explicit build failure path
        raise RuntimeError(f"Echec de transpilation multilingual: {exc}") from exc

    if not py_code or not py_code.strip():
        raise RuntimeError("Transpilation multilingual vide.")
    return py_code


def emit_wasm_intermediate_if_available(source: str) -> tuple[bool, str | None]:
    """
    Emit Rust WASM intermediate from multilingual AST when supported.
    Returns: (available, error_message_if_any)
    """
    add_local_multilingual_repo_to_path()
    try:
        from multilingualprogramming.lexer.lexer import Lexer  # noqa: PLC0415
        from multilingualprogramming.parser.parser import Parser  # noqa: PLC0415
        from multilingualprogramming.codegen.wasm_generator import (  # noqa: PLC0415
            WasmCodeGenerator,
        )
    except Exception as exc:
        return (False, f"APIs WASM indisponibles: {exc}")

    try:
        lexer = Lexer(source, language="fr")
        tokens = lexer.tokenize()
        parser = Parser(tokens, source_language=lexer.language or "fr")
        program = parser.parse()
        rust_code = WasmCodeGenerator().generate(program)
        WASM_RS_OUT.write_text(rust_code, encoding="utf-8")
        return (True, None)
    except Exception as exc:
        return (False, str(exc))


def generate_wat_and_wasm_strict(source: str) -> tuple[str, bytes]:
    """Generate WAT with multilingual then compile to wasm bytes with wasmtime."""
    add_local_multilingual_repo_to_path()
    try:
        from multilingualprogramming.lexer.lexer import Lexer  # noqa: PLC0415
        from multilingualprogramming.parser.parser import Parser  # noqa: PLC0415
        from multilingualprogramming.codegen.wat_generator import WATCodeGenerator  # noqa: PLC0415
    except Exception as exc:
        raise RuntimeError(f"APIs WAT indisponibles: {exc}") from exc

    try:
        import wasmtime  # noqa: PLC0415
    except Exception as exc:
        raise RuntimeError(f"wasmtime introuvable pour wat2wasm: {exc}") from exc

    try:
        lexer = Lexer(source, language="fr")
        tokens = lexer.tokenize()
        parser = Parser(tokens, source_language=lexer.language or "fr")
        program = parser.parse()
        wat_text = WATCodeGenerator().generate(program)
    except Exception as exc:
        raise RuntimeError(f"Echec generation WAT: {exc}") from exc

    try:
        wasm_bytes = wasmtime.wat2wasm(wat_text)
    except Exception as exc:
        raise RuntimeError(f"Echec compilation WAT->WASM: {exc}") from exc

    return wat_text, wasm_bytes


def validate_wasm_exports(wasm_bytes: bytes, required_exports: list[str]) -> None:
    """Fail if one of the expected exports is absent."""
    try:
        import wasmtime  # noqa: PLC0415
    except Exception as exc:
        raise RuntimeError(f"wasmtime introuvable pour validation export: {exc}") from exc

    engine = wasmtime.Engine()
    store = wasmtime.Store(engine)
    module = wasmtime.Module(engine, wasm_bytes)
    imports = []
    for imp in module.imports:
        if isinstance(imp.type, wasmtime.FuncType):
            results_len = len(imp.type.results)

            if results_len == 0:
                def _stub_no_result(*_args):
                    return None

                imports.append(wasmtime.Func(store, imp.type, _stub_no_result))
            elif results_len == 1:
                def _stub_one_result(*_args):
                    return 0

                imports.append(wasmtime.Func(store, imp.type, _stub_one_result))
            else:
                def _stub_multi_result(*_args):
                    return tuple(0 for _ in range(results_len))

                imports.append(wasmtime.Func(store, imp.type, _stub_multi_result))
        else:
            raise RuntimeError(f"Type d'import non supporte pour validation: {imp.type}")

    instance = wasmtime.Instance(store, module, imports)
    exports = instance.exports(store)

    missing = [name for name in required_exports if name not in exports]
    if missing:
        raise RuntimeError(f"Exports WASM manquants: {missing}")


def main() -> None:
    print(SEPARATOR)
    print("  Explorateur de Fractales -- Build strict multilingual")
    print(SEPARATOR)

    print(f"\n[1] Lecture de {SRC_ML.relative_to(ROOT)}")
    if not SRC_ML.exists():
        raise RuntimeError(f"Fichier source introuvable: {SRC_ML}")
    source = SRC_ML.read_text(encoding="utf-8")
    print(f"    {len(source)} caracteres, {source.count(chr(10))} lignes")

    print(f"\n[2] Copie vers {ML_OUT.relative_to(ROOT)}")
    shutil.copy(SRC_ML, ML_OUT)
    print("    Copie.")

    if LEGACY_WASM_OUT.exists():
        LEGACY_WASM_OUT.unlink()
        print(f"    Ancien artefact supprime: {LEGACY_WASM_OUT.relative_to(ROOT)}")

    print("\n[3] Transpilation multilingual -> Python (strict)")
    python_code = transpile_strict(source)
    PY_OUT.write_text(python_code, encoding="utf-8")
    print(f"    Ecrit dans {PY_OUT.relative_to(ROOT)}")
    print("    Apercu :")
    for line in python_code.splitlines()[:12]:
        print(f"      {line}")

    print("\n[4] Generation WASM (backends officiels multilingual)")
    wasm_intermediate_available, wasm_error = emit_wasm_intermediate_if_available(source)
    if wasm_intermediate_available:
        print(f"    Rust intermediaire ecrit: {WASM_RS_OUT.relative_to(ROOT)}")
    else:
        print("    Rust intermediaire indisponible.")
        if wasm_error:
            print(f"    Detail: {wasm_error}")

    wat_text, wasm_bytes = generate_wat_and_wasm_strict(source)
    WAT_OUT.write_text(wat_text, encoding="utf-8")
    LEGACY_WASM_OUT.write_bytes(wasm_bytes)
    print(f"    WAT ecrit : {WAT_OUT.relative_to(ROOT)}")
    print(f"    WASM ecrit: {LEGACY_WASM_OUT.relative_to(ROOT)} ({len(wasm_bytes):,} octets)")

    required_exports = [
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
    ]
    validate_wasm_exports(wasm_bytes, required_exports)
    print(f"    Exports valides: {', '.join(required_exports)}")

    print(f"\n[5] Benchmark")
    print("    Ignore dans ce pipeline strict (pas d'execution runtime hors compilation).")
    python_ms = None
    multibrot_python_ms = None

    print(f"\n[6] Ecriture de {BENCH_OUT.relative_to(ROOT)}")
    benchmark = {
        "python_ms": None,
        "wasm_ms": None,
        "speedup": None,
        "multibrot_python_ms": None,
        "multibrot_wasm_ms": None,
        "multibrot_speedup": None,
        "grid_size": BENCH_GRID,
        "max_iter": BENCH_ITERS,
        "wasm_available": True,
        "wasm_estimated": False,
        "wasm_pipeline": "multilingual_official_wat2wasm",
    }
    BENCH_OUT.write_text(json.dumps(benchmark, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(benchmark, indent=4, ensure_ascii=False))

    print(f"\n{SEPARATOR}")
    print("  OK Build strict multilingual termine.")
    print(f"    ML   : {ML_OUT.relative_to(ROOT)}")
    print(f"    PY   : {PY_OUT.relative_to(ROOT)}")
    if wasm_intermediate_available:
        print(f"    RS   : {WASM_RS_OUT.relative_to(ROOT)}")
    print(f"    WAT  : {WAT_OUT.relative_to(ROOT)}")
    print(f"    WASM : {LEGACY_WASM_OUT.relative_to(ROOT)}")
    print(f"    JSON : {BENCH_OUT.relative_to(ROOT)}")
    print(SEPARATOR)


if __name__ == "__main__":
    main()
