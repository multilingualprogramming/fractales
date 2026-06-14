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
