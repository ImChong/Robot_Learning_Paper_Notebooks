---
layout: paper
title: "Implicit Bézier Motion Model for Precise Spatial and Temporal Control"
zhname: "隐式贝塞尔运动模型：精确的空间与时间控制"
category: "Human Motion"
---

# Implicit Bézier Motion Model for Precise Spatial and Temporal Control
**针对此前贝塞尔运动模型（BMM）只能在均匀时间间隔预测固定控制点、艺术家无法做细粒度时间控制的局限，IBMM 在训练中隐式学习贝塞尔拟合、允许任意时间控制点、彻底取消「步幅（stride）」概念，使艺术家可在任意帧约束任意末端关节，并新增对运动全局缓入/缓出（ease-in/out）的直接全局时间控制——首个在生成自然运动时无需人工标注即可全局控时的方法（SIGGRAPH MIG 2025, Disney）**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 贝塞尔运动模型 · 时空控制 · 隐式拟合 · 全局缓入缓出 · SIGGRAPH MIG 2025
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月（SIGGRAPH MIG 2025） |
| 发表 | [Disney Research Studios 项目页](https://studios.disneyresearch.com/2025/12/03/implicit-bezier-motion-model-for-precise-spatial-and-temporal-control/) · [ACM DL](https://dl.acm.org/doi/10.1145/3769047.3769052) |
| 作者 | Disney Research Studios（详见项目页） |
| 主题 | cs.GR · 角色动画 / 运动模型 / 时空控制 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块（上游未给 arXiv 链接，发表于 SIGGRAPH MIG 2025）。

---

## 🎯 一句话总结

> **隐式贝塞尔运动模型（Implicit Bézier Motion Model, IBMM）**提供对生成运动的**细粒度空间与时间控制**。它针对此前**贝塞尔运动模型（BMM）**的关键局限——BMM 只能在**均匀时间间隔**预测**一组固定控制点**，使艺术家**无法做细粒度时间控制**（如在时间上移动控制点、或在需要更多细节的区域增加控制点）。IBMM 在**训练时隐式学习贝塞尔拟合**，支持**任意时间控制点**，**无需对数据预先拟合**，并**彻底取消「步幅（stride）」概念**，使艺术家可在**任意帧**约束**任意末端关节**。此外，IBMM 还为用户引入一项**新的全局控制**：对运动**全局缓入/缓出（ease-in/out）**的**直接手柄**——这是**首个**在**生成自然运动**时**无需人工标注**即可**全局控制时间**的方法。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| IBMM | Implicit Bézier Motion Model |
| BMM | （前作）Bézier Motion Model |
| Control Point | 贝塞尔控制点 |
| Stride | 步幅（固定时间间隔，本文取消） |
| Ease-in/out | 缓入/缓出（全局时间控制） |
| End-effector | 末端关节 |

---

## ❓ 论文要解决什么问题？

前作 **BMM** 的时间控制太僵：
- 只在**均匀间隔**预测**固定控制点**；
- 艺术家**无法**在时间上移动/增加控制点；
- 缺**全局时间（缓入/缓出）**控制。

IBMM 要：**任意时间控制点**、**任意帧约束任意末端**、且可**全局控时**，无需人工标注。

---

## 🔧 方法详解

### 1. 隐式贝塞尔拟合（取消步幅）
训练中**隐式学习贝塞尔拟合**，支持**任意时间控制点**，**无需预拟合数据**，并**彻底取消步幅**概念。

### 2. 任意帧约束任意末端
艺术家可在**任意帧**约束**任意末端关节**，实现细粒度**空间**控制。

### 3. 全局缓入/缓出控制
新增**全局 ease-in/out 直接手柄**——首个在生成自然运动时**无需人工标注**即可**全局控时**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    USER["🎨 艺术家约束<br/>任意帧 · 任意末端 · 任意时间控制点"] --> IBMM
    subgraph IBMM["IBMM(隐式贝塞尔)"]
        F["训练时隐式拟合(取消步幅)"]
        G["全局缓入/缓出手柄"]
    end
    IBMM --> OUT["🕺 精确时空可控的自然运动<br/>(SIGGRAPH MIG 2025)"]

    style IBMM fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **隐式贝塞尔拟合**：任意时间控制点、无需预拟合、取消步幅；
2. **任意帧约束任意末端**：细粒度空间控制；
3. **全局缓入/缓出控制**：首个无需人工标注的全局控时；
4. **面向艺术家工作流**：精确时空控制的自然运动生成。

---

## 🤖 对人形机器人学习的启发

- **"任意帧约束任意末端 + 全局控时"是强可控运动表示**，对人形动作编辑/关键帧规划有借鉴；
- **隐式拟合取消步幅**比固定时间网格更灵活，可迁移到机器人轨迹参数化；
- **全局缓入/缓出**对应运动的加减速塑形，与人形动作自然性相关；
- 贝塞尔等紧凑参数化适合作机器人参考轨迹的可控表示。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [Disney Research 项目页](https://studios.disneyresearch.com/2025/12/03/implicit-bezier-motion-model-for-precise-spatial-and-temporal-control/) | 概述、视频、方法说明 |
| [ACM DL](https://dl.acm.org/doi/10.1145/3769047.3769052) | SIGGRAPH MIG 2025 论文 |

> ℹ️ 备注：本论文发表于 SIGGRAPH MIG 2025（Disney Research），**上游与公开页面未提供 arXiv**；本笔记依据项目页/公开摘要整理，**细节以正式论文为准**。

---

## 🔗 相关阅读

- **同模块·可控动作生成**：[Flexible Motion In-betweening（关键帧约束）](../Flexible_Motion_In-betweening_with_Diffusion_Models/Flexible_Motion_In-betweening_with_Diffusion_Models.html) · [Guided Motion Diffusion](../Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis/Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis.html)。
