/**
 * renderer.js — Explorateur de Fractales
 *
 * Charge mandelbrot.wasm (compilé depuis le source français multilingual),
 * rend l'ensemble de Mandelbrot sur un <canvas>, et gère toute l'interactivité.
 *
 * Pipeline : source français (.multi) ? WASM (build-time) ? browser WebAssembly API
 */

"use strict";

import {
  initialiserExports,
} from "./renderer-export.js?v=app";
import {
  initialiserSignets,
} from "./renderer-bookmarks.js?v=app";
import {
  initialiserPanneauSource,
} from "./renderer-source-panel.js?v=app";
import {
  animerVersVue,
  decoderEtat,
  encoderEtat,
  initialiserPartage,
  mettreAJourHash,
} from "./renderer-navigation.js?v=app";
import {
  initialiserExploration,
} from "./renderer-exploration.js?v=app";

const WASM_URL = "mandelbrot.wasm?v=app";

// ============================================================
// ÉTAT DE L'APPLICATION
// ============================================================

/** Paramètres de la vue courante (plan complexe) */
const view = {
  centerX: -0.5,
  centerY: 0.0,
  /** unités mathématiques par pixel */
  pixelSize: 4.0 / Math.min(window.innerWidth - 380, 800),
  /** angle de rotation du plan complexe (radians) */
  rotation: 0.0,
};

/** Paramètres de rendu */
const params = {
  maxIter: 256,
  fractal: "mandelbrot", // fractale active
  multibrotPower: 5,
  juliaCre: -0.8,
  juliaCim: 0.156,
  palette: "aurora",   // "feu" | "ocean" | "aurora"
  paletteBackground: "#020008",
  paletteInterior: "#fff5b4",
  paletteStops: ["#0a0028", "#4600aa", "#0028e6", "#00aad2", "#00e66e", "#a0ff00", "#ffc800", "#fff5b4"],
  coloringMode: "standard",
  palettePhase: 0.0,
  paletteContours: false,
  deepZoomAutoIterations: false,
  deepZoomQuality: "standard",
  studio3dMaterial: "lumineux",
  studio3dFog: 0.0,
  weatherOverlays: "",
  lsystemProposalActive: false,
  lsystemAxiom: "F",
  lsystemRules: "F=F+F--F+F",
  lsystemAngle: 60,
  lsystemGenerations: 4,
  formulePropositionActive: false,
  formuleIteration: "z*z+c",
  formuleEscapeRadius: 2,
  formuleMode: "mandelbrot",
  coordTransform: "aucune",
  mobiusPreset: "inversion_cercle",
};

const VIEW_PRESETS = {
  mandelbrot: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  mandelbrot_classe: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  julia: { centerX: 0.0, centerY: 0.0, span: 3.0 },
  burning_ship: { centerX: -0.5, centerY: -0.5, span: 3.0 },
  tricorn: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  multibrot: { centerX: 0.0, centerY: 0.0, span: 2.8 },
  celtic: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  buffalo: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  perpendicular_burning_ship: { centerX: -0.5, centerY: -0.4, span: 3.0 },
  heart: { centerX: -0.2, centerY: 0.0, span: 3.0 },
  perpendicular_mandelbrot: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  perpendicular_celtic: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  duck: { centerX: -0.5, centerY: 0.0, span: 3.0 },
  buddhabrot: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  newton: { centerX: 0.0, centerY: 0.0, span: 3.0 },
  phoenix: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  lyapunov: { centerX: 3.1, centerY: 3.1, span: 1.7 },
  lyapunov_multisequence: { centerX: 3.1, centerY: 3.1, span: 1.7 },
  bassin_newton_generalise: { centerX: 0.0, centerY: 0.0, span: 3.2 },
  orbitale_de_nova: { centerX: 0.0, centerY: 0.0, span: 2.1 },
  collatz_complexe: { centerX: -0.35, centerY: 0.0, span: 3.6 },
  attracteur_de_clifford: { centerX: 0.0, centerY: 0.0, span: 4.8 },
  attracteur_de_peter_de_jong: { centerX: 0.0, centerY: 0.0, span: 4.8 },
  attracteur_ikeda: { centerX: 0.68, centerY: -0.67, span: 3.9 },
  attracteur_de_henon: { centerX: 0.3, centerY: 0.1, span: 3.0 },
  lorenz_attractor: { centerX: 0.0, centerY: -0.2, span: 7.2 },
  rossler_attractor: { centerX: 0.2, centerY: 0.0, span: 5.8 },
  aizawa_attractor: { centerX: 0.0, centerY: 0.0, span: 4.8 },
  sprott_attractor: { centerX: 0.0, centerY: 0.0, span: 4.6 },
  feigenbaum_tree: { centerX: 0.45, centerY: 0.0, span: 2.2 },
  barnsley: { centerX: 0.0, centerY: 5.0, span: 9.0 },
  sierpinski: { centerX: 0.5, centerY: 0.35, span: 1.0 },
  tapis_sierpinski: { centerX: 0.0, centerY: 0.0, span: 2.2 },
  menger_sponge: { centerX: 0.0, centerY: 0.0, span: 3.2 },
  mandelbulb: { centerX: 0.0, centerY: 0.0, span: 3.6 },
  tetraedre_sierpinski: { centerX: 0.0, centerY: 0.0, span: 1.6 },
  julia_quaternion: { centerX: 0.0, centerY: 0.0, span: 3.2 },
  mandelbox: { centerX: 0.0, centerY: 0.3, span: 7.0 },
  vicsek_fractal: { centerX: 0.0, centerY: 0.0, span: 3.0 },
  lichtenberg_figures: { centerX: 0.0, centerY: 0.0, span: 3.8 },
  koch: { centerX: 0.45, centerY: -0.28, span: 0.9 },
  dragon_heighway: { centerX: 0.2, centerY: 0.0, span: 2.8 },
  courbe_levy_c: { centerX: 0.0, centerY: 0.0, span: 2.5 },
  gosper_curve: { centerX: 0.15, centerY: 0.05, span: 3.2 },
  cantor_set: { centerX: 0.0, centerY: 0.0, span: 2.6 },
  triangle_de_cercles_recursifs: { centerX: 0.0, centerY: 0.05, span: 2.4 },
  apollonian_gasket: { centerX: 0.0, centerY: 0.0, span: 2.2 },
  t_square_fractal: { centerX: 0.0, centerY: 0.0, span: 2.8 },
  h_fractal: { centerX: 0.0, centerY: 0.0, span: 2.8 },
  hilbert_curve: { centerX: 0.0, centerY: 0.0, span: 2.3 },
  peano_curve: { centerX: 0.0, centerY: 0.0, span: 2.3 },
  arbre_pythagore: { centerX: 0.0, centerY: 0.7, span: 2.6 },
  magnet1: { centerX: 1.5, centerY: 0.0, span: 4.0 },
  magnet2: { centerX: 1.5, centerY: 0.0, span: 5.0 },
  magnet3: { centerX: 1.2, centerY: 0.0, span: 4.4 },
  lambda_fractale: { centerX: 0.0, centerY: 0.0, span: 8.0 },
  lambda_cubique: { centerX: 0.0, centerY: 0.0, span: 6.2 },
  magnet_cosinus: { centerX: 0.0, centerY: 0.0, span: 4.6 },
  magnet_sinus: { centerX: 0.0, centerY: 0.0, span: 4.6 },
  nova_magnetique: { centerX: 0.0, centerY: 0.0, span: 3.2 },
  burning_julia: { centerX: 0.0, centerY: 0.0, span: 3.0 },
  biomorphe: { centerX: -0.5, centerY: 0.0, span: 3.2 },
  duffing_attractor: { centerX: 0.0, centerY: 0.0, span: 5.0 },
  mandelbrot_lisse: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  julia_lisse: { centerX: 0.0, centerY: 0.0, span: 3.0 },
  burning_ship_lisse: { centerX: -0.5, centerY: -0.5, span: 3.0 },
  tricorn_lisse: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  mandelbrot_piege_cercle: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  mandelbrot_piege_croix: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  mandelbrot_piege_ligne: { centerX: -0.5, centerY: 0.0, span: 3.5 },
  julia_piege_cercle: { centerX: 0.0, centerY: 0.0, span: 3.0 },
};

const JULIA_C_PRESETS = {
  julia: { re: -0.8, im: 0.156 },
  burning_julia: { re: -0.8, im: -0.156 },
  julia_lisse: { re: -0.8, im: 0.156 },
  julia_piege_cercle: { re: -0.8, im: 0.156 },
};

function getMultibrotPreset(power) {
  const p = Number.isFinite(power) ? power : 5;
  // Higher powers concentrate details near the origin.
  if (p >= 7) return { centerX: 0.0, centerY: 0.0, span: 1.6 };
  if (p >= 5) return { centerX: 0.0, centerY: 0.0, span: 1.8 };
  return { centerX: 0.0, centerY: 0.0, span: 2.2 };
}

const POINT_FRACTALS = new Set(["barnsley", "sierpinski", "tapis_sierpinski", "menger_sponge", "mandelbulb", "tetraedre_sierpinski", "julia_quaternion", "mandelbox", "vicsek_fractal", "lichtenberg_figures", "attracteur_de_clifford", "attracteur_de_peter_de_jong", "attracteur_ikeda", "attracteur_de_henon", "lorenz_attractor", "rossler_attractor", "aizawa_attractor", "sprott_attractor", "feigenbaum_tree", "duffing_attractor"]);
const LINE_FRACTALS = new Set(["koch", "dragon_heighway", "courbe_levy_c", "gosper_curve", "cantor_set", "triangle_de_cercles_recursifs", "apollonian_gasket", "t_square_fractal", "h_fractal", "hilbert_curve", "peano_curve", "arbre_pythagore"]);

/** Fonctions fractales exportées par WASM */
let wasmFunctions = {};
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
let explorationModes = null;
let formuleFnCompilee = null;

// ============================================================
// ÉLÉMENTS DOM
// ============================================================

const canvas = document.getElementById("fractal-canvas");
const canvas3d = document.getElementById("fractal-canvas-3d");
const ctx = canvas.getContext("2d", { willReadFrequently: false });
const overlayCanvas = document.getElementById("fractal-overlay-canvas");
const renderStatus = document.getElementById("render-status");
const coordsDisplay = document.getElementById("coords-display");
const nav3dHud = document.getElementById("nav-3d-hud");
const iterSlider = document.getElementById("iter-slider");
const iterValue = document.getElementById("iter-value");
const controlsFooter = document.getElementById("controls");
const controlsSummary = document.getElementById("controls-summary");
const controlsSummaryFractal = document.getElementById("controls-summary-fractal");
const controlsSummaryDetails = document.getElementById("controls-summary-details");
const btnToggleControls = document.getElementById("btn-toggle-controls");
const btnMinimizeControls = document.getElementById("btn-minimize-controls");
const familySelect = document.getElementById("family-select");
const fractalSelect = document.getElementById("fractal-select");
const multibrotPower = document.getElementById("multibrot-power");
const multibrotPowerGroup = document.getElementById("multibrot-power-group");
const controlsSpecific = document.getElementById("controls-specific");
const fractalOptionsStack = document.getElementById("fractal-options-stack");
const fractalOptionsSummary = document.getElementById("fractal-options-summary");
const fractalOptionsPanel = document.getElementById("fractal-options-panel");
const paletteSelect = document.getElementById("palette-select");
const customPaletteControls = document.getElementById("custom-palette-controls");
const toggleCustomPaletteButton = document.getElementById("btn-toggle-custom-palette");
const closeCustomPaletteButton = document.getElementById("btn-close-custom-palette");
const customPalettePreview = document.getElementById("custom-palette-preview");
const customPaletteStops = document.getElementById("custom-palette-stops");
const addPaletteStopButton = document.getElementById("btn-add-palette-stop");
const paletteBackgroundInput = document.getElementById("palette-background");
const paletteInteriorInput = document.getElementById("palette-interior");
const btnReset = document.getElementById("btn-reset");
const btnPanUp = document.getElementById("btn-pan-up");
const btnPanLeft = document.getElementById("btn-pan-left");
const btnPanRight = document.getElementById("btn-pan-right");
const btnPanDown = document.getElementById("btn-pan-down");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnRotateLeft = document.getElementById("btn-rotate-left");
const btnRotateRight = document.getElementById("btn-rotate-right");
const btnTogglePan = document.getElementById("btn-toggle-pan");
const btnToggle = document.getElementById("btn-toggle-sidebar");
const btnCloseSidebar = document.getElementById("btn-close-sidebar");
const btnOpenExport = document.getElementById("btn-open-export");
const btnCloseExport = document.getElementById("btn-close-export");
const btnExportCurrent = document.getElementById("btn-export-current");
const btnExportImage = document.getElementById("btn-export-image");
const btnCaptureStart = document.getElementById("btn-capture-start");
const btnCaptureEnd = document.getElementById("btn-capture-end");
const btnExportVideo = document.getElementById("btn-export-video");
const btnExportSvg = document.getElementById("btn-export-svg");
const sidebar = document.getElementById("sidebar");
const panControls = document.getElementById("pan-controls");
const zoomHint = document.getElementById("zoom-hint");
const badgeDiv = document.getElementById("benchmark-badge");
const badgeLoading = document.getElementById("badge-loading");
const exportPanel = document.getElementById("export-panel");
const exportImageWidth = document.getElementById("export-image-width");
const exportImageHeight = document.getElementById("export-image-height");
const exportVideoWidth = document.getElementById("export-video-width");
const exportVideoHeight = document.getElementById("export-video-height");
const exportVideoDuration = document.getElementById("export-video-duration");
const exportVideoFps = document.getElementById("export-video-fps");
const exportVideoState = document.getElementById("export-video-state");
const tabFrench = document.getElementById("tab-french");
const tabPython = document.getElementById("tab-python");
const codeFrench = document.getElementById("code-french");
const codePython = document.getElementById("code-python");
const panelFrench = document.getElementById("panel-french");
const panelPython = document.getElementById("panel-python");

const juliaCReSlider = document.getElementById("julia-c-re");
const juliaCImSlider = document.getElementById("julia-c-im");
const juliaCReValue = document.getElementById("julia-c-re-value");
const juliaCImValue = document.getElementById("julia-c-im-value");
const juliaCControls = document.getElementById("julia-c-controls");
const juliaCouplingCanvas = document.getElementById("julia-coupling-canvas");
const jCtx = juliaCouplingCanvas?.getContext("2d", { willReadFrequently: false }) ?? null;
const jW = juliaCouplingCanvas?.width ?? 0;
const jH = juliaCouplingCanvas?.height ?? 0;
const btnBookmark = document.getElementById("btn-bookmark");
const bookmarkPanel = document.getElementById("bookmark-panel");
const btnCloseBookmarks = document.getElementById("btn-close-bookmarks");
const bookmarkList = document.getElementById("bookmark-list");
const explorationDock = document.getElementById("exploration-dock");
const explorationPanel = document.getElementById("exploration-panel");
const btnCloseExploration = document.getElementById("btn-close-exploration");
const explorationTitle = document.getElementById("exploration-panel-title");
const explorationSubtitle = document.getElementById("exploration-panel-subtitle");
const explorationViews = [...document.querySelectorAll(".exploration-view")];
const parameterMapCanvas = document.getElementById("parameter-map-canvas");
const parameterMapReadout = document.getElementById("parameter-map-readout");
const lsystemProposalCanvas = document.getElementById("lsystem-proposal-canvas");
const formuleProposalCanvas = document.getElementById("formule-proposal-canvas");

let familySelectCompact = null;
let fractalSelectCompact = null;
let iterSliderCompact = null;
let iterValueCompact = null;
let paletteSelectCompact = null;
let controlsSummaryActions = null;
let couplagePendingId = null;
let customPaletteEditorOpen = false;
let controlsCollapsed = false;

function copierOptionsSelect(source, target) {
  [...source.options].forEach((option) => {
    target.appendChild(option.cloneNode(true));
  });
}

function definirIconeBouton(button, icon) {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.textContent = icon;
  button.replaceChildren(span);
}

function initialiserControlesCompacts() {
  if (!controlsSummary || !btnToggleControls || !familySelect || !paletteSelect) return;
  const compact = document.createElement("div");
  compact.id = "controls-compact";
  compact.className = "controls-compact";
  compact.setAttribute("aria-label", "Contrôles compacts");

  const familyCompact = document.createElement("select");
  familyCompact.id = "family-select-compact";
  familyCompact.setAttribute("aria-label", "Choisir une famille de fractales");
  copierOptionsSelect(familySelect, familyCompact);
  compact.appendChild(familyCompact);

  const fractalCompact = document.createElement("select");
  fractalCompact.id = "fractal-select-compact";
  fractalCompact.setAttribute("aria-label", "Choisir une fractale");
  compact.appendChild(fractalCompact);

  const iterGroup = document.createElement("div");
  iterGroup.className = "compact-iter-group";
  const iterCompact = document.createElement("input");
  iterCompact.type = "range";
  iterCompact.id = "iter-slider-compact";
  iterCompact.min = "64";
  iterCompact.max = "1024";
  iterCompact.step = "64";
  iterCompact.value = String(params.maxIter);
  iterCompact.setAttribute("aria-label", "Choisir le nombre d'itérations");
  iterGroup.appendChild(iterCompact);
  const iterValue = document.createElement("span");
  iterValue.id = "iter-value-compact";
  iterValue.className = "control-value";
  iterValue.textContent = String(params.maxIter);
  iterGroup.appendChild(iterValue);
  compact.appendChild(iterGroup);

  const paletteCompact = document.createElement("select");
  paletteCompact.id = "palette-select-compact";
  paletteCompact.setAttribute("aria-label", "Choisir une palette de couleurs");
  copierOptionsSelect(paletteSelect, paletteCompact);
  compact.appendChild(paletteCompact);

  controlsSummary.insertBefore(compact, btnToggleControls);
  familySelectCompact = familyCompact;
  fractalSelectCompact = fractalCompact;
  iterSliderCompact = iterCompact;
  iterValueCompact = iterValue;
  paletteSelectCompact = paletteCompact;
}

initialiserControlesCompacts();

