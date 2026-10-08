---
layout: paper
title: "Discovering Self-Protective Falling Policy for Humanoid Robot via Deep Reinforcement Learning"
zhname: "用深度强化学习发现人形机器人的自保护跌落策略"
category: "Loco-Manipulation and WBC"
arxiv: "2512.01336"
---

# Discovering Self-Protective Falling Policy for Humanoid Robot via Deep Reinforcement Learning
**用深度强化学习发现人形机器人的自保护跌落策略**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 跌落保护 · 深度 RL · 课程学习 · 损伤最小化 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月 |
| arXiv | [2512.01336](https://arxiv.org/abs/2512.01336) · [PDF](https://arxiv.org/pdf/2512.01336) · [HTML](https://arxiv.org/html/2512.01336v1) |
| 作者 | Diyuan Shi、Shangke Lyu、Donglin Wang（西湖大学） |
| 主题 | cs.RO · 跌落保护 / 深度 RL / 损伤最小化 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 受**形态、动力学与控制策略限制**，人形比四足/轮式更**容易摔**；而其**体重大、质心高、自由度高**，**不受控跌倒**会对自身与周围造成**严重硬件损伤**。已有研究多用**基于控制**的方法，难以覆盖**多样跌倒场景**，且可能引入**不合适的人类先验**。本文转而用**大规模深度强化学习 + 课程学习**，激励人形**自行探索**贴合自身**形态与属性**的护身跌倒策略。通过**精心设计的奖励**与**域多样化课程**，成功训练智能体探索跌落保护行为，并**发现**：通过形成**「三角（triangle）」结构**，刚性机体的跌落损伤可被**显著降低**。论文用全面指标与实验量化其表现、可视化跌倒行为，并成功**迁移到真实平台**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Self-Protective Falling | 自保护跌倒，受控地摔以减小损伤 |
| Deep RL | 深度强化学习 |
| Curriculum Learning | 课程学习，由易到难逐步训练 |
| Domain Diversification | 域多样化，多样化训练场景/参数 |
| CoM | Center of Mass，质心（人形质心高、易摔重） |
| Triangle Structure | 「三角」支撑结构，降低冲击的姿态 |

---

## ❓ 论文要解决什么问题？

人形**易摔且摔得重**（体重大、质心高、自由度高），不受控跌倒会损坏硬件与环境。已有**控制法**：
- **难覆盖多样跌倒**（方向/初速/地形各异）；
- **易引入不当人类先验**（人为规定姿态未必适配机器人）。

论文要：让机器人**自己学**出**适配自身**的护身跌倒策略，最小化损伤并能上真机。

---

## 🔧 方法详解

### 1. 用 RL 探索而非人为规定
不预设人类护身姿态，而用**深度 RL** 让智能体在仿真中**自由探索**降低损伤的跌倒方式，避免不合适的人类先验。

### 2. 奖励设计 + 域多样化课程
- **精心设计的奖励**：以**损伤/冲击最小化**为核心目标；
- **域多样化课程**：在多样跌倒场景（方向、初态等）下由易到难训练，提升泛化与鲁棒。

### 3. 涌现的「三角」结构
训练中**涌现**出一个有意思的策略：通过形成**「三角」支撑结构**，让**刚性机体**在落地时显著**降低损伤**——这是 RL 自行发现、贴合机器人物性的解。

### 4. 评测
- 全面指标量化、对比其它方法；
- 可视化跌倒行为；
- **成功迁移真机**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    SIM["🌀 仿真 + 域多样化课程"] --> RL
    subgraph RL["🧠 深度 RL 探索"]
        R["损伤最小化奖励"]
        T["涌现『三角』结构"]
        R --> T
    end
    RL --> OUT["🤖 自保护跌倒策略<br/>显著降损 · 迁移真机"]

    style RL fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **RL 自探索护身跌倒**：避开控制法的覆盖局限与不当人类先验；
2. **奖励 + 域多样化课程**：以损伤最小化为目标、覆盖多样跌倒；
3. **涌现「三角」结构**：贴合刚性机体物性、显著降损的策略发现；
4. **真机迁移**：全面量化并部署到真实平台。

---

## 🤖 对人形机器人学习的启发

- **跌倒安全是人形落地的硬约束**：会摔不可避免，"摔得聪明"能省下大量硬件损耗；
- **让 RL 发现策略 > 人为规定姿态**：机器人物性与人不同，数据驱动的护身姿态更合适；
- **与 SafeFall、Robot Crash Course、VIGOR、Unified Fall-Safety Policy 同主题**，共同构成人形「跌落安全」研究簇；
- **域多样化课程**是覆盖长尾跌倒场景的实用手段。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.01336](https://arxiv.org/abs/2512.01336) | 论文正文（奖励/课程设计、三角结构、真机迁移） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·跌落安全**：[VIGOR（统一跌落安全）](../VIGOR_Visual_Goal-In-Context_Inference_for_Unified_Humanoid_Fall_Safety/VIGOR_Visual_Goal-In-Context_Inference_for_Unified_Humanoid_Fall_Safety.html)；后续将补 SafeFall、Robot Crash Course、Unified Fall-Safety Policy 等同簇工作。
