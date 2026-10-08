---
layout: paper
title: "Hiking in the Wild: A Scalable Perceptive Parkour Framework for Humanoids"
zhname: "Hiking in the Wild：可扩展的人形感知式跑酷框架"
category: "Loco-Manipulation and WBC"
arxiv: "2601.07718"
---

# Hiking in the Wild: A Scalable Perceptive Parkour Framework for Humanoids
**Hiking in the Wild：可扩展的人形感知式跑酷框架**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 感知式跑酷 · 深度感知 · 单阶段 RL · 防打滑 · 无状态估计 · 开源
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 1 月 |
| arXiv | [2601.07718](https://arxiv.org/abs/2601.07718) · [PDF](https://arxiv.org/pdf/2601.07718) · [HTML](https://arxiv.org/html/2601.07718v1) |
| 作者 | Shaoting Zhu、Ziwen Zhuang、Mengjie Zhao、Kun-Ying Lee、Hang Zhao（清华等） |
| 代码 | 训练与部署代码开源（见原文） |
| 主题 | cs.RO · 感知式行走 / 复杂地形 / 端到端 RL |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形在复杂地形上稳健行走，需要**从「被动本体感受（reactive proprioception）」转向「主动感知（proactive perception）」**。两类已有路线各有短板：**建图法**受**状态估计漂移**之苦，**端到端法**难**规模化**。本框架把**原始深度传感输入 + 本体感受**直接、**单阶段（single-stage）**地映射到**关节动作**，并引入两个关键机制：① **地形边缘检测 + 足体积点（foot volume points）**防止打滑；② **平坦面片采样（flat patch sampling）**避免**奖励作弊（reward hacking）**。整套**无需外部状态估计**，在复杂地形上可达**至多 2.5 m/s**的通行速度；在全尺寸人形上做了野外实测，训练与部署代码**开源**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Perceptive Parkour | 感知式跑酷，用外感知主动适应地形 |
| Proprioception | 本体感受，机器人自身关节/姿态等内部状态 |
| Exteroception | 外感知，如深度相机感知环境 |
| Foot Volume Points | 足体积点，刻画足与地形接触体积以判打滑 |
| Flat Patch Sampling | 平坦面片采样，约束落脚以防奖励作弊 |
| Single-Stage RL | 单阶段强化学习，原始观测直接到动作 |

---

## ❓ 论文要解决什么问题？

人形在**非结构复杂地形**上行走，要从「只靠本体感受被动反应」升级为「**主动用感知预判地形**」。但：

- **建图（mapping-based）路线**：依赖状态估计，**漂移**会污染地图，长程不稳；
- **端到端路线**：直接学策略，但**可扩展性**差、易**奖励作弊**、接触处易**打滑**。

论文要：一个**可扩展、无需外部状态估计**、能稳健过复杂地形的**感知式行走框架**。

---

## 🔧 方法详解

### 1. 单阶段端到端：原始深度 + 本体感受 → 关节动作
不依赖显式建图与状态估计，直接把**原始深度**与**本体感受**喂入策略，**单阶段 RL** 输出关节动作，简化流水线、利于规模化。

### 2. 地形边缘检测 + 足体积点（防打滑）
显式做**地形边缘检测**，并用**足体积点**刻画足-地形接触关系，针对性地**抑制打滑**——这是复杂地形稳健落脚的关键。

### 3. 平坦面片采样（防奖励作弊）
用**平坦面片采样**约束训练目标/落脚选择，避免策略钻奖励空子（reward hacking）产生不自然或不安全的行为。

### 4. 评测
- **全尺寸人形**野外实测；
- 复杂地形通行**至多 2.5 m/s**，鲁棒穿越非结构环境；
- **代码开源**（训练 + 部署）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    D["📷 原始深度"] --> POL
    P["📟 本体感受"] --> POL
    subgraph POL["🧠 单阶段 RL 策略"]
        E["地形边缘检测 + 足体积点<br/>(防打滑)"]
        F["平坦面片采样<br/>(防奖励作弊)"]
    end
    POL --> OUT["🤖 关节动作<br/>无需外部状态估计<br/>复杂地形 ≤ 2.5 m/s"]

    style POL fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **可扩展感知式行走框架**：单阶段端到端，原始深度 + 本体感受直接到动作，无需外部状态估计；
2. **防打滑机制**：地形边缘检测 + 足体积点，针对复杂地形接触稳健性；
3. **防奖励作弊机制**：平坦面片采样，避免策略钻空子；
4. **野外实测 + 开源**：全尺寸人形复杂地形至多 2.5 m/s，代码开源。

---

## 🤖 对人形机器人学习的启发

- **「无状态估计的端到端感知」正成为复杂地形行走的主流**：绕开建图漂移，工程更简洁、更易规模化；
- **接触/打滑要显式建模**：足体积点这类几何刻画，是把「能走」做成「稳走」的细节关键；
- **奖励作弊是 RL 地形任务的隐患**：用采样/约束抑制作弊，比事后调奖励更稳；
- **与 Deep Whole-body Parkour 互补**：同作者群把感知带进全身跑酷，构成「感知式运动」的一组工作。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2601.07718](https://arxiv.org/abs/2601.07718) | 论文正文（单阶段框架、防打滑/防作弊、野外实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·感知式跑酷 / 地形**：[Deep Whole-body Parkour（把感知并入全身动作跟踪）](../Deep_Whole-body_Parkour/Deep_Whole-body_Parkour.html) · [Perceptive Humanoid Parkour（动作匹配串接动态人类技能）](../Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching/Perceptive_Humanoid_Parkour__Chaining_Dynamic_Human_Skills_via_Motion_Matching.html) · [TTT-Parkour（测试时快速训练）](../TTT-Parkour__Rapid_Test-Time_Training_for_Perceptive_Robot_Parkour/TTT-Parkour__Rapid_Test-Time_Training_for_Perceptive_Robot_Parkour.html)。
