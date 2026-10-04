---
layout: paper
title: "Flexible Motion In-betweening with Diffusion Models"
zhname: "用扩散模型做灵活的动作中间帧补全"
category: "Human Motion"
arxiv: "2405.11126"
---

# Flexible Motion In-betweening with Diffusion Models
**动作中间帧补全（in-betweening）是角色动画的基础但费力任务；本文用扩散模型从用户关键帧生成多样、逼真的过渡动作，提出统一模型 CondMDI：支持任意密/稀关键帧放置、部分关键帧约束，并可文本条件，在 HumanML3D 上生成既精确又多样、与关键帧一致的高质量动作，并比较了引导与插补式的推理期关键帧方案**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 中间帧补全 · 扩散模型 · 关键帧约束 · 文本条件 · HumanML3D
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 5 月 |
| arXiv | [2405.11126](https://arxiv.org/abs/2405.11126) · [PDF](https://arxiv.org/pdf/2405.11126) · [HTML](https://arxiv.org/html/2405.11126v1) |
| 作者 | Setareh Cohan、Guy Tevet、Daniele Reda、Xue Bin Peng、Michiel van de Panne（UBC / SFU 等） |
| 主题 | cs.GR · 角色动画 / 动作补全 / 扩散模型 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> **动作中间帧补全（motion in-betweening）**是角色动画的基础任务：在用户给定的**关键帧约束**之间生成**合理过渡**的动作序列，长期被视为**费力且有挑战**。本文研究**扩散模型**在**关键帧引导**下生成**多样人类动作**的潜力。不同于以往补全方法，作者提出一个**简单统一**的模型，能生成**精确且多样**、符合**灵活范围**的用户**空间约束**与**文本条件**的动作——即 **CondMDI（Conditional Motion Diffusion In-betweening）**：允许**任意密集或稀疏关键帧放置**与**部分关键帧约束**，同时生成与给定关键帧**一致、连贯、多样**的高质量动作。在文本条件的 **HumanML3D** 数据集上评测，验证扩散模型用于关键帧补全的**通用性与有效性**，并进一步比较了**引导（guidance）**与**插补（imputation）**式的推理期关键帧方案。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| In-betweening | 中间帧补全，关键帧之间生成过渡 |
| CondMDI | 本文条件动作扩散补全模型 |
| Keyframe | 关键帧（用户指定约束） |
| Dense/Sparse | 密集/稀疏关键帧 |
| Imputation | 插补，推理期填入约束 |
| HumanML3D | 文本-动作数据集 |

---

## ❓ 论文要解决什么问题？

中间帧补全费力且约束方式僵硬：
- 以往方法**关键帧放置不灵活**（固定密度）；
- 难同时支持**部分约束 + 文本条件**；
- 要**多样且与关键帧一致**。

CondMDI 要：一个**统一扩散模型**，支持**任意密/稀、部分关键帧 + 文本**，生成多样一致的动作。

---

## 🔧 方法详解

### 1. CondMDI 统一条件扩散
一个模型即可处理**任意密集或稀疏关键帧**、**部分关键帧约束**，并叠加**文本条件**，生成符合空间约束的多样动作。

### 2. 灵活关键帧 + 文本
用户可在任意位置放关键帧（甚至只约束部分关节/帧），文本进一步指定语义。

### 3. 推理期关键帧方案比较
比较**引导（guidance）**与**插补（imputation）**两类推理期关键帧实现，分析各自优劣。

### 4. 评测
在 **HumanML3D** 上验证通用性与有效性，生成高质量、与关键帧一致的多样动作。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    KF["🔑 任意密/稀关键帧 + 部分约束"] --> M
    TXT["📝 文本条件"] --> M
    subgraph M["CondMDI 条件扩散"]
        D["统一模型生成过渡动作"]
    end
    M --> OUT["🕺 与关键帧一致的多样动作<br/>HumanML3D 验证"]

    style M fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **CondMDI 统一补全模型**：任意密/稀关键帧 + 部分约束 + 文本；
2. **多样且一致**：高质量过渡动作；
3. **推理期关键帧方案比较**：引导 vs 插补；
4. **HumanML3D 验证**：扩散模型补全的通用性。

---

## 🤖 对人形机器人学习的启发

- **灵活关键帧约束**对人形动作编辑/规划有用：给少量关键姿态即可补全全程；
- **引导 vs 插补**的推理期约束注入，是把硬约束加进扩散生成的通用手段（与 SafeFlow 的约束门控相通）；
- 角色动画补全经验可迁移到人形参考动作生成；
- 文本 + 空间双约束契合人形"语言 + 目标"控制。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2405.11126](https://arxiv.org/abs/2405.11126) | 论文正文（CondMDI、关键帧方案、HumanML3D 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·可控动作扩散**：[Guided Motion Diffusion（空间约束）](../Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis/Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis.html) · [Taming Diffusion（实时角色控制）](../Taming_Diffusion_Probabilistic_Models_for_Character_Control/Taming_Diffusion_Probabilistic_Models_for_Character_Control.html)。
