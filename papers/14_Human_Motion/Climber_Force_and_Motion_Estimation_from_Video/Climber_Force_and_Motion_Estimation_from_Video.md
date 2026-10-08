---
layout: paper
title: "Climber Force and Motion Estimation from Video"
zhname: "从视频估计攀岩者的受力与运动"
category: "Human Motion"
---

# Climber Force and Motion Estimation from Video
**从视频估计攀岩者的受力与运动**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 攀岩 · 受力估计 · 运动估计 · 单目视频 · 人-岩接触
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 4 月（arXiv，详见项目页） |
| 项目页 | [rihat99.github.io/climb_force](https://rihat99.github.io/climb_force/) |
| 主题 | cs.CV · 攀岩运动分析 / 受力估计 / 人-物交互 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块（上游标 arXiv 2025.04，未给具体链接）。

---

## 🎯 一句话总结

> 本工作研究从**视频**同时估计**攀岩者的运动与受力**：在攀岩这一**强接触、离地、全身**的运动下，恢复攀岩者的 **3D 运动**以及其作用于**岩点（holds）**的**接触受力**。相较于需要在岩壁/岩点上布置**力传感器**的侵入式方案，本方法仅凭**视频**就能推断**人-岩交互力**，从而**非侵入地**分析攀岩动作与**发力模式**。这属于"从视频做**力 + 运动**联合估计"的范式——把**人体姿态估计**与**接触/力推断**结合，对运动科学、教练辅助乃至机器人攀爬都有参考价值。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Force Estimation | 受力（接触力）估计 |
| Motion Estimation | 3D 运动/姿态估计 |
| Hold | 岩点（攀岩抓握/踩踏点） |
| Contact | 人-岩接触 |
| Monocular Video | 单目（普通）视频 |
| Non-invasive | 非侵入（免力传感器） |

---

## ❓ 论文要解决什么问题？

攀岩的**受力分析**通常要**侵入式力传感**（岩点/岩壁布传感器），成本高、难普及；而：
- 攀岩是**强接触、离地、全身**运动，姿态与受力都难估；
- 想**仅凭视频**就同时得到**运动 + 受力**。

本工作要：从普通视频**非侵入地**联合估计攀岩者的**3D 运动与接触受力**。

---

## 🔧 方法详解

> 说明：以下为依据论文标题与项目页所做的范式层面梳理；具体网络结构与数值以正式论文为准。

### 1. 视频 → 3D 攀岩运动
先从视频做**3D 人体姿态/运动估计**，恢复攀岩者在世界/相机坐标下的全身运动（强接触、离地场景对姿态估计是难点）。

### 2. 接触与受力推断
在估计的运动基础上，**推断人-岩接触**与作用于**岩点的受力**——把"运动学"与"动力学（接触力）"联系起来，本质是一个**力 + 运动**联合估计问题。

### 3. 非侵入分析
无需在岩点布置力传感器，仅凭**视频**即可分析攀岩**发力模式**，便于规模化采集与教练/科研应用。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    VID["🎥 攀岩单目视频"] --> POSE["3D 攀岩运动估计"]
    POSE --> FORCE["接触 + 岩点受力推断"]
    FORCE --> OUT["🧗 非侵入的运动 + 受力分析<br/>(免力传感器)"]

    style POSE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style FORCE fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **从视频联合估计攀岩运动 + 受力**：非侵入；
2. **强接触/离地全身**场景下的姿态 + 接触力推断；
3. **免力传感器**：仅凭视频分析发力模式；
4. **面向运动科学/教练/机器人攀爬**的分析工具。

---

## 🤖 对人形机器人学习的启发

- **"从视频估接触力"对强接触全身任务很有价值**：攀岩、搬运、推压等都需理解接触力；
- **运动 + 受力联合估计**把运动学与动力学连接，呼应人形 loco-manip 对"外力来源建模"的诉求；
- 攀岩这类**离地多接触**运动可为人形攀爬/跑酷提供参考与受力先验；
- 非侵入受力估计有望低成本扩充"带力标注"的人类数据。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [项目页 rihat99.github.io/climb_force](https://rihat99.github.io/climb_force/) | 概述、视频、方法（含 arXiv 链接） |

> ℹ️ 备注：上游标注为 **arXiv 2025.04** 但未给出具体编号；本笔记依据**标题与项目页**所做范式层面整理，**方法细节与数值以正式论文/PDF 为准**，arXiv 编号待补。

---

## 🔗 相关阅读

- **同模块·攀岩/人-物接触**：[ClimbingCap（攀岩多模态动捕）](../ClimbingCap__Multi-Modal_Dataset_and_Method_for_Rock_Climbing_in_World_Coordinate/ClimbingCap__Multi-Modal_Dataset_and_Method_for_Rock_Climbing_in_World_Coordinate.html) · [PICO（人-物接触重建）](../PICO__Reconstructing_3D_People_In_Contact_with_Objects/PICO__Reconstructing_3D_People_In_Contact_with_Objects.html)；
- **接触/力（本仓 04）**：[CHIP（可控柔顺）](../../04_Loco-Manipulation_and_WBC/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html)。
