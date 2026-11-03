---
layout: paper
title: "SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model"
zhname: "SuperMimic：用一个可微世界模型扩展人形全身控制"
category: "Loco-Manipulation and WBC"
arxiv: "2610.28480"
demos: ["supermimic"]
---

# SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model
**所有动作都由同一台机器人执行，那就只学一个世界模型：从标准仿真器的日志里拟合一个可求导的人形动力学模型，策略在它里面想象 32 步、把回报沿时间反传（BPTT）拿到解析梯度，评论家估计窗口之外的回报。世界模型和策略在一个循环里一起训：1 张 H100 训 3 小时就超过 SONIC（128 张 L40 × 7 天）的回报，显卡小时少 1000 倍以上；129,514 段 BONES-SEED 动作只失败 25 段（SONIC 179 段），2 张卡 9.8 小时一段不失败；同一个策略上真机 G1 做侧滚和空翻**

> 📅 阅读日期: 2026-11-03（前沿扩充：对照 arXiv v1 的 LaTeX 源码与项目页写成；用社区复现 Uni-SuperMimic 放出的模型做了复现实验；含十八幕讲解动画、三个交互演示和配音视频）
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 动作跟踪 · 可微世界模型 · 模型基强化学习 · BPTT · 短视界 actor–critic · 算力效率 · sim-to-real
>
> ℹ️ 笔记对照 [arXiv 2610.28480](https://arxiv.org/abs/2610.28480)（v1，2026-10-20；读的是 LaTeX 源码，图 3–5、图 7 和附录图的数就是源码里 pgfplots 的坐标）与[项目页](https://supermimic.github.io/)。**官方代码没有放出**（截至 2026-11-03）；项目页的网页演示是专有材料，许可证禁止下载、提取或用脚本访问，我们没有碰。复现用的是社区的 [Motphys/Uni-SuperMimic](https://github.com/Motphys/Uni-SuperMimic)（Apache-2.0，`ac19b73`）放出的 LAFAN1 模型：**我们没有安装它的包**，而是照它的代码独立重写了评测与世界模型的回放，在 CPU 上的 MuJoCo 3.11 里跑。凡是标着「我们 / 复现」的数都来自这次复现，不是论文的实验。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2610.28480](https://arxiv.org/abs/2610.28480)（v1，2026-10-20） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2610.28480) |
| **项目主页** | [supermimic.github.io](https://supermimic.github.io/)（仿真合集、算力对比、世界模型预测、真机视频、失败动作对比、浏览器里的演示） |
| **代码** | 官方未开源；社区复现见「📁 资源对照」，本笔记用 [Motphys/Uni-SuperMimic](https://github.com/Motphys/Uni-SuperMimic)（Apache-2.0）放出的 `lafan1_ckpt_012000.pt` |
| **发表** | CoRL 2026（Oral） |
| **作者** | Qiayuan Liao、Yiyang Shao\*、Junfeng Long\*、Kevin Zakka、Roberto Horowitz、Pieter Abbeel†、Koushil Sreenath†（\* 共同贡献，† 共同指导） |
| **机构** | UC Berkeley |
| **平台** | Unitree G1（29 自由度）；仿真器 MuJoCo Warp（50 Hz 控制、每步 4 个 5 ms 子步） |
| **训练** | 1 张 H100 3 小时超过 SONIC；2 张 H100 9.8 小时零失败；数据 BONES-SEED 129,514 段、264.56 小时 |
| **关键词** | Differentiable world model, backpropagation through time, short-horizon actor–critic, motion tracking, compute scaling |

**一行定位**：人形全身控制的主流路线是「跟踪大规模动作库」，但动作越多、算力越贵（SONIC 约 21,000 显卡小时）。SuperMimic 换掉的是训练方法本身：不再用模型无关的 PPO 从带噪的仿真样本里估梯度，而是学一个所有动作共享的可微动力学模型，让策略沿着这个模型直接求导。

---

## 🎯 一句话总结

> SuperMimic 认为，大规模动作跟踪之所以贵，是因为**模型无关的强化学习没有把所有动作共享的那套人形动力学单独学下来**，每段动作都要靠仿真采样重新估计「这个动作会导致什么」。它的做法是在一个循环里训两个学习器：**(1)** 当前策略带着小噪声在 MuJoCo Warp 里采数据，存进固定大小的回放缓冲区；**(2)** 从缓冲区抽 8 步的片段，自回归地拟合一个**确定性、以域随机化参数 $\xi$ 为条件**的世界模型；**(3)** 冻住世界模型，从缓冲区的真实状态出发让策略想象 $H=32$ 步，把「奖励 × 折扣 × 可导的存活权重」之和加上评论家的估值，沿时间反传（BPTT），得到低方差的解析梯度。梯度只经过学到的模型，所以**仿真器不必可微**。在 129,514 段 BONES-SEED 动作上，1 张 H100 训 3 小时的归一化回报就超过 SONIC 放出的模型（0.90），显卡小时少约 7200 倍（论文保守写 > 1000 倍）；失败 25 段对 SONIC 179 段（SONIC 整组失败的 44 个空翻、22 个侧滚它基本都能做），2 张卡 9.8 小时降到 0。论文把省下的算力归到世界模型的三个性质：**一个模型摊薄整个动作库**（数据从 1 涨到 264 小时，8 步预测误差保持在 0.007–0.011）、**想象比仿真快**（常用批量下快 10 倍以上）、**一阶梯度更有效**（同在模型里想象，PPO 要多 64 倍的步数）。同一个跟踪策略不按动作调参就上了真机 G1；同一个世界模型还能用速度跟踪奖励直接训一个下游的速度编码器，比蒸馏的好（672 次阶跃测试里 650 次误差更小）。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十八幕动画：SuperMimic 全流程](#sm-explainer-anim) —— 约 305 秒串完「跟踪的动作越多，算力越贵 → 两条老路（表 1）→ 所有动作共用一个身体 → 一个循环，两个学习器（图 2）→ 策略看什么、做什么（表 A.1）→ 世界模型：学一步的增量 → 世界模型像不像仿真器（我们的复现）→ 在想象里反向传播（式 2）→ 评论家：看到第 32 步之后（图 4b、c）→ 奖励、终止与随机化（表 A.2、A.3）→ 动作库与重置采样（附录 D、E）→ 一张卡 3 小时（图 3a）→ 179、25、0（表 A.6）→ 同样的设置和 PPO 比（图 4a）→ 为什么省：三个性质（图 3b、c，图 5）→ 上真机（图 6）→ 下游：速度命令（图 7）→ 局限与复现」
> [配音讲解视频](#sm-video) —— 同样十八幕，加中文配音与字幕，竖屏，可下载
> [世界模型 vs 仿真器](#demo-wm) —— 我们复现的三组对照（策略开着 / 策略关掉 / 地面变滑），拖时间看两边相差多少
> [BPTT 与似然比](#demo-grad) —— 一维玩具里比较两种梯度估计的方差，下面是我们在复现模型上量的余弦相似度
> [论文的数字](#demo-compute) —— 算力账本、图 3a / 4a / 5a / 5b / A.1 的曲线、表 A.6 的失败动作

> 🚶 [具体实例](#实例-环境设定)把论文和复现里的数从头算一遍：算力账本、归一化回报、跟踪奖励、终止的 78°、动作缩放与 PD 增益、折扣与软终止、GAE、重置采样、数据过滤、失败表、图 7 的计数，以及我们复现的四组数。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **WM** | World Model | 世界模型：给定状态、动作（和仿真上下文），预测下一步状态 |
| **BPTT** | Backpropagation Through Time | 沿时间反向传播：把多步想象的回报对每一步的动作求导 |
| **MBRL** | Model-Based Reinforcement Learning | 基于模型的强化学习：先学（或已知）动力学，再在模型里优化策略 |
| **PPO** | Proximal Policy Optimization | 模型无关的策略梯度算法，用似然比估梯度；SONIC 和对照组 PPO-Sim 用它 |
| **GAE** | Generalized Advantage Estimation | 广义优势估计；这里用它给评论家算回报目标（$\lambda=0.95$） |
| **SHAC** | Short-Horizon Actor-Critic | 在可微仿真器里做短视界 BPTT + 评论家；SuperMimic 的目标函数受它启发 |
| **Dyna** | — | 用真实数据训模型、在模型里想象来训策略的经典框架 |
| **SONIC** | Supersizing Motion Tracking for Natural Humanoid Control | NVIDIA 的大规模动作跟踪器，128 张 L40 训 7 天；本文的对比基线 |
| **BONES-SEED** | — | Bones Studio 公开的动作捕捉数据（G1 重定向版），SONIC 数据的公开子集 |
| **LAFAN1** | — | Ubisoft La Forge 的动作捕捉数据，40 段；论文控制变量实验与我们的复现用它 |
| **PD** | Proportional–Derivative | 关节的比例—微分控制器；增益很低，设定点更像力矩 |
| **MLP** | Multi-Layer Perceptron | 多层感知机；世界模型是 3 层、每层 2048 的 MLP |
| **GPU-h** | GPU-hours | 显卡小时 = 显卡数 × 训练小时 |

---

## 🎬 十八幕动画：SuperMimic 全流程 {#sm-explainer-anim}

<div class="paper-demo" data-demo="sm-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#sm-video}

<div class="paper-demo" data-demo="sm-video" data-src="media/supermimic_explainer_video.mp4" data-poster="media/supermimic_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/supermimic_explainer_video.mp4" download="SuperMimic_讲解视频.mp4">下载 mp4（25.3 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果、我们的复现）按小节收起，再往后的具体实例、资源对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 1 幕的仿真合集、第 16 幕林间侧滚和海边空翻的真机画面剪自[项目页](https://supermimic.github.io/)的视频，只做讲解引用；第 16 幕的四条真机快照和片头用到的渲染图是论文图 6、图 1 的裁剪。图 3–5、图 7 和附录图 A.1 照论文 LaTeX 里的坐标重画，表 1、表 A.1–A.6 照抄。第 3、5、7 幕的 G1 来自我们的复现：Uni-SuperMimic 放出的模型在 MuJoCo 里跑出的关节轨迹，用 [Robot_Retarget_Online](https://github.com/ImChong/Robot_Retarget_Online) 的 G1 模型和它的 three.js 材质离线渲染，蓝色半透明的那台是参考动作。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    A["跟踪大规模动作库<br/>= 通用、有表现力的人形全身控制"] --> B["动作越多越贵"]
    B --> C1["专才 + 蒸馏（BeyondMimic 等）<br/>蒸馏有损"]
    B --> C2["一个策略硬堆算力（SONIC）<br/>128 张 L40 × 7 天 ≈ 21,000 显卡小时"]
    C1 --> D["共同的瓶颈：模型无关的 RL<br/>每段动作都靠带噪的仿真采样估梯度"]
    C2 --> D
    D --> E["可动作都由同一台机器人执行<br/>共享的刚体与接触动力学没被单独学下来"]
    E --> S["SuperMimic：从仿真日志学一个可微世界模型<br/>策略在里面想象、沿梯度学"]

    style D fill:#fdecea,stroke:#c0392b
    style S fill:#e8f8e8,stroke:#27ae60
</div>

### 跟踪越多动作，算力越贵（引言）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：动作跟踪是通用全身控制的主流；两种扩展方式都很贵；SONIC 约 21,000 显卡小时；共享的动力学没被利用</summary>

物理动作模仿（DeepMimic 一脉）训练强化学习策略去跟踪参考动作片段，参考来自大规模动作捕捉数据。现有系统有两种扩展方式：把很多「一段动作一个」的专才蒸馏成一个控制器（BeyondMimic），或者在大动作库上直接训一个通才（SONIC）。两种情况下，动作库越多样，控制器越强；但随着覆盖的动作增多，计算也越来越贵——SONIC 在 128 张 GPU 上训了约 168 小时，约 21,000 显卡小时。

论文的诊断：参考动作各不相同，但它们共享同一套**人形的混合刚体动力学**。模型无关的 RL 没有显式建模这套共享结构，而是**反复从带噪的仿真 rollout 里估计动作的后果**，于是「扩展到更多动作」就等于「扩展算力」。

</details>

### 两条老路（相关工作、表 1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：表 1 比较各方法在「跟踪 / 潜空间 / 下游」三步各用什么训、下游的训练信号是什么、有没有上真机；可微动力学一脉：SuperTrack、ControlVAE、MoConVQ、SuperDyno；模型基一脉：Dreamer、TD-MPC、SHAC、RWM</summary>

论文的表 1（我们照抄，连在一起的格子表示一起训）：

| 方法 | 跟踪 | 潜空间 | 下游 | 下游的信号 | 真机 |
|---|---|---|---|---|---|
| NPMP | SVG(0) | BC | SVG(0) | RL | ✗ |
| ControlVAE | MBRL（与潜空间一起） | ← | MBRL | RL | ✗ |
| PhysicsVAE | PPO | BC¹ | PPO | RL | ✗ |
| PULSE | PPO | DAgger | PPO | RL | ✗ |
| MaskedMimic | A2C | DAgger（与下游一起） | ← | 蒸馏 | ✗ |
| BeyondMimic | PPO | DAgger | CGD（分类器引导扩散） | 蒸馏 | ✓ |
| SONIC | PPO（三步一起） | ← | ← | 蒸馏² | ✓ |
| LATENT | PPO | DAgger | PPO | RL | ✓ |
| **SuperMimic** | **MBRL（三步一起）** | ← | ← | **蒸馏 / RL** | ✓ |

¹ 离线行为克隆，外加通过冻结的学习动力学模型的一步一致性项。² 目标编码器和跟踪器一起训，用跟踪奖励和潜空间对齐损失，没有任务奖励。

**相关的三条线**：

- **大规模物理动作跟踪**：DeepMimic → PHC（大动作集 + 恢复）→ SONIC（扩展数据、容量和算力，迁移到真机）。都要大量仿真 rollout。
- **学到的可微动力学用于动作控制**：SuperTrack（通过学到的可微替身优化策略）、ControlVAE（联合学动力学、潜技能和生成式控制器）、MoConVQ（离散动作表示、几十小时数据）、SuperDyno（扩展到几万段动作）。SuperMimic 把这条线推到「单卡训练大规模人形跟踪器 + 上真机」：世界模型以仿真上下文为条件，部署的演员只用带噪的本体感受和目标。
- **模型基策略优化与真机**：Dreamer / DreamerV3（潜空间动力学 + 想象里的 actor–critic）、TD-MPC（短视界规划 + 终端价值）、DayDreamer（直接在真机上学世界模型）、SHAC（可微仿真里的短视界 actor–critic，启发了本文带评论家的目标）。RWM、RWM-U 在学到的神经仿真器里用 PPO 训策略并迁移到真机，世界模型用别的策略的轨迹预训练；SuperMimic 直接对学到的动力学求导，而且世界模型是在训练中用它自己的策略采的数据拟合的。

</details>

---

## 🔧 方法详解（第 3 节、附录 A–E）

<div class="mermaid">
flowchart LR
    subgraph C["① 采数据（策略冻结）"]
        P1["策略 π_θ"] -->|"a_t + ε_t"| SIM["MuJoCo Warp"]
        SIM -->|"o_{t+1}"| P1
    end
    SIM -->|"(s_t, a_t+ε_t, ξ)"| B["回放缓冲区 B<br/>每环境 1000 步，新挤旧"]
    B -->|"k = 8 的片段"| W["② 拟合世界模型 f_ω<br/>自回归推 8 步，和日志比"]
    B -->|"起点 s_0, ξ"| I["③ 改进策略（f_ω 冻结）<br/>想象 H = 32 步，BPTT"]
    W --> I
    I -->|"更新 π_θ、V_ψ"| P1

    style W fill:#e8f4fd,stroke:#1f78b4
    style I fill:#e8f8e8,stroke:#27ae60
</div>

### 一个循环，两个学习器（第 3.1 节、图 2、算法 A.1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三步交替；回放缓冲区固定大小；旧数据照样能用；Dyna 式起点；目标条件 POMDP、确定性策略、动作噪声只为拟合模型、软的存活权重</summary>

每一轮（算法 A.1）：

1. **采数据**：当前策略在仿真里跑，执行的是带噪声的动作 $a_t+\epsilon_t$（$\epsilon_t\sim\mathcal N(0,0.1^2)$），转移 $(s_t,\ a_t+\epsilon_t,\ \xi)$ 写进固定大小的回放缓冲区，新的覆盖最旧的；重置起点按回报加权抽（附录 E，下文）。
2. **拟合世界模型**：从缓冲区抽 $k$ 步的片段，从记录的状态出发、喂记录的动作，自回归地推 $f_\omega$，按式 1 更新。
3. **改进策略**：从缓冲区抽一个起点状态（Dyna 式），在**冻结**的 $f_\omega$ 里想象 $H$ 步，按式 2 求解析梯度更新 $\theta$；同一阶段按式 3 拟合评论家。

**为什么旧数据能用**：动力学不依赖采数据的策略，所以早期策略采的转移照样能拿来拟合世界模型。

**问题设定**：目标条件 POMDP。状态 $s_t$ 给出本体观测 $o_t$ 和终止标志 $d_t$；动作在状态下给出奖励 $r _ {t+1}$ 和下一状态。策略是**确定性的** $a_t=\pi_\theta(o_t,g_t)$，动作参数化归一化的关节设定点，动作跟踪时 $g_t$ 读自参考动作。采数据时加的动作噪声**只服务于拟合模型**（让模型见到更宽的动作范围），是可选的。

**软的存活权重**：回报用 $c_0=1,\ c _ {t+1}=c_t(1-d _ {t+1})$，$J(\theta)=\mathbb E[\sum_t\gamma^tc_tr _ {t+1}]$。仿真器记录硬终止；学到的模型预测终止概率 $\hat d_t\in[0,1]$，让存活权重在想象里可导。观测分解成 $o_t=\bar o_t+\eta_t$，已知分布的传感器噪声 $\eta_t$ 在世界模型外面抽。

</details>

### 策略看什么、做什么（附录 A、表 A.1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：观测 93 维 × 10 帧；目标是未来 10 帧参考；动作是关节设定点、低 PD 增益；传感器噪声的幅度</summary>

**观测**（表 A.1）：关节角相对默认姿态 $q-q^0$（29，噪声 $\mathcal U[-0.01,0.01]$ rad）、关节速度（29，$\pm0.5$ rad/s）、IMU 角速度（3，$\pm0.2$ rad/s）、重力在基座系的投影（3，$\pm0.05$）、上一步动作（29，无噪声），共 93 维；策略看最近 10 帧。

**目标**：动作跟踪接口里 $g_t$ 读自参考动作；和 BeyondMimic 不同，编码器看的是**未来 $K=10$ 帧**的参考序列，而不是单帧。

**动作**：$q^{\text{sp}}=\alpha\,a_t+q^0$；照 BeyondMimic，PD 增益很低，所以设定点是力矩的代理，而不是要精确到达的位置。

**复现代码的差异**：Uni-SuperMimic 的观测是 99 维，比论文多 6 维——机器人根部相对参考根部的朝向（6D 表示），对应 BeyondMimic 里的锚点朝向观测；目标每帧 73 维（相对根部位移 3、6D 朝向 6、根部线 / 角速度 6、关节角 29、关节速度 × 0.1 共 29）。

</details>

### 世界模型：确定性、以 $\xi$ 为条件（第 3.2 节、式 1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学一个可微的替身；随机性来源已知，所以模型是确定的；四个头（动力学学、其余可学可算）；k = 8 的自回归损失；复现代码里的结构</summary>

仿真器的多刚体动力学是已知的，但它不一定给梯度，所以 SuperMimic 学一个可微的替身，用来提供 BPTT 需要的预测和雅可比。由此得到的解析策略梯度，是「仿真中期望回报的一个替身」的梯度。仿真器的随机性来源都已知，所以世界模型**保持确定性**：它以每回合的仿真上下文 $\xi$（摩擦、标定偏差、躯干质心）为条件，预测无噪声的观测 $\bar o_t$。

世界模型包括学到的动力学，加上奖励、观测、终止三个头，每个头可以学，也可以按公式算：

$$\hat s _ {t+1}=f_\omega(\hat s_t,a_t,\xi),\quad \hat r _ {t+1}=r_\omega(\hat s_t,a_t,g_t),\quad \hat{\bar o}_t=g_\omega(\hat s_t,\xi),\quad \hat d_t=d_\omega(\hat s_t,g_t)$$

在 $k$ 步自回归片段上拟合（$k=8$）：从记录的 $\hat s_0=s_0$ 出发，喂记录的动作，最小化

$$\mathcal L _ {\text{WM}}(\omega)=\mathbb E _ {\mathcal B}\sum _ {j=1}^{k}\Big[\lVert\hat s_j-s_j\rVert^2+(\hat r_j-r_j)^2+\lVert\hat{\bar o}_j-\bar o_j\rVert^2+\mathrm{BCE}(\hat d_j,d_j)\Big]$$

按公式算的头没有对应的损失项。网络是 MLP（2048, 2048, 2048）（表 A.4）。

**复现代码里的具体做法**（Uni-SuperMimic，我们读代码的结果）：三个头全按公式算，网络只学动力学；输入是 71 维的「不变特征」（根部高度、相对朝向系的 6D 倾斜、身体系里的线 / 角速度、29 个关节角与速度——水平位置和航向不进网络）+ 29 维动作 + 33 维归一化上下文，共 133 维；输出 70 维**增量**（位置增量写在朝向坐标系里、旋转增量是身体系里的旋转向量、速度增量写在身体系里、关节直接加），按运行均值方差反归一化后积分；层间用 LayerNorm + SiLU。损失按每一维的标称误差（`err_floor`，如位置 3 mm、关节角 3 mrad）归一化。

</details>

### 在想象里求导：目标函数与评论家（第 3.3 节、式 2–3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：H = 32 的想象、带存活权重和评论家的目标；BPTT 与似然比的区别；GAE 回报；和 SHAC 的两处不同；为什么要评论家</summary>

每次策略更新时冻住 $\omega$，在 $H=32$ 步的想象轨迹上优化 $\pi_\theta$ 和 $V_\psi$。评论家估计第 $H$ 步之后的回报，所以模型只需在这 $H$ 步内准确。这个视界比拟合用的 $k$ 步片段长；论文说实际上学到的模型在很长的想象里也保持稳定，因为 $k$ 步自回归拟合让它学会纠正自己的预测误差。

起点 $s_0\sim\rho_0$ 取自回放缓冲区，带它记录的 $\xi$。第 $t$ 步模型给出 $\hat{\bar o}_t$，再加回传感器噪声，策略出动作 $a_t=\pi_\theta(\hat{\bar o}_t+\eta_t,g_t)$。目标：

$$\hat J(\theta)=\mathbb E _ {s_0\sim\rho_0,\pi_\theta}\Big[\sum _ {t=0}^{H-1}\gamma^t\hat c_t\,\hat r _ {t+1}+\gamma^H\hat c_H\,V_\psi(\hat s_H,g_H,\xi)\Big]$$

动作跟踪的奖励是 BeyondMimic 的跟踪奖励，去掉自碰撞惩罚。

**BPTT vs PPO**：世界模型可导，BPTT 通过模型对 $\hat s_t$ 和 $a_t$ 的雅可比，算出穿过 $H$ 步的一阶梯度 $\nabla_\theta\hat J$。PPO 把动力学当黑箱，用采样动作的优势去加权随机策略的得分函数 $\nabla_\theta\log\pi_\theta$——似然比估计。BPTT 直接对每个动作求回报的导数，在短视界上方差低得多。

**评论家**：用想象转移上逆着时间算的 GAE 回报拟合：

$$\mathcal L_V(\psi)=\mathbb E\sum _ {t=0}^{H-1}(V_t-\hat R_t)^2,\qquad \hat R_t=\hat r _ {t+1}+\gamma(1-\hat d _ {t+1})\big[(1-\lambda)V _ {t+1}+\lambda\hat R _ {t+1}\big]$$

从 $\hat R_H=V_H$ 起算，目标每条轨迹算一次、拟合时固定。

**和 SHAC 的关系**：策略和评论家的更新合起来是 SHAC 风格的短视界 actor–critic（SHAC 对可微仿真器做 BPTT）。SuperMimic 把 SHAC 的硬终止换成存活权重 $\hat c_t$，评论家也不用指数滑动平均的目标网络。

**为什么要评论家**：以前用解析梯度训的动作跟踪控制器（SuperTrack、ControlVAE）常常不用评论家、只优化 $H$ 步的奖励和。论文说，不用评论家也能训到差不多的名义跟踪回报，但这个不自举的目标更短视；被推之后，恢复或平衡的奖励可能在想象窗口之外，评论家在这里起作用（第 4.3 节）。

</details>

### 奖励、终止与随机化（附录 A、表 A.2–A.3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BeyondMimic 的跟踪奖励去掉自碰撞惩罚、关节超限 −10 → −2；终止只看根部高度和倾斜；随机化只剩摩擦、关节零点、躯干质心，去掉根部速度推搡</summary>

**奖励**（表 A.2，每项乘 $\Delta t=0.02$ s）：

| 项 | 式子 | 权重 |
|---|---|---|
| 身体位置 | $\exp(-\overline{\lVert p^{\text{des}}_b-p_b\rVert^2}/0.3^2)$ | 1.0 |
| 身体朝向 | $\exp(-\overline{\lVert\log(R^{\text{des}}_bR_b^\top)\rVert^2}/0.4^2)$ | 1.0 |
| 身体线速度 | $\exp(-\overline{\lVert v^{\text{des}}_b-v_b\rVert^2}/1.0^2)$ | 1.0 |
| 身体角速度 | $\exp(-\overline{\lVert\omega^{\text{des}}_b-\omega_b\rVert^2}/3.14^2)$ | 1.0 |
| 根部位置 | $\exp(-\lVert p^{\text{des}} _ {\text{root}}-p _ {\text{root}}\rVert^2/0.3^2)$ | 0.5 |
| 根部朝向 | $\exp(-\lVert\log(R^{\text{des}} _ {\text{root}}R _ {\text{root}}^\top)\rVert^2/0.4^2)$ | 0.5 |
| 动作平滑 | $\lVert a_t-a _ {t-1}\rVert^2$ | −0.1 |
| 关节超限 | $\sum_j[\max(0,q_j-q_j^{\max})+\max(0,q_j^{\min}-q_j)]$ | −2 |

（上划线表示对跟踪的身体取平均。）**去掉自碰撞惩罚**的理由：那一项是防随机策略钻空子——参考让两个部位靠近却不接触时，把它们压在一起能压住动作噪声、反而提高速度跟踪奖励；想象里的策略是确定性的，这个漏洞没有好处。关节超限的权重从 −10 降到 −2。

**终止**：根部偏离参考超过高度阈值 $ \mid e _ {p,z}\|>0.25$ m 或倾斜阈值 $e _ {\text{tilt}}>0.8$（参考和机器人根部系里重力方向 $z$ 分量之差的绝对值；对竖直的参考约等于倾斜 78°）。和 BeyondMimic 不同，**不因末端偏离而终止**。

**随机化**（表 A.3，即 $\xi$）：摩擦系数 $\mathcal U[0.3,1.2]$、关节标定偏差 $\mathcal U[-0.01,0.01]$ rad、躯干质心偏移 $\Delta x\sim\mathcal U[-0.025,0.025]$、$\Delta y,\Delta z\sim\mathcal U[-0.05,0.05]$ m。**去掉 BeyondMimic 的根部速度推搡**：推搡是状态的突变，确定性的世界模型捕捉不了；论文发现只随机化物理参数就足以上真机。

</details>

### 动作库与重置采样（附录 D、E）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BONES-SEED 142,220 段 → 按名字去掉 12,553 → 按运动学去掉 153 → 129,514；按 1 秒的格子、按回报加权重置</summary>

**数据过滤**（表 A.7）：公开的 G1 重定向版 BONES-SEED 原始 142,220 段。很多动作要和机器人用不上的地形或物体交互（楼梯、箱子、梯子、椅子），或带重定向瑕疵。两道过滤：

- **按名字**：名字里含 `stair`、`ladder`、`box`、`chair`、`sit`、`climb`、`jump_off_50cm`、`look_over_fence` 等词的去掉（关键词表改自 SONIC 放出的数据处理代码，另补了几个），去掉 12,553 段；
- **按可行性**：每段过一遍 MuJoCo 正运动学，看身体连杆和脚的轨迹，记最低连杆高度 $z _ {\min}(t)$：**站在高处**（$z _ {\min}>0.20$ m 持续 ≥ 0.6 s）、**穿进地面**（$z _ {\min}<-0.12$ m，或 80% 以上时间 $<-0.08$ m）、**双脚悬空**（骨盆直立、身体几乎不动时两脚的碰撞体离地 > 0.02 m 持续 ≥ 0.5 s，用 `mj_geomDistance` 精确量），再去掉 153 段。

剩 129,514 段、264.56 小时。

**重置采样**：仿真回合从动作库里的某一点开始，偏向策略当前回报低的地方。时间轴切成 1 秒的格子，每格 $b$ 维护一个「从这里出发」的折扣回报估计 $G_b$，用策略自己的 rollout 更新。重置时混合三个分布：50% 在格子上均匀；40% 按 $\mathrm{softmax}_b(-25\,G_b/G _ {\max})$（$G _ {\max}$ 是能拿到的最大折扣回报）；10% 按每格过去的 softmax 权重，让学会了的难动作还能练到。

</details>

### 多个目标接口一起训（附录 B）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每个接口一个目标编码器、共用一个解码器；蒸馏或 RL；下游 RL 的梯度只更新编码器；速度编码器的设置</summary>

下游接口只给出动作的一部分或另一种形式。身体物理是共享的，所以同一个动力学模型可以训多个目标接口：每个接口 $i$ 一个 POMDP $\mathcal M_i$（目标空间、奖励、终止）、一个评论家 $V _ {\psi_i}$；一个策略网络由每个接口的目标编码器 $\mathrm{enc} _ {\theta,i}$ 和共用的解码器 $\mathrm{dec}_\theta$ 组成：$z=\mathrm{enc} _ {\theta,i}(g)\in\mathcal Z$（32 维、tanh 限幅），$a=\mathrm{dec}_\theta(z,o)$，优化 $\max_\theta\mathbb E _ {i\sim p(\mathcal I)}[\hat J_i(\theta)]$。所有接口都通过同一个 $f_\omega$ 训，不按接口重训。

下游接口按奖励分两种训法：**蒸馏**用动作跟踪奖励，命令读自参考动作；**RL** 直接优化接口自己的任务奖励（例如速度跟踪）。下游接口的 rollout 上，回报梯度穿过共用的解码器传到该接口的编码器，但**解码器的权重 stop-gradient**，解码器仍只由动作跟踪目标训练。RL 训的速度编码器另有一项潜变量对齐损失（权重 0.1，朝同一步动作编码器的潜变量拉，对方 stop-gradient）。

**网络**（表 A.4）：动作编码器 MLP（2048, 1024, 512, 256）、速度编码器 MLP（256, 256）、共用解码器 MLP（2048, 1024, 512, 256）、评论家 MLP（256, 128）、动力学 MLP（2048, 2048, 2048）。

</details>

---

## 📊 实验结果（第 4 节、附录 F、G）

### SONIC 级的跟踪，显卡小时少 1000 倍（图 3a、算力账本）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：1 张 H100 3 小时超过 SONIC 放出的模型（0.90）；保守的 3 小时；约 7200 倍显卡小时、约 56 倍墙钟；数据与硬件的差别解释不了</summary>

对比对象是 SONIC：128 张 GPU 集群上的 PPO 流水线。两者都建在 BeyondMimic 的跟踪设定上，所以 SONIC 是能找到的最接近的已发表对比。所有成本在 Lambda 按需的 NVIDIA H100（80 GB SXM5）上量；论文说多个随机种子训练都很稳（归因于动作跟踪每一步都有稠密奖励），图里不报种子方差。**归一化回报** = 整段的逐步奖励之和（不打折）÷ 这个和能取到的最大值，提前终止的策略分数低。

- 1 张 H100 训 3 小时，归一化回报超过 SONIC 放出的模型（**0.90**），三者在同一套 129,514 段动作上打分（图 3a）。
- 「3 小时」是**保守**说法：从那以后，每个存档点在回报和失败数上都比 SONIC 至少领先「SuperMimic 最好结果与 SONIC 之差」的一半。
- **账本**：SONIC 报告 128 张 L40 × 7 天（约 21,000 显卡小时），对 1 张 H100 × 3 小时 → 显卡小时约 **7200 倍**（写作 > 1000 倍），墙钟约 **56 倍**（写作 > 50 倍）。3 小时包括整个训练循环，训练后的存档评测不算。
- **公平吗**：SuperMimic 用 264.56 小时的 BONES-SEED（SONIC 611 小时数据的公开子集，少 2.3 倍）；H100 的 fp32 峰值是 L40 的 0.74 倍、张量核峰值 5.5 倍，两次训练各用了多少峰值不知道。论文的结论：2.3 倍的数据和至多 5.5 倍的峰值算力，解释不了 1000 倍的差距。

</details>

### 179、25、0：失败的动作（附录 F、表 A.6、图 A.1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：评测协议；SONIC 整组失败的空翻、侧滚、一套舞；SuperMimic 1 卡 3 h 失败 25 段、2 卡 9.8 h 零失败；比的是覆盖不是泛化</summary>

**协议**：同一套过滤后的 129,514 段训练集，每段从第一帧放一遍，所有策略用同样的仿真：脚的摩擦 1.0、无随机化、无观测噪声、确定性物理；各用自己的执行器增益和动作缩放，观测按各自训练环境的方式构造。触发 SuperMimic 的训练终止条件就算失败（SONIC 自己的成功标准是根部与末端高度偏差 > 0.25 m，没有朝向项）。SONIC 评测了放出的模型和 v1.1 模型。

| 动作组（段数） | SONIC | SuperMimic 1 卡 × 3 h | 2 卡 × 9.8 h |
|---|---|---|---|
| 侧滚（22） | **22** | 2 | 0 |
| 空翻 360° / 180° / 90°（44） | **44** | 1 | 0 |
| fire-in-the-hole 转身（20） | 3 | 3 | 0 |
| 交叉腿（10） | 9 | 0 | 0 |
| 躺下、休息、站起（99） | 28 | 8 | 0 |
| 立定跳远（24） | 15 | 0 | 0 |
| 一套舞（8） | **8** | 0 | 0 |
| 其他（129,287） | 50 | 11 | 0 |
| **合计（129,514）** | **179** | **25** | **0** |

粗体：整组都失败。SONIC 的 v1.1 模型失败 239 段（同样的空翻和舞，22 个侧滚里失败 19 个）。SuperMimic 1 卡 3 小时的失败集中在少数几组难动作：前五组共 195 段，占了 25 段失败里的 14 段；没有哪一组它比 SONIC 失败得多。附录图 A.1 每 4000 次迭代打一次分：失败数随训练一路下降，2 卡那条线约 6 小时后基本归零。**这些都是两边的训练动作**，计数衡量的是对训练动作的覆盖，不是对新动作的泛化。

（项目页的表把 fire-in-the-hole 一组并进「其他」，所以那一行写 129,307 段、53 / 14 / 0。）

</details>

### 控制变量：在仿真器里跑 PPO（图 4a）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：LAFAN1 40 段；PPO-Sim 其余设置全一样、环境数还多一倍；SuperMimic 1.2 小时到 0.82，PPO-Sim 18 小时 0.60 / 0.70 / 0.72</summary>

和 SONIC 比硬件、数据都不同，图 4a 给了受控对比：LAFAN1 的 40 段（2.45 小时）。基线 **PPO-Sim** 在仿真器里跑 PPO，与 SuperMimic 共用动作、观测、奖励、终止、域随机化、演员和评论家的网络大小、评测协议，PPO 超参数照 BeyondMimic，每张卡 8192 个并行环境（是 SuperMimic 的两倍）。

- SuperMimic：1 张卡 **1.2 小时**评测回报到 0.82；
- PPO-Sim：18 小时预算内都没到；最终回报 1 卡 0.60、4 卡 0.70、8 卡 0.72——从 4 卡加到 8 卡几乎没帮助。

</details>

### 为什么省：三个性质（图 3b、3c、图 5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个模型摊薄动作库（误差 0.007–0.011、算力涨得慢）；想象比仿真快（11 / 26 / 62 倍）；一阶梯度少 64 倍想象步</summary>

1. **一个模型摊薄动作库**：数据量从 1、7、40 涨到 264 小时，世界模型的 8 步预测误差保持在 0.007–0.011（只算状态，按预定的标称误差归一化，在策略 rollout 上在线量）；到目标回报要的显卡小时是 0.539、1.350、1.908、1.892，远低于按数据量成正比的虚线。每段动作都由同一个人形执行，多出来的片段提供的是关于共享身体与接触动力学的更多证据，而不是要求新的容量。
2. **想象比仿真快**（图 5a，H100）：常用的批量（2k–16k 个并行环境）下，世界模型比 MuJoCo Warp 快 10 倍以上；2k 时 11 倍、16k 时 26 倍，到 64k 时 62 倍（MuJoCo Warp 已经变平）。一步 = 一个 50 Hz 控制步（MuJoCo Warp 算 4 个 5 ms 子步），世界模型用训练时的 TF32 精度。
3. **一阶梯度需要更少的想象步**（图 5b，机制消融）：在 LAFAN1 的走、跑、冲刺上，同样在世界模型里想象，用 PPO 更新（PPO-WM，四种批量，16k × 32 最好）要多约 **64 倍**的想象步才到它自己最好的训练回报（0.841：SuperMimic 约 9.3 亿步、PPO-WM 约 596 亿步）。所以收益不只是 rollout 快。

**评论家**（图 4b、4c）：没有评论家时 $H\le16$ 训不起来；有评论家时 $H=16$ 就能赶上无评论家的 $H=32$，$H=32$ 到 0.82 最快（0.88 h）；$H$ 从 64 加到 128 用时差不多翻三倍、最终回报还更低（128 是一张 H100 放得下的最长视界）。回报相同时评论家仍改变行为：静态 T 字站姿下受 0.5–4 m/s 的速度冲击，有评论家的策略 0.5–2.4 s 站稳，没有的一直踉跄、0.5 m/s 也站不稳、4 m/s 摔倒。

</details>

### 上真机与下游接口（图 6、图 7、附录 G）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个通用跟踪器上真机 G1 不按动作调参；速度编码器：RL 650 / 蒸馏 15 / 7 次摔倒，中位误差 0.16 对 0.49</summary>

**真机**（图 6）：一个通用跟踪器部署到真机 Unitree G1，不按动作调参。四个动作覆盖移动（蹦跳着跳）、躯干和四肢都着地的接触密集动作（侧滚）和杂技（90° 空翻、原地 360° 空翻）。

**下游：速度命令**（图 7、附录 G）：两种速度编码器各自从零和动作跟踪接口一起训 100,000 次迭代，用从 LAFAN1 和 BONES-SEED 里挑出的走、跑动作库；4096 个仿真环境和每批想象的一半用速度接口。命令 $(v_x,v_y,\omega_z)$：一半时间读自参考（参考根部速度在航向系里的 25 帧居中平均），一半时间在 $v_x\in[-1.5,2]$、$v_y\in[-1.32,1.32]$ m/s、$\omega_z\in[-3.35,3.35]$ rad/s 里均匀抽（10% 置零站立），每 250 步（5 s）重抽。RL 版用速度跟踪奖励（线速度、偏航角速度各权重 2；动作平滑 −0.3、关节超限 −2、躯干侧倾 −4、躯干横滚俯仰角速度 −0.05）和只看摔倒的终止（根部 < 0.35 m 或倾斜约 73°）。

**阶跃测试**：从站立给一个固定命令 5 s，每个命令 4 次；相对稳态误差 = 最后 2 s 平均速度误差的范数 ÷ 命令的范数，取没摔倒的几次的中位数。三个平面上各 15 × 15 的网格（去掉站立）共 672 次。**RL 编码器在 650 次上误差更小，蒸馏在 15 次上更小**；中位相对误差 0.16 对 0.49；蒸馏在 7 个命令上 4 次全摔（都是平移加上 ≥ 2.8 rad/s 的转弯，动作库里几乎没有这种数据）。每个策略只有一个种子，论文称这是初步研究。

**图 7 怎么读**（图注与附录 G）：三张图各是一个平面——$v_y$ 对 $v_x$、$\omega_z$ 对 $v_x$、$\omega_z$ 对 $v_y$，第三个分量固定为 0；每格是一个命令（15 × 15，去掉站立的那格）。每个圆环画**同一个命令的两个误差**：外圈面积对应较大的那个误差，中间孔的面积对应较小的那个，颜色是误差更小的一方（论文图里蓝是 RL、橙是蒸馏；动画里蒸馏画成黄色）。所以圈越大，较差那一方越差；环越粗，两者差得越多；误差超过 0.9 的按 0.9 画。黑圈是蒸馏 4 次都摔倒。背景的深浅表示动作库里这种速度的参考数据有多少（每格的秒数，对数刻度 0.1–1000 s）。动画第 17 幕按这个顺序一步步带读。

</details>

---

## 🧪 我们的复现（Uni-SuperMimic 放出的模型，不是论文的实验）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么选 Uni-SuperMimic；我们怎么跑（独立重写、CPU 上的 MuJoCo，再用官方代码核对）；40 段评测与官方评测一致；世界模型 vs 仿真器三组对照；8 步误差；BPTT 与似然比的余弦相似度</summary>

<h3 id="复现-选哪个仓库">选哪个仓库</h3>

官方代码没有放出。截至 2026-11-03 我们看到的社区复现：

| 仓库 | 栈 | 许可 | 说明 |
|---|---|---|---|
| [Motphys/Uni-SuperMimic](https://github.com/Motphys/Uni-SuperMimic) | UniLab（mjwarp / MuJoCo / Motrix） | Apache-2.0 | **放出了 LAFAN1 与 BONES-SEED 的模型（世界模型 + 策略）**；README 报 LAFAN1 0.827 / 0 失败、BONES-SEED 0.924 / 350 失败 |
| [CuboiLeo/SuperMimic-Reproduced](https://github.com/CuboiLeo/SuperMimic-Reproduced) | mjlab / MuJoCo Warp | MIT | 从零实现，全 BONES-SEED 0.930 / 145 失败（4 张 5090、7.1 h）；LAFAN1 严格按论文观测只有 0.56–0.59 |
| [NJU-R-L-Group-Embodied-Lab/SuperMimic-Repro-Sim2Real](https://github.com/NJU-R-L-Group-Embodied-Lab/SuperMimic-Repro-Sim2Real) | 基于上一个 | MIT | 加了真机部署，G1 跳完 46 秒的舞 |
| [zita-ch/supermimic_vibed](https://github.com/zita-ch/supermimic_vibed) | Isaac Lab 3（kit-less）+ MuJoCo-Warp | MIT | 作者自称一小时用 AI 助手赶出来、没审过；LAFAN1 0.829 |

我们选 **Uni-SuperMimic**：许可宽松、放出了权重（包括世界模型，能直接看「想象」）、支持普通的 MuJoCo 后端（这台机器没有 GPU）。它的超参数基本照论文（$k=8$、$H=32$、缓冲区 1000 步、更新数据比 0.4、$\gamma=0.99$、$\lambda=0.95$、动作噪声 0.1、网络大小相同），和论文不同的地方见下文。

<h3 id="复现-怎么跑">怎么跑</h3>

最初没有安装它的包，而是照它的代码独立重写了评测路径（参考动作 30 → 50 Hz 重采样、观测、目标、动作映射、奖励、终止、世界模型的增量积分），用 `torch.load(..., weights_only=True)` 载入 `lafan1_ckpt_012000.pt`（存档记录训练 12,000 次迭代、墙钟 5000 秒、仿真 1.23 亿步、学习率 2e-4），在 CPU 上的 MuJoCo 3.11 里按评测协议跑（摩擦 1.0、无随机化、无噪声、从第一帧放到最后）。G1 模型和网格来自 LAFAN1 重定向数据集（`lvhaidong/LAFAN1_Retargeting_Dataset`）。

**用官方代码核对**（2026-11-03，用户授权安装第三方包之后）：在它的仓库里 `uv sync`，用它自己的 `tools/prepare_supermimic_assets.py` 准备 G1 与 40 段 LAFAN1，再用官方评测 `unisupermimic-eval --backend mujoco` 在 CPU 上评同一个存档。发布页只放了存档、没放训练目录里的 `run_config.json`，评测要读它，我们用仓库自己的 `extract_contract_snapshot()` 从默认（mjwarp 训练）配置生成了一份；存档里记录的超参数只有迭代数和学习率与默认配置不同，都只影响训练。结果是 0.8278 / 0.8306 / 0 失败，和重写版差 1–2 × 10⁻⁴。世界模型也单独比过：同一份权重、同一组输入，官方的 `WorldModel.step` 和重写版自回归 8 步逐位相同（最大差 0）。所以这一节和视频里的数字仍是重写版跑出来的，与官方代码一致。

<h3 id="复现-40-段评测">40 段评测</h3>

| | 平均归一化回报 | 按帧加权 | 失败 |
|---|---|---|---|
| 我们（CPU MuJoCo） | **0.8277** | **0.8304** | **0 / 40** |
| Uni-SuperMimic 官方评测（CPU MuJoCo，我们跑） | 0.8278 | 0.8306 | 0 / 40 |
| Uni-SuperMimic README（mjwarp） | 0.8272 | 0.8300 | 0 / 40 |
| 论文图 4a（官方，1 卡 1.2 h） | 0.82 | — | — |

40 段共 441,140 个控制步；最低的是 `fallAndGetUp1_subject5`（0.739），最高的是 `walk3_subject2`（0.905）。和它报的数差 0.0005，说明我们的移植是对的。

<h3 id="复现-世界模型-vs-仿真器">世界模型 vs 仿真器</h3>

先让策略在仿真里跟 100 步攒好观测历史，在第 $f_0$ 帧复制状态：一份在 MuJoCo 里继续跑，一份交给世界模型——每一步用它**自己上一步的预测**算观测、让策略出动作、再预测下一步。

| 对照 | 片段 | 结果 |
|---|---|---|
| 策略开着 | `fallAndGetUp1_subject1` 第 200 帧起 400 步（8 s） | 两边都摔倒、躺下、爬起来；根部高度最多相差 **3.6 cm**；29 个关节角的均方根差平均 0.032 rad；水平位置慢慢漂开，8 s 后相差 0.23 m |
| 策略关掉（动作全 0） | `sprint1_subject2` 第 450 帧起 100 步（2 s） | 跑步中扑倒；2 s 后根部高度仿真 0.09 m、世界模型 0.12 m |
| 地面变滑（摩擦 1.0 → 0.3） | `sprint1_subject2` 第 545 帧起 150 步（3 s，急停） | 双脚贴地（离地 < 7 cm）滑过的距离：仿真 **2.82 m**、世界模型 **2.86 m**；摩擦不变的对照 0.99 m |

训练时世界模型只往前推 8 步，这里推了 400 步也没有发散——和论文「学到的模型在很长的想象里保持稳定」的说法一致。

**8 步误差**：在五段动作上各采 1500 步（加 0.1 的动作噪声，像采数据时那样），每隔 4 步取一个 8 步窗口、喂记录的动作：8 步（0.16 s）后根部位置相差 1.6 mm（走路）到 5.7 mm（摔倒再起身），关节角平均相差 3.2–10.9 mrad。按复现代码的标称误差归一化的值是 0.017–0.37，归一化方式和论文图 3c 不同，不能直接比。

<h3 id="复现-梯度方向">BPTT 与似然比：梯度方向准不准</h3>

在 `sprint1_subject2` 第 500 帧的一个状态上，给每一步的动作加同一个 29 维偏置 $\delta$，求 $H=32$ 步想象回报（不含评论家——存档里没有评论家的权重）对 $\delta$ 的梯度，动作噪声 $\sigma=0.1$。两种估计算的是同一个量（加噪后回报期望的梯度）：**路径式**（BPTT 穿过世界模型和策略）和**似然比**（$\frac1N\sum_i(J_i-\bar J)\sum_t\epsilon _ {i,t}/\sigma^2$，PPO 的做法）。参考方向是 2048 条 BPTT 梯度的平均；每个 $N$ 各估 8 次。

| 每次用几条 $N$ | BPTT 的余弦相似度（平均 / 最差） | 似然比（平均 / 最差） |
|---|---|---|
| 1 | 0.981 / 0.969 | 0.016 / −0.344 |
| 4 | 0.995 / 0.993 | 0.257 / −0.038 |
| 16 | 0.999 / 0.998 | 0.267 / −0.037 |
| 64 | 1.000 / 0.999 | 0.536 / 0.325 |
| 256 | 1.000 / 1.000 | 0.754 / 0.550 |
| 1024 | 1.000 / 1.000 | 0.922 / 0.889 |

**1 条 BPTT 的方向比似然比用 1024 条还准**。这是机制的演示：参考方向本身来自 BPTT，似然比的期望虽然相同，只是方差大；PPO 实际还有优势估计、裁剪等，不能直接和这里比。

<h3 id="复现-和论文的不同">复现和论文的不同</h3>

- 策略观测多 6 维（根部相对参考的朝向，99 维）；
- 三个头全按公式算；损失按每一维的标称误差归一化；
- 训练迭代数：论文 320,000 次（表 A.5），这个存档 12,000 次——两边一次「迭代」的定义可能不同；
- 默认配置里还有论文没写的东西：前 500 次迭代只训世界模型（`wm_only_iters`）、策略的 EMA（`pi_ema: 0.995`）、bf16 混合精度；这个 LAFAN1 存档用的学习率是 2e-4，和论文一样。

</details>

<div class="paper-demo" data-demo="sm-wm" id="demo-wm"><p class="demo-fallback">（本节含交互演示：世界模型 vs 仿真器，需要启用 JavaScript）</p></div>

<div class="paper-demo" data-demo="sm-grad" id="demo-grad"><p class="demo-fallback">（本节含交互演示：BPTT 与似然比，需要启用 JavaScript）</p></div>

<div class="paper-demo" data-demo="sm-compute" id="demo-compute"><p class="demo-fallback">（本节含交互演示：论文的数字，需要启用 JavaScript）</p></div>

---

## ⚠️ 局限与讨论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文写的三条；我们补充的：评测是训练集覆盖、和 SONIC 的对比条件不同、代码与评论家权重没放出、世界模型的误差在分布外会怎样</summary>

**论文写的**（第 6 节）：

1. **多接口训练研究得不够**：速度跟踪奖励只更新速度编码器、不更新共用解码器，所以「同时训」和「先训跟踪器再训编码器」是一样的，同时训也许没必要；如果速度奖励也更新解码器，同时训有没有帮助还没测。
2. **世界模型只从仿真学**：真机数据可以拿来修正它，它的可导性也可以用来做系统辨识。
3. **没有地形和物体交互**：只在平地上训，扩展到地形和物体交互还在做。

**我们补充的**：

- **评测是训练集的覆盖**：129,514 段的失败数和归一化回报都在训练动作上量（论文自己写明了），新动作上的泛化没有测。
- **和 SONIC 的对比条件不同**：数据量、显卡型号、评测用的执行器增益和观测都按各自的训练环境；论文在账本里讨论了数据和峰值算力，但比值是两个报告的数之比，不是同条件下的控制实验（受控实验是图 4a 的 PPO-Sim）。
- **种子和方差没报**：论文说训练很稳，图里不画种子方差；下游实验每个策略只有一个种子。
- **代码没放出**：网页演示是专有材料；社区复现各自的细节不同（观测、头、迭代数），我们的复现只能说明「这一份复现模型」的行为。
- **世界模型被利用的风险**：策略优化会主动寻找模型的漏洞；在接触切换或分布外的状态上模型若不准，想象出来的梯度可能是错的。论文用短视界 + 评论家 + 每轮重新拟合来缓解，没有单独分析。

</details>

---

## 🚶 具体实例：把论文和复现里的数从头算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（12 节）：环境设定 / 例 1 算力账本 / 例 2 归一化回报 / 例 3 跟踪奖励 / 例 4 终止的 78° / 例 5 动作缩放与 PD 增益 / 例 6 折扣与软终止 / 例 7 GAE / 例 8 重置采样 / 例 9 数据过滤 / 例 10 失败表与图 7 / 例 11 我们的复现</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **论文**：arXiv 2610.28480 v1 的 LaTeX 源码（正文、表 1、表 A.1–A.7、图 3–7 与图 A.1 的坐标）。
- **G1 常数**：执行器的转子惯量、力矩上限、默认姿态取自 Uni-SuperMimic 的 `robot.py`（与 BeyondMimic 相同）：$k_p=I_a\,\omega_n^2$、$k_d=2\zeta I_a\omega_n$，$\omega_n=2\pi\times10$ rad/s、$\zeta=2$；动作缩放 $\alpha=0.25\,\tau _ {\max}/k_p$。
- **复现**：Uni-SuperMimic 的 `lafan1_ckpt_012000.pt`，我们重写的 CPU 回放（见「🧪 我们的复现」）。

<h3 id="实例-1-算力账本">例 1：算力账本</h3>

$$128\times168=21{,}504\ \text{显卡小时（论文写约 21,000）}$$

$$\frac{21{,}504}{1\times3}\approx7168\approx7200\ \text{倍},\qquad \frac{168}{3}=56\ \text{倍}$$

2 张卡 9.8 小时（零失败）是 19.6 显卡小时，$21{,}504/19.6\approx1097$——**连零失败的那次训练也比 SONIC 少 1000 倍以上**（这一句是我们算的，论文没写）。

<h3 id="实例-2-归一化回报">例 2：归一化回报</h3>

每一步奖励的上限（六项跟踪都拿满，乘 $\Delta t$）：$(4\times1.0+2\times0.5)\times0.02=0.1$。一段 10 秒的动作有 500 帧、499 步，满分 $49.9$。如果跟得完美却在第 250 帧摔倒（249 步）：$249\times0.1/49.9\approx0.499$——**提前摔倒直接丢掉一半的分**，所以归一化回报同时惩罚「跟不准」和「跟不完」。

<h3 id="实例-3-跟踪奖励">例 3：跟踪奖励</h3>

身体位置的平均平方误差是 $0.1^2$ m²（约 10 cm）：$\exp(-0.01/0.3^2)=\exp(-0.111)\approx0.895$；误差 0.3 m 时 $\exp(-1)\approx0.37$。奖励是平滑的指数，每一步都有梯度——这正是 BPTT 需要的稠密信号。

<h3 id="实例-4-终止的-78">例 4：终止的 78°</h3>

参考竖直时，参考根部系里重力方向的 $z$ 分量是 1；机器人倾斜 $\theta$ 时是 $\cos\theta$。终止条件 $ \mid 1-\cos\theta\|>0.8\Rightarrow\cos\theta<0.2\Rightarrow\theta>78.5^\circ$（论文写约 78°）。速度接口的摔倒条件 $1+u_z>0.7$，$u_z=-\cos\theta$，即 $\cos\theta<0.3\Rightarrow\theta>72.5^\circ$（论文写约 73°）。

<h3 id="实例-5-动作缩放与-pd-增益">例 5：动作缩放与 PD 增益</h3>

髋俯仰（7520-14 电机，$I_a=0.01018$ kg·m²，力矩上限 88 N·m）：

$$k_p=0.01018\times(20\pi)^2\approx40.18,\quad k_d=2\times2\times0.01018\times20\pi\approx2.56,\quad \alpha=\frac{0.25\times88}{40.18}\approx0.548$$

和 MJCF 里写的 `kp="40.179" kv="2.558"` 一致。动作 1.0 对应设定点偏离默认姿态 0.548 rad；同样算，膝 $k_p\approx99.1$、$\alpha\approx0.351$，踝 $k_p\approx28.5$、$\alpha\approx0.439$，腕俯仰 $k_p\approx16.8$、$\alpha\approx0.075$。增益是按 10 Hz 的自然频率定的，很低，所以设定点更像力矩命令。

<h3 id="实例-6-折扣与软终止">例 6：折扣与软终止</h3>

$\gamma^{H}=0.99^{32}\approx0.725$：评论家的估值乘 0.725 加进目标。复现代码的软终止：高度项的存活概率 $1-\sigma\big((e_h-0.25)/0.02\big)$——误差 0.21 m 时 0.881、0.25 m 时 0.5、0.29 m 时 0.119（倾斜项同理，温度 0.04）。它是硬终止（0.25 m 处从 1 跳到 0）的平滑版，梯度在阈值附近不断。

<h3 id="实例-7-gae">例 7：GAE（玩具数字，动画第 9 幕）</h3>

6 步想象，奖励 $\hat r _ {1..6}=0.08,0.09,0.07,0.09,0.08,0.06$，估值 $V _ {0..6}=1.20,1.10,1.30,1.00,1.15,1.05,1.10$，$\gamma=0.99$、$\lambda=0.95$、不终止。从 $\hat R_6=V_6=1.10$ 往回：

$$\hat R_5=0.06+0.99\,[0.05\times1.10+0.95\times1.10]=1.149$$

依次得 $\hat R _ {4..0}=1.213,\ 1.287,\ 1.330,\ 1.405,\ 1.456$。这些数只为说明递推。

<h3 id="实例-8-重置采样">例 8：重置采样（玩具数字，动画第 11 幕）</h3>

一段动作 10 个 1 秒的格子，归一化回报估计 $G_b/G _ {\max}=0.95,0.90,0.35,0.20,0.85,0.92,0.60,0.97,0.88,0.45$。$\mathrm{softmax}(-25\,G)$ 几乎全落在最差的那格（0.20 那格 0.975、0.35 那格 0.023）；混合后那格被抽中的概率 $0.05+0.4\times0.975+0.01=0.450$，其余格子约 0.06（50% 均匀给每格 0.05，「历史」一项在这里按均匀算 0.01）。所以一半的重置会落在最没学会的地方，另一半保证别的地方也一直有练习。

<h3 id="实例-9-数据过滤">例 9：数据过滤</h3>

$142{,}220-12{,}553=129{,}667$，$129{,}667-153=129{,}514$。264.56 小时 ÷ 129,514 段 ≈ **7.35 秒 / 段**。$611/264.56\approx2.31$。

<h3 id="实例-10-失败表与图-7">例 10：失败表与图 7</h3>

SONIC：$22+44+3+9+28+15+8+50=179$；SuperMimic 1 卡：$2+1+3+0+8+0+0+11=25$；前五组 $22+44+20+10+99=195$ 段里失败 $2+1+3+0+8=14$ 段。图 7：每个平面 $15\times15-1=224$ 个命令（去掉站立），三个平面 672 个；源文件里 RL 胜 657 次、蒸馏胜 15 次，其中 7 次是蒸馏 4 次全摔（没有稳态误差可比）——所以正文写「RL 650 次更小、蒸馏 15 次」，$650+15+7=672$。

<h3 id="实例-11-我们的复现">例 11：我们的复现</h3>

- 40 段：平均 0.8277、按帧加权 0.8304、0 失败（Uni-SuperMimic 报 0.8272 / 0.8300 / 0；用它的官方评测在 CPU MuJoCo 上跑是 0.8278 / 0.8306 / 0）。
- 世界模型 vs 仿真：摔倒再起身 8 s，高度最多相差 3.6 cm；摩擦 0.3 时滑过 2.82 / 2.86 m（对照 0.99 m）。
- 8 步后根部位置相差 1.6–5.7 mm。
- 梯度方向：BPTT 1 条 0.981，似然比 1024 条 0.922。

</details>

---

## 📁 资源对照（官方代码没有放出）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文各部分在哪、项目页、Uni-SuperMimic 里对应的文件、对不上的地方</summary>

<h3 id="资源-论文各部分">论文各部分在哪</h3>

| 内容 | 位置 |
|---|---|
| 训练循环、POMDP、存活权重 | 第 3.1 节、图 2、算法 A.1 |
| 世界模型与损失 | 第 3.2 节、式 1 |
| 目标函数、BPTT、评论家 | 第 3.3 节、式 2–3 |
| SONIC 对比、算力账本 | 第 4.1 节、图 3a |
| 控制变量（PPO-Sim） | 第 4.1 节、图 4a |
| 三个性质 | 第 4.2 节、图 3b、3c、图 5 |
| 评论家消融、推搡 | 第 4.3 节、图 4b、4c |
| 真机 | 第 4.4 节、图 6 |
| 下游速度接口 | 第 4.5 节、图 7、附录 G |
| 观测、奖励、终止、随机化 | 附录 A、表 A.1–A.3 |
| 多接口、网络 | 附录 B、C、表 A.4 |
| 超参数、重置采样 | 附录 E、表 A.5 |
| 数据过滤 | 附录 D、表 A.7 |
| 失败动作 | 附录 F、表 A.6、图 A.1 |

<h3 id="资源-uni-supermimic">Uni-SuperMimic 里对应的文件</h3>

| 概念 | 文件 |
|---|---|
| 世界模型、策略、评论家 | `src/unisupermimic/rl/algos/supermimic/networks.py` |
| 三步循环、想象、BPTT、评论家更新 | `src/unisupermimic/rl/algos/supermimic/learner.py`（`collect`、`wm_update`、`policy_update`） |
| 观测、目标、奖励、软终止、上下文归一化 | `src/unisupermimic/tasks/motion_tracking/g1/supermimic/mdp.py` |
| 参考动作、未来 10 帧的目标 | `.../supermimic/motion.py` |
| 重置采样、随机化、动作映射 | `.../supermimic/manager_terms.py` |
| G1 常数（增益、缩放、默认姿态） | `.../supermimic/robot.py` |
| 评测 | `.../supermimic/evaluate.py` |
| 默认超参数 | `src/unisupermimic/conf/supermimic/config.yaml` |

<h3 id="资源-项目页">项目页</h3>

仿真合集（同一个跟踪器做各种动作）、算力对比、网页演示（专有）、「一个循环两个学习器」的动画、世界模型预测（策略开 / 关、地面变滑）、真机（林间侧滚、海边空翻、合集）、失败动作对比（空翻、侧滚、立定跳远）、问答。动画第 1、16 幕用到的片段剪自这里。

<h3 id="资源-对不上的地方">对不上的地方</h3>

- 项目页的失败表没有 fire-in-the-hole 一组，并进了「其他」（129,307 段、53 / 14 / 0），论文表 A.6 单列；
- 「约 21,000 显卡小时」：128 × 168 = 21,504；
- 图 7 的源数据里 RL「胜」657 次，正文写 650 次——差的 7 次是蒸馏摔倒、没有误差可比（例 10）。

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 PPO、DeepMimic、BeyondMimic、SONIC 和 Dreamer；方法上接 SHAC、SuperTrack 一脉；对照 PPO-Sim；下游接口对照 PULSE、MaskedMimic</summary>

- **首页路线图**：放在「⑦ 世界模型」一系的第 2 层、[HAIC](../../04_Loco-Manipulation_and_WBC/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model.html) 正下方；前置是第 ④ 系的 SONIC（同一个任务，1 张卡追上 128 张卡），虚线连 HAIC（同样用动力学世界模型训人形控制）。这是 2026-11-03 补进来的前沿扩充，不在原来的主线排期里。
- **上承**：[PPO](../../01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html)（被替换掉的训练方法、对照组 PPO-Sim）；[DeepMimic](../../01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html)（物理动作模仿）；[BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html)（跟踪设定、奖励、随机化、PD 增益都沿用它）；[SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)（大规模 PPO 跟踪，本文的对比基线）。
- **世界模型一脉**：[Dreamer](../../03_High_Impact_Selection/Dreamer_Learning_Behaviors_by_Latent_Imagination/Dreamer_Learning_Behaviors_by_Latent_Imagination.html)（在学到的潜空间动力学里想象、沿梯度学价值和策略）；SuperMimic 不用潜空间，世界模型直接预测物理状态的增量，奖励按公式算。
- **对照**：[PHC](../../01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html)、[PULSE](../../01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.html)、[MaskedMimic](../../03_High_Impact_Selection/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.html)（表 1 里的下游接口路线）；[ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)（另一种「学动力学」：学真机与仿真的动作残差；SuperMimic 的局限二提到真机数据可以修正世界模型）。
- **数据**：[GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)（人到 G1 的重定向；BONES-SEED、LAFAN1 都是重定向好的 G1 数据）。
- **方法上的意义**（我们的观察）：大规模跟踪的瓶颈原来被看成「数据和算力」，SuperMimic 把它变成「梯度估计」的问题——一旦有了足够准的可微替身，增加动作只增加世界模型要见的证据，而不按比例增加训练成本。这让「测量动作跟踪的扩展律」第一次在单卡上可行。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问六答</summary>

**Q1：SuperMimic 和 SONIC 的根本区别是什么？**
目标一样（一个策略覆盖大量动作），训练方法不同：SONIC 用模型无关的 PPO 在仿真里大规模并行采样；SuperMimic 从仿真日志学一个可微世界模型，在模型里想象短轨迹、用 BPTT 拿解析梯度。仿真器只用来采数据，不需要可微。

**Q2：为什么世界模型可以是确定性的？**
仿真器的随机性来源都已知：域随机化参数（摩擦、关节零点、质心）每回合抽一次，作为上下文 $\xi$ 喂给模型；传感器噪声按已知分布在模型外面加。剩下的仿真是确定性的。也因此去掉了根部速度推搡——那是确定性模型学不了的状态突变。

**Q3：为什么用 $k=8$ 的多步损失训模型，却想象 $H=32$ 步？**
多步自回归损失让模型学会纠正自己累积的误差，长想象也稳定；评论家负责第 $H$ 步之后的回报，所以模型只需在 $H$ 步内准。视界太短（≤ 16）没有评论家训不起来，太长（128）梯度回传变慢、回报还更低，32 是折中。

**Q4：BPTT 的梯度为什么比 PPO 方差低？**
PPO 的似然比估计只看采样动作的回报好坏，方向要靠大量样本平均；BPTT 直接对每个动作求回报的导数，每条轨迹都给出准确的方向。我们在复现模型上量过：1 条 BPTT 的方向（余弦 0.98）比 1024 条似然比（0.92）还准。代价是需要可微的模型、以及长视界上的梯度爆炸 / 消失——所以用短视界加评论家。

**Q5：「129,514 段只失败 25 段」能说明泛化吗？**
不能，这些都是训练动作；它衡量的是对训练动作库的覆盖。SONIC 整组失败的空翻、侧滚 SuperMimic 基本都做得出，说明的是同样数据下覆盖更全。新动作上的泛化论文没有测。

**Q6：下游速度接口为什么 RL 比蒸馏好？**
蒸馏只能学参考动作里出现过的命令，动作库里没有快速转弯 + 平移的数据，蒸馏的编码器在那里摔倒；RL 直接优化速度跟踪奖励，世界模型能在没见过参考的命令上给出梯度。注意解码器是冻住的（stop-gradient），编码器只能在跟踪器已经会的动作空间里找。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-11-03 · 前沿扩充：选复现仓库、独立重写评测、世界模型对照与梯度实验，再用官方代码核对</summary>

- **2026-11-03 · 初版**：这一期是主线之外的前沿扩充（论文 2026-10-20 挂出、CoRL 2026 Oral）。官方代码没有放出，项目页的网页演示许可证禁止提取，所以复现用社区的 Uni-SuperMimic：它放出了世界模型和策略的权重。为了不运行第三方的包，我们照它的代码独立重写了评测和世界模型的回放，在 CPU 上的 MuJoCo 里跑；40 段的结果和它自己报的差 0.0005，说明移植是对的。在此之上做了论文项目页那三组「世界模型 vs 仿真器」的对照（策略开 / 关、地面变滑），以及 BPTT 与似然比的余弦相似度。参考了 [Robotics_Notebooks 的 SuperMimic 条目](https://imchong.github.io/Robotics_Notebooks/detail.html?id=entity-paper-supermimic) 列出的社区仓库。
- **2026-11-03 · 用官方代码核对**：用户授权安装第三方包后，装上 Uni-SuperMimic，用它的 `unisupermimic-eval --backend mujoco` 评同一个存档：0.8278 / 0.8306 / 0 失败，和重写版差 1–2 × 10⁻⁴；世界模型同输入自回归 8 步与重写版逐位相同。数字和视频不用改。
- **2026-11-03 · 看片反馈（11 条）**：第 6 幕「跟着它转、但不跟着它歪」改成动图（骨盆先左右转身，朝向系跟着转；再前倾、侧倾，朝向系保持水平）；第 6 幕的 1.6–5.7 mm、第 8 幕的梯度余弦补上是在什么情况下量的；第 7 幕标出摩擦是在急停的第 0 秒变成 0.3；第 9 幕讲清「目标」是评论家要拟合的值、后一步的估值占 5%、目标占 95%；第 12 幕「约 7200 倍」被裁掉一截，修好并全篇查了一遍裁剪；第 18 幕三条局限各配一段动画；曲线的图例改成同样线型的线段；旁白和字幕不再一个说「系数」一个写「权重」；片尾不预告下一期。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、超参数表、开放问题</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@inproceedings{liao2026supermimic,
  title     = {SuperMimic: Scaling Humanoid Whole-Body Control
               with One Differentiable World Model},
  author    = {Liao, Qiayuan and Shao, Yiyang and Long, Junfeng and
               Zakka, Kevin and Horowitz, Roberto and Abbeel, Pieter and
               Sreenath, Koushil},
  booktitle = {Conference on Robot Learning (CoRL)},
  year      = {2026}
}
```

（项目页给的 BibTeX。）

<h3 id="b-超参数">B. 超参数（表 A.5）</h3>

| 项 | 值 |
|---|---|
| 世界模型窗口 $k$ | 8；Adam，学习率 1 卡 2e-4（2 卡 $\sqrt2\times$）；每次更新 10 批 × 2048 个窗口；梯度裁剪全局范数 1.0 |
| 想象视界 $H$ | 32；Adam $\beta=(0.9,0.95)$；每次更新 4096 条想象轨迹；梯度裁剪全局范数 1.0、再逐元素 0.1；$\gamma=0.99$ |
| 评论家 | GAE $\lambda=0.95$；每次更新 5 轮 × 4 个打乱的小批 |
| 采数据 | 每张卡 4096 个仿真环境；动作噪声 $\mathcal N(0,0.1^2)$；缓冲区每环境 1000 步 |
| 调度 | 更新数据比 0.4；每次世界模型更新配 1 次策略更新；学习率余弦衰减到 0.03 倍（250,000 次迭代后恒定）；共 320,000 次迭代；多卡数据并行、梯度平均 |

<h3 id="c-开放问题">C. 开放问题</h3>

- 加上真机数据修正世界模型，能不能缩小 sim-to-real 的差距？可导的模型拿来做系统辨识效果如何？
- 地形和物体交互会让动力学不再「所有动作共享」吗？世界模型需要多大的容量？
- 新动作上的泛化如何？动作跟踪的扩展律（数据、模型、算力）长什么样——论文说现在单卡就能测了。
- 策略会不会利用世界模型的误差？有没有必要加不确定性估计（像 RWM-U 那样）？

</details>

---

## 📎 参考来源

- 论文：Liao, Shao, Long, Zakka, Horowitz, Abbeel, Sreenath, *SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model*, CoRL 2026（Oral），[arXiv 2610.28480](https://arxiv.org/abs/2610.28480)（v1 的 LaTeX 源码）。
- 项目页：[supermimic.github.io](https://supermimic.github.io/)；动画和视频里的仿真与真机片段剪自项目页的视频，只做讲解引用。
- 复现用的代码与模型：[Motphys/Uni-SuperMimic](https://github.com/Motphys/Uni-SuperMimic)（Apache-2.0，`ac19b73`，`checkpoints-v1/lafan1_ckpt_012000.pt`）；数据与 G1 模型：Hugging Face `lvhaidong/LAFAN1_Retargeting_Dataset`。
- 其他社区复现：[CuboiLeo/SuperMimic-Reproduced](https://github.com/CuboiLeo/SuperMimic-Reproduced)、[NJU-R-L-Group-Embodied-Lab/SuperMimic-Repro-Sim2Real](https://github.com/NJU-R-L-Group-Embodied-Lab/SuperMimic-Repro-Sim2Real)、[zita-ch/supermimic_vibed](https://github.com/zita-ch/supermimic_vibed)、索引 [DiaoOrg/awesome-supermimic](https://github.com/DiaoOrg/awesome-supermimic)。
- 参考条目：[Robotics_Notebooks · SuperMimic](https://imchong.github.io/Robotics_Notebooks/detail.html?id=entity-paper-supermimic)。
- G1 的渲染：[Robot_Retarget_Online](https://github.com/ImChong/Robot_Retarget_Online) 的 `unitree_g1` 模型与 three.js 材质。
- 上游清单：[YanjieZe/awesome-humanoid-robot-learning](https://github.com/YanjieZe/awesome-humanoid-robot-learning) · Loco-Manipulation and Whole-Body-Control。
