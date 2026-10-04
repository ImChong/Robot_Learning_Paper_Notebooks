---
layout: paper
title: "MobileH2R: Learning Generalizable Human to Mobile Robot Handover Exclusively from Scalable and Diverse Synthetic Data"
zhname: "MobileH2R：仅用可扩展多样合成数据学习泛化的人到移动机器人递交"
category: "Manipulation"
arxiv: "2501.04595"
---

# MobileH2R: Learning Generalizable Human to Mobile Robot Handover Exclusively from Scalable and Diverse Synthetic Data
**面向「人到移动机器人」递交：不同于固定底座递交，移动机器人要借移动性在大工作空间里可靠接物；MobileH2R 完全用可扩展多样的合成数据学习视觉递交技能——可扩展地生成多样全身人体运动数据、自动造安全且易模仿的演示、用高效 4D 模仿学习协调底盘与机械臂；仿真与真机较基线成功率至少 +15%**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 人机递交 · 移动机器人 · 合成数据 · 4D 模仿 · 底盘-臂协调
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 1 月 |
| arXiv | [2501.04595](https://arxiv.org/abs/2501.04595) · [PDF](https://arxiv.org/pdf/2501.04595) · [HTML](https://arxiv.org/html/2501.04595v1) |
| 作者 | Zifan Wang、Ziqing Chen、Junyu Chen、Yunze Liu、Xueyi Liu、He Wang、Li Yi 等（清华等） |
| 主题 | cs.RO · 人机递交 / 移动操作 / 合成数据 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> MobileH2R 是一个学习**泛化的、基于视觉的「人到移动机器人（H2MR）递交」**技能的框架。不同于传统**固定底座**递交，该任务要求**移动机器人**借**移动性**在**大工作空间**里**可靠接物**。MobileH2R **完全用可扩展、多样的合成数据**学习，开发了三类技术：① **可扩展地生成多样的全身人体运动数据**；② **自动**造**安全、易模仿**的演示；③ **高效的 4D 模仿学习**，协调机器人**底盘与机械臂**的运动。在仿真与真实世界评测中，相比基线，各情形**成功率至少 +15%**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| H2MR | Human-to-Mobile-Robot 人到移动机器人 |
| Handover | 递交，把物体交给机器人 |
| Synthetic Data | 合成数据（全身人体运动） |
| 4D Imitation | 4D 模仿学习（含时间的轨迹） |
| Base-Arm Coordination | 底盘-机械臂协调 |
| Mobile Robot | 移动机器人 |

---

## ❓ 论文要解决什么问题？

**移动机器人接人递来的物体**比固定底座难：
- 需在**大工作空间**移动接物，**底盘 + 臂**要协调；
- 真实递交数据**难采**；
- 要对**多样人类递交动作**泛化。

MobileH2R 要：**仅用合成数据**学出泛化的视觉 H2MR 递交。

---

## 🔧 方法详解

### 1. 可扩展合成全身人体运动数据
**可扩展地生成多样的全身人体运动**（递交动作），免真实采集。

### 2. 自动造安全易模仿的演示
**自动**生成**安全、易模仿**的机器人演示（含底盘 + 臂协调），作为模仿目标。

### 3. 高效 4D 模仿学习（底盘-臂协调）
用**4D 模仿学习**协调**底盘与机械臂**，在大工作空间里可靠接物。

### 4. 结果
- 仿真 + 真机；
- 相比基线**至少 +15%** 成功率。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    SYN["可扩展合成全身人体运动"] --> DEMO["自动安全易模仿演示"]
    DEMO --> IL["4D 模仿学习<br/>(底盘-臂协调)"]
    IL --> OUT["🤖 人到移动机器人递交<br/>仿真+真机 ≥ +15%"]

    style IL fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **H2MR 递交框架**：移动机器人大工作空间可靠接物；
2. **完全合成数据**：可扩展生成全身人体运动 + 自动安全演示；
3. **4D 模仿学习**：协调底盘与机械臂；
4. **≥ +15%**：仿真与真机均超基线。

---

## 🤖 对人形机器人学习的启发

- **移动递交需底盘-臂协调**，对人形（移动 + 操作）直接相关；
- **完全合成数据**是绕开真实采集的可扩展路线，呼应 DexMimicGen/DreamGen；
- **自动造安全演示**降低数据工程；
- 人机递交是人形服务场景的高频交互。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2501.04595](https://arxiv.org/abs/2501.04595) | 论文正文（合成数据、4D 模仿、递交实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（+15%）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·合成数据/递交**：[DexMimicGen（本仓 11）](../../11_Simulation_Benchmark/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation.html) · [DreamGen](../DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models/DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models.html)。
