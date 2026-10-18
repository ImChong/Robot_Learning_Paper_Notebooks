"""Tests for the interactive paper demos (assets/js/demos/*.js).

The demos are opt-in per note: front matter declares ``demos: ["ppo"]`` and the
markdown drops empty ``<div class="paper-demo" data-demo="...">`` placeholders.
Everything else is built client-side, because ``scripts/sanitize_paper_html.py``
strips ``<script>``/``<canvas>``/``<input>`` out of ``#paper-body`` before publish.
These tests pin the three links in that chain: placeholder survives sanitizing,
layout loads the assets, and every placeholder has a builder behind it.
"""

import base64
import json
import math
import random
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
EXBODY_NOTE = _high_impact_note("Expressive_Whole-Body_Control_for_Humanoid_Robots")
H2O_NOTE = _high_impact_note("H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation")
OMNIH2O_NOTE = _high_impact_note("OmniH2O_Universal_Whole-Body_Teleoperation")
HOVER_NOTE = _high_impact_note("HOVER_Versatile_Neural_Whole-Body_Controller")
MASKEDMIMIC_NOTE = _high_impact_note("MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting")
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
TB_NOTE = (
    ROOT
    / "papers"
    / "12_Hardware_Design"
    / "ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation"
    / "ToddlerBot_Open-Source_ML-Compatible_Humanoid_Platform_for_Loco-Manipulation.md"
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
        GMR_NOTE: ("gmr", ["gmr-explainer", "gmr-video", "gmr-scale", "gmr-ik", "gmr-table"]),
        OMNI_NOTE: (
            "omniretarget",
            ["omniretarget-explainer", "omniretarget-video", "omniretarget-constraints", "omniretarget-aug", "omniretarget-table"],
        ),
        UMR_NOTE: ("umr", ["umr-explainer"]),
        PHP_NOTE: ("php", ["php-explainer"]),
        PBFM_NOTE: ("pbfm", ["pbfm-explainer"]),
        GENTLE_NOTE: ("gentle", ["gentle-explainer"]),
        HUMANML3D_NOTE: ("humanml3d", ["humanml3d-explainer", "humanml3d-video", "humanml3d-clip", "humanml3d-length", "humanml3d-rprec"]),
        TRANSFORMER_NOTE: ("transformer", ["tf-explainer", "tf-video"]),
        PI0_NOTE: ("pi0", ["pi0-explainer", "pi0-video"]),
        PI05_NOTE: ("pi05", ["pi05-explainer", "pi05-video"]),
        SOCCER_NOTE: ("op3soccer", ["soccer-explainer", "soccer-video", "soccer-filter", "soccer-lambda", "soccer-pool"]),
        QUAD_NOTE: ("quadterrain", ["qt-explainer", "qt-video", "qt-ftg", "qt-curriculum", "qt-memory"]),
        RH_NOTE: ("realhumanoid", ["rh-explainer", "rh-video", "rh-context", "rh-reward", "rh-dr"]),
        ASAP_NOTE: ("asap", ["asap-explainer", "asap-video", "asap-delta", "asap-tables", "asap-ablation"]),
        INEKF_NOTE: ("inekf", ["inekf-explainer", "inekf-video", "inekf-linearize", "inekf-banana", "inekf-converge"]),
        BH_NOTE: ("berkeley_humanoid", ["bh-explainer", "bh-video", "bh-armature", "bh-actuator", "bh-dr"]),
        TB_NOTE: ("toddlerbot", ["tb-explainer", "tb-video", "tb-power", "tb-sysid", "tb-actuator"]),
        EXBODY_NOTE: ("exbody", ["exbody-explainer", "exbody-video", "exbody-retarget", "exbody-reward", "exbody-table"]),
        H2O_NOTE: ("h2o", ["h2o-explainer", "h2o-video", "h2o-retarget", "h2o-reward", "h2o-tables"]),
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
    "toddlerbot", "exbody", "h2o", "omnih2o", "hover", "maskedmimic",
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
# 压进六幕会有两幕各塞两件；GMR 是十三件（2026-10-11 从七幕重做）
# （人和机器人的身体不一样 / 两个开源基线怎么缩放 / 第 1、2 步一张配置表 / 第 3 步非均匀局部缩放 /
# 根和脚同一个比例 / 第 4 步先对朝向 / 第 5 步再对所有位置 / 评测只换参考动作 / 表 I / 图 3 三类瑕疵 /
# 图 4 用户研究 / 表 III 起始帧 / 开源库与局限）：方法节的五步里第 1、2 步写在同一份配置的同一行，合成一幕；
# 第 3 步的式 2 与「根和腿必须同比例」（由式 2 推出的滑脚，配复现实验的两条跑道）是两件事；两个 IK 阶段各一幕；
# 实验节按论文自己的 Q1–Q3 加第 V-D 节的起始帧，一问一幕，评测设计（三种测法、成功的定义）单独一幕。
# OmniRetarget 是十二件（2026-10-12 从七幕重做）（只盯关键点会丢掉交互 / 交互网格 / Laplacian 坐标 / 四条硬约束 /
# 序贯 SOCP / 一条演示扩成六条 / 别让整台机器人跟着箱子平移 / 地形与本体 / 极简强化学习 / 表 II / 下游强化学习 /
# 真机、数据与局限）：第 III-A 节的「网格怎么连」（Delaunay）与「形状怎么量」（式 1 的 Laplacian 坐标）是两件事，
# 硬约束（式 3 的四条）与求解（序贯 SOCP、信赖域、热启动）又是两件；第 III-B 节的物体扩增、下身锚定与初始双脚、
# 地形与本体各有公式或复现实验；第 IV 节的极简强化学习一幕；结果按第 V 节：表 II 的运动学质量、下游成功率与图 7、
# 真机与开源数据，压回七幕会让复现实验的穿透曲线和 SOCP 的迭代曲线、或表 II 的柱子和图 7 的直方图抢同一帧。
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
# HumanML3D 是十二件（一句话生成动作卡在哪 / 动作从哪来 / 每段配三句话 / 一帧 263 维 / 每 4 帧一个 snippet code /
# Text2Length / 文本编码器与词注意力 / 先验、后验、生成器 / 三项损失与课程学习 / 评测器与 R-Precision / 结果 /
# 消融、局限与遗产）。它一篇论文同时交了数据集、方法和评测协议三样东西：数据集里「动作怎么统一格式」（第 4 节的
# 降帧、裁剪、统一骨架与朝向）和「文字怎么来」（AMT 标注界面、三句话、镜像）是两件事，「每帧存什么」又是第 5 节；
# 方法里自编码器（§3.1）、长度采样（§3.2）、文本编码与局部词注意力（式 4）、先验 / 后验 / 生成器（式 3、5）、训练方案
# （式 6 与课程）各自独立；评测器（附录 B）是后来被整个领域沿用的贡献；结果（Table 2–3、图 4、用户研究）与消融、局限
# （Table 4、图 6、补充材料图 8）各一幕。第二版的九幕把注意力和三个 GRU、标注和统一格式、结果和消融各压在一帧里，
# 字多图少，2026-10-11 按「多用图少用文字」拆开，并换上片段 012314 的真实骨架和论文原图。
# ExBody 是 13 幕：第 I 节立了图形学搬不上真机的三道坎（一幕），第 II 节的问题形式化分「目标拆两半」与「观测只用真机拿得到的」
# 两段；第 III 节的数据有「怎么挑」（关键词、表 II）与「分布什么样」（图 3）两件事，重定向、RSI、跟踪奖励（表 III）各一幕，
# 附录的正则（表 VI）与训练设置（表 VII、代码的随机化）合一幕；结果按论文的问题：根运动与双手（图 5、6，同一个「跟得怎么样」）、
# 随机命令与全身跟踪（表 IV、图 8）、AMP（表 IV、图 7、表 V）、真机与局限（图 1、9）。压成 12 幕会让表 II 的条和图 3、
# 或表 III 的五条和表 VI 的十四项抢同一帧。
# H2O 是 14 幕：第 I 节的三道坎、第 III 节的三段流水线各一幕；第 IV-A 节的重定向有四件事——改身材（β′）、不改会内八（图 3）、
# 位置逆运动学怎么解（复现的迭代曲线）、为什么对末端不抄角度（和 ExBody 同一段挥手对照）——第 IV-B 节的 sim-to-data 一幕；
# 第 IV-C 节的观测（138 维）、奖励（表 I）、随机化与终止（表 II）各一幕；结果按表 III、表 IV、真机（图 5–7）各一幕，
# 局限一幕。压成 12 幕会让内八的俯视图和迭代曲线、或表 III 的四行和表 IV 的数据量抢同一帧。
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
    "gmr": (GMR_NOTE, 13),
    "omniretarget": (OMNI_NOTE, 12),
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
    "toddlerbot": (TB_NOTE, 12),
    "exbody": (EXBODY_NOTE, 13),
    "h2o": (H2O_NOTE, 14),
    # OmniH2O 十七幕：问题 2 幕（H2O 留下的问题 / 运动学姿态接口）；第 3 节的数据、奖励、课程各一幕（站姿蹲姿版、最高抬脚、
    # 惩罚课程各有自己的式子与证据）；教师、学生的 3 个点、25 步历史、DAgger 各一幕（附录表 4 / 6 与表 1(a)(b)(c) 分别对应）；
    # 灵巧手与机载系统一幕；结果按表 1 主结果 + DAgger、表 1 其余三组消融、表 2 真机各一幕；Q2 的接口一幕，Q3 的 GPT-4o 与
    # 数据集、表 3 的模仿学习各一幕；局限一幕。压成 14 幕会让历史纸带和 DAgger 流程、或表 1 和表 2 的条形图抢同一帧。
    "omnih2o": (OMNIH2O_NOTE, 17),
    # HOVER 十六幕：问题两幕（每篇一套接口 / 全身运动学模仿是公共底座）；第 II-B 节的命令空间与表 I 的「前人都是子集」各一幕（一个讲三种目标与
    # 95 维，一个讲六格与 49 位掩码）；第 II-C 节的重定向一幕；第 II-D 节的特权教师一幕；第 II-E 节的本体感受、模式掩码、稀疏掩码、DAgger 各一幕
    # （式子和代码出入各不相同）；结果按表 III、表 IV、图 4、表 V + 图 5、图 6 各一幕，局限与代码一幕。压成 14 幕会让模式掩码的开关和稀疏掩码的
    # 掩码条、或表 III 的柱和表 IV 的柱抢同一帧。
    "hover": (HOVER_NOTE, 16),
    # MaskedMimic 十八幕：问题两幕（城堡的例子与以前的两条路 / 控制就是补全）；第 4 节两阶段一幕；第 5 节的老师按观测与网络、奖励、
    # 训练场与终止采样各一幕（式 3–4、附录 B.1 的 w 与 c、图 4 各有证据）；第 6 节按部分目标、为什么要 VAE、残差先验（式 6–7）、
    # DAgger 与 KL 调度（式 8）、结构化掩码、固定噪声与历史、先验网络各一幕；结果按表 1+2、表 3+4、表 5、表 6 各一幕，文字控制与局限一幕。
    # 压成 15 幕会让残差的两个高斯和 DAgger 的流程、或掩码的时间轴和历史的影子抢同一帧。
    "maskedmimic": (MASKEDMIMIC_NOTE, 18),

    "humanml3d": (HUMANML3D_NOTE, 12),
}
CN_NUMERALS = {4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十", 11: "十一", 12: "十二", 13: "十三", 14: "十四",
               15: "十五", 16: "十六", 17: "十七", 18: "十八"}


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


def _omni_dec(b64: str, unit: float) -> list:
    """omniretarget.js 里嵌入的数据：小端 int16 的 base64，乘上单位。"""
    raw = base64.b64decode(b64)
    return [int.from_bytes(raw[i:i + 2], "little", signed=True) * unit for i in range(0, len(raw), 2)]


