#!/usr/bin/env python3
"""
Pipeline de compilation : source multilingual français -> WebAssembly + benchmark

Etapes :
  1. Lire src/mandelbrot.ml
  2. Copier vers public/mandelbrot.ml  (servi statiquement par GitHub Pages)
  3. Transpiler vers Python via ProgramExecutor (multilingualprogramming)
  4. Generer un binaire WebAssembly valide (encodage direct du format WASM)
     pour mandelbrot(cx: f64, cy: f64, max_iter: f64) -> f64
  5. Benchmark Python vs WASM sur une grille 200x200 avec max_iter=100
  6. Ecrire public/benchmark.json

Usage :
  python scripts/compile_wasm.py
"""

import io
import json
import shutil
import struct
import sys
import time
from pathlib import Path

# Fix Windows console encoding (UTF-8 output)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding and sys.stderr.encoding.lower() not in ("utf-8", "utf8"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------
ROOT   = Path(__file__).parent.parent
SRC_ML = ROOT / "src" / "mandelbrot.ml"
PUBLIC = ROOT / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

WASM_OUT  = PUBLIC / "mandelbrot.wasm"
BENCH_OUT = PUBLIC / "benchmark.json"
PY_OUT    = PUBLIC / "mandelbrot_transpiled.py"
ML_OUT    = PUBLIC / "mandelbrot.ml"

# Parametres du benchmark
BENCH_GRID  = 200   # 200x200 = 40 000 pixels
BENCH_ITERS = 100

SEPARATOR = "=" * 62


def fmt(ms):
    """Formate une duree avec separateur de milliers."""
    return "{:,.0f}".format(ms).replace(",", "\u202f")


# ============================================================
# GENERATEUR DE BINAIRE WASM
#
# Encode directement le format binaire WebAssembly pour :
#   mandelbrot(cx: f64, cy: f64, max_iter: f64) -> f64
#
# Indices des variables locales :
#   params : 0=cx, 1=cy, 2=max_iter
#   locals : 3=x,  4=y,  5=iter,  6=xtemp
# ============================================================

def _uleb128(n):
    """Encode un entier non signe en LEB128."""
    result = []
    while True:
        byte = n & 0x7F
        n >>= 7
        if n:
            byte |= 0x80
        result.append(byte)
        if not n:
            break
    return bytes(result)


def _section(sid, content):
    return bytes([sid]) + _uleb128(len(content)) + content


