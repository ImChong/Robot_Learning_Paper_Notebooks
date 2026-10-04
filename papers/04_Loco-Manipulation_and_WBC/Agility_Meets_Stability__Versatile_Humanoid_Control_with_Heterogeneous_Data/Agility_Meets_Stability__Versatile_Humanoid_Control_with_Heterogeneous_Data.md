---
layout: paper
title: "Agility Meets Stability: Versatile Humanoid Control with Heterogeneous Data"
zhname: "敏捷遇上稳定：用异构数据实现多才多艺的人形控制"
category: "Loco-Manipulation and WBC"
arxiv: "2511.17373"
---

# Agility Meets Stability: Versatile Humanoid Control with Heterogeneous Data
**针对「敏捷与稳定二选一」的专精困境，融合异构数据（人类动捕的敏捷行为 + 物理约束的合成平衡动作），用混合奖励——对全部数据用通用跟踪目标、仅对合成动作注入平衡专属先验——配合性能驱动采样与动作专属奖励塑形，让单一策略既能跳舞奔跑、又能零样本完成「叶问蹲」等极端平衡**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 敏捷+稳定 · 异构数据 · 混合奖励 · 极端平衡 · Unitree G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.17373](https://arxiv.org/abs/2511.17373) · [PDF](https://arxiv.org/pdf/2511.17373) · [HTML](https://arxiv.org/html/2511.17373v3) |
| 作者 | Yixuan Pan、Ruoyi Qiao、Li Chen、Kashyap Chitta、Liang Pan、Haoguang Mai、Qingwen Bu、Hao Zhao、Cunyuan Zheng、Ping Luo、Hongyang Li 等 |
| 主题 | cs.RO · 多才控制 / 异构数据 / 敏捷与平衡 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形要在人居环境干各种活，控制器需**兼具敏捷与鲁棒平衡**。但已有方法多**专精一端**——要么敏捷动态、要么稳定关键，**顾此失彼**。本文用**异构数据融合**破局：把**人类动捕**（敏捷行为）与**物理约束的合成平衡动作**合在一起训。关键是**混合奖励方案**：对**所有数据**施加**通用跟踪目标**，而**只对合成动作注入平衡专属先验**；再配合**性能驱动采样**与**动作专属奖励塑形**的自适应学习。结果：**单一策略**既能做**跳舞、奔跑**等敏捷动作，又能**零样本**完成**「叶问蹲」**这类极端平衡，在仿真与真实 **Unitree G1** 上验证了多才控制能力。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Agility / Stability | 敏捷 / 稳定，两类常被分别优化的能力 |
| Heterogeneous Data | 异构数据，来源/性质不同的数据混用 |
| Hybrid Reward | 混合奖励，对不同数据用不同奖励项 |
| Synthetic Balance Motion | 合成平衡动作，物理约束生成的平衡参考 |
| Performance-Driven Sampling | 性能驱动采样，按表现调整采样 |
| Zero-shot | 零样本，未专门训练即可完成 |

---

## ❓ 论文要解决什么问题？

人形控制长期**敏捷 vs 稳定二选一**：
- 敏捷方法（跳舞/跑）牺牲极端平衡；
- 稳定方法牺牲动态技能。

且两类**数据性质不同**（敏捷靠动捕、平衡需物理约束合成），简单混训易互相干扰。论文要：**一个策略同时拿下敏捷与极端平衡**。

---

## 🔧 方法详解

### 1. 异构数据融合
把**人类动捕**（敏捷）与**物理约束合成平衡动作**合并训练，覆盖两端能力来源。

### 2. 混合奖励方案（关键）
- **通用跟踪目标**：作用于**所有数据**，统一学跟踪；
- **平衡专属先验**：**只注入合成平衡动作**，避免污染敏捷数据的学习。

这种「分数据上不同奖励」的设计，是同时学两端而不互相拖累的关键。

### 3. 自适应学习
**性能驱动采样** + **动作专属奖励塑形**，按各动作表现动态调整训练，提升难学动作的掌握。

### 4. 评测
- **敏捷**：跳舞、奔跑；
- **极端平衡**：**叶问蹲**（零样本）；
- **平台**：仿真 + 真实 **Unitree G1**；单策略覆盖两端。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    MOCAP["🕺 人类动捕（敏捷）"] --> POL
    SYN["⚖️ 合成平衡动作（物理约束）"] --> POL
    subgraph POL["🧠 单策略 + 混合奖励"]
        R1["通用跟踪目标(全部数据)"]
        R2["平衡先验(仅合成动作)"]
        SAMP["性能驱动采样 + 奖励塑形"]
    end
    POL --> OUT["🤖 跳舞/奔跑 + 零样本叶问蹲<br/>仿真 + Unitree G1"]

    style POL fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **异构数据融合实现敏捷+稳定**：动捕敏捷 + 合成平衡同训；
2. **混合奖励方案**：全数据通用跟踪 + 仅合成动作注入平衡先验，避免互相干扰；
3. **自适应学习**：性能驱动采样 + 动作专属奖励塑形；
4. **单策略多才**：跳舞/奔跑 + 零样本极端平衡，真机 G1 验证。

---

## 🤖 对人形机器人学习的启发

- **「分数据施奖励」是融合异构能力的关键技巧**：不同来源数据要用不同监督，避免目标冲突；
- **合成数据补足真实数据的盲区**：极端平衡难采集，物理约束合成是有效补充；
- **单策略覆盖能力谱**是通用控制的方向，呼应 OmniXtreme、BFM-Zero 等"一策略多技能"；
- **性能驱动采样**与 EGM 的误差驱动采样思路相通。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.17373](https://arxiv.org/abs/2511.17373) | 论文正文（异构数据、混合奖励、敏捷/平衡实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·多才/高动态控制**：[OmniXtreme（高动态通用性）](../OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control/OmniXtreme_Breaking_the_Generality_Barrier_in_High-Dynamic_Humanoid_Control.html) · [EGM（数据高效高动态跟踪）](../EGM__Efficiently_Learning_General_Motion_Tracking_for_High_Dynamic_Humanoid_WBC/EGM__Efficiently_Learning_General_Motion_Tracking_for_High_Dynamic_Humanoid_WBC.html)。
