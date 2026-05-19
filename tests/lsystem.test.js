/**
 * Unit tests for stochastic Atelier L-system helpers.
 * Run with: node --test tests/lsystem.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  decrireReglesLSysteme,
  genererPropositionLSysteme,
} from "../public/js/renderer-lsystem.js";

describe("Atelier L-systeme stochastique", () => {
  test("same seed generates the same stochastic sequence", () => {
    const config = {
      axiom: "F",
      rules: "F=0.5:FF|0.5:F[+F]",
      generations: 5,
      seed: "plante-13",
    };
    const a = genererPropositionLSysteme(config).sequence;
    const b = genererPropositionLSysteme(config).sequence;
    assert.equal(a, b);
  });

  test("different seeds can generate different stochastic sequences", () => {
    const base = {
      axiom: "F",
      rules: "F=0.5:FF|0.5:F[+F]",
      generations: 5,
    };
    const a = genererPropositionLSysteme({ ...base, seed: "1" }).sequence;
    const b = genererPropositionLSysteme({ ...base, seed: "2" }).sequence;
    assert.notEqual(a, b);
  });

  test("weighted stochastic rules are detected", () => {
    const description = decrireReglesLSysteme("F=0.25:FF|0.75:F[-F]");
    assert.equal(description.stochasticCount, 1);
    assert.equal(description.ruleCount, 1);
    assert.equal(description.productions, 2);
    assert.deepEqual(description.symboles, ["F"]);
    assert.deepEqual(description.diagnostics, []);
  });

  test("invalid weights are reported in French", () => {
    const description = decrireReglesLSysteme("F=0:FF|-1:F");
    assert.ok(description.diagnostics.some((line) => line.includes("poids invalide")));
  });
});
