constante KOCH_AXIOME = "F"
constante KOCH_REGLE_F = "F+F--F+F"

classe SystemeL:
    déf __init__(soi, axiome):
        soi.axiome = axiome

    déf regle(soi, symbole):
        retour symbole

    déf remplacer(soi, chaine):
        soit resultat = ""
        pour c dans chaine:
            resultat = resultat + soi.regle(c)
        retour resultat

    déf generer(soi, iterations):
        soit etat = soi.axiome
        soit i = 0
        tantque i < iterations:
            etat = soi.remplacer(etat)
            i = i + 1
        retour etat

classe SystemeKoch(SystemeL):
    déf __init__(soi):
        super().__init__(KOCH_AXIOME)

    déf regle(soi, symbole):
        si symbole == "F":
            retour KOCH_REGLE_F
        sinon:
            retour symbole

déf koch_generer(iterations):
    soit systeme = SystemeKoch()
    retour systeme.generer(iterations)
