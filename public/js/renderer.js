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
  fractal: "mandelbrot", // "mandelbrot" | "mandelbrot_classe" | "julia" | "burning_ship" | "tricorn" | "multibrot" | "celtic" | "buffalo" | "perpendicular_burning_ship" | "newton" | "phoenix" | "barnsley" | "sierpinski" | "koch" | "magnet1" | "magnet2" | "lambda_fractale"
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
  newton:       { centerX: 0.0,  centerY: 0.0, span: 3.0 },
  phoenix:      { centerX: -0.5, centerY: 0.0, span: 3.2 },
  barnsley:     { centerX: 0.0,  centerY: 5.0, span: 9.0 },
  sierpinski:   { centerX: 0.5,  centerY: 0.35, span: 1.0 },
  koch:         { centerX: 0.45, centerY: -0.28, span: 0.9 },
  magnet1:      { centerX: 1.5,  centerY: 0.0, span: 4.0 },
  magnet2:      { centerX: 1.5,  centerY: 0.0, span: 5.0 },
  lambda_fractale: { centerX: 0.0, centerY: 0.0, span: 8.0 },
};

function getMultibrotPreset(power) {
  const p = Number.isFinite(power) ? power : 5;
  // Higher powers concentrate details near the origin.
  if (p >= 7) return { centerX: 0.0, centerY: 0.0, span: 1.6 };
  if (p >= 5) return { centerX: 0.0, centerY: 0.0, span: 1.8 };
  return { centerX: 0.0, centerY: 0.0, span: 2.2 };
}

const POINT_FRACTALS = new Set(["barnsley", "sierpinski"]);
const LINE_FRACTALS = new Set(["koch"]);

/** Fonctions fractales exportées par WASM */
let wasmFunctions = {};
/** True si le module WASM est disponible */
let wasmAvailable = false;
/** Timestamp de début du dernier rendu */
let renderStart = 0;
/** True si un rendu est en cours */
let rendering = false;
/** ImageData réutilisable */
let imageDataBuffer = null;

// ============================================================
// ÉLÉMENTS DOM
// ============================================================

const canvas        = document.getElementById("fractal-canvas");
const ctx           = canvas.getContext("2d", { willReadFrequently: false });
const renderStatus  = document.getElementById("render-status");
const coordsDisplay = document.getElementById("coords-display");
const iterSlider    = document.getElementById("iter-slider");
const iterValue     = document.getElementById("iter-value");
const fractalSelect = document.getElementById("fractal-select");
const multibrotPower = document.getElementById("multibrot-power");
const paletteSelect = document.getElementById("palette-select");
const btnReset      = document.getElementById("btn-reset");
const btnToggle      = document.getElementById("btn-toggle-sidebar");
const btnCloseSidebar = document.getElementById("btn-close-sidebar");
const sidebar        = document.getElementById("sidebar");
const zoomHint      = document.getElementById("zoom-hint");
const badgeDiv      = document.getElementById("benchmark-badge");
const badgeLoading  = document.getElementById("badge-loading");

// ============================================================
// PALETTES DE COULEURS
// ============================================================
// Chaque palette est un tableau de stops RGB [r, g, b].
// La couleur est interpolée linéairement selon t = iter / maxIter.
// t = 1 (intérieur de l'ensemble) ? noir.

const PALETTES = {
  /** Feu : noir ? rouge ? orange ? jaune ? blanc */
  feu: [
    [0,   0,   0  ],
    [90,  0,   0  ],
    [180, 0,   0  ],
    [255, 60,  0  ],
    [255, 150, 0  ],
    [255, 220, 30 ],
    [255, 255, 160],
    [255, 255, 255],
  ],
  /** Océan : noir ? bleu profond ? bleu ? cyan ? blanc */
  ocean: [
    [0,   0,   0  ],
    [0,   0,   40 ],
    [0,   20,  100],
    [0,   80,  180],
    [0,   160, 220],
    [40,  210, 240],
    [160, 240, 255],
    [255, 255, 255],
  ],
  /** Aurora : noir ? vert ? indigo ? violet ? rose */
  aurora: [
    [0,   0,   0  ],
    [0,   15,  20 ],
    [0,   80,  60 ],
    [0,   180, 90 ],
    [50,  120, 210],
    [157, 78,  221],
    [220, 100, 200],
    [255, 200, 240],
  ],
};

