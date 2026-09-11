---
layout: paper
paper_order: 13
title: "Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies (LCP)"
category: "Sim-to-Real"
demos: ["lcp"]
---

# Learning Smooth Humanoid Locomotion through Lipschitz-Constrained Policies (LCP)
**平滑人形机器人运动：基于 Lipschitz 约束策略的 Sim-to-Real 动作平滑**

> 📅 阅读日期: 2026-04-06
>
> 🏷️ 板块: Sim-to-Real / Humanoid Locomotion / Policy Regularization

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2410.11825](https://arxiv.org/abs/2410.11825) |
| **PDF** | [下载](https://arxiv.org/pdf/2410.11825) |
| **项目页** | [LCP Project Page](https://lipschitz-constrained-policy.github.io/) |
| **代码** | [zixuan417/smooth-humanoid-locomotion](https://github.com/zixuan417/smooth-humanoid-locomotion)（Isaac Gym 官方实现）<br>[xbpeng/MimicKit](https://github.com/xbpeng/MimicKit)（`lcp_agent.py` 轻量复现） |
| **作者** | Zixuan Chen, Xialin He, Yen-Jen Wang, Qiayuan Liao, Yanjie Ze, Zhongyu Li, S. Shankar Sastry, Jiajun Wu, Koushil Sreenath, Saurabh Gupta, Xue Bin Peng |
| **机构** | Simon Fraser University, UIUC, UC Berkeley, Stanford University, NVIDIA |
| **会议/版本** | IROS 2025 / arXiv preprint |
| **发布时间** | 2024年10月15日（arXiv） |

---

## 🎯 一句话总结

LCP 的核心主张很硬：**与其在 reward 里拧各种“平滑惩罚”旋钮，或者在输出后面再塞低通滤波器，不如直接约束策略本身对输入的敏感度**——用一个可微的梯度惩罚，把策略训练成“天生不抖”。

---

## 🔤 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **LCP** | Lipschitz-Constrained Policies | Lipschitz 约束策略 |
| **GP** | Gradient Penalty | 梯度惩罚 |
| **PPO** | Proximal Policy Optimization | 近端策略优化 |
| **ROA** | Regularized Online Adaptation | 正则化在线适应 |
| **PD** | Proportional-Derivative | 比例-微分控制 |
| **DoF** | Degree of Freedom | 自由度 |
| **Sim-to-Real** | Simulation to Real | 从仿真迁移到真实机器人 |

---

## ❓ 这篇论文要解决什么问题？

Sim-to-Real 里有个很烦但很真实的问题：

**仿真里学出来的策略，经常“太理想化”了。**

在 simulator 里，电机像超人：
- 想给多大扭矩就给多大
- 相邻时刻动作可以剧烈跳变
- 控制器抖得像抽风，也未必立刻出事

但到了真机上：
- 电机带宽有限
- 关节驱动有延迟
- 大幅高频动作会带来抖动、发热、饱和、甚至直接摔

所以很多系统会想办法“把动作弄平滑一点”，常见做法有两类：

1. **平滑 reward**：惩罚动作变化、关节速度、关节加速度、能耗等  
2. **低通滤波器**：直接把 policy 输出过一遍 filter 再发给机器人

问题是，这两类办法都不够优雅：

- **reward 方案**：要调一堆权重，不同机器人经常要重调
- **filter 方案**：会抑制探索，有时把本来该果断的动作也磨平了
- **共同问题**：都不是“直接约束策略本体”

> 💡 **类比**：
> - 平滑 reward 像给司机加罚单：“别急刹，别猛打方向”
> - 低通滤波器像你在方向盘后面装个阻尼器
> - **LCP 则是直接训练一个手更稳、动作更顺的司机**

这篇论文要解决的就是：

**能不能用一种简单、通用、可微、容易塞进现有 RL pipeline 的方法，让 policy 自己学会平滑，而不是靠一堆外部补丁？**

---

## 🔧 LCP 是怎么做的？

### 第一个概念：平滑，本质上就是“别对输入太敏感”

如果一个 policy 的输入状态只变了一点点，输出动作就剧烈乱跳，那它大概率不适合真机。

LCP 借用了一个很干净的数学概念：**Lipschitz continuity（Lipschitz 连续性）**。

直觉上，它说的是：

> **输入变化一点，输出最多只能变化有限的一点。**

形式上，如果一个函数满足：

$$
\|f(x_1)-f(x_2)\| \le K \|x_1-x_2\|
$$

那它就是 Lipschitz 连续的。这里的 $K$ 可以理解为“最大敏感度”。

- $K$ 小：函数更稳、更平滑
- $K$ 大：函数更容易对小扰动过激反应

对于策略 $\pi(o)$ 来说，这就变成：

> **观测 $o$ 稍微动一下，动作 $a$ 不要炸。**

这句话在真机上有一个非常具体的形式：**动作抖动 ≈ K × 观测噪声**。下面这个实验台把两个旋钮都给你——先把噪声拖到 0 看看「仿真里一切正常」，再拖到真机量级：

<div class="paper-demo" data-demo="lcp-sensitivity"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

### 第二个概念：约束梯度，就等于约束敏感度

论文用到一个关键事实：

如果函数梯度有界，那这个函数就是 Lipschitz 连续的。

所以他们不直接去求一个很难算的全局 Lipschitz 常数，而是转成一个更容易做的目标：

**惩罚 policy 对 observation 的梯度范数。**

也就是给训练目标加一个 gradient penalty：

$$
\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{RL}} - \lambda_{gp} \cdot \mathbb{E}_{o \sim \mathcal{D}}\left[ \| \nabla_o \pi(o) \|^2 \right]
$$

你可以把它理解成：

- PPO 想让策略拿更高 reward
- GP 项想让策略别那么神经质
- 两者一起训练，得到一个**既能做任务、又不过分抖动**的 policy

> 💡 **一句话直觉**：
> PPO 在学“做什么动作更赚”；LCP 在学“别一惊一乍地做”。

$\lambda_{gp}$ 不是越大越好。下面这个演示画出 $J(K) - \lambda_{gp}K^2$ 这条总目标曲线，峰值落在哪里就是训出来的敏感度——顺便看看压过头时任务表现要付多少：

<div class="paper-demo" data-demo="lcp-gp"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

### 第三个概念：它和平滑 reward/低通滤波器到底差在哪？

| 方法 | 作用位置 | 优点 | 缺点 |
|------|----------|------|------|
| **平滑 reward** | 环境 reward 里 | 直观，常见 | 依赖人工设计，超参多 |
| **低通滤波器** | policy 输出之后 | 上手快 | 影响探索，可能拖慢反应 |
| **LCP** | **直接约束 policy 本身** | 可微、统一、易集成 | 仍要调 GP 系数 |

LCP 的优势不是“数学更炫”，而是：

**它把“平滑”从经验技巧，变成了策略函数本身的结构性约束。**

这点非常适合工程落地。因为一旦你把“平滑”做成 policy regularizer，它就能比较自然地迁移到不同机器人、不同任务、不同训练框架里。

这张表里「低通滤波：可能拖慢反应」具体是多慢？下面这个实验台把三条曲线画在一起，第 80 步有一个阶跃——低通那条要爬很久才追上，而 LCP 那条是立刻跟的：

<div class="paper-demo" data-demo="lcp-vs-filter"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

### 训练框架：不是只靠 LCP，还是标准 humanoid sim-to-real 套路 + LCP

论文不是说“只加个 GP 就完事”。它依然建立在成熟的人形 RL 训练管线上：

- **PPO** 作为主优化算法
- **domain randomization** 缩小 sim-real gap
- **teacher-student / privileged learning**
- **ROA（Regularized Online Adaptation）** 做在线适应

也就是说，LCP 的定位不是替代整个 sim-to-real framework，而是：

<div class="mermaid">
flowchart TB
    PPO["PPO"] --> DR["Domain Randomization"]
    DR --> TS["Teacher-Student"]
    TS --> ROA["ROA 在线适应"]
    ROA --> LCP["+ LCP 梯度惩罚（几行代码）"]
</div>

> **在现有 pipeline 里，加一个几乎几行代码就能接进去的平滑正则项。**

这点很重要。因为真正有价值的方法，不只是 paper 里好看，而是你能不改天换地地接到现有工程里。

### 📊 LCP 接入 PPO 的训练回路

<div class="mermaid">
flowchart TB
    DR["Domain Randomization<br/>并行仿真"] --> Roll["Rollout 收集轨迹"]
    Roll --> PPO["PPO 策略梯度<br/>L_RL"]
    PPO --> GP["梯度惩罚项<br/>-λ_gp E ## ∇_o π(o) ## ²"]
    GP --> Total["L_total = L_RL + L_GP"]
    Total --> Upd["更新策略 π_θ"]
    Upd --> Roll
    subgraph opt["可选工程组件"]
        TS["Teacher-Student"]
        ROA["ROA 在线适应"]
    end
    DR -.-> TS
    DR -.-> ROA
</div>

---

## 🚶 具体实例：LCP 怎么让 humanoid 动作不抖？

下面用一个人形机器人跟踪速度指令的例子，走一遍 LCP 的直觉流程。

### 任务设定

机器人需要根据指令：
- 向前走 / 后退
- 左右移动
- 原地转向

policy 输入通常包括：
- gait phase（步态相位）
- 速度命令 $c$
- 关节位置、速度
- 上一时刻动作
- （teacher / privileged 分支中）质量、质心、驱动强度等特权信息

policy 输出：
- 每个关节的目标角度或动作指令
- 再通过 PD controller 转成扭矩

---

### 没有 LCP 时会发生什么？

假设两个连续时刻观测非常接近：

<div class="mermaid">
flowchart TB
    subgraph obs["观测几乎不变"]
        O1["o_t：略前倾, vx=0.8"]
        O2["o_{t+1}：稍更前倾, vx=0.8"]
        O1 --> O2
    end
    subgraph bad["无 LCP：动作大跳"]
        A1["a_t 小修正量级"]
        A2["a_{t+1} 符号/幅度剧变"]
        A1 --> A2
    end
    obs --> bad
</div>

观测几乎没变，动作却大跳。结果就是：
- action rate 大
- jitter 大
- 电机打得很猛
- 真机开始抖

这就是很多 sim policy 上真机翻车的根源之一。

---

### 加了 LCP 后会发生什么？

训练时，对每个 sampled observation，额外算一项：

<div class="mermaid">
flowchart LR
    GP["GP =  ## ∇_o π(o) ## ² 大 → 罚"] --> SMOOTH["策略学会连续变化"]
    SMOOTH --> A["a_t ≈ a_{t+1} 小步修正"]
</div>

动作还是会变，但变得更连续、更像真实控制器该有的样子。

> 💡 **关键点**：
> LCP 不是让动作“不变”，而是让动作变化**有边界、有节奏、有物理感**。

---

### 一个更工程化的理解

你可以把 LCP 理解成在 policy 外面加了一个“灵敏度预算”：

- 对 command 变化，允许响应
- 对姿态扰动，允许纠正
- 但不允许“芝麻大点输入变化，西瓜大点动作跳变”

这对真机特别重要，因为真机上的 actuator、传动链、结构柔性、延迟，全都不喜欢高频抽搐式控制。

LCP 本质上就是把“适合真实机器人执行”这件事，往 policy 里面硬塞了一步。

---

## 🤖 这篇论文的工程价值在哪？

### 1. 它解决的是一个特别工程、特别烦的问题

很多 RL 论文喜欢卷回报、卷花活，但真部署时最先杀人的往往不是回报低，而是：

**policy 抖。**

LCP 瞄准的就是这个非常真实的问题。它不是 flashy contribution，但很有工程含金量。

---

### 2. 它比“调 reward”更像一类通用组件

平滑 reward 往往跟任务、机器人、动作空间强耦合。你换个平台，很多权重就得重调。

LCP 的优点是：
- 形式统一
- 直接作用于 policy
- 容易塞进 PPO / actor-critic pipeline
- 对不同 humanoid morphology 都能复用

论文里验证的平台包括：
- Fourier GR1T1 / GR1T2
- Unitree H1
- Berkeley Humanoid

这说明它不是只在一个特定 robot 上“碰巧有效”。

---

### 3. 它把“后处理滤波”前移成了“训练期结构约束”

这是我觉得最值钱的一点。

低通滤波器是事后补救；LCP 是训练时把问题做掉。

这两者的哲学完全不同：

- 低通滤波：policy 本来可能很烂，但输出前给它抹平
- LCP：直接把 policy 训得没那么烂

显然后者更对路。

---

### 4. 它不神化自己，这反而更可信

论文没有吹成“万能平滑神器”。它很老实：
- GP 系数 $\lambda_{gp}$ 还是要调
- 太小，没效果
- 太大，动作会过于迟钝、任务回报下降

这反而靠谱。因为控制里就没有免费午餐。

如果一个方法号称“零调参、全平台乱杀”，大概率在胡扯。

---

## 🎤 面试高频问题 & 参考回答

### Q1: LCP 和普通 smoothness reward 的区别是什么？
**A**：smoothness reward 是在环境回报里额外惩罚动作变化、关节速度或能耗；LCP 是直接对 policy 关于 observation 的梯度加 penalty，从函数层面约束 policy 的敏感度。前者更像任务工程，后者更像策略正则化。

### Q2: 为什么约束 policy 梯度会让动作更平滑？
**A**：因为 policy 对输入 observation 的梯度越大，说明输入微小变化会引起输出大幅变化。限制这个梯度，相当于限制 policy 的局部 Lipschitz 常数，让动作对状态扰动不那么过激，从而减少 jitter。

### Q3: LCP 能替代低通滤波器吗？
**A**：论文结论是很多情况下可以作为替代方案，而且更优雅。因为低通滤波器会抑制探索，也可能削弱策略反应速度；LCP 是训练阶段直接塑造平滑 policy，而不是部署时再补滤波。

### Q4: LCP 的代价是什么？
**A**：主要是多了一项 gradient penalty，需要计算 policy 对 observation 的梯度；另外 GP 系数要调。太弱没效果，太强会让策略学得慢、动作太钝。

### Q5: LCP 为什么适合 sim-to-real？
**A**：因为 sim policy 常见问题就是动作跳变太大，而真机 actuator 无法理想跟随。LCP 通过降低策略敏感度，让动作序列更连续、更接近真实系统能执行的控制模式，所以更容易零样本部署。

### Q6: LCP 是不是只对 locomotion 有用？
**A**：论文主要验证在 humanoid locomotion 上，但思路本身更通用。只要你的策略输出需要连续、平滑、可执行，Lipschitz-style regularization 都值得试。

---

## 💬 讨论记录

### 2026-04-06：LCP 和 PPO 的关系

**Q: LCP 是不是一种新的 RL 算法？**

不是。**LCP 不是 PPO 的替代品，而是 PPO 上面的一个 policy regularizer。**

更准确地说：
- PPO 负责“怎么优化策略”
- LCP 负责“把策略往平滑方向约束”

所以它们的关系像：
- **PPO = 主菜**
- **LCP = 调味和收汁**

没有 PPO 这类 RL 优化器，LCP 不能自己单独打；但没有 LCP，PPO 学出来的 humanoid policy 往往更容易抖。

---

### 2026-04-06：LCP 的核心不是“动作平滑”，而是“策略敏感度控制”

很多人第一次看会把它理解成“又一个 action smoothing 技巧”。

这理解不算错，但不够深。

LCP 真正做的是：

> **控制 policy mapping 的局部斜率。**

动作平滑只是表象；本质是**让 observation → action 这张映射更稳**。

这个视角更有价值，因为它说明 LCP 不只是 locomotion trick，而是一个更一般的策略正则化思路。

---

## 📎 附录

### A. 方法核心公式

论文核心可概括为：

$$
\max_\theta J(\theta) \quad \Rightarrow \quad \max_\theta J(\theta) - \lambda_{gp} \cdot \mathbb{E}_{o \sim \mathcal{D}}\left[\|\nabla_o \pi_\theta(o)\|^2\right]
$$

其中：
- $J(\theta)$：原始 RL 目标（文中用 PPO 优化）
- $\lambda_{gp}$：gradient penalty 权重
- $\nabla_o \pi_\theta(o)$：policy 对 observation 的梯度

---

### B. 训练设置要点

根据论文描述，训练设置包含：

| 项目 | 内容 |
|------|------|
| **主算法** | PPO |
| **策略输出** | 目标关节旋转 / 动作指令 |
| **底层执行** | PD controller 转扭矩 |
| **Sim-to-Real** | domain randomization + ROA |
| **输入信息** | gait phase、command、关节位置/速度、前一时刻动作等 |
| **额外约束** | 对 policy 关于 observation 的梯度加 GP |

---

### C. 对比基线

论文主要和三类方法比较：

| 方法 | 说明 |
|------|------|
| **No Smoothing** | 不做任何平滑约束 |
| **Smoothness Reward** | 在奖励里惩罚 action rate / velocity / acceleration / energy |
| **Low-pass Filter** | 在输出动作后加滤波 |
| **LCP** | 直接对 policy 输入梯度加 penalty |

论文结论是：
- LCP 的平滑性可与 smoothness reward 接近
- task return 与 smoothness reward 相近
- low-pass filter 往往更容易伤害探索和性能
- no smoothing 虽然可能回报高，但抖得不适合真机

---

### D. 论文里验证的机器人平台

| 平台 | 说明 |
|------|------|
| **Fourier GR1T1 / GR1T2** | 全尺寸 humanoid |
| **Unitree H1** | 全尺寸 humanoid |
| **Berkeley Humanoid** | 更小型 humanoid |

这说明 LCP 不是只在单一形态上试通了一个 demo，而是跨多个平台验证。

---

### E. 你可以怎么把它用到自己的人形项目里？

如果你在做人形 locomotion / imitation / RL control，这篇 paper 最值得带走的不是某个数字，而是这几个工程建议：

1. **先检查 policy 有没有 jitter，而不是只看 return**  
   回报高但输出发抖，真机大概率翻车。

2. **平滑最好尽量在训练阶段解决，不要全指望部署后滤波**  
   后处理能救火，但救不了根上的问题。

3. **把“策略敏感度”当成一个一等公民指标**  
   不只是看 tracking reward，也看 action rate、jitter、base acceleration、energy。

4. **LCP 值得作为默认 baseline 加进训练框架里**  
   尤其是 humanoid sim-to-real，这不是花活，是正经工程项。

---

### F. 相关工作

| 论文/方向 | 关系 |
|-----------|------|
| **PPO (2017)** | LCP 的主训练算法基础 |
| **Domain Randomization** | 缩小 sim-real gap 的经典路线 |
| **ROA / adaptation-based sim-to-real** | 论文使用的迁移框架组成部分 |
| **Smoothness rewards / low-pass filters** | LCP 直接对标替代的传统方法 |
| **AMP / ASE / CALM** | 文中提到梯度惩罚此前常用于 discriminator regularization |

## 📁 MimicKit 源码对照

以下代码块对应 [MimicKit](https://github.com/xbpeng/MimicKit) 中 LCP 的实现，与上述讲解的各模块一一对应。

### 源码类图：LCP 是最薄的一层

先看静态结构（接着 PPO 笔记的类图往下长）。整个 MimicKit 里 LCP 是**改动最小**的算法——`lcp_agent.py` 全文不到 50 行，`LCPModel` 只是改名，真正的新东西只有一个方法：

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
        #_compute_lcp_loss() ‖∇ₒ log π‖²
    }
    class PPOModel {
        ppo_model.py
    }
    class LCPModel {
        lcp_model.py 纯继承 零改动
    }
    PPOAgent <|-- LCPAgent : 继承
    PPOModel <|-- LCPModel : 继承
    LCPAgent o-- LCPModel : _model
</div>

- 这张图本身就是论文卖点的证明：**平滑性约束不需要新网络、不需要新奖励项**，一个对观测的梯度惩罚就够——所以类图上只多了 `_compute_lcp_loss()` 一个成员。
- 对照 AMP/ASE 的类图看：同样继承 `PPOAgent`，AMP 加了一整个判别器分支，LCP 只加了一项 loss——继承树上的"层厚"直接反映论文改动量。

### 源码运行时序图

以第 7 节的训练命令 `python mimickit/run.py --mode train --agent_config lcp_g1_agent.yaml` 为入口。`LCPAgent` 继承 `PPOAgent`，整条训练时序与 PPO 完全一致，**唯一的差别发生在 Actor 更新这一步**——多算一次对观测的梯度惩罚：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant R as run.py
    participant AG as LCPAgent<br/>(lcp_agent.py)
    participant M as LCPModel<br/>(= PPOModel 结构)
    participant E as Env + Isaac Gym<br/>(4096 并行)
    U->>R: python mimickit/run.py --mode train --agent_config lcp_g1_agent.yaml
    R->>E: build_env()（deepmimic_g1_env.yaml，DeepMimic 式跟踪任务）
    R->>AG: build_agent()：agent_name "LCP" → LCPAgent（读入 lcp_weight）
    R->>AG: train_model(max_samples)
    loop 每轮迭代 _train_iter()
        loop rollout：_rollout_train(steps_per_iter)
            AG->>M: eval_actor(obs) → 采样 a_t
            AG->>E: _step_env(a_t)
            E-->>AG: obs、reward、done → 存入 buffer
        end
        AG->>AG: _build_train_data()：TD(λ) 回报 + GAE 优势
        loop Critic 更新（critic_epochs）
            AG->>M: _compute_critic_loss()：MSE（与 PPO 相同）
        end
        loop Actor 更新（actor_epochs）
            AG->>M: super()._compute_actor_loss()：标准 PPO-Clip loss
            AG->>M: _compute_lcp_loss()：norm_obs.requires_grad_(True) → log_prob
            M-->>AG: autograd.grad(a_logp, norm_obs, create_graph=True) → ‖∇ₒ log π‖²
            AG->>AG: actor_loss += lcp_weight × lcp_loss（λ_gp = 0.002）
            AG->>M: SGD 一步更新（二阶梯度经 create_graph 回传）
        end
    end
    R->>AG: 周期性 test_model() + 保存 checkpoint
</div>

- ⑤–⑨ 与 PPO 完全相同：LCP 不改 rollout、不改奖励、不改网络结构。
- ⑪–⑭ 是 LCP 的全部增量（对应下面第 3、4 节）：在 PPO actor loss 之外，对 `log π(a|o)` 关于观测求梯度、取范数平方作为 Lipschitz 惩罚，再按 `lcp_weight` 加权合入——`create_graph=True` 让这个"梯度的梯度"能继续反向传播到策略参数。

### 1. LCP Agent（LCP 作为 PPO 的 wrapper）

```python
# mimickit/learning/lcp_agent.py
class LCPAgent(ppo_agent.PPOAgent):
    def __init__(self, config, env, device):
        super().__init__(config, env, device)
        return

    def _load_params(self, config):
        super()._load_params(config)
        self._lcp_weight = config["lcp_weight"]  # GP 权重，由用户调参
        return

    def _build_model(self, config):
        model_config = config["model"]
        self._model = lcp_model.LCPModel(model_config, self._env)
        return
```

> 🔑 **关键理解**：LCP 继承自 PPOAgent，不改动 PPO 的训练循环，只在 `_compute_actor_loss` 里额外加一项 loss。

### 2. LCPModel（几乎等价于 PPOModel）

```python
# mimickit/learning/lcp_model.py
class LCPModel(ppo_model.PPOModel):
    def __init__(self, config, env):
        super().__init__(config, env)  # 完全复用 PPOModel 的网络结构
        return
```

> 网络架构和 PPO 完全一样（FC 两层 1024 units），LCP 的平滑约束不依赖新的网络结构。

### 3. LCP 梯度惩罚损失（核心！）

```python
# mimickit/learning/lcp_agent.py - _compute_lcp_loss()
def _compute_lcp_loss(self, norm_obs, norm_a):
    norm_obs.requires_grad_(True)  # 需要梯度以计算二阶导
    a_dist = self._model.eval_actor(norm_obs)
    a_logp = a_dist.log_prob(norm_a)

    # 关键：对 log_prob 关于 observation 求梯度
    a_logp_grad = torch.autograd.grad(
        outputs=a_logp,
        inputs=norm_obs,
        grad_outputs=torch.ones_like(a_logp),
        create_graph=True,        # 需要对梯度再求导（链式法则）
        retain_graph=True,        # 保留计算图供后续使用
        only_inputs=True
    )[0]

    # 计算梯度范数：||∇_o log π(a|o)||²
    a_logp_grad_norm = torch.sum(torch.square(a_logp_grad), dim=-1)
    lcp_loss = torch.mean(a_logp_grad_norm)
    return lcp_loss
```

> 💡 **为什么用 `log_prob` 而不是 `mean`？**
> log prob 的梯度恰好等价于 policy 对 observation 的敏感度度量——观测微扰 → 动作概率变化有多大。而且 log prob 本身参与 PPO 的 policy gradient 计算，复用已有计算图，几乎没有额外开销。

### 4. 在 Actor Loss 里加入 LCP 项

```python
# mimickit/learning/lcp_agent.py - _compute_actor_loss()
def _compute_actor_loss(self, batch):
    info = super()._compute_actor_loss(batch)  # 先拿标准 PPO actor loss

    norm_obs = self._obs_norm.normalize(batch["obs"])
    norm_a = self._a_norm.normalize(batch["action"])
    lcp_loss = self._compute_lcp_loss(norm_obs, norm_a)

    # L_total = L_RL + λ_gp * L_LCP
    info["actor_loss"] += self._lcp_weight * lcp_loss
    info["lcp_loss"] = lcp_loss  # 记录下来用于监控
    return info
```

对应配置：
```yaml
lcp_weight: 0.002   # λ_gp = 0.002，核心超参——太大动作太钝，太小没效果
```

### 5. 完整训练目标

LCP 并不修改 PPO 的优化框架，只是在 actor loss 后面追加一项：

$$\mathcal{L}_{total} = \underbrace{-L^{CLIP}(\theta)}_{\text{标准 PPO 策略损失}} + \underbrace{\lambda_{gp} \cdot \mathbb{E}\left[\|\nabla_o \log \pi_\theta(a \mid o)\|^2\right]}_{\text{LCP 平滑正则项}}$$

代码里对应：
```python
info["actor_loss"] += self._lcp_weight * lcp_loss
# actor_loss = L_RL + lcp_weight * L_LCP
```

### 6. LCP 超参数一览

```yaml
# data/agents/lcp_g1_agent.yaml
agent_name: "LCP"

model:
  actor_net: "fc_2layers_1024units"   # 与 PPO 相同网络结构
  actor_init_output_scale: 0.01        # 输出层初始化尺度（小初始输出）
  actor_std_type: "FIXED"              # 固定动作 std
  action_std: 0.05
  critic_net: "fc_2layers_1024units"

actor_optimizer:
  type: "SGD"                          # LCP 论文使用 SGD（不同于 PPO 默认 Adam）
  learning_rate: 1e-4                  
critic_optimizer:
  type: "SGD"
  learning_rate: 1e-4

# PPO 标准参数
discount: 0.99
td_lambda: 0.95
ppo_clip_ratio: 0.2
norm_adv_clip: 4.0
action_bound_weight: 10.0
action_entropy_weight: 0.0

# LCP 专属参数
lcp_weight: 0.002   # ← 关键超参，需根据任务/机器人调
```

> ⚠️ **注意**：LCP 论文使用 SGD（lr=1e-4）而非 Adam，这是为了让 GP 正则项和 PPO 策略项的优化节奏更匹配——SGD 比 Adam 更"线性"，对加在 loss 上的正则项响应更稳定。

### 7. 训练 / 测试命令

```bash
# 训练
python mimickit/run.py --mode train \
  --num_envs 4096 \
  --engine_config data/engines/isaac_gym_engine.yaml \
  --env_config data/envs/deepmimic_g1_env.yaml \
  --agent_config data/agents/lcp_g1_agent.yaml \
  --visualize false \
  --out_dir output/

# 测试
python mimickit/run.py --mode test \
  --num_envs 4 \
  --engine_config data/engines/isaac_gym_engine.yaml \
  --env_config data/envs/deepmimic_g1_env.yaml \
  --agent_config data/agents/lcp_g1_agent.yaml \
  --visualize true \
  --model_file data/models/lcp_g1_walk_model.pt
```

---

## 参考来源

- arXiv: https://arxiv.org/abs/2410.11825  
- Project Page: https://lipschitz-constrained-policy.github.io/  

> 注：本文内容基于论文与项目页整理；其中部分直觉解释、类比和工程解读属于我的归纳，不是论文原文直述。
