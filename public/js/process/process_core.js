// SPDX-FileCopyrightText: 2026 John Samuel <johnsamuelwrites@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later
//
// JS port of multilingualprogramming/codegen/process_core.py -- the
// modality-free stepper for semantic-core-v1.
//
// This is the load-bearing artifact of the polymodal dynamics layer: the
// engine that advances a (State, Topology, Rule, Schedule) tuple lives
// once and is shared by every modality runtime, so two surfaces cannot
// evolve the same program differently. This file is a faithful port of the
// Python core; tests/process_core_js_test.py runs it under Node and asserts
// its trajectory is byte-identical to Python's. The Python module stays the
// authority.
//
// Like its Python sibling, this is the *language*: it knows nothing about
// Game of Life or any specific system. Programs are data (program.v1.json),
// not branches in here.

export const CORE_KIND = "semantic-core-v1";
export const TOPOLOGY_LATTICE = "lattice";
export const TOPOLOGY_SEQUENCE = "sequence";
export const TOPOLOGY_GRAPH = "graph";
export const LATTICE_EXTENT_INFINITE = "infinite";
export const NEIGHBORHOOD_MOORE8 = "moore8";
export const NEIGHBORHOOD_VONNEUMANN4 = "von-neumann4";
export const RULE_REWRITE = "rewrite";
export const RULE_RATE = "rate";
export const SCHEDULE_SYNCHRONOUS = "synchronous";
export const SCHEDULE_STATIC = "static";
export const SCHEDULE_GENERATIVE = "generative";
export const SCHEDULE_ASYNCHRONOUS = "asynchronous";
export const SCHEDULE_CONTINUOUS = "continuous-dt";
export const POPULATION_FIXED = "fixed";
export const POPULATION_OPEN = "open";

const MOORE8_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];
const VONNEUMANN4_OFFSETS = [[0, -1], [-1, 0], [1, 0], [0, 1]];

// Build an adjacency map from a graph topology's edge set. Undirected edges
// contribute both directions; insertion order is preserved and duplicates
// dropped, so neighbour sets are deterministic across runtimes.
function graphAdjacency(topology) {
  const adjacency = new Map();
  const directed = topology.directed === true;
  const link = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    const bucket = adjacency.get(a);
    if (!bucket.includes(b)) bucket.push(b);
  };
  for (const [a, b] of topology.edges) {
    link(a, b);
    if (!directed) link(b, a);
  }
  return adjacency;
}

// The one topology query: which loci are adjacent to this one? `locus` is an
// [x, y] coordinate for a lattice, an integer position for a sequence, a node
// id for a graph; neighbours come back in the same currency.
export function neighbors(topology, locus) {
  if (topology.kind === TOPOLOGY_GRAPH) {
    return graphAdjacency(topology).get(locus) ?? [];
  }
  if (topology.kind !== TOPOLOGY_LATTICE) {
    throw new Error(`topology kind ${topology.kind} not yet supported`);
  }
  const offsets =
    (topology.neighborhood ?? NEIGHBORHOOD_MOORE8) === NEIGHBORHOOD_MOORE8
      ? MOORE8_OFFSETS
      : VONNEUMANN4_OFFSETS;
  const [x, y] = locus;
  if (topology.extent === LATTICE_EXTENT_INFINITE) {
    // No walls: every adjacent coordinate is a neighbour.
    return offsets.map(([dx, dy]) => [x + dx, y + dy]);
  }
  const { width, height } = topology;
  const wrap = topology.wrap !== false;
  const result = [];
  for (const [dx, dy] of offsets) {
    let nx = x + dx;
    let ny = y + dy;
    if (wrap) {
      nx = ((nx % width) + width) % width;
      ny = ((ny % height) + height) % height;
      result.push([nx, ny]);
    } else if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
      result.push([nx, ny]);
    }
  }
  return result;
}

// The grid key (and a neighbour's grid key) under each topology. A lattice /
// sequence locus is positional, so its key is its coordinate; a graph locus is
// its node id. neighbors() returns values of the same shape, so neighbourKey
// and locusKey agree -- a neighbour looked up in the grid lands on the right
// record.
function locusKey(rec, topology) {
  return topology.kind === TOPOLOGY_GRAPH ? `n:${rec.node}` : `${rec.locus[0]},${rec.locus[1]}`;
}

