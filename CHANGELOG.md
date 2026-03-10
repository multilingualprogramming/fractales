# Journal des modifications

Ce projet suit une convention inspirée de Keep a Changelog.

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
- Ajout d'un panneau latéral affichant le module `.ml` canonique et l'équivalent Python transpilé pour la fractale sélectionnée.
- Ajout d'un backend WebGL dédié pour les fractales 3D et de rendu en nuage de points avec pondération par profondeur.
- Ajout de l'export PNG courant, PNG haute résolution et vidéo WebM de zoom avec helpers d'interpolation en français.
- Ajout de palettes préréglées et d'un éditeur de palette personnalisée.

### Technique

- Mise en place d'un pipeline de build qui transpile `scripts/compile_wasm.ml`, génère les artefacts `public/` et compile le bundle principal en WASM.
- Ajout de vérifications d'intégration pour garantir la cohérence entre `src/main.ml`, `scripts/compile_wasm.ml`, `scripts/integration_checks.py` et `public/js/renderer.js`.
- Ajout de smoke tests UI et de vérifications Node pour la syntaxe JavaScript et l'instanciation WASM.
- Ajout d'un workflow GitHub Actions pour compiler, valider puis déployer automatiquement `public/` vers GitHub Pages.
- Documentation initiale du dépôt avec `README.md`, `CONTRIBUTING.md` et `AGENTS.md`.

### Limites connues

- `fractales_classes.ml` reste une démonstration de transpilation Python et n'est pas compilé vers WebAssembly.
- La qualité visuelle et les performances des fractales les plus denses dépendent fortement du navigateur, du GPU et de la mémoire disponible côté client.
