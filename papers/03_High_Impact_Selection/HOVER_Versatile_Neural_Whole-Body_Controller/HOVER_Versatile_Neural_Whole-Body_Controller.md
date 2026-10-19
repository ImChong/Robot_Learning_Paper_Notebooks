---
layout: paper
title: "HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots"
category: "高影响力精选 High Impact Selection"
subcategory: "Whole-Body Control Core"
zhname: "HOVER：人形机器人的多模式通用神经全身控制器"
demos: ["hover"]
---

# HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots
**把 ExBody、HumanPlus、H2O、OmniH2O 各自的接口都看成「全身运动学模仿」的一个子集：命令统一成上下身两块、三种目标（关键点位置、关节角、根部），先用 PPO 训一个什么都看、什么都跟的特权教师，再用 DAgger 蒸馏出一个学生，学生看到的命令每个回合都被模式掩码和稀疏掩码随机遮掉一部分；同一套权重在每种模式下都比专门训的专才好，也比用同样掩码从头强化学习的多模式策略好，真机上还能边走边切换模式**

> 📅 阅读日期: 2026-05-14（2026-10-16 第二版：对照 arXiv v2 的 LaTeX 源码和官方仓库逐条核查重写，改正旧版几处说法；新增十六幕讲解动画、三个交互演示和配音视频）
>
> 🏷️ 板块: 03 High Impact Selection · 全身控制核心 · 多模式控制 · 教师—学生蒸馏 · 掩码
>
> ℹ️ 笔记对照 [arXiv 2410.21229](https://arxiv.org/abs/2410.21229) 的 v2（2025-03-06；读的是 arXiv 上的 LaTeX 源码：正文、表 I–V、图 1–6；和 v1 的数字完全一样，差别见[附录 D](#d-arxiv-v1-和-v2-的差别)）、[项目页](https://hover-versatile-humanoid.github.io/)和官方仓库 [NVlabs/HOVER](https://github.com/NVlabs/HOVER)（2026-10 的 `main`，最后一次提交 2025-07-29）。**注意**：官方仓库是 Isaac Lab 上的重写版，论文的实验是在 Isaac Gym 里做的（README 第一段说原版的实现请看项目页），代码和论文有几处不一样，下文单独列出。「🚶 具体实例」与动画里的 H1 动作是我们用 PHC 仓库（H2O / HOVER 作者之一维护）的重定向脚本，以 SMPL 在 AMASS 的 CMU `07_01` 上**重算的一段走路**，不是论文的数据，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2410.21229](https://arxiv.org/abs/2410.21229)（v1 2024-10-28，v2 2025-03-06） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2410.21229) |
| **项目主页** | [hover-versatile-humanoid.github.io](https://hover-versatile-humanoid.github.io/)（仿真与真机视频） |
| **代码** | [NVlabs/HOVER](https://github.com/NVlabs/HOVER)（Isaac Lab 2.0 扩展，Apache-2.0；含教师 / 学生训练、MuJoCo sim-to-sim、Unitree H1 部署）；[Isaac Lab 的 HOVER 部署教程](https://isaac-sim.github.io/IsaacLab/v2.1.0/source/policy_deployment/00_hover/hover_policy.html) |
| **会议** | ICRA 2025 |
| **作者** | Tairan He\*、Wenli Xiao\*、Toru Lin、Zhengyi Luo、Zhenjia Xu、Zhenyu Jiang、Jan Kautz、Changliu Liu、Guanya Shi、Xiaolong Wang、Linxi "Jim" Fan†、Yuke Zhu†（\* 共同一作，† NVIDIA GEAR 团队负责人） |
| **机构** | NVIDIA、CMU、UC Berkeley、UT Austin、UC San Diego |
| **平台** | Unitree H1（19 个自由度，约 51.5 kg、1.8 m）；仿真 Isaac Gym |
| **数据** | AMASS 重定向到 H1，沿用 H2O 的流程和仿真筛选，得到 $\hat Q$；真机测 20 段站立动作 |
| **关键词** | Humanoid whole-body control, multi-mode control, command masking, policy distillation, DAgger |

**一行定位**：同一个团队前面做了 H2O、OmniH2O，ExBody、HumanPlus 又各有一套接口——要走路就跟根部速度，要做表情动作就跟上身关节角，要遥操作就跟几个关键点的位置。HOVER 把这些接口放进**一个命令空间**，用掩码决定这一次跟哪几维，一个策略管所有模式。

---

## 🎯 一句话总结

> HOVER 把 ExBody、HumanPlus、H2O、OmniH2O 各自的接口都看成**全身运动学模仿**的子集：先训一个什么都跟的特权教师，再用模式掩码和稀疏掩码蒸馏出一个学生，同一套权重换掩码就换模式。论文的核心看法是：导航、移动操作、桌面操作这些任务各要一种控制模式，但底下都是同一件事。具体做法是先训一个**特权教师**：用 PPO 在 AMASS 重定向到 H1 的大规模动作上，看所有刚体的位置、旋转、速度和下一帧参考的差，把全身都跟上（仿真成功率 99.3%）。再定义一个统一的**命令空间**：上半身、下半身两块，每块有**关键点位置、关节角、根部**（速度、高度、横滚 / 俯仰 / 偏航）三种目标；学生看到的命令先乘**模式掩码**（上下身各挑一种），再乘**稀疏掩码**（在挑中的模式里再随机关掉一部分维度），掩码在每个回合开始时随机、整个回合不变；用 **DAgger** 让学生在自己走到的状态上模仿教师的动作。结果：在 ExBody、HumanPlus、H2O、OmniH2O 四种前人的模式下，**同一个**学生在 12 项指标里各有 7–8 项显著好于专门为这种模式训的专才（表 III）；在只跟左手、右手、双手、头四种模式下 16 项赢 14 项（表 IV）；用同样掩码从头强化学习的多模式策略 8 种模式 × 4 项指标 32 项全输（图 4）；真机 20 段站立动作 12 项赢 11 项（表 V），走路时从 ExBody 模式切到 H2O 模式、从 HumanPlus 切到 OmniH2O 也站得住（图 6）。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十六幕动画：HOVER 全流程](#hover-explainer-anim) —— 约 256 秒串完「每篇一套接口 → 共同的底座：全身模仿 → 一个命令空间：三种目标 → 前人的接口都是子集（表 I）→ 数据：AMASS 重定向到 H1 → 特权教师：全都看、全都跟 → 学生的本体感受：25 步历史 → 模式掩码：上下身各挑一种 → 稀疏掩码：再关掉一部分 → DAgger：学生开车，老师标答案 → 表 III：和四个专才比 → 表 IV：只跟一只手或头 → 图 4：从头强化学习不行 → 真机：表 V 与图 5 → 边走边切模式 → 局限与代码」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#hover-video) —— 同样十六幕，加中文配音与字幕，竖屏，可下载
> [掩码浏览器](#demo-mask) —— 一段走路逐帧看：选一种模式、打开稀疏掩码，H1 身上哪些点、哪些关节、根部哪几维还在；95 维命令里哪些被乘成 0，学生的 1782 维观测怎么拼
> [雷达图：图 3 与图 4](#demo-radar) —— 每种模式下 HOVER 对专才、对多模式强化学习，按论文的缩放公式画出来
> [表 III、表 IV、表 V](#demo-tables) —— 仿真里对四个专才、四种额外模式，真机上的三种模式；每项谁显著更好

> 🚶 [具体实例](#实例-环境设定)用一段 H1 走路从头算一遍：49 位掩码怎么排、四种模式各开哪几位、第 1.33 s 的 95 维命令（假设机器人落后 0.2 s）、套上 ExBody 掩码后剩下什么、稀疏掩码有多少种可能、学生观测 1782 维怎么来，最后读表 III–V 和图 4。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **HOVER** | Humanoid Versatile Controller | 本文：人形的通用（多模式）控制器 |
| **WBC** | Whole-Body Control | 全身控制：腿、躯干、手臂一起协调 |
| **ExBody / HumanPlus / H2O / OmniH2O** | — | 四篇前人工作，各用一种接口：上身关节角 + 根部 / 全身关节角 + 根部 / 8 个关键点 / 头和双手 3 个点 |
| **MHC** | Multi-Modal Humanoid Controller | Dugar 等人 2024 年的多模式人形控制器，只支持关节角和根部（表 I，v2 新加的一行） |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 大规模人体动捕数据集 |
| **SMPL** | Skinned Multi-Person Linear model | 参数化人体模型，重定向时用来拟合 H1 的身材 |
| **PPO** | Proximal Policy Optimization | 训教师用的强化学习算法 |
| **DAgger** | Dataset Aggregation | 让学生自己开、在学生走到的状态上问老师怎么做，再做监督学习 |
| **MPJPE** | Mean Per-Joint Position Error | 平均每个刚体的位置误差（mm）；$E _ {\text{g-mpjpe}}$ 是全局的，$E _ {\text{mpjpe}}$ 先减去根部 |
| **RPY** | Roll / Pitch / Yaw | 横滚、俯仰、偏航；根部朝向的三个角 |
| **DR** | Domain Randomization | 域随机化：仿真里随机摩擦、质量、延迟等，好上真机 |

---

## 🎬 十六幕动画：HOVER 全流程 {#hover-explainer-anim}

<div class="paper-demo" data-demo="hover-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#hover-video}

<div class="paper-demo" data-demo="hover-video" data-src="media/hover_explainer_video.mp4" data-poster="media/hover_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/hover_explainer_video.mp4" download="HOVER_讲解视频.mp4">下载 mp4（16.8 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 1–5、8、9 幕里的 H1，动作是我们用 PHC 仓库的 `fit_smpl_shape.py` 与 `fit_smpl_motion.py`，以 SMPL 在 AMASS 的 CMU `07_01` 上重算的一段走路（第 0–2.6 s，15 fps 共 40 帧，循环播放时只放第 17–32 帧这一个步态周期；HOVER 指定的 human2humanoid 脚本跑出来脚会一帧一跳，做法与数字见下文「🚶 具体实例」的环境设定），身上 23 个点由官方仓库的 MJCF 做正运动学算出，和第一个交互演示、「🚶 具体实例」是同一组数字；第 5 幕左边是同一段的 SMPL 人体：先是形状参数为 0 的平均身材，再换成拟合后的身材，最后露出 SMPL 的 24 个关节叠到 H1 上。H1 的 3D 外形：材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，按关节角用正交相机逐帧离线渲染，SMPL 人体用同一台相机渲染，点和箭头按同一个相机投影叠在上面。表格和第 2、3、11、13、14 幕的图来自论文；第 6、11、12 幕的仿真画面和第 14、15 幕的真机画面剪自[项目页](https://hover-versatile-humanoid.github.io/)的视频（大量机器人跟踪 AMASS、头 / H2O / OmniH2O 三种模式、左手 / 右手 / 双手三种模式、根部速度切到根部俯仰、走路时从 ExBody 切到 H2O、转身后退时从 HumanPlus 切到 OmniH2O、Vision Pro 遥操作时只跟双手或只跟左手），画面上的模式标签是我们按视频里的字幕时刻标的，只做讲解引用。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    T1["导航：跟根部速度"] --> P["每篇一种接口<br/>一种接口训一个策略、调一套奖励"]
    T2["表情动作：跟上身关节角（ExBody）"] --> P
    T3["遥操作：跟几个关键点（H2O / OmniH2O）"] --> P
    T4["预训练的操作策略：输出关节角或末端位置"] --> P
    P --> X1["换任务就得重训"]
    P --> X2["一个控制器只会一种模式<br/>走着走着要换成精细操作，换不了"]
    X1 --> Q["能不能一个控制器支持所有模式？"]
    X2 --> Q
    Q --> A["HOVER：它们都是全身运动学模仿的子集<br/>特权教师 + 掩码蒸馏出一个学生"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style A fill:#e8f8e8,stroke:#27ae60
</div>

### 每篇一套接口（第 I 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：根部速度管走路、关节角管表情动作、关键点管遥操作；每种接口要自己的接口和奖励设计，一个控制器只能做一种模式</summary>

人形可以做双臂操作、双足行走、敏捷的全身控制，但每篇工作都按自己的任务和场景选了一种全身控制的写法：

- **根部速度跟踪**（真实世界行走一类）：支持移动；
- **关节角跟踪**（ExBody、HumanPlus）：做表情丰富的动作；
- **选定关键点的运动学跟踪**（H2O、OmniH2O）：支持遥操作。

它们的目标其实都是动作跟踪，但各要一套**专门的控制器接口和奖励设计**——开发重复、费时，得到的控制器也只会一种模式。论文举的例子：在不平的地面上用根部速度跟踪行走的机器人，很难无缝切换到需要关节角或末端跟踪的精细双臂操作。

还有一点：很多预训练的操作策略（Open X-Embodiment、OpenVLA）本身就在不同的配置空间里输出，比如关节角或末端位置。这也说明需要一个**统一的底层人形控制器**，能适配各种控制模式的配置。

</details>

### 共同的底座：全身运动学模仿

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：各种模式的接口不同，但底下的目标都是稳、像人的动作；先学全身模仿，再把技能分给各种模式</summary>

论文的问题：既然这些模式都跑在同一个硬件上，能不能有一个统一的控制器支持所有模式、兼得各自的长处？难点是每种模式的命令空间不同，直接合并不现实。但控制接口虽然不同，底下的运动目标往往一致：**稳定、像人**。

HOVER 的关键看法（摘要原话的意思）：**全身运动学模仿**可以当作所有这些任务的公共抽象，提供通用的运动技能，再拿去学多种模式的全身控制。具体做法：

1. 训一个**特权动作模仿器**（oracle），模仿 AMASS 里的大规模人体动作，覆盖各种动作和控制目标。论文的说法是：人的动作自带适应性和效率，以人的动作为基础训练，策略能更好地理解平衡、协调和动作控制，这些先验可以在多种模式之间复用。
2. 用**策略蒸馏**把这些技能从教师转进一个能处理多种模式的「通才」学生。

论文还假设：通才比专才好，是因为它利用了**跨模式共享的物理知识**（保持平衡、像人的动作、精确的肢体控制）；单一模式的策略容易**过拟合**自己的奖励结构和训练环境。这是论文的假设，没有单独的实验去验证这个解释。

</details>

### 三条贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个支持多种模式的统一神经控制器；蒸馏让技能跨模式共享、比单独训的好；仿真和真机都能无缝切换模式</summary>

1. HOVER：一个支持多种控制模式的统一人形全身神经控制器；
2. 通过策略蒸馏，HOVER 让运动技能跨模式共享，表现**超过**单独为每种模式训的策略；
3. 仿真和真机实验都表明 HOVER 能**无缝切换**模式，多模式控制比其他基线好。

引言说给 19 个自由度的人形支持「超过 15 种」对真实应用有用的模式，覆盖前人工作用过的大部分模式。

</details>

---

## 🔧 方法详解（第 II 节）

<div class="mermaid">
flowchart TB
    subgraph S1["① 数据（第 II-C 节）"]
        A["AMASS"] --> B["沿用 H2O：FK 算 H1 关键点 → 拟合 SMPL 身材<br/>→ 梯度下降重定向 → 仿真筛掉做不到的"] --> Q["数据集 Q̂"]
    end
    subgraph S2["② 特权教师（第 II-D 节，PPO）"]
        Q --> T["π oracle：刚体位置 / 旋转 / 速度 / 角速度 / 上一步动作<br/>+ 所有刚体与下一帧参考的差 + 参考本身"]
        RW["奖励（表 II）：惩罚 4 + 正则 12 + 任务 8"] --> T
        DR["域随机化：同 OmniH2O"] --> T
    end
    subgraph S3["③ 学生（第 II-E 节，DAgger）"]
        C["统一命令空间：上身 / 下身 ×<br/>关键点位置 · 关节角 · 根部"] --> M["模式掩码 → 稀疏掩码<br/>每个回合开始随机、整回合不变"]
        M --> S["π student：25 步本体感受历史 + 掩码后的命令"]
        T -->|"在学生走到的状态上问教师"| S
    end
    S --> D["部署：同一套权重<br/>换掩码就换模式"]

    style T fill:#fdebd0,stroke:#e67e22
    style S fill:#e8f8e8,stroke:#27ae60
    style C fill:#e8f4fd,stroke:#1f78b4
</div>

### 问题设定（第 II-A 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目标条件强化学习；状态 = 本体感受 + 目标；动作是 19 个关节的目标角度，交给 PD 控制器</summary>

写成**目标条件强化学习**：策略 $\pi$ 被训练去跟踪实时的人体动作。状态 $s_t$ 由本体感受 $s^{\text p}_t$ 和目标 $s^{\text g}_t$ 组成，目标是运动目标的统一表示（下一节）；奖励 $r_t=\mathcal R(s^{\text p}_t,s^{\text g}_t)$；动作 $a_t\in\mathbb R^{19}$ 是 19 个关节的目标角度，交给 PD 控制器；用 PPO 最大化 $\mathbb E\left[\sum _ {t=1}^T\gamma^{t-1}r_t\right]$。整个问题就是**命令跟踪**：每一步都让人形跟上想要的命令。

官方代码（Isaac Lab 版）：仿真步长 0.005 s、每 4 步出一次动作（策略 50 Hz），目标角 = 默认角 + 0.25 × 动作；PD 增益 髋偏航 / 横滚 150、髋俯仰 200、膝 200、踝 20、躯干 200、手臂 40（阻尼 5 / 5 / 5 / 4 / 5 / 10）。论文没给这些数。

</details>

### 命令空间：上下身 × 三种目标（第 II-B 节、图 1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：通用性与原子性两条标准；上半身、下半身两块；关键点位置、关节角、根部三种模式；一个 one-hot 掩码选哪些维度生效</summary>

腿足机器人常用根部速度或位置当命令，但只跟根部会限制人形做全身移动操作。前人工作的各种模式各有长处短处，都只适合一部分任务。HOVER 要一个能覆盖各种场景的命令空间，提了两条标准：

- **通用性（Generality）**：覆盖现有的大部分配置，让一个通用控制器替代专门的控制器，又不损失性能；还要足够丰富，能接真实世界的各种设备——手柄、键盘、动捕、外骨骼、VR 头显（图 1 顶上那一排）。
- **原子性（Atomicity）**：由互相独立的维度组成，可以任意组合出各种模式。

于是命令空间分**上半身、下半身**两块控制区域，有三种控制模式：

| 模式 | 跟踪什么 | 图 1 里的颜色 |
|---|---|---|
| **运动学位置跟踪**（Kinematic Position Tracking） | 机器人上选定刚体点的 3D 位置 | 蓝 |
| **局部关节角跟踪**（Local Joint Angle Tracking） | 每个电机的目标角度 | 黄 |
| **根部跟踪**（Root Tracking） | 根部速度、高度、朝向（横滚、俯仰、偏航） | 紫 |

用一个 **one-hot 掩码向量**指定命令空间里哪些分量生效。图 1 中间一块画的就是这个：亮着的格子是正在跟的命令，右边的虚线框是掩码，决定打开哪几块。相关工作一节补充：局部关节角跟踪可以看成丢掉了全局位置信息的运动学模仿；根部速度跟踪只管移动；同一种运动学跟踪里，选哪些关键点（稀疏程度）也因工作而异。

**官方代码**（`neural_wbc/core/mask.py`、`student_observations.py`）把命令排成 **95 维** = 23 个刚体 × 3（位置）+ 19 个关节角 + 7 个根部量；掩码 **49 位** = 23 + 19 + 7（每个刚体一位，不是每个坐标一位）。23 个刚体是 20 个连杆 + 左手 + 右手 + 头，手是肘连杆往前 0.3 m 的一点，头是骨盆往上 0.75 m 的一点（和 OmniH2O 一样）；7 个根部量是根部线速度 $x,y,z$（在参考的根部坐标系里）、横滚、俯仰、偏航之差、根部高度。具体每一项怎么算见[例 2](#实例-2-第-133-s-的-95-维命令)。

</details>

### 前人的接口都是子集（表 I）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：ExBody、H2O、OmniH2O、HumanPlus、MHC 各占命令空间的哪几格；只有 HOVER 六格全有、还能任意组合</summary>

| 控制器 | 多模式 | 上身 · 关键点 | 上身 · 关节角 | 下身 · 关键点 | 下身 · 关节角 | 下身 · 根部 |
|---|---|---|---|---|---|---|
| ExBody | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ |
| H2O | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| OmniH2O | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| HumanPlus | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ |
| MHC | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ |
| **HOVER** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

表注：HOVER 用一个统一的命令空间覆盖前人的所有命令设计，并能跟踪命令元素的**任意子集**。MHC 那一行是 v2 新加的；它也是多模式的，但只有关节角和根部，不支持任意子集（相关工作一节）。

**官方代码**把四种前人的模式写成 `DISTILL_MASK_MODES_ALL`（`neural_wbc_env_cfg_h1.py`），按正则匹配掩码元素的名字：

| 模式 | 开哪些位 | 位数 |
|---|---|---|
| ExBody | 上身 9 个关节角（躯干、两肩各 3、两肘）+ 根部 7 | 16 |
| HumanPlus | 全身 19 个关节角 + 根部 7 | 26 |
| H2O | 两肩各 3 个连杆、两肘、两手、两踝，共 12 个关键点 | 12 |
| OmniH2O | 头、两手 3 个关键点 | 3 |

论文说 H2O 跟 8 个点（双肩、双肘、双手、双踝），代码的正则 `.*shoulder.*link.*` 会把每侧肩部的俯仰、横滚、偏航三个连杆都匹配上，所以是 12 个点（肩俯仰、肩横滚两个连杆原点只差几厘米，肩偏航连杆在上臂中段）。

</details>

### 数据：AMASS 重定向到 H1（第 II-C 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：正运动学算 H1 的关键点；拟合 SMPL 让它长成 H1 的样子；梯度下降对齐关键点；沿用 H2O 的仿真筛选</summary>

三步：

1. 用正运动学算出人形的关键点位置；
2. 优化 SMPL 参数，让 SMPL 的身材对上这些关键点（相当于先把人改成 H1 的身材）；
3. 用梯度下降对齐拟合后的 SMPL 和人形之间对应的关键点，把 AMASS 重定向到 H1。

然后沿用 H2O 的「sim-to-data」：用特权模仿器在仿真里筛掉人形做不到的动作，得到数据集 $\hat Q$。每一步在 [H2O 笔记](../H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html)里有详细的说明；我们在 AMASS 的 CMU `07_01` 上先跑了 human2humanoid 的这两个脚本：重定向逐帧独立、拟合出的整体缩放也没用上，膝盖一再顶到反关节的限位、髋偏航在两头的限位之间来回翻，H1 的脚一帧一跳；于是换成 H2O / HOVER 作者之一 Zhengyi Luo 后来在 PHC 仓库里维护的同一套脚本（用上缩放、关节角加正则、每步在时间上平滑、根部一起优化，见[「🚶 具体实例」的环境设定](#实例-环境设定)）。两版的形状拟合都只看关节点的距离、没有正则，拟合出的形状参数都有一维到了几十（human2humanoid 版 −42.5、PHC 版 −37.2），关节点对上了，SMPL 的网格却已经不像人（动画第 5 幕）。官方仓库的 `retarget_h1.sh` 调的是 human2humanoid 的脚本；README 说因为 AMASS 的许可，不提供重定向好的数据，整个 AMASS 在 32 核机器上重定向最多要跑 4 天（up to 4 days）。

</details>

### 特权教师：全都看、全都跟（第 II-D 节、表 II）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：本体感受是所有刚体的位置、旋转、速度、角速度和上一步动作；目标是参考与当前之差加参考本身；三层 MLP；奖励 24 项；域随机化同 OmniH2O</summary>

教师 $\pi^{\text{oracle}}(a_t\mid s^{\text{p-oracle}}_t,s^{\text{g-oracle}}_t)$：

- 本体感受 $s^{\text{p-oracle}}_t\triangleq[p_t,\theta_t,\dot p_t,\omega_t,a _ {t-1}]$：人形所有刚体的位置、朝向、线速度、角速度，加上一步的动作；
- 目标 $s^{\text{g-oracle}}_t\triangleq[\hat\theta _ {t+1}\ominus\theta_t,\ \hat p _ {t+1}-p_t,\ \hat v _ {t+1}-v_t,\ \hat\omega _ {t+1}-\omega_t,\ \hat\theta_t,\ \hat p_t]$：所有刚体的参考姿态，和参考与当前状态的一帧之差；
- 网络和 OmniH2O 一样：三层 MLP，$[512, 256, 128]$。

**奖励**（表 II）分三类，共 24 项：

| 类别 | 项与权重 |
|---|---|
| 惩罚（4） | 力矩越限 −2、关节位置越限 −125、终止 −250、关节速度越限 −50 |
| 正则（12） | 关节加速度 −1.1e-5、关节速度 −4e-3、下身动作变化率 −3、上身动作变化率 −0.625、力矩 −1e-4、脚的朝向 −62.5、腾空时间 +1000、足底接触力 −0.75、绊脚 −1250、打滑 −75、双脚腾空 −200、每一步的最高抬脚 −3000 |
| 任务（8） | 关节位置 32、关节速度 16、刚体位置 80、刚体旋转 20、刚体速度 8、刚体角速度 8、**根部速度 100**、**根部旋转 20** |

和 OmniH2O 的教师比，任务奖励多了**根部速度**和**根部旋转**两项（论文没说为什么；我们的理解是 HOVER 的命令空间里有根部跟踪，教师得先学会跟根部）。域随机化照搬 OmniH2O（摩擦、质量、质心、PD 增益、力矩噪声、控制延迟、推一把、地形，见 OmniH2O 笔记的表 16）。论文没给教师的观测维数。

**官方代码**（Isaac Lab 版，`rewards/reward_cfg.py`）的奖励和表 II 不完全一样：任务项是关节位置 32、关节速度 16、刚体速度 8、刚体角速度 8、全身刚体位置 30、头和双手三个点的位置 50（两项加起来正好 80，我们猜对应表里的「刚体位置 80」），**没有根部速度、根部旋转和刚体旋转**（`reward_track_body_rotation` 写了函数，但权重表里没有，不参与计算）；绊脚 −1000、打滑 −37.5、最高抬脚 −2500，另有一项表里没有的「躯干倾斜」−200。教师观测是 913 维（和 OmniH2O 教师相同），价值网络 990 维。所有带 `penalize` 前缀的项都乘一个惩罚课程系数。

</details>

### 学生的本体感受：25 步历史（第 II-E 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：关节位置、关节速度、根角速度、重力、动作历史，叠 25 步，沿用 OmniH2O；不放全局线速度</summary>

学生 $\pi^{\text{student}}(s^{\text{p-student}}_t,s^{\text{g-student}}_t)$ 是真正部署的策略。本体感受
$$s^{\text{p-student}}_t\triangleq[q,\dot q,\omega^{\text{base}},g] _ {t-25:t}\cup[a _ {t-25:t-1}]$$
即关节位置 $q$、关节速度 $\dot q$、基座角速度 $\omega^{\text{base}}$、重力向量 $g$ 和动作历史 $a$，照 OmniH2O 叠最近 25 步。都是真机上 IMU 和编码器拿得到的量，没有全局线速度。

**官方代码**里一步本体感受是 $19+19+3+3=44$ 维，加上一步动作 19 维，历史每步 $44+19=63$ 维 × 25 步 = 1575 维（`single_history_dim = 63`、`observation_history_length = 25`）。

</details>

### 命令掩码：模式掩码 + 稀疏掩码（第 II-E 节、图 2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：先按模式掩码上下身各挑一种模式，再按稀疏掩码关掉一部分维度；每一位都是 B(0.5)，回合开始时随机、整回合不变；代码只挑四种模式、稀疏默认关</summary>

学生的命令输入
$$s^{\text{g-student}}_t\triangleq M _ {\text{sparsity}}\odot\left[M _ {\text{mode}}\odot s^{\text{g-upper}}_t,\ M _ {\text{mode}}\odot s^{\text{g-lower}}_t\right]$$

- **模式掩码** $M _ {\text{mode}}$：给上半身、下半身**各自独立地**选一种命令模式。例如上身跟关键点位置，下身跟关节角和根部（图 2）。
- **稀疏掩码** $M _ {\text{sparsity}}$：在模式掩码之后再关掉一部分。论文的例子：有时上身只跟两只手的位置，下身只跟躯干的关节角。
- 两个掩码的**每一位都取自伯努利分布 $\mathcal B(0.5)$**，在回合开始时随机，**整个回合保持不变**。

LaTeX 源码里有一行被注释掉、没进 PDF 的算式，算的是 H1 上两种掩码能组合出多少种模式：$(2^{12}+2^{9})\times(2^{11}+2^{10}+2^{7})=14{,}745{,}600$。前一个因子是上半身（12 个关键点的任意子集，或 9 个关节角的任意子集），后一个是下半身（11 个关键点、10 个关节角或 7 个根部量的任意子集），见[例 4](#实例-4-掩码能组合出多少种)。

**官方代码**（`mask.py` 的 `create_mask`）和论文的描述有三处不同：

1. **模式掩码**不是逐位伯努利，而是从 `distill_mask_modes` 列出的模式里**均匀地挑一个**（`torch.randint`），整个模式的位一起打开；仓库里只列了四种（ExBody、HumanPlus、H2O、OmniH2O），README 说这是「为了验证可行性手挑的」，用户可以自己加。
2. **稀疏掩码**是对打开的位逐位乘 $\mathcal B(0.5)$（`torch.bernoulli(mask * 0.5)`），和论文一致；但默认**关着**（`distill_mask_sparsity_randomization_enabled = False`），README 建议保持关闭，因为照论文这样随机关会带来**动作歧义**，代码注释提议只在同一身体区域里关掉一小部分。
3. 默认配置训的是 **OmniH2O 专才**（`distill_mask_modes = {"omnih2o": ...}`）；要训通才得把它改成 `DISTILL_MASK_MODES_ALL`。

还有一个论文没写的细节：学生观测里除了乘过掩码的 95 维命令，**还拼上掩码本身**（49 维）。代码注释说，不然网络分不清「这一维的目标恰好是 0」和「这一维被关掉了」。只有一种模式时不重抽掩码；有多种时每次环境重置（回合结束）重抽一次，和「回合开始时随机、整回合不变」一致。

学生的观测在代码里合计 $44+95+49+19+1575=$ **1782** 维（见[例 5](#实例-5-学生的观测有多少维)）。

</details>

<div class="paper-demo" data-demo="hover-mask" id="demo-mask"><p class="demo-fallback">（本节含交互演示：掩码浏览器，需要启用 JavaScript）</p></div>

### DAgger 蒸馏

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学生在仿真里自己开，每一步同时算出教师的观测、问教师怎么做，用动作的均方差更新学生</summary>

每个回合在仿真里让**学生** $\pi^{\text{student}}(a_t\mid s^{\text{p-student}}_t,s^{\text{g-student}}_t)$ 自己开，得到 $(s^{\text{p-student}}_t,s^{\text{g-student}}_t)$ 的轨迹；每一步同时算出对应的教师状态 $(s^{\text{p-oracle}}_t,s^{\text{g-oracle}}_t)$，问教师得到参考动作 $\hat a_t$，用
$$\mathcal L=\lVert\hat a_t-a_t\rVert_2^2$$
更新学生。数据来自学生自己走出的状态分布，学生犯了错，教师就在那个状态上给出正确的动作——这是 DAgger 和普通行为克隆的区别。

**官方代码**（`student_policy_trainer.py`）：从第 0 次迭代起就由学生开（`student_rollout_iteration = 0`）；每次迭代每个环境只走 1 步就更新一次（`num_steps_per_env = 1`）；损失写的是 `torch.norm(pred - gt, dim=-1).mean()`，即**不带平方**的 L2 范数取平均（和 OmniH2O 的代码一样）；Adam、学习率 5e-4、梯度裁剪 0.2；学生 MLP $[512, 256, 128]$、ELU，动作噪声固定 0.001；蒸馏时不加观测噪声。

</details>

### 训练设置（官方代码与 README）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PPO 超参数、网络、训练时长：教师 10 万次迭代约 23 小时，学生 1 万次迭代约 16 分钟</summary>

论文没有超参数表。官方代码（`teacher_policy_cfg.py`、`student_policy_trainer_cfg.py`）：教师 PPO 学习率 1e-3、$\gamma=0.99$、$\lambda=0.95$、clip 0.2、梯度裁剪 0.2，演员和评论家都是 $[512, 256, 128]$；学生见上一节。控制延迟随机 0–3 个物理步，力矩噪声上限是力矩限的 10%（`default_rfi_lim = 0.1`）。

README 的训练时长（单卡，README 的表）：

| | 迭代次数 | 每次（RTX 4090） | 总时长（RTX 4090） |
|---|---|---|---|
| 教师 | 100,000 | 0.84 s | 23.3 h |
| 学生 | 10,000 | 0.097 s | 0.27 h |

README 还说教师一般 5–8 万次迭代就能训好，推荐至少 4096 个环境、用完整的 AMASS。

</details>

---

## 📊 实验结果（第 III 节）

三个问题：**Q1** 作为通才的 HOVER，能不能比为某一种命令配置专门训的策略好？**Q2** 能不能比别的多模式训练方法好？**Q3** 能不能上真机做多模式控制？仿真在 Isaac Gym 里，用重定向后的 $\hat Q$ 评测；真机测 20 段站立动作的定量跟踪，以及行走时的多模式切换。

指标：存活率（除了脚以外的部位着地就算终止）；全局 / 局部 MPJPE $E _ {\text{g-mpjpe}}$、$E _ {\text{mpjpe}}$（mm）；上身 / 下身关节误差 $E _ {\text{upper-j}}$、$E _ {\text{lower-j}}$（rad）；根部速度 $E _ {\text{root-vel}}$（m/s）、根部高度 $E _ {\text{root-h}}$、根部横滚 / 俯仰 / 偏航 $E _ {\text{root-r/p/y}}$（rad）；物理真实感用加速度误差 $E _ {\text{acc}}$（mm/帧²）、速度误差 $E _ {\text{vel}}$（mm/帧）。表里按模式把**这种模式真正在跟的指标**涂上对应颜色。

### 表 III：和四个专才比（Q1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：同一个 HOVER 套上固定的掩码，和为 ExBody / HumanPlus / H2O / OmniH2O 模式专门用强化学习训的专才比；每种模式 12 项里显著更好的有 7–8 项</summary>

每个专才只给它那种模式需要的观测，用强化学习训；HOVER 在评测时用固定的掩码对上这种模式，在整个 $\hat Q$ 上跑。5 个随机种子，显著更好的加粗。

| 方法 | 存活 | $E _ {\text{g-mpjpe}}$ | $E _ {\text{mpjpe}}$ | $E _ {\text{acc}}$ | $E _ {\text{vel}}$ | $E _ {\text{upper-j}}$ | $E _ {\text{lower-j}}$ | $E _ {\text{root-vel}}$ | $E _ {\text{root-h}}$ | $E _ {\text{root-r}}$ | $E _ {\text{root-p}}$ | $E _ {\text{root-y}}$ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 教师 | 99.3% | 119 | 59.4 | 2.63 | 5.43 | 0.153 | 0.206 | 0.456 | 0.066 | 0.065 | 0.083 | 0.282 |
| ExBody 专才 | 99.1% | 275 | 83.1 | **2.63** | 6.31 | 0.166 | 0.243 | **0.428** | 0.074 | 0.070 | 0.147 | 0.276 |
| HOVER（ExBody 模式） | 99.1% | **185** | **63.9** | 3.01 | **6.06** | **0.148** | **0.210** | 0.452 | **0.063** | 0.068 | **0.091** | 0.279 |
| HumanPlus 专才 | 98.4% | 266 | 80.1 | **2.53** | 6.16 | 0.177 | 0.222 | **0.422** | **0.061** | 0.080 | 0.124 | 0.228 |
| HOVER（HumanPlus 模式） | 98.9% | **182** | **64.5** | 2.85 | **5.91** | **0.145** | **0.211** | 0.455 | 0.067 | **0.069** | **0.104** | 0.237 |
| H2O 专才 | 99.2% | 137 | 66.3 | **2.63** | 5.75 | 0.177 | 0.221 | 0.457 | 0.078 | 0.067 | 0.095 | 0.415 |
| HOVER（H2O 模式） | 98.9% | **121** | **60.6** | 2.73 | **5.49** | **0.158** | **0.207** | 0.456 | **0.065** | 0.067 | **0.086** | **0.365** |
| OmniH2O 专才 | 99.0% | 149 | 76.4 | 2.69 | 6.18 | 0.199 | 0.232 | 0.456 | 0.071 | 0.070 | 0.125 | **0.306** |
| HOVER（OmniH2O 模式） | 99.0% | **128** | **62.5** | 2.69 | **5.65** | **0.162** | **0.213** | 0.457 | **0.065** | 0.068 | **0.089** | 0.310 |

（表中省略了 ± 标准差，在 0.001–1.65 之间。）

- HOVER 加粗的项数：ExBody 模式 7、HumanPlus 7、H2O 8、OmniH2O 7——论文说「每种模式下至少 7/12」；专才加粗的项数是 2、3、1、1。
- 全局位置误差降得最多：ExBody 模式 275 → 185 mm（−33%），HumanPlus 266 → 182（−32%）。ExBody / HumanPlus 的专才根本不跟位置，误差大在意料之中；但 H2O、OmniH2O 模式本来就跟关键点位置，HOVER 也低了 12%、14%。
- 专才稳赢的是**加速度误差**（四种模式里三种专才加粗）和**根部速度**（ExBody、HumanPlus 两种），也就是专才的动作更平滑、根部速度跟得更紧。
- 论文的结论：即使只看单一模式、不考虑多模式，从教师蒸馏也比用强化学习训专才好。图 3 把这张表画成了雷达图，根部旋转那一轴是横滚、俯仰、偏航三项的平均（例如 ExBody 模式 $(0.068+0.091+0.279)/3=0.146$）。

</details>

### 表 IV：只跟一只手、只跟头（Q1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：左手、右手、双手、头四种模式各训一个专才；只报这种模式在跟的点的指标；16 项 HOVER 显著更好的 14 项</summary>

再加四种有用的模式，各训一个强化学习专才；表里只报**这种模式在跟的那几个点**的指标（带 -mode 后缀）。

| 模式 | 方法 | $E _ {\text{g-mpjpe-mode}}$ | $E _ {\text{mpjpe-mode}}$ | $E _ {\text{acc-mode}}$ | $E _ {\text{vel-mode}}$ |
|---|---|---|---|---|---|
| 左手 | 专才 | 189 | **147** | 5.82 | 11.2 |
| | HOVER | **138** | 151 | **5.45** | **10.3** |
| 右手 | 专才 | 220 | 216 | 6.77 | 12.5 |
| | HOVER | **128** | **141** | **5.83** | **10.8** |
| 双手 | 专才 | 137 | 145 | 5.72 | 11.2 |
| | HOVER | **120** | **119** | **5.60** | **10.1** |
| 头 | 专才 | 186 | 104 | **2.22** | 6.63 |
| | HOVER | **133** | **80.0** | 2.31 | **6.40** |

16 项里 HOVER 显著更好的 14 项，专才赢 2 项（左手模式的局部误差 147 对 151、头模式的加速度 2.22 对 2.31）。最悬殊的是只跟右手：全局误差 220 → 128 mm（−42%）。论文说只给左手的参考时，专才只看到左手；训一个专才很难学会只凭一只手把全身都控制好。

</details>

<div class="paper-demo" data-demo="hover-radar" id="demo-radar"><p class="demo-fallback">（本节含交互演示：雷达图，需要启用 JavaScript）</p></div>

### 图 4：同样掩码，从头强化学习不行（Q2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：多模式强化学习基线用同样的掩码过程，但从头用强化学习训；8 种模式 × 4 项指标，HOVER 32 项全都更好</summary>

基线：**多模式强化学习**，命令上用同样的掩码过程（模式和稀疏在回合开始时随机、整回合不变），但不蒸馏，直接用强化学习从头训。图 4 在 8 种模式（H2O、ExBody、双手、右手、左手、OmniH2O、HumanPlus、头）上比 4 项误差：根部 RPY、上身关节、局部刚体位置、全局刚体位置；为了画图把误差缩放成 $\frac{E^{\max}-E}{E^{\max}-E^{\min}}$，网越大越好。

图上标的数（HOVER / 多模式强化学习）：

| 模式 | 根部 RPY (rad) | 上身关节 (rad) | 局部位置 (mm) | 全局位置 (mm) |
|---|---|---|---|---|
| H2O | 0.17 / 0.21 | 0.16 / 0.18 | 60.6 / 69.13 | 121 / 138 |
| ExBody | 0.15 / 0.15 | 0.15 / 0.16 | 63.9 / 79.79 | 185 / 220 |
| 双手 | 0.30 / 0.40 | 0.17 / 0.23 | 76.3 / 100 | 156 / 295 |
| 右手 | 0.34 / 0.43 | 0.25 / 0.29 | 100 / 120 | 191 / 374 |
| 左手 | 0.35 / 0.40 | 0.25 / 0.29 | 104 / 121 | 204 / 350 |
| OmniH2O | 0.16 / 0.22 | 0.16 / 0.2 | 62.5 / 80.4 | 128 / 198 |
| HumanPlus | 0.14 / 0.14 | 0.15 / 0.16 | 64.5 / 79.0 | 182 / 211 |
| 头 | 0.14 / 0.22 | 0.33 / 0.34 | 104 / 108 | 171 / 249 |

论文：HOVER 在 **32/32** 项上误差更低，说明「从跟踪全身运动学的教师蒸馏」对学一个通才全身控制器很重要。按图上保留两位小数的数，ExBody 和 HumanPlus 的根部 RPY 两边写的是同一个数（0.15 / 0.15、0.14 / 0.14），读图分不出高低。差距最大的是只跟一只手的模式：全局误差 191 对 374（右手）、204 对 350（左手）——输入越稀疏，从头强化学习越难。这张图里 HOVER 的数和表 III 对得上（H2O 模式全局 121、局部 60.6 等），但单手、双手、头模式用的是全身所有点的指标，和表 IV 只算在跟的点不是一回事（双手模式：全身 156，在跟的两只手 120）。

</details>

### 真机：表 V 与图 5（Q3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：$\hat Q$ 里 20 段站立动作，每段测 5 次；三种模式 12 项里 HOVER 显著更好 11 项；还能跟根部俯仰和全身运动学的跑步</summary>

真机是 19 个自由度的 Unitree H1。跟踪 $\hat Q$ 里 **20 段站立动作**，每种设置测 5 次：

| 模式 | 方法 | $E _ {\text{g-mpjpe}}$ | $E _ {\text{mpjpe}}$ | $E _ {\text{upper-j}}$ | $E _ {\text{root-rpy}}$ |
|---|---|---|---|---|---|
| ExBody | 专才 | 51.3 | 39.3 | 0.131 | 0.036 |
| | HOVER | **48.9** | **36.8** | **0.126** | **0.032** |
| HumanPlus | 专才 | 51.0 | 36.7 | 0.128 | **0.035** |
| | HOVER | **47.4** | **35.3** | **0.121** | 0.038 |
| OmniH2O | 专才 | 51.2 | 42.1 | 0.153 | 0.040 |
| | HOVER | **47.5** | **41.0** | **0.145** | **0.037** |

12 项里 HOVER 显著更好 11 项，唯一输的是 HumanPlus 模式的根部 RPY（0.038 对 0.035）。真机误差（约 48 mm）比仿真表 III（120–185 mm）小得多，因为测的只是站立动作（我们的理解）。

图 5：左边是两段动作的上身关节模式；中间是**根部俯仰**跟踪（弯腰）；右边是**全身运动学**跟踪，机器人能跟上高动态的跑步动作。

</details>

### 边走边切模式（图 6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：向前走时从 ExBody 切到 H2O；转身后退时从 HumanPlus 切到 OmniH2O；Vision Pro 遥操作时随机遮掉头或手</summary>

为了模拟真实场景，在运行中**突然切换**命令模式：

- 图 6(a)：向前走、做动作的过程中，从 **ExBody 模式**切到 **H2O 模式**；
- 图 6(b)：转身、后退的过程中，从 **HumanPlus 模式**切到 **OmniH2O 模式**；
- 图 6(c)：用 Vision Pro 实时遥操作，随机遮掉头和手的位置，例如中间那张，人形在**头模式**里只跟人的头，不管挥着的手。

论文的说法是 HOVER 能平滑地跟踪各种模式的动作，对参考动作有遮挡之类的真实场景很鲁棒。项目页还有从根部速度（0 m/s）切到根部俯仰（−0.5 到 0.5 rad）的视频。论文没有给切换时刻前后的定量数据。

</details>

<div class="paper-demo" data-demo="hover-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 III、表 IV、表 V，需要启用 JavaScript）</p></div>

---

## ⚠️ 局限与讨论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：模式由人切，以后要自动切；稀疏掩码会带来歧义；代码只放了四种模式；通才比专才好的解释是假设</summary>

论文自己写的：以后要做一个**自动切换模式**的模块（结论一节）——现在用哪种模式由人或上层程序指定。

我们读论文和代码时的补充（都是我们的观察）：

- **稀疏掩码和歧义**：README 明说照论文那样逐位随机关掉，会带来动作歧义，建议关掉稀疏随机；代码默认也是关的。只给几个维度时，下身怎么走、手臂其他部分怎么摆都要靠策略猜。
- **代码只有四种模式**：仓库只列了 ExBody、HumanPlus、H2O、OmniH2O，默认还训 OmniH2O 专才；论文里的左手、右手、双手、头模式和「任意子集」要自己加。
- **代码和论文的奖励不同**：Isaac Lab 版没有根部速度、根部旋转、刚体旋转三项任务奖励，几个惩罚的权重也不同。
- **「通才更好」的原因**：论文把它归于跨模式共享的物理知识、专才过拟合奖励，这是假设；表 III 里专才的加速度误差、根部速度反而更好，说明专才不是全面落后。
- **真机评测有限**：定量只有 20 段站立动作，切换模式只有视频，没有切换前后的误差或摔倒率。

</details>

---

## 🚶 具体实例：用一段 H1 走路从头算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：环境设定 / 例 1 49 位掩码怎么排 / 例 2 第 1.33 s 的 95 维命令 / 例 3 套上 ExBody 掩码 / 例 4 掩码能组合出多少种 / 例 5 学生的观测有多少维 / 例 6 读表 III / 例 7 读表 IV / 例 8 读图 4 / 例 9 读表 V / 例 10 训练要多久</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **动作**：我们用 [PHC](https://github.com/ZhengyiLuo/PHC)（`main` 的 846988d）的 `scripts/data_process/fit_smpl_shape.py` 与 `fit_smpl_motion.py`（`robot=unitree_h1_fitting`，代码未改；它的 H1 模型和 HOVER 的 `h1.xml` 正运动学一致），以 SMPL（v1.1.0 的中性模型）在 AMASS（SMPL+H G）的 CMU `07_01`（走路，120 fps，按脚本降到 30 fps）上重算的重定向，取第 0–2.6 s、15 fps 共 40 帧；每帧有根部位置、横滚 / 俯仰 / 偏航、19 个关节角。这不是论文的数据，是同一条流程的一个小复现。第 0 帧的骨盆挪到原点、偏航转成 0。动画里循环播放时只放第 17–32 帧：第 33 帧的姿态和第 17 帧最接近（脚和手差 0.09 m，比相邻两帧的 0.21 m 还小），整段 40 帧首尾接不上（第 39 → 0 帧脚一下挪 0.7 m 以上）。
- **为什么不用 human2humanoid 的输出**：HOVER 的 `retarget_h1.sh` 调的是 human2humanoid 的 `grad_fit_h1_shape.py` 与 `grad_fit_h1.py`。我们先跑了它（Python 3.10，按它的 requirements 装 numpy 1.23、ZhengyiLuo/smplx 与 SMPLSim，代码未改）：重定向逐帧独立、Adadelta 学习率 100，拟合出的整体缩放（1.107）没用上；30 fps 下有 73 次相邻两帧的关节角变化超过 0.3 rad，膝盖有 45 帧顶在 −0.26 rad 的反关节限位上，髋偏航在 ±0.43 rad 两头之间来回翻，H1 的脚一帧一跳。PHC 的同名脚本是同一作者后来的版本：用上缩放、关节角加 0.01 的 L2 正则、每步做核宽 5、$\sigma = 0.75$ 的高斯时间平滑、根部朝向与位置一起优化；30 fps 下相邻两帧的关节角最大只差 0.19 rad。
- **拟合形状**（第 1 个脚本）：H1 零位与 SMPL 的同一个站姿之间 16 对点（骨盆、两髋、两膝、两踝、两肩、两肘、两手、头、两脚尖；头取骨盆上方 0.6 m、脚尖取踝前方 0.08 m），同时优化 10 维 $\boldsymbol\beta$ 和整体缩放，Adam 学习率 0.1、3000 步，损失是距离的平方和；平均距离 105.5 → 55.9 mm，缩放 0.955。损失里没有正则，$\boldsymbol\beta'$ 有一维到了 −37.2（10 维里绝对值最大的一维），SMPL 的网格已经不像人。在这个站姿下，两踝的横向距离 0.18 → 0.31 m（H1 0.41 m），两髋只从 0.14 m 到 0.16 m：PHC 让 SMPL 的髋对 H1 的 `hip_yaw_link`（两侧相距 0.175 m），H1 的腿要到髋俯仰才分开（0.406 m），所以拟合后人体的髋不会像 [H2O 笔记](../H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html)里逐段缩放的 CMU 骨架那样横向放大 2.2 倍；H2O 论文要的是两脚之间的大间距。
- **重定向**（第 2 个脚本）：同时解 19 个关节角、根部朝向（从 SMPL 的航向起步）和根部位置的一个整体偏移，对齐同样的 16 对点，Adam 学习率 0.02、500 步，每步截断到关节限位、再在时间上平滑；平均距离 188.3 → 51.6 mm，右髋最大（112.6 mm）、左髋 105.3 mm，右肘最小（4.6 mm）。最后按第 0 帧 H1 网格的最低点贴地。
- **23 个点**：用官方仓库的 `neural_wbc/data/data/mujoco/models/h1.xml` 做正运动学（根部朝向按外旋 xyz 的横滚、俯仰、偏航），和 human2humanoid、PHC 的 `h1.xml` 正运动学一致（PHC 配置里的头在骨盆上方 0.6 m，这里的 23 个点按 HOVER 取 0.75 m）；手 = 肘连杆坐标系里 $(0.3, 0, 0)$，头 = 骨盆坐标系里 $(0, 0, 0.75)$。
- **这段走路**：根部水平速度平均 1.36 m/s（1.16–1.63 m/s），2.6 s 向前走了约 3.5 m。
- **假设**：例 2 里「机器人落后参考 0.2 s」（3 帧）是假设，用来让命令不全是 0。根部速度用 15 fps 的中心差分（我们的近似）。

<h3 id="实例-1-49-位掩码怎么排">例 1：49 位掩码怎么排</h3>

代码（`create_mask_element_names`）的顺序：

- 第 0–22 位：23 个刚体的位置——骨盆，左腿 5 个连杆（髋偏航、髋横滚、髋俯仰、膝、踝），右腿 5 个，躯干，左臂 4 个（肩俯仰、肩横滚、肩偏航、肘），右臂 4 个，左手，右手，头；
- 第 23–41 位：19 个关节角——左腿 5、右腿 5、躯干、左臂 4、右臂 4；
- 第 42–48 位：根部 7 个量——线速度 $x,y,z$、横滚、俯仰、偏航之差、高度。

四种模式开的位：ExBody 第 33–41、42–48 位（16 位）；HumanPlus 第 23–48 位（26 位）；H2O 第 5、10、12–21 位（12 位）；OmniH2O 第 20–22 位（3 位）。ExBody 的 16 位全在 HumanPlus 的 26 位里；H2O 和 OmniH2O 共用两只手。

<h3 id="实例-2-第-133-s-的-95-维命令">例 2：第 1.33 s 的 95 维命令</h3>

参考取第 1.33 s（第 20 帧），机器人在做第 1.13 s 的姿态（第 17 帧，落后 0.2 s）。按代码：

- **关键点**（69 维）：参考的 23 个点减去**机器人自己的根部**，再转到机器人只转偏航的朝向坐标系。左手 $(0.439, 0.214, -0.096)$、右手 $(0.373, -0.313, -0.118)$、头 $(0.301, -0.043, 0.793)$ m；骨盆 $(0.268, -0.008, 0.045)$——参考的骨盆在机器人前方 0.27 m，因为它落后了 0.2 s、走路速度约 1.3 m/s。
- **关节角**（19 维）：参考减当前。左髋俯仰 −0.716、左膝 0.649、右髋俯仰 0.582、右膝 −0.381、左踝 −0.084、右踝 −0.099 rad；上身：躯干 0.279、左肩俯仰 0.283、左肩横滚 −0.086、左肩偏航 −0.271、左肘 0.432、右肩俯仰 −0.139、右肩横滚 0.005、右肩偏航 0.233、右肘 −0.140 rad。（PHC 多对齐了脚尖：踝前方 0.08 m 的点随踝关节转动，所以踝角也会变；human2humanoid 只对齐踝连杆的原点，踝角一直是 0。）
- **根部**（7 维）：参考的根部线速度转到参考的根部坐标系里 $(1.225, 0.088, 0.159)$ m/s，横滚 0.044、俯仰 0.047 rad，偏航之差 −0.064 rad（代码注释：偏航从本体感受里估不出来，所以给差），根部高度 1.080 m。

<h3 id="实例-3-套上-exbody-掩码">例 3：套上 ExBody 掩码</h3>

ExBody 模式开 16 位：上身 9 个关节角 + 根部 7 个量。乘上掩码后：

- 关键点 69 维**全是 0**；
- 关节角只剩上身 9 维：$(0.279, 0.283, -0.086, -0.271, 0.432, -0.139, 0.005, 0.233, -0.140)$，腿上 10 维是 0；
- 根部 7 维照旧：$(1.225, 0.088, 0.159, 0.044, 0.047, -0.064, 1.080)$。

95 维里非零的只剩这 16 维，其余 79 维都是 0。换成 OmniH2O 模式就只剩 9 维：左手、右手、头的位置。观测里同时附上 49 位掩码，学生才知道「腿的关节角是 0」是没给，而不是「腿伸直」。

<h3 id="实例-4-掩码能组合出多少种">例 4：掩码能组合出多少种</h3>

**论文的算式**（LaTeX 源码里注释掉的一行）：上半身要么跟 12 个关键点（躯干、两臂各 4 个连杆、两手、头）的任意子集，要么跟 9 个关节角的任意子集，$2^{12}+2^{9}=4608$；下半身要么 11 个关键点（骨盆、两腿各 5 个连杆）、要么 10 个关节角、要么 7 个根部量，$2^{11}+2^{10}+2^{7}=3200$；合计 $4608\times3200=14{,}745{,}600$ 种。（空集在每个子项里都算了一次，严格说有重复，这是论文自己的粗算。）

**代码**：只有四种模式。打开稀疏后，每一位以 0.5 的概率保留：OmniH2O 模式 3 位全被关掉的概率 $0.5^3=1/8$，H2O 模式 $0.5^{12}\approx0.02\%$；平均保留的位数是一半（ExBody 8 位、HumanPlus 13 位、H2O 6 位、OmniH2O 1.5 位）。全关掉时学生什么目标都没有——这就是 README 说的歧义的极端情况。

<h3 id="实例-5-学生的观测有多少维">例 5：学生的观测有多少维</h3>

代码（`neural_wbc_env.py` 的 `num_student_obs`）：

| 部分 | 维数 |
|---|---|
| 当前一步的本体感受：关节位置 19 + 关节速度 19 + 根角速度 3 + 投影重力 3 | 44 |
| 乘过掩码的命令：69 + 19 + 7 | 95 |
| 掩码本身 | 49 |
| 上一步动作 | 19 |
| 25 步历史，每步 44 + 19 | 1575 |
| **合计** | **1782** |

教师 913 维（和 OmniH2O 的教师一样），价值网络 990 维，动作 19 维。对照 OmniH2O 学生的 1665 维：目标从 27 维（3 个点 × 位置差、参考位置、参考速度）换成 95 + 49 = 144 维。

<h3 id="实例-6-读表-iii">例 6：读表 III</h3>

- 加粗数：HOVER 7 / 7 / 8 / 7，专才 2 / 3 / 1 / 1（ExBody、HumanPlus、H2O、OmniH2O 模式）。
- 全局误差：275 → 185（−32.7%）、266 → 182（−31.6%）、137 → 121（−11.7%）、149 → 128（−14.1%）mm。
- 和教师比：教师全局 119 mm，HOVER 在 H2O 模式 121 mm，只多 2 mm；ExBody 模式 185 mm，因为这个模式根本不给位置目标。
- 专才赢的 7 项：加速度 3 项（ExBody、HumanPlus、H2O），根部速度 2 项（ExBody、HumanPlus），根部高度 1 项（HumanPlus），偏航 1 项（OmniH2O）。

<h3 id="实例-7-读表-iv">例 7：读表 IV</h3>

全局误差降幅：左手 189 → 138（−27.0%）、右手 220 → 128（−41.8%）、双手 137 → 120（−12.4%）、头 186 → 133（−28.5%）mm。专才赢的 2 项：左手局部误差（147 对 151）、头的加速度（2.22 对 2.31）。

<h3 id="实例-8-读图-4">例 8：读图 4</h3>

全局位置误差（mm）在 8 种模式上 HOVER 平均 $(121+185+156+191+204+128+182+171)/8=167.25$，多模式强化学习平均 $(138+220+295+374+350+198+211+249)/8=254.4$，高 52%。单手模式差得最多：右手 374 / 191 = 1.96 倍，左手 350 / 204 = 1.72 倍。

论文的缩放 $\frac{E^{\max}-E}{E^{\max}-E^{\min}}$ 没说最大、最小在什么范围里取；如果按这一张图（两种方法、8 种模式的 16 个数）取，全局位置那一轴 $E^{\max}=374$、$E^{\min}=121$：HOVER 的 OmniH2O 模式 $(374-128)/(374-121)=0.97$ 几乎在最外圈，多模式强化学习的右手模式是 0，在圆心——和图上的样子一致（这是我们的理解，交互演示「雷达图」就按这个画）。

<h3 id="实例-9-读表-v">例 9：读表 V</h3>

12 项里 HOVER 加粗 11 项。全局误差 51.3 → 48.9（−4.7%）、51.0 → 47.4（−7.1%）、51.2 → 47.5（−7.2%）mm——比仿真里的差距小得多；我们推测是因为只有站立动作，专才也跟得不错。唯一输的：HumanPlus 模式根部 RPY 0.038 对 0.035。

<h3 id="实例-10-训练要多久">例 10：训练要多久</h3>

按 README 的表（RTX 4090）：教师 100,000 次 × 0.84 s = 84,000 s ≈ 23.3 h；学生 10,000 次 × 0.097 s = 970 s ≈ 16 分钟（0.27 h）。蒸馏比训教师快约 87 倍——教师要从零学会全身模仿，学生只是照着教师的动作做监督学习，而且每次迭代每个环境只走 1 步。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入、怎么跑</summary>

<h3 id="源码-目录">目录</h3>

```
HOVER/
├── neural_wbc/
│   ├── core/neural_wbc/core/
│   │   ├── mask.py                        # 49 位掩码的名字、create_mask（模式均匀挑一个 + 可选的稀疏）
│   │   ├── observations/student_observations.py   # 学生的 95 维命令 + 掩码 + 本体感受
│   │   ├── observations/teacher_observations.py   # 教师 913 维
│   │   └── reference_motion.py            # 参考动作（AMASS 重定向后的 pkl）
│   ├── isaac_lab_wrapper/.../
│   │   ├── neural_wbc_env_cfg_h1.py       # DISTILL_MASK_MODES_ALL、23 个刚体、PD 增益、默认 OmniH2O 专才
│   │   ├── neural_wbc_env.py              # num_student_obs = 1782、回合重置时重抽掩码
│   │   └── rewards/reward_cfg.py          # 奖励权重
│   ├── student_policy/.../student_policy_trainer.py   # DAgger（不带平方的 L2）
│   ├── mujoco_wrapper/  inference_env/  hw_wrappers/  # sim-to-sim 与 Unitree H1 部署
│   └── data/data/mujoco/models/h1.xml     # 本笔记做正运动学用的 MJCF
├── scripts/rsl_rl/train_teacher_policy.py / train_student_policy.py / eval.py / play.py
└── retarget_h1.sh                         # 调 human2humanoid 的重定向脚本
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码（Isaac Lab 版） |
|---|---|
| 模式掩码每一位 $\mathcal B(0.5)$ | 从列出的模式里均匀挑一个，整组位一起开 |
| 超过 15 种模式、任意子集 | 只列了 ExBody、HumanPlus、H2O、OmniH2O 四种；默认训 OmniH2O 专才 |
| 稀疏掩码每一位 $\mathcal B(0.5)$ | 一样，但默认关闭；README 说会带来动作歧义 |
| H2O 模式 8 个点 | 正则匹配到 12 个点（每侧肩部 3 个连杆） |
| 学生命令 = 掩码后的命令 | 再拼上 49 位掩码本身；学生合计 1782 维 |
| 奖励表 II：含根部速度 100、根部旋转 20、刚体旋转 20、刚体位置 80 | 没有根部速度、根部旋转、刚体旋转；刚体位置 30 + 三个点 50；绊脚 −1000、打滑 −37.5、最高抬脚 −2500、多一项躯干倾斜 −200 |
| DAgger 损失 $\lVert\cdot\rVert_2^2$ | `torch.norm(...).mean()`（不带平方） |
| 仿真 Isaac Gym | Isaac Lab 2.0（Isaac Sim 4.5） |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 1. 教师（PPO）；README 的玩具数据是 stable_punch.pkl（AMASS 里一小段出拳、下身动作被压到最小，仓库不附带）
${ISAACLAB_PATH}/isaaclab.sh -p scripts/rsl_rl/train_teacher_policy.py \
    --num_envs 1024 --reference_motion_path neural_wbc/data/data/motions/stable_punch.pkl
# 2. 学生（DAgger）；通才要先把 neural_wbc_env_cfg_h1.py 里的 distill_mask_modes 改成 DISTILL_MASK_MODES_ALL
${ISAACLAB_PATH}/isaaclab.sh -p scripts/rsl_rl/train_student_policy.py \
    --num_envs 1024 --reference_motion_path neural_wbc/data/data/motions/stable_punch.pkl \
    --teacher_policy.resume_path neural_wbc/data/data/policy/h1:teacher --teacher_policy.checkpoint model_<N>.pt
# 3. 评测 / sim-to-sim（MuJoCo）/ 真机（Unitree H1）
${ISAACLAB_PATH}/isaaclab.sh -p scripts/rsl_rl/eval.py ...
${ISAACLAB_PATH}/isaaclab.sh -p neural_wbc/inference_env/scripts/eval.py --num_envs 1 --headless --student_path ...
${ISAACLAB_PATH}/isaaclab.sh -p neural_wbc/inference_env/scripts/s2r_player.py --robot unitree_h1 ...
```

`stable_punch.pkl` 就是 [OmniH2O 笔记](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)里那份官方样例（human2humanoid 仓库里有），README 说它把下身的动作改到最小，做成了一个简单的例子。

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 ExBody、H2O、OmniH2O、HumanPlus 与 MaskedMimic；下启 HugWBC、HOMIE、SONIC 等「一个控制器、多种接口」的工作</summary>

- **上承**：[ExBody](../Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html)（上身关节角 + 根部）、[H2O](../H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html)（8 个关键点；重定向和 sim-to-data 都从这里来）、[OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)（头和双手 3 个点；教师—学生、25 步历史、域随机化都照搬）、[HumanPlus](../../07_Teleoperation/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)（全身关节角 + 根部）；[MaskedMimic](../MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.html)（图形学里用蒸馏做灵活约束的多模式控制，HOVER 的相关工作点了它）；[四足野外盲走](../Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.html)（特权教师 → 本体感受学生）。
- **同期**：MHC（Dugar 等，多模式但只有关节角和根部）；[ExBody2](../ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.html)（同样教师—学生，追求单一表情动作模式的跟踪精度）。
- **下启**：[HugWBC](../HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller/HugWBC_A_Unified_and_General_Humanoid_Whole-Body_Controller.html)（统一的步态与上身控制）、[HOMIE](../HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html)（外骨骼驾驶舱遥操作）、[SONIC](../SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html)（NVIDIA 后来把动作跟踪规模化，多种输入汇进一个空间）、[BFM](../Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.html)（行为基础模型，笔记建议对照 HOVER 读）。
- **工程意义**：「把各种接口看成全身模仿的子集，用掩码选维度」让上层（手柄、VR、动捕、规划器、操作策略）只管给目标、底层一个策略执行；「掩码本身也进观测」「教师看全部、学生看掩码后的命令」这两个细节在后来的多模式控制器里很常见（我们的观察）。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：HOVER 的命令空间由什么组成？**
A：上半身、下半身两块，各有三种目标：关键点的 3D 位置、关节角、根部（速度、高度、横滚 / 俯仰 / 偏航）；下身才有根部。代码里排成 95 维命令（23 × 3 + 19 + 7）、49 位掩码（每个刚体、关节、根部量一位）。设计标准是通用性（覆盖前人的配置、能接各种设备）和原子性（维度独立、可任意组合）。

**Q2：模式掩码和稀疏掩码有什么区别？**
A：模式掩码决定上下身各用哪种目标（位置 / 关节角 / 根部），稀疏掩码在这个模式里再随机关掉一部分维度（比如只留两只手）。论文里两者每一位都是 $\mathcal B(0.5)$，回合开始时随机、整回合不变；代码里模式是从四种里均匀挑，稀疏默认关。

**Q3：为什么不直接用同样的掩码做多模式强化学习？**
A：图 4 就是这个基线，论文说 8 种模式 × 4 项指标 32 项全输（按图上两位小数，ExBody、HumanPlus 的根部 RPY 两边相同），单手模式全身的全局误差差到将近 2 倍。我们的理解：输入越稀疏，强化学习越难从零探索出好的全身动作；教师看全部信息、先学会全身模仿，学生只要在自己走到的状态上模仿教师的动作，监督信号比奖励密得多。

**Q4：为什么一个通才在每种模式下都能比专才好？**
A：论文的假设是跨模式共享的物理知识（平衡、像人的动作、精确的肢体控制）互相增益，专才容易过拟合自己的奖励。另一个因素是蒸馏本身：表 III 的论文结论是「即使只看单一模式，从教师蒸馏也比强化学习训专才好」。但专才在加速度误差、根部速度上反而更好，不是全面落后。

**Q5：学生怎么知道哪些维度被关掉了？**
A：代码把 49 位掩码本身也拼进观测（论文没写）。否则「目标是 0」和「没有目标」在输入上一模一样，比如腿的关节角目标是 0，可能是没给，也可能是要把腿伸直。

**Q6：HOVER 和 OmniH2O 是什么关系？**
A：OmniH2O 是 HOVER 的一个子集：只开头和双手 3 个关键点的掩码。HOVER 照搬了 OmniH2O 的教师网络、25 步历史的学生本体感受和域随机化，区别是学生的命令换成了带掩码的统一命令空间。官方 HOVER 仓库的默认配置训的就是 OmniH2O 专才。

**Q7：HOVER 部署时怎么切换模式？**
A：换掩码就行，权重不变。图 6 里机器人边走边从 ExBody 模式切到 H2O 模式、从 HumanPlus 切到 OmniH2O；Vision Pro 遥操作时可以只跟头或只跟一只手。论文说以后要做自动切换模式的模块，现在由人指定。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-05-14 · 初读；2026-10-16 · 读代码和做算例时看到的五件事</summary>

- 初读的印象：卖点是接口统一，不是哪一种模式的极限精度；「前人的接口都是子集」这张表（表 I）是全文最有说服力的一张图。

第二版补充（都是我们的观察）：

1. **代码和论文不是一份东西**：官方仓库是 Isaac Lab 上的重写版，模式掩码、奖励、默认配置都和论文不同；照论文复现和照代码复现会得到不同的策略。
2. **掩码进观测**：这个论文没写的细节对多模式很关键——没有它，「关掉」和「目标为 0」分不开。
3. **H2O 模式的点数**：论文说 8 个点，代码的正则是 12 个点。
4. **14,745,600 种模式**是源码里注释掉的一行，PDF 里没有；代码实际只用四种模式。
5. **专才不是全输**：表 III 里专才的加速度误差和根部速度更好；通才赢在位置和关节角。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正、arXiv v1 和 v2 的差别</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@inproceedings{he2025hover,
  title     = {HOVER: Versatile Neural Whole-Body Controller for Humanoid Robots},
  author    = {He, Tairan and Xiao, Wenli and Lin, Toru and Luo, Zhengyi and Xu, Zhenjia and Jiang, Zhenyu and
               Kautz, Jan and Liu, Changliu and Shi, Guanya and Wang, Xiaolong and Fan, Linxi and Zhu, Yuke},
  booktitle = {IEEE International Conference on Robotics and Automation (ICRA)},
  year      = {2025},
  note      = {arXiv:2410.21229}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

1. 谁来选模式？论文说要做自动切换的模块；上层的 VLA、规划器能不能直接输出掩码？
2. 稀疏掩码的歧义怎么处理？只给几个点时，策略对其余身体的「猜测」是从数据分布里学来的，换个数据集会不会猜得不一样？
3. 切换瞬间的稳定性没有定量数据：从 ExBody 切到 H2O 时，位置目标突然出现，误差会不会造成一下猛冲？
4. 加更多模式（比如末端朝向、接触力）还能保持每种都比专才好吗？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- **「Mode mask 和 sparsity mask 都是 Bernoulli(0.5)，每个 episode 开始随机一次」**：论文是这么写的，但补上代码的不同——模式掩码在代码里是从四种模式里均匀挑一个，稀疏默认关。
- **「OmniH2O 仍是单一命令模式（head + 双手位置 + 全身姿态）」**：OmniH2O 的学生只跟头和双手 3 个点的位置，没有全身姿态。
- **「同一权重支持 15+ 控制模式，50 Hz」**：15+ 是引言的说法；50 Hz 来自代码（0.005 s × 4），论文没写。
- **「GR00T N1 把 HOVER 风格控制器嵌入 humanoid foundation model；GR00T、UH-1 等底层范式；OmniH2O / ExBody2 / MOSAIC 都遵循」**：HOVER 论文里没有这些说法，删去。
- **「ExBody2 的 reward 设计可以喂给 HOVER 的 oracle」**：是推测，删去。
- **实验**：旧版只有「≥7/12」和「显著领先」，补上表 III–V 的全部数字、图 4 的 32/32 和读图数、专才赢的那几项。
- **其他**：补上命令空间的维数、掩码进观测、学生 1782 维、奖励表 II 和代码的出入、训练时长、v1 与 v2 的差别；新增用 H1 走路做的具体实例。

<h3 id="d-arxiv-v1-和-v2-的差别">D. arXiv v1 和 v2 的差别</h3>

v2（2025-03-06）和 v1（2024-10-28）的数字完全一样，改的是：表 I 加了 MHC 一行；相关工作删掉了「这些图形学工作只用简化的人体模型、用不到真实世界」一句，MHC 多引了一篇；图 3 的图注加了一句「每种模式在跟的指标标成蓝色」；以及几处语法。两版的 LaTeX 源码里都有那行注释掉的 14,745,600。

</details>

---

## 📎 参考来源

- arXiv：<https://arxiv.org/abs/2410.21229>（v2，2025-03-06，读的是 LaTeX 源码；v1 2024-10-28）
- 项目主页：<https://hover-versatile-humanoid.github.io/>（动画第 6、11、12、14、15 幕的仿真与真机片段剪自这里的视频）
- 代码：<https://github.com/NVlabs/HOVER>（`main`，2025-07-29）
- 动作复现：[ZhengyiLuo/PHC](https://github.com/ZhengyiLuo/PHC) 的 `fit_smpl_shape.py`、`fit_smpl_motion.py`（我们在 [AMASS](https://amass.is.tue.mpg.de/) 的 CMU `07_01` 上跑的；对照跑过 [LeCAR-Lab/human2humanoid](https://github.com/LeCAR-Lab/human2humanoid) 的 `grad_fit_h1_shape.py`、`grad_fit_h1.py`；[SMPL](https://smpl.is.tue.mpg.de/) v1.1.0 中性模型；AMASS 与 SMPL 都要注册、许可不让分发，仓库里只存重算出的 H1 关节角、点与渲染的贴图）
- H1 模型与材质：[Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online) 仓库里的 MuJoCo Menagerie `unitree_h1`
