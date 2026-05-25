"use strict";

// Métadonnées des préréglages IFS intégrés.
// type "2d" : étape WASM prend (x, y, r) et retourne (x', y').
// type "3d" : étape WASM prend (x, y, z, r) puis projection isométrique vers 2D.
const PRESETS_IFS = {
  barnsley: {
    label: "Fougère de Barnsley",
    fractale: "barnsley",
    type: "2d",
    x0: 0, y0: 0,
    etape: "barnsley_etape",
  },
  sierpinski: {
    label: "Triangle de Sierpiński",
    fractale: "sierpinski",
    type: "2d",
    x0: 0.37, y0: 0.21,
    etape: "sierpinski_etape",
  },
  tapis_sierpinski: {
    label: "Tapis de Sierpiński",
    fractale: "tapis_sierpinski",
    type: "2d",
    x0: 0, y0: 0,
    etape: "tapis_sierpinski_etape",
  },
  vicsek: {
    label: "Fractale de Vicsek",
    fractale: "vicsek_fractal",
    type: "2d",
    x0: 0, y0: 0,
    etape: "vicsek_etape",
  },
  menger_sponge: {
    label: "Éponge de Menger",
    fractale: "menger_sponge",
    type: "3d",
    x0: 0.11, y0: -0.17, z0: 0.23,
    etape: "menger_etape",
  },
  tetraedre_sierpinski: {
    label: "Tétraèdre de Sierpiński",
    fractale: "tetraedre_sierpinski",
    type: "3d",
    x0: 0.25, y0: 0.20, z0: 0.10,
    etape: "tetraedre_etape",
    decalageX: -0.5, decalageY: -0.289, decalageZ: -0.204,
  },
};

// Réglages de projection isométrique — identiques à renderer.js REGLAGES_3D.
const PROJ3D = {
  menger_sponge:        { ax: -0.52, ay: 0.78, az: 0.08, perspective: 0.26, camera: 3.6, echelle: 1.02 },
  tetraedre_sierpinski: { ax: -0.72, ay: 0.88, az: 0.24, perspective: 0.36, camera: 2.6, echelle: 1.10 },
};

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

function etapePresetIFS(presetKey, x, y, z, r) {
  if (presetKey === "barnsley") {
    if (r < 0.01) return [0.0, 0.16 * y, z];
    if (r < 0.86) return [0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6, z];
    if (r < 0.93) return [0.2 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6, z];
    return [-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44, z];
  }
  if (presetKey === "sierpinski") {
    if (r < 1 / 3) return [0.5 * x, 0.5 * y, z];
    if (r < 2 / 3) return [0.5 * x + 0.5, 0.5 * y, z];
    return [0.5 * x + 0.25, 0.5 * y + 0.43301270189, z];
  }
  if (presetKey === "tapis_sierpinski") {
    const cellules = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0], [1, 0],
      [-1, 1], [0, 1], [1, 1],
    ];
    const index = Math.min(cellules.length - 1, (r * cellules.length) | 0);
    const [dx, dy] = cellules[index];
    return [x / 3 + dx / 3, y / 3 + dy / 3, z];
  }
  if (presetKey === "vicsek") {
    if (r < 0.2) return [x / 3, y / 3, z];
    if (r < 0.4) return [x / 3 - 2 / 3, y / 3, z];
    if (r < 0.6) return [x / 3 + 2 / 3, y / 3, z];
    if (r < 0.8) return [x / 3, y / 3 - 2 / 3, z];
    return [x / 3, y / 3 + 2 / 3, z];
  }
  if (presetKey === "menger_sponge") {
    const index = Math.min(MENGER_OFFSETS.length - 1, (r * MENGER_OFFSETS.length) | 0);
    const [dx, dy, dz] = MENGER_OFFSETS[index];
    return [x / 3 + dx / 3, y / 3 + dy / 3, z / 3 + dz / 3];
  }
  if (presetKey === "tetraedre_sierpinski") {
    const k = Math.min(3, (r * 4) | 0);
    if (k === 0) return [x * 0.5, y * 0.5, z * 0.5];
    if (k === 1) return [x * 0.5 + 0.5, y * 0.5, z * 0.5];
    if (k === 2) return [x * 0.5 + 0.25, y * 0.5 + 0.433013, z * 0.5];
    return [x * 0.5 + 0.25, y * 0.5 + 0.144338, z * 0.5 + 0.408248];
  }
  return [x, y, z];
}

