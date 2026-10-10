"""Tests for home roadmap node → paper note links."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LINKS_YML = ROOT / "_data" / "roadmap_links.yml"
PAPERS_DIR = ROOT / "papers"
DEFAULT_LAYOUT = ROOT / "_layouts" / "default.html"
INDEX_HTML = ROOT / "index.html"
ZOOM_JS = ROOT / "assets" / "js" / "mermaid-zoom.js"
CONFIG_JS = ROOT / "assets" / "js" / "mermaid-config.js"
STYLE_CSS = ROOT / "assets" / "css" / "style.css"
PAPERS_JSON = ROOT / "_data" / "papers.json"


def _load_roadmap_links() -> dict[str, str]:
    links: dict[str, str] = {}
    for line in LINKS_YML.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        key, _, value = stripped.partition(":")
        links[key.strip()] = value.strip()
    return links


def test_roadmap_link_paths_resolve_to_notes():
    failures: list[str] = []
    for node_id, html_path in _load_roadmap_links().items():
        if html_path.startswith("https://"):
            assert re.fullmatch(r"https://arxiv\.org/abs/\d{4}\.\d{4,5}", html_path), (
                f"Unexpected external roadmap URL for {node_id}: {html_path}"
            )
            continue
        assert html_path.startswith("/papers/"), f"Invalid note path: {html_path}"
        rel = html_path.removeprefix("/papers/").removesuffix(".html")
        md_path = PAPERS_DIR / f"{rel}.md"
        if not md_path.is_file():
            failures.append(f"{node_id}: missing {md_path}")
    assert failures == [], "Broken roadmap links:\n" + "\n".join(failures)


def test_roadmap_graph_nodes_with_notes_are_linked():
    graph = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    node_ids = set(re.findall(r"\b([A-Z][A-Za-z0-9]+)\(\[", graph))
    linked = set(_load_roadmap_links())
    missing = sorted(node_ids - linked)
    assert not missing, f"Roadmap nodes without links: {missing}"


def test_home_page_exposes_roadmap_link_json():
    text = INDEX_HTML.read_text(encoding="utf-8")
    assert 'id="roadmap-node-links"' in text
    assert "site.data.roadmap_links" in text


def test_roadmap_click_handlers_wired_in_layout():
    text = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    assert "attachRoadmapNodeLinks" in text
    assert "roadmap-node-link" in text


def test_roadmap_lightbox_opens_on_non_node_click():
    text = ZOOM_JS.read_text(encoding="utf-8")
    assert "isRoadmapNodeClick" in text
    assert "attachRoadmapLinksInLightbox" in text
    assert "roadmap-mermaid" in text
    assert "el.id === 'roadmap-mermaid' && isRoadmapNodeClick(target)" in text


def test_attach_roadmap_node_links_exposed_globally():
    text = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    assert "window.attachRoadmapNodeLinks" in text
    assert "pointerdown" in text


def test_roadmap_link_styles_present():
    css = STYLE_CSS.read_text(encoding="utf-8")
    assert ".roadmap-node-link" in css
    assert ".mermaid-lightbox__stage svg g.roadmap-node-link" in css


def test_roadmap_year_labels_avoid_ios_compositing():
    css = STYLE_CSS.read_text(encoding="utf-8")
    assert ".roadmap-node-year" in css
    assert "color-mix" not in css.split(".roadmap-node-year")[1].split("}")[0]
    assert "var(--text-secondary)" in css
    assert "opacity:" not in css.split(".roadmap-node-year")[1].split("}")[0]


def test_roadmap_lang_switch_reapplies_ios_patch():
    layout = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    config = CONFIG_JS.read_text(encoding="utf-8")
    assert "finishRoadmapInsert" in layout
    assert "patchRoadmapMermaidDom" in config
    assert "requestAnimationFrame" in layout
    assert "window.patchRoadmapMermaidDom" in layout


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


def _roadmap_node_labels() -> dict[str, str]:
    graph = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    return dict(re.findall(r"\b([A-Za-z][A-Za-z0-9]*)\(\[\"([^\"]*)\"\]\)", graph))


def test_home_page_exposes_roadmap_node_details_json():
    text = INDEX_HTML.read_text(encoding="utf-8")
    assert 'id="roadmap-node-details"' in text
    for field in ("summary_zh", "explainer_scenes", "video_seconds", "published_date_zh"):
        assert field in text


def test_roadmap_note_nodes_have_paper_details():
    """悬浮卡片按笔记地址在 papers.json 里找论文，每个笔记节点都要找得到。"""
    by_url = _papers_by_url()
    missing = [
        node_id
        for node_id, html_path in _load_roadmap_links().items()
        if not html_path.startswith("https://") and html_path not in by_url
    ]
    assert missing == [], f"Roadmap nodes not found in papers.json (run scripts/prepare_pages.py): {missing}"


def test_roadmap_video_badges_match_real_videos():
    """节点上的 🎬 与卡片里的视频时长同源：标了 🎬 的笔记必须真有配音视频，反之亦然。"""
    by_url = _papers_by_url()
    links = _load_roadmap_links()
    mismatched = []
    for node_id, label in _roadmap_node_labels().items():
        paper = by_url.get(links.get(node_id, ""))
        if paper is None:
            continue
        if ("🎬" in label) != bool(paper.get("video_seconds")):
            mismatched.append(f"{node_id}: badge={'🎬' in label}, video_seconds={paper.get('video_seconds')}")
    assert mismatched == [], "Roadmap 🎬 badges out of sync with note videos:\n" + "\n".join(mismatched)


def test_roadmap_node_card_wired_in_layout():
    layout = DEFAULT_LAYOUT.read_text(encoding="utf-8")
    css = STYLE_CSS.read_text(encoding="utf-8")
    assert "attachRoadmapNodeCard(nodeGroup, nodeId, url)" in layout
    assert "roadmap-node-details" in layout
    # 卡片不挡节点点击，触屏点按直接跳转不弹卡片。
    assert "e.pointerType !== 'touch'" in layout
    card_css = css.split(".roadmap-node-card {", 1)[1].split("}", 1)[0]
    assert "pointer-events: none" in card_css
    assert "position: fixed" in card_css
