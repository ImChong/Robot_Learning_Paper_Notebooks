---
layout: paper
paper_order: 17
title: "ECO: Energy-Constrained Optimization with Reinforcement Learning for Humanoid Walking"
zhname: "ECO：把能耗写成硬约束的人形节能行走强化学习框架"
category: "Locomotion"
---

# ECO: Energy-Constrained Optimization with Reinforcement Learning for Humanoid Walking
**别再把能耗塞进奖励里调权重了：ECO 把电机能耗和步态对称性写成「不等式约束」，用 PPO-Lagrangian 边训练边把能耗压到给定预算，学出稳定又省电的人形行走**

> 📅 阅读日期: 2026-09-19
>
> 🏷️ 板块: Locomotion · 约束强化学习(CMDP) · 节能行走 · PPO-Lagrangian · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.06445](https://arxiv.org/abs/2602.06445) |
| HTML | [在线阅读](https://arxiv.org/html/2602.06445v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.06445) |
| 源码 | 🌟 [github.com/bigai-ai/ECO-humanoid](https://github.com/bigai-ai/ECO-humanoid)（含 ECO 与 PPO / IPO / P3O / CRPO 基线） |
| 项目页 | [sites.google.com/view/eco-humanoid](https://sites.google.com/view/eco-humanoid) |
| **发布时间** | 2026-02-06 (arXiv v1) |
| 收录 | IEEE T-ASE（Transactions on Automation Science and Engineering）接收 |

**作者**：Weidong Huang\*、Jingwen Zhang\*†、Jiongye Li、Shibowen Zhang、Jiayang Wu、Jiayi Wang、Hangxin Liu、Yaodong Yang、Yao Su†（\* 共同一作，† 通讯）

**机构**：BIGAI（北京通用人工智能研究院）· 北京大学等（代码托管于 `bigai-ai`）

**机器人**：kid-size 人形 **BRUCE**（约 70 cm / 4.8 kg，共 16 DoF：每腿 5、每臂 3，腿部执行器峰值扭矩约 10.5 N·m）

---

## 🎯 一句话总结

人形行走的「节能」以往要么塞进 RL 奖励里当一项、和一堆奖励抢权重，要么靠 MPC 在线优化——前者调参痛苦且能耗不可控，后者能耗偏高。ECO 换个思路：**把能耗直接写成不等式约束**（「平均电机功率 ≤ 预算」），把步态对称性也写成约束，任务奖励只留「走得稳、跟得上速度」，再用 **PPO-Lagrangian** 的原始-对偶更新，让拉格朗日乘子在训练中自动把能耗和对称性压到阈值以内。结果在仿真与真机 BRUCE 上，**能耗显著低于 MPC 与普通 PPO**（真机约省一半以上），并自发涌现出「少晃身、轻落脚、少屈膝」的省电步态。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| ECO | Energy-Constrained Optimization | 本文方法：把能耗当约束的优化框架 |
| CMDP | Constrained Markov Decision Process | 约束马尔可夫决策过程，带约束的 RL 建模 |
| PPO-Lag | PPO-Lagrangian | 拉格朗日版 PPO，用乘子把约束并入目标 |
| CoT / 电机功率 | motor power $\sum_j\lvert\tau_j\dot q_j\rvert$ | 逐关节「扭矩×关节速度」的绝对值之和，本文能耗度量 |
| IPO / P3O / CRPO | — | 三种约束 RL 基线（内点罚 / 惩罚 / 逐约束修正） |
| MPC | Model Predictive Control | 模型预测控制，传统对照方法 |
| Sim-to-Real | 仿真到真机 | 策略从仿真迁移到物理机器人 |

---

## ❓ 论文要解决什么问题？

人形机器人要在真实世界**长时间连续工作**，就绕不开「行走既要稳、又要省电」。现有做法有两条路，都不理想：

1. **RL + 奖励塑形**：把能耗当作奖励里的一项（`- w·energy`），和速度跟踪、姿态、平滑等十几项奖励一起加权。问题是**权重 `w` 极难调**——调小了不省电，调大了机器人为了省电干脆不好好走；而且最终「到底能耗多少」是训练完才知道的**副产品**，不可控、不可解释。
2. **MPC**：在线做带能耗项的多目标优化，但受限于模型精度和实时算力，实测能耗往往偏高，且难以处理复杂动力学。

ECO 的观察是：**能耗本质上是个「预算」问题，而不是「奖励」问题**。你想要的是「在能耗不超过某个物理阈值的前提下，把路走好」，这正是**约束优化**的语言，而不是把两者揉进一个加权和。于是它把问题重写成 **CMDP**：奖励只管「走得好」，能耗和对称性用**不等式约束**表达，阈值是有物理意义的（多少瓦、多少焦耳），一目了然、好调。

---

## 🔧 方法拆解

### 1. 建成 CMDP：奖励管「走好」，约束管「省电+对称」

- **任务奖励 $J_R$**：沿用 Humanoid-Gym 的 11 项奖励（速度跟踪、抬脚高度、躯干姿态、动作平滑等），**但把「能耗项」和「参考动作/对称项」从奖励里拿出来**，改成约束。
- **能耗约束 $C_1$**：以**逐关节电机功率的绝对值之和** $\sum _ {j=1}^{n}\lvert\tau_t^j\dot q_t^j\rvert$ 为瞬时能耗，其折扣累积

  $$J _ {C_1}(\pi_\theta)=\mathbb{E}\Big[\sum _ {t=0}^{T}\gamma^t\sum _ {j}\lvert\tau_t^j\dot q_t^j\rvert\Big]\le b_1$$

  阈值 $b_1$ 有物理意义：论文对 0.1 / 0.15 / 0.2 m/s 三档速度分别设 **60 / 70 / 80 J**（约合 2.5–3.3 W 平均功率）。
- **参考动作 / 镜像对称约束 $C_2$**：镜像一致性损失——**把观测左右镜像后，策略输出的动作也应当是镜像的**，用它逼出对称、稳定的步态，阈值 $b_2=0.05$。

### 2. 用 PPO-Lagrangian 解带约束的最大化

把约束用拉格朗日乘子并进目标，变成一个 min-max：

$$\max _ {\pi_\theta}\ \min _ {\lambda_1,\lambda_2\ge 0}\ J_R(\pi_\theta)-\sum _ {i=1}^{2}\lambda_i\big(J _ {C_i}(\pi_\theta)-b_i\big)$$

- **策略更新**：固定乘子 $\lambda$，按 PPO 的裁剪目标更新 $\pi_\theta$。
- **乘子更新**（原始-对偶）：约束越界（$J _ {C_i}>b_i$）就把 $\lambda_i$ 调大、加重惩罚；满足约束就让 $\lambda_i$ 衰减：

  $$\lambda_i^{k+1}=\max\Big\{0,\ \lambda_i^{k}-\beta_i(k)\big(J _ {C_i}(\pi_\theta^k)-b_i\big)\Big\},\quad \beta_i=10^{-3}\ (\text{Adam})$$

- 论文与 **CRPO / IPO / P3O** 三种约束 RL 方法对比，PPO-Lag 在人形上**收敛更稳、约束满足更干净**：能耗约 1500 iteration 收敛到 ~60 J 阈值，镜像对称收敛到 0.05。

### 3. 观测 / 动作 / 控制

- **观测**：40 维、堆叠 15 帧——速度指令、时钟相位、关节位置/速度、躯干角速度、上一步动作、欧拉角。
- **动作**：相对**标称关节位置**的偏移，经 PD 转成力矩（$K_p=\mathrm{diag}(7,10,7,10,1.5)$，$K_d=\mathrm{diag}(0.2,0.4,0.2,0.4,0.08)$）。
- **频率**：策略 **100 Hz**，仿真 / 真机执行器 **1 kHz**。
- **训练/迁移**：Isaac Gym 训练（4096 并行环境）→ MuJoCo / Gazebo sim-to-sim → BRUCE 真机 sim-to-real。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OBS["🦿 观测 (40维 × 15帧)"]
        O["速度指令 / 时钟相位<br/>关节位置速度 / 角速度<br/>上一步动作 / 欧拉角"]
    end

    subgraph POLICY["🎮 策略 π_θ (100Hz)"]
        A["Actor MLP<br/>→ 关节位置偏移"]
        PD["PD 控制器<br/>Kp/Kd → 力矩 (1kHz)"]
    end

    ROBOT["🤖 BRUCE / 仿真环境<br/>Isaac Gym·MuJoCo·Gazebo"]

    subgraph EVAL["📏 逐步计量"]
        R["任务奖励 J_R<br/>(速度跟踪·姿态·平滑, 11项)"]
        C1["能耗成本 C₁<br/>Σ#124;τ·q̇#124; ≤ b₁ (60/70/80J)"]
        C2["镜像对称成本 C₂<br/>≤ b₂ = 0.05"]
    end

    subgraph OPT["⚖️ PPO-Lagrangian 更新"]
        L["更新乘子 λ₁,λ₂<br/>越界↑ 满足↓ (原始-对偶)"]
        U["max_π J_R − Σ λ_i (J_Ci − b_i)<br/>PPO 裁剪目标更新 π_θ"]
    end

    O --> A --> PD --> ROBOT
    ROBOT --> R
    ROBOT --> C1
    ROBOT --> C2
    R --> U
    C1 --> L
    C2 --> L
    L --> U
    U -.更新后策略.-> A
    ROBOT -.下一帧观测.-> O

    style OBS fill:#fff7e0,stroke:#d4a017
    style POLICY fill:#e8f4fd,stroke:#1f78b4
    style EVAL fill:#f3e8fd,stroke:#8e44ad
    style OPT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 🧩 源码运行时序图（mermaid）

> 基于官方仓库 [`bigai-ai/ECO-humanoid`](https://github.com/bigai-ai/ECO-humanoid)（legged_gym / Humanoid-Gym 风格框架）。训练入口
> `bruce_gym/scripts/train.py`，任务名 `bruce_ppolag` 即 ECO；评估 `play.py`（Isaac Gym）、`sim2sim_bruce.py`（MuJoCo）、`gazebo/test_checkpoint.py`（真机）。
>
> ```bash
> # 训练 ECO（PPO-Lagrangian）
> python bruce_gym/scripts/train.py --task=bruce_ppolag --headless \
>   --run_name=eco_ppolag --sim_device=cuda:0 --rl_device=cuda:0
> # 评估 / 迁移
> python bruce_gym/scripts/play.py         --task=bruce_ppolag   # Isaac Gym 回放
> python bruce_gym/scripts/sim2sim_bruce.py --task=bruce_ppolag   # MuJoCo sim-to-sim
> ```

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户/CLI
    participant T as train.py
    participant REG as task_registry
    participant ENV as BruceWalk 环境<br/>(Isaac Gym, 4096并行)
    participant RUN as PPOLag Runner
    participant ALG as PPO-Lagrangian
    participant NET as Actor-Critic

    U->>T: python train.py --task=bruce_ppolag
    T->>REG: make_env(name="bruce_ppolag")
    REG-->>ENV: 按 brucewalk_config 建环境
    T->>REG: make_alg_runner(env, name)
    REG-->>RUN: 建 Runner + PPOLag(λ₁,λ₂,阈值b₁,b₂)
    T->>RUN: learn(max_iterations)

    loop 每个训练 iteration
        loop rollout 采样 (num_steps)
            RUN->>NET: act(obs) → 关节位置偏移
            NET-->>RUN: action
            RUN->>ENV: step(action)
            ENV->>ENV: PD→力矩(1kHz), 物理仿真
            ENV-->>RUN: obs', reward(J_R), cost(C₁能耗, C₂对称), done
            RUN->>RUN: 存入 rollout buffer
        end
        RUN->>ALG: update(buffer)
        ALG->>ALG: 算优势(奖励)与成本优势(C₁,C₂)
        ALG->>ALG: 更新乘子 λ_i ← max(0, λ_i − β(J_Ci − b_i))
        ALG->>NET: 按 max J_R − Σλ_i(J_Ci−b_i) 做 PPO 裁剪更新
        NET-->>ALG: 新参数
        ALG-->>RUN: loss / 约束满足情况
        RUN->>RUN: 定期存 checkpoint
    end
    RUN-->>U: 导出策略 → play/sim2sim/真机部署
</div>

---

## 💡 核心贡献

1. **能耗从「奖励项」升格为「显式约束」**：用 CMDP 把「省电」表达成不等式约束，阈值是物理量（焦耳/瓦），可解释、好调，且训练完能耗**可控地落在预算内**，而非碰运气的副产品。
2. **能耗 + 参考动作对称双约束**：能耗约束控功率，镜像对称约束逼出稳定对称步态，二者都靠拉格朗日乘子在训练中自适应满足。
3. **PPO-Lagrangian 在人形上的稳定实现**：与 CRPO / IPO / P3O 系统对比，PPO-Lag 收敛更稳、约束满足更干净。
4. **真机 sim-to-real 验证 + 涌现省电行为**：BRUCE 上能耗远低于 MPC 与普通 PPO，并自发出现少晃身、轻落脚、少屈膝等省电步态，无需手工设计「高效步态」启发式。
5. **开源**：ECO 与 PPO / IPO / P3O / CRPO 基线一并放出，方便复现与对比。

---

## 📊 关键结果

| 场景（0.1 m/s 行走，平均电机功率） | MPC | PPO(奖励塑形) | **ECO** |
|---|---|---|---|
| 仿真（Gazebo，10 s） | 9.27 W | 3.15 W | **2.37 W** |
| 真机 BRUCE | 9.12 W | 3.91 W | **1.75 W** |

- 真机上 ECO 约为普通 PPO 的 **1/2.3**、MPC 的 **1/6** 能耗，同时保持鲁棒行走。
- **约束满足**：能耗约 1500 iteration 收敛到 ~60 J 阈值；镜像对称收敛到 0.05 阈值。
- 迁移链：Isaac Gym 训练 → MuJoCo / Gazebo → BRUCE 真机，均稳定行走且能耗一致下降。

> ⚠️ 具体数值以论文最终版为准；上表为结构性摘录。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **续航 / 长时运行** | 电机能耗直接决定人形的续航与热管理，约束式节能对「连续工作」的真机落地价值高 |
| **调参范式** | 把「难调的奖励权重」换成「有物理意义的约束阈值」，是一套可推广到力矩、冲击、关节限位等其它指标的通用范式 |
| **约束 RL 落地** | 在真实人形上系统比较 PPO-Lag / CRPO / IPO / P3O，为约束 RL 在机器人上的选型提供了实证参考 |
| **对称先验** | 用镜像对称约束替代手工步态奖励，提供了一条「少设计、靠约束」逼出自然步态的思路 |

---

## 🎤 面试参考

**Q：为什么把能耗当约束比当奖励项好？**
A：当奖励项时，能耗和十几项奖励抢一个加权和，权重极难调，而且「最终能耗多少」是训练完的副产品、不可控；当约束时，你直接规定「平均功率 ≤ 某个瓦数」，阈值有物理意义、好调，优化目标也解耦——奖励只管走得好，约束负责把能耗压进预算，训练完能耗可控地落在阈值附近。

**Q：PPO-Lagrangian 的乘子在干什么？**
A：乘子 $\lambda_i$ 是约束的「价格」。约束越界（能耗超预算）就把 $\lambda_i$ 调大，等价于在目标里加重对能耗的惩罚，逼策略省电；一旦满足约束，$\lambda_i$ 自动衰减，避免过度牺牲任务表现。这套原始-对偶更新让「省电」的力度自适应，不用人手调能耗权重。

**Q：为什么还要一个镜像对称约束？**
A：纯能耗约束可能把步态压得又慢又怪。镜像对称约束要求「观测左右镜像后动作也镜像」，逼出左右对称、周期稳定的步态，相当于用一个几何先验替代大量手工步态奖励，让省电的同时步态依然自然稳定。

**Q：和 MPC 比，ECO 的优势来自哪里？**
A：MPC 受模型精度与实时算力限制，能耗项只能在有限预测窗口里在线优化，实测功率偏高；ECO 是离线训练出的神经策略，把能耗约束「烧进」策略参数，推理时零额外优化开销，真机实测能耗约为 MPC 的 1/6。

---

## 🔗 相关阅读

- [Biomechanical Comparisons Reveal Divergence of Human and Humanoid Gaits (2602.21666)](https://arxiv.org/abs/2602.21666)：从生物力学看人形步态与人的差异，与「节能/自然步态」互补
- [HoRD: Robust Humanoid Control via History-Conditioned RL and Online Distillation (2602.04412)](https://arxiv.org/abs/2602.04412)：鲁棒人形控制的另一条 RL 路线
- [Tac4Loco: Spatiotemporal Plantar Pressure Representations for Humanoid Locomotion (2608.15766)](https://arxiv.org/abs/2608.15766)：足底触觉反馈的鲁棒行走，与「省电行走」关注点不同但同属 Locomotion 主线
- [Learning Sim-to-Real Humanoid Locomotion in 15 Minutes (2512.01996)](https://arxiv.org/abs/2512.01996)：极快 sim-to-real 行走，工程视角的对照
