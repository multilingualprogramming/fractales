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
importer fractales_classes_compat
#
# Module orienté objet (transpilation Python uniquement) :
# Démontre : classe, héritage, soi (self), super().__init__
importer fractales_classes

soit MODES_EVASION = ["mandelbrot", "julia", "burning_ship", "tricorn", "multibrot", "celtic", "buffalo", "perpendicular_burning_ship"]
soit MODES_DYNAMIQUE = ["newton", "phoenix"]
soit MODES_IFS = ["barnsley", "sierpinski"]
soit MODES_LSYSTEM = ["koch"]
soit MODES_MAGNETIQUE = ["magnet1", "magnet2", "lambda_fractale"]
soit MODES_CLASSES_COMPAT = ["mandelbrot_classe"]
affirmer longueur(MODES_EVASION) == 8
affirmer longueur(MODES_DYNAMIQUE) == 2
affirmer longueur(MODES_IFS) == 2
affirmer longueur(MODES_LSYSTEM) == 1
affirmer longueur(MODES_MAGNETIQUE) == 3
affirmer longueur(MODES_CLASSES_COMPAT) == 1
