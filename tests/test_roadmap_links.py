"""Tests for home roadmap node → paper note links."""

from __future__ import annotations

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
