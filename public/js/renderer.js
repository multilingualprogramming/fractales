/**
 * renderer.js — Explorateur de Fractales
 *
 * Charge mandelbrot.wasm (compilé depuis le source français multilingual),
 * rend l'ensemble de Mandelbrot sur un <canvas>, et gère toute l'interactivité.
 *
 * Pipeline : source français (.ml) ? WASM (build-time) ? browser WebAssembly API
 */

"use strict";

const WASM_URL = "mandelbrot.wasm?v=20260228r10";

// ============================================================
// ÉTAT DE L'APPLICATION
// ============================================================

/** Paramètres de la vue courante (plan complexe) */
const view = {
  centerX: -0.5,
  centerY: 0.0,
  /** unités mathématiques par pixel */
  pixelSize: 4.0 / Math.min(window.innerWidth - 380, 800),
};

/** Paramètres de rendu */
const params = {
  maxIter: 256,
  fractal: "mandelbrot", // fractale active
  multibrotPower: 5,
  juliaCre: -0.8,
  juliaCim: 0.156,
  palette: "aurora",   // "feu" | "ocean" | "aurora"
};

const VIEW_PRESETS = {
  mandelbrot:   { centerX: -0.5, centerY: 0.0, span: 3.5 },
  mandelbrot_classe: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  julia:        { centerX: 0.0,  centerY: 0.0, span: 3.0 },
  burning_ship: { centerX: -0.5, centerY: -0.5, span: 3.0 },
  tricorn:      { centerX: -0.5, centerY: 0.0, span: 3.5 },
  multibrot:    { centerX: 0.0, centerY: 0.0, span: 2.8 },
  celtic:       { centerX: -0.5, centerY: 0.0, span: 3.2 },
  buffalo:      { centerX: -0.5, centerY: 0.0, span: 3.2 },
  perpendicular_burning_ship: { centerX: -0.5, centerY: -0.4, span: 3.0 },
  heart:        { centerX: -0.2, centerY: 0.0, span: 3.0 },
  perpendicular_mandelbrot: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  perpendicular_celtic: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  duck:         { centerX: -0.5, centerY: 0.0, span: 3.0 },
  buddhabrot:   { centerX: -0.5, centerY: 0.0, span: 3.2 },
  newton:       { centerX: 0.0,  centerY: 0.0, span: 3.0 },
  phoenix:      { centerX: -0.5, centerY: 0.0, span: 3.2 },
  lyapunov:     { centerX: 3.1,  centerY: 3.1, span: 1.7 },
  lyapunov_multisequence: { centerX: 3.1, centerY: 3.1, span: 1.7 },
  bassin_newton_generalise: { centerX: 0.0, centerY: 0.0, span: 3.2 },
  orbitale_de_nova: { centerX: 0.0, centerY: 0.0, span: 2.1 },
  collatz_complexe: { centerX: -0.35, centerY: 0.0, span: 3.6 },
  attracteur_de_clifford: { centerX: 0.0, centerY: 0.0, span: 4.8 },
  attracteur_de_peter_de_jong: { centerX: 0.0, centerY: 0.0, span: 4.8 },
  attracteur_ikeda: { centerX: 0.68, centerY: -0.67, span: 3.9 },
  attracteur_de_henon: { centerX: 0.3, centerY: 0.1, span: 3.0 },
  lorenz_attractor: { centerX: 0.0, centerY: -0.2, span: 7.2 },
  feigenbaum_tree: { centerX: 0.45, centerY: 0.0, span: 2.2 },
  barnsley:     { centerX: 0.0,  centerY: 5.0, span: 9.0 },
  sierpinski:   { centerX: 0.5,  centerY: 0.35, span: 1.0 },
  tapis_sierpinski: { centerX: 0.0, centerY: 0.0, span: 2.2 },
  menger_sponge: { centerX: 0.0, centerY: 0.0, span: 3.2 },
  mandelbulb: { centerX: 0.0, centerY: 0.0, span: 3.6 },
  tetraedre_sierpinski: { centerX: 0.0, centerY: 0.0, span: 1.6 },
  julia_quaternion: { centerX: 0.0, centerY: 0.0, span: 2.6 },
  mandelbox: { centerX: 0.0, centerY: 0.3, span: 7.0 },
  vicsek_fractal: { centerX: 0.0, centerY: 0.0, span: 3.0 },
  lichtenberg_figures: { centerX: 0.0, centerY: 0.0, span: 3.8 },
  koch:         { centerX: 0.45, centerY: -0.28, span: 0.9 },
  dragon_heighway: { centerX: 0.2, centerY: 0.0, span: 2.8 },
  dragon_curve: { centerX: 0.2, centerY: 0.0, span: 2.8 },
  cantor_set:   { centerX: 0.0, centerY: 0.0, span: 2.6 },
  apollonian_gasket: { centerX: 0.0, centerY: 0.05, span: 2.4 },
  t_square_fractal: { centerX: 0.0, centerY: 0.0, span: 2.8 },
  h_fractal: { centerX: 0.0, centerY: 0.0, span: 2.8 },
  hilbert_curve: { centerX: 0.0, centerY: 0.0, span: 2.3 },
  peano_curve: { centerX: 0.0, centerY: 0.0, span: 2.3 },
  arbre_pythagore: { centerX: 0.0, centerY: 0.7, span: 2.6 },
  magnet1:      { centerX: 1.5,  centerY: 0.0, span: 4.0 },
  magnet2:      { centerX: 1.5,  centerY: 0.0, span: 5.0 },
  magnet3:      { centerX: 1.2,  centerY: 0.0, span: 4.4 },
  lambda_fractale: { centerX: 0.0, centerY: 0.0, span: 8.0 },
  lambda_cubique: { centerX: 0.0, centerY: 0.0, span: 6.2 },
  magnet_cosinus: { centerX: 0.0, centerY: 0.0, span: 4.6 },
  magnet_sinus:   { centerX: 0.0, centerY: 0.0, span: 4.6 },
  nova_magnetique: { centerX: 0.0, centerY: 0.0, span: 3.2 },
};

function getMultibrotPreset(power) {
  const p = Number.isFinite(power) ? power : 5;
  // Higher powers concentrate details near the origin.
  if (p >= 7) return { centerX: 0.0, centerY: 0.0, span: 1.6 };
  if (p >= 5) return { centerX: 0.0, centerY: 0.0, span: 1.8 };
  return { centerX: 0.0, centerY: 0.0, span: 2.2 };
}

const POINT_FRACTALS = new Set(["barnsley", "sierpinski", "tapis_sierpinski", "menger_sponge", "mandelbulb", "tetraedre_sierpinski", "mandelbox", "vicsek_fractal", "lichtenberg_figures", "attracteur_de_clifford", "attracteur_de_peter_de_jong", "attracteur_ikeda", "attracteur_de_henon", "lorenz_attractor", "feigenbaum_tree"]);
const LINE_FRACTALS = new Set(["koch", "dragon_heighway", "dragon_curve", "cantor_set", "apollonian_gasket", "t_square_fractal", "h_fractal", "hilbert_curve", "peano_curve", "arbre_pythagore"]);

/** Fonctions fractales exportées par WASM */
// Les fractales 3D en JS pur (julia_quaternion, mandelbox) sont toujours disponibles.
let wasmFunctions = {
  julia_quaternion: juliaQuaternionJS,
  mandelbox: mandelboxJS,
};
let wasmExportFunctions = {};
/** True si le module WASM est disponible */
let wasmAvailable = false;
/** Timestamp de début du dernier rendu */
let renderStart = 0;
/** True si un rendu est en cours */
let rendering = false;
/** Identifiant monotone pour invalider les rendus obsolètes */
let renderToken = 0;
/** ImageData réutilisable */
let imageDataBuffer = null;
let vueExportDepart = null;
let vueExportArrivee = null;

// ============================================================
// ÉLÉMENTS DOM
// ============================================================

const canvas        = document.getElementById("fractal-canvas");
const ctx           = canvas.getContext("2d", { willReadFrequently: false });
const renderStatus  = document.getElementById("render-status");
const coordsDisplay = document.getElementById("coords-display");
const iterSlider    = document.getElementById("iter-slider");
const iterValue     = document.getElementById("iter-value");
const familySelect  = document.getElementById("family-select");
const fractalSelect = document.getElementById("fractal-select");
const multibrotPower = document.getElementById("multibrot-power");
const paletteSelect = document.getElementById("palette-select");
const btnReset      = document.getElementById("btn-reset");
const btnPanUp      = document.getElementById("btn-pan-up");
const btnPanLeft    = document.getElementById("btn-pan-left");
const btnPanRight   = document.getElementById("btn-pan-right");
const btnPanDown    = document.getElementById("btn-pan-down");
const btnZoomIn     = document.getElementById("btn-zoom-in");
const btnZoomOut    = document.getElementById("btn-zoom-out");
const btnTogglePan  = document.getElementById("btn-toggle-pan");
const btnToggle      = document.getElementById("btn-toggle-sidebar");
const btnCloseSidebar = document.getElementById("btn-close-sidebar");
const btnOpenExport = document.getElementById("btn-open-export");
const btnCloseExport = document.getElementById("btn-close-export");
const btnExportCurrent = document.getElementById("btn-export-current");
const btnExportImage = document.getElementById("btn-export-image");
const btnCaptureStart = document.getElementById("btn-capture-start");
const btnCaptureEnd = document.getElementById("btn-capture-end");
const btnExportVideo = document.getElementById("btn-export-video");
const sidebar        = document.getElementById("sidebar");
const panControls    = document.getElementById("pan-controls");
const zoomHint      = document.getElementById("zoom-hint");
const badgeDiv      = document.getElementById("benchmark-badge");
const badgeLoading  = document.getElementById("badge-loading");
const exportPanel   = document.getElementById("export-panel");
const exportImageWidth = document.getElementById("export-image-width");
const exportImageHeight = document.getElementById("export-image-height");
const exportVideoWidth = document.getElementById("export-video-width");
const exportVideoHeight = document.getElementById("export-video-height");
const exportVideoDuration = document.getElementById("export-video-duration");
const exportVideoFps = document.getElementById("export-video-fps");
const exportVideoState = document.getElementById("export-video-state");

// ============================================================
// PALETTES DE COULEURS
// ============================================================
// Chaque palette est un tableau de stops RGB [r, g, b].
// La couleur est interpolée linéairement selon t = iter / maxIter.
// t = 1 (intérieur de l'ensemble) ? noir.

const PALETTES = {
  feu: {
    // Volcanic plasma: char-black → electric crimson → hot orange → acid yellow → white-hot
    fond: [0, 0, 0],
    interieur: [8, 0, 0],
    stops: [
      [20, 0, 0], [110, 0, 0], [210, 10, 0], [255, 60, 0],
      [255, 140, 0], [255, 230, 0], [255, 255, 120], [255, 255, 255],
    ],
  },
  ocean: {
    // Electric deep ocean: void-black → midnight → electric blue → neon cyan → white
    fond: [0, 0, 5],
    interieur: [0, 2, 16],
    stops: [
      [0, 5, 30], [0, 20, 110], [0, 60, 210], [0, 140, 255],
      [0, 220, 245], [60, 255, 240], [180, 255, 255], [255, 255, 255],
    ],
  },
  aurora: {
    // Synthwave aurora: deep void → electric violet → neon teal → acid lime → gold
    fond: [2, 0, 8],
    interieur: [6, 0, 20],
    stops: [
      [10, 0, 40], [70, 0, 170], [0, 40, 230], [0, 170, 210],
      [0, 230, 110], [160, 255, 0], [255, 200, 0], [255, 245, 180],
    ],
  },
  braise: {
    // Neon ember: charcoal → deep crimson → electric amber → electric yellow → white
    fond: [0, 0, 0],
    interieur: [10, 2, 0],
    stops: [
      [30, 0, 0], [130, 10, 0], [230, 40, 0], [255, 100, 0],
      [255, 185, 0], [255, 245, 50], [255, 255, 190], [255, 255, 255],
    ],
  },
  lagon: {
    // Acid lagoon: abyss-black → deep teal → electric emerald → neon mint → white
    fond: [0, 4, 2],
    interieur: [0, 10, 8],
    stops: [
      [0, 20, 15], [0, 85, 60], [0, 170, 100], [0, 225, 140],
      [0, 255, 185], [100, 255, 225], [200, 255, 240], [255, 255, 255],
    ],
  },
  crepuscule: {
    // Cosmic nebula: deep space → electric indigo → vivid magenta → hot pink → molten gold
    fond: [2, 0, 6],
    interieur: [8, 0, 22],
    stops: [
      [15, 0, 40], [65, 0, 130], [145, 0, 185], [225, 0, 185],
      [255, 60, 120], [255, 145, 55], [255, 225, 95], [255, 255, 220],
    ],
  },
  neon: {
    // Pure cyberpunk neon: void → electric blue → cyan → acid green → electric yellow → white
    fond: [0, 0, 0],
    interieur: [0, 0, 6],
    stops: [
      [0, 0, 18], [15, 0, 90], [0, 60, 210], [0, 210, 255],
      [0, 255, 185], [185, 255, 0], [255, 255, 0], [255, 255, 255],
    ],
  },
  infrared: {
    // Scientific heat map: void → deep violet → indigo → cyan → lime → orange → white
    fond: [0, 0, 0],
    interieur: [5, 0, 12],
    stops: [
      [10, 0, 30], [55, 0, 160], [0, 80, 210], [0, 210, 230],
      [0, 230, 80], [210, 230, 0], [255, 120, 0], [255, 255, 200],
    ],
  },
};

