---
layout: paper
title: "Humanoid Hanoi: Investigating Shared Whole-Body Control for Skill-Based Box Rearrangement"
zhname: "Humanoid Hanoi：面向技能化箱体重排的共享全身控制研究"
category: "Loco-Manipulation and WBC"
arxiv: "2602.13850"
---

# Humanoid Hanoi: Investigating Shared Whole-Body Control for Skill-Based Box Rearrangement
**研究「技能化」的人形搬箱重排：在任务层把可复用技能串成长时程，所有技能都经由一个「共享、任务无关的全身控制器（WBC）」执行，提供一致的闭环组合接口；针对「直接复用预训练 WBC 会在长时程上掉鲁棒性」的问题，用一套简单的数据聚合（把闭环技能执行 + 域随机化的 rollout 回灌训练）来修复**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 技能组合 · 共享 WBC · 长时程 · 数据聚合（DAgger 式）· Digit V3
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 2 月 |
| arXiv | [2602.13850](https://arxiv.org/abs/2602.13850) · [PDF](https://arxiv.org/pdf/2602.13850) · [HTML](https://arxiv.org/html/2602.13850v1) |
| 作者 | Minku Kim、Kuan-Chia Chen、Aayam Shrestha、Li Fuxin、Stefan Lee、Alan Fern |
| 机构 | Oregon State University（俄勒冈州立大学，作者群） |
| 主题 | cs.RO · 技能化全身控制 / 长时程重排 / 共享控制器 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 研究一个**技能化（skill-based）**的人形**搬箱重排**框架：通过在**任务层把可复用技能串接**来支持**长时程**执行。架构上，**所有技能都经由一个「共享、任务无关的全身控制器（shared, task-agnostic WBC）」**执行——这为技能组合提供了**一致的闭环接口**，区别于「每个技能各配一个低层控制器」的非共享设计。作者发现：**直接朴素复用同一个预训练 WBC 会在长时程上削弱鲁棒性**，因为新技能及其组合会引入**偏移的状态与指令分布**。他们用一个**简单的数据聚合（data aggregation）**过程来解决：把**闭环技能执行**在**域随机化**下的 rollout **回灌**到共享 WBC 的训练里。为评估方法，他们提出 **Humanoid Hanoi** ——一个**汉诺塔式**的长时程箱体重排基准，并在**仿真**与 **Digit V3** 人形机器人上给出结果，展示了**完全自主**的长时程重排，并量化了共享 WBC 相对非共享基线的收益。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| WBC | Whole-Body Controller，全身控制器 |
| Shared / Task-Agnostic | 共享 / 任务无关，一个控制器服务所有技能 |
| Skill Composition | 技能组合，把可复用技能按任务串接 |
| Long-Horizon | 长时程，需多步连续执行的任务 |
| Data Aggregation | 数据聚合（DAgger 式），把执行分布上的新数据回灌再训 |
| Domain Randomization | 域随机化，训练时随机化物理/环境参数以增强鲁棒 |
| Distribution Shift | 分布偏移，部署分布与训练分布不一致 |

---

## ❓ 论文要解决什么问题？

人形机器人做**长时程箱体重排**（搬来搬去、堆叠）需要把多个技能**连续串接**执行。一个自然的设计是：**让所有技能共用一个全身控制器**，从而获得统一的闭环组合接口。但这带来一个核心问题：

- **朴素复用预训练 WBC 会在长时程上掉鲁棒性**：当新技能与它们的**组合**被串起来时，会产生**状态分布**与**指令分布**的**偏移**，使原本好用的 WBC 逐步失稳。

论文要回答：**共享 WBC 这条路到底好不好？怎样让它在长时程技能组合下保持鲁棒？**

---

## 🔧 方法详解

### 1. 架构：共享、任务无关的 WBC 作为统一接口
所有技能都**经由同一个任务无关的 WBC** 执行：
- **优点**：为技能组合提供**一致的闭环接口**，便于把技能在任务层自由串接；
- **对照**：非共享设计为每个技能单独配低层控制器，接口不统一、组合更脆。

### 2. 诊断：组合诱发的分布偏移
作者明确指出**朴素共享**的失效原因：新技能及其组合会让 WBC 面对**没见过的状态/指令分布**，长时程下误差累积、鲁棒性下降。

### 3. 解法：闭环 rollout 的数据聚合（DAgger 式）
用一个**简单的数据聚合**过程修复：
- 在**域随机化**下采集**闭环技能执行**的 rollout（即 WBC 真正被技能组合驱动时所经历的状态/指令）；
- 把这些 rollout **回灌**进共享 WBC 的训练，使其覆盖真实组合分布。

这本质是 **DAgger 式**的「在执行分布上补数据」思路，专门对症「组合诱发的分布偏移」。

### 4. 基准与评测：Humanoid Hanoi
- 提出 **Humanoid Hanoi**：**汉诺塔式**长时程箱体重排基准；
- 在**仿真**与 **Digit V3** 真机上评测；
- 展示**完全自主**的长时程重排，并**量化共享 WBC 相对非共享基线的收益**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    TASK["🗼 任务层：技能序列<br/>(汉诺塔式箱体重排)"] --> WBC
    subgraph WBC["🔁 共享 · 任务无关 WBC"]
        C["统一闭环接口<br/>服务所有技能"]
    end
    WBC --> ROLL["闭环 rollout<br/>(域随机化)"]
    ROLL -. 数据聚合回灌 .-> WBC
    WBC --> OUT["🤖 Digit V3 / 仿真<br/>完全自主长时程重排<br/>共享 > 非共享基线"]

    style WBC fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **共享、任务无关 WBC 的系统性研究**：作为技能组合的一致闭环接口，对照非共享设计；
2. **指明朴素复用的失效机理**：长时程技能组合引入状态/指令分布偏移，侵蚀鲁棒性；
3. **简单有效的数据聚合修复**：把域随机化下的闭环执行 rollout 回灌训练（DAgger 式）；
4. **Humanoid Hanoi 基准**：汉诺塔式长时程重排任务，仿真 + Digit V3 实测，量化共享 WBC 收益。

---

## 🤖 对人形机器人学习的启发

- **「一个 WBC 服务所有技能」是可扩展技能系统的关键接口设计**：统一闭环接口让任务层能像搭积木一样组合技能；
- **长时程的敌人是分布偏移**：单技能好用 ≠ 串起来好用，组合分布必须被显式覆盖；
- **DAgger 式回灌依旧好使**：在执行分布上补数据这一经典思路，对人形长时程组合同样有效，工程代价低；
- **基准化很重要**：Humanoid Hanoi 这类「可量化长时程」的任务，有助于公平比较共享/非共享与不同数据策略，呼应本仓 11 仿真与基准板块。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2602.13850](https://arxiv.org/abs/2602.13850) | 论文正文（共享 WBC、数据聚合、Humanoid Hanoi 基准、Digit V3 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值结果以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·长时程 / 技能组合**：[LessMimic（统一距离场表征的长时程交互）](../LessMimic_Long-Horizon_Humanoid_Interaction_with_Unified_Distance_Field_Representations/LessMimic_Long-Horizon_Humanoid_Interaction_with_Unified_Distance_Field_Representations.html) · [HiWET（长时程世界系末端跟踪）](../HiWET__Hierarchical_World-Frame_End-Effector_Tracking_for_Long-Horizon_Humanoid_Loco-Manipulation/HiWET__Hierarchical_World-Frame_End-Effector_Tracking_for_Long-Horizon_Humanoid_Loco-Manipulation.html)；
- **通用 / 共享控制器**：[General Humanoid WBC via Pretraining and Fast Adaptation](../General_Humanoid_Whole-Body_Control_via_Pretraining_and_Fast_Adaptation/General_Humanoid_Whole-Body_Control_via_Pretraining_and_Fast_Adaptation.html)。
