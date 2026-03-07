# fractales_magnetiques.ml
# Nouvelles fractales : Magnet I, Magnet II, Lambda (logistique complexe)
#
# Ces fonctions sont compilées vers WebAssembly (ajoutées à MODULES_WASM).
# Elles complètent la hiérarchie OOP de fractales_classes.ml.
#
# Références mathématiques :
#   Magnet I  : z_{n+1} = ((z² + c - 1) / (2z + c - 2))²
#   Magnet II : z_{n+1} = ((z³ + 3(c-1)z + (c-1)(c-2)) / (3z² + 3(c-2)z + (c-1)(c-2)+1))²
#   Lambda    : z_{n+1} = c · z · (1 - z),  z₀ = 0.5

# ============================================================
# Utilitaires arithmétiques complexes
# ============================================================

déf normaliser_angle_magnetique(x):
    soit angle = x
    soit deux_pi = 6.283185307179586
    tantque angle > 3.141592653589793:
        angle = angle - deux_pi
    tantque angle < -3.141592653589793:
        angle = angle + deux_pi
    retour angle

déf sinus_magnetique(x):
    soit angle = normaliser_angle_magnetique(x)
    soit angle2 = angle * angle
    soit angle3 = angle2 * angle
    soit angle5 = angle3 * angle2
    soit angle7 = angle5 * angle2
    retour angle - angle3 / 6.0 + angle5 / 120.0 - angle7 / 5040.0

déf cosinus_magnetique(x):
    soit angle = normaliser_angle_magnetique(x)
    soit angle2 = angle * angle
    soit angle4 = angle2 * angle2
    soit angle6 = angle4 * angle2
    retour 1.0 - angle2 / 2.0 + angle4 / 24.0 - angle6 / 720.0

déf complexe_diviser_re(a_re, a_im, b_re, b_im):
    soit denom = b_re * b_re + b_im * b_im
    si denom < 1.0e-12:
        retour 1.0e9
    retour (a_re * b_re + a_im * b_im) / denom

déf complexe_diviser_im(a_re, a_im, b_re, b_im):
    soit denom = b_re * b_re + b_im * b_im
    si denom < 1.0e-12:
        retour 1.0e9
    retour (a_im * b_re - a_re * b_im) / denom

# ============================================================
# Magnet type I
# z_{n+1} = ((z² + c - 1) / (2z + c - 2))²
# Rayon d'évasion élevé (attraction vers ±1)
# ============================================================

