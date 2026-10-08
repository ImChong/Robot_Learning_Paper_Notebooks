---
layout: paper
title: "SUGAR: A Scalable Human-Video-Driven Generalizable Humanoid Loco-Manipulation Learning Framework"
zhname: "SUGAR：基于人类视频的可扩展通用人形移动操作学习框架"
category: "Loco-Manipulation and WBC"
arxiv: "2605.20373"
---

# SUGAR: A Scalable Human-Video-Driven Generalizable Humanoid Loco-Manipulation Learning Framework
**SUGAR：基于人类视频的可扩展通用人形移动操作学习框架**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 人类视频驱动 · 接触先验 · 特权物理精修 · 分层自主策略 · 数据可扩展 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 5 月 |
| arXiv | [2605.20373](https://arxiv.org/abs/2605.20373) · [PDF](https://arxiv.org/pdf/2605.20373) · [HTML](https://arxiv.org/html/2605.20373v1) |
| 项目页 | [tianshuwu.github.io/sugar-humanoid](https://tianshuwu.github.io/sugar-humanoid/) |
| 代码 | [github.com/tianshuwu/SUGAR](https://github.com/tianshuwu/SUGAR)（上游标 🌟 已开源） |
| 作者 | Tianshu Wu、Xiangqi Kong、Yue Chen、Qize Yu、Hang Ye、Jia Li、Yizhou Wang、Hao Dong |
| 主题 | cs.RO · 人形移动操作 / 从人类视频学习 / 大规模数据 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块（上游标 🌟 开源）。

---

## 🎯 一句话总结

> 让人形机器人学会**通用的全身移动操作**，最大的瓶颈是数据：逐任务设计奖励太费人力、刚性复放参考运动不泛化、遥操作又难规模化。**人类视频**虽然多样，但从中推断的运动先验天生「不完美」——遮挡、接触伪影、重定向误差使其不能直接拿来学策略。SUGAR 的思路是搭一条**可扩展的数据驱动流水线**：① 全自动从无结构人类视频抽取**人-物运动轨迹 + 接触标签**等运动学交互先验；② 用**特权物理精修器**（统一 mimic 奖励 + 渐进状态池）把含噪先验转成**物理可行、高保真**的技能；③ 把精修技能**蒸馏**成由「指令生成器 + 指令跟踪器」组成的**分层自主策略**。推理阶段**不需要任务奖励工程、也不需要参考运动条件**，并且性能**随人类视频数据量清晰增长**，可零样本迁移真机、自主从失败中恢复、长时程稳定执行。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Loco-Manipulation | 移动操作，行走 + 操作一体的全身任务 |
| Interaction Prior | 交互先验，从视频抽取的人-物运动 / 接触线索 |
| Privileged Refiner | 特权精修器，训练时可用真值/特权信息把含噪先验磨成可行轨迹 |
| Mimic Reward | 模仿奖励，鼓励策略复现参考运动 |
| Progressive State Pool | 渐进状态池，逐步扩充初始/参考状态分布以稳健训练 |
| Distillation | 蒸馏，把（特权）技能压进可部署的学生策略 |
| Command Generator / Tracker | 指令生成器 / 跟踪器，分层策略的高层意图与低层执行 |

---

## ❓ 论文要解决什么问题？

要在真实世界里造出能做**通用全身移动操作**的人形机器人，长期受困于「**怎么拿到可规模化、可泛化的训练数据**」：

- **逐任务奖励工程**：为每个任务手写 reward 既费力又难复用；
- **刚性复放参考运动**：把动作硬性重放，换个物体/场景就失效，不泛化；
- **遥操作采集**：质量高但**成本高、难规模化**。

人类视频是天然的大规模多样行为来源，但**直接用不了**：从视频推断的运动先验**本身不完美**——**遮挡、接触伪影、重定向误差**会让轨迹在物理上不可执行，直接拿去做策略学习会被噪声带偏。

SUGAR 的目标：**把「人类视频 → 可部署人形技能」这条链路自动化、规模化**，并且在**推理时不依赖任务奖励、也不依赖参考运动条件**，让技能质量能**随数据量增长**。

---

## 🔧 方法详解

SUGAR 是一条三阶段流水线，核心是把「不完美的视频先验」逐级**净化 → 物理可行化 → 可部署化**。

### 1. 阶段一：从人类视频抽取交互先验（全自动）
一条**完全自动**的管线，从**无结构人类视频**中提取**运动学交互先验**：包括**人-物运动轨迹**与**接触标签（contact labels）**。这一步把杂乱视频转成结构化、带接触语义的运动线索，但此时仍是「含噪、可能物理不可行」的。

### 2. 阶段二：特权物理精修（把含噪先验磨成可行技能）
一个**基于物理的特权精修器（privileged physics-based refiner）**，用两件法宝把不完美先验转成**物理可行、高保真**的技能：
- **统一 mimic 奖励（unified mimic reward）**：用同一套模仿目标驱动策略复现交互先验，避免逐任务调奖励；
- **渐进状态池（progressive state pool）**：逐步扩充初始/参考状态分布，让精修在更广状态上稳健收敛。

精修后的技能已经「**在物理仿真里真的能做出来**」，消化掉了遮挡/接触/重定向带来的不一致。

### 3. 阶段三：蒸馏成分层自主策略（可部署）
把精修技能**蒸馏**进一个**分层自主策略（hierarchical autonomous policy）**：
- **指令生成器（command generator）**：产生高层意图/子目标；
- **指令跟踪器（command tracker）**：执行底层全身控制。

这样推理时**不再需要参考运动作为条件输入**，形成闭环自主执行。

### 4. 评测与结果
- **设置**：在**仿真**与**真实人形硬件**上评测 **6 个代表性移动操作任务**；
- **对比**：显著优于**参考-跟踪（reference-tracking）基线**；
- **可扩展性**：性能**随人类视频数据量清晰增长**——这是「数据驱动」主张的关键证据；
- **真机**：实现**零样本真机迁移**，闭环执行可靠，具备**自主失败恢复**与**长时程稳定**（含外部扰动下）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    V["🎥 无结构人类视频"] --> P1
    subgraph S1["① 交互先验抽取（全自动）"]
        P1["人-物运动轨迹<br/>+ 接触标签"]
    end
    subgraph S2["② 特权物理精修"]
        R["统一 mimic 奖励<br/>+ 渐进状态池"]
        SK["物理可行高保真技能"]
        R --> SK
    end
    subgraph S3["③ 蒸馏：分层自主策略"]
        CG["指令生成器"]
        CT["指令跟踪器"]
        CG --> CT
    end
    P1 --> R
    SK --> CG
    CT --> OUT["🤖 6 任务 · 零样本上真机<br/>性能随数据量增长<br/>自主失败恢复 · 长时程稳定"]

    style S1 fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style S2 fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style S3 fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **可扩展的人类视频 → 人形技能流水线**：无需逐任务奖励工程、无需推理期参考运动条件，把大规模人类视频转成可部署技能；
2. **特权物理精修配方**：统一 mimic 奖励 + 渐进状态池，把遮挡/接触/重定向导致的含噪先验「磨」成物理可行高保真技能；
3. **分层自主策略蒸馏**：指令生成器 + 指令跟踪器，形成闭环自主执行，支持失败恢复与长时程；
4. **数据可扩展性实证**：6 任务、仿真 + 真机，性能随视频数据量清晰增长，零样本真机迁移。

---

## 🤖 对人形机器人学习的启发

- **「先净化、再物理可行化、最后可部署」是处理弱标注人类数据的稳健范式**：与 SUGAR 同源的还有 ZeroWBC、EgoHumanoid 等「从第一/第三人称人类视频学全身控制」的工作，都在和「先验不完美」搏斗；
- **特权精修是把含噪先验上物理的关键中间层**：相比直接 BC，先在仿真里把动作磨可行，再蒸馏，能显著降低真机风险；
- **数据可扩展曲线本身就是卖点**：当性能随数据量单调提升，说明方法吃得下「更多视频」，这正是规模化路线最想要的性质；
- **接触标签是 loco-manip 的硬通货**：显式建模接触有助于搬运/操作类任务，呼应 SteadyTray、HAIC 等对接触/力的重视。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2605.20373](https://arxiv.org/abs/2605.20373) | 论文正文（三阶段流水线、精修与蒸馏细节、实验） |
| [项目页 sugar-humanoid](https://tianshuwu.github.io/sugar-humanoid/) | 概述、方法图、真机/仿真视频 |
| [代码 github.com/tianshuwu/SUGAR](https://github.com/tianshuwu/SUGAR) | 官方开源实现 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与项目页信息整理，方法机制与实验设置如上；**逐项数值结果以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·从人类视频学全身控制**：[ZeroWBC（从人类第一视角视频直接学）](../ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video/ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video.html) · [EgoHumanoid（in-the-wild 机器人无关的第一视角采集）](../EgoHumanoid__Unlocking_In-the-Wild_Loco-Manipulation_with_Robot-Free_Egocentric_/EgoHumanoid__Unlocking_In-the-Wild_Loco-Manipulation_with_Robot-Free_Egocentric_.html)；
- **接触/物体交互**：[SteadyTray（残差 RL 托盘平衡）](../SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid.html) · [HAIC（动力学感知世界模型的敏捷物体交互）](../HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model.html)；
- **特权信息 / 蒸馏**：RMA、特权教师-学生蒸馏一类经典 sim-to-real 范式。
