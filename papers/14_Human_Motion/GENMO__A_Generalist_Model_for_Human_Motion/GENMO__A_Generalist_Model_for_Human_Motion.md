---
layout: paper
title: "GENMO: A Generalist Model for Human Motion"
zhname: "GENMO：人类动作的通才模型"
category: "Human Motion"
arxiv: "2505.01425"
---

# GENMO: A Generalist Model for Human Motion
**GENMO：人类动作的通才模型**

> 📅 阅读日期: 2026-06-28
>
> 🏷️ 板块: 14 Human Motion · 通才动作模型 · 估计⇄生成统一 · 多模态条件 · NVIDIA DAIR
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → 14_Human_Motion，与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月（arXiv v1：2025-05-02） |
| 作者 | Jiefeng Li, Jinkun Cao, Haotian Zhang, Davis Rempe, Jan Kautz, Umar Iqbal, Ye Yuan |
| 机构 | NVIDIA（DAIR Lab） |
| arXiv | [2505.01425](https://arxiv.org/abs/2505.01425) · [PDF](https://arxiv.org/pdf/2505.01425) · [HTML](https://arxiv.org/html/2505.01425v1) |
| 项目页 | [research.nvidia.com/labs/dair/genmo](https://research.nvidia.com/labs/dair/genmo/) |
| 主题 | cs.CV · 人类动作估计 / 动作生成 / 多模态条件 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 以往的人类动作研究把**估计（estimation，从观测恢复动作）**与**生成（generation，从条件凭空造动作）**当成两类各自专精的模型分别做。GENMO 的核心观察是：**估计本质上就是一种「受约束的生成」**——只要让生成出来的动作**精确满足**观测条件（如视频/2D 关键点），它就变成了估计。基于这一重述，GENMO 用**一个**网络同时胜任**文本→动作、音频→动作、关键帧引导、视频动作估计**等任务，并支持**变长动作**与**在不同时间区间混合多种模态条件**。两类能力相互增益：**生成先验**让估计在遮挡等困难场景更稳，**野外视频 + 2D 标注 + 文本**又把生成的**多样性**喂大。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Estimation | 动作估计（从视频/传感观测恢复动作） |
| Generation | 动作生成（从文本/音频等条件造动作） |
| Constrained Generation | 受约束的生成（估计 = 满足观测约束的生成） |
| Multimodal Conditioning | 多模态条件（文本 / 音频 / 关键帧 / 视频混合） |
| In-the-wild | 野外数据（真实非受控视频） |

---

## ❓ 论文要解决什么问题？

人类动作领域长期割裂为两条线：
- **估计模型**精于「从视频还原动作」，但难以创造新动作、遇遮挡易崩；
- **生成模型**精于「从文本/音频造动作」，却用不上海量野外视频里的真实运动多样性。

维护两套专用模型既冗余、又互相浪费数据。GENMO 想用**一个通才模型**把两端打通：既能估、又能生成，还能让两者彼此补强。

---

## 🔧 方法详解

### 1. 关键重述：估计 = 受约束的生成
把「动作估计」改写成一种**生成**任务——只是输出动作必须**精确满足观测到的条件信号**（视频帧、2D 关键点等）。于是估计与生成共享同一套生成骨架，仅条件强度/类型不同。

### 2. 多模态、变长、可混合的条件
单一模型可接收**文本、音频、关键帧、视频**等条件，支持**变长动作**，并允许**在不同时间区间混入不同模态**（例如前半段由文本驱动、后半段由关键帧约束）。

### 3. 估计引导的训练（estimation-guided training）
利用**野外视频 + 2D 标注 + 文本**参与训练：真实视频带来的运动分布显著**增强生成的多样性**；反过来，生成先验又在**遮挡 / 困难视角**下**提升估计鲁棒性**。

### 4. 协同增益
两类任务在同一模型中**互相受益**：生成先验稳住估计，野外数据撑大生成——这正是「通才」相对「专才」的价值所在。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph COND["多模态条件（可变长 / 可分时段混合）"]
        T["📝 文本"]
        A["🔊 音频"]
        K["🎯 关键帧"]
        V["🎥 视频 + 2D 标注"]
    end
    COND --> G["GENMO 通才模型<br/>（统一生成骨架）"]
    G -->|条件弱/无观测| GEN["✨ 动作生成<br/>文本→/音频→/关键帧引导"]
    G -->|条件强：须精确满足观测| EST["🎬 动作估计<br/>视频还原动作（重述为受约束生成）"]
    V -. 野外数据增强多样性 .-> GEN
    GEN -. 生成先验稳住困难场景 .-> EST

    style G fill:#e8f0fd,stroke:#2c6fbb,color:#14315e
    style GEN fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style EST fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **统一范式**：把动作估计重述为「受约束的动作生成」，用一个通才模型同时覆盖估计与生成；
2. **多模态 / 变长 / 可混合条件**：单模型吃文本、音频、关键帧、视频，并能在不同时间段混合模态；
3. **估计引导训练**：以野外视频 + 2D 标注 + 文本提升生成多样性；
4. **双向协同**：生成先验改善遮挡下的估计，野外数据反哺生成。

---

## 🤖 对人形机器人学习的启发

- **「估计⇄生成」统一**对人形很有价值：同一动作先验既能从视频/遥操作信号**还原**动作（估计），又能由文本/语义**生成**新动作，省去分别建模；
- **多模态可混合条件**契合人形「语言 + 关键帧 + 感知」混合下达指令的需求；
- **野外视频反哺生成多样性**与本仓库 Go to Zero / Scaling Large Motion Models 的「用视频规模化动作数据」同向；
- 通才动作模型可作人形上半身/全身动作的强先验，下接重定向与全身控制器落地真机。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.01425](https://arxiv.org/abs/2505.01425) | 论文正文（统一范式、多模态条件、估计引导训练、协同增益） |
| [项目页 NVIDIA DAIR](https://research.nvidia.com/labs/dair/genmo/) | 概述、定性结果与演示 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与 NVIDIA 项目页整理；截至当前未见公开训练代码，**细节与数值以原文 / PDF 为准**。

---

## 🔗 相关阅读

- **同模块·动作生成/规模化**：[Go to Zero](../Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data/Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data.html) · [Being-M0.5](../Being-M0.5__A_Real-Time_Controllable_Vision-Language-Motion_Model/Being-M0.5__A_Real-Time_Controllable_Vision-Language-Motion_Model.html) · [Scaling Large Motion Models](../Scaling_Large_Motion_Models_with_Million-Level_Human_Motions/Scaling_Large_Motion_Models_with_Million-Level_Human_Motions.html)。
- **同模块·从视频估计动作**：[EmbodMocap](../EmbodMocap__In-the-Wild_4D_Human-Scene_Reconstruction_for_Embodied_Agents/EmbodMocap__In-the-Wild_4D_Human-Scene_Reconstruction_for_Embodied_Agents.html)。
