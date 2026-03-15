# AGENTS.md

## Scope

These instructions apply to the entire repository.

## Project Rules

- The canonical fractal implementations must live in the French multilingual source files under `src/*.ml`.
- Do not introduce a new fractal only in `public/js/renderer.js` unless it is strictly a browser-side drawing helper; the fractal name itself must exist in the French multilingual source.
- Prefer French user-facing labels and status text in the UI.
- Keep internal exported ids stable once introduced unless a rename is explicitly requested.

## Fractal Workflow

When adding or changing a fractal, update all relevant places together:

1. Add or update the function in the appropriate French multilingual source module in `src/`:
   - `fractales_escape.ml` — escape-time (Mandelbrot family, Julia family, Burning Julia, Biomorphe)
   - `fractales_variantes.ml` — Celtic, Buffalo, Perpendicular variants, Heart, Duck
   - `fractales_dynamique.ml` — Newton, Phoenix, Lyapunov, attractors, Duffing
   - `fractales_ifs.ml` — IFS / Barnsley, Sierpinski, Mandelbulb, Vicsek, …
   - `fractales_lsystem.ml` — L-system geometric curves
   - `fractales_magnetiques.ml` — Magnet family, Lambda, Nova magnétique
   - `fractales_lisse.ml` — smooth coloring variants (escape-time with μ formula)
   - `fractales_orbitrap.ml` — orbit trap variants (min-distance encoding)
   - `fractales_export.ml` — interpolation / export helpers only (no fractal definitions)
2. Register the fractal in `src/main.ml`.
3. Update WASM export expectations in `scripts/compile_wasm.ml`.
4. Update integration expectations in `scripts/integration_checks.py`.
5. Wire the fractal into `public/js/renderer.js`:
   - presets
   - family/menu entries
   - rendering path
   - WASM export loading
   - source map
   - fractal-specific settings in the dedicated `Options spécifiques` UI group when needed
   - syntax highlighting lists when needed
6. If the change affects documented capabilities, update `README.md`.

## Rendering Guidance

- Use `POINT_FRACTALS` for density/attractor or point-cloud rendering.
- Use `LINE_FRACTALS` for geometric curves and recursive line drawings.
- Use scalar/WASM rendering for escape-time style fractals whenever possible.
- Browser-side helpers in `renderer.js` are acceptable for drawing/export support, but the main fractal definition must still exist in the French multilingual source.

### POINT_FRACTALS (density orbit) checklist

Each POINT fractal requires the following in `renderer.js`:
1. A JS step function `etapeXxx(x, y, z, ...)` — pure iteration step, no escape logic.
2. Optionally a JS projection function `projeterXxx(x, y, z)` if the fractal lives in 3D — maps 3D orbit coords to 2D canvas.
3. A detection boolean `estXxx` declared at the top of **both** `renderPointFractal` and `remplirFractalePonctuelle`.
4. Step dispatch and projection dispatch in **both** render loops (live + export). Missing one loop causes a silent discrepancy between on-screen and exported images.
5. Initial orbit seed (`x`, `y`, `z`) chosen so the orbit converges to the attractor, not a degenerate fixed point or fast escape.
6. Appropriate `pointsTarget`, `burnIn`, and `pointsPerFrame` tuning.

### Escape-time fractals

Scalar/WASM escape-time fractals return an iteration count per pixel. They appear as 2D images regardless of how many dimensions the underlying formula uses. To give a spatial/depth impression on the 2D canvas, prefer the density-orbit (POINT_FRACTALS) approach for inherently volumetric fractals. Escape-time is best for flat sets (Mandelbrot, Julia, Magnetic families).

### 3D orbit rendering — depth shading

Projecting a 3D orbit onto the canvas without depth cues produces flat-looking output. The renderer implements **depth-weighted density** for 3D POINT_FRACTALS: each accumulated point contributes a weight proportional to its distance from the viewer (smaller z = closer = higher weight). This makes front-facing surfaces accumulate more density and appear brighter, giving genuine depth shading without modifying the coloring pipeline.

Any new 3D orbit fractal should:
- Use `est3D` flag to opt into depth weighting in the `putPoint` call.
- Choose a projection angle that clearly separates front from back faces.
- Avoid degenerate orbits: if an update rule is `nz = f(x, z) + c_z`, verify at least one of `z₀ ≠ 0` or `c_z ≠ 0`; otherwise z stays zero and the 3D formula collapses to 2D.
- Guard against orbit escape in iterative maps with growth: add a reset if `|orbit| > threshold` before projecting.

### Smooth coloring — `fractales_lisse.ml`

Smooth coloring applies the formula `μ = iter + 2 − (ln ln |z|² − ln ln 2) / ln 2` at escape
to eliminate iteration banding. Key constraints for new smooth variants:

- The log function is implemented as `log_lisse(x)` using iterative halving/doubling to [1, 2)
  followed by a 4-term atanh series. Do not call any external `math` module inside WAT-compiled code.
- Check `ln_r2 > 0` before the second log call to avoid `log(0)` at the escape boundary.
- Clamp `mu` to `[0, max_iter]` before returning.
- 4-parameter variants (e.g. `julia_lisse(zx, zy, c_re, c_im, max_iter)`) follow the same
  dispatch convention as `julia` — they read `params.juliaCre` / `params.juliaCim` in the renderer.

### Orbit trap coloring — `fractales_orbitrap.ml`

