---
layout: paper
paper_order: 12
title: "SMP: Reusable Score-Matching Motion Priors for Physics-Based Character Control"
category: "Foundational RL"
zhname: "SMP：面向物理角色控制的可复用分数匹配运动先验"
demos: ["smp"]
---

# SMP: Reusable Score-Matching Motion Priors for Physics-Based Character Control
**把预训练好的运动扩散模型冻结成奖励函数：用 SDS 的噪声残差给动作的「自然度」打分，一个先验复用到多个任务、上百种风格，训练策略时连原始动作数据都不用留**

> 📅 阅读日期: 2026-10-03
>
> 🏷️ 板块: Reinforcement Learning / Motion Prior / Diffusion Model

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2512.03028](https://arxiv.org/abs/2512.03028) |
| **PDF** | [下载](https://arxiv.org/pdf/2512.03028)（[项目页版本](https://xbpeng.github.io/projects/SMP/SMP_2026.pdf)） |
| **作者** | Yuxuan Mu\*, Ziyu Zhang\*, Yi Shi\*, Dun Yang, Minami Matsumoto, Kotaro Imamura, Guy Tevet, Chuan Guo, Michael Taylor, Chang Shu, Pengcheng Xi, Xue Bin Peng（\* 共同一作） |
| **机构** | Simon Fraser University, Sony Interactive Entertainment, Stanford University, Snap Inc., National Research Council Canada, NVIDIA |
| **发布时间** | 2025-12-02 (arXiv), SIGGRAPH 2026 (ACM TOG) |
| **项目主页** | [xbpeng.github.io/projects/SMP](https://xbpeng.github.io/projects/SMP/index.html) · [yxmu.foo/smp-page](https://yxmu.foo/smp-page/) |
| **GitHub** | [xbpeng/MimicKit](https://github.com/xbpeng/MimicKit)（[README_SMP.md](https://github.com/xbpeng/MimicKit/blob/main/docs/README_SMP.md)） |
| **视频** | [youtu.be/jBA2tWk6vzU](https://youtu.be/jBA2tWk6vzU) |

---

## 🎯 一句话总结

SMP 是 AMP 那条「运动先验」路线的**可复用版本**：AMP 的判别器必须和每个新策略一起对抗训练、原始数据集永远得留着；SMP 先在动作数据上训一个**任务无关的小扩散模型**，然后把它**冻结**，用 **SDS（score distillation sampling）** 的噪声残差 $\lVert \hat{\epsilon} - \epsilon \rVert^2$ 当「像不像真人动作」的奖励。再配上**固定三档噪声的集成（ESM）**、**按档归一化（AdaNorm）**、**从扩散模型采样初始状态（GSI）** 三个设计，单段模仿的平均误差与 AMP 打平（0.046 m vs 0.046 m），而且一个先验能复用到 Steering / Target Location / Dodgeball 多个任务、靠 CFG 拆成 100 种风格先验，甚至拼出数据里没有的新风格。

> 🎮 **本文内嵌 1 段动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [八幕动画：SMP 全流程](#smp-explainer-anim) —— 约 128 秒串完「对抗先验不能复用 → 预训练扩散先验 → SDS 残差当奖励 → ESM → AdaNorm → GSI → 一个先验 100 + N 种风格 → 训练闭环与证据」
> 2. [配音讲解视频](#smp-video) —— 同样八幕，加中文配音与字幕，8 分 37 秒竖屏，可下载
> 3. SDS 奖励实验台 —— 「左臂 × 右腿」二维玩具流形上拖动动作，看三档噪声的修正方向和最终的 $r^{smp}$；「顺拐」一按就掉到 0.0009
> 4. 随机噪声档 vs 固定三档 —— 同一个动作评估 1024 次，看奖励方差为什么必须压、AdaNorm 又把哪一档的话语权拿了回来
> 5. 一个先验，多种风格 —— 无条件 / CFG / 上下半身组合三种先验的奖励地形，组合风格的峰值落在数据里没有的地方

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **SMP** | Score-Matching Motion Prior | 分数匹配运动先验：冻结的运动扩散模型 + SDS，当作可复用的风格奖励 |
| **SDS** | Score Distillation Sampling | 分数蒸馏采样：给样本加噪，让扩散模型预测噪声，残差 $\hat{\epsilon} - \epsilon$ 指出「往数据分布拉回去」的方向（DreamFusion 提出） |
| **ESM** | Ensemble Score-Matching | 集成分数匹配：在固定的一组噪声档 $\mathcal{K} = \{22, 15, 8\}$ 上各算一次 SDS 再平均，替代随机抽一档 |
| **AdaNorm** | Adaptive Normalization | 每一档 SDS 误差除以它自己的运行均值 $\mu_i$，把不同档的量级拉平 |
| **GSI** | Generative State Initialization | 生成式状态初始化：用同一个扩散模型采样初始状态，替代需要数据集的 RSI |
| **RSI** | Reference State Initialization | 参考状态初始化：从动作数据里随机挑一帧当回合起点（DeepMimic） |
| **CFG** | Classifier-Free Guidance | 无分类器引导：$f(\varnothing) + w(f(c) - f(\varnothing))$，把通用先验变成风格先验 |
| **MSM** | Multi-step Score Matching | 多步分数匹配：用几步 DDIM 反向去噪估计 $\hat{\epsilon}$，用于风格组合 |
| **AMP** | Adversarial Motion Priors | 对抗运动先验：判别器当风格奖励，必须和策略一起训 |
| **DDPM / DDIM** | Denoising Diffusion Probabilistic / Implicit Models | 两种扩散采样器 |
| **DiT** | Diffusion Transformer | 用 Transformer + 自适应归一化（adaLN）注入噪声档的扩散骨干 |

---

## 🎬 八幕动画：SMP 全流程 {#smp-explainer-anim}

<div class="paper-demo" data-demo="smp-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#smp-video}

<div class="paper-demo" data-demo="smp-video" data-src="media/smp_explainer_video.mp4" data-poster="media/smp_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/smp_explainer_video.mp4" download="SMP_讲解视频.mp4">下载 mp4（9.7 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」「具体实例」）按小节收起，后面的实验解读、工程意义、源码对照、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图、三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：从 DeepMimic 到 AMP，运动先验走到了哪一步</summary>

让物理仿真角色「动得像人」有三条老路（论文第 1–2 节）：

1. **手写启发式**（SIMBICON 一类）：能走，但不像人；
2. **逐帧跟踪**（DeepMimic）：像，但被绑死在一段参考轨迹上，换个任务就得配规划器挑片段；
3. **分布匹配**（GAIL / AMP）：训一个判别器回答「这段动作像不像数据集里的」，判别器的输出当风格奖励，策略可以为了任务自由组合、偏离参考 —— 这是 AMP 能「边走向目标边保持风格」的原因。

AMP 已经很好用了，但它的判别器是**对抗训练**出来的：判别器的「标准」是在和某一个策略的博弈里练出来的。
</details>

### 痛点 1：对抗先验不能复用

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么换一个新策略，判别器就得陪着重训一遍</summary>

AMP 的判别器 $D$ 学的是「把**当前这个策略**的动作和数据分开」。策略一变，负样本的分布就变，$D$ 必须跟着更新，否则：

- 新策略很快会找到 $D$ 判错的区域，**用不自然的动作骗到高分**；
- 论文把这种做法叫 **AMP-Frozen**（先用 AMP 训一个策略 + 判别器，再冻结判别器拿去训新策略）。结果很直接：Table 1 里 12 种风格的**风格准确率平均只有 0.205**（AMP 0.962），Table 2 的 Target Location 任务回报只有 **0.101**（AMP 0.737）。论文还观察到 AMP-Frozen 训练过程中判别器准确率持续下降 —— 策略在钻它的空子。

> 💡 **类比**：AMP 的判别器像一位只陪过一个学生的教练，他的打分标准是专门针对这个学生的毛病练出来的。换一个学生，老教练的标准里全是漏洞，学生很快就学会「怎么讨好他」而不是「怎么动得好」。
</details>

### 痛点 2：数据集必须「永久保留」

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每训一个新策略都要重新喂原始动捕数据</summary>

因为判别器要一直更新，**正样本（原始动作数据）必须在每一次策略训练里都在场**。再加上 DeepMimic 以来的 RSI（从数据里挑初始状态）也要读数据，结果是：

- 数据集要随代码一起长期分发、保存；
- 有隐私或版权约束的动捕数据很难这样用（论文第 10 节最后一段提到了 data privacy）；
- 每个风格都要单独整理一份「干净」的风格数据集再训一个判别器（Table 1 里的 AMP 就是这么做的）。
</details>

### 论文给出的目标：Modular + Reusable

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文对「理想运动先验」提的两个条件</summary>

论文第 1 节把理想的运动先验概括成两条：

- **Modular（模块化）**：先验是一个独立的「动作质量」目标函数，训练策略时**不需要访问原始数据集**；
- **Reusable（可复用）**：先验建好之后，**不用再训练**就能用于不同任务、不同策略。

SMP 的回答：**先验不该是一个和策略对抗的判别器，而应该是一个「只看过数据」的生成模型。** 生成模型学的是数据分布本身，和哪个策略在用它无关，所以可以冻结、复用；它还能**采样**，于是连 RSI 需要的初始状态也能自己生成。
</details>

---

## 🔧 SMP 是怎么做的？

### 核心思想：把扩散模型当奖励模型，而不是规划器

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：SMP 和「扩散做规划」「扩散做策略」的区别</summary>

扩散模型进入控制领域通常有两种用法（论文第 2 节）：

| 用法 | 代表 | 扩散模型在干什么 |
|------|------|------------------|
| 规划器 | CLoSD、InsActor | 生成未来参考轨迹，再交给低层跟踪控制器 |
| 策略本身 | Diffusion Policy、PDP、UniPhys | 直接采样动作 |
| **奖励（SMP）** | — | **只用来打分**：评估策略的动作片段离数据分布多远 |

SMP 的扩散模型**只在训练时被调用**（图 2 的虚线部分），部署时只跑策略 MLP —— 所以运行时开销和 AMP 一样（论文 6.3 节）。

和它最像的是 **SMILING**（Wu et al. 2025a，用类 VSD 的分数匹配目标训控制器），区别在于 SMILING 要为每个任务训专用扩散模型；SMP 的扩散模型是**任务无关**的，一个先验配不同的任务奖励就能复用（论文第 2 节最后一段）。
</details>

### 第一步：预训练一个任务无关的运动扩散模型

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：输入是什么、网络多大、怎么训（论文 6.1–6.2 节与附录 A）</summary>

**输入**：连续 $H = 10$ 帧的动作片段 $\mathbf{x} := (\mathbf{s} _ {t-8}, \ldots, \mathbf{s} _ {t+1})$，每帧的特征（6.1 节）：

- 根部线速度与角速度（在片段**最后一帧**的角色局部坐标系里）；
- 各关节的局部旋转（6D 表示）；
- 手、脚等末端在局部坐标系里的 3D 位置。

局部坐标系原点在骨盆，$x$ 轴对齐朝向、$y$ 轴对齐全局竖直。这套特征基本就是 AMP 判别器看的那套（MimicKit 里直接复用了 AMP 的 `compute_disc_obs`，见源码对照）。

**网络**（6.2 节、附录 A）：2 层 Transformer encoder，4 头 × 64 维 = 256 维内部宽度，用自适应归一化注入噪声档（和风格标签）；**只有约 3M 参数**，就足以拟合 100STYLE（20 多小时风格化动作）。

**训练**：标准 DDPM，噪声档数 $N = 50$，预测噪声 $\epsilon$，参数 EMA；400k–800k 次迭代，单张 RTX 4090 约 5 小时收敛。前向加噪一步到位：

$$
\mathbf{x}_i = \sqrt{\bar{\alpha}_i}\,\mathbf{x}_0 + \sqrt{1 - \bar{\alpha}_i}\,\boldsymbol{\epsilon}, \qquad \boldsymbol{\epsilon} \sim \mathcal{N}(0, I)
$$

$$
\mathcal{L}_{simple} = \mathbb{E}_{i, \mathbf{x}_0, \boldsymbol{\epsilon}} \left[ \lVert \boldsymbol{\epsilon} - f(\mathbf{x}_i) \rVert_2^2 \right]
$$

训完就**冻结**，之后任何策略训练都不再更新它。

**为什么必须是「加噪后再估分数」**（3.2 节）：分数 $\nabla _ {\mathbf{x}} \log p(\mathbf{x})$ 在数据稀疏的区域估不准 —— 而策略刚开始乱动时，它的动作恰恰落在这些区域。加足够大的噪声后，被扰动的分布铺满整个空间，分数估计变得稳健（Vincent 2011；Song et al. 2021）。这是 SMP 能给「离数据很远的动作」也提供可靠信号的根本原因，也是它比直接拿判别器更稳的地方。
</details>

### 第二步：SDS 的噪声残差当奖励

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$\hat{\epsilon} - \epsilon$ 为什么就是「修正量」，以及论文式 (7) 的指数变换</summary>

SDS（Poole et al. 2022）本来是用 2D 图像扩散模型优化 3D 表示的技巧：要最小化「被加噪的样本」与「扩散模型学到的分布」之间的 KL，梯度可以近似成

$$
\nabla \mathcal{L}_{SDS} = \mathbb{E}_{i, \boldsymbol{\epsilon}} \left[ w(i) \left( f(\mathbf{x}_i) - \boldsymbol{\epsilon} \right) \nabla \mathbf{x} \right]
$$

省掉对估计器的雅可比后，损失可以简化为 $\mathcal{L} _ {SDS} = \lVert \hat{\boldsymbol{\epsilon}} - \boldsymbol{\epsilon} \rVert_2^2$（论文式 (6)），其中 $\hat{\boldsymbol{\epsilon}} = f(\mathbf{x}_i)$。

**直觉**（论文图 3）：把策略产生的动作片段 $\tilde{\mathbf{x}}_0$ 加噪成 $\mathbf{x}_i$，扩散模型会按「数据长什么样」去猜噪声：

- 如果 $\tilde{\mathbf{x}}_0$ 本来就在数据流形上，猜出来的 $\hat{\epsilon}$ 和真加进去的 $\epsilon$ 很接近；
- 如果它偏离了流形，扩散模型会把「偏离的那部分」也当成噪声猜出来 —— $\hat{\epsilon} - \epsilon$ 就指向「从数据分布看过来的修正方向」，用它做一步反向就得到一个落在数据分布里的伪目标 $\bar{\mathbf{x}}_0$。

RL 不需要梯度，只需要一个标量奖励。SMP 用 DeepMimic 式的指数变换把它压到 $[0, 1]$（论文式 (7)）：

$$
r^{smp} = \exp\left( -w_s \lVert \hat{\boldsymbol{\epsilon}} - \boldsymbol{\epsilon} \rVert_2^2 \right)
$$

论文承认这偏离了原始 SDS 的形式，但实验上对 RL 更好用。

**但直接这么做不够**：SDS 在 3D 生成里出名地「糊」（Liang et al. 2024），此前把 SDS 用作 RL 目标的工作（Luo et al. 2024；SMILING）也都没追上对抗方法。论文第 5.1 与第 6 节的三个设计 —— ESM、AdaNorm、GSI —— 才是它能和 AMP 打平的关键。
</details>

<div class="paper-demo" data-demo="smp-sds"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第三步：集成分数匹配（ESM）—— 固定三档噪声

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：随机抽噪声档为什么在 RL 里是灾难，以及 $\mathcal{K} = \{22, 15, 8\}$ 的取舍</summary>

视觉里的 SDS 通常每次随机抽一个噪声档 $i \sim \mathcal{U}(1, N)$。放到 RL 里，问题是**奖励本身变成了随机变量**：

- 高噪声档：样本几乎是纯高斯噪声，扩散模型很容易猜对噪声 → SDS 误差**很小**，而且几乎不含「动作哪里不对」的信息；
- 低噪声档：误差**大得多**（论文图 4 的纵轴是对数刻度，跨了好几个数量级）。

同一个动作，这一步抽到高噪声奖励就高、下一步抽到低噪声奖励就低 —— 价值函数和优势估计都会被这种「与动作无关的方差」拖垮。

**ESM**：不抽了，每次都在一组固定档位上各算一次，再平均（论文式 (8)）：

$$
r^{smp} = \exp\left( -\frac{w_s}{|\mathcal{K}|} \sum_{i \in \mathcal{K}} \lVert \hat{\boldsymbol{\epsilon}}_i - \boldsymbol{\epsilon}_i \rVert_2^2 \right), \qquad \hat{\boldsymbol{\epsilon}}_i = f\left( \sqrt{\bar{\alpha}_i}\,\tilde{\mathbf{x}}_0 + \sqrt{1 - \bar{\alpha}_i}\,\boldsymbol{\epsilon}_i \right)
$$

**档位怎么选**（5.1 节、表 7）：

- 高噪声档：样本更接近扩散模型的训练分布，对 OOD 动作更可靠，适合动作离数据很远的时候；但噪声抹掉了细节，会把策略推向「平均、泛泛」的动作；
- 低噪声档：保留细节、修得更细，但对 OOD 不可靠，而且**对抖动非常敏感**；
- 中档最稳。论文所有实验都用 $\mathcal{K} = \{22, 15, 8\}$（$N = 50$）；表 7 里 $[15, 8, 1]$ 平均 0.063 m、$[43, 36, 29]$ 平均 0.098 m（Cartwheel 掉到 0.172 m）、$[22, 15, 8]$ 平均 **0.060 m** 最好。

**方差到底降了多少**（第 10 节）：同一段 HighKnees 动作评估 1024 次，不用 ESM 的方差 **1.140**，用 ESM 降到 **$9.964 \times 10^{-6}$**，均值几乎不变（1.309 vs 1.339）。表 5：单个随机档在简单技能上差不多，但 Backflip 的误差从 0.069 m 涨到 **0.195 m** —— 策略塌成「站着不动」或「往后倒」，翻不过去。
</details>

### 第四步：自适应归一化（AdaNorm）—— 每一档除以自己的均值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：不归一化时谁在说了算，以及表 6 的稳健性证据</summary>

ESM 解决了「抽哪一档」的随机性，但三档的**量级**仍然差很多：低噪声档的误差天然大，直接平均等于让最低那一档说了算。

AdaNorm（5.1 节最后一段）给每一档 $i$ 维护一个 SDS 误差的**运行均值** $\mu_i$，求和前先各自除掉：

$$
r^{smp} = \exp\left( -\frac{w_s}{|\mathcal{K}|} \sum_{i \in \mathcal{K}} \frac{\lVert \hat{\boldsymbol{\epsilon}}_i - \boldsymbol{\epsilon}_i \rVert_2^2}{\mu_i} \right)
$$

> ⚠️ 论文式 (8) 本身没有写 $\mu_i$，归一化是正文一句话描述的；上面这个合并写法是我按 MimicKit 的 `_calc_smp_rewards` 整理的（先除以 `DiffNormalizer` 的均值、再对档位求平均、再乘 `sds_loss_scale` 取指数）。

好处有两个：

1. **三档话语权拉平**：每档归一化后都在 1 附近，谁也不压过谁（下面的具体实例里，「顺拐」那个动作三档的占比从 15% / 30% / 55% 变成 32% / 34% / 35%）；
2. **换先验、换风格不用重调 $w_s$**：不同随机种子训出来的扩散模型、不同风格，SDS 误差的绝对尺度都不一样。表 6 用 3 个**独立训练的扩散模型**各训一次：不加 AdaNorm 平均误差 **0.176 m**（Cartwheel 0.177 ± 0.115、Backflip 0.279 ± 0.110，方差很大），加上之后 **0.057 m**。
</details>

<div class="paper-demo" data-demo="smp-esm"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第五步：生成式状态初始化（GSI）—— 连初始状态都由先验生成

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：RSI 为什么也要数据集，GSI 怎么替它，以及 FID / Coverage 的证据</summary>

DeepMimic 证明了 **RSI**（从参考数据里随机挑一帧当回合起点）对探索至关重要。可 RSI 本身就要读数据集 —— 只换掉奖励还不够「模块化」。

SMP 的扩散模型是生成模型，可以**采样**。GSI（6.4 节）：训练策略时，初始状态直接从这个扩散模型里采。于是同一个 SMP 身兼两职：**奖励函数 + 初始状态分布**，原始数据集在先验训好之后就可以彻底丢掉。

**效果**（第 10 节、图 12–13）：

- Target Location 与 Dodgeball 两个任务上，GSI 的样本效率和最终表现与 RSI 相当，都明显好于从 T-pose 开始；
- 用一个 VAE 编码器当特征提取器，比较 4096 个 GSI 样本和 4096 个真实样本：HighKnees / Aeroplane / SpinClock 的 FID 分别是 **0.0922 / 0.0998 / 0.1997**，Coverage@1 是 **93.3% / 90.7% / 89.3%**。SpinClock 这种难的模式差一些，但第 8.1 节的风格策略照样训得出来。

**局限**（第 11 节）：原版 GSI 可能采出自碰撞之类的非法动作，会让仿真不稳；作者建议以后配合引导采样去掉非法状态，甚至用来做难样本挖掘。
</details>

### 第六步：一个先验，100 + N 种风格

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：CFG 把通用先验变成风格先验，掩码组合拼出数据里没有的风格</summary>

**CFG 拆风格**（8.1 节）：在整个 100STYLE（100 种风格、20 多小时）上训一个**风格条件**扩散模型 $f(\mathbf{x}_i, c)$，然后用无分类器引导得到任意一种风格的先验：

$$
f_{style} = f(\mathbf{x}_i, \varnothing) + w_{cfg} \left( f(\mathbf{x}_i, c_{style}) - f(\mathbf{x}_i, \varnothing) \right)
$$

论文发现 **$w _ {cfg} = 1.0$ 一般就够了**（即直接用条件预测）。表 1 的 12 种风格、Target Location 任务：

| | AMP（每种风格单独整理数据、单独训判别器） | AMP-Frozen | **SMP（一个先验 + CFG）** |
|---|---|---|---|
| 任务回报（平均） | 0.874 | 0.771 | **0.879** |
| 风格准确率（平均） | 0.962 | 0.205 | **0.962** |

SMP 最弱的是 Skip（风格准确率 0.646 ± 0.350），AMP 最弱的是 HandsBetweenLegs（0.690 ± 0.198）。

**掩码组合新风格**（8.1 节、附录 E）：上半身特征取 AeroPlane 的预测、下半身取 HighKnees 的预测，在 $\epsilon$ 空间拼起来：

$$
f_{comp} = M_{upper} \odot f(\mathbf{x}_i, c_{aeroplane}) + M_{lower} \odot f(\mathbf{x}_i, c_{highknees})
$$

$f _ {comp}$ 既当奖励、也给 GSI 生成初始状态，策略就能「张开双臂 + 高抬腿」地去完成任务 —— 数据集里**没有**这种风格。论文还拼了 Elated + FlickLegs、GracefulArms + Spin（像交谊舞）。

**风格差太远时**：直接拼会「稀释」风格（拼出来的分数不对应一个能平滑实现的动作）。附录 E 的办法是 **MSM**：用 DDIM 做 3 步、步长 2 的部分反向去噪来估 $\hat{\epsilon}$，多步过程会把拼接的分数揉顺，估计也更准；代价是 AeroPlane + HighKnees 要在 4090 上训约 16 小时。
</details>

<div class="paper-demo" data-demo="smp-style"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 训练流程（论文 Algorithm 1）

<div class="mermaid">
flowchart LR
    D["动作数据集<br/>(只用一次)"] --> P["预训练扩散模型 f<br/>2 层 Transformer / 3M 参数<br/>N = 50, 预测 ε"]
    P -->|"冻结"| F["SMP 先验 f (+ 风格 c)"]
    F -->|"GSI 采样"| I["初始状态"]
    I --> E["仿真环境 + 策略 π"]
    E --> W["10 帧动作窗口 x̃"]
    W --> S["ESM: i ∈ {22, 15, 8}<br/>加噪 → f 预测 ε̂"]
    F -.-> S
    S --> N["AdaNorm: 除以 μ_i<br/>求平均 → exp(-w_s ·)"]
    N --> R["r = w_prior · r_smp + w_g · r_task"]
    E -->|"任务奖励 r_task"| R
    R --> U["PPO 更新 π 与 V"]
    U --> E
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Algorithm 1 的文字版与几条实现细节</summary>

1. 加载预训练扩散模型 $f$（可选风格标签 $c$），初始化策略 $\pi$、价值函数 $V$；
2. 用 $\pi$ 采一批轨迹，记录每一步的动作窗口 $\tilde{\mathbf{x}} _ {t+1}$；
3. 对每一步、每个 $i \in \mathcal{K}$：采 $\epsilon_i$，算 $\hat{\epsilon}_i = f(\sqrt{\bar{\alpha}_i}\tilde{\mathbf{x}} _ {t+1} + \sqrt{1-\bar{\alpha}_i}\epsilon_i, c)$；
4. 按式 (8) 算 $r_t^{smp}$，与任务奖励线性组合 $r_t = w^{prior} r_t^{smp} + w^g r_t^g$（式 (9)，沿用 AMP 的做法）；
5. PPO 更新策略（GAE($\lambda$) 优势），TD($\lambda$) 更新价值函数；**扩散模型始终不更新**。

策略输入里**没有相位变量、也没有参考目标**（6.3 节）—— 它不跟踪任何特定片段，这一点和 AMP 一样、和 DeepMimic / ADD 不同。动作是 PD 目标角，球关节用 3D 指数映射。

训练成本（6.3 节）：单段动作（如 spinkick）约 30 分钟；HighKnees 风格的 Target Location 跑 6 亿样本要 11.5 小时，AMP 是 6.2 小时 —— SMP 用的是覆盖 100 种风格的大先验，每步要跑 3 次扩散网络，而 AMP 是一个风格专用的小判别器。部署时两者一样快，因为只跑策略。
</details>

---

## 🚶 具体实例：用「顺拐」手算一遍 SMP 奖励

<h3 id="smp-pipeline">端到端流程图（MimicKit 默认 SMP location 任务）</h3>

<div class="mermaid">
flowchart TB
    A["先验：smp_prior_lafan.pt<br/>(LaFAN1 跑步子集预训练)"] --> B["SMPAgent._build_prior_model()<br/>TinyMDMModel，requires_grad=False"]
    B --> G["GSI：DDPM 采 4096 条 10 帧窗口<br/>每 50 iter 再生 1024 条"]
    G --> C["Isaac Gym<br/>4096 并行 env（README 命令）"]
    C --> D["obs → Actor π<br/>fc_2layers_1024units, σ = 0.05"]
    D --> C
    C --> E["disc_obs：10 帧 × 114 维<br/>(复用 AMP 的 compute_disc_obs)"]
    E --> F["ESM_SDS_loss(t_lst = [22, 15, 8])"]
    F --> H["DiffNormalizer：÷ 各档均值<br/>mean → exp(-6 ·)"]
    C --> T["task reward<br/>exp(-0.5 · 到目标距离²)"]
    H --> R["r = 0.5 · r_task + 0.5 · r_smp"]
    T --> R
    R --> P["PPO：clip 0.2, λ 0.95, γ 0.99"]
    P --> D
</div>

> 关键反差：AMP 的奖励来自一个**还在训练**的判别器；SMP 的奖励来自一个**已经冻结**的扩散模型 —— 策略换了、任务换了，这个打分函数一个参数都不动。「每帧 114 维」是我按 MimicKit 源码推算的（见源码对照第 2 节）。

### MimicKit 默认 yaml 关键超参

来源：[`smp_task_humanoid_agent.yaml`](https://github.com/xbpeng/MimicKit/blob/main/data/agents/smp_task_humanoid_agent.yaml) + [`smp_location_humanoid_env.yaml`](https://github.com/xbpeng/MimicKit/blob/main/data/envs/smp_location_humanoid_env.yaml) + [`tinymdm_multi_clip.yaml`](https://github.com/xbpeng/MimicKit/blob/main/tools/diffusion_model/config/tinymdm_multi_clip.yaml)（MimicKit `main`，commit `2ed1e6c`，2026-06-23）。

| 项 | 取值 | 对照 / 说明 |
|----|------|------|
| `diffusion_steps` | **[22, 15, 8]** | 论文 $\mathcal{K}$ |
| `sds_loss_scale` | **6** | 论文 $w_s$；论文按任务取 4–8（见附录 B） |
| `task_reward_weight` / `smp_reward_weight` | 0.5 / 0.5 | 论文 Steering 同为 0.5 / 0.5；Target Location 是 0.7 / 0.9 |
| `sds_normalizer_samples` | 1e8 | AdaNorm 只在前 1 亿个样本里更新均值，之后冻结 |
| `enable_gsi` | **True** | 单段模仿配置 `smp_humanoid_agent.yaml` 是 False |
| `gsi_buffer_size` / `gsi_regen_num_motions` / `gsi_iters` | 4096 / 1024 / 50 | 代码默认值 |
| `num_disc_obs_steps` | 10 | 论文 $H = 10$ |
| `global_obs` / `root_height_obs` | False / True | 局部坐标系，根高度单独给 |
| 扩散模型 `T` / 噪声表 | 50 / `squaredcos_cap_v2` | 余弦噪声表 |
| `num_layers` / `num_attention_heads` | 2 / 4（× 64） | 论文附录 A |
| `loss_type` | **`l1`** | 论文式 (4) 写的是 L2 |
| `num_iterations` | 200,000 | 论文说 400k–800k |
| Actor / Critic | `fc_2layers_1024units` | 论文附录 A 写的是 [1024, 512] |
| 优化器 | SGD lr 1e-4 | 论文表 8：步长 1e-4、动量 0.9 |

---

下面用一个**二维玩具**把「SDS 误差 → ESM → AdaNorm → 奖励」完整算一遍。动画第 3–5 幕和上面两个实验台用的是**同一组数**。

<h3 id="第-0-步一个只有两维的动作流形">第 0 步：一个只有两维的「动作流形」</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：「左臂摆角 × 右腿摆角」，自然走路时两者高度相关</summary>

真实的动作特征有上千维（MimicKit 里 10 帧 × 114 维），这里只留两维，都做了标准化（MimicKit 的扩散模型输入同样先过 `Normalizer`）：

- $x_1$：左臂前后摆角
- $x_2$：右腿前后摆角

人走路时手脚是**对侧**协调的：左臂向前时右腿也向前。所以「数据」是一个相关系数 $\rho = 0.95$ 的高斯：

$$
\mathbf{x}_0 \sim \mathcal{N}\left( \mathbf{0}, \begin{bmatrix} 1 & 0.95 \\ 0.95 & 1 \end{bmatrix} \right)
$$

它的两条主轴：沿着流形的 $\mathbf{u}_1 = (1, 1)/\sqrt{2}$，方差 $\lambda_1 = 1.95$；垂直于流形的 $\mathbf{u}_2 = (1, -1)/\sqrt{2}$，方差只有 $\lambda_2 = 0.05$ —— 一条很细的椭圆，这就是「自然动作只占特征空间里很薄的一层」。

两个待评估的动作：

| 动作 | $(x_1, x_2)$ | 沿流形 $d_1$ | 离流形 $d_2$ |
|------|------|------|------|
| A：自然摆臂 | (0.8, 0.8) | 1.131 | 0 |
| B：顺拐（左臂向前、右腿向后） | (0.8, −0.8) | 0 | 1.131 |

两个动作离原点一样远，**区别只在方向**：A 顺着流形，B 横穿流形。
</details>

<h3 id="第-1-步三档噪声各自的-alpha-bar">第 1 步：三档噪声各自的 $\bar{\alpha}$</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：余弦噪声表下，$t = 22 / 15 / 8$ 分别保留多少信号</summary>

MimicKit 用 diffusers 的 `squaredcos_cap_v2`，$T = 50$：

$$
\bar{\alpha}_t = \frac{g\left(\frac{t+1}{T}\right)}{g(0)}, \qquad g(u) = \cos^2\left( \frac{u + 0.008}{1.008} \cdot \frac{\pi}{2} \right)
$$

| 档 $t$ | $\bar{\alpha}_t$ | 信号占比 $\sqrt{\bar{\alpha}_t}$ | 噪声占比 $\sqrt{1 - \bar{\alpha}_t}$ |
|---|---|---|---|
| 22（高） | 0.556 | 0.746 | 0.666 |
| 15（中） | 0.761 | 0.872 | 0.489 |
| 8（低） | 0.917 | 0.957 | 0.289 |

（diffusers 的档号从 0 开始，论文写的是 $i \in \{1, \ldots, N\}$；两者是否差一档论文没有说明，这里按代码的 0 起下标算。）
</details>

<h3 id="第-2-步理想去噪器下的-sds-误差">第 2 步：理想去噪器下的 SDS 误差</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据是高斯时，最优 $\hat{\epsilon}$ 有闭式解，SDS 误差的期望也能手算</summary>

数据是高斯时，「训练到最优」的去噪器有闭式解（这是玩具模型的简化，真实 SMP 是一个学出来的 DiT）：

$$
\hat{\boldsymbol{\epsilon}}(\mathbf{x}_t) = \mathbb{E}[\boldsymbol{\epsilon} \mid \mathbf{x}_t] = \sqrt{1 - \bar{\alpha}_t}\,\left( \bar{\alpha}_t \Sigma + (1 - \bar{\alpha}_t) I \right)^{-1} \mathbf{x}_t
$$

沿主轴 $k$ 展开、对 $\epsilon$ 取期望，可以推出（我的推导）：

$$
\mathbb{E}_{\epsilon}\left[ (\hat{\epsilon} - \epsilon)_k^2 \right] = \frac{\bar{\alpha}_t (1 - \bar{\alpha}_t)\, d_k^2 + \bar{\alpha}_t^2 \lambda_k^2}{\left( \bar{\alpha}_t \lambda_k + 1 - \bar{\alpha}_t \right)^2}
$$

- 分子第一项随偏离 $d_k$ 平方增长 —— 这是「动作哪里不对」的信号；
- 分子第二项是**底噪**：就算动作完全在数据上，扩散模型也猜不准具体是哪条数据，误差不会是 0；
- 分母里的 $\lambda_k$ 是关键：**离流形的方向 $\lambda_2 = 0.05$ 很小，分母小，同样的偏离被放大很多**；沿流形 $\lambda_1 = 1.95$ 大，偏离几乎不受罚。

SDS 误差取两维的平均（和 MimicKit 的 `torch.mean(pred_err ** 2)` 一样是均值不是求和）。代入：

| 档 $t$ | A（自然）$\mathcal{L}_t$ | B（顺拐）$\mathcal{L}_t$ | B 比 A |
|---|---|---|---|
| 22 | 0.321 | 0.963 | 3.0× |
| 15 | 0.419 | 1.896 | 4.5× |
| 8 | 0.533 | 3.451 | 6.5× |

两件事一眼可见：

1. **噪声越低，误差越大**（论文图 4 的形状）；
2. **噪声越低，越能把 A 和 B 分开**（3.0× → 6.5×）—— 但低噪声档在真实网络上对 OOD 和抖动也最敏感，所以 ESM 取中间三档、而不是只用最低那档。

如果只用一档（论文式 (7)、$t = 22$）且不归一化，$r^{smp} = \exp(-6 \times 0.321) = 0.146$ vs $\exp(-6 \times 0.963) = 0.003$。

**修正方向**：对 $\epsilon$ 取期望后，B 在 $t = 22$ 的残差全在离流形的 $\mathbf{u}_2$ 方向（大小 1.192，沿流形分量为 0）；用 $\epsilon = 0$ 那一次反推的伪目标 $\bar{\mathbf{x}}_0$ 在 $\mathbf{u}_2$ 上只剩 **0.067**（原来是 1.131）—— 几乎被拉回了流形上。A 的残差只沿 $\mathbf{u}_1$，大小 0.368。
</details>

<h3 id="第-3-步adanorm每档除以自己的均值">第 3 步：AdaNorm，每档除以自己的均值</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：用「训练初期手脚各摆各的」当 $\mu_t$，算出三档归一化误差</summary>

MimicKit 的 $\mu_t$ 是**策略自己**历史 SDS 误差的累计均值。手算时把它固定成训练初期的水平：初始策略手脚各摆各的，$\mathbf{x} \sim \mathcal{N}(\mathbf{0}, I)$，于是 $\mathbb{E}[d_k^2] = 1$，代入第 2 步的公式：

| 档 $t$ | $\mu_t$ | A：$\mathcal{L}_t / \mu_t$ | B：$\mathcal{L}_t / \mu_t$ |
|---|---|---|---|
| 22 | 0.861 | 0.373 | 1.119 |
| 15 | 1.595 | 0.263 | 1.189 |
| 8 | 2.820 | 0.189 | 1.223 |
| **三档平均** | | **0.275** | **1.177** |

B 的原始误差里，$t = 8$ 一档就占了总和的 55%（三档 15% / 30% / 55%）；归一化后变成 32% / 34% / 35%，**三档说话一样大声**。B 的三个归一化值都略大于 1：比「初期乱摆」还差一点 —— 顺拐恰好是最不像走路的那种协调方式。
</details>

<h3 id="第-4-步指数变换得到奖励">第 4 步：指数变换得到奖励</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$w_s = 6$ 时，A 和 B 的 $r^{smp}$ 差两百多倍</summary>

$$
r^{smp}_A = \exp(-6 \times 0.275) = 0.192, \qquad r^{smp}_B = \exp(-6 \times 1.177) = 0.0009
$$

接上 MimicKit 默认的组合 $r = 0.5\, r^{task} + 0.5\, r^{smp}$。假设两种走法到目标点的进度一样，$r^{task} = 0.8$：

$$
r_A = 0.5 \times 0.8 + 0.5 \times 0.192 = 0.496, \qquad r_B = 0.4 + 0.5 \times 0.0009 = 0.400
$$

每一步差 0.096，PPO 自然会把「顺拐」的动作概率压下去 —— **这个打分函数从头到尾没有被训练过一次**，它只是读出了扩散模型对「自然走路」的认识。

注意 A 的奖励也只有 0.192，不是 1：归一化误差有底噪（第 2 步分子第二项）。论文的奖励权重和 $w_s$ 都是在这种量级上调出来的，README 给的调参优先级是 `smp_reward_weight > sds_loss_scale >= diffusion_steps`。
</details>

<h3 id="第-5-步为什么不能随机抽一档">第 5 步：为什么不能随机抽一档</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：同一个 B 动作，随机档 vs 固定三档的方差</summary>

如果每次从 $t \in \{0, \ldots, 49\}$ 里随机抽一档（视觉 SDS 的常规做法），B 的 SDS 误差会在接近 0（$t = 49$）到 3.80（$t = 5$）之间乱跳：

| 评估方式 | 均值 | 方差 |
|---|---|---|
| 随机抽一档 | 1.230 | 1.567 |
| ESM 固定 $\{22, 15, 8\}$ | 2.103 | $3.17 \times 10^{-4}$ |

两者差了约 4900 倍。随机档的方差几乎全来自「抽到哪一档」；ESM 的方差只剩「每档里那次 $\epsilon$ 的随机性」，而且被上千维平均掉了（这里按 1140 维推算）—— 和论文 HighKnees 的 $1.140 \to 9.964 \times 10^{-6}$ 是同一个现象。

玩具里两种方式的**均值**差得多（K 偏向中低噪声档），论文那条 HighKnees 的均值几乎一样（1.309 vs 1.339）；数值不能和论文直接比，**能比的是方差差了几个数量级**。
</details>

---

## 📊 实验结果怎么读

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：一个先验多个任务 / 单段模仿基准 / 交互、起身与真机 / 消融汇总</summary>

<h3 id="一个先验多个任务表-2">一个先验，多个任务（表 2）</h3>

先验在 LaFAN1 的一个跑步子集上训一次，然后**原封不动**地训三个任务的策略；Target Speed 用的先验只看过 walk / jog / run 三段、总共约 3 秒的数据：

| 数据 | 任务 | 无先验 | AMP | AMP-Frozen | **SMP** |
|------|------|------|------|------|------|
| LaFAN1 | Steering | 0.901 | 0.634 | 0.243 | **0.914** |
| LaFAN1 | Target Location | 0.615 | 0.737 | 0.101 | **0.793** |
| LaFAN1 | Dodgeball | 0.277 | 0.233 | 0.204 | **0.733** |
| Walk-Jog-Run | Target Speed | 0.905 | 0.904 | 0.158 | **0.918** |

- **Dodgeball** 最能说明问题：数据里只有跑步，球 8–10 m 外以 20–25 m/s 飞来，反应时间不到 0.5 s。SMP 的策略自己长出了跳跃、闪躲；AMP 学不出来（论文推测是要的技能离数据太远，对抗目标不稳）。
- **无先验**的任务回报不低，但动作不自然；图 7 的学习曲线里 SMP 收敛更快，论文推测是因为**奖励函数是平稳的**（AMP 的判别器一直在变）。
- **Target Speed** 只有 3 段离散速度的数据，策略却能在 1.2–6.8 m/s 连续调速，并自然地在走 / 慢跑 / 跑之间过渡（8.5 节）。

<h3 id="单段模仿基准表-4">单段模仿基准（表 4）</h3>

不加任务奖励，只模仿一段动作，指标是 DTW 对齐后的位置误差（m，越小越好；DeepMimic 关掉了 pose termination 以保持评测一致）：

| 技能 | DeepMimic | AMP | AMP-Frozen | SMILING | **SMP** |
|------|------|------|------|------|------|
| Walk | 0.010 | 0.028 | 0.044 | 0.042 | 0.030 |
| Run | 0.013 | 0.088 | 0.129 | 0.115 | 0.067 |
| Spinkick | 0.073 | 0.049 | 0.324 | 0.088 | 0.059 |
| Cartwheel | 0.243 | 0.043 | 0.419 | 0.104 | 0.043 |
| Backflip | 0.073 | 0.058 | 0.272 | 0.144 | 0.069 |
| Crawl | 0.006 | 0.011 | 0.285 | 0.061 | 0.011 |
| **平均** | 0.070 | **0.046** | 0.246 | 0.092 | **0.046** |

SMP 与 AMP 平均打平，但训练时**不碰参考数据**（单段配置里 GSI 是关的，初始状态仍来自那段动作，见源码对照）；稳定好于 SMILING 和 AMP-Frozen。图 10 里每个 SMP 种子用的是**不同种子训的扩散模型**，说明结论不依赖某一个先验。

<h3 id="人物交互起身与真机">人–物交互、起身与真机</h3>

- **搬箱子 / 上下楼梯**（8.3 节）：扩散模型联合建模角色和物体（或楼梯）的状态，同一套 SDS 奖励就能衡量「人和物的配合自不自然」。表 3：Object Carry 回报 0.909、成功率 99.7%；搬箱子任务还用了风格奖励截断 $\min(r^{smp}, \lambda_t)$，防止动捕里不精确的手–箱接触压过任务。
- **起身**（8.4 节）：只用「头部高度 + 竖直速度」两项任务奖励 + SMP，不写任何手工正则，成功率 99.8%；角色会翻身、撑手、站起。注意这个任务 90% 的初始状态来自参考起身动作，并不是完全不碰数据（附录 D.5）。
- **Unitree G1 真机**（第 9 节）：策略只看 67 维本体感受（根旋转 6 + 根角速度 3 + 29 个关节角 + 29 个关节速度），价值函数和 SMP 用特权信息（非对称 actor-critic），加域随机化与推搡；真机上能稳健行走、被推后自动调整步幅，还能做 spinkick。

<h3 id="消融汇总表-5表-7">消融汇总（表 5–7、图 12）</h3>

| 消融 | 关掉之后 | 用上之后 |
|------|------|------|
| ESM（表 5，平均） | 随机档 0.105 m（Backflip 0.195） | 固定三档 **0.060 m** |
| 档位选择（表 7，平均） | [15, 8, 1] 0.063 / [43, 36, 29] 0.098 | [22, 15, 8] **0.060 m** |
| AdaNorm（表 6，平均） | 0.176 m，跨扩散模型方差大 | **0.057 m** |
| 初始化（图 12） | T-pose 样本效率最差 | GSI ≈ RSI |

**论文自己承认的局限**（第 11 节）：

1. **模式坍缩**：SMP 和其他 mode-seeking 目标一样，策略容易收敛到少数几种技能，数据集越大越明显；
2. **GSI 可能采出非法状态**（自碰撞等）；
3. 训练比 AMP 慢（11.5 h vs 6.2 h），风格组合用 MSM 更慢（约 16 h）。
</details>

---

## 🤖 SMP 对人形机器人领域的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 节）：奖励模型可以「预训练 + 分发」/ 和 AMP、ADD 的分工 / 对机器人的启发</summary>

<h3 id="1-奖励模型第一次可以预训练分发">1. 「风格奖励」第一次可以像模型权重一样预训练、分发</h3>

AMP 之后，运动先验一直是「训练过程的一部分」：每个项目都要带着数据集、带着判别器重来一遍。SMP 把它变成了一个**冻结的权重文件**（MimicKit 里就是 `smp_prior_lafan.pt`）：下游只需要这个文件和自己的任务奖励。这和视觉里「拿一个预训练扩散模型做 SDS」是同一种范式迁移。

<h3 id="2-和-ampadd-的分工">2. 和 AMP、ADD 的分工</h3>

| | AMP | ADD | **SMP** |
|------|------|------|------|
| 打分器 | 判别器（对抗训练） | 差分判别器（对抗训练） | 扩散模型（预训练后冻结） |
| 打分对象 | 动作片段像不像数据 | 与参考帧的差像不像 0 | 加噪片段的噪声能不能被猜对 |
| 跟踪特定片段 | 否 | 是（相位对齐） | 否 |
| 训练策略时要数据 | 要 | 要 | **不要**（配 GSI） |
| 一个打分器复用到新策略 | 不行（AMP-Frozen 失败） | 不行 | **行** |

ADD 解决的是「跟踪 reward 要手调」，SMP 解决的是「风格先验不能复用」—— 两者都在 MimicKit 里，可以看成 xbpeng 组对 AMP 两个短板的分头修补（这是我的归纳）。

<h3 id="3-对机器人的启发">3. 对机器人的启发</h3>

- 真机项目经常受数据授权约束，「先验训好就丢数据」对工业团队很实际；
- 同一个先验配多个任务奖励（行走、避障、起身）意味着一套「像人」的标准贯穿所有技能；
- 论文的 G1 实验只是行走与恢复，SMP 在更高维、更接触密集的机器人技能上能否保持优势，论文没有给出证据。
</details>

---

## 📁 MimicKit 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（9 节）：源码类图 / 源码运行时序图 / 1. SMPAgent 继承 PPOAgent / 2. 运动特征复用 AMP 的 disc_obs / 3. ESM_SDS_loss / 4. DiffNormalizer 就是 AdaNorm / 5. 奖励合成 / 6. GSI / 7. 先验怎么训 / 8. 论文 vs 源码差异表 / 9. 训练与测试命令</summary>

以下基于 MimicKit `main` 分支 commit `2ed1e6c`（2026-06-23），只摘与 SMP 有关的部分。

<h3 id="smp-源码类图">源码类图：SMP = PPO + 一个冻结的打分器</h3>

<div class="mermaid">
classDiagram
    class PPOAgent {
        ppo_agent.py
        +_build_train_data()
        +_train_iter()
    }
    class SMPAgent {
        smp_agent.py
        #_build_prior_model() 加载并冻结
        #_compute_rewards() task 与 smp 线性组合
        #_calc_smp_rewards() ESM + AdaNorm + exp
        #_generate_init_states() GSI
    }
    class TinyMDMModel {
        tinymdm_model.py
        +ESM_SDS_loss(norm_x_obs, t_lst)
        +sample_ema() GSI 采样
        +forward() 训练用扩散 loss
    }
    class DiffNormalizer {
        diff_normalizer.py
        记录 abs(L) 的累计均值
    }
    class AMPEnv {
        amp_env.py
        +compute_disc_obs()
    }
    class SMPEnv {
        smp_env.py
        +init_gsi_buffer()
        +add_gsi_samples()
    }
    PPOAgent <|-- SMPAgent : 继承
    SMPAgent o-- TinyMDMModel : _prior_model（冻结）
    SMPAgent o-- DiffNormalizer : _sds_normalizer
    AMPEnv <|-- SMPEnv : 继承
    SMPAgent ..> SMPEnv : GSI 样本写回 env
</div>

- 和 AMP 的类图对比：**没有判别器、没有判别器 loss、没有 replay buffer**。`SMPModel` 只是一个空壳的 `PPOModel` 子类；SMP 的所有改动都在「奖励怎么算」和「初始状态从哪来」两处。
- env 侧继承 `AMPEnv`：因为 SMP 要的 10 帧动作窗口，和 AMP 判别器的 `disc_obs` 是同一个东西。

<h3 id="smp-源码运行时序图">源码运行时序图</h3>

<div class="mermaid">
sequenceDiagram
    autonumber
    participant R as run.py
    participant AG as SMPAgent
    participant PM as TinyMDMModel<br/>(冻结)
    participant DN as DiffNormalizer
    participant E as SMPEnv + Isaac Gym
    R->>AG: build_agent()：agent_name "SMP"
    AG->>PM: load_state_dict(smp_prior_model)，requires_grad=False
    AG->>PM: sample_ema(DDPM) → 4096 条 10 帧窗口
    AG->>E: init_gsi_buffer()：末帧当角色状态，10 帧填判别历史
    loop 每轮迭代 _train_iter()
        loop rollout steps_per_iter = 32
            AG->>E: step(a_t)
            E-->>AG: task reward、disc_obs（10 帧窗口）
        end
        AG->>PM: normalize(disc_obs) → ESM_SDS_loss(t_lst=[22,15,8])
        PM-->>AG: sds_losses（batch × 3）
        AG->>DN: record → normalize：每档 ÷ 累计均值
        AG->>AG: r_smp = exp(−6 · mean)；r = 0.5 r_task + 0.5 r_smp
        AG->>AG: PPO 更新 actor / critic
        AG->>DN: update()（前 1e8 个样本）
        AG->>PM: 每 50 iter：再采 1024 条 → add_gsi_samples()
    end
</div>

<h3 id="1-smpagent-继承-ppoagent">1. SMPAgent 直接继承 PPOAgent，先验加载后冻结</h3>

```python
# mimickit/learning/smp_agent.py
class SMPAgent(ppo_agent.PPOAgent):
    def _build_prior_model(self, agent_config):
        ...
        self._prior_model = TinyMDMModel(config, self._device)
        prior_state_dict = torch.load(model_path, map_location=self._device)
        self._prior_model.load_state_dict(prior_state_dict)

        self._prior_model.eval()
        for p in self._prior_model.parameters():
            p.requires_grad = False
```

注意它继承的是 `PPOAgent` 而不是 `AMPAgent` —— 没有任何对抗训练的代码路径。`_check_prior_env_config()` 还会逐项核对先验训练时的 env 配置（`global_obs`、`root_height_obs`、`num_disc_obs_steps`、key body 数、控制频率）和当前 env 一致，不一致直接 assert：**先验的输入特征必须和训练它时一模一样**，这是「可复用」的前提条件。

<h3 id="2-运动特征复用-amp-的-disc_obs">2. 运动特征 = AMP 的 disc_obs</h3>

```python
# tools/diffusion_model/motion_prior_dataset.py
from envs.amp_env import compute_disc_obs
```

先验的训练数据和 RL 时的打分输入，都走 `amp_env.compute_disc_obs`：根位置（`root_height_obs: True` 时 $z$ 用绝对高度）、根旋转 6D、14 个关节旋转 6D、5 个 key body（头、双手、双脚）相对根的位置、根线速度、根角速度。按 `humanoid.xml` 的 15 个刚体推算，**每帧 3 + 6 + 84 + 15 + 3 + 3 = 114 维，10 帧共 1140 维**（我的推算，没有实际跑代码打印）。

<h3 id="3-esm_sds_loss固定档位逐档算">3. ESM_SDS_loss：固定档位，逐档算</h3>

```python
# mimickit/learning/tinymdm/tinymdm_model.py
@torch.no_grad()
def ESM_SDS_loss(self, norm_x_obs, t_lst=None, **kwargs):
    denoiser = self._get_sampling_denoiser(use_ema=self.model_ema, cfg_scale=kwargs.get("cfg_scale", 1.0))
    sds_losses = []
    for t_value in t_lst:
        t = torch.full((bsz,), t_value, dtype=torch.long, device=device)
        current_noise = torch.randn_like(norm_x_obs)
        noised_x_obs = self.diffusion_scheduler.add_noise(norm_x_obs, current_noise, t)
        _pred = denoiser(noised_x_obs.clone(), timestep=t, **kwargs)
        re = self.ddim_scheduler.step(_pred, t_value, noised_x_obs)
        x_0_pred = re.pred_original_sample
        eps_pred = self._get_epsilon(t=t, x_noised=noised_x_obs, pred_x_start=x_0_pred)
        pred_err = eps_pred - current_noise
        mean_squared_error = torch.mean((pred_err) ** 2, dim=list(range(1, noised_x_obs.dim())))
        sds_losses.append(mean_squared_error)
    return torch.stack(sds_losses, dim=1)   # (batch, |K|)
```

（为便于阅读，上面合并了几行临时变量。）三处值得注意：

- **每档独立采一次 $\epsilon$**，对应论文式 (8) 的 $\epsilon_i$；
- $\hat{\epsilon}$ 不是网络输出直接拿来用，而是「先用 DDIM 一步反推 $\hat{\mathbf{x}}_0$，再用 `_get_epsilon` 换回 $\epsilon$」。在 `estimate_mode: 'epsilon'` 下这和直接用网络输出在数学上等价（我的推算：$\hat{\mathbf{x}}_0 = (\mathbf{x}_t - \sqrt{1-\bar{\alpha}}\hat{\epsilon})/\sqrt{\bar{\alpha}}$ 代回去就是 $\hat{\epsilon}$，且 `clip_sample=False`）；这样写的好处是换成 $\mathbf{x}_0$ 或 v 预测的扩散模型也能直接用；
- 误差是**逐维均值**（MSE），不是论文式子里的平方和；两者差一个维数常数，会被 AdaNorm 吸收（我的推断）。

<h3 id="4-diffnormalizer-就是-adanorm">4. DiffNormalizer 就是 AdaNorm</h3>

```python
# mimickit/learning/diff_normalizer.py
def record(self, x):
    self._new_count += x.shape[0]
    self._new_sum_abs += torch.sum(torch.abs(x), axis=0)

def normalize(self, x):
    diff = torch.clamp_min(self._mean_abs, self._min_diff)
    return torch.clamp(x / diff, -self._clip, self._clip)
```

这个类 ADD 也在用（归一化差分向量）；SMP 拿它按档（`shape=[len(diffusion_steps)]`）记 $\lvert \mathcal{L}_i \rvert$ 的**累计**均值：新旧样本按计数加权，不是滑动窗口。任务配置 `sds_normalizer_samples: 100_000_000`，前 1 亿个样本之后均值就冻结；单段配置没写这个键，默认 `np.inf`，一直更新。

<h3 id="5-奖励合成">5. 奖励合成：exp 之后再线性组合</h3>

```python
# mimickit/learning/smp_agent.py
def _calc_smp_rewards(self, norm_disc_obs):
    sds_losses = self._prior_model.ESM_SDS_loss(norm_x_obs=..., t_lst=self._diffusion_steps)
    if (self._need_sds_normalizer_update()):
        self._sds_normalizer.record(sds_losses)
    sds_losses_norm = self._sds_normalizer.normalize(sds_losses)     # (bsz, 3)
    mean_sds_loss_norm = torch.mean(sds_losses_norm, dim=-1)         # (bsz,)
    smp_r = torch.exp(-mean_sds_loss_norm * self._sds_loss_scale)
    smp_r = smp_r * self._smp_reward_scale

def _compute_rewards(self):
    task_r = self._exp_buffer.get_data_flat("reward")
    ...
    r = self._task_reward_weight * task_r + self._smp_reward_weight * smp_r
    self._exp_buffer.set_data_flat("reward", r)
```

奖励在 rollout **结束后**整批计算（`_build_train_data` 里），按 `smp_eval_batch_size: 4096` 分块过扩散网络，全程 `torch.no_grad()`。具体实例第 3–4 步的手算顺序就是照这段代码排的：先除以均值、再三档平均、再乘 6 取指数、最后和任务奖励 0.5 / 0.5 组合。

<h3 id="6-gsi">6. GSI：采样 → 转成初始状态 → 环形缓冲</h3>

```python
# mimickit/learning/smp_agent.py
@torch.no_grad()
def _generate_init_states(self, num_motions):
    gen_func = self._prior_model.sample_ema if self._prior_model.model_ema else self._prior_model.sample
    norm_samples = gen_func(shape=disc_obs_space.shape, batch_size=curr_batch_size,
                            device=self._device, sampler=self._gsi_sampler,
                            num_inference_steps=self._gsi_inference_steps)
    curr_samples = self._prior_model.unnormalize(norm_samples.reshape(curr_batch_size, num_steps, -1))
```

```python
# mimickit/envs/smp_env.py
def _reset_ref_motion_gsi(self, env_ids):
    gsi_states = self._gsi_buffer.sample(n)
    self._ref_root_pos[env_ids] = gsi_states["root_pos"][:, -1]     # 末帧当回合起点
    ...
    self._disc_hist_root_pos.fill(env_ids, gsi_states["root_pos"])  # 10 帧填满判别历史
```

- 默认 `gsi_sampler: "ddpm"`，即完整 50 步去噪（`gsi_inference_steps: 10` 只在 DDIM 时生效）；
- `_disc_obs_to_motion_frames` 把 6D 旋转转回四元数 / 关节 DOF，`_motion_frames_to_init_states` 再做正运动学，速度用相邻帧**有限差分**；
- 一个细节：GSI 开着时 env 仍然会加载 `motion_file`（推断 `disc_obs` 维度、`sample_motions` 取 id 都要用它），但初始状态和奖励都不再读它。README 说的「No motion data is used during policy training」指的是这一层意思（我读源码的理解）。

<h3 id="7-先验怎么训">7. 先验怎么训：train_tinymdm.py</h3>

```python
# tools/diffusion_model/train_tinymdm.py
samples = dataset_env.fetch_obs_demo(num_samples_stat)   # 先统计一遍做 Normalizer
model.update_normalizer(samples)
while curr_iters < num_iters:
    samples = dataset_env.fetch_obs_demo(batch_size)
    samples = model.normalize(samples.reshape(batch_size, -1, config["input_channel"])).reshape(batch_size, -1)
    loss = model(samples)            # 随机档 add_noise → DiT 预测 ε → l1 loss
    loss.backward(); clip_grad_norm_(..., 1.0); optimizer.step()
    model.ema_dmodel.update()
```

训练时扩散档是**随机抽**的（`torch.randint(0, T)`），只有 RL 打分时才用固定的 ESM 三档 —— 两件事不要混。骨干是 `TinyStableMotionDiTModel`：1×1 卷积预处理、线性投影到 256 维、正弦位置编码、`AdaLayerNormSingle` 注入噪声档；风格条件版 `CondTinyStableMotionDiTModel` 额外接 `class_labels`，`cfg_dropout` 训练无条件分支。

<h3 id="8-论文-vs-源码差异表">8. 论文 vs 源码差异表</h3>

| 项 | 论文 | MimicKit（`2ed1e6c`） |
|------|------|------|
| SDS 误差 | 式 (7)(8)：$\lVert \hat{\epsilon} - \epsilon \rVert_2^2$ | 逐维均值 MSE |
| AdaNorm | 正文一句话：除以运行均值 $\mu_i$ | `DiffNormalizer`：$\lvert \mathcal{L} \rvert$ 的累计均值，`clamp_min(1e-4)`，前 1e8 样本后冻结 |
| $\hat{\epsilon}$ 的来源 | 网络预测 | DDIM 一步反推 $\hat{\mathbf{x}}_0$ 再换回 $\epsilon$（ε 预测下等价） |
| 扩散训练 loss | 式 (4) L2 | `loss_type: 'l1'` |
| 先验训练迭代 | 400k–800k | `num_iterations: 200_000`（多段）/ `50_000`（单段） |
| 奖励权重 / $w_s$ | 按任务调（附录 D） | 统一 0.5 / 0.5，`sds_loss_scale: 6` |
| 策略网络 | MLP [1024, 512] | `fc_2layers_1024units` |
| 并行环境 | 1024（附录 B） | README 命令 `--num_envs 4096` |
| 风格 CFG | $w _ {cfg}$ 可调 | `ClassifierFreeSampleModel` 已实现，`cfg_scale=1.0` 时直接用条件模型 |
| 上下半身组合 / MSM | 有（8.1 节、附录 E） | 开源代码里没有找到掩码组合与 MSM |
| 开源先验 | 100STYLE、LaFAN1、HOI 等 | 配置里引用的是 `smp_prior_lafan.pt`（任务）与 `smp_prior_spinkick.pt`（单段） |

<h3 id="9-训练与测试命令">9. 训练与测试命令</h3>

```bash
# 用预训练的 LaFAN1 先验训 location 任务（GSI 默认开，不读动作数据当初始状态）
python mimickit/run.py --mode train --num_envs 4096 \
  --engine_config data/engines/isaac_gym_engine.yaml \
  --env_config data/envs/smp_location_humanoid_env.yaml \
  --agent_config data/agents/smp_task_humanoid_agent.yaml \
  --visualize false --out_dir output/

# 训一个新先验（数据集在 tinymdm_multi_clip.yaml 的 motion_file 里指定）
python tools/diffusion_model/train_tinymdm.py \
  --cfg_path tools/diffusion_model/config/tinymdm_multi_clip.yaml \
  --out_dir output/smp_prior

# 单段模仿：GSI 关闭，初始状态来自 smp_humanoid_env.yaml 的 motion_file
python mimickit/run.py --mode test --num_envs 4 \
  --engine_config data/engines/isaac_gym_engine.yaml \
  --env_config data/envs/smp_humanoid_env.yaml \
  --agent_config data/agents/smp_humanoid_agent.yaml \
  --visualize true --model_file data/models/smp_humanoid_spinkick_model.pt
```

新先验训好后，把 agent 配置里的 `smp_prior_cfg` / `smp_prior_model` 指向 `output/smp_prior/diffusion_config.yaml` 与 `model.pt` 即可（README_SMP.md）。
</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（7 节）：Q1: SMP 和 AMP 的核心区别？/ Q2: 为什么冻结的判别器不行、冻结的扩散模型就行？…</summary>

<h3 id="q1-smp-和-amp-的核心区别">Q1: SMP 和 AMP 的核心区别？</h3>

都是「分布匹配式」的风格奖励，策略都不跟踪特定片段。AMP 的打分器是判别器，必须和当前策略一起对抗训练，训练全程要读数据；SMP 的打分器是预训练后冻结的扩散模型，用 SDS 噪声残差打分，换策略、换任务都不用重训，配合 GSI 训练策略时可以不读数据。单段模仿两者平均误差都是 0.046 m（表 4）。

<h3 id="q2-为什么冻结的判别器不行冻结的扩散模型就行">Q2: 为什么冻结的判别器不行、冻结的扩散模型就行？</h3>

判别器只学了「数据 vs 某个策略」之间的边界，在这个策略没去过的区域，它的输出是没被约束过的，新策略会钻进去刷分（AMP-Frozen 的判别器准确率在训练中持续下降）。扩散模型学的是**数据分布本身**在多个噪声尺度上的分数；加噪把分布铺满空间，即使动作离数据很远，加噪后的样本也落在扩散模型训练过的区域，分数估计仍然可靠（论文 3.2 节、图 3）。

<h3 id="q3-为什么要固定噪声档而不是随机采样">Q3: 为什么要固定噪声档（ESM），而不是像视觉 SDS 那样随机采样？</h3>

视觉 SDS 是梯度下降，随机档只是让梯度有噪声、长期平均没问题；RL 里 SDS 误差是**奖励**，随机档让同一个动作的奖励在不同步之间大幅波动，污染价值估计与优势。固定三档后方差从 1.140 降到 $9.964 \times 10^{-6}$，Backflip 误差从 0.195 降到 0.069（表 5）。

<h3 id="q4-adanorm-解决什么问题">Q4: AdaNorm 解决什么问题？</h3>

两件事：三档 SDS 误差的量级差很多，不归一化等于让低噪声档说了算；不同扩散模型 / 不同风格的绝对尺度不同，不归一化就得为每个先验重调 $w_s$。表 6 在 3 个独立训练的先验上，不加 AdaNorm 平均 0.176 m 且方差大，加上 0.057 m。

<h3 id="q5-gsi-为什么重要">Q5: GSI 为什么重要？它有什么风险？</h3>

RSI 是模仿学习探索效率的关键，但它本身要读数据集。GSI 让扩散模型顺便生成初始状态，样本效率与 RSI 相当（图 12），这样数据集才能真正丢掉。风险是生成的状态可能非法（自碰撞），导致仿真不稳。

<h3 id="q6-smp-的风格组合是怎么做到的">Q6: SMP 的风格组合是怎么做到的？</h3>

风格条件扩散模型 + CFG 得到单一风格先验（$w _ {cfg} = 1$ 就够）；组合时在 $\epsilon$ 空间按身体部位用二值掩码拼两个风格的预测（上半身 AeroPlane、下半身 HighKnees），既当奖励也给 GSI。风格冲突大时用多步 DDIM（MSM）估 $\hat{\epsilon}$ 让组合更协调。

<h3 id="q7-smp-的主要局限">Q7: SMP 的主要局限？</h3>

模式坍缩（mode-seeking 目标，数据越大越明显）、GSI 的非法状态、训练耗时约为 AMP 的 2 倍（每步 3 次扩散网络前向）。另外表 4 里 SMP 对 Walk / Run 这类周期动作的跟踪误差仍高于 DeepMimic —— 不过 AMP、SMILING 也一样，我的理解是分布匹配方法不和参考逐帧同步，这是这一类方法的共性（我的归纳）。
</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 节）：A. 与路线图其他论文的关联 / B. 各任务的奖励权重与 $w_s$ / C. 相关方法对比</summary>

<h3 id="a-与路线图其他论文的关联">A. 与路线图其他论文的关联</h3>

- **AMP**：SMP 的直接前身 —— 同样是「风格奖励 + 任务奖励」的组合（式 (9) 沿用 AMP），同样的 10 帧窗口特征；SMP 把判别器换成了冻结的扩散模型。
- **DeepMimic**：指数形式的奖励归一化（式 (7)）和 RSI 都来自它；GSI 是 RSI 的「无数据版」。
- **ADD**：同组、同框架的另一条改进线；MimicKit 里 `DiffNormalizer` 只被 ADD 和 SMP 两个 agent 用到，SMP 拿它做 AdaNorm。
- **Diffusion Policy / BeyondMimic**：都用扩散模型「生成动作 / 轨迹」；SMP 用扩散模型「给动作打分」，读之前最好先熟悉 DDPM 的前向加噪与 ε 预测（Diffusion Policy 笔记有讲）。
- **MimicKit**：SMP 的官方实现就在其中（`smp_agent.py` / `smp_env.py` / `tinymdm/`）。

<h3 id="b-各任务的奖励权重与-w_s">B. 各任务的奖励权重与 $w_s$（论文附录 D）</h3>

| 任务 | 组合方式 | $w_s$ |
|------|------|------|
| Target Location | $0.7\, r^g + 0.9\, r^{smp}$ | 4 |
| Steering | $0.5\, r^g + 0.5\, r^{smp}$ | 6 |
| Dodgeball | $0.6\, r^{smp} + 1.2\, r^g$ | 4 |
| Object Carry | 分阶段任务奖励 + $0.5 \min(r^{smp}, \lambda_t)$，$\lambda_t = \max(r^g, 0.3)$ | 6 |
| Getup | $0.2\, r^{smp} + 0.8\, r^g$ | 8 |
| Stair Traversal | $0.5\, r^{smp} + 0.5\, r^g$ | 8 |

RL 超参（表 8）：经验缓冲 1024 × 32、minibatch 1024 × 4、策略 / 价值步长 1e-4、$\gamma = 0.99$、SGD 动量 0.9、GAE($\lambda$) = TD($\lambda$) = 0.95、PPO clip 0.2。真机（表 9）：关节速度噪声 ±0.5 rad/s、关节角噪声 ±0.025 rad、摩擦 0.1–2、质心偏移 ±0.1 m、$K_p$ / $K_d$ 缩放 0.8–1.25、推搡 ±0.5 m/s、连杆质量 0.9–1.1；正则：动作变化率 −0.04、自碰撞 −0.2。

<h3 id="c-相关方法对比">C. 相关方法对比</h3>

| 方法 | 扩散模型的角色 | 训练策略时扩散模型是否更新 | 是否任务无关 |
|------|------|------|------|
| DiffAIL / DRAIL / DIFO 等 | 替代 GAIL 的判别器 | 是（仍是对抗训练） | 否 |
| Luo et al. 2024（TADPoLe） | 文本条件的图像 / 视频扩散给奖励 | 否 | 是，但动作常不自然 |
| SMILING | 类 VSD 的分数匹配目标 | 需要任务专用扩散模型 | 否 |
| **SMP** | 冻结的运动扩散模型 + SDS | **否** | **是** |
</details>

---

## 参考来源

- arXiv: https://arxiv.org/abs/2512.03028（v3，2026-04-24）
- 项目页: https://xbpeng.github.io/projects/SMP/index.html
- MimicKit: https://github.com/xbpeng/MimicKit （`docs/README_SMP.md`、`mimickit/learning/smp_agent.py`、`mimickit/learning/tinymdm/tinymdm_model.py`、`mimickit/learning/diff_normalizer.py`、`mimickit/envs/smp_env.py`、`tools/diffusion_model/`，commit `2ed1e6c`）

> 注：实验数字均摘自论文正文与表 1–9；「具体实例」里的二维高斯流形、理想去噪器闭式解与 $\mu_t$ 的取法是我为了手算搭的玩具模型，标注了「我的推算 / 推断 / 理解」的地方不是论文或代码原文。
