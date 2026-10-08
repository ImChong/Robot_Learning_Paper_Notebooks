---
layout: paper
paper_order: 12
title: "CLONE: Closed-Loop Whole-Body Humanoid Teleoperation for Long-Horizon Tasks"
zhname: "CLONE：面向长时序任务的闭环全身人形遥操作"
category: "Teleoperation"
---

# CLONE: Closed-Loop Whole-Body Humanoid Teleoperation for Long-Horizon Tasks
**CLONE：面向长时序任务的闭环全身人形遥操作**

> 📅 阅读日期: 2026-07-02
>
> 🏷️ 板块: Teleoperation · 全身控制 · MoE · 闭环校正
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2506.08931](https://arxiv.org/abs/2506.08931) |
| HTML | [在线阅读](https://arxiv.org/html/2506.08931v1) |
| PDF | [下载](https://arxiv.org/pdf/2506.08931) |
| **发布时间** | 2025-06-10 (arXiv) |
| 项目主页 | [humanoid-clone.github.io](https://humanoid-clone.github.io/) |
| 源码 | [humanoid-clone/CLONE](https://github.com/humanoid-clone/CLONE) |

**机构**：北京通用人工智能研究院（BIGAI）· 北京大学 · 北京理工大学

**作者**：Yixuan Li, Yutang Lin, Jieming Cui, Tengyu Liu, Wei Liang, Yixin Zhu, Siyuan Huang

**机器人**：Unitree G1 · 输入仅为 MR 头显（Apple Vision Pro / VisionProTeleop）的头部 + 双手位姿

---

## 🎯 一句话总结

CLONE 抓住当前人形遥操作的两个通病——**上下半身解耦**（为了稳但牺牲了自然协调）和**开环无位置反馈**（累积漂移，走远就飘）——提出一个 **MoE（专家混合）全身策略 + LiDAR 闭环误差校正** 的系统：操作者只戴一个 MR 头显、只提供**头和两只手三个点**的追踪信号，机器人就能做出协调的全身动作，并在长距离、长时序轨迹上把**全局位置漂移压到极低**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| MoE | Mixture-of-Experts | 专家混合，用门控网络组合多个子策略 |
| MR | Mixed Reality | 混合现实头显（这里作动捕输入） |
| WBC | Whole-Body Control | 全身控制 |
| IK | Inverse Kinematics | 逆运动学（从三点还原全身姿态） |
| LiDAR Odometry | - | 激光雷达里程计，估计机器人全局位姿 |

---

## ❓ 论文要解决什么问题？

人形遥操作是采集"人-场景交互"数据、演示复杂任务的关键手段，但现有系统有两条硬伤：

1. **上下半身解耦**：为了不摔倒，很多系统把上肢跟踪和下肢平衡分开控制，导致全身动作不协调、无法做需要腰腿配合的动作。
2. **开环、无实时位置反馈**：策略只跟踪局部姿态，不闭合机器人**全局位置**，误差随时间累积，机器人在长距离行走后会明显"飘走"。

核心挑战因此归结为一句话：**如何在长时间尺度上，既保持全身协调，又保持精确的全局定位。**

CLONE 的答案：用 **MoE 把多种全身运动技能协调成一个策略**（解决协调），再用 **LiDAR 里程计做闭环误差校正**（解决漂移），且输入极简——只需 MR 头显的三点信号。

---

## 🔧 方法拆解

### 1. 极简输入 → 全身参考
- 操作者只戴 MR 头显，系统读取**头 + 左右手**三个 6D 位姿。
- 通过 IK / 重定向把这三点扩展成机器人可执行的**全身参考姿态**，无需全身动捕套装。

### 2. MoE 全身策略（解决"协调"）
- 用**专家混合**结构学习并组合多种运动技能（行走、转身、蹲伸、上肢操作等）。
- 门控网络按当前状态与目标动态加权各专家，产出**统一的全身动作**，避免上下半身割裂。

### 3. 闭环误差校正（解决"漂移"）
- 机器人携带 LiDAR，用 **LiDAR 里程计（FAST-LIO 类）** 实时估计**全局位姿**。
- 把"当前全局位姿 vs 期望轨迹"的误差**闭环反馈**进策略，持续纠偏，使长距离轨迹漂移最小化。

### 4. 训练与部署
- 仿真中大规模 RL 训练 MoE 策略，再 sim-to-real 迁移到 **Unitree G1**。
- 部署时 MR 头显做输入、LiDAR 做全局定位，形成完整的"感知—策略—执行—校正"闭环。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph OP["🧑 操作者侧 (MR 头显)"]
        HEAD["🥽 头部位姿"]
        HANDS["✋ 双手位姿"]
        IK["🔧 IK / 重定向<br/>三点 → 全身参考"]
    end

    subgraph POLICY["🧠 CLONE MoE 策略"]
        GATE["🚦 门控网络"]
        E1["专家1: 行走"]
        E2["专家2: 上肢操作"]
        E3["专家3: 蹲伸/转身"]
        ACT["🎯 全身动作 (PD 目标)"]
    end

    subgraph ROBOT["🤖 Unitree G1"]
        PD["🦾 全身 PD 执行"]
        PROP["📡 本体感知"]
    end

    subgraph LOOP["🔁 LiDAR 闭环校正"]
        LIDAR["📡 LiDAR 里程计"]
        GPOSE["📍 全局位姿估计"]
        ERR["📏 全局误差 → 反馈"]
    end

    HEAD --> IK
    HANDS --> IK
    IK --> GATE
    GATE --> E1 & E2 & E3
    E1 & E2 & E3 --> ACT
    PROP --> GATE
    ERR --> GATE
    ACT --> PD
    PD --> PROP
    PD --> LIDAR
    LIDAR --> GPOSE
    GPOSE --> ERR

    style OP fill:#fff7e0,stroke:#d4a017
    style POLICY fill:#f3e8ff,stroke:#8e44ad
    style ROBOT fill:#e8f8e8,stroke:#27ae60
    style LOOP fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **闭环全身遥操作系统**：首次把 MoE 全身协调与 LiDAR 全局位姿闭环校正结合，同时解决"协调"与"漂移"两大痛点。
2. **极简输入**：仅用 MR 头显的头 + 双手三点信号驱动全身，硬件门槛低、佩戴轻便。
3. **长时序高保真**：在长距离轨迹上维持极低的位置漂移，把遥操作从"短演示"推向"长时序任务执行"。
4. **真机验证 + 开源**：在 Unitree G1 上完成 sim-to-real 部署，代码与项目主页公开。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 全局漂移 | 闭环 LiDAR 校正下，长距离轨迹位置漂移显著低于开环基线 |
| 全身协调 | MoE 相比解耦控制能做出更自然、需要腰腿配合的全身动作 |
| 输入成本 | 仅三点（头 + 双手）即可驱动全身，无需全身动捕 |
| Sim-to-Real | Unitree G1 真机部署可用 |

> ⚠️ 上表为结构性总结，具体数值请以论文正式版与仓库 README 为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **闭环全局观测范式** | 把"全局位姿 + 里程计校正"作为遥操作标配，而非可选项 |
| **MoE 做全身协调** | 用专家混合统一多技能，缓解上下半身解耦带来的僵硬 |
| **低门槛数据采集** | 三点输入 + 消费级 MR 头显，利于规模化收集人-场景交互数据 |

---

## 🎤 面试参考

**Q：CLONE 与 CLOT 都强调"闭环"，区别在哪？**
A：两者都针对"全局漂移"。CLOT 侧重在底层运动跟踪里闭环全局位姿、并用解耦随机化稳住训练；CLONE 更偏**系统层**——用 MoE 做全身技能协调，用 LiDAR 里程计做全局闭环校正，且强调**极简三点输入**和长时序任务执行。

**Q：为什么上下半身解耦不好，MoE 怎么解决？**
A：解耦控制虽稳，但无法做需要全身配合的动作（如弯腰取物同时保持平衡）。MoE 用门控网络在同一策略里动态组合行走、上肢操作、蹲伸等专家，输出统一的全身动作，从而恢复协调性。

**Q：为什么要用 LiDAR 而不是仅靠本体感知闭环？**
A：本体感知只能估计相对/局部状态，长距离会累积漂移；LiDAR 里程计提供**绝对全局位姿**，把全局误差反馈进策略才能真正抑制"越走越飘"。

---

## 🔗 相关阅读

- [CLOT (2602.15060)](https://arxiv.org/abs/2602.15060)：底层运动跟踪层的全局位姿闭环
- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858)：H2H 通用全身遥操作
- [H2O (2403.04436)](https://arxiv.org/abs/2403.04436)：Human-to-Humanoid 实时全身遥操作开山
- [HumanPlus (2406.10454)](https://arxiv.org/abs/2406.10454)：影子跟随（shadowing）路线
- [Open-TeleVision (2407.01512)](https://arxiv.org/abs/2407.01512)：沉浸式主动视觉反馈遥操作
