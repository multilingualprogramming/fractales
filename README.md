# Explorateur de Fractales

Application GitHub Pages qui rend **70 fractales** en **WebAssembly**, dont le code de
calcul est entièrement écrit en **français** grâce au langage
[multilingual](https://github.com/johnsamuelwrites/multilingual).

La barre latérale affiche le **code source `.ml` du module contenant la fractale
sélectionnée** et son équivalent **Python transpilé** — les deux onglets se mettent
à jour dynamiquement à chaque changement de fractale.

Les réglages propres à certaines fractales sont regroupés dans un bloc
**Options spécifiques** configurable : il n'apparaît que lorsque la fractale active
utilise réellement des paramètres dédiés.

L'application peut aussi **exporter la zone courante en PNG**, **générer une
vidéo WebM de zoom**, et **exporter les fractales L-système en SVG**. La planification
d'export reste décrite en **français multilingual** dans `fractales_export.ml`, tandis
que le navigateur gère le rendu hors écran, l'encodage et le téléchargement.

Les fractales 3D `tetraedre_sierpinski`, `julia_quaternion` et `mandelbox`
utilisent un **backend WebGL dédié** pour la navigation 3D (orbite, translation,
zoom, profondeur), tandis que leur identité, leur classement et leurs
implémentations canoniques restent définis côté **sources multilingual
françaises** dans `src/*.ml`.

---

## Fractales disponibles

| Groupe | Fractales |
|---|---|
| Évasion (15) | Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot (n=3…8), Celtic, Buffalo, Perpendicular Burning Ship, Heart, Perpendicular Mandelbrot, Perpendicular Celtic, Duck, Buddhabrot, Burning Julia, Biomorphe |
| Dynamique (17) | Newton (z³−1), Phoenix, Lyapunov, Lyapunov multiséquence, Bassin de Newton généralisé, Orbitale de Nova, Collatz complexe, Attracteur de Clifford, Attracteur de Peter de Jong, Attracteur d'Ikeda, Attracteur de Hénon, Attracteur de Lorenz, Attracteur de Rössler, Attracteur d'Aizawa, Attracteur de Sprott, Feigenbaum, Duffing |
| IFS (10) | Barnsley (fougère), Sierpinski, Tapis de Sierpinski, Éponge de Menger, Mandelbulb, Vicsek, Figures de Lichtenberg, Tétraèdre de Sierpinski, Julia quaternion, Mandelbox |
| L-système (12) | Koch (flocon de neige), Dragon de Heighway, Courbe de Lévy C, Courbe de Gosper, Ensemble de Cantor, Triangle de cercles récursifs, Joint apollonien, T-Square, H-Fractal, Courbe de Hilbert, Courbe de Peano, Arbre de Pythagore |
| Magnétiques (8) | Magnet I, Magnet II, Magnet III, Lambda (logistique complexe), Lambda cubique, Magnet cosinus, Magnet sinus, Nova magnétique |
| Lisse / Smooth (4) | Mandelbrot lisse, Julia lisse, Burning Ship lisse, Tricorn lisse |
| Pièges orbitaux (4) | Piège cercle, Piège croix, Piège ligne, Julia piège cercle |

---

## Pipeline de build

```
src/
  fractales_escape.ml          ┐
  fractales_variantes.ml       │
  fractales_dynamique.ml       │  sources multilingual français
  fractales_ifs.ml             │  → compilés vers WebAssembly (WASM)
  fractales_lsystem.ml         │
  fractales_magnetiques.ml     │
  fractales_lisse.ml           │  ★ coloration lisse (log_lisse sans math natif)
  fractales_orbitrap.ml        │  ★ pièges orbitaux (cercle, croix, ligne)
  fractales_export.ml          ┘  aides d'interpolation/export en français
  fractales_classes_compat.ml  ← pont WASM pour mandelbrot_classe
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

### Variantes magnétiques supplémentaires

```text
déf magnet3(cx, cy, max_iter):
    # Variante rationnelle cubique de la famille Magnet
    ...

déf lambda_cubique(cx, cy, max_iter):
    # z_{n+1} = c · z · (1 − z²)
    ...

déf magnet_cosinus(cx, cy, max_iter):
    # Paramètre magnétique modulé par cos/sin
    ...

déf magnet_sinus(cx, cy, max_iter):
    # Variante magnétique sinusoïdale
    ...

déf nova_magnetique(cx, cy, max_iter):
    # Croisement entre Nova et transformation magnétique
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
  └── renderer.js (module ES orchestrateur)
        ├── WebAssembly.instantiateStreaming("mandelbrot.wasm")
        │     └── exports: mandelbrot / julia / burning_julia / biomorphe /
        │                  mandelbrot_lisse / julia_lisse / burning_ship_lisse / tricorn_lisse /
        │                  mandelbrot_piege_cercle / mandelbrot_piege_croix /
        │                  mandelbrot_piege_ligne / julia_piege_cercle /
        │                  duffing_attractor / … / nova_magnetique /
        │                  interpoler_lineaire / interpoler_logarithmique / ajuster_iterations_export
        ├── Rendu progressif par tranches (requestAnimationFrame)
        ├── Métadonnées fractales conservées dans renderer.js :
        │     VIEW_PRESETS / FRACTAL_FAMILIES / FRACTAL_SOURCE_MAP / wasmFunctions
        ├── renderer-source-panel.js
        │     ├── loadSources(fractal) → fetch("{module}.ml" + "{module}.py")
        │     └── fetch("benchmark.json") → badge de performance
        ├── renderer-bookmarks.js → signets (localStorage) + restauration de vue
        ├── renderer-export.js → PNG courant / PNG HD / vidéo WebM / SVG (L-système)
        ├── Palettes : Feu / Océan / Aurora / Braise / Lagon / Crépuscule / Neon / Infrarouge / éditeur personnalisé complet (fond, intérieur, stops)
        ├── Zoom/pan : clic, molette, pincement tactile
        ├── Couplage Julia/Mandelbrot : aperçu Julia 200×200 en temps réel au survol
        ├── Options spécifiques : bloc dynamique configurable pour les paramètres par fractale
        ├── Julia c et puissance Multibrot : exemples de réglages dédiés
        ├── Raccourcis clavier : r (réinitialiser), e (export), b (signet), Échap
        └── renderer3d.js → backend WebGL dédié aux vues 3D
```

---

## Structure du dépôt

```
.
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── src/
│   ├── main.ml                    # Point d'entrée humain (imports + assertions)
│   ├── fractales_escape.ml        # Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot, Burning Julia, Biomorphe
│   ├── fractales_variantes.ml     # Celtic, Buffalo, Perpendicular Burning Ship, Heart, Duck, …
│   ├── fractales_dynamique.ml     # Newton, Phoenix, Lyapunov, attracteurs de Clifford/Hénon/Lorenz/…, Duffing
│   ├── fractales_ifs.ml           # Barnsley, Sierpinski, Mandelbulb, Mandelbox, Vicsek, …
│   ├── fractales_lsystem.ml       # Koch, Dragon, Lévy C, Gosper, Hilbert, Peano, Arbre de Pythagore, …
│   ├── fractales_magnetiques.ml   # Magnet I, II, III, Lambda, variantes sin/cos, Nova magnétique
│   ├── fractales_lisse.ml         # ★ Coloration lisse (mandelbrot_lisse, julia_lisse, …) — log_lisse sans math natif
│   ├── fractales_orbitrap.ml      # ★ Pièges orbitaux (piege_cercle, piege_croix, piege_ligne, julia_piege_cercle)
│   ├── fractales_export.ml        # Interpolation et réglages d'export en français
│   ├── fractales_classes_compat.ml # Pont WASM pour mandelbrot_classe
│   └── fractales_classes.ml       # ★ Hiérarchie OOP (classe/soi/super) — Python uniquement
├── scripts/
│   ├── compile_wasm.ml            # Pipeline de build (source multilingual)
│   ├── compile_wasm.py            # Lanceur Python du pipeline
│   └── integration_checks.py      # Tests d'intégration CI
├── public/                        # Racine statique déployée sur GitHub Pages
│   ├── index.html
│   ├── js/renderer.js             # Orchestrateur UI + registres fractales + rendu principal
│   ├── js/renderer-source-panel.js # Code source contextuel + benchmark
│   ├── js/renderer-bookmarks.js   # Signets navigateur
│   ├── js/renderer-export.js      # Export PNG / WebM / SVG
│   ├── js/renderer3d.js           # Backend WebGL des fractales 3D
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

Outils recommandés pour le développement local :

- Python 3.12+
- Node.js 20+ pour les vérifications JavaScript des modules de `public/js/`
- Un serveur statique capable de servir `.wasm` avec le MIME `application/wasm`

### Build

```bash
python scripts/compile_wasm.py
python scripts/integration_checks.py
python scripts/ui_smoke_checks.py
node --check public/js/renderer.js
node --check public/js/renderer-source-panel.js
node --check public/js/renderer-bookmarks.js
node --check public/js/renderer-export.js
```

### Serveur local

```bash
python -m http.server 8080 --directory public
# → http://localhost:8080
```

> Les fichiers `.wasm` doivent être servis avec le MIME `application/wasm`.
> Le serveur intégré Python gère cela automatiquement depuis Python 3.7+.

---

## Contribuer

Le flux de contribution est documenté dans [`CONTRIBUTING.md`](CONTRIBUTING.md).

Résumé des règles les plus importantes :

- Les implémentations canoniques des fractales vivent dans `src/*.ml`.
- `public/main_wasm_bundle.ml` et `public/main.ml` sont régénérés ; ne les éditez pas à la main.
- Toute fractale ajoutée dans `src/main.ml` doit aussi être enregistrée dans `scripts/compile_wasm.ml`, `scripts/integration_checks.py` et `public/js/renderer.js`.
- Après une modification significative, exécutez les vérifications locales avant d'ouvrir une PR.

---

## Nouveaux modules — `fractales_lisse.ml`

Implémente la **coloration lisse** (smooth coloring) pour les ensembles d'évasion.
La formule `μ = iter + 2 − (ln ln |z|² − ln ln 2) / ln 2` élimine les bandes de couleur.

La fonction `log_lisse(x)` est calculée entièrement en multilingual français, sans import
de bibliothèque mathématique, grâce à une réduction de portée itérative puis une série d'Atanh :

```text
déf log_lisse(x):
    soit ln2 = 0.693147180559945
    soit resultat = 0.0
    tantque x >= 2.0:
        x = x * 0.5
        resultat = resultat + ln2
    ...
    soit t = (x - 1.0) / (x + 1.0)
    retour resultat + 2.0 * (t + t³/3 + t⁵/5 + t⁷/7)
```

Fractales exposées : `mandelbrot_lisse`, `julia_lisse`, `burning_ship_lisse`, `tricorn_lisse`.

---

## Nouveaux modules — `fractales_orbitrap.ml`

Implémente les **pièges orbitaux** (orbit traps). À chaque itération, la distance minimale
de l'orbite à une forme géométrique (cercle `|z|=1`, axes, diagonale) est enregistrée.
La valeur de retour `max_iter / (1 + dist_min × échelle)` est compatible avec le pipeline
de palette existant : proche du piège → valeur élevée (brillant), loin → valeur faible (sombre).

```text
déf mandelbrot_piege_cercle(cx, cy, max_iter):
    # distance au cercle unité : | |z|² - 1 |
    ...
déf mandelbrot_piege_croix(cx, cy, max_iter):
    # distance aux axes : min(|Re(z)|, |Im(z)|)
    ...
déf mandelbrot_piege_ligne(cx, cy, max_iter):
    # distance à la diagonale : |x - y| / √2
    ...
```

---

## Fonctionnalités interactives

### Couplage Julia/Mandelbrot

Lorsque la fractale active est Mandelbrot (ou une variante d'évasion), un canvas
de 200×200 pixels affiché en surimpression montre en temps réel l'ensemble de Julia
correspondant à la position du curseur (c = coordonnées complexes du pointeur).

### Options spécifiques

La barre de contrôles sépare les réglages globaux des réglages propres à certaines
fractales. Le bloc **Options spécifiques** est affiché uniquement lorsque la fractale
active possède un ou plusieurs paramètres dédiés.

Ce bloc est volontairement **générique et configurable** : il peut être réutilisé
pour d'autres fractales au-delà de Julia et Multibrot. Pour ajouter un nouveau
réglage spécifique, il faut :

1. ajouter son sous-groupe dans `public/index.html` ;
2. le styliser dans `public/css/style.css` ;
3. l'activer conditionnellement dans `mettreAJourOptionsSpecifiques()` dans `public/js/renderer.js` ;
4. synchroniser sa valeur avec `params`, puis vérifier sa propagation vers les signets et l'export via les modules UI dédiés si nécessaire.

### Julia c

Pour toutes les fractales de type Julia (`julia`, `burning_julia`, `julia_lisse`,
`julia_piege_cercle`), `Options spécifiques` affiche deux curseurs permettant
d'ajuster le paramètre `c` (partie réelle et imaginaire) et de relancer le rendu
en direct.

### Puissance Multibrot

Pour `multibrot`, `Options spécifiques` affiche le sélecteur de `puissance`.
Ce réglage ne doit pas apparaître pour les fractales qui n'utilisent pas
`params.multibrotPower`.

### Signets

Un système de signets persisté dans `localStorage` permet de sauvegarder et de
restaurer n'importe quelle vue (fractale, centre, zoom). Le panneau s'ouvre avec
le bouton `Signet ★` ou le raccourci `b`.

### Raccourcis clavier

| Touche | Action |
|---|---|
| `r` | Réinitialiser la vue au preset par défaut |
| `e` | Ouvrir le panneau d'export |
| `b` | Ajouter un signet pour la vue actuelle |
| `Échap` | Fermer les panneaux ouverts |

---

## Export

Le bouton `Exporter` ouvre un panneau avec quatre fonctions :

- `PNG courant` : enregistre le canevas visible tel quel.
- `PNG haute résolution` : relance le rendu hors écran avec une largeur et une hauteur choisies.
- `Créer la vidéo` : interpole entre une vue de départ et une vue d'arrivée pour produire un zoom `WebM`.
- `Exporter SVG` : disponible uniquement pour les fractales L-système ; capture les commandes de tracé via un contexte mock et génère un fichier `.svg` vectoriel.

La séparation des rôles reste volontaire :

- `src/fractales_export.ml` contient les helpers français `interpoler_lineaire`, `interpoler_logarithmique` et `ajuster_iterations_export`.
- `public/js/renderer.js` orchestre l'export et délègue le rendu hors écran, `MediaRecorder`, `toBlob()` et le téléchargement à `public/js/renderer-export.js`.

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

## Documentation du dépôt

La documentation principale de ce projet est répartie ainsi :

- `README.md` : vue d'ensemble, architecture, build local et déploiement.
- `CONTRIBUTING.md` : workflow de contribution et checklist de validation.
- `AGENTS.md` : règles d'édition spécifiques au dépôt pour les agents/outils automatisés.

Si vous modifiez le comportement visible, ajoutez ou retirez une fractale, ou changez le pipeline de build, mettez à jour la documentation correspondante dans le même commit.

---

## Licence

MIT — voir `LICENSE`.

