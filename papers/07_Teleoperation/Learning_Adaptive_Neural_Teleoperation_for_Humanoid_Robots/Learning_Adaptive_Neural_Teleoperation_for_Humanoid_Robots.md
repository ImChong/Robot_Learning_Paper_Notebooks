---
layout: paper
paper_order: 6
title: "Learning Adaptive Neural Teleoperation for Humanoid Robots: From Inverse Kinematics to End-to-End Control"
zhname: "学习式神经遥操作：用 RL 端到端策略替换 IK+PD，让 VR 控制器直接驱动人形机器人"
category: "Teleoperation"
---

# Learning Adaptive Neural Teleoperation for Humanoid Robots: From Inverse Kinematics to End-to-End Control
**用 RL 训练的神经策略，把"VR 控制器 → IK → PD"这一传统三段式遥操作管线压成一个端到端网络，在 Unitree G1 上跟踪误差降 34%、轨迹平滑度提升 45%**

> 📅 阅读日期: 2026-05-30
>
> 🏷️ 板块: 07 Teleoperation · VR 遥操作 · 端到端 RL · 力扰动随机化
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2511.12390](https://arxiv.org/abs/2511.12390) |
| HTML | [arXiv HTML](https://arxiv.org/html/2511.12390v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2511.12390) |
| 期刊版本 | [Sustainability of Education, Socio-Economic Science Theory, 2025](https://interoncof.com/index.php/finland/article/view/16183) |
| **发布时间** | 2025-11-15 (arXiv) |
| 源码 | 截至当前未见公开发布（论文未给出 GitHub 链接） |
| 机构 | Georgia Institute of Technology（作者后续创立 Humanola）|
| 主要作者 | **Sanjar Atamuradov** |
| 发表时间 | 2025-11（arXiv preprint） |
| 平台 | **Unitree G1** 人形机器人（VR 控制器输入，50 Hz 控制环） |

---

## 🎯 一句话总结

> 这篇文章把"VR 遥操作 → IK 求解 → PD 关节控制"这条工业界最常用的三段式管线，全部塞进一个 **端到端的 RL 策略**：直接把 VR 控制器 6-DoF 位姿映射成机器人关节命令，训练时用 **IK-based 遥操作数据做 BC 预热**，再加上 **外力随机化、轨迹平滑奖励** 微调，最终在 Unitree G1 上得到 **跟踪误差 ↓34%、轨迹平滑度 ↑45%、50 Hz 实时**的遥操作策略。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| IK | Inverse Kinematics | 逆运动学求解 |
| PD | Proportional-Derivative | 比例-微分（关节控制器） |
| VR | Virtual Reality | 虚拟现实 |
| RL | Reinforcement Learning | 强化学习 |
| BC | Behavior Cloning | 行为克隆（用作 RL 预热） |
| DoF | Degrees of Freedom | 自由度 |
| EE | End-Effector | 末端执行器 |

---

## ❓ 论文要解决什么问题？

传统 VR 遥操作管线都是三段式的：
1. **VR 控制器**采集人手末端 6-DoF 位姿（位置 + 朝向）
2. **IK 求解器**把末端目标解算到关节空间
3. **PD 控制器**把关节目标转成扭矩驱动机器人

这种"模型驱动"管线有三个明显短板：
- **力扰动不友好**：IK 假设无负载/无碰撞，机器人碰到外力（被推、提物体、对环境施力）时关节命令仍按几何解走，控制器需要硬调 PD 增益才能"扛住"；
- **难以适配不同用户**：每个操作员的运动风格、手抖幅度都不一样，IK 一视同仁，没有学习偏好的能力；
- **运动不自然**：IK 解经常出现"末端到位但姿态怪异"，关节抖动、急速变化在远端看上去像机器人在抽搐。

作者的主张：**用一个端到端的神经策略代替整条管线**，让网络隐式地学到"在外力扰动下怎样输出更自然的关节命令"，并且通过 BC 预热保留 IK 系统的可用性。

---

## 🔧 方法详解

### 1. 端到端策略架构

策略是一个 MLP，输入观测：
- **VR 控制器目标**：左右手末端目标位姿 $T _ {EE}^{target} \in \mathrm{SE}(3) \times 2$
- **机器人本体状态**：当前关节角 $q$、关节速度 $\dot q$、根姿态/角速度
- **外力指示**（训练时可观）：随机化的外力向量（推理时通过历史隐式恢复）

输出动作：**关节目标位置 $q^{target}$**，传给底层位置控制接口（保留传统 PD 但增益较低，由策略主导命令质量）。

控制频率：**50 Hz**。

### 2. 两阶段训练

**阶段 1 · IK-BC 预热（imitation initialization）**
- 在仿真里用现成 IK + PD 跑一遍各种遥操作轨迹，收集 $(o_t, a_t = q^{IK}_t)$；
- 行为克隆出一个 "neural IK"——这一步保证策略一上来就比随机网络强得多，避免 RL 从零探索的崩溃。

**阶段 2 · RL 微调（PPO 风格 + 力扰动 + 平滑奖励）**
奖励函数主要包含：
- **跟踪项**：$- \| T _ {EE}^{cur} - T _ {EE}^{target} \|$，鼓励末端跟上 VR 目标
- **力适应项**：在仿真里**对腕/躯干随机施加外力**（force randomization），策略需要在被推/被拉时仍稳跟踪
- **平滑度项**：$- \| \dot q_t - \dot q _ {t-1} \|$ 或类似的二阶差分项，抑制 IK 常见的关节抖动
- **能耗 / 关节限位**等常规正则

外力随机化是核心：训练样本里随机注入 $0-N$ 的力扰动，迫使策略学到对负载/接触的隐式补偿。

### 3. 与传统 IK+PD 的关键差异

| 维度 | 传统 IK+PD | 本文 RL 策略 |
|---|---|---|
| 力扰动响应 | 显式调 PD 增益，硬扛 | 隐式学习补偿，软适应 |
| 用户个性化 | 全局固定 | 通过微调可适应不同操作员 |
| 运动自然度 | 易抖动、姿态怪 | 平滑度奖励直接优化 |
| 仿真到实机 | 容易迁移（无学习） | 需要 force randomization 保鲁棒性 |
| 算力 | 几毫秒数值 IK | 单次前向几百 μs |

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph INPUT["📥 操作员输入"]
        VR["🎮 VR 控制器<br/>左右手 6-DoF 目标"]
        PROP["🤖 本体状态<br/>q, q̇, 根姿态"]
    end

    subgraph TRAIN["🏋️ 两阶段训练 (仿真)"]
        IK["📐 IK + PD<br/>采集示范轨迹"]
        BC["🎓 阶段 1: 行为克隆<br/>BC 预热神经 IK"]
        RL["🚀 阶段 2: RL 微调<br/>(PPO 风格)"]
        RAND["💥 力扰动随机化<br/>(force randomization)"]
        SMOOTH["✨ 平滑度奖励<br/>(关节差分)"]
        TRK["🎯 跟踪奖励<br/>EE 误差"]
    end

    subgraph POLICY["🧠 端到端神经策略 (50 Hz)"]
        MLP["MLP πθ<br/>obs → q_target"]
    end

    subgraph DEPLOY["🦾 部署 (Unitree G1)"]
        LOWPD["🔧 低增益 PD<br/>跟踪 q_target"]
        ROBOT["🤖 G1 关节执行"]
    end

    IK --> BC
    BC --> RL
    RAND --> RL
    SMOOTH --> RL
    TRK --> RL
    RL --> MLP

    VR --> MLP
    PROP --> MLP
    MLP --> LOWPD --> ROBOT

    style INPUT fill:#e8f4fd,stroke:#1f78b4
    style TRAIN fill:#fff7e0,stroke:#d4a017
    style POLICY fill:#f3e8ff,stroke:#8e44ad
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **端到端替换 IK+PD**：把传统模型驱动的三段式遥操作压成一个 RL 策略，VR 输入直达关节命令。
2. **BC + RL 两阶段训练**：用 IK 自身产生的数据先做 BC 预热，再用 RL 精修——既保证起步可用，又规避稀疏奖励下的探索崩溃。
3. **力扰动随机化**：把"被推、提物、对环境施力"这些扰动写进训练分布，让策略**隐式学习负载补偿**，省去显式调 PD 增益。
4. **平滑度直接进奖励**：把"操作员看到的抖动"作为优化目标项，避免 IK 数值跳变。
5. **真机验证**：在 Unitree G1 上完成 pick-and-place、开门、双臂协调等任务，50 Hz 实时跑通。

---

## 📊 关键数据（论文摘要给出）

| 指标 | RL 策略 | IK+PD 基线 | 提升 |
|---|---|---|---|
| 末端跟踪误差 | — | — | **↓ 34%** |
| 轨迹平滑度 | — | — | **↑ 45%** |
| 外力适应性 | 强 | 弱 | 显著优于基线 |
| 控制频率 | 50 Hz | 50 Hz | 持平实时性 |
| 任务覆盖 | pick-and-place / 开门 / 双臂协调 | — | — |

> 论文为短文形式，未给出更细的消融数值；以上来自摘要。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **遥操作管线现代化** | 给出一个"学习化"的替代方案：以前依赖几何 + 调参的链路，现在可以让网络隐式学到 |
| **数据采集飞轮** | BC + RL 范式表明：**已有 IK 系统可以反过来给 RL 当老师**，工业界已有遥操作系统都能用这条路升级 |
| **与 SEW-Mimic / ExtremControl 互补** | SEW-Mimic 用闭式几何把 IK 做到极致；ExtremControl 砍掉重定向；本文则保留映射但让网络学会自适应——三条路线代表了"模型驱动 / 极简 / 学习驱动"三种不同选择 |
| **力鲁棒遥操作** | force randomization 思路也适合 loco-manipulation 任务的人在环（human-in-the-loop）数据采集 |

---

## 🎤 面试参考

**Q：为什么不直接用大规模 BC 而要再加 RL？**
A：BC 学到的是"IK 是怎么解的"，所以策略最多和 IK 一样好。RL 阶段引入了 IK 数据集里没有的分布——外力扰动、轨迹平滑奖励——让策略**超过教师**，在跟踪误差和平滑度上都比 IK 强。

**Q：force randomization 在仿真里是怎么加进去的？**
A：在 episode 内随机采样力的作用点（腕/躯干/末端）、方向、幅度和持续时间，作为外力注入物理引擎；策略观测里不直接给力（部署时拿不到），通过历史隐式恢复。这与 sim-to-real 中的 dynamics randomization 同源思想。

**Q：50 Hz 控制环对端到端 RL 够用吗？**
A：对**遥操作**够用：人类指令带宽不超过 ~10 Hz，50 Hz 命令配合底层 1 kHz PD 已经能实现平滑跟踪。对**高动态全身控制**则太低，会被 200 Hz / 1 kHz 跟踪类工作打败。

**Q：和 SEW-Mimic / ExtremControl 怎么取舍？**
A：场景驱动——
- **SEW-Mimic**：单只手臂任务、需要可证明的最优性、CPU 算力紧、要保肘部姿态意图 → 选闭式几何；
- **ExtremControl**：要求极低延迟、单纯反应任务、不想要重定向 → 选直接 SE(3) 命令；
- **本文 RL 策略**：要力适应、要学习用户偏好、有仿真训练资源、能接受 50 Hz 端到端 → 选端到端 RL。

---

## 🔗 相关阅读

- [Learning Adaptive Neural Teleoperation arXiv](https://arxiv.org/abs/2511.12390) · [HTML](https://arxiv.org/html/2511.12390v1) · [PDF](https://arxiv.org/pdf/2511.12390)
- 期刊版本：[Sustainability of Education, Socio-Economic Science Theory](https://interoncof.com/index.php/finland/article/view/16183)
- 同模块对照：
  - [CLOT](../CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation/CLOT__Closed-Loop_Global_Motion_Tracking_for_Whole-Body_Humanoid_Teleoperation.md)（闭环全局跟踪）
  - [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.md)（直接末端控制，砍掉重定向）
  - [SEW-Mimic](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.md)（闭式几何重定向）
  - [TeleGate](../TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior/TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior.md)（多专家门控）
- 相关方法线：force randomization 思想可对照 [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.md) 的 sim-real 物理对齐
