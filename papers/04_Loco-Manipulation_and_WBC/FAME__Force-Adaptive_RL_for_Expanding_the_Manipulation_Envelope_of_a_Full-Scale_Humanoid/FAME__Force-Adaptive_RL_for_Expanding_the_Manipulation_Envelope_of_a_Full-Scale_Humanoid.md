---
layout: paper
title: "FAME: Force-Adaptive RL for Expanding the Manipulation Envelope of a Full-Scale Humanoid"
zhname: "FAME：扩展全尺寸人形操作包络的力自适应强化学习"
category: "Loco-Manipulation and WBC"
arxiv: "2603.08961"
---

# FAME: Force-Adaptive RL for Expanding the Manipulation Envelope of a Full-Scale Humanoid
**让人形的下肢站立策略「知道手上受了多大的力」：用一个小 MLP 把上半身 15 个关节角和左右手腕 3D 力编码成 8 维潜变量 $z_t$，拼进站立策略的观测；训练时在两只手上施加球面均匀采样的随机力，并配合上半身姿态课程；部署时手腕力由关节力矩和雅可比反解得到，不需要腕部力传感器。仿真里五种手臂构型的平均站立成功率从 29.44%（Base）/ 51.40%（只加课程）提升到 73.84%，并在全尺寸 Unitree H12 上完成了单臂偏载和双臂负重实验。**

