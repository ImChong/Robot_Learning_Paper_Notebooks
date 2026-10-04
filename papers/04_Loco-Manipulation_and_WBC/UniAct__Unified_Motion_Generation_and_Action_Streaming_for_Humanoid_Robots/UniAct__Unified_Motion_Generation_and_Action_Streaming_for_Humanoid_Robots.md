---
layout: paper
title: "UniAct: Unified Motion Generation and Action Streaming for Humanoid Robots"
zhname: "UniAct：人形机器人的统一动作生成与流式执行"
category: "Loco-Manipulation and WBC"
arxiv: "2512.24321"
---

# UniAct: Unified Motion Generation and Action Streaming for Humanoid Robots
**两段式框架：把微调的多模态大模型（MLLM）与因果流式管线结合，让人形以亚 500 ms 延迟执行多模态指令（语言/音乐/轨迹）；用 FSQ 共享离散码本统一各模态输入，既做跨模态对齐、又把动作约束在物理可行流形上，零样本跟踪不完美参考动作成功率提升 19%，并在 20 小时 UniMoCap 基准上验证**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 多模态指令 · MLLM · 流式执行 · FSQ 码本 · 低延迟
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月 |
| arXiv | [2512.24321](https://arxiv.org/abs/2512.24321) · [PDF](https://arxiv.org/pdf/2512.24321) · [HTML](https://arxiv.org/html/2512.24321v1) |
| 作者 | Nan Jiang、Zimo He、Wanhe Yu、Lexi Pang、Yunhao Li、Hongjie Li、Jieming Cui、Yuhan Li、Yizhou Wang、Yixin Zhu、Siyuan Huang（北大 / BIGAI 等） |
| 主题 | cs.RO · 多模态指令 / 动作生成 / 流式控制 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 通用人形要能**像人一样灵活地跟随多模态指令**，但「**高层多模态感知**」到「**全身执行**」之间仍是瓶颈：现有方法难把**语言、音乐、轨迹**等异构指令转成**稳定、实时**的动作。UniAct 提出**两段式框架**，把**微调的多模态大模型（MLLM）**与**因果流式管线（causal streaming pipeline）**结合，让人形以**亚 500 ms 延迟**执行多模态指令。通过 **FSQ（有限标量量化）共享离散码本**统一各模态输入，既保证**跨模态对齐**，又把动作**约束在物理可行流形**上。该方法在**零样本跟踪不完美参考动作**上带来 **19%** 成功率提升，并在自建的 **20 小时人形动作基准 UniMoCap** 上验证了跨多样真实场景的**鲁棒泛化**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| MLLM | Multimodal Large Language Model，多模态大模型 |
| Action Streaming | 动作流式执行，边生成边输出以降延迟 |
| Causal Pipeline | 因果管线，只依赖过去信息、利于实时 |
| FSQ | Finite Scalar Quantization，有限标量量化（离散码本） |
| Shared Codebook | 共享码本，跨模态统一表示空间 |
| UniMoCap | 本文 20 小时人形动作基准 |

---

## ❓ 论文要解决什么问题？

通用人形需要**跟随多模态指令**（语言、音乐、轨迹），但：
- **高层感知 ↔ 全身执行**之间存在瓶颈，异构指令难统一；
- 要做到**实时**（低延迟）且**稳定**（物理可执行），还要能**零样本**应对不完美参考。

UniAct 要：把多模态指令**统一表示**并**流式**地变成**低延迟、物理可行**的全身动作。

---

## 🔧 方法详解

### 1. 两段式：MLLM + 因果流式管线
- **第一段**：**微调的 MLLM** 理解多模态指令、生成动作意图/token；
- **第二段**：**因果流式管线**边生成边执行，达成**亚 500 ms** 的低延迟控制。

### 2. FSQ 共享离散码本（统一 + 约束）
用 **FSQ** 把不同模态（语言/音乐/轨迹）**统一进一个共享离散码本**：
- **跨模态对齐**：异构输入映射到同一表示空间；
- **物理可行流形约束**：码本把动作限制在**物理上成立**的流形内，减少不可执行输出。

### 3. 评测
- **延迟**：**< 500 ms**；
- **零样本跟踪不完美参考**：成功率**+19%**；
- **基准**：自建 **UniMoCap（20 小时）**，跨多样真实场景鲁棒泛化。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    IN["🗣️🎵📈 多模态指令<br/>(语言/音乐/轨迹)"] --> MLLM
    subgraph MLLM["① 微调 MLLM"]
        FSQ["FSQ 共享离散码本<br/>跨模态对齐 + 物理流形约束"]
    end
    MLLM --> STREAM
    subgraph STREAM["② 因果流式管线"]
        S["边生成边执行 (<500ms)"]
    end
    STREAM --> OUT["🤖 低延迟全身动作<br/>零样本跟踪 +19%<br/>UniMoCap 鲁棒泛化"]

    style MLLM fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style STREAM fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **统一多模态指令执行**：MLLM + 因果流式管线，亚 500 ms 延迟；
2. **FSQ 共享码本**：跨模态对齐并把动作约束在物理可行流形；
3. **零样本鲁棒**：不完美参考跟踪成功率 +19%；
4. **UniMoCap 基准**：20 小时人形动作数据，验证多场景泛化。

---

## 🤖 对人形机器人学习的启发

- **离散码本是「统一多模态 + 物理约束」的巧解**：用共享码本同时解决对齐与可行性，思路可迁移到其它多模态控制；
- **流式因果管线是实时人形控制的关键**：把生成做成流式，才能把生成式方法压进控制频率；
- **多模态（含音乐）指令拓宽人形交互边界**：与 ULTRA、SafeFlow、FRoM-W1 同属语言/多模态驱动一脉；
- **零样本跟踪不完美参考**直击「人类数据天生含噪」的痛点，与 SUGAR/UniAct 的数据观一致。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.24321](https://arxiv.org/abs/2512.24321) | 论文正文（MLLM、流式管线、FSQ、UniMoCap 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·多模态/语言驱动**：[ULTRA（统一多模态控制）](../ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation.html) · [FRoM-W1（语言指令通用全身控制）](../FRoM-W1__Towards_General_Humanoid_Whole-Body_Control_with_Language_Instructions/FRoM-W1__Towards_General_Humanoid_Whole-Body_Control_with_Language_Instructions.html) · [SafeFlow（整流流 + 安全门控）](../SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow.html)。
