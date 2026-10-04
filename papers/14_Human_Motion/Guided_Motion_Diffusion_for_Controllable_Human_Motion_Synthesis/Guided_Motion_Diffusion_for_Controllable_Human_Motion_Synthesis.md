---
layout: paper
title: "Guided Motion Diffusion for Controllable Human Motion Synthesis"
zhname: "GMD：用引导式动作扩散做可控的人体动作合成"
category: "Human Motion"
arxiv: "2305.12577"
---

# Guided Motion Diffusion for Controllable Human Motion Synthesis
**文本条件的动作扩散难以纳入空间约束（预定轨迹、障碍物），而这对连接孤立动作与周遭环境很关键；GMD 把空间约束注入生成：用特征投影方案增强空间信息与局部姿态的一致性、配新的插补公式让动作可靠遵循全局轨迹，并用「稠密引导」把易被忽略的稀疏约束（如稀疏关键帧）转成更密的引导信号，在文本动作生成上显著超 SOTA 且支持轨迹跟随与避障**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 可控动作扩散 · 空间约束 · 特征投影 · 稠密引导 · 轨迹/避障
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2023 年 5 月 |
| arXiv | [2305.12577](https://arxiv.org/abs/2305.12577) · [PDF](https://arxiv.org/pdf/2305.12577) · [HTML](https://arxiv.org/html/2305.12577v1) |
| 作者 | Korrawe Karunratanakul、Konpat Preechakul、Supasorn Suwajanakorn、Siyu Tang（ETH Zürich / VISTEC） |
| 主题 | cs.CV · 可控动作合成 / 扩散 / 空间约束 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 去噪扩散在**文本条件**的人体动作合成上很有前景，但**纳入空间约束**（如**预定运动轨迹**与**障碍物**）仍难——而这对连接**孤立动作**与其**周遭环境**至关重要。GMD（**Guided Motion Diffusion**）把**空间约束**注入动作生成：① 提出有效的**特征投影方案**，操纵动作表示以增强**空间信息**与**局部姿态**的一致性；② 配一个新的**插补公式（imputation formulation）**，使生成动作可靠**遵循全局运动轨迹**等空间约束；③ 针对**稀疏空间约束**（如稀疏关键帧）易在反向步骤中**被忽略**的问题，提出**稠密引导（dense guidance）**，把稀疏信号转成**更密**的信号去引导生成。实验证明 GMD 在**文本动作生成**上**显著超 SOTA**，同时支持**轨迹跟随与避障**等空间控制。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| GMD | Guided Motion Diffusion |
| Spatial Constraint | 空间约束（轨迹/障碍） |
| Feature Projection | 特征投影（增强空间-姿态一致性） |
| Imputation | 插补公式（约束遵循） |
| Dense Guidance | 稠密引导（稀疏→密集信号） |
| Trajectory Following | 轨迹跟随 |

---

## ❓ 论文要解决什么问题？

文本动作扩散难纳入**空间约束**：
- 预定**轨迹/障碍**难融入生成；
- **稀疏约束**（稀疏关键帧）在反向去噪中**易被忽略**；
- 要把**孤立动作**与**环境**连接。

GMD 要：把空间约束**可靠注入**文本动作扩散，支持轨迹跟随/避障。

---

## 🔧 方法详解

### 1. 特征投影（空间-姿态一致性）
**特征投影方案**操纵动作表示，让**空间信息**与**局部姿态**更一致，便于约束生效。

### 2. 插补公式（遵循全局轨迹）
新的**插补公式**让生成动作可靠**遵循全局运动轨迹**等空间约束。

### 3. 稠密引导（救稀疏约束）
**稠密引导**把**稀疏关键帧**等易被忽略的信号转成**更密**的引导信号，确保被遵循。

### 4. 结果
文本动作生成**显著超 SOTA**，并支持**轨迹跟随、避障**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    TXT["📝 文本"] --> GMD
    SP["📐 空间约束(轨迹/障碍/稀疏关键帧)"] --> GMD
    subgraph GMD["GMD 引导扩散"]
        FP["特征投影(空间-姿态一致)"]
        IMP["插补公式(遵循轨迹)"]
        DG["稠密引导(稀疏→密)"]
    end
    GMD --> OUT["🕺 可控动作<br/>文本超 SOTA + 轨迹跟随/避障"]

    style GMD fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **GMD 空间约束注入**：把轨迹/障碍纳入文本动作扩散；
2. **特征投影**：增强空间信息与局部姿态一致性；
3. **插补公式 + 稠密引导**：可靠遵循约束、救稀疏信号；
4. **超 SOTA + 空间可控**：轨迹跟随与避障。

---

## 🤖 对人形机器人学习的启发

- **空间约束注入**是把"环境/轨迹"接进生成式动作的关键，与人形导航/避障相关；
- **稠密引导救稀疏约束**是通用技巧，可借鉴到稀疏关键帧/目标控制；
- **特征投影增强一致性**有助于约束真正生效；
- 可控动作生成是人形"目标驱动动作"的上游方法。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2305.12577](https://arxiv.org/abs/2305.12577) | 论文正文（特征投影、插补、稠密引导、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·可控/物理动作扩散**：[Flexible Motion In-betweening](../Flexible_Motion_In-betweening_with_Diffusion_Models/Flexible_Motion_In-betweening_with_Diffusion_Models.html) · [PhysDiff（物理引导扩散）](../PhysDiff__Physics-Guided_Human_Motion_Diffusion_Model/PhysDiff__Physics-Guided_Human_Motion_Diffusion_Model.html)。
