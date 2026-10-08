---
layout: paper
title: "FARM: Frame-Accelerated Augmentation and Residual Mixture-of-Experts for Physics-Based High-Dynamic Humanoid Control"
zhname: "FARM：帧加速增广 + 残差混合专家，攻克高动态人形动作控制"
category: "Physics-Based Animation"
---

# FARM: Frame-Accelerated Augmentation and Residual Mixture-of-Experts for Physics-Based High-Dynamic Humanoid Control
**FARM：帧加速增广 + 残差混合专家，攻克高动态人形动作控制**

> 📅 阅读日期: 2026-07-29
>
> 🏷️ 板块: 13 Physics-Based Animation · 物理动作追踪 / 高动态控制 / 混合专家 / 数据增广
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2508.19926](https://arxiv.org/abs/2508.19926) |
| HTML | [在线阅读](https://arxiv.org/html/2508.19926v1) |
| PDF | [下载](https://arxiv.org/pdf/2508.19926) |
| 源码 | [github.com/Colin-Jing/FARM](https://github.com/Colin-Jing/FARM)（含训练/评测代码，基于 ProtoMotions；数据需另行下载） |
| 作者 | Tan Jing, Shiting Chen, Yangfan Li, Weisheng Xu, Renjing Xu |
| 机构 | 香港科技大学（广州）HKUST(GZ) 等 |
| 发表 | **AAAI 2026（Oral）** |
| 平台 | Isaac Lab · SMPL 人形（PD 目标关节角控制） |
| **发布时间** | 2025-08-27（arXiv v1） |

---

## 🎯 一句话总结

物理仿真下的人形动作追踪，在**日常低动态动作**上已经做得很好，但一遇到**爆发性高动态动作**（快速旋转、跳跃、武术、舞蹈急停变向）就频繁失稳、追踪失败。FARM 的思路是**不去重训一个「全能」控制器**，而是：① 用**帧加速增广（Frame-Accelerated Augmentation）**把普通动作按 1.0–1.5× 重采样，人为拉大相邻帧的姿态间隔，让模型提前见到「高速位姿突变」；② 冻结一个可靠的**基座控制器**负责低动态动作；③ 叠加一个**残差混合专家（Residual MoE）**，按动作强度**动态**决定激活几个专家，把额外容量精准投给难的高动态片段。在自建的 HDHM 高动态数据集上，追踪失败率下降 **42.8%**、全局 MPJPE 下降 **14.6%**，而低动态动作精度几乎不变。

---

## ❓ 要解决什么问题？

- **高动态是长尾难点**：主流物理追踪器（如基于 transformer 的 tracker）在 AMASS 这类以日常动作为主的库上表现好，但高速、爆发、大幅位姿突变的动作占比小、难度大，直接训练容易被多数简单样本「淹没」。
- **单一网络的容量矛盾**：想把高动态也学好，就得加大网络/加难样本，但这往往**拖累**原本已经很好的低动态动作，得不偿失。
- **数据稀缺**：真正「物理可行」的高动态动作片段少，且原始动捕帧率下相邻帧变化平缓，模型缺乏对「快速位姿跳变」的暴露。

**目标**：在**保住低动态精度**的前提下，用尽量小的代价显著提升高动态动作的追踪鲁棒性。

---

## 🔧 方法核心

### ① 帧加速增广（Frame-Accelerated Augmentation）
把动作片段以 1.0–1.5× 的加速因子**重采样**，等价于「跳帧」——拉大相邻帧之间的姿态间隔，制造出原始数据里没有的高速位姿突变。这样模型在训练阶段就被暴露给「爆发式转换」，等于用几乎零成本合成了高动态样本。它同时也是**难样本挖掘**的手段：用预训练 tracker 在 1.25× 速度下跑一遍，把跟丢的片段筛出来组成「困难子集」。

### ② 冻结的基座控制器（Base Controller）
一个已经训练好、能稳定追踪日常低动态动作的 tracker，**全程冻结不动**。它保证了「基本盘」不被破坏——这也是为什么低动态精度几乎无损。

### ③ 残差混合专家（Residual MoE）
在冻结基座之上并联一组专家网络，输出**残差修正量**，只在需要时补足能力：

- **速度感知路由（Speed-Aware Router, SAR）**：把动作按动态强度分成三档（低/中/高），用辅助监督把每一档导向对应的专家子集；
- **动态专家分配（Dynamic Expert-Assignment, DEA）**：按当前片段的动态强度**动态激活可变数量的专家**——低动态时可以「零专家」（纯基座），高动态时激活多个专家叠加残差。容量随难度伸缩，避免为简单动作白白付出算力。

> 直觉：把「通才」拆成「稳定的基座 + 按需上场的专科医生」，用路由把难病人（高动态）分诊给对的专家，简单病人直接放行。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph AUG["🎞️ 帧加速增广"]
        RAW["原始动作片段"]
        ACC["1.0–1.5× 重采样<br/>拉大相邻帧姿态间隔"]
        MINE["1.25× 跑基座 tracker<br/>筛出跟丢的困难片段"]
        RAW --> ACC
        RAW --> MINE
    end

    subgraph CTRL["🤖 FARM 控制器"]
        BASE["🧊 冻结的基座控制器<br/>稳定追踪低动态动作"]
        SAR["速度感知路由 SAR<br/>低/中/高 三档分诊"]
        DEA["动态专家分配 DEA<br/>按强度激活 0~N 个专家"]
        EXP["残差专家组<br/>输出残差修正量"]
        SUM(("＋ 残差叠加"))
        SAR --> DEA --> EXP
        BASE --> SUM
        EXP --> SUM
    end

    STATE["本体状态 + 参考姿态"] --> BASE
    STATE --> SAR
    ACC --> CTRL
    MINE --> CTRL
    SUM --> ACT["PD 目标关节角"]
    ACT --> SIM["Isaac Lab 物理仿真"]
    SIM -->|"追踪奖励 / 失败检测"| CTRL

    style AUG fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style CTRL fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style BASE fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style SIM fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 🧩 源码运行时序（mermaid）

> 基于官方仓库 [Colin-Jing/FARM](https://github.com/Colin-Jing/FARM)（基于 ProtoMotions）README 的三步工作流整理。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant EA as eval_agent.py
    participant DS as data/scripts/*
    participant TA as train_agent.py
    participant SIM as Isaac Lab 仿真

    Note over U,SIM: 步骤 1 · 挖掘困难动作（1.25× 加速评测）
    U->>EA: 加载预训练 tracker ckpt<br/>+speed_evaluation=1.25 +motion_file=amass_train.pt
    EA->>SIM: 1024 env 并行 rollout 追踪
    SIM-->>EA: 各片段追踪成功/失败
    EA-->>U: failed_motions_amass_train.txt

    Note over U,DS: 步骤 2 · 构建「仅困难」数据集
    U->>DS: get_difficult_motion.py（按失败 ID 过滤 YAML）
    DS-->>U: amass_train_difficult_125.yaml
    U->>DS: package_motion_lib.py（打包为 .pt）
    DS-->>U: amass_train_difficult_125.pt

    Note over U,SIM: 步骤 3 · 用 FARM 配置训练（残差 MoE + 帧加速）
    U->>TA: --config-name=residual_moe_spare_gate_velocity_prior_125<br/>checkpoint=基座 ckpt · motion_file=困难 .pt
    TA->>SIM: 冻结基座 + 训练残差专家 rollout
    SIM-->>TA: 奖励 / 回报
    TA-->>U: farm_125 训练权重 (score_based.ckpt)

    Note over U,SIM: 评测 · 可视化 / 数据集指标
    U->>EA: 加载 FARM ckpt（num_envs=1 可视化 / 138 headless）
    EA->>SIM: rollout
    SIM-->>EA: MPJPE / 失败率
    EA-->>U: 指标与可视化结果
</div>

---

## 📊 实验与结果

- **HDHM（High-Dynamic Humanoid Motion）数据集**：作者自建，含约 **3,593** 段经严格筛选（去除穿地、悬浮、自穿插、关节抖动）的物理可行高动态动作，取材自 AIST++（舞蹈）、EMDB（运动/日常）、Motion-X 武术，以及 Text-Convert / Video-Convert 合成子集。
- **相对基线**：追踪**失败率下降 42.8%**、**全局 MPJPE 下降 14.6%**；
- **低动态几乎无损**：在常规低动态动作上仍保持近乎满分的精度，验证了「冻结基座 + 残差补足」不牺牲基本盘的设计目标；
- 仿真平台为 **Isaac Lab**，人形采用 SMPL 骨架、以 PD 目标关节角驱动。

---

## 💡 核心贡献

1. **帧加速增广**：用 1.0–1.5× 重采样零成本合成「高速位姿突变」样本，同时充当困难样本挖掘器；
2. **冻结基座 + 残差 MoE**：把「通才」解耦成稳定基座与按需上场的残差专家，避免高动态训练拖累低动态精度；
3. **SAR + DEA 动态容量分配**：按动作强度分诊并动态激活可变数量专家，算力花在刀刃上；
4. **HDHM 基准**：提供一个专注高动态、经物理可行性清洗的动作数据集与评测协议。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **难点长尾** | 与其追求单一全能策略，不如「稳定基座 + 残差专科」——对真机上稀有但关键的爆发动作尤其实用 |
| **数据增广即免费难样本** | 帧加速/跳帧是极低成本的高动态数据合成手段，可迁移到 loco-manipulation 等其他追踪任务 |
| **条件计算** | 按动态强度动态激活专家，是「算力随难度伸缩」的一个具体范式，利于机载实时预算控制 |
| **保住基本盘** | 冻结已验证的基座、只训残差，是在不回退旧能力前提下扩能力的稳妥工程做法 |

---

## ⚠️ 局限与可改进点

- **仿真为主**：论文以 Isaac Lab 仿真评测为主，真机高动态迁移（sim-to-real）验证有限；
- **依赖基座质量**：残差 MoE 的上限受冻结基座能力约束，基座覆盖不到的动作模式，残差也难以凭空补出；
- **数据仍需清洗**：HDHM 需要人工/规则筛掉非物理可行片段，构建成本不低，且数据因版权不随仓库分发；
- **专家/路由超参**：三档分诊与动态激活数量的划分是启发式的，跨角色/跨数据集是否稳健需进一步验证。

---

## 🎤 面试参考

**Q：高动态动作追踪难在哪？FARM 为什么不直接训一个更大的全能网络？**
A：高动态样本稀少、难度大，直接混训容易被多数低动态样本淹没；而单纯加大网络/加难样本又会拖累原本已经很好的低动态精度。FARM 选择冻结一个可靠基座、只用残差 MoE 按需补能力，从而在不牺牲基本盘的前提下提升高动态鲁棒性。

**Q：帧加速增广是怎么造出高动态样本的？**
A：把动作片段以 1.0–1.5× 重采样（相当于跳帧），拉大相邻帧之间的姿态间隔，人为制造高速位姿突变，让模型提前暴露给爆发式转换；同时用 1.25× 速度跑基座 tracker 把跟丢的片段筛成困难子集专门训练。

**Q：SAR 和 DEA 各自解决什么？**
A：SAR（速度感知路由）把动作按动态强度分成低/中/高三档，用辅助监督把它们导向对应专家子集；DEA（动态专家分配）则按强度动态激活可变数量的专家——低动态可以零专家（纯基座），高动态叠加多个专家残差，实现「容量随难度伸缩」。

**Q：为什么低动态精度几乎不掉？**
A：因为负责低动态的基座控制器是**冻结**的，残差专家只在需要时叠加修正；低动态段落 DEA 可以不激活专家，输出就等于原基座，自然不退化。

---

## 🔗 相关阅读

- [Perpetual Humanoid Control (ICCV 2023)](https://arxiv.org/abs/2305.06456) — 通用物理动作追踪基座，FARM 这类「基座 + 增强」思路的对照
- [ProtoMotions](https://github.com/NVlabs/ProtoMotions) — FARM 官方代码所基于的仿真/控制框架
- [BFMTrack](../BFMTrack__Latent_Sequence_Optimization_for_Physics-Based_Motion_Tracking/BFMTrack__Latent_Sequence_Optimization_for_Physics-Based_Motion_Tracking.html) — 同为「物理动作追踪」，走「冻结基础模型 + 潜空间优化」的另一条路线
- [MoRE: Mixture of Residual Experts (2025)](https://arxiv.org/abs/2506.08840) — 同样把「残差专家混合」用于人形步态，可对照 MoE 设计
- [AIST++](https://google.github.io/aistplusplus_dataset/) / [Motion-X](https://motion-x-dataset.github.io/) — HDHM 高动态片段的部分来源

---

> 备注：本笔记基于 arXiv 摘要、HTML v1 与官方仓库 README 整理，方法命名（SAR/DEA、帧加速增广、残差 MoE）与关键指标（失败率 −42.8%、MPJPE −14.6%）以官方 PDF 为准。源码运行时序图依据仓库 README 三步工作流绘制，实际脚本参数以仓库为准。
