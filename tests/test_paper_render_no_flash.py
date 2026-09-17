"""Regression: a reload must not paint the half-built paper page.

A paper page is painted long before its markup is finished — KaTeX turns
``$…$`` into math, mermaid turns diagram sources into SVG, paper.js builds the
TOC, wraps tables and renumbers code blocks. All of it landed *after* the first
paint, and the math pass was additionally chained behind every diagram, so a
reload showed raw ``$\\delta_t = …$`` / ``graph TD`` text for seconds before
snapping into place.

The fix has three parts, each pinned below:
  1. #paper-body is held back (``visibility``, so the layout is unchanged)
     until the post-parse pass has run, with a watchdog that always reveals it.
  2. The math pass runs on DOMContentLoaded, independent of the diagrams.
  3. Diagram rendering is scheduled after the first revealed frame instead of
     blocking parsing / DOMContentLoaded from inside initMermaid().
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "_layouts/default.html").read_text(encoding="utf-8")


def _head() -> str:
    return LAYOUT.split("</head>", 1)[0]


def test_paper_body_is_gated_before_the_first_paint():
    head = _head()
    # Hidden, not removed: the box keeps its place so nothing jumps and
    # #hash anchors still resolve.
    assert "html.paper-pending #paper-body { visibility: hidden; }" in head
    assert "root.classList.add('paper-pending')" in head


def test_unrendered_diagram_sources_are_hidden_too():
    assert (
        "html:not(.mermaid-unavailable)\n"
        "      .paper-body .mermaid:not(.mermaid-unrendered):not(:has(svg))"
        " { visibility: hidden; }" in _head()
    )


def test_a_diagram_that_never_renders_shows_its_source_again():
    # mermaid.run() can reject (bad syntax); the block must not be left blank
    # behind its placeholder.
    assert "Promise.all([paperRun, roadmapRun]).then(finishMermaidRun, finishMermaidRun);" in LAYOUT
    assert "if (!el.querySelector('svg')) el.classList.add('mermaid-unrendered');" in LAYOUT
    # ... and the marker is cleared when the block is re-rendered (theme swap).
    assert "el.classList.remove('mermaid-unrendered');" in LAYOUT


def test_reveal_is_idempotent_and_watchdogged():
    head = _head()
    assert "window.revealPaperBody = function revealPaperBody()" in head
    assert "if (revealed) return;" in head
    # A dead CDN must degrade to the raw source, never to a blank page.
    assert "setTimeout(window.revealPaperBody, REVEAL_TIMEOUT_MS);" in head


def test_missing_mermaid_restores_the_raw_diagram_source():
    assert "document.documentElement.classList.add('mermaid-unavailable');" in LAYOUT


def test_math_does_not_wait_for_the_diagrams():
    # The old code skipped initKaTeX() entirely when the page had a diagram
    # and left the math to initMermaid()'s promise chain.
    assert "hasMermaid" not in LAYOUT
    katex_init = LAYOUT.split('document.addEventListener("DOMContentLoaded"', 1)[1]
    assert "if (!window.initKaTeX()) {" in katex_init
    # Revealed from a fresh task, so paper.js and the demo bundles (whose
    # DOMContentLoaded listeners are registered later) have already run.
    assert "setTimeout(window.revealPaperBody, 0);" in katex_init


def test_diagram_rendering_is_scheduled_off_the_parse_path():
    assert "scheduleMermaidRun();" in LAYOUT
    assert "if (mermaidRunPending) return;" in LAYOUT
    assert "whenParsed(function () {" in LAYOUT
    assert "requestAnimationFrame(function () {" in LAYOUT
    # mermaid.initialize() stays synchronous: renderRoadmapMermaid() checks
    # window.roadmapMermaidConfigured before it renders.
    init_body = LAYOUT.split("function initMermaid(theme) {", 1)[1].split(
        "function scheduleMermaidRun", 1
    )[0]
    assert "mermaid.initialize(config);" in init_body
    assert "window.roadmapMermaidConfigured = true;" in init_body
    assert "mermaid.run(" not in init_body
