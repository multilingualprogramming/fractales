importer math

constante EPS_CONVERGENCE = 0.000001
constante RACINE3_SUR_2 = 0.8660254037844386

déf norme_carre(x, y):
    retour x * x + y * y

déf newton(zx, zy, max_iter):
    # Basins de Newton pour f(z)=z^3-1
    soit x = zx
    soit y = zy
    soit iter = 0.0
    tantque iter < max_iter:
        soit x2 = x * x
        soit y2 = y * y

        # f(z) = (x^3 - 3xy^2 - 1) + i(3x^2y - y^3)
        soit fx = x * x2 - 3.0 * x * y2 - 1.0
        soit fy = 3.0 * x2 * y - y * y2

        # f'(z) = 3z^2 = 3(x^2 - y^2) + i(6xy)
        soit dfx = 3.0 * (x2 - y2)
        soit dfy = 6.0 * x * y
        soit denom = dfx * dfx + dfy * dfy
        si denom < EPS_CONVERGENCE:
            retour iter

        # delta = f / f'
        soit delta_x = (fx * dfx + fy * dfy) / denom
        soit delta_y = (fy * dfx - fx * dfy) / denom
        x = x - delta_x
        y = y - delta_y

        # Convergence vers une des 3 racines de l'unite
        soit d1 = norme_carre(x - 1.0, y - 0.0)
        soit d2 = norme_carre(x + 0.5, y - RACINE3_SUR_2)
        soit d3 = norme_carre(x + 0.5, y + RACINE3_SUR_2)
        si d1 < EPS_CONVERGENCE:
            retour iter
        sinonsi d2 < EPS_CONVERGENCE:
            retour iter
        sinonsi d3 < EPS_CONVERGENCE:
            retour iter

        iter = iter + 1.0
    retour iter

déf phoenix(cx, cy, max_iter):
    # z(n+1) = z(n)^2 + c + p*z(n-1), avec p fixe
    soit p = -0.5
    soit x = 0.0
    soit y = 0.0
    soit x_prec = 0.0
    soit y_prec = 0.0
    soit iter = 0.0

    tantque iter < max_iter:
        si norme_carre(x, y) > 4.0:
            retour iter

        soit xtemp = x * x - y * y + cx + p * x_prec
        soit ytemp = 2.0 * x * y + cy + p * y_prec
        x_prec = x
        y_prec = y
        x = xtemp
        y = ytemp
        iter = iter + 1.0

    retour iter
