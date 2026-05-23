/**
 * Tests d'intégration : la grammaire L-système (réécriture) ET l'interprétation
 * tortue (géométrie) compilées vers WASM (src/atelier_lsysteme.multi →
 * public/atelier_lsysteme.wasm) doivent reproduire les références JavaScript.
 *
 * Charge le module avec le shim WASI GÉNÉRÉ (atelier_lsysteme_shim.js) et un
 * DOM simulé fournissant le pont ml_dom_* (le vrai pont utilise `document`,
 * indisponible sous node).
 *
 * tracer_lsysteme(generations, angle_deg) :
 *   - écrit l'aperçu texte dans #lsystem-string-preview ;
 *   - renvoie une liste : [0] = np, puis np triplets (x, y, déplacer).
 *
 * Run with: node --test tests/atelier_lsysteme_wasm.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  genererPropositionLSysteme,
  pointsPropositionLSysteme,
} from "../public/js/renderer-lsystem.js";
import { createWasiImports } from "../public/js/atelier_lsysteme_shim.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(ICI, "..", "public", "atelier_lsysteme.wasm");
const APERCU_MAX = 600;

const wasmBytes = await readFile(WASM_PATH);

/** Instancie le module avec un DOM simulé ; renvoie {exports, elements, memoryRef}. */
async function instancier(axiom, rules) {
  const memoryRef = { current: null };
  const { wasi_snapshot_preview1 } = createWasiImports(memoryRef, () => {});
  const elements = {
    "lsystem-axiom-input": { value: axiom },
    "lsystem-rules-input": { value: rules },
    "lsystem-string-preview": { textContent: "" },
  };
  const handles = new Map();
  let next = 1;
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  const read = (p, l) => (l <= 0 ? "" : dec.decode(new Uint8Array(memoryRef.current.buffer, p, l)));
  const env = {
    ml_dom_get(p, l) { const h = next++; handles.set(h, elements[read(p, l)] ?? null); return h; },
    ml_dom_get_value(h, buf, cap) {
      const el = handles.get(Math.trunc(h));
      const b = enc.encode(el?.value ?? "");
      const n = Math.min(b.length, cap);
      new Uint8Array(memoryRef.current.buffer, buf, n).set(b.subarray(0, n));
      return n;
    },
    ml_dom_set_text(h, p, l) { const el = handles.get(Math.trunc(h)); if (el) el.textContent = read(p, l); },
    ml_dom_set_html() {}, ml_dom_set_attr() {}, ml_dom_set_class() {},
    ml_dom_on() {}, ml_dom_create() { return 0; }, ml_dom_append() {}, ml_dom_style() {}, ml_dom_remove() {},
  };
  const { instance } = await WebAssembly.instantiate(wasmBytes, { wasi_snapshot_preview1, env });
  memoryRef.current = instance.exports.memory;
  return { exports: instance.exports, elements, memoryRef };
}

// Disposition : [0] = np, puis np quintuplets (x, y, move, profondeur, angle).
const PAS = 5;

function lireSommets(exports, memoryRef, generations, angle) {
  exports.__ml_reset();
  const ptr = exports.tracer_lsysteme(generations, angle);
  const base = Math.trunc(ptr);
  const view = new DataView(memoryRef.current.buffer);
  const np = view.getFloat64(base + 8, true);
  const pts = [];
  for (let k = 0; k < np; k++) {
    const o = base + 8 + 8 * (1 + PAS * k);
    pts.push({
      x: view.getFloat64(o, true),
      y: view.getFloat64(o + 8, true),
      move: view.getFloat64(o + 16, true),
      profondeur: view.getFloat64(o + 24, true),
      angle: view.getFloat64(o + 32, true),
    });
  }
  return { np, pts };
}

// Grammaires déterministes ; générations bornées à 8 (plage du curseur) et
// choisies pour rester sous la capacité de matérialisation (8000).
const CAS = [
  // gen 7 (16385 sommets) dépasse l'ancien plafond de 8000 : vérifie l'absence
  // de régression grâce à la tortue DFS sans matérialisation.
  { nom: "Koch", axiom: "F", rules: "F=F+F--F+F", angle: 60, gens: [1, 2, 3, 5, 7] },
  { nom: "Dragon de Heighway", axiom: "FX", rules: "X=X+YF+;Y=-FX-Y", angle: 90, gens: [1, 4, 8] },
  { nom: "grille", axiom: "F", rules: "F=F+F+F+F", angle: 90, gens: [1, 2, 3] },
  { nom: "plante (déterministe)", axiom: "X", rules: "X=F-[[X]+X]+F[+FX]-X;F=FF", angle: 25, gens: [1, 2, 3, 5] },
];

