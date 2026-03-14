déf abs_koch(v):
    si v < 0.0:
        retour -v
    retour v

déf min_koch(a, b):
    si a < b:
        retour a
    retour b

déf koch_generer(iterations):
    soit etat = "F"
    soit i = 0
    tantque i < iterations:
        soit suivant = ""
        pour c dans etat:
            si c == "F":
                suivant = suivant + "F+F--F+F"
            sinon:
                suivant = suivant + c
        etat = suivant
        i = i + 1
    retour etat

déf koch(cx, cy, max_iter):
    soit koch_seuil = 0.02
    soit x = cx + 0.5
    soit y = cy + 0.35
    soit echelle = 1.0
    soit dist = abs_koch(y)
    soit niveau = 0.0
    soit nmax = min_koch(max_iter, 8.0)
    tantque niveau < nmax:
        x = x * 3.0
        y = y * 3.0
        soit cellule = x - (x % 1.0)
        x = x - cellule
        si cellule == 1.0:
            y = abs_koch(y - 1.0)
        soit d = abs_koch(y - 0.5) / echelle
        si d < dist:
            dist = d
        echelle = echelle * 3.0
        niveau = niveau + 1.0

    si dist < koch_seuil:
        retour max_iter * 0.9
    soit score = max_iter * 0.9 - (dist / (koch_seuil * 8.0)) * (max_iter * 0.9)
    si score < 8.0:
        retour 8.0
    retour score

