---
layout: paper
title: "ThorArena: Benchmarking Humanoid Physical Interaction with Human Motion-Force Demonstrations"
zhname: "ThorArena：面向人形物理交互的运动-力示范基准"
category: "Simulation Benchmark"
arxiv: "2607.06052"
---

# ThorArena: Benchmarking Humanoid Physical Interaction with Human Motion-Force Demonstrations
**ThorArena：面向人形物理交互的运动-力示范基准**

> 📅 阅读日期: 2026-07-17
>
> 🏷️ 板块: 11 Simulation & Benchmark · 力感知评测 · 接触密集交互 · 全身控制基准
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2607.06052](https://arxiv.org/abs/2607.06052) |
| HTML | [在线阅读](https://arxiv.org/html/2607.06052v1) |
| PDF | [下载](https://arxiv.org/pdf/2607.06052) |
| **发布时间** | 2026-07-07 (arXiv) |
| 源码 | 截至当前论文未见公开代码/项目页 |

**作者**：Chenhao Yu, Hongwu Wang, Weitao Zhang, Youhao Hu, Jiachen Zhang, Gangyang Li, Alois Knoll, Shaqi Luo

**机构**：北京智源人工智能研究院（BAAI）× 慕尼黑工业大学（TU Munich，Alois Knoll 组）

---

## 🎯 一句话总结

现有人形运动模仿 / 全身控制的数据集与基准**几乎只看运动学（kinematic motion）**，忽略了与之同步的**交互力**。结果是：评测无法反映「外部力如何影响跟踪精度、稳定性与鲁棒性」——一个在无力条件下跟踪很漂亮的策略，一旦要推椅子、抬重物就可能崩掉，而传统指标看不出来。**ThorArena** 补上这块：采集**运动 + 双手力同步**的真人示范，提出**力感知评测指标（FATS 等）**，并给出一套**「在仿真里回放录制交互力」**的统一评测协议，让不同全身控制策略在接触密集场景下可复现地对比。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| FATS | Force-Aware Tracking Score | 力感知跟踪分：把跟踪误差与「存活」耦合的综合分 |
| WBC | Whole-Body Control | 全身控制 |
| MoCap | Motion Capture | 动作捕捉，这里用 VR 头显 + 体感追踪器 |

---

## ❓ 论文要解决什么问题？

人形机器人越来越被期待做**接触密集（contact-rich）**的任务——不仅要全身动作精准，还要和物体 / 人稳健地**物理交互**。但目前的评测有个盲区：

1. **数据集只记运动、不记力**：主流动捕数据 / 基准聚焦关节轨迹，缺乏与运动**时间同步的交互力**。
2. **评测掩盖了力致失稳**：无力（no-force）评测下策略表现相近，一旦施加真实外力，跟踪精度、稳定性、控制代价的差距才显现，而现有指标测不到这些差异。

ThorArena 的答案：**造一套带力的真人示范 → 定义力感知指标 → 在仿真里回放这些力做标准化评测**。

---

## 🔧 方法拆解

### 1. 真实运动-力示范采集
- 操作者佩戴 **PICO 4 Ultra VR 头显 + 体感追踪器**捕捉全身运动；
- **双手各接一个力传感器（配 3D 打印挂钩）**，同步测量左右手施加 / 承受的力；
- 覆盖 **6 类代表性物理交互任务**，每类 **60 段**、共 **360 段**示范。

### 2. 六类物理交互任务
擦桌（table wiping）、放下物体（object lowering）、抬起物体（object lifting）、拉椅子（chair pulling）、推椅子（chair pushing）、协同搬运（cooperative carrying）。

### 3. 力感知评测指标
- **FATS**：`100 · exp(−Eᵢ/σ) · sᵢ`（σ=0.15m），把**跟踪误差 Eᵢ** 与**回合存活 sᵢ** 耦合——既要跟得准，又要撑得住不倒。
- **鲁棒比 ρ = E_low / E_high**：强力 vs 弱力下误差之比，衡量「力变大时性能退化多少」。
- **功率开销 η = P_high / P_low**：强力下额外多花的控制努力。

### 4. 统一评测协议（力回放）
把录制到的**交互力在仿真中回放**施加到被测策略上，提供**标准化评测接口**，任意全身控制策略都能插进来跑同一套任务与指标，保证可复现、可横向对比。

### 5. 基线与核心发现
在 **Thor2 / TWIST2 / GMT / SONIC** 四个代表性全身控制策略上评测：无力评测下彼此差距不大，**加入真实交互力后差距显著拉开**——多数策略在外力下性能明显退化，而 Thor2 相对最鲁棒。结论：**传统无力评测无法揭示「力致失稳」**，力感知评测才能真实反映接触密集能力。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph COLLECT["📥 真人示范采集"]
        VR["🥽 PICO 4 Ultra<br/>+ 体感追踪器 → 全身运动"]
        FS["🖐️ 双手力传感器<br/>(3D 打印挂钩) → 交互力"]
        DATA["运动-力同步数据集<br/>6 任务 × 60 = 360 段"]
    end

    subgraph TASKS["🧩 6 类接触密集任务"]
        T["擦桌 · 放下 · 抬起<br/>拉椅 · 推椅 · 协同搬运"]
    end

    subgraph EVAL["⚖️ 力感知评测协议"]
        REPLAY["🔁 仿真中回放录制交互力"]
        METRIC["📊 FATS + 鲁棒比 ρ + 功率开销 η"]
        POLICY["🤖 被测策略<br/>Thor2 / TWIST2 / GMT / SONIC"]
    end

    FINDING["💡 无力评测看不出差距<br/>加力后差距显著暴露<br/>Thor2 最鲁棒"]

    VR --> DATA
    FS --> DATA
    DATA --> T
    T --> REPLAY
    REPLAY --> POLICY
    POLICY --> METRIC
    METRIC --> FINDING

    style COLLECT fill:#fff7e0,stroke:#d4a017
    style TASKS fill:#eef6ff,stroke:#2e86de
    style EVAL fill:#eafaf1,stroke:#27ae60
    style FINDING fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **首个力感知人形交互基准**：同步采集运动 + 双手力的真人示范，填补「只有运动学、没有交互力」的评测空白。
2. **力感知指标 FATS 及诊断量**：把跟踪精度、抗力鲁棒性、控制代价、回合存活综合成可比分数。
3. **力回放评测协议**：在仿真中回放真实交互力，给出标准化接口，任意全身控制策略可复现对比。
4. **实证发现**：外力显著放大策略间差距，揭示传统无力评测掩盖的「力致失稳」问题。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 无力 vs 有力 | 无力评测下各策略相近；加真实交互力后性能差距显著暴露 |
| 最鲁棒基线 | Thor2 在外力下退化最小，TWIST2 / GMT / SONIC 退化更明显 |
| 指标价值 | FATS/ρ/η 能刻画"力变大时跟踪与稳定性如何退化"，传统指标做不到 |
| 数据规模 | 6 类任务 × 60 段 = 360 段带力示范 |

> ⚠️ 上表数值/结论取自论文 v1，具体以正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **评测补上"力"这一维** | 接触密集任务的好坏不能只看关节轨迹，力感知评测更贴近真实落地 |
| **可复现的横向对比** | 力回放协议 + 标准接口，让不同 WBC 策略在同一基准下公平比较 |
| **反哺策略设计** | 暴露"力致失稳"后，可指导奖励/课程/柔顺控制往抗力鲁棒方向优化 |

---

## 🔗 相关阅读

- [SIMPLE (2606.08278)](https://arxiv.org/abs/2606.08278)：全身移动操作的仿真评测平台（本模块上一篇）
- [SONIC](https://nvlabs.github.io/SONIC/)：大规模自然全身运动跟踪（ThorArena 基线之一）
- [TWIST2 (2510.xxxxx)](https://arxiv.org/abs/2505.02833)：可规模化全身遥操作数据采集（ThorArena 基线之一）
- [HumanoidBench (2403.10506)](https://arxiv.org/abs/2403.10506)：人形全身控制仿真基准
