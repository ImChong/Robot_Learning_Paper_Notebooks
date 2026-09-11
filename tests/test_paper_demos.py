"""Tests for the interactive paper demos (assets/js/demos/*.js).

The demos are opt-in per note: front matter declares ``demos: ["ppo"]`` and the
markdown drops empty ``<div class="paper-demo" data-demo="...">`` placeholders.
Everything else is built client-side, because ``scripts/sanitize_paper_html.py``
strips ``<script>``/``<canvas>``/``<input>`` out of ``#paper-body`` before publish.
These tests pin the three links in that chain: placeholder survives sanitizing,
layout loads the assets, and every placeholder has a builder behind it.
"""

import re
from pathlib import Path

from scripts.sanitize_paper_html import sanitize_paper_body_fragment

ROOT = Path(__file__).resolve().parents[1]
PAPER_LAYOUT = ROOT / "_layouts" / "paper.html"
DEMO_CSS = ROOT / "assets" / "css" / "paper-demos.css"
DEMO_JS_DIR = ROOT / "assets" / "js" / "demos"
DEMO_KIT = DEMO_JS_DIR / "kit.js"
FOUNDATIONAL = ROOT / "papers" / "01_Foundational_RL"
PPO_NOTE = FOUNDATIONAL / "PPO_Proximal_Policy_Optimization" / "PPO_Proximal_Policy_Optimization.md"
AWR_NOTE = FOUNDATIONAL / "AWR_Advantage_Weighted_Regression" / "AWR_Advantage_Weighted_Regression.md"
DEEPMIMIC_NOTE = (
    FOUNDATIONAL
    / "DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills"
    / "DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.md"
)
AMP_NOTE = (
    FOUNDATIONAL
    / "AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control"
    / "AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.md"
)

PLACEHOLDER_RE = re.compile(r'<div class="paper-demo" data-demo="([a-z0-9-]+)"')
FRONTMATTER_DEMOS_RE = re.compile(r'^demos:\s*\[(.+)\]\s*$', re.MULTILINE)


