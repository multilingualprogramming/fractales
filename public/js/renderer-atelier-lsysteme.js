"use strict";

/*
 * Pont JS minimal pour l'Atelier L-système.
 *
 * La grammaire L-système (réécriture) ET l'interprétation tortue (géométrie)
 * vivent en multilingual (src/atelier_lsysteme.multi → public/atelier_lsysteme.wasm).
 * Ce module ne fait que : charger le WASM avec le shim hôte GÉNÉRÉ (WASI + pont
 * DOM), appeler tracer_lsysteme(), puis tracer sur le canvas les sommets renvoyés.
 *
 * tracer_lsysteme(generations, angle_deg) :
 *   - lit #lsystem-axiom-input / #lsystem-rules-input via le pont DOM ;
 *   - écrit l'aperçu dans #lsystem-string-preview ;
 *   - renvoie un pointeur vers une liste : [0] = nombre de sommets np, puis
 *     np triplets (x, y, déplacer) — déplacer = 1 pour moveTo, 0 pour lineTo.
 *
 * L'allocateur WASM est de type bump (sans libération) : l'hôte appelle
 * __ml_reset() avant chaque invocation pour récupérer le tas.
 */

import {
  createWasiImports,
  createDomImports,
  writeStringToWasm,
} from "./atelier_lsysteme_shim.js?v=20260521-atelier-meta";

const WASM_URL = "atelier_lsysteme.wasm?v=20260521-atelier-meta";
const CAPACITE_CHAINE = 8000; // doit refléter CAPACITE dans le .multi

const memoryRef = { current: null };
const exportsRef = { current: null };
let instancePromise = null;

