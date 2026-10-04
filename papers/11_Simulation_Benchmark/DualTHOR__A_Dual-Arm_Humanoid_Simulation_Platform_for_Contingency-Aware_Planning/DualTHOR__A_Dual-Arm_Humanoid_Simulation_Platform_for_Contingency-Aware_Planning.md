---
layout: paper
title: "DualTHOR: A Dual-Arm Humanoid Simulation Platform for Contingency-Aware Planning"
zhname: "DualTHOR：面向意外感知规划的双臂人形仿真平台"
category: "Simulation Benchmark"
arxiv: "2506.16012"
---

# DualTHOR: A Dual-Arm Humanoid Simulation Platform for Contingency-Aware Planning
**在扩展版 AI2-THOR 上构建的双臂人形物理仿真平台：含真实机器人资产、双臂协作任务套件、面向人形的逆运动学求解器，并引入纳入执行失败的「意外（contingency）」机制；用于评测 VLM 在家务任务上的双臂协调与抗意外鲁棒性，发现当前 VLM 在双臂协调与现实意外下能力有限**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 双臂人形 · AI2-THOR · 意外感知规划 · VLM 评测 · IK
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 6 月 |
| arXiv | [2506.16012](https://arxiv.org/abs/2506.16012) · [PDF](https://arxiv.org/pdf/2506.16012) · [HTML](https://arxiv.org/html/2506.16012v1) |
| 作者 | Boyu Li、Siyuan He、Hang Xu、Haoqi Yuan、Junpeng Yue、Börje F. Karlsson、Zongqing Lu 等 |
| 主题 | cs.RO · 双臂人形仿真 / 意外感知规划 / VLM 评测 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。
>
> ⚠️ 备注：该 arXiv 条目的 v2 已被作者**撤稿（withdrawn, 2025-10）**；本笔记按上游收录与 v1 摘要整理，使用时请留意其状态。

---

## 🎯 一句话总结

> 开发能在真实场景做**复杂交互任务**的具身智能体，仍是具身 AI 的根本挑战。DualTHOR 是一个面向**复杂双臂人形机器人**的**物理仿真平台**，构建在**扩展版 AI2-THOR** 之上。它包含：**真实世界机器人资产**、**双臂协作任务套件**、以及面向**人形形态**优化的**逆运动学（IK）求解器**；并引入一个**纳入执行失败的「意外（contingency）」机制**，让仿真更贴近现实的不确定性。论文用它评测**视觉语言模型（VLM）**在**家务任务**上的表现，发现当前 VLM 在**双臂协调**上能力**有限**、面对现实**意外**时**鲁棒性下降**，凸显该平台对发展更强具身 AI 的价值。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| AI2-THOR | 一个具身 AI 室内仿真环境 |
| Dual-Arm Humanoid | 双臂人形 |
| Contingency | 意外/突发，含执行失败 |
| IK | Inverse Kinematics，逆运动学 |
| VLM | Vision-Language Model |
| Task Suite | 任务套件 |

---

## ❓ 论文要解决什么问题？

具身 AI 缺**双臂人形 + 贴近现实意外**的仿真：
- 多数平台面向单臂/简化抓取；
- 缺**执行失败/意外**建模，与真实差距大；
- 不清楚 VLM 在双臂协调与意外下表现如何。

DualTHOR 要：一个**双臂人形、含意外机制**的物理仿真平台 + VLM 评测。

---

## 🔧 方法详解

### 1. 扩展 AI2-THOR 的双臂人形物理仿真
在 **AI2-THOR** 上扩展，加入**真实机器人资产**、**双臂协作任务套件**与面向**人形**的 **IK 求解器**。

### 2. 意外（contingency）机制
显式**纳入执行失败**等**意外**，让仿真涵盖现实不确定性，支持**意外感知规划**的研究。

### 3. VLM 评测
用平台评测 **VLM** 在**家务任务**上的**双臂协调**与**抗意外鲁棒性**。

### 4. 发现
当前 VLM **双臂协调能力有限**、面对现实**意外鲁棒性下降**——平台揭示了改进空间。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    THOR["AI2-THOR 扩展"] --> PLAT
    subgraph PLAT["DualTHOR 平台"]
        A["真实机器人资产"]
        T["双臂协作任务套件"]
        IK["人形 IK 求解器"]
        C["意外机制(执行失败)"]
    end
    PLAT --> EVAL["VLM 评测(家务任务)"]
    EVAL --> OUT["📊 VLM 双臂协调有限<br/>意外下鲁棒性↓"]

    style PLAT fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **双臂人形物理仿真平台**：扩展 AI2-THOR，含真实资产、双臂任务、人形 IK；
2. **意外机制**：纳入执行失败，支持意外感知规划研究；
3. **VLM 评测**：揭示当前 VLM 双臂协调与抗意外的不足；
4. **研究资源**：为更强具身 AI 提供测试床。

---

## 🤖 对人形机器人学习的启发

- **"意外感知"是从仿真走向现实的关键缺口**：现实充满执行失败，仿真应建模之；
- **双臂人形平台**填补单臂仿真的空白；
- **VLM 仍难做双臂协调**，提示高层规划与底层执行的鸿沟；
- 与本仓 11 其它仿真/基准平台共同丰富评测生态。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2506.16012](https://arxiv.org/abs/2506.16012) | 论文正文（平台、意外机制、VLM 评测）；注意 v2 已撤稿 |

> ℹ️ 备注：本笔记依据 arXiv v1 摘要整理；该条目 v2 已撤稿，**细节与状态以原文为准**。

---

## 🔗 相关阅读

- **同模块·仿真平台/基准**：[ManiSkill-HAB（家务重排低层操作）](../ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks/ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks.html) · [RoboCasa（日常任务大规模仿真）](../RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots/RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots.html)。
