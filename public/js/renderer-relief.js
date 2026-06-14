"use strict";

// Relief 3D des fractales d'évasion — « voir n'importe quelle fractale comme un
// terrain ». On rééchantillonne la fractale active sur une grille grossière
// (le compte d'itérations devient une hauteur), puis on projette le champ en
// 3D via la même projection volumétrique WASM que l'atelier Croissance
// (src/fractales_volumetrique.multi). Aucune modification du chemin de rendu
// principal : c'est un échantillonnage indépendant et borné.
//
// Conformément à l'identité du projet, la projection (rotation + perspective)
// vit dans le .multi -> WASM ; ce module ne fait que de l'échantillonnage et du
// dessin (présentation). La rampe valeur->couleur est un choix d'affichage.

import { projeterPointVolumetrique } from "./renderer-process.js?v=20260614-plein-panneau";

// Fractales scalaires d'évasion dont la signature d'appel WASM est connue ici
// (cf. la boucle de remplissage de renderer.js). Les familles 3D / IFS / lignes
// / formules personnalisées ne sont pas des champs d'itérations échantillonnables
// de cette façon — le mode l'indique alors clairement.
const JULIA = new Set(["julia", "burning_julia", "julia_lisse", "julia_piege_cercle"]);

// Échantillonne le champ d'itérations de la fractale active sur une grille n×n
// couvrant la vue courante. `appelFractale(cx, cy)` encapsule la signature WASM.
// Renvoie un Float64Array de n*n comptes d'itérations (ligne par ligne).
export function echantillonnerChamp(appelFractale, vue, largeurCanvas, n) {
  const champ = new Float64Array(n * n);
  const span = Math.max(vue.pixelSize, Number.MIN_VALUE) * Math.max(1, largeurCanvas);
  const x0 = vue.centerX - span / 2;
  const y0 = vue.centerY - span / 2;
  const pas = span / Math.max(1, n - 1);
  for (let j = 0; j < n; j += 1) {
    const cy = y0 + j * pas;
    for (let i = 0; i < n; i += 1) {
      champ[j * n + i] = appelFractale(x0 + i * pas, cy);
    }
  }
  return champ;
}

// Construit l'appel WASM correct pour la fractale active (3 cas, comme la boucle
// de rendu) ; renvoie null si la fractale n'est pas un champ scalaire supporté.
export function appelFractalePour(fractal, fn, params) {
  if (typeof fn !== "function") return null;
  if (JULIA.has(fractal)) {
    return (cx, cy) => fn(cx, cy, params.juliaCre, params.juliaCim, params.maxIter);
  }
  if (fractal === "multibrot") {
    return (cx, cy) => fn(cx, cy, params.maxIter, params.multibrotPower);
  }
  return (cx, cy) => fn(cx, cy, params.maxIter);
}

// Normalise un champ d'itérations en hauteurs [0, 1]. Les points « intérieurs »
// (iter >= maxIter, jamais échappés) sont mis à plat (0) ; les points échappés
// montent avec le log du compte (le log écrase la dispersion et rend la
// frontière lisible). Pur et testable.
export function normaliserHauteurs(champ, maxIter) {
  const n = champ.length;
  const hauteurs = new Float64Array(n);
  const lmax = Math.log(maxIter + 1);
  for (let k = 0; k < n; k += 1) {
    const it = champ[k];
    hauteurs[k] = it >= maxIter ? 0 : Math.log(it + 1) / lmax;
  }
  return hauteurs;
}

function couleurRelief(t) {
  // Bleu profond (bas) -> turquoise -> ambre (haut) : un dégradé « topographique ».
  const u = Math.max(0, Math.min(1, t));
  const arrets = [[18, 24, 64], [30, 132, 160], [120, 198, 150], [240, 206, 110]];
  const seg = arrets.length - 1;
  const p = u * seg;
  const i = Math.min(seg - 1, Math.floor(p));
  const f = p - i;
  const a = arrets[i];
  const b = arrets[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// Dessine un champ de hauteurs n×n en relief 3D sur le contexte donné, via la
// projection `projeter(x, y, z, w, h, theta)` (WASM ou repli JS). Tri du peintre.
export function rendreRelief(ctx, largeur, hauteur, hauteurs, n, theta, projeter) {
  const AMP = 0.6;
  const tailleBase = (Math.min(largeur, hauteur) / n) * 1.8;
  const points = [];
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const vn = hauteurs[j * n + i];
      const sceneX = (i / Math.max(1, n - 1)) * 2 - 1;
      const sceneZ = (j / Math.max(1, n - 1)) * 2 - 1;
      const sceneY = 0.35 - vn * AMP;
      const [sx, sy, scale, depth] = projeter(sceneX, sceneY, sceneZ, largeur, hauteur, theta);
      points.push({ sx, sy, scale, depth, vn });
    }
  }
  points.sort((a, b) => a.depth - b.depth);
  ctx.clearRect(0, 0, largeur, hauteur);
  ctx.fillStyle = "#070a16";
  ctx.fillRect(0, 0, largeur, hauteur);
  for (const p of points) {
    const [r, g, b] = couleurRelief(p.vn);
    const taille = Math.max(0.8, tailleBase * p.scale);
    ctx.globalAlpha = Math.max(0.35, Math.min(1, 0.55 + p.depth * 0.45));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(p.sx - taille / 2, p.sy - taille / 2, taille, taille);
  }
  ctx.globalAlpha = 1;
}

