---
layout: paper
title: "Learning Social Navigation from Positive and Negative Demonstrations and Rule-Based Specifications"
zhname: "从正负示范与规则规范学习社交导航"
category: "Navigation"
arxiv: "2510.12215"
---

# Learning Social Navigation from Positive and Negative Demonstrations and Rule-Based Specifications
**针对人群环境导航「既要适应多样行为又要遵守安全约束」的矛盾：从正/负示范学一个密度型奖励，再叠加避障与到达目标的规则目标；用基于采样的前瞻控制器产出既安全又自适应的监督动作，蒸馏成带不确定性估计、可实时运行的紧凑学生策略；合成与电梯共乘仿真成功率/时效双升，真人实验验证可部署**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 08 Navigation · 社交导航 · 正负示范 · 规则规范 · 前瞻控制 · 策略蒸馏
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 10 月 |
| arXiv | [2510.12215](https://arxiv.org/abs/2510.12215) · [PDF](https://arxiv.org/pdf/2510.12215) · [HTML](https://arxiv.org/html/2510.12215) |
| 作者 | Chanwoo Kim 等（共 12 位作者） |
| 主题 | cs.RO · 社交导航 / 示范学习 / 安全约束 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Navigation 模块。
>
> ⚠️ 备注：上游 README 对本条目的 arXiv 链接误标为 `2508.06779`（实际指向一篇足迹规划论文）；本笔记按论文标题核对，正确 arXiv 为 **2510.12215**。

---

## 🎯 一句话总结

> 移动机器人在**动态人群环境**导航，需要策略**既能适应多样人类行为、又遵守安全约束**。本文从**正示范与负示范（positive and negative demonstrations）**学一个**密度型奖励（density-based reward）**，并叠加**基于规则的目标**（避障、到达目标）。一个**基于采样的前瞻控制器（sampling-based lookahead controller）**产出**既安全又自适应**的监督动作，再**蒸馏**成一个**紧凑学生策略**，可**实时运行**并给出**不确定性估计**。在**合成**与**电梯共乘（elevator co-boarding）**仿真中，**成功率与时间效率**一致优于基线；**真人参与**的真实实验验证了可部署性。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Social Navigation | 社交导航，在人群中礼貌且安全地移动 |
| Positive/Negative Demo | 正/负示范，期望与不期望的行为样本 |
| Density-Based Reward | 密度型奖励，按示范分布密度塑形 |
| Rule-Based Spec | 规则规范，显式安全/目标约束 |
| Lookahead Controller | 前瞻控制器，基于采样向前看若干步 |
| Distillation | 蒸馏，把监督动作压进实时学生策略 |

---

## ❓ 论文要解决什么问题？

人群环境导航的核心张力：
- **适应性**：要顺应多样、动态的人类行为；
- **合规性**：要遵守**安全约束**（不撞人、保持礼貌距离）。

纯学习易违规，纯规则不够灵活。论文要：把**示范学习**与**规则约束**结合，得到既安全又自适应、且能实时跑的社交导航策略。

---

## 🔧 方法详解

### 1. 正负示范 → 密度型奖励
从**正示范**（好的社交行为）与**负示范**（应避免的行为）学一个**密度型奖励**，刻画"什么样的轨迹更像期望行为"。

### 2. 叠加规则目标
在学到的奖励上**叠加规则化目标**：**避障**与**到达目标**，把硬安全/任务约束显式注入。

### 3. 采样前瞻控制器 → 学生蒸馏
- **基于采样的前瞻控制器**：在线产出**既安全又自适应**的监督动作；
- **蒸馏**：把这些监督动作压进一个**紧凑学生策略**，**实时**运行并输出**不确定性估计**。

### 4. 评测
- **合成** + **电梯共乘**仿真：成功率与时间效率优于基线；
- **真人实验**：验证真实可部署。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    D["🙆/🙅 正负示范"] --> R["密度型奖励"]
    RULE["📏 规则目标(避障/到达)"] --> R
    R --> LA["采样前瞻控制器<br/>(安全且自适应监督动作)"]
    LA --> ST["蒸馏 → 紧凑学生策略<br/>(实时 + 不确定性估计)"]
    ST --> OUT["🚶 社交导航<br/>合成/电梯共乘成功率↑ · 真人验证"]

    style R fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **正负示范的密度型奖励**：同时利用好/坏样本塑形社交行为；
2. **示范 + 规则融合**：叠加避障/到达的规则目标，兼顾适应与安全；
3. **前瞻控制器 + 蒸馏**：产出安全自适应监督动作并压成实时学生策略（带不确定性）；
4. **仿真 + 真人验证**：电梯共乘等场景成功率/时效双升。

---

## 🤖 对人形机器人学习的启发

- **负示范是被低估的监督信号**：显式告诉策略"别这样"，对安全攸关的社交导航尤为有用；
- **学习 + 规则**的混合是安全导航的务实范式，呼应 SafeFlow 的"生成 + 门控"；
- **前瞻 + 蒸馏**兼顾质量与实时，适合算力受限的机器人；
- 对人形而言，社交导航是进入人类空间（电梯、走廊）的关键能力。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2510.12215](https://arxiv.org/abs/2510.12215) | 论文正文（密度奖励、规则目标、前瞻控制、真人实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要与公开检索信息整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人形导航**：[Hand-Eye Autonomous Delivery（导航+运动+到达）](../HEAD__Hand-Eye_Autonomous_Delivery_Humanoid_Navigation_Locomotion_and_Reaching/HEAD__Hand-Eye_Autonomous_Delivery_Humanoid_Navigation_Locomotion_and_Reaching.html) · [NavDP（Sim-to-Real 导航扩散策略）](../NavDP__Learning_Sim-to-Real_Navigation_Diffusion_Policy/NavDP__Learning_Sim-to-Real_Navigation_Diffusion_Policy.html)。
