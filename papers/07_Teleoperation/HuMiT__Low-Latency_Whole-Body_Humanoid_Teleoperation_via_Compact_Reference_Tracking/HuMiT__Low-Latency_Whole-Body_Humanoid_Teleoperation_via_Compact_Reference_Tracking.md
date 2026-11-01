---
layout: paper
title: "HuMiT: Low-Latency Whole-Body Humanoid Teleoperation via Compact Reference Tracking"
zhname: "HuMiT：基于紧凑参考跟踪的低延迟人形全身遥操作"
category: "Teleoperation"
arxiv: "2610.29903"
---

# HuMiT: Low-Latency Whole-Body Humanoid Teleoperation via Compact Reference Tracking
**部署时策略只看「根部高度 + 根部线 / 角速度 + 双腕双踝 4 个关键点在根坐标系下的 SE(3) 位姿」这一份当前帧的紧凑参考：在线不做重定向优化、不缓存未来帧，PICO 头显的人体骨架按 T 字姿势算出的逐段比例一缩放就直接喂给策略；训练时完整的离线重定向参考只给奖励、初始化和 critic 用，换来约 20 ms 的通信到推理延迟和 65 ms 的端到端延迟**

> 📅 阅读日期: 2026-11-01
>
> 🏷️ 板块: 07 Teleoperation · 全身遥操作 · 稀疏参考跟踪 · 低延迟 · 非对称 Actor-Critic
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.29903](https://arxiv.org/abs/2610.29903) |
| HTML | [在线阅读](https://arxiv.org/html/2610.29903) |
| PDF | [下载](https://arxiv.org/pdf/2610.29903) |
| 项目页 | [xiaohu-art.github.io/Track](https://xiaohu-art.github.io/Track/) |
| 源码 | [xiaohu-art/Track](https://github.com/xiaohu-art/Track)（MIT；基于 Isaac Lab + [active-adaptation](https://github.com/Agent-3154/active-adaptation) v0.4.2 的训练插件，只有任务 / 奖励 / 观测 / PPO，没有 PICO 遥操作与真机部署代码，见下文「源码运行时序图」） |
| **发布时间** | 2026-10-21（arXiv v1） |

**作者**：Liu Cao、Botian Xu、Ruoqu Chen、Jiajun Liu、Mingzhi Pei、Zihao Wang、Zhongyu Li、Mengdi Xu；单位：清华大学交叉信息研究院（IIIS）、香港中文大学、中国人民大学、清华大学人工智能学院、清华大学未央书院。

**定位**：和 [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html) 一样走「直接跟末端位姿、不在线重定向」的路线，但 HuMiT 只用 4 个关键点、单阶段 PPO（不蒸馏、不看未来帧），根部用高度 + 速度命令代替全局位姿锚定；和 [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)、[TWIST2](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html) 用同一套 PICO 前端比了端到端延迟。

---

## 🎯 一句话总结

全身跟踪策略通常要完整的关节角、各部位位姿甚至未来若干帧作为参考，遥操作时就得在线重定向、再攒一段未来帧，延迟累积到一两百毫秒。HuMiT 问「部署时真的需要完整参考吗」，答案是一份**紧凑参考目标（CRT）**就够：根部高度、根部线速度和角速度、双腕双踝 4 个关键点相对根部的位置与 6D 朝向，全部是当前帧。PICO 4 Ultra 头显 + 两个手柄 + 两个小腿追踪器给出 24 点骨架（约 80 Hz），开场 T 字姿势按 GMR 的做法算出逐段缩放比例 $\alpha_j$，位置乘比例、朝向原样传过去，不做 IK。训练时 AMASS / LAFAN1 / BONES-SEED 照样离线重定向成完整参考，但只给奖励、初始状态和 critic 用，actor 只看 CRT。结果：通信到推理约 20 ms，光流测的端到端延迟中位数 65 ms（SONIC 245 ms、SONIC-LL 145 ms、TWIST2 120 ms）；仿真跟踪精度与「看完整参考」的同款对照 HuMiT-Full 在 AMASS、BONES-SEED 上几乎一样，只在最动态的 LAFAN1 上成功率低 10 个点；真机 G1 接抛来的球 2/10（SONIC-LL、TWIST2 都是 0/10），搬水桶 9/10。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| HuMiT | —（论文未给出全称） | 本文系统 |
| CRT | Compact Reference Target | 紧凑参考目标：$h^r$、$\mathbf{v}^r$、$\boldsymbol\omega^r$ + 4 个关键点的 SE(3)，共 43 维 |
| $g _ {full}$ | Full reference | 离线重定向得到的完整参考：根部位姿与速度、12 个关键点位姿、29 个关节角与角速度 |
| SE(3) | Special Euclidean group | 三维刚体位姿（旋转 + 平移） |
| IK | Inverse Kinematics | 逆运动学；HuMiT 只在离线准备数据时用 |
| PPO | Proximal Policy Optimization | 训练算法，8192 个并行环境 |
| SR | Success Rate | 片段跑完且没触发提前终止的比例 |
| GMR | General Motion Retargeting | 缩放标定的出处（[Retargeting Matters](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)） |

---

## ❓ 这篇论文要解决什么问题？

1. **延迟**：遥操作延迟主要来自两处——逐帧的优化式重定向（还可能数值不稳、抖动），以及跟踪策略要求未来参考帧（10 帧 × 20 ms 就得先攒 200 ms）。
2. **上下身割裂**：外骨骼、踏板 / 摇杆方案下身另走一路，动态的全身配合做不出来。
3. **硬件门槛**：外骨骼、光学动捕要标定、限场地。

核心问题：**部署时策略的输入能压到多小，还保持跟踪精度？**

---

## 🔧 方法拆解

### 1. 紧凑参考目标（第 IV-A 节）

$$g _ {cpt} = \big[h^r_t,\ \mathbf{v}^r_t,\ \boldsymbol\omega^r_t,\ \{\mathbf{p}^r _ {t,j},\ \mathbf{R}^r _ {t,j}\} _ {j\in K_c}\big],\quad K_c = \{\text{左腕, 右腕, 左踝, 右踝}\}$$

根部高度是世界系离地高度，速度在根坐标系，关键点位姿相对根部、朝向用 6D 表示。**不含**关节角、其余 8 个关键点、全局位置和未来帧。

### 2. 从人到 CRT：只有缩放（第 IV-B 节）

- 消费级前端：PICO 4 Ultra + 2 个手柄 + 2 个绑在小腿上的 Motion Tracker，PICO 运行时推出 24 点 6-DoF 骨架，约 80 Hz、Wi-Fi 传到主机，穿戴不到一分钟。
- 每次开场摆 T 字姿势，按人和 G1 的肢段长度比算 $\alpha_j$：$\mathbf{p}^r _ {t,j} = \alpha_j\,\mathbf{p}^h _ {t,j}$，$\mathbf{R}^r _ {t,j} = \mathbf{R}^h _ {t,j}$；根部高度取缩放后的 $z$，速度对根部位姿做有限差分。全部是闭式运算。

### 3. 非对称 Actor-Critic 跟踪策略（第 IV-C 节）

- **离线**：每段动作（AMASS、LAFAN1、BONES-SEED，滤掉不可行片段，再加矢状面镜像）用 IK 重定向成 $g _ {full}$。
- **actor** 看 $[s _ {prop}, g _ {cpt}]$（根部角速度、重力投影、关节角 / 角速度、上一步动作）；**critic** 看 $[s _ {prop}, s _ {priv}, g _ {full}]$（多了根部线速度、各部位真实位姿和完整参考）。
- **奖励**（表 I）：$\sum_i w_i \exp(-e_i/\delta_i^2)$，根部位置 / 朝向各 1.0，关键点位置 / 朝向 / 线速度 / 角速度各 2.0，脚滑 −1.0、动作变化率 −0.2——用的是完整参考的 12 个关键点，「监督密、输入稀」是关键。
- 动作 $\mathbf{q} _ {target} = \mathbf{q}_0 + \sigma\mathbf{a}_t$ 再走 PD；提前终止：根部平移偏差 > 0.4 m、朝向偏差 > 0.8、关键点偏差 > 0.4 m；随机化推力、摩擦 / 恢复系数、连杆质量（末端更强，模拟小负载）、电机增益、armature、初始关节。
- 单阶段 PPO，Isaac Sim 里 8192 个环境，不蒸馏。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OFF["🗂️ 训练前（离线，一次）"]
        D["AMASS · LAFAN1 · BONES-SEED<br/>过滤不可行 + 矢状面镜像"]
        IK["优化式 IK 重定向到 G1"]
        GF["完整参考 g_full<br/>根部位姿 / 速度 · 12 关键点 · 29 关节角 / 角速度"]
        D --> IK --> GF
    end

    subgraph TRAIN["🏋️ Isaac Sim 训练（PPO · 8192 环境）"]
        CPT["抽子集 g_cpt（43 维）<br/>h · v · ω · 双腕双踝 SE(3)"]
        ACT["Actor π<br/>s_prop + g_cpt"]
        CRI["Critic V<br/>s_prop + s_priv + g_full"]
        RW["奖励：12 关键点位置 / 朝向 / 速度<br/>+ 根部锚点 + 脚滑 / 动作率"]
        INIT["参考状态初始化 + 提前终止"]
        GF --> CPT --> ACT
        GF --> CRI
        GF --> RW --> CRI
        GF --> INIT
    end

    subgraph DEPLOY["🎮 部署（在线，每帧）"]
        PICO["PICO 4 Ultra + 手柄 + 小腿追踪器<br/>24 点骨架 · ~80 Hz · Wi-Fi"]
        CAL["T 字姿势一次标定 α_j<br/>p^r = α_j · p^h，R^r = R^h"]
        CRT2["CRT（当前帧，无未来帧）"]
        POL["Actor π（同一个网络）"]
        PD["q_target = q0 + σ·a → PD → G1 29 DoF"]
        PICO --> CAL --> CRT2 --> POL --> PD
    end

    ACT -. 导出权重 .-> POL
    style CRI fill:#fde7c8,stroke:#d08a2c
    style POL fill:#d8ecff,stroke:#3b7dd8
</div>

> 读法：橙色的 critic 只在训练时存在，完整参考只流进它和奖励；蓝色的 actor 训练、部署是同一个网络，前后都只吃 CRT。部署链路里没有 IK、没有未来帧缓冲。

---

## 🚶 具体实例

### 例 1：CRT 有多少维

$1$（高度）$+ 3$（线速度）$+ 3$（角速度）$+ 4 \times (3 + 6)$（位置 + 6D 朝向）$= 43$ 维。作为对照，单是 29 个关节角加角速度就有 58 维，SONIC 还要乘以 10 个未来帧。

### 例 2：延迟账（表 II）

| 方法 | 缓冲 | 在线重定向 | 端到端 | 扣掉缓冲后 |
|---|---|---|---|---|
| SONIC | 10 帧 × 20 ms = 200 ms | ✗ | 245 ms | 45 ms |
| SONIC-LL | 4 帧 = 80 ms | ✗ | 145 ms | 65 ms |
| TWIST2 | 0 | ✓ | 120 ms | 120 ms |
| HuMiT | 0 | ✗ | 65 ms | 65 ms |

SONIC 从 10 帧减到 4 帧，少缓冲 120 ms，端到端正好少 100 ms；TWIST2 不缓冲但在线重定向，比 HuMiT 多 55 ms。（「扣掉缓冲后」一列是我们的减法，论文只给前三列。）HuMiT 的 65 ms 是三类动作 16 对峰值的合并中位数：出拳 78 ms（4 对）、下蹲 60 ms（5 对）、挥手 85 ms（7 对）；按对数加权平均 $(91\cdot4 + 63\cdot5 + 91\cdot7)/16 \approx 82$ ms，与论文的 83 ms 一致（差在各类均值的取整）。

### 例 3：奖励核的数值（按代码的 $\delta$）

代码里关键点位置的 $\delta = 0.3$ m（`SIGMA["tracking_kp_pos"] = 0.3**2`），误差取 12 个关键点平方误差的平均：若平均平方误差 $0.01\ \text{m}^2$（约 10 cm），这一项 $= e^{-0.01/0.09} \approx 0.895$；到 $0.04\ \text{m}^2$（约 20 cm）降到 $0.641$。朝向 $\delta = 0.4$ rad，平均偏 0.2 rad 时 $e^{-0.04/0.16} \approx 0.779$。核很宽，前期就有梯度。

---

## 📊 关键结果

**跟踪精度（表 III，仿真；$E _ {kp}$ mm、$E _ {jpe}$ rad、SR %）**

| 方法 | AMASS $E _ {kp}$ / SR | LAFAN1 $E _ {jpe}$ / SR | BONES-SEED $E _ {ang}$ / SR |
|---|---|---|---|
| SONIC（10 未来帧） | 316.0 / 79.8 | 0.097 / 20.0 | 0.295 / 98.2 |
| SONIC-LL（4 未来帧） | 400.5 / 59.5 | 0.110 / 15.0 | 0.384 / 96.5 |
| ScaleBFM-XL（6 未来帧） | **71.8** / **94.0** | 0.097 / 32.5 | 0.403 / **98.7** |
| ExtremControl | 329.5 / 60.1 | 0.203 / 0.0 | 0.638 / 66.3 |
| HuMiT-Full（同训练，看 $g _ {full}$） | 307.9 / 87.5 | 0.054 / **62.5** | 0.212 / 96.6 |
| **HuMiT（只看 CRT）** | 313.5 / 87.6 | **0.035** / 52.5 | **0.203** / 96.2 |

- 外部基线里，HuMiT 在 LAFAN1 上成功率最高、关节误差最低，BONES-SEED 根部角速度误差最低。
- 世界系关键点误差 $E _ {kp}$ 明显输给 ScaleBFM（它看全局根部位置、能在线纠漂移）；HuMiT 用速度命令，漂移会累积。
- 受控消融：HuMiT 与 HuMiT-Full 在 AMASS、BONES-SEED 几乎一样；**LAFAN1 上差 10 个点**，说明高动态动作仍受益于密参考。

**真机 G1（表 IV，单个操作员，每项 10 次）**：接球 2/10（失败多因人与机器人手臂工作空间不同，不是反应慢；SONIC-LL、TWIST2 都是 0/10）、搬水桶 9/10、推带轮椅子 5/10、走到椅子前转身坐下 7/10、举手挂外套 6/10。SONIC-LL、TWIST2 在四个移动操作任务上也稳，但操作员每做一个动作都要停下来等、再纠正，采数据慢得多。

---

## 💡 核心贡献

1. **证明部署时紧凑参考够用**：同训练条件下 CRT 与完整参考的跟踪精度基本持平（除高动态的 LAFAN1）。
2. **低延迟全身遥操作系统**：在线链路去掉 IK 与未来帧，通信到推理约 20 ms、端到端 65 ms。
3. **真机动态全身遥操作**：G1 上接抛球和走动中的移动操作，统一策略、上下身不分家。

---

## 🤖 对人形机器人领域的意义

- 把「重定向」从在线链路挪到离线数据准备，是 ExtremControl、HuMiT 这条线的共同思路；HuMiT 进一步说明连蒸馏、未来帧都可以不要，关键是**奖励用密参考、输入用稀参考**。
- 延迟测量协议值得借鉴：同一画面里拍操作员和机器人，200 fps 光流对峰值，测到的是含执行的真实端到端延迟。
- 局限（论文第 VI 节）：训练数据以直立行走和上身手势为主，跪、爬这类贴地动作跟不好；没在负载下训练，搬重物走路做不了。另外根部只给速度命令，世界系漂移无法在线纠正（表 III 的 $E _ {kp}$ 偏大）——这一点是我们从表 III 读出的。

---

## 🛠️ 源码运行时序图（`xiaohu-art/Track`）

仓库（最后提交 2026-03-17，早于论文）是 [active-adaptation](https://github.com/Agent-3154/active-adaptation) 框架的插件：通过 `pyproject.toml` 的 entry point 注册 `track` 项目（`src/track/` 的 command / observation / reward / termination）和 `ppo_track` 算法（`src/track_learning/ppo.py`），训练与回放用 active-adaptation 自带的 `scripts/train_ppo.py`、`play.py`。**没有** PICO 流、缩放标定和真机部署代码，也没有权重和数据（`DATA_ROOT` 下的 `*_29dof.pkl` 要自己准备，README 第 1 步只写「Acquire training reference motion」）。

读代码时注意几处与论文的出入（我们读代码的结果）：

- `cfg/task/motion.yaml` 的 policy 观测是 `ref_qpos`、`ref_qvel`、`ref_linvel_b`、`ref_angvel_b`——**看关节级参考**，更接近 HuMiT-Full，论文里的 CRT 观测（根部高度 + 4 个关键点 6D 位姿）没在这版代码里；`ref_kp_pos_gap` / `ref_kp_quat_gap` 只给 critic。
- 锚点（anchor）是 `torso_link`，论文写骨盆；终止条件是根部高度偏差 0.25 m、朝向 0.8、腕 / 踝 $z$ 误差 0.25 m（论文是 0.4 / 0.8 / 0.4 m）。
- 奖励配置里 `action_rate_l2` 权重 0.25、`joint_limits` 10.0，没有启用 `feet_slip`；动作不含 6 个手腕关节。
- `MotionLib` 有按失败统计的**自适应采样**（每 50 帧一个 bin，30% 均匀 + 70% 按失败次数），论文没提。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户（train_ppo.py task=motion algo=ppo_track）
    participant AA as active-adaptation<br/>入口 + Isaac Lab 环境
    participant CMD as MotionLibG1（command.py）
    participant SIM as Isaac Sim（4096 环境 · 50 Hz 控制 / 200 Hz 物理）
    participant OBS as observation.py
    participant RW as reward.py / termination.py
    participant PPO as PPOPolicy（ppo.py）

    U->>AA: Hydra 读 cfg/task/motion.yaml
    AA->>AA: entry point 发现 track / track_learning
    AA->>CMD: 构造 MotionLibG1(dataset=[accad_29dof, …, lafan1])
    CMD->>CMD: joblib 读各 *_29dof.pkl，剔除 occlusion 列表里的片段
    CMD->>CMD: load_data() 拼成 root / body / joint 大张量 + _init_adaptive()
    AA->>PPO: PPOPolicy(obs_spec)：VecNorm ×2，actor MLP[512,256,128]，critic MLP[512,512,256]
    loop 每次 reset
        AA->>CMD: sample_init(env_ids)
        CMD->>CMD: adaptive_sampling()：按失败 bin 抽片段与起始帧
        CMD->>SIM: 写参考的根部位姿 / 速度 + 关节（加小扰动）
    end
    loop 每个控制步（train_every = 24 步一批）
        SIM->>OBS: 机器人状态
        OBS-->>PPO: policy：角速度 · 重力 · 关节角 / 速度 · 上一步动作 · ref_qpos / qvel / 根部速度
        OBS-->>PPO: priv：再加根部线速度 · 12 个部位位姿 · 关键点位姿差
        PPO->>SIM: JointPosition 动作（按关节缩放，最多延迟 2 步）→ PD
        SIM->>RW: tracking_anchor_* · tracking_kp_*（exp(−e/σ²)）· 正则
        RW->>RW: 根部高度 / 朝向 / 腕踝高度超阈值 → 终止，记入失败 bin
    end
    PPO->>PPO: GAE(0.99, 0.95) → 5 epoch × 4 minibatch，clip 0.2，KL 自适应 lr
    U->>AA: play.py checkpoint_path=… export_policy=true
    AA-->>U: 回放 / 导出 ONNX（真机与 PICO 侧代码未开源）
</div>

---

## 🎤 面试参考

1. **为什么输入稀、奖励密能行？** 奖励用 12 个关键点 + 速度给足梯度，critic 看完整参考估值准；actor 只要学会「从 4 个末端 + 根部命令推出全身」，这一映射本身由密奖励塑形。
2. **CRT 不给全局根部位置有什么代价？** 速度命令会积分漂移，世界系 $E _ {kp}$ 明显高于看全局根部的 ScaleBFM；遥操作有人在环、看着纠正，问题不大，但跑离线参考评测会吃亏。
3. **为什么 LAFAN1 上 Full 仍更好？** 跑跳、翻滚等动作里，4 个末端不足以唯一确定躯干与膝的姿态，未看见的关节有多解，密参考能消歧。
4. **SONIC-LL 的延迟为什么没按缓冲等量下降？** 缓冲少了 120 ms、端到端只少 100 ms，其余部分（传输、推理、执行）基本不变，测量本身也有 5 ms 分辨率与峰值匹配误差。
5. **和 ExtremControl 的差别？** ExtremControl 跟 6 个连杆的 SE(3)（含骨盆、躯干的全局位姿），且学生是从看 32 步未来的教师蒸馏来的；HuMiT 只跟 4 个末端，根部用高度 + 速度，单阶段 PPO。

---

## 🔗 相关阅读

- [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html)：同期的低延迟末端直控方案，表 III 的基线。
- [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)：看 10 个未来帧的大规模跟踪策略，延迟与精度的对照。
- [TWIST2](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html)：同样用 PICO 采集，在线重定向，表 II 的基线。
- [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html)：锚点 + 关键点指数奖励的跟踪框架，HuMiT 的奖励形式与之同源。
- [Retargeting Matters（GMR）](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)：T 字姿势逐段缩放的出处。
