---
layout: paper
paper_order: 8
title: "Expressive Whole-Body Control for Humanoid Robots"
zhname: "ExBody：人形机器人的表达性全身控制"
category: "High Impact Selection"
subcategory: "Whole-Body Control Core"
demos: ["exbody"]
---

# Expressive Whole-Body Control for Humanoid Robots
**上半身照着人类动捕做表达动作，两条腿只负责跟住根部的速度、姿态和高度；用 CMU MoCap 的 780 段动作做重定向、随机初始化和奖励，一个策略就让 Unitree H1 真机边走边挥手、握手、跳舞**

> 📅 阅读日期: 2026-04-18（2026-10-12 第二版：对照 arXiv v2 的 LaTeX 源码与官方仓库逐条核查重写，改正十余处；新增十三幕讲解动画、三个交互演示和配音视频，H1 用我们照官方步骤重定向的 CMU 动作做 3D 渲染）
>
> 🏷️ 板块: 03 High Impact Selection · 全身控制核心 · 动作模仿 · Sim-to-Real
>
> ℹ️ 笔记对照 [arXiv 2402.16796 v2](https://arxiv.org/abs/2402.16796v2)（2024-03-06；读的是 arXiv 上的 LaTeX 源码：正文、表 I–V、图 1–9 与附录的表 VI–VIII、图 10）、[项目页](https://expressive-humanoid.github.io/) 和官方仓库 [chengxuxin/expressive-humanoid](https://github.com/chengxuxin/expressive-humanoid)（2026-10 的 `main`）。「🚶 具体实例」与动画里的 H1 动作，是我们照官方代码的重定向步骤，用 CMU 官网的 ASF/AMC 原始数据重算的，**不是论文的实验**；官方代码读的是同一批动作转成的 FBX，输入格式不同，见[例 2](#实例-2-重定向一帧)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2402.16796](https://arxiv.org/abs/2402.16796)（v1 2024-02-26，v2 2024-03-06） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2402.16796v2) |
| **项目页** | [expressive-humanoid.github.io](https://expressive-humanoid.github.io/) |
| **代码** | [chengxuxin/expressive-humanoid](https://github.com/chengxuxin/expressive-humanoid)（`legged_gym` + `rsl_rl` + ASE 的 `poselib`，Isaac Gym） |
| **会议** | RSS 2024 |
| **作者** | Xuxin Cheng\*、Yandong Ji\*、Junming Chen、Ruihan Yang、Ge Yang、Xiaolong Wang（\* 共同一作） |
| **机构** | UC San Diego |
| **平台** | Unitree H1（约 51.5 kg、约 1.8 m、19 个自由度：每条腿 5、躯干 1、每条手臂 4） |
| **数据** | CMU MoCap 的 780 段（3.7 小时）用于训练；真机另测 12 段 CMU 动作和 3 段 MDM 文字生成的动作（表 II） |

**一行定位**：第一个在**真实的人形机器人**上，用一个策略复现大量**多样**人类动作的学习方法（论文的说法）；它的关键取舍是**只模仿上半身**，下半身改成跟踪根部的运动目标，这个「上半身表达 + 下半身运动」的命令接口后来被 HOVER、ExBody2 等沿用和扩展。

---

## 🎯 一句话总结

> ExBody 训练一个目标条件策略，目标拆成两半：**表达目标**只含上半身——9 个关节角（躯干 1 + 两臂各 4）和两肩、两肘、两手 6 个关键点的 3D 位置；**根运动目标**是根部的线速度、横滚 / 俯仰 / 偏航和高度。腿的关节角**不进目标、也不进奖励**，怎么迈步由强化学习自己找。数据是 CMU MoCap 里按关键词挑出的 780 段（3.7 小时），把人的关节旋转直接映射到 H1 上（肩、髋按球关节取指数映射，其余取投影）；训练时用这些动作做随机状态初始化（RSI）和目标，策略只看真机拿得到的本体感受。在仿真里，它比「随机采样根运动目标」「全身跟踪」「加 AMP 判别器」都更会跟速度；在真机上，14 个动作的平均横滚 / 俯仰晃动 0.051 rad，加 AMP 的版本是 0.087 rad。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十三幕动画：ExBody 全流程](#exbody-explainer-anim) —— 约 208 秒串完「图形学的角色为什么上不了真机 → 上半身照着做、腿只跟速度 → 策略看得见什么 → 从 CMU 挑出 780 段 → 人的数据自带分布 → 重定向：直接抄关节角 → 从数据里抽起点 → 五项跟踪奖励 → 正则：脚要抬、动作别抖 → 跟得怎么样 → 随机命令与全身跟踪 → 加上 AMP 会怎样 → 真机与局限」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#exbody-video) —— 同样十三幕，加中文配音与字幕，竖屏，可下载
> [重定向浏览](#demo-retarget) —— 四段 CMU 动作逐帧看：人的骨架、重定向后的 H1、右肩的四元数 → 轴角 → 三个电机角
> [奖励计算器](#demo-reward) —— 拖五个误差，看表 III 的五项跟踪奖励各拿多少分，以及官方代码的提前终止线
> [表 IV 与表 V](#demo-table) —— 六种设定在「数据采样 / 随机采样」两种目标下的四个指标，以及真机 14 个动作的晃动

> 🚶 [具体实例](#实例-环境设定)用一段 CMU 的「Wave Hello」（`141_16`）从头走一遍：表 II 的数据账、重定向一帧（四元数 → 轴角 → 指数映射 → 三个电机角）、观测和网络的维度、根运动目标、一帧奖励、PD 力矩与随机化，最后读表 IV 和表 V。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **ExBody** | Expressive Whole-Body Control | 本文方法名；表 I 里还留着早期的名字「Mimic WBC」 |
| **WBC** | Whole-Body Control | 全身控制：手臂、躯干、腿一起协调 |
| **DoF** | Degrees of Freedom | 自由度；H1 有 19 个电机，PHC 的仿真人有 69 个 |
| **CMU MoCap** | Carnegie Mellon University Motion Capture Database | 卡内基梅隆大学的公开动捕库；本文从里面挑了 780 段 |
| **RSI** | Reference State Initialization | 参考状态初始化：重置时把机器人摆到参考动作的某一帧（DeepMimic 提出；论文小节标题写作 Guiding State Initialization） |
| **AMP** | Adversarial Motion Priors | 对抗动作先验：判别器打分「像不像数据集里的动作」，这里当基线 |
| **MDM** | Motion Diffusion Model | 文字生成人体动作的扩散模型；真机测试里用它生成拳击、拥抱、握手 |
| **PD** | Proportional-Derivative | 关节的比例—微分控制器：$\tau = k_p(q^\ast - q) - k_d\dot q$ |
| **ROA** | Regularized Online Adaptation | 用历史本体感受估计特权信息隐变量的训练方法；官方代码里有，论文没写 |
| **MEL / MELV / MERP / MEK** | Mean Episode Length / Linear Velocity / Roll-Pitch / Key body | 表 IV 的四个指标：平均每局长度，以及每局累计的速度、横滚俯仰、关键点跟踪奖励 |

---

## 🎬 十三幕动画：ExBody 全流程 {#exbody-explainer-anim}

<div class="paper-demo" data-demo="exbody-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#exbody-video}

<div class="paper-demo" data-demo="exbody-video" data-src="media/exbody_explainer_video.mp4" data-poster="media/exbody_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/exbody_explainer_video.mp4" download="ExBody_讲解视频.mp4">下载 mp4（13.0 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 2、6、7 幕和第 1、3、11 幕里的 H1，是我们照官方步骤重定向的 CMU 动作（`141_16` 挥手、`104_41` 僵尸走、`141_22` 击掌、`08_07` 大步走），和三个交互演示、下文「🚶 具体实例」是同一组数字；表格和第 4、5、10–13 幕的图来自论文。H1 的 3D 外形：材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，读它仓库里的 `unitree_h1/h1.xml`（MuJoCo Menagerie 的 H1 模型），按重定向出的 19 个关节角用正交相机逐帧离线渲染，关键点按同一个相机投影叠在上面。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    Q["能不能让人形机器人在真实世界里<br/>做出像人一样丰富的动作？"] --> G["图形学：物理角色早就能模仿大量动捕<br/>PHC 11000 段、ASE 187 段"]
    G --> W1["自由度差太多<br/>SMPL 仿真人 69 个 vs H1 19 个"]
    G --> W2["力矩 / 增益真机给不起<br/>论文：比现有硬件大一个数量级"]
    G --> W3["观测里有特权信息<br/>每个刚体的线速度、关键点世界坐标"]
    W1 --> ANS["ExBody：不要求一模一样<br/>上半身模仿，腿只跟根运动"]
    W2 --> ANS
    W3 --> ANS
    ANS --> R["一个策略、只看本体感受<br/>Unitree H1 真机边走边做动作"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style ANS fill:#e8f8e8,stroke:#27ae60
</div>

### 表达性：常见控制目标描述不了的那部分动作

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么「走得稳」不等于「像人」</summary>

论文开篇的观察：给四足、人形做全身控制，通常是优化一个具体目标——身体速度、朝向、步态。这样学出来的动作往往**单调、没有个性**，那常常是为了让优化或学习更容易而加的约束带来的副产品。而人和动物的真实动作丰富、多样，能表达意图和情绪：动作空间里有一大块，是「身体速度、朝向、步态」这类常见目标描述不了的。

ExBody 想要的是：一个人形机器人控制器，在**表达力和丰富程度**上能和人的动作相比，并且能直接部署到真机上。它的做法是把图形学社区的大规模动捕数据，接进仿真里的深度强化学习。

</details>

### 图形学的方法为什么搬不到真机上（表 I）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：自由度、增益、特权观测三道坎，以及表 I 的对比</summary>

图形学里的物理角色动画（PHC、ASE 等）在仿真里看起来又自然又会反应，论文指出两点让它们**不能直接搬上真机**：

1. **力矩 / 增益**：这些角色常用的执行器增益，「比现有硬件可行的大一个数量级」（论文写的是约 60 kg/m 量级，单位照原文）。
2. **自由度**：动捕数据和角色模型的自由度比机器人多得多——PHC 的 SMPL 仿真人有 69 个自由度（23 个球关节，每个 3 个），Unitree H1 只有 19 个。

相关工作一节又补了第三点：它们的观测里有**真机拿不到的特权信息**（世界坐标、各刚体的速度等）。

表 I（论文把自己的方法写成「Mimic WBC (Ours)」，是早期的名字）：

| 指标 | ExBody | PHC | ASE |
|---|---|---|---|
| 自由度 | 19 | 69 | 37 |
| 动作段数 | 780 | 11000 | 187 |
| 动作总时长（小时） | 3.7 | 40 | 0.5 |
| 真机 | ✓ | ✗ | ✗ |
| 单个网络 | ✓ | ✗（逐步加网络） | ✓ |
| 观测线速度 | ✗ | ✓（每个刚体） | ✓（只根部） |
| 观测关键点位置 | ✗ | ✓ | ✓ |
| 观测机器人高度 | ✗ | ✗ | ✓ |

</details>

### ExBody 的回答：不要求一模一样

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上半身模仿、腿只跟根运动；用大数据做初始化和目标分布</summary>

论文的关键想法原话是「**不**去和参考动作一模一样」：

- 训练时**鼓励上半身模仿**多样的人类动作，求表达力；
- **放松两条腿的模仿**：腿的奖励改成稳稳地跟住参考动作给出的**根运动命令**，而不是逐个关节角对齐；
- 在高度随机化的地形上训练，既方便 sim2real，也让策略不只是「复读」给定动作：使用者可以让机器人以不同速度、往不同方向走，同时上半身复现参考动作。

数据用 CMU MoCap（约 780 段），平台是 Unitree H1。论文的结论是：丰富的上半身动作和多样的移动速度，本身就是对训练数据的扩充，能给训练提供有效引导；放松腿部约束比加更多模仿约束（全身跟踪、AMP）效果更好、更稳。

</details>

---

## 🔧 方法详解（第 II–III 节）

<div class="mermaid">
flowchart TB
    CMU["CMU MoCap<br/>关键词筛选 → 780 段 / 3.7 h（表 II）"] --> RT["重定向到 H1<br/>14 个关节一一对应<br/>球关节 → 指数映射 θa；1 自由度 → 投影"]
    MDM["也可以来自扩散模型（MDM）<br/>或视频估姿"] -.-> RT
    RT --> CLIP["H1 的参考动作库"]
    CLIP --> GE["表达目标 g^e（只上半身）<br/>9 个关节角 + 6 个关键点（18 维）"]
    CLIP --> GM["根运动目标 g^m<br/>线速度 v、横滚 / 俯仰 / 偏航、高度 h"]
    JOY["部署时：摇杆"] -.-> GM
    CLIP --> RSI["随机状态初始化（RSI）<br/>重置时摆到某一帧"]
    GE --> PI["ExBody 策略（单个网络）"]
    GM --> PI
    PROP["本体感受 s_t<br/>角速度、横滚俯仰、Δ偏航、关节位置 / 速度、上一步动作"] --> PI
    PI --> PD["19 维 PD 目标角 → 力矩"]
    PD --> SIM["Isaac Gym · PPO · 4096 个环境<br/>奖励：表 III + 正则表 VI"]
    SIM --> REAL["Unitree H1 真机"]
    RSI --> SIM

    style GE fill:#e8f8e8,stroke:#27ae60
    style GM fill:#fdebd0,stroke:#e67e22
    style REAL fill:#e8f4fd,stroke:#1f78b4
</div>

### 问题形式化：目标拆成两半（第 II 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：命令条件的行走控制 G^m，再扩展成 G = G^e × G^m，并把下半身从 G^e 里拿掉</summary>

把人形运动控制看成学一个**目标条件策略** $\pi: \mathcal{G}\times\mathcal{S}\to\mathcal{A}$：$\mathcal{G}$ 描述想要的行为，$\mathcal{S}$ 是观测，$\mathcal{A}$ 是动作。论文默认观测、动作由 H1 的设计决定，但方法应能推广到电机数不同的类似身体。

**命令条件的行走控制。** 根运动目标空间

$$
\mathcal{G}^m = \langle \mathbf{v},\ rpy,\ h \rangle ,
$$

$\mathbf{v}\in\mathbb{R}^3$ 是根部线速度，$rpy\in\mathbb{R}^3$ 是根部的横滚、俯仰、偏航，$h$ 是根部高度。

**ExBody。** 把动作里「根部位姿和速度描述不了」的部分加进来：$\mathcal{G}=\mathcal{G}^e\times\mathcal{G}^m$，表达目标 $\mathbf{g}^e$ 包括期望的关节角和身体若干 3D 关键点。论文实际解的是一个**放松的问题**：把下半身的关节和关键点**从 $\mathcal{G}^e$ 里拿掉**——机器人和人的身体构造不同，把动捕里下半身的特征也塞进来，会过度约束问题，学出脆弱、表现差的策略。于是

$$
\mathcal{G}^e = \langle \mathbf{q},\ \mathbf{p} \rangle,\qquad \mathbf{q}\in\mathbb{R}^9,\ \ \mathbf{p}\in\mathbb{R}^{18},
$$

$\mathbf{q}$ 是上半身 9 个电机的关节角（代码里是躯干 1 个 + 每条手臂 4 个），$\mathbf{p}$ 是两肩、两肘、两手 6 个关键点的 3D 位置。ExBody 的目标：同时跟住**整个身体的**根运动目标 $\mathbf{g}^m$ 和**上半身的**表达目标 $\mathbf{g}^e$。

</details>

### 观测与动作：只用真机拿得到的量

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：s_t 里有什么、没有什么；19 维 PD 目标；官方代码的观测排布</summary>

论文的本体感受观测：

$$
s_t = [\,\omega_t,\ r_t,\ p_t,\ \Delta y,\ q_t,\ \dot q_t,\ \mathbf{a}_{t-1}\,]
$$

- $\omega_t$：根部角速度；$r_t, p_t$：横滚、俯仰（IMU 给得出）；
- $\Delta y = y_t - y$：当前偏航与期望偏航之差——把全局量换成局部量，部署时可以直接给；
- $q_t, \dot q_t$：19 个关节的位置与速度；$\mathbf{a} _ {t-1}$：上一步动作。

策略**看不到**当前线速度 $\mathbf{v}$、绝对高度 $h$ 和当前偏航 $y_t$——对真机来说这些是特权信息（表 I 的最后三行）。动作 $\mathbf{a}_t\in\mathbb{R}^{19}$ 是关节 PD 控制器的目标位置，PD 按各关节的 $k_p^i$、$k_d^i$ 算力矩。

**官方代码的具体排布**（`legged_gym/envs/h1/h1_mimic.py`、`h1_mimic_config.py`；论文没写这么细）：

- 本体感受 66 维：角速度 3 + 横滚俯仰 2 + $\sin\Delta y$、$\cos\Delta y$ 2 + 关节位置 19 + 关节速度 19 + 上一步动作 19 + 2 维脚接触（代码里恒为 $-0.5$，等于没用）。
- 参考（demo）36 维：上半身 9 个关节角 + 参考在根坐标系下的线速度 3、角速度 3 + 横滚俯仰 2 + 根高度 1 + 6 个关键点在根坐标系下的位置 18。**取的是 0.1 s 之后的那一帧**（`interval_demo_steps = 0.1`、`_next_demo_obs_buf`）。注意：参考的线速度和根高度作为**目标**进了观测，策略看不到的是机器人**自己**的线速度和高度。
- 另有过去 4 步本体感受压成的 16 维特征，以及 ROA 式的特权隐变量：仿真里用 43 维特权量（质量与质心 4、摩擦 1、每个关节 $k_p$ / $k_d$ 的强度系数各 19）编码成 20 维，同时训练一个读**过去 10 步本体感受**的历史编码器去逼近它；部署时只用历史编码器。论文没提这一套，它来自同一作者的 Extreme Parkour 代码。
- 策略主干：MLP $[512, 256, 128]$，ELU；控制频率 50 Hz（仿真步长 5 ms × 4）；动作缩放 0.25，目标角 = 默认角 + 0.25·a。

</details>

### 数据：从 CMU MoCap 挑出 780 段（第 III-A 节、附录 A）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：关键词筛选、表 II 的类别与时长、真机测试集；代码里 1043 → 780</summary>

只取 CMU MoCap 的一部分：去掉和他人有身体接触、搬重物、在崎岖地形上的动作——机器人做不了有大量环境交互的动作。筛选是半自动的，按动作描述里的关键词（附录 A）：

- **保留**：walk、navigate、basketball、dance、punch、fight、push、pull、throw、catch、crawl、wave、high five、hug、drink、wash、signal、balance、strech（原文拼写）、leg、bend、squat、traffic、high-five、low-five；
- **排除**：ladder、suitcase、uneven、terrain、stair、stairway、stairwell、clean、box、climb、backflip、handstand、sit、hang。

表 II（训练部分）：

| 类别 | 段数 | 时长（秒） |
|---|---|---|
| Walk | 546 | 9076.6 |
| Dance | 78 | 1552.3 |
| Basketball | 36 | 766.1 |
| Punch | 20 | 800.0 |
| Others | 100 | 1188.0 |
| **合计** | **780** | **13383.0（3.72 h）** |

真机测试另有 12 段 CMU 动作：Punch 18.9 s、Wave Hello 5.0 s、Mummy Walk 22.5 s、Zombie Walk 13.0 s、Walk Exaggerated Stride 2.5 s、High Five 3.3 s、Basketball Signals 32.6 s、Adjust Hair 9.6 s、Drinking from Bottle 15.2 s、Direct Traffic 39.3 s、Hand Signal 32.2 s、Russian Dance 8.2 s，合计 202.3 s（表里「Total」一行写的是 11 段，但列了 12 行，时长加起来正是 202.3 s，应是笔误）；以及 3 段 MDM 生成的 Boxing、Hug、Shake Hands，各 4.0 s。

**代码里**：`poselib/data/configs/motions_autogen_all.yaml` 是按关键词筛出的 **1043** 段，训练默认用的 `motions_autogen_all_no_run_jump.yaml` 是其中 **780** 段；删掉的 263 段，描述里都带 run 或 jump（论文的关键词表里没写这一步）。我们核对过：真机测试的 Wave Hello 就是 `141_16`（60 fps 共 299 帧 = 4.98 s）、Zombie Walk 是 `104_41`（120 fps 共 1558 帧 = 12.98 s），时长和表 II 对得上。

</details>

### 人的数据自带分布（图 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每秒取一个点、1338 个点；速度偏前、横滚俯仰像栗子、高度集中、转向平衡</summary>

论文把所有训练动作每隔 1 秒取一个点（共 1338 个点），画出根运动目标的分布（图 3；偏航在世界坐标系里没意义，所以画偏航角速度）：

- **速度**（图 3a）：前进、后退、侧移都有，偏向往前走，左右侧移对称；
- **横滚 / 俯仰**（图 3b）：一个「栗子形」——横滚很小（人一般不侧倾），俯仰偏向前弯而不是后仰；俯仰越大，横滚的分布越窄；
- **根高度**（图 3c）：窄窄地集中在标称高度附近；
- **偏航角速度**（图 3d）：左转右转都有，比较平衡。

和 Fu 等人（Deep Whole-Body Control）的做法对比：那边在球坐标里随机撒目标点，再检查点有没有在地下、有没有和机器人自碰撞；人的数据**天然不违反**这类约束，重定向后偶有自碰撞，强化学习的碰撞惩罚会处理。论文在实验里说明，这个来自数据的先验分布比人工设计的采样空间更有利于学习（见表 IV 的 Random Sample）。

</details>

### 重定向：直接把关节旋转抄到 H1 上（第 III-B 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：肩、髋当球关节；四元数 → 轴角 → 指数映射 m = θa；1 自由度关节取投影</summary>

H1 和人的形态差别很大，论文的做法很直接：**把人的局部关节旋转映射到机器人骨架上**。H1 总质量约 51.5 kg、高约 1.8 m、19 个自由度；肩和髋各有 3 个互相垂直的转动电机，等效一个球关节（和动捕数据里的球关节对应），所以重定向时把这 3 个电机当 1 个球关节。之后把球关节的单位四元数 $\mathbf{q}_m^i=(q_x,q_y,q_z,q_w)$ 用**指数映射**换回三个电机角 $\mathbf{m}=[m_1,m_2,m_3]$。先转成轴角：

$$
\theta = 2\arccos(q_w),\qquad
\mathbf{a} = \frac{1}{\sqrt{1-q_w^2}}\,(q_x,\ q_y,\ q_z)^\top ,
$$

角度很小、$\sqrt{1-q_w^2}$ 接近 0 时，取最后一个轴；然后

$$
\mathbf{m} = \theta\,\mathbf{a} .
$$

$\mathbf{m}$ 的三个分量就是那三个电机的角度。1 自由度的关节（肘、躯干、膝、踝）取转角在该关节转轴上的投影。论文说：重定向后虽然因为硬件约束丢了一些自由度，重要的表达还在（图 4）；图 4 的说明也提到，有些重定向结果的**下半身动作很夸张**——这正是 ExBody 不跟腿的原因。

**官方代码的具体做法**（`ASE/ase/poselib/retarget_motion_h1_all.py` → poselib 的 `retarget_to_by_tpose`，再到 `ASE/ase/utils/motion_lib.py`）：

1. CMU 的 FBX 与 H1 各有一个 T 字姿势；14 个关节一一对应（Hips→pelvis、LeftUpLeg→髋、LeftLeg→膝、LeftFoot→踝、Spine1→躯干、LeftArm→肩、LeftForeArm→肘、LeftHand→手，右侧同理），每个关节相对 T 字姿势的**全局旋转**原样搬到 H1 的 T 字姿势上；坐标从 Y 朝上转到 Z 朝上，根部平移乘 0.056444 换成米，最后把整段里最低的身体点放到地面。
2. 3 自由度关节：`quat_to_exp_map` 得到 $(m_x, m_y, m_z)$，按转轴分给横滚（x）、俯仰（y）、偏航（z）三个电机。
3. 1 自由度关节：`motion_lib` 里一律取**绕 y 轴**的投影（注释写「假设关节总是沿 y 轴」）。肘、膝、踝确实绕 y 轴转；H1 的躯干关节绕 z 轴转，代码给它的参考却是绕 y 的分量——这是我们读代码看到的出入，论文写的是「投影到对应关节的转轴」。
4. `retarget_motion_h1_all.py` 里定义了一个 `project_joints`（把肘、膝的扭转挪到肩、髋上），但**没有被调用**。

**指数映射的代价**（我们的分析与复现）：$\mathbf{m}=\theta\mathbf{a}$ 是一个旋转向量，H1 的肩却是三个**串联**的电机（先俯仰、再横滚、再偏航），把向量的三个分量直接当三个电机角，转得小时差不多，转得大就会偏。我们重算的 Wave Hello 里（按 20 fps 取的 99 帧），右臂在躯干坐标系下的方向，和「完整旋转摆到 H1 骨架上」相比，上臂平均差 9.7°（最多 17.5°），前臂平均差 32.2°（最多 50.1°）——人的前臂朝上挥手，H1 的前臂多半朝前（论文图 9 的拳击也能看到这种差别）；手臂平举向前的僵尸走更明显，上臂平均差 41.9°。论文的局限一节也承认直接映射关节角会丢信息、偏离原动作。

</details>

<div class="paper-demo" data-demo="exbody-retarget" id="demo-retarget"><p class="demo-fallback">（本节含交互演示：重定向浏览，需要启用 JavaScript）</p></div>

### 从数据里抽起点：RSI（第 III-C 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每个环境重置时摆到动作库的随机一帧；代码里每个环境固定一段动作</summary>

在 Isaac Gym 里大规模并行训练。每个环境初始化或重置时，从动作数据集里**随机抽一个状态** $\mathbf{g}=[\mathbf{g}^e,\mathbf{g}^m]$，把机器人直接设成这个状态。有了图 3 那样多样的目标分布和对应的跟踪奖励，ExBody 能做出多样的根运动和手臂表达，同时靠下半身保持平衡（下半身没有模仿奖励）：向前 / 向后 / 侧向走、转向、改变根高度、调整横滚和俯仰。

**代码里**：`init_motion_buffers` 把环境按编号轮流分给动作（`motion_ids = arange(num_envs) % num_motions`），之后只重抽**起始时刻**（`sample_time`），不换动作——6144 个环境分 780 段，每段 7–8 个环境；关节位置、速度和根部的位姿、速度都设成那一帧的参考值。动作播到结尾就重置（`motion_end`），参考时间在一局里会从片尾绕回片头。

</details>

### 奖励：五项跟踪（第 III-D 节、表 III）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：表达目标两项、根运动目标三项；代码用的是向量的 L2 范数；提前终止</summary>

每一步的奖励 = 表达目标 + 根运动目标的跟踪项 + 正则项（来自 legged_gym）。跟踪项（表 III）：

| 项 | 表达式 | 权重 |
|---|---|---|
| 关节角（表达目标） | $\exp(-0.7\,\lvert\mathbf{q} _ {\mathrm{ref}}-\mathbf{q}\rvert)$ | 3.0 |
| 关键点位置（表达目标） | $\exp(-\lvert\mathbf{p} _ {\mathrm{ref}}-\mathbf{p}\rvert)$ | 2.0 |
| 线速度（根运动目标） | $\exp(-4.0\,\lvert\mathbf{v} _ {\mathrm{ref}}-\mathbf{v}\rvert)$ | 6.0 |
| 横滚与俯仰（根运动目标） | $\exp(-\lvert\boldsymbol{\Omega}^{\phi\theta} _ {\mathrm{ref}}-\boldsymbol{\Omega}^{\phi\theta}\rvert)$ | 1.0 |
| 偏航（根运动目标） | $\exp(-\lvert\Delta y\rvert)$ | 1.0 |

$\mathbf{q} _ {\mathrm{ref}}\in\mathbb{R}^9$、$\mathbf{p} _ {\mathrm{ref}}\in\mathbb{R}^{18}$ 是上半身的参考关节角和关键点。五项满分合计 13，线速度一项就占 6——跟住速度是最重要的事。**腿的关节角不进奖励。**

**代码里**（`h1_mimic.py` 的 `_reward_tracking_*`）：

- $\lvert\cdot\rvert$ 都是**整个向量的 L2 范数**（`torch.norm(..., dim=1)`），不是逐分量求和；
- 关键点在世界坐标里比：参考关键点（根坐标系）按**参考的**根朝向转出去，放在**机器人当前的**水平位置、参考的根高度上，再和机器人的实际关键点比；
- 线速度比的是机器人根坐标系下的 3 维速度；
- 另有存活奖励 +1，总奖励每步截到不低于 $-0.5$；
- **提前终止**：躯干碰地，或关节角那一项低于 0.1——也就是 $\lvert\Delta\mathbf{q}\rvert > \ln 10/0.7 \approx 3.29$ rad。

</details>

<div class="paper-demo" data-demo="exbody-reward" id="demo-reward"><p class="demo-fallback">（本节含交互演示：奖励计算器，需要启用 JavaScript）</p></div>

### 正则：脚要抬起来，动作别抖（附录 B、表 VI）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五项脚部正则 + 九项其他；论文表与代码的两处对调</summary>

附录 B 的正则项（表 VI）。作者特意加了**脚部**的几项，保证脚抬得够高、落地时接触力合理：

| 项 | 表达式 | 权重 |
|---|---|---|
| 抬脚高度 | $\max(\lvert h _ {\mathrm{feet}}\rvert-0.2,\,0)$ | 2.0 |
| 滞空时间 | $\sum_i t_i^{\mathrm{air}}\cdot\mathbb{1} _ {\text{新触地}}$ | 10.0 |
| 拖脚 | $\sum_i \lvert v_i^{\mathrm{foot}}\rvert \cdot \lnot\mathbb{1} _ {\text{新触地}}$ | −0.1 |
| 接触力 | $\mathbb{1}\{\lvert F_i^z\rvert\ge F _ {\mathrm{th}}\}\,(\lvert F_i^z\rvert-F _ {\mathrm{th}})$ | −3e−3 |
| 绊脚 | $\mathbb{1}\{\exists i,\ \lvert F_i^{xy}\rvert>4\lvert F_i^z\rvert\}$ | −2.0 |
| 关节加速度 | $\lvert\ddot{\mathbf{q}}\rvert^2$ | −3e−7 |
| 动作变化率 | $\lvert\mathbf{a} _ {t-1}-\mathbf{a}_t\rvert$ | −0.1 |
| 能量 | 论文写 $\lvert\ddot{\mathbf{q}}\rvert^2$（代码是 $\lVert\tau\odot\dot q\rVert$） | −1e−3 |
| 碰撞 | $\mathbb{1} _ {\text{碰撞}}$ | −0.1 |
| 关节超限 | $\mathbb{1} _ {q_i>q _ {\max}\ \lor\ q_i<q _ {\min}}$ | −10.0 |
| 下半身偏离默认 | $\lvert\mathbf{q}^{\mathrm{low}} _ {\mathrm{default}}-\mathbf{q}^{\mathrm{low}}\rvert^2$ | −10.0 |
| 竖直线速度 | $v_z^2$ | −1.0 |
| 水平角速度 | $\lvert\boldsymbol\omega _ {xy}\rvert^2$ | −0.4 |
| 重力投影 | $\lvert\mathbf{g} _ {xy}\rvert^2$ | −2.0 |

**和代码的出入**（`h1_mimic_config.py` 的 `rewards.scales` 与 `h1_mimic.py`）：

- **碰撞 / 下半身偏离默认的权重对调了**：代码里碰撞是 −10（只罚肩、肘、髋的接触），下半身偏离默认（前 11 个关节，含躯干）是 −0.1；
- 抬脚高度在代码里是 $\min(\lVert h _ {\mathrm{feet}}\rVert-0.2,\,0)\times 2$，罚的是**脚太低**，和表里的 max 方向相反；
- 滞空时间代码里减了 0.5 s（`feet_air_time - 0.5`），接触力阈值是两脚竖直力范数超过 500 N；
- 关节超限在代码里罚的是超出量（不是指示函数），软限位取 0.95。

</details>

### 训练设置（附录 B、表 VII 与代码）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PPO 超参数；代码里的地形、随机化、动作延迟与 PD 增益</summary>

论文表 VII 的 PPO 超参数：折扣 0.99、GAE 0.95、每次采样 21 步、每次 5 轮、每轮 4 个小批量、熵系数 0.01、价值损失系数 1.0、裁剪 0.2、奖励归一化、学习率 1e−3、**4096 个环境**、Adam。AMP 基线的判别器：隐藏层 [1024, 512]、回放缓冲 100 万、示范缓冲 20 万、每次取 512 条示范、学习批量 4096、学习率 1e−4、奖励系数 4.0、梯度惩罚 1.0（表 VIII）。

**官方代码的默认配置**（和论文略有出入，可能是论文之后的版本）：6144 个环境、每次采样 24 步、学习率 2e−4（自适应调度）、熵系数 0.005；其余：

- **地形**：一种「parkour_flat」平地，叠加幅度 0–4 cm 的随机起伏（`height = [0, 0.04]`）——论文说「高度随机化的有挑战的地形」，代码默认就是这个；
- **随机化**：摩擦 0.6–2.0、躯干加质量 −1 到 +5 kg、质心偏移 ±7 cm、每 8 s 推一把（水平最大 0.3 m/s）、每个关节 $k_p$ / $k_d$ 各乘 0.8–1.2、每 10 s 把重力各分量随机加 ±0.1 m/s²；
- **动作延迟**：从头训练时开启，第 8000 次迭代后加一步（20 ms）延迟（README：「Delay is added after 8k iters」）；
- **观测噪声**：关节位置 0.005、关节速度 0.075、角速度 0.15、横滚俯仰 0.1（配置值再乘 0.5 的噪声尺度）；
- **PD 增益**：髋、膝 200，踝 40，躯干 300，肩、肘 40（N·m/rad）；阻尼：髋偏航 / 横滚 5、髋俯仰与膝 10、踝 2、躯干 6、肩肘 2；踝的动作截到 ±0.5。

</details>

---

## 📊 实验结果（第 IV 节）

论文用三个问题组织实验：ExBody 跟 $\mathbf{g}^m$、$\mathbf{g}^e$ 跟得怎么样？大数据集怎样帮助探索和鲁棒性？图形学里最好的物理角色方法为什么在真机上不好用、为什么需要 ExBody？

基线：**ExBody + AMP**（加一项 AMP 奖励，让策略的状态转移像重定向数据）、**ExBody + AMP NoReg**（再去掉正则项，看 AMP 能不能替代正则）、**Random Sample**（在图 5 的范围里随机采样根运动目标）、**No RSI**（从默认姿态初始化）、**Full Body Tracking**（髋、膝、踝的关节角和关键点也跟）。

### 根运动跟得怎么样（图 5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：策略复现了数据的分布；随机命令也覆盖得了，所以能用摇杆</summary>

图 5(a)：用数据集里的根运动目标驱动策略，记录策略实际的状态分布（4096 个环境 × 20 个点，手臂轨迹随机取自训练集）——和图 3 的数据分布很像。也就是说，策略学会了把几个直观的根运动命令映射成合适的电机命令。

但训练用的是动作片段，目标在时间上是相关的（机器人在「回放一段有意义的轨迹」）。随机采样的命令呢？如果也能跟，就能直接用摇杆控制真机，不用去找对的动作片段。图 5(b)：随机采样根运动目标（红色阴影是采样范围：$v_x\in[-2,2]$、$v_y\in[-1,1]$ m/s，横滚、俯仰 $\in[-0.5,0.5]$ rad，高度 $\in[0.9,1.1]$ m 左右；偏航角速度不采样，因为策略看的是偏航差、不直接跟角速度），策略的速度分布覆盖了大部分采样区域，比训练集还大；横滚俯仰的分布比采样范围小，论文推测是机器人自身的限制（上身太重等）。论文没给跟踪误差的数字，理由是「没有对照就没有意义，直接看分布更直观」。

</details>

### 上半身跟得怎么样（图 6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：10000 个手部位置，数据和策略几乎一样</summary>

图 6：相对机器人采 10000 个手的位置，左边是重定向后的数据集，右边是 ExBody 策略的轨迹——两团点几乎一样。数据里的上半身动作本身就是一个自然的学习分布。

</details>

### 表 IV：大数据、RSI、不跟腿

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六种设定 × 两种目标采样 × 四个指标；No RSI 学会「自杀」；随机采样会跪下；全身跟踪全面变差</summary>

表 IV（4096 个环境、各采 10000 条轨迹，报告每局平均；「数据采样」= 根运动目标取自重定向动作，「随机采样」= 在图 3 的范围里均匀采样）：

| 设定 | MEL ↑ | MELV ↑ | MERP ↑ | MEK ↑ | MEL | MELV | MERP | MEK |
|---|---|---|---|---|---|---|---|---|
| | **数据采样** | | | | **随机采样** | | | |
| ExBody（本文） | 16.87 | **318.67** | 754.92 | **659.78** | 13.51 | **132.14** | 523.79 | 483.67 |
| ExBody + AMP | **17.28** | 205.60 | **765.85** | 635.51 | 15.59 | 95.11 | 583.82 | **544.59** |
| ExBody + AMP NoReg | 16.16 | 87.83 | 714.74 | 561.56 | 15.40 | 36.76 | 584.23 | 515.53 |
| No RSI | 0.23 | 0.63 | 10.09 | 7.25 | 0.22 | 0.10 | 7.41 | 7.15 |
| Random Sample | 16.50 | 181.85 | 704.73 | 326.66 | 16.37 | 38.51 | **586.83** | 324.10 |
| Full Body Tracking | 13.28 | 246.11 | 584.40 | 397.25 | 10.76 | 76.46 | 407.88 | 284.69 |

- **ExBody 的速度跟踪（MELV）最好**，论文认为主要归功于 RSI：把机器人初始化在各种状态上，鼓励探索。
- **No RSI**：还没发现能拿正奖励的状态，就先学会了「尽快自杀」来躲负奖励——平均一局 0.23（ExBody 16.87）。
- **Random Sample**：对所有目标都**跪下**（图 8），钻了环境的空子；完全放弃 $\mathbf{g}^m$，只顾 $\mathbf{g}^e$。它在随机采样（它自己的训练分布）下的 MEL 还更高，说明跪着更「稳」。论文推测数据集给的 $\mathcal{G}^m$ 分布更利于学习：比如很多动作是先原地站着、再慢慢走起来，天然形成一个课程。
- **Full Body Tracking**：四个指标全面下降；下半身出现很多瑕疵——参考里只迈一步，机器人为了稳住要迈好几步。

</details>

<div class="paper-demo" data-demo="exbody-table" id="demo-table"><p class="demo-fallback">（本节含交互演示：表 IV 与表 V，需要启用 JavaScript）</p></div>

### 加一个 AMP 判别器会怎样（图 7、表 V）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：AMP 换来 MEL / MERP，代价是速度跟踪；直腿走、脚抬不高；真机晃得更厉害</summary>

对抗方法（PHC、PULSE、AMP 用在四足上）可以作为本文之上的正则。表 IV 里 ExBody + AMP 的 MEL、MERP 更好，但和 Random Sample 一样，**代价是线速度跟踪**（MELV 205.60 对 318.67）。

AMP 学出的步态膝盖弯得少、抬脚不够，脚尖不水平、走路容易绊（图 7：真机击掌，上排是 ExBody，膝盖更弯、抬脚更高；下排是 ExBody + AMP，直腿走）。这些特点不利于 sim2real。ExBody + AMP NoReg 想用 AMP 代替表 VI 的正则，结果更差：高频抖动，没法上真机——对这么复杂的系统，单靠 AMP 奖励不够。

真机上测了一系列动作，记录 10 秒内横滚、俯仰的平均绝对值作为稳定性的指标（表 V，单位 rad）：

| 动作 | ExBody | ExBody + AMP |
|---|---|---|
| Walk, Exaggerated Stride | 0.054 | 0.087 |
| Zombie Walk | 0.072 | 0.11 |
| Wave Hello | 0.062 | 0.095 |
| Walk Happily | 0.037 | 0.074 |
| Punch | 0.052 | 0.055 |
| Direct Traffic, Wave, Point | 0.037 | 0.094 |
| Highfive | 0.04 | 0.084 |
| Basketball Signals | 0.045 | 0.081 |
| Adjust Hair Walk | 0.042 | 0.09 |
| Russian Dance | 0.063 | 0.1 |
| Mummy Walk | 0.064 | 0.086 |
| Boxing（MDM） | 0.075 | 0.068 |
| Hug（MDM） | 0.037 | 0.086 |
| Shake Hand（MDM） | 0.036 | 0.099 |
| **平均** | **0.051** | **0.087** |

14 个动作里 13 个是 ExBody 晃得更少，只有 MDM 生成的 Boxing 例外。ExBody 的步态是稳定的踏步，AMP 那一版想用直腿原地站，结果明显绊脚、脚部有瑕疵。

</details>

### 真机：跳舞、握手、文字生成的动作（图 1、图 9、图 10）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：回放 CMU 动作；MDM 文字生成后离线重定向；步频自己和上半身同步</summary>

真机上回放 CMU 动作（图 1、图 7）：和人跳舞、拥抱、击掌、握手；在碎石、木屑路、斜坡、草地、路沿上用不同风格走（僵尸走、夸张大步、挥手）；挥手打开感应门。文字生成：用预训练的 MDM（基于 Transformer）按提示生成人体动作，每个提示生成 10 次、人工挑最合理的一条，再离线重定向到 H1（图 9：「a man mimics boxing punches」）；附录图 10 还有「moving arm out to shake hands」「a person crosses their arms and then puts them back to their side」两条。

值得注意：训练时没有预设步态，回放动作时**机器人自己学会了让踏步频率和上半身姿态同步**。

</details>

### 局限（第 VI 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：直接映射关节角会丢信息；摔倒会弄坏零件</summary>

- 重定向时把动捕的关节角**直接映射**到自由度更少的 H1 上，会丢信息，重定向后的动作可能偏离原动作；论文建议换成高保真的重定向方法（后来的 GMR、OmniRetarget 等正是在做这件事）。
- 人形机器人又重又贵，摔一次可能坏零件；需要可靠的保护和恢复系统，减少维修。

</details>

---

## 🚶 具体实例：用一段「Wave Hello」从头走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（9 节）：环境设定 / 例 1 数据账 / 例 2 重定向一帧 / 例 3 观测与网络维度 / 例 4 根运动目标 / 例 5 一帧奖励 / 例 6 PD 力矩与随机化 / 例 7 读表 IV / 例 8 读表 V</summary>

<h3 id="实例-环境设定">环境设定</h3>

- 动作：CMU MoCap 的 `141_16`「Wave Hello」（60 fps、299 帧、4.98 s，表 II 的真机测试动作之一），另外三段 `104_41` 僵尸走、`141_22` 击掌、`08_07` 夸张大步走用在动画和演示里。
- 重定向：我们照官方代码的步骤（poselib 的 `retarget_to_by_tpose` + `motion_lib` 的指数映射与投影）用 numpy 重写，输入换成 CMU 官网的 ASF/AMC 原始文件；官方读的是同一批动作转成的 FBX（cgspeed BVH 的骨架），我们按 BVH 的约定把 ASF 骨骼的旋转对到 FBX 的关节上（LeftUpLeg ↔ lfemur、Spine1 ↔ thorax、LeftArm ↔ lhumerus……），T 字姿势照抄仓库里的 `cmu_fbx_tpose.npy` 与 `h1_tpose.npy`。输入格式不同，所以不保证和官方的 `.npy` 逐位相同。
- H1 模型：MuJoCo Menagerie 的 `unitree_h1/h1.xml`（Robot Retarget Online 仓库里那份），关键点按代码取肩俯仰连杆、肘连杆，手取肘连杆坐标系里 $(0.3, 0, 0)$ 的点（URDF 里的 `hand_keypoint_link`）。
- 为了画面统一，每段动作绕竖轴转一下、平移一下，让第一帧朝 $+x$、站在原点；观测都是局部量，这一步不改变任何目标。

<h3 id="实例-1-数据账">例 1：数据账</h3>

表 II 的训练集：$546 + 78 + 36 + 20 + 100 = 780$ 段；$9076.6 + 1552.3 + 766.1 + 800.0 + 1188.0 = 13383.0$ s $= 3.72$ h（表 I 写 3.7）。走路一类占 $546/780 = 70\%$ 的段数、$9076.6/13383.0 = 68\%$ 的时长——这份数据本身就偏向「边走边做动作」。平均每段 $13383.0/780 = 17.2$ s。

代码：关键词筛出 1043 段，训练列表去掉描述里带 run / jump 的 263 段，剩 $1043-263 = 780$ 段。6144 个环境轮流分到 780 段上：$6144 = 7\times 780 + 684$，所以 684 段各有 8 个环境、96 段各有 7 个。

<h3 id="实例-2-重定向一帧">例 2：重定向一帧</h3>

取挥手第 0.5 s（第 30 帧）的右肩。重定向后，右肩相对躯干的局部四元数（xyzw，取 $w>0$）是

$$
\mathbf{q} = (-0.699,\ -0.124,\ 0.112,\ 0.696).
$$

1. 轴角：$\theta = 2\arccos(0.696) = 1.603$ rad（91.8°），$\sqrt{1-0.696^2}=0.718$，$\mathbf{a} = (-0.973,\ -0.173,\ 0.155)$。
2. 指数映射：$\mathbf{m}=\theta\mathbf{a} = (-1.559,\ -0.277,\ 0.249)$。
3. 分给三个电机：横滚 $m_x = -1.559$、俯仰 $m_y = -0.277$、偏航 $m_z = 0.249$（rad）。对照：H1 的 T 字姿势里右肩是绕 $x$ 转 $-90°$，$\mathbf{m}=(-1.571, 0, 0)$；这一帧手臂几乎是水平侧举，在挥手。
4. 右肘是 1 自由度：它的局部旋转转角 0.751 rad、转轴的 $y$ 分量 0.265，投影 $0.751\times 0.265 = 0.199$ rad。H1 的肘在 0 时是弯成直角、前臂朝前，所以这一帧前臂基本朝前——人在这一帧前臂是朝上的，这就是指数映射和投影丢掉的部分（这一帧右前臂方向差 41.4°，99 帧平均 32.2°）。

这一帧上半身 9 个目标角 $\mathbf{q} _ {\mathrm{ref}}$（rad，按代码的顺序：躯干、左肩俯仰 / 横滚 / 偏航、左肘、右肩俯仰 / 横滚 / 偏航、右肘）：

| 躯干 | 左俯仰 | 左横滚 | 左偏航 | 左肘 | 右俯仰 | 右横滚 | 右偏航 | 右肘 |
|---|---|---|---|---|---|---|---|---|
| −0.313 | 0.340 | 0.186 | −0.088 | 1.053 | −0.277 | −1.559 | 0.249 | 0.199 |

左肘 1.053 rad：左臂垂在身侧、前臂略向前弯（肘在 $\pi/2 = 1.571$ 时伸直）。其余各帧可以在[重定向浏览](#demo-retarget)里逐帧看。

6 个关键点在根坐标系里（m）：右肩 $(-0.043, -0.150, 0.430)$、右肘 $(-0.107, -0.535, 0.439)$、右手 $(0.170, -0.649, 0.440)$——三个点几乎一样高，右臂水平侧举、前臂朝前，和上面的数对得上。

<h3 id="实例-3-观测与网络维度">例 3：观测与网络维度（官方代码）</h3>

- 本体感受：$3 + 2 + 2 + 19\times 3 + 2 = 66$ 维；
- 参考：$9 + 3 + 3 + 2 + 1 + 6\times 3 = 36$ 维（0.1 s 之后那一帧）；
- 整个观测向量：过去 4 步本体感受 $4\times 66 = 264$ + 当前 66 + 参考 36 + 显式特权 3（代码里乘了 0） + 特权隐变量的输入 43 + 历史 $10\times 66 = 660$，共 $264+66+36+3+43+660 = 1072$ 维；
- 进主干 MLP 的：$66 + 36 + 16$（4 步特征）$+ 3 + 20$（隐变量）$= 141$ 维，主干 $[512, 256, 128]$，输出 19 维。

<h3 id="实例-4-根运动目标">例 4：根运动目标</h3>

僵尸走 `104_41` 第 3.0–7.5 s（重定向后 4.5 s 走了 1.84 m，平均前进速度 $0.40$ m/s，根高度平均 0.99 m）。取第 5.0 s：参考的根速度在根坐标系里是 $(0.341, -0.012, -0.069)$ m/s，横滚 0.065、俯仰 −0.109 rad，根高度 0.989 m。代码把这些（加上根角速度）放进 36 维参考里；奖励里线速度那一项拿的就是 $(0.341, -0.012, -0.069)$。偏航不直接给角度，给的是 $\sin(y_t - y)$、$\cos(y_t - y)$。

图 3(c) 的根高度集中在 0.95 m 左右，我们重算的挥手（0.975 m）、僵尸走（0.99 m）都落在这一带。

<h3 id="实例-5-一帧奖励">例 5：一帧奖励（假设的误差）</h3>

假设某一帧机器人跟得不完美：上半身 9 个关节角的误差向量长度 $\lvert\Delta\mathbf{q}\rvert = 0.30$ rad，18 维关键点误差 $\lvert\Delta\mathbf{p}\rvert = 0.10$ m，线速度误差 $0.10$ m/s，横滚俯仰误差 $0.05$ rad，偏航差 $0.10$ rad：

| 项 | 计算 | 得分 |
|---|---|---|
| 关节角 | $3\times e^{-0.7\times 0.30} = 3\times 0.811$ | 2.432 |
| 关键点 | $2\times e^{-0.10} = 2\times 0.905$ | 1.810 |
| 线速度 | $6\times e^{-4\times 0.10} = 6\times 0.670$ | 4.022 |
| 横滚俯仰 | $1\times e^{-0.05}$ | 0.951 |
| 偏航 | $1\times e^{-0.10}$ | 0.905 |
| **合计** | 满分 13（各项保留三位小数，相加 10.120；精确值 10.119） | **10.12** |

线速度那一项最「陡」：误差从 0.1 到 0.3 m/s，它从 4.02 掉到 $6e^{-1.2} = 1.81$，一下丢 2.2 分；同样的 0.2 增量放在关节角上只掉 $3(e^{-0.21}-e^{-0.35}) = 0.32$ 分。代码的提前终止：$3e^{-0.7\lvert\Delta\mathbf{q}\rvert}$ 里的指数项 $<0.1$，即 $\lvert\Delta\mathbf{q}\rvert > \ln 10/0.7 = 3.29$ rad。

<h3 id="实例-6-pd-力矩与随机化">例 6：PD 力矩与随机化（官方代码）</h3>

膝关节：默认角 0.8 rad，$k_p = 200$、$k_d = 10$，动作缩放 0.25。策略输出 $a = 0.4$ → 目标角 $0.8 + 0.25\times 0.4 = 0.9$ rad；若此刻 $q = 0.80$、$\dot q = 0.5$ rad/s，

$$
\tau = 200\times(0.9-0.80) - 10\times 0.5 = 15\ \text{N·m}.
$$

随机化把 $k_p$、$k_d$ 各乘一个 0.8–1.2 的系数：最弱 $0.8\times 20 - 1.2\times 5 = 10$ N·m，最强 $1.2\times 20 - 0.8\times 5 = 20$ N·m。策略看不到这些系数，只能从过去 10 步的本体感受里推（ROA 的历史编码器）。

<h3 id="实例-7-读表-iv">例 7：读表 IV</h3>

- 速度跟踪：ExBody 318.67，加 AMP 掉到 205.60（−35%），随机采样 181.85（−43%），全身跟踪 246.11（−23%），AMP NoReg 87.83（−72%）。
- 每局长度：No RSI 0.23 对 ExBody 16.87，差 73 倍。
- 关键点：全身跟踪 397.25 对 659.78（−40%）——多跟腿，连上半身都跟差了。
- 随机采样一列：Random Sample 的 MEL 16.37 比 ExBody 的 13.51 还高，MELV 却只有 38.51（ExBody 132.14）：跪着最「稳」，但不走。

<h3 id="实例-8-读表-v">例 8：读表 V</h3>

14 个动作的平均横滚俯仰：ExBody $0.051$ rad（约 2.9°），加 AMP $0.087$ rad（约 5.0°），多 71%。按表里 14 行的两位 / 三位小数自己算平均：ExBody $0.716/14 = 0.0511$，AMP $1.209/14 = 0.0864$——AMP 一列和论文的 0.087 差一点，我们推测是用没四舍五入的原始数据算的。ExBody 晃得最厉害的是 MDM 生成的 Boxing（0.075），也是唯一一个比 AMP 版本差的。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入</summary>

<h3 id="源码-目录">目录</h3>

```
expressive-humanoid/
├── ASE/ase/poselib/                 # 数据：FBX 导入、重定向（来自 NVIDIA ASE 的 poselib）
│   ├── fbx_importer_all.py          #   CMU FBX → npy（按 60 fps 采样）
│   ├── retarget_motion_h1_all.py    #   retarget_to_by_tpose → H1；project_joints 定义了但没调用
│   └── data/configs/                #   retarget_cmu_to_h1.json、motions_autogen_all(_no_run_jump).yaml
├── ASE/ase/utils/motion_lib.py      # 球关节 quat_to_exp_map、1 自由度绕 y 投影、插值取参考
├── legged_gym/legged_gym/envs/h1/
│   ├── h1_mimic_config.py           # 观测维度、奖励权重、PD、地形、随机化
│   ├── h1_mimic.py                  # 观测、参考（下一帧）、奖励、RSI、提前终止
│   └── h1_mimic_amp*.py             # AMP 基线
└── rsl_rl/rsl_rl/                   # ActorCriticMimic（历史编码器 / 特权编码器）、PPOMimic
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码 |
|---|---|
| 重定向：局部关节旋转映射 + 指数映射 | `retarget_to_by_tpose`（全局旋转相对 T 字姿势）+ `motion_lib._local_rotation_to_dof` |
| 1 自由度关节取对应转轴的投影 | 一律取绕 y 的分量（躯干实际绕 z） |
| $\mathcal{G}^e$：9 个关节角 + 18 维关键点 | `n_demo = 9 + 3 + 3 + 3 + 6*3`：另含参考的线速度、角速度、横滚俯仰、根高度，取 0.1 s 后一帧 |
| RSI：随机抽一个状态 | 每个环境固定一段动作，只重抽起始时刻 |
| 表 III 的 $\lvert\cdot\rvert$ | 向量 L2 范数；另有存活 +1、总奖励截到 ≥ −0.5 |
| 表 VI：碰撞 −0.1、下半身偏离 −10 | 碰撞 −10、下半身偏离 −0.1（对调） |
| 抬脚高度 $\max(\lvert h\rvert-0.2, 0)$ | $\min(\lVert h\rVert-0.2, 0)$，罚脚太低 |
| PPO：4096 环境、21 步、学习率 1e−3、熵 0.01 | 6144 环境、24 步、2e−4（自适应）、熵 0.005 |
| 观测只有本体感受 | 另有 ROA：43 维特权量 → 20 维隐变量，10 步历史编码器逼近它，部署只用历史 |
| 「高度随机化的地形」 | 平地 + 0–4 cm 随机起伏；随机化见上文「训练设置」 |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 数据：下载 CMU FBX → 导入 → 重定向 → 在仿真里生成关键点
cd ASE/ase/poselib
python fbx_importer_all.py
python retarget_motion_h1_all.py
cd ../../../legged_gym/legged_gym/scripts
python train.py debug --task h1_view --motion_name motions_debug.yaml --debug   # 训 1 次得个占位模型
python play.py debug --task h1_view --motion_name motions_autogen_all.yaml       # 生成 *_key_bodies.npy
# 训练与回放
python train.py 000-01-some_description --device cuda:0
python play.py 060-40 --delay --motion_name motions_debug.yaml                  # 官方预训练模型
python save_jit.py --exptid xxx-xx                                              # 导出部署用的 TorchScript
```

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 DeepMimic / AMP / PHC 与重定向，下启 H2O、HOVER、ExBody2</summary>

- **上承**：DeepMimic 的 RSI 与跟踪奖励、AMP 的对抗先验（这里当基线）、PHC / ASE 的大规模动作模仿（表 I 的对照对象）；四足上的命令条件行走与特权信息（Fu 等的 Deep Whole-Body Control、同一作者的 Extreme Parkour，代码底座就是它）。
- **同一条重定向线**：本文的「直接抄关节角」是最朴素的重定向，局限里自己承认会丢信息；后来的 [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) 用两阶段逆运动学，[OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) 再把交互也保住。
- **下启**：
  - [H2O](../H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html) / [OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)：同年的遥操作路线，命令换成人实时给的关键点；
  - [HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)：把 ExBody、H2O、OmniH2O 等各自的命令空间统一进一个带掩码的策略；
  - [ExBody2](../ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.html)：同一团队的续作，换了数据筛选和训练方式，追求更高的跟踪精度；
  - [HugWBC](../HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.html)：命令条件行走 + 上半身干预的另一种做法。
- **工程意义**：「上半身表达目标 + 下半身根运动目标」把「跟动作」和「走得稳」解耦成一个可以用摇杆接的接口，代码开源，是社区复现人形动作模仿的常用起点。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：ExBody 和「全身跟踪」的区别是什么？**
A：全身跟踪让髋、膝、踝的关节角和关键点也对齐参考；ExBody 只让上半身（9 个关节角 + 6 个关键点）对齐，腿只负责跟根部的速度、横滚俯仰、偏航和高度。表 IV 里全身跟踪四个指标全面变差：参考只迈一步时，机器人为了稳要迈好几步。

**Q2：上下半身是两个策略吗？**
A：不是。是一个网络、一个目标条件策略，目标里同时有 $\mathbf{g}^e$（上半身）和 $\mathbf{g}^m$（根运动）；「解耦」体现在目标和奖励的选择上：腿的关节角不进目标、不进奖励。

**Q3：重定向怎么处理自由度不匹配？**
A：H1 的肩、髋各有 3 个互相垂直的电机，当成球关节；人的关节旋转（相对 T 字姿势）直接搬过去，球关节的四元数转成轴角 $(\theta,\mathbf{a})$，指数映射 $\mathbf{m}=\theta\mathbf{a}$ 的三个分量直接当三个电机角；肘、躯干、膝、踝取转角在转轴上的投影。不是逆运动学；代价是转角大时会偏（我们的复现里前臂方向平均差约 32°）。

**Q4：为什么策略不看自己的线速度和高度？**
A：真机上这两样没有可靠的测量（是特权信息）。偏航也不看绝对值，看的是和目标偏航的差，部署时摇杆就能给。官方代码另用一个读过去 10 步本体感受的历史编码器，去逼近仿真里由质量、摩擦、电机强度编码出的隐变量。

**Q5：RSI 为什么这么重要？**
A：没有 RSI，所有环境都从默认姿态起步，策略还没找到拿正奖励的状态，就先学会尽快摔倒来躲负奖励：表 IV 里平均每局 0.23 对 16.87。从数据里抽起点，等于给了大量「已经在做动作」的开局，探索容易得多。

**Q6：为什么用数据里的根运动目标，而不是随机采样？**
A：随机采样的策略学会了跪下（图 8），放弃速度、只顾上半身；数据的目标分布天然不违反物理约束，而且很多片段是先站、再慢慢走起来，形成自然的课程。训练好的 ExBody 在随机命令下也能覆盖大部分范围（图 5b），所以部署时能直接用摇杆。

**Q7：加 AMP 判别器不是能让动作更像人吗？为什么反而不好？**
A：表 IV 里加 AMP 换来更长的 MEL 和更好的 MERP，但速度跟踪掉了 35%；步态变成直腿、抬脚不高，真机上 14 个动作的平均晃动从 0.051 rad 升到 0.087 rad（表 V）；去掉正则只靠 AMP 会高频抖动，上不了真机。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-04-18 · ExBody 的「表达性」具体是什么</summary>

不是关节跟得多准，而是三件事：

1. **行走时上半身能做有语义的动作**（挥手、指路、跳舞），而不是僵硬地摆臂；
2. **动作和步态自然配合**：论文观察到，训练时没有预设步态，机器人回放动作时会自己让步频和上半身姿态同步；
3. **可以直接用人类动捕或文字生成的动作驱动**，做内容的门槛低。

第二版补充：论文自己的定义是「常见控制目标（身体速度、朝向、步态）描述不了的那部分动作空间」；ExBody 选择用上半身的关节角和关键点去描述这一部分。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@inproceedings{cheng2024expressive,
  title     = {Expressive Whole-Body Control for Humanoid Robots},
  author    = {Cheng, Xuxin and Ji, Yandong and Chen, Junming and Yang, Ruihan and Yang, Ge and Wang, Xiaolong},
  booktitle = {Robotics: Science and Systems (RSS)},
  year      = {2024},
  note      = {arXiv:2402.16796}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

1. 指数映射把球关节的旋转向量直接当三个串联电机的角度，转得大时会偏；换成按 H1 真实电机顺序做欧拉分解，或者用逆运动学（GMR 的做法），表达目标会准多少？
2. 代码给躯干的参考取的是绕 y 的分量，而 H1 的躯干绕 z 转——这对上半身跟踪有多大影响？
3. 关键点奖励把参考关键点放在机器人当前的水平位置上比，只惩罚相对姿态；如果要让机器人走到参考的绝对位置（比如和人对舞时的站位），需要什么额外的目标？
4. 腿完全不跟参考，就做不了踢腿、单腿站这类「腿也是表达」的动作；ExBody2、HOVER 怎样在「跟腿」和「站稳」之间重新取舍？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- **结构**：旧版写「上层生成目标姿态、下层 RL 执行」「下半身策略 + 上半身策略联合训练」，实际是**一个**目标条件策略，上下半身的区别只在目标和奖励。
- **重定向**：旧版写成逆运动学 $\min\lVert FK _ {robot}(q) - FK _ {human}\rVert^2$，实际是直接搬关节旋转 + 指数映射 / 投影；人的自由度也不是「约 73」，论文对比的是 SMPL 仿真人的 69 个。
- **数据**：是 CMU MoCap 的 780 段（3.7 h），不是笼统的「AMASS」；补上关键词、表 II、真机测试集与代码里的 1043 → 780。
- **观测**：旧版的观测表是猜的（基座姿态 ~6、上半身参考 ~9、速度指令 2–3），换成论文的 $s_t$ 和代码的 66 + 36 维排布。
- **奖励**：换成表 III、表 VI 的原式和权重；补上代码与论文的出入（L2 范数、碰撞与下半身偏离的权重对调、抬脚高度方向、存活奖励、提前终止）。
- **训练**：论文没写训练时长，旧版的「数小时收敛」删去；补上表 VII 与代码默认值的差别、地形、随机化、动作延迟、PD 增益。
- **实验**：补上表 IV、表 V 的全部数字和五个基线，图 5–9 的读法。
- **其他**：旧版面试题里提到的 VIGOR、HERO 无从核实，删去；附录里与 ExBody2 / HOVER 的「精度中 / 高 / 最高」对比没有出处，删去。

</details>
