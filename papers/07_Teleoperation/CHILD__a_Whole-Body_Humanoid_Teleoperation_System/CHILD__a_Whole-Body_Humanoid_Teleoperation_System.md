---
layout: paper
title: "CHILD: a Whole-Body Humanoid Teleoperation System"
zhname: "CHILD：全身人形遥操作系统"
category: "Teleoperation"
arxiv: "2508.00162"
---

# CHILD: a Whole-Body Humanoid Teleoperation System
**CHILD：全身人形遥操作系统**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 关节级全身 · 可穿戴可重构 · 力反馈 · 开源硬件
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 8 月 |
| arXiv | [2508.00162](https://arxiv.org/abs/2508.00162) · [PDF](https://arxiv.org/pdf/2508.00162) · [HTML](https://arxiv.org/html/2508.00162v1) |
| 作者 | Noboru Myers、Obin Kwon、Sankalp Yamsani、Joohyung Kim（UIUC） |
| 代码 | 开源硬件设计 |
| 主题 | cs.RO · 全身遥操作 / 关节级控制 / 可穿戴外骨骼 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 遥操作已能让机器人做复杂操作，但**很少支持人形的「全身关节级」遥操作**，限制了任务多样性。CHILD（Controller for Humanoid Imitation and Live Demonstration）是一套**紧凑、可重构**的遥操作系统，实现对人形的**关节级控制**。它能塞进**标准婴儿背带（baby carrier）**，让操作者**同时控制四肢**，并支持**直接关节映射**的**全身控制与移动操作**。系统内置**自适应力反馈**，提升操作体验并**防止不安全关节运动**。作者在一台人形与多款双臂系统上验证了移动操作与全身控制，并**开源硬件设计**以促进可及性与可复现性。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| CHILD | Controller for Humanoid Imitation and Live Demonstration |
| Joint-level | 关节级，直接控制各关节 |
| Reconfigurable | 可重构，适配不同机器人 |
| Direct Joint Mapping | 直接关节映射，人关节→机器人关节 |
| Adaptive Force Feedback | 自适应力反馈，防不安全运动 |
| Loco-manipulation | 移动操作 |

---

## ❓ 论文要解决什么问题？

现有遥操作**很少支持人形全身关节级控制**：
- 多为末端/上身控制，丢失全身关节自由度；
- 缺乏**可穿戴、可重构**且**安全**的关节级接口。

CHILD 要：一套**便携可穿戴、关节级、带安全力反馈**的全身人形遥操作装置。

---

## 🔧 方法详解

### 1. 紧凑可重构、可穿戴（婴儿背带形态）
装置可塞进**标准婴儿背带**，操作者穿戴即可**同时控制四肢**，便携且可重构以适配不同机器人。

### 2. 直接关节映射（全身 + 移动操作）
支持**直接关节映射**，把操作者关节运动映到机器人关节，实现**全身控制**与**移动操作**。

### 3. 自适应力反馈（安全）
内置**自适应力反馈**：提升操作沉浸感，并**阻止不安全的关节运动**（如越限/碰撞）。

### 4. 验证 + 开源
在**人形**与**多款双臂系统**上做移动操作与全身控制演示；**开源硬件设计**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑 操作者(穿戴背带式装置)"] --> MAP
    subgraph MAP["CHILD 关节级映射"]
        J["四肢直接关节映射"]
        FB["自适应力反馈(防不安全运动)"]
    end
    MAP --> OUT["🤖 人形 / 多双臂系统<br/>全身控制 + 移动操作 · 开源硬件"]

    style MAP fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **关节级全身人形遥操作**：填补"很少支持全身关节级"的空白；
2. **可穿戴可重构形态**：婴儿背带式，便携、同时控四肢、适配多机型；
3. **自适应力反馈**：提升体验并防止不安全关节运动；
4. **开源硬件**：促进可及性与可复现。

---

## 🤖 对人形机器人学习的启发

- **关节级全身接口拓展任务多样性**：比末端控制能表达更丰富的全身行为；
- **可穿戴 + 低门槛硬件**利于规模化数据采集，呼应 TWIST2、ACE 的低成本理念；
- **力反馈做安全护栏**是遥操作的实用安全设计；
- 开源硬件降低社区复现门槛。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2508.00162](https://arxiv.org/abs/2508.00162) | 论文正文（装置设计、关节映射、力反馈、验证） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·全身/可穿戴遥操作**：[TWIST2（便携免动捕采集）](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html) · [NuExo（上肢外骨骼）](../NuExo__A_Wearable_Exoskeleton_Covering_all_Upper_Limb_ROM/NuExo__A_Wearable_Exoskeleton_Covering_all_Upper_Limb_ROM.html) · [ACE（跨平台视觉-外骨骼）](../ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation/ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation.html)。
