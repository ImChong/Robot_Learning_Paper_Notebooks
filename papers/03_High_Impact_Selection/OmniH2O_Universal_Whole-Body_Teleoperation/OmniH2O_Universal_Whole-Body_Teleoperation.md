---
layout: paper
title: "OmniH2O: Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation and Learning"
category: "高影响力精选 High Impact Selection"
subcategory: "Teleoperation & Imitation Learning"
zhname: "OmniH2O：通用灵巧的人到人形全身遥操作与学习"
demos: ["omnih2o"]
---

# OmniH2O: Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation and Learning
**把运动学姿态当成通用接口：先在仿真里用 PPO 训一个看得见 23 个刚体全部状态的特权教师，再用 DAgger 蒸馏出只看头和双手 3 个点、25 步本体感受历史、不要全局线速度的学生（1665 维）；训练数据加上「站住 / 蹲住」的版本、奖励加上「每一步的最高抬脚」和惩罚课程，同一个策略就能接 VR、RGB 摄像头、语言、GPT-4o 和从遥操作数据学出来的扩散策略，让带灵巧手的 Unitree H1 做全身灵巧移动操作**

> 📅 阅读日期: 2026-04-24（2026-10-15 第二版：对照 arXiv v1 的 LaTeX 源码、PMLR 定稿和官方仓库逐条核查重写，改正旧版十余处；新增十七幕讲解动画、三个交互演示和配音视频，H1 用官方样例 `stable_punch.pkl` 里的动作做 3D 渲染）
>
> 🏷️ 板块: 03 High Impact Selection · 遥操作 · 全身控制 · 教师—学生蒸馏 · 模仿学习
>
> ℹ️ 笔记对照 [arXiv 2406.08858 v1](https://arxiv.org/abs/2406.08858v1)（2024-06-13，目前只有这一版；读的是 arXiv 上的 LaTeX 源码：正文、表 1–19、图 1–11）、[PMLR 定稿](https://proceedings.mlr.press/v270/he25b.html)（CoRL 2024，PMLR 270:1516–1540；只改了几处措辞和表 4 的行名，数字没变，见[附录 D](#d-pmlr-定稿和-arxiv-v1-的差别)）、[项目页](https://omni.human2humanoid.com/)和官方仓库 [LeCAR-Lab/human2humanoid](https://github.com/LeCAR-Lab/human2humanoid)（2026-10 的 `main`，最后一次提交 2025-02-21；这个仓库是 H2O 和 OmniH2O 合在一起的版本）。「🚶 具体实例」与动画里的 H1 动作取自**官方样例** `legged_gym/resources/motions/h1/stable_punch.pkl`；其中「蹲姿版」和「原始重定向」是**我们自己做的**（论文没有放出这两样），见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2406.08858](https://arxiv.org/abs/2406.08858)（v1，2024-06-13） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2406.08858v1) · [PMLR 定稿](https://proceedings.mlr.press/v270/he25b.html) |
| **项目主页** | [omni.human2humanoid.com](https://omni.human2humanoid.com/)（视频、OmniH2O-6 数据集的下载链接） |
| **代码** | [LeCAR-Lab/human2humanoid](https://github.com/LeCAR-Lab/human2humanoid)（`legged_gym` + `rsl_rl` + `phc`，Isaac Gym；CC BY-NC 4.0） |
| **会议** | CoRL 2024（Munich），PMLR 270:1516–1540 |
| **作者** | Tairan He†、Zhengyi Luo†、Xialin He†、Wenli Xiao、Chong Zhang、Weinan Zhang、Kris Kitani、Changliu Liu、Guanya Shi（† 共同一作） |
| **机构** | Carnegie Mellon University、上海交通大学 |
| **平台** | Unitree H1（19 个电机）+ Inspire 灵巧手 + 达妙 DM-J4310-2EC 腕部电机；Apple Vision Pro；ZED 相机（腰）；两台 Orin NX 16GB 或一台 RTX 4090 笔记本 |
| **数据** | AMASS 重定向 + 站姿 / 蹲姿版（表 1 评测用约 1.4 万段）；OmniH2O-6 遥操作数据集（6 个任务，73,462 帧 ≈ 40.8 分钟，30 Hz） |
| **关键词** | Humanoid teleoperation, whole-body loco-manipulation, teacher-student distillation, DAgger, VR, learning from demonstration |

**一行定位**：H2O 的续作。H2O 用一台 RGB 摄像头实时遥操作全身，但测试时还要动捕给根部线速度、做不了精细操作；OmniH2O 把接口统一成**运动学姿态**，用**教师—学生**把可部署的策略压到「头和双手 3 个点 + 本体感受历史」，去掉线速度，加上灵巧手，再把遥操作录下的数据拿去训**自主策略**。

---

## 🎯 一句话总结

> OmniH2O 把人类示范到人形全身控制的接口统一成**运动学姿态**（所有关节的三维旋转和位置）：VR 头显、RGB 摄像头、语言生成的动作（MDM）、GPT-4o、从遥操作数据学的扩散策略，都只负责给出运动目标，底层是**同一个**跟踪策略。训练分两段：先用 PPO 训一个**特权教师**，它看 23 个刚体（20 个连杆 + 两手 + 头）的位置、旋转、速度、角速度和下一帧参考的差（913 维）；再用 **DAgger** 蒸馏出**学生**，它只看头和双手 3 个点的位置差、参考位置、参考速度（27 维）和 25 步本体感受历史（1665 维），**不放全局线速度**，测试时不再需要动捕。为了让机器人站得住，训练数据给每段动作加了「根固定、下半身站姿 / 蹲姿」的稳定版；奖励加了「每一步的最高抬脚」，并配一个从 0.5 开始的惩罚课程。仿真里学生成功率 94.10%（教师 94.77%、H2O 87.52%），不用 DAgger 只有 47.11%；真机上全局关节误差 87.33 → 47.94 mm，带 VIO 线速度的版本摔倒了。最后用 VR 遥操作采了 OmniH2O-6（6 个任务约 40 分钟），扩散策略在 4 个任务上 8/10，普通 BC 1/10。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十七幕动画：OmniH2O 全流程](#omnih2o-explainer-anim) —— 约 272 秒串完「H2O 留下的问题 → 运动学姿态：一个通用接口 → 站住、蹲住：给动作库加偏置 → 每一步的最高抬脚 → 惩罚从一半开始 → 特权教师：913 维 → 学生只看头和双手 → 25 步历史代替线速度 → DAgger：学生开车，老师批改 → 灵巧手与机载系统 → 表 1：学生追上老师 → 表 1：仿真里差别不大 → 表 2：真机才看得出 → 一个策略，接各种遥控 → GPT-4o 与 OmniH2O-6 → 从示范学自主（表 3）→ 局限」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#omnih2o-video) —— 同样十七幕，加中文配音与字幕，竖屏，可下载
> [三个点浏览器](#demo-points) —— 官方样例的出拳逐帧看：头和双手的参考、机器人自己、位置差，以及 27 维目标；切到 8 / 22 个点看观测维数和表 1(c)
> [抬脚奖励与惩罚课程](#demo-reward) —— 一步抬多高、腾空多久，代码和论文两种写法各给多少分；回合长度不变时惩罚系数 $s$ 怎么变
> [表 1、表 2、表 3](#demo-tables) —— 仿真、真机、模仿学习三张表的每一行

> 🚶 [具体实例](#实例-环境设定)用官方样例里 KIT 572 号受试者的一段左手出拳从头走一遍：站姿版长什么样、我们做的蹲姿版和原始重定向、第 2.40 s 的 27 维目标、各种观测维数、一步的抬脚分数、惩罚课程要乘多少次，最后读表 1–3（并核对表 3 和附录表 17 对不上的两处）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **OmniH2O** | Omni Human-to-Humanoid | 本文系统名：通用的人到人形全身遥操作与学习 |
| **H2O** | Human to Humanoid | 同组前作：RGB 摄像头实时全身遥操作 |
| **DAgger** | Dataset Aggregation | 让学生自己开、在学生走到的状态上问老师怎么做，再做监督学习 |
| **PPO** | Proximal Policy Optimization | 训教师用的强化学习算法 |
| **VR / VIO** | Virtual Reality / Visual-Inertial Odometry | 头显（Vision Pro）/ 视觉惯性里程计（ZED 相机） |
| **MPJPE** | Mean Per-Joint Position Error | 平均每关节位置误差（mm）；$E _ {\text{g-mpjpe}}$ 是全局的，$E _ {\text{mpjpe}}$ 先减去根部 |
| **MDM** | Human Motion Diffusion Model | 文本生成人体动作的扩散模型，接在 OmniH2O 前面做语言控制 |
| **LfD** | Learning from Demonstration | 从示范学：这里是用 OmniH2O-6 训扩散策略 |
| **DP / BC** | Diffusion Policy / Behavior Cloning | 扩散策略（DDPM、DDIM 两种采样）/ 普通的行为克隆 |
| **DR / RFI** | Domain Randomization / Random Force Injection | 域随机化 / 在力矩上加随机噪声 |

---

## 🎬 十七幕动画：OmniH2O 全流程 {#omnih2o-explainer-anim}

<div class="paper-demo" data-demo="omnih2o-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#omnih2o-video}

<div class="paper-demo" data-demo="omnih2o-video" data-src="media/omnih2o_explainer_video.mp4" data-poster="media/omnih2o_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/omnih2o_explainer_video.mp4" download="OmniH2O_讲解视频.mp4">下载 mp4（14.5 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 1、3、6、7 幕里的 H1，动作取自官方样例 `stable_punch.pkl` 里 KIT 572 号受试者的左手出拳（第 1.00–4.93 s），和第一个交互演示、下文「🚶 具体实例」是同一组数字；第 3 幕的「蹲姿版」和「原始重定向」是我们做的，人的骨架是样例里存的 SMPL 关节。第 4、5 幕的步态与课程曲线是示意，第 7 幕「机器人落后 0.2 s」是假设。H1 的 3D 外形：材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，读它仓库里的 `unitree_h1/h1.xml`（MuJoCo Menagerie 的 H1，和官方仓库的 `h1.xml` 正运动学逐位相同），按关节角用正交相机逐帧离线渲染，身上的点按同一个相机投影叠在上面。表格和其余的图来自论文；第 10 幕最后一张是官方仓库 README 的硬件图（CC BY-NC 4.0）。第 10、14–17 幕的真机画面剪自[项目页](https://omni.human2humanoid.com/)的视频（写毛笔字、四种 VR 遥操作、上下身任务、MDM 语言指令、抗干扰、户外、GPT-4o、扩散策略的四个自主任务、三个失败案例），倍速照项目页标的写在画面上，只做讲解引用。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    Q["能不能让人形机器人从人的示范里学技能？<br/>先得有好用的遥操作和稳的全身控制"] --> W1["全身控制难<br/>很多工作只管下身，或把上下身拆开<br/>灵巧操作要稳的下身托着"]
    Q --> W2["接口贵<br/>动捕、外骨骼采不了大规模数据<br/>VR 不贵，但只给头和双手 3 个点"]
    Q --> W3["H2O 不够<br/>测试时要动捕给线速度；RGB 慢且不准<br/>站不住、没有手"]
    W1 --> A["OmniH2O：运动学姿态当接口<br/>教师—学生蒸馏出一个全身策略"]
    W2 --> A
    W3 --> A
    A --> R1["遥操作：VR / RGB / 语言"]
    A --> R2["自主：GPT-4o / 从 OmniH2O-6 学的扩散策略"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style A fill:#e8f8e8,stroke:#27ae60
</div>

### 三个缺口（第 1 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：全身控制难；遥操作接口贵、数据采不多；要一个支持全身灵巧移动操作、又能接好用接口的策略</summary>

论文的出发点：大规模的视觉、语言模型靠海量数据成功，人形机器人也许可以照此办理——在真实世界里大规模采人的示范，从中学技能。人形和人的身体结构相近，既可能是通用平台，也方便把人的判断力接进来采数据。

但有两道坎：

1. **全尺寸人形的全身控制很难**。很多工作只做下身（走、跑），或者把上下身拆成两个控制器。要同时支持稳定的灵巧操作和稳健的行走，控制器必须让上下身一起协调。相关工作一节补了一句：以前移动机器人常用的「到达某个目标点」「跟一个速度指令」这类目标，需要别的策略再给下身提供任务相关的目标，间接地协调上下身；OmniH2O 要的是端到端的一个全身策略。
2. **遥操作接口贵**。动捕、外骨骼这类设备让大规模采数据很难。

所以要一个**支持全身灵巧移动操作**的鲁棒策略，同时能无缝接上**好用、拿得到的遥操作接口**（比如 VR），才能规模化地采示范。

</details>

### 和 H2O 的区别

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：H2O 测试时要动捕、RGB 慢且不准、只做简单移动；OmniH2O 去掉线速度、加上手、能在室内外做精细操作</summary>

论文对[上一篇 H2O](../H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html) 的评价（第 2 节）：H2O 用第三人称 RGB 摄像头估操作者的全身关键点，是基于强化学习的全身遥操作；但 RGB 姿态估计有延迟、不准，观测里又要全局线速度，所以**测试时还要动捕**，只支持简单的移动任务，也不够精细，做不了灵巧操作。OmniH2O 要的是室内外都能做的高精度灵巧移动操作。

具体改了什么：

| | H2O | OmniH2O |
|---|---|---|
| 目标 | 8 个点（双肩、双肘、双手、双踝）× 3 种量 = 72 维 | 3 个点（头、双手）× 3 种量 = 27 维 |
| 本体感受 | 当前一步，含根部线速度（66 维） | 当前一步 + 25 步历史，不含线速度（1638 维） |
| 训练 | 直接 PPO | 先 PPO 训特权教师，再 DAgger 蒸馏 |
| 数据 | AMASS 重定向 + 仿真筛选 | 再加站姿 / 蹲姿版 |
| 输入设备 | RGB 摄像头（+ 动捕给线速度） | VR 头显、RGB、语言、GPT-4o、模仿学习策略 |
| 手 | 无 | Inspire 灵巧手（不经过策略） |

另一条相关线是图形学里用 VR 稀疏输入驱动全身动画的工作（QuestSim、QuestEnvSim、Neural3Points 等），它们只做动画、不做移动操作；OmniH2O 把同样的稀疏输入用到了真机上。

</details>

### OmniH2O 的回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三条贡献；训练的四个关键因素：数据分布、奖励设计、状态空间、历史</summary>

论文列的三条贡献：

1. 一套训练流程，得到支持**全身灵巧移动操作**的鲁棒策略，配一个**通用接口**，人可以用多种方式控制，也能接自主系统；
2. 仿真和真机里的大规模动作跟踪实验，验证模仿能力；
3. 首个人形全身移动操作数据集 **OmniH2O-6**，并在上面评测模仿学习方法。

论文在引言里点名的四个关键因素，后面方法详解一节一节对应：**动作数据的分布**（要偏向站和蹲，下身才学得会在操作时稳住）、**奖励设计**（正则要配课程）、**状态空间设计**和**历史的使用**（历史可以代替要动捕才拿得到的全局线速度）。

</details>

---

## 🔧 方法详解（第 3 节）

<div class="mermaid">
flowchart TB
    subgraph S1["① 数据（第 3 节、图 2）"]
        A["AMASS 重定向（沿用 H2O）<br/>改身材 → 位置逆运动学 → 仿真筛选"] --> B["每段再做一份稳定版<br/>根固定，下半身站姿 / 蹲姿"]
    end
    subgraph S2["② 特权教师（PPO）"]
        B --> T["π privileged：913 维<br/>23 个刚体的位置 / 旋转 / 速度 / 角速度<br/>+ 与下一帧参考的差 + 参考本身"]
        RW["奖励（表 15）：惩罚 4 + 正则 13 + 任务 7<br/>新增「每一步的最高抬脚」"] --> T
        CU["惩罚课程（附录 F）：负奖励 × s，s 从 0.5 起"] --> T
        DR["域随机化（表 16）"] --> T
    end
    subgraph S3["③ 学生（DAgger）"]
        T -->|"在学生走到的状态上问老师"| S["π OmniH2O：1665 维<br/>头和双手 3 个点 × 3 种量 = 27<br/>+ 当前与 25 步历史的本体感受，无线速度"]
    end
    subgraph S4["④ 部署"]
        IF["VR / RGB / MDM / GPT-4o / 扩散策略"] --> G["运动目标：3 个点的位置"]
        G --> S
        S --> PD["19 个关节目标 → PD → H1"]
        HAND["VR 手部姿态 → 逆运动学"] --> HC["灵巧手 + 手腕"]
    end

    style T fill:#fdebd0,stroke:#e67e22
    style S fill:#e8f8e8,stroke:#27ae60
    style G fill:#e8f4fd,stroke:#1f78b4
</div>

### 问题设定：运动学姿态当接口

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目标条件强化学习；q = (θ, p) 是所有关节的 3D 旋转和位置；遥操作只用位置</summary>

和 H2O 一样写成**目标条件强化学习**：MDP $\mathcal M=\langle\mathcal S,\mathcal A,\mathcal T,\mathcal R,\gamma\rangle$，状态 $\mathbf s_t$ 由本体感受 $\mathbf s^{\text p}_t$ 和目标 $\mathbf s^{\text g}_t$ 组成，奖励 $r_t=\mathcal R(\mathbf s^{\text p}_t,\mathbf s^{\text g}_t,\mathbf a_t)$，动作 $\mathbf a_t$ 是 PD 控制器的关节目标，用 PPO 最大化 $\mathbb E[\sum_t\gamma^{t-1}r_t]$。

任务是**动作模仿**：策略 $\pi _ {\text{OmniH2O}}$ 跟踪实时的动作输入。论文把这个任务看成人形控制的**通用接口**，因为运动学姿态可以来自很多来源。运动学姿态定义为
$$\mathbf q_t\triangleq(\boldsymbol\theta_t,\mathbf p_t),$$
即人形所有关节的 3D 旋转 $\boldsymbol\theta_t$ 和位置 $\mathbf p_t$；速度 $\dot{\mathbf q}_t\triangleq(\boldsymbol\omega_t,\mathbf v_t)$ 是角速度和线速度。记号约定：$\tilde\cdot$ 是 VR 头显或动作生成器给的运动学量，$\hat\cdot$ 是动捕数据的真值，不带帽子的是仿真或真机里的量。

遥操作时只用**位置** $\tilde{\mathbf p}_t$：从 VR 头显估全身的旋转和位置都很难，只取头和双手 3 个点的位置。RGB、语言等其他接口也用同样的 3 个点保持一致，论文说也可以很容易地扩展到更多点来减少歧义。

</details>

### 数据：给动作库加「站住」「蹲住」的版本（图 2、图 9）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每段动作再做一份根固定、下半身站姿 / 蹲姿的稳定版；官方样例就是站姿版；不加就站不住</summary>

重定向沿用 H2O 的流程（拟合身材、位置逆运动学、用特权模仿器在仿真里筛掉做不到的），细节见 H2O 笔记。H2O 有个大毛病：机器人**总在原地挪小碎步，不肯站着不动**。

为了让机器人学会稳稳地站和蹲，OmniH2O 让训练数据**偏向**这两种情况：对数据集里的每一段动作 $\hat{\mathbf q} _ {1:T}$，再做一份「稳定版」$\hat{\mathbf q}^{\text{stable}} _ {1:T}$，**根部位置固定，下半身固定成站姿或蹲姿**（图 2 的 (c)、(d)），上半身照旧。附录的图 9 是消融：不加这些数据，机器人很难站住不动、只动上身。

**官方样例**（`legged_gym/resources/motions/h1/stable_punch.pkl`，README 里所有训练命令默认用它）就是站姿版：29 段 AMASS 里的出拳动作（KIT 与 ACCAD），每段的 `pose_aa` 都是根位置固定在 $(0,0,0.979)$ m、根朝向固定为单位四元数、两条腿取默认站姿（髋俯仰 −0.4、膝 0.8、踝 −0.4 rad），上身是重定向结果。训练时参考的关节角由 `pose_aa` 算出来（`torch_h1_humanoid_batch.py` 的 `fk_batch`），样例里的 `dof` 字段还保留着原始重定向的下身关节角，但不参与训练。**蹲姿版不在样例里**；完整的「筛过的 AMASS」要另外从 README 给的 cmu.box 链接下载（`amass_phc_filtered.pkl`）。

注意站姿版把**根的朝向也固定了**：人出拳时骨盆会扭，站姿版的骨盆不扭，同一拳在机器人身上就偏到了侧面（见[例 1](#实例-1-站姿版长什么样)）。

</details>

### 奖励：每一步的最高抬脚（表 15）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：以前的「腾空时间」「抬脚高度」会让机器人跺脚；新加一项只在落地时结算的奖励；论文与代码的写法相反</summary>

教师的奖励分三类（附录表 15）：**惩罚** 4 项（力矩越限 −2、关节位置越限 −125、关节速度越限 −50、终止 −250），**正则** 13 项，**任务** 7 项（关节位置 32、关节速度 16、刚体位置 30、VR 三个点的位置 50、刚体旋转 20、刚体速度 8、刚体角速度 8）。

以前的工作（ExBody、H2O）用「腾空时间」「抬脚高度」这类正则塑造下身动作，结果机器人为了保持平衡**原地跺脚**，而不是站住。OmniH2O 新加一项关键奖励「**每一步的最高抬脚**」：看这一步腾空时脚最高抬到多少，配上精心设计的课程（下一节），强化学习就能自己决定什么时候站、什么时候迈步——要么站住，要么迈大步。PMLR 定稿补了一句：这一项按每一步腾空时脚达到的最高高度给奖励，鼓励抬高脚。

**论文和代码的写法相反**：

| | 表达式 | 权重 |
|---|---|---|
| 论文表 15 | $\max\{h _ {\text{max}}-0.25,\ 0\}$ | +1000（抬过 0.25 m 才加分） |
| 官方代码 `_reward_feet_max_height_for_this_air` | $\max\{0.25-h _ {\text{max}},\ 0\}$，只在一只脚刚落地的那一步结算 | −2500（抬不到 0.25 m 就扣分） |

两者都只在落地时结算：站着不动、脚不落地，就既不加也不扣。代码的写法对小碎步最狠——每一步都扣；论文的写法如果照字面实现，迈步越高越加分，反而可能鼓励跺脚（我们的推测）。另外，代码里的 $h _ {\max}$ 是**踝关节连杆原点**离地的高度，站立时它就有 0.068 m，所以 0.25 m 相当于脚底要抬起约 0.18 m。

表 15 和代码的其他出入：绊脚表里写 −0.00125，代码是 $-1000\times1.25=-1250$（差了六个数量级，应是表里的笔误）；「腾空时间」在代码里只在参考动作的根部水平速度超过 0.1 m/s 时才给；足底接触力在代码里罚的是超过 500 N 的部分；刚体位置那一项代码分上下身，下身权重 0.5、$\sigma=0.5$，上身权重 1、$\sigma=0.03$；刚体旋转、速度、角速度三项都按全身算。所有权重在 Legged Gym 里还要乘 dt = 0.02。

</details>

### 惩罚课程：从一半开始罚（附录 F）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：负奖励乘系数 s；回合平均长度 < 40 步就 × 0.9999，> 120 步就 × 1.0001；s 从 0.5 起、上限 1；代码的步长、阈值、范围都不同</summary>

惩罚和正则一开始就给满，强化学习会被罚得不敢动、回合很快结束。论文把累计折扣奖励改成
$$\mathbb E\Big[\sum _ {t=1}^T\gamma^{t-1}\sum_i s _ {t,i}\,r _ {t,i}\Big],\qquad s _ {t,i}=\begin{cases}s _ {\text{current}} & r _ {t,i}<0\\ 1 & r _ {t,i}\ge 0\end{cases}$$
即每一项**负**奖励乘一个系数，正奖励不乘。系数动态调整：回合平均长度短于 40 步就乘 0.9999，长于 120 步就乘 1.0001；初值 0.5，上限 1。先在不怎么罚的条件下学会别摔，回合变长了再慢慢加罚，降低强化学习探索的难度。从 0.5 涨到 1 要连乘 $\ln2/\ln1.0001\approx6932$ 次。

**官方代码**（`legged_robot.py` 的 `_update_penalty_curriculum`，README 的命令带 `rewards.penalty_curriculum=True rewards.penalty_scale=0.5`）：

| | 论文 | 代码 |
|---|---|---|
| 每次乘 | 0.9999 / 1.0001 | $1\mp10^{-5}$（`level_degree`） |
| 阈值 | 40 / 120 步 | 50 / 120 步 |
| 范围 | ≤ 1 | 0.25–1 |
| 乘哪些项 | 所有负的项 | 名单 `penalty_reward_names` 里的项（含正的「腾空时间」），不管正负 |
| 回合平均长度 | — | 最近约 1 万个回合的滑动平均 |

按代码的步长，从 0.5 涨到 1 要约 69,315 次。每一次环境重置（有回合结束）就更新一次。

</details>

### 域随机化（表 16）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：摩擦、质心、连杆质量、PD 增益、力矩噪声、控制延迟、参考偏移、推一把、地形</summary>

| 项 | 范围 |
|---|---|
| 摩擦 | $\mathcal U(0.2, 1.1)$ |
| 躯干质心偏移 | $\mathcal U(-0.1, 0.1)$ m |
| 连杆质量 | $\mathcal U(0.7, 1.3)\times$ 默认 |
| P / D 增益 | 各 $\mathcal U(0.75, 1.25)\times$ 默认 |
| 力矩 RFI | $0.1\times$ 力矩上限 |
| 控制延迟 | $\mathcal U(20, 60)$ ms |
| 参考动作偏移 | $\mathcal U([-0.02,0.02],[-0.02,0.02],[-0.1,0.1])$（表里写 cm） |
| 推一把 | 每 5 s，$v _ {xy}=1$ m/s |
| 地形 | 平地、粗糙、低矮障碍 |

**官方代码**（`domain_rand_teleop.yaml`、`legged_robot.py`）：摩擦写成 $[-0.6, 1.2]$（H2O 也一样）；连杆质量只随机骨盆、两侧各 3 个髋部连杆和躯干，共 8 个连杆；P / D 增益和 RFI 每个回合、每个关节各随机一次，RFI 再乘 0.5–1.5 的系数；控制延迟是动作队列延后 0–3 个策略步；参考偏移的单位其实是米，每个回合随机一次，加在观测里的目标上（参考位置那一项只给头加，代码注释 `head only for now`）；地形比例是平地 20%、粗糙 60%、低矮障碍 20%。

</details>

### 特权教师：913 维（附录表 4）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：23 个刚体的位置、旋转、速度、角速度 + 与下一帧参考的差 + 参考本身；本体感受 361、目标 552</summary>

真机上拿不到很多仿真里有的信息（比如每个连杆的全局线速度、角速度）；遥操作的输入又可能很**稀疏**（VR 只知道头和双手），强化学习难以优化。所以先训一个用特权信息的教师 $\pi _ {\text{privileged}}(\mathbf a_t\mid\mathbf s^{\text{p-privileged}}_t,\mathbf s^{\text{g-privileged}}_t)$，再蒸馏到状态空间受限的学生——前人工作（四足的 teacher–student）和本文的实验都表明，特权状态能帮强化学习找到更好的解。

- 本体感受 $\mathbf s^{\text{p-privileged}}_t\triangleq[\mathbf p_t,\boldsymbol\theta_t,\dot{\mathbf q}_t,\boldsymbol\omega_t,\mathbf a _ {t-1}]$：刚体位置、旋转、线速度、角速度、上一步动作；
- 目标 $\mathbf s^{\text{g-privileged}}_t\triangleq[\hat{\boldsymbol\theta} _ {t+1}\ominus\boldsymbol\theta_t,\ \hat{\mathbf p} _ {t+1}-\mathbf p_t,\ \hat{\mathbf v} _ {t+1}-\mathbf v_t,\ \hat{\boldsymbol\omega} _ {t}-\boldsymbol\omega_t,\ \hat{\boldsymbol\theta} _ {t+1},\ \hat{\mathbf p} _ {t+1}]$：所有刚体与下一帧参考的一帧之差，加参考姿态本身（PMLR 定稿把角速度那一项改成了 $\hat{\boldsymbol\omega} _ {t+1}$）。

维数（代码 `v-teleop-extend-max-full`，23 个刚体 = 20 个连杆 + 两手 + 头；旋转用 6 维的切向—法向表示）：本体感受 $66+138+69+69+19=361$（位置去掉了根，22 × 3），目标 $69+138+69+69+69+138=552$，合计 **913** 维。arXiv v1 的表 4 把这些行名写乱了（写成 Motion goal DoF position 66 之类），PMLR 定稿改成了「(Proprioception) Rigid Body position 66 …」；图 3 里标的正是 361 和 552。

</details>

### 学生：头和双手 3 个点 + 25 步历史（1665 维）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目标 27 维；本体感受只放真机拿得到的，叠 25 步历史，不放全局线速度；代码里头和手怎么来</summary>

学生 $\pi _ {\text{OmniH2O}}(\mathbf a_t\mid\mathbf s^{\text{p-real}}_t,\mathbf s^{\text{g-real}}_t)$ 是真正部署的策略。

**目标**：$\mathbf s^{\text{g-real}}_t\triangleq(\tilde{\mathbf p}^{\text{real}}_t-\mathbf p^{\text{real}}_t,\ \tilde{\mathbf v}^{\text{real}}_t-\mathbf v^{\text{real}}_t,\ \tilde{\mathbf p}^{\text{real}}_t)$，上标 real 指 VR 头显给得出的 3 个点（头和双手）。附录表 6 写的是 27 维 = 3 个点 × 3 种量 × 3 维。**代码**（`v-teleop-extend-vr-max-nolinvel` → `compute_imitation_observations_teleop_max`）里的三种量是：位置差、参考位置（相对机器人骨盆）、参考速度，都转到只转偏航的朝向坐标系；论文写的第二项「速度差」在代码里是参考速度本身。

**本体感受**：$\mathbf s^{\text{p-real}}_t\triangleq(\mathbf d _ {t-25:t},\ \dot{\mathbf d} _ {t-25:t},\ \boldsymbol\omega^{\text{root}} _ {t-25:t},\ \mathbf g _ {t-25:t},\ \mathbf a _ {t-26:t-1})$：关节位置、关节速度、根角速度、投影重力、上一步动作，每步 $19+19+3+3+19=63$ 维，当前一步加 25 步历史。单步 $63+27=90$ 维，合计 $90+25\times63=\mathbf{1665}$ 维（图 3 写作 26 步 × 63 = 1638，再加 27）。

**不放全局线速度**：H2O 的观测里要根部线速度，测试时只能靠动捕；OmniH2O 让策略从历史里隐式地推出速度，去掉了动捕，在野外也能部署。历史也让策略更鲁棒。

**头和手在 H1 身上都没有**：代码（`legged_robot.py` 的 `extend_body_pos`）里的「手」是肘连杆坐标系里 $(0.3, 0, 0)$ 的一点，「头」是骨盆坐标系里 $(0, 0, 0.75)$ 的一点。还有一个安全细节：头的目标在水平方向离机器人根部超过 1 m 时，代码把它拉回 1 m 以内（`asset.clip_motion_goal`）。

</details>

<div class="paper-demo" data-demo="omnih2o-points" id="demo-points"><p class="demo-fallback">（本节含交互演示：三个点浏览器，需要启用 JavaScript）</p></div>

### DAgger 蒸馏

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学生自己开，在学生走到的状态上算特权观测、问教师，损失是动作的均方差；代码只用模仿损失</summary>

照 DAgger：每个回合在仿真里让**学生** $\pi _ {\text{OmniH2O}}$ 自己开，得到 $(\mathbf s^{\text{p-real}} _ {1:T},\mathbf s^{\text{g-real}} _ {1:T})$；用参考姿态 $\hat{\mathbf q} _ {t+1}$ 和仿真状态算出特权观测 $(\mathbf s^{\text{p-privileged}}_t,\mathbf s^{\text{g-privileged}}_t)$，问教师得到参考动作 $\mathbf a^{\text{privileged}}_t$，用
$$\mathcal L=\lVert\mathbf a^{\text{privileged}}_t-\mathbf a_t\rVert_2^2$$
更新学生。数据来自学生自己走出的分布，犯了错也有老师在那个状态上纠正——这是 DAgger 和普通行为克隆的区别。

**官方代码**（`rsl_rl/algorithms/ppo.py`、README 的蒸馏命令）：`train.distill=True train.dagger.dagger_only=True`，只用模仿损失、不加 PPO 损失；学生的初始动作噪声 0.001（表 18 的 Init noise std (DAgger)）；蒸馏时不加观测噪声（`noise.add_noise=False`）；损失写的是 `torch.norm(pred_action - gt_action, dim=-1).mean()`，即**不带平方**的 L2 范数取平均。

</details>

### 灵巧手

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：VR 估出的手部姿态 → 逆运动学 → 现成的手部底层控制器；手和手腕不经过策略</summary>

用 VR（Open-TeleVision、VisionProTeleop）估出的手部姿态，直接用逆运动学算出关节目标，交给现成的手部底层控制器。附录 A：手指和手腕的控制不需要推理，直接从 Vision Pro 的数据映射到机器人的关节。论文说手部姿态估计也可以换成动捕手套或 RGB 摄像头。官方仓库给了 Inspire 手（`hardware_code/inspire_hand.cpp`，走 Unitree SDK）和达妙腕部电机（`hardware_code/damiao_wrist.cpp`）的 C++ 控制代码。

</details>

### 训练设置（附录表 18 与官方代码）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PPO / DAgger 超参数、PD 增益、50 Hz 策略</summary>

表 18：batch size 64、$\gamma=0.99$、学习率 0.001、clip 0.2、熵系数 0.005、最大梯度范数 0.2、value loss 系数 1、初始动作噪声 RL 1.0 / DAgger 0.001、每次 5 个 epoch、MLP $[512, 256, 128]$。

官方代码：4096 个环境；仿真步长 0.005 s、每 4 步出一次动作（策略 50 Hz）；目标角 = 默认角 + 0.25 × 动作；PD 增益 髋 200、膝 300、踝 40、躯干 300、肩和肘 100（阻尼 5 / 6 / 2 / 6 / 2）；默认站姿 髋俯仰 −0.4、膝 0.8、踝 −0.4 rad。训练教师的 README 命令：`env.num_observations=913 motion.teleop_obs_version=v-teleop-extend-max-full rewards=rewards_teleop_omnih2o_teacher rewards.penalty_curriculum=True rewards.penalty_scale=0.5`；蒸馏学生：`env.num_observations=1665 motion.teleop_obs_version=v-teleop-extend-vr-max-nolinvel env.add_short_history=True env.short_history_length=25 train.distill=True train.policy.init_noise_std=0.001`。

</details>

<div class="paper-demo" data-demo="omnih2o-reward" id="demo-reward"><p class="demo-fallback">（本节含交互演示：抬脚奖励与惩罚课程，需要启用 JavaScript）</p></div>

---

## 📊 实验结果（第 4 节）

论文问了三个问题：**Q1** 仿真和真机里能不能准确跟踪动作？**Q2** 能不能接多种控制接口、解锁新的移动操作能力？**Q3** 能不能用 OmniH2O 采数据、从遥操作示范学自主？

### 表 1：仿真里，学生追上老师（Q1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学生 94.10%、教师 94.77%、H2O 87.52%；不用 DAgger 只有 47.11%</summary>

评测在加了站姿 / 蹲姿版的 AMASS 重定向数据 $\hat{\mathbf Q}$（约 1.4 万段）上；成功率沿用 PHC 的定义：任何时刻与参考的平均偏差超过 0.5 m 就算失败。另有全局 / 局部 MPJPE（mm）、加速度误差（mm/帧²）、速度误差（mm/帧）。PMLR 定稿补了一句表注：所有变体都用完全相同的奖励、域随机化和数据。

| 方法 | 维度 | 能上真机 | 成功率 | 全局 MPJPE | MPJPE | 加速度 | 速度 |
|---|---|---|---|---|---|---|---|
| 特权教师 | 913 | ✗ | 94.77% | 126.51 | 70.68 | 3.57 | 6.20 |
| H2O | 138 | ✓ | 87.52% | 148.13 | 81.06 | 5.12 | 7.89 |
| **OmniH2O** | 1665 | ✓ | **94.10%** | **141.11** | **77.82** | **3.70** | **6.54** |
| (a) 不用 DAgger、无历史 | 90 | ✗ | 90.62% | 163.44 | 91.29 | 5.12 | 8.80 |
| (a) 不用 DAgger | 1665 | ✗ | 47.11% | 223.27 | 128.90 | 15.03 | 16.29 |
| (a) 无历史（DAgger） | 90 | ✓ | 93.80% | 141.21 | 78.52 | 3.74 | 6.62 |

学生只比教师低 0.67 个点，比 H2O 高 6.58 个点。**DAgger 是关键**：直接用强化学习训 1665 维的学生只有 47.11%，论文的解释是历史让输入复杂度指数增长，强化学习处理不了；但历史对真机必不可少（鲁棒性、隐式的速度信息），监督学习能用好它。有意思的是，去掉历史时直接 RL 反而有 90.62%。

</details>

### 表 1：历史、结构、跟踪点、线速度——仿真里差别都不大

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：25 步历史最好；MLP 比 GRU / LSTM 好；3 个点只比 22 个点低 0.62 个点；线速度在仿真里没好处</summary>

| 消融 | 维度 | 成功率 | 全局 MPJPE |
|---|---|---|---|
| (b) 历史 0 步 | 90 | 93.80% | 141.21 |
| (b) 历史 5 步 | 405 | 93.60% | 139.23 |
| (b) **历史 25 步** | 1665 | **94.10%** | 141.11 |
| (b) 历史 50 步 | 3240 | 93.56% | 141.51 |
| (b) GRU | 90 | 92.85% | 147.67 |
| (b) LSTM | 90 | 91.03% | 147.36 |
| (c) 22 个点 | 1836 | 94.72% | 127.71 |
| (c) 8 个点 | 1710 | 94.31% | 129.30 |
| (c) **3 个点** | 1665 | 94.10% | 141.11 |
| (d) 加线速度 | 1743 | 93.80% | 138.18 |

- 25 步在性能和学习效率之间最平衡；用 MLP 叠历史比 GRU、LSTM 好。
- 3 个点的成功率和 22 个点差不多，牺牲的是全身姿态的精度（全局误差多 13.4 mm），换来商用 VR 就能用。
- 线速度在仿真里不提升性能，但会给真机部署带来大麻烦（下一节），所以去掉。

代码里「8 个点」「22 个点」都会自动再加上头（`extend_head=True`），README 的命令是 1719 维和 1845 维（「23-point」），和表里的 1710、1836 对不上（见[例 4](#实例-4-观测有多少维)）。

</details>

### 表 2：真机才看得出（Q1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：20 段站立动作；全局误差 87.33 → 47.94 mm；VIO 线速度的版本摔倒；历史 0 步 83.26 mm</summary>

真机上测 20 段**站立**动作（实验室空间有限，真机上难做大规模评测）：

| 方法 | 维度 | 全局 MPJPE | MPJPE | 加速度 | 速度 |
|---|---|---|---|---|---|
| H2O | 138 | 87.33 | 53.32 | 6.03 | 5.87 |
| **OmniH2O** | 1665 | **47.94** | 41.87 | **1.84** | **2.20** |
| (a) 线速度用 VIO（ZED SDK） | 1743 | 摔倒，测不完 | — | — | — |
| (a) 线速度用 MLP 估 | 1743 | 50.93 | 42.47 | 2.16 | 2.26 |
| (a) 线速度用 GRU 估 | 1743 | 49.75 | 42.38 | 2.20 | 2.31 |
| (b) 历史 0 步 | 90 | 83.26 | 46.00 | 4.86 | 4.45 |
| (b) 历史 5 步 | 405 | 62.18 | 46.50 | 2.66 | 2.90 |
| (b) 历史 50 步 | 3240 | 50.24 | **40.11** | 2.37 | 2.71 |
| (b) LSTM | 90 | 87.00 | 46.06 | 3.89 | 3.88 |

- VIO 估的线速度噪声很大（附录图 8，灰线），放进观测的策略在真机上摔倒了；神经网络估计器（在仿真里用根部线速度监督训练，官方代码 `rsl_rl/modules/velocity_estimator.py`）也不如干脆不给。
- 历史 25 步最好；**仿真里 0 步和 25 步只差 0.3 个点，真机上全局误差差了 74%**。LSTM 在真机上和 H2O 差不多。
- 论文没说 H2O 在这个真机测试里的线速度从哪来（我们的疑问）。

</details>

<div class="paper-demo" data-demo="omnih2o-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 1、表 2、表 3，需要启用 JavaScript）</p></div>

### 一个策略，接各种接口（Q2，图 1、4、5、10）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：VR 和 RGB 遥操作；接 MDM 用语言控制；拳打脚踢与户外地形下的鲁棒性</summary>

下面所有能力用的都是**同一个**跟踪策略 $\pi _ {\text{OmniH2O}}$：

- **遥操作**（图 1a、图 10）：VR 和 RGB 摄像头都行。图 1a 里有打网球、乒乓、羽毛球、浇花、写毛笔字、蹲下拿篮子、拳击、把篮子放上架子、推车上取放。
- **语言**（图 4）：接上预训练的文本生成动作模型 MDM，说「挥左手」「挥右手」「做个 T 字」「抱抱自己」「往前走 0.5 米」「往右转」，MDM 生成的动作目标交给 OmniH2O 跟踪。
- **鲁棒性**（图 5）：站着或用手柄控制前后走时，被人从各个角度拳打脚踢，不借外力自己站稳；户外的草地、坡、碎石路也能走。

</details>

### GPT-4o 当大脑（Q3，图 6、附录 L）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：头上的摄像头拍图给 GPT-4o，让它选动作原语；也可以让它直接回手的位置</summary>

把 OmniH2O 接上 GPT-4o：头上的摄像头拍第一人称图像给 GPT-4o，提示里给几个动作原语让它选。选原语而不是直接生成动作目标，是因为 GPT-4o 回复比较慢。图 6：看靶的颜色出对应的拳（蓝靶左拳、红靶右拳），看人的姿势握手、拥抱、挥手道别。

附录 L 的拳击提示要它只回答 A / B / C，还特意提醒「你自己戴着蓝色左拳套、红色右拳套，别把它们当成靶」。附录还给了一个直接生成目标的提示：回复 6 个数，表示左右手相对骨盆的位置，默认静止位置是 $(0.2, 0.2, 0.2, 0.2, -0.2, 0.2)$；图 3 里的提示写的是 9 个数（多了头的位置）。

</details>

### OmniH2O-6 与从示范学自主（Q3，表 3、表 17、图 7、图 11）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：6 个任务约 40 分钟；扩散策略输出运动目标、交给跟踪策略；DDPM 8/10、BC 1/10；输出 8 步、数据越多越好</summary>

**数据集**：用 VR 遥操作采了 6 个任务——接住扔掉（Catch-Release）、下蹲（Squat）、石头剪刀布（Rock-Paper-Scissors，正文误写成 Rope-Paper-Scissors）、接锤子（Hammer-Catch）、拳击（Boxing）、篮子取放（Basket-Pick-Place，正文误写成 Pasket）。每帧记录头部相机的 RGBD 图像、H1 头和双手相对根的运动目标、电机的关节目标，30 Hz。正文说简单任务各约 5 分钟、接锤子和篮子取放各约 10 分钟，共约 40 分钟；附录 J 给的帧数合计 73,462 帧 ≈ 40.8 分钟（逐任务见[例 10](#实例-10-omnih2o-6-有多少数据)）。官方 README 的硬件图显示录第一人称画面的是头上的 RealSense 435。

**模仿学习**：$\pi _ {\text{LfD}}(\hat{\mathbf p}^{\text{Sparse-lfd}} _ {t:t+\phi}\mid\mathbf I_t)$ 看一张图 $\mathbf I_t$，输出未来 $\phi$ 帧的运动目标（含灵巧手的指令），再由 $\pi _ {\text{OmniH2O}}$ 算关节动作。比起直接输出关节动作，这样复用了跟踪策略学好的运动技能，需要的示范少得多。

表 3（接住扔掉、下蹲、接锤子、石头剪刀布 4 个任务，各 10 次的平均）：

| 消融 | 设置 | 平均 MSE | 成功 |
|---|---|---|---|
| (a) 数据量 | 25% / 50% / 100% | 1.30e-2 / 7.48e-3 / 5.25e-4 | 4 / 6.5 / 8 次 |
| (b) 序列 | 单帧图→单步 / 4 帧图→8 步 / 单帧图→8 步 | 4.89e-4 / 9.91e-4 / 5.25e-4 | 6.5 / 8.75 / 8 次 |
| (c) 算法 | BC / DP-DDIM / DP-DDPM | 5.63e-3 / 1.9e-3 / 5.25e-4 | 1 / 7.75 / 8 次 |

两个结论：扩散策略远好于 ResNet 的普通 BC；一次预测一串动作对学会轨迹很关键。默认设置（表 19）：观测 1 帧、动作 8 步、预测 16 步、扩散迭代 100 次、batch 32。附录表 17 有逐任务的数，表 3 里有两处和它对不上（见[例 9](#实例-9-读表-3-与表-17)）。

</details>

### 真机系统（附录 A、官方 README）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两台 Orin NX：一台跑 ZED 里程计和收 VR 目标，一台跑策略和底层；延迟约 20 ms</summary>

两种计算配置，效果相近、交替使用：

1. 机器人背上两台 16GB Orin NX。第一台接腰上的 ZED 相机（60 Hz）算机器人自己的位置，并通过 Wi-Fi 接收 Vision Pro 的运动目标；第二台是主控：用目标跑策略（50 Hz），把电机指令发给机器人；手指和手腕直接从 Vision Pro 数据映射。两台用网线、共享一个 ROS 网络，整套延迟只有约 20 ms。这样分是因为 ZED 很吃算力。
2. 一台笔记本（i9-13900HX、RTX 4090、32GB 内存）通过 ROS 统一处理 ZED、策略和 Vision Pro。

注意：策略的观测里没有线速度，但 VR 给的是人在世界里的位置，要换到机器人坐标系，还是得知道机器人的根在哪——这就是 ZED 视觉惯性里程计的用处，也是第 5 节的第一条局限。官方 README 的硬件图里，Orin NX #1 负责「视觉 + IMU 里程计」「Wi-Fi 收运动目标」，#2 负责「策略推理」「H1 底层控制」「灵巧手和手腕底层控制」「头部 RGB 的串流与记录」；里程计脚本是 `hardware_code/zed_odometry.py`（ZED Mini）。

</details>

---

## ⚠️ 局限与讨论（第 5 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：要靠根部里程计换坐标；没有安全保证；稀疏的上身目标上不了楼梯；模仿学习还要更多传感器</summary>

论文自己列的：

1. **要靠机器人的根部里程计**，把遥操作接口给的姿态换到机器人坐标系；VIO 的结果有噪声，甚至不连续，目标就会偏离想要的控制。
2. **安全**：策略很鲁棒，但没有保证、也没有安全检查，极端的外力或分布外的目标（比如目标大幅跳变）都没处理。
3. 遥操作系统的设计：只给稀疏的上身目标，怎样让人形**上楼梯**，留给以后。
4. 从示范学：加更多传感器（激光雷达、腕部相机、触觉）和更好的学习算法。

我们读代码时的补充（都是我们的观察）：

- 官方只放出站姿版的出拳样例，「蹲姿版」不在样例里，完整数据要另外下载；
- 抬脚奖励的正负、绊脚的权重、课程的步长 / 阈值 / 范围、DAgger 损失的形式、观测里「速度差」与「参考速度」，代码和附录都有出入；
- 「8 个点」「22 个点」在代码里会自动加上头，维数和表 1 不同；
- 头的目标被拉回 1 m 以内是一条没写进论文的安全措施。

</details>

---

## 🚶 具体实例：用官方样例的一段出拳从头走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：环境设定 / 例 1 站姿版长什么样 / 例 2 蹲姿版与原始重定向 / 例 3 第 2.40 s 的 27 维目标 / 例 4 观测有多少维 / 例 5 一步的抬脚分数 / 例 6 惩罚课程要乘多少次 / 例 7 读表 1 / 例 8 读表 2 / 例 9 读表 3 与表 17 / 例 10 OmniH2O-6 有多少数据</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **数据**：官方仓库的 `legged_gym/resources/motions/h1/stable_punch.pkl`（README 里训练教师和学生的命令都用它）。29 段 AMASS 里的出拳（KIT 与 ACCAD 两个子集），共 3,899 帧（30 fps，约 130 s）；每段有 `root_trans_offset`、`pose_aa`（22 × 3，根 + 19 个关节 + 两只手）、`dof`（19）、`root_rot`、`smpl_joints`（24 × 3，人的 SMPL 关节）、`fps`。
- **这一段**：`0-KIT_572_punch_left01_poses`，208 帧（6.93 s）：先站着，第 1.3 s 起抬手护头，第 2.1–2.9 s 左脚上一步、左拳打出去，第 3.2 s 起收回，第 4.3 s 放下手。取第 1.00–4.93 s（原 30 fps 的第 30–148 帧）隔帧抽成 15 fps，共 60 帧。
- **H1 模型**：官方仓库 `resources/robots/h1/h1.xml` 做正运动学；渲染用 Robot Retarget Online 仓库里的 MuJoCo Menagerie `unitree_h1/h1.xml`，两者 50 组随机姿态的正运动学逐位相同。
- **我们自己做的**：蹲姿版（例 2）和「原始重定向」的近似还原（例 2）；这两样论文和样例都没有。第 2.40 s 的例子里「机器人落后参考 0.2 s」是假设。

<h3 id="实例-1-站姿版长什么样">例 1：站姿版长什么样</h3>

样例每一帧的 `pose_aa`：根在 $(0, 0, 0.979)$ m，根旋转为 0（朝 $+x$），两条腿都是 髋偏航 0、髋横滚 0、髋俯仰 −0.4、膝 0.8、踝 −0.4 rad，上身 9 个关节是重定向结果。按这个姿态做正运动学，脚底网格的最低点在 $z=-2.4$ mm——根高 0.979 m 正好让默认站姿的脚落地。

同一帧（第 2.40 s）样例的 `dof` 字段里，左腿是 $(0.430, -0.013, -0.575, 0.433, -0.400)$：髋偏航顶在 0.43 的限位上，这是原始重定向的下身。训练时参考关节角由 `pose_aa` 算，`dof` 的下身不参与训练。

站姿版连**根的朝向**也固定了。第 2.67 s 左拳打到最远时，站姿版的左手在 $(0.138, 0.819, 1.551)$ m——打向了身体**左侧**。原因：人出这一拳时骨盆扭了约 68°（我们还原的根部偏航从 166.9° 变到 98.6°，见例 2），站姿版的骨盆不扭，上身的关节角照搬，这一拳就偏到了侧面。对 VR 遥操作来说这无所谓（目标是手的位置），但说明站姿版并不是「人在原地做同样的动作」。

<h3 id="实例-2-蹲姿版与原始重定向">例 2：蹲姿版与原始重定向（我们做的）</h3>

**蹲姿版**：两条腿改成 髋俯仰 −0.8、膝 1.6、踝 −0.8 rad（髋 + 膝 + 踝 = 0，上身直立时脚掌是平的），根降到 0.7995 m，脚底最低点 $z=-2.1$ mm；上身和根的朝向照搬站姿版。

**原始重定向**：样例的 `dof` 字段是原始重定向的 19 个关节角，但根已经被固定了。我们照官方 `grad_fit_h1.py` 的 11 对点（骨盆、两膝、两踝、两肩、两肘、两手 ↔ SMPL 的对应关节），把关节角固定为 `dof`、只对每一帧的根旋转和根位置做最小二乘，用样例里存的 SMPL 关节当目标。全段 208 帧 11 对点的平均距离 **44.3 mm**（各对：骨盆 53.1、左膝 54.0、左踝 16.0、右膝 94.5、右踝 8.2、左肩 78.9、左肘 32.0、左手 29.0、右肩 88.1、右肘 12.5、右手 21.4 mm）——距离不大，说明 `dof` 确实是这一段的重定向结果。还原出的根部偏航从第 1.00 s 的 166.9° 变到第 2.67 s 的 98.6°。显示时整段绕竖轴转、平移，让第一帧朝 $+x$、根在原点，再整体抬高 0.0422 m 让最低的脚底落地。

<h3 id="实例-3-第-240-s-的-27-维目标">例 3：第 2.40 s 的 27 维目标</h3>

取第 2.40 s（15 fps 的第 21 帧）的站姿版当参考，假设机器人落后 0.2 s（3 帧，正在做第 2.20 s 的姿态）、根在同一处。站姿版的骨盆不扭，朝向坐标系就是世界坐标系；参考速度用 15 fps 的中心差分（我们的近似）。

| 点 | 位置差 $\tilde{\mathbf p}-\mathbf p$ (m) | 参考位置（相对骨盆，m） | 参考速度 (m/s) |
|---|---|---|---|
| 左手 | $(0.017, 0.368, 0.076)$ | $(0.238, 0.677, 0.468)$ | $(-0.232, 1.777, 1.110)$ |
| 右手 | $(-0.049, 0.013, -0.029)$ | $(0.192, -0.004, 0.358)$ | $(-0.337, -0.068, -0.038)$ |
| 头 | $(0, 0, 0)$ | $(0, 0, 0.750)$ | $(0, 0, 0)$ |

左手这时正往左上方打出去，速度约 2.11 m/s，机器人的左手还要往左移 0.37 m。头的参考就是骨盆往上 0.75 m，站姿版里它一直不动。代码里的排列是 [3 个点的位置差, 3 个点的参考位置, 3 个点的参考速度]，9 + 9 + 9 = 27 维。

<h3 id="实例-4-观测有多少维">例 4：观测有多少维</h3>

- 学生：一步本体感受 $19+19+3+3+19=63$；单步 $63+27=90$；合计 $90+25\times63=1665=26\times63+27$。
- 教师：本体感受 $66+138+69+69+19=361$，目标 $69+138+69+69+69+138=552$，合计 $913$。
- H2O：$19+19+3+3+3+72+19=138$（含线速度 3）。
- 加线速度：单步 93、每步历史 66，$93+25\times66=1743$。
- 表 1(c)：8 个点 $1575+63+72=1710$，22 个点 $1575+63+198=1836$。代码自动加上头：8 + 1 = 9 个点 $1575+63+81=1719$，20 + 3 = 23 个点 $1575+63+207=1845$（README 的命令就是这两个数）。

<h3 id="实例-5-一步的抬脚分数">例 5：一步的抬脚分数</h3>

按代码：一只脚这一步踝关节最高离地 $h _ {\max}=0.12$ m，落地时结算 $-2500\times(0.25-0.12)=-325$，乘 dt = 0.02 是 −6.5，再乘课程系数 $s=0.5$ 是 −3.25。抬到 0.30 m：代码 0 分；论文表 15 的写法 $+1000\times0.05=+50$（乘 dt 是 +1.0）。站着不动、脚不落地：都是 0。

动画第 4 幕的玩具：4 s 里小碎步 8 步、每步最高 0.12 m，累计 $8\times(-325)=-2600$；大步 4 步、每步 0.30 m，0；站住，0。

腾空时间（代码只在参考的根部水平速度 > 0.1 m/s 时给）：腾空 0.30 s，$1000\times(0.30-0.25)=+50$，乘 dt 是 +1.0；腾空 0.20 s 是 −1.0。站立时踝关节原点离地 0.068 m，要抬到 0.25 m 得再抬 0.182 m。

<h3 id="实例-6-惩罚课程要乘多少次">例 6：惩罚课程要乘多少次</h3>

论文：从 0.5 到 1 要 $\ln 2/\ln 1.0001=6931.8$，约 **6932** 次（回合平均长度一直超过 120 步的话）。代码：$\ln 2/\ln(1+10^{-5})\approx 69{,}315$ 次；反过来从 0.5 降到下限 0.25 也要约 69,314 次。回合长度按策略步数算，50 Hz 下 40 步 = 0.8 s、50 步 = 1.0 s、120 步 = 2.4 s。

<h3 id="实例-7-读表-1">例 7：读表 1</h3>

- 学生比教师低 $94.77-94.10=0.67$ 个点；比 H2O 高 $94.10-87.52=6.58$ 个点，全局误差 148.13 → 141.11 mm（−4.7%）。
- 不用 DAgger：47.11%，比 OmniH2O 低 46.99 个点。
- 历史 0 / 5 / 50 步分别低 0.30 / 0.50 / 0.54 个点；GRU、LSTM 低 1.25 / 3.07 个点。
- 22 个点比 3 个点高 0.62 个点，全局误差少 13.4 mm（3 个点比它多 10.5%）。
- 加线速度：成功率低 0.30 个点，全局误差少 2.93 mm。

<h3 id="实例-8-读表-2">例 8：读表 2</h3>

全局误差 87.33 → 47.94 mm，降了 45.1%。以 OmniH2O 的 47.94 mm 为基准：历史 0 步多 73.7%、5 步多 29.7%、50 步多 4.8%；MLP 估线速度多 6.2%、GRU 估多 3.8%；LSTM 87.00 mm，和 H2O 的 87.33 差不多。仿真里历史 0 步只比 25 步低 0.3 个点。

<h3 id="实例-9-读表-3-与表-17">例 9：读表 3 与表 17</h3>

表 3 是表 17 四个任务（接住扔掉、下蹲、接锤子、石头剪刀布）的平均。逐项核对：

| 设置 | 表 17 四个任务的成功次数 | 平均 | 表 3 |
|---|---|---|---|
| 25% 数据 | 1、9、3、3 | 4 | 4 ✓ |
| 50% 数据 | 3、10、6、9 | **7** | 6.5 ✗ |
| 100% / DP-DDPM / 单帧图 → 8 步 | 6、10、6、10 | 8 | 8 ✓ |
| 单帧图 → 单步 | 3、10、5、10 | **7** | 6.5 ✗ |
| 4 帧图 → 8 步 | 7、10、9、9 | 8.75 | 8.75 ✓ |
| BC | 0、3、0、1 | 1 | 1 ✓ |
| DP-DDIM | 6、10、5、10 | 7.75 | 7.75 ✓ |

平均 MSE 也有两处对不上：BC 按表 17 是 $5.28\times10^{-3}$（表 3 写 $5.63\times10^{-3}$），DP-DDIM 是 $7.18\times10^{-4}$（表 3 写 $1.9\times10^{-3}$）；其余五项一致。结论（扩散策略远好于 BC、输出 8 步更好、数据越多越好）不受影响。

<h3 id="实例-10-omnih2o-6-有多少数据">例 10：OmniH2O-6 有多少数据</h3>

附录 J 的帧数（30 Hz）：接住扔掉 13,234 帧 ≈ 7.35 分钟、下蹲 8,535 ≈ 4.74、接锤子 12,759 ≈ 7.09、石头剪刀布 9,380 ≈ 5.21、拳击 11,118 ≈ 6.18、篮子取放 18,436 ≈ 10.24；合计 73,462 帧 ≈ **40.8 分钟**。和正文的「简单任务约 5 分钟、接锤子和篮子取放约 10 分钟」比，接住扔掉其实有 7.35 分钟，接锤子只有 7.09 分钟。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入、怎么跑</summary>

<h3 id="源码-目录">目录</h3>

```
human2humanoid/
├── legged_gym/
│   ├── resources/motions/h1/stable_punch.pkl   # 官方样例：29 段出拳的站姿版
│   └── legged_gym/
│       ├── envs/base/legged_robot.py          # 观测（v-teleop-extend-max-full / -vr-max-nolinvel）、奖励、课程、终止、历史
│       └── cfg/                                # hydra：rewards_teleop_omnih2o_teacher.yaml、domain_rand_teleop.yaml、control_teleop.yaml…
├── rsl_rl/rsl_rl/
│   ├── algorithms/ppo.py                       # PPO + DAgger（dagger_only、kin_dict 里的 gt_action）
│   └── modules/velocity_estimator.py           # 表 2(a) 的神经网络线速度估计器
├── phc/phc/utils/
│   ├── torch_h1_humanoid_batch.py              # H1 正运动学：dof_pos 由 pose_aa 算
│   └── motion_lib_h1.py                        # 训练时按时间插值取参考
├── scripts/data_process/grad_fit_h1*.py        # 重定向（沿用 H2O）
└── hardware_code/                              # inspire_hand.cpp、damiao_wrist.cpp、zed_odometry.py
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码 |
|---|---|
| 稳定版：根固定、下半身站姿 / 蹲姿 | 样例只有站姿版：`pose_aa` 根 (0, 0, 0.979)、朝向不变、腿 −0.4 / 0.8 / −0.4；`dof` 字段保留原始下身但不用 |
| 每一步的最高抬脚：$+1000\cdot\max(h-0.25,0)$ | $-2500\cdot\max(0.25-h,0)$，$h$ 是踝关节连杆原点高度，只在落地时结算 |
| 绊脚 −0.00125 | −1250 |
| 惩罚课程：× 0.9999 / × 1.0001，40 / 120 步，≤ 1，乘所有负项 | × (1 ∓ 1e-5)，50 / 120 步，0.25–1，乘名单里的项（含正的腾空时间） |
| 教师目标 552 维（表 4 行名在 v1 里写乱） | `compute_imitation_observations_max_full`：位置差、旋转差、速度差、角速度差、参考位置、参考旋转 |
| 学生目标 = 位置差、速度差、参考位置 | 位置差、参考位置、参考速度（`compute_imitation_observations_teleop_max`） |
| 头和手 | 手 = 肘 + (0.3, 0, 0)，头 = 骨盆 + (0, 0, 0.75)；头的目标水平距离 > 1 m 时拉回 1 m |
| 8 / 22 个点：1710 / 1836 维 | 自动加头：1719 / 1845 维 |
| DAgger 损失 $\lVert\cdot\rVert_2^2$ | `torch.norm(...).mean()`（不带平方）；`dagger_only=True` |
| 参考偏移 $\mathcal U(\pm0.02,\pm0.02,\pm0.1)$ cm | 单位是米，每个回合随机一次，加在观测的目标上 |
| 摩擦 $\mathcal U(0.2,1.1)$ | $[-0.6, 1.2]$ |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 1. 特权教师（PPO）
python legged_gym/scripts/train_hydra.py --config-name=config_teleop task=h1:teleop run_name=OmniH2O_TEACHER \
  env.num_observations=913 env.num_privileged_obs=990 motion.teleop_obs_version=v-teleop-extend-max-full \
  motion=motion_full motion.extend_head=True num_envs=4096 asset.zero_out_far=False \
  asset.termination_scales.max_ref_motion_distance=1.5 motion.motion_file=resources/motions/h1/stable_punch.pkl \
  rewards=rewards_teleop_omnih2o_teacher rewards.penalty_curriculum=True rewards.penalty_scale=0.5
# 2. 学生（DAgger 蒸馏）：3 个点、25 步历史、无线速度
python legged_gym/scripts/train_hydra.py --config-name=config_teleop task=h1:teleop run_name=OmniH2O_STUDENT \
  env.num_observations=1665 env.num_privileged_obs=1742 motion.teleop_obs_version=v-teleop-extend-vr-max-nolinvel \
  motion.teleop_selected_keypoints_names=[] motion.extend_head=True ... \
  train.distill=True train.policy.init_noise_std=0.001 env.add_short_history=True env.short_history_length=25 \
  noise.add_noise=False train.dagger.load_run_dagger=TEACHER_RUN_NAME train.dagger.checkpoint_dagger=XXX train.dagger.dagger_only=True
# 完整的「筛过的 AMASS」：README 里的 cmu.box 链接下载 amass_phc_filtered.pkl，再用 motion.motion_file=... 覆盖
```

真机部署：Unitree SDK2；Vision Pro 走 VisionProTeleop / Open-TeleVision；RGB 姿态估计用 HybrIK；扩散策略参考 Diffusion Policy 与 HATO；里程计 `hardware_code/zed_odometry.py`。

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 H2O、PHC 与四足的教师—学生；下启 HOVER、TWIST 和人形的遥操作数据线</summary>

- **上承**：[H2O](../H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation/H2O_Learning_Human-to-Humanoid_Real-Time_Whole-Body_Teleoperation.html)（同组前作：重定向、仿真筛数据、8 个点的跟踪策略都从这里来）；[PHC](../../01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html) 与 [PULSE](../../01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.html)（成功率的定义、仿真人体模仿器）；[四足野外盲走](../Learning_Quadrupedal_Locomotion_over_Challenging_Terrain/Learning_Quadrupedal_Locomotion_over_Challenging_Terrain.html)（特权教师 + 本体感受历史的学生，论文引的 teacher–student 就是这条线）；[Diffusion Policy](../../01_Foundational_RL/Diffusion_Policy/Diffusion_Policy.html)（从 OmniH2O-6 学自主用的就是它）。
- **同期**：[Open-TeleVision](../../07_Teleoperation/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback.html)（OmniH2O 的手部姿态估计用了它）、[HumanPlus](../../07_Teleoperation/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)（同样从人的示范到人形技能，用 RGB 影子跟随）。
- **下启**：[MaskedMimic](../MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting/MaskedMimic_Unified_Physics-Based_Character_Control_Through_Masked_Motion_Inpainting.html)（仿真角色上「随机遮掉部分目标」的统一控制）与 [HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)（把 ExBody、H2O、OmniH2O 各自的命令空间统一进一个带掩码的策略，也是同组、也用教师—学生）；[TWIST](../../07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)（光学动捕的全身遥操作，同样教师看未来、学生只看当前目标和本体历史）；[ExBody2](../ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.html)。
- **工程意义**：「接口统一成运动学姿态 + 底层一个跟踪策略」的分层，后来被人形全身控制、遥操作采数据、VLA 接底层控制的工作反复沿用；「用本体感受历史代替要额外设备才拿得到的状态」「强化学习训不动的大输入，用 DAgger 蒸馏」也成了常见做法。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：OmniH2O 的「通用接口」到底是什么？**
A：运动学姿态 $\mathbf q_t=(\boldsymbol\theta_t,\mathbf p_t)$，部署时只用头和双手 3 个点的位置。VR、RGB、MDM、GPT-4o、扩散策略都只负责给出这 3 个点，底层是同一个跟踪策略；手指单独走逆运动学。好处是上层可以随便换，底层的运动技能复用。

**Q2：为什么要教师—学生，不直接训学生？**
A：学生的输入稀疏（3 个点）又要叠 25 步历史（1665 维），直接用强化学习训只有 47.11%。教师看 23 个刚体的全部状态（913 维），强化学习容易学好（94.77%）；再用 DAgger 在学生走到的状态上监督，学生能到 94.10%。

**Q3：为什么用 DAgger 而不是行为克隆？**
A：行为克隆只在教师的状态分布上学，学生一偏就没见过；DAgger 让学生自己开，在它走到的状态上问教师，纠正的正是学生会犯的错。官方代码只用模仿损失，学生初始噪声 0.001。

**Q4：去掉全局线速度，策略怎么知道自己走多快？**
A：从 25 步关节位置、关节速度、根角速度、重力、动作的历史里隐式推。表 2：用 VIO 线速度的版本在真机上摔倒，神经网络估的速度也不如不给（50.93 / 49.75 对 47.94 mm）；去掉历史误差变成 83.26 mm。注意 VR 目标换坐标仍要里程计，只是不进策略。

**Q5：「每一步的最高抬脚」解决了什么？**
A：H2O 一类策略为了平衡原地跺脚、挪小碎步。这项奖励只在落地时结算：代码里抬不到 0.25 m 就扣，站着不落地就不扣，所以策略要么站住、要么迈大步。论文表 15 写的是相反的「超过 0.25 m 才加分」。

**Q6：为什么数据要加站姿 / 蹲姿版？**
A：遥操作操作时大部分时间下身应该稳住，但 AMASS 里大量是走、跑、跳；只用原数据，策略学不会「只动上身、下身不动」（图 9）。给每段动作复制一份根固定、腿站或蹲的版本，把数据分布偏向站和蹲。

**Q7：OmniH2O 的模仿学习为什么输出运动目标而不是关节动作？**
A：输出 3 个点的运动目标，交给已经学会全身平衡的跟踪策略执行，40 分钟的示范就够学会 4 个任务（DDPM 8/10）；直接输出 19 个关节动作，要学平衡、要学任务，示范需求大得多。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-04-24 · 初读；2026-10-15 · 读代码和做复现时看到的四件事</summary>

- 初读的印象：卖点不是单个动作的跟踪精度，而是统一接口带来的覆盖面——遥操作、语言、GPT-4o、模仿学习都落到同一个底层策略上；遥操作不只是演示工具，也是采数据的工具。

第二版补充（都是我们的观察）：

1. **仿真看不出、真机看得出**：历史 0 步和 25 步在仿真里只差 0.3 个点，真机上全局误差差 74%；线速度在仿真里是真值、没坏处，真机上靠估就成了大麻烦。仿真消融的结论要谨慎外推。
2. **站姿版不只是「腿不动」**：样例里根的朝向也固定了，人出拳时骨盆扭了约 68°，机器人这一拳就打到了侧面。对跟踪手的位置无所谓，但它不是「人在原地做同样的动作」。
3. **奖励表要和代码一起看**：最高抬脚的正负、绊脚差六个数量级、课程的步长差十倍，照着表 15 和附录 F 复现会得到不同的东西。
4. **数据集的小账**：附录的帧数合计 40.8 分钟，和「约 40 分钟」一致，但逐任务的分钟数和正文说的「5 分钟 / 10 分钟」对不上；表 3 也有两项平均和表 17 对不上。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正、PMLR 定稿和 arXiv v1 的差别</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@inproceedings{he2024omnih2o,
  title     = {OmniH2O: Universal and Dexterous Human-to-Humanoid Whole-Body Teleoperation and Learning},
  author    = {He, Tairan and Luo, Zhengyi and He, Xialin and Xiao, Wenli and Zhang, Chong and Zhang, Weinan and Kitani, Kris and Liu, Changliu and Shi, Guanya},
  booktitle = {Proceedings of The 8th Conference on Robot Learning},
  series    = {Proceedings of Machine Learning Research},
  volume    = {270},
  pages     = {1516--1540},
  year      = {2025},
  note      = {arXiv:2406.08858}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

1. 3 个点能唯一确定全身姿态吗？下身怎么走全靠策略猜；上楼梯、跨障碍这类需要下身精确的任务，要么加点、要么加感知（HOVER 用掩码在不同点数之间切换）。
2. 稳定版的数据偏向站和蹲，会不会让行走类动作跟得更差？论文没给分开的数字。
3. DAgger 学生的上限是教师；教师在仿真里看真值，它学不会的（比如真机特有的扰动），学生也学不会。
4. 里程计仍是瓶颈：VR 的世界坐标要换到机器人坐标，VIO 跳变时目标会偏。能不能让策略直接吃相对目标、或把里程计误差也随机化进训练？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- **「数据集 OmniH2O-6 是面向全身控制的遥操示范」**：补上 6 个任务、帧数、记录内容（头部 RGBD、头和双手相对根的目标、关节目标，30 Hz）和约 40 分钟。
- **「教师可以看到接触状态、参考轨迹误差和环境信息」**：教师看的是 23 个刚体的位置 / 旋转 / 速度 / 角速度、与下一帧参考的差和参考本身（913 维），不是接触或环境信息；论文的域随机化也不进观测。
- **「学生接收本体感知输入和参考目标」**：补上 3 个点 × 3 种量 = 27 维、25 步历史、不放线速度（1665 维）这些关键设计，以及代码里头和手怎么来。
- **「VR 或 RGB 输入实时生成参考，底层负责跟踪；接入 GPT-4o 产生任务级目标」**：补上 GPT-4o 是选动作原语（因为回复慢）、也可以直接回手的位置；模仿学习是输出运动目标交给跟踪策略。
- **「通过大规模重定向与数据增强过滤违反约束的样本」**：数据增强指的是站姿 / 蹲姿版，过滤沿用 H2O 的仿真筛选；补上「每一步的最高抬脚」、惩罚课程、域随机化和 DAgger 这些旧版没提的方法。
- **实验**：旧版没有任何数字；补上表 1–3、表 17 的全部数字，以及我们核对出的两处对不上。
- **其他**：作者单位补上上海交通大学；补上真机系统（两台 Orin NX、ZED、Vision Pro、20 ms）、代码与论文的出入、PMLR 定稿的差别；新增用官方样例做的具体实例。

<h3 id="d-pmlr-定稿和-arxiv-v1-的差别">D. PMLR 定稿和 arXiv v1 的差别</h3>

PMLR 定稿（2024-10-16 生成的 PDF）和 arXiv v1 的数字完全一样，改的是：首页加了代码链接；「每一步的最高抬脚」补了一句解释；教师目标里角速度那一项从 $\hat{\boldsymbol\omega}_t-\boldsymbol\omega_t$ 改成 $\hat{\boldsymbol\omega} _ {t+1}-\boldsymbol\omega_t$；表 1 加了表注「所有变体用完全相同的奖励、域随机化和数据」；表 4 的行名从「Motion goal DoF position」等改成「(Proprioception) Rigid Body position」等，和代码一致。项目页的 PDF 和 arXiv v1 是同一个文件。

</details>

---

## 📎 参考来源

- arXiv：<https://arxiv.org/abs/2406.08858>（v1，2024-06-13，读的是 LaTeX 源码）
- PMLR：<https://proceedings.mlr.press/v270/he25b.html>
- 项目主页：<https://omni.human2humanoid.com/>（动画第 10、14–17 幕的真机片段剪自这里的视频）
- 代码：<https://github.com/LeCAR-Lab/human2humanoid>（`main`，2025-02-21；样例 `legged_gym/resources/motions/h1/stable_punch.pkl`）
- H1 模型与材质：[Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online) 仓库里的 MuJoCo Menagerie `unitree_h1`
