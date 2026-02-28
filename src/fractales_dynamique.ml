déf newton(zx, zy, max_iter):
    soit eps_convergence = 0.000001
    soit racine3_sur_2 = 0.8660254037844386
    soit x = zx
    soit y = zy
    soit iter = 0.0
    tantque iter < max_iter:
        soit x2 = x * x
        soit y2 = y * y
        soit fx = x * x2 - 3.0 * x * y2 - 1.0
        soit fy = 3.0 * x2 * y - y * y2
        soit dfx = 3.0 * (x2 - y2)
        soit dfy = 6.0 * x * y
        soit denom = dfx * dfx + dfy * dfy
        si denom < eps_convergence:
            retour iter

        soit delta_x = (fx * dfx + fy * dfy) / denom
        soit delta_y = (fy * dfx - fx * dfy) / denom
        x = x - delta_x
        y = y - delta_y

        soit d1 = (x - 1.0) * (x - 1.0) + y * y
        soit d2 = (x + 0.5) * (x + 0.5) + (y - racine3_sur_2) * (y - racine3_sur_2)
        soit d3 = (x + 0.5) * (x + 0.5) + (y + racine3_sur_2) * (y + racine3_sur_2)
        si d1 < eps_convergence:
            retour iter
        sinonsi d2 < eps_convergence:
            retour iter
        sinonsi d3 < eps_convergence:
            retour iter

        iter = iter + 1.0
    retour iter

déf phoenix(cx, cy, max_iter):
    soit p = -0.5
    soit x = 0.0
    soit y = 0.0
    soit x_prec = 0.0
    soit y_prec = 0.0
    soit iter = 0.0

    tantque iter < max_iter:
        si x * x + y * y > 4.0:
            retour iter
        soit xtemp = x * x - y * y + cx + p * x_prec
        soit ytemp = 2.0 * x * y + cy + p * y_prec
        x_prec = x
        y_prec = y
        x = xtemp
        y = ytemp
        iter = iter + 1.0
    retour iter