def test_omniretarget_explainer_demos_and_worked_example_share_the_paper_numbers():
    """OmniRetarget：十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    表 I–II、图 7、第 V 节的数字照抄 arXiv 2509.26633 v3；权重、容差、扩增参数照抄 amazon-far/holosoma；
    搬箱子（sub3_largebox_003，196 帧）的各种设定是我们照官方代码跑的复现实验，嵌在 omniretarget.js 里，
    这里用 Python 解码后把穿透、滑脚、迭代次数、第 0 帧的平移和左手腕的 Laplacian 坐标再算一遍。
    嵌入的数据按 0.1 mm 存，所以「每帧最多挪」与笔记里全精度的 1.45 / 32.7 mm 差不到 0.05 mm。
    """
    js = (DEMO_JS_DIR / "omniretarget.js").read_text(encoding="utf-8")
    note = OMNI_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "omniretarget.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "omniretarget.js").read_text(encoding="utf-8")

    for line in (
        "OmniRetarget: [[0.0, 0.01], [1.34, 0.34], [0, 0], [0, 0], [0.96, 0.09], [82.2, 9.74]]",
        "GMR: [[0.83, 0.14], [8.5, 3.94], [0.02, 0.01], [1.46, 0.45], [0.99, 0.04], [50.83, 23.89]]",
        "OmniRetarget: [[0.01, 0.02], [1.37, 0.18], [0, 0], [0, 0], [0.72, 0.19], [94.73, 22.33]]",
        "var PAPER_SOLVER = { stanceCmS: 1, maxIter: 10, eps: 0.2 };",
        "var N_REWARDS = 5, N_DR = 4;",
        "var TERM = { objM: 1.0, objDeg: 45, eeM: 0.25, eeWallM: 0.5 };",
        "var AUG_FULL = 79.1, AUG_NOM = 82.2;",
        "var HOURS = { omomo: 2.78, mocap: 1, lafan: 4.6 };",
        "var TERRAIN_M = [0.56, 0.7, 0.84];",
        "var CODE = { wLap: 10, wSmooth: 0.2, step: 0.2, iter0: 50, iterN: 10, penTol: 0.001, colThr: 0.1, footTol: 0.001,",
        "tauP: 50, tauR: 25, wAnchor: 5, tauAnchor: 10, anchorDims: 19, nKpts: 15, nObj: 100, fps: 30, augM: 0.2, augDeg: 45 };",
        "var ROBOT_H = 1.32, H_SUB3 = 1.9411048;",
        "var T_MOVE = 25;",
        "var TETS_F76 = 598, TETS = { min: 576, max: 607 };",
    ):
        assert line in js, line
    for k in (
        "'omniretarget-explainer'", "'omniretarget-video'", "'omniretarget-constraints'", "'omniretarget-aug'",
        "'omniretarget-table'", "K.video(host",
    ):
        assert k in js, k

    # 图 7 的直方图：人-物 20 段 + 人-地形 19 段 = 39 段
    hist = {k: re.search(rf"{k}: \{{ PHC: \[([\d, ]+)\]", js).group(1) for k in ("object", "terrain")}
    assert [sum(int(x) for x in v.split(",")) for v in hist.values()] == [20, 19]
    assert "var N_MOTIONS_RL = 39;" in js
    # 比例、加总与指数衰减
    assert _fmt(1.32 / 1.9411048, 3) == "0.680" and _fmt(2.78 + 1 + 4.6, 2) == "8.38" and _fmt(82.2 - 79.1, 1) == "3.1"
    assert _fmt(20 * math.exp(-50 / 50), 1) == "7.4" and _fmt(45 * math.exp(-25 / 25), 1) == "16.6"
    assert (_fmt(5 * math.exp(-10 / 10), 2), _fmt(5 * math.exp(-30 / 10), 2)) == ("1.84", "0.25")
    assert _fmt(0.95 * 0.742, 3) == "0.705" and _fmt(82.2 - 50.83, 1) == "31.4"

    # 复现实验：从嵌入的数据再算一遍
    def s(name):
        return re.search(rf"var {name} = '([^']+)';", js).group(1)

    series = json.loads(re.search(r"var SERIES = (\{.*?\});\n", js).group(1))
    ser = {v: {q: _omni_dec(b, 1e-5 if q == "en" else 1e-4) for q, b in d.items()} for v, d in series.items()}
    stance = [[bool(int(c) & 1), bool(int(c) & 2)] for c in s("STANCE_BITS")]
    sph = {v: _omni_dec(s("SPH_" + v.upper()), 1e-4) for v in ("orig", "nopen", "nofoot")}
    assert len(stance) == 196 and all(len(ser[v]["pb"]) == 196 for v in ser)

    def pen(v):
        box, gnd = max(-x for x in ser[v]["pb"]), max(-x for x in ser[v]["pg"])
        return box * 100, gnd * 100, sum(x < -0.01 for x in ser[v]["pb"]), sum(x < -0.01 for x in ser[v]["pg"])

    def slide(v):
        a, d = sph[v], []
        for f in range(1, 196):
            for side in range(2):
                if stance[f][side]:
                    for c in range(4):
                        o1, o0 = f * 24 + 3 * (side * 4 + c), (f - 1) * 24 + 3 * (side * 4 + c)
                        d.append(math.hypot(a[o1] - a[o0], a[o1 + 1] - a[o0 + 1]) * 1000)
        return sum(d) / len(d), max(d)

    assert [_fmt(x, 2) for x in pen("orig")[:2]] == ["0.11", "0.26"] and pen("orig")[2:] == (0, 0)
    assert [_fmt(x, 1) for x in pen("nopen")[:2]] == ["5.4", "7.6"] and pen("nopen")[2:] == (163, 196)
    assert _fmt(pen("nofoot")[1], 2) == "0.23"
    assert _fmt(slide("orig")[0], 2) == "1.20" and abs(slide("orig")[1] - 1.45) < 0.05
    assert [_fmt(x, 2) for x in slide("nopen")] == ["1.14", "1.41"]
    assert _fmt(slide("nofoot")[0], 1) == "4.6" and abs(slide("nofoot")[1] - 32.7) < 0.1
    assert _fmt(slide("nofoot")[1] / 10, 1) == "3.3"
    en = ser["orig"]["en"]
    assert _fmt(sum(en) / len(en), 3) == "0.069" and _fmt(math.sqrt(sum(en) / len(en) / 115) * 100, 1) == "2.4"
    iters = [10 if c == "x" else int(c) for c in s("ITERS")[1:]]
    assert len(iters) == 195 and iters.count(10) == 179
    cost0 = [float(x) for x in re.search(r"var COST_F0 = \[([^\]]+)\]", js).group(1).split(", ")]
    assert len(cost0) == 50 and (_fmt(cost0[0], 2), _fmt(cost0[-1], 2)) == ("4.16", "1.18")

    # 第 0 帧：扩增后骨盆、双脚（8 个接触球的平均）相对原始解挪了多少
    def row0(name, stride):
        return _omni_dec(s(name), 0.001)[:stride]

    o = row0("CLIP_ORIG", 121)

    def shift(name):
        c = row0(name, 76)
        fx = sum(c[45 + 3 * j] - o[45 + 3 * j] for j in range(8)) / 8
        fy = sum(c[46 + 3 * j] - o[46 + 3 * j] for j in range(8)) / 8
        return math.hypot(c[0] - o[0], c[1] - o[1]) * 100, math.hypot(fx, fy) * 100

    # 嵌入的位置按 1 mm 存，与笔记里全精度的数差不到 0.1 cm
    for name, want in (
        ("CLIP_TRANS_0", (17.1, 19.2)), ("CLIP_NOANCHOR", (17.8, 19.9)), ("CLIP_PIN_TRANS_0", (10.5, 0.1)),
        ("CLIP_ROT_0", (7.7, 11.5)), ("CLIP_PIN_ROT_0", (4.5, 0.0)),
    ):
        got = shift(name)
        assert all(abs(g - w) < 0.1 for g, w in zip(got, want, strict=True)), (name, got)

    # 第 76 帧人的左手腕：22 个邻居、Laplacian 坐标
    m = re.search(r"var MESH_F76 = \{ src: '([^']+)', tgt: '([^']+)', edges: '([^']+)' \}", js)
    src, tgt = (_omni_dec(m.group(k), 0.001) for k in (1, 2))
    raw = base64.b64decode(m.group(3))
    edges = [(raw[k], raw[k + 1]) for k in range(0, len(raw), 2)]
    assert (len(src) // 3, len(edges)) == (115, 737)
    nb = [b if a == 13 else a for a, b in edges if 13 in (a, b)]
    assert len(nb) == 22 and sum(j >= 15 for j in nb) == 18 and sorted(j for j in nb if j < 15) == [1, 3, 7, 11]

    def lap(v):
        return [(v[39 + d] - sum(v[3 * j + d] for j in nb) / 22) * 100 for d in range(3)]

    ls, lt = lap(src), lap(tgt)
    assert [_fmt(x, 1) for x in ls] == ["3.6", "1.7", "0.2"] and [_fmt(x, 1) for x in lt] == ["6.6", "2.1", "0.5"]
    assert _fmt(math.dist(ls, lt), 1) == "3.1"

    for needle in (
        "## 🎬 十二幕动画：OmniRetarget 全流程", "## 🚶 具体实例", "## 📁 源码对照",
        'data-demo="omniretarget-constraints"', 'data-demo="omniretarget-aug"', 'data-demo="omniretarget-table"',
        "**22 个邻居**", "$L \\approx (3.6,\\ 1.7,\\ 0.2)$ cm", "$L \\approx (6.6,\\ 2.1,\\ 0.5)$ cm", "两者差 **3.1 cm**",
        "平均 0.069 m²", "平均差 **2.4 cm**", "**576–607 个四面体**", "598 个四面体、737 条边", "代价 4.16 → 1.18",
        "**179 帧跑满 10 次**", "**0.26 cm**", "1.20 / **1.45 mm**", "箱子 **5.4 cm**", "地面 **7.6 cm**",
        "163 帧", "196 帧脚都陷进地面", "1.14 / 1.41 mm", "0.23 cm", "**4.6 / 32.7 mm**", "**第 25 帧**",
        "20 cm → 7.4 cm", "16.6°", "1.84", "0.25）", "17.8 cm", "19.9 cm", "17.1 cm", "19.2 cm", "**10.5 cm**", "**0.1 cm**",
        "**0.705 m**", "82.20%±9.74%", "2.78 h", "4.6 h", "8.38 h", "79.1%", "82.2%",
    ):
        assert needle in note, needle
    for needle in (
        "5.4 厘米", "7.6 厘米", "0.26 厘米", "4.6 毫米", "3.3 厘米", "1.45", "22 个", "3.1 厘米", "2.4 厘米", "179",
        "17.1", "10.5 厘米", "79.1%", "82.2%", "8.38", "39 段",
    ):
        assert needle in narration, needle
    # 片头接上一期（GMR）的片尾预告，片尾只预告下一篇（Expressive WBC）；主动画不预告下一篇
    # 第 2 幕：Delaunay 提出来之后，用一句话讲规则（旁白、字幕轨、平面上的外接圆示意）
    assert '(1, 10.4, 13.4, "德劳内剖分有一条规则：每个四面体的外接球里，不能再有别的点，所以只会把彼此相邻的点连起来。")' in narration
    assert "{ at: 10.4, s: '**Delaunay** 的规则：每个四面体的**外接球**里不能有别的点" in js
    assert "'✓ 外接圆里**没有**别的点'" in js and "'✗ 圈里**还有**一个点'" in js
    # 第 3 幕：放大的手腕旁边画出整个人（骨架 + 箱子）和同一帧的 G1 渲染
    lap = js.split("function buildSceneLaplacian()", 1)[1].split("function drawOnPath(", 1)[0]
    assert "skeleton(bodyL" in lap and "boxWire(bodyL" in lap and "g1Sprite(bodyR, 'orig_side')" in lap and "clipCircle(" in lap
    # 第 10 幕：三个「时长」都是 0–1 的比例（论文第 V-B 节按应有的时长归一化），表头、底注、旁白都说清楚
    assert "zh: '打滑时长（比例）↓'" in js and "zh: '接触保持（比例）↑'" in js
    assert "这几个时长都不是秒，而是比例：穿透除以整段的长度，打滑除以脚应该粘住的时长，接触除以应该接触的时长" in narration
    assert "| 穿透时长（比例）↓ |" in note and "不是秒" in note
    # 第 6 幕：俯视图人朝上，五种扩增的箱子起点在旁白念到时一个个出现（分镜 3.6–10.6 s 对着那一句旁白）
    aug = js.split("function buildSceneAug()", 1)[1].split("function buildSceneAnchor()", 1)[0]
    assert "var AT = [0.6, 6.5, 7.3, 7.9, 9.5, 10.1];" in aug and "function footprint(pose)" in aug
    # 轨迹按帧号截到第 96 帧：原始解每 2 帧一行、扩增每 3 帧一行，按行数截原始轨迹只到第 64 帧（比别的短一截）
    assert "for (var r = 0; r < c.n && r * c.step <= LAST_F; r++)" in aug
    assert '(5, 3.6, 10.6, "物体位姿，开源代码给了 5 种' in narration and "左边的俯视图里，人站在下面、面朝上" in narration
    # 第 10 幕：表 II 柱子上的数字写在柱顶上方、跟着柱子长高，不压在柱子上
    t2 = js.split("function buildSceneTable2()", 1)[1].split("function buildSceneDownstream()", 1)[0]
    assert "b.lab.setAttribute('y', (b.base - h - 5).toFixed(1));" in t2
    # 第 1 幕结尾用一句话解释 SOCP：旁白、字幕轨与表 I 下的小卡片同一个说法
    socp = "S O C P 是二阶锥规划，一种凸优化：除了线性约束，还允许「一个向量的长度不超过某个值」，求解器能又快又稳地找到最优解。"
    assert f'(0, 16.0, 19.0, "{socp}")' in narration
    assert "{ at: 16.0, s: '**SOCP** 是二阶锥规划，一种凸优化：除了线性约束，还允许「一个向量的长度不超过某个值」" in js
    assert "'**SOCP** = 二阶锥规划，一种凸优化'" in js
    # 全局检查（2026-10-13）：术语第一次出现就用白话交代，示意图的每样东西都有标注
    for needle in (
        "分开时距离为正，插进去就是负的", "从关节角算手脚位置的正运动学", "这叫信赖域", "靠平滑项和下一幕要讲的信赖域来管",
        "机身的朝向用四元数表示", "管机身的位置、朝向和两条腿的关节，共 19 维", "也就是雅可比",
    ):
        assert needle in narration, needle
    assert "浮动基" not in narration and "5 乘以 e" not in narration
    solver = js.split("function buildSceneSolver()", 1)[1].split("function buildSceneAug()", 1)[0]
    for needle in ("'目标的等高线（中心最低）'", "'约束线性化：红色一侧不许进'", "'信赖域：步长上限'", "'这一步'", "'跑满 10 次'"):
        assert needle in solver, needle
    # 第 4 幕：关掉不穿透那台，这一帧哪里插进箱子、哪里陷进地面，套圈并写出部位
    assert "var NOPEN_WHERE = {" in js and "插进箱子 " in js and "陷进地面 " in js
    # 第 8 幕讲换机器人时把论文图 3 放大；第 9 幕的策略画出输出（关节目标角，交给 PD）
    terrain = js.split("function buildSceneTerrain()", 1)[1].split("function buildSceneRL()", 1)[0]
    assert "paperFig(BIG, 'fig3_cross_embodiment.webp'" in terrain
    assert "'输出：关节目标角'" in js and "'交给 PD 控制器跟踪'" in js
    assert "上一期结尾预告：人和物体、地形有接触的时候，怎样在重定向里把这些交互也保住" in narration
    assert "下一篇讲 Expressive Whole-Body Control" in narration
    assert "**下一篇**：Expressive WBC" in intro and "arxiv: '2509.26633'" in intro
    assert "Expressive" not in js and "下一篇" not in js


def test_video_subtitles_never_break_inside_an_english_word():
    """build.py 切字幕行时不在英文词、数字中间断开（OmniRetarget 第一版成片里出过「De / launay」「Laplac / ian」）。

    build.py 一 import 就去合成语音，所以只把 word_char() 与 chunks() 两个函数抠出来跑。
    """
    import ast
    import runpy

    src = (ROOT / "scripts" / "paper_video" / "build.py").read_text(encoding="utf-8")
    fns = [n for n in ast.parse(src).body if isinstance(n, ast.FunctionDef) and n.name in ("word_char", "math_mask", "vis_len", "chunks")]
    ns = {"re": re, "display": lambda s: s}
    exec(compile(ast.Module(body=fns, type_ignores=[]), "build.py", "exec"), ns)

    def lines(s):
        return [x["text"] for x in ns["chunks"](s, 0, 1)]

    assert lines("形变能，就是所有顶点上，人和机器人Laplacian坐标之差的平方和。") == ["形变能，就是所有顶点上", "人和机器人Laplacian", "坐标之差的平方和"]
    assert lines("对这 115 个点做Delaunay四面体剖分，就连成一张体积网格。") == ["对这 115 个点做", "Delaunay四面体剖分", "就连成一张体积网格"]

    paper = runpy.run_path(str(ROOT / "scripts" / "paper_video" / "papers" / "omniretarget.py"))
    for _, _, _, text in paper["SCRIPT"]:
        for a, b in paper["DISPLAY"]:
            text = text.replace(a, b)
        # 在原句里找到每一行的结尾：断开的地方前后不能都是字母 / 数字（标点、空格处断开没问题）
        pos = 0
        for line in lines(text):
            end = text.index(line, pos) + len(line)
            assert not (end < len(text) and ns["word_char"](text[end - 1]) and ns["word_char"](text[end])), (line, text)
            pos = end

    # DISPLAY 写成 $…$ 的公式（MaskedMimic 的字幕）整条留在一行，标点在公式里也不断开；按字形算长度，不按 TeX 源码
    assert lines("每项都是 $e^{-c \\times \\text{误差}}$，误差越大越接近 0。") == ["每项都是 $e^{-c \\times \\text{误差}}$", "误差越大越接近 0"]
    assert lines("偏差是 $\\tfrac{1}{2}, \\tfrac{1}{3}$ 和 $x + v_x$、$y + v_y$，高度固定。")[0].count("$") % 2 == 0
    assert ns["vis_len"]("标准差是 $e^{-2.9}$") == len("标准差是 ") + 5
    paper = runpy.run_path(str(ROOT / "scripts" / "paper_video" / "papers" / "maskedmimic.py"))
    for _, _, _, text in paper["SCRIPT"]:
        for a, b in paper["DISPLAY"]:
            text = text.replace(a, b)
        assert all(line.count("$") % 2 == 0 for line in lines(text)), text


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
                 "omniretarget-video", "humanml3d-video", "smp-video", "dr-video", "qt-video", "rh-video", "inekf-video", "bh-video",
                 "tb-video", "exbody-video", "h2o-video", "hover-video"):
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


def test_sonic_worked_example_shares_numbers_with_its_explainer():
    """SONIC 的「🚶 具体实例」手算与七幕动画现算的是同一组数（GMR 改成了单独的测试）。"""
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

def _hml_t2l_dists(js: str):
    """从 humanml3d.js 里读出补充材料图 6 的八条读图分布（归一化前的原值）。"""
    rows = re.findall(r"\{ panel: '(\d-\d)', text: \"([^\"]+)\", real: (\d+), p: \[([^\]]+)\] \}", js)
    out = []
    for panel, text, real, ps in rows:
        p = [float(x) for x in ps.split(",")]
        s = sum(p)
        out.append({"panel": panel, "text": text, "real": int(real), "p": [x / s for x in p]})
    return out


def _hml_rprec_toy(sigma: float, q: float, trials: int, seed: int) -> float:
    """R-Precision 玩具的 Python 版（与 humanml3d.js 的 rprecToy 同一个模型，随机数不同）：返回 top-1。"""
    rng = random.Random(seed)
    hits = 0
    for _ in range(trials):
        a = [rng.gauss(0, 1) for _ in range(16)]
        t = [x + 0.6 * rng.gauss(0, 1) for x in a]
        m = [x + sigma * rng.gauss(0, 1) for x in a]
        dt = sum((u - v) ** 2 for u, v in zip(m, t, strict=True))
        rank = 0
        for _ in range(31):
            same = rng.random() < q
            d = sum(((x if same else rng.gauss(0, 1)) + 0.6 * rng.gauss(0, 1) - y) ** 2 for x, y in zip(a, m, strict=True))
            rank += d < dt
        hits += rank == 0
    return hits / trials


def test_humanml3d_explainer_demos_and_worked_example_share_the_paper_numbers():
    """HumanML3D：十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    Table 1–4 照抄 CVPR 正文；片段 012314 的统计量取自官方仓库自带的 npy；长度分布是从补充材料图 6 量出来的
    读图近似值，分位采样、熵、交叉熵在它上面现算；注意力打分是编的；R-Precision 玩具用 Python 再跑一遍（多种子）。
    """
    js = (DEMO_JS_DIR / "humanml3d.js").read_text(encoding="utf-8")
    note = HUMANML3D_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "humanml3d.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "humanml3d.js").read_text(encoding="utf-8")

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
        "var T2L_STUMBLE = T2L_DISTS[1];",
        "var T2L_WAVE = T2L_DISTS[6];",
        "var RP_DIM = 16, RP_TAU = 0.6;",
    ):
        assert line in js, line
    assert "K.video(host" in js and "'humanml3d-clip': buildClipDemo" in js and "'humanml3d-rprec': buildRprecDemo" in js
    # 片段 012314 的真实骨架：170 帧 × 22 关节 × 3（毫米 int16）base64，触地标签每帧一位十六进制
    b64 = re.search(r"var CLIP_B64 =\s*'([A-Za-z0-9+/=]+)'", js).group(1)
    assert len(base64.b64decode(b64)) == 170 * 22 * 3 * 2
    contact = re.search(r"var CLIP_CONTACT =\s*'([0-9a-f]+)'", js).group(1)
    assert len(contact) == 170
    ratios = [sum((int(c, 16) >> b) & 1 for c in contact) for b in range(4)]
    assert ratios == [135, 138, 127, 127] and [_fmt(r / 170 * 100, 1) for r in ratios] == ["79.4", "81.2", "74.7", "74.7"]

    # 第 2–3 幕：Table 1 的倍数与 index.csv 的来源
    assert [_fmt(a / b, 2) for a, b in ((14616, 3911), (44970, 6278), (28.59, 10.33), (5371, 1623))] == [
        "3.74", "7.16", "2.77", "3.31"]
    assert 4648 + 2913 + 1839 + 1465 + 1191 + 2560 == 14616 and 14616 - 1191 == 13425

    # 第 4 幕：263 维、触地阈值
    def pose_dim(j):
        return 1 + 2 + 1 + 3 * (j - 1) + 6 * (j - 1) + 3 * j + 4

    assert (pose_dim(22), pose_dim(21), 4 + 3 * 22 + 6 * 22 + 3 * 22 + 4) == (263, 251, 272)
    assert (_fmt(math.sqrt(0.002) * 100, 2), _fmt(math.sqrt(0.002) * 20, 3)) == ("4.47", "0.894")

    # 第 5 幕：168 帧 → 84 → 42 个 code，感受野与参数量
    def conv_len(n):
        return (n + 2 - 4) // 2 + 1

    assert (170 // 4 * 4, conv_len(168), conv_len(conv_len(168))) == (168, 84, 42)
    assert (168 * 263, 42 * 512, _fmt(168 * 263 / (42 * 512), 2), 4 + 3 * 2) == (44184, 21504, "2.05", 10)
    assert (max(0, 4 * 7 - 3), 4 * 7 + 6) == (25, 34)

    # 第 6 幕 + 第二个演示：补充材料图 6 的读图分布
    dists = _hml_t2l_dists(js)
    assert [d["real"] for d in dists] == [17, 25, 12, 34, 49, 25, 45, 40] and len(dists[0]["p"]) == 40

    def quantile(p, u):
        acc = 0.0
        for i, x in enumerate(p):
            acc += x
            if u <= acc:
                return 10 + i
        return 49

    stumble, wave = dists[1], dists[6]
    assert stumble["text"].startswith("Person stumbles") and wave["text"] == "A person waves with their left hand"
    assert [quantile(stumble["p"], u) for u in (0.2, 0.5, 0.9)] == [23, 25, 27]
    assert [quantile(wave["p"], u) for u in (0.2, 0.5, 0.9)] == [15, 21, 44]

    def entropy(p):
        return -sum(x * math.log(x) for x in p if x > 0)

    assert (_fmt(entropy(stumble["p"]), 2), _fmt(entropy(wave["p"]), 2), _fmt(math.log(40), 2)) == ("2.29", "3.28", "3.69")
    assert (_fmt(stumble["p"][15], 3), _fmt(-math.log(stumble["p"][15]), 2)) == ("0.168", "1.79")
    assert (_fmt(wave["p"][35], 3), _fmt(-math.log(wave["p"][35]), 2)) == ("0.043", "3.14")
    assert _fmt(sum(stumble["p"][13:18]) * 100, 1) == "80.7" and _fmt(sum(wave["p"][33:38]) * 100, 1) == "23.7"

    # 第 7–8 幕：注意力示意、三个 GRU 的输入维数、到达倒计时、KL 算例
    def softmax(x):
        e = [math.exp(v - max(x)) for v in x]
        return [v / sum(e) for v in e]

    assert [_fmt(v, 3) for v in softmax([1.8, 1.5, 0.2, 0.1, 0.4])] == ["0.422", "0.312", "0.085", "0.077", "0.104"]
    assert [_fmt(v, 3) for v in softmax([0.2, 0.4, 2.0, 1.3, 1.1])] == ["0.073", "0.089", "0.440", "0.219", "0.179"]
    assert (512 + 512, 512 + 512 + 512, 512 + 512 + 128) == (1024, 1536, 1152)
    assert 28 // 4 + 1 == 8 and 42 - 8 == 34
    kl = math.log(1 / 0.8) + (0.64 + 0.25) / 2 - 0.5
    assert (_fmt(kl, 3), _fmt(kl * 128, 1), _fmt(kl * 128 * 0.01, 3)) == ("0.168", "21.5", "0.215")

    # 第 9–12 幕：课程阶段、评测随机水平、Table 2 / 3 / 4 的比例
    assert 49 - 10 + 1 == 40 and 42 - 10 + 1 == 33
    assert (_fmt(100 / 32, 1), _fmt(300 / 32, 1)) == ("3.1", "9.4")
    assert (_fmt(0.455 / 0.511 * 100, 1), _fmt(0.736 / 0.797 * 100, 1)) == ("89.0", "92.3")
    assert (_fmt(11.02 / 1.087, 1), _fmt((2.219 - 2.090) / 2.090 * 100, 1), _fmt((2.052 - 1.482) / 1.482 * 100, 1)) == ("10.1", "6.2", "38.5")
    assert [_fmt(0.455 - v, 3) for v in (0.370, 0.396, 0.443, 0.444)] == ["0.085", "0.059", "0.012", "0.011"]
    assert [_fmt((0.455 - v) / 0.455 * 100, 1) for v in (0.370, 0.396, 0.443, 0.444)] == ["18.7", "13.0", "2.6", "2.4"]
    assert _fmt((0.213 + 0.507) * 100, 0) == "72"
    # 片段 012314 的根角速度存的是半角：170 行累加 −22.8°，乘 2 才是转角
    assert _fmt(-22.80458 * 2, 1) == "-45.6"

    # 第三个演示：R-Precision 玩具的结论多种子平均后仍成立（描述有歧义时 σ = 0 也到不了 100%）
    clear = sum(_hml_rprec_toy(0.0, 0.0, 300, s) for s in (1, 2, 3)) / 3
    ambiguous = sum(_hml_rprec_toy(0.0, 0.04, 300, s) for s in (1, 2, 3)) / 3
    noisy = sum(_hml_rprec_toy(2.0, 0.0, 300, s) for s in (1, 2, 3)) / 3
    assert clear > 0.95 and ambiguous < 0.75 and noisy < 0.5

    for needle in (
        "## 🎬 十二幕动画：HumanML3D 全流程", "## 🚶 具体实例", "## 📁 源码对照",
        'data-demo="humanml3d-clip"', 'data-demo="humanml3d-length"', 'data-demo="humanml3d-rprec"',
        "14,616", "44,970", "13,425", "4,648", "29,232", "29,228", "4,384",
        "$1+2+1+63+126+66+4 = 263$", "251 维", "272",
        "$(170, 263)$", "−45.6°", "2.34 m", "10.0 m/s", "第 28 帧", "tennis-15-first service",
        "79.4%、81.2%、74.7%、74.7%", "0.894", "**−11.9**", "−59.6",
        "**42 个 512 维 code**", "44{,}184", "21{,}504", "1{,}842{,}688", "1,657,407", "第 25–34 帧",
        "**23 / 25 / 27**", "**15 / 21 / 44**", "4.6 / 5.0 / 5.4 s", "3.0 / 4.2 / 8.8 s", "**1.79**", "**3.14**", "80.7%", "23.7%",
        "0.422 / 0.312 / 0.085 / 0.077 / 0.104", "0.073 / 0.089 / 0.440 / 0.219 / 0.179",
        "**1,024**", "**1,536**", "**1,152**", "$T-t = 34$", "0.168", "21.5", "0.215",
        "**参加 33 个阶段**", "89.0\\%", "92.3\\%", "10.1", "+6.2%", "+38.5%", "18.7%", "43,692", "21.3%",
    ):
        assert needle in note, needle
    # 论文只发在 CVPR 2022；旧笔记里的 arXiv 2204.09419 是一篇天体物理论文，不能再当成出处链接；
    # 笔记里也不放任何 arxiv.org 链接，否则 prepare_pages 会把它当成这篇论文的 arXiv 号
    assert "arxiv.org/abs/2204.09419" not in note and "\narxiv:" not in note and "arxiv.org/" not in note

    for needle in ("263", "0.89", "42 个 code", "23、25、27", "15、21、44", "0.42", "0.44", "34 个", "33 阶段",
                   "0.511", "0.455", "0.246", "1.087", "11.02", "72%", "0.361", "0.424", "0.085", "0.059"):
        assert needle in narration.replace("第 33 阶段", "33 阶段"), needle
    # 片头接上一期（ToddlerBot）的片尾预告，片尾只预告下一篇（GMR）；主动画不预告下一篇
    assert "上一期结尾预告：人类的动作数据从哪里来，怎样给每段动作配上文字" in narration and "下一篇讲 G M R" in narration
    assert "badge: 'CVPR 2022'" in intro and "**下一篇**：GMR" in intro
    assert "GMR" not in js and "下一篇" not in js


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
        "var TORSO_KG = 5.378;",
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
    # 机身质量 ±1 kg 加在躯干上（URDF 5.378 kg）；tanh 摩擦没有静摩擦，玩具最后仍到无摩擦的平衡点（第 5、8 步）
    assert (_fmt(1 / 5.378 * 100, 1), _fmt(1 / 16 * 100, 2)) == ("18.6", "6.25")
    assert (_fmt(_bh_toy(horizon=1.0)[-1], 3), _fmt(_bh_toy(horizon=3.0)[-1], 3)) == ("0.444", "0.457")
    eq = 0.3
    for _ in range(60):
        eq -= (15 * (0.5 - eq) - 0.956 * 9.81 * 0.155 * math.sin(eq)) / (-15 - 0.956 * 9.81 * 0.155 * math.cos(eq))
    assert _fmt(eq, 3) == "0.457"

    for needle in (
        "## 🎬 十二幕动画：Berkeley Humanoid 全流程", "## 🚶 具体实例", "## 🧭 两个版本是什么关系",
        "[2407.21781](https://arxiv.org/abs/2407.21781)", "ICRA2025_Berkeley_Humanoid.pdf",
        "Qiayuan Liao, Bike Zhang, Xuanyu Huang, Xiaoyu Huang, Zhongyu Li, Koushil Sreenath",
        "\\mathbf{9955}", "\\mathbf{80.2}", "\\mathbf{0.01215}", "**42%**", "\\mathbf{183}", "\\mathbf{260}", "**0.081**", "**0.097**",
        "\\mathbf{0.82}", "\\mathbf{0.37}", "\\mathbf{13.25}", "**0.0119**", "**0.0845**", "**7.1 倍**", "**24%**", "**48**", "\\mathbf{1.58}",
        "| HAA | [−35, 20] → 55° | 60° | 91.67% | 91.6% |",
        "±18.6%", "1 s 时 0.444、3 s 时 0.457",
        'data-demo="bh-armature"', 'data-demo="bh-actuator"', 'data-demo="bh-dr"',
    ):
        assert needle in note, needle
    for needle in ("16 公斤", "0.85 米", "364 米", "0.01215", "42%", "81.1", "9955", "0.82", "0.37", "0.051", "0.058", "0.1156", "38 次", "91.6%", "7 倍", "1.58"):
        assert needle in narration, needle
    # 片头接上一期（InEKF）的片尾预告，片尾只预告下一篇（ToddlerBot）
    assert "上一期结尾预告：硬件、执行器辨识和仿真训练一起设计" in narration and "下一篇讲 ToddlerBot" in narration
    assert "ToddlerBot" in intro and "arxiv: '2407.21781'" in intro


TB_XC330 = dict(d=0.0036, I=0.0040, fl=0.036, tmax=0.76, qdt=1.80, qdm=6.50, tqd=0.48, kdmin=0.384, tbrake=1.75)


def _tb_tau_limit(m: dict, qd: float) -> float:
    """toddlerbot.js 的 tauLimit()：按表 3 / 图 12 / 代码，从 (q̇_τmax, τmax) 线性降到 (q̇max, τ_q̇max)，再快为 0。"""
    a = abs(qd)
    if a <= m["qdt"]:
        return m["tmax"]
    if a <= m["qdm"]:
        return m["tmax"] + (m["tqd"] - m["tmax"]) * (a - m["qdt"]) / (m["qdm"] - m["qdt"])
    return 0.0


def _tb_chirp(t: float) -> float:
    return 0.5 * math.sin(2 * math.pi * (0.1 * t + 1.9 * t * t / 16.0))


def _tb_toy(p: dict | None = None) -> list[float]:
    """toddlerbot.js 的 toyRun()：表 3 的 XC330 带 21700 电芯（0.070 kg、0.08 m），k_p = 10，50 Hz 零阶保持，1 kHz 半隐式欧拉。"""
    o = p or {}
    X = TB_XC330
    fl, d = X["fl"] * o.get("fl", 1.0), X["d"] * o.get("d", 1.0)
    inertia, kdmin = X["I"] * o.get("I", 1.0), X["kdmin"] * o.get("kdmin", 1.0)
    par = 1.0 if o.get("par") is False else 3.0
    limit_on = o.get("limit") is not False
    J = inertia + 0.070 * 0.08 * 0.08
    th = w = acc = q_ref = 0.0
    out: list[float] = []
    dt, n = 0.001, 8000
    for i in range(n + 1):
        if i % 20 == 0:
            q_ref = _tb_chirp(i * dt)
            out.append(th)
        if i == n:
            break
        e = q_ref - th
        kp = 10.0 * par if acc * e < 0 else 10.0
        tm = kp * e - kdmin * w
        a = abs(w)
        lim = 1e9 if not limit_on else _tb_tau_limit(X, w)
        tr = fl + d * a
        tau = max(-X["tbrake"], min(lim, tm)) - tr if w >= 0 else max(-lim, min(X["tbrake"], tm)) + tr
        acc = (tau - 0.070 * 9.81 * 0.08 * math.cos(th)) / J
        w += acc * dt
        th += w * dt
    return out


def _tb_rmse_deg(a: list[float], b: list[float]) -> float:
    return math.degrees(math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b, strict=True)) / len(a)))


