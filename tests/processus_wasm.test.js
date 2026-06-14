/**
 * Tests de parité : module géométrie de champ (src/fractales_processus.multi)
 * compilé vers WASM doit reproduire bit-à-bit les réductions JS de l'atelier
 * Croissance (etendueChamp / dimensionsGrille / l'étendue globale de
 * calculerTrajectoire), qui sont désormais le repli JS de ce même WASM.
 *
 * Couvre aussi le chemin de marshalling JS→WASM (liste construite côté hôte),
 * exactement comme construireGeometrieProcessus dans renderer-exploration.js.
 *
 * Run with: node --test tests/processus_wasm.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync as readSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import {
  dimensionsGrille,
  etendueChamp,
  construireImageProcessus,
  calculerTrajectoire,
} from "../public/js/renderer-process.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(ICI, "..", "public", "mandelbrot.wasm");
const wasmBytes = await readFile(WASM_PATH);

const loadManifest = (cle) =>
  JSON.parse(readSync(resolve(ICI, `../public/process/program.${cle}.v1.json`), "utf-8"));

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

// Reproduit construireGeometrieProcessus (renderer-exploration.js) : liste
// multilingue construite côté hôte via __ml_list_alloc (base 8-alignée, écriture
// zéro-copie par vue Float64Array).
function construireGeometrie() {
  const ecrireListe = (valeurs) => {
    const n = valeurs.length;
    const ptr = e.__ml_list_alloc(n);
    new Float64Array(e.memory.buffer, ptr + 8, n).set(valeurs);
    return ptr;
  };
  return {
    etendueChamp(valeurs) {
      e.__ml_reset();
      const r = e.etendue_champ(ecrireListe(valeurs));
      return [r[0], r[1]];
    },
    combinerEtendue(minA, maxA, minB, maxB) {
      const r = e.combiner_etendue(minA, maxA, minB, maxB);
      return [r[0], r[1]];
    },
    dimensionsGrille(xs, ys) {
      e.__ml_reset();
      const px = ecrireListe(xs);
      const py = ecrireListe(ys);
      const r = e.dimensions_grille(px, py);
      return [r[0], r[1]];
    },
  };
}

const geom = construireGeometrie();

describe("fractales_processus : exports & primitives directes", () => {
  test("exports présents", () => {
    assert.equal(typeof e.etendue_champ, "function");
    assert.equal(typeof e.combiner_etendue, "function");
    assert.equal(typeof e.dimensions_grille, "function");
  });

  test("etendue_champ : valeurs, plat, vide", () => {
    assert.deepEqual(geom.etendueChamp([3.5, -2, 7.25, 0, 7.25]), [-2, 7.25]);
    assert.deepEqual(geom.etendueChamp([4, 4, 4]), [4, 5]); // plat -> +1
    assert.deepEqual(geom.etendueChamp([]), [0, 1]); // vide -> (0,1)
  });

  test("dimensions_grille : max+1 par axe", () => {
    assert.deepEqual(geom.dimensionsGrille([0, 1, 2, 3, 2], [0, 0, 1, 1, 4]), [4, 5]);
  });

  test("combiner_etendue : min des min, max des max", () => {
    assert.deepEqual(geom.combinerEtendue(-2, 7, 1, 9), [-2, 9]);
    assert.deepEqual(geom.combinerEtendue(Infinity, -Infinity, 3, 5), [3, 5]);
  });
});

describe("etendueChamp : WASM == repli JS", () => {
  for (const [cle, champ] of [["gray_scott", "v"], ["automate_parite", "vivant"], ["eden", "alive"]]) {
    test(`${cle}/${champ}`, () => {
      const core = loadManifest(cle);
      assert.deepEqual(etendueChamp(core, champ, geom), etendueChamp(core, champ));
    });
  }

  test("champ plat et champ vide", () => {
    const plat = { state: { loci: [{ alive: 0 }, { alive: 0 }] } };
    assert.deepEqual(etendueChamp(plat, "alive", geom), etendueChamp(plat, "alive"));
    const vide = { state: { loci: [{ autre: 1 }] } };
    assert.deepEqual(etendueChamp(vide, "alive", geom), etendueChamp(vide, "alive"));
  });
});

describe("dimensionsGrille : WASM == repli JS (chemin loci)", () => {
  test("topologie absente -> déduction par loci", () => {
    const core = { topology: {}, state: { loci: [{ locus: [0, 0] }, { locus: [3, 1] }, { locus: [2, 4] }] } };
    assert.deepEqual(dimensionsGrille(core, geom), dimensionsGrille(core));
    assert.deepEqual(dimensionsGrille(core, geom), { largeur: 4, hauteur: 5 });
  });

  test("topologie présente -> raccourci JS identique (pas de WASM)", () => {
    const core = loadManifest("automate_parite");
    assert.deepEqual(dimensionsGrille(core, geom), dimensionsGrille(core));
  });
});

describe("construireImageProcessus : buffer RGBA identique avec/sans WASM", () => {
  test("gray_scott image 0", () => {
    const core = loadManifest("gray_scott");
    const a = construireImageProcessus(core, "v", "thermique", null, e.couleur_thermique, geom);
    const b = construireImageProcessus(core, "v", "thermique", null, null, null);
    assert.equal(a.largeur, b.largeur);
    assert.equal(a.hauteur, b.hauteur);
    assert.deepEqual(Array.from(a.rgba), Array.from(b.rgba));
  });
});

describe("calculerTrajectoire : étendue globale identique avec/sans WASM", () => {
  test("gray_scott 20 pas", () => {
    const a = calculerTrajectoire(loadManifest("gray_scott"), 20, "v", geom);
    const b = calculerTrajectoire(loadManifest("gray_scott"), 20, "v", null);
    assert.deepEqual(a.etendue, b.etendue);
    assert.equal(a.trajectoire.length, b.trajectoire.length);
  });
});
