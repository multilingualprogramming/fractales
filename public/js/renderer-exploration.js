"use strict";

import {
  decrireReglesLSysteme,
  dessinerPropositionLSysteme,
  genererPropositionLSysteme,
} from "./renderer-lsystem.js?v=20260520-formule-preview";
import {
  analyserFormule,
  compilerFormule,
  dessinerMiniApercuFormule,
} from "./renderer-formule.js?v=20260520-formule-mini-preview";
import {
  jeuDuChaosIFS,
  arreterJeuDuChaos,
  decrireTableauIFS,
  fractaleDePresetIFS,
  TABLEAU_IFS_BARNSLEY,
} from "./renderer-ifs.js?v=app";

const TITRES_MODES = {
  parametres: ["Carte des paramètres", "Explorer le plan du paramètre c"],
  temps: ["Carnet de voyage", "Composer une trajectoire de vues"],
  palette: ["Physique de palette", "Nouveaux modes de coloration"],
  abysses: ["Mode Abysses", "Zoom profond et précision"],
  studio3d: ["Studio 3D", "Caméra, matière et profondeur"],
  lsysteme: ["Atelier L-système", "Générations, préréglages et grammaires locales"],
  formule: ["Atelier formule", "Définir votre propre fonction d'itération complexe"],
  meteo: ["Météo mathématique", "Surcouches d'analyse visuelle"],
  transforms: ["Transformations du plan", "Remappage du plan complexe avant itération"],
  ifs: ["Atelier IFS", "Jeu du chaos — systèmes de fonctions itérées affines"],
};

const PARAMETRES_FORMULE_DEFAUT = {
  a: { nom: "a", min: -4, max: 4, pas: 0.01, defaut: 0 },
  b: { nom: "b", min: -4, max: 4, pas: 0.01, defaut: 0 },
};

function definirParametresFormule(a = {}, b = {}) {
  return {
    a: { ...PARAMETRES_FORMULE_DEFAUT.a, ...a },
    b: { ...PARAMETRES_FORMULE_DEFAUT.b, ...b },
  };
}

const FORMULE_PRESETS = {
  mandelbrot: { formule: "z*z+c",              rayon: 2,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "a inutilisé" }, { nom: "b inutilisé" }) },
  julia:      { formule: "z*z+c",              rayon: 2,  mode: "julia",      parametres: definirParametresFormule({ nom: "a inutilisé" }, { nom: "b inutilisé" }) },
  cubique:    { formule: "z^3+c",              rayon: 2,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "a inutilisé" }, { nom: "b inutilisé" }) },
  sinus:      { formule: "sin(z)+c",           rayon: 2,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "a inutilisé" }, { nom: "b inutilisé" }) },
  cosinus:    { formule: "cos(z)+c",           rayon: 4,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "a inutilisé" }, { nom: "b inutilisé" }) },
  biomorphe:  { formule: "z^2+z/c",            rayon: 4,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "a inutilisé" }, { nom: "b inutilisé" }) },
  tricorne:   { formule: "conj(z)^2+c",        rayon: 2,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "a inutilisé" }, { nom: "b inutilisé" }) },
  perturbe:   { formule: "z^2+c+a*sin(z)",     rayon: 3,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "amplitude sinus", min: -1.5, max: 1.5, defaut: 0.25 }, { nom: "b inutilisé" }) },
  rationnel:  { formule: "z^2+c+a/(z^2+b)",    rayon: 8,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "force rationnelle", min: -2, max: 2, defaut: 0.2 }, { nom: "décalage du pôle", min: -2, max: 2, defaut: 0.4 }) },
  exponentiel:{ formule: "exp(z)+c-a",         rayon: 12, mode: "mandelbrot", parametres: definirParametresFormule({ nom: "translation réelle", min: -3, max: 3, defaut: 1 }, { nom: "b inutilisé" }) },
  tangente:   { formule: "tan(z)+c*a",         rayon: 8,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "gain de c", min: -2, max: 2, defaut: 0.6 }, { nom: "b inutilisé" }) },
  norme:      { formule: "z^2+c-a*norm(z)",    rayon: 6,  mode: "mandelbrot", parametres: definirParametresFormule({ nom: "frein radial", min: -0.5, max: 0.5, pas: 0.005, defaut: 0.08 }, { nom: "b inutilisé" }) },
};

const STORAGE_FORMULE_SAVES = "fractales_formule_sauvegardes";

