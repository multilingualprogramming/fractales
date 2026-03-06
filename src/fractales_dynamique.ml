déf abs_dynamique(v):
    si v < 0.0:
        retour -v
    retour v

déf complexe_diviser_dynamique_re(a_re, a_im, b_re, b_im):
    soit denom = b_re * b_re + b_im * b_im
    si denom == 0.0:
        retour 0.0
    retour (a_re * b_re + a_im * b_im) / denom

déf complexe_diviser_dynamique_im(a_re, a_im, b_re, b_im):
    soit denom = b_re * b_re + b_im * b_im
    si denom == 0.0:
        retour 0.0
    retour (a_im * b_re - a_re * b_im) / denom

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

déf lyapunov(a, b, max_iter):
    soit x = 0.5
    soit somme = 0.0
    soit epsilon = 0.000001
    soit iter_lim = max_iter
    si iter_lim > 180.0:
        iter_lim = 180.0
    soit burn_in = 24.0
    soit total = iter_lim + burn_in
    soit n = 0.0

    tantque n < total:
        soit parametre = a
        si (n % 2.0) == 1.0:
            parametre = b
        x = parametre * x * (1.0 - x)
        si x < epsilon:
            x = epsilon
        sinonsi x > 1.0 - epsilon:
            x = 1.0 - epsilon
        si n >= burn_in:
            soit derivee = abs_dynamique(parametre * (1.0 - 2.0 * x))
            si derivee < epsilon:
                derivee = epsilon
            somme = somme + derivee
        n = n + 1.0

    soit moyenne = somme / iter_lim
    si moyenne < 1.0:
        soit score_stable = max_iter - abs_dynamique(moyenne - 1.0) * 48.0
        si score_stable < max_iter * 0.55:
            retour max_iter * 0.55
        retour score_stable

    soit score_instable = max_iter / (1.0 + (moyenne - 1.0) * 10.0)
    si score_instable < 0.0:
        retour 0.0
    retour score_instable

déf bassin_newton_generalise(zx, zy, max_iter):
    soit eps_convergence = 0.000001
    soit x = zx
    soit y = zy
    soit iter = 0.0

    tantque iter < max_iter:
        soit x2 = x * x
        soit y2 = y * y
        soit z4_re = x2 * x2 - 6.0 * x2 * y2 + y2 * y2
        soit z4_im = 4.0 * x * y * (x2 - y2)
        soit z3_re = x * x2 - 3.0 * x * y2
        soit z3_im = 3.0 * x2 * y - y * y2
        soit df_re = 4.0 * z3_re
        soit df_im = 4.0 * z3_im
        soit delta_re = complexe_diviser_dynamique_re(z4_re - 1.0, z4_im, df_re, df_im)
        soit delta_im = complexe_diviser_dynamique_im(z4_re - 1.0, z4_im, df_re, df_im)
        x = x - delta_re
        y = y - delta_im

        soit d1 = (x - 1.0) * (x - 1.0) + y * y
        soit d2 = (x + 1.0) * (x + 1.0) + y * y
        soit d3 = x * x + (y - 1.0) * (y - 1.0)
        soit d4 = x * x + (y + 1.0) * (y + 1.0)
        si d1 < eps_convergence:
            retour iter
        sinonsi d2 < eps_convergence:
            retour iter
        sinonsi d3 < eps_convergence:
            retour iter
        sinonsi d4 < eps_convergence:
            retour iter

        soit mouvement = delta_re * delta_re + delta_im * delta_im
        si mouvement < eps_convergence:
            retour iter

        iter = iter + 1.0

    retour iter

déf collatz_complexe(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0

    tantque iter < max_iter:
        si x * x + y * y > 64.0:
            retour iter
        soit xtemp = 0.0
        soit ytemp = 0.0
        si x < 0.0:
            xtemp = 0.5 * x + cx
            ytemp = 0.5 * y + cy
        sinon:
            xtemp = 1.5 * x + 0.5 + cx
            ytemp = 1.5 * y + cy
        x = xtemp
        y = ytemp
        iter = iter + 1.0

    retour iter