async function instancier() {
  const { wasi_snapshot_preview1 } = createWasiImports(memoryRef, () => {});
  const { env } = createDomImports(memoryRef, exportsRef);
  const importObject = { wasi_snapshot_preview1, env };

  let instance;
  try {
    const res = await WebAssembly.instantiateStreaming(fetch(WASM_URL), importObject);
    instance = res.instance;
  } catch {
    const resp = await fetch(WASM_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} pour ${WASM_URL}`);
    const bytes = await resp.arrayBuffer();
    const res = await WebAssembly.instantiate(bytes, importObject);
    instance = res.instance;
  }
  memoryRef.current = instance.exports.memory;
  exportsRef.current = instance.exports;
  return instance.exports;
}

/** Charge (une seule fois) le module WASM de l'atelier. */
export function chargerAtelierLSysteme() {
  if (!instancePromise) {
    instancePromise = instancier().catch((err) => {
      instancePromise = null;
      throw err;
    });
  }
  return instancePromise;
}

// Disposition de sortie : [0] = np, puis np quintuplets
// (x, y, déplacer, profondeur, angle). Pas de 5 valeurs par sommet.
const PAS_SOMMET = 5;

// Marshalling JS → WASM délégué à `writeStringToWasm` du shim multilingual
// (W17, 2026-05-25) : encode UTF-8, appelle __ml_str_alloc, copie les octets.

/**
 * Calcule les sommets de la tortue DIRECTEMENT depuis une grammaire passée en
 * arguments (axiome/règles comme chaînes), sans toucher au DOM. SYNCHRONE :
 * renvoie null si le module WASM n'est pas encore chargé (l'appelant doit alors
 * se rabattre sur le chemin JS). À appeler après chargerAtelierLSysteme().
 *
 * Renvoie un tableau de sommets { x, y, move, profondeur, angle } compatible
 * avec le chemin JS pointsPropositionLSysteme(), ou null si indisponible.
 * Réinitialise le tas, marshalle les deux chaînes en tampons à en-tête de
 * longueur, puis appelle l'export tortue_lsysteme(axiome, regles, gen, angle).
 */
// Lit les sommets renvoyés (liste stride-5 [count, x,y,move,prof,ang ...]) à
// partir d'un pointeur f64 issu d'un export tortue, et matérialise un tableau
// d'objets { x, y, move, profondeur, angle } compatible avec le chemin JS.
// Tout passe par __ml_list_item (B5) : le pointeur retourné par tortue_lsysteme
// peut tomber sur un offset non aligné f64 (les __ml_str_alloc en amont
// produisent des tailles arbitraires), ce qui interdit une vue Float64Array.
function lireSommetsDepuisPtr(ptr) {
  const item = exportsRef.current.__ml_list_item;
  const count = item(ptr, 0);
  const points = new Array(Math.max(0, count));
  for (let k = 0; k < count; k++) {
    const o = 1 + PAS_SOMMET * k;
    points[k] = {
      x: item(ptr, o),
      y: item(ptr, o + 1),
      move: item(ptr, o + 2) === 1,
      profondeur: item(ptr, o + 3),
      angle: item(ptr, o + 4),
    };
  }
  return points;
}

export function sommetsGrammaireWasmSync(axiom, rules, generations, angleDeg) {
  const exports = exportsRef.current;
  if (!exports || !exports.tortue_lsysteme || !exports.__ml_str_alloc) return null;
  if (!memoryRef.current) return null;

  exports.__ml_reset();
  const axPtr = writeStringToWasm(exports.__ml_str_alloc, memoryRef.current, axiom);
  const ruPtr = writeStringToWasm(exports.__ml_str_alloc, memoryRef.current, rules);
  const ptr = exports.tortue_lsysteme(axPtr, ruPtr, Number(generations) || 0, Number(angleDeg) || 0);
  return lireSommetsDepuisPtr(ptr);
}

/**
 * Calcule les sommets de la tortue depuis une chaîne DÉJÀ développée. SYNCHRONE.
 * Permet aux grammaires stochastiques de garder leur expansion JS bit-pour-bit
 * (RNG FNV+mulberry32 non porté en WAT) tout en utilisant la tortue WASM.
 * Renvoie null si le module n'est pas encore chargé (l'appelant doit alors se
 * rabattre sur le chemin JS).
 */
export function sommetsCheminWasmSync(sequence, angleDeg) {
  const exports = exportsRef.current;
  if (!exports || !exports.tortue_chemin_brut || !exports.__ml_str_alloc) return null;
  if (!memoryRef.current) return null;

  exports.__ml_reset();
  const seqPtr = writeStringToWasm(exports.__ml_str_alloc, memoryRef.current, sequence);
  const ptr = exports.tortue_chemin_brut(seqPtr, Number(angleDeg) || 0);
  return lireSommetsDepuisPtr(ptr);
}

/**
 * Calcule les sommets L-système via WASM (réinitialise le tas au préalable).
 * Renvoie { sommets: Float64Array (x,y,move,prof,angle par sommet), count }
 * ou null si indisponible. Valide jusqu'au prochain appel (réinit. du tas).
 */
async function calculerSommets(generations, angleDeg) {
  const exports = await chargerAtelierLSysteme();
  exports.__ml_reset();
  const ptr = exports.tracer_lsysteme(Number(generations) || 0, Number(angleDeg) || 0);
  const item = exports.__ml_list_item;
  const count = item(ptr, 0);
  // Copie via __ml_list_item (B5) — l'appelant garde le buffer après un éventuel
  // __ml_reset() ultérieur ; le pointeur peut être non aligné f64.
  const sommets = new Float64Array(Math.max(0, count) * PAS_SOMMET);
  for (let k = 0; k < count; k++) {
    const o = 1 + PAS_SOMMET * k;
    const base = PAS_SOMMET * k;
    sommets[base] = item(ptr, o);
    sommets[base + 1] = item(ptr, o + 1);
    sommets[base + 2] = item(ptr, o + 2);
    sommets[base + 3] = item(ptr, o + 3);
    sommets[base + 4] = item(ptr, o + 4);
  }
  return { sommets, count };
}

/**
 * Trace la proposition L-système sur *canvas* à partir des sommets calculés en
 * WASM, en mettant à l'échelle pour remplir le canvas. tracer_lsysteme écrit
 * aussi l'aperçu texte (#lsystem-string-preview). Renvoie { pointsCount,
 * truncated } pour le compte-rendu, ou un objet par défaut en cas d'échec.
 */
export async function dessinerPropositionLSystemeWasm(canvas, generations, angleDeg) {
  try {
    const { sommets, count } = await calculerSommets(generations, angleDeg);
    if (!canvas) return { pointsCount: count, truncated: count >= CAPACITE_CHAINE };

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(2, 4, 10, 0.96)";
    ctx.fillRect(0, 0, w, h);
    if (count < 2) return { pointsCount: count, truncated: false };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let k = 0; k < count; k++) {
      const x = sommets[PAS_SOMMET * k];
      const y = sommets[PAS_SOMMET * k + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const scale = Math.min(
      (w - 28) / Math.max(1, maxX - minX),
      (h - 28) / Math.max(1, maxY - minY),
    );
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    for (let k = 0; k < count; k++) {
      const px = 14 + (sommets[PAS_SOMMET * k] - minX) * scale;
      const py = h - 14 - (sommets[PAS_SOMMET * k + 1] - minY) * scale;
      if (k === 0 || sommets[PAS_SOMMET * k + 2] === 1) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    return { pointsCount: count, truncated: count >= CAPACITE_CHAINE };
  } catch (err) {
    console.warn("[atelier-lsysteme] WASM indisponible :", err);
    return { pointsCount: 0, truncated: false, erreur: true };
  }
}
