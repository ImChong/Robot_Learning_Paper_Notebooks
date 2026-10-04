---
layout: paper
title: "Object-Centric Dexterous Manipulation from Human Motion Data"
zhname: "以物体为中心：从人类动作数据学习灵巧操作"
category: "Manipulation"
arxiv: "2411.04005"
---

# Object-Centric Dexterous Manipulation from Human Motion Data
**把物体操控到目标状态是灵巧操作的基本技能，人手动作是宝贵数据；为弥合人-机手具身差距，提出分层策略：高层用大规模人手动捕训练的轨迹生成模型、依目标物体状态合成手腕运动，低层用深度强化学习在机器人本体上做手指操控；在 10 个家用物体上评测，对新几何与新目标状态泛化，并在双臂灵巧系统上完成 sim-to-real**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 以物体为中心 · 人手动捕 · 分层策略 · 手指 RL · Sim-to-Real
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 11 月 |
| arXiv | [2411.04005](https://arxiv.org/abs/2411.04005) · [PDF](https://arxiv.org/pdf/2411.04005) · [HTML](https://arxiv.org/html/2411.04005v1) |
| 作者 | Yuanpei Chen、Chen Wang、Yaodong Yang、C. Karen Liu（Stanford / 北大） |
| 主题 | cs.RO · 灵巧操作 / 人手动捕 / 分层策略 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 把**物体操控到目标状态**是灵巧操作的基本而重要的技能。**人手动作**展现了高超操控力，是训练**多指手**机器人的宝贵数据。本文通过**分层策略**弥合**人手与机器人手的具身差距**：① **高层**——在**大规模人手动捕数据**上训练的**轨迹生成模型**，**依目标物体状态**合成**手腕运动**；② **低层**——用**深度强化学习**做**手指操控**控制器，**扎根于机器人本体**。在 **10 个家用物体**上评测，对**新物体几何与新目标状态**泛化，并在**双臂灵巧机器人**系统上完成 **sim-to-real**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Object-Centric | 以物体（目标状态）为中心 |
| Hierarchical | 分层（高层轨迹 + 低层手指） |
| Wrist Motion | 手腕运动（高层合成） |
| Finger RL | 手指控制的深度强化学习 |
| Embodiment Gap | 人-机手具身差距 |
| Goal State | 物体目标状态 |

---

## ❓ 论文要解决什么问题？

用人手动捕学机器人灵巧操作有**具身差距**：
- 人手与机器人手**形态/自由度不同**；
- 要**把物体操控到目标状态**，需手腕 + 手指协同；
- 要对**新物体/新目标**泛化。

论文要：**分层**地用人手动捕学**以物体为中心**的灵巧操作。

---

## 🔧 方法详解

### 1. 高层：人手动捕轨迹生成（合成手腕运动）
在**大规模人手动捕**上训练**轨迹生成模型**，**依目标物体状态**合成**手腕运动**——管"手该往哪走"。

### 2. 低层：手指操控 RL（扎根机器人本体）
**深度强化学习**控制器做**手指操控**，**grounded 在机器人手本体**——管"手指怎么动"，弥合具身差距。

### 3. 评测
- **10 个家用物体**；
- 对**新几何 + 新目标状态**泛化；
- **双臂灵巧系统** sim-to-real。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    GOAL["🎯 目标物体状态"] --> HI
    MOCAP["🖐️ 大规模人手动捕"] --> HI
    subgraph HI["高层：轨迹生成"]
        W["合成手腕运动"]
    end
    HI --> LOW["低层：手指 RL<br/>(机器人本体)"]
    LOW --> OUT["🤖 10 家用物体<br/>新几何/新目标泛化 · 双臂 sim-to-real"]

    style HI fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style LOW fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **以物体为中心的灵巧操作**：操控物体到目标状态；
2. **分层策略弥合具身差距**：高层人手动捕轨迹 + 低层手指 RL；
3. **泛化**：新物体几何与新目标状态；
4. **双臂 sim-to-real**：10 家用物体真机验证。

---

## 🤖 对人形机器人学习的启发

- **"高层人类轨迹 + 低层机器人 RL"是弥合手部具身差距的经典分层**；
- **以目标状态为中心**让任务定义清晰、便于泛化；
- 人手动捕是灵巧操作的宝贵先验（与 EgoDex、Being-H0 同源思路）；
- 对人形双手灵巧操作直接适用。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2411.04005](https://arxiv.org/abs/2411.04005) | 论文正文（分层策略、手指 RL、家用物体实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·灵巧/人手数据**：[Lightning Grasp（程序化抓取）](../Lightning_Grasp__High_Performance_Procedural_Grasp_Synthesis_with_Contact_Fields/Lightning_Grasp__High_Performance_Procedural_Grasp_Synthesis_with_Contact_Fields.html) · [EgoDex](../EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video/EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video.html)。
