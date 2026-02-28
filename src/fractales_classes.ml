# fractales_classes.ml
# Démonstration de la programmation orientée objet en multilingual (français)
# Fonctionnalités illustrées :
#   - classe          → définition de classe
#   - classe Sous(Base) → héritage
#   - soi             → référence à l'instance (= self/this)
#   - super().__init__ → appel du constructeur parent
#   - méthodes virtuelles / polymorphisme

# ============================================================
# Classe de base : Fractale
# ============================================================

classe Fractale:
    déf __init__(soi, max_iter):
        soi.max_iter = max_iter
        soi.rayon_echappement_carre = 4.0

    déf norme_carre(soi, x, y):
        retour x * x + y * y

    déf abs_val(soi, v):
        si v < 0.0:
            retour -v
        retour v

    # Méthode à surcharger dans les sous-classes
    déf iterer(soi, cx, cy):
        retour 0.0


# ============================================================
# Sous-classe : FractaleEvasion
# Fractales à temps d'évasion (escape-time)
# Illustre super().__init__ et l'extension d'une classe de base
# ============================================================

classe FractaleEvasion(Fractale):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)
        # Le rayon d'évasion peut être affiné dans les sous-classes
        soi.rayon_echappement_carre = 4.0

    déf iterer(soi, cx, cy):
        # Comportement par défaut : aucune itération
        retour soi.max_iter


# ============================================================
# MandelbrotFractale : hérite de FractaleEvasion
# ============================================================

classe MandelbrotFractale(FractaleEvasion):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)

    déf iterer(soi, cx, cy):
        soit x = 0.0
        soit y = 0.0
        soit iter = 0.0
        tantque iter < soi.max_iter:
            si soi.norme_carre(x, y) > soi.rayon_echappement_carre:
                retour iter
            soit xtemp = x * x - y * y + cx
            y = 2.0 * x * y + cy
            x = xtemp
            iter = iter + 1.0
        retour iter


# ============================================================
# JuliaFractale : hérite de FractaleEvasion
# Le paramètre c est stocké dans l'instance
# ============================================================

classe JuliaFractale(FractaleEvasion):
    déf __init__(soi, max_iter, c_re, c_im):
        super().__init__(max_iter)
        soi.c_re = c_re
        soi.c_im = c_im

    déf iterer(soi, zx, zy):
        soit x = zx
        soit y = zy
        soit iter = 0.0
        tantque iter < soi.max_iter:
            si soi.norme_carre(x, y) > soi.rayon_echappement_carre:
                retour iter
            soit xtemp = x * x - y * y + soi.c_re
            y = 2.0 * x * y + soi.c_im
            x = xtemp
            iter = iter + 1.0
        retour iter


# ============================================================
# BurningShipFractale : hérite de FractaleEvasion
# Utilise abs_val hérité de Fractale (via FractaleEvasion)
# ============================================================

classe BurningShipFractale(FractaleEvasion):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)

    déf iterer(soi, cx, cy):
        soit x = 0.0
        soit y = 0.0
        soit iter = 0.0
        tantque iter < soi.max_iter:
            si soi.norme_carre(x, y) > soi.rayon_echappement_carre:
                retour iter
            soit ax = soi.abs_val(x)
            soit ay = soi.abs_val(y)
            soit xtemp = ax * ax - ay * ay + cx
            y = 2.0 * ax * ay + cy
            x = xtemp
            iter = iter + 1.0
        retour iter


# ============================================================
# FractaleNewton : hérite directement de Fractale
# Méthode de Newton pour z^3 - 1 = 0
# ============================================================

