"""Homepage paper-list fold: every category (and subcategory) folds to 5, plus CSS hooks."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
STYLE = ROOT / "assets" / "css" / "style.css"


def test_index_folds_every_category_to_five():
    text = INDEX.read_text(encoding="utf-8")
    # 01 / 02 / 03 used to be exempt; now every list folds to 5 cards by default.
    assert "fold_exempt" not in text
    assert "fold_limit = 5" in text
    # 03 is grouped into subcategories, so subcategory lists must fold too.
    assert "sub_should_fold" in text
    assert 'data-fold-id="{{ sub_fold_id }}"' in text
    assert "paper-list-item-folded" in text
    assert "paper-list-more-btn" in text
    assert "paper-list-all-btn" in text
    assert "paper-list-collapse-btn" in text
    assert "paper-list-toggle-group" in text


def test_index_search_unfolds_folded_lists():
    text = INDEX.read_text(encoding="utf-8")
    assert "setSearchFoldMode" in text
    assert "index-search-active" in text
    assert "foldStateBeforeSearch" in text
    assert "resetAllItemDisplays" in text
    assert "compositionend" in text
    assert "search-expanded" not in text
    assert "applyVisibleCount" in text


def test_index_fold_toggle_follows_paper_list():
    text = INDEX.read_text(encoding="utf-8")
    assert "</ul>\n      {% if should_fold %}\n      <div class=\"paper-list-toggle-group\"" in text
    assert "paper-list-toggle-item" not in text


def test_style_hides_folded_items_when_collapsed():
    css = STYLE.read_text(encoding="utf-8")
    assert ".paper-list.is-folded .paper-list-item-folded" in css
    assert "body.index-search-active .paper-list-toggle-group" in css
    assert ".paper-list-toggle-group" in css
    assert ".paper-list-toggle-btn" in css
    # .paper-list-toggle-btn sets display: block, which would override [hidden].
    assert ".paper-list-toggle-btn[hidden]" in css
    assert "min-height: 44px" in css
    assert "body:has(.index-layout) .site-footer" in css
    assert "body:has(.index-layout)" in css
    assert "padding-bottom: calc(24px + 48px" not in css


def test_index_categories_fold_by_default_without_persisting_state():
    text = INDEX.read_text(encoding="utf-8")
    css = STYLE.read_text(encoding="utf-8")

    assert "document.documentElement.classList.add('index-fold-ready')" in text
    assert "is-cat-folded" in text
    assert '<button type="button" class="category-toggle" aria-expanded="false" aria-controls="' in text
    # Caret icon must stay outside [data-en]/[data-zh] elements so applyLang() won't wipe it.
    assert '<span class="cat-name" data-en="{{ cat_data.display_name | escape }}"' in text
    assert '<span class="category-fold-icon" aria-hidden="true"><svg class="icon" focusable="false"><use href="#i-caret-right"></use></svg></span>' in text
    # Category fold state is per-visit (default folded on refresh); only FOLD_PREFIX uses localStorage.
    assert text.count("localStorage.") == 2

    assert "html.index-fold-ready body:not(.index-search-active) .category-section.is-cat-folded:not(.category-section--keep-subcats) > :not(.category-title)" in css
    assert ".category-toggle" in css
    assert '.category-toggle[aria-expanded="true"] .category-fold-icon' in css


def test_high_impact_selection_keeps_subcategory_titles_visible_when_folded():
    text = INDEX.read_text(encoding="utf-8")
    css = STYLE.read_text(encoding="utf-8")

    assert 'cat_key == "03_High_Impact_Selection"' in text
    assert "category-section--keep-subcats" in text
    assert "is-subcat-folded" in text
    assert '<button type="button" class="subcategory-toggle"' in text
    assert '<span class="subcategory-fold-icon" aria-hidden="true"><svg class="icon" focusable="false"><use href="#i-caret-right"></use></svg></span>' in text

    assert "html.index-fold-ready body:not(.index-search-active) .category-section.category-section--keep-subcats.is-cat-folded > :not(.category-title):not(.subcategory-section)" in css
    assert "html.index-fold-ready body:not(.index-search-active) .subcategory-section.is-subcat-folded > :not(.subcategory-title)" in css
    assert ".subcategory-toggle" in css


def test_index_search_and_hash_anchors_reveal_folded_sections():
    text = INDEX.read_text(encoding="utf-8")

    assert "sectionFoldStateBeforeSearch" in text
    assert "setCategoryExpanded" in text
    assert "setSubcategoryExpanded" in text
    assert "syncKeepSubcatsParent" in text
    assert "function revealHashTarget" in text
    assert "window.addEventListener('hashchange'" in text
    assert "if (window.location.hash)" in text
    assert "a[href^=\"#\"]" in text or "a[href^='#']" in text
    assert "if (!t.el.getClientRects().length) return Infinity;" in text


def test_index_toc_includes_category_index_numbers():
    text = INDEX.read_text(encoding="utf-8")
    css = STYLE.read_text(encoding="utf-8")

    cat_toc_line = '<a href="#cat-{{ forloop.index }}" class="toc-link"><span class="toc-index" aria-hidden="true">{{ cat[0] | slice: 0, 2 }}</span> <span data-en="{{ cat[1].display_name | escape }}"'
    assert cat_toc_line in text
    # Roadmap and subcategory headings have no index numbers, so their TOC links stay unnumbered.
    roadmap_block = text.split('data-toc-for="roadmap-title"', 1)[1].split("</li>", 1)[0]
    assert "toc-index" not in roadmap_block
    subcat_block = text.split('<ul class="toc-sublist">', 1)[1].split("</ul>", 1)[0]
    assert "toc-index" not in subcat_block
    assert ".toc-link .toc-index" in css
