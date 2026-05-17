# AGENTS.md

## Scope

These instructions apply to the entire repository.

## Project Rules

- The canonical fractal implementations must live in the French multilingual source files under `src/*.multi`.
- Do not introduce a new fractal only in `public/js/renderer.js` unless it is strictly a browser-side drawing helper; the fractal name itself must exist in the French multilingual source.
- Prefer French user-facing labels and status text in the UI.
- Keep internal exported ids stable once introduced unless a rename is explicitly requested.

## Fractal Workflow

When adding or changing a fractal, update all relevant places together:

1. Add or update the function in the appropriate French multilingual source module in `src/`:
   - `fractales_escape.multi` — escape-time (Mandelbrot family, Julia family, Burning Julia, Biomorphe)
   - `fractales_variantes.multi` — Celtic, Buffalo, Perpendicular variants, Heart, Duck
   - `fractales_dynamique.multi` — Newton, Phoenix, Lyapunov, attractors, Duffing
   - `fractales_ifs.multi` — IFS / Barnsley, Sierpinski, Mandelbulb, Vicsek, …
   - `fractales_lsystem.multi` — L-system geometric curves
   - `fractales_magnetiques.multi` — Magnet family, Lambda, Nova magnétique
   - `fractales_lisse.multi` — smooth coloring variants (escape-time with μ formula)
   - `fractales_orbitrap.multi` — orbit trap variants (min-distance encoding)
   - `fractales_export.multi` — interpolation / export helpers only (no fractal definitions)
2. Register the fractal in `src/main.multi`.
3. Update WASM export expectations in `scripts/compile_wasm.multi`.
4. Update integration expectations in `scripts/integration_checks.py`.
5. Wire the fractal into `public/js/renderer.js`:
   - presets
   - family/menu entries
   - rendering path
   - WASM export loading
   - source map
   - fractal-specific settings in the dedicated `Options spécifiques` UI group when needed
   - syntax highlighting lists when needed
   - and update the relevant extracted browser helper module in `public/js/` if the change affects source-panel loading, benchmark UI, bookmarks, export flows, or another split UI concern
6. Add an entry for the fractal in `FRACTAL_DESCRIPTIONS` in `scripts/generate_api.py`. This dict drives the AI-readable static JSON API; every fractal must have a one-line English description of its iteration formula or construction method.
7. If the change affects documented capabilities, update `README.md`.

## Rendering Guidance

- Use `POINT_FRACTALS` for density/attractor or point-cloud rendering.
- Use `LINE_FRACTALS` for geometric curves and recursive line drawings.
- Use scalar/WASM rendering for escape-time style fractals whenever possible.
- Browser-side helpers in `renderer.js` or sibling modules under `public/js/` are acceptable for drawing/export/UI support, but the main fractal definition must still exist in the French multilingual source.

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

### Smooth coloring — `fractales_lisse.multi`

Smooth coloring applies the formula `μ = iter + 2 − (ln ln |z|² − ln ln 2) / ln 2` at escape
to eliminate iteration banding. Key constraints for new smooth variants:

- The log function is implemented as `log_lisse(x)` using iterative halving/doubling to [1, 2)
  followed by a 4-term atanh series. Do not call any external `math` module inside WAT-compiled code.
- Check `ln_r2 > 0` before the second log call to avoid `log(0)` at the escape boundary.
- Clamp `mu` to `[0, max_iter]` before returning.
- 4-parameter variants (e.g. `julia_lisse(zx, zy, c_re, c_im, max_iter)`) follow the same
  dispatch convention as `julia` — they read `params.juliaCre` / `params.juliaCim` in the renderer.

### Orbit trap coloring — `fractales_orbitrap.multi`

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

`renderer-export.js` uses a mock canvas context to capture path commands from
`dessinerFractaleLineaire`, then emits an SVG `<path>` element. When adding a new L-system
fractal:

- Add it to `LINE_FRACTALS` so the SVG export button becomes visible.
- Ensure `dessinerFractaleLineaire` dispatches on its name.
- The mock context captures `moveTo` / `lineTo`; make sure your drawing function does not rely
  on `arc`, `fillRect`, or other non-path primitives (those are silently ignored in the mock).

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
- When adding a new per-fractal parameter, update both the DOM visibility logic in `renderer.js`
  and the relevant state sync paths in the extracted UI modules (initial selection, bookmark
  restore, export capture if relevant).
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

