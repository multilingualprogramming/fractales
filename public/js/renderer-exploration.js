"use strict";

const TITRES_MODES = {
  parametres: ["Carte des paramètres", "Explorer le plan du paramètre c"],
  temps: ["Carnet de voyage", "Composer une trajectoire de vues"],
  palette: ["Physique de palette", "Nouveaux modes de coloration"],
  abysses: ["Mode Abysses", "Zoom profond et précision"],
  studio3d: ["Studio 3D", "Caméra, matière et profondeur"],
  lsysteme: ["Atelier L-système", "Générations et propositions locales"],
  meteo: ["Météo mathématique", "Surcouches d'analyse visuelle"],
};

const JULIA_FRACTALS = new Set(["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"]);
const STORAGE_JOURNEYS = "fractales_carnet_voyage";

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

function iterationMandelbrot(cx, cy, maxIter) {
  let x = 0.0;
  let y = 0.0;
  for (let i = 0; i < maxIter; i++) {
    const x2 = x * x - y * y + cx;
    y = 2.0 * x * y + cy;
    x = x2;
    if (x * x + y * y > 4.0) return i;
  }
  return maxIter;
}

function calculerOrbite(fractal, point, params) {
  const points = [];
  let x = JULIA_FRACTALS.has(fractal) ? point.re : 0.0;
  let y = JULIA_FRACTALS.has(fractal) ? point.im : 0.0;
  const cx = JULIA_FRACTALS.has(fractal) ? params.juliaCre : point.re;
  const cy = JULIA_FRACTALS.has(fractal) ? params.juliaCim : point.im;
  const max = Math.min(320, Math.max(32, params.maxIter | 0));
  for (let i = 0; i < max; i++) {
    points.push({ re: x, im: y });
    const absX = fractal === "burning_ship" || fractal === "burning_julia" ? Math.abs(x) : x;
    const absY = fractal === "burning_ship" || fractal === "burning_julia" ? Math.abs(y) : y;
    const nx = absX * absX - absY * absY + cx;
    const ny = 2.0 * absX * absY + cy;
    x = nx;
    y = fractal === "tricorn" ? -ny : ny;
    if (x * x + y * y > 16.0) break;
  }
  return points;
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

function dessinerPropositionLSysteme(canvas, axiom, rulesText, angleDeg, generations) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(2, 4, 10, 0.96)";
  ctx.fillRect(0, 0, w, h);
  const rules = new Map();
  rulesText.split(/\n|;/).forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) rules.set(key.trim()[0], value.trim());
  });
  let sequence = axiom || "F";
  for (let i = 0; i < clamp(generations, 0, 8); i++) {
    let next = "";
    for (const ch of sequence) next += rules.get(ch) ?? ch;
    sequence = next.slice(0, 14000);
  }
  let x = 0;
  let y = 0;
  let a = 0;
  const angle = angleDeg * Math.PI / 180;
  const stack = [];
  const points = [{ x, y }];
  for (const ch of sequence) {
    if (ch === "F" || ch === "G") {
      x += Math.cos(a);
      y += Math.sin(a);
      points.push({ x, y });
    } else if (ch === "+") a += angle;
    else if (ch === "-") a -= angle;
    else if (ch === "[") stack.push([x, y, a]);
    else if (ch === "]" && stack.length) {
      [x, y, a] = stack.pop();
      points.push({ x, y, move: true });
    }
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((w - 28) / Math.max(1, maxX - minX), (h - 28) / Math.max(1, maxY - minY));
  ctx.strokeStyle = "#00d4ff";
  ctx.lineWidth = 1.35;
  ctx.beginPath();
  points.forEach((p, index) => {
    const px = 14 + (p.x - minX) * scale;
    const py = h - 14 - (p.y - minY) * scale;
    if (index === 0 || p.move) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
}

function lirePropositionLSysteme() {
  return {
    axiom: document.getElementById("lsystem-axiom-input")?.value || "F",
    rules: document.getElementById("lsystem-rules-input")?.value || "F=F+F--F+F",
    angle: parseFloat(document.getElementById("lsystem-angle-input")?.value || "60"),
    generations: parseInt(document.getElementById("lsystem-generation-slider")?.value || "4", 10),
  };
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
  } = elements;

  const {
    getView,
    getParams,
    getWasmFunctions,
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
    lineFractals,
  } = dependencies;

  let activeMode = null;
  let capturedOrbit = [];
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
      ctx.strokeStyle = "rgba(255, 244, 180, 0.9)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      capturedOrbit.forEach((point, index) => {
        const p = coordToPixel(point, overlayCanvas, view);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      const first = coordToPixel(capturedOrbit[0], overlayCanvas, view);
      ctx.fillStyle = "#00ff9f";
      ctx.beginPath(); ctx.arc(first.x, first.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawParameterMap() {
    if (!parameterCanvas) return;
    const ctx = parameterCanvas.getContext("2d");
    const w = parameterCanvas.width;
    const h = parameterCanvas.height;
    const image = ctx.createImageData(w, h);
    const wasm = getWasmFunctions();
    const fn = wasm?.julia;
    const params = getParams();
    const max = 72;
    for (let y = 0; y < h; y++) {
      const ci = 1.4 - y / Math.max(1, h - 1) * 2.8;
      for (let x = 0; x < w; x++) {
        const cr = -2.0 + x / Math.max(1, w - 1) * 4.0;
        const iter = fn ? fn(0, 0, cr, ci, max) : iterationMandelbrot(cr, ci, max);
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
      if (activeMode === "lsysteme") updateLSystemProposal();
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
    list.innerHTML = items.map((item, index) => `
      <div class="journey-item">
        <span><strong>${index + 1}</strong> ${item.fractal} · ${item.maxIter} it.</span>
        <button class="btn btn-secondary" type="button" data-journey-index="${index}">Aller</button>
      </div>
    `).join("");
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
    dessinerPropositionLSysteme(lsystemCanvas, proposition.axiom, proposition.rules, proposition.angle, proposition.generations);
    const readout = document.getElementById("lsystem-proposal-readout");
    if (readout) {
      const active = getParams().lsystemProposalActive ? "appliquée" : "locale";
      readout.textContent = `Proposition ${active} · ${proposition.generations} génération(s), angle ${formatNombre(proposition.angle, 1)}° · non canonique`;
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

  ["lsystem-generation-slider", "lsystem-angle-input", "lsystem-axiom-input", "lsystem-rules-input"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateLSystemProposal);
  });

  document.getElementById("btn-lsystem-apply")?.addEventListener("click", () => {
    const proposition = lirePropositionLSysteme();
    applyLSystemProposal?.(proposition);
    updateLSystemProposal();
  });

  document.getElementById("btn-lsystem-clear")?.addEventListener("click", () => {
    clearLSystemProposal?.();
    updateLSystemProposal();
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

  document.getElementById("btn-capture-orbit")?.addEventListener("click", () => {
    captureOrbitPending = true;
    updateStatusBar("Cliquez un point du canvas pour capturer son orbite", true);
  });

  getActiveCanvas().addEventListener("click", (event) => {
    if (!captureOrbitPending) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    captureOrbitPending = false;
    const canvas = getActiveCanvas();
    const point = canvasToComplexLocal(event.offsetX, event.offsetY, canvas, getView());
    capturedOrbit = calculerOrbite(getParams().fractal, point, getParams());
    const values = new Set(activeWeather());
    values.add("orbite");
    setParamsPatch({ weatherOverlays: [...values].join(",") });
    document.querySelectorAll(".weather-toggle").forEach((input) => {
      input.checked = values.has(input.value);
    });
    const readout = document.getElementById("weather-readout");
    if (readout) readout.textContent = `${capturedOrbit.length} points · départ ${formatNombre(point.re, 5)} ${point.im >= 0 ? "+" : "-"} ${formatNombre(Math.abs(point.im), 5)}i`;
    drawWeather();
    updateHash();
  }, true);

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
    if (lsystemGeneration) lsystemGeneration.value = String(params.lsystemGenerations ?? 4);
    if (lsystemAngle) lsystemAngle.value = String(params.lsystemAngle ?? 60);
    if (lsystemAxiom) lsystemAxiom.value = params.lsystemAxiom || "F";
    if (lsystemRules) lsystemRules.value = params.lsystemRules || "F=F+F--F+F";
    const overlays = activeWeather();
    document.querySelectorAll(".weather-toggle").forEach((input) => {
      input.checked = overlays.has(input.value);
    });
    updateJourneyList();
    updateDeepZoomReadout();
    if (activeMode === "parametres") drawParameterMap();
    if (activeMode === "lsysteme") updateLSystemProposal();
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
