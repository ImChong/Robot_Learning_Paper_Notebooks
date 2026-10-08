---
layout: paper
title: "ACE: A Cross-Platform Visual-Exoskeletons System for Low-Cost Dexterous Teleoperation"
zhname: "ACE：面向低成本灵巧遥操作的跨平台视觉-外骨骼系统"
category: "Teleoperation"
arxiv: "2408.11805"
---

# ACE: A Cross-Platform Visual-Exoskeletons System for Low-Cost Dexterous Teleoperation
**ACE：面向低成本灵巧遥操作的跨平台视觉-外骨骼系统**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 视觉-外骨骼 · 跨平台 · 低成本 · 灵巧操作 · 模仿学习
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 8 月 |
| arXiv | [2408.11805](https://arxiv.org/abs/2408.11805) · [PDF](https://arxiv.org/pdf/2408.11805) · [HTML](https://arxiv.org/html/2408.11805v1) |
| 作者 | Shiqi Yang、Minghuan Liu、Yuzhe Qin、Runyu Ding、Jialong Li、Xuxin Cheng、Ruihan Yang、Sha Yi、Xiaolong Wang（UCSD 等） |
| 主题 | cs.RO · 跨平台遥操作 / 视觉-外骨骼 / 灵巧操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 从演示学习对机器人操作很有效，跨平台高效遥操作系统因此愈发关键。但当前**缺少**面向不同末端（拟人手、夹爪）且能**跨平台**的**低成本、易用**遥操作系统。ACE 是一套**跨平台的视觉-外骨骼系统**，做**低成本灵巧遥操作**：用一个**面向手的相机**捕捉 **3D 手部姿态**，配一个**便携底座上的外骨骼**，**实时精确捕捉手指与手腕姿态**。相比以往常需**按机器人定制硬件**的系统，ACE 的**单一系统**即可泛化到**拟人手、臂-手、臂-夹爪、四足-夹爪**等多种构型，实现**高精度**遥操作，从而支撑多平台上**复杂操作任务的模仿学习**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Visual-Exoskeleton | 视觉 + 外骨骼混合捕捉 |
| Cross-Platform | 跨平台，泛化到多种末端 |
| Hand-facing Camera | 面向手的相机，捕 3D 手姿 |
| Finger/Wrist Pose | 手指 / 手腕姿态 |
| End-Effector | 末端执行器（手/夹爪） |
| Imitation Learning | 模仿学习 |

---

## ❓ 论文要解决什么问题？

跨平台遥操作缺**通用、低成本**方案：
- 不同末端（拟人手 vs 夹爪）通常**各自定制硬件**；
- 缺**单一系统跨多平台**的高精度遥操作。

ACE 要：一套**低成本、跨平台**、能同时捕**手指 + 手腕**的灵巧遥操作系统。

---

## 🔧 方法详解

### 1. 视觉 + 外骨骼混合捕捉
- **面向手的相机**：捕捉 **3D 手部姿态**（手指）；
- **便携底座上的外骨骼**：实时精确捕捉**手腕（及手指）姿态**。

视觉 + 外骨骼互补，得到准确的手指 + 手腕实时姿态。

### 2. 跨平台泛化（单一系统）
不必按机器人定制硬件，**同一系统**泛化到**拟人手、臂-手、臂-夹爪、四足-夹爪**等多种构型。

### 3. 支撑模仿学习
高精度遥操作产出高质量演示，支撑**多平台复杂操作任务**的**模仿学习**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    CAM["📷 面向手相机<br/>3D 手部姿态"] --> CAP
    EXO["🦾 便携外骨骼<br/>手指+手腕姿态"] --> CAP
    subgraph CAP["ACE 混合捕捉"]
        F["实时精确手指+手腕"]
    end
    CAP --> OUT["🤖 跨平台单一系统<br/>拟人手/臂-手/臂-夹爪/四足-夹爪<br/>→ 模仿学习"]

    style CAP fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **跨平台视觉-外骨骼系统**：单一系统泛化到多种末端构型；
2. **视觉 + 外骨骼混合捕捉**：相机捕手指、外骨骼捕手腕，实时高精度；
3. **低成本、便携**：免按机器人定制硬件；
4. **支撑模仿学习**：高质量演示用于复杂操作任务。

---

## 🤖 对人形机器人学习的启发

- **跨平台单一系统**大幅降低多机型数据采集成本；
- **视觉 + 外骨骼互补**是兼顾精度与成本的好折中；
- **手指 + 手腕同时捕**对灵巧操作至关重要；
- 与 Bunny-VisionPro、NuExo 等灵巧/外骨骼遥操作共同推进低成本数据采集。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2408.11805](https://arxiv.org/abs/2408.11805) | 论文正文（视觉-外骨骼、跨平台泛化、模仿学习） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·灵巧/外骨骼遥操作**：[Bunny-VisionPro（双手灵巧 VR 遥操作）](../Bunny-VisionPro__Real-Time_Bimanual_Dexterous_Teleoperation_for_Imitation_Learning/Bunny-VisionPro__Real-Time_Bimanual_Dexterous_Teleoperation_for_Imitation_Learning.html) · [NuExo（上肢外骨骼）](../NuExo__A_Wearable_Exoskeleton_Covering_all_Upper_Limb_ROM/NuExo__A_Wearable_Exoskeleton_Covering_all_Upper_Limb_ROM.html)。
