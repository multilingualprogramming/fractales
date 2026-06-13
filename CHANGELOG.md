# Journal des modifications

Ce projet suit une convention inspirée de Keep a Changelog.

## [Non publié]

### Modifications

- **multilingual 0.8.1.** La dependance de build epinglee passe de
  `multilingualprogramming[wasm]==0.8.0` a `0.8.1`, avec la documentation et
  les verifications de provenance alignees.

### Ajouts

- **Atelier Croissance : automate universel (Jeu de la vie).** Nouveau
  programme `src/process/automate_universel.multi` compilé en manifeste
  `semantic-core-v1`, enregistré dans le catalogue UI avec le champ `vivant`.
  La règle B3/S23 de Conway tourne sur un treillis Moore 8 voisins et démarre
  sur un canon a planeurs de Gosper pour rendre visible la dynamique universelle.

- **Adoption des améliorations multilingual de la roadmap section C
  (2026-05-23 part 2).** Chaque amélioration côté multilingual a supprimé une
  catégorie de workarounds côté fractales :
  - **Multi-value returns** (B1) — `transforme_*_x`/`_y` × 5 paires collapsed
    en 5 fonctions retournant `(x', y')` ; `affiner_nucleus_x`/`_y` collapsed
    en `affiner_nucleus(...)`. JS lit `[x, y]` directement depuis WebAssembly
    multi-value returns (les exports renvoient un Array JS natif). ~250 lignes
    `.multi` supprimées, et un seul appel WASM par transforme/par pixel au
    lieu de deux.
  - **`format_fixed(v, n)` builtin** (B4) — `formatter_fixe_2/3/5/6` (4
    fonctions presque identiques) collapsed en un seul `formatter_fixe(v, n)`.
    N variable au runtime, clampé à `[0, 9]`. La logique JS `fixeWasm` prend
    maintenant un argument optionnel `n`.
  - **String concat sur RHS f-string/CallExpr** (B9) — workaround d'affectation
    à un local temporaire supprimé dans `formatter_exponentiel_signe`.
  - **`pow_f64` exposants réels généraux** (B8) — débloque l'usage de `**`
    avec exposant non-entier dans n'importe quel `.multi`. Plus de NaN
    silencieux. Aussi `math.exp` est maintenant ~1e-15 précis grâce à la
    réduction d'intervalle k·ln2.
  - **List ABI helpers `__ml_list_count`/`__ml_list_item`** (B5) — disponibles
    depuis JS pour lire les listes WASM sans calcul d'offsets manuel. Non
    encore adoptés systématiquement côté fractales (les readers existants
    fonctionnent) ; futurs ports les utiliseront.
  - **`math.atan` ~1e-10** (B-side prior, 2026-05-23 part 1) — log_polaire
    transform désormais bit-précis vs `Math.atan2` (tolérance test 1e-9).

  Tests : full quick_checks suite verte (41 tests fractales × 9 suites,
  inchangé en nombre mais avec API plus simple). Build verifie tous les
  exports collapsés.

- **Noyau SIMD (v128 f64x2) Mandelbrot — ~2× sur la boucle interne.** Nouveau
  module `src/fractales_simd.multi` exposant `mandelbrot_simd_pair(cx0, cy0,
  cx1, cy1, max_iter)` qui délègue au builtin multilingual `simd_mandelbrot_pair`
  (instructions WebAssembly SIMD natives : `f64x2.mul/add/sub/le`, `i64x2.add`,
  `v128.bitselect`). Itère deux pixels Mandelbrot en parallèle ; les lanes
  échappées sont gelées via bitselect — accord bit-pour-bit avec la version
  scalaire (±1 itération). `renderer.js` `remplirFractaleScalaire` détecte la
  fractale Mandelbrot pure sur le chemin synchrone (workers indisponibles ou
  transforme active) et passe les pixels par paires via la nouvelle voie
  `wasmMetaPanels.simd.mandelbrot_pair` ; pixel impair en fin de ligne traité
  en scalaire. Build vérifie l'export ; test parité dans
  `tests/meta_panels_wasm.test.js`. Pas de type v128 exposé au niveau source —
  un seul builtin spécialisé pour rester contenu.

- **Repères mathématiques (B) — détection de période + raffinage de noyau.**
  Nouveau module `src/fractales_landmark.multi` : `detecter_periode_mandelbrot`
  (Floyd cycle detection sur z²+c, tolérance configurable, retourne 1..max ou
  0 si pas de cycle), `affiner_nucleus_x` / `affiner_nucleus_y` (Newton-Raphson
  sur z_p(c) = 0 avec propagation parallèle de la dérivée dz/dc), et
  `distance_estimation_mandelbrot` (DE classique `|z|·ln|z|/|dz|`). Le panneau
  ☷ Météo capture maintenant la période et — sur Mandelbrot — le noyau
  super-attracteur dans son readout après chaque capture d'orbite (sur orbite
  bornée uniquement). Vérification numérique des landmarks connus :
  c=0 → p=1, c=-1 → p=2, c=-1.7549 → p=3, c=-1.3107 → p=4 ; Newton converge
  à 1e-12 près sur les noyaux p=2, p=3.

