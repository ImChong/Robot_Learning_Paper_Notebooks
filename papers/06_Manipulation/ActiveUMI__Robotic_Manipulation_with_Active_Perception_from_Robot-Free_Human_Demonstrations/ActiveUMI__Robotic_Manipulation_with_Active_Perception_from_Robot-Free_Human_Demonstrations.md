---
layout: paper
title: "ActiveUMI: Robotic Manipulation with Active Perception from Robot-Free Human Demonstrations"
zhname: "ActiveUMI：从无机器人的人类演示中学带主动感知的机器人操作"
category: "Manipulation"
arxiv: "2510.01607"
---

# ActiveUMI: Robotic Manipulation with Active Perception from Robot-Free Human Demonstrations
**用便携 VR 遥操作套件 + 镜像机器人末端的传感手柄，采集「无需机器人」的野外人类演示；核心是记录操作者戴头显时的主动头部转动，学「视觉注意力 ↔ 操作动作」的关键关联，让策略在执行时能主动调整视线。仅用 ActiveUMI 数据训练，在 6 个双臂任务上分布内平均成功率 70%、换新物体/新环境仍保持 56%。**

> 📅 阅读日期: 2026-07-23
>
> 🏷️ 板块: 06 Manipulation · 双臂操作 · 主动感知 · 无机器人数据采集 · UMI · VR 遥操作
>
> 🔁 推进轨: 模块轮转（05_Locomotion → 06_Manipulation）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 10 月 |
| arXiv | [2510.01607](https://arxiv.org/abs/2510.01607) · [PDF](https://arxiv.org/pdf/2510.01607) · [HTML](https://arxiv.org/html/2510.01607v1) |
| 项目页 | [activeumi.github.io](https://activeumi.github.io/) |
| 作者 | Qiyuan Zeng、Chengmeng Li、Jude St. John、Zhongyi Zhou、Junjie Wen、Guorui Feng、Yichen Zhu、Yi Xu 等（上海大学 / 美的集团 Midea / Stanford） |
| 主题 | cs.RO · 双臂操作 / 主动感知 / 无机器人人类演示 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。ActiveUMI 是 UMI（Universal Manipulation Interface）系列的「主动感知」进化。

---

## 🎯 一句话总结

> **ActiveUMI** 是一套**把野外人类演示迁移到机器人做复杂双臂操作**的数据采集框架：它把**便携 VR 遥操作套件**与**镜像机器人末端执行器的传感手柄**耦合，用**精确位姿对齐**打通人-机器人运动学；为保证移动性与数据质量，引入**沉浸式 3D 模型渲染、自带可穿戴计算机、高效标定**等关键技术。其**最大特点是采集「主动的第一视角感知」**——通过头显记录操作者**有意的头部转动**，让系统学到**视觉注意力与操作动作之间的关键关联**，从而在执行任务时**主动调整视线**。在 **6 个高难度双臂任务**上，仅用 ActiveUMI 数据训练的策略即取得**分布内 70% 平均成功率**，并展现强泛化——面对**新物体、新环境仍保持 56%**。结论：便携采集系统 + 学到的主动感知，是通往**可泛化、高能力真实机器人策略**的有效且可扩展路径。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| UMI | Universal Manipulation Interface，通用操作接口（手持夹爪采数据的路线） |
| Robot-Free | 采集数据时**无需真实机器人** |
| Active Perception | 主动感知（主动调整视线/头部朝向去看关键区域） |
| HMD | Head-Mounted Display，头戴显示器 |
| Egocentric | 第一视角（以操作者头部视角） |
| Bimanual | 双臂/双手 |

---

## ❓ 论文要解决什么问题？

野外采数据学操作有两个老问题：

- **UMI 类手持采集**通常是**被动、固定视角**，丢失了人类操作时**主动转头看关键处**的信息；
- 想**免机器人**采数据又要保证**与机器人运动学对齐**、数据质量与移动性。

ActiveUMI 要：做一套**便携、无机器人**的采集系统，**显式记录主动头部感知**，并让人手动作与机器人末端**精确对齐**，从而训出会「主动看」的双臂策略。

---

## 🔧 方法详解

### 1. 便携 VR 遥操作套件（免机器人）
- **消费级 VR 头显 + 传感手柄**，手柄**镜像机器人末端执行器**；
- **自带可穿戴计算机**，采集全程无需真实机器人，可在任意环境走动采集。

### 2. 人-机器人运动学对齐
- 用**精确位姿对齐 + 高效标定**把人手手柄位姿映射到机器人末端；
- **沉浸式 3D 模型渲染**给操作者实时反馈，提升数据质量。

### 3. 主动第一视角感知（核心）
- 头显**记录操作者有意的头部转动**，作为「视觉注意力」信号；
- 策略学到**注意力 ↔ 操作**的关联，执行时**主动调整视线**去看关键区域。

### 4. 评测
- **6 个高难度双臂任务**（如积木拆解、叠衣服、绳索、工具箱清理、放瓶子等）；
- 仅用 ActiveUMI 数据训练：**分布内 70%**；**新物体/新环境 56%**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑‍💻 操作者<br/>VR 头显 + 传感手柄"] --> KIT
    subgraph KIT["ActiveUMI 便携采集套件（免机器人）"]
        H["头部转动 → 主动感知信号"]
        C["手柄位姿 ↔ 机器人末端<br/>精确对齐 + 高效标定"]
        R["沉浸式 3D 渲染 + 可穿戴计算机"]
    end
    KIT --> DATA["野外人类演示数据<br/>第一视角视觉 + 双臂动作 + 视线"]
    DATA --> POL
    subgraph POL["策略学习"]
        A["视觉注意力 ↔ 操作 关联"]
    end
    POL --> ROB["🤖 双臂机器人部署<br/>执行时主动调整视线"]
    ROB --> RES["6 双臂任务：分布内 70% · 新物体/新环境 56%"]

    style KIT fill:#e8f4fd,stroke:#2980b9,color:#1a3e5c
    style POL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style RES fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **免机器人便携采集 + 运动学对齐**：VR 套件 + 镜像手柄，野外可走动采集且与机器人末端精确对齐；
2. **主动第一视角感知**：显式记录头部转动，学「注意力 ↔ 操作」，让策略执行时主动看关键处；
3. **工程化关键技术**：沉浸式 3D 渲染、可穿戴计算机、高效标定，兼顾移动性与数据质量；
4. **强结果**：仅野外人类数据训练即在 6 双臂任务分布内 70%、跨物体/环境 56%。

---

## 🤖 对人形机器人学习的启发

- **主动感知**是被现有 UMI/第一视角数据路线忽略的关键维度，对需要「转头看」的人形双臂长任务尤为重要；
- **免机器人便携采集**极大降低双臂/全身数据门槛，可与人形本体的头部自由度天然对接；
- **注意力 ↔ 操作**的联合学习思路，可迁移到人形「主动视觉 + 全身操作」的一体化策略；
- 与 EgoVLA/EgoDex/EgoMI 等第一视角人类数据路线互补，把「看哪里」也纳入监督信号。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2510.01607](https://arxiv.org/abs/2510.01607) | 论文正文（采集套件、主动感知、6 任务实验） |
| [项目页 activeumi.github.io](https://activeumi.github.io/) | 硬件、演示视频、任务概览 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与项目页整理；**逐项数值以原文/PDF 为准**。论文提供项目页，暂未见公开代码仓库。

---

## 🔗 相关阅读

- **同模块·第一视角人类数据学操作**：[EgoVLA](../EgoVLA__Learning_Vision-Language-Action_Models_from_Egocentric_Human_Videos/EgoVLA__Learning_Vision-Language-Action_Models_from_Egocentric_Human_Videos.html) · [EgoDex](../EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video/EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video.html) · [EgoMI](../EgoMI__Learning_Active_Vision_and_Whole-Body_Manipulation_from_Egocentric_Human_Demos/EgoMI__Learning_Active_Vision_and_Whole-Body_Manipulation_from_Egocentric_Human_Demos.html)
- **同模块·主动视觉/看的能力**：[Vision in Action](../Vision_in_Action__Learning_Active_Perception_from_Human_Demonstrations/Vision_in_Action__Learning_Active_Perception_from_Human_Demonstrations.html) · [Learning to Look Around](../Learning_to_Look_Around__Enhancing_Teleoperation_and_Learning/Learning_to_Look_Around__Enhancing_Teleoperation_and_Learning.html)
