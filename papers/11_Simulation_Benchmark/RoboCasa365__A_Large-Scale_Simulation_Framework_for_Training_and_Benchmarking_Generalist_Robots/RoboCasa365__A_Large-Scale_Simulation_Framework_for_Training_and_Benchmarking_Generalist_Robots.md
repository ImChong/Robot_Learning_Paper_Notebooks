---
layout: paper
title: "RoboCasa365: A Large-Scale Simulation Framework for Training and Benchmarking Generalist Robots"
zhname: "RoboCasa365：训练与评测通才机器人的大规模仿真框架"
category: "Simulation Benchmark"
arxiv: "2603.04356"
---

# RoboCasa365: A Large-Scale Simulation Framework for Training and Benchmarking Generalist Robots
**在 RoboCasa 之上大规模扩展资产、环境、任务与数据集：含 365 个日常任务、2500 个多样厨房场景、600+ 小时人类演示与 1600 小时合成演示，并提供系统化基准；支持单臂移动平台、人形、带臂四足等多种形态，面向多任务学习、机器人基础模型训练与终身学习**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 大规模仿真 · 365 任务 · 多形态 · 基础模型 · 终身学习
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 3 月 |
| arXiv | [2603.04356](https://arxiv.org/abs/2603.04356) · [PDF](https://arxiv.org/pdf/2603.04356) · [HTML](https://arxiv.org/html/2603.04356v1) |
| 会议 | ICLR（会议贡献，见原文） |
| 项目页 | [robocasa.ai](https://robocasa.ai/) |
| 主题 | cs.RO · 大规模仿真 / 通才机器人 / 基准 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块（上游未直接给出 arXiv，经核对为 2603.04356）。

---

## 🎯 一句话总结

> RoboCasa365 是一个面向**通才机器人**训练与评测的**大规模仿真框架**，在已有 **RoboCasa** 基础上**大幅扩展**资产、环境、任务与数据集。它包含 **365 个日常任务**、**2500 个多样厨房场景**、**600+ 小时人类演示**与额外 **1600 小时合成演示**，并提供**系统化基准**用于训练与评测通才机器人模型。框架支持**多种形态的移动操作机器人**——**单臂移动平台、人形机器人、带臂四足**——并面向**多任务学习、机器人基础模型训练、终身学习**等不同问题设定提供系统化评测。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Generalist Robot | 通才机器人，一模型多任务多形态 |
| 365 Tasks | 365 个日常任务 |
| Multi-task Learning | 多任务学习 |
| Foundation Model | 机器人基础模型 |
| Lifelong Learning | 终身学习 |
| Mobile Manipulator | 移动操作机器人（含人形/四足） |

---

## ❓ 论文要解决什么问题？

训练**通才机器人**缺**足够大、足够系统**的仿真与基准：
- 任务/场景/数据规模不足；
- 缺**跨形态**（含人形）统一平台；
- 缺面向**基础模型/终身学习**的系统化评测设定。

RoboCasa365 要：一个**大规模、多形态、系统化**的训练与评测框架。

---

## 🔧 方法详解

### 1. 在 RoboCasa 上大规模扩展
扩展**资产、环境、任务、数据集**：**365 任务**、**2500 厨房场景**、**600+ 小时人类演示 + 1600 小时合成演示**。

### 2. 多形态支持
支持**单臂移动平台、人形、带臂四足**等多种移动操作形态，便于跨本体研究。

### 3. 系统化基准与问题设定
面向**多任务学习、基础模型训练、终身学习**提供系统化评测。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    RC["RoboCasa"] --> RC365
    subgraph RC365["RoboCasa365 扩展"]
        T["365 任务 · 2500 厨房场景"]
        D["600h 人类 + 1600h 合成演示"]
        M["多形态：单臂/人形/带臂四足"]
    end
    RC365 --> OUT["📊 多任务/基础模型/终身学习<br/>系统化基准"]

    style RC365 fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **大规模扩展 RoboCasa**：365 任务、2500 场景、600h+1600h 演示；
2. **多形态支持**：单臂/人形/带臂四足；
3. **系统化基准**：面向多任务、基础模型、终身学习；
4. **通才机器人训练/评测平台**。

---

## 🤖 对人形机器人学习的启发

- **规模 + 多形态**是训练机器人基础模型的底座，人形是其中一等公民；
- **大量合成演示**缓解真实数据稀缺；
- **终身学习/基础模型设定**指向通用机器人智能的评测方向；
- 与本仓 11 其它基准（RoboCasa、ManiSkill-HAB、BiGym）一脉相承、规模更大。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2603.04356](https://arxiv.org/abs/2603.04356) | 论文正文（资产/任务/数据扩展、多形态、基准） |
| [robocasa.ai](https://robocasa.ai/) | 项目主页 |

> ℹ️ 备注：本笔记依据 arXiv 公开信息与项目页整理；**逐项数值（365/2500/600h/1600h）以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·大规模仿真/基准**：[RoboCasa（前作）](../RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots/RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots.html) · [ManiSkill-HAB](../ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks/ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks.html)。
