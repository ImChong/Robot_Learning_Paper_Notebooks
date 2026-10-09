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
TRANSFORMER_NOTE = _note("Transformer_Attention_Is_All_You_Need")
SMP_NOTE = _note("SMP_Reusable_Score-Matching_Motion_Priors")
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


def _high_impact_note(folder: str) -> Path:
    """papers/03_High_Impact_Selection/<folder>/<folder>.md"""
    return ROOT / "papers" / "03_High_Impact_Selection" / folder / f"{folder}.md"


PI0_NOTE = _high_impact_note("Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control")
PI05_NOTE = _high_impact_note("Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization")
SOCCER_NOTE = _high_impact_note("Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL")
QUAD_NOTE = _high_impact_note("Learning_Quadrupedal_Locomotion_over_Challenging_Terrain")
RH_NOTE = _high_impact_note("Real-World_Humanoid_Locomotion_with_RL")
ASAP_NOTE = _high_impact_note("ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills")
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
HUMANML3D_NOTE = ROOT / "papers" / "14_Human_Motion" / "HumanML3D" / "HumanML3D.md"
INEKF_NOTE = (
    ROOT
    / "papers"
    / "09_State_Estimation"
    / "Contact-Aided_Invariant_EKF_for_Legged_Robots"
    / "Contact-Aided_Invariant_EKF_for_Legged_Robots.md"
)
BH_NOTE = (
    ROOT
    / "papers"
    / "12_Hardware_Design"
    / "Berkeley_Humanoid_A_Research_Platform_for_Learning-based_Control"
    / "Berkeley_Humanoid_A_Research_Platform_for_Learning-based_Control.md"
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
        PPO_NOTE: ("ppo", ["ppo-explainer", "ppo-video", "ppo-gae", "ppo-clip", "ppo-epochs", "ppo-curves"]),
        AWR_NOTE: ("awr", ["awr-explainer", "awr-video", "awr-weights", "awr-buffer", "awr-regression"]),
        DEEPMIMIC_NOTE: (
            "deepmimic",
            [
                "deepmimic-explainer",
                "deepmimic-video",
                "deepmimic-reward",
                "deepmimic-rsi",
                "deepmimic-curves",
                "deepmimic-pd",
            ],
        ),
        AMP_NOTE: (
            "amp",
            ["amp-explainer", "amp-video", "amp-disc", "amp-reward", "amp-style", "amp-curves"],
        ),
        ADD_NOTE: (
            "add",
            ["add-explainer", "add-video", "add-diff", "add-reward", "add-curriculum"],
        ),
        ASE_NOTE: (
            "ase",
            ["ase-explainer", "ase-video", "ase-latent", "ase-encoder", "ase-diversity"],
        ),
        CALM_NOTE: (
            "calm",
            ["calm-explainer", "calm-video", "calm-encoder", "calm-hlc", "calm-fsm"],
        ),
        PULSE_NOTE: (
            "pulse",
            ["pulse-explainer", "pulse-video", "pulse-vib", "pulse-prior", "pulse-downstream"],
        ),
        PHC_NOTE: (
            "phc",
            ["phc-explainer", "phc-video", "phc-pmcp", "phc-mcp", "phc-recovery"],
        ),
        DIFFUSION_POLICY_NOTE: (
            "diffusion_policy",
            ["dp-explainer", "dp-video", "dp-multimodal", "dp-denoise", "dp-rhc"],
        ),
        BEYONDMIMIC_NOTE: (
            "beyondmimic",
            ["bm-explainer", "bm-video", "bm-anchor", "bm-impedance", "bm-sampling", "bm-guidance"],
        ),
        LCP_NOTE: ("lcp", ["lcp-explainer", "lcp-video", "lcp-sensitivity", "lcp-gp", "lcp-table"]),
        SMP_NOTE: ("smp", ["smp-explainer", "smp-video", "smp-sds", "smp-esm", "smp-style"]),
        DR_VISION_NOTE: (
            "domain_randomization",
            ["dr-explainer", "dr-video", "dr-scene", "dr-coverage", "dr-ablation"],
        ),
        DR_THEORY_NOTE: ("dr_theory", ["drt-gap", "drt-memory", "drt-sysid"]),
        MIMICKIT_NOTE: (
            "mimickit",
            ["mimickit-family", "mimickit-reward", "mimickit-config"],
        ),
        SONIC_NOTE: ("sonic", ["sonic-explainer", "sonic-video"]),
        GROOT_NOTE: ("groot", ["groot-explainer", "groot-video", "groot-timing", "groot-flow", "groot-results"]),
        COSMOS_NOTE: ("cosmos", ["cosmos-explainer", "cosmos-video", "cosmos-data", "cosmos-tokens", "cosmos-physics"]),
        GMR_NOTE: ("gmr", ["gmr-explainer", "gmr-video"]),
        OMNI_NOTE: ("omniretarget", ["omniretarget-explainer", "omniretarget-video"]),
        UMR_NOTE: ("umr", ["umr-explainer"]),
        PHP_NOTE: ("php", ["php-explainer"]),
        PBFM_NOTE: ("pbfm", ["pbfm-explainer"]),
        GENTLE_NOTE: ("gentle", ["gentle-explainer"]),
        HUMANML3D_NOTE: ("humanml3d", ["humanml3d-explainer", "humanml3d-video"]),
        TRANSFORMER_NOTE: ("transformer", ["tf-explainer", "tf-video"]),
        PI0_NOTE: ("pi0", ["pi0-explainer", "pi0-video"]),
        PI05_NOTE: ("pi05", ["pi05-explainer", "pi05-video"]),
        SOCCER_NOTE: ("op3soccer", ["soccer-explainer", "soccer-video", "soccer-filter", "soccer-lambda", "soccer-pool"]),
        QUAD_NOTE: ("quadterrain", ["qt-explainer", "qt-video", "qt-ftg", "qt-curriculum", "qt-memory"]),
        RH_NOTE: ("realhumanoid", ["rh-explainer", "rh-video", "rh-context", "rh-reward", "rh-dr"]),
        ASAP_NOTE: ("asap", ["asap-explainer", "asap-video", "asap-delta", "asap-tables", "asap-ablation"]),
        INEKF_NOTE: ("inekf", ["inekf-explainer", "inekf-video", "inekf-linearize", "inekf-banana", "inekf-converge"]),
        BH_NOTE: ("berkeley_humanoid", ["bh-explainer", "bh-video", "bh-armature", "bh-actuator", "bh-dr"]),
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
    "gentle", "lcp", "transformer", "pi0", "pi05", "op3soccer", "smp", "humanml3d",
    "domain_randomization", "quadterrain", "realhumanoid", "asap", "inekf", "berkeley_humanoid",
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
# DDIM 加速 / receding horizon / 定量证据与局限），「扩散过程」和「一次吐多长」
# 是两件独立的事，视觉条件与 DDIM 加速也是，压进五幕会让 chunking、FiLM 和 RHC 抢同一帧。
# BeyondMimic 是十二件（两个缺口 / 锚定跟踪 / 奖励 / 观测 / 动作与关节阻抗 / 随机化与部署延迟 / 自适应采样 /
# 跟踪上真机 / VAE 潜空间 / 状态—潜动作扩散 / 代价引导 / 测试时的任务与边界）。v4 的方法节按 MDP 的组成一块一块写：
# 跟踪目标（锚定）、奖励（表 S1）、观测与动作（Rot6D、历史的消融，按电机惯量算的阻抗与表 S3 / S4）、随机化（表 S2）、
# 自适应采样，各有自己的公式和图 8 的一组消融，所以第 2–7 幕一块一幕；「观测」和「阻抗」在正文同属一节，但前者的证据是
# 图 8A 的朝向 / 历史两行、后者是 armature 一行与图 S2，合成一幕会让两组柱子抢同一帧；随机化和延迟同属「仿真建对、系统做好」。
# 第二阶段的 VAE（为什么要潜空间、5% 对 95%）与扩散（轨迹结构、逐元素噪声、OU 误差带、25 Hz 的时间账）是两个训练阶段，
# 引导（贝叶斯拆分与三个代价）又是推理时的事；结果按正文一节一幕：跟踪的敏捷与自然（图 3、图 4），引导的三类任务与局限。
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
# LCP 是十件（仿真里的理想电机 / Lipschitz 与梯度 / 式 4 → 7 / 罚的是 log π 的梯度 / 几行代码接进 PPO /
# 观测、ROA 与罚整段输入 / 命令、奖励与课程 / 三种平滑办法（表 I(a)）/ λ_gp 扫一遍（表 I(b)）/ 四台真机与局限）。
# 方法节四块各一幕：式 1–2 与图 3 是「为什么约束梯度」，式 4–7 是「怎么变成可微的一项」，两者各有一张图
# （圆锥 vs 四行推导）；「罚的是 log π 的梯度」是读懂式 7 的关键，要单独算一个高斯例子；代码与超参数又是一幕。
# 训练设置两幕：观测 / ROA 和表 I(c) 回答「罚哪些输入」，命令 / 奖励 / 课程回答「平滑奖励被拿掉之后还剩什么」。
# 结果按表格一表一幕：表 I(a) 的四种办法、表 I(b) 的五档系数、表 II / III 的四台真机，压成五幕会让四行推导和
# 圆锥、五档柱状和四种办法的柱状抢同一帧。
# GentleHumanoid 是七件（跟踪策略把外力当扰动 / 阻抗参考动力学 / 抵抗与引导两种交互弹簧 /
# 受力暴露的多样性 / 安全力阈值 / 教师—学生与柔顺奖励 / 定量证据与局限）。「交互力长什么样」
# 与「什么时候、在哪几个 link、多硬」是两件事（式 3–4 vs 附录 A 的调度），阈值又有自己的
# 截断公式与 ISO 换算，合并会让 4 个子步的积分表、平衡点表与压强换算挤在同一帧。
# Transformer 是七件（RNN 的串行瓶颈 / 缩放点积注意力手算 / 为什么除以 √d_k / 多头 /
# 位置编码 / 编码器—解码器与因果掩码 / 训练配方与结果）。「一次注意力怎么算」与「为什么要缩放」
# 是两组数（d_k = 4 的手算 vs d_k = 64 的饱和），合成一幕会让权重条和梯度对比抢同一块画面。
# π₀ 是七件（三道坎 / 两套权重 / 分块掩码与 KV 缓存 / 流匹配 / 动作块与推理预算 / 数据与配方 /
# 实验与边界）。「两套权重」回答参数怎么分，「掩码」回答注意力怎么连，二者在附录 B 是分开的两段；
# 「流匹配」和「推理预算」也各有一张图（积分路径 vs 附录 D 的耗时表）。
# π₀.₅ 是七件（开放世界的难题 / 异构数据 / 两层推理 / 离散 + 连续两阶段 / 输入输出与部署 /
# 训练地点数 / 消融）。「两层推理」是推理时的分解，「两阶段」是训练时的分解，合并会把式 (1)
# 和子任务示例挤进一帧；地点数实验与配方消融是论文 §V-B 与 §V-C–E 的两组独立实验。
# OP3 足球是十二件（为什么是足球 / 一步控制 / 踢球教师 / 起身教师 / 按状态蒸馏与 λ / 自博弈 /
# 奖励与安全正则 / 零样本上真机 / 对比脚本控制器 / 定位球与对手意识 / 行为嵌入与价值函数 / 局限与之后）。
# 方法节的两个阶段各有两件独立的事：阶段 1 的踢球教师（未训练对手、终止条件、表 S3 一列）与起身教师
# （关键姿态、指数间隔、条件与奖励符号）是分开训练的两个策略；阶段 2 的蒸馏回答「向谁学」（式 2–3 的 λ），
# 自博弈回答「和谁踢」（对手池、对手编号、图 7），论文也是分开的两段与两组消融。观测与滤波（表 S2、§Environment）
# 撑得起单独一幕；结果按论文的小节一节一幕：表 1 与测法、图 5 的定位球与对手意识、图 4 与图 6 的两种「往里看」。
# 压回七幕会让 λ 曲线和对手池、四项基本功和定位球抢同一帧。
# SMP 是八件（对抗先验不能复用 / 预训练冻结的扩散模型 / SDS 残差当奖励 / ESM 固定三档 /
# AdaNorm 按档归一化 / GSI 生成初始状态 / CFG 与上下半身组合 / 训练闭环、证据与边界）。
# ESM 与 AdaNorm 在论文同属 5.1 节，但一个回答「抽哪一档」（方差，表 5 / 表 7），一个回答
# 「三档怎么加」（量级，表 6），各有一组消融；合成一幕会让 50 档的对数曲线和三档占比条抢同一帧。
# GSI 解决的是 RSI 也要读数据这件事，与奖励无关；风格的 CFG 与组合又是第 8.1 节单独的实验。
# 域随机化（Tobin 2017）也是八件（现实鸿沟与第三条路 / 七项随机化与三种纹理 / 相机不标定 /
# VGG-16 检测器与训练 / 真机定位精度 / 图 4–5 的张数与纹理种数 / 表 2 逐项拿掉 / 真机抓取与之后）。
# 「随机什么」（III-A 的清单）与「相机怎么随机」是两件事：后者有自己的 10 × 5 × 10 cm / 0.1 rad / 5%
# 和桌高固定；「要多少」（图 4、图 5 两条曲线）与「拿掉哪一项」（表 2 的四行三列）是论文 IV-C 里
# 两组独立的消融，合成一幕会让两张对数轴曲线和分组柱抢同一帧。

# 四足野外盲走（Lee 2020）也是九件（野外为什么难 / 相位振荡器 + 足端残差的动作空间 / 特权教师 / 本体学生 /
# 自适应地形课程 / 野外零样本与表 1 / 室内对照 / 记忆长度与踩空反射 / 解码器与局限）。论文的三个支柱（TCN 记忆、
# 特权训练、地形课程）各有一节方法和一组消融，再加上方法节单独的 Motion synthesis（式 11 的样条与 16 维动作），
# 就是第 2–5 幕；结果里「野外 + 地下挑战赛」（表 1）与「室内台阶 / 负重 / 打滑」（图 3）是两类证据，
# 「记忆要多长」（图 5B–D + 图 6 的显著性）与「记忆里装了什么」（图 S2 的解码器）是验证节和分析节的两段，
# 合成一幕会让表 1 的柱子和图 3E 的折线、或者三档消融柱和摩擦曲线抢同一帧。

# 真实世界人形行走（Radosavovic 2024）是十件（全尺寸人形为什么难 / 因果 Transformer / 两步训练 /
# 奖励与命令 / 虚拟弹簧与域随机化 / 户外与实验室 / 自然行走 / 下坡换步态 / 脚被绊住 / 消融与局限）。
# 方法节四块各一幕：网络结构（Model architecture）、训练目标（式 2 与 λ 退火）、奖励与命令（v1 附录的
# 式 3–16 与表 II）、仿真（虚拟弹簧与表 I）；结果按论文的图一图一幕：图 1–2 鲁棒性与厂家对比、图 3–4
# 自然行走、图 5 慢变化（地形改步态）、图 6 快变化（脚被绊住），图 8 的消融和局限收尾。论文的核心主张是
# 「上下文内适应」，图 5 和图 6 是它的两种时间尺度，各有一组神经元分析，合成一幕会让两条神经元曲线、
# 二维散点和热图抢同一帧；奖励表有 14 项，塞进训练那一幕会和式 2、λ 曲线、图 8C 挤在一起。

# ASAP 是十二件（仿真里跳得起来、真机跳不动 / 从人类视频到 G1 参考动作 / 相位跟踪策略 / 上真机录一遍 /
# 残差动作模型 / 冻结 Δ 微调、部署时拿掉 / 开环回放（表 III）/ 闭环微调（表 IV）/ 真机只学脚踝（表 V）/
# 怎么训 Δ（图 10）/ 怎么用 Δ（图 11）/ Δ 学到了什么与局限（图 12、13））。方法节的「采数据」和「训练 Δ」是第 III-A、III-B
# 两节，Δ 的训练和使用（III-B 与 III-C）各有一条式子；结果按论文自己提的 Q1–Q6 一问一幕：Q1–Q3 是第 IV 节的开环、闭环、
# 真机，Q4–Q6 是第 V 节的三组分析。压成十幕会让表 III 与表 IV、或图 11 的四条曲线与图 12 的噪声柱抢同一帧；局限和真机
# 那一幕讲的是同一批约束（坏两台 G1、要动捕、23 自由度要 400 段），并进最后一幕收尾。

# 接触辅助 InEKF（Hartley 等，IJRR 2020）是十二件（为什么要状态估计 / IMU 推、脚踩住、运动学校正 / 线性化点选错 /
# 一个矩阵装下状态 / 误差不看轨迹 / 运动学校正与 H / 看不见的方向 / 不确定性的形状 / IMU 零偏 / 增删接触点 /
# 收敛（图 3、8）/ Cassie 实测（图 9–12））。论文第 5 节的四块各一幕：状态与不变误差（5.1）、过程模型的对数线性（5.2，
# 配图 4）、右不变观测与常数 H（5.3，左右互换与机器人中心是第 10–11 节对它的补充）、可观性（5.4）；第 4 节的入门例子
# 用站立的数值算例单独一幕，因为「QEKF 在估计值上线性化错在哪」要先看见才能懂后面的定理；第 6.4 节的协方差形状、
# 第 7 节的零偏、第 8 节的增删接触各是一节、各有自己的公式；结果按收敛（图 3、8 是同一种做法的仿真与真机）和
# 精度（图 9–12）两幕。合并会让可观性矩阵和香蕉、或零偏的 A 和增删接触的 F、G 抢同一帧。

# Berkeley Humanoid 是十二件（差距从哪来 / 孩子大小的人形 / 执行器直接当关节 / 四种执行器 / EtherCAT 与时序 /
# 可靠又便宜 / 拟人的腿 / 最简的控制器 / 辨识转子惯量与摩擦 / 随机化：硬件窄、环境宽 / 走出实验室 / 仿真与真机对比）。
# 第 3 节是系统概览加四条设计考量，「仿真友好」（3.2）里有两件独立的事：结构（执行器即关节、armature 的 N²）与
# 时序（EtherCAT 的 0.5–2 ms、25 kHz PD），一个讲建模误差、一个讲指令执行，压在一起会让转子惯量的柱子和时间线抢画面；
# 表 2 的四种执行器有自己的十行参数和分工，单独一幕；3.3 的可靠 / 低成本（表 3、表 4）和 3.5 的拟人（表 5）各一幕。
# 第 4 节的控制器（4.1）一幕；4.2 的「辨识」和「随机化多宽」是两步——前者是摩擦曲线与 CAD 的转子惯量，后者是表 6 与
# 窄 / 宽两条带——合成一幕会让 tanh 曲线和包络带挤在同一帧。结果按第 5.1、5.2 节各一幕，5.3 的摔倒记录并进可靠那一幕。
# HumanML3D 是九件（文本生成动作卡在哪 / 数据集怎么建 / 一帧 263 维 / 每 4 帧一个 snippet code /
# Text2Length / 时序 VAE 的一步 / 三项损失与课程学习 / 评测器与 R-Precision / 结果、消融与遗产）。
# 它一篇论文同时交了数据集、方法和评测协议三样东西：数据集的「怎么建」与「每帧存什么」是第 4 节与
# 第 5 节两段；方法里自编码器（§3.1）、长度采样（§3.2）、VAE 结构与训练方案（§3.3 前后两半）各自
# 独立；评测器（附录 B）又是后来被整个领域沿用的贡献，不能和 Table 2 的数字挤在一帧。
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
    "beyondmimic": (BEYONDMIMIC_NOTE, 12),
    "umr": (UMR_NOTE, 8),
    "php": (PHP_NOTE, 8),
    "pbfm": (PBFM_NOTE, 7),
    "gentle": (GENTLE_NOTE, 7),
    "lcp": (LCP_NOTE, 10),
    "transformer": (TRANSFORMER_NOTE, 7),
    "pi0": (PI0_NOTE, 7),
    "pi05": (PI05_NOTE, 7),
    "op3soccer": (SOCCER_NOTE, 12),
    "smp": (SMP_NOTE, 8),
    "domain_randomization": (DR_VISION_NOTE, 8),
    "quadterrain": (QUAD_NOTE, 9),
    "realhumanoid": (RH_NOTE, 10),
    "asap": (ASAP_NOTE, 12),
    "inekf": (INEKF_NOTE, 12),
    "berkeley_humanoid": (BH_NOTE, 12),

    "humanml3d": (HUMANML3D_NOTE, 9),
}
CN_NUMERALS = {4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十", 11: "十一", 12: "十二"}


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
    for helper in ("tex:", "rich:", "svgMath:", "svgRich:"):
        assert helper in kit, f"kit.js 必须导出 {helper} 供各 bundle 复用"

    css = DEMO_CSS.read_text(encoding="utf-8")
    for cls in (".demo-tex", ".demo-x-fo", ".demo-x-tex", ".demo-x-rich"):
        assert cls in css, f"{cls} 需要在 paper-demos.css 里定义"

    for name in EXPLAINER_BUNDLES:
        js = (DEMO_JS_DIR / f"{name}.js").read_text(encoding="utf-8")
        assert "svgMath" in js, f"{name}.js 的分镜公式应该用 K.svgMath 渲染"
        # 字幕轨里的公式写成 `$...$`，由 kit 的 rich() 交给 KaTeX
        assert re.search(r"s: '[^']*\$\\\\", js), f"{name}.js 的字幕应包含 $LaTeX$ 公式"


# 分镜里「写成纯文本的公式」：希腊字母接下标（λ_PPO）、组合帽（x̂）、Unicode 下标（A₀）、
# 范数号（‖c‖）。代码标识符（z_diff、tpose_qpos）是拉丁字母，不在此列。
PLAIN_FORMULA = re.compile(r"[\u0370-\u03ff]_|\u0302|[\u2080-\u2089\u1d62-\u1d6a]|‖")


def _svg_text_literals(js: str):
    """svgText(...) 调用里的每个字符串字面量（跨行调用也算）。"""
    for m in re.finditer(r"svgText\(", js):
        depth, i = 1, m.end()
        while depth and i < len(js):
            depth += {"(": 1, ")": -1}.get(js[i], 0)
            i += 1
        yield from re.findall(r"'((?:[^'\\]|\\.)*)'", js[m.end() : i])


def test_storyboard_formulas_are_not_spelled_in_plain_text():
    """分镜里的公式走 svgMath / svgRich，不在 svgText 里用纯文本拼。

    svgText 是原生 SVG 文字，KaTeX 到不了：`D_loco`、`[s_k − H_k, s_k]`、`λ_PPO`
    这类写法会原样显示在页面上。混着中文的一行用 svgRich，把公式部分写成 `$…$`。
    """
    for name in EXPLAINER_BUNDLES:
        js = (DEMO_JS_DIR / f"{name}.js").read_text(encoding="utf-8")
        bad = [lit for lit in _svg_text_literals(js) if PLAIN_FORMULA.search(lit)]
        assert not bad, f"{name}.js 的 svgText 里有纯文本公式，应改用 svgRich / svgMath：{bad}"
        if "svgRich(" in js:
            assert "svgRich = K.svgRich" in js, f"{name}.js 用了 svgRich 却没从 kit 取出来"


def test_php_loco_skill_timeline_labels_are_latex():
    """issue 截图那一幕：Loco → Skill → Loco 时间线下的标注必须是 LaTeX。"""
    js = (DEMO_JS_DIR / "php.js").read_text(encoding="utf-8")
    block = js[js.index("function buildSceneCompose()") : js.index("/* 两条助跑道")]
    for tex in ("$\\\\mathcal{D}_{\\\\mathrm{loco}}$", "$E_k$", "$[s_k - H_k,\\\\, s_k]$", "$e_k$"):
        assert tex in block, tex
    assert "tl.appendChild(svgRich(sg.x + sg.w / 2, 90, sg.d," in block
    assert "D_loco" not in block


def test_rich_widgets_keep_plain_aria_labels():
    """滑块标签可以写 `$…$`，但 aria-label 要给读屏器念降级后的纯文本。"""
    kit = DEMO_KIT.read_text(encoding="utf-8")
    assert "function richToPlain(str)" in kit
    assert "richToPlain(opts.label)" in kit
    assert "label.appendChild(el('span', null, text));" in kit, "checkbox 的文字也要走 rich()"
    assert "if (needsRichMarkup(text)) rich(v, text);" in kit, "统计读数也要认 $…$"


def test_demo_strings_render_backticks_as_inline_code():
    """演示里的 awrWeights() 这类标识符（字符串里用反引号包着）要渲染成 inline code。

    kit 的 rich() 是所有人读得到的字符串（标题、字幕、结论框、脚注）唯一的
    渲染入口，所以反引号只需要在那里认一次，各 bundle 原样写 markdown 即可。
    """
    kit = DEMO_KIT.read_text(encoding="utf-8")
    rich = kit[kit.index("function rich(parent, str") : kit.index("function card(host, opts)")]
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
    """七幕动画不许手写换算结果：切掉的步数、DDIM 加速倍数、百分比都得现算。

    取值对照论文 arXiv v5 与官方源码：表 7 的 T_o / T_p / T_a = 2 / 16 / 8（真机 Push-T 的 T_a = 6）；
    predict_action 从 start = To − 1 切起，所以 16 步 = 过去 1 步 + 执行 8 步 + 丢掉 7 步；
    3.4 节训练 100 步、DDIM 推理 10 步，表 7 真机推理 16 步。
    """
    js = (DEMO_JS_DIR / "diffusion_policy.js").read_text(encoding="utf-8")
    note = DIFFUSION_POLICY_NOTE.read_text(encoding="utf-8")

    assert "var H = 16;" in js
    assert "var TA = 8;" in js
    assert "var N_OBS = 2;" in js
    assert "var SKIP = N_OBS - 1;" in js
    assert "var DISCARD = H - SKIP - TA;" in js
    assert 16 - (2 - 1) - 8 == 7
    assert "var REAL_TA = 6;" in js

    assert "var TRAIN_K = 100;" in js
    assert "var INFER_K = 10;" in js
    assert "var REAL_K = 16;" in js
    assert "var SPEEDUP = TRAIN_K / INFER_K;" in js
    assert 100 / 10 == 10

    assert "var N_TASKS = 15;" in js
    assert "var LIFT_PCT = 46.9;" in js
    assert "var MUG_OK = 18," in js and "MUG_N = 20;" in js
    assert round(100 * 18 / 20) == 90

    for needle in ("46.9%", "15 个", "1 + 8 + 7", "start = To - 1", "0.1 s", "95%"):
        assert needle in note, needle
    assert "## 🎬 七幕动画：Diffusion Policy 全流程" in note


def _dp_alpha_bar(k: int, steps: int) -> float:
    """diffusion_policy.js 的 alphaBar()：余弦噪声表，夹在 [1e-5, 1]。"""
    f = math.cos(((k / steps + 0.008) / 1.008) * (math.pi / 2))
    return min(max(f * f, 1e-5), 1.0)


def _dp_ddim_1d(modes, weights, data_std, steps, x_start):
    """diffusion_policy.js 的 ddimSample() 的一维版：理想去噪器 + 确定性 DDIM。"""
    x, rows = x_start, []
    for k in range(steps, 0, -1):
        ab, ab_prev = _dp_alpha_bar(k, steps), _dp_alpha_bar(k - 1, steps)
        sa, v = math.sqrt(ab), ab * data_std**2 + (1 - ab)
        logs = [math.log(w + 1e-12) - (x - sa * mu) ** 2 / (2 * v) for mu, w in zip(modes, weights, strict=True)]
        top = max(logs)
        resp = [math.exp(lg - top) for lg in logs]
        resp = [r / sum(resp) for r in resp]
        x0 = sum(r * (sa * data_std**2 * x + (1 - ab) * mu) / v for r, mu in zip(resp, modes, strict=True))
        eps = (x - sa * x0) / math.sqrt(1 - ab)
        x_next = math.sqrt(ab_prev) * x0 + math.sqrt(1 - ab_prev) * eps
        rows.append((k, x, resp[0], x0, x_next))
        x = x_next
    return rows


def test_diffusion_policy_worked_example_reuses_the_demo_sampler():
    """「具体实例」例 2–4 和「平均动作」实验台共用一组玩具数：两峰 ±1.05、σ = 0.18、10 步 DDIM。

    表里每一行、手算那一步的中间量都按 JS 采样器的 Python 版现算，改了演示参数就得同步改正文。
    """
    js = (DEMO_JS_DIR / "diffusion_policy.js").read_text(encoding="utf-8")
    note = DIFFUSION_POLICY_NOTE.read_text(encoding="utf-8")

    assert "var LEFT_MU = 1.05,\n    RIGHT_MU = -1.05;" in js
    assert "var state = { mix: 0.5, nSamples: 12, seed: 7, method: 'diffusion', steps: 10, dataStd: 0.18 };" in js
    assert "var f = Math.cos(((t + 0.008) / 1.008) * (Math.PI / 2));" in js

    # 例 2：MSE 的最优解是两峰均值
    assert 0.5 * 1.05 + 0.5 * (-1.05) == 0
    assert "$\\lvert 0 \\rvert \\lt 0.52$" in note and "var OBST = { x: 0, y: 0, r: 0.52 };" in js

    # 例 3 / 例 4：余弦表与整条轨迹
    for k in range(11):
        assert f"{_dp_alpha_bar(k, 10):.5f}" in note, k
    rows = _dp_ddim_1d([1.05, -1.05], [0.5, 0.5], 0.18, 10, 0.3)
    for k, x, r_up, x0, x_next in rows:
        line = f"| {k} | {_dp_alpha_bar(k, 10):.5f} | {x:.4f} | {r_up:.4f} | {x0:.4f} | {x_next:.4f} |"
        assert line in note, line
    assert f"{rows[-1][-1]:.4f}" == "0.9181" and "$-0.9181$" in note
    mirrored = _dp_ddim_1d([1.05, -1.05], [0.5, 0.5], 0.18, 10, -0.3)
    assert abs(mirrored[-1][-1] + rows[-1][-1]) < 1e-12

    # 例 3 的手算一步（k = 4 → 3）
    k, x4, r_up, x0, x3 = rows[6]
    assert k == 4
    ab4, ab3 = _dp_alpha_bar(4, 10), _dp_alpha_bar(3, 10)
    sa, v = math.sqrt(ab4), ab4 * 0.18**2 + (1 - ab4)
    d_up, d_down = x4 - sa * 1.05, x4 + sa * 1.05
    logit = (d_down**2 - d_up**2) / (2 * v)
    eps = (x4 - sa * x0) / math.sqrt(1 - ab4)
    expected = {
        "sqrt_ab4": (sa, 4), "v": (v, 4), "d_up": (d_up, 4), "d_up2": (d_up**2, 4), "d_down": (d_down, 4),
        "d_down2": (d_down**2, 4), "two_v": (2 * v, 4), "logit": (logit, 4), "r_down": (1 - r_up, 4),
        "film": (sa * 0.18**2 * x4, 4), "mix": ((1 - ab4) * (2 * r_up - 1) * 1.05, 4),
        "sa_x0": (sa * x0, 4), "sqrt_1m_ab4": (math.sqrt(1 - ab4), 4), "eps": (eps, 4),
        "sqrt_ab3": (math.sqrt(ab3), 4), "sqrt_1m_ab3": (math.sqrt(1 - ab3), 4), "one_m_ab4": (1 - ab4, 5),
    }
    for name, (val, digits) in expected.items():
        assert _fmt(val, digits) in note, (name, _fmt(val, digits))
    assert _fmt(math.sqrt(ab3) * x0 + math.sqrt(1 - ab3) * eps, 4) == _fmt(x3, 4) == "0.4612"

    # 例 5：LQR，A = B = 1、K = 0.5、s = 2
    a_k, b_k, gain, s0 = 1.0, 1.0, 0.5, 2.0
    chunk = [-gain * (a_k - b_k * gain) ** t * s0 for t in range(3)]
    assert chunk == [-1.0, -0.5, -0.25]
    assert "(-1,\\ -0.5,\\ -0.25)" in note


def test_pulse_worked_example_arithmetic():
    """「具体实例」手算一帧蒸馏损失：KL 闭式解、式 3 合计、下游残差都得现算。

    腾空状态的先验沿用「本体感受先验」演示里的那组数：中心 (1.35, −0.9)，标准差 r × 0.32。
    """
    js = (DEMO_JS_DIR / "pulse.js").read_text(encoding="utf-8")
    note = PULSE_NOTE.read_text(encoding="utf-8")

    assert "{ id: 'air', name: '腾空中', c: [1.35, -0.9], r: 0.6 }," in js
    assert "var priorS = state.mode === 'prop' ? st.r * 0.32 : 1.0;" in js
    s_p = 0.6 * 0.32
    mu_p, mu_e, s_e = (1.35, -0.90), (1.45, -0.85), 0.15
    mu_e_prev = (1.40, -0.88)
    alpha = 0.005

    def kl_dims(mu_q, s_q, mu_ref, s_ref):
        return [math.log(s_ref / s_q) + (s_q**2 + (m - r) ** 2) / (2 * s_ref**2) - 0.5 for m, r in zip(mu_q, mu_ref, strict=True)]

    learned = kl_dims(mu_e, s_e, mu_p, s_p)
    fixed = kl_dims(mu_e, s_e, (0.0, 0.0), 1.0)
    for val in (*learned, *fixed, sum(learned), sum(fixed), math.log(s_p / s_e), math.log(1 / s_e)):
        assert _fmt(val, 4) in note, _fmt(val, 4)
    assert f"{2 * s_p**2:.6f}" == "0.073728" and "0.073728" in note
    assert f"**{sum(fixed) / sum(learned):.1f} 倍**" in note

    l_action = sum((a - b) ** 2 for a, b in zip((0.30, -0.10, 0.50), (0.25, -0.05, 0.45), strict=True))
    l_regu = sum((a - b) ** 2 for a, b in zip(mu_e, mu_e_prev, strict=True))
    assert _fmt(l_action, 4) == "0.0075" and _fmt(l_regu, 4) == "0.0034"
    assert _fmt(alpha * l_regu, 6) == "0.000017" and "0.000017" in note
    for beta in (0.01, 0.001):
        for kl in (sum(learned), sum(fixed)):
            total = l_action + alpha * l_regu + beta * kl
            assert _fmt(beta * kl, 6) in note, _fmt(beta * kl, 6)
            assert _fmt(total, 6) in note, _fmt(total, 6)
            assert f"{100 * beta * kl / total:.1f}%" in note, f"{100 * beta * kl / total:.1f}%"

    # 源码写法：不平方的范数、AR(1) φ = 0.99
    ar1 = [a - 0.99 * b for a, b in zip(mu_e, mu_e_prev, strict=True)]
    assert _fmt(math.sqrt(l_action), 4) in note and _fmt(math.hypot(*ar1), 4) in note

    # 下游残差与「不用残差」的起点
    dz = (0.20, -0.10)
    z = tuple(round(m + d, 2) for m, d in zip(mu_p, dz, strict=True))
    assert z == (1.55, -1.0) and "(1.55,\\ -1.00)" in note
    for val, digits in ((math.hypot(*dz), 3), (math.hypot(*mu_p), 2), (math.sqrt(0.22), 3)):
        assert _fmt(val, digits) in note, _fmt(val, digits)


def test_beyondmimic_explainer_demos_and_worked_example_share_the_paper_numbers():
    """BeyondMimic：十二幕动画、四个演示、配音旁白与笔记「🚶 具体实例」用同一份论文数字。

    以 arXiv 2508.08241 v4 为准（表 S1–S8、补充材料 S1–S4），图 8A / 图 S2 是读图近似值；14 个目标部位、160 维、
    力矩上限、核长 1 取自官方代码。k_p、α、真实阻尼比、0.062、半衰点、效应量等在这些数上现算。
    旧版笔记把 v1–v3 的 Body-Pos 消融、λ 均匀混合和 v4 的 VAE 混在一起，还把「锚定吸收偏航」写反了，这里守着别再写回来。
    """
    js = (DEMO_JS_DIR / "beyondmimic.js").read_text(encoding="utf-8")
    note = BEYONDMIMIC_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "beyondmimic.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "beyondmimic.js").read_text(encoding="utf-8")

    for line in (
        "var SIGMA = { p: 0.3, R: 0.4, v: 1.0, w: 3.14 };",
        "var W_GLOBAL = 0.5;",
        "var REG = { limit: -10.0, smooth: -0.1, contact: -0.1, softLimit: 0.9, fTh: 1.0 };",
        "var TERM = { z: 0.25, rot: 0.8 };",
        "var OMEGA_HZ = 10, ZETA = 2, ACT_FRAC = 0.25;",
        "var ARMATURE = { '5020': 0.003609725, '7520-14': 0.010177520, '7520-22': 0.025101925, '4010': 0.00425 };",
        "['膝', '7520-22', 1, 139, 0.1366], ['踝俯仰', '5020', 2, 50, 0.009997], ['踝横滚', '5020', 2, 50, 0.007607],",
        "var DR = { muStatic: [0.3, 1.6], muDynamic: [0.3, 1.2], restitution: [0, 0.5], jointOffset: 0.01, com: [0.025, 0.05, 0.05] };",
        "var DELAY_MS = [2, 5, 10], DELAY_FAILS = [0, 1, 2], DELAY_TRIALS = 3;",
        "var AS = { binS: 1, ema: 0.001, floor: 0.1, rho: 0.8, kPaper: 3, kCode: 1 };",
        "var FIG8B = { motions: 4, failNoAS: 3, maxIter: 30000, m4: [2000, 4000] };",
        "var CARTWHEEL = { acc: 31, peak: 20, mean: 7.01, human: 7.75 }, RONALDO_REPS = 5;",
        "var STUDY = { n: 77, pairs: 20, clipS: 5, all: 70.8, walk: 57.0, run: 84.7, h: [0.859, 0.281, 1.532] };",
        "var VAE = { z: 32, enc: [2048, 1024, 512], dec: [2048, 1024, 512], teacher: [512, 256, 128], lr: 5e-4, accum: 15, beta: 0.01 };",
        "var DIFF = { H: 16, N: 4, emb: 512, heads: 8, layers: 6, K: 20, batch: 512, epochs: 1000, lr: 1e-4, wd: 0.001, warmup: 10000, paramsM: 19.8, hz: 25, inferMs: 20, emphasis: 6 };",
        "var OU = { theta: 0.8, mu: 0, dt: 1.0, sigma: 0.1, reps: 100, runS: 2.5, checkS: 5 };",
        "var LATENT_ABL = { without: 5, with: 95 };",
        "var DRIFT_EX = { dx: 0.3, dy: -0.4, yaw: 0.2 };",
    ):
        assert line in js, line

    # 观测维度（官方代码 PolicyCfg / PrivilegedCfg）
    assert 58 + 9 + 6 + 29 * 3 == 160 and 160 + 14 * 3 + 14 * 6 == 286 and 160 - 6 == 154
    # 锚定一个手（S1 的式子）：漂 (0.30, −0.40)、偏航 0.2
    c, s_ = math.cos(0.2), math.sin(0.2)
    hand = (2.30 + c * 0.25 + s_ * 0.20, 0.10 + s_ * 0.25 - c * 0.20, 0.95 - 0.10)
    assert (_fmt(hand[0], 3), _fmt(hand[1], 3), _fmt(hand[2], 2)) == ("2.585", "-0.046", "0.85")
    assert _fmt(math.sqrt((hand[0] - 2.25) ** 2 + (hand[1] - 0.30) ** 2), 2) == "0.48"
    assert (_fmt(math.exp(-0.25 / 0.09), 3), _fmt(math.exp(-0.04 / 0.16), 3)) == ("0.062", "0.779")
    # 四个高斯掉到一半
    half = [s * math.sqrt(math.log(2)) for s in (0.3, 0.4, 1.0, 3.14)]
    assert [_fmt(half[0], 2), _fmt(math.degrees(half[1]), 1), _fmt(half[2], 2), _fmt(half[3], 2)] == ["0.25", "19.1", "0.83", "2.61"]
    # 膝与踝横滚的阻抗（表 S3 / S4 + 代码的力矩上限），真实轴惯量下的频率与阻尼比
    w = 2 * math.pi * 10
    I_knee, I_ankle = 0.025101925, 2 * 0.003609725
    kp, kd = I_knee * w * w, 2 * I_knee * 2 * w
    assert (_fmt(kp, 2), _fmt(kd, 3), _fmt(0.25 * 139 / kp, 3), _fmt(kp * 0.25 * 139 / kp, 2)) == ("99.10", "6.309", "0.351", "34.75")
    assert (_fmt(I_ankle * w * w, 2), _fmt(2 * I_ankle * 2 * w, 3), _fmt(0.25 * 50 / (I_ankle * w * w), 3)) == ("28.50", "1.814", "0.439")
    assert _fmt(0.25 * 5 / (0.00425 * w * w), 3) == "0.075" and _fmt(4 / w, 3) == "0.064"
    def real(k, d, ie):
        return math.sqrt(k / ie) / (2 * math.pi), d / (2 * math.sqrt(k * ie))

    assert tuple(_fmt(x, d) for x, d in zip(real(kp, kd, 0.1366), (2, 3), strict=True)) == ("4.29", "0.857")
    ka, da = I_ankle * w * w, 2 * I_ankle * 2 * w
    assert tuple(_fmt(x, d) for x, d in zip(real(ka, da, 0.007607), (2, 3), strict=True)) == ("9.74", "1.948")
    assert _fmt(0.025101925 / 0.1366 * 100, 1) == "18.4" and _fmt(I_ankle / 0.007607 * 100, 1) == "94.9"
    # 自适应采样的核（玩具：10 箱、第 6 秒失败率 0.5、底 0.01）与滑动平均的半衰期
    k = [0.8 ** u for u in range(3)]
    k = [x / sum(k) for x in k]
    fb = [0.01] * 10
    fb[6] = 0.51
    p = [sum(k[u] * fb[min(i + u, 9)] for u in range(3)) for i in range(10)]
    p = [x / sum(p) for x in p]
    assert [_fmt(x, 3) for x in p[4:7]] == ["0.235", "0.290", "0.358"] and _fmt(sum(p[4:7]) * 100, 1) == "88.3"
    assert _fmt(0.51 / sum(fb), 2) == "0.85" and round(math.log(0.5) / math.log(0.999)) == 693
    # 效应量、时间账、OU 噪声、代价、表 S8
    def h(q):
        return 2 * math.asin(math.sqrt(q)) - 2 * math.asin(math.sqrt(1 - q))

    assert (_fmt(h(0.708), 3), _fmt(h(0.570), 3), _fmt(h(0.847), 3)) == ("0.858", "0.281", "1.534")
    assert 16 / 25 == 0.64 and 1000 / 25 == 40 and 20 / 40 == 0.5
    assert (_fmt(0.1 / math.sqrt(1 - 0.2**2), 3), _fmt(0.102 * 0.351, 3)) == ("0.102", "0.036")
    assert _fmt(17 * 0.5 * (0.3**2 + 0.1**2), 2) == "0.85" and _fmt(1 - math.exp(-4), 3) == "0.982"
    def b(x, d=0.1):
        return -math.log(x) if x >= d else -math.log(d) + 0.5 * (((x - 2 * d) / d) ** 2 - 1)

    assert [_fmt(b(x), 3) for x in (0.3, 0.1, 0.05, -0.05)] == ["1.204", "2.303", "2.928", "4.928"]
    lafan_real = [38.5, 69.3, 46.0, 30.0, 118.0, 140.0, 53.2, 20.0, 50.0, 48.0, 49.0, 8.6]
    assert 7 + 25 == 32 and _fmt(sum(lafan_real), 1) == "670.6"

    for needle in (
        "## 🎬 十二幕动画：BeyondMimic 全流程", "## 🚶 具体实例", "## 📁 源码对照", "**160**", "**286**", "**154**",
        "**$(2.585,\\ -0.046,\\ 0.85)$**", "**0.062**", "**0.779**", "**0.25 m**", "**19.1°**", "**99.10**", "**6.309**",
        "**0.351 rad**", "**4.29 Hz**", "**0.857**", "**0.235、0.290、0.358**", "**0.85**", "**693**", "**0.858**", "**1.534**",
        "**0.64 s**", "**0.102**", "**0.2**", "**0.85**", "**2.928**", "**4.928**", "**32 段**", "670.6 s",
        'data-demo="bm-anchor"', 'data-demo="bm-impedance"', 'data-demo="bm-sampling"', 'data-demo="bm-guidance"',
    ):
        assert needle in note, needle
    for needle in ("0.062", "160", "286", "154", "99.1", "0.351", "0.86", "70.8%", "84.7%", "5%", "95%", "0.64", "20 毫秒", "7.01"):
        assert needle in narration, needle
    # 片头接上一期（ASAP）的片尾预告；片尾按 2026-10-07 的发布清单预告 019 InEKF（旁白逐字母念，字幕显示 InEKF）
    assert "上一期结尾预告" in narration and "下一篇讲 In E K F" in narration and "**下一篇**：InEKF" in intro
    assert "回到源头" not in narration and "回到源头" not in intro
    for stale in ("放开的是水平位置，不是朝向", "p_s' = \\lambda", "18.87", "补充行走数据", "Walk+Perturb 成功率"):
        assert stale not in note, f"旧版笔记的说法：{stale}"


def test_inekf_legs_use_the_cassie_link_lengths():
    """InEKF 讲解动画里的 Cassie 腿示意按真机连杆画：大腿 0.12、小腿 0.50、跗骨 0.41（m），比例约 1 : 4.2 : 3.4。

    数取自 mujoco_menagerie 的 agility_cassie/cassie.xml（Robot_Description_Gallery 记录的 MJCF）里相邻 body 的 pos：
    髋俯仰 → 膝 (0.12, 0, 0.0045)；膝 → 小腿 (0.06068, 0.04741, 0) 再 → 跗骨 (0.43476, 0.02, 0)（小腿关节是 ±20° 的弹簧，取 0）；
    跗骨 → 脚 (0.408, −0.04, 0)。站立的髋高、脚关节高与「跗骨比大腿偏 7°」是按 home 关键帧做正运动学得到的，这里只核对连杆长度。
    旧版借用 Digit 示意的 0.36 / 0.42 / 0.23 比例（大腿长了三倍），不再出现。
    """
    import math

    js = (ROOT / "assets" / "js" / "demos" / "inekf.js").read_text(encoding="utf-8")
    m = re.search(r"var CASSIE_LEG = \{([^}]*)\};", js)
    assert m, "inekf.js 里找不到 CASSIE_LEG"
    leg = {k: float(v) for k, v in re.findall(r"(\w+): (-?\d+(?:\.\d+)?)", m.group(1))}
    thigh = math.hypot(0.12, 0.0045)
    shin = math.hypot(0.06068 + 0.43476, 0.04741 + 0.02)
    tarsus = math.hypot(0.408, -0.04)
    assert abs(leg["thigh"] - thigh) < 0.002 and abs(leg["shin"] - shin) < 0.002 and abs(leg["tarsus"] - tarsus) < 0.002
    assert round(leg["shin"] / leg["thigh"], 1) == 4.2 and round(leg["tarsus"] / leg["thigh"], 1) == 3.4
    assert leg["hipH"] == 0.916 and leg["tarsusFromThighDeg"] == 7.1
    assert "大腿 : 小腿 : 跗骨 ≈ 1 : 4.2 : 3.4" in js
    for stale in ("bodyLegs", "L1 = 0.36 * M", "TAR = [-0.11 * M, -0.2 * M]"):
        assert stale not in js, stale
    assert js.count("cassieLegs(") == 9  # 定义 1 处；第 2、3、4 幕各两个（真值 + 估计），第 6、10 幕各一个
    assert "UMich BipedLab" in js


def test_beyondmimic_stick_figures_bend_the_right_way():
    """侧面看的火柴人不反关节：膝的弯曲 = 大腿角 − 小腿角 ≥ 0，肘的弯曲 = 小臂角 − 大臂角 ≥ 0（角度从竖直向下量、朝 +x 为正）。

    旧版前踢的膝盖反折、踢出的腿和后仰的躯干倒向同一侧（ASAP 那篇改过同样的毛病）；侧手翻的「大字」是正面看的，不在此列。
    """
    js = (ROOT / "assets" / "js" / "demos" / "beyondmimic.js").read_text(encoding="utf-8")
    num = r"(-?\d+(?:\.\d+)?)"
    pat = re.compile(
        rf"var (POSE_\w+) = \{{ lean: {num}, armA: \[{num}, {num}\], armB: \[{num}, {num}\], "
        rf"legA: \[{num}, {num}\], legB: \[{num}, {num}\] \}};"
    )
    poses = {m.group(1): [float(x) for x in m.groups()[1:]] for m in pat.finditer(js)}
    assert {"POSE_STAND", "POSE_KICK", "POSE_CHAMBER", "POSE_TAKEOFF", "POSE_TUCK", "POSE_LAND", "POSE_LEAN", "POSE_LEAN_BACK"} <= set(poses)
    for name, (_lean, a0, a1, b0, b1, la0, la1, lb0, lb1) in poses.items():
        if name == "POSE_STAR":
            continue
        assert a1 - a0 >= 0 and b1 - b0 >= 0, f"{name} 的肘反了"
        assert la0 - la1 >= 0 and lb0 - lb1 >= 0, f"{name} 的膝反了"
    lean, *_, la0, la1, lb0, lb1 = poses["POSE_KICK"]
    assert lean < 0 < la0, "前踢：躯干后仰、踢出去的腿在前，分在支撑脚两侧"
    # 被淘汰的写法不再出现：反折的前踢、在地上躺平的侧手翻、把虚线画成实线的 drawOn
    assert "legA: [-70, -60]" not in js
    assert "function cartwheelAt(" in js and "putHip(" in js
    assert "path.baseDash" in js


def test_beyondmimic_video_feedback_spell_vae_and_explain_the_pictures():
    """2026-10-08 的看片反馈：VAE 逐字母念；第 5 幕说清黄轮与蓝杆是什么；第 11 幕说清横穿障碍的灰虚线。"""
    js = (ROOT / "assets" / "js" / "demos" / "beyondmimic.js").read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "beyondmimic.py").read_text(encoding="utf-8")
    script = narration[narration.index("SCRIPT = ["):narration.index("DISPLAY = [")]
    # 「VAE」连写会被 TTS 读成一个词：旁白一律写「V A E」，字幕经 DISPLAY 换回 VAE
    assert "VAE" not in script and script.count("V A E") >= 4
    assert '("V A E", "VAE")' in narration
    # 第 5 幕：黄轮 = 电机（经减速器带动连杆），蓝杆 = 膝关节连杆，绿虚线 = 设定点；旁白开头先讲这三样
    # 皮带减速器要符合物理：小轮 = 电机、大轮 = 关节，齿比 = 大轮半径 / 小轮半径，开口皮带两轮同向转
    for needle in ("'电机'", "'减速 5 : 1'", "黄小轮 = 电机：转得快", "蓝大轮 + 蓝杆 = 膝关节：转得慢、同向", "'设定点'",
                   "R_MOT = 8, R_JNT = 40, GEAR_VIS = R_JNT / R_MOT", "(linkDeg * GEAR_VIS) % 360"):
        assert needle in js, needle
    assert "-((G * qr * GEAR_VIS" not in js, "电机与关节反向转是错的"
    assert "黄色小轮是电机，用皮带带动蓝色大轮和连杆；小轮旋转五圈，大轮才旋转一圈，两个轮子同向" in script
    # 第 11 幕：只有路点代价时灰虚线是穿过障碍的直线，加上避障才绕开；画面左上角与旁白都要说
    assert "只加路点代价：被拉向灰虚线（直线），会穿过障碍" in js and "路点 + 避障代价：灰虚线绕开障碍" in js
    assert "左图先只加路点代价" in script and "灰色虚线就绕开了障碍" in script
    # SDF / CppAD 各有一句白话：画面上、要点卡、旁白
    assert "SDF（离障碍表面多远）" in js and "SDF（有符号距离场）记下每个点离障碍表面多远" in js
    assert "CppAD（C++ 自动求导库" in js and "有符号距离场，就是记下每个点离障碍表面多远" in script and "自动求导库" in script


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


