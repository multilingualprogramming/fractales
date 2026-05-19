# Explorateur de Fractales

Application GitHub Pages qui rend **81 fractales** en **WebAssembly**, dont le code de
calcul est entièrement écrit en **français** grâce au langage
[multilingual](https://github.com/johnsamuelwrites/multilingual).

La barre latérale affiche le **code source `.multi` du module contenant la fractale
sélectionnée** et son équivalent **Python transpilé** — les deux onglets se mettent
à jour dynamiquement à chaque changement de fractale.

Les réglages propres à certaines fractales sont regroupés dans un bloc
**Options spécifiques** configurable : il n'apparaît que lorsque la fractale active
utilise réellement des paramètres dédiés.

Les fonctions avancées vivent dans des **Modes d'exploration** flottants, séparés
du pied de page pour ne pas surcharger les contrôles globaux : carte des paramètres,
carnet de voyage, physique de palette, mode Abysses, studio 3D, atelier L-système
et météo mathématique.

L'application peut aussi **exporter la zone courante en PNG**, **générer une
vidéo WebM de zoom**, et **exporter les fractales L-système en SVG**. La planification
d'export reste décrite en **français multilingual** dans `fractales_export.multi`, tandis
que le navigateur gère le rendu hors écran, l'encodage et le téléchargement.

Les fractales 3D `tetraedre_sierpinski`, `julia_quaternion` et `mandelbox`
utilisent un **backend WebGL dédié** pour la navigation 3D (orbite, translation,
zoom, profondeur), tandis que leur identité, leur classement et leurs
implémentations canoniques restent définis côté **sources multilingual
françaises** dans `src/*.multi`.

---

## Fractales disponibles

| Groupe | Fractales |
|---|---|
| Évasion (23) | Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot (n=3…8), Celtic, Buffalo, Perpendicular Burning Ship, Heart, Perpendicular Mandelbrot, Perpendicular Celtic, Duck, Buddhabrot, Burning Julia, Biomorphe, Formule cosinus, Formule biomorphe, Formule tricorne, Formule perturbée, Formule rationnelle, Formule exponentielle, Formule tangente, Formule norme |
| Dynamique (17) | Newton (z³−1), Phoenix, Lyapunov, Lyapunov multiséquence, Bassin de Newton généralisé, Orbitale de Nova, Collatz complexe, Attracteur de Clifford, Attracteur de Peter de Jong, Attracteur d'Ikeda, Attracteur de Hénon, Attracteur de Lorenz, Attracteur de Rössler, Attracteur d'Aizawa, Attracteur de Sprott, Feigenbaum, Duffing |
| IFS (10) | Barnsley (fougère), Sierpinski, Tapis de Sierpinski, Éponge de Menger, Mandelbulb, Vicsek, Figures de Lichtenberg, Tétraèdre de Sierpinski, Julia quaternion, Mandelbox |
| L-système (14) | Koch (flocon de neige), Dragon de Heighway, Courbe de Lévy C, Courbe de Gosper, Ensemble de Cantor, Triangle de cercles récursifs, Joint apollonien, T-Square, H-Fractal, Courbe de Hilbert, Courbe de Peano, Arbre de Pythagore, Arbre stochastique, Plante buisson |
| Magnétiques (8) | Magnet I, Magnet II, Magnet III, Lambda (logistique complexe), Lambda cubique, Magnet cosinus, Magnet sinus, Nova magnétique |
| Lisse / Smooth (4) | Mandelbrot lisse, Julia lisse, Burning Ship lisse, Tricorn lisse |
| Pièges orbitaux (4) | Piège cercle, Piège croix, Piège ligne, Julia piège cercle |
| Classe (1) | Mandelbrot (démo OOP classe/soi/super, Python uniquement) |

---

## Pipeline de build

```
src/
  fractales_escape.multi          ┐
  fractales_variantes.multi       │
  fractales_dynamique.multi       │  sources multilingual français
  fractales_ifs.multi             │  → compilés vers WebAssembly (WASM)
  fractales_lsystem.multi         │
  fractales_magnetiques.multi     │
  fractales_lisse.multi           │  ★ coloration lisse (log_lisse sans math natif)
  fractales_orbitrap.multi        │  ★ pièges orbitaux (cercle, croix, ligne)
  fractales_export.multi          ┘  aides d'interpolation/export en français
  fractales_classes_compat.multi  ← pont WASM pour mandelbrot_classe
  fractales_classes.multi         ← OOP (classe/soi/super) → Python uniquement
  main.multi                      ← point d'entrée humain (imports + assertions)
        │
        │  python scripts/compile_wasm.py  (GitHub Actions)
        │
        ├─ [2]  Bundle WASM aplati   → public/main_wasm_bundle.multi
        ├─ [2b] Copie individuelle   → public/fractales_*.multi + fractales_*.py
        ├─ [3]  Transpilation Python → public/mandelbrot_transpiled.py
        ├─ [4]  WAT + WASM           → public/main.wat + public/mandelbrot.wasm
        └─ [6]  Benchmark            → public/benchmark.json

public/mandelbrot.wasm + public/js/renderer.js
        │
        │  python scripts/generate_api.py  (GitHub Actions)
        │
        ├─ public/api/fractals.json         (catalogue complet — 81 fractales)
        ├─ public/api/families.json         (index des 8 familles)
        ├─ public/api/families/{id}.json    (détail par famille)
        └─ public/api/palettes.json         (9 palettes)
```

À l'exécution dans le navigateur : **aucun Python, aucun wasmtime** —
uniquement l'API WebAssembly standard (`WebAssembly.instantiateStreaming`).

---

## Programmation orientée objet — `fractales_classes.multi`

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

> `fractales_classes.multi` est transpilé en Python mais **non compilé vers WASM**
> (le générateur WAT ne supporte pas encore la syntaxe de classe).
> Les fonctions plates des autres modules restent les implémentations WASM actives.

---

## Nouveaux modules — `fractales_magnetiques.multi`

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
        │                  interpoler_lineaire / interpoler_logarithmique / ajuster_iterations_export /
        │                  easer_cubique / interpoler_pixelsize_nav / interpoler_angle_nav
        ├── Rendu progressif par tranches (requestAnimationFrame)
        ├── Métadonnées fractales conservées dans renderer.js :
        │     VIEW_PRESETS / FRACTAL_FAMILIES / FRACTAL_SOURCE_MAP / wasmFunctions
        ├── renderer-navigation.js
        │     ├── encoderEtat / decoderEtat → URL hash (#f=&x=&y=&ps=&r=&i=&p=)
        │     ├── animerVersVue → zoom/pan/rotation animés (easing et interpolation via WASM)
        │     └── initialiserPartage → bouton Partager + copie dans le presse-papiers
        ├── renderer-source-panel.js
        │     ├── loadSources(fractal) → fetch("{module}.multi" + "{module}.py")
        │     └── fetch("benchmark.json") → badge de performance
        ├── renderer-bookmarks.js → signets (localStorage) + restauration de vue
        ├── renderer-export.js → PNG courant / PNG HD / vidéo WebM / SVG (L-système)
        ├── Palettes : Feu / Océan / Aurora / Braise / Lagon / Crépuscule / Neon / Infrarouge / éditeur personnalisé complet (fond, intérieur, stops)
        ├── renderer-exploration.js → modes avancés : paramètres, temps, palette, abysses, 3D, L-systèmes, météo
        ├── Zoom/pan/rotation : clic, molette, pincement tactile, touches [ ]
        ├── Couplage Julia/Mandelbrot : aperçu Julia 200×200 en temps réel au survol
        ├── Options spécifiques : bloc dynamique configurable pour les paramètres par fractale
        ├── Julia c et puissance Multibrot : exemples de réglages dédiés
        ├── Raccourcis clavier : r (réinitialiser), e (export), b (signet), [ / ] (rotation), Échap
        └── renderer3d.js → backend WebGL dédié aux vues 3D
```

---

## Structure du dépôt

```
.
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── src/
│   ├── main.multi                    # Point d'entrée humain (imports + assertions)
│   ├── fractales_escape.multi        # Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot, Burning Julia, Biomorphe
│   ├── fractales_variantes.multi     # Celtic, Buffalo, Perpendicular Burning Ship, Heart, Duck, …
│   ├── fractales_dynamique.multi     # Newton, Phoenix, Lyapunov, attracteurs de Clifford/Hénon/Lorenz/…, Duffing
│   ├── fractales_ifs.multi           # Barnsley, Sierpinski, Mandelbulb, Mandelbox, Vicsek, …
│   ├── fractales_lsystem.multi       # Koch, Dragon, Lévy C, Gosper, Hilbert, Peano, Arbre de Pythagore, …
│   ├── fractales_magnetiques.multi   # Magnet I, II, III, Lambda, variantes sin/cos, Nova magnétique
│   ├── fractales_lisse.multi         # ★ Coloration lisse (mandelbrot_lisse, julia_lisse, …) — log_lisse sans math natif
│   ├── fractales_orbitrap.multi      # ★ Pièges orbitaux (piege_cercle, piege_croix, piege_ligne, julia_piege_cercle)
│   ├── fractales_export.multi        # Interpolation et réglages d'export en français
│   ├── fractales_formule.multi       # Primitives complexes et préréglages canoniques de l'Atelier formule
│   ├── fractales_classes_compat.multi # Pont WASM pour mandelbrot_classe
│   └── fractales_classes.multi       # ★ Hiérarchie OOP (classe/soi/super) — Python uniquement
├── scripts/
│   ├── compile_wasm.multi            # Pipeline de build (source multilingual)
│   ├── compile_wasm.py               # Lanceur Python du pipeline
│   ├── generate_api.py               # Génère public/api/ depuis renderer.js (CI artifact)
│   ├── integration_checks.py         # Tests d'intégration CI
│   ├── js_backend_contract_checks.py # Contrat JS ↔ source canonique français
│   ├── quick_checks.py               # Vérifications rapides locales/CI
│   └── ui_smoke_checks.py            # Smoke tests UI
├── public/                        # Racine statique déployée sur GitHub Pages
│   ├── index.html
│   ├── js/renderer.js             # Orchestrateur UI + registres fractales + rendu principal
│   ├── js/renderer-navigation.js  # URL hash, deep links, animation zoom/pan/rotation
│   ├── js/renderer-source-panel.js # Code source contextuel + benchmark
│   ├── js/renderer-bookmarks.js   # Signets navigateur
│   ├── js/renderer-export.js      # Export PNG / WebM / SVG
│   ├── js/renderer-exploration.js # Modes d'exploration avancés
│   ├── js/renderer-lsystem.js     # Atelier L-système local
│   ├── js/renderer-formule.js     # Atelier formule local
│   ├── js/renderer3d.js           # Backend WebGL des fractales 3D
│   ├── css/style.css
│   ├── tools.json                 # Définitions d'outils MCP + OpenAI
│   ├── ai-manifest.json           # Manifeste de découverte FAIR pour agents IA
│   ├── schemas/                   # JSON Schema 2020-12 (fractal, deeplink-params, tool-result)
│   ├── examples/                  # Exemples d'appels et workflow agent (4 fichiers)
│   ├── mandelbrot.wasm            # ← généré (binaire WebAssembly)
│   ├── main.multi / main_wasm_bundle.multi
│   ├── fractales_*.multi          # ← copies des sources (affichage contextuel)
│   ├── fractales_*.py             # ← transpilations individuelles (affichage contextuel)
│   ├── mandelbrot_transpiled.py   # ← transpilation du bundle complet
│   ├── benchmark.json             # ← généré (résultats de benchmark)
│   └── api/                       # ← généré par generate_api.py (gitignore)
│       ├── fractals.json          #   catalogue complet (81 fractales)
│       ├── exploration-modes.json #   modes avancés et champs deeplink
│       ├── families.json          #   index des 8 familles
│       └── families/{id}.json     #   détail par famille
└── README.md
```

---

## Compilation locale

### Prérequis

```bash
pip install -r requirements-build.txt
```

Outils recommandés pour le développement local :

- Python 3.12+
- Node.js 20+ pour les vérifications JavaScript des modules de `public/js/`
- Un serveur statique capable de servir `.wasm` avec le MIME `application/wasm`

### Build

```bash
python scripts/compile_wasm.py
python scripts/generate_api.py
python scripts/integration_checks.py
python scripts/quick_checks.py
```

Pour tester explicitement une copie locale du depot `multilingual` au lieu de la
version epinglee :

```powershell
$env:MULTILINGUAL_DEV_PATH="..\\multilingual"
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

## Contribuer

Le flux de contribution est documenté dans [`CONTRIBUTING.md`](CONTRIBUTING.md).

Résumé des règles les plus importantes :

- Les implémentations canoniques des fractales vivent dans `src/*.multi`.
- `public/main_wasm_bundle.multi` et `public/main.multi` sont régénérés ; ne les éditez pas à la main.
- Toute fractale ajoutée dans `src/main.multi` doit aussi être enregistrée dans `scripts/compile_wasm.multi`, `scripts/integration_checks.py` et `public/js/renderer.js`.
- Après une modification significative, exécutez les vérifications locales avant d'ouvrir une PR.

---

## Nouveaux modules — `fractales_lisse.multi`

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

## Nouveaux modules — `fractales_orbitrap.multi`

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
| `[` / `]` | Tourner la vue de ±5° (non disponible pour les fractales 3D) |
| `Échap` | Fermer les panneaux ouverts |

---

## URL partageable et navigation animée

Chaque vue est encodée dans le fragment d'URL (`#`) et mise à jour en temps réel :

```
https://multilingualprogramming.github.io/fractales/#f=mandelbrot&x=-0.5&y=0.0&ps=4.375e-3&r=0&i=256&p=aurora
```

| Paramètre | Rôle | Exemple |
|---|---|---|
| `f` | Identifiant de la fractale | `mandelbrot`, `julia`, `barnsley` |
| `x`, `y` | Centre dans le plan complexe | `-0.7436`, `0.1318` |
| `ps` | Taille d'un pixel (contrôle le zoom) | `1.5e-9` pour un zoom profond |
| `r` | Rotation en radians | `0.523` (≈ 30°) |
| `i` | Nombre maximal d'itérations | `1024` |
| `p` | Palette de couleurs | `ocean`, `neon`, `feu` |
| `jr` / `ji` | Paramètre `c` des fractales Julia | `jr=-0.8&ji=0.156` |
| `cm` / `ph` / `pc` | Physique de palette : mode, phase, contours | `cm=phase&ph=0.35&pc=1` |
| `azi` / `q` | Mode Abysses : itérations auto, qualité | `azi=1&q=fine` |
| `mat` / `fog` | Studio 3D : matière et brume de profondeur | `mat=xray&fog=0.4` |
| `ov` | Météo mathématique : surcouches actives | `ov=grille,contours` |
| `lp` / `lg` / `la` / `lax` / `lr` | Proposition L-système appliquée | `lp=1&lg=4&la=60&lax=F&lr=F%3DF%2BF--F%2BF` |

Le bouton **Partager** copie l'URL courante dans le presse-papiers. Ouvrir un lien partagé charge la fractale et anime le zoom vers la position encodée grâce aux fonctions WASM de `fractales_navigation.multi` :

- `easer_cubique(t)` — lissage cubique Hermite
- `interpoler_pixelsize_nav(ps_dep, ps_arr, t)` — interpolation logarithmique du zoom
- `interpoler_angle_nav(a, b, t)` — interpolation angulaire par le chemin le plus court

### Modes d'exploration

Les modes d'exploration sont accessibles par une barre verticale flottante dans la
zone de rendu. Ils ne modifient pas la structure du pied de page, en version
déployée comme en version réduite.

- **Carte des paramètres** : mini-plan du paramètre `c` pour les fractales Julia ;
  un clic met à jour `jr` / `ji` dans l'URL.
- **Carnet de voyage** : étapes locales en `localStorage` pour rejouer une trajectoire
  de vues capturées.
- **Physique de palette** : modes `standard`, `histogramme`, `phase`, `contours`,
  `potentiel`, en plus des palettes existantes.
- **Mode Abysses** : lecture de l'exposant de zoom, avertissement de précision et
  itérations automatiques optionnelles.
- **Studio 3D** : presets de caméra et état de matière/brume pour les fractales WebGL.
- **Atelier L-système** : aperçu local d'une proposition
  `axiome + règles + angle + graine`, avec règles déterministes ou stochastiques
  pondérées (`F=0.5:FF|0.5:F[+F]`). Une même graine donne toujours le même tracé ;
  la coloration par progression/profondeur/orientation et l'épaisseur du trait
  sont configurables, puis le bouton **Appliquer** rend cette proposition dans la zone principale et
  l'exporte via le pipeline L-système. Une proposition appliquée est encodée dans
  l'URL mais n'est pas une fractale canonique tant qu'elle n'est pas ajoutée dans
  `src/fractales_lsystem.multi` et les registres associés.
- **Atelier formule** : banc d'essai local pour formules d'itération complexes,
  avec diagnostics de parseur, fonctions complexes (`tan`, `arg`, `norm`, `re`,
  `im`, …), paramètres nommés `a` / `b`, aperçu, sauvegarde locale et liens encodés via
  `fpa` / `ffi` / `ffe` / `ffm` / `ffa` / `ffb`. Plusieurs préréglages disposent
  aussi d'une version canonique compilée dans `src/fractales_formule.multi`, et le
  bouton **Copier le manifeste** prépare les métadonnées de promotion d'une
  expérience locale vers une fonction canonique.
- **Météo mathématique** : grille/axes, contours et orbite capturée comme surcouches
  analytiques, encodées via `ov`.

---

## Interface pour agents IA

L'application expose une couche machine-readable statique, sans serveur, compatible MCP et OpenAI function-calling :

| Fichier | Contenu |
|---|---|
| `tools.json` | Outils statiques : catalogue, familles, deep links, sources, benchmarks, palettes et modes d'exploration |
| `ai-manifest.json` | Manifeste de découverte FAIR — point d'entrée pour les agents IA |
| `schemas/` | JSON Schema 2020-12 pour les entrées de fractale, les paramètres deeplink, les résultats d'outils |
| `examples/` | Exemples d'appels et workflow agent en 4 étapes |
| `api/fractals.json` | Catalogue complet des 81 fractales (généré par CI) |
| `api/families.json` | Index des 8 familles (généré par CI) |
| `api/palettes.json` | 9 palettes disponibles (généré par CI) |
| `api/exploration-modes.json` | Modes avancés et champs de deep link associés (généré par CI) |

`public/api/` est généré à chaque build par `scripts/generate_api.py` (lecture de `renderer.js`) et n'est pas versionné dans git.

Workflow typique d'un agent IA :

1. `GET /api/families.json` — découvrir les catégories mathématiques
2. `GET /api/families/{id}.json` — lister les fractales d'une famille
3. Construire un deep link : `#f=barnsley&x=0.0&y=0.0&ps=5e-3&r=0&i=256&p=feu`
4. Optionnel : `GET /fractales_ifs.multi` — lire le code source de l'implémentation

---

## Export

Le bouton `Exporter` ouvre un panneau avec quatre fonctions :

- `PNG courant` : enregistre le canevas visible tel quel.
- `PNG haute résolution` : relance le rendu hors écran avec une largeur et une hauteur choisies.
- `Créer la vidéo` : interpole entre une vue de départ et une vue d'arrivée pour produire un zoom `WebM`.
- `Exporter SVG` : disponible uniquement pour les fractales L-système ; capture les commandes de tracé via un contexte mock et génère un fichier `.svg` vectoriel.

La séparation des rôles reste volontaire :

- `src/fractales_export.multi` contient les helpers français `interpoler_lineaire`, `interpoler_logarithmique` et `ajuster_iterations_export`.
- `public/js/renderer.js` orchestre l'export et délègue le rendu hors écran, `MediaRecorder`, `toBlob()` et le téléchargement à `public/js/renderer-export.js`.

---

## Déploiement GitHub Pages

```bash
git push origin main
```

Le workflow Actions installe Python 3.12 et la version epinglée dans
`requirements-build.txt`, exécute `python scripts/compile_wasm.py`, puis
`python scripts/generate_api.py` (qui génère `public/api/`), les tests d'intégration,
`python scripts/quick_checks.py` (syntax checks JS, tests Node, smoke UI et contrat
JS/source français), puis déploie `public/` sur GitHub Pages.

Un workflow planifie surveille aussi la compatibilite avec la version epinglee,
la derniere version publiee et la branche `main` du depot amont
`johnsamuelwrites/multilingual`.

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

GNU General Public License v3.0 (GPL-3.0) — voir `LICENSE`.
