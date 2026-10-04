---
layout: paper
title: "Towards Adaptive Humanoid Control via Multi-Behavior Distillation and Reinforced Fine-Tuning"
zhname: "AHC：用多行为蒸馏与强化微调迈向自适应人形控制"
category: "Loco-Manipulation and WBC"
arxiv: "2511.06371"
---

# Towards Adaptive Humanoid Control via Multi-Behavior Distillation and Reinforced Fine-Tuning
**针对「每个技能各训一个专精策略、泛化差且在不规则地形上脆」的问题，提出 AHC 两阶段框架：先把站立/行走/跑/跳等多个主技能策略蒸馏成一个多行为控制器，再用不规则地形上的在线反馈做强化微调，得到能跨技能跨地形自适应切换的统一人形运动控制器**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 自适应控制 · 多行为蒸馏 · 强化微调 · 跨地形 · Unitree G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.06371](https://arxiv.org/abs/2511.06371) · [PDF](https://arxiv.org/pdf/2511.06371) · [HTML](https://arxiv.org/html/2511.06371v1) |
| 作者 | Yingnan Zhao、Xinmiao Wang、Dewei Wang、Xinzhe Liu、Dan Lu、Qilong Han、Peng Liu、Chenjia Bai 等 |
| 主题 | cs.RO · 自适应运动控制 / 多行为蒸馏 / 强化微调 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形有望学到**一整套类人运动**（站起、走、跑、跳）。但现有方法多**为每个技能单独训练独立策略**，得到**行为专属（behavior-specific）控制器**，**泛化有限**，在**不规则地形**与**多样情境**中**表现脆弱**。为此提出 **Adaptive Humanoid Control（AHC）**，采用**两阶段框架**学一个**跨技能、跨地形**的**自适应运动控制器**：第一阶段把多个**主运动策略**做**多行为蒸馏**，得到统一控制器；第二阶段用**不规则地形上的在线反馈**做**强化微调（reinforced fine-tuning）**，并配**自适应行为切换**机制。在仿真与真机 **Unitree G1** 上验证，覆盖站立/行走/跑/跳多技能与多地形，泛化优于行为专属控制器。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| AHC | Adaptive Humanoid Control，自适应人形控制 |
| Multi-Behavior Distillation | 多行为蒸馏，把多技能压进一个策略 |
| Reinforced Fine-Tuning | 强化微调，用 RL 在线反馈精修 |
| Behavior-Specific | 行为专属，每技能一个策略（被改进对象） |
| Adaptive Switching | 自适应切换，按情境切换行为 |
| Irregular Terrain | 不规则地形 |

---

## ❓ 论文要解决什么问题？

主流做法**每技能一策略**：
- **泛化有限**：换情境就退化；
- **不规则地形上脆**：单技能控制器难应对多样地形；
- 缺乏**跨技能、跨地形**的**自适应**统一控制。

AHC 要：一个**统一、自适应**的人形运动控制器，覆盖多技能并稳健应对多地形。

---

## 🔧 方法详解

### 1. 阶段一：多行为蒸馏
把多个**主运动策略**（站立、行走、跑、跳等）**蒸馏**进**一个统一控制器**，让单策略具备多技能能力，避免"一技能一策略"的碎片化。

### 2. 阶段二：强化微调（不规则地形在线反馈）
用**不规则地形上的在线反馈**对统一控制器做**强化微调**，提升在真实多样地形上的鲁棒与泛化；配合**自适应行为切换**，按情境选用合适技能。

### 3. 评测
- **仿真 + 真机 Unitree G1**；
- 多技能（站/走/跑/跳）× 多地形；
- **强适应性**、泛化优于行为专属控制器。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph P1["① 多行为蒸馏"]
        S["站立/行走/跑/跳<br/>主策略 → 统一控制器"]
    end
    P1 --> P2
    subgraph P2["② 强化微调"]
        F["不规则地形在线反馈<br/>+ 自适应行为切换"]
    end
    P2 --> OUT["🤖 Unitree G1<br/>跨技能跨地形自适应"]

    style P1 fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style P2 fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **AHC 两阶段自适应框架**：多行为蒸馏 + 强化微调；
2. **统一多技能控制器**：把站/走/跑/跳蒸馏进一个策略，破"一技能一策略"；
3. **地形在线微调 + 自适应切换**：提升不规则地形鲁棒与泛化；
4. **真机验证**：Unitree G1 多技能多地形，优于行为专属基线。

---

## 🤖 对人形机器人学习的启发

- **"蒸馏成一 + 在线微调"是通用控制的实用配方**：先合并能力、再按真实分布精修；
- **自适应切换**让单策略覆盖能力谱，呼应 Agility Meets Stability、OmniXtreme 的"一策略多能力"；
- **地形在线反馈**强调真实分布上的微调价值，与 TTT-Parkour 的测试时训练思路相通；
- **多技能统一**有利于部署与维护，减少策略碎片化。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.06371](https://arxiv.org/abs/2511.06371) | 论文正文（多行为蒸馏、强化微调、多地形实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·多技能/自适应控制**：[Agility Meets Stability（异构数据多才控制）](../Agility_Meets_Stability__Versatile_Humanoid_Control_with_Heterogeneous_Data/Agility_Meets_Stability__Versatile_Humanoid_Control_with_Heterogeneous_Data.html) · [Towards Adaptable Humanoid Control via Adaptive Motion Tracking（AdaMimic 同主题）]；
- **测试时适应**：[TTT-Parkour](../TTT-Parkour__Rapid_Test-Time_Training_for_Perceptive_Robot_Parkour/TTT-Parkour__Rapid_Test-Time_Training_for_Perceptive_Robot_Parkour.html)。
