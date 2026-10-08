---
layout: paper
title: "Learning to Get Up Across Morphologies: Zero-Shot Recovery with a Unified Humanoid Policy"
zhname: "跨形态学习起身：统一人形策略的零样本跌倒恢复"
category: "Locomotion"
arxiv: "2512.12230"
---

# Learning to Get Up Across Morphologies: Zero-Shot Recovery with a Unified Humanoid Policy
**跨形态学习起身：统一人形策略的零样本跌倒恢复**

> 📅 总结日期: 2026-10-08
>
> 🏷️ 板块: 05 Locomotion · 跌倒起身 · 跨形态（cross-embodiment）· CrossQ / 离策略 RL · MuJoCo · RoboCup KidSize
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）· 上游 awesome-humanoid-robot-learning Locomotion 章节中尚无笔记的最新论文（2025.12，PROGRESS #203）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.12230](https://arxiv.org/abs/2512.12230) |
| HTML | [arxiv.org/html/2512.12230v1](https://arxiv.org/html/2512.12230v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2512.12230v1) |
| **发布时间** | 2025-12-13（arXiv v1） |
| 会议 | 第 28 届 RoboCup International Symposium（仓库 README 称 RoboCup 2025 论文） |
| 源码 | ✅ [utra-robosoccer/unified-humanoid-getup](https://github.com/utra-robosoccer/unified-humanoid-getup)（MIT；基于 Rhoban 的 FRASA 框架，含 7 款机器人的 MJCF、Gym 环境、CrossQ 超参、导出的 `crossq_live.onnx` 与复现论文图的 notebook） |

**作者**：Jonathan Spraggett（多伦多大学 · UTRA RoboSoccer 队）

---

## 🎯 一句话总结

RoboCup 每支队伍的机器人尺寸、关节布置都不一样，起身动作通常要手调关键帧、或每台机器人单独训一个 RL 策略。这篇论文问：**能不能一个策略管所有小型人形，甚至直接用在没见过的机器人上？**做法很朴素——只控制所有机器人都有的 5 个俯仰关节、观测里不告诉策略是哪台机器人、训练时轮流换机器人——结论是「形态覆盖得够、中间尺寸不缺」时，零样本起身可以做到 70–86%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| CrossQ | CrossQ (Bhatt et al., ICLR 2024) | SAC 的变体：critic 里用 BatchNorm、去掉目标网络，样本效率高，1 次更新 / 步也能学得快 |
| SAC | Soft Actor-Critic | 最大熵离策略 actor-critic |
| SBX | Stable Baselines Jax | SB3 的 JAX 版，提供 GPU 加速的 CrossQ |
| FRASA | Fall Recovery And Stand-up Agent | 波尔多大学 / Rhoban 队的单机器人起身 RL 框架（Sigmaban），本工作在其上扩展 |
| LOO | Leave-One-Out | 留一法：用其余 6 台训练，在第 7 台上零样本测试 |
| MJCF | MuJoCo XML | MuJoCo 的模型格式，7 款机器人都从 URDF 转来 |
| DoF | Degrees of Freedom | 机器人自由度（18 或 20） |

---

## ❓ 论文要解决什么问题？

1. **起身是 RoboCup 的硬需求**：比赛里被撞倒、自己摔倒很常见，起不来就得被罚出场；但每台机器人身高、质量、关节限位不同，起身动作要逐台手调或逐台训练。
2. **单机器人策略不能复用**：换一台机器人（甚至同一台改了腿长、换了电池）就要重新调参重训。
3. **跨形态方法往往要形态编码**：NerveNet、形态条件策略等需要把机器人结构喂给网络，工程量大；作者想知道「什么都不告诉策略」能走多远。
4. **训练集该选哪些机器人**：多加一台机器人一定更好吗？哪种形态组合对零样本泛化最有用？

---

## 🔧 方法拆解

**① 7 款机器人统一成同一个环境**

| 机器人 | 身高 (m) | DoF | 质量 (kg) |
|---|---|---|---|
| Bez1 | 0.48 | 18 | 2.82 |
| OP3-Rot | 0.49 | 20 | 3.15 |
| Bez2 | 0.54 | 20 | 3.86 |
| Bez3 | 0.62 | 18 | 3.18 |
| Sigmaban | 0.67 | 20 | 7.80 |
| Wolfgang | 0.77 | 20 | 6.12 |
| NUGUS | 0.81 | 20 | 6.68 |

- 全部转成 MJCF，关节统一命名（`left_hip_pitch` …），补上 IMU 与脚底参考点；Wolfgang、NUGUS 调整了初始关节角。

**② 动作：只控制 5 个公共俯仰关节，左右镜像**
- 动作是 5 维关节**目标角增量速度**（肩俯仰、肘、髋俯仰、膝、踝俯仰），控制周期 50 ms：$q _ {t+1} = q_t + \dot q \, \Delta t$；
- 同一组 5 个值同时写给左右两侧（代码 `apply_control` 把 `q` 同时赋给 left / right 执行器），起身被当成矢状面里的对称动作；
- 关节限位交给仿真器截断，不做按机器人的缩放；其余关节（髋滚转、偏航等）保持默认。

**③ 观测：27 维，不含形态信息**
- 5 个关节角 + 5 个关节速度 + 5 个当前目标角 + 躯干 roll/pitch/yaw + 角速度（3）+ 头部高度（1）+ 上一步动作（5）；
- 没有机器人 ID、身高或连杆参数——策略只能从「关节怎么动、身体怎么转、头升到多高」里自己推断在控制哪台机器人。

**④ 奖励：一个「头往上抬」的主项 + 三个平滑小项**

$$
r = e^{-10(h_{\text{head}} - 1)^2} + \mathbb{1}[h_{\text{head}} > 0.4]\, e^{-10\theta_{\text{pitch}}^2} + 0.1\,e^{-\lVert a_t\rVert} + 0.05\,e^{-\lVert a_t - a_{t-1}\rVert} + 0.1\,e^{-n_{\text{self-col}}}
$$

- 头高目标 1.0 m 对所有机器人相同（比最高的 NUGUS 还高），所以它实际上是「头越高越好」的单调奖励，不需要按机器人设目标——这就是 README 说的「泛化后的奖励函数，无需按型号调参」；
- 头高过 0.4 m 才开始奖励躯干竖直，避免还趴在地上时就去拧躯干。

**⑤ 训练与随机化**
- 每个回合重置时从训练集里随机抽一台机器人、重新加载场景，再从预先采好的跌倒姿态库（`standup_initial_configurations.pkl`，让机器人从随机姿态自由落下得到，覆盖俯卧 / 仰卧 / 侧卧）里抽初始状态；
- 躯干俯仰超过 135° 或俯仰角速度过大即提前终止；
- 论文写的随机化：质量与质心 ±10%、地面与执行器摩擦 ±15%、电池电压（电机增益）±10%、IMU 安装偏差 ±3°；
- CrossQ：网络 512-512-256，学习率 1e-3，γ = 0.99，16 个并行环境，每个策略 60 万步、约 1.5 小时（单张 RTX 3090）；每个配置 10 个种子 × 100 回合评估，bootstrap 求 95% 置信区间。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph ROBOTS["🤖 7 款 KidSize 人形"]
        R1["Bez1 · OP3-Rot · Bez2 · Bez3<br/>0.48–0.62 m"]
        R2["Sigmaban · Wolfgang · NUGUS<br/>0.67–0.81 m"]
    end

    subgraph EP["🎲 每个回合"]
        PICK["随机抽一台训练集机器人<br/>重新加载场景"]
        INIT["从跌倒姿态库抽初始状态<br/>俯卧 / 仰卧 / 侧卧"]
        DR["域随机化<br/>质量·摩擦·电压·IMU 偏差"]
        PICK --> INIT --> DR
    end

    subgraph POLICY["🧠 共享 CrossQ 策略"]
        OBS["27 维观测（不含形态信息）<br/>5 关节角/速度/目标 + 姿态 + 角速度<br/>+ 头高 + 上一步动作"]
        NET["MLP 512-512-256"]
        ACT["5 维俯仰关节增量<br/>肩·肘·髋·膝·踝，左右镜像"]
        OBS --> NET --> ACT
    end

    R1 --> PICK
    R2 --> PICK
    DR --> OBS
    ACT -->|"50 ms 控制步"| SIM["MuJoCo 仿真"]
    SIM -->|"奖励：头高 + 躯干竖直<br/>+ 动作小/平滑/无自碰"| NET
    SIM --> OBS

    NET --> EVAL["📊 评估"]
    EVAL --> E1["留一法 LOO<br/>6 台训练 → 第 7 台零样本"]
    EVAL --> E2["共享 vs 单机专家"]
    EVAL --> E3["形态数量扩展<br/>k = 1…6 台"]

    style ROBOTS fill:#e8f4fd,stroke:#1f78b4
    style EP fill:#fff7e0,stroke:#d4a017
    style POLICY fill:#e8fbe8,stroke:#27ae60
</div>

---

## 🧬 源码运行时序图（依据 [utra-robosoccer/unified-humanoid-getup](https://github.com/utra-robosoccer/unified-humanoid-getup)）

入口是 `train_sbx.py`：它把 SBX 的 CrossQ 等算法注册进 RL Baselines3 Zoo，再调用 `rl_zoo3.train.train()`；环境 `unified-humanoid-get-up-env-standup-v0` 由 `UnifiedHumanoidGetUpEnv` 实现（继承 `StandupEnv`），训练集通过 `--env-kwargs robot_name:[...]` 传入，`multi_train.py` 用它批量跑留一法 / 扩展实验。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant G as standup_generate_initial.py
    participant T as train_sbx.py<br/>(rl_zoo3 + SBX)
    participant A as CrossQ 智能体
    participant E as StandupEnv<br/>(UnifiedHumanoidGetUpEnv)
    participant S as Simulator<br/>(MuJoCo 场景)

    Note over U,S: ⓪ 预生成跌倒姿态
    U->>G: python standup_generate_initial.py
    loop 直到 Ctrl+C
        G->>E: reset(use_cache=False) → randomize_fall()
        E->>S: 随机关节角 + 躯干倾角，自由落下
        G->>G: 记录 (qpos, ctrl) → 每台机器人的 pkl
    end

    Note over U,S: ① 训练
    U->>T: --algo crossq --conf hyperparams/crossq.yml<br/>--env-kwargs robot_name:[...]
    T->>A: 读超参（512-512-256，lr 1e-3，16 envs，6e5 步）
    loop 每个回合
        A->>E: reset()
        E->>E: random.choice 抽一台机器人
        E->>S: 载入 scene_{robot}.xml
        E->>E: 从该机器人的 pkl 抽初始姿态
        E-->>A: 27 维观测
        loop 每 50 ms
            A->>E: step(5 维动作)
            E->>E: 目标角 += 动作·dt，按速度上限与关节范围截断
            E->>S: 插值写左右执行器并推进若干物理步
            S-->>E: 关节角 / 姿态 / 角速度 / 头高
            E->>E: 奖励（头高 + 竖直 + 平滑 + 无自碰），检查翻倒 / 角速度终止
            E-->>A: obs, reward, done
            A->>A: 存回放池并更新 actor / critic
        end
    end
    T-->>U: logs/crossq/...（最好模型）

    Note over U,S: ② 评估与导出
    U->>T: enjoy_sbx.py / collect_data.py 指定 robot_name
    T->>E: 按俯卧 / 仰卧 / 已站立统计成功率与起身时间
    U->>U: export_inference.py → crossq_live.onnx
</div>

> 和论文对照时要注意两处出入：仓库 `standup.py` 里回合长度是 5 s（论文写 10 s），`crossq.yml` 里批大小是 256（论文表里写 1024）；`reset()` 中完整的 `apply_randomization()` 一行被注释掉，只保留了时间比例随机化。以上以仓库 2025-06 的提交为准。

---

## 🚶 具体实例：同一个奖励，不同身高的机器人拿到多少？

奖励主项是 $e^{-10(h _ {\text{head}} - 1)^2}$，目标 1.0 m 对所有机器人都一样：

| 状态 | 头高 $h$ | 主项 | 说明 |
|---|---|---|---|
| 趴在地上 | 0.10 | 0.0003 | 几乎没有奖励 |
| 撑起上半身 | 0.25 | 0.0036 | |
| 刚过竖直门槛 | 0.40 | 0.0273 | 此后才加上躯干竖直项（俯仰 0 时 +1.0，俯仰 0.3 rad 时 +0.41） |
| Bez1 站直（头约 0.45） | 0.45 | 0.0486 | 小机器人站直也只拿这么多 |
| 大机器人站直（头约 0.75） | 0.75 | 0.5353 | |

（站直时的头高按身高粗略估计，仅用于示意。）

两个结论：

1. **矮机器人的主项几乎没梯度**：Bez1 从 0.40 m 站到 0.45 m 只多 0.02，起身后期主要靠「头过 0.4 m 才给」的竖直项（最大 1.0）推动——这个门槛对矮机器人来说已经接近站直；
2. **奖励尺度随机器人变化**：同样「成功站起」，大机器人的回报比小机器人高一个数量级，混在一个回放池里训练时，critic 要从观测（尤其是头高）里自己分辨出这是哪种尺度——这可能是论文里 NUGUS、Bez1、Bez3 出现「互相竞争的起身策略」的原因之一。

---

## 📊 关键结果

**留一法（6 台训练 → 第 7 台零样本）**
- Wolfgang 被留出时最好：**72 ± 21%**（95% CI [58, 82]）；其余 6 台被留出时只有 17–42%；
- 42 个「训练于 A、测试于 B」的非对角组合中，21 个超过 80%。

**共享策略 vs 单机专家**

| 机器人 | 共享 − 专家 | 说明 |
|---|---|---|
| NUGUS | **+61%**（CI [38, 85]，p < 0.001） | 单独训练学不会起身，共享训练达 81 ± 6% |
| Wolfgang | −20%（p < 0.05） | |
| Bez2 | −18%（p < 0.05） | |
| Bez1 / OP3-Rot / Bez3 / Sigmaban | 差距 < 15% | |

- 共享策略在 7 台上都 > 58%，其中 4 台 > 80%。

**形态数量扩展（训练集 k 台 → 测 Wolfgang / Sigmaban）**
- Wolfgang：1 台训练时 37 ± 16%，**4 台时 86 ± 7%**（CI [81, 89]，即摘要里的数字），6 台时略降；
- Sigmaban：1–2 台时 < 15%，选对形态后约 40–46%；
- 「刻意多样」的 3 台（Bez3、Bez1、NUGUS，尺寸两头拉开）测 Sigmaban 只有 ≤ 16%——**缺的是中间尺寸**，光拉开跨度没用。

**局限**
- 只在仿真里验证，真机测试「进行中」；只覆盖 7 台小型（KidSize）人形；
- 没有与形态感知方法（NerveNet、FRASA 单机策略）直接对比；
- 摘要的 86% 是「4 台训练测 Wolfgang」的扩展实验结果，不是留一法结果（后者 72%），读摘要时容易混淆。

---

## 💡 核心贡献

1. 第一个在 7 款不同 RoboCup 人形上训练、能零样本迁移到未见机器人的统一起身策略；
2. 一套「公共俯仰关节 + 左右镜像 + 头高奖励」的极简设计：不需要形态编码、不需要按机器人调奖励；
3. 留一法、形态数量扩展与多样性对照三组实验，给出「中间形态覆盖比跨度更重要」的经验结论；
4. 开源 7 款机器人的 MJCF 与完整训练代码，可直接加入新队伍的机器人。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| RoboCup 实用价值 | 新机器人或改装后的机器人可以先拿共享策略起身，省去手调关键帧 |
| 跨形态 RL | 说明在动作空间做「降维到公共关节」也是一种跨形态手段，和 LocoFormer 那类长上下文适应、形态编码方法互补 |
| 数据集设计 | 选训练机器人时要补齐中间尺寸，而不是只追求最大差异 |
| 局限提醒 | 只控俯仰关节、左右对称，侧向翻滚类起身做不了；全尺寸人形还需课程或形态条件 |

---

## 🎤 面试参考

**Q：策略不知道自己在控制哪台机器人，为什么还能泛化？**
A：观测里有关节角速度、躯干角速度和头高的变化，这些对同一个动作的响应因质量、腿长而不同，MLP 可以隐式地从中推断形态（类似系统辨识）。同时动作被限制在 5 个所有机器人都有、作用也相近的俯仰关节上，「先撑地、再收腿、再伸髋」这样的起身套路在不同尺寸上大体通用。

**Q：为什么用 CrossQ 而不是 PPO？**
A：起身是短回合、需要精细接触的任务，CrossQ 是离策略算法，样本效率高，16 个 CPU 仿真环境、60 万步、约 1.5 小时就能训出一个策略；论文要跑留一法 × 10 种子等大量配置，训练成本是关键。

**Q：为什么加了更多机器人，成功率反而可能下降？**
A：不同机器人的最优起身方式可能互相冲突（比如腿长比例不同时，膝髋配合不同），共享一个没有形态输入的策略就只能折中；Wolfgang 在 k = 6 时略降、NUGUS / Bez1 / Bez3 出现竞争策略都是这个原因。

---

## 🔗 相关阅读

- [Learning Agile Soccer Skills for a Bipedal Robot with Deep RL（本仓库已有笔记）](../../03_High_Impact_Selection/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.html)：OP3 足球里的起身教师
- [Unified Humanoid Fall-Safety Policy from a Few Demonstrations（本仓库已有笔记）](../../04_Loco-Manipulation_and_WBC/Unified_Humanoid_Fall-Safety_Policy_from_a_Few_Demonstrations/Unified_Humanoid_Fall-Safety_Policy_from_a_Few_Demonstrations.html)：跌倒保护 + 起身的统一策略
- [Discovering Self-Protective Falling Policy（本仓库已有笔记）](../../04_Loco-Manipulation_and_WBC/Discovering_Self-Protective_Falling_Policy_for_Humanoid_Robot_via_Deep_RL/Discovering_Self-Protective_Falling_Policy_for_Humanoid_Robot_via_Deep_RL.html)：摔倒时如何保护自己
- [FRASA（arXiv 2410.08655）](https://arxiv.org/abs/2410.08655)：本工作所基于的 Sigmaban 单机器人起身框架（波尔多大学 / Rhoban，同样用 CrossQ 与左右对称的平面化动作）
