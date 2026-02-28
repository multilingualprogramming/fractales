# fractales_classes_compat.ml
# Compatibilite WASM pour usage "classe" en conditions reelles.
# Strategie: conserver un coeur fonctionnel (sans etat d'instance),
# puis exposer une facade objet minimale + wrapper d'export plat.

fonction mandelbrot_compat_core(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si (x * x + y * y) > 4.0:
            retour iter
        soit xtemp = x * x - y * y + cx
        y = 2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter


classe MandelbrotFractaleCompat:
    fonction __init__(soi):
        retour 0.0

    fonction iterer(soi, cx, cy, max_iter):
        retour mandelbrot_compat_core(cx, cy, max_iter)


fonction mandelbrot_classe(cx, cy, max_iter):
    soit fractale = MandelbrotFractaleCompat()
    retour fractale.iterer(cx, cy, max_iter)
