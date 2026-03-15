# Contribuer

Merci de garder les changements cohérents avec l'architecture du dépôt. Ce projet combine des sources multilingual en français, une génération WebAssembly et un rendu navigateur ; une modification partielle casse facilement l'intégration.

## Préparer l'environnement

Prérequis recommandés :

- Python 3.12+
- Node.js 20+
- La dépendance Python `multilingualprogramming[wasm]`

Installation minimale :

```bash
pip install "multilingualprogramming[wasm]"
```

Lancer l'application localement :

```bash
python scripts/compile_wasm.py
python -m http.server 8080 --directory public
```

## Principes du dépôt

- Les implémentations canoniques des fractales doivent vivre dans `src/*.ml`.
- N'ajoutez pas une nouvelle fractale uniquement dans `public/js/renderer.js`, sauf s'il s'agit strictement d'un helper de dessin côté navigateur.
- Préférez les libellés et textes d'interface en français.
- Conservez les identifiants exportés stables, sauf demande explicite de renommage.
- N'éditez pas `public/main.ml` ni `public/main_wasm_bundle.ml` à la main : ils sont régénérés par `python scripts/compile_wasm.py`.

## Workflow pour modifier une fractale

Quand vous ajoutez ou modifiez une fractale, mettez à jour tous les points concernés ensemble :

1. Ajoutez ou modifiez la fonction dans le module `src/*.ml` approprié.
2. Enregistrez la fractale dans `src/main.ml`.
3. Mettez à jour les exports attendus dans `scripts/compile_wasm.ml`.
4. Mettez à jour les attentes d'intégration dans `scripts/integration_checks.py`.
5. Câblez la fractale dans `public/js/renderer.js` :
   - presets
   - familles / menus
   - chemin de rendu
   - chargement des exports WASM
   - source map
   - listes de coloration syntaxique si nécessaire
   - puis mettez à jour le module UI concerné dans `public/js/` si le changement touche l'export, les signets, le panneau source/benchmark ou un autre helper navigateur extrait
6. Mettez à jour `README.md` si les capacités documentées changent.

## Règles de rendu

- Utilisez `POINT_FRACTALS` pour les attracteurs et nuages de points.
- Utilisez `LINE_FRACTALS` pour les courbes géométriques et dessins récursifs.
- Préférez le rendu scalaire/WASM pour les fractales de type escape-time.

Pour une fractale `POINT_FRACTALS`, vérifiez aussi :

1. La présence d'une fonction JS `etapeXxx(...)`.
2. La présence d'une projection `projeterXxx(...)` si l'orbite est 3D.
3. La déclaration du booléen `estXxx` dans `renderPointFractal` et `remplirFractalePonctuelle`.
4. La présence du dispatch d'étape et de projection dans les deux boucles de rendu.
5. Une graine initiale d'orbite qui converge vers l'attracteur.
6. Un réglage cohérent de `pointsTarget`, `burnIn` et `pointsPerFrame`.

## Vérifications avant PR

Exécutez ces commandes après toute modification significative :

```powershell
node --check public\js\renderer.js
node --check public\js\renderer-source-panel.js
node --check public\js\renderer-bookmarks.js
node --check public\js\renderer-export.js
python scripts\compile_wasm.py
python scripts\integration_checks.py
python scripts\ui_smoke_checks.py
```

Ordre important : `compile_wasm.py` régénère des artefacts dans `public/`. Relancez ensuite les checks sur les fichiers générés.

## Attentes pour les pull requests

- Gardez les PRs ciblées : une idée principale par PR.
- Décrivez le comportement modifié et les zones du dépôt touchées.
- Indiquez les commandes de validation exécutées localement.
- Ajoutez des captures d'écran ou une courte vidéo si l'interface ou le rendu changent visiblement.
- Si vous ajoutez une fractale, vérifiez sa présence dans `src/main.ml`, `scripts/compile_wasm.ml`, `scripts/integration_checks.py` et dans les registres conservés dans `public/js/renderer.js` (`VIEW_PRESETS`, `FRACTAL_FAMILIES`, `FRACTAL_SOURCE_MAP`, `wasmFunctions`, `POINT_FRACTALS`/`LINE_FRACTALS` selon le cas).

## Documentation

Mettez à jour la documentation dans le même changement si vous modifiez :

- les fractales disponibles ;
- le pipeline de build ;
- les commandes de validation ;
- le comportement utilisateur visible ;
- les contraintes de contribution.