VIDEO_PLACEHOLDER_RE = re.compile(r'<div class="paper-demo" data-demo="([\w-]+-video)" data-src="([^"]+)" data-poster="([^"]+)">(.*?)</div>')


def test_narrated_video_placeholders_point_at_files_that_exist():
    """每个 `*-video` 占位符的 mp4 / 海报必须真的躺在笔记同目录，兜底下载链接指向同一个文件。

    播放器是 kit.js 的 K.video 在运行时生成的（<video> 过不了 nh3），bundle 里必须注册同名构建函数；
    无 JS 时读者只剩兜底文案里的 <a download>，路径写错就成了死链。
    """
    seen = set()
    for path in (ROOT / "papers").rglob("*.md"):
        text = path.read_text(encoding="utf-8")
        for demo, src, poster, fallback in VIDEO_PLACEHOLDER_RE.findall(text):
            seen.add(demo)
            assert (path.parent / src).is_file(), f"{path.name}: {demo} 的视频 {src} 不存在"
            assert (path.parent / poster).is_file(), f"{path.name}: {demo} 的海报 {poster} 不存在"
            assert f'href="{src}" download=' in fallback, f"{path.name}: {demo} 的兜底下载链接应指向 {src}"
            assert text.count(f'data-demo="{demo}"') == 1, f"{path.name}: {demo} 占位符应只出现一次"
            declared = FRONTMATTER_DEMOS_RE.search(text)
            bundles = re.findall(r'"([a-z0-9_-]+)"', declared.group(1))
            js = "".join((DEMO_JS_DIR / f"{b}.js").read_text(encoding="utf-8") for b in bundles)
            assert f"'{demo}': buildVideoDemo" in js and "K.video(host" in js, f"{demo} 没有通过 K.video 注册"
    for demo in ("calm-video", "pulse-video", "dp-video", "bm-video", "lcp-video", "cosmos-video", "groot-video",
                 "tf-video", "pi0-video", "pi05-video", "soccer-video", "sonic-video", "gmr-video",
                 "omniretarget-video", "humanml3d-video", "smp-video", "dr-video", "qt-video", "rh-video", "inekf-video", "bh-video"):
        assert demo in seen, f"{demo} 应该挂在对应的论文笔记里"


