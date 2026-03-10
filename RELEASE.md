# Release v0.1.0

## Résumé

`v0.1.0` marque la première publication officielle de l'Explorateur de Fractales.
Cette version livre une application GitHub Pages qui compile des sources multilingual françaises vers WebAssembly, expose plus de cinquante fractales interactives, affiche le code source associé dans l'interface et prend en charge l'export d'images et de vidéos.

## Points forts à reprendre dans la release GitHub

- Plus de cinquante fractales disponibles, couvrant les familles Évasion, Dynamique, IFS, L-système et Magnétiques.
- Pipeline original en français: les implémentations canoniques vivent dans `src/*.ml` puis sont compilées en WebAssembly pour le navigateur.
- Prise en charge des fractales 3D avec backend WebGL dédié pour `tetraedre_sierpinski`, `julia_quaternion` et `mandelbox`.
- Affichage contextuel du source multilingual `.ml` et de la version Python transpilée dans la barre latérale.
- Export PNG courant, PNG haute résolution et vidéo WebM de zoom.
- Palettes préréglées et palette personnalisée éditable depuis l'interface.
- Build et déploiement GitHub Pages automatisés via GitHub Actions.

## Validation recommandée avant publication

Exécuter dans cet ordre:

```powershell
node --check public\js\renderer.js
python scripts\compile_wasm.py
python scripts\integration_checks.py
python scripts\ui_smoke_checks.py
```

## Étapes de publication

1. Vérifier que l'arbre de travail ne contient pas de changement inattendu.
2. Exécuter les validations locales.
3. Créer le tag annoté `v0.1.0`.
4. Pousser le tag puis publier une release GitHub en reprenant la section "Points forts".
5. Laisser le workflow GitHub Pages reconstruire et déployer `public/`.

Exemple:

```powershell
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## Notes

- Cette release correspond à la première base stable documentée du projet.
- `fractales_classes.ml` reste un module de démonstration Python-only et ne fait pas partie du bundle WASM actif.
