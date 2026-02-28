# Point d'entree modulaire (multilingual FR)
# Demonstration des imports + organisation par familles

importer math
importer fractales_escape
importer fractales_dynamique
importer fractales_ifs

soit MODES_EVASION = ["mandelbrot", "julia", "burning_ship", "tricorn"]
soit MODES_DYNAMIQUE = ["newton", "phoenix"]
soit MODES_IFS = ["barnsley", "sierpinski"]
affirmer longueur(MODES_EVASION) == 4
affirmer longueur(MODES_DYNAMIQUE) == 2
affirmer longueur(MODES_IFS) == 2

déf mandelbrot(cx, cy, max_iter):
    retour fractales_escape.mandelbrot(cx, cy, max_iter)

déf julia(zx, zy, c_re, c_im, max_iter):
    retour fractales_escape.julia(zx, zy, c_re, c_im, max_iter)

déf burning_ship(cx, cy, max_iter):
    retour fractales_escape.burning_ship(cx, cy, max_iter)

déf tricorn(cx, cy, max_iter):
    retour fractales_escape.tricorn(cx, cy, max_iter)

déf newton(zx, zy, max_iter):
    retour fractales_dynamique.newton(zx, zy, max_iter)

déf phoenix(cx, cy, max_iter):
    retour fractales_dynamique.phoenix(cx, cy, max_iter)

déf barnsley_etape(x, y, choix):
    retour fractales_ifs.barnsley_etape(x, y, choix)

déf sierpinski_etape(x, y, choix):
    retour fractales_ifs.sierpinski_etape(x, y, choix)
