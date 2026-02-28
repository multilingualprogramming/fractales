déf celtic(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > 4.0:
            retour iter
        soit xtemp = abs(x * x - y * y) + cx
        y = 2.0 * x * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf buffalo(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > 4.0:
            retour iter
        soit xtemp = abs(x * x - y * y) + cx
        y = abs(2.0 * x * y) + cy
        x = xtemp
        iter = iter + 1.0
    retour iter

déf perpendicular_burning_ship(cx, cy, max_iter):
    soit x = 0.0
    soit y = 0.0
    soit iter = 0.0
    tantque iter < max_iter:
        si x * x + y * y > 4.0:
            retour iter
        soit ax = abs(x)
        soit ay = abs(y)
        soit xtemp = ax * ax - ay * ay + cx
        y = -2.0 * ax * y + cy
        x = xtemp
        iter = iter + 1.0
    retour iter
