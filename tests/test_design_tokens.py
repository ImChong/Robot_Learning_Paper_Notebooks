"""Site chrome follows one design system (see AGENTS.md「站点样式」).

The redesign moved style.css onto a closed set of values: Geist / Geist Mono
(self-hosted), the Tailwind type scale, one accent hue, custom easing, and no
italics. These checks keep later edits from drifting back.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_STYLE_ALL = (ROOT / "assets" / "css" / "style.css").read_text(encoding="utf-8")
# The site header keeps its pre-redesign look by the maintainer's choice; that block
# is copied verbatim from the old stylesheet and is exempt from the rules below.
STYLE = re.sub(
    r"/\* legacy-header:start \*/.*?/\* legacy-header:end \*/", "", _STYLE_ALL, flags=re.S
)
LAYOUT = (ROOT / "_layouts" / "default.html").read_text(encoding="utf-8")

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


def test_header_and_tab_icon_keep_the_original_design():
    header = (ROOT / "_includes" / "header.html").read_text(encoding="utf-8")
    assert "📚 {{ site.title | escape }} | {{ site.description | escape }}" in header
    assert "<text y='.9em' font-size='90'>📚</text>" in LAYOUT
    assert _STYLE_ALL.count("/* legacy-header:start */") == 1
