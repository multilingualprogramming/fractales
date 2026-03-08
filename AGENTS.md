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

1. Add or update the function in the appropriate French multilingual source module in `src/`.
2. Register the fractal in `src/main.ml`.
3. Update WASM export expectations in `scripts/compile_wasm.ml`.
4. Update integration expectations in `scripts/integration_checks.py`.
5. Wire the fractal into `public/js/renderer.js`:
   - presets
   - family/menu entries
   - rendering path
   - WASM export loading
   - source map
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
