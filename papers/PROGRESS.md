## 进度

### 基础路线图（当前）


| #   | 论文                                                                                           | 状态     | 日期         | 路线          |
| --- | -------------------------------------------------------------------------------------------- | ------ | ---------- | ----------- |
| 1   | PPO: Proximal Policy Optimization                                                            | ✅ 完成   | 2026-03-22 | 基础RL        |
| 2   | AWR: Advantage Weighted Regression                                                           | ✅ 完成   | 2026-03-22 | 基础RL        |
| 3   | DeepMimic: Example-Guided Deep RL of Physics-Based Character Skills                          | ✅ 完成   | 2026-03-26 | 精确模仿        |
| 4   | AMP: Adversarial Motion Priors for Stylized Physics-Based Character Control                  | ✅ 完成   | 2026-04-19 | 风格学习        |
| 5   | PHC: Perpetual Humanoid Control for Real-time Simulated Avatars                              | ⏳ 待读   | -          | 精确模仿        |
| 6   | ADD: Adversarial Disentanglement and Distillation                                            | ⏳ 待读   | -          | 风格学习        |
| 7   | ASE: Adversarial Skill Embeddings for Large-Scale Motion Control                             | ⏳ 待读   | -          | 技能组合        |
| 8   | CALM: Conditional Adversarial Latent Models for Directable Virtual Characters                | ⏳ 待读   | -          | 技能组合        |
| 9   | PULSE: Physically Plausible Universal Latent Skill Extraction                                | ⏳ 待读   | -          | 技能组合        |
| 10  | Diffusion Policy: Visuomotor Policy Learning via Action Diffusion                            | ⏳ 待读   | -          | 扩散+控制       |
| 11  | BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion         | ⏳ 待读   | -          | 扩散+控制       |
| 12  | Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World | ⏳ 待读   | -          | Sim-to-Real |
| 13  | LCP: Sim-to-Real Action Smoothing                                                            | ⏳ 待读   | -          | 基础RL        |


### ⭐ 高影响力精选（基础路线图之后优先读）

> 从 445 篇新论文中筛选出的高影响力工作。选择标准：🌟开源、经典/奠基性、与 RL/模仿学习运动控制高度相关、知名实验室代表作。

#### Whole-Body Control 核心


