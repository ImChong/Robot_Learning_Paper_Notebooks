---
layout: paper
title: "Kinematics-Aware Multi-Policy Reinforcement Learning for Force-Capable Humanoid Loco-Manipulation"
zhname: "面向力交互的人形移动操作：运动学感知的多策略强化学习"
category: "Loco-Manipulation and WBC"
arxiv: "2511.21169"
---

# Kinematics-Aware Multi-Policy Reinforcement Learning for Force-Capable Humanoid Loco-Manipulation
**面向高负载工业场景「既要灵巧又要主动施力」的需求，用解耦三阶段 RL 流水线（上身策略 + 下身策略 + delta 指令策略）：上身用隐含前向运动学先验的启发式奖励加速收敛、下身用基于力的课程学习让机器人主动施加并调节与环境的交互力**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 力交互 · 多策略解耦 · 运动学先验 · 力课程 · 工业高负载
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.21169](https://arxiv.org/abs/2511.21169) · [PDF](https://arxiv.org/pdf/2511.21169) · [HTML](https://arxiv.org/html/2511.21169v1) |
| 作者 | Kaiyan Xiao、Zihan Xu、Cheng Zhe、Chengju Liu、Qijun Chen（同济大学等） |
| 主题 | cs.RO · 力交互 loco-manip / 多策略 RL / 工业应用 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形机器人有类人形态，在工业里潜力大。但现有 loco-manip 多聚焦**灵巧操作**，难满足**高负载工业**对「**灵巧 + 主动力交互**」的**双重要求**。本文提出一个**基于 RL 的解耦三阶段训练流水线**：**上身策略、下身策略、delta 指令策略**。为加速上身训练，设计一个**启发式奖励**——通过**隐式嵌入前向运动学（FK）先验**，让策略**更快收敛**且性能更优；为下身，开发一个**基于力的课程学习**策略，使机器人能**主动施加并调节**与环境的**交互力**。这样把「灵巧」与「主动发力」统一进同一框架，面向高负载工业搬运/推压等任务。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Force-Capable | 有施力能力，能主动施加/调节接触力 |
| Multi-Policy | 多策略，上身/下身/delta 指令分设 |
| Delta-Command | 增量指令，对基础指令做微调 |
| FK Prior | Forward Kinematics 前向运动学先验 |
| Force Curriculum | 力课程，按力大小由易到难训练 |
| Loco-Manipulation | 移动操作 |

---

## ❓ 论文要解决什么问题？

**高负载工业**场景要求人形**既灵巧又能主动发力**，但现有 loco-manip：
- 多只做**灵巧操作**，缺**主动力交互**；
- 直接端到端学「又灵巧又发力」收敛慢、性能差。

论文要：一套能**同时**学到灵巧与主动发力、且**训练高效**的框架。

---

## 🔧 方法详解

### 1. 解耦三阶段多策略
- **上身策略**：负责灵巧操作；
- **下身策略**：负责行走/支撑与力交互；
- **delta 指令策略**：在上下身之上做协调微调。

解耦降低了高自由度联合学习的难度。

### 2. 上身：FK 先验的启发式奖励
为上身设计**启发式奖励**，**隐式嵌入前向运动学先验**，引导策略**更快收敛**并取得更优性能——把已知的运动学结构当成训练捷径。

### 3. 下身：基于力的课程学习
为下身设计**力课程**：让机器人逐步学会**主动施加并调节**与环境的**交互力**，从而胜任高负载推/压/搬。

### 4. 面向工业高负载
整体面向**高负载工业**任务，兼顾灵巧与主动发力。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph MP["解耦三策略"]
        UP["上身策略<br/>(FK 先验启发式奖励)"]
        LOW["下身策略<br/>(力课程学习)"]
        DC["delta 指令策略<br/>(协调微调)"]
    end
    UP --> DC
    LOW --> DC
    DC --> OUT["🤖 高负载工业 loco-manip<br/>灵巧 + 主动力交互"]

    style MP fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **解耦三阶段多策略框架**：上身/下身/delta 指令分治，降低联合学习难度；
2. **FK 先验启发式奖励**：隐式嵌入前向运动学，加速上身收敛并提升性能；
3. **力课程学习**：让下身主动施加并调节交互力；
4. **面向工业高负载**：统一灵巧与主动发力。

---

## 🤖 对人形机器人学习的启发

- **「主动发力」是工业 loco-manip 的关键短板**：纯位置/灵巧不够，需把力作为可控量；
- **嵌入运动学先验是高效训练的实用手段**：把结构知识写进奖励，胜过纯黑箱探索；
- **上下身解耦**契合人形结构，呼应 EGM 的上下身专家分设；
- **与 HAFO、FALCON、CHIP、HMC 等力/柔顺工作同向**，共同推进「会发力」的人形。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.21169](https://arxiv.org/abs/2511.21169) | 论文正文（三阶段策略、FK 奖励、力课程、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·力/接触自适应**：[HMC（异构元控制拼接力-位）](../HMC__Learning_Heterogeneous_Meta-Control_for_Contact-Rich_Loco-Manipulation/HMC__Learning_Heterogeneous_Meta-Control_for_Contact-Rich_Loco-Manipulation.html) · [CHIP（可控柔顺）](../CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html) · [SplitAdapter（负载自适应）](../SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation.html)。
