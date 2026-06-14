"use strict";

// Atelier « Croissance » — fractales vivantes (processus semantic-core-v1).
//
// Une fractale n'est plus seulement une image figée : c'est un processus
// ⟨État, Topologie, Règle, Ordonnancement⟩ écrit en multilingue, compilé en un
// manifeste JSON, et déroulé dans le temps par le pas universel partagé
// (process_core.js, vendu verbatim depuis multilingual). Ce module charge un
// manifeste, calcule sa trajectoire et projette chaque image sur un canvas.
//
// Conformément à l'identité du projet, toute la *dynamique* (la règle de taux,
// la réécriture) vit dans les .multi -> manifeste -> pas universel. Le JS ne
// fait ici que du DOM et de la présentation : la rampe valeur->couleur d'un
// champ est une affaire d'affichage, pas une primitive mathématique.

import { run, tierOf, TIER_NAMES } from "./process/process_core.js";

// Catalogue des processus disponibles. `fichier` est le manifeste construit par
// scripts/build_processes.py ; `champ` est la valeur projetée ; `palette` choisit
// la rampe ; `pasDefaut`/`pasMax` bornent la longueur de trajectoire calculée.
export const CATALOGUE_PROCESSUS = [
  {
    cle: "gray_scott",
    nom: "Gray-Scott (réaction-diffusion)",
    fichier: "process/program.gray_scott.v1.json",
    champ: "v",
    palette: "thermique",
    pasDefaut: 240,
    pasMax: 600,
    description: "Réaction autocatalytique U+2V→3V : des taches qui se divisent et se répliquent.",
  },
  {
    cle: "reaction_diffusion",
    nom: "Turing (instabilité linéaire)",
    fichier: "process/program.reaction_diffusion.v1.json",
    champ: "u",
    palette: "thermique",
    pasDefaut: 160,
    pasMax: 400,
    description: "Système activateur-inhibiteur linéarisé : une longueur d'onde de Turing émerge du bruit.",
  },
  {
    cle: "automate_parite",
    nom: "Automate de parité (Fredkin)",
    fichier: "process/program.automate_parite.v1.json",
    champ: "vivant",
    palette: "encre",
    pasDefaut: 31,
    pasMax: 63,
    description: "Règle XOR de von Neumann : une fractale de Sierpiński se réplique à chaque puissance de deux.",
  },
  {
    cle: "automate_universel",
    nom: "Automate universel (Jeu de la vie)",
    fichier: "process/program.automate_universel.v1.json",
    champ: "vivant",
    palette: "encre",
    pasDefaut: 60,
    pasMax: 180,
    description: "Règle B3/S23 de Conway : un canon de Gosper émet des planeurs dans un automate universel.",
  },
  {
    cle: "eden",
    nom: "Croissance d'Eden (stochastique)",
    fichier: "process/program.eden.v1.json",
    champ: "alive",
    palette: "encre",
    pasDefaut: 40,
    pasMax: 80,
    description: "Accrétion aléatoire : un amas grandit cellule par cellule, frontière rugueuse fractale (classe KPZ).",
  },
];

export function trouverProcessus(cle) {
  return CATALOGUE_PROCESSUS.find((p) => p.cle === cle) || null;
}

// Dimensions de la grille d'un noyau treillis, lues sur la topologie quand elles
// existent, sinon déduites des coordonnées des loci (robuste aux manifestes sans
// largeur/hauteur explicites).
// `geometrieWasm` (optionnel) porte les réductions vers WASM (fractales_processus
// .multi) ; à défaut, repli JS identique. La géométrie d'un champ (étendue, grille)
// est une primitive mathématique : conformément à l'identité du projet, elle vit
// en multilingue dès que le module est chargé.
export function dimensionsGrille(core, geometrieWasm = null) {
  const topo = core.topology || {};
  if (Number.isFinite(topo.width) && Number.isFinite(topo.height)) {
    return { largeur: topo.width, hauteur: topo.height };
  }
  const xs = [];
  const ys = [];
  for (const rec of core.state.loci) {
    if (!Array.isArray(rec.locus)) continue;
    xs.push(rec.locus[0]);
    ys.push(rec.locus[1]);
  }
  if (geometrieWasm && xs.length) {
    const [largeur, hauteur] = geometrieWasm.dimensionsGrille(xs, ys);
    return { largeur, hauteur };
  }
  let largeur = 0;
  let hauteur = 0;
  for (let k = 0; k < xs.length; k += 1) {
    largeur = Math.max(largeur, xs[k] + 1);
    hauteur = Math.max(hauteur, ys[k] + 1);
  }
  return { largeur, hauteur };
}

