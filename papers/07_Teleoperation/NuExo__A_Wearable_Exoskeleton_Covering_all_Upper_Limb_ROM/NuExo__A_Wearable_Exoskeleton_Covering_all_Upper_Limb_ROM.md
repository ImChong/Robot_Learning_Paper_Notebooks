---
layout: paper
title: "NuExo: A Wearable Exoskeleton Covering all Upper Limb ROM for Outdoor Data Collection and Teleoperation of Humanoid Robots"
zhname: "NuExo：覆盖全上肢活动范围的可穿戴外骨骼，用于户外数据采集与人形遥操作"
category: "Teleoperation"
arxiv: "2503.10554"
---

# NuExo: A Wearable Exoskeleton Covering all Upper Limb ROM for Outdoor Data Collection and Teleoperation of Humanoid Robots
**NuExo：覆盖全上肢活动范围的可穿戴外骨骼，用于户外数据采集与人形遥操作**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 上肢外骨骼 · 全活动范围 · 户外便携 · 多模态采集 · 力数据
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 3 月 |
| arXiv | [2503.10554](https://arxiv.org/abs/2503.10554) · [PDF](https://arxiv.org/pdf/2503.10554) · [HTML](https://arxiv.org/html/2503.10554v1) |
| 作者 | Rui Zhong、Chuang Cheng、Junpeng Xu、Yantong Wei、Ce Guo、Daoxun Zhang、Wei Dai、Huimin Lu（国防科大等） |
| 主题 | cs.RO · 可穿戴外骨骼 / 数据采集 / 人形遥操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 从动捕/遥操作到机器人技能学习的演进，是具身智能的关键路径。但现有系统难**同时**达成四目标：**准确**（长时间精确跟踪全上肢）、**舒适**（贴合人体生物力学）、**通用**（多模态采集如力数据、兼容人形）、**便携**（轻量户外日用）。NuExo 是一套**可穿戴上肢外骨骼**，配**沉浸式直观遥操作**与**多模态感知采集**来弥合此差距。凭借**带同步连杆与同步带传动的新型肩部机构**，它能很好地适配**复合肩部运动**，**100% 覆盖**自然上肢活动范围；整机仅 **5.2 kg**，支持**背包式**户外日常使用。作者还开发了**统一直观的遥操作框架**与**多模态数据采集系统**，兼容多款人形。跨平台、跨用户实验验证了其在**运动范围与灵活性**上的优势，以及在**动态场景**下数据采集与遥操作精度的**稳定性**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| ROM | Range of Motion，活动范围 |
| Exoskeleton | 外骨骼，可穿戴机械结构 |
| Synchronized Linkage | 同步连杆，适配复合肩部运动 |
| Timing Belt | 同步带传动 |
| Multi-modal Sensing | 多模态感知（含力数据） |
| Backpack-type | 背包式，便携户外 |

---

## ❓ 论文要解决什么问题？

上肢遥操作/采集设备难**同时**满足：
- **准确**（长时间全上肢精确跟踪）；
- **舒适**（贴合生物力学）；
- **通用**（多模态采集 + 兼容人形）；
- **便携**（轻量户外）。

尤其**肩部复合运动**难覆盖。NuExo 要：一套四目标兼顾的可穿戴上肢外骨骼。

---

## 🔧 方法详解

### 1. 新型肩部机构（全 ROM）
**同步连杆 + 同步带传动**的肩部机构适配**复合肩部运动**，实现自然上肢活动范围的 **100% 覆盖**——这是"准确 + 舒适"的关键。

### 2. 轻量便携（5.2 kg 背包式）
整机 **5.2 kg**，**背包式**穿戴，可在**户外日常**场景便捷使用（便携）。

### 3. 统一遥操作框架 + 多模态采集
配**统一直观遥操作框架**与**多模态感知采集**（含**力数据**），兼容多款人形（通用）。

### 4. 跨平台跨用户验证
在不同人形平台与多用户上验证**运动范围、灵活性**与**动态场景**下采集/遥操作的**稳定性与精度**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑 操作者(穿戴 5.2kg 背包式外骨骼)"] --> EXO
    subgraph EXO["NuExo"]
        SH["新型肩部机构<br/>(同步连杆+同步带, 100% ROM)"]
        MM["多模态采集(含力)"]
    end
    EXO --> FW["统一直观遥操作框架"]
    FW --> OUT["🤖 多款人形<br/>跨平台/跨用户 · 动态场景稳定"]

    style EXO fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **全上肢 ROM 外骨骼**：新型肩部机构 100% 覆盖自然上肢活动范围；
2. **四目标兼顾**：准确、舒适、通用、便携（5.2 kg 背包式户外）；
3. **多模态采集（含力）+ 统一遥操作框架**：兼容多款人形；
4. **跨平台/跨用户验证**：运动范围、灵活性、动态稳定性。

---

## 🤖 对人形机器人学习的启发

- **肩部复合运动是上肢外骨骼的难点**：新机构覆盖全 ROM 提升采集质量；
- **力等多模态数据**对接触/灵巧操作学习价值大；
- **便携户外**让数据采集走出实验室，扩大数据多样性；
- 与 ACE、CHILD 等可穿戴/外骨骼遥操作工作互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.10554](https://arxiv.org/abs/2503.10554) | 论文正文（肩部机构、多模态采集、跨平台实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·外骨骼/可穿戴遥操作**：[ACE（跨平台视觉-外骨骼）](../ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation/ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation.html) · [CHILD（关节级全身）](../CHILD__a_Whole-Body_Humanoid_Teleoperation_System/CHILD__a_Whole-Body_Humanoid_Teleoperation_System.html)。