def test_vla_explainers_share_numbers_with_their_notes():
    """Transformer / π₀ / π₀.₅ 的动画算例与笔记「🚶 具体实例」共用同一组数（OP3 足球见下一个测试）。

    这些数由各自 bundle 里的小函数现算（softmax、Beta CDF、n^0.43、分桶、1 − 0.8^n ……），
    笔记里是手算结果；改了一边忘了另一边，这里会拦下来。
    """
    cases = {
        TRANSFORMER_NOTE: ("transformer", ["q = [1, 0, 1, 0]", "[0.548,\\ 0.726]", "0.274", "0.452", "6.99", "89 倍"]),
        PI0_NOTE: ("pi0", ["64.7%", "7.24", "816", "73", "−1.2", "0.8"]),
        PI05_NOTE: ("pi05", ["97.6%", "**166**", "280k", "80k", "11%"]),
    }
    for note, (_bundle, needles) in cases.items():
        text = note.read_text(encoding="utf-8")
        for needle in needles:
            assert needle in text, f"{note.name} 的具体实例应包含 {needle}"
        assert "## 🚶 具体实例" in text and "## 🎬 七幕动画" in text

    # 动画里现算的关键数字：直接复算一遍，确保与笔记里的手算一致
    w = [math.exp(x) for x in (0.5, 1.0, 0.5)]
    assert [round(x / sum(w), 3) for x in w] == [0.274, 0.452, 0.274]
    assert round(512 ** -0.5 * 4000 ** -0.5 * 1e4, 2) == 6.99
    assert round((1 - ((0.999 - 0.5) / 0.999) ** 1.5) * 100, 1) == 64.7
    assert round(100 ** 0.43, 2) == 7.24
    assert sum(1 for k in range(256) if -1 + 2 * k / 256 <= 0.3) - 1 == 166

    js = (DEMO_JS_DIR / "pi0.js").read_text(encoding="utf-8")
    assert "eps = -1.2, a = 0.8, steps = 10" in js
    assert "nBig = 100, nSmall = 1, p = 0.43" in js


