# Vendored process runtime

`process_core.js` is the **modality-free stepper** for `semantic-core-v1` — the
runtime of multilingual's polymodal / process-calculus layer (v0.8.1). It is
*not* hand-written here: it is a verbatim copy of the language's own JS port,
which is byte-for-byte equivalent to the Python engine in
`multilingualprogramming/codegen/process_core.py`.

We vendor rather than reimplement on purpose. The stepper is the language's
runtime, must stay bit-identical to the Python authority, and reimplementing it
in `.multi` → WASM would be a fork that has to track upstream forever. The
projection math fractales *adds* (e.g. the volumetric `(x,y,z) → (sx,sy,depth)`
mapping) does live in `.multi`; only this shared engine is vendored.

## Provenance

- Upstream: `multilingual/docs/browser/process-dynamics/process_core.js`
- Pinned multilingual version: **0.8.1**
- Integrity: `process_core.js.sha256` records the expected SHA-256.
  `scripts/integration_checks.py` fails the build if the file drifts from this
  hash, so a silent divergence from the language runtime cannot ship.

To intentionally upgrade: re-copy the upstream file and regenerate the hash with
`sha256sum public/js/process/process_core.js | cut -d' ' -f1 > public/js/process/process_core.js.sha256`.
