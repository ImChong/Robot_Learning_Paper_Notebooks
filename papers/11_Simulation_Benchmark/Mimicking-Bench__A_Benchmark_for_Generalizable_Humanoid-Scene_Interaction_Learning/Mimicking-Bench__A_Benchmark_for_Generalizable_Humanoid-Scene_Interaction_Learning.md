---
layout: paper
title: "Mimicking-Bench: A Benchmark for Generalizable Humanoid-Scene Interaction Learning via Human Mimicking"
zhname: "Mimicking-Bench：经由模仿人类的可泛化人形-场景交互学习基准"
category: "Simulation Benchmark"
arxiv: "2412.17730"
---

# Mimicking-Bench: A Benchmark for Generalizable Humanoid-Scene Interaction Learning via Human Mimicking
**Mimicking-Bench：经由模仿人类的可泛化人形-场景交互学习基准**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 人形-场景交互 · 模仿人类 · 大规模基准 · 泛化
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 12 月 |
| arXiv | [2412.17730](https://arxiv.org/abs/2412.17730) · [PDF](https://arxiv.org/pdf/2412.17730) · [HTML](https://arxiv.org/html/2412.17730v1) |
| 作者 | Yun Liu、Bowen Yang、Licheng Zhong、He Wang、Li Yi（清华等） |
| 主题 | cs.RO · 人形-场景交互 / 模仿学习 / 基准 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。

---

## 🎯 一句话总结

> 让人形通过**模仿人类数据**学会与 **3D 场景**交互的通用技能，是机器人领域的关键挑战。已有的演示数据集**规模小、靠手工采集**。Mimicking-Bench 引入一个**大规模基准**：包含**6 个家居（全身）交互任务**、**11K** 多样**物体形状**、以及 **20K 合成 + 3K 真实**的**人类技能参考**。基准系统比较了**运动重定向、运动跟踪、模仿学习**及其**各种组合**策略，验证了**模仿人类**对**技能习得**的价值，并指出**场景几何泛化**等关键研究挑战与未来方向。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Humanoid-Scene Interaction | 人形与 3D 场景的交互 |
| Human Mimicking | 模仿人类（数据/动作） |
| Motion Retargeting | 运动重定向 |
| Motion Tracking | 运动跟踪 |
| Imitation Learning | 模仿学习 |
| Scene Geometry Generalization | 场景几何泛化 |

---

## ❓ 论文要解决什么问题？

人形-场景交互学习受限于**数据**：
- 现有演示**小规模、手工采集**，难支撑泛化研究；
- 缺**统一基准**比较重定向/跟踪/模仿等不同策略；
- **场景几何泛化**难。

Mimicking-Bench 要：一个**大规模、统一**的人形-场景交互基准。

---

## 🔧 方法详解

### 1. 大规模基准资源
- **6 个家居全身交互任务**；
- **11K 多样物体形状**；
- **20K 合成 + 3K 真实**人类技能参考。

### 2. 统一比较多种策略
系统比较**运动重定向、运动跟踪、模仿学习**及其**组合**，在统一基准上评估优劣。

### 3. 发现
验证**模仿人类**对技能习得的价值；指出**场景几何泛化**是关键挑战与未来方向。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    REF["人类技能参考<br/>20K 合成 + 3K 真实"] --> BENCH
    OBJ["11K 物体形状 · 6 家居任务"] --> BENCH
    subgraph BENCH["Mimicking-Bench"]
        C["统一比较：重定向/跟踪/模仿/组合"]
    end
    BENCH --> OUT["📊 验证『模仿人类』价值<br/>指出场景几何泛化挑战"]

    style BENCH fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **大规模人形-场景交互基准**：6 任务、11K 物体、20K+3K 人类参考；
2. **统一比较多策略**：重定向/跟踪/模仿及组合；
3. **验证模仿人类的价值**；
4. **指出场景几何泛化**等关键挑战与方向。

---

## 🤖 对人形机器人学习的启发

- **大规模基准是公平比较的前提**：把"模仿人类"的不同实现放在同一标尺；
- **场景几何泛化**是人形-场景交互的硬骨头，值得持续投入；
- **合成 + 真实**参考混合是扩充数据的实用做法；
- 与本仓 04（从人类视频学技能）方向强相关。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2412.17730](https://arxiv.org/abs/2412.17730) | 论文正文（基准、策略比较、泛化分析） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·基准/数据**：[HumanoidGen（双手灵巧数据生成）](../HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning/HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning.html) · [RoboCasa365](../RoboCasa365__A_Large-Scale_Simulation_Framework_for_Training_and_Benchmarking_Generalist_Robots/RoboCasa365__A_Large-Scale_Simulation_Framework_for_Training_and_Benchmarking_Generalist_Robots.html)。
