"use strict";

const FRENCH_KEYWORDS = [
  "déf", "fonction", "classe", "retour", "tantque", "soit", "si", "sinonsi", "sinon",
  "pour", "dans", "Vrai", "Faux", "intervalle", "et", "ou", "non",
  "constante", "affirmer", "importer", "soi", "super",
];

const PYTHON_KEYWORDS = ["def", "return", "while", "if", "else", "for", "in", "True", "False", "and", "or", "not"];

const SHARED_SYMBOLS_RE = /\b(mandelbrot|mandelbrot_classe|julia|burning_ship|tricorn|multibrot|celtic|buffalo|perpendicular_burning_ship|heart|perpendicular_mandelbrot|perpendicular_celtic|duck|buddhabrot|newton|phoenix|lyapunov|lyapunov_multisequence|bassin_newton_generalise|orbitale_de_nova|collatz_complexe|attracteur_de_clifford|attracteur_de_peter_de_jong|attracteur_ikeda|attracteur_de_henon|lorenz_attractor|rossler_attractor|aizawa_attractor|sprott_attractor|feigenbaum_tree|barnsley|sierpinski|tapis_sierpinski|menger_sponge|mandelbulb|vicsek_fractal|lichtenberg_figures|koch|dragon_heighway|courbe_levy_c|gosper_curve|cantor_set|triangle_de_cercles_recursifs|apollonian_gasket|t_square_fractal|h_fractal|hilbert_curve|peano_curve|arbre_pythagore|magnet1|magnet2|magnet3|lambda_fractale|lambda_cubique|magnet_cosinus|magnet_sinus|nova_magnetique|burning_julia|biomorphe|duffing_attractor|mandelbrot_lisse|julia_lisse|burning_ship_lisse|tricorn_lisse|mandelbrot_piege_cercle|mandelbrot_piege_croix|mandelbrot_piege_ligne|julia_piege_cercle|log_lisse|abs_lisse|abs_orbitrap|min_orbitrap|barnsley_etape|sierpinski_etape|menger_etape|vicsek_etape|projeter_menger_x|projeter_menger_y|projeter_lorenz_x|projeter_lorenz_y|etapeTapisSierpinski|etapeAttracteurClifford|etapeAttracteurPeterDeJong|etapeAttracteurIkeda|etapeAttracteurHenon|etapeLorenzAttractor|etapeRosslerAttractor|etapeAizawaAttractor|etapeSprottAttractor|etapeMengerSponge|etapeVicsekFractal|etapeLichtenberg|etapeMandelbulb|projeterMengerSponge|projeterLorenzAttractor|projeterRosslerAttractor|projeterAizawaAttractor|projeterSprottAttractor|projeterMandelbulb|koch_generer|genererDragonHeighway|genererCourbeLevyC|genererGosper|genererHilbert|genererPeano|norme_carre|complexe_diviser_re|complexe_diviser_im|iterer|etape|racine_approx|abs_val|abs_dynamique|abs_koch|remplacer|regle|generer|sinus_dynamique|cosinus_dynamique|sinus_magnetique|cosinus_magnetique)\b/g;

const SHARED_PARAMS_RE = /\b(cx|cy|zx|zy|c_re|c_im|max_iter|x|y|iter|xtemp|ax|ay|x2|y2|fx|fy|dfx|dfy|denom|delta_x|delta_y|x_prec|y_prec|xtemp|ytemp|d1|d2|d3|d4|puissance|rn|angle|r|theta|nx|ny|a|b|niveau|echelle|dist|score|somme|exposant|parametre)\b/g;

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applySharedTokens(line, keywordRegex) {
  return line
    .replace(keywordRegex, `<span class="kw">$1</span>`)
    .replace(SHARED_SYMBOLS_RE, `<span class="fn">$1</span>`)
    .replace(/\b(\d+\.\d+|\d+)\b/g, `<span class="num">$1</span>`)
    .replace(SHARED_PARAMS_RE, `<span class="param">$1</span>`);
}

function highlightLineByLine(code, keywordRegex) {
  return code.split("\n").map((line) => {
    const commentIndex = line.indexOf("#");
    if (commentIndex !== -1) {
      const before = line.slice(0, commentIndex);
      const comment = line.slice(commentIndex);
      return applySharedTokens(before, keywordRegex) + `<span class="cmt">${comment}</span>`;
    }
    return applySharedTokens(line, keywordRegex);
  }).join("\n");
}

