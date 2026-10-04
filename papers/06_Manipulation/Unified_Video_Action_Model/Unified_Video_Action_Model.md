---
layout: paper
title: "Unified Video Action Model"
zhname: "Unified Video Action Model：统一视频-动作模型"
category: "Manipulation"
arxiv: "2503.00200"
---

# Unified Video Action Model
**视频给动作预测提供丰富场景信息、动作给视频预测提供动力学，统一二者对机器人很有价值，但以往视频生成类方法在动作精度与推理速度上不如直接策略学习；UVA 联合优化视频与动作预测，关键是学一个视频-动作联合潜表示并解耦视频-动作解码（两个轻量扩散头），从而推理时可绕过视频生成实现高速动作输出，并经掩码输入训练支持策略、正逆动力学、视频预测等多功能**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 视频-动作统一 · 联合潜表示 · 解耦解码 · 扩散头 · 高速推理
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 2 月 |
| arXiv | [2503.00200](https://arxiv.org/abs/2503.00200) · [PDF](https://arxiv.org/pdf/2503.00200) · [HTML](https://arxiv.org/html/2503.00200v1) |
| 作者 | Shuang Li、Yihuai Gao、Dorsa Sadigh、Shuran Song（Stanford） |
| 主题 | cs.RO · 视频-动作统一 / 策略学习 / 扩散 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> **统一的视频-动作模型**对机器人很有价值：**视频**给动作预测提供丰富**场景信息**，**动作**给视频预测提供**动力学信息**。但有效结合视频生成与动作预测仍难——现有**视频生成类**方法在**动作精度与推理速度**上**不如直接策略学习**。为弥合此差距，本文提出 **Unified Video Action 模型（UVA）**，**联合优化**视频与动作预测，同时实现**高精度**与**高效动作推理**。关键在于：学一个**视频-动作联合潜表示**，并**解耦视频-动作解码**（用**两个轻量扩散头**）。这样**推理时可绕过视频生成**实现**高速动作输出**；并通过**掩码输入训练**支持**策略学习、正/逆动力学建模、视频观测预测**等多功能。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| UVA | Unified Video Action 模型 |
| Joint Latent | 视频-动作联合潜表示 |
| Decoupled Decoding | 解耦解码（视频/动作分头） |
| Diffusion Head | 轻量扩散头 |
| Masked Input | 掩码输入训练（多功能） |
| Forward/Inverse Dynamics | 正/逆动力学 |

---

## ❓ 论文要解决什么问题？

视频生成与动作预测各有所长但难统一：
- 视频给场景、动作给动力学，统一有益；
- 但**视频生成类**方法**动作不准、推理慢**，不如直接策略。

UVA 要：**联合优化**视频 + 动作，**既准又快**，且**一模型多功能**。

---

## 🔧 方法详解

### 1. 视频-动作联合潜表示
学一个**联合潜表示**，把视频与动作统一编码，让二者互相提供信息（场景 ↔ 动力学）。

### 2. 解耦解码 + 双轻量扩散头
**解耦视频-动作解码**：用**两个轻量扩散头**分别解码。推理时**可只走动作头、绕过视频生成**，实现**高速动作输出**。

### 3. 掩码输入训练（多功能）
**掩码输入**训练让一个模型支持：**策略学习、正/逆动力学、视频观测预测**等。

### 4. 结果
在多样机器人任务上**精度不输任务专用方法**，且**动作推理高效**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    IN["📷 视频观测 + 动作"] --> LAT
    subgraph UVA["UVA"]
        LAT["视频-动作联合潜表示"]
        VH["视频扩散头"]
        AH["动作扩散头(可单独走)"]
        LAT --> VH
        LAT --> AH
    end
    AH --> OUT["🤖 高速动作推理(绕过视频生成)<br/>策略/正逆动力学/视频预测 多功能"]

    style UVA fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **统一视频-动作模型 UVA**：联合优化、既准又快；
2. **联合潜表示 + 解耦解码**：双轻量扩散头；
3. **绕过视频生成的高速动作推理**；
4. **掩码训练多功能**：策略、正/逆动力学、视频预测。

---

## 🤖 对人形机器人学习的启发

- **"联合潜 + 解耦解码"是统一生成与策略的关键设计**：训练时用视频信息、推理时绕过它保速度；
- **一模型多功能**降低系统复杂度；
- 对人形操作，视频世界知识 + 高速动作两者兼得很重要；
- 与 DreamGen、Humanoid World Models 的"视频世界模型"路线在"视频↔动作"上呼应。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.00200](https://arxiv.org/abs/2503.00200) | 论文正文（联合潜表示、解耦解码、多功能实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块/相关·视频-动作/世界模型**：[DreamGen](../DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models/DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models.html) · [Humanoid World Models（本仓 11）](../../11_Simulation_Benchmark/Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics/Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics.html)。