def test_toddlerbot_explainer_demos_and_worked_example_share_the_paper_numbers():
    """ToddlerBot：十二幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一份数。

    表 2–3、表 7 与正文的数照抄 arXiv 2502.00893 v4；k_p 换算、质心 / 俯仰增益取自官方代码；
    单电机 chirp 玩具用纯 Python 重跑一遍（九个参数全对、拿掉一项的 RMSE），功率因子用 Berkeley Humanoid 的表 2 验算公式。
    """
    js = (DEMO_JS_DIR / "toddlerbot.js").read_text(encoding="utf-8")
    note = TB_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "toddlerbot.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "toddlerbot.js").read_text(encoding="utf-8")

    for line in (
        "var ROBOT = { heightM: 0.56, kg: 3.4, gramsMeasured: 3484, dof: 30, armDof: 7, legDof: 6, neckDof: 2, waistDof: 2, usd: 6000, motorPcPct: 90, tflops: 2.5, torsoCm: [13, 9, 12] };",
        "{ name: 'XC330', full: 'XC330-T288', stall: 1.0, d: 0.0036, I: 0.0040, fl: 0.036, tmax: 0.76, qdt: 1.80, qdm: 6.50, tqd: 0.48, kdmin: 0.384, tbrake: 1.75,",
        "{ name: 'XM430', full: 'XM430-W210', stall: 3.0, d: 0.0056, I: 0.0022, fl: 0.025, tmax: 1.61, qdt: 0.10, qdm: 7.63, tqd: 0.47, kdmin: 0.203, tbrake: 3.70,",
        "var CODE = { kpRatio: 150, kdRatio: 16, passiveActive: 3, ctrlHz: 50, ctrlHz2: 200, comKp: 1.0, pitchKp: 0.2, pitchKd: 0.01, pitchTarget: -0.2, pitchPayload: -0.7,",
        "var TORQUE_REQ = { hM: 0.5, kg: 3.1, humanH: 1.73, humanKg: 70.9, knee: 2.35, ankle: 2.66, hip: 1.77 };",
        "['ToddlerBot', 2.74, 1.40, 1.35]",
        "var TABLE7 = { pos: [0.082, 0.133, 0.018], linVel: [0.016, 0.032, 0.002], angVel: [0.056, 0.113, 0.010] };",
        "var LOAD = { m: 0.070, r: 0.08 };",
        "var CHIRP = { A: 0.5, f0: 0.1, f1: 2.0, T: 8.0 };",
        "var TOY = { kp: 10, kd: 0, dt: 0.001, ctrlEvery: 20 };",
        "var DP = { px: 96, hz: 10, trainSteps: 100, inferSteps: 3, params: 3e8, latencyS: 0.1, predict: 16, discard: 3, execute: 5, demos: 60, trials: 20, bimanualPct: 90, fullBodyPct: 75 };",
    ):
        assert line in js, line

    # 自由度、功率因子（实例第 1–2 步）
    assert 2 * 7 + 2 * 6 + 2 + 2 == 30 and 6 + 4 + 4 + 12 + 4 == 30 and 30 * 50 + 600 + 1000 == 3100
    stall = 6 * 1.0 + 4 * 1.9 + 4 * 3.0 + 12 * 1.5 + 4 * 1.8
    hmg = 0.56 * 3.4 * 9.81
    assert _fmt(stall, 1) == "50.8" and _fmt(hmg, 2) == "18.68" and _fmt(stall / hmg, 2) == "2.72"
    assert (_fmt((2 * 1.9 + 12 * 1.5 + 2 * 1.0 + 2 * 1.0) / hmg, 2), _fmt((4 * 1.8 + 2 * 1.0 + 2 * 3.0 + 2 * 3.0 + 2 * 1.9) / hmg, 2)) == ("1.38", "1.34")
    bh = 2 * 9.7 + 6 * 45.3 + 2 * 62.6 + 2 * 81.1
    assert _fmt(bh, 1) == "578.6" and _fmt(bh / (0.85 * 16 * 9.81), 2) == "4.34"
    assert _fmt(2.22 * 1.73 * 70.9 * 9.81, 0) == "2671" and _fmt(stall / (0.56 * 4.968 * 9.81), 2) == "1.86"
    # 式 5（第 3 步）
    fac = (0.5 * 3.1) / (1.73 * 70.9)
    assert _fmt(fac, 5) == "0.01264"
    assert [_fmt(x / fac, 0) for x in (2.35, 2.66, 1.77)] == ["186", "210", "140"]
    assert (_fmt((3.0 / 2.35 - 1) * 100, 0), _fmt((3.0 / 2.66 - 1) * 100, 0), _fmt((1.8 / 1.77 - 1) * 100, 1), _fmt((1.9 / 2.35 - 1) * 100, 0)) == ("28", "13", "1.7", "-19")
    # 通信、台架、执行器模型（第 4–6 步）
    assert 30 * 50 == 1500 and _fmt(360 / 4096, 4) == "0.0879" and _fmt(0.25 / (360 / 4096), 1) == "2.8"
    X = TB_XC330
    assert (_fmt(X["fl"] + X["d"] * 1, 4), _fmt(X["fl"] + X["d"] * 6.5, 4)) == ("0.0396", "0.0594")
    assert _fmt((X["I"] / X["d"]) * math.log(1 + 5 * X["d"] / X["fl"]), 3) == "0.451" and _fmt(X["I"] / X["d"], 3) == "1.111"
    assert 1500 / 150 == 10 and _fmt(_tb_tau_limit(X, 3), 3) == "0.689"
    tm = 10 * 0.1 - X["kdmin"] * 3
    assert _fmt(tm, 3) == "-0.152" and _fmt(max(-X["tbrake"], min(_tb_tau_limit(X, 3), tm)) - (X["fl"] + X["d"] * 3), 3) == "-0.199"
    assert _fmt(1 / math.sqrt(3), 3) == "0.577"
    # chirp 玩具（第 7 步）
    real = _tb_toy()
    ref = [_tb_chirp(i * 0.02) for i in range(len(real))]
    assert len(real) == 401 and _fmt(_tb_rmse_deg(real, ref), 1) == "5.8"
    knock = {k: _fmt(_tb_rmse_deg(_tb_toy(p), real), 2) for k, p in (
        ("kdmin", {"kdmin": 0.0}), ("par", {"par": False}), ("limit", {"limit": False}), ("I", {"I": 0.0}), ("fl", {"fl": 0.0}), ("d", {"d": 0.0}),
        ("all", {"fl": 1.2, "d": 1.2, "I": 1.2, "kdmin": 1.2}))}
    assert knock == {"kdmin": "4.32", "par": "1.90", "limit": "1.53", "I": "0.90", "fl": "0.24", "d": "0.09", "all": "1.15"}
    assert _fmt(0.0040 + 0.070 * 0.08 ** 2, 6) == "0.004448" and _fmt(0.070 * 0.08 ** 2 / 0.004448 * 100, 1) == "10.1"
    # 两层 PD、RL 规模、扩散策略时序、电池、实验对账（第 8–12 步）
    assert 1 / (1 + 1.0) == 0.5
    assert (_fmt(3e8 / 1024, 0), 256 * 4 * 20, _fmt(3e8 / 20480, 0), _fmt(3e8 * 0.02 / 86400, 0)) == ("292969", 20480, "14648", "69")
    assert (16 * 0.1, 3 * 0.1 > 0.1, 5 * 0.1) == (1.6, True, 0.5)
    assert (5 * 14.8, _fmt(74 / 65, 2), _fmt(2 * 14.8 / 65 * 60, 0), 14.8 * 25) == (74.0, "1.14", "27", 370.0)
    assert (_fmt(27 * 24 * 31 / (13 * 9 * 12), 1), _fmt(1484 / 3484 * 100, 1), 21 + 14, 20 * 60 / 60) == ("14.3", "42.6", 35, 20)
    assert (_fmt(0.133 / 0.082, 2), _fmt(0.032 / 0.016, 1), _fmt(0.113 / 0.056, 1)) == ("1.62", "2.0", "2.0")

    for needle in (
        "## 🎬 十二幕动画：ToddlerBot 全流程", "## 🚶 具体实例", "## 🧭 四个版本是什么关系",
        "[2502.00893](https://arxiv.org/abs/2502.00893)", "CoRL 2025",
        "Haochen Shi\\*, Weizhuo Wang\\*, Shuran Song†, C. Karen Liu†",
        "\\mathbf{50.8}", "\\mathbf{2.72}", "\\mathbf{1.86}", "\\mathbf{0.01264}", "\\mathbf{186}", "\\mathbf{210}", "\\mathbf{140}",
        "\\mathbf{0.0396}", "\\mathbf{0.0594}", "\\mathbf{0.451}", "\\mathbf{0.689}", "\\mathbf{-0.199}", "\\mathbf{0.577}",
        "**5.8°**", "**4.32**", "**1.90**", "**1.53**", "**0.90**", "\\mathbf{292{,}969}", "\\mathbf{14{,}648}", "\\mathbf{74}", "\\mathbf{1.14}",
        "\\mathbf{42.6\\%}", "\\mathbf{35}", "**14.3** 倍", "**1484 g**", "**19 分钟**",
        'data-demo="tb-power"', 'data-demo="tb-sysid"', 'data-demo="tb-actuator"',
    ):
        assert needle in note, needle
    for needle in ("0.56 米", "3.4 公斤", "30 个主动自由度", "6000 美元", "2.74", "2.22", "2.35", "2.66", "1.77", "0.0396", "0.45 秒",
                   "4.32 度", "1.3 度", "20 分钟能采 60 条", "96 乘 96", "16 步", "1484 克", "19 分钟", "0.082", "0.133", "0.032", "0.113", "90%", "75%"):
        assert needle in narration, needle
    # 片头接上一期（Berkeley Humanoid）的片尾预告，片尾只预告下一篇（HumanML3D）
    assert "上一期结尾预告：把校准、数字孪生、遥操作采集和部署工具" in narration and "下一篇讲 HumanML3D" in narration
    assert "HumanML3D" in intro and "arxiv: '2502.00893'" in intro


def _gmr_clip(js: str, name: str, n: int):
    """从 gmr.js 里读出嵌入的片段（小端 int16 毫米，多段字符串拼起来的 base64），返回 [帧][点][xyz]（米）。"""
    body = re.search(rf"var CLIP_{name} =\s*((?:\s*'[A-Za-z0-9+/=]+'\s*\+?)+);", js).group(1)
    raw = base64.b64decode("".join(re.findall(r"'([A-Za-z0-9+/=]+)'", body)))
    vals = [int.from_bytes(raw[i:i + 2], "little", signed=True) / 1000 for i in range(0, len(raw), 2)]
    frames = len(vals) // (n * 3)
    assert frames * n * 3 == len(vals)
    return [[vals[(f * n + j) * 3:(f * n + j) * 3 + 3] for j in range(n)] for f in range(frames)]


