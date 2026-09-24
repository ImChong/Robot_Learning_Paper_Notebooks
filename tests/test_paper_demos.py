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
UMR_NOTE = (
    ROOT
    / "papers"
    / "02_Motion_Retargeting"
    / "UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence"
    / "UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence.md"
)
COSMOS_NOTE = (
    ROOT / "papers" / "03_High_Impact_Selection"
    / "Cosmos_World_Foundation_Model_Platform_for_Physical_AI"
    / "Cosmos_World_Foundation_Model_Platform_for_Physical_AI.md"
)
SONIC_NOTE = (
    ROOT
    / "papers"
    / "03_High_Impact_Selection"
    / "SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control"
    / "SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md"
)
GROOT_NOTE = (
    ROOT
    / "papers"
    / "03_High_Impact_Selection"
    / "GR00T_N1_Humanoid_Foundation_Model"
    / "GR00T_N1_Humanoid_Foundation_Model.md"
)
PBFM_NOTE = (
    ROOT
    / "papers"
    / "03_High_Impact_Selection"
    / "Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain"
    / "Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.md"
)
PHP_NOTE = (
    ROOT
    / "papers"
    / "04_Loco-Manipulation_and_WBC"
    / "Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching"
    / "Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.md"
)
GENTLE_NOTE = (
    ROOT
    / "papers"
    / "04_Loco-Manipulation_and_WBC"
    / "GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object"
    / "GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.md"
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
            ["dp-explainer", "dp-multimodal", "dp-denoise", "dp-rhc"],
        ),
        BEYONDMIMIC_NOTE: (
            "beyondmimic",
            ["bm-explainer", "bm-anchor", "bm-sampling", "bm-guidance"],
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
        GROOT_NOTE: ("groot", ["groot-explainer", "groot-timing", "groot-flow", "groot-results"]),
        COSMOS_NOTE: ("cosmos", ["cosmos-explainer", "cosmos-data", "cosmos-tokens", "cosmos-physics"]),
        GMR_NOTE: ("gmr", ["gmr-explainer"]),
        OMNI_NOTE: ("omniretarget", ["omniretarget-explainer"]),
        UMR_NOTE: ("umr", ["umr-explainer"]),
        PHP_NOTE: ("php", ["php-explainer"]),
        PBFM_NOTE: ("pbfm", ["pbfm-explainer"]),
        GENTLE_NOTE: ("gentle", ["gentle-explainer"]),
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
    "ppo", "awr", "deepmimic", "amp", "add", "ase", "calm", "pulse", "sonic", "groot",
    "gmr", "omniretarget", "diffusion_policy", "beyondmimic", "cosmos", "umr", "php", "pbfm",
    "gentle",
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
# 是两件独立的事，规划器与 VLA 也是，压进六幕会有两幕各塞两件事；
# GR00T N1 也是七件（没有人形互联网 / 10 Hz 的第 12 层与 63.9 ms 的动作块 /
# 流匹配路径和 K=4 欧拉 / 数据金字塔三层 / 潜动作与 IDM 补标签 /
# 一套权重加按本体的 MLP / Table 2–3 的任务加权平均和短程桌面的边界）。
# 「频率」和「流匹配公式」是两件事，金字塔回答数据放哪一层、潜动作回答标签从哪来，
# 压进六幕会有两幕各塞两件；GMR 也是七件
# （retargeting 被当成前处理脚本 / 一条管线接 5 种格式 × 18+ 款机器人 / 论文的五步显式流程 /
# 非均匀局部缩放为什么是关键 / mink + DAQP 的两阶段约束 IK / Retargeting Matters 的定量论据 /
# 闭环与源码落点），「五步流程」是论文层面的分解、「两阶段 IK」是代码层面的两张 match table，
# 合成一幕会把两套分解叠在同一块画面上；关键创新第 ③ 步也撑得起单独一幕。
# OmniRetarget 也是七件（现有 retargeting 只盯人体关键点 / interaction mesh 的
# Delaunay 四面体 / Laplacian 形变能 / 序贯 SOCP 硬约束 / 一条演示四路扩增 /
# 极简 RL 与 Table II / 数据工厂到 G1 真机的闭环），「网格保形」是目标、「硬约束」
# 是可行域，合成一幕会让能量和 SDF/脚粘地抢同一块画面；扩增与下游 RL 也是两件独立的事。
# Diffusion Policy 也是七件（平均动作撞障 / 条件扩散 / action chunking / 视觉条件 + FiLM /
# DDIM 加速 / receding horizon / 为什么成了 IL 标准），「扩散过程」和「一次吐多长」
# 是两件独立的事，视觉条件与 DDIM 加速也是，压进五幕会让 chunking、FiLM 和 RHC 抢同一帧。
# BeyondMimic 是八幕：它本身就是两篇论文订在一起（阶段 1 的跟踪 + 阶段 2 的
# 引导扩散），两个阶段各自都有三件独立的事 —— 两个缺口 / 锚定跟踪 / 紧凑 MDP /
# 自适应采样 / VAE 潜空间 / 状态-潜动作扩散 / Classifier Guidance / 真机与闭环。
# 「锚定跟踪」是跟踪目标的定义、「紧凑 MDP」是 PD 与奖励的取舍、「自适应采样」是
# 分钟级长参考才会遇到的问题，三者合并会让公式与那张分箱图抢同一块画面；
# 「VAE 潜空间」与「联合扩散」更是两个独立训练阶段（前者决定扩散的动作是什么，
# 后者决定轨迹怎么排布），压成一幕会让 DAgger、β、τ 的结构和 25 Hz 挤在一起。
# Cosmos 是五件（为什么要世界模型 / 视频整理 / 因果 tokenizer / 扩散与自回归并列预训练 /
# 三类后训练示例）。扩散和自回归是两条预训练路线，画成前后两级会把 Table 10 的模型地图读反，
# 所以第 4 幕必须是并排的两列，不能并进「一个生成模型」里。
# UMR 也是八件（骨架中心的对应一款机器人一套配方 / 体表点云当接口、形变而非匹配 /
# 三项损失与测地图 / 绑定与位姿残差 / 接触图共用环境点 / 阻尼约束 GN QP /
# 三个尺度的定量证据 / 闭环与源码落点）。「位姿残差」与「接触残差」是论文里两条独立的残差，
# 前者是点对本身、后者是指向环境点的向量和活跃集；「怎么学对应」与「损失为什么要 Edge 项」
# 也是两件事，压进七幕就会让翻转算例和形变动画抢同一块画面。
# PHP 也是八件（跑酷四关 / 动作匹配的最近邻 / 临界阻尼弹簧把命令变成查询 /
# Loco → Skill → Loco 的拼接与入口密度 / 单技能专家 / DAgger 盲区与 PPO 课程 /
# 深度学生只拿速度命令 / 定量证据与真机）。「怎么找帧」和「查询从哪来」是论文附录 A
# 里分开的两节，弹簧与 inertialization 撑得起一幕；「专家」与「蒸馏」是两个训练阶段，
# 深度相机建模又是 sim-to-real 的主要工作量，合并会让课程曲线与相机噪声抢同一帧。
# Perceptive BFM 是七件（操作者—环境错配 / PMT 四阶段与「TCRS 只教不用」的契约 /
# TCRS 摆腿：接触、中足、MPPI / TCRS 身体：根高度、碰撞修复、多点 IK /
# 目标系动作对齐 / 恒等门控残差 / 定量证据与边界）。TCRS 的四步里「脚怎么走」与
# 「身体怎么跟」各是一组公式（式 4–6 vs 式 7、12），合成一幕会让 MPPI 候选表和
# 根高度滤波抢画面；对齐与门控是论文两条独立的消融，也各占一幕。
# GentleHumanoid 是七件（跟踪策略把外力当扰动 / 阻抗参考动力学 / 抵抗与引导两种交互弹簧 /
# 受力暴露的多样性 / 安全力阈值 / 教师—学生与柔顺奖励 / 定量证据与局限）。「交互力长什么样」
# 与「什么时候、在哪几个 link、多硬」是两件事（式 3–4 vs 附录 A 的调度），阈值又有自己的
# 截断公式与 ISO 换算，合并会让 4 个子步的积分表、平衡点表与压强换算挤在同一帧。
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
    "groot": (GROOT_NOTE, 7),
    "cosmos": (COSMOS_NOTE, 5),
    "gmr": (GMR_NOTE, 7),
    "omniretarget": (OMNI_NOTE, 7),
    "diffusion_policy": (DIFFUSION_POLICY_NOTE, 7),
    "beyondmimic": (BEYONDMIMIC_NOTE, 8),
    "umr": (UMR_NOTE, 8),
    "php": (PHP_NOTE, 8),
    "pbfm": (PBFM_NOTE, 7),
    "gentle": (GENTLE_NOTE, 7),
}
CN_NUMERALS = {4: "四", 5: "五", 6: "六", 7: "七", 8: "八"}


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


