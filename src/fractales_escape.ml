déf norme_carre(x, y):
    retour x * x + y * y

déf abs_escape(v):
    si v < 0.0:
        retour -v
    retour v

déf complexe_puissance_re_im(x, y, puissance):
    soit rx = 1.0
    soit ry = 0.0
    soit k = 0.0
    tantque k < puissance:
        soit tx = rx * x - ry * y
        soit ty = rx * y + ry * x
        rx = tx
        ry = ty
        k = k + 1.0
    retour (rx, ry)

déf mandelbrot(cx, cy, max_iter):
    soit rayon_echappement_carre = 4.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > rayon_echappement_carre:
            retour iter
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf julia(zx, zy, c_re, c_im, max_iter):
    soit rayon_echappement_carre = 4.0
    soit x = zx
    soit y = zy
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > rayon_echappement_carre:
            retour iter
        soit xtemp = x * x - y * y + c_re
        y = 2.0 * x * y + c_im
        x = xtemp
        iter = iter + 1.0
    retour iter

déf burning_ship(cx, cy, max_iter):
    soit rayon_echappement_carre = 4.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > rayon_echappement_carre:
            retour iter
        soit ax = abs_escape(x)
        soit ay = abs_escape(y)
        soit xtemp = ax * ax - ay * ay + cx
        y = 2.0 * ax * ay + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf tricorn(cx, cy, max_iter):
    soit rayon_echappement_carre = 4.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > rayon_echappement_carre:
            retour iter
        soit xtemp = x * x - y * y + cx
        y = -2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf multibrot(cx, cy, max_iter, puissance):
    soit rayon_echappement_carre = 4.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > rayon_echappement_carre:
            soit score = max_iter - iter * 0.85
            si score < 0.0:
                retour 0.0
            retour score
        soit p = complexe_puissance_re_im(x, y, puissance)
        soit nx = p[0] + cx
        soit ny = p[1] + cy
        x = nx
        y = ny
        iter = iter + 1.0
    retour max_iter