def test_gmr_explainer_demos_and_worked_example_share_the_paper_numbers():
    """GMR：十三幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    表 I–III、图 4 照抄 arXiv 2510.02252 v1；比例、权重、停止条件照抄官方仓库；人和 G1 的动作是我们用 mink + MuJoCo
    照官方代码在 LAFAN1 walk1_subject1 第 920–1003 帧上跑的复现实验，嵌在 gmr.js 里，这里用 Python 解码后再算一遍。
    """
    js = (DEMO_JS_DIR / "gmr.js").read_text(encoding="utf-8")
    note = GMR_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "gmr.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "gmr.js").read_text(encoding="utf-8")

    for line in (
        "var EVAL = { seqs: 21, minLen: 5.5, maxLen: 130.5, sim: 100, simDr: 4096, sim2sim: 100, methods: 4 };",
        "var CFG = { hRef: 1.8, hLafan: 1.75, sLegs: 0.9, sArms: 0.75, damping: 0.5, maxIter: 10, tol: 0.001, velLimit: 3 * Math.PI, solver: 'daqp' };",
        "var USER = { n: 20, motions: 15, clipSec: 5, questions: 15 * 3, vs: [['Unitree', 25, 37, 38], ['PHC', 74, 8, 18], ['ProtoMotions', 63, 13, 23]] };",
        "{ motion: 'Walk 2', frames: [0, 7], sr: [[100, 64, 100, 100], [100, 100, 100, 100]] },",
        "{ motion: 'Turn 1', frames: [0, 49], sr: [[14, 100, 86, 47], [100, 100, 99, 100]] }",
        "mean: [247.8, 104.1, 139.7, 77.2]",
        "var PELVIS_Q = [0.5, 0.5, 0.5, 0.5];",
        "var CLIP = { file: 'walk1_subject1.bvh', from: 920, frames: 84, fps: 30, warm: 860 };",
    ):
        assert line in js, line
    for k in ("'gmr-scale': buildScaleDemo", "'gmr-ik': buildIkDemo", "'gmr-table': buildTableDemo", "K.video(host"):
        assert k in js, k

    # 表 I：21 段，11 + 3 段所有来源、所有测法都超过 98%，剩下 7 段差别大；合计时长
    rows = re.findall(r"\['([^']+)', ([\d.]+), \[([^\]]+)\], \[([^\]]+)\], \[([^\]]+)\]\]", js)
    assert len(rows) == 21
    table = [(n, float(L), [float(x) for x in a.split(",") + b.split(",") + c.split(",")]) for n, L, a, b, c in rows]
    perfect = [n for n, _, v in table if min(v) == 100]
    easy = [n for n, _, v in table if 98 < min(v) < 100]
    hard = [n for n, _, v in table if min(v) <= 98]
    assert perfect == ["Walk 1", "Walk (old)", "Hop around"] and len(easy) == 11
    assert hard == ["Walk 2", "Turn 1", "Hop", "Dance 1", "Dance 2", "Dance 5", "Run (stop & go)"]
    total = sum(L for _, L, _ in table)
    assert _fmt(total, 2) == "796.76" and _fmt(total / 60, 1) == "13.3" and _fmt(10 / total * 100, 1) == "1.3"
    assert (4 * 21, 100 + 4096 + 100, 4 * 21 * 4296, 21 * 3 * 4, 15 * 3) == (84, 4296, 360864, 252, 45)

    # 式 2 的比例与骨盆偏移
    assert (_fmt(1.75 / 1.8, 3), _fmt(1.75 / 1.8 * 0.9, 3), _fmt(1.75 / 1.8 * 0.75, 3), _fmt(1.3228 / 1.75, 3)) == ("0.972", "0.875", "0.729", "0.756")
    assert _fmt(1.75 / 1.8 * (0.9 - 0.75), 3) == "0.146"
    assert round(math.degrees(2 * math.acos(0.5))) == 120
    assert (_fmt(0.435 + 0.424, 3), _fmt(0.341 + 0.318, 3), _fmt(0.330 + 0.252, 3), _fmt(0.193 + 0.184, 3)) == ("0.859", "0.659", "0.582", "0.377")
    assert (_fmt(0.659 / 0.859, 3), _fmt(0.377 / 0.582, 3)) == ("0.767", "0.648")

    # 复现实验：从嵌入的数据再算一遍
    human = _gmr_clip(js, "HUMAN", 22)
    g1 = {v: _gmr_clip(js, "G1_" + v, 29) for v in ("gmr", "height", "legsAsArms", "s1only")}
    tgt = _gmr_clip(js, "TGT_gmr", 14)
    assert len(human) == 84 and all(len(g) == 84 for g in g1.values())

    def hs(a, b):
        return math.hypot(b[0] - a[0], b[1] - a[1]) * 30

    stance = [[f == 83 or hs(human[f][j], human[f + 1][j]) < 0.15 for f in range(84)] for j in (16, 20)]
    assert [sum(s) for s in stance] == [39, 36]
    ankle = [human[f][j][2] for k, j in enumerate((16, 20)) for f in range(84) if stance[k][f]]
    assert (_fmt(sum(ankle) / len(ankle) * 100, 1), _fmt(sum(ankle) / len(ankle) * 0.875 * 100, 1)) == ("7.8", "6.8")

    def stats(v):
        G = g1[v]
        pel = sum(G[f][0][2] for f in range(84)) / 84
        soles, slides = [], []
        for k in range(2):
            z, sl = [], []
            for f in range(84):
                if not stance[k][f]:
                    continue
                c = G[f][21 + 4 * k:25 + 4 * k]
                z.append(min(p[2] for p in c))
                if f < 83:
                    c1 = G[f + 1][21 + 4 * k:25 + 4 * k]
                    m0 = (sum(p[0] for p in c) / 4, sum(p[1] for p in c) / 4)
                    m1 = (sum(p[0] for p in c1) / 4, sum(p[1] for p in c1) / 4)
                    sl.append(hs(m0, m1))
                else:
                    sl.append(0)
            soles.append(sum(z) / len(z))
            slides.append(sum(sl) / len(sl))
        return pel, sum(soles) / 2, sum(slides) / 2

    st = {v: stats(v) for v in g1}
    assert [_fmt(st[v][0], 3) for v in ("gmr", "height", "legsAsArms", "s1only")] == ["0.788", "0.714", "0.828", "0.796"]
    assert [_fmt(st[v][1] * 100, 1) for v in ("gmr", "height", "legsAsArms", "s1only")] == ["2.2", "-5.1", "6.2", "2.7"]
    assert [_fmt(st[v][2] * 100, 1) for v in ("gmr", "height", "legsAsArms", "s1only")] == ["2.2", "4.9", "7.6", "3.9"]
    assert _fmt((st["gmr"][0] - st["height"][0]) * 100, 1) == "7.4" and _fmt(st["legsAsArms"][2] / st["gmr"][2], 1) == "3.4"

    def hand(v):
        e = [math.dist(g1[v][f][gi], tgt[f][ti]) for f in range(84) for gi, ti in ((13, 10), (17, 13))]
        return sum(e) / len(e)

    assert (_fmt(hand("gmr") * 100, 1), _fmt(hand("s1only") * 100, 1)) == ("3.1", "7.3")

    def naive(f, hip_i, knee_i, ank_i):
        hip, kn, an = human[f][hip_i], human[f][knee_i], human[f][ank_i]
        t1 = math.atan2(kn[0] - hip[0], hip[2] - kn[2])
        t2 = math.atan2(an[0] - kn[0], kn[2] - an[2])
        kx, kz = hip[0] + 0.341 * math.sin(t1), hip[2] - 0.341 * math.cos(t1)
        return kx + 0.318 * math.sin(t2), kz - 0.318 * math.cos(t2), an

    lift, slide = [], []
    for k, (h, kn, an) in enumerate(((14, 15, 16), (18, 19, 20))):
        for f in range(84):
            if not stance[k][f]:
                continue
            x, z, a = naive(f, h, kn, an)
            lift.append(z - a[2])
            slide.append(abs(naive(f + 1, h, kn, an)[0] - x) * 30 if f < 83 else 0)
    assert (_fmt(sum(lift) / len(lift) * 100, 1), _fmt(sum(slide) / len(slide), 2)) == ("18.9", "0.22")
    walk = math.hypot(human[83][0][0] - human[0][0][0], human[83][0][1] - human[0][0][1])
    assert (_fmt(walk, 2), _fmt(walk / (83 / 30), 2)) == ("2.54", "0.92")

    iters = re.search(r"var CLIP_ITERS = '(\d+)';", js).group(1)
    s1, s2 = [int(c) for c in iters[0::2]], [int(c) for c in iters[1::2]]
    assert [s1.count(i) for i in (1, 2, 3)] == [1, 65, 18] and [s2.count(i) for i in (1, 2)] == [30, 54] and max(s1 + s2) == 3
    assert (_fmt(sum(s1) / 84, 1), _fmt(sum(s2) / 84, 1)) == ("2.2", "1.6")

    for needle in (
        "## 🎬 十三幕动画：GMR 全流程", "## 🚶 具体实例", "## 📁 源码对照",
        'data-demo="gmr-scale"', 'data-demo="gmr-ik"', 'data-demo="gmr-table"',
        "**0.859**", "**0.659**", "**0.767**", "**0.582**", "**0.377**", "**0.648**",
        "**18.9 cm**", "**0.22 m/s**", "0.972 \\times 0.9 = 0.875", "0.972 \\times 0.75 = 0.729",
        "**0.788 m**", "**低 7.4 cm**", "**−5.1 cm**", "**6.2 cm**", "**7.6 cm/s**（3.4 倍）", "**7.3 cm**", "**3.1 cm**",
        "平均 **2.2** 次", "平均 **1.6** 次", "0.146", "**84 个策略**", "**4,296**", "360,864", "796.76 s", "**252**",
        "**15 × 3 = 45 题**", "**11 段**", "**3 段**", "**74%**", "**63%**", "**37%**",
        "`use_velocity_limit=True`", "HEIGHT_ADJUST", "平均离地 7.8 cm，乘 0.875 后目标是 6.8 cm",
    ):
        assert needle in note, needle
    for needle in ("1.75 米", "0.86 米", "19 厘米", "0.22 米", "0.972", "0.875", "0.729", "0.756", "7 厘米", "5 厘米", "6 厘米",
                   "7.6 厘米", "22 厘米", "7.3 厘米", "3.1 厘米", "84 个", "4096", "252", "247.8", "104.1", "74%", "63%", "37%",
                   "64%", "14%", "47%", "60 厘米", "26%", "51%", "17 款"):
        assert needle in narration, needle
    # 片头接上一期（HumanML3D）的片尾预告，片尾只预告下一篇（OmniRetarget）；主动画不预告下一篇
    assert "上一期结尾预告：人和机器人的骨架不一样，怎样把人的动作搬到机器人身上" in narration and "下一篇讲 OmniRetarget" in narration
    assert "**下一篇**：OmniRetarget" in intro and "arxiv: '2510.02252'" in intro
    assert "OmniRetarget" not in js and "下一篇" not in js
    # 配置表的「一行」念 háng：旁白写同音的「航」，字幕按短语换回「行」（不碰「偏航角」）
    for spoken, shown in (("写成一航", "写成一行"), ("每一航", "每一行"), ("这一航", "这一行")):
        assert spoken in narration and f'("{spoken}", "{shown}")' in narration
    assert "一行" not in narration.split("SCRIPT = [", 1)[1].split("DISPLAY = [", 1)[0]
    # 「调参」「单独调」念 tiáo：旁白写「条餐」「单独条」，字幕换回；「不调奖励」整句里本来就念对了
    for spoken, shown in (("奖励条餐", "奖励调参"), ("单独条", "单独调")):
        assert spoken in narration and f'("{spoken}", "{shown}")' in narration
    script = narration.split("SCRIPT = [", 1)[1].split("DISPLAY = [", 1)[0]
    assert "调参" not in script and "单独调" not in script and "不调奖励" in script
    # sim2sim 念 sim to sim，字幕换回
    assert "sim2sim" not in script and script.count("sim to sim") == 5 and '("sim to sim", "sim2sim")' in narration


def _webp_size(path: Path):
    """读 webp 的画布尺寸（带透明通道的贴图是 VP8X：第 24–29 字节是宽、高减一，小端 24 位）。"""
    head = path.read_bytes()[:30]
    assert head[:4] == b"RIFF" and head[8:12] == b"WEBP" and head[12:16] == b"VP8X", path.name
    return int.from_bytes(head[24:27], "little") + 1, int.from_bytes(head[27:30], "little") + 1


def test_gmr_3d_sprite_sheets_match_their_metadata_and_cameras():
    """GMR：第 3–8、12 幕的 3D G1 是离线渲染的贴图表（Robot_Retarget_Online 的模型加载代码），

    gmr.js 的 `G1_3D` 记着每张表的格子大小、列数、帧数与渲染相机。格子对不上图，裁出来的就是半个机器人；
    相机对不上 `CAM34` / `CAMSIDE`，二维的目标点、连线就叠不到 3D 的机身上。
    """
    js = (ROOT / "assets/js/demos/gmr.js").read_text(encoding="utf-8")
    num = r"(-?[\d.]+)"
    sheets = {
        m.group(1): {"file": m.group(2), "R": float(m.group(3)), "yaw": float(m.group(4)), "pitch": float(m.group(5)),
                     "cw": int(m.group(6)), "ch": int(m.group(7)), "cols": int(m.group(8)), "n": int(m.group(9)),
                     "ax": int(m.group(10)), "ay": int(m.group(11))}
        for m in re.finditer(
            rf"(\w+): \{{ file: '([\w.]+)', R: {num}, yaw: {num}, pitch: {num}, cw: (\d+), ch: (\d+), cols: (\d+), n: (\d+), ax: (\d+), ay: (\d+) \}}",
            js)
    }
    assert set(sheets) == {"gmr34", "s1only34", "height34", "legsAsArms34", "gmrSide", "legsAsArmsSide", "rest34"}
    cam34 = re.search(rf"var CAM34 = \{{ yaw: {num}, pitch: {num} \}}, CAMSIDE = \{{ yaw: {num}, pitch: {num} \}};", js)
    side = {"yaw": float(cam34.group(3)), "pitch": float(cam34.group(4))}
    three_q = {"yaw": float(cam34.group(1)), "pitch": float(cam34.group(2))}
    sprite_dir = ROOT / "assets/img/papers/gmr/g1_3d"
    total = 0
    for sid, s in sheets.items():
        path = sprite_dir / s["file"]
        assert path.is_file(), s["file"]
        total += path.stat().st_size
        rows = math.ceil(s["n"] / s["cols"])
        assert _webp_size(path) == (s["cw"] * s["cols"], s["ch"] * rows), sid
        assert 0 < s["ax"] < s["cw"] and 0 < s["ay"] <= s["ch"], sid
        cam = side if sid.endswith("Side") else three_q
        assert (s["yaw"], s["pitch"]) == (cam["yaw"], cam["pitch"]), sid
        # 每种设定都是复现片段的 84 帧（默认姿态只有一帧）
        assert s["n"] == (1 if sid == "rest34" else 84), sid
    assert {p.name for p in sprite_dir.iterdir()} == {s["file"] for s in sheets.values()}
    assert total < 1.7e6, "贴图按幕懒加载，但总量也别失控"
    # 每台 3D G1 都用表里有的贴图；侧视那两条跑道按 `L.v + 'Side'` 拼名字
    used = set(re.findall(r"g1Mesh\(\w+, \{ set: '(\w+)'", js))
    assert used <= set(sheets) and used >= {"gmr34", "s1only34", "height34", "legsAsArms34", "rest34"}
    assert "g1Mesh(inner, { set: L.v + 'Side' })" in js
    assert re.search(r"v: 'gmr', y: 44.*v: 'legsAsArms', y: 230", js)
    # 胶囊画法已经撤掉，用到 3D 贴图的相机一律走 cam34() / CAMSIDE
    assert "g1Skel" not in js
    assert js.count("cam34(") >= 10 and "yaw: CAMSIDE.yaw, pitch: CAMSIDE.pitch" in js
    # 第 12 幕的默认姿态：BeyondMimic robots/g1.py 的 init_state（不是全零关节）
    rest = _gmr_clip(js, "REST", 21)[0]
    assert abs(rest[0][2] - 0.757) < 0.002
    knee, hip = rest[2], rest[1]
    assert knee[0] - hip[0] > 0.05  # 屈膝：膝盖在髋的前面


def _exbody_clips(js: str):
    """exbody.js 的复现数据：每段动作每帧 125 个小端 int16（见 bundle 里的注释），解码成每帧的字典。"""
    clips = {}
    for m in re.finditer(r"    (\w+): \{ clip: '([\w]+)', zh: '[^']+', native: (\d+), fps: (\d+), t0: ([\d.]+), n: (\d+), sheet: (\{[^}]+\}),\n      data: '([^']+)' \}", js):
        raw = base64.b64decode(m.group(8))
        vals = [int.from_bytes(raw[i : i + 2], "little", signed=True) for i in range(0, len(raw), 2)]
        n = int(m.group(6))
        assert len(vals) == n * 125, m.group(1)
        frames = []
        for k in range(n):
            v = vals[k * 125 : (k + 1) * 125]
            frames.append({
                "root": [x / 1000 for x in v[0:3]], "rpy": [x / 1000 for x in v[3:6]], "vloc": [x / 1000 for x in v[6:9]],
                "dof": [x / 1000 for x in v[9:28]], "kp": [[x / 1000 for x in v[28 + 3 * j : 31 + 3 * j]] for j in range(6)],
                "elbR": [v[121] / 1000, v[122] / 1000], "armErr": [v[123] / 10, v[124] / 10],
            })
        clips[m.group(1)] = {"clip": m.group(2), "native": int(m.group(3)), "fps": int(m.group(4)), "t0": float(m.group(5)),
                             "n": n, "sheet": json.loads(m.group(7)), "frames": frames}
    return clips


