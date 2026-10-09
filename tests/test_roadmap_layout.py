"""首页推荐学习路线图的排版：节点名不被 Mermaid 自动折行，子图标题不超宽、不被连线划过。"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LAYOUT = ROOT / "_layouts" / "default.html"
CONFIG_JS = ROOT / "assets" / "js" / "mermaid-config.js"

YEAR_SPAN = "<span class='roadmap-node-year'>"

# Mermaid 11 画子图标题时 createText 的宽度写死 200px（不吃 flowchart.wrappingWidth），
# 标题在 16px 下量出来超过 200px 就折成两行。下面按字符类别粗估宽度，以 DejaVu Sans
# （与 Verdana 同宽，比 Trebuchet MS / Arial 宽，Linux 上常见的回退字体）为准，在
# Chromium 里对现有标题实测的误差在 -7 ～ +15px 之间。原来的「1 · Basic RL and
# Transformer」实测 229px（估 237）、「1 · 基础 RL 与 Transformer」205px（估 208），都折行。
FONT_PX = 16
NARROW_CHARS = set("ijlI.,:;'!|·-/ ftr")
MAX_SUBGRAPH_TITLE_PX = 196


def _roadmap_graphs() -> dict[str, str]:
    text = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    graphs = dict(re.findall(r"\b(en|zh): `(graph TD.*?)`", text, flags=re.S))
    assert set(graphs) == {"en", "zh"}, "roadmapGraphs 应有 en / zh 两份源码"
    return graphs


def _estimated_width_px(title: str) -> float:
    em = 0.0
    for ch in title:
        if unicodedata.east_asian_width(ch) in ("W", "F"):
            em += 1.0
        elif ch in NARROW_CHARS:
            em += 0.36
        else:
            em += 0.64
    return em * FONT_PX


def test_every_roadmap_node_is_one_name_line_plus_one_year_line():
    for lang, graph in _roadmap_graphs().items():
        labels = re.findall(r'\(\["(.*?)"\]\)', graph)
        assert labels, f"{lang}: 没找到路线图节点"
        bad = [label for label in labels if label.count("<br/>") != 1 or f"<br/>{YEAR_SPAN}" not in label]
        assert bad == [], f"{lang}: 节点应为「名称<br/>年份」两行：{bad}"


def test_roadmap_render_disables_mermaid_auto_wrapping():
    layout = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    assert "window.buildRoadmapGraph(roadmapGraphs[normalizedMode])" in layout

    config = CONFIG_JS.read_text(encoding="utf-8")
    match = re.search(r"var ROADMAP_WRAPPING_WIDTH = (\d+);", config)
    assert match, "mermaid-config.js 应定义 ROADMAP_WRAPPING_WIDTH"
    # 比最长的节点名（「Quadruped Terrain · Teacher-Student 🎬」约 300px）宽得多。
    assert int(match.group(1)) >= 600
    assert "wrappingWidth: ROADMAP_WRAPPING_WIDTH" in config
    assert "subGraphTitleMargin: ROADMAP_SUBGRAPH_TITLE_MARGIN" in config


def test_roadmap_subgraph_titles_fit_mermaid_cluster_label_width():
    for lang, graph in _roadmap_graphs().items():
        titles = re.findall(r'subgraph \w+ \["([^"]+)"\]', graph)
        assert len(titles) == 11, f"{lang}: 子图数量变了，请同步检查本测试"
        too_wide = {t: round(_estimated_width_px(t)) for t in titles if _estimated_width_px(t) > MAX_SUBGRAPH_TITLE_PX}
        assert too_wide == {}, f"{lang}: 子图标题过长，会在 200px 处折行：{too_wide}"


def test_roadmap_subgraph_titles_are_lifted_above_edges():
    config = CONFIG_JS.read_text(encoding="utf-8")
    assert "function liftRoadmapClusterTitles(container)" in config
    body = config.split("window.patchRoadmapMermaidDom = function", 1)[1]
    assert body.index("liftRoadmapClusterTitles(container)") < body.index("if (!isIos()) return;"), (
        "标题上移要在 iOS 早退之前，所有平台都生效"
    )
    # 只挪还没挪过的标签：插入后 patch 会被调用两次。
    assert "g.clusters > g.cluster" in config
    assert "root.appendChild(label)" in config
