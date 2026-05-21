# Journal des modifications

Ce projet suit une convention inspirée de Keep a Changelog.

## [Non publié]

### Ajouts

- **Migration « Meta » — première tranche : Atelier L-système en multilingual.**
  La grammaire L-système (réécriture simultanée de l'axiome) **et** l'interprétation
  tortue (géométrie : cos/sin, pile de branchement `[ ]`, accumulation des sommets),
  jusqu'ici écrites en JavaScript, sont désormais authored en multilingual
  (`src/atelier_lsysteme.multi`) et compilées vers leur propre module WebAssembly
  (`public/atelier_lsysteme.wasm`). Le module lit lui-même les champs du panneau
  (`#lsystem-axiom-input`, `#lsystem-rules-input`) et écrit l'aperçu
  (`#lsystem-string-preview`) via le **pont DOM** de multilingual (`dom_get` /
  `dom_value_str` / `dom_text`), puis renvoie les sommets ; le JavaScript se réduit
  au **shim hôte généré** (`public/js/atelier_lsysteme_shim.js`) plus un chargeur
  mince qui trace les sommets sur le canvas (`public/js/renderer-atelier-lsysteme.js`).
- La tortue utilise un **parcours en profondeur sans matérialisation** (symboles
  stockés comme codes via `ord()`), supprimant l'ancien plafond de 8000 caractères :
  l'aperçu couvre désormais toute la plage de générations (ex. Koch génération 7 =
  16 385 sommets) et émet `profondeur` + `angle` par sommet (coloration par segment).
- Les règles **stochastiques** (RNG + alternatives pondérées) restent traitées côté
  JavaScript ; le chemin multilingual couvre les grammaires déterministes.
- Le rendu **canvas principal** (renderer.js) reste en JavaScript : y porter le WASM
  proprement nécessite de passer axiome/règles en paramètres (les paramètres-chaîne
  WAT ne portent pas leur longueur) — bloqué sur les chaînes à longueur préfixée.
- Étape `[4b]` du build (`scripts/compile_wasm.multi`) compilant l'Atelier vers
  WASM et émettant le shim hôte généré ; validation de l'export `tracer_lsysteme`.
- Test de parité `tests/atelier_lsysteme_wasm.test.js` vérifiant que l'expansion ET
  la tortue WASM reproduisent les références JavaScript (Koch, Dragon, grille, plante).

### Notes

- Cette tranche s'appuie sur des évolutions du langage multilingual (dépôt voisin) :
  égalité de contenu des chaînes en WAT (`==`/`!=`), listes pré-dimensionnées
  `[x] * n`, builtin `dom_value_str`, correction de la table de fonctions vide pour
  `__dom_dispatch`, et **correction de `math.sin` / `math.cos`** (valeurs négées + mauvaise
  réduction d'intervalle aux angles `(3π/2, 2π)` et négatifs). L'allocateur bump WASM
  est réinitialisé (`__ml_reset`) avant chaque appel.

## [0.1.0] - 2026-03-10

Première version publiée de l'Explorateur de Fractales.

### Ajouts

- Mise en ligne d'une application GitHub Pages capable de rendre en navigateur des fractales compilées en WebAssembly depuis des sources multilingual écrites en français.
- Intégration de plus de cinquante fractales réparties entre les familles Évasion, Dynamique, IFS, L-système, Magnétiques et une démonstration de compatibilité orientée objet.
- Ajout des familles d'évasion classiques et variantes, dont Mandelbrot, Julia, Burning Ship, Tricorn, Multibrot, Celtic, Buffalo, Heart, Duck et Buddhabrot.
- Ajout de fractales dynamiques et d'attracteurs, dont Newton, Phoenix, Lyapunov, Collatz complexe, Orbitale de Nova, Clifford, Peter de Jong, Ikeda, Hénon, Lorenz et l'arbre de Feigenbaum.
- Ajout de fractales IFS et volumétriques, dont Barnsley, Sierpinski, tapis de Sierpinski, éponge de Menger, bulbe de Mandel, tétraèdre de Sierpinski, Julia quaternionique, Mandelbox, Vicsek et figures de Lichtenberg.
- Ajout de courbes et systèmes de réécriture, dont Koch, Dragon de Heighway, courbe du dragon, ensemble de Cantor, joint d'Apollonius, fractale en T, fractale en H, Hilbert, Peano et arbre de Pythagore.
- Ajout de la famille Magnétiques avec Magnet I, II, III, Lambda, Lambda cubique, Magnet cosinus, Magnet sinus et Nova magnétique.
- Ajout d'un panneau latéral affichant le module `.multi` canonique et l'équivalent Python transpilé pour la fractale sélectionnée.
- Ajout d'un backend WebGL dédié pour les fractales 3D et de rendu en nuage de points avec pondération par profondeur.
- Ajout de l'export PNG courant, PNG haute résolution et vidéo WebM de zoom avec helpers d'interpolation en français.
- Ajout de palettes préréglées et d'un éditeur de palette personnalisée.

### Technique

- Mise en place d'un pipeline de build qui transpile `scripts/compile_wasm.multi`, génère les artefacts `public/` et compile le bundle principal en WASM.
- Ajout de vérifications d'intégration pour garantir la cohérence entre `src/main.multi`, `scripts/compile_wasm.multi`, `scripts/integration_checks.py` et `public/js/renderer.js`.
- Ajout de smoke tests UI et de vérifications Node pour la syntaxe JavaScript et l'instanciation WASM.
- Ajout d'un workflow GitHub Actions pour compiler, valider puis déployer automatiquement `public/` vers GitHub Pages.
- Documentation initiale du dépôt avec `README.md`, `CONTRIBUTING.md` et `AGENTS.md`.

### Limites connues

- `fractales_classes.multi` reste une démonstration de transpilation Python et n'est pas compilé vers WebAssembly.
- La qualité visuelle et les performances des fractales les plus denses dépendent fortement du navigateur, du GPU et de la mémoire disponible côté client.
