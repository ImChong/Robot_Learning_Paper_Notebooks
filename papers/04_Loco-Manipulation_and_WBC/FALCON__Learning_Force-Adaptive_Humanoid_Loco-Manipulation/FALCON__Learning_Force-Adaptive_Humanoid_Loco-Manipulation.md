---
layout: paper
title: "FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation"
zhname: "FALCON：力自适应的人形移动操作"
category: "Loco-Manipulation and WBC"
arxiv: "2505.06776"
demos: ["falcon"]
---

# FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation
**手上被拉、被压时，人形照样走得稳、手臂跟得准：把全身控制拆成下身（15 维）和上身（14 维）两个 PPO 智能体，奖励分开、读同一份 575 维本体感受、一起训；训练时往两只手上加三维外力，力的上限按手的雅可比和关节力矩上限逐方向算出来，用狄利克雷分布分给三个方向，再乘一个从小往大加的课程系数；不用力传感器、不估计外力，上身智能体输出的残差会把目标角往反方向挪，让 PD 出够力；仿真里大力档的上身误差约是单策略的一半，G1、Booster T1 上真机拉车、开门、搬重物**

> 📅 阅读日期: 2026-10-05（2026-10-23 第二版：对照 arXiv v2 的 LaTeX 源码和官方仓库逐条核查重写；新增十七幕讲解动画、三个交互演示和配音视频）
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 力自适应 · 双智能体 RL · 力课程 · 隐式力补偿
>
> ℹ️ 笔记对照 [arXiv 2505.06776](https://arxiv.org/abs/2505.06776)（v2，读的是 arXiv 上的 LaTeX 源码：正文、表 1–6、图 1–11、附录）、[项目页](https://lecar-lab.github.io/falcon-humanoid/)和官方仓库 [LeCAR-Lab/FALCON](https://github.com/LeCAR-Lab/FALCON)（2026-04-09 的 `main`，提交 `a967a6d`）。论文没写的数（观测怎么拼、力的上限怎么算、力怎么随时间变、课程怎么加、施力点在哪）都取自代码，下文逐处标明。「🚶 具体实例」与动画里的 G1 是我们用**官方开源的 `g1_29dof.onnx`** 在 MuJoCo 里照官方部署脚本跑出来的，**不是论文的实验**，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2505.06776](https://arxiv.org/abs/2505.06776)（v1 2025-05-10，v2 2025-11-16） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2505.06776) |
| **项目主页** | [lecar-lab.github.io/falcon-humanoid](https://lecar-lab.github.io/falcon-humanoid/)（真机视频：G1 / T1 拉车、开门、提重物、VR 遥操作、站立抗拉、自主搬周转箱，与基线并排对照） |
| **代码** | [LeCAR-Lab/FALCON](https://github.com/LeCAR-Lab/FALCON)（训练代码基于 ASAP 与 HumanoidVerse；sim2sim / sim2real 脚本；G1、T1 训好的模型 `sim2real/models/falcon/*.onnx`） |
| **会议** | L4DC 2026 口头报告（项目页） |
| **作者** | Yuanhang Zhang、Yifu Yuan、Prajwal Gurunath、Ishita Gupta、Shayegan Omidshafiei、Ali-akbar Agha-mohammadi、Marcell Vazquez-Chanlatte、Liam Pedersen、Tairan He、Guanya Shi |
| **机构** | 卡内基梅隆大学（CMU）、Field AI、日产美国（Nissan USA） |
| **平台** | Unitree G1（29 个自由度）、Booster T1（29 个自由度）；训练 IsaacGym，sim2sim 用 MuJoCo |
| **数据** | 上身目标关节角：论文写从 AMASS 采；开源配置用的是 ACCAD 的 252 段（`accad_all.pkl`，约 0.45 小时），评估也是这 252 段 |
| **关键词** | Humanoid loco-manipulation, force adaptation, dual-agent RL, torque-limit-aware force curriculum |

**一行定位**：以前的人形强化学习多是轻任务；Lower-RL-Upper-IK（PMP、HOMIE）的上身没有力补偿，单策略全身 RL（Expressive WBC、HOVER 的设计）探索效率低。FALCON 把两者折中：拆成两个智能体，但观测共享、一起训；再用一个尊重硬件力矩上限的三维力课程，让上身学会「隐式」补偿手上的力。

---

## 🎯 一句话总结

> FALCON 把带力的移动操作写成一个**双目标条件**的问题：下身智能体 $\pi^l$ 跟移动目标（线速度、角速度、站或走、根高度、腰），上身智能体 $\pi^u$ 跟 14 个目标关节角；两个智能体**各有一套奖励和价值函数、各用 PPO 更新**，但**读同一份 5 步历史的本体感受**（代码里 575 维），在同一批回合里一起训；价值网络是非对称的，多看根部线速度和两只手上的外力。训练时往两只手上加三维外力：先由手的雅可比和关节力矩上限算出每个方向最多能加多大的力（式 3–4，**7 个关节里最先顶到上限的说了算**），再用狄利克雷分布抽三个方向的比例 $\gamma$（式 5），最后乘一个随训练加大的课程系数 $\alpha_g$；走路时水平力只留下阻力，施力点沿手随机。不用力传感器，也不估计外力。IsaacGym 里大力档的上身误差 **0.37**，PID 基线 0.60、单策略 0.73（表 1）；不看力矩上限时课程卡在 $\alpha_g \approx 0.6$（图 3）；真机 G1 每只手挂 1.2 kg 走路，上身误差 0.39，约是上身 PD 的五分之一（表 4）。同一套训练设置在 G1、T1 上拉车（峰值 107.9 N）、开门（47.3 N）、提重物。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十七幕动画：FALCON 全流程](#falcon-explainer-anim) —— 约 272 秒串完「手上有力 → 两条老路 → 统一的目标空间 → 两个智能体 → 隐式补偿 → 手腕能吃多大力 → 三个方向怎么分 → 力一点点加上去 → 施力点随机 → 奖励与随机化 → 表 1 → 不看力矩上限 → 为什么训得快 → 真机 1.2 kg → 推车、开门 → 自主搬箱 → 局限与代码」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#falcon-video) —— 同样十七幕，加中文配音与字幕，竖屏，可下载
> [手腕最多能吃多大的力](#demo-bounds) —— 拖 G1 左臂的肩、肘，看三个方向的上限由哪个关节决定；可以切换「代码的做法（重力项乘 0）」和「论文的写法（带重力项）」
> [力怎么采](#demo-sampler) —— 照官方代码一步步算：上限 × 狄利克雷比例 → 三角波相位 → × 课程系数 → 噪声 → 25% 置零 → 裁剪
> [表 1–4 与我们的复现](#demo-tables) —— 八种设置三档力的上身 / 根速度误差，真机表 4，以及我们在 MuJoCo 里的三组复现

> 🚶 [具体实例](#实例-环境设定)用官方模型和官方公式从头算一遍：默认姿态下左手三个方向的上限、带不带重力项差多少、252 段动作里谁卡住竖直方向、一组 $\gamma$ 怎么变成一步的力、课程系数从 0.1 涨到 1 要多少回合、站着加 20 N 时上身智能体把目标挪了多少、走路时的误差、施力点外移时手腕的力矩，最后照图 11 加到 40 N。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **FALCON** | Force-Adaptive Humanoid Loco-Manipulation | 本文：力自适应的人形移动操作 |
| **EE** | End-Effector | 末端执行器，这里指两只手 |
| **Lower-RL-Upper-IK** | — | 下身 RL 走路、上身逆运动学 + PD 跟关节角（PMP、HOMIE 属于这一类）；论文里的 Decoupled 基线 |
| **M-WB-RL** | Monolithic Whole-Body RL | 一个策略管全身 29 维（Expressive WBC、HOVER 的设计）；论文里的单策略基线 |
| **PD / PID** | Proportional–(Integral–)Derivative | 关节比例—（积分—）微分控制 |
| **PD-ID** | PD + Inverse Dynamics | 基线：学一个力估计器，按 $J^\top \tilde F$ 做逆动力学补偿（附录 A.3） |
| **IK** | Inverse Kinematics | 逆运动学：部署时由手的目标位姿解出上身目标关节角 |
| **PPO** | Proximal Policy Optimization | 两个智能体各用 PPO 更新 |
| **AMASS / ACCAD** | — | 人体动捕数据集；ACCAD 是 AMASS 的子集，开源配置用的就是它 |
| **LPF** | Low-Pass Filter | 低通滤波：论文说用来防止力抖动 |
| **DR** | Domain Randomization | 域随机化：摩擦、质量、增益、延迟、推机器人 |

---

## 🎬 十七幕动画：FALCON 全流程 {#falcon-explainer-anim}

<div class="paper-demo" data-demo="falcon-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#falcon-video}

<div class="paper-demo" data-demo="falcon-video" data-src="media/falcon_explainer_video.mp4" data-poster="media/falcon_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/falcon_explainer_video.mp4" download="FALCON_讲解视频.mp4">下载 mp4（19.0 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 2、3、5、6、7、14、17 幕里的 G1 是我们的复现：用官方开源的 `sim2real/models/falcon/g1_29dof.onnx`，照官方 `loco_manip.py` 的观测、动作与 PD 在 MuJoCo 里跑（站着每只手往下加到 20 N、0.5 m/s 走路每只手 11.8 N、照图 11 往后走加到 30 / 40 N、照代码的采样器加三维力），3D 外形照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 材质与光照，按关节角用正交相机逐帧离线渲染，力的箭头按同一个相机投影叠在上面；这些数和交互演示、「🚶 具体实例」是同一组。第 4、9、13、15、16、17 幕用论文图 2、7、5、8、9、11 的裁剪，第 11–13 幕的柱和曲线照论文表 1–4 与图 3、图 4 的数重画（图 3、图 4 在论文里是位图，曲线是按颜色逐列读出来的近似值）；第 1、15、16 幕的真机画面剪自[项目页](https://lecar-lab.github.io/falcon-humanoid/)的视频（画面里标了倍速），只做讲解引用。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    T["带力的移动操作：<br/>搬重物 0–20 N、拉车到 100 N、开门到 40 N"] --> F["手上的力顺着手臂传到躯干和腿<br/>上身要端稳、下身要站稳"]
    F --> P1["Lower-RL-Upper-IK（PMP、HOMIE）<br/>上身 IK + PD：没有力补偿、上下身不协调"]
    F --> P2["单策略全身 RL（Expressive WBC、HOVER）<br/>29 维一起探索：两个目标关联弱、效率低"]
    F --> H["人形比四足更难：<br/>更不稳、力矩上限更紧（G1 手腕 5 N·m）"]
    P1 --> A["FALCON：两个智能体，奖励分开、观测共享<br/>+ 按力矩上限算的三维力课程"]
    P2 --> A
    H --> A

    style H fill:#e8f4fd,stroke:#1f78b4
    style A fill:#e8f8e8,stroke:#27ae60
</div>

### 手上有力，全身都得跟着用力（引言）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：开门、拉车、搬重物都要在多方向的动态力下既操作得准、又站得稳；已有的人形 RL 多是轻任务；力自适应主要做在四足上，人形更难</summary>

- 论文从 2015 年 DARPA 挑战赛的开门任务讲起：这类任务既要在**动态、多方向的力**下操作得准，又要在整个交互过程中保持下身稳定。
- 已有的人形全身 RL「大多在轻任务上成功，没有考虑移动操作中明显的交互力」。
- 四足上已经有不少力自适应的工作，但人形多了几道坎：**更不稳、更复杂、力矩上限更紧**，某些关节构型下尤其明显。G1 的关节力矩上限（官方配置 `dof_effort_limit_list`）是膝 139、髋 88、腰偏航 88、踝 50、肩和肘 25、腕横滚 25、**腕俯仰和腕偏航只有 5 N·m**（动画第 1 幕右边那几根条）。手上挂 2 kg、力臂 0.2 m，腕俯仰就要出约 4 N·m。
- 目标是让人形在**未知的 0–100 N 末端力**（论文说最高约体重的 30%）下既走得稳、又跟得准。

</details>

### 两条老路，各缺一半（第 3 节开头）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Lower-RL-Upper-IK 样本效率高，但上身没有力补偿、全身不协调；Monolithic WB-RL 表达力够，但动作空间大、两个目标关联弱，探索低效</summary>

论文先把问题写成一个统一的形式：本体感受 $s^p_t$、移动目标 $\mathcal{G}^l_t$、操作目标 $\mathcal{G}^u_t$，各种方法的区别只在**动作怎么来**：

- **Lower-RL-Upper-IK**：下身动作由策略 $\pi^l: s^p_t \times \langle \mathcal{G}^l_t, \mathcal{G}^u_t \rangle \mapsto \mathcal{A}^l_t$ 输出，上身动作由 IK 根据 $\mathcal{G}^u_t$ 算出来。样本效率高，但「忽略了上身的力补偿，也忽略了末端受力时的全身耦合」。PD 要出力就得先有误差 $\tau = k_p(q^{\ast} - q) - k_d \dot q$，G1 腕俯仰的 $k_p$ 只有 4 N·m/rad（官方部署配置），手上 20 N、力臂 0.14 m 就要偏 0.7 rad 才出得够力——动画第 2 幕左边就是这个现象。
- **Monolithic Whole-Body RL**：一个策略 $\pi: s^p_t \times \mathcal{G}_t \mapsto a_t$ 直接输出全身 29 维。表达力够，但「动作空间大，两个目标关联很弱，探索效率低」。
- **FALCON**：两个智能体，**奖励分开**（各自聚焦）、**观测共享**（互相看得见）、**一起训**。

</details>

### 贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：双智能体框架、尊重力矩上限的三维力课程、两台人形上验证</summary>

1. 双智能体 RL 框架：在未知、明显的末端力（0–100 N，最高约体重 30%）下做带力的移动操作；上身关节跟踪精度比以前的方法高 100%（摘要写「2 倍」），同时保持移动的鲁棒。
2. 三维力课程：逐步加力，同时保证关节力矩可行、把力自适应能力用足。
3. 在 Unitree G1、Booster T1 两个平台上验证，跨平台几乎不用调。

</details>

---

## 🔧 方法详解（第 3 节）

<div class="mermaid">
flowchart LR
    subgraph TRAIN["训练（IsaacGym，4096 个环境）"]
        S["本体感受 5 步历史<br/>+ 移动目标 + 上身目标<br/>（代码：115 × 5 = 575 维）"] --> L["下身智能体 π^l<br/>15 维 · 39 项奖励"]
        S --> U["上身智能体 π^u<br/>14 维（残差）· 10 项奖励"]
        J["手的雅可比 + 力矩上限<br/>→ 每个方向的上下限"] --> D["× 狄利克雷比例 γ<br/>三角波扫区间、25% 置零"]
        D --> C["× 课程系数 α<br/>走路时只留阻力"]
        C --> SIM["仿真：力加在手上<br/>施力点沿手随机"]
        L --> SIM
        U --> SIM
        SIM --> S
    end
    subgraph DEPLOY["部署"]
        T["VR 遥操作 / 手柄<br/>或 FoundationPose + IK"] --> G["上身目标关节角<br/>速度、高度、腰"]
        G --> L2["下身智能体"]
        G --> U2["上身智能体"]
    end
    L -.同一组权重.-> L2
    U -.同一组权重.-> U2
</div>

### 统一的目标空间（第 3 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：29 个关节分成下身 15、上身 14；本体感受取 5 步历史；移动目标与操作目标；代码里每步 115 维、5 步 575 维，三成回合把上身固定在某一帧</summary>

- **关节**：G1 的 29 个关节分成下身 $n^l = 15$（两条腿各 6 + 腰 3）、上身 $n^u = 14$（每条臂肩 3 + 肘 1 + 腕 3）。
- **本体感受**：$s^p_t = [q _ {t-4:t},\ \dot q _ {t-4:t},\ \omega^{root} _ {t-4:t},\ g _ {t-4:t},\ a _ {t-5:t-1}]$，关节角、关节速度、根部角速度、重力投影、上一步动作的 5 步历史。
- **移动目标** $\mathcal{G}^l_t = [v^{lin,ang}_t,\ \phi^{stance}_t,\ h^{root}_t,\ w^{yaw}_t]$：线 / 角速度、站或走、根高度、腰偏航。代码里腰命令是 3 维，横滚和俯仰一直是 0（我们读代码的结果）。
- **操作目标** $\mathcal{G}^u_t = q^{upper*}_t \in \mathbb{R}^{14}$：训练时从动作数据里采，部署时由 IK 解出来。开源配置用 ACCAD 的 252 段；训练命令里 `fix_upper_body_prob=0.3`，三成的回合把上身目标固定在其中一帧。官方部署脚本的 IK 只解肩、肘 8 个关节，手腕置 0。
- **代码里的观测**（`g1_29dof_obs_diff_force_history_wolinvel_ma.yaml`）：每步按名字排序拼成 115 维——上一步动作 29、根部角速度 3、角速度命令 1、根高度命令 1、线速度命令 2、站 / 走 1、腰命令 3、关节角 29、关节速度 29、重力投影 3、上身目标 14；5 步历史一共 **575 维**，两个智能体读同一条向量。

</details>

### 两个智能体：奖励分开、观测共享（3.1 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：下身 15 维、上身 14 维，各一套奖励和价值函数、各用 PPO；读同一份观测、一起训；非对称 critic 多看根部线速度和末端外力；官方 onnx 是两个 512–256–128 的网络并排</summary>

$$
r^l_t = \mathcal{R}^l(s^p_t, \mathcal{G}^l_t), \qquad r^u_t = \mathcal{R}^u(s^p_t, \mathcal{G}^u_t)
$$

- 下身 $\pi^l$ 与价值函数 $V^l$、上身 $\pi^u$ 与 $V^u$，各自最大化自己的折扣回报，用 PPO 更新；动作拼成 $a_t = [a^l_t;\ a^u_t]$ 交给关节 PD。
- **两者看同一份本体感受**、在同一批回合里一起训：上身看得到步态，下身看得到手上的负载。这和「先分别训好再拼起来」不一样。
- **非对称 actor-critic**：critic 额外看根部线速度和末端外力 $F^{ee}_t$，真机上拿不到，只在训练时给。代码里 critic 读 128 维、只看当前一步（我们读配置的结果）。
- **代码里的两组奖励**（`reward_dec_loco_stand_height_ma_diff_force.yaml`）：下身 39 项、上身 10 项；摔倒的终止惩罚 $-250$ 只算在下身；上身是关节跟踪 + 力矩、速度、加速度、动作变化率与限位惩罚。
- **官方 onnx**（`sim2real/models/falcon/g1_29dof.onnx`）：两个 MLP 并排，各是 575 → 512 → 256 → 128（ELU）再一层输出，分别出 15 维和 14 维，拼成 29 维。

</details>

### 隐式补偿：上身输出的是残差（图 2、代码）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上身目标 = 参考关节角 + 0.25 × 上身动作；没有力传感器、没有力估计器，外力从本体感受的历史里看出来，上身智能体把目标往反方向挪，让 PD 出够力；我们的复现：腕俯仰目标挪到 −0.79 rad，实际只偏 0.01</summary>

- 论文图 2 里 $q^{upper}$ 和 $a^u$ 之间有个加号；代码 `residual_upper_body_action: True`：

$$
q^{tgt}_{upper} = q^{upper*}_t + 0.25\, a^u_t
$$

  上身智能体只管「在参考上挪多少」。下身是 $q^{tgt} _ {lower} = q^{default} + 0.25\,a^l_t$。
- **为什么叫隐式补偿**：PD 要出力就得有误差。上身智能体从本体感受的历史（关节角被压偏、速度变了、上一步的动作……）看出手上有力，就把目标角往反方向挪，让 PD 在实际角度几乎不动的情况下出够力。不需要力传感器，也不需要力估计器。
- 我们的复现（[例 5](#实例-5-站着往下加-20-n上身智能体挪了多少)）：站着每只手往下 20 N，FALCON 把左腕俯仰的目标挪到 −0.79 rad，实际只偏了 0.01 rad；把上身输出置零、只剩 PD 时，手腕垂了 0.59 rad，手往下沉 92 mm。

</details>

### 手腕最多能吃多大的力（式 3–4）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：任何关节都不能超限 → 每个方向取「剩下的力矩 ÷ 力臂」的最小值；代码把重力项乘了 0、ε = 0.01、上限再乘 0.9；默认姿态左手：前 106、左 107、上 80 N</summary>

论文的约束（$J _ {EE} \in \mathbb{R}^{3 \times 7}$ 是一只手的雅可比，$\tau^g$ 是重力补偿力矩）：

$$
-\tau^{\lim} \le \tau^g + J_{EE}^\top f^{ee} \le \tau^{\lim}
$$

逐方向取最坏情况（式 4）：

$$
f_i^{\max} = \min_j \frac{\tau_j^{\lim} - \tau_j^g}{\lvert J_{EE}^{ji} \rvert + \epsilon}, \qquad
f_i^{\min} = \max_j \frac{-\tau_j^{\lim} - \tau_j^g}{\lvert J_{EE}^{ji} \rvert + \epsilon}
$$

- 读法：关节 $j$ 还剩的力矩，除以它对方向 $i$ 的力臂，**7 个关节里最先顶到上限的说了算**。每个方向分开算，没考虑三个方向同时加力时力矩叠加（这是式 4 本身的近似）。
- **代码**（`_calculate_max_ee_forces`）：`joint_effort_est *= 0.0`，也就是 $\tau^g$ **乘了 0**；$\epsilon = 0.01$；上限是配置值再乘 `dof_effort_limit_scale=0.9`；雅可比取在手连杆（`rubber_hand`）的**原点**，论文写的是末端的质心；只用手臂 7 个关节，腰的那几列算出来了但没用（后处理被注释掉）。
- **默认姿态的左手**（[例 1](#实例-1-默认姿态下左手三个方向的上限)）：前 106.0 N（肩俯仰决定）、左 107.2 N（肩偏航）、上 80.4 N（腕俯仰）；带上重力项，往下只剩 73.2 N、往上变成 87.5 N。
- 在 252 段 ACCAD 动作的 4,934 帧上，竖直方向六成被腕俯仰卡住（[例 2](#实例-2-252-段动作里谁卡住竖直方向)）。

</details>

<div class="paper-demo" data-demo="falcon-bounds" id="demo-bounds"><p class="demo-fallback">（本节含交互演示：手腕最多能吃多大的力，需要启用 JavaScript）</p></div>

### 三个方向怎么分（式 5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：狄利克雷分布抽三个方向的比例 γ；每个方向在 [γ·下限, γ·上限] 里均匀采；代码是三角波来回扫、加噪声、25% 置零、最后裁剪；两只手共用一组 γ、各走各的相位</summary>

论文：先从狄利克雷分布抽比例 $\gamma = [\gamma_x, \gamma_y, \gamma_z]$（$\sum \gamma_i = 1$），再

$$
f^{ee}_t = \sum_{i \in \{x,y,z\}} F_i\, e_i, \qquad F_i \sim \mathcal{U}\big[\gamma_i f_i^{\min},\ \gamma_i f_i^{\max}\big]
$$

左右手的上身姿态不同，算出来的区间也不同。

代码（`_scale_forces` 与 `_update_apply_force_phase`）和「均匀采」不完全一样，我们读代码的结果：

1. 狄利克雷参数是 $(1, 1, 1)$：在三角形里均匀撒点；**两只手共用同一组** `force_xyz_scale`（左右各自的那两组抽了但没用）；每次重采命令时（10 s 一次）重抽。
2. 力不是每步重抽，而是按一个**三角波相位**在区间里来回扫：$F = f^{\min} + (f^{\max} - f^{\min})\cdot \text{phase}$，phase 在 0 和 1 之间往返，一个来回 150–250 步（3–5 s，`randomize_force_duration`），左右手各走各的相位。
3. 乘课程系数 $\alpha$，再加 $\mathcal{U}(0, 1)$ N 的噪声。
4. 每个方向 **25%** 的概率直接置零（`zero_force_prob`）。
5. 最后裁剪：$x, y \in [-40, 40]$ N，$z \in [-50, 5]$ N。论文说表 1 用的是 $\pm 50$ 与 $[-60, 5]$ N，表 2 是 $\pm 100$ 与 $[-100, 5]$ N，开源配置是更窄的 $\pm 40$ 与 $[-50, 5]$ N。
6. 相位只在**站着**的环境里往前走，走路的环境停在原来的相位；而且 `_resample_commands` 里 `env_ids_stance = torch.where(self.commands[env_ids, 4] == 0)[0]` 取的是 `env_ids` 子集里的下标，不是全局编号（我们读代码看到的，像是笔误；对训练的实际影响我们没有测）。

</details>

### 力一点点加上去：课程、阻力与滤波（3.2 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：力再乘全局课程系数 α_g；代码里每个环境一个 α，撑过 210 步 +0.02、不到 200 步 −0.02；走路时水平力投到前进方向的反方向；低通滤波训练时关着；合力 50 N 以上行走高度不扣分</summary>

- 论文：$F^{ee}_t = \alpha_g \cdot f^{ee}_t$，$\alpha_g \in (0, 1)$ 随训练增大；评估时三档 $\alpha_g = 0, 0.5, 1$。
- **代码的课程**（`_update_force_scale_curriculum`）：每个环境自己一个 $\alpha$，初始 0.1；回合结束时，撑过 **210 步**（4.2 s）就 +0.02，不到 **200 步**就 −0.02，夹在 $[0, 1]$。看的是**活得多久**，不是跟得多准（按跟踪奖励升降的写法被注释掉了）。从 0.1 涨到 1 至少要 45 个撑满的回合。
- **走路时只给阻力**（`only_apply_resistance_when_walking`）：水平力投到前进方向的反方向、取绝对值，$F _ {xy} \leftarrow \|F _ {xy} \cdot \hat d\|\, \hat d$，$\hat d$ 是速度命令方向取反；原地踏步的环境随机给左或右一个方向。
- **低通滤波**：论文说用来减少力的抖动；代码 `use_lpf: False`，训练时**关着**，评估时 `set_is_evaluating` 里才打开（$\alpha = 0.05$，滤的是上下限）。
- **行走高度奖励按合力放宽**（`_reward_tracking_walk_base_height`）：$e_h \leftarrow \|h^{cmd} - h\| \cdot (1 - \min(\|F\|/50, 1))$，两只手合力 50 N 以上，行走时的高度误差不再扣分。论文没写这一条。

</details>

<div class="paper-demo" data-demo="falcon-sampler" id="demo-sampler"><p class="demo-fallback">（本节含交互演示：力怎么采，需要启用 JavaScript）</p></div>

### 施力点随机：为什么不显式估计力（3.2 节、附录 A.3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：施力点沿手随机，从腕偏航到手的末端；基线 PD-ID 的力估计器估得挺准，但补偿 J^T F 要知道施力点，点一变就错，还假设准静态；FALCON 不估计力</summary>

- 论文：施力点沿末端连杆随机，「从腕偏航到远端」，因为接触点变了雅可比的映射就变了。代码（`_pre_compute_observations_callback`）：在手连杆原点和腕偏航连杆往前 $(0.18, \pm 0.025, 0)$ m 的点之间，按比例 $r \sim \mathcal{U}(0, 1)$ 取一点；评估时固定 $r = 0.5$；T1 的配置是 0.5–2.0。
- **同样 20 N 向下**，按 G1 模型算，腕俯仰到施力点的水平力臂从 0.046 m（$r=0$）到 0.226 m（$r=1$），腕俯仰要出的力矩从 0.92 涨到 4.52 N·m，贴着 5 N·m 的上限（[例 7](#实例-7-施力点往外挪手腕多吃多少)）。**但代码算力的上限时用的是原点的雅可比**，所以我们推测：施力点外移时，实际加上去的力可能超出这个关节的上限。
- **基线 PD-ID**（附录 A.3）：仿照 Portela 等人联合训一个三维力估计器，输入本体感受，输出 $\tilde F^{ee}_t$，喂给下身策略；上身按 $\tau = K_p(q^{upper}_t - q^{upper*}_t) + K_d \dot q^{upper}_t + J _ {EE}^\top \tilde F^{ee}_t$ 补偿（式子照抄附录，$K_p$ 项的符号和常见写法相反）。图 7(b) 里估计（黄）和真实（红）几乎重合；可**施力点一变，$J _ {EE}$ 就不对**，论文说部署时还要力传感器来定位施力点；而且补偿假设准静态，关节在动时误差更大。
- FALCON 不估计力：训练时施力点、方向、大小都随机，策略从本体感受历史里自己适应。

</details>

### 奖励与域随机化（附录 A.1–A.2、表 5–6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：在 OmniH2O / Expressive WBC 的奖励上加了六项惩罚和六项任务奖励；表 6 的随机化；代码与表的出入：上身 σ、摩擦下限、推机器人、延迟</summary>

**表 5：额外加的项**

| 惩罚 | 权重 | 任务奖励 | 权重 |
|------|------|------|------|
| 髋关节位置 | −2.5 | 根部线速度 $x$ | 2 |
| 膝关节为负 | −1.0 | 根部线速度 $y$ | 1.5 |
| 站立时两脚前后错开 | −5.0 | 根部角速度 | 4 |
| 站立时根部偏离两脚中点 | −5.0 | 行走时根高度 | 2 |
| 站立时脚离地 | −0.15 | 腰三个关节 | 2 |
| 踝横滚 | −2.0 | 上身关节 | 4 |

下蹲（根高度）和扭腰是这一篇新加的目标。代码与表的出入（我们读代码的结果）：上身跟踪 $\exp(-\lVert q^{upper} - q^{ref} \rVert^2/\sigma)$ 的 $\sigma$ 代码是 **0.1**，表 5 写 0.01；表 5「根部线速度 $y$」那一行的式子里写的是 $x$（笔误）；惩罚类奖励前期打折，训练命令里 `reward_initial_penalty_scale=0.1`，按 `reward_penalty_degree` 慢慢加到 1。

**表 6：域随机化**

| 项 | 论文 | 代码（`domain_rand_rl_gym.yaml` 等） |
|----|------|------|
| 摩擦 | $\mathcal{U}(0.5, 1.25)$ | $\mathcal{U}(0.25, 1.25)$ |
| 连杆质量 | ×$\mathcal{U}(0.9, 1.2)$ | 同 |
| 基座加质量 | $\mathcal{U}(-1, 3)$ kg | 同 |
| P / D 增益 | ×$\mathcal{U}(0.9, 1.1)$ | 同 |
| 控制延迟 | $\mathcal{U}(0, 20)$ ms | 0 或 1 步（20 ms） |
| 推机器人 | 每 5 s，1 m/s | 默认关着 |

</details>

---

## 📊 实验结果（第 4 节）

论文要回答三个问题：**Q1** 上身操作和下身移动能不能都比基线好？**Q2** 为什么比单策略训得快？**Q3** 能不能换机器人？

指标（越小越好）：上身关节跟踪误差 $E^{upper} = \frac{1}{T}\sum_t \lvert q^{upper}_t - q^{upper*}_t \rvert$，根速度跟踪误差 $E^{root} = \frac{1}{T}\sum_t \lvert v^{lin,ang}_t - v^{lin,ang*}_t \rvert$。论文没写单位，也没说 14 个关节是求和还是取平均。

### 表 1：六个基线、三档力（Q1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：IsaacGym、G1、252 段 ACCAD 上身目标，三档力 α_g = 0 / 0.5 / 1；大力档上身 FALCON 0.37、PID 0.60、PD-ID 0.53、单策略 0.73；根速度各家 0.44–0.47；力课程对谁都有用，FALCON 受益最多</summary>

| 方法 | 上身 N | 上身 M | 上身 L | 根速度 N | 根速度 M | 根速度 L |
|------|------|------|------|------|------|------|
| 上身 PD（不加力课程） | 0.46 | 0.94 | 1.44 | 0.38 | 0.66 | 1.14 |
| 上身 PD + 力课程 | 0.44 | 0.93 | 1.42 | 0.33 | 0.38 | 0.46 |
| 上身 PID + 力课程 | 0.24 | 0.31 | 0.60 | 0.32 | 0.35 | 0.46 |
| 上身 PD-ID + 力课程 | 0.29 | 0.38 | 0.53 | 0.40 | 0.42 | 0.47 |
| 单策略（不加力课程） | 0.46 | 1.03 | 1.65 | 0.34 | 0.67 | 1.28 |
| 单策略 + 力课程 | 0.43 | 0.50 | 0.73 | **0.28** | **0.32** | **0.44** |
| FALCON（不加力课程） | **0.14** | 0.55 | 1.06 | 0.32 | 0.66 | 1.24 |
| **FALCON + 力课程** | 0.21 | **0.24** | **0.37** | **0.27** | **0.30** | 0.45 |

- 大力档上身：FALCON 0.37，约是单策略 0.73 的一半（摘要的「2 倍」），约是 PID 0.60 的 0.6 倍。
- 根速度误差各家接近，加了力课程的在 0.44–0.47；FALCON 的优势主要在上身。
- 力课程对谁都有用，FALCON 受益最多（1.06 → 0.37）；没有外力时，不加课程的 FALCON 反而最低（0.14 对 0.21），为扛力付出一点代价。
- 正文说 PD-ID 是在 (a)（不加力课程）上扩展，表里这一行写的是 `PD-ID-Force-Curr.`，两处对不上。

</details>

### 不看力矩上限会怎样（图 3、表 2、表 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：对照组在 ±100 N 里随便加力；课程卡在 α_g ≈ 0.6，上身误差 0.30 对 0.17；表 2 大力档上身 0.61 对 0.36；表 3 把裁剪范围放大，几乎不变</summary>

- 对照：不管力矩可不可行，在 $x, y \in [-100, 100]$、$z \in [-100, 5]$ N 里随机加力；评估时两边都在力矩上限算出的范围里加力。
- 图 3(a)：不看上限的课程系数涨到约 0.78 又掉回、停在 **0.6** 附近，按上限算的一路涨到约 0.95（读图近似值）；论文说是经常顶到力矩上限，课程推不上去。
- 图 3(b)：上身跟踪误差训练到最后约 0.30 对 0.17（读图）；论文的解释是力超出可行范围，上身学不会有效补偿，策略转而只顾走路。
- 表 2（大力档）：上身 0.61 对 **0.36**，根速度 0.54 对 **0.39**。
- 表 3：裁剪范围从 $\pm 50$（$z$：$-60$ 到 5）放大到 $\pm 100$（$z$：$-100$ 到 5）N，大力档上身 0.37 对 0.36，几乎不变：按力矩上限算的课程对范围不敏感。

</details>

### 为什么训得更快（图 4、图 5，Q2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：FALCON 的动作噪声降得快而平稳；上身跟踪 0.10 对 0.24、根速度 0.28 对 0.42；单策略的躯干、踝惩罚更大，真机上弯腰、重心偏</summary>

图 4 的数是读图近似值（论文里单策略是绿线、FALCON 是红线）：

| 量 | FALCON | 单策略 |
|----|------|------|
| 上身动作噪声标准差 | 0.40 → 0.12 | 先涨到 1.17，再降到 0.41 |
| 下身动作噪声标准差 | 0.69 → 0.14 | 0.78 → 0.20 |
| 上身关节跟踪误差（训练末） | 0.10 | 0.24 |
| 根速度跟踪误差（训练末） | 0.28 | 0.42 |
| 躯干朝向惩罚 | −0.014 | −0.026 |
| 踝横滚惩罚 | −0.043 | −0.055 |

- 论文：单策略的两个目标搅在一起，噪声迟迟降不下来；而且「全身过度补偿」，躯干、踝惩罚更大。正文说的是「根部角速度」误差，图里标的是根速度。
- 图 5 真机搬重物：上身 PD 手臂被压下去；单策略弯腰、重心往前偏；FALCON 手端平、躯干直。
- 我们的理解：拆开以后，两边的奖励信号更干净，各自的探索噪声能更早降下来。

</details>

### 真机：每只手 1.2 kg（表 4）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：G1 每只手 1.2 kg、0.5 m/s 往前走、上身默认姿态；上身误差 FALCON 0.39、单策略 0.81、上身 PD 1.81；根速度 0.42 / 0.58 / 0.40</summary>

| 方法 | 上身误差 | 根速度误差 |
|------|------|------|
| 上身 PD + 力课程 | 1.81 ± 0.13 | **0.40** ± 0.04 |
| 单策略 + 力课程 | 0.81 ± 0.11 | 0.58 ± 0.05 |
| **FALCON** | **0.39** ± 0.08 | 0.42 ± 0.03 |

设置：$(0.5, 0)$ m/s、角速度 0、高度和腰固定、上身保持默认姿态。FALCON 的上身误差约是上身 PD 的五分之一；根速度误差上身 PD 略低（论文把 0.40 和 0.42 都标红）。

我们在 MuJoCo 里照做的复现见[例 6](#实例-6-走路时每只手-118-n)。

</details>

### 推车、开门、搬重物（图 1、图 8，Q3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：G1、T1 同一套训练设置，遥操作上真机；拉车最高约 100 N（峰值 107.9 N），开门约 40 N（47.3 N），搬运 0–20 N；站立抗拉 G1 57.4 N、T1 66.3 N</summary>

- 两台机器人用同一套训练设置，「不改奖励、不改力课程」；操作员用 VR 头显和手柄给目标。代码里 T1 的配置另外改了脚的高度、根高度和施力点比例（我们读配置的结果）。
- 三类任务（力的范围由测力计测，附录 A.4）：**搬运**，竖直 0–20 N，走得稳、上身跟得准；**拉车**，走路时最高约 100 N 的纵向力，下身往前倾顶住；**开门**，站着时最高约 40 N 的三维力。
- 测力计峰值（图 8）：拉车 107.9 N（T1 拉，车上坐着 G1 和 H1）、开门 47.3 N、站立抗拉 G1 57.4 N、T1 66.3 N。论文说 T1 更大是因为重心低；附录这句原文写成「Booster T1 比 Booster T1 大」，是笔误。
- 项目页的对照视频：基线（下身 RL + 上身 IK、不加力课程）拉车原地踏步、开门手被带偏、提重物手被压下去；FALCON 都做得到。

</details>

### 自主搬周转箱（图 6、附录 A.5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：动捕定位机器人和两张桌子，状态机四个状态，FoundationPose 估计箱子位姿，抓取点交给 IK；FALCON 只负责执行、扛住未知重量</summary>

- 任务：走到取货台，拿起重量未知的周转箱，送到放置区；只在 G1 上做。
- 状态机四个状态：空手走、站着拿起、拿着走、站着放下。
- 动捕给出机器人、取货台、放置台的 6D 位姿；到了取货台就切到「站着拿起」。
- FoundationPose：先扫描箱子做出带纹理的 3D 模型，再从 G1 的相机画面估计箱子的 6D 位姿；箱子两侧预先标好抓取点，经相机外参换到机器人坐标系，交给 IK（go-to-pose）解出上身目标关节角。
- 任务层全靠外部模块，FALCON 只负责执行：箱子多重不用告诉它。

</details>

### 局限（第 5 节、附录 A.6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只管手上的力、不管多点接触；只有力没有力矩；电机发热，真机每只手约 2 kg，MuJoCo 里 3 kg 以上</summary>

1. **只管末端的力**：身体其他部位的接触、多点接触不管（靠墙、抵住、协作抬举）。
2. **只有力，没有力矩**：拧把手、偏心负载这类转动扰动处理不了。
3. **电机发热**（附录）：真机上手腕长时间扛大力矩很快过热，默认姿态下每只手只能稳定搬约 2 kg；同一个策略在 MuJoCo 里（只截断力矩、不建模发热）以 −1 m/s 往后走能搬 3 kg 以上（图 11）。拉车这类只需短时大力矩的任务不容易过热。
4. 我们补充的：任务层（定位、感知、状态机）全靠外部模块；上身目标在开源配置里只有 ACCAD 252 段，评估也用这 252 段。

</details>

<div class="paper-demo" data-demo="falcon-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 1–4 与我们的复现，需要启用 JavaScript）</p></div>

---

## 🚶 具体实例

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：用官方模型和官方公式从头算：默认姿态的上限、带不带重力项、252 段谁卡住、一组 γ 怎么变成一步的力、课程要多少回合、站着加 20 N、走路 11.8 N、施力点外移、照图 11 加到 40 N</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **模型与观测**：官方 `sim2real/models/falcon/g1_29dof.onnx`，观测、动作与 PD 照官方 `sim2real/rl_policy/loco_manip/loco_manip.py` 与配置 `sim2real/config/g1/g1_29dof_falcon.yaml`：观测按名字排序拼接，每步 115 维、5 步 575 维；动作 × 0.25 加默认姿态，上身再加参考关节角（残差）；PD 用配置的 `MOTOR_KP` / `MOTOR_KD`，力矩按 `motor_effort_limit_list` 截断。
- **仿真**：MuJoCo，官方 `humanoidverse/data/robots/g1/scene_g1_29dof_freebase.xml`，步长 0.005 s，策略 50 Hz。纯 PD 站不住（约 1 s 就倒），所以一开始就交给策略（官方 sim2sim 是先用弹性带吊着、再手动启用策略）。
- **外力**：用 `mj_applyFT` 加在手连杆原点和腕偏航连杆往前 $(0.18, \pm 0.025, 0)$ m 的点之间、比例 0.5 处（官方评估时的比例）。
- **「上身置零」**：把上身智能体的 14 维输出置零，只留 PD 跟参考关节角。这是我们的消融，下身还是 FALCON 的，**不是论文的 Upper-PD 基线**。
- 力的上限、狄利克雷比例、三角波、课程照官方 `decoupled_locomotion_stand_height_waist_wbc_ma_diff_force.py` 的公式算；雅可比与重力项取自 MuJoCo 的 `mj_jacBody` 与 `qfrc_bias`。
- 以上**都不是论文的实验**，数字只用来看机制；量级可以和论文比，绝对值不行。

<h3 id="实例-1-默认姿态下左手三个方向的上限">例 1：默认姿态下左手三个方向的上限</h3>

上身关节全 0（前臂端平），左手连杆原点的雅可比（只列非零项，m）：

| 方向 | 肩俯仰 | 肩横滚 | 肩偏航 | 肘 | 腕俯仰 |
|------|------|------|------|------|------|
| $x$ 前 | −0.202 | 0 | −0.002 | −0.010 | 0 |
| $y$ 左 | 0.055 | 0.194 | 0.200 | 0 | 0 |
| $z$ 上 | −0.192 | 0.008 | 0 | −0.184 | −0.046 |

上限取 $0.9\,\tau^{\lim}$：肩、肘、腕横滚 22.5 N·m，腕俯仰、腕偏航 4.5 N·m；$\epsilon = 0.01$；代码的 $\tau^g = 0$：

- $x$：肩俯仰 $22.5 / (0.202 + 0.01) = 106.0$ N，其余关节的候选都更大 → **106.0 N**；
- $y$：肩偏航 $22.5 / (0.200 + 0.01) = 107.2$ N → **107.2 N**；
- $z$：腕俯仰 $4.5 / (0.046 + 0.01) = 80.4$ N，比肘的 $22.5 / 0.194 = 116$ N 小 → **80.4 N**。

$\tau^g = 0$ 时上下限对称（$\pm$）。按论文的写法带上重力项（MuJoCo 算的 $\tau^g$：肩俯仰 −2.09、肘 −1.88、腕俯仰 −0.40 N·m）：

- $z$ 上限 $= (4.5 + 0.40) / 0.056 = 87.5$ N，下限 $= (-4.5 + 0.40) / 0.056 = -73.2$ N；
- $x$ 上限 115.8、下限 −96.1 N；$y$ 不变（肩偏航的重力项是 0）。

也就是说代码不算重力项时，往下能加的力被高估了约 7 N（80.4 对 73.2）。

<h3 id="实例-2-252-段动作里谁卡住竖直方向">例 2：252 段动作里谁卡住竖直方向</h3>

把 ACCAD 252 段动作每 10 帧取一帧（共 4,934 帧），按代码的公式算左手的上限：

| 竖直方向由谁决定 | 帧数 | 占比 |
|------|------|------|
| 腕俯仰 | 2,992 | 60.6% |
| 肩俯仰 | 1,472 | 29.8% |
| 肩横滚 | 441 | 8.9% |
| 其他 | 29 | 0.6% |

三个方向上限的中位数：$x$ 75.9、$y$ 77.3、$z$ 120.1 N。腕俯仰的上限只有 5 N·m，只要它对竖直方向有力臂，它就最先顶到。

<h3 id="实例-3-一组-γ-怎么变成一步的力">例 3：一组 γ 怎么变成一步的力</h3>

默认姿态左手，复现里那一回合抽到 $\gamma = (0.307, 0.445, 0.247)$（三位小数，加起来是 0.999）：

1. 缩过的区间：$x \in [-32.5, 32.5]$、$y \in [-47.7, 47.7]$、$z \in [-19.8, 19.8]$ N（例 1 的 106.0 / 107.2 / 80.4 各乘 $\gamma$）。
2. 相位 phase = 1（三角波的顶点）、$\alpha = 1$：$F = (32.5, 47.7, 19.8)$ N，再加 $\mathcal{U}(0,1)$ 噪声（取均值 0.5）→ $(33.0, 48.2, 20.3)$ N。
3. 25% 置零：这一回合三个方向都没被置零。
4. 裁剪：$y$ 裁到 40 N，$z$ 裁到 5 N → $(33.0, 40.0, 5.0)$ N。
5. 相位 phase = 0.5（三角波中点）：区间中点是 0，只剩噪声 → 约 $(0.5, 0.5, 0.5)$ N。

所以默认姿态下，竖直向上的力几乎总被 5 N 的裁剪限住，向下最多 −19.8 N（这一回合 $\gamma_z = 0.247$）。交互演示[力怎么采](#demo-sampler)可以一步步换 $\gamma$、相位、$\alpha$ 看。

<h3 id="实例-4-课程系数从-01-涨到-1">例 4：课程系数从 0.1 涨到 1</h3>

每个回合结束时：撑过 210 步（4.2 s）+0.02，不到 200 步 −0.02，200–210 步不变。从 0.1 到 1 要净涨 0.9，即**至少 45 个撑满的回合**；中间每摔一次（不到 200 步）要多撑一个回合补回来。回合上限按配置是 20 s（1000 步），所以撑满并不难，课程主要卡在「力太大就摔」上——这也是图 3 里不看力矩上限时课程卡在 0.6 的原因（论文的解释）。

<h3 id="实例-5-站着往下加-20-n上身智能体挪了多少">例 5：站着往下加 20 N，上身智能体挪了多少</h3>

站着（动画第 2、5 幕），上身目标是默认姿态（前臂端平），每只手往下的力在 4 s 内从 0 线性加到 20 N，再保持 4 s；取最后 4 s 的平均：

| 量 | FALCON | 上身置零（只剩 PD） |
|----|------|------|
| 左腕俯仰的**目标**（rad） | −0.790 | 0（参考） |
| 左腕俯仰的**实际**（rad） | −0.010 | +0.593 |
| 上身 14 个关节的误差之和（rad） | 0.184 | 1.751 |
| 左手往下沉（mm） | 1.2 | 92.0 |
| 左腕俯仰的力矩（N·m） | 3.12 | 2.38 |

FALCON 把目标往上挪了 0.79 rad，腕俯仰的 PD（$k_p = 4$）出 $4 \times 0.78 \approx 3.1$ N·m，正好扛住 20 N 在约 0.16 m 力臂上的力矩；实际角度几乎不动。只剩 PD 时手腕要垂到 0.59 rad 才出得了 2.4 N·m（垂下去后力臂也变短了）。

<h3 id="实例-6-走路时每只手-118-n">例 6：走路时每只手 11.8 N</h3>

照表 4 的设置：0.5 m/s 往前走、上身默认姿态，每只手往下 11.8 N（1.2 kg × 9.81），跑 10 s：

| 量 | FALCON | 上身置零 |
|----|------|------|
| 上身 14 个关节的误差之和（rad） | 0.178 | 1.369 |
| 根速度误差（m/s） | 0.273 | 0.451 |
| 左腕俯仰往下垂（rad） | 0.018 | 0.449 |

上身误差差约 7.7 倍；我们按 14 个关节的绝对误差之和计，量级和表 4 的 0.39 / 1.81 相近（论文没写是求和还是平均，所以只比量级）。下身虽然是同一个智能体，手腕垂下去后根速度误差也跟着变大。

<h3 id="实例-7-施力点往外挪手腕多吃多少">例 7：施力点往外挪，手腕多吃多少</h3>

默认姿态，20 N 竖直向下，施力点比例 $r$ 取 0 / 0.5 / 1，腕俯仰轴到施力点的水平距离与力矩：

| $r$ | 力臂（m） | 腕俯仰力矩（N·m） |
|-----|------|------|
| 0（手连杆原点） | 0.046 | 0.92 |
| 0.5（评估时） | 0.136 | 2.72 |
| 1（往前 0.18 m） | 0.226 | 4.52 |

上限按原点算（例 1 的 80.4 N 就是 $4.5 / 0.056$）；若施力点在 $r = 1$，同样 80 N 会要 18 N·m，远超 5 N·m。代码里竖直力被裁到 −50 N、再乘 $\gamma_z$，实际很少到这么大，但这说明上限和施力点用的不是同一个点（我们的推测，没有在训练里验证影响）。

<h3 id="实例-8-照图-11-加到-40-n">例 8：照图 11 加到 40 N</h3>

照附录图 11：−1 m/s 往后走，每只手往下的力按 0、10、20、30、40 N 各跑一段：

| 每只手的力（N） | 0 | 10 | 20 | 30 | 40 |
|------|------|------|------|------|------|
| 左腕俯仰平均力矩（N·m） | 0.38 | 1.75 | 3.12 | 4.48 | 5.00 |
| 左腕俯仰误差（rad） | 0.012 | 0.005 | 0.016 | 0.023 | 0.464 |

30 N（约 3 kg）时还在上限内、跟得准；40 N 时一直顶在 5 N·m 的上限，手腕垂了 0.46 rad——和论文「MuJoCo 里能搬 3 kg 以上」一致，也说明 4 kg 已经超出 G1 手腕的力矩。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入、怎么跑</summary>

<h3 id="源码-目录">目录</h3>

```text
FALCON/
├── humanoidverse/
│   ├── train_agent.py / eval_agent.py
│   ├── agents/decouple/ppo_decoupled_wbc_ma.py        # 两个智能体的 PPO（两套 actor / critic）
│   ├── envs/decoupled_locomotion/
│   │   └── decoupled_locomotion_stand_height_waist_wbc_ma_diff_force.py   # 力的上限、采样、课程、阻力、施力点、新奖励
│   └── config/
│       ├── exp/decoupled_locomotion_stand_height_waist_wbc_diff_force_ma_ppo_ma_env.yaml
│       ├── env/decoupled_locomotion_stand_height_waist_wbc_ma_diff_force.yaml   # 力的各项开关与范围
│       ├── rewards/dec_loco/reward_dec_loco_stand_height_ma_diff_force.yaml     # 下身 39 项、上身 10 项
│       ├── obs/dec_loco/g1_29dof_obs_diff_force_history_wolinvel_ma.yaml        # 115 × 5 维
│       ├── robot/g1/g1_29dof_waist_fakehand.yaml       # 力矩上限、动作数据 accad_all.pkl
│       └── domain_rand/domain_rand_rl_gym.yaml
└── sim2real/
    ├── rl_policy/loco_manip/loco_manip.py              # 部署：观测、动作、IK、手柄
    ├── config/g1/g1_29dof_falcon.yaml                  # PD 增益、默认姿态
    └── models/falcon/{g1,t1}_29dof.onnx
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码 | 出入（我们读代码的结果） |
|------|------|------|
| 式 3–4：带重力项 $\tau^g$ | `_calculate_max_ee_forces` | `joint_effort_est *= 0.0`，重力项乘 0；$\epsilon = 0.01$；上限 × 0.9 |
| 雅可比取在末端质心 | 同上 | 取在 `rubber_hand` 原点；施力点却在原点到往前 0.18 m 之间 |
| 式 5：区间里均匀采 | `_scale_forces`、`_update_apply_force_phase` | 三角波扫区间（150–250 步一个来回）+ U(0, 1) 噪声 + 25% 置零 + 裁剪；两只手共用一组 $\gamma$ |
| 裁剪范围 ±50 / −60–5 N（表 1） | `apply_force_*_range` | ±40 / −50–5 N |
| 课程：$\alpha_g$ 随训练加大 | `_update_force_scale_curriculum` | 每环境一个 $\alpha$，0.1 起，>210 步 +0.02、<200 步 −0.02 |
| 走路时投到速度反方向 | `only_apply_resistance_when_walking` | 一致；原地踏步随机给左右方向 |
| 低通滤波防抖 | `use_lpf` | 训练时关，评估时开 |
| — | `_reward_tracking_walk_base_height` | 合力 50 N 以上行走高度不扣分（论文没写） |
| 图 2 的加号 | `residual_upper_body_action` | 上身目标 = 参考 + 0.25 a |
| 表 5 上身 $\sigma$ 0.01 | `reward_tracking_sigma.upper_body_dofs` | 0.1 |
| 表 6 摩擦 0.5–1.25、推机器人、延迟 0–20 ms | `domain_rand_rl_gym.yaml` 等 | 摩擦 0.25 起、推机器人默认关、延迟 0 或 1 步 |
| 从 AMASS 采上身目标 | `motion_file` | `accad_all.pkl`（252 段），和评估同一批 |
| 移动目标只有腰偏航 | 腰命令 3 维 | 横滚、俯仰一直是 0 |
| — | `_resample_commands` | `env_ids_stance` 取的是 `env_ids` 子集里的下标（像是笔误） |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 训练（G1，IsaacGym，4096 个环境；README 说约 6k 次迭代后能看到图里的效果）
python humanoidverse/train_agent.py \
  +exp=decoupled_locomotion_stand_height_waist_wbc_diff_force_ma_ppo_ma_env \
  +simulator=isaacgym +domain_rand=domain_rand_rl_gym \
  +rewards=dec_loco/reward_dec_loco_stand_height_ma_diff_force \
  +robot=g1/g1_29dof_waist_fakehand +terrain=terrain_locomotion_plane \
  +obs=dec_loco/g1_29dof_obs_diff_force_history_wolinvel_ma \
  num_envs=4096 obs.add_noise=True env.config.fix_upper_body_prob=0.3 \
  robot.dof_effort_limit_scale=0.9 rewards.reward_initial_penalty_scale=0.1 \
  rewards.reward_penalty_degree=0.0001
# 评估
python humanoidverse/eval_agent.py +checkpoint=<ckpt>
# sim2sim / sim2real：见 sim2real/README.md（MuJoCo 里模拟真机的状态发布与指令接收，再跑 loco_manip.py）
```

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 Lower-RL-Upper-IK（HOMIE）与单策略全身 RL（Expressive WBC、HOVER）；同组的 ASAP / HumanoidVerse 代码；下启 SoFTA、HDMI 与一批力自适应工作</summary>

| 论文 | 关系 |
|---|---|
| [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html) | Lower-RL-Upper-IK 范式的代表，FALCON 的上身 PD 基线跟随它 |
| [Expressive WBC](../../03_High_Impact_Selection/Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html) / [HOVER](../../03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html) | 单策略全身 RL 基线的设计来源 |
| [OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html) | 基础奖励项的来源之一 |
| [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html) | 同组工作；FALCON 的训练代码基于 ASAP 与 HumanoidVerse |
| [CHIP](../CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html) / [GentleHumanoid](../GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object/GentleHumanoid__Learning_Upper-body_Compliance_for_Contact-rich_Human_and_Object.html) | 同样处理手上的力，但目标是可调的柔顺，不是扛住 |
| [FAME](../FAME__Force-Adaptive_RL_for_Expanding_the_Manipulation_Envelope_of_a_Full-Scale_Humanoid/FAME__Force-Adaptive_RL_for_Expanding_the_Manipulation_Envelope_of_a_Full-Scale_Humanoid.html) / [HAFO](../HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact/HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact.html) / [多策略运动学感知 RL](../Kinematics-Aware_Multi-Policy_RL_for_Force-Capable_Humanoid_Loco-Manipulation/Kinematics-Aware_Multi-Policy_RL_for_Force-Capable_Humanoid_Loco-Manipulation.html) | 后来的力自适应人形工作，可以和 FALCON 的力课程对照着读 |
| SoFTA（Hold My Beer，[arXiv 2505.24198](https://arxiv.org/abs/2505.24198)） | 同组，沿用上下身双智能体，做末端稳定 |
| [HDMI](../HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos.html) | 同组，把物体位姿和接触点写进跟踪目标，从人类视频学交互 |

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问六答</summary>

**Q1：FALCON 为什么不直接用一个全身策略？**

A：走路和操作两个目标关联很弱，一个策略要在 29 维动作空间里同时探索两件事，样本效率低，还容易让一半身体主导。图 4 里单策略的上身动作噪声先涨到 1.17 才降，躯干和踝惩罚更大。拆成两个智能体后各自的奖励更聚焦；共享观测、一起训保证它们仍然感知对方。

**Q2：上身为什么用 RL 而不是 IK + PD？**

A：PD 要出力就得先有误差，手上一受力就跟不准（表 1 大力档上身 PD 1.42）。加积分项（0.60）或力估计 + 逆动力学补偿（0.53）都好一些，但后者要知道施力点，点一变补偿就错。FALCON 的上身智能体输出残差，从本体感受历史里看出外力，把目标往反方向挪（我们的复现里腕俯仰目标挪了 0.79 rad），大力档 0.37。

**Q3：力课程为什么要按力矩上限算？**

A：在固定范围里随机加力，经常加到机器人根本扛不住的力，回合很快结束，课程推不上去（图 3 停在 $\alpha_g \approx 0.6$），上身也学不到有效补偿、转而只顾走路。按雅可比和力矩余量逐方向算出可行范围，既能把力加到上限，又不浪费在不可能的样本上（表 2 大力档上身 0.61 → 0.36）。

**Q4：式 4 有什么近似？**

A：每个方向分开算、取每个关节的最坏情况，没有考虑三个方向同时加力时力矩叠加；狄利克雷比例 $\gamma$ 让三个方向的比例加起来是 1，相当于把总预算分开。另外开源代码把重力项乘了 0，雅可比取在手连杆原点而不是施力点。

**Q5：为什么施力点要随机？**

A：接触点变了，雅可比的映射就变了；同样 20 N，施力点往外挪 0.18 m，G1 腕俯仰的力矩从 0.92 涨到 4.52 N·m。训练时随机施力点，策略才不依赖某个固定的映射——这也是论文认为显式力估计 + 逆动力学补偿不够用的原因。

**Q6：FALCON 和 HOMIE 什么关系？**

A：HOMIE 属于 Lower-RL-Upper-IK（下身 RL、上身外骨骼直接给关节角），FALCON 把这一范式当作上身 PD 基线（论文 4.2 节 (a)「following [lu2024mobile, homie]」），指出它缺上身力补偿和全身协调。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-10-05 · 初读；2026-10-23 · 读代码和做复现时看到的几件事</summary>

- **2026-10-05**：表 1 的误差没有单位，只比相对大小；「2 倍」指上身关节跟踪，根速度各方法差不多。
- **2026-10-23**：
  1. 官方 onnx 在 MuJoCo 里的表现和论文的说法一致：站着 20 N、走路 11.8 N 都端得平，30 N 往后走还在力矩上限内，40 N 时腕俯仰顶满、手腕垂下（例 5、6、8）。
  2. 「隐式补偿」在复现里看得很清楚：上身智能体把腕俯仰的目标挪了 0.79 rad，PD 就出够了力。
  3. 代码里力的上限不算重力项、雅可比取在原点、施力点却会外移，这几处和论文写的不一样（源码对照）；对训练结果影响多大我们没有测。
  4. MuJoCo 里我们也试了拉车（每只手往后拉、往前走），每只手约 20 N 时就走不动了；这和真机拉车的设置（车的阻力、手怎么抓）差别很大，没有放进动画。
  5. 论文里有几处笔误：表 5「根部线速度 $y$」的式子写成 $x$；附录「T1 比 T1 大」；图 4 正文说根部角速度、图里标根速度；PD-ID 正文说在 (a) 上扩展、表里写 Force-Curr.。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@article{zhang2025falcon,
  title={FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation},
  author={Zhang, Yuanhang and Yuan, Yifu and Gurunath, Prajwal and Gupta, Ishita and Omidshafiei, Shayegan and Agha-mohammadi, Ali-akbar and Vazquez-Chanlatte, Marcell and Pedersen, Liam and He, Tairan and Shi, Guanya},
  journal={arXiv preprint arXiv:2505.06776},
  year={2025}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

- 力矩怎么加进课程（拧把手、偏心负载）？论文自己列为下一步。
- 多点接触（用身体抵住、和人一起抬）怎么和末端力一起建模？
- 电机发热是真机上的硬上限：能不能把温度或持续力矩写进奖励或课程？
- 上身目标只用 252 段 ACCAD 且训练、评估同一批，对没见过的手臂姿态泛化如何？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- 旧版「🚶 具体实例」用的是编的两关节玩具数字；第二版换成 G1 模型在默认姿态下的真实雅可比与力矩上限（例 1），并补了 252 段的统计、采样、课程和 MuJoCo 复现。
- 旧版说移动目标是「腰部偏航角」，这和论文一致；代码里腰命令是 3 维，横滚和俯仰一直为 0，已补充。
- 旧版没有提代码与论文的出入（重力项、三角波、裁剪范围、低通滤波、摩擦下限等），第二版逐条列在源码对照里。

</details>

---

## 📎 参考来源

- 论文：[arXiv 2505.06776](https://arxiv.org/abs/2505.06776)（v2，LaTeX 源码）
- 项目页：<https://lecar-lab.github.io/falcon-humanoid/>（真机视频，第 1、15、16 幕的片段剪自这里）
- 代码：<https://github.com/LeCAR-Lab/FALCON>（`a967a6d`，2026-04-09）
- 3D 渲染的材质与光照：[Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online)
- 后续工作：SoFTA（[arXiv 2505.24198](https://arxiv.org/abs/2505.24198)）
