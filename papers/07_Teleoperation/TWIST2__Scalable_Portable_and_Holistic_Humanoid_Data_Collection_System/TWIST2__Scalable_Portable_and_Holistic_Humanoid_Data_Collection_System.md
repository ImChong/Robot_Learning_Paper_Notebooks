---
layout: paper
title: "TWIST2: Scalable, Portable, and Holistic Humanoid Data Collection System"
zhname: "TWIST2：可扩展、便携、整体式的人形数据采集系统"
category: "Teleoperation"
arxiv: "2511.02832"
---

# TWIST2: Scalable, Portable, and Holistic Humanoid Data Collection System
**针对人形缺少高效数据采集框架（现有要么解耦控制、要么依赖昂贵动捕）的问题，提出便携、免动捕的整体式遥操作与数据采集系统：用 PICO4U VR 实时获取全身人体动作、配约 250 美元的 2 自由度机器人颈部提供第一视角视觉，实现整体「人到人形」控制，并配分层视觉运动策略；15 分钟采 100 条演示、近 100% 成功率，全开源**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 数据采集 · 免动捕 · VR 遥操作 · 第一视角 · 分层视觉运动 · 开源
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.02832](https://arxiv.org/abs/2511.02832) · [PDF](https://arxiv.org/pdf/2511.02832) · [HTML](https://arxiv.org/html/2511.02832v1) |
| 作者 | Yanjie Ze、Siheng Zhao、Weizhuo Wang、Angjoo Kanazawa、Rocky Duan、Pieter Abbeel、Guanya Shi、Jiajun Wu、C. Karen Liu（Stanford / Berkeley / CMU 等） |
| 代码 | 全开源（系统 + 数据集） |
| 主题 | cs.RO · 人形遥操作 / 数据采集 / 第一视角 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 大规模数据驱动了机器人突破，但**人形缺少同样有效的数据采集框架**：现有人形遥操作要么用**解耦控制**、要么依赖**昂贵动捕**。TWIST2 提出一个**便携、免动捕（mocap-free）**的人形**遥操作与数据采集系统**，在推进**可扩展性**的同时**保留完整全身控制**。系统用 **PICO4U VR** 实时获取**全身人体动作**，配一个**自制 2 自由度机器人颈部（约 250 美元）**提供**第一视角视觉**，实现整体的**人到人形**控制；并配一个**分层视觉运动策略**框架做自主全身控制。实测：**15 分钟采集 100 条演示**、**近 100% 成功率**；视觉运动策略能用第一视角控制整机；系统**完全可复现、开源**并附数据集。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Mocap-free | 免动捕，不依赖昂贵动作捕捉设备 |
| Holistic | 整体式，保留完整全身控制 |
| Egocentric Vision | 第一视角视觉（机器人头部相机） |
| PICO4U VR | 用于捕捉全身人体动作的 VR 设备 |
| 2-DoF Neck | 2 自由度机器人颈部（约 $250） |
| Visuomotor Policy | 视觉运动策略，从视觉到动作 |

---

## ❓ 论文要解决什么问题？

人形要做大规模学习，缺**高效数据采集**：
- **解耦控制**：上下身/手分开，丢失整体协调；
- **昂贵动捕**：成本高、不便携、难规模化。

TWIST2 要：一套**便携、低成本、免动捕**且**保留全身控制**的人形遥操作 + 数据采集系统。

---

## 🔧 方法详解

### 1. 免动捕全身动作捕捉（PICO4U VR）
用 **PICO4U VR** 实时获取操作者**全身人体动作**，免去昂贵动捕房，便携可移动。

### 2. 低成本第一视角颈部
自制 **2 自由度机器人颈部（约 $250）**提供**第一视角视觉**，让操作者与策略都能"用机器人的眼睛"看，支撑视觉运动学习。

### 3. 整体人到人形控制 + 分层视觉运动策略
把人体动作整体映射到人形（保全身控制），并训练**分层视觉运动策略**做**自主全身控制**。

### 4. 结果
- **15 分钟采 100 条演示**、**近 100% 成功率**；
- 任务覆盖长时程灵巧操作、移动技能、全身灵巧操作、动态踢腿；
- **完全开源、可复现**，附数据集。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    VR["🥽 PICO4U VR<br/>全身人体动作"] --> MAP
    NECK["🦒 2-DoF 颈部($250)<br/>第一视角视觉"] --> MAP
    subgraph MAP["整体人到人形控制"]
        H["保留完整全身控制"]
    end
    MAP --> DATA["📦 15 min / 100 演示<br/>~100% 成功"]
    DATA --> POL["分层视觉运动策略<br/>自主全身控制"]
    POL --> OUT["🤖 长时程灵巧 / 移动 / 动态踢腿<br/>全开源"]

    style MAP fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **便携免动捕的整体式采集系统**：保留全身控制，推进可扩展性；
2. **低成本第一视角颈部**：约 $250 的 2-DoF 颈，提供 egocentric 视觉；
3. **高效采集**：15 分钟 100 条演示、近 100% 成功率；
4. **开源可复现**：系统 + 数据集 + 分层视觉运动策略全开源。

---

## 🤖 对人形机器人学习的启发

- **降低数据采集门槛是人形规模化的关键**：免动捕 + 低成本硬件让"人人可采"；
- **第一视角是视觉运动策略的天然接口**，呼应 ZeroWBC、EgoHumanoid、HEAD；
- **整体（holistic）控制 > 解耦**：保全身协调对长时程灵巧任务很重要；
- 作者群（含 Yanjie Ze，本仓上游维护者）开源生态友好，利于社区复现。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.02832](https://arxiv.org/abs/2511.02832) | 论文正文（系统、分层策略、数据集、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·遥操作系统**：[TWIST（遥操作全身模仿系统）](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html) · [CHILD（关节级全身遥操作）](../CHILD__a_Whole-Body_Humanoid_Teleoperation_System/CHILD__a_Whole-Body_Humanoid_Teleoperation_System.html) · [Mobile-TeleVision](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)。