// Étendue [min, max] d'un champ sur une image, pour le contraste automatique.
export function etendueChamp(core, champ, geometrieWasm = null) {
  const valeurs = [];
  for (const rec of core.state.loci) {
    const v = rec[champ];
    if (typeof v === "number") valeurs.push(v);
  }
  if (valeurs.length === 0) return { min: 0, max: 1 };
  if (geometrieWasm) {
    const [min, max] = geometrieWasm.etendueChamp(valeurs);
    if (!Number.isFinite(min)) return { min: 0, max: 1 }; // champ tout-NaN, comme le JS
    return { min, max };
  }
  let min = Infinity;
  let max = -Infinity;
  for (let k = 0; k < valeurs.length; k += 1) {
    if (valeurs[k] < min) min = valeurs[k];
    if (valeurs[k] > max) max = valeurs[k];
  }
  if (!Number.isFinite(min)) return { min: 0, max: 1 };
  if (min === max) max = min + 1; // évite la division par zéro sur un champ plat
  return { min, max };
}

function melange(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// Rampe thermique à 5 arrêts (bleu nuit -> cyan -> vert -> jaune -> rouge) pour
// un champ continu normalisé t∈[0,1]. Renvoie [r, g, b].
const ARRETS_THERMIQUE = [
  [12, 16, 48],
  [22, 138, 173],
  [120, 200, 90],
  [245, 215, 66],
  [222, 60, 75],
];

// `rampeWasm` est l'export WASM couleur_thermique (src/fractales_couleur.multi) :
// l'interpolation RGB vit en multilingue. À défaut (tests hors navigateur, WASM
// non chargé), on retombe sur le repli JS identique ci-dessous — parité bit-à-bit
// vérifiée (trunc(x+0.5) == Math.round sur des canaux toujours positifs).
export function couleurChamp(t, palette, rampeWasm = null) {
  const u = Math.max(0, Math.min(1, t));
  if (palette === "encre") {
    // Binaire : encre sombre sur fond clair (l'automate discret). Pas une
    // interpolation — reste en JS (simple aiguillage de deux constantes).
    const vivant = u > 0.5;
    return vivant ? [24, 26, 42] : [238, 240, 245];
  }
  if (rampeWasm) {
    const c = rampeWasm(u);
    return [c[0], c[1], c[2]];
  }
  const arrets = ARRETS_THERMIQUE;
  const segments = arrets.length - 1;
  const pos = u * segments;
  const i = Math.min(segments - 1, Math.floor(pos));
  const f = pos - i;
  const a = arrets[i];
  const b = arrets[i + 1];
  return [melange(a[0], b[0], f), melange(a[1], b[1], f), melange(a[2], b[2], f)];
}

// Construit l'image RGBA (un pixel par cellule) d'une image de la trajectoire.
// Fonction pure et testable : aucune dépendance au DOM. Le canvas l'agrandit
// ensuite en pixels nets (image-rendering: pixelated).
export function construireImageProcessus(core, champ, palette, etendue, rampeWasm = null, geometrieWasm = null) {
  const { largeur, hauteur } = dimensionsGrille(core, geometrieWasm);
  const { min, max } = etendue || etendueChamp(core, champ, geometrieWasm);
  const echelle = max - min || 1;
  const rgba = new Uint8ClampedArray(largeur * hauteur * 4);
  for (const rec of core.state.loci) {
    if (!Array.isArray(rec.locus)) continue;
    const x = rec.locus[0];
    const y = rec.locus[1];
    if (x < 0 || y < 0 || x >= largeur || y >= hauteur) continue;
    const valeur = typeof rec[champ] === "number" ? rec[champ] : 0;
    const [r, g, b] = couleurChamp((valeur - min) / echelle, palette, rampeWasm);
    const o = (y * largeur + x) * 4;
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    rgba[o + 3] = 255;
  }
  return { largeur, hauteur, rgba };
}

// Repli JS de la projection volumétrique, miroir exact de projeter_volumetrique
// (src/fractales_volumetrique.multi) avec la trig native. Le rendu privilégie
// l'export WASM ; ce repli sert aux tests hors navigateur et au cas où le WASM
// n'est pas chargé. Renvoie [sx, sy, echelle, profondeur].
export function projeterPointVolumetrique(x, y, z, largeur, hauteur, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const rx = x * c - z * s;
  const rz = x * s + z * c;
  const persp = 1 / (1.8 - rz * 0.5);
  return [
    largeur / 2 + rx * largeur * 0.3 * persp,
    hauteur / 2 + y * hauteur * 0.35 * persp,
    persp,
    rz,
  ];
}

// Calcule la trajectoire d'un processus et une étendue *globale* (sur toutes les
// images) pour que le contraste ne saute pas pendant la lecture. Pure/testable.
export function calculerTrajectoire(core, pas, champ, geometrieWasm = null) {
  const trajectoire = run(core, pas);
  let min = Infinity;
  let max = -Infinity;
  for (const image of trajectoire) {
    const e = etendueChamp(image, champ, geometrieWasm);
    if (geometrieWasm) {
      [min, max] = geometrieWasm.combinerEtendue(min, max, e.min, e.max);
    } else {
      if (e.min < min) min = e.min;
      if (e.max > max) max = e.max;
    }
  }
  if (!Number.isFinite(min)) { min = 0; max = 1; }
  if (min === max) max = min + 1;
  return { trajectoire, etendue: { min, max }, tier: tierOf(core), tierNom: TIER_NAMES[tierOf(core)] };
}

// Chargeur de manifeste par défaut (navigateur). Injectable pour les tests.
async function chargerManifesteParDefaut(fichier) {
  const reponse = await fetch(fichier, { cache: "no-store" });
  if (!reponse.ok) throw new Error(`manifeste introuvable: ${fichier} (${reponse.status})`);
  return reponse.json();
}

// Contrôleur de l'atelier : relie le catalogue, le canvas et les commandes
// (sélecteur, lecture/pause, curseur d'image, nombre de pas). Tout est tolérant
// aux éléments absents pour que l'initialisation ne casse jamais la page.
export function creerStudioProcessus(deps = {}) {
  const {
    canvas,
    selecteur,
    boutonLecture,
    curseur,
    champPas,
    lectureEtape,
    lectureTier,
    description,
    boutonRelief,
    projeterVolumetrique = null, // export WASM projeter_volumetrique (sinon repli JS)
    couleurThermique = null, // export WASM couleur_thermique (sinon repli JS)
    geometrieProcessus = null, // réductions géométriques WASM (fractales_processus.multi)
    setParamsPatch = () => {},
    updateHash = () => {},
    chargerManifeste = chargerManifesteParDefaut,
    requestFrame = (cb) => requestAnimationFrame(cb),
    cancelFrame = (id) => cancelAnimationFrame(id),
  } = deps;

  // Cible de rendu active : l'aperçu du dock par défaut, ou le canvas plein
  // panneau quand l'utilisateur agrandit le studio (cibler()). Tout le dessin
  // passe par `canvasActif`/`ctx` pour suivre la bascule sans dupliquer le code.
  let canvasActif = canvas;
  let ctx = canvasActif ? canvasActif.getContext("2d") : null;
  let etat = null; // { processus, trajectoire, etendue, tier, tierNom }
  let imageCourante = 0;
  let enLecture = false;
  let frameId = null;
  let relief3D = false;
  let theta = 0.6; // angle de rotation de la vue 3D
  // Caméra pilotée par les contrôles en plein panneau (zoom/déplacement en pixels
  // pour les deux modes ; rotation seulement en relief). `autoOrbit` se coupe à la
  // première rotation manuelle.
  let zoom = 1, panX = 0, panY = 0, autoOrbit = true;

  // Projette via WASM si disponible, sinon par le repli JS. Renvoie le quadruplet
  // [sx, sy, echelle, profondeur].
  // Publie l'état du studio dans le hash partageable (processus, image, relief)
  // via les params de l'application. Appelé sur les actions de l'utilisateur,
  // pas à chaque image d'animation, pour ne pas marteler l'URL.
  function publier() {
    if (!etat) return;
    setParamsPatch({
      processCroissance: etat.processus.cle,
      processStep: imageCourante,
      process3D: relief3D,
    });
    updateHash();
  }

  function projeter(x, y, z, w, h, t) {
    if (projeterVolumetrique) {
      const r = projeterVolumetrique(x, y, z, w, h, t);
      return Array.isArray(r) ? r : [r[0], r[1], r[2], r[3]];
    }
    return projeterPointVolumetrique(x, y, z, w, h, t);
  }

  function peindrePlat(core) {
    const { largeur, hauteur, rgba } = construireImageProcessus(
      core, etat.processus.champ, etat.processus.palette, etat.etendue, couleurThermique, geometrieProcessus,
    );
    // Dessine à la résolution de la grille sur un canvas hors-écran, puis
    // agrandit en pixels nets jusqu'à la taille d'affichage du canvas.
    const tampon = document.createElement("canvas");
    tampon.width = largeur;
    tampon.height = hauteur;
    tampon.getContext("2d").putImageData(new ImageData(rgba, largeur, hauteur), 0, 0);
    const w = canvasActif.width;
    const h = canvasActif.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    // Zoom autour du centre + déplacement (caméra plein panneau ; identité par défaut).
    ctx.translate(panX, panY);
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(tampon, 0, 0, w, h);
    ctx.restore();
  }

  // Relief 3D : la valeur du champ devient une hauteur. Chaque cellule est posée
  // sur le plan sol (x, z) et élevée de sa valeur normalisée ; on projette via le
  // WASM volumétrique, on trie par profondeur (algorithme du peintre) et on peint.
  function peindreRelief(core) {
    const champ = etat.processus.champ;
    const palette = etat.processus.palette;
    const { largeur, hauteur } = dimensionsGrille(core);
    const { min, max } = etat.etendue;
    const echelleVal = max - min || 1;
    const w = canvasActif.width;
    const h = canvasActif.height;
    const RELIEF = 0.55;
    const tailleBase = (Math.min(w, h) / Math.max(largeur, hauteur)) * 1.7;

    const points = [];
    for (const rec of core.state.loci) {
      if (!Array.isArray(rec.locus)) continue;
      const gx = rec.locus[0];
      const gy = rec.locus[1];
      const vn = ((typeof rec[champ] === "number" ? rec[champ] : 0) - min) / echelleVal;
      const sceneX = (gx / Math.max(1, largeur - 1)) * 2 - 1;
      const sceneZ = (gy / Math.max(1, hauteur - 1)) * 2 - 1;
      const sceneY = 0.35 - vn * RELIEF; // valeur haute -> vers le haut de l'écran
      const [sx, sy, scale, depth] = projeter(sceneX, sceneY, sceneZ, w, h, theta);
      points.push({ sx, sy, scale, depth, vn });
    }
    points.sort((a, b) => a.depth - b.depth); // loin -> près

    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b0e1a";
    ctx.fillRect(0, 0, w, h);
    for (const p of points) {
      const [r, g, b] = couleurChamp(p.vn, palette);
      const taille = Math.max(0.8, tailleBase * p.scale * zoom);
      const sx = (p.sx - cx) * zoom + cx + panX;
      const sy = (p.sy - cy) * zoom + cy + panY;
      ctx.globalAlpha = Math.max(0.35, Math.min(1, 0.55 + p.depth * 0.45));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(sx - taille / 2, sy - taille / 2, taille, taille);
    }
    ctx.globalAlpha = 1;
  }

  function peindre(index) {
    if (!ctx || !etat) return;
    imageCourante = Math.max(0, Math.min(etat.trajectoire.length - 1, index));
    const core = etat.trajectoire[imageCourante];
    if (relief3D) peindreRelief(core); else peindrePlat(core);
    if (curseur) curseur.value = String(imageCourante);
    if (lectureEtape) {
      lectureEtape.textContent = `Image ${imageCourante} / ${etat.trajectoire.length - 1}`;
    }
  }

  function majTier() {
    if (lectureTier && etat) {
      lectureTier.textContent = `Niveau ${etat.tier} · ${etat.tierNom}`;
    }
  }

  async function charger(cle, opts = {}) {
    const processus = trouverProcessus(cle);
    if (!processus) return;
    arreter();
    const core = await chargerManifeste(processus.fichier);
    const pas = champPas && Number(champPas.value) > 0
      ? Math.min(Number(champPas.value), processus.pasMax)
      : processus.pasDefaut;
    if (champPas) champPas.value = String(pas);
    const calc = calculerTrajectoire(core, pas, processus.champ, geometrieProcessus);
    etat = { processus, ...calc };
    if (curseur) {
      curseur.min = "0";
      curseur.max = String(etat.trajectoire.length - 1);
    }
    if (description) description.textContent = processus.description;
    majTier();
    // Relief / image de départ (depuis un lien partagé le cas échéant).
    if (opts.relief !== undefined && opts.relief !== relief3D) {
      relief3D = opts.relief;
      if (boutonRelief) {
        boutonRelief.textContent = relief3D ? "Vue 2D" : "Relief 3D";
        boutonRelief.setAttribute("aria-pressed", String(relief3D));
      }
    }
    peindre(Number.isFinite(opts.step) ? opts.step : 0);
    publier();
  }

  function pas() {
    if (!etat) return;
    const suivant = imageCourante + 1 >= etat.trajectoire.length ? 0 : imageCourante + 1;
    peindre(suivant);
  }

  function boucle() {
    if (!enLecture) return;
    if (relief3D && autoOrbit) theta += 0.02; // la vue 3D orbite pendant la lecture
    pas();
    frameId = requestFrame(boucle);
  }

  function basculerRelief() {
    relief3D = !relief3D;
    if (boutonRelief) {
      boutonRelief.textContent = relief3D ? "Vue 2D" : "Relief 3D";
      boutonRelief.setAttribute("aria-pressed", String(relief3D));
    }
    peindre(imageCourante);
    publier();
  }

  function lire() {
    if (!etat || enLecture) return;
    enLecture = true;
    if (boutonLecture) boutonLecture.textContent = "Pause";
    frameId = requestFrame(boucle);
  }

  function arreter() {
    enLecture = false;
    if (frameId != null) cancelFrame(frameId);
    frameId = null;
    if (boutonLecture) boutonLecture.textContent = "Lecture";
  }

  function basculerLecture() {
    if (enLecture) arreter(); else lire();
  }

  // Câblage des commandes (silencieux si un élément manque).
  if (selecteur) {
    selecteur.replaceChildren(...CATALOGUE_PROCESSUS.map((p) => {
      const opt = document.createElement("option");
      opt.value = p.cle;
      opt.textContent = p.nom;
      return opt;
    }));
    selecteur.addEventListener("change", () => { charger(selecteur.value); });
  }
  if (boutonLecture) boutonLecture.addEventListener("click", basculerLecture);
  if (boutonRelief) boutonRelief.addEventListener("click", basculerRelief);
  if (curseur) {
    curseur.addEventListener("input", () => { arreter(); peindre(Number(curseur.value)); publier(); });
  }
  if (champPas) {
    champPas.addEventListener("change", () => { if (etat) charger(etat.processus.cle); });
  }

  // Caméra : rotation manuelle (relief seulement ; coupe l'orbite auto), zoom
  // borné et déplacement en pixels — pour les contrôles en plein panneau.
  function tournerDe(delta) { if (!relief3D) return; autoOrbit = false; theta += delta; peindre(imageCourante); }
  function zoomerDe(facteur) { zoom = Math.max(0.2, Math.min(8, zoom * facteur)); peindre(imageCourante); }
  function deplacerDe(dx, dy) { panX += dx; panY += dy; peindre(imageCourante); }
  function reinitialiserCamera() { zoom = 1; panX = 0; panY = 0; autoOrbit = true; }

  // Redirige le rendu vers un autre canvas (plein panneau) puis repeint l'image
  // courante. `null` rend l'aperçu du dock d'origine. L'animation en cours
  // continue : la boucle peint désormais dans la nouvelle cible.
  function cibler(nouveauCanvas) {
    reinitialiserCamera();
    canvasActif = nouveauCanvas || canvas;
    ctx = canvasActif ? canvasActif.getContext("2d") : null;
    if (etat) peindre(imageCourante);
  }

  return {
    charger,
    lire,
    arreter,
    basculerLecture,
    basculerRelief,
    cibler,
    tournerDe,
    zoomerDe,
    deplacerDe,
    peindre,
    pas,
    etat: () => etat,
    imageCourante: () => imageCourante,
    relief3D: () => relief3D,
  };
}
