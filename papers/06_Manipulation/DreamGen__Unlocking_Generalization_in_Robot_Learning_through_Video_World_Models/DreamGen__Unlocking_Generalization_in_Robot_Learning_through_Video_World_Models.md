---
layout: paper
title: "DreamGen: Unlocking Generalization in Robot Learning through Video World Models"
zhname: "DreamGen：用视频世界模型解锁机器人学习的泛化"
category: "Manipulation"
arxiv: "2505.12705"
---

# DreamGen: Unlocking Generalization in Robot Learning through Video World Models
**一个简单而高效的四阶段流水线，用「视频世界模型」生成的「神经轨迹」训练能跨行为、跨环境泛化的机器人策略：把图像到视频生成模型适配到目标本体生成逼真合成视频，再用潜动作模型或逆动力学模型恢复伪动作序列，并提出 DreamGen Bench 评测视频生成；仅用单一取放任务的遥操作数据，就让人形在已见/未见环境完成 22 种新行为**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 视频世界模型 · 神经轨迹 · 合成数据 · 泛化 · 人形
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月 |
| arXiv | [2505.12705](https://arxiv.org/abs/2505.12705) · [PDF](https://arxiv.org/pdf/2505.12705) · [HTML](https://arxiv.org/html/2505.12705v1) |
| 作者 | Joel Jang、Seonghyeon Ye、Ajay Mandlekar、Yuke Zhu、Linxi Fan、Dieter Fox、Jan Kautz 等（NVIDIA） |
| 主题 | cs.RO · 视频世界模型 / 合成数据 / 泛化 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> DreamGen 是一个**简单而高效的四阶段流水线**，通过**神经轨迹（neural trajectories）**——由**视频世界模型**生成的**合成机器人数据**——训练能**跨行为、跨环境泛化**的机器人策略。流程：① 用**图像到视频生成模型**；② 把模型**适配到目标机器人本体**，生成**逼真合成视频**；③ 用**潜动作模型（latent action model）**或**逆动力学模型（inverse-dynamics model）**从视频中**恢复伪动作序列**；④ 用这些数据训练策略。还提出 **DreamGen Bench** 评测视频生成质量。实验中，仅用**单一取放任务、单一环境**的遥操作数据，DreamGen 就让**人形**在**已见与未见环境**完成 **22 种新行为**，展示强**行为与环境泛化**，为**超越人工采集**地扩展机器人学习开辟新路径。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Video World Model | 视频世界模型，生成未来视频 |
| Neural Trajectory | 神经轨迹，生成的合成机器人数据 |
| Latent Action Model | 潜动作模型，从视频推动作 |
| Inverse-Dynamics | 逆动力学模型，从状态变化推动作 |
| Pseudo-action | 伪动作，恢复出的动作标签 |
| DreamGen Bench | 本文视频生成评测基准 |

---

## ❓ 论文要解决什么问题？

机器人策略泛化差、数据采集贵：
- 真实采集**少行为、少环境**；
- 想**跨行为/跨环境泛化**，但缺数据。

DreamGen 要：用**视频世界模型**生成**带动作标签**的合成数据，**最小真实采集**就解锁泛化。

---

## 🔧 方法详解

### 1. 四阶段流水线
| 阶段 | 内容 |
|---|---|
| ① | 用**图像到视频生成模型** |
| ② | **适配到目标本体**，生成逼真合成视频 |
| ③ | 用**潜动作/逆动力学模型恢复伪动作** |
| ④ | 用"视频 + 伪动作"训练策略 |

### 2. 神经轨迹 = 合成机器人数据
视频世界模型生成的**神经轨迹**充当合成训练数据，带恢复出的**伪动作**。

### 3. DreamGen Bench
提出**DreamGen Bench**系统评测**视频生成**质量。

### 4. 结果
仅用**单任务单环境**遥操作数据，人形完成**22 种新行为**（已见 + 未见环境），强泛化。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    SEED["单任务单环境遥操作数据"] --> I2V
    subgraph DG["DreamGen 四阶段"]
        I2V["①②图像→视频生成 + 适配本体"]
        ACT["③潜动作/逆动力学恢复伪动作"]
        I2V --> ACT
    end
    ACT --> TRAIN["④训练策略(神经轨迹)"]
    TRAIN --> OUT["🤖 人形 22 种新行为<br/>已见+未见环境泛化"]

    style DG fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **视频世界模型生成神经轨迹**：合成机器人数据训练策略；
2. **四阶段流水线**：生成→适配本体→恢复伪动作→训练；
3. **DreamGen Bench**：评测视频生成质量；
4. **强泛化**：单任务单环境数据 → 人形 22 种新行为。

---

## 🤖 对人形机器人学习的启发

- **"视频世界模型 + 伪动作恢复"是扩数据的新范式**：把生成视频变成可训练的动作数据；
- **跨行为/跨环境泛化**直击机器人学习的核心痛点；
- **最小真实数据 → 大量合成行为**性价比极高；
- 与 Humanoid World Models、DexMimicGen 等生成/世界模型工作呼应（同 NVIDIA 系）。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.12705](https://arxiv.org/abs/2505.12705) | 论文正文（四阶段、神经轨迹、DreamGen Bench、人形实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（22 行为）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块/相关·世界模型/数据生成**：[Humanoid World Models（本仓 11）](../../11_Simulation_Benchmark/Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics/Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics.html) · [DexMimicGen](../../11_Simulation_Benchmark/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation.html)。
