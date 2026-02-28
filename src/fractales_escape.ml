importer math

constante RAYON_ECHAPPEMENT_CARRE = 4.0

déf norme_carre(x, y):
    retour x * x + y * y

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
