---
layout: paper
title: "VIRAL: Visual Sim-to-Real at Scale for Humanoid Loco-Manipulation"
zhname: "VIRAL：大规模视觉 Sim-to-Real 的人形移动操作"
category: "Loco-Manipulation and WBC"
arxiv: "2511.15200"
---

# VIRAL: Visual Sim-to-Real at Scale for Humanoid Loco-Manipulation
**VIRAL：大规模视觉 Sim-to-Real 的人形移动操作**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 视觉 Sim-to-Real · 教师-学生 · 域随机化 · 算力规模 · 纯 RGB
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.15200](https://arxiv.org/abs/2511.15200) · [PDF](https://arxiv.org/pdf/2511.15200) · [HTML](https://arxiv.org/html/2511.15200v1) |
| 作者 | Tairan He、Zi Wang、Haoru Xue、Qingwei Ben、Zhengyi Luo、Wenli Xiao、Ye Yuan、Xingye Da、Fernando Castañeda、Shankar Sastry、Changliu Liu、Guanya Shi、Linxi Fan、Yuke Zhu（CMU / NVIDIA 等） |
| 主题 | cs.RO · 视觉 sim-to-real / loco-manip / 大规模仿真 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形落地的一大障碍是缺**自主移动操作技能**。VIRAL 是一个**视觉 sim-to-real** 框架，**完全在仿真里学** loco-manip，并**零样本**上真机。它采用**教师-学生**设计：**特权 RL 教师**用**全状态**、配 **delta 动作空间**与**参考态初始化**学**长时程** loco-manip；**视觉学生**再经**平铺渲染（tiled rendering）**的**大规模仿真**、用**在线 DAgger + 行为克隆**混合从教师蒸馏。作者发现**算力规模是关键**：把仿真扩到**几十张 GPU（至多 64）**才能让师生训练**可靠**，低算力常失败。为弥合 sim-to-real，VIRAL 结合**大规模视觉域随机化**（光照、材质、相机参数、画质、传感延迟）与**手/相机的真实到仿真对齐**。部署到 **Unitree G1**，所得**纯 RGB** 策略可**连续操作至多 54 个周期**，对多样空间与外观变化泛化、**无需任何真机微调**，**逼近专家级遥操作**表现。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Sim-to-Real | 仿真到真机迁移 |
| Privileged Teacher | 特权教师，用全状态训练 |
| Delta Action | 增量动作空间 |
| Tiled Rendering | 平铺渲染，大规模并行视觉仿真 |
| DAgger | 数据聚合，在执行分布上补监督 |
| Domain Randomization | 域随机化，随机化视觉/物理以泛化 |

---

## ❓ 论文要解决什么问题？

人形缺**自主视觉 loco-manip**：
- 想**纯仿真训练、零样本上真机**，但**长时程**任务难学、**视觉 sim-to-real** 难弥合；
- 还要搞清**什么因素**决定成败。

VIRAL 要：一套**可规模化**、**纯 RGB 零样本**的视觉 loco-manip 方案，并揭示**算力规模**的关键作用。

---

## 🔧 方法详解

### 1. 特权 RL 教师（长时程）
教师用**全状态**，配 **delta 动作空间**与**参考态初始化**，稳健学**长时程** loco-manip。

### 2. 视觉学生蒸馏（平铺渲染 + DAgger + BC）
**视觉学生**经**平铺渲染**的大规模仿真，用**在线 DAgger + 行为克隆**从教师蒸馏，得到**纯 RGB** 策略。

### 3. 算力规模是关键
作者发现：把仿真**扩到至多 64 张 GPU** 才能让师生训练**可靠**；低算力常**失败**——规模本身是成功要素。

### 4. 弥合 sim-to-real
- **大规模视觉域随机化**：光照、材质、相机参数、画质、传感延迟；
- **真实到仿真对齐**：灵巧手与相机的 real-to-sim 对齐。

### 5. 结果
- **Unitree G1**、**纯 RGB**；
- **连续 loco-manip 至多 54 周期**；
- 对空间/外观变化泛化、**零真机微调**、**逼近专家遥操作**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph TE["教师-学生（仿真，≤64 GPU）"]
        T["特权 RL 教师<br/>delta 动作 + 参考态初始化"]
        S["视觉学生（纯 RGB）<br/>平铺渲染 + DAgger + BC"]
        T --> S
    end
    DR["视觉域随机化 + 真实↔仿真对齐"] --> S
    S --> OUT["🤖 Unitree G1 纯 RGB<br/>连续 54 周期 · 零微调 · 逼近专家遥操作"]

    style TE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **大规模视觉 sim-to-real loco-manip**：纯仿真训练、纯 RGB、零样本上真机；
2. **教师-学生设计**：特权教师（delta 动作 + 参考态初始化）→ 视觉学生（DAgger + BC）；
3. **揭示算力规模的关键性**：扩到 64 GPU 才稳，低算力失败；
4. **强真机表现**：G1 连续 54 周期、零微调泛化、逼近专家遥操作。

---

## 🤖 对人形机器人学习的启发

- **"规模即能力"在视觉 sim-to-real 同样成立**：算力不足会系统性失败，规模是隐性前提；
- **平铺渲染 + DAgger/BC**是视觉学生蒸馏的高效配方；
- **视觉域随机化 + real-to-sim 对齐**双管齐下弥合视觉鸿沟，是纯 RGB 上真机的关键；
- **与 Opening the Sim-to-Real Door 同作者群**，互为「规模化视觉 loco-manip」的姊妹工作。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.15200](https://arxiv.org/abs/2511.15200) | 论文正文（教师-学生、平铺渲染、域随机化、G1 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（≤64 GPU、54 周期）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·视觉 loco-manip / sim-to-real**：[Opening the Sim-to-Real Door（纯 RGB 铰接操作）](../Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer/Opening_the_Sim-to-Real_Door_for_Humanoid_Pixel-to-Action_Policy_Transfer.html) · [ZeroWBC](../ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video/ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video.html)；
- **本仓 10 Sim-to-Real 板块**。
