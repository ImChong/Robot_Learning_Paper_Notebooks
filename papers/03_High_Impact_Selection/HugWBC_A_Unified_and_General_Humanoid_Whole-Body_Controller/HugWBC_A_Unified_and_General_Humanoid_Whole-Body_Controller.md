---
layout: paper
title: "HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion"
category: "高影响力精选 High Impact Selection"
subcategory: "Whole-Body Control Core"
zhname: "HugWBC：面向多步态人形的统一通用全身控制器"
demos: ["hugwbc"]
---

# HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion
**命令里除了速度，还放进步频、最高抬脚、身高、身体俯仰、腰偏航和两只脚的相位：用相位偏移和固定相位切出走、跳、站（单脚跳另训一个策略），用正态分布的累积分布函数把「该不该触地」放松成连续的期望接地概率，再配上非对称 Actor-Critic、对称损失和「上身随时被均匀噪声接管」的干预训练；一个策略在 Unitree H1 上既能按命令变换步态和姿态，上身也能随时交给遥操作或别的控制器**

> 📅 阅读日期: 2026-05-17（2026-10-18 第二版：对照 arXiv v3 的 LaTeX 源码和官方仓库逐条核查重写，改正旧版几处说法；新增十六幕讲解动画、三个交互演示和配音视频）
>
> 🏷️ 板块: 03 High Impact Selection · 全身控制核心 · 命令空间 · 步态相位 · 干预训练
>
> ℹ️ 笔记对照 [arXiv 2502.03206](https://arxiv.org/abs/2502.03206) 的 v3（2025-04-12；读的是 arXiv 上的 LaTeX 源码：正文、附录、表 I–XI、图 1–8；和 v1 的数字一样，差别见[附录 C](#c-arxiv-v1-到-v3-的差别)）、[项目页](https://hugwbc.github.io/)和官方仓库 [apexrl/HugWBC](https://github.com/apexrl/HugWBC)（2026-10 的 `main`，最后一次提交 `eb831af`，2025-08-02）。代码和论文有好几处不一样（站立时的相位、抬脚目标、估计器、干预的重新抽样与切换），下文单独列出，都是我们读代码的结果。动画和「🚶 具体实例」里的 H1 是**按命令摆出来的运动学示意**（脚底高度照论文式 (8) 的目标），不是策略的输出，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2502.03206](https://arxiv.org/abs/2502.03206)（v1 2025-02-05，v2 2025-02-06，v3 2025-04-12） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2502.03206) |
| **项目主页** | [hugwbc.github.io](https://hugwbc.github.io/)（真机视频：步态切换、姿态、单脚跳、搬箱子、户外） |
| **代码** | [apexrl/HugWBC](https://github.com/apexrl/HugWBC)（Isaac Gym Preview 4 + legged_gym + rsl_rl，2025-06 开源训练代码；机构镜像 [InternRobotics/HugWBC](https://github.com/InternRobotics/HugWBC)） |
| **会议** | RSS 2025 |
| **作者** | Yufei Xue\*、Wentao Dong\*、Minghuan Liu^、Weinan Zhang、Jiangmiao Pang（\* 共同一作，^ 项目负责人） |
| **机构** | 上海交通大学、上海人工智能实验室 |
| **平台** | Unitree H1（19 个自由度：两个三自由度肩、两个肘、一个腰、两个三自由度髋、两个膝、两个踝）；仿真 Isaac Gym |
| **训练** | 一张 RTX 4090 训一个策略 16 小时（v3 新加的一句） |
| **关键词** | Humanoid whole-body control, command space, gait phase, expected contact probability, symmetry loss, intervention training |

**一行定位**：前面的 [HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html) 把各种接口看成全身模仿的子集，跟的是参考动作；HugWBC 不跟参考动作，跟的是**命令**：速度之外还能改步频、抬脚、身高、俯仰、腰和步态，上身则干脆交给外部控制器。

---

## 🎯 一句话总结

> HugWBC 把命令空间写成「**任务命令**（目标速度 $v_x, v_y, \omega$）× **行为命令**（步频 $f$、最高抬脚 $l$、身高 $h$、俯仰 $p$、腰偏航 $w$、相位偏移 $\psi$、两只脚的相位 $\phi_1, \phi_2$、支撑占比 $\phi _ {\text{stance}}$）」，一个策略管走、跳、站，上身还能随时交给别人。具体做法：每只脚一个相位，每步加 $f\,\mathrm dt$；走是 $\psi = 0.5$、跳是 $\psi = 0$、站是两只脚固定在 0.25、单脚跳是抬起的脚固定在 0.75；「该不该触地」用标准正态分布的累积分布函数放松成**期望接地概率** $C(\bar\phi)$，接触—摆动奖励和抬脚奖励都用它加权，抬脚目标是一段五次多项式；策略用**非对称 Actor-Critic**（critic 多看 24 维特权和 221 个地形高度，actor 只看 5 步本体感受历史、命令和干预标志）加 **对称损失**（$\beta = 0.5$）训练；**干预训练**让上身关节以 $p = 0.005$ 的概率在「策略自己摆」和「被均匀噪声接管」之间翻转，被接管时上身的正则奖励不算，噪声的比例 $\alpha$ 按速度奖励自适应地加大，并行的机器人分成敏捷组和干预组。结果：走路低速 $v_x$ 误差 0.030 m/s（表 III），走路时七项都比 HOVER、ExBody 低（表 XI，基线是在做它们本来不擅长的事）；上身被噪声接管时，不做干预训练的策略 $v_x$ 误差 0.866 m/s，HugWBC 0.048（表 IV）；站着调姿态时一回合两只脚只挪 0.02–0.09 m，不干预的 17.5–25.7 m（表 V）；真机俯仰、腰的误差 0.055–0.101 rad（表 VI）。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十六幕动画：HugWBC 全流程](#hugwbc-explainer-anim) —— 约 256 秒串完「人会的，人形还做不到 → 命令空间：任务 + 行为 → 相位：切换四种步态 → 期望接地概率 → 非对称 Actor-Critic → 奖励（一）：速度与姿态 → 奖励（二）：着地与抬脚 → 对称损失 → 干预训练 → 噪声课程与两组机器人 → 单个命令跟得多准（表 III）→ 命令能不能随便组合（图 8）→ 干预训练的消融（表 IV）→ 站着干活与抗推（表 V、图 6）→ 真机（表 VI）→ 局限与代码」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#hugwbc-video) —— 同样十六幕，加中文配音与字幕，竖屏，可下载
> [步态实验台](#demo-gait) —— 选走、跳、站、单脚跳，拖步频 $f$、最高抬脚 $l$、$\sigma$：两只脚的相位环、时钟、期望接地概率和五次多项式的抬脚目标一起动，旁边是代码里真正生效的三角形目标
> [干预实验台](#demo-intervene) —— 拖翻转概率 $p$、噪声比例 $\alpha$、重新抽样的间隔：$I(t)$ 的时间线、一个肩关节的目标（论文的插值 / 代码的每步 0.2 rad）一起画
> [表 III / XI、表 IV / X、表 V、表 VI](#demo-tables) —— 单个命令、和基线比、干预消融、站立时脚挪了多远、真机

> 🚶 [具体实例](#实例-环境设定)从一步的命令向量算起：官方代码的 13 维命令、相位 0.6 时两个时钟和期望接地概率、五次多项式与代码三角形的抬脚目标、速度与姿态奖励各一步、干预平均多久换一次、正则课程的系数、训练一共走了多少步，最后读表 III–VI、表 XI。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **HugWBC** | Humanoid's Unified and General Whole-Body Controller | 本文：人形的统一、通用全身控制器 |
| **WBC** | Whole-Body Control | 全身控制：腿、躯干、手臂一起协调 |
| **AAC** | Asymmetric Actor-Critic | 非对称 Actor-Critic：critic 看特权信息，actor 只看真机拿得到的本体感受 |
| **CDF** | Cumulative Distribution Function | 累积分布函数；$\Phi$ 是标准正态分布的 CDF |
| **PPO** | Proximal Policy Optimization | 训练用的强化学习算法 |
| **PD** | Proportional-Derivative | 关节 PD 控制器：目标角 → 力矩 |
| **IK** | Inverse Kinematics | 逆运动学；上身可以交给 IK 之类的外部控制器 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 大规模人体动捕数据集；干预消融里的一个基线用它的手臂动作 |
| **DoF** | Degree of Freedom | 自由度；H1 有 19 个 |

---

## 🎬 十六幕动画：HugWBC 全流程 {#hugwbc-explainer-anim}

<div class="paper-demo" data-demo="hugwbc-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#hugwbc-video}

<div class="paper-demo" data-demo="hugwbc-video" data-src="media/hugwbc_explainer_video.mp4" data-poster="media/hugwbc_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/hugwbc_explainer_video.mp4" download="HugWBC_讲解视频.mp4">下载 mp4（17.7 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 2、3、6–9 幕里的 H1 是**运动学示意**：我们按命令和论文式 (8) 的目标抬脚轨迹摆出姿态（腿用解析逆运动学，脚底高度 = 目标高度），用 [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie) 的 `unitree_h1` 做正运动学，材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，按正交相机逐帧离线渲染；**不是策略的输出**，和第一个交互演示、「🚶 具体实例」是同一组数。第 9 幕的手臂按论文的插值走、噪声按官方代码里 8 个手臂关节的范围抽。表格和第 1、4、10、12、14、16 幕的图来自论文（论文图 2、3、5、8、6、1）；第 1、13、15 幕的真机画面剪自[项目页](https://hugwbc.github.io/)的视频（户外走跑、侧向跳、单脚跳、跳着张开 / 交叉手臂、上身被噪声接管、站着跟姿态、搬箱子、草地换步态），画面上的命令标签是我们按视频里的字幕时刻标的，只做讲解引用。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    H["人：走、跑、跳、单脚跳<br/>随时改步频、抬脚、身高、弯腰"] --> G["以前学出来的人形行走<br/>一种步态、一个速度范围、风格改不了"]
    G --> X1["single · tedious · unextendable · unconstrained<br/>（摘要原话）"]
    U["上身被遥操作 / IK / 关节序列接管"] --> X2["下身策略碰上没见过的上身<br/>容易失稳"]
    X1 --> Q["一个策略：多种步态 + 可调的行为<br/>上身还能随时交给别人？"]
    X2 --> Q
    Q --> A["HugWBC：任务 + 行为的命令空间<br/>相位切步态 · 干预训练"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style A fill:#e8f8e8,stroke:#27ae60
</div>

### 人会的，人形还做不到（第 I 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：人只是走路也能细调频率、步幅、抬脚；现有的人形行走大多不在意步态风格能不能变、能不能控</summary>

论文从人讲起：人有多样的运动能力，跑、跳、单脚跳，**只是走路**也能细调频率、步幅和抬脚高度。现有的人形系统在基于动作的控制（HOVER、ExBody2、HumanPlus、ExBody）和移动操作（PMP）上效果很好，但**很少关注能变换、能控制的步态风格**，行走于是变成摘要里的四个词：single、tedious、unextendable、unconstrained。

论文把 HugWBC 定位成人形的**基础控制器**：在多样的真实场景里做更多任务，上层只给命令，底层一个策略执行。下身能按需要换步态、换身高、换姿态，对移动操作有用：比如蹲下去拿东西要降身高、弯腰（这个例子是我们的说法）。

</details>

### 上身一被接管就失稳（第 III-E 节开头）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：移动操作要上身精确可控；前人把上身目标塞进命令空间一起跟，HugWBC 把上身交给外部控制器、下身照样跟命令</summary>

论文的说法：这个工作的目标不是只做行走，而是一个能给移动操作当基础的统一控制器，所以上身（手臂和手）也要能灵活、精确地控制。

- **前人的做法**（[OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)、[HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)）：把上身目标（比如手臂关节角）加进命令空间，让策略一起跟。
- **HugWBC 的做法**：把上身控制**解耦**成外部的「干预」——遥操作信号（TeleVision、PMP）或重定向好的关节序列（[ExBody](../Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html)、[ExBody2](../ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.html)）直接替换上身关节的目标，因为它们本身就精度高；下身的步态不受影响。

难点：训练时上身是策略自己摆的，部署时被外部强行替换，下身策略就碰上了**没见过的上身**，容易失稳。解法是训练时就随机替换上身动作，让策略对任何干预都稳（第 III-E 节，下文「干预训练」）。

</details>

### 三条贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：扩展的通用命令空间与训练技巧；四种步态下八个命令都跟得准，四种里三种用一个策略；支持外部上身干预的基础控制器</summary>

论文列的三条（引言原文的意思）：

1. 一个**扩展的、通用的命令空间**，配上为多样的人形行走设计的训练技巧；
2. 四种步态下**八个命令都跟得准**，四种步态里有三种用同一个策略（单脚跳另训）；
3. 一个**支持外部上身干预**的基础人形控制器，能接更多移动操作任务。

实验部分对应地做了：逐个命令的跟踪（表 III）、两两组合的误差热图（图 8，「正交性」）、干预训练的消融（表 IV、V、图 6）和真机（表 VI 与项目页视频）。

</details>

---

## 🔧 方法详解（第 III 节）

<div class="mermaid">
flowchart TB
    subgraph S1["① 命令空间 C = K × B（第 III-A 节、表 II）"]
        K["任务：v_x, v_y, ω"]
        B["行为：f, l（脚）· h, p, w（姿态）<br/>ψ, φ₁, φ₂, φ_stance（步态）"]
    end
    subgraph S2["② 相位 → 期望接地概率 C(φ̄)（式 3–4、图 3、图 4）"]
        P["φ 每步加 f·dt；走 ψ=0.5、跳 ψ=0<br/>站 φ=0.25、单脚跳 抬起的脚 φ=0.75"] --> CC["正态 CDF 放松：C(φ̄)<br/>时钟 sin 2πφ̄ 进命令"]
    end
    subgraph S3["③ 训练（第 III-B–F 节）"]
        AC["非对称 Actor-Critic + PPO<br/>actor：5 步本体感受 + 命令 + I(t)<br/>critic：再加特权 24 + 地形 221"]
        RW["奖励（表 I）：任务 + 行为 + 正则"]
        SY["对称损失 β = 0.5"]
        IV["干预训练：I(t) 以 p=0.005 翻转<br/>均匀噪声接管上身 · 奖励遮罩 · 噪声课程 α"]
        CU["课程：地形 → 敏捷组的速度课程 / 干预组的噪声课程"]
    end
    S1 --> S2 --> S3
    S3 --> D["部署：Unitree H1，actor 50 Hz<br/>上身可以随时交给外部控制器"]

    style CC fill:#f4ecf7,stroke:#8e44ad
    style IV fill:#fdebd0,stroke:#e67e22
    style D fill:#e8f8e8,stroke:#27ae60
</div>

### 命令空间：任务 + 行为（第 III-A 节、表 II）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：任务命令是目标速度；行为命令分脚（f、l）、姿态（h、p、w）、步态（ψ、φ₁、φ₂、φ_stance）三组；表 II 的默认值与范围</summary>

命令空间 $\mathcal C = \mathcal K \times \mathcal B$：

- **任务命令** $\mathcal K$：给机器人一个要达到的目标，本文是目标速度 $v_t = (v _ {t,x}, v _ {t,y}, \omega_t)$。
- **行为命令** $\mathcal B$：决定具体的行为模式，

$$
b_t = \big[\underbrace{f_t, l_t}_{\text{脚}},\ \underbrace{h_t, p_t, w_t}_{\text{姿态}},\ \underbrace{\psi_t, \phi_{t,1}, \phi_{t,2}, \phi_{t,\text{stance}}}_{\text{步态}}\big]
$$

$f$ 是步频（一秒几个步态周期），$l$ 是摆动脚的最高抬脚高度；$h$ 是身高（相对默认高度），$p$ 是身体俯仰，$w$ 是腰的偏航。表 II（单脚跳之外的步态）：

| 组 | 命令 | 默认 | 初始范围 | 最终范围 |
|---|---|---|---|---|
| 任务 | $v_x$（m/s） | 0 | $[-0.6, 0.6]$ | $[-0.6, 2.0]$ |
| 任务 | $v_y$（m/s） | 0 | $[-0.6, 0.6]$ | $[-0.6, 0.6]$ |
| 任务 | $\omega$（rad/s） | 0 | $[-0.6, 0.6]$ | $[-1.0, 1.0]$ |
| 脚 | $f$（Hz） | 2 | $[1.5, 3.5]$ | 同左 |
| 脚 | $l$（m） | 0.15 | $[0.1, 0.35]$ | 同左 |
| 姿态 | $h$（m） | 0 | $[-0.3, 0]$ | 同左 |
| 姿态 | $p$（rad） | 0 | $[0, 0.4]$ | 同左 |
| 姿态 | $w$（rad） | 0 | $[-1.0, 1.0]$ | 同左 |

只有 $v_x$、$\omega$ 的范围靠速度课程放开，其余一开始就在全范围里均匀采样。单脚跳的命令只有 $v_x, v_y, \omega \in [-0.6, 0.6]$ 和 $h \in [-0.3, 0]$（附录表 VII），其余行为命令在单脚跳里变成正则项——论文的理由是这些命令都会打破单脚跳本来就很脆弱的平衡，只有身高例外。

**策略看到的命令**：$c_t = [v_t, \tilde b_t]$，$\tilde b_t \in \mathbb R^9$ 把两只脚的相位 $\phi_1, \phi_2$ 换成两个时钟 $Cl_L = \sin 2\pi\bar\phi_1$、$Cl_R = \sin 2\pi\bar\phi_2$（下一节）。官方代码里命令是 11 维：$v_x, v_y, \omega$、$f$、$\psi$、$\phi _ {\text{stance}}$、$l$、$h$、$p$、$w$ 和干预标志 $I(t)$，再拼两个时钟，一共 13 维（`h1interrupt_config.py` 的 `CMD_DIM = 3 + 4 + 1 + 2 + INTERRUPT_IN_CMD`、`CLOCK_INPUT = 2`）。

H1 腰上只有一个偏航关节，所以「弯腰」（俯仰 $p$）全靠髋俯仰来做——这在图 8 的站立热图里会变成身高和俯仰的冲突。

</details>

### 相位：切出四种步态（第 III-A 节、图 4）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每只脚一个相位，每步加 f·dt；φ < φ_stance 触地、否则摆动；走 ψ = 0.5、跳 ψ = 0、站 φ = 0.25、单脚跳抬起的脚 φ = 0.75；走、跳、站一个策略，单脚跳另训</summary>

参考腿足机器人的步态控制（Siekmann 等的周期奖励、Walk These Ways），每只脚一个随时间变化的相位 $\phi_i \in [0, 1)$：

$$
\phi_{t+1,1} = \phi_{t,1} + f_t\,\mathrm dt,\qquad \phi_{t+1,2} = \phi_{t+1,1} + \psi
$$

（对 1 取余，转满一圈回到 0）。$\phi _ {\text{stance}}$ 是支撑占比：$\phi_i < \phi _ {\text{stance}}$ 时这只脚**触地**，否则**摆动**。论文把 $\phi _ {\text{stance}}$ 固定为 0.5：一半时间触地、一半摆动。策略 50 Hz，$\mathrm dt = 0.02$ s。

| 步态 | 设定 | 两只脚 |
|---|---|---|
| 走 | $\psi = 0.5$ | 右脚比左脚晚半圈；一只触地时另一只在空中 |
| 跳 | $\psi = 0$ | 相位相同：一起触地、一起腾空 |
| 站 | $\phi_1 = \phi_2 = 0.25$（固定） | 一直触地 |
| 单脚跳 | 抬起的脚 $\phi = 0.75$（固定），另一只按 $f$ 循环 | 一只一直在空中 |

站和单脚跳的相位是常数：接地概率恒为 1 或 0，$\psi$ 不起作用。脚注说**跑步**可以从走里得到：高速 + 更小的 $\phi _ {\text{stance}}$，让两只脚腾空更久（论文没做这个实验）。

**一个策略管三种**：走、跳、站共用一个策略，单脚跳单独训一个。官方代码（`h1.py` 的 `_resample_commands`）只从 $\psi \in \{0, 0.5\}$ 里抽，再让 1/10 的环境站着（速度命令置 0），**没有单脚跳**。代码里变量名把 $\psi = 0$ 叫 `hopping`（比如 `hopping_symmetry` 奖励），对应的是论文的「跳」，不是单脚跳。

</details>

### 期望接地概率（式 3–4、图 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：硬切换在 φ̄ = 0.5 处从 1 跳到 0；用标准正态 CDF 放松成一段坡；σ 决定坡宽；策略看的是时钟 sin 2πφ̄；站立时论文与代码不一样</summary>

先把相位**均匀化**：触地段映到 $[0, 0.5)$、摆动段映到 $[0.5, 1)$，

$$
\bar\phi_i = \begin{cases} 0.5\,\phi_i / \phi_{\text{stance}}, & \phi_i < \phi_{\text{stance}} \\ 0.5 + 0.5\,(\phi_i - \phi_{\text{stance}}) / (1 - \phi_{\text{stance}}), & \phi_i \ge \phi_{\text{stance}} \end{cases}
$$

（论文用 $\phi _ {\text{stance}} = 0.5$，所以 $\bar\phi = \phi$）。硬切换下，「期望触地」在 $\bar\phi = 0.5$ 处从 1 掉到 0、在 $\bar\phi = 1$ 处从 0 跳回 1。论文用标准正态分布的 CDF $\Phi$ 把切换点放松成区间 $[-3\sigma, 3\sigma]$、$[0.5 - 3\sigma, 0.5 + 3\sigma]$：

$$
C(\phi_i) = \Phi\!\left(\tfrac{\bar\phi_i}{\sigma}\right)\left[1 - \Phi\!\left(\tfrac{\bar\phi_i - 0.5}{\sigma}\right)\right] + \Phi\!\left(\tfrac{\bar\phi_i - 1}{\sigma}\right)\left[1 - \Phi\!\left(\tfrac{\bar\phi_i - 1.5}{\sigma}\right)\right]
$$

直觉上 $C$ 就是这只脚「该触地」的概率：触地段第一项起作用，摆动段第二项起作用。论文没给 $\sigma$，官方代码是 $\sigma = 0.05$（`rewards.kappa_gait_probs`），坡宽 ±0.15。

**时钟**：命令里不直接放相位，而是放 $Cl = \sin 2\pi\bar\phi$。走路时两条一正一负，跳时重合；转一圈是连续的，没有 $\phi$ 从 1 跳回 0 的突变（论文：为了在摆动和触地之间更平滑地过渡）。

**站立时论文和代码不一样**：论文的站立是 $\phi = 0.25$，于是 $Cl = 1$、$C = 1$；官方代码把站立环境的相位置 0（`h1.py` 第 778 行 `idxs[self.standing_envs_mask] = 0.0`），于是 $Cl = 0$、$C(0) = 0.5$，另有站立专用的奖励（双脚都触地奖励、双脚离地惩罚）。这是我们读代码的结果。

</details>

<div class="paper-demo" data-demo="hugwbc-gait" id="demo-gait"><p class="demo-fallback">（本节含交互演示：步态实验台，需要启用 JavaScript）</p></div>

### 观测与网络：非对称 Actor-Critic（第 III-B 节、附录表 IX）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：本体感受 63 维；critic 多看特权 24 维与 221 个地形高度；actor 看 5 步本体感受历史、命令和 I(t)；历史编码器 → 估计器 → 底层网络；代码只估线速度</summary>

| 观测 | 维数 | 内容 | 谁看 |
|---|---|---|---|
| 本体感受 $o^{\text{pro}}$ | 63 | 角速度 3、重力投影 3、关节位置 19、关节速度 19、上一步动作 19 | actor（5 步历史）、critic |
| 特权 $o^{\text{pri}}$ | 24 | 线速度、身高误差、抬脚高度、地面摩擦、足底力、连杆碰撞（躯干、髋、大腿、小腿、肩、手臂） | critic |
| 地形 $o^{\text{ter}}$ | 221 | 机器人周围地形高度的采样（代码：17 × 13 个点） | critic |
| 命令 $c_t$ + 干预标志 $I(t)$ | 12 + 1 | 见上一节 | actor、critic |

**网络**（附录表 IX）：actor = 历史编码器 [256, 128]（5 步历史 → $z_t$）+ 估计器 [64, 32]（$z_t$ → $\hat v, \hat l, \hat h$）+ 底层网络 [256, 128, 64]（$z_t$、估计值、当前本体感受、命令、$I(t)$ → 19 个关节的目标）；critic [512, 256, 128]。估计器由估计损失监督：$\mathcal L^{\text{est}} = \mathbb E\lVert \mathcal E(h^k) - s^{\text{key}} \rVert^2$。总损失

$$
\mathcal L^{\text{AAC}} = \mathcal L^{\text{value}} + \lambda^{\text{policy}}\mathcal L^{\text{policy}} + \lambda^{\text{est}}\mathcal L^{\text{est}}
$$

论文把这套非对称训练归到 DreamWaQ 一路（一阶段就能 sim-to-real，不用再蒸馏一个学生）。actor 连同估计器直接部署，50 Hz；一条轨迹最长 1000 步（20 s），躯干碰地或碰到别的连杆、身体倾斜过大就提前终止。

**官方代码**（`h1interrupt_config.py`）：估计器只重建线速度 3 维（`privileged_recon_dim = 3`），底层网络是 [256, 128, 32]（论文写 64），潜变量 32 维；actor 每步输入 63 + 13 = 76 维，叠 5 步；critic 输入 63 + 11 + 2 + 24 + 221 = 321 维；目标角 = 默认角 + 0.25 × 动作，仿真 0.005 s、每 4 步出一次动作；PD 增益：髋 200、膝 300、踝 40、躯干 300、手臂 20。

</details>

### 奖励（第 III-C 节、表 I、式 8）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：任务奖励跟速度；姿态命令罚平方误差；接触—摆动奖励按 C 加权；抬脚目标是五次多项式；11 项正则；代码里生效的是三角形的抬脚目标，正则还有课程</summary>

奖励分三类：**任务**、**行为**、**正则**。表 I：

| 类 | 项 | 定义 | 权重 |
|---|---|---|---|
| 任务 | 线速度跟踪 | $\exp(-\lVert v^{\text{target}} _ {xy} - v _ {xy}\rVert^2 / 0.2)$ | 2 |
| 任务 | 角速度跟踪 | $\exp(-\lVert \omega^{\text{target}}_z - \omega_z\rVert^2 / 0.2)$ | 2 |
| 行为 | 身高 | $\lVert h^{\text{target}} - h\rVert^2$ | −40 |
| 行为 | 俯仰 | $\lVert p^{\text{target}} - p\rVert^2$ | −10 |
| 行为 | 腰偏航 | $\lVert w^{\text{target}} - w\rVert^2$ | −2 |
| 行为 | 抬脚 | $\sum_i [1 - C(\phi_i)]\,\lVert l^{\text{target},i} - l^{\text{foot},i}\rVert^2$ | −30 |
| 行为 | 接触—摆动 | $\sum_i -[1 - C(\phi_i)][1 - e^{-\lVert f^{\text{foot},i}\rVert^2/50}] - C(\phi_i)[1 - e^{-\lVert v^{\text{foot},i} _ {xy}\rVert^2/5}]$ | −2 |
| 正则 | 横滚、俯仰角速度 | $\lVert\omega _ {xy}\rVert^2$ | −0.5 |
| 正则 | 竖直速度 | $\lVert v_z\rVert^2$ | −0.1 |
| 正则 | 滑脚 | $1 - \sum_i \exp(-\lVert v^{\text{foot},i} _ {xy}\rVert^2)$ | −0.2 |
| 正则 | 动作变化率 | $\lVert a_t - a _ {t-1}\rVert^2$ | −0.01 |
| 正则 | 动作平滑 | $\lVert a _ {t-2} - 2a _ {t-1} + a_t\rVert^2$ | −0.01 |
| 正则 | 关节力矩 | $\lVert\tau\rVert^2$ | −5e−6 |
| 正则 | 关节加速度 | $\lVert\ddot q\rVert^2$ | −2.5e−7 |
| 正则 | 上身偏离默认 | $\lVert q _ {\text{upper}} - q^{\text{nominal}} _ {\text{upper}}\rVert^2$ | −0.5 |
| 正则 | 髋偏离默认 | $\lVert q _ {\text{hip},xz} - q^{\text{nominal}} _ {\text{hip},xz}\rVert^2$ | −2 |
| 正则 | 双脚对称 | $\mathbb 1[\bar\phi_1 = \bar\phi_2]\,\lVert p^{xz} _ {\text{foot},0} - p^{xz} _ {\text{foot},1}\rVert^2$（跳时两只脚前后对齐） | −5 |
| 正则 | 提前终止 | $\mathbb 1[\text{提前终止}]$ | −200 |

（表 I 接触—摆动的式子里两个指数前都少了负号，按正文与代码补上；正文还把 $\sigma _ {cf} = 50$ 写了两遍，第二个应是 $\sigma _ {cv} = 5$。）

**接触—摆动**：该触地时（$C$ 大）罚脚的速度，该摆动时（$1 - C$ 大）罚脚底的力；两类脚的状态（力、速度）组合起来就能表示不同的步态。

**抬脚轨迹**：摆动段要平顺地抬到最高点再落下，论文照四足的经验用分段五次多项式，边界条件是附录表 VIII——$\bar\phi = 0.5$（起点）、0.75（最高点 $l$）、1（落点）三处速度和加速度都为 0。起止高度为 0 时，归一化后就是

$$
l^{\text{target}} = l \cdot s(\tau),\quad s(\tau) = 10\tau^3 - 15\tau^4 + 6\tau^5,\quad \tau = \frac{0.25 - |\bar\phi - 0.75|}{0.25}
$$

触地段目标为 0。它只定竖直方向；前后左右的步幅由 $f$ 和 $v, \omega$ 决定，论文说在自然地形上不需要精确的落脚点规划。

**官方代码里实际生效的**（`h1_config.py` 的 `rewards.scales`）：

- 五次多项式那一项 `feet_clearance_cmd_polynomial` 权重是 **0**；生效的是 `feet_clearance_cmd_linear`（−30）：三角形的目标，摆动段中点为 $l$，再加 0.07 m 的踝高（踝关节离地），高度相对脚下的地形扫描；
- 接触—摆动拆成力、速度两项（`tracking_contacts_shaped_force` 2、`tracking_contacts_shaped_vel` 4，函数里自带负号、再除以 2），脚速度用的是三维；
- 角速度跟踪权重 3（论文 2），跟踪的 $\sigma$ 是 0.25（论文 0.2），身高 −40、俯仰 −20（`orientation_control`：按俯仰命令转过的重力方向，干预任务里改成 −10）、腰 −2；
- 论文没列的还有十几项：不腾空、站立时双脚着地、足底力上限、关节限位、绊脚、关节功率分配、存活奖励等；
- **正则课程**：`reward_curriculum_list` 里的正则项先乘 0.2，每 100 次迭代把系数开 0.8 次方（$0.2^{0.8^k}$），约 1300 次迭代后超过 0.9。

</details>

### 对称损失（第 III-D 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：H1 左右对称，策略却不知道；镜像函数沿 x–z 平面翻；对称的输入要给对称的动作；单脚跳左右互为镜像，同样适用；β = 0.5</summary>

人形的结构左右对称，但没有先验时策略很难自己发现这一点，尤其是要产生多种行为的策略：初期探索更难，容易落进局部最优、动作不自然。参考 Yu 等 2018 的做法，定义动作和观测的镜像函数 $\mathcal F_a$、$\mathcal F_o$（沿 x–z 平面翻过来：左右关节对调，横滚、偏航取反，$v_y$、$\omega$、$w$ 取反，两个时钟对调），理想的策略满足 $\pi(o) = \mathcal F_a(\pi(\mathcal F_o(o)))$，于是

$$
\mathcal L_{\text{sym}} = \sum_t \big\lVert \pi(o^\pi_t) - \mathcal F_a\big(\pi(\mathcal F_o(o^\pi_t))\big) \big\rVert^2,\qquad \mathcal L = \mathcal L_{\text{AAC}} + \beta\,\mathcal L_{\text{sym}},\ \beta = 0.5
$$

它和强化学习的目标无关，换别的算法也能加。论文特别指出：它鼓励的是「对称的状态（和命令）→ 对称的动作」，所以**不对称的步态也适用**——左脚单脚跳和右脚单脚跳互为镜像。强化学习算法是 PPO。

**官方代码**（`rsl_rl/algorithms/ppo.py`）：`use_wbc_sym_loss = True`、`symmetry_loss_coef = 0.5`；镜像用一张 ±1 的置换矩阵（躯干偏航也取反）；**只约束 actor**，原动作那一支 `detach`，梯度只走镜像那一支。旧版笔记说「同时约束 critic 的价值」，论文和代码里都没有。

</details>

### 干预训练（第 III-E 节、图 5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：I(t) 每步以 p = 0.005 翻转，一种模式平均持续 199 步；被接管时上身动作取均匀噪声，每 90 步一个目标、前 2/3 插值；上身的正则奖励遮掉；噪声比例 α 按速度奖励自适应</summary>

**切换**：二值的干预标志 $I(t)$ 表示这一步上身是不是被外部接管，每一步以 $p = 0.005$ 的概率翻转。同一种模式连续持续的期望长度

$$
\sum_{n \ge 1} n\,p\,(1 - p)^n = \frac{1 - p}{p} = 199\ \text{步} \approx 4\ \text{s}
$$

所以大多数轨迹是成段的「自己控制」或「被接管」，不会来回乱切。没有干预时，上身由策略自己摆（自然摆臂）。

**接管的动作从哪来**：均匀噪声。论文的理由是噪声可能让手撞到身体，正好模拟外部干预时操作员的误操作。为了不让噪声抖成一团，每 $t _ {\text{interval}} = 90$ 步在动作空间里抽一个新目标，前 2/3 线性插值过去、后 1/3 保持：

$$
a^{\text{interv}}_{\text{noise},t} = (1 - r)\,a^{\text{init}}_{\text{noise}} + r\,a^{\text{targ}}_{\text{noise}},\qquad r = \min\!\left(1, \tfrac32\,\tfrac{t - t_0}{t_{\text{interval}}}\right)
$$

**奖励遮罩**：被接管时，上身的正则奖励不算，免得策略和外部控制器「抢」上身。

**噪声课程**：替换上身的动作从策略自己的动作慢慢过渡到噪声，

$$
a^{\text{interv}}_t = \alpha\,a^{\text{interv}}_{\text{noise},t} + (1 - \alpha)\,a_t
$$

线速度、角速度的跟踪奖励都过预设阈值时 $\alpha$ 加 0.01；任一项不到阈值的 2/3 时减 0.01。图 5 画的是三个课程阶段的噪声（手的位置由小到大）和最后阶段的正面、俯视。

**官方代码的版本**（`h1interrupt.py`、`h1interrupt_config.py`，我们读代码的结果）：

- 只接管 8 个手臂关节（腰不接管），每个关节按自己的范围均匀抽（比如左肩俯仰 $[-2.6, 2.6]$）；
- 每 30 步重新抽一个目标（`noise_update_step = 30`），每步只朝目标挪 0.2 rad 以内（`disturb_rad = 0.2`），不是论文的「90 步、前 2/3 插值」；
- 配置里有 `switch_prob = 0.005`，翻转函数 `random_switch_disturb` 也写了，但**没有被调用**；实际是每 10 s 重新抽命令时，有一半的概率被接管；
- $\alpha$ 每次 ±0.05，只看线速度奖励（阈值是满分的 0.6 倍），低于阈值的一半就减；
- 被接管时遮掉的上身奖励：肩、肘偏离默认，上身动作变化率，碰撞，站立时的关节偏离。

</details>

<div class="paper-demo" data-demo="hugwbc-intervene" id="demo-intervene"><p class="demo-fallback">（本节含交互演示：干预实验台，需要启用 JavaScript）</p></div>

### 课程：敏捷组与干预组（第 III-F 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：并行的机器人分两组；都先走地形课程；最难的地形过了，敏捷组开始速度课程、干预组开始噪声课程</summary>

直接从手工奖励里学一个多样的策略很难：多个目标要同时优化、同时探索。论文把并行的机器人分成两组：

- **敏捷组**（agile group）：学高速、敏捷的移动；
- **干预组**（intervention group）：学在上身被外部接管时控制好自己。

两组都先走**地形课程**（照 Wu 等 2023 的 AMP 四足工作：连续的粗糙地形）；最难的地形过了，就保持那个地形，**同时**开始速度课程和噪声课程：速度课程只给敏捷组，用网格自适应课程（Margolis 等）逐步放大 $v_x$ 到 $[-0.6, 2.0]$、$\omega$ 到 $[-1, 1]$；噪声课程只给干预组（上一节的 $\alpha$）。开始训练时每台机器人随机抽一种步态。

**官方代码**：两组各占一半（`noise_curriculum_ratio = 0.5`）；4096 个环境、每次迭代 24 步、最多 4 万次迭代；域随机化：摩擦 $[0.1, 2.75]$、躯干加质量 $[-3, 9]$ kg、PD 增益与电机强度 ×$[0.8, 1.2]$、控制延迟 0–20 ms、连杆质量与惯量 ×$[0.8, 1.2]$、电机零偏 ±0.02 rad、每 5 s 推一次。论文没写这些数。

</details>

---

## 📊 实验结果（第 IV 节）

论文提了四个问题：Q1 单个命令跟得多准；Q2 命令怎么组合；Q3 大规模噪声干预训练对鲁棒性有什么用；Q4 真机上怎么样。误差 $E _ {\text{cmd}}$ 是实际状态与命令之差的 L1 范数，按回合平均；命令在表 II 的范围里均匀采样。

### 单个命令跟得多准（表 III、表 XI）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一次只扫一个命令；走路低速 v_x 0.030 m/s；站、走最准，跳次之，单脚跳最差；侧向不如前向；调姿态比调脚难；表 XI 七项都比 HOVER、ExBody 低</summary>

一次只扫一个命令，其余放默认值。脚的两项按整个步态周期算，其余按每一步算；站立只测姿态三项。表 III：

| 步态 | $E^{\text{low}} _ {v_x}$ | $E^{\text{high}} _ {v_x}$ | $E _ {v_y}$ | $E_\omega$ | $E_f$ | $E_l$ | $E_h$ | $E_p$ | $E_w$ |
|---|---|---|---|---|---|---|---|---|---|
| 站 | – | – | – | – | – | – | 0.035 | 0.047 | 0.022 |
| 走 | 0.030 | 0.216 | 0.085 | 0.054 | 0.028 | 0.011 | 0.064 | 0.038 | 0.075 |
| 跳 | 0.090 | 0.532 | 0.069 | 0.077 | 0.027 | 0.012 | 0.058 | 0.048 | 0.022 |
| 单脚跳 | 0.033 | – | 0.046 | 0.078 | – | – | 0.103 | – | – |

（单位：m/s、m/s、m/s、rad/s、Hz、m、m、rad、rad；高速是 $v_x > 1$ m/s。）

- **站、走明显比跳、单脚跳准，单脚跳最差**：单脚跳在高速、俯仰、腰的命令下会摔；它对稳定性要求高，策略优先学保持平衡，牺牲了一些跟踪精度。论文的结论：每种步态跟得多准，和它在仿真里有多难学一致——走和站先学会，跳和单脚跳出现得晚、要练得更久。
- **低速比高速准**：低速的技能更容易掌握；高速时动态稳定性下降，要和跟踪精度权衡。
- **前向比侧向准**：论文归因于 H1 的硬件构造。
- **脚的命令比姿态命令跟得准**：调姿态对稳定性挑战更大，策略取更保守的动作。
- 论文文字说「抬脚 $l$ 跟得最不准」，但表里 $E_l$ 只有 0.011 m，比别的项都小；量纲不同，我们看不出它是怎么比较的。

**表 XI（附录，v3 新加）**：和两个开源的学习型全身控制器比。它们的命令依赖动作数据（ExBody 跟上身表情目标 + 根部移动目标，HOVER 要求各项命令相互一致），所以上身就用默认关节角当参考，按表 III 的方法算走路的误差：

| 方法 | $E^{\text{low}} _ {v_x}$ | $E^{\text{high}} _ {v_x}$ | $E _ {v_y}$ | $E_\omega$ | $E_h$ | $E_p$ | $E_w$ |
|---|---|---|---|---|---|---|---|
| HOVER | 0.559 | 1.324 | 0.328 | 0.436 | 0.270 | 0.127 | 0.082 |
| ExBody | 0.109 | 0.242 | 0.114 | 0.587 | 0.145 | 0.122 | 0.097 |
| **HugWBC** | **0.030** | **0.216** | **0.085** | **0.054** | **0.064** | **0.038** | **0.075** |

论文自己说明：这是让两个基线做它们**不是为之设计的事**，所以成绩比它们各自论文里差。

</details>

### 命令能不能随便组合（第 IV-B 节、图 8）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两两扫命令画误差热图；走路时 v_x、ω、h、w 两两正交；v_x 超过 1.5 m/s 正交性下降；步频是离散的正交；站立时身高与俯仰冲突；跳的正交范围更小，单脚跳几乎没有</summary>

**正交**：一组命令里每个命令在它的范围内变化，都不显著影响别的命令的跟踪。论文把每对命令各在范围里扫一遍，误差画成热图（附录图 8；颜色越冷误差越大，每一行的色标范围不同）。

- **走**（最基础的步态，最能发挥硬件）：$v_x$、$\omega$、$h$、$w$ 两两正交；$v_x$ 超过 1.5 m/s 后，它和别的命令的正交性下降（动态稳定性下降，机器人优先保稳定）；步频是「**离散的正交**」，1.5 或 2 Hz 时跟得最好，频率高了变差；$v_y$、$l$、$p$ 只在窄范围里和别的命令正交。
- **跳**：和走类似，但正交的范围更小，尤其是高速：每个周期都要往前跳一大段，起跳前要摆好姿态、落地后要马上调整，所以只能在窄范围里执行别的命令。
- **单脚跳**：没有明显的正交关系，有效跟踪只限于 $v_x, v_y, \omega, h$；降低身高能提高动态稳定性，反而有助于保持姿态。
- **站**：结果和零速度走路时差不多；$w$ 和另外两个几乎正交；$h$、$p$ 的范围越大越冲突——H1 腰上只有一个自由度，俯仰只能靠髋俯仰，**身高降 0.3 m 时髋俯仰的活动范围几乎为零**，俯仰就跟不准。

论文的总结：步频过高或过低都会显著影响移动命令；姿态命令靠近范围极限时会显著影响别的命令；正交范围在走里最大、单脚跳里最小。

**官方代码**在采命令时就截掉了冲突的组合（`h1.py`）：高速时 $f \ge 2$、$p \le 0.3$、$ \mid w\| \le 0.15$；$f > 2.5$ 或 $h < -0.15$ 时 $l \le 0.2$；$h < -0.2$ 时 $p \le 0.3$；跳时 $l \le 0.2$、$p \le 0.3$（`h1int` 任务里只保留了对跳的截断，我们读代码的结果）。

</details>

### 干预训练的消融（第 IV-C 节、表 IV、附录表 X）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三种训练（噪声课程 / AMASS 手臂动作 / 不干预）× 三种测试；不干预训的一被噪声接管 v_x 误差 0.866；AMASS 训的碰到噪声 0.170；HugWBC 几乎全面最好，只有不干预时的姿态三项例外</summary>

三种训练策略：**噪声课程**（HugWBC）、用**过滤后的 AMASS**（OmniH2O 那份）的手臂动作做干预、**不干预**；三种测试：均匀噪声、AMASS、无干预。AMASS 基线的动作按控制频率在相邻两帧间线性插值，课程照样用。表 IV（走）：

| 训练 | 测试 | $E _ {v_x}$ | $E _ {v_y}$ | $E_\omega$ | $E_f$ | $E_l$ | $E_h$ | $E_p$ | $E_w$ |
|---|---|---|---|---|---|---|---|---|---|
| 噪声课程（HugWBC） | 噪声 | **0.0483** | **0.0962** | **0.1879** | **0.0471** | **0.0542** | **0.0402** | **0.0432** | **0.0552** |
| | AMASS | **0.0391** | **0.0920** | **0.1039** | **0.0464** | **0.0543** | **0.0387** | **0.0364** | **0.0540** |
| | 无 | **0.0264** | **0.0863** | **0.0543** | **0.0447** | **0.0522** | 0.0372 | 0.0375 | 0.0475 |
| AMASS | 噪声 | 0.1697 | 0.1055 | 0.2156 | 0.0621 | 0.0542 | 0.0620 | 0.0812 | 0.0694 |
| | AMASS | 0.0567 | 0.0965 | 0.1593 | 0.0466 | 0.0555 | 0.0579 | 0.0458 | 0.0554 |
| | 无 | 0.0645 | 0.0916 | 0.0802 | 0.0460 | 0.0531 | 0.0577 | 0.0455 | 0.0568 |
| 不干预 | 噪声 | 0.8658 | 0.7511 | 0.9116 | 0.1930 | 0.1913 | 0.1658 | 0.3622 | 0.2241 |
| | AMASS | 0.6299 | 0.4026 | 0.5758 | 0.2245 | 0.2527 | 0.1305 | 0.2367 | 0.1112 |
| | 无 | 0.0755 | 0.1076 | 0.1151 | 0.0450 | 0.0678 | **0.0255** | **0.0211** | **0.0380** |

- 噪声课程几乎在所有测试里最好，只有「无干预时的姿态三项」不如不干预训的策略；它在各种干预下精度降得最少。
- AMASS 训的碰到噪声干预明显变差（$v_x$ 0.170），因为训练数据里的动作有限；不干预训的只在没有外部上身控制时表现好。
- 有干预训练时，**连移动和脚的命令也比不干预训的准**：干预训练本身也让策略更鲁棒。代价：真机上机器人踩地更用力，论文认为动作正则和跟踪精度之间可能有取舍。
- **附录表 X（站、跳）**：站立时 HugWBC 的姿态误差比走、跳都低；跳时干预的影响最大——论文说跳很依赖摆臂，手臂被限制时表现明显变差。单脚跳很不稳、很少用于移动操作，又是单独一个策略，所以没做干预训练。

</details>

### 站着干活与抗推（表 V、图 6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：站着跟姿态命令时一回合两只脚总共挪了多远：HugWBC 0.02–0.09 m，AMASS 训的 2.1–3.3 m，不干预的 17.5–25.7 m；8 个方向上的抗推，大多数方向 HugWBC 扛得更多</summary>

**站着时脚应该不动**：调姿态时机器人要是靠挪步保持平衡，就很难做需要站定的操作。表 V 量站立步态下跟姿态命令时，一个回合（20 s）里两只脚总共挪了多远（论文表头写 m/s，正文说的是米）：

| 训练 | 测试 | $D_h$ | $D_p$ | $D_w$ |
|---|---|---|---|---|
| 噪声课程（HugWBC） | 噪声 | **0.0339** | **0.0892** | **0.0199** |
| | AMASS | **0.0454** | **0.0728** | **0.0196** |
| | 无 | **0.0003** | **0.0016** | **0.0007** |
| AMASS | 噪声 | 2.0815 | 2.8978 | 3.2630 |
| | AMASS | 0.0536 | 0.1743 | 0.0396 |
| | 无 | 0.0139 | 0.0160 | 0.0013 |
| 不干预 | 噪声 | 17.5358 | 17.9732 | 25.7132 |
| | AMASS | 25.3802 | 26.3496 | 21.3078 |
| | 无 | 0.0159 | 1.7065 | 1.7152 |

AMASS 训的在噪声干预下要不停地小碎步调整；不干预训的一被干预就容易翻倒，整个任务失败。

**抗推（图 6）**：站立、默认命令，在 8 个方向上加外力，4096 条轨迹里存活率超过 98% 才算扛住；左图是一直加着的力，右图是推一秒；比的是做和不做干预训练。大多数方向上 HugWBC 扛得更多（我们读图：0° 方向持续的力约 600 对 510 N，推一秒约 940 对 750 N；两张图各有 6 个方向更大，少数方向反而更小；论文没写 0° 指哪边）。论文的解释：干预让机器人一直受到来自上身的各种扰动，练出了动态调整腿上力量来稳住的本事。

</details>

<div class="paper-demo" data-demo="hugwbc-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 III / XI、表 IV / X、表 V、表 VI，需要启用 JavaScript）</p></div>

### 真机（第 IV-D 节、表 VI、图 1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：直接部署到 Unitree H1；真机只能用电机读数量俯仰和腰；误差比仿真略大；跳的两项最小；项目页还有单脚跳、搬箱子、户外</summary>

策略直接部署到 Unitree H1（README：sim-to-sim 用 `unitree_mujoco`，真机接口用 `unitree_sdk2_python`）。图 1 展示了四种步态、外部接管上身和各种命令组合。

只有俯仰 $p$ 和腰 $w$ 能用电机读数测，其他命令没有高精度动捕测不准。每种步态测 5 次，被测的命令从最小慢慢加到最大，其余放默认值。表 VI（rad，均值 ± 标准差）：

| 步态 | $E^{\text{real}}_p$ | $E^{\text{real}}_w$ |
|---|---|---|
| 站 | 0.0712 ± 0.0425 | 0.0718 ± 0.0614 |
| 走 | 0.1006 ± 0.0581 | 0.0571 ± 0.0489 |
| 跳 | 0.0674 ± 0.0569 | 0.0552 ± 0.0469 |

真机误差比仿真略大，论文归因于传感器噪声和硬件磨损；跳的两项都最小、走的略大，和仿真一致。论文说「腰比俯仰误差小，因为腰对整体稳定的影响小」，但站立那一行腰 0.0718 略大于俯仰 0.0712。

项目页的视频还有：站着改身高、俯仰、腰，原地踏步改步频；单脚跳往各个方向、身高由高到低；跳着前进由慢到快；外部控制上身搬箱子，下身照样蹲下、弯腰、走过去；校园、商业街、草地上在走、跑、跳和单脚跳之间切换。论文的定量结果只有表 VI。

</details>

---

## ⚠️ 局限与讨论

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文没单列局限；我们整理的：单脚跳单独一个策略、只跟 4 个命令、没做干预训练；只在 H1 上做；命令之间会冲突；真机只测了俯仰和腰；代码与论文有几处出入</summary>

论文的结论只写了以后的方向：把 HugWBC 用到别的人形上，或者拿它当统一的底层控制器、在上面搭高层规划器。下面是我们整理的局限：

1. **单脚跳是另一个策略**：只跟 $v_x, v_y, \omega, h$ 四个命令，没做干预训练，开源代码里也没有；「一个策略管所有步态」实际是三种。
2. **只在 H1 上验证**；真机定量只测了俯仰和腰（表 VI），速度、步频、抬脚、身高在真机上跟得多准没有数。
3. **命令之间会冲突**（图 8）：高速、低身高、高步频时有些组合做不到；上层规划器需要知道哪些组合是安全的（我们的理解），代码在采命令时就截掉了一部分冲突组合。
4. **干预只在训练分布里**：接管的是 8 个手臂关节的位置目标；外部控制器给的上身动作若带着很大的外力（比如搬重物），论文没有专门测（我们的推测；图 6 的抗推是站立时推躯干）。
5. **代码与论文的出入**：站立相位（0 对 0.25）、抬脚目标（三角形对五次多项式）、估计器（只估线速度）、干预（每 30 步重抽、翻转函数未调用）、奖励权重（角速度 3、跟踪 $\sigma$ 0.25）。复现论文的数字时要留意（我们读代码的结果）。
6. 表 XI 的比较对基线不公平（论文自己说了）：HOVER、ExBody 是跟参考动作的，被拿来跟单个速度、姿态命令。

</details>

---

## 🚶 具体实例：从一步的命令算到表格

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：环境设定 / 例 1 一步的命令 / 例 2 期望接地概率 / 例 3 抬脚目标 / 例 4 速度与姿态奖励 / 例 5 干预多久换一次 / 例 6 正则课程 / 例 7 训练规模 / 例 8 读表 III 与表 XI / 例 9 读表 IV 与表 V / 例 10 读表 VI</summary>

<h3 id="实例-环境设定">环境设定</h3>

H1 走路，命令取表 II 的默认值：$v = (0, 0, 0)$、$f = 2$ Hz、$l = 0.15$ m、$h = p = w = 0$、$\psi = 0.5$、$\phi _ {\text{stance}} = 0.5$，不被干预（$I = 0$）。$\sigma = 0.05$（官方代码），$\mathrm dt = 0.02$ s。

动画和演示里的 H1 是我们写的**运动学示意**：左脚相位 $\phi_1 = k/20$ 取第 $k$ 帧，摆动脚的踝关节高度 = 式 (8) 的目标 $l\,s(\tau)$ + 踝关节离脚底的 0.0698 m，腿用解析逆运动学，正运动学用 Menagerie 的 `unitree_h1`。这只是为了看清相位和抬脚目标，**不是策略的输出**；第 9 幕的手臂按论文的插值、官方代码的关节范围摆。

<h3 id="实例-1-一步的命令">例 1：一步的命令（官方代码 13 维）</h3>

取 $\phi_1 = 0.6$（左脚在摆动），走路 $\phi_2 = 0.6 + 0.5 = 1.1 \to 0.1$（右脚触地）。按代码的顺序：

$$
[\,v_x, v_y, \omega,\ f,\ \psi,\ \phi_{\text{stance}},\ l,\ h,\ p,\ w,\ I\,] = [\,0, 0, 0,\ 2,\ 0.5,\ 0.5,\ 0.15,\ 0,\ 0,\ 0,\ 0\,]
$$

再拼两个时钟：$Cl_L = \sin(2\pi \cdot 0.6) = -0.588$，$Cl_R = \sin(2\pi \cdot 0.1) = 0.588$——走路时一正一负。11 + 2 = 13 维，加上 63 维本体感受，actor 每步看 76 维，叠 5 步。一个周期 $1/f = 0.5$ s，也就是 25 步。

<h3 id="实例-2-期望接地概率">例 2：期望接地概率</h3>

$\sigma = 0.05$ 时：

| $\bar\phi$ | 0 | 0.05 | 0.1 | 0.25 | 0.5 | 0.55 | 0.6 | 0.75 | 0.95 |
|---|---|---|---|---|---|---|---|---|---|
| $C$ | 0.5 | 0.8413 | 0.9772 | 1.000 | 0.5 | 0.1587 | 0.0228 | 0.000 | 0.1587 |

例：$C(0.1) = \Phi(2)\,[1 - \Phi(-8)] + \Phi(-18)\,[\dots] = 0.9772$；$C(0.6) = \Phi(12)\,[1 - \Phi(2)] + \dots = 0.0228$。所以例 1 里左脚（$\bar\phi = 0.6$）的摆动权重 $1 - C = 0.977$，右脚（$\bar\phi = 0.1$）的触地权重 $C = 0.977$。代码的站立（相位置 0）落在 $C(0) = 0.5$、$Cl = 0$；论文的站立 $\phi = 0.25$，$C = 1$、$Cl = 1$。

<h3 id="实例-3-抬脚目标">例 3：抬脚目标（论文的五次多项式与代码的三角形）</h3>

左脚 $\bar\phi = 0.6$：$\tau = (0.25 - \|0.6 - 0.75\|)/0.25 = 0.4$，$s(0.4) = 10 \times 0.064 - 15 \times 0.0256 + 6 \times 0.01024 = 0.31744$，目标 $0.15 \times 0.31744 = 0.0476$ m（约 0.048 m）。其他相位：

| $\bar\phi$ | 0.55 | 0.6 | 0.65 | 0.7 | 0.75 |
|---|---|---|---|---|---|
| $\tau$ | 0.2 | 0.4 | 0.6 | 0.8 | 1 |
| $l^{\text{target}}$（m） | 0.0087 | 0.0476 | 0.1024 | 0.1413 | 0.15 |

示意里第 12 帧（$\phi_1 = 0.6$）左踝高 117 mm = 47.6 + 69.8。假设这一步左脚实际只抬到 0.02 m，抬脚奖励 $-30 \times 0.977 \times (0.0476 - 0.02)^2 = -0.022$。

官方代码生效的三角形：$\phi = 0.6$ → $2\phi - 1 = 0.2$ → $1 - \|1 - 2 \times 0.2\| = 0.4$ → $0.15 \times 0.4 + 0.07 = 0.13$ m（踝关节离地）；摆动段中点 $\phi = 0.75$ 是 $0.15 + 0.07 = 0.22$ m。

<h3 id="实例-4-速度与姿态奖励">例 4：速度与姿态奖励</h3>

- 速度误差 0.3 m/s：$2\exp(-0.09/0.2) = 2e^{-0.45} = 1.275$（满分 2）；误差 0.1 m/s：$2e^{-0.05} = 1.902$。
- 身高命令 $h = -0.2$ m、实际 $-0.15$ m：$-40 \times 0.05^2 = -0.1$；同样 0.05 的误差放在腰上：$-2 \times 0.05^2 = -0.005$，差 20 倍——身高跟不上罚得最狠。

<h3 id="实例-5-干预多久换一次">例 5：干预多久换一次</h3>

论文 $p = 0.005$：一种模式平均持续 $(1 - 0.005)/0.005 = 199$ 步 $= 3.98$ s。10 s（500 步）里一次都不翻转的概率 $0.995^{500} = 0.082$；4 s（200 步）里不翻转的概率 $0.995^{200} = 0.367$。

噪声插值：$t _ {\text{interval}} = 90$ 步，$r = \min(1, 1.5\,(t - t_0)/90)$：第 30 步 $r = 0.5$，第 60 步起 $r = 1$ 保持到第 90 步。官方代码每 30 步重抽、每步最多 0.2 rad：肩俯仰从 0 转到 2.0 rad 至少要 10 步。

<h3 id="实例-6-正则课程">例 6：正则课程（官方代码）</h3>

正则项的系数 $0.2^{0.8^{k}}$，$k$ = 迭代次数 ÷ 100 取整：

| 迭代 | 0 | 100 | 500 | 1000 | 1200 | 1300 |
|---|---|---|---|---|---|---|
| 系数 | 0.2 | 0.276 | 0.590 | 0.841 | 0.895 | 0.915 |

所以约 1300 次迭代后正则项就超过九成的力度。

<h3 id="实例-7-训练规模">例 7：训练规模（官方代码）</h3>

每次迭代 $4096 \times 24 = 98{,}304$ 个转移；4 万次迭代是 $3.93 \times 10^9$ 步，每步 0.02 s，合仿真时间约 2.49 年。论文说一张 RTX 4090 训 16 小时（没说训了多少次迭代）。

<h3 id="实例-8-读表-iii-与表-xi">例 8：读表 III 与表 XI</h3>

- 走路高速 $v_x$ 的误差是低速的 $0.216 / 0.030 = 7.2$ 倍；跳是 $0.532 / 0.090 = 5.9$ 倍。
- 表 XI 低速 $v_x$：HugWBC 0.030，ExBody 0.109（3.6 倍），HOVER 0.559（18.6 倍）；角速度 0.054 对 ExBody 0.587（10.9 倍）。

<h3 id="实例-9-读表-iv-与表-v">例 9：读表 IV 与表 V</h3>

- 被噪声接管时 $v_x$ 误差：不干预训的从 0.0755 涨到 0.8658（11.5 倍）；AMASS 训的从 0.0645 涨到 0.1697（2.6 倍）；HugWBC 从 0.0264 涨到 0.0483（1.8 倍）。
- 无干预时 HugWBC 的姿态三项（0.0372、0.0375、0.0475）不如不干预训的（0.0255、0.0211、0.0380）。
- 表 V 噪声接管下 $D_w$：不干预 25.7132 m，AMASS 3.2630 m，HugWBC 0.0199 m——差了三个数量级。

<h3 id="实例-10-读表-vi">例 10：读表 VI</h3>

真机俯仰误差：站 0.0712、走 0.1006、跳 0.0674 rad，仿真表 III 里是 0.047、0.038、0.048；真机走路俯仰的误差是仿真的 2.6 倍。腰：真机 0.0718、0.0571、0.0552，仿真 0.022、0.075、0.022。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入、怎么跑</summary>

<h3 id="源码-目录">目录</h3>

```
HugWBC/
├── legged_gym/
│   ├── envs/h1/
│   │   ├── h1_config.py           # 命令范围、奖励权重、σ、PD 增益、域随机化、网络（MlpAdaptModel）
│   │   ├── h1.py                  # 命令采样（10% 站立、ψ ∈ {0, 0.5}、冲突截断）、相位与时钟、奖励函数
│   │   ├── h1interrupt_config.py  # --task=h1int：命令 11 维、8 个手臂关节的噪声范围、noise_update_step、disturb_rad
│   │   └── h1interrupt.py         # 干预：噪声目标、每步 0.2 rad、奖励遮罩、噪声课程（random_switch_disturb 未调用）
│   ├── envs/base/curriculum.py    # 网格自适应的速度课程
│   └── scripts/train.py / play.py
└── rsl_rl/rsl_rl/
    ├── algorithms/ppo.py          # PPO + 对称损失（只约束 actor）
    └── modules/net_model.py       # 历史编码器、估计器（只估线速度）、底层网络
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 官方代码（`h1int`） |
|---|---|
| 四种步态：走、跳、站一个策略，单脚跳另训 | 只有 $\psi \in \{0, 0.5\}$ 和 10% 站立；没有单脚跳 |
| 站立 $\phi = 0.25$（$C = 1$、$Cl = 1$） | 站立环境相位置 0（$C = 0.5$、$Cl = 0$），另有站立专用奖励 |
| $\sigma$ 未给 | `kappa_gait_probs = 0.05` |
| 抬脚：五次多项式，权重 −30 | 五次多项式权重 0；三角形 + 0.07 m 踝高，权重 −30 |
| 接触—摆动 −2（表 I 的指数前少了负号） | 力、速度两项，权重 2、4（函数内带负号、再除以 2），速度用三维 |
| 角速度跟踪权重 2，$\exp(-\lVert\cdot\rVert^2 / 0.2)$ | 权重 3，$\sigma = 0.25$ |
| 估计器估 $\hat v, \hat l, \hat h$ | `privileged_recon_dim = 3`：只估线速度 |
| 底层网络 [256, 128, 64] | [256, 128, 32] |
| $I(t)$ 每步以 0.005 翻转 | `switch_prob = 0.005` 写在配置里，翻转函数未调用；每 10 s 重抽命令时一半被接管 |
| 每 90 步抽一个噪声目标，前 2/3 插值 | 每 30 步重抽，每步最多挪 0.2 rad |
| $\alpha$ ±0.01，看线速度与角速度 | ±0.05，只看线速度 |
| 对称损失 $\beta = 0.5$ | `symmetry_loss_coef = 0.5`，只约束 actor、原动作 `detach` |
| 正则奖励没有课程 | 先乘 0.2，每 100 次迭代开 0.8 次方 |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
conda create -n hugwbc python=3.8 -y && conda activate hugwbc
# 装 PyTorch 与 Isaac Gym Preview 4，然后
pip install -e rsl_rl
python legged_gym/scripts/train.py --task=h1int --headless   # 训练
python legged_gym/scripts/play.py --task=h1int               # 可视化
# sim-to-sim：unitree_mujoco；真机与 MuJoCo 的接口：unitree_sdk2_python（README 未附部署脚本）
```

仓库没有附带训练好的权重。

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承四足的步态控制、非对称训练与 HOVER 一类多模式控制器；下启 HOMIE 等「下身 RL 控制器 + 外部上身」的移动操作系统</summary>

- **上承**：腿足的周期步态奖励（Siekmann 等）与 Walk These Ways（步态参数做命令、期望接触）；DreamWaQ 一路的非对称 Actor-Critic；[PPO](../../01_Foundational_RL/PPO_Proximal_Policy_Optimization/PPO_Proximal_Policy_Optimization.html)；[真实世界人形行走](../Real-World_Humanoid_Locomotion_with_RL/Real-World_Humanoid_Locomotion_with_RL.html)（人形强化学习行走）；[ExBody](../Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html)、[OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)、[HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)（把上身目标塞进命令空间、跟参考动作的路线；表 XI 的两个基线）。
- **同期**：[ExBody2](../ExBody2_Advanced_Expressive_Whole-Body_Control/ExBody2_Advanced_Expressive_Whole-Body_Control.html)（表情动作的跟踪精度）。
- **下启**：[HOMIE](../HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html)（同一个实验室：下身 RL 策略在随机上身姿态下练稳，上身交给同构外骨骼，脚踏板给速度和身高）；以及把「下身跟命令 + 上身外部控制」当底座的移动操作系统。
- **两条路线的对照**：HOVER 一类「跟参考动作，上身也在命令里」，好处是全身协调、动作像人；HugWBC 一类「跟命令，上身交给别人」，好处是上层接口简单、上身可以接任何精确的控制器，代价是上身的动作对下身来说只是扰动，策略不知道它接下来要做什么（我们的理解）。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：HugWBC 和 HOVER 都说「统一」，区别在哪？**
A：HOVER 统一的是**跟踪接口**：各种接口都看成全身运动学模仿的子集，教师跟参考动作，学生看掩码后的命令；上身目标在命令里。HugWBC 统一的是**行为参数**：不跟参考动作，命令是速度加步频、抬脚、身高、俯仰、腰和步态，用相位切步态；上身不在命令里，而是被外部控制器直接替换，靠干预训练让下身稳。表 XI 里 HugWBC 跟单个命令比 HOVER 准，但那是让 HOVER 做它不擅长的事。

**Q2：期望接地概率为什么要用正态 CDF 放松？**
A：硬切换在 $\bar\phi = 0.5$ 和 1 处是阶跃，接触—摆动奖励会在切换的一瞬间突变；用 CDF 放松成宽约 $\pm 3\sigma$ 的坡，「该触地」变成连续的权重，奖励平滑。代码 $\sigma = 0.05$，坡宽 ±0.15 个周期。

**Q3：为什么命令里放时钟 $\sin 2\pi\bar\phi$ 而不直接放相位？**
A：相位从 1 回到 0 是跳变，时钟是连续的周期信号，转一圈没有突变；两只脚两个时钟，走时一正一负、跳时重合，网络从两个数就能看出步态。

**Q4：干预训练为什么用均匀噪声，不用人的动作库？**
A：动作库覆盖不到的上身动作，策略没见过（表 IV：AMASS 训的碰到噪声 $v_x$ 误差 0.170）；均匀噪声覆盖整个关节空间，还会让手撞到身体，模拟操作员的误操作。配合噪声课程（$\alpha$ 从 0 慢慢加）和奖励遮罩（被接管时不罚上身），策略学会「上身怎么动，腿都稳住」。

**Q5：为什么被接管时要遮掉上身的正则奖励？**
A：上身此时不归策略管，若还罚上身偏离默认、动作变化率，策略就会想办法把上身「拉回来」，和外部控制器冲突；遮掉后它只需管好下身。

**Q6：对称损失对单脚跳还成立吗？**
A：成立。它要求的是「对称的状态和命令 → 对称的动作」：左脚单脚跳镜像过来就是右脚单脚跳。它和强化学习目标无关，只是一个附加的监督项（$\beta = 0.5$）。官方代码只约束 actor。

**Q7：复现 HugWBC 要注意哪些代码与论文的出入？**
A：站立相位在代码里是 0（不是 0.25）；生效的抬脚奖励是三角形 + 7 cm 踝高；估计器只估线速度；干预每 30 步重抽、每步最多 0.2 rad，翻转函数没调用、而是每 10 s 一半概率被接管；正则奖励有 0.2 起步的课程；没有单脚跳。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-05-17 · 初读；2026-10-18 · 读代码和做算例时看到的五件事</summary>

**2026-05-17 · 初读**：首版摘要，整理了命令空间、期望接地概率、AAC、干预训练和对称损失；旧版里有几处说法不对，见附录 D。

**2026-10-18 · 读代码和做算例时看到的五件事**：

1. **代码里没有单脚跳**，步态只从 $\psi \in \{0, 0.5\}$ 里抽，再加 10% 站立；变量名里的 `hopping` 指的是论文的「跳」。
2. **站立时相位置 0**：期望接地概率落在 0.5，靠站立专用的奖励让双脚着地。论文写的是 0.25。
3. **抬脚的五次多项式在代码里没生效**（权重 0），生效的是三角形目标加 0.07 m 的踝高；两者在摆动段中点都等于 $l$（加不加踝高之别）。
4. **翻转概率 0.005 写在配置里但没用上**：`random_switch_disturb` 没有调用点，实际是重抽命令（10 s 一次）时一半概率被接管。
5. **表 X 里不干预训练的姿态三项**（0.1931、0.4051、0.2283）在站立和跳两段里一模一样，AMASS 那一行也只差一个数，可能是复制错了。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、论文里对不上的几处、arXiv v1 到 v3 的差别、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@inproceedings{xue2025hugwbc,
  title={HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion},
  author={Xue, Yufei and Dong, Wentao and Liu, Minghuan and Zhang, Weinan and Pang, Jiangmiao},
  booktitle={Robotics: Science and Systems (RSS)},
  year={2025}
}
```

<h3 id="b-论文里对不上的几处">B. 论文里对不上的几处</h3>

- 表 I 接触—摆动奖励的两个指数前少了负号（$1 - \exp(\lVert\cdot\rVert^2/\sigma)$ 会是负的大数），正文与代码都是 $\exp(-\cdot)$；正文把 $\sigma _ {cf} = 50$ 写了两遍，第二个应是 $\sigma _ {cv} = 5$。
- 表 V 的表头单位写 m/s，正文说的是一个回合里的位移（米）。
- 正文说抬脚 $l$「跟得最不准」，表 III 里 $E_l = 0.011$ m 是最小的几项之一。
- 真机一节说腰比俯仰误差小，站立那一行腰 0.0718 > 俯仰 0.0712。
- 附录表 X：不干预训练、噪声测试的姿态三项（0.1931、0.4051、0.2283）在站立和跳两段完全相同，AMASS 测试那一行（0.1357、0.2571 / 0.2591、0.1243）也几乎相同。
- 图 2 的图注把 HugWBC 写成「HugHBC」；附录图 8 的图注把腰偏航写成 waist roll（代码的变量名也叫 `waist_roll`）。

<h3 id="c-arxiv-v1-到-v3-的差别">C. arXiv v1 到 v3 的差别</h3>

数字没有变。v3 的改动：奖励表的范数改成平方、加了「提前终止 −200」一行；期望接地概率一节挪到命令空间里；加了训练时长（一张 RTX 4090 16 小时）和附录表 XI（和 HOVER、ExBody 比）；相关工作挪了位置。v2（2025-02-06）只比 v1 晚一天，我们没有单独对比。

<h3 id="d-旧版笔记的改正">D. 旧版笔记的改正</h3>

1. 旧版说对称损失「同时约束策略输出与价值」，写了 $\mathcal L^{\text{critic}} _ {\text{sym}}$——论文只有策略的对称损失，代码也只约束 actor。
2. 旧版说干预动作「采样自人体动作库 / 随机姿态」——论文用的是均匀噪声，AMASS 只是消融里的一个基线。
3. 旧版说「对照 ExBody / OmniH2O / Decoupled Lower-Body Tracking」——论文的对照是干预消融（AMASS、不干预）和附录表 XI（HOVER、ExBody）。
4. 旧版面试题说「单脚跳放在一个策略里会拖累走路的精度（论文实测）」——论文没有这个实验，只说单脚跳很不稳、单独一个策略。
5. 旧版说「对称损失在单脚跳模式下要关掉」——论文明确说单脚跳左右互为镜像，对称损失同样适用。
6. 旧版说「Sec. V 显示步频 / 抬脚 / 速度三者有隐式耦合上限」——论文的命令组合分析在第 IV-B 节（图 8），结论是正交性（见上文）。
7. 旧版说「亦适配同构 humanoid 平台」「Sim2Real 零额外微调」——论文只在 H1 上做，说的是直接部署。
8. 旧版把估计器写成估线速度、身高、抬脚高度——论文如此，但官方代码只估线速度。

</details>

---

## 📎 参考来源

- 论文：Xue, Dong, Liu, Zhang, Pang. *HugWBC: A Unified and General Humanoid Whole-Body Controller for Versatile Locomotion.* RSS 2025. [arXiv 2502.03206](https://arxiv.org/abs/2502.03206)（v3 的 LaTeX 源码：正文第 I–V 节、附录 A–C、表 I–XI、图 1–8）
- 项目页：[hugwbc.github.io](https://hugwbc.github.io/)（动画第 1、13、15 幕的视频片段剪自这里，只做讲解引用）
- 官方代码：[apexrl/HugWBC](https://github.com/apexrl/HugWBC)（`main`，`eb831af`，2025-08-02）
- H1 模型：[MuJoCo Menagerie · unitree_h1](https://github.com/google-deepmind/mujoco_menagerie/tree/main/unitree_h1)；渲染材质：[Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online)
- 相关：Walk These Ways（Margolis & Agrawal, CoRL 2022）；Siekmann 等, *Sim-to-Real Learning of All Common Bipedal Gaits via Periodic Reward Composition*（ICRA 2021）；DreamWaQ（Nahrendra 等, ICRA 2023）；Yu 等, *Learning Symmetric and Low-Energy Locomotion*（SIGGRAPH 2018）
