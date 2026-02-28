déf abs_val(v):
    si v < 0.0:
        retour -v
    retour v

déf min_val(a, b):
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
    soit dist = abs_val(y)
    soit niveau = 0.0
    soit nmax = min_val(max_iter, 8.0)
    tantque niveau < nmax:
        x = x * 3.0
        y = y * 3.0
        soit cellule = x - (x % 1.0)
        x = x - cellule
        si cellule == 1.0:
            y = abs_val(y - 1.0)
        soit d = abs_val(y - 0.5) / echelle
        si d < dist:
            dist = d
        echelle = echelle * 3.0
        niveau = niveau + 1.0

    si dist < koch_seuil:
        retour max_iter
    soit score = max_iter - (dist / koch_seuil) * max_iter
    si score < 0.0:
        retour 0.0
    retour score
