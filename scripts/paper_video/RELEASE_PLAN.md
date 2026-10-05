# 视频号合集发布清单：从头学人形机器人算法

[推荐学习路线图](../../README.md#学习路线图)里的 57 篇论文，按视频号发布顺序排好。已经发布的打勾；每发一集，把那一行的 `[ ]` 改成 `[x]`。截至 2026-10-05 已发布 001–013。

2026-10-04 对照公众号「具身智能研究室」国庆系列《具身智能从入门到精通》day1–3 的「经典脉络」补入 6 篇：Real-World Humanoid Locomotion（day2「换到人形身体」）、H2O 与 MaskedMimic（day3「参考进入闭环」「稀疏输入由谁补全」）、TWIST / TWIST2（day3 遥操作线）、BFM-Zero（day2「让技能可以调用」）。只插在未发布的 011 之后，已发的 001–010 编号不变。

2026-10-05 又对照 day4「移动操作」的「经典脉络」补入 5 篇：FALCON、CHIP（「让接触进入反馈」）与 HDMI、VIRAL、DoorMan（「让物体进入任务」），插在第三季 031 TWIST2 之后；同一部分点名的 ULC、SoFTA、SkillBlender 和拓展阅读里的 SteadyTray 列为第三批候选（见「扩展规则」）。已发的 001–012 编号不变。

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

- [x] 010 [Diffusion Policy](../../papers/01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.md)（2023）🎬 `diffusion_policy` — PULSE→DP；01 模块里紧接 PULSE 的就是它
- [x] 011 [SMP](../../papers/01_Foundational_RL/SMP_Reusable_Score-Matching_Motion_Priors/SMP_Reusable_Score-Matching_Motion_Priors.md)（2025）🎬 `smp` — AMP→SMP、DP⇢SMP；MimicKit 里的算法。〔取舍〕紧跟 Diffusion Policy：它把 AMP 的对抗判别器换成预训练扩散模型的分数，得先懂扩散
- [x] 012 [Domain Randomization](../../papers/01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.md)（2017）🎬 `domain_randomization` — DR→OP3 足球、DR→LCP；〔取舍〕放在 BeyondMimic 前面，因为 BeyondMimic 是本系列第一篇人形真机，先把 sim-to-real 讲了
- [x] 013 [四足地形 · 教师-学生](../../papers/03_High_Impact_Selection/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.md)（2020）🎬 `quadterrain` — DR→四足地形；笔记写明它「适合作为人形学习先修论文」，HOVER、ExBody2、BFM 等 WBC 笔记用到的特权教师 → 学生蒸馏从这里来
- [ ] 014 [Real-World Humanoid Locomotion](../../papers/03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.md)（2023）🎬 `realhumanoid` — 四足地形→真实世界人形行走；从四足的教师-学生换到全尺寸人形 Digit，因果 Transformer 读观测—动作历史直接出关节目标。〔取舍〕按年份排在 OP3 足球（2023-04）前：先看全尺寸人形怎么走稳，再看小人形踢球
- [ ] 015 [OP3 足球](../../papers/03_High_Impact_Selection/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.md)（2023）🎬 `op3soccer` — DR→OP3 足球
- [ ] 016 [LCP](../../papers/01_Foundational_RL/LCP_Sim-to-Real_Action_Smoothing/LCP_Sim-to-Real_Action_Smoothing.md)（2024）🎬 `lcp` — DR→LCP
- [ ] 017 [ASAP](../../papers/03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.md)（2025）🆕 — LCP→ASAP、ASAP⇢BeyondMimic；BeyondMimic 笔记拿它当「单动作专用，每条动作要单独调 DR / 奖励」的对照
- [ ] 018 [BeyondMimic](../../papers/01_Foundational_RL/BeyondMimic/BeyondMimic.md)（2025）🎬 `beyondmimic` — DP→BeyondMimic；笔记把 CALM / PULSE 和 Diffusion Policy 列为它要补足的两类前作
- [ ] 019 [AMASS / HumanML3D](../../papers/14_Human_Motion/HumanML3D/HumanML3D.md)（2019 / 2022）🎬 `humanml3d` 可选 — AMASS / HumanML3D→GMR；视频讲的是 HumanML3D
- [ ] 020 [GMR](../../papers/02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.md)（2025）🎬 `gmr` — GMR 论文用 BeyondMimic 作中性训练框架做对比，所以排在它后面
- [ ] 021 [OmniRetarget](../../papers/02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.md)（2025）🎬 `omniretarget` — GMR→OmniRetarget

## 第三季 · 全身控制、遥操作与移动操作

- [ ] 022 [Expressive WBC](../../papers/03_High_Impact_Selection/Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.md)（2024）🆕 — PULSE→EWBC、BeyondMimic→EWBC
- [ ] 023 [H2O](../../papers/03_High_Impact_Selection/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.md)（2024）🆕 — H2O→OmniH2O、H2O→TWIST；下一行 OmniH2O 写的「HOVER 统一 ExBody / H2O / OmniH2O 的命令空间」里，H2O 之前一直没进清单。〔取舍〕和 Expressive WBC（2024-02）同期，按年份排在它后面
- [ ] 024 [OmniH2O](../../papers/03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.md)（2024）🆕 — OmniH2O→HOVER；HOVER 统一的就是 ExBody / H2O / OmniH2O / HumanPlus 各自的命令空间
- [ ] 025 [MaskedMimic](../../papers/03_High_Impact_Selection/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.md)（2024）🆕 — MaskedMimic→HOVER；仿真角色上「随机遮掉部分目标」的统一控制，HOVER 的 mode mask + sparsity mask 把同一个问题搬到人形。〔取舍〕夹在 OmniH2O（固定头手三点）和 HOVER 之间，正好对照「固定接口」与「任意掩码」
- [ ] 026 [HOVER](../../papers/03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.md)（2024）🆕 — EWBC→HOVER
- [ ] 027 [ExBody2](../../papers/03_High_Impact_Selection/ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.md)（2024）🆕 — EWBC→ExBody2
- [ ] 028 [HugWBC](../../papers/03_High_Impact_Selection/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.md)（2025）🆕 — EWBC→HugWBC；022、026–028 组内按年份排
- [ ] 029 [HOMIE](../../papers/03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.md)（2025）🆕 — HOVER / HugWBC→HOMIE；〔取舍〕路线图还有 SONIC→HOMIE，但 HOMIE 比 SONIC 早，笔记只在延伸阅读表里提到 SONIC
- [ ] 030 [TWIST](../../papers/07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.md)（2025）🆕 — H2O→TWIST；光学动捕重定向成参考，教师看未来动作、学生只用当前目标和本体历史。〔取舍〕按年份接在 HOMIE（2025-02）后面
- [ ] 031 [TWIST2](../../papers/07_Teleoperation/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.md)（2025）🆕 — TWIST→TWIST2；把动捕场地换成 PICO 头显 + 腿部追踪器，边遥操作边录示范
- [ ] 032 [FALCON](../../papers/04_Loco-Manipulation_and_WBC/FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation/FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation.md)（2025）🆕 — HOMIE⇢FALCON；FALCON 把 HOMIE 这类「下身 RL + 上身 IK」当基线，指出上身缺力补偿，改成上下身双智能体共享观测，再加按力矩上限算的 3D 外力课程。〔取舍〕按年份比 TWIST2 早（2025-05），但 TWIST / TWIST2 连着讲，移动操作这一组从这里开始
- [ ] 033 [HDMI](../../papers/04_Loco-Manipulation_and_WBC/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos.md)（2025）🆕 — DeepMimic⇢HDMI；DeepMimic 式跟踪，但把物体位姿和期望接触点也写进目标，从人类视频学开门、搬箱
- [ ] 034 [VIRAL](../../papers/04_Loco-Manipulation_and_WBC/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation.md)（2025）🆕 笔记是 2026-06 的速读版 — HOMIE→VIRAL；特权教师蒸馏成纯 RGB 学生，动作输出是 HOMIE 全身控制器的命令
- [ ] 035 [DoorMan](../../papers/04_Loco-Manipulation_and_WBC/Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer/Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer.md)（2025）🆕 笔记是 2026-06 的速读版 — HOMIE→DoorMan；开门拆成接近、抓握、转把手、推拉、穿门，同样以 HOMIE 为低层控制器。〔取舍〕和 VIRAL 是同一批机构的工作，紧跟着讲
- [ ] 036 [CHIP](../../papers/04_Loco-Manipulation_and_WBC/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.md)（2025）🆕 笔记是 2026-06 的速读版 — FALCON⇢CHIP；同样处理末端受力，但目标从「扛住外力」变成「按指定柔顺度让位」
- [ ] 037 [iDP3](../../papers/03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.md)（2024）🆕 — BeyondMimic→iDP3

## 第四季 · 基础模型：VLA + BFM

- [ ] 038 [Transformer](../../papers/01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.md)（2017）🎬 `transformer` — 仓库 README 写明「读 VLA 之前先读它」；Diffusion Policy 视频只在第 4 幕顺带提到 Transformer 骨干，不用提前看
- [ ] 039 [ACT / ALOHA](../../papers/03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.md)（2023）🆕 占位笔记待补充 — Transformer⇢ACT、ACT→EgoMimic、ACT→π₀；π₀ 笔记称它是「动作块的来源工作之一」
- [ ] 040 [EgoMimic](../../papers/06_Manipulation/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.md)（2024）🆕 — ACT→EgoMimic、iDP3→EgoMimic；〔取舍〕EgoMimic 用 ACT 当策略骨干，所以跟着 ACT 放进第四季
- [ ] 041 [OpenVLA](../../papers/03_High_Impact_Selection/OpenVLA_An_Open-Source_Vision-Language-Action_Model/OpenVLA_An_Open-Source_Vision-Language-Action_Model.md)（2024）🆕 占位笔记待补充 — OpenVLA→π₀；π₀ 的出发点就是 OpenVLA 一类「把动作离散成 token 自回归输出」做不了高频动作块
- [ ] 042 [π₀](../../papers/03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.md)（2024）🎬 `pi0` — DP→π₀、Transformer→π₀
- [ ] 043 [π₀.₅](../../papers/03_High_Impact_Selection/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization/Pi05_A_Vision-Language-Action_Model_with_Open-World_Generalization.md)（2025）🎬 `pi05` — π₀→π₀.₅
- [ ] 044 [Cosmos](../../papers/03_High_Impact_Selection/Cosmos_World_Foundation_Model_Platform_for_Physical_AI/Cosmos_World_Foundation_Model_Platform_for_Physical_AI.md)（2025）🎬 `cosmos` — BeyondMimic→Cosmos；〔取舍〕GR00T N1 数据金字塔的中层用视频生成模型造「神经轨迹」，所以先讲世界模型
- [ ] 045 [GR00T N1](../../papers/03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.md)（2025）🎬 `groot` — π₀→GR00T N1
- [ ] 046 [BFM](../../papers/03_High_Impact_Selection/Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.md)（2025）🆕 — 路线图第 ⑨ 层；笔记建议对照 HOVER 读
- [ ] 047 [BFM-Zero](../../papers/04_Loco-Manipulation_and_WBC/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control.md)（2025）🆕 — BFM⇢BFM-Zero、ASE⇢BFM-Zero；无监督 RL（前向—后向表示）预训练，用目标姿态、动作或奖励当提示调用。〔取舍〕和 BFM 同属行为基础模型，紧跟着讲；比 SONIC（2025-11-11）早几天，排在它前面
- [ ] 048 [SONIC](../../papers/03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md)（2025）🎬 `sonic` — 〔取舍〕路线图把它放在第 ④ 层 WBC；但它用 GR00T N1.5 当 System-2，还和 BeyondMimic 做对比，放在 GR00T 后面讲就不用提前提到没讲过的模型

## 第五季 · 2026 前沿（开放，一直往后加）

〔取舍〕路线图里第 ⑤–⑧ 层支线的箭头指向第 ⑨ 层（表示汇聚），但这几篇 2026 年的论文都在和 π₀ / GR00T N1 对比，所以整体放在第四季之后。

- [ ] 049 [NMR](../../papers/02_Motion_Retargeting/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control/Make_Tracking_Easy__Neural_Motion_Retargeting_for_Humanoid_Whole-body_Control.md)（2026）🆕 — GMR→NMR
- [ ] 050 [ReActor](../../papers/02_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.md)（2026）🆕 — GMR→ReActor
- [ ] 051 [ULTRA](../../papers/04_Loco-Manipulation_and_WBC/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation.md)（2026）🆕 — HOMIE→ULTRA
- [ ] 052 [HumDex](../../papers/06_Manipulation/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.md)（2026）🆕 — EgoMimic→HumDex；笔记说 HumDex 是 Ψ₀ 的上游数据采集系统
- [ ] 053 [Ψ₀](../../papers/04_Loco-Manipulation_and_WBC/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation.md)（2026）🆕 — ULTRA→Ψ₀；笔记拿它和 GR00T N1、π₀ 对比
- [ ] 054 [HAIC](../../papers/04_Loco-Manipulation_and_WBC/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model.md)（2026）🆕 — ULTRA→HAIC
- [ ] 055 [DreamDojo](../../papers/06_Manipulation/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.md)（2026）🆕 — Cosmos→DreamDojo、HumDex→DreamDojo
- [ ] 056 [1X 世界模型](../../papers/11_Simulation_Benchmark/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report.md)（2025）🆕 — DreamDojo→1X 世界模型
- [ ] 057 [DreamZero](../../papers/06_Manipulation/DreamZero_World_Action_Models_are_Zero-shot_Policies/DreamZero_World_Action_Models_are_Zero-shot_Policies.md)（2026）🆕 — DreamDojo / 1X 世界模型→DreamZero；笔记标注它是「世界模型支线终点」

058 起：新论文追加在这里，规则见下一节。

## 扩展规则

- 第二到第四季是固定的经典主线，第五季开放。以后的新论文一律追加到末尾，标题加支线标签（如【重定向】【WBC】【VLA】【世界模型】），片头说明前置要看哪几集。这样已发视频不用改编号。
- 第一批可以直接用的扩展：下面几篇已有讲解动画、还没做视频，也不在路线图里——[UMR](../../papers/02_Motion_Retargeting/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence/UMR__Unified_Motion_Retargeting_with_Learned_Point_Cloud_Correspondence.md)、[Perceptive BFM](../../papers/03_High_Impact_Selection/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.md)、[GentleHumanoid](../../papers/04_Loco-Manipulation_and_WBC/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.md)、[Perceptive Humanoid Parkour](../../papers/04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.md)。
- 第二批候选：下面几篇已有笔记、还没有讲解动画和视频，也不在路线图里，是《具身智能从入门到精通》day1 / day2「经典脉络」点名的 2026 年工作——[DynaRetarget](../../papers/04_Loco-Manipulation_and_WBC/DynaRetarget__Dynamically-Feasible_Retargeting_using_Sampling-Based_Trajectory_Optimization/DynaRetarget__Dynamically-Feasible_Retargeting_using_Sampling-Based_Trajectory_Optimization.md)、[HumanoidMimicGen](../../papers/11_Simulation_Benchmark/HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning/HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning.md)（这两篇是重定向 / 数据生成线，可以挨着 044 NMR 讲）、[Hiking in the Wild](../../papers/04_Loco-Manipulation_and_WBC/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids.md)（AMP 风格奖励 + 深度感知的人形行走）。
- 第三批候选：day4「移动操作」经典脉络点名、上游已收录、但仓库里还没有笔记的三篇——[ULC](https://arxiv.org/abs/2507.06905)（根速度、高度、躯干与双臂目标进一个策略，命令逐步解锁）、[SoFTA（Hold My Beer）](https://arxiv.org/abs/2505.24198)（上下肢两个频率不同、奖励分开的策略，端液体时稳住末端）、[SkillBlender](https://arxiv.org/abs/2506.09366)（先学目标条件的基础技能，再按关节混合）；另有拓展阅读里已有笔记的 [SteadyTray](../../papers/04_Loco-Manipulation_and_WBC/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid.md)（2026，冻结托盘行走基座后加残差稳住负载）。要做视频先补笔记。
- 视频号合集里的视频能不能调整顺序没有核实到，所以这套规则不依赖调序。
- 新做完一集视频：把 🆕 改成 🎬，写上 `<paper>` 名，与 [README](README.md) 的表格一致。

## 可选变体：先连发现成视频

第三季 16 篇都要新做。想先把现成视频连着发，可以把 038 Transformer、039 ACT、041–045（OpenVLA → GR00T N1）提到第三季前面：这条线只接 Diffusion Policy 和 Transformer（DP→π₀、Transformer⇢π₀），不依赖 WBC。EgoMimic 在路线图上接在 iDP3 后面，BFM 要对照 HOVER 读（BFM-Zero 跟着 BFM），SONIC 用到 GR00T N1.5 和 BeyondMimic，这四篇仍放在第三季之后。