def _notes_with_placeholders():
    for path in sorted((ROOT / "papers").rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        names = PLACEHOLDER_RE.findall(text)
        if names:
            yield path, text, names


def test_placeholder_survives_paper_body_sanitizer():
    """nh3 keeps the div + data-demo hook (and still drops executable markup)."""
    fragment = (
        '<div class="paper-demo" data-demo="ppo-clip">'
        '<p class="demo-fallback">fallback</p>'
        "</div>"
        '<script>alert(1)</script>'
    )
    cleaned = sanitize_paper_body_fragment(fragment)
    assert 'class="paper-demo"' in cleaned
    assert 'data-demo="ppo-clip"' in cleaned
    assert "demo-fallback" in cleaned
    assert "<script" not in cleaned
    assert "alert(1)" not in cleaned


def test_layout_loads_demo_assets_only_when_declared():
    layout = PAPER_LAYOUT.read_text(encoding="utf-8")
    assert "{%- if page.demos -%}" in layout, "demo assets must stay opt-in per note"
    assert "assets/css/paper-demos.css" in layout
    # The shared toolkit must be emitted before the bundles that consume it.
    assert layout.index("assets/js/demos/kit.js") < layout.index("{%- for demo in page.demos -%}")
    # Only names that resolve to a real file may be emitted as a <script> tag.
    assert "{%- assign demo_path = '/assets/js/demos/' | append: demo | append: '.js' -%}" in layout
    assert "{%- if demo_file -%}" in layout


def test_every_placeholder_has_a_builder_and_a_declared_bundle():
    found_any = False
    for path, text, names in _notes_with_placeholders():
        found_any = True
        declared = FRONTMATTER_DEMOS_RE.search(text)
        assert declared, f"{path} 用了 .paper-demo 占位符，但 front matter 缺少 demos: [...]"
        bundles = re.findall(r'"([a-z0-9_-]+)"', declared.group(1))
        assert bundles, f"{path} 的 demos: 列表为空"

        sources = ""
        for bundle in bundles:
            js = DEMO_JS_DIR / f"{bundle}.js"
            assert js.is_file(), f"{path} 声明了 demos: {bundle}，但 {js} 不存在"
            assert bundle != "kit", f"{path} 不能把共享工具箱 kit 当成演示 bundle 声明"
            sources += js.read_text(encoding="utf-8")

        for name in names:
            assert f"'{name}'" in sources, f"{path} 里的 data-demo=\"{name}\" 没有对应的构建函数"
    assert found_any, "预期至少有一篇笔记内嵌交互演示"


def test_notes_declare_their_demos_in_reading_order():
    expected = {
        PPO_NOTE: ("ppo", ["ppo-gae", "ppo-clip", "ppo-epochs"]),
        AWR_NOTE: ("awr", ["awr-weights", "awr-buffer", "awr-regression"]),
        DEEPMIMIC_NOTE: (
            "deepmimic",
            ["deepmimic-reward", "deepmimic-rsi", "deepmimic-pd"],
        ),
        AMP_NOTE: ("amp", ["amp-disc", "amp-reward", "amp-style"]),
    }
    for note, (bundle, placeholders) in expected.items():
        text = note.read_text(encoding="utf-8")
        assert f'demos: ["{bundle}"]' in text, f"{note} 缺少 front matter demos 声明"
        assert PLACEHOLDER_RE.findall(text) == placeholders, f"{note} 的占位符顺序不对"


def test_every_bundle_uses_the_shared_kit():
    """Only kit.js may define the widget toolkit; bundles pull it off window."""
    kit = DEMO_KIT.read_text(encoding="utf-8")
    assert "window.PaperDemoKit" in kit
    for name in ("ppo", "awr", "deepmimic", "amp"):
        js = (DEMO_JS_DIR / f"{name}.js").read_text(encoding="utf-8")
        assert "window.PaperDemoKit" in js, f"{name}.js 必须复用共享工具箱"
        assert "K.mount(" in js, f"{name}.js 必须通过 K.mount 注册构建函数"


def test_demo_assets_are_theme_aware():
    css = DEMO_CSS.read_text(encoding="utf-8")
    # Canvas colours are read from these variables, so both themes must define them.
    for token in ("--demo-surface", "--demo-accent", "--demo-good", "--demo-bad", "--demo-grid"):
        assert css.count(token + ":") >= 2, f"{token} 需要在深色与浅色主题下各定义一次"
    assert '[data-theme="light"]' in css

    # A theme switch must repaint the canvases (they are not CSS-styled); the
    # observer lives in the shared kit, so every bundle inherits it.
    kit = DEMO_KIT.read_text(encoding="utf-8")
    assert "MutationObserver" in kit
    assert "data-theme" in kit


def test_ppo_gae_demo_matches_the_numbers_in_the_note():
    """The default trajectory must be the one worked through in the markdown."""
    js = (DEMO_JS_DIR / "ppo.js").read_text(encoding="utf-8")
    start = js.index("var GAE_PRESETS")
    preset = js[start : js.index("];", start)]
    first = preset[: preset.index("},\n    {")]
    rewards = re.findall(r"\{ r: (-?\d+), v: (\d+) \}", first)
    assert rewards == [("1", "50"), ("1", "50"), ("1", "50"), ("-2", "40"), ("-10", "20")]

    note = PPO_NOTE.read_text(encoding="utf-8")
    # Same numbers appear in the hand-worked GAE example above the demo.
    assert "δ₂ = 1  + 0.99×40 - 50 = -9.4" in note
    assert "Â₀ = +0.5  + 0.9405×(-52.9) = -49.3" in note


def test_awr_weights_demo_matches_the_numbers_in_the_note():
    """The default batch is the 4-sample example worked through in the markdown."""
    js = (DEMO_JS_DIR / "awr.js").read_text(encoding="utf-8")
    start = js.index("var WEIGHT_PRESETS")
    preset = js[start : js.index("];", start)]
    assert "advs: [5, 1, 0, -3]" in preset

    note = AWR_NOTE.read_text(encoding="utf-8")
    # exp(5) / (exp(5) + exp(1) + 1 + exp(-3)) = 148.41 / 152.18 = 0.975
    assert "Z \\approx 152.18" in note
    assert "148.41 / 152.18 \\approx 0.975" in note


def test_deepmimic_reward_demo_matches_the_worked_example():
    """Weights/sensitivities are the paper's; defaults are the t=15 example."""
    js = (DEMO_JS_DIR / "deepmimic.js").read_text(encoding="utf-8")
    terms = js[js.index("var TERMS = [") : js.index("function buildRewardDemo")]
    for weight, sensitivity, err in (
        ("w: 0.65", "k: 2", "err: 0.09"),
        ("w: 0.1,", "k: 0.1", "err: 1.0"),
        ("w: 0.15", "k: 40", "err: 0.0072"),
        ("w: 0.1,", "k: 10", "err: 0.04"),
    ):
        assert weight in terms and sensitivity in terms and err in terms

    note = DEEPMIMIC_NOTE.read_text(encoding="utf-8")
    # 0.65*0.835 + 0.1*0.905 + 0.15*0.750 + 0.1*0.670 = 0.813
    assert "r_I ≈ 0.81" in note
    assert "\\approx 0.813" in note


def test_amp_disc_demo_matches_the_numbers_in_the_note():
    """The four discriminator scores are the ones the note computes by hand."""
    js = (DEMO_JS_DIR / "amp.js").read_text(encoding="utf-8")
    samples = js[js.index("var DISC_SAMPLES = [") : js.index("function buildDiscDemo")]
    assert re.findall(r"d: (0\.\d+)", samples) == ["0.8", "0.6", "0.3", "0.7"]

    note = AMP_NOTE.read_text(encoding="utf-8")
    assert "总 loss = 0.367 + 0.780 = 1.147" in note
    # 风格奖励用的是论文实现的 LSGAN 形式
    assert "r^S(s_t, s_{t+1}) = \\max\\left[0, \\; 1 - 0.25(D(s_t, s_{t+1}) - 1)^2\\right]" in note
    assert "max(0, 1 - 0.25 * (d - 1) * (d - 1))" in js
