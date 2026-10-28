"""首页路线图节点 → 论文笔记的链接、悬浮卡片与视频标记。"""

from __future__ import annotations

import json
import re
from pathlib import Path

from tests.roadmap_data import all_nodes, load_roadmap

ROOT = Path(__file__).resolve().parents[1]
PAPERS_DIR = ROOT / "papers"
INDEX_HTML = ROOT / "index.html"
TREE_HTML = ROOT / "_includes" / "roadmap-tree.html"
ROADMAP_JS = ROOT / "assets" / "js" / "roadmap.js"
STYLE_CSS = ROOT / "assets" / "css" / "style.css"
PAPERS_JSON = ROOT / "_data" / "papers.json"

NODES = all_nodes(load_roadmap())


def _papers_by_url() -> dict[str, dict]:
    data = json.loads(PAPERS_JSON.read_text(encoding="utf-8"))
    by_url: dict[str, dict] = {}

    def walk(group: dict) -> None:
        for paper in group.get("papers", []):
            by_url[paper["url"]] = paper
        for sub in group.get("subcategories", []) or []:
            walk(sub)

    for category in data.values():
        walk(category)
    return by_url


def test_roadmap_urls_resolve_to_notes():
    failures: list[str] = []
    for node_id, node in NODES.items():
        url = node["url"]
        if url.startswith("https://"):
            assert re.fullmatch(r"https://arxiv\.org/abs/\d{4}\.\d{4,5}", url), f"{node_id}: {url}"
            continue
        assert url.startswith("/papers/") and url.endswith(".html"), f"{node_id}: {url}"
        md_path = PAPERS_DIR / f"{url.removeprefix('/papers/').removesuffix('.html')}.md"
        if not md_path.is_file():
            failures.append(f"{node_id}: missing {md_path}")
    assert failures == [], "Broken roadmap links:\n" + "\n".join(failures)


def test_roadmap_note_nodes_have_paper_details():
    """悬浮卡片和 ▶ 按笔记地址在 papers.json 里找论文，每个笔记节点都要找得到。"""
    by_url = _papers_by_url()
    missing = [
        node_id
        for node_id, node in NODES.items()
        if not node["url"].startswith("https://") and node["url"] not in by_url
    ]
    assert missing == [], f"Roadmap nodes not found in papers.json (run scripts/prepare_pages.py): {missing}"


def test_home_page_renders_the_tree_and_its_script():
    index = INDEX_HTML.read_text(encoding="utf-8")
    assert "{% include roadmap-tree.html %}" in index
    assert "/assets/js/roadmap.js" in index
    tree = TREE_HTML.read_text(encoding="utf-8")
    assert "site.data.roadmap" in tree
    assert 'id="roadmap-node-details"' in tree
    # 节点是真链接：没有 JS 也能点进笔记。
    assert re.search(r'<a class="tt-node[^>]*href="\{\{ tt_href \}\}"', tree)
    for field in ("summary_zh", "explainer_scenes", "video_seconds", "published_date_zh"):
        assert field in tree


def test_details_json_is_escaped_for_a_script_block():
    tree = TREE_HTML.read_text(encoding="utf-8")
    detail = tree.split("{%- capture tt_detail -%}", 1)[1].split("{%- endcapture -%}", 1)[0]
    for line in detail.splitlines():
        if "jsonify" in line:
            assert "replace: '<', '\\u003c'" in line, line


def test_video_badges_come_from_papers_json():
    # ▶ 不再手写在节点上：有配音视频（papers.json 的 video_seconds）的笔记自动带上。
    tree = TREE_HTML.read_text(encoding="utf-8")
    assert "{%- if tt_paper.video_seconds %}" in tree
    assert "#i-play" in tree
    assert "🎬" not in (ROOT / "_data" / "roadmap.yml").read_text(encoding="utf-8")


