déf abs_dynamique(v):
    si v < 0.0:
        retour -v
    retour v

déf normaliser_angle_dynamique(x):
    soit angle = x
    soit deux_pi = 6.283185307179586
    tantque angle > 3.141592653589793:
        angle = angle - deux_pi
    tantque angle < -3.141592653589793:
        angle = angle + deux_pi
    retour angle

déf sinus_dynamique(x):
    soit angle = normaliser_angle_dynamique(x)
    soit angle2 = angle * angle
    soit angle3 = angle2 * angle
    soit angle5 = angle3 * angle2
    soit angle7 = angle5 * angle2
    retour angle - angle3 / 6.0 + angle5 / 120.0 - angle7 / 5040.0

déf cosinus_dynamique(x):
    soit angle = normaliser_angle_dynamique(x)
    soit angle2 = angle * angle
    soit angle4 = angle2 * angle2
    soit angle6 = angle4 * angle2
    retour 1.0 - angle2 / 2.0 + angle4 / 24.0 - angle6 / 720.0

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
            retour iter + 0.12
        sinonsi d2 < eps_convergence:
            retour iter + 0.42
        sinonsi d3 < eps_convergence:
            retour iter + 0.72

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

déf lyapunov_multisequence(a, b, max_iter):
    soit x = 0.5
    soit somme = 0.0
    soit epsilon = 0.000001
    soit iter_lim = max_iter
    si iter_lim > 210.0:
        iter_lim = 210.0
    soit burn_in = 30.0
    soit total = iter_lim + burn_in
    soit n = 0.0

    tantque n < total:
        soit parametre = a
        soit phase = n % 3.0
        si phase == 1.0:
            parametre = b
        sinonsi phase == 2.0:
            parametre = 0.5 * (a + b)
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
        soit score_stable = max_iter - abs_dynamique(moyenne - 1.0) * 56.0
        si score_stable < max_iter * 0.5:
            retour max_iter * 0.5
        retour score_stable

    soit score_instable = max_iter / (1.0 + (moyenne - 1.0) * 12.0)
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
            retour iter + 0.12
        sinonsi d2 < eps_convergence:
            retour iter + 0.32
        sinonsi d3 < eps_convergence:
            retour iter + 0.62
        sinonsi d4 < eps_convergence:
            retour iter + 0.82

        soit mouvement = delta_re * delta_re + delta_im * delta_im
        si mouvement < eps_convergence:
            retour iter

        iter = iter + 1.0

    retour iter

déf orbitale_de_nova(zx, zy, max_iter):
    soit eps_convergence = 0.000001
    soit alpha = 0.5
    soit x = zx
    soit y = zy
    soit iter = 0.0

    tantque iter < max_iter:
        soit x2 = x * x
        soit y2 = y * y
        soit z3_re = x * x2 - 3.0 * x * y2
        soit z3_im = 3.0 * x2 * y - y * y2
        soit z2_re = x2 - y2
        soit z2_im = 2.0 * x * y
        soit f_re = z3_re - 1.0
        soit f_im = z3_im
        soit df_re = 3.0 * z2_re
        soit df_im = 3.0 * z2_im
        soit correction_re = complexe_diviser_dynamique_re(f_re, f_im, df_re, df_im)
        soit correction_im = complexe_diviser_dynamique_im(f_re, f_im, df_re, df_im)
        x = x - alpha * correction_re + zx * 0.08
        y = y - alpha * correction_im + zy * 0.08

        soit norme_correction = correction_re * correction_re + correction_im * correction_im
        soit d1 = (x - 1.0) * (x - 1.0) + y * y
        soit d2 = (x + 0.5) * (x + 0.5) + (y - 0.8660254037844386) * (y - 0.8660254037844386)
        soit d3 = (x + 0.5) * (x + 0.5) + (y + 0.8660254037844386) * (y + 0.8660254037844386)
        si d1 < eps_convergence:
            retour iter + 0.12
        sinonsi d2 < eps_convergence:
            retour iter + 0.42
        sinonsi d3 < eps_convergence:
            retour iter + 0.72
        si norme_correction < eps_convergence:
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
        soit rayon = x * x + y * y
        si rayon < 1.0:
            xtemp = 0.5 * x - 0.5 * y + cx
            ytemp = 0.5 * x + 0.5 * y + cy
        sinon:
            xtemp = 1.5 * x - y + 0.25 + cx
            ytemp = x + 1.5 * y + cy
        x = xtemp
        y = ytemp
        iter = iter + 1.0

    retour iter