Orbit trap fractals record the minimum distance from the orbit to a geometric shape and return
`max_iter / (1 + dist_min × scale)`. This encodes coloring as a single float in `[0, max_iter]`
compatible with the existing palette pipeline — no special renderer branch is needed.

Guidelines:
- Choose `scale` so that the transition from bright to dark spans a visually useful range
  (typically `scale` ≈ 10–50 for unit-radius shapes).
- 4-parameter orbit trap variants follow the julia dispatch convention (same as smooth variants).
- Orbit trap functions are **escape-time** fractals, not `POINT_FRACTALS`; classify them in
  `wasmFunctions` only (not in `POINT_FRACTALS` or `LINE_FRACTALS`).

### SVG export — L-system fractals

`exporterSVG()` in `renderer.js` uses a mock canvas context to capture path commands from
`dessinerFractaleLineaire`, then emits an SVG `<path>` element. When adding a new L-system
fractal:

- Add it to `LINE_FRACTALS` so the SVG export button becomes visible.
- Ensure `dessinerFractaleLineaire` dispatches on its name.
- The mock context captures `moveTo` / `lineTo`; make sure your drawing function does not rely
  on `arc`, `fillRect`, or other non-path primitives (those are silently ignored in the mock).

### Julia coupling canvas

The `#julia-coupling-canvas` (200×200) shows a live Julia preview when the active fractal is
Mandelbrot. It uses the cursor's complex coordinates as the `c` parameter.

- Only activate the mousemove listener when `params.fractal === "mandelbrot"`.
- The coupling canvas renders at reduced iteration count for performance.
- New Mandelbrot-family fractals (e.g. `mandelbrot_lisse`) should be added to the activation
  condition if a live Julia preview is meaningful for them.

### Fractal-specific settings

Fractal-only controls must live in the dedicated `Options spécifiques` group in the footer, not
mixed permanently into the global controls row. This group is configurable and may host settings
for any fractal family, not only Julia.

Guidelines:
- Keep global controls global: family, fractal, iterations, palette, reset, signet, export.
- Show the `Options spécifiques` group only when the active fractal actually uses at least one
  dedicated setting.
- Group each setting family in its own sub-block (for example `#julia-c-controls`,
  `#multibrot-power-group`) so multiple fractal-specific settings can coexist cleanly.
- When adding a new per-fractal parameter, update both the DOM visibility logic and the state sync
  paths in `renderer.js` (initial selection, bookmark restore, export capture if relevant).
- Reuse existing renderer params when possible (`params.juliaCre`, `params.juliaCim`,
  `params.multibrotPower`) and introduce new stable param ids only when necessary.

### Julia c sliders

`mettreAJourOptionsSpecifiques()` shows `#julia-c-controls` whenever the active fractal belongs to
the Julia-type family: `julia`, `burning_julia`, `julia_lisse`, `julia_piege_cercle`.
Add any new 4-parameter fractal (`zx`, `zy`, `c_re`, `c_im`, `max_iter`) to this list so its
controls appear in `Options spécifiques`.

### Multibrot power

`#multibrot-power-group` belongs to the same configurable `Options spécifiques` system and should
only be visible for fractals that actually use `params.multibrotPower`. Do not leave `Puissance`
visible for unrelated fractals.

### Bookmark system

`chargerSignets()` / `sauvegarderSignets()` persist view state arrays in `localStorage`
under the key `"fractalesSignets"`. Each entry contains `{ fractal, centerX, centerY, zoom, label }`.
No backend required — entirely browser-side.

### Palette system

`PALETTES` in `renderer.js` drives all coloring. Each palette has `fond` (background), `interieur` (interior / max-iter), and `stops[]` (RGB gradient stops). When adding a palette, also add an `<option>` in `index.html`. Aim for wide hue range and pure-black backgrounds for maximum contrast.

## Verification

Run these checks after meaningful changes:

```powershell
node --check public\js\renderer.js
python scripts\compile_wasm.py
python scripts\integration_checks.py
python scripts\ui_smoke_checks.py
```

Rebuild order matters: `compile_wasm.py` regenerates `public/main_wasm_bundle.ml` from `src/*.ml`, overwriting any manual edits to the bundle. Always edit `src/fractales_ifs.ml` (and sibling modules), never `public/main_wasm_bundle.ml` directly.

## Integration check contract

`scripts/integration_checks.py` enforces that every fractal registered in `src/main.ml` appears in **all** of:
- `REQUIRED_EXPORTS` in `integration_checks.py`
- `exports_requises` in `scripts/compile_wasm.ml`
- `FRACTAL_FAMILIES` in `renderer.js`
- `VIEW_PRESETS` in `renderer.js`
- `FRACTAL_SOURCE_MAP` in `renderer.js`
- `wasmFunctions` mapping (the `typeof exports.x === "function"` pattern) in `renderer.js`
- Classified for rendering: either in `POINT_FRACTALS`, `LINE_FRACTALS`, or in `wasmFunctions`

POINT_FRACTALS still need a `wasmFunctions` entry (the WASM function is compiled for language-showcase purposes even if rendering uses JS step functions).

## Editing Notes

- Prefer ASCII in code unless the file already uses accented French text.
- Keep changes consistent with the repository’s existing French terminology.
- `public/main.ml` is overwritten by `compile_wasm.py` (copied from `src/main.ml`). Edit `src/main.ml`.
