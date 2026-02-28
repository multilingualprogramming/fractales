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
    soit koch_seuil = 0.08
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

    soit score = (1.0 - dist / (koch_seuil * 4.0)) * (max_iter * 0.9)
    si score < 0.0:
        retour 0.0
    si score > max_iter * 0.9:
        retour max_iter * 0.9
    retour score