const FRACTAL_FAMILIES = [
  {
    id: "evasion",
    label: "Évasion",
    fractales: [
      ["mandelbrot", "Mandelbrot"],
      ["julia", "Julia (c = -0.8 + 0.156i)"],
      ["burning_ship", "Burning Ship"],
      ["tricorn", "Tricorn"],
      ["multibrot", "Multibrot"],
      ["celtic", "Celtic"],
      ["buffalo", "Buffalo"],
      ["perpendicular_burning_ship", "Perpendicular Burning Ship"],
      ["heart", "Heart"],
      ["perpendicular_mandelbrot", "Perpendicular Mandelbrot"],
      ["perpendicular_celtic", "Perpendicular Celtic"],
      ["duck", "Duck"],
      ["buddhabrot", "Buddhabrot"],
    ],
  },
  {
    id: "dynamique",
    label: "Dynamique",
    fractales: [
      ["newton", "Newton (z^3 - 1)"],
      ["phoenix", "Phoenix"],
      ["lyapunov", "Lyapunov"],
      ["lyapunov_multisequence", "Lyapunov multiséquence"],
      ["bassin_newton_generalise", "Bassin de Newton généralisé"],
      ["orbitale_de_nova", "Orbitale de Nova"],
      ["collatz_complexe", "Collatz complexe"],
      ["attracteur_de_clifford", "Attracteur de Clifford"],
      ["attracteur_de_peter_de_jong", "Attracteur de Peter de Jong"],
      ["attracteur_ikeda", "Attracteur d'Ikeda"],
      ["attracteur_de_henon", "Attracteur de Hénon"],
      ["lorenz_attractor", "Attracteur de Lorenz"],
      ["feigenbaum_tree", "Arbre de Feigenbaum"],
    ],
  },
  {
    id: "ifs",
    label: "IFS",
    fractales: [
      ["barnsley", "Barnsley"],
      ["sierpinski", "Sierpinski"],
      ["tapis_sierpinski", "Tapis de Sierpinski"],
      ["menger_sponge", "Éponge de Menger"],
      ["mandelbulb", "Bulbe de Mandel"],
      ["tetraedre_sierpinski", "Tétraèdre de Sierpiński"],
      ["julia_quaternion", "Julia quaternionique"],
      ["mandelbox", "Boîte de Mandel"],
      ["vicsek_fractal", "Fractale de Vicsek"],
      ["lichtenberg_figures", "Figures de Lichtenberg"],
    ],
  },
  {
    id: "lsystem",
    label: "L-système",
    fractales: [
      ["koch", "Koch"],
      ["dragon_heighway", "Dragon de Heighway"],
      ["dragon_curve", "Courbe du dragon"],
      ["cantor_set", "Ensemble de Cantor"],
      ["apollonian_gasket", "Joint d'Apollonius"],
      ["t_square_fractal", "Fractale en T"],
      ["h_fractal", "Fractale en H"],
      ["hilbert_curve", "Courbe de Hilbert"],
      ["peano_curve", "Courbe de Peano"],
      ["arbre_pythagore", "Arbre de Pythagore"],
    ],
  },
  {
    id: "magnetique",
    label: "Magnétiques",
    fractales: [
      ["magnet1", "Magnet I"],
      ["magnet2", "Magnet II"],
      ["magnet3", "Magnet III"],
      ["lambda_fractale", "Lambda (logistique)"],
      ["lambda_cubique", "Lambda cubique"],
      ["magnet_cosinus", "Magnet cosinus"],
      ["magnet_sinus", "Magnet sinus"],
      ["nova_magnetique", "Nova magnétique"],
    ],
  },
  {
    id: "classe",
    label: "Classes",
    fractales: [
      ["mandelbrot_classe", "Mandelbrot (classe compat)"],
    ],
  },
];

const FRACTAL_FAMILY_BY_NAME = Object.fromEntries(
  FRACTAL_FAMILIES.flatMap((famille) => famille.fractales.map(([nom]) => [nom, famille.id]))
);

/**
 * Retourne la couleur [r, g, b] pour une valeur d'itération.
 * @param {number} iter  — valeur retournée par mandelbrot() (float)
 * @param {number} max   — maxIter courant
 * @param {string} name  — nom de la palette
 * @returns {[number, number, number]}
 */
function getColor(iter, max, name) {
  if (iter >= max) return getPaletteInterior(name);
  const stops = getPaletteStops(name);
  // normaliser dans [0, 1] avec légère correction logarithmique
  const t = Math.sqrt(iter / max);
  return getColorFromRatio(t, stops);
}

function getColorFromRatio(t, paletteOrName) {
  const stops = Array.isArray(paletteOrName) ? paletteOrName : getPaletteStops(paletteOrName);
  const normalise = Math.max(0, Math.min(0.999999, t));
  const scaled = normalise * (stops.length - 1);
  const lo = Math.floor(scaled) | 0;
  const hi = Math.min(lo + 1, stops.length - 1);
  const frac = scaled - lo;
  const c0 = stops[lo];
  const c1 = stops[hi];
  return [
    (c0[0] + (c1[0] - c0[0]) * frac) | 0,
    (c0[1] + (c1[1] - c0[1]) * frac) | 0,
    (c0[2] + (c1[2] - c0[2]) * frac) | 0,
  ];
}

function getPaletteConfig(name) {
  return PALETTES[name] ?? PALETTES.feu;
}

function getPaletteStops(name) {
  return getPaletteConfig(name).stops;
}

function getPaletteBackground(name) {
  return getPaletteConfig(name).fond;
}

function getPaletteInterior(name) {
  return getPaletteConfig(name).interieur;
}

function getBasinColor(iter, max, name) {
  if (iter >= max) return getPaletteInterior(name);
  const base = Math.floor(iter);
  const fraction = iter - base;
  const progression = Math.min(0.95, Math.sqrt(Math.max(0, base) / Math.max(1, max)));
  let decalage = 0.0;
  if (fraction >= 0.75) decalage = 0.20;
  else if (fraction >= 0.55) decalage = 0.12;
  else if (fraction >= 0.35) decalage = 0.06;
  else if (fraction >= 0.10) decalage = 0.0;
  return getColorFromRatio(Math.min(0.98, progression * 0.7 + 0.18 + decalage), name);
}

function coloriserDensite(data, densites, maxDensite, palette) {
  const fond = getPaletteBackground(palette);
  if (maxDensite <= 0) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fond[0];
      data[i + 1] = fond[1];
      data[i + 2] = fond[2];
      data[i + 3] = 255;
    }
    return;
  }
  const logMax = Math.log(1 + maxDensite);
  for (let i = 0; i < densites.length; i++) {
    const densite = densites[i];
    const base = i * 4;
    if (densite <= 0) {
      data[base] = fond[0];
      data[base + 1] = fond[1];
      data[base + 2] = fond[2];
      data[base + 3] = 255;
      continue;
    }
    const ratio = Math.log(1 + densite) / logMax;
    const ratioVisible = 0.18 + Math.pow(ratio, 0.55) * 0.80;
    const [r, g, b] = getColorFromRatio(ratioVisible, palette);
    data[base] = r;
    data[base + 1] = g;
    data[base + 2] = b;
    data[base + 3] = 255;
  }
}

function ajusterIterationsExport(largeur, hauteur, maxIter) {
  const fn = wasmExportFunctions.ajuster_iterations_export;
  return fn ? Math.max(maxIter, Math.round(fn(largeur, hauteur, maxIter))) : Math.max(maxIter, Math.round(maxIter * (1 + (largeur * hauteur) / 480000 * 0.35)));
}

function interpolerLineaire(a, b, t) {
  const fn = wasmExportFunctions.interpoler_lineaire;
  if (fn && Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(t)) {
    return fn(a, b, t);
  }
  return a + (b - a) * t;
}

function interpolerLogarithmique(a, b, t) {
  const fn = wasmExportFunctions.interpoler_logarithmique;
  if (fn && Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(t)) {
    return fn(a, b, t);
  }
  if (a <= 0 || b <= 0) return interpolerLineaire(a, b, t);
  return a * ((b / a) ** t);
}

function capturerVueCourante() {
  return {
    centerX: view.centerX,
    centerY: view.centerY,
    pixelSize: view.pixelSize,
    fractal: params.fractal,
    maxIter: params.maxIter,
    palette: params.palette,
    multibrotPower: params.multibrotPower,
    juliaCre: params.juliaCre,
    juliaCim: params.juliaCim,
  };
}

function clonerParamsExport(source = params) {
  return {
    fractal: source.fractal,
    maxIter: source.maxIter,
    palette: source.palette,
    multibrotPower: source.multibrotPower,
    juliaCre: source.juliaCre,
    juliaCim: source.juliaCim,
  };
}

function formaterNomExport(suffixe, extension) {
  const date = new Date();
  const morceaux = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "_",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
  return `${params.fractal}_${suffixe}_${morceaux}.${extension}`;
}

function telechargerBlob(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function mettreAJourEtatVideo() {
  const depart = vueExportDepart ? "défini" : "non défini";
  const arrivee = vueExportArrivee ? "définie" : "non définie";
  exportVideoState.textContent = `Départ : ${depart} · Arrivée : ${arrivee}`;
}

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function barnsleyStep(x, y, r) {
  if (r < 0.01) return [0.0, 0.16 * y];
  if (r < 0.86) return [0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6];
  if (r < 0.93) return [0.2 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6];
  return [-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44];
}

function sierpinskiStep(x, y, r) {
  if (r < 1 / 3) return [0.5 * x, 0.5 * y];
  if (r < 2 / 3) return [0.5 * x + 0.5, 0.5 * y];
  return [0.5 * x + 0.25, 0.5 * y + 0.43301270189];
}

function etapeTapisSierpinski(x, y, r) {
  const cellules = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0],          [1,  0],
    [-1,  1], [0,  1], [1,  1],
  ];
  const index = Math.min(cellules.length - 1, (r * cellules.length) | 0);
  const [dx, dy] = cellules[index];
  return [x / 3 + dx / 3, y / 3 + dy / 3];
}

const MENGER_OFFSETS = [
  [-1, -1, -1], [-1, -1, 0], [-1, -1, 1],
  [-1, 0, -1], [-1, 0, 1],
  [-1, 1, -1], [-1, 1, 0], [-1, 1, 1],
  [0, -1, -1], [0, -1, 1],
  [0, 1, -1], [0, 1, 1],
  [1, -1, -1], [1, -1, 0], [1, -1, 1],
  [1, 0, -1], [1, 0, 1],
  [1, 1, -1], [1, 1, 0], [1, 1, 1],
];

function etapeMengerSponge(x, y, z, r) {
  const index = Math.min(MENGER_OFFSETS.length - 1, (r * MENGER_OFFSETS.length) | 0);
  const [dx, dy, dz] = MENGER_OFFSETS[index];
  return [x / 3 + dx / 3, y / 3 + dy / 3, z / 3 + dz / 3];
}

function projeterMengerSponge(x, y, z) {
  return [
    (x - z) * 0.86,
    y + (x + z) * 0.28,
  ];
}

function etapeVicsekFractal(x, y, r) {
  if (r < 0.2) return [x / 3, y / 3];
  if (r < 0.4) return [x / 3 - 2 / 3, y / 3];
  if (r < 0.6) return [x / 3 + 2 / 3, y / 3];
  if (r < 0.8) return [x / 3, y / 3 - 2 / 3];
  return [x / 3, y / 3 + 2 / 3];
}

function etapeLichtenberg(x, y, z, r) {
  const angle = (r * Math.PI * 2) + z * 0.18;
  const pas = 0.035 + (z % 9) * 0.0025;
  let nx = x + Math.cos(angle) * pas;
  let ny = y + Math.sin(angle) * pas;
  if ((z % 17) === 0) nx = -0.42 * nx + 0.18;
  if ((z % 23) === 0) ny = -0.36 * ny - 0.14;
  return [nx, ny, z + 1];
}

function etapeMandelbulb(x, y, z, cx, cy) {
  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;
  return [
    x * (x2 - 3 * y2 - 1.5 * z2) + cx,
    y * (3 * x2 - y2 - 1.5 * z2) + cy,
    z * (2.5 * x2 - 0.5 * y2 - z2) + 0.22,
  ];
}

function projeterMandelbulb(x, y, z) {
  return [
    (x - z) * 0.72,
    y + (x + z) * 0.18,
  ];
}

// Tétraèdre de Sierpiński — SFI à 4 contractions (3D)
function etapeTetraedre(x, y, z, r) {
  const k = Math.min(3, (r * 4) | 0);
  if (k === 0) return [x * 0.5,           y * 0.5,           z * 0.5];
  if (k === 1) return [x * 0.5 + 0.5,     y * 0.5,           z * 0.5];
  if (k === 2) return [x * 0.5 + 0.25,    y * 0.5 + 0.433013, z * 0.5];
               return [x * 0.5 + 0.25,    y * 0.5 + 0.144338, z * 0.5 + 0.408248];
}

