---
layout: paper
title: "PRIMO: Prior-Informed Odometry from Human-Motion Tracking for Humanoid Robots"
zhname: "PRIMO：基于人体动作跟踪数据与结构先验的人形机器人本体里程计"
category: "State Estimation"
arxiv: "2609.23610"
---

# PRIMO: Prior-Informed Odometry from Human-Motion Tracking for Humanoid Robots
**只用 IMU 和关节读数估计人形的里程计。训练数据不再从要部署的行走策略里录，改成让一个全身跟踪器在仿真里跟踪约 64 小时的人体动作来录；网络本身也加了物理结构：陀螺积分当旋转的底，网络只学有界修正，再加上重力补偿后的速度增量、左右镜像平均，以及一条粗粒度原始信号通路**

> 📅 总结日期: 2026-10-12
>
> 🏷️ 板块: 09 State Estimation · 学习式本体里程计 · 动作跟踪数据生成 · 结构先验 · 镜像等变 · Sim-to-Real · AgiBot A3 Ultra
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）· 取本模块尚无笔记的最新论文（2026.09，上游 🌟）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2609.23610](https://arxiv.org/abs/2609.23610) |
| HTML | [arxiv.org/html/2609.23610v1](https://arxiv.org/html/2609.23610v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2609.23610v1) |
| **发布时间** | 2026-09-20（arXiv v1） |
| 状态 | 8 页，投稿审稿中 |
| 源码 | ⏳ 暂未开源：官方仓库 [github.com/Agibot-Spatial-Intelligence/PRIMO](https://github.com/Agibot-Spatial-Intelligence/PRIMO) 的 README 写明会放出代码、处理后的数据、训练好的模型、外部基线轨迹和分析脚本；但截至 2026-10-12，仓库只有一条 `initial commit`，里面只有 README，**代码还没放出**。所以本笔记的时序图是**按论文第 III 节整理的推理流程**，不是从源码读出来的调用链 |

**作者**：Xu Han, Angsong Li, Shaopeng Zhang, Enyu Li, Peiwen Lin, Chuang Wang, Yuan Zhuang, Haiyu Lan（武汉大学、智元机器人 AgiBot）

**平台**：AgiBot A3 Ultra（31 个驱动自由度，估计器只用双腿 6+6 加腰部 3 个关节；骨盆 500 Hz 战术级六轴 MEMS IMU）

---

## 🎯 一句话总结

PRIMO 是一个只看 IMU 和关节读数的人形本体里程计，它用人体动作跟踪数据和物理结构先验，解决仿真训练的里程计迁移到真机时的两个问题。第一，训练轨迹通常是部署策略自己录的，覆盖的动作很窄，换一版控制器就失效（Legolas 报告过这种退化）。第二，网络直接回归速度和旋转，会学到「仿真里成立、真机上不成立」的相关性。**数据侧**：用 SONIC 式的全身跟踪器在域随机化仿真里跟踪约 64 h 重定向后的人体动作，录下同步的 IMU、关节和真值，监督信号因此和部署策略解耦。**模型侧**：一个 221 K 参数的因果估计器，内含四个结构件：① 重力补偿后的体坐标系速度增量 $\Delta\mathbf{v}^I$，作为软条件输入；② 陀螺积分 $\mathbf{R}_g$ 作为旋转的标称值，网络只输出有界的 $\alpha\tanh$ 修正；③ 矢状面镜像的 frame averaging，保证左右对称的严格等变；④ 粗粒度原始信号通路 CRP，把慢变的姿态 / 幅值信息直接送进融合干路。在 22 条真机行走轨迹（78.8 min）和 10 条舞蹈轨迹（9.4 min）上，PRIMO 在六个「域 × 指标」格子里都是最低，比每格最强的外部基线（Pronto / Bloesch / OCELOT / Legolas）低 31.6%–61.7%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| PRIMO | PRior-Informed odometry from human-MOtion tracking | 本文方法 |
| CRP | Coarse Raw-context Pathway | 粗粒度原始信号通路：标准化后的原始历史直接池化到 20 Hz，再过一个 1×1 投影 |
| FA | Frame Averaging | 对群里每个变换都跑一次网络、变换回原坐标后取平均，把任意网络变成等变网络 |
| AHRS | Attitude and Heading Reference System | 航姿参考系统，提供 roll / pitch（本机精度 < 0.2°） |
| ATE$_o$ / ATE$_u$ | Absolute Trajectory Error（origin / Umeyama aligned） | 首帧对齐 / Umeyama 刚体对齐后的绝对轨迹误差，ATE$_o$ 是主指标（不补偿漂移） |
| RPE@1m | Relative Pose Error over 1 m | 每走 1 m 的相对位移误差，看局部精度 |
| TCN | Temporal Convolutional Network | 时间卷积网络，作融合干路 |
| NLL | Negative Log-Likelihood | 高斯负对数似然，让网络同时输出协方差 |
| BVH | Biovision Hierarchy | 动捕常用的骨架动作文件格式 |

---

## ❓ 论文要解决什么问题？

1. **训练分布被部署策略锁死**：常见做法是拿要部署的行走策略、采样速度指令，在仿真里滚出数据。这样数据只覆盖这个策略会的动作；控制器一更新，估计器就要重新采数据。Legolas 的输入里甚至带着动作和速度指令，策略不同时误差明显变大。
2. **无约束回归的 sim-to-real 脆弱**：域随机化补不全真机的传感、接触、硬件不对称。网络直接回归完整的速度和旋转，会依赖仿真特有的相关性；而「陀螺积分就是旋转」「加速度积分就是速度变化」「左右镜像对称」这些已知的物理关系，网络没有被显式告知。
3. **深层编码会抹掉慢变信号**：多级跨步卷积和归一化擅长抓瞬态，但姿态、信号幅值这类低频上下文会被稀释。

---

## 🔧 方法拆解

### 1. 数据侧：跟踪人体动作来造里程计数据（第 III-A 节）

- **参考动作**：经过质量筛选的约 64 h BVH 人体动作，既有日常行走，也有跳、踢、舞蹈、下蹲、跪地等动态全身动作；按 SOMA 和 GMR 的重定向原则，用内部改写的流水线映射到 A3 机器人。
- **全身跟踪器**：参照 SONIC，用 PPO 训练一个反馈跟踪策略。输入是未来参考状态加本体历史，输出是叠加在 PD 目标上的残差关节位置。训练时随机化接触、惯量、执行器、观测噪声和外部推力，并用自适应采样反复练难跟踪的片段。
- **录数据**：冻结跟踪器，在域随机化仿真里把整个动作库跑一遍，按各自采样率记录骨盆 IMU、关节历史和位姿 / 体速度真值；剔除无效片段后切成因果窗口。部署策略 A、B 的滚动数据用**同一套录制格式**，所以对比实验只改训练数据的动作分布，不改输入和目标。

### 2. 里程计的输入输出（第 III-B 节）

- 输入只有本体信号：$\mathcal{X}_k = (\mathbf{X}^I_k, \mathbf{X}^J_k)$，即骨盆 IMU 历史与 15 个关节的位置 / 速度历史；**不看指令，也不看动作**。
- 输出两个可积分的量：体坐标系速度 $\mathbf{v}^b_k = \mathbf{R}_k^\top\mathbf{v}^w_k$ 和单步旋转向量 $\boldsymbol\phi_k = \mathrm{Log}(\mathbf{R} _ {k-1}^\top\mathbf{R}_k)$，各带一个对角协方差（谱被夹在 $e^{\pm14}$ 之间）。
- 损失分两段：前 10 个 epoch 用平方误差，之后换成高斯 NLL；旋转残差在 SO(3) 的切空间里计算。
- 推理时从真值初始位姿出发，只靠预测积分：$\check{\mathbf{R}}_k = \check{\mathbf{R}} _ {k-1}\mathrm{Exp}(\hat{\boldsymbol\phi}_k)$，$\check{\mathbf{p}} _ {k+1} = \check{\mathbf{p}}_k + \Delta t\,\check{\mathbf{R}}_k\hat{\mathbf{v}}^b_k$。

### 3. 模型侧：Prior-Informed 估计器的四个结构件（第 III-C 节）

| 结构件 | 做什么 | 为什么 |
|---|---|---|
| **多速率编码 + CRP** | IMU（500 Hz）和关节（200 Hz）各过一个 CNN 编码器，降采样到共同的 20 Hz 网格，再由 TCN 融合；CRP 把标准化后的原始历史直接池化到 20 Hz，过 1×1 投影后并入干路（只多 4 K 参数） | 编码器擅长瞬态，CRP 保留低频上下文，思路类似 SlowFast 的快慢两路 |
| **姿态推出的惯性条件** | $\Delta\mathbf{v}^I_k = \int (\mathbf{a}^b - \mathbf{R} _ {\text{tilt}}^\top\mathbf{g})\,dt$：用 AHRS 的 roll / pitch 去掉重力，在一个输出间隔内积分，结果仍在体坐标系 | 给网络一个「速度大概变了多少」的物理提示，但只作为条件输入，不替代网络输出（振动、动态加速度会污染它） |
| **陀螺锚定旋转** | 窗口内按时间顺序连乘 $\mathbf{R}_g = \prod\mathrm{Exp}(\boldsymbol\omega_i^b\Delta t)$，网络只输出有界修正 $\delta\boldsymbol\phi = \alpha\tanh(\mathbf{r}_\theta)$，$\hat{\boldsymbol\phi} = \mathrm{Log}[\mathbf{R}_g\,\mathrm{Exp}(\delta\boldsymbol\phi)]$ | 陀螺积分本身就是很好的旋转估计，网络最多只能把它推开 $\alpha$ |
| **矢状面镜像平均** | 原输入和镜像输入各过一遍网络，镜像那一支的输出用 $\mathbf{P} = \mathrm{diag}(1,-1,1)$（速度，极矢量）或 $\mathbf{A} = \mathrm{diag}(-1,1,-1)$（旋转，轴矢量）变回来，两支取平均（式 12） | 不管底下的网络对不对称，输出对左右镜像都**严格**等变；对数标准差是镜像不变量，直接平均 |

镜像操作 $\mathcal{M}$ 对 IMU 量施加对应的符号翻转，并交换左右腿的成对关节通道。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TD
    subgraph DATA["数据侧：动作跟踪造监督（与部署策略解耦）"]
        BVH["约 64 h 人体 BVH 动作库<br/>行走 / 跑 / 转身 + 跳 / 踢 / 舞 / 蹲 / 跪"]
        RT["重定向到 AgiBot A3<br/>（SOMA + GMR 原则）"]
        TRK["PPO 全身跟踪器（参照 SONIC）<br/>残差关节目标 → PD<br/>域随机化 + 自适应采样"]
        REC["冻结跟踪器，在随机化仿真里跑完动作库<br/>同步记录 IMU 500 Hz、关节 200 Hz、位姿 / 体速度真值"]
        BVH --> RT --> TRK --> REC
    end

    subgraph MODEL["模型侧：Prior-Informed 因果估计器（221 K 参数）"]
        IN["输入 X_k = 骨盆 IMU 历史 + 15 个关节 q / q̇ 历史<br/>（不看指令、不看动作）"]
        ENC["多速率 CNN 编码器<br/>500 / 200 Hz → 20 Hz"]
        CRP["CRP：原始历史池化到 20 Hz + 1×1 投影"]
        DV["惯性条件 Δv^I：去重力后的加速度积分"]
        TCN["TCN 融合干路"]
        VEL["体速度 v̂^b + Σ^v"]
        GYR["陀螺积分 R_g"]
        COR["有界修正 δφ = α·tanh(r)"]
        ROT["φ̂ = Log(R_g · Exp(δφ)) + Σ^φ"]
        FA["矢状面镜像平均<br/>原输入 / 镜像输入两支，P 或 A 变回后取均值"]
        IN --> ENC --> TCN
        IN --> CRP --> TCN
        IN --> DV --> TCN
        IN --> GYR --> ROT
        TCN --> VEL
        TCN --> COR --> ROT
        VEL --> FA
        ROT --> FA
    end

    LOSS["训练：前 10 epoch 平方误差 → 高斯 NLL<br/>旋转残差在 SO(3) 切空间计算"]
    INT["推理：R_k = R_{k−1}·Exp(φ̂)，p_{k+1} = p_k + Δt·R_k·v̂^b<br/>20 Hz 输出，batch-1 推理 0.433 ms"]
    EVAL["真机评测：Real-Walk 22 条 / 78.8 min（LiDAR 地图定位真值）<br/>Real-Dynamic 10 条舞蹈 / 9.4 min（动捕真值）"]

    REC --> LOSS
    FA --> LOSS
    FA --> INT --> EVAL
</div>

---

## ⏱️ 推理时序（按论文整理，非源码）

> 官方仓库目前只有 README，下图按论文第 III-B、III-C 节的描述整理一个 20 Hz 输出周期内的数据流，函数名都是示意。

<div class="mermaid">
sequenceDiagram
    participant IMU as 骨盆 IMU (500 Hz) + AHRS
    participant ENC as 关节编码器 (200 Hz)
    participant BUF as 因果窗口缓存
    participant NET as Prior-Informed 网络
    participant FA as 镜像平均
    participant ODO as 位姿积分器

    loop 每 2 ms
        IMU->>BUF: 角速度 ω、加速度 a、roll / pitch
    end
    loop 每 5 ms
        ENC->>BUF: 15 个关节 q, q̇
    end
    Note over BUF: 每 50 ms（20 Hz）触发一次输出
    BUF->>NET: 窗口 X_k
    NET->>NET: 25 个陀螺样本按时间顺序连乘得 R_g
    NET->>NET: 去重力积分得 Δv^I
    NET->>NET: CNN 编码 + CRP 池化 + Δv^I → TCN
    NET->>NET: 输出 v_θ、δφ = α·tanh(r)，φ = Log(R_g·Exp(δφ))
    BUF->>FA: 镜像窗口 M·X_k（IMU 符号翻转、左右腿通道交换）
    FA->>NET: 同一网络再前向一次
    NET-->>FA: v_θ(M·X)、φ_θ(M·X)
    FA->>FA: v = ½[v_θ(X) + P·v_θ(M·X)]，φ = ½[φ_θ(X) + A·φ_θ(M·X)]
    FA->>ODO: v̂^b、φ̂（及协方差）
    ODO->>ODO: R ← R·Exp(φ̂)；p ← p + Δt·R·v̂^b
</div>

---

## 🚶 具体实例：镜像平均怎么保证左右对称

设某一时刻底层网络（未约束）对原输入 $\mathbf{x}$ 和镜像输入 $\mathcal{M}\mathbf{x}$ 的输出如下（数字是示意，单位 m/s 与 rad）：

| | $\mathbf{v}_\theta$ | $\boldsymbol\phi_\theta$ |
|---|---|---|
| 原输入 $\mathbf{x}$ | $(0.50,\ 0.08,\ 0.01)$ | $(0.002,\ 0.001,\ 0.030)$ |
| 镜像输入 $\mathcal{M}\mathbf{x}$ | $(0.48,\ -0.02,\ 0.00)$ | $(-0.001,\ 0.003,\ -0.026)$ |

一个真正对称的网络应当满足 $\mathbf{v}_\theta(\mathcal{M}\mathbf{x}) = \mathbf{P}\mathbf{v}_\theta(\mathbf{x}) = (0.50, -0.08, 0.01)$，可这里侧向速度只有 $-0.02$，说明底层网络有偏。

**第 1 步：把镜像支的输出变回原坐标**

- 速度是极矢量，用 $\mathbf{P}$ 只翻 $y$：$\mathbf{P}\mathbf{v}_\theta(\mathcal{M}\mathbf{x}) = (0.48,\ 0.02,\ 0.00)$
- 旋转是轴矢量，用 $\mathbf{A}$ 翻 $x$ 和 $z$：$\mathbf{A}\boldsymbol\phi_\theta(\mathcal{M}\mathbf{x}) = (0.001,\ 0.003,\ 0.026)$

**第 2 步：两支取平均**

- $\mathbf{v} _ {\mathrm{FA}}(\mathbf{x}) = (0.49,\ 0.05,\ 0.005)$
- $\boldsymbol\phi _ {\mathrm{FA}}(\mathbf{x}) = (0.0015,\ 0.002,\ 0.028)$

**第 3 步：验证等变**。对镜像输入再做一次 FA：$\mathbf{v} _ {\mathrm{FA}}(\mathcal{M}\mathbf{x}) = \tfrac12[(0.48, -0.02, 0) + \mathbf{P}(0.50, 0.08, 0.01)] = (0.49,\ -0.05,\ 0.005)$，恰好等于 $\mathbf{P}\mathbf{v} _ {\mathrm{FA}}(\mathbf{x})$。旋转同理，$\boldsymbol\phi _ {\mathrm{FA}}(\mathcal{M}\mathbf{x}) = (-0.0015,\ 0.002,\ -0.028) = \mathbf{A}\boldsymbol\phi _ {\mathrm{FA}}(\mathbf{x})$。

**直觉**：左转（$\phi_z = +0.030$）的镜像是右转，偏航分量要翻号；绕 $y$ 的俯仰在镜像下不变，所以 $\mathbf{A}$ 的中间一项是 $+1$。镜像平均让网络「左走」和「右走」的偏差互相抵消，不会因为训练数据左右不均而一直往一侧漂。论文表 III(a) 里单独加镜像（第二行）就把 Real-Walk 的 ATE$_o$ 从 1.386 m 降到 1.028 m。

**陀螺锚定的量级**：20 Hz 输出、500 Hz IMU，一个窗口是 $N = 25$ 个陀螺样本，$\Delta t = 2$ ms。若偏航角速度恒为 0.5 rad/s，$\mathbf{R}_g$ 给出的单步偏航约 0.025 rad；网络能改动的幅度不超过 $\alpha$（论文没给出 $\alpha$ 的数值）。

---

## 💡 核心贡献

1. **动作跟踪式监督**：人体动作库 + 重定向 + 闭环物理跟踪 + 同步录制，得到一份能跨部署策略复用的里程计训练集。
2. **Prior-Informed 估计**：惯性条件、陀螺锚定、镜像平均这三个结构先验约束速度和旋转的预测，CRP 补上低频上下文。
3. **把数据和模型的贡献分开测**：做了六个数据源的动作覆盖审计、策略迁移实验、$2^3$ 先验全因子消融、CRP 信息对照，以及「数据组成 × 估计器」交叉实验。

---

## 📊 关键发现

**表 I：统一协议下的真机误差（m，越低越好）**

| 方法 | Real-Walk ATE$_o$ | ATE$_u$ | RPE@1m | Real-Dynamic ATE$_o$ | ATE$_u$ | RPE@1m |
|---|---|---|---|---|---|---|
| Pronto | 2.133 | 1.443 | 0.252 | 0.871 | 0.427 | 0.302 |
| Bloesch-style | 1.457 | 0.761 | 0.539 | 0.699 | 0.456 | 0.417 |
| OCELOT | 2.322 | 0.952 | 0.153 | 0.548 | 0.310 | 0.192 |
| Legolas（用同一份跟踪数据训练） | 3.997 | 1.564 | 0.239 | 0.700 | 0.379 | 0.334 |
| **PRIMO** | **0.894** | **0.331** | **0.058** | **0.328** | **0.189** | **0.131** |

**表 II：训练数据来源对比（ATE$_o$，m）**

| 训练数据 | Sim-A | Sim-B | Real-A | Real-B | Real-Dynamic |
|---|---|---|---|---|---|
| Specialist-A（只用策略 A） | 0.103 | 8.049 | 0.991 | 6.380 | 4.326 |
| Specialist-B（只用策略 B） | 6.461 | 0.076 | 6.461 | 1.246 | 8.777 |
| Policy-Union（A + B） | 0.137 | 0.089 | 0.766 | 0.955 | 3.381 |
| **Tracking-Locomotion**（两个策略都没用） | 0.643 | 0.485 | 0.888 | 1.092 | **0.716** |

- **专才只认自己的策略**：A 换成 B 时误差涨了约 80 倍（0.103 → 8.049 m），反过来也一样。跟踪数据完全没见过 A、B 的数据，对「另一个策略」的误差比专才低 86.8%–94.6%。
- **已知且固定的部署策略，直接用它的数据仍然最好**：Policy-Union 在 Sim-A/B 和 Real-A 上更低。但遇到舞蹈这类动态动作，Policy-Union 是 3.381 m，跟踪数据是 0.716 m，降了 78.8%。
- **覆盖审计（图 5）**：在 $P _ {99}$ 上，每个跟踪数据集在水平速度（1.27–1.65 vs 0.45–0.85 m/s）、竖直速度（0.47–0.90 vs 0.06–0.17 m/s）、角速度（2.72–3.13 vs 0.88–0.92 rad/s）上都超过每个策略数据集；不过 Real-Dynamic 的角速度 $P _ {99}$ 达到 4.54 rad/s，仍超出所有训练数据。
- **先验全因子（表 III(a)）**：三个先验都加上，相对于全不加，Real-Walk 的 ATE$_o$ 从 1.386 降到 0.894 m（−35.5%）。单加镜像对局部 RPE 和短轨迹最有效；惯性和陀螺两项主要改善长轨迹的一致性。
- **CRP 不是摆设（表 III(b)、图 6）**：把 CRP 的输入置零，或者直接删掉这条通路，Real-Walk 的 ATE$_o$ 都会涨到 2.0 m 以上。CRP 激活有 66.5% 的能量在 0–2 Hz，编码器只有 42.8%，说明 CRP 确实承担了低频那一路。
- **先验在各种数据组成下都有效（表 IV）**：Locomotion / Complex / Mixed 三种训练组成里，Prior-Informed 在所有仿真和真机指标上都低于 Unconstrained。Locomotion 训练下，Real-Walk ATE$_o$ 从 6.500 降到 1.149 m。
- **轻量**：221 K 参数（Legolas 1.5 M），i7-14700K 上 batch-1 FP32 推理 0.433 ms。

---

## 🤖 对人形机器人领域的意义

- **把动作跟踪的数据红利搬到了状态估计**：GMR、SONIC 这类重定向 + 跟踪管线原本只用来训练控制策略；PRIMO 说明同一份动作库也能给估计器提供可复用的监督，而且换控制器版本不用重新采数据。
- **「物理先验 + 学习」的又一个实证**：陀螺积分当底、网络只学有界修正，和 InEKFormer、AI-IMU 这类「滤波 + 学习」的混合思路一致，都是让网络只负责物理模型做不好的那部分。
- **局限**：需要 AHRS 提供 roll / pitch，并且要真值初始化；纯本体里程计仍会漂移（Real-Walk 平均 ATE$_o$ 0.894 m），长时间运行还得接视觉或 LiDAR 做闭环；Real-Dynamic 的角速度超出训练覆盖；目前只验证了一款机器人（A3 Ultra）。

---

## 🎤 面试参考

1. **为什么用动作跟踪而不是部署策略来造数据？** 部署策略只覆盖它自己会的动作和指令空间，控制器一更新数据就过时；跟踪数据的覆盖由动作库决定，可以跨策略复用。代价是：已知且固定的策略下，直接用它的数据仍然略好（表 II 的 Policy-Union）。
2. **速度和旋转为什么用不同的镜像矩阵？** 速度是极矢量，镜像只翻侧向分量，用 $\mathbf{P} = \mathrm{diag}(1,-1,1)$；角速度和旋转向量是轴矢量（叉乘的结果），要乘上 $\det\mathbf{P} = -1$，于是变成 $\mathbf{A} = \mathrm{diag}(-1,1,-1)$。
3. **frame averaging 和数据增强（镜像翻转数据）有什么区别？** 数据增强只是鼓励网络对称，FA 是在结构上保证严格等变，代价是推理时多一次前向。
4. **为什么陀螺修正要过 tanh？** 限制网络对陀螺积分的修改幅度，防止网络在真机上学出离谱的旋转，同时保留它补偿零偏、振动的能力。
5. **为什么先用平方误差再换 NLL？** 一开始就用 NLL，网络可以把方差调大来「躲」误差；先用平方误差把均值学好，再学不确定度，训练更稳。

---

## 🔗 相关阅读

- [OCELOT](../OCELOT__Odometry_and_Contact_Estimation_for_Legged_Robots/OCELOT__Odometry_and_Contact_Estimation_for_Legged_Robots.html)：本文的外部基线之一，模型式的接触校验 + 里程计
- [InEKFormer](../InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots/InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots.html)：人形的「不变 EKF + Transformer」混合估计器
- [GAIT](../GAIT__Legged_Robot_Proprioceptive_State_Estimation_with_Attention_over_Inertia/GAIT__Legged_Robot_Proprioceptive_State_Estimation_with_Attention_over_Inertia.html)：另一条学习式本体估计路线，在惯性—腿部 token 上做注意力
- [Contact-Aided Invariant EKF](../Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.html)：经典的接触辅助滤波
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：本文全身跟踪器参照的工作
- [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)：本文重定向流水线遵循的原则之一
- Legolas: Deep Leg-Inertial Odometry（CoRL 2024）：用部署策略滚数据训练腿—惯性里程计的代表，本文主要对照对象
- AirIO（RA-L 2025）、Frame Averaging（ICLR 2022）：体坐标系 IMU 表示与镜像平均的来源
