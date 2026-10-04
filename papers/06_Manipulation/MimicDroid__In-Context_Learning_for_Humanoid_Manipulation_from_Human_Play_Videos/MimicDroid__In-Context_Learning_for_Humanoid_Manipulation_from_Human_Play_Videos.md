---
layout: paper
title: "MimicDroid: In-Context Learning for Humanoid Robot Manipulation from Human Play Videos"
zhname: "MimicDroid：从人类玩耍视频做人形操作的上下文学习"
category: "Manipulation"
arxiv: "2509.09769"
---

# MimicDroid: In-Context Learning for Humanoid Robot Manipulation from Human Play Videos
**让人形用上下文学习从少量视频快速学新操作任务：不靠费力的遥操作数据，而用「人类玩耍视频」这种连续无标注的自由交互视频做训练源；从中抽取行为相似的轨迹对、训练策略以一条轨迹为条件预测另一条的动作，从而获得测试时适应新物体/环境的 ICL 能力；用运动学相似性重定向人手腕姿态、训练时随机块遮挡降过拟合，真机成功率近两倍于 SOTA**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 上下文学习 ICL · 人类玩耍视频 · 少样本 · 重定向 · 真机
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 9 月 |
| arXiv | [2509.09769](https://arxiv.org/abs/2509.09769) · [PDF](https://arxiv.org/pdf/2509.09769) · [HTML](https://arxiv.org/html/2509.09769v1) |
| 作者 | Rutav Shah、Shuijing Liu、Zhenyu Jiang、Mingyo Seo、Roberto Martín-Martín、Yuke Zhu（UT Austin） |
| 主题 | cs.RO · 上下文学习 / 人类玩耍视频 / 人形操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 目标是让人形从**少量视频示例**高效解决**新操作任务**。**上下文学习（ICL）**因**测试时数据高效、快速适应**而有前景，但现有 ICL 方法依赖**费力的遥操作数据**，难规模化。本文用**人类玩耍视频（human play videos）**——人们**自由与环境交互**的**连续、无标注**视频——作为**可扩展、多样**的训练源。提出 **MimicDroid**：仅用人类玩耍视频做训练，**抽取行为相似的轨迹对**，训练策略**以一条轨迹为条件预测另一条的动作**，从而获得**测试时适应新物体/环境**的 **ICL 能力**。为弥合具身差距，先用**运动学相似性**把 RGB 视频估计的**人手腕姿态重定向**到人形；训练时**随机块遮挡（patch masking）**降低对人类特有线索的过拟合、增强对视觉差异的鲁棒。作者还提出一个**开源仿真基准**（难度递增）评估少样本学习；MimicDroid **优于 SOTA**，真机成功率**近两倍**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| ICL | In-Context Learning，上下文学习 |
| Play Video | 玩耍视频，自由交互的无标注视频 |
| Trajectory Pair | 轨迹对，行为相似的两段 |
| Retargeting | 重定向（人手腕→人形） |
| Patch Masking | 随机块遮挡，防过拟合 |
| Few-shot | 少样本 |

---

## ❓ 论文要解决什么问题？

让人形**少样本快速学新任务**：
- ICL 有前景，但**依赖遥操作数据**，难规模化；
- 想用**人类玩耍视频**（海量、无标注），但有**具身差距**与**人类特有线索过拟合**。

MimicDroid 要：**仅用人类玩耍视频**训练出有 ICL 能力的人形操作策略。

---

## 🔧 方法详解

### 1. 从玩耍视频抽轨迹对、学 ICL
抽取**行为相似的轨迹对**，训练策略**以一条为条件预测另一条的动作**——这赋予模型**测试时**对新物体/环境的**ICL 适应**能力。

### 2. 重定向人手腕姿态
用**运动学相似性**把 RGB 估计的**人手腕姿态重定向**到人形，弥合具身差距。

### 3. 随机块遮挡防过拟合
训练时**随机块遮挡**，减少对**人类特有视觉线索**的过拟合，增强对人-机视觉差异的鲁棒。

### 4. 基准与结果
- 开源**仿真基准**（难度递增）评估少样本；
- **优于 SOTA**，真机成功率**近两倍**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    PLAY["🎥 人类玩耍视频(无标注)"] --> PAIR["抽取行为相似轨迹对"]
    PAIR --> POL
    subgraph POL["MimicDroid (ICL)"]
        C["以一条轨迹为条件预测另一条动作"]
        R["手腕重定向 + 随机块遮挡"]
    end
    POL --> OUT["🤖 测试时适应新物体/环境<br/>真机成功率≈2×SOTA"]

    style POL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **仅用人类玩耍视频的 ICL**：摆脱对遥操作数据的依赖；
2. **轨迹对条件预测**：获得测试时少样本适应能力；
3. **重定向 + 块遮挡**：弥合具身差距、防过拟合；
4. **开源基准 + 真机≈2×SOTA**。

---

## 🤖 对人形机器人学习的启发

- **人类玩耍视频是海量免费的 ICL 训练源**，比遥操作更可扩展；
- **ICL 让人形"看几个例子就会"**，是快速适应的诱人范式；
- **随机块遮挡**是缓解人-机视觉差异过拟合的简单有效技巧；
- 与 In-N-On、Masquerade 等"从人类视频学操作"路线互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2509.09769](https://arxiv.org/abs/2509.09769) | 论文正文（ICL、轨迹对、重定向、基准实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·从人类视频学操作**：[Masquerade（编辑视频闭合视觉差距）](../Masquerade__Learning_from_In-the-wild_Human_Videos_using_Data-Editing/Masquerade__Learning_from_In-the-wild_Human_Videos_using_Data-Editing.html) · [In-N-On](../In-N-On__Scaling_Egocentric_Manipulation_with_in-the-wild_and_on-task_Data/In-N-On__Scaling_Egocentric_Manipulation_with_in-the-wild_and_on-task_Data.html)。
