---
layout: paper
title: "Humanoid Locomotion as Next Token Prediction"
category: "高影响力精选 High Impact Selection"
subcategory: "Locomotion Classics"
zhname: "人形行走即下一 token 预测（自回归传感运动轨迹 · Digit 实机）"
paper_order: 293
---

# Humanoid Locomotion as Next Token Prediction
**人形行走即下一 token 预测（自回归传感运动轨迹 · Digit 实机）**

> 📅 阅读日期: 2026-05-22
>
> 🏷️ 板块: 03_High_Impact_Selection / Locomotion Classics（H13）
>
> 🧭 状态: 首版基础摘要稿；含 PDF / HTML / 项目页与流程图。与 H12「RL 因果 Transformer」对照：本文走 **离线自回归生成式建模** 而非在线 PPO。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2402.19469](https://arxiv.org/abs/2402.19469) |
| **HTML** | [arxiv.org/html/2402.19469v1](https://arxiv.org/html/2402.19469v1) |
| **PDF** | [arxiv.org/pdf/2402.19469.pdf](https://arxiv.org/pdf/2402.19469.pdf) |
| **项目主页** | [humanoid-next-token-prediction.github.io](https://humanoid-next-token-prediction.github.io/) |
| **OpenReview（NeurIPS 2024 Spotlight）** | [openreview.net/forum?id=GrMczQGTlA](https://openreview.net/forum?id=GrMczQGTlA) |
| **作者** | Ilija Radosavovic, Bike Zhang, Baifeng Shi, Jathushan Rajasegaran, Sarthak Kamat, Trevor Darrell, Koushil Sreenath, Jitendra Malik |
| **机构** | UC Berkeley（Hybrid Robotics / BAIR） |
| **机器人** | Agility Robotics **Digit**（与 H12 相同平台，约 1.6 m / 45 kg / 高维闭链） |
| **发布时间** | 2024-02-29 (arXiv) |
| **源码** | 截至笔记整理时 **未见到与论文标题一致的独立官方训练代码仓库**；数据管线涉及 PHALP、AMASS/KIT 与 Agility 仿真器，可与同组 [learning-humanoid-locomotion](https://learning-humanoid-locomotion.github.io/)（H12）生态对照阅读 |

---

## 🎯 一句话总结

把真实人形 **locomotion** 写成「下一词预测」：用 **因果 Transformer** 对 **传感–动作 token 序列** 做自回归拟合，**模态对齐** 地预测下一 token；对缺动作的轨迹用 **可学习 mask token** 统一格式，从而吃进 RL 策略轨迹、MPC 观测、动捕与 YouTube 人体视频。**仅用约 27 小时量级行走数据** 训练即可 **零样本** 在旧金山多路面部署，并能泛化到如 **后退行走** 等训练外指令。

---

## ❓ 论文在解决什么？

H12 证明大规模 **PPO + 因果 Transformer** 可从仿真迁移到 Digit；本文问的是：**能否像语言模型一样，用纯自回归密度建模** $p(\text{轨迹})$ **从异构、甚至缺模态的离线数据中学策略**，避免依赖在线 RL 的采样与奖励工程？

要点：

1. **联合分布**：不只拟合 $\pi(a \mid o)$，而是对 $(o,a)$ 序列整体建模，信息量比纯策略更大。  
2. **多数据源**：仿真 RL 轨迹、厂商 MPC 观测（无动作标签）、人形动捕、网络视频（无真实动作）。  
3. **缺失模态**：用 mask 占位 + 对 mask 位置不算损失，统一训练框架。

---

## 🔧 方法详解

### 1. 轨迹 token 化与目标

单条轨迹 $\mathcal{T}=(o_1,a_1,\ldots,o_T,a_T)$，经线性投影等为 token 序列 $t_1,\ldots,t_K$，优化自回归负对数似然（论文实现为 **带常方差高斯假设的 MSE** 回归下一 token）。

### 2. 模态对齐预测（modality-aligned）

对每个输入 token，预测 **同模态的下一 token**（而非任意混合顺序），以应对传感与动作维度异构、多峰数据。

### 3. 缺失动作 / 观测：mask token

若某步无动作（如 MPC 只记观测、视频只有姿态），将动作槽替换为可学习的 **[M]**，前向仍算注意力，但 **不对 mask 位置的预测施加损失**。可推广到其它缺失传感。

### 4. 模型与上下文

**Vanilla 因果 Transformer**（文中典型：hidden 192、4 层、4 头、LayerNorm + ReLU MLP）；推理时 **自回归执行动作**，用真机新观测替换模型对观测的预测，保持闭环。

### 5. 数据构成（四类）

| 来源 | 内容特点 |
|------|-----------|
| 仿真 RL 策略（同组 prior work） | 完整 $(o,a)$，高质量标签 |
| Agility MPC | 有观测、动作空间与关节位置策略不一致故 **无动作** |
| KIT / AMASS 人行走动捕 | 无动作；**IK 重定向** 到 Digit |
| YouTube + PHALP 3D 人体 | 噪声大；重定向后过滤低 IK 代价样本 |

### 6. 实机与仿真结论（摘要级）

- **旧金山一周多地点** 户外行走，多种铺装与非铺装路面。  
- 数据规模可缩至约 **27 h** 仍具迁移能力（论文主文强调的可扩展性信号）。  
- 仿真中离线自回归策略可与强 **RL baseline** 可比；补全无动作轨迹对性能有益。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 异构轨迹数据"]
        D1["RL 仿真策略<br/>完整 o,a"]
        D2["MPC 控制器<br/>仅有 o"]
        D3["动捕 AMASS/KIT<br/>IK→机器人 o"]
        D4["YouTube + PHALP<br/>IK→机器人 o"]
    end

    subgraph TOK["🔤 Token 化"]
        T1["线性投影 + 位置编码"]
        T2["缺动作处插入<br/>可学习 mask [M]"]
    end

    subgraph TRAIN["🧠 训练"]
        TR1["因果 Transformer<br/>模态对齐下一 token 预测"]
        TR2["MSE / NLL<br/>mask 位置不计损失"]
    end

    subgraph DEP["🤖 部署 Digit"]
        E1["自回归输出下一动作"]
        E2["真机观测闭环<br/>丢弃预测观测"]
    end

    DATA --> TOK --> TRAIN --> DEP
</div>

---

## 🔗 与 H12（Real-World Humanoid RL）的关系

| 维度 | H12 RL Transformer | 本文 Next-Token |
|------|-------------------|-----------------|
| 学习范式 | 在线 PPO，奖励塑形 | 离线自回归轨迹建模 |
| 目标分布 | 条件策略 $\pi(a\mid\cdot)$ | 联合序列 $p(o,a,\ldots)$ |
| 数据 | 主要仿真自采 rollout | 多源 + 弱监督视频 |
| 共同点 | 因果 Transformer、Digit、Berkeley 团队线 |

---

## 📚 自测与二读建议

- 对照 **OpenReview** 附录中的消融与超参表补全本笔记数值栏。  
- 若后续放出实现，将 **GitHub** 链补入「基本信息」表并跑一次小规模复现记录。

---

## 📎 附录：高影响力精选 · Locomotion 相关笔记

| 论文 | 说明 |
|------|------|
| [Real-World Humanoid Locomotion with RL](../Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html) | 在线 PPO + 因果 Transformer（Digit） |
| **本文** | 离线自回归 next-token（Digit） |
| [Humanoid Parkour Learning](../Humanoid_Parkour_Learning/Humanoid_Parkour_Learning.html) | 视觉跑酷全身控制（Unitree H1） |
| [Learning Sim-to-Real Humanoid Locomotion in 15 Minutes](../Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes/Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes.html) | 快速 sim-to-real 人形行走（H15） |
| [ECO](../ECO_Energy_Constrained_Optimization_with_RL_for_Humanoid_Walking/ECO_Energy_Constrained_Optimization_with_RL_for_Humanoid_Walking.html) | 能耗显式约束 RL 人形行走（H16） |