// Projection centrée sur le barycentre du tétraèdre, angle élevé pour
// exposer les 4 faces et éviter la confusion avec le triangle de Sierpiński 2D.
function projeterTetraedre(x, y, z) {
  const cx = x - 0.5, cy = y - 0.289, cz = z - 0.204;
  return [(cx - cz) * 0.82, cy - cz * 0.55 + (cx + cz) * 0.38];
}

// Boîte de Mandel — orbite 3D avec c lentement variable (même approche que Mandelbulb).
// Avec scale=2 et |c| ≈ 0.2 l'orbite reste bornée et révèle la structure 3D du fractal.
function etapeMandelbox(x, y, z, cx, cy) {
  // pli de boîte
  if (x > 1.0) x = 2.0 - x; else if (x < -1.0) x = -2.0 - x;
  if (y > 1.0) y = 2.0 - y; else if (y < -1.0) y = -2.0 - y;
  if (z > 1.0) z = 2.0 - z; else if (z < -1.0) z = -2.0 - z;
  // pli de sphère
  const r2 = x * x + y * y + z * z;
  if (r2 < 0.25) { x *= 4.0; y *= 4.0; z *= 4.0; }
  else if (r2 < 1.0) { x /= r2; y /= r2; z /= r2; }
  return [2.0 * x + cx, 2.0 * y + cy, 2.0 * z + 0.1];
}

function projeterMandelbox(x, y, z) {
  return [(x - z) * 0.68, y + (x + z) * 0.22];
}

// Julia quaternionique en JS pur (coupe w=0 de z²+c dans ℝ⁴)
// C_Z ≠ 0 est indispensable : avec C_Z=0 et z₀=0, nz=2xz+0=0 partout
// → dégénérescence en Julia complexe classique 2D.
function juliaQuaternionJS(cx, cy, max) {
  let x = cx, y = cy, z = 0.0;
  const C_X = -0.06, C_Y = 0.06, C_Z = 0.2;
  for (let i = 0; i < max; i++) {
    const nx = x * x - y * y - z * z + C_X;
    const ny = 2.0 * x * y + C_Y;
    const nz = 2.0 * x * z + C_Z;
    x = nx; y = ny; z = nz;
    if (x * x + y * y + z * z > 16.0) return i;
  }
  return max;
}

// Boîte de Mandel en JS pur (coupe z=0, échelle 2)
function mandelboxJS(cx, cy, max) {
  let x = 0.0, y = 0.0, z = 0.0;
  for (let i = 0; i < max; i++) {
    // pli de boîte
    if (x > 1.0) x = 2.0 - x; else if (x < -1.0) x = -2.0 - x;
    if (y > 1.0) y = 2.0 - y; else if (y < -1.0) y = -2.0 - y;
    if (z > 1.0) z = 2.0 - z; else if (z < -1.0) z = -2.0 - z;
    // pli de sphère
    const r2 = x * x + y * y + z * z;
    if (r2 < 0.25) { x *= 4.0; y *= 4.0; z *= 4.0; }
    else if (r2 < 1.0) { x /= r2; y /= r2; z /= r2; }
    // échelle 2 + translation par c
    x = 2.0 * x + cx;
    y = 2.0 * y + cy;
    z = 2.0 * z;
    if (x * x + y * y + z * z > 64.0) return i;
  }
  return max;
}

function etapeAttracteurClifford(x, y) {
  const a = -1.4;
  const b = 1.7;
  const c = 1.0;
  const d = 0.7;
  return [
    Math.sin(a * y) + c * Math.cos(a * x),
    Math.sin(b * x) + d * Math.cos(b * y),
  ];
}

function etapeAttracteurPeterDeJong(x, y) {
  const a = 1.4;
  const b = -2.3;
  const c = 2.4;
  const d = -2.1;
  return [
    Math.sin(a * y) - Math.cos(b * x),
    Math.sin(c * x) - Math.cos(d * y),
  ];
}

function etapeAttracteurIkeda(x, y) {
  const u = 0.9;
  const rayon = x * x + y * y;
  const angle = 0.4 - 6.0 / (1.0 + rayon);
  const cosT = Math.cos(angle);
  const sinT = Math.sin(angle);
  return [
    1.0 + u * (x * cosT - y * sinT),
    u * (x * sinT + y * cosT),
  ];
}

function etapeAttracteurHenon(x, y) {
  const a = 1.4;
  const b = 0.3;
  return [
    1.0 - a * x * x + y,
    b * x,
  ];
}

function etapeLorenzAttractor(x, y, z) {
  const sigma = 10.0;
  const rho = 28.0;
  const beta = 8.0 / 3.0;
  const dt = 0.01;
  const dx = sigma * (y - x);
  const dy = x * (rho - z) - y;
  const dz = x * y - beta * z;
  return [
    x + dx * dt,
    y + dy * dt,
    z + dz * dt,
  ];
}

function projeterLorenzAttractor(x, y, z) {
  return [
    (x - y) * 0.12,
    (z - 26.0) * 0.07 - (x + y) * 0.02,
  ];
}

function dessinerCantor(ctxCible, w, h, maxIter) {
  const profondeur = Math.max(3, Math.min(8, Math.floor(maxIter / 64) + 2));
  const hauteurLigne = Math.max(6, Math.min(18, h / (profondeur + 3)));

  function dessinerSegment(x, largeur, niveau) {
    const y = h * 0.18 + niveau * hauteurLigne;
    ctxCible.moveTo(x, y);
    ctxCible.lineTo(x + largeur, y);
    if (niveau >= profondeur) return;
    const tiers = largeur / 3;
    dessinerSegment(x, tiers, niveau + 1);
    dessinerSegment(x + tiers * 2, tiers, niveau + 1);
  }

  dessinerSegment(w * 0.12, w * 0.76, 0);
}

function findFractalFamily(fractalName) {
  return FRACTAL_FAMILY_BY_NAME[fractalName] ?? FRACTAL_FAMILIES[0].id;
}

function populateFractalSelect(familyId, selectedFractal = null) {
  const family = FRACTAL_FAMILIES.find((item) => item.id === familyId) ?? FRACTAL_FAMILIES[0];
  const activeFractal = selectedFractal && family.fractales.some(([nom]) => nom === selectedFractal)
    ? selectedFractal
    : family.fractales[0][0];
  fractalSelect.innerHTML = family.fractales
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  fractalSelect.value = activeFractal;
  return activeFractal;
}

function syncSelectors(selectedFractal = params.fractal) {
  const familyId = findFractalFamily(selectedFractal);
  familySelect.value = familyId;
  const activeFractal = populateFractalSelect(familyId, selectedFractal);
  params.fractal = activeFractal;
}

function setActiveFractal(fractalName) {
  params.fractal = fractalName;
  syncSelectors(fractalName);
  resetView();
  loadSources(params.fractal);
}

function kochGenerate(iterations) {
  let s = "F";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) next += ch === "F" ? "F+F--F+F" : ch;
    s = next;
  }
  return s;
}

function genererDragonHeighway(iterations) {
  let s = "FX";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) {
      if (ch === "X") next += "X+YF+";
      else if (ch === "Y") next += "-FX-Y";
      else next += ch;
    }
    s = next;
  }
  return s;
}

function genererHilbert(iterations) {
  let s = "A";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) {
      if (ch === "A") next += "+BF-AFA-FB+";
      else if (ch === "B") next += "-AF+BFB+FA-";
      else next += ch;
    }
    s = next;
  }
  return s;
}

function genererPeano(iterations) {
  let s = "X";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) {
      if (ch === "X") next += "XFYFX+F+YFXFY-F-XFYFX";
      else if (ch === "Y") next += "YFXFY-F-XFYFX+F+YFXFY";
      else next += ch;
    }
    s = next;
  }
  return s;
}

function dessinerTSquare(ctxCible, x, y, taille, niveau) {
  if (niveau <= 0) return;
  ctxCible.rect(x - taille / 2, y - taille / 2, taille, taille);
  const demi = taille / 2;
  const suivant = taille / 2;
  dessinerTSquare(ctxCible, x - demi, y - demi, suivant, niveau - 1);
  dessinerTSquare(ctxCible, x + demi, y - demi, suivant, niveau - 1);
  dessinerTSquare(ctxCible, x - demi, y + demi, suivant, niveau - 1);
  dessinerTSquare(ctxCible, x + demi, y + demi, suivant, niveau - 1);
}

function dessinerHFractal(ctxCible, x, y, taille, niveau) {
  if (niveau <= 0) return;
  const demi = taille / 2;
  ctxCible.moveTo(x - demi, y - demi);
  ctxCible.lineTo(x - demi, y + demi);
  ctxCible.moveTo(x + demi, y - demi);
  ctxCible.lineTo(x + demi, y + demi);
  ctxCible.moveTo(x - demi, y);
  ctxCible.lineTo(x + demi, y);
  const suivant = taille / 2;
  dessinerHFractal(ctxCible, x - demi, y - demi, suivant, niveau - 1);
  dessinerHFractal(ctxCible, x - demi, y + demi, suivant, niveau - 1);
  dessinerHFractal(ctxCible, x + demi, y - demi, suivant, niveau - 1);
  dessinerHFractal(ctxCible, x + demi, y + demi, suivant, niveau - 1);
}

function dessinerCercle(ctxCible, x, y, rayon) {
  ctxCible.moveTo(x + rayon, y);
  ctxCible.arc(x, y, rayon, 0, Math.PI * 2);
}

function dessinerApollonien(ctxCible, x, y, rayon, niveau) {
  if (niveau <= 0 || rayon < 3) return;
  dessinerCercle(ctxCible, x, y, rayon);
  const r = rayon / 2;
  dessinerApollonien(ctxCible, x - r, y, r, niveau - 1);
  dessinerApollonien(ctxCible, x + r, y, r, niveau - 1);
  dessinerApollonien(ctxCible, x, y - r * 0.866, r, niveau - 1);
}

function creerTraceurMonde(ctxCible, w, h, vueCible) {
  const cx0 = vueCible.centerX - (w / 2) * vueCible.pixelSize;
  const cy0 = vueCible.centerY - (h / 2) * vueCible.pixelSize;
  return {
    moveTo(x, y) {
      ctxCible.moveTo((x - cx0) / vueCible.pixelSize, (y - cy0) / vueCible.pixelSize);
    },
    lineTo(x, y) {
      ctxCible.lineTo((x - cx0) / vueCible.pixelSize, (y - cy0) / vueCible.pixelSize);
    },
  };
}

function dessinerCarreMonde(traceur, x, y, taille) {
  const demi = taille / 2;
  traceur.moveTo(x - demi, y - demi);
  traceur.lineTo(x + demi, y - demi);
  traceur.lineTo(x + demi, y + demi);
  traceur.lineTo(x - demi, y + demi);
  traceur.lineTo(x - demi, y - demi);
}

function dessinerTSquareMonde(traceur, x, y, taille, niveau) {
  if (niveau <= 0) return;
  dessinerCarreMonde(traceur, x, y, taille);
  const demi = taille / 2;
  const suivant = taille / 2;
  dessinerTSquareMonde(traceur, x - demi, y - demi, suivant, niveau - 1);
  dessinerTSquareMonde(traceur, x + demi, y - demi, suivant, niveau - 1);
  dessinerTSquareMonde(traceur, x - demi, y + demi, suivant, niveau - 1);
  dessinerTSquareMonde(traceur, x + demi, y + demi, suivant, niveau - 1);
}

function dessinerHFractalMonde(traceur, x, y, taille, niveau) {
  if (niveau <= 0) return;
  const demi = taille / 2;
  traceur.moveTo(x - demi, y - demi);
  traceur.lineTo(x - demi, y + demi);
  traceur.moveTo(x + demi, y - demi);
  traceur.lineTo(x + demi, y + demi);
  traceur.moveTo(x - demi, y);
  traceur.lineTo(x + demi, y);
  const suivant = taille / 2;
  dessinerHFractalMonde(traceur, x - demi, y - demi, suivant, niveau - 1);
  dessinerHFractalMonde(traceur, x - demi, y + demi, suivant, niveau - 1);
  dessinerHFractalMonde(traceur, x + demi, y - demi, suivant, niveau - 1);
  dessinerHFractalMonde(traceur, x + demi, y + demi, suivant, niveau - 1);
}

function dessinerCantorMonde(traceur, maxIter) {
  const profondeur = Math.max(3, Math.min(8, Math.floor(maxIter / 64) + 2));
  function dessinerSegment(x, largeur, niveau) {
    const y = -0.78 + niveau * 0.18;
    traceur.moveTo(x, y);
    traceur.lineTo(x + largeur, y);
    if (niveau >= profondeur) return;
    const tiers = largeur / 3;
    dessinerSegment(x, tiers, niveau + 1);
    dessinerSegment(x + tiers * 2, tiers, niveau + 1);
  }
  dessinerSegment(-1.0, 2.0, 0);
}

function dessinerCercleMonde(traceur, x, y, rayon, segments = 40) {
  traceur.moveTo(x + rayon, y);
  for (let i = 1; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    traceur.lineTo(x + Math.cos(angle) * rayon, y + Math.sin(angle) * rayon);
  }
}

