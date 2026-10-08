---
layout: paper
title: "Example-based Motion Synthesis via Generative Motion Matching"
zhname: "GenMM：用生成式动作匹配做范例驱动的动作合成"
category: "Human Motion"
arxiv: "2306.00378"
---

# Example-based Motion Synthesis via Generative Motion Matching
**GenMM：用生成式动作匹配做范例驱动的动作合成**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 范例驱动 · 生成式动作匹配 · 免训练 · 多阶段细化 · SIGGRAPH 2023
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2023 年 6 月 |
| arXiv | [2306.00378](https://arxiv.org/abs/2306.00378) · [PDF](https://arxiv.org/pdf/2306.00378) · [HTML](https://arxiv.org/html/2306.00378v1) |
| 会议 | SIGGRAPH 2023 |
| 作者 | Weiyu Li、Xuelin Chen、Peizhuo Li、Olga Sorkine-Hornung、Baoquan Chen |
| 主题 | cs.GR · 范例驱动动作合成 / 动作匹配 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> **GenMM** 是一个**生成模型**，从**单段或少量范例序列**中"**挖（mine）**"出尽可能**多样**的动作。与现有**数据驱动**方法（通常需**长时离线训练**、易出**视觉伪影**、在**大型复杂骨架**上易失败）形成鲜明对比，GenMM **继承了知名 Motion Matching 方法的免训练特性与卓越质量**。框架还可扩展到**动作补全、关键帧引导生成、无限循环、动作重组**等场景。核心是一个**生成式动作匹配模块**，用**双向视觉相似度**作代价函数，配**多阶段框架**从随机初始化**逐步细化**。它能在**几分之一秒**内合成高质量动作、处理**复杂大型骨架**、从极少范例生成多样动作。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| GenMM | 生成式动作匹配模型 |
| Motion Matching | 经典免训练动作合成法 |
| Example-based | 范例驱动（单/少样本） |
| Bidirectional Similarity | 双向视觉相似度（代价函数） |
| Multi-stage | 多阶段逐步细化 |
| Training-free | 免训练 |

---

## ❓ 论文要解决什么问题？

数据驱动动作合成的痛点：
- **长时离线训练**；
- **视觉伪影**；
- **大型复杂骨架**上易失败；
- 难从**极少范例**生成多样动作。

GenMM 要：**免训练**、高质量、可处理复杂骨架、从单/少范例生成多样动作。

---

## 🔧 方法详解

### 1. 生成式动作匹配（双向相似度代价）
继承 **Motion Matching** 的免训练高质量，用**双向视觉相似度**作代价函数衡量合成与范例的匹配度。

### 2. 多阶段逐步细化
从**随机初始化**出发，**多阶段**逐步细化，避免伪影、稳健处理大型骨架。

### 3. 多场景扩展
支持**动作补全、关键帧引导生成、无限循环、动作重组**。

### 4. 效率
**几分之一秒**合成高质量动作，免训练即用。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    EX["🎞️ 单/少范例序列"] --> GM
    subgraph GM["GenMM(免训练)"]
        C["双向视觉相似度代价"]
        S["多阶段从随机初始化细化"]
        C --> S
    end
    GM --> OUT["🕺 多样高质量动作(<1s)<br/>补全/关键帧/循环/重组"]

    style GM fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **GenMM 免训练生成式动作匹配**：继承 Motion Matching 质量；
2. **双向相似度 + 多阶段细化**：避伪影、稳健复杂骨架；
3. **极少范例 → 多样动作**：单/少样本；
4. **多场景 + 高效**：补全/关键帧/循环/重组，<1 秒。

---

## 🤖 对人形机器人学习的启发

- **免训练范例驱动**对快速生成参考动作很实用，无需大数据/长训练；
- **双向相似度**是衡量动作质量的可迁移代价；
- **从少范例挖多样**契合人形稀缺动作数据的扩增需求；
- 动作重组/循环可为人形技能库提供多样参考。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2306.00378](https://arxiv.org/abs/2306.00378) | 论文正文（生成式动作匹配、多阶段细化、应用） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·动作合成**：[TEDi（长时程合成）](../TEDi__Temporally-Entangled_Diffusion_for_Long-Term_Motion_Synthesis/TEDi__Temporally-Entangled_Diffusion_for_Long-Term_Motion_Synthesis.html) · [Guided Motion Diffusion](../Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis/Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis.html)。
