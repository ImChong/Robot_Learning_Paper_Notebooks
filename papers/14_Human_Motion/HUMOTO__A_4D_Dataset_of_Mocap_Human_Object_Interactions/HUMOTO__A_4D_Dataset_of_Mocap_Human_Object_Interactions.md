---
layout: paper
title: "HUMOTO: A 4D Dataset of Mocap Human Object Interactions"
zhname: "HUMOTO：人-物交互动作捕捉 4D 数据集"
category: "Human Motion"
arxiv: "2504.10414"
---

# HUMOTO: A 4D Dataset of Mocap Human Object Interactions
**HUMOTO：人-物交互动作捕捉 4D 数据集**

> 📅 阅读日期: 2026-07-09
>
> 🏷️ 板块: 14 Human Motion · 人-物交互(HOI) · 4D 动捕数据集 · LLM 场景编剧 · UT Austin × Adobe Research
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → 14_Human_Motion，与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 4 月（arXiv v1：2025-04-14；v2：2025-10-15）· ICCV 2025 |
| 作者 | Jiaxin Lu, Chun-Hao Paul Huang, Uttaran Bhattacharya, Qixing Huang, Yi Zhou |
| 机构 | 德州大学奥斯汀分校（UT Austin） · Adobe Research |
| arXiv | [2504.10414](https://arxiv.org/abs/2504.10414) · [PDF](https://arxiv.org/pdf/2504.10414) · [HTML](https://arxiv.org/html/2504.10414) |
| 项目页 | [jiaxin-lu.github.io/humoto](https://jiaxin-lu.github.io/humoto/) · [数据访问 adobe-research.github.io/humoto](https://adobe-research.github.io/humoto/) |
| 源码 | 🌟 [github.com/Jiaxin-Lu/humoto](https://github.com/Jiaxin-Lu/humoto) |
| 主题 | cs.CV · 人-物交互 / 动作数据集 / 动作生成 / 姿态估计 / 机器人 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 人-物交互（HOI）数据「录得真、标得准」一直很难：真实交互里手/物频繁**遮挡**、物体几何难精确、动捕清洗成本高，导致已有数据集要么规模小、要么脚滑穿模。HUMOTO 用三步把质量做上去——(1) 让 **LLM 按场景「编剧」** 出有逻辑、有目的的完整任务序列（如做饭、野餐），保证动作是「为完成任务」而非随机摆拍；(2) **动捕 + 多相机** 专门设计以应对遮挡；(3) **专业人工清洗与校验**，最大限度消除脚滑与物体穿透。最终得到 **735 段、约 7875 秒（30fps）** 的高保真序列，含 **63 件精确建模物体** 与 **72 个铰接人体部件**（Mixamo 兼容绑定），可直接喂给动作生成、姿态估计和机器人/具身 AI 研究。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| HOI | Human-Object Interaction，人-物交互 |
| Mocap | Motion Capture，动作捕捉 |
| 4D | 3D 几何 + 时间维度（随时间演化的人体姿态与物体网格） |
| Articulated Parts | 铰接部件（72 个可动人体关节部位） |
| Rigging | 骨骼绑定（此处 Mixamo 兼容，便于复用现成动作） |

---

## ❓ 论文要解决什么问题？

现有人-物交互数据集普遍存在三类痛点：

- **交互质量差**：真实抓取/操作中手与物体互相遮挡，重建常出现脚滑、物体穿透；
- **缺乏「目的性」**：很多序列是零散摆拍，没有「为完成某个任务」的逻辑连贯动作；
- **物体几何粗糙**：物体网格不精确，难以支撑接触/物理层面的下游研究。

HUMOTO 想提供一个**高保真、有任务逻辑、物理一致**的 4D 人-物交互数据集，同时服务**动作生成、计算机视觉与机器人**三条线。

---

## 🔧 方法详解

### 1. 场景驱动的 LLM 编剧管线
先用 **LLM 按给定场景「写剧本」**，把一个完整任务拆解为有逻辑推进的动作步骤（例如「切菜→装盘→端上桌」），确保采集到的序列**目的明确、前后连贯**，而不是孤立动作片段。

### 2. 抗遮挡的动捕 + 相机录制
针对人-物交互中频繁的**遮挡**问题，专门设计动作捕捉与多视角相机布置，兼顾**人体姿态**与**物体位姿**的可靠捕获。

### 3. 专业清洗与校验
对采集数据做**人工清洗与校验**，最大限度**消除脚滑（foot sliding）与物体穿透（penetration）**，提升物理一致性；物体用**艺术家精确建模**的网格，人体采用 **72 铰接部件 + Mixamo 兼容绑定**，便于与现成动作库互通。

### 4. 数据规模与基准
最终 **735 段 / ~7875 秒 / 30fps**，覆盖做饭、户外野餐等多类日常活动；论文给出与已有数据集（ParaHome、BEHAVE 等）的**对比基准**，并示范多类下游用途。

---

### 🧭 数据构建与下游用途（mermaid）

<div class="mermaid">
flowchart LR
    subgraph BUILD["数据构建流水线"]
        S["🎬 LLM 场景编剧<br/>目的性任务脚本"] --> R["🎥 动捕 + 多相机录制<br/>抗遮挡设计"]
        R --> C["🧹 专业清洗校验<br/>去脚滑 / 去穿透"]
        C --> D["📦 HUMOTO 4D 数据<br/>735 段 · 7875s@30fps<br/>72 铰接人体部件 · 63 物体网格"]
    end
    D --> G["✨ 动作生成<br/>语言→动作 (MotionGPT)"]
    D --> P["🧍 姿态估计<br/>TRAM / 4D-Humans 评测"]
    D --> B["🤖 机器人 / 具身 AI<br/>PyBullet 物理仿真对比"]
    D --> I["🖼️ 2D 图像编辑<br/>物体增删 · 手-物交互"]

    style D fill:#e8f0fd,stroke:#2c6fbb,color:#14315e
    style G fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style B fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **高保真 4D HOI 数据集**：735 段、63 精确物体、72 铰接人体部件，兼顾几何精度与时间连贯；
2. **场景驱动 LLM 编剧管线**：自动生成有逻辑、有目的的完整任务序列；
3. **抗遮挡采集 + 专业清洗**：显著减少脚滑与物体穿透，保证物理一致性；
4. **多任务基准**：面向动作生成、姿态估计、机器人仿真、2D 图像编辑等给出评测与对比。

---

## 🤖 对人形机器人学习的启发

- **人-物交互数据稀缺**是人形「loco-manipulation」落地的关键瓶颈，HUMOTO 提供了带物体网格与接触细节的成对人-物运动，可作**重定向 / 模仿学习**的高质量素材；
- **物理一致性（去脚滑/穿透）**对下游「人动作→机器人动作」迁移尤为重要，减少违反接触约束的坏样本；
- **LLM 编剧的「目的性任务序列」**思路与人形「语言指令→长时程操作」高度契合，可为任务级数据合成提供范式；
- 与本仓库 [WHOLE](../WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos/WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos.html)、[Efficient and Scalable Monocular HOI](../Efficient_and_Scalable_Monocular_Human-Object_Interaction_Motion_Reconstruction/Efficient_and_Scalable_Monocular_Human-Object_Interaction_Motion_Reconstruction.html) 的「人-物交互重建」形成数据侧互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2504.10414](https://arxiv.org/abs/2504.10414) | 论文正文（数据构建管线、统计、下游基准） |
| [项目页](https://jiaxin-lu.github.io/humoto/) · [数据访问](https://adobe-research.github.io/humoto/) | 概述、可视化与数据申请入口 |
| [GitHub Jiaxin-Lu/humoto](https://github.com/Jiaxin-Lu/humoto) | 官方代码 / 数据工具 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与项目页整理；**具体统计与实验数值以原文 / PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人-物交互重建**：[WHOLE](../WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos/WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos.html) · [Efficient and Scalable Monocular HOI](../Efficient_and_Scalable_Monocular_Human-Object_Interaction_Motion_Reconstruction/Efficient_and_Scalable_Monocular_Human-Object_Interaction_Motion_Reconstruction.html) · [PICO](../PICO__Reconstructing_3D_People_In_Contact_with_Objects/PICO__Reconstructing_3D_People_In_Contact_with_Objects.html)。
- **同模块·动作生成/通才模型**：[GENMO](../GENMO__A_Generalist_Model_for_Human_Motion/GENMO__A_Generalist_Model_for_Human_Motion.html) · [Go to Zero](../Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data/Go_to_Zero__Towards_Zero-shot_Motion_Generation_with_Million-scale_Data.html)。
