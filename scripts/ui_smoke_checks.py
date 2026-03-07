#!/usr/bin/env python3
"""Lightweight UI smoke checks for DOM ids and key event wiring."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "public" / "index.html"
RENDERER_JS = ROOT / "public" / "js" / "renderer.js"


def fail(message: str) -> None:
    print(f"[ui-smoke] FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def require(pattern: str, text: str, message: str) -> None:
    if not re.search(pattern, text, re.DOTALL):
        fail(message)


def main() -> None:
    print("[ui-smoke] running checks...")
    html = INDEX_HTML.read_text(encoding="utf-8")
    js = RENDERER_JS.read_text(encoding="utf-8")

    required_ids = [
        "fractal-canvas",
        "btn-reset",
        "btn-pan-up",
        "btn-pan-down",
        "btn-pan-left",
        "btn-pan-right",
        "family-select",
        "fractal-select",
        "btn-toggle-pan",
        "pan-controls",
    ]
    for element_id in required_ids:
        if f'id="{element_id}"' not in html:
            fail(f"missing required HTML id: {element_id}")

    required_dom_refs = [
        "btnPanUp",
        "btnPanDown",
        "btnPanLeft",
        "btnPanRight",
        "btnReset",
        "familySelect",
        "fractalSelect",
    ]
    for ref_name in required_dom_refs:
        require(
            rf"const\s+{ref_name}\s*=\s*document\.getElementById\(",
            js,
            f"missing DOM lookup for {ref_name}",
        )

    require(
        r"function deplacerVue\(deltaX,\s*deltaY\)\s*\{\s*view\.centerX \+= deltaX;\s*view\.centerY \+= deltaY;\s*render\(\);",
        js,
        "deplacerVue must update the view and trigger render()",
    )

    button_expectations = {
        "btnPanUp": r'btnPanUp\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*deplacerVue\(0\.0,\s*-canvas\.height \* view\.pixelSize \* 0\.18\);',
        "btnPanDown": r'btnPanDown\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*deplacerVue\(0\.0,\s*canvas\.height \* view\.pixelSize \* 0\.18\);',
        "btnPanLeft": r'btnPanLeft\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*deplacerVue\(-canvas\.width \* view\.pixelSize \* 0\.18,\s*0\.0\);',
        "btnPanRight": r'btnPanRight\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*deplacerVue\(canvas\.width \* view\.pixelSize \* 0\.18,\s*0\.0\);',
        "btnReset": r'btnReset\.addEventListener\("click",\s*resetView\);',
        "familySelect": r'familySelect\.addEventListener\("change",\s*\(\)\s*=>\s*\{\s*const fractale = populateFractalSelect\(familySelect\.value,\s*null\);\s*setActiveFractal\(fractale\);',
        "fractalSelect": r'fractalSelect\.addEventListener\("change",\s*\(\)\s*=>\s*\{\s*setActiveFractal\(fractalSelect\.value\);',
    }
    for name, pattern in button_expectations.items():
        require(pattern, js, f"missing expected event wiring for {name}")

    require(
        r"let renderToken = 0;",
        js,
        "renderToken guard is required to avoid dropped UI actions during active renders",
    )
    require(
        r"function render\(\)\s*\{\s*const token = \+\+renderToken;",
        js,
        "render() must invalidate in-flight renders with renderToken",
    )
    require(
        r"function renderPointFractal\(.*?token.*?\)\s*\{",
        js,
        "point rendering must receive the render token",
    )

    print("[ui-smoke] all checks passed")


if __name__ == "__main__":
    main()
