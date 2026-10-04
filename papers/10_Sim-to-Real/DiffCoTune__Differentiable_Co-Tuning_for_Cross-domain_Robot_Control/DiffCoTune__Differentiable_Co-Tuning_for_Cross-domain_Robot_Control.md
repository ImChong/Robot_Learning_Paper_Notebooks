---
layout: paper
title: "DiffCoTune: Differentiable Co-Tuning for Cross-domain Robot Control"
zhname: "DiffCoTune：面向跨域机器人控制的可微协同调参"
category: "Sim-to-Real"
arxiv: "2505.24068"
---

# DiffCoTune: Differentiable Co-Tuning for Cross-domain Robot Control
**针对部署域里模型简化/仿真不准导致的性能落差，提出基于可微仿真的自动梯度调参框架：迭代采集 rollout 协同调「仿真参数」与「控制器参数」，用多步目标 + 交替优化在目标域内几步内完成迁移；可对任意复杂度的模型法/学习法控制器协同调参，从倒立摆到高维四足/双足跟踪均有提升**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 10 Sim-to-Real · 可微仿真 · 协同调参 · 跨域迁移 · 交替优化
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月 |
| arXiv | [2505.24068](https://arxiv.org/abs/2505.24068) · [PDF](https://arxiv.org/pdf/2505.24068) · [HTML](https://arxiv.org/html/2505.24068v1) |
| 作者 | Lokesh Krishna、Sheng Cheng、Junheng Li、Naira Hovakimyan、Quan Nguyen（USC / UIUC） |
| 主题 | cs.RO · 可微仿真 / 协同调参 / sim-to-real |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Sim-to-Real 模块。

---

## 🎯 一句话总结

> 机器人控制器部署常受**建模差异**所困——为可计算而**简化模型**、或**仿真器本身不准**——通常需要**临时手工调参**才能在目标域达标。DiffCoTune 提出一个**自动、基于梯度**的调参框架，借助**可微仿真器（differentiable simulators）**提升**部署域**性能。方法**迭代地采集 rollout**，**协同调（co-tune）仿真器参数与控制器参数**，使迁移能在**目标域少数几次试验**内系统完成。具体地，构造**多步目标**并用**交替优化**有效把控制器适配到部署域。框架的**可扩展性**体现在：能对**任意复杂度**的**模型法与学习法控制器**协同调参，任务从**低维倒立摆**到**高维四足与双足跟踪**，在不同部署域均见性能提升。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Co-Tuning | 协同调参，同时调仿真与控制器参数 |
| Differentiable Sim | 可微仿真器，可对参数求梯度 |
| Cross-domain | 跨域，从一个域迁到另一个域 |
| Alternating Optimization | 交替优化，轮流优化两组参数 |
| Multi-step Objective | 多步目标，跨多个时间步的目标 |
| Rollout | 轨迹采样 |

---

## ❓ 论文要解决什么问题？

控制器部署的核心障碍是**建模差异**：
- 为可计算而**简化模型**；
- **仿真器不准**。

通常靠**手工临时调参**才能迁移，费时且不系统。DiffCoTune 要：**自动、基于梯度**地把控制器迁到目标域，且**少量试验**即可。

---

## 🔧 方法详解

### 1. 可微仿真 + 协同调参
借**可微仿真器**对参数求梯度，**同时调**：
- **仿真器参数**（让仿真更贴近目标域）；
- **控制器参数**（让控制器适配目标域）。

二者**协同（co-tune）**，而非只调一边。

### 2. 多步目标 + 交替优化
- **多步目标**：跨多个时间步衡量性能；
- **交替优化**：轮流优化仿真与控制器参数，稳定收敛。

### 3. 迭代 rollout、少试验迁移
**迭代采集 rollout**，在**目标域少数几次试验**内完成系统迁移。

### 4. 可扩展性
对**任意复杂度**的**模型法/学习法**控制器都适用：从**倒立摆**到**高维四足/双足跟踪**均见提升。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    ROLL["🔁 目标域 rollout"] --> CO
    subgraph CO["可微协同调参 (交替优化)"]
        SIM["调仿真器参数"]
        CTRL["调控制器参数"]
        SIM <--> CTRL
    end
    CO --> OUT["🤖 少量试验内跨域迁移<br/>倒立摆→四足/双足跟踪 均提升"]

    style CO fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **可微协同调参框架**：同时调仿真器与控制器参数，自动跨域迁移；
2. **多步目标 + 交替优化**：稳定有效地适配部署域；
3. **少试验迁移**：目标域几次 rollout 内完成；
4. **强可扩展**：模型法/学习法、低维到高维（四足/双足）通用。

---

## 🤖 对人形机器人学习的启发

- **"协同调仿真 + 控制器"胜过只调一边**：把 sim-to-real 当成双向适配问题；
- **可微仿真**让调参变成梯度优化，比随机域随机化更有方向性；
- **少试验迁移**对人形（真机试验昂贵危险）极具价值；
- 与本仓 10 模块其它迁移工作（MOSAIC、ZEST）互为不同路线。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.24068](https://arxiv.org/abs/2505.24068) | 论文正文（可微协同调参、交替优化、四足/双足实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；本文为**跨域机器人控制**通用方法（含双足跟踪），收录于上游 Sim-to-Real 模块；**数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·Sim-to-Real**：本仓 10 模块 MOSAIC、ZEST 等迁移工作；
- **可迁移性评估**：[MoE 四足 + RoboGauge](../../05_Locomotion/Toward_Reliable_Sim-to-Real_Predictability_for_MoE-based_Robust_Quadrupedal_Locomotion/Toward_Reliable_Sim-to-Real_Predictability_for_MoE-based_Robust_Quadrupedal_Locomotion.html)。
