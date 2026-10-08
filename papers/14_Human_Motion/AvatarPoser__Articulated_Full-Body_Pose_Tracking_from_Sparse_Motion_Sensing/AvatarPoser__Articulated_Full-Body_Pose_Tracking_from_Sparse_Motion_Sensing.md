---
layout: paper
title: "AvatarPoser: Articulated Full-Body Pose Tracking from Sparse Motion Sensing"
zhname: "AvatarPoser：从稀疏运动感知做关节化全身姿态跟踪"
category: "Human Motion"
arxiv: "2207.13784"
---

# AvatarPoser: Articulated Full-Body Pose Tracking from Sparse Motion Sensing
**AvatarPoser：从稀疏运动感知做关节化全身姿态跟踪**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 稀疏感知 · 全身姿态 · 三点输入 · Transformer · VR/AR · ECCV 2022
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2022 年 7 月（ECCV 2022） |
| arXiv | [2207.13784](https://arxiv.org/abs/2207.13784) · [PDF](https://arxiv.org/pdf/2207.13784) · [HTML](https://arxiv.org/html/2207.13784v1) |
| 项目页 | [siplab.org/projects/AvatarPoser](https://siplab.org/projects/AvatarPoser) · [code](https://github.com/eth-siplab/AvatarPoser) |
| 作者 | Jiaxi Jiang、Paul Streli、Huajian Qiu、Andreas Fender、Christian Holz 等（ETH Zürich SIPLAB） |
| 主题 | cs.CV · 全身姿态跟踪 / 稀疏感知 / VR/AR |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块（上游标 🌟）。

---

## 🎯 一句话总结

> 在 **VR/AR 头显**平台上驱动**关节化化身**，通常只能拿到**稀疏运动信号**——**头显（HMD）+ 两个手柄**的**三点**位姿。AvatarPoser 提出从这些**稀疏运动感知**实时重建**全身关节姿态**：基于 **Transformer** 的网络从稀疏输入预测**全身关节旋转**，并把**全局运动**与**局部姿态解耦**（用稳定的全局参考），再用**逆运动学（IK）**微调手臂，使预测末端**精确对齐输入**关节。AvatarPoser 在大规模 **AMASS** 动作数据上达 **SOTA**，为头显平台的**化身驱动**奠定基础（ECCV 2022）。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Sparse Motion Sensing | 稀疏运动感知（三点输入） |
| 3-point Input | 头显 + 两手柄三点位姿 |
| Articulated Pose | 关节化全身姿态 |
| Global/Local Decoupling | 全局运动与局部姿态解耦 |
| IK | Inverse Kinematics，逆运动学微调 |
| AMASS | 大规模人体动作数据集 |

---

## ❓ 论文要解决什么问题？

头显平台只有**三点稀疏信号**，却要驱动**全身化身**：
- 从极稀疏输入推全身**欠约束**；
- 要**实时**、手部要**精确对齐**输入；
- 全局漂移影响稳定。

AvatarPoser 要：从三点稀疏输入实时、精确地重建全身关节姿态。

---

## 🔧 方法详解

### 1. Transformer 从三点预测全身关节
基于 **Transformer** 的网络，从**头显 + 双手柄**三点位姿预测**全身关节旋转**。

### 2. 全局-局部解耦
把**全局运动**与**局部姿态解耦**，在稳定的全局参考下预测局部姿态，减少漂移。

### 3. IK 微调手臂（精确对齐）
用**逆运动学**微调手臂关节，使预测末端**精确对齐输入**手柄位姿，消除手部误差。

### 4. 结果
在 **AMASS** 上达 **SOTA**，实时驱动头显化身。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    IN["🎮 三点输入<br/>HMD + 两手柄位姿"] --> T
    subgraph T["AvatarPoser(Transformer)"]
        P["预测全身关节旋转"]
        D["全局-局部解耦"]
        IK["IK 微调手臂(对齐输入)"]
    end
    T --> OUT["🧍 关节化全身姿态<br/>AMASS SOTA · VR/AR 化身 (ECCV 2022)"]

    style T fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **三点稀疏 → 全身姿态**：从 HMD + 双手柄重建关节化全身；
2. **Transformer + 全局-局部解耦**：稳定预测；
3. **IK 微调手臂**：末端精确对齐输入；
4. **AMASS SOTA**：头显化身驱动奠基（ECCV 2022）。

---

## 🤖 对人形机器人学习的启发

- **从稀疏末端推全身**与人形"少传感器估全身状态"相通（状态估计/本仓 09）；
- **全局-局部解耦**对全身姿态/重心一致性有益（呼应 FRAME）；
- **IK 微调对齐末端**是把学习预测与硬约束结合的经典做法；
- 三点驱动化身的范式启发人形遥操作的稀疏输入控制。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2207.13784](https://arxiv.org/abs/2207.13784) | 论文正文（Transformer、解耦、IK、AMASS 实验） |
| [项目页 + 代码](https://siplab.org/projects/AvatarPoser) | 概述、视频、开源代码 |

> ℹ️ 备注：本笔记依据论文公开摘要与项目页整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·稀疏/第一视角姿态**：[EgoPoser（间歇观测鲁棒）](../EgoPoser__Robust_Real-Time_Egocentric_Pose_Estimation_from_Sparse_Sensors/EgoPoser__Robust_Real-Time_Egocentric_Pose_Estimation_from_Sparse_Sensors.html) · [MANIKIN（生物力学神经 IK）](../MANIKIN__Biomechanically_Accurate_Neural_Inverse_Kinematics_for_Human_Motion_Estimation/MANIKIN__Biomechanically_Accurate_Neural_Inverse_Kinematics_for_Human_Motion_Estimation.html) · [FRAME](../FRAME__Floor-aligned_Representation_for_Avatar_Motion_from_Egocentric_Video/FRAME__Floor-aligned_Representation_for_Avatar_Motion_from_Egocentric_Video.html)。
