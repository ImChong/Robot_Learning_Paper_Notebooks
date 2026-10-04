---
layout: paper
title: "PRIMAL: Physically Reactive and Interactive Motor Model for Avatar Learning"
zhname: "PRIMAL：可物理反应与交互的化身运动模型"
category: "Human Motion"
arxiv: "2503.17544"
---

# PRIMAL: Physically Reactive and Interactive Motor Model for Avatar Learning
**把交互式化身的「运动系统」建成一个生成式动作模型，实现持续、逼真、可控、可响应的 3D 运动：采用基础模型式两阶段训练——先在无监督的亚秒级动作片段上预训练，再用类 ControlNet 微调做个性化动作与空间目标到达；从单帧出发即可生成无界限逼真动作，同时实时响应外部冲量，并接入 Unreal Engine 做角色动画**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 化身运动 · 生成式动作 · 两阶段训练 · ControlNet 微调 · 实时响应
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 3 月 |
| arXiv | [2503.17544](https://arxiv.org/abs/2503.17544) · [PDF](https://arxiv.org/pdf/2503.17544) · [HTML](https://arxiv.org/html/2503.17544v1) |
| 作者 | Yan Zhang、Yao Feng、Alpár Cseke、Nitin Saini、Nathan Bajandas、Michael J. Black（Meshcapade / MPI） |
| 主题 | cs.CV · 化身运动 / 生成式动作 / 实时交互 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 把**交互式化身**的**运动系统（motor system）**建成一个**生成式动作模型**，实现**持续（perpetual）、逼真、可控、可响应**的 3D 运动。沿**基础模型范式**，PRIMAL 用**两阶段训练**：先在**无监督的亚秒级动作片段**上**预训练**，再用**类 ControlNet 微调**做**个性化动作**与**空间目标到达**。从**单帧**出发即可生成**无界限的逼真动作**，同时**实时响应外部冲量（impulses）**。并集成 **Unreal Engine** 做角色动画。实验中**优于 SOTA 基线**，支持**少样本个性化动作生成**与**目标到达**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| PRIMAL | 本文化身运动模型 |
| Motor Model | 运动系统的生成式模型 |
| Perpetual | 持续/无界限地生成 |
| ControlNet-like | 类 ControlNet 的条件微调 |
| Impulse | 外部冲量（实时响应） |
| Few-shot | 少样本个性化 |

---

## ❓ 论文要解决什么问题？

交互式化身需要**持续、逼真、可控、可响应**的运动：
- 单纯回放/生成难**实时响应物理冲量**；
- 难**个性化**且**到达空间目标**。

PRIMAL 要：一个**生成式运动模型**，从单帧持续生成、实时响应冲量、可个性化与目标到达。

---

## 🔧 方法详解

### 1. 两阶段训练（基础模型范式）
- **预训练**：在**无监督亚秒级动作片段**上学通用运动先验；
- **微调**：**类 ControlNet** 条件微调，做**个性化动作**与**空间目标到达**。

### 2. 持续生成 + 实时响应冲量
从**单帧**起持续生成**无界限逼真动作**，并**实时响应外部冲量**（被推时自然反应）。

### 3. 引擎集成 + 结果
集成 **Unreal Engine** 做角色动画；优于 SOTA，支持少样本个性化与目标到达。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    PRE["①无监督亚秒动作片段预训练"] --> FT["②类 ControlNet 微调<br/>(个性化 + 目标到达)"]
    SEED["单帧起点"] --> GEN
    IMP["⚡ 外部冲量"] --> GEN
    FT --> GEN["持续生成(实时响应)"]
    GEN --> OUT["🕺 无界限逼真动作<br/>Unreal Engine · 优于 SOTA"]

    style GEN fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **生成式运动系统 PRIMAL**：持续、逼真、可控、可响应；
2. **两阶段训练**：无监督预训练 + 类 ControlNet 微调；
3. **实时响应冲量 + 单帧续写**：自然交互；
4. **少样本个性化 + 目标到达 + 引擎集成**。

---

## 🤖 对人形机器人学习的启发

- **"持续生成 + 实时响应冲量"与人形抗扰恢复目标一致**，呼应 Heracles 等"扰动下自然恢复"；
- **基础模型式两阶段（预训练 + ControlNet 微调）**是动作生成的通用范式；
- **从单帧续写**对在线控制友好；
- 角色动画的生成式运动经验可迁移到人形（本仓 13 物理动画方向）。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.17544](https://arxiv.org/abs/2503.17544) | 论文正文（两阶段训练、ControlNet 微调、实时响应） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **相关·生成 + 实时响应（本仓 04）**：[Heracles（状态条件扩散中间件）](../../04_Loco-Manipulation_and_WBC/Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control/Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control.html)；
- **同模块·动作合成**：[Guided Motion Diffusion](../Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis/Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis.html)。