function dessinerApollonienMonde(traceur, x, y, rayon, niveau) {
  if (niveau <= 0 || rayon < 0.01) return;
  dessinerCercleMonde(traceur, x, y, rayon);
  const r = rayon / 2;
  dessinerApollonienMonde(traceur, x - r, y, r, niveau - 1);
  dessinerApollonienMonde(traceur, x + r, y, r, niveau - 1);
  dessinerApollonienMonde(traceur, x, y - r * 0.866, r, niveau - 1);
}

function dessinerCommandeLineaireMonde(traceur, commands, x, y, angle, segment, rotation) {
  traceur.moveTo(x, y);
  for (const c of commands) {
    if (c === "F") {
      x += segment * Math.cos(angle);
      y += segment * Math.sin(angle);
      traceur.lineTo(x, y);
    } else if (c === "+") {
      angle += rotation;
    } else if (c === "-") {
      angle -= rotation;
    }
  }
}

function renderPointFractal(w, h, data, cx0, cy0, ps, token) {
  const isBarnsley = params.fractal === "barnsley";
  const estSierpinski = params.fractal === "sierpinski";
  const estTapis = params.fractal === "tapis_sierpinski";
  const estMenger = params.fractal === "menger_sponge";
  const estMandelbulb = params.fractal === "mandelbulb";
  const estTetraedre = params.fractal === "tetraedre_sierpinski";
  const estMandelbox = params.fractal === "mandelbox";
  const estVicsek = params.fractal === "vicsek_fractal";
  const estLichtenberg = params.fractal === "lichtenberg_figures";
  const estClifford = params.fractal === "attracteur_de_clifford";
  const estPeterDeJong = params.fractal === "attracteur_de_peter_de_jong";
  const estIkeda = params.fractal === "attracteur_ikeda";
  const estHenon = params.fractal === "attracteur_de_henon";
  const estLorenz = params.fractal === "lorenz_attractor";
  const estFeigenbaum = params.fractal === "feigenbaum_tree";
  const estBuddhabrot = params.fractal === "buddhabrot";
  const rng = makeRng(0x9e3779b9 ^ (params.maxIter << 7) ^ params.fractal.length);
  const pointsTarget = estBuddhabrot
    ? Math.max(8000, params.maxIter * 70)
    : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estFeigenbaum) ? Math.max(140000, params.maxIter * 1800) : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? Math.max(80000, params.maxIter * 1200) : Math.max(30000, params.maxIter * 900)));
  const burnIn = isBarnsley ? 80 : (estBuddhabrot ? 0 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz) ? 120 : ((estMenger || estTetraedre || estMandelbox) ? 60 : 40)));
  const pointsPerFrame = estBuddhabrot ? 400 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estFeigenbaum) ? 30000 : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? 26000 : 25000));
  let x = (estMenger || estMandelbulb) ? 0.11 : (estTetraedre ? 0.25 : (estMandelbox ? 0.2 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong || estLorenz) ? 0.1 : (estHenon ? 0.1 : 0.0))))));
  let y = (estMenger || estMandelbulb) ? -0.17 : (estTetraedre ? 0.20 : (estMandelbox ? 0.0 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong) ? 0.1 : (estHenon ? 0.0 : 0.0))))));
  let z = (estMenger || estMandelbulb || estTetraedre) ? 0.10 : (estMandelbox ? 0.3 : 0.0);
  let emitted = 0;
  let iter = 0;
  // est3D : orbite 3D projetée isométriquement — pondération par profondeur activée.
  const est3D = estMenger || estMandelbulb || estTetraedre || estMandelbox;
  const densites = new Uint32Array(w * h);
  let maxDensite = 0;

  const putPoint = (px, py, poids = 1) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const ajouterDensite = (xPoint, yPoint, p) => {
      if (xPoint < 0 || yPoint < 0 || xPoint >= w || yPoint >= h) return;
      const index = yPoint * w + xPoint;
      densites[index] += p;
      if (densites[index] > maxDensite) {
        maxDensite = densites[index];
      }
    };
    ajouterDensite(px, py, poids);
    if (estIkeda || estLorenz) {
      ajouterDensite(px + 1, py, poids);
      ajouterDensite(px, py + 1, poids);
      ajouterDensite(px + 1, py + 1, poids);
    }
  };

  const step = () => {
    if (token !== renderToken) return;
    const end = Math.min(emitted + pointsPerFrame, pointsTarget);
    while (emitted < end) {
      if (estBuddhabrot) {
        const cre = -2.1 + rng() * 3.0;
        const cim = -1.6 + rng() * 3.2;
        let zx = 0.0;
        let zy = 0.0;
        const trajectoire = [];
        let echappe = false;
        const limite = Math.max(24, Math.min(160, params.maxIter));
        for (let i = 0; i < limite; i++) {
          const nx = zx * zx - zy * zy + cre;
          const ny = 2.0 * zx * zy + cim;
          zx = nx;
          zy = ny;
          trajectoire.push([zx, zy]);
          if (zx * zx + zy * zy > 16.0) {
            echappe = true;
            break;
          }
        }
        if (!echappe || trajectoire.length < 12) {
          emitted += 1;
          continue;
        }
        for (const [ox, oy] of trajectoire) {
          const px = ((ox - cx0) / ps) | 0;
          const py = ((oy - cy0) / ps) | 0;
          putPoint(px, py);
        }
        emitted += 1;
      } else {
        const r = rng();
        if (isBarnsley) {
          [x, y] = barnsleyStep(x, y, r);
        } else if (estVicsek) {
          [x, y] = etapeVicsekFractal(x, y, r);
        } else if (estMenger) {
          [x, y, z] = etapeMengerSponge(x, y, z, r);
        } else if (estMandelbulb) {
          [x, y, z] = etapeMandelbulb(x, y, z, 0.25 * Math.cos(iter * 0.011), 0.25 * Math.sin(iter * 0.013));
        } else if (estTetraedre) {
          [x, y, z] = etapeTetraedre(x, y, z, r);
        } else if (estMandelbox) {
          [x, y, z] = etapeMandelbox(x, y, z, 0.20 * Math.cos(iter * 0.007), 0.20 * Math.sin(iter * 0.011));
          if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 16) { x = 0.2; y = 0.0; z = 0.3; }
        } else if (estLichtenberg) {
          [x, y, z] = etapeLichtenberg(x, y, z, r);
        } else if (estClifford) {
          [x, y] = etapeAttracteurClifford(x, y);
        } else if (estPeterDeJong) {
          [x, y] = etapeAttracteurPeterDeJong(x, y);
        } else if (estIkeda) {
          [x, y] = etapeAttracteurIkeda(x, y);
        } else if (estHenon) {
          [x, y] = etapeAttracteurHenon(x, y);
        } else if (estLorenz) {
          [x, y, z] = etapeLorenzAttractor(x, y, z);
        } else if (estFeigenbaum) {
          const rr = 2.5 + ((iter % Math.max(1200, w)) / Math.max(1200, w)) * 1.5;
          x = rr * (x || 0.5) * (1.0 - (x || 0.5));
          y = x * 2.0 - 1.0;
        } else if (estTapis) {
          [x, y] = etapeTapisSierpinski(x, y, r);
        } else if (estSierpinski) {
          [x, y] = sierpinskiStep(x, y, r);
        }
        iter += 1;
        if (iter <= burnIn) continue;
        const [rx, ry] = estMenger
          ? projeterMengerSponge(x, y, z)
          : (estMandelbulb ? projeterMandelbulb(x, y, z) : (estTetraedre ? projeterTetraedre(x, y, z) : (estMandelbox ? projeterMandelbox(x, y, z) : (estLorenz ? projeterLorenzAttractor(x, y, z) : (estFeigenbaum ? [((2.5 + ((iter % Math.max(1200, w)) / Math.max(1200, w)) * 1.5) - 3.25) * 1.333, y] : [x, y])))));
        const px = ((rx - cx0) / ps) | 0;
        const py = ((ry - cy0) / ps) | 0;
        // Profondeur isométrique : z faible = devant = poids fort → ombrage 3D.
        const poids = est3D ? Math.max(1, Math.min(5, (4 - z * 2.5) | 0)) : 1;
        putPoint(px, py, poids);
        emitted += 1;
      }
    }
    coloriserDensite(data, densites, maxDensite, params.palette);
    if (token !== renderToken) return;
    ctx.putImageData(imageDataBuffer, 0, 0);
    if (emitted < pointsTarget) {
      requestAnimationFrame(step);
    } else {
      if (token !== renderToken) return;
      const elapsed = (performance.now() - renderStart).toFixed(0);
      rendering = false;
      canvas.parentElement.classList.remove("rendering");
      const etiquetteMode = estBuddhabrot ? "Mode densité" : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estFeigenbaum) ? "Mode attracteur" : "Mode IFS");
      updateStatusBar(etiquetteMode + " - " + elapsed + " ms", true);
    }
  };
  requestAnimationFrame(step);
}

function renderLineFractal(w, h) {
  dessinerFractaleLineaire(ctx, w, h, view, params);
  const elapsed = (performance.now() - renderStart).toFixed(0);
  rendering = false;
  canvas.parentElement.classList.remove("rendering");
  updateStatusBar("Mode géométrique - " + elapsed + " ms", true);
}

function dessinerFractaleLineaire(ctxCible, w, h, vueCible, renduParams) {
  const fond = getPaletteBackground(renduParams.palette);
  ctxCible.fillStyle = "rgb(" + fond[0] + ", " + fond[1] + ", " + fond[2] + ")";
  ctxCible.fillRect(0, 0, w, h);

  const stroke = getColor(Math.min(renduParams.maxIter * 0.6, renduParams.maxIter - 1), renduParams.maxIter, renduParams.palette);
  ctxCible.strokeStyle = "rgb(" + stroke[0] + ", " + stroke[1] + ", " + stroke[2] + ")";
  ctxCible.lineWidth = Math.max(1, Math.min(2, w / 800));
  ctxCible.beginPath();
  const traceur = creerTraceurMonde(ctxCible, w, h, vueCible);

  if (renduParams.fractal === "koch") {
    const n = Math.max(0, Math.min(6, Math.floor((renduParams.maxIter - 64) / 128)));
    const commands = kochGenerate(n);
    dessinerCommandeLineaireMonde(traceur, commands, 0.05, -0.28, 0.0, 0.8 / Math.pow(3, n), Math.PI / 3);
  } else if (renduParams.fractal === "dragon_heighway" || renduParams.fractal === "dragon_curve") {
    const n = Math.max(8, Math.min(15, Math.floor(renduParams.maxIter / 64) + 7));
    const commands = genererDragonHeighway(n);
    dessinerCommandeLineaireMonde(traceur, commands, -0.6, 0.0, 0.0, 1.7 / Math.pow(Math.SQRT2, n), Math.PI / 2);
  } else if (renduParams.fractal === "cantor_set") {
    dessinerCantorMonde(traceur, renduParams.maxIter);
  } else if (renduParams.fractal === "apollonian_gasket") {
    dessinerApollonienMonde(traceur, 0.0, 0.55, 0.58, Math.max(3, Math.min(6, Math.floor(renduParams.maxIter / 80) + 2)));
  } else if (renduParams.fractal === "t_square_fractal") {
    dessinerTSquareMonde(traceur, 0.0, 0.0, 1.2, Math.max(3, Math.min(6, Math.floor(renduParams.maxIter / 80) + 2)));
  } else if (renduParams.fractal === "h_fractal") {
    dessinerHFractalMonde(traceur, 0.0, 0.0, 1.8, Math.max(3, Math.min(6, Math.floor(renduParams.maxIter / 80) + 2)));
  } else if (renduParams.fractal === "hilbert_curve") {
    const n = Math.max(1, Math.min(5, Math.floor(renduParams.maxIter / 80) + 1));
    const commands = genererHilbert(n);
    dessinerCommandeLineaireMonde(traceur, commands, -0.8, 0.8, -Math.PI / 2, 1.6 / Math.max(1, (Math.pow(2, n) - 1)), Math.PI / 2);
  } else if (renduParams.fractal === "peano_curve") {
    const n = Math.max(1, Math.min(3, Math.floor(renduParams.maxIter / 112) + 1));
    const commands = genererPeano(n);
    dessinerCommandeLineaireMonde(traceur, commands, -0.8, 0.8, -Math.PI / 2, 1.6 / Math.max(1, (Math.pow(3, n) - 1)), Math.PI / 2);
  } else if (renduParams.fractal === "arbre_pythagore") {
    const profondeur = Math.max(5, Math.min(11, Math.floor(renduParams.maxIter / 96) + 4));
    function dessinerBranche(x, y, angle, taille, niveau) {
      if (niveau <= 0) return;
      const x1 = x + taille * Math.cos(angle);
      const y1 = y - taille * Math.sin(angle);
      traceur.moveTo(x, y);
      traceur.lineTo(x1, y1);
      dessinerBranche(x1, y1, angle - Math.PI / 5, taille * 0.72, niveau - 1);
      dessinerBranche(x1, y1, angle + Math.PI / 4, taille * 0.68, niveau - 1);
    }
    dessinerBranche(0.0, 1.35, Math.PI / 2, 0.42, profondeur);
  }

  ctxCible.stroke();
}

