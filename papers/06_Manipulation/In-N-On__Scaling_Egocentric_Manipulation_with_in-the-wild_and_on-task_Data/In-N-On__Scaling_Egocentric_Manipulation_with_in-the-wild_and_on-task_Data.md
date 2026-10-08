---
layout: paper
title: "In-N-On: Scaling Egocentric Manipulation with in-the-wild and on-task Data"
zhname: "In-N-On：用「野外 + 任务对齐」数据规模化第一视角操作"
category: "Manipulation"
arxiv: "2511.15704"
---

# In-N-On: Scaling Egocentric Manipulation with in-the-wild and on-task Data
**In-N-On：用「野外 + 任务对齐」数据规模化第一视角操作**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 第一视角 · 野外/任务数据 · 流匹配策略 · 语言条件 · 域适应
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.15704](https://arxiv.org/abs/2511.15704) · [PDF](https://arxiv.org/pdf/2511.15704) · [HTML](https://arxiv.org/html/2511.15704v1) |
| 作者 | Xiongyi Cai、Ri-Zhao Qiu、Geng Chen、Lai Wei、Tianshu Huang、Xuxin Cheng、Xiaolong Wang（UC San Diego） |
| 主题 | cs.RO · 第一视角操作 / 数据规模化 / 流匹配 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 第一视角（egocentric）视频是学操作策略的**宝贵可扩展**数据源，但**数据异质性大**，多数方法只把人类数据用于**简单预训练**，没释放全部潜力。本文先给出一套**可扩展配方**：把人类数据分成两类——**野外（in-the-wild）**与**任务对齐（on-task）**，并系统分析**如何使用**。作者整理出数据集 **PHSD**，含 **1000+ 小时**多样**野外**第一视角数据与 **20+ 小时**直接对齐目标任务的**任务数据**。据此训练一个大型**语言条件流匹配策略 Human0**；配合**域适应**技术，**Human0** 缩小**人到人形**的差距。实证表明，规模化人类数据带来若干**新性质**：**仅凭人类数据就能听从语言指令**、**少样本学习**、以及用**任务数据**提升的**鲁棒性**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Egocentric | 第一视角（头戴视角） |
| In-the-wild / On-task | 野外 / 任务对齐数据 |
| PHSD | 本文数据集（1000h 野外 + 20h 任务） |
| Human0 | 语言条件流匹配策略 |
| Flow Matching | 流匹配生成策略 |
| Domain Adaptation | 域适应，缩小人↔人形差距 |

---

## ❓ 论文要解决什么问题？

第一视角人类数据潜力大但用不好：
- **异质性大**，多数只做**简单预训练**；
- 缺**如何分类与使用**数据的系统配方；
- 人到人形有**域差距**。

In-N-On 要：一套**可扩展配方**（野外 + 任务对齐）+ 数据集 + 策略，释放第一视角数据潜力。

---

## 🔧 方法详解

### 1. 数据分类：野外 + 任务对齐
把人类第一视角数据分成**野外（in-the-wild）**（多样、规模大）与**任务对齐（on-task）**（少量、直接对齐目标任务），并系统分析各自作用。

### 2. PHSD 数据集
整理 **PHSD**：**1000+ 小时野外** + **20+ 小时任务对齐**。

### 3. Human0：语言条件流匹配 + 域适应
训练大型**语言条件流匹配策略 Human0**；用**域适应**缩小**人↔人形**差距。

### 4. 涌现新性质
- **仅人类数据**即可**听语言指令**；
- **少样本学习**；
- **任务数据**提升**鲁棒性**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    W["1000h+ 野外第一视角"] --> PHSD
    T["20h+ 任务对齐"] --> PHSD
    subgraph PHSD["PHSD 数据 + Human0"]
        H["语言条件流匹配 + 域适应"]
    end
    PHSD --> OUT["🤖 人到人形<br/>语言跟随 / 少样本 / 任务数据增鲁棒"]

    style PHSD fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **可扩展第一视角数据配方**：野外 + 任务对齐两类 + 使用分析；
2. **PHSD 数据集**：1000h 野外 + 20h 任务对齐；
3. **Human0 语言条件流匹配 + 域适应**：缩小人↔人形差距；
4. **涌现新性质**：仅人类数据听指令、少样本、任务数据增鲁棒。

---

## 🤖 对人形机器人学习的启发

- **"野外 + 任务对齐"二分**是用好海量人类数据的关键洞见：规模来自野外、对齐来自少量任务数据；
- **语言条件 + 流匹配**让策略可指令驱动且高效；
- **域适应**是人到人形落地的必备环节；
- 与 Dexterity from Smart Lenses、EgoDex 等共同推进第一视角数据规模化。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.15704](https://arxiv.org/abs/2511.15704) | 论文正文（数据配方、PHSD、Human0、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·第一视角数据规模化**：[Dexterity from Smart Lenses](../Dexterity_from_Smart_Lenses__Multi-Fingered_Manipulation_with_In-the-Wild_Human_Demos/Dexterity_from_Smart_Lenses__Multi-Fingered_Manipulation_with_In-the-Wild_Human_Demos.html) · [Being-H0（VLA 预训练）](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html)。
