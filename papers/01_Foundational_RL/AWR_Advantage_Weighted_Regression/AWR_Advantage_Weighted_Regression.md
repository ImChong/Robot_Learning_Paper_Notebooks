---
layout: paper
paper_order: 2
title: "Advantage Weighted Regression (AWR)"
category: "Foundational RL"
demos: ["awr"]
---

# Advantage Weighted Regression (AWR)
**优势加权回归**

> 📅 阅读日期: -
>
> 🏷️ 板块: Reinforcement Learning / Policy Optimization

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [1910.00177](https://arxiv.org/abs/1910.00177) |
| **PDF** | [下载](https://arxiv.org/pdf/1910.00177) |
| **作者** | Xue Bin Peng, Aviral Kumar, Grace Zhang, Sergey Levine |
| **机构** | UC Berkeley |
| **发布时间** | 2019年9月30日（arXiv） |
| **GitHub** | [xbpeng/awr](https://github.com/xbpeng/awr) |

---

## 🎯 一句话总结

AWR 把强化学习变成了一个**加权监督学习**问题——从经验中找出好的动作，给它们高权重，然后像做监督学习一样去模仿这些好动作。不需要 PPO 的裁剪，不需要 TRPO 的约束，极其简洁。

> 🎬 **本文开头有一段六幕讲解动画**（约 90 秒，自动播放）：把 AWR 的全流程从「PPO 留下什么麻烦」一路演到「一整轮在源码里落在哪两个函数」，画面里的数字与下面三个演示同源。
>
> 🎮 **另有 3 个可交互演示**（滑块拖一拖就能看结果，无需安装任何东西）：
> 1. 权重是怎么算出来的 —— 拖温度 $\beta$，看正文那 4 个样本里「还剩几条在说话」
> 2. 加权回归到底更新了什么 —— 一次更新就是一次加权平均，$\beta$ 太小会让策略停止探索
> 3. off-policy 到底赚在哪 —— 把旧数据留在 buffer 里再刷一遍，赚的是方差，亏的是新鲜度

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **AWR** | Advantage Weighted Regression | 优势加权回归 |
| **MLE** | Maximum Likelihood Estimation | 最大似然估计 |
| **Off-policy** | Off-policy Learning | 可以用历史数据学习（数据来源策略 ≠ 当前策略） |
| **On-policy** | On-policy Learning | 只能用当前策略生成的数据学习 |
| **Replay Buffer** | Experience Replay Buffer | 回放缓冲区，存储历史经验 |

---

## 🎬 六幕动画：AWR 全流程 {#awr-explainer-anim}

<div class="paper-demo" data-demo="awr-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 🎞️ 六幕分别对应下文的六件事：PPO 留下的三个麻烦 → ① 评估 $A = R - V$ → ② 指数权重 $\exp(A/\beta)/Z$ → 加权回归就是一次加权平均 → off-policy 的赚与亏 → 一整轮的闭环与源码落点。
>
> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」）按小节收起，后面的具体实例、源码对照、面试问题、讨论记录与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PPO 留下的三个麻烦（方差、数据浪费、调参）</summary>

学完 PPO 之后，你已经知道策略梯度的基本思路：试错 → 评估 → 更新策略。PPO 通过裁剪概率比来控制更新幅度，效果很好但还有几个麻烦：

1. **重要性采样方差大**：PPO 依赖新旧策略的概率比 $r_t = \frac{\pi_\theta(a \mid s)}{\pi _ {\theta _ {old}}(a \mid s)}$，当新旧策略差异大时，这个比值可能非常大或非常小，导致梯度估计不稳定
2. **只能用当前数据**：PPO 是 on-policy 算法，每轮收集的数据用完就丢，历史经验无法复用
3. **裁剪需要调参**：$\epsilon$ 的选择影响训练效果，不同任务可能需要不同的值

AWR 的思路完全不同：

> 💡 **类比**：PPO 像是"边做边学"的学徒——师傅手把手教，每次只能学一步。AWR 更像是"考试复习"——把所有做过的题（历史经验）翻出来，重点看做对的题（高优势动作），直接模仿正确答案。
</details>

---

## 🔧 AWR 是怎么做的？

### 核心思想：把 RL 变成加权监督学习

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：好的动作多学、差的动作少学，整个算法只有两步</summary>

AWR 的想法极其简单：**好的动作多学，差的动作少学（甚至不学）。**

怎么衡量"好坏"？用优势值 $A(s,a)$。怎么控制"多学少学"？用指数权重。

整个算法只有两步交替执行：
</details>

### Step 1: 评估——算出每个动作有多好

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$A(s_t, a_t) = R_t - V_\phi(s_t)$ 的三项含义</summary>

用价值网络 $V_\phi(s)$ 估计状态价值，然后计算优势：

$$A(s_t, a_t) = R_t - V_\phi(s_t)$$

- $R_t = \sum _ {k=0}^{T-t} \gamma^k r _ {t+k}$ 是从 $t$ 时刻到结束的折扣回报
- $V_\phi(s_t)$ 是"这个状态平均能拿多少分"
- $A > 0$：这个动作比平均好；$A < 0$：比平均差
</details>

### Step 2: 改进——加权模仿好的动作

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：加权最大似然的目标函数与配分函数 $Z$ 的作用</summary>

用指数优势作为权重，做加权最大似然回归：

$$\mathcal{L}(\theta) = \mathbb{E}\left[ w(s,a) \cdot \log \pi_\theta(a \mid s) \right]$$

其中权重：

$$w(s,a) = \frac{1}{Z} \exp\left(\frac{A(s,a)}{\beta}\right)$$

其中 $Z$ 是**配分函数（partition function）**，定义为所有样本权重之和的归一化常数：

$$Z = \sum _ {(s,a) \in \mathcal{B}} \exp\left(\frac{A(s,a)}{\beta}\right)$$

它的作用是确保所有权重的和为 1，即 $\sum w(s,a) = 1$，使得权重可以解释为概率分布。没有 $Z$，权重只是"未归一化的得分"；有了 $Z$，每个样本的权重才真正表示它在所有样本中的相对重要性。

在实际实现中，$Z$ 通常通过遍历当前 batch 或 replay buffer 中的所有样本计算得到。由于 $Z$ 只取决于优势值的相对大小（而非策略参数），它不需要对 $\theta$ 求导，因此不会增加额外的计算复杂度。
</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：4 个样本的手算表：$Z \approx 152.18$，以及温度 $\beta$ 的作用</summary>

**具体计算示例**（假设 batch 中有 4 个样本，$\beta = 1$）：

| 样本 | 优势值 $A$ | 原始权重 $\exp(A/\beta)$ | 归一化后 $w = 1/Z \cdot \exp(A/\beta)$ |
|------|-----------|------------------------|--------------------------------------|
| $a_1$ | $+5$ | $e^{5} \approx 148.41$ | $148.41 / 152.18 \approx 0.975$ |
| $a_2$ | $+1$ | $e^{1} \approx 2.72$ | $2.72 / 152.18 \approx 0.018$ |
| $a_3$ | $0$ | $e^{0} = 1.0$ | $1.0 / 152.18 \approx 0.007$ |
| $a_4$ | $-3$ | $e^{-3} \approx 0.05$ | $0.05 / 152.18 \approx 0.0003$ |
| **合计** | — | $Z \approx 152.18$ | $\sum w = 1.0$ ✓ |

可以看到，$Z$ 主要由最大优势值决定（这里是 148.41，占总和的 **97.5%**），其他样本的贡献被"淹没"在这种指数级差异中。这就是为什么即使 batch 中有几百个样本，$Z$ 的计算也非常快——最大值主导了总和。

$\beta$ 是温度参数，控制权重的"尖锐程度"：
- $\beta$ 小 → 只有最好的动作权重高（激进学习）
- $\beta$ 大 → 权重差异小，各种动作都学一点（保守学习）
</details>

### 为什么这就够了？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$\beta = 1$ 时四档优势对应的权重，以及「权重就是更新限制器」</summary>

看几个具体的权重值就明白了（假设 $\beta = 1$）：

| 优势 $A$ | 指数权重 $e^{A/\beta}$ | 归一化后 $w$ | 含义 |
|----------|----------------------|-------------|------|
| +5 | 148.41 | ~0.975 | 非常好的动作 → 重点学 |
| +1 | 2.72 | ~0.018 | 稍好的动作 → 适度学 |
| 0 | 1.0 | ~0.007 | 平均水平 → 几乎不学 |
| -3 | 0.05 | ~0.0003 | 差的动作 → 基本忽略 |

> 💡 指数函数天然地把好坏拉开了巨大差距——不需要裁剪，不需要 KL 约束，权重本身就是最好的"更新限制器"。
</details>

这张表只是 $\beta = 1$ 的一个切片。下面的实验台可以连续拖 $\beta$、改每条样本的优势、开关源码里的权重上限 `a_weight_clip: 20.0`，还会算出**有效样本数 ESS**——「这一批里实际还有几条样本在训练策略」：

<div class="paper-demo" data-demo="awr-weights"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

> ⚠️ 默认这组数字拖一遍就会发现：$A = +5$ 那条样本吃掉了 97.5% 的权重，ESS ≈ 1.05——**正文这个例子其实已经是「只模仿一条样本」的极端情况**。实战里优势要先按 batch 归一化（源码 `norm_adv`），量级远没有这么夸张。

### 对比 PPO 和 AWR

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五行对照表：核心操作 / 更新限制 / 数据使用 / 概率比 / 复杂度</summary>

| | PPO | AWR |
|---|---|---|
| **核心操作** | 裁剪概率比，梯度上升 | 指数加权，监督学习 |
| **限制更新幅度** | clip 机制 | 指数权重自动限制 |
| **数据使用** | on-policy（用完即丢） | off-policy（历史数据可复用） |
| **需要概率比？** | 需要 $\frac{\pi _ {new}}{\pi _ {old}}$ | 不需要 |
| **实现复杂度** | 中等 | 极简（加权 MSE） |
</details>

### 📊 AWR 交替迭代流程图

<div class="mermaid">
flowchart TB
    R["Replay Buffer<br/>存储 (s,a,r) 轨迹"] --> E["评估：V_φ 与回报 R_t<br/>算优势 A(s,a)"]
    E --> W["权重 w ∝ exp(A/β)<br/>归一化 Z"]
    W --> U["加权监督更新<br/>max E[w·log π_θ(a#124;s)]"]
    U --> C["环境 rollout<br/>写入 Buffer"]
    C --> R
</div>

---

## 🚶 具体实例：用 AWR 训练 HalfCheetah 奔跑

> 💡 **平台说明**：官方开源代码（[xbpeng/awr](https://github.com/xbpeng/awr)）基于 **OpenAI Gym** 接口，底层物理引擎为 **MuJoCo**。训练命令如 `python run.py --env HalfCheetah-v2`，使用的是 Gym 封装的 MuJoCo 环境（非直接调用 MuJoCo）。

下面用 OpenAI Gym 的 **HalfCheetah-v2** 环境（官方代码使用 v2，非 v4），走一遍 AWR 的完整流程。HalfCheetah 是一个 6 关节的"半豹"机器人，目标是学会向前奔跑。

### 环境设定

| 项目 | 具体值 |
|------|--------|
| **状态空间** | 17 维（身体位置、各关节角度、角速度等） |
| **动作空间** | 6 维连续（各关节的扭矩） |
| **奖励函数** | $r_t = v_x - 0.1 \lVert a_t \rVert^2$（前进速度 - 动作能耗） |
| **终止条件** | 无（最多 1000 步） |

> 💡 奖励直觉：**跑得快加分**，**动作太猛扣分**。

### 第 0 步：初始化

```
策略网络 πθ:  MLP [17] → 64 → 64 → [6] (输出高斯分布的均值和方差)
价值网络 Vφ:  MLP [17] → 64 → 64 → [1]  (输出标量V值)

超参数:
  β (温度) = 1.0
  γ (折扣) = 0.99
  lr = 3e-4 (Adam)
  buffer_size = 100000 (回放缓冲区)
  batch_size = 256
```

此时策略随机输出扭矩 → 半豹趴在地上一动不动，或者原地抽搐。

### 第 1 步：收集经验

AWR 支持 off-policy，所以有一个**回放缓冲区**存储所有历史经验：

<div class="mermaid">
flowchart LR
    P["当前策略 π_θ"] --> R["环境 rollout<br/>约 10k 步"]
    R --> B["Replay Buffer<br/>早期均值回报约 -50"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：与 PPO 的关键区别：缓冲区会一直积累</summary>

> **与 PPO 的关键区别**：PPO 每轮收集新数据后旧数据就丢了。AWR 的缓冲区会一直积累，好的经验可以反复被采样学习。
</details>

「旧数据还能用」听起来是白赚的，其实有代价。下面这个演示用的是**和 PPO 笔记第 3 个演示完全相同的玩具任务**，只把更新换成 AWR 的加权回归，唯一的变量是 buffer 保留多少轮数据：

<div class="paper-demo" data-demo="awr-buffer"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第 2 步：训练价值网络

从缓冲区采样，用 MSE loss 训练价值网络，让它学会预测"从这个状态出发能拿多少分"：

<div class="mermaid">
flowchart TB
    S["从 Replay Buffer 采样<br/>batch = 256"] --> T["目标 R_target = Σ γ^k r_{t+k}"]
    T --> L["Loss_V = mean((V_φ(s) - R_target)²)"]
    L --> U["更新 φ"]
    U --> V["V_φ(趴着)≈-50 · V_φ(站立)≈200 · V_φ(奔跑)≈800"]
</div>

### 第 3 步：计算优势值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三条样本（好 / 普通 / 坏）的优势与权重手算</summary>

对缓冲区中每条样本算优势：

```
样本 A (偶然一个好动作):
  R = 600,  Vφ(s) = 200
  A = 600 - 200 = +400    ← 好动作！
  权重 w = exp(400/1.0)/Z ≈ 0.95

样本 B (普通动作):
  R = -50,  Vφ(s) = -50
  A = -50 - (-50) = 0     ← 平均水平
  权重 w = exp(0/1.0)/Z ≈ 0.03

样本 C (坏动作):
  R = -100,  Vφ(s) = 100
  A = -100 - 100 = -200   ← 坏动作！
  权重 w = exp(-200/1.0)/Z ≈ 0.0001
```
</details>

### 第 4 步：加权回归更新策略（核心！）

<div class="mermaid">
flowchart TB
    S["从 Replay Buffer 采样 batch"] --> W["w_i = exp(A_i/β) / Z"]
    W --> L["log π_θ(a_i #124; s_i)"]
    L --> G["θ ← θ + α ∇_θ Σ w_i · log π_θ"]
    G --> E["w≈0.95 强模仿好动作<br/>w≈0.03 几乎无影响<br/>w≈0.0001 基本忽略"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一句话总结：AWR 就是「选择性模仿」</summary>

> 🔑 **一句话总结**：AWR 就是在做"选择性模仿"——从所有经历中挑出最好的动作，重点模仿。这比 PPO 的"概率比 × 优势 × 裁剪"简洁太多了。
</details>

那么「加权最大似然」这一步具体把策略挪到了哪里？对高斯策略来说它有闭式解：**新的均值就是样本按权重的加权平均** $\mu _ {new} = \sum_i w_i a_i$。下面这个实验台把一整次更新画出来——散点是采到的动作（圆点越大权重越高），两条高斯是更新前后的策略：

<div class="paper-demo" data-demo="awr-regression"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

> ⚠️ 把 $\beta$ 拖到 0.05 会看到 AWR 最典型的失效模式：权重全压在一条样本上，新策略的均值直接跳过去、标准差塌到接近 0——**策略不再探索了**。这就是配置里 `actor_std_type: "FIXED"` / `action_std: 0.05` 固定动作方差的原因。

### 第 5 步：训练进展

| 训练阶段 | 迭代 | 平均回报 | 行为表现 |
|---------|------|---------|---------|
| **初期** | 0-50K | -50 ~ 0 | 趴在地上，偶尔翻滚 |
| **学会站立** | 50K-100K | 0 ~ 200 | 能跪着向前挪动 |
| **学会小跑** | 100K-300K | 200 ~ 500 | 用小腿跑，速度慢 |
| **学会奔跑** | 300K-500K | 500 ~ 800 | 正常奔跑 |
| **优化步态** | 500K+ | 800+ | 高效奔跑，能耗降低 |

### 完整流程图

<div class="mermaid">
flowchart TB
    I["初始化 π_θ, V_φ（随机）"]
    C["用当前策略收集数据<br/>存入 Replay Buffer"]
    V["从缓冲区采样<br/>训练 V_φ（MSE loss）"]
    A["计算优势 A(s,a) = R - V_φ(s)"]
    W["计算权重 w = exp(A/β) / Z"]
    U["加权回归更新策略<br/>max Σ w · log π_θ(a#124;s)"]
    Q{回报 > 目标?}
    DONE((训练完成))
    I --> C --> V --> A --> W --> U --> Q
    Q -->|是| DONE
    Q -->|否| C
</div>

---

## 🤖 AWR 在人形机器人领域的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三点影响（AMP/ASE 的底子、离线 RL 的先驱、简洁性）与路线图视角</summary>

AWR 本身在人形机器人控制中不是最常用的算法（PPO 用得更多），但它的思想对后续工作影响深远：

1. **AMP/ASE 的理论基础**：AMP（Adversarial Motion Priors）和 ASE（Adversarial Skill Embeddings）中，用鉴别器输出作为"优势"来加权训练策略，本质上就是 AWR 的思路
2. **离线 RL 的先驱**：AWR 证明了"从历史数据中学习"是可行的。在人形机器人中，离线数据（如人类动作捕捉数据）的利用越来越重要
3. **简洁性的启示**：AWR 告诉我们，有时候最简单的方法就是最好的——不需要复杂的数学约束，加权监督学习就能搞定策略优化

> 💡 **路线图视角**：PPO 教你"如何安全地更新策略"，AWR 教你"如何从经验中提炼好的行为"。两种思路在后续的运动模仿类工作中会反复出现。
</details>

---

## 📁 MimicKit 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 节）：源码类图：AWR 与 PPO 平行的另一条分支 / 源码运行时序图…</summary>

以下代码块对应 [MimicKit](https://github.com/xbpeng/MimicKit) 中 AWR 的实现，与上述讲解的各模块一一对应。

<h3 id="源码类图awr-与-ppo-平行的另一条分支">源码类图：AWR 与 PPO 平行的另一条分支</h3>

先看静态结构。和 AMP/ASE 不同，`AWRAgent` **不继承 PPOAgent**，而是与它平行、直接挂在 `BaseAgent` 下——因为 AWR 的 Actor 更新是加权回归，跟 PPO 的概率比裁剪完全是两套逻辑：

<div class="mermaid">
classDiagram
    class BaseAgent {
        base_agent.py 抽象基类
        +train_model(max_samples)
        #_rollout_train(num_steps)
    }
    class PPOAgent {
        ppo_agent.py PPO笔记
        #_compute_actor_loss() 概率比+Clip
    }
    class AWRAgent {
        awr_agent.py
        #_build_train_data() 优势→指数权重w
        #_compute_actor_loss() −mean(w·logπ)
        #_compute_critic_loss() MSE
        #_get_exp_prob() 探索概率调度
    }
    class BaseModel {
        base_model.py
    }
    class AWRModel {
        awr_model.py
        +eval_actor(obs)
        +eval_critic(obs)
    }
    BaseAgent <|-- PPOAgent : 平行分支
    BaseAgent <|-- AWRAgent : 平行分支
    BaseModel <|-- AWRModel
    AWRAgent o-- AWRModel : _model
    AWRAgent o-- ExperienceBuffer : 可复用旧数据
</div>

- 继承关系直接反映算法关系：AMP/ASE/LCP 都长在 `PPOAgent` 下面（on-policy 家族），AWR 独立成枝——它的 buffer 可以保留旧数据（off-policy 倾向），Actor loss 是监督式的加权最大似然。
- 读源码抓两处就够：`_build_train_data()` 里的 `w = clamp(exp(Â/β))`，和 `_compute_actor_loss()` 里的加权回归。

<h3 id="源码运行时序图">源码运行时序图</h3>

以 `python mimickit/run.py --mode train` 为入口（agent 配置换成 `*_awr_agent.yaml`），训练时序与 PPO 共享同一骨架，差别集中在 **`_build_train_data()` 里算指数权重、Actor 用加权回归更新**：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as run.py
    participant AG as AWRAgent<br/>(awr_agent.py)
    participant M as AWRModel<br/>(Actor + Critic)
    participant E as Env + Isaac Gym
    participant B as ExperienceBuffer
    U->>R: python mimickit/run.py --mode train --agent_config ..._awr_agent.yaml
    R->>E: build_env()
    R->>AG: build_agent()：agent_name "AWR" → AWRAgent
    R->>AG: train_model(max_samples)
    loop 每轮迭代 _train_iter()
        loop rollout：_rollout_train(steps_per_iter)
            AG->>M: eval_actor(norm_obs) → 采样 a_t
            AG->>E: _step_env(a_t)
            E-->>AG: obs、reward、done
            AG->>B: record(obs, action, reward, done)
        end
        AG->>M: eval_critic(obs) → 估计 V(s)
        AG->>AG: _build_train_data()：adv = R − V → 归一化 → w = clamp(exp(Â/β), max=20)
        loop Critic 更新（critic_epochs=2）
            AG->>B: sample(batch)
            AG->>M: _compute_critic_loss()：MSE(V, TD-λ 回报)
        end
        loop Actor 更新（actor_epochs=5）
            AG->>B: sample(batch)
            AG->>M: _compute_actor_loss()：−mean(w · log π(a|s)) 加权最大似然
        end
    end
    R->>AG: 周期性 test_model() + 保存 checkpoint
</div>

对比 PPO 的时序：rollout 和 Critic 更新完全一致；差别在 ⑩ 处提前把优势换算成指数权重 `w`，⑭ 处 Actor 不再算概率比和 Clip，而是做一次加权监督回归。

<h3 id="1-核心指数优势权重计算_build_train_data">1. 核心：指数优势权重计算（<code>_build_train_data</code>）</h3>

```python
# mimickit/learning/awr_agent.py - _build_train_data()
# 第一步：用价值网络计算优势 A(s,a) = R - V(s)
adv = new_vals - vals  # 原始优势

# 归一化优势
adv_mean, adv_std = mp_util.calc_mean_std(rand_action_adv)
norm_adv = (adv - adv_mean) / torch.clamp_min(adv_std, 1e-5)

# 第二步：计算指数权重 w = exp(A / β)
# β (awr_temp) 控制权重的"尖锐程度"
a_weight = torch.exp(norm_adv / self._awr_temp)
# 权重上限，防止数值爆炸
a_weight = torch.clamp_max(a_weight, self._a_weight_clip)
```

对应配置：
```yaml
awr_temp: 1.0        # 温度参数 β
a_weight_clip: 20.0   # 权重上限，防止 exp(A) 过大
```

<h3 id="2-核心加权回归更新策略_compute_actor_loss">2. 核心：加权回归更新策略（<code>_compute_actor_loss</code>）</h3>

```python
# mimickit/learning/awr_agent.py - _compute_actor_loss()
def _compute_actor_loss(self, batch):
    norm_obs = self._obs_norm.normalize(batch["obs"])
    norm_a = self._a_norm.normalize(batch["action"])
    a_weight = batch["a_weight"]      # exp(A/β) 指数权重
    rand_action_mask = batch["rand_action_mask"]

    # 只用随机采样的数据计算 loss
    rand_action_mask = (rand_action_mask == 1.0)
    norm_obs = norm_obs[rand_action_mask]
    norm_a = norm_a[rand_action_mask]
    a_weight = a_weight[rand_action_mask]

    a_dist = self._model.eval_actor(norm_obs)
    a_logp = a_dist.log_prob(norm_a)
    
    # 加权最大似然：L = w · log π(a|s)
    # 等价于公式 max Σ w · log πθ(a|s)
    actor_loss = a_weight * a_logp
    actor_loss = -torch.mean(actor_loss)  # 加负号因为 optimizer 做最小化
```

> 🔑 **对比 PPO**：PPO 用 `min(r·A, clip(r)·A)` 限制更新幅度；AWR 用 `exp(A/β)` 天然限制——差动作的权重趋近 0，好动作权重高。

<h3 id="3-价值网络损失critic-loss">3. 价值网络损失（Critic Loss）</h3>

```python
# mimickit/learning/awr_agent.py - _compute_critic_loss()
def _compute_critic_loss(self, batch):
    norm_obs = self._obs_norm.normalize(batch["obs"])
    tar_val = batch["tar_val"]      # TD-λ 回报 target
    pred = self._model.eval_critic(norm_obs)  # V(s) 预测
    pred = pred.squeeze(-1)

    diff = tar_val - pred
    loss = torch.mean(torch.square(diff))  # MSE

    info = {"critic_loss": loss}
    return info
```

<h3 id="4-actor-critic-网络结构awrmodel">4. Actor-Critic 网络结构（AWRModel）</h3>

```python
# mimickit/learning/awr_model.py
class AWRModel(base_model.BaseModel):
    def eval_actor(self, obs):
        h = self._actor_layers(obs)
        a_dist = self._action_dist(h)
        return a_dist
    
    def eval_critic(self, obs):
        h = self._critic_layers(obs)
        val = self._critic_out(h)
        return val
```

网络结构与 PPO 相同（独立 Actor 和 Critic），MLP 用 fc_2layers_1024units（1024→512 两层）。

<h3 id="5-训练循环_update_model">5. 训练循环（<code>_update_model</code>）</h3>

<div class="mermaid">
flowchart TB
    N["读取 exp_buffer 样本数"] --> C["先更新 Critic<br/>critic_epochs=2"]
    C --> A["再更新 Actor<br/>actor_epochs=5<br/>使用最新 exp(A/β) 权重"]
</div>

```python
# mimickit/learning/awr_agent.py - _update_model()
def _update_model(self):
    num_samples = self._exp_buffer.get_sample_count()
    
    # 先更新 Critic（2 个 epoch）
    critic_batch_size = int(np.ceil(self._critic_batch_size * num_envs))
    num_critic_steps = num_critic_batches * self._critic_epochs
    self._update_critic(critic_batch_size, num_critic_steps)
    
    # 再更新 Actor（5 个 epoch）
    # 每次更新都使用最新的 exp(A/β) 权重
    actor_batch_size = int(np.ceil(self._actor_batch_size * num_envs))
    num_actor_steps = num_actor_batches * self._actor_epochs
    self._update_actor(actor_batch_size, num_actor_steps)
```

<h3 id="6-awr-超参数一览">6. AWR 超参数一览</h3>

```yaml
# data/agents/deepmimic_humanoid_awr_agent.yaml
agent_name: "AWR"

model:
  actor_net: "fc_2layers_1024units"   # [obs] → 1024 → 512 → [action]
  actor_std_type: "FIXED"
  action_std: 0.05                    # 固定动作标准差
  critic_net: "fc_2layers_1024units"  # [obs] → 1024 → 512 → [1]

discount: 0.99           # 折扣因子 γ
td_lambda: 0.95         # GAE λ
awr_temp: 1.0           # 温度参数 β（控制权重锐度）
a_weight_clip: 20.0     # 权重上限

actor_epochs: 5         # Actor 更新 5 个 epoch
actor_batch_size: 4      # 每 batch 4 个环境
critic_epochs: 2         # Critic 更新 2 个 epoch
critic_batch_size: 2

action_bound_weight: 10.0   # 动作范围惩罚
action_entropy_weight: 0.0  # 熵正则（0 表示不用）
```
</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（5 节）：Q1: AWR 和 PPO 的核心区别？…</summary>

<h3 id="q1-awr-和-ppo-的核心区别">Q1: AWR 和 PPO 的核心区别？</h3>
**A**: PPO 通过裁剪概率比来限制策略更新幅度，是 on-policy 的。AWR 通过指数优势加权把 RL 变成加权监督学习，不需要概率比，天然支持 off-policy。AWR 更简洁，但 PPO 在 on-policy 场景下通常更强。

<h3 id="q2-awr-的权重-expabeta-为什么能替代-ppo-的-clip">Q2: AWR 的权重 $\exp(A/\beta)$ 为什么能替代 PPO 的 clip？</h3>
**A**: 指数函数天然地将好动作和差动作的权重拉开巨大差距。差动作的权重趋近于 0（等于被忽略），好动作的权重很高。这种"自动筛选"机制本质上起到了和 clip 类似的效果——防止策略被差经验带偏。

<h3 id="q3-温度参数-beta-怎么选">Q3: 温度参数 $\beta$ 怎么选？</h3>
**A**: $\beta$ 小 → 只学最好的动作（激进，可能忽略有用信息）；$\beta$ 大 → 所有动作都学一点（保守，学习慢）。通常从 $\beta = 1$ 开始，根据任务调整。一些变体会自适应调整 $\beta$。

<h3 id="q4-awr-能用于离线-rl-吗">Q4: AWR 能用于离线 RL 吗？</h3>
**A**: 可以，这是 AWR 的一大优势。因为它不需要在线采样，不需要计算概率比，可以直接在离线数据集上做加权回归。这使它成为离线 RL 的早期代表方法，影响了后续的 IQL、CQL 等。

<h3 id="q5-awr-的局限性">Q5: AWR 的局限性？</h3>
**A**: 
- 在 on-policy 场景下通常不如 PPO
- 当缓冲区中好的样本很少时，学习效率会下降（没有好样本可以模仿）
- 温度参数 $\beta$ 的选择对性能影响大
</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：讨论记录</summary>

> 待补充
</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：A. 算法伪代码 / B. 与路线图其他论文的关联 / C. 超参数速查表 / D. 训练过程中各组件的变化</summary>

<h3 id="a-算法伪代码">A. 算法伪代码</h3>

<div class="mermaid">
flowchart TB
    Init["初始化 π_θ, V_φ, 回放缓冲区 D"]
    Col["① 收集：π_θ rollout → 加入 D"]
    Val["② 估计价值：采样 batch<br/>R_t = Σ γ^k r_{t+k}<br/>minimize MSE(V_φ(s), R_t)"]
    Adv["③ 加权回归：A = R_t - V_φ(s)<br/>w = exp(A/β) / Z"]
    Pol["maximize Σ w · log π_θ(a#124;s)"]
    Init --> Col --> Val --> Adv --> Pol --> Col
</div>

<h3 id="b-与路线图其他论文的关联">B. 与路线图其他论文的关联</h3>

<div class="mermaid">
flowchart LR
    PPO["PPO<br/>clip + 概率比"] --> AWR["AWR<br/>加权监督学习"]
    AWR --> AMP["AMP<br/>鉴别器作优势加权"]
    AWR --> ASE["ASE<br/>技能加权回归"]
    AWR --> Offline["离线 RL<br/>IQL / CQL 等"]
</div>

<h3 id="c-超参数速查表">C. 超参数速查表</h3>

| 参数 | 含义 | 推荐值 |
|------|------|--------|
| $\beta$ (温度) | 权重锐度 | 0.05 ~ 1.0 |
| $\gamma$ (折扣) | 折扣因子 | 0.99 |
| learning rate | 学习率 | 3e-4 |
| buffer_size | 回放缓冲区大小 | 50K ~ 500K |
| batch_size | 小批量大小 | 256 ~ 1024 |

<h3 id="d-训练过程中各组件的变化">D. 训练过程中各组件的变化</h3>

<div class="mermaid">
flowchart TB
    subgraph E20K["迭代 ~20K（刚开始学）"]
        direction TB
        E20Ka["策略：随机扭矩"]
        E20Kb["V：趴着≈-50，站立≈50"]
        E20Kc["优势：多数 A≈0，少数 A>0"]
        E20Kd["权重：较均匀，exp(A/β) 差距小"]
        E20Ka --> E20Kb --> E20Kc --> E20Kd
    end
    subgraph E200K["迭代 ~200K（学会小跑）"]
        direction TB
        E200Ka["策略：有节奏交替扭矩"]
        E200Kb["V：站立≈200，奔跑≈500"]
        E200Kc["优势：加速 A>0，减速 A<0"]
        E200Kd["权重：好动作 w≈0.8，差动作 w≈0.001"]
        E200Ka --> E200Kb --> E200Kc --> E200Kd
    end
    subgraph E500K["迭代 ~500K（稳定奔跑）"]
        direction TB
        E500Ka["策略：稳定周期性步态"]
        E500Kb["V：各状态估计较准确"]
        E500Kc["权重：聚焦最高优势动作，趋于收敛"]
        E500Ka --> E500Kb --> E500Kc
    end
    E20K --> E200K --> E500K
</div>
</details>

