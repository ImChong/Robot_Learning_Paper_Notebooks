# 视频号合集发布清单：从头学人形机器人算法

[推荐学习路线图](../../README.md#学习路线图)里的 40 篇论文，按视频号发布顺序排好。已经发布的打勾；每发一集，把那一行的 `[ ]` 改成 `[x]`。截至 2026-10-03 已发布 001–009。

- 🎬 `<paper>`：仓库里已有渲染好的配音视频，`<paper>` 就是本目录 `node render.mjs <paper>` 用的名字（见 [README](README.md)）
- 🆕：还没有视频，要新做
- 每行破折号后是排序依据：`A→B` 指首页路线图里的连线，其余是笔记里的说法；标〔取舍〕的是排序判断，路线图原文没这么写
- 已发视频的标题格式：「从头学人形机器人算法系列 (0NN)：<论文英文标题>」，英文标题与 `_data/papers.json` 的 `title` 一致

## 第一季 · 仿真里的模仿与技能（已完结）

01 模块「按推荐阅读路线顺序排列」的前 9 篇。

- [x] 001 [PPO](../../papers/01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.md)（2017）🎬 `ppo`
- [x] 002 [AWR](../../papers/01_Foundational_RL/AWR_Advantage_Weighted_Regression/AWR_Advantage_Weighted_Regression.md)（2019）🎬 `awr`
- [x] 003 [DeepMimic](../../papers/01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.md)（2018）🎬 `deepmimic`
- [x] 004 [AMP](../../papers/01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.md)（2021）🎬 `amp`
- [x] 005 [PHC](../../papers/01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.md)（2023）🎬 `phc`
- [x] 006 [ADD](../../papers/01_Foundational_RL/ADD_Adversarial_Differential_Discriminators/ADD_Adversarial_Differential_Discriminators.md)（2025）🎬 `add`
- [x] 007 [ASE](../../papers/01_Foundational_RL/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control.md)（2022）🎬 `ase`
- [x] 008 [CALM](../../papers/01_Foundational_RL/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.md)（2023）🎬 `calm`
- [x] 009 [PULSE](../../papers/01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.md)（2023）🎬 `pulse`

## 第二季 · 走出仿真：生成式策略、Sim-to-Real 与动作数据

- [ ] 010 [Diffusion Policy](../../papers/01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.md)（2023）🎬 `diffusion_policy` — PULSE→DP；01 模块里紧接 PULSE 的就是它
- [ ] 011 [Domain Randomization](../../papers/01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.md)（2017）🆕 — DR→OP3 足球、DR→LCP；〔取舍〕放在 BeyondMimic 前面，因为 BeyondMimic 是本系列第一篇人形真机，先把 sim-to-real 讲了
- [ ] 012 [OP3 足球](../../papers/03_High_Impact_Selection/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.md)（2023）🎬 `op3soccer` — DR→OP3 足球
- [ ] 013 [LCP](../../papers/01_Foundational_RL/LCP_Sim-to-Real_Action_Smoothing/LCP_Sim-to-Real_Action_Smoothing.md)（2024）🎬 `lcp` — DR→LCP
- [ ] 014 [BeyondMimic](../../papers/01_Foundational_RL/BeyondMimic/BeyondMimic.md)（2025）🎬 `beyondmimic` — DP→BeyondMimic；笔记把 CALM / PULSE 和 Diffusion Policy 列为它要补足的两类前作
- [ ] 015 [AMASS / HumanML3D](../../papers/14_Human_Motion/HumanML3D/HumanML3D.md)（2019 / 2022）🆕 可选 — AMASS / HumanML3D→GMR
- [ ] 016 [GMR](../../papers/02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.md)（2025）🎬 `gmr` — GMR 论文用 BeyondMimic 作中性训练框架做对比，所以排在它后面
- [ ] 017 [OmniRetarget](../../papers/02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.md)（2025）🎬 `omniretarget` — GMR→OmniRetarget

## 第三季 · 全身控制与遥操作

- [ ] 018 [Expressive WBC](../../papers/03_High_Impact_Selection/Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.md)（2024）🆕 — PULSE→EWBC、BeyondMimic→EWBC
- [ ] 019 [HOVER](../../papers/03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.md)（2024）🆕 — EWBC→HOVER
- [ ] 020 [ExBody2](../../papers/03_High_Impact_Selection/ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.md)（2024）🆕 — EWBC→ExBody2
- [ ] 021 [HugWBC](../../papers/03_High_Impact_Selection/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.md)（2025）🆕 — EWBC→HugWBC；018–021 组内按年份排
- [ ] 022 [HOMIE](../../papers/03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.md)（2025）🆕 — HOVER / HugWBC→HOMIE；〔取舍〕路线图还有 SONIC→HOMIE，但 HOMIE 比 SONIC 早，笔记只在延伸阅读表里提到 SONIC
- [ ] 023 [iDP3](../../papers/03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.md)（2024）🆕 — BeyondMimic→iDP3
- [ ] 024 [EgoMimic](../../papers/06_Manipulation/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.md)（2024）🆕 — iDP3→EgoMimic

## 第四季 · 基础模型：VLA + BFM

- [ ] 025 [Transformer](../../papers/01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.md)（2017）🎬 `transformer` — 仓库 README 写明「读 VLA 之前先读它」；Diffusion Policy 视频只在第 4 幕顺带提到 Transformer 骨干，不用提前看
- [ ] 026 [π₀](../../papers/03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.md)（2024）🎬 `pi0` — DP→π₀、Transformer→π₀
- [ ] 027 [π₀.₅](../../papers/03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.md)（2025）🎬 `pi05` — π₀→π₀.₅
- [ ] 028 [Cosmos](../../papers/03_High_Impact_Selection/Cosmos_World_Foundation_Model_Platform_for_Physical_AI/Cosmos_World_Foundation_Model_Platform_for_Physical_AI.md)（2025）🎬 `cosmos` — BeyondMimic→Cosmos；〔取舍〕GR00T N1 数据金字塔的中层用视频生成模型造「神经轨迹」，所以先讲世界模型
- [ ] 029 [GR00T N1](../../papers/03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.md)（2025）🎬 `groot` — π₀→GR00T N1
- [ ] 030 [BFM](../../papers/03_High_Impact_Selection/Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.md)（2025）🆕 — 路线图第 ⑨ 层；笔记建议对照 HOVER 读
- [ ] 031 [SONIC](../../papers/03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md)（2025）🎬 `sonic` — 〔取舍〕路线图把它放在第 ④ 层 WBC；但它用 GR00T N1.5 当 System-2，还和 BeyondMimic 做对比，放在 GR00T 后面讲就不用提前提到没讲过的模型

## 第五季 · 2026 前沿（开放，一直往后加）

〔取舍〕路线图里第 ⑤–⑧ 层支线的箭头指向第 ⑨ 层（表示汇聚），但这几篇 2026 年的论文都在和 π₀ / GR00T N1 对比，所以整体放在第四季之后。

- [ ] 032 [NMR](../../papers/02_Motion_Retargeting/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control.md)（2026）🆕 — GMR→NMR
- [ ] 033 [ReActor](../../papers/02_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.md)（2026）🆕 — GMR→ReActor
- [ ] 034 [ULTRA](../../papers/04_Loco-Manipulation_and_WBC/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation.md)（2026）🆕 — HOMIE→ULTRA
- [ ] 035 [HumDex](../../papers/06_Manipulation/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.md)（2026）🆕 — EgoMimic→HumDex；笔记说 HumDex 是 Ψ₀ 的上游数据采集系统
- [ ] 036 [Ψ₀](../../papers/04_Loco-Manipulation_and_WBC/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation.md)（2026）🆕 — ULTRA→Ψ₀；笔记拿它和 GR00T N1、π₀ 对比
- [ ] 037 [HAIC](../../papers/04_Loco-Manipulation_and_WBC/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model.md)（2026）🆕 — ULTRA→HAIC
- [ ] 038 [DreamDojo](../../papers/06_Manipulation/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.md)（2026）🆕 — Cosmos→DreamDojo、HumDex→DreamDojo
- [ ] 039 [1X 世界模型](../../papers/11_Simulation_Benchmark/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report.md)（2025）🆕 — DreamDojo→1X 世界模型
- [ ] 040 [DreamZero](../../papers/06_Manipulation/DreamZero_World_Action_Models_are_Zero-shot_Policies/DreamZero_World_Action_Models_are_Zero-shot_Policies.md)（2026）🆕 — DreamDojo / 1X 世界模型→DreamZero；笔记标注它是「世界模型支线终点」

041 起：新论文追加在这里，规则见下一节。

## 扩展规则

- 第二到第四季是固定的经典主线，第五季开放。以后的新论文一律追加到末尾，标题加支线标签（如【重定向】【WBC】【VLA】【世界模型】），片头说明前置要看哪几集。这样已发视频不用改编号。
- 第一批可以直接用的扩展：下面几篇已有讲解动画、还没做视频，也不在路线图里——[UMR](../../papers/02_Motion_Retargeting/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence.md)、[Perceptive BFM](../../papers/03_High_Impact_Selection/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.md)、[GentleHumanoid](../../papers/04_Loco-Manipulation_and_WBC/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.md)、[Perceptive Humanoid Parkour](../../papers/04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.md)。
- 视频号合集里的视频能不能调整顺序没有核实到，所以这套规则不依赖调序。
- 新做完一集视频：把 🆕 改成 🎬，写上 `<paper>` 名，与 [README](README.md) 的表格一致。

## 可选变体：先连发现成视频

第三季 7 篇都要新做。想先把现成视频连着发，可以把 025–029（Transformer 到 GR00T N1，都有成片）提到第三季前面：它们只依赖 Diffusion Policy 和 Transformer（DP→π₀），不依赖 WBC。BFM 和 SONIC 仍放在第三季之后。
