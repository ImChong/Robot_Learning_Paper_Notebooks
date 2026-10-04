---
layout: paper
title: "High-Speed and Impact Resilient Teleoperation of Humanoid Robots"
zhname: "人形机器人的高速且抗冲击遥操作"
category: "Teleoperation"
arxiv: "2409.04639"
---

# High-Speed and Impact Resilient Teleoperation of Humanoid Robots
**面向高速、抗冲击的人形遥操作的软硬件一体方案：免标定动捕与重定向（仅用 7 个 IMU 生成全身机器人参考）、低延迟的快速全身运动学流式工具箱、以及高带宽摆线执行器三者结合；在人形 Nadia 上验证，展示遥操作的前所未有性能**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 高速 · 抗冲击 · 免标定动捕 · 低延迟流式 · 摆线执行器
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 9 月 |
| arXiv | [2409.04639](https://arxiv.org/abs/2409.04639) · [PDF](https://arxiv.org/pdf/2409.04639) · [HTML](https://arxiv.org/html/2409.04639v1) |
| 作者 | Sylvain Bertrand、Luigi Penco、Dexton Anderson、Duncan Calvert、Jerry Pratt、Robert Griffin 等（IHMC / Boardwalk Robotics） |
| 主题 | cs.RO · 高速遥操作 / 抗冲击 / 硬件 + 控制 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 人形遥操作长期是难题，需要**软硬件协同进步**才能实现无缝直观的控制。本文提出一个**集成方案**，由几大要素构成：① **免标定（calibration-free）的动作捕捉与重定向**——仅用 **7 个 IMU** 即可生成**全身机器人参考**；② **低延迟的快速全身运动学流式工具箱**，降低端到端延迟；③ **高带宽摆线执行器（cycloidal actuators）**，使机器人能**高速且抗冲击**。在人形机器人 **Nadia** 上验证，通过**感知、控制与驱动**的协同进步，展示了遥操作的**前所未有的性能**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Calibration-free | 免标定，无需繁琐标定流程 |
| IMU | 惯性测量单元（本文仅用 7 个） |
| Kinematics Streaming | 运动学流式传输，低延迟下发参考 |
| Cycloidal Actuator | 摆线执行器，高带宽、抗冲击 |
| Impact Resilient | 抗冲击，承受碰撞不损坏 |
| Retargeting | 动作重定向 |

---

## ❓ 论文要解决什么问题？

人形遥操作要做到**高速、抗冲击、低延迟**，需软硬件同步突破：
- **动捕标定**繁琐、传感器多；
- **延迟**高导致控制不跟手；
- **执行器**带宽不足，难高速/抗冲击。

论文要：一套**感知 + 控制 + 驱动**协同的集成方案。

---

## 🔧 方法详解

### 1. 免标定动捕 + 重定向（仅 7 IMU）
**免标定**的动捕与重定向，仅用 **7 个 IMU** 就能生成**全身机器人参考**，大幅简化穿戴/标定。

### 2. 低延迟全身运动学流式工具箱
一个**快速全身运动学流式工具箱**，**降低端到端延迟**，让遥操作更跟手。

### 3. 高带宽摆线执行器（高速 + 抗冲击）
**高带宽摆线执行器**赋予机器人**高速运动**与**抗冲击**能力——这是硬件侧的关键。

### 4. 验证
在人形 **Nadia** 上验证，三者协同实现**前所未有的遥操作性能**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    IMU["📡 7 IMU 免标定动捕"] --> RT["重定向 → 全身参考"]
    RT --> STREAM["低延迟运动学流式工具箱"]
    STREAM --> ACT["高带宽摆线执行器<br/>(高速 + 抗冲击)"]
    ACT --> OUT["🤖 人形 Nadia<br/>高速抗冲击遥操作"]

    style STREAM fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style ACT fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **软硬件一体的高速抗冲击遥操作**：感知 + 控制 + 驱动协同；
2. **免标定动捕（7 IMU）**：简化穿戴/标定即得全身参考；
3. **低延迟运动学流式**：提升跟手性；
4. **高带宽摆线执行器**：使高速与抗冲击成为可能（Nadia 验证）。

---

## 🤖 对人形机器人学习的启发

- **遥操作性能受限于"最慢的一环"**：动捕、延迟、执行器需同步优化；
- **硬件（摆线执行器）是高速/抗冲击的物理前提**，提醒算法之外的本体重要性；
- **免标定 + 少传感器**降低使用门槛，利于现场部署；
- 高速抗冲击能力为采集"动态/接触丰富"演示提供条件。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2409.04639](https://arxiv.org/abs/2409.04639) | 论文正文（免标定动捕、流式工具箱、摆线执行器、Nadia 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·遥操作系统/硬件**：[NuExo（上肢外骨骼）](../NuExo__A_Wearable_Exoskeleton_Covering_all_Upper_Limb_ROM/NuExo__A_Wearable_Exoskeleton_Covering_all_Upper_Limb_ROM.html) · [CHILD（关节级全身）](../CHILD__a_Whole-Body_Humanoid_Teleoperation_System/CHILD__a_Whole-Body_Humanoid_Teleoperation_System.html)。
