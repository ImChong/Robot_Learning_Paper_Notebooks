---
layout: paper
title: "Hand-Eye Autonomous Delivery: Learning Humanoid Navigation, Locomotion and Reaching"
zhname: "HEAD：学习人形导航、运动与触达的手眼自主递送"
category: "Navigation"
arxiv: "2508.03068"
---

# Hand-Eye Autonomous Delivery: Learning Humanoid Navigation, Locomotion and Reaching
**直接从人类动作与视觉感知数据学人形的导航/运动/触达：模块化设计——高层规划器下达手与眼的目标位姿，低层全身策略跟踪「双眼+左右手」三点；低层从大规模动捕学三点跟踪，高层从 Aria 眼镜采集的人类第一视角数据学；把第一视角感知与物理动作解耦，提升学习效率与对新场景的可扩展性**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 08 Navigation · 手眼递送 · 导航+运动+触达 · 模块化 · 第一视角 · 动捕跟踪
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 8 月 |
| arXiv | [2508.03068](https://arxiv.org/abs/2508.03068) · [PDF](https://arxiv.org/pdf/2508.03068) · [HTML](https://arxiv.org/html/2508.03068v1) |
| 作者 | Sirui Chen、Yufei Ye、Zi-Ang Cao、Jennifer Lew、Pei Xu、C. Karen Liu（Stanford） |
| 主题 | cs.RO · 人形导航 / 全身触达 / 第一视角学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Navigation 模块。

---

## 🎯 一句话总结

> HEAD（Hand-Eye Autonomous Delivery）是一个**直接从人类动作与视觉感知数据**学**人形导航、运动与触达**的框架。采用**模块化**：**高层规划器**下达人形**手与眼**的**目标位置与朝向**，由**低层策略**控制全身动作来实现。具体地，**低层全身控制器**从**大规模人类动捕**学习跟踪**三个点（双眼、左手、右手）**；**高层策略**从 **Aria 眼镜**采集的**人类第一视角数据**学习。这种模块化把**第一视角视觉感知**与**物理动作**解耦，促进**高效学习**与对**新场景的可扩展性**。在仿真与真实世界评测，展示了人形在为人类设计的复杂环境中**导航与触达**的能力。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| HEAD | Hand-Eye Autonomous Delivery |
| Reaching | 触达，手伸到目标位置 |
| Ego-centric | 第一视角（眼镜/头戴相机） |
| MoCap | 动作捕捉数据 |
| Three-Point Tracking | 三点跟踪：双眼 + 左右手 |
| Modular | 模块化，高/低层解耦 |

---

## ❓ 论文要解决什么问题？

人形要在**为人类设计的环境**里完成**递送**类任务，需要**导航 + 行走 + 触达**三种能力协同：
- 端到端学习高自由度全身 + 感知很难、数据贵；
- 想**复用海量人类数据**（动捕 + 第一视角）来学。

HEAD 要：用模块化把感知与动作解耦，**直接从人类数据**学出可导航、可触达的人形。

---

## 🔧 方法详解

### 1. 模块化：高层手眼目标 + 低层全身跟踪
- **高层规划器**：下达**手与眼**的目标位置/朝向；
- **低层策略**：控制**全身动作**去实现这些目标。

### 2. 低层：从动捕学三点跟踪
低层全身控制器从**大规模人类动捕**学习**跟踪三点**（双眼、左手、右手）——用"眼+双手"作为紧凑的全身目标表示。

### 3. 高层：从 Aria 第一视角学
高层策略从 **Aria 眼镜**采集的**人类第一视角**数据学习，把"看到什么→去哪/伸向哪"学出来。

### 4. 解耦的好处 + 评测
**第一视角感知**与**物理动作解耦**→ 学习更高效、对**新场景可扩展**；仿真 + 真机验证人形在人类环境中的导航与触达。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    EGO["👓 Aria 第一视角数据"] --> HI["高层规划器<br/>手/眼目标位姿"]
    MOCAP["🕺 大规模动捕"] --> LOW["低层全身策略<br/>跟踪双眼+左右手"]
    HI --> LOW
    LOW --> OUT["🤖 导航 + 触达<br/>人类环境 · 仿真+真机"]

    style HI fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style LOW fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **从人类数据学导航+运动+触达**：直接利用动捕与第一视角数据；
2. **模块化手眼框架**：高层下达手/眼目标、低层全身跟踪三点；
3. **感知-动作解耦**：提升学习效率与新场景可扩展性；
4. **仿真 + 真机**：人类环境中导航与触达验证。

---

## 🤖 对人形机器人学习的启发

- **"眼+双手"三点是紧凑而强的全身目标表示**：抓住人类操作的关键端点，降低控制维度；
- **第一视角数据（Aria 眼镜）是高层策略的廉价来源**，呼应 ZeroWBC/EgoHumanoid 的第一视角路线；
- **感知-动作解耦**提升可扩展性，是模块化的经典收益；
- 把"导航 + 触达"统一在一个框架，贴近真实递送任务。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2508.03068](https://arxiv.org/abs/2508.03068) | 论文正文（模块化框架、三点跟踪、Aria 数据、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人形导航**：[NavDP（Sim-to-Real 导航扩散）](../NavDP__Learning_Sim-to-Real_Navigation_Diffusion_Policy/NavDP__Learning_Sim-to-Real_Navigation_Diffusion_Policy.html) · [社交导航（正负示范+规则）](../Learning_Social_Navigation_from_Positive_and_Negative_Demonstrations_and_Rule-Based_Specifications/Learning_Social_Navigation_from_Positive_and_Negative_Demonstrations_and_Rule-Based_Specifications.html)；
- **第一视角学习**：本仓 04 模块 ZeroWBC、EgoHumanoid。
