déf interpoler_lineaire(a, b, t):
    retour a + (b - a) * t

déf interpoler_logarithmique(a, b, t):
    si a <= 0.0:
        retour interpoler_lineaire(a, b, t)
    si b <= 0.0:
        retour interpoler_lineaire(a, b, t)
    soit rapport = b / a
    retour a * (rapport ** t)

déf ajuster_iterations_export(largeur, hauteur, max_iter):
    soit base = 480000.0
    soit surface = largeur * hauteur
    si surface <= base:
        retour max_iter
    soit facteur = surface / base
    soit iterations = max_iter * (1.0 + facteur * 0.35)
    si iterations < max_iter:
        retour max_iter
    retour iterations
