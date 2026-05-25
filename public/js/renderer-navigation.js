"use strict";

/**
 * renderer-navigation.js — Partage de vues, zoom animé, rotation
 *
 * Les fonctions mathématiques (easing, interpolation log du pixelSize,
 * interpolation d'angle) sont définies dans src/fractales_navigation.multi
 * et compilées vers WASM. Ce module les appelle via wasmNav, avec des
 * fallbacks JS identiques si le WASM n'est pas encore chargé.
 *
 * Le formatage à précision fixe (toFixed(2/3/5/6)) et la validation
 * numérique des champs déclenchés par decoderEtat passent par WASM quand
 * `wasmPartage` est fourni (cf. src/fractales_partage.multi). Le formatage
 * exponentiel reste JS (le backend WAT ne fournit pas `.Ne`).
 */

const JULIA_FRACTALS = new Set(["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"]);
const FRACTALES_3D = new Set(["menger_sponge", "tetraedre_sierpinski", "julia_quaternion", "mandelbox"]);

let hashDebounceTimer = null;
// Module-level handle to fractales_partage WASM exports (formatter_fixe_*,
// valider_*, memory, strLen). Set par initialiserPartage ; encoderEtat/
// decoderEtat l'utilisent quand disponible.
let wasmPartageRef = null;

function lireChainePartage(ptrF64) {
  if (!wasmPartageRef?.memory || !wasmPartageRef?.strLen) return null;
  const len = wasmPartageRef.strLen();
  if (len === 0) return "";
  return new TextDecoder("utf-8").decode(
    new Uint8Array(wasmPartageRef.memory.buffer, Math.trunc(ptrF64), len),
  );
}

function fixeWasm(fn, v, n = null) {
  // Préserve la sémantique de toFixed : sortie de longueur fixe, sans
  // notation exponentielle. WASM partage peut différer d'1 ULP du dernier
  // chiffre sur les milieux (round half-to-even vs JS half-away-from-zero) ;
  // pour le hash de partage c'est négligeable.
  // Signature : `n === null` ⇒ ancien chemin (fn(v) — exponentiel) ; `n !== null` ⇒
  // nouveau chemin formatter_fixe(v, n) avec n runtime depuis multilingual B4.
  if (!wasmPartageRef?.partage || !wasmPartageRef?.reset) return null;
  wasmPartageRef.reset();
  const ptr = n === null ? fn(v) : fn(v, n);
  return lireChainePartage(ptr);
}

