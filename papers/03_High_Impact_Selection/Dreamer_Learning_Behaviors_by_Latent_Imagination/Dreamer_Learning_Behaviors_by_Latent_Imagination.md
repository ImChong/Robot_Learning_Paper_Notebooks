---
layout: paper
title: "Dream to Control: Learning Behaviors by Latent Imagination"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "Dreamer：在潜空间想象中学习行为"
---

# Dream to Control: Learning Behaviors by Latent Imagination
**Dreamer：先从图像里学一个能「往前推演」的潜空间世界模型（沿用 PlaNet 的 RSSM），再完全在这个潜空间里想象轨迹，用值函数补上想象视野之外的回报，并把回报的解析梯度沿学到的动力学一路反传给策略**

> 📅 阅读日期: 2026-10-06
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model
>
> 🧭 状态: 精读版；Dreamer 数值取自 arXiv v3（ICLR 2020）正文、图 4–8 与附录 A，PlaNet 数值取自 arXiv v5（ICML 2019）正文、表 1 与附录 A。本篇把前作 PlaNet 合在一起讲。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | Dreamer [1912.01603](https://arxiv.org/abs/1912.01603)；前作 PlaNet [1811.04551](https://arxiv.org/abs/1811.04551) |
| **项目主页** | [danijar.com/dreamer](https://danijar.com/project/dreamer/)；PlaNet [danijar.com/planet](https://danijar.com/planet) |
| **代码** | [danijar/dreamer](https://github.com/danijar/dreamer)（TensorFlow 2）；PlaNet [google-research/planet](https://github.com/google-research/planet) |
| **作者** | Dreamer：Danijar Hafner, Timothy Lillicrap, Jimmy Ba, Mohammad Norouzi；PlaNet：Danijar Hafner, Timothy Lillicrap, Ian Fischer, Ruben Villegas, David Ha, Honglak Lee, James Davidson |
| **机构** | University of Toronto；Google Brain；DeepMind（PlaNet 另有 Google Research、University of Michigan） |
| **发布时间** | Dreamer 2019-12-03；PlaNet 2018-11-12 |
| **会议** | Dreamer：ICLR 2020；PlaNet：ICML 2019 |
| **对象** | DeepMind Control Suite 的像素输入连续控制（64×64×3 图像），另有部分 Atari / DeepMind Lab |
| **关键词** | World model, RSSM, latent imagination, analytic value gradients, λ-return, CEM planning |

---

## 🎯 一句话总结

PlaNet 先证明「只看像素也能学出够准的潜空间动力学，并在潜空间里在线规划」；Dreamer 保留同一个世界模型，把每一步都要重新跑一遍的 CEM 规划换成一个**在想象轨迹上训练的 actor-critic**：critic 用 λ-return 估计想象视野之外的价值，actor 直接对这个价值求导，梯度穿过奖励模型、转移模型一路传回动作。20 个像素控制任务上，Dreamer 用 $5\times10^6$ 步平均 823 分，超过 PlaNet 的 332 分和用了 $10^8$ 步的 D4PG（786 分）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **RSSM** | Recurrent State-Space Model | PlaNet 提出的潜状态模型：确定性 GRU 路径 + 随机高斯路径并存 |
| **CEM** | Cross-Entropy Method | 交叉熵法：采一批动作序列，挑最好的若干条重新拟合分布，迭代几轮 |
| **ELBO** | Evidence Lower Bound | 变分下界：重建项 + 奖励项 − KL 项 |
| **KL** | Kullback–Leibler divergence | 后验（看了图像）与先验（没看图像）差多远 |
| **MPC** | Model Predictive Control | 每步重新规划、只执行第一步 |
| **DMC** | DeepMind Control Suite | 连续控制基准，本文用像素输入版本 |
| **D4PG / A3C** | Distributed Distributional DDPG / Asynchronous Advantage Actor-Critic | 论文对照的两个无模型强基线 |

---

## ❓ Dreamer 要解决什么问题？

无模型 RL（PPO、SAC、D4PG）要靠海量真实交互；从像素学控制时更夸张，D4PG 在 DMC 上要 $10^8$ 步。直觉上，如果能学一个「模拟器」，大部分试错就可以在脑子里做。论文把这件事拆成两个问题：

1. **能不能从像素学出够准的动力学？** 像素空间预测成本高、误差累积快。PlaNet 的回答是：在一个紧凑的**潜空间**里预测，并且转移里同时放确定性记忆和随机性（RSSM）。
2. **有了模型，行为怎么来？** PlaNet 用 CEM 在线规划，只看规划视野 $H$ 以内的奖励，且每一步都要现算；Dreamer 指出两个毛病：**短视**（看不到视野之外）和**没用上神经网络动力学可求导这一点**（CEM 是无导数优化）。Dreamer 的答案是在潜空间里学 actor 和 critic，用解析梯度优化。

---

## 🔧 方法详解

### 1. 前作 PlaNet：潜空间世界模型 + 在线规划

**世界模型（RSSM）**。状态拆成两半：确定性的 $h_t$（GRU，200 单元）负责跨很多步记住信息，随机的 $s_t$（30 维对角高斯）负责表达「未来可能有好几种」。论文图 2 对比了三种转移：

| 转移 | 结构 | 论文结论（PlaNet 图 4） |
|------|------|------|
| 纯确定性 RNN（GRU） | 只有 $h_t$ | 只能预测一种未来，规划器容易钻模型漏洞，六个任务几乎都学不起来 |
| 纯随机 SSM | 只有 $s_t$ | 难以跨多步记忆，明显弱于 RSSM |
| **RSSM** | $h_t$ + $s_t$ | 六个任务都最好；「随机部分更重要，没有它智能体学不会」 |

训练目标是变分下界：图像重建 $\ln p(o_t \mid s_t)$ + 奖励重建 $\ln p(r_t \mid s_t)$ − 后验与先验之间的 KL。KL 不加权重，但给 3 个 free nats（KL 低于 3 就不再压）。PlaNet 还提出了 **latent overshooting**（在潜空间里对多步预测也做 KL 约束），但附录 A 说最终版本发现不需要。

**规划器（CEM）**。每个真实时间步：从零均值、单位方差的动作序列分布出发，采 $J=1000$ 条长度 $H=12$ 的动作序列，用模型推演并累加预测奖励，取最好的 $K=100$ 条重新拟合均值和方差，迭代 $I=10$ 轮，执行均值的第一个动作；下一步分布**重置**回零均值、单位方差，避免陷进局部最优。

### 2. Dreamer 的世界模型：和 PlaNet 同一个

Dreamer 式 1 写成三件套：表示模型 $p(s_t \mid s _ {t-1}, a _ {t-1}, o_t)$、转移模型 $q(s_t \mid s _ {t-1}, a _ {t-1})$、奖励模型 $q(r_t \mid s_t)$；训练时再加观测模型 $q(o_t \mid s_t)$ 提供重建信号（式 9–10）。实现上直接复用 PlaNet 的 RSSM。第 4 节和图 8 比了三种表示学习目标：**像素重建最好**，对比学习（NCE）能解约一半任务，**只预测奖励不够用**。

### 3. 在想象中学行为：actor-critic

从回放数据里抽一批真实序列，算出每个时刻的模型状态 $s_t$，以它们为起点，只用转移模型和 actor 往前想象 $H=15$ 步（附录 A），不碰真实环境、也不生成图像。

- **Actor**：$a_\tau = \tanh\big(\mu_\phi(s_\tau) + \sigma_\phi(s_\tau)\,\epsilon\big)$，$\epsilon \sim \mathcal N(0, I)$（式 3）。重参数化让采样出的动作对网络参数可导。
- **Critic**：$v_\psi(s_\tau)$ 估计从 $s_\tau$ 出发的想象回报。

**价值估计（式 4–6）**。三种估计在偏差与方差之间取舍：

$$V_\lambda(s_\tau) = (1-\lambda)\sum _ {n=1}^{H-1}\lambda^{n-1}V_N^n(s_\tau) + \lambda^{H-1}V_N^H(s_\tau)$$

其中 $V_N^k$ 是「先累加 $k$ 步预测奖励，再接上 critic 在第 $k$ 步的估值」；$V_R$ 只累加视野内奖励、不用 critic。Dreamer 用 $V_\lambda$，$\gamma = 0.99$，$\lambda = 0.95$。

**两个目标（式 7–8）**：

- Actor 最大化 $\sum_\tau V_\lambda(s_\tau)$。$V_\lambda$ 依赖预测奖励和 critic 值 → 依赖想象状态 → 依赖想象动作，全是神经网络，所以梯度可以**解析地**一路反传到 actor 参数（论文说法：analytic gradients / stochastic backpropagation）。学行为时世界模型参数固定。
- Critic 回归 $\tfrac12\big(v_\psi(s_\tau) - V_\lambda(s_\tau)\big)^2$，目标处停梯度。

**和常见 actor-critic 的区别**（论文第 3 节末）：PPO、A3C 用 REINFORCE 梯度 + 价值基线降方差；DDPG、SAC 对**一步** Q 值求导；Dreamer 对**多步**想象回报求导，且梯度穿过学到的转移。

### 4. 和环境交互

先用随机动作收集 $S=5$ 个 episode；之后每做 100 次训练更新，就用当前 actor（取分布的众数，加 $\mathcal N(0, 0.3)$ 探索噪声）收集 1 个新 episode（附录 A）。动作重复 $R=2$ 对所有任务固定。

### 5. 关键超参数（附录 A）

| 项 | Dreamer | PlaNet |
|----|---------|--------|
| 潜状态 | RSSM，30 维对角高斯 + 确定性路径 | GRU 200 单元 + 30 维对角高斯 |
| 其余网络 | 3 层 300 宽 ELU | 2 层 200 宽 ReLU |
| 批次 | 50 条序列 × 长 50 | 50 条序列 × 长 50 |
| 学习率 | 世界模型 $6\times10^{-4}$，critic / actor $8\times10^{-5}$ | $10^{-3}$ |
| KL | $\beta = 1$，3 free nats | 不缩放，3 free nats |
| 行为 | 想象视野 $H=15$，$\gamma=0.99$，$\lambda=0.95$ | CEM：$H=12$，$I=10$，$J=1000$，$K=100$ |
| 动作重复 | 统一 $R=2$ | 按任务 2–8 |

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
  subgraph D["真实经验"]
    E["环境交互<br/>actor + 探索噪声"] --> B["回放数据集<br/>图像、动作、奖励"]
  end
  subgraph W["① 学世界模型（RSSM）"]
    B --> R["表示模型：看图像<br/>算潜状态"]
    R --> T["转移模型：不看图像<br/>往前预测"]
    R --> O["图像重建 + 奖励预测<br/>+ KL 约束"]
  end
  subgraph I["② 在潜空间想象中学行为"]
    T --> IM["从真实潜状态出发<br/>想象 15 步"]
    IM --> V["critic 算 λ-return"]
    V --> A["actor 沿动力学<br/>反传价值梯度"]
  end
  A --> E
</div>

PlaNet 的位置：它只有 ①，行为部分是「每个真实时间步用 CEM 在 ① 的模型里搜动作序列」，没有 actor 和 critic。

---

## 🚶 具体实例：一条 3 步想象轨迹的 λ-return

为看清式 5–6 怎么算，取一条很短的想象轨迹（$H=3$，数字是笔者编的玩具值；Dreamer 实际 $H=15$），$\gamma=0.99$，$\lambda=0.95$：

| 想象步 $\tau$ | 0 | 1 | 2 | 3 |
|------|---|---|---|---|
| 预测奖励 $r_\tau$ | 0 | 0 | 1 | 0 |
| critic 估值 $v(s_\tau)$ | — | 0.5 | 0.8 | 0.9 |

**第 1 步：三种 $k$ 步估计**

- $V_N^1 = r_0 + \gamma\,v(s_1) = 0.99 \times 0.5 = 0.495$
- $V_N^2 = r_0 + \gamma r_1 + \gamma^2 v(s_2) = 0.9801 \times 0.8 = 0.7841$
- $V_N^3 = r_0 + \gamma r_1 + \gamma^2 r_2 + \gamma^3 v(s_3) = 0.9801 + 0.9703 \times 0.9 = 1.8534$

**第 2 步：λ 加权**。权重依次是 $1-\lambda = 0.05$、$(1-\lambda)\lambda = 0.0475$、$\lambda^2 = 0.9025$，三者相加为 1：

$$V_\lambda = 0.05 \times 0.495 + 0.0475 \times 0.7841 + 0.9025 \times 1.8534 = 1.7347$$

**第 3 步：对照不用 critic 的 $V_R$**。$V_R = 0 + 0 + 1 + 0 = 1$。它只看到视野里那一个奖励，完全不知道 $s_3$ 之后还有价值（critic 认为约 0.9）。这正是图 4 里「No value」那条线：视野一短就学不好。

**第 4 步：梯度往哪走**。$V_\lambda$ 里的 $r_2$、$v(s_3)$ 都是想象状态的函数，想象状态又由 actor 给出的 $a_0, a_1, a_2$ 推出来，所以 $\partial V_\lambda / \partial \phi$ 可以穿过奖励模型、critic 和转移模型直接算出来。critic 那一侧则只把 1.7347 当回归目标（停梯度）。

**对照：PlaNet 每一步要推演多少次**。CEM 每个真实时间步做 $I \times J = 10 \times 1000 = 10{,}000$ 条长 $H=12$ 的推演，即 120,000 次潜空间转移；Dreamer 部署时只跑一次 actor 前向。论文报告训练耗时：Dreamer 每 $10^6$ 环境步约 3 小时，PlaNet 约 11 小时，D4PG 达到相近表现约 24 小时（单张 V100）。

---

## 📊 实验结果

### PlaNet（6 个 DMC 像素任务，表 1）

| 方法 | 输入 | 训练 episode | Cartpole Swing Up | Reacher Easy | Cheetah Run | Finger Spin | Cup Catch | Walker Walk |
|------|------|------|------|------|------|------|------|------|
| A3C | 本体状态 | 100,000 | 558 | 285 | 214 | 129 | 105 | 311 |
| D4PG | 像素 | 100,000 | 862 | 967 | 524 | 985 | 980 | 968 |
| **PlaNet** | 像素 | **1,000** | 821 | 832 | **662** | 700 | 930 | 951 |
| CEM + 真模拟器 | 模拟器状态 | 0 | 850 | 964 | 656 | 825 | 993 | 994 |

- 1,000 个 episode 接近或超过 D4PG 的 100,000 个；Cheetah Run 比 D4PG 高 26%（662 vs 524）。论文摘要口径：平均少用约 200 倍环境交互。
- 「CEM + 真模拟器」是规划器的上限参考：Cheetah Run 上 PlaNet 已经追平。

### Dreamer（20 个 DMC 像素任务）

| 结论 | 证据 |
|------|------|
| 最终表现最好 | 图 6：$5\times10^6$ 步平均 823；PlaNet 332；D4PG 用 $10^8$ 步 786 |
| 对想象视野不敏感 | 图 4：在不同想象视野下 Dreamer 都稳定；去掉 critic（No value）和 PlaNet 在视野短时明显变差 |
| 长时程信用分配 | 图 7：Acrobot、Hopper 这类需要长时程信用分配的任务 Dreamer 能解，No value 与 PlaNet 只在 Walker 这类反应式任务上成功；附录 D 中视野 20 时 20 个任务赢 16、平 4 |
| 表示学习目标 | 图 8：像素重建 > 对比学习（约解一半） > 只预测奖励（不够） |
| 计算 | 单 V100 + 10 核 CPU，每 $10^6$ 步约 3 小时 |

---

## ⚠️ 局限

- **只在仿真像素任务上验证**：DMC 的 64×64 图像、固定相机，离真实机器人的视觉复杂度很远；论文结论里也说更复杂视觉环境要靠表示学习的进步。
- **模型误差**：actor 对想象回报求导，会主动去找世界模型「预测得好看但实际做不到」的方向。论文没有专门的对策（笔者推测这是后来 DreamerV2/V3 加入离散潜变量、KL balancing 等改动的动机之一，原文未讨论）。
- **重建目标偏向像素细节**：图 8 显示重建最好，但重建会把模型容量花在与任务无关的背景上。
- **PlaNet 的规划成本**：每步 12 万次潜空间转移，难以直接用在高频控制上；Dreamer 正是为了解决这一点。

---

## 🤖 对人形机器人的意义

- **「世界模型 + 在想象里学策略」这条线的起点**。后来的 DreamerV2（Atari）、DreamerV3（多领域单一配置）、以及用视频生成模型当世界模型的 UniPi、Cosmos Policy、DreamZero，都在回答 Dreamer 提出的同一个问题：模型学好了，行为怎么从模型里来。Cosmos Policy 的相关工作里直接把「Dreamer 系列」列为世界模型与规划结合的代表。
- **两种「用模型」的方式**：PlaNet 是在线规划（每步搜索），Dreamer 是离线蒸馏成策略（部署时只前向）。今天视频世界模型做机器人控制时同样在这两者之间取舍：Cosmos Policy 用 best-of-N 在线搜索，代价是每个动作块约 5 秒。
- **对人形强化学习的直接启示**（笔者推测，论文没有做人形实验）：人形 sim-to-real 主流仍是无模型 PPO + 大规模并行仿真，因为仿真步很便宜；世界模型的价值更多体现在真实交互昂贵、或需要从视频里学动力学的场景。

---

## 🎤 面试高频问题 & 参考回答

**Q1：PlaNet 和 Dreamer 用的是同一个世界模型，区别到底在哪？**

A：区别在「行为从哪来」。PlaNet 每个真实时间步用 CEM 在模型里搜一条 12 步的动作序列，只看视野内奖励，且搜索不用梯度；Dreamer 在模型里训练 actor 和 critic，critic 补上视野外的价值，actor 用解析梯度优化，部署时只需一次前向。

**Q2：RSSM 为什么要同时有确定性和随机两条路径？**

A：确定性 GRU 路径负责跨多步稳定地记住信息；随机路径负责表达「同一历史下未来有多种可能」，否则模型只能给一个平均未来，规划器还会利用模型的确定性漏洞。PlaNet 图 4 里纯 GRU 几乎学不会，纯随机 SSM 也明显弱于 RSSM。

**Q3：为什么用 λ-return，不直接用 $H$ 步奖励和？**

A：只累加视野内奖励（$V_R$）会短视，图 4 中视野一短就失败；只用一步 bootstrap（$V_N^1$）则完全依赖 critic，偏差大。$V_\lambda$ 是不同步数估计的指数加权平均，在偏差和方差之间折中，并让结果对视野长度不敏感。

**Q4：Dreamer 的 actor 梯度和 PPO 的策略梯度有什么本质不同？**

A：PPO 用似然比（REINFORCE）梯度，不需要知道环境怎么转移，但方差大、靠价值基线降方差；Dreamer 的环境本身是可导的神经网络，可以对多步回报直接求导（重参数化），方差小、样本效率高，代价是梯度质量受世界模型准确度限制。

**Q5：只预测奖励能不能学出够用的潜空间？**

A：图 8 的结论是不够。奖励信号稀疏、信息量少，有限数据下学不出泛化好的表示；加上图像重建（或对比学习）这类与奖励相关但更密集的信号，模型才学得好。

---

## 💬 讨论记录

- 国庆系列《具身智能从入门到精通》day5 的「世界模型」脉络把 Dreamer（含 PlaNet）放在 Cosmos 等视频世界模型之前，本站据此把它补进路线图和视频号发布清单。
- 读图 6 时注意横向比较的步数口径：Dreamer、PlaNet 是 $5\times10^6$ 步，D4PG、A3C 是 $10^8$ 步（来自 Tassa et al. 2018 的报告值）。

---

## 🔗 相关阅读

| 论文 | 关系 |
|------|------|
| [PPO](../../01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html) | 无模型策略梯度的代表，Q4 的对照 |
| [UniPi](../UniPi_Learning_Universal_Policies_via_Text-Guided_Video_Generation/UniPi_Learning_Universal_Policies_via_Text-Guided_Video_Generation.html) | 把「世界模型」换成文本条件视频生成，再用逆动力学取动作 |
| [Cosmos](../Cosmos_World_Foundation_Model_Platform_for_Physical_AI/Cosmos_World_Foundation_Model_Platform_for_Physical_AI.html) | 大规模视频世界基础模型 |
| [Cosmos Policy](../Cosmos_Policy_Fine-Tuning_Video_Models_for_Visuomotor_Control_and_Planning/Cosmos_Policy_Fine-Tuning_Video_Models_for_Visuomotor_Control_and_Planning.html) | 把视频模型同时当策略、世界模型、价值函数，并做 best-of-N 规划；相关工作引用 Dreamer 系列 |
| [DreamZero](../../06_Manipulation/DreamZero_World_Action_Models_are_Zero-shot_Policies/DreamZero_World_Action_Models_are_Zero-shot_Policies.html) | 世界—动作模型直接当零样本策略 |

---

## 📎 附录：参考来源

- Dreamer：<https://arxiv.org/abs/1912.01603>（v3，2020-03-17，ICLR 2020）
- PlaNet：<https://arxiv.org/abs/1811.04551>（v5，2019-06-04，ICML 2019）
- 项目主页：<https://danijar.com/project/dreamer/>、<https://danijar.com/planet>
- 代码：<https://github.com/danijar/dreamer>、<https://github.com/google-research/planet>