def test_umr_explainer_and_worked_examples_share_the_same_numbers():
    """八幕动画与笔记「🧮 数据计算实例」是同一组数：这里按同样的公式在 Python 里复算。"""
    js = (DEMO_JS_DIR / "umr.js").read_text(encoding="utf-8")
    note = UMR_NOTE.read_text(encoding="utf-8")

    # 仓库默认参数
    for line in (
        "var N_POINTS = 4096;",
        "var LAMBDA_E = 0.4;",
        "var REP_R = 0.035; // m",
        "var TAU_C = 0.1; // m",
        "var MU = 0.01;",
        "var ETA = 0.15;",
    ):
        assert line in js

    # 例 1：Edge 项，正确对应 vs 左右翻转（Chamfer 都是 0）
    assert "var TOY_H = [[0, 0], [0.1, 0], [0.2, 0]];" in js
    assert "var TOY_R = [[0, 0], [0.1, 0.02], [0.2, 0.02]];" in js
    h = [(0, 0), (0.1, 0), (0.2, 0)]
    r = [(0, 0), (0.1, 0.02), (0.2, 0.02)]

    def edge(d):
        return sum((d[a][0] - d[b][0]) ** 2 + (d[a][1] - d[b][1]) ** 2 for a, b in ((0, 1), (1, 2))) / 2

    ok = edge([(r[i][0] - h[i][0], r[i][1] - h[i][1]) for i in range(3)])
    flip = edge([(r[2 - i][0] - h[i][0], r[2 - i][1] - h[i][1]) for i in range(3)])
    assert _fmt(ok, 4) == "0.0002" and _fmt(flip, 4) == "0.0402"
    assert _fmt(0.4 * flip, 5) == "0.01608"
    assert _fmt(flip / ok, 0) == "201"
    assert "0.0402/0.0002=201" in note
    assert _fmt(math.exp(-((0.01 / 0.035) ** 2)), 3) == "0.922"
    assert _fmt(math.exp(-4), 3) == "0.018"

    # 例 2：位置 + 法向
    assert "var POSE_DX = [-0.02, 0.03, -0.05];" in js
    pos = 0.02**2 + 0.03**2 + 0.05**2
    nrm = 2 * (1 - math.cos(math.radians(10)))
    assert _fmt(pos, 4) == "0.0038" and _fmt(nrm, 4) == "0.0304"
    assert _fmt(pos + 0.1 * nrm, 5) == "0.00684"
    assert _fmt(math.sqrt(0.1 * nrm) * 100, 1) == "5.5"
    assert "=0.00684" in note and "5.5 cm" in note

    # 例 3：接触
    assert "var CT_XR = [0.5, 0.09, 0.84];" in js
    assert _fmt(math.hypot(0.06, 0.04), 4) == "0.0721"
    assert "$0.0721$ m" in note

    # 例 4：一步阻尼约束 GN
    assert "var GN_J = [[0.4, 0.1], [0.0, 0.3]];" in js
    assert "var GN_R = [0.06, -0.03];" in js

    def step(lam):
        a, b, d = 0.16 + lam, 0.04, 0.10 + lam
        g0, g1 = 0.024, -0.003
        det = a * d - b * b
        return (-(d * g0 - b * g1) / det, -(-b * g0 + a * g1) / det)

    def res(dq):
        return math.hypot(0.06 + 0.4 * dq[0] + 0.1 * dq[1], -0.03 + 0.3 * dq[1])

    lo, hi = 0.0, 10.0
    for _ in range(100):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if math.hypot(*step(0.01 + mid)) > 0.15 else (lo, mid)
    damp, tr = step(0.01), step(0.01 + hi)
    assert (_fmt(damp[0], 4), _fmt(damp[1], 4)) == ("-0.1614", "0.0860")
    assert (_fmt(tr[0], 4), _fmt(tr[1], 4)) == ("-0.1362", "0.0628")
    assert _fmt(hi, 4) == "0.0246"
    assert _fmt(res(damp), 4) == "0.0058" and _fmt(res(tr), 4) == "0.0162"
    assert _fmt(-(0.2 * tr[0] - 0.1 * tr[1]), 4) == "0.0335"
    for s in ("$(-0.1362,\\ 0.0628)$", "\\lambda\\approx0.0246", "$0.0162$", "0.0335"):
        assert s in note, s

    # 例 5：Table I 串行合成、Table IV 降幅
    assert "var E2E_FPS = 1000 / (PREP_MS + SOLVE_MS);" in js
    assert _fmt(9.83 + 5.58 + 10.38, 2) == "25.79"
    assert _fmt(1000 / (1000 / 141.46 + 1000 / 121.26), 2) == "65.29"
    assert _fmt(1800 / 65.29, 1) == "27.6"
    assert _fmt((1.030 - 0.570) / 1.030 * 100, 1) == "44.7"
    assert _fmt((1.396 - 0.619) / 1.396 * 100, 1) == "55.7"
    assert _fmt((1.043 - 0.630) / 1.043 * 100, 1) == "39.6"
    for s in ("$25.79$ s", "$65.29$ FPS", "$44.7\\%$", "$55.7\\%$", "$39.6\\%$"):
        assert s in note, s
    assert "## 🎬 八幕动画：UMR 全流程" in note
    assert "## 🧮 数据计算实例" in note


