"use strict";

const STORAGE_KEY = "fractales_signets";
const EMPTY_MESSAGE = "Aucun signet. Naviguez vers une vue intéressante et appuyez sur ★ Signet.";

export function initialiserSignets({
  button,
  panel,
  closeButton,
  list,
  capturerVue,
  appliquerSignet,
  updateStatusBar,
}) {
  function chargerSignets() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function sauvegarderSignets(signets) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signets));
  }

  function rendreListeSignets() {
    if (!list) return;
    const signets = chargerSignets();
    if (signets.length === 0) {
      list.innerHTML = `<p class="bookmark-empty">${EMPTY_MESSAGE}</p>`;
      return;
    }
    list.innerHTML = signets.map((signet, index) => `
      <div class="bookmark-item">
        <button class="bookmark-goto btn" data-index="${index}">${signet.nom}</button>
        <button class="bookmark-delete btn btn-secondary" data-index="${index}" aria-label="Supprimer">✕</button>
      </div>
    `).join("");
  }

  function ajouterSignet() {
    const vue = capturerVue();
    const nom = `${vue.fractal} — ${new Date().toLocaleTimeString("fr-FR")}`;
    const signets = chargerSignets();
    signets.unshift({ nom, ...vue });
    if (signets.length > 20) signets.pop();
    sauvegarderSignets(signets);
    rendreListeSignets();
    updateStatusBar("Signet enregistré", true);
  }

  function supprimerSignet(index) {
    const signets = chargerSignets();
    signets.splice(index, 1);
    sauvegarderSignets(signets);
    rendreListeSignets();
  }

  button?.addEventListener("click", () => {
    ajouterSignet();
    panel?.classList.remove("hidden");
  });

  closeButton?.addEventListener("click", () => {
    panel?.classList.add("hidden");
  });

  list?.addEventListener("click", async (event) => {
    const target = event.target;
    const index = parseInt(target?.dataset?.index ?? "", 10);
    if (!Number.isFinite(index)) return;
    if (target.classList.contains("bookmark-delete")) {
      supprimerSignet(index);
      return;
    }
    if (target.classList.contains("bookmark-goto")) {
      const signet = chargerSignets()[index];
      if (!signet) return;
      await appliquerSignet(signet);
      panel?.classList.add("hidden");
    }
  });

  return { ajouterSignet, rendreListeSignets };
}
