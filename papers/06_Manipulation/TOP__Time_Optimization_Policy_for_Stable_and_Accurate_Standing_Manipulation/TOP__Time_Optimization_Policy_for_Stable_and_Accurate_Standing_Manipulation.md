---
layout: paper
title: "TOP: Time Optimization Policy for Stable and Accurate Standing Manipulation with Humanoid Robots"
zhname: "TOP：面向人形稳定精确站立操作的时间优化策略"
category: "Manipulation"
arxiv: "2508.00355"
---

# TOP: Time Optimization Policy for Stable and Accurate Standing Manipulation with Humanoid Robots
**人形多样操作依赖鲁棒精确的站立控制，但已有方法要么难精控高维上身关节、要么在上身快速运动时难兼顾鲁棒与精度；TOP 提出「调整上身动作的时间轨迹」而非一味强化下身抗扰：用 VAE 编码上身动作先验、解耦全身控制（上身 PD + 下身 RL），训练时间优化策略来减轻快速上身运动给平衡带来的负担，同时保证平衡、精度与时间效率**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 站立操作 · 时间优化 · 上下身解耦 · VAE 先验 · 平衡+精度
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 8 月 |
| arXiv | [2508.00355](https://arxiv.org/abs/2508.00355) · [PDF](https://arxiv.org/pdf/2508.00355) · [HTML](https://arxiv.org/html/2508.00355v1) |
| 作者 | Zhenghan Chen、Haocheng Xu、Haodong Zhang、Zhongxiang Zhou、Rong Xiong 等（浙江大学） |
| 主题 | cs.RO · 站立操作 / 时间优化 / 全身控制 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 人形能做多样操作，前提是**鲁棒精确的站立控制器**。已有方法**要么难精控高维上身关节、要么难同时保证鲁棒与精度**——尤其当**上身运动快**时。本文提出一个新颖的**时间优化策略（Time Optimization Policy, TOP）**，训练一个**站立操作控制模型**，**同时**保证**平衡、精度与时间效率**。核心思想是：**调整上身动作的时间轨迹**，而**不只是一味强化下身的抗扰能力**——让快速上身运动在时间上"错峰"，减轻对平衡的冲击。方法用 **VAE** 编码**上身动作先验**，并**解耦全身控制**（**上身 PD 控制器 + 下身 RL 控制器**）。仿真与真机实验表明，TOP 在站立操作上**稳定且精确**，优于已有方法。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| TOP | Time Optimization Policy，时间优化策略 |
| Standing Manipulation | 站立操作 |
| VAE | 变分自编码器（编码上身动作先验） |
| Decoupled WBC | 解耦全身控制（上身 PD + 下身 RL） |
| Time Trajectory | 时间轨迹（动作的时间安排） |
| Disturbance Resistance | 抗扰能力 |

---

## ❓ 论文要解决什么问题？

站立操作要**平衡 + 精度 + 时间效率**三者兼顾：
- 难**精控高维上身关节**；
- **上身快速运动**时，扰动大，难同时稳与准；
- 一味强化下身抗扰**治标不治本**。

TOP 要：通过**调上身动作时间轨迹**，从源头减轻平衡负担，兼顾稳、准、快。

---

## 🔧 方法详解

### 1. 思想：调上身时间轨迹（而非只强化下身）
不只让下身"硬扛"，而**优化上身动作的时间安排**，让快速运动错峰、降低对平衡的冲击——从源头减负。

### 2. VAE 上身动作先验
用 **VAE** 编码**上身动作先验**，给上身动作一个紧凑、可优化的表示。

### 3. 解耦全身控制
- **上身**：**PD 控制器**做精确控制；
- **下身**：**RL 控制器**做鲁棒平衡。

### 4. 时间优化策略训练
训练 **TOP** 来调时间轨迹，**同时**保证**平衡、精度、时间效率**；仿真与真机验证优于已有方法。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    M["上身动作(VAE 先验)"] --> TOP
    subgraph TOP["TOP 时间优化策略"]
        T["调整上身动作时间轨迹<br/>(错峰减轻平衡负担)"]
    end
    TOP --> UP["上身 PD(精确)"]
    TOP --> LOW["下身 RL(鲁棒平衡)"]
    UP --> OUT["🤖 站立操作<br/>平衡+精度+时间效率"]
    LOW --> OUT

    style TOP fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **时间优化策略 TOP**：调上身动作时间轨迹，同时保证稳/准/快；
2. **VAE 上身动作先验**：紧凑可优化表示；
3. **解耦全身控制**：上身 PD 精控 + 下身 RL 鲁棒；
4. **稳定精确站立操作**：仿真 + 真机优于已有方法。

---

## 🤖 对人形机器人学习的启发

- **"调时间"是平衡-精度权衡的新维度**：不止调空间动作，还可调时间安排；
- **上身 PD + 下身 RL 解耦**契合"精确 vs 鲁棒"的不同需求，与 Mobile-TeleVision 思路相通；
- **VAE 动作先验**是常用的紧凑表示手段；
- 站立操作是人形干活的基础，稳准快都重要。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2508.00355](https://arxiv.org/abs/2508.00355) | 论文正文（TOP、VAE 先验、解耦控制、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块/相关·上下身解耦**：[Mobile-TeleVision（CVAE 上身先验 + RL 下身）](../../07_Teleoperation/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)；
- **站立/全身控制**：本仓 04 全身控制相关工作。
