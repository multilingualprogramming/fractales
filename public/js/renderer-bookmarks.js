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
      const empty = document.createElement("p");
      empty.className = "bookmark-empty";
      empty.textContent = EMPTY_MESSAGE;
      list.replaceChildren(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    signets.forEach((signet, index) => {
      const row = document.createElement("div");
      row.className = "bookmark-item";

      const gotoButton = document.createElement("button");
      gotoButton.className = "bookmark-goto btn";
      gotoButton.dataset.index = String(index);
      gotoButton.textContent = signet.nom || "";
      row.appendChild(gotoButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "bookmark-delete btn btn-secondary";
      deleteButton.dataset.index = String(index);
      deleteButton.setAttribute("aria-label", "Supprimer");
      deleteButton.textContent = "✕";
      row.appendChild(deleteButton);

      fragment.appendChild(row);
    });
    list.replaceChildren(fragment);
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
