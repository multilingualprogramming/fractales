// Web Worker pour rendu parallèle de tuiles fractales scalaires.
//
// Charge le module WASM (mandelbrot.wasm) et expose un protocole simple :
//   { type:"init", wasmUrl }           -> { type:"ready" }
//   { type:"tile", tileId, ... }       -> { type:"tile-done", tileId, iters: Float64Array.buffer }
// Le main thread agrège les itérations par tuile puis applique la palette.
//
// Le module n'importe que WASI (fd_write/read/args_*) ; on fournit des stubs
// inertes (ces fonctions ne sont pas appelées par les exports scalaires).

"use strict";

let exportsRef = null;

const wasiStub = {
  fd_write() { return 0; },
  fd_read() { return 0; },
  args_sizes_get() { return 0; },
  args_get() { return 0; },
};

async function chargerWasm(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} pour ${url}`);
  const bytes = await resp.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {
    wasi_snapshot_preview1: wasiStub,
  });
  exportsRef = instance.exports;
}

// Itère une tuile [px=0..w, py=hStart..hEnd) du plan fractal scalaire.
// La conversion f64 du résultat WASM est conservée telle quelle (utilisée
// pour le mode lisse et la coloration smooth-iter par le main thread).
function calculerTuile(msg) {
  const { fractal, cx0, cy0, ps, w, hStart, hEnd, maxIter, juliaCre, juliaCim, multibrotPower } = msg;
  const fn = exportsRef[fractal];
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
  const msg = event.data;
  try {
    if (msg.type === "init") {
      await chargerWasm(msg.wasmUrl);
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
