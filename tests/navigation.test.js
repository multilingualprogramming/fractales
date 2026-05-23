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

  test("includes advanced exploration mode state", () => {
    const params = {
      ...defaultParams,
      coloringMode: "phase",
      palettePhase: 0.35,
      paletteContours: true,
      deepZoomAutoIterations: true,
      deepZoomQuality: "fine",
      studio3dMaterial: "xray",
      studio3dFog: 0.4,
      weatherOverlays: "grille,contours",
      lsystemProposalActive: true,
      lsystemGenerations: 4,
      lsystemAngle: 60,
      lsystemAxiom: "F",
      lsystemRules: "F=F+F--F+F",
      lsystemSeed: "13",
      formulePropositionActive: true,
      formuleIteration: "z^2+c+a*sin(z)",
      formuleEscapeRadius: 3,
      formuleMode: "mandelbrot",
      formuleParamA: 0.25,
      formuleParamB: -0.5,
    };
    const hash = encoderEtat(defaultView, params);
    assert.ok(hash.includes("cm=phase"), "coloring mode");
    assert.ok(hash.includes("ph=0.350"), "palette phase");
    assert.ok(hash.includes("pc=1"), "palette contours");
    assert.ok(hash.includes("azi=1"), "auto iterations");
    assert.ok(hash.includes("q=fine"), "deep zoom quality");
    assert.ok(hash.includes("mat=xray"), "3D material");
    assert.ok(hash.includes("fog=0.40"), "3D fog");
    assert.ok(hash.includes("ov=grille%2Ccontours"), "weather overlays");
    assert.ok(hash.includes("lp=1"), "L-system proposal flag");
    assert.ok(hash.includes("lg=4"), "L-system generations");
    assert.ok(hash.includes("la=60"), "L-system angle");
    assert.ok(hash.includes("ls=13"), "L-system seed");
    assert.ok(hash.includes("lax=F"), "L-system axiom");
    assert.ok(hash.includes("lr=F%3DF%2BF--F%2BF"), "L-system rules");
    assert.ok(hash.includes("fpa=1"), "formula proposal flag");
    assert.ok(hash.includes("ffi=z%5E2%2Bc%2Ba*sin%28z%29"), "formula expression");
    assert.ok(hash.includes("ffe=3"), "formula radius");
    assert.ok(hash.includes("ffm=mandelbrot"), "formula mode");
    assert.ok(hash.includes("ffa=0.25"), "formula parameter a");
    assert.ok(hash.includes("ffb=-0.5"), "formula parameter b");
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

  test("parses advanced exploration mode state", () => {
    const result = decoderEtat("#f=mandelbrot&x=0&y=0&ps=0.003&i=256&cm=contours&ph=0.2&pc=1&azi=1&q=extreme&mat=contours&fog=0.5&ov=grille,orbite&lp=1&lg=5&la=45&lax=FX&lr=F%3DFF&ls=plante-7&fpa=1&ffi=z%5E2%2Bc%2Ba*sin(z)&ffe=3&ffm=julia&ffa=0.25&ffb=-0.5");
    assert.equal(result.coloringMode, "contours");
    assert.equal(result.palettePhase, 0.2);
    assert.equal(result.paletteContours, true);
    assert.equal(result.deepZoomAutoIterations, true);
    assert.equal(result.deepZoomQuality, "extreme");
    assert.equal(result.studio3dMaterial, "contours");
    assert.equal(result.studio3dFog, 0.5);
    assert.equal(result.weatherOverlays, "grille,orbite");
    assert.equal(result.lsystemProposalActive, true);
    assert.equal(result.lsystemGenerations, 5);
    assert.equal(result.lsystemAngle, 45);
    assert.equal(result.lsystemAxiom, "FX");
    assert.equal(result.lsystemRules, "F=FF");
    assert.equal(result.lsystemSeed, "plante-7");
    assert.equal(result.formulePropositionActive, true);
    assert.equal(result.formuleIteration, "z^2+c+a*sin(z)");
    assert.equal(result.formuleEscapeRadius, 3);
    assert.equal(result.formuleMode, "julia");
    assert.equal(result.formuleParamA, 0.25);
    assert.equal(result.formuleParamB, -0.5);
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

  test("double-double parts omitted when zero", () => {
    const view = { ...defaultView, centerX_lo: 0, centerY_lo: 0 };
    const hash = encoderEtat(view, defaultParams);
    assert.ok(!hash.includes("xlo="), "xlo omitted when zero");
    assert.ok(!hash.includes("ylo="), "ylo omitted when zero");
    const decoded = decoderEtat(hash);
    assert.equal(decoded.centerX_lo, 0, "decoded centerX_lo defaults to 0");
    assert.equal(decoded.centerY_lo, 0, "decoded centerY_lo defaults to 0");
  });

  test("deep-zoom view round-trips with DD lo parts", () => {
    const view = {
      centerX: -0.7436438870371587,
      centerX_lo: 1.234e-17,
      centerY: 0.131825904205311,
      centerY_lo: -5.678e-18,
      pixelSize: 1.5e-16,
      rotation: 0,
    };
    const params = { fractal: "mandelbrot", maxIter: 2000, palette: "aurora" };
    const hash = encoderEtat(view, params);
    assert.ok(hash.includes("xlo="), "xlo present");
    assert.ok(hash.includes("ylo="), "ylo present");
    const decoded = decoderEtat(hash);
    assert.ok(Math.abs(decoded.centerX_lo - view.centerX_lo) < 1e-25, `xlo ${decoded.centerX_lo}`);
    assert.ok(Math.abs(decoded.centerY_lo - view.centerY_lo) < 1e-25, `ylo ${decoded.centerY_lo}`);
  });
});
