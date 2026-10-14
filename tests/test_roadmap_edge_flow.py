"""首页路线图连线的流动特效：叠加虚线副本 + CSS 推进 dashoffset。"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_JS = ROOT / "assets" / "js" / "mermaid-config.js"
ZOOM_JS = ROOT / "assets" / "js" / "mermaid-zoom.js"
LAYOUT = ROOT / "_layouts" / "default.html"
STYLE = ROOT / "assets" / "css" / "style.css"


def _rule(selector_head: str) -> str:
    """Return the declaration block of the first rule whose selector list starts here."""
    text = STYLE.read_text(encoding="utf-8")
    match = re.search(
        r"(?m)^" + re.escape(selector_head) + r"[^{]*\{(.*?)^\}",
        text,
        re.DOTALL,
    )
    assert match, f"rule starting with {selector_head} not found"
    return match.group(1)


def test_overlay_helper_keeps_base_edge_intact():
    text = CONFIG_JS.read_text(encoding="utf-8")
    assert "window.attachRoadmapEdgeFlow" in text
    # The overlay is a copy of the edge, so the solid base line stays visible…
    assert "cloneNode(false)" in text
    # …and the arrowhead must not be drawn twice.
    assert "removeAttribute('marker-end')" in text
    assert "removeAttribute('marker-start')" in text
    # Re-running (lang switch / lightbox) must not stack overlays.
    assert "data-roadmap-flow-done" in text


def test_overlay_is_attached_after_every_roadmap_insert():
    layout = LAYOUT.read_text(encoding="utf-8")
    assert "window.attachRoadmapEdgeFlow(mermaidRoadmap)" in layout
    # Inside finishRoadmapInsert, which runs for both fresh renders and cache hits.
    block = re.search(
        r"function finishRoadmapInsert\(mermaidRoadmap\) \{(.*?)\n      \}",
        layout,
        re.DOTALL,
    )
    assert block and "attachRoadmapEdgeFlow" in block.group(1)

    zoom = ZOOM_JS.read_text(encoding="utf-8")
    assert "window.attachRoadmapEdgeFlow(stage)" in zoom


def test_flow_animation_loops_seamlessly():
    """dasharray 之和必须等于起始 dashoffset，否则每轮循环会跳一下。"""
    for selector, keyframes in (
        ("#roadmap-mermaid .roadmap-edge-flow,", "roadmap-edge-flow"),
        (
            "#roadmap-mermaid .roadmap-edge-flow.edge-pattern-dotted,",
            "roadmap-edge-flow-dotted",
        ),
    ):
        block = _rule(selector)
        dash = re.search(r"stroke-dasharray:\s*(\d+)\s+(\d+)", block)
        offset = re.search(r"stroke-dashoffset:\s*(\d+)", block)
        assert dash and offset, f"{selector} missing dash pattern"
        assert int(dash.group(1)) + int(dash.group(2)) == int(offset.group(1))

        frames = re.search(
            r"(?m)^@keyframes " + keyframes + r"\s*\{(.*?)^\}",
            STYLE.read_text(encoding="utf-8"),
            re.DOTALL,
        )
        assert frames, f"@keyframes {keyframes} not found"
        # Positive offset -> 0 marches the dashes toward the arrowhead.
        assert "from { stroke-dashoffset: " + offset.group(1) in frames.group(1)
        assert "to { stroke-dashoffset: 0" in frames.group(1)


def test_flow_overlay_never_blocks_node_clicks():
    block = _rule("#roadmap-mermaid .roadmap-edge-flow,")
    assert "pointer-events: none" in block


def test_flow_respects_reduced_motion():
    text = STYLE.read_text(encoding="utf-8")
    match = re.search(
        r"@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*#roadmap-mermaid "
        r"\.roadmap-edge-flow,(.*?)\n\}",
        text,
        re.DOTALL,
    )
    assert match, "reduced-motion override for the roadmap flow not found"
    assert "animation: none" in match.group(1)


def test_flow_colour_is_themed():
    text = STYLE.read_text(encoding="utf-8")
    assert text.count("--roadmap-flow:") == 2, "need a dark and a light token"
    assert "stroke: var(--roadmap-flow" in text


def test_flow_pauses_when_roadmap_is_off_screen():
    """dashoffset 动画每帧重绘整张图，滚出屏幕也不会自己停。"""
    text = CONFIG_JS.read_text(encoding="utf-8")
    assert "IntersectionObserver" in text
    assert "roadmap-flow-offscreen" in text
    helper = re.search(
        r"window\.attachRoadmapEdgeFlow = function \(container\) \{(.*?)\n  \};",
        text,
        re.DOTALL,
    )
    assert helper and "pauseRoadmapFlowOffscreen(container)" in helper.group(1)

    block = _rule("#roadmap-mermaid.roadmap-flow-offscreen .roadmap-edge-flow,")
    assert "animation-play-state: paused" in block


def test_flow_pauses_under_and_while_moving_the_lightbox():
    text = STYLE.read_text(encoding="utf-8")
    match = re.search(
        r"(?m)^#roadmap-mermaid\.roadmap-flow-offscreen \.roadmap-edge-flow,(.*?)\{",
        text,
        re.DOTALL,
    )
    assert match
    selectors = match.group(1)
    # The inline map keeps animating under the open lightbox otherwise.
    assert "body.mermaid-lightbox-open #roadmap-mermaid .roadmap-edge-flow" in selectors
    # Pan / pinch should only move the composited stage, not repaint it.
    assert ".mermaid-lightbox__viewport.is-dragging .roadmap-edge-flow" in selectors
    assert ".mermaid-lightbox__viewport.is-pinching .roadmap-edge-flow" in selectors


def test_flow_is_quantised_on_touch_screens():
    """触屏上用 steps() 把每帧重绘降到约 12.5 帧/秒。"""
    text = STYLE.read_text(encoding="utf-8")
    match = re.search(
        r"@media \(max-width: 600px\), \(hover: none\) and \(pointer: coarse\) \{"
        r"(.*?)\n\}",
        text,
        re.DOTALL,
    )
    assert match, "touch-screen override for the roadmap flow not found"
    body = match.group(1)
    for selector, duration in (
        ("#roadmap-mermaid .roadmap-edge-flow,", 2.4),
        ("#roadmap-mermaid .roadmap-edge-flow.edge-pattern-dotted,", 3.2),
    ):
        rule = re.search(re.escape(selector) + r"[^{]*\{([^}]*)\}", body)
        assert rule, selector
        steps = re.search(r"steps\((\d+)\)", rule.group(1))
        assert steps, selector
        # ~80 ms per step: still smooth for a few px/s of motion, far fewer repaints.
        assert abs(duration / int(steps.group(1)) - 0.08) < 1e-9
