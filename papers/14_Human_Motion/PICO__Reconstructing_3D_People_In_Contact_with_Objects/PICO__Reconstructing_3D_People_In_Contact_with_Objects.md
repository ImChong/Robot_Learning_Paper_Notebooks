---
layout: paper
title: "PICO: Reconstructing 3D People In Contact with Objects"
zhname: "PICO：重建与物体接触的 3D 人体"
category: "Human Motion"
arxiv: "2504.17695"
---

# PICO: Reconstructing 3D People In Contact with Objects
**PICO：重建与物体接触的 3D 人体**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 人-物交互 · 单图重建 · 接触标注 · SMPL-X · 渲染-比较
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 4 月 |
| arXiv | [2504.17695](https://arxiv.org/abs/2504.17695) · [PDF](https://arxiv.org/pdf/2504.17695) · [HTML](https://arxiv.org/html/2504.17695v1) |
| 作者 | Alpár Cseke、Shashank Tripathi、Sai Kumar Dwivedi、Michael J. Black、Dimitrios Tzionas（MPI / 图宾根等） |
| 主题 | cs.CV · 人-物交互 / 单图 3D 重建 / 接触 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 从**单张彩色图**恢复 **3D 人-物交互（HOI）**很难：**深度歧义、遮挡、物体形状外观差异巨大**。以往工作需**受控设置**（已知物体形状/接触）且只处理有限物体类。PICO 想**泛化到自然图像与新物体类**，用两条思路：① 构建 **PICO-db** ——自然图像，**唯一地**配对**身体与物体网格上的稠密 3D 接触**：借**视觉基础模型**从数据库**检索合适 3D 物体网格**，再用一种**每补丁仅 2 次点击**的新方法把（DAMON 的）身体接触补丁**投影到物体**，以最小人工建立丰富的身-物接触对应；② 用 **PICO-fit** ——一种**渲染-比较（render-and-compare）拟合**方法，为 SMPL-X 身体推断接触、从 PICO-db 检索可能的 3D 物体网格与接触，并据接触**迭代拟合**身体与物体网格到图像证据。PICO 对**许多现有方法无法处理的物体类别**都работает（泛化好）。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| HOI | Human-Object Interaction，人-物交互 |
| PICO-db | 本文接触标注数据集 |
| PICO-fit | 渲染-比较拟合方法 |
| SMPL-X | 参数化人体模型 |
| Render-and-compare | 渲染-比较优化 |
| Contact Correspondence | 身-物接触对应 |

---

## ❓ 论文要解决什么问题？

单图 3D 人-物交互重建难：
- **深度歧义、遮挡、物体多样**；
- 以往需**已知物体/接触**、只限少数类；
- 缺**身-物双侧接触**标注。

PICO 要：泛化到**自然图像 + 新物体类**的 3D HOI 重建。

---

## 🔧 方法详解

### 1. PICO-db：身-物双侧稠密接触数据
借**视觉基础模型**检索 3D 物体网格，用**每补丁 2 次点击**把身体接触投影到物体，得到**身体 + 物体双侧**的稠密 3D 接触对应。

### 2. PICO-fit：渲染-比较拟合
为 SMPL-X 推断接触、检索物体网格与接触，依**接触**迭代**渲染-比较**拟合身体与物体网格到图像证据。

### 3. 泛化
对**许多以往方法无法处理的物体类**都有效，无需预知物体几何/接触。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    IMG["🖼️ 单张彩色图"] --> FIT
    DB["PICO-db<br/>(身-物双侧接触, VFM 检索+2点击)"] --> FIT
    subgraph FIT["PICO-fit 渲染-比较"]
        F["依接触迭代拟合 SMPL-X + 物体网格"]
    end
    FIT --> OUT["🧍📦 3D 人-物交互<br/>泛化到新物体类"]

    style FIT fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **PICO-db**：自然图像 + 身-物双侧稠密 3D 接触（VFM 检索 + 2 点击投影）；
2. **PICO-fit**：基于接触的渲染-比较拟合；
3. **泛化新物体类**：无需预知物体几何/接触；
4. **大规模 HOI 理解**：从单图恢复交互。

---

## 🤖 对人形机器人学习的启发

- **接触是人-物交互的核心线索**，呼应本仓多篇"接触为中心"的人形交互/操作工作；
- **身-物双侧接触标注**对学习抓取/操作的接触先验有价值；
- **VFM 检索 + 最小人工标注**是低成本造数据的范式；
- 人-物交互重建可为人形操作提供目标/接触监督。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2504.17695](https://arxiv.org/abs/2504.17695) | 论文正文（PICO-db、PICO-fit、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人体/交互重建**：[ClimbingCap（攀岩动捕）](../ClimbingCap__Multi-Modal_Dataset_and_Method_for_Rock_Climbing_in_World_Coordinate/ClimbingCap__Multi-Modal_Dataset_and_Method_for_Rock_Climbing_in_World_Coordinate.html)；
- **接触为中心（本仓 04）**：[从人-人示范学人-人形交互（PAIR）](../../04_Loco-Manipulation_and_WBC/Learning_Whole-Body_Human-Humanoid_Interaction_from_Human-Human_Demonstrations/Learning_Whole-Body_Human-Humanoid_Interaction_from_Human-Human_Demonstrations.html)。