async function remplirFractalePonctuelle(w, h, data, cx0, cy0, ps, renduParams) {
  const estBarnsley = renduParams.fractal === "barnsley";
  const estSierpinski = renduParams.fractal === "sierpinski";
  const estTapis = renduParams.fractal === "tapis_sierpinski";
  const estMenger = renduParams.fractal === "menger_sponge";
  const estMandelbulb = renduParams.fractal === "mandelbulb";
  const estTetraedre = renduParams.fractal === "tetraedre_sierpinski";
  const estMandelbox = renduParams.fractal === "mandelbox";
  const estVicsek = renduParams.fractal === "vicsek_fractal";
  const estLichtenberg = renduParams.fractal === "lichtenberg_figures";
  const estClifford = renduParams.fractal === "attracteur_de_clifford";
  const estPeterDeJong = renduParams.fractal === "attracteur_de_peter_de_jong";
  const estIkeda = renduParams.fractal === "attracteur_ikeda";
  const estHenon = renduParams.fractal === "attracteur_de_henon";
  const estLorenz = renduParams.fractal === "lorenz_attractor";
  const estFeigenbaum = renduParams.fractal === "feigenbaum_tree";
  const estBuddhabrot = renduParams.fractal === "buddhabrot";
  const rng = makeRng(0x9e3779b9 ^ (renduParams.maxIter << 7) ^ renduParams.fractal.length);
  const pointsTarget = estBuddhabrot
    ? Math.max(8000, renduParams.maxIter * 70)
    : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estFeigenbaum) ? Math.max(140000, renduParams.maxIter * 1800) : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? Math.max(80000, renduParams.maxIter * 1200) : Math.max(30000, renduParams.maxIter * 900)));
  const burnIn = estBarnsley ? 80 : (estBuddhabrot ? 0 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz) ? 120 : ((estMenger || estTetraedre || estMandelbox) ? 60 : 40)));
  let x = (estMenger || estMandelbulb) ? 0.11 : (estTetraedre ? 0.25 : (estMandelbox ? 0.2 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong || estLorenz) ? 0.1 : (estHenon ? 0.1 : 0.0))))));
  let y = (estMenger || estMandelbulb) ? -0.17 : (estTetraedre ? 0.20 : (estMandelbox ? 0.0 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong) ? 0.1 : 0.0)))));
  let z = (estMenger || estMandelbulb || estTetraedre) ? 0.10 : (estMandelbox ? 0.3 : 0.0);
  const est3D = estMenger || estMandelbulb || estTetraedre || estMandelbox;
  let emitted = 0;
  let iter = 0;
  const densites = new Uint32Array(w * h);
  let maxDensite = 0;

  const ajouterDensite = (px, py, poids = 1) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const index = py * w + px;
    densites[index] += poids;
    if (densites[index] > maxDensite) maxDensite = densites[index];
  };

  const pointsParBloc = estBuddhabrot ? 400 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estFeigenbaum) ? 30000 : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? 26000 : 25000));
  while (emitted < pointsTarget) {
    const blocFin = Math.min(emitted + pointsParBloc, pointsTarget);
    while (emitted < blocFin) {
      if (estBuddhabrot) {
        const cre = -2.1 + rng() * 3.0;
        const cim = -1.6 + rng() * 3.2;
        let zx = 0.0;
        let zy = 0.0;
        const trajectoire = [];
        let echappe = false;
        const limite = Math.max(24, Math.min(160, renduParams.maxIter));
        for (let i = 0; i < limite; i++) {
          const nx = zx * zx - zy * zy + cre;
          const ny = 2.0 * zx * zy + cim;
          zx = nx;
          zy = ny;
          trajectoire.push([zx, zy]);
          if (zx * zx + zy * zy > 16.0) {
            echappe = true;
            break;
          }
        }
        if (echappe && trajectoire.length >= 12) {
          for (const [ox, oy] of trajectoire) {
            const px = ((ox - cx0) / ps) | 0;
            const py = ((oy - cy0) / ps) | 0;
            ajouterDensite(px, py, 1);
          }
        }
        emitted += 1;
        continue;
      }

      const r = rng();
      if (estBarnsley) {
        [x, y] = barnsleyStep(x, y, r);
      } else if (estVicsek) {
        [x, y] = etapeVicsekFractal(x, y, r);
      } else if (estMenger) {
        [x, y, z] = etapeMengerSponge(x, y, z, r);
      } else if (estMandelbulb) {
        [x, y, z] = etapeMandelbulb(x, y, z, 0.25 * Math.cos(iter * 0.011), 0.25 * Math.sin(iter * 0.013));
      } else if (estTetraedre) {
        [x, y, z] = etapeTetraedre(x, y, z, r);
      } else if (estMandelbox) {
        [x, y, z] = etapeMandelbox(x, y, z, 0.20 * Math.cos(iter * 0.007), 0.20 * Math.sin(iter * 0.011));
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 16) { x = 0.2; y = 0.0; z = 0.3; }
      } else if (estLichtenberg) {
        [x, y, z] = etapeLichtenberg(x, y, z, r);
      } else if (estClifford) {
        [x, y] = etapeAttracteurClifford(x, y);
      } else if (estPeterDeJong) {
        [x, y] = etapeAttracteurPeterDeJong(x, y);
      } else if (estIkeda) {
        [x, y] = etapeAttracteurIkeda(x, y);
      } else if (estHenon) {
        [x, y] = etapeAttracteurHenon(x, y);
      } else if (estLorenz) {
        [x, y, z] = etapeLorenzAttractor(x, y, z);
      } else if (estFeigenbaum) {
        const rr = 2.5 + ((iter % Math.max(1200, w)) / Math.max(1200, w)) * 1.5;
        x = rr * (x || 0.5) * (1.0 - (x || 0.5));
        y = x * 2.0 - 1.0;
      } else if (estTapis) {
        [x, y] = etapeTapisSierpinski(x, y, r);
      } else if (estSierpinski) {
        [x, y] = sierpinskiStep(x, y, r);
      }
      iter += 1;
      if (iter <= burnIn) continue;
      const [rx, ry] = estMenger
        ? projeterMengerSponge(x, y, z)
        : (estMandelbulb ? projeterMandelbulb(x, y, z) : (estTetraedre ? projeterTetraedre(x, y, z) : (estMandelbox ? projeterMandelbox(x, y, z) : (estLorenz ? projeterLorenzAttractor(x, y, z) : (estFeigenbaum ? [((2.5 + ((iter % Math.max(1200, w)) / Math.max(1200, w)) * 1.5) - 3.25) * 1.333, y] : [x, y])))));
      const px = ((rx - cx0) / ps) | 0;
      const py = ((ry - cy0) / ps) | 0;
      const poids = est3D ? Math.max(1, Math.min(5, (4 - z * 2.5) | 0)) : 1;
      ajouterDensite(px, py, poids);
      if (estIkeda || estLorenz) {
        ajouterDensite(px + 1, py, poids);
        ajouterDensite(px, py + 1, poids);
        ajouterDensite(px + 1, py + 1, poids);
      }
      emitted += 1;
    }
    await attendre(0);
  }

  coloriserDensite(data, densites, maxDensite, renduParams.palette);
}

async function remplirFractaleScalaire(w, h, data, cx0, cy0, ps, renduParams) {
  const fn = wasmFunctions[renduParams.fractal];
  if (!fn) {
    const fond = getPaletteBackground(renduParams.palette);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fond[0];
      data[i + 1] = fond[1];
      data[i + 2] = fond[2];
      data[i + 3] = 255;
    }
    return;
  }
  const estFractaleBassin = renduParams.fractal === "newton" || renduParams.fractal === "bassin_newton_generalise" || renduParams.fractal === "orbitale_de_nova";
  const estFractaleLyapunov = renduParams.fractal === "lyapunov" || renduParams.fractal === "lyapunov_multisequence";
  const estFractaleMagnetique = ["magnet1", "magnet2", "magnet3", "lambda_fractale", "lambda_cubique", "magnet_cosinus", "magnet_sinus", "nova_magnetique"].includes(renduParams.fractal);

  for (let py = 0; py < h; py++) {
    const cy = cy0 + py * ps;
    const base = py * w * 4;
    for (let px = 0; px < w; px++) {
      const cx = cx0 + px * ps;
      let iterValue;
      if (renduParams.fractal === "julia") {
        iterValue = fn(cx, cy, renduParams.juliaCre, renduParams.juliaCim, renduParams.maxIter);
      } else if (renduParams.fractal === "multibrot") {
        iterValue = fn(cx, cy, renduParams.maxIter, renduParams.multibrotPower);
      } else {
        iterValue = fn(cx, cy, renduParams.maxIter);
      }
      let iterColor = iterValue;
      if (renduParams.fractal === "multibrot" && iterValue < renduParams.maxIter) {
        iterColor = Math.min(renduParams.maxIter - 1, 12 + iterValue * 14);
      } else if (renduParams.fractal === "orbitale_de_nova" && iterValue < renduParams.maxIter) {
        iterColor = Math.min(renduParams.maxIter - 1, 18 + iterValue * 10);
      } else if (estFractaleLyapunov && iterValue < renduParams.maxIter) {
        iterColor = Math.min(renduParams.maxIter - 1, 10 + iterValue * 1.8);
      } else if (estFractaleMagnetique && iterValue < renduParams.maxIter) {
        iterColor = Math.min(renduParams.maxIter - 1, 14 + iterValue * 4.2);
      }
      let couleur;
      if (estFractaleBassin) couleur = getBasinColor(iterValue, renduParams.maxIter, renduParams.palette);
      else if (estFractaleLyapunov) couleur = getColorFromRatio(0.12 + Math.pow(Math.min(0.999, iterColor / renduParams.maxIter), 0.85) * 0.82, renduParams.palette);
      else if (estFractaleMagnetique) couleur = getColorFromRatio(0.08 + Math.pow(Math.min(0.999, iterColor / renduParams.maxIter), 0.68) * 0.88, renduParams.palette);
      else couleur = getColor(iterColor, renduParams.maxIter, renduParams.palette);
      const i = base + px * 4;
      data[i] = couleur[0];
      data[i + 1] = couleur[1];
      data[i + 2] = couleur[2];
      data[i + 3] = 255;
    }
    if (py % 12 === 0) await attendre(0);
  }
}

async function rendreDansCanvas(canvasCible, vueCible, renduParams) {
  const ctxCible = canvasCible.getContext("2d", { willReadFrequently: false });
  const w = canvasCible.width;
  const h = canvasCible.height;
  if (POINT_FRACTALS.has(renduParams.fractal)) {
    const image = ctxCible.createImageData(w, h);
    const cx0 = vueCible.centerX - (w / 2) * vueCible.pixelSize;
    const cy0 = vueCible.centerY - (h / 2) * vueCible.pixelSize;
    await remplirFractalePonctuelle(w, h, image.data, cx0, cy0, vueCible.pixelSize, renduParams);
    ctxCible.putImageData(image, 0, 0);
    return;
  }
  if (LINE_FRACTALS.has(renduParams.fractal)) {
    dessinerFractaleLineaire(ctxCible, w, h, vueCible, renduParams);
    return;
  }
  const image = ctxCible.createImageData(w, h);
  const cx0 = vueCible.centerX - (w / 2) * vueCible.pixelSize;
  const cy0 = vueCible.centerY - (h / 2) * vueCible.pixelSize;
  await remplirFractaleScalaire(w, h, image.data, cx0, cy0, vueCible.pixelSize, renduParams);
  ctxCible.putImageData(image, 0, 0);
}

function getActiveFractalFn() {
  const wasmFn = wasmFunctions[params.fractal];
  return wasmFn ? { fn: wasmFn, backend: "WASM" } : { fn: null, backend: "WASM requis" };
}

// ============================================================
// CHARGEMENT WASM
// ============================================================

/**
 * Tente de charger mandelbrot.wasm.
 * Retourne true si le module est chargé et la fonction disponible.
 */
