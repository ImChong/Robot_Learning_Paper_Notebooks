---
layout: paper
title: "Humanoid Policy ~ Human Policy"
zhname: "Humanoid Policy ~ Human Policy：人形策略≈人类策略"
category: "Manipulation"
arxiv: "2503.13441"
---

# Humanoid Policy ~ Human Policy
**Humanoid Policy ~ Human Policy：人形策略≈人类策略**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 跨本体 · 第一视角人类数据 · 统一状态-动作 · 可微重定向 · 协同训练
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 3 月 |
| arXiv | [2503.13441](https://arxiv.org/abs/2503.13441) · [PDF](https://arxiv.org/pdf/2503.13441) · [HTML](https://arxiv.org/html/2503.13441v1) |
| 作者 | Ri-Zhao Qiu、Shiqi Yang、Xuxin Cheng、Tairan He、Ryan Hoque、Guanya Shi、Xiaolong Wang 等（UCSD / CMU 等） |
| 主题 | cs.RO · 跨本体 / 人类数据 / 人形操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 用**多样数据**训练人形操作策略能增强**鲁棒与跨任务/跨平台泛化**。但只从**机器人演示**学很费力——需昂贵遥操作、难规模化。本文研究一种更可扩展的数据源：**第一视角人类演示**，作为机器人学习的**跨本体训练数据**。工作从**数据采集与建模**两方面弥合**具身差距**：① 引入与人形任务对齐的第一视角人类数据集 **PH2D**；② 提出 **Human Action Transformer（HAT）**，**统一人类与人形的状态-动作表示**，并具备**可微重定向**能力；再**与机器人数据协同训练**。相比只用机器人数据，**人类数据显著提升泛化与鲁棒**，且**大幅提高数据采集效率**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Cross-Embodiment | 跨本体（人↔人形） |
| PH2D | 与人形任务对齐的第一视角人类数据集 |
| HAT | Human Action Transformer |
| Unified State-Action | 统一状态-动作表示 |
| Differentiable Retargeting | 可微重定向 |
| Co-training | 协同训练（人类 + 机器人数据） |

---

## ❓ 论文要解决什么问题？

只用机器人演示训练人形操作**费力难扩展**：
- 遥操作贵；
- 想用**第一视角人类数据**，但有**具身差距**（状态/动作空间不同）。

论文要：用**第一视角人类演示**作跨本体数据，弥合具身差距、提升人形操作。

---

## 🔧 方法详解

### 1. PH2D：与人形任务对齐的人类数据集
构建**第一视角人类数据集 PH2D**，与目标**人形任务对齐**，作为跨本体训练源。

### 2. HAT：统一状态-动作 + 可微重定向
**Human Action Transformer（HAT）**把**人类与人形**的**状态-动作统一**表示，并支持**可微重定向**——让人类动作可端到端转成人形动作。

### 3. 与机器人数据协同训练
把人类数据与机器人数据**协同训练**，兼得规模与对齐。

### 4. 结果
- 相比仅机器人数据：**泛化与鲁棒显著提升**；
- **数据采集效率大幅提高**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    PH2D["👁️ PH2D 第一视角人类数据"] --> HAT
    ROBOT["🤖 机器人数据"] --> HAT
    subgraph HAT["Human Action Transformer"]
        U["统一人类↔人形状态-动作<br/>+ 可微重定向"]
    end
    HAT --> OUT["🤖 人形操作<br/>泛化/鲁棒↑ · 采集效率↑"]

    style HAT fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **第一视角人类数据作跨本体训练源**：可扩展、采集高效；
2. **PH2D 数据集**：与人形任务对齐；
3. **HAT 统一状态-动作 + 可微重定向**：端到端弥合具身差距；
4. **协同训练显著增益**：泛化与鲁棒提升。

---

## 🤖 对人形机器人学习的启发

- **"人形策略≈人类策略"是有力的跨本体假设**：统一表示让人类数据直接可用；
- **可微重定向**把"人→人形"做成可学模块，优于手工重定向；
- **协同训练**兼得人类规模与机器人对齐；
- 与 H-RDT、Being-H0、In-N-On 共同构成"人类数据驱动人形操作"的方法簇（作者群高度重叠）。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.13441](https://arxiv.org/abs/2503.13441) | 论文正文（PH2D、HAT、协同训练实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人类数据跨本体**：[H-RDT](../H-RDT__Human_Manipulation_Enhanced_Bimanual_Robotic_Manipulation/H-RDT__Human_Manipulation_Enhanced_Bimanual_Robotic_Manipulation.html) · [Being-H0](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html) · [EgoDex](../EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video/EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video.html)。
