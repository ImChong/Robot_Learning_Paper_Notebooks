---
layout: paper
title: "OmniControl: Control Any Joint at Any Time for Human Motion Generation"
zhname: "OmniControl：任意关节、任意时刻可控的人体动作生成"
category: "Human Motion"
arxiv: "2310.08580"
---

# OmniControl: Control Any Joint at Any Time for Human Motion Generation
**OmniControl：任意关节、任意时刻可控的人体动作生成**

> 📅 阅读日期: 2026-07-20
>
> 🏷️ 板块: 14 Human Motion · 可控动作生成 · 扩散模型 · 空间引导 · 真实性引导 · 多关节约束
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → 14_Human_Motion），与上游 awesome-humanoid-robot-learning 对齐

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2023 年 10 月（ICLR 2024） |
| arXiv | [2310.08580](https://arxiv.org/abs/2310.08580) · [PDF](https://arxiv.org/pdf/2310.08580) · [HTML](https://arxiv.org/html/2310.08580v2) |
| 作者 | Yiming Xie、Varun Jampani、Lei Zhong、Deqing Sun、Huaizu Jiang（Northeastern University · Google Research · Stability AI） |
| 项目页 | [neu-vi.github.io/omnicontrol](https://neu-vi.github.io/omnicontrol/) |
| 源码 | 🌟 [github.com/neu-vi/OmniControl](https://github.com/neu-vi/OmniControl) |
| 主题 | cs.CV · 可控人体动作生成 / 扩散 / 空间约束 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 现有**文本条件**的人体动作扩散模型只能控制**骨盆（pelvis）**一个关节，难以满足「让右手在第 t 帧碰到某个位置」这类**任意关节、任意时刻**的空间需求。**OmniControl** 只用**一个模型**，即可把**灵活的空间控制信号**加到**不同关节、不同时刻**上。核心是两套**互补引导**：① **空间引导（Spatial Guidance）**——用解析方式对全局坐标施加梯度，确保生成动作**紧贴（tightly conform）**输入控制信号；② **真实性引导（Realism Guidance）**——对**所有关节**做协调修正，让整段动作更**连贯自然**。两者在「控制精度」与「动作真实性」之间取得平衡，缺一不可。在 **HumanML3D** 与 **KIT-ML** 上，骨盆控制**显著超 SOTA**，对头/手/脚等**其他关节**的约束也取得可观效果。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| OmniControl | 任意关节任意时刻可控的动作生成框架 |
| Spatial Guidance | 空间引导（解析梯度，紧贴控制信号） |
| Realism Guidance | 真实性引导（全身关节协调修正） |
| Control Signal | 稀疏空间控制信号（关节 × 时刻 的目标位置） |
| MDM | Motion Diffusion Model（底座扩散模型） |
| HumanML3D / KIT-ML | 常用文本-动作数据集 |

---

## ❓ 论文要解决什么问题？

- **只控骨盆不够**：先前工作（如 GMD）主要在**骨盆轨迹**上做空间控制，无法表达「手/脚/头在指定时刻到达指定位置」这类需求；
- **要一个模型管全部**：理想上应支持**任意关节子集 × 任意时间子集**的稀疏约束，而不是每种约束训一个模型；
- **精度与真实性的矛盾**：硬性把关节拉到目标点容易破坏动作自然度，需要在**贴合约束**和**动作协调**间平衡。

OmniControl 目标：**单模型**支持**灵活的多关节 / 多时刻空间控制**，同时保持动作真实。

---

## 🔧 方法详解

### 1. 底座：文本条件动作扩散（MDM）
在扩散去噪框架上生成文本驱动的动作序列，控制信号以「关节 × 时刻 → 目标全局位置」的**稀疏张量**形式给出（未指定处为空）。

### 2. 空间引导（Spatial Guidance）
在采样过程中对生成结果施加**解析梯度**：把关节的**全局坐标**与控制信号求距离并回传梯度，推动动作**紧贴**目标位置。相比隐式约束，解析形式让**任意关节、任意帧**都能被精确牵引。

### 3. 真实性引导（Realism Guidance）
仅靠空间引导会把单个关节「硬拽」到目标、破坏整体协调。真实性引导通过网络对**所有关节**输出残差式修正，让被约束关节的位移**自然传导**到全身，保证动作连贯。

### 4. 二者互补
- **空间引导** → 保证**控制精度**（贴合信号）；
- **真实性引导** → 保证**动作真实**（全身协调）；
- 论文强调两者「essential and highly complementary」，去掉任一都会显著变差。

### 5. 结果
在 **HumanML3D / KIT-ML** 上：**骨盆控制显著超 SOTA**（轨迹误差、控制误差更低且不牺牲生成质量），并首次在**头/左右手/左右脚**等多关节约束上给出有效结果。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    TXT["📝 文本提示"] --> DIFF
    CTRL["📍 稀疏控制信号<br/>(任意关节 × 任意时刻)"] --> SG
    subgraph DIFF["扩散去噪 (MDM 底座)"]
        direction TB
        SG["空间引导<br/>解析梯度 · 紧贴控制信号"]
        RG["真实性引导<br/>全身关节协调修正"]
        SG --> RG
    end
    DIFF --> OUT["🕺 可控动作<br/>骨盆控制超 SOTA<br/>+ 头/手/脚多关节约束"]

    style DIFF fill:#e8f0fd,stroke:#2e6fb5,color:#12335c
    style SG fill:#fff4e0,stroke:#e08a1e,color:#5c3a12
    style RG fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **任意关节 × 任意时刻**：单模型支持对不同关节、不同帧施加灵活稀疏空间约束，突破「只控骨盆」的局限；
2. **空间引导（解析梯度）**：让生成动作紧贴控制信号，控制精度高；
3. **真实性引导（全身协调）**：把局部约束自然传导至全身，保动作连贯；
4. **两者互补、缺一不可**：在控制精度与真实性之间取得平衡，HumanML3D / KIT-ML 上骨盆控制显著超 SOTA。

---

## 🤖 对人形机器人学习的启发

- **多关节 / 多时刻的稀疏目标控制**与人形「末端到达指定位姿」「脚在指定时刻踩指定落点」高度相关，可作为动作先验的上游生成器；
- **空间引导（解析梯度）+ 真实性引导（协调修正）** 的解耦思路，可类比机器人「硬约束满足」与「全身可行性/自然度」的分工；
- **单模型覆盖任意约束子集**对可复用的目标驱动控制器有借鉴意义，避免为每种约束单独训练；
- 生成的多关节可控动作可作为人形动作跟踪 / 重定向的参考轨迹来源。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2310.08580](https://arxiv.org/abs/2310.08580) | 论文正文（空间引导、真实性引导、实验） |
| [项目页 neu-vi.github.io/omnicontrol](https://neu-vi.github.io/omnicontrol/) | 可视化演示与多关节控制样例 |
| [github.com/neu-vi/OmniControl](https://github.com/neu-vi/OmniControl) | 官方开源代码与预训练模型 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与项目页整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·可控动作扩散**：[Guided Motion Diffusion（GMD，骨盆轨迹/避障）](../Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis/Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis.html) · [Flexible Motion In-betweening](../Flexible_Motion_In-betweening_with_Diffusion_Models/Flexible_Motion_In-betweening_with_Diffusion_Models.html) · [PhysDiff（物理引导扩散）](../PhysDiff__Physics-Guided_Human_Motion_Diffusion_Model/PhysDiff__Physics-Guided_Human_Motion_Diffusion_Model.html)。
