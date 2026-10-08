---
layout: paper
title: "EgoDemoGen: Egocentric Demonstration Generation for Viewpoint Generalization in Robotic Manipulation"
zhname: "EgoDemoGen：为操作视角泛化生成第一视角演示"
category: "Manipulation"
arxiv: "2509.22578"
---

# EgoDemoGen: Egocentric Demonstration Generation for Viewpoint Generalization in Robotic Manipulation
**EgoDemoGen：为操作视角泛化生成第一视角演示**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 视角泛化 · 第一视角演示生成 · 轨迹迁移 · 视频生成
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 9 月 |
| arXiv | [2509.22578](https://arxiv.org/abs/2509.22578) · [PDF](https://arxiv.org/pdf/2509.22578) · [HTML](https://arxiv.org/html/2509.22578v1) |
| 作者 | Yuan Xu、Jiabing Yang、Xiaofeng Wang、Zheng Zhu、Yan Huang、Liang Wang 等 |
| 主题 | cs.RO · 视角泛化 / 演示生成 / 视频合成 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 基于模仿学习的**视觉运动策略**表现强，但常对**第一视角视角变化（egocentric viewpoint shifts）敏感**。EgoDemoGen 是一个框架，在**无需多视角数据**的前提下，生成**新第一视角下的「观测-动作」配对演示**。它由两部分组成：① **EgoTrajTransfer**——用**运动技能分割 + 几何感知变换 + 逆运动学滤波**，把机器人轨迹**迁移到新第一视角帧**；② **EgoViewTransfer**——一个**条件视频生成模型**，把**新视角重投影的场景**与**渲染的机器人运动**融合，合成**逼真观测**。实验：仿真策略成功率绝对提升 **+24.6% 与 +16.9%**；真机在不同视角条件下提升 **+16.0% 与 +23.0%**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Viewpoint Generalization | 视角泛化，应对视角变化 |
| EgoTrajTransfer | 轨迹迁移到新第一视角 |
| EgoViewTransfer | 条件视频生成新视角观测 |
| IK Filtering | 逆运动学滤波 |
| Geometry-aware | 几何感知变换 |
| Paired Demo | 观测-动作配对演示 |

---

## ❓ 论文要解决什么问题？

视觉运动策略**对第一视角视角变化敏感**：
- 头部/相机视角一变，策略就退化；
- 采集**多视角数据**昂贵。

EgoDemoGen 要：**无需多视角数据**，**生成**新视角下的配对演示来提升视角泛化。

---

## 🔧 方法详解

### 1. EgoTrajTransfer：轨迹迁到新视角
用**运动技能分割 + 几何感知变换 + 逆运动学滤波**，把机器人轨迹迁移到**新第一视角帧**，得到新视角下的动作。

### 2. EgoViewTransfer：合成逼真新视角观测
一个**条件视频生成模型**，融合**新视角重投影场景**与**渲染机器人运动**，合成**逼真观测**，与迁移的动作配对。

### 3. 结果（无需多视角数据）
- **仿真**：+24.6%、+16.9%；
- **真机**：+16.0%、+23.0%（不同视角条件）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    ORIG["原视角机器人轨迹"] --> TT["EgoTrajTransfer<br/>(技能分割+几何变换+IK滤波)"]
    TT --> VT["EgoViewTransfer<br/>(条件视频生成新视角观测)"]
    VT --> PAIR["新视角观测-动作配对演示"]
    PAIR --> OUT["🤖 视角泛化<br/>仿真 +24.6/16.9% · 真机 +16/23%"]

    style TT fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style VT fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **无需多视角数据的视角泛化**：生成新第一视角配对演示；
2. **EgoTrajTransfer**：技能分割 + 几何变换 + IK 滤波迁移轨迹；
3. **EgoViewTransfer**：条件视频生成逼真新视角观测；
4. **显著提升**：仿真 +24.6/16.9%、真机 +16/23%。

---

## 🤖 对人形机器人学习的启发

- **视角敏感是视觉运动策略的通病**，尤其第一视角人形；
- **"生成数据补视角"**比采集多视角更省；
- **轨迹迁移 + 视频生成**组合是合成配对演示的有效范式；
- 与 EgoMI（主动视觉）从不同角度解决视角问题。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2509.22578](https://arxiv.org/abs/2509.22578) | 论文正文（EgoTrajTransfer、EgoViewTransfer、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·视角/主动视觉**：[EgoMI（主动视觉头手协调）](../EgoMI__Learning_Active_Vision_and_Whole-Body_Manipulation_from_Egocentric_Human_Demos/EgoMI__Learning_Active_Vision_and_Whole-Body_Manipulation_from_Egocentric_Human_Demos.html) · [Masquerade（编辑人类视频）](../Masquerade__Learning_from_In-the-wild_Human_Videos_using_Data-Editing/Masquerade__Learning_from_In-the-wild_Human_Videos_using_Data-Editing.html)。
