---
layout: paper
title: "Bunny-VisionPro: Real-Time Bimanual Dexterous Teleoperation for Imitation Learning"
zhname: "Bunny-VisionPro：面向模仿学习的实时双手灵巧遥操作"
category: "Teleoperation"
arxiv: "2407.03162"
---

# Bunny-VisionPro: Real-Time Bimanual Dexterous Teleoperation for Imitation Learning
**Bunny-VisionPro：面向模仿学习的实时双手灵巧遥操作**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 双手灵巧 · VR 头显 · 力触觉反馈 · 安全规避 · 模仿学习
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 7 月 |
| arXiv | [2407.03162](https://arxiv.org/abs/2407.03162) · [PDF](https://arxiv.org/pdf/2407.03162) · [HTML](https://arxiv.org/html/2407.03162v1) |
| 作者 | Runyu Ding、Yuzhe Qin、Jiyue Zhu、Chengzhe Jia、Shiqi Yang、Ruihan Yang、Xiaojuan Qi、Xiaolong Wang（HKU / UCSD） |
| 主题 | cs.RO · 双手灵巧遥操作 / 力触觉 / 模仿学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 遥操作是采集人类演示的关键工具，但用**双手灵巧手**控制机器人很难——以往系统难以协调两只手做精细操作。Bunny-VisionPro 是一个**实时双手灵巧遥操作系统**，基于 **VR 头显**。不同于以往**纯视觉**方案，作者设计了**低成本设备**给操作者**力触觉反馈**，增强**沉浸感**。系统通过内置**碰撞规避**与**奇异点规避**优先保证**安全**，同时以创新设计保持**实时**。在**标准任务集**上，Bunny-VisionPro **成功率更高、用时更短**；其**高质量演示**提升下游**模仿学习**的表现与泛化；尤其首次支持具有**挑战性的多阶段、长时程双手灵巧操作**任务的模仿学习。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Bimanual | 双手 |
| Dexterous | 灵巧（多指手操作） |
| Haptic Feedback | 力触觉反馈 |
| Singularity Avoidance | 奇异点规避 |
| Collision Avoidance | 碰撞规避 |
| Imitation Learning | 模仿学习 |

---

## ❓ 论文要解决什么问题？

双手灵巧遥操作难点：
- **协调两只灵巧手**做精细操作难；
- 纯视觉方案**缺力反馈**、沉浸差；
- 要兼顾**安全**（防碰撞/奇异）与**实时**。

论文要：一个**实时、带力反馈、安全**的双手灵巧遥操作系统，并产出高质量演示供模仿学习。

---

## 🔧 方法详解

### 1. VR 头显 + 低成本力触觉反馈
基于 **VR 头显**做实时双手控制；设计**低成本设备**提供**力触觉反馈**，比纯视觉更沉浸。

### 2. 安全：碰撞 + 奇异点规避
内置**碰撞规避**与**奇异点规避**，在保证**实时**的同时优先**安全**。

### 3. 高质量演示 → 模仿学习
高质量双手演示提升下游**模仿学习**的成功率与**泛化**；首次支持**多阶段、长时程双手灵巧**任务的模仿学习。

### 4. 结果
- 标准任务集上**成功率更高、用时更短**；
- 下游 IL 泛化更好。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    VR["🥽 VR 头显 + 低成本力触觉设备"] --> SYS
    subgraph SYS["Bunny-VisionPro 实时双手遥操作"]
        S["碰撞 + 奇异点规避(安全)"]
    end
    SYS --> DEMO["高质量双手演示"]
    DEMO --> OUT["🤖 标准任务集成功率↑用时↓<br/>多阶段长时程双手 IL"]

    style SYS fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **实时双手灵巧遥操作（VR）**：协调两只灵巧手做精细操作；
2. **低成本力触觉反馈**：比纯视觉更沉浸；
3. **安全 + 实时**：碰撞与奇异点规避；
4. **促进模仿学习**：高质量演示提升泛化，首次支持多阶段长时程双手 IL。

---

## 🤖 对人形机器人学习的启发

- **力触觉反馈显著提升灵巧遥操作质量**：操作者"感受到"接触才能做精细任务；
- **安全规避内建**让遥操作既快又稳，利于规模化采集；
- **长时程多阶段双手演示**是稀缺且珍贵的数据，对复杂操作策略至关重要；
- 与 ACE、TeleOpBench 等共同构成灵巧遥操作的数据/系统生态。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2407.03162](https://arxiv.org/abs/2407.03162) | 论文正文（VR 系统、力反馈、安全规避、IL 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·灵巧遥操作/基准**：[ACE（跨平台视觉-外骨骼）](../ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation/ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation.html) · [TeleOpBench（双臂遥操作基准）](../TeleOpBench__A_Simulator-Centric_Benchmark_for_Dual-Arm_Dexterous_Teleoperation/TeleOpBench__A_Simulator-Centric_Benchmark_for_Dual-Arm_Dexterous_Teleoperation.html)。