function neighbourKey(nb, topology) {
  return topology.kind === TOPOLOGY_GRAPH ? `n:${nb}` : `${nb[0]},${nb[1]}`;
}

// The locus value handed to neighbors() for a record: a coordinate for a
// lattice, the node id for a graph.
function adjacencyLocus(rec, topology) {
  return topology.kind === TOPOLOGY_GRAPH ? rec.node : [rec.locus[0], rec.locus[1]];
}

function gridOf(core, topology) {
  const grid = new Map();
  for (const rec of core.state.loci) {
    grid.set(locusKey(rec, topology), rec);
  }
  return grid;
}

// A deterministic pseudo-random value in [0, 1) keyed by (x, y, step, salt).
// The byte-identical twin of process_core._hash01: every multiply is a 32-bit
// `Math.imul` made unsigned with `>>> 0` (matching CPython's `* … & 0xFFFFFFFF`),
// every shift is on an unsigned 32-bit word, and the single divide by 2**32 is
// the one float op -- identical on both runtimes. Backs the `chance` predicate.
function hash01(x, y, step, salt) {
  let h = Math.imul(x >>> 0, 0x9E3779B1) >>> 0;
  h = (h ^ ((y + 0x85EBCA77) >>> 0)) >>> 0;
  h = Math.imul(h, 0xC2B2AE3D) >>> 0;
  h = (h ^ (Math.imul(step >>> 0, 0x27D4EB2F) >>> 0)) >>> 0;
  h = (h ^ (salt >>> 0)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85EBCA6B) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xC2B2AE35) >>> 0;
  h ^= h >>> 16;
  h >>>= 0;
  return h / 4294967296;
}

function clauseMatches(rec, nbs, grid, match, topology, stepIndex = 0) {
  const self = match.self ?? {};
  for (const field of Object.keys(self)) {
    if (rec[field] !== self[field]) {
      return false;
    }
  }
  for (const predicate of match.neighbor_count ?? []) {
    let tally = 0;
    for (const nb of nbs) {
      const node = grid.get(neighbourKey(nb, topology));
      if (node && node[predicate.field] === predicate.value) {
        tally += 1;
      }
    }
    if (!predicate.in.includes(tally)) {
      return false;
    }
  }
  // Stochastic predicate: fires only when a deterministic roll keyed by the
  // locus, the step, and the clause's salt falls under the probability.
  const chanceSpec = match.chance;
  if (chanceSpec && rec.locus) {
    const roll = hash01(rec.locus[0], rec.locus[1], stepIndex, chanceSpec.salt);
    if (roll >= chanceSpec.p) {
      return false;
    }
  }
  return true;
}

function produceFor(rec, nbs, grid, clauses, fallback, topology, stepIndex = 0) {
  for (const clause of clauses) {
    if (clauseMatches(rec, nbs, grid, clause.match ?? {}, topology, stepIndex)) {
      return clause.produce;
    }
  }
  return fallback;
}

function isEmpty(rec, empty) {
  return Object.keys(empty).every((field) => rec[field] === empty[field]);
}

// Fixed population: every declared locus persists, only its state moves.
function stepFixed(core, topology, clauses, fallback, stepIndex = 0) {
  const grid = gridOf(core, topology);
  const isLattice = topology.kind === TOPOLOGY_LATTICE;
  return core.state.loci.map((rec) => {
    const locus = adjacencyLocus(rec, topology);
    const nbs = neighbors(topology, locus);
    const next = { ...rec, ...produceFor(rec, nbs, grid, clauses, fallback, topology, stepIndex) };
    // Normalize a lattice coordinate to a list; a graph node keeps its own
    // ``locus`` view hint (if any) untouched.
    if (isLattice) next.locus = [rec.locus[0], rec.locus[1]];
    return next;
  });
}

