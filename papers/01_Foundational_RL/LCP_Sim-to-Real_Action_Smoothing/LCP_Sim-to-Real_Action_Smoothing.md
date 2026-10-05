---
layout: paper
paper_order: 15
title: "Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies (LCP)"
category: "Sim-to-Real"
zhname: "LCP：用 Lipschitz 约束策略学习平滑的人形行走"
demos: ["lcp"]
---

# Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies (LCP)
**把「动作要平滑」写成对策略的 Lipschitz 约束，再化成一项可微的梯度惩罚 $\lambda _ {gp}\,\mathbb{E}\lVert\nabla_s\log\pi(a \mid s)\rVert^2$：不用平滑奖励、不加低通滤波，几行代码、一个系数 0.002，四台人形机器人的行走策略都零样本上了真机。**

> 📅 阅读日期: 2026-04-06（2026-10-05 对照 arXiv v1–v3 全文与官方代码重核，补十幕动画、三个交互演示与配音视频）
>
> 🏷️ 板块: 01_Foundational_RL / Sim-to-Real（推荐路线 Domain Randomization → LCP → ASAP）
>
> 🧭 状态: 已对照 [arXiv:2410.11825v3](https://arxiv.org/abs/2410.11825v3) 正文与附录、官方仓库 [zixuan417/smooth-humanoid-locomotion](https://github.com/zixuan417/smooth-humanoid-locomotion) 的训练代码与配置。v3 比 v1 / v2 多了附录 A–C（ROA 损失式 8、奖励课程、训练细节与表 IV），正文与表格三版相同。旧版笔记有三处和原文 / 代码对不上，已改正：**① 罚的是 $\nabla_s\log\pi(a \mid s)$**，不是 $\nabla_o\pi(o)$；**② 官方代码用 Adam**（学习率 2e-4、按 KL 自适应），「SGD、1e-4」是 MimicKit 所有智能体的默认，不是 LCP 的要求；**③ 抖动在仿真里就测得到**（表 I 的不平滑策略抖动 42.19），问题是理想电机不罚它，不是「仿真测不出来」。细节见[附录 B](#b-旧版笔记的改正与-v1v3-的差异)。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2410.11825](https://arxiv.org/abs/2410.11825)（v1 2024-10-15、v2 2024-10-16、v3 2024-10-28，8 页） |
| **PDF** | [arxiv.org/pdf/2410.11825](https://arxiv.org/pdf/2410.11825) |
| **项目页** | [lipschitz-constrained-policy.github.io](https://lipschitz-constrained-policy.github.io/) |
| **代码** | [zixuan417/smooth-humanoid-locomotion](https://github.com/zixuan417/smooth-humanoid-locomotion)（官方：Isaac Gym 训练 GR1T1 / GR1T2 / H1 / Berkeley Humanoid / G1、MuJoCo sim-to-sim、GR1T2 真机部署，基于 legged_gym + rsl_rl）<br>[xbpeng/MimicKit](https://github.com/xbpeng/MimicKit)（`lcp_agent.py`：把同一项损失接到 DeepMimic 式动作跟踪上） |
| **作者** | Zixuan Chen\*, Xialin He\*, Yen-Jen Wang\*, Qiayuan Liao, Yanjie Ze, Zhongyu Li, S. Shankar Sastry, Jiajun Wu, Koushil Sreenath, Saurabh Gupta, Xue Bin Peng（\* 同等贡献） |
| **机构** | Simon Fraser University、UIUC、UC Berkeley、Stanford University、NVIDIA |
| **会议** | IROS 2025（官方仓库 README 的标注；arXiv 页面只写了 8 pages） |
| **机器人** | Fourier GR1T1 / GR1T2、Unitree H1、Berkeley Humanoid |

---

## 🎯 一句话总结

仿真里的电机近乎理想，强化学习策略容易学成 bang-bang 式的抖动；常见的两种补救 —— 平滑奖励和低通滤波 —— 都要逐台调参、而且不可微。LCP 的做法是**直接约束策略本身**：要求策略关于输入的 Lipschitz 常数有上界，用「梯度有界 ⇒ Lipschitz 连续」把约束写成 $\lVert\nabla_s\log\pi(a \mid s)\rVert^2 \le K^2$，再经期望近似、拉格朗日松弛、固定系数三步，变成训练目标里多出的一项梯度惩罚。它不比平滑奖励更「平」多少，卖点是**简单、可微、通用**：仿真里平滑程度和平滑奖励相当、任务回报相近（表 I），四台人形用同一个系数 $\lambda _ {gp} = 0.002$ 零样本上了真机。

> 🎮 **本文内嵌 1 段讲解动画 + 1 段配音视频 + 3 个交互演示**（不用装任何东西）：
> 1. [十幕动画：LCP 全流程](#lcp-explainer-anim) —— 约 170 秒串完「仿真里的理想电机 → Lipschitz：给斜率设上限 → 从「别太陡」到「陡了就罚」 → 罚的到底是什么：均值的斜率 → 几行代码接进 PPO → 观测、ROA 与罚整段输入 → 命令、奖励与课程 → 三种平滑办法 → $\lambda _ {gp}$ 扫一遍 → 四台真机与局限」
> 2. [配音讲解视频](#lcp-video) —— 同样十幕，加中文配音与字幕，9 分 52 秒竖屏，可下载
> 3. [Lipschitz 圆锥演示](#lcp-lipschitz) —— 拖动 $K$ 和观测噪声，看图 2 的圆锥、动作抖动的上界 $K\sigma$，以及式 4「最大斜率」和式 5「期望」差多少（玩具模型）
> 4. [$\log\pi$ 梯度演示](#lcp-logpi) —— 高斯策略上 $\mathbb{E}\lVert\nabla_s\log\pi\rVert^2 = \lVert J\rVert_F^2/\sigma^2$：拖样本数看单个样本怎么收敛到期望（两维玩具算例）
> 5. [论文表格浏览器](#lcp-experiments) —— 表 I(a)(b)(c)、表 II、表 III 的六项指标与「抖动 × 回报」散点

> 🚶 [具体实例](#实例-环境设定)手算观测维度、Lipschitz 上界、最大值与期望、高斯策略上的梯度、系数表、奖励课程、表 I 三组的比例、训练量和真机表格；动画、三个演示和这一节用的是同一组数。[源码对照](#源码对照)把官方代码里 GP、ROA、观测、配置与 MimicKit 的实现逐段对上论文。

---

## 🔤 英文缩写速查

| 缩写 | 全称 | 在这篇论文里指什么 |
|------|------|-------------------|
| **LCP** | Lipschitz-Constrained Policies | 本文方法：对策略加 Lipschitz 约束 |
| **GP** | Gradient Penalty | 梯度惩罚，式 7 里 $\lambda _ {gp}$ 乘的那一项 |
| **PPO** | Proximal Policy Optimization | 主优化算法 |
| **ROA** | Regularized Online Adaptation | 用观测历史在线估计环境潜向量的 sim-to-real 框架（附录式 8） |
| **TRPO** | Trust Region Policy Optimization | 论文借它「用期望代替最大值」的近似 |
| **WGAN-GP** | Wasserstein GAN with Gradient Penalty | 梯度惩罚最早用来稳定 GAN 判别器 |
| **DoF** | Degree of Freedom | 自由度 / 关节 |
| **jitter** | — | 抖动指标：动作或关节位置对时间的三阶导 |
| **PD** | Proportional-Derivative | 把目标关节角转成力矩的控制器 |

---

## 🎬 十幕动画：LCP 全流程 {#lcp-explainer-anim}

<div class="paper-demo" data-demo="lcp-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#lcp-video}

<div class="paper-demo" data-demo="lcp-video" data-src="media/lcp_explainer_video.mp4" data-poster="media/lcp_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/lcp_explainer_video.mp4" download="LCP_讲解视频.mp4">下载 mp4（11.1 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：问题、方法、训练设置按小节收起，具体实例、实验、边界、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；三个交互演示和两张流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：仿真里的理想电机让策略学成 bang-bang；平滑奖励和低通滤波都要逐台调、都不可微</summary>

**仿真太理想**（引言）：仿真器的动力学和执行器模型是简化的，电机「在任何状态下都能给出想要的力矩」。于是仿真里训出来的强化学习策略容易学成类似 bang-bang 控制的抖动（论文引 LaSalle 1960 的 bang-bang 原理）：相邻两步的动作相差很大，需要的力矩真机电机给不出来，这类行为往往迁移失败。

注意这不是「仿真里看不出抖动」：论文表 I 就是在 Isaac Gym 里测的，不加任何平滑的策略动作抖动 42.19，是 LCP（3.21）的 13 倍，任务回报反而最高（28.87）。仿真不罚抖动，理想电机照单全收。

**两种常见补救**（引言、相关工作 b）：

| 办法 | 怎么做 | 论文指出的问题 |
|------|--------|---------------|
| 平滑奖励 | 在奖励里罚动作突变、关节速度、关节加速度、能耗 | 权重要和任务奖励仔细配平，换一台机器人往往要重来；藏在环境里，**不可微**，只能靠策略梯度这类采样估计去优化 |
| 低通滤波 | 策略输出先过滤波器再送给机器人 | 常会**压抑探索**，训出次优策略；同样不可微 |

上一期 [OP3 足球](../../03_High_Impact_Selection/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.html)用的就是输出端的指数滤波 $u_t = 0.8\,u _ {t-1} + 0.2\,a_t$；[真实世界人形行走](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)用的是奖励里罚关节目标的一阶、二阶差分。

**LCP 想要的**：一个通用、可微、几行代码就能接进现有强化学习框架的平滑目标，让策略自己学会平滑，同一个系数能用在形态不同的多台人形上。

> 💡 **类比（整理者的）**：平滑奖励像给司机开罚单，低通滤波像在方向盘后面装阻尼器，LCP 是直接训练一个手更稳的司机。
</details>

---

## 🔧 LCP 是怎么做的？

### 1. Lipschitz 连续：给斜率设上限 {#lcp-lipschitz}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：式 1 的定义、图 2 的圆锥、式 2 的推论，以及图 3 的动机实验</summary>

**定义**（第 III-A 节，式 1）：度量空间 $(X, d_X)$ 到 $(Y, d_Y)$ 的函数 $f$，若存在常数 $K$ 使所有 $x_1, x_2$ 都满足

$$
d_Y\big(f(x_1), f(x_2)\big) \le K\, d_X(x_1, x_2),
$$

就说 $f$ 是 Lipschitz 连续的，$K$ 叫 Lipschitz 常数。直觉上它限制函数最快能变多快；图 2 的画法是以曲线上任一点为顶点画斜率 $\pm K$ 的圆锥，整条曲线都落在圆锥里。

**推论**（式 2）：梯度处处有界 $\lVert\nabla_x f(x)\rVert \le K$，函数就是 $K$-Lipschitz 的。论文特意说明**反过来不成立**（Lipschitz 函数可以有不可导的点，比如 $\lvert x\rvert$ 在 0 处）。

**对策略意味着什么**：观测变化 $\Delta o$，动作最多变化 $K\lVert\Delta o\rVert$。观测里有噪声、状态在变，$K$ 越大，动作被放大得越厉害（这是整理者用来理解的说法，论文没有写这个乘法）。

**动机实验**（第 IV-A 节，图 3）：比较有、无平滑奖励训出的策略的梯度 $\ell_2$ 范数。虽然没有任何技术专门约束梯度，加了平滑奖励的策略梯度明显更小。论文由此想到：**直接去约束策略的梯度**。图 3 只画了曲线，纵轴没有数值。

下面的演示用一维玩具策略 $\pi(o) = o + b\sin(\omega o)$（最大斜率 $K = 1 + b\omega$）把「斜率 = 放大倍数」画出来：
</details>

<div class="paper-demo" data-demo="lcp-sensitivity"><p class="demo-fallback">（本节含交互演示：Lipschitz 圆锥与动作抖动上界，需要启用 JavaScript）</p></div>

---

### 2. 从约束到梯度惩罚：式 4 → 式 7

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四步推导 —— 最大值约束、换成期望、拉格朗日松弛、固定系数</summary>

论文第 IV-B 节的推导只有四步：

**式 4：约束优化**。最大化强化学习目标 $J(\pi) = \mathbb{E} _ {p(\tau \mid \pi)}\big[\sum_t \gamma^t r_t\big]$（式 3），约束策略的梯度在所有状态、动作上都有界：

$$
\max_\pi J(\pi) \quad \text{s.t.} \quad \max_{s,a}\big[\lVert\nabla_s\log\pi(a \mid s)\rVert^2\big] \le K^2
$$

注意约束的是**对数概率** $\log\pi(a \mid s)$ 对状态的梯度，不是动作均值的梯度（第 3 节专门讲这有什么区别）。

**式 5：用期望代替最大值**。所有状态上的最大值算不出来，按 TRPO（Schulman 等）的启发式换成 rollout 数据集 $\mathcal{D}$ 上的期望：

$$
\max_\pi J(\pi) \quad \text{s.t.} \quad \mathbb{E} _ {s,a\sim\mathcal{D}}\big[\lVert\nabla_s\log\pi(a \mid s)\rVert^2\big] \le K^2
$$

这一步其实把「全局 Lipschitz」放宽成了「访问到的状态上，平均斜率不大」。

**式 6：拉格朗日松弛**。引入乘子 $\lambda \ge 0$，把约束搬进目标：

$$
\min_{\lambda \ge 0}\max_\pi\; J(\pi) - \lambda\Big(\mathbb{E} _ {s,a\sim\mathcal{D}}\big[\lVert\nabla_s\log\pi(a \mid s)\rVert^2\big] - K^2\Big)
$$

**式 7：固定系数**。不去学 $\lambda$，改成手动设定的 $\lambda _ {gp}$；$K^2$ 是常数、不影响最优解，丢掉：

$$
\max_\pi\; J(\pi) - \lambda _ {gp}\,\mathbb{E} _ {s,a\sim\mathcal{D}}\big[\lVert\nabla_s\log\pi(a \mid s)\rVert^2\big]
$$

这就是 LCP 的全部：一项**可微**的梯度惩罚，能和 PPO 的损失一起用自动微分反向传播；论文所有实验 $\lambda _ {gp} = 0.002$。和平滑奖励、低通滤波相比，它不藏在环境或信号链里，对策略参数直接可导。

**梯度惩罚的来历**（相关工作 c）：WGAN 用权重裁剪稳定训练，效果和收敛都不好；WGAN-GP 改成惩罚判别器梯度的范数，之后成了 GAN 的常用正则。动作控制里 [AMP](../AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html)、CALM、ASE 都对对抗判别器加梯度惩罚；LCP 把同样的正则从**判别器**搬到了**策略**上。
</details>

---

### 3. 罚的是 $\log\pi$ 的梯度：在高斯策略上它等于什么 {#lcp-logpi}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：对角高斯策略上 E‖∇ₛ log π‖² = ‖J‖²_F / σ²（整理者的推导）与它的两个推论</summary>

论文没有展开这一步，下面是整理者按式 7 推的。PPO（rsl_rl）的策略是对角高斯：均值 $\mu_\theta(s)$ 由网络给出，标准差 $\sigma$ 是与状态无关的可学习参数。记 $J = \partial\mu/\partial s$（均值对状态的雅可比），则

$$
\log\pi(a \mid s) = -\frac{\lVert a - \mu_\theta(s)\rVert^2}{2\sigma^2} + C
\quad\Rightarrow\quad
\nabla_s\log\pi(a \mid s) = \frac{J^\top\big(a - \mu_\theta(s)\big)}{\sigma^2}.
$$

$a - \mu$ 的协方差是 $\sigma^2 I$，对动作取期望：

$$
\mathbb{E} _ {a\sim\pi}\lVert\nabla_s\log\pi(a \mid s)\rVert^2 = \frac{\mathrm{tr}(JJ^\top)}{\sigma^2} = \frac{\lVert J\rVert_F^2}{\sigma^2}.
$$

（各维标准差不同时是 $\sum_i \lVert\nabla_s\mu_i\rVert^2/\sigma_i^2$。）

**推论一：罚的其实是均值的斜率**，按 $1/\sigma^2$ 加权。所以「约束 $\log\pi$ 的梯度」和「约束动作均值的 Lipschitz 常数」在高斯策略上是一回事，只差一个与探索噪声有关的权重。官方代码 GR1 的初始标准差是 0.1–0.4（不同关节不同），$1/\sigma^2$ 在 6.25 到 100 之间。

**推论二：训练时每个状态只有一个动作**。$\mathcal{D}$ 里的 $(s, a)$ 来自 rollout，每个状态只采过一个动作，单个样本的 $\lVert\nabla_s\log\pi\rVert^2$ 是一个带噪的估计，一个 minibatch 平均以后才接近 $\lVert J\rVert_F^2/\sigma^2$。具体数字见[实例第 4 步](#实例-第-4-步高斯策略的梯度)。

**一个顺带的效应（推测，论文没讨论）**：罚的值随 $\sigma$ 增大而变小，所以当 $\sigma$ 可学习时，GP 也给了 $\sigma$ 一点往大推的力。MimicKit 把 $\sigma$ 固定为 0.05，就没有这个效应。
</details>

<div class="paper-demo" data-demo="lcp-gp"><p class="demo-fallback">（本节含交互演示：高斯策略上 ∇ log π 的平方范数与它的样本平均，需要启用 JavaScript）</p></div>

---

### 4. 训练设置：观测、命令、动作、ROA

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：第 V 节的观测与特权信息、速度命令、PD 动作、PPO + 域随机化 + ROA，附录式 8</summary>

**任务**：所有机器人都是「按转向命令走」（第 V 节）。

**观测**（第 V 节 a）：$o_t = [\phi_t, c_t, s_t^{\mathrm{robot}}, a _ {t-1}]$ —— 2 维步态相位 $\phi_t$（周期时钟的正弦、余弦）、速度命令 $c_t$、测得的关节位置和速度、上一步的动作。为了 sim-to-real，策略还输入**特权信息** $e_t$：机身质量、质心、电机强度、机身线速度。观测进网络前用滑动均值和标准差归一化。按 GR1 的公开代码逐项相加：当前本体 71 维、特权 50 维、10 步历史 710 维，共 831 维（[实例第 1 步](#实例-第-1-步观测维度)）。

**命令**（第 V 节 b）：$c_t = [v_x^{\mathrm{cmd}}, v_y^{\mathrm{cmd}}, v _ {yaw}^{\mathrm{cmd}}]$，$v_x \in [0, 0.8]$ m/s、$v_y \in [-0.4, 0.4]$ m/s、$v _ {yaw} \in [-0.6, 0.6]$ rad/s，机器人坐标系；训练时每 150 步或环境重置时重抽一次。

**动作**（第 V 节 c）：所有关节的目标角度，经人工设定增益的 PD 控制器转成力矩。

**训练**（第 V 节 d）：PPO；只在仿真里训练、带域随机化，直接部署到真机；sim-to-real 用 **ROA**（Regularized Online Adaptation）。附录 C：Isaac Gym、4096 个并行环境。

**ROA 与 GP 一起的损失**（附录 A，式 8–9）：编码器 $\mu$ 把特权信息 $e$ 压成环境潜向量 $z_\mu$，适应模块 $\phi$ 只看最近的本体观测历史去估它，得 $z_\phi$：

$$
L(\theta_\pi, \theta_\mu, \theta_\phi) = -L _ {PPO}(\theta_\pi, \theta_\mu) + \lambda\,\big\lVert z_\mu - \mathrm{sg}[z_\phi]\big\rVert + \big\lVert \mathrm{sg}[z_\mu] - z_\phi\big\rVert + \lambda _ {gp}\,L _ {gp}(\pi),
$$

$L _ {gp}(\pi) = \mathbb{E} _ {s,a\sim\mathcal{D}}\lVert\nabla_s\log\pi(a \mid s)\rVert^2$，$\mathrm{sg}$ 是停梯度；$\lambda _ {gp} = 0.002$、$\lambda = 0.1$。两项距离各拉一边：前一项让特权编码靠近历史估计（正则），后一项训练适应模块。

**GP 加在哪些输入上**（第 VI-B 节 d、表 I(c)）：ROA 下策略输入既有当前观测、也有历史。只罚当前观测，动作抖动 7.16；罚整段输入，3.21。论文的解释是只管当前观测，历史一变动作照样会跳。
</details>

<div class="mermaid">
flowchart LR
    E["特权信息 e<br/>质量 · 质心 · 电机强度 · 线速度"] --> MU["编码器 μ"] --> ZM["z_μ"]
    H["最近 10 步本体观测"] --> PHI["适应模块 φ"] --> ZP["z_φ"]
    ZM -. "式 8 的两项距离（λ = 0.1）" .-> ZP
    O["当前观测 o_t"] --> PI["策略 π"]
    ZM -->|训练时| PI
    ZP -->|部署时| PI
    PI --> A["目标关节角 → PD → 力矩"]
    PI -. "GP：对整段输入求 ∇ log π" .-> GP["+ 0.002 × 梯度惩罚"]
</div>

---

### 5. 奖励与课程：平滑交给 GP，正则奖励留着

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：附录 C 的三类奖励与表 IV 的八项正则；附录 B 按回合长度自适应的正则系数</summary>

**三类奖励**（附录 C）：步态风格奖励、速度跟踪奖励、正则奖励；前两类随任务而定，论文只列了正则项（表 IV），完整实现让读者看代码。

| 表 IV 正则项 | 权重（照抄） |
|---|---|
| 机身角速度（横滚、俯仰方向） | 0.2 |
| 关节力矩 | 6e−7 |
| 碰撞 | 10 |
| 竖直线速度 | −1.5 |
| 触地力 | −0.002 |
| 绊脚 | −1.25 |
| 关节限位 | −10 |
| 机身姿态 | −1.0 |

前三项论文没写负号；按官方 GR1 配置，它们都是惩罚（−0.2、−6e−7、−10），竖直线速度在代码里是 −1.0。表里**没有**罚动作变化率、关节加速度的平滑项，GR1 配置里也没有 —— 那部分交给 GP。关节力矩项与「能耗」有关，所以严格说 LCP 去掉的是「平滑奖励」，不是所有和平滑沾边的正则（整理者的读法）。

**任务回报**（第 VI-B 节）只用线速度和角速度两项跟踪奖励计算。

**奖励课程**（附录 B）：把折扣回报改成 $\mathbb{E}\big[\sum_t\gamma^{t-1}\sum_i s _ {t,i}\,r _ {t,i}\big]$，$r _ {t,i}$ 是第 $i$ 项奖励；负的奖励项乘系数 $s _ {\mathrm{current}}$，正的乘 1。$s _ {\mathrm{current}}$ 从 0.8 开始：平均回合长度低于 50 步就乘 0.9999，超过 400 步就乘 1.0001，上限 2.0。意图是先用小的正则鼓励探索、后期加大正则得到想要的行为。一回合 500 步（10 s），「超过 400 步」就是平均能撑过 8 秒。

**代码与论文的出入**：GR1 配置里课程从 1.0 开始（夹在 [0.8, 2.0]）、阈值是 420 步、每个控制步判断一次；GR1 的命令区间是 $v_x \in [0, 0.6]$、$v_y, v _ {yaw} \in [-0.3, 0.3]$，各机器人还不一样（H1 前进到 1.5 m/s）。笔记里的数字以论文为准，代码供对照。
</details>

### 📊 LCP 接进 PPO 的训练回路

<div class="mermaid">
flowchart TB
    DR["4096 个并行环境<br/>域随机化 + 奖励课程"] --> Roll["rollout：每个环境 24 步"]
    Roll --> Adv["GAE 优势 + 回报"]
    Adv --> Loss["PPO 裁剪替代损失 + 价值损失 − 0.01 × 熵"]
    Roll --> GPc["观测设成 requires_grad<br/>autograd.grad(log π, obs, create_graph=True)"]
    GPc --> GPl["GP = 逐样本平方和的平均"]
    Loss --> Tot["总损失 + 特权正则 + 0.002 × GP"]
    GPl --> Tot
    Tot --> Upd["一次反向传播 · Adam 更新"]
    Upd --> Roll
    Upd -. "每 20 轮" .-> Dag["适应模块：回归特权潜向量"]
</div>

---

## 🚶 具体实例：把论文里的几个机制手算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（12 节）：环境设定 / 观测维度 / Lipschitz 上界 / 最大值与期望 / 高斯策略的梯度 / 系数表 / 奖励课程 / 表 I(a) / 表 I(b) / 表 I(c) / 训练量 / 真机表格</summary>

<h3 id="实例-环境设定">环境设定</h3>

以官方代码的 GR1 配置为例：仿真步长 0.001 s、每 20 步出一次动作，策略 **50 Hz**（0.02 s 一步）；一回合 10 s = **500 步**，正好是表 I「500 步，对应 10 秒」的测法；命令每 150 步重抽 = 每 **3 s** 一次。第 2、3 步的一维策略和第 4 步的两维高斯是玩具算例，用来把机制算清楚，数值不能和论文比；第 7–11 步的数全部来自论文表格。

<h3 id="实例-第-1-步观测维度">第 1 步：观测维度对账（GR1 配置）</h3>

| 部分 | 内容 | 维度 |
|---|---|---|
| 当前本体 | 步态相位 2 + 速度命令 3 + 机身角速度 3 + 横滚俯仰 2 + 关节位置 21 + 关节速度 21 + 上一步动作 19 | **71** |
| 特权信息 | 质量与质心 4 + 摩擦 1 + 电机强度 2 × 21 + 机身线速度 3 | **50** |
| 历史 | 最近 10 步本体观测：10 × 71 | **710** |
| 合计 | 71 + 50 + 710 | **831** |

GR1 有 21 个关节，脚踝横滚两个当被动关节，所以动作只有 19 维（论文第 VI-A 节）。论文正文没提摩擦，代码里有。

<h3 id="实例-第-2-步lipschitz-上界">第 2 步：Lipschitz 上界（玩具）</h3>

玩具策略 $\pi(o) = o + b\sin(4.5\,o)$，取 $b = 4/4.5$，最大斜率 $K = 1 + 4.5b = 5$（在 $o = 0$ 处）。观测噪声标准差 $\sigma = 0.045$ 时，动作偏差最多 $K\sigma = 5 \times 0.045 =$ **0.225**；沿 $o_t = 0.9\sin(0.055t)$ 走 120 步、同一个随机种子，实测动作抖动的标准差 **0.142**，落在上界之内（轨迹不总在最陡处）。

<h3 id="实例-第-3-步最大值与期望">第 3 步：式 4 的最大值 vs 式 5 的期望（玩具）</h3>

同一条轨迹上，策略斜率 $\pi^{\prime}(o) = 1 + 4\cos(4.5\,o)$ 的最大值是 5，均方根 $\sqrt{\mathbb{E}[\pi^{\prime}(o_t)^2]} =$ **2.75**。式 5 用期望代替最大值，约束的是后者：只管策略真正走得到的状态，比全局 Lipschitz 宽松。

<h3 id="实例-第-4-步高斯策略的梯度">第 4 步：高斯策略上的梯度（玩具，推导见第 3 节）</h3>

取

$$
J = \begin{bmatrix} 0.8 & 0.2 \\ -0.4 & 0.6 \end{bmatrix}, \qquad \sigma = 0.4:
$$


- $\lVert J\rVert_F^2 = 0.64 + 0.04 + 0.16 + 0.36 = 1.20$，期望 $1.20 / 0.4^2 = 1.20 / 0.16 =$ **7.5**；
- 一个样本 $a - \mu = (0.4, -0.2)$：$J^\top(a - \mu) = (0.8 \times 0.4 - 0.4 \times (-0.2),\; 0.2 \times 0.4 + 0.6 \times (-0.2)) = (0.40, -0.04)$，除以 0.16 得梯度 $(2.5, -0.25)$，平方和 $6.25 + 0.0625 =$ **6.31**，不等于 7.5；
- 再抽 199 个样本（演示里的固定种子），200 个平均 **7.53**；
- $\sigma$ 减半到 0.2：期望 $1.20 / 0.04 =$ **30**，是 4 倍。
- 乘上 $\lambda _ {gp} = 0.002$，这一项对损失的贡献是 $0.002 \times 7.5 = 0.015$。

<h3 id="实例-第-5-步系数表">第 5 步：官方代码的系数表</h3>

rsl_rl 的系数表是 $[\text{起点}, \text{终点}, \text{开始迭代}, \text{过渡迭代数}]$，第 $n$ 次迭代的系数 $= \text{起点} + u(\text{终点} - \text{起点})$，$u = \min\big(\max(n - \text{开始}, 0)/\text{过渡}, 1\big)$。

- GP：`[0.002, 0.002, 700, 1000]`，起点终点相同，全程恒为 **0.002**；
- ROA 的特权正则：`[0, 0.1, 2000, 3000]`，前 2000 次迭代为 0，第 3500 次 $u = 0.5$、系数 0.05，第 5000 次到 **0.1**（附录 A 的 $\lambda = 0.1$）。

<h3 id="实例-第-6-步奖励课程">第 6 步：奖励课程要多久涨满</h3>

从 0.8 涨到上限 2.0 要连乘 $\lceil\ln(2.0/0.8)/\ln 1.0001\rceil =$ **9164** 次 1.0001。代码里每个控制步判断一次、每次迭代每个环境走 24 步，所以只要平均回合一直够长，约 $9164 / 24 \approx$ **382** 次迭代就涨满；代码从 1.0 起步则是 $\ln 2/\ln 1.0001 \approx 6932$ 步、约 289 次迭代。反过来，平均回合短于 50 步时每步乘 0.9999，正则一点点变轻。

<h3 id="实例-第-7-步表-ia">第 7 步：表 I(a) 的比例</h3>

| | 动作抖动 | 比 LCP | 任务回报 | 比 LCP |
|---|---|---|---|---|
| LCP | 3.21 | 1 | 26.03 | — |
| 平滑奖励 | 5.74 | 1.79 倍 | 26.56 | +2.0% |
| 低通滤波 | 7.86 | 2.45 倍 | 24.98 | −4.0% |
| 不平滑 | 42.19 | **13.1 倍** | 28.87 | +10.9% |

不平滑的回报最高，LCP 比它低 $(28.87 - 26.03)/28.87 =$ **9.8%**；能耗 24.57 对 42.68，低 **42%**。机身加速度三种平滑办法都是 0.06，不平滑 0.09。

<h3 id="实例-第-8-步表-ib">第 8 步：表 I(b) 扫 $\lambda _ {gp}$</h3>

| $\lambda _ {gp}$ | 0 | 0.001 | 0.002 | 0.005 | 0.01 |
|---|---|---|---|---|---|
| 动作抖动 | 42.19 | 3.69 | 3.21 | 2.10 | 0.17 |
| 关节速度 | 12.92 | 11.44 | 10.65 | 10.44 | 2.75 |
| 任务回报 | 28.87 | 26.32 | 26.03 | 23.92 | 16.11 |

- 0 → 0.001：抖动降 $(42.19 - 3.69)/42.19 =$ **91%**，回报只降 8.8%；
- 0.002 → 0.005：抖动再降 35%，回报降 8.1%；
- 0.01：关节速度降到 2.75（比 0.002 低 74%），回报比 $\lambda _ {gp} = 0$ 低 $(28.87 - 16.11)/28.87 =$ **44%**。

<h3 id="实例-第-9-步表-ic">第 9 步：表 I(c) GP 加在哪</h3>

只罚当前观测：动作抖动 7.16 是罚整段输入（3.21）的 $7.16/3.21 =$ **2.23 倍**，关节位置抖动 0.35 对 0.17（2.06 倍），能耗 35.18 对 24.57（多 43%），任务回报 25.44 对 26.03，差不多。

<h3 id="实例-第-10-步训练量">第 10 步：训练量</h3>

每次迭代 $4096 \times 24 =$ **98,304** 个样本。图 5、图 6 的横轴到约 6–7 亿样本：6 亿样本约 6,104 次迭代，按 0.02 s 一步折合仿真时间 $6\times10^8 \times 0.02\ \text{s} \approx$ **139 天**。GR1 配置的 `max_iterations = 12002` 对应约 11.8 亿样本。

<h3 id="实例-第-11-步真机表格">第 11 步：表 II 与表 III</h3>

MuJoCo 里的任务回报（表 II）：GR1 24.33、H1 21.74、Berkeley 26.50。真机动作抖动（表 III，平地 → 粗糙地面）：GR1 1.12 → 1.18（+5.4%）、H1 1.11 → 1.20（**+8.1%**）、Berkeley 1.56 → 1.63（+4.5%；软地 1.66，+6.4%）。三种地面之间最多涨 8%。论文没有给出各机器人在 Isaac Gym 里的回报，所以「MuJoCo 里略降」没法从表里算出降了多少。
</details>

---

## 📊 实验里实际报了什么 {#lcp-experiments}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四台机器人、六项指标、图 4–6、表 I(a)(b)(c)、表 II sim-to-sim、表 III 真机与外力</summary>

**机器人**（第 VI-A 节）：

| 平台 | 论文的描述 |
|---|---|
| Fourier GR1T1 / GR1T2 | 机械结构相同，21 个关节（下身 12、上身 9）；脚踝横滚力矩上限很小，训练和部署都当被动关节，控制 19 个 |
| Unitree H1 | 19 个关节（下身 10、上身 9、每条腿 1 个踝关节），全部主动控制 |
| Berkeley Humanoid | 小型，高 0.85 m，12 个自由度（每条腿 6 个，踝部 2 个） |

正文写「三台真实机器人」却列了四台（GR1T1 和 GR1T2 结构相同）。

**指标**（第 VI-B 节）：平均关节速度（rad/s）、平均能耗（N·rad/s）、动作变化率（rad/s，动作的一阶导）、机身加速度（m/s²）、动作抖动与关节位置抖动（rad/s³，三阶导，引 Flash & Hogan 1985 的最小加加速度模型），以及只用线速度、角速度跟踪奖励算的平均任务回报。表 I 每种设置 3 个随机种子、1000 个环境、各 500 步（10 s）。

**LCP 平滑吗**（图 4）：$\lambda _ {gp} = 0.002$。训练全程的能耗、关节速度、关节加速度、动作变化率，LCP 和带平滑奖励的策略相当，远低于不平滑的 —— 尽管 LCP 没有直接最小化这些指标的奖励。图 4 的纵轴量级（如关节速度约 50）和表 I（10.65）不同，可能是训练时与测试时统计口径不同（推测）。

**任务表现**（表 I(a)、图 5）：

| 方法 | 动作抖动 ↓ | 关节位置抖动 ↓ | 关节速度 ↓ | 能耗 ↓ | 机身加速度 ↓ | 任务回报 ↑ |
|---|---|---|---|---|---|---|
| LCP（本文） | 3.21 ± 0.11 | 0.17 ± 0.01 | 10.65 ± 0.37 | 24.57 ± 1.17 | 0.06 ± 0.002 | 26.03 ± 1.51 |
| 平滑奖励 | 5.74 ± 0.08 | 0.19 ± 0.002 | 11.35 ± 0.51 | 25.92 ± 0.84 | 0.06 ± 0.002 | 26.56 ± 0.26 |
| 低通滤波 | 7.86 ± 3.00 | 0.23 ± 0.04 | 11.72 ± 0.14 | 32.83 ± 5.50 | 0.06 ± 0.002 | 24.98 ± 1.29 |
| 不平滑 | 42.19 ± 4.72 | 0.41 ± 0.08 | 12.92 ± 0.99 | 42.68 ± 10.27 | 0.09 ± 0.01 | 28.87 ± 0.85 |

论文的读法：LCP 与平滑奖励任务表现相近；低通回报偏低，可能是它带来的阻尼压抑了探索（图 5 里低通的曲线还有两次大跌）；不平滑回报最高，但抖得不能上真机。

**$\lambda _ {gp}$ 的影响**（表 I(b)、图 6）：

| $\lambda _ {gp}$ | 动作抖动 | 关节位置抖动 | 关节速度 | 能耗 | 机身加速度 | 任务回报 |
|---|---|---|---|---|---|---|
| 0.0 | 42.19 ± 4.72 | 0.41 ± 0.08 | 12.92 ± 0.99 | 42.68 ± 10.27 | 0.09 ± 0.01 | 28.87 ± 0.85 |
| 0.001 | 3.69 ± 0.31 | 0.21 ± 0.05 | 11.44 ± 1.18 | 27.09 ± 4.44 | 0.06 ± 0.01 | 26.32 ± 1.20 |
| 0.002（本文） | 3.21 ± 0.11 | 0.17 ± 0.01 | 10.65 ± 0.37 | 24.57 ± 1.17 | 0.06 ± 0.002 | 26.03 ± 1.51 |
| 0.005 | 2.10 ± 0.05 | 0.15 ± 0.01 | 10.44 ± 0.70 | 26.24 ± 3.50 | 0.05 ± 0.002 | 23.92 ± 2.05 |
| 0.01 | 0.17 ± 0.01 | 0.07 ± 0.00 | 2.75 ± 0.12 | 5.89 ± 0.28 | 0.007 ± 0.00 | 16.11 ± 2.76 |

加了 GP 动作就平滑得多；系数小（0.001）时策略仍可能出现上真机危险的抖动行为，系数大（0.01）时动作过于平滑迟缓、回报大幅下降，图 6 里也学得更慢。论文结论：0.002 在平滑与任务之间平衡最好，**和别的平滑技术一样，系数要调**。

**GP 加在哪**（表 I(c)）：整段输入 3.21 / 0.17 / 10.65 / 24.57 / 0.06 / 26.03；只罚当前观测 7.16 ± 0.60 / 0.35 ± 0.03 / 13.70 ± 1.50 / 35.18 ± 4.84 / 0.09 ± 0.005 / 25.44 ± 3.73。

**Sim-to-sim**（表 II，Isaac Gym 训练、MuJoCo 测试，3 个种子 × 3 次 × 500 步）：

| | 动作抖动 | 关节位置抖动 | 关节速度 | 能耗 | 机身加速度 | 任务回报 |
|---|---|---|---|---|---|---|
| Fourier GR1 | 1.47 ± 0.43 | 0.34 ± 0.07 | 9.54 ± 1.53 | 36.38 ± 2.97 | 0.08 ± 0.004 | 24.33 ± 1.25 |
| Unitree H1 | 0.44 ± 0.03 | 0.10 ± 0.007 | 9.12 ± 0.38 | 76.22 ± 5.81 | 0.04 ± 0.005 | 21.74 ± 1.40 |
| Berkeley Humanoid | 1.77 ± 0.32 | 0.12 ± 0.01 | 7.92 ± 0.21 | 19.99 ± 0.36 | 0.06 ± 0.00 | 26.50 ± 0.57 |

论文说全尺寸的 GR1、H1 回报比 Isaac Gym 里略降，说明大机器人的域差距更大；整体给了上真机的信心。

**真机**（表 III、图 1、图 7）：同样的奖励、$\lambda _ {gp} = 0.002$，四台机器人都能走；平地、软地、粗糙地面各测三个训练种子的模型、各 10 s：

| | 动作抖动 | 关节位置抖动 | 关节速度 |
|---|---|---|---|
| 平地 · GR1 / H1 / Berkeley | 1.12 / 1.11 / 1.56 | 0.28 / 0.14 / 0.10 | 10.82 / 10.95 / 4.99 |
| 软地 · GR1 / H1 / Berkeley | 1.18 / 1.18 / 1.66 | 0.24 / 0.15 / 0.12 | 10.45 / 11.80 / 6.78 |
| 粗糙 · GR1 / H1 / Berkeley | 1.18 / 1.20 / 1.63 | 0.26 / 0.14 / 0.11 | 11.61 / 11.68 / 5.02 |

（标准差见论文表 III 或下面的表格浏览器。）地面变了，行为仍然平滑；真机上还被施加外力推搡，补充视频里都恢复了。
</details>

<div class="paper-demo" data-demo="lcp-table"><p class="demo-fallback">（本节含交互演示：论文表 I–III 的六项指标浏览器，需要启用 JavaScript）</p></div>

---

## ⚠️ 边界与局限

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只做了基础行走；系数仍要调；真机没有对照组；表 I 没写机器人；代码与论文有出入</summary>

- **只验证了基础行走**（结论节）：跑、跳等更动态的技能还没试，论文自己列为下一步。
- **系数仍要调**：0.001 仍可能危险地抖、0.01 回报掉 44%，可用的范围不宽；论文的说法是「和其他平滑技术一样需要一些调节」。
- **真机没有对照组**：表 III 只报了 LCP 自己，没有平滑奖励或低通滤波在真机上的对比；「能替代平滑奖励」的定量证据都来自仿真（表 I）。
- **表 I 没写是哪台机器人**，图 3 没有纵轴数值，图 4 的量级和表 I 不同；真机只报了三项指标，没有任务回报。
- **约束被放宽了两次**：式 5 只在访问到的状态上取期望，式 7 把乘子固定成常数 —— 训出来的策略并不保证有全局 Lipschitz 常数上界，也不知道对应的 $K$ 是多少（整理者的读法）。
- **代码与论文的出入**：命令区间、课程起点与阈值、表 IV 的符号与个别权重（见第 5 节）；代码里还有论文没写的域随机化（摩擦 0.1–2.0、质量 ±3 kg、质心 ±5 cm、电机强度 0.8–1.2、每 4 s 推一次、动作延迟等，见[源码对照](#源码对照)）。
- **和别的 sim-to-real 手段是叠加关系**：LCP 只解决「平滑」，域随机化、ROA、奖励设计照样要做；路线图下一篇 [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html) 则直接用真机数据去对齐仿真的物理。
</details>

---

## 🤖 这篇论文的工程价值在哪？

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：1. 解决特别工程的问题 / 2. 比调奖励更像通用组件 / 3. 把后处理滤波前移成训练期约束 / 4. 不神化自己</summary>

<h3 id="1-它解决的是一个特别工程特别烦的问题">1. 它解决的是一个特别工程、特别烦的问题</h3>

真部署时最先出事的往往不是回报低，而是**策略抖**。表 I 把这件事量化了：仿真里最「赚」的策略抖动是 LCP 的 13 倍。LCP 不是花哨的贡献，但很有工程含金量。

<h3 id="2-它比调-reward更像一类通用组件">2. 它比「调 reward」更像一类通用组件</h3>

平滑奖励跟任务、机器人、动作空间强耦合；GP 形式统一、直接作用在策略上，和 PPO、ROA、教师—学生都不冲突。论文在 GR1T1 / GR1T2、H1、Berkeley Humanoid 上用**同一个** $\lambda _ {gp} = 0.002$，官方仓库还加了 G1 的配置；MimicKit 把它接到了动作跟踪任务上。

<h3 id="3-它把后处理滤波前移成了训练期结构约束">3. 它把「后处理滤波」前移成了「训练期约束」</h3>

低通滤波是事后补救，在信号链上加了状态和延迟（OP3 的滤波器阶跃要 11 步、275 ms 才过 90%）；LCP 在训练时就把策略的斜率压下来，部署时不加任何东西。论文给的理由是滤波压抑探索、回报偏低（表 I(a)），延迟是整理者补充的另一面。

<h3 id="4-它不神化自己这反而更可信">4. 它不神化自己，这反而更可信</h3>

论文明说系数要调、太小没效果、太大动作发钝，也承认只做了基础行走。控制里没有免费午餐，这种老实反而让结论更可信。
</details>

---

## 📁 源码对照 {#源码对照}

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 节）：官方仓库结构 / GP 的实现 / 总损失与系数表 / ROA 的两半 / 观测与「整段输入」/ GR1 配置要点 / MimicKit 的 LCPAgent / 写明 vs 没写</summary>

<h3 id="src-1-官方仓库结构">1. 官方仓库结构</h3>

[zixuan417/smooth-humanoid-locomotion](https://github.com/zixuan417/smooth-humanoid-locomotion)：`simulation/` 是基于 legged_gym 的环境（`envs/gr1`、`h1`、`berkeley`、`g1` 各一份 `*_walk_phase.py` + 配置）和基于 rsl_rl 的算法（`algorithms/ppo_rma.py`、`modules/actor_critic_rma.py`），`scripts/sim2sim.py` 做 MuJoCo 迁移；`deployment/` 目前只有 GR1T2 的真机部署代码。README 致谢 [Humanoid-Gym](../../03_High_Impact_Selection/Humanoid-Gym_Zero-Shot_Sim2Real_Transfer/Humanoid-Gym_Zero-Shot_Sim2Real_Transfer.html) 与 [Expressive Humanoid](../../03_High_Impact_Selection/Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html)：步态相位奖励（脚离地高度、触地数、脚距）像 Humanoid-Gym，ROA 的 actor 结构像 Expressive Humanoid。

<h3 id="src-2-gp-的实现">2. GP 的实现（对应式 7、式 9）</h3>

```python
# simulation/rsl_rl/rsl_rl/algorithms/ppo_rma.py（节选）
def _calc_grad_penalty(self, obs_batch, actions_log_prob_batch):
    grad_log_prob = torch.autograd.grad(actions_log_prob_batch.sum(), obs_batch, create_graph=True)[0]
    gradient_penalty_loss = torch.sum(torch.square(grad_log_prob), dim=-1).mean()
    return gradient_penalty_loss

def update(self):
    for sample in generator:
        obs_batch, ..., actions_batch, ... = sample
        obs_est_batch = obs_batch.clone()
        obs_est_batch.requires_grad_()
        self.actor_critic.act(obs_est_batch, ...)          # 用这批观测重新前向
        actions_log_prob_batch = self.actor_critic.get_actions_log_prob(actions_batch)
        gradient_penalty_loss = self._calc_grad_penalty(obs_est_batch, actions_log_prob_batch)
```

- `actions_batch` 是 rollout 时采到的动作，`log_prob` 在当前参数下重算 —— 正是式 7 的 $\mathbb{E} _ {s,a\sim\mathcal{D}}$：每个状态一个动作。
- `.sum()` 再求导等价于逐样本求导（样本之间不相关）；`create_graph=True` 让梯度本身可再反向传播（二阶导）；`sum(square, dim=-1).mean()` 是逐样本平方范数取平均。

<h3 id="src-3-总损失与系数表">3. 总损失与系数表</h3>

```python
gradient_stage = min(max((self.counter - sched[2]), 0) / sched[3], 1)
gradient_penalty_coef = gradient_stage * (sched[1] - sched[0]) + sched[0]
loss = surrogate_loss + self.value_loss_coef * value_loss - self.entropy_coef * entropy_batch.mean() \
       + priv_reg_coef * priv_reg_loss + gradient_penalty_coef * gradient_penalty_loss
self.optimizer.zero_grad(); loss.backward()
nn.utils.clip_grad_norm_(self.actor_critic.parameters(), self.max_grad_norm)
self.optimizer.step()     # optim.Adam
```

各机器人配置都是 `grad_penalty_coef_schedule = [0.002, 0.002, 700, 1000]`，全程 0.002（[实例第 5 步](#实例-第-5-步系数表)）。基础配置 `humanoid_config.py`：Adam、学习率 2e-4、`schedule = 'adaptive'`（KL 目标 0.008，超过两倍就把学习率除以 1.5、低于一半就乘 1.5）、5 个 epoch × 4 个 minibatch、裁剪 0.2、熵系数 0.01、$\gamma = 0.99$、GAE $\lambda = 0.95$、梯度裁剪 1.0、每个环境每轮 24 步；actor / critic 都是 [512, 256, 128] 的 ELU MLP。

<h3 id="src-4-roa-的两半">4. ROA 的两半（对应式 8）</h3>

```python
# PPO 更新里：特权编码向历史估计靠拢（历史那边停梯度）——式 8 的 λ‖z_μ − sg[z_φ]‖
priv_latent_batch = self.actor_critic.actor.infer_priv_latent(obs_batch)
with torch.inference_mode():
    hist_latent_batch = self.actor_critic.actor.infer_hist_latent(obs_batch)
priv_reg_loss = (priv_latent_batch - hist_latent_batch.detach()).norm(p=2, dim=1).mean()

# update_dagger()：每 dagger_update_freq = 20 轮单独训练历史编码器——式 8 的 ‖sg[z_μ] − z_φ‖
hist_latent_loss = (priv_latent_batch.detach() - hist_latent_batch).norm(p=2, dim=1).mean()
```

特权编码器是 [64, 20] 的 MLP，历史编码器先把每步 71 维投影到 30 维、再过两层一维卷积（10 步历史时），输出同样 20 维。

<h3 id="src-5-观测与整段输入">5. 观测与「整段输入」（我们读代码的理解）</h3>

观测按 `[当前本体 71 | 特权 50 | 历史 710]` 拼成 831 维（[实例第 1 步](#实例-第-1-步观测维度)），GP 对这 831 维整段求梯度。但 PPO 更新里 `act(obs_est_batch)` 默认 `hist_encoding=False`，actor 用的是当前本体 + 特权编码那一路，历史那 710 维对动作没有贡献、梯度为 0。所以代码里「整段输入」实际罚到的是**当前本体 + 特权信息**，「只罚当前观测」则不罚特权那 50 维。部署时特权编码换成历史编码器的输出，后者是回归特权编码训出来的 —— 若特权那一路很陡，历史一变动作也会跟着跳，这和论文「历史一变动作照样会跳」的解释对得上。以上是整理者对公开代码的理解，论文没有说明消融时具体怎么切输入。

<h3 id="src-6-gr1-配置要点">6. GR1 配置要点（`gr1_walk_phase_config.py`）</h3>

| 项 | 值 |
|---|---|
| 并行环境 / 回合 | 4096 / 10 s |
| 控制频率 | `dt = 0.001` × `decimation = 20` → 50 Hz |
| 动作 | 19 维，`action_scale = 0.5`，裁剪 ±5；初始标准差 0.1–0.4（可学习） |
| 命令 | $v_x$ 0–0.6 m/s、$v_y$ ±0.3、$v _ {yaw}$ ±0.3，每 3 s 重抽 |
| 步态周期 | 0.8 s |
| 域随机化 | 重力 ±0.1（每 4 s）、摩擦 0.1–2.0、机身质量 ±3 kg、质心 ±0.05 m、电机强度 0.8–1.2、每 4 s 推一次（≤ 1.0 m/s）、动作延迟（缓冲 8 步） |
| 观测噪声 | 关节位置 0.01、关节速度 0.1、角速度 0.05、重力 0.05、IMU 0.05（前 5000 轮线性加大） |
| 地形 | trimesh，高度 0–4 cm |
| 正则课程 | 系数初值 1.0，夹在 [0.8, 2.0]，平均回合 > 420 步 ×1.0001、< 50 步 ×0.9999 |
| 迭代数 | 12002（H1 20001、Berkeley 30002） |

<h3 id="src-7-mimickit-的-lcpagent">7. MimicKit 的 LCPAgent</h3>

先看静态结构（接着 [PPO 笔记](../PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html)的类图往下长）。整个 [MimicKit](../MimicKit_A_Reinforcement_Learning_Framework_for_Motion_Imitation_and_Control/MimicKit_A_Reinforcement_Learning_Framework_for_Motion_Imitation_and_Control.html) 里 LCP 是改动最小的算法 —— `lcp_agent.py` 不到 50 行，`LCPModel` 只是改名：

```python
# mimickit/learning/lcp_agent.py
class LCPAgent(ppo_agent.PPOAgent):
    def _load_params(self, config):
        super()._load_params(config)
        self._lcp_weight = config["lcp_weight"]

    def _compute_actor_loss(self, batch):
        info = super()._compute_actor_loss(batch)          # 标准 PPO-Clip
        norm_obs = self._obs_norm.normalize(batch["obs"])
        norm_a = self._a_norm.normalize(batch["action"])
        lcp_loss = self._compute_lcp_loss(norm_obs, norm_a)
        info["actor_loss"] += self._lcp_weight * lcp_loss
        info["lcp_loss"] = lcp_loss
        return info

    def _compute_lcp_loss(self, norm_obs, norm_a):
        norm_obs.requires_grad_(True)
        a_dist = self._model.eval_actor(norm_obs)
        a_logp = a_dist.log_prob(norm_a)
        a_logp_grad = torch.autograd.grad(a_logp, norm_obs, grad_outputs=torch.ones_like(a_logp),
                                          create_graph=True, retain_graph=True, only_inputs=True)[0]
        return torch.mean(torch.sum(torch.square(a_logp_grad), dim=-1))
```

`data/agents/lcp_g1_agent.yaml` 和 `deepmimic_g1_ppo_agent.yaml` 逐行比只差两处：`agent_name: "LCP"` 与多出的 `lcp_weight: 0.002`。网络（2 层 1024 单元）、固定动作标准差 0.05、**SGD 学习率 1e-4** 都是 MimicKit 所有智能体的共同默认（AMP、ADD、SMP、DeepMimic 的配置也都是 SGD），**不是 LCP 的要求**；论文的官方代码用 Adam。另一个区别：MimicKit 的任务是 DeepMimic 式动作跟踪（`deepmimic_g1_env.yaml`），不是论文的速度命令行走；它的 README 也说 `lcp_weight` 要按任务和动作调。

<div class="mermaid">
classDiagram
    class PPOAgent {
        ppo_agent.py
        #_compute_actor_loss() PPO-Clip
    }
    class LCPAgent {
        lcp_agent.py 不到50行
        #_load_params() 读入lcp_weight
        #_compute_actor_loss() 加一项GP
        #_compute_lcp_loss() 对log_prob求观测梯度
    }
    class PPOModel {
        ppo_model.py
    }
    class LCPModel {
        lcp_model.py 纯继承
    }
    PPOAgent <|-- LCPAgent : 继承
    PPOModel <|-- LCPModel : 继承
    LCPAgent o-- LCPModel : _model
</div>

<div class="mermaid">
sequenceDiagram
    autonumber
    participant R as run.py
    participant AG as LCPAgent<br/>(lcp_agent.py)
    participant M as LCPModel<br/>(= PPOModel 结构)
    participant E as Env<br/>(4096 并行)
    R->>AG: build_agent()：agent_name "LCP"
    loop 每轮迭代
        AG->>E: rollout（同 PPO）
        AG->>AG: TD(λ) 回报 + GAE（同 PPO）
        AG->>M: critic 更新（同 PPO）
        AG->>M: super()._compute_actor_loss()：PPO-Clip
        AG->>M: _compute_lcp_loss()：autograd.grad(log_prob, obs, create_graph=True)
        AG->>AG: actor_loss += 0.002 × lcp_loss
        AG->>M: 一步 SGD（MimicKit 默认），二阶梯度经 create_graph 回传
    end
</div>

<h3 id="src-8-写明-vs-没写">8. 写明 vs 没写</h3>

| 项目 | 论文写明 | 只在代码里 / 没写 |
|---|---|---|
| GP 形式与系数 | 式 7、$\lambda _ {gp} = 0.002$ | `autograd.grad(..., create_graph=True)`、常数系数表 |
| 优化器 | 只写了 PPO | Adam 2e-4、KL 自适应、5 × 4、熵 0.01 |
| 观测 | 相位、命令、关节位置速度、上一步动作、特权四项 | 角速度、横滚俯仰、摩擦；71 / 50 / 710 维 |
| 命令 | 0–0.8、±0.4、±0.6，每 150 步 | 各机器人不同（GR1 0–0.6、±0.3、±0.3） |
| 奖励 | 三类、表 IV 八项、课程规则 | 步态风格与跟踪奖励的具体形式与权重 |
| 域随机化 | 只说用了 | 摩擦、质量、质心、电机强度、推搡、延迟、重力、观测噪声 |
| 网络 | 「神经网络」 | [512, 256, 128] ELU、特权编码 [64, 20]、卷积历史编码器 |
| 低通滤波基线 | 只说是滤波 | 截止频率等参数未给出 |
</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：Q1 和平滑奖励的区别 / Q2 为什么约束梯度就平滑 / Q3 为什么罚 log π 而不是动作 / Q4 能替代低通吗 / Q5 代价 / Q6 GP 加在哪 / Q7 为什么适合 sim-to-real</summary>

<h3 id="q1-lcp-和普通-smoothness-reward-的区别是什么">Q1: LCP 和普通 smoothness reward 的区别是什么？</h3>
**A**：平滑奖励写在环境里，罚动作变化、关节速度 / 加速度、能耗，要和任务奖励配平权重，对策略参数不可微，只能靠策略梯度采样去估；LCP 在训练目标里加 $\lambda _ {gp}\mathbb{E}\lVert\nabla_s\log\pi(a \mid s)\rVert^2$，直接对策略参数可导，只有一个系数。表 I(a) 里两者平滑程度相当（LCP 抖动 3.21、平滑奖励 5.74），回报相近（26.03 对 26.56）。

<h3 id="q2-为什么约束-policy-梯度会让动作更平滑">Q2: 为什么约束策略的梯度会让动作更平滑？</h3>
**A**：梯度有界 ⇒ Lipschitz 连续（式 2），输入变化 $\Delta s$ 时输出最多变化 $K\lVert\Delta s\rVert$。观测噪声、状态的小变化不会被放大成动作的大跳变。论文的动机实验（图 3）也显示，加了平滑奖励的策略梯度本来就小。

<h3 id="q3-为什么罚-log-π-的梯度而不是动作的梯度">Q3: 为什么罚 $\log\pi$ 的梯度，而不是动作的梯度？</h3>
**A**：论文的式 4–7 就是写在 $\log\pi(a \mid s)$ 上的，实现上可以直接复用 PPO 里重算的 `log_prob`。对角高斯策略上，$\mathbb{E}_a\lVert\nabla_s\log\pi\rVert^2 = \lVert J\rVert_F^2/\sigma^2$，$J$ 是均值对状态的雅可比 —— 等价于罚均值的斜率，只多了 $1/\sigma^2$ 的权重（这一步是推导，论文没写）。

<h3 id="q3-lcp-能替代低通滤波器吗">Q4: LCP 能替代低通滤波器吗？</h3>
**A**：论文的结论是可以作为替代：低通滤波在表 I(a) 里回报最低（24.98），论文推测它的阻尼压抑了探索。另外滤波器在信号链上加了状态和延迟，LCP 在部署时什么都不加（后一点是工程上的补充）。

<h3 id="q4-lcp-的代价是什么">Q5: LCP 的代价是什么？</h3>
**A**：一是计算：每次更新多一次带 `create_graph=True` 的反向传播（二阶导）；二是系数要调：表 I(b) 里 0.001 仍可能危险地抖，0.01 回报比不加低 44%、学得更慢。论文在实验里选 0.002。

<h3 id="q6-gp-应该加在哪些输入上">Q6: GP 应该加在哪些输入上？</h3>
**A**：整段输入。用 ROA 时策略输入有当前观测、历史（和训练时的特权信息），只罚当前观测，历史一变动作照样会跳：表 I(c) 动作抖动 7.16 对 3.21。

<h3 id="q5-lcp-为什么适合-sim-to-real">Q7: LCP 为什么适合 sim-to-real？</h3>
**A**：仿真里的电机近乎理想，不罚抖动，策略会学成 bang-bang；真机电机打不出那样的力矩。LCP 让策略本身平滑，四台形态不同的人形用同一个系数零样本部署，平地、软地、粗糙地面上动作抖动最多只涨 8%（表 III）。它只解决「平滑」，域随机化、ROA 照样要做。
</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（5 节）：A. 数字出处 / B. 旧版笔记的改正与 v1–v3 的差异 / C. 讨论记录 / D. 与路线图其他论文的关联 / E. 相关工作</summary>

<h3 id="a-数字出处">A. 数字出处</h3>

- 论文：表 I–III（第 VI 节）、式 1–9（第 III–IV 节、附录 A）、附录 B 的课程、附录 C 的 4096 个环境与表 IV，均照抄 arXiv v3；图 3–6 没有数值表，动画里的曲线是按走势画的示意。
- 官方代码：`ppo_rma.py`（GP、总损失、ROA 两半）、`humanoid_config.py`（PPO 超参数、网络）、`gr1_walk_phase_config.py` 等（观测维度、命令、随机化、课程、系数表）。
- 现算：13.1 倍、91%、44%、42%、9.8%、2.23 倍、8.1%、9164 次、382 次迭代、98,304、139 天。
- 玩具：第 2–4 幕与 `lcp-sensitivity` / `lcp-gp` 的一维策略和两维高斯；$\lVert J\rVert_F^2/\sigma^2$ 的推导是整理者的。

<h3 id="b-旧版笔记的改正与-v1v3-的差异">B. 旧版笔记的改正与 v1–v3 的差异</h3>

- 旧版写「LCP 论文使用 SGD（lr=1e-4）而非 Adam，为了让 GP 项和策略项的优化节奏更匹配」—— 论文没说优化器，官方代码用 Adam（2e-4，KL 自适应）；SGD 1e-4 是 MimicKit 全部智能体的共同默认，那句解释也是旧版的推测。
- 旧版正文公式写成 $\lVert\nabla_o\pi(o)\rVert^2$ —— 原文式 4–9 都是 $\lVert\nabla_s\log\pi(a \mid s)\rVert^2$；两者在高斯策略上的关系见第 3 节。
- 旧版动画第一幕说「仿真里 $\sigma = 0$，所以测不出抖动」—— 表 I 在仿真里就测到不平滑策略抖动 42.19；问题是理想电机不罚抖动。旧版三个演示的「$J(K) - \lambda K^2$」曲线、低通延迟都是编出来的玩具，不是论文的数；新版演示改用论文表格，玩具只留在 Lipschitz 圆锥和高斯算例里并标明。
- 旧版把「teacher-student / privileged learning」和 ROA 并列成两个组件 —— 论文用的是 ROA（单阶段：特权编码 + 适应模块一起训），相关工作里提到教师—学生是同类思路。
- 旧版写「LCP 的平滑性可与 smoothness reward 接近」—— 表 I(a) 里 LCP 的动作抖动（3.21）其实比平滑奖励（5.74）还低，其他平滑指标相当。
- v1（2024-10-15）、v2（10-16）、v3（10-28）正文与表格相同；v3 多了附录 A（ROA 损失式 8–9、$\lambda = 0.1$）、附录 B（奖励课程）、附录 C（Isaac Gym、4096 个环境、表 IV）。

<h3 id="c-讨论记录">C. 讨论记录</h3>

**2026-04-06：LCP 和 PPO 的关系**。LCP 不是新的强化学习算法，而是 PPO 上面的一个策略正则项：PPO 负责「怎么优化」，LCP 负责「往平滑方向约束」。没有 PPO 这类优化器，LCP 不能单独用；没有 LCP，PPO 学出的人形策略更容易抖。

**2026-04-06：LCP 的核心是策略敏感度控制**。动作平滑只是表象，本质是控制观测 → 动作这张映射的局部斜率，所以它不只是行走的技巧，而是一类通用的策略正则。

**2026-10-05：对照原文与代码重核，补十幕动画、三个演示与配音视频**。改正见附录 B；动画按论文的结构分十幕（问题、式 1–2 与图 3、式 4–7、$\log\pi$ 的梯度、代码、观测与 ROA、奖励与课程、表 I(a)、表 I(b)、真机），玩具与示意都标明。配音视频 10 分 34 秒：片头接上一期 OP3 足球的片尾预告，片尾只预告下一篇 ASAP；旁白按同句合成比 DTW 核对「方差 chā / 调用 diào / 重量 zhòng / 偏差 chā」读对了，「重调 / 重抽 / 当被动关节 / 0 处」改了说法。

**2026-10-05（第二版）：动画与视频改成以动图为主**。第一版视频大部分时间在念公式，观众容易走神；这一版每幕最多留一条公式，其余换成会动的图：两个关节跟同一串指令（仿真照做、真机跟不上）、两条玩具策略抖给你看、「每一处都不许太陡 → 只看走到的地方 → 陡了就罚 → 单价固定」四步加一场拔河、钟形沿均值线滑动（罚的是均值的斜率）、旋钮拧过 $\lambda _ {gp}$ 的五档。推导和代数算例留在下面的「具体实例」和交互演示里。配音视频重配为 9 分 52 秒。

<h3 id="d-与路线图其他论文的关联">D. 与路线图其他论文的关联</h3>

- **[Domain Randomization](../Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html)（DR → LCP）**：LCP 的训练照样带域随机化；随机化让策略见过足够多的动力学，LCP 让策略对输入的变化不过激。
- **[OP3 足球](../../03_High_Impact_Selection/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.html)（上一篇）**：输出端指数滤波 $u_t = 0.8\,u _ {t-1} + 0.2\,a_t$，正是 LCP 想替代的那类做法。
- **[真实世界人形行走](../../03_High_Impact_Selection/Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)**：奖励里罚关节目标的一阶、二阶差分 —— 平滑奖励路线。
- **[AMP](../AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html) / ASE / CALM**：梯度惩罚加在判别器上；LCP 把它搬到策略上。作者里的 Xue Bin Peng 也是 AMP / ASE / CALM 的作者。
- **[ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)（下一篇，LCP → ASAP）**：不再只靠随机化和平滑去扛差距，而是到真机上采数据、学残差动作模型对齐仿真的物理。

<h3 id="e-相关工作">E. 相关工作</h3>

| 论文 / 方向 | 关系 |
|---|---|
| PPO（2017） | 主优化算法 |
| TRPO（2015） | 式 5「用期望代替最大值」的启发式出处 |
| WGAN / WGAN-GP（2017） | 梯度惩罚的来历 |
| AMP / CALM / ASE | 梯度惩罚此前用于判别器正则 |
| RMA / ROA（Deep Whole-Body Control、Visual WBC） | 论文用的 sim-to-real 框架 |
| Humanoid-Gym、Expressive Humanoid | 官方代码致谢的两个代码库 |
| Flash & Hogan 1985 | 抖动指标（三阶导）的出处 |
</details>

---

## 参考来源

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：arXiv、项目页、官方代码与 MimicKit；直觉解释与类比属于整理者的归纳</summary>

- arXiv：<https://arxiv.org/abs/2410.11825>（v1–v3）
- 项目页：<https://lipschitz-constrained-policy.github.io/>
- 官方代码：<https://github.com/zixuan417/smooth-humanoid-locomotion>
- MimicKit：<https://github.com/xbpeng/MimicKit>（`mimickit/learning/lcp_agent.py`、`data/agents/lcp_g1_agent.yaml`、`docs/README_LCP.md`）

> 注：数字以论文为准，代码供对照；第 3 节的推导、源码对照第 5 节的代码解读、类比与工程解读属于整理者的归纳，不是论文原文。
</details>