function lireSauvegardeFormule() {
  try { const v = JSON.parse(localStorage.getItem(STORAGE_FORMULE_SAVES) || "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
}

function ecrireSauvegardeFormule(items) {
  try { localStorage.setItem(STORAGE_FORMULE_SAVES, JSON.stringify(items.slice(0, 20))); } catch {}
}

function fusionnerSauvegarde(items, item) {
  const nom = String(item.nom || "").trim();
  return [
    { ...item, nom },
    ...items.filter((saved) => String(saved.nom || "").trim().toLowerCase() !== nom.toLowerCase()),
  ].slice(0, 20);
}

const JULIA_FRACTALS = new Set(["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"]);
const STORAGE_JOURNEYS = "fractales_carnet_voyage";
const STORAGE_LSYSTEM_SAVES = "fractales_lsystem_sauvegardes";

const LSYSTEM_PRESETS = {
  koch:         { axiome: "F--F--F",  regles: "F=F+F--F+F",                                          angle: 60,  gen: 4 },
  dragon:       { axiome: "FX",       regles: "X=X+YF+\nY=-FX-Y",                                    angle: 90,  gen: 11 },
  levy:         { axiome: "F",        regles: "F=+F--F+",                                             angle: 45,  gen: 10 },
  gosper:       { axiome: "F",        regles: "F=F-G--G+F++FF+G-\nG=+F-GG--G-F++F+G",               angle: 60,  gen: 4 },
  sierpinski:   { axiome: "F-G-G",    regles: "F=F-G+F+G-F\nG=GG",                                   angle: 120, gen: 6 },
  hilbert:      { axiome: "L",        regles: "L=+RF-LFL-FR+\nR=-LF+RFR+FL-",                        angle: 90,  gen: 5 },
  peano:        { axiome: "X",        regles: "X=XFYFX+F+YFXFY-F-XFYFX\nY=YFXFY-F-XFYFX+F+YFXFY", angle: 90,  gen: 3 },
  arbre_simple: { axiome: "F",        regles: "F=F[+F]F[-F]F",                                        angle: 26,  gen: 5 },
  arbre_touffu: { axiome: "X",        regles: "X=F-[[X]+X]+F[+FX]-X\nF=FF",                          angle: 25,  gen: 6 },
  plante_stochastique: { axiome: "X", regles: "X=0.55:F-[[X]+X]+F[+FX]-X | 0.45:F[+X]-X\nF=0.65:FF | 0.35:F", angle: 24, gen: 6, graine: 13 },
  corail_stochastique: { axiome: "F", regles: "F=0.50:F[+F]F[-F]F | 0.30:FF | 0.20:F[+F]", angle: 22, gen: 5, graine: 34 },
  flocon_carre: { axiome: "F+F+F+F",  regles: "F=F-F+F+FF-F-F+F",                                   angle: 90,  gen: 4 },
  cristal:      { axiome: "F+F+F+F",  regles: "F=FF+F++F+F",                                         angle: 90,  gen: 4 },
  pentigree:    { axiome: "F-F-F-F-F", regles: "F=F-F++F+F-F-F",                                     angle: 72,  gen: 4 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNombre(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.000";
}

function canvasToComplexLocal(px, py, canvas, view) {
  const dx = (px - canvas.width / 2) * view.pixelSize;
  const dy = (py - canvas.height / 2) * view.pixelSize;
  const cr = Math.cos(view.rotation ?? 0);
  const sr = Math.sin(view.rotation ?? 0);
  return {
    re: view.centerX + dx * cr - dy * sr,
    im: view.centerY + dx * sr + dy * cr,
  };
}

function lireCarnet() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_JOURNEYS) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function ecrireCarnet(items) {
  try {
    localStorage.setItem(STORAGE_JOURNEYS, JSON.stringify(items.slice(0, 24)));
  } catch {}
}

const ORBIT_POINT_FRACTALS = new Set([
  "barnsley", "sierpinski", "tapis_sierpinski", "menger_sponge", "mandelbulb",
  "tetraedre_sierpinski", "julia_quaternion", "mandelbox", "vicsek_fractal",
  "lichtenberg_figures", "attracteur_de_clifford", "attracteur_de_peter_de_jong",
  "attracteur_ikeda", "attracteur_de_henon", "lorenz_attractor", "rossler_attractor",
  "aizawa_attractor", "sprott_attractor", "feigenbaum_tree", "duffing_attractor", "buddhabrot",
]);
const ORBIT_LINE_FRACTALS = new Set([
  "koch", "dragon_heighway", "courbe_levy_c", "gosper_curve", "cantor_set",
  "triangle_de_cercles_recursifs", "apollonian_gasket", "t_square_fractal",
  "h_fractal", "hilbert_curve", "peano_curve", "arbre_pythagore",
]);

function calculerOrbite(fractal, point, params) {
  const max = Math.min(320, Math.max(32, params.maxIter | 0));
  const points = [];

  if (ORBIT_POINT_FRACTALS.has(fractal) || ORBIT_LINE_FRACTALS.has(fractal)) {
    return { points, escaped: false, unsupported: true };
  }

  if (fractal === "newton" || fractal === "bassin_newton_generalise") {
    let x = point.re, y = point.im;
    for (let i = 0; i < max; i++) {
      points.push({ re: x, im: y });
      const x2 = x * x - y * y, y2 = 2 * x * y;
      const x3 = x2 * x - y2 * y, y3 = x2 * y + y2 * x;
      const numRe = 2 * x3 + 1, numIm = 2 * y3;
      const denRe = 3 * x2, denIm = 3 * y2;
      const den2 = denRe * denRe + denIm * denIm;
      if (den2 < 1e-14) break;
      x = (numRe * denRe + numIm * denIm) / den2;
      y = (numIm * denRe - numRe * denIm) / den2;
      if (!isFinite(x + y)) { return { points, escaped: true }; }
      const roots = [[1, 0], [-0.5, 0.8660254], [-0.5, -0.8660254]];
      if (roots.some(([rx, ry]) => (x - rx) * (x - rx) + (y - ry) * (y - ry) < 1e-8)) break;
    }
    return { points, escaped: false };
  }

  if (fractal === "phoenix") {
    let x = point.re, y = point.im, px = 0, py = 0;
    const cx = params.juliaCre ?? -0.5, cy = params.juliaCim ?? 0.0;
    for (let i = 0; i < max; i++) {
      points.push({ re: x, im: y });
      const nx = x * x - y * y + cx + 0.5667 * px;
      const ny = 2 * x * y + cy + 0.5667 * py;
      px = x; py = y; x = nx; y = ny;
      if (x * x + y * y > 16) return { points, escaped: true };
    }
    return { points, escaped: false };
  }

  let x = JULIA_FRACTALS.has(fractal) ? point.re : 0.0;
  let y = JULIA_FRACTALS.has(fractal) ? point.im : 0.0;
  const cx = JULIA_FRACTALS.has(fractal) ? params.juliaCre : point.re;
  const cy = JULIA_FRACTALS.has(fractal) ? params.juliaCim : point.im;

  const isBurning = fractal === "burning_ship" || fractal === "burning_julia" || fractal === "burning_ship_lisse";
  const isBuffalo = fractal === "buffalo";
  const isCeltic = fractal === "celtic" || fractal === "perpendicular_celtic";
  const isHeart = fractal === "heart";
  const isTricorn = fractal === "tricorn" || fractal === "tricorn_lisse";
  const isDuck = fractal === "duck";
  const isPerpY = fractal === "perpendicular_burning_ship" || fractal === "perpendicular_mandelbrot" || fractal === "perpendicular_celtic";

  for (let i = 0; i < max; i++) {
    points.push({ re: x, im: y });
    const ax = (isBurning || isBuffalo) ? Math.abs(x) : x;
    const ay = isBurning ? Math.abs(y) : y;
    let nx, ny;
    if (isCeltic) {
      nx = Math.abs(ax * ax - ay * ay) + cx;
      ny = 2 * ax * ay + cy;
    } else if (isHeart) {
      nx = ax * ax - ay * ay + cx;
      ny = Math.abs(2 * ax * ay) + cy;
    } else if (isDuck) {
      nx = ax * ax - ay * ay + Math.abs(cx);
      ny = 2 * ax * ay + cy;
    } else {
      nx = ax * ax - ay * ay + cx;
      ny = 2 * ax * ay + cy;
    }
    x = nx;
    y = isTricorn ? -ny : (isPerpY ? Math.abs(ny) : ny);
    if (x * x + y * y > 16) return { points, escaped: true };
  }
  return { points, escaped: false };
}

function coordToPixel(point, canvas, view) {
  const dx = point.re - view.centerX;
  const dy = point.im - view.centerY;
  const cr = Math.cos(-(view.rotation ?? 0));
  const sr = Math.sin(-(view.rotation ?? 0));
  return {
    x: canvas.width / 2 + (dx * cr - dy * sr) / view.pixelSize,
    y: canvas.height / 2 + (dx * sr + dy * cr) / view.pixelSize,
  };
}

function lirePropositionLSysteme() {
  return {
    axiom: document.getElementById("lsystem-axiom-input")?.value || "F",
    rules: document.getElementById("lsystem-rules-input")?.value || "F=F+F--F+F",
    angle: parseFloat(document.getElementById("lsystem-angle-input")?.value || "60"),
    generations: parseInt(document.getElementById("lsystem-generation-slider")?.value || "4", 10),
    seed: document.getElementById("lsystem-seed-input")?.value || "1",
    strokeWidth: parseFloat(document.getElementById("lsystem-stroke-width-slider")?.value || "1.35"),
  };
}

function lireSauvegardeLSystem() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_LSYSTEM_SAVES) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function ecrireSauvegardeLSystem(items) {
  try { localStorage.setItem(STORAGE_LSYSTEM_SAVES, JSON.stringify(items.slice(0, 20))); } catch {}
}

export function initialiserExploration({
  elements,
  dependencies,
}) {
  const {
    dock,
    panel,
    closeButton,
    title,
    subtitle,
    views,
    overlayCanvas,
    parameterCanvas,
    parameterReadout,
    lsystemCanvas,
    formuleCanvas,
    ifsCanvas,
  } = elements;

  const {
    getView,
    getParams,
    getWasmFunctions,
    getWasmExportFunctions,
    getActiveCanvas,
    getPaletteColor,
    setJuliaC,
    setMaxIter,
    setParamsPatch,
    render,
    updateHash,
    updateStatusBar,
    captureView,
    applyCapturedView,
    is3D,
    set3DView,
    get3DView,
    applyLSystemProposal,
    clearLSystemProposal,
    applyFormuleProposal,
    clearFormuleProposal,
    naviguerVersFractale,
    lineFractals,
  } = dependencies;

  let activeMode = null;
  let capturedOrbit = [];
  let orbitEscaped = false;
  let orbitRevealIndex = 0;
  let orbitAnimId = null;
  let captureOrbitPending = false;

  function resizeOverlay() {
    const activeCanvas = getActiveCanvas();
    if (!activeCanvas || !overlayCanvas) return;
    if (overlayCanvas.width !== activeCanvas.width || overlayCanvas.height !== activeCanvas.height) {
      overlayCanvas.width = activeCanvas.width;
      overlayCanvas.height = activeCanvas.height;
    }
  }

  function activeWeather() {
    return new Set((getParams().weatherOverlays || "").split(",").filter(Boolean));
  }

  function drawWeather() {
    if (!overlayCanvas) return;
    resizeOverlay();
    const ctx = overlayCanvas.getContext("2d");
    const w = overlayCanvas.width;
    const h = overlayCanvas.height;
    ctx.clearRect(0, 0, w, h);
    if (is3D()) return;
    const overlays = activeWeather();
    const view = getView();
    if (overlays.has("grille")) {
      ctx.strokeStyle = "rgba(0, 212, 255, 0.16)";
      ctx.lineWidth = 1;
      const spacing = Math.max(28, Math.min(120, Math.pow(10, Math.floor(Math.log10(view.pixelSize * w))) / view.pixelSize));
      for (let x = ((w / 2 - view.centerX / view.pixelSize) % spacing + spacing) % spacing; x < w; x += spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = ((h / 2 + view.centerY / view.pixelSize) % spacing + spacing) % spacing; y < h; y += spacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      const origin = coordToPixel({ re: 0, im: 0 }, overlayCanvas, view);
      ctx.strokeStyle = "rgba(0, 255, 159, 0.45)";
      ctx.beginPath(); ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(w, origin.y); ctx.stroke();
    }
    if (overlays.has("contours")) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        const r = Math.min(w, h) * i / 22;
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, r * 1.35, r, view.rotation ?? 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (overlays.has("orbite") && capturedOrbit.length > 1) {
      const n = capturedOrbit.length;
      const visible = capturedOrbit.slice(0, Math.max(1, orbitRevealIndex));
      for (let i = 1; i < visible.length; i++) {
        const t = i / Math.max(1, n - 1);
        let r, g, b;
        if (t < 0.5) { r = Math.round(510 * t); g = 230; b = 0; }
        else { r = 230; g = Math.round(230 * (1 - (t - 0.5) * 2)); b = 0; }
        ctx.strokeStyle = `rgba(${r},${g},${b},0.88)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const p0 = coordToPixel(visible[i - 1], overlayCanvas, view);
        const p1 = coordToPixel(visible[i], overlayCanvas, view);
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      for (let i = 1; i < visible.length - 1; i++) {
        const p = coordToPixel(visible[i], overlayCanvas, view);
        ctx.fillStyle = "rgba(255, 255, 200, 0.55)";
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      }
      const first = coordToPixel(capturedOrbit[0], overlayCanvas, view);
      ctx.fillStyle = "#00ff9f";
      ctx.beginPath(); ctx.arc(first.x, first.y, 4, 0, Math.PI * 2); ctx.fill();
      if (orbitRevealIndex >= n && visible.length > 1) {
        const last = coordToPixel(capturedOrbit[n - 1], overlayCanvas, view);
        ctx.fillStyle = orbitEscaped ? "#ff4444" : "#4488ff";
        ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawParameterMap() {
    if (!parameterCanvas) return;
    const ctx = parameterCanvas.getContext("2d");
    const w = parameterCanvas.width;
    const h = parameterCanvas.height;
    const wasm = getWasmFunctions();
    const fn = wasm?.julia;
    if (!fn) {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(2, 4, 10, 0.96)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(220, 234, 255, 0.74)";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Carte disponible après chargement WASM", w / 2, h / 2);
      return;
    }
    const image = ctx.createImageData(w, h);
    const params = getParams();
    const max = 72;
    for (let y = 0; y < h; y++) {
      const ci = 1.4 - y / Math.max(1, h - 1) * 2.8;
      for (let x = 0; x < w; x++) {
        const cr = -2.0 + x / Math.max(1, w - 1) * 4.0;
        const iter = fn(0, 0, cr, ci, max);
        const color = getPaletteColor(iter, max, params);
        const index = (y * w + x) * 4;
        image.data[index] = color[0];
        image.data[index + 1] = color[1];
        image.data[index + 2] = color[2];
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    const markerX = (params.juliaCre + 2.0) / 4.0 * w;
    const markerY = (1.4 - params.juliaCim) / 2.8 * h;
    ctx.strokeStyle = "#fff4b4";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
    ctx.stroke();
    if (parameterReadout) {
      parameterReadout.textContent = `c = ${formatNombre(params.juliaCre, 3)} ${params.juliaCim >= 0 ? "+" : "-"} ${formatNombre(Math.abs(params.juliaCim), 3)}i`;
    }
  }

  function setMode(mode) {
    if (activeMode === "ifs") arreterJeuDuChaos();
    activeMode = activeMode === mode && !panel.classList.contains("hidden") ? null : mode;
    panel.classList.toggle("hidden", !activeMode);
    dock.querySelectorAll(".exploration-mode-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === activeMode);
    });
    views.forEach((view) => view.classList.toggle("hidden", view.dataset.view !== activeMode));
    if (activeMode) {
      const [modeTitle, modeSubtitle] = TITRES_MODES[activeMode] ?? TITRES_MODES.parametres;
      title.textContent = modeTitle;
      subtitle.textContent = modeSubtitle;
      if (activeMode === "parametres") drawParameterMap();
      if (activeMode === "lsysteme") { updateLSystemProposal(); updateLSystemSaveList(); }
      if (activeMode === "formule") { updateFormuleProposal(); updateFormuleSaveList(); }
      if (activeMode === "transforms") updateTransformReadout();
      if (activeMode === "ifs") updateIFSProposal();
    }
  }

  function updateJourneyList() {
    const list = document.getElementById("journey-list");
    if (!list) return;
    const items = lireCarnet();
    if (items.length === 0) {
      list.textContent = "Aucune étape enregistrée.";
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "journey-item";

      const label = document.createElement("span");
      const rank = document.createElement("strong");
      rank.textContent = String(index + 1);
      label.appendChild(rank);
      label.append(` ${item.fractal || ""} · ${item.maxIter ?? ""} it.`);
      row.appendChild(label);

      const button = document.createElement("button");
      button.className = "btn btn-secondary";
      button.type = "button";
      button.dataset.journeyIndex = String(index);
      button.textContent = "Aller";
      row.appendChild(button);

      fragment.appendChild(row);
    });
    list.replaceChildren(fragment);
  }

  function updateDeepZoomReadout() {
    const readout = document.getElementById("deepzoom-readout");
    if (!readout) return;
    const view = getView();
    const base = 4.0 / Math.max(1, getActiveCanvas().width || 800);
    const zoom = Math.max(1, base / Math.max(view.pixelSize, Number.MIN_VALUE));
    const exponent = Math.log10(zoom);
    const warning = view.pixelSize < 1e-12 ? "limite double précision" : "précision stable";
    readout.textContent = `Zoom ×10^${exponent.toFixed(2)} · ${warning}`;
  }

  function applyDeepIterations() {
    const params = getParams();
    const auto = document.getElementById("deepzoom-auto-iterations")?.checked;
    if (!auto) return;
    const quality = document.getElementById("deepzoom-quality-select")?.value || "standard";
    const view = getView();
    const zoomFactor = Math.max(1, 0.004 / Math.max(view.pixelSize, 1e-16));
    const qualityBoost = quality === "extreme" ? 1.55 : (quality === "fine" ? 1.25 : 1.0);
    const target = clamp(Math.round((256 + Math.log2(zoomFactor) * 42) * qualityBoost), 64, 4096);
    if (target > params.maxIter) setMaxIter(target);
  }

  function updateLSystemProposal() {
    const proposition = lirePropositionLSysteme();
    const apercu = dessinerPropositionLSysteme(lsystemCanvas, proposition.axiom, proposition.rules, proposition.angle, proposition.generations, proposition.seed);
    const description = decrireReglesLSysteme(proposition.rules);
    const readout = document.getElementById("lsystem-proposal-readout");
    if (readout) {
      const active = getParams().lsystemProposalActive ? "appliquée" : "locale";
      const stochastic = description.stochasticCount > 0 ? ` · ${description.stochasticCount} règle(s) stochastique(s), graine ${proposition.seed}` : "";
      const symbols = description.symboles.length ? ` · symboles ${description.symboles.slice(0, 8).join(" ")}` : "";
      const diagnostic = description.diagnostics.length ? ` · ${description.diagnostics[0]}` : "";
      const points = apercu?.pointsCount ? ` · ${apercu.pointsCount} points` : "";
      readout.textContent = `Proposition ${active} · ${description.ruleCount} règle(s), ${proposition.generations} génération(s), angle ${formatNombre(proposition.angle, 1)}°, trait ${formatNombre(proposition.strokeWidth, 2)}${stochastic}${symbols}${points}${diagnostic} · non canonique`;
    }
    const stringPreview = document.getElementById("lsystem-string-preview");
    if (stringPreview) {
      const { sequence: seq } = genererPropositionLSysteme(proposition, { limit: 14000 });
      const display = seq.length > 180 ? seq.slice(0, 180) + `… (${seq.length} symboles)` : seq + ` (${seq.length} symboles)`;
      stringPreview.textContent = display;
    }
  }

  function remplirListeSauvegardes(list, items, prefix) {
    const fragment = document.createDocumentFragment();
    items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "lsystem-save-item";

      const text = document.createElement("span");
      text.className = "lsystem-save-item-text";
      const name = document.createElement("span");
      name.className = "lsystem-save-item-name";
      name.title = item.nom || "";
      name.textContent = item.nom || "";
      const detail = document.createElement("span");
      detail.className = "lsystem-save-item-detail";
      detail.textContent = prefix === "ff"
        ? `${item.mode || "mandelbrot"} · ${item.formule || "z*z+c"}`
        : `${item.generations ?? 4} gen · ${item.angle ?? 60}° · ${String(item.axiom || "F").slice(0, 18)}`;
      text.append(name, detail);
      row.appendChild(text);

      const loadButton = document.createElement("button");
      loadButton.className = "btn btn-secondary";
      loadButton.type = "button";
      loadButton.dataset[`${prefix}Load`] = String(idx);
      loadButton.textContent = "Charger";
      row.appendChild(loadButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "btn btn-secondary";
      deleteButton.type = "button";
      deleteButton.dataset[`${prefix}Delete`] = String(idx);
      deleteButton.textContent = "✕";
      row.appendChild(deleteButton);

      fragment.appendChild(row);
    });
    list.replaceChildren(fragment);
  }

  function updateLSystemSaveList() {
    const list = document.getElementById("lsystem-save-list");
    if (!list) return;
    const items = lireSauvegardeLSystem();
    remplirListeSauvegardes(list, items, "ls");
  }

  function lirePropositionFormule() {
    return {
      formule: document.getElementById("formule-iteration-input")?.value.trim() || "z*z+c",
      rayon: parseFloat(document.getElementById("formule-escape-radius-input")?.value || "2"),
      mode: document.getElementById("formule-mode-select")?.value || "mandelbrot",
      paramA: parseFloat(document.getElementById("formule-param-a-input")?.value || "0"),
      paramB: parseFloat(document.getElementById("formule-param-b-input")?.value || "0"),
    };
  }

  function updateFormuleProposal() {
    const prop = lirePropositionFormule();
    analyserFormule?.(prop.formule); // diagnostics: aperçu signature via dessinerMiniApercuFormule
    const params = getParams();
    dessinerMiniApercuFormule({
      canvas: document.getElementById("formule-proposal-canvas"),
      readout: document.getElementById("formule-proposal-readout"),
      formule: prop.formule,
      rayon: prop.rayon,
      mode: prop.mode,
      paramA: prop.paramA,
      paramB: prop.paramB,
      juliaCre: params.juliaCre,
      juliaCim: params.juliaCim,
    });
  }

  function updateFormuleSaveList() {
    const list = document.getElementById("formule-save-list");
    if (!list) return;
    const items = lireSauvegardeFormule();
    remplirListeSauvegardes(list, items, "ff");
  }

  function creerManifesteFormule(prop) {
    const view = getView();
    const params = getParams();
    return {
      type: "promotion_formule",
      statut: "proposition_locale",
      cible_source: "src/fractales_formule.multi",
      formule: prop.formule,
      mode: prop.mode,
      rayon_evasion: prop.rayon,
      parametres: {
        a: prop.paramA,
        b: prop.paramB,
      },
      vue: {
        centerX: view.centerX,
        centerY: view.centerY,
        pixelSize: view.pixelSize,
        rotation: view.rotation ?? 0,
      },
      rendu: {
        iterations: params.maxIter,
        palette: params.palette,
      },
      workflow: [
        "Ajouter la fonction canonique dans src/fractales_formule.multi",
        "Enregistrer l'identifiant dans src/main.multi",
        "Mettre a jour compile_wasm.multi, integration_checks.py, renderer.js et generate_api.py",
      ],
    };
  }

  function configurerCurseurFormule(input, label, output, meta) {
    if (!input) return;
    input.min = String(meta.min);
    input.max = String(meta.max);
    input.step = String(meta.pas);
    const valeur = Number(input.value);
    if (!Number.isFinite(valeur) || valeur < meta.min || valeur > meta.max) input.value = String(meta.defaut);
    if (label) label.textContent = meta.nom;
    if (output) output.textContent = formatNombre(parseFloat(input.value || "0"), 2);
  }

  function appliquerParametresFormulePreset(preset, remplacerValeurs = false) {
    const parametres = preset?.parametres ?? PARAMETRES_FORMULE_DEFAUT;
    const aInput = document.getElementById("formule-param-a-input");
    const bInput = document.getElementById("formule-param-b-input");
    if (remplacerValeurs) {
      if (aInput) aInput.value = String(parametres.a.defaut);
      if (bInput) bInput.value = String(parametres.b.defaut);
    }
    configurerCurseurFormule(
      aInput,
      document.getElementById("formule-param-a-label"),
      document.getElementById("formule-param-a-value"),
      parametres.a,
    );
    configurerCurseurFormule(
      bInput,
      document.getElementById("formule-param-b-label"),
      document.getElementById("formule-param-b-value"),
      parametres.b,
    );
  }

  function actualiserValeursParametresFormule() {
    const aInput = document.getElementById("formule-param-a-input");
    const bInput = document.getElementById("formule-param-b-input");
    const aOutput = document.getElementById("formule-param-a-value");
    const bOutput = document.getElementById("formule-param-b-value");
    if (aOutput) aOutput.textContent = formatNombre(parseFloat(aInput?.value || "0"), 2);
    if (bOutput) bOutput.textContent = formatNombre(parseFloat(bInput?.value || "0"), 2);
  }

  function rafraichirFormuleDepuisInterface({ appliquerSiActive = false } = {}) {
    actualiserValeursParametresFormule();
    updateFormuleProposal();
    if (appliquerSiActive && getParams().formulePropositionActive) {
      const prop = lirePropositionFormule();
      applyFormuleProposal?.(prop);
      updateHash();
    }
  }

  dock.addEventListener("click", (event) => {
    const button = event.target.closest(".exploration-mode-btn");
    if (!button) return;
    setMode(button.dataset.mode);
  });

  closeButton.addEventListener("click", () => setMode(null));

  parameterCanvas?.addEventListener("click", (event) => {
    if (!JULIA_FRACTALS.has(getParams().fractal)) {
      updateStatusBar("La carte des paramètres agit sur les fractales Julia", true);
    }
    const rect = parameterCanvas.getBoundingClientRect();
    const re = -2.0 + (event.clientX - rect.left) / rect.width * 4.0;
    const im = 1.4 - (event.clientY - rect.top) / rect.height * 2.8;
    setJuliaC(re, im);
    drawParameterMap();
    render();
    updateHash();
  });

  document.getElementById("btn-parameter-random")?.addEventListener("click", () => {
    const presets = [[-0.745, 0.112], [-0.4, 0.6], [0.285, 0.01], [-0.70176, -0.3842], [-0.8, 0.156]];
    const [re, im] = presets[Math.floor(Math.random() * presets.length)];
    setJuliaC(re, im);
    drawParameterMap();
    render();
    updateHash();
  });

  document.getElementById("btn-parameter-reset")?.addEventListener("click", () => {
    setJuliaC(-0.8, 0.156);
    drawParameterMap();
    render();
    updateHash();
  });

  document.getElementById("btn-journey-add")?.addEventListener("click", () => {
    const items = lireCarnet();
    items.push(captureView());
    ecrireCarnet(items);
    updateJourneyList();
    updateStatusBar("Étape ajoutée au carnet", true);
  });

  document.getElementById("btn-journey-clear")?.addEventListener("click", () => {
    ecrireCarnet([]);
    updateJourneyList();
    updateStatusBar("Carnet vidé", true);
  });

  document.getElementById("btn-journey-play")?.addEventListener("click", async () => {
    const items = lireCarnet();
    for (const item of items) {
      await applyCapturedView(item);
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
  });

  document.getElementById("journey-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-journey-index]");
    if (!button) return;
    const item = lireCarnet()[parseInt(button.dataset.journeyIndex, 10)];
    if (item) applyCapturedView(item);
  });

  document.getElementById("coloring-mode-select")?.addEventListener("change", (event) => {
    setParamsPatch({ coloringMode: event.target.value });
    render();
    updateHash();
  });

  document.getElementById("palette-phase-slider")?.addEventListener("input", (event) => {
    setParamsPatch({ palettePhase: parseFloat(event.target.value) });
    render();
    updateHash();
  });

  document.getElementById("palette-contours-check")?.addEventListener("change", (event) => {
    setParamsPatch({ paletteContours: event.target.checked });
    render();
    updateHash();
  });

  document.getElementById("deepzoom-auto-iterations")?.addEventListener("change", (event) => {
    setParamsPatch({ deepZoomAutoIterations: event.target.checked });
    applyDeepIterations();
    render();
    updateHash();
  });

  document.getElementById("deepzoom-quality-select")?.addEventListener("change", (event) => {
    setParamsPatch({ deepZoomQuality: event.target.value });
    applyDeepIterations();
    render();
    updateHash();
  });

  document.getElementById("btn-deepzoom-apply")?.addEventListener("click", () => {
    applyDeepIterations();
    render();
    updateHash();
  });

  document.getElementById("studio3d-material-select")?.addEventListener("change", (event) => {
    setParamsPatch({ studio3dMaterial: event.target.value });
    updateHash();
    updateStatusBar(`Matière 3D : ${event.target.value}`, true);
  });

  document.getElementById("studio3d-fog-slider")?.addEventListener("input", (event) => {
    setParamsPatch({ studio3dFog: parseFloat(event.target.value) });
    updateHash();
  });

  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-3d-preset]");
    if (!button) return;
    if (!is3D()) {
      updateStatusBar("Le Studio 3D est disponible sur les fractales WebGL", true);
      return;
    }
    const current = get3DView() || {};
    const preset = button.dataset["3dPreset"];
    const patch = preset === "face"
      ? { lacet: 0.0, tangage: 0.15 }
      : (preset === "plongee" ? { lacet: 0.85, tangage: 0.95 } : { lacet: current.lacet + 0.72, tangage: current.tangage ?? 0.35 });
    set3DView(patch);
    render();
    updateHash();
  });

  ["lsystem-generation-slider", "lsystem-angle-input", "lsystem-axiom-input", "lsystem-rules-input", "lsystem-seed-input", "lsystem-stroke-width-slider"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateLSystemProposal);
  });

  document.getElementById("btn-lsystem-seed")?.addEventListener("click", () => {
    const seedInput = document.getElementById("lsystem-seed-input");
    if (seedInput) seedInput.value = String(Math.floor(Math.random() * 100000));
    updateLSystemProposal();
  });

  document.getElementById("lsystem-preset-select")?.addEventListener("change", (event) => {
    const key = event.target.value;
    if (!key || !LSYSTEM_PRESETS[key]) { event.target.value = ""; return; }
    const preset = LSYSTEM_PRESETS[key];
    const axiomInput = document.getElementById("lsystem-axiom-input");
    const rulesInput = document.getElementById("lsystem-rules-input");
    const angleInput = document.getElementById("lsystem-angle-input");
    const genSlider = document.getElementById("lsystem-generation-slider");
    const seedInput = document.getElementById("lsystem-seed-input");
    const strokeInput = document.getElementById("lsystem-stroke-width-slider");
    if (axiomInput) axiomInput.value = preset.axiome;
    if (rulesInput) rulesInput.value = preset.regles;
    if (angleInput) angleInput.value = String(preset.angle);
    if (genSlider) genSlider.value = String(preset.gen);
    if (seedInput) seedInput.value = String(preset.graine ?? 1);
    if (strokeInput) strokeInput.value = String(preset.trait ?? 1.35);
    updateLSystemProposal();
  });

  document.getElementById("btn-lsystem-apply")?.addEventListener("click", () => {
    const proposition = lirePropositionLSysteme();
    applyLSystemProposal?.(proposition);
    updateLSystemProposal();
  });

  document.getElementById("btn-lsystem-share")?.addEventListener("click", () => {
    const proposition = lirePropositionLSysteme();
    applyLSystemProposal?.(proposition);
    updateHash();
    setTimeout(() => {
      try {
        navigator.clipboard.writeText(window.location.href);
        updateStatusBar("Lien avec la grammaire L-système copié", true);
      } catch {
        updateStatusBar("Impossible de copier : autorisez le presse-papiers", true);
      }
    }, 60);
  });

  document.getElementById("btn-lsystem-save")?.addEventListener("click", () => {
    const nom = document.getElementById("lsystem-save-name")?.value.trim();
    if (!nom) { updateStatusBar("Entrez un nom avant de sauvegarder", true); return; }
    const items = lireSauvegardeLSystem();
    const proposition = lirePropositionLSysteme();
    ecrireSauvegardeLSystem(fusionnerSauvegarde(items, { nom, ...proposition }));
    updateLSystemSaveList();
    const nameInput = document.getElementById("lsystem-save-name");
    if (nameInput) nameInput.value = "";
    updateStatusBar(`Grammaire « ${nom} » sauvegardée`, true);
  });

  document.getElementById("lsystem-save-list")?.addEventListener("click", (event) => {
    const loadBtn = event.target.closest("[data-ls-load]");
    if (loadBtn) {
      const item = lireSauvegardeLSystem()[parseInt(loadBtn.dataset.lsLoad, 10)];
      if (!item) return;
      const axiomInput = document.getElementById("lsystem-axiom-input");
      const rulesInput = document.getElementById("lsystem-rules-input");
      const angleInput = document.getElementById("lsystem-angle-input");
      const genSlider = document.getElementById("lsystem-generation-slider");
      const seedInput = document.getElementById("lsystem-seed-input");
      const strokeInput = document.getElementById("lsystem-stroke-width-slider");
      if (axiomInput) axiomInput.value = item.axiom || "F";
      if (rulesInput) rulesInput.value = item.rules || "F=F+F--F+F";
      if (angleInput) angleInput.value = String(item.angle ?? 60);
      if (genSlider) genSlider.value = String(item.generations ?? 4);
      if (seedInput) seedInput.value = String(item.seed ?? 1);
      if (strokeInput) strokeInput.value = String(item.strokeWidth ?? 1.35);
      updateLSystemProposal();
    }
    const deleteBtn = event.target.closest("[data-ls-delete]");
    if (deleteBtn) {
      const items = lireSauvegardeLSystem();
      items.splice(parseInt(deleteBtn.dataset.lsDelete, 10), 1);
      ecrireSauvegardeLSystem(items);
      updateLSystemSaveList();
    }
  });

  document.getElementById("btn-lsystem-clear")?.addEventListener("click", () => {
    clearLSystemProposal?.();
    updateLSystemProposal();
  });

  // ── Atelier formule ──────────────────────────────────────────

  ["formule-iteration-input", "formule-escape-radius-input", "formule-mode-select", "formule-param-a-input", "formule-param-b-input"].forEach((id) => {
    const element = document.getElementById(id);
    element?.addEventListener("input", () => rafraichirFormuleDepuisInterface({ appliquerSiActive: id.endsWith("-a-input") || id.endsWith("-b-input") }));
    element?.addEventListener("change", () => rafraichirFormuleDepuisInterface({ appliquerSiActive: id.endsWith("-a-input") || id.endsWith("-b-input") }));
  });

  document.getElementById("formule-preset-select")?.addEventListener("change", (event) => {
    const preset = FORMULE_PRESETS[event.target.value];
    if (!preset) { event.target.value = ""; return; }
    const fi = document.getElementById("formule-iteration-input");
    const fr = document.getElementById("formule-escape-radius-input");
    const fm = document.getElementById("formule-mode-select");
    const fa = document.getElementById("formule-param-a-input");
    const fb = document.getElementById("formule-param-b-input");
    if (fi) fi.value = preset.formule;
    if (fr) fr.value = String(preset.rayon);
    if (fm) fm.value = preset.mode;
    appliquerParametresFormulePreset(preset, true);
    if (fa) fa.value = String(preset.parametres.a.defaut);
    if (fb) fb.value = String(preset.parametres.b.defaut);
    rafraichirFormuleDepuisInterface({ appliquerSiActive: true });
  });

  document.getElementById("btn-formule-preview")?.addEventListener("click", () => {
    rafraichirFormuleDepuisInterface();
  });

  document.getElementById("btn-formule-apply")?.addEventListener("click", () => {
    const prop = lirePropositionFormule();
    applyFormuleProposal?.(prop);
    updateFormuleProposal();
  });

  document.getElementById("btn-formule-share")?.addEventListener("click", () => {
    const prop = lirePropositionFormule();
    applyFormuleProposal?.(prop);
    updateHash();
    setTimeout(() => {
      try { navigator.clipboard.writeText(window.location.href); updateStatusBar("Lien avec la formule copié", true); }
      catch { updateStatusBar("Impossible de copier : autorisez le presse-papiers", true); }
    }, 60);
  });

  document.getElementById("btn-formule-manifest")?.addEventListener("click", () => {
    const prop = lirePropositionFormule();
    const compiled = compilerFormule?.(prop.formule);
    if (!compiled?.fn) {
      updateStatusBar(`Formule invalide : ${compiled?.error ?? "erreur de syntaxe"}`, true);
      return;
    }
    const manifeste = JSON.stringify(creerManifesteFormule(prop), null, 2);
    try {
      navigator.clipboard.writeText(manifeste);
      updateStatusBar("Manifeste de promotion copié", true);
    } catch {
      updateStatusBar("Impossible de copier : autorisez le presse-papiers", true);
    }
  });

  document.getElementById("btn-formule-clear")?.addEventListener("click", () => {
    clearFormuleProposal?.();
    updateFormuleProposal();
  });

  document.getElementById("btn-formule-save")?.addEventListener("click", () => {
    const nom = document.getElementById("formule-save-name")?.value.trim();
    if (!nom) { updateStatusBar("Entrez un nom avant de sauvegarder", true); return; }
    const items = lireSauvegardeFormule();
    ecrireSauvegardeFormule(fusionnerSauvegarde(items, { nom, ...lirePropositionFormule() }));
    updateFormuleSaveList();
    const nameInput = document.getElementById("formule-save-name");
    if (nameInput) nameInput.value = "";
    updateStatusBar(`Formule « ${nom} » sauvegardée`, true);
  });

  document.getElementById("formule-save-list")?.addEventListener("click", (event) => {
    const loadBtn = event.target.closest("[data-ff-load]");
    if (loadBtn) {
      const item = lireSauvegardeFormule()[parseInt(loadBtn.dataset.ffLoad, 10)];
      if (!item) return;
      const fi = document.getElementById("formule-iteration-input");
      const fr = document.getElementById("formule-escape-radius-input");
      const fm = document.getElementById("formule-mode-select");
      const fa = document.getElementById("formule-param-a-input");
      const fb = document.getElementById("formule-param-b-input");
      if (fi) fi.value = item.formule || "z*z+c";
      if (fr) fr.value = String(item.rayon ?? 2);
      if (fm) fm.value = item.mode || "mandelbrot";
      if (fa) fa.value = String(item.paramA ?? 0);
      if (fb) fb.value = String(item.paramB ?? 0);
      appliquerParametresFormulePreset(null);
      updateFormuleProposal();
    }
    const deleteBtn = event.target.closest("[data-ff-delete]");
    if (deleteBtn) {
      const items = lireSauvegardeFormule();
      items.splice(parseInt(deleteBtn.dataset.ffDelete, 10), 1);
      ecrireSauvegardeFormule(items);
      updateFormuleSaveList();
    }
  });

  document.querySelectorAll(".weather-toggle").forEach((input) => {
    input.addEventListener("change", () => {
      const values = [...document.querySelectorAll(".weather-toggle")]
        .filter((item) => item.checked)
        .map((item) => item.value);
      setParamsPatch({ weatherOverlays: values.join(",") });
      drawWeather();
      updateHash();
    });
  });

  function startOrbitAnimation() {
    if (orbitAnimId) cancelAnimationFrame(orbitAnimId);
    orbitRevealIndex = 0;
    const btnReplay = document.getElementById("btn-replay-orbit");
    if (btnReplay) btnReplay.style.display = "inline-flex";
    function step() {
      orbitRevealIndex = Math.min(orbitRevealIndex + 4, capturedOrbit.length);
      drawWeather();
      if (orbitRevealIndex < capturedOrbit.length) {
        orbitAnimId = requestAnimationFrame(step);
      } else {
        orbitAnimId = null;
      }
    }
    orbitAnimId = requestAnimationFrame(step);
  }

  function captureOrbitAt(point) {
    const result = calculerOrbite(getParams().fractal, point, getParams());
    if (result.unsupported) {
      updateStatusBar("Orbite non disponible pour ce type de fractale", true);
      return;
    }
    capturedOrbit = result.points;
    orbitEscaped = result.escaped;
    const values = new Set(activeWeather());
    values.add("orbite");
    setParamsPatch({ weatherOverlays: [...values].join(",") });
    document.querySelectorAll(".weather-toggle").forEach((input) => {
      input.checked = values.has(input.value);
    });
    const readout = document.getElementById("weather-readout");
    const label = orbitEscaped ? "échappe" : "bornée";
    if (readout) readout.textContent = `${capturedOrbit.length} pts · ${label} · départ ${formatNombre(point.re, 5)} ${point.im >= 0 ? "+" : "-"} ${formatNombre(Math.abs(point.im), 5)}i`;
    startOrbitAnimation();
    updateHash();
  }

  document.getElementById("btn-capture-orbit")?.addEventListener("click", () => {
    captureOrbitPending = true;
    updateStatusBar("Cliquez un point du canvas pour capturer son orbite", true);
  });

  document.getElementById("btn-replay-orbit")?.addEventListener("click", () => {
    if (capturedOrbit.length > 0) startOrbitAnimation();
  });

  getActiveCanvas().addEventListener("click", (event) => {
    if (!captureOrbitPending) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    captureOrbitPending = false;
    const canvas = getActiveCanvas();
    const point = canvasToComplexLocal(event.offsetX, event.offsetY, canvas, getView());
    captureOrbitAt(point);
  }, true);

  const TRANSFORM_READOUTS = {
    aucune:       "Plan standard actif.",
    log_polaire:  "z → ln|z| + i·arg(z) — zoom devient translation",
    inversion:    "z → x/(x²+y²) − i·y/(x²+y²) — intérieur/extérieur inversés",
    pli_x:        "z → |Re(z)| + i·Im(z) — symétrie axe réel",
    pli_y:        "z → Re(z) + i·|Im(z)| — symétrie axe imaginaire",
    pli_xy:       "z → |Re(z)| + i·|Im(z)| — double pli",
    mobius:       null,
  };
  const MOBIUS_READOUTS = {
    inversion_cercle: "z → 1/z — inversion du cercle unité",
    cayley:           "z → (z−1)/(z+1) — transformation de Cayley",
    joukowski:        "z → (z + 1/z)/2 — aile de Joukowski",
  };

  function updateTransformReadout() {
    const readout = document.getElementById("transform-readout");
    if (!readout) return;
    const ct = getParams().coordTransform || "aucune";
    const mp = getParams().mobiusPreset || "inversion_cercle";
    const text = ct === "mobius"
      ? (MOBIUS_READOUTS[mp] ?? "Möbius actif")
      : (TRANSFORM_READOUTS[ct] ?? "Plan standard actif.");
    readout.textContent = text;
  }

  document.getElementById("transform-select")?.addEventListener("change", (event) => {
    const val = event.target.value;
    const group = document.getElementById("mobius-preset-group");
    if (group) group.classList.toggle("hidden", val !== "mobius");
    setParamsPatch({ coordTransform: val });
    updateTransformReadout();
    render();
    updateHash();
  });

  document.getElementById("mobius-preset-select")?.addEventListener("change", (event) => {
    setParamsPatch({ mobiusPreset: event.target.value });
    updateTransformReadout();
    render();
    updateHash();
  });

  document.getElementById("btn-transform-reset")?.addEventListener("click", () => {
    setParamsPatch({ coordTransform: "aucune" });
    const sel = document.getElementById("transform-select");
    if (sel) sel.value = "aucune";
    const group = document.getElementById("mobius-preset-group");
    if (group) group.classList.add("hidden");
    updateTransformReadout();
    render();
    updateHash();
  });

  // ── Atelier IFS ─────────────────────────────────────────────

  function lireConfigIFS() {
    const preset = document.getElementById("ifs-preset-select")?.value || "barnsley";
    const iterations = parseInt(document.getElementById("ifs-iterations-slider")?.value || "50", 10);
    const colorMode = document.getElementById("ifs-color-select")?.value || "densite";
    const tableauPersonnalise = document.getElementById("ifs-custom-input")?.value || TABLEAU_IFS_BARNSLEY;
    return { preset, iterations, colorMode, tableauPersonnalise };
  }

  function updateIFSProposal() {
    if (!ifsCanvas) return;
    const config = lireConfigIFS();
    const customGroup = document.getElementById("ifs-custom-group");
    if (customGroup) customGroup.classList.toggle("hidden", config.preset !== "personnalise");
    jeuDuChaosIFS(ifsCanvas, config, getWasmExportFunctions?.(), (msg) => {
      const readout = document.getElementById("ifs-proposal-readout");
      if (readout) readout.textContent = msg;
    });
  }

  document.getElementById("ifs-preset-select")?.addEventListener("change", () => {
    const config = lireConfigIFS();
    const customGroup = document.getElementById("ifs-custom-group");
    if (customGroup) customGroup.classList.toggle("hidden", config.preset !== "personnalise");
    updateIFSProposal();
  });

  document.getElementById("ifs-iterations-slider")?.addEventListener("input", () => {
    const v = document.getElementById("ifs-iterations-slider")?.value || "50";
    const out = document.getElementById("ifs-iterations-value");
    if (out) out.textContent = v;
  });

  document.getElementById("ifs-color-select")?.addEventListener("change", updateIFSProposal);

  document.getElementById("ifs-custom-input")?.addEventListener("input", () => {
    const texte = document.getElementById("ifs-custom-input")?.value || "";
    const desc = decrireTableauIFS(texte);
    const readout = document.getElementById("ifs-proposal-readout");
    if (!readout) return;
    if (desc.diagnostics.length > 0) {
      readout.textContent = desc.diagnostics[0];
    } else {
      const contraction = desc.contractante ? "contractante" : "attention : non contractante";
      readout.textContent = `${desc.count} transformée(s) · ${contraction} · appuyez sur Démarrer`;
    }
  });

  document.getElementById("btn-ifs-demarrer")?.addEventListener("click", updateIFSProposal);

  document.getElementById("btn-ifs-naviguer")?.addEventListener("click", () => {
    const preset = document.getElementById("ifs-preset-select")?.value;
    const fractale = fractaleDePresetIFS(preset);
    if (!fractale) {
      updateStatusBar("Navigation non disponible pour l'IFS personnalisé", true);
      return;
    }
    naviguerVersFractale?.(fractale);
    updateStatusBar(`Navigation vers ${fractale}`, true);
  });

  function syncFromParams() {
    const params = getParams();
    const coloringMode = document.getElementById("coloring-mode-select");
    const phase = document.getElementById("palette-phase-slider");
    const contours = document.getElementById("palette-contours-check");
    const auto = document.getElementById("deepzoom-auto-iterations");
    const quality = document.getElementById("deepzoom-quality-select");
    const material = document.getElementById("studio3d-material-select");
    const fog = document.getElementById("studio3d-fog-slider");
    if (coloringMode) coloringMode.value = params.coloringMode || "standard";
    if (phase) phase.value = String(params.palettePhase ?? 0);
    if (contours) contours.checked = Boolean(params.paletteContours);
    if (auto) auto.checked = Boolean(params.deepZoomAutoIterations);
    if (quality) quality.value = params.deepZoomQuality || "standard";
    if (material) material.value = params.studio3dMaterial || "lumineux";
    if (fog) fog.value = String(params.studio3dFog ?? 0);
    const lsystemGeneration = document.getElementById("lsystem-generation-slider");
    const lsystemAngle = document.getElementById("lsystem-angle-input");
    const lsystemAxiom = document.getElementById("lsystem-axiom-input");
    const lsystemRules = document.getElementById("lsystem-rules-input");
    const lsystemSeed = document.getElementById("lsystem-seed-input");
    const lsystemStroke = document.getElementById("lsystem-stroke-width-slider");
    if (lsystemGeneration) lsystemGeneration.value = String(params.lsystemGenerations ?? 4);
    if (lsystemAngle) lsystemAngle.value = String(params.lsystemAngle ?? 60);
    if (lsystemAxiom) lsystemAxiom.value = params.lsystemAxiom || "F";
    if (lsystemRules) lsystemRules.value = params.lsystemRules || "F=F+F--F+F";
    if (lsystemSeed) lsystemSeed.value = String(params.lsystemSeed ?? 1);
    if (lsystemStroke) lsystemStroke.value = String(params.lsystemStrokeWidth ?? 1.35);
    const formuleIter = document.getElementById("formule-iteration-input");
    const formuleRadius = document.getElementById("formule-escape-radius-input");
    const formuleMode = document.getElementById("formule-mode-select");
    const formuleParamA = document.getElementById("formule-param-a-input");
    const formuleParamB = document.getElementById("formule-param-b-input");
    if (formuleIter) formuleIter.value = params.formuleIteration || "z*z+c";
    if (formuleRadius) formuleRadius.value = String(params.formuleEscapeRadius ?? 2);
    if (formuleMode) formuleMode.value = params.formuleMode || "mandelbrot";
    if (formuleParamA) formuleParamA.value = String(params.formuleParamA ?? 0);
    if (formuleParamB) formuleParamB.value = String(params.formuleParamB ?? 0);
    appliquerParametresFormulePreset(FORMULE_PRESETS[document.getElementById("formule-preset-select")?.value]);
    const overlays = activeWeather();
    document.querySelectorAll(".weather-toggle").forEach((input) => {
      input.checked = overlays.has(input.value);
    });
    const transformSel = document.getElementById("transform-select");
    const mobiusPresetSel = document.getElementById("mobius-preset-select");
    const mobiusGroup = document.getElementById("mobius-preset-group");
    if (transformSel) transformSel.value = params.coordTransform || "aucune";
    if (mobiusPresetSel) mobiusPresetSel.value = params.mobiusPreset || "inversion_cercle";
    if (mobiusGroup) mobiusGroup.classList.toggle("hidden", (params.coordTransform || "aucune") !== "mobius");
    updateJourneyList();
    updateLSystemSaveList();
    updateDeepZoomReadout();
    if (activeMode === "parametres") drawParameterMap();
    if (activeMode === "lsysteme") { updateLSystemProposal(); updateLSystemSaveList(); }
    if (activeMode === "formule") { updateFormuleProposal(); updateFormuleSaveList(); }
    if (activeMode === "transforms") updateTransformReadout();
    const ifsIterValue = document.getElementById("ifs-iterations-value");
    if (ifsIterValue) ifsIterValue.textContent = document.getElementById("ifs-iterations-slider")?.value || "50";
    drawWeather();
  }

  function afterRender() {
    updateDeepZoomReadout();
    drawWeather();
  }

  syncFromParams();

  return {
    syncFromParams,
    afterRender,
    drawParameterMap,
    drawWeather,
    lineFractals,
  };
}