/**
 * Retourne la couleur [r, g, b] pour une valeur d'itération.
 * @param {number} iter  — valeur retournée par mandelbrot() (float)
 * @param {number} max   — maxIter courant
 * @param {string} name  — nom de la palette
 * @returns {[number, number, number]}
 */
function getColor(iter, max, name) {
  if (iter >= max) return [0, 0, 0];  // intérieur ? noir
  const stops = PALETTES[name] ?? PALETTES.feu;
  // normaliser dans [0, 1] avec légère correction logarithmique
  const t = Math.sqrt(iter / max);
  const scaled = t * (stops.length - 1);
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

function kochGenerate(iterations) {
  let s = "F";
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) next += ch === "F" ? "F+F--F+F" : ch;
    s = next;
  }
  return s;
}

function renderPointFractal(w, h, data, cx0, cy0, ps) {
  const isBarnsley = params.fractal === "barnsley";
  const rng = makeRng(0x9e3779b9 ^ (params.maxIter << 7) ^ params.fractal.length);
  const pointsTarget = Math.max(30000, params.maxIter * 900);
  const burnIn = isBarnsley ? 80 : 40;
  const pointsPerFrame = 25000;
  let x = 0.0;
  let y = 0.0;
  let emitted = 0;
  let iter = 0;

  const putPoint = (px, py) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const i = (py * w + px) * 4;
    if (isBarnsley) {
      data[i] = Math.min(120, data[i] + 3);
      data[i + 1] = Math.min(255, data[i + 1] + 24);
      data[i + 2] = Math.min(140, data[i + 2] + 4);
    } else {
      data[i] = Math.min(160, data[i] + 10);
      data[i + 1] = Math.min(230, data[i + 1] + 16);
      data[i + 2] = Math.min(255, data[i + 2] + 24);
    }
    data[i + 3] = 255;
  };

  const step = () => {
    const end = Math.min(emitted + pointsPerFrame, pointsTarget);
    while (emitted < end) {
      const r = rng();
      [x, y] = isBarnsley ? barnsleyStep(x, y, r) : sierpinskiStep(x, y, r);
      iter += 1;
      if (iter <= burnIn) continue;
      const px = ((x - cx0) / ps) | 0;
      const py = ((y - cy0) / ps) | 0;
      putPoint(px, py);
      emitted += 1;
    }
    ctx.putImageData(imageDataBuffer, 0, 0);
    if (emitted < pointsTarget) {
      requestAnimationFrame(step);
    } else {
      const elapsed = (performance.now() - renderStart).toFixed(0);
      rendering = false;
      canvas.parentElement.classList.remove("rendering");
      updateStatusBar("IFS mode - " + elapsed + " ms", true);
    }
  };
  requestAnimationFrame(step);
}

