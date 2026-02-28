déf barnsley_etape(x, y, choix):
    # choix dans [0, 1)
    si choix < 0.01:
        retour (0.0, 0.16 * y)
    sinonsi choix < 0.86:
        retour (0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6)
    sinonsi choix < 0.93:
        retour (0.20 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6)
    sinon:
        retour (-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44)

déf sierpinski_etape(x, y, choix):
    # Triangle avec 3 sommets
    si choix < 0.333333333:
        retour (0.5 * x, 0.5 * y)
    sinonsi choix < 0.666666666:
        retour (0.5 * x + 0.5, 0.5 * y)
    sinon:
        retour (0.5 * x + 0.25, 0.5 * y + 0.43301270189)