def test_sonic_and_gmr_worked_examples_share_numbers_with_their_explainers():
    """SONIC / GMR 的「🚶 具体实例」手算与七幕动画现算的是同一组数。"""
    sonic = SONIC_NOTE.read_text(encoding="utf-8")
    enc = 2048 * 1024 + 1024 * 512 + 512 * 512
    dyn = 2048 * 2048 + 2048 * 1024 + 1024 * 1024 + 1024 * 512 + 512 * 512
    total = 3 * enc + dyn + enc + dyn
    assert (enc, dyn, total) == (2_883_584, 8_126_464, 27_787_264)
    assert round(0.8 / 0.02) == 40 and round(2.4 / 0.02) == 120 and round(100 / 20) == 5
    assert 64 * 5 * 50 == 16000 and round(20 * 0.95) == 19
    for needle in ("## 🚶 具体实例", "2,883,584", "8,126,464", "27,787,264（27.79 M）", "320 \\times 50 = 16000",
                   "= 5\\ \\text{个控制步}", "$20 \\times 0.95 = 19$"):
        assert needle in sonic, needle

    gmr = GMR_NOTE.read_text(encoding="utf-8")
    s = (0.80 + 0.85 + 1.00) / 3
    resid = [abs(r - s) * L for r, L in ((0.80, 60), (0.85, 85), (1.00, 50))]
    assert [round(x, 1) for x in resid] == [5.0, 2.8, 5.8] and round(sum(resid), 1) == 13.7
    assert round(math.degrees(3 * math.pi / 30)) == 18
    assert (round(1000 / 65, 1), round(1000 / 40, 1), round(300 / 21, 1)) == (15.4, 25.0, 14.3)
    for needle in ("## 🚶 具体实例", "s = \\frac{0.80 + 0.85 + 1.00}{3} \\approx 0.883", "**13.7 cm**",
                   "18^\\circ", "15.4", "25.0", "14.3\\%", "**90 条**"):
        assert needle in gmr, needle


def test_smp_explainer_and_worked_example_share_the_same_numbers():
    """SMP 八幕动画第 3–5 幕、三个演示与笔记「🚶 具体实例」是同一个玩具模型：

    二维高斯「动作流形」（左臂 × 右腿，ρ = 0.95），去噪器取闭式最优解，噪声表照抄 diffusers 的
    squaredcos_cap_v2。这里用 Python 重算一遍，核对 bundle 里的常量和笔记里的每一个数。
    """
    js = (DEMO_JS_DIR / "smp.js").read_text(encoding="utf-8")
    note = SMP_NOTE.read_text(encoding="utf-8")

    for line in (
        "var T_STEPS = 50;",
        "var K_SET = [22, 15, 8];",
        "var SDS_SCALE = 6;",
        "var TASK_R = 0.8;",
        "var FEAT_DIM = 1140;",
        "var RHO = 0.95;",
        "var SAMPLE_A = [0.8, 0.8];",
        "var SAMPLE_B = [0.8, -0.8];",
    ):
        assert line in js, line
    # MimicKit 默认 yaml：三档、sds_loss_scale 与奖励权重
    for s in ("`diffusion_steps` | **[22, 15, 8]**", "`sds_loss_scale` | **6**", "`task_reward_weight` / `smp_reward_weight` | 0.5 / 0.5"):
        assert s in note, s

    def g(u):
        return math.cos((u + 0.008) / 1.008 * math.pi / 2) ** 2

    abar, p = [], 1.0
    for i in range(50):
        p *= 1 - min(1 - g((i + 1) / 50) / g(i / 50), 0.999)
        abar.append(p)
    lam = (1.95, 0.05)

    def axes(x):
        return ((x[0] + x[1]) / math.sqrt(2), (x[0] - x[1]) / math.sqrt(2))

    def sds(t, d2):  # d2: E[d_k^2] per principal axis
        a = abar[t]
        return sum((a * (1 - a) * dk + a * a * lk * lk) / (a * lk + 1 - a) ** 2 for dk, lk in zip(d2, lam, strict=True)) / 2

    def point(x):
        return [v * v for v in axes(x)]

    ks = (22, 15, 8)
    assert [_fmt(abar[t], 3) for t in ks] == ["0.556", "0.761", "0.917"]
    mu = [sds(t, (1, 1)) for t in ks]
    la = [sds(t, point((0.8, 0.8))) for t in ks]
    lb = [sds(t, point((0.8, -0.8))) for t in ks]
    assert [_fmt(v, 3) for v in mu] == ["0.861", "1.595", "2.820"]
    assert [_fmt(v, 3) for v in la] == ["0.321", "0.419", "0.533"]
    assert [_fmt(v, 3) for v in lb] == ["0.963", "1.896", "3.451"]
    na = [a / m for a, m in zip(la, mu, strict=True)]
    nb = [b / m for b, m in zip(lb, mu, strict=True)]
    assert [_fmt(v, 3) for v in na] == ["0.373", "0.263", "0.189"]
    assert [_fmt(v, 3) for v in nb] == ["1.119", "1.189", "1.223"]
    ma, mb = sum(na) / 3, sum(nb) / 3
    ra, rb = math.exp(-6 * ma), math.exp(-6 * mb)
    assert (_fmt(ma, 3), _fmt(mb, 3), _fmt(ra, 3), _fmt(rb, 4)) == ("0.275", "1.177", "0.192", "0.0009")
    assert (_fmt(0.4 + 0.5 * ra, 3), _fmt(0.4 + 0.5 * rb, 3)) == ("0.496", "0.400")
    assert (_fmt(math.exp(-6 * la[0]), 3), _fmt(math.exp(-6 * lb[0]), 3)) == ("0.146", "0.003")
    raw_share = [round(v / sum(lb) * 100) for v in lb]
    norm_share = [round(v / sum(nb) * 100) for v in nb]
    assert raw_share == [15, 30, 55] and norm_share == [32, 34, 35]

    # 伪目标与修正量（t = 22，顺拐 B 只偏在离流形的主轴上）
    a = abar[22]
    d2 = axes((0.8, -0.8))[1]
    assert _fmt(d2, 3) == "1.131"
    assert _fmt(math.sqrt(a) * 0.05 / (a * 0.05 + 1 - a) * math.sqrt(a) * d2, 3) == "0.067"
    assert _fmt(math.sqrt(a * (1 - a)) / (a * 0.05 + 1 - a) * d2, 3) == "1.192"
    assert _fmt(math.sqrt(a * (1 - a)) / (a * 1.95 + 1 - a) * axes((0.8, 0.8))[0], 3) == "0.368"

    # 随机抽一档 vs ESM（每档 ε 的方差按 1140 维平均）
    def var_t(t, x):
        a = abar[t]
        v = 0.0
        for dk, lk in zip(axes(x), lam, strict=True):
            c = math.sqrt(a * (1 - a)) / (a * lk + 1 - a)
            gk = a * lk / (a * lk + 1 - a)
            v += 2 * gk**4 + 4 * (c * dk) ** 2 * gk * gk
        return v / (2 * 1140)

    m = [sds(t, point((0.8, -0.8))) for t in range(50)]
    mr = sum(m) / 50
    vr = sum((v - mr) ** 2 for v in m) / 50 + sum(var_t(t, (0.8, -0.8)) for t in range(50)) / 50
    me = sum(m[t] for t in ks) / 3
    ve = sum(var_t(t, (0.8, -0.8)) for t in ks) / 9
    assert (_fmt(mr, 3), _fmt(vr, 3), _fmt(me, 3), _fmt(ve * 1e4, 2)) == ("1.230", "1.567", "2.103", "3.17")
    assert _fmt(max(m), 2) == "3.80" and m.index(max(m)) == 5

    for s in (
        "| 22（高） | 0.556 |",
        "| 22 | 0.321 | 0.963 |",
        "| 15 | 0.419 | 1.896 |",
        "| 8 | 0.533 | 3.451 |",
        "| 22 | 0.861 | 0.373 | 1.119 |",
        "| 15 | 1.595 | 0.263 | 1.189 |",
        "| 8 | 2.820 | 0.189 | 1.223 |",
        "**0.275** | **1.177**",
        "= 0.192",
        "= 0.0009",
        "0.496",
        "0.400",
        "0.146",
        "15% / 30% / 55%",
        "32% / 34% / 35%",
        "**0.067**",
        "1.192",
        "0.368",
        "| 随机抽一档 | 1.230 | 1.567 |",
        "| 2.103 | $3.17 \\times 10^{-4}$ |",
        "3.80（$t = 5$）",
    ):
        assert s in note, s
    # 动画字幕里的同一组数
    for s in ("0.321", "0.963", "0.146", "0.003", "1.131", "0.067", "0.861 / 1.595 / 2.820", "1.119 / 1.189 / 1.223",
              "0.192", "0.0009", "0.496 vs 0.400", "1.567", "**32% / 34% / 35%**", "**55%**"):
        assert s in js, s
    assert "## 🎬 八幕动画：SMP 全流程" in note
    assert "## 🚶 具体实例" in note
    assert "## 📁 MimicKit 源码对照" in note

