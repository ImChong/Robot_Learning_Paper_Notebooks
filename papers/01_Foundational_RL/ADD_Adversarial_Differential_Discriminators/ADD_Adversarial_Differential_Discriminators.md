---
layout: paper
paper_order: 6
title: "ADD: Adversarial Disentanglement and Distillation"
category: "Foundational RL"
demos: ["add"]
---

# ADD: Adversarial Disentanglement and Distillation
**对抗差分鉴别器：基于物理的运动模仿**

> 📅 阅读日期: 2026-04-07
>
> 🏷️ 板块: Reinforcement Learning / Motion Imitation / Adversarial Learning

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2505.04961](https://arxiv.org/abs/2505.04961) |
| **PDF** | [下载](https://arxiv.org/pdf/2505.04961) |
| **作者** | Ziyu Zhang, Sergey Bashkirov, Dun Yang, Yi Shi, Michael Taylor, Xue Bin Peng |
| **机构** | Simon Fraser University, NVIDIA |
| **发布时间** | 2025-05-08 (arXiv), SIGGRAPH Asia 2025 |
| **项目主页** | [ADD Project Page](https://add-moo.github.io/) |
| **GitHub** | [xbpeng/MimicKit](https://github.com/xbpeng/MimicKit) |

---

## 🎯 一句话总结

ADD 的核心很狠：**把“精确运动跟踪”从手工 reward 工程问题，变成一个对抗判别问题。** 它不再像 DeepMimic / PHC 那样手调 pose、velocity、end-effector、CoM 各种权重，而是训练一个**只看“参考和当前的差值”**的判别器，直接告诉策略“你离目标还有多远、方向对不对”。

> 🎮 **本文内嵌 1 段动画 + 3 个可交互演示**（不用装任何东西）：
> 1. [五幕动画：ADD 全流程](#add-explainer-anim) —— 约 78 秒串完「手写加权和的困境 → 改判 Δo → 归一化/打分/奖励 → 四阶段的注意力转移 → 训练闭环」
> 2. Δo 实验台 —— 拖四个维度的跟踪误差，看差分怎么被归一化、打分、变成 PPO 收到的奖励
> 3. 谁来决定「先修哪一维」—— DeepMimic 写死的四项权重和判别器的隐含权重并排画，切换旋风踢的四个阶段
> 4. 自动课程实验台 —— 判别器跟着策略一起变严，和一个固定核宽度的 reward 同台跑

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **ADD** | Adversarial Differential Discriminator | 对抗差分鉴别器：用“状态差值”做判别来替代手工 tracking reward |
| **AMP** | Adversarial Motion Priors | 对抗运动先验：判别器判断动作像不像真人 |
| **RL** | Reinforcement Learning | 强化学习 |
| **MOO** | Multi-Objective Optimization | 多目标优化 |
| **PPO** | Proximal Policy Optimization | 近端策略优化，ADD 的底层优化器 |
| **GAN** | Generative Adversarial Network | 生成对抗网络 |
| **MoCap** | Motion Capture | 动作捕捉 |
| **Sim-to-Real** | Simulation to Real | 仿真到真实迁移 |

---

## 🎬 五幕动画：ADD 全流程 {#add-explainer-anim}

<div class="paper-demo" data-demo="add-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 动画覆盖的三块——「这篇论文要解决什么问题」「ADD 是怎么做的」和实例里的四步拆解——**文字讲解默认折叠**，想看推导、公式和对照表时点开各节的折叠条即可，内容一字未删；流程图、源码片段、论文超参表、面试题与附录不在折叠范围内。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个大 reward 要同时管多少件事，以及它带来的三件麻烦</summary>

ADD 瞄准的是一个很老、但一直很烦的问题：

**当任务目标不止一个时，你怎么把多个目标揉成一个“好用的 reward”？**

在 motion tracking 里尤其典型。

如果你想让一个物理角色精确模仿参考动作，通常要同时考虑：
- 关节姿态对不对
- 关节速度对不对
- 手脚末端位置对不对
- 质心对不对
- 动作要不要更平滑
- 是否还得保留自然感

传统做法就是写一个大 reward：

$$
r = w_1 r_{pose} + w_2 r_{vel} + w_3 r_{ee} + w_4 r_{com} + \cdots
$$

问题是：

1. **权重很难调**  
   你把姿态权重开大，动作会更像，但可能节奏乱；你把末端位置权重开大，手脚可能到位了，但整体动作僵硬。

2. **不同技能要重新调**  
   走路、跑步、后空翻、旋风踢，这些动作的最佳 reward 权重根本不一样。

3. **reward 工程很耗人**  
   不是不能做，而是很费。你最后经常不是在研究方法，而是在当 reward 调参工。

> 💡 **类比**：
> 传统 tracking reward 像你在给学生打总分：姿态 30 分、速度 20 分、末端 25 分、质心 25 分。问题是每门课比例都要人工定，而且不同学生、不同考试还得重调。ADD 的想法则是：**别自己定科目权重了，直接训练一个“总教练”判断你现在和标准答案差在哪里。**
</details>

论文的关键洞察是：

> **精确 tracking 本质上也是一个多目标优化问题，而对抗学习可以替代手工加权。**

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：AMP 判「像不像真人」，ADD 判「差值像不像 0」</summary>

AMP 已经证明了判别器可以用来学“自然动作分布”；
ADD 则更进一步：

- AMP 判别的是：**你像不像真人动作分布**
- ADD 判别的是：**你和目标动作的差值，像不像“完美匹配时的差值”**

而“完美匹配时的差值”其实就是 **0**。

这就是 ADD 最巧的地方：

- 正样本不再是整段专家动作
- 正样本变成一个**零差向量**
- 负样本则是“参考动作 - 当前动作”的差分

所以 ADD 其实是在学一个判别边界：

> **当前你和目标之间的误差，看起来像不像“误差为 0”这个理想状态。**

这直接把 reward 设计从“人工凑加权和”变成了“让判别器自动学多目标之间的 trade-off”。
</details>

---

## 🔧 ADD 是怎么做的？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：人话版：AMP 的形式 + DeepMimic/PHC 的目标</summary>

先说一句人话版：

> **ADD = AMP 的形式 + DeepMimic/PHC 的目标。**

AMP 擅长学“像不像真人”；
DeepMimic / PHC 擅长学“跟得准不准”；
ADD 把对抗学习从“分布匹配”改造成“差分匹配”，于是你既保留了 adversarial 的自动权衡能力，又把目标收紧到了精确 tracking。
</details>

### 第一个概念：别直接判状态，判“误差”

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$\Delta o = o^{demo} - o$ 这一步为什么关键，以及正样本为什么自然是零向量</summary>

假设当前模拟角色的判别输入是 $o$，参考动作对应的输入是 $o^{demo}$。

ADD 不直接把两者分别喂给判别器，而是先做差：

$$
\Delta o = o^{demo} - o
$$

这一步非常关键。

因为在 tracking 任务里，你真正关心的不是“当前姿态本身好不好”，而是：

> **它离目标姿态还有多远。**

如果完全匹配，那么：

$$
\Delta o = 0
$$

于是 ADD 的正样本就自然变成了零向量，而负样本是实际出现的差分误差。
</details>

### 第二个概念：正样本只有一个也够用

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：正类是一个点，不是一个分布（Differential Discriminator 的字面意思）</summary>

传统 GAN / AMP 通常需要大量正样本分布；但 ADD 这里的正样本不是一堆复杂数据，而是一个固定理想点：

$$
\Delta o^{+} = 0
$$

也就是说，ADD 的判别器学的是：
- **正类**：零差值（理想 tracking）
- **负类**：非零差值（当前 tracking 误差）

这就是论文标题里 “Differential Discriminator” 的含义。

> 💡 **直觉**：
> 不是问“这个动作像不像专家”，而是问“你现在这个误差，看起来像不像‘没有误差’”。
</details>

下面这个实验台把这一步拆开了：拖动四个维度上的跟踪误差，看 $\Delta o$ 怎么被归一化、怎么被判别器打成一个分数、最后怎么变成 PPO 收到的奖励。**注意正样本那条线始终钉在 $\Delta o = 0$ 上**——它是唯一的正类：

<div class="paper-demo" data-demo="add-diff"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第三个概念：奖励来自判别器，而不是手工加权

ADD 的训练流程可以概括成：

<div class="mermaid">
flowchart LR
    S1["① 环境：当前 o + 参考 o^demo"] --> S2["② Δo = o^demo - o"]
    S2 --> S3["③ 判别器 D(Δo)<br/>正类=零向量"]
    S3 --> S4["④ r_disc → PPO 更新 π"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：总 reward 退化成 $r \approx r_{disc}$</summary>

所以总 reward 本质上变成：

$$
r \approx r_{disc}
$$
</details>

在 MimicKit 的默认配置里，甚至直接把 task reward 权重设成 0：

```yaml
task_reward_weight: 0.0
disc_reward_weight: 1.0
```

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：这两行 yaml 说明作者不是拿对抗项当正则</summary>

这意味着：

> **默认 ADD 几乎完全靠判别器 reward 驱动。**

这点很猛，因为它说明作者不是把对抗项当辅助正则，而是真拿它替代手工 tracking reward。
</details>

### 第四个概念：为什么它能自动平衡多个目标？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：差分向量里本来就装着四类误差，权重交给判别器学</summary>

因为差分向量里本身就同时包含了多个维度的信息：
- 姿态差
- 速度差
- 末端差
- 其他观测差

判别器会自己学习哪些维度在当前任务更关键。

这和手工 reward 最大的不同是：
- 手工 reward：你先假设 pose 比 vel 更重要，再写权重
- ADD：让判别器自己从数据里学“什么时候 pose 更重要，什么时候 vel 更重要”

这就是它对多目标优化更自然的地方。
</details>

「自动平衡」听起来很虚，直接对比一下就具体了。下面这个演示把 DeepMimic 写死的四项权重（0.65 / 0.1 / 0.15 / 0.1）和判别器的隐含权重并排画出来，切换旋风踢的四个阶段，看固定权重从哪一步开始跟不上：

<div class="paper-demo" data-demo="add-reward"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第五个概念：它和 AMP 到底差在哪？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：AMP 与 ADD 的对照表，以及两句话版的区别</summary>

这是面试必问。

| 方法 | 判别器输入 | 正样本 | 学到什么 |
|------|------------|--------|----------|
| **AMP** | 动作/状态片段本身 | 专家运动片段 | 像不像真实动作分布 |
| **ADD** | 参考与当前的差分 $\Delta o$ | 零差向量 | 跟目标跟得准不准 |

所以：

- **AMP 更像 style prior / naturalness prior**
- **ADD 更像 tracking objective learner**

如果说 AMP 是在回答：
> “你像不像人？”

那 ADD 回答的是：
> “你离标准答案还有多远？”
</details>

---

## 🚶 具体实例：ADD 怎么学会旋风踢？

<h3 id="add-pipeline">端到端流程图（MimicKit 默认 ADD humanoid）</h3>

<div class="mermaid">
flowchart TB
    A["参考动作 humanoid_spinkick.pkl"] --> B["参考帧 r_t<br/>+ 前瞻 r_(t+1, t+2, t+3)"]
    C["Isaac Gym<br/>4096 并行 env"] --> D["当前 sim 状态 s_t"]
    B --> E["obs = s_t  ##  r_(t+1..t+3)"]
    D --> E
    E --> F["Actor pi<br/>fc_2x1024, sigma=0.05"]
    F --> G["action a_t (28-D)"]
    G --> C
    D --> H["差异对 (s_t, r_t)"]
    B --> H
    H --> I["Differential Discriminator D<br/>fc_2x1024 (单步差, num_disc_obs_steps=1)"]
    I --> J["disc reward r_t<br/>(grad penalty=2, scale=2)"]
    J --> K["PPO Update<br/>clip=0.2, GAE lambda=0.95"]
    K --> F
    D -. "||body - ref|| > 1.0m" .-> L["Early Termination"]
</div>

> 关键反差：DeepMimic 用**手写的 5 项 reward** 衡量"像不像参考"；AMP 用判别器看**两个独立的 state-pair**；ADD 用判别器看**(当前帧, 参考帧) 的差**——既保留了 DeepMimic 的 phase-aligned 跟踪结构（`tar_obs_steps`、`pose_termination`），又把 reward 设计交给判别器学。

### MimicKit 默认 yaml 关键超参

来源：[`add_humanoid_env.yaml`](https://github.com/xbpeng/MimicKit/blob/main/data/envs/add_humanoid_env.yaml) + [`add_humanoid_agent.yaml`](https://github.com/xbpeng/MimicKit/blob/main/data/agents/add_humanoid_agent.yaml)。

| 项 | 取值 | 与 AMP 对比 |
|----|------|-----|
| `num_envs` | 4096 | 同 |
| `motion_file` | `humanoid_spinkick.pkl` | 同（默认配置都用 spinkick） |
| `pose_termination` | **True** (dist 1.0m) | AMP 是 False |
| `tar_obs_steps` | **[1, 2, 3]** | AMP 没有（不喂未来参考） |
| `num_phase_encoding` | 4 | AMP 没有 |
| `num_disc_obs_steps` | **1** | AMP 是 10（ADD 看单步差，AMP 看 10 步窗口） |
| `disc_grad_penalty` | **2** | AMP 是 5（ADD 判别器更"软"） |
| `disc_reward_scale` | 2 | 同 |
| `task_reward_weight` / `disc_reward_weight` | 0.0 / 1.0 | 同（纯 disc reward） |
| Actor / Critic / Disc | fc_2x1024 | 同（不像 ASE 的 3 层） |
| 优化器 | SGD lr=1e-4 / disc 2.5e-4 | 同 AMP |

→ 把 ADD 看成 **DeepMimic 骨架 + AMP 判别器、且判别器吃"差"而不是"对"**：保留 phase 对齐与 early termination 让训练有跟踪 anchor，但不再手写 5 项指数核 reward——让判别器自己从数据里学出"像参考"的标准。

---

假设参考动作是一段 **spinkick（旋风踢）**，包含如下阶段：

<div class="mermaid">
flowchart LR
    P1["阶段1：站稳蓄力"] --> P2["阶段2：旋转启动"]
    P2 --> P3["阶段3：抬腿踢出"]
    P3 --> P4["阶段4：收腿落地"]
    P4 --> P5["阶段5：重新站稳"]
</div>

### 第 1 步：当前状态与参考状态做差

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：这一帧的四个差值分别有多大</summary>

在某个时刻，环境会同时拿到：
- 当前模拟角色观测 $o$
- 参考动作当前帧观测 $o^{demo}$

然后做差：

$$
\Delta o = o^{demo} - o
$$

如果角色已经很接近参考动作，比如：
- 髋关节只差一点点
- 身体旋转角速度只慢一点点
- 踢腿末端位置也只差几厘米

那么 $\Delta o$ 会很小。

如果角色完全乱了，比如旋转节奏错了、踢腿时机也不对，那 $\Delta o$ 就会很大。
</details>

### 第 2 步：判别器判断“这个误差像不像 0”

ADD 的判别器看到的是差分向量，而正样本就是全 0：

<div class="mermaid">
flowchart TB
    POS["正样本 Δo ≈ 0<br/>[0, 0, ..., 0]"] --> D["判别器 D(Δo)"]
    NEG["负样本 大误差<br/>[0.12, -0.37, ..., 1.45]"] --> D
    D --> R["r_disc 高/低 → PPO"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：打分高低怎么对应误差大小</summary>

如果当前误差很小，判别器会给更高分；
如果当前误差很大，判别器会给更低分。
</details>

### 第 3 步：策略得到 reward 并更新

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PPO 拿到这个奖励之后会往哪儿推</summary>

于是 PPO 会倾向于选择那些能让误差变小的动作：

- 旋转慢了 → 加大躯干与髋部协同
- 踢腿位置偏了 → 调整支撑腿和摆腿轨迹
- 落地不稳 → 更快把质心收回来

你会发现，这其实和手工 tracking reward 达到的是同一目标；
但不同的是：

> **ADD 不需要你手工提前规定“姿态 0.5、速度 0.2、末端 0.3”这种比例。**
</details>

### 第 4 步：为什么它对敏捷动作尤其有意义？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：阶段性强的动作，权重本来就不该是常数</summary>

像旋风踢、空翻、杂技这种动作，手工 reward 往往很难调：
- 有些阶段姿态最重要
- 有些阶段角速度最重要
- 有些阶段末端轨迹最重要

这些权重不是全程恒定的。

而 ADD 的判别器会在不同状态区间自动学到不同维度的重要性，所以对这种**阶段性强、动态变化快**的动作尤其有优势。
</details>

还有一件手工 reward 做不到的事：**判别器的标准会跟着策略一起变严**。策略越准，负样本离零向量越近，判别器必须更挑剔才分得开——奖励的「陡峭区」于是一路往 0 挪，形成一条自动课程。下面这个玩具训练回路把它和一个固定核宽度 $\exp(-k e^2)$ 的 reward 放在一起跑：

<div class="paper-demo" data-demo="add-curriculum"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🤖 ADD 对人形机器人领域的意义

### 1. 它在挑战一个老习惯：reward 工程不一定非做不可

过去大家默认：
- 精确 tracking 就得手工 reward
- 对抗学习只能做“风格像不像”“自然不自然”

ADD 直接反过来说：

> **对抗学习也可以做精确 tracking，而且还能替代手工 reward。**

这事不只是 motion imitation 有用，对更广泛的多目标 RL 也有启发意义。

### 2. 它把“tracking”重新表述成“误差判别”

这其实是个很漂亮的建模视角。

因为很多控制任务本质上都不是绝对状态判断，而是**目标差值最小化**：
- 轨迹跟踪
- 姿态跟踪
- 力控制误差
- 视觉伺服误差

ADD 给了一个通用思路：

> **如果你的任务核心是“让误差趋近于 0”，那就可以考虑直接判误差，而不是手写误差聚合公式。**

### 3. 它比 AMP 更接近“可部署 tracking 系统”

AMP 更偏“动作自然性正则器”；
ADD 更偏“目标跟踪驱动器”。

如果你的目标是：
- 精准复制参考运动
- 尽量少做手工 reward 调参
- 技能跨度很大（从走路到杂技）

那么 ADD 的味道会更对。

### 4. 它对 robotics 的启发不止在动画

虽然论文场景是 physics-based character control，但这个思路很容易迁到机器人：
- 末端轨迹 tracking
- 全身动作跟踪
- 多目标 imitation + smoothness + energy 的自动平衡

尤其在 humanoid 上，reward 工程一直是巨坑。ADD 这种“让判别器学 trade-off”的思路，值得认真看。

---

## 📁 MimicKit 源码对照

ADD 在 MimicKit 里已经有官方实现，而且实现很清楚：**它就是在 AMPAgent 基础上，把判别器输入从“动作片段本身”改成了“参考与当前的差值”。**

### 源码类图：ADD 对 AMP 的最小增量

先看静态结构（接着 AMP 笔记的类图往下长）。`ADDModel` 几乎是空的——网络结构与 AMP 完全一致，全部改动都在 **Agent 侧的数据流**：判别器喂什么、正负样本怎么造：

<div class="mermaid">
classDiagram
    class AMPAgent {
        amp_agent.py
        #_compute_disc_loss() 真样本=mocap
    }
    class ADDAgent {
        add_agent.py
        #_build_pos_diff() 正样本=全0差向量
        #_record_data_post_step() 记录diff
        #_compute_rewards() 奖励全靠判别器
        #_compute_disc_loss() 负样本=当前diff+replay
    }
    class AMPModel {
        amp_model.py
        +eval_disc(disc_obs)
    }
    class ADDModel {
        add_model.py 仅改输入维度
    }
    class DiffNormalizer {
        diff_normalizer.py
        位置/角度/速度分量纲归一化
    }
    AMPAgent <|-- ADDAgent : 继承
    AMPModel <|-- ADDModel : 继承
    ADDAgent o-- ADDModel : _model
    ADDAgent o-- DiffNormalizer : 归一化差向量
</div>

- 对照 AMP 类图看增量：判别器输入从 $(s_t, s_{t+1})$ 状态对变成 `tar_disc_obs − disc_obs` 差向量；真样本从 mocap 片段变成**固定的全 0 张量**。
- `DiffNormalizer` 是 ADD 专属的辅助类——差向量里位置（米）、角度（弧度）、速度量纲不同，必须分量归一化后判别器才学得动。

### 源码运行时序图

以第 8 节的训练命令 `python mimickit/run.py --mode train --agent_config add_*_agent.yaml` 为入口。`ADDAgent` 继承 `AMPAgent`，时序骨架与 AMP 一致，但**判别器的输入与正负样本构造完全不同**：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as run.py
    participant AG as ADDAgent<br/>(add_agent.py)
    participant M as ADDModel<br/>(Actor + Critic + Diff Disc)
    participant E as Env + Isaac Gym
    participant ML as 参考动作<br/>(单段 clip)
    U->>R: python mimickit/run.py --mode train ...
    R->>E: build_env()
    R->>AG: build_agent()：agent_name "ADD" → ADDAgent
    AG->>AG: 初始化 _pos_diff = 全 0 张量（唯一的正样本）
    R->>AG: train_model(max_samples)
    loop 每轮迭代 _train_iter()
        loop rollout：_rollout_train(steps_per_iter)
            AG->>M: eval_actor(obs) → a_t（obs 含前瞻参考帧，DeepMimic 式相位对齐）
            AG->>E: _step_env(a_t)
            E->>ML: 取当前参考帧 ref_t
            E-->>AG: obs、done（pose termination：偏离参考 > 1.0 m 终止）
            AG->>AG: 记录差异对 diff = tar_disc_obs − disc_obs
        end
        AG->>AG: DiffNormalizer 归一化 diff（位置/角度/速度量纲不同）
        AG->>M: eval_disc(norm_diff) → r_disc（disc_reward_weight=1.0，奖励全靠判别器）
        AG->>AG: _build_train_data()：GAE 优势
        loop mini-batch 更新 _update_model()
            AG->>M: Disc 更新：正样本 = 零差向量 _pos_diff，负样本 = 当前差异 + replay 差异
            AG->>M: grad penalty=2 + logit 正则，稳定判别器
            AG->>M: Critic MSE + Actor PPO-Clip 更新
        end
    end
    R->>AG: 周期性 test_model() + 保存 checkpoint
</div>

- ④ 是 ADD 最特别的一步：正样本在初始化时就固定为全 0 张量（"误差为零"），对应下面第 2 节。
- ⑥ 和 ⑨ 保留了 DeepMimic 的相位对齐与 pose termination；⑩–⑫ 里奖励不再手写，判别器吃"参考与当前的差"直接给分（对应第 3、4、5 节）。
- ⑭–⑮ 对应第 2、7 节：负样本是新旧 rollout 的差异向量，配 replay buffer、gradient penalty 与 logit 正则。

### 1. ADDAgent 继承自 AMPAgent

```python
# mimickit/learning/add_agent.py
class ADDAgent(amp_agent.AMPAgent):
    def __init__(self, config, env, device):
        super().__init__(config, env, device)
        self._pos_diff = self._build_pos_diff()
```

这说明 ADD 不是推翻 AMP 重写，而是在 AMP 的框架上改判别器目标。

### 2. 正样本就是零差值

```python
# mimickit/learning/add_agent.py
pos_diff = self._pos_diff.clone()
pos_diff = pos_diff.unsqueeze(dim=0)
pos_diff.requires_grad_(True)
disc_pos_logit = self._model.eval_disc(pos_diff)
```

这里的 `self._pos_diff` 在初始化时被构造成全 0 张量。

也就是说：
- **正样本** = `0`
- 意义 = “当前状态和参考状态完全一致”

这就是 ADD 最关键的实现细节。

### 3. 负样本是 demo 和当前观测的差分

```python
# mimickit/learning/add_agent.py
diff_obs = tar_disc_obs - disc_obs
...
replay_diff = replay_tar_disc_obs - replay_disc_obs
diff_obs = torch.cat([diff_obs, replay_diff], dim=0)
```

这一段就是 ADD 的核心：

$$
\Delta o = o^{demo} - o
$$

判别器不再看“动作本身”，而是看“误差本身”。

### 4. 判别器 reward 完全主导训练

```python
# mimickit/learning/add_agent.py
obs_diff = disc_obs_demo - disc_obs
norm_obs_diff = self._disc_obs_norm.normalize(obs_diff)
disc_r = self._calc_disc_rewards(norm_obs_diff)

r = self._task_reward_weight * task_r + self._disc_reward_weight * disc_r
```

对应默认配置：

```yaml
task_reward_weight: 0.0
disc_reward_weight: 1.0
```

也就是说默认训练几乎完全靠 discriminator reward。

### 5. 差分归一化器（DiffNormalizer）

```python
# mimickit/learning/add_agent.py
self._disc_obs_norm = diff_normalizer.DiffNormalizer(...)
```

这一步很重要。因为不同误差维度量纲不同：
- 位置误差可能是米
- 角度误差可能是弧度
- 速度误差可能是 m/s 或 rad/s

如果不归一化，判别器会被某些大尺度维度带偏。

### 6. ADDModel 本身并不复杂

```python
# mimickit/learning/add_model.py
class ADDModel(amp_model.AMPModel):
    def __init__(self, config, env):
        super().__init__(config, env)
```

说明 ADD 的创新不在网络结构花活，而在：
- 判别器输入设计
- 正负样本构造方式
- 用差分替代手工 tracking reward

### 7. 默认超参数

```yaml
# data/agents/add_g1_agent.yaml
agent_name: "ADD"

disc_buffer_size: 200000
disc_replay_samples: 1000
disc_logit_reg: 0.01
disc_grad_penalty: 2
disc_reward_scale: 2

task_reward_weight: 0.0
disc_reward_weight: 1.0

ppo_clip_ratio: 0.2
td_lambda: 0.95
discount: 0.99
```

### 8. 训练 / 测试命令

```bash
# 训练
python mimickit/run.py --mode train \
  --num_envs 4096 \
  --engine_config data/engines/isaac_gym_engine.yaml \
  --env_config data/envs/add_humanoid_env.yaml \
  --agent_config data/agents/add_humanoid_agent.yaml \
  --visualize false \
  --out_dir output/

# 测试
python mimickit/run.py --mode test \
  --num_envs 4 \
  --engine_config data/engines/isaac_gym_engine.yaml \
  --env_config data/envs/add_humanoid_env.yaml \
  --agent_config data/agents/add_humanoid_agent.yaml \
  --visualize true \
  --model_file data/models/add_humanoid_spinkick_model.pt
```

---

## 🎤 面试高频问题 & 参考回答

### Q1: ADD 和 AMP 的核心区别是什么？
**A**：AMP 的判别器输入是动作/状态片段本身，目标是学习“像不像真实运动分布”；ADD 的判别器输入是参考与当前之间的差分，目标是学习“离目标是否接近零误差”。所以 AMP 更偏自然性先验，ADD 更偏精确 tracking。

### Q2: 为什么 ADD 只需要一个正样本？
**A**：因为它判别的不是专家分布，而是误差分布。理想 tracking 时误差恒为 0，所以正样本天然就是零差向量，不需要像 GAN/AMP 那样准备大量正样本片段。

### Q3: ADD 为什么能替代手工 reward？
**A**：因为多目标 tracking 本质上就是多个误差项的联合优化。传统方法靠手工加权和，ADD 则让判别器直接在差分空间里学习“哪些误差组合更接近理想匹配”。这相当于把 reward 聚合器从手工规则换成了可学习模型。

### Q4: ADD 的优点是什么？
**A**：核心优点有三个：① 少手工调参；② 更容易跨不同技能复用；③ 对复杂敏捷动作更自然，因为不同阶段可以自动学习不同维度的重要性。

### Q5: ADD 的潜在代价是什么？
**A**：训练会更依赖判别器稳定性，需要处理 replay buffer、gradient penalty、logit regularization、输入归一化等工程细节。如果判别器训崩，reward 信号也会一起崩。

### Q6: ADD 适合什么任务？
**A**：适合那种“本质是误差趋近于 0”的多目标 tracking 任务，比如动作模仿、全身姿态跟踪、末端轨迹跟踪。对于纯开放式风格生成，AMP 那类方法通常更自然。

---

## 💬 讨论记录

### 2026-04-07：ADD 的一句话本质

ADD 不是“又一个 adversarial imitation trick”，它真正有价值的地方是：

> **把 tracking reward 从“人工写公式”变成“学习一个误差判别器”。**

这比“它能模仿旋风踢”更值得记。

---

## 📎 附录

### A. 与路线图其他论文的关联

| 关系 | 说明 |
|------|------|
| **AMP → ADD** | ADD 将 AMP 的分布匹配改成误差匹配 |
| **DeepMimic → ADD** | DeepMimic 用手工 tracking reward，ADD 用差分判别器自动学 tracking reward |
| **PHC → ADD** | PHC 仍依赖手工 imitation reward，ADD 试图把这一步自动化 |
| **ADD → 后续工作** | 为“学习型 reward 聚合器”提供了一个很强的范式 |

### B. ADD 和相关方法对比

| 特性 | DeepMimic | AMP | PHC | ADD |
|------|-----------|-----|-----|-----|
| 目标 | 精确 tracking | 学自然动作分布 | 大规模 tracking + recovery | 精确 tracking |
| reward 来源 | 手工设计 | 判别器 + task reward | 手工 imitation + AMP | 差分判别器 |
| 是否需要手工加权 tracking 项 | ✅ | 部分需要 | ✅ | ❌ |
| 判别器输入 | 无 | 动作片段本身 | AMP 片段 | 参考-当前差分 |
| 正样本 | 无 | 专家运动片段 | 专家运动片段 | 零差向量 |

### C. 你该怎么理解 ADD？

如果只记一句：

> **AMP 学“像不像人”，ADD 学“离目标差多少”。**

如果再加一句：

> **ADD 最值钱的，不是换了个判别器名字，而是它把多目标 reward 聚合从手工工程，推进到了可学习范式。**

---

## 参考来源

- arXiv: https://arxiv.org/abs/2505.04961  
- MimicKit: https://github.com/xbpeng/MimicKit  
- ADD README: https://github.com/xbpeng/MimicKit/blob/main/docs/README_ADD.md  

> 注：本文内容基于论文摘要、MimicKit 官方实现与项目说明整理；其中部分直觉解释、类比和工程解读属于我的归纳，不是论文原文直述。
