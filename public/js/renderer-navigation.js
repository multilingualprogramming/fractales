"use strict";

/**
 * renderer-navigation.js — Partage de vues, zoom animé, rotation
 *
 * Les fonctions mathématiques (easing, interpolation log du pixelSize,
 * interpolation d'angle) sont définies dans src/fractales_navigation.multi
 * et compilées vers WASM. Ce module les appelle via wasmNav, avec des
 * fallbacks JS identiques si le WASM n'est pas encore chargé.
 */

const JULIA_FRACTALS = new Set(["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"]);
const FRACTALES_3D = new Set(["tetraedre_sierpinski", "julia_quaternion", "mandelbox"]);

let hashDebounceTimer = null;

function formatFlottant(n) {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs < 0.0001 || abs >= 100000) {
    return n.toExponential(10).replace(/\.?0+e/, "e").replace("e+", "e");
  }
  return n.toPrecision(12).replace(/\.?0+$/, "");
}

export function encoderEtat(view, params) {
  const p = new URLSearchParams();
  p.set("f", params.fractal);
  if (!FRACTALES_3D.has(params.fractal)) {
    p.set("x", formatFlottant(view.centerX));
    p.set("y", formatFlottant(view.centerY));
    p.set("ps", view.pixelSize.toExponential(8).replace("e+", "e"));
    if (view.rotation !== 0) p.set("r", view.rotation.toFixed(5));
  }
  p.set("i", String(params.maxIter));
  if (params.palette && params.palette !== "aurora") p.set("p", params.palette);
  if (params.fractal === "multibrot") p.set("pr", String(params.multibrotPower));
  if (JULIA_FRACTALS.has(params.fractal)) {
    p.set("jr", params.juliaCre.toFixed(6));
    p.set("ji", params.juliaCim.toFixed(6));
  }
  if (params.coloringMode && params.coloringMode !== "standard") p.set("cm", params.coloringMode);
  if (params.palettePhase) p.set("ph", Number(params.palettePhase).toFixed(3));
  if (params.paletteContours) p.set("pc", "1");
  if (params.deepZoomAutoIterations) p.set("azi", "1");
  if (params.deepZoomQuality && params.deepZoomQuality !== "standard") p.set("q", params.deepZoomQuality);
  if (params.studio3dMaterial && params.studio3dMaterial !== "lumineux") p.set("mat", params.studio3dMaterial);
  if (params.studio3dFog) p.set("fog", Number(params.studio3dFog).toFixed(2));
  if (params.weatherOverlays) p.set("ov", params.weatherOverlays);
  if (params.lsystemProposalActive) {
    p.set("lp", "1");
    p.set("lg", String(params.lsystemGenerations ?? 4));
    p.set("la", String(params.lsystemAngle ?? 60));
    p.set("lax", params.lsystemAxiom ?? "F");
    p.set("lr", params.lsystemRules ?? "F=F+F--F+F");
  }
  return "#" + p.toString();
}

export function decoderEtat(hash) {
  const raw = hash && hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  let p;
  try {
    p = new URLSearchParams(raw);
  } catch {
    return null;
  }
  const fractal = p.get("f");
  if (!fractal) return null;

  const num = (key) => { const v = p.get(key); return v !== null ? parseFloat(v) : undefined; };
  const ent = (key) => { const v = p.get(key); return v !== null ? parseInt(v, 10) : undefined; };

  const etat = {
    fractal,
    centerX: num("x"),
    centerY: num("y"),
    pixelSize: num("ps"),
    rotation: num("r") ?? 0,
    maxIter: ent("i"),
    palette: p.get("p") ?? "aurora",
    multibrotPower: ent("pr"),
    juliaCre: num("jr"),
    juliaCim: num("ji"),
    coloringMode: p.get("cm") ?? "standard",
    palettePhase: num("ph") ?? 0,
    paletteContours: p.get("pc") === "1",
    deepZoomAutoIterations: p.get("azi") === "1",
    deepZoomQuality: p.get("q") ?? "standard",
    studio3dMaterial: p.get("mat") ?? "lumineux",
    studio3dFog: num("fog") ?? 0,
    weatherOverlays: p.get("ov") ?? "",
    lsystemProposalActive: p.get("lp") === "1",
    lsystemGenerations: ent("lg"),
    lsystemAngle: num("la"),
    lsystemAxiom: p.get("lax") ?? undefined,
    lsystemRules: p.get("lr") ?? undefined,
  };

  if (etat.centerX !== undefined && !isFinite(etat.centerX)) return null;
  if (etat.centerY !== undefined && !isFinite(etat.centerY)) return null;
  if (etat.pixelSize !== undefined && (!isFinite(etat.pixelSize) || etat.pixelSize <= 0)) return null;
  if (etat.maxIter !== undefined && (!Number.isInteger(etat.maxIter) || etat.maxIter < 1)) return null;

  return etat;
}

export function mettreAJourHash(view, params) {
  clearTimeout(hashDebounceTimer);
  hashDebounceTimer = setTimeout(() => {
    try {
      history.replaceState(null, "", encoderEtat(view, params));
    } catch {}
  }, 400);
}

/**
 * Anime la vue courante vers une vue cible.
 * Les fonctions d'easing et d'interpolation viennent de fractales_navigation.multi (WASM).
 *
 * @param {object} cible  — { centerX, centerY, pixelSize, rotation? }
 * @param {object} opts   — { view, wasmNav, render, onComplete? }
 */
export function animerVersVue(cible, { view, wasmNav, render, onComplete }) {
  if (cible.centerX === undefined || cible.pixelSize === undefined) {
    onComplete?.();
    return;
  }

  const startX = view.centerX;
  const startY = view.centerY;
  const startPs = view.pixelSize;
  const startRot = view.rotation ?? 0;
  const targetRot = cible.rotation ?? startRot;

  const rapport = startPs > 0
    ? Math.max(startPs, cible.pixelSize) / Math.min(startPs, cible.pixelSize)
    : 1;
  const dureeMs = Math.min(2800, 500 + Math.log(Math.max(1, rapport)) * 500);

  // Fonctions mathématiques depuis fractales_navigation.multi via WASM
  const easer = (t) =>
    wasmNav?.easer_cubique ? wasmNav.easer_cubique(t) : t * t * (3 - 2 * t);

  const interpPs = (a, b, t) => {
    if (wasmNav?.interpoler_pixelsize_nav) return wasmNav.interpoler_pixelsize_nav(a, b, t);
    if (a <= 0) return b;
    return a * Math.pow(b / a, t);
  };

  const interpAngle = (a, b, t) => {
    if (wasmNav?.interpoler_angle_nav) return wasmNav.interpoler_angle_nav(a, b, t);
    let diff = b - a;
    const TAU = Math.PI * 2;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    return a + diff * t;
  };

  const debut = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - debut) / dureeMs);
    const te = easer(t);
    view.centerX = startX + (cible.centerX - startX) * te;
    view.centerY = startY + (cible.centerY - startY) * te;
    view.pixelSize = interpPs(startPs, cible.pixelSize, te);
    view.rotation = interpAngle(startRot, targetRot, te);
    render();
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete?.();
    }
  }

  requestAnimationFrame(frame);
}

export function initialiserPartage({ getView, getParams, updateStatusBar }) {
  const btn = document.getElementById("btn-partager");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const url = location.origin + location.pathname + encoderEtat(getView(), getParams());
    try {
      await navigator.clipboard.writeText(url);
      updateStatusBar("Lien copié dans le presse-papiers", true);
    } catch {
      updateStatusBar("Lien : " + url, false);
    }
  });
}