`renderer-bookmarks.js` persists view state arrays in `localStorage`
under the key `"fractales_signets"`. Entries store the captured view object used by the UI
(fractal, palette, iterations, optional 3D view, and view coordinates when applicable).
No backend required — entirely browser-side.

### Palette system

`PALETTES` in `renderer.js` drives all coloring. Each palette has `fond` (background), `interieur` (interior / max-iter), and `stops[]` (RGB gradient stops). When adding a palette, also add an `<option>` in `index.html`. Aim for wide hue range and pure-black backgrounds for maximum contrast.

## Verification

Run these checks after meaningful changes:

```powershell
node --check public\js\renderer.js
node --check public\js\renderer-navigation.js
node --check public\js\renderer-source-panel.js
node --check public\js\renderer-bookmarks.js
node --check public\js\renderer-export.js
python scripts\compile_wasm.py
python scripts\generate_api.py
python scripts\integration_checks.py
python scripts\ui_smoke_checks.py
```

Rebuild order matters:
- `compile_wasm.py` must run before `generate_api.py` and `integration_checks.py`.
- `compile_wasm.py` regenerates `public/main_wasm_bundle.multi` from `src/*.multi`, overwriting any manual edits to the bundle. Always edit `src/fractales_*.multi`, never `public/main_wasm_bundle.multi` directly.
- `generate_api.py` reads `public/js/renderer.js` (FRACTAL_FAMILIES, VIEW_PRESETS, FRACTAL_SOURCE_MAP) and writes `public/api/` (gitignored — CI artifact). It must be re-run whenever fractal registries in `renderer.js` change.

## Integration check contract

`scripts/integration_checks.py` enforces that every fractal registered in `src/main.multi` appears in **all** of:
- `REQUIRED_EXPORTS` in `integration_checks.py`
- `exports_requises` in `scripts/compile_wasm.multi`
- `FRACTAL_FAMILIES` in `renderer.js`
- `VIEW_PRESETS` in `renderer.js`
- `FRACTAL_SOURCE_MAP` in `renderer.js`
- `wasmFunctions` mapping (the `typeof exports.x === "function"` pattern) in `renderer.js`
- Classified for rendering: either in `POINT_FRACTALS`, `LINE_FRACTALS`, or in `wasmFunctions`

It also verifies the AI interface layer (`check_api_files`):
- `public/api/fractals.json` exists and has `total > 0`
- `public/api/families.json` and all 8 per-family files exist
- `public/tools.json` and `public/ai-manifest.json` exist

The integration checks intentionally read those registries from `renderer.js`, so keep the
canonical fractal metadata there even if related UI behavior is extracted into sibling modules.

POINT_FRACTALS still need a `wasmFunctions` entry (the WASM function is compiled for language-showcase purposes even if rendering uses JS step functions).

## Navigation module — `fractales_navigation.multi`

`src/fractales_navigation.multi` exports three mathematical primitives used by the animated deep-link navigation system:

- `easer_cubique(t)` — Hermite smoothstep `t²(3−2t)`
- `interpoler_pixelsize_nav(ps_dep, ps_arr, t)` — logarithmic zoom interpolation `ps_dep × (ps_arr/ps_dep)^t`
- `interpoler_angle_nav(a, b, t)` — shortest-path angular interpolation (normalises diff to [−π, π])

Do not add fractal definitions to this module. Only add a function here if it is a new mathematical primitive needed by the browser-side navigation/animation system and cannot live in an existing module.

## AI interface files

The following files expose the application as a machine-readable instrument for AI agents. They are committed source (not gitignored) and must be updated manually when capabilities change:

- `public/tools.json` — 8 tool definitions in MCP + OpenAI function-calling format
- `public/ai-manifest.json` — FAIR discovery manifest; entry point for AI agents
- `public/schemas/` — JSON Schema 2020-12 for fractal entries, deeplink params, tool results
- `public/examples/` — example calls and 4-step agent workflow

`public/api/` is **generated** by `scripts/generate_api.py` at CI build time and is gitignored. Do not commit it.

When a new fractal is added or a capability is changed, update `tools.json` and `ai-manifest.json` by hand if the change affects the tool definitions or the manifest’s `fractal_stats` field.

## Editing Notes

- Prefer ASCII in code unless the file already uses accented French text.
- Keep changes consistent with the repository’s existing French terminology.
- `public/main.multi` is overwritten by `compile_wasm.py` (copied from `src/main.multi`). Edit `src/main.multi`.