déf attracteur_de_clifford(cx, cy, max_iter):
    soit a = -1.4
    soit b = 1.7
    soit c = 1.0
    soit d = 0.7
    soit x = 0.1
    soit y = 0.1
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 320.0:
        iter_lim = 320.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit suivant_x = sinus_dynamique(a * y) + c * cosinus_dynamique(a * x)
        soit suivant_y = sinus_dynamique(b * x) + d * cosinus_dynamique(b * y)
        x = suivant_x
        y = suivant_y
        si iter > 18.0:
            soit dx = x - cx
            soit dy = y - cy
            soit distance = dx * dx + dy * dy
            si distance < meilleur:
                meilleur = distance
        iter = iter + 1.0

    soit score = max_iter - meilleur * 180.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf attracteur_de_peter_de_jong(cx, cy, max_iter):
    soit a = 1.4
    soit b = -2.3
    soit c = 2.4
    soit d = -2.1
    soit x = 0.1
    soit y = 0.1
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 320.0:
        iter_lim = 320.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit suivant_x = sinus_dynamique(a * y) - cosinus_dynamique(b * x)
        soit suivant_y = sinus_dynamique(c * x) - cosinus_dynamique(d * y)
        x = suivant_x
        y = suivant_y
        si iter > 18.0:
            soit dx = x - cx
            soit dy = y - cy
            soit distance = dx * dx + dy * dy
            si distance < meilleur:
                meilleur = distance
        iter = iter + 1.0

    soit score = max_iter - meilleur * 180.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf attracteur_ikeda(cx, cy, max_iter):
    soit u = 0.9
    soit x = 0.1
    soit y = 0.1
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 340.0:
        iter_lim = 340.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit rayon = x * x + y * y
        soit angle = 0.4 - 6.0 / (1.0 + rayon)
        soit cos_t = cosinus_dynamique(angle)
        soit sin_t = sinus_dynamique(angle)
        soit suivant_x = 1.0 + u * (x * cos_t - y * sin_t)
        soit suivant_y = u * (x * sin_t + y * cos_t)
        x = suivant_x
        y = suivant_y
        si iter > 22.0:
            soit dx = x - cx
            soit dy = y - cy
            soit distance = dx * dx + dy * dy
            si distance < meilleur:
                meilleur = distance
        iter = iter + 1.0

    soit score = max_iter - meilleur * 220.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf attracteur_de_henon(cx, cy, max_iter):
    soit a = 1.4
    soit b = 0.3
    soit x = 0.1
    soit y = 0.0
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 340.0:
        iter_lim = 340.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit suivant_x = 1.0 - a * x * x + y
        soit suivant_y = b * x
        x = suivant_x
        y = suivant_y
        si iter > 22.0:
            soit dx = x - cx
            soit dy = y - cy
            soit distance = dx * dx + dy * dy
            si distance < meilleur:
                meilleur = distance
        iter = iter + 1.0

    soit score = max_iter - meilleur * 260.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf projeter_lorenz_x(x, y, z):
    retour (x - y) * 0.12

déf projeter_lorenz_y(x, y, z):
    retour (z - 26.0) * 0.07 - (x + y) * 0.02

déf projeter_rossler_x(x, y, z):
    retour x * 0.16 + z * 0.035

déf projeter_rossler_y(x, y, z):
    retour y * 0.16 - z * 0.04

déf projeter_aizawa_x(x, y, z):
    retour x * 0.18 + z * 0.03

déf projeter_aizawa_y(x, y, z):
    retour y * 0.18 - z * 0.055

déf projeter_sprott_x(x, y, z):
    retour x * 0.19 + z * 0.045

déf projeter_sprott_y(x, y, z):
    retour y * 0.18 - z * 0.03