function renderLineFractal(w, h) {
  const n = Math.max(0, Math.min(6, Math.floor((params.maxIter - 64) / 128)));
  const commands = kochGenerate(n);
  const seg = (w * 0.8) / Math.pow(3, n);
  const turn = Math.PI / 3;

  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(0, 0, w, h);

  const stroke = getColor(Math.min(params.maxIter * 0.6, params.maxIter - 1), params.maxIter, params.palette);
  ctx.strokeStyle = "rgb(" + stroke[0] + ", " + stroke[1] + ", " + stroke[2] + ")";
  ctx.lineWidth = Math.max(1, Math.min(2, w / 800));
  ctx.beginPath();
  let x = w * 0.1;
  let y = h * 0.65;
  let a = 0.0;
  ctx.moveTo(x, y);

  for (const c of commands) {
    if (c === "F") {
      x += seg * Math.cos(a);
      y += seg * Math.sin(a);
      ctx.lineTo(x, y);
    } else if (c === "+") {
      a += turn;
    } else if (c === "-") {
      a -= turn;
    }
  }

  ctx.stroke();
  const elapsed = (performance.now() - renderStart).toFixed(0);
  rendering = false;
  canvas.parentElement.classList.remove("rendering");
  updateStatusBar("L-system mode - " + elapsed + " ms", true);
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
      newton: typeof exports.newton === "function" ? exports.newton : null,
      phoenix: typeof exports.phoenix === "function" ? exports.phoenix : null,
      barnsley: typeof exports.barnsley === "function" ? exports.barnsley : null,
      sierpinski: typeof exports.sierpinski === "function" ? exports.sierpinski : null,
      koch: typeof exports.koch === "function" ? exports.koch : null,
      magnet1: typeof exports.magnet1 === "function" ? exports.magnet1 : null,
      magnet2: typeof exports.magnet2 === "function" ? exports.magnet2 : null,
      lambda_fractale: typeof exports.lambda_fractale === "function" ? exports.lambda_fractale : null,
    };
    wasmAvailable = true;
    console.info("[WASM] Module mandelbrot.wasm chargé avec succès.");
    updateStatusBar("WASM prêt");
    return true;
  } catch (err) {
    console.warn("[WASM] Chargement échoué :", err.message);
    wasmFunctions = {};
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
  if (rendering) return;

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
  updateStatusBar("Rendering...");

  if (POINT_FRACTALS.has(params.fractal)) {
    data.fill(0);
    renderPointFractal(w, h, data, cx0, cy0, ps);
    return;
  }

  if (LINE_FRACTALS.has(params.fractal)) {
    renderLineFractal(w, h);
    return;
  }

  const { fn, backend } = getActiveFractalFn();
  if (!fn) {
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, w, h);
    rendering = false;
    canvas.parentElement.classList.remove("rendering");
    updateStatusBar(`${params.fractal} : WASM required (missing export)`, true);
    return;
  }

  let row = 0;
  const ROWS_PER_FRAME = 8;

  function step() {
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
        }
        const [r, g, b] = getColor(iterColor, max, pal);
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

fractalSelect.addEventListener("change", () => {
  params.fractal = fractalSelect.value;
  resetView();
  loadSources(params.fractal);
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
  newton:                      "fractales_dynamique",
  phoenix:                     "fractales_dynamique",
  barnsley:                    "fractales_ifs",
  sierpinski:                  "fractales_ifs",
  koch:                        "fractales_lsystem",
  magnet1:                     "fractales_magnetiques",
  magnet2:                     "fractales_magnetiques",
  lambda_fractale:             "fractales_magnetiques",
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
    .replace(/\b(mandelbrot|mandelbrot_classe|julia|burning_ship|tricorn|multibrot|celtic|buffalo|perpendicular_burning_ship|newton|phoenix|barnsley|sierpinski|koch|magnet1|magnet2|lambda_fractale|barnsley_etape|sierpinski_etape|koch_generer|norme_carre|complexe_diviser_re|complexe_diviser_im|iterer|etape|racine_approx|abs_val|remplacer|regle|generer)\b/g, `<span class="fn">$1</span>`)
    .replace(/\b(\d+\.\d+|\d+)\b/g, `<span class="num">$1</span>`)
    .replace(/\b(cx|cy|zx|zy|c_re|c_im|max_iter|x|y|iter|xtemp|ax|ay|x2|y2|fx|fy|dfx|dfy|denom|delta_x|delta_y|x_prec|y_prec|xtemp|ytemp|d1|d2|d3|puissance|rn|angle|r|theta|nx|ny)\b/g, `<span class="param">$1</span>`);
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
    .replace(/\b(mandelbrot|mandelbrot_classe|julia|burning_ship|tricorn|multibrot|celtic|buffalo|perpendicular_burning_ship|newton|phoenix|barnsley|sierpinski|koch|magnet1|magnet2|lambda_fractale|barnsley_etape|sierpinski_etape|koch_generer|norme_carre|complexe_diviser_re|complexe_diviser_im|iterer|etape|racine_approx|abs_val|remplacer|regle|generer)\b/g, `<span class="fn">$1</span>`)
    .replace(/\b(\d+\.\d+|\d+)\b/g, `<span class="num">$1</span>`)
    .replace(/\b(cx|cy|zx|zy|c_re|c_im|max_iter|x|y|iter|xtemp|ax|ay|x2|y2|fx|fy|dfx|dfy|denom|delta_x|delta_y|x_prec|y_prec|xtemp|ytemp|d1|d2|d3|puissance|rn|angle|r|theta|nx|ny)\b/g, `<span class="param">$1</span>`);
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
    zoomHint.textContent = "Toucher : zoom ×2 · Double toucher : dézoom · Pincer : zoom libre";
  }

  showZoomHint();
}

// Démarrer
init().catch(console.error);





