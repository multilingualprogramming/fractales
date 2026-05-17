/**
 * Unit tests for renderer-navigation.js — share URL encoding/decoding.
 * Run with: node --test tests/navigation.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { encoderEtat, decoderEtat } from "../public/js/renderer-navigation.js";

const defaultView = { centerX: -0.5, centerY: 0.0, pixelSize: 0.004, rotation: 0 };
const defaultParams = { fractal: "mandelbrot", maxIter: 256, palette: "aurora" };

// ============================================================
// SHARE — encoderEtat
// ============================================================

describe("share: encoderEtat", () => {
  test("hash starts with #", () => {
    const hash = encoderEtat(defaultView, defaultParams);
    assert.ok(hash.startsWith("#"), "hash must start with #");
  });

  test("encodes required view fields", () => {
    const hash = encoderEtat(defaultView, defaultParams);
    assert.ok(hash.includes("f=mandelbrot"), "fractal name");
    assert.ok(hash.includes("x="), "x coordinate");
    assert.ok(hash.includes("y="), "y coordinate");
    assert.ok(hash.includes("ps="), "pixel size");
    assert.ok(hash.includes("i=256"), "iteration count");
  });

  test("omits rotation when zero", () => {
    const hash = encoderEtat(defaultView, defaultParams);
    assert.ok(!hash.includes("r="), "rotation=0 must not appear in hash");
  });

  test("includes rotation when non-zero", () => {
    const view = { ...defaultView, rotation: -0.43633 };
    const hash = encoderEtat(view, defaultParams);
    assert.ok(hash.includes("r="), "non-zero rotation must appear in hash");
    const params = new URLSearchParams(hash.slice(1));
    assert.ok(Math.abs(parseFloat(params.get("r")) - (-0.43633)) < 1e-4, "rotation value");
  });

  test("omits default aurora palette", () => {
    const hash = encoderEtat(defaultView, defaultParams);
    assert.ok(!hash.includes("p=aurora"), "default palette must be omitted");
  });

  test("includes non-default palette", () => {
    const params = { ...defaultParams, palette: "fire" };
    const hash = encoderEtat(defaultView, params);
    assert.ok(hash.includes("p=fire"), "non-default palette must appear");
  });

  test("includes Julia parameters for julia fractal", () => {
    const params = { ...defaultParams, fractal: "julia", juliaCre: -0.7, juliaCim: 0.27 };
    const hash = encoderEtat(defaultView, params);
    assert.ok(hash.includes("jr="), "juliaCre must appear");
    assert.ok(hash.includes("ji="), "juliaCim must appear");
  });

  test("omits view coordinates for 3D fractals", () => {
    const params = { ...defaultParams, fractal: "tetraedre_sierpinski" };
    const hash = encoderEtat(defaultView, params);
    assert.ok(!hash.includes("x="), "3D fractal must omit x");
    assert.ok(!hash.includes("y="), "3D fractal must omit y");
    assert.ok(!hash.includes("ps="), "3D fractal must omit ps");
  });

  test("includes multibrot power", () => {
    const params = { ...defaultParams, fractal: "multibrot", multibrotPower: 3 };
    const hash = encoderEtat(defaultView, params);
    assert.ok(hash.includes("pr=3"), "multibrot power must appear");
  });
});

// ============================================================
// SHARE — decoderEtat
// ============================================================

describe("share: decoderEtat", () => {
  test("returns null for empty string", () => {
    assert.equal(decoderEtat(""), null);
  });

  test("returns null for null", () => {
    assert.equal(decoderEtat(null), null);
  });

  test("returns null for bare #", () => {
    assert.equal(decoderEtat("#"), null);
  });

  test("returns null when fractal name is missing", () => {
    assert.equal(decoderEtat("#x=0&y=0&ps=0.001&i=100"), null);
  });

  test("defaults rotation to 0 when absent", () => {
    const result = decoderEtat("#f=mandelbrot&x=0&y=0&ps=0.001&i=100");
    assert.equal(result.rotation, 0, "rotation defaults to 0");
  });

  test("parses rotation when present", () => {
    const result = decoderEtat("#f=barnsley&x=0&y=5&ps=7.78546713e-3&r=-0.43633&i=256");
    assert.ok(result !== null, "valid hash must parse");
    assert.ok(Math.abs(result.rotation - (-0.43633)) < 1e-4, "rotation value");
  });

  test("returns null for zero pixelSize", () => {
    assert.equal(decoderEtat("#f=mandelbrot&x=0&y=0&ps=0&i=100"), null);
  });

  test("returns null for negative pixelSize", () => {
    assert.equal(decoderEtat("#f=mandelbrot&x=0&y=0&ps=-1&i=100"), null);
  });

  test("returns null for zero maxIter", () => {
    assert.equal(decoderEtat("#f=mandelbrot&x=0&y=0&ps=0.001&i=0"), null);
  });

  test("returns null for negative maxIter", () => {
    assert.equal(decoderEtat("#f=mandelbrot&x=0&y=0&ps=0.001&i=-5"), null);
  });

  test("returns null for non-finite x", () => {
    assert.equal(decoderEtat("#f=mandelbrot&x=Infinity&y=0&ps=0.001&i=100"), null);
  });

  test("returns null for NaN x", () => {
    assert.equal(decoderEtat("#f=mandelbrot&x=NaN&y=0&ps=0.001&i=100"), null);
  });

  test("defaults palette to aurora", () => {
    const result = decoderEtat("#f=mandelbrot&x=0&y=0&ps=0.001&i=100");
    assert.equal(result.palette, "aurora", "palette defaults to aurora");
  });

  test("parses non-default palette", () => {
    const result = decoderEtat("#f=mandelbrot&x=0&y=0&ps=0.001&i=100&p=fire");
    assert.equal(result.palette, "fire", "palette parsed");
  });

  test("parses Julia parameters", () => {
    const result = decoderEtat("#f=julia&x=0&y=0&ps=0.003&i=256&jr=-0.7&ji=0.27");
    assert.ok(Math.abs(result.juliaCre - (-0.7)) < 1e-5, "juliaCre parsed");
    assert.ok(Math.abs(result.juliaCim - 0.27) < 1e-5, "juliaCim parsed");
  });
});

// ============================================================
// SHARE — round-trip
// ============================================================

describe("share: round-trip", () => {
  test("standard view round-trips", () => {
    const view = { centerX: -0.743643, centerY: 0.131826, pixelSize: 1.5e-6, rotation: 0 };
    const params = { fractal: "mandelbrot", maxIter: 512, palette: "aurora" };
    const decoded = decoderEtat(encoderEtat(view, params));
    assert.ok(Math.abs(decoded.centerX - view.centerX) < 1e-6, "centerX");
    assert.ok(Math.abs(decoded.centerY - view.centerY) < 1e-6, "centerY");
    assert.ok(Math.abs(decoded.pixelSize - view.pixelSize) < view.pixelSize * 1e-6, "pixelSize");
    assert.equal(decoded.fractal, params.fractal, "fractal");
    assert.equal(decoded.maxIter, params.maxIter, "maxIter");
  });

  test("rotation round-trips", () => {
    const view = { centerX: 0.0, centerY: 5.0, pixelSize: 7.78546713e-3, rotation: -0.43633 };
    const params = { fractal: "barnsley", maxIter: 256, palette: "aurora" };
    const decoded = decoderEtat(encoderEtat(view, params));
    assert.ok(Math.abs(decoded.rotation - view.rotation) < 1e-4, "rotation");
  });

  test("zero rotation omitted then defaults back to 0", () => {
    const view = { ...defaultView, rotation: 0 };
    const hash = encoderEtat(view, defaultParams);
    assert.ok(!hash.includes("r="), "zero rotation omitted");
    const decoded = decoderEtat(hash);
    assert.equal(decoded.rotation, 0, "decoded rotation is 0");
  });
});