déf lorenz_attractor(cx, cy, max_iter):
    soit sigma = 10.0
    soit rho = 28.0
    soit beta = 2.6666666667
    soit dt = 0.01
    soit x = 0.1
    soit y = 0.0
    soit z = 0.0
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 520.0:
        iter_lim = 520.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit dx = sigma * (y - x)
        soit dy = x * (rho - z) - y
        soit dz = x * y - beta * z
        x = x + dx * dt
        y = y + dy * dt
        z = z + dz * dt
        si iter > 35.0:
            soit px = projeter_lorenz_x(x, y, z)
            soit py = projeter_lorenz_y(x, y, z)
            soit distance = (px - cx) * (px - cx) + (py - cy) * (py - cy)
            si distance < meilleur:
                meilleur = distance
        iter = iter + 1.0

    soit score = max_iter - meilleur * 420.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf rossler_attractor(cx, cy, max_iter):
    soit a = 0.2
    soit b = 0.2
    soit c = 5.7
    soit dt = 0.02
    soit x = 0.1
    soit y = 0.0
    soit z = 0.0
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 560.0:
        iter_lim = 560.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit dx = -y - z
        soit dy = x + a * y
        soit dz = b + z * (x - c)
        x = x + dx * dt
        y = y + dy * dt
        z = z + dz * dt
        si iter > 40.0:
            soit px = projeter_rossler_x(x, y, z)
            soit py = projeter_rossler_y(x, y, z)
            soit distance = (px - cx) * (px - cx) + (py - cy) * (py - cy)
            si distance < meilleur:
                meilleur = distance
        si x * x + y * y + z * z > 4096.0:
            x = 0.1
            y = 0.0
            z = 0.0
        iter = iter + 1.0

    soit score = max_iter - meilleur * 520.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf aizawa_attractor(cx, cy, max_iter):
    soit a = 0.95
    soit b = 0.7
    soit c = 0.6
    soit d = 3.5
    soit e = 0.25
    soit f = 0.1
    soit dt = 0.008
    soit x = 0.1
    soit y = 0.0
    soit z = 0.0
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 720.0:
        iter_lim = 720.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit r2 = x * x + y * y
        soit dx = (z - b) * x - d * y
        soit dy = d * x + (z - b) * y
        soit dz = c + a * z - (z * z * z) / 3.0 - r2 * (1.0 + e * z) + f * z * x * x * x
        x = x + dx * dt
        y = y + dy * dt
        z = z + dz * dt
        si iter > 70.0:
            soit px = projeter_aizawa_x(x, y, z)
            soit py = projeter_aizawa_y(x, y, z)
            soit distance = (px - cx) * (px - cx) + (py - cy) * (py - cy)
            si distance < meilleur:
                meilleur = distance
        si x * x + y * y + z * z > 4096.0:
            x = 0.1
            y = 0.0
            z = 0.0
        iter = iter + 1.0

    soit score = max_iter - meilleur * 540.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf sprott_attractor(cx, cy, max_iter):
    soit dt = 0.04
    soit x = 0.2
    soit y = 0.1
    soit z = 0.1
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 520.0:
        iter_lim = 520.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit dx = y * z
        soit dy = x - y
        soit dz = 1.0 - x * y
        x = x + dx * dt
        y = y + dy * dt
        z = z + dz * dt
        si iter > 32.0:
            soit px = projeter_sprott_x(x, y, z)
            soit py = projeter_sprott_y(x, y, z)
            soit distance = (px - cx) * (px - cx) + (py - cy) * (py - cy)
            si distance < meilleur:
                meilleur = distance
        si x * x + y * y + z * z > 4096.0:
            x = 0.2
            y = 0.1
            z = 0.1
        iter = iter + 1.0

    soit score = max_iter - meilleur * 520.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf feigenbaum_tree(cx, cy, max_iter):
    soit r = 3.4 + (cx + 1.0) * 0.3
    soit x = 0.5
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 260.0:
        iter_lim = 260.0
    soit iter = 0.0

    tantque iter < iter_lim:
        x = r * x * (1.0 - x)
        si iter > 60.0:
            soit py = x * 2.0 - 1.0
            soit d = (py - cy) * (py - cy)
            si d < meilleur:
                meilleur = d
        iter = iter + 1.0

    soit score = max_iter - meilleur * 420.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf duffing_attractor(cx, cy, max_iter):
    # Attracteur de Duffing (oscillateur forcé non linéaire)
    # Carte : x_{n+1} = y_n,  y_{n+1} = -b·x + a·y - y³
    # Paramètres classiques : a = 2.75, b = 0.20
    soit a = 2.75
    soit b = 0.2
    soit x = 0.1
    soit y = 0.1
    soit meilleur = 1.0e9
    soit iter_lim = max_iter
    si iter_lim > 480.0:
        iter_lim = 480.0
    soit iter = 0.0

    tantque iter < iter_lim:
        soit xtemp = y
        soit ytemp = -b * x + a * y - y * y * y
        x = xtemp
        y = ytemp
        si x * x + y * y > 400.0:
            x = 0.1
            y = 0.1
        si iter > 40.0:
            soit distance = (x - cx) * (x - cx) + (y - cy) * (y - cy)
            si distance < meilleur:
                meilleur = distance
        iter = iter + 1.0

    soit score = max_iter - meilleur * 380.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score
