---
layout: paper
paper_order: 8
title: "Humanoid Everyday: A Comprehensive Robotic Dataset for Open-World Humanoid Manipulation"
zhname: "Humanoid Everyday：开放世界人形操作综合数据集"
category: "Simulation Benchmark"
---

# Humanoid Everyday: A Comprehensive Robotic Dataset for Open-World Humanoid Manipulation

**人形机器人要学会「日常」操作，缺的不是算法而是规模化、多样化、贴近真实生活的数据。已有机器人数据集大多只盯着「固定底座 + 单/双臂桌面抓放」，既不含腿（行走中操作）、也少有人机交互和富接触触觉，分布太窄。Humanoid Everyday 用 Unitree G1 / H1 真机采集了一个大规模、多模态、覆盖开放世界日常任务的人形操作数据集：1.03 万条轨迹、300 万+ 帧、260 个任务、7 大类（灵巧物体操作、人机交互、行走融合动作等），每条轨迹同步 RGB + 深度 + LiDAR + 触觉 + 自然语言标注，30 Hz 记录；并配一个云端评测平台让研究者一键上传策略、统一测分。数据集、采集代码、评测网站全部开源。**

> 📅 阅读日期: 2026-06-17
>
> 🏷️ 板块: 11 Simulation Benchmark · 人形操作数据集 / 多模态（含触觉/LiDAR）/ 开放世界 / 云端评测
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2510.08807](https://arxiv.org/abs/2510.08807) |
| HTML | [在线阅读](https://arxiv.org/html/2510.08807) |
| PDF | [下载](https://arxiv.org/pdf/2510.08807) |
| 源码 | [physical-superintelligence-lab/Humanoid-Everyday](https://github.com/physical-superintelligence-lab/Humanoid-Everyday) |
| 数据集 | [HuggingFace USC-GVL/humanoid-everyday](https://huggingface.co/datasets/USC-GVL/humanoid-everyday) |
| OpenReview | [forum?id=dVmx4u2U0c](https://openreview.net/forum?id=dVmx4u2U0c) |
| **发布时间** | 2025-10-09 (arXiv) |

**作者**：Zhenyu Zhao、Hongyi Jing、Xiawei Liu、Jiageng Mao、Abha Jha、Hanwen Yang、Rong Xue、Sergey Zakharov、Vitor Guizilini、Yue Wang
**机构**：南加州大学（USC，GVL / Physical Superintelligence Lab）等
**主题**：开放世界人形机器人操作的大规模多模态真机数据集与云端评测基准

---

## 🎯 一句话总结

人形「学日常」最缺的是**数据的广度与真实度**：现有机器人数据集多聚焦固定底座的桌面抓放，**缺腿、缺人机交互、缺触觉/LiDAR**，难支撑开放世界的全身日常操作。Humanoid Everyday 直接用 **Unitree G1 / H1** 真机大规模采集：

- **规模**：**10.3k 条轨迹**、**300 万+ 帧**、**260 个任务**、归为 **7 大类**；
- **多样**：涵盖**灵巧物体操作、人机交互、行走融合（loco-manipulation）**等开放世界场景；
- **多模态**：每条轨迹同步 **RGB + 深度 + LiDAR + 触觉 + 自然语言标注**，**30 Hz** 记录；
- **可评测**：配一个**云端评测平台**，研究者上传策略即可在受控设置下统一测分、拿反馈；
- **全开源**：数据集、采集代码、评测网站均公开（GitHub + HuggingFace）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Open-World | - | 开放世界：任务/物体/场景不封闭，贴近真实日常的长尾分布 |
| Loco-Manipulation | Locomotion + Manipulation | 行走融合操作：边走/移动边完成抓取等动作，需要全身协调 |
| LiDAR | Light Detection and Ranging | 激光雷达，提供三维几何/距离感知 |
| Tactile | - | 触觉，富接触操作里判断「碰到没/握多紧」的关键模态 |
| Trajectory | - | 一条演示轨迹（一次任务执行的完整时序数据） |
| VLA | Vision-Language-Action | 视觉-语言-动作模型，常见的人形/机器人操作策略范式 |
| G1 / H1 | Unitree G1 / H1 | 宇树科技的人形机器人本体，本数据集的采集平台 |

---

## ❓ 论文要解决什么问题？

**问题陈述**：人形机器人有望成为「通用日常助手」，但数据是瓶颈。现有机器人操作数据集存在三类局限：

1. **形态窄**：多为固定底座 + 单/双臂的桌面操作，**不涉及腿/全身**，无法覆盖「边走边操作」；
2. **任务窄**：偏抓放等少数技能，缺**人机交互**、缺真实生活的多样长尾任务；
3. **模态窄**：以 RGB 为主，**少有触觉、LiDAR** 等富接触/几何感知模态，限制接触密集与空间推理任务的学习。

**核心问题**：

> 能否构建一个**规模大、任务多样、模态丰富、贴近开放世界日常**的人形操作真机数据集，并配套**统一、可复现**的评测，从而支撑人形操作策略（如 VLA/模仿学习）的训练与公平比较？

---

## 🔧 方法拆解：数据集 + 采集系统 + 云端评测

### 1. 真机平台与采集

以 **Unitree G1 / H1** 人形为采集平台，**30 Hz** 记录遥操作/演示轨迹，覆盖开放世界的日常环境与物体。

### 2. 七大类、260 任务的任务体系

把日常人形操作组织为 **7 个大类、260 个具体任务**，显式纳入：

- **灵巧物体操作**（dexterous object manipulation）；
- **人机交互**（human–humanoid interaction）；
- **行走融合动作**（locomotion-integrated / loco-manipulation）；
- 以及其它日常场景任务。

### 3. 多模态同步标注

每条轨迹同步多路传感：**RGB、深度、LiDAR、触觉**，并配**自然语言任务标注**。多模态尤其是触觉 + LiDAR，是相对已有数据集的关键增量，利于富接触与空间推理任务。

### 4. 云端评测平台

提供**云端评测网站**：研究者把训练好的策略上传，在**受控统一设置**下部署评测并获得性能反馈，使不同方法的比较**可复现、可横向对比**——这也是把「数据集」升级为「基准」的关键一环。

### 5. 全开源

数据集（[HuggingFace](https://huggingface.co/datasets/USC-GVL/humanoid-everyday)）、采集代码、评测网站（[GitHub](https://github.com/physical-superintelligence-lab/Humanoid-Everyday)）均公开。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    ROBOT["🤖 真机平台<br/>Unitree G1 / H1 · 30 Hz"]

    subgraph COLLECT["① 数据采集"]
        TELE["遥操作 / 演示"]
        MULTI["多模态同步<br/>RGB · 深度 · LiDAR · 触觉"]
        LANG["自然语言任务标注"]
        TELE --> MULTI --> LANG
    end

    subgraph DATA["② 数据集规模"]
        STAT["10.3k 轨迹 · 300 万+ 帧"]
        TASK["260 任务 / 7 大类<br/>灵巧操作 · 人机交互 · 行走融合"]
        STAT --- TASK
    end

    subgraph EVAL["③ 云端评测平台"]
        UPLOAD["上传策略"]
        DEPLOY["受控统一设置部署"]
        SCORE["统一测分 + 反馈<br/>可复现 / 可横向对比"]
        UPLOAD --> DEPLOY --> SCORE
    end

    ROBOT --> COLLECT --> DATA
    DATA --> TRAIN["🧠 训练人形操作策略<br/>(VLA / 模仿学习)"]
    TRAIN --> EVAL

    OPEN["📂 全开源: GitHub + HuggingFace<br/>数据 / 采集代码 / 评测网站"]
    DATA --> OPEN

    style COLLECT fill:#e8f4fd,stroke:#1f78b4
    style DATA fill:#eafaf1,stroke:#27ae60
    style EVAL fill:#fff7e6,stroke:#e67e22
</div>

---

## 💡 核心贡献

1. **大规模开放世界人形数据集**：Unitree G1/H1 真机采集，10.3k 轨迹 / 300 万+ 帧 / 260 任务 / 7 大类，覆盖日常长尾；
2. **形态与任务更全**：显式纳入**行走融合操作**与**人机交互**，突破「固定底座桌面抓放」的窄分布；
3. **富模态**：每条轨迹同步 **RGB + 深度 + LiDAR + 触觉 + 语言**，补齐已有数据集普遍缺失的触觉/LiDAR；
4. **云端评测平台**：统一受控评测，让人形操作策略的比较可复现、可横向对比，把数据集升级为基准；
5. **全开源**：数据、采集代码、评测网站公开，降低社区复现与扩展门槛。

---

## 📊 关键设定

| 维度 | 值 |
|---|---|
| 采集平台 | Unitree G1 / H1 人形 |
| 采样频率 | 30 Hz |
| 轨迹数 | 10,300（10.3k） |
| 帧数 | 300 万+ |
| 任务数 | 260（归为 7 大类） |
| 任务类型 | 灵巧物体操作 / 人机交互 / 行走融合操作 等 |
| 模态 | RGB + 深度 + LiDAR + 触觉 + 自然语言标注 |
| 评测 | 云端评测平台（统一受控部署 + 测分反馈） |
| 开源 | GitHub（代码）+ HuggingFace（数据）+ 评测网站 |

> 📌 各类别的具体任务清单、基线策略（如 VLA / 模仿学习方法）的评测数值与对比，请以论文 PDF 与 [项目仓库](https://github.com/physical-superintelligence-lab/Humanoid-Everyday) 为准。

---

## 🤖 对仿真基准 / 人形操作学习的意义

| 方向 | 含义 |
|---|---|
| **数据广度** | 把人形操作从「桌面抓放」拓展到行走融合、人机交互等开放世界日常，分布更真实 |
| **模态完整** | 触觉 + LiDAR 补齐富接触与空间推理所需信息，利于接触密集/几何相关任务 |
| **可比性** | 云端统一评测让不同策略「同台测分」，缓解机器人研究里「各测各的」难复现问题 |
| **生态价值** | 全开源（含真机数据与采集系统），是人形 VLA / 模仿学习的可直接取用语料 |

---

## 🎤 面试参考

**Q：为什么需要 Humanoid Everyday 这样的数据集？**
A：人形要做通用日常助手，但现有机器人数据集多是固定底座的桌面抓放——缺腿（不含行走融合操作）、缺人机交互、缺触觉/LiDAR，分布太窄。它用真机大规模采集开放世界日常任务，把广度、形态和模态一次补齐。

**Q：它的「多模态」相比常见数据集多了什么？为什么重要？**
A：在 RGB 之外同步了**深度、LiDAR、触觉**和语言标注。触觉对富接触操作（判断接触与握力）很关键，LiDAR 提供三维几何/空间感知，二者正是已有 RGB 为主数据集普遍缺失、却对开放世界任务很重要的信息。

**Q：为什么强调云端评测平台？**
A：机器人研究长期被「各测各的、难复现」困扰。提供统一受控的云端评测，让大家上传策略在同一设置下测分，结果可复现、可横向对比——这一步把单纯的数据集升级成了真正的基准。

**Q：它和 HumanoidBench、GRUtopia 这类有何不同？**
A：HumanoidBench / GRUtopia 偏**仿真**任务套件/环境，Humanoid Everyday 是**真机采集的大规模多模态操作数据集 + 云端评测**，定位更像「人形操作的真实数据语料 + 统一测分」，与仿真基准互补。

---

## 🔗 相关阅读

- [HumanoidBench: Simulated Humanoid Benchmark for Whole-Body Locomotion and Manipulation](../HumanoidBench/HumanoidBench.html)：仿真侧的人形全身基准，与本文真机数据集互补，本仓库已有笔记
- [MolmoSpaces: A Large-Scale Open Ecosystem for Robot Navigation and Manipulation](../MolmoSpaces__A_Large-Scale_Open_Ecosystem_for_Robot_Navigation_and_Manipulation/MolmoSpaces__A_Large-Scale_Open_Ecosystem_for_Robot_Navigation_and_Manipulation.html)：同为大规模开源具身数据/生态，本仓库已有笔记
- [Benchmarking Humanoid Imitation Learning with Motion Difficulty](../Benchmarking_Humanoid_Imitation_Learning_with_Motion_Difficulty/Benchmarking_Humanoid_Imitation_Learning_with_Motion_Difficulty.html)：人形模仿学习评测的另一视角（动作难度标尺），本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要、项目 GitHub（[physical-superintelligence-lab/Humanoid-Everyday](https://github.com/physical-superintelligence-lab/Humanoid-Everyday)）与 HuggingFace 数据集页整理；网络受限期间论文全文 HTML/PDF 未完整抓取，**各类别任务明细、基线策略的评测数值与消融**请以论文 PDF 与项目仓库为准。
