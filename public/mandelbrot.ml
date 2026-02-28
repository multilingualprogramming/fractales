# Ensemble de Mandelbrot — source en français (multilingual)
#
# Calcule le nombre d'itérations pour un point complexe (cx, cy)
# avant que sa trajectoire échappe au disque de rayon 2.
#
# Algorithme : z_{n+1} = z_n^2 + c,  z_0 = 0
#   où c = cx + i·cy est le paramètre complexe à tester
#
# Mots-clés français utilisés :
#   déf      — définition de fonction  (≈ def)
#   soit     — déclaration de variable  (≈ let)
#   tantque  — boucle conditionnelle    (≈ while)
#   si       — condition                (≈ if)
#   retour   — retourner une valeur     (≈ return)
#
# Paramètres :
#   cx       — partie réelle du point complexe
#   cy       — partie imaginaire du point complexe
#   max_iter — nombre maximum d'itérations (float)
#
# Retourne : nombre d'itérations avant échappement (float)

déf mandelbrot(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > 4.0:
            retour iter
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter
