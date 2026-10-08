---
layout: paper
title: "A Systematic Study of Data Modalities and Strategies for Co-training Large Behavior Models for Robot Manipulation"
zhname: "面向机器人操作的大行为模型协同训练：数据模态与策略的系统研究"
category: "Manipulation"
arxiv: "2602.01067"
---

# A Systematic Study of Data Modalities and Strategies for Co-training Large Behavior Models for Robot Manipulation
**面向机器人操作的大行为模型协同训练：数据模态与策略的系统研究**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 协同训练 · 大行为模型 · 数据模态 · VLA · 系统研究
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 2 月 |
| arXiv | [2602.01067](https://arxiv.org/abs/2602.01067) · [PDF](https://arxiv.org/pdf/2602.01067) · [HTML](https://arxiv.org/html/2602.01067v1) |
| 作者 | Fanqi Lin、Kushal Arora、Jean Mercat、Haruki Nishimura、Paarth Shah、Jose Barreiros 等（Toyota Research Institute, TRI） |
| 主题 | cs.RO · 协同训练 / 大行为模型 / VLA |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块（上游未给链接，已核对为 2602.01067）。

---

## 🎯 一句话总结

> **大行为模型（Large Behavior Models）**把模仿学习扩展到**多任务机器人数据**的大规模训练，展现强**灵巧操作**能力，但**泛化**仍受限于**机器人数据覆盖不足**。为在**不昂贵额外采集**的前提下扩覆盖，近期工作依赖**协同训练（co-training）**：联合学习**目标机器人数据**与**异构数据模态**。但**不同协同训练数据模态与策略如何影响策略性能**仍**理解不足**。本文做**系统研究**：在 **4000 小时**机器人/人类操作数据 + **5000 万**视觉-语言样本上，跨 **89 个策略**、**5.8 万次仿真 + 2835 次真机 rollout**，比较**五类模态**（视觉-语言数据、稠密语言标注、跨本体机器人数据、人类视频、离散动作 token）与**单/多阶段训练策略**。主要发现：**视觉-语言与跨本体机器人数据显著提升**对分布偏移、新任务与语言理解的**泛化**；**离散动作 token 收益甚微**；**组合有效模态可累加增益**；**纯机器人训练会损害视觉-语言能力，而协同训练能恢复**；思维链（CoT）条件在其基准上**无性能增益**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| LBM | Large Behavior Model，大行为模型 |
| Co-training | 协同训练，目标数据 + 异构模态联合学 |
| Cross-Embodiment | 跨本体机器人数据 |
| Action Token | 离散动作 token |
| VLA | Vision-Language-Action |
| CoT | Chain-of-Thought，思维链条件 |

---

## ❓ 论文要解决什么问题？

大行为模型泛化受**机器人数据覆盖不足**所限：
- 协同训练（加异构数据）能扩覆盖；
- 但**哪些模态、哪种策略**有效**理解不足**，缺系统证据。

论文要：用**大规模、系统化**实验，厘清**协同训练**的数据模态与策略选择。

---

## 🔧 方法详解

### 1. 五类协同训练数据模态
**视觉-语言数据、稠密语言标注、跨本体机器人数据、人类视频、离散动作 token**——系统比较各自作用。

### 2. 单/多阶段训练策略 + VLA 架构
比较**单阶段 vs 多阶段**训练策略，基于**VLA 策略架构**。

### 3. 大规模评测
**4000 小时**机器人/人类数据 + **5000 万**视觉-语言样本；**89 个策略**、**5.8 万仿真 + 2835 真机** rollout。

### 4. 主要发现
- **视觉-语言 + 跨本体机器人数据**显著提升泛化（分布偏移/新任务/语言理解）；
- **离散动作 token 收益甚微**；
- **组合有效模态累加增益**；
- **纯机器人训练损害视觉-语言能力，协同训练恢复**；
- **CoT 条件无增益**（在其基准）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph MOD["五类协同训练模态"]
        M1["视觉-语言"]
        M2["稠密语言标注"]
        M3["跨本体机器人"]
        M4["人类视频"]
        M5["离散动作 token"]
    end
    MOD --> TRAIN["VLA 协同训练(单/多阶段)"]
    TRAIN --> EVAL["89 策略 · 5.8万仿真 + 2835 真机"]
    EVAL --> OUT["📊 视觉-语言/跨本体最有效<br/>token 甚微 · 组合累加 · 协同恢复 VL 能力"]

    style MOD fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **协同训练的系统性研究**：五模态 × 单/多阶段策略，大规模评测；
2. **关键结论**：视觉-语言 + 跨本体数据最有效，离散动作 token 收益小；
3. **组合累加 + 协同恢复**：有效模态可叠加，协同训练修复纯机器人训练的视觉-语言退化；
4. **CoT 无增益**：在其基准上的反直觉发现。

---

## 🤖 对人形机器人学习的启发

- **"加什么数据"比"加更多数据"更重要**：视觉-语言与跨本体最划算；
- **纯机器人训练会损害通用视觉-语言能力**——协同训练是必要的"保养"；
- **离散动作 token / CoT 未必有用**，提醒不要盲目堆技巧；
- 对人形 VLA/大行为模型的数据配方有直接指导（TRI 大规模实证）。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2602.01067](https://arxiv.org/abs/2602.01067) | 论文正文（五模态、策略、89 策略大规模评测） |

> ℹ️ 备注：本笔记依据 arXiv 摘要与公开检索信息整理；**逐项数值（4000h/50M/89/58000/2835）以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·协同训练/数据**：[Sim-and-Real Co-Training](../Sim-and-Real_Co-Training__A_Simple_Recipe_for_Vision-Based_Robotic_Manipulation/Sim-and-Real_Co-Training__A_Simple_Recipe_for_Vision-Based_Robotic_Manipulation.html) · [Humanoid Policy ~ Human Policy](../Humanoid_Policy__Human_Policy/Humanoid_Policy__Human_Policy.html) · [Being-H0](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html)。
