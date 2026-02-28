# Point d'entree modulaire (source humain)
# Le build WASM strict genere un bundle aplati a partir des modules.

importer fractales_escape
importer fractales_dynamique
importer fractales_variantes
importer fractales_ifs
importer fractales_lsystem

soit MODES_EVASION = ["mandelbrot", "julia", "burning_ship", "tricorn", "multibrot", "celtic", "buffalo", "perpendicular_burning_ship"]
soit MODES_DYNAMIQUE = ["newton", "phoenix"]
soit MODES_IFS = ["barnsley", "sierpinski"]
soit MODES_LSYSTEM = ["koch"]
affirmer longueur(MODES_EVASION) == 8
affirmer longueur(MODES_DYNAMIQUE) == 2
affirmer longueur(MODES_IFS) == 2
affirmer longueur(MODES_LSYSTEM) == 1
