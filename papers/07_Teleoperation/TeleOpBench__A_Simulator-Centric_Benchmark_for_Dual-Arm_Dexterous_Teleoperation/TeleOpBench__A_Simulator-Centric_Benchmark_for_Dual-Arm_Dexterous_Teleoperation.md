---
layout: paper
title: "TeleOpBench: A Simulator-Centric Benchmark for Dual-Arm Dexterous Teleoperation"
zhname: "TeleOpBench：以仿真为中心的双臂灵巧遥操作基准"
category: "Teleoperation"
arxiv: "2505.12748"
---

# TeleOpBench: A Simulator-Centric Benchmark for Dual-Arm Dexterous Teleoperation
**统一的、以仿真为中心的双臂灵巧遥操作基准：含 30 个高保真任务环境（取放、工具使用、协作操作），实现四种遥操作模态（动捕、VR、外骨骼、单目视觉跟踪）并配统一协议与指标；在物理双臂平台上做 10 个留出任务交叉验证，发现仿真表现与真机行为强相关，证明基准的外部效度**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 遥操作基准 · 仿真为中心 · 四模态 · 双臂灵巧 · 外部效度
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月 |
| arXiv | [2505.12748](https://arxiv.org/abs/2505.12748) · [PDF](https://arxiv.org/pdf/2505.12748) · [HTML](https://arxiv.org/html/2505.12748v1) |
| 作者 | Hangyu Li、Qin Zhao、Haoran Xu、Xinyu Jiang、Qingwei Ben、Feiyu Jia 等（上海 AI Lab 等） |
| 主题 | cs.RO · 遥操作基准 / 双臂灵巧 / 仿真评测 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 遥操作是具身机器人学习的基石，**双臂灵巧遥操作**尤其能提供自主系统难得的丰富演示。TeleOpBench 是一个**统一的、以仿真为中心**的基准：包含 **30 个高保真任务环境**，涵盖**取放、工具使用、协作操作**。它实现了**四种遥操作模态**——**动捕、VR 设备、外骨骼、单目视觉跟踪**——并提供**统一协议与指标**；在一个**物理双臂平台**上跨验证。通过 **10 个留出（held-out）真实任务**做仿真↔硬件交叉验证，发现**仿真表现与真机行为强相关**，确认了该基准作为可靠评测平台的**外部效度**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Simulator-Centric | 以仿真为中心的基准 |
| Modality | 遥操作模态（动捕/VR/外骨骼/视觉） |
| Held-out Task | 留出任务，用于验证泛化 |
| External Validity | 外部效度，仿真结论对真机的可推广性 |
| Dual-Arm Dexterous | 双臂灵巧（操作） |
| Protocol/Metric | 统一协议与评测指标 |

---

## ❓ 论文要解决什么问题？

遥操作研究缺**统一、可复现**的评测：
- 不同**模态**（动捕/VR/外骨骼/视觉）难公平比较；
- 真机评测**贵、难复现**；
- 不清楚**仿真结论能否推广到真机**。

TeleOpBench 要：一个**仿真为中心**、**多模态**、**统一指标**且**经真机验证外部效度**的遥操作基准。

---

## 🔧 方法详解

### 1. 30 个高保真仿真任务
覆盖**取放、工具使用、协作操作**，任务在**运动学/力复杂度**上各异。

### 2. 四种遥操作模态 + 统一协议
实现**动捕、VR、外骨骼、单目视觉跟踪**四种接口，配**统一协议与指标**，便于公平横比。

### 3. 仿真↔真机交叉验证（外部效度）
在**物理双臂平台**上用 **10 个留出真实任务**交叉验证；发现**仿真表现与真机强相关**，证明基准可靠。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph MOD["四种遥操作模态"]
        M1["动捕"]
        M2["VR"]
        M3["外骨骼"]
        M4["单目视觉"]
    end
    MOD --> SIM["30 仿真任务<br/>统一协议+指标"]
    SIM --> XVAL["10 真实留出任务交叉验证"]
    XVAL --> OUT["📊 仿真↔真机强相关<br/>→ 基准外部效度成立"]

    style SIM fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **统一仿真为中心的遥操作基准**：30 任务 + 统一协议/指标；
2. **四模态实现**：动捕/VR/外骨骼/单目视觉，公平横比；
3. **外部效度验证**：10 真实留出任务交叉验证，仿真↔真机强相关；
4. **可靠评测平台**：为遥操作研究提供可复现基准。

---

## 🤖 对人形机器人学习的启发

- **遥操作需要统一基准**：否则不同模态/系统难公平比较，TeleOpBench 填补此空白；
- **"仿真↔真机强相关"是关键卖点**：让低成本仿真评测可信，加速迭代；
- **多模态统一**便于研究"哪种接口更适合哪类任务"；
- 对人形双臂灵巧数据采集与策略评测有直接价值，呼应本仓 11 仿真基准板块。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.12748](https://arxiv.org/abs/2505.12748) | 论文正文（任务集、四模态、交叉验证） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·遥操作系统/数据**：[TWIST2](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html) · [TeleOp 模态：动捕/VR/外骨骼/视觉]；
- **仿真基准**：本仓 11 Simulation Benchmark 板块。
