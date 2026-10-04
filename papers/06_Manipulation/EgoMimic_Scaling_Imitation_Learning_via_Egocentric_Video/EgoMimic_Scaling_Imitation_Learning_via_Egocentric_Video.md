---
layout: paper
paper_order: 1
title: "EgoMimic: Scaling Imitation Learning via Egocentric Video"
category: "操作任务"
zhname: "EgoMimic：通过第一视角视频扩展模仿学习"
---

# EgoMimic: Scaling Imitation Learning via Egocentric Video
**EgoMimic：通过第一视角视频扩展模仿学习**

> 📅 阅读日期: 2026-06-07
>
> 🏷️ 板块: 06 Manipulation · 第一视角人类视频 · 跨具身模仿学习
>
> 🧭 状态: 深度技术细节已填充（基于 arXiv:2410.24221 + 开源仓库）

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2410.24221](https://arxiv.org/abs/2410.24221) |
| **HTML** | [arxiv.org/html/2410.24221v1](https://arxiv.org/html/2410.24221v1) |
| **PDF** | [Download](https://arxiv.org/pdf/2410.24221) |
| **项目主页** | [egomimic.github.io](https://egomimic.github.io) |
| **源码（训练/数据处理）** | [SimarKareer/EgoMimic](https://github.com/SimarKareer/EgoMimic) |
| **源码（硬件/Eve 机器人）** | [SimarKareer/EgoMimic-Eve](https://github.com/SimarKareer/EgoMimic-Eve) |
| **作者** | Simar Kareer, Dhruv Patel, Ryan Punamiya, Pranay Mathur, Shuo Cheng, Chen Wang, Judy Hoffman, Danfei Xu |
| **机构** | Georgia Institute of Technology · Stanford University |
| **发布时间** | 2024-10 (arXiv) |
| **机器人平台** | **Eve** — 双臂 ViperX 300S（6-DoF × 2）+ WidowX leader 遥操作 + Aria 头戴主视角 |

---

## 🎯 一句话总结

EgoMimic 把人类第一视角视频当作与机器人遥操作数据**同等地位**的具身示教源：用 Project Aria 眼镜被动采集 egocentric RGB + 3D 手部轨迹 + SLAM，配合仿人低成本双臂机器人 **Eve** 与三套跨域对齐（坐标系 / 动作分布 / 视觉外观），在 ACT 骨干上 co-train 统一策略——人类数据 1 小时带来的增益显著超过机器人数据 1 小时，并在仅见于人类视频的新物体/新场景中实现泛化。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **ACT** | Action Chunking with Transformers | 本文策略骨干；预测未来 action chunk |
| **MPS** | Machine Perception Service | Aria 官方感知管线：SLAM + 手部 3D 追踪 |
| **SLAM** | Simultaneous Localization and Mapping | 同时定位与建图；用于追踪眼镜位姿 |
| **Aria** | Project Aria (Meta) | Meta 可穿戴多模态传感眼镜（75g） |
| **SAM** | Segment Anything Model | 用于 mask 人手/机械臂，消除外观差异 |
| **Co-training** | — | 人类数据与机器人数据在同一网络中联合训练 |
| **EEF** | End-Effector | 末端执行器位姿空间 |

---

## ❓ 论文要解决什么问题？

模仿学习（IL）在复杂操作上表现亮眼，但泛化仍脆弱；CV/NLP 靠互联网规模数据起飞，机器人却缺少等价数据源。

现有扩数据路线各有瓶颈：

1. **机器人遥操作**（ALOHA / GELLO / SpaceMouse / VR）：需要专用硬件 + 主动示教，成本高、规模难扩；
2. **从人类视频学习**（MimicPlay 等）：通常只从视频提取**高层意图/规划**，低层策略仍只靠机器人数据训练，人类数据无法直接拉升执行性能；
3. **具身 gap**：人类手部（egocentric、移动相机、高 DoF）与机器人执行器（关节空间、固定基座）在运动学、分布、视觉上差异巨大。

EgoMimic 的核心主张：**不要把人类视频当辅助信号，而是当作另一种具身 embodiment 的示教数据**，与人类/机器人数据在同一端到端策略里平等 co-train。

---

## 🔧 方法详解

### 1. 人类数据采集：Project Aria 眼镜

- **设备**：Meta Project Aria，眼镜形态仅 **75g**，可长时间佩戴，支持**被动式**数据采集（无需机器人、无需刻意示教意图）；
- **传感器**：
  - 前置 **wide-FoV RGB** → 策略主视觉输入；
  - 两侧 **mono scene cameras** → 设备 SLAM + **3D 手部追踪**（手移出主 RGB 视野时仍可跟踪）；
- **感知管线**：Aria **MPS**（Machine Perception Service）输出双手 3D 位姿 \( {}^{H}p \in \mathrm{SE}(3) \times \mathrm{SE}(3) \)；
- **采集效率**：人类数据远高于机器人——Object-in-Bowl 任务 **60 min → 1400 条**示教（~23 条/min），同任务机器人 **120 min → 270 条**（~2 条/min）。

### 2. 机器人硬件：Eve（最小化 kinematic & camera gap）

仿 ALOHA 搭建低成本双臂系统 **Eve**（*Egocentric Videos Effortlessly*）：

| 组件 | 规格 |
|------|------|
| Follower 臂 | 2 × **ViperX 300S**（6-DoF），倒装于可调高度 torso 架上，运动学近似人上半身 |
| 腕部相机 | 2 × Intel **RealSense D405** |
| Leader 遥操作 | 2 × **WidowX** leader arms（ALOHA 式 leader-follower） |
| 主视角传感器 | **第二副 Aria 眼镜**固定于 torso 顶部（与人眼高度对齐） |
| 成本 | 机架 BOM < **$1000**（不含 ViperX 臂本身） |

设计动机：Franka 等重型臂惯性大、运动慢、与人臂 kinematic 差太远；ViperX 更轻、更敏捷、尺寸接近人臂。机器人与人都用 **同一型号 Aria** 作主视角，对齐 FOV / 曝光 / 动态范围。

### 3. 数据处理与跨域对齐（三大 gap）

#### A. 统一坐标系（moving camera → camera-centered frame）

机器人 EEF 轨迹通常在固定相机/基座坐标系；人类 egocentric 数据相机帧 \(F_i\) 随头部运动不断变化。

做法：将人手与机器人 EEF 的 action chunk \(a^{p}_{t:t+h}\) 全部变换到**当前观测相机帧** \(F_t\)：

\[
{}^{H}a^{p}_{i} = (T^{W}_{F_t})^{-1} T^{W}_{F_i} \, p^{F_i}_{i}, \quad i \in [t, t+h]
\]

人类侧用 MPS 视觉惯性 SLAM 得 \(T^{W}_{F_i}\)；机器人侧用手眼标定固定相机帧。策略预测时无需建模未来头部运动。

#### B. 动作分布对齐（Gaussian normalization）

人手与机器人 EEF 位姿分布仍有系统性差异（生物力学、执行风格、测量精度），尤其在 **y（左右）** 维度。不对齐时策略会为两域学**分离表示**，人类数据无法 scaling。

做法：对每类数据源的手/EEF **位姿与动作分别做 Gaussian 归一化**（逐域独立统计 \(\mu, \sigma\)）。消融显示去掉此项 Object-in-Bowl 得分 **-38%**。

#### C. 视觉外观对齐（SAM mask + 红线）

人手与机械臂外观差异大。做法：

1. 用 **SAM** 以手/EEF 投影点为 prompt，将手与机械臂 **黑色 mask 掉**；
2. 叠加 **红色线段**标示末端方向；
3. 部署时用 **SAM2 实时**在桌面端做同样 mask（训练/推理一致）。

消融：去掉红线 **-13%**；去掉 mask+红线 **-26%**。

#### D. 时间对齐

人类完成任务比机器人快。仿 MimicPlay，将人类数据 **慢放 4×**：

- 机器人：4 s horizon、chunk size 100（50 Hz 采集）；
- 人类：1 s horizon、chunk size 100（30 Hz 采集）；
- 两端均在 horizon 内均匀采样 100 个未来动作点。

### 4. 联合策略架构（基于 ACT）

在 ACT Transformer 骨干上扩展，**除浅层 input/output head 外全部参数共享**：

| 数据域 | 视觉输入 | 本体感知 | 监督信号 |
|--------|----------|----------|----------|
| 人类 \(\mathcal{D}_H\) | Egocentric RGB（masked） | 双手 3D 位姿 \( {}^{H}p \) | Pose chunk \( {}^{H}a^{p} \) |
| 机器人 \(\mathcal{D}_R\) | Egocentric RGB + 双腕相机 | EEF \( {}^{R}p \) + 关节 \( {}^{R}q \) | Pose \( {}^{R}a^{p} \) + Joint \( {}^{R}a^{q} \) |

**双头输出设计**（关键工程取舍）：

- **Pose 头** \(f^p\)：人类与机器人共同监督 → 学习跨具身共享表征；
- **Joint 头** \(f^q\)：仅机器人监督 → 部署时用 \(\hat{a}^{q}\) 关节空间控制；
- 原因：6-DoF ViperX 冗余度低，笛卡尔 IK 易奇异/不平滑，**不能直接 EEF 控制**；pose 预测只为表征对齐，非部署动作。

**联合损失**：

\[
\mathcal{L} = \mathcal{L}^{H}_{p} + \mathcal{L}^{R}_{p} + \mathcal{L}^{R}_{q}
\]

各为对应 action chunk 的 MSE。训练脚本：`pl_train.py`（PyTorch Lightning + DDP），数据格式 robomimic-style HDF5。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph HUMAN["🧑 人类被动采集（无需机器人）"]
        A1["Project Aria 眼镜<br/>75g · 任意场地"]
        A2["Wide-FoV RGB"]
        A3["MPS：SLAM + 双手 3D 追踪"]
    end

    subgraph ROBOT["🤖 Eve 双臂机器人"]
        B1["2× ViperX 300S follower"]
        B2["2× WidowX leader 遥操作"]
        B3["Aria 头戴主视角 + D405 腕相机"]
    end

    subgraph ALIGN["🔧 跨域对齐"]
        C1["相机系 action chunk 统一"]
        C2["逐域 Gaussian 动作归一化"]
        C3["SAM mask + 红线 · 时间 4× 慢放"]
    end

    subgraph POLICY["🧠 统一 ACT 策略"]
        D1["共享 Transformer 编码器"]
        D2["Pose 头 ← 人+机共同监督"]
        D3["Joint 头 ← 仅机器人监督"]
    end

    subgraph TASKS["📊 真机长时程任务"]
        E1["Continuous Object-in-Bowl"]
        E2["Laundry 叠衣"]
        E3["Groceries 装袋"]
    end

    A1 --> A2 & A3
    B2 --> B1
    B1 --> B3
    A2 & A3 --> ALIGN
    B3 --> ALIGN
    ALIGN --> POLICY
    POLICY -->|关节空间控制| TASKS

    style HUMAN fill:#fff7e0,stroke:#d4a017
    style ROBOT fill:#f3e8ff,stroke:#8e44ad
    style ALIGN fill:#e8f4fd,stroke:#1f78b4
    style POLICY fill:#e8f8e8,stroke:#27ae60
    style TASKS fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **全栈框架**：Aria 人类采集 + Eve 仿人双臂 + 对齐 + co-train 策略，端到端打通；
2. **人类数据一等公民**：非分层规划器，而是与机器人数据同等进入端到端 action 预测；
3. **三套对齐**：坐标系 / 分布 / 视觉，每项均有消融支撑；
4. **有利 scaling 律**：同等 1 小时，人类数据价值 **>>** 机器人数据；
5. **新场景泛化**：机器人仅在原场景有遥操作数据，人类在新场景采集即可泛化。

---

## 📊 实验任务与数据规模

| 任务 | 人类 # / min / (#/min) | 机器人 # / min / (#/min) |
|------|------------------------|--------------------------|
| Object-in-Bowl | 1400 / 60 / **23** | 270 / 120 / 2 |
| Groceries | 160 / 80 / 2 | 300 / 300 / 1 |
| Laundry | 590 / 100 / 6 | 430 / 300 / 1 |

**任务简述**：

- **Object-in-Bowl**：40 s 内循环「抓毛绒玩具 → 放入碗 → 端起碗倒出 → 重置」；3 碗 × 5 玩具随机摆放；
- **Laundry**：双臂折叠 T 恤（右袖 → 左袖 → 对折），±30° 随机朝向；
- **Groceries**：左臂拎袋口、右臂依次放入 3 包薯片（软体袋把手抓取极难）。

**基线**：ACT、MimicPlay（同 Transformer 骨干、去掉 goal conditioning）、EgoMimic w/o human（隔离架构增益 vs 数据增益）。

### 域内性能（Table III）

| 方法 | Bowl Pts | Laundry Pts / SR | Groceries Pts / SR / Open Bag |
|------|----------|------------------|-------------------------------|
| ACT | 39 | 82 / 55% | 82 / 22% / 54% |
| MimicPlay | 71 | 78 / 50% | 53 / 8% / 40% |
| EgoMimic (w/o human) | 68 | 104 / 73% | 92 / 28% / 60% |
| **EgoMimic** | **128** | **114 / 88%** | **110 / 30% / 70%** |

相对 ACT 得分提升 **34–228%**；绝对成功率提升 **8–33%**。基线常「差几英寸」够不到玩具/碗，人类手部数据显著改善**到达精度**。

### 泛化实验

| 设定 | 结果 |
|------|------|
| 未见颜色 T 恤 | ACT **25%** SR → EgoMimic **85%** SR |
| 新场景 Object-in-Bowl（仅人类数据在新房间） | EgoMimic **63 pts**；MimicPlay 同信息仅 **4 pts** |

### Scaling 实验（Object-in-Bowl）

- **2h 机器人 + 1h 人类** 的 EgoMimic（128 pts）**>** **3h 纯机器人** 的 ACT（74 pts）；
- 1h 人类 ≈ 1400 条 vs 1h 机器人 ≈ 135 条——人类数据 **采集效率与策略增益** 双高。

### 消融（Object-in-Bowl）

| 配置 | Pts |
|------|-----|
| EgoMimic（完整） | 128 |
| w/o 红线 | 112 |
| w/o 红线 + mask | 95 |
| w/o 动作归一化 | 79 |
| w/o 人类数据 | 68 |

---

## 🤖 工程价值

| 方向 | 含义 |
|------|------|
| **被动数据闭环** | 智能眼镜日常活动即可产出具身示教，迈向「互联网级」机器人数据 |
| **人类>机器人 边际收益** | 在已有足够机器人种子数据后，优先扩人类视频比加机器人遥操作更划算 |
| **跨具身表征** | Pose 共享头 + 分布对齐，为后续多机器人/多形态 foundation policy 铺路 |
| **可复现开源** | 训练（EgoMimic）+ 硬件 CAD/ROS（Eve）+ Aria/MPS 处理脚本均已公开 |

---

## 🎤 面试高频问题 & 参考回答

**Q1：EgoMimic 与 MimicPlay / 传统 Learning from Video 有何本质不同？**
A：MimicPlay 用人类视频训**高层规划器**，低层执行策略仍只吃机器人数据，人类规模无法直接提升执行精度。EgoMimic 把人类手部轨迹当作与机器人 joint 数据**同级的 action 监督**，共享 Transformer 表征端到端 co-train，人类数据直接改善「差几英寸够不到」类低层误差。

**Q2：为什么机器人用关节空间控制，却还要预测 pose？**
A：Pose 与人手语义最接近，适合作为**跨具身对齐的公共监督信号**；6-DoF ViperX IK 冗余不足，笛卡尔控制易奇异，故部署走 joint 头。更强冗余臂（7-DoF+）可省掉 joint 头。

**Q3：移动 egocentric 相机下动作标签怎么定义？**
A：用 SLAM 把手部轨迹逐帧变换到**当前观测相机系** \(F_t\)，预测 chunk 时假设相机 frozen，避免建模未来头动。

**Q4：Gaussian 归一化为何重要？**
A：人机 EEF 分布不同（尤其左右方向），不归一化网络会为两域学**分裂表征**，人类数据越多反而可能干扰。逐域归一化是简单但关键的 domain alignment。

**Q5：Kinematic gap 完全消除了吗？**
A：没有。硬件仿人 + 同传感器 + 对齐只能**最小化** gap；剩余差异靠 mask、归一化和大量人类数据弥补。未来工作包括新 robot embodiment 与仅人类示范的新行为（如叠裤子）。

**Q6：和 iDP3 / HumDex 等工作的关系？**
A：iDP3 聚焦人形 3D 扩散策略与单场景泛化；HumDex 聚焦便携 IMU 遥操作采机器人数据。EgoMimic 独特在**无机器人的人类被动采集 + 与机器人数据平等 co-train**，是 manipulation 数据 scaling 路线的重要一支。

---

## 🔗 相关阅读

- [HumDex](../HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.html)（人类视频→机器人数据另一路线）
- [DreamDojo](../DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.html)（大规模人类视频世界模型）
- [ALOHA](https://arxiv.org/abs/2304.13705)（leader-follower 双臂遥操作基线）
- [MimicPlay](https://arxiv.org/abs/2303.05799)（人类视频分层规划对照）
- [ACT](https://arxiv.org/abs/2304.13705)（Action Chunking Transformer 策略骨干）

---

## 📎 附录

### A. 开源仓库结构速查

**SimarKareer/EgoMimic**（训练）

- `egomimic/scripts/aria_process/` — Aria 人类数据 → HDF5
- `egomimic/scripts/aloha_process/` — 遥操作数据 → HDF5
- `egomimic/algo/` — EgoMimic / ACT / MimicPlay 实现
- `egomimic/scripts/pl_train.py` — Lightning 训练入口

**SimarKareer/EgoMimic-Eve**（硬件）

- `hardware/` — Aria 支架、臂架、夹爪 CAD
- `eve/` — ROS 节点、Aria 流、遥操作与采集脚本
- 基于 [Trossen ALOHA ROS2](https://github.com/Interbotix/aloha) 扩展

### B. 参考来源

- [arXiv:2410.24221](https://arxiv.org/abs/2410.24221)
- [Project Website](https://egomimic.github.io)
- [GitHub: EgoMimic](https://github.com/SimarKareer/EgoMimic) · [GitHub: Eve](https://github.com/SimarKareer/EgoMimic-Eve)
