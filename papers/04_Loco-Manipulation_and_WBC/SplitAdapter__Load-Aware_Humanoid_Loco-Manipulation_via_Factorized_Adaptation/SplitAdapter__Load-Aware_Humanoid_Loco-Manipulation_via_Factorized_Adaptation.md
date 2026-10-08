---
layout: paper
paper_order: 1
title: "SplitAdapter: Load-Aware Humanoid Loco-Manipulation via Factorized Adaptation"
zhname: "SplitAdapter：用「负载-动力学解耦」的因子化适配，让人形机器人稳稳搬动重物"
category: "Loco-Manipulation and WBC"
---

# SplitAdapter: Load-Aware Humanoid Loco-Manipulation via Factorized Adaptation
**SplitAdapter：负载感知的人形 Loco-Manipulation 因子化适配**

> 📅 阅读日期: 2026-06-14
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 负载自适应 · 因子化适配 · 世界模型 · GRL 解耦 · FiLM 调制 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 6 月 |
| arXiv | [2606.03297](https://arxiv.org/abs/2606.03297) · [PDF](https://arxiv.org/pdf/2606.03297) · [HTML](https://arxiv.org/html/2606.03297v1) |
| 项目页 | [splitadapter.github.io](https://splitadapter.github.io/) |
| 代码 | 项目页已挂出「Code」入口，截至当前为占位（`#`），尚未正式释出 |
| 作者 | Jeonguk Kang、Hanbyel Cho、Sanghyun Kang、Donghan Koo |
| 机构 | Future Robot AI Group, **Samsung Electronics**（三星电子未来机器人 AI 组） |
| 主题 | cs.RO · 人形负载搬运 / 全身控制 / 参数高效适配 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 第 534 项（PROGRESS.md 同号）。

---

## 🎯 一句话总结

> 人形机器人搬运不同重量、不同抬放高度的物体时，**「物体带来的负载变化」**与**「机器人自身的动力学失配」**会在接触瞬间相互纠缠；以往基于历史观测的适配器把这两类因素压进**同一个潜变量**，重载下鲁棒性变差。SplitAdapter 的做法是：**冻结一个预训练好的搬箱策略**，外挂两个分别面向「物体/负载」与「动力学」的上下文编码器，用**拆分世界模型目标**训练、用**基于梯度反转层（GRL）的对抗正则**把两条潜变量分离开、再用**分层 FiLM**注入回冻结策略，从而把负载因素显式解耦出来。结果：能稳健抬运至多 **6 kg**（含从地面起抬的难任务），并**零样本迁移到真机**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| FiLM | Feature-wise Linear Modulation，对特征做逐通道缩放/平移的条件调制 |
| GRL | Gradient Reversal Layer，梯度反转层，常用于对抗式特征解耦 / 域不变学习 |
| World Model | 世界模型，预测下一步状态/观测的辅助预测目标 |
| Context Encoder | 上下文编码器，从历史观测中推断隐含变量（如负载、动力学参数） |
| Loco-Manipulation | 移动操作，行走 + 操作（此处为搬箱）一体的全身任务 |
| Sim-to-Sim / Sim-to-Real | 仿真到仿真 / 仿真到真机的迁移评测 |

---

## ❓ 论文要解决什么问题？

人形机器人做**负载搬运类移动操作**（抬箱、搬运、放置）时，需要在**物体质量变化**与**抬/放高度变化**下保持稳定的全身控制。难点尤其在 **sim-to-real**：

- **两类扰动在接触时纠缠**：一类是**物体引入的负载变化**（质量、力臂、抬放高度不同导致的外力），另一类是**机器人侧的动力学失配**（电机、摩擦、惯量等 sim 与 real 的差异）。物理接触时二者耦合，难以分别建模；
- **单一潜变量的瓶颈**：以往「基于历史的适配器」把上述因素**压缩进一个潜表示**，在**重载**条件下这种混合表示会**削弱鲁棒性**——负载信息和动力学信息互相干扰，策略难以针对性补偿。

SplitAdapter 的目标：**把「负载」与「动力学」两类上下文显式拆开（factorize）**，让适配更有针对性，从而在重载、不同抬放高度下都更稳，并可零样本上真机。

---

## 🔧 方法详解

### 1. 冻结预训练策略 + 外挂适配（参数高效）
不重训主干，而是**冻结一个已经训练好的搬箱（box manipulation）策略**，在其上**外挂上下文编码器**做适配。这保住了基础策略已学到的全身控制能力，只学「如何针对当前负载/动力学去调制」。

### 2. 两个解耦的上下文编码器
- **物体 / 负载感知编码器（object/load-aware）**：从历史中推断当前物体质量、抬放高度等负载相关上下文；
- **动力学感知编码器（dynamics-aware）**：从历史中推断机器人侧动力学失配相关上下文。

二者产出**因子化的潜变量（factorized latents）**——这正是 "Split" 的核心：把原本混在一起的负载因素与动力学因素拆成两路。

### 3. 三种训练 / 约束机制
| 机制 | 作用 |
|---|---|
| **拆分世界模型目标（split world-model objectives）** | 为两个编码器分别提供预测式监督，让各自潜变量学到对应的物理因素 |
| **GRL 跨对抗正则（cross-adversarial regularization）** | 用梯度反转层做对抗，**强制两条潜变量互相「不可预测」**，实现负载 ↔ 动力学的解耦/分离 |
| **分层 FiLM（hierarchical Feature-wise Linear Modulation）** | 把因子化潜变量在网络多个层级以逐通道缩放/平移的方式**注入冻结策略**，实现条件化调制 |

### 4. 评测与结果
- **设置**：sim-to-sim 实验 + 真机部署；物体质量 **2 / 4 / 6 kg**、抬/放高度 **0 / 30 / 60 cm** 的网格化条件；
- **对比基线**：base policy（冻结基础策略）与 world-model FiLM 基线；
- **结论**：SplitAdapter 在 **Full-task 成功率**上整体优于上述基线，**重载（heavy-load）条件下提升最大**；可稳健抬运至多 **6 kg**（含**从地面起抬**这一难任务），并**零样本迁移到真实世界**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph BASE["🧊 冻结主干"]
        P0["预训练搬箱策略<br/>(box manipulation policy, 冻结)"]
    end

    subgraph ENC["🔀 因子化上下文编码器"]
        H["历史观测<br/>(proprio history)"]
        E1["物体/负载感知编码器<br/>z_load"]
        E2["动力学感知编码器<br/>z_dyn"]
        H --> E1
        H --> E2
    end

    subgraph TRAIN["🎓 训练目标 / 约束"]
        W["拆分世界模型目标<br/>(各自预测式监督)"]
        G["GRL 跨对抗正则<br/>(强制 z_load ⟂ z_dyn 解耦)"]
    end

    subgraph INJECT["🎛️ 分层 FiLM 注入"]
        F["逐通道缩放/平移<br/>多层级条件调制"]
    end

    E1 --> W
    E2 --> W
    E1 -. 对抗 .-> G
    E2 -. 对抗 .-> G
    E1 --> F
    E2 --> F
    F --> P0
    P0 --> OUT["🤖 稳健负载移动操作<br/>2/4/6 kg · 0/30/60 cm 抬放<br/>含地面起抬 · 零样本 Sim-to-Real"]

    style BASE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style ENC fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style TRAIN fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style INJECT fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **问题诊断**：指出负载搬运 sim-to-real 的关键症结是「物体负载变化」与「机器人动力学失配」在接触时**耦合**，而单潜变量适配器在**重载**下鲁棒性不足；
2. **因子化适配（SplitAdapter）**：冻结预训练策略，外挂**两个解耦的上下文编码器**，把负载与动力学显式拆开；
3. **解耦训练配方**：**拆分世界模型目标** + **GRL 跨对抗正则**（保证两条潜变量互不可预测）+ **分层 FiLM 注入**，是本文把「解耦」落到实处的三件套；
4. **实测有效**：跨 2/4/6 kg 与 0/30/60 cm 抬放条件，Full-task 成功率优于 base 与 world-model FiLM 基线，**重载提升最显著**，至多 6 kg、含地面起抬，**零样本上真机**。

---

## 🤖 对人形机器人学习的启发

- **「冻结主干 + 外挂解耦适配」是一条轻量路线**：相较重训整网，冻结已验证策略、只学因子化上下文，既省算力又保住既有能力，对工程落地友好；
- **把扰动「拆开」而非「混一起」**：负载与动力学解耦的思路，呼应力自适应 loco-manip（FALCON、HAFO、力自适应控制）对「外力来源建模」的诉求——显式区分外部负载与本体失配，有利于针对性补偿；
- **GRL/对抗解耦 + FiLM 调制** 是可迁移的组件：在动作跟踪、地形自适应、跨本体迁移等需要「从历史推断隐变量再条件化」的场景里都可借用；
- **重载是检验鲁棒性的好压力测试**：地面起抬 + 6 kg 这类高接触力任务，对全身控制与 sim-to-real 都极具区分度，值得作为后续工作的难度基准。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2606.03297](https://arxiv.org/abs/2606.03297) | 论文正文（含方法与实验细节） |
| [项目页 splitadapter.github.io](https://splitadapter.github.io/) | 概述、方法图、重载/变高度对比视频 |
| 代码 | 项目页留有「Code」入口，截至当前为占位，待官方释出 |
| [一作主页](https://jeonguk-kang.github.io) · [Hanbyel Cho](https://hanbyelcho.info/) | 作者主页 |

> ℹ️ 备注：本环境的网络出口策略屏蔽了 arXiv，PDF 正文与项目页视频暂不可直接抓取；本笔记主要依据**项目页 HTML（含完整 Abstract / Method 文字）**整理，方法机制与实验设置均来自官方描述，**逐项数值结果待 PDF 可访问后补充**。

---

## 🔗 相关阅读

- **同模块·力/负载自适应**：[FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation](https://arxiv.org/abs/2505.06776) · [HAFO 力自适应控制框架](https://arxiv.org/abs/2511.20275) · [SteadyTray（残差 RL 托盘平衡）](../SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid.html)；
- **冻结主干 + 残差/适配**：[General Humanoid WBC via Pretraining and Fast Adaptation (FAST)](../General_Humanoid_Whole-Body_Control_via_Pretraining_and_Fast_Adaptation/General_Humanoid_Whole-Body_Control_via_Pretraining_and_Fast_Adaptation.html) · ResMimic（残差学习）；
- **上下文编码 / 隐变量适配**：基于历史的 RMA / 特权信息蒸馏一类方法（动力学自适应的经典范式）。
