---
layout: paper
paper_order: 12
title: "Understanding Domain Randomization for Sim-to-real Transfer"
category: "仿真到现实"
demos: ["dr_theory"]
---

# Understanding Domain Randomization for Sim-to-real Transfer
**理解域随机化在仿真到现实迁移中的作用**

> 📅 阅读日期: 待读
>
> 🏷️ 板块: Sim-to-Real / Theory

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2110.03239](https://arxiv.org/abs/2110.03239) |
| **PDF** | [下载](https://arxiv.org/pdf/2110.03239) |
| **作者** | Xiaoyu Chen 等 |
| **机构** | Princeton（主要）|
| **发布时间** | 2021年10月（v1）, 2022年3月（v2）（arXiv） |
| **类型** | 理论分析 / 综述 |
| **代码** | 理论论文，**无配套实验代码**（ICLR 2022 Spotlight） |

---

## 🎯 一句话总结

Domain Randomization（DR）是 sim-to-real 领域最常用的方法之一，但这篇论文提供了**理论框架**来解释为什么 DR 能在不需要任何现实数据的情况下成功迁移，并证明了**使用记忆（历史依赖策略）对 DR 的成功至关重要**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **DR** | Domain Randomization | 域随机化 |
| **sim-to-real** | Simulation to Real World | 仿真到现实迁移 |
| **MDP** | Markov Decision Process | 马尔可夫决策过程 |
| **RL** | Reinforcement Learning | 强化学习 |

---

## ❓ 这篇论文要解决什么问题？

DR 在实践里效果很好（机器人操纵、足式 locomotion 等），但**没有理论解释**——为什么简单的随机化仿真参数就能迁移到现实？需要多少随机化样本？什么时候会失败？

---

## 🔑 核心理论框架

### 仿真器建模为 MDP 集合

真实世界的物理参数（摩擦力、质量、延迟等）是**未知的**，DR 把仿真器建模为一组带有**可调参数**的 MDP 集合：

$$\mathcal{M} = \{ M_\theta : \theta \in \Theta \}$$

每个 $\theta$ 代表一套物理参数配置。

### Sim-to-Real Gap 的界限

论文给出了 DR 返回的策略价值与真实世界最优策略价值之间的**理论上界**：

$$\text{gap} \leq f(\text{随机化分布}, \text{样本复杂度})$$

关键发现：在** mild conditions** 下，这个 gap 可以足够小——意味着 DR 可以**无需任何现实样本**实现成功迁移。

这个界不用啃公式也能看懂：下面这个实验台把 $\varepsilon_{approx}$ 和 $\varepsilon_{stat}$ 画成两条反向的曲线，拖动随机化区间和真实 $\mu^\star$，就能看到「太窄覆盖不到、太宽学不动」这个取舍长什么样：

<div class="paper-demo" data-demo="drt-gap"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### Memory (历史依赖策略) 的重要性

论文理论分析的一个核心结论：**DR 需要使用历史依赖策略（memory-based policy）**，而非只依赖当前状态的 Markov 策略。

直觉：只有利用历史信息，策略才能隐式地识别当前所在的 domain，从而在仿真随机化中学到跨不同物理参数都有效的能力。

「隐式地识别当前所在的 domain」具体是怎么发生的？下面这个演示把历史长度做成滑块——把它拖到 0（Markov），策略就只能按先验均值出一个保守动作；往上拖，$\mu$ 的后验会肉眼可见地收窄：

<div class="paper-demo" data-demo="drt-memory"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## ✅ 主要贡献

1. 提出第一个 DR 的**严格理论框架**
2. 证明 DR 成功的**充分条件**（mild conditions）
3. 从理论角度揭示 **memory-based policy** 的必要性
4. 将 sim-to-real gap _bound 转化为无限时域 MDP 的学习复杂度问题（新理论工具）

---

## 💡 个人理解

这篇论文的价值在于把 DR 从"玄学调参"拉到了"有据可依"的层面。

之前大家用 DR 都是"试试这个范围、不行再调"，现在有了理论指导：随机化分布怎么选、需要多少样本、为什么 history 重要。

对于人形机器人学习来说，理解 DR 的理论边界能帮助我们更聪明地设计随机化策略——不是盲目随机，而是**有目标地覆盖真实世界的不确定性空间**。

---

## 🚶 具体实例：人形机器人摩擦系数随机化

下面用一个"脚底摩擦系数"的小例子，把 DR 的训练循环、历史依赖策略、以及 sim-to-real gap 三件事一次串起来。

### 场景设定

- 机器人：Unitree H1，任务是原地站立平衡 5 秒。
- 物理参数 $\theta$：脚底与地面摩擦系数 $\mu \in [0.3, 1.2]$，真实值 $\mu^\star \approx 0.6$（未知）。
- 随机化分布 $p(\theta)$：均匀分布 $\mathcal{U}(0.3, 1.2)$。

### 第一步：每个 episode 采样一个 $\theta$

<div class="mermaid">
flowchart LR
    T["μ_i ~ U(0.3,1.2)"] --> E["env = Sim(μ_i)"]
    E --> R["π(·#124;s,h) rollout → G_i"]
</div>

关键点：每个 episode 的 $\mu$ 不同，策略看到的脚底打滑程度不一样。

### 第二步：为什么 memory-based policy 必要

<div class="mermaid">
flowchart TB
    MK["Markov π(a#124;s_t)"] --> BAD["同 pose 不同 μ → 只能保守平均"]
    MEM["Memory π(a#124;s_t,h)"] --> INF["从滑动信号推断 μ"]
    INF --> GOOD["同一网络给出合适力矩"]
</div>

### 第三步：训练循环伪代码

<div class="mermaid">
flowchart TB
    S["for step in N"] --> MU["μ ~ U(0.3,1.2)"]
    MU --> RESET["s_0 = env.reset(μ)"]
    RESET --> LOOP["t: a=π(s,h); step; h←s"]
    LOOP --> PPO["PPO 更新 π"]
    PPO --> S
</div>

### 第四步：sim-to-real gap 直觉估计

论文定理：DR 返回策略 $\pi_{DR}$ 在真实 $\mu^\star$ 下的次优 gap 满足
$$V^\star(\mu^\star) - V^{\pi_{DR}}(\mu^\star) \leq \underbrace{\epsilon_{approx}}_{\text{随机化覆盖误差}} + \underbrace{\epsilon_{stat}}_{\text{样本复杂度}}$$

- 若 $\mu^\star \in [0.3, 1.2]$（真实值落在随机化区间内）→ $\epsilon_{approx}$ 很小。
- 若 $\mu^\star = 0.1$（比训练分布还滑）→ $\epsilon_{approx}$ 急剧变大，迁移失败。

**实战推论**：随机化区间要**覆盖真实分布**，宁可偏大。

### 📊 域随机化 + 历史依赖策略训练循环

<div class="mermaid">
flowchart TB
    Start["训练步开始"] --> Sample["采样 θ ~ p(θ)<br/>构造 MDP M_θ"]
    Sample --> Reset["env.reset(θ)"]
    Reset --> Loop{"时步 t 是否未达 T"}
    Loop -->|是| Act["a_t = π(·#124;s_t, h)<br/>历史依赖策略"]
    Act --> Step["s_{t+1}, r_t = env.step"]
    Step --> Hist["更新历史缓冲 h"]
    Hist --> Loop
    Loop -->|否| PPO["PPO 更新 π"]
    PPO --> Start
    Real["真实环境 θ*<br/>若在训练支撑集内"] -.->|迁移| Policy["π_DR 部署"]
</div>

---

## 🤖 这篇理论分析对人形机器人的工程价值

1. **给"随机化区间"的选择提供原则**：区间要覆盖真实不确定性的支撑集 (support)，宁宽勿窄。
2. **解释了为什么 LSTM / Transformer / history frame stack 是 sim-to-real 标配**：无历史 → DR 理论下界达不到。
3. **为 ADR（自动域随机化）等后续工作奠基**：既然 gap 依赖随机化分布与真实分布的匹配度，那就让算法自己去找最合适的分布。
4. **告诉你何时 DR 会失败**：随机化区间漏掉真实值 / 策略没用历史 / 样本量太少——任一条件不满足，迁移就会出问题。

---

## 🎤 面试高频问题 & 参考回答

### Q1: Domain Randomization 为什么在没有任何真实数据的情况下也能迁移？

从贝叶斯视角看，DR 相当于在一组 MDP 上求解"期望最优策略"：只要真实 MDP 落在随机化的支撑集内，这个期望最优策略在真实环境上就有性能下界。论文把这个直觉严格化，给出了具体的 gap 上界形式。

### Q2: 为什么 DR 一定要 memory-based policy？

因为不同 $\theta$ 下的最优动作可能在**当前状态相同**的情况下截然不同（e.g. 摩擦不同但躯干姿态相同）。Markov 策略在这种情况下只能学"两端平均"的次优策略；而历史依赖策略能通过过去几步的反馈**隐式推断**当前环境参数，再给出对应动作——这本质上是在 POMDP 里做 belief update。

### Q3: DR 和 System Identification 的区别？

- **System ID**：先估 $\hat{\theta}$，再针对 $\hat{\theta}$ 训策略。两阶段。
- **DR**：直接训一个对所有 $\theta \in \Theta$ 都还行的策略。一阶段，但泛化要求高。
- **实战**：两者可以结合 —— DR 训出的历史依赖策略本身就带有 implicit system ID。

### Q4: DR 的随机化范围应该多大？

理论给出的答案：**至少覆盖真实世界参数的支撑集**。过窄会导致 gap 不可控；过宽会浪费样本、甚至让学习崩溃（策略被迫在无法同时胜任的 MDP 上折中）。实战里用 ADR 自动调节，或用少量真实数据做 Bayesian 更新。

### Q5: 为什么 DR 在行走类任务上效果特别好？

行走本身对历史依赖强（步态节奏、落地反馈），天然适合 memory-based policy；而摩擦、质量、延迟等物理参数的真实分布也相对紧凑，易于用均匀分布覆盖。配合大规模 GPU 并行采样（Isaac Gym 数千倍加速），DR 就成了 sim-to-real 的事实标准方案。

### Q6: ADR（Automatic Domain Randomization）和本文是什么关系？

本文从理论上说明"随机化分布越接近真实分布，gap 越小"；ADR 从算法上让随机化分布**自适应扩大**——只要策略在当前分布上达到阈值表现，就把分布再加宽一点。两者在精神上完全一致：ADR 是本文理论结论的工程实现之一。

顺便把 Q3 那个对比也画出来：SysID 的曲线又高又窄，DR 的又低又平。把「参数漂移」滑块拖大——真机上电池、磨损、地面材质每天都在变，这才是两者的胜负手：

<div class="paper-demo" data-demo="drt-sysid"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 💬 讨论记录

### 2026-04-18：DR 为什么不能像监督学习那样"数据增广就行"

第一眼感觉 DR 就是"环境数据增广"。但监督学习里 y 是 ground truth，增广不改变 y；而在 RL 中，**不同 $\theta$ 下同一个 $(s, a)$ 对应的最优动作甚至符号可能相反**。所以 DR 必须要策略有能力区分当前所在 domain，才能学到真正有用的行为——这正是论文强调 memory 的原因。

---

## 📎 附录

### A. 与路线图其他论文的关联

| 论文 | 关系 |
|------|------|
| LCP (2025) | 从动作平滑角度解决 sim-to-real，与 DR 互补——DR 管"环境泛化"，LCP 管"动作平滑" |
| ADD (2025) | 与 DR 正交，ADD 专注模仿学习中的判别器设计 |
| PHC (2023) | 训练中也用到 DR 对状态噪声的处理（noisy obs branch） |
| AMP / ASE 等 Isaac Gym 系论文 | 默认开启 DR 的摩擦、质量、延迟随机化 |

### B. 实战随机化清单（从论文 + 社区经验整理）

| 参数类别 | 常见随机化范围 | 备注 |
|---------|--------------|------|
| 摩擦系数 | ±50% | 脚底与地面 |
| 质量 | ±20% | 躯干 / 肢段 |
| 质心偏移 | ±5 cm | 模拟装配误差 |
| 电机延迟 | 5–20 ms | 通讯与驱动延迟 |
| 观测噪声 | Gaussian, σ≈1–3% | IMU、关节编码器 |
| PD 控制增益 | ±15% | 模拟电机响应差异 |

---

## 📁 源码与 MimicKit 对照

| 类型 | 说明 |
|------|------|
| 官方代码 | **无**——纯理论框架与 sim-to-real gap 上界证明 |
| 实践对照 | 验证「memory 对 DR 至关重要」时，可参考带历史观测的 Isaac Lab / MimicKit env 配置 |
| MimicKit | 无独立 DR 模块；DR 以环境随机化形式散布于各 `*_env.yaml`，本篇提供理论解释而非代码入口 |

---

## 📚 相关参考

- Domain Randomization 原始应用（RoboLearn, OpenAI 等）
- 后续工作：ADR (Automatic Domain Randomization)

---

## 🏷️ 标签

`#Sim-to-Real` `#Theory` `#DomainRandomization` `#PolicyGradient`
