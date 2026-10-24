---
layout: paper
title: "Contact-UAN: Unsupervised Actuator Networks as a Residual World Model for Humanoid Control"
zhname: "Contact-UAN：面向人形控制的无监督执行器网络残差世界模型"
category: "Sim-to-Real"
arxiv: "2610.18991"
---

# Contact-UAN: Unsupervised Actuator Networks as a Residual World Model for Humanoid Control
**在仿真器的关节目标上加一个学出来的残差 $\delta q_t$，只修执行器、不碰刚体与接触；训练信号是「把真机录的指令在仿真里回放，让关节轨迹对上」。人形带接触回放的难点是起点：软接触仿真里脚差 2 mm 法向力就差一半，所以先用只吃本体感受的估计器推断「仿真里该让脚陷进去多少、斜多少」，再从这个接触一致的状态开始回放。6.5 分钟真机走路数据训出的一个 UAN，让跑步、力控、跳跃策略都能直接上 G1**

> 📅 总结日期: 2026-10-24
>
> 🏷️ 板块: 10 Sim-to-Real · 残差世界模型 · 执行器网络 · 接触一致回放 · 本体感受状态估计 · Unitree G1 · CoRL 2026
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）· 取本模块尚无笔记的最新论文（2026.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.18991](https://arxiv.org/abs/2610.18991) |
| HTML | [arxiv.org/html/2610.18991v1](https://arxiv.org/html/2610.18991v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.18991v1) |
| 项目主页 | [contact-uan.csail.mit.edu](https://contact-uan.csail.mit.edu/) |
| 源码 | [nolie-rolie/contact-uan](https://github.com/nolie-rolie/contact-uan)（基于 [mjlab](https://github.com/mujocolab/mjlab)，含 WTW 采数据、六个估计器、重标注、UAN 训练、下游任务与部署脚本；不含预训练权重与真机数据，笔记对照的是 2026-10-15 的 `55de136`） |
| **发布时间** | 2026-10-13（arXiv v1） |
| 状态 | CoRL 2026 录用；RSS 2026 Robot World Models 研讨会最佳论文、Closing the Sim2Real Gap 研讨会口头报告 |

**作者**：Nolan Fey\*, Khai Nguyen\*, Yash Prabhu, Gabriel B. Margolis, Pulkit Agrawal（MIT Improbable AI Lab；\* 共同一作）

**平台**：29 自由度 Unitree G1；标称仿真器是 mjlab 里的 BeyondMimic G1 参数（PD 增益、厂家给的转子惯量），不做额外的 SysID

---

## 🎯 一句话总结

Contact-UAN 不重建整个世界模型，只在仿真器的关节位置目标上加一个学出来的残差，修正执行器误差，解决仿真策略上真机后「动作像，力不对」（跑步费扭矩、力控跟不准、跳跃落地失败）的问题。残差 $q^{cmd}_t = q^{base}_t + \delta q_t$ 用 PPO 训练，让「真机录的指令在仿真里回放」得到的关节轨迹对上真机；关键是回放起点要**接触一致**——用只靠 IMU 和关节读数的估计器，推断仿真里支撑脚该有的微小下陷和倾斜，让仿真的接触力从第一步起就和真机一样。只用 6.5 分钟真机走路数据，冻结的 UAN 让下游策略：3 m/s 跑步扭矩用量降 20%，力跟踪误差降 42.8%，柔顺 / 阻抗控制和更高的跳跃都直接迁移。

---

## 📌 英文缩写速查

| 缩写 / 术语 | 全称 | 解释 |
|---|---|---|
| UAN | Unsupervised Actuator Network | 不需要扭矩传感器标签的执行器网络，输出关节目标残差 |
| Actuator Net | Supervised Actuator Network | ANYmal 那种用实测扭矩监督的执行器网络 |
| RWM | Robotic World Model | 完全学出来的动力学模型（对照：RWM-U） |
| WTW | Walk These Ways | 带步频、抬脚高度等行为指令的行走策略，这里拿来在真机上采数据 |
| DR | Domain Randomization | 域随机化；UAN 策略去掉了机器人相关的随机化 |
| Contact wrench | — | 接触力与力矩；软接触模型里取决于脚的下陷深度和倾角 |
| Projected gravity | — | 重力方向在某个坐标系里的投影，估计器用它表示支撑脚的朝向 |

---

## ❓ 论文要解决什么问题？

1. **「动作迁移」不等于「力迁移」**：解析仿真器对扭矩饱和、随负载变化的非线性摩擦等执行器效应近似得很粗，策略优化会钻这些空子。准静态动作可能看不出来，但高速跑、力控、起跳和落地都靠执行器在对的时刻给出对的力。
2. **现有修补办法各有代价**：域随机化让策略保守、用不满硬件；SysID / 在线自适应要先决定随机或辨识哪些参数；完全学习的世界模型要拟合全部机器人—环境动力学，数据量大（论文附录用 33 小时数据的 RWM-U 也比不过 5 分钟数据的 UAN）。
3. **残差回放的隐藏前提**：不用扭矩传感器时，残差模型的训练信号是「从真机状态出发回放真机指令」。但这只有在仿真起点和真机等价时才成立。悬空动作只是运动学问题；**带接触**时，真机站着的重力由地面反力平衡，把仿真里的脚正好放在地面上并不能复现这个力——软接触模型需要脚微微陷下去。起点不对，残差就会去学「修正重置伪影」，而不是执行器误差。

**目标**：只用机载本体感受（无扭矩传感器、无力传感器、无动捕），从带接触的真机数据里学一个执行器残差，让下游力敏感任务直接迁移。

---

## 🔧 方法拆解

### 1. 接触一致的回放起点（第 2.1 节、附录 A）

- **估计什么**：不估计接触力本身（力不能直接拿来设仿真状态），而是直接回归「仿真侧的支撑脚位姿」——让软接触模型产生同样力的那个下陷高度与倾角；外加基座线速度，补齐重置状态。
- **六个独立估计器**，都在仿真里训练、假设平地、用对根部 xy 和偏航不变的坐标系，输入是 3 帧（60 ms）的 IMU、关节状态和上一步关节目标（279 维）：
  - 基座线速度 1 个（256-256-256，MSE）；
  - 接触状态 1 个（128-128，两只脚的 logits，BCE）；
  - 支撑脚高度左右各 1 个、支撑脚投影重力左右各 1 个（256-256-256，MSE）。
- **只在支撑相训练位姿回归**：摆动脚的位姿变化大但对接触力没贡献，混进去会主导损失；只用支撑样本，接触高度 RMSE 降一个数量级（图 5A）。
- **不输入绝对基座高度**：否则估计器会直接抄高度来降低仿真损失，而真机高度和「仿真里产生同样接触力的高度」未必相同。
- **加权融合**（式 4–6）：接触概率 $\hat p_i \ge p _ {th}$ 的脚才算数，权重 $w_i = \hat p_i \mathbb{1}[\hat p_i \ge p _ {th}]$，归一化成 $\alpha_i$；每只脚经正运动学给出一个根部高度候选 $\hat z^{(i)} = \hat h_i - h^{fk}_i(z{=}0)$ 和一个根部投影重力候选，按 $\alpha_i$ 加权。没有一只脚可信触地的窗口直接丢掉。

### 2. UAN：残差世界模型（第 2.2 节）

- **改输入、不改状态**：$\min \mathbb{E}\,\|f(s_t,a_t) - f _ {sim}(s_t, a_t + \mu(o^\mu_t))\|^2$。实现上是在关节位置目标上加 $\delta q_t$；UAN 训练时 $q^{base}$ 是录下的真机目标，下游训练时是策略输出。刚体动力学、执行器实现、接触求解和积分都原样保留。
- **观测很小**：每个关节只看最近 $H_\mu = 3$ 步（60 ms）的「目标 − 实际」误差和关节速度，限制成局部执行器信息，避免过拟合。
- **按电机型号共享参数**：G1 的 29 个关节分成 5 种执行器（7520-14 / 7520-22 / 5020 双电机 / 5020 / 4010），每种一个 6 → 128 → 128 → 1 的 ELU MLP。
- **数据**：先在标称仿真里（带 DR）训一个 WTW 式行走策略，上真机跑 6.5 分钟，不断换步频（1.0–2.5 Hz）、抬脚高度（0.05–0.1 m）、速度指令，得到不同的支撑时长、摆动速度和冲击。
- **训练**：回放环境，4096 个并行环境，每个回合从随机一个已重标注的窗口出发，3 步预热观测历史后回放 24 步（480 ms）录下的目标；PPO 奖励 = 关节位置 MSE（代码权重 −1000）+ 关节速度 MSE（−0.1）+ 残差变化率（−0.01），残差裁剪到 ±1 rad。

### 3. 下游策略（第 2.3 节）

- UAN 冻结、确定性地插在策略和仿真器之间；策略输出关节目标，仿真吃的是加了残差后的目标。
- 去掉所有机器人相关的 DR（PD 增益、转子惯量、执行器延迟、编码器偏置、质心等），只保留地形、地面摩擦和外推。基线策略按 BeyondMimic 的做法保留这些随机化。
- 部署时真机上只跑策略，UAN 和估计器都不上机。
- 四类下游任务：mjlab 的 G1 速度跟踪（跑步）、全身末端力控（再接一个 PD 外环做阻抗位置控制）、参考动作跟踪的跳跃 + 任务奖励微调跳高。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S0["0. 采数据"]
        W["标称仿真（BeyondMimic G1 参数）+ DR<br/>训 WTW 式行走策略"]
        HW["真机 G1 跑 6.5 分钟<br/>变步频 / 抬脚高度 / 速度"]
        LOG["记录本体感受<br/>角速度、投影重力、关节位置 / 速度、关节目标"]
        W --> HW --> LOG
    end

    subgraph S1["1. 接触一致重标注（离线）"]
        SIMD["同一 WTW 策略在平地仿真采估计器数据<br/>4096 环境 × 20 s"]
        EST["六个估计器（3 帧 · 279 维输入）<br/>基座速度 · 接触 · 左右支撑脚高度 · 左右支撑脚朝向<br/>位姿回归只用支撑样本、不给绝对高度"]
        FUSE["按接触概率加权融合（p ≥ 0.8）<br/>得到根部高度、横滚 / 俯仰、基座速度"]
        SIMD --> EST
        LOG --> FUSE
        EST --> FUSE
    end

    subgraph S2["2. 训练 UAN（PPO）"]
        RST["从重标注窗口重置仿真<br/>脚有正确的下陷与倾斜"]
        REP["回放 24 步真机目标 q_hw<br/>q_cmd = q_hw + δq"]
        UAN["UAN：5 种电机各一个 MLP<br/>输入 3 步 (目标−实际, 关节速度)"]
        RW["奖励：关节位置 / 速度 MSE + 残差变化率"]
        RST --> REP --> RW
        UAN --> REP
        RW -.PPO 更新.-> UAN
    end

    subgraph S3["3. 下游策略与部署"]
        POL["任务策略输出 q_base"]
        FROZ["冻结 UAN 加 δq<br/>去掉机器人相关 DR"]
        TASK["跑步 · 力控 / 阻抗 · 跳跃"]
        DEP["真机只跑策略"]
        POL --> FROZ --> TASK --> DEP
    end

    FUSE --> RST
    UAN -->|冻结| FROZ
</div>

---

## 🚶 具体实例

### 例 1：毫米级误差有多大（第 2.1 节、图 3）

论文在自己的 MuJoCo 接触参数（`solref = [0.02, 1]`，`solimp = [0.9, 0.95, 0.001, 0.5, 2]`）下做敏感性诊断：G1 站立时根部高度 **+2 mm**，法向力约**减半**；俯仰 **−2°**，支撑力矩变化约 **45%**。也就是说，就算用动捕拿到了「真实」高度，直接塞进仿真也不一定能产生真机那样的支撑力；要的是「仿真里产生同样力的那个高度」，所以估计器直接回归仿真侧的下陷位姿。

### 例 2：两只脚的加权融合（式 4–6）

下面是**假设的数值**，只为演示公式。阈值取附录 B 的 $p _ {th} = 0.8$。

- **单脚支撑**：$\hat p_L = 0.95$，$\hat p_R = 0.30$。右脚低于阈值，$w_R = 0$，所以 $\alpha_L \approx 1$。左脚估计下陷 $\hat h_L = -0.002$ m，根部高度为 0 时正运动学给出脚高 $h^{fk}_L = -0.780$ m，于是 $\hat z = -0.002 - (-0.780) = 0.778$ m。
- **双脚支撑**：$\hat p_L = 0.90$，$\hat p_R = 0.85$，两只脚给出 $\hat z^{(L)} = 0.778$ m、$\hat z^{(R)} = 0.782$ m。$\alpha_L = 0.90 / 1.75 = 0.514$，$\alpha_R = 0.486$，$\hat z = 0.514 \times 0.778 + 0.486 \times 0.782 \approx 0.780$ m。
- **两只脚都 < 0.8**：这个窗口不进 UAN 的初始状态池。

朝向同理：每只支撑脚预测「重力在脚坐标系的投影」，用正运动学转到根部坐标系后按同样的 $\alpha_i$ 加权再归一化，平地上它就决定了回放起点的横滚和俯仰。

### 例 3：扭矩用量怎么比（图 6）

在留出的真机跑步数据上，用同样的指令、同样的重标注起点，分别在标称仿真和 UAN 仿真里回放，算总扭矩用量 $U(\tau) = \sum _ {t,j}\|\tau _ {t,j} \mid $ 和相对误差 $ \mid U(\tau^{sim}) - U(\tau^{hw})\| / U(\tau^{hw})$。UAN 把这个误差降了 69.2%。因为两边的指令和起点完全一样，差异只能来自执行器模型。

---

## 📊 关键结果

| 实验 | 对比 | 结果 |
|---|---|---|
| 接触高度估计（困难 sim-to-sim，图 5A） | 全相位直接回归 vs. 只用支撑相 | RMSE 降一个数量级 |
| 真机回放 24 步关节位置 MSE（图 5B） | 直接估计重置 → 接触一致重置 → + UAN | 依次下降 |
| 真实初始化也有效（图 5C） | 同一 UAN，困难 sim-to-sim 用真值起点 | 关节 RMSE 0.0720 → 0.0184 rad：不是在补估计误差 |
| 跑步扭矩回放（图 6C） | 标称 vs. UAN | 总扭矩相对误差降 69.2% |
| 真机跑步（图 7A–B，30 ft 跑道，每档 5 次） | 1.0 / 2.0 / 2.5 m/s | 速度跟踪相当，扭矩用量降约 20%；3.0 m/s 指令 UAN 跑出 3.13 ± 0.06 m/s，基线几秒后触发电机过热保护进入阻尼模式 |
| 真机力控（图 7C，测力计 + 弹力带，每档 4 次） | 基线 vs. UAN | 力跟踪误差降 42.8 ± 12.1%，指令力越大优势越明显；零指令力时可被随意拉动 |
| 真机跳跃 | 参考跟踪 → 任务奖励微调跳高 | 跟踪阶段两者都能迁移、UAN 跳得更高；微调后基线落地失败，UAN 能稳着陆、抗推 |
| 重置方式消融（困难 sim-to-sim，图 8A） | 直接估计 / 接触一致 / 真值 | 20 s 存活率 49.8% → 96.7%，真值 96.6–98.4% |
| 差距越大越有用（图 8B–C） | 易 / 中 / 难三档执行器扰动 | 基线随差距急剧变差，UAN 策略接近专家；加 5 分钟跑步数据几乎不再提升 |
| 对比完全学习的世界模型（附录 F） | RWM-U 用约 33 h vs. UAN 5 min | UAN 达到专家的 100% 回合长度，RWM-U 从零训 6.8%、微调 38.2% |

---

## 💡 核心贡献

1. **指出接触一致初始化是带接触残差回放的前提**：毫米级下陷、度级倾角就能让接触力差一半，起点不对残差会学错东西。
2. **只靠本体感受推断仿真侧支撑脚位姿**：先分类接触、只在支撑相回归、不给绝对高度、按接触概率融合。
3. **结构化的执行器残差**：只修关节目标通道，按电机型号共享小 MLP，用 PPO 无监督训练，不需要扭矩传感器。
4. **一次训练、多任务受益**：6.5 分钟走路数据的 UAN 泛化到跑步、力控、阻抗控制和跳跃，而且下游不再需要机器人相关的 DR。

---

## 🤖 对人形机器人领域的意义

- 把「执行器网络」从需要扭矩传感器的 ANYmal 式方案，推进到普通位置控制人形（G1 没有可靠的输出扭矩传感）也能用的版本。
- 和 [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html) 的 delta action 思路相近，但 ASAP 依赖动捕给出真值位姿，Contact-UAN 证明了没有动捕也能做带接触的残差回放，关键是要对齐的是「仿真里的接触力」，而不是「真实的高度」。
- 给「去掉 DR、换成更准的模型」这条路线（BeyondMimic、近期人形工作）补了一块：执行器这一层可以从少量数据里学出来，而不必手工辨识。
- 局限：每个关节独立建模，抓不到耦合执行器效应；没有建模电机温度（会随时间慢变）。

---

## 🛠️ 源码运行时序图（`nolie-rolie/contact-uan`）

按 `docs/SIM2REAL.md` 的七个阶段整理，脚本名取自仓库 `scripts/uan_pipeline/` 与 `src/mjlab/tasks/`。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户（uv run）
    participant TR as train（mjlab + rsl_rl）
    participant DEP as deploy/ 导出与控制器
    participant G1 as 真机 G1
    participant HP as hardware_pipeline.py
    participant CE as collect_estimator_data.py
    participant TE as train_estimators.py
    participant RL as relabel_hardware_stance_geometry_mjlab.py
    participant UAN as Mjlab-UAN-Rollout 任务
    participant DS as 下游任务（Velocity / ForceControl / Jumping）

    U->>TR: train Mjlab-WTW-Unitree-G1（标称仿真 + DR）
    TR-->>U: WTW_PT
    U->>DEP: export_mjlab_checkpoint_to_jit.py → WTW_JIT，verify_deploy_config.py
    DEP->>G1: 部署 WTW，操作员改步频 / 抬脚高度采数据
    G1-->>HP: 每次运行一个目录（state[i], action[i] → state[i+1]）
    HP->>HP: sync → inspect（画图、给出裁剪建议）→ 人工改 trim_manifest.json → trim
    U->>CE: 同一 WTW 在平地仿真 4096 环境 × 20 s
    CE-->>TE: estimator_training_data.pt（3 帧本体感受 + 接触 / 脚位姿 / 速度标签）
    TE->>TE: 训六个网络（速度 · 接触 · 左右脚高度 · 左右脚朝向），各导出 state_estimator.jit
    HP->>RL: trimmed/ 片段
    TE->>RL: 六个估计器
    RL->>RL: 校验输入历史 → 预测 → 按接触概率融合根部高度 / 朝向 → processed/
    U->>UAN: train Mjlab-UAN-Rollout-Unitree-G1（replay.data-dir = processed，horizon 24，require-contact-at-reset）
    loop 每次 PPO 迭代（24 步 rollout，共 2000 次）
        UAN->>UAN: reset_to_recorded_trajectory_state：从可信触地窗口重置
        UAN->>UAN: UANActor 按电机型号输出 δq，target = 录下的目标 + δq（±1 rad）
        UAN->>UAN: 奖励 −1000·关节位置 MSE − 0.1·速度 MSE − 0.01·残差变化率
    end
    UAN-->>U: UAN_PT（model_1999.pt）
    U->>DS: UAN_CHECKPOINT_PATH=UAN_PT train Mjlab-*-UAN-Unitree-G1
    DS->>DS: swap_in_uan_action：UANAugmentedJointPositionAction 冻结前向、每个物理子步写入修正后的目标
    DS->>DS: remove_robot_specific_training_dr：只留地形、摩擦、外推
    DS-->>DEP: 任务策略 checkpoint → 导出 JIT
    DEP->>G1: 只部署任务策略（UAN 与估计器不上机）
</div>

---

## 🎤 面试参考

**Q：为什么残差加在关节目标上，而不是直接预测下一个状态？**
A：加在输入通道上，仿真器的刚体动力学、接触、积分全部保留，模型只需学执行器那部分误差，数据需求小、也不容易被策略钻空子；而且策略和真机之间仍是原来的位置控制接口。论文附录里位置残差、扭矩残差和有监督扭矩模型在仿真对比中效果相近，位置残差的好处是不需要扭矩标签。

**Q：为什么不直接用动捕测脚的真实高度来重置？**
A：软接触仿真器里，同样的地面反力对应的是「仿真特有的」下陷和倾斜，真实高度放进去不一定产生同样的力；+2 mm 就能让法向力减半。所以要估计的是让仿真复现接触力的位姿。

**Q：估计器为什么只在支撑相训练位姿回归？**
A：摆动脚位姿变化大、对接触力没贡献，会主导损失；支撑相里很小的位姿差就会大幅改变接触力，正是重置需要精确的部分。只用支撑样本后接触高度 RMSE 降一个数量级。

**Q：怎么证明 UAN 学的是执行器误差，而不是在补偿起点估计误差？**
A：在 sim-to-sim 里用真值起点评同一个 UAN，残差仍把关节 RMSE 从 0.0720 降到 0.0184 rad。

**Q：只用走路数据，为什么能帮到跑步和跳跃？**
A：UAN 的输入是每个关节的局部跟踪误差和速度，学的是执行器本身的响应，和任务无关；WTW 数据通过变步频、抬脚高度覆盖了不同的支撑时长和冲击。sim-to-sim 里再加 5 分钟跑步数据几乎没有额外提升。

---

## 🔗 相关阅读

- [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html)：本文的标称 G1 参数与跳跃的参考跟踪都来自它
- [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)：用动捕真值训 delta action 残差，对照本文的「无动捕、接触一致回放」
- [Actuator Reality Shaping](../Actuator_Reality_Shaping_for_Zero-Shot_Sim-to-Real_Robot_Learning/Actuator_Reality_Shaping_for_Zero-Shot_Sim-to-Real_Robot_Learning.html)：同模块里另一篇从执行器侧缩小 sim-to-real 差距
- [SPI-Active](../SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration/SPI-Active__Sampling-Based_System_Identification_with_Active_Exploration.html)、[PACE](../PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots.html)：参数化 SysID 路线，对照本文的「学残差而非辨识参数」
- PROGRESS #388 [Learning Agile and Dynamic Motor Skills for Legged Robots](https://arxiv.org/abs/1901.08652)：有监督执行器网络的出处（尚无笔记）
