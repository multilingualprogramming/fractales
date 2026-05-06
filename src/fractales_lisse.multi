# Fractales à coloration lisse (smooth iteration count)
# Utilise le comptage d'itérations continu pour éliminer le banding de couleur.
#
# Formule : mu = iter + 2 - (ln(ln(r²)) - ln(ln(2))) / ln(2)
# où r² = |z|² au moment de l'échappement.
#
# Compilé vers WASM via le pipeline multilingual.

déf abs_lisse(v):
    si v < 0.0:
        retour -v
    retour v

déf log_lisse(x):
    # Logarithme naturel approché pour x > 0
    # Réduction vers [1, 2) par halvage itératif, puis série de Padé
    soit ln2 = 0.693147180559945
    soit resultat = 0.0
    tantque x >= 2.0:
        x = x * 0.5
        resultat = resultat + ln2
    tantque x < 1.0:
        x = x * 2.0
        resultat = resultat - ln2
    # Approximation de ln(1+t) via atanh: ln(x) = 2*atanh((x-1)/(x+1))
    # t = (x-1)/(x+1), série: 2*(t + t³/3 + t⁵/5 + t⁷/7)
    soit t = (x - 1.0) / (x + 1.0)
    soit t2 = t * t
    soit t3 = t2 * t
    soit t5 = t3 * t2
    soit t7 = t5 * t2
    retour resultat + 2.0 * (t + t3 / 3.0 + t5 / 5.0 + t7 / 7.0)

déf mandelbrot_lisse(cx, cy, max_iter):
    # Mandelbrot avec comptage d'itérations lisse (sans banding)
    soit ln2 = 0.693147180559945
    soit ln_ln2 = -0.36651292058166435
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        soit r2 = x * x + y * y
        si r2 > 4.0:
            soit ln_r2 = log_lisse(r2)
            si ln_r2 > 0.0:
                soit ln_ln_r2 = log_lisse(ln_r2)
                soit mu = iter + 2.0 - (ln_ln_r2 - ln_ln2) / ln2
                si mu < 0.0:
                    retour 0.0
                si mu > max_iter:
                    retour max_iter
                retour mu
            retour iter
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour max_iter

déf julia_lisse(zx, zy, c_re, c_im, max_iter):
    # Julia avec comptage d'itérations lisse
    soit ln2 = 0.693147180559945
    soit ln_ln2 = -0.36651292058166435
    soit x = zx
    soit y = zy
    soit iter = 0.0
    tantque iter < max_iter:
        soit r2 = x * x + y * y
        si r2 > 4.0:
            soit ln_r2 = log_lisse(r2)
            si ln_r2 > 0.0:
                soit ln_ln_r2 = log_lisse(ln_r2)
                soit mu = iter + 2.0 - (ln_ln_r2 - ln_ln2) / ln2
                si mu < 0.0:
                    retour 0.0
                si mu > max_iter:
                    retour max_iter
                retour mu
            retour iter
        soit xtemp = x * x - y * y + c_re
        y = 2.0 * x * y + c_im
        x = xtemp
        iter = iter + 1.0
    retour max_iter

déf burning_ship_lisse(cx, cy, max_iter):
    # Burning Ship avec comptage d'itérations lisse
    soit ln2 = 0.693147180559945
    soit ln_ln2 = -0.36651292058166435
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        soit r2 = x * x + y * y
        si r2 > 4.0:
            soit ln_r2 = log_lisse(r2)
            si ln_r2 > 0.0:
                soit ln_ln_r2 = log_lisse(ln_r2)
                soit mu = iter + 2.0 - (ln_ln_r2 - ln_ln2) / ln2
                si mu < 0.0:
                    retour 0.0
                si mu > max_iter:
                    retour max_iter
                retour mu
            retour iter
        soit ax = abs_lisse(x)
        soit ay = abs_lisse(y)
        soit xtemp = ax * ax - ay * ay + cx
        y = 2.0 * ax * ay + cy
        x = xtemp
        iter = iter + 1.0
    retour max_iter

déf tricorn_lisse(cx, cy, max_iter):
    # Tricorn avec comptage d'itérations lisse
    soit ln2 = 0.693147180559945
    soit ln_ln2 = -0.36651292058166435
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        soit r2 = x * x + y * y
        si r2 > 4.0:
            soit ln_r2 = log_lisse(r2)
            si ln_r2 > 0.0:
                soit ln_ln_r2 = log_lisse(ln_r2)
                soit mu = iter + 2.0 - (ln_ln_r2 - ln_ln2) / ln2
                si mu < 0.0:
                    retour 0.0
                si mu > max_iter:
                    retour max_iter
                retour mu
            retour iter
        soit xtemp = x * x - y * y + cx
        y = -2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour max_iter