function projeter3DIFS(cle, x, y, z) {
  const cfg = PROJ3D[cle];
  if (!cfg) return [x, y];
  const sax = Math.sin(cfg.ax), cax = Math.cos(cfg.ax);
  const say = Math.sin(cfg.ay), cay = Math.cos(cfg.ay);
  const saz = Math.sin(cfg.az), caz = Math.cos(cfg.az);
  let rx = x;
  let ry = y * cax - z * sax;
  let rz = y * sax + z * cax;
  const r2x = rx * cay + rz * say;
  const r2z = -rx * say + rz * cay;
  rx = r2x * caz - ry * saz;
  ry = r2x * saz + ry * caz;
  rz = r2z;
  const p = cfg.camera / Math.max(0.6, cfg.camera - rz * cfg.perspective);
  return [rx * p * cfg.echelle, ry * p * cfg.echelle];
}

// Tableau affine par défaut : fougère de Barnsley (valeurs classiques).
export const TABLEAU_IFS_BARNSLEY = [
  "  0      0      0     0.16   0     0     0.01",
  " 0.85    0.04  -0.04  0.85   0     1.6   0.85",
  " 0.20   -0.26   0.23  0.22   0     1.6   0.07",
  "-0.15    0.28   0.26  0.24   0     0.44  0.07",
].join("\n");

// Analyse et normalise un tableau de transformées affines.
// Format par ligne : a b c d e f p (matrice 2×2 + translation + poids).
export function parserTableauIFS(texte) {
  const transformees = [];
  const diagnostics = [];
  String(texte || "").split(/\n|;/).forEach((ligne, index) => {
    const tronquee = ligne.trim();
    if (!tronquee || tronquee.startsWith("#")) return;
    const parts = tronquee.split(/\s+/).map(Number);
    if (parts.length < 7) {
      if (parts.length > 0) diagnostics.push(`Ligne ${index + 1} : 7 valeurs requises (a b c d e f p)`);
      return;
    }
    const [a, b, c, d, e, f, p] = parts;
    if ([a, b, c, d, e, f].some((v) => !Number.isFinite(v))) {
      diagnostics.push(`Ligne ${index + 1} : valeur non numérique`);
      return;
    }
    if (!Number.isFinite(p) || p < 0) {
      diagnostics.push(`Ligne ${index + 1} : poids p invalide (doit être ≥ 0)`);
      return;
    }
    transformees.push({ a, b, c, d, e, f, p });
  });
  if (transformees.length < 1) {
    if (diagnostics.length === 0) diagnostics.push("Au moins une transformée affine est requise.");
    return { transformees: [], diagnostics };
  }
  const totalPoids = transformees.reduce((s, t) => s + t.p, 0);
  if (totalPoids <= 0) {
    diagnostics.push("La somme des poids doit être strictement positive.");
    return { transformees: [], diagnostics };
  }
  return {
    transformees: transformees.map((t) => ({ ...t, p: t.p / totalPoids })),
    diagnostics,
  };
}

// Résumé descriptif pour l'aperçu readout (sans démarrer l'animation).
export function decrireTableauIFS(texte) {
  const { transformees, diagnostics } = parserTableauIFS(texte);
  const contractante = transformees.every((t) => Math.abs(t.a * t.d - t.b * t.c) < 1.0);
  return { count: transformees.length, diagnostics, contractante };
}

// Retourne le nom de la fractale principale associée au préréglage (ou null).
export function fractaleDePresetIFS(preset) {
  return PRESETS_IFS[preset]?.fractale ?? null;
}

// ──────────────────────────────────────────────────────────────
// Conversion HSL → RVB (coloration spectre)
// ──────────────────────────────────────────────────────────────

