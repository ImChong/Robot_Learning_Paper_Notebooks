---
layout: paper
paper_order: 9
title: "Universal Humanoid Motion Representations for Physics-Based Control (PULSE)"
category: "基础强化学习"
zhname: "PULSE：物理可行的通用潜在技能提取"
demos: ["pulse"]
---

# PULSE: Universal Humanoid Motion Representations for Physics-Based Control
**PULSE：物理可行的通用潜在技能提取**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 技能组合主线 · ASE → CALM → **PULSE**
>
> 🧭 状态: 深度技术细节已填充（基于 arXiv:2310.04582v2 正文与附录 + 官方仓库 ZhengyiLuo/PULSE 源码）

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2310.04582](https://arxiv.org/abs/2310.04582) (ICLR 2024 Spotlight) |
| **PDF** | [Download](https://arxiv.org/pdf/2310.04582.pdf) |
| **作者** | Zhengyi Luo, Jinkun Cao, Josh Merel, Alexander Winkler, Jing Huang, Kris Kitani, Weipeng Xu |
| **机构** | Meta Reality Labs Research / CMU |
| **发布时间** | 2023-10 (arXiv), 2024-05 (ICLR) |
| **项目主页** | [zhengyiluo.github.io/PULSE](https://zhengyiluo.github.io/PULSE/) |
| **代码** | [GitHub - ZhengyiLuo/PULSE](https://github.com/ZhengyiLuo/PULSE)（基于 PHC / Isaac Gym 栈；2024-08 又放出 SMPL-X 版 PULSE-X 预览） |
| **数据与仿真** | AMASS 清洗后训练集 11313 段 / 测试集 138 段（约 40 小时）；SMPL 平均体型 24 关节、69 维 PD 目标；Isaac Gym，策略 30 Hz、仿真 60 Hz |

---

## 🎯 一句话总结

> PULSE 先训一个能跟住全部 AMASS（清洗后 11313 段、约 40 小时）的教师 PHC+，再用 Variational Information Bottleneck (VIB) 在线蒸馏出一个 32 维潜空间，并同时学一个以本体感受为条件的先验；下游任务冻结解码器与先验，只在先验均值上输出残差。

> 🎮 **本文内嵌 1 段动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [六幕动画：PULSE 全流程](#pulse-explainer-anim) —— 约 90 秒串完「缺一个通用表示 → 阶段 1 大规模模仿 → 阶段 2 VIB 瓶颈 → 本体感受先验 → 阶段 3 下游只搜 32 维 → 闭环与源码落点」
> 2. [配音讲解视频](#pulse-video) —— 同样六幕，加中文配音与字幕，7 分 10 秒竖屏，可下载
> 3. VIB 实验台 —— 拖 $\beta$，看潜空间在「把 AMASS 背下来」和「posterior collapse」之间怎么取舍
> 4. 本体感受先验实验台 —— 换身体状态，看固定的 $\mathcal{N}(0, I)$ 采出来的 $z$ 有多少这一步根本执行不了
> 5. 下游任务实验台 —— 32 维潜空间与 69 维关节空间的学习曲线并排，顺便看残差拉太大会发生什么

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| PULSE | Physics-based Universal motion Latent SpacE | 物理通用的运动潜空间 |
| PHC / PHC+ | Perpetual Humanoid Controller / 其改进版 | 能跟踪几乎全部 AMASS、跌倒能爬起的模仿器；PHC+ 是本文为了做到 100% 而改的教师 |
| VIB | Variational Information Bottleneck | 变分信息瓶颈：让信息必须挤过一个带噪声、被 KL 约束的低维变量，用于压缩和提取核心特征 |
| KL / KLD | Kullback–Leibler Divergence | 两个分布差多远；这里衡量编码器给的 $z$ 分布离先验有多远 |
| ELBO | Evidence Lower Bound | 证据下界：「重建项 − KL 项」，VAE / VIB 的训练目标（论文式 2） |
| DAgger | Dataset Aggregation | 学生自己滚数据、老师给这些状态打标签的模仿学习方式；PULSE 的在线蒸馏就是这种形式 |
| AMASS | Archive of Motion Capture as Surface Shapes | 大规模人体动作捕捉数据集，统一成 SMPL 参数 |
| SMPL | Skinned Multi-Person Linear model | 常用的人体参数化模型；本文的人形按其平均体型搭成 24 关节、23 个驱动关节 |
| PD | Proportional-Derivative | 比例-微分控制：策略输出目标关节角，PD 控制器算力矩 |
| MPJPE | Mean Per-Joint Position Error | 平均关节位置误差（mm）；$E _ {\text{g-mpjpe}}$ 是全局坐标，$E _ {\text{mpjpe}}$ 是相对根节点 |
| HRL | Hierarchical Reinforcement Learning | 分层强化学习：高层输出 latent，冻结的低层把它翻成动作 |
| NPMP / AR(1) | Neural Probabilistic Motor Primitives / 一阶自回归先验 | Merel 等的潜空间工作，用 $z_t$ 与 $z _ {t-1}$ 相关的先验让 latent 平滑；PULSE 的平滑项与它类似 |
| HuMoR | Human Motion Model for Robust estimation | 运动学的逐帧条件 VAE，带可学的条件先验；PULSE 的可学先验受它启发 |
| VQ-VAE | Vector-Quantized VAE | 离散码本潜空间；附录 C.3 把它作为对照 |
| MCP | Multiplicative Compositional Policies | 多个原语加权组合的策略；PHC 的「多原语 + 组合器」与它同类 |

---

## 🎬 六幕动画：PULSE 全流程 {#pulse-explainer-anim}

<div class="paper-demo" data-demo="pulse-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#pulse-video}

<div class="paper-demo" data-demo="pulse-video" data-src="media/pulse_explainer_video.mp4" data-poster="media/pulse_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/pulse_explainer_video.mp4" download="PULSE_讲解视频.mp4">下载 mp4（9.4 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」「具体实例」）按小节收起，后面的实验解读、工程意义、局限、源码对照、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图、三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ PULSE 要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：复用「已经学会的动作」有两条路，两条都卡住了</summary>

论文开篇的出发点（第 1 节）：物理人形已经能模仿整个动作数据集、做出漂亮的动画、靠稀疏传感器跟踪人，但**每个任务都要重新整理数据、从零训一个物理策略**，奖励、数据、训练框架任何一处出问题都会得到别扭的动作。要让人形「批量可用」，必须复用已经学会的运动技能。

复用有两条现成的路，PULSE 认为都不够：

| 路线 | 做法 | 卡在哪 |
|------|------|--------|
| 技能潜空间（ASE、CALM、NPMP、ControlVAE……） | 先用对抗或模仿目标学一个 latent → 动作的解码器，下游高层输出 latent | 只在小而专门的数据上学，**覆盖率太窄** |
| 运动学动作当接口（各类 motion tracking） | 低层是模仿器，高层输出整套全身参考动作 | 运动学空间维度高、没有物理约束，**RL 很难在里面搜** |

PULSE 要做的是第三种：一个**覆盖全部 AMASS** 的潜空间，既能像技能潜空间那样给高层当动作空间，又能像模仿器那样做自由形式的跟踪。

</details>

### 问题一：技能潜空间的覆盖率太窄

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只装得下行走、拳击、舞蹈；扩到 CMU 都不理想，AMASS 上 ASE / CALM 跟踪成功率只有 37.6% / 10.1%</summary>

- 之前的潜空间方法用的是**小而专门的数据集**，盯着行走、拳击、跳舞这类特定风格（第 1 节）；学出来的空间只能产生训练数据预先规定好的那一小撮行为。
- 把数据扩到 CMU MoCap 的尝试（Won 等 2022、Yao 等 2022）结果并不理想（第 1 节）。
- 因此这类表示只能用于行走、风格化动画这类**生成任务**；要做「用户怎么动、人形就怎么动」的**自由形式跟踪**，它们的潜空间根本覆盖不到。
- 论文把 ASE、CALM 用官方代码在 AMASS 训练集上重训（约 10 亿样本），再拿去做 VR 三点跟踪：AMASS 测试集成功率 ASE-30Hz **37.6%**、CALM-30Hz **10.1%**，真实 Quest 2 数据 14 段里分别只跟住 7 段和 2 段（表 2）。PULSE 是 93.4% 和 14/14。

</details>

### 问题二：拿运动学动作当接口，RL 很难搜

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：维度高、没有物理约束、看不到交互动力学</summary>

另一条路是把低层做成模仿器，高层输出全身运动学动作。论文指出三点（第 1 节）：

1. **对 RL 来说是很差的采样空间**：维度高，而且没有物理约束——根节点位置稍微一变，整段动作就会大跳。
2. **生成任务还得再套一层**：没有成对数据（例如视频 ↔ 动作）时只能靠 RL，于是又需要 MVAE、HuMoR 这类运动学潜空间来约束采样。
3. **看不到交互动力学**：只用运动学信号，物体操作、复杂地形这类要和环境接触的任务很难做。

</details>

### 问题三：每个新任务都从零学「怎么动」

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：从零训练回报不差，但动作不像人；靠对抗奖励补自然度又要额外设计</summary>

- 从零训练（不用任何潜空间、也不加对抗奖励）在 PULSE 的四个生成任务上回报其实最接近 PULSE，但动作**不自然**（第 5.2 节，图 4）。
- 想要像人，PACER 这类工作要额外加对抗奖励（附录 C.4）；PULSE 希望下游**只写一个很简单的任务奖励**，像人这件事由潜空间本身兜底。
- 论文把这个目标说成「控制的基础模型」：速度、够点、击打、复杂地形、VR 跟踪，都复用同一个表示，不加任何适配层（第 1、6 节）。

</details>

---

## 🔧 PULSE 是怎么做的？

### 核心思想：先有一个什么都会的老师，再把它「挤」进 32 维

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三阶段各训什么、冻结什么；和 ASE / CALM 的根本区别是「蒸馏」而不是「对抗」</summary>

| 阶段 | 训练什么 | 用什么目标 | 产物 |
|------|----------|------------|------|
| 1. 大规模模仿（4.1 节） | PHC+：3 个原语 + 组合器 | RL（PPO），模仿 + AMP + 能耗奖励 | 能跟住 100% AMASS 训练集的**教师** |
| 2. 在线蒸馏（4.2 节） | 编码器 $E$、解码器 $D$、先验 $R$ 一起训 | **监督学习**：学生动作对齐教师动作 + 平滑项 + KL | 32 维概率潜空间 |
| 3. 下游任务（4.3 节） | 只训高层策略 $\pi _ {task}$，$D$ 与 $R$ 冻结 | RL（PPO），任务奖励 | 速度 / 够点 / 击打 / 地形 / VR 跟踪 |

论文自己说的关键洞察（第 1 节）：**用一个预训练好的模仿器做直接的在线蒸馏**，这是能扩展到大数据集的关键。

和 ASE / CALM 的根本区别（第 2 节）：

- ASE、CALM 用判别器或编码器奖励，让「随机噪声 → 真实动作」的映射靠**对抗训练**长出来；在小而专门的数据上有效，在 AMASS 这种大而杂的数据上覆盖不住。
- PULSE 走「显式跟踪目标」这条线（同类还有 ControlVAE、NPMP、PhysicsVAE、NCP），但区别是**蒸馏一个已经训好的模仿器**，并同时学一个**以本体感受为条件的先验**——论文认为这两点是做出通用潜空间的关键。

</details>

### 第一步：PHC+——能跟住全部 AMASS 的老师

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：逐帧目标状态、渐进式难例训练；四处改动把 PHC 的 98.9% 推到 100%</summary>

**任务定义**（4.1 节）：教师是逐帧的目标条件策略 $\pi^{\text{PHC}}(a_t \mid s_t^p, s_t^{\text{g-mimic}})$。本体感受 $s_t^p = (q_t, \dot{q} _ t)$ 包含 3D 姿态和速度，所有量都按人形朝向（yaw）归一化（第 3 节）。目标状态是「下一帧参考 − 当前」的差，外加下一帧参考本身：

$$
s^{\text{g-mimic}}_t \triangleq \left(\hat{\theta}_{t+1} \ominus \theta_t,\ \hat{p}_{t+1} - p_t,\ \hat{v}_{t+1} - v_t,\ \hat{\omega}_t - \omega_t,\ \hat{\theta}_{t+1},\ \hat{p}_{t+1}\right)
$$

**动作**：SMPL 平均体型的人形有 24 个关节、23 个驱动关节，动作 $a_t \in \mathbb{R}^{23 \times 3}$，即 69 维 PD 目标；力矩 $\tau = k_p \circ (a_t - q_t) - k_d \circ \dot{q} _ t$，上限 500 N·m（第 3 节、附录 B.2）。

**PHC 的渐进式训练**（4.1 节）：先用全部数据训原语 $P^{(0)}$；成功率不再涨时，把 $P^{(0)}$ 失败的序列收成难例集 $\hat{Q}^{(0)} _ {hard}$，再新建 $P^{(1)}$ 专门学它们；如此反复，直到难例学不动或为空。另训一个原语 $P^{(F)}$ 负责跌倒后爬起，最后训一个组合器 $C$ 在冻结的原语之间动态切换。PHC 在 AMASS 训练集上做到 98.9%。

**PHC+ 的改动**（4.1 节、附录 B）：

1. **清洗数据**：AMASS 里仍有严重穿模和跳帧的序列。它们对 PHC 是双重打击——难例挖掘会反复把它们挑出来；再加上 DeepMimic 式的随机初始状态（RSI），从穿模帧开始时物理引擎会给出巨大的地面反力，人形直接「飞出去」。清掉之后得到 11313 段训练、138 段测试。
2. **让每个原语先吃完自己的难例**：PHC 一形成 $\hat{Q}^{(t)} _ {hard}$ 就立刻新建 $P^{(t+1)}$，$P^{(t)}$ 没机会在自己的难例上继续提升；PHC+ 在训练 $P^{(t)}$ 的过程中就不断更新难例集，更充分地用掉每个原语的容量。
3. **换激活、加深网络**：ReLU → SiLU，3 层 MLP → 6 层 MLP（$[2048, 1536, 1024, 1024, 512, 512]$）。
4. 结果：**只用 3 个原语**（含爬起）加组合器，训练集成功率 100%、测试集 99.2%（表 1）。

单个原语上的消融（附录表 5，AMASS 测试集，每个原语 $3 \times 10^9$ 样本）：

| 激活 | 训练中更新难例 | 成功率 | $E _ {\text{mpjpe}}$ (mm) |
|------|:--------------:|:------:|:------:|
| SiLU | ✗ | 92.0% | 29.2 |
| ReLU | ✓ | 97.8% | 32.8 |
| SiLU | ✓ | **98.5%** | **28.1** |

**奖励**（附录式 5）：$r_t = 0.5\, r^{\text{g-imitation}} _ t + 0.5\, r^{\text{amp}} _ t + r^{\text{energy}} _ t$。其中模仿项是 23 个刚体的位置 / 旋转 / 线速度 / 角速度四项指数核，权重 0.5 / 0.3 / 0.1 / 0.1（表 4），核里的系数分别是 100 / 10 / 0.1 / 0.1；$r^{\text{amp}}$ 是在 AMASS 上训的 AMP 判别器奖励；能耗惩罚 $-0.0005 \sum_j \lvert \mu_j \omega_j \rvert^2$（力矩 × 关节角速度）用来压高频抖动。

</details>

### 第二步：编码器、解码器、先验三件套

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：长得像条件 VAE，但不重建动作，直接在动作空间里对齐教师；解码器看不到目标，信息只能挤过 z</summary>

三个网络（4.2 节，式 1）：

| 网络 | 输入 | 输出 | 作用 |
|------|------|------|------|
| 编码器 $E(z_t \mid s_t^p, s_t^{\text{g-mimic}})$ | 本体感受 + 目标状态 | $\mathcal{N}(\mu^e_t, \sigma^e_t)$ | 把「此刻要做什么」编成 $z$ |
| 解码器 $D(a_t \mid s_t^p, z_t)$ | 本体感受 + $z$ | 69 维 PD 目标 | 把 $z$ 翻译成物理上可执行的动作 |
| 先验 $R(z_t \mid s_t^p)$ | **只有**本体感受 | $\mathcal{N}(\mu^p_t, \sigma^p_t)$ | 「以我现在这个姿态，接下来自然会做的动作」分布 |

三者合起来就是学生策略 $\pi^{\text{PULSE}} \triangleq (E, D, R)$。训练时从编码器分布采样 $z_t$ 再解码；**评估时用编码器均值 $\mu^e_t$**，不采样（4.2 节）。

目标是证据下界（式 2）：

$$
\log P(a_t \mid s_t^p, s_t^{\text{g-mimic}}) \ \ge\ \mathbb{E}_{E}\big[\log D(a_t \mid s_t^p, z_t)\big] - D_{\mathrm{KL}}\big(E(z_t \mid s_t^p, s_t^{\text{g-mimic}}) \,\Vert\, R(z_t \mid s_t^p)\big)
$$

**它不是 VAE**（4.2 节）：结构像，但没有任何「重建动作序列」的损失，而是直接在**动作空间**里优化——第一项换成「学生动作对齐教师动作」。

**瓶颈从哪来**（笔记的解读）：解码器的输入里没有目标状态，所以「下一帧要去哪」这条信息只能经过 32 维的 $z$ 传过去；KL 项又把 $z$ 往先验上拉、给它加噪声。两股力一夹，$z$ 只能保留对动作最有用的那部分信息。

**尺寸**（第 5 节）：$z_t \in \mathbb{R}^{32}$，约等于 69 个自由度的一半；$E$、$D$、$R$ 都是 3 层 MLP。官方配置里编码器和先验是 $[1536, 1024, 512]$，解码器是 $[3096, 2048, 1024]$，激活 SiLU（`im_z_fit.yaml`）。

</details>

### 第三步：三项损失与 β 退火

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：动作误差 + α·相邻帧平滑 + β·KL；α = 0.005，β 从 0.01 退火到 0.001；去掉平滑项 93.4% → 60.8%</summary>

损失（式 3）：

$$
\mathcal{L} = \mathcal{L}_{\text{action}} + \alpha\,\mathcal{L}_{\text{regu}} + \beta\,\mathcal{L}_{\text{KL}},\qquad
\mathcal{L}_{\text{action}} = \lVert a_t^{\text{PHC+}} - a_t \rVert_2^2,\qquad
\mathcal{L}_{\text{regu}} = \lVert \mu^e_t - \mu^e_{t-1} \rVert_2^2
$$

- **$\mathcal{L} _ {action}$**：学生动作对齐教师动作，相当于 VAE 的重建项。
- **$\mathcal{L} _ {regu}$**：论文发现，不加约束时可学先验会把相邻状态的 latent 推得很远，潜空间变得不连续、下游 RL 很难在里面探索；于是惩罚相邻两帧编码器均值的差。它是一个弱先验，类似 NPMP 的 AR(1) 先验（4.2 节）。$\alpha = 0.005$。
- **$\mathcal{L} _ {KL}$**：两个对角高斯之间的 KL 有闭式解，逐维求和：

$$
D_{\mathrm{KL}}\big(\mathcal{N}(\mu^e, \sigma^e) \,\Vert\, \mathcal{N}(\mu^p, \sigma^p)\big) = \sum_{i=1}^{32} \left[ \ln\frac{\sigma^p_i}{\sigma^e_i} + \frac{(\sigma^e_i)^2 + (\mu^e_i - \mu^p_i)^2}{2(\sigma^p_i)^2} - \frac{1}{2} \right]
$$

- **$\beta$ 退火**：为了维持「重建误差 vs KL」之间那点微妙的平衡，$\beta$ 从 0.01 逐渐降到 0.001（4.2 节）。附录 C.1 说退火发生在第 $2.5 \times 10^9$ 到 $5 \times 10^9$ 个样本之间，之后不变；但表 4 写 PULSE 的总样本数约 $10^9$，两处数量级对不上。官方源码是按 epoch 2500 → 5000 线性退火的（`amp_agent.py`）。

**代价**：加了瓶颈之后，训练集成功率从教师的 100% 降到 99.8%、测试集从 99.2% 降到 97.1%（表 1）；论文说不加变分瓶颈的蒸馏可以做到 100%，这点下降相当于 VAE 的非零重建误差，是有损压缩（5.1 节、第 6 节）。

**消融**（表 3，下游 VR 跟踪成功率，AMASS 测试集）：完整版 93.4%；去掉 $\mathcal{L} _ {regu}$ 降到 60.8%；在没有可学先验的配置里，去掉 $\mathcal{L} _ {regu}$ 也从 45.6% 降到 36.9%。

</details>

第二阶段那个 KL 项前面的系数 $\beta$ 是整个方法的命门：太小，潜空间只是把 AMASS **背下来**；太大，后验塌成先验，latent 什么也没记住。下面这个实验台把这条 rate–distortion 曲线画了出来：

<div class="paper-demo" data-demo="pulse-vib"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第四步：为什么用在线蒸馏，而不是 RL

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学生滚状态、老师打标签（DAgger）；RL 从零训只有 72.0% / 32.6%，混进 RL 目标反而 93.4% → 71.0%</summary>

**怎么蒸**（4.2 节、算法 1 第 4–16 行）：

1. 从 AMASS 采一段参考动作和初始状态；
2. **学生**逐帧编码 → 重参数化采样 $z_t$ → 解码出动作 → 仿真走一步，状态存进缓冲区；
3. 缓冲区满了，用冻结的 **PHC+ 给这些状态打标签** $a_t^{\text{PHC+}}$；
4. 先验算出 $\mu^p_t, \sigma^p_t$；
5. 用式 3 对 $E$、$D$、$R$ 做一次**监督**更新。

驱动仿真的是学生自己的动作，老师只负责「在学生走到的状态上该怎么做」——和 DAgger 一样（第 2 节）。这样学生会见到自己犯错后才会进入的状态，并学会从那里纠正。官方实现里，`humanoid_im_distill.py` 在 `torch.no_grad()` 下用 3 个原语的输出按组合器权重加权求和得到教师动作 `gt_action`，然后照常 `pre_physics_step(actions)` 执行学生动作。

蒸馏时也沿用 PHC+ 的渐进式难例挖掘，这顺便平衡了稀有难序列和简单序列的样本量（4.2 节）。

**为什么不用 RL**（4.2 节、附录 C.2）：

- 理论上可以把解码器当成固定方差的高斯策略，用 RL 目标训（类似 kickstarting），但「为 VIB 采样 $z$」和「为 RL 探索采样动作」两层随机性叠在一起，系统太不稳定；论文推测这会带来很嘈杂的梯度。
- **只用 RL、不蒸馏**（附录表 6）：训练超过 $10^{10}$ 个样本后，训练集成功率 72.0%、测试集 32.6%；蒸馏版是 99.8% / 97.1%。
- **RL 与蒸馏混着用**（表 3 第 4 行）：下游 VR 跟踪成功率从 93.4% 掉到 71.0%，潜空间更嘈杂，比不混还差。
- MCP 证明过这类策略可以从零用 RL 训，但加上变分瓶颈之后就不行了（附录 C.2）。

</details>

### 第五步：以本体感受为条件的先验

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：站着和空中翻跟头的动作分布完全不同；换成 N(0, 1) 下游掉到 45.6%，球面 / VQ 潜空间能模仿但随机采样不连贯</summary>

**为什么要可学的先验**（4.2 节）：受 HuMoR 启发，PULSE 用条件先验 $R(z_t \mid s_t^p)$ 取代 VAE 里固定的零均值高斯。论文的理由一句话：**一个人站着不动和在空中翻跟头时，动作分布可以完全不同**。固定先验对所有状态都给同一个 $\mathcal{N}(0, I)$，等于逼着编码器把所有状态的 $z$ 都往原点挤。

**证据**：

- 表 3 中「不用可学先验、改用 $\mathcal{N}(0, 1)$」的那一行（R2）下游 VR 跟踪只有 **45.6%**，完整版 93.4%。（正文 5.4 节把这一行误写成「R6」，按表格应为 R2。）
- 附录 C.3：换成 ASE 式的 32 维**单位球面**潜空间，模仿能做到 100% 成功率、28.1 mm 全局误差；换成 **VQ**（64 维分 8 段、码本 64）也有 99.8%、36.5 mm。但两者都**失去了生成能力**：从潜空间随机采样采不出连贯动作，VQ 还会因为在离散码之间跳而高频抖动。
- **随机生成**（5.3 节）：从先验 $R$ 随机滚动，可以生成又长又稳、多样且像人的动作，跌倒后还能爬起；改变输入噪声的方差，可以让动作偏平缓或偏有活力。

**副作用**：$\sigma^p$ 往往很小（4.3 节），所以下游探索不能直接用它——见下一步。

官方实现：`amp_network_z_builder.py` 的 `compute_prior()` 用一个只吃本体感受的 MLP 输出 $\mu^p$ 与 $\log(\sigma^p)^2$，并把对数方差夹在 $[-5, 2]$（`use_vae_clamped_prior`、`vae_var_clamp_max: 2`）。

</details>

而「本体感受先验」解决的是另一件事：**固定的 $\mathcal{N}(0, I)$ 不知道你此刻是站着还是在空中**。换个身体状态试试，看固定先验采出来的 $z$ 有多少在这一步根本执行不了——以及这个误差在长序列上怎么指数放大：

<div class="paper-demo" data-demo="pulse-prior"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第六步：下游只学残差

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：冻结 D 和 R，高层输出相对先验均值的 32 维残差，探索方差固定 0.22；不用残差 VR 跟踪只有 18.1%</summary>

**新的动力学系统**（4.3 节）：$\pi^{\text{PULSE}}$ 收敛后，冻结的解码器 $D$ 加上物理仿真，可以看成一个「动作是 $z$」的新环境。高层策略 $\pi _ {task}(z_t^{task} \mid s_t^p, s_t^g)$ 是固定对角协方差的高斯。

**残差动作**（式 4）：

$$
a_t^{\text{task}} = D\big(\pi_{\text{task}}(z_t^{\text{task}} \mid s_t^p, s_t^g) + \mu^p_t\big)
$$

- 高层输出的不是 $z$，而是**相对先验均值 $\mu^p_t$ 的偏移**。高层什么都不做时（残差为 0），人形就按先验认为「此刻最自然」的方式动；高层只需要学怎么把它往任务方向推。
- 探索方差固定为 **0.22**，不用 $\sigma^p$，因为 $\sigma^p$ 往往很小（4.3 节）。
- 消融（表 3 第 5 行）：有可学先验但**不用残差**、高层直接输出 $z$，VR 跟踪只有 **18.1%**——潜空间太难直接采样，和 CALM 去掉风格奖励之后的问题类似。
- 论文强调：整个下游**不用任何对抗目标**，像人这件事来自从先验采样（4.3 节）；附录 C.4 推测这是因为在预学的先验里，像人的动作比不自然的动作更容易被采到。

**下游任务**（第 5 节、附录 C.4）：

| 任务 | 目标状态 / 奖励 | 初始状态 | 训练量 |
|------|-----------------|----------|--------|
| 速度 | 目标方向 + 0–5 m/s 的 x 向速度 | AMASS 行走子集（同 PACER） | 约 $2 \times 10^9$ 样本 |
| 击打 | 用右手把目标打倒，目标在 1.5–5 m；奖励 $1 - u^{up} \cdot u_t$ | AMASS 训练集 | 约 $2 \times 10^9$ |
| 够点 | 右手够到一个 3D 点；奖励 $\exp(-5 \lVert p_t^{\text{right hand}} - c_t \rVert^2)$ | AMASS 训练集 | 约 $2 \times 10^9$ |
| 复杂地形轨迹跟随 | 32×32×3 局部高度图（覆盖 2 m × 2 m）+ 未来 10 步 2D 轨迹；楼梯、斜坡、不平地面、障碍 | AMASS 行走子集 | 约 $10^{10}$ |
| VR 三点跟踪 | 头显 + 两个手柄的 6DoF 位姿；用全身模仿奖励训练（同 QuestSim） | AMASS 训练集 | — |

生成任务的高层是 3 层 MLP $[2048, 1024, 512]$，VR 跟踪是 6 层 MLP $[2048, 1536, 1024, 1024, 512, 512]$，价值网络同结构，都用 PPO（附录 C.4）。

</details>

### 📊 PULSE 两阶段与下游调用流程

<div class="mermaid">
flowchart TB
    AMASS["AMASS 清洗后 11313 段"] --> M1["阶段1：PHC+ 教师<br/>3 原语 + 组合器，100% 成功率"]
    M1 -->|"在学生走到的状态上<br/>给出教师动作"| M2["阶段2：在线蒸馏（监督）<br/>编码器 E → 32 维 z → 解码器 D"]
    Prop["本体感受先验<br/>R(z#124;s^p)"] -->|"KL 把 z 拉向先验"| M2
    M2 --> Z["冻结 D 与 R"]
    Z --> HL["阶段3：高层策略只输出残差 Δz<br/>z = μ^p + Δz，探索方差 0.22"]
    HL --> Low["冻结 Decoder：z + s^p → 69 维 PD 目标"]
    Low --> Robot["物理仿真人形"]
    Robot -->|"新的 s^p"| HL
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文算法 1 的文字版（TrainPULSE / TrainDownstreamTask）</summary>

**TrainPULSE**（输入：数据集 $\hat{Q}$、预训练 PHC+、$E$ / $D$ / $R$）

1. 清空采样缓冲区 $M$；
2. 缓冲区没满时：从 $\hat{Q}$ 采一段参考动作和初始状态；逐帧 $s_t \leftarrow (s_t^p, s_t^{\text{g-mimic}})$ → $E$ 给出 $\mu^e_t, \sigma^e_t$ → 重参数化采样 $z_t$ → $D$ 解码出 $a_t$ → 仿真得到 $s _ {t+1}$ → 存入 $M$；
3. 用 PHC+ 给 $M$ 里的状态打标签 $a_t^{\text{PHC+}}$；
4. 用 $R$ 算出先验 $\mu^p_t, \sigma^p_t$；
5. 用 $(a_t, a_t^{\text{PHC+}}, \mu^p_t, \sigma^p_t, \mu^e_t, \sigma^e_t)$ 和式 3 监督更新 $E$、$D$、$R$；回到 1 直到收敛。

**TrainDownstreamTask**（输入：冻结的 $D$、$R$，任务定义，用于采初始状态的数据集）

1. 清空 $M$；
2. 缓冲区没满时：采初始状态；逐帧由 $\pi _ {task}$ 采 $z_t^{task}$ → $R$ 算 $\mu^p_t$ → $a_t^{task} = D(s_t^p, z_t^{task} + \mu^p_t)$ → 仿真 → 算任务奖励 → 存 $(s_t, z_t, r_t, s _ {t+1})$；
3. 用 PPO 更新 $\pi _ {task}$；回到 1 直到收敛。

</details>

---

## 🚶 具体实例：手算一帧蒸馏损失与一次下游残差

<div class="mermaid">
flowchart TB
  subgraph sample["随机采样 z"]
    Z1["z ~ p(z#124;s)"] --> M1["连贯动作：转圈/挥手/小跑"]
  end
  subgraph search["奖励引导"]
    R["任务奖励"] --> Z2["在 latent 搜索 z"]
    Z2 --> M2["击打等任务动作"]
  end
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：先看效果：随机采样能采出连贯动作，给个奖励就能在 latent 里搜</summary>

通过 PULSE，用户可以：
- 从 latent space 中随机采样，机器人会自发产生连贯的人类动作（如转圈、挥手、小跑），跌倒了还能自己爬起来（图 3f、5.3 节）。
- 给定一个简单的奖励函数（如"击打目标"），策略能快速学会在 latent 中寻找合适的动作序列（图 3、图 4）。

下面把一帧训练和一次下游决策用具体数字走一遍，看式 3 和式 4 里每一项到底有多大。

</details>

### 第 0 步：设定（玩具 2 维潜空间）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：沿用上面「本体感受先验」演示里「腾空中」的那组数——先验中心 (1.35, −0.90)、标准差 0.192</summary>

> ⚠️ 这是**玩具数字**：真实的 $z$ 是 32 维、动作是 69 维，下面把 $z$ 缩成 2 维、动作缩成 3 维，只为了能手算；数值不能和论文直接比。

- 当前身体状态：**腾空中**。先验 $R(z \mid s^p)$ 沿用上面实验台里这个状态的可行区：均值 $\mu^p = (1.35,\ -0.90)$，标准差 $\sigma^p = 0.6 \times 0.32 = 0.192$（两维相同）。
- 编码器看到了「下一帧要落地」这个目标，给出 $\mu^e_t = (1.45,\ -0.85)$、$\sigma^e = 0.15$。
- 上一帧编码器均值 $\mu^e _ {t-1} = (1.40,\ -0.88)$。
- 教师 PHC+ 的动作 $a^{\text{PHC+}} = (0.30,\ -0.10,\ 0.50)$，学生解码出的动作 $a = (0.25,\ -0.05,\ 0.45)$。
- 系数取论文值：$\alpha = 0.005$；$\beta$ 先取退火前的 0.01。

</details>

### 第 1 步：KL 项——可学先验 vs 固定 N(0, I)

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：同一个编码器输出，对可学先验的 KL 是 0.2736，对 N(0, I) 是 4.2292，差 15.5 倍</summary>

按上面的闭式解逐维算。

**对可学先验** $\mathcal{N}((1.35, -0.90),\ 0.192)$：$\ln(0.192 / 0.15) = 0.2469$，$2 \times 0.192^2 = 0.073728$。

| 维 | $\mu^e - \mu^p$ | $\frac{(\sigma^e)^2 + (\mu^e - \mu^p)^2}{2(\sigma^p)^2}$ | 这一维的 KL |
|:--:|:--:|:--:|:--:|
| 1 | 0.10 | $(0.0225 + 0.0100) / 0.073728 = 0.4408$ | $0.2469 + 0.4408 - 0.5 = 0.1877$ |
| 2 | 0.05 | $(0.0225 + 0.0025) / 0.073728 = 0.3391$ | $0.2469 + 0.3391 - 0.5 = 0.0859$ |

合计 $D _ {\mathrm{KL}} = 0.2736$。

**对固定先验** $\mathcal{N}(0, I)$：$\ln(1 / 0.15) = 1.8971$。

| 维 | $\mu^e$ | $\frac{(\sigma^e)^2 + (\mu^e)^2}{2}$ | 这一维的 KL |
|:--:|:--:|:--:|:--:|
| 1 | 1.45 | $(0.0225 + 2.1025) / 2 = 1.0625$ | $1.8971 + 1.0625 - 0.5 = 2.4596$ |
| 2 | −0.85 | $(0.0225 + 0.7225) / 2 = 0.3725$ | $1.8971 + 0.3725 - 0.5 = 1.7696$ |

合计 $D _ {\mathrm{KL}} = 4.2292$，是可学先验的 **15.5 倍**。

读法：编码器的输出本身没变，变的是「拿谁当参照」。固定先验不知道人形此刻在空中，把一个合理的 $z$ 也当成离谱的偏离来罚。

</details>

### 第 2 步：动作项与平滑项

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：动作误差 0.0075，平滑项 0.0034 × α = 0.000017；源码里的动作项是不平方的范数 0.0866</summary>

- **动作项**：每维差都是 0.05，$\mathcal{L} _ {action} = 3 \times 0.05^2 = 0.0075$。
- **平滑项**：$\mu^e_t - \mu^e _ {t-1} = (0.05,\ 0.03)$，$\mathcal{L} _ {regu} = 0.0025 + 0.0009 = 0.0034$，乘 $\alpha = 0.005$ 后只有 0.000017。

平滑项在数值上几乎可以忽略，但表 3 说去掉它下游掉到 60.8%——它管的不是「这一帧」，而是**整片潜空间连不连续**：它把相邻状态的 $z$ 钉在一起，高层探索时稍微挪一点 $z$，动作也只变一点。

官方源码和论文式 3 有两处写法差别（见下文源码对照）：动作项用的是 `torch.norm(...).mean()`，即不平方的 L2 范数 $\sqrt{0.0075} = 0.0866$；平滑项是 AR(1) 形式 $\lVert \mu^e_t - 0.99\,\mu^e _ {t-1} \rVert$，这里是 $\lVert (0.064,\ 0.0212) \rVert = 0.0674$。

</details>

### 第 3 步：合起来，β 在退火前后

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：β = 0.01 时，固定先验的 KL 占总损失 84.9%，可学先验只占 26.7%</summary>

按论文式 3 合计：

| | $\beta$ | $\beta \cdot \mathrm{KL}$ | 总损失 | KL 占比 |
|---|:--:|:--:|:--:|:--:|
| 可学先验 | 0.01 | 0.002736 | $0.0075 + 0.000017 + 0.002736 = 0.010253$ | 26.7% |
| 固定 $\mathcal{N}(0, I)$ | 0.01 | 0.042292 | $0.0075 + 0.000017 + 0.042292 = 0.049809$ | 84.9% |
| 可学先验 | 0.001（退火后） | 0.000274 | 0.007791 | 3.5% |
| 固定 $\mathcal{N}(0, I)$ | 0.001（退火后） | 0.004229 | 0.011746 | 36.0% |

（以下是笔记对这组玩具数字的解读。）用固定先验时，梯度大头来自 KL：编码器会被一直往原点拉，「腾空」与「站立」的 $z$ 挤在一起，解码器越来越分不清此刻该做什么，这就是 VIB 实验台里往 posterior collapse 那头滑。可学先验把参照点挪到当前状态附近，KL 只占小头，动作项主导学习。$\beta$ 退火则是在训练后期进一步把天平往「模仿得准」那边拨。

</details>

### 第 4 步：下游残差 z = μ^p + Δz

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：高层输出 Δz = (0.20, −0.10)，z = (1.55, −1.00)，离先验中心 0.224，仍在可行区里</summary>

训练完冻结 $D$ 和 $R$。下游某一帧人形还在空中：

1. 先验给出 $\mu^p = (1.35,\ -0.90)$；
2. 高层策略输出残差 $\Delta z = (0.20,\ -0.10)$（探索时在它的均值上加方差 0.22 的高斯噪声，标准差 $\sqrt{0.22} = 0.469$）；
3. $z = \mu^p + \Delta z = (1.55,\ -1.00)$；
4. 冻结的解码器把 $(s^p, z)$ 翻成 69 维 PD 目标。

$\lVert \Delta z \rVert = 0.224$，小于这个状态在演示里的可行半径 0.6，所以这一步做得出来；高层哪怕刚初始化、输出接近 0，$z$ 也就是先验中心——**第一步就是一个自然的动作**。

</details>

### 第 5 步：为什么「不用残差」只有 18.1%

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：刚初始化的高层直接输出 z ≈ 0，离腾空可行区中心 1.62，远在半径 0.6 之外</summary>

如果高层直接输出 $z$（表 3 第 5 行），刚初始化时输出接近 $(0, 0)$。在这个玩具设定里，$(0, 0)$ 离腾空可行区中心的距离是 $\sqrt{1.35^2 + 0.90^2} = 1.62$，远大于半径 0.6——高层一开始给出的几乎全是「这一刻做不出来」的 $z$，要先花大量样本摸到可行区在哪，而且可行区还随状态变化。

论文的说法是「潜空间太难直接采样」（5.4 节），VR 跟踪成功率 18.1%，对比用残差的 93.4%。残差形式把「哪里可行」交给先验，高层只学「往哪偏」。

</details>

「不再从零开始学怎么动」具体省了多少？下面这个演示把 32 维潜空间和 69 维关节空间的学习曲线放在一起，顺便看看高层残差拉太大时会发生什么：

<div class="paper-demo" data-demo="pulse-downstream"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 📊 实验结果怎么读

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（5 节）：模仿质量（表 1）/ VR 三点跟踪（表 2）/ 四个生成任务（图 4、5）/ 消融（表 3）/ 附录里的补充消融</summary>

**指标**（第 5 节）：成功率 Succ 指全程每个关节平均误差都小于 0.5 m；$E _ {\text{g-mpjpe}}$ / $E _ {\text{mpjpe}}$ 是全局 / 相对根节点的平均关节位置误差（mm）；$E _ {\text{acc}}$（mm/帧²）、$E _ {\text{vel}}$（mm/帧）是加速度、速度误差。真实数据没有全身真值，用三个跟踪点的全局误差 $E _ {\text{g-mhpe}}$。

<h3 id="pulse-结果-模仿质量表-1">模仿质量（表 1）</h3>

| 方法 | 训练集 Succ | 训练集 $E _ {\text{g-mpjpe}}$ | 测试集 Succ | 测试集 $E _ {\text{g-mpjpe}}$ |
|------|:--:|:--:|:--:|:--:|
| PHC | 98.9% | 37.5 | 97.1% | 47.5 |
| PHC+ | **100%** | **26.6** | **99.2%** | **36.1** |
| PULSE（蒸馏后的解码器） | 99.8% | 39.2 | 97.1% | 54.1 |

PULSE 保留了 PHC+ 绝大部分技能：说明冻结的解码器单靠一个 32 维 $z$ 就能复现绝大多数 AMASS 动作（5.1 节）。

<h3 id="pulse-结果-vr-三点跟踪表-2">VR 三点跟踪（表 2）</h3>

| 方法 | 训练集 Succ | 测试集 Succ | 测试集 $E _ {\text{g-mpjpe}}$ | 真实数据 Succ | 真实 $E _ {\text{g-mhpe}}$ |
|------|:--:|:--:|:--:|:--:|:--:|
| ASE-30Hz | 79.8% | 37.6% | 120.5 | 7/14 | 99.0 |
| ASE-6Hz | 74.2% | 33.3% | 136.4 | 4/14 | 114.7 |
| CALM-30Hz | 16.6% | 10.1% | 122.4 | 2/14 | 206.9 |
| CALM-6Hz | 14.6% | 10.9% | 147.6 | 0/14 | — |
| 从零训练 | 98.8% | 93.4% | **80.4** | 14/14 | **43.3** |
| **PULSE** | **99.5%** | **93.4%** | 88.6 | **14/14** | 68.4 |

- 真实数据来自 QuestSim 的 Quest 2 采集，14 段、16 分钟（第 5 节）。
- ASE / CALM 原本是 64 维球面 latent、6 Hz 的多帧 latent；PULSE 是逐帧 30 Hz，所以论文额外把它们也跑在 30 Hz 上比（第 5 节）。CALM 没加风格奖励，只用任务奖励训练。
- PULSE 和从零训练成功率打平，误差略大：论文的解读是用潜空间时会**牺牲一点精度换稳定**；三点跟踪本来就很接近全身跟踪，专门训练的策略精度更高是预期之中（5.2 节）。图 5：用 PULSE 的潜空间，训练成功率收敛更快。

<h3 id="pulse-结果-四个生成任务图-4图-5">四个生成任务（图 4、图 5）</h3>

- 速度、够点、击打、复杂地形四个任务，PULSE 的归一化回报都最高、收敛更快（3 个随机种子）。
- 30 Hz 的 ASE / CALM 普遍好于 6 Hz：说明需要更细粒度的潜空间控制。ASE 普遍好于 CALM，论文认为部分原因是 CALM 的运动编码器设计，没有风格奖励时探索受阻。
- 从零训练回报最接近 PULSE，但动作不自然。
- 复杂地形里有训练时没见过的障碍和楼梯，人形会用类似跳跃的动作快速上台阶——没有任何风格 / 对抗奖励引导（5.2 节）。

<h3 id="pulse-结果-消融表-3">消融（表 3，VR 跟踪，AMASS 测试集）</h3>

| 行 | 可学先验 | 残差动作 | $\mathcal{L} _ {regu}$ | 不混 RL | Succ | $E _ {\text{g-mpjpe}}$ |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| R1 | ✗ | ✗ | ✗ | ✓ | 36.9% | 114.6 |
| R2 | ✗ | ✗ | ✓ | ✓ | 45.6% | 115.0 |
| R3 | ✓ | ✓ | ✗ | ✓ | 60.8% | 106.8 |
| R4 | ✓ | ✓ | ✓ | ✗ | 71.0% | 95.1 |
| R5 | ✓ | ✗ | ✓ | ✓ | 18.1% | 108.6 |
| R6（完整） | ✓ | ✓ | ✓ | ✓ | **93.4%** | **88.6** |

论文观察到，生成任务对潜空间表达力不太敏感，VR 跟踪才敏感，所以消融都用 VR 跟踪做（5.4 节）。读法：R1→R2、R3→R6 看平滑项；R2→R6 看可学先验；R5→R6 看残差；R4→R6 看「混进 RL」的负作用。

<h3 id="pulse-结果-附录补充消融">附录里的补充消融</h3>

- **PHC+ 单个原语**（表 5）：SiLU + 训练中更新难例最好（98.5%），见上文第一步。
- **不蒸馏、直接 RL**（表 6）：训练集 72.0% / 测试集 32.6%，对比蒸馏的 99.8% / 97.1%。
- **其他潜空间形式**（C.3）：球面 100% / 28.1 mm，VQ 99.8% / 36.5 mm，模仿都不差，但随机采样采不出连贯动作。

</details>

---

## 🤖 PULSE 对人形机器人领域的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：从「对抗」转向「蒸馏」/ 覆盖率决定能不能做跟踪 / 「先验 + 残差」是通用模式 / 离真机还有多远</summary>

<h3 id="pulse-意义-1-从对抗转向蒸馏">1. 技能潜空间从「对抗」转向「蒸馏」</h3>

ASE → CALM 这条线靠判别器让潜空间长出来；PULSE 换成「先训一个什么都会的跟踪器，再蒸馏」，并用表 2、图 4 证明在 AMASS 规模上明显更好。本仓库后续收录的 [SLMP](../../13_Physics-Based_Animation/SLMP__Spherical_Latent_Motion_Prior_for_Physics-Based_Humanoid_Control/SLMP__Spherical_Latent_Motion_Prior_for_Physics-Based_Humanoid_Control.html) 同样是「先训跟踪专家、再蒸馏进潜空间」，并把 PULSE 当作 VAE 类基线来比。

<h3 id="pulse-意义-2-覆盖率决定能不能做跟踪">2. 覆盖率决定能不能做「自由形式跟踪」</h3>

速度、击打这类生成任务对潜空间不太挑（ASE / CALM 也能做）；VR 三点跟踪要求潜空间能接住任意用户输入，覆盖率不够就直接失败（表 2 里 CALM 只有 10% 左右）。这是论文用跟踪任务做消融的原因，也说明「通用」要靠跟踪类任务来检验。

<h3 id="pulse-意义-3-先验加残差是通用模式">3. 「可学先验 + 残差」是一个可迁移的模式</h3>

高层输出相对先验均值的偏移、而不是绝对的 latent，让刚初始化的高层就能产出自然动作（表 3：18.1% → 93.4%）。笔记认为这个设计和具体的 VAE 结构无关，任何「冻结低层 + 可学先验」的分层控制都可以借鉴（这是笔记的推断，论文只在 PULSE 上验证）。

<h3 id="pulse-意义-4-离真机还有多远">4. 离真机还有多远（笔记的判断）</h3>

论文全部在 Isaac Gym 里的 SMPL 人形上做，没有真机实验；人形有 69 维 PD 目标、500 N·m 力矩上限，和真实机器人的关节数、力矩、传感器都不同。把这套思路搬到真机，至少还需要重定向到机器人骨架、处理状态估计和 sim-to-real——这部分是笔记的推测，不是论文的结论。官方仓库后来放出的 PULSE-X（SMPL-X 人形）被用在 SMPLOlympics 中（仓库 README），也仍是仿真。

</details>

## ⚠️ 局限（论文第 6 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：有损压缩、跟踪精度不如专门训练、随机生成会卡在倒地或站立</summary>

- **有损压缩**：$\pi^{\text{PULSE}}$ 到不了 100% 模仿成功率；不加变分瓶颈的在线蒸馏可以到 100%。概率化建模带来好处，也带来额外困难。
- **跟踪精度**：VR 跟踪这类任务上，误差不如从零专门训练的策略（表 2）。
- **随机生成会卡住**：人形可能停在倒地或站立状态，加大输入噪声能把它「震」出来。
- **未来工作**：更可解释的表示、加入场景信息与人–物交互、加入手指。
- （笔记补充）只在仿真 SMPL 人形上验证；下游任务都是论文作者自己的设定，没有和 PACER、QuestSim 原文数字直接比。

</details>

---

## 📁 PULSE 官方源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（9 节）：论文概念 ↔ 官方路径对照表 / 源码运行时序图 / 编码器 / 先验 / 教师打标签 / 蒸馏损失 / 下游残差 / 论文 vs 源码差异表 / 命令与 MimicKit 关系</summary>

PULSE **不在 MimicKit 内**，官方实现为独立仓库 [ZhengyiLuo/PULSE](https://github.com/ZhengyiLuo/PULSE)，代码基于 PHC/IsaacGym 栈扩展。

| 论文概念 | 官方路径 | 说明 |
|----------|----------|------|
| 大规模模仿（阶段 1） | `phc/env/tasks/humanoid_im.py` | 跟踪 AMASS 多样动作 |
| VIB 潜空间蒸馏（阶段 2） | `phc/env/tasks/humanoid_im_distill.py`（命令里用的 `HumanoidImDistillGetup` 在 `humanoid_im_distill_getup.py`，再叠加爬起） | 每一步用冻结的教师给学生走到的状态打标签 |
| 编码器 / 解码器 / 先验 | `phc/learning/amp_network_z_builder.py` | `z_mlp` + `z_mu` / `z_logvar` 是编码器；actor MLP 吃 `[self_obs, z]` 是解码器；`z_prior` 是先验 |
| 本体感受先验 | `phc/learning/amp_network_z_builder.py` 的 `compute_prior()` | 以当前状态为条件的先验 $p(z\|s)$（`z_prior` MLP 输出均值与 log 方差）；同目录的 `ar_prior.py` 只是一个未被调用的 AR(1) 辅助类 |
| 蒸馏损失与 $\beta$ 退火 | `phc/learning/amp_agent.py` 的 `_optimize_kin()` | 动作误差 + $\beta$·KL + 相邻帧 AR(1) 平滑项（`ar1_coefficient: 0.005`，见 `env_im_vae.yaml`） |
| KL 闭式解 | `phc/learning/loss_functions.py` 的 `kl_multi()` | 两个对角高斯（用对数方差表示）之间的 KL |
| 下游残差 | `phc/env/tasks/humanoid_z.py` 的 `compute_z_actions()` | `action_z = prior_mu + action_z`，再交给冻结的解码器 |
| 下游任务配置 | `phc/data/cfg/learning/pulse_z_task.yaml` 等 | 击打、地形、VR 等任务 |

训练入口见仓库 `scripts/` 与 `phc/data/cfg/env/env_pulse_*.yaml`。

<h3 id="源码运行时序图">源码运行时序图</h3>

PULSE 复用 PHC 的代码栈，统一入口同样是 `phc/run_hydra.py`。README 给出的两条核心命令分别对应 **VIB 蒸馏**（阶段 2）和**下游任务训练**（阶段 3）；阶段 1 的模仿器直接使用训练好的 PHC 模型（`env.models=[phc_3, phc_comp_3]`）：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as run_hydra.py
    participant T as PHC 教师模仿器<br/>(冻结, humanoid_im)
    participant ENC as Encoder q(z|s, ref)
    participant PRI as 先验 p(z|s)<br/>(compute_prior)
    participant DEC as Decoder 低层策略
    participant S as IsaacGym 仿真
    Note over U,S: 阶段 2：VIB 蒸馏（env.task=HumanoidImDistillGetup env=env_im_vae learning=im_z_fit）
    U->>R: python phc/run_hydra.py env.task=HumanoidImDistillGetup env.models=[PHC 权重] env.motion_file=AMASS
    R->>T: 加载并冻结 PHC 教师（含 getup 恢复能力）
    loop 在线蒸馏（DAgger 式）
        S-->>ENC: 当前状态 s + 参考帧 ref
        ENC->>ENC: 采样 z ~ q(z|s, ref)（32 维）
        ENC->>DEC: z + s → 学生动作 a_student
        R->>T: 同一状态问教师 → a_teacher
        R->>R: 蒸馏损失 ‖a_student − a_teacher‖ + β·KL(q(z|s,ref) ‖ p(z|s)) + 相邻帧平滑项
        R->>PRI: 先验同步学习"当前状态下合理的 z 分布"
        DEC->>S: 学生动作驱动仿真，滚动收集新状态
    end
    Note over U,S: 阶段 3：下游任务（env.task=Humanoid*Z env=env_pulse_amp learning=pulse_z_task）
    U->>R: python phc/run_hydra.py env.task=HumanoidSpeedZ env.models=[pulse_vae 权重]
    R->>DEC: 冻结 Decoder + 先验，只训高层策略
    loop 每轮 rollout + PPO 更新
        S-->>R: 任务观测（目标速度 / 击打目标等）
        R->>PRI: 高层策略在 p(z|s) 基础上输出残差 → 得到 z
        PRI->>DEC: z + s → 动作
        DEC->>S: 仿真一步 → 任务奖励
        R->>R: PPO 只更新高层策略（32 维 z 空间，收敛远快于原始动作空间）
    end
</div>

- 阶段 2 对应表中 `humanoid_im_distill.py` + `amp_agent.py` + `compute_prior()`：**教师出动作、学生带信息瓶颈地模仿**，KL 项把 latent 压向"本体感受先验"，保证长序列滚动不发散。
- 阶段 3 对应 `amp_network_z_builder.py` + `pulse_z_task.yaml`：下游只在 32 维潜空间里探索，物理可行性由冻结的 Decoder 保底。

<h3 id="pulse-源码-1-编码器">1. 编码器：先出 5 × 32 维，再分成均值与对数方差</h3>

```python
# phc/learning/amp_network_z_builder.py —— _build_z_mlp() 与 form_embedding()（节选）
out_size = self.embedding_size * 5                      # z_type == "vae"：MLP 先输出 160 维
self.z_mu = nn.Linear(self.embedding_size * 5, self.embedding_size)       # → μ^e（32 维）
self.z_logvar = nn.Linear(self.embedding_size * 5, self.embedding_size)   # → log (σ^e)²

vae_mu, vae_log_var = self.z_mu(task_out_z), self.z_logvar(task_out_z)
vae_log_var = torch.clamp(vae_log_var, min=-5, max=self.vae_var_clamp_max)  # use_vae_clamped_prior
task_out_proj, self.z_noise = self.reparameterize(vae_mu, vae_log_var)      # 训练：μ + ε·σ
if flags.test:
    task_out_proj = vae_mu                                                    # 评估：只用均值
```

对应论文「训练时采样、评估时用 $\mu^e_t$」（4.2 节）。解码器是 actor MLP，输入拼成 `[self_obs, z]`，看不到目标状态。

<h3 id="pulse-源码-2-先验">2. 本体感受先验：只吃 self_obs</h3>

```python
# phc/learning/amp_network_z_builder.py —— compute_prior()
def compute_prior(self, obs_dict):
    obs = obs_dict['obs']
    self_obs = obs[:, :self.self_obs_size]          # 只取本体感受，不看目标
    prior_latent = self.z_prior(self_obs)
    prior_mu = self.z_prior_mu(prior_latent)
    if self.use_vae_prior:
        prior_logvar = self.z_prior_logvar(prior_latent)
        if self.use_vae_clamped_prior:
            prior_logvar = torch.clamp(prior_logvar, min=-5, max=self.vae_var_clamp_max)
        return prior_mu, prior_logvar
```

<h3 id="pulse-源码-3-教师打标签">3. 教师打标签，学生动作驱动仿真</h3>

```python
# phc/env/tasks/humanoid_im_distill.py —— step()（节选）
with torch.no_grad():
    full_obs = torch.clamp(torch.cat([self_obs, task_obs], dim=-1), min=-5.0, max=5.0)
    _, pnn_actions = self.pnn(full_obs)              # PHC+ 的 3 个原语各出一个动作
    x_all = torch.stack(pnn_actions, dim=1)
    weights = self.composer(full_obs)                # 组合器给出权重
    gt_action = torch.sum(weights[:, :, None] * x_all, dim=1)
    self.kin_dict['gt_action'] = gt_action.squeeze() # 存成标签
self.pre_physics_step(actions)                       # 执行的是学生自己的动作（DAgger）
```

<h3 id="pulse-源码-4-蒸馏损失">4. 蒸馏损失：动作 + β·KL + AR(1) 平滑 + 小正则</h3>

```python
# phc/learning/amp_agent.py —— _optimize_kin()（节选）
kin_action_loss = torch.norm(pred_action - gt_action, dim=-1).mean()   # 不平方的 L2 范数
prior_mu, prior_log_var = self.model.a2c_network.compute_prior(batch_dict)
KLD = kl_multi(vae_mu, vae_log_var, prior_mu, prior_log_var).mean()

time_zs = vae_mu.view(self.minibatch_size // self.horizon_length, self.horizon_length, -1)
phi = 0.99
error = time_zs[:, 1:] - time_zs[:, :-1] * phi                          # AR(1)：z_t − 0.99·z_{t−1}
# ……跨回合边界、回合开头几帧的 error 置 0……
ar1_prior = torch.norm(error, dim=-1).mean()

kin_loss = kin_action_loss + KLD * kld_coefficient + ar1_prior * ar1_coefficient + regu_prior * 0.005

if humanoid_env.kld_anneal:                       # β 退火：epoch 2500 → 5000，0.01 → kld_coefficient_min
    anneal_start_epoch, anneal_end_epoch = 2500, 5000
    kld_coefficient = (0.01 - min_val) * max((anneal_end_epoch - self.epoch_num) / (anneal_end_epoch - anneal_start_epoch), 0) + min_val
```

```python
# phc/learning/loss_functions.py —— 对角高斯 KL（qv / pv 是对数方差）
def kl_multi(qm, qv, pm, pv):
    element_wise = 0.5 * (pv - qv + qv.exp() / pv.exp() + (qm - pm).pow(2) / pv.exp() - 1)
    return element_wise.sum(-1)
```

`kl_multi` 与上文的闭式解等价：$\tfrac{1}{2}(\ln\sigma_p^2 - \ln\sigma_e^2) = \ln(\sigma_p/\sigma_e)$，$\tfrac{1}{2}\sigma_e^2/\sigma_p^2 + \tfrac{1}{2}(\mu_e-\mu_p)^2/\sigma_p^2$ 就是中间那一项。

<h3 id="pulse-源码-5-下游残差">5. 下游残差：先验均值 + 高层输出</h3>

```python
# phc/env/tasks/humanoid_z.py —— compute_z_actions()（节选）
with torch.no_grad():
    self_obs = (self.obs_buf[:, :self_obs_size] - self.running_mean[:self_obs_size]) / torch.sqrt(self.running_var[:self_obs_size] + 1e-05)
    if self.use_vae_prior:
        z_prior_out = self.decoder.z_prior(self_obs)
        prior_mu = self.decoder.z_prior_mu(z_prior_out)
        action_z = prior_mu + action_z                          # 论文式 4
    self_obs = torch.clamp(self_obs, min=-5.0, max=5.0)
    actions = self.decoder.decoder(torch.cat([self_obs, action_z], dim=-1))  # 冻结的解码器
```

<h3 id="pulse-源码-6-论文-vs-源码差异表">6. 论文 vs 源码差异表</h3>

| 项 | 论文 | 官方源码 |
|----|------|----------|
| 动作项 | $\lVert a^{\text{PHC+}} - a \rVert_2^2$（式 3） | `torch.norm(pred - gt, dim=-1).mean()`，不平方 |
| 平滑项 | $\lVert \mu^e_t - \mu^e _ {t-1} \rVert_2^2$，$\alpha = 0.005$ | $\lVert \mu^e_t - 0.99\,\mu^e _ {t-1} \rVert$，`ar1_coefficient: 0.005`，跨回合与回合开头置零 |
| 额外正则 | 无 | `use_vae_prior_regu` 打开时，对先验与编码器的均值、对数方差平方各乘 0.001 再乘 0.005 |
| $\beta$ 退火 | $2.5 \times 10^9 \to 5 \times 10^9$ 样本，0.01 → 0.001 | epoch 2500 → 5000 线性，0.01 → `kld_coefficient_min: 0.001` |
| 方差 | 对角高斯 | 对数方差夹在 $[-5, 2]$ |
| 下游探索 | 固定方差 0.22 | `pulse_z_task.yaml` 里 `fixed_sigma: True`、`sigma_init: -1`（rl_games 的约定，笔记未逐一核对它与 0.22 的换算） |

<h3 id="pulse-源码-7-关键配置">7. 关键配置（env_im_vae.yaml）</h3>

```yaml
embedding_size: 32          # z 的维度
z_type: vae
use_vae_prior: True         # 可学先验
use_ar1_prior: True         # 平滑项
use_vae_clamped_prior: True
vae_var_clamp_max: 2
kld_coefficient: 0.01       # β 初值
kld_coefficient_min: 0.001  # β 退火终值
kld_anneal: True
ar1_coefficient: 0.005      # α
controlFrequencyInv: 2      # 30 Hz（仿真 60 Hz）
distill_model_config:
  num_prim: 3               # PHC+ 的 3 个原语
```

<h3 id="pulse-源码-8-训练与测试命令">8. 训练与测试命令（README）</h3>

```bash
# 阶段 2：从 PHC+（3 原语 + 组合器）蒸馏出 PULSE
python phc/run_hydra.py env.task=HumanoidImDistillGetup env=env_im_vae exp_name=pulse_vae \
  robot.real_weight_porpotion_boxes=False learning=im_z_fit \
  env.models=['output/HumanoidIm/phc_3/Humanoid_00258000.pth','output/HumanoidIm/phc_comp_3/Humanoid_00023501.pth'] \
  env.motion_file=[insert data pkl]

# 阶段 3：下游任务（速度；Reach / Strike / Terrain / VR 换 env.task 与 learning）
python phc/run_hydra.py env.task=HumanoidSpeedZ env=env_pulse_amp exp_name=pulse_speed \
  robot.real_weight_porpotion_boxes=False learning=pulse_z_task \
  env.models=['output/HumanoidIm/pulse_vae_iclr/Humanoid.pth'] \
  env.motion_file=sample_data/amass_isaac_simple_run_upright_slim.pkl
```

<h3 id="mimickit-关系">MimicKit 关系</h3>

> ❌ MimicKit 仅覆盖 ASE（`ase_agent.py`）等对抗潜空间方法，**未实现 PULSE 的 VIB 蒸馏与 proprioceptive prior**。读 PULSE 请直接用官方仓库；读 ASE 对照可用 MimicKit `docs/README_ASE.md`。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（7 问）：和 ASE / CALM 的区别 / 为什么要 VIB / 为什么先验要可学 / 为什么蒸馏不用 RL / 残差动作 / 平滑项 / 局限</summary>

<h3 id="pulse-q1-和-ase-calm-的核心区别">Q1: PULSE 与 ASE / CALM 的核心区别？</h3>

ASE、CALM 用判别器 / 编码器奖励，靠对抗训练让潜空间长出来，在小而专门的数据上有效；PULSE 先训一个跟住 100% AMASS 的教师 PHC+，再用监督方式在线蒸馏进 32 维概率潜空间，并学一个以本体感受为条件的先验。AMASS 上 VR 跟踪测试集成功率：ASE-30Hz 37.6%、CALM-30Hz 10.1%、PULSE 93.4%（表 2）。另外 ASE / CALM 是 6 Hz 的多帧 latent，PULSE 是逐帧 30 Hz。

<h3 id="pulse-q2-为什么需要-vib">Q2: 为什么需要 VIB，不直接蒸馏一个确定性的 z？</h3>

不加瓶颈的蒸馏能做到 100%（5.1 节），但那样的潜空间只是「背下来」，随机采样采不出连贯动作，也没有先验可供下游采样。VIB 用 KL 把 $z$ 的分布拉向先验，让潜空间可采样、可探索；代价是有损压缩（训练集 100% → 99.8%）。$\beta$ 从 0.01 退火到 0.001 来平衡两者。

<h3 id="pulse-q3-为什么先验要以本体感受为条件">Q3: 为什么先验要以本体感受为条件？</h3>

站着和空中翻跟头时合理的动作分布完全不同（4.2 节）。固定 $\mathcal{N}(0, I)$ 会逼编码器把所有状态的 $z$ 往原点挤；换成固定先验，下游 VR 跟踪从 93.4% 掉到 45.6%（表 3）。球面 / VQ 潜空间能模仿，但随机采样不连贯（附录 C.3）。

<h3 id="pulse-q4-为什么用在线蒸馏而不是-rl">Q4: 为什么用在线蒸馏（DAgger）而不是 RL 训潜空间？</h3>

VIB 的采样噪声和 RL 的探索噪声叠在一起，梯度太嘈杂（附录 C.2 的推测）。只用 RL：训练集 72.0% / 测试集 32.6%（表 6）；RL + 蒸馏混用：下游 93.4% → 71.0%（表 3）。DAgger 式蒸馏让学生自己滚状态、教师在这些状态上打标签，学生能学会从自己的错误里恢复。

<h3 id="pulse-q5-下游为什么输出残差">Q5: 下游高层为什么输出相对先验均值的残差？</h3>

式 4：$z = \mu^p + \Delta z$。高层刚初始化、输出接近 0 时，$z$ 就是先验中心，人形一开始就做自然动作；直接输出 $z$ 时潜空间太难采样，VR 跟踪只有 18.1%（表 3）。探索方差固定 0.22，因为 $\sigma^p$ 往往太小。

<h3 id="pulse-q6-相邻帧平滑项的作用">Q6: 相邻帧平滑项 $\mathcal{L} _ {regu}$ 数值很小，为什么还重要？</h3>

它的作用对象不是单帧损失，而是潜空间的连续性：不加时可学先验会把相近状态的 latent 推得很远，下游探索时 $z$ 挪一点动作就跳很多。去掉它 VR 跟踪 93.4% → 60.8%（表 3）。论文把它比作 NPMP 的 AR(1) 先验；官方源码也确实写成 AR(1) 形式（$\phi = 0.99$）。

<h3 id="pulse-q7-局限">Q7: PULSE 的主要局限？</h3>

有损压缩（到不了 100%）；VR 跟踪精度不如专门训练的策略；随机生成可能卡在倒地或站立；没有场景、物体交互和手指（第 6 节）。全部是仿真 SMPL 人形，没有真机。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：A. 与路线图其他论文的关联 / B. 超参数速查 / C. 与相关潜空间方法对比 / D. 参考来源</summary>

<h3 id="a-与路线图其他论文的关联">A. 与路线图其他论文的关联</h3>

| 论文 | 关系 |
|------|------|
| [PHC](../PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html) | PULSE 的教师 PHC+ 就是它的改进版（数据清洗、渐进训练、SiLU + 6 层 MLP） |
| [AMP](../AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html) | PHC+ 的奖励里有一半是 AMP 判别器奖励 |
| [ASE](../ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control.html) | 提供对抗技能潜空间基础；PULSE 在 AMASS 上把它当基线 |
| [CALM](../CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.html) | 引入条件引导，使潜空间可导向；同样是 PULSE 的基线 |
| **PULSE** | 实现全量数据覆盖，构建通用的运动表示"基础" |
| [SLMP](../../13_Physics-Based_Animation/SLMP__Spherical_Latent_Motion_Prior_for_Physics-Based_Humanoid_Control/SLMP__Spherical_Latent_Motion_Prior_for_Physics-Based_Humanoid_Control.html) | 同样「先训跟踪专家、再蒸馏进潜空间」，换成球面潜空间，并以 PULSE 为 VAE 类基线 |
| [BeyondMimic](../BeyondMimic/BeyondMimic.html) | 阶段 2 也先训 VAE 潜空间再在上面做扩散；笔记里把 PULSE 列为「条件生成需要显式目标」的一类 |

<h3 id="pulse-附录-b-超参数速查">B. 超参数速查（表 4 + 官方配置）</h3>

| 项 | PHC+ | PULSE 蒸馏 | 下游任务 |
|----|------|-----------|----------|
| 批量 | 3072 | 3072 | — |
| 学习率 | $2 \times 10^{-5}$ | $5 \times 10^{-4}$ | — |
| 策略方差 / 探索 | 固定 0.05 | — | 固定 0.22 |
| $\gamma$ / PPO clip | 0.99 / 0.2 | — | PPO |
| 关键系数 | 模仿权重 0.5 / 0.3 / 0.1 / 0.1 | $\alpha = 0.005$，$\beta$: 0.01 → 0.001 | — |
| 潜空间 | — | 32 维 | 32 维残差 |
| 网络 | 6 层 MLP $[2048, 1536, 1024, 1024, 512, 512]$，SiLU | $E$ / $R$：$[1536, 1024, 512]$；$D$：$[3096, 2048, 1024]$（`im_z_fit.yaml`） | 生成任务 $[2048, 1024, 512]$；VR 6 层 |
| 样本量 | 约 $10^{10}$ | 约 $10^9$（表 4；与 C.1 的退火区间对不上，见上文） | 简单任务约 $2 \times 10^9$，地形约 $10^{10}$ |
| 频率 | 策略 30 Hz / 仿真 60 Hz | 同左 | 同左 |

<h3 id="pulse-附录-c-与相关潜空间方法对比">C. 与相关潜空间方法对比（依据论文第 2 节与实验）</h3>

| 方法 | 潜空间怎么来 | 是否物理仿真 | 数据规模 | 先验 |
|------|--------------|:--:|----------|------|
| ASE / CALM | 判别器 / 编码器奖励，对抗训练 | ✓ | 小而专门 | 单位球面均匀 |
| NPMP | 蒸馏专家到潜空间 | ✓ | 中等 | AR(1) |
| ControlVAE / PhysicsVAE | 跟踪目标 + 额外学一个世界模型 | ✓ | 中等 | VAE 先验 |
| HuMoR | 运动学数据上的逐帧条件 VAE | ✗ | AMASS | 可学条件先验 |
| **PULSE** | 在线蒸馏 PHC+ + VIB | ✓ | **全部 AMASS** | **可学条件先验 + 残差** |

论文说 PULSE 的形式最接近 HuMoR，但多了控制动力学：随机采样时受物理约束，不会像 HuMoR 那样常常生成不可行的动作（第 2 节、5.3 节）。

<h3 id="d-参考来源">D. 参考来源</h3>

- [arXiv:2310.04582](https://arxiv.org/abs/2310.04582)（v2 正文与附录 B、C：PHC+ 细节、表 4 超参数、表 5 / 6 消融、C.3 其他潜空间、C.4 下游任务定义）
- [项目主页 zhengyiluo.github.io/PULSE](https://zhengyiluo.github.io/PULSE/)
- [官方仓库 ZhengyiLuo/PULSE](https://github.com/ZhengyiLuo/PULSE)：`amp_network_z_builder.py`、`amp_agent.py`、`loss_functions.py`、`humanoid_im_distill.py`、`humanoid_z.py`、`env_im_vae.yaml`、`im_z_fit.yaml`、`pulse_z_task.yaml`、README
- 「具体实例」里的数字是玩具设定，「意义」一节中标注为笔记判断 / 推测的内容不是论文结论

</details>