function formatFlottant(n) {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs < 0.0001 || abs >= 100000) {
    // Chemin WASM canonique (cf. fractales_partage.multi : formatter_exponentiel_9)
    // — round-trip parseFloat-fidèle, simple normalisation des zéros de queue.
    const fe = wasmPartageRef?.partage?.formatter_exponentiel_9;
    const wasm = fixeWasm(fe, n);
    if (wasm !== null) return wasm.replace(/\.?0+e/, "e").replace("e+", "e");
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
    p.set("ps", fixeWasm(wasmPartageRef?.partage?.formatter_exponentiel_8, view.pixelSize) ?? view.pixelSize.toExponential(8).replace("e+", "e"));
    if (view.rotation !== 0) {
      p.set("r", fixeWasm(wasmPartageRef?.partage?.formatter_fixe, view.rotation, 5) ?? view.rotation.toFixed(5));
    }
    // Partie basse double-double : ajoutée UNIQUEMENT en zoom très profond,
    // où l'addition centerX + pixelSize·offset perd des bits. Préserve la
    // précision sub-f64 lors d'un partage de lien.
    if (view.centerX_lo) p.set("xlo", fixeWasm(wasmPartageRef?.partage?.formatter_exponentiel_8, view.centerX_lo) ?? view.centerX_lo.toExponential(8).replace("e+", "e"));
    if (view.centerY_lo) p.set("ylo", fixeWasm(wasmPartageRef?.partage?.formatter_exponentiel_8, view.centerY_lo) ?? view.centerY_lo.toExponential(8).replace("e+", "e"));
  }
  p.set("i", String(params.maxIter));
  if (params.palette && params.palette !== "aurora") p.set("p", params.palette);
  if (params.fractal === "multibrot") p.set("pr", String(params.multibrotPower));
  const fF = wasmPartageRef?.partage?.formatter_fixe;
  if (JULIA_FRACTALS.has(params.fractal)) {
    p.set("jr", fixeWasm(fF, params.juliaCre, 6) ?? params.juliaCre.toFixed(6));
    p.set("ji", fixeWasm(fF, params.juliaCim, 6) ?? params.juliaCim.toFixed(6));
  }
  if (params.coloringMode && params.coloringMode !== "standard") p.set("cm", params.coloringMode);
  if (params.palettePhase) {
    const v = Number(params.palettePhase);
    p.set("ph", fixeWasm(fF, v, 3) ?? v.toFixed(3));
  }
  if (params.paletteContours) p.set("pc", "1");
  if (params.lsystemLineColor && params.lsystemLineColor !== "progression") p.set("lc", params.lsystemLineColor);
  if (params.lsystemStrokeWidth && params.lsystemStrokeWidth !== 1.35) {
    const v = Number(params.lsystemStrokeWidth);
    p.set("lsw", fixeWasm(fF, v, 2) ?? v.toFixed(2));
  }
  if (params.deepZoomAutoIterations) p.set("azi", "1");
  if (params.deepZoomQuality && params.deepZoomQuality !== "standard") p.set("q", params.deepZoomQuality);
  if (params.studio3dMaterial && params.studio3dMaterial !== "lumineux") p.set("mat", params.studio3dMaterial);
  if (params.studio3dFog) {
    const v = Number(params.studio3dFog);
    p.set("fog", fixeWasm(fF, v, 2) ?? v.toFixed(2));
  }
  if (params.weatherOverlays) p.set("ov", params.weatherOverlays);
  if (params.lsystemProposalActive) {
    p.set("lp", "1");
    p.set("lg", String(params.lsystemGenerations ?? 4));
    p.set("la", String(params.lsystemAngle ?? 60));
    p.set("lax", params.lsystemAxiom ?? "F");
    p.set("lr", params.lsystemRules ?? "F=F+F--F+F");
    p.set("ls", String(params.lsystemSeed ?? 1));
    if (params.lsystemPreset) p.set("lpr", params.lsystemPreset);
  }
  if (params.coordTransform && params.coordTransform !== "aucune") {
    p.set("ct", params.coordTransform);
    if (params.coordTransform === "mobius" && params.mobiusPreset) p.set("mp", params.mobiusPreset);
  }
  if (params.formulePropositionActive) {
    p.set("fpa", "1");
    p.set("ffi", params.formuleIteration ?? "z*z+c");
    p.set("ffe", String(params.formuleEscapeRadius ?? 2));
    p.set("ffm", params.formuleMode ?? "mandelbrot");
    p.set("ffa", String(params.formuleParamA ?? 0));
    p.set("ffb", String(params.formuleParamB ?? 0));
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
    // Partie basse double-double absente (ou 0) pour les liens classiques ;
    // restaurée à 0 par défaut pour préserver l'invariant `vraie position ≈
    // centerX + centerX_lo`.
    centerX_lo: num("xlo") ?? 0,
    centerY_lo: num("ylo") ?? 0,
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
    lsystemLineColor: p.get("lc") ?? "progression",
    lsystemStrokeWidth: num("lsw") ?? 1.35,
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
    lsystemSeed: p.get("ls") ?? undefined,
    lsystemPreset: p.get("lpr") ?? undefined,
    coordTransform: p.get("ct") ?? "aucune",
    mobiusPreset: p.get("mp") ?? "inversion_cercle",
    formulePropositionActive: p.get("fpa") === "1",
    formuleIteration: p.get("ffi") ?? undefined,
    formuleEscapeRadius: num("ffe"),
    formuleMode: p.get("ffm") ?? undefined,
    formuleParamA: num("ffa"),
    formuleParamB: num("ffb"),
  };

  // Validation numérique : exécutée via WASM (fractales_partage) si chargé,
  // sinon JS. La sémantique est identique — un seul aller-retour WASM pour
  // l'état complet via `valider_etat_complet`.
  const v = wasmPartageRef?.partage;
  if (v && etat.centerX !== undefined && etat.pixelSize !== undefined && etat.maxIter !== undefined) {
    if (v.valider_etat_complet(etat.centerX, etat.centerY ?? 0, etat.pixelSize, etat.maxIter, etat.rotation ?? 0) < 0.5) {
      return null;
    }
  } else {
    if (etat.centerX !== undefined && !isFinite(etat.centerX)) return null;
    if (etat.centerY !== undefined && !isFinite(etat.centerY)) return null;
    if (etat.pixelSize !== undefined && (!isFinite(etat.pixelSize) || etat.pixelSize <= 0)) return null;
    if (etat.maxIter !== undefined && (!Number.isInteger(etat.maxIter) || etat.maxIter < 1)) return null;
  }

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
export function animerVersVue(cible, { view, wasmNav, render, onComplete, dureeMs: dureeForcee }) {
  return new Promise((resolve) => {
    if (cible.centerX === undefined || cible.pixelSize === undefined) {
      onComplete?.();
      resolve();
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
    const dureeAuto = Math.min(2800, 500 + Math.log(Math.max(1, rapport)) * 500);
    // Le caller peut forcer une duree (carnet de voyage : transitions cinematiques)
    // ; sinon on calcule depuis le rapport de zoom.
    const dureeMs = Number.isFinite(dureeForcee) && dureeForcee > 0
      ? Math.min(60000, Math.max(120, dureeForcee))
      : dureeAuto;

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
      // Pendant l'animation, les parties basses double-double sont à 0 ; à la
      // dernière image, on applique la partie basse de la cible (si présente).
      view.centerX_lo = 0;
      view.centerY_lo = 0;
      view.pixelSize = interpPs(startPs, cible.pixelSize, te);
      view.rotation = interpAngle(startRot, targetRot, te);
      render();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        view.centerX = cible.centerX;
        view.centerY = cible.centerY;
        view.centerX_lo = cible.centerX_lo ?? 0;
        view.centerY_lo = cible.centerY_lo ?? 0;
        onComplete?.();
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

export function initialiserPartage({ getView, getParams, updateStatusBar, getWasmMetaPanels }) {
  if (typeof getWasmMetaPanels === "function") {
    wasmPartageRef = getWasmMetaPanels();
  }
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