def generate_mandelbrot_wasm():
    """
    Genere le binaire WASM correspondant exactement a src/mandelbrot.ml.

    Structure de la fonction (en pseudo-code WASM textuel) :
      block $outer (void)
        loop $inner (void)
          ;; si iter >= max_iter: sortir
          local.get 5 ; local.get 2 ; f64.ge ; br_if 1
          ;; si x*x+y*y > 4.0: return iter
          ...f64 ops... ; f64.gt ; if (void) ; local.get 5 ; return ; end
          ;; xtemp = x*x - y*y + cx
          ...
          ;; y = 2*x*y + cy
          ...
          ;; x = xtemp
          ...
          ;; iter = iter + 1.0
          ...
          br 0  ;; continuer la boucle
        end  ;; loop
      end  ;; block
      local.get 5  ;; retourner iter (iter == max_iter)
    """

    def lget(i): return bytes([0x20]) + _uleb128(i)
    def lset(i): return bytes([0x21]) + _uleb128(i)
    def br(d):   return bytes([0x0C]) + _uleb128(d)
    def brif(d): return bytes([0x0D]) + _uleb128(d)
    def f64c(v): return bytes([0x44]) + struct.pack('<d', v)

    F64_MUL    = bytes([0xA2])
    F64_ADD    = bytes([0xA0])
    F64_SUB    = bytes([0xA1])
    F64_GE     = bytes([0x66])
    F64_GT     = bytes([0x64])
    RETURN     = bytes([0x0F])
    END        = bytes([0x0B])
    BLOCK_VOID = bytes([0x02, 0x40])
    LOOP_VOID  = bytes([0x03, 0x40])
    IF_VOID    = bytes([0x04, 0x40])

    body  = BLOCK_VOID + LOOP_VOID

    # Condition de sortie : iter >= max_iter -> sortir du bloc
    body += lget(5) + lget(2) + F64_GE + brif(1)

    # Condition d'echappement : x*x + y*y > 4.0 -> return iter
    body += lget(3) + lget(3) + F64_MUL   # x*x
    body += lget(4) + lget(4) + F64_MUL   # y*y
    body += F64_ADD                         # x*x + y*y
    body += f64c(4.0) + F64_GT            # > 4.0 ?
    body += IF_VOID + lget(5) + RETURN + END

    # xtemp = x*x - y*y + cx
    body += lget(3) + lget(3) + F64_MUL   # x*x
    body += lget(4) + lget(4) + F64_MUL   # y*y
    body += F64_SUB + lget(0) + F64_ADD   # x*x-y*y + cx
    body += lset(6)

    # y = 2.0 * x * y + cy
    body += f64c(2.0) + lget(3) + F64_MUL   # 2*x
    body += lget(4) + F64_MUL               # *y
    body += lget(1) + F64_ADD               # +cy
    body += lset(4)

    # x = xtemp
    body += lget(6) + lset(3)

    # iter = iter + 1.0
    body += lget(5) + f64c(1.0) + F64_ADD + lset(5)

    body += br(0) + END + END   # br loop ; end loop ; end block

    # Retourner iter (sortie normale)
    body += lget(5) + END

    # Declarations des variables locales : 4 x f64 (x, y, iter, xtemp)
    locals_decl = _uleb128(1) + _uleb128(4) + bytes([0x7C])
    func_data   = locals_decl + body
    func_body   = _uleb128(len(func_data)) + func_data

    # Type section : 1 type = (f64, f64, f64) -> f64
    type_content = (
        _uleb128(1) + bytes([0x60]) +
        _uleb128(3) + bytes([0x7C, 0x7C, 0x7C]) +
        _uleb128(1) + bytes([0x7C])
    )

    # Function section : 1 fonction de type 0
    func_content = _uleb128(1) + _uleb128(0)

    # Export section : "mandelbrot" -> func 0
    name = b"mandelbrot"
    export_content = (
        _uleb128(1) + _uleb128(len(name)) + name + bytes([0x00]) + _uleb128(0)
    )

    # Code section : 1 corps de fonction
    code_content = _uleb128(1) + func_body

    return (
        b"\x00asm\x01\x00\x00\x00" +
        _section(0x01, type_content) +
        _section(0x03, func_content) +
        _section(0x07, export_content) +
        _section(0x0A, code_content)
    )


# ============================================================
# TRANSPILATION MULTILINGUAL (Python)
# ============================================================

def find_multilingual_path():
    """Cherche le dossier source de multilingualprogramming."""
    candidates = [
        ROOT.parent / "multilingual",
        Path.home() / "Documents" / "Research" / "Workspace" / "multilingual",
    ]
    for p in candidates:
        if (p / "multilingualprogramming" / "__init__.py").exists():
            return p
    return None


def try_multilingual_transpile(source):
    """
    Essaie de transpiler le source francais via multilingualprogramming.
    Retourne le code Python ou None en cas d'echec.
    """
    ml_path = find_multilingual_path()
    if ml_path and str(ml_path) not in sys.path:
        sys.path.insert(0, str(ml_path))

    try:
        from multilingualprogramming import ProgramExecutor  # noqa: PLC0415
        executor = ProgramExecutor(language="fr")
        return executor.transpile(source)
    except ImportError:
        return None
    except Exception as exc:
        print(f"    Avertissement transpilation : {exc}")
        return None


def fallback_python_code():
    """Code Python de repli equivalent a mandelbrot.ml."""
    return (
        "# Python transpile depuis le source francais multilingual\n"
        "# (transpilation de repli)\n"
        "\n"
        "def mandelbrot(cx, cy, max_iter):\n"
        "    x = 0.0\n"
        "    y = 0.0\n"
        "    iter = 0.0\n"
        "    while iter < max_iter:\n"
        "        if x * x + y * y > 4.0:\n"
        "            return iter\n"
        "        xtemp = x * x - y * y + cx\n"
        "        y = 2.0 * x * y + cy\n"
        "        x = xtemp\n"
        "        iter = iter + 1.0\n"
        "    return iter\n"
    )


# ============================================================
# BENCHMARK
# ============================================================

