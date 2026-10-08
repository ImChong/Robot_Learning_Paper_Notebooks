---
layout: paper
title: "CHIP: Adaptive Compliance for Humanoid Control through Hindsight Perturbation"
zhname: "CHIP：用「事后扰动」实现人形控制的自适应柔顺"
category: "Loco-Manipulation and WBC"
arxiv: "2512.14689"
---

# CHIP: Adaptive Compliance for Humanoid Control through Hindsight Perturbation
**CHIP：用「事后扰动」实现人形控制的自适应柔顺**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 柔顺控制 · 可控刚度 · 即插即用 · 发力操作 · 动作跟踪
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月 |
| arXiv | [2512.14689](https://arxiv.org/abs/2512.14689) · [PDF](https://arxiv.org/pdf/2512.14689) · [HTML](https://arxiv.org/html/2512.14689v1) |
| 作者 | Sirui Chen、Zi-ang Cao、Zhengyi Luo、Fernando Castañeda、Chenran Li、Tingwu Wang、Ye Yuan、Linxi "Jim" Fan、C. Karen Liu、Yuke Zhu（Stanford / NVIDIA 等） |
| 主题 | cs.RO · 柔顺控制 / 发力操作 / 动作跟踪 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形已能做后空翻、跑、爬等**敏捷运动**，但做**发力操作**（搬物、擦拭、推车）仍难。CHIP（adaptive **C**ompliance **H**umanoid control through h**I**ndsight **P**erturbation）是一个**即插即用模块**，让控制器获得**可控的末端执行器刚度（柔顺）**，同时**保住对动态参考动作的敏捷跟踪**。它**易实现**，且**既不需要数据增强、也不需要额外奖励调参**。基于一个**事后扰动（hindsight perturbation）**的思路，用 CHIP 训出的**通用动作跟踪控制器**能完成多种**需要变刚度**的发力操作：多机器人协作、**擦拭、箱体递送、开门**等，在保持动态跟踪能力的同时实现可控柔顺。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Compliance | 柔顺，末端对外力可顺应（低刚度）或抵抗（高刚度） |
| Stiffness | 刚度，末端抵抗位移的程度 |
| Hindsight Perturbation | 事后扰动，用回溯的扰动信息推断/标注柔顺行为 |
| Plug-and-Play | 即插即用，可挂到现有跟踪控制器上 |
| Forceful Manipulation | 发力操作，需要施加可观接触力的任务 |
| Motion Tracking | 动作跟踪，复现动态参考运动 |

---

## ❓ 论文要解决什么问题？

敏捷运动已较成熟，但**发力操作**需要**可控柔顺**：
- **太硬**：接触瞬间易冲击、不安全、易脱离；
- **太软**：发不出力、跟不住动态参考。

且现有做法常需**繁琐的数据增强或奖励调参**才能获得柔顺。CHIP 想要：**简单、即插即用**地给跟踪控制器加上**可控末端刚度**，又**不牺牲敏捷跟踪**。

---

## 🔧 方法详解

### 1. 事后扰动（Hindsight Perturbation）
核心机制是用**事后扰动**来塑造柔顺：通过对交互中的扰动做回溯式利用，让控制器学到「在保持跟踪的前提下，如何按需调节末端刚度」，而**无需额外数据增强或奖励调参**。

### 2. 即插即用、保住敏捷跟踪
CHIP 作为**plug-and-play 模块**挂在动作跟踪控制器上：
- **可控末端刚度**：按任务需要在柔/刚之间调节；
- **保住敏捷**：仍能跟踪动态参考动作，不退化运动能力。

### 3. 任务与结果
用 CHIP 训出的**通用跟踪控制器**可完成多种**变刚度发力操作**：
- **多机器人协作、擦拭、箱体递送、开门**；
- 在保持动态跟踪的同时实现**可控柔顺**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    REF["🎞️ 动态参考动作"] --> CTRL
    CMD["🎚️ 期望末端刚度"] --> CTRL
    subgraph CTRL["🧩 跟踪控制器 + CHIP 模块"]
        HP["事后扰动塑造柔顺<br/>(无需数据增强/奖励调参)"]
    end
    CTRL --> OUT["🤖 可控柔顺 + 敏捷跟踪<br/>擦拭 / 箱体递送 / 开门 / 协作"]

    style CTRL fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **即插即用柔顺模块 CHIP**：给动作跟踪控制器加可控末端刚度；
2. **事后扰动机制**：无需数据增强、无需额外奖励调参，实现简单；
3. **柔顺 + 敏捷兼得**：变刚度的同时保住动态跟踪能力；
4. **多发力任务验证**：擦拭、箱体递送、开门、多机器人协作。

---

## 🤖 对人形机器人学习的启发

- **柔顺是发力操作的关键缺口**：纯位置跟踪在接触任务上易冲击/脱离，可控刚度是刚需；
- **「即插即用 + 免调参」极具工程价值**：能直接嫁接到既有跟踪栈，落地成本低；
- **与 SoftMimic、GentleHumanoid 等柔顺/接触工作同向**，共同把人形从「会动」推向「会发力且温柔」；
- **事后/回溯式信息**是低成本获得监督的巧思，可迁移到其它需要隐性标注的控制问题。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.14689](https://arxiv.org/abs/2512.14689) | 论文正文（事后扰动、柔顺模块、发力操作实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·柔顺 / 力自适应**：[SplitAdapter（负载自适应）](../SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation.html) · [HAIC（动力学感知物体交互）](../HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model.html)；
- **发力 / 接触操作**：HAFO、FALCON 等力自适应 loco-manip 工作。
