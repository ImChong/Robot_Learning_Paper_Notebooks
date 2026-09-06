"""Floating FABs must lift above .site-footer instead of covering it."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STYLE = ROOT / "assets" / "css" / "style.css"
LAYOUT = ROOT / "_layouts" / "default.html"

FAB_BOTTOM = "bottom: var(--fab-bottom, 24px);"


def _rule(selector: str) -> str:
    text = STYLE.read_text(encoding="utf-8")
    match = re.search(
        r"(?m)^\s*" + re.escape(selector) + r"\s*\{(.*?)^\}",
        text,
        re.DOTALL,
    )
    assert match, f"rule {selector} not found"
    return match.group(1)


def test_fab_bottom_variable_has_default():
    assert "--fab-bottom: 24px;" in _rule(":root")


def test_both_fabs_read_the_shared_bottom_variable():
    # Both sides must use the identical expression, or the mirror breaks
    # as soon as the footer pushes one of them up.
    assert FAB_BOTTOM in _rule(".sidebar-toggle")
    assert FAB_BOTTOM in _rule(".back-to-top")


def test_layout_lifts_fabs_by_footer_height():
    layout = LAYOUT.read_text(encoding="utf-8")
    assert "document.querySelector('.site-footer')" in layout
    assert "window.innerHeight - rect.top" in layout
    assert "setProperty('--fab-bottom'" in layout
    # Scroll/resize driven, so the offset tracks the footer as it appears.
    assert "window.addEventListener('scroll', onScroll, { passive: true });" in layout
    assert "window.addEventListener('resize', onScroll, { passive: true });" in layout
