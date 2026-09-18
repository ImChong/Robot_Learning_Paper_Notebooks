"""Tests for kramdown GFM emphasis-in-math normalization."""

from scripts._common import normalize_kramdown_math_emphasis


def test_superscript_star_not_paired_across_inline_math():
    content = (
        "上层：$\\min_{\\mathbf{p}} \\mathcal{L}(\\mathbf{p}, \\phi^*(\\mathbf{p}))$，"
        "约束 $\\phi^*(\\mathbf{p}) = \\arg\\max_\\phi \\mathcal{R}(\\mathbf{p},\\phi)$。\n"
    )
    normalized, changed = normalize_kramdown_math_emphasis(content)
    assert changed is True
    assert "\\phi^{\\ast}(\\mathbf{p})" in normalized
    assert "\\phi^*(" not in normalized


def test_repeated_subscript_brace_gets_spaced():
    content = (
        "$\\mathrm{d}_{\\mathbf{p}}\\mathbf{s}^* \\approx \\alpha "
        "\\,\\mathrm{d}_{\\mathbf{p}}\\mathbf{g}$\n"
    )
    normalized, changed = normalize_kramdown_math_emphasis(content)
    assert changed is True
    assert "\\mathrm{d} _ {\\mathbf{p}}" in normalized
    assert "\\mathbf{s}^{\\ast}" in normalized


def test_skips_fenced_code_blocks():
    content = "```python\nexpr = 'a^* + b_{x}'\n```\n"
    normalized, changed = normalize_kramdown_math_emphasis(content)
    assert changed is False
    assert normalized == content


def test_idempotent_when_already_normalized():
    content = (
        "$\\phi^{\\ast}(\\mathbf{p})$ bar $\\phi^{\\ast}(\\mathbf{p})$\n"
        "$\\mathrm{d} _ {\\mathbf{p}}\\mathbf{s}^{\\ast} \\approx "
        "\\alpha \\,\\mathrm{d} _ {\\mathbf{p}}\\mathbf{g}$\n"
    )
    normalized, changed = normalize_kramdown_math_emphasis(content)
    assert changed is False
    assert normalized == content