def test_diffusion_policy_explainer_numbers_come_from_the_config():
    """七幕动画不许手写换算结果：丢掉的步数、DDIM 加速倍数都得现算。"""
    js = (DEMO_JS_DIR / "diffusion_policy.js").read_text(encoding="utf-8")
    note = DIFFUSION_POLICY_NOTE.read_text(encoding="utf-8")

    assert "var H = 16;" in js
    assert "var TA = 8;" in js
    assert "var DISCARD = H - TA;" in js
    assert 16 - 8 == 8

    assert "var TRAIN_K = 100;" in js
    assert "var INFER_K = 10;" in js
    assert "var INFER_HI = 20;" in js
    assert "var SPEEDUP = TRAIN_K / INFER_K;" in js
    assert 100 / 10 == 10

    assert "var N_OBS = 2;" in js
    assert "var N_TASKS = 15;" in js
    assert "var LIFT_PCT = 46.9;" in js

    assert "46.9%" in note
    assert "15 个" in note
    assert "## 🎬 七幕动画：Diffusion Policy 全流程" in note


def test_beyondmimic_explainer_numbers_come_from_the_config():
    """八幕动画不许手写换算结果：视野秒数、PD 时间常数、参数量、偏好差值都得现算。"""
    js = (DEMO_JS_DIR / "beyondmimic.js").read_text(encoding="utf-8")
    note = BEYONDMIMIC_NOTE.read_text(encoding="utf-8")

    # 阶段 1 的 MDP：ω_n / ζ 是论文给的，k_d/k_p 必须现除（ω_n 要先换成 rad/s）
    assert "var OMEGA_HZ = 10," in js
    assert "ZETA = 2;" in js
    assert "var PD_RATIO_S = (2 * ZETA) / (2 * Math.PI * OMEGA_HZ);" in js
    assert _fmt(4 / (2 * math.pi * 10), 3) == "0.064"

    # 奖励项数：4 项跟踪 + 3 项正则，总数现加
    assert "var N_TRACK = 4," in js
    assert "N_REG = 3;" in js
    assert "var N_TERMS = N_TRACK + N_REG;" in js
    assert "var N_DR = 3;" in js
    assert 4 + 3 == 7

    # 自适应采样：分钟级参考的箱数与均匀概率现算
    assert "var REF_MIN = 3," in js
    assert "BIN_S = 1;" in js
    assert "var REF_BINS = (REF_MIN * 60) / BIN_S;" in js
    assert "var UNIFORM_PCT = 100 / REF_BINS;" in js
    assert (3 * 60) // 1 == 180
    assert _fmt(100 / 180, 2) == "0.56"

    # 阶段 2：H / f 现除。论文把跟踪策略降到 25 Hz 部署，所以 16/25 才是 0.64 s
    assert "var HZ = 16;" in js, "视野应复用 guidance 演示里的 H"
    assert "var CTRL_HZ = 25;" in js
    assert "var HORIZON_S = HZ / CTRL_HZ;" in js
    assert 16 / 25 == 0.64
    assert "var DENOISE_K = 20;" in js
    assert "var INFER_MS = 20;" in js
    assert "var CTRL_MS = 1000 / CTRL_HZ;" in js
    assert "var INFER_LOAD = INFER_MS / CTRL_MS;" in js
    assert 1000 / 25 == 40 and 20 / 40 == 0.5

    # Transformer：层数 × 12d²（注意力 4d² + FFN 8d²），只含隐层权重
    assert "var TF_LAYERS = 6," in js
    assert "TF_HEADS = 8," in js
    assert "TF_DIM = 512;" in js
    assert "var TF_PARAM_M = (TF_LAYERS * 12 * TF_DIM * TF_DIM) / 1e6;" in js
    assert _fmt(6 * 12 * 512 * 512 / 1e6, 2) == "18.87"
    assert "**只含注意力与 FFN 的权重**" in js, "动画要说明这不是论文那个 ≈19.8M"

    # 状态表示消融：摇杆任务上的差值现减
    assert "var BP_PERTURB = 100," in js
    assert "BP_JOY = 80," in js
    assert "JR_PERTURB = 72," in js
    assert "JR_JOY = 0;" in js
    assert "var JOY_GAP = BP_JOY - JR_JOY;" in js
    assert 80 - 0 == 80

    # 用户研究：偏好差值是 2p − 100 现减，不是抄一份
    assert "var PREF_ALL = 70.8," in js
    assert "PREF_WALK = 57.0," in js
    assert "PREF_RUN = 84.7;" in js
    assert "var GAP_ALL = PREF_ALL - (100 - PREF_ALL);" in js
    assert "var GAP_WALK = PREF_WALK - (100 - PREF_WALK);" in js
    assert "var GAP_RUN = PREF_RUN - (100 - PREF_RUN);" in js
    assert _fmt(70.8 - 29.2, 1) == "41.6"
    assert _fmt(57.0 - 43.0, 1) == "14.0"
    assert _fmt(84.7 - 15.3, 1) == "69.4"

    # 笔记必须和动画说同一套数
    assert "## 🎬 八幕动画：BeyondMimic 全流程" in note
    assert "$16/25 = $ 约 **0.64 s**" in note
    assert "**25 Hz**" in note
    assert "约 **19.8M** 参数" in note
    assert "**8** 头" in note
    assert "Transformer **encoder**" in note
    assert "走路 57.0% vs 43.0%" in note
    assert "潜维度 | **32**" in note


