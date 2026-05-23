// Web Worker pour rendu parallèle de tuiles fractales scalaires.
//
// Charge le module WASM (mandelbrot.wasm) et expose un protocole simple :
//   { type:"init" }                    -> { type:"ready" }
//   { type:"tile", tileId, ... }       -> { type:"tile-done", tileId, iters: Float64Array.buffer }
// Le main thread agrège les itérations par tuile puis applique la palette.
//
// Le module n'importe que WASI (fd_write/read/args_*) ; on fournit des stubs
// inertes (ces fonctions ne sont pas appelées par les exports scalaires).

"use strict";

let exportsRef = null;

const WASM_URL_AUTORISEE = new URL("../mandelbrot.wasm?v=20260520-formule-preview", self.location.href).href;
const ORIGINE_AUTORISEE = self.location.origin;

const wasiStub = {
  fd_write() { return 0; },
  fd_read() { return 0; },
  args_sizes_get() { return 0; },
  args_get() { return 0; },
};

async function chargerWasm() {
  const resp = await fetch(WASM_URL_AUTORISEE);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} pour ${WASM_URL_AUTORISEE}`);
  const bytes = await resp.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {
    wasi_snapshot_preview1: wasiStub,
  });
  exportsRef = instance.exports;
}

function origineMessageValide(event) {
  // Dans un DedicatedWorker, certains navigateurs exposent origin comme chaîne
  // vide pour les messages du document parent. On accepte ce cas local.
  return event.origin === ORIGINE_AUTORISEE || event.origin === "";
}

function obtenirFonctionScalaire(fractale) {
  if (!exportsRef) return null;
  switch (fractale) {
    case "mandelbrot": return exportsRef.mandelbrot;
    case "mandelbrot_classe": return exportsRef.mandelbrot_classe;
    case "burning_ship": return exportsRef.burning_ship;
    case "tricorn": return exportsRef.tricorn;
    case "julia": return exportsRef.julia;
    case "multibrot": return exportsRef.multibrot;
    case "celtic": return exportsRef.celtic;
    case "buffalo": return exportsRef.buffalo;
    case "perpendicular_burning_ship": return exportsRef.perpendicular_burning_ship;
    case "heart": return exportsRef.heart;
    case "perpendicular_mandelbrot": return exportsRef.perpendicular_mandelbrot;
    case "perpendicular_celtic": return exportsRef.perpendicular_celtic;
    case "duck": return exportsRef.duck;
    case "newton": return exportsRef.newton;
    case "phoenix": return exportsRef.phoenix;
    case "lyapunov": return exportsRef.lyapunov;
    case "lyapunov_multisequence": return exportsRef.lyapunov_multisequence;
    case "bassin_newton_generalise": return exportsRef.bassin_newton_generalise;
    case "orbitale_de_nova": return exportsRef.orbitale_de_nova;
    case "collatz_complexe": return exportsRef.collatz_complexe;
    case "magnet1": return exportsRef.magnet1;
    case "magnet2": return exportsRef.magnet2;
    case "magnet3": return exportsRef.magnet3;
    case "lambda_fractale": return exportsRef.lambda_fractale;
    case "lambda_cubique": return exportsRef.lambda_cubique;
    case "magnet_cosinus": return exportsRef.magnet_cosinus;
    case "magnet_sinus": return exportsRef.magnet_sinus;
    case "nova_magnetique": return exportsRef.nova_magnetique;
    case "burning_julia": return exportsRef.burning_julia;
    case "biomorphe": return exportsRef.biomorphe;
    case "mandelbrot_lisse": return exportsRef.mandelbrot_lisse;
    case "julia_lisse": return exportsRef.julia_lisse;
    case "burning_ship_lisse": return exportsRef.burning_ship_lisse;
    case "tricorn_lisse": return exportsRef.tricorn_lisse;
    case "mandelbrot_de": return exportsRef.mandelbrot_de;
    case "julia_de": return exportsRef.julia_de;
    case "mandelbrot_piege_cercle": return exportsRef.mandelbrot_piege_cercle;
    case "mandelbrot_piege_croix": return exportsRef.mandelbrot_piege_croix;
    case "mandelbrot_piege_ligne": return exportsRef.mandelbrot_piege_ligne;
    case "julia_piege_cercle": return exportsRef.julia_piege_cercle;
    case "formule_cosinus_c": return exportsRef.formule_cosinus_c;
    case "formule_biomorphe": return exportsRef.formule_biomorphe;
    case "formule_tricorne": return exportsRef.formule_tricorne;
    case "formule_perturbee_canonique": return exportsRef.formule_perturbee_canonique;
    case "formule_rationnelle_canonique": return exportsRef.formule_rationnelle_canonique;
    case "formule_exponentielle_canonique": return exportsRef.formule_exponentielle_canonique;
    case "formule_tangente_canonique": return exportsRef.formule_tangente_canonique;
    case "formule_norme_canonique": return exportsRef.formule_norme_canonique;
    default: return null;
  }
}

// Itère une tuile [px=0..w, py=hStart..hEnd) du plan fractal scalaire.
// La conversion f64 du résultat WASM est conservée telle quelle (utilisée
// pour le mode lisse et la coloration smooth-iter par le main thread).
function calculerTuile(msg) {
  const { fractal, cx0, cy0, ps, w, hStart, hEnd, maxIter, juliaCre, juliaCim, multibrotPower } = msg;
  const fn = obtenirFonctionScalaire(fractal);
  if (typeof fn !== "function") {
    throw new Error(`fractale inconnue ou non exportée : ${fractal}`);
  }
  const rows = hEnd - hStart;
  const iters = new Float64Array(w * rows);
  const estJulia = fractal === "julia"
    || fractal === "burning_julia"
    || fractal === "julia_lisse"
    || fractal === "julia_piege_cercle";
  const estMultibrot = fractal === "multibrot";
  for (let py = 0; py < rows; py++) {
    const cy = cy0 + (hStart + py) * ps;
    const base = py * w;
    for (let px = 0; px < w; px++) {
      const cx = cx0 + px * ps;
      let v;
      if (estJulia) v = fn(cx, cy, juliaCre, juliaCim, maxIter);
      else if (estMultibrot) v = fn(cx, cy, maxIter, multibrotPower);
      else v = fn(cx, cy, maxIter);
      iters[base + px] = v;
    }
  }
  return iters;
}

self.onmessage = async (event) => {
  if (!origineMessageValide(event)) return;
  const msg = event.data;
  try {
    if (msg.type === "init") {
      await chargerWasm();
      postMessage({ type: "ready" });
      return;
    }
    if (msg.type === "tile") {
      if (!exportsRef) {
        postMessage({ type: "tile-error", tileId: msg.tileId, error: "module non chargé" });
        return;
      }
      const iters = calculerTuile(msg);
      // Transfert zéro-copie du tampon vers le main thread.
      postMessage({ type: "tile-done", tileId: msg.tileId, iters: iters.buffer }, [iters.buffer]);
    }
  } catch (err) {
    postMessage({ type: "tile-error", tileId: msg.tileId, error: String(err?.message ?? err) });
  }
};