- **L-système stochastique : RNG porté en multilingual (bit-exact).** Nouveau
  module `src/fractales_hasard.multi` : `hash_fnv32_seed(seed: chaîne)`
  (FNV-1a 32-bit) et `prochain_hash_mulberry32(état)` (mulberry32 1-pas
  retournant `[nouvel_état, tirage ∈ [0,1))`). Bit-pour-bit identique à
  l'implémentation JS d'origine (`hacherGraineLSysteme` + `creerHasardLSysteme`)
  grâce aux nouveaux builtins multilingual `imul32` / `iadd32` / `shr_u32` /
  `u32_to_f64` (cf. changelog multilingual). `genererPropositionLSysteme`
  accepte désormais `options.hasardWasm` ; quand fourni, route via WASM.
  Permet aux grammaires stochastiques de prendre 100 % du chemin WASM
  (expansion + tortue). Test : 5 seeds × 20 itérations vérifient l'égalité
  exacte des tirages flottants.

- **Formatage exponentiel en multilingual (`formatter_exponentiel_8/9`).**
  Le backend WAT ne fournit pas `.Ne` natif ; `fractales_partage.multi` le
  construit via `math.log10` + `pow(10, e)` + `.Nf`, avec correction de la
  mantisse hors `[1, 10)` (l'erreur ~1e-6 de `math.log10` peut pousser e
  d'une unité). Retourne `"[-]m.dddddddde[+/-]E"`, round-trip
  `parseFloat`-fidèle. `encoderEtat` route `view.pixelSize`,
  `view.centerX_lo`, `view.centerY_lo` et la branche exponentielle de
  `formatFlottant` via WASM. Complète la migration partage : les seules
  parts encore JS sont l'orchestration `URLSearchParams` et le strip des
  zéros de queue (cosmétique).

- **Précision math.atan ×10⁹ en multilingual.** Voir entrée correspondante
  du CHANGELOG multilingual (double range reduction `1/x` + `(x-1)/(x+1)`,
  12 termes Taylor). Conséquence côté fractales : `appliquerTransforme(log_polaire)`
  est maintenant à ~1e-10 de `Math.atan2` (était ~5 % au pire) ; tolérance
  du test `tests/meta_panels_wasm.test.js` resserrée de 0.05 à 1e-9.

- **Autres panneaux Meta — math des panneaux ◈ Transformations, ☷ Météo
  orbites, et 🔗 Partage portée en multilingual.** Trois nouveaux modules
  authored en `.multi` :
  - `src/fractales_transforms.multi` : `transforme_log_polaire_x/y`,
    `transforme_inversion_x/y`, `transforme_pli_x/y`, `transforme_cayley_x/y`,
    `transforme_joukowski_x/y`. Math complexe pure (une fonction par
    composante, motif des attracteurs). `appliquerTransforme()` dans
    `renderer.js` route maintenant vers WASM via `wasmMetaPanels.transforms`
    quand chargé ; fallback JS identique sinon. **Précision** : depuis
    l'enhancement `math.atan` 2026-05-23 (double range reduction + 12 termes),
    log_polaire est à ~1e-10 de la référence `Math.atan2`. Inversion, plis,
    Cayley, Joukowski : exacts à 1e-12 près.
  - `src/fractales_orbite.multi` : `orbite_mandelbrot_famille(code, p_re,
    p_im, c_re_julia, c_im_julia, max_iter)` couvre 12 variantes (mandelbrot,
    julia, burning_ship, burning_julia, tricorn, celtic, perpendicular_celtic,
    buffalo, heart, perpendicular_burning_ship, perpendicular_mandelbrot,
    duck) via un code de famille i32-comme-f64 + drapeaux internes ;
    `orbite_newton` (Newton-Raphson sur z³ − 1, arrêt à racine de l'unité) ;
    `orbite_phoenix` (z²+c+p·z_{n-1}, p=0.5667). Sortie : liste plate
    [np, escaped, x0, y0, x1, y1, …] (MAX_ORBITE=320) — un seul aller-retour
    JS↔WASM par capture (au lieu d'une boucle JS de 320 itérations).
    `calculerOrbite()` dans `renderer-exploration.js` route vers WASM via
    `wasmMetaPanels.orbite` ; fallback JS exact-équivalent conservé pour init
    et fractales non couvertes par le code-famille.
  - `src/fractales_partage.multi` : validation numérique (`valider_centre`,
    `valider_pixelsize`, `valider_max_iter`, `valider_rotation`,
    `valider_etat_complet` — tous f64→f64 retournant 1.0/0.0) et formatage à
    précision fixe (`formatter_fixe_2/3/5/6` — chaînes via f-string `.Nf`).
    `encoderEtat()` route les `toFixed(2/3/5/6)` vers WASM ; `decoderEtat()`
    appelle `valider_etat_complet` en un seul aller-retour. Le formatage
    exponentiel reste JS (le backend WAT ne fournit pas `.Ne` — un futur
    enhancement de multilingual pourrait porter `formatter_exponentiel` via
    `math.log10` + extraction de mantisse IEEE-754). Tolérance d'1 ULP sur
    `toFixed` côté tests : WAT utilise round half-to-even (banker's), JS
    utilise round half-away-from-zero — divergence négligeable pour les
    coordonnées de partage.
  - Wiring : nouveau bucket `wasmMetaPanels` dans `renderer.js` (en complément
    de `wasmFunctions`/`wasmExportFunctions`/`wasmDeepZoom`), exposé à
    `initialiserExploration` (via `getWasmMetaPanels`) et `initialiserPartage`
    (idem, pour `renderer-navigation.js`). 28 tests de parité dans
    `tests/meta_panels_wasm.test.js` (ajouté à `quick_checks.py`) : transforms
    sur 6 points, orbites Mandelbrot famille (13 variantes), Newton +
    Phoenix, validation NaN/inf/négatifs, formatage à 1-ULP près. Premier
    panneau Meta non-L-système à passer entièrement par multilingual.
- **Zoom profond : intégration UI du noyau de perturbation DD côté JS.**
  La vue (`view.centerX`/`view.centerY`) porte désormais une partie basse
  double-double (`centerX_lo`/`centerY_lo`, à 0 en zoom standard, mises à
  jour à chaque pan/zoom/glissé). Nouveau module `public/js/dd.js` (`addDD`,
  `subDD`, `mulDD`, `divDDScalar`, `twoSum`, `twoProduct`) — primitives
  Dekker côté JS, miroir de `src/fractales_deep_zoom.multi`, pour éviter un
  aller-retour WASM à chaque geste utilisateur. Les gestes (`zoomAt`,
  `deplacerVue`, drag pan, animation depuis lien partagé/signets) calculent
  désormais le nouveau centre en DD ; les sources « scalaires » (presets,
  reset, restauration depuis hash sans `xlo/ylo`) remettent simplement
  `_lo` à 0. Le hash d'URL accepte deux paramètres optionnels `xlo=`/`ylo=`
  qui ne sont écrits que lorsque non nuls. Lorsque `pixelSize < 1e-13` ET
  la fractale active est mandelbrot (sans transformation, mode de
  coloration standard), `remplirFractaleScalaire` court-circuite la boucle
  par-pixel et appelle `mandelbrot_perturbation_tile(cx_h, cx_l, cy_h, cy_l,
  ps, w, h, max_iter)` (export WASM existant, déjà bundlé dans
  `mandelbrot.wasm`) qui calcule l'orbite de référence en DD une seule fois
  puis itère la perturbation par pixel en f64 — un seul appel JS↔WASM par
  tuile, lecture stride-8 du buffer renvoyé, coloration via le même
  `getColor` que le chemin standard. Tests : `tests/dd.test.js` (8 tests
  Dekker JS, dont round-trip add/sub/mul/div et scénario zoom ×1e15 en
  cascade), `tests/deep_zoom_wasm.test.js` (6 tests, dont parité 0/64
  noyau-vs-f64 natif sur grille 16×16 à ps=0.01, et préservation des bits
  sub-ulp à ps=1e-15). Signets et liens partagés transportent maintenant les
  parties basses pour un round-trip fidèle en zoom profond.
- **Mode de coloration « distance » (DE — distance estimation).** Nouveau noyau
  `.multi` `src/fractales_de.multi` exporte `mandelbrot_de` et `julia_de` qui
  itèrent z ET sa dérivée `dz_{n+1} = 2·z·dz + 1` en parallèle, puis renvoient
  `|z|·ln|z|/|dz|` à l'échappement (rayon 256). `renderer.js` intercepte le
  mode coloration `distance` pour mandelbrot/julia (et leurs variantes lisses),
  appelle le DE par pixel, et applique une rampe palette log-comprimée (γ=0.5)
  — donne une « gravure » fine des bords. Dépend de la **correction de
  `math.log`** dans multilingual (réduction de mantisse).
- **Arithmétique double-double (Dekker) en pur `.multi` + théorie de
  perturbation Mandelbrot (Pauldelbrot/Botsch).** Nouveau module
  `src/fractales_deep_zoom.multi` exporte `two_sum`, `two_product`, `add_dd`,
  `sub_dd`, `mul_dd`, `square_dd` (split sur 2^27+1, sans FMA),
  `mandelbrot_reference_orbit(cx_h, cx_l, cy_h, cy_l, max_iter)` qui itère
  l'orbite Z_{n+1}=Z_n²+C en double-double et renvoie un tampon stride-2
  `[count, Zx₀, Zy₀, …]`, et `mandelbrot_perturbation_pixel(δcx, δcy, orbit,
  max_iter)` qui itère la perturbation `δ_{n+1}=2·Z·δ+δ²+δc` en f64. Un kernel
  de tuile `mandelbrot_perturbation_tile(cx_h, cx_l, cy_h, cy_l, ps, w, h,
  max_iter)` calcule l'orbite de référence UNE fois par tuile puis distribue
  la perturbation par pixel — un seul appel JS↔WASM par tuile. Vérifié au
  pixel près contre la mandelbrot f64 native (8×8 grille, 0/64 écart). Casse
  potentiellement le mur du zoom 1e-15 vers ~1e-25 ; l'intégration UI
  (coordonnées de vue en DD côté JS, navigation deep-zoom) reste à câbler.
- **Rendu parallèle via Web Workers.** Nouveau pool de workers
  (`public/js/render-worker.js` + `public/js/renderer-workers.js`) :
  `hardwareConcurrency - 1` workers (plafonné à 8) ; chacun instancie sa
  propre copie de `mandelbrot.wasm`. `remplirFractaleScalaire` découpe le
  canvas en tuiles horizontales et dispatche en round-robin ; les itérations
  reviennent en transfert zéro-copie (`Float64Array.buffer`), la coloration
  reste sur le main thread (même logique exacte que le chemin synchrone).
  Repli synchrone automatique si Workers indisponibles, transformation de
  coordonnées active, ou erreur worker. **Sans `SharedArrayBuffer`** —
  compatible GitHub Pages sans en-têtes COOP/COEP. SIMD (`v128`/`f64x2`)
  nécessite une mise à jour du backend WAT et reste reporté.
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
- **Tortue WASM pour 100 % des L-systèmes (déterministes ET stochastiques).** Pour
  les grammaires stochastiques, l'expansion (RNG FNV+mulberry32 + alternatives
  pondérées `|`) reste en JS — préservant la reproductibilité **bit-pour-bit** des
  seeds existants partagés via les liens deep-link — mais la tortue tourne en WASM
  via le nouvel export `tortue_chemin_brut(chemin: chaîne, angle_deg)` qui marche
  une séquence DÉJÀ développée. Le canvas principal (`renderer.js`) route donc :
  déterministe → `tortue_lsysteme(axiome, regles, ...)` ; stochastique → expansion
  JS puis `tortue_chemin_brut(sequence, angle)`. Les deux chemins exercent les
  paramètres chaîne à longueur préfixée.
- **Rendu du canvas principal porté en WASM (grammaires déterministes).** Désormais
  débloqué par les **chaînes à longueur préfixée** de multilingual : la tortue est
  scindée en `tortue_lsysteme(axiome, regles, generations, angle_deg)` (tortue pure,
  axiome/règles passés comme **paramètres chaîne**, sans DOM) ; `tracer_lsysteme`
  (chemin aperçu) lit le DOM, écrit l'aperçu, puis **délègue** à `tortue_lsysteme`.
  Côté hôte, `renderer.js` marshalle l'axiome et les règles en tampons à longueur
  préfixée via le nouvel export `__ml_str_alloc(len)` et appelle `tortue_lsysteme`
  (chemin synchrone `sommetsGrammaireWasmSync`, module préchargé) ; repli JS si la
  grammaire est stochastique ou si le module n'est pas encore chargé.
- Étape `[4b]` du build (`scripts/compile_wasm.multi`) compilant l'Atelier vers
  WASM et émettant le shim hôte généré ; validation de l'export `tracer_lsysteme`.
- Test de parité `tests/atelier_lsysteme_wasm.test.js` (58 cas) vérifiant que
  l'expansion, la tortue DOM (`tracer_lsysteme`), la tortue par arguments chaîne
  (`tortue_lsysteme`, déterministe) ET la tortue de chemin brut
  (`tortue_chemin_brut`, stochastique : expansion JS + tortue WASM) reproduisent
  les références JavaScript (Koch, Dragon, grille, plante, buisson stochastique,
  ramures pondérées).

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
