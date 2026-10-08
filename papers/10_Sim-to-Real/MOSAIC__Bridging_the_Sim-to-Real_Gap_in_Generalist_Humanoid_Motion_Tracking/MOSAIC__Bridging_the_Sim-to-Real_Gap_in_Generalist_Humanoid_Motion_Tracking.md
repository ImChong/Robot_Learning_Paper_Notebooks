---
layout: paper
paper_order: 3
title: "MOSAIC: Bridging the Sim-to-Real Gap in Generalist Humanoid Motion Tracking and Teleoperation with Rapid Residual Adaptation"
zhname: "MOSAIC：用快速残差自适应弥合通用人形动作跟踪与遥操作的 Sim-to-Real 鸿沟"
category: "Sim-to-Real"
---

# MOSAIC: Bridging the Sim-to-Real Gap in Generalist Humanoid Motion Tracking and Teleoperation with Rapid Residual Adaptation
**MOSAIC：通用人形动作跟踪与遥操作的 Sim-to-Real 桥接**

> 📅 阅读日期: 2026-07-26
>
> 🏷️ 板块: 10 Sim-to-Real · 通用动作跟踪 · 遥操作 · 快速残差自适应
>
> 🔁 推进轨: 模块轮转（09_State_Estimation 已全部收录 → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.08594](https://arxiv.org/abs/2602.08594) |
| HTML | [在线阅读](https://arxiv.org/html/2602.08594v2) |
| PDF | [下载](https://arxiv.org/pdf/2602.08594) |
| 项目主页 | [baai-humanoid.github.io/MOSAIC](https://baai-humanoid.github.io/MOSAIC/) |
| 源码 | 🌟 [github.com/BAAI-Humanoid/MOSAIC](https://github.com/BAAI-Humanoid/MOSAIC)（开源训练代码 + 数据，基于 Isaac Lab + rsl_rl） |
| **发布时间** | 2026-02-09（arXiv v1）· 2026-02-11（v2） |
| 作者 / 机构 | Zhenguo Sun、Bo-Sheng Huang、Yibo Peng、Xukun Li、Jingyu Ma、Yu Sun、Zhe Li、Haojun Jiang、Biao Gao、Zhenshan Bing、Xinlong Wang、Alois Knoll（**BAAI 北京智源** × **TU Munich 慕尼黑工业大学**等） |

**机器人平台**：真机实验主体为 Unitree **G1**；代码库同时支持 **G1 / H1_2 / Adam**。仿真训练在 **Isaac Lab 2.1.0（Isaac Sim 4.5.0）**，RL 用 rsl_rl PPO。

**领域归属**：人形机器人 **Sim-to-Real / 遥操作动作跟踪**——针对「仿真强、真机弱」的通用跟踪器，用轻量残差自适应弥合接口与动力学导致的部署鸿沟。

---

## 🎯 一句话总结

近年的「通用动作跟踪器」靠堆数据 + 大训练在**仿真里跑分很好**，但真机上做**持续遥操作**时常常「脆」：一方面是**接口误差**（VR 流约 400 ms 延迟、丢包、传感噪声，让操作者意图与机器人当前状态错位），另一方面是**动力学误差**（仿真里被低估的真机特性）。二者叠加会造成**跟踪失同步甚至失稳**。MOSAIC 的思路分三步：① 先训一个**面向遥操作的通用跟踪器 GMT**，用**自适应重采样** + **世界系一致奖励**（约束全局位姿与运动，防长时程漂移）打好底子；② 再用**少量接口数据**（约 30 分钟）训一个**接口专用适配策略**；③ 关键一招是**加性残差蒸馏**——把「通用策略 + 接口专用策略」两个老师，蒸馏进一个**加在通用输出之上的残差模块**（`π_S = π_GMT + π_RES`，残差层近零初始化保证前期保守），**不重训主干**，就能快速修正接口相关误差。相比直接微调 / 持续学习，残差自适应在 VR 遥操作数据集上把位置误差从 2.94 m 降到 **1.19 m**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| MOSAIC | — | 本文系统名：通用动作跟踪 + 快速残差自适应的遥操作框架 |
| GMT | General Motion Tracker | 通用动作跟踪器：在多源动作库上 RL 训练的底座策略 |
| Residual Module | 加性残差模块 | 加在 GMT 输出之上的修正项 `π_RES`，只学「差量」 |
| Adaptor / π_ADAPT | 接口专用适配策略 | 用少量某接口（VR/惯性）数据训的专家，作蒸馏老师 |
| World-Frame Consistency | 世界系一致性 | 在自我中心奖励外加全局位姿/运动约束，防长时程漂移 |
| Adaptive Resampling | 自适应重采样 | 按失败分布（片段内）+ 难度/新颖度（片段间）加权采样 |
| RobotBridge | — | 代码库提供的模块化接口，统一评测与跨平台部署 |
| DAgger / BC | 数据聚合 / 行为克隆 | 用双老师行为克隆监督蒸馏残差模块 |

---

## ❓ 论文要解决什么问题？

- **现象**：通用动作跟踪器**仿真指标强、真机遥操作脆**——持续遥操作下容易失同步、失稳。
- **两类根因**：
  - **接口误差**：VR 流约 400 ms 延迟造成意图-状态时间错位；还有丢包、传感噪声/抖动，这些在仿真里往往被低估。
  - **动力学误差**：真机执行器/接触特性与仿真不一致。
- **已有做法的痛点**：直接**微调**或**持续学习**通用模型，容易破坏原有泛化能力（灾难性遗忘），且需要重训主干、代价高。
- **目标**：用**少量接口数据**快速自适应，**既修接口误差、又不牺牲通用性**。

---

## 🧠 方法：三阶段框架

1. **阶段一 · 训练通用跟踪器 GMT**：在**多源动作库**上用 RL（rsl_rl PPO）训练面向遥操作的通用跟踪器。两个关键设计：
   - **自适应重采样**：① 片段内按「失败感知分布」多采不稳定段；② 片段间按难度、新颖度/覆盖度、均匀项加权，稳住异构数据源上的训练。
   - **世界系一致奖励**：在自我中心（ego-centric）奖励外，额外约束**全局位姿与运动**，这对移动遥操作防长时程漂移至关重要。
2. **阶段二 · 训练接口专用适配策略 π_ADAPT**：针对某个具体接口（VR 手柄 / 惯性动捕），用**少量该接口数据**（约 30 分钟）训一个接口专家，捕捉该接口特有的延迟/噪声误差模式。
3. **阶段三 · 加性残差蒸馏与部署**：把「通用 GMT」和「接口专用 π_ADAPT」作为**双老师**，用行为克隆蒸馏出一个**加性残差模块** `π_RES`：
   - 学生策略 `π_S(o_t) = π_GMT(o_t) + π_RES(o_t)`；蒸馏损失 `L = Σ_k w_k · E‖π_S(o_t) − π_(k)(o_t)‖²`。
   - **残差层近零初始化**（zero-biased），前期更新保守、不破坏通用行为，再逐步学出接口修正。
   - 部署支持**离线动作回放**与**在线长时程遥操作**（VR / 惯性动捕），并用 RobotBridge 做跨平台一致评测。

> 直觉：通用跟踪器已经「会动作」了，接口带来的只是一层**可预测的系统性偏差**（延迟、抖动）。与其重训整套（易遗忘），不如**只学一层加在输出上的残差修正**——初始为零、逐步补偿，既快又稳，还保住原泛化。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S1["① 仿真 · 训练通用跟踪器 GMT"]
        BANK["📚 多源动作库"]
        RS["🎲 自适应重采样<br/>片段内失败感知 + 片段间难度/新颖度"]
        WF["🌍 世界系一致奖励<br/>约束全局位姿与运动防漂移"]
        GMT["🏗️ 通用跟踪器 π_GMT"]
        BANK --> RS --> GMT
        WF --> GMT
    end

    subgraph S2["② 仿真 · 少量接口数据训接口专家"]
        IDATA["🎮 接口数据约30分钟<br/>VR / 惯性动捕"]
        ADP["🧩 接口专用策略 π_ADAPT"]
        IDATA --> ADP
    end

    subgraph S3["③ 加性残差蒸馏（双老师 BC）"]
        RES["➕ 残差模块 π_RES<br/>近零初始化"]
        STU["🎓 学生 π_S = π_GMT + π_RES"]
        RES --> STU
    end

    GMT -. 老师1 通用行为 .-> RES
    ADP -. 老师2 接口修正 .-> RES

    STU --> DEPLOY["🤖 Unitree G1 真机<br/>离线回放 + 在线长时程遥操作"]
    DEPLOY --> LATENCY["⏱️ 抗 ~400ms 延迟/丢包/噪声<br/>VR 位置误差 2.94m → 1.19m"]
</div>

---

## 💡 核心贡献

1. **诊断部署鸿沟**：明确通用跟踪器真机遥操作变脆的两类根因——**接口误差**（延迟/抖动）与**动力学误差**，并指出仿真指标掩盖了这一点。
2. **面向遥操作的 GMT**：用**自适应重采样 + 世界系一致奖励**训通用底座，兼顾异构数据稳定性与移动遥操作的全局一致性。
3. **快速残差自适应**：提出**加性残差 + 双老师蒸馏 + 近零初始化**，用约 30 分钟接口数据快速修正误差，**不重训主干、不牺牲泛化**，优于直接微调/持续学习。
4. **开源系统**：放出训练代码与数据（Isaac Lab + rsl_rl，支持 G1 / H1_2 / Adam），并用 RobotBridge 统一评测与跨平台部署。

---

## 📊 关键发现

| 设定 / 数据集 | 通用底座 GMT | 残差自适应后 |
|---|---|---|
| VR 遥操作数据集（位置误差，Table V） | 2.94 m | **1.19 m** |
| VR 遥操作（成功率） | 100% | 100% |
| Motion-X-Sub（锚点位置误差，Table IV） | — | **0.82 m** |
| Motion-X-Sub（成功率） | — | **77%** |
| 自适应数据量 | 约 30 分钟即见显著增益；**3 分钟不足** | — |

**接口误差实测**：VR 流约 **400 ms 延迟** + 丢包 + 传感噪声，是真机失同步的主要来源；仿真里普遍被低估。

> 📌 数值以官方 PDF/HTML 为准；本笔记基于 arXiv 摘要 + HTML + 项目页 + 开源仓库 README 整理。

---

## 🧩 源码运行时序图（mermaid）

> 依据开源仓库 [BAAI-Humanoid/MOSAIC](https://github.com/BAAI-Humanoid/MOSAIC) 的 README 训练流水线（`scripts/` + `run/`）整理，示意「预处理 → GMT → 适配器 → 残差蒸馏 → 部署」的调用时序。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant PRE as csv_to_npz.py<br/>动作预处理
    participant GMT as run_mosaic_gmt.sh<br/>→ train.py (rsl_rl)
    participant ADP as run_mosaic_adaptor.sh<br/>接口适配器
    participant RES as run_mosaic_residual_adaptation.sh<br/>残差蒸馏
    participant SIM as Isaac Lab / Isaac Sim<br/>并行仿真
    participant BOT as play.py / RobotBridge<br/>G1 部署
    U->>PRE: python scripts/csv_to_npz.py --input_file motion.csv --input_fps 30
    PRE-->>U: 前向运动学补全 pose/vel/acc → .npz 动作库
    U->>GMT: bash run/run_mosaic_gmt.sh（多源动作库）
    GMT->>SIM: General-Tracking-Flat-G1-v0 并行 rollout
    loop PPO 迭代
        SIM-->>GMT: obs + DeepMimic 跟踪奖励 + 世界系一致项
        GMT->>GMT: 自适应重采样（失败感知 / 难度加权）
        GMT->>GMT: 更新 π_GMT
    end
    GMT-->>U: gmt_checkpoint.pt（通用跟踪器）
    U->>ADP: bash run/run_mosaic_adaptor.sh（约30分钟 VR/惯性数据）
    ADP->>SIM: 接口专用 rollout
    ADP-->>U: adaptor_checkpoint.pt（接口专家 π_ADAPT）
    U->>RES: bash run/run_mosaic_residual_adaptation.sh
    RES->>RES: 双老师 BC 蒸馏：π_S = π_GMT + π_RES（残差近零初始化）
    RES-->>U: 学生策略 π_S
    U->>BOT: play.py / RobotBridge 离线回放 + 在线遥操作
    BOT-->>U: 抗 ~400ms 延迟/噪声，跟踪误差显著下降
</div>

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **残差式自适应** | 「主干不动、只加一层残差」提供了一条**不遗忘、可快速上真机**的自适应范式，与 FADA「只微调 IDM」异曲同工 |
| **接口误差被正视** | 把 VR 延迟/丢包/噪声当作一等公民建模，而非只盯动力学随机化，贴合真实遥操作痛点 |
| **世界系一致** | 强调移动遥操作需要全局位姿一致，避免长时程漂移，对行走+操作的长任务尤为关键 |
| **开源可复现** | 训练代码 + 数据 + 多平台（G1/H1_2/Adam）+ RobotBridge，利于社区对比与迁移 |

---

## 🎤 面试参考

**Q：MOSAIC 为什么用「加性残差」而不是直接微调通用模型？**
A：直接微调/持续学习容易破坏通用跟踪器原有的泛化（灾难性遗忘），还要重训主干。加性残差把学生写成 `π_S = π_GMT + π_RES`，主干冻结、只学一层修正项，残差层近零初始化保证前期保守、逐步补偿接口误差——既快又稳，还保住泛化。

**Q：真机遥操作「脆」的根因是什么？**
A：两类。接口误差——VR 流约 400 ms 延迟让操作者意图与机器人状态错位，加上丢包/传感噪声；动力学误差——真机执行器/接触特性与仿真不一致。仿真指标好掩盖了这些，导致持续遥操作时失同步。

**Q：残差模块怎么训？需要多少数据？**
A：先用约 30 分钟某接口数据训一个接口专用策略 π_ADAPT，再以「通用 GMT + 接口专家」双老师做行为克隆蒸馏出残差模块。约 30 分钟即见显著增益，3 分钟不够。VR 数据集上位置误差从 2.94 m 降到 1.19 m。

**Q：什么是「世界系一致奖励」和「自适应重采样」？**
A：世界系一致——在自我中心奖励外再约束全局位姿/运动，防移动遥操作长时程漂移；自适应重采样——片段内按失败分布多采不稳定段，片段间按难度/新颖度/均匀加权，稳住多源异构数据训练。

---

## 🔗 相关阅读

- [FADA: Few-Shot Domain Adaptation via Dynamics Alignment (2606.28476)](https://arxiv.org/abs/2606.28476)：同为「部署期轻量自适应」，只微调 IDM 对齐动力学，与 MOSAIC「加残差修接口」互补，本仓库已有笔记
- [Robot Trains Robot (2508.12252)](https://arxiv.org/abs/2508.12252)：真机在线适配 + 动力学隐变量微调，同属部署期自适应，本仓库已有笔记
- [PolySim: Multi-Simulator Dynamics Randomization (2510.01708)](https://arxiv.org/abs/2510.01708)：训练期多仿真器动力学随机化，走「让策略先鲁棒」的另一条路，本仓库已有笔记
- [SPI-Active: Sampling-Based System ID with Active Exploration (2505.14266)](https://arxiv.org/abs/2505.14266)：主动探索采高信息量数据做系统辨识，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要 + HTML(v2) + 项目页 + 开源仓库 README 整理；部分数值/实现细节以官方 PDF 为准。
