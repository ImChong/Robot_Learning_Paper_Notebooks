---
layout: paper
paper_order: 6
title: "Towards Bridging the Gap: Systematic Sim-to-Real Transfer for Diverse Legged Robots"
zhname: "PACE：面向多样腿足机器人的系统化 Sim-to-Real 迁移"
category: "Sim-to-Real"
---

# Towards Bridging the Gap: Systematic Sim-to-Real Transfer for Diverse Legged Robots（PACE）

**PACE：面向多样腿足机器人的系统化 Sim-to-Real 迁移**

> 📅 阅读日期: 2026-06-08
>
> 🏷️ 板块: Sim-to-Real · 系统辨识 · 执行器建模 · 能耗优化 · PMSM 能量模型 · CMA-ES
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2509.06342](https://arxiv.org/abs/2509.06342) |
| HTML | [在线阅读 v1](https://arxiv.org/html/2509.06342v1) |
| PDF | [下载](https://arxiv.org/pdf/2509.06342) |
| 项目主页 | [pace.filipbjelonic.com](https://pace.filipbjelonic.com/) · [leggedrobotics.github.io/pace-sim2real](https://leggedrobotics.github.io/pace-sim2real/) |
| **发布时间** | 2025-09-08 (arXiv) |
| 源码 | 🌟 [github.com/leggedrobotics/pace-sim2real](https://github.com/leggedrobotics/pace-sim2real)（基于 NVIDIA Isaac Lab） |
| 提交日期 | 2025-09-08 |

**作者**：Filip Bjelonic, Fabian Tischhauser, **Marco Hutter**
**机构**：Robotic Systems Lab（RSL）· ETH Zürich
**实机**：3 台主力平台（含 ANYmal D、TYTAN）+ 10 台扩展机器人，共 13 台不同腿足机器人

---

## 🎯 一句话总结

主流 sim-to-real 用**动力学域随机化（domain randomization, DR）**硬扛仿真-现实差距——把摩擦、质量、PD 增益、延迟全部随机化，让策略学得"足够保守"。代价是：**策略偏保守、能耗偏高、且每台新机器人都要重新调一大堆随机化范围**。PACE 反其道而行：**与其随机化未知量，不如把它量准**。它提出一套**自下而上（bottom-up）的系统辨识流水线**——从单个执行器 → 整机空中轨迹 → 地面行走逐层标定动力学参数，再配上一个**基于永磁同步电机（PMSM）第一性原理的能量模型**和**紧凑四项奖励 + 能耗损失**，使得**同一套方法在不做动力学参数随机化的情况下**可靠迁移到 13 台不同机器人，并把 ANYmal 整机 Cost of Transport 降低 **32%**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RL | Reinforcement Learning | 强化学习 |
| Sim-to-Real | - | 仿真训练，真实部署 |
| DR | Domain Randomization | 域随机化：随机化物理参数以求鲁棒 |
| SysID | System Identification | 系统辨识：从数据反推物理参数 |
| PMSM | Permanent Magnet Synchronous Motor | 永磁同步电机（腿足机器人主流执行器） |
| CMA-ES | Covariance Matrix Adaptation Evolution Strategy | 一种无梯度进化优化算法 |
| CoT | Cost of Transport | 运输成本：单位重量·单位距离的能耗，越低越省电 |
| Actuator Net | - | 用神经网络拟合执行器扭矩-误差关系（ANYmal 经典做法） |
| Isaac Lab | NVIDIA Isaac Lab | NVIDIA 的 GPU 并行 RL 仿真框架 |

---

## ❓ 论文要解决什么问题？

**问题陈述**：腿足机器人要真正实用，既要**鲁棒行走**，又要**节能**。但当前 sim-to-real 的主流做法在这两点上都打折扣：

1. **域随机化（DR）的代价**：为了跨过 sim-real gap，把动力学参数（摩擦、质量、增益、延迟、扭矩）全部大范围随机化。
   - ❌ 策略被迫学得**保守**——为了应付"最坏情况"牺牲性能与能效；
   - ❌ **可移植性差**——每台新机器人都要人工重调随机化范围，缺乏系统性；
   - ❌ **不解释 gap 来源**——只是"盖住"差距，而不是"理解"差距。

2. **能耗常被忽视**：多数 RL 行走只用"能量正比于扭矩平方"这类粗糙代理项，**没有真正建模电机的电气损耗**（铜损、铁损、逆变器开关损耗），导致仿真里"省电"的策略到了实机并不省。

**核心问题**：

> 能否用**系统化的物理参数辨识**取代"暴力域随机化"，让同一套方法**不随机化动力学参数**就能迁移到大量不同机器人，同时**真正**优化能耗？

---

## 🔧 方法拆解：PACE = Precise Adaptation through Continuous Evolution

### 1. 自下而上的三层动力学辨识

PACE 的核心是一条**bottom-up** 的辨识流水线，逐层把物理参数"量准"，每一层都用**真实测量数据**而非假设：

| 层级 | 标定对象 | 数据来源 |
|---|---|---|
| **① 执行器层** | 单个 PMSM 关节的扭矩、摩擦、电气损耗、延迟 | 关节台架激励数据（仅用标准关节编码器，无需额外传感器） |
| **② 整机空中层** | 全身在空中摆动时的惯性、传动、关节耦合动力学 | 整机悬挂在空中跑激励轨迹 |
| **③ 地面行走层** | 接触、地面反作用力下的整机动力学闭环 | 真实地面行走轨迹 |

**关键点**：辨识只依赖**标准关节编码器**（位置/速度），不需要额外加扭矩传感器或电流传感器——这正是它能"系统化推广到任意机器人"的工程前提。

### 2. CMA-ES 进化辨识

参数拟合用 **CMA-ES**（协方差矩阵自适应进化策略）这一无梯度优化器，把"仿真轨迹 vs 真实轨迹"的误差作为适应度函数，进化出最匹配真实数据的动力学参数集。相比手调或纯梯度方法，CMA-ES 对**非光滑、含接触的目标**更稳健。

### 3. 基于 PMSM 第一性原理的能量模型

不再用"扭矩平方"代理，而是直接建模永磁同步电机的能量流：

$$
P_{\text{total}} = \underbrace{\tau \cdot \dot{q}}_{\text{机械功}} + \underbrace{R \, i^2}_{\text{铜损（电阻）}} + \underbrace{P_{\text{iron}}}_{\text{铁损}} + \underbrace{P_{\text{switch}}}_{\text{逆变器开关损耗}}
$$

**只用极少的物理参数**就能刻画完整能量预算。论文一个反直觉的发现：

> 对 ANYmal 和 TYTAN 而言，**真正花在"行走（机械功）"上的能量不到一半**——其余都被**电子学与逆变器开关损耗**吃掉了。

这意味着：只优化机械功的策略，根本没碰到能耗的大头。

### 4. 紧凑四项奖励 + 能耗损失

奖励刻意做得**极简（四项）**，再加一个**第一性原理的能耗损失项**，在电气损耗与机械损耗之间取得平衡。简洁奖励的好处是：**少调参、跨机器人可复用**，与"系统化辨识"的哲学一致。

### 5. 关键主张：不做动力学参数随机化

因为动力学已经被**量准**了，PACE 在训练时**不随机化动力学参数**也能可靠迁移。这与主流 DR 路线形成鲜明对比——把"随机化未知量"换成"辨识已知量"。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph ID["🔬 自下而上系统辨识（PACE 核心）"]
        L1["① 执行器层<br/>台架激励 → PMSM 扭矩/摩擦/延迟<br/>(仅标准关节编码器)"]
        L2["② 整机空中层<br/>悬空激励轨迹 → 惯性/传动/耦合"]
        L3["③ 地面行走层<br/>真实行走轨迹 → 含接触整机动力学"]
        CMA["🧬 CMA-ES 进化拟合<br/>min ‖sim 轨迹 − real 轨迹‖"]
        L1 --> CMA
        L2 --> CMA
        L3 --> CMA
    end

    PARAM["📦 量准的物理参数集<br/>(动力学 + PMSM 能量参数)"]
    CMA --> PARAM

    subgraph ENERGY["⚡ PMSM 第一性原理能量模型"]
        EM["P = 机械功 + 铜损 + 铁损 + 开关损耗<br/>洞见: <50% 能量用于行走本身"]
    end
    PARAM --> EM

    subgraph TRAIN["🎮 RL 训练（Isaac Lab，无动力学 DR）"]
        SIM["高保真仿真<br/>(用辨识参数, 不随机化动力学)"]
        REW["紧凑四项奖励<br/>+ 第一性原理能耗损失"]
        POL["🦿 RL 策略 π"]
        PARAM --> SIM
        EM --> REW
        SIM --> POL
        REW --> POL
    end

    subgraph DEPLOY["🤖 零样本部署（13 台机器人）"]
        R3["3 台主力平台<br/>(ANYmal D, TYTAN, …)"]
        R10["10 台扩展机器人<br/>(不同尺寸/执行器)"]
        RES["✅ 可靠迁移, 无动力学随机化<br/>✅ ANYmal 整机 CoT ↓ 32%"]
    end

    POL -. 零样本 .-> R3
    POL -. 零样本 .-> R10
    R3 --> RES
    R10 --> RES

    style ID fill:#e8f4fd,stroke:#1f78b4
    style ENERGY fill:#fff7e0,stroke:#d4a017
    style TRAIN fill:#f3e8ff,stroke:#8e44ad
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **范式贡献**：提出"**辨识 > 随机化**"的系统化 sim-to-real 路线——把"随机化未知量"替换为"用第一性原理量准已知量"，在**不做动力学参数随机化**的前提下完成迁移；
2. **方法贡献**：一条**自下而上**的三层辨识流水线（执行器 → 整机空中 → 地面行走），仅依赖**标准关节编码器**，用 **CMA-ES** 进化拟合参数；
3. **能耗建模贡献**：**基于 PMSM 第一性原理的能量模型** + 紧凑四项奖励 + 能耗损失，真正建模电气损耗（铜损/铁损/逆变器开关），而非"扭矩平方"代理；
4. **规模化实证**：在 **3 台主力 + 10 台扩展 = 13 台**不同腿足机器人上验证可靠迁移，展示方法的**通用性**；
5. **效率突破**：ANYmal 整机 **Cost of Transport 降低 32%**，并揭示"**行走本身耗能不到一半，其余是电子学/逆变器损耗**"的反直觉结论；
6. **工程价值**：🌟 全套代码、模型、数据基于 **NVIDIA Isaac Lab** 开源，可直接复用于新机器人。

---

## 📊 关键设定与结果

| 维度 | 值 |
|---|---|
| 平台 | 3 台主力（ANYmal D、TYTAN 等）+ 10 台扩展 = 13 台 |
| 仿真框架 | NVIDIA Isaac Lab |
| 辨识算法 | CMA-ES（无梯度进化） |
| 传感器需求 | 仅标准关节编码器（无需扭矩/电流传感器） |
| 能量模型 | PMSM 第一性原理（机械功 + 铜损 + 铁损 + 开关损耗） |
| 奖励 | 紧凑四项 + 第一性原理能耗损失 |
| 动力学随机化 | ❌ 不做（靠辨识取代） |
| 关键结果 | ANYmal 整机 CoT ↓ **32%**；行走本身耗能 < 50% |

> 📌 各机器人详细迁移成功率、辨识误差、消融对比请以 PDF v1 实验章节为准。

---

## 🤖 对腿足 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **"辨识 vs 随机化"的再平衡** | 与 [RMA](https://arxiv.org/abs/2107.04034) / DR 主流路线互补——DR 盖住 gap，PACE 理解并量准 gap |
| **延续 RSL 执行器建模传统** | 接续 ANYmal 经典的 [Actuator Net](https://arxiv.org/abs/1901.08652)（[H17 笔记](../../03_High_Impact_Selection/Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots/Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots.html)），但更系统、可推广到任意机器人 |
| **把能耗当一等公民** | 多数 RL 行走只把能量当正则项，PACE 用物理能量模型让"省电"真正可落地 |
| **跟 [PolySim](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.html) 思路对照** | PolySim 用多仿真器随机化压窄 gap，PACE 用辨识直接量准 gap，方向相反 |
| **跟主动辨识工作呼应** | 与 [Sampling-Based System Identification with Active Exploration (2505.14266)](https://arxiv.org/abs/2505.14266) 同属"用辨识替代盲目随机化"思潮 |

---

## 🎤 面试参考

**Q：PACE 不做动力学域随机化，难道不怕 sim-real gap 把策略打崩？**
A：关键在于"为什么要随机化"。DR 的本质是**用不确定性覆盖未知参数**——既然不知道真实摩擦/惯性/延迟是多少，就在一个范围内全练一遍。PACE 的逻辑是：**如果能把这些参数量准，就不需要覆盖整个范围**。它通过自下而上的三层辨识（执行器→空中→地面）把动力学标定到足够精确，仿真本身就接近真机，于是迁移不再依赖"保守的随机化"。当然它仍可能保留观测噪声等非动力学随机化，但核心动力学参数靠辨识而非随机。

**Q：为什么强调"只用标准关节编码器"？**
A：这是"系统化、可推广"的工程前提。如果辨识需要扭矩传感器、电流探针或外部测力台，那每换一台机器人都得重新搭一套昂贵装置，方法就无法规模化到 13 台机器人。只靠编码器（几乎所有腿足机器人标配），辨识流水线才能"开箱即用"地套到任意新平台。

**Q："行走耗能不到一半"这个发现为什么重要？**
A：它直接颠覆了"优化扭矩 = 省电"的常识。如果铜损、铁损、逆变器开关损耗占了一多半能量，那么只压低机械功的策略根本没碰到能耗大头。PACE 的 PMSM 能量模型把这些电气损耗显式建进奖励，才能拿到 32% 的整机 CoT 改善——这是"建模对了能量流"而不是"动作更小"的结果。

**Q：CMA-ES 为什么比梯度方法更合适？**
A：辨识目标涉及接触、摩擦、电机非线性，目标函数往往**非光滑、不可微、含局部极值**。CMA-ES 是无梯度进化策略，对这类目标更鲁棒，也不需要把整条仿真管线写成可微形式，工程上更易落地。代价是样本效率低于梯度法，但辨识是离线一次性的，可以接受。

**Q：和 RMA 这类"在线适应"路线是什么关系？**
A：互补。RMA 在**部署时**用历史观测在线估计隐变量来适应当前动力学，属于"运行时补偿"；PACE 在**训练前**就把动力学离线量准，属于"事前对齐"。两者可叠加——先用 PACE 把名义模型标准，再用 RMA 风格在线补偿残余漂移（电池电压、磨损、温度）。

---

## 🔗 相关阅读

- [Learning Agile and Dynamic Motor Skills for Legged Robots (1901.08652)](../../03_High_Impact_Selection/Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots/Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots.html)：ANYmal Actuator Net 奠基，本仓库已有笔记
- [RMA: Rapid Motor Adaptation for Legged Robots (2107.04034)](https://arxiv.org/abs/2107.04034)：在线动力学适应路线
- [PolySim: Multi-Simulator Domain Randomization (2510.01708)](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.html)：仿真侧随机化路线，与 PACE 思路对照，本仓库已有笔记
- [Sampling-Based System Identification with Active Exploration (2505.14266)](https://arxiv.org/abs/2505.14266)：主动探索做系统辨识，同属"辨识替代随机化"思潮
- [Contrastive Representation Learning for Adaptive Humanoid Locomotion (2509.12858)](../Contrastive_Representation_Learning_for_Adaptive_Humanoid_Locomotion/Contrastive_Representation_Learning_for_Adaptive_Humanoid_Locomotion.html)：表征侧的 sim-to-real 路线，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要、项目主页（[pace.filipbjelonic.com](https://pace.filipbjelonic.com/)）与开源仓库 README 整理；网络受限期间 arXiv 全文 HTML/PDF 未完整抓取，**各机器人辨识误差、消融数值、奖励项精确权重**请以论文 v1 PDF 为准。源码已开源：[github.com/leggedrobotics/pace-sim2real](https://github.com/leggedrobotics/pace-sim2real)。
</content>
</invoke>
