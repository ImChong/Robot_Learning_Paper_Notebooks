---
layout: paper
paper_order: 1
title: "Proximal Policy Optimization Algorithms (PPO)"
category: "基础路线图"
demos: ["ppo"]
---

# Proximal Policy Optimization Algorithms (PPO)
**近端策略优化算法**

> 📅 阅读日期: 2026-03-11
>
> 🏷️ 板块: Reinforcement Learning / Policy Optimization

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [1707.06347](https://arxiv.org/abs/1707.06347) |
| **PDF** | [下载](https://arxiv.org/pdf/1707.06347) |
| **作者** | John Schulman, Filip Wolski, Prafulla Dhariwal, Alec Radford, Oleg Klimov |
| **机构** | OpenAI |
| **发布时间** | 2017年7月20日（arXiv） |
| **GitHub** | [openai/baselines (PPO2)](https://github.com/openai/baselines/tree/master/baselines/ppo2)<br>[xbpeng/MimicKit](https://github.com/xbpeng/MimicKit) |

---

## 🎯 一句话总结

PPO 通过一个简单的**裁剪机制**，让强化学习的策略更新既大胆又安全——每一步都在"可控范围"内改进，是目前人形机器人控制领域最常用的基础算法。

> 🎮 **本文内嵌 1 段动画 + 4 个可交互演示**（不用装任何东西）：
> 1. [五幕动画：PPO 全流程](#ppo-explainer-anim) —— 约 76 秒串完「步子迈多大 → 概率比 → 优势 → 裁剪 → 四步循环」
> 2. [第 2 步：计算优势（GAE）](#第-2-步计算优势gae) —— λ 怎么把「4 步后的那一摔」传回 t=0
> 3. [第 3 步：PPO 裁剪更新](#第-3-步ppo-裁剪更新核心) —— 拖动概率比 $r$，看这条样本什么时候被冻结
> 4. 同一节稍后 —— 把裁剪关掉，看「同一批数据更新 K 轮」如何把策略训崩
> 5. [训练曲线怎么读](#ppo-curves-guide) —— TensorBoard 上那几条线：越高越好还是看区间，六种常见病历

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **PPO** | Proximal Policy Optimization | 近端策略优化 |
| **TRPO** | Trust Region Policy Optimization | 信任域策略优化，PPO 的前身，用 KL 约束控制更新步幅 |
| **RL** | Reinforcement Learning | 强化学习 |
| **TD** | Temporal Difference | 时序差分，用 bootstrap 估计价值/优势（如 $\delta_t = r + \gamma V(s') - V(s)$） |
| **TD(λ)** | Temporal Difference with eligibility traces | TD-λ 回报递推，GAE 的计算基础 |
| **GAE** | Generalized Advantage Estimation | 广义优势估计，在 TD 误差上叠加 $\lambda$ 平滑得到 $\hat{A}_t$ |
| **IS** | Importance Sampling | 重要性采样，用旧策略数据通过概率比 $r_t$ 估计新策略表现 |
| **CPI** | Conservative Policy Iteration | 保守策略迭代，PPO surrogate 目标 $L^{CPI}=r_t(\theta)\hat{A}_t$ 的来源 |
| **KL** | Kullback-Leibler Divergence | KL 散度，衡量两个分布的差异（TRPO 硬约束 / PPO-Penalty 软惩罚） |
| **Actor-Critic** | — | 策略网络（Actor）+ 价值网络（Critic）架构 |
| **MLP** | Multi-Layer Perceptron | 多层感知机，策略/价值网络常用 backbone |
| **MSE** | Mean Squared Error | 均方误差，Critic 拟合 TD(λ) 回报目标的损失 |
| **A2C** | Advantage Actor-Critic | 优势 Actor-Critic，同步版 on-policy 基线算法 |
| **MuJoCo** | Multi-Joint dynamics with Contact | 物理仿真引擎 |
| **EV** | Explained Variance | 解释方差，衡量 Critic 对回报拟合得好不好（1 最好，负值 = 还不如猜均值） |
| **clipfrac** | clip fraction | 一个 batch 里被 PPO 裁剪、本轮冻结的样本比例 |
| **approx KL** | approximate KL divergence | 用样本估计的新旧策略 KL，用来看「这一步更新迈了多大」 |

---

## 🎬 五幕动画：PPO 全流程 {#ppo-explainer-anim}

<div class="paper-demo" data-demo="ppo-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」）按小节收起，后面的具体实例、源码对照、面试问题、讨论记录与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么"每次改多少"是个难题（含 TRPO 对比）</summary>

假设你在训练一个人形机器人学走路。强化学习的基本思路是：让机器人**试错**，做得好就奖励，做得差就惩罚，逐步改进策略。

但问题在于——**每次改进多少？**

- **改太多**：机器人刚学会站稳，一次大更新把站立技能搞崩了，又开始乱摔
- **改太少**：学得太慢，训练几天都学不会走路
- **之前的方案 TRPO**：用复杂的二阶数学方法来控制更新幅度，有效但实现麻烦、计算量大

> 💡 **类比**：传统方法像"瞎子爬山"——步子迈太大容易摔下山；PPO 像是"走台阶"——每一步都有个护栏，保证在可控范围内。

PPO 的目标就是：**找到一个简单又有效的方法，让策略更新幅度恰到好处。**

</details>

---

## 🔧 PPO 是怎么做的？

### 第一个概念：概率比（新旧策略的对比）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：概率比 r 的定义与三种取值</summary>

每次更新策略后，我们想知道"新策略和旧策略有多大差别"。用一个简单的比值来衡量：

$$r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi _ {\theta _ {old}}(a_t \mid s_t)}$$

- $r_t = 1$：新旧策略完全一样，没有变化
- $r_t = 1.5$：新策略选择这个动作的概率比旧策略高了 50%
- $r_t = 0.5$：新策略选择这个动作的概率减半了

</details>

### 第二个概念：优势函数（这个动作好不好）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：优势函数 Â 的含义</summary>

优势 $\hat{A}_t$ 衡量的是"在状态 $s_t$ 下，选动作 $a_t$ 比平均水平好多少"：

- $\hat{A}_t > 0$：这是个好动作（比平均好）
- $\hat{A}_t < 0$：这是个差动作（比平均差）

</details>

### 核心机制：裁剪（Clip）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：裁剪公式、ε 的含义与好/坏动作对照表</summary>

PPO 的精髓就一句话：**不管动作好坏，每次策略改变的幅度都要有上限。**

$$L^{CLIP}(\theta) = \mathbb{E}_t \left[ \min\left( r_t(\theta) \cdot \hat{A}_t,\ \text{clip}(r_t(\theta),\ 1-\epsilon,\ 1+\epsilon) \cdot \hat{A}_t \right) \right]$$

$\epsilon$ 通常取 0.2，意味着概率比被限制在 $[0.8, 1.2]$ 之间。

用表格看更直观：

| 情况 | 好动作 $\hat{A}_t > 0$ | 差动作 $\hat{A}_t < 0$ |
|------|----------------------|----------------------|
| **没有裁剪** | 无限增大该动作概率 | 无限减小该动作概率 |
| **PPO 裁剪** | 最多增大到 1.2 倍就停 | 最多减小到 0.8 倍就停 |

> 💡 **关键直觉**：裁剪的作用是"鼓励渐进改进"——发现一个好动作后，不要一次性把所有筹码压上去，而是慢慢加大。

</details>

### 训练流程（四步循环）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四步循环流程图与「为什么能复用同一批数据」</summary>

<div class="mermaid">
flowchart TB
    A["① 收集经验<br/>N 个并行环境各跑 T 步（共 $$N \times T$$ 个样本）"] --> B["② 计算优势<br/>用 GAE 得到每个 $$\hat{A}_t$$"]
    B --> C["③ 多轮更新<br/>同一批数据 K 个 epoch（Clip 防止过度更新）"]
    C --> D["④ 更新旧策略<br/>$$\pi _ {\theta _ {old}} \leftarrow \pi_\theta$$"]
    D --> A
</div>

**为什么能对同一批数据更新多次？** 因为裁剪机制自动限制了更新幅度——随着更新次数增加，概率比越偏离 1，裁剪越频繁生效，相当于自带"刹车"。

</details>

---

## 🚶 具体实例：用 PPO 训练人形机器人走路

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（16 节）：环境设定 / 第 0 步：初始化 / 第 1 步：收集经验（多环境并行） / Episode 生命周期（状态图）…</summary>

> 💡 **平台说明**：PPO 原论文（2017）在 **OpenAI Gym**（MuJoCo 物理引擎）的连续控制任务（HalfCheetah-v1、Hopper-v1、Humanoid-v1 等）和 **Atari** 游戏上做实验。下面示例使用现代等效版本 **Humanoid-v4**，与原论文 v1 版本在接口和环境细节上略有差异，但算法逻辑完全相同。

下面用 OpenAI Gym 的 **Humanoid-v4** 环境（对应原论文 Humanoid-v1），走一遍 PPO 从初始化到收敛的完整流程。Humanoid 是一个 17 关节、376 维观测、17 维动作的人形机器人，目标是学会稳定地向前走。

<h3 id="环境设定">环境设定</h3>

| 项目 | 具体值 |
|------|--------|
| **状态空间** | 376 维（关节角度、角速度、质心位置/速度、接触力等） |
| **动作空间** | 17 维连续（各关节的扭矩，范围 [-0.4, 0.4]） |
| **奖励函数** | $r_t = v_x - 0.1 \lVert a_t \rVert^2 - 10 \cdot \mathbb{1}[\text{摔倒}]$ |
| **终止条件** | 质心高度 < 0.8m（摔倒）或达到 1000 步 |

> 💡 奖励设计的直觉：**走得快**（$v_x$）有奖励，**动作太猛**（$\lVert a_t \rVert^2$）有惩罚，**摔倒**重罚。

<h3 id="第-0-步初始化">第 0 步：初始化</h3>

```
策略网络 πθ:  MLP [376] → 256 → 256 → [17] (输出高斯分布的均值)   # Actor：输入376维观测，输出17维动作分布
价值网络 Vφ:  MLP [376] → 256 → 256 → [1]  (输出标量V值)          # Critic：评估当前状态的好坏

超参数:                                  # 训练前一次性设定
  clip ε = 0.2                          # 裁剪范围：概率比限制在 [0.8, 1.2]
  γ = 0.99, λ = 0.95                    # 折扣因子 γ + GAE 偏差-方差平衡系数 λ
  lr = 3e-4 (Adam)                      # 学习率，使用一阶优化器 Adam
  n_envs = 32, n_steps = 64  → 每轮收集 32×64 = 2048 个样本   # 并行环境数 × 每环境步数
  n_epochs = 10, mini_batch_size = 64   # 同批数据复用 10 轮，每次取 64 个样本更新
```

此时策略随机输出扭矩 → 人形机器人一站起来就乱抖，几步就摔倒。

<h3 id="第-1-步收集经验多环境并行">第 1 步：收集经验（多环境并行）</h3>

<div class="mermaid">
flowchart TB
    E1["Env#1: 64步 rollout"] --> BUF["汇总 32×64=2048 样本"]
    E2["Env#2: 64步"] --> BUF
    E32["Env#32: 64步"] --> BUF
</div>

以环境 #1 为例（训练早期）：

```
t=0:   s₀ = [站立姿态...],  a₀ ~ πθ(·|s₀) = [-0.12, 0.35, ...],  r₀ = 0.3    # 观察状态→策略采样动作→环境返回奖励
t=1:   s₁ = [微倾斜...],    a₁ ~ πθ(·|s₁) = [0.28, -0.05, ...],  r₁ = 0.1    # 身体开始倾斜，奖励变小
t=2:   s₂ = [大幅摇晃...],  a₂ ~ πθ(·|s₂) = [-0.40, 0.22, ...],  r₂ = -0.5   # 大幅摇晃，奖励为负
...                                                                          # 持续"状态→动作→奖励"循环
t=47:  摔倒！done=True → 环境自动 reset                                       # 轨迹终止：质心高度 < 0.8m
t=48:  s₄₈ = [重新站立...],  继续收集到 t=63                                  # 重置后开启新轨迹，凑满 64 步
```

> **为什么要并行？**
> - **降低样本相关性**：单环境中相邻状态几乎一样，32个环境的状态互不相关，梯度估计更准
> - **速度快**：GPU 向量化计算，32个环境几乎和1个一样快（如 Isaac Gym）
> - **覆盖更广**：同时有的环境在站立，有的在行走，有的刚摔倒重置

<h4 id="episode-生命周期状态图">Episode 生命周期（状态图）</h4>

单个环境里，一个 episode 从初始化到终止的完整状态流转如下。先记住 done 在哪里发生，下一步就能明白 GAE 为什么要"在 done 边界截断"：

<div class="mermaid">
stateDiagram-v2
    direction LR
    state "初始化：站立姿态" as INIT
    state "交互中：s_t → a_t → r_t" as RUN
    state "FAIL：摔倒" as FAIL
    state "TIME：走满 1000 步" as TIME
    [*] --> INIT
    INIT --> RUN
    RUN --> RUN : 每步记录 (s, a, r, logp)
    RUN --> FAIL : 质心高度低于 0.8m
    RUN --> TIME : 达到步数上限
    FAIL --> INIT : 自动 reset，开启新轨迹
    TIME --> INIT : 自动 reset
</div>

> 💡 done（FAIL / TIME）就是**轨迹边界**：上面 t=47 摔倒后 t=48 重新站立，两段属于不同轨迹。GAE 逆序递推到边界必须停下，不能把下一条轨迹的信息传过来——这就是第 2 步里"done 边界截断"的含义。

<h3 id="第-2-步计算优势gae">第 2 步：计算优势（GAE）</h3>

<h4 id="为什么要算优势">为什么要算优势？</h4>

策略梯度的本质是：**好动作就抬高概率，坏动作就压低概率**。但"好坏"得有个**参照系**——比谁好？

如果直接拿"动作之后的累计回报 $G_t$"当信号会出问题：Humanoid 只要往前走（$v_x>0$）几乎每步 $G_t$ 都是正的，于是**所有动作的概率都被往上抬**，只是多抬少抬的区别——信号方差大、区分度差，学得慢。

> 🍳 **类比**：全班平均 85 分，小明考了 88。光看"88"不知好坏；**减掉平均分**得到"+3"才是有用信号。

解法是减一个**基线** $V(s)$，得到优势：

$$\hat{A}(s,a) = Q(s,a) - V(s)$$

- $Q(s,a)$：在状态 $s$ 选**这个动作**的预期回报
- $V(s)$：在状态 $s$ 按**平均水平**的预期回报（"班级平均分"）
- 相减 = **这个动作比该状态平均水平好多少**

这一减带来三个好处：

| 好处 | 说明 |
|------|------|
| **信号居中** | 好动作 $\hat{A}_t>0$、坏动作 $\hat{A}_t<0$，方向清楚（裁剪表格能分两列的前提） |
| **降方差** | 基线只跟状态有关、与选哪个动作无关，**减它不改变梯度期望（无偏）**，却大幅压低方差 |
| **信用分配** | 把"状态本身好不好"（归 $V$）和"这个动作选得好不好"（归优势）分开 |

<h4 id="为什么用-gae而不是直接-q---v">为什么用 GAE，而不是直接 $Q - V$？</h4>

理想优势里的 $Q$、$V$ 都是真值，实际只有**会犯错的 Critic 估计 $V_\phi$**。用它估优势有两个极端：

| 估法 | 公式 | 偏差 | 方差 |
|------|------|------|------|
| **一步 TD** | $\delta_t = r_t + \gamma V(s _ {t+1}) - V(s_t)$ | 大（完全信任 $V$） | 小（只含一步随机性） |
| **蒙特卡洛** | $G_t - V(s_t)$（真实整条回报） | 小（不依赖 $V$ 准） | 大（含整条轨迹随机性） |

GAE 用 $\lambda$ 在两端之间插值，把未来若干步的 $\delta$ 按 $(\gamma\lambda)^l$ 加权累加：

$$\hat{A}_t = \sum _ {l=0}^{\infty}(\gamma\lambda)^l\,\delta _ {t+l} \quad\Longleftrightarrow\quad \hat{A}_t = \delta_t + \gamma\lambda\,\hat{A} _ {t+1}$$

- $\lambda=0$ → 退化成一步 TD（短视、低方差）
- $\lambda=1$ → 退化成蒙特卡洛（远视、高方差）
- $\lambda=0.95$ → 偏远视、略收方差的实践甜点

对每个环境的数据**独立**计算 GAE 优势（不跨环境、不跨摔倒重置点）：

<div class="mermaid">
flowchart TB
    V["① $$V(s)$$ 估计"] --> TD["② $$\delta_t = r + \gamma V(s') - V(s)$$<br/>done 时不加 V(s')"]
    TD --> GAE["③ 逆序 GAE：$$\hat{A}_t = \delta_t + \gamma\lambda\hat{A} _ {t+1}$$<br/>done 边界截断"]
</div>

<h4 id="一个具体例子走-3-步后摔倒">一个具体例子：走 3 步后摔倒</h4>

参数用 $\gamma=0.99,\ \lambda=0.95$，故 $\gamma\lambda=0.9405$。一段 rollout：机器人走了 3 步，第 4 步大晃，第 5 步摔倒（done）：

| $t$ | 情况 | $r_t$ | $V(s_t)$（Critic 估计） |
|----|------|------|------|
| 0 | 正常走 | $+1$ | 50 |
| 1 | 正常走 | $+1$ | 50 |
| 2 | 正常走 | $+1$ | 50 |
| 3 | 大晃 | $-2$ | 40 |
| 4 | 摔倒，done | $-10$ | 20 |

**① 算每步 TD 误差** $\delta_t = r_t + \gamma V(s _ {t+1}) - V(s_t)$（$t=4$ 是 done，不 bootstrap）：

```
δ₀ = 1  + 0.99×50 - 50 = +0.5
δ₁ = 1  + 0.99×50 - 50 = +0.5
δ₂ = 1  + 0.99×40 - 50 = -9.4      # Critic 在这步嗅到危险（V 从 50 掉到 40）
δ₃ = -2 + 0.99×20 - 40 = -22.2
δ₄ = -10 + 0(done) - 20 = -30.0    # done，不加 γV(s₅)
```

**② 逆序递推 GAE** $\hat{A}\_t = \delta_t + 0.9405\,\hat{A}\ _ {t+1}$（从最后一步往前推，即源码里 `for i in reversed(...)`）：

```
Â₄ = -30.0
Â₃ = -22.2 + 0.9405×(-30.0) = -50.4
Â₂ = -9.4  + 0.9405×(-50.4) = -56.8
Â₁ = +0.5  + 0.9405×(-56.8) = -52.9
Â₀ = +0.5  + 0.9405×(-52.9) = -49.3
```

**③ 结果对照**：

| $t$ | $\delta_t$（只看一步） | $\hat{A}_t$（GAE，看到底） |
|----|------|------|
| 0 | **+0.5** | **−49.3** |
| 1 | +0.5 | −52.9 |
| 2 | −9.4 | −56.8 |
| 3 | −22.2 | −50.4 |
| 4 | −30.0 | −30.0 |

> 🔑 **最值钱的一点**：$t=0$ 这步，一步 TD 说 $\delta_0=+0.5$（挺好），GAE 却说 $\hat{A}_0=-49.3$（很糟）。因为它是一条**最终摔倒**的轨迹的一部分——$\lambda$ 让 $t=0$ "提前看见"4 步后的那一摔，把责任往前传；同时也在告诉 Critic"$V(s_0)=50$ 估高了"，优势与价值互相纠错。

**$\lambda$ 在调什么？** 拿 $\hat{A}_0$ 看三个取值：

| $\lambda$ | $\hat{A}_0$ | 含义 |
|------|------|------|
| $0$（一步 TD） | **+0.5** | 完全短视，看不见摔倒，被 Critic 的乐观估计带偏 |
| $0.95$（实用值） | **−49.3** | 远视但略收方差，看见了摔倒 |
| $1$（蒙特卡洛） | **−58.6** | 看到底、完全不信 Critic（恰好 $=G_0-V(s_0)$） |

$\lambda$ 从 0 调到 1，对"即将摔倒"的敏感度从**完全无视**升到**完全计入**；$0.95$ 是"看得见、又别被单条轨迹噪声带太偏"的折中。

同一段"3 步后摔倒"的轨迹，三个 λ 算出的 Â₀ 画在一起，差距一目了然：

<div class="mermaid">
xychart-beta
    title "同一条摔倒轨迹：不同 λ 下的 Â₀"
    x-axis ["λ=0 一步TD", "λ=0.95 实用值", "λ=1 蒙特卡洛"]
    y-axis "Â₀（优势估计）" -70 --> 10
    bar [0.5, -49.3, -58.6]
</div>

上面三根柱子只是三个固定的 λ。下面这个实验台可以连续拖 λ，还能逐步改奖励和 Critic 的 V(s)——「Critic 估高了」「Critic 提前预警」「摔得更早 / 更轻」这些情况亲手试一遍，比记公式管用：

<div class="paper-demo" data-demo="ppo-gae"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

> 💡 实战还会把 $\hat{A}$ 按 batch **减均值除标准差再截断**（配置 `norm_adv_clip: 4.0`），所以进裁剪公式的是"相对大小"，绝对量级不重要。

结果：站稳时 $\hat{A}_t > 0$（好动作），摔倒前 $\hat{A}_t \ll 0$（差动作）。

<h3 id="第-3-步ppo-裁剪更新核心">第 3 步：PPO 裁剪更新（核心！）</h3>

保存旧策略 $\pi _ {\theta _ {old}} \leftarrow \pi_\theta$，然后对同一批 2048 个样本做 **10 个 epoch** 的更新。这一步只盯三件事：

1. **概率比** $r_t = \pi_\theta(a_t \mid s_t)\,/\,\pi _ {\theta _ {old}}(a_t \mid s_t)$：$r=1$ 表示新策略和旧策略一样；$r>1$ 表示更爱选这个动作；$r<1$ 表示更少选。
2. **安全带** $[0.8,\ 1.2]$（$\epsilon=0.2$）：$r$ 最好待在这里面；冲出去就会被 `clip` 卡住。
3. **取 $\min$**：在「未裁剪分数 $r\cdot\hat{A}$」和「裁剪分数 $\mathrm{clip}(r)\cdot\hat{A}$」里，选**更保守**的那个。一旦选中的是裁剪分，而 `clip(r)` 已经顶在边界上（$0.8$ 或 $1.2$），它对 $\theta$ 的导数就是 $0$——这个样本**本轮不再推动参数**，称作「冻结」。

> ❓ **先回答最常见的疑问**：好动作里算出 `clip(r)=1.2`，**也会冻结**。坏动作里 `clip(r)=0.8` 会冻结。两边是对称的——不是只有 $0.8$ 才冻。

<h4 id="一张图什么时候还在学什么时候刹住">一张图：什么时候还在学，什么时候刹住</h4>

<div class="mermaid">
flowchart TB
    R["算出概率比 r"] --> Q1{"优势 Â 正还是负？"}
    Q1 -->|Â &gt; 0 好动作| G{"r 有没有冲过 1.2？"}
    Q1 -->|Â &lt; 0 坏动作| B{"r 有没有掉破 0.8？"}
    G -->|还在 0.8～1.2 内| GU["继续更新：再提高一点该动作概率"]
    G -->|r &gt; 1.2| GF["min 选中 clip=1.2<br/>梯度为 0 → 冻结<br/>已经够偏爱了，别再加码"]
    B -->|还在 0.8～1.2 内| BU["继续更新：再压低一点该动作概率"]
    B -->|r &lt; 0.8| BF["min 选中 clip=0.8<br/>梯度为 0 → 冻结<br/>已经够讨厌了，别再狂砍"]
</div>

可以把 $[0.8,\ 1.2]$ 想成车道：车（策略）可以在车道里加速/减速；一旦顶到护栏，方向盘这侧就锁死，防止一次转弯过大翻车。

<h4 id="案例-a好动作clipr12-也会冻结">案例 A：好动作——<code>clip(r)=1.2</code> 也会冻结</h4>

机器人在 $t=15$ 选了一次「抬腿迈步」，$\hat{A} _ {15}=+2.3$（比平均好）。

| 量 | 数值 | 人话 |
|----|------|------|
| 旧策略概率 | $0.032$ | 收集数据时，旧策略选这个动作的概率 |
| 新策略概率 | $0.048$ | 已经更新了几轮后的新策略 |
| 概率比 $r$ | $0.048/0.032=1.5$ | 新策略比旧策略更爱这个动作，爱过了头（超过 $1.2$） |

算两个分数，再取 $\min$：

- 未裁剪：$1.5 \times 2.3 = 3.45$
- 裁剪后：$\mathrm{clip}(1.5,\ 0.8,\ 1.2)=1.2$，再 $\times 2.3 = 2.76$
- $L=\min(3.45,\ 2.76)=2.76$ ← **选中了裁剪分**

因为 $1.2$ 是常数（不随 $\theta$ 再变），这条样本的策略梯度为 $0$ → **冻结**。含义：好动作可以鼓励，但最多鼓励到概率比 $1.2$；再往上加码本轮不认。

<h4 id="案例-b坏动作clipr08-冻结">案例 B：坏动作——<code>clip(r)=0.8</code> 冻结</h4>

$t=42$ 选了一次「乱甩手臂导致要倒」，$\hat{A} _ {42}=-3.1$。新策略已经不太选它了：$r=0.6$（低于 $0.8$）。

- 未裁剪：$0.6 \times (-3.1) = -1.86$
- 裁剪后：$\mathrm{clip}(0.6)=0.8$，再 $\times(-3.1)=-2.48$
- $L=\min(-1.86,\ -2.48)=-2.48$ ← **同样选中裁剪分**

$0.8$ 是常数 → 梯度为 $0$ → **冻结**。含义：坏动作可以打压，但最多打压到概率比 $0.8$；已经压够了，本轮不再继续狂砍（以免策略抖得太狠）。

<h4 id="两个案例对照">两个案例对照</h4>

| | 案例 A 好动作 | 案例 B 坏动作 |
|--|--------------|--------------|
| $\hat{A}$ | $+2.3$ | $-3.1$ |
| $r$ | $1.5$（偏高） | $0.6$（偏低） |
| $\mathrm{clip}(r)$ | **$1.2$** | **$0.8$** |
| $\min$ 选谁 | 裁剪分 $2.76$ | 裁剪分 $-2.48$ |
| 本轮还更新吗 | **否，冻结** | **否，冻结** |
| 一句话 | 已经够喜欢了 | 已经够讨厌了 |

<div class="mermaid">
flowchart LR
    subgraph trust["安全带 r ∈ 0.8～1.2"]
      direction TB
      Mid["r ≈ 1：照常学<br/>好动作抬概率 / 坏动作降概率"]
    end
    Low["r &lt; 0.8<br/>坏动作侧冻结"] --> trust
    trust --> High["r &gt; 1.2<br/>好动作侧冻结"]
</div>

把上面两个案例合并成一张可拖的图：横轴是概率比 $r$，三条线分别是未裁剪项、裁剪项和 PPO 真正优化的 $\min(\cdot)$。拖动 $r$ 看 $\min$ 什么时候选中裁剪项（梯度归零＝冻结），再把 $\hat{A}$ 拖成负数看看冻结换到了哪一侧：

<div class="paper-demo" data-demo="ppo-clip"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

> ⚠️ 拖过一遍会发现一件上面表格没说的事：**冻结只挡「往外冲」的那一侧**。好动作 $\hat{A}>0$ 时只有 $r>1.2$ 会冻；坏动作 $\hat{A}<0$ 时 $r>1.2$ 不但不冻，梯度还最大——因为 $\min$ 选中了更悲观的未裁剪项，把已经跑偏的策略拉回来。裁剪限制的是「继续变本加厉」，不是「纠错」。

训练循环里实际在做的事（同一批数据复用 10 轮）：

```
for epoch in range(10):                              # 同一批 2048 样本复用 10 轮
    for batch in shuffle_and_split(buffer, size=64): # 打乱切成 mini-batch
        r = pi_new(a|s) / pi_old(a|s)                # 概率比
        L = min(r * A, clip(r, 0.8, 1.2) * A)      # 出安全带就冻结
        loss = -mean(L) + 0.5 * MSE(V(s), R_target)  # 策略损失取负 + 价值损失
        optimizer.step()                             # 更新 θ 与 φ
```

> 🔑 **关键理解**：epoch 1 时 $r_t \approx 1$（几乎都在安全带内，样本大多还在学）；越往后 $r_t$ 越偏离 1，越多样本顶到 $0.8$/$1.2$ 被冻结——**刹车是自动踩上的**，所以同一批数据敢多刷几轮。

这句话可以直接验证。下面是一个能在浏览器里跑完整训练循环的最小 RL 任务（1 个状态、4 个动作，真实回报已知），两条曲线唯一的区别就是有没有裁剪——把「同一批数据复用轮数 K」从 1 拖到 10 以上，看无裁剪那条线什么时候开始翻车：

<div class="paper-demo" data-demo="ppo-epochs"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

<h4 id="常见疑问">常见疑问</h4>

**Q1：clip 生效时，reward 是不是就不反传了？**

大体对，但更精确地说：**被冻住的不是 reward，而是「这条样本对策略 $\theta$ 的梯度」。**

- Clip 作用在代理目标 $L=\min(r\hat{A},\ \mathrm{clip}(r)\hat{A})$ 上，用的是优势 $\hat{A}$，不是原始 reward。
- 当 $\min$ 选中边界上的 $\mathrm{clip}(r)$（$0.8$ 或 $1.2$）时，这一项对 $\theta$ 是常数 → **策略网络**这条样本的梯度为 $0$，本轮不再用它去改「选动作的概率」。
- **Critic（价值网络）照常反传**，用 $V(s)$ 去拟合回报，不受 PPO clip 冻结。
- 同一个 mini-batch 里，还在安全带内的其他样本仍会正常更新策略。

一句话：clip 生效 ≠ reward 不反传，而是「这条经验暂时不再推动策略参数」；价值头该学还学。

**Q2：「这条经验」是指从 $t=0$ 一直到 done 整条轨迹吗？**

不是。这里的「一条经验」是 **某一个时刻的 $(s_t,\ a_t)$**，不是从 $t=0$ 到 done 的整条轨迹。

- 整条轨迹会一起算 GAE（优势会往回看，并在 done 处截断）。
- 但 clip / 冻结是 **逐步、逐样本** 判断的：这个 $t$ 的 $r_t$ 冲出 $[0.8,\ 1.2]$ 就冻这个 $t$；同条轨迹里别的时刻若还在安全带内，照样更新。

所以一次 episode 里，完全可能有的步被冻结、有的步还在学。

<div class="mermaid">
flowchart TB
    Ep["一条 episode：t=0 … done"] --> S0["样本 (s0,a0)：看 r0"]
    Ep --> S1["样本 (s1,a1)：看 r1"]
    Ep --> St["样本 (st,at)：看 rt"]
    S0 --> D0{"r0 在安全带内？"}
    S1 --> D1{"r1 在安全带内？"}
    St --> Dt{"rt 在安全带内？"}
    D0 -->|是| U0["更新策略"]
    D0 -->|否| F0["本步冻结"]
    D1 -->|是| U1["更新策略"]
    D1 -->|否| F1["本步冻结"]
    Dt -->|是| Ut["更新策略"]
    Dt -->|否| Ft["本步冻结"]
</div>

<h3 id="第-4-步训练进展">第 4 步：训练进展</h3>

| 训练阶段 | 迭代次数 | 平均回报 | 行为表现 |
|---------|---------|---------|---------|
| **初期** | 0-100 | ~50 | 站立几步就倒，四肢乱甩 |
| **学会站立** | 100-300 | ~200 | 能稳定站立，开始尝试移动 |
| **学会走路** | 300-800 | ~1000 | 笨拙但稳定地向前走 |
| **步态优化** | 800-2000 | ~3000 | 步态流畅，速度提升 |
| **收敛** | 2000+ | ~5000+ | 高效稳定的行走步态 |

把这张表画成学习曲线，能直观看到 PPO 的典型形态——前期爬升慢（在学"不摔倒"），中期陡增（学会走后回报快速兑现），后期平台（收敛）。真正训练时 TensorBoard / wandb 上不止这一条；KL、clip 比例、熵、解释方差怎么读、坏了是什么病，见 [训练曲线怎么读](#ppo-curves-guide)。

<div class="mermaid">
xychart-beta
    title "Humanoid-v4 训练学习曲线（示意）"
    x-axis "迭代次数" [0, 100, 300, 800, 2000, 3000]
    y-axis "平均回报" 0 --> 5500
    line [30, 50, 200, 1000, 3000, 5000]
</div>

<h3 id="完整流程图">完整流程图</h3>

<div class="mermaid">
flowchart TB
    I["初始化 $$\pi_\theta,\, V_\phi$$（随机）<br/>创建 N=32 个并行环境"]
    L["32 个环境并行收集，各 64 步<br/>→ 2048 个样本"]
    G["按环境/轨迹独立计算 GAE 优势 $$\hat{A}_t$$"]
    S["保存 $$\pi _ {\theta _ {old}} \leftarrow \pi_\theta$$"]
    R["概率比 $$r_t(\theta)=\frac{\pi_\theta(a_t \mid s_t)}{\pi _ {\theta _ {old}}(a_t \mid s_t)}$$"]
    P["PPO 更新（10 epoch）<br/>$$L^{CLIP}=\min(r_t\hat{A}_t,\,\mathrm{clip}(r_t,0.8,1.2)\hat{A}_t)$$"]
    U["更新 θ（策略）与 φ（价值 MSE）"]
    Q{回报 > 目标?}
    DONE((训练完成))
    I --> L --> G --> S --> R --> P --> U --> Q
    Q -->|是| DONE
    Q -->|否| L
</div>

> 💡 注意：收集时按环境分开（保持轨迹独立），但更新时**打乱混合**所有环境的样本——这是 PPO 样本效率高的关键。
</details>

---

## 📈 训练曲线怎么读 {#ppo-curves-guide}

训练开始之后，算法细节已经写进代码里了，你真正每天盯的是 TensorBoard / wandb / rsl_rl 刷出来的那几条线。**多数线不能用「越高越好」或「越低越好」一句话打发**——有的看区间，有的看斜率，有的必须几条一起看。下面这个实验台把 Humanoid-v4 的示意曲线做成六种病历：先点「健康」记住标准形态，再点坏掉的那几种，看是哪条线先报警。

<div class="paper-demo" data-demo="ppo-curves"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 方向速查表

带 \* 的「好方向」有前提：奖励函数没写歪、终止条件你真的理解。表格里的健康区间按上面 Humanoid 示例（$\varepsilon=0.2$，rsl_rl 常见 `desired_kl ≈ 0.01`）。各框架里的列名见折叠块「名字对照」。

| 曲线 | 好方向 | 健康形态 | 立刻要查的坏样子 |
|------|--------|----------|------------------|
| **回合回报** | 越来越高\* | S 形：前期慢 → 中期陡 → 后期平台 | 突然腰斩；长期横盘在随机水平（~50） |
| **回合长度** | 本任务：通常越来越长 | 从几十步拉到超时上限 1000 | 一直 ~50 步（还在秒摔）；到顶了但回报不高（站着混存活奖） |
| **近似 KL** | **看区间，不是越高越好** | 稳定在 ~0.01（大约 0.008–0.025） | 持续高于 0.05；尖峰后回报崩；长期 ≈ 0 |
| **clip 比例** | **看区间** | 前期约 30%，千轮约 10%（见[附录 E](#e-训练过程中各组件的变化)） | 长期高于 40%；长期 ≈ 0 |
| **策略熵 / $\sigma$** | 慢慢变低，别到 0 | 平滑下降，收在一个还在探索的平台 | 几百轮就塌到 0；训练后期仍钉在初始值 |
| **解释方差** | 越来越接近 1 | 从负/0 爬到 0.7+ | 长期为负（还不如猜均值） |
| **价值损失** | 总体走低，允许随回报抬升反弹 | 先降后稳；回报从 50 涨到 5000 时绝对值可以回升 | 爆炸；很快到 0 但回报不动 |
| **策略损失** | **不要按高低判断** | 在 0 附近晃 | 绝对值爆炸；或长期钉死在 0 |

> ⚠️ **符号陷阱**：MimicKit 的 `actor_loss = -mean(L^{CLIP})`，Stable-Baselines3 的 `entropy_loss` 记的是 $-H(\pi)$（越负 = 熵越大）。换框架先看源码里这个量是「被 minimize 的 loss」还是「熵本身」。

### 先看哪几条，再怎么交叉验证

优先级从高到低只有三层：

1. **任务成不成**：回报 + 存活长度。这两条不涨，后面全是噪声。
2. **步子大不大**：KL + clip 比例。回报一旦异常，先来这里找原因。
3. **信号干不干净**：解释方差、价值损失、熵。它们解释的是「优势 $\hat{A}$ 还能不能当教材」。

<div class="mermaid">
flowchart TB
    R{"回报在涨 / 横盘 / 腰斩？"}
    R -->|横盘在随机水平| K0{"KL 和 clip 都接近 0？"}
    K0 -->|是| Tiny["几乎没学：先查 lr 和观测归一化"]
    K0 -->|KL 反而很大| BigEarly["步子已经迈飞，回报还没来得及崩"]
    R -->|突然腰斩| K1{"腰斩前 KL 是否冲出 0.05？"}
    K1 -->|是| Big["更新过大：降 lr / epochs，回滚"]
    K1 -->|不是，但熵已经到 0| Ent["熵塌缩：卡在站立局部最优"]
    R -->|看起来在涨| Vid{"打开回放：真的在做任务？"}
    Vid -->|在刷存活奖或空转| Hack["奖励在骗你：盯前进速度"]
    Vid -->|是| EV{"解释方差在往 1 爬？"}
    EV -->|长期为负| Critic["Critic 失灵：先把 V 拟合好"]
    EV -->|在爬| OK["健康：继续训练"]
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每条曲线的含义、健康区间、坏样子和原因</summary>

<h3 id="曲线-回合回报">回合回报（唯一的「任务分」）</h3>

每个结束的 episode 把逐步奖励加总，再做滑动平均。Humanoid-v4 上它大概长这样（与第 4 步那张表同一组锚点）：

| 迭代 | 0 | 100 | 300 | 800 | 2000 | 3000 |
|------|---|-----|-----|-----|------|------|
| 平均回报 | 30 | 50 | 200 | 1000 | 3000 | 5000 |

- **好方向**：越来越高。前期慢是在学「不摔」，中期陡是「会走」之后 $v_x$ 开始兑现，后期平台是收敛。
- **横盘在 ~50**：策略还是随机的。查学习率量级、观测是否标准化、奖励是不是太稀（走了也没分）、环境是不是没 reset 对。
- **突然腰斩**：几乎总是「更新步子过大」的后果，去看 KL / clip，不要先去改奖励。
- **涨得又快又稳，视频却难看**：进入「奖励在骗你」，这条曲线单独看会给出假阳性。

<h3 id="曲线-回合长度">回合长度（先搞清终止条件）</h3>

Humanoid 质心低于 0.8 m 就 `done`，所以**越长通常越好**，直到碰到 1000 步超时。别的任务不一定：推箱子「越短越好」（尽快完成），有的追逐任务长度和回报甚至反着走。

- 长度一直几十步：还在秒摔，和回报横盘是同一件事。
- 长度很快到顶、回报却不高：学会了站着混 **alive bonus**，没学会走。这是熵塌缩和奖励欺骗的共同外观，要用前进速度或回放区分。
- 长度抖动很大：并行环境里有的已经会走、有的还在摔，属于训练中期的正常噪声；平滑窗口拉大再看趋势。

<h3 id="曲线-近似kl">近似 KL（步子的尺子）</h3>

一次更新之后，新旧策略差多少。rsl_rl 常用 `desired_kl ≈ 0.01` 做自适应学习率：KL 超了就自动把 lr 拧小。

- **不是越高越好。** 目标是稳定落在大约 $[0.008,\ 0.025]$。
- **持续高于 0.05**：学习率太大、`actor_epochs` 太多、clip $\varepsilon$ 太松、或者没做 advantage 归一化。下一步策略会离开重要性采样还成立的区域，回报往往随后崩。
- **长期 ≈ 0**：参数几乎没动。学习率太小、梯度被全局 clip 掉、$\varepsilon$ 小到第一步就被冻住、观测尺度把梯度吞了。
- **尖峰然后回报崩**：这是最经典的死亡信号，回滚到尖峰前的 checkpoint，再降 lr。

<h3 id="曲线-clip比例">clip 比例（护栏被撞了几次）</h3>

一个 batch 里 $r_t$ 冲出 $[1-\varepsilon,\ 1+\varepsilon]$、被 `min` 冻住的样本占比。就是前面「K 轮复用」那个演示里的冻结比例。

- 前期策略变得快，大约 **30%** 被挡是正常的；到迭代 ~1000 策略稳了，大约 **10%**（附录 E 的两个数）。
- **长期高于 40%**：要么更新太猛（和 KL 爆炸一起出现），要么 $\varepsilon$ 设得太小、护栏贴脸。前者降 lr / epochs，后者把 $\varepsilon$ 从 0.1 调回 0.2 试试。
- **长期 ≈ 0**：要么没在学（$r \approx 1$），要么 $\varepsilon$ 大到护栏形同虚设。结合 KL 看：KL 也是 0 → 没学；KL 正常但 clip 是 0 → 护栏太松。

<h3 id="曲线-熵">策略熵 / 动作标准差（还在探索吗）</h3>

离散策略是 $H(\pi)$；Humanoid 这种对角高斯，日志里更常见的是平均 $\sigma$（action std / noise std）。两者同向：越大越随机。

- **好方向**：慢慢降。学会走路之后不需要再乱甩手臂，但还要留一点噪声应付扰动。
- **几百轮塌到 0**：过早变成确定性策略，采不到别的动作，局部最优锁死。MimicKit 默认 `action_entropy_weight: 0.0`，人形模仿任务靠运动先验探索，纯 PPO 走 Humanoid-v4 这类稀疏一点的奖励时反而容易塌。处理：加回熵奖励、给 $\sigma$ 设下限、或把学习率降慢。
- **一直不降**：熵系数太大，策略在「故意保持随机」，回报涨不动。
- **读 SB3 时**：`train/entropy_loss` 是 $-H$，曲线往下（更负）才是熵在变大。

<h3 id="曲线-价值损失">价值损失（Critic 的回归误差）</h3>

$$\mathcal{L}_V = \mathbb{E}\big[(V_\phi(s) - R_t)^2\big]$$

MimicKit 就是 `_compute_critic_loss` 里那个 `critic_loss`。

- **不要要求它单调降到 0。** 回报从 50 涨到 5000，target $R_t$ 的量级变了，绝对 MSE 回升完全可能；此时应看**解释方差**（相对拟合质量）。
- **爆炸**：Critic 学习率太大、回报没做归一化、出现了 NaN 奖励。
- **很快到 0 但回报不动**：对当前这批很差的回报过拟合了，泛化到下一轮 rollout 就失效。减小 `critic_epochs`、加一点 value clip（SB3 的 `vf_clip`）。

<h3 id="曲线-解释方差">解释方差（Critic 有没有把教材讲清楚）</h3>

$$\mathrm{EV} = 1 - \frac{\mathrm{Var}(R_t - V_\phi(s))}{\mathrm{Var}(R_t)}$$

- 1：V 完美解释回报；0：和「永远猜均值」一样差；**负数：比猜均值还差**。
- **好方向**：从负或 0 爬到 0.7 以上。EV 健康，优势 $\hat{A} = R - V$ 才是「这个动作比平均好多少」，而不是噪声。
- **长期为负**：观测没标准化、价值网络容量不够、Critic 学习率不合适、GAE $\lambda$ 极端（0 则 Critic 错了优势全错；1 则方差太大 V 很难拟合）。**先修 Critic，再谈 Actor。**
- **很早就 ≈ 1、回报却很低**：V 完美拟合了「现在很差」的回报分布，不代表任务在变好。

<h3 id="曲线-策略损失">策略损失（不要按高低读）</h3>

实现相关，日志里最容易读反：

- MimicKit：`actor_loss = -mean(min(rÂ, clip(r)Â))`，optimizer 做最小化。
- rsl_rl：`Loss/surrogate` 同样是被最小化的替代目标。
- SB3：`policy_gradient_loss` 近似于 $-\mathbb{E}[L^{CLIP}]$。

所以「actor_loss 越低越好」这句话**不成立**：优势归一化之后它本来就在 0 附近晃。只把它当健康检查——绝对值爆炸、或长期钉死在精确的 0（结合 KL≈0）才有意义。

<h3 id="曲线-名字对照">名字对照：你日志里那一列到底是谁</h3>

| 本文称呼 | Stable-Baselines3 | rsl_rl / Isaac Lab | MimicKit |
|----------|-------------------|--------------------|----------|
| 回合回报 | `rollout/ep_rew_mean` | `Train/mean_reward` | `test_model()` 的评估回报 |
| 回合长度 | `rollout/ep_len_mean` | `Train/mean_episode_length` | 需自己记 |
| 近似 KL | `train/approx_kl` | `Loss/kl` 或 `Policy/kl` | 需自己加 |
| clip 比例 | `train/clip_fraction` | `Policy/clip_fraction` | 需自己加（数 $r$ 出界的比例） |
| 熵 | `train/entropy_loss`（实为 $-H$） | `Loss/entropy` | `action_entropy_weight` 不为 0 时才有 |
| 解释方差 | `train/explained_variance` | 部分版本有 | 需自己加 |
| 价值损失 | `train/value_loss` | `Loss/value_function` | `critic_loss` |
| 动作标准差 | `train/std` | `Policy/mean_noise_std` | 高斯策略的 $\sigma$ |

MimicKit 默认日志比 rsl_rl 瘦：源码只打包了 `critic_loss`。若你主要用 MimicKit 训练纯 PPO，值得在 `_compute_actor_loss` 里补上 mean ratio、clipfrac 和近似 KL，否则「更新过大 / 几乎没学」这两种病要等回报崩了才看得见。

</details>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六种常见病历（和上面实验台同一套）</summary>

下面六种就是实验台的六个按钮。每张病历只写「哪几条线先动」和「常见原因」；调参没有唯一解，先对上病再动一两个旋钮。

<h3 id="病历-健康">① 健康</h3>

- 回报：30 → 50 → 200 → 1000 → 3000 → 5000 的 S 形（第 4 步那张表）。
- KL 贴在 0.01 色带里；clip 从约 30% 降到约 10%。
- 熵慢慢降到一个非零平台；解释方差爬向 0.8。
- **什么都不用改。** 打开回放确认步态，存 checkpoint。

<h3 id="病历-更新过大">② 更新过大</h3>

- **先兆**：KL 冲出 0.05，clip 卡在 40%–60%，熵开始掉。
- **发作**：回报比健康曲线涨得还快，然后腰斩，再也起不来——策略塌缩成「只选某几个动作」，重要性采样失效，和「把裁剪关掉」那个演示是同一类事故。
- **原因**：学习率太大、`actor_epochs` 太多、$\varepsilon$ 太松、advantage 没归一化、梯度 clip 过大。
- **处理**：回滚 KL 尖峰之前的 checkpoint；降 lr 或 epochs；确认 `norm_adv_clip` 还在。rsl_rl 可把 `desired_kl` 再收紧一点。

<h3 id="病历-几乎没学">③ 几乎没学</h3>

- 回报长期停在随机水平（~50），存活步数停在 ~50。
- KL ≈ 0，clip ≈ 0：护栏没撞上，是因为根本没走出 $r \approx 1$。
- **原因**：lr 小了两个数量级；$\varepsilon$ 过紧导致第一步就全冻（此时 clip 会**高**而不是低，和「lr 太小」相反——用 KL 区分：过紧时 KL 仍可能不低但有效更新为零）；观测没减均值除方差；奖励全是 0。
- **处理**：先打印一个 batch 的 obs 均值/方差和平均奖励；lr 按 $3\times 10^{-4}$ 量级对齐；确认不是评测脚本没跑起来。

<h3 id="病历-熵塌缩">④ 熵塌缩</h3>

- 熵/$\sigma$ 在几百轮里掉到 0，策略变成确定性的「站着」。
- 存活长度可以拉满 1000（不摔了），回报卡在站立局部最优（大约几百，到不了 3000+），前进速度起不来。
- KL、clip 在塌缩之后都会变低——看起来像「学完了」，其实是探索死了。
- **原因**：熵系数太小或为 0、高斯 $\sigma$ 无下限、更新过猛把概率质量堆到一个动作上。
- **处理**：加熵奖励或 $\sigma$ 下限；若已经塌了，回滚比硬拉回来容易。

<h3 id="病历-critic失灵">⑤ Critic 失灵</h3>

- 解释方差长期为负，价值损失不降或乱抖。
- 回报曲线毛刺极大、偶尔涨一点又掉回去；KL 和 clip 跟着乱跳——因为优势 $\hat{A}$ 本身是噪声，Actor 在用骰子当教材。
- **原因**：obs 没标准化、价值网络比 Actor 弱太多或太强导致不稳定、Critic lr 不合适、GAE $\lambda$ 取了 0 或 1 的极端、target 回报量级差了几个零。
- **处理**：**先停手调 Actor**。把 Critic 单独拟合到能让 EV 稳定大于 0，再恢复联合训练。MimicKit 里 Critic 本来就先于 Actor 更新（`critic_epochs: 2`），可以临时加大它。

<h3 id="病历-奖励在骗你">⑥ 奖励在骗你</h3>

- **所有常用曲线都可以看起来健康**：回报在涨、KL 在带里、clip 在降、EV 在爬、机器人还活满 1000 步。
- 揭穿它的不是 TensorBoard，是**仿真回放**或一条真正的任务指标（前进速度 $v_x$、跟踪误差）。站着混存活奖、转圈刷角速度、在原地高频抖动吃能量项，都会把回报曲线画得很漂亮。
- **处理**：改奖励（削弱 alive bonus、突出任务项、把能量惩罚设对）；从第一天起就记录任务指标，不要只盯 `mean_reward`。

> 🔑 **三条纪律**：① 用平滑窗口看趋势，不要被单次迭代吓到；② 回报异常时先看 KL / clip，再动奖励；③ 曲线好看不等于任务完成，训练后期每天看一眼回放。

</details>

---

## 🤖 为什么 PPO 是人形机器人控制的首选？

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：四条理由（高维动作空间友好 / 容错性强 / 工程友好 / 生态成熟）</summary>

1. **高维动作空间友好**：Humanoid 有 17 个关节需要同时控制，PPO 的裁剪机制避免了高维空间中策略的剧烈震荡
2. **容错性强**：人形机器人容易摔倒，PPO 不会因为几次摔倒就把已学会的平衡技能丢掉
3. **工程友好**：只需一阶优化器（Adam），代码简单，易于在 Isaac Gym/Lab 等 GPU 并行环境中部署
4. **生态成熟**：几乎所有人形机器人 RL 论文（AMP、PHC、ASE 等）都以 PPO 为基础算法

> **一句话**：如果只能学一个 RL 算法，PPO 是首选。它是 OpenAI Five (Dota 2)、RLHF (ChatGPT)、以及绝大多数机器人控制的核心算法。
</details>

---

## 📁 MimicKit 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：源码类图：PPO 在 MimicKit 中的位置 / 源码运行时序图 / 1. Actor-Critic 网络结构（PPOModel）…</summary>

以下代码块对应 [MimicKit](https://github.com/xbpeng/MimicKit) 中 PPO 的实现，与上述讲解的各模块一一对应。

<h3 id="源码类图ppo-在-mimickit-中的位置">源码类图：PPO 在 MimicKit 中的位置</h3>

先看静态结构。MimicKit 的所有算法都挂在 `BaseAgent` 的训练骨架下，PPO 是其中一条分支；后续论文（AMP、ASE、LCP……）的 Agent 都**继承自 PPOAgent**，所以这张图也是整个模块 01 源码的"地基"：

<div class="mermaid">
classDiagram
    class BaseAgent {
        base_agent.py 抽象基类
        +train_model(max_samples)
        #_train_iter() 一轮迭代
        #_rollout_train(num_steps) 收集经验
        #_build_train_data() 算训练目标
        #_update_model() 参数更新
        #_decide_action(obs, info)
    }
    class PPOAgent {
        ppo_agent.py
        #_build_train_data() TD(λ)回报+优势
        #_update_model() 先Critic后Actor
        #_compute_critic_loss(batch) MSE
        #_compute_actor_loss(batch) PPO-Clip
    }
    class BaseModel {
        base_model.py
        #_build_action_distribution()
    }
    class PPOModel {
        ppo_model.py
        +eval_actor(obs) 动作分布
        +eval_critic(obs) V(s)
        #_build_actor() #_build_critic()
    }
    class ExperienceBuffer {
        experience_buffer.py
        +record(name, data)
        +sample(n) 随机mini-batch
    }
    BaseAgent <|-- PPOAgent : 继承
    BaseModel <|-- PPOModel : 继承
    PPOAgent o-- PPOModel : _model
    PPOAgent o-- ExperienceBuffer : _exp_buffer
    PPOAgent ..> Env : _step_env()
</div>

- 读代码时按这个分工找：**采样循环**在 `BaseAgent`（`_rollout_train`），**PPO 特有的东西**全在 `PPOAgent` 的四个覆写方法里，**网络前向**在 `PPOModel`。
- 后续笔记的类图会在这张图基础上"往下长"：AMPAgent 继承 PPOAgent 加鉴别器，ASEAgent 再继承 AMPAgent 加编码器。

<h3 id="源码运行时序图">源码运行时序图</h3>

以 `python mimickit/run.py --mode train` 为入口，一次完整训练的调用时序如下（方法名对应 MimicKit 真实源码）：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as run.py
    participant AG as PPOAgent<br/>(ppo_agent.py)
    participant M as PPOModel<br/>(Actor + Critic)
    participant E as Env + Isaac Gym<br/>(N 个并行环境)
    participant B as ExperienceBuffer
    U->>R: python mimickit/run.py --mode train --env_config ... --agent_config ...
    R->>E: build_env()：按 engine/env 配置创建并行仿真
    R->>AG: build_agent()：agent_name "PPO" → PPOAgent
    R->>AG: train_model(max_samples)
    loop 每轮迭代 _train_iter()
        loop rollout：_rollout_train(steps_per_iter=32)
            AG->>M: eval_actor(norm_obs) → 动作分布
            M-->>AG: 采样 a_t 并记录 log π_old(a_t)
            AG->>E: _step_env(a_t)
            E-->>AG: obs、reward、done
            AG->>B: record(obs, action, reward, done, logp)
        end
        AG->>AG: _build_train_data()：compute_td_lambda_return() 逆序算 TD(λ) 回报与优势 Â
        loop Critic 更新（critic_epochs=2）
            AG->>B: sample(batch) 随机抽 mini-batch
            AG->>M: eval_critic(obs) → _compute_critic_loss()：MSE(V, tar_val)
        end
        loop Actor 更新（actor_epochs=5）
            AG->>B: sample(batch)
            AG->>M: eval_actor(obs) → _compute_actor_loss()：r_t=exp(logp-logp_old)，Clip [0.8, 1.2]
        end
        AG->>AG: 更新归一化器，π_old ← π_θ，进入下一轮
    end
    R->>AG: 周期性 test_model() 评估 + 保存 checkpoint
</div>

- ①–③ 是一次性初始化：`run.py` 先按配置构建并行环境，再按 `agent_name` 构建 PPOAgent。
- ⑤–⑨ 对应上文「第 1 步：收集经验」，⑩ 对应「第 2 步：计算优势」，⑪–⑭ 对应「第 3 步：PPO 裁剪更新」——MimicKit 里 Critic 与 Actor 分开各跑各的 epoch。

<h3 id="1-actor-critic-网络结构ppomodel">1. Actor-Critic 网络结构（PPOModel）</h3>

```python
# mimickit/learning/ppo_model.py
class PPOModel(base_model.BaseModel):     # Actor-Critic 模型，继承通用模型基类
    def eval_actor(self, obs):            # 前向计算策略分布 π_θ(·|s)
        h = self._actor_layers(obs)       # 观测经过 Actor 专属 MLP 提取特征
        a_dist = self._action_dist(h)     # 由特征构造动作分布（高斯：均值+方差）
        return a_dist                     # 返回分布对象，可采样动作或求 log_prob
    
    def eval_critic(self, obs):           # 前向计算状态价值 V_φ(s)
        h = self._critic_layers(obs)      # 观测经过 Critic 专属 MLP（与 Actor 独立）
        val = self._critic_out(h)         # 线性输出层得到标量价值
        return val                        # 返回 V(s) 估计值
```

Actor 和 Critic 各自独立（不共享 backbone），这是人形机器人领域的主流选择。

<h3 id="2-mlp-网络fc_2layers_1024units">2. MLP 网络（fc_2layers_1024units）</h3>

```python
# mimickit/learning/nets/fc_2layers_1024units.py
def build_net(input_dict, activation):    # 构建两层全连接网络（Actor/Critic 通用）
    layer_sizes = [1024, 512]  # 两层 MLP 的隐藏层宽度
    
    input_dim = np.sum([np.prod(curr_input.shape) for curr_input in input_dict.values()])  # 所有输入展平后的总维度
    
    in_size = input_dim                   # 当前层的输入维度，从观测维度开始
    layers = []                           # 收集各层模块的列表
    for out_size in layer_sizes:          # 逐层构建：input → 1024 → 512
        curr_layer = torch.nn.Linear(in_size, out_size)  # 全连接层
        torch.nn.init.zeros_(curr_layer.bias)            # 偏置初始化为 0
        layers.append(curr_layer)         # 加入线性层
        layers.append(activation())       # 加入激活函数（配置指定，如 ReLU）
        in_size = out_size                # 下一层的输入维度 = 本层输出维度
    
    net = torch.nn.Sequential(*layers)    # 串联成完整的前馈网络
    return net, info                      # 返回网络模块与构建信息
```

对应 `deepmimic_humanoid_ppo_agent.yaml` 中的配置：
```yaml
model:                               # 网络结构配置
  actor_net: "fc_2layers_1024units"  # [obs] → 1024 → 512 → [17] (动作均值)
  critic_net: "fc_2layers_1024units" # [obs] → 1024 → 512 → [1] (价值标量)
```

<h3 id="3-概率比计算r_t">3. 概率比计算（r_t）</h3>

```python
# mimickit/learning/ppo_agent.py - _compute_actor_loss()
a_dist = self._model.eval_actor(norm_obs) # 用当前策略计算动作分布 π_θ(·|s)
a_logp = a_dist.log_prob(norm_a)          # 新策略下旧动作的对数概率 log π_θ(a|s)

# 概率比 r_t(θ) = π_θ(a|s) / π_θ_old(a|s)
a_ratio = torch.exp(a_logp - old_a_logp)  # 对数概率相减再取指数，数值上更稳定
```

<h3 id="4-ppo-裁剪机制核心">4. PPO 裁剪机制（核心！）</h3>

```python
# mimickit/learning/ppo_agent.py - _compute_actor_loss()
a_ratio = torch.exp(a_logp - old_a_logp)              # 概率比 r_t(θ)

# L^CLIP(θ) = min(r_t(θ)·Â_t, clip(r_t(θ), 1-ε, 1+ε)·Â_t)
actor_loss0 = adv * a_ratio                           # 未裁剪项：r_t·Â_t
actor_loss1 = adv * torch.clamp(a_ratio,              # 裁剪项：先把 r_t 截断再乘优势
                                 1.0 - self._ppo_clip_ratio,  # ε=0.2 → 下界 0.8
                                 1.0 + self._ppo_clip_ratio)  # ε=0.2 → 上界 1.2
actor_loss = torch.minimum(actor_loss0, actor_loss1)  # 逐元素取较小值（悲观估计）
actor_loss = -torch.mean(actor_loss)  # 加负号因为 optimizer 做最小化
```

对应配置：
```yaml
ppo_clip_ratio: 0.2   # ε = 0.2，概率比限制在 [0.8, 1.2]
norm_adv_clip: 4.0    # 优势归一化后限制在 [-4, 4]
```

<h3 id="5-gae--td-λ-回报计算">5. GAE / TD-λ 回报计算</h3>

```python
# mimickit/learning/rl_util.py
def compute_td_lambda_return(r, next_vals, done, discount, td_lambda):  # 逆序计算 TD(λ) 回报
    return_t = torch.zeros_like(r)                       # 初始化回报数组，形状同奖励序列
    reset_mask = done != base_env.DoneFlags.NULL.value   # 标记哪些时间步轨迹结束（done）
    reset_mask = reset_mask.type(torch.float)            # 转浮点，便于后面做乘法掩码

    last_val = r[-1] + discount * next_vals[-1]          # 最后一步：r + γ·V(s')，用 V 估计补尾
    return_t[-1] = last_val                              # 作为逆序递推的起点

    timesteps = r.shape[0]                               # 总步数 T
    for i in reversed(range(0, timesteps - 1)):          # 从 T-2 逆序递推到 0
        curr_r = r[i]                                    # 当前步的即时奖励
        curr_reset = reset_mask[i]                       # 当前步是否为轨迹边界
        next_v = next_vals[i]                            # 下一状态的价值估计 V(s')
        next_ret = return_t[i + 1]                       # 已算好的下一步回报

        # λ=0.95 时，遇到 done 截断，不跨越轨迹
        curr_lambda = td_lambda * (1.0 - curr_reset)     # done 处把 λ 置 0，切断跨轨迹传播
        curr_val = curr_r + discount * ((1.0 - curr_lambda) * next_v + curr_lambda * next_ret)  # 按 λ 混合一步估计与多步回报
        return_t[i] = curr_val                           # 写回当前步的目标回报
    
    return return_t                                      # 返回整条序列的 TD-λ 回报（Critic 的 target）
```

对应配置：
```yaml
td_lambda: 0.95        # GAE λ=0.95
discount: 0.99         # 折扣因子 γ=0.99
```

<h3 id="6-价值网络损失critic-loss">6. 价值网络损失（Critic Loss）</h3>

```python
# mimickit/learning/ppo_agent.py - _compute_critic_loss()
def _compute_critic_loss(self, batch):                 # 计算价值网络的回归损失
    norm_obs = self._obs_norm.normalize(batch["obs"])  # 观测归一化（减均值除标准差）
    tar_val = batch["tar_val"]  # TD-λ 回报 target
    pred = self._model.eval_critic(norm_obs)  # V(s) 预测
    pred = pred.squeeze(-1)                   # 去掉末尾维度：[B,1] → [B]

    diff = tar_val - pred                     # 目标回报与预测的误差
    loss = torch.mean(torch.square(diff))  # MSE 损失

    info = {"critic_loss": loss}              # 打包成字典便于日志记录
    return info                               # 返回损失信息
```

<h3 id="7-训练循环ppo-update">7. 训练循环（PPO Update）</h3>

```python
# mimickit/learning/ppo_agent.py - _update_model()
def _update_model(self):                                # 一轮收集结束后的参数更新入口
    num_samples = self._exp_buffer.get_sample_count()   # 本轮收集到的样本总数
    
    # 先更新 Critic（多个 epoch）
    critic_batch_size = int(np.ceil(self._critic_batch_size * num_envs))  # 按环境数换算实际 batch 大小
    num_critic_steps = num_critic_batches * self._critic_epochs           # 总更新步数 = 批数 × epoch 数
    self._update_critic(critic_batch_size, num_critic_steps)              # 执行 Critic 梯度更新
    
    # 再更新 Actor（多个 epoch）
    actor_batch_size = int(np.ceil(self._actor_batch_size * num_envs))    # 按环境数换算实际 batch 大小
    num_actor_steps = num_actor_batches * self._actor_epochs              # 总更新步数 = 批数 × epoch 数
    self._update_actor(actor_batch_size, num_actor_steps)                 # 执行 Actor 梯度更新（含 PPO 裁剪）
```

对应配置：
```yaml
actor_epochs: 5        # Actor 更新 5 个 epoch
actor_batch_size: 4    # 每个 batch 4 个环境
critic_epochs: 2       # Critic 更新 2 个 epoch
critic_batch_size: 2   # 每个 batch 2 个环境
```

<h3 id="8-experience-buffer">8. Experience Buffer</h3>

```python
# mimickit/learning/experience_buffer.py
class ExperienceBuffer():                    # 经验缓冲区：暂存一轮 rollout 的数据
    def __init__(self, buffer_length, batch_size, device):  # 初始化缓冲区形状
        self._buffer_length = buffer_length  # 每环境收集步数（如 32）
        self._batch_size = batch_size        # 并行环境数（如 4096）
    
    def record(self, name, data):            # 收集阶段：每个时间步写入一条数据
        # 记录 (s, a, r, done, logp) 等数据
        data_buf[self._buffer_head] = data   # 写入缓冲区当前位置
    
    def sample(self, n):                     # 更新阶段：随机抽取 n 个样本
        # 随机采样 mini-batch 用于更新
        rand_idx = self._sample_rand_idx(n)  # 生成随机索引（打乱混合所有环境的样本）
        ...                                  # 按索引取出对应的 (s, a, Â, logp, ...) 等字段
```

对应配置：
```yaml
steps_per_iter: 32     # 每轮收集 32 步 × N 个环境
```

<h3 id="9-ppo-超参数一览">9. PPO 超参数一览</h3>

```yaml
# deepmimic_humanoid_ppo_agent.yaml
agent_name: "PPO"           # 使用 PPO 算法
discount: 0.99              # 折扣因子 γ
td_lambda: 0.95             # GAE λ
ppo_clip_ratio: 0.2         # 裁剪范围 ε
norm_adv_clip: 4.0          # 优势归一化后截断

actor_epochs: 5             # Actor 更新轮数
actor_batch_size: 4         # Actor batch size
critic_epochs: 2            # Critic 更新轮数
critic_batch_size: 2        # Critic batch size

action_bound_weight: 10.0   # 动作范围惩罚（防止动作超出边界）
action_entropy_weight: 0.0  # 熵正则（0 表示不用）
```
</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（6 节）：Q1: PPO 和 TRPO 的区别？ / Q2: 裁剪具体怎么起作用？ / Q3: 为什么 PPO 能对同一批数据更新多次？…</summary>

<h3 id="q1-ppo-和-trpo-的区别">Q1: PPO 和 TRPO 的区别？</h3>
**A**: TRPO 用二阶优化（KL 散度硬约束），计算复杂，需要 Hessian 矩阵；PPO 用一阶优化 + 裁剪，更简单且效果相当。PPO 可以看作 TRPO 的"工程友好版"。

<h3 id="q2-裁剪具体怎么起作用">Q2: 裁剪具体怎么起作用？</h3>
**A**: 把新旧策略的概率比限制在 $[1-\epsilon, 1+\epsilon]$ 范围内。好动作最多增大到 $1+\epsilon$ 倍就停，差动作最多减小到 $1-\epsilon$ 倍就停。确保每次更新都是"渐进改进"而不是"大跃进"。

<h3 id="q3-为什么-ppo-能对同一批数据更新多次">Q3: 为什么 PPO 能对同一批数据更新多次？</h3>
**A**: 因为裁剪机制是自适应的——随着更新轮次增加，概率比逐渐偏离 1，裁剪越来越频繁生效，自动限制了累积更新幅度。相当于自带刹车。

<h3 id="q4-ppo-的优缺点">Q4: PPO 的优缺点？</h3>
**A**: 
- **优点**：训练稳定、样本效率高（多 epoch 复用数据）、实现简单（一阶优化器）、广泛验证
- **缺点**：对超参数（$\epsilon$, 学习率）敏感、在稀疏奖励任务上可能探索不足

<h3 id="q5-ppo-中的-loss-由哪些部分组成">Q5: PPO 中的 loss 由哪些部分组成？</h3>
**A**: 两部分（有时三部分）：
- **策略损失**：$-L^{CLIP}$（加负号因为 optimizer 做的是 minimize）
- **价值损失**：$\frac{1}{2}\|V(s) - R _ {target}\|^2$（让价值网络预测更准）
- **（可选）熵正则**：$-c \cdot H(\pi)$（鼓励探索，防止策略过早收敛）

<h3 id="q6-tensorboard-上该看哪些曲线">Q6: TensorBoard 上该看哪些曲线？越高越好吗？</h3>
**A**: 先看**回合回报**和**存活长度**（任务成不成），再看 **KL** 和 **clip 比例**（步子大不大），最后看 **解释方差 / 价值损失 / 熵**（教材干净不干净）。只有回报和解释方差大致是「越高越好」；KL、clip 看的是区间（大约 0.01 和 10%–30%），熵是慢慢降但不要到 0，策略损失的正负号因实现而异、不能按高低读。回报突然腰斩先查 KL 是不是炸了；六条线都健康仍要打开回放 —— 机器人可能在刷存活奖励。详见 [训练曲线怎么读](#ppo-curves-guide)。
</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（1 节）：2026-03-15 Surrogate 的理解</summary>

<h3 id="2026-03-15-surrogate-的理解">2026-03-15 Surrogate 的理解</h3>

**Q: PPO中的surrogate是什么？如何理解？**

**Surrogate = 替代目标函数**，用一个"近似的、好优化的函数"来代替真正的策略梯度目标。

**🍕 生活类比：试吃调味**

想象你是个厨师，在调一锅汤的咸淡：
- **真正的目标**：让客人吃完整碗汤后说"完美"（但你不可能每调一次盐就让客人喝完一整碗再反馈）
- **Surrogate（替代）**：你舀一小勺尝一下，用这一勺的味道来**代替**整碗汤的评价，指导你下一步加多少盐

具体到 PPO：

$$L^{CPI}(\theta) = \hat{\mathbb{E}}_t \left[ \frac{\pi_\theta(a_t \mid s_t)}{\pi _ {\theta _ {old}}(a_t \mid s_t)} \hat{A}_t \right] = \hat{\mathbb{E}}_t \left[ r_t(\theta) \hat{A}_t \right]$$

- 用旧策略采的数据，通过概率比来估算"如果换成新策略，回报会变好还是变差"，不用真的重新采样
- PPO 的 clip 就是限制你每次最多加/减多少盐——防止估算偏差太大

---

**Q: "用旧策略采的数据，通过概率比来估算新策略的好坏"怎么理解？**

**🎰 类比：换骰子估胜率**

假设你用 **骰子A**（旧策略）投了 1000 次，记录了每次的点数和输赢。现在换了 **骰子B**（新策略），想知道"用 B 玩 1000 次大概能赢多少"——但不想真的再投 1000 次。

> 骰子A投出6点的概率是 1/6，骰子B投出6点的概率是 2/6。
> 那骰子A投出的每个6点，在骰子B的世界里应该"算两倍权重"。

这就是**重要性采样**（Importance Sampling）：

$$r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi _ {\theta _ {old}}(a_t \mid s_t)}$$

- **$r_t = 1.5$**：新策略选这个动作的概率比旧策略高了 50%
- **$r_t = 0.5$**：新策略选这个动作的概率减半了

$r_t(\theta) \times \hat{A}_t$ 就在告诉你：**新策略整体回报是变好了还是变差了**。PPO 的 clip 再加一层保险：概率比偏太远时估算不准，所以截断掉。
</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（7 节）：A. PPO 两种变体 / B. Loss 函数完整拆解 / C. Actor-Critic 网络架构 / D. 超参数速查表…</summary>

<h3 id="a-ppo-两种变体">A. PPO 两种变体</h3>

| 变体 | 方法 | 特点 |
|------|------|------|
| **PPO-Penalty** | 在目标函数中加入 KL 惩罚项 | 类似 TRPO，用拉格朗日乘子自适应调整 |
| **PPO-Clip** (主流) | 使用裁剪操作 | 更简单、更稳定，几乎所有实际应用的默认选择 |

<h3 id="b-loss-函数完整拆解">B. Loss 函数完整拆解</h3>

$$\mathcal{L} _ {total}(\theta, \phi) = \underbrace{-\mathbb{E}\left[ L^{CLIP}(\theta) \right]} _ {\text{策略损失}} + \underbrace{\frac{1}{2} \mathbb{E}\left[ \left( V_\phi(s) - R_t \right)^2 \right]} _ {\text{价值损失}}$$

**为什么策略损失要加负号？**
- PPO 的目标是**最大化** $L^{CLIP}$（让好动作概率更大）
- PyTorch/TensorFlow 的 optimizer 默认做**最小化**（梯度下降）
- 所以 minimize $(-L^{CLIP})$ ⟺ maximize $L^{CLIP}$

**价值损失的作用：**
- 让价值网络 $V_\phi(s)$ 拟合目标回报 $R_t$
- V 准 → 优势估计准 → 策略学得更好 → 新数据更好 → V 更准（良性循环）

<h3 id="c-actor-critic-网络架构">C. Actor-Critic 网络架构</h3>

| 架构 | 结构 | 特点 |
|------|------|------|
| **共享 backbone** | 输入 → 共享 MLP → 分叉 → Actor/Critic head | 省显存，但两个 loss 可能互相干扰 |
| **完全独立** | Actor MLP + Critic MLP 各自独立 | 更稳定，**人形机器人领域的主流选择**（Isaac Lab、legged_gym 等默认配置） |

<h3 id="d-超参数速查表">D. 超参数速查表</h3>

| 参数 | 含义 | 推荐值 |
|------|------|--------|
| $\epsilon$ (clip range) | 裁剪范围 | 0.1 ~ 0.2 |
| $\gamma$ (discount) | 折扣因子 | 0.99 |
| $\lambda$ (GAE) | 偏差-方差平衡 | 0.95 |
| learning rate | 学习率 | 3e-4 |
| n_envs | 并行环境数 | 1 ~ 256 |
| n_steps (T) | 每环境收集步数 | 64 ~ 2048 |
| n_epochs | 同批数据更新轮数 | 3 ~ 10 |
| mini_batch_size | 小批量大小 | 64 ~ 4096 |

<h3 id="e-训练过程中各组件的变化">E. 训练过程中各组件的变化</h3>

<div class="mermaid">
flowchart TB
    subgraph E100["迭代 ~100（刚学会站立）"]
        direction TB
        E100a["策略：小幅度扭矩，以保平衡为主"]
        E100b["V：站立 ≈200，倾斜 ≈50，摔倒 ≈0"]
        E100c["优势：直立 Â>0；导致摔倒的 Â≪0"]
        E100d["Clip 生效约 ~30%（策略快速变化）"]
        E100a --> E100b --> E100c --> E100d
    end
    subgraph E1000["迭代 ~1000（稳定行走）"]
        direction TB
        E1000a["策略：周期性腿部扭矩，类似步态"]
        E1000b["V：行走中 ≈3000，站立不动 ≈500"]
        E1000c["优势：加速 Â>0；减速/偏移时 Â 为负"]
        E1000d["Clip 生效约 ~10%（策略趋于稳定）"]
        E1000a --> E1000b --> E1000c --> E1000d
    end
    E100 --> E1000
</div>

完整的曲线解读（六条线的好方向、健康区间、六种病历）见 [训练曲线怎么读](#ppo-curves-guide)。

<h3 id="f-实验结果">F. 实验结果</h3>

论文在多个基准任务上验证了 PPO 的效果：
- **连续控制 (MuJoCo)**：HalfCheetah, Hopper, Walker, Swimmer, Ant, Humanoid，超越 TRPO、A2C
- **Atari 游戏**：在大多数游戏上取得优异表现
- **机械臂控制**：成功完成复杂的连续操作任务

<h3 id="g-相关工作">G. 相关工作</h3>

| 算法 | 年份 | 关系 |
|------|------|------|
| **TRPO** | 2015 | PPO 的前身，用信任区域的策略优化 |
| **A2C/A3C** | 2016 | 异步优势 Actor-Critic |
| **SAC** | 2018 | 软 Actor-Critic，off-policy 方法 |
| **TD3** | 2018 | 双延迟 DDPG，off-policy 方法 |
</details>

