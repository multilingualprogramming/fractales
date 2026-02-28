# Explorateur de Fractales

Application GitHub Pages qui rend 16 fractales en **WebAssembly**, dont le code de
calcul est entièrement écrit en **français** grâce au langage
[multilingual](https://github.com/johnsamuelwrites/multilingual).

La barre latérale affiche le **code source `.ml` du module contenant la fractale
sélectionnée** et son équivalent **Python transpilé** — les deux onglets se mettent
à jour dynamiquement à chaque changement de fractale.

---

## Fractales disponibles

| Groupe | Fractales |
|---|---|
| Évasion | Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot (n=3…8), Celtic, Buffalo, Perpendicular Burning Ship |
| Dynamique | Newton (z³−1), Phoenix |
| IFS | Barnsley (fougère), Sierpinski |
| L-système | Koch (flocon de neige) |
| Magnétiques *(nouveaux)* | Magnet I, Magnet II, Lambda (logistique complexe) |

---

## Pipeline de build

```
src/
  fractales_escape.ml          ┐
  fractales_variantes.ml       │  sources multilingual français
  fractales_dynamique.ml       │  → compilés vers WebAssembly (WASM)
  fractales_ifs.ml             │
  fractales_lsystem.ml         │
  fractales_magnetiques.ml     ┘
  fractales_classes.ml         ← OOP (classe/soi/super) → Python uniquement
  main.ml                      ← point d'entrée humain (imports + assertions)
        │
        │  python scripts/compile_wasm.py  (GitHub Actions)
        │
        ├─ [2]  Bundle WASM aplati   → public/main_wasm_bundle.ml
        ├─ [2b] Copie individuelle   → public/fractales_*.ml + fractales_*.py
        ├─ [3]  Transpilation Python → public/mandelbrot_transpiled.py
        ├─ [4]  WAT + WASM           → public/main.wat + public/mandelbrot.wasm
        └─ [6]  Benchmark            → public/benchmark.json
```

À l'exécution dans le navigateur : **aucun Python, aucun wasmtime** —
uniquement l'API WebAssembly standard (`WebAssembly.instantiateStreaming`).

---

## Programmation orientée objet — `fractales_classes.ml`

Ce module démontre les fonctionnalités OOP du langage multilingual :

```text
classe Fractale:
    déf __init__(soi, max_iter):
        soi.max_iter = max_iter
        soi.rayon_echappement_carre = 4.0

    déf iterer(soi, cx, cy):
        retour 0.0

classe FractaleEvasion(Fractale):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)          ← appel du constructeur parent

classe MandelbrotFractale(FractaleEvasion):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)

    déf iterer(soi, cx, cy):               ← surcharge polymorphe
        soit x = 0.0
        ...
        retour iter
```

Hiérarchie complète :

```
Fractale
  ├── FractaleEvasion
  │     ├── MandelbrotFractale
  │     ├── JuliaFractale        (soi.c_re, soi.c_im)
  │     └── BurningShipFractale  (utilise soi.abs_val hérité)
  ├── FractaleNewton             (soi.eps_convergence)
  └── FractaleIFS
        ├── BarnsleyFractale     (soi.etape polymorphe)
        └── SierpinskiFractale   (soi.etape polymorphe)
```

> `fractales_classes.ml` est transpilé en Python mais **non compilé vers WASM**
> (le générateur WAT ne supporte pas encore la syntaxe de classe).
> Les fonctions plates des autres modules restent les implémentations WASM actives.

---

## Nouveaux modules — `fractales_magnetiques.ml`

### Magnet I

```text
déf magnet1(cx, cy, max_iter):
    # z_{n+1} = ((z² + c − 1) / (2z + c − 2))²
    ...
```

### Magnet II

```text
déf magnet2(cx, cy, max_iter):
    # z_{n+1} = ((z³ + 3(c−1)z + (c−1)(c−2)) / (3z² + 3(c−2)z + (c−1)(c−2)+1))²
    ...
```

### Lambda (logistique complexe)

```text
déf lambda_fractale(cx, cy, max_iter):
    # z_{n+1} = c · z · (1 − z),  z₀ = 0.5
    ...
```

---

## Mots-clés multilingual français

| Mot-clé | Python | Rôle |
|---|---|---|
| `déf` | `def` | Définition de fonction |
| `classe` | `class` | Définition de classe |
| `soi` | `self` | Référence à l'instance |
| `super` | `super` | Appel de la classe parente |
| `retour` | `return` | Valeur de retour |
| `soit` | assignation | Déclaration de variable |
| `tantque` | `while` | Boucle conditionnelle |
| `si` / `sinonsi` / `sinon` | `if` / `elif` / `else` | Conditions |
| `pour … dans` | `for … in` | Boucle itérative |
| `affirmer` | `assert` | Assertion |
| `importer` | `import` | Import de module |
| `Vrai` / `Faux` | `True` / `False` | Booléens |

---

## Architecture technique

### Phase de build (GitHub Actions)

```
multilingualprogramming        (bibliothèque Python)
  ├── Lexer(language="fr")     tokenise les mots-clés français
  ├── Parser(language="fr")    construit l'AST surface
  ├── WATCodeGenerator         génère le WebAssembly Text Format
  ├── wasmtime.wat2wasm()      compile WAT → binaire .wasm
  └── ProgramExecutor          transpile vers Python (affichage UI)
```

### Phase runtime (navigateur)

```
index.html
  └── renderer.js (module ES)
        ├── WebAssembly.instantiateStreaming("mandelbrot.wasm")
        │     └── exports: mandelbrot / julia / … / magnet1 / magnet2 / lambda_fractale
        ├── Rendu progressif par tranches (requestAnimationFrame)
        ├── FRACTAL_SOURCE_MAP  → module .ml contenant la fractale active
        ├── loadSources(fractal) → fetch("{module}.ml" + "{module}.py") (contextuel)
        ├── Palettes : Feu / Océan / Aurora
        ├── Zoom/pan : clic, molette, pincement tactile
        └── fetch("benchmark.json") → badge de performance
```

---

## Structure du dépôt

```
.
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── src/
│   ├── main.ml                    # Point d'entrée humain (imports + assertions)
│   ├── fractales_escape.ml        # Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot
│   ├── fractales_variantes.ml     # Celtic, Buffalo, Perpendicular Burning Ship
│   ├── fractales_dynamique.ml     # Newton, Phoenix
│   ├── fractales_ifs.ml           # Barnsley (fougère), Sierpinski
│   ├── fractales_lsystem.ml       # Koch (flocon de neige)
│   ├── fractales_magnetiques.ml   # ★ Magnet I, Magnet II, Lambda (nouveaux)
│   └── fractales_classes.ml       # ★ Hiérarchie OOP (classe/soi/super)
├── scripts/
│   ├── compile_wasm.ml            # Pipeline de build (source multilingual)
│   ├── compile_wasm.py            # Lanceur Python du pipeline
│   └── integration_checks.py      # Tests d'intégration CI
├── public/                        # Racine statique déployée sur GitHub Pages
│   ├── index.html
│   ├── js/renderer.js             # Chargeur WASM + rendu canvas + affichage contextuel
│   ├── css/style.css
│   ├── mandelbrot.wasm            # ← généré (binaire WebAssembly)
│   ├── main.ml / main_wasm_bundle.ml
│   ├── fractales_*.ml             # ← copies des sources (affichage contextuel)
│   ├── fractales_*.py             # ← transpilations individuelles (affichage contextuel)
│   ├── mandelbrot_transpiled.py   # ← transpilation du bundle complet
│   └── benchmark.json
└── README.md
```

---

## Compilation locale

### Prérequis

```bash
pip install "multilingualprogramming[wasm]"
```

### Build

```bash
python scripts/compile_wasm.py
```

### Serveur local

```bash
python -m http.server 8080 --directory public
# → http://localhost:8080
```

> Les fichiers `.wasm` doivent être servis avec le MIME `application/wasm`.
> Le serveur intégré Python gère cela automatiquement depuis Python 3.7+.

---

## Déploiement GitHub Pages

```bash
git push origin main
```

Le workflow Actions installe Python 3.12, `multilingualprogramming[wasm]`,
exécute `python scripts/compile_wasm.py`, les tests d'intégration, et déploie
`public/` sur GitHub Pages.

Configurez Pages via : **Settings → Pages → Source : GitHub Actions**.

---

## Licence

MIT — voir `LICENSE`.