def test_groot_explainer_uses_the_paper_tables_and_the_code_sign():
    """GR00T 的动画数字必须从论文表格和开源流匹配符号现算，不能回到旧提纲。

    旧笔记把仿真写成 Isaac Lab、把 120 Hz 写成整网前向、把例子写成去厨房拿苹果。
    现在的笔记和动画要钉住：动作块 63.9 ms、速度目标是 A−ε、Table 2/3 按任务数加权。
    """
    js = (DEMO_JS_DIR / "groot.js").read_text(encoding="utf-8")
    note = GROOT_NOTE.read_text(encoding="utf-8")

    assert "var SYS2_HZ = 10," in js
    assert "SYS1_HZ = 120," in js
    assert "CHUNK = 16," in js
    assert "INFER_MS = 63.9;" in js
    assert "var CHUNK_MS = CHUNK * ACTION_MS;" in js
    assert "var TOY_V = TOY_A - TOY_EPS;" in js
    assert "velocity = actions - noise" in js
    assert "function wavg(rates, counts)" in js
    assert "var GR1_GAP = GR_SIM[2] - DP_SIM[2];" in js
    assert "var GAP_DATA = PAPER_REAL.dpFull - PAPER_REAL.gr10;" in js

    assert abs((16 * (1000 / 120)) - (16 / 120 * 1000)) < 1e-9
    assert _fmt(50.0 - 32.7, 1) == "17.3"
    assert _fmt(46.4 - 42.6, 1) == "3.8"
    assert _fmt(42.6 - 10.2, 1) == "32.4"
    assert _fmt(76.8 - 46.4, 1) == "30.4"
    gr_w = (32.1 * 24 + 66.5 * 9 + 50.0 * 24) / 57
    assert _fmt(gr_w, 2) == "45.07"
    real_w = (82.0 * 5 + 70.9 * 3 + 70.0 * 3 + 82.5 * 2) / 13
    assert _fmt(real_w, 2) == "76.75"
    assert _fmt(827 / 88, 1) == "9.4"
    assert _fmt(6500 / 11, 0) == "591"

    assert "63.9" in note
    assert "第 12 层" in note
    assert "DexMimicGen" in note
    assert "76.8" in note
    assert "Fourier GR-1" in note
    assert "actions - noise" in note
    assert "去厨房" not in note
    assert "Jetson" not in note
    assert "120 Hz 是动作率" in note or "120 Hz 是这 16 步的播放节拍" in note