def test_humanml3d_explainer_and_worked_example_share_the_same_numbers():
    """HumanML3D 九幕动画与笔记「🚶 具体实例」是同一组数：统计比例、263 维、snippet code、长度采样与结果都现算。"""
    js = (DEMO_JS_DIR / "humanml3d.js").read_text(encoding="utf-8")
    note = HUMANML3D_NOTE.read_text(encoding="utf-8")

    # 论文 Table 1 / 2 / 4 与官方仓库的原值
    for line in (
        "var HML = { motions: 14616, texts: 44970, hours: 28.59, vocab: 5371 };",
        "var KIT = { motions: 3911, texts: 6278, hours: 10.33, vocab: 1623 };",
        "rows: 170,",
        "wristFrame: 28,",
        "var FOOT_THR = 0.002;",
        "var UNIT = 4;",
        "var CODE_DIM = 512;",
        "var DIM_Z = 128;",
        "var LAMBDA_KL = 0.01;",
        "var P_TF = 0.4;",
        "var CUR_START = 10;",
        "var CUR_END = 49;",
        "var POOL = 32;",
        "var MARGIN = 10;",
        "var SAMPLE_U = [0.2, 0.5, 0.9];",
        "var ATT_EARLY = softmax([1.8, 1.5, 0.2, 0.1, 0.4]);",
        "var ATT_SWING = softmax([0.2, 0.4, 2.0, 1.3, 1.1]);",
    ):
        assert line in js, line
    assert "'demo-x-mono'" in js and "K.video(host" in js

    # 第二幕：Table 1 的倍数与 index.csv 的来源
    assert [_fmt(a / b, 2) for a, b in ((14616, 3911), (44970, 6278), (28.59, 10.33), (5371, 1623))] == [
        "3.74", "7.16", "2.77", "3.31"]
    assert 4648 + 2913 + 1839 + 1465 + 1191 + 2560 == 14616 and 14616 - 1191 == 13425
    assert _fmt(44970 / 14616, 2) == "3.08" and _fmt(28.59 * 3600 / 14616, 2) == "7.04"

    # 第三幕：263 维、触地阈值
    def pose_dim(j):
        return 1 + 2 + 1 + 3 * (j - 1) + 6 * (j - 1) + 3 * j + 4

    assert (pose_dim(22), pose_dim(21), 4 + 3 * 22 + 6 * 22 + 3 * 22 + 4) == (263, 251, 272)
    assert 170 * 263 == 44710
    assert (_fmt(math.sqrt(0.002) * 100, 2), _fmt(math.sqrt(0.002) * 20, 3)) == ("4.47", "0.894")

    # 第四幕：168 帧 → 84 → 42 个 code，参数量与感受野
    def conv_len(n):
        return (n + 2 - 4) // 2 + 1

    frames = 170 // 4 * 4
    assert (frames, conv_len(frames), conv_len(conv_len(frames))) == (168, 84, 42)
    assert (168 * 263, 42 * 512, _fmt(168 * 263 / (42 * 512), 2)) == (44184, 21504, "2.05")
    enc = 259 * 512 * 4 + 512 + 512 * 512 * 4 + 512 + 512 * 512 + 512
    dec = 512 * 512 * 4 + 512 + 512 * 263 * 4 + 263 + 263 * 263 + 263
    assert (enc, dec, 4 + 3 * 2) == (1842688, 1657407, 10)

    # 第五幕：截在 [10, 49] 的示意分布，按累积概率取样
    def length_dist(mu, sigma):
        w = [math.exp(-((k - mu) ** 2) / (2 * sigma * sigma)) for k in range(10, 50)]
        return [x / sum(w) for x in w]

    def quantile(p, u):
        acc = 0.0
        for i, x in enumerate(p):
            acc += x
            if u <= acc:
                return 10 + i
        return 49

    peak, flat = length_dist(42, 3), length_dist(30, 9)
    assert [quantile(peak, u) for u in (0.2, 0.5, 0.9)] == [39, 42, 46]
    assert [quantile(flat, u) for u in (0.2, 0.5, 0.9)] == [23, 30, 41]
    assert (_fmt(peak[42 - 10], 3), _fmt(-math.log(peak[42 - 10]), 2)) == ("0.134", "2.01")
    assert (_fmt(flat[42 - 10], 3), _fmt(-math.log(flat[42 - 10]), 2)) == ("0.019", "3.98")

    # 第六幕：注意力示意、三个 GRU 的输入维数、到达倒计时、KL 算例
    def softmax(x):
        e = [math.exp(v - max(x)) for v in x]
        return [v / sum(e) for v in e]

    assert [_fmt(v, 3) for v in softmax([1.8, 1.5, 0.2, 0.1, 0.4])] == ["0.422", "0.312", "0.085", "0.077", "0.104"]
    assert [_fmt(v, 3) for v in softmax([0.2, 0.4, 2.0, 1.3, 1.1])] == ["0.073", "0.089", "0.440", "0.219", "0.179"]
    assert (512 + 512, 512 + 512 + 512, 512 + 512 + 128) == (1024, 1536, 1152)
    assert 28 // 4 + 1 == 8 and 42 - 8 == 34 and _fmt(math.sqrt(512), 1) == "22.6"
    kl = math.log(1 / 0.8) + (0.64 + 0.25) / 2 - 0.5
    assert (_fmt(kl, 3), _fmt(kl * 128, 1), _fmt(kl * 128 * 0.01, 3)) == ("0.168", "21.5", "0.215")

    # 第七—九幕：课程阶段、评测随机水平、Table 2 / 4 的比例
    assert 49 - 10 + 1 == 40 and 42 - 10 + 1 == 33
    assert (_fmt(100 / 32, 1), _fmt(300 / 32, 1)) == ("3.1", "9.4")
    assert (_fmt(10 - 6, 0), (10 - 6) ** 2, 3 ** 2) == ("4", 16, 9)
    assert (_fmt(0.455 / 0.511 * 100, 1), _fmt(0.736 / 0.797 * 100, 1)) == ("89.0", "92.3")
    assert (_fmt(11.02 / 1.087, 1), _fmt((2.219 - 2.090) / 2.090 * 100, 1)) == ("10.1", "6.2")
    assert [_fmt(0.455 - v, 3) for v in (0.370, 0.396, 0.443, 0.444)] == ["0.085", "0.059", "0.012", "0.011"]

    for needle in (
        "## 🎬 九幕动画：HumanML3D 全流程",
        "## 🚶 具体实例",
        "## 📁 源码对照",
        "14,616", "44,970", "13,425", "4,648", "29,232", "4,384",
        "$1+2+1+63+126+66+4 = 263$", "251 维", "272",
        "$(170, 263)$", "−22.8°", "10.0 m/s", "第 28 帧",
        "79.4%、81.2%、74.7%、74.7%", "0.894", "**−11.9**",
        "**42 个 512 维 code**", "44{,}184", "21{,}504", "1{,}842{,}688", "1,657,407",
        "39 / 42 / 46", "7.8 / 8.4 / 9.2", "23 / 30 / 41", "2.01", "3.98",
        "0.422 / 0.312 / 0.085 / 0.077 / 0.104", "0.073 / 0.089 / 0.440 / 0.219 / 0.179",
        "**1,024**", "**1,536**", "**1,152**", "$T-t = 34$", "0.168", "21.5", "0.215",
        "**参加 33 个阶段**", "89.0\\%", "92.3\\%", "10.1", "+6.2%", "43,692",
    ):
        assert needle in note, needle
    # 论文只发在 CVPR 2022；旧笔记里的 arXiv 2204.09419 是一篇天体物理论文，不能再当成出处链接
    assert "arxiv.org/abs/2204.09419" not in note and "\narxiv:" not in note


def test_dr_explainer_demos_and_worked_example_share_the_paper_numbers():
    """域随机化：八幕动画第 3、5–7 幕、三个演示与笔记「🚶 具体实例」用同一份论文数字。

    表 1 / 表 2 照抄论文，图 4 / 图 5 是读图近似值；平均、倍数、像素在这些数上现算。
    旧版笔记与演示里的「DR-only 78%、微调后 87%」论文里没有，这里也守着别再写回来。
    """
    js = (DEMO_JS_DIR / "domain_randomization.js").read_text(encoding="utf-8")
    note = DR_VISION_NOTE.read_text(encoding="utf-8")

    for line in (
        "{ name: '完整方法', v: [1.3, 1.8, 2.4], sd: [0.6, 1.7, 3.0] },",
        "{ name: '训练时去掉干扰物', v: [1.5, 7.2, 7.4], sd: [0.6, 4.5, 5.3] }",
        "var FIG4_PRE = [3.8, 3.2, 2.1, 1.9, 1.8, 1.6, 1.6];",
        "var FIG4_SCRATCH = [13.9, 11.2, 2.6, 2.0, 1.7, 1.5, 1.4];",
        "var FIG5_ERR = [14.7, 12.5, 5.5, 1.9];",
        "var GRASP_OK = 38, GRASP_N = 40, SPAM_OK = 9, SPAM_N = 10;",
    ):
        assert line in js, line

    table1 = [
        (1.3, 1.5, 1.4), (1.3, 1.8, 1.4), (1.1, 1.9, 1.9), (0.7, 0.6, 1.0),
        (0.9, 1.0, 1.1), (1.3, 1.2, 0.9), (0.8, 1.0, 3.2), (0.9, 0.9, 1.9),
    ]
    cols = [sum(r[k] for r in table1) for k in range(3)]
    assert [_fmt(c, 1) for c in cols] == ["8.3", "9.9", "12.8"]
    assert [_fmt(c / 8, 2) for c in cols] == ["1.04", "1.24", "1.60"]
    assert _fmt(sum(cols) / 24, 2) == "1.29"
    assert [_fmt(d * 0.1 * 100, 2) for d in (0.7, 0.875, 1.05)] == ["7.00", "8.75", "10.50"]
    assert _fmt(224 / 2 * 0.05, 1) == "5.6"
    assert (_fmt(7.2 / 1.8, 1), _fmt(7.4 / 2.4, 1), _fmt(2.0 / 1.3, 1), _fmt(5.5 / 1.9, 1)) == ("4.0", "3.1", "1.5", "2.9")
    assert _fmt(12.5 + 0.5 * (5.5 - 12.5), 1) == "9.0"
    z, n, p = 1.96, 40, 38 / 40
    center = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    assert (_fmt(center - half, 2), _fmt(center + half, 2)) == ("0.83", "0.99")

    for needle in (
        "## 🎬 八幕动画：域随机化全流程", "## 🚶 具体实例", "| **列平均** | **1.04** | **1.24** | **1.60** |",
        "**1.29 cm**", "**7.0 cm**", "**8.75 cm**", "**10.5 cm**", "**5.6 像素**", "**4.0 倍**", "**3.1 倍**",
        "**9.0 cm**", "[0.83,\\ 0.99]", "**38 / 40 = 95%**", "**9 / 10 = 90%**",
    ):
        assert needle in note, needle
    for stale in ("78%", "87%"):
        assert stale not in js and stale not in note, f"论文里没有 {stale} 这个抓取成功率"


def test_quadterrain_explainer_demos_and_worked_example_share_the_paper_numbers():
    """四足野外盲走：九幕动画、三个演示与笔记「🚶 具体实例」用同一份论文数字。

    正文、表 1 与补充材料照抄；图 3E、图 5、图 S2 是读图近似值；倍数、步数、功率在这些数上现算。
    旧版笔记把教师写成 PPO，这里守着别再写回来（论文用的是 TRPO）。
    """
    js = (DEMO_JS_DIR / "quadterrain.js").read_text(encoding="utf-8")
    note = QUAD_NOTE.read_text(encoding="utf-8")

    for line in (
        "var F0 = 1.25, FTG_H = 0.2, DT = 0.02;",
        "var DIM_O = 121, DIM_X = 71, DIM_H = 60, DIM_A = 16, DIM_L = 64;",
        "var V_CAP = 0.6, V_LABEL = 0.2, TR_LO = 0.5, TR_HI = 0.9;",
        "var REWARD_W = [0.05, 0.05, 0.04, 0.01, 0.02, 0.025, 2e-5];",
        "var N_PARTICLE = 10, N_TRAJ = 6, N_EVAL = 10, P_TRANS = 0.8, P_REPLAY = 0.05;",
        "var T1_SPEED = [[0.452, 0.338, 0.248], [0.199, 0.197, null]];",
        "var T1_COT = [[0.423, 0.692, 1.23], [0.625, 0.931, null]];",
        "var PAYLOAD_KG = 10, PAYLOAD_FRAC = 0.227, PAYLOAD_STEP = 13.4;",
        "var MEM_PARAMS = [161960, 158300, 158070];",
        "var DEV_DROP = 0.355;",
        "var FT_T = 2.1, SAL_T = 3.4;",
        "var PROBE_FORCE = 80.1;",
    ):
        assert line in js, line

    def ftg(k):
        return 0.2 * (-2 * k**3 + 3 * k**2) if k <= 1 else 0.2 * (2 * k**3 - 9 * k**2 + 12 * k - 4)

    assert [_fmt(ftg(k) * 100, 1) for k in (0.25, 0.5, 1, 1.5)] == ["3.1", "10.0", "20.0", "10.0"]
    assert round(math.degrees(2 * math.pi * 1.25 * 0.02), 6) == 9 and round(1 / 1.25 / 0.02) == 40
    assert [_fmt(math.exp(-2 * (v - 0.6) ** 2), 3) for v in (0, 0.2, 0.4)] == ["0.487", "0.726", "0.923"]
    assert 2 + 1 + 3 + 3 + 3 + 24 + 8 + 4 + 1 + 24 + 24 + 24 == 121
    assert 12 + 36 + 4 + 4 + 4 + 4 + 4 + 3 == 71 and 3 + 3 + 6 + 12 + 12 + 12 + 8 + 4 == 60
    assert sum([1, 1, 0, 0, 1, 1, 1, 0, 1, 1]) / 10 == 0.7
    pr = [9 / 60, 42 / 60, 39 / 60, 3 / 60]
    assert [_fmt(p / sum(pr), 3) for p in pr] == ["0.097", "0.452", "0.419", "0.032"]
    assert (_fmt(0.452 / 0.199, 2), _fmt(0.338 / 0.197, 2)) == ("2.27", "1.72")
    assert (_fmt((1 - 0.423 / 0.625) * 100, 0), _fmt((1 - 0.692 / 0.931) * 100, 0)) == ("32", "26")
    assert (_fmt(0.423 * 0.452 / (0.625 * 0.199), 2), _fmt(0.692 * 0.338 / (0.931 * 0.197), 2)) == ("1.54", "1.28")
    assert _fmt(10 / 0.227, 0) == "44" and round((3.4 - 2.1) / 0.02) == 65
    assert _fmt(0.46 * (1 - 0.355), 2) == "0.30" and _fmt(80.1 / 98.1 * 100, 0) == "82"
    assert _fmt(22.5 - 12.9, 1) == "9.6" and _fmt((22.5 - 12.9) / 12.9 * 100, 0) == "74"
    assert _fmt(10000 * 80000 * 0.02 / 86400, 0) == "185"

    for needle in (
        "## 🎬 九幕动画：ANYmal 野外盲走全流程", "## 🚶 具体实例", "**3.1 cm**", "**10 cm**", "**20 cm**", "**9°**",
        "**40 步**", "**0.487**", "**0.726**", "**0.923**", "**121**", "**71**", "**60**", "**6000**",
        "$w = 0.097,\\ 0.452,\\ 0.419,\\ 0.032$", "**2.27 倍**", "**1.72 倍**", "**32%**", "**26%**",
        "**44 kg**", "**65 步**", "**0.30 rad**", "**9.6 cm**", "**82%**", "**185 天**", "TRPO",
    ):
        assert needle in note, needle
    assert "用 PPO" not in note and "PPO 训练" not in note, "论文的教师用的是 TRPO"


