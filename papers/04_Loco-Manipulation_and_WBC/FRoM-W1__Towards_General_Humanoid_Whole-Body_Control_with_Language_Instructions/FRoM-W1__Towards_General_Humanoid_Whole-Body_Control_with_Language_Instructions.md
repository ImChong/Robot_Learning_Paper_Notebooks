---
layout: paper
title: "FRoM-W1: Towards General Humanoid Whole-Body Control with Language Instructions"
zhname: "FRoM-W1：面向语言指令的通用人形全身控制开源框架"
category: "Loco-Manipulation and WBC"
arxiv: "2601.12799"
---

# FRoM-W1: Towards General Humanoid Whole-Body Control with Language Instructions
**一个开源的「自然语言 → 人形全身动作」两段式框架：H-GPT 用思维链从语言生成人体动作、H-ACT 把动作重定向到机器人并用 RL 微调稳定执行，再配 sim-to-real 部署模块；在 Unitree H1/G1 上验证，并在 HumanML3D-X 基准上刷新动作生成表现**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 语言驱动 · 动作生成 · 思维链 · RL 微调 · 开源框架 · Unitree H1/G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 1 月 |
| arXiv | [2601.12799](https://arxiv.org/abs/2601.12799) · [PDF](https://arxiv.org/pdf/2601.12799) · [HTML](https://arxiv.org/html/2601.12799v1) |
| 作者 | Peng Li、Zihan Zhuang、Yangfan Gao、Yi Dong 等（复旦 NLP / 视觉团队为主，18 位作者） |
| 主题 | cs.RO · 语言驱动全身控制 / 动作生成 / sim-to-real |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形机器人能打招呼、跳舞甚至后空翻，但这些动作往往是**硬编码或专门训练**的，**通用性差**。FRoM-W1 提出一个**开源框架**，用**自然语言**驱动**通用人形全身动作控制**，分两段：① **H-GPT**——在海量人体数据上训练的**语言驱动人体动作生成**模型，用**思维链（Chain-of-Thought）**推理把语言变成人体动作；② **H-ACT**——把生成的人体动作**重定向到机器人**，并用**强化学习微调**保证物理上稳定可执行；再加一个 **sim-to-real 部署模块**落到真机。在 **Unitree H1 与 G1** 上验证，在 **HumanML3D-X** 动作生成基准上取得更优表现，跟踪精度与任务成功率均有一致提升。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| H-GPT | 本文的语言→人体动作生成大模型 |
| H-ACT | 本文的动作控制器（重定向 + RL 微调） |
| CoT | Chain-of-Thought，思维链推理 |
| Retargeting | 运动重定向，把人体动作迁到机器人 |
| Sim-to-Real | 仿真到真机迁移 |
| HumanML3D-X | 本文使用/扩展的人体动作生成基准 |

---

## ❓ 论文要解决什么问题？

当前人形「炫技」动作（打招呼、跳舞、后空翻）大多**硬编码**或**逐技能专门训练**：
- **不通用**：换个指令/动作就要重做；
- **缺语言接口**：难以用自然语言灵活下达任意全身动作。

FRoM-W1 想要：用**自然语言**作为统一接口，端到端地把「一句话」变成**机器人可稳定执行的全身动作**，并**开源**整套框架以推动通用化。

---

## 🔧 方法详解

### 1. H-GPT：语言 → 人体动作（思维链）
在**海量人体动作数据**上训练的生成模型，用**思维链推理**把自然语言指令解析、规划并生成对应的**人体动作序列**。CoT 有助于把复杂/复合指令分解为可执行的动作组合。

### 2. H-ACT：人体动作 → 机器人执行（RL 微调）
把 H-GPT 生成的人体动作**重定向到机器人形态**，再用**强化学习微调**控制器，使重定向后的动作在物理上**稳定、可跟踪**——弥合「运动学动作」与「动力学可执行」之间的鸿沟。

### 3. Sim-to-Real 部署模块
专门的部署模块把策略迁到真机，处理仿真与现实的差异，落地到 Unitree H1/G1。

### 4. 评测
- **真机**：Unitree **H1**、**G1**；
- **基准**：**HumanML3D-X** 动作生成基准；
- **结论**：动作生成表现更优，**跟踪精度**与**任务成功率**一致提升。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    L["📝 自然语言指令"] --> HGPT
    subgraph HGPT["① H-GPT（思维链）"]
        G["语言→人体动作生成"]
    end
    HGPT --> HACT
    subgraph HACT["② H-ACT"]
        R["重定向到机器人"]
        FT["RL 微调稳定执行"]
        R --> FT
    end
    HACT --> S2R["③ Sim-to-Real 部署"]
    S2R --> OUT["🤖 Unitree H1/G1<br/>HumanML3D-X 更优<br/>跟踪精度/成功率↑"]

    style HGPT fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style HACT fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **开源的语言驱动通用全身控制框架**：把「自然语言 → 人形全身动作」端到端打通；
2. **H-GPT（CoT 动作生成）**：海量人体数据 + 思维链，把语言变成人体动作；
3. **H-ACT（重定向 + RL 微调）**：保证生成动作物理可执行、稳定可跟踪；
4. **真机 + 基准双验证**：Unitree H1/G1 部署，HumanML3D-X 上动作生成与下游执行均提升。

---

## 🤖 对人形机器人学习的启发

- **「生成 + 控制」两段式是语言驱动全身控制的主流骨架**：与 SafeFlow、ULTRA、TextOp、UniAct 等同属一条路线，差异在生成器与稳定化手段；
- **思维链进入动作生成**：把 LLM 的推理能力用于动作规划，利于复合/长指令；
- **RL 微调治「重定向后不可执行」**：运动学生成 + 动力学微调，是把动作落到真机的关键一环；
- **开源价值**：通用全身控制框架的开源能加速社区在语言接口上的统一。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2601.12799](https://arxiv.org/abs/2601.12799) | 论文正文（H-GPT / H-ACT / 部署、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值与消融以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·语言/多模态驱动全身控制**：[ULTRA（统一多模态控制）](../ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation.html) · [SafeFlow（整流流 + 安全门控）](../SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow.html) · [UniAct（统一动作生成与流式执行）](../UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots.html)；
- **动作生成基准**：本仓 14 人体动作板块（HumanML3D 等）。
