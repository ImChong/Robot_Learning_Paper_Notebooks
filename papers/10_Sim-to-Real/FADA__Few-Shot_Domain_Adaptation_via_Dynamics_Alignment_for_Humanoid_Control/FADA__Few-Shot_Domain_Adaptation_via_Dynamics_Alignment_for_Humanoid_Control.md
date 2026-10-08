---
layout: paper
paper_order: 10
title: "FADA: Few-Shot Domain Adaptation via Dynamics Alignment for Humanoid Control"
zhname: "FADA：用动力学对齐实现少样本域自适应的人形控制"
category: "Sim-to-Real"
---

# FADA: Few-Shot Domain Adaptation via Dynamics Alignment for Humanoid Control
**FADA：用动力学对齐实现少样本域自适应的人形控制**

> 📅 阅读日期: 2026-07-16
>
> 🏷️ 板块: 10 Sim-to-Real · 少样本域自适应 · 动力学对齐 · Planner-IDM 解耦
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2606.28476](https://arxiv.org/abs/2606.28476) |
| HTML | [在线阅读](https://arxiv.org/html/2606.28476v1) |
| PDF | [下载](https://arxiv.org/pdf/2606.28476) |
| 项目主页 | [lecar-lab.github.io/FADA-humanoid](https://lecar-lab.github.io/FADA-humanoid/) |
| 源码 | 暂未开源（截至记录日项目页仅放出硬件 rollout 视频，未见官方仓库） |
| **发布时间** | 2026-06-26（arXiv v1） |
| 作者 / 机构 | Angchen Xie、Nikhil Sobanbabu、Ishayu Shikhare、Alan Wang、Max Simchowitz、Guanya Shi（CMU **LeCAR Lab**） |

**机器人平台**：Unitree **G1**（29 DoF）与 Booster **T1**（23 DoF）真机；训练在 IsaacSim，评测跨 MuJoCo 与真机。

**领域归属**：人形机器人 **Sim-to-Real 域自适应**——不重训整套策略，只对策略中的「逆动力学模块」做少样本微调，把动作生成对齐到目标域动力学。

---

## 🎯 一句话总结

仿真训好的人形控制器一换环境（地形、负载、执行器不同）就掉点，根源是**目标域动力学与训练域不一致**。已有方法要么忽略域偏移、要么需要笨重的重训/适配管线。FADA 的思路是**把策略「分工拆开」**：一个 **Planner** 负责「想去哪」（预测未来若干步的本体感知轨迹），一个 **IDM（逆动力学模块）** 负责「怎么做到」（把想要的未来轨迹翻译成动作）。**域偏移主要影响的是「怎么做到」这一层**，所以部署到新环境时**冻结 Planner、只微调 IDM**，用**约 2 分钟目标域 rollout**的「观测-动作」配对做监督即可对齐——**不需要最优演示、不需要重训 Planner**。在 G1 / T1 真机的斜坡、负载搬运、拉洗衣篮等高精度全身任务上，成功率大幅高于零样本与端到端自适应基线。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| FADA | Few-Shot Domain Adaptation | 少样本域自适应：用极少目标域数据完成迁移 |
| IDM | Inverse Dynamics Model | 逆动力学模块：由「想要的未来状态」反推所需动作 |
| Planner | — | 规划器：由观测历史 + 任务指令预测未来 K 步本体感知轨迹 |
| DAgger | Dataset Aggregation | 数据聚合式模仿学习，用于把特权 oracle 蒸馏成可部署学生 |
| Oracle Policy | — | 特权策略：训练期可读全状态（heightmap/摩擦/质量/外力等） |
| Receding Horizon | 滚动时域 | 每步只执行动作块的第一个动作，然后重新规划 |

---

## ❓ 论文要解决什么问题？

- **现象**：人形控制器部署到**动力学不同**的目标域（不同地形、负载、执行器特性）时性能下降。
- **已有两类做法的痛点**：① **忽略域偏移**（靠域随机化硬扛，遇到较大偏移仍掉点）；② **重型适配管线**（在线系统辨识 / 端到端重训，代价高、需要大量数据或最优演示）。
- **核心观察**：策略里「**规划**（想要什么样的运动）」和「**执行**（把运动落成动作）」承担的角色不同——**域偏移主要作用在执行层**（同样的目标轨迹，在新动力学下需要不同动作）。既然如此，就**只修执行层**，规划层可以跨域复用。

---

## 🧠 方法：三阶段框架

FADA 把策略**因式分解**为 `π = IDM ∘ Planner`，并按三阶段训练与部署：

1. **阶段一 · 训练特权 Oracle**：在仿真中用任务奖励 + 全状态特权信息训一个 oracle 策略，拿到高质量行为参照。
2. **阶段二 · 蒸馏出 Planner-IDM 学生**：用 **DAgger** 把 oracle 蒸馏成**只依赖本体感知**的可部署学生，学生显式拆成两块：
   - **Planner P**：Transformer 编码器，由「观测历史 + 任务指令」预测未来 **K 步本体感知序列**（想要的运动）。
   - **IDM I**：Transformer 编码器-解码器，把「预测的未来 + 执行历史」映射为 **K 步动作块**（怎么做到）。
   - 结构：均为 3 层 Transformer、4 注意力头、隐藏维 128（IDM 解码器 2 层）；部署时**滚动时域**只执行第一个动作。
3. **阶段三 · 目标域少样本对齐**：部署到新域时**冻结 Planner，只微调 IDM**——用**约 2 分钟目标域 rollout**采到的「观测-动作」配对做**监督学习**，把 IDM 的动作生成对齐到目标域真实动力学。**关键**：监督信号来自普通 rollout 的配对数据，**不需要最优演示**。

> 直觉：Planner 说「下一步身体该长这样」，跨域基本不变；IDM 负责「在当前这台机器/这块地上，要发多大力才能长成那样」，这才是被动力学偏移改变的部分，因此只微调它即可。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S1["① 仿真 · 训练特权 Oracle"]
        PRIV["🔮 特权状态 s*<br/>(heightmap/摩擦/质量/外力)"]
        RWD["🎯 任务奖励 RL"]
        ORACLE["👑 Oracle 策略 π*"]
        PRIV --> ORACLE
        RWD --> ORACLE
    end

    subgraph S2["② 仿真 · DAgger 蒸馏出 Planner-IDM 学生（只用本体感知）"]
        OBS["🎛️ 本体感知 o_t + 任务指令"]
        PLN["🧭 Planner P<br/>预测未来 K 步本体轨迹 ŷ"]
        IDM["🦿 IDM I<br/>(ŷ + 执行历史) → 动作块 a"]
        OBS --> PLN --> IDM
    end

    ORACLE -. DAgger 监督 .-> PLN
    ORACLE -. DAgger 监督 .-> IDM

    subgraph S3["③ 部署 · 目标域少样本对齐（约 2 分钟）"]
        ROLL["📼 目标域 rollout<br/>采「观测-动作」配对"]
        FREEZE["🔒 冻结 Planner P"]
        FT["🔧 只微调 IDM I<br/>监督对齐目标域动力学"]
        ROLL --> FT
        FREEZE --> FT
    end

    PLN --> FREEZE
    IDM --> FT
    FT --> DEPLOY["🤖 G1 / T1 真机<br/>滚动时域执行首动作"]
</div>

---

## 💡 核心贡献

1. **规划/执行因式分解**：把策略拆成 Planner + IDM，明确「**域偏移主要落在执行层**」，为「只修一小块」提供依据。
2. **只微调 IDM 的少样本自适应**：部署时冻结 Planner、仅用**约 2 分钟**目标域数据监督对齐 IDM，避免重训与在线系统辨识的高成本。
3. **无需最优演示**：用普通 rollout 的「观测-动作」配对即可作监督，工程上易于现场采集。
4. **真机多任务验证**：在 G1 / T1 上覆盖行走、全身（功夫/舞蹈）、负载搬运（3–6 kg 非对称载荷）等高精度任务，显著优于零样本与自适应基线。

---

## 📊 关键发现

| 任务 / 设定 | FADA | FADA 零样本 | 自适应基线 |
|---|---|---|---|
| G1 斜坡通过（成功率） | **80%** | 20% | TF-DAgger 0% |
| T1 拉洗衣篮（成功率） | **100%** | 20% | 0% |
| G1 行走 + 负载（误差） | 较零样本**降 27.4%** | — | baseline |
| Sim-to-Sim（IsaacSim→MuJoCo，5 任务均值） | 较零样本**误差降 24.7%** | — | — |

**评测的域偏移**：负载（1–6 kg 非对称 + 外部拉力）、地形（10–20° 斜坡 / 软垫 / 沙地）、执行器（PD 增益缩放 / 力矩噪声 / 控制延迟）、仿真器（IsaacSim→MuJoCo/真机）。

> 📌 数值以官方 PDF 为准；本笔记基于 arXiv 摘要 + HTML + 项目页整理。

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **模块化自适应** | 把「哪部分被域偏移影响」讲清楚，只微调 IDM——比整策略重训/在线辨识更省、更稳 |
| **少样本 + 免演示** | 约 2 分钟普通 rollout 即可对齐，不依赖最优演示或动捕/特权传感，利于现场快速部署 |
| **与「改仿真」互补** | 系统辨识类方法「改仿真让它像真机」，FADA 则「保仿真策略、只在真机侧改执行层」，两条路线可组合 |
| **跨本体验证** | 同一框架在 G1（29 DoF）与 T1（23 DoF）都跑通，显示因式分解范式的通用性 |

---

## 🎤 面试参考

**Q：FADA 为什么只微调 IDM，而不重训整个策略？**
A：它把策略拆成 Planner（想要什么样的未来运动）和 IDM（把未来运动翻译成动作）。域偏移主要改变的是「同样目标下要发多大力」，也就是执行层；Planner 的规划语义跨域基本不变。因此冻结 Planner、只把 IDM 对齐到目标域动力学，既省数据又稳。

**Q：少样本对齐用什么监督信号？需要专家演示吗？**
A：不需要最优演示。直接在目标域跑普通 rollout，采「观测-动作」配对做监督学习，让 IDM 的动作生成匹配真机动力学，约 2 分钟数据就够。

**Q：和域随机化、在线系统辨识相比定位如何？**
A：域随机化是训练期让策略对各种动力学都鲁棒（不针对具体目标域）；在线系统辨识/端到端自适应管线较重。FADA 是**部署期的轻量少样本自适应**——只改执行层、免演示，可与前两者叠加使用。

**Q：Planner 和 IDM 具体怎么配合运行？**
A：Planner（Transformer 编码器）由观测历史+指令预测未来 K 步本体轨迹；IDM（Transformer 编码-解码器）把这段预测未来加执行历史映射成 K 步动作块；部署时滚动时域只执行第一个动作再重规划。

---

## 🔗 相关阅读

- [Simulator Adaptation via Proprioceptive Distribution Matching (2604.11090)](https://arxiv.org/abs/2604.11090)：「改仿真」路线，用本体感知分布匹配辨识仿真器，与 FADA「改执行层」对照，本仓库已有笔记
- [Robot Trains Robot (2508.12252)](https://arxiv.org/abs/2508.12252)：真机在线适配 + 动力学隐变量微调，同为「部署期自适应」思路，本仓库已有笔记
- [PolySim: Multi-Simulator Dynamics Randomization (2510.01708)](https://arxiv.org/abs/2510.01708)：多仿真器动力学随机化增强鲁棒性，本仓库已有笔记
- [SPI-Active: Sampling-Based System ID with Active Exploration (2505.14266)](https://arxiv.org/abs/2505.14266)：主动探索采高信息量数据做系统辨识，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要 + HTML + 项目页整理；论文截至记录日未检索到官方开源仓库，相关数值/实现细节以官方 PDF 为准。