def test_realhumanoid_explainer_demos_and_worked_example_share_the_paper_numbers():
    """真实世界人形行走：十幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一份论文数字。

    正文与 arXiv v1 附录（表 I–IV、式 3–16）照抄；图 2D、图 8 是读图近似值；奖励、概率、步数在这些数上现算。
    旧版笔记把 Agility 自带控制器写成 MPC、把闭链写成「耦合约束补丁」，这里守着别再写回来。
    """
    js = (DEMO_JS_DIR / "realhumanoid.js").read_text(encoding="utf-8")
    note = RH_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "realhumanoid.py").read_text(encoding="utf-8")
    kit = DEMO_KIT.read_text(encoding="utf-8")

    for line in (
        "var CTX = 16, DT = 0.02, D_MODEL = 192, N_HEAD = 4, N_BLOCK = 4, MLP_RATIO = 2.0;",
        "var N_PD = 16, N_GAIN = 8, POLICY_HZ = 50, PD_HZ = 1000;",
        "var SIGMA_V = 0.2, SIGMA_W = 0.2, H_LOW = 1.0, KAPPA = 0.04, SWING_Z_W = 5.0;",
        "var DAMP = [0.3, 4.0];",
        "var PPO = { gpus: 4, envT: 8192, envS: 4096, steps: 24, epochs: 5, mbT: 49152, mbS: 24576, iters: 6000, ep: 20 };",
        "var FIG2D_OURS = [100, 100, 100], FIG2D_NATIVE = [100, 97, 71];",
        "var FIG8A = [['Transformer', 97], ['LSTM', 89], ['TCN', 86], ['MLP', 75]];",
        "[16, [1.01, 0.96, 0.9, 0.84, 0.8, 0.75]]",
        "['只 RL', [0.9, 0.89, 0.85, 0.79, 0.67, 0.16]]",
        "['只模仿', [0.92, 0.85, 0.81, 0.75, 0.64, 0.63]]",
        "var QT_STEPS = 100;",
    ):
        assert line in js, line
    # 十幕的幕号要显示成 10，不是 010
    assert "function sceneNo(i)" in kit and "'0' + (i + 1)" not in kit

    def r(err):
        return math.exp(-(err**2) / 0.2)

    assert [_fmt(r(e), 3) for e in (0.1, 0.2, 0.5)] == ["0.951", "0.819", "0.287"]
    assert 3 + 3 + 26 + 26 + 3 + 2 + 3 == 66 and 66 + 6 + 121 + 36 + 61 + 147 + 40 + 3 == 480
    assert 16 * 17 // 2 == 136 and _fmt(16 * 0.02, 2) == "0.32" and 100 / 16 == 6.25 and 192 // 4 == 48
    assert _fmt(math.sqrt(0.3 * 4.0), 2) == "1.10"
    assert _fmt(math.log(1 / 0.3) / math.log(4.0 / 0.3), 3) == "0.465" and _fmt(0.7 / 3.7, 3) == "0.189"
    assert 8192 * 24 * 6000 == 1_179_648_000 and _fmt(8192 * 24 * 6000 * 0.02 / 86400, 0) == "273"
    assert 8192 * 24 // 49152 * 5 == 20 and 4096 * 24 // 24576 == 4
    assert _fmt(0.2 / 1.3 * (0.2 / 0.6) * (0.52 / 2.0) * 100, 1) == "1.3"
    assert (_fmt(0.16 / 0.75 * 100, 0), _fmt(0.75 / 0.62, 2), _fmt(0.63 / 0.75 * 100, 0)) == ("21", "1.21", "84")

    for needle in (
        "## 🎬 十幕动画：Digit 真实世界人形行走全流程", "## 🚶 具体实例", "**0.951**", "**0.819**", "**0.287**",
        "**66**", "**480**", "**136 对**", "**0.32 s**", "**6.25 倍**", "**1.10**", "**0.465**", "**0.189**",
        "**约 11.8 亿步**", "**273 天**", "**1.3%**", "**21%**", "虚拟弹簧", "交替子步",
    ):
        assert needle in note, needle
    for needle in ("0.951", "0.819", "0.287", "480 维", "136 对", "11.8 亿", "6.25 倍", "71%"):
        assert needle in narration, needle
    for stale in ("**超 MPC**", "~10 B steps", "自实现的耦合约束补丁", "**主动调摆臂幅度**"):
        assert stale not in note, f"旧版笔记的说法原文里没有：{stale}"


def test_op3soccer_explainer_demos_and_worked_example_share_the_paper_numbers():
    """OP3 足球：十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一份论文数字。

    正文、补充材料表 S1–S5 与表 1 照抄（arXiv v2 = Science Robotics 作者版）；156% / 24% 是 v1 的另一种测法；
    267 维、1.43 Hz、0.111、1.65%、2000 步、12.5%、±0.07 是在这些数上现算的。
    旧版笔记把「起身用时少 63%」写成「起身快 63%」，这里守着别再写回来。
    """
    js = (DEMO_JS_DIR / "op3soccer.js").read_text(encoding="utf-8")
    note = SOCCER_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "op3soccer.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "op3soccer.js").read_text(encoding="utf-8")

    for line in (
        "var OP3_CM = 51, OP3_KG = 3.5, JOINTS = 20;",
        "var HZ = 40, DT = 1 / HZ;",
        "var FILTER_A = 0.8;",
        "var PITCH_L = 5, PITCH_W = 4, GOAL_W = 0.8;",
        "var KEY_POSES = 3, GETUP_MEAN = 1.5, EP_SEC = 50;",
        "var UPRIGHT_LO = 0.2, UPRIGHT_HI = 0.4, KNEE_NM = 5;",
        "['起身技能', 2.4e8, 70, 14], ['踢球技能', 2.0e9, 580, 158], ['完整 1v1', 9.0e8, 262, 68]",
        "{ name: '行走', unit: 'm/s', base: 0.2, real: 0.57, sim: 0.51, paper: '+181%' }",
        "{ name: '转身', unit: 'rad/s', base: 0.71, real: 2.85, sim: 3.19, paper: '+302%' }",
        "{ name: '起身用时', unit: 's', base: 2.52, real: 0.93, sim: 0.73, paper: '−63%' }",
        "var SIM_REAL = [13, -11, 28, -5];",
        "var SETPIECE = { n: 50, real: 29, sim: 35, touchReal: 4.7, touchSim: 4.6 };",
        "var V1 = { walk: [0.27, 0.69], kick: [2.1, 2.6], pct: [156, 63, 24], penalty: 7, getupShoot: 8, trials: 10 };",
        "var TOY_POSE = { jointErr: 0.8, gravAng: 0.3 };",
        "var TOY_LAMBDA = { qs: 0.6, lr: 0.12, q0: 0.2, q1: 0.9, lam0: 0.5 };",
        "var TOY_POOL = 40;",
        "var TOY_TILT = 0.3;",
    ):
        assert line in js, line

    # 表 S2 逐项相加
    assert 5 * (20 + 3 + 3 + 3 + 20) == 245 and 4 * 2 + 5 * 2 + 2 + 2 == 22
    # 指数滤波：阶跃、时间常数、截止频率、奈奎斯特增益
    a = 0.8
    assert next(n for n in range(1, 30) if 1 - a**n >= 0.9) == 11 and 11 * 25 == 275
    assert _fmt(-1 / math.log(a), 2) == "4.48"
    assert _fmt(math.acos((1 + a * a - 2 * (1 - a) ** 2) / (2 * a)) / (2 * math.pi) * 40, 2) == "1.43"
    assert _fmt((1 - a) / (1 + a), 3) == "0.111"
    assert _fmt((1 - a) / math.sqrt(1 + a * a - 2 * a * math.cos(2 * math.pi * 2 / 40)), 2) == "0.58"
    # 起身：指数间隔与两种零点
    assert _fmt((1 - math.exp(-0.025 / 1.5)) * 100, 2) == "1.65" and _fmt(math.exp(-2), 3) == "0.135"
    p, g = (math.pi - 0.8) / math.pi, (math.pi - 0.3) / math.pi
    assert (_fmt(p, 3), _fmt(g, 3), _fmt(p * g, 3)) == ("0.745", "0.905", "0.674")
    g3 = 1 - 0.3 / (math.pi / 2)
    assert (_fmt(g3, 3), _fmt(p * g3, 3)) == ("0.809", "0.603")
    # λ、对手池、直立与一局的量级
    assert (_fmt(0.5 + 0.12 * 0.4, 3), _fmt(0.5 - 0.12 * 0.3, 3)) == ("0.548", "0.464")
    assert 40 // 4 + 1 == 11 and _fmt(1 / 11, 3) == "0.091" and _fmt(10 * 11 / 2 / 40 / 11, 3) == "0.125"
    assert _fmt((0.4 - 0.3) / 0.2, 1) == "0.5" and 50 * 40 == 2000 and _fmt(0.02 * 2000, 0) == "40"
    # 训练开销、表 1、v1、定位球的标准误
    assert [_fmt(x * 0.025 / 86400, 0) for x in (2.4e8, 2.0e9, 9.0e8)] == ["69", "579", "260"]
    assert [_fmt(x, 0) for x in (57 / 20 * 100 - 100, 285 / 71 * 100 - 100, 100 - 93 / 252 * 100, 277 / 207 * 100 - 100)] == [
        "185", "301", "63", "34"]
    assert (_fmt(69 / 27 * 100 - 100, 0), _fmt(26 / 21 * 100 - 100, 0)) == ("156", "24")
    assert (_fmt(math.sqrt(0.58 * 0.42 / 50), 3), _fmt(math.sqrt(0.7 * 0.3 / 50), 3)) == ("0.070", "0.065")

    for needle in (
        "## 🎬 十二幕动画：OP3 小人形学踢足球全流程", "## 🚶 具体实例", "**245**", "**267**", "**0.914**", "275 ms",
        "**1.43 Hz**", "**0.111**", "**1.65%**", "0.135", "0.745", "0.905", "0.674", "0.809", "0.603",
        "0.548", "0.464", "1/11", "12.5%", "2000", "29/50", "0.69/0.27", "2.6/2.1", "0.070", "0.065",
        'data-demo="soccer-filter"', 'data-demo="soccer-lambda"', 'data-demo="soccer-pool"',
    ):
        assert needle in note, needle
    for needle in ("267 维", "275 毫秒", "1.43 赫兹", "0.111", "1.65%", "0.674", "11 分之 1", "156%", "181%", "29 个"):
        assert needle in narration, needle
    # 片头接上一期（真实世界人形行走）的片尾预告，片尾只预告下一篇（LCP）；封面大标题只留纯文字
    assert "上一期结尾预告" in narration and "下一篇讲 LCP" in narration
    assert ">OP3</div>" in intro and "⚽" not in intro
    for stale in ("起身快 63%", "七幕动画"):
        assert stale not in note, f"旧版笔记的说法：{stale}"


def test_lcp_explainer_demos_and_worked_example_share_the_paper_numbers():
    """LCP：十幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一份论文数字。

    表 I–IV、式 4–9、附录 B 照抄 arXiv 2410.11825 v3；71 / 50 / 710 / 831 维、系数表、Adam 取自官方代码；
    13.1 倍、91%、44%、9164 次等在这些数上现算；一维玩具策略与两维高斯算例只说明机制。
    旧版笔记把官方代码的优化器写成 SGD、把式 7 写成 ∇_o π(o)、说「仿真里测不出抖动」，这里守着别再写回来。
    """
    js = (DEMO_JS_DIR / "lcp.js").read_text(encoding="utf-8")
    note = LCP_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "lcp.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "lcp.js").read_text(encoding="utf-8")

    for line in (
        "var LAMBDA_GP = 0.002, LAMBDA_ROA = 0.1;",
        "var HZ = 50, EP_STEPS = 500, CMD_EVERY = 150;",
        "var CMD_RANGE = [[0, 0.8], [-0.4, 0.4], [-0.6, 0.6]];",
        "['LCP（本文）', [3.21, 0.17, 10.65, 24.57, 0.06, 26.03], [0.11, 0.01, 0.37, 1.17, 0.002, 1.51]],",
        "['不平滑', [42.19, 0.41, 12.92, 42.68, 0.09, 28.87], [4.72, 0.08, 0.99, 10.27, 0.01, 0.85]]",
        "[0.001, [3.69, 0.21, 11.44, 27.09, 0.06, 26.32], [0.31, 0.05, 1.18, 4.44, 0.01, 1.2]],",
        "[0.01, [0.17, 0.07, 2.75, 5.89, 0.007, 16.11], [0.01, 0.0, 0.12, 0.28, 0.0, 2.76]]",
        "['只罚当前观测', [7.16, 0.35, 13.7, 35.18, 0.09, 25.44], [0.6, 0.03, 1.5, 4.84, 0.005, 3.73]]",
        "['Berkeley Humanoid', [1.77, 0.12, 7.92, 19.99, 0.06, 26.5], [0.32, 0.01, 0.21, 0.36, 0.0, 0.57]]",
        "['Unitree H1', [[1.11, 0.14, 10.95], [0.07, 0.01, 0.53]], [[1.18, 0.15, 11.8], [0.09, 0.01, 0.57]], [[1.2, 0.14, 11.68], [0.09, 0.01, 0.84]]],",
        "var CURRIC = { s0: 0.8, up: 1.0001, down: 0.9999, hi: 400, lo: 50, cap: 2.0 };",
        "var CODE = { envs: 4096, steps: 24, lr: 2e-4, kl: 0.008, entropy: 0.01, epochs: 5, minibatches: 4, gpSched: [0.002, 0.002, 700, 1000], privSched: [0, 0.1, 2000, 3000] };",
        "var TOY_K = 5, TOY_SIGMA = 0.045, TOY_SEED = 6, TOY_STEPS = 120;",
        "var GAUSS_J = [[0.8, 0.2], [-0.4, 0.6]];",
        "var GAUSS_SIGMA = 0.4;",
        "var GAUSS_Z = [1, -0.5];",
    ):
        assert line in js, line

    # 观测维度（GR1 配置）
    assert 2 + 3 + 3 + 2 + 21 + 21 + 19 == 71 and 4 + 1 + 2 * 21 + 3 == 50 and 71 + 50 + 10 * 71 == 831
    # 玩具：一维策略的最大斜率与均方根斜率（同 lcp.js 的 policyOf / toyTrajectory）
    b = (5 - 1) / 4.5
    slopes = [1 + b * 4.5 * math.cos(4.5 * 0.9 * math.sin(t * 0.055)) for t in range(120)]
    assert _fmt(5 * 0.045, 3) == "0.225" and _fmt(math.sqrt(sum(x * x for x in slopes) / 120), 2) == "2.75"
    # 两维高斯：‖J‖²_F / σ²、第一个样本、σ 减半
    fro = 0.8**2 + 0.2**2 + 0.4**2 + 0.6**2
    g = ((0.8 * 0.4 - 0.4 * -0.2) / 0.16, (0.2 * 0.4 + 0.6 * -0.2) / 0.16)
    assert (_fmt(fro, 2), _fmt(fro / 0.16, 1), _fmt(g[0], 2), _fmt(g[1], 2), _fmt(g[0] ** 2 + g[1] ** 2, 2)) == (
        "1.20", "7.5", "2.50", "-0.25", "6.31")
    assert _fmt(fro / 0.04, 0) == "30"
    # 课程、训练量
    assert math.ceil(math.log(2.0 / 0.8) / math.log(1.0001)) == 9164 and round(9164 / 24) == 382
    assert 4096 * 24 == 98304 and _fmt(6e8 * 0.02 / 86400, 0) == "139"
    # 表 I 的比例、表 III 的涨幅
    assert _fmt(42.19 / 3.21, 1) == "13.1" and _fmt((28.87 - 26.03) / 28.87 * 100, 1) == "9.8"
    assert _fmt((42.68 - 24.57) / 42.68 * 100, 0) == "42" and _fmt((42.19 - 3.69) / 42.19 * 100, 0) == "91"
    assert _fmt((28.87 - 16.11) / 28.87 * 100, 0) == "44" and _fmt(7.16 / 3.21, 2) == "2.23"
    assert _fmt((1.20 - 1.11) / 1.11 * 100, 1) == "8.1"

    for needle in (
        "## 🎬 十幕动画：LCP 全流程", "## 🚶 具体实例", "**71**", "**50**", "**710**", "**831**", "**0.225**", "**0.142**",
        "**2.75**", "**7.5**", "**6.31**", "**7.53**", "**30**", "**9164**", "**382**", "**13.1 倍**", "**9.8%**", "**42%**",
        "**91%**", "**44%**", "**2.23 倍**", "**98,304**", "**139 天**", "**+8.1%**", "\\nabla_s\\log\\pi(a \\mid s)",
        'data-demo="lcp-sensitivity"', 'data-demo="lcp-gp"', 'data-demo="lcp-table"', "Adam",
    ):
        assert needle in note, needle
    for needle in ("28.87", "42.19", "13 倍", "0.142", "2.75", "7.5", "6.31", "831 维", "9164", "91%", "44%", "8%", "0.002"):
        assert needle in narration, needle
    # 片头接上一期（OP3 足球）的片尾预告，片尾只预告下一篇（ASAP）
    assert "上一期结尾预告" in narration and "下一篇讲 ASAP" in narration and "ASAP" in intro
    for stale in ("⚠️ **注意**：LCP 论文使用 SGD", "仿真根本测不出", "\\nabla_o \\pi(o)", "五幕动画"):
        assert stale not in note, f"旧版笔记的说法：{stale}"


