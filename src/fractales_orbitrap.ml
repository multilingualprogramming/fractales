# Fractales par pièges d'orbite (orbit traps)
# Technique : itérer z_{n+1} = z² + c et mémoriser la distance
# minimale à une forme géométrique (cercle, croix, ligne).
# La valeur retournée encode cette distance pour la colorisation.
#
# Coloration : valeur haute = proche du piège (couleur vive),
#              valeur basse = loin du piège (fond sombre).
#
# Compilé vers WASM via le pipeline multilingual.

déf abs_orbitrap(v):
    si v < 0.0:
        retour -v
    retour v

déf min_orbitrap(a, b):
    si a < b:
        retour a
    retour b

déf mandelbrot_piege_cercle(cx, cy, max_iter):
    # Piège : cercle unité |z| = 1
    # La distance minimale à ce cercle code la couleur.
    # Note : on mesure z_1, z_2, ... (pas z_0=0)
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    soit dist_min = 1000000.0
    tantque iter < max_iter:
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        si x * x + y * y > 16.0:
            soit valeur = max_iter / (1.0 + dist_min * 18.0)
            retour min_orbitrap(valeur, max_iter * 0.98)
        # Distance au cercle |z| = 1 : | |z|² - 1 |
        soit d = abs_orbitrap(x * x + y * y - 1.0)
        si d < dist_min:
            dist_min = d
        iter = iter + 1.0
    soit valeur = max_iter / (1.0 + dist_min * 18.0)
    retour min_orbitrap(valeur, max_iter * 0.98)

déf mandelbrot_piege_croix(cx, cy, max_iter):
    # Piège : axes (droites x=0 et y=0)
    # Couleur = distance minimale aux axes
    # Note : on mesure z_1, z_2, ... (pas z_0=0 qui serait sur les axes)
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    soit dist_min = 1000000.0
    tantque iter < max_iter:
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        si x * x + y * y > 16.0:
            soit valeur = max_iter / (1.0 + dist_min * 22.0)
            retour min_orbitrap(valeur, max_iter * 0.98)
        soit dx = abs_orbitrap(x)
        soit dy = abs_orbitrap(y)
        soit d = min_orbitrap(dx, dy)
        si d < dist_min:
            dist_min = d
        iter = iter + 1.0
    soit valeur = max_iter / (1.0 + dist_min * 22.0)
    retour min_orbitrap(valeur, max_iter * 0.98)

déf mandelbrot_piege_ligne(cx, cy, max_iter):
    # Piège : droite diagonale y = x
    # Distance = |x - y| / sqrt(2)
    # Note : on mesure z_1, z_2, ... (pas z_0=0 qui serait sur la diagonale)
    soit inv_racine2 = 0.70710678118654752
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    soit dist_min = 1000000.0
    tantque iter < max_iter:
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        si x * x + y * y > 16.0:
            soit valeur = max_iter / (1.0 + dist_min * 20.0)
            retour min_orbitrap(valeur, max_iter * 0.98)
        soit d = abs_orbitrap(x - y) * inv_racine2
        si d < dist_min:
            dist_min = d
        iter = iter + 1.0
    soit valeur = max_iter / (1.0 + dist_min * 20.0)
    retour min_orbitrap(valeur, max_iter * 0.98)

déf julia_piege_cercle(zx, zy, c_re, c_im, max_iter):
    # Julia avec piège cercle unité
    soit x = zx
    soit y = zy
    soit iter = 0.0
    soit dist_min = 1000000.0
    tantque iter < max_iter:
        si x * x + y * y > 16.0:
            soit valeur = max_iter / (1.0 + dist_min * 18.0)
            retour min_orbitrap(valeur, max_iter * 0.98)
        soit d = abs_orbitrap(x * x + y * y - 1.0)
        si d < dist_min:
            dist_min = d
        soit xtemp = x * x - y * y + c_re
        y = 2.0 * x * y + c_im
        x = xtemp
        iter = iter + 1.0
    soit valeur = max_iter / (1.0 + dist_min * 18.0)
    retour min_orbitrap(valeur, max_iter * 0.98)