function initialiserActionsCompactes() {
  if (!controlsSummary || !btnToggleControls) return;
  const actions = document.createElement("div");
  actions.className = "controls-summary-actions";
  [
    ["reset", "↺"],
    ["bookmark", "★"],
    ["export", "⇩"],
  ].forEach(([action, label]) => {
    const button = document.createElement("button");
    button.className = "btn btn-secondary summary-action-btn";
    button.type = "button";
    button.dataset.action = action;
    button.textContent = label;
    actions.appendChild(button);
  });
  controlsSummary.insertBefore(actions, btnToggleControls);
  controlsSummaryActions = actions;
  controlsSummaryActions.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (action === "reset") btnReset?.click();
    if (action === "bookmark") btnBookmark?.click();
    if (action === "export") btnOpenExport?.click();
  });
}

initialiserActionsCompactes();

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
    // Oxidized copper: umber → rust → copper → brass → champagne
    fond: [8, 4, 2],
    interieur: [24, 10, 4],
    stops: [
      [28, 12, 6], [82, 36, 18], [148, 74, 34], [203, 118, 52],
      [224, 164, 78], [238, 203, 120], [247, 228, 178], [255, 248, 232],
    ],
  },
  lagon: {
    // Glacier glass: polar night → slate blue → ice cyan → frozen white
    fond: [1, 6, 10],
    interieur: [6, 16, 24],
    stops: [
      [8, 22, 34], [22, 56, 88], [44, 104, 146], [82, 164, 196],
      [138, 216, 232], [192, 241, 244], [229, 250, 252], [255, 255, 255],
    ],
  },
  crepuscule: {
    // Velvet dusk: aubergine → orchid → rose → apricot → moonlight
    fond: [10, 2, 12],
    interieur: [26, 8, 30],
    stops: [
      [30, 6, 42], [76, 18, 92], [136, 38, 138], [198, 70, 156],
      [238, 122, 150], [250, 176, 134], [255, 220, 188], [255, 246, 236],
    ],
  },
  neon: {
    // Ultraviolet arcade: blacklight → violet → hot pink → laser blue → mint
    fond: [2, 0, 6],
    interieur: [10, 0, 18],
    stops: [
      [18, 0, 40], [70, 0, 168], [182, 18, 210], [255, 70, 186],
      [72, 134, 255], [0, 220, 255], [88, 255, 198], [238, 255, 250],
    ],
  },
  infrared: {
    // Mineral survey: basalt → indigo → cobalt → jade → sand → ivory
    fond: [4, 4, 6],
    interieur: [14, 12, 18],
    stops: [
      [18, 16, 28], [42, 54, 112], [40, 110, 168], [34, 164, 146],
      [112, 196, 120], [205, 202, 122], [236, 224, 182], [255, 247, 232],
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
      ["burning_julia", "Burning Julia"],
      ["biomorphe", "Biomorphe de Pickover"],
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
      ["rossler_attractor", "Attracteur de Rössler"],
      ["aizawa_attractor", "Attracteur d'Aizawa"],
      ["sprott_attractor", "Attracteur de Sprott"],
      ["feigenbaum_tree", "Arbre de Feigenbaum"],
      ["duffing_attractor", "Attracteur de Duffing"],
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
      ["courbe_levy_c", "Courbe de Lévy C"],
      ["gosper_curve", "Courbe de Gosper"],
      ["cantor_set", "Ensemble de Cantor"],
      ["triangle_de_cercles_recursifs", "Triangle de cercles récursifs"],
      ["apollonian_gasket", "Joint apollonien"],
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
    id: "lisse",
    label: "Lisse",
    fractales: [
      ["mandelbrot_lisse", "Mandelbrot lisse"],
      ["julia_lisse", "Julia lisse"],
      ["burning_ship_lisse", "Burning Ship lisse"],
      ["tricorn_lisse", "Tricorn lisse"],
    ],
  },
  {
    id: "orbitrap",
    label: "Pièges d'orbite",
    fractales: [
      ["mandelbrot_piege_cercle", "Mandelbrot · piège cercle"],
      ["mandelbrot_piege_croix", "Mandelbrot · piège croix"],
      ["mandelbrot_piege_ligne", "Mandelbrot · piège ligne"],
      ["julia_piege_cercle", "Julia · piège cercle"],
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

import {
  activerMode3D,
  definirVue3DActive,
  estFractale3D,
  initialiserMoteur3D,
  interpolerVue3D,
  obtenirVue3DActive,
  orbiterVue3D,
  redimensionnerMoteur3D,
  render3D,
  rendre3DSurCanvas,
  reinitialiserVue3DActive,
  zoomerVue3D,
  deplacerVue3D,
} from "./renderer3d.js?v=app";

/**
 * Retourne la couleur [r, g, b] pour une valeur d'itération.
 * @param {number} iter  — valeur retournée par mandelbrot() (float)
 * @param {number} max   — maxIter courant
 * @param {string} name  — nom de la palette
 * @returns {[number, number, number]}
 */
function getColor(iter, max, name) {
  if (iter >= max) return getPaletteInterior(name);
  // normaliser dans [0, 1] avec légère correction logarithmique
  const t = Math.sqrt(iter / max);
  return getColorFromRatio(t, name);
}

function getColorFromRatio(t, paletteOrName) {
  const stops = Array.isArray(paletteOrName) ? paletteOrName : getPaletteStops(paletteOrName);
  const mode = !Array.isArray(paletteOrName) && typeof paletteOrName === "object"
    ? (paletteOrName.coloringMode ?? "standard")
    : "standard";
  const phase = !Array.isArray(paletteOrName) && typeof paletteOrName === "object"
    ? (paletteOrName.palettePhase ?? 0)
    : 0;
  const contours = !Array.isArray(paletteOrName) && typeof paletteOrName === "object"
    ? Boolean(paletteOrName.paletteContours)
    : false;
  let normalise = Math.max(0, Math.min(0.999999, t));
  if (mode === "histogramme") {
    normalise = Math.pow(normalise, 0.62);
  } else if (mode === "phase") {
    normalise = (normalise + phase) % 1.0;
  } else if (mode === "potentiel") {
    normalise = 0.5 - 0.5 * Math.cos(normalise * Math.PI);
  }
  const scaled = normalise * (stops.length - 1);
  const lo = Math.floor(scaled) | 0;
  const hi = Math.min(lo + 1, stops.length - 1);
  const frac = scaled - lo;
  const c0 = stops[lo];
  const c1 = stops[hi];
  let color = [
    (c0[0] + (c1[0] - c0[0]) * frac) | 0,
    (c0[1] + (c1[1] - c0[1]) * frac) | 0,
    (c0[2] + (c1[2] - c0[2]) * frac) | 0,
  ];
  if (mode === "contours" || contours) {
    const band = Math.abs(((normalise * 36) % 1) - 0.5);
    if (band > 0.42) {
      color = color.map((value) => clampByte(value * 0.58 + 255 * 0.22));
    }
  }
  return color;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normaliserHexCouleur(hex, fallback = "#000000") {
  if (typeof hex !== "string") return fallback;
  const value = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function hexVersRgb(hex, fallback = [0, 0, 0]) {
  const normalise = normaliserHexCouleur(hex, "");
  if (!normalise) return fallback;
  return [
    parseInt(normalise.slice(1, 3), 16),
    parseInt(normalise.slice(3, 5), 16),
    parseInt(normalise.slice(5, 7), 16),
  ];
}

function rgbVersHex(rgb) {
  return `#${rgb.map((value) => clampByte(value).toString(16).padStart(2, "0")).join("")}`;
}

function melangerCouleurs(a, b, ratio) {
  const t = Math.max(0, Math.min(1, ratio));
  return [
    clampByte(a[0] + (b[0] - a[0]) * t),
    clampByte(a[1] + (b[1] - a[1]) * t),
    clampByte(a[2] + (b[2] - a[2]) * t),
  ];
}

function normaliserStopsPalette(stopsHex, fallbackStops) {
  const source = Array.isArray(stopsHex) && stopsHex.length > 0 ? stopsHex : fallbackStops;
  return source.map((stop, index) => normaliserHexCouleur(stop, fallbackStops[Math.min(index, fallbackStops.length - 1)] ?? "#ffffff"));
}

function paletteVersEtatEditable(palette) {
  return {
    background: rgbVersHex(palette.fond ?? PALETTES.aurora.fond),
    interior: rgbVersHex(palette.interieur ?? palette.stops?.[palette.stops.length - 1] ?? PALETTES.aurora.interieur),
    stops: (palette.stops ?? PALETTES.aurora.stops).map((stop) => rgbVersHex(stop)),
  };
}

function creerPalettePersonnalisee(backgroundHex, interiorHex, stopsHex) {
  const fond = hexVersRgb(backgroundHex, PALETTES.aurora.fond);
  const interieur = hexVersRgb(interiorHex, PALETTES.aurora.interieur);
  const stopsNormalises = normaliserStopsPalette(stopsHex, PALETTES.aurora.stops.map((stop) => rgbVersHex(stop)));
  return {
    fond,
    interieur,
    stops: stopsNormalises.map((stop) => hexVersRgb(stop)),
  };
}

function getPaletteConfig(source) {
  if (source && typeof source === "object") {
    if (Array.isArray(source.stops)) return source;
    if (typeof source.palette === "string") {
      if (source.palette === "personnalisee") {
        return creerPalettePersonnalisee(source.paletteBackground, source.paletteInterior, source.paletteStops);
      }
      return PALETTES[source.palette] ?? PALETTES.feu;
    }
  }
  if (source === "personnalisee") {
    return creerPalettePersonnalisee(params.paletteBackground, params.paletteInterior, params.paletteStops);
  }
  return PALETTES[source] ?? PALETTES.feu;
}

function getPaletteStops(source) {
  return getPaletteConfig(source).stops;
}

function getPaletteBackground(source) {
  return getPaletteConfig(source).fond;
}

function getPaletteInterior(source) {
  return getPaletteConfig(source).interieur;
}

function getPaletteComplete(source) {
  return getPaletteConfig(source);
}

function construireApercuPaletteCss() {
  const palette = getPaletteComplete(params);
  const stops = palette.stops ?? [];
  if (stops.length === 0) return params.paletteBackground;
  return `linear-gradient(90deg, ${stops.map((stop, index) => {
    const pos = stops.length === 1 ? 100 : Math.round((index / (stops.length - 1)) * 100);
    return `${rgbVersHex(stop)} ${pos}%`;
  }).join(", ")})`;
}

function rendreEditeurPalette() {
  const palette = getPaletteComplete(params);
  const stopsHex = (params.paletteStops ?? []).map((stop, index) => normaliserHexCouleur(stop, rgbVersHex(palette.stops[index] ?? [255, 255, 255])));
  customPalettePreview.style.background = construireApercuPaletteCss();
  const fragment = document.createDocumentFragment();
  stopsHex.forEach((stop, index) => {
    const row = document.createElement("div");
    row.className = "palette-stop";
    row.setAttribute("role", "listitem");

    const stopIndex = document.createElement("span");
    stopIndex.className = "palette-stop-index";
    stopIndex.textContent = String(index + 1);
    row.appendChild(stopIndex);

    const input = document.createElement("input");
    input.type = "color";
    input.value = stop;
    input.dataset.stopIndex = String(index);
    input.setAttribute("aria-label", `Couleur du stop ${index + 1}`);
    row.appendChild(input);

    const removeButton = document.createElement("button");
    removeButton.className = "btn palette-stop-remove";
    removeButton.type = "button";
    removeButton.dataset.removeStop = String(index);
    removeButton.setAttribute("aria-label", `Supprimer le stop ${index + 1}`);
    removeButton.textContent = "×";
    row.appendChild(removeButton);

    fragment.appendChild(row);
  });
  customPaletteStops.replaceChildren(fragment);
}

function definirVisibiliteEditeurPalette(forceOuverture) {
  if (typeof forceOuverture === "boolean") {
    customPaletteEditorOpen = forceOuverture;
  }
  const palettePersonnalisee = params.palette === "personnalisee";
  const afficher = palettePersonnalisee && customPaletteEditorOpen;
  customPaletteControls.classList.toggle("hidden", !afficher);
  toggleCustomPaletteButton.classList.toggle("hidden", !palettePersonnalisee);
  toggleCustomPaletteButton.setAttribute("aria-expanded", afficher ? "true" : "false");
  definirIconeBouton(toggleCustomPaletteButton, afficher ? "▴" : "▾");
  toggleCustomPaletteButton.setAttribute("aria-label", afficher ? "Réduire la palette personnalisée" : "Afficher la palette personnalisée");
  toggleCustomPaletteButton.title = afficher ? "Réduire la palette personnalisée" : "Afficher la palette personnalisée";
  if (afficher) rendreEditeurPalette();
}

function synchroniserControlePalette() {
  paletteSelect.value = params.palette;
  if (paletteSelectCompact) paletteSelectCompact.value = params.palette;
  paletteBackgroundInput.value = normaliserHexCouleur(params.paletteBackground, "#020008");
  paletteInteriorInput.value = normaliserHexCouleur(params.paletteInterior, "#fff5b4");
  params.paletteStops = normaliserStopsPalette(params.paletteStops, PALETTES.aurora.stops.map((stop) => rgbVersHex(stop)));
  definirVisibiliteEditeurPalette();
  mettreAJourResumeControles();
}

function definirVisibiliteOptionsSpecifiques({ labels = [] } = {}) {
  const afficher = labels.length > 0;
  if (controlsSpecific) controlsSpecific.classList.toggle("hidden", !afficher);
  if (fractalOptionsStack) fractalOptionsStack.classList.toggle("hidden", !afficher);
  if (fractalOptionsSummary) fractalOptionsSummary.textContent = afficher ? labels.join(" · ") : "Aucune";
  if (fractalOptionsPanel) fractalOptionsPanel.classList.toggle("hidden", !afficher);
  mettreAJourResumeControles();
}

function mettreAJourResumeControles() {
  if (controlsSummaryFractal) controlsSummaryFractal.textContent = params.fractal;
  const morceaux = [`${params.maxIter} itérations`, paletteSelect?.selectedOptions?.[0]?.textContent?.trim() || params.palette];
  if (!controlsSpecific?.classList.contains("hidden") && fractalOptionsSummary) {
    const resumeSpecifique = fractalOptionsSummary.textContent?.trim();
    if (resumeSpecifique && resumeSpecifique !== "Aucune") morceaux.push(resumeSpecifique);
  }
  if (controlsSummaryDetails) controlsSummaryDetails.textContent = morceaux.join(" · ");
}

function appliquerEtatControles() {
  if (controlsFooter) controlsFooter.classList.toggle("collapsed", controlsCollapsed);
  if (btnToggleControls) {
    btnToggleControls.setAttribute("aria-expanded", controlsCollapsed ? "false" : "true");
    btnToggleControls.textContent = controlsCollapsed ? "Afficher" : "Réduire";
    btnToggleControls.setAttribute("aria-label", controlsCollapsed ? "Afficher les contrôles" : "Réduire les contrôles");
    btnToggleControls.title = controlsCollapsed ? "Afficher les contrôles" : "Réduire les contrôles";
  }
  if (btnMinimizeControls) {
    btnMinimizeControls.setAttribute("aria-expanded", controlsCollapsed ? "false" : "true");
    definirIconeBouton(btnMinimizeControls, controlsCollapsed ? "▴" : "▾");
    btnMinimizeControls.setAttribute("aria-label", controlsCollapsed ? "Afficher les contrôles" : "Réduire les contrôles");
    btnMinimizeControls.title = controlsCollapsed ? "Afficher les contrôles" : "Réduire les contrôles";
  }
  if (controlsSummary) controlsSummary.classList.toggle("hidden", false);
  mettreAJourResumeControles();
}

function chargerEtatControles() {
  try {
    controlsCollapsed = localStorage.getItem("fractales_controls_collapsed") === "1";
  } catch {
    controlsCollapsed = false;
  }
  appliquerEtatControles();
}

function definirEtatControles(estReduit) {
  controlsCollapsed = Boolean(estReduit);
  try {
    localStorage.setItem("fractales_controls_collapsed", controlsCollapsed ? "1" : "0");
  } catch {}
  appliquerEtatControles();
  requestAnimationFrame(() => {
    resizeCanvas();
    render();
  });
}

function fractaleActiveEst3D() {
  return estFractale3D(params.fractal);
}

function obtenirCanvasActif() {
  return fractaleActiveEst3D() ? canvas3d : canvas;
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

function creerTamponPonctuel(w, h) {
  return {
    w,
    h,
    densites: new Uint32Array(w * h),
    lumieres: new Uint16Array(w * h),
    maxDensite: 0,
  };
}

function ajouterPointPonctuel(tampon, px, py, poids, rayon, lumiere) {
  const r = Math.max(0, rayon | 0);
  for (let dy = -r; dy <= r; dy++) {
    const yPoint = py + dy;
    if (yPoint < 0 || yPoint >= tampon.h) continue;
    for (let dx = -r; dx <= r; dx++) {
      const xPoint = px + dx;
      if (xPoint < 0 || xPoint >= tampon.w) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r + 0.15) continue;
      const attenuation = r === 0 ? 1.0 : Math.max(0.22, 1.0 - dist / (r + 0.35));
      const p = Math.max(1, Math.round(poids * attenuation));
      const index = yPoint * tampon.w + xPoint;
      tampon.densites[index] += p;
      if (tampon.densites[index] > tampon.maxDensite) {
        tampon.maxDensite = tampon.densites[index];
      }
      if (lumiere > 0) {
        const l = Math.min(65535, Math.round(lumiere * attenuation));
        if (l > tampon.lumieres[index]) tampon.lumieres[index] = l;
      }
    }
  }
}

function coloriserDensite(data, densites, maxDensite, palette, lumieres = null) {
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
  let maxLumiere = 0;
  if (lumieres) {
    for (let i = 0; i < lumieres.length; i++) {
      if (lumieres[i] > maxLumiere) maxLumiere = lumieres[i];
    }
  }
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
    const halo = maxLumiere > 0 ? lumieres[i] / maxLumiere : 0.0;
    const ratioVisible = Math.min(0.995, 0.16 + Math.pow(ratio, 0.55) * 0.64 + halo * 0.20);
    let [r, g, b] = getColorFromRatio(ratioVisible, palette);
    if (halo > 0) {
      const boost = 0.72 + halo * 0.42;
      r = Math.min(255, Math.round(r * boost + 255 * halo * 0.16));
      g = Math.min(255, Math.round(g * boost + 255 * halo * 0.14));
      b = Math.min(255, Math.round(b * boost + 255 * halo * 0.18));
    }
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
  const modeState = {
    coloringMode: params.coloringMode,
    palettePhase: params.palettePhase,
    paletteContours: params.paletteContours,
    deepZoomAutoIterations: params.deepZoomAutoIterations,
    deepZoomQuality: params.deepZoomQuality,
    studio3dMaterial: params.studio3dMaterial,
    studio3dFog: params.studio3dFog,
    weatherOverlays: params.weatherOverlays,
    lsystemProposalActive: params.lsystemProposalActive,
    lsystemAxiom: params.lsystemAxiom,
    lsystemRules: params.lsystemRules,
    lsystemAngle: params.lsystemAngle,
    lsystemGenerations: params.lsystemGenerations,
    formulePropositionActive: params.formulePropositionActive,
    formuleIteration: params.formuleIteration,
    formuleEscapeRadius: params.formuleEscapeRadius,
    formuleMode: params.formuleMode,
  };
  if (fractaleActiveEst3D()) {
    return {
      fractal: params.fractal,
      maxIter: params.maxIter,
      palette: params.palette,
      paletteBackground: params.paletteBackground,
      paletteInterior: params.paletteInterior,
      paletteStops: [...params.paletteStops],
      multibrotPower: params.multibrotPower,
      juliaCre: params.juliaCre,
      juliaCim: params.juliaCim,
      ...modeState,
      vue3d: obtenirVue3DActive(),
    };
  }
  return {
    centerX: view.centerX,
    centerY: view.centerY,
    pixelSize: view.pixelSize,
    rotation: view.rotation,
    fractal: params.fractal,
    maxIter: params.maxIter,
    palette: params.palette,
    paletteBackground: params.paletteBackground,
    paletteInterior: params.paletteInterior,
    paletteStops: [...params.paletteStops],
    multibrotPower: params.multibrotPower,
    juliaCre: params.juliaCre,
    juliaCim: params.juliaCim,
    ...modeState,
  };
}

function clonerParamsExport(source = params) {
  return {
    fractal: source.fractal,
    maxIter: source.maxIter,
    palette: source.palette,
    paletteBackground: source.paletteBackground,
    paletteInterior: source.paletteInterior,
    paletteStops: [...(source.paletteStops ?? params.paletteStops)],
    multibrotPower: source.multibrotPower,
    juliaCre: source.juliaCre,
    juliaCim: source.juliaCim,
    coloringMode: source.coloringMode ?? params.coloringMode,
    palettePhase: source.palettePhase ?? params.palettePhase,
    paletteContours: source.paletteContours ?? params.paletteContours,
    deepZoomAutoIterations: source.deepZoomAutoIterations ?? params.deepZoomAutoIterations,
    deepZoomQuality: source.deepZoomQuality ?? params.deepZoomQuality,
    studio3dMaterial: source.studio3dMaterial ?? params.studio3dMaterial,
    studio3dFog: source.studio3dFog ?? params.studio3dFog,
    weatherOverlays: source.weatherOverlays ?? params.weatherOverlays,
    lsystemProposalActive: source.lsystemProposalActive ?? params.lsystemProposalActive,
    lsystemAxiom: source.lsystemAxiom ?? params.lsystemAxiom,
    lsystemRules: source.lsystemRules ?? params.lsystemRules,
    lsystemAngle: source.lsystemAngle ?? params.lsystemAngle,
    lsystemGenerations: source.lsystemGenerations ?? params.lsystemGenerations,
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
  if (wasmExportFunctions.barnsley_etape_x && wasmExportFunctions.barnsley_etape_y) {
    return [
      wasmExportFunctions.barnsley_etape_x(x, y, r),
      wasmExportFunctions.barnsley_etape_y(x, y, r),
    ];
  }
  if (r < 0.01) return [0.0, 0.16 * y];
  if (r < 0.86) return [0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6];
  if (r < 0.93) return [0.2 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6];
  return [-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44];
}

function sierpinskiStep(x, y, r) {
  if (wasmExportFunctions.sierpinski_etape_x && wasmExportFunctions.sierpinski_etape_y) {
    return [
      wasmExportFunctions.sierpinski_etape_x(x, y, r),
      wasmExportFunctions.sierpinski_etape_y(x, y, r),
    ];
  }
  if (r < 1 / 3) return [0.5 * x, 0.5 * y];
  if (r < 2 / 3) return [0.5 * x + 0.5, 0.5 * y];
  return [0.5 * x + 0.25, 0.5 * y + 0.43301270189];
}

function etapeTapisSierpinski(x, y, r) {
  if (wasmExportFunctions.tapis_sierpinski_etape_x && wasmExportFunctions.tapis_sierpinski_etape_y) {
    return [
      wasmExportFunctions.tapis_sierpinski_etape_x(x, y, r),
      wasmExportFunctions.tapis_sierpinski_etape_y(x, y, r),
    ];
  }
  const cellules = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
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
  if (
    wasmExportFunctions.menger_etape_x &&
    wasmExportFunctions.menger_etape_y &&
    wasmExportFunctions.menger_etape_z
  ) {
    return [
      wasmExportFunctions.menger_etape_x(x, y, z, r),
      wasmExportFunctions.menger_etape_y(x, y, z, r),
      wasmExportFunctions.menger_etape_z(x, y, z, r),
    ];
  }
  const index = Math.min(MENGER_OFFSETS.length - 1, (r * MENGER_OFFSETS.length) | 0);
  const [dx, dy, dz] = MENGER_OFFSETS[index];
  return [x / 3 + dx / 3, y / 3 + dy / 3, z / 3 + dz / 3];
}

function projeterMengerSponge(x, y, z) {
  const p = projeterPoint3D("menger_sponge", x, y, z);
  return [p.x, p.y];
}

function etapeVicsekFractal(x, y, r) {
  if (wasmExportFunctions.vicsek_etape_x && wasmExportFunctions.vicsek_etape_y) {
    return [
      wasmExportFunctions.vicsek_etape_x(x, y, r),
      wasmExportFunctions.vicsek_etape_y(x, y, r),
    ];
  }
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
  if (
    wasmExportFunctions.mandelbulb_etape_x &&
    wasmExportFunctions.mandelbulb_etape_y &&
    wasmExportFunctions.mandelbulb_etape_z
  ) {
    return [
      wasmExportFunctions.mandelbulb_etape_x(x, y, z, cx),
      wasmExportFunctions.mandelbulb_etape_y(x, y, z, cy),
      wasmExportFunctions.mandelbulb_etape_z(x, y, z),
    ];
  }
  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;
  return [
    x * (x2 - 3 * y2 - 1.5 * z2) + cx,
    y * (3 * x2 - y2 - 1.5 * z2) + cy,
    z * (2.5 * x2 - 0.5 * y2 - z2) + 0.22,
  ];
}

const REGLAGES_3D = {
  menger_sponge: { ax: -0.52, ay: 0.78, az: 0.08, perspective: 0.26, camera: 3.6, scale: 1.02, radius: 1.45 },
  mandelbulb: { ax: -0.58, ay: 0.92, az: 0.12, perspective: 0.30, camera: 4.0, scale: 1.04, radius: 1.7 },
  tetraedre_sierpinski: { ax: -0.72, ay: 0.88, az: 0.24, perspective: 0.36, camera: 2.6, scale: 1.10, radius: 0.95 },
  julia_quaternion: { ax: -0.62, ay: 0.95, az: 0.22, perspective: 0.34, camera: 3.4, scale: 0.95, radius: 1.75 },
  mandelbox: { ax: -0.48, ay: 0.84, az: 0.10, perspective: 0.24, camera: 4.4, scale: 0.90, radius: 3.2 },
};

function projeterPoint3D(fractale, x, y, z) {
  const vue = REGLAGES_3D[fractale];
  if (!vue) return { x, y, profondeur: z, proximite: 0.0, rayon: 0 };
  const sx = Math.sin(vue.ax), cx = Math.cos(vue.ax);
  const sy = Math.sin(vue.ay), cy = Math.cos(vue.ay);
  const sz = Math.sin(vue.az), cz = Math.cos(vue.az);
  let rx = x;
  let ry = y * cx - z * sx;
  let rz = y * sx + z * cx;
  const r2x = rx * cy + rz * sy;
  const r2z = -rx * sy + rz * cy;
  rx = r2x * cz - ry * sz;
  ry = r2x * sz + ry * cz;
  rz = r2z;
  const perspective = vue.camera / Math.max(0.6, vue.camera - rz * vue.perspective);
  const px = rx * perspective * vue.scale;
  const py = ry * perspective * vue.scale;
  const proximite = Math.max(0.0, Math.min(1.0, 0.5 - rz / (vue.radius * 2.0)));
  const rayon = proximite > 0.72 ? 2 : (proximite > 0.42 ? 1 : 0);
  return { x: px, y: py, profondeur: rz, proximite, rayon };
}

function projeterMandelbulb(x, y, z) {
  const p = projeterPoint3D("mandelbulb", x, y, z);
  return [p.x, p.y];
}

// Tétraèdre de Sierpiński — SFI à 4 contractions (3D)
function etapeTetraedre(x, y, z, r) {
  if (
    wasmExportFunctions.tetraedre_etape_x &&
    wasmExportFunctions.tetraedre_etape_y &&
    wasmExportFunctions.tetraedre_etape_z
  ) {
    return [
      wasmExportFunctions.tetraedre_etape_x(x, y, z, r),
      wasmExportFunctions.tetraedre_etape_y(x, y, z, r),
      wasmExportFunctions.tetraedre_etape_z(x, y, z, r),
    ];
  }
  const k = Math.min(3, (r * 4) | 0);
  if (k === 0) return [x * 0.5, y * 0.5, z * 0.5];
  if (k === 1) return [x * 0.5 + 0.5, y * 0.5, z * 0.5];
  if (k === 2) return [x * 0.5 + 0.25, y * 0.5 + 0.433013, z * 0.5];
  return [x * 0.5 + 0.25, y * 0.5 + 0.144338, z * 0.5 + 0.408248];
}

// Projection centrée sur le barycentre du tétraèdre, angle élevé pour
// exposer les 4 faces et éviter la confusion avec le triangle de Sierpiński 2D.
function projeterTetraedre(x, y, z) {
  const p = projeterPoint3D("tetraedre_sierpinski", x - 0.5, y - 0.289, z - 0.204);
  return [p.x, p.y];
}

// Boîte de Mandel — orbite 3D avec c lentement variable (même approche que Mandelbulb).
// Avec scale=2 et |c| ≈ 0.2 l'orbite reste bornée et révèle la structure 3D du fractal.
function etapeMandelbox(x, y, z, cx, cy) {
  if (
    wasmExportFunctions.mandelbox_etape_x &&
    wasmExportFunctions.mandelbox_etape_y &&
    wasmExportFunctions.mandelbox_etape_z
  ) {
    return [
      wasmExportFunctions.mandelbox_etape_x(x, y, z, cx),
      wasmExportFunctions.mandelbox_etape_y(x, y, z, cy),
      wasmExportFunctions.mandelbox_etape_z(x, y, z),
    ];
  }
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
  const p = projeterPoint3D("mandelbox", x, y, z);
  return [p.x, p.y];
}

function etapeJuliaQuaternion(x, y, z) {
  if (
    wasmExportFunctions.julia_quaternion_etape_x &&
    wasmExportFunctions.julia_quaternion_etape_y &&
    wasmExportFunctions.julia_quaternion_etape_z
  ) {
    return [
      wasmExportFunctions.julia_quaternion_etape_x(x, y, z),
      wasmExportFunctions.julia_quaternion_etape_y(x, y, z),
      wasmExportFunctions.julia_quaternion_etape_z(x, y, z),
    ];
  }
  const cX = -0.06;
  const cY = 0.06;
  const cZ = 0.2;
  return [
    x * x - y * y - z * z + cX,
    2.0 * x * y + cY,
    2.0 * x * z + cZ,
  ];
}

function projeterJuliaQuaternion(x, y, z) {
  const p = projeterPoint3D("julia_quaternion", x, y, z);
  return [p.x, p.y];
}

function projeterFractalePonctuelle(nom, x, y, z, iter, largeur) {
  if (nom === "menger_sponge") return projeterPoint3D("menger_sponge", x, y, z);
  if (nom === "mandelbulb") return projeterPoint3D("mandelbulb", x, y, z);
  if (nom === "tetraedre_sierpinski") return projeterPoint3D("tetraedre_sierpinski", x - 0.5, y - 0.289, z - 0.204);
  if (nom === "julia_quaternion") return projeterPoint3D("julia_quaternion", x, y, z);
  if (nom === "mandelbox") return projeterPoint3D("mandelbox", x, y, z);
  if (nom === "lorenz_attractor") {
    const [px, py] = projeterLorenzAttractor(x, y, z);
    return { x: px, y: py, proximite: 0.0, rayon: 0 };
  }
  if (nom === "rossler_attractor") {
    const [px, py, proximite] = projeterRosslerAttractor(x, y, z);
    return { x: px, y: py, proximite, rayon: 0 };
  }
  if (nom === "aizawa_attractor") {
    const [px, py, proximite] = projeterAizawaAttractor(x, y, z);
    return { x: px, y: py, proximite, rayon: 0 };
  }
  if (nom === "sprott_attractor") {
    const [px, py, proximite] = projeterSprottAttractor(x, y, z);
    return { x: px, y: py, proximite, rayon: 0 };
  }
  if (nom === "feigenbaum_tree") {
    const px = ((2.5 + ((iter % Math.max(1200, largeur)) / Math.max(1200, largeur)) * 1.5) - 3.25) * 1.333;
    return { x: px, y, proximite: 0.0, rayon: 0 };
  }
  return { x, y, proximite: 0.0, rayon: 0 };
}

function etapeAttracteurClifford(x, y) {
  if (
    wasmExportFunctions.attracteur_de_clifford_etape_x &&
    wasmExportFunctions.attracteur_de_clifford_etape_y
  ) {
    return [
      wasmExportFunctions.attracteur_de_clifford_etape_x(x, y),
      wasmExportFunctions.attracteur_de_clifford_etape_y(x, y),
    ];
  }
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
  if (
    wasmExportFunctions.attracteur_de_peter_de_jong_etape_x &&
    wasmExportFunctions.attracteur_de_peter_de_jong_etape_y
  ) {
    return [
      wasmExportFunctions.attracteur_de_peter_de_jong_etape_x(x, y),
      wasmExportFunctions.attracteur_de_peter_de_jong_etape_y(x, y),
    ];
  }
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
  if (
    wasmExportFunctions.attracteur_ikeda_etape_x &&
    wasmExportFunctions.attracteur_ikeda_etape_y
  ) {
    return [
      wasmExportFunctions.attracteur_ikeda_etape_x(x, y),
      wasmExportFunctions.attracteur_ikeda_etape_y(x, y),
    ];
  }
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
  if (
    wasmExportFunctions.attracteur_de_henon_etape_x &&
    wasmExportFunctions.attracteur_de_henon_etape_y
  ) {
    return [
      wasmExportFunctions.attracteur_de_henon_etape_x(x, y),
      wasmExportFunctions.attracteur_de_henon_etape_y(x, y),
    ];
  }
  const a = 1.4;
  const b = 0.3;
  return [
    1.0 - a * x * x + y,
    b * x,
  ];
}

function etapeLorenzAttractor(x, y, z) {
  if (
    wasmExportFunctions.lorenz_attractor_etape_x &&
    wasmExportFunctions.lorenz_attractor_etape_y &&
    wasmExportFunctions.lorenz_attractor_etape_z
  ) {
    return [
      wasmExportFunctions.lorenz_attractor_etape_x(x, y, z),
      wasmExportFunctions.lorenz_attractor_etape_y(x, y, z),
      wasmExportFunctions.lorenz_attractor_etape_z(x, y, z),
    ];
  }
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
    wasmExportFunctions.projeter_lorenz_x ? wasmExportFunctions.projeter_lorenz_x(x, y, z) : (x - y) * 0.12,
    wasmExportFunctions.projeter_lorenz_y ? wasmExportFunctions.projeter_lorenz_y(x, y, z) : (z - 26.0) * 0.07 - (x + y) * 0.02,
  ];
}

function etapeRosslerAttractor(x, y, z) {
  if (
    wasmExportFunctions.rossler_attractor_etape_x &&
    wasmExportFunctions.rossler_attractor_etape_y &&
    wasmExportFunctions.rossler_attractor_etape_z
  ) {
    return [
      wasmExportFunctions.rossler_attractor_etape_x(x, y, z),
      wasmExportFunctions.rossler_attractor_etape_y(x, y, z),
      wasmExportFunctions.rossler_attractor_etape_z(x, y, z),
    ];
  }
  const a = 0.2;
  const b = 0.2;
  const c = 5.7;
  const dt = 0.02;
  return [
    x + (-y - z) * dt,
    y + (x + a * y) * dt,
    z + (b + z * (x - c)) * dt,
  ];
}

function projeterRosslerAttractor(x, y, z) {
  const profondeur = Math.max(0, Math.min(1, 0.5 - z / 18.0));
  return [
    wasmExportFunctions.projeter_rossler_x ? wasmExportFunctions.projeter_rossler_x(x, y, z) : x * 0.16 + z * 0.035,
    wasmExportFunctions.projeter_rossler_y ? wasmExportFunctions.projeter_rossler_y(x, y, z) : y * 0.16 - z * 0.04,
    profondeur,
  ];
}

function etapeAizawaAttractor(x, y, z) {
  if (
    wasmExportFunctions.aizawa_attractor_etape_x &&
    wasmExportFunctions.aizawa_attractor_etape_y &&
    wasmExportFunctions.aizawa_attractor_etape_z
  ) {
    return [
      wasmExportFunctions.aizawa_attractor_etape_x(x, y, z),
      wasmExportFunctions.aizawa_attractor_etape_y(x, y, z),
      wasmExportFunctions.aizawa_attractor_etape_z(x, y, z),
    ];
  }
  const a = 0.95;
  const b = 0.7;
  const c = 0.6;
  const d = 3.5;
  const e = 0.25;
  const f = 0.1;
  const dt = 0.008;
  const r2 = x * x + y * y;
  return [
    x + (((z - b) * x) - d * y) * dt,
    y + (d * x + (z - b) * y) * dt,
    z + (c + a * z - (z * z * z) / 3.0 - r2 * (1.0 + e * z) + f * z * x * x * x) * dt,
  ];
}

function projeterAizawaAttractor(x, y, z) {
  const profondeur = Math.max(0, Math.min(1, 0.5 - z / 10.0));
  return [
    wasmExportFunctions.projeter_aizawa_x ? wasmExportFunctions.projeter_aizawa_x(x, y, z) : x * 0.18 + z * 0.03,
    wasmExportFunctions.projeter_aizawa_y ? wasmExportFunctions.projeter_aizawa_y(x, y, z) : y * 0.18 - z * 0.055,
    profondeur,
  ];
}

function etapeSprottAttractor(x, y, z) {
  if (
    wasmExportFunctions.sprott_attractor_etape_x &&
    wasmExportFunctions.sprott_attractor_etape_y &&
    wasmExportFunctions.sprott_attractor_etape_z
  ) {
    return [
      wasmExportFunctions.sprott_attractor_etape_x(x, y, z),
      wasmExportFunctions.sprott_attractor_etape_y(x, y, z),
      wasmExportFunctions.sprott_attractor_etape_z(x, y, z),
    ];
  }
  const dt = 0.04;
  return [
    x + y * z * dt,
    y + (x - y) * dt,
    z + (1.0 - x * y) * dt,
  ];
}

function projeterSprottAttractor(x, y, z) {
  const profondeur = Math.max(0, Math.min(1, 0.5 - z / 12.0));
  return [
    wasmExportFunctions.projeter_sprott_x ? wasmExportFunctions.projeter_sprott_x(x, y, z) : x * 0.19 + z * 0.045,
    wasmExportFunctions.projeter_sprott_y ? wasmExportFunctions.projeter_sprott_y(x, y, z) : y * 0.18 - z * 0.03,
    profondeur,
  ];
}

function etapeDuffingAttractor(x, y) {
  if (
    wasmExportFunctions.duffing_attractor_etape_x &&
    wasmExportFunctions.duffing_attractor_etape_y
  ) {
    return [
      wasmExportFunctions.duffing_attractor_etape_x(x, y),
      wasmExportFunctions.duffing_attractor_etape_y(x, y),
    ];
  }
  const a = 2.75;
  const b = 0.2;
  return [y, -b * x + a * y - y * y * y];
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
  const fragment = document.createDocumentFragment();
  family.fractales.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    fragment.appendChild(option);
  });
  fractalSelect.replaceChildren(fragment);
  if (fractalSelectCompact) {
    const compactFragment = document.createDocumentFragment();
    family.fractales.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      compactFragment.appendChild(option);
    });
    fractalSelectCompact.replaceChildren(compactFragment);
  }
  fractalSelect.value = activeFractal;
  if (fractalSelectCompact) fractalSelectCompact.value = activeFractal;
  return activeFractal;
}

function syncSelectors(selectedFractal = params.fractal) {
  const familyId = findFractalFamily(selectedFractal);
  familySelect.value = familyId;
  if (familySelectCompact) familySelectCompact.value = familyId;
  const activeFractal = populateFractalSelect(familyId, selectedFractal);
  params.fractal = activeFractal;
  if (multibrotPower) multibrotPower.value = String(params.multibrotPower);
  if (iterSliderCompact) iterSliderCompact.value = String(params.maxIter);
  if (iterValueCompact) iterValueCompact.textContent = String(params.maxIter);
  synchroniserControlePalette();
}

function synchroniserControlesJulia() {
  if (juliaCReSlider) juliaCReSlider.value = String(params.juliaCre);
  if (juliaCImSlider) juliaCImSlider.value = String(params.juliaCim);
  if (juliaCReValue) juliaCReValue.textContent = params.juliaCre.toFixed(3);
  if (juliaCImValue) juliaCImValue.textContent = params.juliaCim.toFixed(3);
}

function appliquerPresetJulia(fractalName) {
  const preset = JULIA_C_PRESETS[fractalName];
  if (!preset) return;
  params.juliaCre = preset.re;
  params.juliaCim = preset.im;
  synchroniserControlesJulia();
}

function setActiveFractal(fractalName) {
  params.fractal = fractalName;
  params.lsystemProposalActive = false;
  syncSelectors(fractalName);
  appliquerPresetJulia(params.fractal);
  mettreAJourAideInteraction();
  resetView();
  mettreAJourOptionsSpecifiques();
  explorationModes?.syncFromParams();
  loadSources(params.fractal);
  mettreAJourHash(view, params);
}

function appliquerPropositionLSysteme(config) {
  params.lsystemProposalActive = true;
  params.lsystemAxiom = String(config.axiom || "F").slice(0, 96);
  params.lsystemRules = String(config.rules || "F=F+F--F+F").slice(0, 600);
  params.lsystemAngle = Math.max(1, Math.min(179, Number(config.angle) || 60));
  params.lsystemGenerations = Math.max(0, Math.min(8, Number(config.generations) | 0));
  if (!LINE_FRACTALS.has(params.fractal)) {
    params.fractal = "koch";
    syncSelectors(params.fractal);
    loadSources(params.fractal);
  }
  view.centerX = 0.0;
  view.centerY = 0.0;
  view.pixelSize = 2.4 / Math.max(canvas.width, 1);
  view.rotation = 0.0;
  mettreAJourOptionsSpecifiques();
  explorationModes?.syncFromParams();
  render();
  mettreAJourHash(view, params);
  updateStatusBar("Proposition L-système appliquée", true);
}

function effacerPropositionLSysteme() {
  params.lsystemProposalActive = false;
  mettreAJourOptionsSpecifiques();
  explorationModes?.syncFromParams();
  render();
  mettreAJourHash(view, params);
  updateStatusBar("Retour au L-système canonique", true);
}

// ============================================================
// FORMULE D'ITÉRATION PERSONNALISÉE
// ============================================================

// Compile "z^2+c" → fonction JS rapide via new Function().
// Variables : z (itéré), c (paramètre), i (unité imaginaire).
// Fonctions : sin cos abs conj exp log pow.
function compilerFormule(s) {
  const raw = s.match(/\d+\.?\d*|[a-z]+|[+\-*/^()]/gi) ?? [];
  const tok = [];
  raw.forEach((v, j) => {
    tok.push(v);
    const n = raw[j + 1];
    if (n && (/\d$/.test(v) || v === ")") && (n === "(" || /^[a-z]/.test(n))) tok.push("*");
  });
  let i = 0;
  const p = () => tok[i], nx = () => tok[i++];
  function E() { let a=T(); while(p()==="+"||p()==="-"){const o=nx();a=o==="+"?`A(${a},${T()})`:`S(${a},${T()})`;} return a; }
  function T() { let a=W(); while(p()==="*"||p()==="/"){const o=nx();a=o==="*"?`M(${a},${W()})`:`D(${a},${W()})`;} return a; }
  function W() { const b=U(); return p()==="^"?(nx(),`P(${b},${W()})`):b; }
  function U() { return p()==="-"?(nx(),`N(${B()})`):B(); }
  function B() {
    const v = p(); if (!v) return "[0,0]";
    if (v === "(") { nx(); const r=E(); p()===")"&&nx(); return r; }
    if (/^[a-z]/i.test(v)) {
      nx();
      if (p() === "(") { nx(); const a=E(); p()===")"&&nx(); return `${v}(${a})`; }
      if (v==="z") return "[zr,zi]"; if (v==="c") return "[cr,ci]";
      if (v==="i") return "[0,1]"; if (v==="e") return `[${Math.E},0]`; if (v==="pi") return `[${Math.PI},0]`;
      return "[0,0]";
    }
    if (/\d/.test(v)) { nx(); return `[${v},0]`; }
    nx(); return "[0,0]";
  }
  let expr; try { expr = E(); } catch (err) { return { fn: null, error: err.message }; }
  const h = "function exp(a){const e=Math.exp(a[0]);return[e*Math.cos(a[1]),e*Math.sin(a[1])];}"
    + "function log(a){return[Math.log(Math.hypot(a[0],a[1])||1e-30),Math.atan2(a[1],a[0])];}"
    + "function A(a,b){return[a[0]+b[0],a[1]+b[1]];} function S(a,b){return[a[0]-b[0],a[1]-b[1]];}"
    + "function M(a,b){return[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];}"
    + "function D(a,b){const d=b[0]*b[0]+b[1]*b[1];return d<1e-30?[0,0]:[(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];}"
    + "function N(a){return[-a[0],-a[1]];}"
    + "function P(a,b){if(!b[1]&&Number.isInteger(b[0])&&b[0]>=0){let r=1,m=0,x=a[0],y=a[1],n=b[0];while(n>0){if(n&1){const t=r*x-m*y;m=r*y+m*x;r=t;}const t=x*x-y*y;y=2*x*y;x=t;n>>=1;}return[r,m];}return exp(M(b,log(a)));}"
    + "function sin(a){return[Math.sin(a[0])*Math.cosh(a[1]),Math.cos(a[0])*Math.sinh(a[1])];}"
    + "function cos(a){return[Math.cos(a[0])*Math.cosh(a[1]),-Math.sin(a[0])*Math.sinh(a[1])];}"
    + "function abs(a){return[Math.hypot(a[0],a[1]),0];} function conj(a){return[a[0],-a[1]];}";
  try { const fn=new Function("zr","zi","cr","ci",h+"return "+expr); fn(0,0,0,0); return{fn}; }
  catch (err) { return { fn: null, error: err.message }; }
}

function appliquerFormuleProposition(config) {
  const formuleTxt = String(config.formule || "z*z+c").slice(0, 200);
  const compiled = compilerFormule(formuleTxt);
  if (!compiled.fn) {
    updateStatusBar(`Formule invalide : ${compiled.error}`, true);
    return;
  }
  formuleFnCompilee = compiled.fn;
  params.formulePropositionActive = true;
  params.formuleIteration = formuleTxt;
  params.formuleEscapeRadius = Math.max(1, Math.min(100, Number(config.rayon) || 2));
  params.formuleMode = config.mode === "julia" ? "julia" : "mandelbrot";
  if (POINT_FRACTALS.has(params.fractal) || LINE_FRACTALS.has(params.fractal)) {
    params.fractal = "mandelbrot";
    syncSelectors(params.fractal);
    loadSources(params.fractal);
  }
  view.centerX = VIEW_PRESETS[params.fractal]?.centerX ?? -0.5;
  view.centerY = VIEW_PRESETS[params.fractal]?.centerY ?? 0.0;
  view.pixelSize = (VIEW_PRESETS[params.fractal]?.span ?? 3.5) / Math.max(canvas.width, 1);
  view.rotation = 0.0;
  mettreAJourOptionsSpecifiques();
  explorationModes?.syncFromParams();
  render();
  mettreAJourHash(view, params);
  updateStatusBar(`Formule appliquée : ${formuleTxt}`, true);
}

function effacerFormuleProposition() {
  params.formulePropositionActive = false;
  formuleFnCompilee = null;
  mettreAJourOptionsSpecifiques();
  explorationModes?.syncFromParams();
  render();
  mettreAJourHash(view, params);
  updateStatusBar("Retour à la fractale canonique", true);
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

function genererCourbeLevyC(iterations) {
  let s = "F";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) next += ch === "F" ? "+F--F+" : ch;
    s = next;
  }
  return s;
}

