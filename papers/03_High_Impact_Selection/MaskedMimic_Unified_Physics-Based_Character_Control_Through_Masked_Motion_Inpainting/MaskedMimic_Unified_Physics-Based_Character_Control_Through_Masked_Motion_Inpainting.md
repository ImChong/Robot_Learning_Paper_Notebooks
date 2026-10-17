---
layout: paper
title: "MaskedMimic: Unified Physics-Based Character Control Through Masked Motion Inpainting"
category: "高影响力精选 High Impact Selection"
subcategory: "Whole-Body Control Core"
zhname: "MaskedMimic：基于掩码动作补全的统一物理角色控制"
demos: ["maskedmimic"]
---

# MaskedMimic: Unified Physics-Based Character Control Through Masked Motion Inpainting
**把物理角色控制写成「动作补全」：先用强化学习训一个看得见未来每一帧完整参考的全身跟踪器（老师），再用 DAgger 把它蒸馏进一个带残差先验的条件 VAE（学生）；学生训练时看到的目标被结构化地随机遮掉——可能只剩几个关节、一句话或一个物体的包围盒——却要做出老师在完整目标下的动作。训完以后，VR 跟踪、路径跟随、摇杆转向、伸手、坐椅子、文字控制都不用再训练，只要写一个小状态机换一组「给哪些目标」（goal-engineering）**

