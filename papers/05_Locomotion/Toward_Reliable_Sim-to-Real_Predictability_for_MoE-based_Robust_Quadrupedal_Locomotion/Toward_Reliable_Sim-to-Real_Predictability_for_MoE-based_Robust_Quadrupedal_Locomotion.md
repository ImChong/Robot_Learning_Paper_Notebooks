---
layout: paper
title: "Toward Reliable Sim-to-Real Predictability for MoE-based Robust Quadrupedal Locomotion"
zhname: "面向 MoE 鲁棒四足运动的可靠 Sim-to-Real 可预测性"
category: "Locomotion"
arxiv: "2602.00678"
---

# Toward Reliable Sim-to-Real Predictability for MoE-based Robust Quadrupedal Locomotion
**统一框架：用门控专家混合（MoE）运动策略把地形与指令的隐表征分解、仅靠本体感受实现多地形鲁棒部署，并配 RoboGauge——一个用 sim-to-sim 指标量化「sim-to-real 可迁移性」的预测评估套件，从而无需大量真机试验就能可靠地选策略；Go2 上雪/沙/楼梯/斜坡/30cm 障碍稳健通行，高速达 4 m/s 并涌现窄步态**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 05 Locomotion · 四足运动 · 专家混合 MoE · Sim-to-Real 可预测性 · 本体感受 · Go2
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 1 月 |
| arXiv | [2602.00678](https://arxiv.org/abs/2602.00678) · [PDF](https://arxiv.org/pdf/2602.00678) · [HTML](https://arxiv.org/html/2602.00678v1) |
| 作者 | Tianyang Wu、Hanwei Guo、Yuhang Wang、Junshu Yang、Xinyang Sui 等（西安交大等） |
| 主题 | cs.RO · 四足运动 / MoE / sim-to-real 评估 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Locomotion 模块（四足，上游收录）。

---

## 🎯 一句话总结

> RL 在**四足敏捷运动**上很有前景，即便**仅本体感受**也行。但实践中**sim-to-real 差距**与**复杂地形上的奖励过拟合**会让策略**迁移失败**，而**物理验证**又**风险高、低效**。本文提出一个**统一框架**：① 一个**专家混合（MoE）运动策略**，用**门控的专家集合**把**隐式地形与指令建模分解**，**仅靠本体感受**实现更优的**部署鲁棒性与泛化**；② **RoboGauge** ——一个**预测性评估套件**，**量化 sim-to-real 可迁移性**，通过跨地形、难度、域随机化的**sim-to-sim 测试**给出**多维本体感受指标**，使**无需大量真机试验**即可**可靠地选 MoE 策略**。在 **Unitree Go2** 上：雪、沙、楼梯、斜坡、**30cm 障碍**等未见地形稳健通行；高速测试达 **4 m/s**，并**涌现**与高速稳定相关的**窄步态**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| MoE | Mixture-of-Experts，专家混合 |
| RoboGauge | 本文的 sim-to-real 可迁移性评估套件 |
| Proprioception | 本体感受，仅用内部状态感知 |
| Sim-to-Sim | 仿真到仿真测试，用于预测迁移性 |
| Gating | 门控，按情境选择/混合专家 |
| Emergent Gait | 涌现步态，训练中自发出现的步态 |

---

## ❓ 论文要解决什么问题？

四足 RL 运动的痛点：
- **sim-to-real 差距 + 奖励过拟合** → 迁移失败；
- **物理验证风险高、低效** → 难以判断哪个策略能迁移。

论文要：① 更鲁棒的多地形策略（仅本体感受）；② 一个**无需大量真机**就能**预测迁移性**、可靠选策略的评估方法。

---

## 🔧 方法详解

### 1. MoE 运动策略（仅本体感受）
用**门控专家集合**把**隐式地形与指令建模分解**到不同专家，按情境路由，仅靠**本体感受**就实现多地形**鲁棒部署与泛化**。

### 2. RoboGauge：可迁移性预测评估
一个**预测评估套件**：通过跨**地形 / 难度 / 域随机化**的**sim-to-sim 测试**，给出**多维本体感受指标**，量化**sim-to-real 可迁移性**——据此**无需大量真机试验**即可**可靠选策略**。

### 3. 结果（Unitree Go2）
- 未见难地形（雪/沙/楼梯/斜坡/30cm 障碍）稳健通行；
- 高速 **4 m/s**，涌现**窄步态**（与高速稳定相关）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    P["📟 本体感受"] --> MOE
    subgraph MOE["MoE 运动策略"]
        G["门控专家：地形/指令分解"]
    end
    MOE --> GAUGE
    subgraph GAUGE["RoboGauge 评估"]
        S["sim-to-sim 多维指标<br/>预测可迁移性"]
    end
    GAUGE -->|可靠选策略(免真机试错)| OUT["🐕 Go2 雪/沙/楼梯/斜坡/30cm<br/>4 m/s 涌现窄步态"]

    style MOE fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style GAUGE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **MoE 鲁棒运动策略**：门控专家分解地形/指令，仅本体感受多地形泛化；
2. **RoboGauge 可迁移性评估**：sim-to-sim 多维指标预测 sim-to-real，免大量真机；
3. **可靠选策略**：把"哪个策略能迁移"变成可预测问题；
4. **Go2 实测**：多难地形稳健、4 m/s、涌现窄步态。

---

## 🤖 对人形机器人学习的启发

- **"预测可迁移性"是 sim-to-real 被忽视的一环**：与其试错真机，不如用 sim-to-sim 指标筛选——对人形（真机更贵更危险）尤其有价值；
- **MoE 按地形/指令分解**是鲁棒多地形的有效结构，呼应 EGM 的专家分设；
- 虽为四足，但**评估方法论与 MoE 思想可迁移到人形**；
- **涌现步态**提示 RL 能自发找到与稳定相关的运动模式。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2602.00678](https://arxiv.org/abs/2602.00678) | 论文正文（MoE 策略、RoboGauge、Go2 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；本文以**四足（Go2）**为载体，因收录于上游 Locomotion 模块而纳入；**数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·运动/地形泛化**：本仓 05 Locomotion 其它行走工作；
- **sim-to-real 评估 / 专家混合**：[EGM（CDMoE 高动态跟踪）](../../04_Loco-Manipulation_and_WBC/EGM__Efficiently_Learning_General_Motion_Tracking_for_High_Dynamic_Humanoid_WBC/EGM__Efficiently_Learning_General_Motion_Tracking_for_High_Dynamic_Humanoid_WBC.html) · 本仓 10 Sim-to-Real 板块。
