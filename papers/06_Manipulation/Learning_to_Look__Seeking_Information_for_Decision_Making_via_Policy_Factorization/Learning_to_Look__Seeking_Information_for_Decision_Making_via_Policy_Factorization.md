---
layout: paper
title: "Learning to Look: Seeking Information for Decision Making via Policy Factorization"
zhname: "Learning to Look：用策略因子化为决策寻求信息"
category: "Manipulation"
arxiv: "2410.18964"
---

# Learning to Look: Seeking Information for Decision Making via Policy Factorization
**很多操作任务需要主动/交互式探索才能完成；本文把这类任务刻画为「因子化上下文马尔可夫决策过程」，提出 DISaM 双策略：一个「信息寻求策略」探索环境找到相关上下文信息、一个「信息接收策略」利用上下文达成操作目标；二者可分开训练（用接收策略给寻求策略提供奖励），测试时按操作策略对下一步动作的不确定性平衡探索与利用**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 信息寻求 · 策略因子化 · 双策略 · 主动探索 · 不确定性
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 10 月 |
| arXiv | [2410.18964](https://arxiv.org/abs/2410.18964) · [PDF](https://arxiv.org/pdf/2410.18964) · [HTML](https://arxiv.org/html/2410.18964v1) |
| 作者 | Shivin Dass、Jiaheng Hu、Ben Abbatematteo、Peter Stone、Roberto Martín-Martín（UT Austin） |
| 主题 | cs.RO · 信息寻求 / 主动探索 / 策略因子化 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 许多操作任务需要**主动或交互式探索**才能成功——智能体要**主动寻找**每一阶段所需的信息（如**移动机器人的头**去找操作相关信息；或多机器人里一个侦察机器人为另一个找信息）。本文把这类任务刻画为一种新问题：**因子化上下文马尔可夫决策过程（factorized Contextual MDP）**，并提出 **DISaM** ——一个**双策略**解法：① **信息寻求策略（information-seeking）**探索环境找到相关**上下文信息**；② **信息接收策略（information-receiving）**利用上下文达成操作目标。这种**因子化**让两策略可**分开训练**（用接收策略给寻求策略**提供奖励**）。测试时，双智能体**按操作策略对"下一步最佳动作"的不确定性**来**平衡探索与利用**。在五个需信息寻求的操作任务（仿真 + 真机）上，DISaM **大幅优于**已有方法。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| DISaM | 双策略（信息寻求 + 接收）框架 |
| Factorized Contextual MDP | 因子化上下文 MDP |
| Information-Seeking | 信息寻求策略（探索） |
| Information-Receiving | 信息接收策略（利用） |
| Exploration/Exploitation | 探索 / 利用平衡 |
| Uncertainty | 操作策略对动作的不确定性 |

---

## ❓ 论文要解决什么问题？

许多操作要**先找信息再决策**：
- 需**主动探索**（如转头找物体）；
- 把"寻求信息"与"利用信息"混在一个策略里难学；
- 测试时如何**平衡探索与利用**？

论文要：把任务**因子化**，分别学**寻求**与**接收**策略，并在测试时合理切换。

---

## 🔧 方法详解

### 1. 因子化上下文 MDP
把"需主动找信息"的任务建模为**factorized Contextual MDP**：上下文信息是决策的关键变量。

### 2. DISaM 双策略
- **信息寻求策略**：探索环境**找上下文**；
- **信息接收策略**：用上下文**达成操作目标**。

**因子化**允许**分开训练**：用**接收策略**的表现给**寻求策略提供奖励**。

### 3. 测试时按不确定性平衡探索/利用
测试时，依**操作（接收）策略**对**下一步最佳动作的不确定性**，决定**继续探索**还是**执行操作**。

### 4. 结果
五个需信息寻求的操作任务（仿真 + 真机），DISaM **大幅优于**基线。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    SEEK["🔎 信息寻求策略<br/>(探索找上下文)"] --> CTX["上下文信息"]
    CTX --> RECV["🎯 信息接收策略<br/>(利用上下文达成目标)"]
    RECV -. 提供奖励训练 .-> SEEK
    UNC["操作不确定性"] --> BAL["测试时平衡探索/利用"]
    RECV --> OUT["🤖 5 个需信息寻求任务<br/>仿真+真机 大幅优于基线"]

    style SEEK fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style RECV fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **因子化上下文 MDP**：刻画"需主动找信息"的操作任务；
2. **DISaM 双策略**：信息寻求 + 信息接收，可分开训练；
3. **跨策略奖励**：用接收策略给寻求策略提供奖励；
4. **不确定性驱动探索/利用平衡**：五任务大幅优于基线。

---

## 🤖 对人形机器人学习的启发

- **"找信息"与"用信息"解耦**是处理主动探索任务的优雅归纳偏置；
- **不确定性驱动的探索/利用平衡**是可迁移的测试时机制；
- 与 ViA、Learning to Look Around 的"主动视觉"互补（这里更偏决策层）；
- 对人形（转头/移动找信息）直接相关。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2410.18964](https://arxiv.org/abs/2410.18964) | 论文正文（因子化 MDP、DISaM、五任务实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·主动感知/信息寻求**：[Learning to Look Around（可动颈）](../Learning_to_Look_Around__Enhancing_Teleoperation_and_Learning/Learning_to_Look_Around__Enhancing_Teleoperation_and_Learning.html) · [Vision in Action](../Vision_in_Action__Learning_Active_Perception_from_Human_Demonstrations/Vision_in_Action__Learning_Active_Perception_from_Human_Demonstrations.html)。
