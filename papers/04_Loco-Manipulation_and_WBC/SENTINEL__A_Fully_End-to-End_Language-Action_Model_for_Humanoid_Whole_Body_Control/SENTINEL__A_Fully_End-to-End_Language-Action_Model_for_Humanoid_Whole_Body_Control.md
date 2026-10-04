---
layout: paper
title: "SENTINEL: A Fully End-to-End Language-Action Model for Humanoid Whole Body Control"
zhname: "SENTINEL：面向人形全身控制的全端到端语言-动作模型"
category: "Loco-Manipulation and WBC"
arxiv: "2511.19236"
---

# SENTINEL: A Fully End-to-End Language-Action Model for Humanoid Whole Body Control
**用预训练全身控制器在仿真里跟踪人类动作并配文本标注，构建大规模数据集；模型把语言指令 + 本体感受直接映射到底层动作，无任何中间表示，用流匹配生成动作块、再用残差动作头精修以上真机；语言与物理行为紧耦合，仿真与真机均语义稳健，并可把多模态输入转文本扩展**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 端到端 · 语言-动作模型 · 流匹配 · 残差动作头 · 多模态
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.19236](https://arxiv.org/abs/2511.19236) · [PDF](https://arxiv.org/pdf/2511.19236) · [HTML](https://arxiv.org/html/2511.19236v1) |
| 作者 | Yuxuan Wang、Haobin Jiang、Shiqing Yao、Ziluo Ding、Zongqing Lu（北大 / BAAI 等） |
| 主题 | cs.RO · 端到端语言-动作 / 全身控制 / 流匹配 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 现有人形控制要么靠**遥操作**（全人驱动），要么靠**模块化生成流水线**（把语言理解与物理执行**分离**，语言与行为对齐松散）。SENTINEL 提出一个**全端到端的语言-动作模型**做人形**全身控制**：先用**预训练全身控制器**在**仿真**里**跟踪人类动作**并结合其**文本标注**，构建**大规模数据集**；模型**直接**把**语言指令 + 本体感受**映射到**底层动作**，**不要任何中间表示**。动作以**流匹配（flow matching）**生成**动作块（action chunks）**，再由**残差动作头**精修以便**真机部署**。该方法在仿真与真机上都表现出**强语义理解与稳定执行**，并通过把输入**转成文本**支持**多模态扩展**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| End-to-End | 端到端，语言直接到动作、无中间表示 |
| Language-Action Model | 语言-动作模型，语言→低层动作 |
| Flow Matching | 流匹配，一类高效生成模型 |
| Action Chunk | 动作块，一次生成的一段动作 |
| Residual Action Head | 残差动作头，对生成动作做真机精修 |
| Proprioception | 本体感受，机器人内部状态 |

---

## ❓ 论文要解决什么问题？

现有两条路各有缺陷：
- **遥操作**：完全人驱动，不自主；
- **模块化生成**：语言理解与物理执行**分离**，语言指令与物理行为**对齐松散**，易语义漂移。

SENTINEL 要：一个**端到端**模型，把语言与全身动作**紧耦合**，既自主又语义准确、且能上真机。

---

## 🔧 方法详解

### 1. 数据构建：预训练 WBC 跟踪人类动作 + 文本
用一个**预训练全身控制器**在**仿真**中**跟踪大量人类动作**，并配上**文本标注**，得到**大规模「语言-动作」数据集**——绕开成对数据稀缺。

### 2. 端到端：语言 + 本体 → 动作（无中间表示）
模型**直接**把**语言指令**与**本体感受**映射到**底层动作**，**没有任何中间表示**，使语言语义与物理行为**紧对齐**。

### 3. 流匹配生成 + 残差动作头
- **流匹配**生成**动作块**；
- **残差动作头**对动作块做**精修**，弥合 sim-to-real，便于真机部署。

### 4. 评测与多模态
- 仿真 + 真机均**语义稳健、执行稳定**；
- 通过把输入**转成文本**支持**多模态扩展**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DATA["🗃️ 数据：预训练 WBC 跟踪人类动作<br/>+ 文本标注"] --> M
    L["📝 语言指令"] --> M
    P["📟 本体感受"] --> M
    subgraph M["🧠 端到端语言-动作模型"]
        FM["流匹配生成动作块"]
        RH["残差动作头精修"]
        FM --> RH
    end
    M --> OUT["🤖 仿真+真机语义稳健<br/>多模态可转文本扩展"]

    style M fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **全端到端语言-动作模型**：语言 + 本体直接到底层动作、无中间表示，语义与行为紧耦合；
2. **大规模数据构建**：用预训练 WBC 在仿真跟踪人类动作 + 文本标注；
3. **流匹配 + 残差动作头**：生成动作块并精修，支持真机部署；
4. **多模态扩展**：把输入转文本即可支持多模态。

---

## 🤖 对人形机器人学习的启发

- **端到端能消除「语言-执行」错位**：相比模块化流水线，紧耦合提升语义保真；
- **用 WBC 自动造语言-动作数据**是绕开成对数据稀缺的聪明做法；
- **流匹配 + 残差头**是「生成式 + 真机可部署」的常见而有效组合（与 SafeFlow 思路呼应）；
- **与 FRoM-W1、UniAct、Humanoid-LLA 同属语言-动作簇**，差异在中间表示有无与生成方式。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.19236](https://arxiv.org/abs/2511.19236) | 论文正文（数据构建、端到端映射、流匹配、真机实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·语言-动作模型**：[Humanoid-LLA（统一动作词表）](../Commanding_Humanoid_by_Free-form_Language__LLA_with_Unified_Motion_Vocabulary/Commanding_Humanoid_by_Free-form_Language__LLA_with_Unified_Motion_Vocabulary.html) · [UniAct（FSQ 码本流式执行）](../UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots.html) · [FRoM-W1](../FRoM-W1__Towards_General_Humanoid_Whole-Body_Control_with_Language_Instructions/FRoM-W1__Towards_General_Humanoid_Whole-Body_Control_with_Language_Instructions.html)。
