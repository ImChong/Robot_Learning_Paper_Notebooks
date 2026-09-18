"""正文折叠（``<details class="paper-fold">``）的结构约束。

带 🎬 讲解动画的笔记把动画之后的正文默认折叠起来，读者想细读时再展开。
折叠块里的小节标题**必须写成原生 HTML**（``<h3 id="...">``）：kramdown 在
``markdown="1"`` 的 HTML 块里既不跑 GFM 的中文 id 生成器，也不认 ``{#id}``，
``### 环境设定`` 会变成 ``id="section-1"``、``{#id}`` 会原样显示成文字，笔记里
指向这些小节的锚点就全断了。assets/js/paper.js 负责点目录时展开对应折叠块。
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAPERS = ROOT / "papers"
PAPER_JS = ROOT / "assets" / "js" / "paper.js"
STYLE_CSS = ROOT / "assets" / "css" / "style.css"

FOLD_OPEN = '<details class="paper-fold"'
FENCE = re.compile(r"^```")
ATX = re.compile(r"^#{2,4} ")
RAW_HEADING = re.compile(r'^<h([2-4]) id="([^"]+)">')


def explainer_notes():
    """带讲解动画（``*-explainer`` 演示）的笔记，不限板块。"""
    return sorted(p for p in PAPERS.rglob("*.md") if "-explainer" in p.read_text(encoding="utf-8"))


def fold_line_ranges(lines):
    """逐行标出哪些行位于折叠块内部（跳过代码块）。"""
    inside = []
    in_fence = in_fold = False
    for line in lines:
        if FENCE.match(line):
            in_fence = not in_fence
            inside.append(False)
            continue
        if not in_fence and FOLD_OPEN in line:
            in_fold = True
            inside.append(False)
            continue
        if not in_fence and line.strip() == "</details>":
            in_fold = False
            inside.append(False)
            continue
        inside.append(in_fold and not in_fence)
    return inside


def test_every_explainer_note_folds_its_prose():
    notes = explainer_notes()
    assert notes, "没找到带讲解动画的笔记"
    for note in notes:
        text = note.read_text(encoding="utf-8")
        assert text.count(FOLD_OPEN) >= 3, f"{note.name}: 有讲解动画却几乎没有折叠正文"
        assert "默认全部折叠" in text, f"{note.name}: 动画下方缺少「正文默认折叠」的说明"


def test_headings_inside_folds_are_raw_html_with_ids():
    for note in explainer_notes():
        lines = note.read_text(encoding="utf-8").split("\n")
        for line, inside in zip(lines, fold_line_ranges(lines), strict=True):
            if not inside:
                continue
            assert not ATX.match(line), (
                f"{note.name}: 折叠块里的 Markdown 标题会被 kramdown 改成 id=\"section-N\"，"
                f"请写成 <h3 id=\"...\">：{line[:60]}"
            )
            assert "{#" not in line or not line.startswith("<h"), (
                f"{note.name}: 折叠块里的 {{#id}} 不会被解析，会原样显示：{line[:60]}"
            )


def test_folded_headings_keep_unique_ids():
    for note in explainer_notes():
        lines = note.read_text(encoding="utf-8").split("\n")
        ids = [m.group(2) for m in (RAW_HEADING.match(line) for line in lines) if m]
        assert len(ids) == len(set(ids)), f"{note.name}: 折叠块里的标题 id 有重复"


def test_paper_js_handles_collapsed_sections():
    js = PAPER_JS.read_text(encoding="utf-8")
    # 目录 / 锚点跳进折叠块时要先展开，滚动高亮要跳过看不见的标题。
    assert "function revealNode(" in js
    assert "function isHidden(" in js
    assert "hashchange" in js
    assert "'toggle'" in js
    # Chromium 下关着的 <details> 内容仍有布局，必须靠 DOM 判断而不是 offsetParent。
    assert "node.tagName === 'DETAILS' && !node.open" in js
    # 折叠块展开后，里面的 Canvas 演示和 Mermaid 需要按真实宽度重画。
    assert "renderAll" in js
    assert "refreshMermaidIn" in js
    # 一键展开/折叠。
    assert "toc-fold-toggle" in js


def test_toc_fold_toggle_has_styles():
    assert ".toc-fold-toggle" in STYLE_CSS.read_text(encoding="utf-8")
