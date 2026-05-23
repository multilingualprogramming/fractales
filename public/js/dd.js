"use strict";

/*
 * dd.js — Arithmétique double-double (Dekker) côté JavaScript.
 *
 * Sert exclusivement à la navigation (pan/zoom) lorsque le pixelSize tombe
 * sous ~1e-13 et que les sommes/différences en f64 perdent les bits
 * significatifs du centre de vue. Les paires sont représentées comme deux
 * f64 (hi, lo) tels que la vraie valeur ≈ hi + lo et |lo| ≤ ulp(hi)/2.
 *
 * Les mêmes primitives existent côté multilingual (src/fractales_deep_zoom.multi
 * — add_dd/sub_dd/mul_dd/two_sum/two_product) et sont utilisées par le noyau
 * de perturbation. Cette duplication évite un appel WASM par geste utilisateur.
 */

const SPLITTER = 134217729.0; // 2^27 + 1, suffisant sans FMA pour les |x| < 2^996

export function twoSum(a, b) {
  const s = a + b;
  const bb = s - a;
  const err = (a - (s - bb)) + (b - bb);
  return [s, err];
}

export function twoProduct(a, b) {
  const p = a * b;
  const ca = a * SPLITTER;
  const aHi = ca - (ca - a);
  const aLo = a - aHi;
  const cb = b * SPLITTER;
  const bHi = cb - (cb - b);
  const bLo = b - bHi;
  const err = ((aHi * bHi - p) + aHi * bLo + aLo * bHi) + aLo * bLo;
  return [p, err];
}

/** (aH + aL) + (bH + bL) → [hi, lo] (renormalisé). */
export function addDD(aH, aL, bH, bL) {
  const s = aH + bH;
  const bb = s - aH;
  let e = (aH - (s - bb)) + (bH - bb);
  e = e + aL + bL;
  const hi = s + e;
  const lo = e - (hi - s);
  return [hi, lo];
}

/** (aH + aL) − (bH + bL). */
export function subDD(aH, aL, bH, bL) {
  const s = aH - bH;
  const bb = s - aH;
  let e = (aH - (s - bb)) + (-bH - bb);
  e = e + aL - bL;
  const hi = s + e;
  const lo = e - (hi - s);
  return [hi, lo];
}

/** (aH + aL) · (bH + bL). */
export function mulDD(aH, aL, bH, bL) {
  const p = aH * bH;
  const ca = aH * SPLITTER;
  const ah = ca - (ca - aH);
  const al = aH - ah;
  const cb = bH * SPLITTER;
  const bh = cb - (cb - bH);
  const bl = bH - bh;
  let e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
  e = e + aH * bL + aL * bH;
  const hi = p + e;
  const lo = e - (hi - p);
  return [hi, lo];
}

/** (aH + aL) · k pour k f64 ; un peu moins cher que mulDD(aH, aL, k, 0). */
export function mulDDScalar(aH, aL, k) {
  return mulDD(aH, aL, k, 0);
}

/** (aH + aL) / k pour k f64 (k ≠ 0). Division Dekker. */
export function divDDScalar(aH, aL, k) {
  const q = aH / k;
  const [p, err] = twoProduct(q, k);
  const r = ((aH - p) - err + aL) / k;
  const hi = q + r;
  const lo = r - (hi - q);
  return [hi, lo];
}

/** Renvoie (aH + aL) sous forme f64 (perte de précision sciemment). */
export function toF64(aH, aL) {
  return aH + aL;
}

/** Renormalise un couple potentiellement non normalisé en [hi, lo]. */
export function normalizeDD(aH, aL) {
  const hi = aH + aL;
  const lo = aL - (hi - aH);
  return [hi, lo];
}
