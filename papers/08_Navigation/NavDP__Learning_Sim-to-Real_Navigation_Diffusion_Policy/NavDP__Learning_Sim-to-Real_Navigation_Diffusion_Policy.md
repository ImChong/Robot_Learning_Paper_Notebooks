---
layout: paper
title: "NavDP: Learning Sim-to-Real Navigation Diffusion Policy with Privileged Information Guidance"
zhname: "NavDP：用特权信息引导学习 Sim-to-Real 导航扩散策略"
category: "Navigation"
arxiv: "2505.08712"
---

# NavDP: Learning Sim-to-Real Navigation Diffusion Policy with Privileged Information Guidance
**只在仿真训练就能零样本跨环境、跨本体迁移真机的端到端导航扩散策略：用统一 Transformer 同时生成轨迹并打分（评论值），以局部 RGB-D 为条件，借助特权仿真信息提升空间理解；在跨 3000 个场景、累计百万米的大规模数据上训练，仿真与真机均显著超越此前 SOTA**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 08 Navigation · 导航扩散策略 · Sim-to-Real · 特权信息 · 跨本体 · RGB-D
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月 |
| arXiv | [2505.08712](https://arxiv.org/abs/2505.08712) · [PDF](https://arxiv.org/pdf/2505.08712) · [HTML](https://arxiv.org/html/2505.08712v1) |
| 作者 | Wenzhe Cai、Jiaqi Peng、Yuqiang Yang、Yujian Zhang、Meng Wei、Hanqing Wang、Yilun Chen、Tai Wang、Jiangmiao Pang（上海 AI Lab 等） |
| 主题 | cs.RO · 导航策略 / 扩散模型 / Sim-to-Real |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Navigation 模块。

---

## 🎯 一句话总结

> 在**动态复杂开放世界**中导航是自主机器人的关键且困难的能力。已有方法多依赖**级联模块化框架**（需大量调参）或**有限真实演示**学习。NavDP（**Navigation Diffusion Policy**）是一个**端到端**网络，**仅在仿真训练**就能实现**零样本 sim-to-real**，跨**多样环境与机器人本体**迁移。它用**统一的 Transformer 架构**同时做**轨迹生成与评估**：以**局部 RGB-D 观测**为条件，为**对比轨迹样本**预测**评论值（critic values）**，并借助**特权仿真信息**提升**空间理解**。训练数据**大规模**——跨 **3000 个场景**、累计**超百万米**导航。结果：在仿真与真机评测中均**显著超越此前 SOTA**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| NavDP | Navigation Diffusion Policy |
| Diffusion Policy | 扩散策略，用扩散生成动作/轨迹 |
| Privileged Info | 特权信息，训练时可用的真值/全局信息 |
| Critic Value | 评论值，对候选轨迹打分 |
| RGB-D | 彩色 + 深度观测 |
| Cross-Embodiment | 跨本体，迁移到不同机器人 |

---

## ❓ 论文要解决什么问题？

开放世界导航难点：
- 级联**模块化**框架需**大量调参**；
- 从**有限真实演示**学习数据少；
- 想**纯仿真训练、零样本上真机**且**跨本体**。

NavDP 要：一个**端到端、可大规模仿真训练、零样本迁移**的导航策略。

---

## 🔧 方法详解

### 1. 统一 Transformer：生成 + 评估
一个**统一 Transformer** 同时：
- **生成轨迹**（扩散）；
- **评估轨迹**：为**对比轨迹样本**预测**评论值**，择优。

### 2. 局部 RGB-D 条件 + 特权信息引导
- 以**局部 RGB-D**为条件做局部避障/规划；
- 训练时用**特权仿真信息**提升**空间理解**（学生部署时无需特权）。

### 3. 大规模仿真数据
跨 **3000 个场景**、累计**>百万米**导航数据，支撑零样本泛化。

### 4. 结果
- **纯仿真训练**、**零样本 sim-to-real**、**跨本体**；
- 仿真 + 真机均**显著超越 SOTA**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    RGBD["📷 局部 RGB-D"] --> T
    PRIV["🛰️ 特权仿真信息(训练期)"] --> T
    subgraph T["统一 Transformer (NavDP)"]
        G["扩散生成轨迹"]
        C["评论值打分择优"]
        G --> C
    end
    T --> OUT["🤖 零样本 Sim-to-Real<br/>跨环境/跨本体 · 超 SOTA<br/>(3000 场景/百万米训练)"]

    style T fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **端到端导航扩散策略**：纯仿真训练、零样本 sim-to-real、跨本体；
2. **统一 Transformer 生成 + 评估**：扩散生轨迹 + 评论值打分；
3. **特权信息引导**：训练期提升空间理解，部署期无需特权；
4. **大规模数据 + SOTA**：3000 场景/百万米，仿真与真机均领先。

---

## 🤖 对人形机器人学习的启发

- **"生成 + 评估"一体的 Transformer**是导航策略的优雅设计，避免级联调参；
- **特权信息引导**是 sim-to-real 的常用强力手段（与 VIRAL、Opening-Door 同思路）；
- **跨本体**意味着人形可直接复用，导航能力与本体解耦；
- 大规模仿真数据是零样本泛化的底座。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.08712](https://arxiv.org/abs/2505.08712) | 论文正文（统一 Transformer、特权引导、大规模实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人形导航**：[社交导航](../Learning_Social_Navigation_from_Positive_and_Negative_Demonstrations_and_Rule-Based_Specifications/Learning_Social_Navigation_from_Positive_and_Negative_Demonstrations_and_Rule-Based_Specifications.html) · [Hand-Eye Delivery](../HEAD__Hand-Eye_Autonomous_Delivery_Humanoid_Navigation_Locomotion_and_Reaching/HEAD__Hand-Eye_Autonomous_Delivery_Humanoid_Navigation_Locomotion_and_Reaching.html) · [Humanoid Occupancy](../Humanoid_Occupancy__Generalized_Multimodal_Occupancy_Perception_System/Humanoid_Occupancy__Generalized_Multimodal_Occupancy_Perception_System.html)。
