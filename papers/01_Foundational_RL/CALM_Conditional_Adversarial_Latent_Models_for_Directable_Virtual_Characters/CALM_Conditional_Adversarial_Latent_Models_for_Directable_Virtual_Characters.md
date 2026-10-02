---
layout: paper
paper_order: 8
title: "CALM: Conditional Adversarial Latent Models for Directable Virtual Characters"
zhname: "CALM：面向可控虚拟角色的条件对抗潜变量模型"
category: "Foundational RL"
demos: ["calm"]
---

# CALM: Conditional Adversarial Latent Models for Directable Virtual Characters
**条件对抗潜变量模型：可控虚拟角色**

> 📅 阅读日期: 2026-04-07
>
> 🏷️ 板块: Reinforcement Learning / Motion Imitation / Skill Composition

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2305.02195](https://arxiv.org/abs/2305.02195) |
| **PDF** | [下载](https://arxiv.org/pdf/2305.02195) |
| **作者** | Chen Tessler, Yoni Kasten, Yunrong Guo, Shie Mannor, Gal Chechik, Xue Bin Peng |
| **机构** | NVIDIA, Technion, Bar-Ilan University, Simon Fraser University |
| **发布时间** | 2023-05-02 (arXiv), SIGGRAPH 2023 |
| **项目主页** | [NVIDIA PAR Lab](https://research.nvidia.com/labs/par/calm/) |
| **GitHub** | [NVlabs/CALM](https://github.com/NVlabs/CALM) |

---

## 🎯 一句话总结

CALM 先让每段动捕都能被编码成一个可以「点名」的 latent（$z = E(M)$），再训一个高层策略在目标动作的 latent 附近挑 $z$、把角色引向要求的方向，底层负责动作质量；两者组合起来，用一个简单的状态机就能编出复杂的组合动作，不用额外训练。

> 🎮 **本文内嵌 1 段动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [五幕动画：CALM 全流程](#calm-explainer-anim) —— 约 76 秒串完「ASE 缺什么 → LLC 编 latent → HLC 方向 + 风格 → FSM 零训练组合 → 三阶段训练闭环」
> 2. [配音讲解视频](#calm-video) —— 同样五幕，加中文配音与字幕，6 分 15 秒竖屏，可下载
> 3. latent 实验台 —— CALM 的 $z = E(\text{动捕})$ 与 ASE 随机采 $z$ 并排对比，看「点名技能」为什么重要
> 4. 风格项实验台 —— 拖风格项（论文式 8 的 $\exp(-4\lVert z_t - z _ {target}\rVert^2)$，官方代码写成 $(\cos+1)/2$）的权重，看 HLC 怎么被留在要求的动作附近
> 5. FSM 实验台 —— 跑一遍 HumanoidStrike 式状态机，注意换的只是 $z$ 的来源

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **CALM** | Conditional Adversarial Latent Models | 条件对抗潜变量模型：让潜变量可控、可定向 |
| **LLC** | Low-Level Controller | 低层控制器（decoder），接收 latent + 状态，输出动作 |
| **HLC** | High-Level Controller | 高层控制器，选择 latent 来引导低层策略 |
| **ASE** | Adversarial Skill Embeddings | 对抗技能嵌入，CALM 的前身 |
| **AMP** | Adversarial Motion Priors | 对抗运动先验，ASE/CALM 判别器的技术基础 |
| **FSM** | Finite-State Machine | 有限状态机，CALM 推理时组合低层/高层策略的调度器 |
| **MoCap** | Motion Capture | 动作捕捉 |

---

## 🎬 五幕动画：CALM 全流程 {#calm-explainer-anim}

<div class="paper-demo" data-demo="calm-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#calm-video}

<div class="paper-demo" data-demo="calm-video" data-src="media/calm_explainer_video.mp4" data-poster="media/calm_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/calm_explainer_video.mp4" download="CALM_讲解视频.mp4">下载 mp4（7.9 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」）按小节收起，后面的具体实例、源码对照、面试问题、讨论记录与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ CALM 要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：ASE 有技能 latent，但没有「方向」</summary>

ASE 已经做到：把大量技能压进一个连续 latent 空间 $z$，高层策略只学"选哪个 $z$"。

但 CALM 论文指出两件事它做不到：

> **一是「点名」：给一段动捕，ASE 没法直接给出它对应的 $z$；二是「方向」：拿到"走"的 $z$，低层也只会走，不管往哪走。**

比如你给低层一个"走"的 latent，它可以生成一个自然的走路动作——但你没法控制它往哪个方向走、朝哪个目标走（论文第 4 节："it can be instructed to walk, but does not enable intuitive control over the direction of walking"，这句话说的其实是 CALM 自己的低层，ASE 的低层同样如此）。

这就是 CALM 要解决的：

> **让每段动捕都能编码成可点名的 latent，再训一个高层在这个 latent 附近微调，让角色既做指定的动作、又朝指定的方向做。**
</details>

### 问题一：ASE 没有方向感

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：latent 只编码「做什么」，不编码「朝哪做」</summary>

低层策略的 latent 只编码"做什么技能"，不编码"朝哪个方向做"。

你给 $z_1$ = 冲刺，$z_2$ = 下蹲——但这两个 latent 都没有"朝左走""朝右走"的信息。

更麻烦的是 ASE 的 latent 缺少全局语义结构（论文 2.2 节）：给一段蹲着走的动捕，没有现成办法找到它对应的 $z$，想要特定动作只能让高层按任务奖励自己摸索。
</details>

### 问题二：任务完成需要方向，但低层策略没有任务信息

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：追着蓝球跑 —— 低层知道怎么跑，不知道往哪跑</summary>

比如任务目标是"追着蓝球跑"。低层策略知道怎么跑，但不知道往哪跑。

AMP 式的直接做法（论文 2.1 节称为 direct prediction）是每个任务单独训一个策略，但这样：
- 每个新任务都要重新训练，还要为任务挑合适的动捕数据
- 想让角色用指定的动作完成任务，就得精心设计奖励与终止条件（论文附录 E.3.6）
</details>

### 问题三：CALM 的核心洞察

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：方向不必写进 latent，而是在 latent 空间里选一个方向</summary>

CALM 没有把"方向"写进 latent，而是让高层每秒 6 次在目标动作的 latent 附近挑 $z$，靠这些细微差别把角色引向要去的方向（论文第 4、6 节）：
- latent $z = E(M)$ 编码"做什么"（技能语义），可以直接点名
- 高层在目标动作的 $z$ 附近微调，决定"朝哪个方向执行"，奖励里的风格项不让它换成别的动作
- 什么时候换动作，交给手写的状态机

这样低层和高层各司其职，低层负责质量，高层负责方向。论文第 10 节也承认，方向和动作内容在表示里还没拆开，所以要同时做到「动作对、方向对」，奖励参数得仔细调。
</details>

---

## 🔧 CALM 的三层架构

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三阶段各解决一个问题</summary>

CALM 分三个阶段，每阶段解决一个问题：
</details>

### 第一层：Low-Level Controller（LLC）——动作质量

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Encoder + 低层策略，latent 从动捕编出来</summary>

**目标**：训练一个 encoder-decoder，latent 能编码动作风格。

- **Encoder** $E$：把一段 2 秒（30 Hz 下 60 帧）的 motion clip 编码成 latent $z$，投影到 64 维单位球上
- **Decoder（低层策略）** $\pi _ {LLC}$：输入当前状态 $s_t$ + latent $z$，输出动作 $a_t$（31 维 PD 目标）

整个 LLC 用**条件**对抗模仿学习训练：判别器 $D(s, s' \mid z)$ 同时看状态转移和 $z$，像这个 $z$ 对应的动捕才给高分，真实动捕配上错的 $z$ 也算负样本（论文式 7；官方 `calm_humanoid.yaml` 里 `negative_disc_samples` 默认是 False，表 3 的消融显示加上负样本人评可控性从 62% 升到 78%），奖励 $r = -\log(1 - D)$。判别器的梯度**不进** encoder，encoder 只靠策略梯度端到端地学，外加对齐 / 均匀两条正则：同一段动捕里交叠的片段编得近、所有编码在球面上分布均匀（式 5–6）。训练时还会在随机时刻换掉条件动作，让低层学会在动作之间过渡（5.1.2 节）。论文表 1：按参考动作生成，人评可控性从 ASE 的 35% 升到 78%。

训练好之后，给一个 $z$，LLC 就能生成对应技能的动作序列。

> **但此时只有"技能"，没有"方向"。**

「给一个 $z$ 就能生成对应技能」听起来和 ASE 一样，但**这个 $z$ 的来源完全不同**：ASE 是从球面上随机采，CALM 是让 encoder 去编一段真实动捕。下面这个演示把两者并排画出来——差别在于 CALM 的 latent 有名字，可以被「点名」：
</details>

<div class="paper-demo" data-demo="calm-encoder"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第二层：High-Level Controller（HLC）——方向控制

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：HLC 输出 latent，奖励 = 方向项 + 风格项（论文式 8）</summary>

**目标**：训练一个高层策略，学会在要求的动作的 latent 附近挑 $z$，让角色朝指定方向完成任务。

HLC 的输入：
- 当前状态 $s_t$
- 任务目标：目标方向 $d^*$（角色局部坐标系）+ 要求的动作编号（论文附录 A.4.3）

HLC 的输出：
- 一个 latent $z_t$

这个 $z_t$ 传给 LLC，LLC 生成对应技能的动作。

**关键设计：方向项 + 风格项**（论文 6.1 节「精确训练」，式 8）

$$
r_t = \underbrace{\exp\Big(-0.25 \Big\lVert d^*_t - \tfrac{\dot x^{root}_t}{\lVert \dot x^{root}_t \rVert} \Big\rVert^2\Big)}_{\text{方向}} + \underbrace{\exp\big(-4 \lVert z_t - \hat z \rVert^2\big)}_{\text{风格}}, \qquad \hat z = E(M_{\text{目标动作}})
$$

前一项看实际移动方向和目标方向 $d^{\ast}$ 偏了多少，后一项看选出的 $z_t$ 离目标动作的编码 $\hat z$（下文和演示里记作 $z _ {target}$）有多近。官方代码（`hrl_agent.py`）把风格项写成 $(\cos(z_t, \hat z) + 1)/2$（对目标动作的 32 个编码取最大），与任务奖励各占 0.5；高层每输出一个 $z$，低层执行 5 步（6 Hz / 30 Hz）。

这样 HLC 学的是：**"我要朝这个方向走，在目标动作附近该选哪个 latent"**。论文表 2：跑、走、蹲走三种风格，实际方向和目标方向的余弦都在 0.91 以上。

风格项为什么必要？把它的权重拖到 0 就知道了：HLC 会毫不犹豫地挑一个跑得最快的 latent，哪怕这一段要求的是蹲着走（论文附录 E.3.3：不加风格约束的 Location 任务，高层学出来的就是跑）。风格项把它留在 $z _ {target}$ 附近（下面的玩具模型风格项直接用 $\cos$，绿色扇形只是示意，奖励里没有硬边界）：
</details>

<div class="paper-demo" data-demo="calm-hlc"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第三层：推理时组合——FSM 调度

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：推理期用 FSM 组合 LLC 与 HLC，零训练</summary>

推理时不需要再训练，只要用一个有限状态机组合 LLC 和 HLC：
</details>

<div class="mermaid">
flowchart LR
    W["状态：走"] --> LLC1["LLC 固定 z=走"]
    D["状态：朝某方向走"] --> HLC["HLC 输出 z_t"]
    HLC --> LLC2["LLC π(s,z_t)"]
    A["状态：攻击"] --> LLC3["LLC 固定 z=攻击"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：像游戏手柄 —— 摇杆管方向，按键管技能</summary>

这就像视频游戏的控制：
- 移动摇杆 → 方向控制
- 按键 A → 攻击技能
- 按键 B → 防御技能

下面这个实验台把 `HumanoidStrikeFSM` 跑了一遍：拖时间轴或者直接按播放，注意右图里 **latent 是跳变的，但换的只是 $z$ 的来源**——三个状态用的是同一个 LLC，整段新增训练量为 0：
</details>

<div class="paper-demo" data-demo="calm-fsm"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 📊 CALM 三层架构与推理调度

<div class="mermaid">
flowchart TB
    MoCap["动捕片段"] --> LLC["LLC：编码器 E + 低层 π_LLC<br/>对抗模仿得到 latent 技能"]
    Task["目标方向 d* + 要求的动作 + 状态 s_t"] --> HLC["HLC：输出 z_t<br/>奖励 = 方向项 + 风格项（z 离目标动作编码多近）"]
    HLC --> z["latent z_t"]
    z --> LLC
    FSM["推理：有限状态机"] -->|固定技能| zfix["固定 z"]
    FSM -->|需定向| HLCrun["HLC 输出 z_t"]
    zfix --> pi["π_LLC(s,z)"]
    HLCrun --> pi
    pi --> act["动作 a_t"]
</div>

---

## 🚶 具体实例：CALM 如何让角色"追着目标踢剑"

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：蹲走向目标 → 踢 → 庆祝</summary>

以 SIGGRAPH 演示里的场景为例："crouch-walk toward target → kick → celebrate"。
</details>

### 阶段一：训练 LLC

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：任意 $z$ 都能生成对应技能，但不能控制方向</summary>

<div class="mermaid">
flowchart TB
    M["动捕：走/蹲/踢/庆祝"] --> E["Encoder → z"]
    E --> LLC["π_LLC(s,z) + 判别器"]
    LLC --> OUT["任意 z → 对应技能动作"]
</div>

现在，给任意 $z$，LLC 都能生成对应技能的动作——但不能控制方向。
</details>

### 阶段二：训练 HLC

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：任务 = 朝某个方向 crouch-walk</summary>

**任务**：朝某个方向 crouch-walk。

<div class="mermaid">
flowchart LR
    S["s_t + 目标方向"] --> HLC["HLC → z_t"]
    HLC --> LLC["π_LLC(s, z_t)"]
    LLC --> R["方向项 + 风格项（z_t 离 E(蹲走) 多近）"]
</div>
</details>

### 阶段三：FSM 组合

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：推理期手写状态机，不需要额外训练</summary>

推理时，用户定义状态机：

<div class="mermaid">
flowchart TB
    S1["状态1：crouch-walk<br/>HLC 朝目标"] -->|距离 < 1m| S2["状态2：kick<br/>LLC 固定 z_kick"]
    S2 -->|踢完| S3["状态3：celebrate<br/>LLC 固定 z_celebrate"]
    S3 --> END((结束))
</div>

整个过程不需要额外训练，直接组合已有模型。
</details>

---

## 🤖 CALM 对人形机器人领域的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：1. 分离"做什么"和"往哪做"，是层次化控制的核心思想 / 2. FSM 组合证明了"免训练技能拼装"的可行性…</summary>

<h3 id="1-分离做什么和往哪做是层次化控制的核心思想">1. 分离”做什么”和”往哪做”，是层次化控制的核心思想</h3>

以前大多数方法把任务信息和动作质量混在一起。

CALM 证明了：把它们分开，用层次化策略分别处理，是可行且高效的。

这给后续很多工作打了样。

<h3 id="2-fsm-组合证明了免训练技能拼装的可行性">2. FSM 组合证明了”免训练技能拼装”的可行性</h3>

CALM 最重要的工程启示之一：**不需要为每个新任务重新训练**，只要写一个 FSM 把预训练好的模块拼起来。

这在真实机器人部署时极其有价值。

<h3 id="3-latent-space-的方向性有语义含义">3. latent space 的方向性有语义含义</h3>

CALM 展示了 latent 空间不只是一个"随机向量容器"——它可以有语义结构：
- 相近方向 = 相近技能
- latent 插值 = 技能过渡

这让 latent 控制变得更直觉、更可解释。

<h3 id="4-它是-asecalmpulse-链路的关键中间节点">4. 它是 ASE→CALM→PULSE 链路的关键中间节点</h3>

<div class="mermaid">
flowchart LR
    ASE["ASE：技能 embedding"] --> CALM["CALM：+ HLC + FSM"]
    CALM --> PULSE["PULSE：通用 latent 基座"]
</div>
</details>

---

## 📁 MimicKit 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（7 节）：源码运行时序图 / 1. 低层策略的 Latent 输入 / 2. 高层策略的 latent 选择 / 3. 方向项 + 风格项…</summary>

> CALM 官方代码是独立仓库 [NVlabs/CALM](https://github.com/NVlabs/CALM)，基于 IsaacGym 实现，不在 MimicKit 里。下面第 1、2 节是按论文写的示意代码，第 3、4 节摘自官方仓库（`calm/learning/` 与 `calm/env/tasks/`）。

<h3 id="源码运行时序图">源码运行时序图</h3>

官方仓库统一入口是 `calm/run.py`（内部走 rl_games 的 Runner），第 5 节的三条命令分别对应三个阶段。三阶段在时序上是**串行**的：先训 LLC（encoder + 低层策略 + 条件判别器），再冻结 LLC 训 HLC，最后 FSM 推理不再训练：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as calm/run.py<br/>(rl_games Runner)
    participant HLC as 高层策略 HLC
    participant ENC as MotionEncoder E(m)
    participant LLC as 低层策略 LLC
    participant DISC as 条件判别器 D
    participant S as IsaacGym<br/>并行仿真
    Note over U,S: 阶段一：训练 LLC（--task HumanoidAMPGetup + calm_humanoid.yaml）
    U->>R: python calm/run.py --task HumanoidAMPGetup --motion_file dataset_*.yaml
    loop 每轮 rollout + 更新
        R->>ENC: 采样参考 motion clip m → z = E(m)
        R->>LLC: eval_actor(s, z) → 动作 a_t
        LLC->>S: 仿真一步，收集 (s_t, s_t+1)
        R->>DISC: D(s_t, s_t+1 ‖ z)：真 = 数据集片段，假 = rollout
        DISC-->>R: 条件风格奖励 r_disc
        R->>R: 同一个 loss：PPO 更新 LLC（梯度传回 Encoder）+ 判别器分类损失 + 对齐/均匀正则
    end
    Note over U,S: 阶段二：训练 HLC（--task HumanoidHeadingConditioned + --llc_checkpoint）
    U->>R: python calm/run.py --llc_checkpoint calm_llc_*.pth（LLC/Encoder 冻结）
    loop 每轮 rollout + 更新
        R->>HLC: HLC(state, 目标方向, 动作编号) → 选 latent z_t（6 Hz）
        R->>ENC: 目标动作的编码 z_target = E(m_target)（32 段取最大）
        R->>LLC: 冻结的 LLC 用 z_t 解码动作，执行 llc_steps = 5 步（30 Hz）
        R->>R: 0.5·任务奖励（方向 + 速度）+ 0.5·(cos(z_t, z_target)+1)/2 → PPO 只更新 HLC
    end
    Note over U,S: 阶段三：FSM 推理（--task HumanoidStrikeFSM --test，不训练）
    U->>R: python calm/run.py --test --llc_checkpoint ... --checkpoint hlc.pth
    loop 每个控制步
        R->>R: HumanoidStrikeFSM：按离目标的距离、目标是否倾倒设 _should_strike / _stay_idle
        alt 还没进攻击距离
            R->>HLC: HLC 按方向与步态输出 z
        else 进了攻击距离 / 目标已倒
            R->>ENC: 用 E(攻击动作) / E(待机动作) 换掉 HLC 的输出
        end
        R->>LLC: LLC(state, z) → 动作
        LLC->>S: 执行，进入下一状态
    end
</div>

- 阶段一对应第 1 节代码：encoder 把 motion clip 压成 latent，判别器**以 z 为条件**，逼 LLC "给定 z 就复现对应技能"。
- 阶段二对应第 2、3 节：HLC 学的不是动作而是"选哪个 latent"；奖励 = 环境里的方向 / 速度项 + agent 里的风格项（余弦），各占 0.5。
- 阶段三对应第 4 节 `HRLFSMPlayer.get_action()`：预训练好的 HLC/LLC 当积木拼，FSM 只做调度，零训练。

<h3 id="1-低层策略的-latent-输入">1. 低层策略的 Latent 输入</h3>

```python
# 示意代码（按论文 5.1 节写，不是官方源码；官方实现见 calm/learning/calm_agent.py）
class ConditionalAdversarialLatentModel(nn.Module):
    def __init__(self, latent_dim=32):
        self.encoder = MotionEncoder(latent_dim=latent_dim)
        self.decoder = LowLevelPolicy(latent_dim=latent_dim)
        self.discriminator = MotionDiscriminator()

    def encode(self, motion_sequence):
        # 把一段 motion clip 编码成 latent
        z = self.encoder(motion_sequence)
        return z

    def decode(self, state, z):
        # 给定状态 + latent，输出动作
        in_data = torch.cat([state, z], dim=-1)
        action_dist = self.decoder(in_data)
        return action_dist
```

**关键**：latent $z$ 不仅仅是噪声，而是从**真实参考动作**里提取出来的有语义的方向向量。官方实现里 encoder 的梯度只来自策略损失（`calm_latents = self._eval_enc(enc_amp_obs)` 不 detach），判别器用的编码在 `torch.no_grad()` 下算，正好对应论文式 7 的 stop grad。

<h3 id="2-高层策略的-latent-选择">2. 高层策略的 latent 选择</h3>

```python
# 示意代码：高层策略输出 latent（而非直接输出动作）
class HighLevelController(nn.Module):
    def __init__(self, latent_dim=32):
        self.net = nn.Sequential(
            nn.Linear(state_dim + goal_dim, 512),
            nn.ReLU(),
            nn.Linear(512, latent_dim)
        )

    def forward(self, state, goal):
        z = self.net(torch.cat([state, goal], dim=-1))
        z = F.normalize(z, dim=-1)  # 归一化到单位球面
        return z
```

高层输出的 latent 再传给低层策略——这正是"选 latent"而非"直接选动作"的核心。

<h3 id="3-方向项--风格项">3. 方向项 + 风格项</h3>

论文式 (8) 是「方向项 + $\exp(-4\lVert z_t - \hat z \rVert^2)$」；官方代码里方向项在环境的 `compute_heading_reward()`（0.4 · 速度 + 0.6 · 移动方向），风格项在 agent 里，二者按配置各占 0.5：

```python
# calm/learning/hrl_conditioned_agent.py —— 风格项：选出的 z 与「要求的动作」的 32 个编码比余弦，取最大
def _calc_style_reward(self, action):
    requested_heights = self.vec_env.env.task._tar_locomotion_index.view(-1)
    style_reward = torch.zeros((action.shape[0]), device=self.ppo_device, dtype=torch.float32)
    z = torch.nn.functional.normalize(action, dim=-1)
    for motion_type in range(3):
        motion_mask = requested_heights == motion_type
        style_reward[motion_mask] = torch.max((cosine_similarity(z[motion_mask].view(-1, 1, self._latent_dim), self.encoded_motion[motion_type].view(1, -1, self._latent_dim), dim=-1) + 1) / 2, dim=1)[0]
    return style_reward.unsqueeze(-1)

# calm/learning/hrl_agent.py —— 合成（hrl_humanoid_style_control.yaml：task_reward_w 0.5 / disc_reward_w 0 / style_reward_w 0.5）
def _combine_rewards(self, task_rewards, disc_rewards, style_rewards):
    combined_rewards = self._task_reward_w * task_rewards + \
                     + self._disc_reward_w * disc_rewards + self._style_reward_w * style_rewards
    return combined_rewards
```

<h3 id="4-fsm-组合">4. FSM 组合</h3>

```python
# calm/learning/hrl_fsm_players.py —— HLC 照常输出 z，状态机命中时用动作编码把它换掉
def get_action(self, obs_dict, is_determenistic=False):
    ...
    clamped_actions = torch.clamp(current_action, -1.0, 1.0)
    clamped_actions[self.env.task._should_strike == 1] = self.env.task._possible_latents[self.env.task._strike_index]
    clamped_actions[self.env.task._stay_idle == 1] = self.env.task._possible_latents[self.env.task._idle_index]
    return clamped_actions

# calm/env/tasks/humanoid_strike_fsm.py —— 切换条件：pos_err 是到目标的水平距离平方，阈值按攻击种类 × 步态查表
dist_mask = pos_err < strike_distance
self._should_strike[dist_mask] = 1
...
succ = tar_rot_err < 0.7          # 目标的 up 向量和竖直方向的点积 < 0.7，算作已被打倒
self._stay_idle[succ] = 1
```

FSM 本身就是一个状态机，拿 `HumanoidStrikeFSM`（走向目标并攻击）画出来最直观——注意**每个状态里 latent z 的来源不同**，这正是 CALM 分层设计的价值（官方代码在目标倒下后切到待机动作；论文图 1 的例子是举手庆祝）：

<div class="mermaid">
stateDiagram-v2
    state "direction_locomotion：HLC 选方向 latent，走向目标" as WALK
    state "fixed_skill：用 E(攻击动作) 的 latent，执行攻击" as STRIKE
    state "fixed_skill：用 E(待机 / 庆祝动作) 的 latent" as WIN
    [*] --> WALK
    WALK --> WALK : 距目标 > 攻击范围
    WALK --> STRIKE : 进入攻击范围
    STRIKE --> WALK : 目标未倒，重新接近
    STRIKE --> WIN : 目标倒下
    WIN --> [*]
</div>

> 🔑 状态切换条件（距离、目标状态）是**手写的**，但每个状态内的动作全部由预训练策略生成——FSM 只负责"什么时候换 z"，动作质量由 LLC 保证（它训练时就在随机时刻换过条件动作，学过怎么过渡）。整个阶段三**零训练**。论文表 2：攻击任务的完成评分在 0.96–1 之间；第 9 节也提醒，楼梯、不平地面这类训练里没见过的动力学，这套组合未必管用。

<h3 id="5-训练命令nvidia-官方">5. 训练命令（NVIDIA 官方）</h3>

```bash
# 阶段一：训练低层控制器（LLC）
python calm/run.py \
  --task HumanoidAMPGetup \
  --cfg_env calm/data/cfg/humanoid_calm_sword_shield_getup.yaml \
  --cfg_train calm/data/cfg/train/rlg/calm_humanoid.yaml \
  --motion_file calm/data/motions/reallusion_sword_shield/dataset_reallusion_sword_shield.yaml \
  --headless --track

# 阶段二：训练方向控制高层策略
python calm/run.py \
  --task HumanoidHeadingConditioned \
  --cfg_env calm/data/cfg/humanoid_sword_shield_heading_conditioned.yaml \
  --cfg_train calm/data/cfg/train/rlg/hrl_humanoid_style_control.yaml \
  --motion_file calm/data/motions/reallusion_sword_shield/dataset_reallusion_sword_shield_fsm_movements.yaml \
  --llc_checkpoint calm/data/models/calm_llc_reallusion_sword_shield.pth \
  --headless --track

# 阶段三：FSM 推理（不训练）
python calm/run.py \
  --task HumanoidStrikeFSM \
  --test \
  --num_envs 16 \
  --llc_checkpoint calm/data/models/calm_llc_reallusion_sword_shield.pth \
  --checkpoint calm/data/models/calm_hlc_precision_trained_reallusion_sword_shield.pth
```

<h3 id="6-内置任务配置">6. 内置任务配置</h3>

| 任务 | 配置文件 | 说明 |
|------|----------|------|
| HumanoidStrikeFSM | `humanoid_sword_shield_strike_fsm.yaml` | 攻击 FSM |
| HumanoidLocationFSM | `humanoid_sword_shield_location_fsm.yaml` | 位置控制 FSM |
| HumanoidReach | `humanoid_sword_shield_reach.yaml` | 到达目标 |
| HumanoidHeading | `humanoid_sword_shield_heading.yaml` | 朝方向走 |
| HumanoidStrike | `humanoid_sword_shield_strike.yaml` | 精确攻击 |
</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（5 节）：Q1: CALM 和 ASE 的核心区别是什么？ / Q2: CALM 的 FSM 组合有什么价值？…</summary>

<h3 id="q1-calm-和-ase-的核心区别是什么">Q1: CALM 和 ASE 的核心区别是什么？</h3>
**A**：两点。① latent 的来源：ASE 训练时从球面随机采 $z$，latent 没有全局语义结构，给一段动捕找不到它的 $z$；CALM 用 encoder 把 2 秒动捕编成 $z$，配合条件判别器，人评可控性从 35% 升到 78%（表 1）。② 下游用法：ASE 的高层只按任务奖励挑 $z$，没法要求它用某个指定动作；CALM 的精确训练在奖励里加风格项，让高层在目标动作的编码附近挑 $z$，于是既能指定动作、又能指定方向，再用 FSM 零训练地组合。

<h3 id="q2-calm-的-fsm-组合有什么价值">Q2: CALM 的 FSM 组合有什么价值？</h3>
**A**：FSM 把预训练好的低层和高层策略当成模块拼起来，不需要为每个新任务重新训练整个系统。这对真实机器人部署极其重要——你可以预先训练好各种技能模块，用状态机实时组合出复杂行为。

<h3 id="q3-为什么-hlc-输出-latent-而不是直接输出动作">Q3: 为什么 HLC 输出 latent 而不是直接输出动作？</h3>
**A**：因为 latent 编码了"技能语义"，传给 LLC 后能保证动作质量和风格。如果 HLC 直接输出动作，就绕过了低层的质量保证，丢失了对抗模仿学习训练出的自然运动特性。

<h3 id="q4-calm-的高层奖励是什么">Q4: CALM 的高层奖励是什么？</h3>
**A**：严格说是两项。论文式 (8)：方向项 $\exp(-0.25\lVert d^{\ast} - \dot x/\lVert \dot x \rVert \rVert^2)$ 看实际移动方向对不对，风格项 $\exp(-4\lVert z_t - \hat z \rVert^2)$ 看选出的 latent 离目标动作的编码有多近；官方代码把风格项写成 $(\cos(z_t, \hat z) + 1)/2$，两项各占 0.5。只有方向项时，高层会换成跑得最快的动作；风格项把它留在目标动作附近。

<h3 id="q5-calm-的-latent-space-有什么特点">Q5: CALM 的 latent space 有什么特点？</h3>
**A**：它是语义化的——相近的 latent 对应相近的技能；latent 插值会得到平滑的技能过渡。这意味着可以在 latent 空间里做有意义的线性插值，比如从"冲刺"到"下蹲"的过渡会产生语义连贯的中间动作。
</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（1 节）：2026-04-07：CALM 的真正贡献是"层次化解耦"而非新算法</summary>

<h3 id="2026-04-07calm-的真正贡献是层次化解耦而非新算法">2026-04-07：CALM 的真正贡献是”层次化解耦”而非新算法</h3>

CALM 用的核心技术（对抗模仿、latent skill embedding）在 ASE/AMP 里都有了。

CALM 的真正贡献是架构设计：

> **把"技能选择"和"方向控制"分开成两个问题，用层次化策略分别解决。**

这个设计思想影响了后来很多工作，包括 PULSE 和更广义的 motion foundation model 设计。
</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 节）：A. 与路线图其他论文的关联 / B. 与相关方法对比 / C. 你该怎么理解 CALM？</summary>

<h3 id="a-与路线图其他论文的关联">A. 与路线图其他论文的关联</h3>

| 关系 | 说明 |
|------|------|
| **ASE → CALM** | CALM 在 ASE 的 latent skill space 基础上加入方向控制层 |
| **AMP → CALM** | CALM 的低层判别器技术继承自 AMP |
| **CALM → PULSE** | PULSE 把 CALM 的 latent 思想扩展到更大规模的通用技能提取 |

<h3 id="b-与相关方法对比">B. 与相关方法对比</h3>

| 特性 | ASE | CALM | DeepMimic |
|------|-----|------|-----------|
| 核心目标 | 多技能 latent | 可控多技能 latent | 单技能精确模仿 |
| 能否按动捕「点名」技能 | ❌（随机采 $z$） | ✅（$z = E(M)$） | N/A |
| 能否指定动作 + 方向 | ❌（高层只按任务奖励挑 $z$） | ✅（方向项 + 风格项） | ❌ |
| 是否有层次化架构 | ✅（两层） | ✅（两层） | ❌ |
| 是否支持 FSM 组合 | ❌ | ✅ | ❌ |
| latent 是否语义化 | 部分 | ✅（方向有语义） | N/A |

<h3 id="c-你该怎么理解-calm">C. 你该怎么理解 CALM？</h3>

如果只记一句：

> **CALM 先让每段动捕都能编成可点名的技能 latent，再加一个"方向舵"——高层在目标动作的 latent 附近挑 $z$ 来控制运动方向，最后用 FSM 组合出复杂行为。**

如果再加一句：

> **它的核心思想是把"做什么"（技能）和"往哪做"（方向）分开——前者由 latent 决定，后者由高层策略决定。**
</details>

---

## 参考来源

- arXiv: https://arxiv.org/abs/2305.02195  
- NVIDIA PAR Lab: https://research.nvidia.com/labs/par/calm/  
- GitHub: https://github.com/NVlabs/CALM  

> 注：本文内容基于论文 SIGGRAPH 2023 版本、NVIDIA 官方项目主页与 GitHub 源码整理；部分直觉解释和工程细节属于我的归纳，不是论文原文直述。
