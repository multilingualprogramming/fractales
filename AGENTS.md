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
- Browser-side helpers in `renderer.js` are acceptable for drawing/export support, but the main fractal definition should still exist in French multilingual source.

## Verification

Run these checks after meaningful changes:

```powershell
node --check public\js\renderer.js
python scripts\compile_wasm.py
python scripts\integration_checks.py
python scripts\ui_smoke_checks.py
```

## Editing Notes

- Prefer ASCII in code unless the file already uses accented French text.
- Keep changes consistent with the repository’s existing French terminology.
