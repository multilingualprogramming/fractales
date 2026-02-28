depuis fractales_escape importer FractaleEvasion

constante RAYON_ECHAPPEMENT_CARRE = 4.0

classe FractaleVariante(FractaleEvasion):
    déf __init__(soi):
        super().__init__(RAYON_ECHAPPEMENT_CARRE)

classe CelticFractale(FractaleVariante):
    déf iterer(soi, cx, cy, max_iter):
        soit x = 0.0
        soit y = 0.0
        soit iter = 0.0
        tantque iter < max_iter:
            si soi.est_echappe(x, y):
                retour iter
            soit xtemp = abs(x * x - y * y) + cx
            y = 2.0 * x * y + cy
            x = xtemp
            iter = iter + 1.0
        retour iter

classe BuffaloFractale(FractaleVariante):
    déf iterer(soi, cx, cy, max_iter):
        soit x = 0.0
        soit y = 0.0
        soit iter = 0.0
        tantque iter < max_iter:
            si soi.est_echappe(x, y):
                retour iter
            soit xtemp = abs(x * x - y * y) + cx
            y = abs(2.0 * x * y) + cy
            x = xtemp
            iter = iter + 1.0
        retour iter

classe PerpendicularBurningShipFractale(FractaleVariante):
    déf iterer(soi, cx, cy, max_iter):
        soit x = 0.0
        soit y = 0.0
        soit iter = 0.0
        tantque iter < max_iter:
            si soi.est_echappe(x, y):
                retour iter
            soit ax = abs(x)
            soit ay = abs(y)
            soit xtemp = ax * ax - ay * ay + cx
            y = -2.0 * ax * y + cy
            x = xtemp
            iter = iter + 1.0
        retour iter

déf celtic(cx, cy, max_iter):
    soit fractale = CelticFractale()
    retour fractale.iterer(cx, cy, max_iter)

déf buffalo(cx, cy, max_iter):
    soit fractale = BuffaloFractale()
    retour fractale.iterer(cx, cy, max_iter)

déf perpendicular_burning_ship(cx, cy, max_iter):
    soit fractale = PerpendicularBurningShipFractale()
    retour fractale.iterer(cx, cy, max_iter)