async function loadWasm() {
  try {
    const importObject = {
      env: {
        // Fourni par précaution ; la fonction arithmétique pure n'en a pas besoin
        memory: new WebAssembly.Memory({ initial: 16, maximum: 1024 }),
        // Requis par le générateur WAT multilingual (même si non utilisés ici)
        print_str: (_ptr, _len) => {},
        print_f64: (_x) => {},
        print_bool: (_b) => {},
        print_sep: () => {},
        print_newline: () => {},
      },
    };

    let instance;
    try {
      // Méthode optimale (streaming)
      const result = await WebAssembly.instantiateStreaming(
        fetch(WASM_URL),
        importObject
      );
      instance = result.instance;
    } catch {
      // Fallback : télécharger d'abord, puis instancier
      const resp = await fetch(WASM_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const bytes = await resp.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, importObject);
      instance = result.instance;
    }

    const exports = instance.exports;
    if (typeof exports.mandelbrot !== "function") {
      throw new Error("Export 'mandelbrot' introuvable dans le module WASM.");
    }

    wasmFunctions = {
      mandelbrot: typeof exports.mandelbrot === "function" ? exports.mandelbrot : null,
      mandelbrot_classe: typeof exports.mandelbrot_classe === "function" ? exports.mandelbrot_classe : null,
      burning_ship: typeof exports.burning_ship === "function" ? exports.burning_ship : null,
      tricorn: typeof exports.tricorn === "function" ? exports.tricorn : null,
      julia: typeof exports.julia === "function" ? exports.julia : null,
      multibrot: typeof exports.multibrot === "function" ? exports.multibrot : null,
      celtic: typeof exports.celtic === "function" ? exports.celtic : null,
      buffalo: typeof exports.buffalo === "function" ? exports.buffalo : null,
      perpendicular_burning_ship: typeof exports.perpendicular_burning_ship === "function" ? exports.perpendicular_burning_ship : null,
      heart: typeof exports.heart === "function" ? exports.heart : null,
      perpendicular_mandelbrot: typeof exports.perpendicular_mandelbrot === "function" ? exports.perpendicular_mandelbrot : null,
      perpendicular_celtic: typeof exports.perpendicular_celtic === "function" ? exports.perpendicular_celtic : null,
      duck: typeof exports.duck === "function" ? exports.duck : null,
      buddhabrot: typeof exports.buddhabrot === "function" ? exports.buddhabrot : null,
      newton: typeof exports.newton === "function" ? exports.newton : null,
      phoenix: typeof exports.phoenix === "function" ? exports.phoenix : null,
      lyapunov: typeof exports.lyapunov === "function" ? exports.lyapunov : null,
      lyapunov_multisequence: typeof exports.lyapunov_multisequence === "function" ? exports.lyapunov_multisequence : null,
      bassin_newton_generalise: typeof exports.bassin_newton_generalise === "function" ? exports.bassin_newton_generalise : null,
      orbitale_de_nova: typeof exports.orbitale_de_nova === "function" ? exports.orbitale_de_nova : null,
      collatz_complexe: typeof exports.collatz_complexe === "function" ? exports.collatz_complexe : null,
      attracteur_de_clifford: typeof exports.attracteur_de_clifford === "function" ? exports.attracteur_de_clifford : null,
      attracteur_de_peter_de_jong: typeof exports.attracteur_de_peter_de_jong === "function" ? exports.attracteur_de_peter_de_jong : null,
      attracteur_ikeda: typeof exports.attracteur_ikeda === "function" ? exports.attracteur_ikeda : null,
      attracteur_de_henon: typeof exports.attracteur_de_henon === "function" ? exports.attracteur_de_henon : null,
      lorenz_attractor: typeof exports.lorenz_attractor === "function" ? exports.lorenz_attractor : null,
      feigenbaum_tree: typeof exports.feigenbaum_tree === "function" ? exports.feigenbaum_tree : null,
      barnsley: typeof exports.barnsley === "function" ? exports.barnsley : null,
      sierpinski: typeof exports.sierpinski === "function" ? exports.sierpinski : null,
      tapis_sierpinski: typeof exports.tapis_sierpinski === "function" ? exports.tapis_sierpinski : null,
      menger_sponge: typeof exports.menger_sponge === "function" ? exports.menger_sponge : null,
      mandelbulb: typeof exports.mandelbulb === "function" ? exports.mandelbulb : null,
      vicsek_fractal: typeof exports.vicsek_fractal === "function" ? exports.vicsek_fractal : null,
      lichtenberg_figures: typeof exports.lichtenberg_figures === "function" ? exports.lichtenberg_figures : null,
      tetraedre_sierpinski: typeof exports.tetraedre_sierpinski === "function" ? exports.tetraedre_sierpinski : null,
      julia_quaternion: typeof exports.julia_quaternion === "function" ? exports.julia_quaternion : juliaQuaternionJS,
      mandelbox: typeof exports.mandelbox === "function" ? exports.mandelbox : mandelboxJS,
      koch: typeof exports.koch === "function" ? exports.koch : null,
      dragon_heighway: typeof exports.dragon_heighway === "function" ? exports.dragon_heighway : null,
      dragon_curve: typeof exports.dragon_curve === "function" ? exports.dragon_curve : null,
      cantor_set: typeof exports.cantor_set === "function" ? exports.cantor_set : null,
      apollonian_gasket: typeof exports.apollonian_gasket === "function" ? exports.apollonian_gasket : null,
      t_square_fractal: typeof exports.t_square_fractal === "function" ? exports.t_square_fractal : null,
      h_fractal: typeof exports.h_fractal === "function" ? exports.h_fractal : null,
      hilbert_curve: typeof exports.hilbert_curve === "function" ? exports.hilbert_curve : null,
      peano_curve: typeof exports.peano_curve === "function" ? exports.peano_curve : null,
      arbre_pythagore: typeof exports.arbre_pythagore === "function" ? exports.arbre_pythagore : null,
      magnet1: typeof exports.magnet1 === "function" ? exports.magnet1 : null,
      magnet2: typeof exports.magnet2 === "function" ? exports.magnet2 : null,
      magnet3: typeof exports.magnet3 === "function" ? exports.magnet3 : null,
      lambda_fractale: typeof exports.lambda_fractale === "function" ? exports.lambda_fractale : null,
      lambda_cubique: typeof exports.lambda_cubique === "function" ? exports.lambda_cubique : null,
      magnet_cosinus: typeof exports.magnet_cosinus === "function" ? exports.magnet_cosinus : null,
      magnet_sinus: typeof exports.magnet_sinus === "function" ? exports.magnet_sinus : null,
      nova_magnetique: typeof exports.nova_magnetique === "function" ? exports.nova_magnetique : null,
    };
    wasmExportFunctions = {
      interpoler_lineaire: typeof exports.interpoler_lineaire === "function" ? exports.interpoler_lineaire : null,
      interpoler_logarithmique: typeof exports.interpoler_logarithmique === "function" ? exports.interpoler_logarithmique : null,
      ajuster_iterations_export: typeof exports.ajuster_iterations_export === "function" ? exports.ajuster_iterations_export : null,
    };
    wasmAvailable = true;
    console.info("[WASM] Module mandelbrot.wasm chargé avec succès.");
    updateStatusBar("WASM prêt");
    return true;
  } catch (err) {
    console.warn("[WASM] Chargement échoué :", err.message);
    wasmFunctions = {};
    wasmExportFunctions = {};
    wasmAvailable = false;
    updateStatusBar("WASM indisponible");
    return false;
  }
}

// ============================================================
// RENDU PRINCIPAL
// ============================================================

/** Redimensionne le canvas à la taille réelle du conteneur. */
function resizeCanvas() {
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
    imageDataBuffer = null;  // invalider le buffer
  }
}

/**
 * Lance un rendu complet de la fractale courante.
 * Le rendu est découpé en tranches (rows par frame) pour rester réactif.
 */
function render() {
  const token = ++renderToken;

  resizeCanvas();
  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;

  if (!imageDataBuffer || imageDataBuffer.width !== w || imageDataBuffer.height !== h) {
    imageDataBuffer = ctx.createImageData(w, h);
  }
  const data = imageDataBuffer.data;

  const cx0 = view.centerX - (w / 2) * view.pixelSize;
  const cy0 = view.centerY - (h / 2) * view.pixelSize;
  const ps  = view.pixelSize;
  const max = params.maxIter;
  const pal = params.palette;

  rendering = true;
  renderStart = performance.now();
  canvas.parentElement.classList.add("rendering");
  updateStatusBar("Rendu en cours…");

  if (POINT_FRACTALS.has(params.fractal)) {
    renderPointFractal(w, h, data, cx0, cy0, ps, token);
    return;
  }

  if (LINE_FRACTALS.has(params.fractal)) {
    renderLineFractal(w, h);
    return;
  }

  const { fn, backend } = getActiveFractalFn();
  if (!fn) {
    const fond = getPaletteBackground(params.palette);
    ctx.fillStyle = "rgb(" + fond[0] + ", " + fond[1] + ", " + fond[2] + ")";
    ctx.fillRect(0, 0, w, h);
    rendering = false;
    canvas.parentElement.classList.remove("rendering");
    updateStatusBar(`${params.fractal} : export WASM manquant`, true);
    return;
  }

  let row = 0;
  const ROWS_PER_FRAME = 8;
  const estFractaleBassin = params.fractal === "newton" || params.fractal === "bassin_newton_generalise" || params.fractal === "orbitale_de_nova";
  const estFractaleLyapunov = params.fractal === "lyapunov" || params.fractal === "lyapunov_multisequence";
  const estFractaleMagnetique = params.fractal === "magnet1" || params.fractal === "magnet2" || params.fractal === "magnet3" || params.fractal === "lambda_fractale" || params.fractal === "lambda_cubique" || params.fractal === "magnet_cosinus" || params.fractal === "magnet_sinus" || params.fractal === "nova_magnetique";

  function step() {
    if (token !== renderToken) return;
    const endRow = Math.min(row + ROWS_PER_FRAME, h);
    for (let py = row; py < endRow; py++) {
      const cy = cy0 + py * ps;
      const base = py * w * 4;
      for (let px = 0; px < w; px++) {
        const cx = cx0 + px * ps;
        let iter;
        if (params.fractal === "julia") {
          iter = fn(cx, cy, params.juliaCre, params.juliaCim, max);
        } else if (params.fractal === "multibrot") {
          iter = fn(cx, cy, max, params.multibrotPower);
        } else {
          iter = fn(cx, cy, max);
        }
        let iterColor = iter;
        if (params.fractal === "multibrot" && iter < max) {
          // High-degree multibrot escapes in very few iterations; stretch values
          // so the set structure stays visible instead of near-black.
          iterColor = Math.min(max - 1, 12 + iter * 14);
        } else if (params.fractal === "orbitale_de_nova" && iter < max) {
          // Nova converges very quickly in large regions; stretch the returned
          // iteration bands so all palettes show visible separation.
          iterColor = Math.min(max - 1, 18 + iter * 10);
        } else if (estFractaleLyapunov && iter < max) {
          iterColor = Math.min(max - 1, 10 + iter * 1.8);
        } else if (estFractaleMagnetique && iter < max) {
          iterColor = Math.min(max - 1, 14 + iter * 4.2);
        }
        let couleur;
        if (estFractaleBassin) {
          couleur = getBasinColor(iter, max, pal);
        } else if (estFractaleLyapunov) {
          couleur = getColorFromRatio(0.12 + Math.pow(Math.min(0.999, iterColor / max), 0.85) * 0.82, pal);
        } else if (estFractaleMagnetique) {
          couleur = getColorFromRatio(0.08 + Math.pow(Math.min(0.999, iterColor / max), 0.68) * 0.88, pal);
        } else {
          couleur = getColor(iterColor, max, pal);
        }
        const [r, g, b] = couleur;
        const i = base + px * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imageDataBuffer, 0, 0, 0, row, w, endRow - row);
    row = endRow;

    if (row < h) {
      requestAnimationFrame(step);
    } else {
      if (token !== renderToken) return;
      const elapsed = (performance.now() - renderStart).toFixed(0);
      rendering = false;
      canvas.parentElement.classList.remove("rendering");
      updateStatusBar(`${backend} - ${elapsed} ms`, true);
    }
  }

  requestAnimationFrame(step);
}function updateStatusBar(msg, autoHide = false) {
  renderStatus.textContent = msg;
  renderStatus.classList.remove("hidden");
  if (autoHide) {
    setTimeout(() => renderStatus.classList.add("hidden"), 3000);
  }
}

// ============================================================
// INTERACTION (ZOOM / PAN)
// ============================================================

/** Convertit les coordonnées canvas ? coordonnées du plan complexe. */
function canvasToComplex(px, py) {
  return {
    re: view.centerX + (px - canvas.width  / 2) * view.pixelSize,
    im: view.centerY + (py - canvas.height / 2) * view.pixelSize,
  };
}

/** Zoom centré sur (px, py) canvas par le facteur donné. */
function zoomAt(px, py, factor) {
  const { re, im } = canvasToComplex(px, py);
  view.centerX  = re + (view.centerX - re) / factor;
  view.centerY  = im + (view.centerY - im) / factor;
  view.pixelSize /= factor;
  render();
}

function deplacerVue(deltaX, deltaY) {
  view.centerX += deltaX;
  view.centerY += deltaY;
  render();
}

function zoomerCentre(factor) {
  zoomAt(canvas.width / 2, canvas.height / 2, factor);
}

function attacherActionControle(bouton, action) {
  bouton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  });
  bouton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}

function resetView() {
  const preset = params.fractal === "multibrot"
    ? getMultibrotPreset(params.multibrotPower)
    : (VIEW_PRESETS[params.fractal] ?? VIEW_PRESETS.mandelbrot);
  view.centerX = preset.centerX;
  view.centerY = preset.centerY;
  view.pixelSize = preset.span / Math.max(canvas.width, 1);
  render();
}

// --- Clic simple : zoom ×2 ---
let lastClickTime = 0;

canvas.addEventListener("click", (e) => {
  const now = Date.now();
  if (now - lastClickTime < 350) return;   // ignorer si double-clic imminent
  lastClickTime = now;
  setTimeout(() => {
    if (Date.now() - lastClickTime >= 350) {
      zoomAt(e.offsetX, e.offsetY, 2);
    }
  }, 350);
});

// --- Double-clic : zoom ×0.5 (dézoom) ---
canvas.addEventListener("dblclick", (e) => {
  lastClickTime = Date.now() + 9999;  // bloquer le clic simple suivant
  zoomAt(e.offsetX, e.offsetY, 0.5);
});

