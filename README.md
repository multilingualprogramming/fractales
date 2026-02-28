# Explorateur de Fractales

Application GitHub Pages qui rend l'ensemble de Mandelbrot en **WebAssembly**
dont le code de calcul est entièrement écrit en **français** grâce au langage
[multilingual](https://github.com/johnsamuelwrites/multilingual).

---

## Aperçu du pipeline

```
src/mandelbrot.ml          ← source en français (mots-clés : soit, tantque, retour…)
      │
      │  build/compile_wasm.py  (exécuté lors du build GitHub Actions)
      │
      ▼  Lexer (tokenisation Unicode)
      ▼  Parser → AST surface
      ▼  lower_to_core_ir() → Core IR
      ▼  WasmGenerator → Rust intermédiaire → Cranelift
      │
      ├──▶ public/mandelbrot.wasm           (binaire chargé par le navigateur)
      ├──▶ public/benchmark.json            (résultats Python vs WASM)
      ├──▶ public/mandelbrot_transpiled.py  (Python généré, affiché dans l'UI)
      └──▶ public/mandelbrot.ml             (source affiché dans l'UI, chargé en fetch)
```

À l'exécution dans le navigateur, **aucun Python, aucun wasmtime** —
uniquement l'API WebAssembly standard (`WebAssembly.instantiateStreaming`).

---

## Source français (`src/mandelbrot.ml`)

```text
# Ensemble de Mandelbrot — source en français

déf mandelbrot(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > 4.0:
            retour iter
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter
```

Ce fichier est compilé vers WASM à l'étape de build, puis copié dans
`public/` pour être affiché dans l'interface au chargement de la page.

---

## Fonctionnalités de l'interface

| Fonctionnalité | Détail |
|---|---|
| Canvas Mandelbrot | Rendu progressif, plein écran |
| Zoom | Clic (×2), double-clic (×0.5), molette, pincement |
| Déplacement | Glisser-déposer |
| Itérations | Curseur 64 → 1 024 |
| Palettes | 🔥 Feu · 🌊 Océan · 🌌 Aurora |
| Réinitialiser | Vue complète de l'ensemble |
| Code source | Source français affiché en temps réel (fetch) |
| Python transpilé | Toggle pour voir le Python généré |
| Badge benchmark | Données réelles issues de `benchmark.json` |

---

## Compilation locale

### Prérequis

- Python 3.12+
- `pip install "multilingualprogramming[wasm]"`

### Lancer le build

```bash
python build/compile_wasm.py
```

Sortie attendue :

```
==============================================================
  Explorateur de Fractales — Pipeline de compilation
==============================================================

[1] Lecture de src/mandelbrot.ml
[2] Copie vers public/mandelbrot.ml
[3] Pipeline multilingual (Lexer → Parser → Core IR)
[4] Transpilation Python → public/mandelbrot_transpiled.py
[5] Génération du binaire WebAssembly → public/mandelbrot.wasm
[6] Benchmark — grille 200×200, max_iter=100
    Python :   2 000 ms
    WASM   :      40 ms
    Accélération : 50×
[7] Résultats → public/benchmark.json

==============================================================
  ✓ Pipeline complet réussi!
    40 ms WASM · 2 000 ms Python · 50× plus rapide
==============================================================
```

### Servir localement

```bash
# Python built-in server depuis le dossier public/
python -m http.server 8080 --directory public
# Ouvrir http://localhost:8080
```

> **Note :** Les fichiers `.wasm` doivent être servis avec le type MIME
> `application/wasm`. Le serveur Python gère cela automatiquement depuis
> Python 3.7+.

---

## Déploiement GitHub Pages

Poussez sur la branche `main` — le workflow GitHub Actions fait tout :

```bash
git push origin main
```

1. Installe Python 3.12 et `multilingualprogramming[wasm]`
2. Exécute `python build/compile_wasm.py`
3. Déploie `public/` sur GitHub Pages

Configurez Pages dans les paramètres du dépôt :
**Settings → Pages → Source : GitHub Actions**.

---

## Architecture technique

### Phase de build (GitHub Actions)

```
multilingualprogramming        (bibliothèque Python)
  ├── Lexer(language="fr")      tokenise les mots-clés français
  ├── Parser(language="fr")     construit l'AST surface
  ├── lower_to_core_ir()        abaisse vers le Core IR universel
  ├── WasmGenerator             génère Rust → Cranelift → .wasm
  └── ProgramExecutor           transpile vers Python (pour l'affichage UI)
```

### Phase runtime (navigateur)

```
index.html
  └── renderer.js (module ES)
        ├── WebAssembly.instantiateStreaming("mandelbrot.wasm")
        │     └── exports.mandelbrot(cx, cy, maxIter) → f64
        ├── Rendu progressif par tranches (requestAnimationFrame)
        ├── Palettes : Feu / Océan / Aurora
        ├── Zoom/pan : clic, molette, pincement tactile
        ├── fetch("mandelbrot.ml")             → affichage du source français
        ├── fetch("mandelbrot_transpiled.py")  → Python transpilé
        └── fetch("benchmark.json")            → badge de performance
```

### Fallback JavaScript

Si le module WASM ne peut pas être chargé (CSP restrictive, navigateur ancien),
`renderer.js` bascule automatiquement sur une implémentation JavaScript
identique à `mandelbrot.ml` :

```js
function mandelbrotJS(cx, cy, maxIter) {
  let x = 0.0, y = 0.0, iter = 0.0;
  while (iter < maxIter) {
    if (x * x + y * y > 4.0) return iter;
    const xtemp = x * x - y * y + cx;
    y = 2.0 * x * y + cy;
    x = xtemp;
    iter += 1.0;
  }
  return iter;
}
```

---

## Structure du dépôt

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD → GitHub Pages
├── src/
│   └── mandelbrot.ml             # ⭐ Source multilingual français
├── build/
│   └── compile_wasm.py           # Pipeline de compilation
├── public/                       # Racine statique déployée
│   ├── index.html
│   ├── js/
│   │   └── renderer.js           # Chargeur WASM + rendu canvas
│   ├── css/
│   │   └── style.css             # Thème sombre futuriste
│   ├── mandelbrot.wasm           # ← généré par build/compile_wasm.py
│   ├── mandelbrot.ml             # ← copié depuis src/
│   ├── mandelbrot_transpiled.py  # ← généré par transpilation
│   └── benchmark.json           # ← résultats de benchmark
└── README.md
```

---

## Mots-clés français utilisés

| Mot-clé français | Équivalent Python | Rôle |
|---|---|---|
| `déf` | `def` | Définition de fonction |
| `retour` | `return` | Retourner une valeur |
| `soit` | assignation | Déclaration de variable |
| `tantque` | `while` | Boucle conditionnelle |
| `si` | `if` | Condition |

---

## Licence

MIT — voir `LICENSE`.
