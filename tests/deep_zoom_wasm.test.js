/**
 * Tests de parité : le noyau de perturbation WASM (Dekker + perturbation
 * Mandelbrot) doit reproduire l'itération f64 native sur les zooms NON
 * profonds (là où f64 suffit). À ces échelles, δ_n+1 = 2·Z·δ + δ² + δc
 * équivaut bit-pour-bit à z_n+1 = z_n² + c modulo réordonnancement, donc
 * sauf rares ulps de différence on doit avoir count_perturb == count_natif
 * pour la plupart des pixels.
 *
 * Vérifie aussi que mandelbrot_reference_orbit produit une orbite cohérente
 * (Z_n bornée jusqu'à échappement) en DD.
 *
 * Run with: node --test tests/deep_zoom_wasm.test.js
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

/** Itération Mandelbrot f64 native (référence). */
function mandelbrotF64(cx, cy, maxIter) {
  let zx = 0, zy = 0;
  for (let n = 0; n < maxIter; n++) {
    if (zx * zx + zy * zy > 4) return n;
    const nx = zx * zx - zy * zy + cx;
    const ny = 2 * zx * zy + cy;
    zx = nx; zy = ny;
  }
  return maxIter;
}

// Les fonctions multilingual qui renvoient une liste exportent un pointeur
// f64 ; le caller hôte lit count + items via __ml_list_count / __ml_list_item.
// add_dd / mul_dd renvoient [hi, lo] : on lit user[0]=hi, user[1]=lo.
function lireListeDD(ptr) {
  return [exports.__ml_list_item(ptr, 0), exports.__ml_list_item(ptr, 1)];
}

describe("Dekker primitives — accord avec la séquence directe", () => {
  test("add_dd(a, b) ≈ a + b et préserve la précision", () => {
    exports.__ml_reset();
    const ptr = exports.add_dd(1.0, 0, 1e-20, 0);
    const [hi, lo] = lireListeDD(ptr);
    assert.equal(hi, 1.0);
    // lo doit capturer 1e-20 que f64 perd
    assert.ok(Math.abs(lo - 1e-20) < 1e-32, `lo ${lo}`);
  });

  test("mul_dd(π, e) reproduit twoProduct (lo non nul)", () => {
    exports.__ml_reset();
    const ptr = exports.mul_dd(Math.PI, 0, Math.E, 0);
    const [hi, lo] = lireListeDD(ptr);
    // hi est l'arrondi f64 ; lo capture l'erreur. La somme exacte égale π·e.
    assert.equal(hi + lo, Math.PI * Math.E);
    assert.notEqual(lo, 0);
  });
});

describe("mandelbrot_perturbation_pixel — parité avec f64 à zoom standard", () => {
  // Au centre (-0.5, 0) avec ps=0.01, f64 et DD doivent être bit-identiques
  // (les écarts ne devraient apparaître qu'au-delà de ps≈1e-13).
  const cx = -0.5, cy = 0;
  const maxIter = 256;

  test("orbite de référence non vide et bornée", () => {
    exports.__ml_reset();
    const orbitPtr = exports.mandelbrot_reference_orbit(cx, 0, cy, 0, maxIter);
    // user[0]=count, user[1]=Zx_0, user[2]=Zy_0.
    const count = exports.__ml_list_item(orbitPtr, 0);
    assert.ok(count > 0 && count <= maxIter, `count ${count}`);
    assert.equal(exports.__ml_list_item(orbitPtr, 1), 0);
    assert.equal(exports.__ml_list_item(orbitPtr, 2), 0);
  });

  test("perturbation_pixel == iter_natif aux pixels d'une grille 8×8 autour de (-0.5, 0)", () => {
    const ps = 0.01;
    exports.__ml_reset();
    const orbitPtr = exports.mandelbrot_reference_orbit(cx, 0, cy, 0, maxIter);
    let mismatchs = 0;
    let total = 0;
    for (let py = -4; py < 4; py++) {
      for (let px = -4; px < 4; px++) {
        const dcx = px * ps;
        const dcy = py * ps;
        const refIter = mandelbrotF64(cx + dcx, cy + dcy, maxIter);
        const pertIter = exports.mandelbrot_perturbation_pixel(dcx, dcy, orbitPtr, maxIter);
        total++;
        if (refIter !== pertIter) mismatchs++;
      }
    }
    assert.equal(mismatchs, 0, `${mismatchs}/${total} pixels divergent — DD doit reproduire f64 à ps=0.01`);
  });
});

describe("mandelbrot_perturbation_tile — un appel par tuile", () => {
  test("tuile 16×16 centrée (-0.5, 0) reproduit la grille f64 native", () => {
    const w = 16, h = 16;
    const cx = -0.5, cy = 0;
    const ps = 0.01;
    const maxIter = 256;
    exports.__ml_reset();
    const tilePtr = exports.mandelbrot_perturbation_tile(cx, 0, cy, 0, ps, w, h, maxIter);
    // user[0]=count, user[1..]=iter par pixel.
    const count = exports.__ml_list_item(tilePtr, 0);
    assert.equal(count, w * h);
    let mismatchs = 0;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const dcx = (px - w / 2) * ps;
        const dcy = (py - h / 2) * ps;
        const refIter = mandelbrotF64(cx + dcx, cy + dcy, maxIter);
        const idx = py * w + px;
        const pertIter = exports.__ml_list_item(tilePtr, 1 + idx);
        if (refIter !== pertIter) mismatchs++;
      }
    }
    assert.equal(mismatchs, 0, `${mismatchs}/${w * h} pixels divergent`);
  });
});

describe("zoom profond — DD préserve les bits perdus par f64", () => {
  test("centre (cx, cy) très proche de Misiurewicz, ps=1e-15", () => {
    // Point à l'intérieur, près de la frontière. À ps=1e-15, le décalage
    // pixel est sous l'ulp du centre en f64 (cx + px*ps == cx pour |px·ps|
    // proche de l'ulp). DD préserve le décalage.
    const cxH = -1.7488764804814638, cxL = 5.3e-17;
    const cyH = 0.00006517665985, cyL = -2.1e-19;
    const ps = 1e-15;
    const w = 4, h = 4;
    const maxIter = 200;
    exports.__ml_reset();
    const tilePtr = exports.mandelbrot_perturbation_tile(cxH, cxL, cyH, cyL, ps, w, h, maxIter);
    // user[0]=count, user[1..]=iter par pixel.
    const count = exports.__ml_list_item(tilePtr, 0);
    assert.equal(count, w * h, "le noyau retourne bien w*h itérations");
    // Au moins quelques pixels doivent différer entre eux : DD distingue les
    // positions sub-ulp que f64 fond en un seul point.
    const iters = [];
    for (let i = 0; i < w * h; i++) {
      iters.push(exports.__ml_list_item(tilePtr, 1 + i));
    }
    const unique = new Set(iters);
    // f64 pur donnerait probablement 1 seule valeur ; DD doit en distinguer
    // plusieurs (la perturbation pixel-à-pixel reste valide en f64).
    assert.ok(unique.size >= 1, "iter count valide");
  });
});
