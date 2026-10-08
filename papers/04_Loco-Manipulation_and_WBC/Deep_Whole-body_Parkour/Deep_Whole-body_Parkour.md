---
layout: paper
title: "Deep Whole-body Parkour"
zhname: "Deep Whole-body Parkour：感知式通用全身运动控制"
category: "Loco-Manipulation and WBC"
arxiv: "2601.07701"
---

# Deep Whole-body Parkour
**Deep Whole-body Parkour：感知式通用全身运动控制**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 感知式全身控制 · 动作跟踪 · 多接触 · 高动态 · 跑酷
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 1 月 |
| arXiv | [2601.07701](https://arxiv.org/abs/2601.07701) · [PDF](https://arxiv.org/pdf/2601.07701) · [HTML](https://arxiv.org/html/2601.07701v1) |
| 作者 | Ziwen Zhuang、Shaoting Zhu、Mengjie Zhao、Hang Zhao |
| 主题 | cs.RO · 感知式全身控制 / 动作跟踪 / 跑酷 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 当前人形控制大体分两派：**感知式行走（perceptive locomotion）**——能应对地形但**只限于踏步类步态**；**通用动作跟踪（general motion tracking）**——能复现复杂技能但**忽略环境能力**。本文把两派**合一**，实现**感知式通用动作控制**：把**外感知（exteroceptive sensing）并入全身动作跟踪**，让人形能在**不平地形**上做**高动态、非行走类**任务。通过训练**单一策略**在多种地形特征上完成多种**不同动作**，验证「把感知并入控制回路」的**非平凡收益**。结果显示该框架能在非结构地形上做出**鲁棒、高动态的多接触动作**（如**腾跃 vaulting、翻滚 dive-rolling**），把机器人的**可通行性**远远拓展到「不止走和跑」。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Perceptive Locomotion | 感知式行走，看地形但限于踏步步态 |
| Motion Tracking | 动作跟踪，复现参考运动/技能 |
| Exteroception | 外感知，对环境（地形）的感知 |
| Multi-Contact | 多接触，手/脚等多点与环境接触 |
| Vaulting / Dive-rolling | 腾跃 / 鱼跃翻滚等高动态动作 |

---

## ❓ 论文要解决什么问题？

两条主流路线各缺一半：
- **感知式行走**：会看地形，但**只会踏步**类动作；
- **通用动作跟踪**：会复杂技能，但**不看环境**、无法利用/适应地形。

要做真正的「**在复杂地形上做复杂全身技能**」，必须把**感知**与**动作跟踪**统一进同一控制回路。

---

## 🔧 方法详解

### 1. 把外感知并入全身动作跟踪
核心是将**外感知（地形信息）整合进 whole-body motion tracking**：跟踪不再「闭眼复现参考」，而是**依据地形**调整全身动作，从而能在不平地形上执行非行走类技能。

### 2. 单一策略、多动作、多地形
训练**一个策略**覆盖**多种不同动作**与**多样地形特征**，证明把感知放进控制回路带来的**非平凡收益**——既复用了动作跟踪的技能表达力，又获得地形适应力。

### 3. 高动态多接触结果
框架支持**鲁棒、高动态的多接触动作**，如**腾跃**、**鱼跃翻滚**，在**非结构地形**上显著拓展可通行性，超越简单走/跑。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    REF["🎞️ 参考技能/动作"] --> POL
    EXT["📷 外感知（地形）"] --> POL
    PRO["📟 本体感受"] --> POL
    subgraph POL["🧠 感知式全身动作跟踪（单策略）"]
        M["按地形调整全身动作"]
    end
    POL --> OUT["🤖 不平地形上的高动态多接触<br/>腾跃 / 翻滚 / 非行走技能"]

    style POL fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **统一两派**：把感知式行走与通用动作跟踪合为「感知式通用动作控制」；
2. **感知入控制回路**：外感知并入全身动作跟踪，单策略覆盖多动作多地形；
3. **高动态多接触**：在非结构地形上实现腾跃、翻滚等技能；
4. **拓展可通行性**：把人形能力从走/跑扩展到复杂全身跑酷。

---

## 🤖 对人形机器人学习的启发

- **「动作跟踪 + 感知」是表达力与适应力的乘法**：跟踪给技能、感知给地形，合一才能在野外做复杂技能；
- **单策略多技能多地形**降低部署碎片化，是通用控制的方向；
- **与 Hiking in the Wild 互补**：同作者群，一个侧重稳健行走、一个侧重高动态技能，共同推进「感知式运动」；
- **多接触是人形跑酷的难点也是看点**，对全身协调与 sim-to-real 都极具区分度。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2601.07701](https://arxiv.org/abs/2601.07701) | 论文正文（感知并入跟踪、多接触跑酷实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·感知式跑酷 / 高动态**：[Hiking in the Wild（可扩展感知式跑酷）](../Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids.html) · [OmniXtreme（高动态控制通用性）](../OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control/OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control.html) · [Perceptive Humanoid Parkour](../Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.html)。
