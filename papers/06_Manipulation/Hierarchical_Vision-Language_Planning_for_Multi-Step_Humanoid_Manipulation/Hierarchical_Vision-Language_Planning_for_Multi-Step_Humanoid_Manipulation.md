---
layout: paper
title: "Hierarchical Vision-Language Planning for Multi-Step Humanoid Manipulation"
zhname: "面向多步人形操作的分层视觉-语言规划"
category: "Manipulation"
arxiv: "2506.22827"
---

# Hierarchical Vision-Language Planning for Multi-Step Humanoid Manipulation
**面向工业/家庭里可靠执行复杂多步操作的三层规划-控制框架：底层是基于 RL 的全身动作目标跟踪控制器，中层是模仿学习训练、为任务各步产生动作目标的技能策略，高层是用预训练 VLM 决定执行哪个技能并实时监控其完成的视觉-语言规划模块；在 Unitree G1 上做非抓握式取放任务、40+ 次真机试验，完整序列成功率 73%**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 分层规划 · VLM 监控 · 技能策略 · 全身控制 · Unitree G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 6 月 |
| arXiv | [2506.22827](https://arxiv.org/abs/2506.22827) · [PDF](https://arxiv.org/pdf/2506.22827) · [HTML](https://arxiv.org/html/2506.22827v1) |
| 作者 | André Schakkal、Ben Zandonati、Zhutian Yang、Navid Azizan（MIT） |
| 主题 | cs.RO · 分层规划 / 视觉-语言 / 多步操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 让人形可靠执行**复杂多步操作**对工业/家庭部署很关键。本文提出一个**分层规划与控制框架**，含三层：① **底层**——基于 **RL** 的控制器，负责**跟踪全身动作目标**；② **中层**——一组用**模仿学习**训练的**技能策略**，为任务各步产生**动作目标**；③ **高层**——一个**视觉-语言规划模块**，用**预训练 VLM** 决定**执行哪个技能**并**实时监控其完成**。在 **Unitree G1** 人形上做**非抓握式（non-prehensile）取放**任务、**40+ 次**真机试验，**完整序列成功率 73%**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Hierarchical | 分层（高/中/低三层） |
| VLM | Vision-Language Model |
| Skill Policy | 技能策略（中层，IL 训练） |
| Whole-Body Tracking | 全身动作目标跟踪（底层 RL） |
| Non-prehensile | 非抓握式（推/拨等） |
| Real-time Monitoring | 实时监控技能完成 |

---

## ❓ 论文要解决什么问题？

人形**多步操作**要可靠：
- 单层端到端难覆盖**长序列**；
- 需要**高层决策 + 中层技能 + 底层控制**协同；
- 还要**实时知道某步是否完成**。

论文要：一个**分层、可监控**的多步人形操作框架。

---

## 🔧 方法详解

### 1. 三层架构
| 层 | 内容 |
|---|---|
| 底层 | **RL 控制器**跟踪全身动作目标 |
| 中层 | **IL 技能策略**为各步产生动作目标 |
| 高层 | **VLM 规划**：选技能 + 实时监控完成 |

### 2. VLM 高层：选技能 + 监控
用**预训练 VLM** 决定**执行哪个技能**，并**实时监控**其**完成情况**——把"决策 + 进度感知"交给 VLM。

### 3. 评测
- **Unitree G1**、**非抓握式取放**；
- **40+ 真机试验**；
- 完整序列**成功率 73%**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    HI["高层：VLM 规划<br/>选技能 + 实时监控完成"] --> MID
    MID["中层：IL 技能策略<br/>产生各步动作目标"] --> LOW
    LOW["底层：RL 控制器<br/>跟踪全身动作目标"] --> OUT["🤖 Unitree G1 非抓握取放<br/>40+ 试验 · 序列成功率 73%"]

    style HI fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style MID fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style LOW fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **三层规划-控制框架**：VLM 规划 + IL 技能 + RL 全身控制；
2. **VLM 高层选技能 + 实时监控完成**；
3. **多步可靠执行**：面向工业/家庭长序列任务；
4. **真机验证**：G1 非抓握取放，序列成功率 73%。

---

## 🤖 对人形机器人学习的启发

- **分层是多步长序列任务的可靠之道**：高层决策、中层技能、底层控制各司其职；
- **VLM 实时监控"某步是否完成"**是闭环关键，避免盲目推进；
- **非抓握操作**（推/拨）拓展了人形操作类型；
- 与 Proprio-MLLM、BiBo 等 VLM 规划工作互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2506.22827](https://arxiv.org/abs/2506.22827) | 论文正文（三层框架、VLM 监控、G1 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（73%）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·VLM/规划**：[本体感受感知具身规划](../Towards_Proprioception-Aware_Embodied_Planning_for_Dual-Arm_Humanoid_Robots/Towards_Proprioception-Aware_Embodied_Planning_for_Dual-Arm_Humanoid_Robots.html) · [给 GPT-4 一具人形身体·BiBo](../Endowing_GPT-4_with_a_Humanoid_Body__Bridge_Between_VLMs_and_the_Physical_World/Endowing_GPT-4_with_a_Humanoid_Body__Bridge_Between_VLMs_and_the_Physical_World.html)。
