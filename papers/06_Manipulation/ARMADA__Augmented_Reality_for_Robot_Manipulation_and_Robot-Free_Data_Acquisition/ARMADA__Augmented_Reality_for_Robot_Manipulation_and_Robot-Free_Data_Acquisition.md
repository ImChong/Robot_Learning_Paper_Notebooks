---
layout: paper
title: "ARMADA: Augmented Reality for Robot Manipulation and Robot-Free Data Acquisition"
zhname: "ARMADA：用增强现实做机器人操作与无机器人数据采集"
category: "Manipulation"
arxiv: "2412.10631"
---

# ARMADA: Augmented Reality for Robot Manipulation and Robot-Free Data Acquisition
**遥操作采集机器人模仿数据受硬件可得性瓶颈——能否在没有实体机器人的情况下采到高质量机器人数据？ARMADA 把 Apple Vision Pro 与实时虚拟机器人反馈结合，让用户理解自己的动作如何转成机器人动作，从而采集「与实体机器人硬件限制兼容」的自然徒手人类数据；15 人、3 任务、3 种反馈条件的用户研究表明实时机器人反馈显著提升采集数据质量**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 增强现实 · 无机器人采集 · 虚拟反馈 · 徒手数据 · Vision Pro
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 12 月 |
| arXiv | [2412.10631](https://arxiv.org/abs/2412.10631) · [PDF](https://arxiv.org/pdf/2412.10631) · [HTML](https://arxiv.org/html/2412.10631v1) |
| 作者 | Nataliya Nechyporenko、Ryan Hoque、Christopher Webb、Mouli Sivapurapu、Jian Zhang（Apple） |
| 主题 | cs.RO · 增强现实 / 数据采集 / 模仿学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 遥操作采集机器人模仿数据受**硬件可得性**瓶颈——问题是：**能否在没有实体机器人的情况下采到高质量机器人数据？** ARMADA 把 **Apple Vision Pro** 与**实时虚拟机器人反馈**结合：让用户**理解自己的动作如何转成机器人动作**，从而采集**与实体机器人硬件限制兼容**的**自然徒手（barehanded）人类数据**。**15 人、3 个任务、3 种反馈条件**的用户研究 + 在实体机器人上**直接轨迹回放**表明：**实时机器人反馈显著提升采集数据质量**，提示这是一条**无需机器人硬件**也能**可扩展采集人类数据**的路径。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| ARMADA | 本文系统名 |
| AR | Augmented Reality 增强现实 |
| Robot-Free | 无机器人（采集时不需实体机器人） |
| Virtual Robot Feedback | 实时虚拟机器人反馈 |
| Barehanded | 徒手（无设备）人类动作 |
| Trajectory Replay | 轨迹回放到实体机器人 |

---

## ❓ 论文要解决什么问题？

遥操作采集受**机器人硬件**限制：
- 没有实体机器人就难采"机器人兼容"的数据；
- 徒手人类数据**未必符合机器人硬件限制**（够不到/超限）。

ARMADA 要：用 **AR + 虚拟机器人反馈**，让用户徒手采到**硬件兼容**的高质量数据。

---

## 🔧 方法详解

### 1. Vision Pro + 实时虚拟机器人反馈
用 **Apple Vision Pro**，在用户视野里实时显示**虚拟机器人**如何执行其动作——用户**即时理解**动作如何映射到机器人。

### 2. 采集硬件兼容的徒手数据
因为有反馈，用户会**自然地把动作约束在机器人硬件限制内**（工作空间、可达性），从而采到**兼容**的数据。

### 3. 用户研究 + 轨迹回放验证
- **15 人、3 任务、3 反馈条件**用户研究；
- 在实体机器人上**直接轨迹回放**；
- **实时反馈显著提升数据质量**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    U["🧑 徒手人类动作"] --> AR
    subgraph AR["Vision Pro + 实时虚拟机器人反馈"]
        F["看到动作→机器人动作映射<br/>(约束在硬件限制内)"]
    end
    AR --> DATA["硬件兼容的人类数据"]
    DATA --> OUT["🤖 实体机器人轨迹回放<br/>实时反馈显著提升质量(15人研究)"]

    style AR fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **无机器人数据采集**：AR + 虚拟机器人反馈，免实体机器人；
2. **硬件兼容的徒手数据**：实时反馈把动作约束在机器人限制内；
3. **用户研究验证**：15 人、3 任务、3 反馈条件；
4. **实时反馈显著提升质量**：可扩展采集路径。

---

## 🤖 对人形机器人学习的启发

- **"实时反馈"是徒手采集兼容数据的关键**：否则人会做出机器人做不到的动作；
- **无机器人采集**极大降低数据门槛，利于规模化；
- 对人形（硬件贵、可达性受限）尤其有价值；
- 与 EgoDex（Vision Pro 采集）同属 Apple 系数据工作。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2412.10631](https://arxiv.org/abs/2412.10631) | 论文正文（AR 反馈、用户研究、轨迹回放） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·数据采集**：[DexHub and DART（云仿真 + AR 众包采集）](../DexHub_and_DART__Towards_Internet_Scale_Robot_Data_Collection/DexHub_and_DART__Towards_Internet_Scale_Robot_Data_Collection.html) · [EgoDex（Vision Pro 数据集）](../EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video/EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video.html)。