// --- Molette souris ---
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.5 : 1 / 1.5;
  zoomAt(e.offsetX, e.offsetY, factor);
}, { passive: false });

// --- Glisser-déposer (pan) ---
let dragStart = null;
let dragViewX, dragViewY;

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  dragStart  = { x: e.offsetX, y: e.offsetY };
  dragViewX  = view.centerX;
  dragViewY  = view.centerY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  // Affichage des coordonnées
  const { re, im } = canvasToComplex(e.offsetX, e.offsetY);
  coordsDisplay.textContent =
    `Re ${re >= 0 ? " " : ""}${re.toFixed(6)}  Im ${im >= 0 ? " " : ""}${im.toFixed(6)}`;

  if (!dragStart) return;
  const dx = (e.offsetX - dragStart.x) * view.pixelSize;
  const dy = (e.offsetY - dragStart.y) * view.pixelSize;
  view.centerX = dragViewX - dx;
  view.centerY = dragViewY - dy;
  render();
});

canvas.addEventListener("pointerup",   () => { dragStart = null; });
canvas.addEventListener("pointerleave", () => { dragStart = null; });

// --- Pincement (tactile) ---
let lastPinchDist = null;

canvas.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    if (lastPinchDist !== null) {
      const factor = dist / lastPinchDist;
      const midX = (t0.clientX + t1.clientX) / 2 - canvas.getBoundingClientRect().left;
      const midY = (t0.clientY + t1.clientY) / 2 - canvas.getBoundingClientRect().top;
      zoomAt(midX, midY, factor);
    }
    lastPinchDist = dist;
  }
}, { passive: false });

canvas.addEventListener("touchend", () => { lastPinchDist = null; });

// ============================================================
// CONTRÔLES UI
// ============================================================

iterSlider.addEventListener("input", () => {
  params.maxIter = parseInt(iterSlider.value, 10);
  iterValue.textContent = params.maxIter;
  render();
});

familySelect.addEventListener("change", () => {
  const fractale = populateFractalSelect(familySelect.value, null);
  setActiveFractal(fractale);
});

fractalSelect.addEventListener("change", () => {
  setActiveFractal(fractalSelect.value);
});

multibrotPower.addEventListener("change", () => {
  params.multibrotPower = parseInt(multibrotPower.value, 10);
  if (params.fractal === "multibrot") {
    resetView();
  }
});

paletteSelect.addEventListener("change", () => {
  params.palette = paletteSelect.value;
  render();
});

btnReset.addEventListener("click", resetView);

attacherActionControle(btnPanUp, () => {
  deplacerVue(0.0, -canvas.height * view.pixelSize * 0.18);
});

attacherActionControle(btnPanDown, () => {
  deplacerVue(0.0, canvas.height * view.pixelSize * 0.18);
});

attacherActionControle(btnPanLeft, () => {
  deplacerVue(-canvas.width * view.pixelSize * 0.18, 0.0);
});

attacherActionControle(btnPanRight, () => {
  deplacerVue(canvas.width * view.pixelSize * 0.18, 0.0);
});

attacherActionControle(btnZoomIn, () => {
  zoomerCentre(1.5);
});

attacherActionControle(btnZoomOut, () => {
  zoomerCentre(1 / 1.5);
});

btnTogglePan.addEventListener("click", () => {
  const masque = panControls.classList.toggle("collapsed");
  btnTogglePan.textContent = masque ? "+" : "−";
  btnTogglePan.setAttribute("aria-label", masque ? "Afficher les contrôles de déplacement" : "Masquer les contrôles de déplacement");
});

window.addEventListener("keydown", (event) => {
  const cible = event.target;
  const etiquette = cible && typeof cible.tagName === "string" ? cible.tagName.toLowerCase() : "";
  if (etiquette === "input" || etiquette === "select" || etiquette === "textarea" || (cible && cible.isContentEditable)) {
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    deplacerVue(0.0, -canvas.height * view.pixelSize * 0.18);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    deplacerVue(0.0, canvas.height * view.pixelSize * 0.18);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    deplacerVue(-canvas.width * view.pixelSize * 0.18, 0.0);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    deplacerVue(canvas.width * view.pixelSize * 0.18, 0.0);
  } else if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
    event.preventDefault();
    zoomerCentre(1.5);
  } else if (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract") {
    event.preventDefault();
    zoomerCentre(1 / 1.5);
  }
});

function lireEntier(input, fallback) {
  const valeur = parseInt(input.value, 10);
  return Number.isFinite(valeur) ? valeur : fallback;
}

function blobDepuisCanvas(canvasSource, type = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvasSource.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Export image indisponible"));
    }, type, quality);
  });
}

async function exporterImageCourante() {
  updateStatusBar("Export PNG courant…");
  const blob = await blobDepuisCanvas(canvas, "image/png");
  telechargerBlob(blob, formaterNomExport("vue", "png"));
  updateStatusBar("PNG courant exporté", true);
}

async function exporterImageHauteResolution() {
  const largeur = lireEntier(exportImageWidth, 1920);
  const hauteur = lireEntier(exportImageHeight, 1080);
  const canvasExport = document.createElement("canvas");
  canvasExport.width = largeur;
  canvasExport.height = hauteur;
  const renduParams = clonerParamsExport();
  renduParams.maxIter = ajusterIterationsExport(largeur, hauteur, renduParams.maxIter);
  const vueCible = {
    centerX: view.centerX,
    centerY: view.centerY,
    pixelSize: view.pixelSize,
  };
  updateStatusBar("Rendu PNG haute résolution…");
  await rendreDansCanvas(canvasExport, vueCible, renduParams);
  const blob = await blobDepuisCanvas(canvasExport, "image/png");
  telechargerBlob(blob, formaterNomExport(`${largeur}x${hauteur}`, "png"));
  updateStatusBar("PNG haute résolution exporté", true);
}

async function exporterVideoZoom() {
  if (!vueExportDepart || !vueExportArrivee) {
    updateStatusBar("Définissez la vue de départ et la vue d'arrivée", true);
    return;
  }
  if (vueExportDepart.fractal !== vueExportArrivee.fractal) {
    updateStatusBar("La vidéo de zoom nécessite la même fractale au départ et à l'arrivée", true);
    return;
  }
  const largeur = lireEntier(exportVideoWidth, 1280);
  const hauteur = lireEntier(exportVideoHeight, 720);
  const duree = lireEntier(exportVideoDuration, 8);
  const fps = lireEntier(exportVideoFps, 24);
  const nbImages = Math.max(2, duree * fps);
  const canvasVideo = document.createElement("canvas");
  canvasVideo.width = largeur;
  canvasVideo.height = hauteur;
  if (typeof canvasVideo.captureStream !== "function" || typeof MediaRecorder === "undefined") {
    updateStatusBar("Export vidéo non supporté dans ce navigateur", true);
    return;
  }

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const morceaux = [];
  const recorder = new MediaRecorder(canvasVideo.captureStream(fps), { mimeType });
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) morceaux.push(event.data);
  };
  const finEnregistrement = new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(morceaux, { type: mimeType }));
  });

  updateStatusBar("Création de la vidéo…");
  recorder.start();

  for (let index = 0; index < nbImages; index++) {
    const t = nbImages <= 1 ? 1.0 : index / (nbImages - 1);
    const vueAnimation = {
      centerX: interpolerLineaire(vueExportDepart.centerX, vueExportArrivee.centerX, t),
      centerY: interpolerLineaire(vueExportDepart.centerY, vueExportArrivee.centerY, t),
      pixelSize: interpolerLogarithmique(vueExportDepart.pixelSize, vueExportArrivee.pixelSize, t),
    };
    const renduParams = clonerParamsExport(vueExportDepart);
    renduParams.maxIter = Math.round(interpolerLineaire(vueExportDepart.maxIter, vueExportArrivee.maxIter, t));
    renduParams.palette = vueExportDepart.palette;
    renduParams.multibrotPower = vueExportDepart.multibrotPower;
    renduParams.juliaCre = vueExportDepart.juliaCre;
    renduParams.juliaCim = vueExportDepart.juliaCim;
    await rendreDansCanvas(canvasVideo, vueAnimation, renduParams);
    updateStatusBar(`Création de la vidéo… ${index + 1}/${nbImages}`);
    await attendre(1000 / fps);
  }

  recorder.stop();
  const blob = await finEnregistrement;
  telechargerBlob(blob, formaterNomExport("zoom", "webm"));
  updateStatusBar("Vidéo exportée", true);
}

btnOpenExport.addEventListener("click", () => {
  exportPanel.classList.remove("hidden");
});

btnCloseExport.addEventListener("click", () => {
  exportPanel.classList.add("hidden");
});

btnExportCurrent.addEventListener("click", async () => {
  try {
    await exporterImageCourante();
  } catch (error) {
    updateStatusBar("Échec de l'export PNG courant", true);
    console.error(error);
  }
});

btnExportImage.addEventListener("click", async () => {
  try {
    await exporterImageHauteResolution();
  } catch (error) {
    updateStatusBar("Échec de l'export PNG haute résolution", true);
    console.error(error);
  }
});

btnCaptureStart.addEventListener("click", () => {
  vueExportDepart = capturerVueCourante();
  mettreAJourEtatVideo();
  updateStatusBar("Vue de départ enregistrée", true);
});

btnCaptureEnd.addEventListener("click", () => {
  vueExportArrivee = capturerVueCourante();
  mettreAJourEtatVideo();
  updateStatusBar("Vue d'arrivée enregistrée", true);
});

btnExportVideo.addEventListener("click", async () => {
  try {
    await exporterVideoZoom();
  } catch (error) {
    updateStatusBar("Échec de l'export vidéo", true);
    console.error(error);
  }
});

btnToggle.addEventListener("click", () => {
  if (window.innerWidth <= 820) {
    // Mobile : overlay plein-écran, le canvas ne change pas de taille
    sidebar.classList.toggle("mobile-open");
  } else {
    sidebar.classList.toggle("collapsed");
    // Recalculer le pixelSize après changement de taille
    setTimeout(() => {
      const newW = canvas.parentElement.clientWidth;
      view.pixelSize = view.pixelSize * (canvas.width / Math.max(newW, 1));
      render();
    }, 280);
  }
});

btnCloseSidebar.addEventListener("click", () => {
  sidebar.classList.remove("mobile-open");
});

window.addEventListener("resize", () => {
  resizeCanvas();
  render();
});

// ============================================================
// CHARGEMENT DU SOURCE & TRANSPILATION (contextuel par fractale)
// ============================================================

const tabFrench = document.getElementById("tab-french");
const tabPython = document.getElementById("tab-python");
const codeFrench = document.getElementById("code-french");
const codePython = document.getElementById("code-python");

/**
 * Associe chaque fractale au module source (.ml / .py) qui la contient.
 * Utilisé pour l'affichage contextuel dans la barre latérale.
 */
const FRACTAL_SOURCE_MAP = {
  mandelbrot:                  "fractales_escape",
  mandelbrot_classe:           "fractales_classes_compat",
  julia:                       "fractales_escape",
  burning_ship:                "fractales_escape",
  tricorn:                     "fractales_escape",
  multibrot:                   "fractales_escape",
  celtic:                      "fractales_variantes",
  buffalo:                     "fractales_variantes",
  perpendicular_burning_ship:  "fractales_variantes",
  heart:                       "fractales_variantes",
  perpendicular_mandelbrot:    "fractales_variantes",
  perpendicular_celtic:        "fractales_variantes",
  duck:                        "fractales_variantes",
  buddhabrot:                  "fractales_escape",
  newton:                      "fractales_dynamique",
  phoenix:                     "fractales_dynamique",
  lyapunov:                    "fractales_dynamique",
  lyapunov_multisequence:      "fractales_dynamique",
  bassin_newton_generalise:    "fractales_dynamique",
  orbitale_de_nova:            "fractales_dynamique",
  collatz_complexe:            "fractales_dynamique",
  attracteur_de_clifford:      "fractales_dynamique",
  attracteur_de_peter_de_jong: "fractales_dynamique",
  attracteur_ikeda:            "fractales_dynamique",
  attracteur_de_henon:         "fractales_dynamique",
  lorenz_attractor:            "fractales_dynamique",
  feigenbaum_tree:             "fractales_dynamique",
  barnsley:                    "fractales_ifs",
  sierpinski:                  "fractales_ifs",
  tapis_sierpinski:            "fractales_ifs",
  menger_sponge:               "fractales_ifs",
  mandelbulb:                  "fractales_ifs",
  tetraedre_sierpinski:        "fractales_ifs",
  julia_quaternion:            "fractales_ifs",
  mandelbox:                   "fractales_ifs",
  vicsek_fractal:              "fractales_ifs",
  lichtenberg_figures:         "fractales_ifs",
  koch:                        "fractales_lsystem",
  dragon_heighway:             "fractales_lsystem",
  dragon_curve:                "fractales_lsystem",
  cantor_set:                  "fractales_lsystem",
  apollonian_gasket:           "fractales_lsystem",
  t_square_fractal:            "fractales_lsystem",
  h_fractal:                   "fractales_lsystem",
  hilbert_curve:               "fractales_lsystem",
  peano_curve:                 "fractales_lsystem",
  arbre_pythagore:             "fractales_lsystem",
  magnet1:                     "fractales_magnetiques",
  magnet2:                     "fractales_magnetiques",
  magnet3:                     "fractales_magnetiques",
  lambda_fractale:             "fractales_magnetiques",
  lambda_cubique:              "fractales_magnetiques",
  magnet_cosinus:              "fractales_magnetiques",
  magnet_sinus:                "fractales_magnetiques",
  nova_magnetique:             "fractales_magnetiques",
};

