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
    si iter_lim > 240.0:
        iter_lim = 240.0
    soit iter = 0.0
    tantque iter < iter_lim:
        choix = (choix * 3.987654321 + 0.123456789) % 1.0
        soit pt = barnsley_etape(x, y, choix)
        x = pt[0]
        y = pt[1]
        si iter > 24.0:
            soit d = (x - cx) * (x - cx) + (y - cy) * (y - cy)
            si d < meilleur:
                meilleur = d
        iter = iter + 1.0

    soit score = max_iter - racine_approx(meilleur) * 38.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf sierpinski(cx, cy, max_iter):
    soit x = 0.37
    soit y = 0.21
    soit meilleur = 1.0e9
    soit choix = abs_ifs(cx * 91.133 + cy * 17.771)
    soit iter_lim = max_iter
    si iter_lim > 180.0:
        iter_lim = 180.0
    soit iter = 0.0
    tantque iter < iter_lim:
        choix = (choix * 2.618033989 + 0.707106781) % 1.0
        soit pt = sierpinski_etape(x, y, choix)
        x = pt[0]
        y = pt[1]
        si iter > 12.0:
            soit d = (x - cx) * (x - cx) + (y - cy) * (y - cy)
            si d < meilleur:
                meilleur = d
        iter = iter + 1.0

    soit score = max_iter - racine_approx(meilleur) * 210.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score

déf tapis_sierpinski(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit niveau = 0.0
    soit iter_lim = max_iter
    si iter_lim > 9.0:
        iter_lim = 9.0

    tantque niveau < iter_lim:
        x = (x + 1.0) / 2.0
        y = (y + 1.0) / 2.0
        soit local_x = x * 3.0
        soit local_y = y * 3.0
        local_x = local_x - (local_x % 1.0)
        local_y = local_y - (local_y % 1.0)
        si local_x == 1.0 et local_y == 1.0:
            retour niveau
        x = x * 3.0 - local_x
        y = y * 3.0 - local_y
        niveau = niveau + 1.0

    retour max_iter * 0.9

déf projeter_menger_x(x, y, z):
    retour (x - z) * 0.86

déf projeter_menger_y(x, y, z):
    retour y + (x + z) * 0.28

déf menger_etape(x, y, z, choix):
    soit index = choix * 20.0
    index = index - (index % 1.0)
    soit dx = -1.0
    soit dy = -1.0
    soit dz = -1.0

    si index == 0.0:
        dx = -1.0
        dy = -1.0
        dz = -1.0
    sinonsi index == 1.0:
        dx = -1.0
        dy = -1.0
        dz = 0.0
    sinonsi index == 2.0:
        dx = -1.0
        dy = -1.0
        dz = 1.0
    sinonsi index == 3.0:
        dx = -1.0
        dy = 0.0
        dz = -1.0
    sinonsi index == 4.0:
        dx = -1.0
        dy = 0.0
        dz = 1.0
    sinonsi index == 5.0:
        dx = -1.0
        dy = 1.0
        dz = -1.0
    sinonsi index == 6.0:
        dx = -1.0
        dy = 1.0
        dz = 0.0
    sinonsi index == 7.0:
        dx = -1.0
        dy = 1.0
        dz = 1.0
    sinonsi index == 8.0:
        dx = 0.0
        dy = -1.0
        dz = -1.0
    sinonsi index == 9.0:
        dx = 0.0
        dy = -1.0
        dz = 1.0
    sinonsi index == 10.0:
        dx = 0.0
        dy = 1.0
        dz = -1.0
    sinonsi index == 11.0:
        dx = 0.0
        dy = 1.0
        dz = 1.0
    sinonsi index == 12.0:
        dx = 1.0
        dy = -1.0
        dz = -1.0
    sinonsi index == 13.0:
        dx = 1.0
        dy = -1.0
        dz = 0.0
    sinonsi index == 14.0:
        dx = 1.0
        dy = -1.0
        dz = 1.0
    sinonsi index == 15.0:
        dx = 1.0
        dy = 0.0
        dz = -1.0
    sinonsi index == 16.0:
        dx = 1.0
        dy = 0.0
        dz = 1.0
    sinonsi index == 17.0:
        dx = 1.0
        dy = 1.0
        dz = -1.0
    sinonsi index == 18.0:
        dx = 1.0
        dy = 1.0
        dz = 0.0
    sinon:
        dx = 1.0
        dy = 1.0
        dz = 1.0

    retour (x / 3.0 + dx / 3.0, y / 3.0 + dy / 3.0, z / 3.0 + dz / 3.0)

déf menger_sponge(cx, cy, max_iter):
    soit x = 0.11
    soit y = -0.17
    soit z = 0.23
    soit meilleur = 1.0e9
    soit choix = abs_ifs(cx * 53.17 + cy * 71.09)
    soit iter_lim = max_iter
    si iter_lim > 220.0:
        iter_lim = 220.0
    soit iter = 0.0

    tantque iter < iter_lim:
        choix = (choix * 3.618033989 + 0.414213562) % 1.0
        soit pt = menger_etape(x, y, z, choix)
        x = pt[0]
        y = pt[1]
        z = pt[2]
        si iter > 20.0:
            soit px = projeter_menger_x(x, y, z)
            soit py = projeter_menger_y(x, y, z)
            soit d = (px - cx) * (px - cx) + (py - cy) * (py - cy)
            si d < meilleur:
                meilleur = d
        iter = iter + 1.0

    soit score = max_iter - racine_approx(meilleur) * 140.0
    si score < 0.0:
        retour 0.0
    si score > max_iter:
        retour max_iter
    retour score
