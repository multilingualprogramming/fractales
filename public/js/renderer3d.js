"use strict";

export const FRACTALES_3D = new Set(["tetraedre_sierpinski", "julia_quaternion", "mandelbox"]);

const VUES_3D_PAR_DEFAUT = {
  tetraedre_sierpinski: { distance: 2.8, lacet: 0.82, tangage: 0.56, cibleX: 0.0, cibleY: 0.0, cibleZ: 0.0 },
  julia_quaternion: { distance: 4.4, lacet: 0.95, tangage: 0.34, cibleX: 0.0, cibleY: 0.0, cibleZ: 0.0 },
  mandelbox: { distance: 6.8, lacet: 0.88, tangage: 0.38, cibleX: 0.0, cibleY: 0.0, cibleZ: 0.0 },
};

const INFOS_FRACTALES_3D = {
  tetraedre_sierpinski: { echantillons: 90000, taillePoint: 2.6, rayonPan: 0.0028 },
  julia_quaternion: { echantillons: 130000, taillePoint: 2.1, rayonPan: 0.0032 },
  mandelbox: { echantillons: 125000, taillePoint: 2.4, rayonPan: 0.0042 },
};

const cacheNuages = new Map();
const vues3D = new Map();
let moteur = null;

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute float aIntensite;
uniform mat4 uProjection;
uniform mat4 uVue;
uniform float uTaillePoint;
varying float vIntensite;