def test_exbody_explainer_demos_and_worked_example_share_the_paper_numbers():
    """ExBody：十三幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    表 I–VIII 的数字照抄 arXiv 2402.16796 v2；观测维度、PD、随机化、1043 → 780 段照抄 chengxuxin/expressive-humanoid；
    四段 CMU 动作（14_25 挥手、104_41 僵尸走、20_11 边走边击掌、08_07 大步走）是我们照官方重定向步骤重算的复现，嵌在 exbody.js 里，
    这里用 Python 解码后把例 2 的指数映射、右肘投影、前臂方向误差、例 4 的根运动目标再算一遍；例 5 的奖励按表 III 重算。
    """
    js = (DEMO_JS_DIR / "exbody.js").read_text(encoding="utf-8")
    note = EXBODY_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "exbody.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "exbody.js").read_text(encoding="utf-8")

    for line in (
        "var TABLE2 = [['Walk', 546, 9076.6], ['Dance', 78, 1552.3], ['Basketball', 36, 766.1], ['Punch', 20, 800.0], ['Others', 100, 1188.0]];",
        "{ key: 'dof', zh: '关节角', k: 0.7, w: 3.0, unit: 'rad', goal: 'e' },",
        "{ key: 'vel', zh: '线速度', k: 4.0, w: 6.0, unit: 'm/s', goal: 'm' },",
        "var EX_ERR = { dof: 0.30, kp: 0.10, vel: 0.10, rp: 0.05, yaw: 0.10 };",
        "{ key: 'ours', zh: 'ExBody（本文）', motion: [16.87, 318.67, 754.92, 659.78], random: [13.51, 132.14, 523.79, 483.67] },",
        "{ key: 'noRsi', zh: 'No RSI', motion: [0.23, 0.63, 10.09, 7.25], random: [0.22, 0.10, 7.41, 7.15] },",
        "{ key: 'full', zh: 'Full Body Tracking', motion: [13.28, 246.11, 584.40, 397.25], random: [10.76, 76.46, 407.88, 284.69] }",
        "var T5_MEAN = { ours: 0.051, amp: 0.087 };",
        "var PPO = { envs: 4096, gamma: 0.99, lam: 0.95, steps: 21, epochs: 5, minibatch: 4, entropy: 0.01, clip: 0.2, lr: '1e−3' };",
        "envs: 6144, steps: 24, lr: '2e−4', entropy: 0.005, clips: 780, clipsAll: 1043,",
        "var EX_K = 28;",
    ):
        assert line in js, line
    for k in ("'exbody-explainer'", "'exbody-video'", "'exbody-retarget'", "'exbody-reward'", "'exbody-table'", "K.video(host"):
        assert k in js, k

    # 表 II、表 I 与表 V 的加总
    assert 546 + 78 + 36 + 20 + 100 == 780 and _fmt(9076.6 + 1552.3 + 766.1 + 800.0 + 1188.0, 1) == "13383.0"
    assert _fmt(13383.0 / 3600, 2) == "3.72" and _fmt(18.9 + 5.0 + 22.5 + 13.0 + 2.5 + 3.3 + 32.6 + 9.6 + 15.2 + 39.3 + 32.2 + 8.2, 1) == "202.3"
    t5 = re.findall(r"\['[^']+', (0\.\d+), (0\.\d+)\]", js[js.index("var TABLE5 = [") : js.index("var T5_MEAN")])
    assert len(t5) == 14
    ours, amp = [float(a) for a, _ in t5], [float(b) for _, b in t5]
    assert (_fmt(sum(ours) / 14, 4), _fmt(sum(amp) / 14, 4)) == ("0.0511", "0.0864")
    assert sum(o > a for o, a in zip(ours, amp, strict=True)) == 1  # 只有 Boxing（MDM）是 ExBody 晃得更多
    assert "$0.716/14 = 0.0511$" in note and "$1.209/14 = 0.0864$" in note
    # 表 IV 的比值：速度跟踪 −35%、No RSI 差 73 倍、全身跟踪的关键点 −40%
    assert round(100 * (1 - 205.60 / 318.67)) == 35 and round(16.87 / 0.23) == 73 and round(100 * (1 - 397.25 / 659.78)) == 40
    for s in ("205.60 对 318.67", "397.25 对 659.78", "0.23", "16.87", "87.83"):
        assert s in narration, s

    # 例 5：表 III 的五项，假设误差 0.30 / 0.10 / 0.10 / 0.05 / 0.10
    terms = [3 * math.exp(-0.7 * 0.30), 2 * math.exp(-0.10), 6 * math.exp(-0.4 * 1.0), math.exp(-0.05), math.exp(-0.10)]
    parts = [_fmt(x, 3) for x in terms]
    assert parts == ["2.432", "1.810", "4.022", "0.951", "0.905"]
    assert _fmt(sum(terms), 2) == "10.12" and _fmt(sum(float(p) for p in parts), 3) == "10.120"
    for text in (note, narration):
        assert "2.432" in text and "4.022" in text and "10.12" in text
    assert "10.12" in js and "2.432 + 1.810 + 4.022 + 0.951 + 0.905" in js
    assert _fmt(math.log(10) / 0.7, 2) == "3.29" and "3.29" in note and "3.29 弧度" in narration
    # 例 6：膝关节 PD
    assert _fmt(200 * (0.8 + 0.25 * 0.4 - 0.80) - 10 * 0.5, 1) == "15.0" and "15\\ \\text{N·m}" in note
    assert (_fmt(0.8 * 20 - 1.2 * 5, 0), _fmt(1.2 * 20 - 0.8 * 5, 0)) == ("10", "20")
    # 例 3：观测维度
    assert 3 + 2 + 2 + 19 * 3 + 2 == 66 and 9 + 3 + 3 + 2 + 1 + 18 == 36 and 264 + 66 + 36 + 3 + 43 + 660 == 1072
    assert 66 + 36 + 16 + 3 + 20 == 141 and 6144 == 7 * 780 + 684

    # 复现：从嵌入的数据再算一遍
    clips = _exbody_clips(js)
    assert set(clips) == {"wave", "zombie", "high5", "stride"}
    assert [clips[k]["clip"] for k in ("wave", "zombie", "high5", "stride")] == ["14_25", "104_41", "20_11", "08_07"]
    wave = clips["wave"]
    f = wave["frames"][28]
    assert wave["fps"] == 20 and wave["native"] == 120 and wave["n"] == 99  # 第 28 帧 = 1.4 s = 原始 120 fps 的第 168 帧
    assert "var EX_K = 28;" in js and round(28 / 20 * 120) == 168
    m = [f["dof"][16], f["dof"][15], f["dof"][17]]  # 右肩：dof 里是（俯仰, 横滚, 偏航）=（m_y, m_x, m_z）
    assert [_fmt(x, 3) for x in m] == ["-1.746", "-1.058", "0.049"]
    theta = math.sqrt(sum(x * x for x in m))
    assert _fmt(theta, 3) == "2.042" and _fmt(math.degrees(theta), 1) == "117.0"
    axis = [x / theta for x in m]
    assert [_fmt(x, 3) for x in axis] == ["-0.855", "-0.518", "0.024"]
    qw = math.cos(theta / 2)
    assert _fmt(qw, 3) == "0.522" and _fmt(math.sqrt(1 - 0.522**2), 3) == "0.853"
    assert [_fmt(x * math.sin(theta / 2), 3) for x in axis] == ["-0.729", "-0.442", "0.020"]
    assert f["elbR"] == [1.213, 0.981] and _fmt(1.213 * 0.981, 3) == "1.190" and f["dof"][18] == 1.19
    assert _fmt(1.571 - 1.190, 3) == "0.381" and round(math.degrees(math.pi / 2 - 1.19)) == 22
    upper = [f["dof"][j] for j in range(10, 19)]
    assert [_fmt(x, 3) for x in upper] == ["0.007", "0.091", "0.363", "-0.055", "1.128", "-1.058", "-1.746", "0.049", "1.190"]
    assert f["armErr"] == [24.3, 21.4]
    fore = sum(fr["armErr"][1] for fr in wave["frames"]) / wave["n"]
    upp = sum(fr["armErr"][0] for fr in wave["frames"]) / wave["n"]
    zup = sum(fr["armErr"][0] for fr in clips["zombie"]["frames"]) / clips["zombie"]["n"]
    assert (_fmt(fore, 1), _fmt(upp, 1), _fmt(zup, 1)) == ("21.5", "19.5", "41.9")
    assert max(fr["armErr"][1] for fr in wave["frames"]) == 42.2 and max(fr["armErr"][0] for fr in wave["frames"]) == 40.7
    for s in ("(-1.746,\\ -1.058,\\ 0.049)$", "2.042", "117.0°", "1.190", "21.5°", "24.3°", "21.4°", "19.5°", "41.9°", "40.7°", "42.2°"):
        assert s in note, s
    for s in ("负 1.746、负 1.058、0.049", "2.042 弧度", "1.190 弧度", "19.5 度", "21.5 度", "第 1.4 秒"):
        assert s in narration, s
    # 例 2 的关键点（根坐标系）：右手比右肩高 0.29 m，右臂斜着举过肩
    assert "右肩 $(0.007, -0.156, 0.430)$" in note and "右手 $(0.228, -0.730, 0.720)$" in note
    assert _fmt(0.720 - 0.430, 2) == "0.29"
    # 换掉的两段（141_16 Wave Hello、141_22 High Five）腿脚动捕超出 ASF 限位：笔记写明原因，嵌入的动作里腿不再拧着
    assert "为什么不用真机测过的 `141_16`「Wave Hello」" in note and "`141_22`「High Five」也有一半的帧脚部超限" in note
    for k, c in clips.items():
        legs = [fr["dof"][:10] for fr in c["frames"]]
        hip_yaw = max(abs(lg[j]) for lg in legs for j in (0, 5))
        ankle = max(abs(lg[j]) for lg in legs for j in (4, 9))
        assert hip_yaw < 0.35 and ankle < 0.7, (k, hip_yaw, ankle)
    # 例 4：僵尸走第 5.0 s（第 40 帧）的根运动目标与平均前进速度
    z = clips["zombie"]
    zf = z["frames"][40]
    assert z["t0"] == 3.0 and z["fps"] == 20 and _fmt(z["t0"] + 40 / 20, 1) == "5.0"
    assert zf["vloc"] == [0.341, -0.012, -0.069] and zf["rpy"][:2] == [0.065, -0.109] and zf["root"][2] == 0.989
    assert _fmt(sum(fr["vloc"][0] for fr in z["frames"]) / z["n"], 2) == "0.40"
    assert "$(0.341, -0.012, -0.069)$" in note and "每秒 0.4 米" in narration
    assert _fmt(z["frames"][-1]["root"][0], 2) == "1.84"
    # 片头接上一期（OmniRetarget）的片尾预告，片尾只预告下一篇（H2O）
    assert narration.count("上一期结尾预告") == 1 and "下一篇讲 H2O" in narration and "H2O" in intro
    assert "## 🎬 十三幕动画" in note and 'demos: ["exbody"]' in note
    # 全局检查（2026-10-13）：面板到 cue 之后才淡出。视频里旁白比分镜长时 t 停在 cue 前一点，
    # 淡出若在 cue 之前，这一段剩下的旁白里面板一直是空的（第 1、3、6、9 幕都出过）
    assert "return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));" in js
    assert "1 - seg(t, b - 0.3, b)" not in js
    # 术语第一次出现就用白话交代
    for needle in (
        "也就是能独立动的方向有几个", "增益，就是关节被拉离目标时往回拉的力度", "根部就是骨盆", "也就是身体左右歪、前后倾、朝哪个方向",
        "也就是机器人自己的传感器测得到的", "P D 控制器像弹簧加阻尼", "用四个数描述一次三维旋转", "论文没写单位",
        "只约束动作本身的小奖惩", "越远的奖励打的折越多", "每次换掉一个部件", "从易到难的课程",
        "判别器是一个分类器，分辨动作来自数据还是来自策略", "用文字生成人体动作的扩散模型", "站直时的高度",
    ):
        assert needle in narration, needle
    assert "标称高度" not in narration and "标称高度" not in js
    # 示意图补标注：第 5 幕放大图 3 的子图并写中文；第 6 幕先讲两类关节、再画 T 字；第 8 幕图例不压曲线、空框 / 实心有图例；
    # 第 10 幕念到速度、横滚俯仰时分别圈出图 5(b) 的子图；第 12 幕两张图都有图例、圈出拳击这个例外；第 13 幕按图注框出图 1 的四块
    dist = js.split("function buildSceneDist()", 1)[1].split("function buildSceneRetarget()", 1)[0]
    assert "figCrop(g, 'fig3_data_distribution.webp', 1400, 262)" in dist and "'论文图 3 局部放大'" in dist
    retarget = js.split("function buildSceneRetarget()", 1)[1].split("function buildSceneRsi()", 1)[0]
    assert "'H1 的 19 个电机分两类'" in retarget and "'第 1 步：人和 H1 都摆成 T 字（示意）'" in retarget
    reward = js.split("function buildSceneReward()", 1)[1].split("function buildSceneReg()", 1)[0]
    assert "X0 + (X1 - X0) * 0.4, Y1 + 18 + i * 17" in reward and "实心 = 这一帧拿到的" in reward
    track = js.split("function buildSceneTrack()", 1)[1].split("function buildSceneAblation()", 1)[0]
    assert "hlV = panelBox(0, 0.259), hlRP = panelBox(0.259, 0.515)" in track and "'右：训练好的策略'" in track
    amp = js.split("function buildSceneAmp()", 1)[1].split("function buildSceneReal()", 1)[0]
    assert amp.count("'+ AMP', 'demo-x-ink2'") == 2 and "var boxRing = ring(t5" in amp
    real = js.split("function buildSceneReal()", 1)[1].split("var EXB_SCENES", 1)[0]
    assert "f1Box(hl, 0.515, 0.668, 1, 1, C_UP)" in real and "f1Box(hl2, 0, 0.668, 0.515, 1, C_ROOT)" in real
    # 第 5 幕结尾（2026-10-14 看片反馈「看不懂」后重做）：图 3 收起，左边是示意的随机撒点（Fu 等人的做法），右边是 H1 照着挥手、
    # 右手每一刻点一个点；第 10 幕结尾：左边 H1 照着挥手，每一刻把双手相对身体的位置点到右边站着的 H1 上，演示图 6 的点怎么来
    assert "'人工设计：Fu 等人的做法（示意）'" in dist and "'人的数据：我们复现的挥手'" in dist and "K.mulberry32(13)" in dist
    assert "'站着的 H1：点画在这儿'" in track and "'图 6 的点怎么来？用我们复现的挥手演示'" in track
    assert "论文参考文献把这条引用 `fu2022learning` 连到了一篇无人机竞速论文" in note
    # 第 10 幕：挥手时根部偏航从 −20.5° 走到 +45.4°（变了 60 多度），点按根坐标系记（先扣掉根部的转动），画面和旁白都要交代
    yaws = [math.degrees(fr["rpy"][2]) for fr in wave["frames"]]
    assert (_fmt(min(yaws), 1), _fmt(max(yaws), 1)) == ("-20.5", "45.4") and 60 <= max(yaws) - min(yaws) < 70
    assert "'俯视朝向'" in track and "记点时已扣掉，照样对得上" in track and "身体朝向变了 60 多度" in narration
    for needle in ("在球坐标里随机撒出来的", "右手每一刻在哪，就点一个绿点", "记下双手相对身体的位置", "这段挥手 5 秒，就是 99 个时刻"):
        assert needle in narration, needle

    def mulberry32(a):
        a &= 0xFFFFFFFF

        def rnd():
            nonlocal a
            a = (a + 0x6D2B79F5) & 0xFFFFFFFF
            t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF
            t = ((t + ((t ^ (t >> 7)) * (61 | t))) & 0xFFFFFFFF) ^ t
            return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

        return rnd

    def in_body(p):
        x, y, z = p
        if 0 <= z < 0.85:
            return -0.12 < x < 0.25 and abs(y) < 0.28
        if 0.85 <= z < 1.48:
            return abs(x) < 0.15 and abs(y) < 0.22
        return 1.48 <= z < 1.75 and abs(x) < 0.11 and abs(y) < 0.1

    rng, ground, body = mulberry32(13), 0, 0
    for _ in range(60):
        rr, az, el = 0.3 + 0.65 * rng(), rng() * 2 * math.pi, (rng() * 2 - 1) * 1.25
        z = 0.72 + rr * math.sin(el)
        p = (0.05 + rr * math.cos(el) * math.cos(az), -0.15 + rr * math.cos(el) * math.sin(az), z)
        ground += z < 0
        body += z >= 0 and in_body(p)
    assert (ground, body) == (3, 5) and "种子 13：3 个在地下、5 个扎进身体" in dist
    # 第 4 幕表 II：短条的数字写在条的右边，不压在条上
    assert "r.v.setAttribute('x', (BX + (r.inside ? 8 : r.full * u + 6)).toFixed(1));" in js


def test_exbody_3d_sprite_sheets_match_their_metadata():
    """ExBody：H1 的 3D 逐帧贴图（Robot_Retarget_Online 的材质与光照，MuJoCo Menagerie 的 H1）。

    exbody.js 的 `sheet` 记着每张表的格子大小、列数、帧数与渲染相机；格子对不上图，裁出来的就是半个机器人。
    """
    js = (DEMO_JS_DIR / "exbody.js").read_text(encoding="utf-8")
    clips = _exbody_clips(js)
    sheets = {k: c["sheet"] for k, c in clips.items()}
    sheets["stand"] = json.loads(re.search(r"var STAND_SHEET = (\{[^}]+\});", js).group(1))
    sprite_dir = ROOT / "assets/img/papers/exbody/h1_3d"
    total = 0
    for sid, s in sheets.items():
        path = sprite_dir / s["file"]
        assert path.is_file(), s["file"]
        total += path.stat().st_size
        rows = math.ceil(s["n"] / s["cols"])
        assert _webp_size(path) == (s["cw"] * s["cols"], s["ch"] * rows), sid
        assert 0 < s["ax"] < s["cw"] and 0 < s["ay"] <= s["ch"], sid
        if sid != "stand":
            assert s["n"] == clips[sid]["n"], sid
        assert (s["yaw"], s["pitch"]) == ((0, 0.05) if sid == "stride" else (1.1, 0.1)), sid
    assert {p.name for p in sprite_dir.iterdir()} == {s["file"] for s in sheets.values()}
    assert total < 1.6e6, "贴图按幕懒加载，但总量也别失控"
    figs = {p.name for p in (ROOT / "assets/img/papers/exbody").glob("*.webp")}
    used = set(re.findall(r"'(fig\w+\.webp)'", js))
    assert used and used <= figs, used - figs


H2O_CLIP_RE = re.compile(
    r"    (\w+): \{ clip: '(\w+)', zh: '[^']+', fps: ([\d.]+), t0: ([\d.]+), n: (\d+), dz: ([\d.]+), sheet: SHEETS\.(\w+),\n"
    r"      data: '([^']+)'(?:,\n      raw: '([^']+)')? \}"
)


def _h2o_int16(b64: str):
    raw = base64.b64decode(b64)
    return [int.from_bytes(raw[i : i + 2], "little", signed=True) for i in range(0, len(raw), 2)]


def _h2o_pts(a, o, n):
    return [[a[o + 3 * j + q] / 1000 for q in range(3)] for j in range(n)]


def _h2o_clips(js: str):
    """解码 h2o.js 的 `CLIPS`：每帧 147 个 int16（根 3、横滚俯仰偏航 3、19 个关节角、H1 的 13 个点、人的 27 个点、两只脚尖朝向）。"""
    clips = {}
    for m in H2O_CLIP_RE.finditer(js):
        n, a = int(m.group(5)), _h2o_int16(m.group(8))
        assert len(a) == 147 * n, m.group(1)
        frames = []
        for k in range(n):
            o = k * 147
            frames.append({
                "root": [v / 1000 for v in a[o : o + 3]], "rpy": [v / 1000 for v in a[o + 3 : o + 6]],
                "dof": [v / 1000 for v in a[o + 6 : o + 25]], "h1": _h2o_pts(a, o + 25, 13), "tgt": _h2o_pts(a, o + 64, 27),
                "foot": [a[o + 145] / 10, a[o + 146] / 10],
            })
        clips[m.group(1)] = {"clip": m.group(2), "fps": float(m.group(3)), "n": n, "dz": float(m.group(6)),
                             "sheet": m.group(7), "frames": frames}
    return clips