// Open population: rules may create and destroy loci. Only non-empty loci
// are stored; each step considers the frontier (existing loci plus their
// neighbours), since only those positions can change under a local rule.
function stepOpen(core, topology, clauses, fallback, stepIndex = 0) {
  const empty = core.state.empty;
  const grid = gridOf(core, topology);

  const candidates = new Map(); // key -> [x, y]
  for (const rec of core.state.loci) {
    const locus = [rec.locus[0], rec.locus[1]];
    candidates.set(`${locus[0]},${locus[1]}`, locus);
    for (const [nx, ny] of neighbors(topology, locus)) {
      candidates.set(`${nx},${ny}`, [nx, ny]);
    }
  }

  const next = [];
  const ordered = [...candidates.values()].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  for (const locus of ordered) {
    const rec = grid.get(`${locus[0]},${locus[1]}`) ?? { locus, ...empty };
    const nbs = neighbors(topology, locus);
    const produced = { ...rec, ...produceFor(rec, nbs, grid, clauses, fallback, topology, stepIndex), locus };
    if (!isEmpty(produced, empty)) {
      next.push(produced);
    }
  }
  return next;
}

// Asynchronous population: sequential in-place update in a fixed scan order.
// Loci are visited in sorted coordinate order; each reads the *already-updated*
// grid (so it sees neighbours that have acted earlier this sweep) and writes a
// fresh record back. The input is never mutated. produceFor may return the
// rule's null default (no fallback), and spreading null is a no-op -- so a
// locus matching no clause is left unchanged, the identity-on-no-match a cyclic
// ecology rule relies on. The emitted list keeps the original loci order.
function stepAsync(core, topology, clauses, fallback, stepIndex = 0) {
  const grid = gridOf(core, topology);
  const isLattice = topology.kind === TOPOLOGY_LATTICE;
  const keys = [...grid.keys()].sort((a, b) => {
    if (isLattice) {
      const [ax, ay] = a.split(",").map(Number);
      const [bx, by] = b.split(",").map(Number);
      return (ax - bx) || (ay - by);
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
  for (const key of keys) {
    const rec = grid.get(key);
    const locus = adjacencyLocus(rec, topology);
    const nbs = neighbors(topology, locus);
    const next = { ...rec, ...produceFor(rec, nbs, grid, clauses, fallback, topology, stepIndex) };
    if (isLattice) next.locus = [rec.locus[0], rec.locus[1]];
    grid.set(key, next);
  }
  return core.state.loci.map((rec) => ({ ...grid.get(locusKey(rec, topology)) }));
}

// Evaluate a rate rule at one locus: each field's time-derivative is the sum of
// four optional contributions, in a fixed order so the result is byte-identical
// to Python: linear `self` coefficients on the locus's own fields, linear
// `neighbor_mean` coefficients on the mean over its existing neighbours, a
// `constant` source/sink, and nonlinear `products` (monomials over the locus's
// own fields). Neighbours are summed in neighbors() order -- identical in
// Python. `constant` and `products` are appended only when present, so a rule
// using neither integrates exactly as before they were added.
function rateFor(rec, nbs, grid, rates, topology) {
  const present = [];
  for (const nb of nbs) {
    const node = grid.get(neighbourKey(nb, topology));
    if (node) present.push(node);
  }
  const count = present.length;
  const out = {};
  for (const field of Object.keys(rates)) {
    const terms = rates[field];
    let rate = 0.0;
    const self = terms.self ?? {};
    for (const src of Object.keys(self)) {
      rate += self[src] * (rec[src] ?? 0);
    }
    const neighborMean = terms.neighbor_mean;
    if (neighborMean && count) {
      for (const src of Object.keys(neighborMean)) {
        let total = 0;
        for (const p of present) total += p[src] ?? 0;
        rate += neighborMean[src] * (total / count);
      }
    }
    // A constant source/sink (e.g. Gray-Scott's feed F), added only when the
    // key is present so existing linear rules stay bit-for-bit unchanged.
    if ("constant" in terms) {
      rate += terms.constant;
    }
    // Nonlinear monomials over the locus's own fields -- the reaction terms
    // diffusion and decay cannot express. Left-fold in factor order, as Python.
    for (const monomial of terms.products ?? []) {
      let term = monomial.coeff ?? 1.0;
      for (const factor of monomial.factors ?? []) {
        term *= rec[factor] ?? 0;
      }
      rate += term;
    }
    out[field] = rate;
  }
  return out;
}

// Continuous dynamics: one explicit-Euler step `next = current + dt*rate`.
// Synchronous reading -- every locus integrates from the previous frame, so a
// step is order-independent (a Jacobi sweep). The input is never mutated.
function stepContinuous(core, topology, rates, dt) {
  const grid = gridOf(core, topology);
  const isLattice = topology.kind === TOPOLOGY_LATTICE;
  return core.state.loci.map((rec) => {
    const locus = adjacencyLocus(rec, topology);
    const nbs = neighbors(topology, locus);
    const rate = rateFor(rec, nbs, grid, rates, topology);
    const next = { ...rec };
    for (const field of Object.keys(rate)) {
      next[field] = (rec[field] ?? 0) + dt * rate[field];
    }
    if (isLattice) next.locus = [rec.locus[0], rec.locus[1]];
    return next;
  });
}

// Generative rewriting: rewrite every symbol of a sequence in parallel and
// concatenate the productions. A clause's `produce` is a *list* of records
// that replaces the matched symbol, so a production longer than one symbol
// grows the sequence -- the "generativity for free" the rewrite primitive
// gives (L-systems, fractal strings). Matching is context-free (self fields
// only), so neighbours/grid are empty. A symbol matching no clause maps to
// itself. The same rewrite primitive as the lattice path; only the schedule's
// reading of `produce` (a sequence, not a single state) differs.
function stepGenerative(core, clauses) {
  const emptyGrid = new Map();
  const { topology } = core;
  const next = [];
  for (const rec of core.state.sequence) {
    let production = null;
    for (const clause of clauses) {
      if (clauseMatches(rec, [], emptyGrid, clause.match ?? {}, topology)) {
        production = clause.produce;
        break;
      }
    }
    if (production === null) {
      next.push({ ...rec });
    } else {
      for (const symbol of production) {
        next.push({ ...symbol });
      }
    }
  }
  return next;
}

// Advance the process core by one step, returning a new core. The input is
// never mutated; topology/rule/schedule pass through unchanged. `stepIndex`
// (0-based within a run) feeds the stochastic `chance` predicate; a
// deterministic rule ignores it.
export function step(core, stepIndex = 0) {
  if (core.schedule.kind === SCHEDULE_GENERATIVE) {
    if (core.rule.kind !== RULE_REWRITE) {
      throw new Error(`rule kind ${core.rule.kind} not yet supported`);
    }
    const nextSequence = stepGenerative(core, core.rule.clauses);
    return { ...core, state: { ...core.state, sequence: nextSequence } };
  }
  if (core.schedule.kind === SCHEDULE_STATIC) {
    // A static snapshot does not evolve; stepping is identity. Touches
    // neither topology nor loci shape, so a migrated v0 core steps cleanly.
    return { ...core, state: { ...core.state } };
  }
  if (core.schedule.kind === SCHEDULE_CONTINUOUS) {
    // Continuous-time dynamics: integrate a rate rule one Euler step. A
    // different rule kind (rate, not rewrite) and a fixed population only.
    if (core.rule.kind !== RULE_RATE) {
      throw new Error(`continuous-dt schedule needs a rate rule, got ${core.rule.kind}`);
    }
    const population = core.state.population ?? POPULATION_FIXED;
    if (population !== POPULATION_FIXED) {
      throw new Error(`continuous-dt schedule with population ${population} not yet supported`);
    }
    const nextLoci = stepContinuous(core, core.topology, core.rule.rates, core.schedule.dt);
    return { ...core, state: { ...core.state, loci: nextLoci } };
  }
  if (
    core.schedule.kind !== SCHEDULE_SYNCHRONOUS &&
    core.schedule.kind !== SCHEDULE_ASYNCHRONOUS
  ) {
    throw new Error(`schedule kind ${core.schedule.kind} not yet supported`);
  }
  if (core.rule.kind !== RULE_REWRITE) {
    throw new Error(`rule kind ${core.rule.kind} not yet supported`);
  }
  const { topology } = core;
  const { clauses, default: fallback } = core.rule;
  const population = core.state.population ?? POPULATION_FIXED;

  let nextLoci;
  if (core.schedule.kind === SCHEDULE_ASYNCHRONOUS) {
    if (population !== POPULATION_FIXED) {
      throw new Error(
        `asynchronous schedule with population ${population} not yet supported`
      );
    }
    nextLoci = stepAsync(core, topology, clauses, fallback, stepIndex);
  } else if (population === POPULATION_FIXED) {
    nextLoci = stepFixed(core, topology, clauses, fallback, stepIndex);
  } else if (population === POPULATION_OPEN) {
    // Open population grows/prunes loci by coordinate frontier (lattice only);
    // an open graph would be full graph rewriting, not yet specified.
    if (topology.kind !== TOPOLOGY_LATTICE) {
      throw new Error(
        `open population with topology ${topology.kind} not yet supported`
      );
    }
    nextLoci = stepOpen(core, topology, clauses, fallback);
  } else {
    throw new Error(`population mode ${population} not yet supported`);
  }

  return { ...core, state: { ...core.state, loci: nextLoci } };
}

// Run the stepper `steps` times, returning the trajectory (steps + 1 frames).
export function run(core, steps) {
  if (steps < 0) {
    throw new Error("steps must be nonnegative");
  }
  const trajectory = [core];
  let current = core;
  for (let i = 0; i < steps; i += 1) {
    current = step(current, i);
    trajectory.push(current);
  }
  return trajectory;
}

// Sorted [x, y] of loci whose `field` is truthy -- the simplest projection.
export function activeCells(core, field = "alive") {
  return core.state.loci
    .filter((rec) => rec[field])
    .map((rec) => [rec.locus[0], rec.locus[1]])
    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
}

// Sorted [x, y, value] of each locus's `field` -- preserves the value a
// multi-state field carries (vs activeCells' boolean mask), the readout a
// several-species ecology projects from. Names no specific system.
export function fieldCells(core, field = "state") {
  return core.state.loci
    .map((rec) => [rec.locus[0], rec.locus[1], rec[field]])
    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
}

// Ordered `field` values of a sequence-topology core -- the produced word as
// a list of symbols. The generative analogue of activeCells; names no system.
export function sequenceSymbols(core, field = "symbol") {
  return core.state.sequence.map((rec) => rec[field]);
}

// Sorted [node, value] of each node's `field` -- the readout a graph-topology
// program projects from. The graph analogue of fieldCells (which keys by
// coordinate); a graph's index is the node, not a position. Names no system.
export function nodeCells(core, field = "state") {
  return core.state.loci
    .map((rec) => [rec.node, rec[field]])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

// The expressiveness tier (0-4) of a core, read from its axes -- a faithful
// port of process_capabilities.expressiveness_tier so a browser status line
// can show how expressive (and how invertible) the running program is without
// a Python round-trip. See TIER_NAMES for the labels.
export const TIER_NAMES = {
  0: "static structure",
  1: "fixed-population continuous dynamics",
  2: "synchronous lattice / field rules",
  3: "generative / open-population rewriting",
  4: "full graph / hypergraph rewriting",
};

export function tierOf(core) {
  if (core.schedule.kind === SCHEDULE_STATIC) return 0;
  // Only a *rewrite* rule with no clauses is static; a rate rule has no clauses
  // yet is genuine continuous dynamics, so it must fall through to Tier 1.
  if (core.rule.kind === RULE_REWRITE && (!core.rule.clauses || core.rule.clauses.length === 0)) {
    return 0;
  }
  if (core.schedule.kind === SCHEDULE_GENERATIVE) return 3;
  if (core.topology.kind !== TOPOLOGY_LATTICE) return 4;
  const population = core.state.population ?? POPULATION_FIXED;
  if (population === POPULATION_OPEN) return 3;
  if (core.schedule.kind === SCHEDULE_SYNCHRONOUS) return 2;
  return 1;
}