function genererGosper(iterations) {
  let s = "A";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) {
      if (ch === "A") next += "A-B--B+A++AA+B-";
      else if (ch === "B") next += "+A-BB--B-A++A+B";
      else next += ch;
    }
    s = next;
  }
  return s.replace(/[AB]/g, "F");
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

function dessinerTriangleCerclesRecursifs(ctxCible, x, y, rayon, niveau) {
  if (niveau <= 0 || rayon < 3) return;
  dessinerCercle(ctxCible, x, y, rayon);
  const r = rayon / 2;
  dessinerTriangleCerclesRecursifs(ctxCible, x - r, y, r, niveau - 1);
  dessinerTriangleCerclesRecursifs(ctxCible, x + r, y, r, niveau - 1);
  dessinerTriangleCerclesRecursifs(ctxCible, x, y - r * 0.866, r, niveau - 1);
}

function creerConfigurationApollonienne() {
  const rayonExterieur = 1.0;
  const rayonInterieur = rayonExterieur / (1.0 + 2.0 / Math.sqrt(3));
  const distanceCentre = rayonExterieur - rayonInterieur;
  const angles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
  const internes = angles.map((angle) => ({
    x: Math.cos(angle) * distanceCentre,
    y: Math.sin(angle) * distanceCentre,
    k: 1 / rayonInterieur,
  }));
  return [{ x: 0, y: 0, k: -1 / rayonExterieur }, ...internes];
}

