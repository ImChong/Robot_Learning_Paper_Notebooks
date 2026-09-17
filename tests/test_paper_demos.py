"""Tests for the interactive paper demos (assets/js/demos/*.js).

The demos are opt-in per note: front matter declares ``demos: ["ppo"]`` and the
markdown drops empty ``<div class="paper-demo" data-demo="...">`` placeholders.
Everything else is built client-side, because ``scripts/sanitize_paper_html.py``
strips ``<script>``/``<canvas>``/``<input>`` out of ``#paper-body`` before publish.
These tests pin the three links in that chain: placeholder survives sanitizing,
layout loads the assets, and every placeholder has a builder behind it.
"""

import math
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


def _note(folder: str) -> Path:
    """papers/01_Foundational_RL/<folder>/<folder>.md"""
    return FOUNDATIONAL / folder / f"{folder}.md"


ADD_NOTE = _note("ADD_Adversarial_Differential_Discriminators")
ASE_NOTE = _note("ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control")
CALM_NOTE = _note("CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters")
PULSE_NOTE = _note("PULSE_Physics-based_Universal_Latent_Space")
PHC_NOTE = _note("PHC_Perpetual_Humanoid_Control")
DIFFUSION_POLICY_NOTE = _note("Diffusion_Policy")
BEYONDMIMIC_NOTE = _note("BeyondMimic")
LCP_NOTE = _note("LCP_Sim-to-Real_Action_Smoothing")
DR_VISION_NOTE = _note(
    "Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World"
)
DR_THEORY_NOTE = _note("Domain_Randomization_Understanding_Sim-to-Real_Transfer")
MIMICKIT_NOTE = _note("MimicKit_A_Reinforcement_Learning_Framework_for_Motion_Imitation_and_Control")

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
        PPO_NOTE: ("ppo", ["ppo-explainer", "ppo-gae", "ppo-clip", "ppo-epochs"]),
        AWR_NOTE: ("awr", ["awr-weights", "awr-buffer", "awr-regression"]),
        DEEPMIMIC_NOTE: (
            "deepmimic",
            [
                "deepmimic-explainer",
                "deepmimic-reward",
                "deepmimic-rsi",
                "deepmimic-pd",
            ],
        ),
        AMP_NOTE: (
            "amp",
            ["amp-explainer", "amp-disc", "amp-reward", "amp-style"],
        ),
        ADD_NOTE: (
            "add",
            ["add-explainer", "add-diff", "add-reward", "add-curriculum"],
        ),
        ASE_NOTE: (
            "ase",
            ["ase-explainer", "ase-latent", "ase-encoder", "ase-diversity"],
        ),
        CALM_NOTE: ("calm", ["calm-encoder", "calm-hlc", "calm-fsm"]),
        PULSE_NOTE: ("pulse", ["pulse-vib", "pulse-prior", "pulse-downstream"]),
        PHC_NOTE: (
            "phc",
            ["phc-explainer", "phc-pmcp", "phc-mcp", "phc-recovery"],
        ),
        DIFFUSION_POLICY_NOTE: (
            "diffusion_policy",
            ["dp-multimodal", "dp-denoise", "dp-rhc"],
        ),
        BEYONDMIMIC_NOTE: (
            "beyondmimic",
            ["bm-anchor", "bm-sampling", "bm-guidance"],
        ),
        LCP_NOTE: ("lcp", ["lcp-sensitivity", "lcp-gp", "lcp-vs-filter"]),
        DR_VISION_NOTE: (
            "domain_randomization",
            ["dr-scene", "dr-coverage", "dr-ablation"],
        ),
        DR_THEORY_NOTE: ("dr_theory", ["drt-gap", "drt-memory", "drt-sysid"]),
        MIMICKIT_NOTE: (
            "mimickit",
            ["mimickit-family", "mimickit-reward", "mimickit-config"],
        ),
    }
    for note, (bundle, placeholders) in expected.items():
        text = note.read_text(encoding="utf-8")
        assert f'demos: ["{bundle}"]' in text, f"{note} 缺少 front matter demos 声明"
        assert PLACEHOLDER_RE.findall(text) == placeholders, f"{note} 的占位符顺序不对"


def test_every_bundle_uses_the_shared_kit():
    """Only kit.js may define the widget toolkit; bundles pull it off window."""
    kit = DEMO_KIT.read_text(encoding="utf-8")
    assert "window.PaperDemoKit" in kit
    bundles = sorted(js.stem for js in DEMO_JS_DIR.glob("*.js") if js.stem != "kit")
    assert len(bundles) >= 15, "01_Foundational_RL 每篇笔记都应该有自己的 demo bundle"
    for name in bundles:
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


EXPLAINER_BUNDLES = ("ppo", "deepmimic", "amp", "add", "ase")


