"""回归测试：保障全站交互组件与移动端渲染性能关键路径不回退。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_HTML = (ROOT / "_layouts" / "default.html").read_text(encoding="utf-8")
INDEX_HTML = (ROOT / "index.html").read_text(encoding="utf-8")
UPDATES_HTML = (ROOT / "updates.html").read_text(encoding="utf-8")
STYLE_CSS = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
DEMOS_CSS = (ROOT / "assets" / "css" / "paper-demos.css").read_text(encoding="utf-8")
SCROLL_REVEAL_JS = (ROOT / "assets" / "js" / "scroll-reveal.js").read_text(encoding="utf-8")
PAPER_JS = (ROOT / "assets" / "js" / "paper.js").read_text(encoding="utf-8")
PAPER_ICONS_JS = (ROOT / "assets" / "js" / "paper-icons.js").read_text(encoding="utf-8")
MERMAID_CONFIG_JS = (ROOT / "assets" / "js" / "mermaid-config.js").read_text(encoding="utf-8")
MERMAID_ZOOM_JS = (ROOT / "assets" / "js" / "mermaid-zoom.js").read_text(encoding="utf-8")
DEMO_KIT_JS = (ROOT / "assets" / "js" / "demos" / "kit.js").read_text(encoding="utf-8")
ROADMAP_JS = (ROOT / "assets" / "js" / "roadmap.js").read_text(encoding="utf-8")
PAPER_PREVIEW_JS = (ROOT / "assets" / "js" / "paper-preview.js").read_text(encoding="utf-8")
NOTE_HEALTH_JS = (ROOT / "assets" / "js" / "note-health.js").read_text(encoding="utf-8")


def test_default_layout_avoids_global_dom_scans_and_layout_thrash():
    # Head translator skips leaf and SVG/script/style subtrees during parse.
    assert "if (!el.firstElementChild) return;" in DEFAULT_HTML
    assert "tag === 'SVG' || tag === 'SCRIPT' || tag === 'STYLE'" in DEFAULT_HTML

    # Only actual paper pages with Mermaid markup download/init mermaid.
    assert "content contains \"language-mermaid\" or content contains 'class=\"mermaid\"'" in DEFAULT_HTML

    # initKaTeX only scans #paper-body, never falling back to full document.body.
    assert "document.getElementById('paper-body') || document.body" not in DEFAULT_HTML

    # applyLang sweeps translatable attributes in a single querySelectorAll call.
    apply_lang = DEFAULT_HTML.split("function applyLang(mode) {", 1)[1].split("function toggleLang()", 1)[0]
    assert apply_lang.count("querySelectorAll(") == 1

    # FAB clearance updates the two FAB nodes directly instead of documentElement,
    # and scroll handler uses cached heights instead of reading doc.scrollHeight.
    assert "document.documentElement.style.setProperty('--fab-bottom'" not in DEFAULT_HTML
    assert "cachedScrollHeight" in DEFAULT_HTML


def test_default_layout_mermaid_skips_closed_folds_and_scopes_patch():
    assert "function isInsideClosedDetails(el)" in DEFAULT_HTML
    assert "if (!isInsideClosedDetails(el))" in DEFAULT_HTML
    assert "pendingFinishNodes" in DEFAULT_HTML


def test_css_avoids_mobile_compositing_and_relayout_traps():
    header_css = STYLE_CSS.split(".site-header {", 1)[1].split("}", 1)[0]
    assert "backdrop-filter" not in header_css

    reveal_css = STYLE_CSS.split(".scroll-reveal {", 1)[1].split("}", 1)[0]
    assert "filter:" not in reveal_css

    assert "text-wrap: pretty;" in STYLE_CSS
    pretty_selector = STYLE_CSS.split("text-wrap: pretty;", 1)[0].rsplit("\n\n", 1)[-1]
    assert "p, li, blockquote" not in pretty_selector

    assert "content-visibility: auto;" in STYLE_CSS
    assert "contain: layout style inline-size;" in STYLE_CSS
    assert "contain: layout style;" in DEMOS_CSS
    assert "transform: scaleX(0);" in DEMOS_CSS


def test_scroll_reveal_ignores_self_toc_and_search_mutations():
    assert "flushSelfMutations" in SCROLL_REVEAL_JS
    assert "mo.takeRecords()" in SCROLL_REVEAL_JS
    assert "#toc-sidebar" in SCROLL_REVEAL_JS
    assert "index-search-active" in SCROLL_REVEAL_JS
    assert "'style'" not in SCROLL_REVEAL_JS.split("attributeFilter:", 1)[1].split("]", 1)[0]


def test_paper_and_mermaid_helpers_batch_and_scope_work():
    assert "pendingFoldMermaids" in PAPER_JS
    assert "window.runMermaid(batch)" in PAPER_JS
    assert "window.runMermaid(wake)" in PAPER_JS
    assert "lazyMermaidObserver" in PAPER_JS
    assert "scheduleUpdatePositions" in PAPER_JS
    assert "cur.matches(SKIP_SELECTOR)" not in PAPER_ICONS_JS
    assert "items[j].w = items[j].inner.scrollWidth;" in MERMAID_CONFIG_JS
    assert "cachedViewportRect" in MERMAID_ZOOM_JS


def test_demo_kit_caches_layout_palette_tex_slots_and_explainer_scenes():
    assert "widthEpoch" in DEMO_KIT_JS
    assert "cachedPaletteTheme" in DEMO_KIT_JS
    assert "texHtmlCache" in DEMO_KIT_JS
    assert "setRichSlotted" in DEMO_KIT_JS
    assert "fill.style.transform = 'scaleX('" in DEMO_KIT_JS
    assert "function ensureScene(i)" in DEMO_KIT_JS
    assert "window.__clipRender" in DEMO_KIT_JS


def test_roadmap_index_preview_health_and_updates_avoid_full_rebuilds():
    # Roadmap fitMap measures clusters once instead of mutating canvas width in the loop.
    fit_map = ROADMAP_JS.split("function fitMap() {", 1)[1].split("function availableSize()", 1)[0]
    assert "canvas.style.width = width" not in fit_map
    assert "wrappedHeight(width)" in fit_map
    assert "requestAnimationFrame(function () {" in ROADMAP_JS

    # Conditional KaTeX gating on preview / roadmap / note-health caching.
    assert "info.summary_zh.indexOf('$')" in ROADMAP_JS
    assert "info.s.indexOf('$')" in PAPER_PREVIEW_JS
    assert "lastBuiltTarget" in NOTE_HEALTH_JS

    # Index coalesces TOC measurements and caches fold groups.
    assert "foldMetaByList" in INDEX_HTML
    assert "tocRefreshPending" in INDEX_HTML

    # Updates increments timeline without wiping the heatmap on filter/expand clicks.
    assert "syncHeatmapActiveCell" in UPDATES_HTML
    assert "insertAdjacentHTML('beforeend'" in UPDATES_HTML
