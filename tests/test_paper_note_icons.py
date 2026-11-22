"""Regression tests for P2 + T2 paper note SVG icon hydration."""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAPER_LAYOUT = (ROOT / "_layouts" / "paper.html").read_text(encoding="utf-8")
PAPER_JS = (ROOT / "assets" / "js" / "paper.js").read_text(encoding="utf-8")
PAPER_ICONS_JS = ROOT / "assets" / "js" / "paper-icons.js"
STYLE_CSS = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")


def test_paper_layout_loads_paper_icons_before_paper_js():
    assert PAPER_ICONS_JS.is_file()
    icons_idx = PAPER_LAYOUT.index("/assets/js/paper-icons.js")
    paper_idx = PAPER_LAYOUT.index("/assets/js/paper.js")
    assert icons_idx < paper_idx


def test_paper_js_hydrates_icons_before_toc_and_syncs_t2_toc_icons():
    hydrate_idx = PAPER_JS.index("window.PaperNoteIcons.hydrate(document.getElementById('paper-body'))")
    katex_idx = PAPER_JS.index("window.initKaTeX();")
    toc_idx = PAPER_JS.index("initToc();")
    assert katex_idx < hydrate_idx < toc_idx
    assert "h.querySelector('.paper-icon')" in PAPER_JS


def test_style_css_defines_paper_icon_tones_and_t2_toc_styles():
    for selector in (
        ".paper-icon {",
        ".paper-icon--accent {",
        ".paper-icon--ok {",
        ".paper-icon--err {",
        ".paper-icon--warn {",
        ".paper-icon--star {",
        ".toc-link .paper-icon {",
        ".toc-link.active .paper-icon {",
    ):
        assert selector in STYLE_CSS, selector


def test_paper_icons_registry_and_mapping_integrity():
    script = f"""
    const mod = require({json.dumps(str(PAPER_ICONS_JS))});
    const missing = [];
    for (const [group, map] of [
      ['HEADING_MAP', mod.HEADING_MAP],
      ['BLOCKQUOTE_MAP', mod.BLOCKQUOTE_MAP],
      ['STATUS_MAP', mod.STATUS_MAP],
    ]) {{
      for (const [emoji, [icon, tone]] of Object.entries(map)) {{
        if (!mod.ICONS[icon]) missing.push(`${{group}}:${{emoji}}->${{icon}}`);
        if (!tone) missing.push(`${{group}}:${{emoji}}:no-tone`);
      }}
    }}
    if (missing.length) {{
      console.error('Missing icons:', missing);
      process.exit(1);
    }}
    console.log(JSON.stringify({{
      icons: Object.keys(mod.ICONS).length,
      headings: Object.keys(mod.HEADING_MAP).length,
      blockquotes: Object.keys(mod.BLOCKQUOTE_MAP).length,
      status: Object.keys(mod.STATUS_MAP).length,
    }}));
    """
    proc = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True)
    summary = json.loads(proc.stdout.strip())
    assert summary["icons"] >= 40
    assert summary["headings"] >= 35
    assert summary["blockquotes"] >= 15
    assert summary["status"] >= 6