def test_h2o_explainer_demos_and_worked_example_share_the_paper_numbers():
    """H2O：十四幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    表 I–IV 照抄 arXiv 2403.04436 v1；PD、随机化的代码取值照抄 LeCAR-Lab/human2humanoid；五段 CMU 动作（14_25 挥手、14_01 拳击、
    10_02 踢球、07_01 走路、49_06 侧手翻）是我们照官方 grad_fit_h1.py 重算的复现（SMPL 换成逐段缩放 CMU 骨架），嵌在 h2o.js 里，
    这里用 Python 解码后把 11 对点的平均距离、第 1.4 s 的右手、抄角度对照、内八的脚尖朝向、例 5 的参考位置再算一遍。
    """
    js = (DEMO_JS_DIR / "h2o.js").read_text(encoding="utf-8")
    note = H2O_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "h2o.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "h2o.js").read_text(encoding="utf-8")

    for line in (
        "var FUNNEL = [13000, 10000, 8500];",
        "{ key: 'dq', zh: '关节位置', k: 0.25, w: 24, sq: false, ex: 0.5,",
        "{ key: 'dqd', zh: '关节速度', k: 0.25, w: 24, sq: true, ex: 2.0,",
        "{ key: 'v', zh: '刚体速度', k: 10, w: 60, sq: false, ex: 0.2,",
        "var TERM = { h: 0.3, g: 0.7, d: 0.5 };",
        "{ key: 'priv', zh: '特权模仿器', dim: 778, real: false, all: [85.5, 50.0, 43.6, 6.9, 7.8], succ: [46.0, 40.9, 5.2, 6.2] },",
        "{ key: 'reduced', zh: 'H2O-reduced', dim: 90, real: true, all: [53.2, 200.2, 115.8, 11.2, 13.8], succ: [182.5, 111.0, 3.0, 8.1] },",
        "{ key: 'wosim', zh: 'H2O-w/o-sim2data', dim: 138, real: true, all: [67.9, 176.6, 95.0, 10.2, 12.2], succ: [163.1, 93.8, 3.0, 7.5] },",
        "{ key: 'h2o', zh: 'H2O', dim: 138, real: true, all: [72.5, 166.7, 91.7, 8.9, 11.0], succ: [151.0, 88.8, 2.9, 7.0] }",
        "var TABLE4 = [[0.1, 52.0, 198.0, 107.9, 12.4, 13.7], [1, 58.8, 183.8, 96.4, 10.7, 12.0], [10, 61.3, 174.3, 92.3, 10.8, 12.1], [100, 72.5, 166.7, 91.7, 8.9, 11.0]];",
        "var PD = { kp: 300, kd: 6, q0: 0.8, scale: 0.25, a: 0.4, q: 0.8, qd: 0.5 };",
        "var EX5 = { ref: [0.368, -0.480, 0.947], own: [0.319, -0.214, 0.107], diff: [0.049, -0.267, 0.841], vel: [-0.110, -0.198, 0.043], pz: STAND22[0][2] };",
    ):
        assert line in js, line
    for k in ("'h2o-explainer'", "'h2o-video'", "'h2o-retarget'", "'h2o-reward'", "'h2o-tables'", "K.video(host"):
        assert k in js, k

    # 例 5：观测维度
    assert 19 + 19 + 3 + 3 + 3 + 19 == 66 and 8 * 3 * 3 == 72 and 66 + 72 == 138 and 66 + 8 * 3 == 90 and 138 - 90 == 48
    # 例 6：表 I 的六项任务奖励，假设误差 0.5 / 2（平方）/ 0.1 / 0.5 / 0.2 / 2
    terms = [24 * math.exp(-0.25 * 0.5), 24 * math.exp(-0.25 * 4), 40 * math.exp(-0.5 * 0.1),
             16 * math.exp(-0.1 * 0.5), 60 * math.exp(-10 * 0.2), 60 * math.exp(-0.01 * 2)]
    assert [_fmt(x, 2) for x in terms] == ["21.18", "8.83", "38.05", "15.22", "8.12", "58.81"]
    assert 24 + 24 + 40 + 16 + 60 + 60 == 224 and _fmt(sum(terms), 2) == "150.21"
    assert "**150.21**" in note and "58.81 ≈ 150.2" in narration
    assert (_fmt(60 * math.exp(-1), 2), _fmt(60 * math.exp(-3), 2), _fmt(60 * math.exp(-0.04), 2)) == ("22.07", "2.99", "57.65")
    # 例 7：膝关节 PD 与 P / D 增益随机化
    tau = 300 * (0.8 + 0.25 * 0.4 - 0.8) - 6 * 0.5
    assert _fmt(tau, 1) == "27.0" and _fmt(0.75 * 30 - 1.25 * 3, 2) == "18.75" and _fmt(1.25 * 30 - 0.75 * 3, 2) == "35.25"
    assert "= 27\\ \\text{N·m}" in note and "18.75" in note and "35.25" in note
    assert _fmt(math.degrees(math.asin(0.7)), 1) == "44.4" and "44.4°" in note
    # 例 8、例 9：读表
    assert (_fmt(72.5 - 67.9, 1), _fmt(72.5 - 53.2, 1), _fmt(85.5 - 72.5, 1)) == ("4.6", "19.3", "13.0")
    assert _fmt(100 * (1 - 166.7 / 176.6), 1) == "5.6" and _fmt(166.7 / 50.0, 1) == "3.3"
    assert (_fmt(58.8 - 52.0, 1), _fmt(61.3 - 58.8, 1), _fmt(72.5 - 61.3, 1)) == ("6.8", "2.5", "11.2")
    for s in ("4.6 个点", "19.3 个点", "72.5%", "67.9%", "53.2%"):
        assert s in narration, s

    # 复现：从嵌入的数据再算一遍
    clips = _h2o_clips(js)
    assert [(k, c["clip"]) for k, c in clips.items()] == [
        ("wave", "14_25"), ("box", "14_01"), ("kick", "10_02"), ("walk", "07_01"), ("cart", "49_06"), ("waveRaw", "14_25")]
    pairs = [(int(a), int(b)) for a, b in re.findall(r"\[(\d+), (\d+), '[^']+'\]", js[js.index("var PAIRS = [") : js.index("var KP8")])]
    h1n = re.findall(r"'(\w+)'", re.search(r"var H1PTS = \[([^\]]+)\]", js).group(1))
    hjn = re.findall(r"'(\w+)'", re.search(r"var HJ = \[([^\]]+)\]", js).group(1))
    assert len(pairs) == 11 and len(h1n) == 13 and len(hjn) == 27
    rh, rt = h1n.index("right_hand_link"), hjn.index("rhand")

    def pair_mean(f):
        return sum(math.dist(f["h1"][a], f["tgt"][b]) for a, b in pairs) / len(pairs)

    def clip_mean(c):
        return 1000 * sum(pair_mean(f) for f in c["frames"]) / c["n"]

    # 例 3：挥手整段 35.5 mm；第 1.4 s（15 fps 的第 21 帧）41.5 mm，右手 (0.375, −0.394, 1.895) 对 (0.329, −0.421, 1.899)
    wave = clips["wave"]
    assert wave["fps"] == 15 and wave["n"] == 75 and wave["dz"] == 0.039 and "var WAVE_K42 = 21;" in js
    assert _fmt(clip_mean(wave), 1) == "35.5" and "500 步 **35.5 mm**" in note and "500 步收敛到 35.5 毫米" in narration
    f21 = wave["frames"][21]
    assert _fmt(1000 * pair_mean(f21), 1) == "41.5"
    assert [_fmt(v, 3) for v in f21["tgt"][rt][:2] + [f21["tgt"][rt][2] - wave["dz"]]] == ["0.375", "-0.394", "1.895"]
    assert [_fmt(v, 3) for v in f21["h1"][rh][:2] + [f21["h1"][rh][2] - wave["dz"]]] == ["0.329", "-0.421", "1.899"]
    assert "$(0.375, -0.394, 1.895)$" in note and "$(0.329, -0.421, 1.899)$" in note
    # 其余四段的最终平均距离（笔记按 30 fps 全帧算，这里是嵌入的 15 fps 抽帧，差不到 0.5 mm）
    for key, full in (("box", 31.5), ("kick", 51.8), ("walk", 45.8), ("cart", 76.1)):
        assert abs(clip_mean(clips[key]) - full) < 0.5, key
        assert f"{full}" in note, full
    # 例 5：第 1.4 s 的参考右手，按根部偏航转进朝向坐标系，高度相对默认站姿的骨盆（0.991 m）
    stand_z = float(re.search(r"var STAND22 = \[\[0\.0, 0\.0, ([\d.]+)\]", js).group(1))
    yaw = f21["rpy"][2]
    dx, dy = f21["h1"][rh][0] - f21["root"][0], f21["h1"][rh][1] - f21["root"][1]
    ref = [math.cos(yaw) * dx + math.sin(yaw) * dy, -math.sin(yaw) * dx + math.cos(yaw) * dy, f21["h1"][rh][2] - stand_z]
    assert stand_z == 0.991 and all(abs(a - b) < 0.002 for a, b in zip(ref, [0.368, -0.480, 0.947], strict=True)), ref
    # 位置差按未取整的值算，和三位小数相减最多差 0.001
    assert all(abs((a - b) - d) <= 0.0015 for a, b, d in zip([0.368, -0.480, 0.947], [0.319, -0.214, 0.107], [0.049, -0.267, 0.841], strict=True))
    assert "\\hat{\\mathbf p} = (0.368, -0.480, 0.947)" in note and "(0.049, -0.267, 0.841)" in note
    # 例 4：不改身材会内八（挥手，脚尖朝向向外为正）
    foot = lambda c, j: sum(f["foot"][j] for f in c["frames"]) / c["n"]  # noqa: E731
    assert (_fmt(foot(wave, 0), 1), _fmt(foot(wave, 1), 1)) == ("1.8", "-5.5")
    raw = clips["waveRaw"]
    assert raw["fps"] == 3.75 and foot(raw, 0) < -15 and foot(raw, 1) < -20  # 抽帧后 −19.3 / −24.4，全帧 −18.8 / −24.2
    assert "| −18.8° / −24.2° | +1.8° / −5.5° |" in note and "18.8 度和 24.2 度" in narration
    # 抄角度对照：ExBody 笔记同一段挥手的关节角，右手平均偏 218.6 mm，第 1.4 s 偏 293 mm
    cm = re.search(r"var COPY = \{ n: (\d+), fps: (\d+), sheet: SHEETS\.copy34,\n    data: '([^']+)' \};", js)
    a = _h2o_int16(cm.group(3))
    n = int(cm.group(1))
    assert n == 50 and int(cm.group(2)) == 10 and len(a) == 120 * n and "var COPY_K14 = 14;" in js
    copy = [{"h1": _h2o_pts(a, k * 120, 13), "tgt": _h2o_pts(a, k * 120 + 39, 27)} for k in range(n)]
    rhand = [1000 * math.dist(f["h1"][rh], f["tgt"][rt]) for f in copy]
    assert _fmt(sum(rhand) / n, 1) == "218.6" and abs(rhand[14] - 293.3) < 0.5
    assert _fmt(1000 * sum(pair_mean(f) for f in copy) / n, 1) == "68.0"
    assert "| 右手 | **29.2 mm** | 218.6 mm |" in note and "右手 53.4 mm 对 293.3 mm" in note
    assert "右手平均偏 218.6 对 29.2 毫米" in narration
    # 逐段缩放：14 对点 77.4 → 35.9 mm
    assert "**77.4 mm**" in note and "**35.9 mm**" in note and "77.4 毫米" in narration

    # 两个数之间只隔一个逗号会被 TTS 当成千分位：「66 加 72，138 维」念成七万两千一百三十八维（2026-10-15 看片反馈）
    assert "66 加 72 等于 138 维" in narration and "66 加 24 等于 90 维" in narration
    assert not re.search(r"\d\s*[，,]\s*\d{3}\s*维", narration)
    # 片头接上一期（ExBody）的片尾预告，片尾只预告下一篇（OmniH2O）
    assert narration.count("上一期结尾预告") == 1 and "下一篇讲 Omni H 2 O" in narration and "OmniH2O" in intro
    assert "## 🎬 十四幕动画" in note and 'demos: ["h2o"]' in note
    # 面板到 cue 之后才淡出（见 ExBody 的全局检查）
    assert "return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));" in js
    assert "1 - seg(t, b - 0.3, b)" not in js
    # 视频文案的占位符都已填上
    assert "__VIDEO_" not in js and "__VIDEO_" not in note


def test_h2o_3d_sprite_sheets_match_their_metadata():
    """H2O：H1 的 3D 逐帧贴图（Robot_Retarget_Online 的材质与光照，MuJoCo Menagerie 的 H1、关节限位按官方仓库）。

    h2o.js 的 `SHEETS` 记着每张表的格子大小、列数、帧数与渲染相机；格子对不上图，裁出来的就是半个机器人。
    """
    js = (DEMO_JS_DIR / "h2o.js").read_text(encoding="utf-8")
    sheets = json.loads(re.search(r"var SHEETS = (\{.*?\});\n", js).group(1))
    clips = _h2o_clips(js)
    sprite_dir = ROOT / "assets/img/papers/h2o/h1_3d"
    total = 0
    for sid, s in sheets.items():
        path = sprite_dir / s["file"]
        assert path.is_file(), s["file"]
        total += path.stat().st_size
        rows = math.ceil(s["n"] / s["cols"])
        assert _webp_size(path) == (s["cw"] * s["cols"], s["ch"] * rows), sid
        assert 0 < s["ax"] < s["cw"] and 0 < s["ay"] <= s["ch"] and s["R"] == 220, sid
        assert (s["yaw"], s["pitch"]) == ((1.5708, 0.3) if sid.startswith("waveF") else (1.1, 0.1)), sid
    for c in clips.values():
        assert sheets[c["sheet"]]["n"] == c["n"], c["sheet"]
    assert {p.name for p in sprite_dir.iterdir()} == {s["file"] for s in sheets.values()}
    assert total < 2.6e6, "贴图按幕懒加载，但总量也别失控"
    figs = {p.name for p in (ROOT / "assets/img/papers/h2o").glob("*.webp")}
    used = set(re.findall(r"'(fig\w+\.webp)'", js))
    assert used and used <= figs, used - figs


def _omnih2o_clip(js: str):
    """解码 omnih2o.js 的 `CLIP`：每帧 144 个 int16（毫米）——站姿版 23 个点、重建的根、人的 SMPL 24 个关节。"""
    m = re.search(r"var CLIP = \{ fps: (\d+), n: (\d+), t0: ([\d.]+), per: (\d+), data: '([^']+)' \};", js)
    fps, n, per = int(m.group(1)), int(m.group(2)), int(m.group(4))
    a = _h2o_int16(m.group(5))
    assert len(a) == per * n and per == 144
    return fps, [{"st": _h2o_pts(a, k * per, 23), "root": _h2o_pts(a, k * per + 69, 1)[0], "human": _h2o_pts(a, k * per + 72, 24)} for k in range(n)]


def test_omnih2o_explainer_demos_and_worked_example_share_the_paper_numbers():
    """OmniH2O：十七幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    表 1–3、表 17 照抄 arXiv 2406.08858 v1；课程、抬脚奖励的代码取值照抄 LeCAR-Lab/human2humanoid；H1 的动作是官方样例
    stable_punch.pkl 里 KIT 572 号的左手出拳（站姿版取它的 pose_aa），嵌在 omnih2o.js 里，这里解码后把第 2.40 s 的 27 维目标、
    第 2.67 s 打向侧面的左手、固定的根与头再算一遍。
    """
    js = (DEMO_JS_DIR / "omnih2o.js").read_text(encoding="utf-8")
    note = OMNIH2O_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "omnih2o.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "omnih2o.js").read_text(encoding="utf-8")

    for line in (
        "{ key: 'priv', zh: '特权教师', group: 'main', dim: 913, real: false, all: [94.77, 126.51, 70.68, 3.57, 6.20], succ: [122.71, 69.06, 2.22, 5.20] },",
        "{ key: 'h2o', zh: 'H2O', group: 'main', dim: 138, real: true, all: [87.52, 148.13, 81.06, 5.12, 7.89], succ: [133.28, 75.99, 2.40, 5.75] },",
        "{ key: 'omni', zh: 'OmniH2O', group: 'main', dim: 1665, real: true, all: [94.10, 141.11, 77.82, 3.70, 6.54], succ: [135.49, 75.75, 2.30, 5.47] },",
        "{ key: 'woD', zh: '不用 DAgger', group: 'a', dim: 1665, real: false, all: [47.11, 223.27, 128.90, 15.03, 16.29], succ: [182.13, 119.54, 5.47, 9.10] },",
        "{ key: 'p22', zh: '22 个点', group: 'c', dim: 1836, real: true, all: [94.72, 127.71, 70.39, 3.62, 6.25], succ: [123.87, 68.92, 2.22, 5.24] },",
        "{ key: 'omni', zh: 'OmniH2O', group: 'main', dim: 1665, v: [47.94, 41.87, 1.84, 2.20] },",
        "{ key: 'h0', zh: '历史 0 步', group: 'b', dim: 90, v: [83.26, 46.00, 4.86, 4.45] },",
        "data: [['25% 数据', 1.30e-2, 4, [1, 9, 3, 3]], ['50% 数据', 7.48e-3, 6.5, [3, 10, 6, 9]], ['100% 数据', 5.25e-4, 8, [6, 10, 6, 10]]],",
        "var CURR = { s0: 0.5, down: 0.9999, up: 1.0001, lo: 40, hi: 120, cap: 1 };",
        "var CURR_CODE = { s0: 0.5, step: 1e-5, lo: 50, hi: 120, min: 0.25, cap: 1 };",
        "var FEET = { h: 0.25, wCode: -2500, wPaper: 1000, ankle0: 0.068, air: 0.25, wAir: 1000, dt: 0.02 };",
        "var SQUAT = { a: 0.8, z: 0.7995 };",
        "var STAND_Z = 0.979;",
        "var EX_K = 21, EX_LAG = 3;",
        "var REACH_K = 25;",
        "var RECON = { err: 44.3, yaw0: 166.9, yawReach: 98.6, lift: 0.0422 };",
    ):
        assert line in js, line
    for k in ("'omnih2o-explainer'", "'omnih2o-video'", "'omnih2o-points'", "'omnih2o-reward'", "'omnih2o-tables'", "K.video(host"):
        assert k in js, k

    # 例 4：观测维数
    assert 19 + 19 + 3 + 3 + 19 == 63 and 63 + 27 == 90 and 90 + 25 * 63 == 1665 == 26 * 63 + 27
    assert 66 + 138 + 69 + 69 + 19 == 361 and 69 + 138 + 69 + 69 + 69 + 138 == 552 and 361 + 552 == 913
    assert 63 * 25 + 63 + 9 * 9 == 1719 and 63 * 25 + 63 + 23 * 9 == 1845 and 63 * 25 + 63 + 72 == 1710 and 63 * 25 + 63 + 198 == 1836
    for s in ("$90+25\\times63=1665=26\\times63+27$", "$1575+63+81=1719$", "$1575+63+207=1845$"):
        assert s in note, s
    # 例 5：一步的抬脚分数（代码 −2500 × max(0.25 − h, 0)，论文 +1000 × max(h − 0.25, 0)）
    assert -2500 * (0.25 - 0.12) == -325 and _fmt(-325 * 0.02, 1) == "-6.5" and _fmt(-325 * 0.02 * 0.5, 2) == "-3.25"
    assert _fmt(1000 * (0.30 - 0.25) * 0.02, 1) == "1.0" and 8 * -325 == -2600 and _fmt(0.25 - 0.068, 3) == "0.182"
    assert "$-2500\\times(0.25-0.12)=-325$" in note and "4 秒累计扣 2600" in narration and "−2600" in js
    # 例 6：惩罚课程
    assert round(math.log(2) / math.log(1.0001)) == 6932 and round(math.log(2) / math.log(1 + 1e-5)) == 69315
    assert "**6932**" in note and "69,315" in note and "6932 次" in narration
    # 例 7、例 8：读表
    assert (_fmt(94.77 - 94.10, 2), _fmt(94.10 - 87.52, 2), _fmt(94.10 - 47.11, 2), _fmt(141.11 - 127.71, 1)) == ("0.67", "6.58", "46.99", "13.4")
    assert _fmt(100 * (1 - 47.94 / 87.33), 1) == "45.1" and _fmt(100 * (83.26 / 47.94 - 1), 1) == "73.7"
    for s in ("0.67 个点", "6.58 个点", "47.11%", "94.10%", "87.33 毫米", "47.94 毫米", "降了 45%"):
        assert s in narration, s
    # 例 9：表 3 是表 17 四个任务的平均；50% 数据和「单帧图 → 单步」按表 17 是 7/10，表 3 写 6.5/10
    assert sum([3, 10, 6, 9]) / 4 == 7 and sum([3, 10, 5, 10]) / 4 == 7 and sum([7, 10, 9, 9]) / 4 == 8.75 and sum([6, 10, 5, 10]) / 4 == 7.75
    assert f"{sum([1.39e-3, 6.24e-4, 4.50e-3, 1.46e-2]) / 4:.2e}" == "5.28e-03" and f"{sum([4.79e-5, 6.42e-5, 3.41e-4, 2.42e-3]) / 4:.2e}" == "7.18e-04"
    assert "| 50% 数据 | 3、10、6、9 | **7** | 6.5 ✗ |" in note
    # 例 10：OmniH2O-6 的帧数
    frames = [13234, 8535, 12759, 9380, 11118, 18436]
    assert sum(frames) == 73462 and _fmt(sum(frames) / 30 / 60, 1) == "40.8" and "**40.8 分钟**" in note

    # 复现：从嵌入的官方样例再算一遍
    fps, clip = _omnih2o_clip(js)
    assert fps == 15 and len(clip) == 60
    # 站姿版：根一直在 (0, 0, 0.979)，头 = 骨盆往上 0.75 m
    assert all(f["st"][0] == [0.0, 0.0, 0.979] and f["st"][22] == [0.0, 0.0, 1.729] for f in clip)
    # 例 3：第 2.40 s（第 21 帧），机器人落后 3 帧；左手、右手、头；参考速度用 15 fps 的中心差分
    k, lag, idx = 21, 3, [20, 21, 22]
    assert 1.0 + k / fps == 2.4

    def sub(p, q):
        return [a - b for a, b in zip(p, q, strict=True)]

    got = {
        "ref": [sub(clip[k]["st"][j], clip[k]["st"][0]) for j in idx],
        "own": [sub(clip[k - lag]["st"][j], clip[k - lag]["st"][0]) for j in idx],
        "diff": [sub(clip[k]["st"][j], clip[k - lag]["st"][j]) for j in idx],
        "vel": [[v * fps / 2 for v in sub(clip[k + 1]["st"][j], clip[k - 1]["st"][j])] for j in idx],
    }
    for key, rows in got.items():
        want = re.search(key + r": (\[\[[^;]*?\]\])", js[js.index("var EX = {") :]).group(1)
        want = json.loads(want)
        # 关键点按毫米存，速度 = 差 × 7.5，常落在 0.0005 的正中，三位小数的舍入误差正好 5e-4
        assert all(abs(a - b) <= 5e-4 + 1e-9 for r1, r2 in zip(rows, want, strict=True) for a, b in zip(r1, r2, strict=True)), key
    for s in ("$(0.017, 0.368, 0.076)$", "$(0.238, 0.677, 0.468)$", "$(-0.232, 1.777, 1.110)$", "$(-0.049, 0.013, -0.029)$", "$(-0.337, -0.068, -0.038)$"):
        assert s in note, s
    assert _fmt(math.dist([0, 0, 0], got["vel"][0]), 2) == "2.11" and "约 2.11 m/s" in note
    # 例 1：第 2.67 s（第 25 帧）左拳打到身体左侧
    assert [_fmt(v, 3) for v in clip[25]["st"][20]] == ["0.138", "0.819", "1.551"] and "$(0.138, 0.819, 1.551)$" in note
    # 重建的根抬了 0.0422 m，第一帧根在原点
    assert clip[0]["root"][:2] == [0.0, 0.0]

    # 旁白：数字列举用顿号，两个数之间不只隔一个逗号（「66 加 72，138 维」的教训）
    spoken = re.findall(r'"([^"]*)"\),', narration[narration.index("SCRIPT = [") : narration.index("DISPLAY = [")])
    assert len(spoken) == 91 and not any(re.search(r"\d\s*[，,]\s*\d", t) for t in spoken)
    # 片头接上一期（H2O）的片尾预告，片尾只预告下一篇（MaskedMimic）
    assert narration.count("上一期结尾预告") == 1 and "下一篇讲 MaskedMimic" in narration and "MaskedMimic" in intro
    assert "## 🎬 十七幕动画" in note and 'demos: ["omnih2o"]' in note
    # 面板到 cue 之后才淡出（见 ExBody 的全局检查）
    assert "return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));" in js
    assert "1 - seg(t, b - 0.3, b)" not in js
    # 视频文案的占位符都已填上
    assert "__VIDEO_" not in js and "__VIDEO_" not in note
    # 第 9 幕：损失回到学生是一支画到学生框的虚线箭头（第一版只画了半截、没箭头，看不出是什么）
    assert "ua.set(upPts[0][0], upPts[0][1], upPts[1][0], upPts[1][1], 8);" in js and "'梯度回传'" in js
    assert "up.slice(0, 2)" not in js