def test_php_explainer_and_worked_example_share_the_same_numbers():
    """PHP 八幕动画与笔记「🚶 具体实例」是同一组数：弹簧、最近邻、课程、延迟与表格均值都现算。"""
    js = (DEMO_JS_DIR / "php.js").read_text(encoding="utf-8")
    note = PHP_NOTE.read_text(encoding="utf-8")

    # 论文给的量（附录 A-1、§III-B、Table VI）
    for line in (
        "var FEAT_TRAJ = 12;",
        "var FEAT_FOOT = 12;",
        "var FEAT_ROOT = 3;",
        "var HORIZONS = [0.33, 0.67, 1.0];",
        "var TOTAL_ITERS = 20000;",
        "var LAMBDA_FLOOR = 0.1;",
        "var DEPTH_H = 58,",
        "var SPRING_Y = 4;",
        "var QUERY = [FUT_P[2], 3.0, V0];",
    ):
        assert line in js, line
    assert 12 + 12 + 3 == 27

    # 例 1：临界阻尼弹簧（式 4 / 5），y = 4 是示意值
    y = 4.0

    def val(s0, sd0, goal, tau):
        j0 = s0 - goal
        j1 = sd0 + y * j0
        return math.exp(-y * tau) * (j0 + tau * j1) + goal

    def pos(s0, sd0, goal, tau):
        j0 = s0 - goal
        j1 = sd0 + y * j0
        e = math.exp(-y * tau)
        return -j1 / y**2 * e + (-j0 - tau * j1) / y * e + j1 / y**2 + j0 / y + goal * tau

    taus = (0.33, 0.67, 1.0)
    assert [_fmt(val(1, 0, 2, t), 2) for t in taus] == ["1.38", "1.75", "1.91"]
    assert [_fmt(pos(1, 0, 2, t), 2) for t in taus] == ["0.38", "0.92", "1.53"]
    assert _fmt(pos(1, 0, 2, 0.33), 4) == "0.3817"
    assert [_fmt(val(0, 0, 45, t), 1) for t in taus] == ["17.1", "33.6", "40.9"]
    assert "=0.3817$ m" in note
    assert "17.1°、33.6°、40.9°" in note

    # 例 2：三维玩具特征上的最近邻
    q = (pos(1, 0, 2, 1.0), 3.0, 1.0)

    def d2(a, b):
        return sum((x - z) ** 2 for x, z in zip(a, b, strict=True))

    assert _fmt(d2(q, (1.0, 2.6, 1.0)), 4) == "0.4382"
    assert _fmt(d2(q, (1.55, 3.1, 1.2)), 4) == "0.0505"
    assert _fmt(d2((2.0, 4.3, 2.0), (2.0, 4.8, 2.0)), 2) == "0.25"
    assert _fmt(d2((2.0, 4.3, 2.0), (2.0, 0.4, 2.0)), 2) == "15.21"
    assert _fmt(d2((2.0, 0.3, 2.0), (2.0, 4.8, 2.0)), 2) == "20.25"
    assert _fmt(d2((2.0, 0.3, 2.0), (2.0, 0.4, 2.0)), 2) == "0.01"
    for s in ("=0.4382$", "**0.0505**", "**0.25**", "15.21", "20.25", "**0.01**"):
        assert s in note, s

    # Table III：技能库时长
    skills = (2.2, 12.1, 8.8, 10.3, 1.6, 6.1, 4.4, 5.2, 5.9, 5.0, 3.1, 1.5)
    assert _fmt(sum(skills), 1) == "66.2"
    assert _fmt(sum(skills) / (sum(skills) + 495.5) * 100, 1) == "11.8"
    assert "=11.8\\%$" in note

    # 例 3：高斯跟踪奖励（Table IV，σ = 0.3）
    assert _fmt(math.exp(-(0.15**2) / 0.3**2), 3) == "0.779"
    assert _fmt(math.exp(-1), 3) == "0.368"

    # 例 4：课程 λ_D(k) = max(0.1, 1 − k/(K/2))；λ_PPO > 0.1 ⇔ k > 1000，与 Table VI 对上
    def lam(k):
        return max(0.1, 1 - k / 10000)

    assert [round(lam(k), 3) for k in (0, 1000, 5000, 9000, 20000)] == [1.0, 0.9, 0.5, 0.1, 0.1]
    assert "var ADAPT_ITER = Math.round((TOTAL_ITERS / 2) * LAMBDA_FLOOR);" in js
    assert round(10000 * 0.1) == 1000
    assert "adaptive after 1000 iterations" in note
    assert _fmt((1.2 - 1.0) ** 2, 2) == _fmt((0.8 - 1.0) ** 2, 2) == "0.04"

    # 例 5：深度与延迟
    assert 58 * 87 == 5046
    assert (_fmt(3 * 0.06, 2), _fmt(3 * 0.08, 2)) == ("0.18", "0.24")
    assert "0.18–0.24 m" in note and "5046" in note

    # Table I / II 的六任务平均；0.735、0.925、0.615 正好落在舍入边界，所以 Table II 用三位
    t1 = {
        "vel": (1, 0, 0, 1, 0, 0),
        "e2e": (0.95, 0.07, 0.08, 0.78, 0.19, 0.14),
        "ours": (1, 0.99, 0.95, 1, 0.99, 0.95),
    }
    assert [_fmt(sum(v) / 6, 2) for v in t1.values()] == ["0.33", "0.37", "0.98"]
    assert _fmt(sum((0.16, 0.03, 0.12, 0.63, 0.09, 0.10)) / 6, 3) == "0.188"
    assert _fmt(sum((0.99, 0.95, 1.00, 1.00, 0.98, 0.90)) / 6, 3) == "0.970"
    assert "fmt(T2_MEAN[k], 3)" in js
    for s in ("**0.98**", "**只用 DAgger 0.188**", "**PHP 0.970**", "0.925"):
        assert s in note, s

    # 真机换算
    assert _fmt(2.53 * 0.8, 2) == "2.02"
    assert _fmt(2 / 1.3 * 100, 0) == "154"
    assert _fmt(1.25 / 1.3 * 100, 0) == "96"
    assert "## 🎬 八幕动画：PHP 全流程" in note
    assert "## 🚶 具体实例" in note


