/**
 * Unit tests for the escape-time 3D relief helpers (no DOM).
 *
 * The DOM controller (creerStudioRelief) draws in the browser; these tests pin
 * the pure data path: sampling the active fractal into a height field and the
 * iteration->height normalisation. Run: node --test tests/relief.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  echantillonnerChamp,
  appelFractalePour,
  normaliserHauteurs,
} from "../public/js/renderer-relief.js";

describe("escape-time relief sampling", () => {
  test("echantillonnerChamp covers the current view on an n x n grid", () => {
    // A fake fractal returning the cx coordinate so we can check the sampling grid.
    const appel = (cx) => cx;
    const vue = { centerX: 0, centerY: 0, pixelSize: 1 };
    const n = 5;
    const champ = echantillonnerChamp(appel, vue, 4, n); // span = 1*4 = 4, x in [-2, 2]
    assert.equal(champ.length, n * n);
    assert.ok(Math.abs(champ[0] - -2) < 1e-9, "first column at left edge");
    assert.ok(Math.abs(champ[n - 1] - 2) < 1e-9, "last column at right edge");
  });

  test("appelFractalePour selects the right WASM signature", () => {
    const calls = [];
    const fn = (...args) => { calls.push(args); return 1; };
    const params = { maxIter: 100, juliaCre: 0.3, juliaCim: 0.5, multibrotPower: 4 };

    appelFractalePour("mandelbrot", fn, params)(1, 2);
    assert.deepEqual(calls.at(-1), [1, 2, 100]); // (cx, cy, maxIter)

    appelFractalePour("julia", fn, params)(1, 2);
    assert.deepEqual(calls.at(-1), [1, 2, 0.3, 0.5, 100]); // julia adds c

    appelFractalePour("multibrot", fn, params)(1, 2);
    assert.deepEqual(calls.at(-1), [1, 2, 100, 4]); // multibrot adds power
  });

  test("appelFractalePour returns null when no WASM function is available", () => {
    assert.equal(appelFractalePour("mandelbrot", null, {}), null);
    assert.equal(appelFractalePour("mandelbrot", undefined, {}), null);
  });

  test("normaliserHauteurs flattens interior and lifts escaped cells in [0,1]", () => {
    const maxIter = 100;
    // iter==maxIter -> interior -> 0; smaller iters -> rising heights.
    const champ = Float64Array.from([100, 1, 10, 99]);
    const h = normaliserHauteurs(champ, maxIter);
    assert.equal(h[0], 0, "interior is flat");
    for (const v of h) assert.ok(v >= 0 && v <= 1, "heights stay in [0,1]");
    assert.ok(h[1] < h[2] && h[2] < h[3], "more iterations -> taller (log scale)");
  });
});
