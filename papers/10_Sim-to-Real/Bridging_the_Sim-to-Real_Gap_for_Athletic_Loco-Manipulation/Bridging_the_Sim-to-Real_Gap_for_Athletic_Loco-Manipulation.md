---
layout: paper
paper_order: 10
title: "Bridging the Sim-to-Real Gap for Athletic Loco-Manipulation"
zhname: "UAN：面向竞技型运动操作的 Sim-to-Real 无监督执行器网络"
category: "Sim-to-Real"
---

# Bridging the Sim-to-Real Gap for Athletic Loco-Manipulation
**UAN：面向竞技型运动操作的 Sim-to-Real 无监督执行器网络**

> 📅 阅读日期: 2026-08-28
>
> 🏷️ 板块: 10 Sim-to-Real · 竞技型运动操作 · 无监督执行器网络 · 任务奖励 · 预训练引导探索
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2502.10894](https://arxiv.org/abs/2502.10894) |
| HTML | [在线阅读](https://arxiv.org/html/2502.10894v1) |
| PDF | [下载](https://arxiv.org/pdf/2502.10894) |
| 项目页 | [uan.csail.mit.edu](http://uan.csail.mit.edu) |
| 源码 | 🌟 开源 [nolie-rolie/athletic-loco-manipulation](https://github.com/nolie-rolie/athletic-loco-manipulation) |
| **发布时间** | 2025-02-15（arXiv v1） |
| 作者 / 机构 | Nolan Fey、Gabriel B. Margolis、Martin Peticco、Pulkit Agrawal（MIT CSAIL Improbable AI Lab） |

**机器人平台**：**Unitree B2 四足底盘 + Z1 机械臂**（B2+Z1 全身运动操作系统），也支持单独 Z1 臂配置。

**领域归属**：腿足 / 运动操作（loco-manipulation）**Sim-to-Real**——针对「竞技型动态任务（扔、拉、举）无法靠追踪奖励学出、且谐波减速执行器难建模」这一痛点，用真机数据辨识执行器、并重设奖励与探索范式。

---

## 🎯 一句话总结

要让机器人做**扔球、拖雪橇、举哑铃**这类**竞技型、目标导向的动态动作**，传统「追踪参考轨迹」的奖励是不够的——参考轨迹本身可能不满足任务目标（比如「扔得最远」并没有现成示范），硬追踪会限制策略上限。本文主张**改用任务奖励**（直接奖励「扔多远、举多重、拉多稳」），但这带来两个新麻烦：① 任务奖励下策略更激烈，**谐波减速执行器**的时滞/非线性被放大，sim-to-real 差距变大；② 纯任务奖励**探索困难、易奖励作弊**（reward hacking，学出投机取巧却不可迁移的动作）。对应两招：**UAN（Unsupervised Actuator Net，无监督执行器网络）** 用真机数据学出「校正力矩」补齐执行器动力学，且**不需要力矩传感器、不需要力矩标签**；**两阶段训练**先用参考轨迹**预训练**引导探索、再切任务奖励**微调**，既拿到任务性能又不塌成作弊解。最终在 B2+Z1 上真机完成扔、拉、举三类动作，并显著缩小 sim-to-real 差距。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| UAN | Unsupervised Actuator Net | 无监督执行器网络：从真机数据学「校正力矩」补执行器时滞/非线性，无需力矩标签 |
| WBC | Whole-Body Control | 全身控制：底盘+机械臂协调的全身运动 |
| Loco-Manipulation | Locomotion + Manipulation | 运动操作：移动与操作耦合的任务 |
| Actuator Net | Actuator Network | 执行器网络：把「关节指令→实际力矩/响应」建模，缩小执行器 sim-to-real 差距 |
| Reward Hacking | — | 奖励作弊：策略钻奖励漏洞、学出高分但不可迁移/不合理的动作 |
| Task Reward | — | 任务奖励：直接奖励任务目标（扔远/举重/拉稳），区别于追踪参考轨迹的追踪奖励 |

---

## ❓ 论文要解决什么问题？

- **动机**：竞技型运动操作（扔、拉、举）是**目标导向的动态全身动作**，没有现成「标准示范」可追踪，硬用**追踪奖励**会把策略锁死在参考轨迹附近、够不到任务最优。
- **改用任务奖励后的两个新问题**：
  1. **执行器难建模**：任务奖励让动作更激烈，Z1 臂等**谐波减速（harmonic drive）**执行器的**时滞与非线性**被放大，仿真里学好的策略上真机掉点；而**直接测力矩需要力矩传感器**，很多平台没有。
  2. **探索难 + 奖励作弊**：纯任务奖励稀疏、探索困难，策略容易学出「投机取巧的高分动作」（reward hacking），仿真里好看但不可迁移。
- **本文取向**：不加力矩传感器、不放弃任务奖励，而是①用**无监督**方式从真机数据学执行器校正、②用**参考轨迹预训练**为任务奖励提供良好探索起点。

---

## 🧠 方法：任务奖励 + UAN + 两阶段训练

### 1）UAN：无监督执行器网络（补 sim-to-real 动力学）

- **目标**：把「关节位置指令 → 真机实际动力学响应」建模，捕捉谐波减速执行器的**时滞、摩擦、非线性**，让仿真等效动力学逼近真机。
- **无监督关键**：传统 actuator net 需要**力矩标签**（监督学习），而 UAN **不需要力矩传感器**——它学习输出一组**校正力矩（corrective torques）**，通过真机采集的**位置/指令轨迹**间接约束，在无力矩真值的情况下也能学出补偿。
- **落地**：真机（Z1）跑一批动作，采 LCM 日志（位置指令/响应），离线训 UAN；训练策略时把 UAN 接进仿真，让策略在「被校正过的动力学」上学习，部署即零样本迁移。

### 2）两阶段训练：预训练引导探索 → 任务奖励微调

- **阶段一（预训练）**：用**参考轨迹**做引导（追踪式奖励），让策略先学会稳定、可行的全身协调（WBC），拿到一个不塌的探索起点。
- **阶段二（微调）**：切换到**任务奖励**（扔远/举重/拉稳），在预训练策略基础上继续优化。参考轨迹此时只作「探索脚手架」——既**避免奖励作弊**（不会一上来乱探索钻漏洞），又**突破追踪上限**（最终由任务奖励主导、超过纯追踪策略）。

### 3）整体训练 → 部署流程（对应仓库 Makefile 流水）

1. **采真机数据** → 训 **UAN**（`make train-z1-actuator-net`）；
2. **预训练 WBC**（`make train-b2-z1-wbc`，参考轨迹引导）；
3. **任务微调**：扔 / 拉 / 举（`make train-b2-z1-throw|Sled|Snatch`，载入预训练 WBC 权重 + UAN）；
4. **真机部署**：`play_wbc.py` / `play_uan.py` 推理，零样本迁移到 B2+Z1。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph REAL0["① 真机数据采集 (一次性)"]
        LOG["🤖 Z1 臂跑动作<br/>采 LCM 日志<br/>(位置指令 / 响应)"]
    end

    subgraph UAN["② UAN 无监督执行器网络"]
        TRAINU["学『校正力矩』<br/>捕捉谐波减速时滞/非线性<br/>❗无需力矩传感器/标签"]
    end
    LOG --> TRAINU

    subgraph PRE["③ 阶段一 · 预训练 (参考轨迹引导)"]
        WBC["🦿 全身控制 WBC<br/>追踪式奖励<br/>→ 稳定可行的探索起点"]
    end

    subgraph FT["④ 阶段二 · 任务奖励微调"]
        THROW["🏀 扔球 (释放速度)"]
        SLED["🛷 拖雪橇 (持续出力/稳定)"]
        SNATCH["🏋️ 哑铃抓举 (举重/稳持)"]
    end
    WBC --> THROW
    WBC --> SLED
    WBC --> SNATCH

    TRAINU -->|"接入仿真<br/>动力学≈真机"| PRE
    TRAINU -->|"接入仿真"| FT

    FT --> DEPLOY["🚀 零样本部署<br/>B2 四足 + Z1 臂真机<br/>sim-to-real 差距显著缩小"]
</div>

---

## 💡 核心贡献

1. **提出以任务奖励做竞技型运动操作**：指出追踪奖励对「无标准示范的动态目标任务（扔/拉/举）」的局限，转向直接优化任务目标以突破性能上限。
2. **UAN（无监督执行器网络）**：在**无力矩传感器/无力矩标签**条件下，从真机数据学出校正力矩，补齐谐波减速执行器的时滞与非线性，缩小 sim-to-real 差距。
3. **两阶段训练范式**：用参考轨迹预训练为任务奖励提供良好探索起点，**兼顾任务性能与防奖励作弊**，最终超过纯追踪策略。
4. **真机验证 + 开源**：在 B2+Z1 上完成扔球、拖雪橇、哑铃抓举三类竞技动作，代码与配置全流程开源。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 任务奖励 vs 追踪奖励 | 任务奖励策略在扔/拉/举等动态任务上**超过**仅用追踪奖励训练的策略 |
| UAN 校准效果 | 在扔球等任务上，UAN 校准**显著缩小**仿真与真机的性能差距（无需力矩传感） |
| 两阶段必要性 | 预训练引导探索能在获得任务性能的同时**保持训练稳定、避免奖励作弊** |
| 任务覆盖 | 扔球（全身协调 + 释放速度）、拖雪橇（持续出力 + 稳定）、哑铃抓举（举重 + 稳持）三类均真机跑通 |

> 📌 具体数值以官方 PDF / 项目页为准；本笔记基于 arXiv 摘要 + 项目页 + 开源仓库整理。

---

## 💻 源码运行时序图（mermaid）

> 依据开源仓库 [nolie-rolie/athletic-loco-manipulation](https://github.com/nolie-rolie/athletic-loco-manipulation)：Isaac Sim（`omniisaacgymenvs`）+ rl_games / rsl_rl（PPO）+ Hydra 配置，Makefile 串起「UAN → 预训练 WBC → 任务微调 → 部署」。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户 (Makefile / CLI)
    participant HW as Z1 真机 (LCM 日志)
    participant AN as z1_actuator_net.py (UAN)
    participant TR as rlgames_train.py (PPO)
    participant ENV as b2_z1_wbc.py (Isaac Sim 环境)
    participant CFG as Hydra cfg/ (task+train)
    participant CK as runs/.../nn (checkpoint)
    participant PLAY as play_wbc.py / play_uan.py

    Note over U,AN: ① 训练 UAN（无监督执行器网络）
    U->>HW: 采集位置指令/响应 (LCM → pickle)
    U->>AN: make train-z1-actuator-net
    AN->>AN: 学『校正力矩』(无力矩标签)
    AN-->>CK: 保存 UAN 权重

    Note over U,ENV: ② 阶段一 · 预训练 WBC（参考轨迹引导）
    U->>TR: make train-b2-z1-wbc (task=B2Z1WBC)
    TR->>CFG: 读取 task/train 配置
    TR->>ENV: 创建并行环境 (接入 UAN 校正)
    loop PPO 迭代
        ENV-->>TR: 观测 / 追踪式奖励
        TR->>TR: 更新策略 π
    end
    TR-->>CK: 保存预训练 WBC 权重

    Note over U,ENV: ③ 阶段二 · 任务奖励微调（扔/拉/举）
    U->>TR: make train-b2-z1-throw|Sled|Snatch
    TR->>CFG: 载入预训练 WBC 权重 (B2Z1WBC.yaml)
    TR->>ENV: 切任务奖励 (扔远/举重/拉稳)
    loop PPO 微调
        ENV-->>TR: 观测 / 任务奖励
        TR->>TR: 更新策略 (防奖励作弊)
    end
    TR-->>CK: 保存任务策略

    Note over U,PLAY: ④ 部署 / 推理（零样本迁真机）
    U->>PLAY: checkpoint=<path> test=True
    PLAY->>ENV: 加载策略 + UAN
    PLAY-->>U: 全身运动操作动作输出 → B2+Z1
</div>

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **无传感器执行器辨识** | 很多真机（尤其谐波减速臂/关节）没有力矩传感器，UAN 用无监督方式补动力学，路线可直接迁到人形关节 |
| **任务奖励 > 追踪奖励** | 对「没有标准示范」的动态技能（投掷、发力、举重），直接优化任务目标能突破追踪上限，对人形竞技动作同样适用 |
| **预训练防作弊** | 用参考轨迹预训练做探索脚手架、再切任务奖励，是缓解稀疏任务奖励下奖励作弊的通用配方 |
| **loco-manipulation 范式** | 底盘+臂全身协调的训练/部署流水（UAN→WBC→任务微调）对人形上肢操作+下肢支撑有直接借鉴 |

---

## 🎤 面试参考

**Q：竞技型运动操作为什么不能只用追踪奖励？**
A：扔球、举重这类动态目标任务没有现成「标准示范轨迹」可追踪，追踪奖励会把策略锁在参考附近、够不到任务最优（比如「扔最远」）。本文改用任务奖励直接优化任务目标，从而突破追踪上限。

**Q：UAN 与传统 actuator net 的区别？为什么叫「无监督」？**
A：传统 actuator net 用监督学习，需要**力矩标签**（要力矩传感器）。UAN 在**没有力矩传感器/力矩真值**的情况下，从真机采集的位置指令/响应数据里学出一组**校正力矩**来补执行器的时滞和非线性，故称无监督。

**Q：为什么要两阶段训练？**
A：纯任务奖励稀疏、探索困难，容易奖励作弊（学出高分但不可迁移的投机动作）。先用参考轨迹预训练拿到稳定可行的探索起点（WBC），再切任务奖励微调，既保留探索质量、避免作弊，又让任务奖励主导、最终超过纯追踪策略。

**Q：验证平台和任务是什么？**
A：Unitree B2 四足 + Z1 机械臂（B2+Z1），真机完成扔球、拖雪橇、哑铃抓举三类竞技动作；UAN 校准显著缩小仿真与真机的性能差距。

---

## 🔗 相关阅读

- [Actuator Reality Shaping for Zero-Shot Sim-to-Real (2607.02205)](https://arxiv.org/abs/2607.02205)：反方向「塑形硬件逼近仿真」，与本文「学执行器补仿真逼近真机」对照，本仓库已有笔记
- [Bridging the Sim-to-Real Gap in Parallel-Link Leg Mechanisms (2608.01697)](https://arxiv.org/abs/2608.01697)：仿真侧动力学归一化补执行器/连杆惯量，同着眼执行器动力学，本仓库已有笔记
- [Sim-to-Real of Humanoid Locomotion via Joint Torque Space Perturbation Injection (2504.06585)](https://arxiv.org/abs/2504.06585)：在关节力矩空间注入扰动增强鲁棒性，同关注力矩/执行器层，本仓库已有笔记
- [Simulator Adaptation via Proprioceptive Distribution Matching (2604.11090)](https://arxiv.org/abs/2604.11090)：用本体感知分布匹配辨识仿真器动力学，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要 + 项目页（uan.csail.mit.edu）+ 开源仓库整理；具体数值与实现细节以官方 PDF 为准。源码运行时序图依据仓库 Makefile 与脚本命名推断，实际以仓库最新代码为准。