def test_pbfm_explainer_and_worked_example_share_the_same_numbers():
    """Perceptive BFM 七幕动画与笔记「🚶 具体实例」是同一组数：MPPI、根高度、对齐与 Table IV 都现算。"""
    js = (DEMO_JS_DIR / "pbfm.js").read_text(encoding="utf-8")
    note = PBFM_NOTE.read_text(encoding="utf-8")

    # 观测契约与仓库默认参数
    for line in (
        "var SCAN_X = 1.6,",
        "var CONTACT_Z = 0.06; // m",
        "var CONTACT_V = 0.5; // m/s",
        "var MPPI_SAMPLES = 128;",
        "var MPPI_TEMP = 0.1;",
        "var W_TRACK = 10;",
        "var W_TERRAIN = 1000;",
        "var W_SMOOTH = 10;",
        "var H_CLEAR = 0.03;",
        "var ALPHA_UP = 0.5,",
        "MAX_DZ = 0.035;",
        "var LEG_JOINTS = 12;",
    ):
        assert line in js, line
    assert (round(1.6 / 0.1) + 1) * (round(1.0 / 0.1) + 1) == 187
    assert 3 + 3 + 3 + 29 == 38 and 3 + 3 + 3 * 29 == 93
    assert "17\\times11=187" in note

    # 例 1：五个密集点上的 MPPI 打分
    phi = (0, 0.25, 0.5, 0.75, 1)
    terr = (0, 0, 0.15, 0.15, 0.15)
    bump = (0, 0.05, 0.08, 0.05, 0)
    ref = [0.15 * p + b for p, b in zip(phi, bump, strict=True)]
    floor = [t + 2 * 0.03 * math.sin(math.pi * p) ** 2 for t, p in zip(terr, phi, strict=True)]
    cands = [ref, [0, 0.11, 0.215, 0.19, 0.15], [0, 0.16, 0.30, 0.25, 0.15]]
    assert "var BUMP = [0, 0.05, 0.08, 0.05, 0];" in js
    assert "{ id: 'B', t: '抬高一些', z: [0, 0.11, 0.215, 0.19, 0.15] }" in js

    def cost(z):
        track = 10 * sum((a - b) ** 2 for a, b in zip(z, ref, strict=True))
        terrain = 1000 * sum(max(f - a, 0) ** 2 for f, a in zip(floor, z, strict=True))
        smooth = 10 * sum((z[i + 1] - 2 * z[i] + z[i - 1]) ** 2 for i in range(1, 4))
        return track + terrain + smooth

    costs = [cost(z) for z in cands]
    assert [_fmt(c, 3) for c in costs] == ["3.375", "0.220", "0.729"]

    def weights(temp):
        w = [math.exp(-(c - min(costs)) / temp) for c in costs]
        return [x / sum(w) for x in w]

    assert [_fmt(w, 3) for w in weights(0.1)] == ["0.000", "0.994", "0.006"]
    assert [_fmt(w, 3) for w in weights(1.0)] == ["0.026", "0.608", "0.366"]
    mid1 = sum(w * z[2] for w, z in zip(weights(1.0), cands, strict=True))
    assert _fmt(mid1, 3) == "0.245"
    assert _fmt(floor[2] - ref[2], 3) == "0.055"
    for s in ("**3.375**", "**0.220**", "**0.729**", "0.994", "36.6%", "0.245 m", "低 5.5 cm"):
        assert s in note, s

    # 例 2：支撑感知根高度 + 规划器里的限速滤波
    def root(wl, wr):
        return (wl * (0.15 + 0.72) + wr * 0.72) / (wl + wr)

    assert (_fmt(root(0.5, 0.5), 3), _fmt(root(0.8, 0.2), 3)) == ("0.795", "0.840")
    z, seq = 0.72, []
    for _ in range(5):
        a = 0.5 if 0.795 > z else 0.35
        z += max(-0.035, min(0.035, a * (0.795 - z)))
        seq.append(_fmt(z, 4))
    assert seq == ["0.7550", "0.7750", "0.7850", "0.7900", "0.7925"]
    assert _fmt(0.035 * 30, 2) == "1.05"
    assert _fmt(0.251 + 0.494 + 0.06, 3) == "0.805"
    for s in ("**0.795 m**", "**0.840 m**", "**0.755**", "**0.7925**", "1.05", "**18 行**"):
        assert s in note, s

    # 例 3：目标系对齐（式 10）
    assert "var A_STAR = Q_TCRS + MU_TEA - Q_RAW;" in js
    assert _fmt(0.62 + 0.05 - 0.30, 2) == "0.37"
    assert _fmt((0.62 + 0.05) - (0.30 + 0.05), 2) == "0.32"
    assert "**0.37 rad**" in note and "**差 0.32 rad**" in note

    # 例 4：门控
    assert [_fmt(math.tanh(a), 3) for a in (0.25, 0.5, 1.0)] == ["0.245", "0.462", "0.762"]

    # Table I / IV 换算：每类地形 90 次，合计 248 / 123，碰撞 45 / 111
    assert _fmt((5.48 - 2.38) / 5.48 * 100, 1) == "56.6"
    assert _fmt((14.3 - 7.4) / 14.3 * 100, 1) == "48.3"
    pmt = ((53.3, 25.6, 21.1, 11.1), (66.7, 15.6, 17.8, 5.6), (42.2, 33.3, 24.4, 15.6),
           (52.2, 26.7, 21.1, 10.0), (61.1, 17.8, 21.1, 7.8))
    raw = ((24.4, 47.8, 27.8, 26.7), (35.6, 37.8, 26.7, 17.8), (17.8, 55.6, 26.7, 33.3),
           (25.6, 46.7, 27.8, 24.4), (33.3, 41.1, 25.6, 21.1))
    for row in pmt + raw:
        assert sum(round(x * 0.9) for x in row[:3]) == 90
    assert sum(round(r[0] * 0.9) for r in pmt) == 248
    assert sum(round(r[0] * 0.9) for r in raw) == 123
    assert sum(round(r[3] * 0.9) for r in pmt) == 45
    assert sum(round(r[3] * 0.9) for r in raw) == 111
    for s in ("**248 / 450 = 55.1%**", "**123 / 450 = 27.3%**", "**45 vs 111**", "$-56.6\\%$"):
        assert s in note, s
    assert "## 🎬 七幕动画：Perceptive BFM 全流程" in note
    assert "## 🚶 具体实例" in note
    assert "## 📁 源码对照" in note