describe("Atelier L-systeme — parité WASM ↔ JS", () => {
  for (const { nom, axiom, rules, angle, gens } of CAS) {
    for (const g of gens) {
      test(`${nom} génération ${g} — expansion (texte)`, async () => {
        const ref = genererPropositionLSysteme({ axiom, rules, generations: g, seed: 1 }).sequence;
        const { exports, elements, memoryRef } = await instancier(axiom, rules);
        lireSommets(exports, memoryRef, g, angle);
        assert.equal(
          elements["lsystem-string-preview"].textContent,
          ref.slice(0, Math.min(ref.length, APERCU_MAX)),
          "aperçu texte écrit dans le DOM",
        );
      });

      test(`${nom} génération ${g} — tortue (sommets, profondeur)`, async () => {
        const ref = pointsPropositionLSysteme(
          { axiom, rules, angle, generations: g, seed: 1 },
          { limit: 200000 },
        ).points;
        const { exports, memoryRef } = await instancier(axiom, rules);
        const { np, pts } = lireSommets(exports, memoryRef, g, angle);
        assert.equal(np, ref.length, "nombre de sommets");
        let maxDelta = 0;
        for (let i = 0; i < np; i++) {
          const expectedMove = i === 0 || ref[i].move ? 1 : 0;
          assert.equal(pts[i].move, expectedMove, `drapeau move au point ${i}`);
          assert.equal(pts[i].profondeur, ref[i].profondeur || 0, `profondeur au point ${i}`);
          maxDelta = Math.max(maxDelta, Math.abs(pts[i].x - ref[i].x), Math.abs(pts[i].y - ref[i].y));
        }
        // Trigonométrie WASM = approximation polynomiale (~1e-6), accumulée.
        assert.ok(maxDelta < 1e-2, `écart de coordonnées trop grand : ${maxDelta}`);
      });
    }
  }
});

// Chemin du CANVAS PRINCIPAL : tortue_lsysteme(axiome, regles, gen, angle) prend
// l'axiome et les règles comme PARAMÈTRES chaîne (tampons à longueur préfixée,
// en-tête à ptr-4), marshallés par l'hôte via __ml_str_alloc — sans DOM. Doit
// reproduire la tortue JS exactement comme le chemin DOM tracer_lsysteme.
const encodeurArgs = new TextEncoder();

function lireSommetsArgs(exports, memoryRef, axiom, rules, generations, angle) {
  exports.__ml_reset();
  const ecrire = (s) => {
    const b = encodeurArgs.encode(String(s ?? ""));
    const p = exports.__ml_str_alloc(b.length);
    if (b.length) new Uint8Array(memoryRef.current.buffer, p, b.length).set(b);
    return p;
  };
  const axPtr = ecrire(axiom);
  const ruPtr = ecrire(rules);
  const ptr = exports.tortue_lsysteme(axPtr, ruPtr, generations, angle);
  const base = Math.trunc(ptr);
  const view = new DataView(memoryRef.current.buffer);
  const np = view.getFloat64(base + 8, true);
  const pts = [];
  for (let k = 0; k < np; k++) {
    const o = base + 8 + 8 * (1 + PAS * k);
    pts.push({
      x: view.getFloat64(o, true),
      y: view.getFloat64(o + 8, true),
      move: view.getFloat64(o + 16, true),
      profondeur: view.getFloat64(o + 24, true),
      angle: view.getFloat64(o + 32, true),
    });
  }
  return { np, pts };
}

describe("Atelier L-systeme — tortue par arguments chaîne (canvas principal)", () => {
  for (const { nom, axiom, rules, angle, gens } of CAS) {
    for (const g of gens) {
      test(`${nom} génération ${g} — tortue_lsysteme(axiome, regles)`, async () => {
        const ref = pointsPropositionLSysteme(
          { axiom, rules, angle, generations: g, seed: 1 },
          { limit: 200000 },
        ).points;
        const { exports, memoryRef } = await instancier(axiom, rules);
        const { np, pts } = lireSommetsArgs(exports, memoryRef, axiom, rules, g, angle);
        assert.equal(np, ref.length, "nombre de sommets");
        let maxDelta = 0;
        for (let i = 0; i < np; i++) {
          const expectedMove = i === 0 || ref[i].move ? 1 : 0;
          assert.equal(pts[i].move, expectedMove, `drapeau move au point ${i}`);
          assert.equal(pts[i].profondeur, ref[i].profondeur || 0, `profondeur au point ${i}`);
          maxDelta = Math.max(maxDelta, Math.abs(pts[i].x - ref[i].x), Math.abs(pts[i].y - ref[i].y));
        }
        assert.ok(maxDelta < 1e-2, `écart de coordonnées trop grand : ${maxDelta}`);
      });
    }
  }
});
