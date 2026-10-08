---
layout: paper
title: "Learning Visuotactile Skills with Two Multifingered Hands"
zhname: "用两只多指手学习视触觉技能"
category: "Manipulation"
arxiv: "2404.16823"
---

# Learning Visuotactile Skills with Two Multifingered Hands
**用两只多指手学习视触觉技能**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 视触觉 · 双手多指 · 低成本遥操作 HATO · 义肢手 · 模仿学习
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 4 月 |
| arXiv | [2404.16823](https://arxiv.org/abs/2404.16823) · [PDF](https://arxiv.org/pdf/2404.16823) · [HTML](https://arxiv.org/html/2404.16823v1) |
| 作者 | Toru Lin、Yu Zhang、Qiyang Li、Haozhi Qi、Brent Yi、Sergey Levine、Jitendra Malik（UC Berkeley） |
| 主题 | cs.RO · 视触觉 / 双手多指 / 模仿学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 为**复刻人类的灵巧、感知体验与动作模式**，本文用一套带**多指手与视触觉数据**的**双手系统**，从**人类演示**学习。为解决采集训练数据的硬件难题，作者开发了**低成本遥操作系统 HATO**（用现成部件搭建，高效采集双手数据），并把**义肢手（prosthetic hands）改装、加装触觉传感器**。在需**多指灵巧**的**长时程、高精度**操作任务上做**模仿学习**，并通过**消融研究**考察**数据规模、感知模态（视觉/触觉）重要性、视觉预处理**的影响。结果证明：**结合视觉与触觉反馈**能让机器人从人类演示学到**复杂双手操作技能**，推进多指灵巧控制的可行性。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Visuotactile | 视触觉（视觉 + 触觉） |
| Multifingered | 多指（灵巧手） |
| HATO | 本文低成本双手遥操作系统 |
| Prosthetic Hand | 义肢手（改装 + 触觉传感器） |
| Imitation Learning | 模仿学习 |
| Ablation | 消融研究 |

---

## ❓ 论文要解决什么问题？

双手多指**视触觉**操作难采数据、难学：
- 多指手 + 触觉传感**硬件贵、难搭**；
- 缺**低成本**采集系统；
- 不清楚**触觉/视觉/数据规模**各自的贡献。

论文要：低成本双手视触觉系统 + 从人类演示学复杂操作，并厘清各模态贡献。

---

## 🔧 方法详解

### 1. HATO 低成本双手遥操作 + 触觉义肢手
**HATO** 用现成部件搭建，高效采集双手数据；把**义肢手改装并加触觉传感器**，解决硬件难题。

### 2. 视触觉模仿学习
在**长时程、高精度**多指任务上做**模仿学习**，多模态（视觉 + 触觉）策略训练。

### 3. 消融研究
系统考察**数据规模、感知模态（视觉/触觉）、视觉预处理**对性能的影响。

### 4. 结论
**视觉 + 触觉结合**让机器人学到复杂双手操作，推进多指灵巧控制可行性。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    HATO["🕹️ HATO 低成本双手遥操作<br/>义肢手 + 触觉传感器"] --> DATA["视触觉双手演示"]
    DATA --> IL["视触觉模仿学习"]
    IL --> ABL["消融：数据规模/模态/视觉预处理"]
    ABL --> OUT["🤖 长时程高精度双手操作<br/>视觉+触觉结合见效"]

    style IL fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **HATO 低成本双手遥操作系统**：现成部件 + 触觉义肢手；
2. **视触觉模仿学习**：长时程高精度多指任务；
3. **系统消融**：数据规模、视觉/触觉模态、视觉预处理；
4. **视觉+触觉协同**：学到复杂双手操作技能。

---

## 🤖 对人形机器人学习的启发

- **触觉对多指灵巧操作的贡献被消融量化**，为"该不该上触觉"提供证据；
- **低成本硬件（义肢手 + 现成件）**降低双手灵巧研究门槛；
- 对人形双手操作直接相关；
- 与"人形视触觉数据集"等触觉工作共同强调触觉模态。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2404.16823](https://arxiv.org/abs/2404.16823) | 论文正文（HATO、视触觉 IL、消融实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·触觉/灵巧**：[Humanoid Visual-Tactile-Action Dataset](../A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation/A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation.html) · [Object-Centric Dexterous Manipulation](../Object-Centric_Dexterous_Manipulation_from_Human_Motion_Data/Object-Centric_Dexterous_Manipulation_from_Human_Motion_Data.html)。