function refleterCercleApollonien(configuration, index) {
  const autres = [];
  for (let i = 0; i < configuration.length; i++) {
    if (i !== index) autres.push(configuration[i]);
  }
  const cercle = configuration[index];
  const kn = 2 * (autres[0].k + autres[1].k + autres[2].k) - cercle.k;
  const wx = 2 * (autres[0].k * autres[0].x + autres[1].k * autres[1].x + autres[2].k * autres[2].x) - cercle.k * cercle.x;
  const wy = 2 * (autres[0].k * autres[0].y + autres[1].k * autres[1].y + autres[2].k * autres[2].y) - cercle.k * cercle.y;
  return { x: wx / kn, y: wy / kn, k: kn };
}

function cleCercleApollonien(cercle) {
  const rayon = 1 / Math.abs(cercle.k);
  return [
    Math.round(cercle.x * 1e6),
    Math.round(cercle.y * 1e6),
    Math.round(rayon * 1e6),
  ].join(":");
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

function dessinerTriangleCerclesRecursifsMonde(traceur, x, y, rayon, niveau) {
  if (niveau <= 0 || rayon < 0.01) return;
  dessinerCercleMonde(traceur, x, y, rayon);
  const r = rayon / 2;
  dessinerTriangleCerclesRecursifsMonde(traceur, x - r, y, r, niveau - 1);
  dessinerTriangleCerclesRecursifsMonde(traceur, x + r, y, r, niveau - 1);
  dessinerTriangleCerclesRecursifsMonde(traceur, x, y - r * 0.866, r, niveau - 1);
}

function dessinerJointApolloniusMonde(traceur, niveauMax) {
  const configurationInitiale = creerConfigurationApollonienne();
  const dejaDessines = new Set();

  function tracerCercle(cercle) {
    const rayon = 1 / Math.abs(cercle.k);
    if (!isFinite(rayon) || rayon < 0.008) return false;
    const cle = cleCercleApollonien(cercle);
    if (dejaDessines.has(cle)) return false;
    dejaDessines.add(cle);
    dessinerCercleMonde(traceur, cercle.x, cercle.y, rayon, Math.max(28, Math.min(88, Math.floor(30 + rayon * 32))));
    return true;
  }

  function explorer(configuration, niveau, precedent) {
    if (niveau <= 0) return;
    for (let i = 0; i < 4; i++) {
      if (i === precedent) continue;
      const cercle = refleterCercleApollonien(configuration, i);
      if (!isFinite(cercle.x) || !isFinite(cercle.y) || !isFinite(cercle.k) || Math.abs(cercle.k) < 1e-9) continue;
      tracerCercle(cercle);
      const suivante = configuration.slice();
      suivante[i] = cercle;
      explorer(suivante, niveau - 1, i);
    }
  }

  for (const cercle of configurationInitiale) {
    tracerCercle(cercle);
  }
  explorer(configurationInitiale, niveauMax, -1);
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

function parserReglesLSysteme(rulesText) {
  const rules = new Map();
  String(rulesText || "").split(/\n|;/).forEach((line) => {
    const [key, value] = line.split("=");
    const symbole = key?.trim()?.[0];
    if (symbole && value !== undefined) rules.set(symbole, value.trim());
  });
  return rules;
}

function genererPropositionLSysteme(config) {
  const rules = parserReglesLSysteme(config.rules);
  let sequence = String(config.axiom || "F").slice(0, 96);
  const generations = Math.max(0, Math.min(8, Number(config.generations) | 0));
  for (let i = 0; i < generations; i++) {
    let next = "";
    for (const ch of sequence) next += rules.get(ch) ?? ch;
    sequence = next.slice(0, 28000);
  }
  return sequence;
}

function pointsPropositionLSysteme(config) {
  const sequence = genererPropositionLSysteme(config);
  const angleStep = (Number(config.angle) || 60) * Math.PI / 180;
  let x = 0.0;
  let y = 0.0;
  let angle = 0.0;
  const stack = [];
  const points = [{ x, y, move: true }];
  for (const ch of sequence) {
    if (ch === "F" || ch === "G") {
      x += Math.cos(angle);
      y += Math.sin(angle);
      points.push({ x, y });
    } else if (ch === "f") {
      x += Math.cos(angle);
      y += Math.sin(angle);
      points.push({ x, y, move: true });
    } else if (ch === "+") {
      angle += angleStep;
    } else if (ch === "-") {
      angle -= angleStep;
    } else if (ch === "[") {
      stack.push([x, y, angle]);
    } else if (ch === "]" && stack.length > 0) {
      [x, y, angle] = stack.pop();
      points.push({ x, y, move: true });
    }
  }
  return points;
}

function dessinerPropositionLSystemeMonde(traceur, renduParams) {
  const points = pointsPropositionLSysteme({
    axiom: renduParams.lsystemAxiom,
    rules: renduParams.lsystemRules,
    angle: renduParams.lsystemAngle,
    generations: renduParams.lsystemGenerations,
  });
  if (points.length < 2) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const scale = 1.82 / span;
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  points.forEach((point, index) => {
    const x = (point.x - centerX) * scale;
    const y = -(point.y - centerY) * scale;
    if (index === 0 || point.move) traceur.moveTo(x, y);
    else traceur.lineTo(x, y);
  });
}

function renderPointFractal(w, h, data, cx0, cy0, ps, token) {
  const isBarnsley = params.fractal === "barnsley";
  const estSierpinski = params.fractal === "sierpinski";
  const estTapis = params.fractal === "tapis_sierpinski";
  const estMenger = params.fractal === "menger_sponge";
  const estMandelbulb = params.fractal === "mandelbulb";
  const estTetraedre = params.fractal === "tetraedre_sierpinski";
  const estJuliaQuaternion = params.fractal === "julia_quaternion";
  const estMandelbox = params.fractal === "mandelbox";
  const estVicsek = params.fractal === "vicsek_fractal";
  const estLichtenberg = params.fractal === "lichtenberg_figures";
  const estClifford = params.fractal === "attracteur_de_clifford";
  const estPeterDeJong = params.fractal === "attracteur_de_peter_de_jong";
  const estIkeda = params.fractal === "attracteur_ikeda";
  const estHenon = params.fractal === "attracteur_de_henon";
  const estLorenz = params.fractal === "lorenz_attractor";
  const estRossler = params.fractal === "rossler_attractor";
  const estAizawa = params.fractal === "aizawa_attractor";
  const estSprott = params.fractal === "sprott_attractor";
  const estFeigenbaum = params.fractal === "feigenbaum_tree";
  const estDuffing = params.fractal === "duffing_attractor";
  const estBuddhabrot = params.fractal === "buddhabrot";
  const rng = makeRng(0x9e3779b9 ^ (params.maxIter << 7) ^ params.fractal.length);
  const pointsTarget = estBuddhabrot
    ? Math.max(8000, params.maxIter * 70)
    : (estJuliaQuaternion ? Math.max(150000, params.maxIter * 2400) : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estRossler || estAizawa || estSprott || estFeigenbaum || estDuffing) ? Math.max(140000, params.maxIter * 1800) : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? Math.max(80000, params.maxIter * 1200) : Math.max(30000, params.maxIter * 900))));
  const burnIn = isBarnsley ? 80 : (estBuddhabrot ? 0 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estRossler || estAizawa || estSprott || estDuffing) ? 140 : ((estMenger || estTetraedre || estMandelbox) ? 60 : 40)));
  const pointsPerFrame = estBuddhabrot ? 400 : (estJuliaQuaternion ? 18000 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estRossler || estAizawa || estSprott || estFeigenbaum || estDuffing) ? 30000 : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? 26000 : 25000)));
  let x = (estMenger || estMandelbulb) ? 0.11 : (estTetraedre ? 0.25 : (estMandelbox ? 0.2 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong || estLorenz || estRossler || estAizawa || estDuffing) ? 0.1 : (estSprott ? 0.2 : (estHenon ? 0.1 : 0.0)))))));
  let y = (estMenger || estMandelbulb) ? -0.17 : (estTetraedre ? 0.20 : (estMandelbox ? 0.0 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong || estAizawa || estDuffing) ? 0.1 : (estSprott ? 0.1 : (estHenon ? 0.0 : 0.0)))))));
  let z = (estMenger || estMandelbulb || estTetraedre) ? 0.10 : (estMandelbox ? 0.3 : ((estSprott ? 0.1 : 0.0)));
  let emitted = 0;
  let iter = 0;
  // est3D : orbite 3D projetée isométriquement — pondération par profondeur activée.
  const est3D = estMenger || estMandelbulb || estTetraedre || estJuliaQuaternion || estMandelbox || estRossler || estAizawa || estSprott;
  const tampon = creerTamponPonctuel(w, h);
  const cosR = Math.cos(view.rotation);
  const sinR = Math.sin(view.rotation);
  const centerX = view.centerX;
  const centerY = view.centerY;

  const putPoint = (px, py, poids = 1, rayon = 0, lumiere = 0) => {
    ajouterPointPonctuel(tampon, px, py, poids, rayon, lumiere);
    if (estIkeda || estLorenz) {
      ajouterPointPonctuel(tampon, px + 1, py, poids, 0, lumiere);
      ajouterPointPonctuel(tampon, px, py + 1, poids, 0, lumiere);
      ajouterPointPonctuel(tampon, px + 1, py + 1, poids, 0, lumiere);
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
          const ddx = ox - centerX;
          const ddy = oy - centerY;
          const px = ((ddx * cosR + ddy * sinR) / ps + w / 2) | 0;
          const py = ((-ddx * sinR + ddy * cosR) / ps + h / 2) | 0;
          putPoint(px, py);
        }
        emitted += 1;
      } else {
        let projection = null;
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
        } else if (estJuliaQuaternion) {
          const sx = (rng() * 2.0 - 1.0) * 1.55;
          const sy = (rng() * 2.0 - 1.0) * 1.55;
          const sz = (rng() * 2.0 - 1.0) * 1.55;
          let qx = sx;
          let qy = sy;
          let qz = sz;
          let vivant = true;
          const limite = Math.max(18, Math.min(42, params.maxIter >> 3));
          for (let i = 0; i < limite; i++) {
            [qx, qy, qz] = etapeJuliaQuaternion(qx, qy, qz);
            if (qx * qx + qy * qy + qz * qz > 16.0) {
              vivant = false;
              break;
            }
          }
          if (!vivant) {
            emitted += 1;
            continue;
          }
          x = sx;
          y = sy;
          z = sz;
          projection = projeterPoint3D("julia_quaternion", x, y, z);
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
          if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.1; y = 0.0; z = 0.0; }
        } else if (estRossler) {
          [x, y, z] = etapeRosslerAttractor(x, y, z);
          if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.1; y = 0.0; z = 0.0; }
        } else if (estAizawa) {
          [x, y, z] = etapeAizawaAttractor(x, y, z);
          if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.1; y = 0.0; z = 0.0; }
        } else if (estSprott) {
          [x, y, z] = etapeSprottAttractor(x, y, z);
          if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.2; y = 0.1; z = 0.1; }
        } else if (estFeigenbaum) {
          const rr = 2.5 + ((iter % Math.max(1200, w)) / Math.max(1200, w)) * 1.5;
          x = rr * (x || 0.5) * (1.0 - (x || 0.5));
          y = x * 2.0 - 1.0;
        } else if (estDuffing) {
          [x, y] = etapeDuffingAttractor(x, y);
          if (!isFinite(x) || !isFinite(y) || x * x + y * y > 400) { x = 0.1; y = 0.1; }
        } else if (estTapis) {
          [x, y] = etapeTapisSierpinski(x, y, r);
        } else if (estSierpinski) {
          [x, y] = sierpinskiStep(x, y, r);
        }
        iter += 1;
        if (iter <= burnIn) continue;
        if (!projection) {
          projection = projeterFractalePonctuelle(params.fractal, x, y, z, iter, w);
        }
        const rx = projection.x;
        const ry = projection.y;
        let px, py;
        if (est3D) {
          px = ((rx - cx0) / ps) | 0;
          py = ((ry - cy0) / ps) | 0;
        } else {
          const ddx = rx - centerX;
          const ddy = ry - centerY;
          px = ((ddx * cosR + ddy * sinR) / ps + w / 2) | 0;
          py = ((-ddx * sinR + ddy * cosR) / ps + h / 2) | 0;
        }
        const poids = est3D ? Math.max(1, Math.min(7, 1 + Math.round(projection.proximite * 6))) : 1;
        const lumiere = est3D ? Math.round(120 + projection.proximite * 880) : 0;
        putPoint(px, py, poids, projection.rayon || 0, lumiere);
        emitted += 1;
      }
    }
    coloriserDensite(data, tampon.densites, tampon.maxDensite, params, tampon.lumieres);
    if (token !== renderToken) return;
    ctx.putImageData(imageDataBuffer, 0, 0);
    if (emitted < pointsTarget) {
      requestAnimationFrame(step);
    } else {
      if (token !== renderToken) return;
      const elapsed = (performance.now() - renderStart).toFixed(0);
      rendering = false;
      canvas.parentElement.classList.remove("rendering");
      const etiquetteMode = estBuddhabrot ? "Mode densité" : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estFeigenbaum || estDuffing) ? "Mode attracteur" : "Mode IFS");
      updateStatusBar(etiquetteMode + " - " + elapsed + " ms", true);
      explorationModes?.afterRender();
    }
  };
  requestAnimationFrame(step);
}

