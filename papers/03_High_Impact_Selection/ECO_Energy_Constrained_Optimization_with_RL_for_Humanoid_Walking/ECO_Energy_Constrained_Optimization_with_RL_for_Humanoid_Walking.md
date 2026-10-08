---
layout: paper
title: "ECO: Energy-Constrained Optimization with Reinforcement Learning for Humanoid Walking"
category: "高影响力精选 High Impact Selection"
subcategory: "Locomotion Classics"
zhname: "ECO：把人形行走能耗写成显式约束的受限 RL（PPO-Lagrangian · BRUCE）"
paper_order: 296
---

# ECO: Energy-Constrained Optimization with Reinforcement Learning for Humanoid Walking
**ECO：人形行走的能耗约束强化学习**

> 📅 阅读日期: 2026-05-17
>
> 🏷️ 板块: 03_High_Impact_Selection / Locomotion Classics（H16）
>
> 🧭 状态: 首版基础摘要稿；含 PDF / HTML、项目页、开源实现与流程图。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2602.06445](https://arxiv.org/abs/2602.06445) |
| **HTML** | [arxiv.org/html/2602.06445v1](https://arxiv.org/html/2602.06445v1) |
| **PDF** | [arxiv.org/pdf/2602.06445.pdf](https://arxiv.org/pdf/2602.06445.pdf) |
| **项目主页 / 演示** | [sites.google.com/view/eco-humanoid](https://sites.google.com/view/eco-humanoid) |
| **作者** | Weidong Huang*, Jingwen Zhang*, Jiongye Li, Shibowen Zhang, Jiayang Wu, Jiayi Wang, Hangxin Liu, Yaodong Yang, Yao Su（* 等贡献） |
| **机构** | 北京通用人工智能研究院（BIGAI）等 |
| **硬件** | 小型人形机器人 **BRUCE**（实机 sim-to-real；策略 100 Hz → PD 力矩 1 kHz） |
| **仿真** | **Isaac Gym** 训练；文中另含 sim-to-sim（MuJoCo、Gazebo 等）对照讨论 |
| **发布时间** | 2026-02-06 (arXiv) |
| **源码** | [bigai-ai/ECO-humanoid](https://github.com/bigai-ai/ECO-humanoid) |

---

## 🎯 一句话总结

把**电机能耗**从「多目标奖励里的一堆加权项」里拆出来，改成 CMDP 下的**显式不等式约束**（再配合**镜像对称 / 参考运动**类约束），用 **PPO-Lagrangian** 在仿真里稳定求解，并在 **BRUCE** 上实现比 MPC、普通 PPO **显著更低能耗**的稳健对称行走。

---

## ❓ 论文在解决什么？

人形行走若用 PPO +「力矩平方、加速度、触地力」等能耗正则，往往要**长时间扫 reward 权重**，且能量与稳定性目标**互相打架**，物理解释差。MPC 虽可建模约束，但在复杂接触与高维策略下也有代价。本文主张：**任务回报专注跟踪 / 存活等指标，能耗用可解释的物理量（如关节功率积分）做约束阈值**，用拉格朗日乘子自适应收紧或放松，从而降低调参心智负担。

---

## 🔧 方法要点（摘要）

1. **问题形式**：在 CMDP 中最大化行走相关回报，同时满足 **折扣累计能耗约束** 与 **平均型镜像损失约束**（鼓励左右对称、步态自然）。  
2. **能耗代价**：逐步用各关节 **\(\lvert \tau_j \dot{q}_j \rvert\)** 刻画电机能耗主项，阈值 \(b_1\) 可按速度档与期望续航做**线性搜索式**标定（论文强调比扫 reward 系数更直观）。  
3. **优化器选择**：系统比较 **PPO-Lag、CRPO、IPO、P3O** 等约束 RL 变体后，选用 **PPO-Lagrangian**：在人形可行域较「窄」时仍兼顾**收敛速度**与**约束满足**。  
4. **策略结构**：历史帧本体感知 + 速度指令 → 网络输出**期望关节位置偏差**，经 PD 产生力矩；Critic 侧使用**特权信息**（摩擦、推扰、质量、足端相位等）加速仿真学习，再 sim-to-real 部署。  
5. **现象与结果**：策略自发出现**更轻触地、躯干晃动更小、膝伸展更充分**等节能步态；相对基线给出约 **6×（相对 MPC）/ 2.3×（相对 PPO）** 量级的能耗改进叙述（以论文图表为准）。

---

## 🧭 ECO 训练与部署管线（mermaid）

<div class="mermaid">
flowchart LR
    subgraph Obs["观测与指令"]
        O1["速度指令 + 时钟特征"]
        O2["关节 q, qdot + 机体角速度等"]
    end

    subgraph Policy["策略 / 评价"]
        P1["PPO-Lagrangian 策略网络<br/>输出目标关节角偏移"]
        C1["带特权信息的 Critic"]
    end

    subgraph CMDP["CMDP 约束"]
        K1["成本 C1：累计电机功率型能耗<br/>≤ 阈值 b1"]
        K2["成本 C2：镜像对称损失<br/>≤ 阈值 b2"]
        L["对偶变量 λ 更新<br/>拉格朗日项"]
    end

    subgraph Sim2Real["仿真 → 实机"]
        S["Isaac Gym 大规模 rollout"]
        R["BRUCE 上 100 Hz 策略 + 1 kHz PD"]
    end

    Obs --> Policy
    Policy --> CMDP
    CMDP --> L
    L --> Policy
    Policy --> Sim2Real
    S --> R
</div>

---

## 📚 二读建议

- 对照文中 **约束形式（折扣和 vs 平均和）** 与 **阈值标定流程**，把自己的机器人能耗指标换入同一套 CMDP 模板。  
- 在 [ECO-humanoid](https://github.com/bigai-ai/ECO-humanoid) 中对照 **PPO-Lag 实现与 cost 估计器**，复现 Isaac → BRUCE 的部署链路。  
- 与 **H12 Real-World Humanoid Loco**、**H15 15-min sim-to-real** 对照：本文焦点是 **能耗显式约束 + 约束算法选型**，而非吞吐或感知架构。
