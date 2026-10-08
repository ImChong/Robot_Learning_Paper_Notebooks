---
layout: paper
title: "TEDi: Temporally-Entangled Diffusion for Long-Term Motion Synthesis"
zhname: "TEDi：时间纠缠扩散的长时程动作合成"
category: "Human Motion"
arxiv: "2307.15042"
---

# TEDi: Temporally-Entangled Diffusion for Long-Term Motion Synthesis
**TEDi：时间纠缠扩散的长时程动作合成**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 长时程合成 · 时间纠缠扩散 · 运动缓冲区 · 自回归 · 角色动画
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2023 年 7 月 |
| arXiv | [2307.15042](https://arxiv.org/abs/2307.15042) · [PDF](https://arxiv.org/pdf/2307.15042) · [HTML](https://arxiv.org/html/2307.15042v1) |
| 作者 | Zihan Zhang、Richard Liu、Kfir Aberman、Rana Hanocka（芝加哥大学 / Google） |
| 主题 | cs.GR · 长时程动作合成 / 扩散模型 / 角色动画 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> **去噪扩散概率模型（DDPM）**逐步、小增量地合成样本——这种**渐进性**是其关键。TEDi 把这种渐进性**应用到运动序列**，并**扩展 DDPM** 以实现**随时间变化的去噪**，从而**把"扩散时间轴"与"运动时间轴"两条轴纠缠（entangle）**起来。具体：维护一个**运动缓冲区（motion buffer）**，里面是**越靠后越噪**的姿态序列，对其**迭代去噪**，**自回归**地生成**任意长**的帧序列。**每个扩散步只推进运动时间轴**、而**扩散时间轴保持静止**，于是**干净帧从缓冲区滑出**、末端**追加新噪声向量**，实现**长时程动作合成**，适用于角色动画等。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| TEDi | Temporally-Entangled Diffusion |
| DDPM | 去噪扩散概率模型 |
| Motion Buffer | 运动缓冲区（越后越噪） |
| Temporal Axis | 运动时间轴 |
| Diffusion Time-axis | 扩散时间轴 |
| Auto-regressive | 自回归生成 |

---

## ❓ 论文要解决什么问题？

扩散做**长时程**动作合成难：
- 一次性生成超长序列**代价高、不稳**；
- 朴素自回归易**断裂/漂移**。

TEDi 要：把扩散的渐进性"搬到"运动时间轴，**滑动缓冲**式地生成任意长动作。

---

## 🔧 方法详解

### 1. 两轴纠缠：运动时间轴 × 扩散时间轴
扩展 DDPM 实现**随时间变化的去噪**：缓冲区里**越靠后的帧越噪**，去噪程度沿时间轴渐变——把"扩散步"与"时间步"纠缠。

### 2. 运动缓冲区 + 滑动生成
- 每步**只推进运动时间轴**，扩散时间轴**静止**；
- **干净帧从缓冲区前端滑出**（输出）；
- **末端追加新噪声向量**（续写）。

如此**自回归**生成**任意长**序列。

### 3. 应用
长时程角色动画等动作合成。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    BUF["🎞️ 运动缓冲区<br/>(越靠后越噪)"] --> DEN["逐步去噪(沿时间轴推进)"]
    DEN --> CLEAN["干净帧从前端滑出(输出)"]
    DEN --> APP["末端追加新噪声向量(续写)"]
    APP --> BUF
    CLEAN --> OUT["🕺 任意长动作序列<br/>长时程角色动画"]

    style DEN fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **时间纠缠扩散 TEDi**：把渐进去噪搬到运动时间轴；
2. **运动缓冲区 + 滑动生成**：干净帧滑出、末端续噪；
3. **任意长自回归合成**：长时程稳定；
4. **角色动画应用**：长时程动作合成。

---

## 🤖 对人形机器人学习的启发

- **"滑动缓冲 + 时间轴去噪"是长时程生成的优雅机制**，对人形长时程动作/规划有借鉴；
- **自回归续写**契合在线控制（边生成边执行），与 UniAct 的流式思路相通；
- 把"扩散步"与"时间步"解耦/纠缠是值得迁移的生成范式；
- 长时程稳定性是人形长任务的共性挑战。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2307.15042](https://arxiv.org/abs/2307.15042) | 论文正文（时间纠缠扩散、运动缓冲区、长序列实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·长时程/生成**：[PRIMAL（持续生成）](../PRIMAL__Physically_Reactive_and_Interactive_Motor_Model_for_Avatar_Learning/PRIMAL__Physically_Reactive_and_Interactive_Motor_Model_for_Avatar_Learning.html) · [Example-based Motion Synthesis](../Example-based_Motion_Synthesis_via_Generative_Motion_Matching/Example-based_Motion_Synthesis_via_Generative_Motion_Matching.html)。