function renderLineFractal(w, h) {
  const fond = getPaletteBackground(params);
  ctx.fillStyle = "rgb(" + fond[0] + ", " + fond[1] + ", " + fond[2] + ")";
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-view.rotation);
  ctx.translate(-w / 2, -h / 2);
  dessinerFractaleLineaire(ctx, w, h, view, params, true);
  ctx.restore();
  const elapsed = (performance.now() - renderStart).toFixed(0);
  rendering = false;
  canvas.parentElement.classList.remove("rendering");
  updateStatusBar("Mode géométrique - " + elapsed + " ms", true);
  explorationModes?.afterRender();
}

function dessinerFractaleLineaire(ctxCible, w, h, vueCible, renduParams, skipBackground = false) {
  if (!skipBackground) {
    const fond = getPaletteBackground(renduParams);
    ctxCible.fillStyle = "rgb(" + fond[0] + ", " + fond[1] + ", " + fond[2] + ")";
    ctxCible.fillRect(0, 0, w, h);
  }

  const stroke = getColor(Math.min(renduParams.maxIter * 0.6, renduParams.maxIter - 1), renduParams.maxIter, renduParams);
  ctxCible.strokeStyle = "rgb(" + stroke[0] + ", " + stroke[1] + ", " + stroke[2] + ")";
  ctxCible.lineWidth = Math.max(1, Math.min(2, w / 800));
  ctxCible.beginPath();
  const traceur = creerTraceurMonde(ctxCible, w, h, vueCible);

  if (renduParams.lsystemProposalActive) {
    dessinerPropositionLSystemeMonde(traceur, renduParams);
  } else if (renduParams.fractal === "koch") {
    const n = Math.max(0, Math.min(6, Math.floor((renduParams.maxIter - 64) / 128)));
    const commands = kochGenerate(n);
    dessinerCommandeLineaireMonde(traceur, commands, 0.05, -0.28, 0.0, 0.8 / Math.pow(3, n), Math.PI / 3);
  } else if (renduParams.fractal === "dragon_heighway") {
    const n = Math.max(8, Math.min(15, Math.floor(renduParams.maxIter / 64) + 7));
    const commands = genererDragonHeighway(n);
    dessinerCommandeLineaireMonde(traceur, commands, -0.6, 0.0, 0.0, 1.7 / Math.pow(Math.SQRT2, n), Math.PI / 2);
  } else if (renduParams.fractal === "courbe_levy_c") {
    const n = Math.max(8, Math.min(15, Math.floor(renduParams.maxIter / 64) + 7));
    const commands = genererCourbeLevyC(n);
    dessinerCommandeLineaireMonde(traceur, commands, -0.78, 0.0, 0.0, 1.55 / Math.pow(Math.SQRT2, n), Math.PI / 4);
  } else if (renduParams.fractal === "gosper_curve") {
    const n = Math.max(1, Math.min(4, Math.floor(renduParams.maxIter / 112) + 1));
    const commands = genererGosper(n);
    dessinerCommandeLineaireMonde(traceur, commands, -0.95, 0.35, 0.0, 2.2 / Math.pow(Math.sqrt(7), n), Math.PI / 3);
  } else if (renduParams.fractal === "cantor_set") {
    dessinerCantorMonde(traceur, renduParams.maxIter);
  } else if (renduParams.fractal === "triangle_de_cercles_recursifs") {
    dessinerTriangleCerclesRecursifsMonde(traceur, 0.0, 0.55, 0.58, Math.max(3, Math.min(6, Math.floor(renduParams.maxIter / 80) + 2)));
  } else if (renduParams.fractal === "apollonian_gasket") {
    dessinerJointApolloniusMonde(traceur, Math.max(3, Math.min(7, Math.floor(renduParams.maxIter / 72) + 2)));
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
  const estJuliaQuaternion = renduParams.fractal === "julia_quaternion";
  const estMandelbox = renduParams.fractal === "mandelbox";
  const estVicsek = renduParams.fractal === "vicsek_fractal";
  const estLichtenberg = renduParams.fractal === "lichtenberg_figures";
  const estClifford = renduParams.fractal === "attracteur_de_clifford";
  const estPeterDeJong = renduParams.fractal === "attracteur_de_peter_de_jong";
  const estIkeda = renduParams.fractal === "attracteur_ikeda";
  const estHenon = renduParams.fractal === "attracteur_de_henon";
  const estLorenz = renduParams.fractal === "lorenz_attractor";
  const estRossler = renduParams.fractal === "rossler_attractor";
  const estAizawa = renduParams.fractal === "aizawa_attractor";
  const estSprott = renduParams.fractal === "sprott_attractor";
  const estFeigenbaum = renduParams.fractal === "feigenbaum_tree";
  const estDuffing = renduParams.fractal === "duffing_attractor";
  const estBuddhabrot = renduParams.fractal === "buddhabrot";
  const rng = makeRng(0x9e3779b9 ^ (renduParams.maxIter << 7) ^ renduParams.fractal.length);
  const pointsTarget = estBuddhabrot
    ? Math.max(8000, renduParams.maxIter * 70)
    : (estJuliaQuaternion ? Math.max(150000, renduParams.maxIter * 2400) : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estRossler || estAizawa || estSprott || estFeigenbaum || estDuffing) ? Math.max(140000, renduParams.maxIter * 1800) : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? Math.max(80000, renduParams.maxIter * 1200) : Math.max(30000, renduParams.maxIter * 900))));
  const burnIn = estBarnsley ? 80 : (estBuddhabrot ? 0 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estRossler || estAizawa || estSprott || estDuffing) ? 140 : ((estMenger || estTetraedre || estMandelbox) ? 60 : 40)));
  let x = (estMenger || estMandelbulb) ? 0.11 : (estTetraedre ? 0.25 : (estMandelbox ? 0.2 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong || estLorenz || estRossler || estAizawa || estDuffing) ? 0.1 : (estSprott ? 0.2 : 0.0))))));
  let y = (estMenger || estMandelbulb) ? -0.17 : (estTetraedre ? 0.20 : (estMandelbox ? 0.0 : (estTapis ? -0.7 : (estIkeda ? 0.1 : ((estClifford || estPeterDeJong || estAizawa || estDuffing) ? 0.1 : (estSprott ? 0.1 : 0.0))))));
  let z = (estMenger || estMandelbulb || estTetraedre) ? 0.10 : (estMandelbox ? 0.3 : (estSprott ? 0.1 : 0.0));
  const est3D = estMenger || estMandelbulb || estTetraedre || estJuliaQuaternion || estMandelbox || estRossler || estAizawa || estSprott;
  let emitted = 0;
  let iter = 0;
  const tampon = creerTamponPonctuel(w, h);
  const cosR = Math.cos(renduParams.rotation ?? 0);
  const sinR = Math.sin(renduParams.rotation ?? 0);
  const centerX = cx0 + (w / 2) * ps;
  const centerY = cy0 + (h / 2) * ps;

  const pointsParBloc = estBuddhabrot ? 400 : (estJuliaQuaternion ? 18000 : ((estClifford || estPeterDeJong || estIkeda || estHenon || estLorenz || estFeigenbaum || estDuffing) ? 30000 : ((estMenger || estMandelbulb || estTetraedre || estMandelbox) ? 26000 : 25000)));
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
            const ddx = ox - centerX;
            const ddy = oy - centerY;
            const px = ((ddx * cosR + ddy * sinR) / ps + w / 2) | 0;
            const py = ((-ddx * sinR + ddy * cosR) / ps + h / 2) | 0;
            ajouterPointPonctuel(tampon, px, py, 1, 0, 0);
          }
        }
        emitted += 1;
        continue;
      }

      let projection = null;
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
      } else if (estJuliaQuaternion) {
        const sx = (rng() * 2.0 - 1.0) * 1.55;
        const sy = (rng() * 2.0 - 1.0) * 1.55;
        const sz = (rng() * 2.0 - 1.0) * 1.55;
        let qx = sx;
        let qy = sy;
        let qz = sz;
        let vivant = true;
        const limite = Math.max(18, Math.min(42, renduParams.maxIter >> 3));
        for (let i = 0; i < limite; i++) {
          [qx, qy, qz] = etapeJuliaQuaternion(qx, qy, qz);
          if (qx * qx + qy * qy + qz * qz > 16.0) {
            vivant = false;
            break;
          }
        }
        if (!vivant) {
          emitted += 1;
          continue;
        }
        x = sx;
        y = sy;
        z = sz;
        projection = projeterPoint3D("julia_quaternion", x, y, z);
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
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.1; y = 0.0; z = 0.0; }
      } else if (estRossler) {
        [x, y, z] = etapeRosslerAttractor(x, y, z);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.1; y = 0.0; z = 0.0; }
      } else if (estAizawa) {
        [x, y, z] = etapeAizawaAttractor(x, y, z);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.1; y = 0.0; z = 0.0; }
      } else if (estSprott) {
        [x, y, z] = etapeSprottAttractor(x, y, z);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 4096) { x = 0.2; y = 0.1; z = 0.1; }
      } else if (estFeigenbaum) {
        const rr = 2.5 + ((iter % Math.max(1200, w)) / Math.max(1200, w)) * 1.5;
        x = rr * (x || 0.5) * (1.0 - (x || 0.5));
        y = x * 2.0 - 1.0;
      } else if (estDuffing) {
        [x, y] = etapeDuffingAttractor(x, y);
        if (!isFinite(x) || !isFinite(y) || x * x + y * y > 400) { x = 0.1; y = 0.1; }
      } else if (estTapis) {
        [x, y] = etapeTapisSierpinski(x, y, r);
      } else if (estSierpinski) {
        [x, y] = sierpinskiStep(x, y, r);
      }
      iter += 1;
      if (iter <= burnIn) continue;
      if (!projection) {
        projection = projeterFractalePonctuelle(renduParams.fractal, x, y, z, iter, w);
      }
      const rx = projection.x;
      const ry = projection.y;
      let px, py;
      if (est3D) {
        px = ((rx - cx0) / ps) | 0;
        py = ((ry - cy0) / ps) | 0;
      } else {
        const ddx = rx - centerX;
        const ddy = ry - centerY;
        px = ((ddx * cosR + ddy * sinR) / ps + w / 2) | 0;
        py = ((-ddx * sinR + ddy * cosR) / ps + h / 2) | 0;
      }
      const poids = est3D ? Math.max(1, Math.min(7, 1 + Math.round(projection.proximite * 6))) : 1;
      const lumiere = est3D ? Math.round(120 + projection.proximite * 880) : 0;
      ajouterPointPonctuel(tampon, px, py, poids, projection.rayon || 0, lumiere);
      if (estIkeda || estLorenz) {
        ajouterPointPonctuel(tampon, px + 1, py, poids, 0, lumiere);
        ajouterPointPonctuel(tampon, px, py + 1, poids, 0, lumiere);
        ajouterPointPonctuel(tampon, px + 1, py + 1, poids, 0, lumiere);
      }
      emitted += 1;
    }
    await attendre(0);
  }

  coloriserDensite(data, tampon.densites, tampon.maxDensite, renduParams, tampon.lumieres);
}

