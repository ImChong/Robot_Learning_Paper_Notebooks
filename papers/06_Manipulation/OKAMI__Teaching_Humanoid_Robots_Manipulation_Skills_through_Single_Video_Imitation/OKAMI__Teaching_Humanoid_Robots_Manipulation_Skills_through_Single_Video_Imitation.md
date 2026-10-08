---
layout: paper
title: "OKAMI: Teaching Humanoid Robots Manipulation Skills through Single Video Imitation"
zhname: "OKAMI：通过单段视频模仿教人形机器人操作技能"
category: "Manipulation"
arxiv: "2410.11792"
---

# OKAMI: Teaching Humanoid Robots Manipulation Skills through Single Video Imitation
**OKAMI：通过单段视频模仿教人形机器人操作技能**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 单视频模仿 · 物体感知重定向 · 开放世界视觉 · 人形 · 闭环策略
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 10 月 |
| arXiv | [2410.11792](https://arxiv.org/abs/2410.11792) · [PDF](https://arxiv.org/pdf/2410.11792) · [HTML](https://arxiv.org/html/2410.11792v1) |
| 作者 | Jinhan Li、Yifeng Zhu、Yuqi Xie、Zhenyu Jiang、Mingyo Seo、Georgios Pavlakos、Yuke Zhu（UT Austin） |
| 主题 | cs.RO · 单视频模仿 / 人形操作 / 物体感知重定向 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 研究**从单段视频演示**模仿来教**人形机器人操作技能**。OKAMI 从**单段 RGB-D 视频**生成**操作计划**并导出**可执行策略**。其核心是**物体感知重定向（object-aware retargeting）**：让人形**复现视频中的人类动作**，同时在部署时**适应不同物体位置**。OKAMI 用**开放世界视觉模型**识别**任务相关物体**，并**分别重定向身体动作与手部姿态**。实验表明 OKAMI 在**多变视觉与空间条件**下**强泛化**，在**开放世界从观察模仿（imitation from observation）**上**超越 SOTA 基线**。进一步地，用 OKAMI 的 **rollout 轨迹**训练**闭环视觉运动策略**，在**无需费力遥操作**的情况下达**平均 79.2% 成功率**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| OKAMI | 本文方法名 |
| Object-Aware Retargeting | 物体感知重定向 |
| Single Video Imitation | 单段视频模仿 |
| Open-world Vision | 开放世界视觉模型 |
| Imitation from Observation | 从观察模仿（无动作标签） |
| Closed-loop Visuomotor | 闭环视觉运动策略 |

---

## ❓ 论文要解决什么问题？

教人形操作通常需大量演示/遥操作。能否**从单段视频**就学会？
- 单视频缺动作标签，且**物体位置会变**；
- 人-机具身差异需重定向。

OKAMI 要：从**单段 RGB-D 视频**生成计划 + 策略，并能**适应不同物体位置**。

---

## 🔧 方法详解

### 1. 单 RGB-D 视频 → 操作计划
从**一段 RGB-D 视频**生成**操作计划**，再导出可执行策略。

### 2. 物体感知重定向（核心）
- 用**开放世界视觉模型**识别**任务相关物体**；
- **分别重定向身体动作与手部姿态**；
- 部署时**适应不同物体位置**——让"复现人类动作"对空间变化鲁棒。

### 3. rollout 训练闭环策略
用 OKAMI 的 **rollout 轨迹**训练**闭环视觉运动策略**，**无需遥操作**。

### 4. 结果
- 多变视觉/空间条件**强泛化**，超开放世界 imitation-from-observation SOTA；
- 闭环策略**平均 79.2%** 成功率。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    V["🎥 单段 RGB-D 视频"] --> PLAN
    subgraph PLAN["OKAMI 物体感知重定向"]
        O["开放世界视觉识别物体"]
        R["分别重定向身体 + 手部姿态"]
        O --> R
    end
    PLAN --> ROLL["rollout 轨迹"]
    ROLL --> POL["训练闭环视觉运动策略(无需遥操作)"]
    POL --> OUT["🤖 强泛化 · 平均 79.2% 成功率"]

    style PLAN fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **单视频模仿教人形操作**：从一段 RGB-D 视频生成计划 + 策略；
2. **物体感知重定向**：开放世界识别物体、分别重定向身体/手部、适应物体位置；
3. **超 SOTA 泛化**：开放世界 imitation-from-observation；
4. **闭环策略 79.2%**：用 rollout 训练、无需遥操作。

---

## 🤖 对人形机器人学习的启发

- **"单视频 + 物体感知重定向"极大降低教学成本**：看一遍就会、还能适应物体位置；
- **身体/手部分别重定向**是处理具身差异的实用拆分；
- **用 rollout 自举训练闭环策略**免遥操作，是数据飞轮的一环；
- 与 MimicDroid、Masquerade 等"从人类视频学操作"路线互补（同 UT/Yuke Zhu 系）。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2410.11792](https://arxiv.org/abs/2410.11792) | 论文正文（物体感知重定向、单视频模仿、闭环策略实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（79.2%）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·从视频/人类数据学操作**：[MimicDroid](../MimicDroid__In-Context_Learning_for_Humanoid_Manipulation_from_Human_Play_Videos/MimicDroid__In-Context_Learning_for_Humanoid_Manipulation_from_Human_Play_Videos.html) · [Masquerade](../Masquerade__Learning_from_In-the-wild_Human_Videos_using_Data-Editing/Masquerade__Learning_from_In-the-wild_Human_Videos_using_Data-Editing.html)。
