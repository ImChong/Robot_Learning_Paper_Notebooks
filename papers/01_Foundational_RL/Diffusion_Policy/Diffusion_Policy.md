---
layout: paper
paper_order: 10
title: "Diffusion Policy: Visuomotor Policy Learning via Action Diffusion"
category: "基础强化学习"
zhname: "Diffusion Policy：基于动作扩散的视觉运动策略学习"
demos: ["diffusion_policy"]
---

# Diffusion Policy: Visuomotor Policy Learning via Action Diffusion
**Diffusion Policy：基于动作扩散的视觉运动策略学习**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 扩散+控制主线起点
>
> 🧭 状态: 深度技术细节已填充（基于 arXiv:2303.04137v5 期刊扩展版正文与附录 + 官方仓库 real-stanford/diffusion_policy 源码）

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2303.04137](https://arxiv.org/abs/2303.04137) |
| **PDF** | [Download](https://arxiv.org/pdf/2303.04137.pdf) |
| **作者** | Cheng Chi, Siyuan Feng, Yilun Du, Zhenjia Xu, Eric Cousineau, Benjamin Burchfiel, Shuran Song |
| **机构** | Columbia / MIT / Toyota Research Institute |
| **发布时间** | 2023-03 (arXiv), RSS 2023 |
| **扩展版** | 2024-03 期刊扩展版 arXiv v5：作者加 Russ Tedrake，补控制理论一节、编码器消融与 3 个双臂真机任务；本笔记与动画的数字以 v5 为准 |
| **项目主页** | [Diffusion Policy Website](https://diffusion-policy.cs.columbia.edu/) |
| **代码** | [GitHub - real-stanford/diffusion_policy](https://github.com/real-stanford/diffusion_policy)（原 columbia-ai-robotics/diffusion_policy） |
| **评测范围** | 4 个基准（robomimic、Push-T、Block Push、Franka Kitchen）+ 真机 UR5 / Franka；扩展版共 15 个任务 |

---

## 🎯 一句话总结

> Diffusion Policy 将机器人视觉运动策略表示为条件去噪扩散过程 $p(A_t \mid O_t)$：一次去噪出一整段动作、只执行前一段就带着新观测再规划，从而处理模仿学习里的多模态动作分布，训练也比能量模型（IBC）稳定。

> 🎮 **本文内嵌 1 段动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [七幕动画：Diffusion Policy 全流程](#dp-explainer-anim) —— 约 88 秒串完「平均动作撞障 → 条件扩散 → action chunking → 视觉条件 + FiLM → DDIM 加速 → receding horizon → 定量证据与局限」
> 2. [配音讲解视频](#dp-video) —— 同样七幕，加中文配音与字幕，8 分 2 秒竖屏，可下载
> 3. [「平均动作」为什么会撞上障碍](#dp-multimodal-demo) —— 演示一半上绕一半下绕，MSE 给出的是两峰均值
> 4. [去噪：从噪声里捞出整条 chunk](#dp-denoise-demo) —— 浏览器里真的在跑 DDIM，整条 16 步一起锁模式
> 5. [Receding Horizon：预测 16，执行 8](#dp-rhc-demo) —— 拖 $T_a$，看反应延迟和推理开销怎么此消彼长

---

## 📌 英文缩写速查

> 从 PPO 到 PULSE 那几篇是在仿真里靠奖励做强化学习；这一篇是**照着演示学**（行为克隆），下面这些名词多半第一次见。

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| BC | Behavior Cloning（行为克隆） | 把演示里「看到的观测 → 做出的动作」配成对，当监督学习来学，不需要奖励 |
| MSE | Mean Squared Error（均方误差） | 预测与演示之差的平方再平均；用它回归，最优解是条件均值 |
| Push-T | — | 用圆形末端把 T 形积木推进目标框的平面任务（IBC 论文提出），左绕右绕都对，是典型的多峰任务 |
| LSTM-GMM | LSTM + Gaussian Mixture Model | 循环网络输出几个高斯叠加的分布，robomimic 里的 BC-RNN 基线；要预先定好峰的个数 |
| IBC | Implicit Behavioral Cloning（隐式行为克隆） | 用能量模型（EBM）给每个动作打分，推理时找能量最低的动作；训练要靠负样本，不稳 |
| BET | Behavior Transformer | 先把动作聚类成几类，再预测一个偏移；逐步采样，相邻两步可能换峰 |
| EBM | Energy-Based Model（能量模型） | 给每个输入打能量分，变成概率要除以对所有动作求和的归一化常数 $Z$ |
| InfoNCE | Info Noise-Contrastive Estimation | IBC 的训练损失：拿一个正样本和一批负样本做对比，用负样本估计 $Z$（式 7） |
| Score | 分数 / 得分函数 | 对数概率对动作的梯度 $\nabla_a \log p(a \mid o)$；扩散网络学的就是它，$Z$ 求导后消失 |
| Langevin | Stochastic Langevin Dynamics（随机朗之万动力学） | 沿着得分函数的梯度走一步、再加一点噪声，反复迭代采样；论文把 DDPM 的去噪看成这种过程 |
| DDPM | Denoising Diffusion Probabilistic Model | 去噪扩散概率模型：一步一步去噪的标准扩散 |
| iDDPM | Improved DDPM | 改进版 DDPM（平方余弦噪声表），本文仿真基准用它推理 100 步 |
| DDIM | Denoising Diffusion Implicit Model | 能跳步的采样方法，训练与推理步数解耦，大幅减少推理步数 |
| UNet | — | 带跳连的卷积结构；本文的卷积版沿时间方向做一维卷积 |
| FiLM | Feature-wise Linear Modulation | 用条件（观测特征、去噪步）算出每个通道的缩放与偏置，调制去噪网络 |
| ResNet-18 | Residual Network, 18 层 | 常用的图像卷积网络，本文从头训练做视觉编码器 |
| GroupNorm | Group Normalization | 按通道分组归一化，不依赖批统计量；本文用它替换 BatchNorm 以配合 EMA |
| EMA | Exponential Moving Average（指数滑动平均） | 训练时额外维护一份平滑过的权重，评估用它 |
| CLIP / ViT | Contrastive Language-Image Pre-training / Vision Transformer | 在海量图文配对上预训练的模型 / 用 Transformer 处理图像的网络 |
| R3M | Reusable Representations for Robot Manipulation | 用人类视频预训练的机器人视觉表示；真机 Push-T 拿它当预训练编码器对照 |
| IoU | Intersection over Union | 两块区域交集除以并集；真机 Push-T 用 T 块终态和目标区域的 IoU 打分 |
| RHC | Receding Horizon Control（滚动时域控制） | 预测一段，只执行前一部分，带着新观测再规划 |
| LQR | Linear Quadratic Regulator | 线性系统 + 二次代价的最优控制，最优策略是线性反馈 $a = -Ks$；4.5 节用它做理论检验 |
| $T_o$ / $T_p$ / $T_a$ | observation / prediction / action horizon | 看几帧观测 / 一次预测几步 / 实际执行几步（默认 2 / 16 / 8） |

---

## 🎬 七幕动画：Diffusion Policy 全流程 {#dp-explainer-anim}

<div class="paper-demo" data-demo="dp-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#dp-video}

<div class="paper-demo" data-demo="dp-video" data-src="media/dp_explainer_video.mp4" data-poster="media/dp_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/dp_explainer_video.mp4" download="Diffusion_Policy_讲解视频.mp4">下载 mp4（9.9 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」「具体实例」）按小节收起，后面的实验解读、工程意义、局限、源码对照、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图、交互演示留在外面。目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ Diffusion Policy 要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：行为克隆看起来只是监督回归，但机器人动作有三个特殊性；之前的方法分成显式与隐式两类</summary>

论文第 1 节：从演示里学策略，最简单的形式就是「观测 → 动作」的监督回归；但机器人动作有三个特殊性，让它和一般的监督学习不一样：

1. **多模态分布**：同一个观测下，人类演示可能有好几种都对的做法；
2. **时序相关**：动作是一串，前后要连贯；
3. **高精度要求**：推 T 块、倒酱这类任务差一点就失败。

之前的工作从两个方向改（图 1）：

| 类别 | 代表 | 怎么表示动作分布 | 问题 |
|------|------|------------------|------|
| 显式策略 | MSE 回归、LSTM-GMM（混合高斯）、BET（聚类 + 偏移）、离散分桶 | 网络直接输出动作或一个参数化分布 | 回归只给均值；混合 / 分桶要预先定峰数 |
| 隐式策略 | IBC（能量模型） | 给动作打能量分，推理时找最小值 | 训练靠负样本估计归一化常数，不稳 |
| **扩散策略** | Diffusion Policy | 学能量的**梯度场**，从噪声出发迭代优化 | 推理要迭代多步，比单次前向慢 |

</details>

### 问题一：多峰演示下，MSE 给出「平均动作」

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：MSE 的最优解是条件均值；图 3 的 Push-T 里 LSTM-GMM / IBC 偏向一边，BET 两边来回切</summary>

- 传统 BC（Behavior Cloning）用网络直接回归动作，遇到人类演示里有多种解法时（例如从左绕开或从右绕开障碍），MSE 的最优解是条件均值 $\mathbb{E}[a \mid o]$，产生"平均动作"，导致机器人撞上障碍。
- 论文图 3（Push-T）：同一个状态下末端可以从左或从右绕过去推 T 块。LSTM-GMM 和 IBC 偏向一边，BET 两边来回切、定不下来，Diffusion Policy 两边都学到、每次只走一边（图中是最好的 checkpoint 滚 40 步的结果）。
- 论文把多模态分成两种（5.3 节）：**短程多模态**——达成同一个近期目标有多种方式（左绕 / 右绕）；**长程多模态**——子目标的完成顺序不固定（Block Push 先推哪块、Kitchen 先碰哪个物体）。

</details>

### 问题二：显式多峰表示要先定峰数，也撑不起整段序列

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：混合高斯 / 聚类要预先定好峰的个数、对超参敏感、会塌缩；分桶的桶数随维度指数增长</summary>

- 混合高斯（LSTM-GMM / BC-RNN）、分桶或聚类 + 偏移（BET）要预先定好峰的个数，对超参敏感、会塌缩到一个峰，表达高精度行为的能力也有限（第 8 节相关工作）。
- 把回归改成分类、把动作空间离散成桶，桶的数量随动作维度**指数增长**（第 8 节）。
- 这些都很难扩展到「一整段动作序列」这样的高维输出（4.3 节）：BC-RNN 和 BET 很难指定一整段序列有多少个峰。

</details>

### 问题三：隐式策略（能量模型）训练不稳

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：归一化常数 Z 要靠负样本估计；图 6 里 IBC 的训练损失平稳下降，评估成功率却上下震荡</summary>

- 隐式策略 IBC 用能量模型 $p_\theta(a \mid o) = e^{-E_\theta(o,a)} / Z(o,\theta)$（式 6）。$Z$ 是对所有动作的积分，算不出来，只能在 InfoNCE 损失里用一批负样本近似（式 7）；负样本估计不准，训练就不稳（4.4 节）。
- 图 6：IBC 的能量损失平稳下降，但用它推理出的训练动作并没有越来越准，仿真评估成功率上下震荡——**选哪个 checkpoint 都很难**。IBC 原论文因此评估每一个 checkpoint、报告最好的那个；放到真机上，这意味着要在硬件上试很多个策略（4.4 节）。
- 扩散学的是 $\nabla_a \log p$，与 $Z$ 无关（式 8），训练和推理都不用估计它——见下文「为什么训练稳」。

> 论文正文没有和 GAN / VAE 做对比，这里不再沿用「比 GAN 稳、比 VAE 表达力强」的说法。

</details>

「平均动作会撞上障碍」这句话值得亲眼看一次。下面这个实验台里，人类演示一半从上绕、一半从下绕——MSE 回归给出的是两峰的**均值**，正好是障碍所在的位置；扩散策略采的是分布，每次落在某一侧（简化模型，只复现机制）：

<div class="paper-demo" data-demo="dp-multimodal" id="dp-multimodal-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🔧 方法详解

### 核心思想：策略 = 条件去噪过程

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一步去噪就是一次「带噪声的梯度下降」；ε_θ 学的是能量的梯度场</summary>

DDPM 从高斯噪声 $x^K$ 出发，迭代 $K$ 次得到越来越干净的 $x^{K-1}, \dots, x^0$（2.1 节，式 1）：

$$
x^{k-1} = \alpha\left(x^k - \gamma\,\varepsilon_\theta(x^k, k) + \mathcal{N}(0, \sigma^2 I)\right)
$$

论文把它解读为**一次带噪声的梯度下降**（式 2）：$x' = x - \gamma \nabla E(x)$。噪声预测网络 $\varepsilon_\theta$ 预测的就是梯度场 $\nabla E(x)$，$\gamma$ 是学习率；$\alpha, \gamma, \sigma$ 随 $k$ 变化的「噪声表」相当于学习率调度，$\alpha$ 略小于 1 能提高稳定性。

把这个过程用在机器人上只改两处（2.3 节）：

1. 输出 $x$ 从图像换成**动作**（而且是一整段动作序列 $A_t$）；
2. 去噪过程**以观测 $O_t$ 为条件**。

论文列的三个好处（第 1 节）：能表达任意可归一化的分布（包括多峰）；能扩展到高维输出（一整段动作）；训练稳定（不用负样本）。

</details>

### 条件扩散：从噪声还原动作序列

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学的是 p(A|O)，训练让 ε_θ 预测加进去的噪声，推理从高斯噪声走 K 步还原</summary>

策略不再回归一个动作向量，而是把动作生成写成条件去噪扩散过程（2.3 节）：

- **训练（式 5）**：从演示里取一段干净动作 $A^0 _ t$，随机选一个噪声步 $k$ 加噪，让网络预测加进去的噪声：$\mathcal{L} = \mathrm{MSE}\big(\varepsilon^k,\ \varepsilon_\theta(O_t,\ A^0 _ t + \varepsilon^k,\ k)\big)$。按 Ho 等（2020），最小化这个损失也就是在最小化数据分布与 DDPM 采样分布之间 KL 的变分上界（2.2 节）。
- **推理（式 4）**：从 $A^K_t \sim \mathcal{N}(0, I)$ 出发，$A^{k-1} _ t = \alpha\big(A^k_t - \gamma\,\varepsilon_\theta(O_t, A^k_t, k) + \mathcal{N}(0, \sigma^2 I)\big)$，重复 $K$ 次得到 $A^0 _ t$。
- **噪声表**（3.3 节）：噪声表决定策略能抓住动作信号里多少高频 / 低频成分；作者试下来 iDDPM 的**平方余弦**噪声表最好（官方配置 `beta_schedule: squaredcos_cap_v2`）。

**多峰从哪来**（4.1 节）：每次采样从不同的高斯噪声出发，每一步还加随机扰动，样本会落进不同的峰，而不是落在均值上。初始噪声决定「往哪个盆地收敛」，迭代中的扰动还允许样本在盆地之间移动。

**为什么训练稳**（4.4 节）：$\varepsilon_\theta(a, o) \approx -\nabla_a \log p(a \mid o)$，而 $\nabla_a \log Z(o,\theta) = 0$（式 8），训练和推理都不用估计归一化常数，不像 IBC 那样依赖负样本：

$$
\nabla_a \log p(a \mid o) = -\nabla_a E_\theta(a, o) - \underbrace{\nabla_a \log Z(o, \theta)}_{=0} \approx -\varepsilon_\theta(a, o)
$$

</details>

### Action Chunking：预测整条 horizon

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：不再预测单步，而是一次去噪出 T_p 步，只执行其中 T_a 步</summary>

在时刻 $t$，策略看最近 $T_o$ 步观测 $O_t$，一次预测 $T_p$ 步动作 $A_t$，其中 $T_a$ 步不再规划、直接执行（2.3 节）。附录表 7 的仿真配置是 $T_o = 2$、$T_p = 16$、$T_a = 8$，真机 Push-T 是 $T_a = 6$。

一次预测一整段带来两点好处（4.3 节）：

- **时间一致**：如果每一步单独从多峰分布里采（LSTM-GMM、BET 那样），相邻两步可能来自不同的峰，在两条可行轨迹之间来回抖；整段一起去噪，峰一旦选定，整段走同一侧。上文交互演示里「责任权重按整条 16 步算」是浏览器里的简化模型，用来复现这个机制。
- **不怕停顿（idle actions）**：演示里常有停顿，比如真机上用勺子从碗里舀番茄酱（倒酱任务），得停住等酱装满；单步策略容易学成原地不动；论文里 LSTM-GMM 和 IBC 在真机上不去掉停顿就常常停住。

为什么以前的方法很少预测序列：IBC 在高维、不光滑的能量面上采样困难，GMM / k-means 要预先定峰数；扩散在图像生成里已经证明能撑住高维输出（4.3 节）。

**$T_a$ 的取舍**（5.3 节、图 5 左）：$T_a > 1$ 带来一致性、能扛住停顿；太长则反应慢。多数任务的最佳点是 **8 步**。

**抗延迟**（5.3 节、图 5 右）：图像处理、推理、网络都会带来延迟；用滚动时域的**位置控制**，模拟延迟到 4 步时性能基本不掉；速度控制受延迟影响更大（论文推测是误差累积）。

**热启动**（2.3 节）：论文提到滚动时域还可以用上一轮的预测给下一轮推理热启动，进一步平滑动作。官方 `conditional_sample()` 每次都从 `torch.randn` 开始，没有实现这一点（见下文源码对照）。

</details>

### 视觉条件与 FiLM

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：观测只做条件、特征每次推理算一遍；ResNet-18 的两处改动；CNN（FiLM）与 Transformer（交叉注意力）两种骨干</summary>

**观测只做条件**：学 $p(A_t \mid O_t)$，而不是 Diffuser 做规划时的联合分布 $p(A_t, O_t)$。图像特征每次推理只算一遍，$K$ 步去噪都复用，推理快得多，视觉编码器也能端到端一起训练（2.3 节）。官方 rollout 喂最近 $T_o = 2$ 帧（`n_obs_steps = 2`），不是单张图；附录图 14：看图像的策略 1 帧不够、帧数多了反而下降。

**视觉编码器**（3.2 节）：从头训练的 ResNet-18，每个相机一个；每个时刻的图像单独编码再拼起来得到 $O_t$。全局平均池化换成空间 softmax（保留位置），BatchNorm 换成 GroupNorm（才能配合 EMA 权重）。训练时随机裁剪做增强、推理时固定中心裁剪（附录 A.3）。表 5（Square）：ViT 从头训只有 22%，冻结预训练特征效果差，用小 10 倍学习率微调 CLIP ViT-B/16 最好（98%）。

两种去噪骨干（3.1 节）：

- **CNN-based + FiLM**：沿用 Janner 等的 1D 时序卷积 UNet，做了三处改动——只建模条件分布 $p(A_t \mid O_t)$，观测特征和去噪步 $k$ 用 FiLM 注入每一层卷积（按通道做 $\gamma(O_t, k) \odot h + \beta(O_t, k)$）；只预测动作轨迹，不再拼观测；去掉基于 inpainting 的目标条件（和滚动时域不兼容）。开箱即用、少调参，但动作变化快时（如速度控制）会被卷积平滑掉（论文推测是时序卷积偏好低频的归纳偏置）。
- **Transformer-based**（时序扩散 Transformer）：带噪动作 $A^k_t$ 作为 token 输入 minGPT 式的解码器块，扩散步 $k$ 的正弦嵌入作第一个 token，因果注意力（每个动作只看自己和之前的动作）；观测经共享 MLP 变成嵌入序列，用交叉注意力读入。复杂、变化快的任务上往往最好，但对超参更敏感。论文建议新任务先试 CNN 版。

</details>

### 网络结构与 DDIM 加速

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：训练 100 步，DDIM 推理 10 步（RTX 3080 上 0.1 s）；真机配置 16 步</summary>

- 训练时扩散步数是 **100**（附录表 7），噪声表用 iDDPM 的平方余弦（3.3 节）。
- **DDIM** 把训练和推理的步数解耦（3.4 节）：真机实验里「训练 100 步、推理 10 步」，在 RTX 3080 上一次推理 **0.1 s**，即 $100 / 10 = 10\times$。
- 附录表 7 的真机配置写的是推理 **16 步**（官方 `eval_real_robot.py` 也是 `num_inference_steps = 16`）；仿真基准则没有用 DDIM，用 iDDPM 推理同样 100 步（附录 A.4）。
- 真机 Push-T 里策略以 10 Hz 出指令，再线性插值到 125 Hz 交给 UR5。
- 局限一节也承认：推理比 LSTM-GMM 慢，一次出一段动作能缓解，但还不够做高频控制；未来可用新的噪声表、更好的求解器、一致性模型（consistency models）减少步数（第 9 节）。

</details>

### 两个容易忽略的实现细节：动作归一化与位置控制

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：动作必须按 min-max 缩到 [−1, 1]（DDPM 每步会裁剪）；位置控制让 Diffusion Policy 变强、让基线变弱</summary>

**动作归一化**（附录 A.1）：

- 每个动作维度**分别按最小 / 最大值缩放到 $[-1, 1]$**。原因是 DDPM 每一步都会把预测裁剪到 $[-1, 1]$ 来保证稳定（官方配置 `clip_sample: True`）；如果用常见的零均值单位方差归一化，落在 $[-1, 1]$ 之外的那部分动作空间就永远采不到。
- 方差很小（接近常数）的维度只平移到零均值、不缩放，避免数值问题；旋转表示（如四元数）的维度保持不变。
- 官方 `LinearNormalizer` 的 `limits` 模式就是这么写的：`scale = 2 / (max - min)`，`offset = -1 - scale * min`；范围小于 `range_eps = 1e-4` 的维度只平移。

**旋转表示**（附录 A.2）：速度控制沿用 robomimic 的轴角表示（速度接近 0，奇异性不成问题）；位置控制（仿真和真机）一律用 Zhou 等的 6D 旋转表示。

**位置控制 vs 速度控制**（4.2 节、图 4）：

- 多数行为克隆工作用速度控制；但 Diffusion Policy 换成**位置控制**后成功率上升，而 BC-RNN（LSTM-GMM）和 BET 换成位置控制反而下降。
- 论文推测两个原因：位置控制下动作的多模态更明显，而 Diffusion Policy 恰好擅长表达多峰；位置控制的误差累积比速度控制小，更适合预测一段动作序列。
- 因此评测时每个方法用各自最好的动作空间：Diffusion Policy 用位置控制，基线用速度控制（5.2 节）。

</details>

### 和控制理论的联系（4.5 节，扩展版新增）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：线性系统 + LQR 演示时，最优去噪器收敛到 a = −Ks；预测未来动作等于隐式学了动力学</summary>

论文用一个最简单的情形做「健全性检查」。线性系统：

$$
s_{t+1} = A s_t + B a_t + w_t,\qquad w_t \sim \mathcal{N}(0, \Sigma_w)
$$

演示来自线性反馈策略 $a_t = -K s_t$（比如解 LQR 得到）。模仿它根本不需要扩散，但可以看看扩散是不是做了对的事：

- $T_p = 1$ 时，最小化 $\mathcal{L} = \mathrm{MSE}\big(\varepsilon^k, \varepsilon_\theta(s_t, -K s_t + \varepsilon^k, k)\big)$（式 9）的最优去噪器是 $\varepsilon_\theta(s, a, k) = \frac{1}{\sigma_k}(a + K s)$，$\sigma_k$ 是第 $k$ 步的方差；推理时 DDIM 采样会收敛到全局最小值 $a = -K s$。
- $T_p > 1$ 时，要预测 $t + t'$ 时刻的动作，最优去噪器给出 $a _ {t+t'} = -K (A - BK)^{t'} s_t$（含 $w_t$ 的项期望为零）。也就是说，**要完美克隆一个依赖状态的行为，学习者必须隐式地学到（与任务相关的）动力学模型**。
- 如果被控对象或策略是非线性的，预测未来动作会难得多，而且又会变成多峰预测。

下文「具体实例」的例 5 用一维数字把这两条走了一遍。

</details>

### 训练配方（附录 A.4、表 7 / 8）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：CNN 版超参在各任务间基本不变；批量 256 / 64、余弦学习率 + 预热、状态 4500 轮 / 图像 3000 轮</summary>

| 项 | CNN 版（表 7） | Transformer 版（表 8） |
|----|----------------|------------------------|
| $T_o$ / $T_a$ / $T_p$ | 2 / 8 / 16（真机 Push-T $T_a = 6$；Block Push 3 / 1 / 12） | robomimic 2 / 8 / 10；Push-T 2 / 8 / 16；真机 Push-T 2 / 6 / 16；Kitchen 4 / 8 / 16；Block Push 用速度控制 3 / 1 / 5 |
| 去噪网络参数量 | 仿真 256 M，真机 67 M | 9 M（Kitchen、真机 Push-T 80 M） |
| 视觉编码器参数量 | 22 M（ResNet-18，Transport 两臂 45 M） | 同左 |
| 学习率 / 权重衰减 | 1e-4 / 1e-6 | 1e-4 / 1e-3（Push-T 1e-1） |
| 训练 / 推理扩散步 | 100 / 100（真机推理 16） | 100 / 100（真机推理 16） |
| 其他 | — | 8 层、嵌入 256（Kitchen / 真机 768）、注意力 dropout 0.3（Push-T 0.01、Kitchen 0.1） |

- 批量：状态输入 256、图像输入 64；学习率余弦调度 + 线性预热（CNN 500 步、Transformer 1000 步）（附录 A.4）。
- 训练轮数：状态任务 4500 轮、图像任务 3000 轮（5.2 节）。
- **CNN 版的最优超参在各任务间基本一致**；加大 CNN 参数量总能提升性能，模型大小只受算力和显存限制。Transformer 版的最优注意力 dropout 和权重衰减随任务变化很大，加层数有时反而变差（附录 A.4）。
- 用 FiLM 传观测在所有任务上都优于 inpainting，**Push-T 除外**：表 1 里 CNN 版在 Push-T 上的数字用的是 inpainting（附录 A.4）。
- Block Push 的演示来自一个马尔可夫的脚本策略，所以它的最优观测 / 动作视野和人类遥操作的任务很不一样（附录 A.4）。

</details>

### 📊 条件扩散策略与 RHC 执行流程

<div class="mermaid">
flowchart TB
    O["视觉观测 O（最近 T_o = 2 帧）"] --> Enc["视觉编码器<br/>ResNet-18 + 空间 softmax + GroupNorm"]
    Enc --> Cond["条件特征（FiLM 注入每层）"]
    Cond --> S0["从高斯噪声初始化<br/>动作序列 A_K"]
    S0 --> Denoise["K 步去噪 ε_θ<br/>预测噪声 ε"]
    Denoise --> Ak["干净动作序列 A_0<br/>长度 T_p = 16"]
    Ak --> RHC["RHC：执行 T_a 步<br/>带新观测再规划"]
    RHC --> Exec["发送到机器人"]
    Exec --> O
</div>

下面这个演示真的在浏览器里跑 DDIM（数据分布是两条演示 + 高斯抖动的简化模型）：拖动步数滑块，看长度 16 的动作 chunk 怎么从一团高斯噪声收敛成一条平滑轨迹。注意**整条 chunk 是一起锁定模式的**——这正是 action chunking 除了「预测得远」之外的另一半价值：

<div class="paper-demo" data-demo="dp-denoise" id="dp-denoise-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🚶 具体实例

### 例 1：真机 Push-T 的一次推理

<div class="mermaid">
flowchart TB
    O["观测：最近 2 帧 × 2 路相机 + 末端位置"] --> D["DDIM 16 步去噪 → 16 步动作"]
    D --> X["执行其中 6 步（10 Hz → 插值 125 Hz）"]
    X --> O
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：真机 Push-T 的一次推理：观测 / 去噪 / 切出执行段 / 带时间戳下发 / 成功率</summary>

以论文的真机 Push-T 为例（UR5，附录表 7 与官方 `eval_real_robot.py`）：

- **观测**：最近 $T_o = 2$ 帧，2 路相机 320×240（训练时随机裁成 288×216）+ 末端位置；动作是 2 维的末端目标位置。UR5 工作站有 5 台 RealSense D415，只用其中 2 台，720p / 30 fps 降到 320×240 / 10 fps（附录 D.0.1）。
- **去噪**：从高斯噪声出发，DDIM 走 16 步，得到 $T_p = 16$ 步的动作序列；论文 3.4 节的同类设置（10 步）在 RTX 3080 上是 **0.1 s**。
- **切出执行段**：官方 `predict_action` 里 `start = To - 1`，这 16 步从上一帧观测的时刻排起——仿真默认 $T_a = 8$ 时就是 $16 = 1 + 8 + 7$：过去 1 步、执行 8 步、丢掉 7 步；真机 Push-T 用 $T_a = 6$（`--steps_per_inference 6`）。
- **带时间戳下发**（官方 `eval_real_robot.py`）：真机脚本把 `n_action_steps` 改成 `horizon - n_obs_steps + 1 = 15`，每个动作按「最后一帧观测的时间戳 + $i \times 0.1$ s」打上时间戳；推理耗时导致**已经过期的动作直接丢掉**（`is_new`），剩下的交给控制器；每 6 步（0.6 s）再推理一次。这是笔记对代码的阅读：真机上真正起作用的「执行段」是「没过期的那部分」，不是固定的切片。
- **执行**：10 Hz 出指令，线性插值到 125 Hz 交给机械臂；插值控制器把末端速度限制在 0.43 m/s 以下、位置限制在桌面上方 1 cm 以上（附录 D.0.1），执行完再带着新观测规划。
- **结果**（表 6）：20 次里成功率 **95%**（最好的 LSTM-GMM 20%、IBC 0%），终态 IoU 0.80，人类演示是 0.84。

</details>

「预测 16 步、执行 8 步」这个配置背后是一个取舍（论文图 5：多数任务的最佳点是 8 步）。拖动 $T_a$，看反应延迟和推理开销怎么此消彼长（简化模型，只画调度关系）：

<div class="paper-demo" data-demo="dp-rhc" id="dp-rhc-demo"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 例 2：MSE 回归的答案正好撞上障碍

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两峰 ±1.05 各占一半，MSE 最优解 0，落在半径 0.52 的障碍里</summary>

> ⚠️ 例 2–4 用的是上面「平均动作」实验台的同一组**玩具数字**（`diffusion_policy.js`），只复现机制，不是论文实验。

设定：起点在左、目标在右，正中间一个半径 0.52 的障碍。要预测的「动作」是绕行的侧向偏移量 $a$。演示一半从上绕（$a \approx +1.05$），一半从下绕（$a \approx -1.05$），每一簇有标准差 0.18 的抖动。

MSE 回归的最优解是条件均值：

$$
\mathbb{E}[a] = 0.5 \times 1.05 + 0.5 \times (-1.05) = 0
$$

偏移 0 就是直穿正中间，$\lvert 0 \rvert \lt 0.52$，正好撞上障碍。演示里**没有一条**是这么走的。

</details>

### 例 3：手算一步 DDIM 去噪（k = 4 → 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：理想去噪器下，上绕峰的责任权重从 0.71 升到 0.84，样本从 0.3606 走到 0.4612</summary>

数据是两个高斯的混合时，「理想去噪器」有闭式解，实验台就是这么在浏览器里跑 DDIM 的。噪声表用余弦表，10 步 DDIM；第 $k$ 步保留的信号比例记作 $\bar{\alpha} _ k$，这一步要用到 $\bar{\alpha} _ 4 = 0.64738$、$\bar{\alpha} _ 3 = 0.78679$（10 步的完整取值见例 4 的表）。

取一条从 $x _ {10} = 0.3$ 出发的轨迹，它在第 4 步时 $x_4 = 0.3606$。手算这一步：

1. **加噪后的方差**：$\sqrt{\bar{\alpha} _ 4} = 0.8046$，$v = \bar{\alpha} _ 4 \times 0.18^2 + (1 - \bar{\alpha} _ 4) = 0.3736$。
2. **两个峰各有多像**：$x_4 - 0.8046 \times 1.05 = -0.4842$，平方 0.2345；$x_4 + 0.8046 \times 1.05 = 1.2054$，平方 1.4530。差值除以 $2v$：$(1.4530 - 0.2345) / 0.7472 = 1.6308$。
3. **责任权重**：$r _ {\text{上}} = 1 / (1 + e^{-1.6308}) = 0.8363$，$r _ {\text{下}} = 0.1637$。
4. **预测干净动作**：每个峰的后验均值是 $(\sqrt{\bar{\alpha}}\,\sigma^2 x + (1 - \bar{\alpha})\mu_i) / v$，按责任权重加权：$\hat{x} _ 0 = (0.0094 + 0.35262 \times (0.8363 - 0.1637) \times 1.05) / 0.3736 = (0.0094 + 0.2490) / 0.3736 = 0.6917$。
5. **反推噪声**：$\hat{\varepsilon} = (x_4 - 0.8046 \times 0.6917) / \sqrt{1 - \bar{\alpha} _ 4} = (0.3606 - 0.5565) / 0.5938 = -0.3300$。
6. **DDIM 更新**：$x_3 = \sqrt{\bar{\alpha} _ 3}\,\hat{x} _ 0 + \sqrt{1 - \bar{\alpha} _ 3}\,\hat{\varepsilon} = 0.8870 \times 0.6917 + 0.4617 \times (-0.3300) = 0.4612$。

读法：第 5 步的 $\hat{\varepsilon}$ 就是网络 $\varepsilon_\theta$ 应该学会输出的东西——真实系统里没有闭式解，所以要训练一个网络去逼近它（式 5、式 8）。

</details>

### 例 4：整条 10 步轨迹——两个起点各落一边

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：从 +0.3 出发最后落到 0.9181，从 −0.3 出发落到 −0.9181；正好从 0 出发会卡在中间</summary>

把例 3 的计算从 $k = 10$ 一路做到 $k = 1$（上绕峰的责任权重 $r _ {\text{上}}$、预测的干净动作 $\hat{x} _ 0$ 都在第 $k$ 步算）：

| 第 $k$ 步 | $\bar{\alpha} _ k$ | $x_k$ | $r _ {\text{上}}$ | $\hat{x} _ 0$ | $x _ {k-1}$ |
|:--:|:--:|:--:|:--:|:--:|:--:|
| 10 | 0.00001 | 0.3000 | 0.5005 | 0.0011 | 0.2965 |
| 9 | 0.02409 | 0.2965 | 0.5247 | 0.0534 | 0.2941 |
| 8 | 0.09403 | 0.2941 | 0.5519 | 0.1118 | 0.2941 |
| 7 | 0.20309 | 0.2941 | 0.5857 | 0.1839 | 0.2994 |
| 6 | 0.34076 | 0.2994 | 0.6336 | 0.2844 | 0.3167 |
| 5 | 0.49377 | 0.3167 | 0.7099 | 0.4411 | 0.3606 |
| 4 | 0.64738 | 0.3606 | 0.8363 | 0.6917 | 0.4612 |
| 3 | 0.78679 | 0.4612 | 0.9734 | 0.9434 | 0.6352 |
| 2 | 0.89857 | 0.6352 | 0.9999 | 0.9652 | 0.8044 |
| 1 | 0.97194 | 0.8044 | 1.0000 | 0.9262 | 0.9181 |

- 前几步噪声太大，$\hat{x} _ 0$ 都在 0 附近，两个峰几乎一样像；从第 6 步起责任权重开始明显偏向上绕，最后几步一锤定音。
- 从 $x _ {10} = -0.3$ 出发，整张表关于 0 对称，最后落到 $-0.9181$：**初始噪声决定往哪个峰收敛**（4.1 节）。最后一步没有正好到 1.05，是因为这个余弦表的 $\bar{\alpha} _ 0 = 0.99984$ 不是 1，结果仍然稳稳落在上绕那一簇里。
- 正好从 0 出发时，两个峰的拉力完全抵消，确定性的 DDIM 会一直停在 0。这个点的概率为零；而 DDPM 每步还会加噪声（式 4），会把它推离对称点。

</details>

### 例 5：LQR 演示下的最优去噪器

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一维系统 A = B = 1、K = 0.5，状态 s = 2 时去噪收敛到 a = −1；整段预测是 (−1, −0.5, −0.25)</summary>

> 这里的 $A, B, K, s$ 是笔记取的一维数字，公式来自论文 4.5 节。

- 系统 $s _ {t+1} = s_t + a_t + w_t$（$A = B = 1$），演示策略 $a = -0.5\,s$（$K = 0.5$），当前 $s_t = 2$。
- **$T_p = 1$**：最优去噪器 $\varepsilon_\theta(s, a, k) = (a + 0.5 s) / \sigma_k$。在 $a = 0$ 时它是 $1 / \sigma_k \gt 0$，去噪一步减掉 $\gamma\varepsilon$，动作往负方向走；到 $a = -1$ 时 $\varepsilon_\theta = 0$，不再变——收敛到 $a = -K s = -1$。
- **$T_p = 3$**：$a _ {t+t'} = -K (A - BK)^{t'} s_t$，闭环系数 $A - BK = 0.5$，所以整段是 $(-0.5 \times 2,\ -0.5 \times 0.5 \times 2,\ -0.5 \times 0.25 \times 2) = (-1,\ -0.5,\ -0.25)$。
- 后两个数里的 0.5、0.25 就是闭环动力学 $(A - BK)^{t'}$——**去噪器要给出它们，就必须隐式学到这个系统怎么演化**。

</details>

---

## 📊 实验结果怎么读

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（6 节）：评测方法 / 仿真基准（表 1、2、4）/ 46.9% 怎么算 / 真机单臂（表 6、图 9、10）/ 双臂 / 消融与鲁棒性</summary>

<h3 id="dp-结果-评测方法">评测方法（5.2 节）</h3>

- 每个基线取所有来源里最好的数字：LSTM-GMM 用作者复现的结果，BET、IBC 用原论文数字。
- 报告「最后 10 个 checkpoint（每 50 轮存一个）× 3 个训练种子 × 50 个环境初始条件」的平均，共约 1500 次实验；robomimic 和 Push-T 另外报告最好 checkpoint，以和原论文的口径一致。表里写成「最好 / 最后 10 个平均」。
- 论文脚注承认评测代码有个 bug，robomimic 只用了 22 个初始条件；所有方法都同样评测，结论不变。
- Push-T 的指标是目标区域覆盖率，其余多为成功率。

<h3 id="dp-结果-仿真基准">仿真基准（表 1、2、4）</h3>

图像输入（表 2，节选，「最好 / 最后 10 个平均」）：

| 方法 | Square ph | Transport ph | Transport mh | ToolHang ph | Push-T |
|------|:--:|:--:|:--:|:--:|:--:|
| LSTM-GMM | 0.82 / 0.59 | 0.88 / 0.62 | 0.44 / 0.24 | 0.68 / 0.49 | 0.69 / 0.54 |
| IBC | 0.03 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.75 / 0.64 |
| DP-CNN | 0.98 / 0.92 | **1.00 / 0.93** | **0.89 / 0.69** | **0.95 / 0.73** | **0.91 / 0.84** |
| DP-Transformer | 1.00 / 0.90 | 0.98 / 0.81 | 0.73 / 0.50 | 0.76 / 0.47 | 0.78 / 0.66 |

多阶段任务（表 4，状态输入）：

| 方法 | Block Push $p_1$ | Block Push $p_2$ | Kitchen $p_3$ | Kitchen $p_4$ |
|------|:--:|:--:|:--:|:--:|
| LSTM-GMM | 0.03 | 0.01 | 0.74 | 0.34 |
| IBC | 0.01 | 0.00 | 0.61 | 0.24 |
| BET | 0.96 | 0.71 | 0.71 | 0.44 |
| DP-CNN | 0.36 | 0.11 | **1.00** | **0.99** |
| DP-Transformer | **0.99** | **0.94** | 0.99 | 0.96 |

- Block Push 的 $p_x$ 是推进 $x$ 块的频率；Kitchen 的 $p_x$ 是交互 $x$ 个及以上物体的频率。
- 长程多模态上差距最大：正文说 Block Push $p_2$ 提升 32%、Kitchen $p_4$ 提升 213%（5.3 节）。按表 4 核算，$p_2$ 是 $(0.94 - 0.71) / 0.71 = 32\%$，对得上；$p_4$ 是 $(0.99 - 0.44) / 0.44 = 125\%$，和 213% 对不上（RSS v1 与 v5 的表 4、正文都是这组数，笔记没找到 213% 的算法）。
- 注意 Block Push 上 CNN 版明显不如 Transformer 版（0.11 vs 0.94）。

<h3 id="dp-结果-469-怎么算">46.9% 怎么算（附录 B.2）</h3>

对表 1、2、4 的每一列（mh 结果不算），取基线里的最好成绩和 Diffusion Policy 两个变体里的最好成绩，算相对提升 $(\text{ours} - \text{baseline}) / \text{baseline}$（每一列都为正），再对所有列取平均，得到 0.46858 ≈ **46.9%**。所以这是「每个任务上相对最强基线的平均相对提升」，不是成功率的绝对差。

（笔记的核算）照这个口径用表 1、2、4 里的 18 列数字直接算：取「最好 checkpoint」那个数平均是 21.7%，取「最后 10 个平均」那个数是 39.7%，都对不上 46.9%；论文可能用了表里没列出的数字，这里以附录 B.2 的说法为准。

<h3 id="dp-结果-真机单臂">真机单臂（表 6、图 9、图 10）</h3>

真机 Push-T（表 6，20 次评测，IoU 阈值取人类演示里的最小值）：

| | 人类演示 | IBC 位置 | IBC 速度 | LSTM-GMM 位置 | LSTM-GMM 速度 | DP Transformer | DP ImageNet | DP R3M | **DP 端到端** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| IoU | 0.84 | 0.14 | 0.19 | 0.24 | 0.25 | 0.53 | 0.24 | 0.66 | **0.80** |
| 成功率 | 100% | 0% | 0% | 20% | 10% | 65% | 15% | 80% | **95%** |
| 平均时长 (s) | 20.3 | 56.3 | 41.6 | 47.3 | 51.7 | 57.5 | 55.8 | 31.7 | **22.9** |

- 136 条演示，每个方法训练 12 小时、取最后一个 checkpoint（IBC 例外，取训练集动作 MSE 最小的那个）（附录 C.1）。
- 基线最常见的失败在阶段切换处：LSTM-GMM 20 次里有 8 次卡在 T 块附近，IBC 有 6 次过早离开 T 块；没有去掉停顿也是它们卡住的原因之一（6.1 节）。
- 预训练编码器：R3M 80% 但动作抖、更容易卡住，ImageNet 只有 15%；**端到端训练仍是最有效的方式**（6.1 节）。
- 翻杯子（6.2 节）：20 次成功 90%；用同一批数据的子集训的 LSTM-GMM 20 次全部失败，从没对准过杯子。
- 倒酱 / 抹酱（6.3 节，图 10）：IoU / 覆盖率 0.74 / 0.77（人类 0.79 / 0.79），成功率 79% / 100%；LSTM-GMM 0.06 / 0.27，成功率 0。两个任务直接用 Push-T 的超参，第一次训练就成功。

<h3 id="dp-结果-双臂">双臂（第 7 节，扩展版新增）</h3>

| 任务 | 演示数 | 成功率（20 次） | 主要失败 |
|------|:--:|:--:|------|
| 打蛋器 | 210 | 55% | 打蛋器初始位置超出分布、抓不到或抓丢摇柄 |
| 铺垫子 | 162 | 75% | 第一次抓垫子没抓到，之后反复重复同一动作 |
| 叠 T 恤 | 284 | 75% | 叠袖子 / 领口时没抓到；最后停不下来、一直在调整 |

- 双臂任务没有调任何超参，大部分工作量在扩展遥操作和控制栈（第 7 节）。
- 打蛋器必须用力反馈遥操作：没有力反馈时，专家 10 次一次都没成功；有力反馈 10 次都成功（7.3 节）。

<h3 id="dp-结果-消融与鲁棒性">消融与鲁棒性</h3>

- **视觉编码器**（表 5，Square ph，CNN 版，500 轮）：

| 架构（预训练数据） | 从头训 | 冻结预训练 | 微调预训练 |
|------|:--:|:--:|:--:|
| ResNet-18（ImageNet-21k） | 0.94 | 0.58 | 0.92 |
| ResNet-34（ImageNet-21k） | 0.92 | 0.40 | 0.94 |
| ViT-B/16（CLIP） | 0.22 | 0.70 | **0.98** |

- **观测视野**（附录图 14）：状态输入对 $T_o$ 不敏感；图像输入（尤其 CNN 版）随 $T_o$ 增大而下降，2 是多数任务的好折中。
- **数据效率**（附录图 15）：每一种数据量下都优于 LSTM-GMM。
- **抗扰动**（图 8）：前置相机被手挡住 3 秒，动作略抖但仍完成；推的过程中挪动 T 块，策略立即换个方向重新推；去终点区的路上挪动 T 块，策略立刻掉头把它推回去再去终点——这是演示里从没出现过的行为（6.1 节）。

</details>

---

## 🤖 Diffusion Policy 对机器人领域的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：动作表示从回归换成生成 / 动作块 + 滚动执行成了标准接口 / 几条可直接搬走的工程经验 / 往人形和全身控制的延伸</summary>

<h3 id="dp-意义-1-动作表示从回归换成生成">1. 动作表示从「回归」换成「生成」</h3>

论文结论（第 10 节）认为，在行为克隆里**策略结构本身就是一个重要的性能瓶颈**，不只是数据。仿真基准平均提升 46.9%，真机 Push-T 95% 对比 LSTM-GMM 20%、IBC 0%。

<h3 id="dp-意义-2-动作块加滚动执行">2. 「一次出一段、只执行一部分」成了后续工作的标准接口</h3>

本仓库后面几篇都能看到这个接口（以下对应关系来自各自的笔记）：

- [π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html)：把扩散换成流匹配，一块 $H = 50$ 步，并在微调实验里把 Diffusion Policy 当对照。
- [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html)：扩散 Transformer 用流匹配一次生成 16 步动作。
- [ACT](../../03_High_Impact_Selection/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware/ACT_Learning_Fine-Grained_Bimanual_Manipulation_with_Low-Cost_Hardware.html)：几乎同期（2023-04）用 Transformer + action chunking 做双臂精细操作。

<h3 id="dp-意义-3-可直接搬走的工程经验">3. 几条可以直接搬走的工程经验</h3>

- 动作按 min-max 缩到 $[-1, 1]$（DDPM 每步裁剪）；
- 末端**位置控制**而不是速度控制；
- 视觉编码器**端到端**训练（或用小学习率微调），BatchNorm 换 GroupNorm 才能配 EMA；
- 观测 2 帧、预测 16 步、执行 8 步，CNN 骨干先试；
- 不要去掉演示里的停顿，动作块本身就能处理。

<h3 id="dp-意义-4-往人形和全身控制的延伸">4. 往人形和全身控制的延伸</h3>

- [BeyondMimic](../BeyondMimic/BeyondMimic.html)：把扩散从「只生成动作」扩展到「状态 + 潜动作联合扩散」，再用代价引导完成人形全身任务。
- [SMP](../SMP_Reusable_Score-Matching_Motion_Priors/SMP_Reusable_Score-Matching_Motion_Priors.html)：不拿扩散模型直接出动作，而是冻结它当奖励模型。
- [iDP3](../../03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.html)：把输入换成相机自身坐标系下的 3D 点云，用在人形上半身操作上。

</details>

## ⚠️ 局限（论文第 9 节 + 实验里暴露的问题）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：继承行为克隆的局限；推理比 LSTM-GMM 慢；CNN 会平滑快变动作、Transformer 难调</summary>

- **继承行为克隆的局限**：演示不够好、不够多时性能差。论文建议未来把扩散策略用到强化学习等范式，以利用次优数据和负样本（第 9 节）。
- **算力与延迟**：比 LSTM-GMM 计算量大、推理慢；动作块能部分缓解，但对需要高频控制的任务可能不够。未来可用新噪声表、更好的求解器、一致性模型减少推理步数（第 9 节）。
- **骨干各有短板**：CNN 版在动作快速变化（如速度控制）时表现差；Transformer 版对超参敏感（3.1 节）。Block Push 上 CNN 版只有 0.11（表 4）。
- **双臂任务成功率不高**：打蛋器 55%，失败多在初始抓取和分布外初始位置（第 7 节）。
- （笔记补充）全部是机械臂桌面操作，动作是末端位姿 + 夹爪；没有涉及腿式机器人或全身控制，也不处理接触力反馈。

</details>

---

## 📁 官方源码对照

Diffusion Policy **不在 MimicKit 内**；官方实现为 [real-stanford/diffusion_policy](https://github.com/real-stanford/diffusion_policy)（原 columbia-ai-robotics/diffusion_policy，GitHub 会重定向）。

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：UNet / FiLM / Transformer / predict_action / EMA 与论文概念的对照表</summary>

| 论文概念 | 官方路径 | 说明 |
|----------|----------|------|
| 条件去噪 UNet（1D 时序）+ FiLM | `diffusion_policy/model/diffusion/conditional_unet1d.py` | `ConditionalResidualBlock1D`：`cond_predict_scale=True` 时由条件算出每通道 `scale` / `bias`，`out = scale * out + bias` |
| Transformer 变体 | `diffusion_policy/model/diffusion/transformer_for_diffusion.py` | 带噪动作作 token，交叉注意力读观测 |
| 图像策略 + 切出执行段 | `diffusion_policy/policy/diffusion_unet_hybrid_image_policy.py` | `predict_action`：`start = To - 1`，`end = start + n_action_steps`，从 16 步里切出执行的 8 步 |
| 训练 Workspace | `diffusion_policy/workspace/train_diffusion_unet_hybrid_workspace.py` | `TrainDiffusionUnetHybridWorkspace`：训练循环、EMA、定期 rollout 与存档 |
| 默认配置 | `image_pusht_diffusion_policy_cnn.yaml` | `horizon: 16`、`n_obs_steps: 2`、`n_action_steps: 8`、`num_train_timesteps: 100`、`beta_schedule: squaredcos_cap_v2`、`prediction_type: epsilon` |
| 动作归一化 | `diffusion_policy/model/common/normalizer.py` | `LinearNormalizer`，`limits` 模式缩到 $[-1, 1]$ |
| EMA | `diffusion_policy/model/diffusion/ema_model.py` | 训练时维护影子权重，评估加载 `ema_model` |
| 真机推理 | `eval_real_robot.py` | `num_inference_steps = 16`（DDIM）、`--steps_per_inference 6`、10 Hz |

</details>

<h3 id="源码运行时序图">源码运行时序图</h3>

官方仓库训练入口是 `train.py`（Hydra 按 `--config-name` 实例化对应 Workspace），评估入口是 `eval.py`。训练与推理（RHC 滚动执行）的时序如下：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant T as train.py / eval.py<br/>(Hydra)
    participant W as Workspace<br/>(TrainDiffusionUnetHybridWorkspace)
    participant DL as ReplayBuffer +<br/>SequenceSampler
    participant P as DiffusionUnetHybridImagePolicy<br/>(视觉编码器 + ConditionalUnet1D)
    participant ER as EnvRunner<br/>(仿真/真机环境)
    Note over U,ER: 训练（train.py --config-name=image_pusht_diffusion_policy_cnn.yaml）
    U->>T: python train.py --config-name=... training.seed=42
    T->>W: hydra 实例化 Workspace → workspace.run()
    loop 每个 epoch
        W->>DL: 采样 batch：obs 序列 + 长度 H 的动作 chunk A₀
        W->>P: 视觉编码器提取 obs 特征（FiLM 条件）
        W->>P: 随机采样扩散步 k，加噪 A₀ → A_k
        P-->>W: ConditionalUnet1D 预测噪声 ε̂ → MSE(ε̂, ε) 反向传播
        W->>W: EMA 更新影子权重
        W->>ER: 定期 env_runner.run()：整段 rollout 评估成功率
        W->>W: save_checkpoint()
    end
    Note over U,ER: 推理 / RHC 滚动执行（eval.py --checkpoint ...）
    U->>T: python eval.py --checkpoint ... --output_dir ...
    T->>ER: 加载 EMA 权重 → env_runner.run()
    loop 每个控制周期
        ER-->>P: 最近 n_obs_steps=2 帧观测
        P->>P: 从高斯噪声初始化动作 chunk A_K
        loop 去噪 K 步（仿真 DDPM 100 步；真机 DDIM 16 步）
            P->>P: ε̂ = UNet(A_k, k, obs 特征) → A_(k−1)
        end
        P->>P: 切出 start = To−1 起的 n_action_steps 步
        P-->>ER: 执行段（仿真 8 步 / 真机 6 步）
        ER-->>P: 新观测 → 滑动窗口重新预测
    end
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：训练学的是预测噪声，推理用 DDIM + RHC 滚动执行</summary>

- 训练阶段的核心就是 ⑤–⑥：不回归动作本身，而是学"从加噪 chunk 里预测噪声"；EMA（⑦）是复现成功率的关键工程细节。
- 推理阶段对应上文 RHC 流程图：⑬–⑮ 从噪声走 $K$ 步去噪（仿真基准用 iDDPM 推理 100 步，真机用 DDIM 16 步；3.4 节的 10 步在 RTX 3080 上是 0.1 s），⑯ 从 `start = To - 1` 切出执行段——默认 $16 = 1 + 8 + 7$：过去 1 步、执行 8 步、丢掉 7 步，⑰–⑱ 执行完带着新观测再规划，兼顾平滑与反应速度。

</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 节）：训练损失 / 采样循环 / 切出执行段 / FiLM 残差块 / 动作归一化 / EMA / 真机时间戳 / 训练命令</summary>

<h3 id="dp-源码-1-训练损失">1. 训练损失：加噪、预测噪声、MSE</h3>

```python
# diffusion_policy/policy/diffusion_unet_hybrid_image_policy.py —— compute_loss()（节选）
nobs = self.normalizer.normalize(batch['obs'])
nactions = self.normalizer['action'].normalize(batch['action'])     # 动作先缩到 [-1, 1]
this_nobs = dict_apply(nobs, lambda x: x[:, :self.n_obs_steps, ...].reshape(-1, *x.shape[2:]))
global_cond = self.obs_encoder(this_nobs).reshape(batch_size, -1)  # 只编码前 To 帧，当全局条件
noise = torch.randn(trajectory.shape, device=trajectory.device)
timesteps = torch.randint(0, self.noise_scheduler.config.num_train_timesteps, (bsz,), device=trajectory.device).long()
noisy_trajectory = self.noise_scheduler.add_noise(trajectory, noise, timesteps)   # A^0 + ε^k
pred = self.model(noisy_trajectory, timesteps, local_cond=local_cond, global_cond=global_cond)
target = noise                                                       # prediction_type == 'epsilon'
loss = F.mse_loss(pred, target, reduction='none')                    # 论文式 5
```

<h3 id="dp-源码-2-采样循环">2. 采样循环：每次都从纯噪声开始</h3>

```python
# 同文件 —— conditional_sample()（节选）
trajectory = torch.randn(size=condition_data.shape, dtype=condition_data.dtype,
                         device=condition_data.device, generator=generator)   # A^K ~ N(0, I)，没有热启动
scheduler.set_timesteps(self.num_inference_steps)                             # DDPM 100 步 / DDIM 16 步
for t in scheduler.timesteps:
    trajectory[condition_mask] = condition_data[condition_mask]               # inpainting 版才有用
    model_output = model(trajectory, t, local_cond=local_cond, global_cond=global_cond)
    trajectory = scheduler.step(model_output, t, trajectory, generator=generator, **kwargs).prev_sample
```

调度器来自 `diffusers`：仿真配置是 `DDPMScheduler`，真机配置（`train_diffusion_unet_real_hybrid_workspace.yaml`）是 `DDIMScheduler`。

<h3 id="dp-源码-3-切出执行段">3. 切出执行段</h3>

```python
# 同文件 —— predict_action()（节选）
naction_pred = nsample[..., :Da]
action_pred = self.normalizer['action'].unnormalize(naction_pred)   # 反归一化回真实单位
start = To - 1                                                       # 从最后一帧观测的时刻排起
end = start + self.n_action_steps
action = action_pred[:, start:end]                                   # 16 = 1 + 8 + 7
```

<h3 id="dp-源码-4-film-残差块">4. FiLM 残差块</h3>

```python
# diffusion_policy/model/diffusion/conditional_unet1d.py —— ConditionalResidualBlock1D.forward()
out = self.blocks[0](x)                       # Conv1d + GroupNorm + Mish
embed = self.cond_encoder(cond)               # cond = [去噪步嵌入, 观测特征]
if self.cond_predict_scale:
    embed = embed.reshape(embed.shape[0], 2, self.out_channels, 1)
    scale, bias = embed[:, 0, ...], embed[:, 1, ...]
    out = scale * out + bias                  # FiLM：按通道缩放 + 偏置
else:
    out = out + embed
out = self.blocks[1](out)
out = out + self.residual_conv(x)             # 残差
```

<h3 id="dp-源码-5-动作归一化">5. 动作归一化：min-max 到 [−1, 1]</h3>

```python
# diffusion_policy/model/common/normalizer.py —— _fit()，mode='limits'（节选）
input_range = input_max - input_min
ignore_dim = input_range < range_eps                  # 近乎常数的维度
input_range[ignore_dim] = output_max - output_min
scale = (output_max - output_min) / input_range       # = 2 / (max - min)
offset = output_min - scale * input_min               # = -1 - scale * min
offset[ignore_dim] = (output_max + output_min) / 2 - input_min[ignore_dim]   # 只平移，不缩放
```

<h3 id="dp-源码-6-ema">6. EMA：衰减率随步数增长</h3>

```python
# diffusion_policy/model/diffusion/ema_model.py —— get_decay()
step = max(0, optimization_step - self.update_after_step - 1)
value = 1 - (1 + step / self.inv_gamma) ** -self.power   # 配置：inv_gamma 1.0，power 0.75
return max(self.min_value, min(value, self.max_value))   # 上限 0.9999
```

训练早期衰减率小（影子权重跟得快），后期接近 0.9999。视觉编码器里的 BatchNorm 被替换成 `nn.GroupNorm(num_groups=num_features // 16, ...)`（`obs_encoder_group_norm: True`），正是论文 3.2 节说的「GroupNorm 才能配合 EMA」。

<h3 id="dp-源码-7-真机时间戳">7. 真机：给动作打时间戳，丢掉过期的</h3>

```python
# eval_real_robot.py（节选）
policy.num_inference_steps = 16                                   # DDIM 推理步数
policy.n_action_steps = policy.horizon - policy.n_obs_steps + 1   # 16 - 2 + 1 = 15
# ……每个周期……
action_timestamps = (np.arange(len(action), dtype=np.float64) + action_offset) * dt + obs_timestamps[-1]
is_new = action_timestamps > (curr_time + action_exec_latency)    # 推理期间已经过去的动作
this_target_poses = this_target_poses[is_new]                     # 只下发还没过期的
# ……下一次推理在 steps_per_inference = 6 步（0.6 s）之后
```

<h3 id="dp-源码-8-训练与评估命令">8. 训练与评估命令（README）</h3>

```bash
# 单种子训练（图像 Push-T，CNN 版）
python train.py --config-dir=. --config-name=image_pusht_diffusion_policy_cnn.yaml \
  training.seed=42 training.device=cuda:0 hydra.run.dir='data/outputs/${now:%Y.%m.%d}/${now:%H.%M.%S}_${name}_${task_name}'

# 评估一个 checkpoint
python eval.py --checkpoint data/0550-test_mean_score=0.969.ckpt --output_dir data/pusht_eval_output --device cuda:0
```

</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：MimicKit 没有接入 Columbia Diffusion Policy</summary>

<h3 id="mimickit-关系">MimicKit 关系</h3>

> ❌ MimicKit 面向物理仿真 RL 与运动模仿（PPO/AMP/ASE 等），**未集成视觉-运动扩散策略**。MimicKit 仓库中有 `mimickit/learning/tinymdm/` 子目录，属于另一套运动扩散实验，**不是** Columbia Diffusion Policy 实现。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 问）：多模态 / 预测噪声还是动作 / 为什么比 IBC 稳 / T_a 怎么选 / 为什么用位置控制 / 推理慢怎么办 / CNN 还是 Transformer / 和 ACT 的差别</summary>

<h3 id="dp-q1-为什么扩散模型擅长处理多模态">Q1: 为什么扩散模型擅长处理多模态？</h3>

它不回归均值，而是学得分函数 $\nabla_a \log p(a \mid o)$（式 8）；每次采样从不同的高斯噪声出发、每步再加随机扰动，样本会落进不同的峰（4.1 节）。上文例 4：从 +0.3 出发落到上绕峰，从 −0.3 出发落到下绕峰。

<h3 id="dp-q2-预测噪声还是预测动作">Q2: 预测噪声还是预测动作？</h3>

论文和官方配置都预测噪声 $\varepsilon$（`prediction_type: epsilon`）；预测噪声也正对应得分函数，训练不需要能量模型那样的归一化常数。官方代码也支持 `sample`（直接预测干净动作），但默认不用。

<h3 id="dp-q3-为什么比-ibc-训练稳">Q3: 同样能表达多峰，为什么比 IBC 训练稳？</h3>

IBC 的能量模型要用 InfoNCE 和负样本估计归一化常数 $Z$，估计不准就不稳，图 6 里评估成功率上下震荡、很难挑 checkpoint。扩散学的是 $\nabla_a \log p$，$\nabla_a \log Z = 0$，训练就是普通的 MSE 回归噪声（4.4 节）。

<h3 id="dp-q4-执行步数-t_a-怎么选">Q4: 执行步数 $T_a$ 怎么选？为什么不每步都重新规划？</h3>

$T_a > 1$ 让一段动作保持在同一个峰上、能扛住演示里的停顿，也摊薄推理开销；太长则对意外反应慢。论文图 5 左：多数任务 8 步最好。每步重规划（$T_a = 1$）会回到「相邻两步可能换峰」的问题。

<h3 id="dp-q5-为什么用位置控制">Q5: 为什么 Diffusion Policy 用位置控制而不是速度控制？</h3>

图 4：换成位置控制，Diffusion Policy 变好、LSTM-GMM 和 BET 变差。论文推测：位置控制下多峰更明显，而扩散正好能表达多峰；位置控制的误差累积小，更适合预测一段动作序列，抗延迟也更好（延迟 ≤ 4 步性能基本不掉）。

<h3 id="dp-q6-推理慢怎么办">Q6: 扩散要迭代很多步，推理慢怎么办？</h3>

① DDIM 把训练 100 步、推理压到 10 步（RTX 3080 上 0.1 s）或真机 16 步；② 观测只做条件，图像特征每次推理只算一遍；③ 一次出一段动作，每 6–8 步才推理一次；④ 真机脚本给动作打时间戳，丢掉推理期间已经过期的动作。论文承认对高频控制仍不够，建议用一致性模型等进一步减步（第 9 节）。

<h3 id="dp-q7-cnn-还是-transformer">Q7: CNN 版还是 Transformer 版？</h3>

论文建议先用 CNN 版：开箱即用、超参在各任务间基本一致、加大模型总有收益；任务复杂或动作变化快（如速度控制）时再换 Transformer 版，它能减轻卷积的过度平滑，但对注意力 dropout、权重衰减很敏感（3.1 节、附录 A.4）。

<h3 id="dp-q8-diffusion-policy-vs-act">Q8: Diffusion Policy vs ACT (Action Chunking Transformer)？</h3>

论文 v5 正文没有和 ACT 做对比，以下来自 ACT 论文（arXiv:2304.13705）与笔记整理：两者几乎同期，都一次预测一整段动作。ACT 用 CVAE + Transformer，推理时把隐变量取先验均值、一次前向就出整段，并用时间集成（temporal ensembling）把重叠的动作块加权平均；Diffusion Policy 用多步去噪生成整段，执行前 $T_a$ 步后重新规划。多峰的处理方式不同：ACT 靠 CVAE 的隐变量在训练时吸收风格差异，推理时取均值；Diffusion Policy 推理时真的从分布里采样。哪个更好要看任务与数据，笔记没有可引用的直接对比数字。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：与路线图的关系、超参数速查、相关方法对比、参考来源</summary>

<h3 id="a-与路线图的关系">A. 与路线图的关系</h3>

| 论文 | 关系 |
|------|------|
| **Diffusion Policy (2023)** | 扩散 + 控制主线的**起点** |
| [BeyondMimic (2025)](../BeyondMimic/BeyondMimic.html) | 扩散控制在人形机器人全身动态运动上的突破性应用：状态 + 潜动作联合扩散，测试时用代价引导 |
| [SMP](../SMP_Reusable_Score-Matching_Motion_Priors/SMP_Reusable_Score-Matching_Motion_Priors.html) | 同样用扩散模型，但冻结成奖励模型给 RL 用，而不是直接出动作 |
| [π₀](../../03_High_Impact_Selection/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control/Pi0_A_Vision-Language-Action_Flow_Model_for_General_Robot_Control.html) / [GR00T N1](../../03_High_Impact_Selection/GR00T_N1_Humanoid_Foundation_Model/GR00T_N1_Humanoid_Foundation_Model.html) | 把动作块生成搬进 VLA，扩散换成流匹配 |
| [iDP3](../../03_High_Impact_Selection/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies/iDP3_Generalizable_Humanoid_Manipulation_with_3D_Diffusion_Policies.html) | 3D 点云版扩散策略，用在人形上半身操作 |
| [Transformer](../Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.html) | 去噪网络的 Transformer 变体（因果注意力 + 交叉注意力读观测） |

<h3 id="dp-附录-b-超参数速查">B. 超参数速查（CNN 版，表 7）</h3>

| 任务 | 控制 | $T_o$ / $T_a$ / $T_p$ | 图像分辨率 → 裁剪 | 去噪网络 | 推理步数 |
|------|:--:|:--:|------|:--:|:--:|
| Lift / Can / Square | 位置 | 2 / 8 / 16 | 2×84×84 → 2×76×76 | 256 M | 100 |
| ToolHang | 位置 | 2 / 8 / 16 | 2×240×240 → 2×216×216 | 256 M | 100 |
| Push-T（仿真） | 位置 | 2 / 8 / 16 | 1×96×96 → 1×84×84 | 256 M | 100 |
| Block Push | 位置 | 3 / 1 / 12 | 无图像 | 256 M | 100 |
| 真机 Push-T | 位置 | 2 / 6 / 16 | 2×320×240 → 2×288×216 | 67 M | 16 |
| 真机倒酱 / 抹酱 / 翻杯子 | 位置 | 2 / 8 / 16 | 2×320×240 → 2×288×216 | 67 M | 16 |

所有任务学习率 1e-4、权重衰减 1e-6、训练扩散步 100。

<h3 id="dp-附录-c-相关方法对比">C. 相关方法对比（依据论文第 1、4、8 节）</h3>

| 方法 | 动作分布表示 | 多峰 | 输出整段序列 | 训练 | 推理开销 |
|------|--------------|:--:|:--:|------|------|
| MSE 回归 | 单点 | ✗（给均值） | 可以但无意义 | 稳 | 一次前向 |
| LSTM-GMM（BC-RNN） | 混合高斯 | 有限（要定峰数） | 难 | 稳，对超参敏感 | 一次前向 |
| BET | 聚类 + 偏移 | 有限 | 难（逐步采样易换峰） | 稳 | 一次前向 |
| IBC | 能量模型 | ✓ | 难（高维能量面难采样） | 不稳（负样本） | 推理时优化 / 采样 |
| **Diffusion Policy** | 得分函数（梯度场） | ✓ | ✓ | 稳（普通 MSE） | $K$ 步去噪（DDIM 可减到 10–16） |

<h3 id="b-参考来源">D. 参考来源</h3>

- [arXiv:2303.04137](https://arxiv.org/abs/2303.04137)（v5 期刊扩展版：第 2–4 节公式与性质、4.5 节控制理论、表 1–8、附录 A–D）
- [Project Website](https://diffusion-policy.cs.columbia.edu/)
- [官方仓库 real-stanford/diffusion_policy](https://github.com/real-stanford/diffusion_policy)：`diffusion_unet_hybrid_image_policy.py`、`conditional_unet1d.py`、`normalizer.py`、`ema_model.py`、`eval_real_robot.py`、`image_pusht_diffusion_policy_cnn.yaml`、`train_diffusion_unet_real_hybrid_workspace.yaml`、README
- 「具体实例」例 2–4 与交互演示共用玩具数字，例 5 的数字由笔记选取；标注为「笔记补充 / 笔记的阅读」的内容不是论文结论

</details>
