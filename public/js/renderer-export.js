"use strict";

function lireEntier(input, fallback) {
  const value = parseInt(input.value, 10);
  return Number.isFinite(value) ? value : fallback;
}

function blobDepuisCanvas(canvasSource, type = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvasSource.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Export image indisponible"));
    }, type, quality);
  });
}

function creerContexteSvg(pathCommands) {
  return {
    moveTo(x, y) { pathCommands.push(`M${x.toFixed(3)},${y.toFixed(3)}`); },
    lineTo(x, y) { pathCommands.push(`L${x.toFixed(3)},${y.toFixed(3)}`); },
    arc(cx, cy, r, a0, a1) {
      const segments = 24;
      for (let i = 0; i <= segments; i++) {
        const angle = a0 + (a1 - a0) * i / segments;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        pathCommands.push(i === 0 ? `M${px.toFixed(3)},${py.toFixed(3)}` : `L${px.toFixed(3)},${py.toFixed(3)}`);
      }
    },
    rect(x, y, width, height) {
      pathCommands.push(`M${x.toFixed(3)},${y.toFixed(3)}L${(x + width).toFixed(3)},${y.toFixed(3)}L${(x + width).toFixed(3)},${(y + height).toFixed(3)}L${x.toFixed(3)},${(y + height).toFixed(3)}Z`);
    },
    beginPath() { pathCommands.length = 0; },
    stroke() {},
    fillRect() {},
    set strokeStyle(_) {},
    set fillStyle(_) {},
    set lineWidth(_) {},
  };
}

