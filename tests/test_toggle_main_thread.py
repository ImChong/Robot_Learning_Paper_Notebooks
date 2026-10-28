"""Theme and language toggles must not freeze a phone.

Measured in Chromium with an iPhone viewport at 6x CPU throttling before the fix:
the first theme switch on the home page blocked the main thread for 6.6 s and the
first language switch for 4.9 s, almost all of it mermaid redrawing the roadmap
inside its folded <details>; a theme switch on the PPO note took 24 s, because
its 14 diagrams were redrawn in one task and every demo redraw forced a layout
while 4000+ per-node colour transitions were running (see test_design_tokens).
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "_layouts" / "default.html").read_text(encoding="utf-8")
ROADMAP_JS = (ROOT / "assets" / "js" / "roadmap.js").read_text(encoding="utf-8")
APPLY_LANG = LAYOUT.split("function applyLang(mode) {", 1)[1].split("function toggleLang()", 1)[0]
RUN_MERMAID = LAYOUT.split("function runMermaid() {", 1)[1].split("function finishMermaidRun()", 1)[0]


def test_roadmap_is_not_a_mermaid_diagram_any_more():
    # The roadmap used to be one mermaid graph redrawn on every theme and
    # language switch. It is plain HTML now (_includes/roadmap-tree.html), and
    # a language switch only swaps text.
    assert "renderRoadmapMermaid" not in LAYOUT
    assert "roadmapGraphs" not in LAYOUT
    assert "Roadmap" not in APPLY_LANG and "roadmap" not in APPLY_LANG


def test_folded_roadmap_draws_nothing():
    # Nobody can see the roadmap while its fold is closed: its connectors are
    # drawn when the fold opens, and only for the branch on screen.
    draw = ROADMAP_JS.split("function draw(branch) {", 1)[1].split("\n  }\n", 1)[0]
    assert "if (!branch || branch.panel.hidden || (fold && !fold.open)) return;" in draw
    assert "if (fold.open) redraw();" in ROADMAP_JS


def test_paper_diagrams_render_one_per_task_nearest_first():
    # One mermaid.run() over every block was a single multi-second task.
    assert "mermaid.run({ nodes: nodes })" not in RUN_MERMAID
    assert "mermaid.run({ nodes: [item.el] })" in RUN_MERMAID
    assert "setTimeout(next, 0)" in RUN_MERMAID
    assert ".sort(function(a, b) { return a.distance - b.distance; })" in RUN_MERMAID
    # A block is reset to its source right before it is drawn again, not all
    # of them up front, so no frame shows a collapsed block.
    assert RUN_MERMAID.index("resetMermaidBlock(item.el);") < RUN_MERMAID.index(
        "mermaid.run({ nodes: [item.el] })"
    )
    # A second theme switch stops the run it supersedes.
    assert "generation !== mermaidRunGeneration" in RUN_MERMAID