function appliquerTransforme(x, y, renduParams) {
  const ct = renduParams.coordTransform;
  if (!ct || ct === "aucune") return [x, y];
  if (ct === "log_polaire") {
    const r2 = x * x + y * y;
    if (r2 < 1e-20) return [x, y];
    return [0.5 * Math.log(r2), Math.atan2(y, x)];
  }
  if (ct === "inversion") {
    const r2 = x * x + y * y;
    if (r2 < 1e-20) return [x, y];
    return [x / r2, -y / r2];
  }
  if (ct === "pli_x") return [Math.abs(x), y];
  if (ct === "pli_y") return [x, Math.abs(y)];
  if (ct === "pli_xy") return [Math.abs(x), Math.abs(y)];
  if (ct === "mobius") {
    const mp = renduParams.mobiusPreset || "inversion_cercle";
    if (mp === "inversion_cercle") {
      const r2 = x * x + y * y;
      if (r2 < 1e-20) return [x, y];
      return [x / r2, -y / r2];
    }
    if (mp === "cayley") {
      // z → (z−1)/(z+1)
      const denRe = x + 1, denIm = y;
      const den2 = denRe * denRe + denIm * denIm;
      if (den2 < 1e-20) return [x, y];
      return [((x - 1) * denRe + y * denIm) / den2, (y * denRe - (x - 1) * denIm) / den2];
    }
    if (mp === "joukowski") {
      const r2 = x * x + y * y;
      if (r2 < 1e-20) return [x, y];
      return [(x + x / r2) * 0.5, (y - y / r2) * 0.5];
    }
  }
  return [x, y];
}

