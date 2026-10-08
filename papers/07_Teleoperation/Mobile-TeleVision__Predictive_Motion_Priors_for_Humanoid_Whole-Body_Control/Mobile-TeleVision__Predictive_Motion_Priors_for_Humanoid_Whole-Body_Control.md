---
layout: paper
title: "Mobile-TeleVision: Predictive Motion Priors for Humanoid Whole-Body Control"
zhname: "Mobile-TeleVision：面向人形全身控制的预测式运动先验"
category: "Teleoperation"
arxiv: "2412.07773"
---

# Mobile-TeleVision: Predictive Motion Priors for Humanoid Whole-Body Control
**Mobile-TeleVision：面向人形全身控制的预测式运动先验**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 上下身解耦 · CVAE 运动先验 · IK 重定向 · 精确操作 · ICRA 2025
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 12 月 |
| arXiv | [2412.07773](https://arxiv.org/abs/2412.07773) · [PDF](https://arxiv.org/pdf/2412.07773) · [HTML](https://arxiv.org/html/2412.07773v2) |
| 会议 | ICRA 2025 |
| 作者 | Chenhao Lu、Xuxin Cheng、Jialong Li、Shiqi Yang、Mazeyu Ji、Chengjing Yuan、Ge Yang、Sha Yi、Xiaolong Wang（UCSD / MIT 等） |
| 主题 | cs.RO · 全身控制 / 上下身解耦 / 遥操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 人形需要**鲁棒下身行走**与**精确上身操作**。近期 RL 给出全身 loco-manip 策略，但对**高自由度手臂的精确操作**不足。本文**解耦上身控制与行走**：**上身**用**逆运动学（IK）+ 动作重定向**做**精确操作**，**RL** 专注**鲁棒下身行走**。提出 **PMP（Predictive Motion Priors）**，用**条件变分自编码器（CVAE）**训练以**有效表示上身动作**；**行走策略以该上身动作表征为条件**，确保操作与行走**同时鲁棒**。实验表明 **CVAE 特征**对**稳定性与鲁棒性至关重要**，在**精确操作**上**显著优于纯 RL 全身控制**。借助精确上身 + 鲁棒下身，操作者可远程控制人形**走动探索不同环境**并执行多样操作任务。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| PMP | Predictive Motion Priors，预测式运动先验 |
| CVAE | 条件变分自编码器 |
| IK | Inverse Kinematics，逆运动学 |
| Decoupled Control | 解耦控制（上身/下身分开） |
| Retargeting | 动作重定向 |
| Whole-Body | 全身 loco-manip |

---

## ❓ 论文要解决什么问题？

人形全身控制的两难：
- 纯 **RL 全身**策略**精确操作不足**（高 DoF 手臂难精控）；
- 但操作与行走又要**同时鲁棒**。

论文要：既要**上身精确操作**、又要**下身鲁棒行走**，且二者协调不互相破坏。

---

## 🔧 方法详解

### 1. 上下身解耦
- **上身**：用 **IK + 动作重定向**做**精确操作**（高 DoF 手臂精控）；
- **下身**：用 **RL** 学**鲁棒行走**。

### 2. PMP：CVAE 上身运动先验
用 **CVAE** 训练 **PMP** 来**表示上身动作**，给上身动作一个紧凑、可预测的表征。

### 3. 行走以上身表征为条件
**行走策略条件于 PMP 上身表征**：下身"知道"上身在干什么，从而在操作时仍**保持鲁棒**。CVAE 特征对**稳定性**至关重要。

### 4. 结果
- 精确操作**显著优于纯 RL 全身控制**；
- 操作者可远程控制人形**走动 + 多样操作**（ICRA 2025）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    UP["🖐️ 上身：IK + 重定向<br/>精确操作"] --> PMP
    subgraph PMP["PMP (CVAE 上身运动先验)"]
        Z["上身动作表征"]
    end
    PMP --> LOW["🦿 下身：RL 行走<br/>(以上身表征为条件)"]
    LOW --> OUT["🤖 精确操作 + 鲁棒行走<br/>远程走动探索 (ICRA 2025)"]

    style PMP fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **上下身解耦**：上身 IK+重定向精操作、下身 RL 鲁棒行走；
2. **PMP（CVAE 运动先验）**：紧凑表示上身动作；
3. **行走条件于上身表征**：操作与行走同时鲁棒；
4. **精操作领先**：显著优于纯 RL 全身控制（ICRA 2025）。

---

## 🤖 对人形机器人学习的启发

- **解耦是"精确 vs 鲁棒"两难的有效解**：让 IK 管精度、RL 管稳健；
- **CVAE 运动先验**给行走提供"上身意图"上下文，避免互相破坏；
- **遥操作 + 行走探索**拓展了人形可达任务空间；
- 与 TWIST（统一控制器）形成"解耦 vs 统一"的对照。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2412.07773](https://arxiv.org/abs/2412.07773) | 论文正文（解耦、PMP/CVAE、行走条件、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·全身遥操作**：[TWIST（统一控制器全身模仿）](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html) · [Human-Robot Collaboration（躯干-手臂协调）](../Human-Robot_Collaboration_for_Remote_Control_of_Mobile_Humanoid_Robots/Human-Robot_Collaboration_for_Remote_Control_of_Mobile_Humanoid_Robots.html)。