def test_omnih2o_3d_sprite_sheets_match_their_metadata():
    """OmniH2O：H1 的 3D 逐帧贴图（Robot_Retarget_Online 的材质与光照，MuJoCo Menagerie 的 H1）。

    三张表：站姿版（官方样例的 pose_aa）、蹲姿版与原始重定向的近似还原（我们做的）；格子对不上图，裁出来的就是半个机器人。
    """
    js = (DEMO_JS_DIR / "omnih2o.js").read_text(encoding="utf-8")
    sheets = json.loads(re.search(r"var SHEETS = (\{.*?\});\n", js).group(1))
    _, clip = _omnih2o_clip(js)
    sprite_dir = ROOT / "assets/img/papers/omnih2o/h1_3d"
    total = 0
    assert set(sheets) == {"stable", "squat", "retarget"}
    for sid, s in sheets.items():
        path = sprite_dir / s["file"]
        assert path.is_file(), s["file"]
        total += path.stat().st_size
        rows = math.ceil(s["n"] / s["cols"])
        assert _webp_size(path) == (s["cw"] * s["cols"], s["ch"] * rows), sid
        assert 0 < s["ax"] < s["cw"] and 0 < s["ay"] <= s["ch"] and s["R"] == 220 and (s["yaw"], s["pitch"]) == (1.1, 0.1), sid
        assert s["n"] == len(clip), sid
    assert {p.name for p in sprite_dir.iterdir()} == {s["file"] for s in sheets.values()}
    assert total < 2.0e6, "贴图按幕懒加载，但总量也别失控"
    figs = {p.name for p in (ROOT / "assets/img/papers/omnih2o").glob("*.webp")}
    used = set(re.findall(r"'((?:fig|hw)\w+\.webp)'", js))
    assert used and used == figs, ("没用到的图别留在仓库里", figs - used, "缺图", used - figs)


def _mp4_boxes(data):
    """顶层 box 的 (类型, 起点) 列表"""
    out, i = [], 0
    while i + 8 <= len(data):
        size = int.from_bytes(data[i : i + 4], "big")
        out.append((data[i + 4 : i + 8].decode("latin-1"), i))
        if size < 8:
            break
        i += size
    return out


def test_storyboard_clips_live_where_render_finds_them():
    """分镜里的真机片段（kit.js 的 svgClip）：render.mjs 只会把 assets/img/papers/<bundle>/clips/*.mp4 转成 VP9 给离线渲染用，
    网页上是 H.264、faststart、无声的 mp4，每段配一张首帧 webp 当海报。"""
    kit = (DEMO_JS_DIR / "kit.js").read_text(encoding="utf-8")
    assert "svgClip: svgClip" in kit and "clipSince: clipSince" in kit
    stage = (ROOT / "scripts/paper_video/stage.html").read_text(encoding="utf-8")
    assert "window.__clipRender = true" in stage and "window.__wallSince" in stage and "CLIPDIR" in stage
    render = (ROOT / "scripts/paper_video/render.mjs").read_text(encoding="utf-8")
    assert "window.__clipWait" in render and "libvpx-vp9" in render
    for path in DEMO_JS_DIR.glob("*.js"):
        if path.name == "kit.js" or "svgClip(" not in path.read_text(encoding="utf-8"):
            continue
        clip_dir = ROOT / "assets/img/papers" / path.stem / "clips"
        assert clip_dir.is_dir(), path.name
        for mp4 in clip_dir.glob("*.mp4"):
            data = mp4.read_bytes()
            kinds = [k for k, _ in _mp4_boxes(data)]
            assert "moov" in kinds and "mdat" in kinds and kinds.index("moov") < kinds.index("mdat"), (mp4.name, "要 faststart")
            moov = data[dict(_mp4_boxes(data))["moov"] :]
            assert b"avc1" in moov[:200000], (mp4.name, "网页用 H.264")
            assert b"soun" not in moov[:200000], (mp4.name, "片段不带声音")
            assert mp4.with_suffix(".webp").is_file(), (mp4.name, "缺海报")


def test_omnih2o_project_page_clips():
    """OmniH2O：第 10、14–17 幕的真机画面剪自项目页 omni.human2humanoid.com 的视频（10 段，按幕懒加载）。"""
    js = (DEMO_JS_DIR / "omnih2o.js").read_text(encoding="utf-8")
    clip_dir = ROOT / "assets/img/papers/omnih2o/clips"
    used = set(re.findall(r"projClip\(\w+, '(\w+)'", js))
    assert used == {"brush", "teleop", "wholebody", "mdm", "robust", "outdoor", "gptbox", "gptgreet", "lfd", "fail"}
    assert {p.name for p in clip_dir.iterdir()} == {f"{u}.{ext}" for u in used for ext in ("mp4", "webp")}
    assert sum(p.stat().st_size for p in clip_dir.iterdir()) < 4.0e6, "片段只在播到那一幕时才下载，但总量也别失控"
    # 出处写在画面上和卡片说明里
    assert js.count("项目页视频") >= 8 and "真机片段剪自项目页的视频" in js
    note = OMNIH2O_NOTE.read_text(encoding="utf-8")
    assert "真机画面剪自[项目页](https://omni.human2humanoid.com/)的视频" in note


def _hover_walk(js: str):
    """解码 hover.js 的 `WALK`：每帧 166 个 int16——根部 3（mm）、横滚俯仰偏航 3（mrad）、19 个关节角（mrad）、23 个刚体（mm）、SMPL 的 24 个关节（mm）。"""
    m = re.search(r"var WALK = \{ clip: '07_01', fps: (\d+), n: (\d+), per: (\d+), data: '([^']+)' \};", js)
    fps, n, per = int(m.group(1)), int(m.group(2)), int(m.group(3))
    a = _h2o_int16(m.group(4))
    assert len(a) == per * n and per == 166
    frames = []
    for k in range(n):
        o = k * per
        frames.append({"root": [v / 1000 for v in a[o : o + 3]], "rpy": [v / 1000 for v in a[o + 3 : o + 6]], "dof": [v / 1000 for v in a[o + 6 : o + 25]],
                       "pts": _h2o_pts(a, o + 25, 23), "hum": _h2o_pts(a, o + 25 + 69, 24)})
    return fps, frames


def _rot_xyz(rpy):
    """外旋 xyz：R = Rz · Ry · Rx（hover.js 的 rotXYZ）"""
    r, p, y = rpy
    cr, sr, cp, sp, cy, sy = math.cos(r), math.sin(r), math.cos(p), math.sin(p), math.cos(y), math.sin(y)
    return [[cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr], [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr], [-sp, cp * sr, cp * cr]]


def _hover_command(frames, fps, kref, lag):
    """照官方 student_observations.py 算 95 维命令（hover.js 的 command()）"""
    ref, rob = frames[kref], frames[kref - lag]
    r0, c, s_ = rob["pts"][0], math.cos(rob["rpy"][2]), math.sin(rob["rpy"][2])
    kin = []
    for p in ref["pts"]:
        d = [p[i] - r0[i] for i in range(3)]
        kin.append([c * d[0] + s_ * d[1], -s_ * d[0] + c * d[1], d[2]])
    joint = [q - w for q, w in zip(ref["dof"], rob["dof"], strict=True)]
    v = [(frames[kref + 1]["pts"][0][i] - frames[kref - 1]["pts"][0][i]) * fps / 2 for i in range(3)]
    R = _rot_xyz(ref["rpy"])
    vloc = [R[0][i] * v[0] + R[1][i] * v[1] + R[2][i] * v[2] for i in range(3)]
    root = vloc + [ref["rpy"][0], ref["rpy"][1], ref["rpy"][2] - rob["rpy"][2], ref["pts"][0][2]]
    return kin, joint, root


def test_hover_explainer_demos_and_worked_example_share_the_paper_numbers():
    """HOVER：十六幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    表 III–V、图 3–4 照抄 arXiv 2410.21229；掩码、命令、观测维数照抄 NVlabs/HOVER（Isaac Lab 版）；H1 的动作是我们用官方 human2humanoid 的
    grad_fit_h1_shape.py、grad_fit_h1.py 以 SMPL 在 AMASS 的 CMU 07_01 上重算的走路，嵌在 hover.js 里，这里解码后把第 1.33 s 的 95 维命令
    （机器人落后 0.2 s）再算一遍。
    """
    js = (DEMO_JS_DIR / "hover.js").read_text(encoding="utf-8")
    note = HOVER_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "hover.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "hover.js").read_text(encoding="utf-8")

    for line in (
        "var T3_ORACLE = [99.3, 119, 59.4, 2.63, 5.43, 0.153, 0.206, 0.456, 0.066, 0.065, 0.083, 0.282];",
        "hover: [99.1, 185, 63.9, 3.01, 6.06, 0.148, 0.210, 0.452, 0.063, 0.068, 0.091, 0.279], boldS: [3, 7], boldH: [1, 2, 4, 5, 6, 8, 10]",
        "hover: [98.9, 121, 60.6, 2.73, 5.49, 0.158, 0.207, 0.456, 0.065, 0.067, 0.086, 0.365], boldS: [3], boldH: [1, 2, 4, 5, 6, 8, 10, 11]",
        "{ zh: '右手', spec: [220, 216, 6.77, 12.5], hover: [128, 141, 5.83, 10.8], boldS: [], boldH: [0, 1, 2, 3] },",
        "{ zh: 'HumanPlus', spec: [51.0, 36.7, 0.128, 0.035], hover: [47.4, 35.3, 0.121, 0.038], boldS: [3], boldH: [0, 1, 2] },",
        "{ zh: '右手', hover: [0.34, 0.25, 100, 191], other: [0.43, 0.29, 120, 374] },",
        "{ zh: 'OmniH2O', hover: [0.162, 62.5, 128.4, 0.155, 0.457, 0.213], other: [0.199, 76.4, 149.3, 0.250, 0.456, 0.232] }",
        "var COUNT = { upKin: 12, upJnt: 9, loKin: 11, loJnt: 10, root: 7 };",
        "var TRAIN = { teachIter: 100000, teachSec: 0.84, stuIter: 10000, stuSec: 0.097 };",
        "var EX_K = 20, EX_LAG = 3;",
        "bits: [5, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] },",
        "bits: [20, 21, 22] }",
    ):
        assert line in js, line
    for k in ("'hover-explainer'", "'hover-video'", "'hover-mask'", "'hover-radar'", "'hover-tables'", "K.video(host"):
        assert k in js, k

    # 例 1：49 位掩码，照官方 DISTILL_MASK_MODES_ALL 的正则（re.match）数一遍
    bodies = ["pelvis"] + [f"{s}_{j}_link" for s in ("left", "right") for j in ("hip_yaw", "hip_roll", "hip_pitch", "knee", "ankle")]
    bodies = bodies[:1] + bodies[1:6] + bodies[6:] + ["torso_link"] + [f"{s}_{j}_link" for s in ("left", "right") for j in ("shoulder_pitch", "shoulder_roll", "shoulder_yaw", "elbow")]
    bodies += ["left_hand_link", "right_hand_link", "head_link"]
    joints = [f"{s}_{j}" for s in ("left", "right") for j in ("hip_yaw", "hip_roll", "hip_pitch", "knee", "ankle")] + ["torso"]
    joints += [f"{s}_{j}" for s in ("left", "right") for j in ("shoulder_pitch", "shoulder_roll", "shoulder_yaw", "elbow")]
    names = [b + "_local_pos_" for b in bodies] + [j + "_joint_pos" for j in joints] + ["root_linear_velocity_x", "root_linear_velocity_y",
             "root_linear_velocity_z", "root_orientation_roll", "root_orientation_pitch", "root_orientation_yaw_delta", "root_height"]
    assert len(bodies) == 23 and len(joints) == 19 and len(names) == 49
    modes = {
        "exbody": [".*torso_joint.*", ".*shoulder.*joint.*", ".*elbow.*joint.*", "root.*"],
        "humanplus": [".*torso_joint.*", ".*shoulder.*joint.*", ".*elbow.*joint.*", ".*hip.*joint.*", ".*knee.*joint.*", ".*ankle.*joint.*", "root.*"],
        "h2o": [".*shoulder.*link.*", ".*elbow.*link.*", ".*hand.*link.*", ".*ankle.*link.*"],
        "omnih2o": [".*hand.*link.*", ".*head.*link.*"],
    }
    bits = {k: sorted({i for p in pats for i, n in enumerate(names) if re.match(p, n)}) for k, pats in modes.items()}
    assert bits["exbody"] == list(range(33, 49)) and bits["humanplus"] == list(range(23, 49))
    assert bits["h2o"] == [5, 10, *range(12, 22)] and bits["omnih2o"] == [20, 21, 22]
    assert [len(b) for b in bits.values()] == [16, 26, 12, 3]
    assert "ExBody 第 33–41、42–48 位（16 位）；HumanPlus 第 23–48 位（26 位）；H2O 第 5、10、12–21 位（12 位）；OmniH2O 第 20–22 位（3 位）" in note
    # 例 4、例 5：维数与组合数
    assert 23 * 3 + 19 + 7 == 95 and 23 + 19 + 7 == 49 and 19 + 19 + 3 + 3 == 44 and 44 + 19 == 63
    assert 44 + 95 + 49 + 19 + 25 * 63 == 1782 and "| **合计** | **1782** |" in note
    assert (2**12 + 2**9) * (2**11 + 2**10 + 2**7) == 14745600 == 4608 * 3200
    assert "14{,}745{,}600" in note and "14745600 种" in narration and "4608 种" in narration
    assert 0.5**3 == 1 / 8 and _fmt(100 * 0.5**12, 2) == "0.02"
    # 例 6、例 7、例 9：加粗数与降幅
    t3 = [(7, 2), (7, 3), (8, 1), (7, 1)]
    for (h, sp), key in zip(t3, ("exbody", "humanplus", "h2o", "omnih2o"), strict=True):
        seg = js[js.index(f"{{ key: '{key}', zh:") :]
        bh = json.loads(re.search(r"boldH: (\[[^\]]*\])", seg).group(1))
        bs = json.loads(re.search(r"boldS: (\[[^\]]*\])", seg).group(1))
        assert (len(bh), len(bs)) == (h, sp), key
    assert [_fmt(100 * (1 - b / a), 1) for a, b in ((275, 185), (266, 182), (137, 121), (149, 128))] == ["32.7", "31.6", "11.7", "14.1"]
    assert [_fmt(100 * (1 - b / a), 1) for a, b in ((189, 138), (220, 128), (137, 120), (186, 133))] == ["27.0", "41.8", "12.4", "28.5"]
    assert [_fmt(100 * (1 - b / a), 1) for a, b in ((51.3, 48.9), (51.0, 47.4), (51.2, 47.5))] == ["4.7", "7.1", "7.2"]
    for s in ("7 / 7 / 8 / 7", "2 / 3 / 1 / 1", "−32.7%", "−41.8%", "−4.7%"):
        assert s in note, s
    # 例 8：图 4 的全局位置误差平均与缩放
    hov, mm = [121, 185, 156, 191, 204, 128, 182, 171], [138, 220, 295, 374, 350, 198, 211, 249]
    assert sum(hov) / 8 == 167.25 and sum(mm) / 8 == 254.375 and _fmt((374 - 128) / (374 - 121), 2) == "0.97"
    assert "=167.25$" in note and "=254.4$" in note and "374 对 191 毫米" in narration
    # 例 10：训练时长
    assert _fmt(100000 * 0.84 / 3600, 1) == "23.3" and _fmt(10000 * 0.097 / 3600, 2) == "0.27" and round(84000 / 970) == 87

    # 复现：从嵌入的走路再算一遍
    fps, frames = _hover_walk(js)
    assert fps == 15 and len(frames) == 40
    # 头 = 骨盆坐标系里 (0, 0, 0.75)：用嵌入的横滚俯仰偏航转一下，和嵌入的头差不过 2 mm（毫米取整）
    for f in frames:
        R = _rot_xyz(f["rpy"])
        head = [f["pts"][0][i] + 0.75 * R[i][2] for i in range(3)]
        assert math.dist(head, f["pts"][22]) < 2e-3
        assert f["dof"][4] == 0 and f["dof"][9] == 0  # 这段重定向里两踝一直是 0
    kin, joint, root = _hover_command(frames, fps, 20, 3)
    assert 20 / 15 == 4 / 3 and "第 1.33 s" in note
    want = {
        "左手": (kin[20], "(0.469, 0.099, -0.107)"), "右手": (kin[21], "(0.265, -0.361, -0.131)"), "头": (kin[22], "(0.204, -0.063, 0.793)"),
        "骨盆": (kin[0], "(0.261, -0.059, 0.045)"), "根部速度": (root[:3], "(1.242, -0.054, 0.013)"),
    }
    for name, (v, s) in want.items():
        assert "(" + ", ".join(_fmt(x, 3) for x in v) + ")" == s, name
        assert "$" + s + "$" in note, name
    upper = "(" + ", ".join(_fmt(x, 3) for x in joint[10:19]) + ")"
    assert upper == "(0.340, 0.118, -0.144, -0.194, 0.568, -0.019, 0.000, 0.330, -0.086)" and "$" + upper + "$" in note
    assert [_fmt(x, 3) for x in root[3:]] == ["0.016", "-0.075", "-0.144", "1.087"]
    assert [_fmt(x, 3) for x in (joint[2], joint[3], joint[7], joint[8])] == ["-0.782", "0.828", "0.543", "-0.280"]
    speeds = [math.hypot(frames[k + 1]["pts"][0][0] - frames[k - 1]["pts"][0][0], frames[k + 1]["pts"][0][1] - frames[k - 1]["pts"][0][1]) * fps / 2 for k in range(1, 39)]
    assert _fmt(sum(speeds) / len(speeds), 2) == "1.36" and "平均 1.36 m/s" in note
    assert (_fmt(min(speeds), 2), _fmt(max(speeds), 2)) == ("1.16", "1.63") and "1.16–1.63 m/s" in note
    # 2026-10-18 照官方两个脚本用 SMPL 重算：拟合形状与重定向的读数在分镜、旁白、笔记里一致
    for s_js, s_say, s_note in (("−42.5", "负 42.5", "−42.5"), ("66 mm", "66 毫米", "66.3 mm")):
        assert s_js in js and s_say in narration and s_note in note, s_js
    assert "114.7 → 43.9 mm" in note and "1.107" in note and "替身" not in js + note

    # 旁白：数字列举用顿号，两个数之间不只隔一个逗号；片头接上一期（MaskedMimic）的片尾预告，片尾只预告下一篇（ExBody2）
    spoken = re.findall(r'"([^"]*)"\),', narration[narration.index("SCRIPT = [") : narration.index("DISPLAY = [")])
    assert len(spoken) == 86 and not any(re.search(r"\d\s*[，,]\s*\d", t) for t in spoken)
    assert narration.count("上一期结尾预告") == 1 and "搬到真实的人形机器人上" in narration
    assert "下一篇讲 ExBody 2" in narration and "ExBody2" in intro
    # 2026-10-17 全局核对：推测与理解要标出来，README 的「up to 4 days」是「最多」
    for s in ("我们推测，是因为真机只测了站立动作", "最多要处理 4 天", "代码注释的解释", "只有根部速度这一轴", "表 4 里，只算在跟的点"):
        assert s in narration, s
    assert "三类掩码" not in js + narration + note and "约 4 天" not in js + narration + note
    for bad in ("差得", "当老师", "几乎", "一行", "重训"):
        assert not any(bad in t for t in spoken), bad
    assert "## 🎬 十六幕动画" in note and 'demos: ["hover"]' in note
    # 面板到 cue 之后才淡出
    assert "return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));" in js and "1 - seg(t, b - 0.3, b)" not in js
    # 视频文案的占位符都已填上
    assert "__VIDEO_" not in js and "__VIDEO_" not in note and "__WALK_DATA__" not in js


