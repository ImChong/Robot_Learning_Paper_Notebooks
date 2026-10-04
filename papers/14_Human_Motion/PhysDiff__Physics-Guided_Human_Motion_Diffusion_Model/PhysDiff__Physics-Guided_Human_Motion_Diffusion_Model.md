---
layout: paper
title: "PhysDiff: Physics-Guided Human Motion Diffusion Model"
zhname: "PhysDiff：物理引导的人体动作扩散模型"
category: "Human Motion"
arxiv: "2212.02500"
---

# PhysDiff: Physics-Guided Human Motion Diffusion Model
**现有动作扩散模型忽视物理定律，常生成漂浮、脚滑、地面穿插等明显伪影；PhysDiff 把物理约束注入扩散去噪过程——用一个「物理引导的动作投影」模块，在去噪步中借物理仿真器里的动作模仿，把扩散出的动作投影成物理可行的动作，再引导下一步去噪，从而生成物理可信的高质量动作，大幅减少伪影（ICCV 2023 Oral）**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 物理引导 · 动作扩散 · 物理投影 · 减伪影 · ICCV 2023
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2022 年 12 月 |
| arXiv | [2212.02500](https://arxiv.org/abs/2212.02500) · [PDF](https://arxiv.org/pdf/2212.02500) · [HTML](https://arxiv.org/html/2212.02500v1) |
| 会议 | ICCV 2023（Oral） |
| 作者 | Ye Yuan、Jiaman Li、Yang Zou、Xiaolong Wang、Umar Iqbal、Sifei Liu、Jan Kautz（NVIDIA / Stanford） |
| 主题 | cs.CV · 人体动作扩散 / 物理可行性 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 去噪扩散模型在人体动作生成上效果很好，但**现有动作扩散模型忽视物理定律**，常生成带明显**伪影**的动作——**漂浮（floating）、脚滑（foot sliding/skating）、地面穿插（ground penetration）**等。PhysDiff 把**物理约束注入扩散过程**：提出一个**物理引导的动作投影（physics-guided motion projection）**模块——在扩散的**去噪步**中，借**物理仿真器**里的**动作模仿（motion imitation）**，把当前**扩散出的（含噪）动作投影成一个物理可行的动作**，再用它**引导下一步去噪**。如此生成的动作**物理可信**、自然，**大幅减少**上述伪影，在大规模人体动作数据集上取得**SOTA 的动作质量与物理可信度**。ICCV 2023 Oral。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| PhysDiff | 物理引导的动作扩散模型 |
| Motion Projection | 物理引导动作投影 |
| Motion Imitation | 物理仿真器里的动作模仿 |
| Floating / Foot Sliding | 漂浮 / 脚滑（被消除的伪影） |
| Ground Penetration | 地面穿插 |
| Denoising Step | 扩散去噪步 |

---

## ❓ 论文要解决什么问题？

动作扩散模型**不懂物理**：
- 生成动作有**漂浮、脚滑、穿地**等伪影；
- 纯数据驱动**无物理约束**，难保证可信。

PhysDiff 要：把**物理**注入扩散，生成**物理可信、少伪影**的动作。

---

## 🔧 方法详解

### 1. 物理引导动作投影（核心）
在扩散的某些**去噪步**插入一个**物理投影**：用**物理仿真器**里的**动作模仿策略**，把当前**含噪/扩散动作**"跑"成一个**物理可行**的动作（满足接触、重力、无穿插）。

### 2. 用投影结果引导下一步去噪
把**物理可行的投影动作**作为**引导**，回灌到扩散的**下一步去噪**——让生成过程"被物理拉回"可行流形。

### 3. 结果
生成动作**物理可信**、伪影大减（漂浮/脚滑/穿地），在大规模动作数据集上**动作质量 + 物理可信度 SOTA**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    NOISE["扩散含噪动作"] --> PROJ
    subgraph PROJ["物理引导动作投影"]
        SIM["物理仿真器 + 动作模仿<br/>→ 物理可行动作"]
    end
    PROJ -->|引导下一步去噪| DEN["去噪步"]
    DEN --> OUT["🕺 物理可信动作<br/>去漂浮/脚滑/穿地 (ICCV 2023)"]

    style PROJ fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **把物理注入动作扩散**：物理引导动作投影模块；
2. **去噪步内物理投影 + 引导**：用仿真器动作模仿拉回可行流形；
3. **大减伪影**：漂浮/脚滑/穿地；
4. **SOTA 物理可信度**：大规模动作数据集（ICCV 2023 Oral）。

---

## 🤖 对人形机器人学习的启发

- **"生成 + 物理投影"是把生成动作变可执行的关键范式**，与 SafeFlow（物理引导整流流）、Heracles 等"物理可执行生成"一脉相承；
- **用物理仿真器的动作模仿做投影**，直接把"可被机器人执行"注入生成；
- 去脚滑/穿地正是人形动作重定向/跟踪要解决的；
- 物理可信动作可作人形参考运动，减少 sim-to-real 风险。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2212.02500](https://arxiv.org/abs/2212.02500) | 论文正文（物理投影、扩散引导、实验） |

> ℹ️ 备注：本笔记依据该论文公开摘要与已知信息整理（本轮 arXiv 抓取受限）；**逐项数值与细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **相关·物理可执行生成（本仓 04）**：[SafeFlow（物理引导整流流）](../../04_Loco-Manipulation_and_WBC/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow/SafeFlow__Real-Time_Text-Driven_Humanoid_Whole-Body_Control_via_Physics-Guided_Rectified_Flow.html) · [Heracles](../../04_Loco-Manipulation_and_WBC/Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control/Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control.html)；
- **同模块·动作扩散**：[Guided Motion Diffusion](../Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis/Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis.html)。
