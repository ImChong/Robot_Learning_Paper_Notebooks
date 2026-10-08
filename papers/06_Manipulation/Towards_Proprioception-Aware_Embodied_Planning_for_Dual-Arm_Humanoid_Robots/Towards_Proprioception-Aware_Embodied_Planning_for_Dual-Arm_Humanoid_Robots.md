---
layout: paper
title: "Towards Proprioception-Aware Embodied Planning for Dual-Arm Humanoid Robots"
zhname: "面向双臂人形的本体感受感知具身规划"
category: "Manipulation"
arxiv: "2510.07882"
---

# Towards Proprioception-Aware Embodied Planning for Dual-Arm Humanoid Robots
**面向双臂人形的本体感受感知具身规划**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 具身规划 · 本体感受 · MLLM · 双臂人形 · DualTHOR
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 10 月 |
| arXiv | [2510.07882](https://arxiv.org/abs/2510.07882) · [PDF](https://arxiv.org/pdf/2510.07882) · [HTML](https://arxiv.org/html/2510.07882v1) |
| 作者 | Boyu Li、Siyuan He、Hang Xu、Haoqi Yuan、Börje F. Karlsson、Zongqing Lu 等 |
| 主题 | cs.RO · 具身规划 / 本体感受 / 多模态大模型 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 近年**多模态大模型（MLLM）**能做**高层规划**，让机器人遵从复杂人类指令。但在涉及**双臂人形**的**长时程任务**上效果仍有限——原因是**仿真平台不足**与当前 MLLM 的**具身感知（embodiment awareness）欠缺**。本文用一个新的**双臂人形模拟器 DualTHOR**（带**连续过渡**与**意外机制**），并提出 **Proprio-MLLM**：一个融合**本体感受信息、基于运动的位置嵌入、跨空间编码器（cross-spatial encoder）**的增强模型，以提升**具身感知**。在 DualTHOR 环境中，**Proprio-MLLM 的规划性能平均提升 19.75%**（相比现有 MLLM）。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| MLLM | Multimodal Large Language Model |
| Proprio-MLLM | 本文的本体感受感知 MLLM |
| Embodiment Awareness | 具身感知，模型对自身身体状态的理解 |
| DualTHOR | 双臂人形模拟器 |
| Position Embedding | 位置嵌入（基于运动） |
| Cross-Spatial Encoder | 跨空间编码器 |

---

## ❓ 论文要解决什么问题？

MLLM 做双臂人形长时程规划受限：
- **仿真平台不足**（缺连续过渡/意外）；
- MLLM **缺具身感知**，不"知道"自己身体状态，规划脱离物理。

论文要：① 更好的双臂人形仿真（DualTHOR）；② 让 MLLM **感知本体状态**以改进规划。

---

## 🔧 方法详解

### 1. DualTHOR 双臂人形模拟器
带**连续过渡**与**意外机制**，为长时程双臂人形规划提供贴近现实的测试床。

### 2. Proprio-MLLM：注入本体感受
增强 MLLM 的**具身感知**：
- **本体感受信息**：让模型"知道"关节/姿态状态；
- **基于运动的位置嵌入**；
- **跨空间编码器**：融合空间信息。

### 3. 结果
在 DualTHOR 中，规划性能**平均 +19.75%**（相比现有 MLLM）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    INS["🗣️ 复杂指令"] --> PM
    PROP["📟 本体感受"] --> PM
    subgraph PM["Proprio-MLLM"]
        E["运动位置嵌入 + 跨空间编码器"]
    end
    PM --> PLAN["长时程双臂规划"]
    PLAN --> SIM["DualTHOR(连续过渡+意外)"]
    SIM --> OUT["📊 规划性能 +19.75%"]

    style PM fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **DualTHOR 双臂人形模拟器**：连续过渡 + 意外机制；
2. **Proprio-MLLM**：注入本体感受、运动位置嵌入、跨空间编码器；
3. **增强具身感知**：让高层规划"知道身体状态"；
4. **+19.75% 规划性能**：相比现有 MLLM。

---

## 🤖 对人形机器人学习的启发

- **高层规划需要"具身感知"**：纯语义 MLLM 不够，要注入本体状态；
- **仿真平台是 MLLM 规划研究的前提**（与 DualTHOR 平台论文同源）；
- **本体感受 + 跨空间编码**是把语言规划接到物理身体的桥；
- 与 BiBo（现成 VLM 控人形）形成"增强 MLLM vs 借现成 VLM"的对照。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2510.07882](https://arxiv.org/abs/2510.07882) | 论文正文（DualTHOR、Proprio-MLLM、规划实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（19.75%）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·VLM/规划**：[给 GPT-4 一具人形身体·BiBo](../Endowing_GPT-4_with_a_Humanoid_Body__Bridge_Between_VLMs_and_the_Physical_World/Endowing_GPT-4_with_a_Humanoid_Body__Bridge_Between_VLMs_and_the_Physical_World.html) · [Hierarchical Vision-Language Planning](../Hierarchical_Vision-Language_Planning_for_Multi-Step_Humanoid_Manipulation/Hierarchical_Vision-Language_Planning_for_Multi-Step_Humanoid_Manipulation.html)；
- **DualTHOR 平台（本仓 11）**：[DualTHOR](../../11_Simulation_Benchmark/DualTHOR__A_Dual-Arm_Humanoid_Simulation_Platform_for_Contingency-Aware_Planning/DualTHOR__A_Dual-Arm_Humanoid_Simulation_Platform_for_Contingency-Aware_Planning.html)。
