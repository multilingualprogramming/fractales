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

function lireListePlate(ptr) {
  // Layout : [count à +0, item_0 à +8, item_1 à +16, ...]
  const base = Math.trunc(ptr);
  const view = new DataView(exports.memory.buffer);
  const count = view.getFloat64(base, true);
  return { base, view, count };
}

function lireOrbitePoints(ptr) {
  // Les listes multilingual portent une longueur cachée à base+0 (i32→f64).
  // Données utilisateur : sortie[0] à base+8, sortie[1] à base+16, etc.
  // Layout fractales_orbite : sortie[0]=np, sortie[1]=escaped,
  // sortie[2 + 2k]=x_k, sortie[3 + 2k]=y_k.
  const base = Math.trunc(ptr);
  const view = new DataView(exports.memory.buffer);
  const np = view.getFloat64(base + 8, true);
  const escaped = view.getFloat64(base + 16, true);
  const points = [];
  for (let k = 0; k < np; k++) {
    const off = base + 8 + 8 * (2 + 2 * k);
    points.push({
      re: view.getFloat64(off, true),
      im: view.getFloat64(off + 8, true),
    });
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

  test("log_polaire : x suit math.log natif (~1e-6) ; y suit math.atan natif (~5% sur Taylor 7-termes)", () => {
    // math.atan dans multilingual est une série de Taylor à 7 termes sans
    // réduction d'intervalle (cf. wat_generator_core.py:$math_atan) — précis
    // pour |x| ≪ 1, jusqu'à ~3% près pour |x| ≈ 1. Le mode log_polaire reste
    // visuellement correct : la composante x (ln|z|) garde la précision native.
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "log_polaire");
      const wasmX = exports.transforme_log_polaire_x(x, y);
      const wasmY = exports.transforme_log_polaire_y(x, y);
      assert.ok(
        Math.abs(wasmX - refX) < 1e-4,
        `log_polaire_x(${x},${y}): WASM ${wasmX} vs JS ${refX}`,
      );
      // tolérance bornée à 0.05 (~3.7% atan(1)) pour y = atan2(y, x)
      assert.ok(
        Math.abs(wasmY - refY) < 0.05,
        `log_polaire_y(${x},${y}): WASM ${wasmY} vs JS ${refY}`,
      );
    }
  });

  test("inversion : x et y reproduisent exactement la référence", () => {
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "inversion");
      const wasmX = exports.transforme_inversion_x(x, y);
      const wasmY = exports.transforme_inversion_y(x, y);
      assert.ok(Math.abs(wasmX - refX) < 1e-12, `inv_x(${x},${y})`);
      assert.ok(Math.abs(wasmY - refY) < 1e-12, `inv_y(${x},${y})`);
    }
  });

  test("pli (abs) reproduit exactement la référence", () => {
    for (const [x, y] of points) {
      assert.equal(exports.transforme_pli_x(x), Math.abs(x), `pli_x(${x})`);
      assert.equal(exports.transforme_pli_y(y), Math.abs(y), `pli_y(${y})`);
    }
  });

  test("Möbius/Cayley : x et y reproduisent la référence", () => {
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "mobius", "cayley");
      const wasmX = exports.transforme_cayley_x(x, y);
      const wasmY = exports.transforme_cayley_y(x, y);
      assert.ok(Math.abs(wasmX - refX) < 1e-12, `cayley_x(${x},${y})`);
      assert.ok(Math.abs(wasmY - refY) < 1e-12, `cayley_y(${x},${y})`);
    }
  });

  test("Möbius/Joukowski : x et y reproduisent la référence", () => {
    for (const [x, y] of points) {
      const [refX, refY] = jsAppliquerTransforme(x, y, "mobius", "joukowski");
      const wasmX = exports.transforme_joukowski_x(x, y);
      const wasmY = exports.transforme_joukowski_y(x, y);
      assert.ok(Math.abs(wasmX - refX) < 1e-12, `jouk_x(${x},${y})`);
      assert.ok(Math.abs(wasmY - refY) < 1e-12, `jouk_y(${x},${y})`);
    }
  });

  test("singularité (z ≈ 0) renvoie l'entrée inchangée", () => {
    const [x, y] = [1e-15, 0];
    assert.equal(exports.transforme_log_polaire_x(x, y), x);
    assert.equal(exports.transforme_inversion_x(x, y), x);
    assert.equal(exports.transforme_joukowski_x(x, y), x);
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

  test("formatter_fixe_2 reproduit toFixed(2) (à 1 ulp près)", () => {
    for (const v of [-0.5, 0.0, 1.234, -98.765, 1000.0, -0.005]) {
      exports.__ml_reset();
      const ptr = exports.formatter_fixe_2(v);
      const got = lireChaine(ptr);
      const ref = v.toFixed(2);
      assert.ok(presqueEgalAuFormat(got, ref, 2), `formatter_fixe_2(${v}): got "${got}" vs "${ref}"`);
    }
  });

  test("formatter_fixe_5 reproduit toFixed(5)", () => {
    for (const v of [-0.43633, 0.12345, 1.23456, -2.71828]) {
      exports.__ml_reset();
      const ptr = exports.formatter_fixe_5(v);
      const got = lireChaine(ptr);
      const ref = v.toFixed(5);
      assert.ok(presqueEgalAuFormat(got, ref, 5), `formatter_fixe_5(${v}): got "${got}" vs "${ref}"`);
    }
  });

  test("formatter_fixe_6 reproduit toFixed(6) (utilisé pour julia)", () => {
    for (const v of [-0.7, 0.27, 0.123456, -1.000001]) {
      exports.__ml_reset();
      const ptr = exports.formatter_fixe_6(v);
      const got = lireChaine(ptr);
      const ref = v.toFixed(6);
      assert.ok(presqueEgalAuFormat(got, ref, 6), `formatter_fixe_6(${v}): got "${got}" vs "${ref}"`);
    }
  });
});