déf dragon_heighway(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit dist = abs_koch(x) + abs_koch(y + 0.1)
    soit niveau = 0.0
    soit echelle = 1.0
    soit nmax = min_koch(max_iter, 14.0)

    tantque niveau < nmax:
        soit nx = x + y
        soit ny = y - x
        x = nx
        y = ny
        si x < 0.0:
            x = -x
        y = y - 0.5
        soit d = (abs_koch(x - 0.35) + abs_koch(y)) / echelle
        si d < dist:
            dist = d
        echelle = echelle * 1.41421356237
        niveau = niveau + 1.0

    soit seuil = 0.03
    si dist < seuil:
        retour max_iter * 0.9
    soit score = max_iter * 0.9 - (dist / (seuil * 10.0)) * (max_iter * 0.9)
    si score < 6.0:
        retour 6.0
    retour score

déf gosper_curve(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit dist = abs_koch(x) + abs_koch(y)
    soit niveau = 0.0
    soit echelle = 1.0
    soit nmax = min_koch(max_iter, 9.0)
    soit racine7 = 2.64575131106
    soit cos60 = 0.5
    soit sin60 = 0.86602540378

    tantque niveau < nmax:
        soit u = x * cos60 + y * sin60
        soit v = -x * sin60 + y * cos60
        soit d_hex = abs_koch(abs_koch(v) - 0.19 / echelle) + abs_koch(u) * 0.45
        soit d_diag = abs_koch(abs_koch(u - 0.22 / echelle) - 0.11 / echelle) + abs_koch(v) * 0.35
        si d_hex < dist:
            dist = d_hex
        si d_diag < dist:
            dist = d_diag

        soit branche = niveau % 3.0
        soit nx = x * racine7
        soit ny = y * racine7
        si branche == 0.0:
            x = nx - 0.62
            y = ny - 0.16
        sinonsi branche == 1.0:
            x = nx * cos60 - ny * sin60 + 0.18
            y = nx * sin60 + ny * cos60 - 0.48
        sinon:
            x = nx * cos60 + ny * sin60 - 0.18
            y = -nx * sin60 + ny * cos60 + 0.48
        echelle = echelle * racine7
        niveau = niveau + 1.0

    soit seuil = 0.028
    si dist < seuil:
        retour max_iter * 0.91
    soit score = max_iter * 0.9 - (dist / (seuil * 11.0)) * (max_iter * 0.9)
    si score < 6.0:
        retour 6.0
    retour score

déf cantor_set(cx, cy, max_iter):
    soit x = (cx + 1.0) * 0.5
    soit y = cy
    soit dist = abs_koch(y)
    soit niveau = 0.0
    soit iter_lim = min_koch(max_iter, 12.0)

    si x < 0.0 ou x > 1.0:
        retour 0.0

    tantque niveau < iter_lim:
        soit triple = x * 3.0
        soit chiffre = triple - (triple % 1.0)
        si chiffre == 1.0:
            retour niveau
        x = triple - chiffre
        soit d = abs_koch(y) + 1.0 / (3.0 * (niveau + 1.0))
        si d < dist:
            dist = d
        niveau = niveau + 1.0

    soit seuil = 0.06
    si dist < seuil:
        retour max_iter * 0.9
    soit score = max_iter * 0.9 - (dist / (seuil * 10.0)) * (max_iter * 0.9)
    si score < 6.0:
        retour 6.0
    retour score

déf arbre_pythagore(cx, cy, max_iter):
    soit x = cx
    soit y = cy + 1.0
    soit dist = abs_koch(x) + abs_koch(y)
    soit niveau = 0.0
    soit echelle = 1.0
    soit nmax = min_koch(max_iter, 11.0)

    tantque niveau < nmax:
        soit d_tronc_x = abs_koch(x) - 0.18
        soit d_tronc_y = abs_koch(y + 0.75) - 0.25
        soit d_tronc = abs_koch(d_tronc_x) + abs_koch(d_tronc_y)
        si d_tronc < dist:
            dist = d_tronc

        y = y - 0.55
        soit ancien_x = x
        soit ancien_y = y
        si x < 0.0:
            x = (ancien_x + ancien_y) * 0.70710678118
            y = (ancien_y - ancien_x) * 0.70710678118
            x = x + 0.32
        sinon:
            x = (ancien_x - ancien_y) * 0.70710678118
            y = (ancien_x + ancien_y) * 0.70710678118
            x = x - 0.32
        echelle = echelle * 1.41421356237
        niveau = niveau + 1.0

    soit seuil = 0.035
    si dist < seuil:
        retour max_iter * 0.9
    soit score = max_iter * 0.9 - (dist / (seuil * 9.0)) * (max_iter * 0.9)
    si score < 6.0:
        retour 6.0
    retour score

déf triangle_de_cercles_recursifs(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit dist = 1.0e9
    soit niveau = 0.0
    soit iter_lim = min_koch(max_iter, 10.0)

    tantque niveau < iter_lim:
        soit d0 = abs_koch((x * x + y * y) - 0.81)
        soit d1 = abs_koch(((x - 0.5) * (x - 0.5) + y * y) - 0.09)
        soit d2 = abs_koch(((x + 0.5) * (x + 0.5) + y * y) - 0.09)
        soit d3 = abs_koch((x * x + (y - 0.57) * (y - 0.57)) - 0.09)
        si d0 < dist:
            dist = d0
        si d1 < dist:
            dist = d1
        si d2 < dist:
            dist = d2
        si d3 < dist:
            dist = d3
        x = x * 1.9
        y = y * 1.9
        si x > 1.0:
            x = x - 1.2
        sinonsi x < -1.0:
            x = x + 1.2
        si y > 1.0:
            y = y - 1.2
        niveau = niveau + 1.0

    soit seuil = 0.025
    si dist < seuil:
        retour max_iter * 0.92
    soit score = max_iter * 0.9 - (dist / (seuil * 12.0)) * (max_iter * 0.9)
    si score < 6.0:
        retour 6.0
    retour score

déf distance_cercle_apollonien(px, py, cx, cy, courbure):
    soit rayon = 1.0 / abs_koch(courbure)
    soit dx = px - cx
    soit dy = py - cy
    retour abs_koch(dx * dx + dy * dy - rayon * rayon)

déf reflet_apollonien_k(ka, kb, kc, kd, indice):
    si indice == 0.0:
        retour 2.0 * (kb + kc + kd) - ka
    sinonsi indice == 1.0:
        retour 2.0 * (ka + kc + kd) - kb
    sinonsi indice == 2.0:
        retour 2.0 * (ka + kb + kd) - kc
    retour 2.0 * (ka + kb + kc) - kd

déf reflet_apollonien_x(ka, xa, kb, xb, kc, xc, kd, xd, indice):
    soit kn = reflet_apollonien_k(ka, kb, kc, kd, indice)
    si indice == 0.0:
        soit wx = 2.0 * (kb * xb + kc * xc + kd * xd) - ka * xa
        retour wx / kn
    sinonsi indice == 1.0:
        soit wx = 2.0 * (ka * xa + kc * xc + kd * xd) - kb * xb
        retour wx / kn
    sinonsi indice == 2.0:
        soit wx = 2.0 * (ka * xa + kb * xb + kd * xd) - kc * xc
        retour wx / kn
    soit wx = 2.0 * (ka * xa + kb * xb + kc * xc) - kd * xd
    retour wx / kn

déf reflet_apollonien_y(ka, ya, kb, yb, kc, yc, kd, yd, indice):
    soit kn = reflet_apollonien_k(ka, kb, kc, kd, indice)
    si indice == 0.0:
        soit wy = 2.0 * (kb * yb + kc * yc + kd * yd) - ka * ya
        retour wy / kn
    sinonsi indice == 1.0:
        soit wy = 2.0 * (ka * ya + kc * yc + kd * yd) - kb * yb
        retour wy / kn
    sinonsi indice == 2.0:
        soit wy = 2.0 * (ka * ya + kb * yb + kd * yd) - kc * yc
        retour wy / kn
    soit wy = 2.0 * (ka * ya + kb * yb + kc * yc) - kd * yd
    retour wy / kn

déf distance_apollonien_recursif(px, py, ka, xa, ya, kb, xb, yb, kc, xc, yc, kd, xd, yd, profondeur, precedent):
    soit dist = distance_cercle_apollonien(px, py, xa, ya, ka)
    soit d1 = distance_cercle_apollonien(px, py, xb, yb, kb)
    si d1 < dist:
        dist = d1
    soit d2 = distance_cercle_apollonien(px, py, xc, yc, kc)
    si d2 < dist:
        dist = d2
    soit d3 = distance_cercle_apollonien(px, py, xd, yd, kd)
    si d3 < dist:
        dist = d3

    si profondeur <= 0.0:
        retour dist

    soit meilleur = dist

    si precedent != 0.0:
        soit k0 = reflet_apollonien_k(ka, kb, kc, kd, 0.0)
        soit x0 = reflet_apollonien_x(ka, xa, kb, xb, kc, xc, kd, xd, 0.0)
        soit y0 = reflet_apollonien_y(ka, ya, kb, yb, kc, yc, kd, yd, 0.0)
        soit d0 = distance_apollonien_recursif(px, py, k0, x0, y0, kb, xb, yb, kc, xc, yc, kd, xd, yd, profondeur - 1.0, 0.0)
        si d0 < meilleur:
            meilleur = d0
    si precedent != 1.0:
        soit k1 = reflet_apollonien_k(ka, kb, kc, kd, 1.0)
        soit x1 = reflet_apollonien_x(ka, xa, kb, xb, kc, xc, kd, xd, 1.0)
        soit y1 = reflet_apollonien_y(ka, ya, kb, yb, kc, yc, kd, yd, 1.0)
        soit d1r = distance_apollonien_recursif(px, py, ka, xa, ya, k1, x1, y1, kc, xc, yc, kd, xd, yd, profondeur - 1.0, 1.0)
        si d1r < meilleur:
            meilleur = d1r
    si precedent != 2.0:
        soit k2 = reflet_apollonien_k(ka, kb, kc, kd, 2.0)
        soit x2 = reflet_apollonien_x(ka, xa, kb, xb, kc, xc, kd, xd, 2.0)
        soit y2 = reflet_apollonien_y(ka, ya, kb, yb, kc, yc, kd, yd, 2.0)
        soit d2r = distance_apollonien_recursif(px, py, ka, xa, ya, kb, xb, yb, k2, x2, y2, kd, xd, yd, profondeur - 1.0, 2.0)
        si d2r < meilleur:
            meilleur = d2r
    si precedent != 3.0:
        soit k3 = reflet_apollonien_k(ka, kb, kc, kd, 3.0)
        soit x3 = reflet_apollonien_x(ka, xa, kb, xb, kc, xc, kd, xd, 3.0)
        soit y3 = reflet_apollonien_y(ka, ya, kb, yb, kc, yc, kd, yd, 3.0)
        soit d3r = distance_apollonien_recursif(px, py, ka, xa, ya, kb, xb, yb, kc, xc, yc, k3, x3, y3, profondeur - 1.0, 3.0)
        si d3r < meilleur:
            meilleur = d3r

    retour meilleur

déf apollonian_gasket(cx, cy, max_iter):
    si cx * cx + cy * cy > 1.08:
        retour 0.0

    soit k0 = -1.0
    soit k1 = 2.1547005383792515
    soit k2 = 2.1547005383792515
    soit k3 = 2.1547005383792515
    soit x0 = 0.0
    soit y0 = 0.0
    soit x1 = 0.0
    soit y1 = 0.5358983848622454
    soit x2 = -0.46410161513775466
    soit y2 = -0.26794919243112253
    soit x3 = 0.46410161513775444
    soit y3 = -0.2679491924311229
    soit profondeur = min_koch(5.0, 2.0 + max_iter / 96.0)
    soit dist = distance_apollonien_recursif(cx, cy, k0, x0, y0, k1, x1, y1, k2, x2, y2, k3, x3, y3, profondeur, -1.0)
    soit seuil = 0.0015
    si dist < seuil:
        retour max_iter * 0.95
    soit score = max_iter * 0.94 - (dist / (seuil * 18.0)) * (max_iter * 0.9)
    si score < 6.0:
        retour 6.0
    retour score

déf t_square_fractal(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit dist = abs_koch(x) + abs_koch(y)
    soit niveau = 0.0
    soit echelle = 1.0
    soit iter_lim = min_koch(max_iter, 9.0)

    tantque niveau < iter_lim:
        soit d_carre = max(abs_koch(x), abs_koch(y)) / echelle
        si d_carre < dist:
            dist = d_carre
        x = x * 2.0
        y = y * 2.0
        si x > 0.5:
            x = x - 1.0
        sinonsi x < -0.5:
            x = x + 1.0
        si y > 0.5:
            y = y - 1.0
        sinonsi y < -0.5:
            y = y + 1.0
        echelle = echelle * 2.0
        niveau = niveau + 1.0

    soit seuil = 0.035
    si dist < seuil:
        retour max_iter * 0.9
    retour max_iter * 0.9 - min_koch(dist / (seuil * 8.0), 0.9) * (max_iter * 0.8)

déf h_fractal(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit dist = abs_koch(x) + abs_koch(y)
    soit niveau = 0.0
    soit echelle = 1.0
    soit iter_lim = min_koch(max_iter, 10.0)

    tantque niveau < iter_lim:
        soit barre_h = abs_koch(abs_koch(y) - 0.25 / echelle)
        soit montant_g = abs_koch(abs_koch(x) - 0.25 / echelle)
        soit d = barre_h + montant_g
        si d < dist:
            dist = d
        x = x * 2.0
        y = y * 2.0
        si x > 0.5:
            x = x - 1.0
        sinonsi x < -0.5:
            x = x + 1.0
        si y > 0.5:
            y = y - 1.0
        sinonsi y < -0.5:
            y = y + 1.0
        echelle = echelle * 2.0
        niveau = niveau + 1.0

    soit seuil = 0.03
    si dist < seuil:
        retour max_iter * 0.91
    retour max_iter * 0.9 - min_koch(dist / (seuil * 8.0), 0.9) * (max_iter * 0.8)

déf hilbert_curve(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit dist = abs_koch(x) + abs_koch(y)
    soit niveau = 0.0
    soit iter_lim = min_koch(max_iter, 8.0)

    tantque niveau < iter_lim:
        x = (x + 1.0) * 0.5
        y = (y + 1.0) * 0.5
        soit d = abs_koch((x % 0.5) - 0.25) + abs_koch((y % 0.5) - 0.25)
        si d < dist:
            dist = d
        soit ancien_x = x
        x = y
        y = 1.0 - ancien_x
        niveau = niveau + 1.0

    soit seuil = 0.08
    si dist < seuil:
        retour max_iter * 0.9
    retour max_iter * 0.9 - min_koch(dist / (seuil * 6.0), 0.9) * (max_iter * 0.8)

déf peano_curve(cx, cy, max_iter):
    soit x = cx
    soit y = cy
    soit dist = abs_koch(x) + abs_koch(y)
    soit niveau = 0.0
    soit iter_lim = min_koch(max_iter, 7.0)

    tantque niveau < iter_lim:
        x = (x + 1.0) * 0.5
        y = (y + 1.0) * 0.5
        soit local_x = x * 3.0
        soit local_y = y * 3.0
        local_x = local_x - (local_x % 1.0)
        local_y = local_y - (local_y % 1.0)
        soit d = abs_koch(x - 0.5) + abs_koch(y - 0.5)
        si d < dist:
            dist = d
        x = x * 3.0 - local_x
        y = y * 3.0 - local_y
        niveau = niveau + 1.0

    soit seuil = 0.08
    si dist < seuil:
        retour max_iter * 0.9
    retour max_iter * 0.9 - min_koch(dist / (seuil * 6.0), 0.9) * (max_iter * 0.8)
