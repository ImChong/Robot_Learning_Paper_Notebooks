---
layout: paper
title: "RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots"
zhname: "RoboCasa：面向通才机器人的日常任务大规模仿真"
category: "Simulation Benchmark"
arxiv: "2406.02523"
---

# RoboCasa: Large-Scale Simulation of Everyday Tasks for Generalist Robots
**RoboCasa：面向通才机器人的日常任务大规模仿真**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 大规模仿真 · 厨房 · 生成式资产 · 100 任务 · 规模化
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 6 月 |
| arXiv | [2406.02523](https://arxiv.org/abs/2406.02523) · [PDF](https://arxiv.org/pdf/2406.02523) · [HTML](https://arxiv.org/html/2406.02523v1) |
| 项目页 | [robocasa.ai](https://robocasa.ai/) |
| 作者 | Soroush Nasiriany、Abhiram Maddukuri、Lance Zhang、Adeet Parikh、Ajay Mandlekar、Yuke Zhu 等（UT Austin / NVIDIA） |
| 主题 | cs.RO · 大规模仿真 / 通才机器人 / 日常任务 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。

---

## 🎯 一句话总结

> AI 的进展很大程度由**规模化**驱动，但机器人受限于**缺乏海量机器人数据集**。本文主张用**逼真物理仿真**来规模化机器人学习的**环境、任务与数据**。RoboCasa 是一个面向**日常环境**训练**通才机器人**的**大规模仿真框架**，以**厨房**为核心，提供**逼真多样**的场景、跨 **150+ 物体类别**的**数千 3D 资产**与数十种**可交互家具家电**。它用**生成式 AI**（**文本生 3D** 资产、**文本生图像**纹理）增强真实与多样性；设计 **100 个任务**用于系统评测，含由**大模型引导**生成的**复合任务**。为便于学习，提供**高质量人类演示**并集成**自动轨迹生成**以**最小人力**大幅扩充数据集。实验显示：用**合成生成**的机器人数据做**大规模模仿学习**有清晰的**规模化趋势**，且在真实任务上**前景可观**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Generalist Robot | 通才机器人 |
| Text-to-3D / Text-to-Image | 文本生 3D / 文本生图，生成资产/纹理 |
| Composite Task | 复合任务（LLM 引导生成） |
| Trajectory Generation | 自动轨迹生成 |
| Scaling Trend | 规模化趋势 |
| 3D Asset | 3D 资产 |

---

## ❓ 论文要解决什么问题？

机器人学习缺**海量数据**：
- 真实采集**贵、慢**；
- 缺**逼真、多样、可规模化**的仿真环境/任务/数据。

RoboCasa 要：用**逼真仿真 + 生成式 AI + 自动轨迹生成**，把环境/任务/数据**规模化**。

---

## 🔧 方法详解

### 1. 逼真厨房场景 + 海量资产
以**厨房**为核心，提供**150+ 物体类别**的**数千 3D 资产**与可交互家具家电，场景逼真多样。

### 2. 生成式 AI 增强多样性
用**文本生 3D**（物体资产）与**文本生图**（环境纹理）增强真实与多样性。

### 3. 100 任务（含 LLM 复合任务）
设计 **100 个任务**做系统评测，含由**大模型引导**生成的**复合任务**。

### 4. 演示 + 自动轨迹生成
提供**高质量人类演示**，并集成**自动轨迹生成**以**最小人力**扩充数据。

### 5. 规模化结论
**合成数据**做**大规模模仿学习**有清晰**规模化趋势**，真实任务前景可观。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph RC["RoboCasa(厨房)"]
        A["数千 3D 资产 / 150+ 类别"]
        G["生成式 AI：文本生3D/纹理"]
        T["100 任务(含 LLM 复合)"]
        D["人类演示 + 自动轨迹生成"]
    end
    RC --> OUT["📊 合成数据大规模 IL<br/>清晰规模化趋势 · 真实前景"]

    style RC fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **大规模厨房仿真框架**：数千资产、150+ 类别、可交互家具家电；
2. **生成式 AI 增强**：文本生 3D 资产与纹理；
3. **100 任务（含 LLM 复合）+ 演示/自动轨迹生成**；
4. **规模化实证**：合成数据大规模 IL 呈清晰规模化趋势。

---

## 🤖 对人形机器人学习的启发

- **"仿真 + 生成式 AI"是规模化数据的强力路径**，后续 RoboCasa365 进一步放大；
- **自动轨迹生成**以最小人力扩数据，是数据飞轮关键；
- **规模化趋势**为机器人基础模型提供信心；
- 厨房日常任务对人形家务落地高度相关。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2406.02523](https://arxiv.org/abs/2406.02523) | 论文正文（场景/资产、生成式增强、100 任务、规模化实验） |
| [robocasa.ai](https://robocasa.ai/) | 项目主页 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与项目页整理；本框架以移动机械臂为主，因收录于上游而纳入；**数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·大规模仿真**：[RoboCasa365（后续大规模扩展）](../RoboCasa365__A_Large-Scale_Simulation_Framework_for_Training_and_Benchmarking_Generalist_Robots/RoboCasa365__A_Large-Scale_Simulation_Framework_for_Training_and_Benchmarking_Generalist_Robots.html) · [ManiSkill-HAB](../ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks/ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks.html) · [BiGym](../BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark/BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark.html)。
