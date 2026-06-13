/**
 * Unit tests for the Croissance process-studio pure helpers (no DOM).
 *
 * The DOM controller (creerStudioProcessus) is exercised in the browser; these
 * tests pin the pure projection/colour helpers and the trajectory computation,
 * which drive the rendering. Run with: node --test tests/process_studio.test.js
 *
 * Manifests are build artifacts (gitignored); regenerate them with
 *   MULTILINGUAL_DEV_PATH=/path/to/multilingual python3 scripts/build_processes.py
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  CATALOGUE_PROCESSUS,
  trouverProcessus,
  dimensionsGrille,
  etendueChamp,
  couleurChamp,
  construireImageProcessus,
  calculerTrajectoire,
  projeterPointVolumetrique,
} from "../public/js/renderer-process.js";

const here = dirname(fileURLToPath(import.meta.url));
const loadManifest = (cle) =>
  JSON.parse(readFileSync(resolve(here, `../public/process/program.${cle}.v1.json`), "utf-8"));

describe("process studio catalogue", () => {
  test("every catalogue entry is complete and resolvable", () => {
    assert.ok(CATALOGUE_PROCESSUS.length >= 3);
    for (const p of CATALOGUE_PROCESSUS) {
      for (const key of ["cle", "nom", "fichier", "champ", "palette", "pasDefaut", "pasMax"]) {
        assert.ok(p[key] !== undefined, `${p.cle} missing ${key}`);
      }
      assert.equal(trouverProcessus(p.cle), p);
      assert.ok(p.pasMax >= p.pasDefaut);
    }
  });
});

describe("grid + field helpers", () => {
  test("dimensionsGrille reads the lattice topology extent", () => {
    const core = loadManifest("automate_parite");
    assert.deepEqual(dimensionsGrille(core), { largeur: 65, hauteur: 65 });
  });

  test("dimensionsGrille falls back to locus coordinates", () => {
    const core = { topology: {}, state: { loci: [{ locus: [0, 0] }, { locus: [3, 1] }] } };
    assert.deepEqual(dimensionsGrille(core), { largeur: 4, hauteur: 2 });
  });

  test("etendueChamp guards a flat field against zero range", () => {
    const core = { state: { loci: [{ alive: 0 }, { alive: 0 }] } };
    const e = etendueChamp(core, "alive");
    assert.notEqual(e.min, e.max);
  });
});

describe("colour ramp", () => {
  test("thermique ramp spans the first to last stop", () => {
    assert.deepEqual(couleurChamp(0, "thermique"), [12, 16, 48]);
    assert.deepEqual(couleurChamp(1, "thermique"), [222, 60, 75]);
  });

  test("thermique ramp clamps out-of-range input", () => {
    assert.deepEqual(couleurChamp(-5, "thermique"), [12, 16, 48]);
    assert.deepEqual(couleurChamp(9, "thermique"), [222, 60, 75]);
  });

  test("encre palette is binary ink-on-light", () => {
    assert.deepEqual(couleurChamp(1, "encre"), [24, 26, 42]);
    assert.deepEqual(couleurChamp(0, "encre"), [238, 240, 245]);
  });
});

describe("image + trajectory", () => {
  test("construireImageProcessus produces an opaque RGBA buffer at grid size", () => {
    const core = loadManifest("gray_scott");
    const { largeur, hauteur, rgba } = construireImageProcessus(core, "v", "thermique");
    assert.equal(largeur, 64);
    assert.equal(hauteur, 64);
    assert.equal(rgba.length, 64 * 64 * 4);
    for (let i = 3; i < rgba.length; i += 4) assert.equal(rgba[i], 255); // alpha
  });

  test("calculerTrajectoire returns pas+1 frames, finite extent, correct tier", () => {
    const calc = calculerTrajectoire(loadManifest("gray_scott"), 20, "v");
    assert.equal(calc.trajectoire.length, 21);
    assert.ok(Number.isFinite(calc.etendue.min) && Number.isFinite(calc.etendue.max));
    assert.equal(calc.tier, 1); // fixed-population continuous dynamics
  });

  test("the parity automaton is a Tier-2 synchronous lattice rule", () => {
    const calc = calculerTrajectoire(loadManifest("automate_parite"), 8, "vivant");
    assert.equal(calc.tier, 2);
  });
});

describe("volumetric projection (JS fallback mirrors the .multi formula)", () => {
  test("matches the rotation+perspective reference to machine precision", () => {
    const [x, y, z, w, h, theta] = [0.5, -0.3, 0.2, 280, 280, 0.7];
    const [sx, sy, scale, depth] = projeterPointVolumetrique(x, y, z, w, h, theta);
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const rx = x * cos - z * sin, rz = x * sin + z * cos, persp = 1 / (1.8 - rz * 0.5);
    assert.ok(Math.abs(sx - (w / 2 + rx * w * 0.3 * persp)) < 1e-9);
    assert.ok(Math.abs(sy - (h / 2 + y * h * 0.35 * persp)) < 1e-9);
    assert.ok(Math.abs(scale - persp) < 1e-9);
    assert.ok(Math.abs(depth - rz) < 1e-9);
  });

  test("a higher field value projects to a higher screen position (smaller sy)", () => {
    // Same ground cell, two heights: relief maps value -> scene Y -> screen Y.
    const ground = [0, 0, 280, 280, 0]; // x, z, w, h, theta (no rotation)
    const bas = projeterPointVolumetrique(ground[0], 0.35 - 0.0, ground[1], 280, 280, 0)[1];
    const haut = projeterPointVolumetrique(ground[0], 0.35 - 0.55, ground[1], 280, 280, 0)[1];
    assert.ok(haut < bas, "a higher value should sit higher on screen");
  });

  test("rotation by 2*pi returns to the same projection", () => {
    const base = projeterPointVolumetrique(0.4, 0.1, -0.6, 200, 200, 0.3);
    const turned = projeterPointVolumetrique(0.4, 0.1, -0.6, 200, 200, 0.3 + 2 * Math.PI);
    for (let i = 0; i < base.length; i += 1) assert.ok(Math.abs(base[i] - turned[i]) < 1e-9);
  });
});
