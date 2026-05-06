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
            retour iter
        # Evite l'indexation de tuple (non supportee par le backend WASM actuel).
        soit rx = 1.0
        soit ry = 0.0
        soit k = 0.0
        tantque k < puissance:
            soit tx = rx * x - ry * y
            soit ty = rx * y + ry * x
            rx = tx
            ry = ty
            k = k + 1.0
        x = rx + cx
        y = ry + cy
        iter = iter + 1.0
    retour iter

déf burning_julia(zx, zy, c_re, c_im, max_iter):
    # Julia version du Burning Ship : |Re(z)| et |Im(z)| à chaque itération
    soit rayon_echappement_carre = 4.0
    soit x = zx
    soit y = zy
    soit iter = 0.0
    tantque iter < max_iter:
        si norme_carre(x, y) > rayon_echappement_carre:
            retour iter
        soit ax = abs_escape(x)
        soit ay = abs_escape(y)
        soit xtemp = ax * ax - ay * ay + c_re
        y = 2.0 * ax * ay + c_im
        x = xtemp
        iter = iter + 1.0
    retour iter

déf biomorphe(cx, cy, max_iter):
    # Biomorphe de Pickover : fuite si |Re(z)| > 100 OU |Im(z)| > 100
    # Crée des formes organiques rappelant des micro-organismes
    soit limite = 100.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        si abs_escape(x) > limite ou abs_escape(y) > limite:
            retour iter
        iter = iter + 1.0
    retour max_iter

déf buddhabrot(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    soit accumulation = 0.0
    soit meilleur = 1.0e9

    tantque iter < max_iter:
        soit xtemp = x * x - y * y + cx
        soit ytemp = 2.0 * x * y + cy
        x = xtemp
        y = ytemp
        soit rayon = x * x + y * y
        si rayon > 16.0:
            retour accumulation
        soit d = (x - 0.25) * (x - 0.25) + y * y
        si d < meilleur:
            meilleur = d
        accumulation = accumulation + 1.0 / (1.0 + meilleur * 40.0)
        iter = iter + 1.0

    si accumulation > max_iter:
        retour max_iter
    retour accumulation
