---
layout: paper
title: "Dexterous Safe Control for Humanoids in Cluttered Environments via Projected Safe Set Algorithm"
zhname: "用投影安全集算法实现杂乱环境中人形的灵巧安全控制"
category: "Manipulation"
arxiv: "2502.02858"
---

# Dexterous Safe Control for Humanoids in Cluttered Environments via Projected Safe Set Algorithm
**在不牺牲性能的前提下确保人形安全：聚焦「灵巧安全」——用肢体级几何约束在杂乱环境中同时避外部碰撞与自碰撞；提出投影安全集算法 p-SSA 处理由此产生的大量约束，并以有原则的方式松弛冲突约束、最小化安全违例以保证可行控制；仿真与 Unitree G1 真机验证，能在挑战性场景中稳健运行、最小违例，且跨任务免调参泛化**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 安全控制 · 肢体级几何约束 · 自碰撞避免 · 杂乱环境 · Unitree G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 2 月 |
| arXiv | [2502.02858](https://arxiv.org/abs/2502.02858) · [PDF](https://arxiv.org/pdf/2502.02858) · [HTML](https://arxiv.org/html/2502.02858v1) |
| 作者 | Rui Chen、Yifan Sun、Changliu Liu（CMU） |
| 主题 | cs.RO · 安全控制 / 碰撞避免 / 人形 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 在真实应用中**确保人形安全**且**不牺牲性能**至关重要。本文考虑**灵巧安全（dexterous safety）**问题，特点是**肢体级（limb-level）几何约束**，用于在**杂乱环境**中同时避免**外部碰撞与自碰撞**。为处理"确保碰撞避免"时产生的**大量约束**，提出**投影安全集算法（Projected Safe Set Algorithm, p-SSA）**；针对约束**不可行（infeasibility）**问题，以**有原则的方式松弛冲突约束**，**最小化安全违例**以**保证可行的机器人控制**。在仿真与 **Unitree G1** 真机上验证：p-SSA 能让人形在**挑战性场景中稳健运行、最小违例**，并能**跨任务免调参泛化**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| p-SSA | Projected Safe Set Algorithm，投影安全集算法 |
| Dexterous Safety | 灵巧安全（肢体级几何约束） |
| Limb-level | 肢体级，按各肢体几何建约束 |
| Self-collision | 自碰撞（机体各部分相撞） |
| Infeasibility | 约束不可行（冲突） |
| Safety Violation | 安全违例 |

---

## ❓ 论文要解决什么问题？

人形在**杂乱环境**操作要**安全**：
- 需**肢体级**避**外部碰撞 + 自碰撞**；
- 约束**数量巨大**且可能**互相冲突（不可行）**；
- 安全不能太保守而**牺牲性能**。

论文要：一个能处理**大量、可能冲突**约束、**最小违例**且**保性能**的安全控制算法。

---

## 🔧 方法详解

### 1. 灵巧安全：肢体级几何约束
按**各肢体几何**建立约束，在杂乱环境中同时避**外部碰撞**与**自碰撞**——比整体包络更精细。

### 2. p-SSA：投影安全集算法
扩展经典安全控制，**投影**到安全集处理**大量约束**。

### 3. 有原则地松弛冲突约束
当约束**不可行（冲突）**时，**有原则地松弛**冲突约束，**最小化安全违例**，从而**保证可行控制**（不会无解卡死）。

### 4. 验证
- 仿真 + **Unitree G1** 真机；
- 挑战性场景**稳健、最小违例**；
- **跨任务免调参泛化**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    ENV["🗂️ 杂乱环境 + 肢体级几何"] --> CONS["大量约束<br/>(避外碰 + 自碰)"]
    CONS --> PSSA
    subgraph PSSA["p-SSA 投影安全集"]
        R["有原则松弛冲突约束<br/>最小化违例 → 保证可行"]
    end
    PSSA --> OUT["🤖 Unitree G1<br/>稳健 + 最小违例 · 跨任务免调参"]

    style PSSA fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **灵巧安全问题**：肢体级几何约束，避外部 + 自碰撞；
2. **p-SSA 算法**：投影安全集处理大量约束；
3. **有原则松弛冲突约束**：最小化违例、保证可行控制；
4. **真机验证 + 免调参泛化**：G1 杂乱场景稳健。

---

## 🤖 对人形机器人学习的启发

- **"约束太多会不可行"是安全控制的真问题**，有原则的松弛比硬失败更实用；
- **肢体级几何**对高自由度人形的自碰撞避免必不可少；
- **免调参跨任务**的安全层利于工程复用；
- 与学习类控制互补：安全控制作"护栏"，学习作"性能"。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2502.02858](https://arxiv.org/abs/2502.02858) | 论文正文（灵巧安全、p-SSA、G1 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **相关·安全/碰撞**：[Collision-Free Humanoid Traversal（本仓 04）](../../04_Loco-Manipulation_and_WBC/Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes/Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes.html)；
- **安全门控（本仓 04）**：[SafeFlow](../../04_Loco-Manipulation_and_WBC/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow.html)。
