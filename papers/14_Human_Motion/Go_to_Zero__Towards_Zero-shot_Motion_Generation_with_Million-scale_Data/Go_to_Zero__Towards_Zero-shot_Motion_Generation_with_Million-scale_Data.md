---
layout: paper
title: "Go to Zero: Towards Zero-shot Motion Generation with Million-scale Data"
zhname: "Go to Zero：迈向百万级数据的零样本动作生成"
category: "Human Motion"
arxiv: "2507.07095"
---

# Go to Zero: Towards Zero-shot Motion Generation with Million-scale Data
**Go to Zero：迈向百万级数据的零样本动作生成**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 零样本动作生成 · 百万级数据 · 自动标注 · 7B 模型 · 评测基准
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 7 月 |
| arXiv | [2507.07095](https://arxiv.org/abs/2507.07095) · [PDF](https://arxiv.org/pdf/2507.07095) · [HTML](https://arxiv.org/html/2507.07095v1) |
| 项目页 | [vankouf.github.io/MotionMillion](https://vankouf.github.io/MotionMillion/) · [code](https://github.com/VankouF/MotionMillion-Codes) |
| 主题 | cs.CV · 零样本动作生成 / 大规模数据 / 文本到动作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 本文要把**文本到动作（text-to-motion）**推向**零样本泛化**的新阶段。为此提出一套**高效动作标注机制**：从**网络规模人类动作视频**中**自主采集**人类动作——用**运动学回归（kinematic regression）**从无标注视频中提取动作，并用先进**视觉语言模型**生成**语义丰富的描述（caption）**。据此构建 **MotionMillion** ——**迄今最大**的人类动作数据集（**2000+ 小时、200 万条**高质量动作序列）。还提出 **MotionMillion-Eval** ——**最全面**的零样本动作生成评测基准。作者把模型**规模化到 7B 参数**并在 MotionMillion-Eval 上验证：结果对**域外（out-of-domain）**与**复杂组合（compositional）**动作展现**强泛化**，是迈向**零样本人类动作生成**的重要一步。代码开源。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Zero-shot | 零样本（未见文本/动作） |
| MotionMillion | 本文百万级动作数据集 |
| Kinematic Regression | 运动学回归（从视频提动作） |
| VLM Caption | 视觉语言模型生成描述 |
| MotionMillion-Eval | 零样本评测基准 |
| 7B | 70 亿参数模型 |

---

## ❓ 论文要解决什么问题？

文本到动作缺**零样本泛化**：
- 现有数据集**小**，难覆盖多样文本/动作；
- 缺**自动标注**把网络视频转成"动作 + 描述"；
- 缺**零样本评测基准**。

Go to Zero 要：**自动**造百万级数据、训大模型、建零样本基准，实现零样本动作生成。

---

## 🔧 方法详解

### 1. 高效自动标注（视频 → 动作 + 描述）
- **运动学回归**从**无标注网络视频**提取人类动作；
- **VLM** 生成**语义丰富的描述**；
- 自主大规模采集。

### 2. MotionMillion 数据集
**2000+ 小时、200 万条**高质量动作序列——迄今最大。

### 3. 7B 大模型 + MotionMillion-Eval
把模型**规模化到 7B**，并提出**最全面的零样本评测**基准验证。

### 4. 结果
对**域外**与**复杂组合**动作**强泛化**，迈向零样本动作生成。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    VID["🎥 网络规模人类动作视频"] --> ANNO
    subgraph ANNO["高效自动标注"]
        KR["运动学回归提动作"]
        VLM["VLM 生成描述"]
    end
    ANNO --> DATA["MotionMillion<br/>2000h+ / 200万序列"]
    DATA --> M["7B 大模型"]
    M --> OUT["🕺 零样本动作生成<br/>域外/复杂组合强泛化 (MotionMillion-Eval)"]

    style ANNO fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **高效自动标注机制**：运动学回归 + VLM 描述，从网络视频造数据；
2. **MotionMillion**：迄今最大（2000h+/200 万序列）；
3. **MotionMillion-Eval**：最全面零样本评测基准；
4. **7B 模型 + 强零样本泛化**：域外与复杂组合动作。

---

## 🤖 对人形机器人学习的启发

- **零样本是动作生成的下一个高地**，数据规模 + 模型规模是关键，对人形动作生成同样适用；
- **自动从视频造"动作 + 描述"**是规模化数据的范式（与 Scaling Large Motion Models、SCHUR 同向）；
- **零样本评测基准**对衡量真正泛化很重要；
- 大规模动作模型可作人形"语言→动作"的强先验。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2507.07095](https://arxiv.org/abs/2507.07095) | 论文正文（自动标注、MotionMillion、7B 模型、零样本评测） |
| [项目页 + 代码](https://vankouf.github.io/MotionMillion/) | 概述、数据、开源代码 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与项目页整理；数值（2000h+/200 万/7B）取自公开信息，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·动作生成/规模化**：[Scaling Large Motion Models](../Scaling_Large_Motion_Models_with_Million-Level_Human_Motions/Scaling_Large_Motion_Models_with_Million-Level_Human_Motions.html) · [Being-M0.5](../Being-M0.5__A_Real-Time_Controllable_Vision-Language-Motion_Model/Being-M0.5__A_Real-Time_Controllable_Vision-Language-Motion_Model.html)。
