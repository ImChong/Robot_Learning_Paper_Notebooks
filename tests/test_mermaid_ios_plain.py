"""Tests for the iOS Mermaid math strategy (native MathML + plain-text kill-switch)."""

from pathlib import Path

from scripts.adapt_mermaid_blocks import escape_pipes_in_node_labels

# iOS WebKit paints foreignObject content that gets its own compositing layer
# (opacity, filters, scroll containers, position offsets) at the SVG origin.
# KaTeX's HTML output relies on position:relative offsets, so Mermaid math on
# iOS renders as native MathML instead (forceLegacyMathML: false) and the
# lightbox sanitizer must let MathML through. The old plain-text downgrade
# (mermaidMathToPlain) stays in the bundle as a kill-switch: flipping
# shouldUsePlainMermaidMath back to `return isIos();` restores it.


def _ppo_full_flowchart_block() -> str:
    path = Path(
        "papers/01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.md"
    )
    text = path.read_text(encoding="utf-8")
    # 这节现在位于折叠块内，标题写成原生 HTML（见 tests/test_paper_note_folds.py）。
    start = text.index("完整流程图</h3>")
    end = text.index("<h3 ", start + 1)
    return text[start:end]


def test_ppo_full_flowchart_keeps_katex_math_in_source():
    block = _ppo_full_flowchart_block()
    assert "$$" in block, "完整流程图源码应保留 $$..$$ KaTeX 公式（iOS 由 Mermaid 渲染为原生 MathML）"
    assert r"\hat{A}_t" in block
    assert r"\pi _ {\theta _ {old}}" in block


def test_ios_mathml_strategy_wired_in_config():
    config_js = Path("assets/js/mermaid-config.js").read_text(encoding="utf-8")
    # iOS renders math as native MathML; other platforms keep KaTeX HTML.
    assert "forceLegacyMathML: !ios" in config_js
    # The lightbox sanitizer must not strip MathML out of foreignObject.
    assert "mathMl: true" in config_js
    assert "'semantics', 'annotation'" in config_js


def test_plain_text_kill_switch_retained():
    config_js = Path("assets/js/mermaid-config.js").read_text(encoding="utf-8")
    assert "prepareMermaidRenderSource" in config_js
    assert "shouldUsePlainMermaidMath" in config_js
    # Plain-text replacements for the PPO flowchart formulas stay available.
    assert "mermaidMathToPlain" in config_js
    assert r"\\hat\{A\}_t" in config_js
    assert "L\\^\\{CLIP\\}" in config_js


def test_ios_css_does_not_blank_mathml_output():
    css = Path("assets/css/style.css").read_text(encoding="utf-8")
    # Regression guard: with output:'mathml' the whole formula lives inside
    # .katex — hiding it on iOS would blank every Mermaid formula.
    assert (
        "html.ios .paper-body .mermaid foreignObject .katex-display,\n"
        "html.ios .paper-body .mermaid foreignObject .katex {" not in css
    )
    # Dual-output safety net: hide the layer-creating HTML half, surface the
    # MathML copy without absolute positioning.
    assert "foreignObject .katex-html" in css
    assert "position: static !important" in css


def test_ios_edge_label_width_is_intrinsic():
    css = Path("assets/css/style.css").read_text(encoding="utf-8")
    # WebKit resolves percentage widths inside foreignObject against the SVG
    # viewport, so the mobile `width: 100%` rule stretches short edge labels
    # (是/否) into diagram-wide bars on iOS. Intrinsic sizing avoids the
    # containing-block resolution entirely.
    idx = css.index("html.ios .paper-body .mermaid foreignObject .labelBkg")
    assert "width: fit-content !important" in css[idx : idx + 400]


def test_escape_pipes_still_works():
    src = 'R["pi(a|s)"]'
    out = escape_pipes_in_node_labels(src)
    assert "#124;" in out
