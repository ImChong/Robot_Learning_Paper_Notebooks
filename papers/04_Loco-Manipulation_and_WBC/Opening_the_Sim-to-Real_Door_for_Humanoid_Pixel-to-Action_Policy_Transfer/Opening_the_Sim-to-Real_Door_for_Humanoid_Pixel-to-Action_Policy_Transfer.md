---
layout: paper
title: "Opening the Sim-to-Real Door for Humanoid Pixel-to-Action Policy Transfer"
zhname: "为人形「像素到动作」策略迁移打开 Sim-to-Real 之门"
category: "Loco-Manipulation and WBC"
arxiv: "2512.01061"
---

# Opening the Sim-to-Real Door for Humanoid Pixel-to-Action Policy Transfer
**完全用仿真数据，训练「教师-学生-自举」的视觉人形移动操作框架，以铰接物体（开门）为高难基准：用分阶段重置探索稳定长时程特权策略训练、用 GRPO 微调缓解部分可观与闭环一致性；纯 RGB 感知下零样本迁移到多种门型，任务完成时间比人类遥操作快至多 31.7%，是首个用纯 RGB 做多样铰接移动操作的人形 sim-to-real 策略**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 像素到动作 · Sim-to-Real · 铰接物体 · GRPO · 纯 RGB · 开门
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2512.01061](https://arxiv.org/abs/2512.01061) · [PDF](https://arxiv.org/pdf/2512.01061) · [HTML](https://arxiv.org/html/2512.01061v1) |
| 作者 | Haoru Xue、Tairan He、Zi Wang、Qingwei Ben、Wenli Xiao、Zhengyi Luo、Xingye Da、Fernando Castañeda、Guanya Shi、Shankar Sastry、Linxi "Jim" Fan、Yuke Zhu（CMU / NVIDIA / Berkeley 等） |
| 主题 | cs.RO · 视觉移动操作 / Sim-to-Real / 铰接物体 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> GPU 加速的**逼真仿真**让「海量物理 + 视觉随机化」成为可规模化的数据来源。本文据此构建一个**教师-学生-自举（teacher-student-bootstrap）**的**视觉人形移动操作**框架，以**铰接物体交互（开门）**为代表性高难基准。方法引入两点：① **分阶段重置探索（staged-reset exploration）**，稳定**长时程特权策略**训练；② **基于 GRPO 的微调**，缓解**部分可观**、提升**闭环一致性**。**完全用仿真数据**训练，所得策略在**纯 RGB 感知**下对**多种门型零样本鲁棒**，在同一全身控制栈下**任务完成时间比人类遥操作快至多 31.7%**。这是**首个**仅用**纯 RGB**就能做**多样铰接移动操作**的人形 **sim-to-real** 策略。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Pixel-to-Action | 像素到动作，直接从图像到控制 |
| Teacher-Student-Bootstrap | 教师-学生-自举训练框架 |
| Staged-Reset | 分阶段重置，稳定长时程探索 |
| GRPO | Group Relative Policy Optimization，一种策略优化 |
| Partial Observability | 部分可观，观测不含全部状态 |
| Articulated Object | 铰接物体，如门（带转轴/关节） |

---

## ❓ 论文要解决什么问题？

视觉人形**移动操作铰接物体（开门）**是高难任务：
- **长时程特权策略训练不稳**；
- **部分可观 + 闭环一致性差**，sim-to-real RL 易失效；
- 想**只用 RGB**（不靠深度/特权）做到真机零样本，更难。

论文要：用纯仿真数据，训出**纯 RGB、零样本上真机**、能开多种门的策略。

---

## 🔧 方法详解

### 1. 教师-学生-自举框架
基于逼真仿真的**海量物理 + 视觉随机化**，用**教师-学生-自举**范式：特权教师先学会任务，再蒸馏/自举到**纯 RGB 学生**。

### 2. 分阶段重置探索（稳定长时程）
**staged-reset exploration** 把长时程任务拆段重置，稳定**特权策略**的长时程训练，缓解探索难、回报稀疏。

### 3. GRPO 微调（治部分可观）
用**基于 GRPO 的微调**缓解**部分可观**带来的偏差，提升**闭环一致性**，让 sim-to-real RL 更稳。

### 4. 结果
- **纯仿真训练**、**纯 RGB** 感知；
- 对**多种门型零样本鲁棒**；
- 同一 WBC 栈下**比人类遥操作快至多 31.7%**；
- **首个**纯 RGB 多样铰接移动操作的人形 sim-to-real 策略。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    SIM["🌀 逼真仿真<br/>物理+视觉随机化"] --> TE
    subgraph TE["教师-学生-自举"]
        T["特权教师<br/>(分阶段重置探索)"]
        S["纯 RGB 学生<br/>(GRPO 微调)"]
        T --> S
    end
    TE --> OUT["🚪 多门型零样本<br/>纯 RGB · 比遥操作快 31.7%"]

    style TE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **纯 RGB 人形铰接移动操作 sim-to-real（首个）**：完全仿真训练、零样本上真机；
2. **分阶段重置探索**：稳定长时程特权策略训练；
3. **GRPO 微调**：缓解部分可观、提升闭环一致性；
4. **超越人类遥操作**：任务完成时间快至多 31.7%。

---

## 🤖 对人形机器人学习的启发

- **纯 RGB 比依赖深度/特权更接近真实部署**：把视觉随机化做足，RGB 也能零样本上真机；
- **长时程探索要"分段稳住"**：staged-reset 是稳定特权训练的实用技巧；
- **GRPO 进入机器人 sim-to-real**：把 LLM 时代的策略优化用于闭环一致性，值得关注；
- **铰接物体是 loco-manip 的硬基准**，开门这类任务对全身协调与视觉鲁棒都极具区分度。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.01061](https://arxiv.org/abs/2512.01061) | 论文正文（教师-学生-自举、staged-reset、GRPO、开门实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·视觉 loco-manip / sim-to-real**：[VIRAL（大规模视觉 sim-to-real）](../VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation.html) · [ZeroWBC（从人类视频学视觉运动控制）](../ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video/ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video.html)；
- **本仓 10 Sim-to-Real 板块**：MOSAIC、ZEST 等迁移工作。