def test_gentle_explainer_and_worked_example_share_the_same_numbers():
    """GentleHumanoid 七幕动画与笔记「🚶 具体实例」是同一组数：参考动力学积分、平衡点、阈值与奖励都现算。"""
    js = (DEMO_JS_DIR / "gentle.js").read_text(encoding="utf-8")
    note = GENTLE_NOTE.read_text(encoding="utf-8")

    # 附录 Table II / III 与训练仓库的参数
    for line in (
        "var MASS = 0.1; // kg",
        "var DAMP = 2.0;",
        "var DT = 0.005;",
        "var SUBSTEPS = 4;",
        "var KP_DIST = 0.05;",
        "var F_MAX = 30;",
        "var DELTA_TOL = 10;",
        "var N_POSTURES = 5414;",
        "var MODE_P = [0.4, 0.15, 0.15, 0.15, 0.15];",
        "var ANCHOR = 0.15; // m（示意）",
        "var KS = 150; // N/m（示意，在 5–250 范围内）",
    ):
        assert line in js, line

    mass, damp, dt, anchor, ks = 0.1, 2.0, 0.005, 0.15, 150.0

    def kp(tau):
        return tau / 0.05

    def kd(tau):
        return 2 * math.sqrt(mass * kp(tau))

    def clip(f, m):
        return max(-m, min(m, f))

    def simulate(tau, steps):
        x = v = 0.0
        out = []
        for _ in range(steps):
            fd = clip(kp(tau) * (0 - x) + kd(tau) * (0 - v), tau)
            fe = clip(ks * max(anchor - x, 0.0), 30.0)
            a = clip((fd + fe - damp * v) / mass, 1000.0)
            v = clip(v + a * dt, 4.0)
            x = x + v * dt
            out.append((fd, fe, a, v, x))
        return out

    assert _fmt(kp(10), 0) == "200" and _fmt(kd(10), 3) == "8.944"
    step1 = simulate(10, 4)
    assert [_fmt(r[1], 2) for r in step1] == ["22.50", "21.66", "20.46", "18.99"]
    assert [_fmt(r[3], 3) for r in step1] == ["1.125", "1.595", "1.959", "2.212"]
    assert [_fmt(r[4], 4) for r in step1] == ["0.0056", "0.0136", "0.0234", "0.0345"]
    assert _fmt(-200 * 0.005625 - kd(10) * 1.125, 2) == "-11.19"
    run = simulate(10, 400)
    assert _fmt(run[7][4] * 100, 2) == "8.11" and _fmt(run[11][4] * 100, 2) == "11.27"
    assert _fmt(run[-1][4] * 100, 2) == "8.33"
    for s in ("**0.0345**", "−11.19", "8.11 cm", "11.27 cm", "**8.33 cm**"):
        assert s in note, s

    # 平衡点：驱动力截断后接触力 = τ_safe
    def eq(tau):
        free = ks * anchor / (kp(tau) + ks)
        return free if kp(tau) * free <= tau + 1e-9 else anchor - tau / ks

    assert [_fmt(eq(t) * 100, 1) for t in (5, 10, 15)] == ["11.7", "8.3", "5.0"]
    assert _fmt(ks * anchor / (kp(10) + ks) * 100, 2) == "6.43"
    assert _fmt(kp(10) * ks * anchor / (kp(10) + ks), 2) == "12.86"
    assert _fmt(ks * anchor, 1) == "22.5"
    for s in ("**11.7 cm**", "**8.3 cm**", "**5.0 cm**", "**22.5 N**", "6.43 cm", "12.86 N"):
        assert s in note, s

    # 奖励核（代码是 exp(-e/σ)，多个 σ 取平均）与压强换算
    assert _fmt(math.exp(-0.02 / 0.3), 3) == "0.936"
    assert _fmt((math.exp(-2 / 8) + math.exp(-2 / 4)) / 2, 3) == "0.693"
    assert _fmt(15 / 0.25, 0) == "60"
    assert (_fmt(5 / 16 * 10, 1), _fmt(15 / 16 * 10, 1)) == ("3.1", "9.4")
    assert _fmt(100e3 * 36e-6, 1) == "3.6"
    assert _fmt(51.14 / 24.59, 2) == "2.08"
    assert _fmt(0.15 * 6 + 0.30 * 3 + 0.15 * 1, 2) == "1.95"
    assert _fmt(0.15 * 6 + 0.15 * 3 * 2 + 0.15 * 6 * 0.5, 2) == "2.25"
    for s in ("0.936", "0.693", "60 N/cm²", "3.1–9.4 kPa", "3.6 N", "2.08 倍", "| 1.95 |", "| 2.25 |"):
        assert s in note, s
    assert "## 🎬 七幕动画：GentleHumanoid 全流程" in note
    assert "## 🚶 具体实例" in note
    assert "## 📁 源码对照" in note
