"""Sidebar TOC and shared KaTeX helpers must typeset formulas outside #paper-body."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "_layouts" / "default.html").read_text(encoding="utf-8")
PAPER_JS = (ROOT / "assets" / "js" / "paper.js").read_text(encoding="utf-8")
STYLE_CSS = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")


def test_render_katex_in_is_exported_for_extra_containers():
    assert "window.renderKaTeXIn = function renderKaTeXIn(container)" in LAYOUT
    assert "document.dispatchEvent(new CustomEvent('katex-ready'));" in LAYOUT


def test_paper_toc_clones_or_renders_katex():
    assert "function fillTocLink(a, h)" in PAPER_JS
    assert "h.querySelector('.katex, .katex-mathml')" in PAPER_JS
    assert "a.innerHTML = h.innerHTML" in PAPER_JS
    assert "window.renderKaTeXIn(nav)" in PAPER_JS
    assert "window.initKaTeX()" in PAPER_JS
    assert "document.addEventListener('katex-ready'" in PAPER_JS


def test_toc_link_katex_has_styles():
    assert ".toc-link .katex" in STYLE_CSS
