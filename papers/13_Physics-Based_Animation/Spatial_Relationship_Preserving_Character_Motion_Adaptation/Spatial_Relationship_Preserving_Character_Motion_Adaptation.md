---
layout: paper
title: "Spatial Relationship Preserving Character Motion Adaptation"
zhname: "保持空间关系的角色运动适配"
category: "Physics-Based Animation"
---

# Spatial Relationship Preserving Character Motion Adaptation
**面向「身体部位/多角色/角色-环境之间紧密交互」的运动编辑与重定向（跳舞、摔跤、剑斗、钻进车里等），提出用「交互网格（interaction mesh）」结构表示空间关系：在编辑各帧时最小化交互网格的局部形变，从而保持这些紧密空间关系、同时减少不当穿插；该表示通用，可统一处理单/多角色的身体部位与环境物体（SIGGRAPH 2010 / ACM TOG）**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 13 Physics-Based Animation · 运动适配 · 交互网格 · 空间关系保持 · 重定向 · SIGGRAPH 2010
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2010 年（SIGGRAPH 2010 / ACM TOG 29(4)） |
| 发表 | [ACM TOG / SIGGRAPH 2010](https://dl.acm.org/doi/10.1145/1778765.1778770) · [预印本 PDF](http://www.edho.net/projects/mesh/SIGGRAPH10_preprint.pdf) |
| 作者 | Edmond S. L. Ho、Taku Komura、Chiew-Lan Tai |
| 主题 | cs.GR · 角色动画 / 运动编辑与重定向 / 交互 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Physics-Based Animation 模块（经典工作，无 arXiv）。

---

## 🎯 一句话总结

> 本文提出一种**编辑与重定向**运动的新方法，专门针对涉及**身体部位之间紧密交互**的运动——可以是**单个或多个**关节化角色之间（如**跳舞、摔跤、剑斗**），也可以是**角色与受限环境**之间（如**钻进车里**）。核心是引入一个结构——**交互网格（interaction mesh）**——来**表示空间关系**。通过在动画各帧上**最小化交互网格的局部形变（local deformation）**，这些**紧密空间关系**在运动编辑/重定向时被**保持**，同时**减少不当的相互穿插（interpenetration）**。交互网格表示**通用**，对**单/多角色的交互身体部位**以及**环境中的物体**提供**统一处理**，适用于跳舞（单角色不同部位紧密交互）、摔跤/格斗游戏（多角色交互）等多种场景。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Interaction Mesh | 交互网格，表示部位/角色/物体间空间关系 |
| Motion Adaptation | 运动适配（编辑 + 重定向） |
| Spatial Relationship | 空间关系（紧密交互） |
| Local Deformation | 局部形变（最小化以保关系） |
| Interpenetration | 相互穿插（要减少） |
| Retargeting | 重定向（到不同体型/环境） |

---

## ❓ 论文要解决什么问题？

编辑/重定向**紧密交互**的运动很难：
- 跳舞、摔跤、剑斗、钻车等涉及**部位/角色/环境**间**紧密空间关系**；
- 朴素编辑会**破坏关系**或产生**穿插**；
- 需要一种**通用**表示统一处理单/多角色与物体。

本文要：在编辑/重定向时**保持空间关系**、**减少穿插**。

---

## 🔧 方法详解

### 1. 交互网格表示空间关系
构造一个**交互网格**，把**交互的身体部位、多个角色、环境物体**之间的**空间关系**编码进一个统一的网格结构。

### 2. 最小化局部形变以保关系
在动画**各帧**上**最小化交互网格的局部形变**：直观上，"关系网"尽量少变形 → **紧密空间关系被保持**，同时**减少不当穿插**。

### 3. 统一、通用
该表示对**单角色不同部位**（跳舞）、**多角色交互**（摔跤/格斗）、**角色-环境**（钻车）都适用，提供**统一处理**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    MO["🎞️ 原始交互运动<br/>(跳舞/摔跤/钻车…)"] --> IM
    subgraph IM["交互网格表示"]
        R["编码部位/角色/物体空间关系"]
    end
    IM --> EDIT["编辑/重定向时<br/>最小化交互网格局部形变"]
    EDIT --> OUT["🕺 保持紧密空间关系<br/>减少穿插 (SIGGRAPH 2010)"]

    style IM fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **交互网格（interaction mesh）**：统一表示部位/角色/物体间空间关系；
2. **最小化局部形变保关系**：编辑/重定向时保持紧密交互、减少穿插；
3. **通用统一**：单/多角色与环境物体一体处理；
4. **经典基础**：紧密交互运动编辑的奠基性工作（SIGGRAPH 2010）。

---

## 🤖 对人形机器人学习的启发

- **"交互网格 + 保空间关系"对人-人/人-物交互重定向有直接借鉴**：呼应本仓 04 的 PAIR（接触/关系保持的交互重定向）；
- **减少穿插**正是人形动作重定向/接触任务要解决的；
- **统一处理部位/角色/物体**的思想，对多接触全身任务的关系建模有价值；
- 作为经典图形学工作，为当代"接触/关系保持"的数据生成提供思想源头。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [ACM TOG / SIGGRAPH 2010](https://dl.acm.org/doi/10.1145/1778765.1778770) | 正式论文 |
| [预印本 PDF](http://www.edho.net/projects/mesh/SIGGRAPH10_preprint.pdf) | 作者预印本 |

> ℹ️ 备注：本文为 SIGGRAPH 2010 / ACM TOG 经典工作，**无 arXiv**；本笔记依据论文公开摘要与预印本整理，**细节以正式论文为准**。

---

## 🔗 相关阅读

- **相关·接触/关系保持的交互重定向（本仓 04）**：[从人-人示范学人-人形交互（PAIR + D-STAR）](../../04_Loco-Manipulation_and_WBC/Learning_Whole-Body_Human-Humanoid_Interaction_from_Human-Human_Demonstrations/Learning_Whole-Body_Human-Humanoid_Interaction_from_Human-Human_Demonstrations.html)；
- **人-物接触（本仓 14）**：[PICO（人-物接触重建）](../../14_Human_Motion/PICO__Reconstructing_3D_People_In_Contact_with_Objects/PICO__Reconstructing_3D_People_In_Contact_with_Objects.html)。
