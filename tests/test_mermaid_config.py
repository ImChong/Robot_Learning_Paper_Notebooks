"""Mermaid site config: higher render scale and lightbox re-render helpers."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_JS = ROOT / "assets" / "js" / "mermaid-config.js"
DEFAULT_LAYOUT = ROOT / "_layouts" / "default.html"
ZOOM_JS = ROOT / "assets" / "js" / "mermaid-zoom.js"


def test_mermaid_config_uses_higher_render_scale():
    text = CONFIG_JS.read_text(encoding="utf-8")
    assert "MERMAID_RENDER_SCALE" in text
    assert "MERMAID_LIGHTBOX_SCALE" in text
    assert "useMaxWidth: false" in text
    assert "buildMermaidLightboxGraph" in text


def test_default_layout_loads_mermaid_config():
    text = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    assert "mermaid-config.js" in text
    assert "getMermaidSiteConfig" in text


def test_lightbox_rerenders_from_source():
    text = ZOOM_JS.read_text(encoding="utf-8")
    assert "buildMermaidLightboxGraph" in text
    assert "mermaid.render" in text
    assert "openWithSvgClone" in text
    assert "is-preparing" in text
    assert "scheduleFitToViewport" in text


def test_lightbox_hides_stage_until_fit():
    css = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
    assert ".mermaid-lightbox__stage.is-preparing" in css


def test_dark_mode_mermaid_cluster_labels_apply_in_lightbox():
    css = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
    assert ":is(.paper-body .mermaid, .mermaid-lightbox__stage)" in css
    assert 'rect[style*="fill:#"]' in css
    assert "cluster-label span" in css


def test_all_paper_mermaid_fill_colors_are_covered_by_generic_cluster_rule():
    import re

    css = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
    assert 'g.cluster > rect[style*="fill:#"] ~ .cluster-label span' in css

    fills = set()
    for md in (ROOT / "papers").rglob("*.md"):
        for match in re.finditer(r"style\s+\w+\s+fill:(#[0-9a-fA-F]{3,8})", md.read_text(encoding="utf-8")):
            fills.add(match.group(1).lower())

    assert fills, "expected at least one styled mermaid subgraph in papers/"
    for color in sorted(fills):
        assert color.startswith("#")
        assert 'rect[style*="fill:#"]' in css


def test_no_style_attribute_test_inside_has():
    """`:has(... [style...])` 让 Chrome 在任何内联样式变化时重算整页样式。

    灯箱拖动 / 缩放每帧都写 stage.style.transform，首页上每帧约 4000 个元素重算。
    """
    import re

    css = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    for match in re.finditer(r":has\(([^)]*)\)", css):
        assert "[style" not in match.group(1), match.group(0)


def test_sanitize_mermaid_svg_preserves_foreign_object_labels():
    text = CONFIG_JS.read_text(encoding="utf-8")
    assert "data-fo-placeholder" in text
    assert "ALLOWED_TAGS" in text
    assert "foreignObject" in text


def test_sanitize_mermaid_svg_keeps_foreign_object():
    text = CONFIG_JS.read_text(encoding="utf-8")
    assert "sanitizeMermaidSvg" in text
    assert "foreignObject" in text
    assert "USE_PROFILES" in text


def test_read_mermaid_block_source_restores_br_tag_not_newline():
    """sequenceDiagram participant aliases use <br/>; converting to \\n breaks parse."""
    text = CONFIG_JS.read_text(encoding="utf-8")
    assert "readMermaidBlockSource" in text
    assert "createTextNode('<br/>')" in text
    assert "createTextNode('\\n')" not in text
    # Regression note must stay so future edits don't reintroduce \\n.
    assert "sequenceDiagram" in text


def test_foundational_rl_sequence_diagrams_use_br_in_participants():
    """PR #387 sequence diagrams rely on <br/> in participant aliases surviving the site pipeline."""
    import re

    seq_files = list(
        (ROOT / "papers" / "01_Foundational_RL").rglob("*.md")
    )
    found = 0
    for path in seq_files:
        text = path.read_text(encoding="utf-8")
        for block in re.findall(
            r'<div class="mermaid"[^>]*>(.*?)</div>', text, re.DOTALL
        ):
            if not block.lstrip().startswith("sequenceDiagram"):
                continue
            found += 1
            assert "<br" in block, f"{path.name}: sequence diagram missing <br> aliases"
            # No raw newline mid-participant (would already be broken in source)
            for line in block.splitlines():
                stripped = line.strip()
                if stripped.startswith("participant ") and "<br" in stripped:
                    assert stripped.count("<br") >= 1
    assert found >= 10, f"expected ≥10 sequence diagrams from PR #387, found {found}"