> 📅 总结日期: 2026-09-28
>
> 🏷️ 板块: 04 Loco-Manipulation & WBC · 力自适应站立 · RMA 式潜变量上下文 · 上半身姿态课程 · 无传感器力估计 · Unitree H12
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → ~~14_Human_Motion~~ → **04_Loco-Manipulation_and_WBC**）· 14_Human_Motion 中上游 awesome-humanoid-robot-learning 收录的论文已全部有笔记，按 AGENTS.md「模块 04–14 只为上游已收录论文建笔记」顺延到 04；FAME 是 04 模块上游已收录、尚无笔记的最新论文（2026.03，🌟）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2603.08961](https://arxiv.org/abs/2603.08961) |
| HTML | [在线阅读（arXiv HTML 视图）](https://arxiv.org/html/2603.08961v1) |
| PDF | [下载](https://arxiv.org/pdf/2603.08961v1) |
| **发布时间** | 2026-03-09（arXiv v1） |
| 项目主页 | [fame10.github.io/Fame](https://fame10.github.io/Fame/)（含视频与补充材料） |
| 源码 | 🌟 [github.com/correlllab/h12_adaptive_policy](https://github.com/correlllab/h12_adaptive_policy)（部署侧代码：MuJoCo 独立运行器、DDS 实机控制器、编码器 / 策略权重 `fame_policy/*.pt`；**训练代码未包含在该仓库**） |

**作者**：Niraj Pudasaini, Yutong Zhang, Jensen Lavering, Alessandro Roncone, Nikolaus Correll（University of Colorado Boulder）

---

## 🎯 一句话总结

人形双手搬东西时，手上的力会顺着运动链一路传到脚下，让它站不稳。能承受多大的手部力、在什么手臂姿态下还站得住，作者把这个范围叫作**操作包络（manipulation envelope）**。FAME 借用 RMA 的做法，把「上半身姿态 + 双手腕力」编码成一个低维上下文喂给下肢站立策略，让策略看得出扰动的方向和大小，并据此调整腿部。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| FAME | Force-Adaptive Manipulation Envelope | 本文方法：力自适应的站立策略 |
| RMA | Rapid Motor Adaptation | 把环境因素编码成潜变量、让策略在线自适应的框架 |
| HIM | Hybrid Internal Model | 本文 actor 采用的「估计器 + 策略头」结构（来自 HIMLoco / OpenHomie） |
| DDS | Data Distribution Service | Unitree 机器人底层通信协议（`rt/lowcmd`、`rt/lowstate`） |
| C1–C5 | Configuration 1–5 | 仿真评测用的五种固定手臂构型 |
| RE1 / RE2 | Real Experiment 1 / 2 | 真机实验：单臂偏载 / 双臂对称负重 |

---

## ❓ 论文要解决什么问题？

1. **手上的力会破坏站立平衡**：双臂操作时，外力的大小、方向和手臂构型一起决定了传到下肢的力矩，这是一个高维且相互耦合的扰动。
2. **只靠鲁棒性不够**：站立策略如果只看本体感受，就要从关节角、角速度里「猜」出扰动来自哪里。只加上半身姿态课程（Base+Curr）时，面对不对称构型反而可能比 Base 更差（C5：56.0% vs 71.2%）。
3. **不想装腕部力传感器**：全尺寸人形的腕部 F/T 传感器贵且易损，希望直接从关节力矩估计手部受力。

---

## 🔧 方法拆解

**① 上半身上下文编码器 $\mu$**
- 输入 $\mathbf{x} _ {\mathrm{enc}} = [q _ {\mathrm{ub}}, \mathbf{F}_L, \mathbf{F}_R] \in \mathbb{R}^{21}$：15 个腰 + 双臂关节角，加左右手腕各 3 维力；
- MLP（21 → 256 → 128 → 8，ELU）输出 $z_t \in \mathbb{R}^{8}$，取最近 3 帧拼成 24 维，附加到 actor 观测上。

**② 训练期：球面采样的手部力**
- 方向 $\mathbf{u} = \mathbf{z} / \|\mathbf{z}\|_2$，其中 $\mathbf{z} \sim \mathcal{N}(\mathbf{0}, \mathbf{I}_3)$；大小 $r \sim \mathcal{U}(r _ {\min}, r _ {\max})$；施加 $\mathbf{F} = r\mathbf{u}$，得到各向同性、无偏的 3D 力分布（开源配置里每只手的力大小上限为 30 N）。

**③ 上半身姿态课程（沿用 OpenHomie）**
- 维护一个课程比例 $\rho_a \in [0,1]$，初始为 0；高度跟踪奖励超过阈值时增加 $\Delta\rho$；
- 每次重采样先抽一个辅助比例 $\rho_a'$（早期集中在 0 附近，$\rho_a \to 1$ 时趋于均匀，锐度 $\kappa = 20$），再对每个关节抽 $a_j \sim \mathcal{U}(0, \rho_a')$，在默认姿态附近按 $a_j$ 缩放的区间内采样目标角；每 1 s 重采样一次。

**④ 下肢站立策略（PPO，RSL-RL）**
- actor 观测：3 帧本体感受历史（每帧 76 维：指令 3 + 目标高度 1 + 角速度 3 + 重力投影 3 + 27 关节位置误差 + 27 关节速度 + 上一步动作 12）加 24 维 $z$ 历史，共 252 维；
- 采用 HIM 式结构：估计器 $\mathcal{E}$ 先预测 35 维隐状态，再与观测一起送入策略头 $\mathcal{N}$；critic 额外拿到特权的基座线速度；
- 输出 12 维腿部关节位置偏移 $\mathbf{q}^{\mathrm{tar}}_t = \mathbf{q}^{0} _ {\mathrm{lb}} + s_a \mathbf{a}_t$，由 50 Hz 的 PD 控制器跟踪；
- 奖励以基座高度跟踪 $\exp(-4 \mid h _ {\text{base}} - h _ {\text{cmd}}\|)$ 为主（权重 3.0），配合姿态、双脚接地、平滑性和安全约束等 20 多项惩罚。

**⑤ 部署期：无传感器力估计**
- 读取关节力矩 $\tau$，用 Pinocchio 在线算重力补偿力矩 $\tau_g$ 和手腕雅可比 $J$，得到
  $F _ {\mathrm{ext}} = -(J^{\top})^{\dagger}(\tau - \tau_g)$，
  再送进训练时那个编码器。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph TRAIN["🏋️ 训练（仿真）"]
        CURR["上半身姿态课程<br/>ρa 随高度跟踪奖励增长<br/>每 1 s 重采样 15 维目标角"]
        FS["球面采样手部力<br/>F = r·u，u 在单位球面上均匀"]
    end
    subgraph DEPLOY["🤖 部署（Unitree H12）"]
        TAU["关节力矩 τ · 关节角 q"]
        EST["Pinocchio 力估计<br/>F = −(Jᵀ)†(τ − τg)"]
    end
    ENC["上半身上下文编码器 μ<br/>[q_ub(15), F_L(3), F_R(3)] → z ∈ R⁸"]
    PROP["本体感受历史<br/>3 帧 × 76 维"]
    POL["下肢站立策略（PPO · HIM 结构）<br/>输入 252 维 → 12 维腿部动作"]
    PD["50 Hz 关节 PD<br/>q_tar = q0 + s_a·a"]
    OUT["✅ 在更大的手部力 / 手臂构型范围内站稳<br/>仿真平均成功率 73.84%"]

    CURR --> ENC
    FS --> ENC
    TAU --> EST --> ENC
    ENC -- "z 历史 (3×8)" --> POL
    PROP --> POL
    POL --> PD --> OUT

    style TRAIN fill:#fff7e0,stroke:#d4a017
    style DEPLOY fill:#eef6ff,stroke:#2e86de
    style ENC fill:#f3eafe,stroke:#8e44ad
    style OUT fill:#eafaf1,stroke:#27ae60,color:#1b1b1b
</div>

---

## 🖥️ 源码运行时序（correlllab/h12_adaptive_policy）

> 以 DDS 解耦控制器 `h12_adaptive_policy/deploy/manip_ik_demo_dds.py` 中的 `run_manip_dds()` 为例（同一份程序既可连 `h1_mujoco` 仿真，也可连真机）。控制循环 200 Hz，每 4 个 tick（`POLICY_DECIM = 4`）跑一次 50 Hz 的策略推理。编码器输入的手部力默认是任务 YAML 里的指令负载 `kg × g`（特权值），`force.use_force_estimator: true` 时改用 `RobotModel.get_frame_wrench` 从关节力矩估计；超过 30 N 的力在 `build_et_mujoco()` 里按原方向截断到训练范围内。

<div class="mermaid">
sequenceDiagram
    participant Main as main()
    participant Ctrl as run_manip_dds 控制循环
    participant DDS as DDS（rt/lowstate · rt/lowcmd）
    participant RM as RobotModel（Pinocchio）
    participant IK as 手臂 IK
    participant Enc as EnvFactorEncoder μ
    participant Pol as 站立策略 π

    Main->>Main: load_config(YAML) · 读取 force.use_force_estimator
    Main->>Enc: load encoder_3600.pt（21 → 8）
    Main->>Pol: load policy_3600.pt
    Main->>DDS: 订阅 LowState / SportModeState，初始化 LowCmd 发布器
    Main->>Ctrl: move_to_initial_pose()（默认上下半身姿态）
    Note over Ctrl: 第 1 次 ENTER：开始下肢平衡<br/>第 2 次 ENTER：记下骨盆位姿、手腕移到首个路点<br/>按 S：开始轨迹跟踪与记录

    loop 每个 tick（200 Hz）
        DDS-->>Ctrl: LowState 快照（q, dq, tau_est, IMU）
        Ctrl->>Ctrl: pelvis_from_imu() 计算骨盆位姿
        alt use_force_estimator = true
            Ctrl->>RM: get_frame_wrench("left/right_wrist_yaw_link", q, tau, imu)
            RM-->>Ctrl: 手腕力旋量 → 取反得到作用在手腕上的力
        else 默认（特权）
            Ctrl->>Ctrl: F = 指令负载 kg × g（仅作用在工作手）
        end
        opt 每 4 个 tick：手臂轨迹
            Ctrl->>IK: ik.step(骨盆系下的手腕目标)
            IK-->>Ctrl: 7 维手臂关节目标
        end
        opt 每 4 个 tick：策略推理（50 Hz）
            Ctrl->>Ctrl: compute_observation() → 76 维单帧，压入 3 帧历史
            Ctrl->>Ctrl: build_et_mujoco()：[q_ub(15), F_L, F_R]，力截断到 30 N
            Ctrl->>Enc: encoder(e_t)
            Enc-->>Ctrl: z_t ∈ R⁸，压入 3 帧 z 历史
            Ctrl->>Pol: policy([proprio(228), z(24)])
            Pol-->>Ctrl: 12 维腿部动作 → clip_policy_action()
        end
        Ctrl->>Ctrl: 拼 27 维目标（腿 12 + 腰/臂 15）
        Ctrl->>DDS: fill_low_cmd(q_des, kp, kd) · send_cmd()（经安全层发往 rt/lowcmd）
        Ctrl->>Ctrl: 记录骨盆漂移 / 倾角，判断是否摔倒
    end
</div>

---

## 📊 关键结果

**仿真（Table II）**：五种固定手臂构型，每只手施加随机力 $F_x, F_y \in [-20, 20]$ N、$F_z \in [-30, 30]$ N，目标基座高度在 0.7–1.0 m 间随机，共 500 组随机配置，保持站立 10 s 即算成功。

| 构型 | Base | Base+Curr | FAME |
|---|---|---|---|
| C1 前伸 | 0.0 | 61.2 | **81.6** |
| C2 半侧平举 | 0.0 | 30.2 | **50.0** |
| C3 全侧平举 | 31.8 | 52.4 | **72.6** |
| C4 接近全侧平举 | 44.2 | 57.2 | **79.6** |
| C5 不对称前伸 | 71.2 | 56.0 | **85.4** |
| **平均** | 29.44 | 51.40 | **73.84** |

- 手臂前伸、力臂长的构型（C1 / C2）里，Base 直接 0%；
- 只加课程在不对称构型 C5 上反而退步，作者认为原因是策略只能从本体感受隐式推断扰动；加入显式的力-构型上下文后，这个歧义被消除。

**真机（Unitree H12，27 DoF）**：RE1 单臂偏载、RE2 双臂对称负重。FAME 下髋俯仰、踝俯仰关节保持在名义站姿附近；Base+Curr 关节逐渐漂移，最终摔倒。真机部分只有定性结果，没有成功率统计。

---

## 💡 核心贡献

1. 把 RMA 式潜变量上下文用在**结构化的操作扰动**（上半身构型 × 双手力的耦合）上，而不是地形、摩擦这类环境变化；
2. 部署时用刚体动力学 + 雅可比伪逆从关节力矩估计手腕力，**不需要腕部 F/T 传感器**；
3. 仿真里平均站立成功率 73.84%，明显高于只加课程（51.40%）和 Base（29.44%）；
4. 在全尺寸 Unitree H12 上验证了单臂偏载与双臂负重场景。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **上下肢解耦的 WBC** | 手臂由 IK / 遥操作控制、腿部由 RL 负责平衡的分层架构很常见，FAME 给出一个低成本改进：把上半身的状态和受力显式告诉腿部策略 |
| **力估计替代传感器** | 关节力矩 + 雅可比的估计方式可以直接迁移到 G1、H1 等没有腕部 F/T 的平台，但估计精度受电机力矩噪声和模型误差影响 |
| **与同类工作的差异** | FALCON 用双智能体 + 3D 力课程追求能施加多大的力，Thor 通过躯干倾斜奖励最大化交互力；FAME 关心的是在不确定的手部载荷下站稳 |
| **局限** | 只做了站立（不行走）；仿真评测力幅度较小（≤ 30 N）；真机只有两个定性场景；开源仓库默认把指令负载当作特权力输入，真机力估计的效果还需要更多验证 |

---

## 🎤 面试参考

**Q：FAME 和原版 RMA 有什么不同？**
A：RMA 编码的是摩擦、质量、地形这类不可直接观测的环境参数，部署时需要一个适应模块从历史本体感受里回归潜变量。FAME 编码的是上半身关节角和手腕力，部署时关节角可以直接读，力用动力学估计，所以直接复用同一个编码器，不需要额外训练适应模块。

**Q：为什么只加姿态课程在不对称构型上反而变差？**
A：课程让上半身姿态更多样，但策略没有额外信息区分「这个扰动来自手臂姿态还是手上的力」，只能从本体感受隐式推断，容易学出保守或错配的稳定策略。显式输入力-构型上下文就消除了这种歧义。

**Q：$F _ {\mathrm{ext}} = -(J^{\top})^{\dagger}(\tau - \tau_g)$ 有什么假设？**
A：假设准静态（忽略惯性和科氏项），测得力矩里去掉重力补偿后，剩下的部分全部来自手腕外力；同时要求手腕雅可比不奇异。动态动作或关节摩擦较大时估计误差会变大。

---

## 🔗 相关阅读

- [RMA: Rapid Motor Adaptation for Legged Robots (2107.04034)](https://arxiv.org/abs/2107.04034)：潜变量上下文自适应的原始框架
- [FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation (2505.06776)](https://arxiv.org/abs/2505.06776)：双智能体 + 3D 力课程的对照路线
- [Thor: Towards Human-Level Whole-Body Reactions for Intense Contact-Rich Environments (2510.26280)](https://arxiv.org/abs/2510.26280)：力自适应躯干倾斜奖励
- [OpenHomie / HOMIE (2502.13013)](https://arxiv.org/abs/2502.13013)：本文沿用的上半身姿态课程与 HIM 式策略结构
