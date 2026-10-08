---
layout: paper
title: "DexMimicGen: Automated Data Generation for Bimanual Dexterous Manipulation via Imitation Learning"
zhname: "DexMimicGen：经由模仿学习的双手灵巧操作自动数据生成"
category: "Simulation Benchmark"
arxiv: "2410.24185"
---

# DexMimicGen: Automated Data Generation for Bimanual Dexterous Manipulation via Imitation Learning
**DexMimicGen：经由模仿学习的双手灵巧操作自动数据生成**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 自动数据生成 · 双手灵巧 · 模仿学习 · 真机部署
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 10 月 |
| arXiv | [2410.24185](https://arxiv.org/abs/2410.24185) · [PDF](https://arxiv.org/pdf/2410.24185) · [HTML](https://arxiv.org/html/2410.24185v1) |
| 作者 | Zhenyu Jiang、Yuqi Xie、Kevin Lin、Zhenjia Xu、Weikang Wan、Ajay Mandlekar、Linxi Fan、Yuke Zhu（UT Austin / NVIDIA） |
| 主题 | cs.RO · 自动数据生成 / 双手灵巧 / 模仿学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。

---

## 🎯 一句话总结

> 从人类演示**模仿学习**能有效教机器人操作，但**数据采集是主要瓶颈**。在**仿真**里**自动生成数据**是有吸引力、可扩展的替代。为此提出 **DexMimicGen**：一个**大规模自动数据生成系统**，从**少量人类演示**为**带灵巧手的人形机器人**合成出大量轨迹。系统包含一组覆盖多种**双手操作行为**的仿真环境，能从 **60 条源人类演示**生成 **21,000 条演示**；并在**真实人形**的**易拉罐分拣（can sorting）**任务上部署验证，评估了数据生成与策略学习的多种设计选择。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| DexMimicGen | 本文的双手灵巧数据生成系统 |
| Bimanual Dexterous | 双手灵巧（多指手）操作 |
| Trajectory Synthesis | 轨迹合成，从少量演示扩出大量 |
| Source Demo | 源演示，人类提供的少量样本 |
| Real-to-Sim-to-Real | 真实↔仿真↔真实流程 |
| Imitation Learning | 模仿学习 |

---

## ❓ 论文要解决什么问题？

模仿学习**数据采集贵**，对**双手灵巧人形**尤甚：
- 人类演示**难采、量小**；
- 双手灵巧协调复杂；
- 需可扩展的数据来源。

DexMimicGen 要：从**极少量人类演示**在仿真里**自动合成大规模**双手灵巧演示。

---

## 🔧 方法详解

### 1. 少演示 → 大规模轨迹合成
从**少量人类演示**出发，在**仿真**中**自动合成大量轨迹**，面向**带灵巧手的人形**。

### 2. 覆盖多种双手行为的仿真环境
提供一组仿真环境，覆盖多样**双手操作行为**，作为生成与评测的载体。

### 3. 真实→仿真→真实
采用 real-to-sim-to-real 思路，生成数据用于训练策略，再回到真机。

### 4. 结果
- 从 **60 条源演示** → **21,000 条演示**；
- 真实人形**易拉罐分拣**任务部署验证；
- 评估数据生成与策略学习的设计选择。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    H["🙋 60 条人类源演示"] --> GEN
    subgraph GEN["DexMimicGen 自动生成"]
        S["仿真合成 21,000 演示<br/>多种双手行为"]
    end
    GEN --> POL["模仿学习策略"]
    POL --> OUT["🤖 真实人形易拉罐分拣<br/>部署验证"]

    style GEN fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **大规模自动数据生成系统**：少演示合成海量双手灵巧轨迹；
2. **面向灵巧手人形**：覆盖多种双手操作行为；
3. **60 → 21,000 演示**：极高的数据放大比；
4. **真机部署**：人形易拉罐分拣验证。

---

## 🤖 对人形机器人学习的启发

- **自动数据生成是模仿学习规模化的关键**：把少量人类演示放大成海量训练数据；
- **双手灵巧**是数据最稀缺、最该自动化的方向；
- **real-to-sim-to-real**闭环让合成数据落到真机；
- 与 HumanoidGen、Mimicking-Bench 等共同壮大人形操作数据生态（同出 NVIDIA/UT 系）。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2410.24185](https://arxiv.org/abs/2410.24185) | 论文正文（数据生成系统、仿真环境、真机分拣） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（60→21,000）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·数据生成**：[HumanoidGen（LLM 推理生成双手数据）](../HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning/HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning.html) · [RoboCasa（自动轨迹生成）](../RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots/RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots.html)。