def _asap_toy(k: float, delay: int):
    """asap.js 的单关节玩具（toyTargets / toyStep / toyFit / toyErr）逐行移植：返回拟合的 w1 与 1 s 开环误差（度）。"""
    kp, kd, fric, inertia, dt, sub, steps = 20.0, 0.2, 0.6, 0.05, 0.02, 4, 100

    def targets(kind):
        out = []
        for i in range(steps):
            t = i * dt
            if kind == "train":
                v = (0.35 * math.exp(-(((t - 0.45) / 0.12) ** 2)) - 0.25 * math.exp(-(((t - 0.8) / 0.1) ** 2))
                     + 0.2 * math.exp(-(((t - 1.35) / 0.18) ** 2)) + 0.08 * math.sin(2 * math.pi * 1.6 * t))
            else:
                v = 0.3 * math.sin(2 * math.pi * 0.9 * t) * math.exp(-0.4 * t) + 0.15 * math.exp(-(((t - 1.1) / 0.15) ** 2))
            out.append(v)
        return out

    def step(s, target, gain):
        q, v = s
        h = dt / sub
        for _ in range(sub):
            tau = gain * (target - q) - kd * v - fric * v
            v += tau / inertia * h
            q += v * h
        return (q, v)

    def real(tg):
        s, tr = (0.0, 0.0), [(0.0, 0.0)]
        for i in range(len(tg)):
            s = step(s, tg[max(0, i - delay)], k * kp)
            tr.append(s)
        return tr

    def sim(tg, w=None):
        s, tr = (0.0, 0.0), [(0.0, 0.0)]
        for i in range(len(tg)):
            d = w[0] * (tg[i] - s[0]) + w[1] * s[1] if w else 0.0
            s = step(s, tg[i] + d, kp)
            tr.append(s)
        return tr

    def best(sr, a, nxt):
        s0, s1 = step(sr, a, kp), step(sr, a + 1, kp)
        g, e, W = (s1[0] - s0[0], s1[1] - s0[1]), (s0[0] - nxt[0], s0[1] - nxt[1]), (1, 0.01)
        return -(W[0] * g[0] * e[0] + W[1] * g[1] * e[1]) / (W[0] * g[0] ** 2 + W[1] * g[1] ** 2)

    tr, te = targets("train"), targets("test")
    r_tr, r_te = real(tr), real(te)
    a11 = a12 = a22 = b1 = b2 = 0.0
    for i in range(len(tr)):
        x = (tr[i] - r_tr[i][0], r_tr[i][1])
        y = best(r_tr[i], tr[i], r_tr[i + 1])
        a11 += x[0] * x[0]; a12 += x[0] * x[1]; a22 += x[1] * x[1]; b1 += x[0] * y; b2 += x[1] * y  # noqa: E702
    det = a11 * a22 - a12 * a12
    w = ((b1 * a22 - b2 * a12) / det, (a11 * b2 - a12 * b1) / det)

    def err(tra, trb, horizon=1.0):
        n = round(horizon / dt)
        return sum(abs(tra[i][0] - trb[i][0]) for i in range(1, n + 1)) / n * 180 / math.pi

    return w[0], err(sim(te), r_te), err(sim(te, w), r_te)


def test_asap_explainer_demos_and_worked_example_share_the_paper_numbers():
    """ASAP：十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一份论文数字。

    表 I–VII、图 10 / 12 / 13 柱上的标注照抄 arXiv 2502.01143 v3；脚踝刚度 20、0.65 倍刚度的 −0.35、掩码 [4, 5, 10, 11]、
    10 次 / 2000 步取自官方代码；53.1%、18.0%、29.6%、3.7 倍、64,377 次等在这些数上现算；单关节玩具与一步匹配只说明机制。
    旧版笔记把 Delta Dynamics 写成「学了不回灌仿真」、没写真机只学 4 个踝自由度，这里守着别再写回来。
    """
    js = (DEMO_JS_DIR / "asap.js").read_text(encoding="utf-8")
    note = ASAP_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "asap.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "asap.js").read_text(encoding="utf-8")

    for line in (
        "var DOF = 23, HIST = 5;",
        "var TERM = { start: 1.5, end: 0.3 };",
        "var DR_PRE = { friction: [0.2, 1.1], kp: [0.925, 1.05], delayMs: [20, 40], pushEvery: 10, pushVel: 0.5 };",
        "[[19.5, 15.1, 6.44, 5.8], [33.3, 23.2, 6.8, 6.84], [80.8, 43.5, 10.6, 11.1]],",
        "[[19.9, 15.6, 6.48, 5.86], [26.8, 19.2, 5.09, 5.36], [37.9, 22.9, 4.38, 5.26]]",
        "[[19.0, 14.9, 6.19, 5.59], [25.9, 18.4, 4.93, 5.19], [36.9, 22.6, 4.23, 5.1]]",
        "[[100, 116, 52.5, 3.4, 6.16], [82.9, 175, 80.7, 3.87, 7.19], [100, 186, 93.0, 4.98, 8.98], [60.0, 190, 89.6, 4.29, 8.7], [100, 129, 77.0, 2.69, 5.65]]",
        "['踢球（训练 Δ 时见过）', [61.2, 43.5, 2.96, 2.91], [50.2, 40.1, 2.46, 2.7]],",
        "['詹姆斯「消音」（没见过）', [159, 55.3, 3.43, 6.43], [112, 47.5, 2.84, 5.94]]",
        "var REAL = { tasks: ['踢球', '前跳', '前后迈步', '单脚平衡', '单脚跳'], runs: 30, clips: 100, need: 400, ankle: 4, broke: 2, locoMin: 10, height: 1.35 };",
        "closed: [534.02, 104.95, 97.51, 98.15]",
        "closed: [123.43, 118.46, 97.51, 113.28]",
        "closed: [180.97, 169.19, 125.9, 97.51, 176.52]",
        "var FIG12 = { beta: [0.025, 0.05, 0.1, 0.2, 0.4], label: ['1/40', '1/20', '1/10', '1/5', '2/5'], mpjpe: [182.0, 175.2, 173.5, 201.5, 1208.3], wo: 336.1, asap: 126.9 };",
        "['踝俯仰', 0.056, 0.054], ['踝横滚', 0.0228, 0.017]",
        "ankleKp: 20, ankleKd: 0.2, ankleIdx: [4, 5, 10, 11]",
        "fixedIters: 10, gradIters: 2000, gradLr: 0.0002",
        "var TOY_EX = { target: 0.3, q: 0.1 };",
        "var FP = { pi: 0.3, q: 0.1, k: 0.65 };",
    ):
        assert line in js, line

    # 维度、终止课程
    assert (23 + 23 + 3 + 3 + 23) * 5 + 1 == 376 and 3 + 3 + 4 + 3 + 23 + 23 == 59
    assert math.ceil(math.log(1.5 / 0.3) / -math.log(1 - 2.5e-5)) == 64377
    # 弱电机的完美修正与一步匹配（玩具）
    assert (_fmt(20 * 0.2, 1), _fmt(0.65 * 20 * 0.2, 1), _fmt(-0.35 * 0.2, 2), _fmt(20 * (0.3 - 0.07 - 0.1), 1)) == ("4.0", "2.6", "-0.07", "2.6")
    y_star = (0.3 - 0.35 * 0.1) / 0.65
    assert _fmt(y_star, 4) == "0.4077" and _fmt(0.65 * 20 * (y_star - 0.1), 1) == "4.0"
    # 单关节玩具：拟合的 w1 与回放 1 s 的误差（三种延迟）
    toy = [_asap_toy(0.65, d) for d in (0, 1, 2)]
    assert [_fmt(t[0], 3) for t in toy] == ["-0.344", "-0.511", "-0.622"]
    assert [(_fmt(t[1], 2), _fmt(t[2], 2)) for t in toy] == [("1.28", "0.02"), ("2.27", "0.40"), ("3.23", "0.86")]
    # 表 III–V、图 10 / 12 / 13 的比例
    assert _fmt((80.8 - 37.9) / 80.8 * 100, 1) == "53.1" and _fmt((68.1 - 37.9) / 68.1 * 100, 1) == "44.3"
    assert _fmt(80.8 / 19.5, 1) == "4.1" and _fmt(37.9 / 19.9, 1) == "1.9"
    assert _fmt((175 - 129) / 175 * 100, 1) == "26.3" and _fmt((148 - 129) / 148 * 100, 1) == "12.8"
    assert _fmt((61.2 - 50.2) / 61.2 * 100, 1) == "18.0" and _fmt((159 - 112) / 159 * 100, 1) == "29.6"
    assert _fmt(534.02 / 145.0, 1) == "3.7" and _fmt((98.15 - 97.51) / 97.51 * 100, 2) == "0.66"
    assert _fmt((145.0 - 97.51) / 145.0 * 100, 1) == "32.8" and _fmt((173.5 - 126.9) / 173.5 * 100, 1) == "26.9"
    upper = [0.014, 0.015, 0.014, 0.015, 0.013, 0.017, 0.011, 0.015]
    legs = [0.037, 0.038, 0.033, 0.049, 0.056, 0.0228, 0.038, 0.039, 0.033, 0.049, 0.054, 0.017]
    assert _fmt(sum(upper) / 8, 5) == "0.01425" and _fmt(sum(legs) / 12, 4) == "0.0388"
    assert _fmt((sum(legs) / 12) / (sum(upper) / 8), 1) == "2.7" and _fmt(0.056 / (sum(upper) / 8), 1) == "3.9"

    for needle in (
        "## 🎬 十二幕动画：ASAP 全流程", "## 🚶 具体实例", "**376**", "**59**", "**64,377**", "**4.0 N·m**", "**2.6 N·m**",
        "**−0.07 rad**", "**0.4077**", "**−0.344**", "**1.28°**", "**0.02°**", "**53.1%**", "**26.3%**", "**18.0%**", "**29.6%**",
        "**3.7 倍**", "**涨了 0.66%**", "**26.9%**", "**0.01425**", "**0.0388**", "`[4, 5, 10, 11]`", "52.7%",
        'data-demo="asap-delta"', 'data-demo="asap-tables"', 'data-demo="asap-ablation"',
    ):
        assert needle in note, needle
    for needle in ("80.8", "37.9", "53%", "129", "116", "61.2", "50.2", "159", "112", "534", "97.5", "173.5", "126.9", "0.056", "65%", "0.07", "0.41"):
        assert needle in narration, needle
    # 片头接上一期（LCP）的片尾预告，片尾只预告下一篇（BeyondMimic）
    assert "上一期结尾预告" in narration and "下一篇讲 BeyondMimic" in narration and "BeyondMimic" in intro
    for stale in ("仅学习 delta 动力学但不回灌仿真", "前跳（0.85 m / 1.5 m）", "球星庆祝动作、APT 舞蹈", "「蒸馏」进最终策略", "首版基础摘要"):
        assert stale not in note, f"旧版笔记的说法：{stale}"


