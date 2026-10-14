"""mermaid.min.js stays off the critical path.

Every page used to load the 2.5 MB mermaid bundle (710 KB over the wire)
from ``<head>`` without ``defer``, so nothing painted until it had been
downloaded and parsed — the home page included, where the roadmap is folded
away. On a throttled 4G phone the first paint of a plain note moved from
~1.3 s to ~6.8 s on that one tag.

The layout now loads it ``async`` and the bootstrap in ``_layouts/default.html``
waits for the tag instead of assuming the library is already there.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "_layouts/default.html").read_text(encoding="utf-8")
HEAD = LAYOUT.split("</head>", 1)[0]
INIT_BODY = LAYOUT.split("function initMermaid(theme) {", 1)[1].split(
    "function scheduleMermaidRun", 1
)[0]


def _script_tags(html):
    return re.findall(r"<script\b[^>]*>", html)


def test_no_external_script_blocks_the_parser():
    # Every script with a src must be async or defer: a plain <script src>
    # in <head> halts parsing (and therefore painting) until it has run.
    for tag in _script_tags(LAYOUT):
        if "src=" not in tag or 'type="application/json"' in tag:
            continue
        assert " defer" in tag or " async" in tag, tag


def test_mermaid_is_async_and_the_rest_deferred():
    mermaid_tag = next(t for t in _script_tags(HEAD) if "mermaid.min.js" in t)
    # async, not defer: a deferred mermaid would still gate DOMContentLoaded,
    # and the reveal of #paper-body hangs off that event.
    assert " async" in mermaid_tag
    assert 'id="mermaid-script"' in mermaid_tag
    for name in ("purify.min.js", "mermaid-config.js", "katex.min.js"):
        tag = next(t for t in _script_tags(HEAD) if name in t)
        assert " defer" in tag, tag


def test_bootstrap_watches_the_mermaid_tag():
    # Registered in the very next script after the tag, so neither event can
    # slip past; a watchdog covers a request that hangs.
    assert "document.getElementById('mermaid-script')" in HEAD
    assert "tag.addEventListener('load', function () {" in HEAD
    assert "tag.addEventListener('error', function () {" in HEAD
    assert "MERMAID_WAIT_TIMEOUT_MS" in HEAD


def test_init_waits_for_parser_and_script_before_giving_up():
    # 1. Still parsing (theme script at the bottom of <body>): come back on
    #    DOMContentLoaded, once mermaid-config.js (defer) has run.
    assert "if (document.readyState === 'loading') {" in INIT_BODY
    assert "document.addEventListener('DOMContentLoaded', function () {" in INIT_BODY
    # 2. Script still in flight: wait for load / error, do not declare it missing.
    assert "if (mermaidScriptState === 'loading') {" in INIT_BODY
    # 3. Only a settled failure shows the raw sources ...
    assert "document.documentElement.classList.add('mermaid-unavailable');" in INIT_BODY
    # ... and a late arrival lifts the class again.
    assert "root.classList.remove('mermaid-unavailable');" in INIT_BODY


def test_dom_content_loaded_hook_does_not_render_twice():
    # paper.js (defer) may already have configured mermaid before the queued
    # DOMContentLoaded call fires; a second initialize() + run would re-render
    # every diagram and flash them.
    assert "if (!window.roadmapMermaidConfigured) initMermaid(currentSiteTheme());" in INIT_BODY
