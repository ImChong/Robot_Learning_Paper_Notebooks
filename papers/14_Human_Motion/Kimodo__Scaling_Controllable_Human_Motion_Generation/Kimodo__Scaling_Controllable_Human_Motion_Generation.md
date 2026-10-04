---
layout: paper
paper_order: 7
title: "Kimodo: Scaling Controllable Human Motion Generation"
zhname: "Kimodo：用 700 小时光学动捕把「可控人体动作生成」扩大规模"
category: "人体动作生成"
---

# Kimodo: Scaling Controllable Human Motion Generation
**Kimodo：在 700 小时商用友好动捕数据上训练的运动学动作扩散模型，用文本 + 多种运动学约束精确可控地生成高质量人 / 人形动作**

> 📅 阅读日期: 2026-06-13
>
> 🏷️ 板块: 14 Human Motion · 文本驱动 / 运动学约束 / 扩散模型 / 数据规模化
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 3 月 |
| arXiv | [2603.15546](https://arxiv.org/abs/2603.15546) · [PDF](https://arxiv.org/pdf/2603.15546) · [HTML](https://arxiv.org/html/2603.15546v1) |
| 项目页 | [research.nvidia.com · Kimodo](https://research.nvidia.com/labs/sil/projects/kimodo/) · [xbpeng 镜像](https://xbpeng.github.io/projects/Kimodo/index.html) |
| 技术报告 | [kimodo_tech_report.pdf](https://research.nvidia.com/labs/sil/projects/kimodo/assets/kimodo_tech_report.pdf) |
| 代码 | [nv-tlabs/kimodo](https://github.com/nv-tlabs/kimodo)（Apache-2.0，含推理 / CLI / 交互 demo / 评测基准） |
| 模型 | [HuggingFace · nvidia](https://huggingface.co/nvidia) |
| 作者 | Davis Rempe\*、Mathis Petrovich\*、Ye Yuan 等（NVIDIA；\* 共同一作） |
| 机构 | NVIDIA（Spatial Intelligence Lab / DAIR） |
| 数据 | 700 小时商用友好光学动捕（含 BONES-SEED 细粒度时序文本标注） |

> 来源：YanjieZe/awesome-humanoid-robot-learning · 14 Human Motion Analysis and Synthesis 第 520 项。

---

## 🎯 一句话总结

> 公开动捕数据太小，限制了生成式动作模型的质量、控制精度与泛化。Kimodo 用 **700 小时商用友好光学动捕**把规模拉起来，配上**精心设计的运动表示**和**两阶段去噪器（先 root 再 body）**，在尽量减少动作伪影的同时支持**文本 + 一整套运动学约束**（全身关键帧、稀疏关节位置 / 旋转、2D 路点、稠密 2D 路径）灵活组合，并能输出 SMPL-X / Unitree G1 等多种骨架，定位为机器人 / 仿真 / 娱乐的高质量动作数据来源。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Kinematic Motion Diffusion | 运动学（非物理仿真）层面的动作扩散生成模型 |
| Mocap | Motion Capture，动作捕捉 |
| Keyframe | 关键帧，指定某些时刻的全身姿态 |
| Waypoint / Path | 2D 路点（离散目标点）/ 稠密 2D 路径（连续轨迹） |
| SMPL-X | 参数化人体网格模型，常用动作表示 |
| Foot Skate | 脚底打滑伪影，本文有后处理清理 |

---

## ❓ 论文要解决什么问题？

高质量人体动作数据在**机器人、仿真、娱乐**里越来越重要，生成式模型本可以成为一种「数据来源」——用文本或姿态约束直接合成动作。但现实瓶颈是：

- **公开动捕数据集规模太小**，导致生成动作质量不够、控制精度不足、泛化差；
- **控制方式零散**：文本、关键帧、稀疏关节、路径……往往各做各的，难以在同一个模型里统一且精确地条件化；
- **root（全局位移 / 朝向）与 body（局部姿态）混在一起预测**，容易出现抖动、漂移、脚底打滑等伪影。

Kimodo 的目标：**把数据规模做大 + 把控制接口做全 + 把动作质量做高**，三者兼得。

---

## 🔧 方法详解

### 1. 数据规模化：700 小时商用友好动捕
核心前提是数据。Kimodo 收集 / 整理了约 **700 小时**、**商用许可友好**的光学动捕数据，并为其中的 BONES-SEED 数据提供**细粒度时序文本标注**（同一段动作不同时间段对应不同文本描述），使「文本 → 动作」的对齐更精细。

### 2. 运动表示 + 两阶段去噪器（root / body 解耦）
- **精心设计的运动表示**：让全身姿态、全局轨迹、约束信号都能统一编码进扩散过程；
- **两阶段去噪器**：把 **root（全局平移 / 朝向）预测**与 **body（局部关节姿态）预测**拆开、分阶段去噪。先定下全局走向、再细化身体姿态，从而**减小伪影**（漂移 / 抖动），同时为各种约束留出灵活的条件化入口。

### 3. 统一、可组合的控制接口
同一个模型支持文本与多种运动学约束，并可叠加：

| 控制类型 | 说明 |
|---|---|
| 文本 | 自然语言提示，描述要做的动作 |
| 全身关键帧 | 指定若干时刻的完整姿态 |
| 稀疏关节位置 / 旋转 | 只约束部分末端 / 关节（如手、头） |
| 2D 路点 | 地面上的离散目标点 |
| 稠密 2D 路径 | 连续的行走 / 移动轨迹 |

### 4. 多骨架输出 + 后处理
支持 **SOMA / Unitree G1 / SMPL-X** 等多种骨架变体；并提供**脚底打滑清理与约束精修**等后处理，可对接 MuJoCo / ProtoMotions / GMR 等机器人 / 仿真框架，直接作为参考动作数据使用。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["📦 数据规模化"]
        A1["700h 商用友好光学动捕"]
        A2["BONES-SEED 细粒度时序文本标注"]
        A1 --> A2
    end

    subgraph CTRL["🎛️ 统一控制接口（可组合）"]
        C1["文本提示"]
        C2["全身关键帧"]
        C3["稀疏关节 位置/旋转"]
        C4["2D 路点 / 稠密 2D 路径"]
    end

    subgraph MODEL["🌀 两阶段去噪扩散器"]
        M0["精心设计的运动表示"]
        M1["阶段①: root 预测<br/>(全局平移 / 朝向)"]
        M2["阶段②: body 预测<br/>(局部关节姿态)"]
        M0 --> M1 --> M2
    end

    subgraph OUT["🕺 输出"]
        O1["高质量动作<br/>(少伪影)"]
        O2["多骨架: SMPL-X / G1 / SOMA"]
        O3["后处理: 脚滑清理 / 约束精修"]
        O1 --> O2 --> O3
    end

    DATA --> M0
    C1 --> M1
    C2 --> M1
    C3 --> M2
    C4 --> M1
    M2 --> O1
    O3 --> USE["🤖 机器人 / 仿真 / 娱乐<br/>(MuJoCo · ProtoMotions · GMR)"]

    style DATA fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style CTRL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style MODEL fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style USE fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **数据规模化**：构建 / 整理 **700 小时商用友好光学动捕**，并配细粒度时序文本标注，直击「公开动捕太小」的根本瓶颈；
2. **两阶段去噪架构**：将 **root 与 body 解耦**分阶段去噪，显著减少漂移 / 抖动 / 脚滑等伪影，同时为多约束留出灵活条件化入口；
3. **统一可组合控制**：单模型同时支持文本、全身关键帧、稀疏关节位置 / 旋转、2D 路点与稠密 2D 路径，可叠加使用；
4. **多骨架 + 工程闭环**：输出 SMPL-X / Unitree G1 等骨架，配脚滑清理与约束精修后处理，并可接入 MuJoCo / ProtoMotions / GMR；
5. **开源生态**：开放推理代码、交互式时间轴编辑 demo、动作生成评测基准与模型权重（Apache-2.0 代码）。

---

## 🤖 对人形机器人学习的启发

- **作为参考动作数据源**：人形 WBC / 动作跟踪（GMT、HOVER、SONIC 等）高度依赖高质量参考动作；Kimodo 直接面向「可控、可批量、商用友好」的动作生成，且原生支持 **Unitree G1 骨架**与 **GMR / ProtoMotions** 对接，可作为 sim 训练的动作来源；
- **root / body 解耦的去噪思路**：与机器人侧「先定全局轨迹再细化姿态」的分层控制思想相通，对减少漂移 / 脚滑有借鉴；
- **统一约束接口**：文本 + 关键帧 + 稀疏关节 + 路径的可组合条件化，呼应人形遥操作 / 多命令策略对「统一指令接口」的需求；
- **数据是第一性**：本文再次印证「把数据规模做上去」往往比改架构更能提升质量与泛化，对人形动作数据飞轮的搭建有方法论意义。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2603.15546](https://arxiv.org/abs/2603.15546) | 论文 / 技术报告正文 |
| [项目页](https://research.nvidia.com/labs/sil/projects/kimodo/) | 概述、视频、文档 |
| [nv-tlabs/kimodo](https://github.com/nv-tlabs/kimodo) | 官方实现：推理 / CLI / 交互 demo / 评测基准（Apache-2.0） |
| [HuggingFace · nvidia](https://huggingface.co/nvidia) | 模型权重 |

---

## 🔗 相关阅读

- **同模块前作**：[Control Operators](../Control_Operators_for_Interactive_Character_Animation/Control_Operators_for_Interactive_Character_Animation.html)（可组合控制接口）· [MAGNet](../MAGNet__Diffusion_Forcing_for_Multi-Agent_Interaction_Sequence_Modeling/MAGNet__Diffusion_Forcing_for_Multi-Agent_Interaction_Sequence_Modeling.html) · [Learned Motion Matching](../Learned_Motion_Matching/Learned_Motion_Matching.html)；
- **生成式动作控制**：BeyondMimic（引导扩散）、OmniControl、Guided Motion Diffusion；
- **人形动作跟踪用法对照**：GMT、HOVER、SONIC（消费参考动作的下游策略）。
