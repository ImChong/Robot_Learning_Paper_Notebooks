---
layout: paper
title: "Behavior Foundation Model for Humanoid Robots"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "BFM：面向人形全身控制的行为基础模型"
---

# Behavior Foundation Model for Humanoid Robots
**BFM：面向人形全身控制的行为基础模型**

> 📅 阅读日期: 2026-05-17
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model
>
> 🧭 状态: 首版基础摘要（含 mermaid 流程图）；与 HOVER、MaskedMimic 等「掩码 + 蒸馏」路线对照阅读更佳。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2509.13780](https://arxiv.org/abs/2509.13780) |
| **HTML** | [arxiv.org/html/2509.13780v1](https://arxiv.org/html/2509.13780v1) |
| **PDF** | [arxiv.org/pdf/2509.13780](https://arxiv.org/pdf/2509.13780) |
| **项目主页 / 视频** | [bfm4humanoid.github.io](https://bfm4humanoid.github.io/) |
| **发布时间** | 2025-09-17 (arXiv) |
| **源码** | 截至当前论文与项目页**未集中给出与本文一一对应的官方训练代码仓库**；同主题的后续探索可参考 LeCAR 的 [BFM-Zero](https://github.com/LeCAR-Lab/BFM-Zero)（方法侧重无监督 RL，与本文 CVAE+蒸馏管线不同，仅作相关阅读） |
| **作者** | Weishuai Zeng, Shunlin Lu, Kangning Yin, Xiaojie Niu, Minyue Dai, Jingbo Wang, Jiangmiao Pang |
| **机构** | 北京大学 · 香港中文大学（深圳）· 上海交通大学 · 复旦大学 · 上海人工智能实验室 |

---

## 🎯 一句话总结

把各类 WBC 任务都看成「在合适目标下生成**行为**轨迹」，先用 AMASS 重定向 + 仿真里特权信息的 **proxy 运动模仿策略**在线产出大规模行为数据，再用 **掩码在线蒸馏 + 条件 VAE（CVAE）** 学到可跨速度指令、遥操作、参考动作等多种控制接口共享的生成式策略，并可用 **残差学习**在不大改网络的前提下快速学会新动作——在仿真与真机上都展示了对多种全身任务的泛化与可组合潜空间。

---

## ❓ 论文在解决什么问题？

传统人形 WBC 多为**单一控制模式**定制（只跟速度、只跟参考动作等），换任务要重新设计奖励与训练流程。作者认为不同任务共享的本质是：**给定目标状态（goal），生成合理的本体感知—动作序列（行为）**。BFM 用大规模数据预训练这一分布，使同一模型可通过**对统一控制接口施加不同稀疏掩码**来激活任意低层控制模式组合，并用潜变量支持行为插值/调制与残差微调。

---

## 🔧 方法要点（极简）

1. **Proxy agent**：AMASS → SMPL 与人形两阶段重定向；在仿真中用特权本体 + 参考下一帧差分作为 goal，PPO 做运动模仿；辅以课程化正则/惩罚、域随机化、RSI、硬负样本挖掘与过滤。  
2. **行为定义**：轨迹只包含**真机可观测本体**与动作，不把 goal 写入「行为」本身，以便 goal 侧表达不同控制模式。  
3. **BFM 结构**：CVAE 建模 \(P(a|s^p, s^g)\)，编码器见特权状态、解码器只用本体+潜变量；**DAgger 式在线蒸馏**用 proxy 动作作监督。  
4. **控制接口与掩码**：goal 统一为根位姿/速度、连杆目标点、关节角等通道，对通道做 **Bernoulli(0.5) 掩码**（带冷启动课程）以覆盖任意模式组合。  
5. **下游**：潜空间线性插值做**行为组合**；对先验均值外推做**行为调制**；在 BFM 上叠加残差网络用少量数据学新技能。

---

## 📌 训练与部署管线（mermaid）

<div class="mermaid">
flowchart LR
  subgraph data["数据准备"]
    A["AMASS / SMPL"]
    R["两阶段重定向 → 人形参考"]
    A --> R
  end
  subgraph proxy["Proxy 策略"]
    P["仿真特权观测 + goal<br/>PPO 运动模仿"]
    R --> P
    O["在线 rollout 采 (s^p_real, s^g_real, a)"]
    P --> O
  end
  subgraph bfm["BFM 预训练"]
    M["Bernoulli 掩码采样 goal 通道"]
    V["CVAE + DAgger 蒸馏 proxy 动作"]
    O --> M
    M --> V
  end
  subgraph app["应用"]
    U["部署：掩码选择控制模式"]
    L["潜变量插值 / 外推调制"]
    Q["残差网络快速学新行为"]
    V --> U
    V --> L
    V --> Q
  end
  data --> proxy --> bfm --> app
</div>

---

## 📚 与仓库内相关笔记

- [HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)：同属「多模式掩码 + 大规模模仿」脉络，便于对照接口设计。  
- [ASAP](../ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)：侧重 sim–real 动力学对齐；BFM 侧重跨任务行为分布与生成式接口。