function hue2rvb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslVersRvb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rvb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rvb(p, q, h) * 255),
    Math.round(hue2rvb(p, q, h - 1 / 3) * 255),
  ];
}

// Mappe une densité normalisée [0,1] vers une couleur RGB selon le mode.
// cx, cy : coordonnées pixel (pour le mode spectre géométrique).
function couleurDensite(t, mode, cx, cy, w, h) {
  if (mode === "monochrome") {
    // Cyan sombre → cyan vif → blanc
    if (t < 0.5) {
      const s = t * 2;
      return [0, Math.round(s * 180), Math.round(100 + s * 155)];
    }
    const s = (t - 0.5) * 2;
    return [Math.round(s * 255), Math.round(180 + s * 75), 255];
  }
  if (mode === "ordre") {
    // Teinte dérivée de la position géométrique — révèle la structure du fractal.
    const teinte = ((cx / w) * 210 + ((h - cy) / h) * 150) % 360;
    return hslVersRvb(teinte / 360, 0.88, t * 0.52 + 0.1);
  }
  // densite : noir → bleu profond → cyan → blanc (heatmap classique chaos game)
  if (t < 0.35) {
    const s = t / 0.35;
    return [0, Math.round(s * 60), Math.round(s * 180)];
  }
  if (t < 0.70) {
    const s = (t - 0.35) / 0.35;
    return [0, Math.round(60 + s * 152), Math.round(180 + s * 75)];
  }
  const s = (t - 0.70) / 0.30;
  return [Math.round(s * 255), Math.round(212 + s * 43), 255];
}

// ──────────────────────────────────────────────────────────────
// Jeu du chaos — animation par trames
// ──────────────────────────────────────────────────────────────

let _animId = null;

export function arreterJeuDuChaos() {
  if (_animId !== null) {
    cancelAnimationFrame(_animId);
    _animId = null;
  }
}

