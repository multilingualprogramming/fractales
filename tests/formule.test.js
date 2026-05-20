/**
 * Unit tests for Atelier formule parser/compiler.
 * Run with: node --test tests/formule.test.js
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  analyserFormule,
  compilerFormule,
  dessinerMiniApercuFormule,
  normaliserSourceFormule,
  tokeniserFormule,
} from "../public/js/renderer-formule.js";

describe("Atelier formule", () => {
  test("tokenizes implicit multiplication", () => {
    assert.deepEqual(tokeniserFormule("2z + a sin(z)"), ["2", "*", "z", "+", "a", "*", "sin", "(", "z", ")"]);
  });

  test("normalizes French and mathematical input for preview", () => {
    assert.equal(normaliserSourceFormule("z² + c + 0,25×sin(z)"), "z^2 + c + 0.25*sin(z)");
    assert.deepEqual(tokeniserFormule("z² + c + 0,25×sin(z)"), [
      "z", "^", "2", "+", "c", "+", "0.25", "*", "sin", "(", "z", ")",
    ]);
  });

  test("compiles parameterized formulas with a and b", () => {
    const compiled = compilerFormule("z^2+c+a*sin(z)+b");
    assert.ok(compiled.fn, compiled.error);
    const out = compiled.fn(0.2, 0.1, -0.3, 0.4, 0.25, -0.5);
    assert.equal(out.length, 2);
    assert.ok(Number.isFinite(out[0] + out[1]));
  });

  test("supports richer complex helpers", () => {
    const compiled = compilerFormule("tan(z)+re(c)+im(c)*i+norm(z)-arg(z)");
    assert.ok(compiled.fn, compiled.error);
    const out = compiled.fn(0.2, 0.1, -0.3, 0.4, 0, 0);
    assert.ok(Number.isFinite(out[0] + out[1]));
  });

  test("analyzes formula structure for studio diagnostics", () => {
    const analyse = analyserFormule("z^2+c+a*sin(z)");
    assert.equal(analyse.niveau, "moyenne");
    assert.deepEqual(analyse.fonctions, ["sin"]);
    assert.ok(analyse.variables.includes("z"));
    assert.ok(analyse.variables.includes("c"));
    assert.equal(analyse.avertissements.length, 0);
  });

  test("warns when formula ignores z or c", () => {
    const analyse = analyserFormule("a+b");
    assert.ok(analyse.avertissements.some((line) => line.includes("z absent")));
    assert.ok(analyse.avertissements.some((line) => line.includes("c absent")));
  });

  test("reports unknown symbols in French", () => {
    const compiled = compilerFormule("z^2+foo");
    assert.equal(compiled.fn, null);
    assert.match(compiled.error, /Symbole inconnu : foo/);
  });

  test("reports missing parentheses in French", () => {
    const compiled = compilerFormule("sin(z+c");
    assert.equal(compiled.fn, null);
    assert.match(compiled.error, /Parenthèse manquante/);
  });

  test("reports unsupported characters instead of silently ignoring them", () => {
    const compiled = compilerFormule("z^2+√c");
    assert.equal(compiled.fn, null);
    assert.match(compiled.error, /Jeton inattendu : √/);
  });

  test("draws the standalone mini preview canvas", () => {
    let wroteImage = false;
    const canvas = {
      width: 12,
      height: 8,
      getContext() {
        return {
          fillStyle: "",
          font: "",
          textAlign: "",
          textBaseline: "",
          fillRect() {},
          fillText() {},
          createImageData(width, height) {
            return { data: new Uint8ClampedArray(width * height * 4) };
          },
          putImageData(image) {
            wroteImage = image.data.some((value) => value !== 0);
          },
        };
      },
    };
    const readout = { textContent: "" };
    assert.equal(dessinerMiniApercuFormule({ canvas, readout, formule: "z*z+c" }), true);
    assert.equal(wroteImage, true);
    assert.match(readout.textContent, /Proposition locale/);
  });
});
