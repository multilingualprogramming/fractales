/**
 * Tests d'intégration : l'expansion L-système compilée vers WASM
 * (src/atelier_lsysteme.multi → public/atelier_lsysteme.wasm) doit produire
 * la même chaîne que l'implémentation JavaScript de référence.
 *
 * Charge le module avec le shim WASI GÉNÉRÉ (atelier_lsysteme_shim.js) et un
 * DOM simulé fournissant le pont ml_dom_* (le vrai pont utilise `document`,
 * indisponible sous node).
 *
 * Run with: node --test tests/atelier_lsysteme_wasm.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { genererPropositionLSysteme } from "../public/js/renderer-lsystem.js";
import { createWasiImports } from "../public/js/atelier_lsysteme_shim.js";

const ICI = dirname(fileURLToPath(import.meta.url));
const WASM_PATH = join(ICI, "..", "public", "atelier_lsysteme.wasm");
const APERCU_MAX = 600;

const wasmBytes = await readFile(WASM_PATH);

/** Instancie le module avec un DOM simulé ; renvoie {exports, elements}. */
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
    ml_dom_get(p, l) { const id = read(p, l); const h = next++; handles.set(h, elements[id] ?? null); return h; },
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
  return { exports: instance.exports, elements };
}

// Grammaires déterministes ; générations choisies pour rester sous la
// capacité de matérialisation (8000) afin que WASM et JS produisent la
// chaîne complète.
const CAS = [
  { nom: "Koch", axiom: "F", rules: "F=F+F--F+F", gens: [1, 2, 3, 4, 5] },
  // Générations bornées à 8 (plage réelle du curseur #lsystem-generation-slider).
  { nom: "Dragon de Heighway", axiom: "FX", rules: "X=X+YF+;Y=-FX-Y", gens: [1, 4, 6, 8] },
  { nom: "grille", axiom: "F", rules: "F=F+F+F+F", gens: [1, 2, 3, 4] },
  { nom: "plante (déterministe)", axiom: "X", rules: "X=F-[[X]+X]+F[+FX]-X;F=FF", gens: [1, 2, 3, 4] },
];

describe("Atelier L-systeme — parité WASM ↔ JS", () => {
  for (const { nom, axiom, rules, gens } of CAS) {
    for (const g of gens) {
      test(`${nom} génération ${g}`, async () => {
        const ref = genererPropositionLSysteme({ axiom, rules, generations: g, seed: 1 }).sequence;
        const { exports, elements } = await instancier(axiom, rules);
        const n = exports.rafraichir_lsysteme(g);
        assert.equal(n, ref.length, "longueur de la chaîne");
        assert.equal(
          elements["lsystem-string-preview"].textContent,
          ref.slice(0, Math.min(ref.length, APERCU_MAX)),
          "aperçu écrit dans le DOM",
        );
      });
    }
  }
});
