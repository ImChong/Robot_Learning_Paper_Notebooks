---
layout: paper
title: "E-SDS: Environment-aware See it, Do it, Sorted - Automated Environment-Aware Reinforcement Learning for Humanoid Locomotion"
zhname: "E-SDS：面向人形行走的环境感知自动奖励生成强化学习"
category: "Locomotion"
arxiv: "2512.16446"
---

# E-SDS: Environment-aware See it, Do it, Sorted - Automated Environment-Aware Reinforcement Learning for Humanoid Locomotion
**在 SDS「看一段视频 → VLM 写奖励代码」的基础上加一个环境分析智能体：先放 1000 台 G1 在目标地形里跑 10 s，统计缺口比例、障碍密度、地形粗糙度，再把这些数字和视频里提取的步态描述一起交给 GPT-5 生成奖励函数；每轮生成 2 个候选、各训练 500 次 PPO 迭代，由反馈智能体打分并挑出最好的进入下一轮，共 3 轮，每种地形约 99 分钟。仿真里只有 E-SDS 学会了下楼梯，四种地形的速度跟踪误差比手工奖励基线低 51.9–82.6%。**

> 📅 总结日期: 2026-09-29
>
> 🏷️ 板块: 05 Locomotion · VLM 自动奖励生成 · 感知式行走 · 地形统计条件化 · 闭环奖励迭代 · Unitree G1（仿真）
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）· 05 模块中上游 awesome-humanoid-robot-learning 收录的 2026.01–02 与 2025.12 较新论文（Freestyle、RoboMirror 等）均已有笔记，E-SDS 是上游已收录、尚无笔记的最新一篇（2025.12）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.16446](https://arxiv.org/abs/2512.16446) |
| HTML | [在线阅读（arXiv HTML 视图）](https://arxiv.org/html/2512.16446) |
| PDF | [下载](https://arxiv.org/pdf/2512.16446v1) |
| **发布时间** | 2025-12-18（arXiv v1） |
| 会议 | RiTA 2025（Springer LNNS）录用 |
| 项目主页 | 暂无 |
| 源码 | ⏳ 论文与 arXiv 页面均未给出 E-SDS 源码链接 |
| 相关源码（前作 SDS） | [RPL-CS-UCL/SDS](https://github.com/RPL-CS-UCL/SDS)（[项目页](https://rpl-cs-ucl.github.io/SDSweb/)，四足版本，可作为理解 E-SDS 管线的参考） |

**作者**：Enis Yalcin, Joshua O'Hara, Maria Stamatopoulou, Chengxu Zhou, Dimitrios Kanoulas（University College London, RPL）

---

## 🎯 一句话总结

用 VLM 自动写奖励函数（Eureka、SDS 这一路）能省掉大量调参，但生成奖励时 VLM 完全不知道地形长什么样，训练出的策略也只看本体感受，只能在平地上走。E-SDS 在生成奖励之前先用传感器把地形「量一遍」，把统计结果写进提示词，让 VLM 生成的奖励里主动使用高度扫描和 LiDAR，从而把「自动奖励」和「感知式行走」接到一起。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| SDS | See it, Do it, Sorted | 前作：从单段视频为四足合成步态奖励的 VLM 框架 |
| E-SDS | Environment-aware SDS | 本文：加入环境分析智能体的 SDS |
| SUS | See it, Understand it, Sorted | 多阶段思维链提示：接触序列 / 步态 / 任务需求三个分析智能体 |
| VLM | Vision-Language Model | 本文用 GPT-5 同时做视频理解、代码生成与反馈打分 |
| POMDP | Partially Observable MDP | 感知式行走的建模方式，用循环策略处理历史 |

---

## ❓ 论文要解决什么问题？

1. **自动奖励是「盲」的**：Eureka / Text2Reward / SDS 生成奖励时拿不到机器人所在环境的状态，生成的奖励项不会用到地形信息，策略只能在简单地形上行走。
2. **感知式行走仍靠手调奖励**：高度图 + LiDAR 的感知策略已经能过复杂地形，但奖励通常是十几项手工设计的加权和，换地形就要重调，耗时以天计。
3. **传感器 ≠ 会用传感器**：实验里手工奖励基线同样有高度扫描和 LiDAR，却在楼梯顶端原地不动——奖励结构没把「看到地形」和「该怎么走」联系起来。

---

## 🔧 方法拆解

**① 问题设定**
- Unitree G1，POMDP + 循环策略 $\pi(a_t \mid s_t, h_t)$；
- 观测 $s_t$ 共 792 维：本体感受（关节位置、速度、基座朝向）+ $27 \times 21$ 高度扫描网格 + 144 条 LiDAR 距离；
- 动作 $a_t$ 为 23 维（论文表述为目标关节力矩）。

**② 视频侧：Grid-Frame Prompting + SUS**
- 示范视频自适应抽帧，拼成一张网格图交给 VLM，保留时空信息；
- SUS 思维链里三个分析智能体：接触序列分析、步态分析、任务需求分析（目标速度、姿态等）。

**③ 环境侧：环境分析智能体（本文核心）**
- 在目标地形里部署 1000 台机器人跑 10 s，采集传感器数据；
- 算出统计摘要：障碍密度、缺口比例、地形粗糙度等；
- 与 SUS 的行为描述合并成一个提示词 $P _ {\mathrm{combined}}$，让 GPT-5 生成 Python 奖励函数 $R$，其中既有步态项，也有显式读取高度扫描 / LiDAR 的环境项。

**④ 闭环训练与迭代（Algorithm 2）**
- 每轮生成 $N = 2$ 个候选奖励 $\{R_k^{(i)}\}$；
- 每个候选在 Isaac Lab 里用 3000 个并行环境训练 PPO $T = 500$ 次迭代；
- 反馈智能体根据速度跟踪误差、躯干触地率和回放视频给分 $J(\pi_k^{(i)})$，并写出文字反馈（如「在缺口前冻住不动」）；
- 选 $R^{*(i)} = \arg\max_k J(\pi_k^{(i)})$，连同反馈写入下一轮提示词；共 $I _ {\max} = 3$ 轮，每种地形约 99 分钟。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    VID["示范视频 V"] --> GRID["Grid-Frame Prompting<br/>自适应抽帧拼成网格图"]
    GRID --> SUS["SUS 思维链<br/>接触序列 · 步态 · 任务需求"]
    ENV["目标地形 E"] --> PROBE["环境分析智能体<br/>1000 台 G1 跑 10 s 采集传感器"]
    PROBE --> STAT["地形统计摘要<br/>缺口比例 · 障碍密度 · 粗糙度"]
    SUS --> PROMPT["合并提示词 P_combined"]
    STAT --> PROMPT
    PROMPT --> GEN["GPT-5 生成 N=2 个<br/>Python 奖励函数"]
    GEN --> TRAIN["Isaac Lab PPO<br/>3000 并行环境 × 500 次迭代<br/>观测 792 维（本体 + 高度图 + LiDAR）"]
    TRAIN --> EVAL["反馈智能体<br/>速度误差 · 躯干触地率 · 回放视频<br/>→ 打分 J 与文字反馈"]
    EVAL --> BEST["选最佳奖励 R*"]
    BEST -- "未满 3 轮：代码 + 反馈写回提示词" --> PROMPT
    BEST -- "满 3 轮" --> OUT["✅ 感知式行走策略<br/>约 99 分钟 / 每种地形"]

    style PROBE fill:#f3eafe,stroke:#8e44ad
    style STAT fill:#f3eafe,stroke:#8e44ad
    style TRAIN fill:#eef6ff,stroke:#2e86de
    style EVAL fill:#fff7e0,stroke:#d4a017
    style OUT fill:#eafaf1,stroke:#27ae60,color:#1b1b1b
</div>

> 紫色节点是 E-SDS 相比 SDS 新增的部分；其余视频分析、代码生成与迭代框架沿用 SDS。论文未公开源码，因此本笔记不画源码运行时序图。

---

## 📊 关键结果

仿真评测，四种地形：简单（3–5 cm 起伏）、缺口（80–120 cm 宽）、障碍（大小不一的方块）、楼梯（12 cm 台阶下行）。对比三种策略：

- **E-SDS**：环境感知奖励 + 感知策略；
- **Foundation-Only**：奖励生成时不做环境分析，策略只用本体感受（消融）；
- **Baseline**：同样有高度扫描和 LiDAR，但用文献中的 13 项手工奖励。

**速度跟踪误差（m/s，越低越好）**

| 地形 | E-SDS | Foundation-Only | Baseline | 相对 Baseline 降低 |
|---|---|---|---|---|
| 简单 | **0.387** | 0.549 | 2.225 | 82.6% |
| 缺口 | 0.660 | **0.577** | 1.373 | 51.9% |
| 障碍 | **0.492** | 0.621 | 2.058 | 76.1% |
| 楼梯 | **0.663** | 0.727 | 2.278 | 70.9% |

**躯干触地率（越低越好）与探索得分（越高越好）**

| 地形 | 指标 | E-SDS | Foundation-Only | Baseline |
|---|---|---|---|---|
| 楼梯 | 躯干触地率 | **0.000** | 333.466 | **0.000** |
| 楼梯 | 探索得分 | 10.930 | 11.109 | 3.495 |
| 缺口 | 躯干触地率 | 5.136 | 140.476 | **1.492** |
| 缺口 | 探索得分 | **10.886** | 5.170 | 6.447 |
| 障碍 | 躯干触地率 | **37.92** | 316.98 | 46.13 |
| 障碍 | 探索得分 | **7.825** | 5.873 | 5.870 |

- **楼梯**：只有 E-SDS 能下楼且零触地；Baseline 停在楼梯顶端不动（探索得分 3.50），Foundation-Only 往前冲、频繁摔倒（它的探索得分略高，是摔倒后仍在移动带来的）；
- **缺口 / 障碍**：Baseline 采取「保守回避」，触地率在缺口上最低但几乎不前进；E-SDS 主动穿行，探索面积分别是 Baseline 的 2.07× 和 2.36×；
- **消融**：去掉环境分析后，缺口上触地率高 27.4×、障碍上高 8.4×，楼梯完全失败。

---

## 💡 核心贡献

1. 让 VLM 生成奖励之前先「量地形」：用传感器统计量条件化奖励生成，生成的奖励会主动引用高度图与 LiDAR；
2. 沿用 SDS 的「多候选 → 训练 → VLM 打分 → 写回提示词」闭环，自动消除冻住不动等失效模式；
3. 在仿真 G1 上首次让自动生成的奖励学会楼梯下行，并把奖励设计时间从「数天」压到每种地形约 99 分钟。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **自动奖励设计** | 说明「给 LLM / VLM 看环境」和「给策略看环境」同样重要：只加传感器不改奖励，策略不会用 |
| **与 Eureka / SDS 的关系** | Eureka 从任务描述生成奖励，SDS 从视频生成奖励，E-SDS 在 SDS 上再加环境统计，是这一路线往感知式行走的延伸 |
| **局限** | 每种地形单独训练一个策略，没有混合地形 / 多任务统一策略；全部在仿真中评测，无真机；初始提示词仍需人工编写；每轮只有 2 个候选、共 3 轮，结果对 VLM 采样的随机性较敏感；论文没有给出多种子统计 |

---

## 🎤 面试参考

**Q：Baseline 也有高度扫描和 LiDAR，为什么还是下不了楼梯？**
A：观测里有地形信息不代表奖励鼓励利用它。13 项手工奖励主要围绕速度跟踪和稳定性，在楼梯这种高风险地形上，「原地不动」是一个局部最优：不摔倒、惩罚小。E-SDS 生成的奖励包含和地形相关的项，才把策略推出这个局部最优。

**Q：环境分析智能体为什么要放 1000 台机器人跑一小段时间，而不是直接读地形配置？**
A：它模拟的是「机器人从自己的传感器看到的地形」，统计量（缺口比例、障碍密度、粗糙度）与策略实际观测到的高度图 / LiDAR 分布一致，VLM 据此写出的奖励项更容易直接落到这些观测上；同时这一步不依赖地形生成器的内部参数，换地形时流程不变。

**Q：这类 VLM 奖励生成方法主要的风险是什么？**
A：一是代码生成本身的随机性，候选少时结果波动大；二是打分也由 VLM 完成，可能与真实目标有偏差（奖励黑客或评分偏好）；三是每条管线要训练多个策略，算力成本与候选数、迭代轮数线性增长。

---

## 🔗 相关阅读

- [SDS: See it, Do it, Sorted — Quadruped Skill Synthesis from Single Video Demonstration (2410.11571)](https://arxiv.org/abs/2410.11571)：E-SDS 的前作，四足视频到奖励
- [Eureka: Human-Level Reward Design via Coding Large Language Models (2310.12931)](https://arxiv.org/abs/2310.12931)：LLM 生成并迭代奖励代码
- [Revisiting Reward Design and Evaluation for Robust Humanoid Standing and Walking (2404.19173)](https://arxiv.org/abs/2404.19173)：本文手工奖励基线的来源
- [Learning Humanoid Locomotion with Perceptive Internal Model (2411.14386)](https://arxiv.org/abs/2411.14386)：手工奖励的感知式人形行走代表工作
