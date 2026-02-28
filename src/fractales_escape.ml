importer math

constante RAYON_ECHAPPEMENT_CARRE = 4.0

déf norme_carre(x, y):
    retour x * x + y * y

classe FractaleEvasion:
    déf __init__(soi, rayon_carre):
        soi.rayon_carre = rayon_carre

    déf est_echappe(soi, x, y):
        retour norme_carre(x, y) > soi.rayon_carre

classe MultibrotFractale(FractaleEvasion):
    déf __init__(soi, puissance):
        super().__init__(RAYON_ECHAPPEMENT_CARRE)
        soi.puissance = puissance

    déf iterer(soi, cx, cy, max_iter):
        soit x = 0.0
        soit y = 0.0
        soit iter = 0.0

        tantque iter < max_iter:
            si soi.est_echappe(x, y):
                retour iter

            # r^n * (cos(n*theta), sin(n*theta)) + c
            soit r2 = x * x + y * y
            soit r = math.sqrt(r2)
            soit theta = math.atan2(y, x)
            soit rn = r ** soi.puissance
            soit angle = soi.puissance * theta
            soit nx = rn * math.cos(angle) + cx
            soit ny = rn * math.sin(angle) + cy
            x = nx
            y = ny
            iter = iter + 1.0

        retour iter

déf mandelbrot(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > RAYON_ECHAPPEMENT_CARRE:
            retour iter
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf julia(zx, zy, c_re, c_im, max_iter):
    soit x = zx
    soit y = zy
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > RAYON_ECHAPPEMENT_CARRE:
            retour iter
        soit xtemp = x * x - y * y + c_re
        y = 2.0 * x * y + c_im
        x = xtemp
        iter = iter + 1.0
    retour iter

déf burning_ship(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > RAYON_ECHAPPEMENT_CARRE:
            retour iter
        soit ax = abs(x)
        soit ay = abs(y)
        soit xtemp = ax * ax - ay * ay + cx
        y = 2.0 * ax * ay + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf tricorn(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > RAYON_ECHAPPEMENT_CARRE:
            retour iter
        soit xtemp = x * x - y * y + cx
        y = -2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf multibrot(cx, cy, max_iter, puissance):
    soit fractale = MultibrotFractale(puissance)
    retour fractale.iterer(cx, cy, max_iter)