def test_hover_assets_and_project_page_clips():
    """HOVER：论文图 1–5 的裁剪、H1 走路与第 5 幕两张 SMPL 人体的贴图、项目页的 8 段片段（仿真 3 段、真机 5 段，按幕懒加载）。"""
    js = (DEMO_JS_DIR / "hover.js").read_text(encoding="utf-8")
    base = ROOT / "assets/img/papers/hover"
    figs = {p.name for p in base.glob("*.webp")}
    used = set(re.findall(r"'(fig\d_\w+\.webp)'", js))
    assert used and used <= figs, ("缺图", used - figs)
    assert figs - used <= {"fig6_switch.webp"}
    sheet = json.loads(re.search(r"var SHEET = (\{[^}]*\});", js).group(1).replace("file:", '"file":').replace(" R:", ' "R":')
                       .replace(" yaw:", ' "yaw":').replace(" pitch:", ' "pitch":').replace(" cw:", ' "cw":').replace(" ch:", ' "ch":')
                       .replace(" cols:", ' "cols":').replace(" n:", ' "n":').replace(" ax:", ' "ax":').replace(" ay:", ' "ay":').replace("'", '"'))
    sprite = base / "h1_3d" / sheet["file"]
    assert sprite.is_file() and _webp_size(sprite) == (sheet["cw"] * sheet["cols"], sheet["ch"] * math.ceil(sheet["n"] / sheet["cols"]))
    assert "H1_3D_BASE = IMG_BASE ? IMG_BASE + 'hover/h1_3d/'" in js
    smpl = re.search(r"var SMPL_SHEET = \{ beta0: '(\w+\.webp)', fit: '(\w+\.webp)', R: 220, yaw: 1\.1, pitch: 0\.1, cw: (\d+), ch: (\d+), cols: 12, n: 40, ax: \d+, ay: \d+ \};", js)
    for name in smpl.group(1, 2):
        assert _webp_size(base / "h1_3d" / name) == (int(smpl.group(3)) * 12, int(smpl.group(4)) * 4), name
    assert {p.name for p in (base / "h1_3d").iterdir()} == {sheet["file"], *smpl.group(1, 2)}
    assert sum(p.stat().st_size for p in (base / "h1_3d").iterdir()) < 1.5e6
    clip_dir = base / "clips"
    used_clips = set(re.findall(r"projClip\(\w+, '(\w+)'", js))
    assert used_clips == {"group", "sim_modes", "sim_hands", "sw_pitch", "sw_walk", "sw_turn", "vr_two", "vr_left"}
    assert {p.name for p in clip_dir.iterdir()} == {f"{u}.{ext}" for u in used_clips for ext in ("mp4", "webp")}
    assert sum(p.stat().st_size for p in clip_dir.iterdir()) < 2.5e6
    assert set(re.findall(r"(\w+): [\d.]+", js[js.index("var CLIP_DUR = {") : js.index("};", js.index("var CLIP_DUR = {"))])) == used_clips
    assert "var SWITCH_AT = { sw_walk: 8.4, sw_turn: 4.8, sw_pitch: 4.2 };" in js
    assert js.count("项目页视频") >= 7
    note = HOVER_NOTE.read_text(encoding="utf-8")
    assert "剪自[项目页](https://hover-versatile-humanoid.github.io/)的视频" in note


def _mm_clip(js: str):
    """解码 maskedmimic.js 的 `CLIP`：每帧 76 个 int16——24 个刚体的世界位置（毫米）+ 骨盆四元数 xyzw（× 10⁴）。"""
    m = re.search(r"var CLIP = \{ fps: (\d+), n: (\d+), t0: ([\d.]+), per: (\d+), data: '([^']+)' \};", js)
    fps, n, t0, per = int(m.group(1)), int(m.group(2)), float(m.group(3)), int(m.group(4))
    a = _h2o_int16(m.group(5))
    assert len(a) == per * n and per == 76
    frames = []
    for k in range(n):
        o = k * per
        x, y, z, w = (a[o + 72 + q] / 1e4 for q in range(4))
        nq = math.sqrt(x * x + y * y + z * z + w * w)
        x, y, z, w = x / nq, y / nq, z / nq, w / nq
        yaw = math.atan2(2 * (x * y + w * z), 1 - 2 * (y * y + z * z))
        frames.append({"b": _h2o_pts(a, o, 24), "yaw": yaw})
    return fps, t0, frames


def test_maskedmimic_explainer_demos_and_worked_example_share_the_paper_numbers():
    """MaskedMimic：十八幕动画、三个演示、配音旁白与笔记「🚶 具体实例」用同一组数。

    表 1–6、附录 B 照抄 arXiv 2409.14393 v1；KL 调度的 epoch 取自 NVlabs/ProtoMotions 的 v2.3 标签；角色的动作是 ProtoMotions 自带的
    官方样例 smpl_humanoid_sit_armchair.motion（SAMP 的坐扶手椅），嵌在 maskedmimic.js 里，这里解码后把第 4.00 s 头 1 s 后目标的
    12 维、转向的骨盆目标、跨进椅子 2 m 的时刻与包围盒在角色坐标系里的 8 个角再算一遍。
    """
    js = (DEMO_JS_DIR / "maskedmimic.js").read_text(encoding="utf-8")
    note = MASKEDMIMIC_NOTE.read_text(encoding="utf-8")
    narration = (ROOT / "scripts" / "paper_video" / "papers" / "maskedmimic.py").read_text(encoding="utf-8")
    intro = (ROOT / "scripts" / "paper_video" / "papers" / "maskedmimic.js").read_text(encoding="utf-8")

    for line in (
        "{ key: 'fc', zh: '老师 FC', v: [99.96, 30.4, 99.9, 31.3] },",
        "{ key: 'mm', zh: 'MaskedMimic', v: [99.4, 32.9, 99.2, 35.1] },",
        "{ key: 'pulse', zh: 'PULSE', v: [99.5, 57.8, 93.4, 88.6] },",
        "{ key: 'calm', zh: 'CALM', v: [16.6, 130.7, 10.1, 122.4] }",
        "{ key: 'pelvis', zh: '只给骨盆', v: [98.4, 31.4, 98.4, 33.4] },",
        "{ key: 'feet', zh: '只给双脚', v: [92.7, 88, 91.8, 94.3] }",
        "{ key: 'mmTest', zh: 'MaskedMimic · 测试集', full: [95.4, 62.9], vr: [93.6, 69.4] }",
        "{ key: 'steer', zh: '转向', unit: 'cm/s', flat: [97.8, 8.4], terrain: [93.8, 8.4] },",
        "{ key: 'nores', zh: '先验不用残差', v: [21.1, 57.4] },",
        "{ key: 'nomask', zh: '不用结构化掩码', v: [0, 274.4] }",
        "var MASK = { K: 11, near: 10, repeat: 0.98, gap: 0.01, gapMin: 1, gapMax: 9, gapLong: 4, hideObj: 0.2, hideText: 0.8, farPose: 0.2 };",
        "var KL = { a0: 1e-4, a1: 1e-2, e0: 3000, e1: 6000 };",
        "var HIST = { window: 40, every: 8, n: 5 };",
        "var KL_EX = { muE: 0.3, sigE: 0.5, sigP: 1.0 };",
        "var EX_K = 30, EX_DT = 15;",
        "var SWITCH = { k: 63, t: 6.20, dist: 1.985, prev: 2.03, yawDeg: 77.3 };",
        "var CHAIR = { x: 0, y: 0.9, hx: 0.26, hy: 0.267, h: 0.808 };",
    ):
        assert line in js, line
    for k in ("'mm-explainer'", "'mm-video'", "'mm-masks'", "'mm-sampler'", "'mm-tables'", "K.video(host"):
        assert k in js, k

    # 例 4：残差先验的 KL（一维）；例 5：KL 系数第 4500 个 epoch
    kl = 0.5 * (math.log(1 / 0.25) + 0.25 + 0.09 - 1)
    assert _fmt(kl, 3) == "0.363" and _fmt(64 * kl, 1) == "23.2" and _fmt(0.5 * (math.log(4) + 0.25 + 1 - 1), 3) == "0.818"
    assert "**0.363**" in note and "0.363" in narration and "0.00505" in js and "**0.00505**" in note
    assert _fmt(1e-4 + 0.5 * (1e-2 - 1e-4), 5) == "0.00505" and _fmt(1e-4 + 0.25 * (1e-2 - 1e-4), 6) == "0.002575"
    # 例 6：结构化掩码的玩具统计（附录 B.2 的伪代码）
    en = 0.9 * (0.1 * 1 + 0.2 * 2 + 0.2 * 3 + 0.2 * 4 + 0.2 * 5 + 0.1 * 6) + 0.1 * (0.25 * 1 + 0.5 * 2 + 0.25 * 3)
    pp = en / 6 * 2 / 3
    assert _fmt(en, 2) == "3.35" and _fmt(pp, 3) == "0.372" and _fmt(1 - (1 - pp) ** 10, 3) == "0.990" and _fmt(6 * (1 - (1 - pp) ** 10), 2) == "5.94"
    assert "**0.372**" in note and "**0.990**" in note and "**5.94**" in note and "5.94 个" in narration
    # 例 7：历史窗口；例 8：奖励；训练量
    assert [_fmt(8 * i / 30, 2) for i in range(1, 6)] == ["0.27", "0.53", "0.80", "1.07", "1.33"]
    assert _fmt(math.exp(-100 * 0.1**2 / 3), 2) == "0.72" and _fmt(math.exp(-100 * 0.05**2), 2) == "0.78"
    assert _fmt(0.5 * math.exp(-100 * 0.01 / 3) + 0.7, 3) == "1.058" and "1.058" in note
    assert _fmt(3e10 / 30 / (365.25 * 86400), 1) == "31.7" and "31.7 年" in js
    # 例 9：维数与 token 数
    assert 8 * 3 + 6 + 1 == 31 and 2 + 5 + 1 + 1 + 11 == 20 and 2 + 5 + 1 == 8 and 2 + 5 + 11 == 18
    # 例 10：读表
    assert _fmt(100 * (1 - 0.1 / 0.8), 1) == "87.5" and _fmt(100 * (1 - 0.3 / 0.8), 1) == "62.5" and _fmt(6.6 / 1.9, 1) == "3.5"
    assert [_fmt(96.9 - v, 1) for v in (94.9, 93.2, 21.1, 0)] == ["2.0", "3.7", "75.8", "96.9"]

    # 复现：从嵌入的官方样例再算一遍
    fps, t0, clip = _mm_clip(js)
    assert fps == 15 and t0 == 2.0 and len(clip) == 180

    def local(k, v):
        c, s_ = math.cos(clip[k]["yaw"]), math.sin(clip[k]["yaw"])
        return [c * v[0] + s_ * v[1], -s_ * v[0] + c * v[1], v[2]]

    def sub(p, q):
        return [a - b for a, b in zip(p, q, strict=True)]

    # 例 1：第 4.00 s（第 30 帧），头 1 s 后（第 45 帧）的目标
    k, dt = 30, 15
    assert t0 + k / fps == 4.0
    head, root, tgt = clip[k]["b"][13], clip[k]["b"][0], clip[k + dt]["b"][13]
    rel_j, rel_r = local(k, sub(tgt, head)), local(k, sub(tgt, root))
    assert [_fmt(v, 3) for v in tgt] == ["0.194", "-1.452", "1.506"]
    assert [_fmt(v, 3) for v in rel_j] == ["0.744", "0.092", "0.007"] and [_fmt(v, 3) for v in rel_r] == ["0.822", "0.132", "0.569"]
    assert _fmt(math.degrees(clip[k]["yaw"]), 1) == "2.3"
    for s_ in ("$(0.744, 0.092, 0.007)$", "$(0.822, 0.132, 0.569)$", "$(0.194, -1.452, 1.506)$", "$[0.744, 0.092, 0.007, 0, 0, 0,\\ 0.822, 0.132, 0.569, 0, 0, 0]$"):
        assert s_ in note, s_
    assert "向前 0.744 米" in narration
    # 例 2：转向的骨盆目标
    v = [(clip[k + 1]["b"][0][q] - clip[k - 1]["b"][0][q]) * fps / 2 for q in range(2)]
    assert [_fmt(x, 3) for x in v] == ["0.803", "-0.007"]
    assert [_fmt(root[0] + v[0], 3), _fmt(root[1] + v[1], 3)] == ["0.181", "-1.624"] and "[0.181, -1.624, 0.9]" in note
    # 例 3：第一次进入椅子 2 m 以内的帧，与这时包围盒的 8 个角
    dist = [math.hypot(f["b"][0][0], f["b"][0][1] - 0.9) for f in clip]
    sw = next(i for i, d in enumerate(dist) if d < 2.0)
    assert sw == 63 and _fmt(t0 + sw / fps, 2) == "6.20" and _fmt(dist[sw], 3) == "1.985" and _fmt(dist[sw - 1], 2) == "2.03"
    assert _fmt(math.degrees(clip[sw]["yaw"]), 1) == "77.3" and "6.2 秒" in narration
    p0 = clip[sw]["b"][0]
    corners = [[x, 0.9 + y] for y in (-0.267, 0.267) for x in (-0.26, 0.26)]
    got = [[_fmt(c, 3) for c in local(sw, [cx - p0[0], cy - p0[1], 0])[:2]] for cx, cy in corners]
    assert got == [["1.254", "1.408"], ["1.368", "0.901"], ["1.775", "1.525"], ["1.889", "1.018"]]
    for a, b in got:
        assert f"$({a}, {b})$" in note
    # 第 12.00 s 坐稳：骨盆离地 0.564 m
    assert _fmt(clip[150]["b"][0][2], 3) == "0.564"

    # 旁白：数字列举用顿号，两个数之间不只隔一个逗号（「66 加 72，138 维」的教训）
    spoken = re.findall(r'"([^"]*)"\),', narration[narration.index("SCRIPT = [") : narration.index("DISPLAY = [")])
    assert len(spoken) == 99 and not any(re.search(r"\d\s*[，,]\s*\d", t) for t in spoken)
    # 片头接上一期（OmniH2O）的片尾预告，片尾只预告下一篇（HOVER）
    assert narration.count("上一期结尾预告") == 1 and "下一篇讲 HOVER" in narration and "HOVER" in intro
    assert "## 🎬 十八幕动画" in note and 'demos: ["maskedmimic"]' in note
    # 面板到 cue 之后才淡出
    assert "return seg(t, a + 0.3, a + 0.7) * (b == null ? 1 : 1 - seg(t, b, b + 0.3));" in js
    assert "1 - seg(t, b - 0.3, b)" not in js
    # 视频文案的占位符都已填上
    assert "__VIDEO_" not in js and "__VIDEO_" not in note
    # 字幕和分镜里的公式都交给 KaTeX：DISPLAY 不再输出 e^(…)、上标数字，分镜文字里的希腊字母都在 $…$ 里
    import runpy

    display_out = [b for a, b in runpy.run_path(str(ROOT / "scripts" / "paper_video" / "papers" / "maskedmimic.py"))["DISPLAY"]]
    assert not [d for d in display_out if re.search(r"e\^\(|[²³⁻÷αεμρτ]", d)]
    code = re.sub(r"//[^\n]*", "", re.sub(r"/\*.*?\*/", "", js, flags=re.S))
    plain = [x for x in re.findall(r"'((?:[^'\\]|\\.)*)'", code) if re.search(r"[αεμρτ²⁻÷]", x) and "$" not in x]
    assert plain == [], plain


def test_maskedmimic_3d_sprite_sheets_match_their_metadata():
    """MaskedMimic：SMPL 角色的 3D 逐帧贴图与扶手椅（几何照抄 smpl_humanoid.xml 与官方 armchair.obj）。格子对不上图，裁出来就是半个人。"""
    js = (DEMO_JS_DIR / "maskedmimic.js").read_text(encoding="utf-8")
    sheets = json.loads(re.search(r"var SHEETS = (\{.*?\});\n", js).group(1))
    _, _, clip = _mm_clip(js)
    sprite_dir = ROOT / "assets/img/papers/maskedmimic/smpl_3d"
    assert set(sheets) == {"sit", "chair"}
    total = 0
    for sid, s in sheets.items():
        path = sprite_dir / s["file"]
        assert path.is_file(), s["file"]
        total += path.stat().st_size
        rows = math.ceil(s["n"] / s["cols"])
        assert _webp_size(path) == (s["cw"] * s["cols"], s["ch"] * rows), sid
        assert 0 < s["ax"] < s["cw"] and 0 < s["ay"] <= s["ch"] and (s["yaw"], s["pitch"]) == (-0.4, 0.15), sid
    assert sheets["sit"]["n"] == len(clip) and sheets["chair"]["n"] == 1
    assert {p.name for p in sprite_dir.iterdir()} == {s["file"] for s in sheets.values()}
    assert total < 1.2e6, "贴图按幕懒加载，但总量也别失控"
    figs = {p.name for p in (ROOT / "assets/img/papers/maskedmimic").glob("*.webp")}
    used = set(re.findall(r"'(fig\w+\.webp)'", js))
    assert used and used == figs, ("没用到的图别留在仓库里", figs - used, "缺图", used - figs)


def _mp4_seconds(path):
    """mp4 的时长（秒，带小数）：读 moov/mvhd 的 timescale 与 duration（version 0 / 1 都认）。"""
    import struct

    data = path.read_bytes()
    i = data.find(b"mvhd")
    version = data[i + 4]
    if version == 1:
        timescale, duration = struct.unpack(">IQ", data[i + 24 : i + 36])
    else:
        timescale, duration = struct.unpack(">II", data[i + 16 : i + 24])
    return duration / timescale


def test_maskedmimic_project_page_clips():
    """MaskedMimic：第 1、8、14–18 幕的仿真画面剪自项目页的视频（13 段，按幕懒加载）。

    原先四个例子拼成 2 × 2，手机上人太小（2026-10-17 看片反馈），现在一次只放一个：seqClip 的 parts 时长加起来要等于片段时长，
    否则下面的小条和名称会和画面错开。
    """
    js = (DEMO_JS_DIR / "maskedmimic.js").read_text(encoding="utf-8")
    clip_dir = ROOT / "assets/img/papers/maskedmimic/clips"
    used = set(re.findall(r"(?:projClip|seqClip)\(\w+, '(\w+)'", js))
    assert used == {"castle", "prior", "sofa", "tracking", "vr", "terrain", "tasks", "task_path", "task_steer", "task_reach", "objects", "text", "bloopers"}
    for cid, parts in re.findall(r"seqClip\(\w+, '(\w+)',[^\[]*?(\[\[.*?\]\])", js, flags=re.S):
        total = sum(float(x) for x in re.findall(r"\[\s*([0-9.]+),", parts))
        assert abs(total - _mp4_seconds(clip_dir / f"{cid}.mp4")) < 0.02, (cid, total)
    assert {p.name for p in clip_dir.iterdir()} == {f"{u}.{ext}" for u in used for ext in ("mp4", "webp")}
    assert sum(p.stat().st_size for p in clip_dir.iterdir()) < 3.2e6, "片段只在播到那一幕时才下载，但总量也别失控"
    assert js.count("项目页视频") >= 8 and "仿真结果剪自项目页的视频" in js
    note = MASKEDMIMIC_NOTE.read_text(encoding="utf-8")
    assert "仿真画面剪自[项目页](https://research.nvidia.com/labs/par/maskedmimic/)的视频" in note
