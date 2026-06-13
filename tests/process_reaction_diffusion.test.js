/**
 * Smoke tests for the reaction-diffusion process (semantic-core-v1).
 *
 * Proves the Phase-0 process pipeline end to end: the vendored modality-free
 * stepper (public/js/process/process_core.js) advances the manifest built from
 * src/process/reaction_diffusion.multi, and the linear activator-inhibitor
 * dynamics behave as a Turing system (spatial structure grows from a near-flat
 * seed). Run with: node --test tests/process_reaction_diffusion.test.js
 *
 * The manifest is a build artifact (gitignored); regenerate it with
 *   MULTILINGUAL_DEV_PATH=/path/to/multilingual python3 scripts/build_processes.py
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { run, tierOf } from "../public/js/process/process_core.js";

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, "../public/process/program.reaction_diffusion.v1.json");

function loadCore() {
  return JSON.parse(readFileSync(manifestPath, "utf-8"));
}

// Population variance of a field over all loci -- the structure metric. A flat
// field has variance ~0; an emerged Turing pattern has a large variance.
function fieldVariance(core, field) {
  const xs = core.state.loci.map((rec) => rec[field]);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
}

describe("reaction-diffusion process (semantic-core-v1)", () => {
  test("manifest has the expected continuous-dt lattice shape", () => {
    const core = loadCore();
    assert.equal(core.kind, "semantic-core-v1");
    assert.equal(core.topology.kind, "lattice");
    assert.equal(core.schedule.kind, "continuous-dt");
    assert.equal(core.rule.kind, "rate");
    assert.equal(core.state.loci.length, 48 * 48);
    // Fixed-population continuous dynamics is Tier 1.
    assert.equal(tierOf(core), 1);
  });

  test("trajectory has steps+1 frames, fixed population, finite fields", () => {
    const core = loadCore();
    const steps = 80;
    const trajectory = run(core, steps);
    assert.equal(trajectory.length, steps + 1);
    for (const frame of trajectory) {
      assert.equal(frame.state.loci.length, 48 * 48);
    }
    const last = trajectory[steps];
    for (const rec of last.state.loci) {
      assert.ok(Number.isFinite(rec.u), `u finite: ${rec.u}`);
      assert.ok(Number.isFinite(rec.v), `v finite: ${rec.v}`);
    }
  });

  test("Turing instability grows spatial structure from a near-flat seed", () => {
    const core = loadCore();
    const steps = 160;
    const trajectory = run(core, steps);
    const v0 = fieldVariance(trajectory[0], "u");
    const vN = fieldVariance(trajectory[steps], "u");
    // Linear Turing growth is exponential: the unstable mode amplifies the
    // seed's spatial structure by ~90x over 160 Euler steps (measured). Assert
    // a comfortable lower bound so the test is stable, not knife-edge.
    assert.ok(vN > v0 * 20, `variance grew: ${v0} -> ${vN}`);
  });

  test("stepping is deterministic (bit-identical reruns)", () => {
    const a = run(loadCore(), 40)[40].state.loci;
    const b = run(loadCore(), 40)[40].state.loci;
    assert.deepEqual(
      a.map((r) => [r.u, r.v]),
      b.map((r) => [r.u, r.v]),
    );
  });
});
