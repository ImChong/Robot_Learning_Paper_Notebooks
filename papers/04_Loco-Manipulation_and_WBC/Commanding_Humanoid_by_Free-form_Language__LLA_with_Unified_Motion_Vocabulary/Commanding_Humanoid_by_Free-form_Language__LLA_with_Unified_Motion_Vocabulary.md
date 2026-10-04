---
layout: paper
title: "Commanding Humanoid by Free-form Language: A Large Language Action Model with Unified Motion Vocabulary"
zhname: "Humanoid-LLA：用统一动作词表的大语言-动作模型以自由语言指挥人形"
category: "Loco-Manipulation and WBC"
arxiv: "2511.22963"
---

# Commanding Humanoid by Free-form Language: A Large Language Action Model with Unified Motion Vocabulary
**Humanoid-LLA：针对「成对语言-动作数据稀缺」与「物理不稳定」两大难题，学习一个统一的人-人形动作词表把语言语义与物理可控落地相连，并用两阶段微调（先有监督的动作思维链、再以物理反馈引导的强化学习）实现跨本体泛化，对新语言指令与多样动作生成都保持高物理保真**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 语言指挥 · 大语言-动作模型 · 统一动作词表 · 思维链 · 跨本体
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.22963](https://arxiv.org/abs/2511.22963) · [PDF](https://arxiv.org/pdf/2511.22963) · [HTML](https://arxiv.org/html/2511.22963v1) |
| 作者 | Zhirui Liu、Kaiyang Ji、Ke Yang、Yahao Fan、Jingyi Yu、Ye Shi、Jingya Wang（上科大等） |
| 主题 | cs.RO · 语言驱动控制 / 大语言-动作模型 / 跨本体 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 让人形听懂并执行**自由形式自然语言指令**，是迈向无缝人机交互与通用具身智能的关键一步。本文提出 **Humanoid-LLA**（Large Language Action Model），针对两大核心难题——**成对语言-动作数据稀缺**与**物理不稳定**——给出解法：通过**学习一个统一的人-人形动作词表（unified human-humanoid motion vocabulary）**，把**高层语言语义**与**物理可控的底层控制**连接起来；并采用一个**新颖的两阶段微调框架**：先做**有监督的动作思维链（motion Chain-of-Thought）学习**，再用**物理反馈引导的强化学习**精修。借助**跨本体（cross-embodiment）设计**实现泛化。结果：对**新语言指令**有更好泛化、生成**多样动作**且保持**高物理保真**，并在仿真与真实跨本体实验中验证。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| LLA | Large Language Action Model，大语言-动作模型 |
| Motion Vocabulary | 动作词表，统一表示人/人形动作的离散单元 |
| Motion CoT | 动作思维链，对动作做分步推理 |
| Cross-Embodiment | 跨本体，泛化到不同机器人形态 |
| Free-form Language | 自由形式语言，非模板化的自然指令 |
| Physical Feedback RL | 以物理反馈为奖励信号的强化学习 |

---

## ❓ 论文要解决什么问题？

用自由语言指挥人形面临两道坎：
- **数据稀缺**：高质量**成对的语言-动作**数据少；
- **物理不稳定**：语言生成的动作未必物理可执行/稳定。

论文要：用一个**统一动作词表**把语言与物理控制对齐，并通过训练让模型对**新指令泛化**且**物理保真**。

---

## 🔧 方法详解

### 1. 统一人-人形动作词表
学习一个**统一动作词表**，作为**语言语义**与**物理可控底层控制**之间的桥梁——把动作离散成可被语言模型操作、又能落到控制的单元，缓解模态鸿沟。

### 2. 两阶段微调
- **阶段一：有监督动作思维链**：用监督学习训模型对动作做**分步推理（CoT）**，把语言→动作的映射学扎实；
- **阶段二：物理反馈 RL**：以**物理反馈**为奖励信号做强化学习精修，提升**稳定性与物理保真**。

### 3. 跨本体设计
通过**cross-embodiment** 设计获得泛化，使模型可迁移到不同本体。

### 4. 评测
- **仿真 + 真实跨本体实验**；
- 对**新语言指令泛化**、生成**多样动作**、保持**高物理保真**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    L["📝 自由语言指令"] --> LLA
    subgraph LLA["🧠 Humanoid-LLA"]
        V["统一人-人形动作词表"]
        S1["①有监督动作思维链"]
        S2["②物理反馈 RL 精修"]
        V --> S1 --> S2
    end
    LLA --> OUT["🤖 跨本体执行<br/>新指令泛化 · 多样动作 · 物理保真"]

    style LLA fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **统一人-人形动作词表**：连接语言语义与物理可控控制，缓解数据稀缺与模态鸿沟；
2. **两阶段微调**：有监督动作思维链 + 物理反馈 RL，兼顾映射准确与物理稳定；
3. **跨本体泛化**：可迁移不同本体；
4. **强泛化 + 高保真**：对新语言指令泛化，生成多样且物理可信的动作。

---

## 🤖 对人形机器人学习的启发

- **离散动作词表是连接 LLM 与控制的关键接口**，与 UniAct 的 FSQ 码本异曲同工；
- **「监督 CoT + 物理反馈 RL」是语言-动作模型的稳健训练范式**：先学映射、再用物理拉回可执行；
- **跨本体设计**有助于把一套语言接口推广到不同人形；
- **与 FRoM-W1、ULTRA、SafeFlow、UniAct 同属语言/多模态驱动全身控制簇**，可横向对照生成器与稳定化手段。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.22963](https://arxiv.org/abs/2511.22963) | 论文正文（统一词表、两阶段微调、跨本体实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·语言/多模态驱动**：[FRoM-W1（语言指令通用全身控制）](../FRoM-W1__Towards_General_Humanoid_Whole-Body_Control_with_Language_Instructions/FRoM-W1__Towards_General_Humanoid_Whole-Body_Control_with_Language_Instructions.html) · [UniAct（FSQ 码本统一多模态）](../UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots.html) · [SENTINEL（端到端语言-动作）](../SENTINEL__A_Fully_End-to-End_Language-Action_Model_for_Humanoid_Whole_Body_Control/SENTINEL__A_Fully_End-to-End_Language-Action_Model_for_Humanoid_Whole_Body_Control.html)。
