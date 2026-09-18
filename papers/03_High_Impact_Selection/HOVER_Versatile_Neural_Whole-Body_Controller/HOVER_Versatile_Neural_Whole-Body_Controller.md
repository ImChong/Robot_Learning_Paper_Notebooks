---
layout: paper
title: "HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots"
category: "高影响力精选 High Impact Selection"
subcategory: "Whole-Body Control Core"
zhname: "HOVER：面向人形机器人的多模态通用神经全身控制器"
---

# HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots
**HOVER：面向人形机器人的多模态通用神经全身控制器**

> 📅 阅读日期: 2026-05-14
>
> 🏷️ 板块: 03_High_Impact_Selection / Whole-Body Control Core
>
> 🧭 状态: 首版基础摘要（含 mermaid 流程图）；后续可结合论文表 III/IV/V 数值二读补表。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2410.21229](https://arxiv.org/abs/2410.21229) |
| **HTML** | [arxiv.org/html/2410.21229v2](https://arxiv.org/html/2410.21229v2) |
| **PDF** | [arxiv.org/pdf/2410.21229](https://arxiv.org/pdf/2410.21229) |
| **项目主页** | [hover-versatile-humanoid.github.io](https://hover-versatile-humanoid.github.io/) |
| **发布时间** | 2024-10-28 (arXiv), ICRA 2025 |
| **源码** | [NVlabs/HOVER](https://github.com/NVlabs/HOVER) （Apache-2.0） |
| **Isaac Lab 部署示例** | [HOVER Policy 教程](https://isaac-sim.github.io/IsaacLab/v2.1.0/source/policy_deployment/00_hover/hover_policy.html) |
| **作者** | Tairan He∗, Wenli Xiao∗, Toru Lin, Zhengyi Luo, Zhenjia Xu, Zhenyu Jiang, Jan Kautz, Changliu Liu, Guanya Shi, Xiaolong Wang, Linxi "Jim" Fan†, Yuke Zhu† |
| **机构** | NVIDIA GEAR / CMU / UC Berkeley / UT Austin / UC San Diego |
| **会议** | ICRA 2025 |
| **机器人** | Unitree H1（19-DoF，约 51.5 kg / 1.8 m） |

---

## 🎯 一句话总结

HOVER 把 ExBody / H2O / OmniH2O / HumanPlus 等历史人形 WBC 工作中各自不同的"命令空间"（根速度、关节角、关键点位置……）**统一进一个带遮罩的多模式 command space**，先用一份吃满全部信息的 *oracle teacher* 模仿 AMASS 学全身运动先验，再通过 **DAgger 蒸馏 + mode/sparsity 双 mask** 训出一个学生策略——**同一套权重**就能在导航、上身操作、遥操作等十余种模式间无缝切换，并在每种模式下都不弱于专门为它训出的 specialist。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **WBC** | Whole-Body Control | 同时协调腿、躯干、手臂、头部的全身控制 |
| **DoF** | Degrees of Freedom | 自由度，论文中 Unitree H1 用了 19 个 |
| **Oracle policy** | 特权教师策略 | 训练时可访问仿真真值（线速度、参考姿态等）的 PPO 策略 |
| **DAgger** | Dataset Aggregation | 学生在线 rollout、用教师动作做监督的模仿学习算法 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 大规模人体动捕数据集，用于运动先验预训练 |
| **MPJPE** | Mean Per-Joint Position Error | 每关节平均位置误差，跟踪精度核心指标 |
| **Mode / Sparsity Mask** | 模式 / 稀疏掩码 | 用 0/1 向量挑选要跟踪哪些命令维度，是 HOVER 多模式的核心机制 |

---

## ❓ 论文要解决什么问题？

过去几年人形 WBC 工作扎堆开花，但每篇都各做一套接口：

- **ExBody / HumanPlus** → 跟踪上身关节角 + 根部速度；
- **H2O / OmniH2O** → 跟踪头 / 手 / 脚等关键点 3D 位置；
- **真实世界 locomotion** → 只跟踪根部速度；
- **桌面操作** → 只关心末端 / 上肢关节角。

这导致两个直接痛点：

1. **不能复用**：换一种任务（比如从行走切到双臂操作）就得**重新训一个 specialist 策略**，浪费大量 sim 时间；
2. **不能切换**：实物部署时如果想"先走过去 → 再蹲下捡东西"，需要在策略间手动切换，**切换瞬间动作不连续，容易摔**。

HOVER 的论点是：这些命令空间在物理意义上**有共同的运动学根基（balance、coordination、human-like motion）**，本不该被强行拆开。只要训练一个吃所有命令的"通才教师"，再用 mask 把"对此次任务有效的命令"投射给学生，就能得到一个**真正的人形 motor backbone**，让上层算法（手柄、VR、mocap、exoskeleton、VLA）共用同一套底层控制器。

---

## 🔧 方法详解

### 1. 统一的多模式命令空间

把命令拆成**上半身 / 下半身两个区域**，每个区域内允许三种基本模式（论文 §II-B）：

| 模式 | 含义 | 来自哪类历史工作 |
|------|------|------------------|
| Kinematic Position Tracking | 跟踪选定刚体点的 3D 位置（头、手、肘、肩、踝……） | H2O / OmniH2O |
| Local Joint Angle Tracking | 跟踪每个电机的目标关节角 | ExBody / HumanPlus |
| Root Tracking | 跟踪根部线速度、高度、roll/pitch/yaw | 经典 locomotion |

设计原则有两条：

- **Generality**：把现有主流工作的命令空间都涵盖进去；
- **Atomicity**：维度尽量正交，可以**任意组合**——例如上身用关键点、下身用根部速度。

切换"使用哪些维度"靠一个**one-hot mask**。

### 2. 大规模重定向：把 AMASS 拉成机器人能跟的轨迹

三步流程：

1. 用 forward kinematics 算出 humanoid 关键点位置；
2. 把 SMPL 参数拟合到这些关键点，相当于先把 H1 长成一个"虚拟人"；
3. 用梯度下降把 AMASS 大规模动捕重定向到 H1，得到只包含**可行动作**的数据集 $\hat{Q}$。

这一步沿用 H2O 的"sim-to-data"流水线。

### 3. Oracle teacher：吃满全部信息的全身模仿者

- **本体观测** $s_t^{\text{p-oracle}}$：刚体位置、姿态、线/角速度、上一步动作（仿真特权信息）；
- **目标观测** $s_t^{\text{g-oracle}}$：参考姿态、参考速度、与当前状态的一步差分；
- **奖励**：penalty（扭矩 / 关节限位 / 终止）+ regularization（关节加速度 / 平滑 / 接触 / 滑动）+ task（关节位置 / 全身位置 / 根部速度与姿态），权重见原文 Table II；
- **算法**：标准 PPO + domain randomization（与 OmniH2O 一致，保证 sim-to-real）；
- **网络**：MLP `[512, 256, 128]`。

Oracle 是一个**单一模式（全部观测，全部跟踪）下的强模仿器**——它不直接部署，只用来当 distillation 的金标准。

### 4. 学生 distillation：mode mask + sparsity mask 双掩码

学生策略 $\pi^{\text{student}}$ 的目标观测被裁剪为：

$$ s_t^{\text{g-student}} = M _ {\text{sparsity}} \odot \left[ M _ {\text{mode}} \odot s_t^{\text{g-upper}},\ M _ {\text{mode}} \odot s_t^{\text{g-lower}} \right] $$

- **Mode mask**：对上下半身**独立**地随机挑一种模式（位置 / 关节角 / 根部）；
- **Sparsity mask**：在已选模式内再随机让一部分维度失活——例如"上身只跟左手"，"下身只跟躯干关节角"；
- 两个 mask 都是 Bernoulli(0.5)，**每个 episode 开始随机一次、保持到回合结束**。

本体观测部分用 25 步历史（关节位 / 速、基座角速度、重力向量、动作历史），完全沿用 OmniH2O 的学生形态——这是为了直接复用其 sim-to-real 工程。

**蒸馏算法**：DAgger。学生在 sim 中 rollout 拿到 $(s^{\text{p}}, s^{\text{g}})$，同时拿对应仿真真值喂给 oracle 得到参考动作 $\hat a_t$，再用 $\|\hat a_t - a_t\|_2^2$ 监督学生。

### 5. 为什么"通才"反而比"专才"强？

论文给出的解释（也是实验观察）：

- Specialist 容易**过拟合特定 reward 与命令分布**，遇到边缘情况就崩；
- Generalist 共享了**平衡 / 协调 / 人形动作风格**这一层先验，**多个模式的训练信号相互正则化**；
- 也是为什么 HOVER 在每个 mode 下的至少 7/12 个跟踪指标都打过 specialist（论文 Table III 加粗项）。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["📚 数据层：AMASS → 可行机器人动作集 Q̂"]
        D1["AMASS 人体动捕"]
        D2["SMPL ↔ Humanoid 关键点拟合"]
        D3["梯度重定向 + 可行性过滤"]
        D1 --> D2 --> D3
    end

    subgraph TEACHER["🎓 第一阶段：Oracle Teacher（PPO）"]
        T1["特权本体观测<br/>(rigid-body pose/vel + last action)"]
        T2["参考目标观测<br/>(reference pose + Δ)"]
        T3["MLP [512,256,128]<br/>PPO + Domain Rand"]
        T1 --> T3
        T2 --> T3
    end

    subgraph CMD["🧩 统一多模式命令空间"]
        C1["Upper Body<br/>(Position / JointAngle)"]
        C2["Lower Body<br/>(Position / JointAngle / Root)"]
        C3["Mode Mask<br/>(模式选择)"]
        C4["Sparsity Mask<br/>(维度子选)"]
        C1 -.-> C3
        C2 -.-> C3
        C3 --> C4
    end

    subgraph STUDENT["🎒 第二阶段：Student（DAgger 蒸馏）"]
        S1["稀疏本体观测<br/>(q, q̇, ω_base, g; 25 步历史)"]
        S2["遮罩后的命令<br/>M_sparsity ⊙ (M_mode ⊙ s_g)"]
        S3["DAgger:<br/>L = ‖â_t − a_t‖²"]
        S1 --> S3
        S2 --> S3
    end

    DEPLOY["🤖 真机部署<br/>Unitree H1 · 19-DoF · 50 Hz<br/>同一权重支持 15+ 控制模式"]

    D3 -->|参考轨迹| T2
    TEACHER -->|oracle 动作| S3
    CMD --> S2
    STUDENT --> DEPLOY

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style TEACHER fill:#fdebd0,stroke:#e67e22
    style CMD fill:#f4ecf7,stroke:#8e44ad
    style STUDENT fill:#fce4ec,stroke:#c2185b
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 🚶 具体实例

论文与项目主页展示了 HOVER **同一份权重**下跑通的若干典型模式：

- **导航 / 行走**：上下身都退化到根部速度跟踪，等价于经典 locomotion specialist；
- **ExBody 风格表达**：上身跟踪关节角、下身跟踪根部速度；
- **OmniH2O 风格遥操**：上身跟踪头与双手 3D 位置、下身放开自由；
- **桌面双臂操作**：上身锁定关节角、下身保持站立；
- **跨模式无缝切换**：在一次 rollout 内从行走切到双手操作，**无需切换策略权重**。

---

## 📊 实验亮点（节选）

- **覆盖 15+ 控制模式**，包括 ExBody / HumanPlus / H2O / OmniH2O / 左手 / 右手 / 双手 / 头部等；
- **vs Specialist**（论文 Table III）：在 ExBody / HumanPlus / H2O / OmniH2O 四种模式下，HOVER 在 **≥7/12 项跟踪指标**上同时优于 specialist；
- **vs Multi-mode RL baseline**（同样 mask、从零 RL，不蒸馏）：HOVER distillation 显著领先，证明 *oracle 提供的运动先验* 才是关键；
- **真机**：Unitree H1（19-DoF）上稳定执行多模式切换，sim-to-real 沿用 OmniH2O 的 domain randomization 配置。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|------|------|
| **接口设计** | 把"命令空间"抽象成 mask 而不是不同策略，是后续 humanoid foundation model（GR00T、UH-1 等）的底层范式 |
| **训练范式** | 进一步坐实"oracle teacher + DAgger student"是当下人形 WBC 的事实标准（OmniH2O / ExBody2 / MOSAIC 都遵循） |
| **VLA 衔接** | 上层 VLA / LLM 只需输出**任意子集的姿态目标**，就能调用 HOVER 完成各种身体动作，无需关心控制实现细节 |
| **遥操作** | 同一控制器适配手柄、键盘、mocap、外骨骼、VR——天然兼容多种数据采集形态 |

---

## 🎤 面试参考

**Q：HOVER 和 OmniH2O 的关键区别？**  
A：OmniH2O 仍是**单一命令模式**（head + 双手位置 + 全身姿态），HOVER 把 OmniH2O 的命令空间作为**其中一个 mask 实例**——并且 HOVER 用 Mode/Sparsity 两层掩码同时覆盖 ExBody / HumanPlus / H2O / 根部模式等十余种配置。架构上同样是 oracle teacher + DAgger 学生，但 oracle 训练时**吃满**全部命令信号，学生通过随机掩码学到泛化能力。

**Q：为什么"通才"在每个模式下都能打过专才？**  
A：作者归因于**共享的人形运动先验**：所有命令模式都要求平衡、协调、人形风格，多个模式联训等价于互相正则化，避免 specialist 容易过拟合特定 reward。物理直觉是——一个会走会蹲会站的策略，再去做"只跟手"的任务自然不容易摔；而只学过"跟手"的策略，连"如何站稳"都没有内建先验。

**Q：Mode mask 和 Sparsity mask 为什么要分两层？**  
A：Mode mask 决定"用哪种命令语义"（位置 / 关节角 / 根部），Sparsity mask 决定"在该语义里激活多少维度"。**两层正交**才能枚举出真实部署中各种零散的 partial command（"只锁左手"、"只锁躯干姿态"、"只锁根速度"等），既覆盖 ExBody 这类全身模式，又能支持"只给某几个维度"的稀疏遥操。

**Q：HOVER 能不能直接接 LLM / VLA？**  
A：可以。VLA / LLM 只需输出**机器人可理解的姿态目标子集**（任意上下身命令组合），HOVER 通过对应 mask 即可执行。这正是 NVIDIA GR00T 系列的设计思路——把 HOVER 当作"motor backbone"，让 foundation model 专心做规划和语义层。

**Q：和 ExBody2 在路线上的差异？**  
A：ExBody2 追求**单一表达性模式下的极限跟踪保真度**，重点在 reward 拆分与教师过滤；HOVER 反过来追求**多模式兼容**，单点精度可能略不如专门 finetune 的 ExBody2，但获得了**统一接口与策略复用**。两者其实可以叠加：ExBody2 的 reward 设计可以喂给 HOVER 的 oracle。

---

## 🔗 相关阅读

- [Expressive Whole-Body Control (ExBody1, 2402.16796)](https://arxiv.org/abs/2402.16796)：上身关节角跟踪的代表作 (H1)
- [ExBody2 (2412.13196)](https://arxiv.org/abs/2412.13196)：表达性 WBC 的进阶版 (H3)
- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858)：HOVER 学生策略沿用其 sim-to-real 工程 (H8)
- [HumanPlus (2406.10454)](https://arxiv.org/abs/2406.10454)：上下身联合关节角跟踪 (H7)
- [GR00T N1 (2503.14734)](https://arxiv.org/abs/2503.14734)：把 HOVER 风格控制器嵌入 humanoid foundation model
- [NVlabs/HOVER](https://github.com/NVlabs/HOVER)：官方实现，含 oracle 训练、学生蒸馏、MuJoCo sim-to-sim 与 Unitree H1 部署

---

## 📎 附录：与该笔记并行的"高影响力精选"笔记

| 类别 | 已完成 | 待补 |
|------|------|------|
| 全身控制核心 | ExBody1 / ExBody2 / **HOVER (本文)** | HugWBC / SONIC / UH-1 |
| 遥操作与模仿学习 | OmniH2O | HumanPlus / HOMIE / EgoMimic / iDP3 |
| 仿真平台与工具 | ProtoMotions3 / Isaac Lab | Humanoid-Gym / HumanoidBench / BEHAVIOR Robot Suite |