| #   | 论文                                                                                                             | 来源  | 理由                         |
| --- | -------------------------------------------------------------------------------------------------------------- | --- | -------------------------- |
| H1  | [Expressive Whole-Body Control for Humanoid Robots](https://arxiv.org/abs/2402.16796) 🌟                       | WBC | 开源，表达性全身控制的基础工作            |
| H2  | [HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots](https://arxiv.org/abs/2410.21229) ✅ [笔记](03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.md) | WBC | 通用神经 WBC，影响力极大             |
| H3  | [ExBody2: Advanced Expressive Humanoid Whole-Body Control](https://arxiv.org/abs/2412.13196)                   | WBC | ExBody 系列进化，实机验证           |
| H4  | [HugWBC: A Unified and General Humanoid Whole-Body Controller](https://arxiv.org/abs/2502.03206) ✅ [笔记](03_High_Impact_Selection/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.md) | WBC | 统一框架，工程参考价值高               |
| H5  | [SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control](https://arxiv.org/abs/2511.07820) ✅ [笔记](03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.md) | WBC | NVIDIA，大规模 motion tracking |
| H6  | [Learning from Massive Human Videos for Universal Humanoid Pose Control](https://arxiv.org/abs/2412.14172) ✅ [笔记](03_High_Impact_Selection/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control/UH-1_Learning_from_Massive_Human_Videos_for_Universal_Humanoid_Pose_Control.md) | WBC | UH-1，海量人类视频学习              |


#### 遥操作与模仿学习


| #   | 论文                                                                                                                 | 来源     | 理由                   |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------ | -------------------- |
| H7  | [HumanPlus: Humanoid Shadowing and Imitation from Humans](https://arxiv.org/abs/2406.10454) 🌟                     | Teleop | Stanford，人形遥操作开山之作   |
| H8  | [OmniH2O: Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation](https://arxiv.org/abs/2406.08858) 🌟 | Teleop | LeCAR-Lab，通用 H2H 遥操作 |
| H9  | [HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit](https://arxiv.org/abs/2502.13013) ✅ [笔记](03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.md) | Teleop | OpenRobotLab，外骨骼遥操作  |
| H10 | [EgoMimic: Scaling Imitation Learning via Egocentric Video](https://arxiv.org/abs/2410.24221) 🌟                   | Manip  | 自我中心视角模仿学习           |
| H11 | [Generalizable Humanoid Manipulation with Improved 3D Diffusion Policies](https://arxiv.org/abs/2410.10803) 🌟 ✅ [笔记](03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.md) | Manip  | 泽洋杰，3D 扩散策略          |


#### Locomotion 经典


| #   | 论文                                                                                                       | 来源   | 理由                      |
| --- | -------------------------------------------------------------------------------------------------------- | ---- | ----------------------- |
| H12 | [Real-World Humanoid Locomotion with Reinforcement Learning](https://arxiv.org/abs/2303.03381) ✅ [笔记](03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.md) | Loco | Berkeley，首个真实世界人形 RL 行走 |
| H13 | [Humanoid Locomotion as Next Token Prediction](https://arxiv.org/abs/2402.19469) ✅ [笔记](03_High_Impact_Selection/Humanoid_Locomotion_as_Next_Token_Prediction/Humanoid_Locomotion_as_Next_Token_Prediction.md) | Loco | 把运动控制建模为 token 预测，新范式   |
| H14 | [Humanoid Parkour Learning](https://arxiv.org/abs/2406.10759) ✅ [笔记](03_High_Impact_Selection/Humanoid_Parkour_Learning/Humanoid_Parkour_Learning.md) | Loco | 人形跑酷，高动态控制              |
| H15 | [Learning Sim-to-Real Humanoid Locomotion in 15 Minutes](https://arxiv.org/abs/2512.01996) ✅ [笔记](03_High_Impact_Selection/Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes/Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes.md) | Loco | 极快 sim-to-real，工程价值高    |
| H16 | [ECO: Energy-Constrained Optimization with RL for Humanoid Walking](https://arxiv.org/abs/2602.06445) 🌟 ✅ [笔记](03_High_Impact_Selection/ECO_Energy_Constrained_Optimization_with_RL_for_Humanoid_Walking/ECO_Energy_Constrained_Optimization_with_RL_for_Humanoid_Walking.md) | Loco | 能量优化行走，开源               |


#### Sim-to-Real & Foundation Model


| #   | 论文                                                                                                              | 来源    | 理由                          |
| --- | --------------------------------------------------------------------------------------------------------------- | ----- | --------------------------- |
| H17 | [Learning Agile and Dynamic Motor Skills for Legged Robots](https://arxiv.org/abs/1901.08652) ✅ [笔记](03_High_Impact_Selection/Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots/Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots.md) | S2R   | ANYmal 经典，sim-to-real RL 奠基 |
| H18 | [ASAP: Aligning Simulation and Real-World Physics for Agile Humanoid Skills](https://arxiv.org/abs/2502.01143) ✅ [笔记](03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.md) | S2R   | sim-real 物理对齐（delta 动作对齐 + 仿真回灌微调） |
| H19 | [GR00T N1: An Open Foundation Model for Generalist Humanoid Robots](https://arxiv.org/abs/2503.14734) ✅ [笔记](03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.md) | Manip | 双系统 VLA + 数据金字塔，开放权重 |
| H20 | [Behavior Foundation Model for Humanoid Robots](https://arxiv.org/abs/2509.13780) ✅ [笔记](03_High_Impact_Selection/Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.md) | WBC   | 行为基础模型                      |
| H24 | [Perceptive Behavior Foundation Model: Adapting Human Motion Priors to Robot-Centric Terrain](https://arxiv.org/abs/2606.08059) 🌟 ✅ [笔记](03_High_Impact_Selection/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.md) | WBC   | 地形感知的行为基础模型，训练代码与 TCRS 开源 |


#### 仿真平台 & 工具


| #   | 论文                                                                                                                         | 来源  | 理由                 |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --- | ------------------ |
| H21 | [Humanoid-Gym: RL for Humanoid Robot with Zero-Shot Sim2Real Transfer](https://arxiv.org/abs/2404.05695) ✅ [笔记](03_High_Impact_Selection/Humanoid-Gym_Zero-Shot_Sim2Real_Transfer/Humanoid-Gym_Zero-Shot_Sim2Real_Transfer.md) | Sim | 人形机器人 RL 训练平台      |
| H22 | [HumanoidBench: Simulated Humanoid Benchmark for Whole-Body Locomotion and Manipulation](https://arxiv.org/abs/2403.10506) | Sim | 标准 benchmark       |
| H23 | [BEHAVIOR Robot Suite: Real-World Whole-Body Manipulation for Everyday Tasks](https://arxiv.org/abs/2503.05652) 🌟 ✅ [笔记](03_High_Impact_Selection/BEHAVIOR_Robot_Suite_Streamlining_Real-World_Whole-Body_Manipulation/BEHAVIOR_Robot_Suite_Streamlining_Real-World_Whole-Body_Manipulation.md) | Sim | 真实世界全身操作 benchmark |
| 14   | [Toward Reliable Sim-to-Real Predictability for MoE-based Robust Quadrupedal Locomotion](https://arxiv.org/abs/2602.00678) | 2026.02 |  | ⏳ 待读 |
| 15   | [AME-2: Agile and Generalized Legged Locomotion via Attention-Based Neural Map Encoding](https://arxiv.org/abs/2601.08485) ✅ [笔记](05_Locomotion/AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding/AME-2__Agile_and_Generalized_Legged_Locomotion_via_Attention-Based_Neural_Map_Encoding.md) | 2026.01 | 2026-08-01 | ✅ 已总结 |
| 16   | [Gait-Adaptive Perceptive Humanoid Locomotion with Real-Time Under-Base Terrain Reconstruction](https://arxiv.org/abs/2512.07464) | 2025.12 |  | ⏳ 待读 |
| 17   | [Reference-Free Sampling-Based Model Predictive Control](https://arxiv.org/abs/2511.19204) | 2025.11 |  | ⏳ 待读 |
| 18   | [Learning a Vision-Based Footstep Planner for Hierarchical Walking Control](https://arxiv.org/abs/2510.12215) | 2025.10 |  | ⏳ 待读 |
| 19   | [PHUMA: Physically-Grounded Humanoid Locomotion Dataset](https://arxiv.org/abs/2510.26236) | 2025.10 |  | ⏳ 待读 |
| 20   | [Gait-Conditioned RL with Multi-Phase Curriculum for Humanoid Locomotion](https://arxiv.org/abs/2505.20619) | 2025.05 |  | ⏳ 待读 |
| 21   | [Distillation-PPO: A Novel Two-Stage RL Framework for Humanoid Robot Perceptive Locomotion](https://arxiv.org/abs/2503.08299) | 2025.03 |  | ⏳ 待读 |
| 22   | Adapting Humanoid Locomotion over Challenging Terrain via Two-Phase Training | 2024.10 |  | ⏳ 待读 |
| 23   | [Sampling-Based System Identification with Active Exploration for Legged Robot Sim2Real Learning](https://arxiv.org/abs/2505.14266) ✅ [笔记](10_Sim-to-Real/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration.md) | 2025.05 |  | ✅ 已总结 |


### Loco-Manipulation and Whole-Body-Control


| #   | 论文                                                                                                                                                               | 日期         | 🌟  | 状态   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --- | ---- |
| 24   | [LATENT: Learning Athletic Humanoid Tennis Skills from Imperfect Human Motion Data](https://arxiv.org/abs/2603.12686)                                            | 2026-04-24 |     | ✅ 完成 |
| 25   | [Ψ₀: An Open Foundation Model Towards Universal Humanoid Loco-Manipulation](https://arxiv.org/abs/2603.12263)                                                    | 2026-04-25 |     | ✅ 完成 |
| 26   | [SteadyTray: Learning Object Balancing Tasks in Humanoid Tray Transport via Residual RL](https://arxiv.org/abs/2603.10306)                                       | 2026-04-25 |     | ✅ 完成 |
| 27   | [ZeroWBC: Learning Natural Visuomotor Humanoid Control from Egocentric Video](https://arxiv.org/abs/2603.09170)                                                  | 2026-04-26 |     | ✅ 完成 |
| 28   | [Embedding Classical Balance Control Principles in RL for Humanoid Recovery](https://arxiv.org/abs/2603.08619)                                                 | 2026-04-28 |     | ✅ 完成 |
| 29   | ULTRA: Unified Multimodal Control for Autonomous Humanoid Whole-Body Loco-Manipulation                                                                           | 2026-03-07 |     | ✅ 完成 |
| 30   | OmniXtreme: Breaking the Generality Barrier in High-Dynamic Humanoid Control                                                                                     | 2026-03-08 |     | ✅ 完成 |
| 31   | LessMimic: Long-Horizon Humanoid Interaction with Unified Distance Field Representations                                                                         | -          |     | ⏳ 待读 |
| 32   | Learning Humanoid End-Effector Control for Open-Vocabulary Visual Loco-Manipulation                                                                              | -          |     | ⏳ 待读 |
| 33   | VIGOR: Visual Goal-In-Context Inference for Unified Humanoid Fall Safety                                                                                         | -          |     | ⏳ 待读 |
| 34   | [Perceptive Humanoid Parkour: Chaining Dynamic Human Skills via Motion Matching](https://arxiv.org/abs/2602.15827) ✅ [笔记](04_Loco-Manipulation_and_WBC/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.md) | 2026-09-24 |     | ✅ 完成 |
| 35   | [MeshMimic: Geometry-Aware Humanoid Motion Learning through 3D Scene Reconstruction](https://arxiv.org/abs/2602.15733)                                           | 2026-04-29 |     | ✅ 完成 |
| 36   | [General Humanoid Whole-Body Control via Pretraining and Fast Adaptation](https://arxiv.org/abs/2602.11929)                                                      | 2026-04-29 |     | ✅ 完成 |
| 37   | [HAIC: Humanoid Agile Object Interaction Control via Dynamics-Aware World Model](https://arxiv.org/abs/2602.11758)                                               | 2026-04-29 |     | ✅ 完成 |
| 38   | [EgoHumanoid: Unlocking In-the-Wild Loco-Manipulation with Robot-Free Egocentric Demonstration](https://arxiv.org/abs/2602.10106)                                | 2026-04-29 |     | ✅ 完成 |
| 39   | [MOSAIC: Bridging the Sim-to-Real Gap in Generalist Humanoid Motion Tracking and Teleoperation with Rapid Residual Adaptation](https://arxiv.org/abs/2602.08594) ✅ [笔记](10_Sim-to-Real/MOSAIC__Bridging_the_Sim-to-Real_Gap_in_Generalist_Humanoid_Motion_Tracking/MOSAIC__Bridging_the_Sim-to-Real_Gap_in_Generalist_Humanoid_Motion_Tracking.md) | 2026-05-01 |     | ✅ 完成 |
| 40   | [Learning Human-Like Badminton Skills for Humanoid Robots](https://arxiv.org/abs/2602.08370)                                                                     | 2026-05-02 |     | ✅ 完成 |
| 41   | [TextOp: Real-time Interactive Text-Driven Humanoid Robot Motion Generation and Control](https://arxiv.org/abs/2602.07439)                                       | 2026-05-03 |     | ✅ 完成 |
| 42   | [Humanoid Manipulation Interface: Humanoid Whole-Body Manipulation from Robot-Free Demonstrations](https://arxiv.org/abs/2602.06643)                             | 2026-05-04 |     | ✅ 完成 |
| 43   | [HiWET: Hierarchical World-Frame End-Effector Tracking for Long-Horizon Humanoid Loco-Manipulation](https://arxiv.org/abs/2602.06341)                            | 2026-05-04 |     | ✅ 完成 |
| 44   | [Learning Soccer Skills for Humanoid Robots: A Progressive Perception-Action Framework](https://arxiv.org/abs/2602.05310)                                        | 2026.02    |     | ⏳ 待读 |
| 45   | [PDF-HR: Pose Distance Fields for Humanoid Robots](https://arxiv.org/abs/2602.04851)                                                                             | 2026-05-06 |     | ✅ 完成 |
| 46   | [HUSKY: Humanoid Skateboarding System via Physics-Aware Whole-Body Control](https://arxiv.org/abs/2602.03205)                                                    | 2026-05-07 |     | ✅ 完成 |
| 47   | [Embodiment-Aware Generalist Specialist Distillation for Unified Humanoid Whole-Body Control](https://arxiv.org/abs/2602.02960)                                  | 2026.02    |     | ⏳ 待读 |
| 48   | [HumanX: Toward Agile and Generalizable Humanoid Interaction Skills from Human Videos](https://arxiv.org/abs/2602.02473)                                         | 2026-05-09 |     | ✅ 完成 |
| 49   | [TTT-Parkour: Rapid Test-Time Training for Perceptive Robot Parkour](https://arxiv.org/abs/2602.02331)                                                           | 2026-05-13 |     | ✅ 完成 |
| 50   | [ZEST: Zero-shot Embodied Skill Transfer for Athletic Robot Control](https://arxiv.org/abs/2602.00401)                                                           | 2026-05-14 |     | ✅ 完成 |
| 51   | [Robust and Generalized Humanoid Motion Tracking](https://arxiv.org/abs/2601.23080)                                                                              | 2026-05-17 |     | ✅ 完成 |
| 52   | [RoboStriker: Hierarchical Decision-Making for Autonomous Humanoid Boxing](https://arxiv.org/abs/2601.22517)                                                     | 2026.01    | 2026-05-22 | ✅ 已完成 |
| 53   | [PILOT: A Perceptive Integrated Low-level Controller for Loco-manipulation over Unstructured Scenes](https://arxiv.org/abs/2601.17440)                           | 2026.01    | 2026-06-02 | ✅ 已完成 |
| 54   | [Collision-Free Humanoid Traversal in Cluttered Indoor Scenes](https://arxiv.org/abs/2601.16035) ✅ [笔记](04_Loco-Manipulation_and_WBC/Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes/Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes.md) | 2026.01    | 2026-06-13 | ✅ 已总结 |
| 55   | [FRoM-W1: Towards General Humanoid Whole-Body Control with Language Instructions](https://arxiv.org/abs/2601.12799)                                              | 2026.01    |     | ⏳ 待读 |
| 56   | [Learning Whole-Body Human-Humanoid Interaction from Human-Human Demonstrations](https://arxiv.org/abs/2601.09518)                                               | 2026.01    |     | ⏳ 待读 |
| 57   | [Hiking in the Wild: A Scalable Perceptive Parkour Framework for Humanoids](https://arxiv.org/abs/2601.07718)                                                    | 2026.01    |     | ⏳ 待读 |
| 58   | [Deep Whole-body Parkour](https://arxiv.org/abs/2601.07701)                                                                                                      | 2026.01    |     | ⏳ 待读 |
| 59   | [Coordinated Humanoid Manipulation with Choice Policies](https://arxiv.org/abs/2512.25072)                                                                       | 2025.12    |     | ⏳ 待读 |
| 60   | [UniAct: Unified Motion Generation and Action Streaming for Humanoid Robots](https://arxiv.org/abs/2512.24321)                                                   | 2025.12    |     | ⏳ 待读 |
| 61   | [EGM: Efficiently Learning General Motion Tracking Policy for High Dynamic Humanoid Whole-Body Control](https://arxiv.org/abs/2512.19043)                        | 2025.12    |     | ⏳ 待读 |
| 62   | [Semantic Co-Speech Gesture Synthesis and Real-Time Control for Humanoid Robots](https://arxiv.org/abs/2512.17183)                                               | 2025.12    | 2026-05-19 | ✅ 已完成 |
| 63   | [CHIP: Adaptive Compliance for Humanoid Control through Hindsight Perturbation](https://arxiv.org/abs/2512.14689)                                                | 2025.12    |     | ⏳ 待读 |
| 64   | [PvP: Data-Efficient Humanoid Robot Learning with Proprioceptive-Privileged Contrastive Representations](https://arxiv.org/abs/2512.13093) ✅ [笔记](04_Loco-Manipulation_and_WBC/PvP__Data-Efficient_Humanoid_Robot_Learning_with_Proprioceptive-Privileged_Contrastive/PvP__Data-Efficient_Humanoid_Robot_Learning_with_Proprioceptive-Privileged_Contrastive.md) | 2025.12    | 2026-06-29 | ✅ 已总结 |
| 65   | [Learning Agile Striker Skills for Humanoid Soccer Robots from Noisy Sensory Input](https://arxiv.org/abs/2512.06571)                                            | 2025.12    |     | ⏳ 待读 |
| 66   | [Discovering Self-Protective Falling Policy for Humanoid Robot via Deep Reinforcement Learning](https://arxiv.org/abs/2512.01336)                                | 2025.12    |     | ⏳ 待读 |
| 67   | [Opening the Sim-to-Real Door for Humanoid Pixel-to-Action Policy Transfer](https://arxiv.org/abs/2512.01061)                                                    | 2025.12    |     | ⏳ 待读 |
| 68   | [Commanding Humanoid by Free-form Language: A Large Language Action Model with Unified Motion Vocabulary](https://arxiv.org/abs/2511.22963)                      | 2025.11    |     | ⏳ 待读 |
| 69   | [Kinematics-Aware Multi-Policy Reinforcement Learning for Force-Capable Humanoid Loco-Manipulation](https://arxiv.org/abs/2511.21169)                            | 2025.11    |     | ⏳ 待读 |
| 70   | [HAFO: A Force-Adaptive Control Framework for Humanoid Robots in Intense Interaction Environments](https://arxiv.org/abs/2511.20275) ✅ [笔记](04_Loco-Manipulation_and_WBC/HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact/HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact.md) | 2025.11    | 2026-07-31 | ✅ 已总结 |
| 71   | [SENTINEL: A Fully End-to-End Language-Action Model for Humanoid Whole Body Control](https://arxiv.org/abs/2511.19236)                                           | 2025.11    |     | ⏳ 待读 |
| 72   | [SafeFall: Learning Protective Control for Humanoid Robots](https://arxiv.org/abs/2511.18509)                                                                    | 2025.11    |     | ⏳ 待读 |
| 73   | [Agility Meets Stability: Versatile Humanoid Control with Heterogeneous Data](https://arxiv.org/abs/2511.17373)                                                  | 2025.11    |     | ⏳ 待读 |
| 74   | [VIRAL: Visual Sim-to-Real at Scale for Humanoid Loco-Manipulation](https://arxiv.org/abs/2511.15200)                                                            | 2025.11    |     | ⏳ 待读 |
| 75   | [HMC: Learning Heterogeneous Meta-Control for Contact-Rich Loco-Manipulation](https://arxiv.org/abs/2511.14756)                                                  | 2025.11    |     | ⏳ 待读 |
| 76   | [Humanoid Whole-Body Badminton via Multi-Stage Reinforcement Learning](https://arxiv.org/abs/2511.11218)                                                         | 2025.11    |     | ⏳ 待读 |
| 77   | [Robot Crash Course: Learning Soft and Stylized Falling](https://arxiv.org/abs/2511.10635)                                                                       | 2025.11    |     | ⏳ 待读 |
| 78   | [Unveiling the Impact of Data and Model Scaling on High-Level Control for Humanoid Robots](https://arxiv.org/abs/2511.09241)                                     | 2025.11    |     | ⏳ 待读 |
| 79   | [SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control](https://arxiv.org/abs/2511.07820)                                                   | 2025.11    |     | ⏳ 待读 |
| 80   | [Unified Humanoid Fall-Safety Policy from a Few Demonstrations](https://arxiv.org/abs/2511.07407)                                                                | 2025.11    |     | ⏳ 待读 |
| 81   | [Towards Adaptive Humanoid Control via Multi-Behavior Distillation and Reinforced Fine-Tuning](https://arxiv.org/abs/2511.06371)                                 | 2025.11    |     | ⏳ 待读 |
| 82   | [GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction](https://arxiv.org/abs/2511.04679)                                 | 2026-04-19 |     | ✅ 完成 |
| 83   | [BFM-Zero: A Promptable Behavioral Foundation Model for Humanoid Control Using Unsupervised Reinforcement Learning](https://arxiv.org/abs/2511.04131) ✅ [笔记](04_Loco-Manipulation_and_WBC/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control/BFM-Zero__A_Promptable_Behavioral_Foundation_Model_for_Humanoid_Control.md) | 2025.11    | 2026-08-11 | ✅ 已总结 |
| 84   | [Learning Vision-Driven Reactive Soccer Skills for Humanoid Robots](https://arxiv.org/abs/2511.03996) ✅ [笔记](04_Loco-Manipulation_and_WBC/Learning_Vision-Driven_Reactive_Soccer_Skills_for_Humanoid_Robots/Learning_Vision-Driven_Reactive_Soccer_Skills_for_Humanoid_Robots.md) | 2025.11    | 2026-09-02 | ✅ 已总结 |
| 85   | [TWIST2: Scalable, Portable, and Holistic Humanoid Data Collection System](https://arxiv.org/abs/2511.02832)                                                     | 2025.11    |     | ⏳ 待读 |
| 86   | [Thor: Towards Human-Level Whole-Body Reactions for Intense Contact-Rich Environments](https://arxiv.org/abs/2510.26280)                                         | 2025.10    |     | ⏳ 待读 |
| 87   | [One-shot Humanoid Whole-body Motion Learning](https://arxiv.org/abs/2510.25241)                                                                                 | 2025.10    |     | ⏳ 待读 |
| 88   | [Humanoid Goalkeeper: Learning from Position Conditioned Task-Motion Constraints](https://arxiv.org/abs/2510.18002)                                              | 2025.10    |     | ⏳ 待读 |
| 89   | [From Language to Locomotion: Retargeting-free Humanoid Control via Motion Latent Guidance](https://arxiv.org/abs/2510.14952)                                    | 2025.10    |     | ⏳ 待读 |
| 90   | [Towards Adaptable Humanoid Control via Adaptive Motion Tracking](https://arxiv.org/abs/2510.14454)                                                              | 2025.10    |     | ⏳ 待读 |
| 91   | [Learning Human-Humanoid Coordination for Collaborative Object Carrying](https://arxiv.org/abs/2510.14293)                                                       | 2025.10    |     | ⏳ 待读 |
| 92   | [Ego-Vision World Model for Humanoid Contact Planning](https://arxiv.org/abs/2510.11682)                                                                         | 2025.10    |     | ⏳ 待读 |
| 93   | [DemoHLM: From One Demonstration to Generalizable Humanoid Loco-Manipulation](https://arxiv.org/abs/2510.11258)                                                  | 2025.10    |     | ⏳ 待读 |
| 94   | [PhysHSI: Towards a Real-World Generalizable and Natural Humanoid-Scene Interaction System](https://arxiv.org/abs/2510.11072)                                    | 2025.10    |     | ⏳ 待读 |
| 95   | [It Takes Two: Learning Interactive Whole-Body Control Between Humanoid Robots](https://arxiv.org/abs/2510.10206)                                                | 2025.10    |     | ⏳ 待读 |
| 96   | [ResMimic: From General Motion Tracking to Humanoid Whole-body Loco-Manipulation via Residual Learning](https://arxiv.org/abs/2510.05070)                        | 2025.10    |     | ⏳ 待读 |
| 97   | [HumanoidExo: Scalable Whole-Body Humanoid Manipulation via Wearable Exoskeleton](https://arxiv.org/abs/2510.03022)                                              | 2025.10    |     | ⏳ 待读 |
| 98   | [Retargeting Matters: General Motion Retargeting for Humanoid Motion Tracking](https://arxiv.org/abs/2510.02252)                                                 | 2025.10    |     | ⏳ 待读 |
| 99   | [OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction](https://arxiv.org/abs/2509.26633)         | 2025.09    |     | ⏳ 待读 |
| 100  | [Towards Versatile Humanoid Table Tennis: Unified Reinforcement Learning with Prediction Augmentation](https://arxiv.org/abs/2509.21690)                         | 2025.09    |     | ⏳ 待读 |
| 101  | [SEEC: Stable End-Effector Control with Model-Enhanced Residual Learning for Humanoid Loco-Manipulation](https://arxiv.org/abs/2509.21231)                       | 2025.09    |     | ⏳ 待读 |
| 102  | [VisualMimic: Visual Humanoid Loco-Manipulation via Motion Tracking and Generation](https://arxiv.org/abs/2509.20322)                                            | 2025.10    |     | ⏳ 待读 |
| 103  | [HDMI: Learning Interactive Humanoid Whole-Body Control from Human Videos](https://arxiv.org/abs/2509.16757)                                                     | 2025.09    |     | ⏳ 待读 |
| 104  | [KungfuBot 2: Learning Versatile Motion Skills for Humanoid Whole-Body Control](https://arxiv.org/abs/2509.16638)                                                | 2025.09    |     | ⏳ 待读 |
| 105  | [Implicit Kinodynamic Motion Retargeting for Human-to-humanoid Imitation Learning](https://arxiv.org/abs/2509.15443)                                             | 2025.09    |     | ⏳ 待读 |
| 106  | [DreamControl: Human-Inspired Whole-Body Humanoid Control for Scene Interaction via Guided Diffusion](https://arxiv.org/abs/2509.14353)                          | 2025.09    |     | ⏳ 待读 |
| 107  | [Track Any Motions under Any Disturbances](https://arxiv.org/abs/2509.13833)                                                                                     | 2025.09    |     | ⏳ 待读 |
| 108  | [Behavior Foundation Model for Humanoid Robots](https://arxiv.org/abs/2509.13780)                                                                                | 2025.09    |     | ⏳ 待读 |
| 109  | [Embracing Bulky Objects with Humanoid Robots: Whole-Body Manipulation with Reinforcement Learning](https://arxiv.org/abs/2509.13534)                            | 2025.09    |     | ⏳ 待读 |
| 110  | [StageACT: Stage-Conditioned Imitation for Robust Humanoid Door Opening](https://arxiv.org/abs/2509.13200)                                                       | 2025.09    |     | ⏳ 待读 |
| 111  | [TrajBooster: Boosting Humanoid Whole-Body Manipulation via Trajectory-Centric Learning](https://arxiv.org/abs/2509.11839)                                       | 2025.09    |     | ⏳ 待读 |
| 112  | [HITTER: A HumanoId Table TEnnis Robot via Hierarchical Planning and Learning](https://arxiv.org/abs/2508.21043)                                                 | 2025.08    |     | ⏳ 待读 |
| 113  | [HuBE: Cross-Embodiment Human-like Behavior Execution for Humanoid Robots](https://arxiv.org/abs/2508.19002)                                                     | 2025.08    |     | ⏳ 待读 |
| 114  | [HumanoidVerse: A Versatile Humanoid for Vision-Language Guided Multi-Object Rearrangement](https://arxiv.org/abs/2508.16943)                                    | 2025.08    |     | ⏳ 待读 |
| 115  | [Task and Motion Planning for Humanoid Loco-manipulation](https://arxiv.org/abs/2508.14099)                                                                      | 2025.08    |     | ⏳ 待读 |
| 116  | [GBC: Generalized Behavior-Cloning Framework for Whole-Body Humanoid Imitation](https://arxiv.org/abs/2508.09960)                                                | 2025.08    |     | ⏳ 待读 |
| 117  | [A Whole-Body Motion Imitation Framework from Human Data for Full-Size Humanoid Robot](https://arxiv.org/abs/2508.00362)                                         | 2025.08    |     | ⏳ 待读 |
| 118  | [EMP: Executable Motion Prior for Humanoid Robot Standing Upper-body Motion Imitation](https://arxiv.org/abs/2507.15649)                                         | 2025.07    |     | ⏳ 待读 |
| 119  | [Keep on Going: Learning Robust Humanoid Motion Skills via Selective Adversarial Training](https://arxiv.org/abs/2507.08303)                                     | 2025.07    |     | ⏳ 待读 |
| 120  | [UniTracker: Learning Universal Whole-Body Motion Tracker for Humanoid Robots](https://arxiv.org/abs/2507.07356)                                                 | 2025.07    |     | ⏳ 待读 |
| 121  | [ULC: A Unified and Fine-Grained Controller for Humanoid Loco-Manipulation](https://arxiv.org/abs/2507.06905)                                                    | 2025.07    |     | ⏳ 待读 |
| 122  | [Learning Motion Skills with Adaptive Assistive Curriculum Force in Humanoid Robots](https://arxiv.org/abs/2506.23125)                                           | 2025.06    |     | ⏳ 待读 |
| 123  | [A Survey of Behavior Foundation Model: Next-Generation Whole-Body Control System of Humanoid Robots](https://arxiv.org/abs/2506.20487)                          | 2025.06    |     | ⏳ 待读 |
| 124  | [TACT: Humanoid Whole-body Contact Manipulation through Deep Imitation Learning with Tactile Modality](https://arxiv.org/abs/2506.15146)                         | 2025.06    |     | ⏳ 待读 |
| 125  | [GMT: General Motion Tracking for Humanoid Whole-Body Control](https://arxiv.org/abs/2506.14770)                                                                 | 2025.06    |     | ⏳ 待读 |
| 126  | [LeVERB: Humanoid Whole-Body Control with Latent Vision-Language Instruction](https://arxiv.org/abs/2506.13751)                                                  | 2025.06    |     | ⏳ 待读 |
| 127  | [From Experts to a Generalist: Toward General Whole-Body Control for Humanoid Robots](https://arxiv.org/abs/2506.12779)                                          | 2025.06    |     | ⏳ 待读 |
| 128  | [SkillBlender: Towards Versatile Humanoid Whole-Body Loco-Manipulation via Skill Blending](https://arxiv.org/abs/2506.09366)                                     | 2025.06    |     | ⏳ 待读 |
| 129  | [SLAC: Simulation-Pretrained Latent Action Space for Whole-Body Real-World Reinforcement Learning](https://arxiv.org/abs/2506.04147)                             | 2025.06    |     | ⏳ 待读 |
| 130  | [Hierarchical Intention-Aware Expressive Motion Generation for Humanoid Robots](https://arxiv.org/abs/2506.01563)                                                | 2025.06    |     | ⏳ 待读 |
| 131  | [From Motion to Behavior: Hierarchical Modeling of Humanoid Generative Behavior Control](https://arxiv.org/abs/2506.00043)                                       | 2025.06    |     | ⏳ 待读 |
| 132  | [SignBot: Learning Human-to-Humanoid Sign Language Interaction](https://arxiv.org/abs/2505.24266)                                                                | 2025.05    |     | ⏳ 待读 |
| 133  | [Learning Gentle Humanoid Locomotion and End-Effector Stabilization Control](https://arxiv.org/abs/2505.24198)                                                   | 2025.05    |     | ⏳ 待读 |
| 134  | [Mobi-π: Mobilizing Your Robot Learning Policy](https://arxiv.org/abs/2505.23692)                                                                                | 2025.05    |     | ⏳ 待读 |
| 135  | [SMAP: Self-supervised Motion Adaptation for Physically Plausible Humanoid Whole-body Control](https://arxiv.org/abs/2505.19463)                                 | 2025.05    |     | ⏳ 待读 |
| 136  | [H2-COMPACT: Human-Humanoid Co-Manipulation via Adaptive Contact Trajectory Policies](https://arxiv.org/abs/2505.17627) ✅ [笔记](04_Loco-Manipulation_and_WBC/H2-COMPACT__Human-Humanoid_Co-Manipulation_via_Adaptive_Contact_Trajectory/H2-COMPACT__Human-Humanoid_Co-Manipulation_via_Adaptive_Contact_Trajectory.md) | 2025.05    | 2026-09-07 | ✅ 已总结 |
| 137  | [Unleashing Humanoid Reaching Potential via Real-world-Ready Skill Space](https://arxiv.org/abs/2505.10918)                                                      | 2025.05    |     | ⏳ 待读 |
| 138  | [HuB: Learning Extreme Humanoid Balance](https://arxiv.org/abs/2505.07294)                                                                                       | 2025.05    |     | ⏳ 待读 |
| 139  | [FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation](https://arxiv.org/abs/2505.06776)                                                                   | 2025.05    |     | ⏳ 待读 |
| 140  | FAME: Force-Adaptive RL for Expanding the Manipulation Envelope of a Full-Scale Humanoid                                                                         | -          |     | ⏳ 待读 |
| 141  | [JAEGER: Dual-Level Humanoid Whole-Body Controller](https://arxiv.org/abs/2505.06584)                                                                            | 2025.05    |     | ⏳ 待读 |
| 142  | [AMO: Adaptive Motion Optimization for Hyper-Dexterous Humanoid Whole-Body Control](https://arxiv.org/abs/2505.03738)                                            | 2025.05    |     | ⏳ 待读 |
| 143  | [PyRoki: A Modular Toolkit for Robot Kinematic Optimization](https://arxiv.org/abs/2505.03728)                                                                   | 2025.05    |     | ⏳ 待读 |
| 144  | [TWIST: Teleoperated Whole-Body Imitation System](https://arxiv.org/abs/2505.02833)                                                                              | 2025.05    |     | ⏳ 待读 |
| 145  | [LangWBC: Language-directed Humanoid Whole-Body Control via End-to-end Learning](https://arxiv.org/abs/2504.21738)                                               | 2025.04    |     | ⏳ 待读 |
| 146  | [Physically Consistent Humanoid Loco-Manipulation using Latent Diffusion Models](https://arxiv.org/abs/2504.16843v1)                                             | 2025.04    |     | ⏳ 待读 |
| 147  | [Adversarial Locomotion and Motion Imitation for Humanoid Policy Learning](https://arxiv.org/abs/2504.14305)                                                     | 2025.04    |     | ⏳ 待读 |
| 589  | [Embodied Chain of Action Reasoning with Multi-Modal Foundation Model for Humanoid Loco-manipulation](https://arxiv.org/abs/2504.09532)                          | 2025.04    |     | ⏳ 待读 |
| 148  | [Being-0: A Humanoid Robotic Agent with Vision-Language Models and Modular Skills](https://arxiv.org/abs/2503.12533)                                             | 2025.03    |     | ⏳ 待读 |
| 149  | [Trinity: A Modular Humanoid Robot AI System](https://arxiv.org/abs/2503.08338)                                                                                  | 2025.03    |     | ⏳ 待读 |
| 150  | [BEHAVIOR Robot Suite: Streamlining Real-World Whole-Body Manipulation for Everyday Household Activities](https://arxiv.org/abs/2503.05652)                      | 2025.03    |     | ⏳ 待读 |
| 151  | [Whole-Body Model-Predictive Control of Legged Robots with MuJoCo](https://arxiv.org/abs/2503.04613)                                                             | 2025.03    |     | ⏳ 待读 |
| 152  | [HiFAR: Multi-Stage Curriculum Learning for High-Dynamics Humanoid Fall Recovery](https://arxiv.org/abs/2502.20061)                                              | 2025.02    |     | ⏳ 待读 |
| 153  | [HOMIE: Humanoid Loco-Manipulation with Isomorphic Exoskeleton Cockpit](https://arxiv.org/abs/2502.13013)                                                        | 2025.02    |     | ⏳ 待读 |
| 154  | [Learning Getting-Up Policies for Real-World Humanoid Robots](https://arxiv.org/abs/2502.12152)                                                                  | 2025.02    |     | ⏳ 待读 |
| 155  | [Learning Humanoid Standing-up Control across Diverse Postures](https://arxiv.org/abs/2502.08378)                                                                | 2025.02    |     | ⏳ 待读 |
| 156  | [HugWBC: A Unified and General Humanoid Whole-Body Controller](https://arxiv.org/abs/2502.03206)                                                                 | 2025.02    |     | ⏳ 待读 |
| 157  | [SPARK: A Toolbox for Safe Humanoid Autonomy and Teleoperation](https://arxiv.org/abs/2502.03132)                                                                | 2025.02    |     | ⏳ 待读 |
| 158  | [Embrace Collisions: Humanoid Shadowing for Deployable Contact-Agnostics Motions](https://arxiv.org/abs/2502.01465)                                              | 2025.02    |     | ⏳ 待读 |
| 159  | [Human-Humanoid Robots Cross-Embodiment Behavior-Skill Transfer Using Decomposed Adversarial Learning from Demonstration](https://arxiv.org/abs/2412.15166)      | 2024.12    |     | ⏳ 待读 |
| 160  | [Learning from Massive Human Videos for Universal Humanoid Pose Control](https://arxiv.org/abs/2412.14172)                                                       | 2024.12    |     | ⏳ 待读 |
| 161  | [ExBody2: Advanced Expressive Humanoid Whole-Body Control](https://arxiv.org/abs/2412.13196)                                                                     | 2024.12    |     | ⏳ 待读 |
| 162  | [Mobile-TeleVision: Predictive Motion Priors for Humanoid Whole-Body Control](https://arxiv.org/abs/2412.07773)                                                  | 2024.12    |     | ⏳ 待读 |
| 163  | [A Behavior Architecture for Fast Humanoid Robot Door Traversals](https://arxiv.org/abs/2411.03532)                                                              | 2024.11    |     | ⏳ 待读 |
| 164  | [EMOTION: Expressive Motion Sequence Generation for Humanoid Robots with In-Context Learning](https://arxiv.org/abs/2410.23234)                                  | 2024.10    |     | ⏳ 待读 |
| 165  | [HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots](https://arxiv.org/abs/2410.21229)                                                            | 2024.10    |     | ⏳ 待读 |
| 166  | [Harmon: Whole-Body Motion Generation of Humanoid Robots from Language Descriptions](https://arxiv.org/abs/2410.12773)                                           | 2024.10    |     | ⏳ 待读 |
| 167  | [Whole-Body Dynamic Throwing with Legged Manipulators](https://arxiv.org/abs/2410.05681)                                                                         | 2024.10    |     | ⏳ 待读 |
| 168  | [Opt2Skill: Imitating Dynamically-feasible Whole-Body Trajectories for Versatile Humanoid Loco-Manipulation](https://arxiv.org/abs/2409.20514)                   | 2024.09    |     | ⏳ 待读 |
| 169  | [HYPERmotion: Learning Hybrid Behavior Planning for Autonomous Loco-manipulation](https://arxiv.org/abs/2406.14655v1)                                            | 2024.06    |     | ⏳ 待读 |
| 170  | [HumanPlus: Humanoid Shadowing and Imitation from Humans](https://arxiv.org/abs/2406.10454)                                                                      | 2024.06    |     | ⏳ 待读 |
| 171  | [OmniH2O: Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation and Learning](https://arxiv.org/abs/2406.08858)                                     | 2024.06    |     | ⏳ 待读 |
| 172  | [WoCoCo: Learning Whole-Body Humanoid Control with Sequential Contacts](https://arxiv.org/abs/2406.06005)                                                        | 2024.06    |     | ⏳ 待读 |
| 173  | [Learning Human-to-Humanoid Real-Time Whole-Body Teleoperation](https://arxiv.org/abs/2403.04436)                                                                | 2024.03    |     | ⏳ 待读 |
| 174  | [Expressive Whole-Body Control for Humanoid Robots](https://arxiv.org/abs/2402.16796)                                                                            | 2024.02    |     | ⏳ 待读 |
| 175  | [Sim-to-Real Learning for Humanoid Box Loco-Manipulation](https://arxiv.org/abs/2310.03191)                                                                      | 2023.10    |     | ⏳ 待读 |
| 176  | WholeBodyVLA: Towards Unified Latent VLA for Whole-body Loco-manipulation Control                                                                                | 2025.12    |     | ⏳ 待读 |
| 177  | SPIDER: Scalable Physics-Informed DExterous Retargeting                                                                                                          | 2025.11    |     | ⏳ 待读 |
| 178  | AdaMimic: Towards Adaptable Humanoid Control via Adaptive Motion Tracking                                                                                        | 2025.10    |     | ⏳ 待读 |
| 179  | General Motion Tracking for Humanoid Whole-Body Control                                                                                                          | 2025.06    |     | ⏳ 待读 |
| 180  | CLONE: Holistic Closed-Loop Whole-Body Teleoperation for Long-Horizon Humanoid Control                                                                           | 2025.06    |     | ⏳ 待读 |
| 181  | [ASAP: Aligning Simulation and Real-World Physics for Learning Agile Humanoid Whole-Body Skills](https://arxiv.org/abs/2502.01143) ✅ [笔记](03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.md) | 2025.02    |     | ✅ 已总结 |
| 182  | VMP: Versatile Motion Priors for Robustly Tracking Motion on Physical Characters                                                                                 | 2024.08    |     | ⏳ 待读 |
| 545  | [Learning Multi-Modal Whole-Body Control for Real-World Humanoid Robots](https://arxiv.org/abs/2408.07295) | 2024.08    |     | ⏳ 待读 |
| 183  | Robot Motion Diffusion Model: Motion Generation for Robotic Characters                                                                                           | 2024.07    |     | ⏳ 待读 |
| 184  | [website],Embodied Chain of Action Reasoning with Multi-Modal Foundation Model for Humanoid Loco-manipulation                                                    | 2025.04    |     | ⏳ 待读 |
| 185  | [Heracles: Bridging Precise Tracking and Generative Synthesis for General Humanoid Control](https://arxiv.org/abs/2603.27756) | 2026.03 |  | ⏳ 待读 |
| 186  | [SafeFlow: Real-Time Text-Driven Humanoid Whole-Body Control via Physics-Guided Rectified Flow and Selective Safety Gating](https://arxiv.org/abs/2603.23983) | 2026.03 |  | ⏳ 待读 |
| 532  | [ReActor: Reinforcement Learning for Physics-Aware Motion Retargeting](https://arxiv.org/abs/2605.06593) ✅ [笔记](02_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.md) | 2026.05 | 2026-09-18 | ✅ 已总结 |
| 533  | [SUGAR: A Scalable Human-Video-Driven Generalizable Humanoid Loco-Manipulation Learning Framework](https://arxiv.org/abs/2605.20373) | 2026.05 | 🌟 | ⏳ 待读 |
| 534  | [SplitAdapter: Load-Aware Humanoid Loco-Manipulation via Factorized Adaptation](https://arxiv.org/abs/2606.03297) ✅ [笔记](04_Loco-Manipulation_and_WBC/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation.md) | 2026.06 | 2026-06-14 | ✅ 已总结 |
| 575  | [GigaBrain-WBC-0.5: A Behavior World Model for Robust Whole-Body Control with Environment Interaction](https://arxiv.org/abs/2608.18234) ✅ [笔记](04_Loco-Manipulation_and_WBC/GigaBrain-WBC-0.5__A_Behavior_World_Model_for_Robust_Whole-Body_Control/GigaBrain-WBC-0.5__A_Behavior_World_Model_for_Robust_Whole-Body_Control.md) | 2026-08-18 |  | ✅ 已总结 |


### Locomotion（84篇）


| #   | 论文                                                                                                                                                              | 日期      | 🌟  | 状态   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ---- |
| 576  | [Tac4Loco: Learning Spatiotemporal Plantar Pressure Representations for Humanoid Locomotion](https://arxiv.org/abs/2608.15766) ✅ [笔记](05_Locomotion/Tac4Loco__Spatiotemporal_Plantar_Pressure_Representations_for_Humanoid_Locomotion/Tac4Loco__Spatiotemporal_Plantar_Pressure_Representations_for_Humanoid_Locomotion.md) | 2026-08-16 |     | ✅ 已总结 |
| 187  | [Biomechanical Comparisons Reveal Divergence of Human and Humanoid Gaits](https://arxiv.org/abs/2602.21666) ✅ [笔记](05_Locomotion/Biomechanical_Comparisons_Reveal_Divergence_of_Human_and_Humanoid_Gaits/Biomechanical_Comparisons_Reveal_Divergence_of_Human_and_Humanoid_Gaits.md) | 2026.02 |     | ✅ 已总结 |
| 188  | [APEX: Learning Adaptive High-Platform Traversal for Humanoid Robots](https://arxiv.org/abs/2602.11143) ✅ [笔记](05_Locomotion/APEX_Learning_Adaptive_High-Platform_Traversal_for_Humanoid_Robots/APEX_Learning_Adaptive_High-Platform_Traversal_for_Humanoid_Robots.md) | 2026.02 |     | ✅ 已总结 |
| 189  | [ECO: Energy-Constrained Optimization with Reinforcement Learning for Humanoid Walking](https://arxiv.org/abs/2602.06445)                                       | 2026.02 |     | ✅ 完成 |
| 190  | [Now You See That: Learning End-to-End Humanoid Locomotion from Raw Pixels](https://arxiv.org/abs/2602.06382) ✅ [笔记](05_Locomotion/Now_You_See_That_Learning_End-to-End_Humanoid_Locomotion_from_Raw_Pixels/Now_You_See_That_Learning_End-to-End_Humanoid_Locomotion_from_Raw_Pixels.md) | 2026.02 |     | ✅ 已总结 |
| 191  | [A Hybrid Autoencoder for Robust Heightmap Generation from Fused Lidar and Depth Data for Humanoid Robot Locomotion](https://arxiv.org/abs/2602.05855) ✅ [笔记](05_Locomotion/Hybrid_Autoencoder_for_Robust_Heightmap_from_Fused_Lidar_and_Depth_Data/Hybrid_Autoencoder_for_Robust_Heightmap_from_Fused_Lidar_and_Depth_Data.md) | 2026-05-23 |     | ✅ 已总结 |
| 192  | [Scalable and General Whole-Body Control for Cross-Humanoid Locomotion](https://arxiv.org/abs/2602.05791) ✅ [笔记](05_Locomotion/XHugWBC__Scalable_and_General_Whole-Body_Control_for_Cross-Humanoid_Locomotion/XHugWBC__Scalable_and_General_Whole-Body_Control_for_Cross-Humanoid_Locomotion.md) | 2026-05-28 |     | ✅ 已总结 |
| 193  | [HoRD: Robust Humanoid Control via History-Conditioned Reinforcement Learning and Online Distillation](https://arxiv.org/abs/2602.04412) ✅ [笔记](05_Locomotion/HoRD__Robust_Humanoid_Control_via_History-Conditioned_RL_and_Online_Distillation/HoRD__Robust_Humanoid_Control_via_History-Conditioned_RL_and_Online_Distillation.md) | 2026.02 |     | ✅ 已总结 |
| 194  | [CMR: Contractive Mapping Embeddings for Robust Humanoid Locomotion on Unstructured Terrains](https://arxiv.org/abs/2602.03511) ✅ [笔记](05_Locomotion/CMR__Contractive_Mapping_Embeddings_for_Robust_Humanoid_Locomotion/CMR__Contractive_Mapping_Embeddings_for_Robust_Humanoid_Locomotion.md)                                 | 2026.02 |     | ✅ 已总结 |
| 195  | [RPL: Learning Robust Humanoid Perceptive Locomotion on Challenging Terrains](https://arxiv.org/abs/2602.03002) ✅ [笔记](05_Locomotion/RPL__Learning_Robust_Humanoid_Perceptive_Locomotion_on_Challenging_Terrains/RPL__Learning_Robust_Humanoid_Perceptive_Locomotion_on_Challenging_Terrains.md) | 2026.02 |     | ✅ 已总结 |
| 196  | [FastStair: Learning to Run Up Stairs with Humanoid Robots](https://arxiv.org/abs/2601.10365) ✅ [笔记](05_Locomotion/FastStair__Learning_to_Run_Up_Stairs_with_Humanoid_Robots/FastStair__Learning_to_Run_Up_Stairs_with_Humanoid_Robots.md) | 2026-06-21 |     | ✅ 已总结 |
| 197  | [Walk the PLANC: Physics-Guided RL for Agile Humanoid Locomotion on Constrained Footholds](https://arxiv.org/abs/2601.06286) ✅ [笔记](05_Locomotion/Walk_the_PLANC__Physics-Guided_RL_for_Agile_Humanoid_Locomotion_on_Constrained_Footholds/Walk_the_PLANC__Physics-Guided_RL_for_Agile_Humanoid_Locomotion_on_Constrained_Footholds.md) | 2026-06-30 |     | ✅ 已总结 |
| 198  | [SKATER: Synthesized Kinematics for Advanced Traversing Efficiency on a Humanoid Robot via Roller Skate Swizzles](https://arxiv.org/abs/2601.04948) ✅ [笔记](05_Locomotion/SKATER__Synthesized_Kinematics_for_Advanced_Traversing_Efficiency_via_Roller_Skate_Swizzles/SKATER__Synthesized_Kinematics_for_Advanced_Traversing_Efficiency_via_Roller_Skate_Swizzles.md) | 2026.01 | 2026-08-12 | ✅ 已总结 |
| 199  | Walk the PLANC: Physics‑Guided RL for Agile Humanoid LocomotioN on Constrained Footholds                                                                        | 2026.01 |     | ⏳ 待读 |
| 200  | [Do You Have Freestyle? Expressive Humanoid Locomotion via Audio Control](https://arxiv.org/abs/2512.23650) ✅ [笔记](05_Locomotion/Do_You_Have_Freestyle__Expressive_Humanoid_Locomotion_via_Audio_Control/Do_You_Have_Freestyle__Expressive_Humanoid_Locomotion_via_Audio_Control.md) | 2025.12 |     | ✅ 已总结 |
| 201  | [RoboMirror: Understand Before You Imitate for Video to Humanoid Locomotion](https://arxiv.org/abs/2512.23649) ✅ [笔记](05_Locomotion/RoboMirror__Understand_Before_You_Imitate_for_Video_to_Humanoid_Locomotion/RoboMirror__Understand_Before_You_Imitate_for_Video_to_Humanoid_Locomotion.md) | 2025.12 | 2026-09-08 | ✅ 已总结 |
| 202  | [E-SDS: Environment-aware See it, Do it, Sorted - Automated Environment-Aware Reinforcement Learning for Humanoid Locomotion](https://arxiv.org/abs/2512.16446) | 2025.12 |     | ⏳ 待读 |
| 203  | [Learning to Get Up Across Morphologies: Zero-Shot Recovery with a Unified Humanoid Policy](https://arxiv.org/abs/2512.12230)                                   | 2025.12 |     | ⏳ 待读 |
| 204  | [Symphony: A Heuristic Normalized Calibrated Advantage Actor and Critic Algorithm in application for Humanoid Robots](https://arxiv.org/abs/2512.10477)         | 2025.12 |     | ⏳ 待读 |
| 205  | [Learning Sim-to-Real Humanoid Locomotion in 15 Minutes](https://arxiv.org/abs/2512.01996)                                                                      | 2025.12 |     | ✅ 完成 |
| 206  | [H-Zero: Cross-Humanoid Locomotion Pretraining Enables Few-shot Novel Embodiment Transfer](https://arxiv.org/abs/2512.00971)                                    | 2025.12 |     | ⏳ 待读 |
| 207  | [A Hierarchical Framework for Humanoid Locomotion with Supernumerary Limbs](https://arxiv.org/abs/2512.00077)                                                   | 2025.12 |     | ⏳ 待读 |
| 208  | [GaussGym: An open-source real-to-sim framework for learning locomotion from pixels](https://arxiv.org/abs/2510.15352)                                          | 2025.10 |     | ⏳ 待读 |
| 209  | [Architecture Is All You Need: Diversity-Enabled Sweet Spots for Robust Humanoid Locomotion](https://arxiv.org/abs/2510.14947)                                  | 2025.10 |     | ⏳ 待读 |
| 210  | [PolygMap: A Perceptive Locomotion Framework for Humanoid Robot Stair Climbing](https://arxiv.org/abs/2510.12346)                                               | 2025.10 |     | ⏳ 待读 |
| 211  | [Preference-Conditioned Multi-Objective RL for Integrated Command Tracking and Force Compliance in Humanoid Locomotion](https://arxiv.org/abs/2510.10851)       | 2025.10 |     | ⏳ 待读 |
| 212  | [DPL: Depth-only Perceptive Humanoid Locomotion via Realistic Depth Synthesis and Cross-Attention Terrain Reconstruction](https://arxiv.org/abs/2510.07152)     | 2025.10 |     | ⏳ 待读 |
| 213  | [Stabilizing Humanoid Robot Trajectory Generation via Physics-Informed Learning](https://arxiv.org/abs/2509.24697)                                              | 2025.09 |     | ⏳ 待读 |
| 214  | [RuN: Residual Policy for Natural Humanoid Locomotion](https://arxiv.org/abs/2509.20696)                                                                        | 2025.09 |     | ⏳ 待读 |
| 215  | [Chasing Stability: Humanoid Running via Control Lyapunov Function Guided RL](https://arxiv.org/abs/2509.19573)                                                 | 2025.09 |     | ⏳ 待读 |
| 216  | [Reduced-Order Model-Guided RL for Demonstration-Free Humanoid Locomotion](https://arxiv.org/abs/2509.19023)                                                    | 2025.09 |     | ⏳ 待读 |
| 217  | [HuMam: Humanoid Motion Control via End-to-End Deep RL with Mamba](https://arxiv.org/abs/2509.18046)                                                            | 2025.09 |     | ⏳ 待读 |
| 218  | [Learning to Walk in Costume: Adversarial Motion Priors for Aesthetically Constrained Humanoids](https://arxiv.org/abs/2509.05581)                              | 2025.09 |     | ⏳ 待读 |
| 219  | LocoFormer: Generalist Locomotion via Long-Context Adaptation                                                                                                   | 2025.09 |     | ⏳ 待读 |
| 220  | [Traversing Narrow Paths: A Two-Stage RL Framework for Robust and Safe Humanoid Walking](https://arxiv.org/abs/2508.20661)                                      | 2025.08 |     | ⏳ 待读 |
| 221  | [No More Marching: Learning Humanoid Locomotion for Short-Range SE(2) Targets](https://arxiv.org/abs/2508.14098)                                                | 2025.08 |     | ⏳ 待读 |
| 222  | [Geometry-Aware Predictive Safety Filters on Humanoids](https://arxiv.org/abs/2508.11129)                                                                       | 2025.08 |     | ⏳ 待读 |
| 223  | [MASH: Cooperative-Heterogeneous Multi-Agent RL for Single Humanoid Robot Locomotion](https://arxiv.org/abs/2508.10423)                                         | 2025.08 |     | ⏳ 待读 |
| 224  | [End-to-End Humanoid Robot Safe and Comfortable Locomotion Policy](https://arxiv.org/abs/2508.07611)                                                            | 2025.08 |     | ⏳ 待读 |
| 225  | [Optimizing Bipedal Locomotion for The 100m Dash With Comparison to Human Running](https://arxiv.org/abs/2508.03070)                                            | 2025.08 |     | ⏳ 待读 |
| 226  | [Coordinated Humanoid Robot Locomotion with Symmetry Equivariant Reinforcement Learning Policy](https://arxiv.org/abs/2508.01247)                               | 2025.08 |     | ⏳ 待读 |
| 227  | [Success in Humanoid Reinforcement Learning under Partial Observation](https://arxiv.org/abs/2507.18883)                                                        | 2025.07 |     | ⏳ 待读 |
| 228  | [Learning Humanoid Arm Motion via Centroidal Momentum Regularized Multi-Agent Reinforcement Learning](https://arxiv.org/abs/2507.04140)                          | 2025.07 |     | ⏳ 待读 |
| 229  | [Mechanical Intelligence-Aware Curriculum RL for Humanoids with Parallel Actuation](https://arxiv.org/abs/2507.00273)                                           | 2025.07 |     | ⏳ 待读 |
| 230  | [Booster Gym: An End-to-End RL Framework for Humanoid Robot Locomotion](https://arxiv.org/abs/2506.15132)                                                       | 2025.06 |     | ⏳ 待读 |
| 231  | [DoublyAware: Dual Planning and Policy Awareness for Temporal Difference Learning in Humanoid Locomotion](https://arxiv.org/abs/2506.12095)                     | 2025.06 |     | ⏳ 待读 |
| 232  | [MoRE: Mixture of Residual Experts for Humanoid Lifelike Gaits Learning on Complex Terrains](https://arxiv.org/abs/2506.08840)                                  | 2025.06 |     | ⏳ 待读 |
| 233  | [A Gait Driven RL Framework for Humanoid Robots](https://arxiv.org/abs/2506.08416)                                                                              | 2025.06 |     | ⏳ 待读 |
| 234  | [Learning Aerodynamics for the Control of Flying Humanoid Robots](https://arxiv.org/abs/2506.00305)                                                             | 2025.06 |     | ⏳ 待读 |
| 235  | [FastTD3: Simple, Fast, and Capable Reinforcement Learning for Humanoid Control](https://arxiv.org/abs/2505.22642)                                              | 2025.05 |     | ⏳ 待读 |
| 236  | [Omni-Perception: Omnidirectional Collision Avoidance for Legged Locomotion in Dynamic Environments](https://arxiv.org/abs/2505.19214)                          | 2025.05 |     | ⏳ 待读 |
| 237  | [One Policy but Many Worlds: A Scalable Unified Policy for Versatile Humanoid Locomotion](https://arxiv.org/abs/2505.18780)                                     | 2025.05 |     | ⏳ 待读 |
| 238  | [TD-GRPC: Temporal Difference Learning with Group Relative Policy Constraint for Humanoid Locomotion](https://arxiv.org/abs/2505.13549)                         | 2025.05 |     | ⏳ 待读 |
| 239  | [Dribble Master: Learning Agile Humanoid Dribbling Through Legged Locomotion](https://arxiv.org/abs/2505.12679)                                                 | 2025.05 |     | ⏳ 待读 |
| 240  | [SHIELD: Safety on Humanoids via CBFs In Expectation on Learned Dynamics](https://arxiv.org/abs/2505.11494)                                                     | 2025.05 |     | ⏳ 待读 |
| 241  | [Let Humanoids Hike! Integrative Skill Development on Complex Trails](https://arxiv.org/abs/2505.06218)                                                         | 2025.05 |     | ⏳ 待读 |
| 242  | [VideoMimic: Visual imitation enables contextual humanoid control](https://arxiv.org/abs/2505.03729)                                                            | 2025.05 |     | ⏳ 待读 |
| 243  | [SoccerDiffusion: Toward Learning End-to-End Humanoid Robot Soccer from Gameplay Recordings](https://arxiv.org/abs/2504.20808)                                  | 2025.04 |     | ⏳ 待读 |
| 244  | [Robust Humanoid Walking on Compliant and Uneven Terrain with Deep RL](https://arxiv.org/abs/2504.13619)                                                        | 2025.04 |     | ⏳ 待读 |
| 245  | [PPF: Pre-training and Preservative Fine-tuning of Humanoid Locomotion](https://arxiv.org/abs/2504.09833)                                                       | 2025.04 |     | ⏳ 待读 |
| 246  | [Spectral Normalization for Lipschitz-Constrained Policies on Learning Humanoid Locomotion](https://arxiv.org/abs/2504.08246)                                   | 2025.04 |     | ⏳ 待读 |
| 247  | [Learning Bipedal Locomotion on Gear-Driven Humanoid Robot Using Foot-Mounted IMUs](https://arxiv.org/abs/2504.00614)                                           | 2025.04 |     | ⏳ 待读 |
| 248  | [StyleLoco: Generative Adversarial Distillation for Natural Humanoid Robot Locomotion](https://arxiv.org/abs/2503.15082)                                        | 2025.03 |     | ⏳ 待读 |
| 249  | [Natural Humanoid Robot Locomotion with Generative Motion Prior](https://arxiv.org/abs/2503.09015)                                                              | 2025.03 |     | ⏳ 待读 |
| 250  | [LiPS: Large-Scale Humanoid Robot RL with Parallel-Series Structures](https://arxiv.org/abs/2503.08349)                                                         | 2025.03 |     | ⏳ 待读 |
| 251  | [HWC-Loco: A Hierarchical Whole-Body Control Approach to Robust Humanoid Locomotion](https://arxiv.org/abs/2503.00923)                                          | 2025.03 |     | ⏳ 待读 |
| 252  | [Learning Perceptive Humanoid Locomotion over Challenging Terrain](https://arxiv.org/abs/2503.00692)                                                            | 2025.03 |     | ⏳ 待读 |
| 253  | [Humanoid Whole-Body Locomotion on Narrow Terrain via Dynamic Balance and Reinforcement Learning](https://arxiv.org/abs/2502.17219)                             | 2025.02 |     | ⏳ 待读 |
| 254  | [Learning Humanoid Locomotion with World Model Reconstruction](https://arxiv.org/abs/2502.16230)                                                                | 2025.02 |     | ⏳ 待读 |
| 255  | [VB-Com: Learning Vision-Blind Composite Humanoid Locomotion Against Deficient Perception](https://arxiv.org/abs/2502.14814)                                    | 2025.02 |     | ⏳ 待读 |
| 256  | [BeamDojo: Learning Agile Humanoid Locomotion on Sparse Footholds](https://arxiv.org/abs/2502.10363)                                                            | 2025.02 |     | ⏳ 待读 |
| 257  | [Learning Humanoid Locomotion with Perceptive Internal Model](https://arxiv.org/abs/2411.14386)                                                                 | 2024.11 |     | ⏳ 待读 |
| 258  | [Real-Time Polygonal Semantic Mapping for Humanoid Robot Stair Climbing](https://arxiv.org/abs/2411.01919)                                                      | 2024.11 |     | ⏳ 待读 |
| 259  | [Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies](https://arxiv.org/abs/2410.11825)                                                  | 2024.10 |     | ⏳ 待读 |
| 260  | [Learning Humanoid Locomotion over Challenging Terrain](https://arxiv.org/abs/2410.03654)                                                                       | 2024.10 |     | ⏳ 待读 |
| 261  | Bi-Level Motion Imitation for Humanoid Robots                                                                                                                   | 2024.10 |     | ⏳ 待读 |
| 262  | [Advancing Humanoid Locomotion: Mastering Challenging Terrains with Denoising World Model Learning](https://arxiv.org/abs/2408.14472)                           | 2024.08 |     | ⏳ 待读 |
| 263  | [Humanoid Parkour Learning](https://arxiv.org/abs/2406.10759) ✅ [笔记](03_High_Impact_Selection/Humanoid_Parkour_Learning/Humanoid_Parkour_Learning.md)                                                                                                   | 2026-05-25 |     | ✅ 完成 |
| 264  | [Deep Reinforcement Learning for Bipedal Locomotion: A Brief Survey](https://arxiv.org/abs/2404.17070)                                                          | 2024.04 |     | ⏳ 待读 |
| 265  | [Humanoid Locomotion as Next Token Prediction](https://arxiv.org/abs/2402.19469)                                                                                | 2026-05-22 |     | ✅ 完成 |
| 266  | [Whole-body Humanoid Robot Locomotion with Human Reference](https://arxiv.org/abs/2402.18294)                                                                   | 2024.02 |     | ⏳ 待读 |
| 267  | [Reinforcement Learning for Versatile, Dynamic, and Robust Bipedal Locomotion Control](https://arxiv.org/abs/2401.16889)                                        | 2024.01 |     | ⏳ 待读 |
| 268  | [Learning to Walk and Fly with Adversarial Motion Priors](https://arxiv.org/abs/2309.12784)                                                                     | 2023.09 |     | ⏳ 待读 |
| 269  | [Real-World Humanoid Locomotion with Reinforcement Learning](https://arxiv.org/abs/2303.03381)                                                                  | 2023.03 |     | ⏳ 待读 |
| 270  | [Robust and Versatile Bipedal Jumping Control through Reinforcement Learning](https://arxiv.org/abs/2302.09450)                                                 | 2023.02 |     | ⏳ 待读 |
| 524  | [A Hierarchical, Model-Based System for High-Performance Humanoid Soccer](https://arxiv.org/abs/2512.09431)                                                    | 2025.12 |     | ⏳ 待读 |
| 525  | [Benchmarking Potential Based Rewards for Learning Humanoid Locomotion](https://arxiv.org/abs/2307.10142)                                                      | 2023.07 |     | ⏳ 待读 |


### Manipulation（60篇）


| #   | 论文                                                                                                                                                        | 日期      | 🌟  | 状态   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ---- |
| 581  | [AnyWorld: Factorized Egocentric World Models for Cross-Embodiment Generalization](https://arxiv.org/abs/2608.29242) 🌟 ✅ [笔记](06_Manipulation/AnyWorld__Factorized_Egocentric_World_Models_for_Cross-Embodiment_Generalization/AnyWorld__Factorized_Egocentric_World_Models_for_Cross-Embodiment_Generalization.md) | 2026.08 | 2026-09-04 | ✅ 已总结 |
| 271  | [HumDex: Humanoid Dexterous Manipulation Made Easy](https://arxiv.org/abs/2603.12260) ✅ [笔记](06_Manipulation/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.md) | 2026.03 |     | ✅ 完成 |
| 272  | [cuRoboV2: Dynamics-Aware Motion Generation with Depth-Fused Distance Fields for High-DoF Robots](https://arxiv.org/abs/2603.05493) ✅ [笔记](06_Manipulation/cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields/cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields.md) | 2026.03 |     | ✅ 完成 |
| 273  | [DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos](https://arxiv.org/abs/2602.06949) ✅ [笔记](06_Manipulation/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.md) | 2026.02 |     | ✅ 完成 |
| 274  | [HumanoidVLM: Vision-Language-Guided Impedance Control for Contact-Rich Humanoid Manipulation](https://arxiv.org/abs/2601.14874) ✅ [笔记](06_Manipulation/HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation/HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation.md) | 2026.01 |     | ✅ 完成 |
| 275  | [Generalizable Geometric Prior and Recurrent Spiking Feature Learning for Humanoid Robot Manipulation](https://arxiv.org/abs/2601.09031) ✅ [笔记](06_Manipulation/RGMP-S__Generalizable_Geometric_Prior_and_Recurrent_Spiking_Feature_Learning_for_Humanoid_Manipulation/RGMP-S__Generalizable_Geometric_Prior_and_Recurrent_Spiking_Feature_Learning_for_Humanoid_Manipulation.md) | 2026.01 |     | ✅ 完成 |
| 276  | [DexterCap: An Affordable and Automated System for Capturing Dexterous Hand-Object Manipulation](https://arxiv.org/abs/2601.05844) ✅ [笔记](06_Manipulation/DexterCap__An_Affordable_and_Automated_System_for_Capturing_Dexterous_Hand-Object/DexterCap__An_Affordable_and_Automated_System_for_Capturing_Dexterous_Hand-Object.md) | 2026-06-15 |     | ✅ 完成 |
| 277  | [Genie Sim 3.0 : A High-Fidelity Comprehensive Simulation Platform for Humanoid Robot](https://arxiv.org/abs/2601.02078) ✅ [笔记](06_Manipulation/Genie_Sim_3.0__A_High-Fidelity_Comprehensive_Simulation_Platform_for_Humanoid_Robot/Genie_Sim_3.0__A_High-Fidelity_Comprehensive_Simulation_Platform_for_Humanoid_Robot.md) | 2026-06-15 |     | ✅ 完成 |
| 278  | [Visual-tactile pretraining and online multitask learning for humanlike manipulation dexterity](https://www.science.org/doi/10.1126/scirobotics.ady2869) ✅ [笔记](06_Manipulation/Visual-Tactile_Pretraining_and_Online_Multitask_Learning_for_Humanlike_Manipulation_Dexterity/Visual-Tactile_Pretraining_and_Online_Multitask_Learning_for_Humanlike_Manipulation_Dexterity.md) | 2026.01 |     | ✅ 已总结 |
| 279  | [SafeHumanoid: VLM-RAG-driven Control of Upper Body Impedance for Humanoid Robot](https://arxiv.org/abs/2511.23300) ✅ [笔记](06_Manipulation/SafeHumanoid__VLM-RAG-driven_Control_of_Upper_Body_Impedance/SafeHumanoid__VLM-RAG-driven_Control_of_Upper_Body_Impedance.md) | 2025.11 | 2026-06-22 | ✅ 已总结 |
| 280  | [Dexterity from Smart Lenses: Multi-Fingered Robot Manipulation with In-the-Wild Human Demonstrations](https://arxiv.org/abs/2511.16661)                  | 2025.11 |     | ⏳ 待读 |
| 281  | [In-N-On: Scaling Egocentric Manipulation with in-the-wild and on-task Data](https://arxiv.org/abs/2511.15704)                                            | 2025.11 |     | ⏳ 待读 |
| 282  | [RGMP: Recurrent Geometric-prior Multimodal Policy for Generalizable Humanoid Robot Manipulation](https://arxiv.org/abs/2511.09141) ✅ [笔记](06_Manipulation/RGMP__Recurrent_Geometric-prior_Multimodal_Policy_for_Generalizable_Humanoid_Manipulation/RGMP__Recurrent_Geometric-prior_Multimodal_Policy_for_Generalizable_Humanoid_Manipulation.md) | 2025.11 | 2026-07-12 | ✅ 已总结 |
| 283  | [Lightning Grasp: High Performance Procedural Grasp Synthesis with Contact Fields](https://arxiv.org/abs/2511.07418)                                      | 2025.11 |     | ⏳ 待读 |
| 284  | [EgoMI: Learning Active Vision and Whole-Body Manipulation from Egocentric Human Demonstrations](https://arxiv.org/abs/2511.00153)                        | 2025.11 |     | ⏳ 待读 |
| 285  | [Endowing GPT-4 with a Humanoid Body: Building the Bridge Between Off-the-Shelf VLMs and the Physical World](https://arxiv.org/abs/2511.00041)            | 2025.11 |     | ⏳ 待读 |
| 286  | [Towards Proprioception-Aware Embodied Planning for Dual-Arm Humanoid Robots](https://arxiv.org/abs/2510.07882)                                           | 2025.10 |     | ⏳ 待读 |
| 287  | [ActiveUMI: Robotic Manipulation with Active Perception from Robot‑Free Human Demonstrations](https://arxiv.org/abs/2510.01607) ✅ [笔记](06_Manipulation/ActiveUMI__Robotic_Manipulation_with_Active_Perception_from_Robot-Free_Human_Demonstrations/ActiveUMI__Robotic_Manipulation_with_Active_Perception_from_Robot-Free_Human_Demonstrations.md) | 2025.10 | 2026-07-23 | ✅ 已总结 |
| 288  | [EgoDemoGen: Novel Egocentric Demonstration Generation Enables Viewpoint-Robust Manipulation](https://arxiv.org/abs/2509.22578)                           | 2025.09 |     | ⏳ 待读 |
| 289  | [Residual Off-Policy RL for Finetuning Behavior Cloning Policies](https://arxiv.org/abs/2509.19301)                                                       | 2025.09 |     | ⏳ 待读 |
| 290  | [MimicDroid: In-Context Learning for Humanoid Robot Manipulation from Human Play Videos](https://arxiv.org/abs/2509.09769)                                | 2025.09 |     | ⏳ 待读 |
| 291  | [Masquerade: Learning from In-the-wild Human Videos using Data-Editing](https://arxiv.org/abs/2508.09976)                                                 | 2025.08 |     | ⏳ 待读 |
| 292  | [TOP: Time Optimization Policy for Stable and Accurate Standing Manipulation with Humanoid Robots](https://arxiv.org/abs/2508.00355)                      | 2025.08 |     | ⏳ 待读 |
| 293  | [H-RDT: Human Manipulation Enhanced Bimanual Robotic Manipulation](https://arxiv.org/abs/2507.23523)                                                      | 2025.07 |     | ⏳ 待读 |
| 294  | [Being-H0: Vision-Language-Action Pretraining from Large-Scale Human Videos](https://arxiv.org/abs/2507.15597)                                            | 2025.07 |     | ⏳ 待读 |
| 295  | [EgoVLA: Learning Vision-Language-Action Models from Egocentric Human Videos](https://arxiv.org/abs/2507.12440) ✅ [笔记](06_Manipulation/EgoVLA__Learning_Vision-Language-Action_Models_from_Egocentric_Human_Videos/EgoVLA__Learning_Vision-Language-Action_Models_from_Egocentric_Human_Videos.md) | 2025.07 | 2026-07-01 | ✅ 已总结 |
| 296  | [Robot Drummer: Learning Rhythmic Skills for Humanoid Drumming](https://arxiv.org/abs/2507.11498)                                                         | 2025.07 |     | ⏳ 待读 |
| 297  | [Hierarchical Vision-Language Planning for Multi-Step Humanoid Manipulation](https://arxiv.org/abs/2506.22827)                                            | 2025.06 |     | ⏳ 待读 |
| 298  | [Vision in Action: Learning Active Perception from Human Demonstrations](https://arxiv.org/abs/2506.15666)                                                | 2025.06 |     | ⏳ 待读 |
| 299  | [DreamGen: Unlocking Generalization in Robot Learning through Neural Trajectories](https://arxiv.org/abs/2505.12705)                                      | 2025.05 |     | ⏳ 待读 |
| 300  | [EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video](https://arxiv.org/abs/2505.11709)                                             | 2025.05 |     | ⏳ 待读 |
| 301  | DexUMI: Using Human Hand as the Universal Manipulation Interface for Dexterous Manipulation                                                               | 2025.05 |     | ⏳ 待读 |
| 302  | [GR00T N1: An Open Foundation Model for Generalist Humanoid Robots](https://arxiv.org/abs/2503.14734)                                                     | 2025.03 |     | ⏳ 待读 |
| 303  | [Humanoid Policy ~ Human Policy](https://arxiv.org/abs/2503.13441)                                                                                        | 2025.03 |     | ⏳ 待读 |
| 304  | [Humanoids in Hospitals: A Technical Study of Humanoid Surrogates for Dexterous Medical Interventions](https://arxiv.org/abs/2503.12725)                  | 2025.03 |     | ⏳ 待读 |
| 305  | [Unified Video Action Model](https://arxiv.org/abs/2503.00200)                                                                                            | 2025.03 |     | ⏳ 待读 |
| 306  | [Dexterous Safe Control for Humanoids in Cluttered Environments via Projected Safe Set Algorithm](https://arxiv.org/abs/2502.02858)                       | 2025.02 |     | ⏳ 待读 |
| 307  | [MobileH2R: Learning Generalizable Human to Mobile Robot Handover Exclusively from Scalable and Diverse Synthetic Data](https://arxiv.org/abs/2501.04595) | 2025.01 |     | ⏳ 待读 |
| 308  | [ARMADA: Augmented Reality for Robot Manipulation and Robot-Free Data Acquisition](https://arxiv.org/abs/2412.10631)                                      | 2024.12 |     | ⏳ 待读 |
| 309  | [Object-Centric Dexterous Manipulation from Human Motion Data](https://arxiv.org/abs/2411.04005)                                                          | 2024.11 |     | ⏳ 待读 |
| 310  | [DexHub and DART: Towards Internet-Scale Robot Data Collection](https://arxiv.org/abs/2411.02214)                                                         | 2024.11 |     | ⏳ 待读 |
| 311  | [Learning to Look Around: Enhancing Teleoperation and Learning with a Human-like Actuated Neck](https://arxiv.org/abs/2411.00704)                         | 2024.11 |     | ⏳ 待读 |
| 312  | [EgoMimic: Scaling Imitation Learning via Egocentric Video](https://arxiv.org/abs/2410.24221)                                                             | 2024.10 |     | ⏳ 待读 |
| 313  | [Learning to Look: Seeking Information for Decision Making via Policy Factorization](https://arxiv.org/abs/2410.18964)                                    | 2024.10 |     | ⏳ 待读 |
| 314  | [OKAMI: Teaching Humanoid Robots Manipulation Skills through Single Video Imitation](https://arxiv.org/abs/2410.11792)                                    | 2024.10 |     | ⏳ 待读 |
| 315  | [Generalizable Humanoid Manipulation with Improved 3D Diffusion Policies](https://arxiv.org/abs/2410.10803)                                               | 2024.10 |     | ⏳ 待读 |
| 316  | Bimanual Dexterity for Complex Tasks                                                                                                                      | 2024.09 |     | ⏳ 待读 |
| 317  | [ACE: A Cross-Platform Visual-Exoskeletons System for Low-Cost Dexterous Teleoperation](https://arxiv.org/abs/2408.11805)                                 | 2024.08 |     | ⏳ 待读 |
| 318  | [Bunny-VisionPro: Real-Time Bimanual Dexterous Teleoperation for Imitation Learning](https://arxiv.org/abs/2407.03162)                                    | 2024.07 |     | ⏳ 待读 |
| 319  | [Open-TeleVision: Teleoperation with Immersive Active Visual Feedback](https://arxiv.org/abs/2407.01512)                                                  | 2024.07 |     | ⏳ 待读 |
| 320  | [Learning Visuotactile Skills with Two Multifingered Hands](https://arxiv.org/abs/2404.16823)                                                             | 2024.04 |     | ⏳ 待读 |
| 321  | [DexCap: Scalable and Portable Mocap Data Collection System for Dexterous Manipulation](https://arxiv.org/abs/2403.07788)                                 | 2024.03 |     | ⏳ 待读 |
| 322  | [DreamZero: World Action Models are Zero-shot Policies](https://arxiv.org/abs/2602.15922) ✅ [笔记](06_Manipulation/DreamZero_World_Action_Models_are_Zero-shot_Policies/DreamZero_World_Action_Models_are_Zero-shot_Policies.md) | 2026.02 |     | ✅ 完成 |
| 323  | A Systematic Study of Data Modalities and Strategies for Co-training Large Behavior Models for Robot Manipulation                                         | -       |     | ⏳ 待读 |
| 324  | [Learning to Grasp Anything by Playing with Random Toys](https://arxiv.org/abs/2510.12866) ✅ [笔记](06_Manipulation/LEGO__Learning_to_Grasp_Anything_by_Playing_with_Random_Toys/LEGO__Learning_to_Grasp_Anything_by_Playing_with_Random_Toys.md) | 2025.10 | 2026-08-02 | ✅ 已总结 |
| 325  | [A Humanoid Visual-Tactile-Action Dataset for Contact-Rich Manipulation](https://arxiv.org/abs/2510.25725) | 2025.10 |  | ⏳ 待读 |
| 326  | [Humanoid Everyday: A Comprehensive Robotic Dataset for Open-World Humanoid Manipulation](https://arxiv.org/abs/2510.08807) ✅ [笔记](06_Manipulation/Humanoid_Everyday__A_Comprehensive_Robotic_Dataset_for_Open-World_Humanoid_Manipulation/Humanoid_Everyday__A_Comprehensive_Robotic_Dataset_for_Open-World_Humanoid_Manipulation.md) | 2025.10 | 2026-09-09 | ✅ 已总结 |
| 327  | [Sim-and-Real Co-Training: A Simple Recipe for Vision-Based Robotic Manipulation](https://arxiv.org/abs/2503.24361) | 2025.03 |  | ⏳ 待读 |
| 328  | Is imitation learning the route to humanoid robots? | - |  | ⏳ 待读 |
| 526  | [Sim-to-Real Reinforcement Learning for Vision-Based Dexterous Manipulation on Humanoids](https://toruowo.github.io/recipe/) | 2025.02 |  | ⏳ 待读 |
| 542  | [Learning Versatile Humanoid Manipulation with Touch Dreaming](https://arxiv.org/abs/2604.13015) ✅ [笔记](06_Manipulation/HTD__Learning_Versatile_Humanoid_Manipulation_with_Touch_Dreaming/HTD__Learning_Versatile_Humanoid_Manipulation_with_Touch_Dreaming.md) | 2026.04 | 2026-06-16 | ✅ 已总结 |
| 567  | [RoboTacDex: A Dexterous Visual-Tactile-Action Dataset for Humanoid Manipulation](https://arxiv.org/abs/2606.31836) ✅ [笔记](06_Manipulation/RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation/RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation.md) | 2026.06 | 2026-08-13 | ✅ 已总结 |
| 577  | [RoboEdit: Turning Human Manipulation Videos into Scalable Robot Experience](https://arxiv.org/abs/2608.18948) ✅ [笔记](06_Manipulation/RoboEdit__Turning_Human_Manipulation_Videos_into_Scalable_Robot_Experience/RoboEdit__Turning_Human_Manipulation_Videos_into_Scalable_Robot_Experience.md) | 2026.08 | 2026-08-24 | ✅ 已总结 |


### Teleoperation（27篇）


| #   | 论文                                                                                                                                                             | 日期      | 🌟  | 状态   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ---- |
| 329  | [CLOT: Closed-Loop Global Motion Tracking for Whole-Body Humanoid Teleoperation](https://arxiv.org/abs/2602.15060)                                             | 2026-05-17 |     | ✅ 完成 |
| 330  | [ExtremControl: Low-Latency Humanoid Teleoperation with Direct Extremity Control](https://arxiv.org/abs/2602.11321) ✅ [笔记](07_Teleoperation/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.md) | 2026-05-19 |     | ✅ 完成 |
| 331  | [TeleGate: Whole-Body Humanoid Teleoperation via Gated Expert Selection with Motion Prior](https://arxiv.org/abs/2602.09628) ✅ [笔记](07_Teleoperation/TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior/TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior.md) | 2026-05-20 |     | ✅ 完成 |
| 332  | [A Closed-Form Geometric Retargeting Solver for Upper Body Humanoid Robot Teleoperation](https://arxiv.org/abs/2602.01632) ✅ [笔记](07_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.md) | 2026-05-25 |     | ✅ 完成 |
| 333  | [Learning Adaptive Neural Teleoperation for Humanoid Robots](https://arxiv.org/abs/2511.12390) ✅ [笔记](07_Teleoperation/Learning_Adaptive_Neural_Teleoperation_for_Humanoid_Robots/Learning_Adaptive_Neural_Teleoperation_for_Humanoid_Robots.md) | 2026-05-30 |     | ✅ 已总结 |
| 334  | [Development of an Intuitive GUI for Non-Expert Teleoperation of Humanoid Robots](https://arxiv.org/abs/2510.13594) ✅ [笔记](07_Teleoperation/Intuitive_GUI_for_Non-Expert_Teleoperation_of_Humanoid_Robots/Intuitive_GUI_for_Non-Expert_Teleoperation_of_Humanoid_Robots.md) | 2026-06-16 |     | ✅ 已总结 |
| 335  | [Stability-Aware Retargeting for Humanoid Multi-Contact Teleoperation](https://arxiv.org/abs/2510.04353) ✅ [笔记](07_Teleoperation/Stability-Aware_Retargeting_for_Humanoid_Multi-Contact_Teleoperation/Stability-Aware_Retargeting_for_Humanoid_Multi-Contact_Teleoperation.md) | 2026-06-16 |     | ✅ 已总结 |
| 336  | [LapSurgie: Humanoid Robots Performing Surgery via Teleoperated Handheld Laparoscopy](https://arxiv.org/abs/2510.03529) ✅ [笔记](07_Teleoperation/LapSurgie__Humanoid_Robots_Performing_Surgery_via_Teleoperated_Handheld_Laparoscopy/LapSurgie__Humanoid_Robots_Performing_Surgery_via_Teleoperated_Handheld_Laparoscopy.md) | 2026-06-23 |     | ✅ 完成 |
| 337  | [Whole-Body Bilateral Teleoperation with Multi-Stage Object Parameter Estimation for Wheeled Humanoid Locomanipulation](https://arxiv.org/abs/2508.09846)      | 2025.08 |     | ⏳ 待读 |
| 338  | [CHILD: a Whole-Body Humanoid Teleoperation System](https://arxiv.org/abs/2508.00162)                                                                          | 2025.08 |     | ⏳ 待读 |
| 339  | CHILD: Controller for Humanoid Imitation and Live Demonstration a Whole-Body Humanoid Teleoperation System                                                     | 2025.08 |     | ⏳ 待读 |
| 340  | [CLONE: Closed-Loop Whole-Body Humanoid Teleoperation for Long-Horizon Tasks](https://arxiv.org/abs/2506.08931) ✅ [笔记](07_Teleoperation/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks.md) | 2026-07-02 |     | ✅ 已总结 |
| 341  | [Heavy lifting tasks via haptic teleoperation of a wheeled humanoid](https://arxiv.org/abs/2505.19530)                                                         | 2025.05 |     | ⏳ 待读 |
| 342  | [TeleOpBench: A Simulator-Centric Benchmark for Dual-Arm Dexterous Teleoperation](https://arxiv.org/abs/2505.12748)                                            | 2025.05 |     | ⏳ 待读 |
| 343  | [Human-Robot Collaboration for the Remote Control of Mobile Humanoid Robots](https://arxiv.org/abs/2505.05773)                                                 | 2025.05 |     | ⏳ 待读 |
| 344  | [NuExo: A Wearable Exoskeleton Covering all Upper Limb ROM for Outdoor Data Collection and Teleoperation of Humanoid Robots](https://arxiv.org/abs/2503.10554) | 2025.03 |     | ⏳ 待读 |
| 345  | [Generalizable Humanoid Manipulation with 3D Diffusion Policies](https://arxiv.org/abs/2410.10803)                                                             | 2024.10 |     | ⏳ 待读 |
| 346  | [High-Speed and Impact Resilient Teleoperation of Humanoid Robots](https://arxiv.org/abs/2409.04639v1)                                                         | 2024.09 |     | ⏳ 待读 |
| 347  | [Deep Imitation Learning for Humanoid Loco-manipulation through Human Teleoperation](https://arxiv.org/abs/2309.01952) ✅ [笔记](07_Teleoperation/TRILL__Deep_Imitation_Learning_for_Humanoid_Loco-manipulation_through_Human_Teleoperation/TRILL__Deep_Imitation_Learning_for_Humanoid_Loco-manipulation_through_Human_Teleoperation.md) | 2023.09 | 2026-09-05 | ✅ 已总结 |
| 348  | [Teleoperation of Humanoid Robots: A Survey](https://arxiv.org/abs/2301.04317)                                                                                 | 2023.01 |     | ⏳ 待读 |
| 349  | [iCub3 Avatar System: Enabling Remote Fully-Immersive Embodiment of Humanoid Robots](https://arxiv.org/abs/2203.06972)                                         | 2022.03 |     | ⏳ 待读 |
| 535  | [EgoPoser: Robust Real-Time Egocentric Pose Estimation from Sparse and Intermittent Observations Everywhere](https://arxiv.org/pdf/2308.06493) 🌟              | ECCV 2024 |     | ⏳ 待读 |
| 536  | [AvatarPoser: Articulated Full-Body Pose Tracking from Sparse Motion Sensing](https://arxiv.org/abs/2207.13784) 🌟                                             | ECCV 2022 |     | ⏳ 待读 |
| 537  | [A Mobile Robot Hand-Arm Teleoperation System by Vision and IMU](https://arxiv.org/pdf/2003.05212) 🌟                                                          | IROS 2020 |     | ⏳ 待读 |
| 555  | [Humanoid-GPT: Scaling Data and Structure for Zero-Shot Motion Tracking](https://arxiv.org/abs/2606.03985) 🌟 ✅ [笔记](07_Teleoperation/Humanoid-GPT__Scaling_Data_and_Structure_for_Zero-Shot_Motion_Tracking/Humanoid-GPT__Scaling_Data_and_Structure_for_Zero-Shot_Motion_Tracking.md) | 2026.06 | 2026-07-24 | ✅ 已总结 |
| 568  | [Teleopit: A Full-Embodiment Humanoid Teleoperation System](https://arxiv.org/abs/2608.01834) 🌟 ✅ [笔记](07_Teleoperation/Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System/Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System.md) | 2026.08 | 2026-08-14 | ✅ 已总结 |
| 578  | [Event-Based Upper-Body Humanoid Teleoperation Under Challenging Illumination](https://arxiv.org/abs/2607.29227) ✅ [笔记](07_Teleoperation/Event-Based_Upper-Body_Humanoid_Teleoperation_Under_Challenging_Illumination/Event-Based_Upper-Body_Humanoid_Teleoperation_Under_Challenging_Illumination.md) | 2026.07 | 2026-08-25 | ✅ 已总结 |
| 585  | [X-OP: Cross-Morphology Whole-Body Teleoperation via MPC Retargeting](https://arxiv.org/abs/2606.07934) ✅ [笔记](07_Teleoperation/X-OP__Cross-Morphology_Whole-Body_Teleoperation_via_MPC_Retargeting/X-OP__Cross-Morphology_Whole-Body_Teleoperation_via_MPC_Retargeting.md) | 2026.06 | 2026-09-10 | ✅ 已总结 |


### Navigation（22篇）


| #   | 论文                                                                                                                                                         | 日期      | 🌟  | 状态   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ---- |
| 350  | [EgoActor: Grounding Task Planning into Spatial-aware Egocentric Actions for Humanoid Robots via Visual-Language Models](https://arxiv.org/abs/2602.04515) ✅ [笔记](08_Navigation/EgoActor__Grounding_Task_Planning_into_Spatial-aware_Egocentric_Actions_for_Hum/EgoActor__Grounding_Task_Planning_into_Spatial-aware_Egocentric_Actions_for_Hum.md) | 2026.02 |     | ✅ 完成 |
| 351  | [FocusNav: Spatial Selective Attention with Waypoint Guidance for Humanoid Local Navigation](https://arxiv.org/abs/2601.12790) ✅ [笔记](08_Navigation/FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local/FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local.md) | 2026-05-19 |     | ✅ 完成 |
| 352  | [STATE-NAV: Stability-Aware Traversability Estimation for Bipedal Navigation on Rough Terrain](https://arxiv.org/abs/2506.01046) ✅ [笔记](08_Navigation/STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain/STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain.md) | 2026-05-20 |     | ✅ 完成 |
| 353  | [Thinking in 360: Humanoid Visual Search in the Wild](https://arxiv.org/abs/2511.20351) ✅ [笔记](08_Navigation/Thinking_in_360__Humanoid_Visual_Search_in_the_Wild/Thinking_in_360__Humanoid_Visual_Search_in_the_Wild.md) | 2026-05-26 |     | ✅ 完成 |
| 354  | [Quantum deep reinforcement learning for humanoid robot navigation task](https://arxiv.org/abs/2509.11388) ✅ [笔记](08_Navigation/Quantum_Deep_RL_for_Humanoid_Robot_Navigation/Quantum_Deep_RL_for_Humanoid_Robot_Navigation.md) | 2025.09 |     | ✅ 完成 |
| 355  | [LookOut: Real-World Humanoid Egocentric Navigation](https://arxiv.org/abs/2508.14466) ✅ [笔记](08_Navigation/LookOut__Real-World_Humanoid_Egocentric_Navigation/LookOut__Real-World_Humanoid_Egocentric_Navigation.md) | 2026-06-17 |     | ✅ 已总结 |
| 356  | [INTENTION: Inferring Tendencies of Humanoid Robot Motion Through Interactive Intuition and Grounded VLM](https://arxiv.org/abs/2508.04931) ✅ [笔记](08_Navigation/INTENTION__Inferring_Tendencies_of_Humanoid_Robot_Motion_Through_Interactive_Int/INTENTION__Inferring_Tendencies_of_Humanoid_Robot_Motion_Through_Interactive_Int.md) | 2025.08 |     | ✅ 已总结 |
| 357  | [Hand-Eye Autonomous Delivery: Learning Humanoid Navigation, Locomotion and Reaching](https://arxiv.org/abs/2508.03068)                                    | 2025.08 |     | ⏳ 待读 |
| 358  | [Humanoid Occupancy: Enabling A Generalized Multimodal Occupancy Perception System on Humanoid Robots](https://arxiv.org/abs/2507.20217)                    | 2025.07 |     | ⏳ 待读 |
| 359  | LOVON: Legged Open-Vocabulary Object Navigator                                                                                                             | 2025.07 |     | ⏳ 待读 |
| 360  | [RL with Data Bootstrapping for Dynamic Subgoal Pursuit in Humanoid Robot Navigation](https://arxiv.org/abs/2506.02206)                                    | 2025.06 |     | ⏳ 待读 |
| 361  | [HumanoidPano: Hybrid Spherical Panoramic-LiDAR Cross-Modal Perception for Humanoid Robots](https://arxiv.org/abs/2503.09010) ✅ [笔记](08_Navigation/HumanoidPano__Hybrid_Spherical_Panoramic-LiDAR_Cross-Modal_Perception/HumanoidPano__Hybrid_Spherical_Panoramic-LiDAR_Cross-Modal_Perception.md) | 2025.03 |     | ✅ 已总结 |
| 362  | [NaVILA: Legged Robot Vision-Language-Action Model for Navigation](https://arxiv.org/abs/2412.04453)                                                       | 2024.12 |     | ⏳ 待读 |
| 363  | [ARMOR: Egocentric Perception for Humanoid Robot Collision Avoidance and Motion Planning](https://arxiv.org/abs/2412.00396) ✅ [笔记](08_Navigation/ARMOR__Egocentric_Perception_for_Humanoid_Robot_Collision_Avoidance/ARMOR__Egocentric_Perception_for_Humanoid_Robot_Collision_Avoidance.md) | 2024.12 |     | ✅ 已总结 |
| 364  | [NoMaD: Goal Masked Diffusion Policies for Navigation and Exploration](https://arxiv.org/abs/2310.07896) ✅ [笔记](08_Navigation/NoMaD__Goal_Masked_Diffusion_Policies_for_Navigation_and_Exploration/NoMaD__Goal_Masked_Diffusion_Policies_for_Navigation_and_Exploration.md) | 2023.10 |     | ✅ 已总结 |
| 365  | [Gallant: Voxel Grid-based Humanoid Locomotion and Local-navigation across 3D Constrained Terrains](https://arxiv.org/abs/2511.14625) ✅ [笔记](08_Navigation/Gallant__Voxel_Grid-based_Humanoid_Locomotion_and_Local-navigation_across_3D_Constrained_Terrains/Gallant__Voxel_Grid-based_Humanoid_Locomotion_and_Local-navigation_across_3D_Constrained_Terrains.md) | 2025-11-18 |  | ✅ 已总结 |
| 366  | [Learning Social Navigation from Positive and Negative Demonstrations and Rule-Based Specifications](https://arxiv.org/abs/2508.06779) | 2025.08 |  | ⏳ 待读 |
| 367  | [NavDP: Learning Sim-to-Real Navigation Diffusion Policy with Privileged Information Guidance](https://arxiv.org/abs/2505.08712) | 2025.05 |  | ⏳ 待读 |
| 368  | [LOVON: Legged Open-Vocabulary Object Navigator](https://arxiv.org/abs/2507.06747) ✅ [笔记](08_Navigation/LOVON__Legged_Open-Vocabulary_Object_Navigator/LOVON__Legged_Open-Vocabulary_Object_Navigator.md) | 2025-07-09 |  | ✅ 已总结 |
| 369  | [GuideWalk: Learning Unified Autonomous Navigation and Locomotion for Humanoid Robots across Versatile Terrains](https://arxiv.org/abs/2606.10449) ✅ [笔记](08_Navigation/GuideWalk__Learning_Unified_Autonomous_Navigation_and_Locomotion_for_Humanoid/GuideWalk__Learning_Unified_Autonomous_Navigation_and_Locomotion_for_Humanoid.md) | 2026-06-09 |  | ✅ 已总结 |
| 579  | [HumanoidVLN: A Physics-Grounded Simulator and Benchmark for Vision-Language Navigation Across Diverse Humanoid Embodiments](https://arxiv.org/abs/2608.12860) ✅ [笔记](08_Navigation/HumanoidVLN__Physics-Grounded_Simulator_and_Benchmark_for_Vision-Language_Navigation/HumanoidVLN__Physics-Grounded_Simulator_and_Benchmark_for_Vision-Language_Navigation.md) | 2026-08-13 | 2026-08-26 | ✅ 已总结 |
| 584  | [EgoNav: Bridging Learned Waypoints and Geometry-Aware Local Control for Robust Indoor Navigation](https://arxiv.org/abs/2608.25642) ✅ [笔记](08_Navigation/EgoNav__Bridging_Learned_Waypoints_and_Geometry-Aware_Local_Control/EgoNav__Bridging_Learned_Waypoints_and_Geometry-Aware_Local_Control.md) | 2026-08-26 | 2026-09-06 | ✅ 已总结 |
| 586  | [TANGO: Humanoid Navigation in Cluttered Environments with a Whole-Body Vision-Language-Action Model](https://arxiv.org/abs/2609.09158) ✅ [笔记](08_Navigation/TANGO__Whole-Body_Vision-Language_Navigation_in_Cluttered_Environments/TANGO__Whole-Body_Vision-Language_Navigation_in_Cluttered_Environments.md) | 2026-09-08 | 2026-09-11 | ✅ 已总结 |


### State Estimation（18篇）


| #   | 论文                                                                                                                                       | 日期      | 🌟  | 状态   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ---- |
| —    | [Iterated Invariant EKF for Quadruped Robot Odometry](https://arxiv.org/abs/2604.15449) ✅ [笔记](09_State_Estimation/Iterated_Invariant_EKF_for_Quadruped_Robot_Odometry/Iterated_Invariant_EKF_for_Quadruped_Robot_Odometry.md) | 2026-04-16 | 2026-08-16 | ✅ 已总结 |
| —    | [OCELOT: Odometry and Contact Estimation for Legged Robots](https://arxiv.org/abs/2605.21863) ✅ [笔记](09_State_Estimation/OCELOT__Odometry_and_Contact_Estimation_for_Legged_Robots/OCELOT__Odometry_and_Contact_Estimation_for_Legged_Robots.md) | 2026-05-21 | 2026-08-05 | ✅ 已总结 |
| —    | [PRIME: Physically-consistent Robotic Inertial and Motion Estimation for Legged and Humanoid Robots](https://arxiv.org/abs/2605.17681) ✅ [笔记](09_State_Estimation/PRIME__Physically-consistent_Robotic_Inertial_and_Motion_Estimation/PRIME__Physically-consistent_Robotic_Inertial_and_Motion_Estimation.md) | 2026-05-17 | 2026-08-27 | ✅ 已总结 |
| 543  | [Learning Contact Representation for Leg Odometry](https://arxiv.org/abs/2606.05501) ✅ [笔记](09_State_Estimation/Learning_Contact_Representation_for_Leg_Odometry/Learning_Contact_Representation_for_Leg_Odometry.md) | 2026-06-03 |     | ✅ 已总结 |
| 539  | [Adaptive Invariant Extended Kalman Filter for Legged Robot State Estimation](https://arxiv.org/abs/2510.16755) ✅ [笔记](09_State_Estimation/Adaptive_Invariant_Extended_Kalman_Filter_for_Legged_Robot_State_Estimation/Adaptive_Invariant_Extended_Kalman_Filter_for_Legged_Robot_State_Estimation.md) | 2025.10 |     | ✅ 已总结 |
| 368  | [AutoOdom: Learning Auto-regressive Proprioceptive Odometry for Legged Locomotion](https://arxiv.org/abs/2511.18857) ✅ [笔记](09_State_Estimation/AutoOdom__Learning_Auto-regressive_Proprioceptive_Odometry_for_Legged_Locomotio/AutoOdom__Learning_Auto-regressive_Proprioceptive_Odometry_for_Legged_Locomotio.md)                     | 2025.11 |     | ✅ 完成 |
| 369  | [InEKFormer: A Hybrid State Estimator for Humanoid Robots](https://arxiv.org/abs/2511.16306) ✅ [笔记](09_State_Estimation/InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots/InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots.md)                                             | 2025.11 |     | ✅ 完成 |
| 370  | [Physics-Informed Neural Networks with Unscented Kalman Filter for Sensorless Joint Torque Estimation](https://arxiv.org/abs/2507.10105) ✅ [笔记](09_State_Estimation/Physics-Informed_Neural_Networks_with_UKF_for_Sensorless_Joint_Torque_Estimation/Physics-Informed_Neural_Networks_with_UKF_for_Sensorless_Joint_Torque_Estimation.md) | 2025.07 |     | ✅ 完成 |
| 371  | [An Empirical Evaluation of Four Off-the-Shelf Proprietary Visual-Inertial Odometry Systems](https://arxiv.org/abs/2207.06780) ✅ [笔记](09_State_Estimation/An_Empirical_Evaluation_of_Four_Off-the-Shelf_Proprietary_VIO_Systems/An_Empirical_Evaluation_of_Four_Off-the-Shelf_Proprietary_VIO_Systems.md) | 2026-05-27 |     | ✅ 完成 |
| 372  | [Contact-Aided Invariant Extended Kalman Filtering for Robot State Estimation](https://arxiv.org/abs/1904.09251) ✅ [笔记](09_State_Estimation/Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.md) | 2019.04 |     | ✅ 完成 |
| 373  | [Legged Robot State-Estimation Through Combined Forward Kinematic and Preintegrated Contact Factors](https://arxiv.org/abs/1712.05873) ✅ [笔记](09_State_Estimation/Legged_Robot_State-Estimation_via_Forward_Kinematic_and_Preintegrated_Contact_Factors/Legged_Robot_State-Estimation_via_Forward_Kinematic_and_Preintegrated_Contact_Factors.md)   | 2017.05 |     | ✅ 完成 |
| 374  | [The invariant extended Kalman filter as a stable observer](https://arxiv.org/abs/1410.1465) ✅ [笔记](09_State_Estimation/The_Invariant_Extended_Kalman_Filter_as_a_Stable_Observer/The_Invariant_Extended_Kalman_Filter_as_a_Stable_Observer.md) | 2014.10 | 2026-06-25 | ✅ 已总结 |
| —    | [GAIT: Legged Robot Proprioceptive State Estimation with Attention over Inertial-Leg Tokens](https://arxiv.org/abs/2606.14160) ✅ [笔记](09_State_Estimation/GAIT__Legged_Robot_Proprioceptive_State_Estimation_with_Attention_over_Inertia/GAIT__Legged_Robot_Proprioceptive_State_Estimation_with_Attention_over_Inertia.md) | 2026.06 | 2026-07-04 | ✅ 已总结 |
| 285  | [Proprioceptive Invariant State Estimation for Humanoid Robots on Non-Inertial Ground](https://arxiv.org/abs/2606.19512) ✅ [笔记](09_State_Estimation/Proprioceptive_Invariant_State_Estimation_for_Humanoid_Robots_on_Non-Inertial_Ground/Proprioceptive_Invariant_State_Estimation_for_Humanoid_Robots_on_Non-Inertial_Ground.md) | 2026-06-17 | 2026-07-15 | ✅ 已总结 |
| 587  | [KILVO: Kinematic-Inertial-LiDAR-Visual Odometry with Robust Multimodal Adaptation for Humanoid Robots](https://arxiv.org/abs/2608.05647) ✅ [笔记](09_State_Estimation/KILVO__Kinematic-Inertial-LiDAR-Visual_Odometry_for_Humanoid_Robots/KILVO__Kinematic-Inertial-LiDAR-Visual_Odometry_for_Humanoid_Robots.md) | 2026-08-06 | 2026-09-12 | ✅ 已总结 |
| 375  | GTSAM: Factor graphs for Sensor Fusion in Robotics                                                                                       | -       |     | ⏳ 待读 |
| 376  | Kimera: an Open-Source Library for Real-Time Metric-Semantic Localization and Mapping                                                    | -       |     | ⏳ 待读 |
| 377  | [ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual-Inertial and Multi-Map SLAM](https://arxiv.org/abs/2007.11898) ✅ [笔记](09_State_Estimation/ORB-SLAM3__Visual_Visual-Inertial_and_Multi-Map_SLAM/ORB-SLAM3__Visual_Visual-Inertial_and_Multi-Map_SLAM.md) | 2020-07-23 | 🌟 | ✅ 已总结 |
| 378  | VINS-Fusion: An optimization-based multi-sensor state estimator | - |  | ⏳ 待读 |


### Sim-to-Real（16篇）


| #   | 论文                                                                                                                                             | 日期      | 🌟  | 状态   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ---- |
| —    | [Bridging the Sim-to-Real Gap in Parallel-Link Leg Mechanisms via Simulator-Side Dynamics Normalization](https://arxiv.org/abs/2608.01697) ✅ [笔记](10_Sim-to-Real/Bridging_the_Sim-to-Real_Gap_in_Parallel-Link_Leg_Mechanisms/Bridging_the_Sim-to-Real_Gap_in_Parallel-Link_Leg_Mechanisms.md) | 2026-08-03 | 2026-08-17 | ✅ 已总结 |
| 588  | [World Translation: Minimizing Sim-to-Real Gap with Backward Dynamics Extraction and Unpaired Domain Translation](https://arxiv.org/abs/2607.18154) ✅ [笔记](10_Sim-to-Real/World_Translation__Minimizing_Sim-to-Real_Gap_via_Backward_Dynamics_Extraction/World_Translation__Minimizing_Sim-to-Real_Gap_via_Backward_Dynamics_Extraction.md) | 2026-07-20 | 2026-09-13 | ✅ 已总结 |
| —    | [Actuator Reality Shaping for Zero-Shot Sim-to-Real Robot Learning](https://arxiv.org/abs/2607.02205) ✅ [笔记](10_Sim-to-Real/Actuator_Reality_Shaping_for_Zero-Shot_Sim-to-Real_Robot_Learning/Actuator_Reality_Shaping_for_Zero-Shot_Sim-to-Real_Robot_Learning.md) | 2026-07-02 | 2026-08-06 | ✅ 已总结 |
| —    | [FADA: Few-Shot Domain Adaptation via Dynamics Alignment for Humanoid Control](https://arxiv.org/abs/2606.28476) ✅ [笔记](10_Sim-to-Real/FADA__Few-Shot_Domain_Adaptation_via_Dynamics_Alignment_for_Humanoid_Control/FADA__Few-Shot_Domain_Adaptation_via_Dynamics_Alignment_for_Humanoid_Control.md) | 2026-06-26 |     | ✅ 已总结 |
| 551  | [Simulator Adaptation for Sim-to-Real Learning of Legged Locomotion via Proprioceptive Distribution Matching](https://arxiv.org/abs/2604.11090) ✅ [笔记](10_Sim-to-Real/Simulator_Adaptation_via_Proprioceptive_Distribution_Matching/Simulator_Adaptation_via_Proprioceptive_Distribution_Matching.md) | 2026-04-13 |     | ✅ 已总结 |
| 540  | [HALO: Closing Sim-to-Real Gap for Heavy-loaded Humanoid Agile Motion Skills via Differentiable Simulation](https://arxiv.org/abs/2603.15084) ✅ [笔记](10_Sim-to-Real/HALO_Closing_Sim-to-Real_Gap_for_Heavy-loaded_Humanoid_Agile_Motion/HALO_Closing_Sim-to-Real_Gap_for_Heavy-loaded_Humanoid_Agile_Motion.md) | 2026.03 |     | ✅ 已总结 |
| 379  | [RAPT: Model-Predictive Out-of-Distribution Detection and Failure Diagnosis for Sim-to-Real Humanoid Robots](https://arxiv.org/abs/2602.01515) | 2026.02 |     | ✅ 完成 |
| 380  | [Towards Bridging the Gap between Large-Scale Pretraining and Efficient Finetuning for Humanoid Control](https://arxiv.org/abs/2601.21363)     | 2026-05-19 |     | ✅ 完成 |
| 381  | [PolySim: Bridging the Sim-to-Real Gap for Humanoid Control via Multi-Simulator Dynamics Randomization](https://arxiv.org/abs/2510.01708) ✅ [笔记](10_Sim-to-Real/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.md) | 2026-05-20 |     | ✅ 已总结 |
| 382  | [Contrastive Representation Learning for Robust Sim-to-Real Transfer of Adaptive Humanoid Locomotion](https://arxiv.org/abs/2509.12858) ✅ [笔记](10_Sim-to-Real/Contrastive_Representation_Learning_for_Adaptive_Humanoid_Locomotion/Contrastive_Representation_Learning_for_Adaptive_Humanoid_Locomotion.md) | 2026-05-28 |     | ✅ 已总结 |
| 383  | [Towards bridging the gap: Systematic sim-to-real transfer for diverse legged robots](https://arxiv.org/abs/2509.06342) ✅ [笔记](10_Sim-to-Real/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots.md) | 2026-06-08 |     | ✅ 已总结 |
| 384  | [Robot Trains Robot: Automatic Real-World Policy Adaptation and Learning for Humanoids](https://arxiv.org/abs/2508.12252) ✅ [笔记](10_Sim-to-Real/Robot_Trains_Robot_Automatic_Real-World_Policy_Adaptation_and_Learning/Robot_Trains_Robot_Automatic_Real-World_Policy_Adaptation_and_Learning.md) | 2025.08 |     | ✅ 已总结 |
| 385  | [DiffCoTune: Differentiable Co-Tuning for Cross-domain Robot Control](https://arxiv.org/abs/2505.24068)                                        | 2025.05 |     | ⏳ 待读 |
| 385a | [Sampling-Based System Identification with Active Exploration for Legged Robot Sim2Real Learning](https://arxiv.org/abs/2505.14266) ✅ [笔记](10_Sim-to-Real/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration.md) | 2025.05 | 🌟 | ✅ 已总结 |
| 386  | [Sim-to-Real of Humanoid Locomotion Policies via Joint Torque Space Perturbation Injection](https://arxiv.org/abs/2504.06585) ✅ [笔记](10_Sim-to-Real/Sim-to-Real_Humanoid_Locomotion_via_Joint_Torque_Space_Perturbation_Injection/Sim-to-Real_Humanoid_Locomotion_via_Joint_Torque_Space_Perturbation_Injection.md) | 2025.04 |     | ✅ 已总结 |
| 387  | [Bridging the Sim-to-Real Gap for Athletic Loco-Manipulation](https://arxiv.org/abs/2502.10894) ✅ [笔记](10_Sim-to-Real/Bridging_the_Sim-to-Real_Gap_for_Athletic_Loco-Manipulation/Bridging_the_Sim-to-Real_Gap_for_Athletic_Loco-Manipulation.md) | 2025.02 | 🌟 | ✅ 已总结 |
| 388  | [Learning Agile and Dynamic Motor Skills for Legged Robots](https://arxiv.org/abs/1901.08652)                                                  | 2019.01 |     | ⏳ 待读 |


### Simulation Benchmark（23篇）


| #   | 论文                                                                                                                                         | 日期      | 🌟  | 状态   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --- | ---- |
| 389  | [GRUtopia: Dream General Robots in a City at Scale](https://arxiv.org/abs/2407.10943)                                                      | 2407.10 |     | ✅ 完成 |
| 390  | [Towards Motion Turing Test: Evaluating Human-Likeness in Humanoid Robots](https://arxiv.org/abs/2603.06181) ✅ [笔记](11_Simulation_Benchmark/Towards_Motion_Turing_Test__Evaluating_Human-Likeness_in_Humanoid_Robots/Towards_Motion_Turing_Test__Evaluating_Human-Likeness_in_Humanoid_Robots.md) | 2026.03 |     | ✅ 已总结 |
| 391  | [MolmoSpaces: A Large-Scale Open Ecosystem for Robot Navigation and Manipulation](https://arxiv.org/abs/2602.11337) ✅ [笔记](11_Simulation_Benchmark/MolmoSpaces__A_Large-Scale_Open_Ecosystem_for_Robot_Navigation_and_Manipulation/MolmoSpaces__A_Large-Scale_Open_Ecosystem_for_Robot_Navigation_and_Manipulation.md) | 2026.02 |     | ✅ 已总结 |
| 392  | [Benchmarking Humanoid Imitation Learning with Motion Difficulty](https://arxiv.org/abs/2512.07248) ✅ [笔记](11_Simulation_Benchmark/Benchmarking_Humanoid_Imitation_Learning_with_Motion_Difficulty/Benchmarking_Humanoid_Imitation_Learning_with_Motion_Difficulty.md) | 2026-05-29 |     | ✅ 已总结 |
| 393  | [Generative World Modelling for Humanoids: 1X World Model Challenge Technical Report](https://arxiv.org/abs/2510.07092) ✅ [笔记](11_Simulation_Benchmark/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report.md) | 2025.10 |     | ✅ 已总结 |
| 394  | [HumanoidGen: Data Generation for Bimanual Dexterous Manipulation via LLM Reasoning](https://arxiv.org/abs/2507.00833)                     | 2025.07 |     | ⏳ 待读 |
| 395  | [DualTHOR: A Dual-Arm Humanoid Simulation Platform for Contingency-Aware Planning](https://arxiv.org/abs/2506.16012)                       | 2025.06 |     | ⏳ 待读 |
| 396  | [Learning with pyCub: A Simulation and Exercise Framework for Humanoid Robotics](https://arxiv.org/abs/2506.01756)                         | 2025.06 |     | ⏳ 待读 |
| 397  | [Humanoid World Models: Open World Foundation Models for Humanoid Robotics](https://arxiv.org/abs/2506.01182)                              | 2025.06 |     | ⏳ 待读 |
| 398  | [Mimicking-Bench: A Benchmark for Generalizable Humanoid-Scene Interaction Learning via Human Mimicking](https://arxiv.org/abs/2412.17730) | 2024.12 |     | ⏳ 待读 |
| 399  | [ManiSkill-HAB: A Benchmark for Low-Level Manipulation in Home Rearrangement Tasks](https://arxiv.org/abs/2412.13211)                      | 2024.12 |     | ⏳ 待读 |
| 400  | Genesis: A Generative and Universal Physics Engine for Robotics and Beyond                                                                 | 2024.12 |     | ⏳ 待读 |
| 401  | [DexMimicGen: Automated Data Generation for Bimanual Dexterous Manipulation via Imitation Learning](https://arxiv.org/abs/2410.24185)      | 2024.10 |     | ⏳ 待读 |
| 402  | [ManiSkill3: GPU Parallelized Robotics Simulation and Rendering for Generalizable Embodied AI](https://arxiv.org/abs/2410.00425)           | 2024.10 |     | ⏳ 待读 |
| 403  | [BiGym: A Demo-Driven Mobile Bi-Manual Manipulation Benchmark](https://arxiv.org/abs/2407.07788)                                           | 2024.07 |     | ⏳ 待读 |
| 404  | [RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots](https://arxiv.org/abs/2406.02523)                               | 2024.06 |     | ⏳ 待读 |
| 405  | [Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer](https://arxiv.org/abs/2404.05695)               | 2024.04 |     | ⏳ 待读 |
| 406  | [HumanoidBench: Simulated Humanoid Benchmark for Whole-Body Locomotion and Manipulation](https://arxiv.org/abs/2403.10506)                 | 2024.03 |     | ⏳ 待读 |
| 407  | RoboCasa365: A Large-Scale Simulation Framework for Training and Benchmarking Generalist Robots                                            | -       |     | ⏳ 待读 |
| 408  | [ComFree-Sim: A GPU-Parallelized Analytical Contact Physics Engine for Scalable Contact-Rich Robotics Simulation and Control](https://arxiv.org/abs/2603.12185) ✅ [笔记](11_Simulation_Benchmark/ComFree-Sim__GPU-Parallelized_Analytical_Contact_Physics_Engine/ComFree-Sim__GPU-Parallelized_Analytical_Contact_Physics_Engine.md) | 2026.03 |  | ✅ 已总结 |
| 409  | [Humanoid Everyday: A Comprehensive Robotic Dataset for Open-World Humanoid Manipulation](https://arxiv.org/abs/2510.08807) ✅ [笔记](11_Simulation_Benchmark/Humanoid_Everyday__Comprehensive_Robotic_Dataset_for_Open-World_Humanoid_Manipulation/Humanoid_Everyday__Comprehensive_Robotic_Dataset_for_Open-World_Humanoid_Manipulation.md) | 2025.10 |  | ✅ 已总结 |
| 552  | [GRAIL: Generating Humanoid Loco-Manipulation from 3D Assets and Video Priors](https://arxiv.org/abs/2606.05160) ✅ [笔记](11_Simulation_Benchmark/GRAIL__Generating_Humanoid_Loco-Manipulation_from_3D_Assets_and_Video_Priors/GRAIL__Generating_Humanoid_Loco-Manipulation_from_3D_Assets_and_Video_Priors.md) | 2026-06-03 |  | ✅ 已总结 |
| 553  | [SIMPLE: Simulation-Based Policy Learning and Evaluation for Humanoid Loco-manipulation](https://arxiv.org/abs/2606.08278) ✅ [笔记](11_Simulation_Benchmark/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation.md) | 2026-06-06 | 🌟 | ✅ 已总结 |
| 527  | [MuJoCo Playground: An Open-Source Framework for GPU-Accelerated Robot Learning and Sim-to-Real Transfer](https://arxiv.org/abs/2502.08844) ✅ [笔记](11_Simulation_Benchmark/MuJoCo_Playground__An_Open-Source_Framework_for_GPU-Accelerated_Robot_Learning/MuJoCo_Playground__An_Open-Source_Framework_for_GPU-Accelerated_Robot_Learning.md) | 2025.01 | 🌟 | ✅ 已总结 |
| 560  | [Labimus: A Simulation and Benchmark for Humanoid Dexterous Manipulation in Chemical Laboratory](https://arxiv.org/abs/2606.31037) ✅ [笔记](11_Simulation_Benchmark/Labimus__A_Simulation_and_Benchmark_for_Humanoid_Dexterous_Manipulation_in_Chemical_Lab/Labimus__A_Simulation_and_Benchmark_for_Humanoid_Dexterous_Manipulation_in_Chemical_Lab.md) | 2026-06-30 |     | ✅ 已总结 |
| 564  | [RoboDojo: A Unified Sim-and-Real Benchmark for Comprehensive Evaluation of Generalist Robot Manipulation Policies](https://arxiv.org/abs/2607.04434) ✅ [笔记](11_Simulation_Benchmark/RoboDojo__A_Unified_Sim-and-Real_Benchmark_for_Generalist_Manipulation_Policies/RoboDojo__A_Unified_Sim-and-Real_Benchmark_for_Generalist_Manipulation_Policies.md) | 2026-07 | 🌟 | ✅ 已总结 |
| 589  | [HumanoidMimicGen: Data Generation for Loco-Manipulation via Whole-Body Planning](https://arxiv.org/abs/2605.27724) ✅ [笔记](11_Simulation_Benchmark/HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning/HumanoidMimicGen__Data_Generation_for_Loco-Manipulation_via_Whole-Body_Planning.md) | 2026-05-26 |  | ✅ 已总结 |


### Hardware Design（40篇）


| #   | 论文                                                                                                                                                                     | 日期      | 🌟  | 状态   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ---- |
| 590  | [A Dual-Cam Parallel Elastic Actuator with Shared Gas-Spring Compensation for Humanoid Ankles](https://arxiv.org/abs/2608.30832) ✅ [笔记](12_Hardware_Design/Dual-Cam_Parallel_Elastic_Actuator_with_Shared_Gas-Spring_for_Humanoid_Ankles/Dual-Cam_Parallel_Elastic_Actuator_with_Shared_Gas-Spring_for_Humanoid_Ankles.md) | 2026-08-31 |  | ✅ 已总结 |
| 572  | [Handroid: Bridging Dexterous Hand and Humanoid](https://arxiv.org/abs/2607.16187) ✅ [笔记](12_Hardware_Design/Handroid__Bridging_Dexterous_Hand_and_Humanoid/Handroid__Bridging_Dexterous_Hand_and_Humanoid.md) | 2026-07-17 | 🌟 | ✅ 已总结 |
| 565  | [MIDAS Hand: Modular low-Impedance Direct-drive Anthropomorphic Sensing Hand](https://arxiv.org/abs/2607.14487) ✅ [笔记](12_Hardware_Design/MIDAS_Hand__Modular_low-Impedance_Direct-drive_Anthropomorphic_Sensing_Hand/MIDAS_Hand__Modular_low-Impedance_Direct-drive_Anthropomorphic_Sensing_Hand.md) | 2026-07 | 🌟 | ✅ 已总结 |
| 410  | [Characteristics, Management, and Utilization of Muscles in Musculoskeletal Humanoids](https://arxiv.org/abs/2602.08518) ✅ [笔记](12_Hardware_Design/Characteristics_Management_and_Utilization_of_Muscles_in_Musculoskeletal_Humanoids/Characteristics_Management_and_Utilization_of_Muscles_in_Musculoskeletal_Humanoids.md) | 2026-05-23 |     | ✅ 已总结 |
| 411  | [Fauna Sprout: A lightweight, approachable, developer-ready humanoid robot](https://arxiv.org/abs/2601.18963) ✅ [笔记](12_Hardware_Design/Fauna_Sprout_A_lightweight_approachable_developer-ready_humanoid_robot/Fauna_Sprout_A_lightweight_approachable_developer-ready_humanoid_robot.md) | 2026-05-24 |     | ✅ 已总结 |
| 412  | [Antagonistic Bowden-Cable Actuation of a Lightweight Robotic Hand: Toward Dexterous Manipulation for Payload Constrained Humanoids](https://arxiv.org/abs/2512.24657) ✅ [笔记](12_Hardware_Design/Antagonistic_Bowden-Cable_Actuation_of_a_Lightweight_Robotic_Hand/Antagonistic_Bowden-Cable_Actuation_of_a_Lightweight_Robotic_Hand.md) | 2026-05-20 |     | ✅ 已总结 |
| 413  | [Olaf: Bringing an Animated Character to Life in the Physical World](https://arxiv.org/abs/2512.16705) ✅ [笔记](12_Hardware_Design/Olaf_Bringing_an_Animated_Character_to_Life_in_the_Physical_World/Olaf_Bringing_an_Animated_Character_to_Life_in_the_Physical_World.md) | 2026-05-27 |     | ✅ 已总结 |
| 414  | [OSMO: Open-Source Tactile Glove for Human-to-Robot Skill Transfer](https://arxiv.org/abs/2512.08920) ✅ [笔记](12_Hardware_Design/OSMO_Open-Source_Tactile_Glove_for_Human-to-Robot_Skill_Transfer/OSMO_Open-Source_Tactile_Glove_for_Human-to-Robot_Skill_Transfer.md) | 2026-06-10 |     | ✅ 已总结 |
| 415  | [DIJIT: A Robotic Head for an Active Observer](https://arxiv.org/abs/2512.07998) ✅ [笔记](12_Hardware_Design/DIJIT_A_Robotic_Head_for_an_Active_Observer/DIJIT_A_Robotic_Head_for_an_Active_Observer.md) | 2026-06-11 |     | ✅ 已总结 |
| 544  | [X2-N: A Transformable Wheel-legged Humanoid Robot with Dual-mode Locomotion and Manipulation](https://arxiv.org/abs/2604.21541) ✅ [笔记](12_Hardware_Design/X2-N__Transformable_Wheel-legged_Humanoid_Robot_with_Dual-mode_Locomotion_and_Manipulation/X2-N__Transformable_Wheel-legged_Humanoid_Robot_with_Dual-mode_Locomotion_and_Manipulation.md) | 2026-04 |     | ✅ 已总结 |
| 416  | [DecARt Leg: Design and Evaluation of a Novel Humanoid Robot Leg with Decoupled Actuation for Agile Locomotion](https://arxiv.org/abs/2511.10021)                      | 2025.11 |     | ⏳ 待读 |
| 417  | [Human-Level Actuation for Humanoids](https://arxiv.org/abs/2511.06796) ✅ [笔记](12_Hardware_Design/Human-Level_Actuation_for_Humanoids/Human-Level_Actuation_for_Humanoids.md) | 2025-11-10 |     | ✅ 已总结 |
| 418  | [Toward Humanoid Brain-Body Co-design: Joint Optimization of Control and Morphology for Fall Recovery](https://arxiv.org/abs/2510.22336)                               | 2025.10 |     | ⏳ 待读 |
| 419  | [Embracing Evolution: A Call for Body-Control Co-Design in Embodied Humanoid Robot](https://arxiv.org/abs/2510.03081) ✅ [笔记](12_Hardware_Design/Embracing_Evolution_A_Call_for_Body-Control_Co-Design_in_Embodied_Humanoid_Robot/Embracing_Evolution_A_Call_for_Body-Control_Co-Design_in_Embodied_Humanoid_Robot.md) | 2025-10-03 |     | ✅ 已总结 |
| 420  | [Evolutionary Continuous Adaptive RL-Powered Co-Design for Humanoid Chin-Up Performance](https://arxiv.org/abs/2509.26082)                                             | 2025.09 |     | ⏳ 待读 |
| 421  | [A Framework for Optimal Ankle Design of Humanoid Robots](https://arxiv.org/abs/2509.16469)                                                                            | 2025.09 |     | ⏳ 待读 |
| 422  | [CAD-Driven Co-Design for Flight-Ready Jet-Powered Humanoids](https://arxiv.org/abs/2509.14935)                                                                        | 2025.09 |     | ⏳ 待读 |
| 423  | [AGILOped: Agile Open-Source Humanoid Robot for Research](https://arxiv.org/abs/2509.09364)                                                                            | 2025.09 |     | ⏳ 待读 |
| 424  | [A 21-DOF Humanoid Dexterous Hand with Hybrid SMA-Motor Actuation: CYJ Hand-0](https://arxiv.org/abs/2507.14538)                                                       | 2025.07 |     | ⏳ 待读 |
| 425  | [Dexterous Teleoperation of 20-DoF ByteDexter Hand via Human Motion Retargeting](https://arxiv.org/abs/2507.03227)                                                     | 2025.07 |     | ⏳ 待读 |
| 426  | [PIMBS: Efficient Body Schema Learning for Musculoskeletal Humanoids](https://arxiv.org/abs/2506.20343)                                                                | 2025.06 |     | ⏳ 待读 |
| 427  | [Explosive Output to Enhance Jumping Ability: A Variable Reduction Ratio Design Paradigm for Humanoid Robots Knee Joint](https://arxiv.org/abs/2506.12314)             | 2025.06 |     | ⏳ 待读 |
| 428  | [RAPID Hand: A Robust, Affordable, Perception-Integrated, Dexterous Manipulation Platform for Generalist Robot Autonomy](https://arxiv.org/abs/2506.07490)             | 2025.06 |     | ⏳ 待读 |
| 429  | [iRonCub 3: The Jet-Powered Flying Humanoid Robot](https://arxiv.org/abs/2506.01125)                                                                                   | 2025.06 |     | ⏳ 待读 |
| 430  | [Berkeley Humanoid Lite: An Open-source, Accessible, and Customizable 3D-printed Humanoid Robot](https://arxiv.org/abs/2504.17249)                                     | 2025.04 |     | ⏳ 待读 |
| 431  | [RUKA: Rethinking the Design of Humanoid Hands with Learning](https://arxiv.org/abs/2504.13165)                                                                        | 2025.04 |     | ⏳ 待读 |
| 432  | [ORCA: Open-Source, Reliable, Cost-Effective, Anthropomorphic Robotic Hand for Uninterrupted Dexterous Task Learning](https://arxiv.org/abs/2504.04259)                | 2025.04 |     | ⏳ 待读 |
| 433  | [Control of Humanoid Robots with Parallel Mechanisms using Kinematic Actuation Models](https://arxiv.org/abs/2503.22459)                                               | 2025.03 |     | ⏳ 待读 |
| 434  | [Exceeding the Maximum Speed Limit of the Joint Angle for the Redundant Tendon-driven Structures of Musculoskeletal Humanoids](https://arxiv.org/abs/2502.12808)       | 2025.02 |     | ⏳ 待读 |
| 435  | [ToddlerBot: Open-Source ML-Compatible Humanoid Platform for Loco-Manipulation](https://arxiv.org/abs/2502.00893)                                                      | 2025.02 |     | ⏳ 待读 |
| 436  | [Design and Control of a Bipedal Robotic Character](https://arxiv.org/abs/2501.05204)                                                                                  | 2025.01 |     | ⏳ 待读 |
| 437  | [The Duke Humanoid: Design and Control For Energy Efficient Bipedal Locomotion Using Passive Dynamics](https://arxiv.org/abs/2409.19795)                               | 2024.09 |     | ⏳ 待读 |
| 438  | [The MIT Humanoid Robot: Design, Motion Planning, and Control For Acrobatic Behaviors](https://arxiv.org/abs/2104.09025)                                               | 2021.04 |     | ⏳ 待读 |
| 439  | [Quasi-Direct Drive for Low-Cost Compliant Robotic Manipulation](https://arxiv.org/abs/1904.03815)                                                                     | 2019.04 |     | ⏳ 待读 |
| 440  | Micro-Wheeled_leg-Robot                                                                                                                                                | -       |     | ⏳ 待读 |
| 441  | Aero Hand Open                                                                                                                                                         | -       |     | ⏳ 待读 |
| 442  | DexWrist: A Robotic Wrist for Constrained and Dynamic Manipulation                                                                                                     | -       |     | ⏳ 待读 |
| 443  | ByteWrist: A Parallel Robotic Wrist Enabling Flexible and Anthropomorphic Motion for Confined Spaces                                                                   | -       |     | ⏳ 待读 |
| 444  | Integrated linkage-driven dexterous anthropomorphic robotic hand                                                                                                       | -       |     | ⏳ 待读 |
| 445  | Proprioceptive actuator design in the MIT Cheetah: Impact mitigation and high‑bandwidth physical interaction for dynamic legged robots                                 | -       |     | ⏳ 待读 |
| 446  | [Berkeley Humanoid: A Research Platform for Learning-based Control](https://arxiv.org/abs/2407.21781) | 2024.07 | 🌟 | ⏳ 待读 |
| 531  | [Zeroth Bot](https://github.com/zeroth-robotics/zeroth-bot)                                                                                                            | -       |     | ⏳ 待读 |


### Physics-Based Character Animation（30篇）


| #   | 论文                                                                                                                                               | 日期      | 🌟  | 状态   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --- | ---- |
| 591  | [SLMP: Spherical Latent Motion Prior for Physics-Based Simulated Humanoid Control](https://arxiv.org/abs/2603.01294) ✅ [笔记](13_Physics-Based_Animation/SLMP__Spherical_Latent_Motion_Prior_for_Physics-Based_Humanoid_Control/SLMP__Spherical_Latent_Motion_Prior_for_Physics-Based_Humanoid_Control.md) | 2026-03-01 |     | ✅ 已总结 |
| 573  | [Lambda-Hold Control: Human-Like Movement Emerges from a Minimal Task Reward in Predictive Musculoskeletal Simulation](https://arxiv.org/abs/2608.17030) ✅ [笔记](13_Physics-Based_Animation/Lambda-Hold_Control__Human-Like_Movement_from_Minimal_Task_Reward/Lambda-Hold_Control__Human-Like_Movement_from_Minimal_Task_Reward.md) | 2026-08-17 | 🌟 | ✅ 已总结 |
| 447  | Spatial relationship preserving character motion adaptation                                                                                      | 3349.17 |     | ⏳ 待读 |
| 448  | [Iterative Closed-Loop Motion Synthesis for Scaling the Capabilities of Humanoid Control](https://arxiv.org/abs/2602.21599) [笔记](13_Physics-Based_Animation/Iterative_Closed-Loop_Motion_Synthesis/Iterative_Closed-Loop_Motion_Synthesis.md) | 2026-05-17 |     | ✅ 完成 |
| 449  | [CRISP: Contact-Guided Real2Sim from Monocular Video with Planar Scene Primitives](https://arxiv.org/abs/2512.14696) [笔记](13_Physics-Based_Animation/CRISP__Contact-Guided_Real2Sim_from_Monocular_Video_with_Planar_Scene_Primit/CRISP__Contact-Guided_Real2Sim_from_Monocular_Video_with_Planar_Scene_Primit.md) | 2026-05-19 |     | ✅ 完成 |
| 450  | [Learning to Control Physically-simulated 3D Characters via Generating and Mimicking 2D Motions](https://arxiv.org/abs/2512.08500) [笔记](13_Physics-Based_Animation/Mimic2DM__Generating_and_Mimicking_2D_Motions_for_3D_Character_Control/Mimic2DM__Generating_and_Mimicking_2D_Motions_for_3D_Character_Control.md) | 2025.12 |     | ✅ 完成 |
| 451  | [PhysHMR: Learning Humanoid Control Policies from Vision for Physically Plausible Human Motion Reconstruction](https://arxiv.org/abs/2510.02566) [笔记](13_Physics-Based_Animation/PhysHMR__Learning_Humanoid_Control_Policies_from_Vision_for_Physical_HMR/PhysHMR__Learning_Humanoid_Control_Policies_from_Vision_for_Physical_HMR.md) | 2026-05-31 |     | ✅ 完成 |
| 452  | [Learning to Ball: Composing Policies for Long-Horizon Basketball Moves](https://arxiv.org/abs/2509.22442) [笔记](13_Physics-Based_Animation/Learning_to_Ball__Composing_Policies_for_Long-Horizon_Basketball_Moves/Learning_to_Ball__Composing_Policies_for_Long-Horizon_Basketball_Moves.md) | 2026-06-11 |     | ✅ 完成 |
| 554  | [RobotDancing: Residual-Action RL Enables Robust Long-Horizon Humanoid Motion Tracking](https://arxiv.org/abs/2509.20717) [笔记](13_Physics-Based_Animation/RobotDancing__Residual-Action_RL_Enables_Robust_Long-Horizon_Motion_Tracking/RobotDancing__Residual-Action_RL_Enables_Robust_Long-Horizon_Motion_Tracking.md) | 2026-07-08 |     | ✅ 完成 |
| 453  | [RobotDancing: Residual-Action RL Enables Robust Long-Horizon Humanoid Motion Tracking](https://arxiv.org/abs/2509.20717)                        | 2025.09 |     | ⏳ 待读 |
| 454  | [SimGenHOI: Physically Realistic Whole-Body Humanoid-Object Interaction via Generative Modeling and RL](https://arxiv.org/abs/2508.14120) [笔记](13_Physics-Based_Animation/SimGenHOI__Physically_Realistic_Whole-Body_Humanoid-Object_Interaction/SimGenHOI__Physically_Realistic_Whole-Body_Humanoid-Object_Interaction.md) | 2025.08 |     | ✅ 完成 |
| 455  | [Humanoid Robot Acrobatics Utilizing Complete Articulated Rigid Body Dynamics](https://arxiv.org/abs/2508.08258) ✅ [笔记](13_Physics-Based_Animation/Humanoid_Robot_Acrobatics_Utilizing_Complete_Articulated_Rigid_Body_Dynamics/Humanoid_Robot_Acrobatics_Utilizing_Complete_Articulated_Rigid_Body_Dynamics.md) | 2025-08 |     | ✅ 已总结 |
| 456  | [RL from Physical Feedback: Aligning Large Motion Models with Humanoid Control](https://arxiv.org/abs/2506.12769)                                | 2025.06 |     | ⏳ 待读 |
| 457  | [AMOR: Adaptive Character Control through Multi-Objective Reinforcement Learning](https://arxiv.org/abs/2505.23708)                              | 2025.05 |     | ⏳ 待读 |
| 458  | [MaskedManipulator: Versatile Whole-Body Control for Loco-Manipulation](https://arxiv.org/abs/2505.19086)                                        | 2025.05 |     | ⏳ 待读 |
| 459  | [Emergent Active Perception and Dexterity of Simulated Humanoids from Visual Reinforcement Learning](https://arxiv.org/abs/2505.12278)           | 2025.05 |     | ⏳ 待读 |
| 460  | [Zero-Shot Whole-Body Humanoid Control via Behavioral Foundation Models](https://arxiv.org/abs/2504.11054)                                       | 2025.04 |     | ⏳ 待读 |
| 461  | [CLoSD: Closing the Loop between Simulation and Diffusion for multi-task character control](https://arxiv.org/abs/2410.03441)                    | 2024.10 |     | ⏳ 待读 |
| 462  | [SkillMimic: Learning Basketball Interaction Skills from Demonstrations](https://arxiv.org/abs/2408.15270)                                       | 2024.08 |     | ⏳ 待读 |
| 463  | [Unified Human-Scene Interaction via Prompted Chain-of-Contacts](https://arxiv.org/abs/2309.07918)                                               | 2023.09 |     | ⏳ 待读 |
| 464  | [Hierarchical Planning and Control for Box Loco-Manipulation](https://arxiv.org/abs/2306.09532)                                                  | 2023.06 |     | ⏳ 待读 |
| 465  | [Perpetual Humanoid Control for Real-time Simulated Avatars](https://arxiv.org/abs/2305.06456)                                                   | 2023.05 |     | ⏳ 待读 |
| 466  | [Hierarchical visuomotor control of humanoids](https://arxiv.org/abs/1811.09656)                                                                 | 2018.11 |     | ⏳ 待读 |
| 467  | [Multi-task Deep Reinforcement Learning with PopArt](https://arxiv.org/abs/1809.04474)                                                           | 2018.09 |     | ⏳ 待读 |
| 468  | [Learning Symmetric and Low-energy Locomotion](https://arxiv.org/abs/1801.08093)                                                                 | 2018.01 |     | ⏳ 待读 |
| 469  | Composite Motion Learning with Task Control                                                                                                      | -       |     | ⏳ 待读 |
| 470  | [InterPrior: Scaling Generative Control for Physics-Based Human-Object Interactions](https://arxiv.org/abs/2602.06035) | 2026.02 |  | ⏳ 待读 |
| 471  | [FARM: Frame-Accelerated Augmentation and Residual Mixture-of-Experts for Physics-Based High-Dynamic Humanoid Control](https://arxiv.org/abs/2508.19926) [笔记](13_Physics-Based_Animation/FARM__Frame-Accelerated_Augmentation_and_Residual_MoE_for_High-Dynamic_Humanoid/FARM__Frame-Accelerated_Augmentation_and_Residual_MoE_for_High-Dynamic_Humanoid.md) | 2025.08 |  | ✅ 完成 |
| 472  | [Feature-Based vs. GAN-Based Learning from Demonstrations: When and Why](https://arxiv.org/abs/2507.05906) | 2025.07 |  | ⏳ 待读 |
| 473  | [InterMimic: Towards Universal Whole-Body Control for Physics-Based Human-Object Interactions](https://arxiv.org/abs/2502.20390) | 2025.02 | 🌟 | ⏳ 待读 |
| 474  | [MaskedMimic: Unified Physics-Based Character Control Through Masked Motion Inpainting](https://arxiv.org/abs/2409.14393) | 2024.09 | 🌟 | ⏳ 待读 |
| 475  | AdaptNet: Policy Adaptation for Physics-Based Character Control | - |  | ⏳ 待读 |
| 528  | [ADD: Physics-Based Motion Imitation with Adversarial Differential Discriminators](https://arxiv.org/abs/2505.04961) | 2025.05 |  | ⏳ 待读 |
| 529  | [TokenHSI: Unified Synthesis of Physical Human-Scene Interactions through Task Tokenization](https://arxiv.org/abs/2503.19901) | 2025.03 | 🌟 | ⏳ 待读 |
| 530  | [PARC: Physics-based Augmentation with Reinforcement Learning for Character Controllers](https://michaelx.io/parc/index.html) | 2025 SIGGRAPH |  | ⏳ 待读 |
| 541  | [Physics-Based Motion Tracking of Contact-Rich Interacting Characters](https://arxiv.org/abs/2604.07984) [笔记](13_Physics-Based_Animation/Physics-Based_Motion_Tracking_of_Contact-Rich_Interacting_Characters/Physics-Based_Motion_Tracking_of_Contact-Rich_Interacting_Characters.md) | 2026-06-12 |     | ✅ 完成 |


### Human Motion Analysis and Synthesis（49篇）


| #   | 论文                                                                                                                                   | 日期      | 🌟  | 状态   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- | --- | ---- |
| 476  | [Learned Motion Matching](https://dl.acm.org/doi/10.1145/3386569.3392440) ✅ [笔记](14_Human_Motion/Learned_Motion_Matching/Learned_Motion_Matching.md)                                                                                                              | SIGGRAPH 2020 |     | ✅ 完成 |
| 477  | [EmbodMocap: In-the-Wild 4D Human-Scene Reconstruction for Embodied Agents](https://arxiv.org/abs/2602.23205) ✅ [笔记](14_Human_Motion/EmbodMocap__In-the-Wild_4D_Human-Scene_Reconstruction_for_Embodied_Agents/EmbodMocap__In-the-Wild_4D_Human-Scene_Reconstruction_for_Embodied_Agents.md) | 2026.02 |     | ✅ 完成 |
| 478  | [WHOLE: World-Grounded Hand-Object Lifted from Egocentric Videos](https://arxiv.org/abs/2602.22209) ✅ [笔记](14_Human_Motion/WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos/WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos.md) | 2026.02 |     | ✅ 完成 |
| 479  | [Diffusion Forcing for Multi-Agent Interaction Sequence Modeling](https://arxiv.org/abs/2512.17900) ✅ [笔记](14_Human_Motion/MAGNet__Diffusion_Forcing_for_Multi-Agent_Interaction_Sequence_Modeling/MAGNet__Diffusion_Forcing_for_Multi-Agent_Interaction_Sequence_Modeling.md) | 2026-06-01 |     | ✅ 完成 |
| 480  | [Control Operators for Interactive Character Animation](https://dl.acm.org/doi/10.1145/3763319) [笔记](14_Human_Motion/Control_Operators_for_Interactive_Character_Animation/Control_Operators_for_Interactive_Character_Animation.md) | 2026-06-12 |     | ✅ 完成 |
| 481  | Implicit Bézier Motion Model for Precise Spatial and Temporal Control                                                                | 2025.12 |     | ⏳ 待读 |
| 482  | [Efficient and Scalable Monocular Human-Object Interaction Motion Reconstruction](https://arxiv.org/abs/2512.00960) ✅ [笔记](14_Human_Motion/Efficient_and_Scalable_Monocular_Human-Object_Interaction_Motion_Reconstruction/Efficient_and_Scalable_Monocular_Human-Object_Interaction_Motion_Reconstruction.md)                  | 2025.12 |     | ✅ 完成 |
| 483  | [Being-M0.5: A Real-Time Controllable Vision-Language-Motion Model](https://arxiv.org/abs/2508.07863)                                | 2025.08 |     | ⏳ 待读 |
| 484  | Go to Zero: Towards Zero-shot Motion Generation with Million-scale Data                                                              | 2025.07 |     | ⏳ 待读 |
| 485  | [GENMO: A GENeralist Model for Human MOtion](https://arxiv.org/abs/2505.01425) ✅ [笔记](14_Human_Motion/GENMO__A_Generalist_Model_for_Human_Motion/GENMO__A_Generalist_Model_for_Human_Motion.md) | 2025.05 |     | ✅ 完成 |
| 486  | [PICO: Reconstructing 3D People In Contact with Objects](https://arxiv.org/abs/2504.17695)                                           | 2025.04 |     | ⏳ 待读 |
| 487  | Climber Force and Motion Estimation from Video                                                                                       | 2025.04 |     | ⏳ 待读 |
| 488  | [FRAME: Floor-aligned Representation for Avatar Motion from Egocentric Video](https://arxiv.org/abs/2503.23094)                      | 2025.03 |     | ⏳ 待读 |
| 489  | [PRIMAL Physically Reactive and Interactive Motor Model for Avatar Learning](https://arxiv.org/abs/2503.17544)                       | 2025.03 |     | ⏳ 待读 |
| 490  | [Scaling Large Motion Models with Million-Level Human Motions](https://arxiv.org/abs/2410.03311)                                     | 2024.10 |     | ⏳ 待读 |
| 491  | [Flexible Motion In-betweening with Diffusion Models](https://arxiv.org/abs/2405.11126)                                              | 2024.05 |     | ⏳ 待读 |
| 492  | [Taming Diffusion Probabilistic Models for Character Control](https://arxiv.org/abs/2404.15121)                                      | 2024.04 |     | ⏳ 待读 |
| 493  | [OmniControl: Control Any Joint at Any Time for Human Motion Generation](https://arxiv.org/abs/2310.08580) ✅ [笔记](14_Human_Motion/OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation/OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation.md) | 2026-07-20 | 🌟 | ✅ 完成 |
| 494  | [TEDi: Temporally-Entangled Diffusion for Long-Term Motion Synthesis](https://arxiv.org/abs/2307.15042)                              | 2023.07 |     | ⏳ 待读 |
| 495  | [Guided Motion Diffusion for Controllable Human Motion Synthesis](https://arxiv.org/abs/2305.12577)                                  | 2023.05 |     | ⏳ 待读 |
| 496  | [PhysDiff: Physics-Guided Human Motion Diffusion Model](https://arxiv.org/abs/2212.02500)                                            | 2022.12 |     | ⏳ 待读 |
| 497  | Generating Diverse and Natural 3D Human Motions From Text                                                                            | -       |     | ⏳ 待读 |
| 498  | [Ψ₀: An Open Foundation Model Towards Universal Humanoid Loco-Manipulation](https://arxiv.org/abs/2603.12263)                        | 2026.03 |     | ⏳ 待读 |
| 499  | [SteadyTray: Learning Object Balancing Tasks in Humanoid Tray Transport via Residual RL](https://arxiv.org/abs/2603.10306)           | 2026.03 |     | ⏳ 待读 |
| 500  | [ZeroWBC: Learning Natural Visuomotor Humanoid Control from Human Egocentric Video](https://arxiv.org/abs/2603.09170)                | 2026.03 |     | ⏳ 待读 |
| 501  | [FAME: Force-Adaptive RL for Expanding the Manipulation Envelope of a Full-Scale Humanoid](https://arxiv.org/abs/2603.08961)         | 2026.03 |     | ⏳ 待读 |
| 502  | [Embedding Classical Balance Control Principles in RL for Humanoid Recovery](https://arxiv.org/abs/2603.08619)                       | 2026.03 |     | ⏳ 待读 |
| 503  | [ULTRA: Unified Multimodal Control for Autonomous Humanoid Whole-Body Loco-Manipulation](https://arxiv.org/abs/2603.03279)           | 2026.03 |     | ⏳ 待读 |
| 504  | [OmniXtreme: Breaking the Generality Barrier in High-Dynamic Humanoid Control](https://arxiv.org/abs/2602.23843)                     | 2026.02 |     | ⏳ 待读 |
| 505  | [LessMimic: Long-Horizon Humanoid Interaction with Unified Distance Field Representations](https://arxiv.org/abs/2602.21723)         | 2026.02 |     | ⏳ 待读 |
| 506  | [Learning Humanoid End-Effector Control for Open-Vocabulary Visual Loco-Manipulation](https://arxiv.org/abs/2602.16705)              | 2026.02 |     | ⏳ 待读 |
| 507  | [VIGOR: Visual Goal-In-Context Inference for Unified Humanoid Fall Safety](https://arxiv.org/abs/2602.16511)                         | 2026.02 |     | ⏳ 待读 |
| 508  | [Humanoid Hanoi: Investigating Shared Whole-Body Control for Skill-Based Box Rearrangement](https://arxiv.org/abs/2602.13850)        | 2026.02 |     | ⏳ 待读 |
| 509  | [DynaRetarget: Dynamically-Feasible Retargeting using Sampling-Based Trajectory Optimization](https://arxiv.org/abs/2602.06827)      | 2026.02 |     | ⏳ 待读 |
| 510  | [SoftMimic: Learning Compliant Whole-body Control from Examples](https://arxiv.org/abs/2510.17792)                                   | 2025.10 |     | ⏳ 待读 |
| 511  | [Learning Differentiable Reachability Maps for Optimization-based Humanoid Motion Generation](https://arxiv.org/abs/2508.11275)      | 2025.08 |     | ⏳ 待读 |
| 512  | [BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion](https://arxiv.org/abs/2508.08241)             | 2025.08 |     | ⏳ 待读 |
| 513  | [KungfuBot: Physics-Based Humanoid Whole-Body Control for Learning Highly-Dynamic Skills](https://arxiv.org/abs/2506.12851)          | 2025.06 |     | ⏳ 待读 |
| 514  | [Whole-body Multi-contact Motion Control for Humanoid Robots Based on Distributed Tactile Sensors](https://arxiv.org/abs/2505.19580) | 2025.05 |     | ⏳ 待读 |
| 515  | [FLAM: Foundation Model-Based Body Stabilization for Humanoid Locomotion and Manipulation](https://arxiv.org/abs/2503.22249)         | 2025.03 |     | ⏳ 待读 |
| 516  | [The Role of Domain Randomization in Training Diffusion Policies for Whole-Body Humanoid Control](https://arxiv.org/abs/2411.01349)  | 2024.11 |     | ⏳ 待读 |
| 517  | [Full-Order Sampling-Based MPC for Torque-Level Locomotion Control via Diffusion-Style Annealing](https://arxiv.org/abs/2409.15610)  | 2024.09 |     | ⏳ 待读 |
| 518  | [Flow Matching Imitation Learning for Multi-Support Manipulation](https://arxiv.org/abs/2407.12381)                                  | 2024.07 |     | ⏳ 待读 |
| 519  | [Predictive Sampling: Real-time Behaviour Synthesis with MuJoCo](https://arxiv.org/abs/2212.00541)                                   | 2022.12 |     | ⏳ 待读 |
| 520  | [Kimodo: Scaling Controllable Human Motion Generation](https://arxiv.org/abs/2603.15546) ✅ [笔记](14_Human_Motion/Kimodo__Scaling_Controllable_Human_Motion_Generation/Kimodo__Scaling_Controllable_Human_Motion_Generation.md) | 2026.03 |  | ✅ 完成 |
| 521  | [HUMOTO: A 4D Dataset of Mocap Human Object Interactions](https://arxiv.org/abs/2504.10414) ✅ [笔记](14_Human_Motion/HUMOTO__A_4D_Dataset_of_Mocap_Human_Object_Interactions/HUMOTO__A_4D_Dataset_of_Mocap_Human_Object_Interactions.md) | 2026-07-09 | 🌟 | ✅ 完成 |
| 522  | [ClimbingCap: Multi-Modal Dataset and Method for Rock Climbing in World Coordinate](https://arxiv.org/abs/2503.21268) | 2025.03 |  | ⏳ 待读 |
| 523  | [Example-based Motion Synthesis via Generative Motion Matching](https://arxiv.org/abs/2306.00378) | 2023.06 |  | ⏳ 待读 |
| 538  | [MANIKIN: Biomechanically Accurate Neural Inverse Kinematics for Human Motion Estimation](https://www.ecva.net/papers/eccv_2024/papers_ECCV/papers/00194.pdf) | ECCV 2024 |  | ⏳ 待读 |
| 563  | [ARDY: Autoregressive Diffusion with Hybrid Representation for Interactive Human Motion Generation](https://arxiv.org/abs/2607.08741) ✅ [笔记](14_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion/ARDY__Autoregressive_Diffusion_with_Hybrid_Representation_for_Interactive_Human_Motion.md) | 2026-07-09 | 🌟 | ✅ 已总结 |
| 566  | [MoGeFlow: Flowing Through Motion Codebook Geometry for Text-to-Motion Generation](https://arxiv.org/abs/2606.11656) ✅ [笔记](14_Human_Motion/MoGeFlow__Flowing_Through_Motion_Codebook_Geometry_for_Text-to-Motion_Generation/MoGeFlow__Flowing_Through_Motion_Codebook_Geometry_for_Text-to-Motion_Generation.md) | 2026-06-25 | 🌟 | ✅ 已总结 |
| 574  | [UniMoFlow: Grounding Instruction-Driven 3D Human Motion Editing in Generation](https://arxiv.org/abs/2608.09143) ✅ [笔记](14_Human_Motion/UniMoFlow__Grounding_Instruction-Driven_3D_Human_Motion_Editing_in_Generation/UniMoFlow__Grounding_Instruction-Driven_3D_Human_Motion_Editing_in_Generation.md) | 2026-08-10 | 🌟 | ✅ 已总结 |
| 580  | [AnchorRoute: Human Motion Synthesis with Interval-Routed Sparse Control](https://arxiv.org/abs/2605.14716) ✅ [笔记](14_Human_Motion/AnchorRoute__Human_Motion_Synthesis_with_Interval-Routed_Sparse_Control/AnchorRoute__Human_Motion_Synthesis_with_Interval-Routed_Sparse_Control.md) | 2026-09-01 |  | ✅ 已总结 |
| 592  | [MoVT: Video-Augmented Motion Tokenizer for Text-to-Motion Generation](https://arxiv.org/abs/2609.14965) ✅ [笔记](14_Human_Motion/MoVT__Video-Augmented_Motion_Tokenizer_for_Text-to-Motion_Generation/MoVT__Video-Augmented_Motion_Tokenizer_for_Text-to-Motion_Generation.md) | 2026-09-14 |  | ✅ 已总结 |


### Archived（自发现，待上游收录）

> 以下论文已在本地读取 / 总结，但经比对截至今日（2026-07-23）**尚未出现在上游 [awesome-humanoid-robot-learning](https://github.com/YanjieZe/awesome-humanoid-robot-learning)** 列表中。待上游收录后，将移回对应分类。

| #   | 论文                                                                                                                                                                                                                                                                                                                                        | 原分类          | 日期        | 🌟  | 状态      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------- | --- | ------- |
| 546  | [HANDOFF: Humanoid Agentic Task-Space Whole-Body Control via Distilled Complementary Teachers](https://arxiv.org/abs/2606.06493) ✅ [笔记](_archived/04_Loco-Manipulation_and_WBC/HANDOFF__Humanoid_Agentic_Task-Space_Whole-Body_Control_via_Distilled_Teachers/HANDOFF__Humanoid_Agentic_Task-Space_Whole-Body_Control_via_Distilled_Teachers.md) | Loco-Manip   | 2026.06    |     | ✅ 已总结 |
| 556  | [Athena-WBC: Capability-Aligned Policy Experts for Long-Tail Humanoid Whole-Body Control](https://arxiv.org/abs/2607.04837) ✅ [笔记](_archived/04_Loco-Manipulation_and_WBC/Athena-WBC__Capability-Aligned_Policy_Experts_for_Long-Tail_Humanoid_Whole-Body_Control/Athena-WBC__Capability-Aligned_Policy_Experts_for_Long-Tail_Humanoid_Whole-Body_Control.md) | Loco-Manip   | 2026-07-10 |     | ✅ 已总结 |
| 557  | [TACT-ful: Multi-Channel Terrain Affordance and Compliance Training for Payload-Robust Perceptive Humanoid Locomotion](https://arxiv.org/abs/2606.20645) ✅ [笔记](_archived/05_Locomotion/TACT-ful__Multi-Channel_Terrain_Affordance_and_Compliance_for_Payload-Robust_Locomotion/TACT-ful__Multi-Channel_Terrain_Affordance_and_Compliance_for_Payload-Robust_Locomotion.md) | Locomotion   | 2026-07-11 | 🌟  | ✅ 已总结 |
| 558  | [CWI: Composite Humanoid Whole-Body Imitation System for Loco-manipulation](https://arxiv.org/abs/2606.27676) ✅ [笔记](_archived/04_Loco-Manipulation_and_WBC/CWI__Composite_Humanoid_Whole-Body_Imitation_System_for_Loco-manipulation/CWI__Composite_Humanoid_Whole-Body_Imitation_System_for_Loco-manipulation.md)                             | Loco-Manip   | 2026.06    |     | ✅ 已总结 |
| 559  | [HumoSlope: Physics-Guided Biomechanical Gait Adaptation for Humanoid Locomotion on Extreme Sloped Terrains](https://arxiv.org/abs/2607.07830) ✅ [笔记](_archived/05_Locomotion/HumoSlope__Physics-Guided_Biomechanical_Gait_Adaptation_on_Extreme_Sloped_Terrains/HumoSlope__Physics-Guided_Biomechanical_Gait_Adaptation_on_Extreme_Sloped_Terrains.md) | Locomotion   | 2026-07-22 |     | ✅ 已总结 |
