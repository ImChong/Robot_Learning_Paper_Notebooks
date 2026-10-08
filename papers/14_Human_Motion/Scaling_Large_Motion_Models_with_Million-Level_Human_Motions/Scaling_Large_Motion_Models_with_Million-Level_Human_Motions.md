---
layout: paper
title: "Scaling Large Motion Models with Million-Level Human Motions"
zhname: "用百万级人类动作扩展大型动作模型"
category: "Human Motion"
arxiv: "2410.03311"
---

# Scaling Large Motion Models with Million-Level Human Motions
**用百万级人类动作扩展大型动作模型**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 大型动作模型 · 百万级数据 · 分层文本 · 无查找 token 化 · 规模化
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 10 月 |
| arXiv | [2410.03311](https://arxiv.org/abs/2410.03311) · [PDF](https://arxiv.org/pdf/2410.03311) · [HTML](https://arxiv.org/html/2410.03311v1) |
| 作者 | Ye Wang、Sipeng Zheng、Bin Cao、Qianshan Wei、Qin Jin、Zongqing Lu（BAAI / 人大等） |
| 主题 | cs.CV · 大型动作模型 / 数据规模化 / 动作 token 化 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 本文构建 **MotionLib** ——**首个百万级**动作生成数据集，**至少比现有同类大 15×**，并配**分层文本描述（hierarchical text）**。用它训练一个**大型动作模型**，在**多样人类活动**（含**未见类别**）上表现强劲，强调**数据与模型规模一起放大**的重要性。还提出 **Motionbook** 动作编码：一种**紧凑无损**的动作表示，以及一个**新颖的「2D 无查找（lookup-free）」token 化**方法——在**保留细粒度细节**的同时**扩大码本容量**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| MotionLib | 百万级动作生成数据集 |
| Motionbook | 本文动作编码/token 化方法 |
| Hierarchical Text | 分层文本描述 |
| Lookup-free Tokenizer | 无查找 token 化（2D） |
| Codebook | 码本（量化字典） |
| Scaling | 数据/模型规模化 |

---

## ❓ 论文要解决什么问题？

动作生成缺**大规模数据**与**好的动作 token 化**：
- 现有数据集**小**，难支撑大模型；
- 传统码本 token 化在**容量与细节**间难两全。

论文要：建**百万级**数据集、训**大型动作模型**、并设计**更好的动作编码**。

---

## 🔧 方法详解

### 1. MotionLib：百万级 + 分层文本
**首个百万级**动作数据集，**≥15× 大于现有**，配**分层文本描述**，支撑大模型与规模化研究。

### 2. 大型动作模型 + 规模化
在 MotionLib 上训练**大型动作模型**，系统考察**数据/模型规模**对性能的影响，泛化到**未见活动类别**。

### 3. Motionbook：紧凑无损 + 2D 无查找 token 化
- **紧凑无损**动作表示；
- **2D 无查找 token 化**：保留细粒度细节、**扩大码本容量**（避免查找瓶颈）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DATA["MotionLib<br/>百万级 + 分层文本(≥15×)"] --> M
    subgraph M["大型动作模型"]
        MB["Motionbook 编码<br/>(紧凑无损 + 2D 无查找 token)"]
    end
    M --> OUT["🕺 多样人类活动(含未见类)<br/>数据/模型规模化见效"]

    style M fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **MotionLib**：首个百万级动作数据集（≥15×、分层文本）；
2. **大型动作模型 + 规模化研究**：数据与模型一起放大；
3. **Motionbook 编码**：紧凑无损 + 2D 无查找 token 化；
4. **强泛化**：多样人类活动含未见类别。

---

## 🤖 对人形机器人学习的启发

- **"数据 + 模型一起放大"是动作生成的 scaling law**，对人形动作生成（Being-M0.5、UniAct）有指导；
- **无查找 token 化**缓解码本容量瓶颈，是动作离散化的改进方向；
- **分层文本**有助于细粒度可控生成；
- 大规模动作模型可作人形"语言→动作"的上游先验。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2410.03311](https://arxiv.org/abs/2410.03311) | 论文正文（MotionLib、大模型、Motionbook、规模化实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（15×）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·动作生成/规模化**：[Being-M0.5（实时可控 VLMM）](../Being-M0.5__A_Real-Time_Controllable_Vision-Language-Motion_Model/Being-M0.5__A_Real-Time_Controllable_Vision-Language-Motion_Model.html)；
- **人形动作生成（本仓 04）**：[UniAct](../../04_Loco-Manipulation_and_WBC/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots.html)。
