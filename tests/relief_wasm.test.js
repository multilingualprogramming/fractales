/**
 * Tests de parité : normalisation des hauteurs du relief
 * (normaliser_hauteurs dans src/fractales_volumetrique.multi) compilée vers WASM
 * doit reproduire normaliserHauteurs (renderer-relief.js), son repli JS.
 *
 * math.log natif (séries) diffère de Math.log de ~1e-10 — la parité est donc à
 * tolérance (visuelle), pas bit-à-bit comme les rampes couleur. Couvre aussi le
 * marshalling JS→WASM (liste hôte) tel que construireNormaliseurRelief.
 *
 * Run with: node --test tests/relief_wasm.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { normaliserHauteurs } from "../public/js/renderer-relief.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(ICI, "..", "public", "mandelbrot.wasm");
const wasmBytes = await readFile(WASM_PATH);

async function instancier() {
  const importObject = {
    wasi_snapshot_preview1: {
      fd_write: () => 0, fd_read: () => 0, args_sizes_get: () => 0, args_get: () => 0,
      proc_exit: () => {}, environ_sizes_get: () => 0, environ_get: () => 0,
    },
  };
  const { instance } = await WebAssembly.instantiate(wasmBytes, importObject);
  return instance.exports;
}

const e = await instancier();

// Reproduit construireNormaliseurRelief (renderer-exploration.js) : marshalling via
// __ml_list_alloc (base 8-alignée → vues Float64Array zéro-copie dans les deux sens).
function construireNormaliseur() {
  const ecrireListe = (valeurs) => {
    const n = valeurs.length;
    const ptr = e.__ml_list_alloc(n);
    new Float64Array(e.memory.buffer, ptr + 8, n).set(valeurs);
    return ptr;
  };
  const lireListe = (ptr, n) => new Float64Array(e.memory.buffer, ptr + 8, n).slice();
  return (champ, maxIter) => {
    e.__ml_reset();
    const ptr = e.normaliser_hauteurs(ecrireListe(Array.from(champ)), maxIter);
    return lireListe(ptr, champ.length);
  };
}

const normaliseur = construireNormaliseur();
const TOL = 1e-6;

describe("normaliser_hauteurs : export & comportement", () => {
  test("export présent", () => {
    assert.equal(typeof e.normaliser_hauteurs, "function");
  });

  test("points captifs (it >= maxIter) au plancher 0", () => {
    const h = normaliseur(Float64Array.from([256, 300, 1000]), 256);
    assert.equal(h[0], 0);
    assert.equal(h[1], 0);
    assert.equal(h[2], 0);
  });

  test("hauteurs croissantes et bornées [0,1]", () => {
    const h = normaliseur(Float64Array.from([0, 1, 10, 100, 255]), 256);
    for (let i = 1; i < h.length; i += 1) assert.ok(h[i] >= h[i - 1]);
    for (const v of h) assert.ok(v >= 0 && v <= 1);
  });
});

describe("normaliser_hauteurs : WASM ≈ repli JS (tolérance math.log)", () => {
  for (const maxIter of [64, 256, 1000]) {
    test(`maxIter=${maxIter}`, () => {
      const champ = Float64Array.from(
        Array.from({ length: 200 }, (_, k) => (k * 7) % (maxIter + 5)),
      );
      const w = normaliseur(champ, maxIter);
      const js = normaliserHauteurs(champ, maxIter);
      assert.equal(w.length, js.length);
      let maxErr = 0;
      for (let i = 0; i < w.length; i += 1) maxErr = Math.max(maxErr, Math.abs(w[i] - js[i]));
      assert.ok(maxErr < TOL, `max error ${maxErr} >= ${TOL}`);
    });
  }

  test("normaliserHauteurs(champ, maxIter, wasm) passe par le WASM", () => {
    const champ = Float64Array.from([0, 5, 50, 200, 256]);
    const viaWasm = normaliserHauteurs(champ, 256, normaliseur);
    const js = normaliserHauteurs(champ, 256);
    let maxErr = 0;
    for (let i = 0; i < champ.length; i += 1) maxErr = Math.max(maxErr, Math.abs(viaWasm[i] - js[i]));
    assert.ok(maxErr < TOL);
  });
});