def test_explainer_formulas_go_through_katex():
    """Formulas in the storyboard demos are LaTeX, typeset by the page's KaTeX.

    The site already loads KaTeX (pinned + SRI in ``_layouts/default.html``),
    so the kit renders through ``window.katex`` rather than shipping a second
    copy — and degrades to plain text when that CDN is blocked.
    """
    kit = DEMO_KIT.read_text(encoding="utf-8")
    assert "window.katex" in kit, "公式必须走页面已加载的 KaTeX，不要再引第二份"
    assert "texToPlain" in kit, "KaTeX 取不到时要降级成可读的纯文本"
    for helper in ("tex:", "rich:", "svgMath:"):
        assert helper in kit, f"kit.js 必须导出 {helper} 供各 bundle 复用"

    css = DEMO_CSS.read_text(encoding="utf-8")
    for cls in (".demo-tex", ".demo-x-fo", ".demo-x-tex"):
        assert cls in css, f"{cls} 需要在 paper-demos.css 里定义"

    for name in EXPLAINER_BUNDLES:
        js = (DEMO_JS_DIR / f"{name}.js").read_text(encoding="utf-8")
        assert "svgMath" in js, f"{name}.js 的分镜公式应该用 K.svgMath 渲染"
        # 字幕轨里的公式写成 `$...$`，由 kit 的 rich() 交给 KaTeX
        assert re.search(r"s: '[^']*\$\\\\", js), f"{name}.js 的字幕应包含 $LaTeX$ 公式"


def _ase_channels(js: str) -> list[tuple[float, float, float]]:
    """The four hand-written behaviour channels the ASE latent demo decodes into."""
    block = js[js.index("var CHANNELS = [") : js.index("function decode(")]
    rows = re.findall(r"w: \[(-?[\d.]+), (-?[\d.]+)\], b: (-?[\d.]+)", block)
    assert len(rows) == 4, "ASE 的行为通道应该是四个"
    return [(float(a), float(b), float(c)) for a, b, c in rows]


def _fmt(x: float, digits: int) -> str:
    """kit.js 的 fmt()：定点小数，并且不输出 '-0.00'。"""
    s = f"{x:.{digits}f}"
    return s[1:] if re.fullmatch(r"-0(\.0*)?", s) else s


def test_ase_explainer_numbers_come_from_the_shared_helpers():
    """六幕动画的字幕数字必须和三个演示共用的那几个函数算出来的一致。

    动画不许自己另算一套 —— 所以 ``bestSens`` / ``divParts`` /
    ``latentSegments`` 在 bundle 里各只定义一次，讲解动画与演示共用。
    """
    js = (DEMO_JS_DIR / "ase.js").read_text(encoding="utf-8")
    for helper in ("function bestSens(", "function divParts(", "function latentSegments("):
        assert js.count(helper) == 1, f"{helper} 应该只定义一次，供演示与讲解动画共用"

    cues = js[js.index("var ASE_SCENES = [") :]
    # 字幕里的负号是排版用的 U+2212
    cues = cues.replace("\u2212", "-")

    # 第二幕：四个停靠点的读数由 decode() 现算（sens = 1.0）
    channels = _ase_channels(js)
    for angle in (0.65, 1.60, 2.55, 4.93):
        z = (math.cos(angle), math.sin(angle))
        row = " / ".join(
            _fmt(min(max(b + w0 * z[0] + w1 * z[1], -1), 1.4), 2) for w0, w1, b in channels
        )
        assert row in cues, f"z 角 {angle} 的通道读数 {row} 不在字幕里"

    # 第二幕：latent 时间线那几段来自 latentSegments(21)
    for dur in _ase_latent_durations():
        assert f"{dur:.2f} s" in cues, f"重采样分段 {dur:.2f} s 不在字幕里"

    # 第三、四幕：s* 的三种权重配比
    for w_disc, w_enc in ((1.0, 0.0), (0.5, 0.5), (0.0, 1.0)):
        best = _ase_best_sens(w_disc, w_enc, 0.35)
        assert _fmt(best, 2) in cues, f"权重 {w_disc}/{w_enc} 下的 s* = {best:.2f} 不在字幕里"
    best_both = _ase_best_sens(0.5, 0.5, 0.35)
    assert _fmt(math.exp(-0.45 * best_both**2), 3) in cues, "0.5/0.5 时的 disc reward 不在字幕里"

    # 第五幕：ratio = 2s²，所以 z_diff 与 a_diff 在任何夹角上都相等
    sens = math.sqrt(0.5)
    for deg in (15, 150):
        cos = math.cos(math.radians(deg))
        z_diff = 0.5 - 0.5 * cos
        a_diff = sens * sens * (2 - 2 * cos) / 2
        assert _fmt(z_diff, 3) == _fmt(a_diff, 3), "√(tar/2) 处 z_diff 应与 a_diff 相等"
        assert _fmt(z_diff, 3) in cues, f"{deg}° 处的 z_diff = {z_diff:.3f} 不在字幕里"


def _ase_best_sens(w_disc: float, w_enc: float, noise: float) -> float:
    """ase.js 的 bestSens()：在 s ∈ [0, 3] 上扫 301 个点取加权奖励最大者。"""

    def total(s: float) -> float:
        snr = (s * s) / (s * s + noise * noise) if s else 0.0
        return w_disc * math.exp(-0.45 * s * s) + w_enc * math.sqrt(snr)

    return max((3 * i / 300 for i in range(301)), key=total)


def _ase_latent_durations() -> list[float]:
    """ase.js 的 latentSegments(21, 11)：mulberry32 驱动的 U(0, 5) 分段长度。"""
    state = 21

    def rng() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = (state ^ (state >> 15)) * (1 | state) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    acc, durs = 0.0, []
    while acc < 11:
        dur = 0.4 + 4.6 * rng()
        durs.append(dur)
        acc += dur
        rng()  # 每段之后再抽一次决定下一段的方向
    return durs


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
