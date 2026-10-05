---
layout: paper
title: "Real-World Humanoid Locomotion with Reinforcement Learning"
category: "高影响力精选 High Impact Selection"
subcategory: "Locomotion Classics"
zhname: "用强化学习实现真实世界人形行走"
demos: ["realhumanoid"]
---

# Real-World Humanoid Locomotion with Reinforcement Learning
**用强化学习实现真实世界人形行走**

> 📅 阅读日期: 2026-05-16（2026-10-05 对照论文原文重写，补讲解动画与配音视频）
>
> 🏷️ 板块: 03_High_Impact_Selection / Locomotion Classics
>
> 🧭 状态: 已对照 Science Robotics 正式版（9: eadi9579，正文与 [arXiv:2303.03381v2](https://arxiv.org/abs/2303.03381v2) 相同）和 [arXiv v1](https://arxiv.org/abs/2303.03381v1) 的附录（表 I–V、式 3–16）。旧版笔记里有几处与原文不符，已改正：Agility 自带的控制器原文只说是「公司 / 原生控制器」，没说是 MPC；闭链用的是**高刚度虚拟弹簧 + 交替子步**，不是「耦合约束补丁」；动作里除了 PD 目标还有**腿部关节的 PD 增益**；域随机化表里没有「外力扰动」；「主动调摆臂幅度抵消负载」「联合训练对卡脚尤其关键」「ExBody / HOVER 都沿用了这种闭链处理」原文都没有。`humanoid-transformer.github.io` 是 v1 的项目页，不是「进阶版」。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2303.03381](https://arxiv.org/abs/2303.03381)：v1（2023-03-06，标题 *Learning Humanoid Locomotion with Transformers*，10 页，带附录表格）；v2（2023-12-14，改为现标题，32 页） |
| **期刊** | Science Robotics 9: eadi9579（2024-04-17），DOI [10.1126/scirobotics.adi9579](https://doi.org/10.1126/scirobotics.adi9579)；[作者主页上的 PDF](https://hybrid-robotics.berkeley.edu/publications/ScienceRobotics2024_Learning_Humanoid_Locomotion.pdf) |
| **项目页** | [learning-humanoid-locomotion.github.io](https://learning-humanoid-locomotion.github.io/)（v2）· [humanoid-transformer.github.io](https://humanoid-transformer.github.io/)（v1） |
| **作者** | Ilija Radosavovic\*, Tete Xiao\*, Bike Zhang\*, Trevor Darrell†, Jitendra Malik†, Koushil Sreenath†（\* 共同一作，† 共同指导，按字母序） |
| **机构** | UC Berkeley |
| **机器人** | Agility Robotics **Digit**：约 1.6 m、45 kg，浮动基座模型 30 个自由度，每臂 4 个驱动关节，每腿 8 个关节（6 个驱动），小腿与跗骨被动、靠叶片弹簧和四连杆连接 |
| **代码** | 没有官方代码：v1 写了「会公开全部代码」，截至 2026-10 两个项目页都只有论文和视频链接，见「开源情况」 |
| **关键词** | 因果 Transformer、上下文内适应（in-context adaptation）、教师模仿 + 强化学习联合训练、虚拟弹簧闭链仿真、零样本 sim-to-real |

---

## 🎯 一句话总结

把最近 **16 步（0.32 s）**的「观测—动作」对喂给一个只有 **140 万参数**的因果 Transformer，直接输出 16 个关节的 PD 目标和 8 个腿部关节的 PD 增益；先用 PPO 训一个看得到 480 维完整状态的教师，再让学生用「强化学习损失 + 对教师的 KL」联合训练，KL 的权重在训练一半时退到 0。仿真里用**高刚度虚拟弹簧**近似 Digit 的闭链，加上动力学、地形与延迟的随机化，零样本部署到全尺寸 Digit：户外整整测了一周**没有一次摔倒**，在 Agility 仿真的不稳木板上成功率 100%（厂家控制器约 71%，读图）；下坡会自己换成小碎步、脚被台阶绊住会下一步抬高抬快 —— 这些都没写进训练目标。

> 🎮 **本文内嵌 1 段动画 + 1 段配音视频 + 3 个可交互演示**（不用装任何东西）：
> 1. [十幕动画：Digit 真实世界人形行走全流程](#rh-explainer-anim) —— 约 170 秒串完「全尺寸人形为什么难 → 因果 Transformer → 两步训练 → 奖励与命令 → 仿真闭链与域随机化 → 户外与实验室 → 自然行走 → 下坡换步态 → 脚被绊住 → 消融与局限」
> 2. [配音讲解视频](#rh-video) —— 同样十幕，加中文配音与字幕，10 分 29 秒竖屏，可下载
> 3. 上下文窗口 —— 1 / 8 / 16 步的因果掩码，事件还在不在窗口里，配论文图 8B 的读图数
> 4. 奖励计算器 —— 拖动命令与实际速度，看速度跟踪、转向跟踪与机身高度三项怎么算
> 5. 抽一台随机化的 Digit —— 按 v1 表 I 抽样，看阻尼为什么用对数均匀

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **Digit** | — | Agility Robotics 的全尺寸人形，腿是「鸟腿」结构，带被动关节和闭链 |
| **MDP / POMDP** | (Partially Observable) Markov Decision Process | （部分可观的）马尔可夫决策过程；真机只有带噪观测，所以是 POMDP |
| **PPO** | Proximal Policy Optimization | 近端策略优化，教师与学生的强化学习算法（见 [PPO 笔记](../../01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html)） |
| **KL** | Kullback–Leibler divergence | KL 散度，这里衡量学生动作分布离教师有多远 |
| **MLP / TCN / LSTM** | Multi-Layer Perceptron / Temporal Convolutional Network / Long Short-Term Memory | 论文消融里拿来和 Transformer 比的三种学生网络 |
| **PD** | Proportional–Derivative | 比例—微分控制：$\tau = K _ p(q^{\ast} - q) - K _ d \dot{q}$；策略输出 $q^{\ast}$ 和腿部的 $K _ p$、$K _ d$ |
| **IMU** | Inertial Measurement Unit | 惯性测量单元，和关节编码器一起是这台机器人唯一的输入 |
| **DR** | Domain Randomization | 域随机化：训练时随机改摩擦、质量、增益、延迟……（见 [域随机化笔记](../../01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html)） |
| **In-context adaptation** | 上下文内适应 | 不更新权重，只靠输入里的历史改变行为，类比 GPT-3 的上下文学习 |
| **IL / RL** | Imitation Learning / Reinforcement Learning | 图 8C 的三档训练目标：只模仿、只强化学习、两者一起 |

---

## 🎬 十幕动画：Digit 真实世界人形行走全流程 {#rh-explainer-anim}

<div class="paper-demo" data-demo="rh-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#rh-video}

<div class="paper-demo" data-demo="rh-video" data-src="media/rh_explainer_video.mp4" data-poster="media/rh_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/rh_explainer_video.mp4" download="真实世界人形行走_讲解视频.mp4">下载 mp4（11.0 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：前半部分（「要解决什么问题」「是怎么做的」「具体实例」）按小节收起，后面的实验解读、对人形的意义、开源情况、面试问题与附录整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：全尺寸人形为什么一直没有纯学习的控制器（引言、Digit 一节）</summary>

人形机器人的经典控制（Raibert 的平衡控制、线性倒立摆、混合零动力学、被动动力学行走……）能做出稳定、鲁棒的行走；基于优化的方法（在线轨迹优化、凸 MPC）还能一边生成动态动作一边满足约束，最出名的就是 Boston Dynamics Atlas 的后空翻、跳障碍和跳舞。论文的判断是：这些方法**很难推广、很难适应新环境**。

学习方法在灵巧操作、四足（[ANYmal 敏捷技能](../Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots/Learning_Agile_and_Dynamic_Motor_Skills_for_Legged_Robots.html)、[四足野外盲走](../Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.html)、RMA）和双足（Cassie）上都已经见效；小型人形上有人试过，全尺寸人形上的学习工作则都和模型控制器结合在一起。v1 的引言说得更直接：到那时为止，还没有发表过**纯学习**的全尺寸人形行走。

全尺寸 Digit 的难处具体在三点：

1. **只能盲走**：没有相机，只读关节编码器和 IMU，摩擦、负载、坡度都看不见；
2. **结构难模拟**：每条腿 8 个关节只有 6 个有电机，小腿和跗骨是被动关节，靠叶片弹簧和四连杆连着，脚趾靠连杆驱动 —— 闭运动链、欠驱动，主流 GPU 仿真器（Isaac Gym）模拟不了；
3. **人形本身不稳**：扰动来了要在零点几秒内反应。
</details>

### 论文的假设：历史里藏着世界的信息

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上下文内适应，以及它和四足那套「估计器」路线的区别</summary>

此前的足式 sim-to-real 要么用带记忆的网络（LSTM），要么像四足野外盲走、RMA 那样，从 TCN 特征里**显式回归**环境属性。本文的假设是：

> 观测—动作历史隐含了关于世界的信息，足够强的 Transformer 能据此**在上下文里**调整行为，不需要更新权重。

论文举的例子：模型可以比较历史里「想到达的状态」和「实际到达的状态」，据此推断下一步该怎么改动作；这可以看成 GPT-3 那类大模型的**上下文学习**。v1 补了一句与四足路线的区别：和 [Lee 2020](../Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.html) / RMA 的教师—学生相比，最大的不同是**不设瓶颈表示（潜向量），也不显式设计中间状态空间**。
</details>

---

## 🔧 是怎么做的？

### 📊 训练与部署流程

<div class="mermaid">
flowchart TB
    Sim["Isaac Gym（4 张 A100）<br/>虚拟弹簧近似闭链 · 动力学 / 地形 / 延迟随机化<br/>教师 8192 个环境，学生 4096 个"] --> Teacher["① 教师状态策略 π_s（看完整状态 s_t）<br/>MLP 512-512-256-128 · PPO<br/>输入 480 维完整状态（高度图、参数、增益……）"]
    Teacher -->|"KL 监督，λ 在训练一半时退到 0"| Student["② 学生观测策略 π_o<br/>16 步 (o, a) token → 因果 Transformer<br/>L = L_RL + λ·KL(π_o ‖ π_s)"]
    Sim --> Student
    Student --> Agility["Agility 高保真仿真<br/>准确的闭链与传感器噪声<br/>只筛掉不安全的策略，不改参数"]
    Agility --> Real["Digit 真机（零样本）<br/>策略 50 Hz → 16 个 PD 目标 + 8 个腿部 PD 增益<br/>关节 PD 1 kHz"]
</div>

### 第一步：控制器 —— 16 步历史进因果 Transformer

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：token 怎么组、网络多大、输出什么（方法节 Model architecture、Joint optimization 末段）</summary>

**输入**：策略 $\pi _ o$ 读长度 $l$ 的历史 $o _ t, a _ {t-1}, o _ {t-1}, a _ {t-2}, \ldots, o _ {t-l+1}, a _ {t-l}$，输出下一步动作 $a _ t$。每一对（观测，动作）是一个 token，先用 MLP（隐层 [512, 512]）嵌入，再加**正弦位置编码**；自注意力只允许看前面的 token，也就是**因果** Transformer。

**结构**：4 个 block，嵌入维度 192，4 个注意力头，MLP 比例 2.0；动作头是隐层 [256, 128] 的 MLP；全模型 **140 万参数**；上下文窗口 **16**。注意力就是标准的

$$\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d _ k}}\right)V$$

（[Transformer 笔记](../../01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.html)里有这条公式的手算）。

**观测**（v1 表 III，66 维）：机身线速度 3、机身角速度 3、关节位置 26、关节速度 26、投影重力 3、时钟输入 2、命令 3。

**动作**：16 个驱动关节的 **PD 目标**，加 8 个腿部驱动关节的 **PD 增益**（v1 写的是「把腿部电机的 P、D 增益放进动作空间」）。4 个脚趾电机不由策略控制，固定在默认位置、用固定增益 —— 论文说这是模型控制里常见的做法。真机上策略 **50 Hz**，关节 PD **1 kHz**。

**为什么选 Transformer**：论文给的理由是消融里它最好（图 8A），而且和 TCN、LSTM 比更容易随数据和算力扩展、更方便接入更多输入模态（讨论节）。
</details>

下面这个演示把「16 步 = 0.32 s」和因果掩码画出来，右边是论文图 8B 的上下文长度消融（读图）：

<div class="paper-demo" data-demo="rh-context"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第二步：两步训练 —— 教师模仿 + 强化学习

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：教师状态策略、式 2 的联合目标、λ 退火、非对称 critic（方法节 Teacher state-policy supervision / Joint optimization，v1 表 III）</summary>

**为什么分两步**：论文说直接在观测空间里用强化学习训「又慢又费资源」，样本效率低，拖慢迭代。

**① 教师状态策略** $\pi _ s(a _ t \mid s _ t)$：假设环境**完全可观**，MLP 隐层 [512, 512, 256, 128]，PPO 训练。它看的状态（v1 表 III）在 66 维观测之外，还有步态启发量 6、地形高度图 121、带噪与干净动作之差 36、带噪与干净观测之差 61、机器人与环境参数 147、$K _ p$ / $K _ d$ 40、重力 3，合计 **480 维**。这一步训练快，论文说奖励（比如步态参数）就在这一步反复调到最好。

**② 学生观测策略** $\pi _ o$：只看观测历史，用联合目标训练（式 2）：

$$\mathcal{L}(\pi _ o) = \mathcal{L} _ {RL}(\pi _ o) + \lambda\, D _ {KL}(\pi _ o \,\|\, \pi _ s)$$

$\lambda$ 是教师监督的权重，训练中**逐渐退火到 0，通常在训练进行到一半时到 0**：前期借教师，后期让学生靠强化学习超过教师。两项都是 on-policy 的，不需要预先算好的轨迹或离线数据集。

**为什么还要 RL 项**：状态空间与观测空间不同，两者「关于状态和观测表示的奖励流形」不同，只做教师监督会次优（论文原话的意思）。图 8C 的消融支持这一点：只模仿、只 RL 都不如两者一起（见具体实例第 7 步）。

**PPO 细节**（v1 第 IV-D 节、表 IV）：actor-critic 不共享权重，**critic 始终吃完整状态**（非对称 actor-critic，引用 Pinto 等）；超参见附录 B。

**和四足野外盲走的区别**（我们的对照）：那篇学生用 DAgger 收集数据、对教师的动作和 64 维潜向量做平方误差回归，教师算法是 TRPO；这篇学生直接对教师的动作分布做 KL，并且同时做强化学习，没有潜向量。
</details>

### 第三步：奖励与命令 —— 没有步态库，但有启发式脚轨迹

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：v1 表 II 的命令区间、式 3–16 的 14 项奖励（正式版放在补充材料里）</summary>

**命令**（v1 表 II）：前后 $v _ x \in [-0.3, 1.0]$ m/s、横向 $v _ y \in [-0.3, 0.3]$ m/s、转向 $\omega _ z \in [-1.0, 1.0]$ rad/s，三者独立生成，**每 10 s 换一次**；小于阈值（0.10 m/s、0.10 m/s、0.26 rad/s）的置零。回合长度 20 s。

**奖励**（v1 式 3–16，共 14 项；论文没给各项权重）：

| 类别 | 项 | 形式（v1） |
|------|------|------|
| 跟踪 | 线速度 $r _ {lv}$ | $\exp(-\lVert v _ {xy} - v^{\ast} _ {xy} \rVert^2 / \sigma _ {xy})$，$\sigma _ {xy} = 0.2$ |
| | 转向 $r _ {av}$ | $\exp(-(\omega _ z - \omega^{\ast} _ z)^2 / \sigma _ \omega)$，$\sigma _ \omega = 0.2$ |
| 机身 | 上下与俯仰横滚 $r _ {bm}$ | $v _ z^2 + 0.5\,\lVert \omega _ {xy} \rVert^2$ |
| | 倾斜 $r _ {bo}$ | 投影重力 $\lVert g _ {xy} \rVert^2$ |
| | 过低 $r _ {bh}$ | $h < h _ l$ 时 $(h _ l - h)^2$，$h _ l = 1.0$ m |
| 接触 | 双脚离地 $r _ {air}$ | 两只脚都没有接触力时为 1 |
| | 触地力过大 $r _ f$ | 超过阈值 $f _ {max}$ 的部分平方（$f _ {max}$ 是超参，没给值） |
| 步态 | 摆脚轨迹 $r _ {fs}$ | 跟踪启发式脚轨迹：水平用 **Raibert 启发式**，高度用 **von Mises 分布**（$\kappa = 0.04$），高度项权重 5.0 |
| 平滑与能耗 | 力矩 $r _ \tau$、关节加速度 $r _ {acc}$、动作变化 $r _ a$ | 各自的平方范数 |
| | 关节目标平滑 $r _ s$ | 关节目标的一阶差分与二阶差分的平方范数 |
| 姿态 | 选定关节偏离中立 $r _ {jp}$ | $\sum \alpha _ j (q(j) - q _ 0(j))^2$：肩横滚 / 偏航 $\alpha = 2.0$，肘 1.0，髋横滚 / 偏航 0.5，肩与髋俯仰 0.1 |
| 终止 | 碰撞 $r _ k$ | 自碰撞或机身碰撞时为 1，并结束回合 |

几点读法（我们的解读）：

- 论文和 v1 摘要都说「没有预先算好的步态库、没有参考轨迹」，但奖励里有一条**启发式的脚轨迹**（Raibert + von Mises），观测里还有 2 维**时钟输入**。所以准确的说法是：不跟踪参考动作，但步态节奏和抬脚高度有启发式的引导。
- 正文说「奖励里没有约束摆臂」—— 确实没有让手臂摆起来的项；反而手臂偏离中立要罚，只是**肩俯仰（摆臂主要靠它）的权重最小（0.1）**。
- 速度跟踪的 $\sigma$ 在分母上不平方：误差 $\sqrt{0.2} \approx 0.45$ m/s 时奖励降到 $1/e$（见具体实例第 3 步）。
</details>

下面这个演示把速度跟踪、转向跟踪和机身高度三项做成滑块（默认值就是具体实例第 3 步）：

<div class="paper-demo" data-demo="rh-reward"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第四步：仿真 —— 虚拟弹簧近似闭链 + 域随机化

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Isaac Gym 里的闭运动链、v1 表 I 的随机化、地形与规模（方法节 Simulation，v1 第 IV-B 节、表 I、表 IV）</summary>

**闭运动链**：Isaac Gym 负责刚体与接触动力学，但 Digit 膝—小腿—跗骨、跗骨—脚趾这两段是**闭链、欠驱动**的，Isaac Gym 模拟不了。作者引入一个**高刚度「虚拟弹簧」**代表连杆：按弹簧偏离原长的量算出力，施加到相连的刚体上；再用**交替子步**很快把弹簧长度拉回原长。论文说这些加在一起才让 sim-to-real 可行；v1 还说这是「已知第一次从 Isaac Gym 把欠驱动全尺寸人形迁移到真机」。正式版的致谢里专门感谢了 Y. Liu「关于仿真中弹簧近似的讨论」。

**域随机化**（v1 表 I）：

| 参数 | 区间 | 方式 | 分布 |
|------|------|------|------|
| 关节位置 / 关节速度噪声 | 0.175 rad / 0.15 rad/s | 加 | 高斯 |
| 机身线速度 / 角速度噪声 | 0.15 m/s / 0.15 rad/s | 加 | 高斯 |
| 投影重力噪声 | 0.075 | 加 | 高斯 |
| 观测延迟、动作延迟 | $B(p) \times dt$，[0, 0.2] | — | 均匀 |
| 电机零位偏移 | [0, 0.035] rad | 加 | 均匀 |
| 电机强度 | [0.85, 1.15] | 乘 | 均匀 |
| 电机阻尼 | [0.3, 4.0] | 乘 | **对数均匀** |
| 质量 | [0.5, 1.5] | 乘 | 均匀 |
| $K _ p$、$K _ d$ 系数 | [0.9, 1.1] | 乘 | 均匀 |
| 重力 | [0, 0.67] m/s² | 加 | 均匀 |
| 摩擦 | [0.3, 2.0] | 乘 | 均匀 |
| 恢复系数 | [0, 0.4] | 加 | 均匀 |

表注说高斯一栏写的是均值和标准差；表里写的是 [0.0, 0.175] 这样的形式，我们读作「均值 0、标准差 0.175」。延迟一行的 $B(p)$ 论文没展开，我们读作「以概率 $p$ 晚一个控制步」。正文结论：**动力学、地形与延迟的随机化组合起来**，迁移质量才高。

**地形**：平地、粗糙平地、平滑坡（最多 10% 坡度）。没有台阶，也没有任何离散障碍。

**规模**（v1 表 IV）：4 张 A100，教师 8192 个 / 学生 4096 个并行环境，每轮每个环境 24 步，6000 轮。项目页说「大约一天能采到百亿量级的样本」。
</details>

下面这个演示按 v1 表 I 抽样，看对数均匀分布的阻尼长什么样（数字和具体实例第 5 步一致）：

<div class="paper-demo" data-demo="rh-dr"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 第五步：sim-to-real —— 先过 Agility 仿真，再零样本上真机

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：高保真仿真只当过滤器、真机部署（方法节 Sim-to-real transfer）</summary>

训完的策略先放进 Agility Robotics 的**高保真仿真器**：和 Isaac Gym 不同，它准确模拟 Digit 的动力学和闭链，还模拟了按真机标定过的传感器噪声。这一步**不改任何网络参数**，只用来筛掉不安全的策略，也方便控制变量做定量对比（图 2D、图 8 都在这里测）。

真机上：策略 50 Hz、关节 PD 1 kHz，通过 Agility 提供的接口读关节编码器和 IMU。不做任何真机微调。

我们注意到的一点：观测里的「机身线速度」不是 IMU 直接测得到的量，真机上只能来自 Agility 接口给出的估计（这是我们的推测，论文没写来源）。所以「不用状态估计」（v1 摘要）应理解为不自己搭显式的状态 / 环境估计器，而不是完全不用任何估计量。
</details>

---

## 🚶 具体实例：把论文里的数手算一遍

动画、三个演示和这里用的是**同一份数**：正文与 v1 附录的数照抄；图 2D、图 6C、图 8 是读图近似值；下面的乘除、比例和估算是在这些数上现算的。

<h3 id="第-1-步上下文窗口与注意力的几个数">第 1 步：上下文窗口与注意力的几个数</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：0.32 s、d_k = 48、136 对、参数量为什么对不上</summary>

- **窗口**：$16 \times 0.02 =$ **0.32 s**。上一篇[四足野外盲走](../Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.html)的学生 TCN-100 读 $100 \times 0.02 = 2$ s，是这里的 **6.25 倍**。
- **每个头的维度**：$d _ k = 192 / 4 =$ **48**，缩放因子 $\sqrt{48} \approx 6.93$。
- **因果掩码**：16 个 token 里，第 $i$ 个能看第 $1 \ldots i$ 个，一共 $16 \times 17 / 2 =$ **136 对**，占 256 格的 53%。
- **前馈层**：MLP 比例 2.0 → 每个 block 的前馈隐层 $2 \times 192 = 384$。
- **参数量对账**（我们的估算）：按标准 block，注意力 $4 \times 192^2 = 147\,456$、前馈 $2 \times 192 \times 384 = 147\,456$，一个 block 约 29.5 万，4 个约 **118 万**；可嵌入 MLP 光是 $512 \times 512$ 那一层就有 26 万，再加动作头，会超过论文说的 140 万。论文没给逐层参数，可能嵌入 MLP 的写法和我们理解的不同 —— 这一条只说明「对不上」，不下结论。
</details>

<h3 id="第-2-步输入输出维度对账">第 2 步：输入输出维度对账</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：观测 66、状态 480、动作 16 + 8，以及几个论文没解释的数</summary>

按 v1 表 III 逐项加：

- 观测：$3 + 3 + 26 + 26 + 3 + 2 + 3 =$ **66**；
- 状态额外部分：$6 + 121 + 36 + 61 + 147 + 40 + 3 = 414$，合计 $66 + 414 =$ **480**；
- 「带噪与干净观测之差」61 = 66 − 时钟 2 − 命令 3，正好是传感器那几项（我们的对照）；
- $K _ p$、$K _ d$ 40 = 20 个驱动关节 × 2，20 = 每臂 4 × 2 + 每腿 6 × 2，与正文一致；
- 动作的 16 个 PD 目标 = 20 个驱动关节 − 4 个脚趾电机；8 个腿部增益 = 每腿 6 个驱动关节去掉 2 个脚趾电机后的 4 个 × 2 条腿（我们的推算）。

论文没解释的数：关节位置是 26 维，而 30 个自由度去掉浮动基座 6 个只剩 24 个关节；高度图 121 维像是 11 × 11 的网格，但没写网格大小；「带噪与干净动作之差」36 维，和 16 + 8 = 24（或 P、D 增益都算时的 16 + 16 = 32）都对不上。这几处我们只标出来，不猜。
</details>

<h3 id="第-3-步速度跟踪奖励">第 3 步：速度跟踪奖励</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：命令 0.5 m/s 时，实际 0.4 / 0.3 / 0 m/s 的奖励是 0.951 / 0.819 / 0.287</summary>

$r _ {lv} = \exp(-e^2 / 0.2)$，$e$ 是速度误差：

| 实际速度（命令 0.5 m/s） | 误差 $e$ | $e^2 / 0.2$ | $r _ {lv}$ |
|------|------|------|------|
| 0.4 m/s | 0.1 | 0.05 | $e^{-0.05} \approx$ **0.951** |
| 0.3 m/s | 0.2 | 0.2 | $e^{-0.2} \approx$ **0.819** |
| 0（站着不动） | 0.5 | 1.25 | $e^{-1.25} \approx$ **0.287** |

- 误差 $\sqrt{0.2} \approx 0.45$ m/s 时降到 $1/e \approx 0.37$；
- 转向用同样的形式和 $\sigma$：命令 0.5 rad/s、实际 0.3 rad/s，$r _ {av} \approx 0.819$；
- 机身高度：0.95 m 时罚 $(1.0 - 0.95)^2 = 0.0025$，1 m 以上不罚。
</details>

<h3 id="第-4-步命令有多大概率是原地站">第 4 步：命令有多大概率是「原地站」</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：置零阈值、每回合两段命令（假设均匀抽样的估算）</summary>

v1 表 II 只给了区间和阈值，没写分布。**假设三项各自均匀抽样、互相独立**（我们的假设）：

- 前后：$ \mid v _ x\| < 0.1$ 的概率 $0.2 / 1.3 \approx 0.154$；
- 横向：$ \mid v _ y\| < 0.1$ 的概率 $0.2 / 0.6 \approx 0.333$；
- 转向：$\|\omega _ z\| < 0.26$ 的概率 $0.52 / 2.0 = 0.26$；
- 三项同时置零（原地站）：$0.154 \times 0.333 \times 0.26 \approx$ **1.3%**。

回合 20 s、命令每 10 s 换一次，所以每回合两段命令，50 Hz 下一回合 **1000 步**。部署时命令换成摇杆连续给，和训练时「每 10 s 跳一次」的分布不同，论文说照样跟得上（图 3）。
</details>

<h3 id="第-5-步对数均匀的阻尼">第 5 步：对数均匀的阻尼</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：中位数 1.10、小于 1 的概率 46.5%，均匀抽样只有 18.9%</summary>

阻尼乘子在 [0.3, 4.0] 上对数均匀：

- 中位数 $\sqrt{0.3 \times 4.0} \approx$ **1.10**；
- 小于 1 的概率 $\ln(1/0.3) / \ln(4.0/0.3) = 1.204 / 2.590 \approx$ **0.465**；
- 如果改成均匀抽样：均值 2.15，小于 1 的概率只有 $(1 - 0.3)/3.7 \approx$ **0.189**。

论文没解释为什么只有阻尼用对数均匀。我们的理解：区间跨了一个数量级，按比例看 0.3→1 和 1→4 一样重要，对数均匀让「比标称小」和「比标称大」各占约一半样本。另外重力最多加 0.67 m/s²，约是 9.81 的 **6.8%**。
</details>

<h3 id="第-6-步训练规模">第 6 步：训练规模</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：教师 11.8 亿步 ≈ 273 天经验，每轮 20 次梯度更新（我们的估算）</summary>

按 v1 表 IV：

- 教师每轮 $8192 \times 24 = 196\,608$ 步，6000 轮共 **约 11.8 亿步**；学生每轮 $4096 \times 24 = 98\,304$ 步，共约 5.9 亿步；
- 每轮的小批量数：$196\,608 / 49\,152 = 4$（学生 $98\,304 / 24\,576 = 4$），乘 5 个 epoch，每轮 **20 次**梯度更新，6000 轮共 12 万次；
- 按 50 Hz 换算，教师的 11.8 亿步是 $1.18 \times 10^9 \times 0.02 \approx 2.36 \times 10^7$ s ≈ **273 天**的机器人经验；
- 一回合 1000 步、每轮每个环境只走 24 步，一个回合要跨约 42 轮。

论文没写训练时长。如果按项目页「一天约百亿样本」的吞吐，一次教师训练约 $1.18 / 10 \times 24 \approx 3$ 小时 —— 这是我们的推算，不是论文数字。
</details>

<h3 id="第-7-步图-2d-与图-8-的读数">第 7 步：图 2D 与图 8 的读数</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：不稳木板差 29 个百分点，Transformer 比 MLP 高 22 个，只 RL 只有联合目标的 21%（读图）</summary>

- **图 2D**（Agility 仿真，每种 10 次，均值与 95% 置信区间，过一部分算部分成功）：坡 100 / 100，台阶 100 / ≈97，不稳木板 100 / ≈71。不稳木板上差约 **29 个百分点**。
- **图 8A**（只换学生网络，3 个场景共 30 次）：Transformer ≈97%、LSTM ≈89%、TCN ≈86%、MLP ≈75%，Transformer 比 MLP 高约 **22 个百分点**。图 2D 里本文三个场景都是 100%，图 8A 却是约 97%，论文没解释（可能是不同的评测批次，这是我们的猜测）。
- **图 8B**（命令 1 m/s 爬坡，每档 20 次）：25° 时 16 步 ≈0.75、8 步 ≈0.71、1 步 ≈0.62 m/s，16 步比 1 步快约 **21%**（$0.75 / 0.62 \approx 1.21$）。
- **图 8C**（同样的坡）：25° 时模仿 + RL ≈0.75、只模仿 ≈0.63、只 RL ≈0.16 m/s；只模仿是联合目标的 84%，只 RL 只有 **21%**（$0.16 / 0.75$）。

注意：图 8B–C 的横轴写的是 0–25°，比训练里最陡 10% 的坡（约 5.7°）陡得多；正文只说「两种坡」。图与正文的这处出入论文没解释，这里照图读。
</details>

---

## 📊 实验结果怎么读

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（6 节）：户外 / 实验室与仿真对比 / 自然行走 / 上下文适应 / 三组消融 / v1 里的另外两个实验</summary>

<h3 id="户外图-1">户外（图 1，视频 1）</h3>

广场、步道、人行道、跑道、草地；材料有混凝土、橡胶、草，有晴天下午的干燥路面，也有清晨的湿路面 —— 这些地面属性训练里都没见过。**一周全天测试没有观察到一次摔倒**，作者因此敢不挂安全吊架。论文也坦白：因为是盲走，它会撞上台阶这类障碍、被绊住，但能调整行为避免摔倒（见上下文适应）。

<h3 id="实验室与仿真对比图-2">实验室与仿真对比（图 2）</h3>

- **外力**（图 2A）：扔大瑜伽球、用木棍推、往前走时从后面拉，都能稳住。
- **地面**（图 2B）：命令 0.15 m/s 前进，地上铺橡胶、布、电缆、气泡膜都能过（v1 还测了硬橡胶垫、软橡胶垫、滑的塑料地面和地毯，塑料地面最难）；两种坡最陡 8.7%（训练最多 10%），陡坡上 0.2 m/s 反而更稳。
- **负载**（图 2C）：空背包、装满的背包、布手提袋、装满的垃圾袋、纸袋。垃圾袋挂在手臂上时手臂没法自由摆，而策略平时依赖摆臂保持平衡，它照样走完 —— 论文据此说它能按上下文调整行为。
- **对比厂家控制器**（图 2D，Agility 仿真，正式版称为 native controller）：坡上两者都好；台阶上厂家控制器难以从「脚被绊住」中恢复，会**自动关机**（真机上复现过，见视频 2），本文能恢复，而且台阶从没出现在训练里；不稳木板上本文明显更好，这一项怕损坏硬件没上真机。v1 还说明，对比时关掉了 Agility 控制器的感知模块，双方都是盲走。

<h3 id="自然行走图-34">自然行走（图 3–4）</h3>

- **全向**（图 3）：前进、后退、转弯；训练时命令每 10 s 随机抽，部署时用摇杆实时连续给，也跟得上。
- **对侧摆臂**（图 4A）：左腿抬起时右臂往前摆。奖励里没有约束摆臂、也没有参考轨迹。论文列了人类摆臂的几种假说（动态稳定、降低代谢能耗、四足祖先遗留的协调），并推测：奖励里有能耗相关项，涌现的摆臂可能也在省能。
- **快走**（图 4B）：阶跃命令 1 m/s，从静止 1 s 内追上并持续跟踪。

<h3 id="上下文适应图-56">上下文适应（图 5–6）</h3>

- **下坡换步态**（图 5）：平地 → 下坡 → 平地，平地正常走、下坡小碎步低抬脚、回到平地恢复，都是自发的。最后一层 192 维隐状态里，有的神经元随步态振荡（图 5B 的 82、89 号，平地幅度大、坡上小），有的随地形变化（图 5C 的 108、132 号，平地高、坡上低）；用 PCA 和 t-SNE 投到二维后按地形分成两簇（图 5D，标签只用于上色）。
- **脚被绊住**（图 6）：腿撞上台阶后，下一次抬得更高、更快，两条腿、多种情形都能稳定复现，没有预先编程也没在训练里鼓励。隐状态热图在被绊住的那段明显变样（图 6B），平均响应出现明显凹陷（图 6C，读图约在 6 s 处跌到 −0.35）。论文据此说，Transformer 从观测—动作历史里**隐式检测**到了这类事件。

<h3 id="三组消融图-8">三组消融（图 8）</h3>

每组只改一个因素，其余固定，并按同样流程调超参：

| 消融 | 设置 | 结果（读图） |
|------|------|------|
| 网络结构（图 8A） | 只换学生网络，各自调超参、控制网络大小；图 2D 的 3 个场景共 30 次 | Transformer ≈97% > LSTM ≈89% > TCN ≈86% > MLP ≈75% |
| 上下文长度（图 8B） | 命令 1 m/s 爬坡，随机初始位置与朝向，每档 20 次 | 1 / 8 / 16 步：25° 时 ≈0.62 / 0.71 / 0.75 m/s，越长越好 |
| 训练目标（图 8C） | 同上的坡 | 只 RL / 只模仿 / 两者一起：25° 时 ≈0.16 / 0.63 / 0.75 m/s |

论文的引申：只模仿在四足里常见（引 Lee 2020），只 RL 相当于不用教师；Transformer 在 NLP 里有很好的扩展性，所以这是「把 Transformer 用于人形学习扩展」的积极信号。

<h3 id="v1-里的另外两个实验">v1 里的另外两个实验</h3>

v1（2023-03）的实验部分和正式版不一样，有两处正式版没有的数：

- **表 V**（Agility 仿真）：4–16 cm 逐级升高的台阶，0.3 m/s，各 5 次：MLP 50%、CNN 50%、LSTM 60%、本文 65%、厂家控制器 **70%**；能跟踪的最大命令速度 MLP 1.0、CNN 0.8、LSTM 0.3、本文 1.0、厂家 1.0 m/s。那时本文在台阶上还**不如**厂家控制器，正式版的图 2D 里变成了 100% 对 ≈97%。v1 还说其他网络基线「不够稳定，上不了真机」。
- **电机故障**（v1 图 6）：原地踏步时把左膝电机的 PD 增益砍半，左膝的位置与速度模式立刻改变、力矩略升，右膝随之调整，几个周期后稳定下来。
</details>

---

## 🤖 对人形机器人学习的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 节）：把 Transformer 带进底层控制 / 和四足教师—学生的三处不同 / 它没回答的问题</summary>

<h3 id="1-把-transformer-带进人形底层控制">1. 把 Transformer 带进人形底层控制</h3>

这篇最直接的影响是证明了：一个**小而通用**的序列模型，加上大规模并行仿真和随机化，就能在全尺寸人形上零样本走稳，而且表现出可分析的上下文适应。同一组作者随后在 [Humanoid Locomotion as Next Token Prediction](../Humanoid_Locomotion_as_Next_Token_Prediction/Humanoid_Locomotion_as_Next_Token_Prediction.html)（2024）里把训练目标换成离线的「下一个 token 预测」，吃进仿真 rollout、厂商控制器数据、动捕和视频等多种来源。

<h3 id="2-和四足教师学生的三处不同">2. 和四足教师—学生的三处不同</h3>

| | [四足野外盲走](../Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.html)（2020） | 本文（2023–2024） |
|------|------|------|
| 学生网络 | TCN，100 步（2 s） | 因果 Transformer，16 步（0.32 s） |
| 蒸馏方式 | DAgger + 平方误差，同时模仿 64 维潜向量 | KL + 强化学习联合，λ 训练一半到 0，不设潜向量 |
| 动作空间 | 相位振荡器 + 足端残差（16 维） | 16 个 PD 目标 + 8 个腿部 PD 增益 |
| 仿真 | RaiSim + 执行器网络 | Isaac Gym + 虚拟弹簧近似闭链 |

表是我们按两篇原文整理的。共同点是「训练时看真值、部署时读历史」这一分工：本仓库的 [HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)、[ExBody2](../ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.html) 用的是特权教师 → 学生蒸馏，[Humanoid-Gym](../Humanoid-Gym_Zero-Shot_Sim2Real_Transfer/Humanoid-Gym_Zero-Shot_Sim2Real_Transfer.html) 用的是和本文 critic 一样的非对称 actor-critic（critic 吃特权信息）。

<h3 id="3-它没回答的问题">3. 它没回答的问题</h3>

- **看不见**：盲走靠「撞上再改」，台阶只能事后适应；之后的 [Humanoid Parkour Learning](../Humanoid_Parkour_Learning/Humanoid_Parkour_Learning.html) 等把视觉接了回来。
- **只是走**：没有跑、跳、上下楼梯等更动态的技能，也没有操作。
- **奖励权重和部分维度没公开**：复现要自己补（见下一节的表）。
- **左右不对称、速度跟踪不完美、强拉会摔**：论文自己列的局限。
</details>

---

## 📁 开源情况与按论文描述的最小实现

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 节）：1. 有没有代码 / 2. 按论文描述写的最小骨架 / 3. 论文写明 vs 没写</summary>

<h3 id="1-有没有代码">1. 有没有代码</h3>

没有官方代码。v1 的引言写了「为方便后续研究，会公开全部代码」，但截至 2026-10，[v2 项目页](https://learning-humanoid-locomotion.github.io/)与 [v1 项目页](https://humanoid-transformer.github.io/)都只有论文与视频链接，没找到对应仓库。旧版笔记列过的 HybridRobotics 仓库是同实验室别的项目（Berkeley Humanoid 等），不是这篇的实现。

<h3 id="2-按论文描述写的最小骨架">2. 按论文描述写的最小骨架</h3>

下面是**我们按论文描述写的示意代码**（PyTorch 风格，不是官方实现），只为把结构和式 2 对上号：

```python
import torch, torch.nn as nn

class CausalTransformerPolicy(nn.Module):
    """16 步 (o, a) token → 4 层 4 头、192 维的因果 Transformer → 下一步动作的均值。"""
    def __init__(self, obs_dim=66, act_dim=24, ctx=16, d=192, heads=4, blocks=4):
        super().__init__()
        self.embed = nn.Sequential(                       # 每对 (o_t, a_{t-1}) 嵌入成一个 token
            nn.Linear(obs_dim + act_dim, 512), nn.ELU(),
            nn.Linear(512, 512), nn.ELU(), nn.Linear(512, d))
        pos = torch.arange(ctx)[:, None] / (10000 ** (torch.arange(0, d, 2) / d))
        self.register_buffer("pe", torch.cat([pos.sin(), pos.cos()], -1))  # 正弦位置编码
        layer = nn.TransformerEncoderLayer(d, heads, dim_feedforward=2 * d, batch_first=True)  # MLP 比例 2.0
        self.body = nn.TransformerEncoder(layer, blocks)
        self.head = nn.Sequential(nn.Linear(d, 256), nn.ELU(), nn.Linear(256, 128), nn.ELU(), nn.Linear(128, act_dim))
        self.register_buffer("mask", torch.triu(torch.ones(ctx, ctx, dtype=torch.bool), 1))  # 只看过去

    def forward(self, obs_hist, act_hist):                # (B, 16, 66), (B, 16, act_dim)
        x = self.embed(torch.cat([obs_hist, act_hist], -1)) + self.pe
        h = self.body(x, mask=self.mask)
        return self.head(h[:, -1])                         # 最后一个 token → a_t

def student_loss(ppo_loss, dist_student, dist_teacher, it, total_it):
    lam0 = 1.0                                             # 论文没给初值
    lam = lam0 * max(0.0, 1 - it / (0.5 * total_it))       # 「逐渐退火，通常一半时到 0」：线性是我们的假设
    kl = torch.distributions.kl_divergence(dist_student, dist_teacher).sum(-1).mean()  # D_KL(π_o ‖ π_s)
    return ppo_loss + lam * kl
```

`act_dim=24` 取的是「16 个 PD 目标 + 8 个增益」；激活函数、λ 的初值与退火形状、动作分布的参数化都是论文没写、我们补上的。

<h3 id="3-论文写明-vs-没写">3. 论文写明 vs 没写</h3>

| 项 | 论文写明的 | 没写、复现要自己定的 |
|------|------|------|
| 网络 | 4 层、192 维、4 头、MLP 比例 2.0、嵌入 [512, 512]、动作头 [256, 128]、140 万参数、窗口 16 | 激活函数、LayerNorm 位置、嵌入 MLP 的确切结构（参数量对不上，见具体实例第 1 步） |
| 动作 | 16 个 PD 目标 + 8 个腿部关节的 PD 增益，脚趾固定 | 增益是 P、D 都给还是只给一个；动作的缩放与偏置 |
| 训练目标 | 式 2，λ 训练一半时到 0，PPO，critic 吃状态 | λ 初值、退火形状 |
| 奖励 | 14 项的形式、$\sigma = 0.2$、$h _ l = 1.0$ m、$\kappa = 0.04$、$\alpha$ | 各项权重、$f _ {max}$、启发式脚轨迹的周期与参数 |
| 随机化 | v1 表 I 的区间与分布 | 延迟 $B(p)$ 的确切含义、高度图的网格 |
| 仿真 | 虚拟弹簧 + 交替子步 | 弹簧刚度、子步数 |
</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（6 节）：Q1: 为什么用 Transformer？/ Q2: 为什么要模仿 + RL 一起训？/ Q3: 闭链怎么仿真？/ Q4: 和四足教师—学生、RMA 有什么不同？…</summary>

<h3 id="q1-为什么用-transformer-而不是-lstm--tcn">Q1: 为什么用 Transformer 而不是 LSTM / TCN？</h3>

论文给的证据是图 8A：只换学生网络、各自调好超参，Transformer ≈97%，LSTM ≈89%，TCN ≈86%，MLP ≈75%（读图）；理由是 Transformer 更容易随数据和算力扩展、更方便接入更多模态。图 8B 说明上下文越长越好。注意它的窗口只有 16 步（0.32 s），远短于四足 TCN-100 的 2 s，所以这里的优势不能简单归结为「看得更远」（我们的看法）。

<h3 id="q2-为什么要模仿--强化学习一起训">Q2: 为什么要「模仿 + 强化学习」一起训？</h3>

只用 RL 在观测空间里训太慢、样本效率低；只模仿教师又会受状态空间与观测空间「奖励流形不同」所限，学生学不到超过教师的东西。式 2 把两者加在一起，λ 在训练一半时退到 0：前期借教师加速，后期纯 RL 优化。图 8C（读图）：25° 坡上只 RL ≈0.16、只模仿 ≈0.63、联合 ≈0.75 m/s。

<h3 id="q3-digit-的闭链在-isaac-gym-里怎么仿真">Q3: Digit 的闭链在 Isaac Gym 里怎么仿真？</h3>

把膝—小腿—跗骨、跗骨—脚趾的连杆换成高刚度的虚拟弹簧：按偏离原长的量算力施加到刚体上，再用交替子步把长度快速拉回原长。它只是近似，所以训完先在准确模拟闭链的 Agility 高保真仿真里筛一遍，再上真机。论文在局限里也承认这一点。

<h3 id="q4-和四足教师学生rma-有什么不同">Q4: 和四足教师—学生、RMA 有什么不同？</h3>

四足野外盲走的学生对教师的动作和潜向量做平方误差回归（DAgger 采数据），RMA 的学生回归一个显式的环境外参潜向量；本文**不设瓶颈表示**，学生对教师的动作分布做 KL，并且同时做强化学习，靠 Transformer 的上下文隐式适应。代价是可解释性弱，论文用神经元可视化（图 5–6）来补。

<h3 id="q5-没有步态库奖励里到底有什么">Q5: 「没有步态库」，奖励里到底有什么？</h3>

14 项（v1 式 3–16）：速度与转向跟踪；机身晃动、倾斜、过低；双脚离地、触地力过大；跟踪 Raibert + von Mises 的启发式脚轨迹；力矩、关节加速度、动作变化、关节目标平滑；选定关节偏离中立；碰撞终止。所以「没有步态库」不等于「步态完全自由」：时钟输入和启发式脚轨迹给了节奏与抬脚的引导。

<h3 id="q6-032-秒的上下文够用吗">Q6: 0.32 秒的上下文够用吗？</h3>

对它展示的行为看起来够用（我们的看法）：被绊住后「下一步就抬高」只需要记得刚刚发生的事；下坡换步态也是持续的状态，随时在窗口里。图 8B 显示 16 步比 8 步、1 步都好，但论文没测更长的窗口，所以「更长是否更好」没有答案。
</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：A. 与路线图其他论文的关联 / B. 超参数速查 / C. v1 与正式版的不同 / D. 讨论记录</summary>

<h3 id="a-与路线图其他论文的关联">A. 与路线图其他论文的关联</h3>

- **四足野外盲走（上一篇）**：路线图上四足地形 → 真实世界人形行走。从四足的特权教师 → 学生换到全尺寸人形，蒸馏方式从 DAgger 换成 KL + RL。
- **OP3 足球（下一篇）**：[Learning Agile Soccer Skills](../Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL/Learning_Agile_Soccer_Skills_for_a_Bipedal_Robot_with_Deep_RL.html)，小人形的零样本 sim-to-real，同样用了教师与 KL 正则。
- **PPO / Transformer / 域随机化**：这篇的三块基础，本仓库都有笔记。
- **Humanoid Locomotion as Next Token Prediction**：同组后续，把在线 RL 换成离线自回归。
- **[15 分钟 sim-to-real 人形行走](../Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes/Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes.html)**：同属「行走经典」，侧重训练效率。

<h3 id="b-超参数速查">B. 超参数速查</h3>

| 模块 | 参数 | 值 | 出处 |
|------|------|------|------|
| Transformer | block / 维度 / 头 / MLP 比例 / 窗口 | 4 / 192 / 4 / 2.0 / 16 | 方法节 |
| | 嵌入 MLP / 动作头 / 参数量 | [512, 512] / [256, 128] / 1.4M | 方法节 |
| 教师 | MLP | [512, 512, 256, 128] | 方法节 |
| PPO | GPU / 环境数（教师 / 学生） | 4 张 A100 / 8192 / 4096 | v1 表 IV |
| | 每环境步数 / epoch / minibatch | 24 / 5 / 49152 · 24576 | v1 表 IV |
| | 回合长度 / γ / GAE λ / 熵系数 / clip | 20 s / 0.99 / 0.95 / 0.001 / 0.2 | v1 表 IV |
| | 优化器 / 学习率 / 调度 / 权重衰减 | AdamW / 5e-4 / actor 余弦、critic 常数 / 0.01 | v1 表 IV |
| | 训练轮数 / 归一化 | 6000 / 输入与价值都归一化 | v1 表 IV |
| 命令 | 前后 / 横向 / 转向 | [−0.3, 1.0] / [−0.3, 0.3] m/s / [−1, 1] rad/s，每 10 s 换 | v1 表 II |
| 部署 | 策略 / PD | 50 Hz / 1 kHz | 方法节 |

<h3 id="c-v1-与正式版的不同">C. v1 与正式版的不同</h3>

| | v1（2023-03） | v2 / Science Robotics（2023-12 / 2024-04） |
|------|------|------|
| 标题 | Learning Humanoid Locomotion with Transformers | Real-World Humanoid Locomotion with Reinforcement Learning |
| 附录 | 正文里带表 I–IV（随机化、命令、观测、PPO）和式 3–16（奖励） | 移到补充材料（正式版：Text S1–S2、Tables S1–S4） |
| 实验 | 表 V（台阶 65% vs 厂家 70%）、地面、负载、外力、电机故障、摆臂 | 户外一周、图 2D（三种地形对比）、全向、快走、神经元分析、图 8 三组消融 |
| 对比基线 | MLP、CNN、LSTM、厂家控制器 | MLP、TCN、LSTM（图 8A）、厂家控制器（图 2D） |

正式版补充材料的四张表我们没拿到（期刊网站拒绝访问），表 I–IV 的数都取自 v1；两者是否完全一致我们没法核对。

<h3 id="d-讨论记录">D. 讨论记录</h3>

- 配音视频的多音字：「弹簧」「跗骨」用同句合成原字与同音字（谈 / 蛋、夫 / 付）比 log-mel DTW，确认读成 tán、fū；旁白绕开了「卡住（qiǎ）」「散度」「偏离的量（liàng）」「得 0.951」「调好」等，改成「绊住 / KL 项 / 偏离原长多少 / 奖励是 0.951 / 选好」。
- 读这篇时值得和 [LCP 笔记](../../01_Foundational_RL/LCP_Sim-to-Real_Action_Smoothing/LCP_Sim-to-Real_Action_Smoothing.html)对照：本文用「关节目标的一阶、二阶差分」奖励来压抖动，LCP 用梯度惩罚。
</details>

---

## 参考来源

- 正式版：Radosavovic et al., *Real-world humanoid locomotion with reinforcement learning*, Science Robotics 9, eadi9579 (2024)，DOI https://doi.org/10.1126/scirobotics.adi9579 ；PDF：https://hybrid-robotics.berkeley.edu/publications/ScienceRobotics2024_Learning_Humanoid_Locomotion.pdf
- arXiv：https://arxiv.org/abs/2303.03381 （v1 2023-03-06，带附录表 I–V；v2 2023-12-14）
- 项目页：https://learning-humanoid-locomotion.github.io/ （「一天约百亿量级样本」出自这里）、https://humanoid-transformer.github.io/ （v1）

> 注：正文数字摘自正式版（与 arXiv v2 相同）；命令、奖励、随机化、PPO 超参与表 V、电机故障实验摘自 arXiv v1；图 2D、图 6C、图 8 没有数值表，标「读图」的是从图上读的近似值；「具体实例」里的乘除、比例、概率与训练经验是在论文数字上现算的；标注「我们的解读 / 推测 / 假设 / 估算」的地方不是论文原文。
