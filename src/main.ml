# Point d'entree modulaire (source humain)
# Le build WASM strict genere un bundle aplati a partir des modules.
#
# Modules fonctionnels (compilés vers WASM) :
importer fractales_escape
importer fractales_dynamique
importer fractales_variantes
importer fractales_ifs
importer fractales_lsystem
importer fractales_magnetiques
importer fractales_export
importer fractales_classes_compat
#
# Module orienté objet (transpilation Python uniquement) :
# Démontre : classe, héritage, soi (self), super().__init__
importer fractales_classes

soit MODES_EVASION = ["mandelbrot", "julia", "burning_ship", "tricorn", "multibrot", "celtic", "buffalo", "perpendicular_burning_ship", "heart", "perpendicular_mandelbrot", "perpendicular_celtic", "duck", "buddhabrot"]
soit MODES_DYNAMIQUE = ["newton", "phoenix", "lyapunov", "lyapunov_multisequence", "bassin_newton_generalise", "orbitale_de_nova", "collatz_complexe", "attracteur_de_clifford", "attracteur_de_peter_de_jong", "attracteur_ikeda", "attracteur_de_henon", "lorenz_attractor", "rossler_attractor", "aizawa_attractor", "sprott_attractor", "feigenbaum_tree"]
soit MODES_IFS = ["barnsley", "sierpinski", "tapis_sierpinski", "menger_sponge", "mandelbulb", "vicsek_fractal", "lichtenberg_figures", "tetraedre_sierpinski", "julia_quaternion", "mandelbox"]
soit MODES_3D = ["tetraedre_sierpinski", "julia_quaternion", "mandelbox"]
soit MODES_LSYSTEM = ["koch", "dragon_heighway", "courbe_levy_c", "gosper_curve", "cantor_set", "triangle_de_cercles_recursifs", "apollonian_gasket", "t_square_fractal", "h_fractal", "hilbert_curve", "peano_curve", "arbre_pythagore"]
soit MODES_MAGNETIQUE = ["magnet1", "magnet2", "magnet3", "lambda_fractale", "lambda_cubique", "magnet_cosinus", "magnet_sinus", "nova_magnetique"]
soit MODES_CLASSES_COMPAT = ["mandelbrot_classe"]
affirmer longueur(MODES_EVASION) == 13
affirmer longueur(MODES_DYNAMIQUE) == 16
affirmer longueur(MODES_IFS) == 10
affirmer longueur(MODES_3D) == 3
affirmer longueur(MODES_LSYSTEM) == 12
affirmer longueur(MODES_MAGNETIQUE) == 8
affirmer longueur(MODES_CLASSES_COMPAT) == 1