// Contrôleur du mode Relief : échantillonne la fractale active et l'anime en 3D.
// Tolérant aux éléments absents. `projeterVolumetrique` est l'export WASM ; à
// défaut, repli JS identique.
export function creerStudioRelief(deps = {}) {
  const {
    canvas,
    boutonActualiser,
    lectureInfo,
    getView,
    getParams,
    getWasmFunctions,
    projeterVolumetrique = null,
    requestFrame = (cb) => requestAnimationFrame(cb),
    cancelFrame = (id) => cancelAnimationFrame(id),
    resolution = 72,
  } = deps;

  // Cible de rendu active : l'aperçu du dock par défaut, ou le canvas plein
  // panneau quand l'utilisateur agrandit le studio (cibler()). Le dessin et le
  // ré-échantillonnage suivent `canvasActif` (la largeur fixe la zone couverte).
  let canvasActif = canvas;
  let ctx = canvasActif ? canvasActif.getContext("2d") : null;
  let hauteurs = null;
  let theta = 0.6;
  let frameId = null;

  function projeter(x, y, z, w, h, t) {
    if (projeterVolumetrique) {
      const r = projeterVolumetrique(x, y, z, w, h, t);
      return Array.isArray(r) ? r : [r[0], r[1], r[2], r[3]];
    }
    return projeterPointVolumetrique(x, y, z, w, h, t);
  }

  function echantillonner() {
    const params = getParams ? getParams() : {};
    const fn = getWasmFunctions ? getWasmFunctions()[params.fractal] : null;
    const appel = appelFractalePour(params.fractal, fn, params);
    if (!appel) {
      hauteurs = null;
      if (lectureInfo) {
        lectureInfo.textContent = "Relief disponible pour les fractales d'évasion scalaires (Mandelbrot, Julia, …).";
      }
      if (ctx) { ctx.clearRect(0, 0, canvasActif.width, canvasActif.height); ctx.fillStyle = "#070a16"; ctx.fillRect(0, 0, canvasActif.width, canvasActif.height); }
      return;
    }
    const champ = echantillonnerChamp(appel, getView(), canvasActif ? canvasActif.width : 280, resolution);
    hauteurs = normaliserHauteurs(champ, params.maxIter || 256);
    if (lectureInfo) lectureInfo.textContent = `Relief de « ${params.fractal} » · grille ${resolution}×${resolution}`;
    peindre();
  }

  function peindre() {
    if (!ctx || !hauteurs) return;
    rendreRelief(ctx, canvasActif.width, canvasActif.height, hauteurs, resolution, theta, projeter);
  }

  // Redirige le rendu vers un autre canvas (plein panneau) puis ré-échantillonne :
  // la largeur de la cible fixe la zone de la fractale couverte, donc un canvas
  // plein panneau montre la même région que la vue principale. `null` rend l'aperçu.
  function cibler(nouveauCanvas) {
    canvasActif = nouveauCanvas || canvas;
    ctx = canvasActif ? canvasActif.getContext("2d") : null;
    echantillonner();
  }

  function boucle() {
    if (!hauteurs) return;
    theta += 0.02;
    peindre();
    frameId = requestFrame(boucle);
  }

  function demarrer() {
    echantillonner();
    if (hauteurs && frameId == null) frameId = requestFrame(boucle);
  }

  function arreter() {
    if (frameId != null) cancelFrame(frameId);
    frameId = null;
  }

  if (boutonActualiser) boutonActualiser.addEventListener("click", () => { arreter(); demarrer(); });

  return { demarrer, arreter, echantillonner, cibler, peindre, hauteurs: () => hauteurs };
}
