---
layout: paper
title: "Masquerade: Learning from In-the-wild Human Videos using Data-Editing"
zhname: "Masquerade：用数据编辑从野外人类视频学习"
category: "Manipulation"
arxiv: "2508.09976"
---

# Masquerade: Learning from In-the-wild Human Videos using Data-Editing
**通过「数据编辑」闭合人-机视觉具身差距：把每段野外第一视角人类视频改造成机器人化演示——估计 3D 手姿、修复涂抹人臂、叠加跟踪末端轨迹的渲染双臂机器人；在 67.5 万帧编辑片段上预训练视觉编码器预测未来 2D 机器人关键点，再在每任务仅 50 条机器人演示上微调扩散策略头，三个长时程双手厨房任务、各三个未见场景上较基线提升 5–6 倍，性能随编辑视频量对数增长**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 数据编辑 · 视觉具身差距 · 机器人叠加 · 协同训练 · 双手厨房
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 8 月 |
| arXiv | [2508.09976](https://arxiv.org/abs/2508.09976) · [PDF](https://arxiv.org/pdf/2508.09976) · [HTML](https://arxiv.org/html/2508.09976v1) |
| 作者 | Marion Lepert、Jiaying Fang、Jeannette Bohg（Stanford） |
| 主题 | cs.RO · 数据编辑 / 从人类视频学习 / 双手操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 机器人操作仍**数据稀缺**——最大的机器人数据集也比驱动语言/视觉突破的数据**小几个数量级**。Masquerade 通过**编辑野外第一视角人类视频**来**闭合人-机视觉具身差距**，再用编辑后的视频学**机器人策略**。流程把每段人类视频变成**机器人化演示**：① 估计 **3D 手姿**；② **修复涂抹（inpaint）人臂**；③ **叠加渲染的双臂机器人**，使其**跟踪恢复的末端轨迹**。在 **67.5 万帧**编辑片段上**预训练视觉编码器**以**预测未来 2D 机器人关键点**，并在**每任务仅 50 条机器人演示**上微调**扩散策略头**（继续保留该辅助损失），所得策略**泛化显著更好**。在**三个长时程双手厨房任务**、各**三个未见场景**上，Masquerade 较基线**高 5–6 倍**；消融显示**机器人叠加**与**协同训练**都不可或缺，性能随编辑人类视频量**对数增长**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Data-Editing | 数据编辑，把人类视频改造成机器人演示 |
| Inpainting | 图像修复，涂掉人臂 |
| Robot Overlay | 叠加渲染机器人 |
| Co-training | 协同训练（辅助损失 + 策略） |
| 2D Keypoints | 2D 机器人关键点 |
| Visual Embodiment Gap | 视觉具身差距 |

---

## ❓ 论文要解决什么问题？

机器人数据稀缺，人类视频海量但有**视觉具身差距**（看起来是人手不是机器人）：
- 直接学人类视频，策略看到的视觉与机器人不一致；
- 需要**闭合视觉差距**才能用好人类视频。

Masquerade 要：用**数据编辑**把人类视频"机器人化"，从而利用海量人类视频。

---

## 🔧 方法详解

### 1. 三步数据编辑（人类视频 → 机器人演示）
- **估计 3D 手姿**；
- **修复涂抹人臂**；
- **叠加渲染双臂机器人**跟踪恢复的末端轨迹。

视觉上"变成机器人在做"。

### 2. 预训练 + 协同训练
在 **67.5 万帧**编辑片段上**预训练视觉编码器**预测**未来 2D 机器人关键点**；微调时**继续保留该辅助损失**（co-training），只用**每任务 50 条机器人演示**微调**扩散策略头**。

### 3. 结果
- 三个长时程双手厨房任务、各三未见场景，较基线**5–6 倍**；
- 消融：**机器人叠加**与**协同训练**缺一不可；
- 性能随编辑视频量**对数增长**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    H["🎥 野外第一视角人类视频"] --> EDIT
    subgraph EDIT["数据编辑"]
        E1["3D 手姿估计"]
        E2["修复涂抹人臂"]
        E3["叠加渲染双臂机器人"]
        E1 --> E2 --> E3
    end
    EDIT --> PRE["67.5万帧预训练<br/>预测未来 2D 关键点"]
    PRE --> FT["+50 演示/任务微调扩散头(协同训练)"]
    FT --> OUT["🤖 双手厨房任务 5–6×基线<br/>随数据对数增长"]

    style EDIT fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **数据编辑闭合视觉具身差距**：手姿估计 + 涂臂 + 机器人叠加；
2. **预训练 + 协同训练**：67.5 万帧预测 2D 关键点，仅 50 演示/任务微调；
3. **显著泛化**：双手厨房任务较基线 5–6 倍；
4. **可扩展**：性能随编辑视频量对数增长。

---

## 🤖 对人形机器人学习的启发

- **"把人类视频改造成机器人样子"是用好人类数据的关键洞见**：视觉一致才好学；
- **机器人叠加 + 协同训练缺一不可**，提示视觉对齐与辅助监督的协同；
- **少量机器人演示 + 海量编辑视频**是高性价比配方；
- 与 MimicDroid、In-N-On 等共同推进从人类视频学操作。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2508.09976](https://arxiv.org/abs/2508.09976) | 论文正文（数据编辑、预训练、双手厨房实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（5–6×、67.5 万帧）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·从人类视频学操作**：[MimicDroid](../MimicDroid__In-Context_Learning_for_Humanoid_Manipulation_from_Human_Play_Videos/MimicDroid__In-Context_Learning_for_Humanoid_Manipulation_from_Human_Play_Videos.html) · [Dexterity from Smart Lenses](../Dexterity_from_Smart_Lenses__Multi-Fingered_Manipulation_with_In-the-Wild_Human_Demos/Dexterity_from_Smart_Lenses__Multi-Fingered_Manipulation_with_In-the-Wild_Human_Demos.html)。
