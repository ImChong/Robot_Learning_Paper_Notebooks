---
layout: paper
title: "EgoMI: Learning Active Vision and Whole-Body Manipulation from Egocentric Human Demonstrations"
zhname: "EgoMI：从第一视角人类演示学习主动视觉与全身操作"
category: "Manipulation"
arxiv: "2511.00153"
---

# EgoMI: Learning Active Vision and Whole-Body Manipulation from Egocentric Human Demonstrations
**EgoMI：从第一视角人类演示学习主动视觉与全身操作**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 主动视觉 · 头手协调 · 记忆增强策略 · 第一视角 · 半人形
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.00153](https://arxiv.org/abs/2511.00153) · [PDF](https://arxiv.org/pdf/2511.00153) · [HTML](https://arxiv.org/html/2511.00153v1) |
| 作者 | Justin Yu、Yide Shentu、Di Wu、Pieter Abbeel、Ken Goldberg、Philipp Wu（UC Berkeley） |
| 主题 | cs.RO · 主动视觉 / 全身操作 / 第一视角学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 机器人从人类视频学操作，要跨越**具身差距**。人在做任务时会**主动协调头与手**，用**动态视角变化**与**视觉搜索**策略。EgoMI 捕捉**同步的末端执行器与头部轨迹**，可**迁移到半人形机器人**；并引入一个**记忆增强策略（memory-augmented policy）**，**选择性纳入历史观测**以应对**视角切换**。在**带可动相机头的双臂机器人**上测试：**显式建模头部运动**的策略**持续优于**基线，说明**协调的手眼学习**能有效**弥合人-机具身差距**（针对半人形）。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Active Vision | 主动视觉，主动调整视角/搜索 |
| Head-Hand Coordination | 头手协调 |
| Memory-Augmented | 记忆增强，选择性用历史观测 |
| Embodiment Gap | 具身差距，人与机器人形态差异 |
| Actuated Camera Head | 可动相机头 |
| Semi-humanoid | 半人形（双臂 + 可动头） |

---

## ❓ 论文要解决什么问题？

从人类视频学操作有**具身差距**，且：
- 人会**主动协调头与手**（动态视角、视觉搜索），机器人若忽略则学不好；
- **视角快速切换**让策略难以利用历史观测。

EgoMI 要：把**头部主动运动**显式建模，并用**记忆**应对视角切换，迁移到半人形。

---

## 🔧 方法详解

### 1. 同步捕捉末端 + 头部轨迹
捕捉**同步的末端执行器与头部轨迹**，把"手在哪 + 头看哪"一起记录，可**重定向到半人形**机器人。

### 2. 记忆增强策略（应对视角切换）
引入**记忆增强策略**，**选择性纳入历史观测**——当视角快速变化时，用历史帧补全信息，稳住决策。

### 3. 显式头部运动建模
在模仿学习中**显式建模头部运动**，而非只学手部动作。

### 4. 评测
- **带可动相机头的双臂机器人**；
- 有/无头部运动建模对比；
- **显式头部建模持续优于基线**，弥合具身差距。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    H["👁️🖐️ 第一视角人类演示<br/>同步末端 + 头部轨迹"] --> RT["重定向到半人形"]
    RT --> POL
    subgraph POL["记忆增强策略"]
        M["选择性纳入历史观测<br/>(应对视角切换)"]
        HD["显式头部运动建模"]
    end
    POL --> OUT["🤖 双臂+可动头机器人<br/>显式头部建模 > 基线"]

    style POL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **同步末端 + 头部轨迹捕捉**：把主动视觉纳入学习；
2. **记忆增强策略**：选择性用历史观测应对视角切换；
3. **显式头部运动建模**：弥合人-机具身差距；
4. **半人形验证**：可动相机头双臂机器人上优于基线。

---

## 🤖 对人形机器人学习的启发

- **主动视觉（头手协调）是人类操作的隐藏要素**，忽略它会限制从人类视频学习的上限；
- **记忆增强**对视角动态变化的任务很关键；
- **半人形（双臂 + 可动头）**是连接人类数据与人形的实用载体；
- 与 Vision in Action、Learning to Look 等主动感知工作呼应。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.00153](https://arxiv.org/abs/2511.00153) | 论文正文（同步轨迹、记忆策略、头部建模实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·主动感知/第一视角**：[Vision in Action（从人类演示学主动感知）](../Vision_in_Action__Learning_Active_Perception_from_Human_Demonstrations/Vision_in_Action__Learning_Active_Perception_from_Human_Demonstrations.html) · [Learning to Look（信息寻求决策）](../Learning_to_Look__Seeking_Information_for_Decision_Making_via_Policy_Factorization/Learning_to_Look__Seeking_Information_for_Decision_Making_via_Policy_Factorization.html)。
