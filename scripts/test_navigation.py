#!/usr/bin/env python3
"""Tests for share, rotate, pan, and zoom behaviors in renderer.js and renderer-navigation.js."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
RENDERER_JS = ROOT / "public" / "js" / "renderer.js"
NAV_JS = ROOT / "public" / "js" / "renderer-navigation.js"

_failures: list[str] = []


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    _failures.append(message)


def require(pattern: str, text: str, message: str) -> None:
    if not re.search(pattern, text, re.DOTALL):
        fail(message)


def require_absent(pattern: str, text: str, message: str) -> None:
    if re.search(pattern, text, re.DOTALL):
        fail(message)


# ============================================================
# SHARE
# ============================================================

def check_share(js: str, nav: str) -> None:
    print("  share...")

    require(
        r"export function encoderEtat\(view,\s*params\)\s*\{",
        nav,
        "encoderEtat must be exported from renderer-navigation.js",
    )
    require(
        r"export function decoderEtat\(hash\)\s*\{",
        nav,
        "decoderEtat must be exported from renderer-navigation.js",
    )
    require(
        r'p\.set\("f",\s*params\.fractal\)',
        nav,
        "encoderEtat must encode the fractal name as 'f'",
    )
    require(
        r'p\.set\("x",',
        nav,
        "encoderEtat must encode x coordinate",
    )
    require(
        r'p\.set\("y",',
        nav,
        "encoderEtat must encode y coordinate",
    )
    require(
        r'p\.set\("ps",',
        nav,
        "encoderEtat must encode pixel size as 'ps'",
    )
    require(
        r'p\.set\("i",\s*String\(params\.maxIter\)\)',
        nav,
        "encoderEtat must encode maxIter as 'i'",
    )
    require(
        r'if \(view\.rotation !== 0\)\s*p\.set\("r",',
        nav,
        "encoderEtat must omit rotation when zero and include it when non-zero",
    )
    require(
        r'if \(!FRACTALES_3D\.has\(params\.fractal\)\)',
        nav,
        "encoderEtat must skip view coordinates for 3D fractals",
    )
    require(
        r'rotation:\s*num\("r"\)\s*\?\?\s*0',
        nav,
        "decoderEtat must default rotation to 0 when 'r' is absent",
    )
    require(
        r'if \(etat\.pixelSize !== undefined && \(!isFinite\(etat\.pixelSize\) \|\| etat\.pixelSize <= 0\)\)',
        nav,
        "decoderEtat must reject non-positive pixelSize",
    )
    require(
        r'if \(etat\.maxIter !== undefined && \(!Number\.isInteger\(etat\.maxIter\) \|\| etat\.maxIter < 1\)\)',
        nav,
        "decoderEtat must reject maxIter < 1",
    )
    require(
        r'if \(etat\.centerX !== undefined && !isFinite\(etat\.centerX\)\)',
        nav,
        "decoderEtat must reject non-finite centerX",
    )
    require(
        r'if \(etat\.centerY !== undefined && !isFinite\(etat\.centerY\)\)',
        nav,
        "decoderEtat must reject non-finite centerY",
    )
    require(
        r"export function mettreAJourHash\(view,\s*params\)\s*\{",
        nav,
        "mettreAJourHash must be exported from renderer-navigation.js",
    )
    require(
        r"history\.replaceState\(null,\s*\"\",\s*encoderEtat\(view,\s*params\)\)",
        nav,
        "mettreAJourHash must call history.replaceState with encoderEtat output",
    )
    require(
        r"export function initialiserPartage\(\{",
        nav,
        "initialiserPartage must be exported from renderer-navigation.js",
    )
    require(
        r'document\.getElementById\("btn-partager"\)',
        nav,
        "initialiserPartage must wire to btn-partager",
    )
    require(
        r"navigator\.clipboard\.writeText\(url\)",
        nav,
        "share button must copy URL to clipboard",
    )
    require(
        r"location\.origin \+ location\.pathname \+ encoderEtat\(getView\(\),\s*getParams\(\)\)",
        nav,
        "share URL must include origin, pathname, and encoderEtat output",
    )
    require(
        r"initialiserPartage\(\{\s*getView:\s*\(\)\s*=>\s*view,\s*getParams:\s*\(\)\s*=>\s*params",
        js,
        "renderer.js must initialise share with view and params accessors",
    )


# ============================================================
# ROTATE
# ============================================================

def check_rotate(js: str, nav: str) -> None:
    print("  rotate...")

    require(
        r"rotation:\s*0\.0,",
        js,
        "view object must initialise rotation to 0.0",
    )
    require(
        r'attacherActionControle\(btnRotateLeft,\s*\(\)\s*=>\s*\{\s*if \(!fractaleActiveEst3D\(\)\)\s*\{\s*view\.rotation -= Math\.PI / 36;',
        js,
        "rotate-left button must decrement rotation by π/36",
    )
    require(
        r'attacherActionControle\(btnRotateRight,\s*\(\)\s*=>\s*\{\s*if \(!fractaleActiveEst3D\(\)\)\s*\{\s*view\.rotation \+= Math\.PI / 36;',
        js,
        "rotate-right button must increment rotation by π/36",
    )
    require(
        r'view\.rotation -= Math\.PI / 36;\s*render\(\);\s*mettreAJourHash\(view,\s*params\);',
        js,
        "rotate-left button must update hash after rotation",
    )
    require(
        r'view\.rotation \+= Math\.PI / 36;\s*render\(\);\s*mettreAJourHash\(view,\s*params\);',
        js,
        "rotate-right button must update hash after rotation",
    )
    require(
        r'event\.key === "\[" \|\| event\.key === "BracketLeft"',
        js,
        "[ key must trigger rotate left",
    )
    require(
        r'event\.key === "\]" \|\| event\.key === "BracketRight"',
        js,
        "] key must trigger rotate right",
    )
    require(
        r'event\.key === "\[" \|\| event\.key === "BracketLeft".*?view\.rotation -= Math\.PI / 36',
        js,
        "[ key must decrement rotation by π/36",
    )
    require(
        r'event\.key === "\]" \|\| event\.key === "BracketRight".*?view\.rotation \+= Math\.PI / 36',
        js,
        "] key must increment rotation by π/36",
    )
    require(
        r'if \(!fractaleActiveEst3D\(\)\).*?view\.rotation -= Math\.PI / 36.*?mettreAJourHash',
        js,
        "keyboard rotate-left must update hash",
    )
    require(
        r'if \(!fractaleActiveEst3D\(\)\).*?view\.rotation \+= Math\.PI / 36.*?mettreAJourHash',
        js,
        "keyboard rotate-right must update hash",
    )
    require(
        r"view\.rotation = 0\.0;\s*render\(\);\s*mettreAJourHash",
        js,
        "resetView must reset rotation to 0.0 and update hash",
    )
    require(
        r"const cosR = Math\.cos\(view\.rotation\);\s*const sinR = Math\.sin\(view\.rotation\);",
        js,
        "renderPointFractal must compute cosR/sinR from view.rotation for pixel mapping",
    )
    require(
        r"const cosR = Math\.cos\(renduParams\.rotation \?\? 0\);\s*const sinR = Math\.sin\(renduParams\.rotation \?\? 0\);",
        js,
        "remplirFractalePonctuelle must compute cosR/sinR from renduParams.rotation",
    )
    require(
        r"ddx \* cosR \+ ddy \* sinR",
        js,
        "POINT_FRACTALS must apply rotation matrix when mapping world to pixel coordinates",
    )
    require(
        r"-ddx \* sinR \+ ddy \* cosR",
        js,
        "POINT_FRACTALS pixel-y must apply the inverse rotation component",
    )


# ============================================================
# PAN
# ============================================================

def check_pan(js: str) -> None:
    print("  pan...")

    require(
        r"function deplacerVue\(deltaX,\s*deltaY\)\s*\{",
        js,
        "deplacerVue function must exist",
    )
    require(
        r"view\.centerX \+= deltaX;\s*view\.centerY \+= deltaY;",
        js,
        "deplacerVue must update centerX and centerY directly when no rotation correction applies",
    )
    require(
        r"LINE_FRACTALS\.has\(params\.fractal\) && view\.rotation !== 0",
        js,
        "deplacerVue must apply rotation-corrected pan for LINE_FRACTALS with non-zero rotation",
    )
    require(
        r"view\.centerX \+= deltaX \* cosR - deltaY \* sinR;\s*view\.centerY \+= deltaX \* sinR \+ deltaY \* cosR;",
        js,
        "deplacerVue LINE_FRACTAL branch must rotate the delta by view.rotation to align pan with screen axes",
    )
    require(
        r"(?:function deplacerVue[\s\S]*?)render\(\);\s*mettreAJourHash\(view,\s*params\);",
        js,
        "deplacerVue must call render() and mettreAJourHash after updating the view",
    )
    require(
        r'attacherActionControle\(btnPanUp,\s*\(\)\s*=>\s*\{\s*deplacerVue\(0\.0,\s*-canvas\.height \* view\.pixelSize \* 0\.18\)',
        js,
        "pan-up button must move by 18% of canvas height upward",
    )
    require(
        r'attacherActionControle\(btnPanDown,\s*\(\)\s*=>\s*\{\s*deplacerVue\(0\.0,\s*canvas\.height \* view\.pixelSize \* 0\.18\)',
        js,
        "pan-down button must move by 18% of canvas height downward",
    )
    require(
        r'attacherActionControle\(btnPanLeft,\s*\(\)\s*=>\s*\{\s*deplacerVue\(-canvas\.width \* view\.pixelSize \* 0\.18,\s*0\.0\)',
        js,
        "pan-left button must move by 18% of canvas width leftward",
    )
    require(
        r'attacherActionControle\(btnPanRight,\s*\(\)\s*=>\s*\{\s*deplacerVue\(canvas\.width \* view\.pixelSize \* 0\.18,\s*0\.0\)',
        js,
        "pan-right button must move by 18% of canvas width rightward",
    )
    require(
        r'event\.key === "ArrowUp".*?deplacerVue\(0\.0,\s*-canvas\.height \* view\.pixelSize \* 0\.18\)',
        js,
        "ArrowUp key must pan up by 18% of canvas height",
    )
    require(
        r'event\.key === "ArrowDown".*?deplacerVue\(0\.0,\s*canvas\.height \* view\.pixelSize \* 0\.18\)',
        js,
        "ArrowDown key must pan down by 18% of canvas height",
    )
    require(
        r'event\.key === "ArrowLeft".*?deplacerVue\(-canvas\.width \* view\.pixelSize \* 0\.18,\s*0\.0\)',
        js,
        "ArrowLeft key must pan left by 18% of canvas width",
    )
    require(
        r'event\.key === "ArrowRight".*?deplacerVue\(canvas\.width \* view\.pixelSize \* 0\.18,\s*0\.0\)',
        js,
        "ArrowRight key must pan right by 18% of canvas width",
    )
    require(
        r'canvas\.addEventListener\("pointerdown",',
        js,
        "canvas must listen to pointerdown for drag-pan",
    )
    require(
        r'canvas\.addEventListener\("pointermove",',
        js,
        "canvas must listen to pointermove for drag-pan",
    )
    require(
        r"dragStart = \{ x: e\.offsetX, y: e\.offsetY \}",
        js,
        "pointerdown must record drag start position",
    )
    require(
        r"view\.centerX = dragViewX - dx;\s*view\.centerY = dragViewY - dy;",
        js,
        "pointermove drag must update view center by pixel delta",
    )
    require(
        r'canvas\.addEventListener\("pointerup",\s*\(\)\s*=>\s*\{\s*dragStart = null;',
        js,
        "pointerup must clear dragStart",
    )
    require(
        r'canvas\.addEventListener\("pointerleave",\s*\(\)\s*=>\s*\{\s*dragStart = null;',
        js,
        "pointerleave must clear dragStart to avoid stuck drag state",
    )


# ============================================================
# ZOOM
# ============================================================

def check_zoom(js: str) -> None:
    print("  zoom...")

    require(
        r"function zoomAt\(px,\s*py,\s*factor\)\s*\{",
        js,
        "zoomAt function must exist",
    )
    require(
        r"view\.centerX = re \+ \(view\.centerX - re\) / factor;",
        js,
        "zoomAt must recentre view.centerX around the zoom point",
    )
    require(
        r"view\.centerY = im \+ \(view\.centerY - im\) / factor;",
        js,
        "zoomAt must recentre view.centerY around the zoom point",
    )
    require(
        r"view\.pixelSize /= factor;",
        js,
        "zoomAt must divide pixelSize by factor",
    )
    require(
        r"view\.pixelSize /= factor;\s*render\(\);\s*mettreAJourHash\(view,\s*params\);",
        js,
        "zoomAt must render and update hash after zooming",
    )
    require(
        r"function zoomerCentre\(factor\)\s*\{(?:(?!function).)*?zoomAt\(canvas\.width / 2,\s*canvas\.height / 2,\s*factor\)",
        js,
        "zoomerCentre must call zoomAt at the canvas centre",
    )
    require(
        r'attacherActionControle\(btnZoomIn,\s*\(\)\s*=>\s*\{\s*zoomerCentre\(1\.5\)',
        js,
        "zoom-in button must call zoomerCentre(1.5)",
    )
    require(
        r'attacherActionControle\(btnZoomOut,\s*\(\)\s*=>\s*\{\s*zoomerCentre\(1 / 1\.5\)',
        js,
        "zoom-out button must call zoomerCentre(1/1.5)",
    )
    require(
        r'event\.key === "\+" \|\| event\.key === "=" \|\| event\.code === "NumpadAdd".*?zoomerCentre\(1\.5\)',
        js,
        "+/= key must zoom in by 1.5×",
    )
    require(
        r'event\.key === "-" \|\| event\.key === "_" \|\| event\.code === "NumpadSubtract".*?zoomerCentre\(1 / 1\.5\)',
        js,
        "-/_ key must zoom out by 1/1.5×",
    )
    require(
        r'canvas\.addEventListener\("click",',
        js,
        "canvas must handle click for zoom ×2",
    )
    require(
        r"zoomAt\(e\.offsetX,\s*e\.offsetY,\s*2\)",
        js,
        "click must zoom ×2 at the click point",
    )
    require(
        r'canvas\.addEventListener\("dblclick",',
        js,
        "canvas must handle dblclick for zoom ×0.5",
    )
    require(
        r"zoomAt\(e\.offsetX,\s*e\.offsetY,\s*0\.5\)",
        js,
        "dblclick must zoom ×0.5 (dezoom) at the click point",
    )
    require(
        r'canvas\.addEventListener\("wheel",',
        js,
        "canvas must handle wheel for scroll zoom",
    )
    require(
        r"const factor = e\.deltaY < 0 \? 1\.5 : 1 / 1\.5;\s*zoomAt\(e\.offsetX,\s*e\.offsetY,\s*factor\)",
        js,
        "wheel scroll must zoom in (1.5×) or out (1/1.5×) at cursor position",
    )
    require(
        r'canvas\.addEventListener\("touchmove",',
        js,
        "canvas must handle touchmove for pinch zoom",
    )
    require(
        r"const factor = dist / lastPinchDist;\s*(?:(?!function).)*?zoomAt\(midX,\s*midY,\s*factor\)",
        js,
        "pinch gesture must zoom at the midpoint between two fingers",
    )
    require(
        r'canvas\.addEventListener\("touchend",\s*\(\)\s*=>\s*\{\s*lastPinchDist = null;',
        js,
        "touchend must reset pinch distance",
    )


# ============================================================
# MAIN
# ============================================================

def main() -> None:
    print("Running share/rotate/pan/zoom tests...")
    js = RENDERER_JS.read_text(encoding="utf-8")
    nav = NAV_JS.read_text(encoding="utf-8")

    check_share(js, nav)
    check_rotate(js, nav)
    check_pan(js)
    check_zoom(js)

    if _failures:
        print(f"\n{len(_failures)} test(s) failed.", file=sys.stderr)
        raise SystemExit(1)
    print(f"All tests passed.")


if __name__ == "__main__":
    main()
