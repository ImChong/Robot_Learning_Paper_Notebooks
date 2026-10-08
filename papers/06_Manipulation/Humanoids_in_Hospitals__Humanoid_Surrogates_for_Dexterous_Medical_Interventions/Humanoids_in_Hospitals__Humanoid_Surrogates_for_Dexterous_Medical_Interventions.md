---
layout: paper
title: "Humanoids in Hospitals: A Technical Study of Humanoid Robot Surrogates for Dexterous Medical Interventions"
zhname: "Humanoids in Hospitals：人形机器人替身做灵巧医疗干预的技术研究"
category: "Manipulation"
arxiv: "2503.12725"
---

# Humanoids in Hospitals: A Technical Study of Humanoid Robot Surrogates for Dexterous Medical Interventions
**Humanoids in Hospitals：人形替身灵巧医疗干预的技术研究**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 → 06 · 医疗人形 · 遥操作替身 · 双臂 · 阻抗控制 · Unitree G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 3 月 |
| arXiv | [2503.12725](https://arxiv.org/abs/2503.12725) · [PDF](https://arxiv.org/pdf/2503.12725) · [HTML](https://arxiv.org/html/2503.12725v1) |
| 作者 | Soofiyan Atar、Xiao Liang、Calvin Joyce、Florian Richter、Michael Yip 等（UC San Diego） |
| 主题 | cs.RO · 医疗人形 / 遥操作 / 灵巧干预 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 本文探索用**人形机器人**经**遥操作**执行医疗任务，以缓解**医护人力短缺**。研究为 **Unitree G1** 搭建一套**双臂系统**，集成**高保真位姿跟踪、定制抓取配置、阻抗控制器**（用于工具操作）。跨**七类医疗流程**评测——**体检、急救干预、通气（ventilation）、超声引导（ultrasound-guided）、精密穿针**等。结果显示：人形能**复现关键医疗评估**，在**通气与超声引导**任务上有**可观的定量表现**，但仍面临**力限**与**传感灵敏度**带来的挑战，影响**临床精度**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Surrogate | 替身，远程代替医护操作 |
| Impedance Control | 阻抗控制，柔顺工具操作 |
| Pose Tracking | 位姿跟踪 |
| Ventilation | 通气（医疗操作） |
| Ultrasound-guided | 超声引导操作 |
| Needle Task | 穿针/进针任务 |

---

## ❓ 论文要解决什么问题？

医护**人力短缺**，能否用**人形替身**远程做医疗操作？
- 医疗任务**灵巧、精密、需柔顺**；
- 不清楚现有人形（G1）能做到什么程度、卡在哪。

论文要：搭建医疗双臂遥操作系统并**系统评测**人形做医疗干预的能力与局限。

---

## 🔧 方法详解

### 1. Unitree G1 双臂医疗遥操作系统
集成**高保真位姿跟踪 + 定制抓取 + 阻抗控制器**，让操作者远程驱动 G1 做医疗工具操作（阻抗控制保证柔顺）。

### 2. 七类医疗流程评测
覆盖**体检、急救干预、通气、超声引导、精密穿针**等七类，系统量化表现。

### 3. 发现
- 能**复现关键医疗评估**；
- **通气、超声引导**有可观定量表现；
- **力限 + 传感灵敏度**制约**临床精度**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DOC["🧑‍⚕️ 远程操作者"] --> SYS
    subgraph SYS["Unitree G1 双臂医疗系统"]
        P["位姿跟踪 + 定制抓取 + 阻抗控制"]
    end
    SYS --> EVAL["7 类医疗流程评测"]
    EVAL --> OUT["🏥 复现关键评估<br/>通气/超声有可观表现<br/>受力限/传感灵敏度制约"]

    style SYS fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **医疗人形遥操作系统**：G1 双臂 + 位姿跟踪 + 定制抓取 + 阻抗控制；
2. **七类医疗流程系统评测**：体检/急救/通气/超声/穿针；
3. **能力与局限并陈**：通气/超声可观，力限/传感制约精度；
4. **医疗替身可行性研究**：面向人力短缺场景。

---

## 🤖 对人形机器人学习的启发

- **医疗是高价值但高要求的人形落地场景**：需灵巧 + 柔顺 + 精密；
- **阻抗控制**对接触/工具医疗操作不可或缺；
- **力限与传感灵敏度**是当前硬件瓶颈，提示本体改进方向；
- 系统性技术研究为后续自主化/学习化医疗操作奠基。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.12725](https://arxiv.org/abs/2503.12725) | 论文正文（系统、七类流程、定量评测） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·遥操作医疗/接触**：[Humanoid Visual-Tactile-Action Dataset](../A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation/A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation.html)；
- **柔顺/阻抗（本仓 04）**：[HMC（异构元控制）](../../04_Loco-Manipulation_and_WBC/HMC__Learning_Heterogeneous_Meta-Control_for_Contact-Rich_Loco-Manipulation/HMC__Learning_Heterogeneous_Meta-Control_for_Contact-Rich_Loco-Manipulation.html)。
