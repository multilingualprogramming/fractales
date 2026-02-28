déf racine_approx(valeur):
    si valeur <= 0.0:
        retour 0.0
    soit x = valeur
    si x < 1.0:
        x = 1.0
    soit i = 0.0
    tantque i < 8.0:
        x = 0.5 * (x + valeur / x)
        i = i + 1.0
    retour x

déf abs_ifs(v):
    si v < 0.0:
        retour -v
    retour v

déf barnsley_etape(x, y, choix):
    si choix < 0.01:
        retour (0.0, 0.16 * y)
    sinonsi choix < 0.86:
        retour (0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6)
    sinonsi choix < 0.93:
        retour (0.20 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6)
    sinon:
        retour (-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44)

déf sierpinski_etape(x, y, choix):
    si choix < 0.333333333:
        retour (0.5 * x, 0.5 * y)
    sinonsi choix < 0.666666666:
        retour (0.5 * x + 0.5, 0.5 * y)
    sinon:
        retour (0.5 * x + 0.25, 0.5 * y + 0.43301270189)

déf barnsley(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit meilleur = 1.0e9
    soit choix = 0.314159265
    soit iter_lim = max_iter
    soit iter = 0.0
    tantque iter < iter_lim:
        choix = (choix * 3.987654321 + 0.123456789) % 1.0
        soit pt = barnsley_etape(x, y, choix)
        x = pt[0]
        y = pt[1]
        soit tx = cx * 0.42
        soit ty = cy * 0.82 + 1.0
        soit d = (x - tx) * (x - tx) + (y - ty) * (y - ty)
        si d < meilleur:
            meilleur = d
        iter = iter + 1.0

    soit score = max_iter - racine_approx(meilleur) * 40.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf sierpinski(cx, cy, max_iter):
    soit tx = (cx + 0.2) / 1.4
    soit ty = (cy + 0.35) / 1.4 * 0.86602540378
    soit x = tx
    soit y = ty
    soit meilleur = 1.0e9
    soit choix = abs_ifs(cx * 91.133 + cy * 17.771)
    soit iter_lim = max_iter
    si iter_lim > 96.0:
        iter_lim = 96.0
    soit iter = 0.0
    tantque iter < iter_lim:
        choix = (choix * 2.618033989 + 0.707106781) % 1.0
        soit pt = sierpinski_etape(x, y, choix)
        x = pt[0]
        y = pt[1]
        soit d = (x - tx) * (x - tx) + (y - ty) * (y - ty)
        si d < meilleur:
            meilleur = d
        iter = iter + 1.0

    soit score = max_iter - racine_approx(meilleur) * 320.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score
