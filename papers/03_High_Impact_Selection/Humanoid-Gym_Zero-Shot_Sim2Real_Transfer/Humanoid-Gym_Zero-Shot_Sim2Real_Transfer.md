---
layout: paper
title: "Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer"
category: "高影响力精选 High Impact Selection"
subcategory: "Simulation Platform & Tools"
zhname: "Humanoid-Gym：面向人形机器人零样本 Sim2Real 的 RL 框架"
---

# Humanoid-Gym: Reinforcement Learning for Humanoid Robot with Zero-Shot Sim2Real Transfer
**Humanoid-Gym：面向人形机器人零样本 Sim2Real 迁移的 RL 框架**

> 📅 阅读日期: 2026-05-18
>
> 🏷️ 板块: 03_High_Impact_Selection / Simulation Platform & Tools
>
> 🧭 状态: 首版基础摘要（含 mermaid 流程图）；后续可补 reward 全表细节与 XBot-S/L 部署调参经验。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2404.05695](https://arxiv.org/abs/2404.05695) |
| **HTML** | [arxiv.org/html/2404.05695](https://arxiv.org/html/2404.05695) |
| **PDF** | [arxiv.org/pdf/2404.05695](https://arxiv.org/pdf/2404.05695) |
| **源码** | [roboterax/humanoid-gym 🌟](https://github.com/roboterax/humanoid-gym) |
| **项目页** | [sites.google.com/view/humanoid-gym](https://sites.google.com/view/humanoid-gym/) |
| **作者** | Xinyang Gu *, Yen-Jen Wang *, Jianyu Chen（* 共同一作） |
| **机构** | Shanghai Qi Zhi Institute · RobotEra · Tsinghua University |
| **发布时间** | 2024-04-08 (arXiv) |
| **关键词** | Humanoid locomotion, Isaac Gym, MuJoCo, sim-to-sim, sim-to-real, domain randomization, gait reward |

---

## 🎯 一句话总结

Humanoid-Gym 在 `legged_gym + rsl_rl` 之上，针对人形机器人补足了**周期性步态相位、对称步态奖励、特权 Asymmetric Actor-Critic、以及 Isaac Gym → MuJoCo 的 sim-to-sim 校准管线**，让一份在 GPU 上并行训练的策略可以零样本部署到 RobotEra XBot-S / XBot-L 真机上行走。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **PPO** | Proximal Policy Optimization | on-policy 强化学习算法，本框架的训练优化器 |
| **GAE** | Generalized Advantage Estimation | 偏差-方差折中的优势估计 |
| **POMDP** | Partially Observable Markov Decision Process | 真机部署是部分可观测 MDP |
| **AAC** | Asymmetric Actor-Critic | actor 用部分观测，critic 用全状态（含特权信息） |
| **DR** | Domain Randomization | 训练时随机化物理参数提升 sim-to-real 鲁棒性 |
| **DS / SS** | Double / Single Support | 双足支撑相 / 单足支撑相，组成完整步态周期 |
| **PD** | Proportional-Derivative | 关节侧低层控制器，1 kHz 跟踪策略给的目标位置 |

---

## ❓ Humanoid-Gym 要解决什么问题？

四足机器人 sim-to-real 已经有 `legged_gym`、`rsl_rl`、Hwangbo 2019、Lee 2020 等成熟管线，但人形场景：

1. **自由度更多、欠驱动更严重**：上身惯量大、足踝小、平衡裕度低，复用四足 reward 会出现高频抖动。
2. **步态约束强**：人形需要周期性双足交替、合理的支撑/摆动相，光靠速度跟踪会跑出"摇摆螃蟹步"。
3. **sim-to-real gap 比四足大**：执行器动力学、PD 增益、传感延迟、机械连杆柔度都更敏感。
4. **缺乏开源基准**：早期人形 RL 工作几乎都是闭源工程项目，社区很难复现。

Humanoid-Gym 的定位就是：**给人形 locomotion 一个等价于 `legged_gym` 的开源基线**，并且把 Isaac Gym → MuJoCo → 真机的整条链路打通、有标定。

---

## 🔧 方法详解

### 1. 训练框架：Asymmetric Actor-Critic + PPO

* **Actor 输入** $o _ {\le t}$：本体感知 + 周期时钟信号 + 速度命令（参见下表「Observation」列）。
* **Critic 输入** $s_t$：在 Actor 观测之外，补上仿真中的特权信息（摩擦、质量、外推力、跟踪误差、足端接触掩码、基座线速度等）。
* 用 PPO 裁剪损失（$c_1=0.8, c_2=1.2$）+ GAE($\lambda=0.95$) + value loss 联合训练，1e-5 学习率，8192 个并行环境。

| 通道 | 维度 | Actor obs | Critic state |
|------|----:|:--------:|:-----------:|
| Clock $(\sin t, \cos t)$ | 2 | ✓ | ✓ |
| Cmd $(\dot P _ {x,y,\gamma})$ | 3 | ✓ | ✓ |
| Joint pos $\theta$ | 12 | ✓ | ✓ |
| Joint vel $\dot\theta$ | 12 | ✓ | ✓ |
| Base 角速度 / 欧拉角 | 6 | ✓ | ✓ |
| Last action $a _ {t-1}$ | 12 | ✓ | ✓ |
| 摩擦 / 质量 / 推力 / 力矩 | 7 |   | ✓ |
| Tracking diff / Stance mask / Contact | 16 |   | ✓ |
| Base 线速度 | 3 |   | ✓ |

> Actor 把单帧 47 维堆 15 帧、Critic 把 73 维堆 3 帧，让网络隐式做状态估计。

### 2. 周期步态相位与 stance mask

人形不是"四条腿撑桌子"，必须用**显式步态相位**约束足底触地节奏：

* 一个步态周期 $C_T$ 划分成 DS-SS-DS-SS 四段；
* 给一对正弦参考 $\big(\sin(2\pi t/C_T),\cos(2\pi t/C_T)\big)$ 作为时钟特征喂给策略；
* 同时合成一段 0/1 的 **stance mask** $I_p(t)$，"该单足支撑还是双足支撑"由它给定；
* reward 里加一项 `Contact Pattern = exp(-∞ · ‖I_p - I_d‖²)`：实测接触掩码 $I_d$ 必须严格匹配 $I_p$，否则惩罚极大。

这一项是把"会走路"和"会乱跳"区分开的关键，比单独靠速度跟踪稳得多。

### 3. Reward 设计（4 大类）

总 reward $r_t = \sum_i \mu_i r_i$，各项围绕**速度命令、姿态稳定、步态匹配、能耗与平滑**展开：

| 类别 | 代表项 | 公式 / 说明 | 权重 |
|------|--------|------|----:|
| 速度跟踪 | Lin / Ang vel tracking | $\phi(\dot P^b - \mathrm{CMD}, 5)$ | 1.2 / 1.0 |
| 姿态稳定 | Orientation, Base height | $\phi(P^b _ {\alpha\beta},5)$、$\phi(z-0.7,100)$ | 1.0 / 0.5 |
| 步态匹配 | Contact Pattern | $\phi(I_p-I_d,\infty)$ | 1.0 |
| 关节正则 | Joint pos tracking, Default joint | $\phi(\theta-\theta^\star,2)$ | 1.5 / 0.2 |
| 能耗 / 平滑 | Energy, Action smoothness | $\|\tau\|\|\dot\theta\|$、$\|a_t-2a _ {t-1}+a _ {t-2}\|^2$ | -1e-4 / -0.01 |
| 接触保护 | Large contact | $\max(F-400, 0, 100)$ | -0.01 |

> 这是公开的"人形 locomotion reward 模板"，后续 HugWBC、Distillation-PPO 等工作基本都在这套结构上加项或减项。

### 4. Domain Randomization 范围

| 参数 | 范围 | 类型 |
|------|------|------|
| 关节位置 / 速度 | ±0.05 rad / ±0.5 rad/s | Gaussian 噪声 |
| 角速度 / 欧拉角 | ±0.1 rad/s / ±0.03 rad | Gaussian 噪声 |
| 系统延迟 | 0–10 ms | Uniform |
| 摩擦系数 | 0.1–2.0 | Uniform |
| 电机强度 | 95–105 % | Gaussian 缩放 |
| 负载 | ±5 kg | Gaussian 加性 |

注意它对**摩擦扫描非常激进**（0.1 像冰面，2.0 像粗糙橡胶），这也是零样本能扛住户外场景的原因之一。

### 5. Sim-to-Sim 校准（独门绝技）

GPU 端 Isaac Gym 跑得快但物理近似多，CPU 端 MuJoCo 准但慢。Humanoid-Gym 的做法是：

1. 先用 Isaac Gym 大规模并行训练；
2. 把策略迁到精心标定过的 MuJoCo 环境，对比"腿摆 sine 波"、"膝关节 / 踝关节相图"，反推校准 PD 增益、连杆惯量、阻尼；
3. 校准后的 MuJoCo 与真机轨迹高度重合，于是它就成了**真机的低成本代理**——没有真机的人也能用 MuJoCo 当回归测试。

控制频率：策略 100 Hz，PD 1 kHz；这与多数四足工作一致，但对人形需要更稳的延迟模型。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["📦 资产 & 数据准备"]
        D1["XBot-S/L URDF<br/>(1.2m / 1.65m)"]
        D2["关节限位 / PD 增益<br/>电机参数"]
        D1 --> D2
    end

    subgraph SIM["🚀 Isaac Gym 大规模并行训练"]
        S1["8192 envs<br/>策略 100 Hz / PD 1 kHz"]
        S2["Asymmetric Actor-Critic<br/>(15 帧 obs, 3 帧 priv)"]
        S3["PPO + GAE<br/>clip 0.8 / 1.2"]
        S4["Reward<br/>速度·姿态·步态·能耗"]
        S5["Domain Randomization<br/>摩擦 0.1–2.0 / 延迟 0–10ms"]
        S1 --> S2 --> S3
        S4 --> S3
        S5 --> S1
    end

    subgraph PHASE["🦶 步态相位约束"]
        P1["时钟 (sin t, cos t)"]
        P2["Stance Mask I_p(t)"]
        P3["Contact Pattern reward<br/>(I_p vs I_d 匹配)"]
        P1 --> S2
        P2 --> P3 --> S4
    end

    subgraph SIM2SIM["🧪 Sim-to-Sim 校准"]
        C1["MuJoCo 标定环境"]
        C2["对比腿摆 sine 波 / 相图"]
        C3["反推 PD / 惯量 / 阻尼"]
        C1 --> C2 --> C3 --> C1
    end

    subgraph REAL["🤖 真机零样本部署"]
        R1["XBot-S 1.2m"]
        R2["XBot-L 1.65m"]
        R3["平地 / 不平地形 行走"]
    end

    DATA --> SIM
    SIM -->|策略权重| SIM2SIM
    SIM2SIM -->|MuJoCo 通过| REAL
    SIM2SIM -.失败回炉.-> S5

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style SIM fill:#fdebd0,stroke:#e67e22
    style PHASE fill:#f4ecf7,stroke:#8e44ad
    style SIM2SIM fill:#fce4ec,stroke:#c2185b
    style REAL fill:#e8f8e8,stroke:#27ae60
</div>

---

## 🚶 具体实例

把 XBot-L 训练出来"原地起步—1 m/s 前进—回零"的最小可复现路径：

1. **资产**：从 RobotEra 提供的 XBot-L URDF 出发，配置 12 个驱动关节、PD 默认增益与初始姿态 $\theta_0$；
2. **环境**：用 Humanoid-Gym 自带 `humanoid_env.py`，开启 stance mask（左右脚周期 0.4 s）、Domain Randomization（摩擦 0.1–2.0、电机 ±5%）；
3. **训练**：8192 envs × 24 steps、批量 196608、4 小时左右 reward 收敛，平均跟踪误差 < 0.1 m/s；
4. **Sim2Sim**：把 ckpt 拖到 MuJoCo 环境跑 5 s sine 波摆腿，相图与真机近似；不近似就回去调 Isaac Gym 的延迟 / 摩擦区间；
5. **Sim2Real**：直接把 ONNX 推到机器人上的实时控制器，命令 1 m/s，机器人零样本走出，且能扛住推力、上斜坡和不平地。

---

## 🤖 工程价值

* **复现门槛低**：相比 ExBody、HumanPlus 等自研栈，Humanoid-Gym 几乎就是 `git clone + python train.py` 的体验，是大多数硕博士第一次跑通人形 RL 的脚手架。
* **步态相位写法可迁移**：只要换 URDF 和 PD 增益，Unitree H1 / G1、Booster T1、Fourier GR-1 都能套用，HugWBC、Distillation-PPO、PHUMA 训练管线都和它血缘很近。
* **Sim-to-Sim 思路提示性强**：它点醒了一件事——别只把 MuJoCo 当展示工具，标定后可以当 sim-to-real 的"准真机"。
* **AAC + 多帧堆叠**：对部分可观测人形来说几乎是默认配置，本框架给了一个干净的实现样本。

---

## 📁 源码对照

| 关注点 | 源码位置（roboterax/humanoid-gym） | 说明 |
|--------|------------------------------------|------|
| 训练入口 | `humanoid/scripts/train.py` | 选环境 → 选算法 → 启动并行训练 |
| 环境定义 | `humanoid/envs/custom/humanoid_env.py` | 观测、特权、reward、stance mask 都在这里 |
| Reward 配置 | `humanoid/envs/custom/humanoid_config.py` | 对照本笔记表 IV 的权重 $\mu_i$ |
| 域随机化 | 同 config 中的 `domain_rand` 段 | 摩擦、延迟、电机强度、负载范围 |
| Sim-to-Sim | `humanoid/scripts/sim2sim.py` | 把 Isaac Gym 训出的策略丢给 MuJoCo |
| 真机部署 | RobotEra 自家 deploy 工具（非开源全量） | 推荐用社区 fork（H1 / G1）参考 |

> 阅读建议：先把 `humanoid_env.py` 的 `compute_observations` 与 `_reward_*` 系列函数读一遍，对应本笔记的 Observation 表与 Reward 表，能立刻把"论文公式"和"几行 Python"对上号。

---

## 🎤 面试高频问题 & 参考回答

**Q1：Humanoid-Gym 跟 `legged_gym` / Isaac Lab 是什么关系？**

A：`legged_gym` 是 ETH RSL 开源的四足训练框架，Humanoid-Gym 借用了它的 `LeggedRobot` 抽象与 `rsl_rl` 训练器，但补上了人形需要的步态相位、Asymmetric AC、特权观测和 Isaac Gym↔MuJoCo 校准。Isaac Lab 是更新一代、面向 Omniverse/PhysX 5 的统一平台；Humanoid-Gym 偏重老 Isaac Gym preview，但思想可以平移到 Isaac Lab。

**Q2：为什么人形要显式给 stance mask，而不是让策略自己学？**

A：人形足底接触面积小、平衡裕度低，纯 reward shaping 让策略很容易陷入"原地小碎步"或"螃蟹式横移"等局部最优。stance mask 直接告诉策略"现在该单脚 / 双脚支撑"，再用 contact pattern reward 严厉惩罚不一致，相当于把双足周期性约束写进了 MDP，本质上是先验注入。

**Q3：Sim-to-Sim 的价值是什么？只跑 sim-to-real 不够吗？**

A：(1) 没有真机的研究者也能拿 MuJoCo 当真机回归；(2) MuJoCo 的接触模型与 Isaac Gym 不同，能暴露策略对引擎细节的过拟合；(3) 真机调参成本高，先在 MuJoCo 通过再上真机能显著降低硬件风险。

**Q4：Asymmetric Actor-Critic 在这里起什么作用？**

A：Critic 拿到摩擦、负载、推力等仿真特权信息，价值估计更准，PPO 优势就更稳；Actor 只能用本体感知，部署时不需要这些信息。本质上是在训练阶段"作弊"地估值，部署阶段"诚实"地控制。

**Q5：把它推到 H1 / G1 这类机器人需要改什么？**

A：(1) URDF / 关节顺序 / PD 默认值；(2) `default_joint_angles` 和 stance mask 的周期 $C_T$；(3) 域随机化范围要按真机电机和接触特性收窄；(4) 真机部署侧要写一份对齐 observation 计算的 ONNX 推理客户端；(5) reward 权重要小幅微调以避免抖动。

---

## 💬 讨论记录

* Humanoid-Gym 在工程上是"四足 RL 配方 → 人形版"的一个清晰中介，建议放在 `Learning_Quadrupedal_Locomotion` 与 `Real-World_Humanoid_Locomotion_with_RL` 中间阅读。
* 阅读时如果只想搞懂 sim-to-real，关注 reward + DR + sim2sim 三块；如果想做后续表达性 / WBC，应同时看 `Expressive_Whole-Body_Control` 和 `OmniH2O`，它们的底层 locomotion 假设几乎都建在 Humanoid-Gym 这套基线上。

---

## 📎 附录

### A. 与其他方向的关联

| 方向 | 关系 |
|------|------|
| `Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots` | sim-to-real RL 的祖师爷，Humanoid-Gym 把同思路推到人形 |
| `Learning_Quadrupedal_Locomotion_over_Challenging_Terrain` | 提供"特权 + 历史观测"的训练范式，这里直接复用 |
| `Real-World_Humanoid_Locomotion_with_RL` | 同期 Berkeley 工作，Humanoid-Gym 是它在开源框架侧的对照 |
| `Expressive_Whole-Body_Control_for_Humanoid_Robots` | 上半身表达性叠加在类似 locomotion 基线之上 |
| `Isaac_Lab_GPU_Simulation` | 下一代仿真平台，迁移路径清晰 |

### B. 参考来源

- arXiv: <https://arxiv.org/abs/2404.05695>
- HTML 版: <https://arxiv.org/html/2404.05695>
- PDF: <https://arxiv.org/pdf/2404.05695>
- 项目页: <https://sites.google.com/view/humanoid-gym/>
- 源码: <https://github.com/roboterax/humanoid-gym>
