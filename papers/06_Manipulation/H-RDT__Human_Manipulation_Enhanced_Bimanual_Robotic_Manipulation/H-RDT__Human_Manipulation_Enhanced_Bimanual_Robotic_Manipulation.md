---
layout: paper
title: "H-RDT: Human Manipulation Enhanced Bimanual Robotic Manipulation"
zhname: "H-RDT：用人类操作增强的双臂机器人操作"
category: "Manipulation"
arxiv: "2507.23523"
---

# H-RDT: Human Manipulation Enhanced Bimanual Robotic Manipulation
**针对机器人演示数据稀缺、跨本体统一训练难，提出用「人类操作数据」增强机器人操作：核心洞察是带配对 3D 手姿标注的大规模第一视角人类操作视频蕴含丰富行为先验；两阶段——先在大规模第一视角人类数据上预训练，再用模块化动作编/解码器在机器人数据上做跨本体微调；2B 参数扩散 Transformer + 流匹配，仿真/真机较从零训练分别 +13.9%/+40.5%，超 Pi0 与 RDT**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 人类数据增强 · 双臂操作 · 扩散 Transformer · 流匹配 · 跨本体
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 7 月 |
| arXiv | [2507.23523](https://arxiv.org/abs/2507.23523) · [PDF](https://arxiv.org/pdf/2507.23523) · [HTML](https://arxiv.org/html/2507.23523v1) |
| 作者 | Hongzhe Bi、Lingxuan Wu、Tianwei Lin、Hengkai Tan、Hang Su、Jun Zhu 等（清华 TSAIL / 地平线等） |
| 主题 | cs.RO · 人类增强操作 / 双臂 / VLA |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 机器人操作模仿学习面临**大规模高质量机器人演示稀缺**的根本难题。近期机器人基础模型常在**跨本体机器人数据**上预训练以扩规模，但**不同本体的形态与动作空间差异大**，统一训练难。H-RDT（**Human to Robotics Diffusion Transformer**）用**人类操作数据**增强机器人操作：核心洞察是**带配对 3D 手姿标注的大规模第一视角人类操作视频**蕴含丰富**行为先验**，能惠及机器人策略学习。采用**两阶段**：① 在**大规模第一视角人类操作数据**上**预训练**；② 用**模块化动作编/解码器**在**机器人专属数据**上做**跨本体微调**。模型是 **2B 参数的扩散 Transformer**，用**流匹配**建模复杂动作分布。仿真/真机较从零训练分别 **+13.9% / +40.5%**，超过 **Pi0** 与 **RDT** 基线。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| H-RDT | Human to Robotics Diffusion Transformer |
| Bimanual | 双臂 |
| 3D Hand Pose | 3D 手姿标注 |
| Cross-Embodiment | 跨本体 |
| Modular Encoder/Decoder | 模块化动作编/解码器 |
| Flow Matching | 流匹配 |

---

## ❓ 论文要解决什么问题？

机器人演示数据稀缺，跨本体统一训练难：
- 直接跨本体机器人预训练受**形态/动作空间差异**限制；
- 需要更**可扩展**的先验来源。

H-RDT 要：用**大规模人类操作视频（含 3D 手姿）**作行为先验，增强机器人双臂操作。

---

## 🔧 方法详解

### 1. 洞察：人类视频 + 3D 手姿 = 行为先验
**第一视角人类操作视频 + 配对 3D 手姿**捕捉**自然操作策略**，是比跨本体机器人数据更易扩展的先验。

### 2. 两阶段训练
- **预训练**：在**大规模第一视角人类操作数据**上；
- **跨本体微调**：用**模块化动作编/解码器**适配机器人专属数据/动作空间。

### 3. 架构：2B 扩散 Transformer + 流匹配
**2B 参数扩散 Transformer**，用**流匹配**建模复杂动作分布。

### 4. 结果
- 仿真 **+13.9%**、真机 **+40.5%**（相对从零训练）；
- 超 **Pi0、RDT**；单任务/多任务/少样本/鲁棒性均评测。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    H["🎥 第一视角人类操作视频<br/>+ 3D 手姿"] --> PRE["①预训练(行为先验)"]
    PRE --> FT["②跨本体微调<br/>(模块化动作编/解码器)"]
    FT --> M["2B 扩散 Transformer + 流匹配"]
    M --> OUT["🤖 双臂操作<br/>仿真+13.9% 真机+40.5% · 超 Pi0/RDT"]

    style M fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **人类数据增强机器人操作**：人类视频 + 3D 手姿作行为先验；
2. **两阶段训练**：人类预训练 + 模块化跨本体微调；
3. **2B 扩散 Transformer + 流匹配**：建模复杂动作分布；
4. **显著提升**：仿真 +13.9%、真机 +40.5%，超 Pi0/RDT。

---

## 🤖 对人形机器人学习的启发

- **人类视频比跨本体机器人数据更易扩展**：用它作预训练先验是聪明的绕过数据稀缺之道；
- **模块化动作编/解码器**是跨本体微调的实用结构；
- **扩散 Transformer + 流匹配**是当前 VLA/操作模型的主流；
- 与 Being-H0、In-N-On 等"人类数据驱动操作"路线一致。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2507.23523](https://arxiv.org/abs/2507.23523) | 论文正文（两阶段训练、扩散 Transformer、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人类数据 VLA**：[Being-H0（人类视频 VLA 预训练）](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html) · [In-N-On](../In-N-On__Scaling_Egocentric_Manipulation_with_in-the-wild_and_on-task_Data/In-N-On__Scaling_Egocentric_Manipulation_with_in-the-wild_and_on-task_Data.html)。
