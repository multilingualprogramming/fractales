/**
 * Tests de parité : module de rampes couleur (src/fractales_couleur.multi)
 * compilé vers WASM doit reproduire bit-à-bit les rampes RGB de référence des
 * deux studios (couleurChamp thermique dans renderer-process.js, couleurRelief
 * dans renderer-relief.js), qui sont désormais le repli JS de ce même WASM.
 *
 * Run with: node --test tests/couleur_wasm.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { couleurChamp } from "../public/js/renderer-process.js";
import { couleurRelief } from "../public/js/renderer-relief.js";

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

// Triplet (r, g, b) en tableau ordinaire (les retours multi-valeurs arrivent en Array).
const tripletWasm = (fn, t) => {
  const c = fn(t);
  return [c[0], c[1], c[2]];
};

describe("fractales_couleur : exports présents", () => {
  test("couleur_thermique et couleur_relief sont exportés", () => {
    assert.equal(typeof exports.couleur_thermique, "function");
    assert.equal(typeof exports.couleur_relief, "function");
  });
});

describe("couleur_thermique == couleurChamp(t, 'thermique') JS", () => {
  test("arrêts exacts", () => {
    assert.deepEqual(tripletWasm(exports.couleur_thermique, 0), [12, 16, 48]);
    assert.deepEqual(tripletWasm(exports.couleur_thermique, 1), [222, 60, 75]);
    assert.deepEqual(tripletWasm(exports.couleur_thermique, 0.5), [120, 200, 90]);
  });

  test("clamp hors [0,1]", () => {
    assert.deepEqual(tripletWasm(exports.couleur_thermique, -5), [12, 16, 48]);
    assert.deepEqual(tripletWasm(exports.couleur_thermique, 9), [222, 60, 75]);
  });

  test("parité bit-à-bit avec le repli JS sur une grille fine", () => {
    let mismatches = 0;
    for (let k = 0; k <= 4000; k += 1) {
      const t = k / 4000;
      const js = couleurChamp(t, "thermique");
      const w = tripletWasm(exports.couleur_thermique, t);
      if (js[0] !== w[0] || js[1] !== w[1] || js[2] !== w[2]) mismatches += 1;
    }
    assert.equal(mismatches, 0);
  });

  test("le WASM injecté donne le même résultat que le repli JS via couleurChamp", () => {
    for (const t of [0, 0.123, 0.25, 0.5, 0.777, 1]) {
      const js = couleurChamp(t, "thermique");
      const viaWasm = couleurChamp(t, "thermique", exports.couleur_thermique);
      assert.deepEqual(viaWasm, js);
    }
  });

  test("la palette 'encre' reste un aiguillage JS (non interpolé)", () => {
    // Même avec la rampe WASM fournie, 'encre' renvoie ses deux constantes.
    assert.deepEqual(couleurChamp(1, "encre", exports.couleur_thermique), [24, 26, 42]);
    assert.deepEqual(couleurChamp(0, "encre", exports.couleur_thermique), [238, 240, 245]);
  });
});

// --- Marshalling hôte→WASM des listes f64 (layout multilingue) ---
const memoire = exports.memory;
function ecrireListe(valeurs) {
  const n = valeurs.length;
  const ptr = exports.__ml_list_alloc(n);
  new Float64Array(memoire.buffer, ptr + 8, n).set(valeurs);
  return ptr;
}
function lireListe(ptr, n) {
  return new Float64Array(memoire.buffer, ptr + 8, n).slice();
}

// --- Référence JS : miroir exact de getColorFromRatio + melangerCouleurs ---
const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));
const melangerRef = (a, b, t) => {
  const f = Math.max(0, Math.min(1, t));
  return [clampByte(a[0] + (b[0] - a[0]) * f), clampByte(a[1] + (b[1] - a[1]) * f), clampByte(a[2] + (b[2] - a[2]) * f)];
};
function couleurRef(t, stops, mode, phase, contours) {
  let normalise = Math.max(0, Math.min(0.999999, t));
  if (mode === "histogramme") normalise = Math.pow(normalise, 0.62);
  else if (mode === "phase") normalise = (normalise + phase) % 1.0;
  else if (mode === "potentiel") normalise = 0.5 - 0.5 * Math.cos(normalise * Math.PI);
  const scaled = normalise * (stops.length - 1);
  const lo = Math.floor(scaled) | 0;
  const hi = Math.min(lo + 1, stops.length - 1);
  const frac = scaled - lo;
  let color = melangerRef(stops[lo], stops[hi], frac);
  if (mode === "contours" || contours) {
    const band = Math.abs(((normalise * 36) % 1) - 0.5);
    if (band > 0.42) color = color.map((v) => clampByte(v * 0.58 + 255 * 0.22));
  }
  return color;
}
const CODE_MODE = { standard: 0, histogramme: 1, phase: 2, potentiel: 3, contours: 4 };
const aplatir = (stops) => stops.flatMap((s) => [s[0], s[1], s[2]]);
const STOPS_TEST = [[12, 16, 48], [22, 138, 173], [120, 200, 90], [245, 215, 66], [222, 60, 75]];

function paletteWasm(t, stops, mode, phase, contours) {
  exports.__ml_reset();
  const sp = ecrireListe(aplatir(stops));
  const c = exports.couleur_palette(t, sp, stops.length, CODE_MODE[mode], phase, contours ? 1 : 0);
  return [c[0], c[1], c[2]];
}

describe("fractales_couleur : couleur_palette / colorer_champ exportés", () => {
  test("exports présents", () => {
    assert.equal(typeof exports.couleur_palette, "function");
    assert.equal(typeof exports.colorer_champ, "function");
    assert.equal(typeof exports.__ml_list_alloc, "function");
  });
});

describe("couleur_palette == getColorFromRatio JS (tous modes)", () => {
  for (const mode of ["standard", "histogramme", "phase", "potentiel", "contours"]) {
    test(`mode ${mode} : parité (≤1 octet) sur une grille fine`, () => {
      let maxDiff = 0;
      let aberrants = 0;
      for (let k = 0; k <= 3000; k += 1) {
        const t = k / 3000;
        const ref = couleurRef(t, STOPS_TEST, mode, 0.31, false);
        const w = paletteWasm(t, STOPS_TEST, mode, 0.31, false);
        for (let c = 0; c < 3; c += 1) {
          const d = Math.abs(ref[c] - w[c]);
          if (d > maxDiff) maxDiff = d;
          if (d > 1) aberrants += 1;
        }
      }
      // standard/phase/contours sont bit-exacts ; histogramme/potentiel ≤1 octet.
      if (mode === "standard" || mode === "phase") assert.equal(maxDiff, 0);
      assert.equal(aberrants, 0, `${aberrants} écarts > 1 octet en mode ${mode} (max ${maxDiff})`);
    });
  }

  test("drapeau contours (orthogonal au mode standard) bit-exact", () => {
    for (let k = 0; k <= 1500; k += 1) {
      const t = k / 1500;
      assert.deepEqual(paletteWasm(t, STOPS_TEST, "standard", 0, true), couleurRef(t, STOPS_TEST, "standard", 0, true));
    }
  });

  test("palette à 2 arrêts (cas limite n_stops minimal)", () => {
    const deux = [[0, 0, 0], [255, 255, 255]];
    for (const t of [0, 0.25, 0.5, 0.75, 0.999]) {
      assert.deepEqual(paletteWasm(t, deux, "standard", 0, false), couleurRef(t, deux, "standard", 0, false));
    }
  });
});

describe("colorer_champ : coloration par lot == couleur_palette point par point", () => {
  function champWasm(ratios, interieur, stops, mode, phase, contours) {
    exports.__ml_reset();
    const sp = ecrireListe(aplatir(stops));
    const rp = ecrireListe(Float64Array.from(ratios));
    const ptr = exports.colorer_champ(rp, sp, interieur[0], interieur[1], interieur[2], CODE_MODE[mode], phase, contours ? 1 : 0);
    return lireListe(ptr, ratios.length * 3);
  }

  test("ratios escapés + sentinelle intérieur (< 0)", () => {
    const interieur = [255, 245, 180];
    const ratios = [];
    for (let k = 0; k < 600; k += 1) ratios.push(k % 37 === 0 ? -1 : k / 600);
    const out = champWasm(ratios, interieur, STOPS_TEST, "standard", 0, false);
    for (let i = 0; i < ratios.length; i += 1) {
      const ref = ratios[i] < 0 ? interieur : couleurRef(ratios[i], STOPS_TEST, "standard", 0, false);
      assert.deepEqual([out[i * 3], out[i * 3 + 1], out[i * 3 + 2]], ref);
    }
  });

  test("le lot == le point à point (mode potentiel, ≤1 octet)", () => {
    const interieur = [10, 10, 10];
    const ratios = [];
    for (let k = 0; k < 400; k += 1) ratios.push(k / 400);
    const out = champWasm(ratios, interieur, STOPS_TEST, "potentiel", 0.2, true);
    let maxDiff = 0;
    for (let i = 0; i < ratios.length; i += 1) {
      const pt = paletteWasm(ratios[i], STOPS_TEST, "potentiel", 0.2, true);
      for (let c = 0; c < 3; c += 1) maxDiff = Math.max(maxDiff, Math.abs(pt[c] - out[i * 3 + c]));
    }
    assert.equal(maxDiff, 0, "le lot doit reproduire exactement couleur_palette");
  });
});

describe("couleur_relief == couleurRelief(t) JS", () => {
  test("arrêts exacts", () => {
    assert.deepEqual(tripletWasm(exports.couleur_relief, 0), [18, 24, 64]);
    assert.deepEqual(tripletWasm(exports.couleur_relief, 1), [240, 206, 110]);
  });

  test("parité bit-à-bit avec le repli JS sur une grille fine", () => {
    let mismatches = 0;
    for (let k = 0; k <= 4000; k += 1) {
      const t = k / 4000;
      const js = couleurRelief(t);
      const w = tripletWasm(exports.couleur_relief, t);
      if (js[0] !== w[0] || js[1] !== w[1] || js[2] !== w[2]) mismatches += 1;
    }
    assert.equal(mismatches, 0);
  });

  test("le WASM injecté donne le même résultat que le repli JS via couleurRelief", () => {
    for (const t of [0, 0.2, 0.45, 0.6, 0.9, 1]) {
      assert.deepEqual(couleurRelief(t, exports.couleur_relief), couleurRelief(t));
    }
  });
});