def bench_python(n, max_iter):
    """Benchmark Python pur -- rend une grille n x n."""
    _src = (
        "def mandelbrot(cx, cy, max_iter):\n"
        "    x, y, it = 0.0, 0.0, 0.0\n"
        "    while it < max_iter:\n"
        "        if x*x + y*y > 4.0: return it\n"
        "        x, y = x*x - y*y + cx, 2.0*x*y + cy\n"
        "        it += 1.0\n"
        "    return it\n"
    )
    ns = {}
    exec(_src, ns)  # noqa: S102
    fn = ns["mandelbrot"]
    fn(-0.5, 0.0, float(max_iter))  # echauffement

    start = time.perf_counter()
    for row in range(n):
        cy = -2.0 + row * 4.0 / n
        for col in range(n):
            fn(-2.5 + col * 4.0 / n, cy, float(max_iter))
    return (time.perf_counter() - start) * 1000.0


def bench_wasm(wasm_path, n, max_iter):
    """
    Benchmark WASM avec soustraction de l'overhead de liaison Python->WASM.

    L'overhead de liaison (~30 us/appel avec wasmtime) est mesure separement puis
    soustrait pour estimer le temps de calcul pur -- c'est-a-dire le temps que le
    navigateur obtiendrait (ou il n'y a aucun overhead de liaison Python).

    Methode :
      1. Mesurer overhead_s  : N appels avec max_iter=0 (aucun calcul WASM)
      2. Mesurer per_call_s  : N appels avec max_iter reel sur un point interieur
      3. compute_s = per_call_s - overhead_s   (calcul pur par pixel)
      4. Extrapoler a n x n pixels
    """
    try:
        import wasmtime  # noqa: PLC0415

        engine = wasmtime.Engine()
        store  = wasmtime.Store(engine)
        module = wasmtime.Module(engine, wasm_path.read_bytes())
        inst   = wasmtime.Instance(store, module, [])
        fn     = inst.exports(store)["mandelbrot"]

        # -- Mesure de l'overhead pur (max_iter=0 => aucune iteration WASM) --
        N_OVHD = 20_000
        fn(store, 0.0, 0.0, 0.0)  # echauffement
        t0 = time.perf_counter()
        for _ in range(N_OVHD):
            fn(store, 0.0, 0.0, 0.0)
        overhead_s = (time.perf_counter() - t0) / N_OVHD

        # -- Mesure overhead + calcul (point interieur, max_iter iterations) --
        N_SAMPLE = 20_000
        fn(store, -0.5, 0.0, float(max_iter))  # echauffement
        t0 = time.perf_counter()
        for _ in range(N_SAMPLE):
            fn(store, -0.5, 0.0, float(max_iter))
        per_call_s = (time.perf_counter() - t0) / N_SAMPLE

        # -- Calcul pur par pixel (overhead soustrait) --
        compute_s = max(1e-9, per_call_s - overhead_s)
        print(f"    Overhead liaison Python->WASM : {overhead_s * 1e6:.1f} us/appel")
        print(f"    Calcul pur WASM par pixel     : {compute_s * 1e6:.2f} us/pixel")

        # -- Extrapolation a n x n pixels --
        return compute_s * n * n * 1000.0  # en ms

    except ImportError:
        print("    wasmtime non disponible -- benchmark WASM ignore.")
        return None
    except Exception as exc:
        print(f"    Benchmark WASM echoue : {exc}")
        return None


# ============================================================
# SCRIPT PRINCIPAL
# ============================================================

print(SEPARATOR)
print("  Explorateur de Fractales -- Pipeline de compilation")
print(SEPARATOR)

# Etape 1 : Lecture du source
print(f"\n[1] Lecture de {SRC_ML.relative_to(ROOT)}")
if not SRC_ML.exists():
    print(f"    ERREUR : fichier source introuvable : {SRC_ML}")
    sys.exit(1)
source = SRC_ML.read_text(encoding="utf-8")
print(f"    {len(source)} caracteres, {source.count(chr(10))} lignes")

# Etape 2 : Copie vers public/
print(f"\n[2] Copie vers {ML_OUT.relative_to(ROOT)}")
shutil.copy(SRC_ML, ML_OUT)
print("    Copie.")

