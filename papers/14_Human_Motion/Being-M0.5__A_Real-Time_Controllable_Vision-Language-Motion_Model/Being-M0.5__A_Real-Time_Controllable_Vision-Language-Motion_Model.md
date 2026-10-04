---
layout: paper
title: "Being-M0.5: A Real-Time Controllable Vision-Language-Motion Model"
zhname: "Being-M0.5：实时可控的视觉-语言-动作模型"
category: "Human Motion"
arxiv: "2508.07863"
---

# Being-M0.5: A Real-Time Controllable Vision-Language-Motion Model
**针对视觉-语言-动作模型（VLMM）可控性这一主瓶颈（响应多样指令差、姿态初始化弱、长序列差、未见场景处理不足、缺细粒度部位控制），提出实时可控的 Being-M0.5：基于迄今最大最全的人类动作数据集 HuMo100M（500 万+自采序列、1 亿条多任务指令、细粒度部位标注），用部位感知残差量化做动作 token 化以实现逐部位精细控制，在多个动作生成基准上达 SOTA 且保持实时**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 视觉-语言-动作 · 可控性 · 部位感知量化 · 大数据集 · 实时
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 8 月 |
| arXiv | [2508.07863](https://arxiv.org/abs/2508.07863) · [PDF](https://arxiv.org/pdf/2508.07863) · [HTML](https://arxiv.org/html/2508.07863v1) |
| 作者 | Bin Cao、Sipeng Zheng、Ye Wang、Qin Jin、Jing Liu、Zongqing Lu 等（BAAI / 人大等） |
| 主题 | cs.CV · 人类动作生成 / 视觉-语言-动作 / 可控性 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 人类动作生成潜力巨大，但现有**视觉-语言-动作模型（VLMM）**实用部署受限。作者指出**可控性**是主瓶颈，体现在五方面：**对多样人类指令响应不足、姿态初始化能力有限、长序列表现差、对未见场景处理不足、缺乏对各身体部位的细粒度控制**。为此提出**Being-M0.5**，并引入 **HuMo100M** ——**迄今最大最全**的人类动作数据集（**500 万+ 自采动作序列、1 亿条多任务指令实例、细粒度部位级标注**）。方法用**部位感知残差量化（part-aware residual quantization）**做动作 token 化，实现**逐部位**的精细控制。模型在多个动作生成基准上达 **SOTA**，同时保持**实时**执行效率。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| VLMM | Vision-Language-Motion Model |
| HuMo100M | 本文大规模人类动作数据集 |
| Part-aware Residual Quantization | 部位感知残差量化（动作 token 化） |
| Controllability | 可控性（本文主攻瓶颈） |
| Pose Initialization | 姿态初始化 |
| Part-level | 部位级（逐身体部位控制） |

---

## ❓ 论文要解决什么问题？

VLMM 的**可控性**不足（五大短板）：响应多样指令差、姿态初始化弱、长序列差、未见场景差、**缺逐部位细粒度控制**。论文要：一个**实时、可控**、能逐部位控制的 VLMM，并配足够大的数据。

---

## 🔧 方法详解

### 1. HuMo100M 大规模数据集
**500 万+ 动作序列、1 亿条多任务指令、细粒度部位标注**——为可控生成提供数据底座。

### 2. 部位感知残差量化（逐部位控制）
用**部位感知残差量化**做动作 token 化，使模型可对**各身体部位**做**细粒度控制**，直击"缺部位控制"短板。

### 3. 实时可控
在保证**实时**效率的同时提升可控性（指令响应、姿态初始化、长序列、未见场景）。

### 4. 结果
多个动作生成基准 **SOTA**，保持实时。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DATA["HuMo100M<br/>500万序列 + 1亿指令 + 部位标注"] --> M
    subgraph M["Being-M0.5"]
        Q["部位感知残差量化<br/>(逐部位 token 化)"]
    end
    M --> OUT["🕺 实时可控动作生成<br/>多基准 SOTA · 逐部位控制"]

    style M fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **诊断 VLMM 可控性五大短板**；
2. **HuMo100M**：迄今最大最全人类动作数据集（500 万+/1 亿/部位标注）；
3. **部位感知残差量化**：逐部位细粒度控制；
4. **实时 SOTA**：多基准领先且实时。

---

## 🤖 对人形机器人学习的启发

- **逐部位细粒度控制**对人形全身动作（上身操作 + 下身行走分控）有借鉴；
- **大规模动作数据 + 量化 token 化**是动作生成模型的主流配方，可迁移到人形动作生成（FRoM-W1、UniAct 等）；
- **可控性五维度**是评估动作生成是否实用的好框架；
- 动作生成是人形"语言→动作"上游的关键一环。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2508.07863](https://arxiv.org/abs/2508.07863) | 论文正文（HuMo100M、部位量化、基准实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·动作生成/规模化**：[Scaling Large Motion Models](../Scaling_Large_Motion_Models_with_Million-Level_Human_Motions/Scaling_Large_Motion_Models_with_Million-Level_Human_Motions.html)；
- **人形动作生成（本仓 04）**：[UniAct](../../04_Loco-Manipulation_and_WBC/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots/UniAct__Unified_Motion_Generation_and_Action_Streaming_for_Humanoid_Robots.html)。
