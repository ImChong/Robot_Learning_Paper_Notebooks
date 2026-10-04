---
layout: paper
title: "Human-Robot Collaboration for the Remote Control of Mobile Humanoid Robots with Torso-Arm Coordination"
zhname: "面向移动人形远程控制的人机协作躯干-手臂协调"
category: "Teleoperation"
arxiv: "2505.05773"
---

# Human-Robot Collaboration for the Remote Control of Mobile Humanoid Robots with Torso-Arm Coordination
**面向医院/养老等场景里被远程操控的移动人形，针对其运动学冗余带来的躯干-手臂协调难题，提出在「自主」与「人控」之间取平衡的人机协作方法：既有人发起（手动控躯干）、也有机器人发起（依可达性、任务目标与推断的人类意图自主协调）的躯干-手臂宏-微结构协调；17 人用户研究在任务表现、可操作度与能效上比较，给出操作者更偏好的策略**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 人机协作 · 躯干-手臂协调 · 运动学冗余 · 用户研究 · ICRA 2025
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月 |
| arXiv | [2505.05773](https://arxiv.org/abs/2505.05773) · [PDF](https://arxiv.org/pdf/2505.05773) · [HTML](https://arxiv.org/html/2505.05773v1) |
| 会议 | ICRA 2025 |
| 作者 | Nikita Boguslavskii、Lorena Maria Genua、Zhi Li（WPI） |
| 主题 | cs.RO · 人机协作 / 躯干-手臂协调 / 远程控制 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 越来越多人形被部署到**医院、养老**等场所，常由人**远程操控**。本文针对**运动学冗余**的**移动人形**的**躯干-手臂协调**难题，提出在**自主与人控之间取平衡**的人机协作方法：① **人发起（human-initiated）**——操作者**手动控制躯干**运动；② **机器人发起（robot-initiated）**——机器人依据**可达性、任务目标与推断的人类意图**做**自主协调**。围绕**躯干-手臂宏-微（macro-micro）结构**设计协调机制。通过 **N=17** 的用户研究，在**任务表现、可操作度（manipulability）与能效**等多指标上比较，分析参与者偏好，给出"如何平衡自主与人输入以提升效率与任务执行"的结论。已被 **ICRA 2025** 接收。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Torso-Arm Coordination | 躯干-手臂协调 |
| Kinematic Redundancy | 运动学冗余，自由度多于任务所需 |
| Human/Robot-Initiated | 人发起 / 机器人发起的协调 |
| Macro-Micro | 宏-微结构（躯干大范围 + 手臂精细） |
| Manipulability | 可操作度，末端灵活性度量 |
| User Study | 用户研究（N=17） |

---

## ❓ 论文要解决什么问题？

远程操控**移动人形**（医院/养老场景）时：
- 机器人**运动学冗余**（躯干 + 手臂），**协调难**；
- 全自主不够灵活、全手动负担重；
- 不清楚**哪种自主/人控平衡**操作者更偏好、更高效。

论文要：设计并比较**躯干-手臂协调**的人机协作策略，找到好的"自主 ↔ 人控"平衡。

---

## 🔧 方法详解

### 1. 两类协调策略
- **人发起**：操作者**手动控制躯干**，主导大范围运动；
- **机器人发起**：机器人依据**可达性 + 任务目标 + 推断的人类意图**做**自主躯干协调**。

### 2. 躯干-手臂宏-微结构
把**躯干**当**宏（macro）**大范围调位、**手臂**当**微（micro）**精细操作，二者协调利用冗余。

### 3. 用户研究（N=17）
跨**任务表现、可操作度、能效**多指标比较两类策略，分析**参与者偏好**，给出自主/人控平衡的建议。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑 远程操作者"] --> COORD
    subgraph COORD["躯干-手臂协调(宏-微)"]
        HI["人发起：手动控躯干"]
        RI["机器人发起：依可达性/任务/意图自主协调"]
    end
    COORD --> STUDY["N=17 用户研究<br/>任务表现/可操作度/能效"]
    STUDY --> OUT["📊 操作者偏好 + 自主↔人控平衡建议<br/>(ICRA 2025)"]

    style COORD fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **躯干-手臂协调的人机协作方法**：人发起 + 机器人发起两类策略；
2. **宏-微结构利用运动学冗余**：躯干大范围、手臂精细；
3. **机器人发起协调**：依可达性、任务目标与推断意图自主协调；
4. **N=17 用户研究**：多指标比较、给出自主/人控平衡建议（ICRA 2025）。

---

## 🤖 对人形机器人学习的启发

- **"自主 ↔ 人控"平衡**是辅助/医护场景遥操作的核心设计问题；
- **意图推断驱动的机器人发起协调**减轻操作者负担，是共享自主的方向；
- **以人为本的用户研究**对遥操作系统评价不可或缺（不止任务成功率）；
- 躯干-手臂冗余协调对所有移动人形操作都有借鉴。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.05773](https://arxiv.org/abs/2505.05773) | 论文正文（协调策略、用户研究、ICRA 2025） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·遥操作/共享自主**：[CHILD（关节级全身遥操作）](../CHILD__a_Whole-Body_Humanoid_Teleoperation_System/CHILD__a_Whole-Body_Humanoid_Teleoperation_System.html) · [Mobile-TeleVision](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)。
