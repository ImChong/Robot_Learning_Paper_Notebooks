"""Regression: the saved language must be applied before the first paint.

``data-lang-mode`` used to stay at the authored "en" until a <body> script
ran, and the ``data-en``/``data-zh`` text swap only happened after the whole
page had been parsed — so a reload flashed the authored language (English on
index.html, Chinese on _layouts/paper.html) before switching.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "_layouts/default.html").read_text(encoding="utf-8")


def _head() -> str:
    return LAYOUT.split("</head>", 1)[0]


def _body() -> str:
    return LAYOUT.split("</head>", 1)[1]


def test_lang_is_resolved_in_head_before_any_markup():
    head = _head()
    assert "window.getSiteLang" in head
    assert "localStorage.getItem(LANG_KEY)" in head
    assert "root.setAttribute('data-lang-mode', mode)" in head
    assert "root.setAttribute('lang', mode === 'zh' ? 'zh-CN' : 'en')" in head


def test_html_element_defaults_agree_with_each_other():
    # Without JS the page stays English, so `lang` must not claim zh-CN.
    assert '<html lang="en" data-theme="dark" data-lang-mode="en">' in LAYOUT


def test_head_observer_translates_nodes_as_they_are_parsed():
    head = _head()
    assert "new MutationObserver" in head
    assert "childList: true, subtree: true, characterData: true" in head
    # The swap must be guarded so partially parsed text is never mangled.
    assert "if (current === el.getAttribute(otherTextAttr)) el.textContent = target;" in head


def test_body_init_reuses_the_head_resolution():
    assert "window.getSiteLang()" in _body()


def test_lang_toggle_label_is_translated_declaratively():
    header = (ROOT / "_includes/header.html").read_text(encoding="utf-8")
    assert '<span class="lang-label" data-en="中文" data-zh="English">' in header
