---
layout: paper
title: "BiGym: A Demo-Driven Mobile Bi-Manual Manipulation Benchmark"
zhname: "BiGym：演示驱动的移动双手操作基准"
category: "Simulation Benchmark"
arxiv: "2407.07788"
---

# BiGym: A Demo-Driven Mobile Bi-Manual Manipulation Benchmark
**面向移动双手、演示驱动操作的新基准与学习环境：含 40 个家居任务（从简单到达到复杂厨房清洁），为每个任务提供人类采集的演示以反映真实轨迹的多样模态；支持本体感受与 3 视角 RGB/深度观测，并系统评测了当前最佳模仿学习与演示驱动强化学习算法**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 移动双手 · 演示驱动 · 家居任务 · 多视角观测
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 7 月 |
| arXiv | [2407.07788](https://arxiv.org/abs/2407.07788) · [PDF](https://arxiv.org/pdf/2407.07788) · [HTML](https://arxiv.org/html/2407.07788v1) |
| 作者 | Nikita Chernyadev、Nicholas Backshall、Xiao Ma、Yunfan Lu、Younggyo Seo、Stephen James（Dyson Robot Learning Lab） |
| 主题 | cs.RO · 移动双手操作 / 演示驱动 / 基准 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。

---

## 🎯 一句话总结

> BiGym 是一个面向**移动双手、演示驱动**机器人操作的新**基准与学习环境**。它含 **40 个家居任务**，从**简单到达**到**复杂厨房清洁**。为准确反映真实表现，BiGym 为**每个任务**提供**人类采集的演示**，体现真实机器人轨迹的**多样模态**。它支持多种观测，包括**本体感受**与**视觉输入**（**3 个相机视角**的 **RGB 与深度**）。为验证可用性，作者在环境中**充分评测**了当前最佳的**模仿学习**与**演示驱动强化学习**算法，并讨论了未来机会。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Demo-Driven | 演示驱动，依赖人类演示 |
| Bi-Manual | 双手 |
| Mobile Manipulation | 移动操作 |
| Proprioception | 本体感受 |
| RGB-D | 彩色 + 深度（3 视角） |
| IL / Demo-Driven RL | 模仿学习 / 演示驱动强化学习 |

---

## ❓ 论文要解决什么问题？

移动双手操作缺**演示驱动**的统一基准：
- 现有基准少覆盖**移动 + 双手 + 家居多样任务**；
- 缺**人类演示**反映真实轨迹多样性；
- 缺统一环境评测 IL 与演示驱动 RL。

BiGym 要：一个**演示驱动、移动双手、家居多任务**的基准与环境。

---

## 🔧 方法详解

### 1. 40 家居任务 + 人类演示
覆盖**简单到达 → 复杂厨房清洁**的 **40 个任务**，每个任务配**人类采集演示**，反映真实轨迹的**多样模态**。

### 2. 多模态观测
支持**本体感受** + **3 视角 RGB/深度**视觉输入，贴近真实机器人感知。

### 3. 系统评测 IL / 演示驱动 RL
在环境中**充分基准**当前最佳**模仿学习**与**演示驱动强化学习**算法，给出参考与未来方向。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DEMO["🙋 人类演示(每任务)"] --> BG
    subgraph BG["BiGym 环境"]
        T["40 家居任务(到达→厨房清洁)"]
        O["本体感受 + 3 视角 RGB/深度"]
    end
    BG --> EVAL["评测 IL / 演示驱动 RL"]
    EVAL --> OUT["📊 移动双手操作基准<br/>未来机会讨论"]

    style BG fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **演示驱动移动双手基准**：40 家居任务，覆盖难度谱；
2. **人类演示**：每任务配演示，反映真实轨迹多样性；
3. **多模态观测**：本体感受 + 3 视角 RGB/深度；
4. **系统评测**：IL 与演示驱动 RL 基线。

---

## 🤖 对人形机器人学习的启发

- **移动 + 双手**是人形家务的核心，BiGym 提供演示驱动评测床；
- **人类演示反映真实多样模态**对模仿学习评测很重要；
- **演示驱动 RL** 是 IL 与 RL 的折中，值得在人形任务上探索；
- 与 RoboCasa、ManiSkill-HAB 等家居基准互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2407.07788](https://arxiv.org/abs/2407.07788) | 论文正文（40 任务、人类演示、IL/RL 基准） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；本基准以移动双手机器人为主，因收录于上游而纳入；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·家居/双手基准**：[RoboCasa](../RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots/RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots.html) · [ManiSkill-HAB](../ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks/ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks.html)。