def _inekf_mat(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def _inekf_rank(rows, tol=1e-9):
    """Gaussian elimination with partial pivoting, pure Python (the test env has no numpy)."""
    m = [r[:] for r in rows]
    rank, cols = 0, len(m[0])
    for c in range(cols):
        piv = max(range(rank, len(m)), key=lambda r: abs(m[r][c]), default=None)
        if piv is None or abs(m[piv][c]) < tol:
            continue
        m[rank], m[piv] = m[piv], m[rank]
        for r in range(len(m)):
            if r != rank and m[r][c]:
                f = m[r][c] / m[rank][c]
                m[r] = [x - f * y for x, y in zip(m[r], m[rank], strict=True)]
        rank += 1
    return rank


def _inekf_observability_rank(n_contacts: int) -> int:
    """第 5.4 节：Φ = e^{AΔt}，O = [H; HΦ; HΦ²; …]，A 只含 (g)× 与 I。"""
    dim, dt, g = 9 + 3 * n_contacts, 0.01, (0.0, 0.0, -9.81)
    gx = [[0.0, -g[2], g[1]], [g[2], 0.0, -g[0]], [-g[1], g[0], 0.0]]
    phi = [[1.0 if i == j else 0.0 for j in range(dim)] for i in range(dim)]
    for i in range(3):
        for j in range(3):
            phi[3 + i][j] += gx[i][j] * dt
            phi[6 + i][j] += 0.5 * gx[i][j] * dt * dt
        phi[6 + i][3 + i] += dt
    h = []
    for k in range(n_contacts):
        for i in range(3):
            row = [0.0] * dim
            row[6 + i], row[9 + 3 * k + i] = -1.0, 1.0
            h.append(row)
    rows, m = [], [[1.0 if i == j else 0.0 for j in range(dim)] for i in range(dim)]
    for _ in range(20):
        rows += _inekf_mat(h, m)
        m = _inekf_mat(phi, m)
    return _inekf_rank(rows)


def test_inekf_explainer_demos_and_worked_example_share_the_paper_numbers():
    """接触辅助 InEKF：十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一份数。

    表 1、第 6.2 / 6.4 / 9 节的数照抄 IJRR 扩展版（arXiv 1904.09251 v2）；站立例子、一次校正、新触地点、香蕉的弯度
    在论文的式子上现算；可观性的秩用纯 Python 重算。旧版起步笔记把会议版标题和扩展版的 arXiv 号混在一起、
    还说「MIT Cheetah、Unitree 都以 InEKF 为基石」，这里守着别再写回来。
    """
    js = (DEMO_JS_DIR / "inekf.js").read_text(encoding="utf-8")
    note = INEKF_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "inekf.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "inekf.js").read_text(encoding="utf-8")

    for line in (
        "var G = 9.81;",
        "var CASSIE = { dof: 20, actuators: 10, springs: 4, encoders: 14, imuHz: 800, encHz: 2000, height: 1.2732 };",
        "var CONV = { runs: 100, eulerDeg: 30, velMax: 1.0, simSpeed: 0.3, realSpeed: 0.3, simWin: 1, realWin: 2 };",
        "var BANANA = { speed: 1, secs: [0, 2, 4, 6, 8], posSigma: 0.1, yawDeg: 10, particles: 10000, fullYawDeg: 360 };",
        "var MOCAP = { cams: 18, secs: 60, pathM: 15, driftPct: 5 };",
        "var LONGWALK = { meters: 200, secs: 7 * 60 + 45 };",
        "var UPD = { p: v3(0.30, 0, 0.90), d: v3(0.40, -0.13, 0), h: v3(0.12, -0.13, -0.88), sigP: 0.1, sigD: 0.1, sigN: 0.01 };",
        "var EX_SMALL = standingExample(0.1, 1);",
        "var EX_BIG = standingExample(0.5, 1);",
        "var OBS = { one: [12, 8], two: [15, 11], qekfToy: 9 };",
        "var CODE = { gyro: 0.01, accel: 0.1, gyroBias: 0.00001, accelBias: 0.0001, contact: 0.1, contactExample: 0.01 };",
        "A[1][0] = -G; A[2][0] = 0;",
        "H[0][3] = -1; H[1][4] = -1; H[0][5] = 1; H[1][6] = 1;",
    ):
        assert line in js, line

    # 站立例子：俯仰错 θ，传 1 秒（具体实例第 2–4 步）
    def standing(th):
        acc = (9.81 * math.sin(th), 0.0, 9.81 * math.cos(th) - 9.81)
        xiv = 9.81 * th  # g × ξ_R 的 x 分量
        a = (1 - math.cos(th)) / th**2
        b = (th - math.sin(th)) / th**3
        # Γ1(ξ_R)·(xiv, 0, 0)，ξ_R = (0, θ, 0)
        inekf = (xiv - b * th * th * xiv, 0.0, -a * th * xiv)
        qekf = (-9.81 * th * math.cos(th), 0.0, 9.81 * th * math.sin(th))
        return acc, inekf, qekf

    acc, inekf, qekf = standing(0.1)
    assert [_fmt(x, 4) for x in acc] == ["0.9794", "0.0000", "-0.0490"]
    assert [_fmt(x, 4) for x in inekf] == [_fmt(x, 4) for x in acc], "指数映射之后应和滤波器自己的积分一位不差"
    assert (_fmt(9.81 * 0.1, 3), _fmt(0.5 * 9.81 * 0.1, 4)) == ("0.981", "0.4905")
    assert [_fmt(x, 4) for x in qekf] == ["-0.9761", "0.0000", "0.0979"]
    acc5, _, qekf5 = standing(0.5)
    assert [_fmt(-x, 4) for x in acc5][::2] == ["-4.7032", "1.2009"]
    assert [_fmt(qekf5[0], 4), _fmt(qekf5[2], 4)] == ["-4.3045", "2.3516"]

    # 一次运动学校正（第 6 步）与新触地点（第 9 步）
    s = 0.1**2 + 0.1**2 + 0.01**2
    k = 0.1**2 / s
    assert (_fmt(s, 4), _fmt(k, 4), _fmt(k * 0.02 * 100, 3)) == ("0.0201", "0.4975", "0.995")
    assert [_fmt(x, 2) for x in (0.30 + 0.12, -0.13, 0.90 - 0.88)] == ["0.42", "-0.13", "0.02"]
    assert _fmt(math.sqrt(0.1**2 + 0.01**2), 4) == "0.1005"

    # 香蕉（第 8 步）
    d, s10, s20, s30 = 8.0, math.radians(10), math.radians(20), math.radians(30)
    assert (_fmt(d * math.sin(s10), 2), _fmt(d * (1 - math.cos(s10)), 2)) == ("1.39", "0.12")
    assert (_fmt(d * math.sin(s20), 2), _fmt(d * (1 - math.cos(s20)), 2)) == ("2.74", "0.48")
    assert (_fmt(d * math.sin(s30), 1), _fmt(d * (1 - math.cos(s30)), 2)) == ("4.0", "1.07")
    assert _fmt(math.sqrt(0.01 + 64 * s10 * s10), 2) == "1.40"

    # 可观性的秩（第 7 步）：单脚 12 维秩 8、双脚 15 维秩 11，各少 4 维
    assert _inekf_observability_rank(1) == 8 and _inekf_observability_rank(2) == 11

    # 维度与实验对账（第 1、10 步）
    assert (3 * 1 + 9, 3 * 2 + 9, 3 * 2 + 9 + 6, 3 * 7 - 6) == (12, 15, 21, 15)
    assert (_fmt(15 * 0.05, 2), _fmt(15 / 60, 2), _fmt(200 / 465, 2), 800 // 10, 2000 / 800) == ("0.75", "0.25", "0.43", 80, 2.5)

    for needle in (
        "## 🎬 十二幕动画：接触辅助 InEKF 全流程", "## 🚶 具体实例", "## 🧭 两个版本是什么关系",
        "[1904.09251](https://arxiv.org/abs/1904.09251)", "[arXiv:1805.10410](https://arxiv.org/abs/1805.10410)",
        "39(4): 402–430", "10.1177/0278364919894385", "10.15607/RSS.2018.XIV.050",
        "Ross Hartley, Maani Ghaffari, Ryan M. Eustice, Jessy W. Grizzle",
        "\\mathbf{(0.9794,\\ 0,\\ -0.0490)}", "\\mathbf{(0.981,\\ 0,\\ 0)}", "\\mathbf{(0.4905,\\ 0,\\ 0)}",
        "$(-0.9761,\\ 0,\\ 0.0979)$", "$(-4.3045,\\ 0,\\ 2.3516)$", "\\mathbf{0.1005}", "\\mathbf{(0.42,\\ -0.13,\\ 0.02)}", "**1.39 m**", "**0.48 m**", "**70.0%**", "秩 **8**", "秩 **11**", "秩是 **9**",
        "| ±30° | 0.98 s | **0.47 s** |", "| ±90° | 1.80 s | **0.49 s** | 18 / 0 |",
        'data-demo="inekf-linearize"', 'data-demo="inekf-banana"', 'data-demo="inekf-converge"',
    ):
        assert needle in note, needle
    for needle in ("0.979", "0.098", "0.049", "2.35", "0.981", "0.4905", "0.9794", "1.39", "0.48", "0.42", "200 米", "5%", "18 台"):
        assert needle in narration, needle
    # 片头接上一期（BeyondMimic）的片尾预告，片尾只预告下一篇（Berkeley Humanoid）
    assert "上一期结尾预告：机器人怎样知道自己当前的姿态和速度" in narration and "下一篇讲 Berkeley Humanoid" in narration
    assert "Berkeley Humanoid" in intro and "arxiv: '1904.09251'" in intro
    for stale in ("1904.09251) (RSS 2018)", "Unitree 系列）状态估计器的基石", "Ross Hartley, Maani Ghaffari, Jessy W. Grizzle, Eustice", "板块: 08 State Estimation"):
        assert stale not in note, f"旧版笔记的说法：{stale}"


def _bh_rng(seed: int):
    """kit.js 的 mulberry32。"""
    state = seed & 0xFFFFFFFF

    def rng() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = (state ^ (state >> 15)) * (1 | state) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rng


def _bh_toy(p: dict | None = None, horizon: float = 0.4) -> list[float]:
    """berkeley_humanoid.js 的 toyRun()：膝关节带着 URDF 的小腿，代码 KFE 的 PD 与摩擦，5 kHz 半隐式欧拉，每 5 ms 记一次。"""
    o = p or {}
    inertia, arm, mgl = 0.0288, 1.5e-4 * 81, 0.956 * 9.81 * 0.155
    sm, sf, sa = o.get("mass", 1.0), o.get("fric", 1.0), o.get("arm", 1.0)
    st, skp, skd = o.get("strength", 1.0), o.get("kp", 1.0), o.get("kd", 1.0)
    j = inertia * sm + arm * sa
    th = w = 0.0
    out, dt = [], 0.0002
    n, every = round(horizon / dt), round(0.005 / dt)
    for i in range(n + 1):
        if i % every == 0:
            out.append(th)
        if i == n:
            break
        tau = max(-30.0, min(30.0, st * (15 * skp * (0.5 - th) - 1.5 * skd * w)))
        fr = sf * (0.8 * math.tanh(w / 0.1) + 0.02 * w)
        w += (tau - fr - sm * mgl * math.sin(th)) / j * dt
        th += w * dt
    return out


def _bh_band(kind: str, seed: int = 7, n: int = 40):
    """berkeley_humanoid.js 的 drBatch()：返回 (上下包络最宽处, 下包络, 上包络)。"""
    rng = _bh_rng(seed)
    runs = []
    for _ in range(n):
        p = {"mass": 0.9 + 0.2 * rng(), "fric": 0.9 + 0.2 * rng(), "arm": 1.0 + 0.05 * rng()}
        if kind == "wide":
            p["mass"] = 0.5 + rng()
            p["strength"] = 0.85 + 0.3 * rng()
            p["kp"] = 0.9 + 0.2 * rng()
            p["kd"] = 0.9 + 0.2 * rng()
        runs.append(_bh_toy(p))
    lo = [min(r[i] for r in runs) for i in range(len(runs[0]))]
    hi = [max(r[i] for r in runs) for i in range(len(runs[0]))]
    return max(top - bottom for top, bottom in zip(hi, lo, strict=True)), lo, hi


def test_berkeley_humanoid_explainer_demos_and_worked_example_share_the_paper_numbers():
    """Berkeley Humanoid：十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一份数。

    表 1–6 与正文的数照抄 arXiv 2407.21781 v1（ICRA 2025 版相同）；PD 增益、摩擦、力矩上限取自官方训练代码；
    小腿惯量按 URDF 算；单关节玩具用纯 Python 重跑一遍（armature 漏不漏、窄 / 宽随机化的带宽）。
    """
    js = (DEMO_JS_DIR / "berkeley_humanoid.js").read_text(encoding="utf-8")
    note = BH_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "berkeley_humanoid.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "berkeley_humanoid.js").read_text(encoding="utf-8")

    for line in (
        "var ROBOT = { kg: 16, heightM: 0.85, thigh: 0.22, calf: 0.18, foot: 0.16, ankleH: 0.06, legDof: 6, withArmsKg: 22, usd: 9955, withArmsUsd: 15000 };",
        "{ name: '10413', g: 1011, ratio: 9, hollow: true, dia: 123, thick: 50, peak: 81.1, cont: 34.2, vmax: 27.9, watt: 890, rotor: 1.5e-4, joints: ['KFE'], qty: 2, usd: 676 }",
        "var RATES = { policy: 50, estimator: 1000, pd: 25000, torqueBw: 1000, busLo: 1000, busHi: 4000, latAtLo: 2, latAtHi: 0.5, simSteps: 90000 };",
        "var DR = { friction: [0.2, 1.25], restitution: [0, 0.1], baseMassKg: [-1, 1], linkMass: [0.9, 1.1], jointFriction: [0.9, 1.1], armature: [1, 1.05], defaultPos: [-0.05, 0.05] };",
        "var FALLS = [['石砖路', 6], ['草地', 14], ['跑道', 3], ['土路', 15]];",
        "var SIM2REAL = { secs: 60, vx: [0.051, 0.058], vy: [0.086, 0.1156] };",
        "var FIELD = { terrains: 8, trailDeg: 20, stairCm: 4, stairLegPct: 10, campusM: 364, campusMin: 10, trailM: 96, trailRiseM: 10.5, trailMin: 5 };",
        "{ key: 'kfe', label: 'KFE（膝）', act: '10413', effort: 30, vlim: 14, sat: 560, kp: 15, kd: 1.5, fs: 0.8, va: 0.1, fd: 0.02 },",
        "var SHANK = { m: 0.956, lc: 0.155, I: 0.0288 };",
        "var DR_N = 40, DR_SEED = 7;",
    ):
        assert line in js, line

    # 重量、成本、力矩密度（实例第 1、2 步）
    assert 2 * 251 + 6 * 756 + 2 * 856 + 2 * 1011 == 8772 and _fmt(8.772 / 16 * 100, 0) == "55"
    actuators = 2 * 422 + 6 * 570 + 2 * 639 + 2 * 676
    assert actuators == 6894 and actuators + 50 + 410 + 2 * 974 + 347 + 2 * 153 == 9955
    assert _fmt(actuators / 9955 * 100, 0) == "69" and _fmt(81.1 / 1.011, 1) == "80.2" and _fmt(81.1 / 16, 2) == "5.07"
    # 转子惯量（第 3 步）
    arm = 1.5e-4 * 81
    assert _fmt(arm, 5) == "0.01215" and _fmt(arm / 0.0288 * 100, 0) == "42"
    assert (_fmt(7.5 / (0.0288 + arm), 0), _fmt(7.5 / 0.0288, 0)) == ("183", "260")
    nom, noarm = _bh_toy(), _bh_toy({"arm": 0.0})
    assert (_fmt(nom[8], 3), _fmt(noarm[8], 3), _fmt(nom[-1], 3)) == ("0.081", "0.097", "0.417")
    # 时序、摩擦、力矩包络、覆盖率（第 4–7 步）
    assert (2 / 20 * 100, 0.5 / 20 * 100, 25000 // 50, 4096 * 24) == (10.0, 2.5, 500, 98304)
    assert (_fmt(0.8 * math.tanh(10) + 0.02, 2), _fmt(0.8 * math.tanh(0.5) + 0.02 * 0.05, 2)) == ("0.82", "0.37")
    assert _fmt(14 * (1 - 30 / 560), 2) == "13.25"
    ranges = [((-50, 40), (-35, 35)), ((-40, 20), (-35, 35)), ((-110, 30), (-100, 30)), ((0, 150), (0, 120)), ((-20, 50), (-30, 70)), ((-30, 18), (-30, 30))]
    cov = [(min(h[1], r[1]) - max(h[0], r[0])) / (h[1] - h[0]) * 100 for h, r in ranges]
    assert [_fmt(c, 2) for c in cov] == ["77.78", "91.67", "92.86", "80.00", "100.00", "100.00"]
    # 窄 / 宽随机化（第 8 步）：种子 7 约 7.1 倍，换种子仍是 4.9–9.0 倍
    narrow, lo, hi = _bh_band("narrow")
    wide, wlo, whi = _bh_band("wide")
    assert (_fmt(narrow, 4), _fmt(wide, 4), _fmt(wide / narrow, 1)) == ("0.0119", "0.0845", "7.1")
    ratios = [_bh_band("wide", s)[0] / _bh_band("narrow", s)[0] for s in (1, 2, 3, 11)]
    assert [_fmt(r, 1) for r in ratios] == ["6.5", "8.5", "4.9", "9.0"]
    off = _bh_toy({"fric": 1.2})
    inside = sum(lo[i] - 1e-9 <= off[i] <= hi[i] + 1e-9 for i in range(1, len(off))) / (len(off) - 1)
    assert _fmt(inside * 100, 0) == "24"
    # 观测维数、实验对账、单摆（第 9–11 步）
    assert 3 + 3 + 3 + 3 + 12 + 12 + 12 == 48 and 6 + 14 + 3 + 15 == 38
    assert (_fmt(0.058 - 0.051, 3), _fmt(0.1156 - 0.086, 4), _fmt(364 / 600, 2)) == ("0.007", "0.0296", "0.61")
    assert _fmt(math.degrees(math.asin(10.5 / 96)), 1) == "6.3" and _fmt(math.sqrt(1.0 / 0.4), 2) == "1.58"

    for needle in (
        "## 🎬 十二幕动画：Berkeley Humanoid 全流程", "## 🚶 具体实例", "## 🧭 两个版本是什么关系",
        "[2407.21781](https://arxiv.org/abs/2407.21781)", "ICRA2025_Berkeley_Humanoid.pdf",
        "Qiayuan Liao, Bike Zhang, Xuanyu Huang, Xiaoyu Huang, Zhongyu Li, Koushil Sreenath",
        "\\mathbf{9955}", "\\mathbf{80.2}", "\\mathbf{0.01215}", "**42%**", "\\mathbf{183}", "\\mathbf{260}", "**0.081**", "**0.097**",
        "\\mathbf{0.82}", "\\mathbf{0.37}", "\\mathbf{13.25}", "**0.0119**", "**0.0845**", "**7.1 倍**", "**24%**", "**48**", "\\mathbf{1.58}",
        "| HAA | [−35, 20] → 55° | 60° | 91.67% | 91.6% |",
        'data-demo="bh-armature"', 'data-demo="bh-actuator"', 'data-demo="bh-dr"',
    ):
        assert needle in note, needle
    for needle in ("16 公斤", "0.85 米", "364 米", "0.01215", "42%", "81.1", "9955", "0.82", "0.37", "0.051", "0.058", "0.1156", "38 次", "91.6%", "7 倍", "1.58"):
        assert needle in narration, needle
    # 片头接上一期（InEKF）的片尾预告，片尾只预告下一篇（ToddlerBot）
    assert "上一期结尾预告：硬件、执行器辨识和仿真训练一起设计" in narration and "下一篇讲 ToddlerBot" in narration
    assert "ToddlerBot" in intro and "arxiv: '2407.21781'" in intro
