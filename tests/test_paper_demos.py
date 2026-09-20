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
GMR_NOTE = (
    ROOT
    / "papers"
    / "02_Motion_Retargeting"
    / "Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking"
    / "Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.md"
)
OMNI_NOTE = (
    ROOT
    / "papers"
    / "02_Motion_Retargeting"
    / "OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc"
    / "OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.md"
)
SONIC_NOTE = (
    ROOT
    / "papers"
    / "03_High_Impact_Selection"
    / "SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control"
    / "SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md"
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
        PPO_NOTE: ("ppo", ["ppo-explainer", "ppo-gae", "ppo-clip", "ppo-epochs", "ppo-curves"]),
        AWR_NOTE: ("awr", ["awr-explainer", "awr-weights", "awr-buffer", "awr-regression"]),
        DEEPMIMIC_NOTE: (
            "deepmimic",
            [
                "deepmimic-explainer",
                "deepmimic-reward",
                "deepmimic-rsi",
                "deepmimic-curves",
                "deepmimic-pd",
            ],
        ),
        AMP_NOTE: (
            "amp",
            ["amp-explainer", "amp-disc", "amp-reward", "amp-style", "amp-curves"],
        ),
        ADD_NOTE: (
            "add",
            ["add-explainer", "add-diff", "add-reward", "add-curriculum"],
        ),
        ASE_NOTE: (
            "ase",
            ["ase-explainer", "ase-latent", "ase-encoder", "ase-diversity"],
        ),
        CALM_NOTE: (
            "calm",
            ["calm-explainer", "calm-encoder", "calm-hlc", "calm-fsm"],
        ),
        PULSE_NOTE: (
            "pulse",
            ["pulse-explainer", "pulse-vib", "pulse-prior", "pulse-downstream"],
        ),
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
        SONIC_NOTE: ("sonic", ["sonic-explainer"]),
        GMR_NOTE: ("gmr", ["gmr-explainer"]),
        OMNI_NOTE: ("omniretarget", ["omniretarget-explainer"]),
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


EXPLAINER_BUNDLES = (
    "ppo", "awr", "deepmimic", "amp", "add", "ase", "calm", "pulse", "sonic", "gmr",
    "omniretarget",
)

# 幕数由论文决定，不是统一模板：PPO / DeepMimic / AMP / ADD 的核心概念正好各 5 个，
# PHC 开篇立了三堵墙（第一堵拆成「长出列」「混合列」两幕），所以是 6 幕；
# ASE 在 AMP 上叠了六件事（latent / 为什么要约束 / encoder / 两半奖励 / diversity /
# 定期重采样），也是 6 幕；AWR 是六件（PPO 的三个麻烦 / 评估 / 指数权重 /
# 加权回归 / off-policy 的赚与亏 / 闭环与源码落点）；PULSE 也是六件
# （缺一个通用表示 / 阶段 1 大规模模仿 / 阶段 2 VIB 瓶颈 / 本体感受先验 /
# 阶段 3 下游只搜 32 维 / 闭环与源码落点）；SONIC 是七件（任务选错了 / 三轴一起放大 /
# universal token space / 五项 aux loss 焊住潜空间 / 实时 kinematic planner /
# System-1 + System-2 / 数据到实机的闭环），token space 与把三路 latent 焊在一起
# 是两件独立的事，规划器与 VLA 也是，压进六幕会有两幕各塞两件事；GMR 也是七件
# （retargeting 被当成前处理脚本 / 一条管线接 5 种格式 × 18+ 款机器人 / 论文的五步显式流程 /
# 非均匀局部缩放为什么是关键 / mink + DAQP 的两阶段约束 IK / Retargeting Matters 的定量论据 /
# 闭环与源码落点），「五步流程」是论文层面的分解、「两阶段 IK」是代码层面的两张 match table，
# 合成一幕会把两套分解叠在同一块画面上；关键创新第 ③ 步也撑得起单独一幕。
# OmniRetarget 也是七件（现有 retargeting 只盯人体关键点 / interaction mesh 的
# Delaunay 四面体 / Laplacian 形变能 / 序贯 SOCP 硬约束 / 一条演示四路扩增 /
# 极简 RL 与 Table II / 数据工厂到 G1 真机的闭环），「网格保形」是目标、「硬约束」
# 是可行域，合成一幕会让能量和 SDF/脚粘地抢同一块画面；扩增与下游 RL 也是两件独立的事。
EXPLAINER_SCENES = {
    "ppo": (PPO_NOTE, 5),
    "awr": (AWR_NOTE, 6),
    "deepmimic": (DEEPMIMIC_NOTE, 5),
    "amp": (AMP_NOTE, 5),
    "add": (ADD_NOTE, 5),
    "phc": (PHC_NOTE, 6),
    "ase": (ASE_NOTE, 6),
    "calm": (CALM_NOTE, 5),
    "pulse": (PULSE_NOTE, 6),
    "sonic": (SONIC_NOTE, 7),
    "gmr": (GMR_NOTE, 7),
    "omniretarget": (OMNI_NOTE, 7),
}
CN_NUMERALS = {4: "四", 5: "五", 6: "六", 7: "七"}


def test_explainer_scene_count_matches_the_title_and_note():
    """分镜数、标题里的幕数、笔记标题三者必须一致，改幕数时不能只改一处。"""
    for bundle, (note, count) in EXPLAINER_SCENES.items():
        js = (DEMO_JS_DIR / f"{bundle}.js").read_text(encoding="utf-8")
        assert js.count("build: buildScene") == count, f"{bundle}.js 的分镜数量应为 {count}"

        cn = CN_NUMERALS[count]
        assert f"title: '{cn}幕动画" in js, f"{bundle}.js 的 explainer 标题应写「{cn}幕动画」"
        assert f"{cn}幕讲解动画'" in js, f"{bundle}.js 的 ariaLabel 应写「{cn}幕讲解动画」"

        text = note.read_text(encoding="utf-8")
        assert f"## 🎬 {cn}幕动画" in text, f"{note} 的动画小节标题应写「{cn}幕动画」"


def test_explainer_runtime_matches_the_sum_of_scene_durations():
    """`sub` 里承诺的「约 N 秒」必须是各幕 dur 之和，否则进度条和文案对不上。"""
    for bundle in EXPLAINER_SCENES:
        js = (DEMO_JS_DIR / f"{bundle}.js").read_text(encoding="utf-8")
        total = sum(float(d) for d in re.findall(r"dur: (\d+(?:\.\d+)?)", js))
        promised = int(re.search(r"sub: '约 (\d+) 秒", js).group(1))
        assert abs(total - promised) <= 1, f"{bundle}.js 说约 {promised} 秒，各幕加起来是 {total} 秒"


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


def test_demo_strings_render_backticks_as_inline_code():
    """演示里的 awrWeights() 这类标识符（字符串里用反引号包着）要渲染成 inline code。

    kit 的 rich() 是所有人读得到的字符串（标题、字幕、结论框、脚注）唯一的
    渲染入口，所以反引号只需要在那里认一次，各 bundle 原样写 markdown 即可。
    """
    kit = DEMO_KIT.read_text(encoding="utf-8")
    rich = kit[kit.index("function rich(parent, str)") : kit.index("function card(host, opts)")]
    assert "`[^`]+`" in rich, "rich() 的 re 要把一对反引号认成一段 code"
    assert "el('code', 'demo-code'" in rich, "反引号里的内容要渲染成 <code class=\"demo-code\">"

    css = DEMO_CSS.read_text(encoding="utf-8")
    assert "code.demo-code" in css, "demo-code 需要在 paper-demos.css 里定义"


def test_demo_table_cells_support_latex():
    """表格单元格里的 `$…$` 应走 el()/table().row() → rich() → KaTeX。"""
    kit = DEMO_KIT.read_text(encoding="utf-8")
    assert "function needsRichMarkup(str)" in kit
    assert "needsRichMarkup(c.text)" in kit
    assert "needsRichMarkup(String(c))" in kit
    assert "data-tex" in kit
    assert "rerenderDemoTex" in kit

    css = DEMO_CSS.read_text(encoding="utf-8")
    assert "table.demo-table .demo-tex .katex" in css


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


def test_ppo_curves_demo_matches_the_note():
    """示意曲线的锚点必须和第 4 步回报表、附录 E 的 clip 比例是同一组数。"""
    js = (DEMO_JS_DIR / "ppo.js").read_text(encoding="utf-8")
    assert "CURVE_REWARD_XS = [0, 100, 300, 800, 2000, 3000]" in js
    assert "CURVE_REWARD_YS = [30, 50, 200, 1000, 3000, 5000]" in js
    assert "CURVE_CLIP_EARLY = 0.3" in js
    assert "CURVE_CLIP_MID = 0.1" in js
    assert "CURVE_KL_LO = 0.008" in js
    assert "CURVE_KL_HI = 0.025" in js
    for scene in ("healthy", "bigstep", "tinystep", "entropy", "critic", "hack"):
        assert f"id: '{scene}'" in js, f"缺少病历 {scene}"

    note = PPO_NOTE.read_text(encoding="utf-8")
    assert 'data-demo="ppo-curves"' in note
    assert "## 📈 训练曲线怎么读" in note
    # 第 4 步那张表 / mermaid 学习曲线
    assert "line [30, 50, 200, 1000, 3000, 5000]" in note
    assert "| 平均回报 | 30 | 50 | 200 | 1000 | 3000 | 5000 |" in note
    # 附录 E
    assert "Clip 生效约 ~30%" in note
    assert "Clip 生效约 ~10%" in note
    for title in (
        "病历-健康",
        "病历-更新过大",
        "病历-几乎没学",
        "病历-熵塌缩",
        "病历-critic失灵",
        "病历-奖励在骗你",
    ):
        assert f'id="{title}"' in note


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


def test_awr_explainer_numbers_come_from_the_shared_helpers():
    """六幕动画不许自己另算一套数字。

    每个帮手在 bundle 里只定义一次，演示和讲解动画共用；讲解动画的字幕是把
    ``awrWeights`` / ``weightedFit`` / ``runSet`` 的返回值拼进去，而不是抄一份
    常量，所以改了默认参数两边会一起变。
    """
    js = (DEMO_JS_DIR / "awr.js").read_text(encoding="utf-8")
    for helper in (
        "function awrWeights(",
        "function ess(",
        "function weightedFit(",
        "function runAwr(",
        "function runSet(",
    ):
        assert js.count(helper) == 1, f"{helper} 应该只定义一次，供演示与讲解动画共用"

    block = js[js.index("// ─── demo 4: the six-scene explainer animation") :]
    # 第三幕：正文那张表的 4 个样本，走第一个演示的同一份预设与同一个函数
    assert "var S3_ADVS = WEIGHT_PRESETS[0].advs;" in block
    assert "var S3_W = awrWeights(S3_ADVS, 1, Infinity);" in block
    # 第四幕：第二个演示的 weightedFit()，同一批采样
    assert "sampleBatch(-0.3, 0.8, mulberry32(7))" in block
    assert "weightedFit(S4_BATCH, 0.3, Infinity, true, 0.8)" in block
    # 第五幕：第三个演示的 runSet()，24 个种子平均
    for keep in (1, 4, 20):
        assert f"runSet(3, 0.5, {keep})" in block, f"第五幕缺少 N = {keep} 的那条曲线"

    # 那几个帮手算出来的，就是笔记里手写的那张表
    raw = [math.exp(a) for a in (5, 1, 0, -3)]
    partition = sum(raw)
    weights = [r / partition for r in raw]
    assert _fmt(raw[0], 2) == "148.41"
    assert _fmt(partition, 2) == "152.18"
    assert _fmt(weights[0], 3) == "0.975"
    assert _fmt(1 / sum(w * w for w in weights), 2) == "1.05"

    note = AWR_NOTE.read_text(encoding="utf-8")
    assert "ESS ≈ 1.05" in note
    assert "## 🎬 六幕动画：AWR 全流程" in note


def test_deepmimic_curves_demo_matches_the_note():
    """示意曲线的锚点必须和第 4 步回报表、Q7 / Table 4 的消融数字是同一组。"""
    js = (DEMO_JS_DIR / "deepmimic.js").read_text(encoding="utf-8")
    assert "CURVE_RETURN_XS = [0, 500, 2000, 3500, 5000]" in js
    assert "CURVE_RETURN_YS = [0.08, 0.2, 0.45, 0.66, 0.791]" in js
    assert "CURVE_HEALTHY = 0.791" in js
    assert "CURVE_ET_ONLY = 0.73" in js
    assert "CURVE_RSI_ONLY = 0.379" in js
    assert "CURVE_STRIKE_BOTH = 0.99" in js
    assert "CURVE_STRIKE_IMIT = 0.19" in js
    assert "CURVE_CLIP_STEPS = 53" in js
    for scene in ("healthy", "norsi", "noet", "imbalance", "imitate", "taskonly"):
        assert f"id: '{scene}'" in js, f"缺少病历 {scene}"

    note = DEEPMIMIC_NOTE.read_text(encoding="utf-8")
    assert 'data-demo="deepmimic-curves"' in note
    assert "## 📈 训练曲线怎么读" in note
    assert "| 归一化回报 | 0.08 | 0.20 | 0.45 | 0.66 | 0.791 |" in note
    assert "| Backflip | **0.791** | 0.730 | 0.379 |" in note
    assert "Strike" in note and "19%" in note and "99%" in note
    for title in (
        "病历-健康",
        "病历-关掉rsi",
        "病历-关掉et",
        "病历-权重失衡",
        "病历-只有模仿",
        "病历-只有任务",
    ):
        assert f'id="{title}"' in note


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
    assert "r^S(s_t, s _ {t+1}) = \\max\\left[0, \\; 1 - 0.25(D(s_t, s _ {t+1}) - 1)^2\\right]" in note
    assert "max(0, 1 - 0.25 * (d - 1) * (d - 1))" in js


def test_amp_curves_demo_matches_the_note():
    """示意曲线的锚点必须和第 4 步阶段表、LSGAN 风格奖励是同一组数。"""
    js = (DEMO_JS_DIR / "amp.js").read_text(encoding="utf-8")
    assert "CURVE_XS = [0, 10, 50, 200]" in js
    assert "CURVE_D_AGENT = [-1.0, -0.55, -0.15, 0.0]" in js
    assert "CURVE_D_DEMO = [1.0, 0.92, 0.68, 0.35]" in js
    assert "CURVE_TASK = [0.12, 0.32, 0.62, 0.88]" in js
    assert "CURVE_AGENT_ACC = [0.99, 0.9, 0.72, 0.55]" in js
    assert "CURVE_WS = 0.5" in js
    assert "CURVE_WG = 0.5" in js
    assert "var rS = styleReward(dAgent);" in js
    for scene in ("healthy", "discstrong", "discweak", "collapse", "taskwin", "styleonly"):
        assert f"id: '{scene}'" in js, f"缺少病历 {scene}"

    note = AMP_NOTE.read_text(encoding="utf-8")
    assert 'data-demo="amp-curves"' in note
    assert "## 📈 训练曲线怎么读" in note
    assert "| $D$(假) | −1.0 | −0.55 | −0.15 | 0.00 |" in note
    assert "| $r^S$ | 0.00 | 0.40 | 0.67 | 0.75 |" in note
    assert "line [0.00, 0.40, 0.67, 0.75]" in note
    for title in (
        "病历-健康",
        "病历-判别器过强",
        "病历-判别器过弱",
        "病历-模式崩塌",
        "病历-任务压垮风格",
        "病历-只有风格",
    ):
        assert f'id="{title}"' in note


def test_sonic_explainer_numbers_come_from_the_config():
    """七幕动画不许手写换算结果：token 宽度、码率、控制步、参数量都得现算。

    SONIC 这篇笔记没有别的交互演示可以共用函数，所以动画里每一个「算出来的」
    数字都必须回溯到 ``sonic_release`` 的配置常量（FSQ 档位、Isaac Lab 的 dt、
    各 MLP 的 ``hidden_dims``），而不是抄一份写死的字符串。
    """
    js = (DEMO_JS_DIR / "sonic.js").read_text(encoding="utf-8")
    note = SONIC_NOTE.read_text(encoding="utf-8")

    # FSQ：每帧 2 个 token × 32 维、每维 32 个 level
    assert "var FSQ_LEVELS = 32," in js
    assert "FSQ_DIM = 32," in js
    assert "FSQ_TOKENS = 2;" in js
    assert "var FSQ_FLAT = FSQ_DIM * FSQ_TOKENS;" in js
    assert "var FSQ_BITS = FSQ_FLAT * (Math.log(FSQ_LEVELS) / Math.LN2);" in js
    flat = 32 * 2
    bits = flat * math.log2(32)
    assert (flat, bits) == (64, 320)
    # 笔记 §模型架构 里写的就是这两个数
    assert "32 levels × 32 dim × 2 token/帧 = **64-d / 帧, ~320 bit/帧**" in note

    # 50 Hz 控制（Isaac Lab dt = 0.02 s）：时间单位都换算成控制步
    assert "var DT = 0.02;" in js
    assert "var HZ = Math.round(1 / DT);" in js
    assert "REPLAN_STEPS = Math.round(REPLAN_MS / (DT * 1000));" in js
    assert round(1 / 0.02) == 50 and round(100 / 20) == 5
    assert round(0.8 / 0.02) == 40 and round(2.4 / 0.02) == 120
    assert "50 Hz（与 Isaac Lab `dt=0.02s` 对齐）" in note

    # 参数量：把配置里的 hidden_dims 相邻两层相乘再求和，只含隐层之间的权重
    assert js.count("function mlpParams(") == 1
    assert "var ENC_DIMS = [2048, 1024, 512, 512];" in js
    assert "var DYN_DIMS = [2048, 2048, 1024, 1024, 512, 512];" in js

    def hidden(dims: list[int]) -> int:
        return sum(a * b for a, b in zip(dims, dims[1:], strict=False))

    enc = hidden([2048, 1024, 512, 512])
    dyn = hidden([2048, 2048, 1024, 1024, 512, 512])
    assert _fmt(3 * enc / 1e6, 2) == "8.65"
    assert _fmt(dyn / 1e6, 2) == "8.13"
    assert _fmt((3 * enc + dyn + enc + dyn) / 1e6, 2) == "27.79"
    # 笔记里的 hidden_dims 必须和 bundle 里的一致
    assert "`[2048, 1024, 512, 512]`" in note
    assert "`[2048, 2048, 1024, 1024, 512, 512]`" in note

    # 动画自己也要说明这只是隐层部分，和笔记那个 ≈ 42 M 不冲突
    assert "**只含隐层之间的权重**" in js
    assert "## 🎬 七幕动画：SONIC 全流程" in note


def test_omniretarget_explainer_numbers_come_from_the_config():
    """七幕动画不许手写换算结果：stance 单帧位移、Table II 差值、时长加总都得现算。"""
    js = (DEMO_JS_DIR / "omniretarget.js").read_text(encoding="utf-8")
    note = OMNI_NOTE.read_text(encoding="utf-8")

    assert "var STANCE_CM_S = 1;" in js
    assert "var MOCAP_FPS = 30;" in js
    assert "var STANCE_MM_FRAME = (STANCE_CM_S * 10) / MOCAP_FPS;" in js
    stance_mm = (1 * 10) / 30
    assert abs(stance_mm - 0.333333) < 1e-6

    assert "var N_REWARDS = 5;" in js
    assert "var N_DR = 4;" in js
    assert "var N_TERMS = N_REWARDS + N_DR;" in js
    assert 5 + 4 == 9

    assert "omni: { pen: 0.0, depth: 1.34, skate: 0, contact: 0.96, rl: 82.2 }" in js
    assert "gmr: { pen: 0.83, depth: 8.5, skate: 0.02, contact: 0.99, rl: 50.83 }" in js
    assert "phc: { pen: 0.68, depth: 5.11, skate: 0.05, contact: 0.96, rl: 71.28 }" in js
    assert "vm: { pen: 0.6, depth: 7.48, skate: 0.12, contact: 0.77, rl: 3.85 }" in js
    assert "var VS_PHC = OBJ.omni.rl - OBJ.phc.rl;" in js
    assert "var VS_GMR = OBJ.omni.rl - OBJ.gmr.rl;" in js
    assert "var VS_VM = OBJ.omni.rl - OBJ.vm.rl;" in js
    assert "var DEPTH_VS_GMR = OBJ.gmr.depth - OBJ.omni.depth;" in js
    assert _fmt(82.2 - 71.28, 1) == "10.9"
    assert _fmt(82.2 - 50.83, 1) == "31.4"
    assert _fmt(82.2 - 3.85, 1) == "78.4"
    assert _fmt(8.5 - 1.34, 2) == "7.16"

    assert "var AUG_FULL = 79.1;" in js
    assert "var AUG_NOM = 82.2;" in js
    assert "var AUG_DROP = AUG_NOM - AUG_FULL;" in js
    assert _fmt(82.2 - 79.1, 1) == "3.1"

    assert "var H_OMOMO = 2.78;" in js
    assert "var H_MOCAP = 1;" in js
    assert "var H_LAFAN = 4.6;" in js
    assert "var H_SUM = H_OMOMO + H_MOCAP + H_LAFAN;" in js
    assert _fmt(2.78 + 1 + 4.6, 2) == "8.38"

    assert "var PLATFORM_M = 0.9;" in js
    assert "var PLATFORM_PCT = 70;" in js
    assert "var ROBOT_H_M = PLATFORM_M / (PLATFORM_PCT / 100);" in js
    assert _fmt(0.9 / 0.7, 2) == "1.29"

    assert "var WALL_RAD_S = 15;" in js
    assert "var WALL_S = 0.5;" in js
    assert "var WALL_RAD_IF_PEAK = WALL_RAD_S * WALL_S;" in js
    assert _fmt(15 * 0.5, 1) == "7.5"

    assert "82.20%±9.74%" in note
    assert "2.78 h" in note and "4.6 h" in note and "8.38 h" in note
    assert "## 🎬 七幕动画：OmniRetarget 全流程" in note
