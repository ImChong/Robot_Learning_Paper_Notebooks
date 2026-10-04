---
layout: paper
title: "Whole-Body Bilateral Teleoperation with Multi-Stage Object Parameter Estimation for Wheeled Humanoid Locomanipulation"
zhname: "面向轮式人形移动操作的多阶段物体参数估计全身双边遥操作"
category: "Teleoperation"
arxiv: "2508.09846"
---

# Whole-Body Bilateral Teleoperation with Multi-Stage Object Parameter Estimation for Wheeled Humanoid Locomanipulation
**面向轮式人形移动操作的「物体感知」全身双边遥操作：把遥操作与在线参数估计结合——先用视觉估物体尺寸、再用大型视觉语言模型给初始参数猜测、最后用解耦的分层采样（先质量/质心、再惯量）多假设鲁棒估计；据此实时更新机器人的平衡点，从而在搬运约 1/3 自重负载时保持柔顺并改善操作跟踪**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 双边遥操作 · 物体参数估计 · VLM 先验 · 轮式人形 · 平衡点补偿
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 8 月 |
| arXiv | [2508.09846](https://arxiv.org/abs/2508.09846) · [PDF](https://arxiv.org/pdf/2508.09846) · [HTML](https://arxiv.org/html/2508.09846v1) |
| 作者 | Donghoon Baek、Amartya Purushottam、Jason J. Choi、Joao Ramos（UIUC） |
| 主题 | cs.RO · 双边遥操作 / 物体参数估计 / 轮式人形 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 本文提出一个面向**轮式人形移动操作**的**物体感知全身双边遥操作（object-aware whole-body bilateral teleoperation）**框架，把**遥操作**与**在线参数估计**结合。它**顺序整合**：① **基于视觉的物体尺寸估计**；② 由**大型视觉语言模型（VLM）**生成的**初始参数猜测**；③ 一个**解耦的分层采样策略**（先估**质量/质心**、再推**惯量**）。估出的参数用于**实时更新机器人的平衡点（equilibrium point）**。在搬运约**机器人体重 1/3** 的负载（抬、送、放）时，框架实现更**动态**的全身遥操作，同时保持**柔顺**，并通过**物体动力学补偿**改善**操作跟踪**；在自制轮式人形 + 夹爪上实时验证。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Bilateral Teleop | 双边遥操作，力/位双向反馈 |
| Object-Aware | 物体感知，估计被操作物体参数 |
| VLM | Vision-Language Model，视觉语言模型 |
| Equilibrium Point | 平衡点，控制中维持平衡的参考 |
| CoM / Inertia | 质心 / 惯量，物体动力学参数 |
| Wheeled Humanoid | 轮式人形 |

---

## ❓ 论文要解决什么问题？

轮式人形搬运未知重物时：
- 物体的**质量/质心/惯量未知**，会扰动全身平衡；
- 遥操作若不补偿物体动力学，操作**跟踪差、易失稳**。

论文要：**在线估计物体参数**并补偿，让双边遥操作在搬重物时**动态、柔顺、跟踪准**。

---

## 🔧 方法详解

### 1. 多阶段物体参数估计
顺序整合三步：
- **视觉物体尺寸估计**：先看物体多大；
- **VLM 初始参数猜测**：用视觉语言模型给质量等初值先验；
- **解耦分层采样**：先估**质量/质心**、再推**惯量**，用**多假设**方案提升鲁棒。

### 2. 实时更新平衡点
把估出的物体参数用于**实时更新机器人平衡点**，补偿负载对全身平衡的影响。

### 3. 双边遥操作 + 并行仿真/硬件
全身**双边**遥操作（力反馈），并**并行**在仿真与硬件上执行验证。

### 4. 结果
- 负载约**机器人体重 1/3**；
- 抬/送/放操作中更**动态**、保持**柔顺**、**跟踪改善**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    V["📷 视觉物体尺寸"] --> EST
    VLM["🧠 VLM 初始参数猜测"] --> EST
    subgraph EST["多阶段参数估计"]
        S["分层采样：质量/质心 → 惯量<br/>(多假设鲁棒)"]
    end
    EST --> EQ["实时更新平衡点"]
    PILOT["🧑‍✈️ 操作者(双边力反馈)"] --> EQ
    EQ --> OUT["🤖 轮式人形搬 1/3 自重<br/>动态 + 柔顺 + 跟踪改善"]

    style EST fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **物体感知双边遥操作**：把在线物体参数估计纳入全身遥操作；
2. **多阶段估计**：视觉尺寸 → VLM 先验 → 分层采样（质量/质心→惯量）多假设；
3. **平衡点实时补偿**：用估出的参数补偿负载对全身平衡的影响；
4. **重载验证**：约 1/3 自重负载下更动态、柔顺、跟踪更好。

---

## 🤖 对人形机器人学习的启发

- **遥操作 + 在线辨识**是搬未知重物的务实组合：估出物性才能稳；
- **VLM 给物理参数先验**是新颖用法，把语义视觉接到动力学估计；
- **分层估计（先质量/质心再惯量）**降低辨识难度；
- 与 SplitAdapter、Heavy-Lifting 等负载/重物工作呼应，强调"物体动力学"建模。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2508.09846](https://arxiv.org/abs/2508.09846) | 论文正文（多阶段估计、平衡点补偿、轮式人形实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·重载/轮式遥操作**：[Heavy Lifting Tasks via Haptic Teleoperation of a Wheeled Humanoid](../Heavy_Lifting_Tasks_via_Haptic_Teleoperation_of_a_Wheeled_Humanoid/Heavy_Lifting_Tasks_via_Haptic_Teleoperation_of_a_Wheeled_Humanoid.html)；
- **负载/物体动力学**：[SplitAdapter（负载自适应）](../../04_Loco-Manipulation_and_WBC/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation.html)。
