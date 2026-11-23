"""Site chrome follows one design system (see AGENTS.md「站点样式」).

The redesign moved style.css onto a closed set of values: Geist / Geist Mono
(self-hosted), the Tailwind type scale, one accent hue, custom easing, and no
italics. These checks keep later edits from drifting back.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STYLE = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
CLASSIC_STYLE = (ROOT / "assets" / "css" / "classic.css").read_text(encoding="utf-8")
LAYOUT = (ROOT / "_layouts" / "default.html").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")

TYPE_SCALE_PX = {12, 14, 16, 18, 20, 24, 30, 36, 48}


def _declarations(prop: str) -> list[str]:
    return re.findall(r"(?m)^\s*" + re.escape(prop) + r"\s*:\s*([^;]+);", STYLE)


def test_fonts_are_self_hosted_geist():
    for name in (
        "geist-latin-wght-normal.woff2",
        "geist-latin-ext-wght-normal.woff2",
        "geist-mono-latin-wght-normal.woff2",
        "geist-mono-latin-ext-wght-normal.woff2",
    ):
        assert (ROOT / "assets" / "fonts" / name).is_file(), name
        assert f"url('../fonts/{name}')" in STYLE, name
    assert (ROOT / "assets" / "licenses" / "OFL-Geist.txt").is_file()


def test_no_legacy_font_stacks_or_italics():
    families = _declarations("font-family")
    for value in families:
        assert "Arial" not in value and "Helvetica" not in value, value
        assert "Georgia" not in value and "Libertine" not in value, value
    assert "font-style: italic" not in STYLE


def test_font_sizes_sit_on_the_type_scale():
    for value in _declarations("font-size"):
        value = value.strip()
        if value == "inherit" or value.endswith("em") and not value.endswith("rem"):
            continue  # relative sizes for inline code / KaTeX / counts inside headings
        match = re.fullmatch(r"(\d+)px", value)
        assert match, f"font-size off the scale: {value}"
        assert int(match.group(1)) in TYPE_SCALE_PX, value


def test_no_permanent_global_transition():
    # A `*` transition made every node on the home page animate on hover / resize.
    assert not re.search(r"(?m)^\*,\s*\*::before,\s*\*::after\s*\{\s*transition", STYLE)


def test_theme_switch_is_one_circle_reveal():
    # Fading colours per node during the switch (html.theme-switching *) froze
    # phones for seconds: 4000+ transitions on the home page, and every forced
    # layout of a note's demo redraw had to recompute them. The switch is one
    # View Transition now, its new snapshot revealed through a circle from the
    # toggle (as on ImChong/Robotics_Notebooks).
    assert "classList.add('theme-switching')" not in LAYOUT
    assert "document.startViewTransition(" in LAYOUT
    assert "pseudoElement: '::view-transition-new(root)'" in LAYOUT
    assert "'circle(0px at '" in LAYOUT
    assert "!matches('(prefers-reduced-motion: reduce)')" in LAYOUT
    # While it runs, transitions are switched off, never on.
    switching = re.findall(r"html\.is-theme-switching \*[^{]*\{([^}]*)\}", STYLE)
    assert switching == ["\n  transition: none !important;\n"]
    assert "html.is-theme-switching::view-transition-new(root)" in STYLE
    # The default crossfade is off; the circle is the only animation.
    reveal = STYLE.split("html.is-theme-switching::view-transition-new(root) {", 1)[1]
    assert reveal.split("}", 1)[0].strip().startswith("animation: none;")
    # Diagrams are redrawn after the circle, not during it.
    assert "transition.finished.then(done, done);" in LAYOUT
    # The callback applies the theme later; a quick second tap toggles from the
    # theme being switched to, not from the data-theme still on the page.
    assert "setTheme(targetTheme === 'dark' ? 'light' : 'dark', true, true);" in LAYOUT


def test_root_smooth_scrolling_is_mouse_only():
    # Root `scroll-behavior: smooth` turns every programmatic scroll smooth; on
    # iOS WebKit that can interrupt the finger's scroll (webkit.org/b/312813)
    # and the home page could not be pulled back to the top on an iPhone.
    block = STYLE.split("html.smooth-scroll {", 1)[0].rsplit("@media", 1)[1]
    assert "(hover: hover) and (pointer: fine)" in block
    assert "(prefers-reduced-motion: no-preference)" in block
    assert STYLE.count("scroll-behavior: smooth") == 1


def test_transitions_use_the_shared_easing():
    for value in _declarations("transition"):
        if value.strip() == "none":
            continue
        assert "ease" not in re.sub(r"var\(--ease\)", "", value), value


def test_theme_follows_system_until_the_user_picks_one():
    assert "prefers-color-scheme: light" in LAYOUT
    # Loading a page must not write the theme back, or it stops following the OS.
    assert "setTheme(getPreferred(), false, false);" in LAYOUT


def test_shell_has_skip_link_404_and_share_image():
    assert 'class="skip-link" href="#main-content"' in LAYOUT
    assert 'id="main-content"' in LAYOUT
    not_found = (ROOT / "404.html").read_text(encoding="utf-8")
    assert "permalink: /404.html" in not_found
    assert "noindex: true" in not_found
    assert (ROOT / "assets" / "img" / "og-default.png").is_file()


def test_header_and_tab_icon_use_vector_brand_marks():
    header = (ROOT / "_includes" / "header.html").read_text(encoding="utf-8")
    assert "site-brand-mark" in header
    assert "{{ site.title | escape }} | {{ site.description | escape }}" in header
    assert "assets/icons/favicon-home.svg" in LAYOUT
    assert "assets/icons/favicon-paper.svg" in LAYOUT
    assert "assets/icons/favicon-updates.svg" in LAYOUT
    assert "href=\"data:image/svg+xml," not in LAYOUT
    assert "/* legacy-header:start */" not in STYLE
    assert 'class="main-nav"' in header
    assert 'id="ui-version-toggle"' in header
    assert 'class="kbd-hint"' in header


def test_blueprint_palette_radii_minimal_home_and_analytics():
    for token in ("#0a0b0d", "#5ca4ff", "#f5f4f0", "#b31b1b"):
        assert token in STYLE, token
    for radius in ("--radius-sm: 0px;", "--radius-md: 2px;", "--radius-lg: 2px;", "--radius-xl: 2px;", "--radius-2xl: 2px;"):
        assert radius in STYLE, radius
    # Homepage stays minimal: no embedded hero telemetry / health chart; links to analytics.html instead.
    assert "hero-viewport" not in INDEX
    assert "telemetry-bars" not in INDEX
    assert 'class="index-meta-chips"' in INDEX
    assert "/analytics.html" in INDEX

    header = (ROOT / "_includes" / "header.html").read_text(encoding="utf-8")
    updates = (ROOT / "updates.html").read_text(encoding="utf-8")
    analytics = (ROOT / "analytics.html").read_text(encoding="utf-8")
    assert "/analytics.html" in header
    assert "/analytics.html" in updates
    for marker in ('id="analytics-data"', 'id="analytics-app"', "analytics-bars", "analytics-cats", "analytics-explorer"):
        assert marker in analytics, marker


def test_classic_ui_switcher_and_theme_shortcut():
    assert (ROOT / "assets" / "css" / "classic.css").is_file()
    assert 'html[data-ui="classic"]' in CLASSIC_STYLE
    assert "window.getSiteUi" in LAYOUT
    assert "/assets/css/classic.css" in LAYOUT
    assert "ui-version-toggle" in LAYOUT
    assert "e.key !== 'L' && e.key !== 'l'" in LAYOUT
