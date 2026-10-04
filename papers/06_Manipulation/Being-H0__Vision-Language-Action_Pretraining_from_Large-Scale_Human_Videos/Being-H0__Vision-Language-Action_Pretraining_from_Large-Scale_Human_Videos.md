---
layout: paper
title: "Being-H0: Vision-Language-Action Pretraining from Large-Scale Human Videos"
zhname: "Being-H0：从大规模人类视频做视觉-语言-动作预训练"
category: "Manipulation"
arxiv: "2507.15597"
---

# Being-H0: Vision-Language-Action Pretraining from Large-Scale Human Videos
**把人手当作「基础操作器」，从网络规模人类视频学一个灵巧 VLA：提出「物理指令微调」范式——大规模人类视频 VLA 预训练 + 3D 推理的物理空间对齐 + 面向机器人任务的后训练适配；用部件级运动 token 化达毫米级重建精度建模手部轨迹，并构建融合动捕/VR/RGB 的百万级运动指令数据集，在手部动作生成与指令跟随上表现优异、随模型/数据规模扩展，并在真机操作上见效**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · VLA 预训练 · 人类视频 · 物理指令微调 · 运动 token 化 · 灵巧
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 7 月 |
| arXiv | [2507.15597](https://arxiv.org/abs/2507.15597) · [PDF](https://arxiv.org/pdf/2507.15597) · [HTML](https://arxiv.org/html/2507.15597v1) |
| 作者 | Hao Luo、Yicheng Feng、Wanpeng Zhang、Sipeng Zheng、Haoqi Yuan、Qin Jin、Zongqing Lu 等（北大 / BAAI 等） |
| 主题 | cs.RO · VLA / 人类视频预训练 / 灵巧操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> Being-H0 是一个在**大规模人类视频**上训练的**灵巧视觉-语言-动作模型（VLA）**。现有 VLA 在**高灵巧操作**上吃力、对新场景泛化差，主因是依赖**有 sim-to-real 差距的合成数据**或**缺规模与多样性的遥操作演示**。为破数据瓶颈，本文把**人手当作基础操作器（foundation manipulator）**，利用网络数据中丰富的**灵巧性与可扩展性**。方法核心是**物理指令微调（physical instruction tuning）**：结合**大规模人类视频 VLA 预训练**、**3D 推理的物理空间对齐**、以及**面向机器人任务的后训练适配**。还提出**部件级运动 token 化（part-level motion tokenization）**，达**毫米级重建精度**以建模精确手部轨迹；并构建融合**动捕、VR、RGB-only 视频**的**百万级运动指令**数据集。实验显示 Being-H0 在**手部动作生成与指令跟随**上优异，随**模型与数据规模良好扩展**，并在**真机操作**上随物理指令微调见效。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| VLA | Vision-Language-Action 模型 |
| Physical Instruction Tuning | 物理指令微调（本文范式） |
| Motion Tokenization | 运动 token 化（部件级，毫米级精度） |
| Foundation Manipulator | 基础操作器（人手） |
| Physical Space Alignment | 物理空间对齐（3D 推理） |
| Post-training Adaptation | 后训练适配到机器人任务 |

---

## ❓ 论文要解决什么问题？

VLA 高灵巧操作难、泛化差：
- 合成数据有 **sim-to-real 差距**；
- 遥操作演示**缺规模与多样性**。

Being-H0 要：把**人手**当基础操作器，从**网络规模人类视频**学灵巧 VLA，破数据瓶颈。

---

## 🔧 方法详解

### 1. 物理指令微调（核心范式）
三件套：
- **大规模人类视频 VLA 预训练**；
- **物理空间对齐**：让模型做 **3D 推理**；
- **后训练适配**：迁到机器人任务。

### 2. 部件级运动 token 化（毫米级）
**部件级运动 token 化**达**毫米级重建精度**，精确建模手部轨迹，供动作学习。

### 3. 多源数据管线
融合**动捕、VR、RGB-only 视频**，构建**百万级**运动指令实例的大规模数据集。

### 4. 结果
- 手部动作生成与指令跟随优异；
- 随**模型/数据规模**良好扩展；
- 真机操作随物理指令微调见效。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DATA["动捕/VR/RGB 视频<br/>百万级运动指令"] --> PIT
    subgraph PIT["物理指令微调"]
        P1["人类视频 VLA 预训练"]
        P2["物理空间对齐(3D 推理)"]
        P3["机器人后训练适配"]
        TOK["部件级运动 token 化(mm 级)"]
    end
    PIT --> OUT["🤖 手部动作生成 + 指令跟随<br/>随规模扩展 · 真机见效"]

    style PIT fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **人手作基础操作器**：从网络规模人类视频学灵巧 VLA；
2. **物理指令微调**：VLA 预训练 + 物理空间对齐 + 机器人适配；
3. **部件级运动 token 化**：毫米级精度建模手轨迹；
4. **百万级多源数据 + 规模化**：动捕/VR/RGB，随规模扩展、真机见效。

---

## 🤖 对人形机器人学习的启发

- **"人手 = 基础操作器"**是把网络视频转成操作先验的有力视角；
- **物理空间对齐**让 2D 视频学到 3D 可执行动作，弥合 sim-to-real；
- **运动 token 化**把连续手轨离散化，便于 VLA 建模；
- 与 H-RDT、In-N-On 等共同壮大"人类视频 → 灵巧操作"路线。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2507.15597](https://arxiv.org/abs/2507.15597) | 论文正文（物理指令微调、运动 token 化、数据管线、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人类数据 VLA**：[H-RDT](../H-RDT__Human_Manipulation_Enhanced_Bimanual_Robotic_Manipulation/H-RDT__Human_Manipulation_Enhanced_Bimanual_Robotic_Manipulation.html) · [In-N-On·Human0](../In-N-On__Scaling_Egocentric_Manipulation_with_in-the-wild_and_on-task_Data/In-N-On__Scaling_Egocentric_Manipulation_with_in-the-wild_and_on-task_Data.html) · [EgoDex](../EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video/EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video.html)。
