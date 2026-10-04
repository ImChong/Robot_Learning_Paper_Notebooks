---
layout: paper
title: "EgoPoser: Robust Real-Time Egocentric Pose Estimation from Sparse and Intermittent Observations Everywhere"
zhname: "EgoPoser：随处可用、面向稀疏且间歇观测的鲁棒实时第一视角姿态估计"
category: "Human Motion"
arxiv: "2308.06493"
---

# EgoPoser: Robust Real-Time Egocentric Pose Estimation from Sparse and Intermittent Observations Everywhere
**现有头显第一视角全身姿态估计过度依赖室内动捕空间、假设关节连续跟踪与统一体型；EgoPoser 让全身姿态估计在「只有手进入头显视野时才有的间歇手部位置/朝向」下仍鲁棒，并提出独立于全局位置预测全身姿态的全局运动分解、用高效 SlowFast 模块兼顾更长时序与算力，且能跨不同体型泛化（ECCV 2024）**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 第一视角姿态 · 间歇观测 · 全局运动分解 · SlowFast · 跨体型 · ECCV 2024
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2023 年 8 月（ECCV 2024） |
| arXiv | [2308.06493](https://arxiv.org/abs/2308.06493) · [PDF](https://arxiv.org/pdf/2308.06493) · [HTML](https://arxiv.org/html/2308.06493v3) |
| 项目页 | [siplab.org/projects/EgoPoser](https://siplab.org/projects/EgoPoser) · [code](https://github.com/eth-siplab/EgoPoser) |
| 作者 | Jiaxi Jiang、Paul Streli、Manuel Meier、Christian Holz（ETH Zürich SIPLAB） |
| 主题 | cs.CV · 第一视角全身姿态 / 稀疏间歇观测 / VR/AR |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块（上游标 🌟）。

---

## 🎯 一句话总结

> 仅用**头与手位姿**做**全身第一视角姿态估计**是头显平台驱动化身的活跃方向，但现有方法**过度依赖室内动捕空间**（数据录制环境），且**假设关节连续跟踪与统一体型**。EgoPoser 在**更真实**的设定下做到鲁棒：手部位置/朝向**只有进入头显视野（FoV）时才被跟踪**——即**稀疏且间歇**的观测。它还有三点关键贡献：① 在**间歇手部跟踪**下仍鲁棒建模全身姿态；② **全局运动分解**——**独立于全局位置**预测全身姿态；③ 高效的 **SlowFast 模块**设计，在**捕捉更长运动时序**的同时**保持算力高效**；并能**跨不同用户体型泛化**。ECCV 2024。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Egocentric | 第一视角（头显） |
| Intermittent | 间歇（手出视野则丢跟踪） |
| FoV | Field of View，头显视野 |
| Global Motion Decomposition | 全局运动分解（独立于全局位置） |
| SlowFast | 慢-快双路时序模块 |
| Body Shape Generalization | 跨体型泛化 |

---

## ❓ 论文要解决什么问题？

现有第一视角全身姿态估计**假设太理想**：
- 依赖**室内动捕空间**、**连续**关节跟踪、**统一体型**；
- 真实中手**常出视野**→**间歇**观测；
- 全局位置变化影响稳定。

EgoPoser 要：在**稀疏间歇**观测、**任意场景、任意体型**下鲁棒实时估计全身姿态。

---

## 🔧 方法详解

### 1. 间歇手部观测下的鲁棒建模
手部位置/朝向**仅在 FoV 内**可得，EgoPoser 在这种**间歇**信号下仍稳健建模全身姿态。

### 2. 全局运动分解（独立于全局位置）
提出**全局运动分解**：**独立于全局位置**预测全身姿态，避免对绝对位置的依赖、提升泛化。

### 3. SlowFast 模块（长时序 + 高效）
高效的 **SlowFast** 设计兼顾**更长运动时序**与**算力**。

### 4. 跨体型泛化
对**不同用户体型**泛化，摆脱"统一体型"假设。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    IN["🎮 头 + 间歇手部观测<br/>(仅 FoV 内)"] --> EP
    subgraph EP["EgoPoser"]
        G["全局运动分解(独立全局位置)"]
        SF["SlowFast 模块(长时序+高效)"]
    end
    EP --> OUT["🧍 鲁棒实时全身姿态<br/>任意场景/任意体型 (ECCV 2024)"]

    style EP fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **间歇观测鲁棒**：手出视野也能稳健估全身姿态；
2. **全局运动分解**：独立于全局位置预测，提升泛化；
3. **SlowFast 模块**：长时序 + 算力高效；
4. **跨体型泛化**：摆脱统一体型假设（ECCV 2024）。

---

## 🤖 对人形机器人学习的启发

- **"间歇/缺失观测下鲁棒"是真实部署的关键**，与人形状态估计在传感缺失时的鲁棒诉求一致；
- **全局运动分解**对全身状态估计的泛化有借鉴（呼应 AvatarPoser、FRAME）；
- **SlowFast 长时序 + 高效**是实时全身估计的实用结构；
- 稀疏感知驱动全身，对人形遥操作/化身有直接价值。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2308.06493](https://arxiv.org/abs/2308.06493) | 论文正文（间歇建模、全局分解、SlowFast、实验） |
| [项目页 + 代码](https://siplab.org/projects/EgoPoser) | 概述、视频、开源代码 |

> ℹ️ 备注：本笔记依据论文公开摘要与项目页整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·稀疏/第一视角姿态**：[AvatarPoser（三点全身）](../AvatarPoser__Articulated_Full-Body_Pose_Tracking_from_Sparse_Motion_Sensing/AvatarPoser__Articulated_Full-Body_Pose_Tracking_from_Sparse_Motion_Sensing.html) · [FRAME（地面对齐第一视角）](../FRAME__Floor-aligned_Representation_for_Avatar_Motion_from_Egocentric_Video/FRAME__Floor-aligned_Representation_for_Avatar_Motion_from_Egocentric_Video.html) · [MANIKIN](../MANIKIN__Biomechanically_Accurate_Neural_Inverse_Kinematics_for_Human_Motion_Estimation/MANIKIN__Biomechanically_Accurate_Neural_Inverse_Kinematics_for_Human_Motion_Estimation.html)。
