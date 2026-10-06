---
layout: paper
title: "Learning Universal Policies via Text-Guided Video Generation"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "UniPi：用文本引导的视频生成学习通用策略"
---

# Learning Universal Policies via Text-Guided Video Generation
**UniPi：把决策改写成「给定当前画面和一句文字，生成一段完成任务的未来视频」，再用一个小的逆动力学模型把相邻帧翻译成动作——图像当通用状态空间、文字当任务说明，视频生成模型可以先在互联网视频上预训练**

> 📅 阅读日期: 2026-10-06
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model
>
> 🧭 状态: 精读版；数值均取自 arXiv v3（NeurIPS 2023）正文、表 1–4 与附录 A。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2302.00111](https://arxiv.org/abs/2302.00111) |
| **项目主页** | [universal-policy.github.io/unipi](https://universal-policy.github.io/unipi/) |
| **代码** | 官方实验在 Google 内部完成、源码未公开；项目主页推荐用 [flow-diffusion/AVDC](https://github.com/flow-diffusion/AVDC) 作为训练 UniPi 的开源视频建模代码 |
| **作者** | Yilun Du\*, Mengjiao Yang\*, Bo Dai, Hanjun Dai, Ofir Nachum, Joshua B. Tenenbaum, Dale Schuurmans, Pieter Abbeel（\* 共同一作） |
| **机构** | MIT；Google DeepMind；UC Berkeley；Georgia Tech；University of Alberta |
| **发布时间** | 2023-01-31 |
| **会议** | NeurIPS 2023 |
| **对象** | 仿真机械臂积木 / 多任务桌面操作，以及 Bridge 真实机器人数据上的视频生成 |
| **关键词** | Video diffusion, text-conditioned planning, inverse dynamics, UPDP, internet-scale pretraining |

---

## 🎯 一句话总结

UniPi 提出「策略即视频」：一个文本 + 首帧条件的视频扩散模型充当**与具体机器人无关的规划器**，生成一段完成任务的未来画面；一个只有几层卷积的**逆动力学模型**把这段画面翻译成机器人动作并开环执行。这样任务用自然语言描述、不需要奖励函数，规划器还能先在 1,400 万对视频—文本数据上预训练。仿真积木任务里，它在训练没见过的语言组合上仍有 60.1%（Place）/ 46.1%（Relation）的完成率，同类基线都在 13% 以下。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **UniPi** | Universal Policy | 本文方法名 |
| **UPDP** | Unified Predictive Decision Process | 本文提出的决策抽象：图像空间 + 文字任务 + 视频生成器，替代 MDP |
| **MDP** | Markov Decision Process | 标准强化学习抽象：状态、动作、转移、奖励 |
| **IDM** | Inverse Dynamics Model | 逆动力学模型：看相邻两帧，推出中间做了什么动作 |
| **CFG** | Classifier-Free Guidance | 无分类器引导：把有条件和无条件的去噪结果外推组合，加强条件的作用 |
| **T5** | Text-to-Text Transfer Transformer | 文本编码器，本文用 T5-XXL（46 亿参数）编码指令 |
| **FID / FVD** | Fréchet Inception / Video Distance | 生成图像 / 视频与真实分布的距离，越低越好 |
| **BC / TT** | Behavior Cloning / Trajectory Transformer | 对照基线：直接预测动作 / 动作序列的 Transformer |

---

## ❓ UniPi 要解决什么问题？

想做一个「什么任务都能干」的智能体，论文认为 MDP 这套抽象有三个障碍（第 2.1 节）：

1. **没有通用状态接口**：MuJoCo 的关节空间和 Atari 的像素空间完全不同，跨环境共享知识很难；
2. **必须有实值奖励**：很多实际任务里奖励怎么设计、怎么迁移都不清楚；
3. **动力学与具体环境和动作空间绑死**：$T(s' \mid s, a)$ 依赖于这台机器人的动作定义。

与此同时，文本生成图像 / 视频的模型已经展现出很强的组合泛化。UniPi 的问题是：**能不能直接拿「文本条件视频生成」当策略**——图像当通用状态，文字当任务，规划在视频空间里做，动作的事交给一个环境专属的小模型。

---

## 🔧 方法详解

### 1. UPDP：把决策问题改写成视频生成

论文定义 $\mathcal G = \langle \mathcal X, \mathcal C, H, \rho \rangle$：$\mathcal X$ 是图像观测空间，$\mathcal C$ 是文字任务描述，$H$ 是视野长度，$\rho(\cdot \mid x_0, c)$ 是一个条件视频生成器，给定首帧 $x_0$ 和任务 $c$，输出 $H$ 步图像轨迹的分布。动作由另一个策略 $\pi(\cdot \mid \{x_h\} _ {h=0}^{H}, c)$ 从图像轨迹里推出。

和 MDP 相比：**不需要奖励函数**（文字就是任务说明）；**规划与动作解耦**（$\rho$ 与机器人无关，可以复用和调试，视频人也看得懂）。代价是需要「视频 + 文字」形式的数据。

### 2. 视频规划器：四个关键设计

规划器是视频扩散模型（沿用 Imagen Video 的架构与训练方式），去噪时用 CFG：

$$\hat s(\tau_k, k \mid c, x_0) = (1+\omega)\, s(\tau_k, k \mid c, x_0) - \omega\, s(\tau_k, k)$$

$\omega$ 控制文字与首帧条件的强度。在此之上论文改了四处：

| 设计 | 做法 | 为什么 |
|------|------|------|
| **首帧条件** | 训练时就把视频第一帧作为显式条件 | 只在采样时「钉住」首帧的做法效果差，后续帧会偏离真实画面 |
| **轨迹一致性（tiling）** | 把观测图像沿时间复制，逐帧与噪声帧按通道拼接 | 普通文生视频里场景会大幅变化；规划要求环境保持一致 |
| **分层规划** | 先生成时间上稀疏的粗视频，再用时间超分模型补帧 | 长视野直接搜索代价指数增长；粗到细也提升帧间一致性 |
| **可调行为** | 采样时叠加先验 $h(\tau)$（如引导到某张中间图像） | 测试时加约束，不用重训（图 7） |

仿真实验里，首帧条件模型生成 10×48×64 的视频（每隔 8 帧取 1 帧），时间超分模型生成 20×48×64（每隔 4 帧取 1 帧），各 1.7B 参数；文字用 T5-XXL 编码；每个扩散模型训练 2M 步，batch 2048，256 块 TPU-v4（附录 A.1）。

### 3. 逆动力学：从视频到动作

IDM 是一个很小的网络：1 层 3×3 卷积 + 3 层带残差的 3×3 卷积 + 全局平均池化 + (128, 7) 的 MLP，直接回归仿真机械臂的 7 维控制量（MSE 损失，附录 A.2）。它的训练**与规划器独立**，可以用更小、甚至次优的仿真数据。

执行时：生成 $H$ 帧 → IDM 推出 $H$ 个动作。论文说可以闭环（每执行一步重新生成，即 MPC），但为了计算效率，**所有实验都用开环**：一次生成、依次执行完。

### 4. 三类实验设定

| 设定 | 数据 | 测什么 |
|------|------|------|
| 组合泛化（4.1） | PDSketch 积木环境；脚本智能体生成 20 万段视频；指令 70% 训练、30% 只在测试出现 | 没见过的语言组合能否完成 |
| 多环境迁移（4.2） | CLIPort 风格桌面任务；10 个任务训练、3 个新任务测试；20 万段视频 | 跨任务迁移 |
| 真实世界（4.3） | 预训练：1,400 万视频—文本对 + 6,000 万图像—文本对 + LAION-400M；微调：Bridge 7.2k 视频—文本对（80/20 划分） | 互联网预训练是否帮助真实机器人视频规划 |

所有基线（State / Image + Transformer BC、Image + TT、Diffuser）都在连续关节空间预测动作，同样用 T5 编码指令；因为没有奖励函数，离线 RL 基线不适用。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
  subgraph P["与机器人无关的规划器"]
    X["当前画面 x0"] --> V["首帧条件视频扩散<br/>粗视频 10 帧"]
    C["文字任务 c<br/>T5-XXL 编码"] --> V
    V --> S["时间超分<br/>补到 20 帧"]
  end
  subgraph A["机器人专属的动作模块"]
    S --> I["逆动力学模型<br/>相邻帧 → 7 维动作"]
    I --> R["开环执行整段动作"]
  end
  W["互联网视频—文本预训练"] -.-> V
</div>

---

## 🚶 具体实例：每个规划器设计各贡献多少

表 2 在「训练见过的 Place / Relation 任务」上逐个加组件，把相邻两行相减就能看出每一项的贡献：

| 首帧条件 | 帧一致性 | 时间分层 | Place 完成率 | 增量 | Relation 完成率 | 增量 |
|:---:|:---:|:---:|------|------|------|------|
| ✗ | ✗ | ✗ | 13.2 | — | 12.4 | — |
| ✓ | ✗ | ✗ | 52.4 | +39.2 | 34.7 | +22.3 |
| ✓ | ✓ | ✗ | 53.2 | +0.8 | 39.4 | +4.7 |
| ✓ | ✓ | ✓ | 59.1 | +5.9 | 53.2 | +13.8 |

读法：

1. **首帧条件是地基**：不告诉模型当前画面，生成的视频和真实场景对不上，IDM 推出的动作自然无效；这一项在两类任务上都贡献最大。
2. **帧一致性在 Relation 上更有用**（+4.7 vs +0.8）。笔者推测：Relation 要求把积木放在另一块积木的左 / 右边，依赖背景里其他积木的位置保持不变；Place 只要放进某个容器，对背景漂移不那么敏感（论文只说「所有组件都关键」，没有逐项解释）。
3. **时间分层对 Relation 帮助最大**（+13.8）。论文的解释是分层让视频计划更细致。

**CFG 的一次数值演算**（玩具数字，只为看清公式）：某个像素上有条件去噪输出 $s(\cdot \mid c, x_0) = 0.6$，无条件输出 $s(\cdot) = 0.2$，取 $\omega = 1$：

$$\hat s = 2 \times 0.6 - 1 \times 0.2 = 1.0$$

结果沿「有条件 − 无条件」的方向又往前推了 0.4，条件（文字和首帧）的影响被放大；$\omega = 0$ 时退化为普通条件去噪。

---

## 📊 实验结果

### 组合泛化（表 1，任务完成率 %）

| 方法 | 见过·Place | 见过·Relation | 新组合·Place | 新组合·Relation |
|------|------|------|------|------|
| State + Transformer BC | 19.4 | 8.2 | 11.9 | 3.7 |
| Image + Transformer BC | 9.4 | 11.9 | 9.7 | 7.3 |
| Image + TT | 17.4 | 12.8 | 13.2 | 9.1 |
| Diffuser | 9.0 | 11.2 | 12.5 | 9.6 |
| **UniPi** | **59.1** | **53.2** | **60.1** | **46.1** |

### 多任务迁移（表 3，3 个新任务完成率 %）

| 方法 | Place Bowl | Pack Object | Pack Pair |
|------|------|------|------|
| State + Transformer BC | 9.8 | 21.7 | 1.3 |
| Image + Transformer BC | 5.3 | 5.7 | 7.8 |
| Image + TT | 4.9 | 19.8 | 2.3 |
| Diffuser | 14.8 | 15.9 | 10.5 |
| **UniPi** | **51.6** | **75.5** | **45.7** |

### 真实世界视频规划（表 4，Bridge 测试集，24×40 分辨率）

| 模型 | CLIP Score ↑ | FID ↓ | FVD ↓ | 成功率 ↑ |
|------|------|------|------|------|
| 不预训练 | 24.43 | 17.75 | 288.02 | 72.6% |
| 互联网预训练 | 24.54 | 14.54 | 264.66 | 77.1% |

- 「成功率」不是真机执行结果，而是论文另训的**成功分类器**看生成视频最后一帧判断任务是否完成（CLIP Score 反映不出「视频没完成任务」，所以作者自建了这个代理指标）。
- 图 8：没在训练集出现的指令（如 Bridge 里不存在的任务），预训练模型能生成合理视频，从零训练的模型会生成别的任务。图 9：对黑边裁剪、P 图加物体等背景变化较鲁棒。

---

## ⚠️ 局限（论文第 6 节）

- **慢**：视频扩散生成一段高清视频可能要一分钟；作者初步尝试蒸馏得到 16 倍加速。
- **全可观假设**：实验环境基本全可观；部分可观时视频模型可能「幻觉」出不存在的物体或运动。
- **开环执行**：所有实验都一次生成、开环执行，没有用闭环重规划（笔者补充：这意味着执行中出现扰动时无法纠正）。
- **真实世界只评了视频质量**：第 4.3 节没有报告真机执行成功率，只有生成质量和分类器判定的成功率。

---

## 🤖 对人形机器人的意义

- **「视频当规划、逆动力学出动作」的范式起点之一**。后来大量工作沿用「先生成未来视频 / 潜变量，再解码动作」的拆法；Cosmos Policy 在相关工作里把这类「先微调视频模型、再训独立的动作模块或逆动力学模型」的路线列为要简化的对象，改成单阶段、不加新模块。
- **跨形态的潜力与代价**：图像是所有机器人共享的接口，规划器可以从人类视频里学；但 IDM 仍是每台机器人单独训练的，人形的高维全身动作能否从视频里可靠反推，论文没有涉及（笔者推测这是把该范式搬到人形上的主要难点）。
- **与 Dreamer 的对照**：Dreamer 学的是「给定动作预测下一个潜状态」的动作条件世界模型，在想象中优化策略；UniPi 的视频模型不吃动作，只吃文字，相当于直接生成「理想的未来」，动作靠 IDM 事后补。论文相关工作明确指出传统世界模型需要严格的状态—动作—奖励格式数据，与互联网视频不兼容。

---

## 🎤 面试高频问题 & 参考回答

**Q1：UniPi 为什么不需要奖励函数？**

A：它把任务写成文字条件 $c$，规划器直接生成「完成 $c$ 的视频」，学的是有条件的生成分布而不是最大化回报。训练数据是带文字说明的演示视频，相当于模仿学习，所以不需要奖励，也就没法用离线 RL 基线对比。

**Q2：为什么要单独一个逆动力学模型，而不是让扩散模型直接输出动作？**

A：一是解耦：视频规划器与机器人无关，可以在互联网视频上预训练、跨机器人复用；动作空间只在 IDM 里出现。二是论文的 Diffuser 基线就是「直接扩散动作」，在组合泛化上只有约 9–12%，远低于 UniPi。IDM 本身很小，可以用少量甚至次优的仿真数据训练。

**Q3：首帧条件为什么要在训练时加，而不是采样时把第一帧固定住？**

A：论文试过采样时固定首帧（Diffuser 式的 inpainting），后续帧会显著偏离观测画面。训练时把首帧作为显式条件，模型才学会「从这张图出发」生成连续的未来，表 2 中这一项贡献 +39.2 / +22.3 个百分点。

**Q4：UniPi 和 Dreamer 这类世界模型有什么本质区别？**

A：Dreamer 的模型是动作条件的 $p(s' \mid s, a)$，策略在模型里通过回报梯度优化；UniPi 的视频模型以文字为条件、不以动作为条件，直接生成目标轨迹，动作由 IDM 反推。前者需要状态—动作—奖励数据，后者可以吃无动作标注的视频 + 文字。

**Q5：真实世界实验的 77.1% 能说明真机成功率吗？**

A：不能。那是成功分类器对生成视频最后一帧的判定，衡量的是「视频计划看起来完成了任务」，没有经过 IDM 和真机执行。

---

## 💬 讨论记录

- 国庆系列《具身智能从入门到精通》day5 把 UniPi 列在世界模型脉络里，作为「视频生成即策略」的代表；本站据此补进路线图与发布清单，排在 Dreamer 之后、Cosmos 之前。
- 论文正文写「预训练后 FID、FVD 显著更高」，但表 4 里两者都是越低越好、预训练后数值更低，应理解为「更好」。

---

## 🔗 相关阅读

| 论文 | 关系 |
|------|------|
| [Dreamer](../Dreamer_Learning_Behaviors_by_Latent_Imagination/Dreamer_Learning_Behaviors_by_Latent_Imagination.html) | 动作条件的潜空间世界模型；UniPi 相关工作引用其后续 DreamerV2 |
| [Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html) | 直接在动作空间做扩散；UniPi 在像素空间做扩散 |
| [Cosmos](../Cosmos_World_Foundation_Model_Platform_for_Physical_AI/Cosmos_World_Foundation_Model_Platform_for_Physical_AI.html) | 更大规模的视频世界基础模型 |
| [Cosmos Policy](../Cosmos_Policy_Fine-Tuning_Video_Models_for_Visuomotor_Control_and_Planning/Cosmos_Policy_Fine-Tuning_Video_Models_for_Visuomotor_Control_and_Planning.html) | 不再另训逆动力学，动作直接作为视频模型的潜帧生成 |
| [DreamGen](../../06_Manipulation/DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models/DreamGen__Unlocking_Generalization_in_Robot_Learning_through_Video_World_Models.html) | 用视频世界模型生成合成轨迹，再用逆动力学 / 潜动作补标签 |
| [UVA](../../06_Manipulation/Unified_Video_Action_Model/Unified_Video_Action_Model.html) | 视频与动作联合建模 |

---

## 📎 附录：参考来源

- arXiv：<https://arxiv.org/abs/2302.00111>（v3，2023-11-20，NeurIPS 2023）
- 项目主页：<https://universal-policy.github.io/unipi/>（「Source Code」一节说明源码无法公开，并推荐 AVDC 仓库）
- 开源替代实现：<https://github.com/flow-diffusion/AVDC>
