def mandelbrot(cx, cy, max_iter):
    x = 0.0
    y = 0.0
    iter = 0.0
    while (iter < max_iter):
        if (((x * x) + (y * y)) > 4.0):
            return iter
        xtemp = (((x * x) - (y * y)) + cx)
        y = (((2.0 * x) * y) + cy)
        x = xtemp
        iter = (iter + 1.0)
    return iter
