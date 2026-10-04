---
layout: paper
title: "EGM: Efficiently Learning General Motion Tracking Policy for High Dynamic Humanoid Whole-Body Control"
zhname: "EGM：高效学习高动态人形全身控制的通用动作跟踪策略"
category: "Loco-Manipulation and WBC"
arxiv: "2512.19043"
---

# EGM: Efficiently Learning General Motion Tracking Policy for High Dynamic Humanoid Whole-Body Control
**针对通用动作跟踪「数据/训练低效、且高动态动作跟不好」的痛点：用基于分箱的跨动作课程自适应采样按跟踪误差动态调采样、用「复合解耦专家混合（CDMoE）」分上/下半身并解耦正交与共享专家、再用三阶段课程逐步抗扰——仅 4.08 小时数据训练即可泛化到 49.25 小时测试动作，常规与高动态任务均超基线**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 通用动作跟踪 · 课程采样 · MoE · 高动态 · 数据高效
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月 |
| arXiv | [2512.19043](https://arxiv.org/abs/2512.19043) · [PDF](https://arxiv.org/pdf/2512.19043) · [HTML](https://arxiv.org/html/2512.19043v1) |
| 作者 | Chao Yang、Yingkai Sun、Peng Ye、Xin Chen、Chong Yu、Tao Chen（复旦等） |
| 主题 | cs.RO · 通用动作跟踪 / 数据高效 / 高动态全身控制 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 从人类动作学**通用动作跟踪策略**潜力很大，但传统做法**数据利用与训练都低效**，且在**高动态动作**上**跟踪性能受限**。EGM 用三件套提升效率与高动态表现：① **基于分箱的跨动作课程自适应采样（bin-based cross-motion curriculum adaptive sampling）**——按各动作 bin 的**跟踪误差**动态调整采样概率，把算力投到难学的动作上；② **复合解耦专家混合（Composite Decoupled MoE, CDMoE）**——为**上/下半身分设专家**，并**解耦正交专家与共享专家**；③ **三阶段课程训练**——逐步增强对扰动的鲁棒性。结果：**仅用 4.08 小时**数据训练，即可泛化到 **49.25 小时**测试动作，在**常规与高动态**任务上**均超基线**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Motion Tracking | 动作跟踪，复现参考人类动作 |
| Curriculum Sampling | 课程采样，按难度/误差调整训练样本分布 |
| Bin-based | 分箱，把动作按某种划分分组统计 |
| CDMoE | Composite Decoupled Mixture-of-Experts，复合解耦专家混合 |
| Upper/Lower Decouple | 上/下半身解耦，分设专家分别建模 |
| High Dynamic | 高动态，速度/加速度大的剧烈动作 |

---

## ❓ 论文要解决什么问题？

通用动作跟踪有两大低效与一处短板：
- **数据利用低效**：对所有动作一视同仁地采样，难学的动作得不到足够训练；
- **训练低效**：流程冗长；
- **高动态短板**：剧烈动作（高速摆腿、跳跃等）跟踪性能差。

EGM 想要：**用更少数据、更短训练**，把**高动态动作也跟得好**的通用策略学出来。

---

## 🔧 方法详解

### 1. 基于分箱的跨动作课程自适应采样
把动作按 bin 划分，**依据各 bin 的跟踪误差动态调整采样概率**：误差大的动作多采、误差小的少采，使训练算力聚焦于「当前最难学」的部分，提升数据效率。

### 2. 复合解耦专家混合（CDMoE）
- **上/下半身分设专家**：人形上肢操作与下肢行走特性不同，分开建模更高效；
- **解耦正交专家与共享专家**：在专家间区分「共享通用能力」与「正交特化能力」，提升表达力与复用。

### 3. 三阶段课程训练
分三阶段**逐步增强抗扰鲁棒性**，让策略从易到难稳健收敛。

### 4. 结果
- **数据高效**：仅 **4.08 小时**训练；
- **泛化**：覆盖 **49.25 小时**测试动作；
- **性能**：常规与**高动态**任务**均超基线**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DATA["🎞️ 人类动作数据"] --> SAMP
    subgraph SAMP["① 分箱课程自适应采样"]
        E["按跟踪误差动态调采样概率"]
    end
    SAMP --> MOE
    subgraph MOE["② CDMoE"]
        U["上/下半身专家"]
        O["正交 vs 共享专家解耦"]
    end
    MOE --> CUR["③ 三阶段课程（抗扰）"]
    CUR --> OUT["🤖 4.08h 训练 → 49.25h 泛化<br/>常规 + 高动态均超基线"]

    style SAMP fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style MOE fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **误差驱动的课程采样**：分箱跨动作自适应采样，把算力投向难学动作，显著提升数据效率；
2. **CDMoE 架构**：上/下半身分设 + 正交/共享专家解耦，兼顾表达力与复用；
3. **三阶段抗扰课程**：逐步增强鲁棒性；
4. **数据高效 + 高动态**：4.08h 训练泛化到 49.25h，常规与高动态任务均超基线。

---

## 🤖 对人形机器人学习的启发

- **「按误差采样」是动作跟踪提效的通用杠杆**：与其均匀采样，不如把训练预算投给难学动作；
- **上/下半身解耦的 MoE 契合人形结构先验**：操作 vs 行走特性不同，分而治之更高效；
- **数据高效对人形尤为珍贵**：高质量动作数据稀缺，4h→49h 的泛化比很有吸引力；
- **与 SONIC、General Motion Tracking 等「通用跟踪」工作互补**，可对照不同的效率/鲁棒手段。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.19043](https://arxiv.org/abs/2512.19043) | 论文正文（课程采样、CDMoE、三阶段课程、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·通用动作跟踪**：[Robust and Generalized Humanoid Motion Tracking](../Robust_and_Generalized_Humanoid_Motion_Tracking/Robust_and_Generalized_Humanoid_Motion_Tracking.html) · [Heracles（跟踪 + 生成融合）](../Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control/Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control.html)；
- **高动态控制**：[OmniXtreme](../OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control/OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control.html)。
