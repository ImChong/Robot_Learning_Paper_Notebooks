---
layout: paper
title: "Learning Human-to-Humanoid Real-Time Whole-Body Teleoperation"
category: "高影响力精选 High Impact Selection"
subcategory: "Teleoperation & Imitation Learning"
zhname: "H2O：基于强化学习的人到人形实时全身遥操作"
demos: ["h2o"]
---

# Learning Human-to-Humanoid Real-Time Whole-Body Teleoperation
**先把人的身材改成 H1 的样子、用位置逆运动学把 AMASS 重定向成约 1 万段，再让一个拿满仿真特权信息的模仿器当判官，筛掉约 1500 段 H1 做不到的动作（sim-to-data）；剩下的约 8500 段训练一个只看 8 个关键点和本体感受的策略，零样本上真机，操作者对着一台 RGB 摄像头做动作，Unitree H1 实时全身跟着做**

> 📅 阅读日期: 2026-10-04（2026-10-14 第二版：对照 arXiv v1 的 LaTeX 源码与官方仓库逐条核查重写，改正十余处；新增十四幕讲解动画、三个交互演示和配音视频，H1 用我们照官方重定向步骤、拿 CMU 动捕重算的五段动作做 3D 渲染）
>
> 🏷️ 板块: 03 High Impact Selection · 遥操作 · 动作模仿 · 重定向 · Sim-to-Real
>
> ℹ️ 笔记对照 [arXiv 2403.04436 v1](https://arxiv.org/abs/2403.04436v1)（2024-03-07，目前只有这一版；读的是 arXiv 上的 LaTeX 源码：正文、表 I–IV、图 1–7）、[项目页](https://human2humanoid.com/) 和官方仓库 [LeCAR-Lab/human2humanoid](https://github.com/LeCAR-Lab/human2humanoid)（2026-10 的 `main`，最后一次提交 2025-02-21；这个仓库是 H2O 和后续 OmniH2O 合在一起的版本）。「🚶 具体实例」与动画里的 H1 动作，是我们照官方重定向脚本的步骤，用 CMU 官网的 ASF/AMC 动捕重算的，**不是论文的实验**；SMPL 模型要注册才能下载，我们没有用它，「改身材」这一步换成了对 CMU 骨架逐段缩放，见[环境设定](#实例-环境设定)。

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|------|------|
| **arXiv** | [2403.04436](https://arxiv.org/abs/2403.04436)（v1，2024-03-07） |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2403.04436v1) |
| **项目主页** | [human2humanoid.com](https://human2humanoid.com/) |
| **代码** | [LeCAR-Lab/human2humanoid](https://github.com/LeCAR-Lab/human2humanoid)（`legged_gym` + `rsl_rl` + `phc`，Isaac Gym；CC BY-NC 4.0） |
| **会议** | IROS 2024（官方仓库 README 标注） |
| **作者** | Tairan He†、Zhengyi Luo†、Wenli Xiao、Chong Zhang、Kris Kitani、Changliu Liu、Guanya Shi（† 共同一作） |
| **机构** | Carnegie Mellon University |
| **平台** | Unitree H1（19 个电机：每条腿 5、躯干 1、每条手臂 4；不带灵巧手） |
| **数据** | AMASS（约 40 小时、约 1.3 万段）→ 重定向约 1 万段 → 筛后约 8500 段 |
| **关键词** | Whole-body teleoperation, motion retargeting, sim-to-data, motion imitation, sim-to-real |

**一行定位**：论文自称第一个**基于学习的、全尺寸人形机器人实时全身遥操作**；全身指的是腿也跟（踢球、侧步、后跳），实时指的是操作者此刻的动作，输入只有一台普通 RGB 摄像头。它影响最大的设计不是策略网络，而是 **sim-to-data**：用一个训好的特权模仿器去判断「哪些人类动作 H1 做得到」。

---

## 🎯 一句话总结

> H2O 让操作者对着一台普通 RGB 摄像头做动作，Unitree H1 实时跟着做全身动作；整套做法分三段：重定向、仿真筛数据、sim-to-real 训练。**重定向**：先对 SMPL 的形状参数 $\beta$ 做梯度下降，让人在静止姿态下的 12 个关节和 H1 对上（得到 $\beta'$），再保留原动作的根平移和姿态、换上 $\beta'$，用梯度下降解 H1 的 19 个关节角，让末端的位置对上；不先改身材，H1 的脚会内八。**仿真筛数据**：照 PULSE 的设置训一个看全身刚体全局状态、不加域随机化的特权模仿器去模仿全部约 1 万段，它跟不住的就判为 H1 做不到，剩约 8500 段。**sim-to-real 训练**：策略只看 66 维本体感受和 8 个关键点（双肩、双肘、双手、双踝）的参考位置、位置差、参考速度，一共 138 维；奖励却按全身六项算；再加域随机化与三条提前终止。在未清洗的 1 万段上，成功率 72.5%：去掉 sim-to-data 是 67.9%，目标只给位置（90 维）是 53.2%，特权模仿器是 85.5%。真机上 HybrIK 以 30 Hz 从摄像头估人体姿态，策略 50 Hz、PD 200 Hz，根部线速度在这一版里还靠动捕。

> 🎮 **本文内嵌 1 段讲解动画、1 段配音视频和 3 个交互演示**（不用装任何东西）：
> [十四幕动画：H2O 全流程](#h2o-explainer-anim) —— 约 228 秒串完「遥操作人形的三道坎 → 三段流水线 → 先把人改成 H1 的身材 → 不改身材，脚会内八 → 位置逆运动学：从零姿态拉到目标上 → 对末端，不抄角度 → 仿真当判官 → 真机看得见什么：138 维 → 稀疏观测、稠密奖励 → 随机化与提前终止 → 表 III → 表 IV → 真机：一台摄像头 → 三道差距与局限」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。
> [配音讲解视频](#h2o-video) —— 同样十四幕，加中文配音与字幕，竖屏，可下载
> [重定向浏览](#demo-retarget) —— 五段 CMU 动作逐帧看：改过身材的人、位置逆运动学解出的 H1、11 对点各差多少；挥手可以切到「不改身材」看内八
> [奖励计算器](#demo-reward) —— 拖六个误差，看表 I 的六项任务奖励各拿多少分，以及三条提前终止
> [表 III 与表 IV](#demo-tables) —— 四种方法在全部 / 成功序列上的五个指标，以及数据量从 0.1% 到 100% 的变化

> 🚶 [具体实例](#实例-环境设定)用 CMU 的一段挥手（`14_25` 的前 4.95 s，和 ExBody 笔记同一段）从头走一遍：数据漏斗、改身材、位置逆运动学解一帧（和 ExBody 的「抄角度」比末端差多少）、内八、138 维观测、一帧奖励、PD 力矩与随机化，最后读表 III 和表 IV。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **H2O** | Human to Humanoid | 本文系统名：人到人形机器人的实时遥操作 |
| **SMPL** | Skinned Multi-Person Linear model | 参数化人体模型：形状 $\beta\in\mathbb{R}^{10}$、24 个关节的旋转、根平移 → 6890 个顶点的网格 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 把各家动捕统一成 SMPL 参数的数据集，约 40 小时；CMU MoCap 是其中一部分 |
| **IK** | Inverse Kinematics | 逆运动学：给末端想要的位置，反解关节角；H2O 用梯度下降解 |
| **PHC / PULSE** | Perpetual Humanoid Control / Physics-based Universal Latent Space | 同组作者的仿真人体模仿器；特权模仿器照 PULSE 的状态空间、控制参数和难例挖掘训练 |
| **HybrIK** | Hybrid Analytical-Neural Inverse Kinematics | 单张 RGB 图像估计 3D 人体姿态（SMPL）的方法；部署时 30 Hz |
| **MPJPE** | Mean Per-Joint Position Error | 平均每关节位置误差（mm）；$E _ {\text{g-mpjpe}}$ 是全局的，$E _ {\text{mpjpe}}$ 先减去根部 |
| **DR** | Domain Randomization | 域随机化：训练时随机摩擦、质量、PD 增益、延迟、推搡、地形 |
| **RFI** | Random Force Injection | 在实际施加的力矩上加随机噪声 |
| **PD** | Proportional-Derivative | 关节 PD 控制：$\tau = K_p(a_t - q_t) - K_d\dot q_t$ |

---

## 🎬 十四幕动画：H2O 全流程 {#h2o-explainer-anim}

<div class="paper-demo" data-demo="h2o-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#h2o-video}

<div class="paper-demo" data-demo="h2o-video" data-src="media/h2o_explainer_video.mp4" data-poster="media/h2o_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/h2o_explainer_video.mp4" download="H2O_讲解视频.mp4">下载 mp4（15.1 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（要解决什么问题、方法详解、实验结果）按小节收起，再往后的具体实例、源码对照、在路线中的位置、面试和附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；流程图和三个交互演示留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 1、3–10、14 幕里的 H1 和人的骨架，是我们照官方重定向脚本的步骤、用 CMU 官网的 ASF/AMC 重算的五段动作（`14_25` 挥手、`14_01` 拳击、`10_02` 踢球、`07_01` 走路、`49_06` 侧手翻），和三个交互演示、下文「🚶 具体实例」是同一组数字；表格和第 2–4、13 幕的图来自论文。H1 的 3D 外形：材质与光照照抄 [Robot Retarget Online](https://imchong.github.io/Robot_Retarget_Online/) 的 three.js 场景，读它仓库里的 `unitree_h1/h1.xml`（MuJoCo Menagerie 的 H1，和官方仓库的 `h1.xml` 正运动学逐位相同），按重定向出的关节角用正交相机逐帧离线渲染，关键点按同一个相机投影叠在上面。第 6 幕「抄角度」那一台 H1 用的是 ExBody 笔记里同一段挥手的关节角。

---

## ❓ 要解决什么问题

<div class="mermaid">
flowchart TB
    Q["能不能让一个人站在摄像头前<br/>实时遥控全尺寸人形机器人的全身？"] --> W1["基于模型的全身遥操作<br/>简化模型 + 接触测量<br/>离不开外骨骼、力传感器，动作一快就不行"]
    Q --> W2["图形学里的强化学习模仿器（PHC）<br/>能跟摄像头估出的动作，但只在仿真里<br/>状态空间不现实、不顾力矩和关节限位"]
    Q --> W3["没有「机器人做得到」的大规模动作数据<br/>侧手翻、比腿还宽的跨步 H1 做不到"]
    W1 --> A["H2O：强化学习 + 只用真机拿得到的观测"]
    W2 --> A
    W3 --> D["重定向 + sim-to-data：<br/>让仿真里的特权模仿器筛掉做不到的动作"]
    D --> A
    A --> R["一台 RGB 摄像头 → Unitree H1 实时全身跟随"]

    style Q fill:#e8f4fd,stroke:#1f78b4
    style D fill:#fdebd0,stroke:#e67e22
    style A fill:#e8f8e8,stroke:#27ae60
</div>

### 三道坎（第 I 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：基于模型的方法扩展不到动态动作；图形学的模仿器上不了真机；没有 H1 做得到的数据</summary>

论文的目标：让操作者用一台 RGB 摄像头，**实时**遥操作全尺寸人形机器人的**全身**。人形和人的身体构造相近，遥操作能把人的判断力和机器人的身体结合起来，做家务、医疗辅助、高危救援这类全自主还做不了、但遥操作能做的事；遥操作录下的数据还能拿去训自主策略。

难在三处：

1. **基于模型的全身遥操作**已经有很多成果，但为了算得动都用了**简化模型**，扩展不到动态动作；而且高度依赖**接触测量**，要外骨骼驾驶舱、力传感器这类外部装置。
2. **图形学里的强化学习**能生成复杂动作、完成各种任务，PHC 甚至能在仿真里实时跟踪网络摄像头估出来的人体动作。但它们的**状态空间不现实**，又部分无视硬件限制（力矩、关节限位），能不能用在全尺寸人形上是个问号。另一边，强化学习已经让双足在真实世界里走得又稳又敏捷，但还没有基于强化学习的人形全身遥操作。
3. 论文认为最主要的一道坎是**缺数据**：要训一个能跟各种动作的控制器，需要大量**人形做得到**的动作。人和人形的动力学差距大，有些人类动作人形根本做不到（论文举的例子：侧手翻、比机器人腿长还宽的跨步）；把大规模人体动作库直接重定向过去，会混进大量这样的动作。

</details>

### 和同期 ExBody 的区别

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：ExBody 只跟上半身、腿跟根速度、用离线动作；H2O 跟全身、实时</summary>

论文点名的最相近工作是同期的 [ExBody](../Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html)：它学的是复现**上半身**动作，下半身只跟**根速度**，用的是**离线**人体动作，不是实时遥操作。H2O 要跟的是全身，包括下半身的精确动作（踢腿、侧步、后跳）。

两者在重定向上也走了相反的路（第 IV-A 节）：ExBody 把人的局部关节旋转直接抄到 H1 上；H2O 对的是**末端的位置**（踝、肘、腕），论文的理由是两边运动学树差别大时，直接抄局部关节角会让末端偏得很远。我们在同一段挥手上量过：同一组目标，抄角度的右手平均差 21.9 cm，位置逆运动学差 2.9 cm（见[例 3](#实例-3-位置逆运动学解一帧)）。

遥操作的分类（第 II-C 节）：任务空间遥操作、上半身重定向遥操作、全身遥操作。前两类没用上人和人形身体相同这一点；论文还说，如果不需要跟下半身，机器人不如做成四足或轮式，更稳。H2O 属于第三类，而且操作者身上不用贴标记、不用穿力传感器。

</details>

### H2O 的回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一个可扩展的重定向 + sim-to-data 流程；能扩展到大量动作的强化学习跟踪器；RGB 实时遥操作系统</summary>

论文列的三条贡献：

1. 一个**可扩展的重定向和「sim-to-data」流程**，得到大规模、真机人形做得到的动作数据集；
2. 基于强化学习的全身跟踪控制器的 **sim-to-real**，能扩展到大量动作；
3. 一个**实时遥操作系统**：RGB 摄像头 + 3D 人体姿态估计，演示了走路、取放、推婴儿车、拳击、挥手、踢球等全身动作。

整个问题写成**目标条件强化学习**：一个策略 $\pi$ 跟踪实时的人体动作。MDP $\mathcal{M}=\langle\mathcal{S},\mathcal{A},\mathcal{T},\mathcal{R},\gamma\rangle$，状态 $\mathbf{s}_t$ 由本体感受 $\mathbf{s}^{\text{p}}_t$ 和目标 $\mathbf{s}^{\text{g}}_t$ 组成，奖励 $r_t=\mathcal{R}(\mathbf{s}^{\text{p}}_t,\mathbf{s}^{\text{g}}_t)$，动作 $\mathbf{a}_t\in\mathbb{R}^{19}$ 是 PD 控制器的关节目标位置，用 PPO 最大化 $\mathbb{E}[\sum_t\gamma^{t-1}r_t]$。符号约定：$\tilde\cdot$ 是姿态估计 / 关键点检测给的运动学量，$\hat\cdot$ 是动捕的真值，不带帽子的是物理仿真里的量。

</details>

---

## 🔧 方法详解（第 III–V 节）

<div class="mermaid">
flowchart TB
    subgraph S1["① 重定向 + 仿真筛数据（第 IV 节）"]
        A["AMASS 约 1.3 万段<br/>SMPL 参数"] --> B["拟合形状 β′<br/>静止姿态下 12 个关节对上 H1"]
        B --> C["位置逆运动学<br/>保留根平移和姿态，换上 β′<br/>梯度下降解 19 个关节角"]
        C --> F["启发式过滤（坐地上等）<br/>约 1 万段 Q̂ retarget"]
        F --> P["特权模仿器 π privileged<br/>全身刚体的全局状态（778 维）<br/>不加域随机化"]
        P --> E["跟不住的判为做不到<br/>约 8500 段 Q̂ clean"]
    end
    subgraph S2["② sim-to-real 训练（第 V 节）"]
        E --> T["跟踪策略：138 维观测 → 19 维 PD 目标<br/>本体感受 66 + 8 个关键点 × 3 种量 72"]
        RW["奖励（表 I）：惩罚 3 + 正则 8 + 全身任务 6"] --> T
        DR["域随机化（表 II）：摩擦、质心、质量、PD、力矩噪声、延迟、推搡、地形"] --> T
        ET["提前终止：根高 < 0.3 m / 重力投影 > 0.7 / 平均连杆距离 > 0.5 m"] --> T
    end
    subgraph S3["③ 真机实时遥操作（第 VI-B 节）"]
        CAM["1080P 网络摄像头<br/>HybrIK 30 Hz"] --> G["8 个关键点目标"]
        G --> PI["策略 50 Hz"]
        PROP["本体感受 200 Hz<br/>根线速度来自动捕 50 Hz"] --> PI
        PI --> PD["PD 200 Hz → Unitree H1"]
    end
    T --> PI

    style E fill:#e8f8e8,stroke:#27ae60
    style P fill:#fdebd0,stroke:#e67e22
    style PI fill:#e8f4fd,stroke:#1f78b4
</div>

### 人体模型与数据：SMPL 和 AMASS（第 III-B 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：β ∈ R^10、θ ∈ R^(24×3)、根平移 → 6890 个顶点；AMASS 约 40 小时</summary>

SMPL 用形状参数 $\boldsymbol\beta\in\mathbb{R}^{10}$、姿态参数 $\boldsymbol\theta\in\mathbb{R}^{24\times3}$（24 个关节的轴角）和根平移 $\mathbf{p}$ 表示人体；SMPL 函数 $\mathcal{S}(\boldsymbol\beta,\boldsymbol\theta,\mathbf{p})$ 把它们映射到 6890 个顶点的三角网格（关节位置由网格回归出来）。论文把根平移的维度写成了 $\mathbb{R}^{24\times3}$，应是 $\mathbb{R}^3$，属于笔误。AMASS 把各家动捕统一成 SMPL 参数，约 40 小时。

形状 $\boldsymbol\beta$ 管的是身材（高矮胖瘦、肩宽、腿长……），姿态 $\boldsymbol\theta$ 管的是动作。这一分离是后面「先改身材」的基础：同一段动作（$\boldsymbol\theta$、$\mathbf{p}$ 不变），换一个 $\boldsymbol\beta$，就得到「另一个身材的人做同样的动作」。

</details>

### 第一步：先把人改成 H1 的身材（第 IV-A 节、图 2）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：选 12 个对应关节，在共同的静止姿态下对 β 做梯度下降；官方代码实际用 14 对 + 一个整体缩放</summary>

SMPL 的运动学树和 H1 的差别不小，所以初始重定向分两步。第一步：SMPL 能表示不同的身体比例，那就先找一个**最接近 H1 结构的身材** $\boldsymbol\beta'$。在人和 H1 之间选 12 个有对应关系的关节（图 2），在一个**共同的静止姿态**下对形状参数做梯度下降，让这些关节的距离最小。

为什么要先改身材：H1 静止站立时**两脚分得很开**（两个踝关节横向相距约 0.41 m），平均身材的人两脚并得近。如果直接让 H1 的脚去对平均身材的人的脚，就会出现「内八」的瑕疵（图 3a），站不稳；用 $\boldsymbol\beta'$，人的身材本身就两腿分开，重定向出来的动作平衡得多（图 3b）。

**官方代码**（`scripts/data_process/grad_fit_h1_shape.py`）和论文的出入：

- 实际是 **14 对**：骨盆、两髋（H1 的 `hip_yaw_link`）、两膝、两踝、两肩（`shoulder_roll_link`）、两肘、两手、头（H1 上是骨盆往上 0.75 m 的一个虚拟点 `head_link`）；
- 除了 $\boldsymbol\beta$（10 维），还多优化一个**整体缩放** `scale`：$\text{joints} = (\text{joints}-\text{root})\cdot\text{scale}+\text{root}$；Adam，学习率 0.1，1000 步；损失是 14 对距离的平均（不是平方）；
- 静止姿态：H1 所有关节角为 0（腿伸直、上臂下垂、小臂朝前）；SMPL 摆成相同的姿势（肩绕 z 转 ∓90°，肘绕 y 转 ∓90°）；
- 存下的 `scale` 在后面的重定向里**没有被用到**，只用了 $\boldsymbol\beta'$。

我们的复现没有 SMPL 模型，换成对 CMU 骨架**逐段缩放**九个量（髋的横向 / 纵向偏移、大腿、小腿、躯干、颈和头、锁骨、上臂、小臂连手），同样在静止姿态下对同样的 14 对做 Adam：挥手那位受试者（CMU 14 号）的平均距离从 77.4 mm 降到 35.9 mm，踝的横向位置从 0.092 m 移到 0.203 m（H1 是 0.203 m），见[例 2](#实例-2-改身材)。

</details>

### 不改身材会怎样：内八（图 3）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：H1 为了把脚收到人的脚上，髋往里转，脚尖朝内；我们在挥手上量到约 19°–24°</summary>

图 3(a) 是不用 $\boldsymbol\beta'$、直接用平均身材重定向的结果：H1 两膝并拢、两脚尖朝内，「内八」，不稳；(b) 用了 $\boldsymbol\beta'$，两脚分开，动作平衡。

原因可以从 H1 的结构看出来：H1 的腿从骨盆两侧 0.20 m 处才开始往下长，想让两只脚靠拢到人的脚的位置（相距约 0.23 m），只能用髋的偏航和横滚把腿往里收；膝、踝的俯仰轴跟着转，脚尖就朝里了。

我们在挥手上做的对照（同一段动作、同一套逆运动学，只差身材，见[例 4](#实例-4-内八)）：不改身材，H1 左右脚平均向内转 18.8°、24.2°，两踝相距 0.242 m，髋偏航平均 −0.27 / +0.38 rad，17% 的帧顶到 ±0.43 rad 的限位；改了身材，左脚 1.8° 朝外、右脚 5.5° 朝内，两踝相距 0.437 m。

</details>

### 第二步：位置逆运动学，对末端而不是抄角度（第 IV-A 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：保留根平移与姿态、换上 β′，梯度下降解 19 个关节角让关键点位置对上；官方代码：11 对、Adadelta、截断到关节限位、整段抬到地面</summary>

有了 $\boldsymbol\beta'$，对 AMASS 的每段动作：保留原来的根平移 $\mathbf{p}$ 和姿态 $\boldsymbol\theta$，换上拟合的 $\boldsymbol\beta'$，得到一组「H1 身材的人」的关键点位置；再用 Adam（论文的说法）最小化 12 个关节的**位置**差，解出 H1 的关节角。

论文特意说明：这个过程对的是人的**末端**（踝、肘、腕），为的是保住整体动作；另一种做法是把人的局部关节角直接抄到人形上，但运动学树差别大时，末端会偏得很远。这一步还加了一些**启发式过滤**，去掉不安全的片段，比如坐在地上。AMASS 的约 1.3 万段，经过这一步得到约 1 万段 $\hat{Q}^{\text{retarget}}$。

**官方代码**（`scripts/data_process/grad_fit_h1.py`）：

- 对应 **11 对**：骨盆、两膝、两踝、两肩（`shoulder_roll_link`）、两肘、两手（肘连杆坐标系里 $(0.3, 0, 0)$ 那一点）；髋和头不在里面；
- 根：H1 根的旋转直接取 SMPL 根的旋转（乘一个固定的坐标系转换），根的位置取 SMPL 骨盆；动作先降到 30 fps；
- 19 个关节角从 0 开始，用 **Adadelta**（学习率 100）迭代 500 步，损失是所有帧、11 对距离的平均；每步之后**截断到关节限位**；
- 最后把整段动作往上（或往下）平移一次，让整段里最低的那个身体点离地 0.08 m。

我们照这个步骤在 CMU 的五段动作上复现（见[例 3](#实例-3-位置逆运动学解一帧)）：挥手 149 帧，平均距离从 190.4 mm 降到 50 步 60.1 mm、100 步 41.6 mm、500 步 35.5 mm。拳击、踢球、走路、侧手翻收敛到 31.5、51.8、45.8、76.1 mm。

两个值得留意的细节（我们的观察）：

- 「整段只抬一次」会让一部分帧的脚离地：走路那段整段抬了 12.3 cm，踝的高度中位数是 0.132 m，比最低那一帧（0.08 m）高 5 cm；
- 位置对上了，不代表关节角一样：挥手第 1.4 s，ExBody 的复现给右肩的是（俯仰 −1.058、横滚 −1.746、偏航 0.049）rad，位置逆运动学解出来是（−1.943、−1.282、0.165）rad，右手却比前者准得多。

</details>

<div class="paper-demo" data-demo="h2o-retarget" id="demo-retarget"><p class="demo-fallback">（本节含交互演示：重定向浏览，需要启用 JavaScript）</p></div>

### 第三步：让仿真当判官，sim-to-data（第 IV-B 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：特权模仿器代表模仿性能的上限，它跟不住的序列就是做不到的；约 8500 / 10000 段留下</summary>

重定向只保证运动学上像，不保证动力学上做得到；1 万段里混着大量 H1 做不到的动作，人工去挑太繁琐。sim-to-data 的做法：训练一个动作模仿器 $\pi _ {\text{privileged}}$（和 PHC 类似），给它**特权信息**、**不加域随机化**，让它去模仿全部未清洗的 $\hat{Q}^{\text{retarget}}$。

- 不加域随机化，它模仿得好，但上不了真机；
- 但它代表了**模仿性能的上限**：它都跟不住的序列，就判为不可行；
- 照 PULSE 的状态空间、控制参数和**难例挖掘**（hard-negative mining：反复挑模仿失败的序列加大训练比重）训练**一个**策略模仿整个数据集；
- 训完之后，1 万段里约 8500 段对 H1 可行，记为 $\hat{Q}^{\text{clean}}$。

**特权模仿器看什么**（照 PULSE）：本体感受 $\mathbf{s}^{\text{p-privileged}}_t \triangleq [\mathbf{p}_t, \boldsymbol\theta_t, \mathbf{v}_t, \boldsymbol\omega_t]$，**所有**刚体的全局位置、朝向、线速度、角速度；目标

$$
\mathbf{s}^{\text{g-privileged}}_t \triangleq [\,\hat{\boldsymbol\theta}_{t+1}\ominus\boldsymbol\theta_t,\ \hat{\mathbf p}_{t+1}-\mathbf p_t,\ \hat{\mathbf v}_{t+1}-\mathbf v_t,\ \hat{\boldsymbol\omega}_t-\boldsymbol\omega_t,\ \hat{\boldsymbol\theta}_{t+1},\ \hat{\mathbf p}_{t+1}\,],
$$

即每个刚体参考与当前的一帧差，加上下一帧参考的朝向和位置，都换到机器人自己的坐标系；状态共 778 维（表 III）。这些全局量（尤其是每个刚体的线速度、角速度）真机上很难测准。

论文没写「跟不住」的具体判据；评测里的失败定义是「任一时刻全身平均连杆距离超过 0.5 m」，我们推测筛数据用的也是这一条。另一个对得上的数：表 III 里特权模仿器在未清洗的 1 万段上成功率 85.5%，正好约等于 8500 / 10000——$\hat{Q}^{\text{clean}}$ 就是它成功的那些序列（我们的推断，论文没明说）。

</details>

### 真机能拿到什么：138 维观测（第 V-A 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：本体感受 66 维 + 8 个关键点 × 3 种量 72 维；reduced 版只给参考位置（90 维）；官方代码的排布</summary>

状态空间只能放真机上拿得到的量。论文举的例子：真机上每个关节都没有 IMU，拿不到各关节准确的全局角速度，而特权模仿器需要它们。

本体感受

$$
\mathbf{s}^{\text{p}}_t \triangleq [\,\mathbf q_t,\ \dot{\mathbf q}_t,\ \mathbf v_t,\ \boldsymbol\omega_t,\ \mathbf g_t,\ \mathbf a_{t-1}\,],
$$

19 维关节位置、19 维关节速度、3 维根线速度、3 维根角速度、3 维根部投影重力、19 维上一步动作，共 66 维。目标

$$
\mathbf{s}^{\text{g}}_t \triangleq [\,\hat{\mathbf p}^{\text{kp}}_t,\ \hat{\mathbf p}^{\text{kp}}_t-\mathbf p^{\text{kp}}_t,\ \dot{\hat{\mathbf p}}^{\text{kp}}_t\,],
$$

$\hat{\mathbf p}^{\text{kp}}_t\in\mathbb{R}^{8\times3}$ 是 8 个选定部位（双肩、双肘、双手、双踝）的参考位置，第二项是参考与机器人自身对应部位的位置差，第三项是参考的线速度，都换到机器人自己的坐标系，共 72 维。对比用的 reduced 版只给参考位置 $\mathbf{s}^{\text{g-reduced}}_t \triangleq (\hat{\mathbf p}^{\text{kp}}_t)$。动作是 19 维关节目标，PD 换成力矩：$\tau = K_p(\mathbf a_t-\mathbf q_t) - K_d\dot{\mathbf q}_t$。

**官方代码**（README 里训练 H2O 的命令：`teleop_obs_version=v-teleop-extend-max`、`num_observations=138`）：

- 顺序是 关节位置 19、关节速度 19、根线速度 3、根角速度 3、投影重力 3、**任务观测 72**、上一步动作 19；
- 任务观测的内部顺序是 **位置差、参考位置（相对机器人根部）、参考速度**，换到的是机器人的**朝向坐标系**（只转偏航，`calc_heading_quat_inv`），不是完整的根坐标系；
- 8 个点：两踝、两肩（这里是 `shoulder_pitch_link`）、两肘，加两只手（肘连杆坐标系里 $(0.3,0,0)$）；参考取的是**下一帧**（$(t+1)\Delta t$）；
- critic 另有 215 维的特权观测；观测噪声：关节位置 0.01、关节速度 0.1、线速度 0.2、角速度 0.5、重力 0.1、参考位置 0.05。

</details>

### 奖励：稀疏观测、稠密奖励（第 V-B 节、表 I）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：惩罚 3 项、正则 8 项、任务 6 项；观测只有 8 个点，奖励按全身算</summary>

奖励 = 惩罚 + 正则 + 任务三部分（表 I）。关键的取舍：状态里只有 8 个关键点，但任务奖励给的是**全身**六项（关节位置、关节速度、刚体位置、刚体旋转、刚体速度、刚体角速度），更稠密的奖励信号让强化学习训得更有效率。奖励只在仿真里算，可以用全身真值。

| 类别 | 项 | 表达式 | 权重 |
|---|---|---|---|
| 惩罚 | 力矩越限 | $\mathbb{1}(\boldsymbol\tau\notin[\boldsymbol\tau _ {\min},\boldsymbol\tau _ {\max}])$ | $-0.2$ |
| | 关节位置越限 | $\mathbb{1}(\mathbf q\notin[\mathbf q _ {\min},\mathbf q _ {\max}])$ | $-100$ |
| | 终止 | $\mathbb{1} _ {\text{termination}}$ | $-200$ |
| 正则 | 关节加速度 | $\lVert\ddot{\mathbf q}\rVert_2^2$ | $-8.4\times10^{-6}$ |
| | 关节速度 | $\lVert\dot{\mathbf q}\rVert_2^2$ | $-3\times10^{-3}$ |
| | 动作变化率 | $\lVert\mathbf a_t-\mathbf a _ {t-1}\rVert_2^2$ | $-0.9$ |
| | 力矩 | $\lVert\boldsymbol\tau\rVert$ | $-9\times10^{-5}$ |
| | 腾空时间 | $T _ {\text{air}}-0.25$ | $800$ |
| | 足底接触力 | $\lVert F _ {\text{feet}}\rVert_2^2$ | $-0.1$ |
| | 绊脚 | $\mathbb{1}(F^{xy} _ {\text{feet}}>5F^z _ {\text{feet}})$ | $-1000$ |
| | 打滑 | $\lVert\mathbf v^{\text{feet}}\rVert_2^2\cdot\mathbb{1}(F _ {\text{feet}}\ge1)$ | $-30$ |
| 任务 | 关节位置 | $\exp(-0.25\lVert\hat{\mathbf q}-\mathbf q\rVert_2)$ | $24$ |
| | 关节速度 | $\exp(-0.25\lVert\hat{\dot{\mathbf q}}-\dot{\mathbf q}\rVert_2^2)$ | $24$ |
| | 刚体位置 | $\exp(-0.5\lVert\mathbf p-\hat{\mathbf p}\rVert_2^2)$ | $40$ |
| | 刚体旋转 | $\exp(-0.1\lVert\boldsymbol\theta\ominus\hat{\boldsymbol\theta}\rVert)$ | $16$ |
| | 刚体速度 | $\exp(-10\lVert\mathbf v-\hat{\mathbf v}\rVert_2)$ | $60$ |
| | 刚体角速度 | $\exp(-0.01\lVert\boldsymbol\omega-\hat{\boldsymbol\omega}\rVert_2)$ | $60$ |

六项任务奖励满分 $24+24+40+16+60+60=224$。两个读表时容易漏的地方（我们的观察）：刚体速度那一项系数是 10，最「陡」，速度差 0.1 m/s 就只剩 $e^{-1}=37\%$；刚体角速度那一项系数只有 0.01，角速度差 2 rad/s 仍能拿 98%，几乎是送分。腾空时间的权重 800 是正的，是奖励不是惩罚（Legged Gym 的写法，只在落地那一步结算）。

**官方代码**里的奖励文件叫 `rewards_teleop_omnih2o_teacher.yaml`（README 训 H2O 的命令也用它），项的名称、形式和权重都和表 I 不同：例如位置项写成「均方误差 ÷ σ」，下半身 σ = 0.5、上半身 σ = 0.03，权重 30；另有三点位置项 50、惩罚课程（惩罚整体乘一个 0.25–1 之间、随训练升高的系数）。这一版笔记以论文表 I 为准。

</details>

<div class="paper-demo" data-demo="h2o-reward" id="demo-reward"><p class="demo-fallback">（本节含交互演示：奖励计算器，需要启用 JavaScript）</p></div>

### 域随机化（第 V-C 节、表 II）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：摩擦、质心、连杆质量、PD 增益、力矩噪声、控制延迟、推搡、地形；连杆质量和 PD 增益按连杆 / 关节独立随机</summary>

| 类别 | 项 | 范围 |
|---|---|---|
| 动力学 | 地面摩擦 | $\mathcal U(0.2, 1.1)$ |
| | 躯干质心偏移 | $\mathcal U(-0.1, 0.1)$ m |
| | 连杆质量 | $\mathcal U(0.7, 1.3)\times$ 默认值 |
| | P 增益 | $\mathcal U(0.75, 1.25)\times$ 默认值 |
| | D 增益 | $\mathcal U(0.75, 1.25)\times$ 默认值 |
| | 力矩 RFI | $0.1\times$ 力矩上限（N·m） |
| | 控制延迟 | $\mathcal U(20, 60)$ ms |
| 外部扰动 | 推一把 | 每 5 s 一次，$v _ {xy}=0.5$ m/s |
| 地形 | 类型 | 平地、粗糙、低矮障碍 |

连杆质量和 PD 增益**按每个连杆 / 关节独立**随机，其余**每个回合**随机一次。

**官方代码**（`domain_rand_teleop.yaml` 与 `legged_robot.py`）的具体做法：延迟是把动作压进队列、延后 0–3 个策略步（每步 20 ms，即 0–60 ms）；RFI 是在 PD 算出的力矩上加 $\mathcal U(-1,1)\times0.1\times s\times$ 力矩上限，$s$ 每个关节再在 0.5–1.5 之间随机；推搡是把根的水平速度直接设成 $\mathcal U(-1,1)$ m/s（论文写 0.5），推完 60 步（1.2 s）内不因跟丢而终止；连杆质量只随机骨盆、两侧髋部三个连杆和躯干；另有参考关键点的随机偏移（水平 ±2 cm、竖直 ±10 cm）；地形是平地 / 粗糙 / 低矮障碍按 0.2 / 0.6 / 0.2 混合。摩擦写的是 $[-0.6, 1.2]$，和论文不同。

</details>

### 提前终止（第 V-D 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：根高低于 0.3 m；重力投影 x 或 y 超过 0.7；平均连杆距离超过 0.5 m</summary>

三条提前终止，让强化学习更省样本：

1. **太低**：根部高度低于 0.3 m；
2. **太歪**：根部投影重力的 x 或 y 分量超过 0.7（约 44° 的倾斜，$\arcsin 0.7 = 44.4°$）；
3. **跟丢**：机器人和参考之间的平均连杆距离超过 0.5 m（遥操作容差）。

第三条和评测的成功判据是同一个阈值。

**官方代码**：高度那一条默认关掉（`terminate_by_low_height: False`），另有骨盆、肩、髋、膝碰地就终止；跟丢那一条训练时用的是「**任一**连杆超过阈值」，评测时才用平均，README 里阈值设成 1.5 m；动作放完就按超时结束。

</details>

### 训练设置（官方代码）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：PPO、4096 个环境、50 Hz 策略、PD 增益与默认姿态</summary>

论文没给训练超参数，以下读自官方仓库：

- 仿真步长 5 ms，每 4 步出一次动作：策略 50 Hz、PD 200 Hz（和图 4 的真机频率一致）；
- PD 刚度 / 阻尼：髋 200 / 5、膝 300 / 6、踝 40 / 2、躯干 300 / 6、肩和肘 100 / 2；动作缩放 0.25，目标角 = 默认角 + 0.25·a；默认姿态髋俯仰 −0.4、膝 0.8、踝 −0.4 rad，其余为 0；
- PPO：4096 个环境、每次迭代每个环境 24 步、学习率 1e−3（按 KL 自适应，目标 0.01）、$\gamma=0.99$、$\lambda=0.95$、裁剪 0.2、熵系数 0.005、5 个 epoch、4 个 mini-batch；actor 和 critic 都是 MLP $[512,256,128]$、ELU；
- 仓库自带的动作文件 `stable_punch.pkl` 是 29 段拳击（根固定在原地的版本），完整的筛后数据 `amass_phc_filtered.pkl` 要另外下载。

</details>

---

## 📊 实验结果（第 VI 节）

### 表 III：数据与观测（在未清洗的 1 万段上评测）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：sim-to-data +4.6 个点；目标只给位置 −19.3 个点；和特权模仿器差 13 个点</summary>

四种方法，都在**未清洗**的 1 万段 $\hat{Q}^{\text{retarget}}$ 上评测。特权模仿器和 w/o-sim2data 训练用全部 $\hat{Q}^{\text{retarget}}$，H2O 和 H2O-reduced 用 $\hat{Q}^{\text{clean}}$。

指标：成功率（和 PHC 一样，模仿过程中任一时刻平均连杆距离超过 0.5 m 即判失败）；全局 MPJPE $E _ {\text{g-mpjpe}}$ 和减去根部之后的 $E _ {\text{mpjpe}}$（mm）；加速度误差 $E _ {\text{acc}}$（mm/帧²）与速度误差 $E _ {\text{vel}}$（mm/帧）。

| 方法 | 状态维度 | 能上真机 | 成功率 ↑ | $E _ {\text{g-mpjpe}}$ ↓ | $E _ {\text{mpjpe}}$ ↓ | $E _ {\text{acc}}$ ↓ | $E _ {\text{vel}}$ ↓ | 成功序列 $E _ {\text{g-mpjpe}}$ | $E _ {\text{mpjpe}}$ | $E _ {\text{acc}}$ | $E _ {\text{vel}}$ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 特权模仿器 | 778 | ✗ | 85.5% | 50.0 | 43.6 | 6.9 | 7.8 | 46.0 | 40.9 | 5.2 | 6.2 |
| H2O-reduced | 90 | ✓ | 53.2% | 200.2 | 115.8 | 11.2 | 13.8 | 182.5 | 111.0 | 3.0 | 8.1 |
| H2O-w/o-sim2data | 138 | ✓ | 67.9% | 176.6 | 95.0 | 10.2 | 12.2 | 163.1 | 93.8 | 3.0 | 7.5 |
| **H2O** | 138 | ✓ | **72.5%** | **166.7** | **91.7** | **8.9** | **11.0** | **151.0** | **88.8** | **2.9** | **7.0** |

读法：

- **sim-to-data 有效**：H2O 比 w/o-sim2data 训练数据更少（约 8500 对 1 万），成功率反而高 4.6 个点。论文的直觉：不可行的动作会让策略把资源浪费在做不到的事上，PULSE 里也观察到过。
- **目标的设计更关键**：reduced 版和 H2O 只差目标里的「位置差 + 参考速度」48 维，成功率差 19.3 个点，比去掉 sim-to-data 还大。
- **和特权模仿器的差距**（85.5% 对 72.5%）来自两方面：观测信息少得多，并且加了全部 sim-to-real 正则和域随机化。论文的结论：图形学里的模仿器搬到真机，要用一部分仿真里的性能换鲁棒性和稳定性。
- 按成功率算，H2O 的 72.5% 是在含约 1500 段「做不到」的测试集上测的；如果那些真的做不到，上限就是约 85%。

</details>

### 表 IV：数据量

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：0.1% 的数据就有 52.0%；论文归因于域随机化（尤其推一把）扩大了见过的状态</summary>

随机取 $\hat{Q}^{\text{clean}}$ 的一部分训练 H2O，同样在未清洗的 1 万段上评测：

| 数据量 | 成功率 ↑ | $E _ {\text{g-mpjpe}}$ ↓ | $E _ {\text{mpjpe}}$ ↓ | $E _ {\text{acc}}$ ↓ | $E _ {\text{vel}}$ ↓ |
|---|---|---|---|---|---|
| 0.1% | 52.0% | 198.0 | 107.9 | 12.4 | 13.7 |
| 1% | 58.8% | 183.8 | 96.4 | 10.7 | 12.0 |
| 10% | 61.3% | 174.3 | 92.3 | 10.8 | 12.1 |
| 100% | **72.5%** | **166.7** | **91.7** | **8.9** | **11.0** |

数据越多越好；但只用 0.1%（约 8 段）就有 52.0%，论文认为这主要归功于大量的域随机化，比如推一把，显著扩大了机器人见过的状态，提高了泛化。对照表 III：8 段数据加完整目标（52.0%），和全部数据加 reduced 目标（53.2%）几乎一样（我们的观察）。

</details>

<div class="paper-demo" data-demo="h2o-tables" id="demo-tables"><p class="demo-fallback">（本节含交互演示：表 III 与表 IV，需要启用 JavaScript）</p></div>

### 真机部署（第 VI-B 节、图 4c）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：1080P 网络摄像头 + HybrIK 30 Hz；根线速度来自动捕 50 Hz；其余本体感受 200 Hz</summary>

- 摄像头：一台普通 1080P 网络摄像头；3D 人体姿态估计用 HybrIK，30 Hz；
- 机器人的根部线速度用**动捕系统**（50 Hz）给，其余本体感受来自 Unitree H1 自带传感器（200 Hz）；论文说线速度可以换成视觉 / 激光里程计，这一版图简单用了动捕。所以「只用一台 RGB 相机」说的是**操作者那一边**；
- 图 4(c)：策略 50 Hz，PD 200 Hz；
- RGB 估出来的 3D 姿态有噪声、有透视偏差，但策略对真实世界估出来的目标泛化得不错。

致谢里有个巧合：真机实验所在的 CMU Wean Hall 1334 房间，就是当年录 CMU MoCap 数据集的地方——AMASS 里就有 CMU 的数据，我们的复现用的也是它。

</details>

### 真机表现（图 1、图 5–7）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上前一步出拳、侧步踢球、推婴儿车、接箱转身扔进垃圾桶；左右踢、走路、连续后跳；被用力踹也站得住</summary>

- 图 1：(a) 上前一步出拳把箱子打下凳子，再比个胜利手势；(b) 侧步对准球，右脚踢出；(c) 推着婴儿车往前走；(d) 接过箱子、转腰、扔进垃圾桶；
- 图 5：能跟住操作者下半身的精确动作，左右脚交替踢；
- 图 6：按人的步子走路，连续往后跳；
- 图 7：鲁棒性，站着和做动态动作时被用力踹一脚都能保持平衡。

</details>

---

## ⚠️ 局限与讨论（第 VII 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：表示、具身、sim-to-real 三道差距；RGB 的延迟与精度、只有视觉反馈；为什么要跟下半身</summary>

**通往通用的人形遥操作**，论文强调三道差距：

1. **表示差距**：目标的表示直接影响强化学习能扩展到多少动作。更丰富的表示能容纳更细、更多样的动作，但维度一高，样本效率就下降；要权衡。
2. **具身差距**：在不可行或有损的动作上训练会大大损害性能；动作可行不可行因机器人而异，还没有系统的算法来判定。一端是更像人的人形，一端是让人的动作更容易学。
3. **sim-to-real 差距**：要过去，就得加正则和域随机化；但正则和随机化太多又会妨碍学动作。怎样平衡还不知道。

**实时遥操作**：RGB 摄像头和姿态估计的延迟、误差，让遥操作在效率和精度之间不得不取舍；操作者只能**看**机器人，没有其他反馈，力反馈、语言反馈这类多模态交互还有待研究。

**全身遥操作**：有人会问下半身要不要跟——人和人形最大的差距就在下半身的能力。但大量技巧性的人类动作（体育、舞蹈）需要多样、敏捷的下半身动作；在踩石头过河、踢、劈腿这类腿式机器人比轮式更有优势的场景，下半身跟随是必须的。论文提出的方向：一个能在「稳健行走」和「精细的下半身跟随」之间切换的遥操作系统。

</details>

---

## 🚶 具体实例：用一段挥手从头走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（10 节）：环境设定 / 例 1 数据漏斗 / 例 2 改身材 / 例 3 位置逆运动学解一帧 / 例 4 内八 / 例 5 138 维观测 / 例 6 一帧奖励 / 例 7 PD 力矩与随机化 / 例 8 读表 III / 例 9 读表 IV</summary>

<h3 id="实例-环境设定">环境设定</h3>

- **动作**：CMU MoCap 的 `14_25`「direct traffic, wave, point」（120 fps）的前 4.95 s：右手举过头顶挥手，左手垂在身侧，原地站着——和 ExBody 笔记用的是同一段，方便对比两种重定向。另外四段用在动画和演示里：`14_01` 拳击（第 4.8–8.8 s，同一位受试者）、`10_02` 踢球（第 1.6–4.6 s）、`07_01` 走路（2.6 s）、`49_06` 侧手翻（第 0.8–3.8 s，当「H1 做不到」的例子）。CMU MoCap 本身就是 AMASS 的一部分。
- **为什么不用 SMPL**：SMPL 模型要在官网注册才能下载，AMASS 也是；我们直接读 CMU 官网的 ASF/AMC 原始文件（我们的读取和 ExBody 笔记里的数据逐帧差 0.5 mm 以内）。论文的第一步「拟合 $\boldsymbol\beta'$」换成**对 CMU 骨架逐段缩放**九个量（髋的横向 / 纵向偏移、大腿、小腿、躯干、颈和头、锁骨、上臂、小臂连手），同样在共同的静止姿态下，对官方脚本的 14 对点做 Adam。这是 $\boldsymbol\beta'$ 的替身，不是 SMPL 本身。
- **第二步照官方** `grad_fit_h1.py`：120 fps 降到 30 fps；11 对点；根的位置和旋转直接取人的骨盆；19 个关节角从 0 开始，Adadelta（学习率 100，和 PyTorch 的默认 $\rho=0.9$、$\varepsilon=10^{-6}$ 一致）迭代 500 步，梯度用 MuJoCo 的雅可比精确算；每步截断到官方 `h1.xml` 的关节限位；最后整段抬到最低点离地 0.08 m。
- **H1 模型**：官方仓库的 `resources/robots/h1/h1.xml`；渲染用 Robot Retarget Online 仓库里的 MuJoCo Menagerie `h1.xml`——两者正运动学逐位相同，只有髋俯仰的限位不同（官方 ±1.57 rad），我们按官方截断。
- 为了画面统一，每段动作绕竖轴转一下、平移一下，让第一帧朝 $+x$、站在原点。

<h3 id="实例-1-数据漏斗">例 1：数据漏斗</h3>

AMASS 约 13000 段 → 重定向 + 启发式过滤后约 10000 段（去掉约 3000 段，约 23%）→ 特权模仿器跟得住的约 8500 段（再去掉约 1500 段，约 15%）。官方脚本跑全量 AMASS 时打印的是 15886 段（README 的示例输出），论文写的约 1.3 万可能是另一种计数方式（我们的推测）。

表 IV 的数据量：$8500\times0.1\% \approx 8.5$ 段，$1\%\approx85$ 段，$10\%\approx850$ 段。

<h3 id="实例-2-改身材">例 2：改身材（$\boldsymbol\beta'$ 的替身）</h3>

H1 在全零姿态下（腿伸直、上臂下垂、小臂朝前），14 个点相对骨盆的位置（m）：两髋 $(0, \pm0.088, -0.174)$、两膝 $(0.039, \pm0.203, -0.574)$、两踝 $(0.039, \pm0.203, -0.974)$、两肩 $(0, \pm0.214, 0.439)$、两肘 $(0.018, \pm0.214, 0.107)$、两手 $(0.318, \pm0.214, 0.107)$、头 $(0, 0, 0.75)$。注意 H1 的腿是从骨盆两侧 0.203 m 处往下长的，两踝相距 0.406 m。

CMU 14 号受试者摆成同样的姿势（骨盆对齐），14 对点的平均距离 **77.4 mm**；逐段缩放后降到 **35.9 mm**。九个缩放量：髋横向 2.212、髋纵向 1.720、大腿 0.938、小腿 0.961、躯干 1.085、颈和头 1.582、锁骨 1.093、上臂 1.095、小臂连手 1.004。人的左踝横向位置从 0.092 m 移到 0.203 m，和 H1 一样宽；膝和踝的距离从 116–125 mm 降到 2–22 mm。

代价是髋那一对变差（左髋 82 → 121 mm）：H1 的 `hip_yaw_link` 在骨盆两侧 0.088 m，腿却从 0.203 m 处开始长，人的髋关节没法同时对上两者，拟合优先照顾了膝和踝（官方脚本把髋也放进了 14 对，SMPL 想必也面对同样的矛盾，这一点是我们的推测）。另外三位受试者（07、10、49 号）：81.0 → 30.9、89.1 → 41.4、88.2 → 30.5 mm。

<h3 id="实例-3-位置逆运动学解一帧">例 3：位置逆运动学解一帧</h3>

挥手 149 帧（30 fps）一起解，11 对点的平均距离：第 0 步（全零姿态）190.4 mm，50 步 60.1 mm，100 步 41.6 mm，500 步 **35.5 mm**；没有关节顶到限位。各对的平均差（mm）：骨盆 0、左膝 18.1、左踝 32.9、右膝 17.4、右踝 30.4、左肩 66.1、左肘 46.9、左手 58.6、右肩 51.5、右肘 38.5、右手 30.1。肩差得最多：人举手时锁骨会跟着抬起、往里收（下面这一帧，人的右肩在骨盆坐标系里比第一帧往里收了 5.6 cm、往上抬了 4.1 cm），H1 的肩是固定在躯干上的，跟不过去。

取第 1.4 s（原始 120 fps 的第 168 帧，和 ExBody 笔记例 2 同一帧）。人的右手（改过身材）在 $(0.375, -0.394, 1.895)$ m，H1 解出的右手在 $(0.329, -0.421, 1.899)$ m，差 53.4 mm；这一帧 11 对平均差从第 0 步的 216.9 mm 降到 500 步的 41.5 mm。右臂四个关节角（rad）：肩俯仰 −1.943、肩横滚 −1.282、肩偏航 0.165、肘 1.257。

**和「抄角度」比**：ExBody 笔记里同一段挥手的复现结果，是把人的关节旋转直接抄到 H1 上（指数映射 + 投影）。在同一组改过身材的目标、同样的根部位姿下量末端（两边公共的 50 个时刻，10 fps）：

| 点 | 位置逆运动学 | 抄角度 |
|---|---|---|
| 右手 | **29.2 mm** | 218.6 mm |
| 右肘 | 38.8 mm | 133.3 mm |
| 左手 | 58.6 mm | 90.0 mm |
| 两手平均 | **43.9 mm** | 154.3 mm |
| 11 对平均 | **35.4 mm** | 68.0 mm |

第 1.4 s 这一帧，右手 53.4 mm 对 293.3 mm。这就是论文说的「运动学树差别大时，直接抄局部关节角会让末端偏得很远」；代价是关节角本身不再像人（例如这一帧右肩俯仰 −1.943 对抄角度的 −1.058 rad）。

其他四段（mm）：拳击 202.9 → 31.5，踢球 224.0 → 51.8，走路 179.1 → 45.8，侧手翻 357.2 → 76.1；侧手翻有 6.8% 的关节角顶在限位上。

<h3 id="实例-4-内八">例 4：内八</h3>

同一段挥手、同一套逆运动学，只把「改过身材的人」换成 CMU 受试者本来的身材（相当于论文图 3 里不用 $\boldsymbol\beta'$）：

| | 不改身材 | 改身材 |
|---|---|---|
| 人的两踝横向距离 | 0.233 m | 0.442 m |
| H1 的两踝横向距离 | 0.242 m | 0.437 m |
| 左 / 右脚尖朝向（向外为正） | −18.8° / −24.2° | +1.8° / −5.5° |
| 左 / 右髋偏航 | −0.27 / +0.38 rad | 0.01 / 0.09 rad |
| 髋偏航顶在 ±0.43 限位的帧 | 17% | 0% |

H1 为了把两只脚收到人的脚上，只能把髋往里转、往里收，脚尖就朝里了。踢球（−23.3° / −22.7°，两踝 0.122 m 对 0.341 m）、走路（−8.7° / −18.6° 对 +6.2° / −3.6°）是同一个方向。

<h3 id="实例-5-138-维观测">例 5：138 维观测</h3>

- 本体感受：$19+19+3+3+3+19 = 66$ 维；
- 目标：8 个点 × 3 维 × 3 种量（参考位置、位置差、参考速度）= 72 维；
- 合计 $66+72 = \mathbf{138}$ 维；reduced 版只留参考位置 $8\times3=24$ 维，$66+24 = 90$ 维；特权模仿器 778 维（表 III）。

取挥手第 1.4 s 的参考（H1 重定向结果），假设机器人此刻以默认姿态站在同一位置、朝同一方向。右手那一个点（机器人朝向坐标系，相对骨盆，m）：

- 参考位置 $\hat{\mathbf p} = (0.368, -0.480, 0.947)$；
- 机器人自己的右手在 $(0.319, -0.214, 0.107)$，位置差 $\hat{\mathbf p}-\mathbf p = (0.049, -0.267, 0.841)$：手要往上抬 0.84 m、往外移 0.27 m；
- 参考速度（相邻两帧差分）$(-0.110, -0.198, 0.043)$ m/s。

reduced 版只看得到第一组数，要自己从本体感受里推出「自己的手在哪」才知道差多少——这正是表 III 里差 19.3 个点的那 48 维。

<h3 id="实例-6-一帧奖励">例 6：一帧奖励（假设的误差，表 I 的六项任务奖励）</h3>

| 项 | 括号里的量（假设） | 计算 | 得分 |
|---|---|---|---|
| 关节位置 | $\lVert\Delta\mathbf q\rVert = 0.5$ rad | $24\,e^{-0.25\times0.5} = 24\times0.8825$ | 21.18 |
| 关节速度 | $\lVert\Delta\dot{\mathbf q}\rVert = 2$ rad/s，平方 4 | $24\,e^{-0.25\times4} = 24\times0.3679$ | 8.83 |
| 刚体位置 | $\lVert\Delta\mathbf p\rVert^2 = 0.1$ m² | $40\,e^{-0.5\times0.1} = 40\times0.9512$ | 38.05 |
| 刚体旋转 | $\lVert\Delta\boldsymbol\theta\rVert = 0.5$ rad | $16\,e^{-0.1\times0.5} = 16\times0.9512$ | 15.22 |
| 刚体速度 | $\lVert\Delta\mathbf v\rVert = 0.2$ m/s | $60\,e^{-10\times0.2} = 60\times0.1353$ | 8.12 |
| 刚体角速度 | $\lVert\Delta\boldsymbol\omega\rVert = 2$ rad/s | $60\,e^{-0.01\times2} = 60\times0.9802$ | 58.81 |
| **合计** | | 满分 224 | **150.21** |

刚体速度那一项最陡：速度差从 0.1 m/s 到 0.3 m/s，它从 $60e^{-1} = 22.07$ 掉到 $60e^{-3} = 2.99$；角速度那一项从 2 到 4 rad/s 只从 58.81 掉到 57.65。论文没说这些范数是对全身求和还是取平均，所以这里只给「括号里的量」，不换算成每个关节差多少。

<h3 id="实例-7-pd-力矩与随机化">例 7：PD 力矩与随机化（官方代码）</h3>

膝关节：默认角 0.8 rad，$K_p = 300$、$K_d = 6$，动作缩放 0.25。策略输出 $a = 0.4$ → 目标角 $0.8 + 0.25\times0.4 = 0.9$ rad；若此刻 $q = 0.80$、$\dot q = 0.5$ rad/s，

$$
\tau = 300\times(0.9-0.80) - 6\times0.5 = 27\ \text{N·m}.
$$

P、D 增益各乘 0.75–1.25：最弱 $0.75\times30 - 1.25\times3 = 18.75$ N·m，最强 $1.25\times30 - 0.75\times3 = 35.25$ N·m。RFI：膝的力矩上限 300 N·m，论文的 $0.1\times300 = 30$ N·m 噪声和这一步的 27 N·m 是同一个量级（代码再乘 0.5–1.5，最大 45 N·m）。控制延迟 20–60 ms，相当于 1–3 个 50 Hz 的策略步。

<h3 id="实例-8-读表-iii">例 8：读表 III</h3>

- sim-to-data：$72.5 - 67.9 = 4.6$ 个点；全局 MPJPE $176.6 \to 166.7$（−5.6%）。
- 目标设计：$72.5 - 53.2 = 19.3$ 个点；只差 $138 - 90 = 48$ 维。
- 特权模仿器：$85.5 - 72.5 = 13.0$ 个点；全局 MPJPE 50.0 对 166.7，H2O 是它的 3.3 倍。
- 只看成功的序列，H2O 的加速度误差 2.9 已经和 reduced、w/o-sim2data 的 3.0 差不多：差别主要在「能不能撑到最后」。

<h3 id="实例-9-读表-iv">例 9：读表 IV</h3>

从 0.1% 到 100%，成功率 $52.0 \to 58.8 \to 61.3 \to 72.5$：每多 10 倍数据，分别多 6.8、2.5、11.2 个点。约 8 段数据训练的 H2O（52.0%）和用全部数据训练的 reduced 版（53.2%）差不多。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：目录、论文各部分落在哪个文件、论文与代码的出入</summary>

<h3 id="源码-目录">目录</h3>

```
human2humanoid/
├── scripts/data_process/
│   ├── grad_fit_h1_shape.py     # 第一步：拟合 SMPL 形状 β′ + 整体缩放（14 对，Adam）
│   └── grad_fit_h1.py           # 第二步：位置逆运动学（11 对，Adadelta，截断到限位，抬到地面）
├── phc/phc/utils/
│   ├── torch_h1_humanoid_batch.py   # H1 的批量正运动学（手 = 肘 + 0.3 m）
│   └── motion_lib_h1.py             # 训练时按时间插值取参考
├── legged_gym/legged_gym/
│   ├── envs/base/legged_robot.py    # 观测（v-teleop-extend-max）、奖励、随机化、终止
│   └── cfg/                          # hydra 配置：env / rewards / domain_rand / control / motion / train
├── rsl_rl/                          # PPO（以及 OmniH2O 用的 DAgger 蒸馏）
└── hardware_code/                   # OmniH2O 的灵巧手、腕部电机、ZED 里程计
```

<h3 id="源码-论文与代码">论文与代码</h3>

| 论文 | 代码 |
|---|---|
| 拟合 $\boldsymbol\beta'$：12 个对应关节 | 14 对（含两髋 `hip_yaw_link` 与头 `head_link`）+ 整体缩放 `scale`；`scale` 后面没用上 |
| 重定向：Adam 最小化 12 个关节的位置差 | 11 对（无髋、无头）；Adadelta，学习率 100，500 步；截断到关节限位；整段抬到最低点 0.08 m |
| 8 个关键点：双肩、双肘、双手、双踝 | 肩取 `shoulder_pitch_link`；手 = 肘连杆坐标系里 $(0.3,0,0)$ |
| 目标 $[\hat{\mathbf p}, \hat{\mathbf p}-\mathbf p, \dot{\hat{\mathbf p}}]$，换到机器人坐标系 | 顺序是位置差、参考位置、参考速度；只转偏航的朝向坐标系；参考取下一帧 |
| 表 I 的奖励 | `rewards_teleop_omnih2o_teacher.yaml`：形式（均方误差 ÷ σ）和权重都不同，另有惩罚课程 |
| 摩擦 $\mathcal U(0.2,1.1)$；推一把 0.5 m/s | 摩擦 $[-0.6, 1.2]$；推一把 $\mathcal U(-1,1)$ m/s，推完 1.2 s 内不因跟丢终止 |
| 控制延迟 20–60 ms | 动作队列延后 0–3 个策略步（0–60 ms） |
| 力矩 RFI $0.1\times$ 上限 | 再乘每个关节 0.5–1.5 的系数 |
| 根高 < 0.3 m 终止 | 默认关掉；另有骨盆、肩、髋、膝碰地终止 |
| 平均连杆距离 > 0.5 m 终止 | 训练用「任一连杆」，评测用平均；README 阈值 1.5 m |

<h3 id="源码-怎么跑">怎么跑（README）</h3>

```bash
# 重定向：先放好 AMASS（SMPL+H G）和 SMPL 模型
python scripts/data_process/grad_fit_h1_shape.py   # -> data/h1/shape_optimized_v1.pkl
python scripts/data_process/grad_fit_h1.py         # -> 每段的 root_trans_offset / pose_aa / dof / root_rot
python scripts/vis/vis_motion.py                   # 看重定向结果
# 训练 H2O：8 点、无历史、MLP、观测含线速度
python legged_gym/scripts/train_hydra.py --config-name=config_teleop task=h1:teleop run_name=H2O_Policy \
  env.num_observations=138 env.num_privileged_obs=215 motion.teleop_obs_version=v-teleop-extend-max \
  motion.teleop_selected_keypoints_names=[left_ankle_link,right_ankle_link,left_shoulder_pitch_link,right_shoulder_pitch_link,left_elbow_link,right_elbow_link] \
  motion.extend_head=False num_envs=4096 asset.zero_out_far=False asset.termination_scales.max_ref_motion_distance=1.5 \
  motion.motion_file=resources/motions/h1/stable_punch.pkl rewards=rewards_teleop_omnih2o_teacher \
  rewards.penalty_curriculum=True rewards.penalty_scale=0.5 env.add_short_history=False
```

</details>

---

## 🔗 在学习路线中的位置

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：上承 PHC / PULSE 与 ExBody，下启 OmniH2O、HOVER、TWIST</summary>

- **上承**：[PHC](../../01_Foundational_RL/PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html)（同组的仿真人体模仿器，成功率的定义、实时跟摄像头动作都从这里来）、[PULSE](../../01_Foundational_RL/PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.html)（特权模仿器照它的状态空间与难例挖掘训练，「不可行的动作会拖累训练」也是它观察到的）；[域随机化](../../01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html)与 Legged Gym 的那一套 sim-to-real 训练。
- **同期对照**：[ExBody](../Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html)——只跟上半身、腿跟根速度、离线动作、抄关节角；H2O——跟全身、实时、对末端位置。
- **重定向这条线**：H2O 的「先改身材再对位置」是位置逆运动学重定向的早期做法；后来的 [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) 换成逐段缩放 + 两阶段微分逆运动学，[OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) 再把接触和交互也保住。
- **下启**：[OmniH2O](../OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)（同组续作：VR / 语言等多种输入、教师—学生蒸馏、灵巧手、用遥操作数据训自主策略）；[HOVER](../HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)（把 ExBody、H2O、OmniH2O 各自的命令空间统一进一个带掩码的策略）；[TWIST](../../07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)（改用光学动捕做全身遥操作，同样走教师—学生）。
- **工程意义**：「先用一个强模仿器判断动作可行性，再训可部署的策略」把数据清洗变成了可扩展的自动流程；「观测只放部署拿得到的、奖励尽量稠密」的分工，在后来的人形全身控制里被反复沿用。

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七问七答</summary>

**Q1：sim-to-data 和普通的数据清洗有什么不同？**
A：普通清洗靠规则（穿地、悬空、关节越限），只能抓运动学问题；sim-to-data 让一个拿满特权信息、不加随机化的模仿器在物理仿真里真的去做，做不到就剔除，判的是**动力学可行性**。代价是要先训一个大模仿器，筛选标准也受它能力的上限约束——判官本身就是一个学出来的策略。

**Q2：为什么要先拟合 SMPL 的形状 $\boldsymbol\beta'$？**
A：H1 两腿分得很开，平均身材的人两脚并得近；直接让 H1 的脚对平均身材的人的脚，H1 只能把髋往里转、往里收，出现内八、站不稳（图 3）。先把人改成 H1 的身材，再对位置，腿就是分开的。

**Q3：H2O 的重定向为什么对位置，而不是像 ExBody 那样抄关节角？**
A：两边的运动学树差别大，抄局部关节角会让末端偏得很远；遥操作关心的是手和脚到哪了。我们在同一段挥手上量过：同一组目标，抄角度的右手平均差 21.9 cm，位置逆运动学 2.9 cm。代价是关节角本身不再像人，而且官方实现只对 11 个点、不管朝向。

**Q4：为什么奖励用全身六项，观测只给 8 个关键点？**
A：观测必须是真机实时拿得到的——RGB 姿态估计只能稳定给出少量关键点；奖励只在仿真里算，可以用全身真值。稀疏观测保证能部署，稠密奖励保证训练效率。

**Q5：目标里为什么要放「位置差」和「参考速度」？**
A：表 III：只给参考位置（90 维）成功率 53.2%，加上这 48 维（138 维）72.5%。位置差直接告诉策略「离目标还差多少」，参考速度告诉它「目标往哪动」；只给参考位置，策略得自己从关节角推出自己的手在哪。

**Q6：为什么 H2O 的成功率比特权模仿器低 13 个点，还要用它？**
A：特权模仿器看的是每个刚体的全局位置、速度、角速度，真机上拿不到；也没加随机化，搬上真机会失败。H2O 用一部分仿真里的性能，换来了能部署、鲁棒。

**Q7：「只用一台 RGB 相机」准确吗？**
A：说的是操作者那一边。机器人根部的线速度在这一版里来自动捕系统（50 Hz），论文说可以换成视觉 / 激光里程计；后来的 OmniH2O 把它从观测里拿掉了。

</details>

---

## 💬 讨论记录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：2026-10-04 · 两个数字；2026-10-14 · 复现重定向时看到的三件事</summary>

- 读这篇要抓住两个数字：sim-to-data 带来 +4.6 个点，目标设计带来 +19.3 个点。后者说明「喂给策略什么目标」往往比「喂多少数据」更重要。
- 「只用 RGB 相机」要打个折扣：机器人根速度在这一版里来自动捕。

第二版补充（照官方脚本复现重定向时看到的，都是我们的观察）：

1. **改身材改的主要是腿宽**：H1 的腿从骨盆两侧 0.2 m 处往下长，人的髋要横向放大 2.2 倍才对得上；不改，H1 的脚就会内八。
2. **位置对上 ≠ 关节角像人**：同一帧右肩俯仰 −1.94 对 −1.06 rad，右手却准得多。H2O 要的是末端，ExBody 要的是姿势，两种重定向各有所求。
3. **「整段抬一次」的副作用**：为了让全段最低点离地 0.08 m，整段只平移一次，走路那段有些帧脚离地 5 cm；这类瑕疵留给后面的跟踪策略和 sim-to-data 去消化。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX、开放问题、旧版笔记的改正</summary>

<h3 id="a-bibtex">A. BibTeX</h3>

```bibtex
@inproceedings{he2024learning,
  title     = {Learning Human-to-Humanoid Real-Time Whole-Body Teleoperation},
  author    = {He, Tairan and Luo, Zhengyi and Xiao, Wenli and Zhang, Chong and Kitani, Kris and Liu, Changliu and Shi, Guanya},
  booktitle = {IEEE/RSJ International Conference on Intelligent Robots and Systems (IROS)},
  year      = {2024},
  note      = {arXiv:2403.04436}
}
```

<h3 id="b-开放问题">B. 开放问题</h3>

1. 判官是学出来的：特权模仿器能力不够时会误杀可行的动作，能力太强（比如允许不现实的力矩）又会放过不可行的动作。怎样让「可行性」的标准和真机的能力对齐？
2. 位置逆运动学只对 11 个点、不管朝向：手腕、脚掌的朝向、躯干的扭转都没有约束；末端准了，姿势可能怪。加上朝向项会怎样（GMR 的两阶段做法就带了朝向）？
3. 观测里的 8 个点不含头和躯干：遥操作时头的朝向、腰的扭转只能靠策略自己猜；OmniH2O 改成头和双手三点，是不是更适合 VR 输入？
4. 根部线速度靠动捕：拿掉之后成功率会掉多少（OmniH2O 的消融回答了一部分）？

<h3 id="c-旧版笔记的改正">C. 旧版笔记的改正</h3>

- **重定向的实现**：旧版只按论文写「12 个关节、Adam」；官方代码是拟合形状 14 对（另有整体缩放、后面没用上），重定向 11 对、Adadelta、截断到限位、整段抬到 0.08 m。
- **观测的排布**：旧版照论文顺序写成「参考位置、位置差、参考速度」并说换到机器人坐标系；代码是「位置差、参考位置、参考速度」，换到只转偏航的朝向坐标系，参考取下一帧。
- **奖励**：旧版把刚体速度写成 $\exp(-10\lVert\cdot\rVert^2)$，表 I 是不带平方的 $\exp(-10\lVert\cdot\rVert_2)$；补上全表与「角速度那一项几乎送分」「腾空时间是正奖励」的读法，以及代码奖励文件和表 I 的不同。
- **提前终止**：旧版说训练用的是「同一个 0.5 m 阈值」；代码训练时用「任一连杆超过阈值」、README 阈值 1.5 m，评测才用平均。
- **域随机化**：补上代码和表 II 的出入（摩擦范围、推一把 1 m/s、延迟用动作队列、RFI 再乘系数、参考关键点偏移）。
- **数据**：补上「特权模仿器的 85.5% ≈ 8500 / 10000」的对照（推测），以及官方脚本跑全量时的 15886 段。
- **其他**：补上训练超参数、PD 增益、真机频率（图 4c）和致谢里 Wean Hall 1334 的巧合；新增用 CMU 动捕复现的重定向实例。

</details>

---

## 📎 参考来源

- arXiv：<https://arxiv.org/abs/2403.04436>（v1，2024-03-07，读的是 LaTeX 源码）
- 项目主页：<https://human2humanoid.com/>
- 代码：<https://github.com/LeCAR-Lab/human2humanoid>（`main`，2025-02-21）
- CMU MoCap：<http://mocap.cs.cmu.edu/>（`14_25`、`14_01`、`10_02`、`07_01`、`49_06` 的 ASF/AMC）
- H1 模型与材质：[Robot Retarget Online](https://github.com/ImChong/Robot_Retarget_Online) 仓库里的 MuJoCo Menagerie `unitree_h1`