déf magnet1(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        # numérateur : z² + c - 1
        soit num_re = x * x - y * y + cx - 1.0
        soit num_im = 2.0 * x * y + cy
        # dénominateur : 2z + c - 2
        soit den_re = 2.0 * x + cx - 2.0
        soit den_im = 2.0 * y + cy
        # division complexe : q = num / den
        soit q_re = complexe_diviser_re(num_re, num_im, den_re, den_im)
        soit q_im = complexe_diviser_im(num_re, num_im, den_re, den_im)
        # mise au carré : z_{n+1} = q²
        x = q_re * q_re - q_im * q_im
        y = 2.0 * q_re * q_im
        iter = iter + 1.0
    retour iter

# ============================================================
# Magnet type II
# z_{n+1} = ((z³ + 3(c-1)z + (c-1)(c-2)) / (3z² + 3(c-2)z + (c-1)(c-2)+1))²
# Version d'ordre supérieur de la fractale magnétique
# ============================================================

déf magnet2(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        soit x2 = x * x
        soit y2 = y * y
        # facteurs complexes : (c-1) et (c-2)
        soit cm1_re = cx - 1.0
        soit cm1_im = cy
        soit cm2_re = cx - 2.0
        soit cm2_im = cy
        # produit (c-1)(c-2)
        soit prod_re = cm1_re * cm2_re - cm1_im * cm2_im
        soit prod_im = cm1_re * cm2_im + cm1_im * cm2_re
        # z³ : re = x³ - 3xy², im = 3x²y - y³
        soit z3_re = x * x2 - 3.0 * x * y2
        soit z3_im = 3.0 * x2 * y - y * y2
        # 3(c-1)z
        soit c1z_re = 3.0 * (cm1_re * x - cm1_im * y)
        soit c1z_im = 3.0 * (cm1_re * y + cm1_im * x)
        # numérateur : z³ + 3(c-1)z + (c-1)(c-2)
        soit num_re = z3_re + c1z_re + prod_re
        soit num_im = z3_im + c1z_im + prod_im
        # z²
        soit z2_re = x2 - y2
        soit z2_im = 2.0 * x * y
        # 3(c-2)z
        soit c2z_re = 3.0 * (cm2_re * x - cm2_im * y)
        soit c2z_im = 3.0 * (cm2_re * y + cm2_im * x)
        # dénominateur : 3z² + 3(c-2)z + (c-1)(c-2) + 1
        soit den_re = 3.0 * z2_re + c2z_re + prod_re + 1.0
        soit den_im = 3.0 * z2_im + c2z_im + prod_im
        # division complexe : q = num / den
        soit q_re = complexe_diviser_re(num_re, num_im, den_re, den_im)
        soit q_im = complexe_diviser_im(num_re, num_im, den_re, den_im)
        # mise au carré : z_{n+1} = q²
        x = q_re * q_re - q_im * q_im
        y = 2.0 * q_re * q_im
        iter = iter + 1.0
    retour iter

# ============================================================
# Lambda (logistique complexe)
# z_{n+1} = c · z · (1 - z),  z₀ = 0.5
# c = coordonnée du pixel (paramètre de la carte logistique)
# ============================================================

déf lambda_fractale(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit x = 0.5
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        # w = 1 - z = (1-x, -y)
        soit w_re = 1.0 - x
        soit w_im = -y
        # p = z · (1-z) = (x·w_re - y·w_im, x·w_im + y·w_re)
        soit p_re = x * w_re - y * w_im
        soit p_im = x * w_im + y * w_re
        # z_{n+1} = c · p = (cx·p_re - cy·p_im, cx·p_im + cy·p_re)
        x = cx * p_re - cy * p_im
        y = cx * p_im + cy * p_re
        iter = iter + 1.0
    retour iter

# ============================================================
# Magnet type III
# Variante rationnelle d'ordre cubique avec dénominateur décalé
# ============================================================

déf magnet3(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        soit x2 = x * x
        soit y2 = y * y
        soit z3_re = x * x2 - 3.0 * x * y2
        soit z3_im = 3.0 * x2 * y - y * y2
        soit z2_re = x2 - y2
        soit z2_im = 2.0 * x * y
        soit num_re = z3_re + (cx - 1.0) * z2_re - cy * z2_im + cx - 1.0
        soit num_im = z3_im + (cx - 1.0) * z2_im + cy * z2_re + cy
        soit den_re = 3.0 * z2_re + 2.0 * x + cx - 2.0
        soit den_im = 3.0 * z2_im + 2.0 * y + cy
        soit q_re = complexe_diviser_re(num_re, num_im, den_re, den_im)
        soit q_im = complexe_diviser_im(num_re, num_im, den_re, den_im)
        x = q_re * q_re - q_im * q_im
        y = 2.0 * q_re * q_im
        iter = iter + 1.0
    retour iter

# ============================================================
# Lambda cubique
# z_{n+1} = c · z · (1 - z²), z₀ = 0.5
# ============================================================

déf lambda_cubique(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit x = 0.5
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        soit z2_re = x * x - y * y
        soit z2_im = 2.0 * x * y
        soit w_re = 1.0 - z2_re
        soit w_im = -z2_im
        soit p_re = x * w_re - y * w_im
        soit p_im = x * w_im + y * w_re
        x = cx * p_re - cy * p_im
        y = cx * p_im + cy * p_re
        iter = iter + 1.0
    retour iter

# ============================================================
# Magnet cosinus
# c est déformé par cos/sin avant d'entrer dans la transformation rationnelle
# ============================================================

déf magnet_cosinus(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit c_re = cosinus_magnetique(cx) - cy * 0.25
    soit c_im = sinus_magnetique(cy) + cx * 0.15
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        soit num_re = x * x - y * y + c_re - 1.0
        soit num_im = 2.0 * x * y + c_im
        soit den_re = 2.0 * x + c_re - 2.0
        soit den_im = 2.0 * y + c_im
        soit q_re = complexe_diviser_re(num_re, num_im, den_re, den_im)
        soit q_im = complexe_diviser_im(num_re, num_im, den_re, den_im)
        x = q_re * q_re - q_im * q_im
        y = 2.0 * q_re * q_im
        iter = iter + 1.0
    retour iter

# ============================================================
# Magnet sinus
# Variante magnétique basée sur une modulation sinusoïdale du paramètre
# ============================================================

déf magnet_sinus(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit c_re = sinus_magnetique(cx) - cy * 0.18
    soit c_im = cosinus_magnetique(cy) + cx * 0.12
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        soit x2 = x * x
        soit y2 = y * y
        soit num_re = x2 - y2 + c_re - 1.0
        soit num_im = 2.0 * x * y + c_im
        soit den_re = 2.0 * x + c_re - 2.0
        soit den_im = 2.0 * y + c_im
        soit q_re = complexe_diviser_re(num_re, num_im, den_re, den_im)
        soit q_im = complexe_diviser_im(num_re, num_im, den_re, den_im)
        x = q_re * q_re - q_im * q_im + 0.05 * c_re
        y = 2.0 * q_re * q_im + 0.05 * c_im
        iter = iter + 1.0
    retour iter

# ============================================================
# Nova magnétique
# Croisement entre une itération de Nova et une attraction magnétique
# ============================================================

déf nova_magnetique(cx, cy, max_iter):
    soit rayon_echappement_carre = 10000.0
    soit x = cx
    soit y = cy
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > rayon_echappement_carre:
            retour iter
        soit x2 = x * x
        soit y2 = y * y
        soit z3_re = x * x2 - 3.0 * x * y2
        soit z3_im = 3.0 * x2 * y - y * y2
        soit z2_re = x2 - y2
        soit z2_im = 2.0 * x * y
        soit f_re = z3_re - 1.0
        soit f_im = z3_im
        soit den_re = 3.0 * z2_re + cx - 1.0
        soit den_im = 3.0 * z2_im + cy
        soit delta_re = complexe_diviser_re(f_re, f_im, den_re, den_im)
        soit delta_im = complexe_diviser_im(f_re, f_im, den_re, den_im)
        soit q_re = x - 0.55 * delta_re
        soit q_im = y - 0.55 * delta_im
        soit mag_re = complexe_diviser_re(q_re, q_im, q_re + cx - 1.5, q_im + cy)
        soit mag_im = complexe_diviser_im(q_re, q_im, q_re + cx - 1.5, q_im + cy)
        x = mag_re * mag_re - mag_im * mag_im
        y = 2.0 * mag_re * mag_im
        iter = iter + 1.0
    retour iter
