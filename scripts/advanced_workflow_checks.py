#!/usr/bin/env python3
"""Static checks for advanced formula and L-system studio wiring."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "public" / "index.html"
EXPLORATION_JS = ROOT / "public" / "js" / "renderer-exploration.js"
FORMULE_JS = ROOT / "public" / "js" / "renderer-formule.js"
LSYSTEM_JS = ROOT / "public" / "js" / "renderer-lsystem.js"
NAVIGATION_JS = ROOT / "public" / "js" / "renderer-navigation.js"


def fail(message: str) -> None:
    print(f"[advanced-workflow] FAIL: {message}")
    raise SystemExit(1)


def require(pattern: str, text: str, message: str) -> None:
    if not re.search(pattern, text, re.DOTALL):
        fail(message)


def require_block(text: str, start: str, end: str, pattern: str, message: str) -> None:
    try:
        start_index = text.index(start)
        end_index = text.index(end, start_index)
    except ValueError:
        fail(message)
    require(pattern, text[start_index:end_index], message)


def ids_from_html(html: str) -> set[str]:
    return set(re.findall(r'id="([^"]+)"', html))


def main() -> None:
    print("[advanced-workflow] running checks...")
    html = INDEX_HTML.read_text(encoding="utf-8")
    exploration = EXPLORATION_JS.read_text(encoding="utf-8")
    formule = FORMULE_JS.read_text(encoding="utf-8")
    lsystem = LSYSTEM_JS.read_text(encoding="utf-8")
    navigation = NAVIGATION_JS.read_text(encoding="utf-8")
    html_ids = ids_from_html(html)

    required_studio_ids = {
        "lsystem-preset-select",
        "lsystem-generation-slider",
        "lsystem-angle-input",
        "lsystem-axiom-input",
        "lsystem-rules-input",
        "lsystem-seed-input",
        "lsystem-stroke-width-slider",
        "lsystem-proposal-canvas",
        "lsystem-proposal-readout",
        "lsystem-string-preview",
        "lsystem-save-name",
        "lsystem-save-list",
        "formule-preset-select",
        "formule-mode-select",
        "formule-iteration-input",
        "formule-escape-radius-input",
        "formule-param-a-input",
        "formule-param-b-input",
        "formule-param-a-label",
        "formule-param-b-label",
        "formule-param-a-value",
        "formule-param-b-value",
        "formule-proposal-canvas",
        "formule-proposal-readout",
        "btn-formule-manifest",
        "formule-save-name",
        "formule-save-list",
    }
    missing = sorted(required_studio_ids - html_ids)
    if missing:
        fail(f"missing advanced studio DOM ids: {missing}")

    formula_select = re.search(r'id="formule-preset-select".*?</select>', html, re.DOTALL)
    lsystem_select = re.search(r'id="lsystem-preset-select".*?</select>', html, re.DOTALL)
    if not formula_select or not lsystem_select:
        fail("missing formula or L-system preset select")

    formula_options = set(re.findall(r'<option value="([^"]+)">[^<]+</option>', formula_select.group(0)))
    formula_presets = set(re.findall(r'^\s{2}([a-z_]+):\s*\{ formule:', exploration, re.MULTILINE))
    if formula_options - {""} != formula_presets:
        fail(f"formula preset mismatch: html={sorted(formula_options)} js={sorted(formula_presets)}")

    lsystem_options = set(re.findall(r'<option value="([^"]+)">[^<]+</option>', lsystem_select.group(0))) - {""}
    lsystem_presets = set(re.findall(r'^\s{2}([a-z_]+):\s*\{ axiome:', exploration, re.MULTILINE))
    if lsystem_options != lsystem_presets:
        fail(f"L-system preset mismatch: html={sorted(lsystem_options)} js={sorted(lsystem_presets)}")

    require(r"export function analyserFormule", formule, "formula analyzer must be exported")
    require(r"analyserFormule\?\.\(prop\.formule\)", exploration, "formula studio must use analyzer diagnostics")
    require(r"PARAMETRES_FORMULE_DEFAUT", exploration, "formula studio must define default parameter metadata")
    require(r"appliquerParametresFormulePreset", exploration, "formula studio must apply named preset parameters")
    require(r"creerManifesteFormule", exploration, "formula studio must expose a promotion manifest")
    require(r"nom:\s*\"amplitude sinus\"", exploration, "formula presets must expose French parameter labels")
    require_block(
        exploration,
        'document.getElementById("lsystem-preset-select")',
        'document.getElementById("btn-lsystem-apply")',
        r'const\s+strokeInput\s*=\s*document\.getElementById\("lsystem-stroke-width-slider"\)',
        "L-system preset handler must declare strokeInput before using it",
    )
    require_block(
        exploration,
        'document.getElementById("formule-preset-select")',
        'document.getElementById("btn-formule-apply")',
        r"appliquerParametresFormulePreset\(preset,\s*true\).*updateFormuleProposal\(\)",
        "formula preset handler must update named parameters and preview",
    )
    require(r"z absent.*c absent", formule, "formula analyzer must warn about missing z/c variables")
    require(r"symboles: \[\.\.\.symboles\]\.sort\(\)", lsystem, "L-system diagnostics must expose used symbols")
    require(r"fusionnerSauvegarde", exploration, "saved formulas/grammars must dedupe by name")

    for field in ["ffi", "ffe", "ffm", "ffa", "ffb", "lax", "lr", "ls", "lsw"]:
        decoded = f'p.get("{field}")' in navigation or f'num("{field}")' in navigation or f'ent("{field}")' in navigation
        if f'p.set("{field}"' not in navigation or not decoded:
            fail(f"deeplink field {field} must round-trip through renderer-navigation.js")

    print("[advanced-workflow] all checks passed")


if __name__ == "__main__":
    main()
