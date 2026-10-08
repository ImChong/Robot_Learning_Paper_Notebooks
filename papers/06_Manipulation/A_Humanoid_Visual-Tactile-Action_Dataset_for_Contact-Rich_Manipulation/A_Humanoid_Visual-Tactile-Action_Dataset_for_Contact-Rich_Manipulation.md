---
layout: paper
title: "A Humanoid Visual-Tactile-Action Dataset for Contact-Rich Manipulation"
zhname: "面向接触丰富操作的人形视觉-触觉-动作数据集"
category: "Manipulation"
arxiv: "2510.25725"
---

# A Humanoid Visual-Tactile-Action Dataset for Contact-Rich Manipulation
**面向接触丰富操作的人形视觉-触觉-动作数据集**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 视触觉数据集 · 接触丰富 · 可变形物体 · 多模态 · 遥操作
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 10 月 |
| arXiv | [2510.25725](https://arxiv.org/abs/2510.25725) · [PDF](https://arxiv.org/pdf/2510.25725) · [HTML](https://arxiv.org/html/2510.25725v1) |
| 作者 | Eunju Kwon、Seungwon Oh、In-Chang Baek、Yunho Choi、Kyung-Joong Kim 等（GIST 等） |
| 主题 | cs.RO · 视触觉数据集 / 接触丰富操作 / 可变形物体 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> **接触丰富操作**在机器人学习中越来越重要，但以往机器人学习数据集多聚焦**刚体**，**低估了真实操作中压力条件的多样性**。为填补此空白，本文提出一个面向**可变形软物体**操作的**人形视觉-触觉-动作数据集**。数据用**带灵巧手的人形**通过**遥操作**采集，包含**视觉与触觉多模态**信号，并覆盖**不同压力条件**。该工作旨在**激励**未来研究——开发**具备先进优化策略**、能**有效利用复杂多样触觉信号**的模型，而非在摘要中报告具体数值。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Visual-Tactile-Action | 视觉-触觉-动作多模态 |
| Contact-Rich | 接触丰富（频繁/复杂接触） |
| Deformable Object | 可变形软物体 |
| Pressure Condition | 压力条件（按压力度等） |
| Teleoperation | 遥操作采集 |
| Dexterous Hand | 灵巧手 |

---

## ❓ 论文要解决什么问题？

接触丰富操作的数据缺口：
- 现有数据集多为**刚体**，少**可变形软物体**；
- **压力条件多样性**被低估；
- 缺**人形 + 灵巧手 + 视触觉**的多模态数据。

论文要：构建一个**人形视触觉-动作数据集**，专门覆盖**软物体 + 多压力**的接触丰富操作。

---

## 🔧 方法详解

### 1. 人形 + 灵巧手 + 遥操作采集
用**带灵巧手的人形**通过**遥操作**采集真实操作数据，保证动作真实可执行。

### 2. 视觉 + 触觉多模态
同步采集**视觉**与**触觉**信号，使数据能支撑"看 + 摸"的接触丰富操作学习。

### 3. 覆盖可变形软物体与多压力条件
聚焦**可变形软物体**，并覆盖**不同压力条件**，填补以往刚体/单一压力的空白。

### 4. 目标
**激励**未来开发能**有效利用复杂多样触觉信号**的模型与优化策略。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    H["🤖 人形 + 灵巧手(遥操作)"] --> DATA
    subgraph DATA["视觉-触觉-动作数据集"]
        V["视觉"]
        T["触觉(多压力)"]
        A["动作"]
        SOFT["可变形软物体"]
    end
    DATA --> OUT["📊 接触丰富操作研究<br/>激励利用复杂触觉信号的模型"]

    style DATA fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **人形视觉-触觉-动作数据集**：面向接触丰富操作；
2. **可变形软物体 + 多压力条件**：填补刚体/单一压力的空白；
3. **多模态 + 灵巧手遥操作采集**：真实可执行；
4. **激励触觉模型研究**：推动有效利用复杂触觉信号。

---

## 🤖 对人形机器人学习的启发

- **触觉是接触丰富/软物体操作的关键模态**，视觉常不足；
- **可变形物体 + 多压力**更贴近真实家务/护理场景；
- **数据集 + 灵巧手人形**为触觉学习提供稀缺资源；
- 与 CHIP、HMC 等"柔顺/力"工作在"接触"主题上互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2510.25725](https://arxiv.org/abs/2510.25725) | 论文正文（数据集构成、采集、触觉信号分析） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·视触觉操作**：[Learning Visuotactile Skills with Two Multifingered Hands](../Learning_Visuotactile_Skills_with_Two_Multifingered_Hands/Learning_Visuotactile_Skills_with_Two_Multifingered_Hands.html)；
- **柔顺/接触（本仓 04）**：[CHIP](../../04_Loco-Manipulation_and_WBC/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html)。