void main() {
  vec4 positionVue = uVue * vec4(aPosition, 1.0);
  gl_Position = uProjection * positionVue;
  float facteurPerspective = clamp(1.6 / max(0.45, -positionVue.z), 0.35, 3.4);
  gl_PointSize = uTaillePoint * (0.72 + aIntensite * 1.45) * facteurPerspective;
  vIntensite = aIntensite;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec3 uCouleur0;
uniform vec3 uCouleur1;
uniform vec3 uCouleur2;
uniform vec3 uCouleur3;
varying float vIntensite;

vec3 palette(float t) {
  if (t < 0.33) return mix(uCouleur0, uCouleur1, t / 0.33);
  if (t < 0.66) return mix(uCouleur1, uCouleur2, (t - 0.33) / 0.33);
  return mix(uCouleur2, uCouleur3, (t - 0.66) / 0.34);
}

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float halo = exp(-r2 * 2.8);
  float coeur = smoothstep(1.0, 0.05, r2);
  float alpha = min(1.0, halo * 0.58 + coeur * 0.62);
  vec3 couleur = palette(clamp(0.08 + vIntensite * 0.88, 0.0, 1.0));
  gl_FragColor = vec4(couleur, alpha);
}
`;

function creerRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function compilerShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || "erreur shader inconnue";
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function creerProgramme(gl) {
  const vs = compilerShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compilerShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const programme = gl.createProgram();
  gl.attachShader(programme, vs);
  gl.attachShader(programme, fs);
  gl.linkProgram(programme);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(programme) || "liaison shader impossible";
    gl.deleteProgram(programme);
    throw new Error(info);
  }
  return programme;
}

function creerContexte(canvas) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL indisponible");
  const programme = creerProgramme(gl);
  return {
    canvas,
    gl,
    programme,
    attributs: {
      position: gl.getAttribLocation(programme, "aPosition"),
      intensite: gl.getAttribLocation(programme, "aIntensite"),
    },
    uniformes: {
      projection: gl.getUniformLocation(programme, "uProjection"),
      vue: gl.getUniformLocation(programme, "uVue"),
      taillePoint: gl.getUniformLocation(programme, "uTaillePoint"),
      couleur0: gl.getUniformLocation(programme, "uCouleur0"),
      couleur1: gl.getUniformLocation(programme, "uCouleur1"),
      couleur2: gl.getUniformLocation(programme, "uCouleur2"),
      couleur3: gl.getUniformLocation(programme, "uCouleur3"),
    },
    tampons: {
      positions: gl.createBuffer(),
      intensites: gl.createBuffer(),
    },
    cleNuage: "",
  };
}

function obtenirVue3D(fractale) {
  if (!vues3D.has(fractale)) {
    vues3D.set(fractale, { ...(VUES_3D_PAR_DEFAUT[fractale] ?? VUES_3D_PAR_DEFAUT.tetraedre_sierpinski) });
  }
  return vues3D.get(fractale);
}

function clonerVue3D(fractale) {
  return { ...obtenirVue3D(fractale) };
}

function definirVue3D(fractale, vue) {
  vues3D.set(fractale, { ...obtenirVue3D(fractale), ...vue });
}

function reinitialiserVue3D(fractale) {
  vues3D.set(fractale, { ...(VUES_3D_PAR_DEFAUT[fractale] ?? VUES_3D_PAR_DEFAUT.tetraedre_sierpinski) });
}

function rotationPoint(point, lacet, tangage) {
  const sy = Math.sin(lacet);
  const cy = Math.cos(lacet);
  const sx = Math.sin(tangage);
  const cx = Math.cos(tangage);
  const x1 = point[0] * cy + point[2] * sy;
  const z1 = -point[0] * sy + point[2] * cy;
  return [
    x1,
    point[1] * cx - z1 * sx,
    point[1] * sx + z1 * cx,
  ];
}

function normaliser(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

function genererTetraedre(maxIter) {
  const rng = creerRng(0x51f15 ^ maxIter);
  const cible = Math.max(70000, Math.min(150000, INFOS_FRACTALES_3D.tetraedre_sierpinski.echantillons + maxIter * 60));
  const positions = new Float32Array(cible * 3);
  const intensites = new Float32Array(cible);
  let x = 0.25, y = 0.20, z = 0.10;
  let index = 0;
  for (let i = 0; i < cible + 48; i++) {
    const r = rng();
    const k = Math.min(3, (r * 4) | 0);
    if (k === 0) {
      x *= 0.5; y *= 0.5; z *= 0.5;
    } else if (k === 1) {
      x = x * 0.5 + 0.5; y *= 0.5; z *= 0.5;
    } else if (k === 2) {
      x = x * 0.5 + 0.25; y = y * 0.5 + 0.433013; z *= 0.5;
    } else {
      x = x * 0.5 + 0.25; y = y * 0.5 + 0.144338; z = z * 0.5 + 0.408248;
    }
    if (i < 24) continue;
    const base = index * 3;
    positions[base] = x - 0.5;
    positions[base + 1] = y - 0.289;
    positions[base + 2] = z - 0.204;
    intensites[index] = 0.45 + z * 0.95;
    index += 1;
    if (index >= cible) break;
  }
  return { positions, intensites, count: index, taillePoint: INFOS_FRACTALES_3D.tetraedre_sierpinski.taillePoint };
}

function etapeJuliaQuaternion(x, y, z) {
  const cX = -0.06;
  const cY = 0.06;
  const cZ = 0.2;
  return [
    x * x - y * y - z * z + cX,
    2.0 * x * y + cY,
    2.0 * x * z + cZ,
  ];
}

function genererJuliaQuaternion(maxIter) {
  const rng = creerRng(0x9a11a ^ maxIter);
  const cible = Math.max(90000, Math.min(180000, INFOS_FRACTALES_3D.julia_quaternion.echantillons + maxIter * 80));
  const positions = new Float32Array(cible * 3);
  const intensites = new Float32Array(cible);
  let index = 0;
  const limite = Math.max(18, Math.min(48, (maxIter / 8) | 0));
  while (index < cible) {
    let x = (rng() * 2.0 - 1.0) * 1.45;
    let y = (rng() * 2.0 - 1.0) * 1.45;
    let z = (rng() * 2.0 - 1.0) * 1.45;
    let vivant = true;
    for (let i = 0; i < limite; i++) {
      [x, y, z] = etapeJuliaQuaternion(x, y, z);
      if (x * x + y * y + z * z > 16.0) {
        vivant = false;
        break;
      }
    }
    if (!vivant) continue;
    const base = index * 3;
    positions[base] = x * 0.62;
    positions[base + 1] = y * 0.62;
    positions[base + 2] = z * 0.62;
    intensites[index] = normaliser((x * x + y * y + z * z) / 8.0, 0.18, 1.0);
    index += 1;
  }
  return { positions, intensites, count: index, taillePoint: INFOS_FRACTALES_3D.julia_quaternion.taillePoint };
}

function etapeMandelbox(x, y, z, cx, cy) {
  if (x > 1.0) x = 2.0 - x; else if (x < -1.0) x = -2.0 - x;
  if (y > 1.0) y = 2.0 - y; else if (y < -1.0) y = -2.0 - y;
  if (z > 1.0) z = 2.0 - z; else if (z < -1.0) z = -2.0 - z;
  const r2 = x * x + y * y + z * z;
  if (r2 < 0.25) {
    x *= 4.0; y *= 4.0; z *= 4.0;
  } else if (r2 < 1.0) {
    x /= r2; y /= r2; z /= r2;
  }
  return [2.0 * x + cx, 2.0 * y + cy, 2.0 * z + 0.1];
}

function genererMandelbox(maxIter) {
  const cible = Math.max(85000, Math.min(170000, INFOS_FRACTALES_3D.mandelbox.echantillons + maxIter * 70));
  const positions = new Float32Array(cible * 3);
  const intensites = new Float32Array(cible);
  let x = 0.2, y = 0.0, z = 0.3;
  let index = 0;
  let iter = 0;
  while (index < cible) {
    [x, y, z] = etapeMandelbox(x, y, z, 0.20 * Math.cos(iter * 0.007), 0.20 * Math.sin(iter * 0.011));
    iter += 1;
    if (!isFinite(x) || !isFinite(y) || !isFinite(z) || x * x + y * y + z * z > 16.0) {
      x = 0.2; y = 0.0; z = 0.3;
      continue;
    }
    if (iter < 42) continue;
    const base = index * 3;
    positions[base] = x * 0.36;
    positions[base + 1] = y * 0.36;
    positions[base + 2] = z * 0.36;
    intensites[index] = normaliser(0.28 + (1.2 - Math.min(1.0, Math.abs(z) * 0.55)), 0.14, 1.0);
    index += 1;
  }
  return { positions, intensites, count: index, taillePoint: INFOS_FRACTALES_3D.mandelbox.taillePoint };
}

function genererNuage3D(fractale, maxIter) {
  const cle = `${fractale}:${maxIter}`;
  const enCache = cacheNuages.get(cle);
  if (enCache) return enCache;
  let nuage;
  if (fractale === "tetraedre_sierpinski") nuage = genererTetraedre(maxIter);
  else if (fractale === "julia_quaternion") nuage = genererJuliaQuaternion(maxIter);
  else nuage = genererMandelbox(maxIter);
  cacheNuages.set(cle, nuage);
  return nuage;
}

function identite() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function perspective(fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0,
  ]);
}

function soustraire(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function produitVectoriel(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normaliserVecteur(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function scalaire(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lookAt(oeil, cible, haut) {
  const z = normaliserVecteur(soustraire(oeil, cible));
  const x = normaliserVecteur(produitVectoriel(haut, z));
  const y = produitVectoriel(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -scalaire(x, oeil), -scalaire(y, oeil), -scalaire(z, oeil), 1,
  ]);
}

function obtenirPositionCamera(vue) {
  const cosT = Math.cos(vue.tangage);
  return [
    vue.cibleX + vue.distance * Math.sin(vue.lacet) * cosT,
    vue.cibleY + vue.distance * Math.sin(vue.tangage),
    vue.cibleZ + vue.distance * Math.cos(vue.lacet) * cosT,
  ];
}

function paletteVersUniformes(palette) {
  const stops = palette.stops ?? [[255, 255, 255]];
  const indices = [0, Math.max(0, ((stops.length - 1) * 0.33) | 0), Math.max(0, ((stops.length - 1) * 0.66) | 0), stops.length - 1];
  return indices.map((index) => {
    const c = stops[index];
    return [c[0] / 255, c[1] / 255, c[2] / 255];
  });
}

function chargerNuageDansGpu(contexte, fractale, maxIter) {
  const { gl } = contexte;
  const nuage = genererNuage3D(fractale, maxIter);
  const cle = `${fractale}:${maxIter}`;
  if (contexte.cleNuage === cle) return nuage;
  contexte.cleNuage = cle;
  gl.bindBuffer(gl.ARRAY_BUFFER, contexte.tampons.positions);
  gl.bufferData(gl.ARRAY_BUFFER, nuage.positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, contexte.tampons.intensites);
  gl.bufferData(gl.ARRAY_BUFFER, nuage.intensites, gl.STATIC_DRAW);
  return nuage;
}

function dessinerScene(contexte, fractale, maxIter, palette, vue) {
  const { gl, programme, attributs, uniformes } = contexte;
  const nuage = chargerNuageDansGpu(contexte, fractale, maxIter);
  gl.viewport(0, 0, contexte.canvas.width, contexte.canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const fond = palette.fond ?? [0, 0, 0];
  gl.clearColor(fond[0] / 255, fond[1] / 255, fond[2] / 255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(programme);

  const oeil = obtenirPositionCamera(vue);
  const projection = perspective(Math.PI / 4.0, Math.max(1, contexte.canvas.width) / Math.max(1, contexte.canvas.height), 0.1, 100.0);
  const matriceVue = lookAt(oeil, [vue.cibleX, vue.cibleY, vue.cibleZ], [0, 1, 0]);
  const couleurs = paletteVersUniformes(palette);

  gl.uniformMatrix4fv(uniformes.projection, false, projection);
  gl.uniformMatrix4fv(uniformes.vue, false, matriceVue);
  gl.uniform1f(uniformes.taillePoint, nuage.taillePoint * window.devicePixelRatio);
  gl.uniform3fv(uniformes.couleur0, couleurs[0]);
  gl.uniform3fv(uniformes.couleur1, couleurs[1]);
  gl.uniform3fv(uniformes.couleur2, couleurs[2]);
  gl.uniform3fv(uniformes.couleur3, couleurs[3]);

  gl.bindBuffer(gl.ARRAY_BUFFER, contexte.tampons.positions);
  gl.enableVertexAttribArray(attributs.position);
  gl.vertexAttribPointer(attributs.position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, contexte.tampons.intensites);
  gl.enableVertexAttribArray(attributs.intensite);
  gl.vertexAttribPointer(attributs.intensite, 1, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.POINTS, 0, nuage.count);
}

function mettreAJourHud(fractale) {
  if (!moteur || !moteur.hud) return;
  const vue = obtenirVue3D(fractale);
  moteur.hud.textContent = `Navigation 3D · orbite ${vue.lacet.toFixed(2)} / ${vue.tangage.toFixed(2)} · distance ${vue.distance.toFixed(2)}`;
}

function mettreAJourCoordonnees(fractale) {
  if (!moteur || !moteur.coords) return;
  const vue = obtenirVue3D(fractale);
  const oeil = obtenirPositionCamera(vue);
  moteur.coords.textContent = `Cam ${oeil[0].toFixed(2)} ${oeil[1].toFixed(2)} ${oeil[2].toFixed(2)}`;
}

function rendreFractale3DInterne(fractale, maxIter, palette) {
  if (!moteur || !moteur.actif) return;
  redimensionnerMoteur3D();
  dessinerScene(moteur.contexte, fractale, maxIter, palette, obtenirVue3D(fractale));
  mettreAJourHud(fractale);
  mettreAJourCoordonnees(fractale);
}

function gererEvenementsCanvas() {
  if (!moteur) return;
  const { canvas } = moteur;
  let glisser = null;

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    glisser = {
      x: event.clientX,
      y: event.clientY,
      mode: event.button === 2 || event.shiftKey ? "pan" : "orbite",
    };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!moteur || !moteur.actif) return;
    if (!glisser) {
      mettreAJourCoordonnees(moteur.fractale);
      return;
    }
    const dx = event.clientX - glisser.x;
    const dy = event.clientY - glisser.y;
    glisser.x = event.clientX;
    glisser.y = event.clientY;
    if (glisser.mode === "pan") {
      deplacerVue3D(dx, -dy);
    } else {
      orbiterVue3D(dx * 0.008, dy * 0.008);
    }
  });
  canvas.addEventListener("pointerup", () => { glisser = null; });
  canvas.addEventListener("pointerleave", () => { glisser = null; });
  canvas.addEventListener("wheel", (event) => {
    if (!moteur || !moteur.actif) return;
    event.preventDefault();
    zoomerVue3D(event.deltaY < 0 ? 1 / 1.12 : 1.12);
  }, { passive: false });
  canvas.addEventListener("dblclick", () => {
    if (!moteur || !moteur.actif) return;
    reinitialiserVue3D(moteur.fractale);
    moteur.redessiner();
  });
}

export function initialiserMoteur3D({ canvas, hud, coords, statut, obtenirPalette, obtenirMaxIter }) {
  const contexte = creerContexte(canvas);
  moteur = {
    canvas,
    contexte,
    hud,
    coords,
    statut,
    obtenirPalette,
    obtenirMaxIter,
    actif: false,
    fractale: "tetraedre_sierpinski",
    redessiner: () => rendreFractale3DInterne(moteur.fractale, obtenirMaxIter(), obtenirPalette()),
  };
  gererEvenementsCanvas();
}

export function activerMode3D(estActif, fractale) {
  if (!moteur) return;
  moteur.actif = estActif;
  moteur.fractale = fractale;
  moteur.canvas.classList.toggle("canvas-visible", estActif);
  moteur.canvas.classList.toggle("canvas-masque", !estActif);
  if (moteur.hud) moteur.hud.classList.toggle("hidden", !estActif);
  if (estActif) {
    mettreAJourHud(fractale);
    mettreAJourCoordonnees(fractale);
  }
}

export function estFractale3D(fractale) {
  return FRACTALES_3D.has(fractale);
}

export function redimensionnerMoteur3D() {
  if (!moteur) return;
  const largeur = moteur.canvas.clientWidth | 0;
  const hauteur = moteur.canvas.clientHeight | 0;
  if (largeur <= 0 || hauteur <= 0) return;
  if (moteur.canvas.width !== largeur || moteur.canvas.height !== hauteur) {
    moteur.canvas.width = largeur;
    moteur.canvas.height = hauteur;
  }
}

export function render3D(fractale, maxIter, palette) {
  if (!moteur) return;
  moteur.fractale = fractale;
  rendreFractale3DInterne(fractale, maxIter, palette);
  if (moteur.statut) moteur.statut(`WebGL 3D · ${fractale}`, true);
}

export function orbiterVue3D(deltaLacet, deltaTangage) {
  if (!moteur) return;
  const vue = obtenirVue3D(moteur.fractale);
  vue.lacet += deltaLacet;
  vue.tangage = normaliser(vue.tangage + deltaTangage, -1.35, 1.35);
  moteur.redessiner();
}

export function deplacerVue3D(deltaX, deltaY) {
  if (!moteur) return;
  const vue = obtenirVue3D(moteur.fractale);
  const info = INFOS_FRACTALES_3D[moteur.fractale] ?? INFOS_FRACTALES_3D.tetraedre_sierpinski;
  const facteur = vue.distance * info.rayonPan;
  const droit = [Math.cos(vue.lacet), 0, -Math.sin(vue.lacet)];
  const haut = [0, 1, 0];
  vue.cibleX -= droit[0] * deltaX * facteur;
  vue.cibleY += haut[1] * deltaY * facteur;
  vue.cibleZ -= droit[2] * deltaX * facteur;
  moteur.redessiner();
}

export function zoomerVue3D(facteur) {
  if (!moteur) return;
  const vue = obtenirVue3D(moteur.fractale);
  vue.distance = normaliser(vue.distance * facteur, 1.2, 18.0);
  moteur.redessiner();
}

export function obtenirVue3DActive() {
  if (!moteur) return null;
  return { ...clonerVue3D(moteur.fractale), mode3d: true };
}

export function definirVue3DActive(fractale, vue) {
  definirVue3D(fractale, vue);
}

export function reinitialiserVue3DActive(fractale) {
  reinitialiserVue3D(fractale);
}

export function interpolerVue3D(vueA, vueB, t) {
  return {
    mode3d: true,
    distance: vueA.distance + (vueB.distance - vueA.distance) * t,
    lacet: vueA.lacet + (vueB.lacet - vueA.lacet) * t,
    tangage: vueA.tangage + (vueB.tangage - vueA.tangage) * t,
    cibleX: vueA.cibleX + (vueB.cibleX - vueA.cibleX) * t,
    cibleY: vueA.cibleY + (vueB.cibleY - vueA.cibleY) * t,
    cibleZ: vueA.cibleZ + (vueB.cibleZ - vueA.cibleZ) * t,
  };
}

export function rendre3DSurCanvas(canvas, fractale, maxIter, palette, vue) {
  const contexte = creerContexte(canvas);
  if (canvas.width === 0 || canvas.height === 0) {
    canvas.width = 1;
    canvas.height = 1;
  }
  dessinerScene(contexte, fractale, maxIter, palette, vue ?? clonerVue3D(fractale));
}
