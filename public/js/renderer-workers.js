// Pool de Web Workers pour rendu parallèle des fractales scalaires.
//
// Charge `render-worker.js` * N (N ≈ hardwareConcurrency-1, plafonné à 8) ;
// chaque worker instancie sa propre copie du module WASM. Le pool découpe le
// canvas en tuiles horizontales (rangées) et dispatch en round-robin. Aucune
// SharedArrayBuffer requise (donc compatible GitHub Pages sans en-têtes COOP/COEP) :
// les itérations transitent en transfert zéro-copie via Float64Array.buffer.

"use strict";

const WORKER_URL = "./js/render-worker.js?v=20260522-parallel";
const WASM_URL = "mandelbrot.wasm?v=20260520-formule-preview";

let poolInstance = null;
let poolInitFailed = false;

function detecterNombreDeWorkers() {
  const hw = typeof navigator !== "undefined" ? Number(navigator.hardwareConcurrency) : 0;
  if (Number.isFinite(hw) && hw > 1) return Math.min(8, Math.max(2, hw - 1));
  return 2;
}

class WorkerPool {
  constructor(count) {
    this.workers = [];
    this.ready = [];
    for (let i = 0; i < count; i++) {
      const worker = new Worker(WORKER_URL);
      this.workers.push(worker);
      this.ready.push(new Promise((resolve) => {
        const handler = (event) => {
          if (event.data?.type === "ready") {
            worker.removeEventListener("message", handler);
            resolve();
          }
        };
        worker.addEventListener("message", handler);
      }));
      worker.postMessage({ type: "init", wasmUrl: WASM_URL });
    }
  }

  async pretsAEtre() {
    await Promise.all(this.ready);
  }

  /**
   * Distribue `jobs` (descripteurs de tuiles) sur les workers en round-robin.
   * Résout avec un tableau de Float64Array (un par tuile, dans l'ordre des jobs).
   * Chaque job : { fractal, cx0, cy0, ps, w, hStart, hEnd, maxIter, juliaCre, juliaCim, multibrotPower }
   */
  async calculerTuiles(jobs) {
    await this.pretsAEtre();
    const results = new Array(jobs.length);
    if (jobs.length === 0) return results;
    return new Promise((resolveAll, rejectAll) => {
      let pending = jobs.length;
      let nextJob = 0;
      const dispatch = (workerIdx) => {
        if (nextJob >= jobs.length) return;
        const jobIdx = nextJob++;
        const worker = this.workers[workerIdx];
        const handler = (event) => {
          const msg = event.data;
          if (msg.type === "tile-done" && msg.tileId === jobIdx) {
            worker.removeEventListener("message", handler);
            results[jobIdx] = new Float64Array(msg.iters);
            pending--;
            if (pending === 0) resolveAll(results);
            else dispatch(workerIdx);
          } else if (msg.type === "tile-error" && msg.tileId === jobIdx) {
            worker.removeEventListener("message", handler);
            rejectAll(new Error(msg.error));
          }
        };
        worker.addEventListener("message", handler);
        worker.postMessage({ ...jobs[jobIdx], tileId: jobIdx, type: "tile" });
      };
      for (let i = 0; i < this.workers.length; i++) dispatch(i);
    });
  }
}

export function workersDisponibles() {
  return typeof Worker !== "undefined" && !poolInitFailed;
}

export function obtenirPoolDeWorkers() {
  if (poolInstance || poolInitFailed) return poolInstance;
  if (!workersDisponibles()) return null;
  try {
    poolInstance = new WorkerPool(detecterNombreDeWorkers());
  } catch (err) {
    console.warn("[workers] initialisation impossible :", err);
    poolInitFailed = true;
    poolInstance = null;
  }
  return poolInstance;
}

export function nombreDeWorkersDuPool() {
  return poolInstance ? poolInstance.workers.length : 0;
}
