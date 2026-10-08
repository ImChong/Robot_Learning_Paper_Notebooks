---
layout: paper
paper_order: 12
title: "Handroid: Bridging Dexterous Hand and Humanoid"
zhname: "Handroid：贯通灵巧手与人形机器人的双形态可重构平台"
category: "硬件设计"
arxiv: "2607.16187"
---

# Handroid: Bridging Dexterous Hand and Humanoid

**Handroid：贯通灵巧手与人形机器人的双形态可重构平台**

> 📅 阅读日期: 2026-08-19
>
> 🏷️ 板块: 12 Hardware Design · 可重构形态 · 灵巧手 ↔ 人形 · 跨形态学习
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2607.16187](https://arxiv.org/abs/2607.16187) |
| HTML | [在线阅读](https://arxiv.org/html/2607.16187v1) |
| PDF | [下载](https://arxiv.org/pdf/2607.16187) |
| 项目主页 | [handroid.org](https://handroid.org) |
| 源码 | [github.com/ruoguliii/handroid](https://github.com/ruoguliii/handroid)（MIT，代码/文档标注 "Coming Soon"，尚未完整释出） |
| CAD | [OnShape 装配体](https://cad.onshape.com/documents/d3de21915f3c9cacc1887cf3) |
| BOM | [物料清单（Google Sheet）](https://docs.google.com/spreadsheets/d/1ml2pJ9iSiDhcNiEPnRkoHqwzarEjfeZ8KSDNHGFpFh4/edit) |
| **发布时间** | 2026-07-17 (arXiv v1) |

**作者**：Ruogu Li, Chenyang Ma, Sikai Li, Zhenyu Wei, Yunchao Yao, Haochen Shi, C. Karen Liu, Shuran Song, Mingyu Ding

---

## 🎯 一句话总结

灵巧手擅长「小工作空间内的精细接触操作」，人形擅长「大范围移动与全身交互」，两者通常是两套独立硬件。Handroid 追问：**形态能不能在不同实体之间复用，而不是被绑死在某一台机器人上？** 答案是把人体与人手都抽象成「从紧凑中心结构分叉出的多条关节链」（躯干→四肢 ≈ 手掌→手指），于是**同一批关节模块**可以在「灵巧手」和「桌面人形」两种形态间**物理重装**，并共享同一套传感、仿真与部署接口。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DoF | Degree of Freedom | 自由度 |
| DP | Diffusion Policy | 扩散策略（模仿学习） |
| PPO | Proximal Policy Optimization | 近端策略优化（强化学习） |
| ZMP | Zero Moment Point | 零力矩点，双足步态规划常用判据 |
| IK | Inverse Kinematics | 逆运动学 |
| CoM | Center of Mass | 质心 |
| DR | Domain Randomization | 域随机化（sim-to-real 常用手段） |

---

## ❓ 论文要解决什么问题？

- **硬件割裂**：研究灵巧操作要买/造一只手，研究行走又要另造一台人形，形态与研究对象一一绑定、成本高、难复现。
- **形态复用的可能性**：作者注意到人手与人体在拓扑上高度相似——都是「中心结构 + 多条分叉关节链」。既然如此，**同一套关节模块为何不能既当手指、又当四肢？**
- **目标**：做一台**桌面尺度、可重构、可复现、全开源**的机器人，让「手内操作」和「人形运动」在同一硬件、同一套软件栈上研究，服务于形态复用与跨形态机器人学习。

---

## 🔧 方法拆解

### 1. 模块化硬件与形态重构
- **总计 27 个驱动自由度**，整机 **0.33 m 高 / 2.05 kg**。
- **灵巧手形态**：20-DoF 拟人手，五指各 **1 外展/内收 + 3 屈伸**。
- **人形形态**：25-DoF 全身——4-DoF 头 + 两条 4-DoF 手臂 + 两条 6-DoF 腿（下肢共 **12-DoF**）+ 1-DoF 髋。
- **重构机制**：关节 9 与 26 两个**齿条-齿轮（rack-and-pinion）棱柱副**实现两种形态之间的切换。
- **电气集成**：40×80 mm 自研主板，**ESP32-S3** 经 TTL 总线驱动 Dynamixel（XC330-T288-T / XM430-W210-T / 2XC430-W250-T 三型）；主板与指尖/足端布置 IMU 做本体感知；140W PD 供电、电池温控；**电磁法兰**（~180N 吸持力）用于与外部机械臂（如 Franka）快速对接/脱离。

### 2. 灵巧手控制栈
- **遥操作**：Apple Vision Pro 手部追踪 + **AnyTeleop** 重定向，>20Hz 把操作者手映射到机器人手。
- **抓取**：**Diffusion Policy**（PointNet++ 编码物体点云 + 本体感知历史，8 帧动作块）。
- **手内操作**：**PPO**（IsaacLab）学方块重定向，配域随机化做 sim-to-real。

### 3. 人形控制栈
- **RL 跟踪控制**：ZMP 步态规划器出参考轨迹，Mink 求 IK，闭环策略在 MuJoCo 中跟踪（关节位置误差 ~0.12 rad）。
- **RL 速度控制**：无参考、以指令 CoM 速度/偏航率为条件的策略；非对称 actor-critic，critic 吃特权观测。
- **关键帧运动**：基于 **Viser** 的关节空间关键帧编辑器 + 时序插值，既可直接上真机，也可作为 RL 的参考。

### 4. Sim-to-Real
- 统一 **MuJoCo** 仿真环境；对接触摩擦、驱动参数、物体属性做域随机化，把操作与运动策略迁移到真机。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    CORE["🧩 紧凑中心结构 + 分叉关节链<br/>27-DoF 模块化 · 0.33m / 2.05kg"]

    subgraph RECON["🔀 形态重构（齿条-齿轮棱柱副 J9/J26）"]
        HAND["🖐️ 灵巧手形态<br/>20-DoF · 五指(1外展+3屈伸)"]
        HUM["🧍 桌面人形形态<br/>25-DoF · 头4+臂4×2+腿6×2(下肢12)+髋1"]
    end

    subgraph STACK["🧠 统一控制 / 学习栈（共享传感·仿真·部署）"]
        TELE["遥操作<br/>VisionPro + AnyTeleop >20Hz"]
        GRASP["抓取<br/>Diffusion Policy + PointNet++"]
        INHAND["手内操作<br/>PPO@IsaacLab + DR"]
        LOCO["运动控制<br/>ZMP+Mink IK / 速度RL / 关键帧(Viser)"]
    end

    SIM["🌀 统一 MuJoCo 仿真 + 域随机化"]
    REAL["🤖 真机部署<br/>手内操作 · 行走转身深蹲 · 长程 loco-manipulation"]

    CORE --> HAND
    CORE --> HUM
    HAND --> TELE
    HAND --> GRASP
    HAND --> INHAND
    HUM --> LOCO
    TELE --> SIM
    GRASP --> SIM
    INHAND --> SIM
    LOCO --> SIM
    SIM --> REAL

    style RECON fill:#fff7e0,stroke:#d4a017
    style STACK fill:#eafaf1,stroke:#27ae60
    style REAL fill:#eef6ff,stroke:#2e86de
</div>

---

## ⏱️ 系统运行时序图（基于论文描述的控制/学习栈）

> ⚠️ 官方代码仓库当前标注 "Coming Soon"，尚未完整释出；下图依据论文正文描述的运行时序绘制，待源码公开后可据实更新为文件级时序。

<div class="mermaid">
sequenceDiagram
    participant OP as 操作者/指令
    participant TP as 遥操作重定向<br/>(AnyTeleop)
    participant PL as 策略层<br/>(DP / PPO / 速度RL / 关键帧)
    participant SIM as MuJoCo 仿真<br/>(+ 域随机化)
    participant MB as 主板 ESP32-S3
    participant ACT as Dynamixel 关节模块
    participant SEN as 传感<br/>(IMU / 点云 / 本体感知)

    Note over PL,SIM: 训练阶段（离线）
    OP->>TP: VisionPro 手部姿态
    TP->>PL: 采集示范 (>20Hz)
    PL->>SIM: PPO/DP 在仿真中训练 + DR
    SIM-->>PL: 奖励 / 回放

    Note over MB,ACT: 部署阶段（在线闭环）
    PL->>MB: 目标关节指令
    MB->>ACT: TTL 总线下发
    ACT-->>SEN: 关节状态
    SEN-->>PL: IMU / 点云 / 本体观测
    PL->>PL: 闭环推理下一步动作
    Note over OP,ACT: 长程任务：形态切换→脱离Franka→避障→推箱→重对接→灵巧取放
</div>

---

## 💡 核心贡献

1. **可重构双形态硬件平台**：27-DoF 桌面机器人，靠共享机电模块在「20-DoF 灵巧手」与「25-DoF 桌面人形」间物理重装，全开源（含 CAD/BOM）。
2. **统一控制与学习栈**：一套共享的传感、仿真、部署接口，同时支撑遥操作、模仿学习、强化学习、步态生成与交互式关键帧编辑，覆盖两种形态。
3. **跨形态实证**：真机验证灵巧操作、RL 运动、关键帧运动，以及「形态重构 + 移动 + 操作」串联的长程任务，成为研究形态复用与 loco-manipulation 的紧凑可复现平台。

---

## 📊 关键指标

| 维度 | 数值 |
|---|---|
| 总自由度 / 尺寸 / 重量 | 27-DoF / 0.33 m / 2.05 kg |
| 手形态 / 人形形态 | 20-DoF（五指）/ 25-DoF（下肢 12-DoF） |
| 遥操作抓取成功率 | 10 物体平均 **72%**（共 100 次示范） |
| 仿真跟踪误差 | 身体位置 **0.0019 m** |
| 仿真速度跟踪误差 | 指令 0.20 m/s 时 **0.052 m/s** |
| 电磁法兰吸持力 | ~180 N |

> ⚠️ 上表数值取自 arXiv v1，具体以正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **形态复用** | 关节模块跨「手指/四肢」复用，降低造多台专用平台的成本，利于低成本复现 |
| **手—身一体研究** | 同一硬件同一软件栈研究「手内操作」与「全身运动」，方便探索 loco-manipulation |
| **桌面可复现** | 桌面尺度 + 全开源 CAD/BOM，实验室易搭建，适合教学与算法快速迭代 |

---

## 🔗 相关阅读

- [DexLink Hand (arXiv 2606.17418)](https://arxiv.org/abs/2606.17418)：连杆驱动、紧凑廉价的 16-DOF 拟人灵巧手（本模块）
- [MCR-Bionic Hand (arXiv 2606.13601)](https://arxiv.org/abs/2606.13601)：把灵巧从控制搬进解剖结构先验的仿生手（本模块）
- [DecARt Leg (arXiv 2511.10021)](https://arxiv.org/abs/2511.10021)：解耦驱动的敏捷人形腿（本模块）
- [MuJoCo Playground (arXiv 2502.08844)](https://arxiv.org/abs/2502.08844)：Handroid 训练所依赖的 GPU 并行仿真栈（同源思路）
