"""KaTeX 只在用得上的页面加载。

此前每一页都加载 KaTeX 的 CSS + 两个脚本（约 300 KB，gzip 后约 90 KB），
而 392 篇笔记里 298 篇一条公式也没有。
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = (ROOT / "_layouts/default.html").read_text(encoding="utf-8")
HEAD = LAYOUT.split("</head>", 1)[0]


def _katex_block():
    start = HEAD.index("{%- assign needs_katex = true -%}")
    end = HEAD.index("{%- endif %}", HEAD.index("{%- else %}", start))
    return HEAD[start:end]


def test_katex_tags_are_wrapped_in_the_needs_katex_condition():
    block = _katex_block()
    assert "{%- if needs_katex %}" in block
    assert "katex.min.css" in block
    assert "katex.min.js" in block
    assert "auto-render.min.js" in block
    # Nothing KaTeX-related outside the block.
    outside = HEAD.replace(block, "")
    assert "katex@" not in outside


def test_rule_keeps_katex_for_math_demos_and_non_paper_pages():
    block = _katex_block()
    # Only paper pages may drop it ...
    assert '{%- if page.layout == "paper" -%}' in block
    # ... and only when they carry neither a demo bundle nor a `$` in the body.
    assert "{%- if page.demos and page.demos.size > 0 -%}{%- assign has_demos = true -%}{%- endif -%}" in block
    assert '{%- unless has_demos or content contains "$" -%}{%- assign needs_katex = false -%}{%- endunless -%}' in block


def test_page_without_katex_says_so_and_skips_the_polling():
    assert "<script>window.katexEnabled = false;</script>" in HEAD
    katex_init = LAYOUT.split('document.addEventListener("DOMContentLoaded"', 1)[1]
    assert "if (window.katexEnabled === false) {" in katex_init
    # The existing path is untouched: pages that requested KaTeX still render
    # straight away and poll only if the CDN is slow.
    assert "} else if (!window.initKaTeX()) {" in katex_init
