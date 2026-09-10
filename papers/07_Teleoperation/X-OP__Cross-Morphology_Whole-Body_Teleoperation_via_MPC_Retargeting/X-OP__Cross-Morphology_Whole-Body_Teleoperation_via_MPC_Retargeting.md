---
layout: paper
title: "X-OP: Cross-Morphology Whole-Body Teleoperation via MPC Retargeting"
zhname: "X-OP：用 MPC 重定向做跨形态全身遥操作"
category: "Teleoperation"
arxiv: "2606.07934"
---

# X-OP: Cross-Morphology Whole-Body Teleoperation via MPC Retargeting
**单台 Apple Vision Pro 就能遥操作人形或轮式移动操作臂：中间加一层「基于 MPC 的重定向器」，把操作者意图和机器人动力学可行性一起优化，换形态无需重训底层策略**

> 📅 阅读日期: 2026-09-10
>
> 🏷️ 板块: 07 Teleoperation · 跨形态遥操作 · MPC 重定向 · 状态同步 · SLAM 反馈
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2606.07934](https://arxiv.org/abs/2606.07934) |
| HTML | [arXiv HTML](https://arxiv.org/html/2606.07934v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2606.07934) |
| 源码 | 截至当前未见公开发布（论文与项目页均未给出 GitHub 链接） |
| **发布时间** | 2026-06-06（arXiv v1） |
| 作者 | Jen-Wei Wang · Sarthak Kaingade · Andrea Tagliabue · Nicholas Morozovsky |
| 平台 | Unitree G1 人形（29 DoF）+ Rainbow RB-Y1 轮式移动操作臂（22 DoF）+ Apple Vision Pro |

---

## 🎯 一句话总结

> 遥操作要「一套系统控多种机器人」，直接把操作者姿态映射到关节上有两个老问题：**不同形态映射规则不通用**、**照搬人的动作常常违反机器人的平衡/接触/避障约束**。X-OP 在「操作者输入」与「机器人底层控制器」之间插入一层**基于采样式 MPC（KMPPI）的重定向器**：它把 Apple Vision Pro 给出的头 + 双腕位姿当作时变目标，在一个带**目标跟踪 / 接触稳定 / 避障 / 控制能量**四项代价的优化里，输出底层策略（人形用 FALCON、轮式用比例控制）能直接吃的**高层指令**——从而**既贴合操作者意图，又满足机器人动力学可行性**。配套的**状态同步**把 MuJoCo 仿真状态与带噪的真机测量对齐，**LiDAR-惯性 SLAM** 抑制长时漂移。换机器人形态只需换底层策略与少量代价配置，**无需重训**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| XR | Extended Reality | 扩展现实，此处即 Apple Vision Pro 头显 |
| MPC | Model Predictive Control | 模型预测控制，滚动时域优化 |
| MPPI | Model Predictive Path Integral | 采样式 MPC，用路径积分权重加权候选轨迹 |
| KMPPI | Kernel MPPI | 带核平滑的 MPPI，产生时序相关、更平滑的动作序列 |
| DoF | Degrees of Freedom | 自由度 |
| IK | Inverse Kinematics | 逆运动学（此处用于双臂末端跟随） |
| SQP | Sequential Quadratic Programming | 序列二次规划，解状态同步的非线性最小二乘 |
| SLAM | Simultaneous Localization and Mapping | 同步定位与建图 |
| FALCON | 人形底层 RL 全身控制策略 | X-OP 在人形上使用的低层控制器 |

---

## ❓ 论文要解决什么问题？

想用**一台消费级 XR 头显**去遥操作**不止一种**机器人（既有腿式人形，又有轮式移动操作臂），传统「直接映射」有两大痛点：

1. **跨形态不通用**：人形靠腿走、轮式靠轮子挪，关节结构与运动模式完全不同，把人的姿态硬映射到关节上，每换一种形态就得重写一套规则、甚至重训底层策略。
2. **忽视动力学可行性**：操作者的动作不知道机器人的平衡、接触、避障限制。照抄容易让人形失衡、让移动底盘撞到障碍。

X-OP 的目标：**在操作者与底层控制器之间加一层「会算物理」的重定向器**，让同一套遥操作框架**即插即用地**驱动不同形态，并在贴合操作者意图的同时**主动照顾机器人的动力学约束**。

---

## 🔧 方法详解

### 分层框架（三层）

- **顶层 · 遥操作输入**：Apple Vision Pro 通过视觉-惯性 SLAM 输出**头部位姿 `T_head`**、**左腕位姿 `T_lw`**、**右腕位姿 `T_rw`**，构成时变目标 `G(t)`（表达操作者意图）。
- **中层 · MPC 重定向器（核心）**：把操作者动作翻译成**高层指令**喂给已有的底层控制器；用 **KMPPI**（带核平滑的采样式 MPC），产生时序相关、平滑的动作序列。
- **底层 · 低层控制**：现成策略/控制器把高层指令转成关节力矩——**人形用 FALCON RL 策略**，**轮式移动操作臂用差速比例控制**；双臂末端由 IK 跟随。

### MPC 重定向：优化什么

在时域 `H` 上最小化四项代价（式 1）：

1. **目标跟踪代价**：惩罚基座位置 `p` / 朝向 `θ` 相对操作者目标的偏差；
2. **接触点代价**：站立相时惩罚活动接触点的非零速度 → 鼓励稳定（脚不打滑）；
3. **避障代价**：用指数势垒函数（proximity + 速度相关项）对障碍产生排斥；
4. **控制能量代价**：惩罚高层动作幅值的平方 → 更省力、更平滑。

**约束**：高层动作要落在可行集 `𝒜`（`a_min ~ a_max`）内；动作经底层策略 `π` 与仿真动力学 `g` 联系起来（保证「算出来的指令底层真的能执行」）。这样一次优化**同时**对齐操作者意图与机器人动力学可行性。

### 状态同步（State Synchronization）

每个 MPC 步都要拿 MuJoCo 仿真状态去对齐**带噪的真机测量**，否则滚动预测会越算越偏。X-OP 把它写成对 `(p, θ, q)` 的**非线性最小二乘**（式 2），并加**软接触约束**：人形要求双脚落在已知站立点、脚掌贴地；轮式要求车轮以正确半径触地、轮轴水平。因为「测量对齐 + 接触约束」常常无法同时严格满足，故用**软约束**，由 **SQP（DAQP 求解器）** 求解，鲁棒应对噪声与接触敏感。

### SLAM 反馈

真机实验里用 **LiDAR-惯性 SLAM** 估计机器人全局位姿 `(p, θ, v)`，提供**绝对位置参考**而非靠速度积分——**抑制长时遥操作的漂移**；IMU 给角速度 `ω`，电机编码器给关节状态 `(q, q̇)`。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OP["🧑 操作员侧 · Apple Vision Pro"]
        HEAD["👀 头部位姿 T_head"]
        LW["🤚 左腕位姿 T_lw"]
        RW["✋ 右腕位姿 T_rw"]
    end

    subgraph MID["🗺️ MPC 重定向器（KMPPI）"]
        COST["🎯 四项代价<br/>目标跟踪 + 接触稳定<br/>+ 避障 + 控制能量"]
        SYNC["🔄 状态同步<br/>SQP 对齐仿真↔真机<br/>+ 软接触约束"]
    end

    subgraph LOW["🤖 底层控制（换形态即换策略）"]
        FAL["🦿 人形: FALCON RL"]
        DIFF["🛞 轮式: 差速比例控制"]
        IK["💪 双臂 IK"]
    end

    ROBOT["🦾 机器人执行<br/>Unitree G1 / RB-Y1"]
    SLAM["📡 LiDAR-惯性 SLAM<br/>全局位姿 · 抑漂移"]

    HEAD & LW & RW --> COST
    COST --> SYNC
    SYNC --> FAL & DIFF & IK --> ROBOT
    ROBOT -->|q, q̇, IMU| SYNC
    ROBOT --> SLAM -->|p, θ, v| SYNC

    style OP fill:#e8f4fd,stroke:#1f78b4
    style MID fill:#fff7e0,stroke:#d4a017
    style LOW fill:#f3e8ff,stroke:#8e44ad
    style ROBOT fill:#e8f8e8,stroke:#27ae60
    style SLAM fill:#fde8e8,stroke:#c0392b
</div>

> 📝 源码运行时序图：论文与项目页截至当前**未公开代码仓库**，暂不提供源码调用时序；待官方释出后可补充。

---

## 💡 核心贡献

1. **跨形态、免重训的分层遥操作**：在操作者与底层控制器之间加一层通用的 MPC 重定向器，**换机器人形态只需换底层策略 + 少量代价配置**，无需为每种形态重训模型。
2. **意图与可行性联合优化**：把目标跟踪、接触稳定、避障、控制能量四项代价放进同一优化，让重定向结果**既像操作者、又符合机器人物理约束**。
3. **状态同步机制**：用带软接触约束的非线性最小二乘（SQP/DAQP）把仿真状态对齐真机测量，鲁棒应对噪声与接触敏感。
4. **SLAM 抑漂移**：LiDAR-惯性 SLAM 提供绝对位姿参考，支撑长时遥操作。
5. **可调「激进↔保守」**：实时调控制能量权重（0.02→0.5），在非抓握搬运任务上把「带直立约束」的成功率从 1/10 提到 **10/10**。

---

## 📊 关键数据

| 任务 / 平台 | 仿真 | 真机 |
|---|---|---|
| 人形双点触碰（G1） | 10/10 成功，26.58±6.60s，0.14±0.06W | **10/10**（基线 6/10） |
| 人形取放盒子（G1） | 10/10 成功，30.75±7.99s | **9/10**（基线 5/10） |
| 轮式双点触碰（RB-Y1） | 10/10 成功、**0/10 碰撞**（基线 4/10 碰撞） | 10/10、零碰撞 |
| 轮式取放盒子（RB-Y1） | 抓取 10/10、放置 10/10、零碰撞 | 抓取 10/10、放置 7/10、零碰撞 |
| 对比基线 | 触碰任务较直接映射**完成时间 −30%、功耗 −20%** | — |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **一套系统控多形态** | 中间加「会算物理」的重定向层，把「换机器人就重写映射/重训」变成「换底层策略即可」，降低跨平台数据采集成本 |
| **意图×可行性解耦** | 操作者只管表达意图，动力学可行性交给 MPC——降低对操作者「懂机器人极限」的要求 |
| **仿真状态同步范式** | 「每步用真机测量重置仿真 + 软接触约束」是采样式 MPC 上真机的通用工程点，可迁移到别的 MPC 控制/遥操作 |
| **消费级 XR 采数** | 单台 Apple Vision Pro 即可，无需外骨骼/多相机，利于规模化演示采集 |

---

## 🎤 面试参考

**Q：X-OP 和「把 VR 姿态直接映射到关节」的直接映射基线差在哪？**
A：直接映射不懂机器人的平衡/接触/避障约束，照抄人的动作容易失衡或撞障碍，且每换形态要重写规则。X-OP 在中间插一层基于 KMPPI 的 MPC 重定向器，把「贴合操作者意图」和「满足机器人动力学可行性」放进同一优化输出高层指令，实测触碰任务完成时间降约 30%、功耗降约 20%，真机成功率也更高。

**Q：为什么需要「状态同步」，它怎么做？**
A：采样式 MPC 每步都要在仿真里 rollout 候选动作，如果仿真状态和真机不一致，预测会越滚越偏。X-OP 每个 MPC 步都把 `(p,θ,q)` 用非线性最小二乘对齐真机测量，并加软接触约束（人形脚贴地、轮式轮触地），用 SQP/DAQP 求解——测量与接触难以同时严格满足，故取软约束。

**Q：KMPPI 相比普通 MPPI 的好处？**
A：MPPI 是采样式 MPC，逐步独立采样容易产生抖动动作。KMPPI 用核平滑让动作序列时序相关、更平滑，遥操作时机器人动作更连续、更省力（也对应「控制能量代价」）。

**Q：怎么做到「跨形态免重训」？**
A：重定向器只产出**高层指令**（人形是高度/朝向/线速度/角速度等 7 维，轮式是线/角速度 + 躯干关节等 8~13 维），底层控制器（人形 FALCON、轮式差速比例控制）保持不变即可执行。换形态时换底层策略、调一下代价配置和接触约束，不必重训重定向器本身。

---

## 🔗 相关阅读

- 同模块对照：[Teleopit](../Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System/Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System.md)（一副 VR 头显统管身-手-头的全体感遥操作） · [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.md)（低延迟末端 SE(3) 控制） · [Whole-Body Bilateral Teleoperation](../Whole-Body_Bilateral_Teleoperation_with_Multi-Stage_Object_Parameter_Estimation/Whole-Body_Bilateral_Teleoperation_with_Multi-Stage_Object_Parameter_Estimation.md)（轮式人形双边遥操作）
- 跨模块对照：[HugWBC](../../03_High_Impact_Selection/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.md)（统一全身控制底层策略可作被驱动对象）
