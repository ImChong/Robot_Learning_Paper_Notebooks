"""Regression tests for Scheme C / Scheme A brand SVGs, F2 favicons, manifest, and E2 header SVGs."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICONS_DIR = ROOT / "assets" / "icons"
UI_EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF\u2600-\u26FF\u2700-\u27BF]")


def test_brand_and_f2_favicon_assets_exist():
    expected_files = (
        "brand-logo.svg",
        "brand-paper.svg",
        "favicon-home.svg",
        "favicon-paper.svg",
        "favicon-updates.svg",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
    )
    for name in expected_files:
        path = ICONS_DIR / name
        assert path.is_file() and path.stat().st_size > 0, f"missing or empty asset: {name}"

    assert (ROOT / "assets" / "img" / "og-default.png").is_file()

    # Scheme C stacked notebooks on home/updates; Scheme A open notebook on paper detail.
    home_fav = (ICONS_DIR / "favicon-home.svg").read_text(encoding="utf-8")
    paper_fav = (ICONS_DIR / "favicon-paper.svg").read_text(encoding="utf-8")
    updates_fav = (ICONS_DIR / "favicon-updates.svg").read_text(encoding="utf-8")
    assert "#569cd6" in home_fav
    assert "<rect x=\"6.5\"" in home_fav
    assert "#a78bfa" in paper_fav
    assert "M6.2 9.8C" in paper_fav
    assert "#34d399" in updates_fav
    assert "<rect x=\"6.5\"" in updates_fav


def test_manifest_uses_local_png_icons():
    manifest_path = ROOT / "manifest.webmanifest"
    assert manifest_path.is_file()
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    icons = data.get("icons")
    assert isinstance(icons, list) and len(icons) >= 2
    for entry in icons:
        src = entry["src"]
        assert not re.match(r"^https?://", src, re.I), f"external manifest icon: {src}"
        assert (ROOT / src).is_file(), f"manifest icon missing on disk: {src}"


def test_default_layout_wires_f2_favicons_manifest_and_css_theme_icons():
    layout = (ROOT / "_layouts" / "default.html").read_text(encoding="utf-8")
    head = layout.split("</head>", 1)[0]
    assert "/assets/icons/favicon-home.svg" in head
    assert "/assets/icons/favicon-paper.svg" in head
    assert "/assets/icons/favicon-updates.svg" in head
    assert "/assets/icons/apple-touch-icon.png" in head
    assert "/manifest.webmanifest" in head
    assert 'rel="icon" href="data:image/svg+xml,' not in head
    # Theme JS must not overwrite SVG icon markup inside #theme-toggle.
    assert "toggle.textContent = theme === 'dark'" not in layout


def test_header_and_sponsor_dialog_use_vector_icons_with_zero_ui_emoji():
    header = (ROOT / "_includes" / "header.html").read_text(encoding="utf-8")
    dialog = (ROOT / "_includes" / "sponsor-dialog.html").read_text(encoding="utf-8")

    assert "page.layout == 'paper'" in header
    assert 'class="site-brand-mark site-brand-mark--paper"' in header
    assert 'class="site-brand-mark site-brand-mark--library"' in header
    assert '<span class="icon-sun"><svg class="ui-icon"' in header
    assert '<span class="icon-moon"><svg class="ui-icon"' in header
    assert '<span class="sponsor-icon" aria-hidden="true"><svg class="ui-icon"' in header

    assert not UI_EMOJI_RE.search(header), "unexpected emoji in _includes/header.html"
    assert not UI_EMOJI_RE.search(dialog), "unexpected emoji in _includes/sponsor-dialog.html"
