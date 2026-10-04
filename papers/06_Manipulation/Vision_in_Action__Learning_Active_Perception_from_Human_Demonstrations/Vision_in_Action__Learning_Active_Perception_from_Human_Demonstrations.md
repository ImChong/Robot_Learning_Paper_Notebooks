---
layout: paper
title: "Vision in Action: Learning Active Perception from Human Demonstrations"
zhname: "Vision in Action：从人类演示学习主动感知"
category: "Manipulation"
arxiv: "2506.15666"
---

# Vision in Action: Learning Active Perception from Human Demonstrations
**面向双臂操作的主动感知系统 ViA：直接从人类演示学搜索/跟踪/聚焦等任务相关的主动感知策略；硬件上用一个简单有效的 6 自由度机器人颈实现灵活拟人头部运动，并设计基于 VR 的遥操作接口在人机间建立共享观测空间，用中间 3D 场景表征实时渲染视角、异步更新以缓解机器人物理运动延迟引发的 VR 眩晕；在三个含视觉遮挡的多阶段双臂任务上显著优于基线**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 主动感知 · 6-DoF 机器人颈 · VR 遥操作 · 共享观测 · 遮挡
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 6 月 |
| arXiv | [2506.15666](https://arxiv.org/abs/2506.15666) · [PDF](https://arxiv.org/pdf/2506.15666) · [HTML](https://arxiv.org/html/2506.15666v1) |
| 作者 | Haoyu Xiong、Xiaomeng Xu、Jimmy Wu、Yifan Hou、Jeannette Bohg、Shuran Song（Stanford） |
| 主题 | cs.RO · 主动感知 / 双臂操作 / VR 遥操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> Vision in Action（ViA）是面向**双臂机器人操作**的**主动感知系统**，直接**从人类演示**学**任务相关的主动感知策略**（如**搜索、跟踪、聚焦**）。硬件上，ViA 用一个**简单有效的 6 自由度机器人颈**实现**灵活、拟人**的头部运动。为捕捉人类主动感知策略，设计了**基于 VR 的遥操作接口**，在**机器人与操作者之间建立共享观测空间**。为缓解机器人**物理运动延迟**导致的**VR 眩晕**，接口用**中间 3D 场景表征**，在操作者端**实时渲染视角**、并**异步**用机器人最新观测更新场景。这些设计共同支撑了在**三个含视觉遮挡**的复杂**多阶段双臂操作**任务上学到鲁棒视觉运动策略，**显著优于基线**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| ViA | Vision in Action，主动感知系统 |
| Active Perception | 主动感知（搜索/跟踪/聚焦） |
| 6-DoF Neck | 6 自由度机器人颈 |
| Shared Observation Space | 人机共享观测空间 |
| 3D Scene Representation | 中间 3D 场景表征（缓解延迟/眩晕） |
| Asynchronous Update | 异步更新 |

---

## ❓ 论文要解决什么问题？

双臂操作中**视觉遮挡**常见，需**主动调整视角**：
- 固定相机看不全，需**主动搜索/跟踪/聚焦**；
- 想**从人类演示学**主动感知，但遥操作有**延迟**致**VR 眩晕**；
- 缺**拟人头部硬件**与**共享观测**接口。

ViA 要：硬件（6-DoF 颈）+ 接口（VR 共享观测 + 3D 表征缓延迟）+ 从人类演示学主动感知。

---

## 🔧 方法详解

### 1. 6 自由度机器人颈（拟人头动）
**简单有效的 6-DoF 颈**实现灵活、拟人的头部运动，支撑主动视角调整。

### 2. VR 遥操作 + 共享观测空间
**VR 接口**在人机间建立**共享观测空间**，让操作者"用机器人的眼睛"看，从而把人类**主动感知策略**采集下来。

### 3. 3D 场景表征缓解延迟/眩晕
用**中间 3D 场景表征**：操作者端**实时渲染**视角，**异步**用机器人最新观测更新——缓解物理运动延迟导致的 **VR 眩晕**。

### 4. 结果
- 三个含**视觉遮挡**的多阶段双臂任务；
- 学到鲁棒视觉运动策略，**显著优于基线**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑 操作者(VR)"] --> SHARE
    subgraph SHARE["VR 共享观测空间"]
        S3D["中间 3D 场景表征<br/>实时渲染 + 异步更新(缓眩晕)"]
    end
    SHARE --> DEMO["人类主动感知演示<br/>(搜索/跟踪/聚焦)"]
    NECK["🦒 6-DoF 机器人颈"] --> POL
    DEMO --> POL["学主动感知策略"]
    POL --> OUT["🤖 三个含遮挡双臂任务<br/>显著优于基线"]

    style SHARE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **主动感知系统 ViA**：从人类演示学搜索/跟踪/聚焦；
2. **6-DoF 机器人颈**：灵活拟人头部运动；
3. **VR 共享观测 + 3D 表征**：采集主动感知并缓解延迟/眩晕；
4. **遮挡任务显著领先**：三个多阶段双臂任务优于基线。

---

## 🤖 对人形机器人学习的启发

- **主动感知（会动的头）对遮挡任务是刚需**，固定相机看不全；
- **共享观测空间 + 3D 表征**是高质量遥操作采集的关键工程；
- **缓解 VR 眩晕**直接影响数据质量与采集时长；
- 与 EgoMI（头手协调）共同强调"主动视觉"对操作的价值。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2506.15666](https://arxiv.org/abs/2506.15666) | 论文正文（6-DoF 颈、VR 接口、3D 表征、遮挡实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·主动感知**：[EgoMI（主动视觉头手协调）](../EgoMI__Learning_Active_Vision_and_Whole-Body_Manipulation_from_Egocentric_Human_Demos/EgoMI__Learning_Active_Vision_and_Whole-Body_Manipulation_from_Egocentric_Human_Demos.html) · [Learning to Look Around](../Learning_to_Look_Around__Enhancing_Teleoperation_and_Learning/Learning_to_Look_Around__Enhancing_Teleoperation_and_Learning.html)。