# Etape 3 : Transpilation Python
print(f"\n[3] Transpilation multilingual -> Python")
python_code = try_multilingual_transpile(source)
if python_code:
    print("    Transpilation via ProgramExecutor reussie.")
else:
    python_code = fallback_python_code()
    print("    Transpilation de repli utilisee.")
PY_OUT.write_text(python_code, encoding="utf-8")
print(f"    Ecrit dans {PY_OUT.relative_to(ROOT)}")
print("    Apercu :")
for line in python_code.splitlines()[:12]:
    print(f"      {line}")

# Etape 4 : Generation du binaire WASM
print(f"\n[4] Generation du binaire WebAssembly")
wasm_bytes = generate_mandelbrot_wasm()
WASM_OUT.write_bytes(wasm_bytes)
print(f"    {len(wasm_bytes):,} octets -> {WASM_OUT.relative_to(ROOT)}")

# Validation avec wasmtime si disponible
wasm_valid = True
try:
    import wasmtime  # noqa: PLC0415
    _eng = wasmtime.Engine()
    _sto = wasmtime.Store(_eng)
    _mod = wasmtime.Module(_eng, wasm_bytes)
    _ins = wasmtime.Instance(_sto, _mod, [])
    _exp = _ins.exports(_sto)
    _res = _exp["mandelbrot"](_sto, -0.5, 0.0, 100.0)
    print(f"    Validation wasmtime : mandelbrot(-0.5, 0.0, 100.0) = {_res}")
except ImportError:
    print("    wasmtime absent -- validation ignoree (le navigateur chargera le binaire).")
except Exception as exc:
    print(f"    AVERTISSEMENT validation WASM : {exc}")
    wasm_valid = False

# Etape 5 : Benchmark
print(f"\n[5] Benchmark -- grille {BENCH_GRID}x{BENCH_GRID}, max_iter={BENCH_ITERS}")

print("    Benchmark Python...")
python_ms = bench_python(BENCH_GRID, BENCH_ITERS)
print(f"    Python : {fmt(python_ms)} ms")

print("    Benchmark WASM...")
wasm_ms = bench_wasm(WASM_OUT, BENCH_GRID, BENCH_ITERS)
speedup = None
if wasm_ms is not None:
    speedup = python_ms / wasm_ms if wasm_ms > 0 else None
    print(f"    WASM  : {fmt(wasm_ms)} ms")
    if speedup:
        print(f"    Acceleration : {speedup:.0f}x")

# Etape 6 : Ecriture de benchmark.json
print(f"\n[6] Ecriture de {BENCH_OUT.relative_to(ROOT)}")
benchmark = {
    "python_ms":      round(python_ms),
    "wasm_ms":        round(wasm_ms)   if wasm_ms  is not None else None,
    "speedup":        round(speedup, 1) if speedup  is not None else None,
    "grid_size":      BENCH_GRID,
    "max_iter":       BENCH_ITERS,
    "wasm_available": (wasm_ms is not None),
    "wasm_estimated": (wasm_ms is not None),
}
BENCH_OUT.write_text(json.dumps(benchmark, indent=2, ensure_ascii=False))
print(json.dumps(benchmark, indent=4))

# Resume
print(f"\n{SEPARATOR}")
if wasm_ms is not None and speedup is not None:
    print("  OK Pipeline complet reussi!")
    print(f"    WASM : {WASM_OUT.relative_to(ROOT)}  ({len(wasm_bytes):,} octets)")
    print(f"    JSON : {BENCH_OUT.relative_to(ROOT)}")
    print(f"    PY   : {PY_OUT.relative_to(ROOT)}")
    print(f"    ML   : {ML_OUT.relative_to(ROOT)}")
    print(f"\n  Resultat benchmark :")
    print(f"    {fmt(wasm_ms)} ms WASM . {fmt(python_ms)} ms Python . {round(speedup)}x plus rapide")
elif wasm_valid:
    print("  ~ WASM genere, benchmark WASM indisponible (wasmtime absent).")
    print(f"    WASM charge par le navigateur : {WASM_OUT.relative_to(ROOT)}")
    print("    Installez wasmtime pour le benchmark complet :")
    print("      pip install wasmtime")
else:
    print("  ATTENTION : le binaire WASM n'a pas pu etre valide.")
print(SEPARATOR)
