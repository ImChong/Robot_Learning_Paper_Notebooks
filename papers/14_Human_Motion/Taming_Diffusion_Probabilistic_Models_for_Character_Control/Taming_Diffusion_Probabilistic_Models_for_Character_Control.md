---
layout: paper
title: "Taming Diffusion Probabilistic Models for Character Control"
zhname: "驯服扩散概率模型以实现角色控制"
category: "Human Motion"
arxiv: "2404.15121"
---

# Taming Diffusion Probabilistic Models for Character Control
**驯服扩散概率模型以实现角色控制**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 角色控制 · 自回归扩散 CAMDM · 实时 · 无分类器引导 · SIGGRAPH 2024
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 4 月 |
| arXiv | [2404.15121](https://arxiv.org/abs/2404.15121) · [PDF](https://arxiv.org/pdf/2404.15121) · [HTML](https://arxiv.org/html/2404.15121v1) |
| 会议 | SIGGRAPH 2024 |
| 作者 | Rui Chen、Mingyi Shi、Shaoli Huang、Ping Tan、Taku Komura、Xuelin Chen |
| 主题 | cs.GR · 角色控制 / 动作扩散 / 实时交互 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 本文提出一个新颖的**角色控制框架**，有效利用**动作扩散概率模型**生成**高质量、多样**的角色动画，并**实时响应**各种**动态用户控制信号**。系统核心是一个基于 **Transformer** 的**条件自回归动作扩散模型（Conditional Autoregressive Motion Diffusion Model, CAMDM）**，依据**历史动作**与**粗粒度用户控制**生成**可能的未来动作**。为实现高质量实时控制，框架用三招：**条件单独 token 化**、对**历史动作的无分类器引导（classifier-free guidance）**、以及**启发式未来轨迹外延**（提升计算效率）。这是**首个**支持**基于用户交互控制实时生成高质量多样角色动画**的模型，**单一统一模型**支持**多种动画风格**与多样**行走技能**。SIGGRAPH 2024。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| CAMDM | 条件自回归动作扩散模型 |
| Autoregressive | 自回归，依历史生成未来 |
| Classifier-free Guidance | 无分类器引导 |
| Condition Tokenization | 条件单独 token 化 |
| Real-time Control | 实时交互控制 |
| Locomotion Skills | 行走技能 |

---

## ❓ 论文要解决什么问题？

扩散模型质量高但**难实时交互控制**：
- 采样慢、难响应**动态用户控制**；
- 要**单一模型多风格**、保**多样性**。

论文要：**驯服**扩散模型，实现**实时、可控、多样**的角色动画生成。

---

## 🔧 方法详解

### 1. CAMDM：条件自回归动作扩散
基于 **Transformer**，依**历史动作 + 粗用户控制**自回归生成**未来动作**，把扩散用于实时角色控制。

### 2. 三招保质量与实时
- **条件单独 token 化**：分别处理控制输入；
- **对历史动作的无分类器引导**：用好历史信息、增强可控；
- **启发式未来轨迹外延**：提升计算效率、达实时。

### 3. 结果
首个实时交互控制的高质量多样角色动画；**单一模型多风格 + 多样行走技能**（SIGGRAPH 2024）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    HIST["历史动作"] --> CAMDM
    CTRL["🎮 粗粒度用户控制"] --> CAMDM
    subgraph CAMDM["CAMDM(条件自回归扩散)"]
        T["条件 token 化 + 无分类器引导 + 轨迹外延"]
    end
    CAMDM --> OUT["🕹️ 实时高质量多样角色动画<br/>单一模型多风格 (SIGGRAPH 2024)"]

    style CAMDM fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **CAMDM**：Transformer 条件自回归动作扩散；
2. **实时可控**：条件 token 化 + 无分类器引导 + 轨迹外延；
3. **首个实时交互角色动画扩散**：质量与多样兼得；
4. **单一模型多风格 + 多样行走**（SIGGRAPH 2024）。

---

## 🤖 对人形机器人学习的启发

- **自回归扩散 + 历史条件**让生成式模型可实时响应控制，与人形在线控制需求一致；
- **无分类器引导用在"历史动作"上**是个巧思，可借鉴到动作跟踪；
- **启发式轨迹外延**降算力，是把扩散压进实时的实用技巧；
- 角色控制的实时扩散经验可迁移到人形 loco 控制（与 Heracles/SafeFlow 的生成式控制呼应）。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2404.15121](https://arxiv.org/abs/2404.15121) | 论文正文（CAMDM、三招、实时控制实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·实时/可控动作生成**：[PRIMAL（实时响应化身运动）](../PRIMAL__Physically_Reactive_and_Interactive_Motor_Model_for_Avatar_Learning/PRIMAL__Physically_Reactive_and_Interactive_Motor_Model_for_Avatar_Learning.html) · [Flexible Motion In-betweening](../Flexible_Motion_In-betweening_with_Diffusion_Models/Flexible_Motion_In-betweening_with_Diffusion_Models.html)。
