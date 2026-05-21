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

/**
 * Calcule les sommets L-système via WASM (réinitialise le tas au préalable).
 * Renvoie { sommets: Float64Array (x,y,move,prof,angle par sommet), count }
 * ou null si indisponible. Valide jusqu'au prochain appel (réinit. du tas).
 */
async function calculerSommets(generations, angleDeg) {
  const exports = await chargerAtelierLSysteme();
  exports.__ml_reset();
  const ptr = exports.tracer_lsysteme(Number(generations) || 0, Number(angleDeg) || 0);
  const base = Math.trunc(ptr);
  const view = new DataView(memoryRef.current.buffer);
  const count = view.getFloat64(base + 8, true); // élément [0] = np
  const sommets = new Float64Array(Math.max(0, count) * PAS_SOMMET);
  for (let k = 0; k < count; k++) {
    const o = base + 8 + 8 * (1 + PAS_SOMMET * k);
    sommets[PAS_SOMMET * k] = view.getFloat64(o, true);
    sommets[PAS_SOMMET * k + 1] = view.getFloat64(o + 8, true);
    sommets[PAS_SOMMET * k + 2] = view.getFloat64(o + 16, true);
    sommets[PAS_SOMMET * k + 3] = view.getFloat64(o + 24, true);
    sommets[PAS_SOMMET * k + 4] = view.getFloat64(o + 32, true);
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