export function initialiserExports({
  buttons,
  elements,
  dependencies,
}) {
  const {
    btnOpenExport,
    btnCloseExport,
    btnExportCurrent,
    btnExportImage,
    btnCaptureStart,
    btnCaptureEnd,
    btnExportVideo,
    btnExportSvg,
  } = buttons;

  const {
    exportPanel,
    exportImageWidth,
    exportImageHeight,
    exportVideoWidth,
    exportVideoHeight,
    exportVideoDuration,
    exportVideoFps,
    exportVideoState,
  } = elements;

  const {
    LINE_FRACTALS,
    obtenirCanvasActif,
    getViewState,
    getParams,
    fractaleActiveEst3D,
    obtenirVue3DActive,
    getPaletteBackground,
    getColor,
    dessinerFractaleLineaire,
    telechargerBlob,
    formaterNomExport,
    updateStatusBar,
    rendreDansCanvas,
    clonerParamsExport,
    ajusterIterationsExport,
    interpolerVue3D,
    interpolerLineaire,
    interpolerLogarithmique,
    attendre,
    capturerVueCourante,
    definirVisibiliteEditeurPalette,
  } = dependencies;

  let vueExportDepart = null;
  let vueExportArrivee = null;

  function mettreAJourEtatVideo() {
    const depart = vueExportDepart ? "défini" : "non défini";
    const arrivee = vueExportArrivee ? "définie" : "non définie";
    exportVideoState.textContent = `Départ : ${depart} · Arrivée : ${arrivee}`;
  }

  async function exporterImageCourante() {
    updateStatusBar("Export PNG courant…");
    const blob = await blobDepuisCanvas(obtenirCanvasActif(), "image/png");
    telechargerBlob(blob, formaterNomExport("vue", "png"));
    updateStatusBar("PNG courant exporté", true);
  }

  async function exporterImageHauteResolution() {
    const largeur = lireEntier(exportImageWidth, 1920);
    const hauteur = lireEntier(exportImageHeight, 1080);
    const canvasExport = document.createElement("canvas");
    canvasExport.width = largeur;
    canvasExport.height = hauteur;
    const renduParams = clonerParamsExport();
    renduParams.maxIter = ajusterIterationsExport(largeur, hauteur, renduParams.maxIter);
    const vueCourante = getViewState();
    const vueCible = fractaleActiveEst3D()
      ? { vue3d: obtenirVue3DActive() }
      : {
        centerX: vueCourante.centerX,
        centerY: vueCourante.centerY,
        pixelSize: vueCourante.pixelSize,
      };
    updateStatusBar("Rendu PNG haute résolution…");
    await rendreDansCanvas(canvasExport, vueCible, renduParams);
    const blob = await blobDepuisCanvas(canvasExport, "image/png");
    telechargerBlob(blob, formaterNomExport(`${largeur}x${hauteur}`, "png"));
    updateStatusBar("PNG haute résolution exporté", true);
  }

  async function exporterVideoZoom() {
    if (!vueExportDepart || !vueExportArrivee) {
      updateStatusBar("Définissez la vue de départ et la vue d'arrivée", true);
      return;
    }
    if (vueExportDepart.fractal !== vueExportArrivee.fractal) {
      updateStatusBar("La vidéo de zoom nécessite la même fractale au départ et à l'arrivée", true);
      return;
    }

    const largeur = lireEntier(exportVideoWidth, 1280);
    const hauteur = lireEntier(exportVideoHeight, 720);
    const duree = lireEntier(exportVideoDuration, 8);
    const fps = lireEntier(exportVideoFps, 24);
    const nbImages = Math.max(2, duree * fps);
    const canvasVideo = document.createElement("canvas");
    canvasVideo.width = largeur;
    canvasVideo.height = hauteur;

    if (typeof canvasVideo.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      updateStatusBar("Export vidéo non supporté dans ce navigateur", true);
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const chunks = [];
    const recorder = new MediaRecorder(canvasVideo.captureStream(fps), { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    const recordingStopped = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    updateStatusBar("Création de la vidéo…");
    recorder.start();

    for (let index = 0; index < nbImages; index++) {
      const t = nbImages <= 1 ? 1.0 : index / (nbImages - 1);
      const vueAnimation = vueExportDepart.vue3d
        ? { vue3d: interpolerVue3D(vueExportDepart.vue3d, vueExportArrivee.vue3d, t) }
        : {
          centerX: interpolerLineaire(vueExportDepart.centerX, vueExportArrivee.centerX, t),
          centerY: interpolerLineaire(vueExportDepart.centerY, vueExportArrivee.centerY, t),
          pixelSize: interpolerLogarithmique(vueExportDepart.pixelSize, vueExportArrivee.pixelSize, t),
        };
      const renduParams = clonerParamsExport(vueExportDepart);
      renduParams.maxIter = Math.round(interpolerLineaire(vueExportDepart.maxIter, vueExportArrivee.maxIter, t));
      renduParams.palette = vueExportDepart.palette;
      renduParams.paletteBackground = vueExportDepart.paletteBackground;
      renduParams.paletteInterior = vueExportDepart.paletteInterior;
      renduParams.paletteStops = [...vueExportDepart.paletteStops];
      renduParams.multibrotPower = vueExportDepart.multibrotPower;
      renduParams.juliaCre = vueExportDepart.juliaCre;
      renduParams.juliaCim = vueExportDepart.juliaCim;
      await rendreDansCanvas(canvasVideo, vueAnimation, renduParams);
      updateStatusBar(`Création de la vidéo… ${index + 1}/${nbImages}`);
      await attendre(1000 / fps);
    }

    recorder.stop();
    const blob = await recordingStopped;
    telechargerBlob(blob, formaterNomExport("zoom", "webm"));
    updateStatusBar("Vidéo exportée", true);
  }

  async function exporterSVG() {
    const params = getParams();
    if (!LINE_FRACTALS.has(params.fractal)) return;

    const largeur = 800;
    const hauteur = 800;
    const vueCourante = getViewState();
    const vueSVG = {
      centerX: vueCourante.centerX,
      centerY: vueCourante.centerY,
      pixelSize: vueCourante.pixelSize,
    };
    const fond = getPaletteBackground(params);
    const stroke = getColor(Math.min(params.maxIter * 0.6, params.maxIter - 1), params.maxIter, params);
    const bgColor = `rgb(${fond[0]},${fond[1]},${fond[2]})`;
    const strokeColor = `rgb(${stroke[0]},${stroke[1]},${stroke[2]})`;
    const pathCommands = [];
    const mockCtx = creerContexteSvg(pathCommands);

    dessinerFractaleLineaire(mockCtx, largeur, hauteur, vueSVG, params);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}" viewBox="0 0 ${largeur} ${hauteur}">
  <rect width="${largeur}" height="${hauteur}" fill="${bgColor}"/>
  <path d="${pathCommands.join(" ")}" fill="none" stroke="${strokeColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    telechargerBlob(blob, formaterNomExport("vecteur", "svg"));
    updateStatusBar("SVG exporté", true);
  }

  btnOpenExport.addEventListener("click", () => {
    definirVisibiliteEditeurPalette(false);
    exportPanel.classList.remove("hidden");
  });

  btnCloseExport.addEventListener("click", () => {
    exportPanel.classList.add("hidden");
  });

  btnExportCurrent.addEventListener("click", async () => {
    try {
      await exporterImageCourante();
    } catch (error) {
      updateStatusBar("Échec de l'export PNG courant", true);
      console.error(error);
    }
  });

  btnExportImage.addEventListener("click", async () => {
    try {
      await exporterImageHauteResolution();
    } catch (error) {
      updateStatusBar("Échec de l'export PNG haute résolution", true);
      console.error(error);
    }
  });

  btnCaptureStart.addEventListener("click", () => {
    vueExportDepart = capturerVueCourante();
    mettreAJourEtatVideo();
    updateStatusBar("Vue de départ enregistrée", true);
  });

  btnCaptureEnd.addEventListener("click", () => {
    vueExportArrivee = capturerVueCourante();
    mettreAJourEtatVideo();
    updateStatusBar("Vue d'arrivée enregistrée", true);
  });

  btnExportVideo.addEventListener("click", async () => {
    try {
      await exporterVideoZoom();
    } catch (error) {
      updateStatusBar("Échec de l'export vidéo", true);
      console.error(error);
    }
  });

  btnExportSvg?.addEventListener("click", async () => {
    try {
      await exporterSVG();
    } catch (error) {
      updateStatusBar("Échec export SVG", true);
      console.error(error);
    }
  });

  return { mettreAJourEtatVideo };
}