> 📅 阅读日期: 2026-10-04（2026-10-16 第二版：对照 arXiv v1 的 LaTeX 源码与 NVlabs/ProtoMotions 的 v2.3 标签、v3 主分支逐条核查重写，补上附录里的网络尺寸、掩码概率、奖励系数，记下代码与论文的出入和论文自己对不上的两处；新增十八幕讲解动画、三个交互演示和配音视频，角色用 ProtoMotions 自带的官方样例做 3D 渲染）
>
> 🏷️ 板块: 03 High Impact Selection · 全身控制核心 · 物理角色动画 · 教师—学生蒸馏 · 条件 VAE
>
> ℹ️ 笔记对照 [arXiv 2409.14393 v1](https://arxiv.org/abs/2409.14393v1)（2024-09-22，目前只有这一版；读的是 arXiv 上的 LaTeX 源码：正文第 1–10 节、表 1–6、图 1–10、附录 A–B）、[ACM TOG 定稿](https://doi.org/10.1145/3687951)（43(6), Article 209，SIGGRAPH Asia 2024）、[项目页](https://research.nvidia.com/labs/par/maskedmimic/)和官方代码 [NVlabs/ProtoMotions](https://github.com/NVlabs/ProtoMotions)：与论文同期的是 v2.3 标签（2025-10-10），2026-10 的 `main` 已经是重写过的 v3（ProtoMotions3），两版的超参数都和论文有出入，见[源码对照](#源码对照)。「🚶 具体实例」与动画里的角色动作取自**官方样例** `examples/data/smpl_humanoid_sit_armchair.motion`（SAMP 里一个人走过去坐到扶手椅上），它是**参考动作**，不是 MaskedMimic 的仿真结果，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2409.14393](https://arxiv.org/abs/2409.14393)（v1，2024-09-22） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2409.14393v1) · [ACM TOG（DOI 10.1145/3687951）](https://doi.org/10.1145/3687951) |
| **项目主页** | [research.nvidia.com/labs/par/maskedmimic](https://research.nvidia.com/labs/par/maskedmimic/)（9 分半的主视频与各任务的分段视频） |
| **代码** | [NVlabs/ProtoMotions](https://github.com/NVlabs/ProtoMotions)（Apache-2.0；v2.3 标签是论文同期的 Hydra 配置版，`main` 是 v3；见本站 [ProtoMotions3 笔记](../ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control/ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control.html)） |
| **期刊** | ACM Transactions on Graphics 43(6), Article 209（SIGGRAPH Asia 2024） |
| **作者** | Chen Tessler、Yunrong Guo、Ofir Nabati、Gal Chechik、Xue Bin Peng |
| **机构** | NVIDIA；Bar-Ilan University；Simon Fraser University |
| **对象** | Isaac Gym 里的 SMPL 人形角色（中性体型，69 个自由度），不是真机机器人 |
| **数据** | AMASS（按 PHC 的流程筛过，左右镜像）+ HumanML3D（文字）+ SAMP（物体交互） |
| **关键词** | Motion inpainting, physics-based character control, motion tracking, conditional VAE, DAgger, goal-engineering |

**一行定位**：PHC / PULSE 这条「物理角色全身跟踪」线上的一步——PHC 解决「给完整参考能不能跟上」，PULSE 把跟踪器蒸馏成可复用的潜空间、但新任务仍要训高层；MaskedMimic 把「给哪些目标」本身变成随机掩码，让一个模型直接吃部分约束，新任务只换目标、不再训练。下一篇 HOVER 把同一个问题搬到真机人形上。

---

## 🎯 一句话总结

> MaskedMimic 把物理角色控制统一表述成**动作补全**（inpainting）：先用强化学习训一个**全身跟踪老师** $\pi^{\text{FC}}$，它看当前状态、未来 $K$ 帧完整参考（每个关节相对自身、相对根各表示一次）和 16 × 16 的高度图，在平地、不平地形和物体区三块训练场上跟踪 AMASS 与 SAMP 的动作（PD 目标，固定方差 $e^{-2.9}$，奖励是五项跟踪加能量）；再用 **DAgger** 把它蒸馏进学生 $\pi^{\text{PC}}$——一个**条件 VAE**：Transformer 先验只看被遮过的目标（任意关节任意时刻、XCLIP 文字、包围盒），全连接编码器看完整目标、只输出相对先验的**残差**，全连接解码器从 64 维潜变量出 69 维动作。训练靠四个技巧：**结构化掩码**（98% 沿用上一帧的掩码，1% 开一段空白）、KL 系数从 $10^{-4}$ 升到 $10^{-2}$、整个回合固定噪声、过去 40 步取 5 帧历史。结果：同一个模型全身跟踪测试集 99.2%（PULSE 97.1%），没专门训的 VR 跟踪 98.1%（PULSE 93.4%），路径 / 转向 / 伸手 / 坐椅子都靠写个小状态机，坐椅子 96.9%；去掉残差先验只剩 21.1%，去掉结构化掩码是 0%。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十八幕动画：MaskedMimic 全流程](#mm-explainer-anim) —— 约 288 秒串完「一个控制器做所有事 → 控制就是补全 → 两个阶段 → 老师看完整的未来 → 奖励：五项跟踪加能量 → 训练场、提前终止与优先采样 → 三种部分目标与数据 → 为什么要 VAE → 编码器是先验的残差 → DAgger 与 KL 调度 → 结构化掩码 → 固定噪声与观测历史 → 先验：一个 Transformer → 表 1、表 2：全身与 VR → 表 3、表 4：给哪些关节、不平地形 → 转向、路径、伸手（表 5）→ 坐椅子：状态机与消融（表 6）→ 文字控制与局限」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#mm-video) —— 同样十八幕，加中文配音与字幕，竖屏，可下载
> [掩码浏览器](#demo-masks) —— 官方样例逐帧看：选一组「给哪些目标」，看先验收到几个 token、表 3 里同一组的成绩、一个约束的 12 维
> [结构化掩码采样器](#demo-sampler) —— 每帧重抽 vs 98% 沿用：10 帧里露过位置的部位有几个
> [表 1–6](#demo-tables) —— 跟踪、稀疏关节、地形、新任务与消融的每一行

> 🚶 [具体实例](#实例-环境设定)用官方样例（SAMP 的坐扶手椅）从头走一遍：第 4.00 s 头 1 s 后的目标写成 12 维、转向的骨盆目标、第 6.20 s 跨进椅子 2 m 时包围盒在角色坐标系里的 8 个角，再算残差 KL、KL 系数、结构化掩码的玩具统计、历史窗口、一项奖励，最后读表 1–6（并核对论文自己对不上的两处）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **FC** | Fully-Constrained controller | 第一阶段的老师 $\pi^{\text{FC}}$：看未来每一帧的完整参考姿态 |
| **PC** | Partially-Constrained controller | 第二阶段的学生 $\pi^{\text{PC}}$，即 MaskedMimic 本体，只看被掩码的目标 |
| **C-VAE** | Conditional Variational Autoencoder | 条件变分自编码器：先验 $\rho$ + 编码器 $\mathcal{E}$ + 解码器 $\mathcal{D}$ |
| **KL** | Kullback–Leibler divergence | 编码器分布离先验分布有多远 |
| **DAgger** | Dataset Aggregation | 在线蒸馏：学生自己在环境里走，老师给每一步打动作标签 |
| **MPJPE / MPOJPE** | Mean Per-Joint / Per-Observed-Joint Position Error | 全身 / 只算给出的关节的平均位置误差（mm） |
| **XCLIP** | — | 在视频—文本对上训练的 CLIP 式文本编码器，一句话编成 512 维 |
| **FSM** | Finite-State Machine | 有限状态机：按阶段切换喂给模型的目标（goal-engineering） |
| **SMPL** | Skinned Multi-Person Linear model | 人体参数化模型；这里的角色是按中性 SMPL 体型做的 24 个刚体、69 个自由度 |
| **AMASS / SAMP** | — | 大规模人体动捕库 / 带物体网格的「走过去坐下」动捕 |

---

## 🎬 十八幕动画：MaskedMimic 全流程 {#mm-explainer-anim}

<div class="paper-demo" data-demo="mm-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#mm-video}

<div class="paper-demo" data-demo="mm-video" data-src="media/maskedmimic_explainer_video.mp4" data-poster="media/maskedmimic_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/maskedmimic_explainer_video.mp4" download="MaskedMimic_讲解视频.mp4">下载 mp4（17.4 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果、局限）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 2、4、7、12、15、17 幕里的角色，动作取自 ProtoMotions 自带的官方样例 `smpl_humanoid_sit_armchair.motion`（第 2.00–13.93 s，隔帧抽成 15 fps），扶手椅是官方的 `armchair.obj`、按官方教程摆在 $(0, 0.9, 0)$，和第一个交互演示、下文「🚶 具体实例」是同一组数字；它们是人的参考动作，不是 MaskedMimic 的输出。角色的 3D 外形：几何照抄 ProtoMotions 的 `smpl_humanoid.xml`（胶囊与长方体），材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，按刚体位姿用正交相机逐帧离线渲染，绿圈、红框和箭头按同一个相机投影叠在上面。第 5、6、8、9、11、12 幕的曲线、条形与俯视图是标明的玩具示意。表格和图来自论文；第 1、8、14–18 幕的仿真画面剪自[项目页](https://research.nvidia.com/labs/par/maskedmimic/)的视频（城堡、以前的工作、全身与 VR 跟踪、不平地形、转向 / 路径 / 伸手、各种物体、沙发、文字控制、失败集锦），倍速写在画面上，只做讲解引用。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    Q["一句指令：爬上山坡去城堡、向卫兵挥手、<br/>进门、坐上王座"] --> W1["不平地形行走"]
    Q --> W2["听文字做动作"]
    Q --> W3["和物体交互"]
    W1 --> O1["路一：一个任务一个控制器<br/>每加一个任务重训 + 手调奖励"]
    W2 --> O2["路二：技能潜空间（ASE / CALM / PULSE）<br/>+ 每个任务一个高层，潜变量太抽象"]
    W3 --> O1
    O1 --> A["MaskedMimic：一个模型、不写任务奖励、不训新高层<br/>用户直接给部分约束：关节 / 文字 / 物体"]
    O2 --> A

    style Q fill:#e8f4fd,stroke:#1f78b4
    style A fill:#e8f8e8,stroke:#27ae60
</div>

<h3 id="城堡的例子第-1-节图-2">城堡的例子（第 1 节、图 2）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一句指令要三类能力；以前的两条路各缺什么；MaskedMimic 的两条贡献</summary>

论文开头的例子：「Climb the hill to the castle, wave to the guard, go inside, navigate to the throne room, and sit on the throne」。这一句话要三类能力：**不平地形上走**（上坡、碎石地）、**听文字做动作**（挥手）、**和物体交互**（坐王座）。图 2 用 MaskedMimic 一个模型把它做完：(a) 跟踪头的目标爬上山坡；(b) 只给文字挥手；(c) 头的目标 + 文字风格在碎石地上走；(d) 只给王座的包围盒坐上去。

以前的物理角色控制有两条路（第 1、2 节）：

1. **每个任务单独训一个控制器**（地形行走 TRACE / PACE、坐椅子 InterScene、VR 跟踪 QuestSim……），每加一个任务都要重新训练，还要手调奖励，奖励写不好就出怪动作；
2. **先学一个可复用的技能潜空间，再给每个新任务训一个高层**（ASE、CALM、ControlVAE、PULSE）。潜变量很抽象，用户没法直接「告诉」它要什么，新任务仍要训高层。

MaskedMimic 的目标：**一个模型、不写任务奖励、不训新高层**，用户直接给「部分约束」。论文列的两条贡献：

- 一个统一的物理角色控制框架：从部分动作描述（目标关键帧、关节的位置 / 旋转、文字、物体，或任意组合）**补全**出全身动作；
- 一套 **goal-engineering** 技巧（类比大模型的 prompt engineering），用同一个模型复现以前各个系统的任务：全身跟踪、VR 跟踪、场景交互、地形行走、文字控制……

</details>

<h3 id="控制就是补全图-1">控制就是补全（图 1）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：同一段参考动作，换一种遮法就是换一个任务；九种用法共用一个模型</summary>

关键洞察：训练时拿动捕数据，**随机遮掉一部分**——关节、文字、物体——让模型输出能还原完整动作的控制；用的时候，用户决定给哪些。像图像补全一样，「给了的」是约束，「遮掉的」靠模型补：

| 给什么 | 就是什么任务 |
|------|------|
| 24 个刚体的位置 + 旋转，未来若干帧 | 全身跟踪（PHC 那类跟踪器的活） |
| 头的位置 + 旋转、双手的位置 | VR 跟踪 |
| 头未来的一串位置 | 路径跟随（头低就弯腰、爬） |
| 骨盆的朝向 + 1 s 后的位置 | 摇杆转向 |
| 右手某一时刻的位置 | 伸手（中间怎么动不给，是「补帧」） |
| 椅子的包围盒 | 坐椅子 |
| 一句话 | 文字控制 |
| 路径 + 一句话 | 带风格的走路（图 1 下中：举着双手沿路径走） |

图 1 的九格（全身跟踪、VR、任意关节、摇杆、物体、路径、带文字的路径、文字、坐沙发）都是**同一个模型、不针对任务微调**。

</details>

---

## 🔧 方法详解（第 4–6 节、附录 A–B）

<div class="mermaid">
flowchart LR
  subgraph S1["阶段 1：强化学习训老师"]
    R["AMASS / SAMP 动作<br/>平地 · 不平地形 · 物体区"] --> FC["全身跟踪老师 π^FC<br/>看未来 K 帧完整参考 + 高度图"]
  end
  subgraph S2["阶段 2：DAgger 蒸馏学生"]
    G["完整目标 g^full"] --> M["结构化随机掩码 M"]
    M --> P["先验 ρ（Transformer）<br/>只看 g^partial"]
    G --> E["编码器 E（全连接）<br/>输出相对先验的残差"]
    P --> Z["潜变量 z（64 维）"]
    E --> Z
    Z --> D["解码器 D → 69 维 PD 目标"]
    FC -. 每一步打动作标签 .-> D
  end
  subgraph S3["推理：goal-engineering"]
    U["状态机：头手三点 / 路径 / 骨盆<br/>文字 / 物体包围盒"] --> P2["先验 ρ"] --> D2["解码器 D"]
  end
  D --> D2
</div>

<h3 id="两个阶段第-4-节图-3">两个阶段（第 4 节、图 3）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：老师 π^FC 用强化学习学会「怎么做出来」；学生 π^PC 用监督学习学会「只给一部分也能做」；推理时不再训练</summary>

- **阶段 1：fully-constrained controller $\pi^{\text{FC}}$。** 用强化学习在一个大动捕库上训全身跟踪器，输入是未来的完整目标姿态 $g^{\text{full}}_t$。动作数据只有运动学轨迹、没有力矩，$\pi^{\text{FC}}$ 的主要用处是学出「用什么电机指令把这个动作做出来」，包括在不平地形上、和物体交互时。
- **阶段 2：partially-constrained controller $\pi^{\text{PC}}$。** 把 $\pi^{\text{FC}}$ 当老师，用行为克隆（DAgger）蒸馏：学生看到的是随机掩码 $\mathcal{M}$ 之后的 $g^{\text{partial}}_t = \mathcal{M}(g^{\text{full}}_t)$，要学的是老师在完整目标下的动作分布 $\pi^{\text{FC}}(a_t \mid s_t, g^{\text{full}}_t)$。
- **推理**：不再训练。用户给部分目标，学生在没见过的场景里生成动作（图 3 第三块：三个角色坐在不平地形上的沙发上）。

拆成两段的道理：「怎么做出来」交给 RL，「给什么目标都行」的灵活性交给监督学习——这样不用为每种命令写奖励。

**规模**（第 7 节、附录 B.1）：Isaac Gym，16,384 个并行环境，4 张 A100，约两周（14 天）；老师约 300 亿步、学生约 100 亿步；控制 30 Hz，仿真 120 Hz。

</details>

<h3 id="第一阶段全身跟踪老师第-51-52-节">第一阶段：全身跟踪老师（第 5.1、5.2 节）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：当前状态 + 未来 K 帧（相对关节、相对根各一份）+ 高度图；69 维 PD 目标、固定方差；Transformer 策略、全连接 critic</summary>

**状态**（式 3）：当前的关节旋转、位置、速度，全部换到角色自己的坐标系（原点在骨盆、x 朝前、z 朝上）：

$$
s_t = \big(\theta_t \ominus \theta^{\text{root}}_t,\ (p_t - p^{\text{root}}_t) \ominus \theta^{\text{root}}_t,\ v_t \ominus \theta^{\text{root}}_t\big)
$$

附录 A 写的是 AMP 那套 358 维的状态：根高度、根的朝向、每个关节的局部旋转（切向 + 法向两个 3 维向量）与速度、手脚在角色坐标系里的位置。

**目标**：未来 $K$ 帧参考姿态 $g^{\text{FC}}_t = [\hat f _ {t+1}, \ldots, \hat f _ {t+K}]$。每个关节的目标**表示两次**——相对当前这个关节、相对当前的根（式 4）：

$$
\hat f^j = \big(\hat\theta^j \ominus \theta^j_t,\ \hat\theta^j \ominus \theta^{\text{root}}_t,\ (\hat p^j - p^j_t) \ominus \theta^{\text{root}}_t,\ (\hat p^j - p^{\text{root}}_t) \ominus \theta^{\text{root}}_t\big)
$$

每一帧再附上「离现在还有多久」$\tau _ {t+k}$。论文没写 $K$；v2.3 代码里老师看未来 15 帧（30 Hz 下 0.5 s）。

**场景**：骨盆周围的高度图，跟着朝向转，记录地形和物体表面的高度；附录 B：16 × 16 个采样点、间隔 10 cm。不平地形上，姿态按骨盆正下方的地面高度归一化。

**动作**：PD 控制器的目标，3 维关节用指数映射，69 维；高斯策略、**方差固定** $\sigma^\pi = e^{-2.9} \approx 0.055$；**不用残差力**（residual force）也不用残差控制。

**网络**：每类输入切成 token，策略是 Transformer（v2.3 代码：4 层、4 头、宽 512、前馈 1024）；critic 是全连接网络。

</details>

<h3 id="奖励五项跟踪加能量第-53-节附录-b1">奖励：五项跟踪加能量（第 5.3 节、附录 B.1）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：全局位置、全局旋转、根高度、速度、角速度五项 exp 型奖励，外加能量惩罚；附录的权重与系数，代码的两处出入</summary>

$$
r_t = w^{\text{gp}} r^{\text{gp}}_t + w^{\text{gr}} r^{\text{gr}}_t + w^{\text{rh}} r^{\text{rh}}_t + w^{\text{jv}} r^{\text{jv}}_t + w^{\text{jav}} r^{\text{jav}}_t + w^{\text{eg}} r^{\text{eg}}_t
$$

| 项 | 跟踪什么 | 权重 $w$ | 系数 $c$ |
|------|------|------|------|
| gp | 全局关节位置 | 0.5 | 100 |
| gr | 全局关节旋转 | 0.3 | 2 |
| rh | 根（骨盆）高度 | 0.2 | 100 |
| jv | 关节速度 | 0.1 | 0.5 |
| jav | 关节角速度 | 0.1 | 0.1 |
| eg | 能量（惩罚，抑制抖动，引自 QuestEnvSim） | 0.0005 | — |

每一项是 $\exp(-c \cdot e)$ 的形式，误差越大越接近 0；前五项满分加起来 1.2。正文说细节在补充材料里，附录只给了 $w$ 与 $c$。官方代码（v2.3 的 `mimic_utils.py`）的写法：位置项 $e$ = 每个刚体 xyz 三个分量误差平方的平均、再对刚体取平均；根高度是骨盆高度差的平方。代码与附录的出入见[源码对照](#源码对照)：旋转项系数 10（附录 2），能量权重 0.00001（附录 0.0005）。

</details>

<h3 id="训练场提前终止与优先采样第-54-55-节图-4">训练场、提前终止与优先采样（第 5.4、5.5 节，图 4）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：平地 / 不平地形 / 物体区三块；偏 0.25 m（平地）/ 0.5 m（地形）就终止；按失败率优先采样，只算平地上的失败</summary>

- **三块训练场**：平地（数据多半是平地上录的，先照原样做）；不平地形（台阶、碎石、平滑和粗糙的坡）；物体区（椅子、桌子、沙发摆在平地上）。不带物体的动作在平地或不平地形上随机出生，带物体交互的动作只在物体区出生。
- **提前终止**：平地上任一关节位置偏离超过 **0.25 m** 就结束；不平地形上放宽到 **0.5 m**，允许角色改一改原动作去适应地形。
- **优先采样**：动作 $m_i$ 被抽到的概率正比于它的失败概率，权重下限 $3 \times 10^{-3}$；**只统计平地上的失败**——前空翻、侧手翻上楼梯本来就不该成功。这样后空翻这类难动作才能攒够数据。

</details>

<h3 id="三种部分目标第-61-64-节附录-b">三种部分目标（第 6.1、6.4 节，附录 B）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：任意关节任意时刻（6 个部位、12 维一个约束）；XCLIP 文字（512 维）；物体包围盒（8 × 3 + 6 + 1）；可以任意组合</summary>

1. **任意关节、任意时刻**（any-joint-any-time）：可条件化的部位是 6 个——左踝、右踝、骨盆、头、左手、右手（第 7 节）；每个可以给位置、旋转或两者，时间可以是下一帧，也可以是几秒以后。一帧关键帧先换到当前姿态的坐标系，看不见的关节**置零**，再把掩码本身和「还有多久」拼进去：$[\hat q _ {t+\tau} \odot \text{mask} _ {t+\tau},\ \text{mask} _ {t+\tau},\ \tau]$。附录 B：**一个约束 12 维**——相对角色当前坐标系 6 维 + 相对这个部位 6 维；位置从 3 维补零到 6 维，旋转本来就是 6 维。
2. **文字**：XCLIP（在视频—文本对上训练，能编码动作的时间信息）把一句话编成 **512 维**。
3. **物体**：包围盒 8 个角（每个 3 维）+ 朝向（6 维）+ 类别编号（1 维），都换到角色坐标系；一共 31 维。

三种可以同时给：比如「路径 + walking while raising your hands」就是举着手沿路径走。

</details>

<div class="paper-demo" data-demo="mm-masks" id="demo-masks"><p class="demo-fallback">（本节含交互演示：掩码浏览器，需要启用 JavaScript）</p></div>

<h3 id="条件-vae先验残差编码器解码器第-62-节式-67">条件 VAE：先验、残差编码器、解码器（第 6.2 节，式 6–7）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：部分目标是欠定的，直接回归会取平均；先验只看部分目标，编码器写成先验的残差，推理时只用先验</summary>

部分目标是**欠定**的：「1 秒内到那儿」有很多种走法。直接回归老师的动作就是取平均，几种走法平均成一种，常常哪种都不像、也不稳。所以学生做成条件 VAE，用潜变量 $z_t$ 表达「选哪一种」：

$$
\rho(z_t \mid s_t, g^{\text{partial}}_t) = \mathcal{N}\big(\mu^\rho(s_t, g^{\text{partial}}_t),\ \sigma^\rho(s_t, g^{\text{partial}}_t)\big)
$$

$$
\mathcal{E}(z_t \mid s_t, g^{\text{full}}_t) = \mathcal{N}\big(\mu^\rho(s_t, g^{\text{partial}}_t) + \mu^{\mathcal{E}}(s_t, g^{\text{full}}_t),\ \sigma^{\mathcal{E}}(s_t, g^{\text{full}}_t)\big)
$$

- **先验** $\rho$ 只看部分目标；推理时用户的约束只进先验。
- **编码器** $\mathcal{E}$ 看完整目标，但只输出相对先验均值的**残差** $\mu^{\mathcal{E}}$（论文注明写法取自 ControlVAE），方差自己给；只在训练时用。
- **解码器** $\mathcal{D}(a_t \mid s_t, z_t)$ 从状态和潜变量出动作（代码里是确定的动作，最后过一个 tanh）。

残差的作用：两个对角高斯的 KL 只和残差、两个方差有关（见[例 4](#例-4残差先验的-kl)），编码器只能在先验附近「微调」，训练时解码器见过的 $z$ 和推理时从先验拿到的 $z$ 就对得上。表 6：先验不用残差结构，坐椅子成功率从 96.9% 掉到 **21.1%**。评测时取先验的**均值**；随机采样更多样，但更容易取到不太可能、容易失败的解（第 7.2 节）。

</details>

<h3 id="训练目标与-dagger式-2式-8">训练目标与 DAgger（式 2、式 8）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学生在环境里跑、老师在学生走到的状态上打标签；最大化老师动作的对数似然、减 α 倍 KL；代码里就是均方差</summary>

$$
\mathbb{E}_{(s, g^{\text{partial}}) \sim p(\cdot \mid \pi^{\text{PC}})}\ \mathbb{E}_{a \sim \pi^{\text{FC}}(a \mid s, g^{\text{full}})}\ \mathbb{E}_{z \sim \mathcal{E}}\Big[\log \mathcal{D}(a \mid s, z) - \alpha\, D_{\text{KL}}\big(\mathcal{E}(\cdot \mid s, g^{\text{full}}) \,\|\, \rho(\cdot \mid s, g^{\text{partial}})\big)\Big]
$$

环境里跑的是**学生** $\pi^{\text{PC}}$，老师 $\pi^{\text{FC}}$ 在学生走到的每一个状态上给出动作标签（DAgger）——数据来自学生自己的分布，走偏了也有人纠正。两个细节（第 6.3 节）：采数据时老师和学生都用**确定的动作**，减少随机；蒸馏时也**提前终止**，因为老师训练时提前终止过，它在没见过的状态里给不出靠谱的动作。

官方代码（v2.3 的 `agents/masked_mimic/agent.py`）：解码器输出确定的动作，第一项就是和老师动作的**均方差**；KL 对 64 维求和、对 batch 取平均；总损失 = 均方差 + $\alpha$ × KL。

</details>

<h3 id="四个训练技巧第-63-节附录-b2">四个训练技巧（第 6.3 节、附录 B.2）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：结构化掩码（98% 沿用、1% 空白、11 帧目标）；KL 系数 1e-4 → 1e-2；整局固定噪声；过去 40 步里每 8 步取一帧</summary>

**1. 结构化掩码。** 如果每一步都重新随机抽掩码，不同帧露出不同关节，跨帧拼起来几乎什么都看得见，训练太「容易」，模型没学会处理真正缺信息的情况，泛化反而差（[例 6](#例-6结构化掩码的玩具统计) 用附录的伪代码算了一下）。附录 B.2 的规则：

- 目标一共 $K = 11$ 帧：前 10 帧是紧接着的 10 帧，第 11 帧是随机抽的一个远期姿态；
- 前 10 帧里，新的一帧以 **98%** 的概率沿用上一帧的掩码，2% 重新抽（抽哪些部位、每个部位给位置 / 旋转 / 两者）；
- 每步 **1%** 的概率开一段「空白」：连续 1–9 帧全遮（保证至少有一帧可见，学会补帧）；有文字、物体或远期姿态时空白再乘 4；
- 每个回合：有物体时 20% 的概率把物体藏起来；文字 80% 藏起来；远期姿态 20% 给出；所有未来姿态都可以遮掉，只留文字或物体。

表 6：不用结构化掩码，坐椅子成功率 **0%**。

**2. KL 调度。** 像 β-VAE 一样，KL 系数 $\alpha$ 从 0.0001 线性升到 0.01：先让编解码器贴紧老师，再把潜空间收向先验、推理时好取。附录写「across 6000 epochs, starting from epoch 3000」，v2.3 代码是第 3000 到 6000 个 epoch 之间升（[例 5](#例-5kl-系数怎么升)）。

**3. 整局固定噪声。** 重参数化 $z_t = \mu_t + \sigma_t \epsilon$ 里的 $\epsilon$ **一个回合只抽一次**，回合结束才重抽，行为前后连贯（训练和推理都这样）。

**4. 观测历史。** 参考 SuperPADL，先验额外看过去 **40 步**里每 8 步取的 **5 帧**姿态（30 Hz 下最远 1.33 s），换到当前坐标系、带上「多久以前」；回合开头没有历史就遮掉，从动作中间出生就用参考里的历史。文字控制要靠它生成连贯的长动作；坐椅子时动作多半从站着开始，有历史就不容易卡在原地。表 6：去掉历史 96.9% → 94.9%。

</details>

<div class="paper-demo" data-demo="mm-sampler" id="demo-sampler"><p class="demo-fallback">（本节含交互演示：结构化掩码采样器，需要启用 JavaScript）</p></div>

<h3 id="网络结构第-65-节附录-b图-5图-10">网络结构（第 6.5 节、附录 B，图 5、图 10）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：先验是 Transformer，被遮掉的 token 用注意力掩码排除；编码器、解码器是 [1024, 1024, 1024] 的全连接</summary>

- **先验**：Transformer 编码器。每种输入（目标姿态、物体、高度图、当前姿态、文字、历史姿态）有自己的编码器（全连接 [256, 256]），同种输入共用一个——5 帧历史是 5 个 token，11 帧目标是 11 个 token。输入先过 running mean-std 归一化。被遮掉的输入用 Transformer 的注意力掩码排除，所以 token 数可变（一帧里一个关节都没给的目标姿态也整个遮掉）。宽 512、前馈 1024、4 层、4 头、不用 dropout。取第一个输出，接两个全连接头（latent → 256 → 128 → 64），给出 **64 维**潜变量的均值和对数标准差。
- **编码器**：全连接 [1024, 1024, 1024]，输入是当前姿态、高度图、全部未来姿态和「哪些被遮了」的掩码——总是完整的，尺寸固定，不需要 Transformer；输出 1024 维再经 512 隐层映射到残差均值与方差。
- **解码器**：全连接 [1024, 1024, 1024]，看当前状态、高度图和 $z$，输出 69 维 PD 目标。
- 激活都是 ReLU；学生用 batch 8192、一个 epoch、监督目标（不做梯度累积）。

</details>

<h3 id="数据与训练设置第-71-节附录-b1">数据与训练设置（第 7.1 节、附录 B.1）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：AMASS（PHC 的筛法 + 左右镜像）、HumanML3D（镜像文字）、SAMP（同类物体随机换模型）；A2C、γ = 0.99、GAE 0.95、学习率 2e-5 / 1e-4</summary>

- **AMASS**：关节位置、旋转与时刻，支撑「任意关节任意时刻」；左右镜像做增广；按 PHC 的流程筛掉有穿模、漂浮、和不存在的物体交互（比如走上不存在的楼梯）的坏动作。
- **HumanML3D**：把 AMASS 切成原子行为并配上文字；镜像动作配镜像文字（「a person turns left」→「turns right」）。
- **SAMP**：走向物体、坐下的动捕，带物体网格；训练时在同一类物体里随机换模型（这把扶手椅换那把）。
- **老师**：A2C（代码里是只跑一个 mini-epoch 的 PPO），每次采 32 步，$\gamma = 0.99$、GAE $\tau = 0.95$；actor 学习率 $2 \times 10^{-5}$、critic $10^{-4}$，Adam（0.9, 0.999）；每张卡 mini-batch 16,384，整个 epoch 做梯度累积保证 on-policy。论文说 A2C 比 PPO 更稳、最终效果更好。

</details>

---

## 📊 实验结果（第 7–8 节）

<h3 id="表-1全身跟踪">表 1：全身跟踪</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：测试集老师 99.9% / 31.3 mm，学生 99.2% / 35.1 mm，PHC+ 99.2% / 36.1 mm，PULSE 97.1% / 54.1 mm</summary>

AMASS 训练集与测试集，平地。**失败** = 任何一帧平均关节偏差超过 0.5 m；MPJPE 是全局关节位置的平均误差（mm）。

| 方法 | 训练集成功率 | 训练集 MPJPE | 测试集成功率 | 测试集 MPJPE |
|------|------|------|------|------|
| 老师 FC | 99.96% | 30.4 | **99.9%** | **31.3** |
| PHC+ | 100% | 26.6 | 99.2% | 36.1 |
| **MaskedMimic（学生）** | 99.4% | 32.9 | **99.2%** | **35.1** |
| PULSE | 99.8% | 39.2 | 97.1% | 54.1 |

- 老师是**一个网络**，PHC 是一组渐进长出来的专家加门控网络；论文认为单网络泛化更好，专家一多在 DAgger 里也难维护。
- 学生比 PULSE 泛化好（测试集 54.1 → 35.1 mm），论文归因于老师更强、加上多任务多场景一起训。
- 正文说老师比 PHC+「在没见过的动作上失败率降了 62.5%」；按表 1 的 99.9% 对 99.2% 算是 87.5%（见[例 10](#例-10读表-16)）。

</details>

<h3 id="表-2vr-跟踪">表 2：VR 跟踪</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只给头的位置 + 旋转、双手的位置；MaskedMimic 没专门训，测试集 98.1%；PULSE / ASE / CALM 要另训高层</summary>

| 方法 | 训练集成功率 | 训练集全身 MPJPE | 测试集成功率 | 测试集全身 MPJPE |
|------|------|------|------|------|
| **MaskedMimic** | 98.6% | 50 | **98.1%** | **58.1** |
| PULSE | 99.5% | 57.8 | 93.4% | 88.6 |
| ASE | 79.8% | 103 | 37.6% | 120.5 |
| CALM | 16.6% | 130.7 | 10.1% | 122.4 |

对照方法的数字取自 PULSE 论文：它们先训一个可复用的低层，再为 VR 任务另训一个高层；MaskedMimic 直接用，没有任何额外训练。表注：MaskedMimic 只算头和双手的 MPOJPE 是训练集 39.5、测试集 45.8 mm。

</details>

<h3 id="表-3只给哪些关节">表 3：只给哪些关节</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：骨盆 98.4%、VR 98.1%、头 97.9%、双手 93.4%、双脚 91.8%；论文建议 VR 再加一个骨盆传感器</summary>

| 给哪些（平地） | 训练集成功率 | 训练集 MPOJPE | 测试集成功率 | 测试集 MPOJPE |
|------|------|------|------|------|
| 全身 | 99.4% | 32.9 | 99.1% | 35.1 |
| 只给骨盆 | 98.4% | 31.4 | **98.4%** | 33.4 |
| VR 三点 | 98.6% | 39.5 | 98.1% | 45.8 |
| 只给头 | 97.7% | 42.6 | 97.9% | 45.6 |
| 只给双手 | 95.2% | 60.2 | 93.4% | 69.6 |
| 只给双脚 | 92.7% | 88 | **91.8%** | 94.3 |

脚最难、手次之；只给骨盆反而比头 + 双手还好——论文建议 VR 场景加一个骨盆传感器，或者先从头显估出骨盆的位置。MPOJPE 只算给出的那几个关节，这一列不能横着比。全身一行的测试集成功率写的是 99.1%，表 1 同一行是 99.2%。

</details>

<h3 id="表-4不平地形">表 4：不平地形</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：老师全身 98.2%；学生全身 95.4%、VR 93.6%；训练集与测试集差不多</summary>

| | 全身成功率 | 全身 MPJPE | VR 成功率 | VR MPOJPE |
|------|------|------|------|------|
| 老师 FC · 训练集 | 98% | 51.5 | — | — |
| 老师 FC · 测试集 | **98.2%** | 51 | — | — |
| MaskedMimic · 训练集 | 94.7% | 61.3 | 94.4% | 62.7 |
| MaskedMimic · 测试集 | 95.4% | 62.9 | **93.6%** | 69.4 |

地形随机生成（碎石、台阶、平滑和粗糙的坡），目标仍从 AMASS 的平地动作里取。以前的跟踪器大多不在地形和物体上训练，所以这张表只比老师和学生。

</details>

<h3 id="goal-engineering-与表-5第-73-82-节">goal-engineering 与表 5（第 7.3、8.2 节）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：写一个小状态机换目标；路径给头的近 5 步 + 0.8 s 远目标；转向给骨盆朝向 + 1 s 后位置；伸手只给右手；各 5000 个回合</summary>

每个新任务写一个简单的有限状态机，每一步看一眼当前状态、决定这一步喂什么目标——论文把它比作大模型的 prompt engineering。各任务都跑 5000 个随机回合：

| 任务 | 给什么 | 失败条件 | 误差 |
|------|------|------|------|
| **路径跟随** | 头未来 5 步的位置和朝向（朝向由相邻路点的方向算）+ 0.8 s 后一个远目标；离目标超过 0.4 m 只给远目标 | 偏离 2 m | 头的 3D 位置偏差（cm） |
| **转向** | 先给骨盆目标朝向 + 离开始计分还有多久 $(\hat\theta^{\text{root}}, \tau - t)$；再给朝向 + 1 s 后的骨盆位置 $\hat p^{\text{root}} = [x + v_x,\ y + v_y,\ 0.9]$ | 朝向偏 45° 以上 | 沿目标方向的速度误差（cm/s） |
| **伸手** | 只给右手的目标位置和「还有多久」，最多报 1/6 s；目标每变一次有 2 s 伸过去并停住 | 到时手偏 0.5 m | 停住期间手的平均距离（cm） |

| 任务 | 平地成功率 | 平地误差 | 地形成功率 | 地形误差 |
|------|------|------|------|------|
| 路径跟随 | 96.3% | 11.2 cm | 96.3% | 12.5 cm |
| 转向 | 97.8% | 8.4 cm/s | 93.8% | 8.4 cm/s |
| 伸手 | 88.7% | 20.3 cm | 87.3% | 21.7 cm |

两条观察：路径跟随里约束给得越松（偏离时只给远目标），成功率越高、误差越小，但用户能控制的越少；伸手的目标如果就设在下一帧，角色失去平衡后更难救回来，给远一点动作更自然、更稳。路径给的是头的 3D 位置（含高度），头的高度一变，角色就会弯腰、蹲着走、甚至爬；加一句文字就能给走路加风格。

</details>

<h3 id="坐椅子状态机与消融表-6第-83-节">坐椅子：状态机与消融（表 6，第 8.3 节）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2 m 以外给「朝物体 1 m/s」+ 文字，2 m 以内只给包围盒；96.9%；去掉残差先验 21.1%、去掉结构化掩码 0%</summary>

角色出生在离物体 2–10 m 的随机位置，物体来自测试集（训练时没见过）。状态机两个状态：

1. 离物体 **2 m 以外**：骨盆目标「朝物体方向、1 m/s」（任意关节任意时刻）+ 文字「the person walks normally」，走得又稳又自然；
2. 进入 **2 m**：撤掉方向和文字，**只给物体的包围盒**。SAMP 的交互动作都是「走过去坐下」，所以只给物体，模型就自己走近、转身、坐下。

成功 = 骨盆到某个可坐位置 20 cm 以内；误差 = 回合里骨盆离可坐位置的最小距离。

| 版本 | 成功率 | 平均最小距离 |
|------|------|------|
| **MaskedMimic** | **96.9%** | **10.5 cm** |
| 去掉历史 | 94.9% | 12.7 cm |
| 去掉 VAE | 93.2% | 12.2 cm |
| 先验不用残差结构 | 21.1% | 57.4 cm |
| 不用结构化掩码 | 0% | 274.4 cm |

论文的解读：动作多半从站着开始，有历史不容易卡住；VAE 更好地编码了多种解；残差结构让先验「管得住」潜空间；结构化掩码保证模型见过一直重复的关节、也见过只有高层指令的情况。后两行说明它们是方法能工作的前提。图 8 还把沙发放到不平地形上（训练时没有过这种组合），角色照样走过去坐下 / 躺下，而且每次坐的位置和姿势都不一样。

</details>

<h3 id="文字控制第-84-节图-9">文字控制（第 8.4 节，图 9）</h3>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：从中性站姿出发，敬礼、踢腿、单脚平衡、倒立都做得出；「走 4 步再举手」这种长程指令做不好</summary>

图 9 的例子都从中性站姿开始，只给一句话：「a person kicking forward」「standing on one leg trying to balance himself」「dances like michael jackson」「raises both hands in the air and walks forward」「lifts both arms to the sides then steps forward and kneels down」「raises their right arm in a salute」「bows very slowly」「steps forward and does a handstand」。简单的原子动作可以；「a person takes 4 steps and then raises their hands」这种要长程推理的指令做不好——作者推测是历史太短（1.33 s）。

</details>

<div class="paper-demo" data-demo="mm-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 1–6，需要启用 JavaScript）</p></div>

---

## ⚠️ 局限（第 9 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：会抖、难动作复现不了、不平地形上不挑落脚点；goal-engineering 还靠手写；只在仿真角色上验证</summary>

1. **动作质量**：有些动作有不自然的抖动（作者建议用 AMP 式的判别奖励再微调）；后空翻、霹雳舞这类难动作复现不了；在不平地形上更像「照平地的走法走」，不会主动挑落脚点——作者推测是因为平地动作搬到地形上只按骨盆离地高度做了归一化，以后要采带场景的动作或改进重定向。
2. **goal-engineering 还靠手写**：一大群角色、复杂场景时写状态机很费力，作者想用大语言模型自动生成目标（Voyager、Eureka 那样）。
3. **新能力**：目前只和静态场景交互；以后想搬动物体、用工具、多个角色互动。
4. **文字的长程推理**：见上一节。
5. 我们补一句：只在仿真里的 SMPL 角色上验证，没有机器人实验；SMPL 角色的关节力矩、自由度都和真机人形不同——这一步留给了 HOVER。

</details>

---

## 🚶 具体实例：用官方样例的坐扶手椅走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：环境设定 / 例 1 一个约束的 12 维 / 例 2 转向的骨盆目标 / 例 3 跨进 2 m 时的包围盒 / 例 4 残差先验的 KL / 例 5 KL 系数怎么升 / 例 6 结构化掩码的玩具统计 / 例 7 历史窗口 / 例 8 一项奖励 / 例 9 token 与维数 / 例 10 读表 1–6</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **动作**：ProtoMotions 自带的 `examples/data/smpl_humanoid_sit_armchair.motion`（内部名 `armchair_stageII`，SAMP 的一段），30 fps 共 782 帧（26.07 s），存了 24 个刚体的世界位置与四元数（xyzw）。我们用 `torch.load(weights_only=True)` 读出，再用 `smpl_humanoid.xml` 的正运动学核对过：父刚体位姿 + MJCF 里的子刚体偏移 = 子刚体位置，误差 < $10^{-6}$ m。
- **扶手椅**：官方的 `armchair.obj`，按官方教程 `6_mimic_environment.py` 摆在 $(0, 0.9, 0)$、不转；包围盒 $x \in [-0.26, 0.26]$、$y \in [0.633, 1.167]$、$z \in [0, 0.808]$ m。
- **这段动作**：前 2 s 站着；2–9.5 s 绕一个弯走到椅子前（速度约 0.5–0.9 m/s）；10–11.5 s 坐下，骨盆从 0.94 m 降到 0.56 m；之后坐着，约 18 s 起身走开。动画与演示取第 2.00–13.93 s、隔帧抽成 15 fps，共 180 帧。
- **坐标**：z 朝上；角色的朝向坐标系 = 原点在骨盆、x 轴是骨盆 x 轴在水平面上的投影（SMPL 人形的 x 朝前、y 朝左）。
- 这些都是**人的参考动作**，不是 MaskedMimic 的输出；它们只用来演示「目标怎么写」。

<h3 id="例-1一个约束的-12-维">例 1：一个约束的 12 维</h3>

第 4.00 s（第 120 帧）角色正往 +x 方向走，朝向 2.3°。要求「1 s 后（第 5.00 s）头到它在参考里的位置」：

| 量 | 世界坐标 (m) |
|------|------|
| 现在的头 | $(-0.546, -1.574, 1.499)$ |
| 现在的骨盆（根） | $(-0.622, -1.617, 0.937)$ |
| 1 s 后头的目标 | $(0.194, -1.452, 1.506)$ |

换到角色的朝向坐标系（转 −2.3°）：

- 相对头：$(0.744, 0.092, 0.007)$ m——还要往前 0.74 m、往左 9 cm，高度几乎不变；
- 相对根：$(0.822, 0.132, 0.569)$ m——在骨盆前方 0.82 m、上方 0.57 m。

位置约束补零到 6 维，一个约束就是 12 维：$[0.744, 0.092, 0.007, 0, 0, 0,\ 0.822, 0.132, 0.569, 0, 0, 0]$。再连同掩码和 $\tau = 1$ s 一起进先验。

<h3 id="例-2转向的骨盆目标">例 2：转向的骨盆目标</h3>

同一时刻骨盆的水平速度（15 fps 的中心差分）是 $(0.803, -0.007)$ m/s。按论文的写法，1 s 后的骨盆目标

$$
\hat p^{\text{root}} = [x + v_x,\ y + v_y,\ 0.9] = [-0.622 + 0.803,\ -1.617 - 0.007,\ 0.9] = [0.181, -1.624, 0.9]
$$

高度固定 0.9 m 是为了让角色保持直立（样例里走路时骨盆约 0.93–0.95 m）。

<h3 id="例-3跨进-2-m-时的包围盒">例 3：跨进 2 m 时的包围盒</h3>

骨盆离椅子中心 $(0, 0.9)$ 的水平距离：第 6.07 s 是 2.03 m，第 6.20 s（第 186 帧）第一次进入 2 m 以内（1.985 m）。按坐椅子的状态机，这一刻撤掉方向和文字，只给包围盒。这时角色朝向 77.3°，包围盒 8 个角在角色坐标系里（m）：

| 角（世界坐标的 $x, y$） | 角色坐标系里的 $(x, y)$ |
|------|------|
| $(-0.26, 0.633)$ | $(1.254, 1.408)$ |
| $(0.26, 0.633)$ | $(1.368, 0.901)$ |
| $(-0.26, 1.167)$ | $(1.775, 1.525)$ |
| $(0.26, 1.167)$ | $(1.889, 1.018)$ |

底面 4 个角 $z = 0$，顶面 4 个角 $z = 0.808$，水平坐标相同。

椅子在角色前方 1.25–1.89 m、左边 0.90–1.53 m；再加 6 维朝向和 1 维类别，物体 token 一共 $8 \times 3 + 6 + 1 = 31$ 维。

<h3 id="例-4残差先验的-kl">例 4：残差先验的 KL</h3>

一维里，编码器 $\mathcal{N}(\mu^\rho + \mu^{\mathcal{E}}, \sigma^{\mathcal{E}})$ 对先验 $\mathcal{N}(\mu^\rho, \sigma^\rho)$ 的 KL：

$$
D_{\text{KL}} = \tfrac12\Big(\ln\tfrac{(\sigma^\rho)^2}{(\sigma^{\mathcal{E}})^2} + \tfrac{(\sigma^{\mathcal{E}})^2 + (\mu^{\mathcal{E}})^2}{(\sigma^\rho)^2} - 1\Big)
$$

先验的均值 $\mu^\rho$ 消掉了，只剩残差和两个方差。取 $\sigma^\rho = 1$、$\sigma^{\mathcal{E}} = 0.5$、$\mu^{\mathcal{E}} = 0.3$：$\tfrac12(\ln 4 + 0.25 + 0.09 - 1) = \tfrac12(1.386 - 0.66) = $ **0.363**。64 维每一维都这样就是 23.2。残差增大到 1 时 KL 是 0.818，所以 KL 惩罚把编码器拴在先验附近（官方代码 `kl_loss` 就是这个式子，残差的平方直接除以先验方差）。

<h3 id="例-5kl-系数怎么升">例 5：KL 系数怎么升</h3>

v2.3 代码：$\alpha(e) = 10^{-4} + \text{clip}\big(\tfrac{e - 3000}{6000 - 3000}, 0, 1\big)(10^{-2} - 10^{-4})$。第 4500 个 epoch 是一半：$10^{-4} + 0.5 \times 0.0099 = $ **0.00505**。附录的原话是「scaled from 0.0001 to 0.01 across 6000 epochs, starting from epoch 3000」，若读成 3000 → 9000，第 4500 个 epoch 只有 0.002575；v3 的预训练配置又是第 500 到 2000 个 epoch。

<h3 id="例-6结构化掩码的玩具统计">例 6：结构化掩码的玩具统计</h3>

按附录 B.2 的伪代码，一次新抽：90% 的概率最多 6 个部位、10% 最多 3 个；个数 = round(U × (max − 1) + 1)，所以最多 6 个时 1–6 个的概率是 0.1、0.2、0.2、0.2、0.2、0.1（均值 3.5），最多 3 个时是 0.25、0.5、0.25（均值 2）；每个部位 1/3 只给位置、1/3 两者都给、1/3 只给旋转。

- 部位被选中的概率 $3.35 / 6 = 0.558$，给了位置的概率 $0.558 \times 2/3 = $ **0.372**；
- **每帧重抽**时，某个部位的位置在 10 帧里至少露一次：$1 - 0.628^{10} = $ **0.990**；6 个部位平均 **5.94** 个——几乎全身；
- **结构化**（98% 沿用、1% 空白）：一组掩码平均用 $1 / 0.02 = 50$ 步（1.67 s）才换；我们按同样的规则模拟 5 个种子、各 20,000 步，任意 10 帧里露过位置的部位平均 2.31–2.59 个，约 **2.5** 个。

这是玩具统计，只说明「为什么每帧重抽太容易」，论文没报这个数；[采样器演示](#demo-sampler)可以自己调概率看。

<h3 id="例-7历史窗口">例 7：历史窗口</h3>

过去 40 步（30 Hz，1.33 s）里每 8 步取一帧：$-8, -16, -24, -32, -40$ 步，即 $-0.27, -0.53, -0.80, -1.07, -1.33$ s，共 5 帧。v2.3 代码存 120 步、取 15 帧，同样每 8 步一帧，看过去 **4 s**。

<h3 id="例-8一项奖励">例 8：一项奖励</h3>

按代码的写法，每个刚体都沿一个方向偏 10 cm：xyz 三个分量的平方平均 $= 0.1^2 / 3 = 0.00333$，位置项 $r^{\text{gp}} = \exp(-100 \times 0.00333) = $ **0.72**；只有这一项不满时，总奖励 $0.5 \times 0.717 + 0.3 + 0.2 + 0.1 + 0.1 = 1.058$（满分 1.2）。骨盆低 5 cm：$r^{\text{rh}} = \exp(-100 \times 0.05^2) = 0.78$。

<h3 id="例-9token-与维数">例 9：token 与维数</h3>

| 输入 | 维数 / 个数 |
|------|------|
| 一个部位一种约束（位置或旋转） | 12 维 |
| 物体 | $8 \times 3 + 6 + 1 = 31$ 维 |
| 文字 | 512 维（XCLIP） |
| 高度图 | $16 \times 16 = 256$ 个点，间隔 10 cm，覆盖 1.5 m 见方 |
| 潜变量 / 动作 / 状态 | 64 / 69 / 358 维 |
| 先验的 token 数 | 当前姿态 1 + 高度图 1 + 历史 5 + 物体 0/1 + 文字 0/1 + 目标 0–11 |

全都给是 20 个 token；「只给文字」时目标和物体全遮，剩 $1 + 1 + 5 + 1 = 8$ 个；给了全部目标姿态、没给物体和文字是 18 个。

<h3 id="例-10读表-16">例 10：读表 1–6</h3>

- 表 1：老师测试集失败率 0.1%，PHC+ 0.8%，降了 $1 - 0.1/0.8 = 87.5\%$；正文写 62.5%——要老师是 99.7% 才对得上（我们推测是旧数没改）。学生比 PULSE：失败率 2.9% → 0.8%，误差 54.1 → 35.1 mm（−35%）。
- 表 2：VR 测试集失败率 MaskedMimic 1.9%、PULSE 6.6%，约 3.5 倍；全身误差 58.1 对 88.6 mm。
- 表 3：只给骨盆 98.4% > VR 98.1% > 只给头 97.9%；双脚最差 91.8%。
- 表 4：不平地形上学生比老师低 2.8 个点（全身）。
- 表 5：转向在地形上掉得最多（97.8% → 93.8%），路径不掉。
- 表 6：相对完整版，去掉历史 −2.0、去掉 VAE −3.7、非残差先验 −75.8、不用结构化掩码 −96.9 个点。

</details>

---

## 📁 源码对照 {#源码对照}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：v2.3 标签（论文同期）与 v3 主分支各落在哪个文件；代码与论文的出入；怎么跑</summary>

<h3 id="v23-标签论文同期">v2.3 标签（论文同期，Hydra 配置）</h3>

| 论文部分 | 文件 |
|------|------|
| 老师（全身跟踪器）的配置 | `protomotions/config/exp/full_body_tracker/transformer_flat_terrain.yaml`、`data/pretrained_models/motion_tracker/smpl/config.yaml` |
| 奖励 | `protomotions/envs/mimic/mimic_utils.py`（`exp_tracking_reward`）、`config/agent/mimic/options/global_tracking.yaml`（权重与系数） |
| 掩码（附录 B.2） | `protomotions/envs/mimic/components/masked_mimic_obs.py`、`config/env/mimic.yaml` 的 `masked_mimic_masking` |
| 条件 VAE 与残差编码器 | `protomotions/agents/masked_mimic/model.py`（`VaeDeterministicOutputModel`、`kl_loss`） |
| DAgger、损失、KL 调度 | `protomotions/agents/masked_mimic/agent.py`、`config/agent/masked_mimic/agent.yaml` |
| 先验 / 编码器 / 文字的网络 | `config/agent/masked_mimic/models/{prior,encoder,text_conditioning}.yaml` |
| 实验组合（平地、无 VAE、无文字） | `config/exp/masked_mimic/*.yaml` |
| 任务与评测 | `protomotions/envs/{path_follower,steering}`；表 3 那几组「给哪些关节」对应 `config/opt/masked_mimic/constraints/*.yaml`（vr、head、pelvis、hands、feet……） |

**代码与论文的出入**（以 v2.3 的配置与发布的预训练模型 `data/pretrained_models/masked_mimic/smpl/config.yaml` 为准）：

| 项 | 论文 | v2.3 代码 |
|------|------|------|
| 每步开空白的概率 | 1% | 0.1 |
| 空白长度 | 1–9 帧，×4 | 1–16 帧（老师的未来帧数 15 + 1），×4 |
| 文字可见的概率 | 20%（80% 藏起来） | 0.5（`exp/masked_mimic/base.yaml`） |
| 历史 | 40 步取 5 帧 | 120 步取 15 帧（同样每 8 步一帧） |
| KL 调度 | 「从第 3000 个 epoch 起，跨 6000 个 epoch」 | 第 3000 → 6000 个 epoch |
| 旋转奖励系数 | $c^{\text{gr}} = 2$ | 全局旋转 `gr_rew_c = -10`；$c = 2$ 的是权重为 0 的局部旋转 `lr` |
| 能量权重 | 0.0005 | `pow_rew_w = 1e-5` |
| 损失第一项 | 对数似然 | 动作均方差（解码器确定输出、过 tanh） |
| 一次新抽「6 个部位全给」 | 伪代码里没有 | `force_max_conditioned_bodies_prob = 0.1` |
| 一致的 | 98% 沿用、远期姿态 20%、10 + 1 帧目标、提前终止 0.25 / 0.5 m、固定方差 −2.9、64 维潜变量、评测取先验均值（`vae.noise_type: zeros`） | |

<h3 id="v3-主分支protomotions3">v3 主分支（ProtoMotions3）</h3>

`protomotions/agents/supervised/masked_mimic_model.py`、`masked_mimic_config.py`、`agent.py`，掩码在 `protomotions/envs/control/masked_mimic_control.py`，实验在 `examples/experiments/masked_mimic/transformer.py`，预训练模型 `data/pretrained_models/masked_mimic/smpl/`。v3 改动更大：目标只有 5 帧、各帧的时刻按 Beta(2, 5) 在剩余时长里抽；沿用概率 0.8；一帧目标可见的概率 0.8；空掩码不沿用；KL 在第 500 → 2000 个 epoch 之间升；历史 5 步。

<h3 id="怎么跑v23">怎么跑（v2.3 README）</h3>

```bash
# 1. 老师：全身跟踪器
python protomotions/train_agent.py +exp=full_body_tracker/transformer_flat_terrain +robot=smpl \
    +simulator=isaacgym motion_file=<motion file> +experiment_name=full_body_tracker
# 2. 学生：MaskedMimic（指向第一阶段的结果目录，不是 checkpoint 文件）
python protomotions/train_agent.py +exp=masked_mimic/flat_terrain +robot=smpl +simulator=isaacgym \
    motion_file=<motion file> agent.config.expert_model_path=results/full_body_tracker
# 3. 推理：README 写的是 +opt=[masked_mimic/tasks/user_control]（按 U 更新目标），
#    但 v2.3 标签里找不到这个配置，只有 constraints/*.yaml 这一组；下面是我们推测的用法，没跑过
python protomotions/eval_agent.py +robot=smpl +simulator=isaacgym \
    +opt=[masked_mimic/constraints/vr] checkpoint=<MaskedMimic checkpoint>
```

AMASS 要自己注册下载，按 README 用 `data/scripts/package_motion_lib.py ... --create-text-embeddings` 打包（文字嵌入给 MaskedMimic 用）。

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 DeepMimic、PHC、PULSE 与 ASE / CALM；与 OmniH2O 的固定三点接口对照；下启 HOVER</summary>

- **上承**：[DeepMimic](../../01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html) 的跟踪奖励与提前终止；[PHC](../../01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html) 的大规模跟踪与 AMASS 筛法（表 1 的 PHC+）；[PULSE](../../01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.html) 同样是「跟踪老师 → 蒸馏潜空间」，但新任务要另训高层（表 1、表 2 的主要对照）；[ASE](../../01_Foundational_RL/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control/ASE_Adversarial_Skill_Embeddings_for_Large-Scale_Motion_Control.html) / [CALM](../../01_Foundational_RL/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.html) 是技能潜空间那条路；[HumanML3D](../../14_Human_Motion/HumanML3D/HumanML3D.html) 提供文字。
- **对照**：[OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html) 在真机上选了**固定**的头 + 双手三点接口，同样是特权教师 → DAgger 学生；MaskedMimic 把「缺哪些目标」本身写成随机掩码，一个模型接各种输入组合。
- **下启**：[HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html) 把掩码式的多模式控制搬到 Unitree H1：用 mode mask + sparsity mask 统一 ExBody / H2O / OmniH2O / HumanPlus 的命令空间；[ProtoMotions3](../ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control/ProtoMotions3_Open-source_Framework_for_Humanoid_Simulation_and_Control.html) 是 MaskedMimic 开源实现所在的框架，后来也接上了 G1 等真机。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：六问六答</summary>

**Q1：为什么学生要做成 VAE，直接回归老师的动作不行吗？**

A：部分目标是欠定的，同一组约束对应很多合理动作。均方差回归会把几种解平均成一个「中间动作」，常常既不自然也不稳。VAE 让潜变量表达「选哪一种」。表 6：去掉 VAE，坐椅子 96.9% → 93.2%。

**Q2：编码器为什么要写成先验的残差？**

A：编码器看完整目标、先验只看部分目标，推理时只剩先验。如果编码器自成一个分布，训练时解码器习惯的 $z$ 和推理时先验给的 $z$ 对不上。写成残差后 KL 只罚残差（和方差），编码器被拴在先验附近。表 6：非残差先验只有 21.1%。

**Q3：结构化掩码为什么比每帧随机掩码好？**

A：每帧重抽时不同帧露出不同关节，跨帧拼起来几乎全身都看得见（按附录的伪代码，10 帧里某个部位至少露一次的概率 0.99），训练太容易；用户真用时只给固定几个点，模型就泛化不了。让掩码在时间上延续（98% 沿用），训练分布才像真实用法。表 6：不用结构化掩码是 0%。

**Q4：MaskedMimic 和 PULSE / ASE 这类「技能潜空间 + 高层」有什么区别？**

A：PULSE / ASE 的潜变量是抽象的，新任务要再训一个高层去操纵它；MaskedMimic 的条件直接是人能理解的约束（关节、文字、物体），新任务写个状态机换目标，不训练。VR 跟踪（表 2）就是这个差别：98.1% 对 PULSE 的 93.4%。

**Q5：为什么老师用强化学习、学生用监督学习？**

A：动捕只有运动学，没有力矩，「怎么用电机做出来」只能靠 RL 在仿真里试；但如果学生也用 RL，每种掩码组合都要奖励，输入又稀疏，很难训。老师在完整信息下学会动作，学生用 DAgger 在自己的分布上拟合老师，稳定得多——OmniH2O 表 1(a) 也是同一个结论（不用 DAgger 只有 47.11%）。

**Q6：goal-engineering 和 prompt engineering 像在哪？局限在哪？**

A：都是「不改模型，只改输入」：坐椅子在 2 m 外给方向 + 文字、2 m 内只给包围盒；路径偏离时只给远目标。局限是还要人手写状态机，场景一复杂、角色一多就很费力，作者希望用大语言模型自动生成。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-10-04 · 初读；2026-10-16 · 读代码和做演示时看到的四件事</summary>

- **2026-10-04 · 初读**：这是「全身跟踪 → 通用控制接口」这条线上的关键一步：DeepMimic / PHC 解决「给完整参考能不能跟上」，MaskedMimic 解决「只给一部分时补全剩下的」，HOVER 把这个问题搬到真机人形上。读表时注意 MaskedMimic 的数字都是**同一个模型、不针对任务微调**得到的。
- **2026-10-16 · 读代码和做演示时看到的四件事**：
  1. 论文正文的两个数自己对不上：老师比 PHC+ 的失败率「低 62.5%」与表 1 的 99.9% / 99.2%（87.5%）；表 3 全身 99.1% 与表 1 的 99.2%（见例 10）。
  2. v2.3 代码和附录有好几处出入（空白概率 0.1、文字可见 0.5、历史 120 步取 15 帧、旋转系数 10、能量权重 1e-5），v3 又重写了掩码（5 帧目标、Beta 抽时刻、0.8 沿用）；复现论文时以论文附录为准，跑官方代码时以配置为准。
  3. 官方样例 `smpl_humanoid_sit_armchair.motion` 里的四元数是 xyzw，和 `smpl_humanoid.xml` 的正运动学逐位对得上；扶手椅的 OBJ 法线朝向不一，渲染时要双面材质，否则看起来像镂空的。
  4. 结构化掩码那个「每帧重抽太容易」的直觉，用附录的伪代码一算就很清楚：每帧重抽时 10 帧里平均 5.94 个部位露过位置，98% 沿用时约 2.5 个。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@article{tessler2024maskedmimic,
  title   = {MaskedMimic: Unified Physics-Based Character Control Through Masked Motion Inpainting},
  author  = {Tessler, Chen and Guo, Yunrong and Nabati, Ofir and Chechik, Gal and Peng, Xue Bin},
  journal = {ACM Transactions on Graphics (TOG)},
  volume  = {43},
  number  = {6},
  articleno = {209},
  year    = {2024},
  doi     = {10.1145/3687951}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

- 掩码的分布（98% / 1% / 20% / 80%）都是手定的；哪种分布最贴近真实用户的输入，论文没有消融。
- 评测取先验均值、展示用采样，两者的成功率差多少没报。
- 训练靠两周、4 张 A100、共约 400 亿步；在更小的算力下哪些技巧最先失效？
- 搬到真机上，固定方差、全局位置奖励和 SMPL 的 69 个球关节都得换——HOVER 怎么处理，下一篇看。

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

旧版（2026-10-04）大体正确，这一版补全或改正了：物体的表示还有 6 维朝向（共 31 维），不只是 8 个角 + 类别；路径跟随给的是头的位置**和朝向**；KL 调度的 epoch 区间、网络尺寸、64 维潜变量、12 维约束、掩码的全部概率都补上了附录原文；加上代码与论文的出入和论文自己对不上的两处。

</details>

---

## 📎 参考来源

- arXiv：<https://arxiv.org/abs/2409.14393>（v1，2024-09-22；LaTeX 源码 `analysis.tex`、`method.tex`、`appendix.tex`）
- 期刊：ACM Trans. Graph. 43(6), Article 209, 2024，DOI [10.1145/3687951](https://doi.org/10.1145/3687951)
- 项目主页与视频：<https://research.nvidia.com/labs/par/maskedmimic/>（动画里的仿真画面剪自这里的视频，只做讲解引用）
- 官方代码：<https://github.com/NVlabs/ProtoMotions>（v2.3 标签 `4a905b9`，2025-10-10；`main` `7a8417a`，2026-09-22）；官方样例 `examples/data/smpl_humanoid_sit_armchair.motion`、`examples/data/armchair.obj`、`protomotions/data/assets/mjcf/smpl_humanoid.xml`
- 角色的 3D 渲染：材质与光照照抄 [ImChong/Robot_Retarget_Online](https://github.com/ImChong/Robot_Retarget_Online) 的 three.js 场景
