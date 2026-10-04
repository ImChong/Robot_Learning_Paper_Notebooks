---
layout: paper
title: "Reinforcement Learning with Data Bootstrapping for Dynamic Subgoal Pursuit in Humanoid Robot Navigation"
zhname: "用数据自举的强化学习实现人形导航中的动态子目标追踪"
category: "Navigation"
arxiv: "2506.02206"
---

# Reinforcement Learning with Data Bootstrapping for Dynamic Subgoal Pursuit in Humanoid Robot Navigation
**分层导航框架：高层 RL 规划器在机器人中心坐标系里持续生成动态子目标穿越杂乱环境，低层基于 MPC 的规划器产出鲁棒步态去到达子目标；用一套数据自举（借模型法生成多样信息丰富的数据集）来加速并稳定训练；Digit 人形多场景仿真中成功率与适应性显著优于原模型法与其它学习法**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 08 Navigation · 分层导航 · 动态子目标 · RL+MPC · 数据自举 · Digit
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 6 月 |
| arXiv | [2506.02206](https://arxiv.org/abs/2506.02206) · [PDF](https://arxiv.org/pdf/2506.02206) · [HTML](https://arxiv.org/html/2506.02206v1) |
| 作者 | Chengyang Peng、Zhihao Zhang、Shiting Gong、Sankalp Agrawal、Keith A. Redmill、Ayonga Hereid（OSU） |
| 主题 | cs.RO · 人形导航 / 分层 RL+MPC / 数据自举 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Navigation 模块。

---

## 🎯 一句话总结

> **安全、实时**导航是人形应用的基础，但现有双足导航框架常难以**平衡计算效率与稳定行走所需的精度**。本文提出一个**分层框架**，**持续生成动态子目标**引导机器人穿越**杂乱环境**：**高层 RL 规划器**在**机器人中心坐标系**里选子目标，**低层基于 MPC 的规划器**产出**鲁棒行走步态**去到达这些子目标。为**加速并稳定训练**，引入一种**数据自举（data bootstrapping）**技术——借**基于模型的导航方法**生成**多样、信息丰富**的数据集。在 **Agility Digit** 人形上、多种随机障碍场景仿真验证：相比**原模型法**与**其它学习法**，**成功率与适应性显著提升**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Dynamic Subgoal | 动态子目标，随情境持续更新的中间目标 |
| Hierarchical | 分层，高层规划 + 低层控制 |
| MPC | Model Predictive Control，模型预测控制 |
| Data Bootstrapping | 数据自举，用模型法生成训练数据 |
| Robot-Centric Frame | 机器人中心坐标系 |
| Digit | Agility Robotics 的双足人形 |

---

## ❓ 论文要解决什么问题？

双足导航要**安全 + 实时**，但：
- 难**平衡计算效率与稳定行走精度**；
- 杂乱环境需**动态**调整路径；
- RL 直接训练**慢且不稳**。

论文要：一个**高效、稳定、适应杂乱环境**的分层导航框架。

---

## 🔧 方法详解

### 1. 分层：RL 子目标 + MPC 步态
- **高层 RL 规划器**：在**机器人中心坐标系**中**动态选子目标**，引导穿越杂乱环境；
- **低层 MPC 规划器**：产出**鲁棒行走步态**到达子目标。

RL 管"去哪"、MPC 管"怎么稳稳走过去"，各取所长。

### 2. 数据自举（加速稳定训练）
用**基于模型的导航方法**生成**多样、信息丰富**的数据集来**自举**训练，缓解 RL 冷启动慢、不稳的问题。

### 3. 评测
- **Agility Digit** 人形、多种**随机障碍**场景仿真；
- 相比**原模型法**与**其它学习法**，**成功率与适应性显著提升**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    MB["📐 模型法导航"] -. 数据自举 .-> HI
    subgraph HI["高层 RL 规划器"]
        SG["机器人中心系动态子目标"]
    end
    HI --> LOW["低层 MPC 规划器<br/>鲁棒步态"]
    LOW --> OUT["🤖 Digit 杂乱环境导航<br/>成功率/适应性↑"]

    style HI fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style LOW fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **分层 RL+MPC 导航**：高层动态子目标 + 低层鲁棒步态；
2. **机器人中心子目标**：贴合双足局部决策；
3. **数据自举**：借模型法生成数据，加速稳定 RL 训练；
4. **Digit 验证**：杂乱随机障碍场景成功率/适应性优于模型法与其它学习法。

---

## 🤖 对人形机器人学习的启发

- **RL+MPC 分层**是导航兼顾"智能选路"与"稳定执行"的务实组合；
- **数据自举**用现成模型法解决 RL 冷启动，是低成本提效手段；
- **动态子目标**比一次性全局规划更适应杂乱动态环境；
- 与 NavDP、社交导航等共同丰富人形导航的方法谱。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2506.02206](https://arxiv.org/abs/2506.02206) | 论文正文（分层框架、数据自举、Digit 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人形导航**：[NavDP](../NavDP__Learning_Sim-to-Real_Navigation_Diffusion_Policy/NavDP__Learning_Sim-to-Real_Navigation_Diffusion_Policy.html) · [Humanoid Occupancy（占据感知）](../Humanoid_Occupancy__Generalized_Multimodal_Occupancy_Perception_System/Humanoid_Occupancy__Generalized_Multimodal_Occupancy_Perception_System.html)。
