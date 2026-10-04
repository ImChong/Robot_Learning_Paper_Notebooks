---
layout: paper
title: "Unveiling the Impact of Data and Model Scaling on High-Level Control for Humanoid Robots"
zhname: "揭示数据与模型规模对人形高层控制的影响"
category: "Loco-Manipulation and WBC"
arxiv: "2511.09241"
---

# Unveiling the Impact of Data and Model Scaling on High-Level Control for Humanoid Robots
**用自动化流水线从人类动作视频造出 Humanoid-Union（260+ 小时、带语义标注、可继续扩展）大规模数据集，并提出 SCHUR 可扩展学习框架，系统研究数据/模型规模对人形高层控制的影响；相比此前方法重建 MPJPE 提升 37%、文本-动作对齐 FID 提升 25%**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 数据规模 · 高层控制 · 语义标注 · 可扩展学习 · 人类视频
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.09241](https://arxiv.org/abs/2511.09241) · [PDF](https://arxiv.org/pdf/2511.09241) · [HTML](https://arxiv.org/html/2511.09241v1) |
| 作者 | Yuxi Wei、Zirui Wang、Kangning Yin、Yue Hu、Jingbo Wang、Siheng Chen（上交大 / 上海 AI Lab 等） |
| 主题 | cs.RO · 数据/模型规模 / 高层控制 / 人体动作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> **数据规模**一直是机器人学习的瓶颈。对人形而言，**人类视频与动作数据**海量、免费、易得，且其**语义**可用于**模态对齐**与**高层控制**学习。但**如何挖原始视频、抽出机器人可学的表示、并用于可扩展学习**仍是开放问题。为此，作者用一条**自动化流水线**造出 **Humanoid-Union** ——一个**260+ 小时**、多样高质量、带**语义标注**（源自人类动作视频）的**人形动作数据集**，并可经同一流水线**继续扩展**。在此数据上，提出 **SCHUR** 可扩展学习框架，**系统研究大规模数据对人形高层控制的影响**。结果：相比此前方法，**重建 MPJPE 提升 37%**、**文本-动作对齐 FID 提升 25%**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| High-Level Control | 高层控制，语义/意图层面的控制 |
| Humanoid-Union | 本文 260+ 小时带语义标注的数据集 |
| SCHUR | 本文提出的可扩展学习框架 |
| Data Scaling | 数据规模化 |
| MPJPE | 每关节平均位置误差，越低越好 |
| FID | 衡量生成质量/对齐的距离指标 |

---

## ❓ 论文要解决什么问题？

人形高层控制的核心瓶颈是**数据**：
- 人类视频/动作虽**海量免费**，但**如何挖掘、抽取机器人可学表示、做可扩展学习**没解决；
- 还缺**带语义标注**的大规模人形动作数据来支撑高层（语义）控制。

论文要：① 造出**大规模带语义**的人形动作数据；② 用它**系统揭示数据/模型规模**对高层控制的影响。

---

## 🔧 方法详解

### 1. Humanoid-Union 数据集（自动化流水线）
用**自动化流水线**从**人类动作视频**生成 **260+ 小时**、多样高质量的人形动作数据，并附**语义标注**；可经同一流水线**持续扩展**——把"免费的人类视频"转成"机器人可学的带语义动作"。

### 2. SCHUR 可扩展学习框架
在该数据上提出 **SCHUR**，用于**探究大规模数据对人形高层控制的影响**——即把"数据/模型规模 → 控制性能"的关系做成可研究对象。

### 3. 结果
- **重建质量**：MPJPE **+37%** 改善；
- **文本-动作对齐**：FID **+25%** 改善；
- 真机部署验证。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    V["🎥 人类动作视频"] --> PIPE
    subgraph PIPE["自动化流水线"]
        D["Humanoid-Union<br/>260+ 小时 + 语义标注"]
    end
    PIPE --> SCHUR
    subgraph SCHUR["SCHUR 可扩展学习"]
        S["研究数据/模型规模影响"]
    end
    SCHUR --> OUT["🤖 高层控制<br/>MPJPE +37% · FID +25%<br/>真机部署"]

    style PIPE fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style SCHUR fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **Humanoid-Union 大规模数据集**：260+ 小时、带语义、可扩展，源自人类视频；
2. **SCHUR 可扩展学习框架**：系统研究数据/模型规模对高层控制的影响；
3. **自动化数据流水线**：把免费人类视频转为机器人可学的带语义动作；
4. **量化提升**：重建 MPJPE +37%、对齐 FID +25%，真机验证。

---

## 🤖 对人形机器人学习的启发

- **"规模化研究"本身是贡献**：把"数据/模型规模 → 性能"做成可量化对象，指导后续投入；
- **语义标注是高层控制的关键**：让控制能被语言/意图驱动，呼应 FRoM-W1、SENTINEL 等语言-动作工作；
- **自动化数据流水线**是人形数据飞轮的引擎，与 SUGAR、UniAct 的数据观一致；
- **260+ 小时**的体量在人形动作领域可观，利于探究 scaling law。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.09241](https://arxiv.org/abs/2511.09241) | 论文正文（Humanoid-Union、SCHUR、scaling 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（+37%/+25%）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·数据规模 / 语义控制**：[SUGAR（人类视频→技能流水线）](../SUGAR__A_Scalable_Human-Video-Driven_Generalizable_Humanoid_Loco-Manipulation_Learning_Framework/SUGAR__A_Scalable_Human-Video-Driven_Generalizable_Humanoid_Loco-Manipulation_Learning_Framework.html) · [SENTINEL（端到端语言-动作）](../SENTINEL__A_Fully_End-to-End_Language-Action_Model_for_Humanoid_Whole_Body_Control/SENTINEL__A_Fully_End-to-End_Language-Action_Model_for_Humanoid_Whole_Body_Control.html)；
- **本仓 14 人体动作板块**（动作数据与生成）。