classe FractaleNewton(Fractale):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)
        soi.eps_convergence = 0.000001

    déf iterer(soi, zx, zy):
        soit racine3_sur_2 = 0.8660254037844386
        soit x = zx
        soit y = zy
        soit iter = 0.0
        tantque iter < soi.max_iter:
            soit x2 = x * x
            soit y2 = y * y
            soit fx = x * x2 - 3.0 * x * y2 - 1.0
            soit fy = 3.0 * x2 * y - y * y2
            soit dfx = 3.0 * (x2 - y2)
            soit dfy = 6.0 * x * y
            soit denom = dfx * dfx + dfy * dfy
            si denom < soi.eps_convergence:
                retour iter
            soit delta_x = (fx * dfx + fy * dfy) / denom
            soit delta_y = (fy * dfx - fx * dfy) / denom
            x = x - delta_x
            y = y - delta_y
            soit d1 = (x - 1.0) * (x - 1.0) + y * y
            soit d2 = (x + 0.5) * (x + 0.5) + (y - racine3_sur_2) * (y - racine3_sur_2)
            soit d3 = (x + 0.5) * (x + 0.5) + (y + racine3_sur_2) * (y + racine3_sur_2)
            si d1 < soi.eps_convergence:
                retour iter
            sinonsi d2 < soi.eps_convergence:
                retour iter
            sinonsi d3 < soi.eps_convergence:
                retour iter
            iter = iter + 1.0
        retour iter


# ============================================================
# FractaleIFS : classe de base pour les systèmes de fonctions itérées
# Factualise la racine carrée approchée et le générateur pseudo-aléatoire
# ============================================================

classe FractaleIFS(Fractale):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)

    déf racine_approx(soi, valeur):
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

    déf iterer(soi, cx, cy):
        retour 0.0


# ============================================================
# BarnsleyFractale : hérite de FractaleIFS
# ============================================================

classe BarnsleyFractale(FractaleIFS):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)

    déf etape(soi, x, y, choix):
        si choix < 0.01:
            retour (0.0, 0.16 * y)
        sinonsi choix < 0.86:
            retour (0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6)
        sinonsi choix < 0.93:
            retour (0.20 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6)
        sinon:
            retour (-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44)

    déf iterer(soi, cx, cy):
        soit x = 0.0
        soit y = 0.0
        soit meilleur = 1.0e9
        soit choix = soi.abs_val(cx * 12.9898 + cy * 78.233)
        soit iter = 0.0
        tantque iter < soi.max_iter:
            choix = (choix * 3.987654321 + 0.123456789) % 1.0
            soit pt = soi.etape(x, y, choix)
            x = pt[0]
            y = pt[1]
            soit d = (x - cx * 1.5) * (x - cx * 1.5) + (y - (cy * 1.5 + 6.0)) * (y - (cy * 1.5 + 6.0))
            si d < meilleur:
                meilleur = d
            iter = iter + 1.0
        soit score = soi.max_iter - soi.racine_approx(meilleur) * 0.8
        si score < 0.0:
            retour 0.0
        si score > soi.max_iter:
            retour soi.max_iter
        retour score


# ============================================================
# SierpinskiFractale : hérite de FractaleIFS
# ============================================================

classe SierpinskiFractale(FractaleIFS):
    déf __init__(soi, max_iter):
        super().__init__(max_iter)

    déf etape(soi, x, y, choix):
        si choix < 0.333333333:
            retour (0.5 * x, 0.5 * y)
        sinonsi choix < 0.666666666:
            retour (0.5 * x + 0.5, 0.5 * y)
        sinon:
            retour (0.5 * x + 0.25, 0.5 * y + 0.43301270189)

    déf iterer(soi, cx, cy):
        soit x = 0.0
        soit y = 0.0
        soit meilleur = 1.0e9
        soit choix = soi.abs_val(cx * 91.133 + cy * 17.771)
        soit iter = 0.0
        tantque iter < soi.max_iter:
            choix = (choix * 2.618033989 + 0.707106781) % 1.0
            soit pt = soi.etape(x, y, choix)
            x = pt[0]
            y = pt[1]
            soit d = (x - (cx + 0.5)) * (x - (cx + 0.5)) + (y - (cy + 0.45)) * (y - (cy + 0.45))
            si d < meilleur:
                meilleur = d
            iter = iter + 1.0
        soit score = soi.max_iter - soi.racine_approx(meilleur) * 2.0
        si score < 0.0:
            retour 0.0
        si score > soi.max_iter:
            retour soi.max_iter
        retour score
