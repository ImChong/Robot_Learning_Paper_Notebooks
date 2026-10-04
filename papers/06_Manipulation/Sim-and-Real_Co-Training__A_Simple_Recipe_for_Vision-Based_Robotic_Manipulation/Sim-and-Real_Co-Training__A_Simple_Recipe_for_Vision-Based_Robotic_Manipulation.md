---
layout: paper
title: "Sim-and-Real Co-Training: A Simple Recipe for Vision-Based Robotic Manipulation"
zhname: "Sim-and-Real 协同训练：基于视觉的机器人操作的简单配方"
category: "Manipulation"
arxiv: "2503.24361"
---

# Sim-and-Real Co-Training: A Simple Recipe for Vision-Based Robotic Manipulation
**与其只做 sim-to-real 迁移，不如在训练时直接把仿真与真实数据混合协同训练；在机械臂与人形系统、多样操作任务上系统实验表明：即便仿真与真实数据差异明显，仿真数据也能把真实任务表现平均提升 38%**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 协同训练 · sim+real 混合 · 视觉操作 · 数据配方
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 3 月 |
| arXiv | [2503.24361](https://arxiv.org/abs/2503.24361) · [PDF](https://arxiv.org/pdf/2503.24361) · [HTML](https://arxiv.org/html/2503.24361v1) |
| 作者 | Abhiram Maddukuri、Zhenyu Jiang、Soroush Nasiriany、Ken Goldberg、Ajay Mandlekar、Linxi Fan、Yuke Zhu 等（NVIDIA / Berkeley / UT） |
| 主题 | cs.RO · 协同训练 / sim+real / 视觉操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 大规模真实机器人数据集潜力大，但**真实人类数据采集费时费力**。本文主张：**与其只做 sim-to-real 迁移，不如在训练时直接把「仿真」与「真实」数据集混合协同训练（co-training）**。通过在**机械臂与人形系统**、多样操作任务上的**系统实验**，作者证明：**即便仿真与真实数据有明显差异**，**仿真数据也能把真实任务表现平均提升 38%**。这给出一个**简单有效的视觉操作训练配方**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Co-Training | 协同训练，sim 与 real 数据混合训练 |
| Sim-to-Real | 仿真到真机迁移（被对比对象） |
| Vision-Based | 基于视觉的策略 |
| Domain Gap | 域差距（sim 与 real 差异） |
| Recipe | 配方，可复用的训练做法 |
| Generalist | 通才机器人模型 |

---

## ❓ 论文要解决什么问题？

真实数据采集贵，仿真数据多但有域差距：
- 纯 **sim-to-real 迁移**常需精心对齐；
- 想更**简单**地用上仿真数据提升真实表现。

论文要：一个**简单配方**——直接 **sim + real 协同训练**，看仿真数据能否稳定帮真实任务。

---

## 🔧 方法详解

### 1. 协同训练（sim + real 混合）
**训练时混合**仿真与真实数据集，而非分两段做迁移——让模型同时见到两域数据。

### 2. 系统实验（臂 + 人形）
在**机械臂与人形系统**、多样视觉操作任务上**系统研究**最优训练配方（如混合比例等）。

### 3. 结论
- 即便 **sim 与 real 差异明显**，仿真数据**平均 +38%** 真实表现；
- 给出简单可复用的配方。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    SIM["🌀 仿真数据"] --> CO
    REAL["📷 真实数据"] --> CO
    subgraph CO["协同训练(混合)"]
        T["同时学 sim + real"]
    end
    CO --> OUT["🤖 臂 + 人形<br/>真实任务平均 +38%"]

    style CO fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **sim+real 协同训练配方**：训练时混合，而非两段迁移；
2. **系统实验（臂 + 人形）**：研究最优配方；
3. **+38% 真实表现**：即便域差异明显；
4. **简单可复用**：易嫁接到现有视觉操作流程。

---

## 🤖 对人形机器人学习的启发

- **"混合训练 > 两段迁移"是反直觉但实用的洞见**：让模型同时见两域更稳；
- **仿真数据即便不完美也有用**，降低对昂贵真实数据的依赖；
- 对人形（真实采集更难）尤其有价值；
- 与 DreamGen、DexMimicGen 等"用仿真/合成数据扩规模"思路互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.24361](https://arxiv.org/abs/2503.24361) | 论文正文（协同训练配方、臂/人形实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（38%）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块/相关·数据扩展**：[DreamGen](../DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models/DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models.html) · [Humanoid Policy ~ Human Policy](../Humanoid_Policy__Human_Policy/Humanoid_Policy__Human_Policy.html)。
