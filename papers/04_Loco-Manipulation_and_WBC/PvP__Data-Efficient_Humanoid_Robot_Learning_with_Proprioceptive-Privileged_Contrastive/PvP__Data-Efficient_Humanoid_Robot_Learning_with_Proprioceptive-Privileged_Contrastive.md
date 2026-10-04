---
layout: paper
paper_order: 1
title: "PvP: Data-Efficient Humanoid Robot Learning with Proprioceptive-Privileged Contrastive Representations"
zhname: "PvP：用「本体感知 ↔ 特权状态」对比学习，提升人形机器人 RL 的样本效率"
category: "Loco-Manipulation and WBC"
arxiv: "2512.13093"
---

# PvP: Data-Efficient Humanoid Robot Learning with Proprioceptive-Privileged Contrastive Representations
**PvP：把「特权状态」当成「本体感知状态」的天然增强视图，在二者间做无需手工数据增强的对比学习（SimSiam 式负余弦相似度 + 停梯度），学到紧凑、任务相关的本体表征，再以非对称 actor-critic 接入 PPO，从而显著提升人形全身控制的样本效率；并配套开源 SRL4Humanoid 统一评测框架**

> 📅 阅读日期: 2026-06-29
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 状态表征学习(SRL) · 对比学习 · 特权信息 · 样本效率 · 非对称 actor-critic · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月（v1）/ 2026 年 3 月（v2） |
| arXiv | [2512.13093](https://arxiv.org/abs/2512.13093) · [PDF](https://arxiv.org/pdf/2512.13093) · [HTML](https://arxiv.org/html/2512.13093v1) |
| 代码 | 论文宣称 SRL4Humanoid 开源（plug-and-play 工具箱），截至当前未见公开仓库链接 |
| 作者 | Mingqi Yuan、Tao Yu、Haolin Song、Bo Li、Xin Jin、Hua Chen、Wenjun Zeng |
| 机构 | 香港理工大学(HK PolyU)、**LimX Dynamics(逐际动力)**、宁波东方理工(EIT)、USTC、ZJU-UIUC、SUSTech |
| 主题 | cs.RO · 状态表征学习 / 人形全身控制 / 样本效率 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 第 64 项（PROGRESS.md 同号）。

---

## 🎯 一句话总结

> 人形机器人 RL 又「数据贵」又「部分可观」：真机只能拿到**本体感知（proprioception）**，而仿真里还有大量**特权状态（privileged state，质心、接触力、地形等）**。以往做法是用特权信息训练 teacher 再蒸馏，或硬塞进非对称 critic。PvP 换个视角——**把「完整状态(含特权)」看成「本体感知状态」的一个天然「伪增强视图」**：对完整状态做**零掩码（zero-masking）**抹掉特权部分，得到一对 `(s, s̃)`，然后在二者表征之间做 **SimSiam 式对比学习**（预测器 + **负余弦相似度** + **停梯度**防塌缩），无需任何手工数据增强就能把「特权信息蕴含的结构」注入到本体表征里。学到的紧凑表征以**非对称 actor-critic**接 PPO（actor 只看本体、critic 看特权），在 **LimX Oli（31 自由度）** 的速度跟踪与动作模仿任务上显著提升样本效率与最终性能；并开源 **SRL4Humanoid** 统一框架做系统对比。

---

## 📌 英文缩写 / 术语速查

| 术语 | 含义 |
|---|---|
| SRL | State Representation Learning，状态表征学习 |
| Proprioception | 本体感知：真机可测信号（关节角/角速度、IMU 等） |
| Privileged State | 特权状态：仅仿真可得的额外信息（质心、接触力、地形高度等） |
| SimSiam | 一种无负样本的自监督对比方法（预测器 + 停梯度防塌缩） |
| NCS / Stop-gradient | Negative Cosine Similarity 负余弦相似度损失 / 停梯度 |
| Asymmetric Actor-Critic | 非对称 actor-critic：actor 用本体、critic 用特权 |
| PPO | Proximal Policy Optimization，RL 主干算法 |

---

## ❓ 论文要解决什么问题？

人形全身控制用 RL 学习时存在两大痛点：

- **样本效率低**：人形动力学复杂、自由度高，RL 探索成本巨大；
- **部分可观**：策略部署时只能依赖**本体感知**，而训练时仿真里有丰富**特权信息**——如何高效利用特权信息来「撑起」本体表征，是关键。

常见思路（teacher-student 蒸馏、非对称 critic、各类 SRL 如 VAE 重建 / SPR 动力学预测 / SimSiam 对比）各有取舍，但缺乏**统一、可复现的对比基准**，也大多依赖**手工设计的数据增强**或额外重建目标。

PvP 的目标：提出一种**不需手工增强**、直接利用「本体 ↔ 特权」互补性的表征学习方式，并搭配一个**统一模块化评测框架**，把 SRL 方法在人形上的效果讲清楚。

---

## 🔧 方法详解

### 1. 核心思想：特权状态 = 本体状态的「伪增强视图」
对比学习需要「正样本对」。PvP 不去手工造增强，而是直接拿**同一时刻**的两种状态作为一对正样本：
- 完整状态 `s`（含特权信息）；
- 对 `s` 做**零掩码**抹掉特权维度得到 `s̃`（只剩本体感知）。

`(s, s̃)` 天然是「同一物理状态的两个视图」，无需任何数据增强。

### 2. SimSiam 式对比目标（无负样本、防塌缩）
- 共享的**策略编码器 f_θ** 分别编码 `s`、`s̃` 得到 `z`、`z̃`；
- **预测器 h_ψ** 生成 `p`、`p̃`；
- 损失为对称的**负余弦相似度**：`L_PvP = D_ncs(p, sg(z̃)) + D_ncs(p̃, sg(z))`，其中 `sg(·)` 为**停梯度**，防止表征塌缩。

直觉：让「只看本体」的表征去对齐「看到特权」的表征，从而把特权信息蕴含的结构「拉」进本体表征。

### 3. 与 RL 的接入：非对称 actor-critic + 间隔更新
- **非对称结构**：actor（策略网络）只吃**本体感知**，critic（价值网络）吃**特权状态**做更准的价值估计；
- **SRL ⊕ RL 联合**：表征损失 `λ·L_SRL` 与 PPO 损失通过**间隔更新（interval updating）**配合（如每 50 步更新一次表征），避免过早陷入局部最优；
- **作用对象**：把 SRL 作用在**策略编码器**比作用在价值编码器更有效。

### 4. SRL4Humanoid：统一评测框架
论文配套开源一个**模块化、即插即用**的工具箱，统一实现代表性 SRL 方法以便公平对比：
| 组件 | 类型 |
|---|---|
| VAE | 重建式 |
| SPR | 动力学建模（多步预测） |
| SimSiam / PvP | 对比式 |
| PPO | 共用 RL 主干 |

特点：SRL 与 RL 流程**完全解耦**、编码目标（策略/价值）可配置、支持间隔更新机制。

### 5. 评测与结果
- **平台**：**LimX Oli** 人形（31 DoF），真机验证；
- **任务**：① 速度跟踪（平地变速线/角速度指令）；② 动作模仿（复现 20 段人类动画，单段 ≤43 秒）；
- **基线**：PPO、PPO+VAE、PPO+SPR、PPO+SimSiam；
- **结论**：PvP 在速度跟踪上**收敛显著更快**（优于 vanilla PPO），在动作模仿三项指标上**整体最佳**；间隔 50 步、作用于策略编码器为最优配置；并在 **LimX Oli 真机**完成验证。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph STATE["🧩 同一时刻状态"]
        S["完整状态 s<br/>(本体 + 特权)"]
        SM["零掩码 → s̃<br/>(只剩本体感知)"]
        S -->|zero-masking| SM
    end

    subgraph SRL["🔗 PvP 对比学习 (SimSiam 式)"]
        ENC["共享策略编码器 f_θ"]
        PRED["预测器 h_ψ"]
        LOSS["负余弦相似度 + 停梯度<br/>L_PvP = D_ncs(p, sg(z̃)) + D_ncs(p̃, sg(z))"]
        ENC --> PRED --> LOSS
    end

    subgraph RL["🎮 非对称 actor-critic + PPO"]
        A["Actor (只看本体)"]
        C["Critic (看特权)"]
        U["间隔更新<br/>λ·L_SRL ⊕ L_PPO"]
    end

    S --> ENC
    SM --> ENC
    LOSS -. 注入结构 .-> A
    A --> U
    C --> U
    U --> OUT["🤖 样本效率↑ 收敛更快<br/>速度跟踪 / 动作模仿<br/>LimX Oli 31-DoF 真机"]

    style STATE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style SRL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style RL fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **新视角的对比对**：把「完整状态(含特权)」视为「本体状态」的**天然伪增强视图**，用零掩码构造正样本对，**无需手工数据增强**即可做对比学习；
2. **PvP 目标**：SimSiam 式负余弦相似度 + 停梯度，把特权信息蕴含的结构注入本体表征，缓解部分可观下的表征瓶颈；
3. **与 RL 的稳健耦合**：非对称 actor-critic + 间隔更新，避免 SRL/RL 互相干扰导致过早收敛，并指出「作用于策略编码器」更优；
4. **SRL4Humanoid 开源框架**：首个面向人形的统一、模块化 SRL 评测工具箱，公平对比 VAE / SPR / SimSiam / PvP，便于复现与后续研究。

---

## 🤖 对人形机器人学习的启发

- **「特权信息」不止能喂 critic**：把它当成自监督的「另一视图」来对齐本体表征，是比单纯非对称 critic 更充分的利用方式，思路可迁移到 locomotion / loco-manipulation 各类任务；
- **免手工增强很关键**：机器人状态空间不像图像有现成增强算子，「用掩码造视图」给出了一个通用、低成本的正样本构造法；
- **SRL 与 RL 的耦合细节决定成败**：间隔更新、作用对象（策略 vs 价值）这类工程取舍对最终样本效率影响很大——统一框架(SRL4Humanoid)的价值正在于把这些变量拆清楚；
- **样本效率是真机友好的方向**：在 31-DoF 真机上验证，说明该范式对「贵数据」场景（尤其想缩短真机/仿真训练时间）有直接工程意义。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.13093](https://arxiv.org/abs/2512.13093) | 论文正文（方法、SRL4Humanoid、实验） |
| [PDF](https://arxiv.org/pdf/2512.13093) · [HTML](https://arxiv.org/html/2512.13093v1) | 全文（含消融与真机结果） |
| SRL4Humanoid | 论文宣称开源的统一 SRL 评测框架，截至当前未见公开仓库链接 |

> ℹ️ 备注：本环境网络出口对 arXiv 有限制，本笔记主要依据 arXiv HTML 正文整理；逐项数值结果以 PDF 为准。

---

## 🔗 相关阅读

- **特权信息 / teacher-student**：RMA、Concurrent SRL、特权蒸馏一类经典范式（本文的「非对称」与「对比」是其延伸）；
- **对比 / 自监督表征**：SimSiam（本文骨架）、SPR（动力学预测式表征）、VAE（重建式表征）——SRL4Humanoid 把它们统一可比；
- **同模块·表征 / 适配**：[SplitAdapter（因子化上下文适配）](../SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation.html) · [PvP-Privileged 思路可与动作跟踪类全身控制结合](../Robust_and_Generalized_Humanoid_Motion_Tracking/Robust_and_Generalized_Humanoid_Motion_Tracking.html)。