/** Cache : { moduleName: { mlHtml, pyHtml } } */
const sourcesCache = {};

/**
 * Charge et affiche le source .ml et le Python transpilé du module
 * contenant la fractale sélectionnée.
 * @param {string} fractalName
 */
async function loadSources(fractalName) {
  const module = FRACTAL_SOURCE_MAP[fractalName] ?? "main";

  // Mettre à jour les étiquettes des onglets
  tabFrench.textContent = `FR ${module}.ml`;
  tabPython.textContent  = `PY ${module}.py`;

  // Retourner le cache si disponible
  if (sourcesCache[module]) {
    codeFrench.innerHTML = sourcesCache[module].mlHtml;
    codePython.innerHTML = sourcesCache[module].pyHtml;
    return;
  }

  codeFrench.innerHTML = `<span class="cmt"># Chargement de ${module}.ml…</span>`;
  codePython.innerHTML = `<span class="cmt"># Chargement de ${module}.py…</span>`;

  // Source français (.ml)
  let mlHtml;
  try {
    const resp = await fetch(`${module}.ml`);
    const src  = resp.ok ? await resp.text() : `# Source indisponible (${module}.ml)`;
    mlHtml = highlightFrench(escapeHtml(src));
  } catch {
    mlHtml = `<span class="cmt"># Impossible de charger ${module}.ml</span>`;
  }
  codeFrench.innerHTML = mlHtml;

  // Python transpilé (.py)
  let pyHtml;
  try {
    const resp = await fetch(`${module}.py`);
    const src  = resp.ok ? await resp.text() : `# Transpilation indisponible (${module}.py)`;
    pyHtml = highlightPython(escapeHtml(src));
  } catch {
    pyHtml = `<span class="cmt"># Impossible de charger ${module}.py</span>`;
  }
  codePython.innerHTML = pyHtml;

  sourcesCache[module] = { mlHtml, pyHtml };
}

tabFrench.addEventListener("click", () => {
  tabFrench.classList.add("active");
  tabPython.classList.remove("active");
  document.getElementById("panel-french").style.display = "";
  document.getElementById("panel-python").style.display = "none";
});

tabPython.addEventListener("click", () => {
  tabPython.classList.add("active");
  tabFrench.classList.remove("active");
  document.getElementById("panel-french").style.display = "none";
  document.getElementById("panel-python").style.display = "";
});

// ============================================================
// COLORATION SYNTAXIQUE (légère, sans dépendance externe)
// ============================================================

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Coloration syntaxique minimale pour le source français multilingual.
 * Traite ligne par ligne pour éviter les chevauchements.
 */
function highlightFrench(code) {
  const KW = [
    "déf", "fonction", "classe", "retour", "tantque", "soit", "si", "sinonsi", "sinon",
    "pour", "dans", "Vrai", "Faux", "intervalle", "et", "ou", "non",
    "constante", "affirmer", "importer", "soi", "super",
  ];
  const kwRe = new RegExp(`\\b(${KW.join("|")})\\b`, "g");

  return code.split("\n").map(line => {
    // Commentaires
    const hashIdx = line.indexOf("#");
    if (hashIdx !== -1) {
      const before = line.slice(0, hashIdx);
      const comment = line.slice(hashIdx);
      return applyFrenchTokens(before, kwRe) + `<span class="cmt">${comment}</span>`;
    }
    return applyFrenchTokens(line, kwRe);
  }).join("\n");
}

function applyFrenchTokens(line, kwRe) {
  return line
    .replace(kwRe, `<span class="kw">$1</span>`)
    .replace(/\b(mandelbrot|mandelbrot_classe|julia|burning_ship|tricorn|multibrot|celtic|buffalo|perpendicular_burning_ship|heart|perpendicular_mandelbrot|perpendicular_celtic|duck|buddhabrot|newton|phoenix|lyapunov|lyapunov_multisequence|bassin_newton_generalise|orbitale_de_nova|collatz_complexe|attracteur_de_clifford|attracteur_de_peter_de_jong|attracteur_ikeda|attracteur_de_henon|lorenz_attractor|feigenbaum_tree|barnsley|sierpinski|tapis_sierpinski|menger_sponge|mandelbulb|vicsek_fractal|lichtenberg_figures|koch|dragon_heighway|dragon_curve|cantor_set|apollonian_gasket|t_square_fractal|h_fractal|hilbert_curve|peano_curve|arbre_pythagore|magnet1|magnet2|magnet3|lambda_fractale|lambda_cubique|magnet_cosinus|magnet_sinus|nova_magnetique|barnsley_etape|sierpinski_etape|menger_etape|vicsek_etape|projeter_menger_x|projeter_menger_y|projeter_lorenz_x|projeter_lorenz_y|etapeTapisSierpinski|etapeAttracteurClifford|etapeAttracteurPeterDeJong|etapeAttracteurIkeda|etapeAttracteurHenon|etapeLorenzAttractor|etapeMengerSponge|etapeVicsekFractal|etapeLichtenberg|etapeMandelbulb|projeterMengerSponge|projeterLorenzAttractor|projeterMandelbulb|koch_generer|genererDragonHeighway|genererHilbert|genererPeano|norme_carre|complexe_diviser_re|complexe_diviser_im|iterer|etape|racine_approx|abs_val|abs_dynamique|abs_koch|remplacer|regle|generer|sinus_dynamique|cosinus_dynamique|sinus_magnetique|cosinus_magnetique)\b/g, `<span class="fn">$1</span>`)
    .replace(/\b(\d+\.\d+|\d+)\b/g, `<span class="num">$1</span>`)
    .replace(/\b(cx|cy|zx|zy|c_re|c_im|max_iter|x|y|iter|xtemp|ax|ay|x2|y2|fx|fy|dfx|dfy|denom|delta_x|delta_y|x_prec|y_prec|xtemp|ytemp|d1|d2|d3|d4|puissance|rn|angle|r|theta|nx|ny|a|b|niveau|echelle|dist|score|somme|exposant|parametre)\b/g, `<span class="param">$1</span>`);
}

function highlightPython(code) {
  const KW = ["def", "return", "while", "if", "else", "for", "in", "True", "False", "and", "or", "not"];
  const kwRe = new RegExp(`\\b(${KW.join("|")})\\b`, "g");

  return code.split("\n").map(line => {
    const hashIdx = line.indexOf("#");
    if (hashIdx !== -1) {
      const before = line.slice(0, hashIdx);
      const comment = line.slice(hashIdx);
      return applyPyTokens(before, kwRe) + `<span class="cmt">${comment}</span>`;
    }
    return applyPyTokens(line, kwRe);
  }).join("\n");
}

function applyPyTokens(line, kwRe) {
  return line
    .replace(kwRe, `<span class="kw">$1</span>`)
    .replace(/\b(mandelbrot|mandelbrot_classe|julia|burning_ship|tricorn|multibrot|celtic|buffalo|perpendicular_burning_ship|heart|perpendicular_mandelbrot|perpendicular_celtic|duck|buddhabrot|newton|phoenix|lyapunov|lyapunov_multisequence|bassin_newton_generalise|orbitale_de_nova|collatz_complexe|attracteur_de_clifford|attracteur_de_peter_de_jong|attracteur_ikeda|attracteur_de_henon|lorenz_attractor|feigenbaum_tree|barnsley|sierpinski|tapis_sierpinski|menger_sponge|mandelbulb|vicsek_fractal|lichtenberg_figures|koch|dragon_heighway|dragon_curve|cantor_set|apollonian_gasket|t_square_fractal|h_fractal|hilbert_curve|peano_curve|arbre_pythagore|magnet1|magnet2|magnet3|lambda_fractale|lambda_cubique|magnet_cosinus|magnet_sinus|nova_magnetique|barnsley_etape|sierpinski_etape|menger_etape|vicsek_etape|projeter_menger_x|projeter_menger_y|projeter_lorenz_x|projeter_lorenz_y|koch_generer|genererDragonHeighway|genererHilbert|genererPeano|norme_carre|complexe_diviser_re|complexe_diviser_im|iterer|etape|racine_approx|abs_val|remplacer|regle|generer|sinus_dynamique|cosinus_dynamique|sinus_magnetique|cosinus_magnetique)\b/g, `<span class="fn">$1</span>`)
    .replace(/\b(\d+\.\d+|\d+)\b/g, `<span class="num">$1</span>`)
    .replace(/\b(cx|cy|zx|zy|c_re|c_im|max_iter|x|y|iter|xtemp|ax|ay|x2|y2|fx|fy|dfx|dfy|denom|delta_x|delta_y|x_prec|y_prec|xtemp|ytemp|d1|d2|d3|d4|puissance|rn|angle|r|theta|nx|ny|a|b|niveau|echelle|dist|score|somme|exposant|parametre)\b/g, `<span class="param">$1</span>`);
}

// ============================================================
// CHARGEMENT DES DONNÉES BENCHMARK
// ============================================================

async function loadBenchmark() {
  try {
    const resp = await fetch("benchmark.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderBenchmarkBadge(data);
  } catch (err) {
    console.warn("[Benchmark] Données indisponibles :", err.message);
    if (badgeLoading) {
      badgeLoading.textContent = "Données benchmark indisponibles";
    }
  }
}

/** Formate un nombre avec espace fine comme séparateur de milliers (style français). */
function frFmt(n) {
  if (n === null || n === undefined) return "N/A";
  return n.toLocaleString("fr-FR");
}

function renderBenchmarkBadge(data) {
  const {
    python_ms,
    wasm_ms,
    speedup,
    wasm_available,
    wasm_estimated,
    wasm_pipeline,
  } = data;

  let html = "";

  const benchmarkDisabled = wasm_pipeline === "multilingual_official_wat2wasm" &&
    python_ms === null &&
    wasm_ms === null;

  if (benchmarkDisabled && wasm_available) {
    html += `
      <div class="badge-row">
        <span class="badge-wasm">• WASM généré</span>
        <span class="badge-label">pipeline officiel</span>
      </div>
      <div class="badge-row">
        <span class="badge-python" style="color:var(--text-dim)">Benchmark désactivé (mode strict)</span>
      </div>`;
    badgeDiv.innerHTML = html;
    return;
  }

  if (wasm_available && wasm_ms !== null) {
    const wasmLabel = wasm_estimated ? "WASM (estimé)" : "WASM";
    const speedupLabel = speedup !== null
      ? `${typeof speedup === "number" ? speedup.toFixed(1) : frFmt(speedup)}× plus rapide`
      : "";
    html += `
      <div class="badge-row">
        <span class="badge-wasm">? ~${frFmt(wasm_ms)} ms</span>
        <span class="badge-label">${wasmLabel}</span>
      </div>
      <div class="badge-row">
        <span class="badge-python">PY ${frFmt(python_ms)} ms</span>
        <span class="badge-label">Python</span>
      </div>
      ${speedupLabel ? `<div class="badge-row"><span class="badge-speedup">${speedupLabel}</span></div>` : ""}`;
  } else {
    html += `
      <div class="badge-row">
        <span class="badge-python">PY ${frFmt(python_ms)} ms</span>
        <span class="badge-label">Python</span>
      </div>
      <div class="badge-row">
        <span class="badge-python" style="color:var(--text-dim)">WASM non disponible</span>
      </div>`;
  }

  badgeDiv.innerHTML = html;
}

// ============================================================
// INDICE DE ZOOM (disparaît après quelques secondes)
// ============================================================
function showZoomHint() {
  if (!zoomHint) return;
  setTimeout(() => {
    zoomHint.classList.add("fade-out");
    setTimeout(() => zoomHint.remove(), 1200);
  }, 4000);
}

// ============================================================
// INITIALISATION
// ============================================================

async function init() {
  resizeCanvas();
  syncSelectors(params.fractal);
  mettreAJourEtatVideo();

  // Vue initiale : preset de la fractale sélectionnée
  const preset = VIEW_PRESETS[params.fractal] ?? VIEW_PRESETS.mandelbrot;
  view.centerX = preset.centerX;
  view.centerY = preset.centerY;
  view.pixelSize = preset.span / Math.max(canvas.width, 1);

  // Lancer un premier rendu JS pendant le chargement WASM
  updateStatusBar("Initialisation…");
  render();

  // Charger WASM (peut prendre 100–500 ms)
  await loadWasm();

  // Re-rendre avec WASM si disponible
  render();

  // Charger sources et benchmark en parallèle
  await Promise.all([loadSources(params.fractal), loadBenchmark()]);

  // Adapter le texte de l'astuce selon le dispositif
  if (zoomHint && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    zoomHint.textContent = "Glisser : déplacement · Toucher : zoom ×2 · Double toucher : dézoom · Pincer : zoom libre";
  }

  showZoomHint();
}

// Démarrer
init().catch(console.error);





