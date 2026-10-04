---
layout: paper
title: "HumanoidGen: Data Generation for Bimanual Dexterous Manipulation via LLM Reasoning"
zhname: "HumanoidGen：用大模型推理为双手灵巧操作生成数据"
category: "Simulation Benchmark"
arxiv: "2507.00833"
---

# HumanoidGen: Data Generation for Bimanual Dexterous Manipulation via LLM Reasoning
**针对人形双臂灵巧手缺仿真任务与高质量演示的问题，提出自动化任务创建与演示采集框架：基于原子灵巧操作给资产与灵巧手做空间标注，用 LLM 规划器依物体可供性与场景生成可执行的空间约束链，并用蒙特卡洛树搜索变体增强长时程推理与稀疏标注；新建增强场景基准评估数据质量，2D/3D 扩散策略性能随生成数据规模提升**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 数据生成 · 双手灵巧 · LLM 规划 · MCTS · 扩散策略
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 7 月 |
| arXiv | [2507.00833](https://arxiv.org/abs/2507.00833) · [PDF](https://arxiv.org/pdf/2507.00833) · [HTML](https://arxiv.org/html/2507.00833v1) |
| 作者 | Zhi Jing、Siyuan Yang、Jicong Ao、Ting Xiao、Yu-Gang Jiang、Chenjia Bai |
| 主题 | cs.RO · 数据生成 / 双手灵巧操作 / LLM 规划 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。

---

## 🎯 一句话总结

> 现有机器人数据集与仿真基准多面向**机械臂**平台；对装备**双臂 + 灵巧手**的**人形**，仿真任务与高质量演示**明显匮乏**。双手灵巧操作更复杂——需**协调臂运动与手操作**，自主采集难。HumanoidGen 是一个**自动化任务创建与演示采集框架**，利用**原子灵巧操作**与 **LLM 推理**生成**关系约束**。具体：基于原子操作为**资产与灵巧手**提供**空间标注**，再用 **LLM 规划器**依据**物体可供性（affordance）与场景**生成一串**可执行的臂运动空间约束**；并用**蒙特卡洛树搜索（MCTS）变体**增强 LLM 在**长时程任务与标注不足**下的推理。实验里新建一个含**增强场景**的基准评估数据质量，结果显示 **2D 与 3D 扩散策略**的性能可**随生成数据规模提升**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Bimanual Dexterous | 双手灵巧（操作） |
| Atomic Operation | 原子操作，可复用的基本灵巧动作 |
| Affordance | 可供性，物体可被如何操作 |
| LLM Planner | 大模型规划器，生成空间约束链 |
| MCTS | 蒙特卡洛树搜索，增强长时程推理 |
| Diffusion Policy | 扩散策略（2D/3D） |

---

## ❓ 论文要解决什么问题？

人形**双手灵巧操作**缺数据：
- 现有数据/基准多为**单臂**；
- 双手灵巧需**协调臂 + 手**，**自主采集难**；
- 缺高质量演示来训策略。

HumanoidGen 要：**自动**生成双手灵巧任务与高质量演示。

---

## 🔧 方法详解

### 1. 原子操作 + 空间标注
基于**原子灵巧操作**，为**资产与灵巧手**提供**空间标注**，作为生成约束的基础。

### 2. LLM 规划器生成空间约束链
**LLM 规划器**依据**物体可供性与场景**，生成一串**可执行的臂运动空间约束（relational constraints）**，把"怎么双手协作"显式化。

### 3. MCTS 增强长时程推理
用**蒙特卡洛树搜索变体**增强 LLM，在**长时程任务**与**标注不足**时仍能稳健规划。

### 4. 基准与结果
新建含**增强场景**的基准评估数据质量；**2D/3D 扩散策略**性能**随生成数据规模提升**——证明生成数据有效。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    A["原子灵巧操作<br/>+ 资产/手空间标注"] --> LLM
    subgraph LLM["LLM 规划器(+MCTS)"]
        C["依可供性/场景生成<br/>可执行空间约束链"]
    end
    LLM --> GEN["自动演示采集"]
    GEN --> OUT["📊 增强场景基准<br/>2D/3D 扩散策略随数据规模↑"]

    style LLM fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **人形双手灵巧数据生成框架**：自动任务创建 + 演示采集；
2. **LLM 规划生成空间约束链**：依可供性/场景把双手协作显式化；
3. **MCTS 增强**：应对长时程与稀疏标注；
4. **数据有效性**：新基准上 2D/3D 扩散策略随数据规模提升。

---

## 🤖 对人形机器人学习的启发

- **自动数据生成是双手灵巧操作的关键瓶颈解法**：自主采集难，LLM 规划 + 仿真生成是出路；
- **可供性 + 空间约束**把语义规划接到底层动作；
- **MCTS 补 LLM 长时程推理**是实用组合；
- 与 DexMimicGen、HumanoidGen 等数据生成工作共同壮大人形操作数据。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2507.00833](https://arxiv.org/abs/2507.00833) | 论文正文（原子操作、LLM 规划、MCTS、基准实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·数据生成/基准**：[DexMimicGen（自动双手灵巧数据生成）](../DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation.html) · [Mimicking-Bench](../Mimicking-Bench__A_Benchmark_for_Generalizable_Humanoid-Scene_Interaction_Learning/Mimicking-Bench__A_Benchmark_for_Generalizable_Humanoid-Scene_Interaction_Learning.html)。