function highlightFrench(code) {
  return highlightLineByLine(code, new RegExp(`\\b(${FRENCH_KEYWORDS.join("|")})\\b`, "g"));
}

function highlightPython(code) {
  return highlightLineByLine(code, new RegExp(`\\b(${PYTHON_KEYWORDS.join("|")})\\b`, "g"));
}

function formaterNombreFrancais(value) {
  if (value === null || value === undefined) return "N/A";
  return value.toLocaleString("fr-FR");
}

function renderBenchmarkBadge(badgeDiv, data) {
  const {
    python_ms,
    wasm_ms,
    speedup,
    wasm_available,
    wasm_estimated,
    wasm_pipeline,
  } = data;

  const benchmarkDisabled = wasm_pipeline === "multilingual_official_wat2wasm" &&
    python_ms === null &&
    wasm_ms === null;

  let html = "";
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
      ? `${typeof speedup === "number" ? speedup.toFixed(1) : formaterNombreFrancais(speedup)}× plus rapide`
      : "";
    html += `
      <div class="badge-row">
        <span class="badge-wasm">? ~${formaterNombreFrancais(wasm_ms)} ms</span>
        <span class="badge-label">${wasmLabel}</span>
      </div>
      <div class="badge-row">
        <span class="badge-python">PY ${formaterNombreFrancais(python_ms)} ms</span>
        <span class="badge-label">Python</span>
      </div>
      ${speedupLabel ? `<div class="badge-row"><span class="badge-speedup">${speedupLabel}</span></div>` : ""}`;
  } else {
    html += `
      <div class="badge-row">
        <span class="badge-python">PY ${formaterNombreFrancais(python_ms)} ms</span>
        <span class="badge-label">Python</span>
      </div>
      <div class="badge-row">
        <span class="badge-python" style="color:var(--text-dim)">WASM non disponible</span>
      </div>`;
  }

  badgeDiv.innerHTML = html;
}

export function initialiserPanneauSource({
  fractalSourceMap,
  tabFrench,
  tabPython,
  codeFrench,
  codePython,
  panelFrench,
  panelPython,
  badgeDiv,
  badgeLoading,
}) {
  const sourcesCache = {};

  tabFrench.addEventListener("click", () => {
    tabFrench.classList.add("active");
    tabPython.classList.remove("active");
    panelFrench.style.display = "";
    panelPython.style.display = "none";
  });

  tabPython.addEventListener("click", () => {
    tabPython.classList.add("active");
    tabFrench.classList.remove("active");
    panelFrench.style.display = "none";
    panelPython.style.display = "";
  });

  async function loadSources(fractalName) {
    const module = fractalSourceMap[fractalName] ?? "main";
    tabFrench.textContent = `FR ${module}.ml`;
    tabPython.textContent = `PY ${module}.py`;

    if (sourcesCache[module]) {
      codeFrench.innerHTML = sourcesCache[module].mlHtml;
      codePython.innerHTML = sourcesCache[module].pyHtml;
      return;
    }

    codeFrench.innerHTML = `<span class="cmt"># Chargement de ${module}.ml…</span>`;
    codePython.innerHTML = `<span class="cmt"># Chargement de ${module}.py…</span>`;

    let mlHtml;
    try {
      const response = await fetch(`${module}.ml`);
      const source = response.ok ? await response.text() : `# Source indisponible (${module}.ml)`;
      mlHtml = highlightFrench(escapeHtml(source));
    } catch {
      mlHtml = `<span class="cmt"># Impossible de charger ${module}.ml</span>`;
    }
    codeFrench.innerHTML = mlHtml;

    let pyHtml;
    try {
      const response = await fetch(`${module}.py`);
      const source = response.ok ? await response.text() : `# Transpilation indisponible (${module}.py)`;
      pyHtml = highlightPython(escapeHtml(source));
    } catch {
      pyHtml = `<span class="cmt"># Impossible de charger ${module}.py</span>`;
    }
    codePython.innerHTML = pyHtml;

    sourcesCache[module] = { mlHtml, pyHtml };
  }

  async function loadBenchmark() {
    try {
      const response = await fetch("benchmark.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      renderBenchmarkBadge(badgeDiv, data);
    } catch (error) {
      console.warn("[Benchmark] Données indisponibles :", error.message);
      if (badgeLoading) badgeLoading.textContent = "Données benchmark indisponibles";
    }
  }

  return { loadSources, loadBenchmark };
}