def test_node_card_does_not_block_clicks_and_skips_touch():
    js = ROADMAP_JS.read_text(encoding="utf-8")
    css = STYLE_CSS.read_text(encoding="utf-8")
    assert "if (e.pointerType === 'touch') return;" in js
    assert "script#roadmap-node-details" in js
    card_css = css.split(".roadmap-node-card {", 1)[1].split("}", 1)[0]
    assert "pointer-events: none" in card_css
    assert "position: fixed" in card_css


def test_tabs_are_an_accessible_tablist():
    tree = TREE_HTML.read_text(encoding="utf-8")
    js = ROADMAP_JS.read_text(encoding="utf-8")
    assert 'role="tablist"' in tree and 'role="tab"' in tree and 'role="tabpanel"' in tree
    assert "aria-controls=" in tree and "aria-labelledby=" in tree
    for key in ("ArrowDown", "ArrowUp", "Home", "End"):
        assert f"'{key}'" in js
    # 记住上次看的系；隐私模式下读写失败也不能报错。
    assert js.count("localStorage.") == 2
    assert js.count("try {") >= 3


def test_global_overview_window_shows_every_node_and_route():
    tree = TREE_HTML.read_text(encoding="utf-8")
    js = ROADMAP_JS.read_text(encoding="utf-8")
    assert 'class="tt-map-open"' in tree and 'aria-haspopup="dialog"' in tree
    # 窗口里的节点是各系树的副本，所有箭头（系内 + 跨系）画在同一张 SVG 上。
    assert "branch.tree.cloneNode(true)" in js
    assert "drawEdges(map.svg, map.canvas, edges," in js
    assert "el.setAttribute('aria-modal', 'true');" in js
    assert "if (map && !map.el.hidden) closeMap();" in js
    # 按窗口大小挑排法、缩放到放得下；放大阅读时只上下滚，不横向拖动。
    assert "function fitMap()" in js and "map.reading = !map.reading;" in js
    assert "if (width <= availW && (!read || width > read.width))" in js
    assert "scale: availW / narrowest.width" in js
    # 触屏上第一次点只点亮路线，第二次才打开笔记。
    assert "map.pointerType !== 'touch' || map.armed === node.id" in js


def test_global_overview_zooms_and_pans_with_mouse_keyboard_and_touch():
    js = ROADMAP_JS.read_text(encoding="utf-8")
    css = STYLE_CSS.read_text(encoding="utf-8")
    # 平移走原生滚动（触屏有惯性、方向键和滚动条照常用），双指捏合由脚本接管。
    viewport_css = css.split("\n.tt-map-viewport {", 1)[1].split("}", 1)[0]
    assert "overflow: auto" in viewport_css and "touch-action: pan-x pan-y" in viewport_css
    assert "viewport.addEventListener('touchmove', function (e) {" in js
    assert "}, { passive: false });" in js
    # 缩放时手指 / 光标下的那一点不动。
    assert "function keepPoint(x, y, clientX, clientY)" in js
    assert "keepPoint(pinch.x, pinch.y, c.x, c.y);" in js
    # 鼠标：Ctrl / ⌘ + 滚轮缩放，不按修饰键就是原生滚动；按住拖动平移，拖完不算点击。
    assert "if (!e.ctrlKey && !e.metaKey) return;" in js
    assert "viewport.setPointerCapture(e.pointerId);" in js
    assert "map.suppressClick = true;" in js
    assert "copy.setAttribute('draggable', 'false');" in js
    # Safari 的触控板捏合（gesture 事件）也能缩放，并且不让整页跟着缩放。
    assert "map.el.addEventListener('gesturechange', function (e) {" in js
    # 键盘：视窗能聚焦；+ / − 缩放、0 复位、方向键平移；带 Ctrl / ⌘ 的组合键留给浏览器。
    assert "viewport.tabIndex = 0;" in js
    for key in ("'+'", "'='", "'-'", "'0'", "ArrowLeft", "ArrowDown"):
        assert key in js, key
    assert "if (e.ctrlKey || e.metaKey || e.altKey) return;" in js
    # 按钮和读数：缩小 / 当前比例 / 放大 / 复位。
    for name in ("tt-map-zoom-out", "tt-map-zoom-in", "tt-map-reset", "tt-map-level"):
        assert name in js, name
