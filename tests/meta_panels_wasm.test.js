/**
 * Tests de parité : modules « Autres panneaux Meta » (transforms, orbite,
 * partage) compilés vers WASM (src/fractales_transforms|orbite|partage.multi)
 * doivent reproduire les références JavaScript des renderers correspondants.
 *
 * Run with: node --test tests/meta_panels_wasm.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(ICI, "..", "public", "mandelbrot.wasm");

const wasmBytes = await readFile(WASM_PATH);

async function instancier() {
  const importObject = {
    wasi_snapshot_preview1: {
      fd_write: () => 0,
      fd_read: () => 0,
      args_sizes_get: () => 0,
      args_get: () => 0,
      proc_exit: () => {},
      environ_sizes_get: () => 0,
      environ_get: () => 0,
    },
  };
  const { instance } = await WebAssembly.instantiate(wasmBytes, importObject);
  return instance.exports;
}

const exports = await instancier();

// ============================================================================
// Helpers
// ============================================================================

function lireOrbitePoints(ptr) {
  // Layout fractales_orbite : user[0]=np, user[1]=escaped, user[2+2k]=x_k, user[3+2k]=y_k.
  const item = (i) => exports.__ml_list_item(ptr, i);
  const np = item(0);
  const escaped = item(1);
  const points = [];
  for (let k = 0; k < np; k++) {
    points.push({ re: item(2 + 2 * k), im: item(2 + 2 * k + 1) });
  }
  return { np, escaped: escaped > 0.5, points };
}

function lireChaine(ptr) {
  const base = Math.trunc(ptr);
  const len = exports.__ml_str_len ? exports.__ml_str_len() : 0;
  if (len === 0) return "";
  return new TextDecoder("utf-8").decode(
    new Uint8Array(exports.memory.buffer, base, len),
  );
}

// Réimplémentations JS de référence (extraites des renderers)
function jsAppliquerTransforme(x, y, ct, mp = "inversion_cercle") {
  if (!ct || ct === "aucune") return [x, y];
  if (ct === "log_polaire") {
    const r2 = x * x + y * y;
    if (r2 < 1e-20) return [x, y];
    return [0.5 * Math.log(r2), Math.atan2(y, x)];
  }
  if (ct === "inversion") {
    const r2 = x * x + y * y;
    if (r2 < 1e-20) return [x, y];
    return [x / r2, -y / r2];
  }
  if (ct === "pli_x") return [Math.abs(x), y];
  if (ct === "pli_y") return [x, Math.abs(y)];
  if (ct === "pli_xy") return [Math.abs(x), Math.abs(y)];
  if (ct === "mobius") {
    if (mp === "inversion_cercle") {
      const r2 = x * x + y * y;
      if (r2 < 1e-20) return [x, y];
      return [x / r2, -y / r2];
    }
    if (mp === "cayley") {
      const denRe = x + 1, denIm = y;
      const den2 = denRe * denRe + denIm * denIm;
      if (den2 < 1e-20) return [x, y];
      return [
        ((x - 1) * denRe + y * denIm) / den2,
        (y * denRe - (x - 1) * denIm) / den2,
      ];
    }
    if (mp === "joukowski") {
      const r2 = x * x + y * y;
      if (r2 < 1e-20) return [x, y];
      return [(x + x / r2) * 0.5, (y - y / r2) * 0.5];
    }
  }
  return [x, y];
}

// ============================================================================
// Transformations du plan (◈)
// ============================================================================

describe("fractales_transforms — parité par-rapport au JS de référence", () => {
  const points = [
    [0.5, 0.5],
    [-1.2, 0.3],
    [0.0001, 0.0001],
    [3.0, -2.5],
    [-0.7, 0.9],
    [1e-12, 1e-12], // bordure singularité
  ];

  test("log_polaire : x suit math.log natif (~1e-6) ; y suit math.atan2 natif (~1e-10)", () => {
    // Depuis 2026-05-23 : math.atan a une double réduction d'intervalle
    // (1/x ET (x−1)/(x+1)) + 12 termes Taylor — précision ~1e-10. log_polaire
    // est désormais quasi bit-exact avec JS Math.atan2.
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "log_polaire");
      const [wasmX, wasmY] = exports.transforme_log_polaire(x, y);
      assert.ok(
        Math.abs(wasmX - refX) < 1e-4,
        `log_polaire_x(${x},${y}): WASM ${wasmX} vs JS ${refX}`,
      );
      assert.ok(
        Math.abs(wasmY - refY) < 1e-9,
        `log_polaire_y(${x},${y}): WASM ${wasmY} vs JS ${refY}`,
      );
    }
  });

  test("inversion : x et y reproduisent exactement la référence", () => {
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "inversion");
      const [wasmX, wasmY] = exports.transforme_inversion(x, y);
      assert.ok(Math.abs(wasmX - refX) < 1e-12, `inv_x(${x},${y})`);
      assert.ok(Math.abs(wasmY - refY) < 1e-12, `inv_y(${x},${y})`);
    }
  });

  test("pli_xy (abs sur les deux composantes)", () => {
    for (const [x, y] of points) {
      const [wasmX, wasmY] = exports.transforme_pli_xy(x, y);
      assert.equal(wasmX, Math.abs(x));
      assert.equal(wasmY, Math.abs(y));
    }
  });

  test("Möbius/Cayley : x et y reproduisent la référence", () => {
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "mobius", "cayley");
      const [wasmX, wasmY] = exports.transforme_cayley(x, y);
      assert.ok(Math.abs(wasmX - refX) < 1e-12, `cayley_x(${x},${y})`);
      assert.ok(Math.abs(wasmY - refY) < 1e-12, `cayley_y(${x},${y})`);
    }
  });

  test("Möbius/Joukowski : x et y reproduisent la référence", () => {
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "mobius", "joukowski");
      const [wasmX, wasmY] = exports.transforme_joukowski(x, y);
      assert.ok(Math.abs(wasmX - refX) < 1e-12, `jouk_x(${x},${y})`);
      assert.ok(Math.abs(wasmY - refY) < 1e-12, `jouk_y(${x},${y})`);
    }
  });

  test("singularité (z ≈ 0) renvoie l'entrée inchangée", () => {
    const [x, y] = [1e-15, 0];
    assert.deepEqual(exports.transforme_log_polaire(x, y), [x, y]);
    assert.deepEqual(exports.transforme_inversion(x, y), [x, y]);
    assert.deepEqual(exports.transforme_joukowski(x, y), [x, y]);
  });
});

// ============================================================================
// Capture d'orbites (☷)
// ============================================================================

// Code de famille (cf. fractales_orbite.multi)
const CODE_MANDELBROT = 0;
const CODE_JULIA = 1;
const CODE_BURNING_SHIP = 2;
const CODE_BURNING_JULIA = 3;
const CODE_TRICORN = 4;
const CODE_CELTIC = 5;
const CODE_PERP_CELTIC = 6;
const CODE_BUFFALO = 7;
const CODE_HEART = 8;
const CODE_PERP_BURNING_SHIP = 9;
const CODE_PERP_MANDELBROT = 10;
const CODE_DUCK = 11;

function jsOrbiteMandelbrotFamille(code, pRe, pIm, cReJulia, cImJulia, maxIter) {
  const max = Math.min(320, Math.max(32, maxIter | 0));
  const points = [];
  const estJulia = code === CODE_JULIA || code === CODE_BURNING_JULIA;
  let x = estJulia ? pRe : 0.0;
  let y = estJulia ? pIm : 0.0;
  const cx = estJulia ? cReJulia : pRe;
  const cy = estJulia ? cImJulia : pIm;
  const isBurning = code === CODE_BURNING_SHIP || code === CODE_BURNING_JULIA;
  const isBuffalo = code === CODE_BUFFALO;
  const isCeltic = code === CODE_CELTIC || code === CODE_PERP_CELTIC;
  const isHeart = code === CODE_HEART;
  const isTricorn = code === CODE_TRICORN;
  const isDuck = code === CODE_DUCK;
  const isPerpY = code === CODE_PERP_BURNING_SHIP
    || code === CODE_PERP_MANDELBROT
    || code === CODE_PERP_CELTIC;
  let escaped = false;
  for (let i = 0; i < max; i++) {
    points.push({ re: x, im: y });
    const ax = (isBurning || isBuffalo) ? Math.abs(x) : x;
    const ay = isBurning ? Math.abs(y) : y;
    let nx, ny;
    if (isCeltic) {
      nx = Math.abs(ax * ax - ay * ay) + cx;
      ny = 2 * ax * ay + cy;
    } else if (isHeart) {
      nx = ax * ax - ay * ay + cx;
      ny = Math.abs(2 * ax * ay) + cy;
    } else if (isDuck) {
      nx = ax * ax - ay * ay + Math.abs(cx);
      ny = 2 * ax * ay + cy;
    } else {
      nx = ax * ax - ay * ay + cx;
      ny = 2 * ax * ay + cy;
    }
    x = nx;
    y = isTricorn ? -ny : (isPerpY ? Math.abs(ny) : ny);
    if (x * x + y * y > 16) { escaped = true; break; }
  }
  return { points, escaped };
}

describe("fractales_orbite — parité Mandelbrot famille", () => {
  const cases = [
    { code: CODE_MANDELBROT, p: [-0.5, 0.0], julia: [0, 0], maxIter: 128, label: "mandelbrot, point intérieur" },
    { code: CODE_MANDELBROT, p: [0.3, 0.0], julia: [0, 0], maxIter: 64, label: "mandelbrot, point qui s'échappe" },
    { code: CODE_JULIA, p: [0.1, 0.1], julia: [-0.7, 0.27], maxIter: 80, label: "julia c=-0.7+0.27i" },
    { code: CODE_BURNING_SHIP, p: [-1.7, -0.04], julia: [0, 0], maxIter: 64, label: "burning_ship cœur" },
    { code: CODE_BURNING_JULIA, p: [0.2, 0.1], julia: [-0.6, 0.0], maxIter: 64, label: "burning_julia" },
    { code: CODE_TRICORN, p: [-0.2, 0.6], julia: [0, 0], maxIter: 80, label: "tricorn" },
    { code: CODE_CELTIC, p: [-1.1, 0.0], julia: [0, 0], maxIter: 64, label: "celtic" },
    { code: CODE_PERP_CELTIC, p: [-1.1, 0.2], julia: [0, 0], maxIter: 64, label: "perpendicular_celtic" },
    { code: CODE_BUFFALO, p: [-0.5, 0.5], julia: [0, 0], maxIter: 64, label: "buffalo" },
    { code: CODE_HEART, p: [-0.7, 0.0], julia: [0, 0], maxIter: 80, label: "heart" },
    { code: CODE_PERP_BURNING_SHIP, p: [-1.6, 0.0], julia: [0, 0], maxIter: 64, label: "perp_burning_ship" },
    { code: CODE_PERP_MANDELBROT, p: [-0.5, 0.3], julia: [0, 0], maxIter: 80, label: "perp_mandelbrot" },
    { code: CODE_DUCK, p: [-0.5, 0.5], julia: [0, 0], maxIter: 64, label: "duck" },
  ];

  for (const cas of cases) {
    test(`orbite ${cas.label} : np et points reproduisent la référence`, () => {
      exports.__ml_reset();
      const ptr = exports.orbite_mandelbrot_famille(
        cas.code, cas.p[0], cas.p[1], cas.julia[0], cas.julia[1], cas.maxIter,
      );
      const { np, escaped, points } = lireOrbitePoints(ptr);
      const ref = jsOrbiteMandelbrotFamille(
        cas.code, cas.p[0], cas.p[1], cas.julia[0], cas.julia[1], cas.maxIter,
      );
      assert.equal(np, ref.points.length, `np mismatch (${cas.label})`);
      assert.equal(escaped, ref.escaped, `escaped mismatch (${cas.label})`);
      for (let k = 0; k < ref.points.length; k++) {
        assert.ok(
          Math.abs(points[k].re - ref.points[k].re) < 1e-12,
          `pt[${k}].re mismatch ${points[k].re} vs ${ref.points[k].re}`,
        );
        assert.ok(
          Math.abs(points[k].im - ref.points[k].im) < 1e-12,
          `pt[${k}].im mismatch ${points[k].im} vs ${ref.points[k].im}`,
        );
      }
    });
  }
});

describe("fractales_orbite — Newton", () => {
  test("converge vers une racine de l'unité (z³ = 1)", () => {
    exports.__ml_reset();
    const ptr = exports.orbite_newton(0.5, 0.6, 100);
    const { np, escaped, points } = lireOrbitePoints(ptr);
    assert.ok(np >= 1 && np <= 100, `np raisonnable : ${np}`);
    assert.equal(escaped, false, "Newton ne s'échappe normalement pas");
    const last = points[points.length - 1];
    // doit être proche d'une racine ou de la dernière itération non convergée
    const roots = [[1, 0], [-0.5, 0.8660254], [-0.5, -0.8660254]];
    const dMin = Math.min(
      ...roots.map(([rx, ry]) => (last.re - rx) ** 2 + (last.im - ry) ** 2),
    );
    assert.ok(dMin < 1e-2, `dernier point proche d'une racine : d=${Math.sqrt(dMin)}`);
  });
});

describe("fractales_orbite — Phoenix", () => {
  test("avec c=-0.5+0i, garde z bornée (Phoenix attire)", () => {
    exports.__ml_reset();
    const ptr = exports.orbite_phoenix(0.1, 0.0, -0.5, 0.0, 80);
    const { np, escaped, points } = lireOrbitePoints(ptr);
    assert.equal(np, 80);
    assert.equal(escaped, false);
    // Référence JS Phoenix
    let x = 0.1, y = 0.0, px = 0, py = 0;
    for (let i = 0; i < 80; i++) {
      assert.ok(Math.abs(points[i].re - x) < 1e-12, `phoenix pt[${i}].re`);
      assert.ok(Math.abs(points[i].im - y) < 1e-12, `phoenix pt[${i}].im`);
      const nx = x * x - y * y + (-0.5) + 0.5667 * px;
      const ny = 2 * x * y + 0.0 + 0.5667 * py;
      px = x; py = y; x = nx; y = ny;
    }
  });
});

// ============================================================================
// Partage (validation + formatage)
// ============================================================================

describe("fractales_partage — validation numérique", () => {
  test("valider_centre accepte les flottants finis, rejette NaN/inf", () => {
    assert.equal(exports.valider_centre(-0.5), 1.0);
    assert.equal(exports.valider_centre(0.0), 1.0);
    assert.equal(exports.valider_centre(1e10), 1.0);
    assert.equal(exports.valider_centre(NaN), 0.0);
    assert.equal(exports.valider_centre(Infinity), 0.0);
    assert.equal(exports.valider_centre(-Infinity), 0.0);
  });

  test("valider_pixelsize n'accepte que les valeurs > 0 finies", () => {
    assert.equal(exports.valider_pixelsize(1e-15), 1.0);
    assert.equal(exports.valider_pixelsize(0.004), 1.0);
    assert.equal(exports.valider_pixelsize(0.0), 0.0);
    assert.equal(exports.valider_pixelsize(-0.5), 0.0);
    assert.equal(exports.valider_pixelsize(NaN), 0.0);
    assert.equal(exports.valider_pixelsize(Infinity), 0.0);
  });

  test("valider_max_iter exige entier positif", () => {
    assert.equal(exports.valider_max_iter(1), 1.0);
    assert.equal(exports.valider_max_iter(256), 1.0);
    assert.equal(exports.valider_max_iter(0), 0.0);
    assert.equal(exports.valider_max_iter(-5), 0.0);
    assert.equal(exports.valider_max_iter(3.5), 0.0);
    assert.equal(exports.valider_max_iter(NaN), 0.0);
  });

  test("valider_etat_complet : conjonction", () => {
    assert.equal(exports.valider_etat_complet(-0.5, 0.0, 0.004, 256, 0.0), 1.0);
    assert.equal(exports.valider_etat_complet(NaN, 0.0, 0.004, 256, 0.0), 0.0);
    assert.equal(exports.valider_etat_complet(-0.5, 0.0, -0.004, 256, 0.0), 0.0);
    assert.equal(exports.valider_etat_complet(-0.5, 0.0, 0.004, 0, 0.0), 0.0);
  });
});

describe("fractales_partage — formatage fixe", () => {
  // Le backend WAT utilise round half-to-even (banker's rounding) pour `.Nf`.
  // JS .toFixed() utilise round half-away-from-zero. Pour les valeurs qui
  // tombent EXACTEMENT à mi-chemin (ex. -0.005 → "-0.00" en WAT vs "-0.01"
  // en JS), les sorties diffèrent d'1 ULP du dernier chiffre — tolérance =
  // 1 ULP de la précision du format (0.5 × 10^-N).
  function presqueEgalAuFormat(s1, s2, decimales) {
    if (s1 === s2) return true;
    // Deux arrondis valides du même f64 peuvent différer d'1 ULP entier du
    // format (ex. -0.005 → "-0.00" ou "-0.01" selon le tie-break).
    const ulp = Math.pow(10, -decimales) + 1e-12;
    return Math.abs(parseFloat(s1) - parseFloat(s2)) <= ulp;
  }

  // Depuis multilingual B4 (2026-05-23) : un seul formatter_fixe(v, n) gère
  // tous les N (clampé à [0, 9]) — plus de formatter_fixe_2/3/5/6.
  test("formatter_fixe(v, n) reproduit toFixed(n) (à 1 ulp près)", () => {
    const cases = [
      { v: -0.5, n: 2 }, { v: 0.0, n: 2 }, { v: 1.234, n: 2 }, { v: -98.765, n: 2 },
      { v: -0.43633, n: 5 }, { v: 0.12345, n: 5 }, { v: 1.23456, n: 5 },
      { v: -0.7, n: 6 }, { v: 0.27, n: 6 }, { v: 0.123456, n: 6 },
      { v: 3.14159, n: 3 },
    ];
    for (const { v, n } of cases) {
      exports.__ml_reset();
      const ptr = exports.formatter_fixe(v, n);
      const got = lireChaine(ptr);
      const ref = v.toFixed(n);
      assert.ok(presqueEgalAuFormat(got, ref, n), `formatter_fixe(${v}, ${n}): got "${got}" vs "${ref}"`);
    }
  });

  test("formatter_exponentiel_8 (pixelSize / lo) — round-trip parseFloat fidèle", () => {
    // Le WAT n'a pas de format `.Ne` natif ; fractales_partage.multi le
    // construit via math.log10 + pow(10, e) + .Nf (cf. la fix de pow_f64
    // dans multilingual, 2026-05-23). Round-trip exigé pour la précision
    // sub-f64 des liens de partage en zoom profond.
    for (const v of [1.5e-13, 5e-16, 1e10, 3.141592, -0.0001, 9.99e8, 0.0, -1e-15, 1e-300]) {
      exports.__ml_reset();
      const ptr = exports.formatter_exponentiel_8(v);
      const got = lireChaine(ptr);
      if (v === 0) {
        assert.equal(got, "0e0");
        continue;
      }
      const parsed = parseFloat(got);
      // tolérance relative 1e-7 (mantisse à 8 décimales = ~8 chiffres sig)
      assert.ok(
        Math.abs(parsed / v - 1) < 1e-7,
        `formatter_exponentiel_8(${v}): got "${got}" → parseFloat=${parsed}`,
      );
    }
  });

  test("formatter_exponentiel_9 (xlo/ylo deep zoom) — 9 décimales", () => {
    for (const v of [1.5e-13, -2.7e-15, 9.876543210e-14, 1.0e-200]) {
      exports.__ml_reset();
      const ptr = exports.formatter_exponentiel_9(v);
      const got = lireChaine(ptr);
      const parsed = parseFloat(got);
      assert.ok(
        Math.abs(parsed / v - 1) < 1e-8,
        `formatter_exponentiel_9(${v}): got "${got}" → parseFloat=${parsed}`,
      );
    }
  });
});

// ============================================================================
// Hasard L-système (FNV-1a + mulberry32) — bit-exact avec JS
// ============================================================================

function jsFnvSeed(seed) {
  const text = String(seed ?? "1").trim() || "1";
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
function jsMulberry32Step(state) {
  state = (state + 0x6d2b79f5) | 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [state, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

function ecrireChaineLP(s) {
  const bytes = new TextEncoder().encode(s);
  const ptr = exports.__ml_str_alloc(bytes.length);
  new Uint8Array(exports.memory.buffer, ptr, bytes.length).set(bytes);
  return ptr;
}

function lireListeF64(ptr, n) {
  const out = [];
  for (let k = 0; k < n; k++) out.push(exports.__ml_list_item(ptr, k));
  return out;
}

// ============================================================================
// Repères mathématiques (period detection + nucleus refinement)
// ============================================================================

// ============================================================================
// SIMD (v128 f64x2) Mandelbrot pair
// ============================================================================

describe("fractales_simd — mandelbrot_simd_pair", () => {
  function jsScalar(cx, cy, maxIter) {
    let zx = 0, zy = 0;
    for (let i = 0; i < maxIter; i++) {
      if (zx * zx + zy * zy > 4) return i;
      const t = zx * zx - zy * zy + cx;
      zy = 2 * zx * zy + cy;
      zx = t;
    }
    return maxIter;
  }
  function readPair(ptr) {
    return [exports.__ml_list_item(ptr, 0), exports.__ml_list_item(ptr, 1)];
  }
  test("SIMD donne les mêmes itérations que le scalaire à ±1 près", () => {
    const cases = [
      [-0.5, 0.0, 0.3, 0.0],
      [-1.0, 0.0, -1.5, 0.0],
      [-0.122561, 0.744861, 0.25, 0.25],
      [-2.0, 0.0, 1.5, -0.5],
      [-0.74, 0.12, -0.74, 0.13],   // 2 pixels adjacents
    ];
    for (const [cx0, cy0, cx1, cy1] of cases) {
      exports.__ml_reset();
      const ptr = exports.mandelbrot_simd_pair(cx0, cy0, cx1, cy1, 256);
      const [s0, s1] = readPair(ptr);
      const sc0 = jsScalar(cx0, cy0, 256);
      const sc1 = jsScalar(cx1, cy1, 256);
      assert.ok(Math.abs(s0 - sc0) <= 1, `lane0 c=(${cx0},${cy0}) SIMD=${s0} JS=${sc0}`);
      assert.ok(Math.abs(s1 - sc1) <= 1, `lane1 c=(${cx1},${cy1}) SIMD=${s1} JS=${sc1}`);
    }
  });
});

describe("fractales_landmark — détection de période et raffinage de noyau", () => {
  test("period 1 (origine, cardioïde principale)", () => {
    assert.equal(exports.detecter_periode_mandelbrot(0, 0, 1024, 1e-10), 1);
  });
  test("period 2 (c = -1, bulbe à gauche)", () => {
    assert.equal(exports.detecter_periode_mandelbrot(-1, 0, 1024, 1e-10), 2);
  });
  test("period 3 (c ≈ -1.7549)", () => {
    assert.equal(exports.detecter_periode_mandelbrot(-1.7548776, 0, 1024, 1e-8), 3);
  });
  test("period 4 (c ≈ -1.3107)", () => {
    assert.equal(exports.detecter_periode_mandelbrot(-1.3107026413366, 0, 1024, 1e-8), 4);
  });
  test("point qui s'échappe → période 0", () => {
    assert.equal(exports.detecter_periode_mandelbrot(0.3, 0, 1024, 1e-10), 0);
  });

  test("Newton converge vers le noyau de période 2 (c = -1)", () => {
    const [nx, ny] = exports.affiner_nucleus(-1.01, 0.01, 2, 30);
    assert.ok(Math.abs(nx - (-1)) < 1e-12, `nx ${nx}`);
    assert.ok(Math.abs(ny) < 1e-12, `ny ${ny}`);
  });
  test("Newton converge vers le noyau de période 3 (c = -1.7548776662466927)", () => {
    const [nx, ny] = exports.affiner_nucleus(-1.76, 0.01, 3, 30);
    assert.ok(Math.abs(nx - (-1.7548776662466927)) < 1e-12, `nx ${nx}`);
    assert.ok(Math.abs(ny) < 1e-12, `ny ${ny}`);
  });

  test("DE renvoie 0 à l'intérieur, > 0 à l'extérieur", () => {
    assert.equal(exports.distance_estimation_mandelbrot(0, 0, 256), 0);
    assert.ok(exports.distance_estimation_mandelbrot(0.3, 0, 256) > 0);
    assert.ok(exports.distance_estimation_mandelbrot(-2.5, 0, 256) > 0.5);
  });
});

describe("fractales_hasard — parité bit-exacte avec JS", () => {
  const seeds = ["1", "42", "hello", "fractale", "plante-13", "0"];

  test("hash_fnv32_seed reproduit exactement FNV-1a JS", () => {
    for (const seed of seeds) {
      exports.__ml_reset();
      const ptr = ecrireChaineLP(seed);
      const wasm = exports.hash_fnv32_seed(ptr);
      const wasmU32 = wasm < 0 ? wasm + 4294967296 : wasm;
      const js = jsFnvSeed(seed);
      assert.equal(wasmU32, js, `FNV("${seed}"): WASM ${wasmU32} vs JS ${js}`);
    }
  });

  test("prochain_hash_mulberry32 reproduit mulberry32 sur 20 itérations", () => {
    exports.__ml_reset();
    const ptr = ecrireChaineLP("plante-13");
    let wasmState = exports.hash_fnv32_seed(ptr);
    let jsState = jsFnvSeed("plante-13");
    // Hash WASM est en vue signée ; JS commence en uint32. Convertit pour le test.
    jsState |= 0;  // signed i32 view of jsState (since JS uses uint32 but Math.imul/+ treat as i32)
    // Note: en JS, state += 0x6d2b79f5 produit un i32 (le |0 dans mulberry32).
    // L'initial state JS est uint32 — la 1ʳᵉ addition fait `+= 0x6d2b79f5 → wraparound i32`.
    // wasmState est déjà i32-signé après hash_fnv32_seed. Pour rester en parité,
    // on suit mulberry32 JS qui ne signe l'état qu'au moment du `+ k | 0`.
    // Donc on rebascule wasmState à uint32 pour l'aligner avec JS:
    jsState = jsFnvSeed("plante-13");  // uint32 départ
    let wasmStateU32 = wasmState < 0 ? wasmState + 4294967296 : wasmState;
    assert.equal(wasmStateU32, jsState, "états initiaux concordent");

    for (let step = 0; step < 20; step++) {
      const out = exports.prochain_hash_mulberry32(wasmState);
      const [newWasmState, wasmDraw] = lireListeF64(out, 2);
      wasmState = newWasmState;
      const [newJsState, jsDraw] = jsMulberry32Step(jsState);
      jsState = newJsState;
      assert.ok(
        Math.abs(wasmDraw - jsDraw) < 1e-15,
        `step ${step}: WASM ${wasmDraw} vs JS ${jsDraw}`,
      );
    }
  });
});
