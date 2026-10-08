---
layout: paper
title: "Residual Off-Policy RL for Finetuning Behavior Cloning Policies"
zhname: "用残差离策略 RL 微调行为克隆策略"
category: "Manipulation"
arxiv: "2509.19301"
---

# Residual Off-Policy RL for Finetuning Behavior Cloning Policies
**用残差离策略 RL 微调行为克隆策略**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 残差学习 · BC+RL · 离策略 · 稀疏奖励 · 真机 RL · 灵巧手
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 9 月 |
| arXiv | [2509.19301](https://arxiv.org/abs/2509.19301) · [PDF](https://arxiv.org/pdf/2509.19301) · [HTML](https://arxiv.org/html/2509.19301v2) |
| 作者 | Lars Ankile、Zhenyu Jiang、Rocky Duan、Guanya Shi、Pieter Abbeel、Anusha Nagabandi |
| 主题 | cs.RO · 残差 RL / BC 微调 / 真机灵巧操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> **行为克隆（BC）**能学到不错的视觉运动策略，但受限于**人类演示质量、采集人力、离线数据的边际收益递减**。**强化学习（RL）**靠自主交互、潜力大，但**直接在真机训 RL** 难——**样本低效、安全、稀疏奖励长时程**，对**高自由度（DoF）**系统尤甚。本文给出一个把 BC 与 RL 优点结合的**残差学习**配方：把 **BC 策略当黑盒基座**，用**样本高效的离策略 RL** 学**每步的轻量残差修正**。方法**只需稀疏二值奖励**，即可在**高自由度系统**（仿真与真机）上改进操作策略。尤其，作者据其所知**首次在带灵巧手的人形真机上成功进行 RL 训练**，在多项**视觉任务**上取得 **SOTA**，指向把 RL 真正部署到现实的可行路径。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| BC | Behavior Cloning，行为克隆 |
| Off-Policy RL | 离策略强化学习（样本高效） |
| Residual | 残差，对基座策略的逐步修正 |
| Sparse Binary Reward | 稀疏二值奖励（成功/失败） |
| High-DoF | 高自由度系统 |
| Dexterous Hands | 灵巧手 |

---

## ❓ 论文要解决什么问题？

BC 与 RL 各有短板：
- **BC**：受演示质量限制、边际收益递减；
- **真机 RL**：样本低效、安全难、稀疏奖励长时程难，高 DoF 更甚。

论文要：把二者结合，**安全样本高效**地在**真机高 DoF**（含灵巧手人形）上改进策略。

---

## 🔧 方法详解

### 1. 残差学习：BC 基座 + RL 修正
把**BC 策略当黑盒基座**（提供合理初始动作），用 RL 只学**每步轻量残差**——大幅缩小探索空间、提升安全与样本效率。

### 2. 样本高效离策略 RL + 稀疏二值奖励
用**离策略 RL**（数据复用、样本高效），**仅需稀疏二值奖励**（成功/失败），免去稠密奖励工程。

### 3. 真机灵巧手人形 RL（首次）
据作者所知，**首次**在**带灵巧手的人形真机**上成功 RL 训练，在多项**视觉任务**上 SOTA。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    BC["🧊 BC 策略(黑盒基座)"] --> SUM
    RL["离策略 RL 残差修正<br/>(稀疏二值奖励)"] --> SUM
    SUM["每步动作 = 基座 + 残差"] --> OUT["🤖 高 DoF 真机改进<br/>首次灵巧手人形 RL · 视觉任务 SOTA"]

    style RL fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **残差 BC+RL 配方**：BC 基座 + 离策略 RL 轻量残差，安全样本高效；
2. **仅需稀疏二值奖励**：免稠密奖励工程；
3. **首次灵巧手人形真机 RL**：据作者所知；
4. **视觉任务 SOTA**：指向真机 RL 的可行路径。

---

## 🤖 对人形机器人学习的启发

- **"冻结基座 + 学残差"是真机 RL 的安全样本高效范式**，呼应 ResMimic、SteadyTray 的残差思路；
- **稀疏二值奖励**降低奖励工程门槛，利于真机；
- **首次灵巧手人形真机 RL**是里程碑，证明真机 RL 可行；
- 对高 DoF 系统（人形）尤其有价值。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2509.19301](https://arxiv.org/abs/2509.19301) | 论文正文（残差框架、离策略 RL、真机灵巧手实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·残差/真机学习**：[MimicDroid（人类玩耍视频 ICL）](../MimicDroid__In-Context_Learning_for_Humanoid_Manipulation_from_Human_Play_Videos/MimicDroid__In-Context_Learning_for_Humanoid_Manipulation_from_Human_Play_Videos.html)；
- **残差思路（本仓 04）**：[SteadyTray（残差 RL 托盘平衡）](../../04_Loco-Manipulation_and_WBC/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid/SteadyTray__Learning_Object_Balancing_Tasks_in_Humanoid_Tray_Transport_via_Resid.html)。
