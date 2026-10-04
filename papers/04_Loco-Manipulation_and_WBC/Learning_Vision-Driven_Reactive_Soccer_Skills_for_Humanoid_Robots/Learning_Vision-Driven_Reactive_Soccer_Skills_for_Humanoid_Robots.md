---
layout: paper
title: "Learning Vision-Driven Reactive Soccer Skills for Humanoid Robots"
zhname: "视觉驱动的人形机器人反应式足球技能学习"
category: "Loco-Manipulation and WBC"
---

# Learning Vision-Driven Reactive Soccer Skills for Humanoid Robots
**把「板载视觉感知」直接耦进「全身运动控制」，用单一 RL 策略端到端学出找球 / 追球 / 多方向踢球：训练时用一个「虚拟感知系统」在仿真里复现真机摄像头的视场受限、噪声与漏检，再配「编码器-解码器 + AMP 对抗动作先验 + 多 Critic」把带噪历史观测补全成完整状态，从而在真实 RoboCup 赛场上零改动稳定踢球**

> 📅 阅读日期: 2026-09-02
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 视觉驱动足球 · 虚拟感知系统 · AMP 对抗动作先验 · 编码器-解码器状态补全 · 多 Critic PPO · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月（arXiv v1）· 2026 年 8 月（v2） |
| arXiv | [2511.03996](https://arxiv.org/abs/2511.03996) · [PDF](https://arxiv.org/pdf/2511.03996) · [HTML](https://arxiv.org/html/2511.03996) |
| 期刊 | [Science Robotics · DOI 10.1126/scirobotics.aed1152](https://www.science.org/doi/10.1126/scirobotics.aed1152) |
| 项目页 | [humanoid-kick.github.io](https://humanoid-kick.github.io) |
| 代码 | 🌟 [Zenodo records/21620490（code.zip）](https://zenodo.org/records/21620490) · Isaac Gym + rsl_rl 训练框架 |
| 视频 | [YouTube BN3o7TicfZs](https://youtu.be/BN3o7TicfZs) |
| 作者 | Yushi Wang、Changsheng Luo、Penghui Chen、Jianran Liu、Weijian Sun、Tong Guo、Kechang Yang、Biao Hu、Yangang Zhang、Mingguo Zhao |
| 机构 | **清华大学（Mingguo Zhao 组）× 字节跳动（ByteDance）**；机器人平台由 **Booster Robotics** 提供（Booster T1） |
| 主题 | cs.RO · 人形足球 / 视觉-运动一体 / 全身控制 / Sim-to-Real |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 第 84 项（PROGRESS.md 同号）。

---

## 🎯 一句话总结

> 人形踢球比的是**「看得准 + 反应快」**，但真机摄像头视场窄、有噪声、还会漏检，传统做法把「感知」和「控制」拆成两段（先估球位再规划动作），误差在管线里累积、响应慢。本文用**一个端到端 RL 策略**同时吃视觉与本体，把感知不确定性直接写进训练：在仿真里造一个**虚拟感知系统**，按真机相机的**视场角、距离衰减的漏检、延迟与距离相关噪声**去"污染"球观测；再用**编码器-解码器**从 50 帧带噪历史里补全出「特权真值状态」，配 **AMP 对抗动作先验**保证动作自然、**双 Critic** 分别评估任务奖励与风格奖励。结果：球位估计误差比规则基线降 **46%**、踢球启动时间最多降 **64%**、前场踢球成功率约 **90%**，并在**真实 RoboCup 比赛**多变环境下零改动运行。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| AMP | Adversarial Motion Priors，对抗动作先验；用判别器区分「策略动作 vs 参考动作」，给出风格奖励逼近自然步态 |
| PPO | Proximal Policy Optimization，近端策略优化 |
| FOV | Field of View，相机视场角（本文 H 87° / V 58°） |
| Encoder-Decoder | 编码器把历史观测压成低维嵌入；解码器从嵌入重建「特权真值状态」，是一种在线状态估计 |
| Privileged Obs | 特权观测，仅仿真可得的真值（真实球位/球速、基座线速度、外力等），部署时不可见 |
| Asymmetric Actor-Critic | 非对称结构：Actor 只用带噪部分观测，Critic 用特权全量观测 |
| Domain Randomization | 域随机化，随机化质量/摩擦/延迟/噪声等以缩小 Sim-to-Real 差距 |

---

## ❓ 论文要解决什么问题？

让人形机器人**用板载视觉自主踢球**，核心矛盾是**「感知受限」与「敏捷全身控制」难以兼得**：

- **真机视觉又窄又脏**：单目相机**视场角有限**（球常常"不在画面里"），检测**随距离衰减而漏检**、有**延迟**、有**噪声**、偶发**误检**；
- **传统两段式管线累积误差、响应慢**：先做「球检测 + 状态估计」再交给「运动规划/控制」，两段各自的误差会叠加，且中间状态机对新情况不够鲁棒，踢球启动慢；
- **动作要自然、还要能上真机**：既要像人一样步态自然（不是抽搐乱走），又要在仿真训练后**零样本迁移**到真实赛场。

本文目标：**用一个统一的 RL 控制器，把视觉感知直接耦进全身控制**，端到端学出找球、追球、多方向踢球这套**反应式**技能，并稳健跑在真机上。

---

## 🔧 方法详解

### 1. 虚拟感知系统（本文最关键创新）
不给策略"上帝视角"的真实球位，而是在仿真里**模拟一台真机相机**，把观测按真机特性"污染"后再喂给策略：

| 建模的真机特性 | 仿真里的做法 |
|---|---|
| **视场受限（FOV）** | 只有球落在相机 **H 87°/V 58°** 视锥内且在前方（`z>0`）才"可能"被看到 |
| **距离衰减漏检** | 即便在视场内，检测概率随距离下降（`p ≈ 2.475 − 0.225·dist`，远处更易丢球） |
| **偶发误检** | 球在视场外、但大致朝前时，有约 **1%** 概率产生虚假检测 |
| **距离相关噪声** | 给球位加高斯噪声，方差随距离增大（`σ ≈ 0.149 + 0.124·dist`） |
| **相机低帧率 + 延迟** | 球观测**每 2 个控制步**才更新一次（相机≈25Hz），并叠加随机延迟步 |

> 直觉：把「感知会骗你」这件事写进训练分布，策略就会自己学出**主动转头找球、丢球时凭记忆继续追、对噪声不过度反应**的行为——这正是"反应式"的来源。

### 2. 编码器-解码器：从带噪历史补全「完整状态」
- **编码器**：把 **50 帧历史观测**（`num_stack=50`）压成 **64 维历史嵌入**；
- **Actor**：输入 = 当前观测 ⊕ 历史嵌入 → 输出 15 维关节动作（含头部 2 DoF，可主动控制视线找球）；
- **解码器**：从历史嵌入重建**特权真值状态**（真实球位/球速、基座线速度、外力、离地高度……），以 MSE 作辅助监督。这让嵌入被迫编码"当前真实态"，等价于一个**隐式在线状态估计器**，把感知噪声/延迟补偿掉。

### 3. AMP 对抗动作先验 + 双 Critic PPO
- **AMP 判别器**：区分「策略产生的运动片段 vs 参考动作数据」，输出**风格奖励**（`r_amp = 1 + tanh(0.4·D(·))`），训练用 **WGAN-GP 梯度惩罚**稳住判别器——保证步态/踢腿自然；
- **双 Critic（非对称 Actor-Critic）**：奖励是 2 维向量——**任务奖励**（找球/追球/踢球/朝向/进球…）与**风格奖励**（AMP）各由一个 Critic 估值，Actor 只用带噪部分观测、Critic 用特权全量观测；
- **PPO** 更新，附加**对称性损失**（左右镜像动作一致）与前述**重建损失**，多项联合优化。

### 4. 任务奖励与技能涌现
奖励项覆盖：`ball_distance`（追球）、`goal_distance` / `goal`（把球推向/踢进球门）、`kick_ball` / `side_kick_ball`（正踢/侧踢，多方向）、`face_ball_pitch` / `face_ball_yaw`（转头/转身面向球，驱动主动感知）、以及存活/碰撞/关节限位/动作平滑等正则。**找球、追球、多方向踢球**这些技能由这套奖励在单策略里自然涌现，无需显式状态机。

---

### 🧭 整体方法流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SIM["🎮 Isaac Gym 仿真（8192 env · 50Hz 控制）"]
        W["真实世界状态<br/>真球位/球速 · 基座 · 外力"]
    end

    subgraph VP["👁️ 虚拟感知系统（核心创新）"]
        F["FOV 视锥裁剪<br/>H87°/V58° · 前方 z>0"]
        D["距离衰减漏检<br/>p≈2.475−0.225·dist"]
        N["距离相关噪声<br/>σ≈0.149+0.124·dist"]
        L["低帧率+随机延迟<br/>每2步更新·偶发1%误检"]
    end

    subgraph POL["🧠 策略网络"]
        E["编码器<br/>50帧历史→64维嵌入"]
        DE["解码器<br/>重建特权真值状态"]
        A["Actor<br/>当前obs⊕嵌入→15维动作(含头部)"]
    end

    subgraph LEARN["🎓 学习信号"]
        C1["Critic-1 任务奖励<br/>追球/踢球/朝向/进球"]
        C2["Critic-2 风格奖励<br/>AMP 判别器"]
        R["重建损失+对称损失<br/>PPO 联合优化"]
    end

    W --> F --> D --> N --> L
    L -->|带噪/延迟球观测| E
    E --> A
    E --> DE
    DE -. MSE .-> R
    A -->|关节力矩| SIM
    W -->|特权全量观测| C1
    W --> C2
    C1 --> R
    C2 --> R
    A --> OUT["🤖 Booster T1 反应式足球技能<br/>找球·追球·多方向踢球<br/>真实 RoboCup 零改动运行"]

    style SIM fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style VP fill:#fde8e8,stroke:#c0392b,color:#641e16
    style POL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style LEARN fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
</div>

---

## 📁 源码运行时序图（基于 Zenodo code.zip）

代码基于 **Isaac Gym + rsl_rl**，入口极简：`train.py` → `Runner().train()`，`play.py` / `play_mujoco.py` → `Runner().play()`。核心组件在 `utils/`：`runner.py`（训练/推理主循环）、`model.py`（`ActorCritic` 编码器-解码器 + 双 Critic、`Discriminator` AMP 判别器）、`buffer.py`（经验/AMP 回放）、`motion.py`（参考动作采样）；环境在 `envs/t1.py`（Booster T1）与 `envs/T1.yaml`（配置）。下图给出一次训练迭代的运行时序：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户 (train.py)
    participant R as Runner (runner.py)
    participant Env as T1 Env (envs/t1.py)
    participant VP as 虚拟感知 (_compute_observations)
    participant M as ActorCritic (model.py)
    participant D as Discriminator (AMP)
    participant B as Buffer / AMP Storage

    U->>R: Runner().train()
    R->>Env: reset() → obs, critic_obs, priv_obs, stacked_obs, amp_obs
    loop 每次迭代 it (max 20000)
        loop 采样 horizon_length=24 步
            R->>M: act(obs, stacked_obs)
            M->>M: encoder(50帧历史)→64维嵌入
            M-->>R: 动作分布 dist + priv_obs 估计
            R->>Env: step(act.sample())
            Env->>VP: FOV裁剪·距离漏检·噪声·延迟
            VP-->>Env: 带噪球观测→obs；真值→critic/priv_obs
            Env-->>R: obs, rew(2维), done, amp_obs
            R->>D: D(amp_obs, last_amp_obs)→风格奖励
            R->>B: 存 (obs, critic_obs, priv_obs, act, reward…)
        end
        R->>M: est_values(critic_obs) → 双 Critic 值 + GAE 回报
        loop PPO 若干 epoch × minibatch
            R->>M: act() 重算 dist + priv_obs 估计
            R->>R: actor_loss(PPO代理) + value_loss(双Critic MSE)
            R->>R: + 重建损失(解码器→特权真值) + 对称损失
            R->>M: 反传更新 ActorCritic
            R->>D: 专家 vs 策略 + WGAN-GP 梯度惩罚
            R->>D: 反传更新 Discriminator
        end
        R->>R: Recorder 记录 / 定期保存 model+discriminator.pth
    end
    Note over R,Env: 部署: play_mujoco.py / 真机<br/>仅用 Actor(编码器+解码器) 板载视觉推理
</div>

---

## 💡 核心贡献

1. **虚拟感知系统**：在仿真里显式复现真机相机的**视场受限 / 距离漏检 / 噪声 / 延迟 / 误检**，把感知不确定性直接写进训练分布，让策略学出主动找球与抗噪的反应式行为——这是本文能零样本上真机的关键；
2. **感知-控制一体的端到端策略**：抛弃"检测→估计→规划"两段式管线，用**单一 RL 策略**同时消费视觉与本体、直接输出全身动作（含头部主动视线控制）；
3. **编码器-解码器状态补全**：从带噪历史里重建特权真值，等价隐式在线状态估计，把球位估计误差比规则基线**降 46%**；
4. **AMP + 双 Critk 保证自然与高效**：动作自然、踢球启动时间最多**降 64%**、前场成功率约 **90%**；
5. **真机与赛场验证**：在真实 **RoboCup** 多变环境零改动运行，并**开源全部代码**（Zenodo）。

---

## 🤖 对人形机器人学习的启发

- **「把传感器缺陷搬进仿真」比「假设感知完美」更能落地**：视场、漏检、延迟、噪声都可参数化建模，这条思路可推广到任意板载视觉的 loco-manipulation 任务；
- **主动感知是被奖励"逼"出来的**：给「面向目标」的朝向奖励 + 可控头部自由度，策略会自发学出转头/转身找目标——无需显式注视点规划；
- **编码器-解码器 = 轻量在线状态估计**：用历史重建特权真值，是替代显式 EKF/滤波的一种端到端做法，对高噪声/间歇观测尤其有用；
- **AMP 让"竞技性"与"自然性"共存**：竞技任务（踢球）容易学出怪异高频动作，AMP 风格奖励能把动作拉回类人分布，工程上很实用；
- **反应式 > 状态机**：单策略端到端相比手写状态机对新场景更鲁棒、响应更快，是人形赛事控制的一个可复现范式。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.03996](https://arxiv.org/abs/2511.03996) | 论文正文（方法 / 虚拟感知 / 实验） |
| [Science Robotics 论文](https://www.science.org/doi/10.1126/scirobotics.aed1152) | 正式发表版（2026） |
| [项目页 humanoid-kick.github.io](https://humanoid-kick.github.io) | 概述、方法、真机 / RoboCup 视频 |
| 🌟 [代码 Zenodo records/21620490](https://zenodo.org/records/21620490) | `train.py` / `play.py` / `play_mujoco.py` + `utils/`(runner·model·buffer·motion) + `envs/`(t1·T1.yaml)，Isaac Gym + rsl_rl |
| [视频 YouTube](https://youtu.be/BN3o7TicfZs) | 真机踢球 / 比赛片段 |
| [一作主页 yushi.ws](https://yushi.ws) | 作者主页 |

> ℹ️ 备注：本环境网络出口屏蔽 arXiv HTML/PDF，方法与数值主要依据**项目页 + Zenodo 开源代码**（`envs/t1.py` 虚拟感知实现、`utils/model.py` 编码器-解码器与双 Critic、`utils/runner.py` 训练循环）整理，源码运行时序图直接对照上述文件绘制。

---

## 🔗 相关阅读

- **同模块·人形足球 / 竞技**：[Learning Soccer Skills for Humanoid Robots（渐进感知-动作框架）](../Learning_Soccer_Skills_for_Humanoid_Robots____A_Progressive_Perception-Action_Fr/Learning_Soccer_Skills_for_Humanoid_Robots____A_Progressive_Perception-Action_Fr.html) · [Learning Agile Striker Skills（带噪传感器踢球）](../Learning_Agile_Striker_Skills_for_Humanoid_Soccer_Robots_from_Noisy_Sensory_Input/Learning_Agile_Striker_Skills_for_Humanoid_Soccer_Robots_from_Noisy_Sensory_Input.html) · [RoboStriker（自主拳击分层决策）](../RoboStriker__Hierarchical_Decision-Making_for_Autonomous_Humanoid_Boxing/RoboStriker__Hierarchical_Decision-Making_for_Autonomous_Humanoid_Boxing.html)；
- **AMP 对抗动作先验源流**：[AMP: Adversarial Motion Priors](https://arxiv.org/abs/2104.02180)（风格学习主线）；
- **视觉驱动全身控制**：[ZeroWBC（自我中心视频学习）](../ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video/ZeroWBC__Learning_Natural_Visuomotor_Humanoid_Control_from_Egocentric_Video.html) · [VIRAL（大规模视觉 Sim-to-Real）](../VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation.html)。