// Lance l'animation du jeu du chaos sur `canvas`.
// config : { preset, iterations (×1000), colorMode, tableauPersonnalise }
// wex    : objet wasmExportFunctions (fonctions d'étape WASM).
// onReadout : callback(msg) appelé pour mettre à jour le texte de statut.
export function jeuDuChaosIFS(canvas, config, wex, onReadout) {
  arreterJeuDuChaos();

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "rgba(2, 4, 10, 0.96)";
  ctx.fillRect(0, 0, w, h);

  const preset = PRESETS_IFS[config.preset];
  const estPersonnalise = !preset;
  const est3D = preset?.type === "3d";

  // Charger et valider les transformées personnalisées si besoin.
  let transformees = [];
  if (estPersonnalise) {
    const parse = parserTableauIFS(config.tableauPersonnalise ?? TABLEAU_IFS_BARNSLEY);
    if (parse.transformees.length === 0) {
      ctx.fillStyle = "rgba(255, 100, 80, 0.9)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(parse.diagnostics[0] ?? "Tableau IFS invalide", w / 2, h / 2);
      onReadout?.("Tableau invalide · " + (parse.diagnostics[0] ?? ""));
      return;
    }
    transformees = parse.transformees;
  }

  // Point de départ (initialisation dans l'attracteur).
  let x = preset?.x0 ?? 0;
  let y = preset?.y0 ?? 0;
  let z = preset?.z0 ?? 0;

  // Une étape du jeu du chaos — retourne les coordonnées projetées [px, py].
  function etape() {
    const r = Math.random();

    if (estPersonnalise) {
      // Sélection par poids cumulatifs — utilise evaluer_affine WASM si disponible.
      let cumul = 0;
      let t = transformees[transformees.length - 1];
      for (const tr of transformees) {
        cumul += tr.p;
        if (r < cumul) { t = tr; break; }
      }
      const nx = t.a * x + t.b * y + t.e;
      const ny = t.c * x + t.d * y + t.f;
      x = nx; y = ny;
      return [x, y];
    }

    if (est3D) {
      [x, y, z] = etapePresetIFS(config.preset, x, y, z, r);
      const ox = preset.decalageX ?? 0;
      const oy = preset.decalageY ?? 0;
      const oz = preset.decalageZ ?? 0;
      return projeter3DIFS(config.preset, x + ox, y + oy, z + oz);
    }

    [x, y, z] = etapePresetIFS(config.preset, x, y, z, r);
    return [x, y];
  }

  // ── Phase de chauffe : laisser l'orbite converger vers l'attracteur ──
  const CHAUFFE = 120;
  for (let i = 0; i < CHAUFFE; i++) etape();

  // ── Estimation des bornes sur un échantillon initial ──
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const echantillons = [];
  for (let i = 0; i < 2000; i++) {
    const [px, py] = etape();
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    echantillons.push([px, py]);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  if (!Number.isFinite(minX)) {
    ctx.fillStyle = "rgba(255, 100, 80, 0.9)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("IFS non convergent — vérifiez les poids", w / 2, h / 2);
    onReadout?.("IFS non convergent");
    return;
  }

  // ── Calcul de la transformation pixel avec marges et rapport d'aspect ──
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const marge = 0.06;
  const xMin = minX - spanX * marge;
  const xMax = maxX + spanX * marge;
  const yMin = minY - spanY * marge;
  const yMax = maxY + spanY * marge;
  const echelleX = w / (xMax - xMin);
  const echelleY = h / (yMax - yMin);
  const echelle = Math.min(echelleX, echelleY);
  const decalX = (w - (xMax - xMin) * echelle) / 2;
  const decalY = (h - (yMax - yMin) * echelle) / 2;

  function versPixel(px, py) {
    return [
      Math.round(decalX + (px - xMin) * echelle),
      Math.round(h - decalY - (py - yMin) * echelle),
    ];
  }

  // ── Tampon de densité (Float32 pour log-scale précis) ──
  const total = Math.max(5000, (config.iterations | 0) * 1000);
  const densite = new Float32Array(w * h);

  // Initialiser avec les points d'échantillonnage déjà calculés.
  for (const [px, py] of echantillons) {
    const [cx, cy] = versPixel(px, py);
    if (cx >= 0 && cx < w && cy >= 0 && cy < h) densite[cy * w + cx] += 1;
  }
  let n = echantillons.length;

  function rendreDensite() {
    let maxD = 1;
    for (let i = 0; i < densite.length; i++) {
      if (densite[i] > maxD) maxD = densite[i];
    }
    const logMax = Math.log1p(maxD);
    const img = ctx.createImageData(w, h);
    const mode = config.colorMode;
    for (let i = 0; i < w * h; i++) {
      if (densite[i] === 0) continue;
      const t = Math.log1p(densite[i]) / logMax;
      const cx = i % w;
      const cy = (i / w) | 0;
      const [r, g, b] = couleurDensite(t, mode, cx, cy, w, h);
      const ii = i * 4;
      img.data[ii] = r;
      img.data[ii + 1] = g;
      img.data[ii + 2] = b;
      img.data[ii + 3] = 255;
    }
    ctx.fillStyle = "rgba(2, 4, 10, 0.96)";
    ctx.fillRect(0, 0, w, h);
    ctx.putImageData(img, 0, 0);
  }

  const LOT = 7000;

  function trame() {
    for (let b = 0; b < LOT && n < total; b++, n++) {
      const [px, py] = etape();
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      const [cx, cy] = versPixel(px, py);
      if (cx >= 0 && cx < w && cy >= 0 && cy < h) densite[cy * w + cx] += 1;
    }
    rendreDensite();
    if (n < total) {
      _animId = requestAnimationFrame(trame);
    } else {
      _animId = null;
      const label = preset?.label ?? "personnalisé";
      onReadout?.(`${label} · ${total.toLocaleString("fr-FR")} points · rendu terminé`);
    }
  }

  const label = preset?.label ?? "personnalisé";
  onReadout?.(`${label} · ${total.toLocaleString("fr-FR")} points · jeu en cours…`);
  rendreDensite();
  _animId = requestAnimationFrame(trame);
}