async function remplirFractaleScalaire(w, h, data, cx0, cy0, ps, renduParams) {
  const fn = wasmFunctions[renduParams.fractal];
  if (!fn) {
    const fond = getPaletteBackground(renduParams);
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
  const estFractaleOrbitrap = renduParams.fractal === "mandelbrot_piege_cercle" || renduParams.fractal === "mandelbrot_piege_croix" || renduParams.fractal === "mandelbrot_piege_ligne" || renduParams.fractal === "julia_piege_cercle";
  const estFractaleLisse = renduParams.fractal === "mandelbrot_lisse" || renduParams.fractal === "julia_lisse" || renduParams.fractal === "burning_ship_lisse" || renduParams.fractal === "tricorn_lisse";

  const useTransform = renduParams.coordTransform && renduParams.coordTransform !== "aucune";
  for (let py = 0; py < h; py++) {
    const rawCy = cy0 + py * ps;
    const base = py * w * 4;
    for (let px = 0; px < w; px++) {
      const rawCx = cx0 + px * ps;
      let cx = rawCx, cy = rawCy;
      if (useTransform) { [cx, cy] = appliquerTransforme(rawCx, rawCy, renduParams); }
      let iterValue;
      if (renduParams.fractal === "julia" || renduParams.fractal === "burning_julia" || renduParams.fractal === "julia_lisse" || renduParams.fractal === "julia_piege_cercle") {
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
      if (estFractaleBassin) couleur = getBasinColor(iterValue, renduParams.maxIter, renduParams);
      else if (estFractaleLyapunov) couleur = getColorFromRatio(0.12 + Math.pow(Math.min(0.999, iterColor / renduParams.maxIter), 0.85) * 0.82, renduParams);
      else if (estFractaleMagnetique) couleur = getColorFromRatio(0.08 + Math.pow(Math.min(0.999, iterColor / renduParams.maxIter), 0.68) * 0.88, renduParams);
      else if (estFractaleOrbitrap) couleur = getColorFromRatio(Math.min(0.999, iterValue / renduParams.maxIter), renduParams);
      else couleur = getColor(iterColor, renduParams.maxIter, renduParams);
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
  if (estFractale3D(renduParams.fractal)) {
    rendre3DSurCanvas(canvasCible, renduParams.fractal, renduParams.maxIter, getPaletteComplete(renduParams), vueCible?.vue3d ?? obtenirVue3DActive());
    return;
  }
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
  if (renduParams.formulePropositionActive && formuleFnCompilee) {
    const modeJulia = renduParams.formuleMode === "julia";
    const R2 = (renduParams.formuleEscapeRadius || 2) ** 2;
    const fFn = formuleFnCompilee;
    const cx0f = vueCible.centerX - (w / 2) * vueCible.pixelSize;
    const cy0f = vueCible.centerY - (h / 2) * vueCible.pixelSize;
    const psf = vueCible.pixelSize;
    const imgF = ctxCible.createImageData(w, h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const qx = cx0f + px * psf, qy = cy0f + py * psf;
        let zr = modeJulia ? qx : 0, zi = modeJulia ? qy : 0;
        const cr = modeJulia ? renduParams.juliaCre : qx, ci = modeJulia ? renduParams.juliaCim : qy;
        let iter = renduParams.maxIter;
        for (let n = 0; n < renduParams.maxIter; n++) {
          const r = fFn(zr, zi, cr, ci); zr = r[0]; zi = r[1];
          if (!isFinite(zr + zi) || zr * zr + zi * zi > R2) { iter = n; break; }
        }
        const c = getColor(iter, renduParams.maxIter, renduParams);
        const ii = (py * w + px) * 4;
        imgF.data[ii] = c[0]; imgF.data[ii + 1] = c[1]; imgF.data[ii + 2] = c[2]; imgF.data[ii + 3] = 255;
      }
      if (py % 12 === 0) await attendre(0);
    }
    ctxCible.putImageData(imgF, 0, 0);
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
        print_str: (_ptr, _len) => { },
        print_f64: (_x) => { },
        print_bool: (_b) => { },
        print_sep: () => { },
        print_newline: () => { },
        pow_f64: Math.pow,
      },
      wasi_snapshot_preview1: {
        fd_write: (_fd, _iovs, _iovsLen, _nwritten) => 0,
        fd_read: (_fd, _iovs, _iovsLen, _nread) => 0,
        args_sizes_get: (_argcPtr, _argvBufSizePtr) => 0,
        args_get: (_argvPtr, _argvBufPtr) => 0,
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
      rossler_attractor: typeof exports.rossler_attractor === "function" ? exports.rossler_attractor : null,
      aizawa_attractor: typeof exports.aizawa_attractor === "function" ? exports.aizawa_attractor : null,
      sprott_attractor: typeof exports.sprott_attractor === "function" ? exports.sprott_attractor : null,
      feigenbaum_tree: typeof exports.feigenbaum_tree === "function" ? exports.feigenbaum_tree : null,
      barnsley: typeof exports.barnsley === "function" ? exports.barnsley : null,
      sierpinski: typeof exports.sierpinski === "function" ? exports.sierpinski : null,
      tapis_sierpinski: typeof exports.tapis_sierpinski === "function" ? exports.tapis_sierpinski : null,
      menger_sponge: typeof exports.menger_sponge === "function" ? exports.menger_sponge : null,
      mandelbulb: typeof exports.mandelbulb === "function" ? exports.mandelbulb : null,
      vicsek_fractal: typeof exports.vicsek_fractal === "function" ? exports.vicsek_fractal : null,
      lichtenberg_figures: typeof exports.lichtenberg_figures === "function" ? exports.lichtenberg_figures : null,
      tetraedre_sierpinski: typeof exports.tetraedre_sierpinski === "function" ? exports.tetraedre_sierpinski : null,
      julia_quaternion: typeof exports.julia_quaternion === "function" ? exports.julia_quaternion : null,
      mandelbox: typeof exports.mandelbox === "function" ? exports.mandelbox : null,
      koch: typeof exports.koch === "function" ? exports.koch : null,
      dragon_heighway: typeof exports.dragon_heighway === "function" ? exports.dragon_heighway : null,
      courbe_levy_c: typeof exports.courbe_levy_c === "function" ? exports.courbe_levy_c : null,
      gosper_curve: typeof exports.gosper_curve === "function" ? exports.gosper_curve : null,
      cantor_set: typeof exports.cantor_set === "function" ? exports.cantor_set : null,
      triangle_de_cercles_recursifs: typeof exports.triangle_de_cercles_recursifs === "function" ? exports.triangle_de_cercles_recursifs : null,
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
      burning_julia: typeof exports.burning_julia === "function" ? exports.burning_julia : null,
      biomorphe: typeof exports.biomorphe === "function" ? exports.biomorphe : null,
      duffing_attractor: typeof exports.duffing_attractor === "function" ? exports.duffing_attractor : null,
      mandelbrot_lisse: typeof exports.mandelbrot_lisse === "function" ? exports.mandelbrot_lisse : null,
      julia_lisse: typeof exports.julia_lisse === "function" ? exports.julia_lisse : null,
      burning_ship_lisse: typeof exports.burning_ship_lisse === "function" ? exports.burning_ship_lisse : null,
      tricorn_lisse: typeof exports.tricorn_lisse === "function" ? exports.tricorn_lisse : null,
      mandelbrot_piege_cercle: typeof exports.mandelbrot_piege_cercle === "function" ? exports.mandelbrot_piege_cercle : null,
      mandelbrot_piege_croix: typeof exports.mandelbrot_piege_croix === "function" ? exports.mandelbrot_piege_croix : null,
      mandelbrot_piege_ligne: typeof exports.mandelbrot_piege_ligne === "function" ? exports.mandelbrot_piege_ligne : null,
      julia_piege_cercle: typeof exports.julia_piege_cercle === "function" ? exports.julia_piege_cercle : null,
    };
    wasmExportFunctions = {
      interpoler_lineaire: typeof exports.interpoler_lineaire === "function" ? exports.interpoler_lineaire : null,
      interpoler_logarithmique: typeof exports.interpoler_logarithmique === "function" ? exports.interpoler_logarithmique : null,
      ajuster_iterations_export: typeof exports.ajuster_iterations_export === "function" ? exports.ajuster_iterations_export : null,
      easer_cubique: typeof exports.easer_cubique === "function" ? exports.easer_cubique : null,
      interpoler_pixelsize_nav: typeof exports.interpoler_pixelsize_nav === "function" ? exports.interpoler_pixelsize_nav : null,
      interpoler_angle_nav: typeof exports.interpoler_angle_nav === "function" ? exports.interpoler_angle_nav : null,
      barnsley_etape_x: typeof exports.barnsley_etape_x === "function" ? exports.barnsley_etape_x : null,
      barnsley_etape_y: typeof exports.barnsley_etape_y === "function" ? exports.barnsley_etape_y : null,
      sierpinski_etape_x: typeof exports.sierpinski_etape_x === "function" ? exports.sierpinski_etape_x : null,
      sierpinski_etape_y: typeof exports.sierpinski_etape_y === "function" ? exports.sierpinski_etape_y : null,
      tapis_sierpinski_etape_x: typeof exports.tapis_sierpinski_etape_x === "function" ? exports.tapis_sierpinski_etape_x : null,
      tapis_sierpinski_etape_y: typeof exports.tapis_sierpinski_etape_y === "function" ? exports.tapis_sierpinski_etape_y : null,
      menger_etape_x: typeof exports.menger_etape_x === "function" ? exports.menger_etape_x : null,
      menger_etape_y: typeof exports.menger_etape_y === "function" ? exports.menger_etape_y : null,
      menger_etape_z: typeof exports.menger_etape_z === "function" ? exports.menger_etape_z : null,
      mandelbulb_etape_x: typeof exports.mandelbulb_etape_x === "function" ? exports.mandelbulb_etape_x : null,
      mandelbulb_etape_y: typeof exports.mandelbulb_etape_y === "function" ? exports.mandelbulb_etape_y : null,
      mandelbulb_etape_z: typeof exports.mandelbulb_etape_z === "function" ? exports.mandelbulb_etape_z : null,
      vicsek_etape_x: typeof exports.vicsek_etape_x === "function" ? exports.vicsek_etape_x : null,
      vicsek_etape_y: typeof exports.vicsek_etape_y === "function" ? exports.vicsek_etape_y : null,
      tetraedre_etape_x: typeof exports.tetraedre_etape_x === "function" ? exports.tetraedre_etape_x : null,
      tetraedre_etape_y: typeof exports.tetraedre_etape_y === "function" ? exports.tetraedre_etape_y : null,
      tetraedre_etape_z: typeof exports.tetraedre_etape_z === "function" ? exports.tetraedre_etape_z : null,
      attracteur_de_clifford_etape_x: typeof exports.attracteur_de_clifford_etape_x === "function" ? exports.attracteur_de_clifford_etape_x : null,
      attracteur_de_clifford_etape_y: typeof exports.attracteur_de_clifford_etape_y === "function" ? exports.attracteur_de_clifford_etape_y : null,
      attracteur_de_peter_de_jong_etape_x: typeof exports.attracteur_de_peter_de_jong_etape_x === "function" ? exports.attracteur_de_peter_de_jong_etape_x : null,
      attracteur_de_peter_de_jong_etape_y: typeof exports.attracteur_de_peter_de_jong_etape_y === "function" ? exports.attracteur_de_peter_de_jong_etape_y : null,
      attracteur_ikeda_etape_x: typeof exports.attracteur_ikeda_etape_x === "function" ? exports.attracteur_ikeda_etape_x : null,
      attracteur_ikeda_etape_y: typeof exports.attracteur_ikeda_etape_y === "function" ? exports.attracteur_ikeda_etape_y : null,
      attracteur_de_henon_etape_x: typeof exports.attracteur_de_henon_etape_x === "function" ? exports.attracteur_de_henon_etape_x : null,
      attracteur_de_henon_etape_y: typeof exports.attracteur_de_henon_etape_y === "function" ? exports.attracteur_de_henon_etape_y : null,
      lorenz_attractor_etape_x: typeof exports.lorenz_attractor_etape_x === "function" ? exports.lorenz_attractor_etape_x : null,
      lorenz_attractor_etape_y: typeof exports.lorenz_attractor_etape_y === "function" ? exports.lorenz_attractor_etape_y : null,
      lorenz_attractor_etape_z: typeof exports.lorenz_attractor_etape_z === "function" ? exports.lorenz_attractor_etape_z : null,
      rossler_attractor_etape_x: typeof exports.rossler_attractor_etape_x === "function" ? exports.rossler_attractor_etape_x : null,
      rossler_attractor_etape_y: typeof exports.rossler_attractor_etape_y === "function" ? exports.rossler_attractor_etape_y : null,
      rossler_attractor_etape_z: typeof exports.rossler_attractor_etape_z === "function" ? exports.rossler_attractor_etape_z : null,
      aizawa_attractor_etape_x: typeof exports.aizawa_attractor_etape_x === "function" ? exports.aizawa_attractor_etape_x : null,
      aizawa_attractor_etape_y: typeof exports.aizawa_attractor_etape_y === "function" ? exports.aizawa_attractor_etape_y : null,
      aizawa_attractor_etape_z: typeof exports.aizawa_attractor_etape_z === "function" ? exports.aizawa_attractor_etape_z : null,
      sprott_attractor_etape_x: typeof exports.sprott_attractor_etape_x === "function" ? exports.sprott_attractor_etape_x : null,
      sprott_attractor_etape_y: typeof exports.sprott_attractor_etape_y === "function" ? exports.sprott_attractor_etape_y : null,
      sprott_attractor_etape_z: typeof exports.sprott_attractor_etape_z === "function" ? exports.sprott_attractor_etape_z : null,
      projeter_lorenz_x: typeof exports.projeter_lorenz_x === "function" ? exports.projeter_lorenz_x : null,
      projeter_lorenz_y: typeof exports.projeter_lorenz_y === "function" ? exports.projeter_lorenz_y : null,
      projeter_rossler_x: typeof exports.projeter_rossler_x === "function" ? exports.projeter_rossler_x : null,
      projeter_rossler_y: typeof exports.projeter_rossler_y === "function" ? exports.projeter_rossler_y : null,
      projeter_aizawa_x: typeof exports.projeter_aizawa_x === "function" ? exports.projeter_aizawa_x : null,
      projeter_aizawa_y: typeof exports.projeter_aizawa_y === "function" ? exports.projeter_aizawa_y : null,
      projeter_sprott_x: typeof exports.projeter_sprott_x === "function" ? exports.projeter_sprott_x : null,
      projeter_sprott_y: typeof exports.projeter_sprott_y === "function" ? exports.projeter_sprott_y : null,
      duffing_attractor_etape_x: typeof exports.duffing_attractor_etape_x === "function" ? exports.duffing_attractor_etape_x : null,
      duffing_attractor_etape_y: typeof exports.duffing_attractor_etape_y === "function" ? exports.duffing_attractor_etape_y : null,
      julia_quaternion_etape_x: typeof exports.julia_quaternion_etape_x === "function" ? exports.julia_quaternion_etape_x : null,
      julia_quaternion_etape_y: typeof exports.julia_quaternion_etape_y === "function" ? exports.julia_quaternion_etape_y : null,
      julia_quaternion_etape_z: typeof exports.julia_quaternion_etape_z === "function" ? exports.julia_quaternion_etape_z : null,
      mandelbox_etape_x: typeof exports.mandelbox_etape_x === "function" ? exports.mandelbox_etape_x : null,
      mandelbox_etape_y: typeof exports.mandelbox_etape_y === "function" ? exports.mandelbox_etape_y : null,
      mandelbox_etape_z: typeof exports.mandelbox_etape_z === "function" ? exports.mandelbox_etape_z : null,
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
    canvas.width = w;
    canvas.height = h;
    imageDataBuffer = null;  // invalider le buffer
  }
  if (canvas3d.width !== w || canvas3d.height !== h) {
    canvas3d.width = w;
    canvas3d.height = h;
  }
  if (overlayCanvas && (overlayCanvas.width !== w || overlayCanvas.height !== h)) {
    overlayCanvas.width = w;
    overlayCanvas.height = h;
  }
  redimensionnerMoteur3D();
}

/**
 * Lance un rendu complet de la fractale courante.
 * Le rendu est découpé en tranches (rows par frame) pour rester réactif.
 */
function render() {
  const token = ++renderToken;

  resizeCanvas();
  const canvasActif = obtenirCanvasActif();
  const w = canvasActif.width;
  const h = canvasActif.height;
  if (w === 0 || h === 0) return;

  activerMode3D(fractaleActiveEst3D(), params.fractal);
  canvas.classList.toggle("canvas-visible", !fractaleActiveEst3D());
  canvas.classList.toggle("canvas-masque", fractaleActiveEst3D());

  if (!imageDataBuffer || imageDataBuffer.width !== w || imageDataBuffer.height !== h) {
    imageDataBuffer = ctx.createImageData(w, h);
  }
  const data = imageDataBuffer.data;

  const cx0 = view.centerX - (w / 2) * view.pixelSize;
  const cy0 = view.centerY - (h / 2) * view.pixelSize;
  const ps = view.pixelSize;
  const max = params.maxIter;
  const pal = params;
  const cosR = Math.cos(view.rotation);
  const sinR = Math.sin(view.rotation);

  rendering = true;
  renderStart = performance.now();
  canvas.parentElement.classList.add("rendering");
  updateStatusBar("Rendu en cours…");

  if (fractaleActiveEst3D()) {
    render3D(params.fractal, params.maxIter, getPaletteComplete(params));
    rendering = false;
    canvas.parentElement.classList.remove("rendering");
    explorationModes?.afterRender();
    return;
  }

  if (POINT_FRACTALS.has(params.fractal)) {
    renderPointFractal(w, h, data, cx0, cy0, ps, token);
    return;
  }

  if (LINE_FRACTALS.has(params.fractal)) {
    renderLineFractal(w, h);
    return;
  }

  if (params.formulePropositionActive && formuleFnCompilee) {
    const modeJulia = params.formuleMode === "julia";
    const R2 = (params.formuleEscapeRadius || 2) ** 2;
    const fFn = formuleFnCompilee;
    let row = 0;
    function stepFormule() {
      if (token !== renderToken) return;
      const endRow = Math.min(row + 4, h);
      for (let py = row; py < endRow; py++) {
        const dy = (py - h * 0.5) * ps;
        const base = py * w * 4;
        for (let px = 0; px < w; px++) {
          const dx = (px - w * 0.5) * ps;
          const qx = view.centerX + dx * cosR - dy * sinR;
          const qy = view.centerY + dx * sinR + dy * cosR;
          let zr = modeJulia ? qx : 0, zi = modeJulia ? qy : 0;
          const cr = modeJulia ? params.juliaCre : qx, ci = modeJulia ? params.juliaCim : qy;
          let iter = max;
          for (let n = 0; n < max; n++) {
            const r = fFn(zr, zi, cr, ci); zr = r[0]; zi = r[1];
            if (!isFinite(zr + zi) || zr * zr + zi * zi > R2) { iter = n; break; }
          }
          const couleur = getColor(iter, max, pal);
          const ii = base + px * 4;
          data[ii] = couleur[0]; data[ii + 1] = couleur[1]; data[ii + 2] = couleur[2]; data[ii + 3] = 255;
        }
      }
      ctx.putImageData(imageDataBuffer, 0, 0, 0, row, w, endRow - row);
      row = endRow;
      if (row < h) { requestAnimationFrame(stepFormule); return; }
      if (token !== renderToken) return;
      rendering = false;
      canvas.parentElement.classList.remove("rendering");
      updateStatusBar(`Formule JS — ${(performance.now() - renderStart).toFixed(0)} ms`, true);
      explorationModes?.afterRender();
    }
    requestAnimationFrame(stepFormule);
    return;
  }

  const { fn, backend } = getActiveFractalFn();
  if (!fn) {
    const fond = getPaletteBackground(params);
    ctx.fillStyle = "rgb(" + fond[0] + ", " + fond[1] + ", " + fond[2] + ")";
    ctx.fillRect(0, 0, w, h);
    rendering = false;
    canvas.parentElement.classList.remove("rendering");
    updateStatusBar(`${params.fractal} : export WASM manquant`, true);
    explorationModes?.afterRender();
    return;
  }

  let row = 0;
  const ROWS_PER_FRAME = 8;
  const estFractaleBassin = params.fractal === "newton" || params.fractal === "bassin_newton_generalise" || params.fractal === "orbitale_de_nova";
  const estFractaleLyapunov = params.fractal === "lyapunov" || params.fractal === "lyapunov_multisequence";
  const estFractaleMagnetique = params.fractal === "magnet1" || params.fractal === "magnet2" || params.fractal === "magnet3" || params.fractal === "lambda_fractale" || params.fractal === "lambda_cubique" || params.fractal === "magnet_cosinus" || params.fractal === "magnet_sinus" || params.fractal === "nova_magnetique";
  const estFractaleOrbitrap = params.fractal === "mandelbrot_piege_cercle" || params.fractal === "mandelbrot_piege_croix" || params.fractal === "mandelbrot_piege_ligne" || params.fractal === "julia_piege_cercle";
  const estFractaleLisse = params.fractal === "mandelbrot_lisse" || params.fractal === "julia_lisse" || params.fractal === "burning_ship_lisse" || params.fractal === "tricorn_lisse";

  function step() {
    if (token !== renderToken) return;
    const endRow = Math.min(row + ROWS_PER_FRAME, h);
    for (let py = row; py < endRow; py++) {
      const dy = (py - h * 0.5) * ps;
      const base = py * w * 4;
      for (let px = 0; px < w; px++) {
        const dx = (px - w * 0.5) * ps;
        const cx = view.centerX + dx * cosR - dy * sinR;
        const cy = view.centerY + dx * sinR + dy * cosR;
        let iter;
        if (params.fractal === "julia" || params.fractal === "burning_julia" || params.fractal === "julia_lisse" || params.fractal === "julia_piege_cercle") {
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
        } else if (estFractaleOrbitrap) {
          couleur = getColorFromRatio(Math.min(0.999, iter / max), pal);
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
      explorationModes?.afterRender();
    }
  }

  requestAnimationFrame(step);
} function updateStatusBar(msg, autoHide = false) {
  renderStatus.textContent = msg;
  renderStatus.classList.remove("hidden");
  if (autoHide) {
    setTimeout(() => renderStatus.classList.add("hidden"), 3000);
  }
}

// ============================================================
// INTERACTION (ZOOM / PAN)
// ============================================================

/** Convertit les coordonnées canvas → coordonnées du plan complexe (rotation incluse). */
function canvasToComplex(px, py) {
  const dx = (px - canvas.width / 2) * view.pixelSize;
  const dy = (py - canvas.height / 2) * view.pixelSize;
  const cr = Math.cos(view.rotation);
  const sr = Math.sin(view.rotation);
  return {
    re: view.centerX + dx * cr - dy * sr,
    im: view.centerY + dx * sr + dy * cr,
  };
}

/*
function deplacerVue(deltaX, deltaY) {
  view.centerX += deltaX;
  view.centerY += deltaY;
  render();
}

function zoomerCentre(factor) {
  zoomAt(canvas.width / 2, canvas.height / 2, factor);
}
*/

/** Zoom centré sur (px, py) canvas par le facteur donné. */
function zoomAt(px, py, factor) {
  if (fractaleActiveEst3D()) {
    zoomerVue3D(factor < 1 ? 1 / Math.max(factor, 0.001) : 1 / factor);
    return;
  }
  const { re, im } = canvasToComplex(px, py);
  view.centerX = re + (view.centerX - re) / factor;
  view.centerY = im + (view.centerY - im) / factor;
  view.pixelSize /= factor;
  render();
  mettreAJourHash(view, params);
}

function deplacerVue(deltaX, deltaY) {
  if (fractaleActiveEst3D()) {
    deplacerVue3D(deltaX * 0.12, deltaY * 0.12);
    return;
  }
  if (LINE_FRACTALS.has(params.fractal) && view.rotation !== 0) {
    const cosR = Math.cos(view.rotation);
    const sinR = Math.sin(view.rotation);
    view.centerX += deltaX * cosR - deltaY * sinR;
    view.centerY += deltaX * sinR + deltaY * cosR;
  } else {
    view.centerX += deltaX;
    view.centerY += deltaY;
  }
  render();
  mettreAJourHash(view, params);
}

function zoomerCentre(factor) {
  if (fractaleActiveEst3D()) {
    zoomerVue3D(1 / factor);
    return;
  }
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
  if (fractaleActiveEst3D()) {
    reinitialiserVue3DActive(params.fractal);
    render();
    return;
  }
  const preset = params.fractal === "multibrot"
    ? getMultibrotPreset(params.multibrotPower)
    : (VIEW_PRESETS[params.fractal] ?? VIEW_PRESETS.mandelbrot);
  view.centerX = preset.centerX;
  view.centerY = preset.centerY;
  view.pixelSize = preset.span / Math.max(canvas.width, 1);
  view.rotation = 0.0;
  render();
  mettreAJourHash(view, params);
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
  dragStart = { x: e.offsetX, y: e.offsetY };
  dragViewX = view.centerX;
  dragViewY = view.centerY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  // Affichage des coordonnées
  const { re, im } = canvasToComplex(e.offsetX, e.offsetY);
  coordsDisplay.textContent =
    `Re ${re >= 0 ? " " : ""}${re.toFixed(6)}  Im ${im >= 0 ? " " : ""}${im.toFixed(6)}`;

  // Julia coupling — mini aperçu Julia pour Mandelbrot
  if (params.fractal === "mandelbrot" && wasmAvailable && juliaCouplingCanvas && jCtx) {
    const couplageCre = re;
    const couplageCim = im;
    clearTimeout(couplagePendingId);
    couplagePendingId = setTimeout(() => {
      const jFn = wasmFunctions.julia;
      if (!jFn) return;
      const jImg = jCtx.createImageData(jW, jH);
      const jMax = Math.min(params.maxIter, 128);
      const jSpan = 3.0;
      const jPs = jSpan / jW;
      const jCx0 = -jSpan / 2;
      const jCy0 = -jSpan / 2;
      for (let jpy = 0; jpy < jH; jpy++) {
        const jcy = jCy0 + jpy * jPs;
        for (let jpx = 0; jpx < jW; jpx++) {
          const jcx = jCx0 + jpx * jPs;
          const jIter = jFn(jcx, jcy, couplageCre, couplageCim, jMax);
          const [r, g, b] = getColor(jIter, jMax, params);
          const ji = (jpy * jW + jpx) * 4;
          jImg.data[ji] = r; jImg.data[ji + 1] = g; jImg.data[ji + 2] = b; jImg.data[ji + 3] = 255;
        }
      }
      jCtx.putImageData(jImg, 0, 0);
    }, 60);
  }

  if (!dragStart) return;
  const dx = (e.offsetX - dragStart.x) * view.pixelSize;
  const dy = (e.offsetY - dragStart.y) * view.pixelSize;
  view.centerX = dragViewX - dx;
  view.centerY = dragViewY - dy;
  render();
});

canvas.addEventListener("pointerup", () => { dragStart = null; });
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
  if (iterSliderCompact) iterSliderCompact.value = String(params.maxIter);
  if (iterValueCompact) iterValueCompact.textContent = String(params.maxIter);
  mettreAJourResumeControles();
  render();
  mettreAJourHash(view, params);
});

if (iterSliderCompact) {
  iterSliderCompact.addEventListener("input", () => {
    params.maxIter = parseInt(iterSliderCompact.value, 10);
    iterSlider.value = String(params.maxIter);
    iterValue.textContent = params.maxIter;
    if (iterValueCompact) iterValueCompact.textContent = String(params.maxIter);
    mettreAJourResumeControles();
    render();
    mettreAJourHash(view, params);
  });
}

familySelect.addEventListener("change", () => {
  const fractale = populateFractalSelect(familySelect.value, null);
  setActiveFractal(fractale);
});

if (familySelectCompact) {
  familySelectCompact.addEventListener("change", () => {
    familySelect.value = familySelectCompact.value;
    const fractale = populateFractalSelect(familySelectCompact.value, null);
    setActiveFractal(fractale);
  });
}

fractalSelect.addEventListener("change", () => {
  setActiveFractal(fractalSelect.value);
});

if (fractalSelectCompact) {
  fractalSelectCompact.addEventListener("change", () => {
    fractalSelect.value = fractalSelectCompact.value;
    setActiveFractal(fractalSelectCompact.value);
  });
}

if (btnToggleControls) {
  btnToggleControls.addEventListener("click", () => {
    definirEtatControles(!controlsCollapsed);
  });
  btnToggleControls.classList.add("icon-btn");
}

if (btnMinimizeControls) {
  btnMinimizeControls.addEventListener("click", () => {
    definirEtatControles(true);
  });
}

multibrotPower.addEventListener("change", () => {
  params.multibrotPower = parseInt(multibrotPower.value, 10);
  mettreAJourResumeControles();
  if (params.fractal === "multibrot") {
    resetView();
  }
});

paletteSelect.addEventListener("change", () => {
  const anciennePalette = params.palette;
  params.palette = paletteSelect.value;
  if (params.palette === "personnalisee" && anciennePalette !== "personnalisee") {
    const paletteBase = paletteVersEtatEditable(getPaletteConfig(anciennePalette));
    params.paletteBackground = paletteBase.background;
    params.paletteInterior = paletteBase.interior;
    params.paletteStops = [...paletteBase.stops];
    customPaletteEditorOpen = true;
  } else if (params.palette !== "personnalisee") {
    customPaletteEditorOpen = false;
  }
  synchroniserControlePalette();
  render();
  mettreAJourHash(view, params);
});

if (paletteSelectCompact) {
  paletteSelectCompact.addEventListener("change", () => {
    paletteSelect.value = paletteSelectCompact.value;
    paletteSelect.dispatchEvent(new Event("change"));
  });
}

toggleCustomPaletteButton.classList.add("icon-btn");
toggleCustomPaletteButton.addEventListener("click", () => {
  if (params.palette !== "personnalisee") return;
  definirVisibiliteEditeurPalette(!customPaletteEditorOpen);
});

if (closeCustomPaletteButton) {
  closeCustomPaletteButton.classList.add("hidden");
  closeCustomPaletteButton.addEventListener("click", () => {
    definirVisibiliteEditeurPalette(false);
  });
}

paletteBackgroundInput.addEventListener("input", () => {
  params.palette = "personnalisee";
  customPaletteEditorOpen = true;
  params.paletteBackground = normaliserHexCouleur(paletteBackgroundInput.value, params.paletteBackground);
  synchroniserControlePalette();
  render();
});

paletteInteriorInput.addEventListener("input", () => {
  params.palette = "personnalisee";
  customPaletteEditorOpen = true;
  params.paletteInterior = normaliserHexCouleur(paletteInteriorInput.value, params.paletteInterior);
  synchroniserControlePalette();
  render();
});

addPaletteStopButton.addEventListener("click", () => {
  params.palette = "personnalisee";
  customPaletteEditorOpen = true;
  const palette = getPaletteComplete(params);
  const derniere = rgbVersHex(palette.stops[palette.stops.length - 1] ?? palette.interieur ?? [255, 255, 255]);
  params.paletteStops = [...params.paletteStops, derniere];
  synchroniserControlePalette();
  render();
});

customPaletteStops.addEventListener("input", (event) => {
  const cible = event.target;
  if (!(cible instanceof HTMLInputElement)) return;
  const index = Number.parseInt(cible.dataset.stopIndex ?? "", 10);
  if (!Number.isInteger(index) || index < 0 || index >= params.paletteStops.length) return;
  params.palette = "personnalisee";
  customPaletteEditorOpen = true;
  params.paletteStops[index] = normaliserHexCouleur(cible.value, params.paletteStops[index]);
  synchroniserControlePalette();
  render();
});

customPaletteStops.addEventListener("click", (event) => {
  const cible = event.target;
  if (!(cible instanceof HTMLElement)) return;
  const index = Number.parseInt(cible.dataset.removeStop ?? "", 10);
  if (!Number.isInteger(index) || params.paletteStops.length <= 2) return;
  params.palette = "personnalisee";
  customPaletteEditorOpen = true;
  params.paletteStops = params.paletteStops.filter((_, stopIndex) => stopIndex !== index);
  synchroniserControlePalette();
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

if (btnRotateLeft) {
  attacherActionControle(btnRotateLeft, () => {
    if (!fractaleActiveEst3D()) {
      view.rotation -= Math.PI / 36;
      render();
      mettreAJourHash(view, params);
    }
  });
}

if (btnRotateRight) {
  attacherActionControle(btnRotateRight, () => {
    if (!fractaleActiveEst3D()) {
      view.rotation += Math.PI / 36;
      render();
      mettreAJourHash(view, params);
    }
  });
}

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
    if (fractaleActiveEst3D()) orbiterVue3D(0.0, -0.12);
    else deplacerVue(0.0, -canvas.height * view.pixelSize * 0.18);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    if (fractaleActiveEst3D()) orbiterVue3D(0.0, 0.12);
    else deplacerVue(0.0, canvas.height * view.pixelSize * 0.18);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (fractaleActiveEst3D()) orbiterVue3D(-0.12, 0.0);
    else deplacerVue(-canvas.width * view.pixelSize * 0.18, 0.0);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    if (fractaleActiveEst3D()) orbiterVue3D(0.12, 0.0);
    else deplacerVue(canvas.width * view.pixelSize * 0.18, 0.0);
  } else if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
    event.preventDefault();
    zoomerCentre(1.5);
  } else if (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract") {
    event.preventDefault();
    zoomerCentre(1 / 1.5);
  } else if (fractaleActiveEst3D() && (event.key === "a" || event.key === "A")) {
    event.preventDefault();
    deplacerVue3D(18, 0);
  } else if (fractaleActiveEst3D() && (event.key === "d" || event.key === "D")) {
    event.preventDefault();
    deplacerVue3D(-18, 0);
  } else if (fractaleActiveEst3D() && (event.key === "w" || event.key === "W")) {
    event.preventDefault();
    deplacerVue3D(0, 18);
  } else if (fractaleActiveEst3D() && (event.key === "s" || event.key === "S")) {
    event.preventDefault();
    deplacerVue3D(0, -18);
  } else if (event.key === "[" || event.key === "BracketLeft") {
    if (!fractaleActiveEst3D()) {
      event.preventDefault();
      view.rotation -= Math.PI / 36;
      render();
      mettreAJourHash(view, params);
    }
  } else if (event.key === "]" || event.key === "BracketRight") {
    if (!fractaleActiveEst3D()) {
      event.preventDefault();
      view.rotation += Math.PI / 36;
      render();
      mettreAJourHash(view, params);
    }
  } else if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    resetView();
  } else if (event.key === "e" || event.key === "E") {
    event.preventDefault();
    exportPanel.classList.toggle("hidden");
  } else if (event.key === "b" || event.key === "B") {
    event.preventDefault();
    ajouterSignet();
  } else if (event.key === "Escape") {
    exportPanel.classList.add("hidden");
    if (bookmarkPanel) bookmarkPanel.classList.add("hidden");
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
      if (!fractaleActiveEst3D()) {
        view.pixelSize = view.pixelSize * (canvas.width / Math.max(newW, 1));
      }
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

/**
 * Associe chaque fractale au module source (.multi / .py) qui la contient.
 * Utilisé pour l'affichage contextuel dans la barre latérale.
 */
const FRACTAL_SOURCE_MAP = {
  mandelbrot: "fractales_escape",
  mandelbrot_classe: "fractales_classes_compat",
  julia: "fractales_escape",
  burning_ship: "fractales_escape",
  tricorn: "fractales_escape",
  multibrot: "fractales_escape",
  celtic: "fractales_variantes",
  buffalo: "fractales_variantes",
  perpendicular_burning_ship: "fractales_variantes",
  heart: "fractales_variantes",
  perpendicular_mandelbrot: "fractales_variantes",
  perpendicular_celtic: "fractales_variantes",
  duck: "fractales_variantes",
  buddhabrot: "fractales_escape",
  newton: "fractales_dynamique",
  phoenix: "fractales_dynamique",
  lyapunov: "fractales_dynamique",
  lyapunov_multisequence: "fractales_dynamique",
  bassin_newton_generalise: "fractales_dynamique",
  orbitale_de_nova: "fractales_dynamique",
  collatz_complexe: "fractales_dynamique",
  attracteur_de_clifford: "fractales_dynamique",
  attracteur_de_peter_de_jong: "fractales_dynamique",
  attracteur_ikeda: "fractales_dynamique",
  attracteur_de_henon: "fractales_dynamique",
  lorenz_attractor: "fractales_dynamique",
  rossler_attractor: "fractales_dynamique",
  aizawa_attractor: "fractales_dynamique",
  sprott_attractor: "fractales_dynamique",
  feigenbaum_tree: "fractales_dynamique",
  barnsley: "fractales_ifs",
  sierpinski: "fractales_ifs",
  tapis_sierpinski: "fractales_ifs",
  menger_sponge: "fractales_ifs",
  mandelbulb: "fractales_ifs",
  tetraedre_sierpinski: "fractales_ifs",
  julia_quaternion: "fractales_ifs",
  mandelbox: "fractales_ifs",
  vicsek_fractal: "fractales_ifs",
  lichtenberg_figures: "fractales_ifs",
  koch: "fractales_lsystem",
  dragon_heighway: "fractales_lsystem",
  courbe_levy_c: "fractales_lsystem",
  gosper_curve: "fractales_lsystem",
  cantor_set: "fractales_lsystem",
  triangle_de_cercles_recursifs: "fractales_lsystem",
  apollonian_gasket: "fractales_lsystem",
  t_square_fractal: "fractales_lsystem",
  h_fractal: "fractales_lsystem",
  hilbert_curve: "fractales_lsystem",
  peano_curve: "fractales_lsystem",
  arbre_pythagore: "fractales_lsystem",
  magnet1: "fractales_magnetiques",
  magnet2: "fractales_magnetiques",
  magnet3: "fractales_magnetiques",
  lambda_fractale: "fractales_magnetiques",
  lambda_cubique: "fractales_magnetiques",
  magnet_cosinus: "fractales_magnetiques",
  magnet_sinus: "fractales_magnetiques",
  nova_magnetique: "fractales_magnetiques",
  burning_julia: "fractales_escape",
  biomorphe: "fractales_escape",
  duffing_attractor: "fractales_dynamique",
  mandelbrot_lisse: "fractales_lisse",
  julia_lisse: "fractales_lisse",
  burning_ship_lisse: "fractales_lisse",
  tricorn_lisse: "fractales_lisse",
  mandelbrot_piege_cercle: "fractales_orbitrap",
  mandelbrot_piege_croix: "fractales_orbitrap",
  mandelbrot_piege_ligne: "fractales_orbitrap",
  julia_piege_cercle: "fractales_orbitrap",
};
const { loadSources, loadBenchmark } = initialiserPanneauSource({
  fractalSourceMap: FRACTAL_SOURCE_MAP,
  tabFrench,
  tabPython,
  codeFrench,
  codePython,
  panelFrench,
  panelPython,
  badgeDiv,
  badgeLoading,
});

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

function mettreAJourAideInteraction() {
  if (!zoomHint) return;
  if (fractaleActiveEst3D()) {
    zoomHint.textContent = "Glisser : orbite · Maj+glisser ou clic droit : translation · Molette : zoom · Double-clic : réinitialiser";
  } else if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    zoomHint.textContent = "Glisser : déplacement · Toucher : zoom ×2 · Double toucher : dézoom · Pincer : zoom libre";
  } else {
    zoomHint.textContent = "Glisser : déplacement · Clic : zoom ×2 · Double-clic : dézoom · Molette : zoom libre · [ ] : rotation";
  }
}

// ============================================================
// JULIA C SLIDERS
// ============================================================

function mettreAJourOptionsSpecifiques() {
  const needsC = ["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"].includes(params.fractal);
  const needsPower = params.fractal === "multibrot";
  if (juliaCControls) juliaCControls.classList.toggle("hidden", !needsC);
  if (multibrotPowerGroup) multibrotPowerGroup.classList.toggle("hidden", !needsPower);
  const labels = [];
  if (needsC) labels.push("Julia c");
  if (needsPower) labels.push("Puissance");
  definirVisibiliteOptionsSpecifiques({ labels });
  const needsSVG = LINE_FRACTALS.has(params.fractal);
  if (btnExportSvg) btnExportSvg.classList.toggle("hidden", !needsSVG);
}

if (juliaCReSlider) {
  juliaCReSlider.addEventListener("input", () => {
    params.juliaCre = parseFloat(juliaCReSlider.value);
    if (juliaCReValue) juliaCReValue.textContent = params.juliaCre.toFixed(3);
    if (["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"].includes(params.fractal)) {
      render();
      mettreAJourHash(view, params);
    }
  });
}

if (juliaCImSlider) {
  juliaCImSlider.addEventListener("input", () => {
    params.juliaCim = parseFloat(juliaCImSlider.value);
    if (juliaCImValue) juliaCImValue.textContent = params.juliaCim.toFixed(3);
    if (["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"].includes(params.fractal)) {
      render();
      mettreAJourHash(view, params);
    }
  });
}

async function appliquerSignet(signet) {
  params.fractal = signet.fractal;
  syncSelectors(signet.fractal);
  if (signet.vue3d) {
    definirVue3DActive(signet.fractal, signet.vue3d);
  } else {
    const cible = {
      centerX: signet.centerX,
      centerY: signet.centerY,
      pixelSize: signet.pixelSize,
      rotation: signet.rotation ?? 0,
    };
    animerVersVue(cible, {
      view,
      wasmNav: wasmExportFunctions,
      render,
      onComplete: () => mettreAJourHash(view, params),
    });
  }
  params.maxIter = signet.maxIter;
  iterSlider.value = signet.maxIter;
  iterValue.textContent = signet.maxIter;
  if (signet.juliaCre !== undefined) {
    params.juliaCre = signet.juliaCre;
  }
  if (signet.juliaCim !== undefined) {
    params.juliaCim = signet.juliaCim;
  }
  synchroniserControlesJulia();
  if (signet.multibrotPower !== undefined) {
    params.multibrotPower = signet.multibrotPower;
    if (multibrotPower) multibrotPower.value = String(signet.multibrotPower);
  }
  params.coloringMode = signet.coloringMode ?? params.coloringMode;
  params.palettePhase = signet.palettePhase ?? params.palettePhase;
  params.paletteContours = signet.paletteContours ?? params.paletteContours;
  params.deepZoomAutoIterations = signet.deepZoomAutoIterations ?? params.deepZoomAutoIterations;
  params.deepZoomQuality = signet.deepZoomQuality ?? params.deepZoomQuality;
  params.studio3dMaterial = signet.studio3dMaterial ?? params.studio3dMaterial;
  params.studio3dFog = signet.studio3dFog ?? params.studio3dFog;
  params.weatherOverlays = signet.weatherOverlays ?? params.weatherOverlays;
  params.lsystemProposalActive = signet.lsystemProposalActive ?? params.lsystemProposalActive;
  params.lsystemAxiom = signet.lsystemAxiom ?? params.lsystemAxiom;
  params.lsystemRules = signet.lsystemRules ?? params.lsystemRules;
  params.lsystemAngle = signet.lsystemAngle ?? params.lsystemAngle;
  params.lsystemGenerations = signet.lsystemGenerations ?? params.lsystemGenerations;
  params.formulePropositionActive = signet.formulePropositionActive ?? params.formulePropositionActive;
  if (signet.formuleIteration !== undefined) params.formuleIteration = signet.formuleIteration;
  if (signet.formuleEscapeRadius !== undefined) params.formuleEscapeRadius = signet.formuleEscapeRadius;
  if (signet.formuleMode !== undefined) params.formuleMode = signet.formuleMode;
  if (params.formulePropositionActive) { const c = compilerFormule(params.formuleIteration); formuleFnCompilee = c.fn ?? null; if (!c.fn) params.formulePropositionActive = false; }
  params.palette = signet.palette;
  params.paletteBackground = signet.paletteBackground;
  params.paletteInterior = signet.paletteInterior;
  params.paletteStops = [...(signet.paletteStops || params.paletteStops)];
  synchroniserControlePalette();
  explorationModes?.syncFromParams();
  mettreAJourOptionsSpecifiques();
  await loadSources(params.fractal);
  render();
}

const { ajouterSignet, rendreListeSignets } = initialiserSignets({
  button: btnBookmark,
  panel: bookmarkPanel,
  closeButton: btnCloseBookmarks,
  list: bookmarkList,
  capturerVue: capturerVueCourante,
  appliquerSignet,
  updateStatusBar,
});

const { mettreAJourEtatVideo } = initialiserExports({
  buttons: {
    btnOpenExport,
    btnCloseExport,
    btnExportCurrent,
    btnExportImage,
    btnCaptureStart,
    btnCaptureEnd,
    btnExportVideo,
    btnExportSvg,
  },
  elements: {
    exportPanel,
    exportImageWidth,
    exportImageHeight,
    exportVideoWidth,
    exportVideoHeight,
    exportVideoDuration,
    exportVideoFps,
    exportVideoState,
  },
  dependencies: {
    LINE_FRACTALS,
    obtenirCanvasActif,
    getViewState: () => view,
    getParams: () => params,
    fractaleActiveEst3D,
    obtenirVue3DActive,
    getPaletteBackground,
    getColor,
    dessinerFractaleLineaire,
    telechargerBlob,
    formaterNomExport,
    updateStatusBar,
    rendreDansCanvas,
    clonerParamsExport,
    ajusterIterationsExport,
    interpolerVue3D,
    interpolerLineaire,
    interpolerLogarithmique,
    attendre,
    capturerVueCourante,
    definirVisibiliteEditeurPalette,
  },
});

explorationModes = initialiserExploration({
  elements: {
    dock: explorationDock,
    panel: explorationPanel,
    closeButton: btnCloseExploration,
    title: explorationTitle,
    subtitle: explorationSubtitle,
    views: explorationViews,
    overlayCanvas,
    parameterCanvas: parameterMapCanvas,
    parameterReadout: parameterMapReadout,
    lsystemCanvas: lsystemProposalCanvas,
    formuleCanvas: formuleProposalCanvas,
  },
  dependencies: {
    getView: () => view,
    getParams: () => params,
    getWasmFunctions: () => wasmFunctions,
    getActiveCanvas: obtenirCanvasActif,
    getPaletteColor: getColor,
    setJuliaC: (re, im) => {
      params.juliaCre = re;
      params.juliaCim = im;
      synchroniserControlesJulia();
    },
    setMaxIter: (maxIter) => {
      params.maxIter = Math.max(64, Math.min(4096, Math.round(maxIter)));
      iterSlider.value = String(Math.min(1024, params.maxIter));
      iterValue.textContent = String(params.maxIter);
      if (iterSliderCompact) iterSliderCompact.value = String(Math.min(1024, params.maxIter));
      if (iterValueCompact) iterValueCompact.textContent = String(params.maxIter);
      mettreAJourResumeControles();
    },
    setParamsPatch: (patch) => Object.assign(params, patch),
    render,
    updateHash: () => mettreAJourHash(view, params),
    updateStatusBar,
    captureView: capturerVueCourante,
    applyCapturedView: appliquerSignet,
    is3D: fractaleActiveEst3D,
    set3DView: (patch) => {
      definirVue3DActive(params.fractal, { ...(obtenirVue3DActive() ?? {}), ...patch });
    },
    get3DView: obtenirVue3DActive,
    applyLSystemProposal: appliquerPropositionLSysteme,
    clearLSystemProposal: effacerPropositionLSysteme,
    applyFormuleProposal: appliquerFormuleProposition,
    clearFormuleProposal: effacerFormuleProposition,
    compilerFormule,
    lineFractals: LINE_FRACTALS,
  },
});

// ============================================================
// INITIALISATION
// ============================================================

async function init() {
  resizeCanvas();
  initialiserMoteur3D({
    canvas: canvas3d,
    hud: nav3dHud,
    coords: coordsDisplay,
    statut: updateStatusBar,
    obtenirPalette: () => getPaletteComplete(params),
    obtenirMaxIter: () => params.maxIter,
  });

  // Lire l'état depuis le hash URL (lien partagé)
  const etatHash = decoderEtat(location.hash);
  if (etatHash) {
    params.fractal = etatHash.fractal;
    if (etatHash.maxIter !== undefined) params.maxIter = etatHash.maxIter;
    if (etatHash.palette) params.palette = etatHash.palette;
    if (etatHash.multibrotPower !== undefined) params.multibrotPower = etatHash.multibrotPower;
    if (etatHash.juliaCre !== undefined) params.juliaCre = etatHash.juliaCre;
    if (etatHash.juliaCim !== undefined) params.juliaCim = etatHash.juliaCim;
    params.coloringMode = etatHash.coloringMode ?? params.coloringMode;
    params.palettePhase = etatHash.palettePhase ?? params.palettePhase;
    params.paletteContours = etatHash.paletteContours ?? params.paletteContours;
    params.deepZoomAutoIterations = etatHash.deepZoomAutoIterations ?? params.deepZoomAutoIterations;
    params.deepZoomQuality = etatHash.deepZoomQuality ?? params.deepZoomQuality;
    params.studio3dMaterial = etatHash.studio3dMaterial ?? params.studio3dMaterial;
    params.studio3dFog = etatHash.studio3dFog ?? params.studio3dFog;
    params.weatherOverlays = etatHash.weatherOverlays ?? params.weatherOverlays;
    params.lsystemProposalActive = etatHash.lsystemProposalActive ?? params.lsystemProposalActive;
    params.lsystemAxiom = etatHash.lsystemAxiom ?? params.lsystemAxiom;
    params.lsystemRules = etatHash.lsystemRules ?? params.lsystemRules;
    params.lsystemAngle = etatHash.lsystemAngle ?? params.lsystemAngle;
    params.lsystemGenerations = etatHash.lsystemGenerations ?? params.lsystemGenerations;
    if (params.lsystemProposalActive && !LINE_FRACTALS.has(params.fractal)) params.fractal = "koch";
    params.formulePropositionActive = etatHash.formulePropositionActive ?? params.formulePropositionActive;
    if (etatHash.formuleIteration !== undefined) params.formuleIteration = etatHash.formuleIteration;
    if (etatHash.formuleEscapeRadius !== undefined) params.formuleEscapeRadius = etatHash.formuleEscapeRadius;
    if (etatHash.formuleMode !== undefined) params.formuleMode = etatHash.formuleMode;
    if (params.formulePropositionActive) { const c = compilerFormule(params.formuleIteration); formuleFnCompilee = c.fn ?? null; if (!c.fn) params.formulePropositionActive = false; }
  }

  syncSelectors(params.fractal);
  synchroniserControlesJulia();
  synchroniserControlePalette();
  mettreAJourEtatVideo();
  rendreListeSignets();
  mettreAJourOptionsSpecifiques();
  chargerEtatControles();
  explorationModes?.syncFromParams();

  // Vue initiale : preset de la fractale (point de départ de l'animation)
  const preset = VIEW_PRESETS[params.fractal] ?? VIEW_PRESETS.mandelbrot;
  view.centerX = preset.centerX;
  view.centerY = preset.centerY;
  view.pixelSize = preset.span / Math.max(canvas.width, 1);
  view.rotation = 0.0;

  // Lancer un premier rendu JS pendant le chargement WASM
  updateStatusBar("Initialisation…");
  render();

  // Charger WASM (peut prendre 100–500 ms)
  await loadWasm();

  // Re-rendre avec WASM si disponible, puis animer vers la vue du lien partagé
  render();
  if (etatHash && etatHash.centerX !== undefined && etatHash.pixelSize !== undefined) {
    animerVersVue(
      { centerX: etatHash.centerX, centerY: etatHash.centerY, pixelSize: etatHash.pixelSize, rotation: etatHash.rotation ?? 0 },
      { view, wasmNav: wasmExportFunctions, render, onComplete: () => mettreAJourHash(view, params) }
    );
  }

  // Charger sources et benchmark en parallèle
  await Promise.all([loadSources(params.fractal), loadBenchmark()]);

  initialiserPartage({ getView: () => view, getParams: () => params, updateStatusBar });

  mettreAJourAideInteraction();

  showZoomHint();
}

// Démarrer
init().catch(console.error);
