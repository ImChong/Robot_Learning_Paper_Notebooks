---
layout: paper
paper_order: 11
title: "BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion"
category: "基础强化学习"
zhname: "BeyondMimic：从运动跟踪到引导扩散的多功能人形控制"
demos: ["beyondmimic"]
---

# BeyondMimic: From Motion Tracking to Versatile Humanoid Control via Guided Diffusion
**BeyondMimic：从运动跟踪到引导扩散的多功能人形控制**

**先用一份紧凑的跟踪配方（锚定跟踪、四个高斯加三项正则、按电机惯量算的关节阻抗、只随机化真正不确定的量、按失败统计抽起点），同一套超参数把约 2.5 小时人类动作逐段训成跟踪策略、30 段搬上 G1；再用 DAgger 把它们蒸馏进 32 维潜空间的条件 VAE，在「状态—潜码」轨迹上训练扩散模型，部署时把摇杆、路点、避障、关键帧写成代价，用梯度引导去噪 —— 新任务不用再训。**

> 📅 阅读日期: 2026-04-21（2026-10-06 对照 arXiv v1–v4 全文与官方代码重写，补十二幕动画、四个交互演示与配音视频）
>
> 🏷️ 板块: 01_Foundational_RL / 跟踪 + 扩散控制（推荐路线 Domain Randomization → LCP → ASAP → BeyondMimic → GMR）
>
> 🧭 状态: 已对照 [arXiv:2508.08241v4](https://arxiv.org/abs/2508.08241v4)（2025-11-13，59 页：正文 + 补充材料 S1–S4、表 S1–S8）与 v1–v3（2025-08-11 至 08-13，9 页会议格式短版）、官方仓库 [HybridRobotics/whole_body_tracking](https://github.com/HybridRobotics/whole_body_tracking)（2025-10-05 的 main）与 [motion_tracking_controller](https://github.com/HybridRobotics/motion_tracking_controller)。**v4 和短版差得很多**：扩散部分从「状态—动作」联合扩散改成了「VAE 潜空间 + 状态—潜码」扩散，Body-Pos / Joint-Rot 的状态表示消融被换成了「有无潜空间」消融，自适应采样的均匀混合 $\lambda$ 换成了 $0.1/S$ 的底，还新增了图 8A 的四组真机消融、用户研究和地面反力对比。旧版笔记把两个版本的数混在一起，另有一处说反了（锚定其实也吸收偏航），已改正；论文自身几处前后不一（脚踝零位范围、终止条件、侧手翻个数、上真机的段数）见[附录 B](#b-旧版笔记的改正与论文内部的出入)。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2508.08241](https://arxiv.org/abs/2508.08241)（v1 2025-08-11、v2 08-12、v3 08-13 是 9 页短版；v4 2025-11-13 是 59 页长版，本笔记以 v4 为准） |
| **PDF** | [arxiv.org/pdf/2508.08241](https://arxiv.org/pdf/2508.08241) |
| **项目页** | [beyondmimic.github.io](https://beyondmimic.github.io/) |
| **代码** | [HybridRobotics/whole_body_tracking](https://github.com/HybridRobotics/whole_body_tracking)（跟踪训练：Isaac Lab 2.1 + rsl_rl）<br>[HybridRobotics/motion_tracking_controller](https://github.com/HybridRobotics/motion_tracking_controller)（C++ / ROS 2 部署，ONNX 推理）<br>扩散与引导部分：截至 2026-10 项目主页只链接了上面的跟踪仓库 |
| **作者** | Qiayuan Liao\*, Takara E. Truong\*, Xiaoyu Huang\*, Yuman Gao, Guy Tevet, Koushil Sreenath, C. Karen Liu（\* 同等贡献，顺序抛硬币；Yuman Gao 是 v4 新增的作者） |
| **机构** | UC Berkeley、Stanford |
| **机器人** | Unitree G1（29 个关节） |

---

## 🎯 一句话总结

从人类动作学技能，有两个缺口：**怎么把很多动作高质量地搬上真机**（此前要么每段动作单独调随机化和奖励，要么多动作一个策略、动态动作的效果掉下来），**学会以后怎么用**（分层有规划—控制错配，VAE 一类要训练时给显式目标）。BeyondMimic 的回答是两个阶段：第一阶段用一份「原则性」的跟踪配方 —— 锚定跟踪、表 S1 的四个高斯加三项正则、按电机反射惯量算的 PD 增益、只随机化摩擦 / 关节零位 / 躯干质心、按失败统计抽起点 —— 同一套超参数把每段动作训成一个跟踪策略；第二阶段把这些策略用 DAgger 蒸馏进一个 32 维潜空间的条件 VAE，在「状态—潜码」轨迹上训练扩散模型，部署时把任务写成可微代价 $G$，用 $-\nabla G$ 引导去噪，摇杆、路点、避障、关键帧补全都不用再训，代价还能直接相加。

> 🎮 **本文内嵌 1 段讲解动画 + 1 段配音视频 + 4 个交互演示**（不用装任何东西）：
> 1. [十二幕动画：BeyondMimic 全流程](#bm-explainer-anim) —— 约 204 秒串完「两个缺口 → 锚定跟踪 → 奖励 → 观测 → 动作与关节阻抗 → 随机化与部署延迟 → 自适应采样 → 跟踪上真机 → VAE 潜空间 → 状态—潜动作扩散 → 代价引导 → 测试时的任务与边界」
> 2. [配音讲解视频](#bm-video) —— 同样十二幕，加中文配音与字幕，9 分 47 秒竖屏，可下载
> 3. [锚定变换](#bm-anchor-demo) —— 拖水平漂移、偏航、高度偏差，看表 S1 的六项奖励在「锚定」和「跟世界系」下各是多少
> 4. [关节阻抗](#bm-impedance-demo) —— 选关节、拖 $\omega$ 与 $\zeta$，看按电机惯量算出的 $k_p$、$k_d$、$\alpha$，以及代入表 S4 真实轴惯量后的阶跃响应
> 5. [自适应采样](#bm-sampling-demo) —— 均匀 / 核长 3（论文）/ 核长 1（当前代码）三种抽起点的办法，看两段侧手翻怎么被练会（玩具）
> 6. [代价引导](#bm-guidance-demo) —— 式 S5–S8 的摇杆、路点、避障代价，在滚动时域里一步一步去噪，8 秒走出来的路（玩具先验）

> 🚶 [具体实例](#实例-环境设定)手算观测维度、一个手的锚定目标、漂移进不进奖励、四个高斯的半衰点、膝和踝的 PD 增益与真实阻尼比、延迟占一个控制步多少、自适应采样的核、用户研究的效应量、扩散的时间账、OU 噪声的相关性、三种代价的数值、表 S8 的段数；动画、四个演示和这一节用的是同一组数。[源码对照](#源码对照)把官方代码里的锚定、奖励、观测、增益、随机化、终止、自适应采样、25 Hz 版本与部署逐段对上论文。

---

## 🔤 英文缩写速查

| 缩写 | 全称 | 在这篇论文里指什么 |
|------|------|-------------------|
| **MDP** | Markov Decision Process | 跟踪问题的建模：观测、动作、奖励、终止、重置 |
| **DR** | Domain Randomization | 域随机化：只给摩擦与恢复系数、关节零位、躯干质心三类 |
| **PD** | Proportional-Derivative | 关节设定点 → 力矩的低层控制器，增益按反射惯量算 |
| **Armature** | reflected inertia | 电机转子惯量 × 齿比²，从关节一侧看到的额外惯量（表 S3） |
| **Rot6D** | 6D rotation representation | 旋转矩阵的前两列，连续的朝向表示（Zhou 2019） |
| **VAE** | Variational Autoencoder | 条件 VAE：编码参考相关输入 → 32 维潜码 $z$ → 解码动作 |
| **DAgger** | Dataset Aggregation | 学生自己走，老师在学生到过的状态上给标签的在线蒸馏 |
| **LDM** | Latent Diffusion Model | 潜空间扩散：这里扩散的是「状态 + 潜码」轨迹 |
| **DDPM** | Denoising Diffusion Probabilistic Model | 去噪网络直接预测干净轨迹 $\tau$，推理 20 步 |
| **OU** | Ornstein–Uhlenbeck | 采数据时加在动作上的噪声（式 S4），形成「误差带」 |
| **SDF** | Signed Distance Field | 有符号距离场：避障代价用它算部位到障碍的距离 |
| **PDP** | Physics-based character animation via Diffusion Policy | 同组前作，带扰动采数据的做法来自这里 |
| **Diffuse-CLoC** | Guided Diffusion for Physics-based Character Look-ahead Control | 同组前作，状态—动作联合扩散 + 引导，v1–v3 的直接来源 |
| **LIO** | LiDAR-Inertial Odometry | 起身这类极端接触动作，用激光惯导修正位置 |

---

## 🎬 十二幕动画：BeyondMimic 全流程 {#bm-explainer-anim}

<div class="paper-demo" data-demo="bm-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#bm-video}

<div class="paper-demo" data-demo="bm-video" data-src="media/bm_explainer_video.mp4" data-poster="media/bm_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/bm_explainer_video.mp4" download="BeyondMimic_讲解视频.mp4">下载 mp4（11.3 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：问题、方法按小节收起，具体实例、实验、边界、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；四个交互演示和流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两个缺口、此前的三类做法、论文的两个判断</summary>

**缺口一：可扩展的高质量跟踪。** 此前的人形跟踪分两路（v4 Materials and Methods 开头）：

| 路线 | 代表 | 问题 |
|------|------|------|
| 每段动作一个策略、单独调 | [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)、KungfuBot、HuB | 动作自然，但每段都要改随机化或奖励；ASAP 的残差动作模型也是按动作训的 |
| 多动作一个策略 | [OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)、ExBody、GMT、TWIST | 能扩展，但强化学习探索不够，动作不自然；GMT 放弃全局轨迹，改跟相对速度 |
| 仿真里的大规模跟踪 | [PHC](../PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html) | 只在理想动力学、无限出力的仿真里成立 |

论文的第一个判断：不需要复杂的强化学习配置。前人用重度域随机化、一堆奖励正则和复杂观测去补仿真与真机的差距，反而让效果下降、不得不按动作调；**按经典力学把执行器建对、把系统实现做好（延迟等），随机化就只用给真正不确定的物理量**，奖励里也只留三项正则。v4 把「可扩展跟踪」定义为「one recipe fits all」：每段动作仍是各自一个策略，但 MDP 和训练设置完全相同，新动作不用调参。

**缺口二：学会以后怎么用。** 让技能组合、完成没训练过的任务，此前也是两路：

| 路线 | 问题 |
|------|------|
| 分层：任务无关的跟踪器 + 任务层规划器 | 敏捷与自然打折；分开训，规划出的动作跟踪器跟不上（规划—控制错配） |
| 多任务生成模型，比如 VAE 类（[CALM](../CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters/CALM_Conditional_Adversarial_Latent_Models_for_Directable_Virtual_Characters.html)、[PULSE](../PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.html)） | 训练时要给显式的目标条件；避障、长程导航这类隐式目标泛化差，动作发抖、不自然 |

第二个判断：**扩散模型学的是数据分布的梯度场 $\nabla \log p$，而不是分布本身**，所以测试时可以朝任意可微目标做梯度优化（classifier guidance）。但任务目标写在状态空间，策略输出在动作空间（[Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.html) 这类纯动作扩散接不上），于是要扩散「状态 + 动作」的一段未来轨迹，以预测控制的方式在未来状态上加代价。

</details>

---

## 🔧 BeyondMimic 是怎么做的？

<div class="mermaid">
flowchart LR
    MoCap["人类动作<br/>LAFAN1 等，约 2.5 小时"] --> Track["阶段 1：每段一个跟踪策略<br/>同一套 MDP 与超参数"]
    Track --> Real["30 段上 G1<br/>（50 Hz，ONNX，CPU）"]
    Track --> VAE["阶段 2-a：DAgger 蒸馏<br/>条件 VAE，z 为 32 维"]
    VAE --> Roll["VAE 跑轨迹 + OU 噪声<br/>记录状态与潜码"]
    Roll --> LDM["阶段 2-b：状态—潜码扩散<br/>过去 4 步 + 未来 16 步，25 Hz"]
    LDM --> Guide["部署：代价引导 −∇G<br/>摇杆 / 路点 / 避障 / 关键帧"]
</div>

### 1. 锚定跟踪（Tracking Objective、补充材料 S1） {#bm-anchor}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：锚点照参考跟，其他部位的目标挪到机器人身上；放开水平位置和偏航，不放高度</summary>

参考动作是逐帧的广义坐标 $(q^{ref}, \nu^{ref})$，前向运动学给出每个部位的位姿 $T^{ref}_b$ 与速度旋量 $\mathcal{V}^{ref}_b$。部位太密会冗余，只挑一组目标部位 $\mathcal{B} _ {target}$（含手脚 $\mathcal{B} _ {ee}$）；官方代码里是 14 个：骨盆、左右髋 / 膝 / 踝、躯干、左右肩 / 肘 / 腕。

训练时的扰动和上真机的差距一定会让全局位置漂。要保住动作风格、又容许漂移，就该跟**相对**位姿：选一个锚点 $b _ {anchor}$（通常是根或躯干，代码里是 `torso_link`），

- 锚点自己直接跟参考：$T^{des} _ {anchor} = T^{ref} _ {anchor}$；
- 其他部位：$T^{des}_b = \mathcal{A}(T^{ref}_b, T _ {anchor})$，补充材料 S1 写成

$$
R^{des}_b = R_\Delta R^{ref}_b,\qquad
p^{des}_b = p_\Delta + R_\Delta\,(p^{ref}_b - p^{ref}_{anchor}),
$$

$$
p_\Delta = [\,p_{anchor,x},\ p_{anchor,y},\ p^{ref}_{anchor,z}\,],\qquad
R_\Delta = R_z\!\left(\mathrm{yaw}(R_{anchor} R^{ref\,\top}_{anchor})\right).
$$

即「把参考整体平移到机器人脚下（$x, y$ 用机器人的，高度用参考的），再绕竖直轴转到机器人的偏航」。速度目标不变：$\mathcal{V}^{des}_b = \mathcal{V}^{ref}_b$。

> 🔑 **放开的是水平位置和偏航，不放高度、俯仰、横滚**：机器人往旁边漂了、转了个向，各部位的目标跟着走，奖励不罚；蹲下、跳起、倒地这类竖直方向的东西照样要跟。旧版笔记说偏航仍算误差，说反了。漂移也不是完全没人管：锚点自己的误差 $e _ {anchor}$ 进观测（见第 3 节），表 S1 还有两项可选的锚点全局奖励（权重 0.5，官方代码默认开着）。

</details>

这一步值得动手拖一下：机器人完美地做出参考的姿势，只是整体漂了 —— 两种目标下，表 S1 的各项奖励差多少：

<div class="paper-demo" data-demo="bm-anchor" id="bm-anchor-demo"><p class="demo-fallback">（本节含交互演示：锚定变换，需要启用 JavaScript）</p></div>

### 2. 奖励：一项任务加三项正则（Rewards、表 S1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四种误差过高斯、σ 与权重、三项正则、可选的全局项</summary>

对每个目标部位算四种误差：$e _ {p,b} = p^{des}_b - p_b$，$e _ {R,b} = \log(R^{des}_b R_b^\top)$，$e _ {v,b} = v^{des}_b - v_b$，$e _ {\omega,b} \approx \omega^{des}_b - \omega_b$；各自在 $\mathcal{B} _ {target}$ 上取均方 $\bar e_s$，过高斯：

$$
r(\bar e_s, \sigma_s) = \exp(-\bar e_s / \sigma_s^2),\qquad r_{task} = \sum_{s \in \{p, R, v, \omega\}} r(\bar e_s, \sigma_s).
$$

$\sigma$ 可以看成容忍尺度，取「适合大多数动作」的值：

| 项 | $\sigma$ | 权重 | 掉到一半时的均方根误差 |
|---|---|---|---|
| 部位位置 | 0.3 m | 1.0 | 0.25 m |
| 部位朝向 | 0.4 rad | 1.0 | 0.333 rad（19.1°） |
| 部位线速度 | 1.0 m/s | 1.0 | 0.83 m/s |
| 部位角速度 | 3.14 rad/s | 1.0 | 2.61 rad/s |
| 锚点全局位置（可选） | 0.3 m | 0.5 | — |
| 锚点全局朝向（可选） | 0.4 rad | 0.5 | — |

三项正则（写成惩罚，权重为负）：

| 项 | 式子 | 权重 |
|---|---|---|
| 关节软限位 | $\sum_j [\max(l_j - \theta_j, 0) + \max(\theta_j - u_j, 0)]$，$[l_j, u_j]$ 取机械限位的 0.9 倍 | −10.0 |
| 动作变化率 | $\lVert a_t - a _ {t-1} \rVert^2$ | −0.1 |
| 自碰撞 | 手脚以外、自接触力超过 $f _ {th} = 1$ N 的部位个数 | −0.1 |

前人常加的力矩扰动、接触力罚、打滑罚、跺脚罚这里都没有。正文 Discussion 的原话是：这些重度启发式「不必要」，原则性的奖励、适度的随机化和认真的系统实现就够了。

</details>

### 3. 观测：只看当前一步（Observation、补充材料 S1）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：o 的六段、160 维、非对称评论家、Rot6D 与历史的消融</summary>

$$
o = [\,\psi,\ e_{anchor},\ \mathcal{V}_{imu},\ \theta - \theta_0,\ \dot\theta,\ a_{last}\,]
$$

| 分量 | 含义 | 维度（官方代码，G1 29 关节） |
|---|---|---|
| $\psi = [\theta^{ref}, \dot\theta^{ref}]$ | 参考的关节角与速度，**只当进度提示**，不要求逐关节跟 | 58 |
| $e _ {anchor}$ | 锚点位置误差 3 + 旋转误差矩阵 $R^{des} _ {anchor} R _ {anchor}^\top$ 的前两列 6（Rot6D）；参考是全局定义的，这一项是平衡与纠偏所需的最小全局线索 | 9 |
| $\mathcal{V} _ {imu}$ | 机身（IMU 系）线速度与角速度，帮助抗推、脚步时机与稳定 | 6 |
| $\theta - \theta_0$、$\dot\theta$ | 关节角（相对默认）与关节速度 | 29 + 29 |
| $a _ {last}$ | 上一步动作；和关节状态一起近似「当前出了多大力、有没有接触」，配合动作变化率罚压住高频抖动 | 29 |

一共 **160** 维，不堆叠历史。评论家是非对称的：额外看各部位相对锚点的位姿 $T^{-1} _ {anchor} T_b$，在笛卡尔空间里直接估跟踪误差（代码里是 14 个部位的位置 42 + Rot6D 84，共 **286** 维）。状态估计靠不住、或者不需要纠漂时，可以去掉锚点位置误差和机身线速度（**154** 维，代码里的 `Tracking-Flat-G1-Wo-State-Estimation-v0`）。

两组消融（图 8A，每组在真机上用一段武术动作跑三次、动作捕捉记真值；柱子没标数，下面是读图）：

- **朝向表示**：换成四元数，局部误差约 1.07–1.15 倍；轴角 1.12–1.22 倍，还摔了一次。作者认为不连续的表示会学到只在仿真里成立的映射。
- **加历史**：4 步历史局部误差约 1.12–1.20 倍，8 步 1.30–1.50 倍，25 步 2.2–2.4 倍；全局误差在 8 步时位置约 3.3 倍、偏航约 7.5 倍。作者的猜测：随机化这么少时，历史让策略记住仿真特有的状态—动作规律，上真机分布一变就差。

</details>

### 4. 动作与关节阻抗（Observation and Action、补充材料 S1） {#bm-impedance}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：设定点不裁剪、k_p 与 k_d 按反射惯量算、ω = 10 Hz、ζ = 2、α = 0.25 τmax / k_p、armature 的消融</summary>

动作是归一化的关节设定点：$\theta^{sp} = \theta_0 + \alpha \odot a$，交给电机驱动器里的位置 PD 去产生力矩。**它不是要精确跟踪的位置**，只是塑造力矩的中间量，所以故意不按关节运动学限位裁剪。

前人常用高增益（DeepMimic、ASAP、PHC 等），关节在自由空间里像刚硬的伺服，跟踪近似运动学回放；可上真机会放大传感噪声、失去缓冲冲击需要的被动柔顺，还会抹掉「当前关节状态与上一步指令里隐含的力矩信息」。v4 的做法：

$$
k_{p,j} = I_j \omega^2,\qquad k_{d,j} = 2 I_j \zeta \omega,\qquad I_j = k_{g,j}^2 I_{rotor,j}
$$

- $I_j$ 只取**反射惯量**（armature，表 S3：转子惯量 × 齿比² 加两级行星轮的小残差），不算随姿态变化的连杆子树惯量，「不需要精确」；踝和腰是两个电机经连杆驱动，名义姿态下近似 1:1，按 2 倍算；
- $\omega$ = 10 Hz（代码里是 $10 \times 2\pi$ rad/s），偏低，促进柔顺；
- $\zeta$ = 2，过阻尼：只算电机惯量会低估真实惯量；
- 动作缩放 $\alpha_j = 0.25\,\tau _ {j,max} / k _ {p,j}$：假设接触多发生在 $\theta_0$ 附近、硬件设计让最大力矩和预期负载成比例。

表 S4 说明为什么只算电机惯量也不离谱：越靠末端，反射惯量占轴有效惯量的比例越大（腕横滚 90.8%、踝横滚 94.9%），这些关节的带宽主要由电机决定；髋、肩这种近端关节占比只有 1–4%。

消融（图 8A 的 armature 一行与图 S2，读图）：armature 设成 0，局部误差 1.16–1.29 倍，关节加速度过大、动态动作时过冲并自碰；设成 0.1 倍也差（全局位置约 1.5 倍）；10 倍略差。PD 频率：5 Hz 全局位置误差约 2.75 倍；25 Hz 局部误差略低（约 0.88 倍），但力矩过冲、齿轮箱高频振荡且响声大；ASAP 的手调增益局部角速度约 1.3 倍、全局偏航约 2.2 倍。所以全文都用 10 Hz。

</details>

选一个关节拖一拖：按电机惯量算出来的增益，代入真实轴惯量之后是什么样：

<div class="paper-demo" data-demo="bm-impedance" id="bm-impedance-demo"><p class="demo-fallback">（本节含交互演示：关节阻抗，需要启用 JavaScript）</p></div>

### 5. 随机化只给不确定的量，部署延迟压到最小（Domain Randomization、表 S2、Validation）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：表 S2 的范围、推一下、回合开头的扰动、C++ 部署与延迟消融</summary>

训练全部用厂家给的最准的参数，**不做系统辨识**。随机化只给三类「跨动作都通用」的量（表 S2，每回合开始时独立均匀抽）：

| 项 | 范围 |
|---|---|
| 静摩擦 / 动摩擦 / 恢复系数（所有部位） | U(0.3, 1.6) / U(0.3, 1.2) / U(0, 0.5) |
| 默认关节角 $\theta_0$（动作和观测一起偏，模拟零位标定误差） | 加 U(−0.01, 0.01) rad（正文说脚踝放大到 ±0.1，表和代码都是 ±0.01，见附录 B） |
| 躯干质心 | $\Delta x$ U(−0.025, 0.025)、$\Delta y$ / $\Delta z$ U(−0.05, 0.05) m |
| 推一下（间隔 U(1, 3) s） | 线速度 $x, y$ ±0.5、$z$ ±0.2 m/s；角速度 roll / pitch ±0.52、yaw ±0.78 rad/s |

回合开头（见第 6 节）的位姿扰动：$x, y$ ±0.05 m、$z$ ±0.01 m、roll / pitch ±0.1 rad、yaw ±0.2 rad，速度扰动同上表；官方代码另外给关节角加 ±0.1 rad、给观测加均匀噪声（这两项论文没写）。

另一半功夫在部署：部署框架全部用 C++ 写、为实时优化，状态估计由广义动量观测器 + 卡尔曼滤波给出、500 Hz，**跟踪时不用动作捕捉**；策略用 ONNX Runtime 在机载 CPU 上跑，一步不到 1 ms。起身这类极端接触动作，要么接激光惯导（LIO）修位置，要么去掉依赖状态估计的观测。

延迟消融（图 8A）：故意加 2 ms，速度误差就上去（局部角速度约 1.12 倍）；5 ms 三次里摔一次；10 ms 三次里摔两次。延迟也能随机化进训练，但会让学习更难；作者的选择是把部署延迟压到最小。

</details>

### 6. 终止、重置与自适应采样（Adaptive Sampling、补充材料 S1） {#bm-sampling}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两条终止条件、1 秒分箱、失败数滑动平均、0.1/S 的底、非因果核 ρ^u、图 8B</summary>

**终止**：锚点或任一手脚（左右踝、左右腕）的高度误差 $ \mid e _ {p,z,b}\| > 0.25$ m，或锚点朝向误差 $\lVert e _ {R,anchor} \rVert > 0.8$ rad。水平漂多远都不终止。

**重置**：起点相位按下面的自适应分布抽，机器人摆到参考在那一刻的位形与速度，再加第 5 节那些小扰动，抵消分钟级回合的累积误差。

**自适应采样**：一条几分钟的参考里各段难度差很多，均匀抽起点会把预算花在简单段上，难段学得慢甚至学不会。做法：

1. 参考按 1 秒分成 $S$ 箱，每箱的失败率做指数滑动平均 $\bar f_s \leftarrow 0.999\,\bar f_s + 0.001\,f_s$，压住短期波动；
2. 加一层底 $\bar f_s + 0.1/S$：所有箱都很少失败时，自然回到均匀；
3. 失败多半是之前几步的动作没做好，用非因果核 $k(u) = \rho^u$（$\rho = 0.8$，$u \in \{0, 1, 2\}$）把概率往失败**之前**摊：

$$
p_s = \frac{\sum_{u=0}^{K-1} \rho^u \bar f_{s+u}}{\sum_{j=1}^{S} \sum_{u=0}^{K-1} \rho^u \bar f_{j+u}},
$$

再归一化，按多项分布抽起点所在的箱。

图 8B：不用自适应采样，四段长动作里有三段在 3 万次迭代后仍有过不去的片段（比如 Motion 1 的两段侧手翻）；简单的 Motion 4 用了它，迭代数也从 4k 减到 2k。图 8B(iii) 的分布演化：开始均匀，难段失败多就集中过去，学会后又摊平。

> ⚠️ **代码与论文的两处出入**（详见[源码对照](#src-8-自适应采样)）：官方代码平滑的是每一步各箱的**失败次数**，不是失败率；核长默认值 2025-08-16 到 10-03 是 3，**2025-10-03 起改成了 1**（等于不卷积），而 v4 正文仍写 $u \in \{0, 1, 2\}$。

</details>

下面这个玩具把一条 60 秒的参考按 1 秒分箱，中间两段侧手翻。三种抽起点的办法各练 1500 次迭代：

<div class="paper-demo" data-demo="bm-sampling" id="bm-sampling-demo"><p class="demo-fallback">（本节含交互演示：自适应采样，需要启用 JavaScript）</p></div>

### 7. 阶段 2-a：VAE 潜空间（Latent Diffusion Models、表 S6）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么要潜空间、条件 VAE 的输入输出、DAgger、β、镜像增强、5% 对 95%</summary>

跟踪策略只会复现训练过的参考。要组合技能、完成没见过的任务，先把多个跟踪策略**蒸馏**进一个生成模型。为什么不直接扩散原始动作？论文给两个理由：

1. 动作是阻抗控制器的设定点，非常不规则、带尖锐的力矩尖峰，直接扩散不稳，也违背扩散模型的平滑假设；
2. 能把轨迹建准的大扩散网络推理慢，生成的动作会落后于最新状态；而平滑的潜空间适合扩散，**轻量的解码器能用最新观测**把潜码变成精确、动力学一致的动作。

条件 VAE（沿用 PULSE 一类的经验：编码参考比编码原始 PD 动作更有结构、更好编码）：

- 编码器只看和参考有关的输入：$z = \mathcal{E}(\psi, e _ {anchor})$，表示「想做什么动作」；
- 解码器把 $z$ 和本体感受拼起来还原动作：$\hat a = \mathcal{D}(z, [g, \mathcal{V} _ {imu}, \theta, \dot\theta, a _ {last}])$，$g$ 是机体系下的重力投影；
- 训练用 **DAgger**（学生自己走，老师在学生到过的状态上给动作），损失是改过的 ELBO：

$$
\mathcal{L}_{VAE} = \mathbb{E}\big[\lVert \hat a - a \rVert^2\big] + \beta\, D_{KL}\big(q_{\mathcal{E}}(z \mid \psi, e_{anchor}) \,\Vert\, \mathcal{N}(0, I)\big).
$$

| 超参数（表 S6） | 值 |
|---|---|
| 潜维度 | 32 |
| 学生编码器 / 解码器 MLP | [2048, 1024, 512] / [2048, 1024, 512]，ELU |
| 老师 MLP | [512, 256, 128] |
| 学习率 / 梯度累积步数 | 5e-4 / 15 |
| KL 系数 $\beta$ | 0.01 |

VAE 和扩散模型都用矢状面对称增强：原始的状态—动作对和左右镜像的一份一起训，技能库直接翻倍。

**消融**（Validation · Latent Diffusion）：在 MuJoCo 里做仿真到仿真的侧手翻，**不用潜空间成功率 5%，用潜空间 95%**；这个提升也搬上了真机（图 6）。

</details>

### 8. 阶段 2-b：状态—潜动作扩散（LDMs for Trajectory Modeling、补充材料 S3、表 S7）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：轨迹 τ 的结构、逐元素噪声级、角色系状态、emphasis projection、OU 误差带、训练与推理超参数</summary>

用训好的 VAE 在动作库上跑轨迹，把每一步的动作编码成潜码，得到「状态—潜码」轨迹：

$$
\tau = [\,s_{t-N}, z_{t-N}, \dots, s_t, z_t, \dots, s_{t+H}, z_{t+H}\,],\qquad N = 4,\ H = 16.
$$

只放状态和动作（潜码），**不放参考信息** —— 要建模的是人类动作本身的分布，不是「跟踪」这个过程。每个状态、每个潜码有**各自的去噪步数** $\mathbf{k}$：训练时每个元素独立地从 $U(0, K)$ 抽，所以推理时可以把已知的历史设成干净、其余去噪，也可以把未来某几帧的姿态设成已知（补全）。网络 $z_\phi(\tau^{\mathbf{k}}, \mathbf{k})$ 直接预测干净轨迹，损失 $\lVert z_\phi(\tau^{\mathbf{k}}, \mathbf{k}) - \tau \rVert^2$；推理按 DDPM 的反向公式去噪，最后用解码器把**当前**潜码 $z_t$ 配上最新观测解成动作。

**状态怎么写**（补充材料 S3）：角色系 $C _ {t'}$ 由根位置和偏航定义（去掉俯仰、横滚），对全局平移与偏航不变。

- 根的位姿与速度：相对**当前**一步 $t$ 的角色系（式 S1–S2），带着时间信息；
- 各目标部位的位置与速度：相对**那一步** $t+n$ 自己的根（式 S3），保留局部结构；
- **emphasis projection**：$P = [AB\ \ I]^\top$，$A$ 是随机高斯矩阵，$B$ 是对角阵、根的位姿与速度对应的元素取 $c = 6$；扩散在 $s' = Ps$ 上做，出来再用伪逆还原。等于把「乘 6 后随机混合的根特征」拼在原状态前面，强调时间信息。

**采数据：OU 噪声的误差带**（式 S4）。只用干净的 VAE 轨迹，部署时一偏就出分布。沿用 PDP：滚动时给动作加扰动、但记录原来的状态与潜码，形成一条「误差带」，让模型学会从偏差里回来。前人加逐步独立的高斯噪声，可过阻尼的 PD 会把高频扰动滤掉、状态多样性不够，所以改用 OU 噪声：

$$
\eta_{t+1} = \eta_t + \theta(\mu - \eta_t)\Delta t + \sigma\sqrt{\Delta t}\,\varepsilon_t,\qquad \theta = 0.8,\ \mu = 0,\ \Delta t = 1.0,\ \sigma = 0.1,
$$

$a_t \leftarrow a_t + \eta_t$。数据集里每个样本约出现 100 次；每段先执行策略 2.5 s，再让动作继续到 5 s 检查稳不稳，5 s 内摔了整段丢掉。

| 超参数（表 S7、S4 节） | 值 |
|---|---|
| 预测视野 $H$ / 历史 $N$ | 16 / 4 |
| 骨干 | Transformer **编码器**，6 层、8 头、512 维嵌入，约 19.8M 参数 |
| 去噪步数 | 20 |
| 训练 | batch 512、1000 epoch、学习率 1e-4、weight decay 0.001、cosine、warmup 10,000 步、EMA power 0.75 / max 0.9999 |
| 控制频率 | 跟踪策略按**同一套配方在 25 Hz 重训**（不是 50 Hz），给扩散推理留时间：$H$ = 16 步 = 0.64 s |
| 部署 | 便携迷你主机 + RTX 4060 Mobile，TensorRT；扩散在独立线程异步跑，一次推理（20 步）约 20 ms；解码器很轻，CPU 上同步跑 |

</details>

### 9. 代价引导（Online Optimization via Guidance、补充材料 S3） {#bm-guidance}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：贝叶斯拆分、摇杆 / 路点 / 避障三个代价、CppAD、相加即组合、关键帧补全</summary>

扩散模型学的是得分 $\nabla_\tau \log p(\tau)$。贝叶斯公式把条件得分拆开：

$$
\nabla_\tau \log p(\tau \mid \tau^\ast) = \nabla_\tau \log p(\tau) + \nabla_\tau \log p(\tau^\ast \mid \tau),
$$

$\tau^\ast$ 是想要的最优轨迹。用一个可微的任务代价 $G(\tau)$ 近似条件似然：$p(\tau^\ast \mid \tau) \propto \exp(-G(\tau))$，第二项就是 $-\nabla_\tau G(\tau)$。推理时在每个去噪步加上它，**不用再训练**。三个例子（式 S5–S8，求和都是视野里的 $i = 0, \dots, H$）：

| 任务 | 代价 |
|---|---|
| 摇杆 | $G _ {js} = \tfrac{1}{2} \sum_i \lVert V _ {xy,i}(\hat\tau_t) - g_v \rVert^2$：预测的平面根速度对齐摇杆速度 $g_v \in \mathbb{R}^2$ |
| 路点 | $G _ {wp} = \sum_i (1 - e^{-2d_i}) \lVert P _ {xy,i} - g_p \rVert^2 + e^{-2d_i} \lVert V _ {xy,i} \rVert^2$，$d_i = \lVert P _ {xy,i} - g_p \rVert$：远处罚位置，近处换成罚速度，好停下（v1–v3 写明 $d$ 不参与求导） |
| 避障 | $G _ {sdf} = \sum_i \sum_b B(\mathrm{SDF}(P _ {b,i}) - r_b,\ \delta)$，$r_b$ 是部位的碰撞半径；松弛对数障碍 $B(x, \delta) = -\ln x$（$x \ge \delta$），$-\ln\delta + \tfrac12[((x - 2\delta)/\delta)^2 - 1]$（$x < \delta$） |

梯度用 CppAD 在每个去噪步里自动求。**代价可以直接相加**：路点 + 避障 = 绕开障碍走到目标（图 6B）；换成摇杆 + 避障，用户稍微推歪也能躲开碰撞。训练时不需要枚举这些组合。

和在线轨迹优化的区别（Results 开头）：模型已经学会了一整套可行的人类动作当先验，简单的、任务相关的代价就够触发合适的行为，不用堆正则和塑形项。代价要的状态：摇杆与补全用机载状态估计；**路点与避障用动作捕捉**提供环境与更准的定位。

**关键帧补全**：从摇杆行走开始，每隔 0.2 s 注入一帧侧手翻的关键姿态，扩散把过渡与关键帧之间补成连续轨迹，做完回到速度跟踪；同样的设置下还能走进躺下再敏捷地起身、旋踢、翻踢。论文没写关键帧是写成代价、还是直接设成「已经干净」的元素；从「每个元素有自己的噪声级，便于补全观测与未来姿态」那句看，更像后者（整理者的推测）。

</details>

下面这个玩具在浏览器里跑滚动时域的引导去噪：每 40 ms 去噪一段 0.64 s 的未来、只执行第一步。勾上避障，就是在任务代价上再加一项：

<div class="paper-demo" data-demo="bm-guidance" id="bm-guidance-demo"><p class="demo-fallback">（本节含交互演示：代价引导，需要启用 JavaScript）</p></div>

### 📊 两个阶段怎么接起来（图 7）

<div class="mermaid">
flowchart TB
    subgraph S1["阶段 1：一份配方（每段动作一个策略）"]
        Ref["参考动作"] --> Anc["锚定目标：水平与偏航跟机器人"]
        Anc --> Pol["演员：160 维单步观测 → 设定点"]
        Pol --> PD["PD（k_p = Iω²）→ 力矩"]
    end
    subgraph S2["阶段 2：蒸馏 + 引导（一个模型）"]
        Pol -. "老师（DAgger）" .-> V["条件 VAE：z = E(ψ, e_anchor)"]
        V --> Data["跑轨迹 + OU 噪声 → (s, z) 序列"]
        Data --> D["Transformer 去噪：4 步历史 + 16 步未来"]
        G["代价 G：摇杆 / 路点 / SDF / 关键帧"] --> D
        D --> Dec["解码器：z_t + 最新观测 → 动作"]
    end
</div>

---

## 🚶 具体实例：把论文里的几个机制手算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（13 节）：环境设定 / 观测维度 / 一个手的锚定目标 / 漂移进不进奖励 / 四个高斯 / 膝与踝的增益 / 真实阻尼比 / 延迟 / 采样核 / 效应量 / 时间账 / OU 噪声 / 三个代价 / 表 S8 的段数</summary>

<h3 id="实例-环境设定">环境设定</h3>

官方代码里 G1 有 29 个关节；仿真 200 Hz（`sim.dt = 0.005`）、每 4 个子步出一次动作，跟踪策略 **50 Hz**；4096 个并行环境，回合 10 s；PPO 超参数照表 S5（[512, 256, 128] 两个 MLP、每环境 24 步、3 万次迭代、学习率 1e-3、clip 0.2、熵 0.005、$\gamma$ 0.99、$\lambda$ 0.95、目标 KL 0.01、5 个 epoch、4 个 minibatch）。第 2、3 步的位姿是编的数，只为演示公式；第 4–7、9–11 步全部来自论文与代码的数；第 8 步的 10 箱参考、第 12 步的 $\delta$ 是玩具。

<h3 id="实例-第-1-步观测维度">第 1 步：观测维度对账</h3>

| 对象 | 组成 | 维度 |
|---|---|---|
| 演员 | 参考关节角 29 + 参考关节速度 29 + 锚点位置误差 3 + Rot6D 6 + 机身线速度 3 + 角速度 3 + 关节角 29 + 关节速度 29 + 上一步动作 29 | **160** |
| 评论家 | 演员的 160（不加噪声）+ 14 个部位相对锚点的位置 42 + Rot6D 84 | **286** |
| 无状态估计版 | 160 − 锚点位置误差 3 − 机身线速度 3 | **154** |

<h3 id="实例-第-2-步一个手的锚定目标">第 2 步：一个手的锚定目标</h3>

参考的锚点（躯干）在 $(2.00, 0.50, 0.95)$、偏航 0；机器人做的是同一个姿势，但躯干漂到了 $(2.30, 0.10, 0.95)$、偏航 0.20 rad —— 水平漂移 $(0.30, -0.40)$，长度 **0.5 m**。参考的右手在 $(2.25, 0.30, 0.85)$，相对参考锚点 $(0.25, -0.20, -0.10)$。按 S1：

- $p_\Delta = (2.30, 0.10, 0.95)$（机器人的 $x, y$，参考的 $z$），$R_\Delta = R_z(0.20)$；
- $R_z(0.20)(0.25, -0.20, -0.10) = (0.25 \times 0.9801 + 0.20 \times 0.1987,\ 0.25 \times 0.1987 - 0.20 \times 0.9801,\ -0.10) = (0.2847, -0.1464, -0.10)$；
- 手的目标 $p^{des} = $ **$(2.585,\ -0.046,\ 0.85)$**。

机器人的手正好在这里（姿势没错），所以锚定后的误差是 0；若跟世界系，误差是 $(2.585 - 2.25,\ -0.046 - 0.30,\ 0) = (0.335, -0.346, 0)$，平方和 0.232 —— 姿势一点没错，却被算成错了约 0.48 m。

<h3 id="实例-第-3-步漂移进不进奖励">第 3 步：漂移进不进奖励</h3>

只看水平漂移 0.5 m（不转偏航时，每个部位的误差都正好是这 0.5 m，和身体几何无关）：

- 跟世界系：$\bar e_p = 0.25$，$r_p = \exp(-0.25 / 0.3^2) = \exp(-2.778) =$ **0.062**；
- 锚定：$\bar e_p = 0$，$r_p =$ **1**。

偏航 0.2 rad 也一样被锚定吸收；它只留在锚点的全局朝向项里：$\exp(-0.2^2 / 0.4^2) = \exp(-0.25) =$ **0.779**，乘权重 0.5 是 0.389。锚点全局位置项 $0.062 \times 0.5 = 0.031$。终止只看高度和倾斜，这样漂不会终止。

<h3 id="实例-第-4-步四个高斯">第 4 步：四个高斯掉到一半</h3>

$\exp(-\bar e/\sigma^2) = 0.5 \Rightarrow \bar e = \sigma^2 \ln 2$，均方根误差 $\sigma\sqrt{\ln 2} = 0.8326\,\sigma$：

| 项 | $\sigma$ | 一半时的均方根误差 |
|---|---|---|
| 位置 | 0.3 m | **0.25 m** |
| 朝向 | 0.4 rad | 0.333 rad = **19.1°** |
| 线速度 | 1.0 m/s | **0.83 m/s** |
| 角速度 | 3.14 rad/s | **2.61 rad/s** |

<h3 id="实例-第-5-步膝与踝的增益">第 5 步：膝与踝横滚的增益</h3>

$\omega = 2\pi \times 10 = 62.83$ rad/s，$\omega^2 = 3947.8$。

| | 膝（7520-22.5 电机） | 踝横滚（两个 5020，按 2 倍） |
|---|---|---|
| 反射惯量 $I$（表 S3） | $4.89\times10^{-5} \times (4.5 \times 5)^2 + 1.09\times10^{-5} \times 5^2 + 7.38\times10^{-5} =$ **0.02510** kg·m² | $2 \times 0.003610 = 0.007219$ kg·m² |
| $k_p = I\omega^2$ | **99.10** N·m/rad | 28.50 N·m/rad |
| $k_d = 2I\zeta\omega$ | **6.309** N·m·s/rad | 1.814 N·m·s/rad |
| 力矩上限（代码） | 139 N·m | 50 N·m |
| $\alpha = 0.25\,\tau _ {max}/k_p$ | **0.351 rad**（20.1°） | 0.439 rad |
| 动作 = 1、关节在 $\theta_0$ 时的力矩 | $99.10 \times 0.351 = 34.75$ N·m = 25% × 139 | 12.50 N·m = 25% × 50 |

所有关节 $k_d / k_p = 2\zeta/\omega = 0.064$ s。手腕俯仰（4010 电机、上限 5 N·m）的 $\alpha$ 只有 0.075 rad。

<h3 id="实例-第-6-步真实阻尼比">第 6 步：代入真实轴惯量后的频率与阻尼比</h3>

增益不变，把惯量换成表 S4 的轴有效惯量（加上连杆子树，名义姿态、固定基座）：$\omega _ {real} = \sqrt{k_p / I _ {eff}}$，$\zeta _ {real} = k_d / (2\sqrt{k_p I _ {eff}})$。

| 关节 | $I _ {eff}$ | 电机惯量占比 | 实际频率 | 实际阻尼比 |
|---|---|---|---|---|
| 膝 | 0.1366 | 18.4% | **4.29 Hz** | **0.857** |
| 踝横滚 | 0.007607 | 94.9% | 9.74 Hz | 1.948 |
| 髋俯仰 | 0.8644 | 1.2% | 1.09 Hz | 0.217 |

这就是「先取 $\zeta = 2$」的道理：只算电机惯量会低估真实惯量，膝代进去就从过阻尼变成略欠阻尼（0.86）；末端关节几乎全是电机惯量，设计值基本成立。髋俯仰的子树是整条腿（固定基座、腿悬空时），站着时并不这样转，这一行只说明近端关节偏离设计更远。

<h3 id="实例-第-7-步延迟">第 7 步：延迟占一个控制步多少</h3>

50 Hz 下一个控制步 20 ms，一个物理子步 5 ms。图 8A 的三档延迟：

| 延迟 | 占控制步 | 合多少个子步 | 局部误差（四项平均，读图） | 三次里摔几次 |
|---|---|---|---|---|
| 2 ms | 10% | 0.4 | 约 1.08 倍 | 0 |
| 5 ms | 25% | 1 | 约 1.34 倍 | 1 |
| 10 ms | 50% | 2 | 约 1.71 倍 | 2 |

<h3 id="实例-第-8-步采样核">第 8 步：自适应采样的核（玩具）</h3>

核 $\rho^u$（$u = 0, 1, 2$）归一化后是 $[0.410, 0.328, 0.262]$。一条 10 秒的玩具参考，第 6 秒失败率 0.5、其他为 0，加底 $0.1/10 = 0.01$：

- 核长 3（论文）：第 4、5、6 秒的起点概率是 **0.235、0.290、0.358**，合计 88.3%，其余每箱 0.017 —— 失败那一秒**和它之前两秒**都被多抽；
- 核长 1（当前代码）：第 6 秒 **0.85**，其余每箱 0.017 —— 只盯着失败的那一秒。

滑动平均每步 0.001，半衰期 $\ln 0.5 / \ln 0.999 =$ **693** 个控制步；每次 PPO 迭代每个环境走 24 步，约 29 次迭代（这是代码按「每步更新一次」的读法，论文只写了 0.999 / 0.001）。

<h3 id="实例-第-9-步效应量">第 9 步：用户研究的效应量</h3>

Cohen's $h = 2\arcsin\sqrt{p} - 2\arcsin\sqrt{1-p}$。用四舍五入后的百分数复算：整体 70.8% → **0.858**，走路 57.0% → 0.281，跑步 84.7% → **1.534**；论文报 0.859 / 0.281 / 1.532，差在第三位（论文用的是未四舍五入的比例）。

<h3 id="实例-第-10-步时间账">第 10 步：扩散的时间账</h3>

- 25 Hz 一个控制步 40 ms；视野 16 步 = **0.64 s**，历史 4 步 = 0.16 s，一条轨迹 21 个时刻；
- 一次推理 20 步去噪约 20 ms，平均每个去噪步 1 ms，占控制步的一半 —— 所以放在独立线程异步跑；
- 跟踪策略的 ONNX 推理不到 1 ms，状态估计 500 Hz。

<h3 id="实例-第-11-步ou-噪声">第 11 步：OU 噪声有多「相关」</h3>

代入 $\theta = 0.8$、$\Delta t = 1$：$\eta _ {t+1} = 0.2\,\eta_t + 0.1\,\varepsilon_t$。平稳标准差 $0.1 / \sqrt{1 - 0.2^2} =$ **0.102**；相邻两步的相关系数只有 **0.2**，隔两步 0.04（整理者推算：这组参数下时间相关很弱，和「温和的高斯噪声」差别不大）。噪声加在归一化动作上，乘膝的 $\alpha$ = 0.351 rad，设定点的扰动标准差约 0.036 rad（2.0°）。

<h3 id="实例-第-12-步三个代价">第 12 步：三个代价算一遍</h3>

- **摇杆**：$g_v = (0.8, 0)$，预测的 17 个速度都是 $(0.5, 0.1)$。每项 $\tfrac12 \lVert(-0.3, 0.1)\rVert^2 = 0.05$，$G _ {js} = 17 \times 0.05 =$ **0.85**；$-\nabla$ 在每个速度上是 $(+0.3, -0.1)$，把预测往摇杆推。
- **路点**：位置项权重 $1 - e^{-2d}$：$d = 2$ m 时 0.982（几乎只罚位置）；$d = 0.3$ m 时 0.451、速度项 0.549；$d = 0$ 时只罚速度，于是停下。
- **避障**（$\delta$ 论文没给，这里取 0.1 m）：$B(0.3) = 1.204$；$B(0.1) = 2.303$（两段在 $\delta$ 处值相等、导数都是 −10）；$B(0.05) = 2.303 + \tfrac12(1.5^2 - 1) =$ **2.928**；钻进去 5 cm，$B(-0.05) = 2.303 + \tfrac12(2.5^2 - 1) =$ **4.928** —— 仍是有限值，梯度照样把它往外推。

<h3 id="实例-第-13-步表-s8">第 13 步：表 S8 数一数</h3>

表 S8 有 7 段短序列（C 罗、侧踢、单脚平衡、燕式平衡、空中侧手翻、两段双踢）和 29 行 LAFAN1（dance2 subject4 列了两次），仿真全部「Full」。真机一栏：7 段短序列全程，LAFAN1 里列出了 **25** 个区间，合计 **32 段**，和正文「30 段、共 15 分钟」差两段；能算出时长的 LAFAN1 区间合计 670.6 s（11.2 分钟），另有一段「Full」和两段「到结尾」没给时长，加上短序列，和 15 分钟大致对得上（整理者的统计）。

</details>

---

## 📊 实验里实际报了什么 {#bm-experiments}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：跟踪的多样、敏捷、自然；图 8 与图 S2 的消融；引导扩散的三类任务；v1–v3 的状态表示消融</summary>

<h3 id="exp-1-跟踪多样敏捷自然">跟踪：多样、敏捷、自然</h3>

| 维度 | 结果（v4 Results） |
|---|---|
| 规模 | 约 2.5 小时人类动作，仿真里全部验证；30 段（共 15 分钟）上 G1；不少难段和别的技能一起训在 3 分钟以上的参考里 |
| 动作类型 | 单脚站、不同姿势起身；单脚跳、转身踢、180° 与 360° 转体前跳、侧手翻；老人步态、舞蹈、运动动作（网球、羽毛球等，图 2） |
| 敏捷（图 3） | 户外软土、落叶、不平地面上做空中侧手翻：腾空时加速度峰值 **31 m/s²**，骨盆角速度最高 **20 rad/s**（平均 7.01；熟练的人做空翻平均约 7.75）；落地基本不用救；连续两个侧手翻、在地上爬、从地上跳起 |
| 重复性 | C 罗的庆祝转身跳**连做 5 次**，稳定与风格都不掉（ASAP 只报了一次） |
| 地面反力（图 4C） | 和人在测力跑台上比：走路双峰（脚跟着地峰 + 蹬地峰），跑步单峰，时机对齐；G1 走路的峰更尖 —— 没有脚趾关节，滚动和蹬地受限 |
| 用户研究（图 4E） | 77 人看 20 对 5 秒走 / 跑视频，选「更像人、更自然」：对 Unitree 原厂控制器，整体 **70.8%** 对 29.2%（$p < .001$，$h = 0.859$），走路 57.0%（$h = 0.281$），跑步 84.7%（$h = 1.532$）；双侧二项检验，分步态用 Bonferroni 校正（$\alpha = .025$） |
| 受扰（图 4F） | 走路时被人轻轻拉住，柔顺地停住、稳在原地，松手后平滑地接着走 |

<h3 id="exp-2-图-8-与图-s2">图 8 与图 S2：哪些设计是关键（读图）</h3>

| 消融 | 局部误差（原设置 = 1） | 全局误差 | 结论 |
|---|---|---|---|
| 四元数 / 轴角 | 1.07–1.15 / 1.12–1.22 | 位置 0.9、偏航 1.8 / 位置 2.85、偏航 2.28 | 连续的 Rot6D 上真机更好；轴角摔一次 |
| 历史 4 / 8 / 25 步 | 1.12–1.20 / 1.30–1.50 / 2.2–2.4 | 4 步不变；8 步位置 3.25、偏航 7.5；25 步约 5.6 | 不加历史最好 |
| armature × 0 / × 0.1 / × 10 | 1.16–1.29 / 1.17–1.31 / 1.02–1.08 | 偏航 1.68 / 位置 1.5 / 约 1.3–1.5 | 用正确的电机惯量 |
| 延迟 2 / 5 / 10 ms | 1.06–1.12 / 1.32–1.36 / 1.65–1.78 | 约 1 / 2–2.25 / 约 2.7 | 5 ms 摔一次，10 ms 摔两次 |
| PD：5 Hz / ASAP 增益 / 25 Hz（图 S2） | 1.17–1.29 / 1.03–1.31 / 0.87–1.01 | 位置 2.75 / 偏航 2.22 / 位置 2.17 | 10 Hz 全局最好；25 Hz 振荡、响 |
| 自适应采样（图 8B） | — | — | 不用：4 段里 3 段 3 万次迭代仍失败；Motion 4 迭代数 4k → 2k |

<h3 id="exp-3-引导扩散的三类任务">引导扩散：测试时的三类任务</h3>

- **按命令行走**（图 5）：摇杆给线速度与偏航角速度，全向走，被踢一脚后很快恢复、接着按后退命令走；路点导航从不同起点前进或后退走到目标；仿真里速度跟踪误差走路 **12.14%**、跑步 **13.65%**；跑道上连续跑 **50 m** 以上。同样的低速命令有时出稳定的走、有时出轻快的慢跑（多模态）；只给速度命令就能从走平滑过渡到跑 —— 这种过渡在数据里很少、也没有标注（图 5D 的潜空间 t-SNE 能看到从走到跑的连线）。
- **关键帧补全与切换**（图 6A）：摇杆行走中每 0.2 s 一帧侧手翻关键帧，补全过渡与中间；还演示了走进躺下、敏捷起身、旋踢、翻踢；长程演示里侧手翻和速度控制的走、跑交替（正文说三个、图注说四个，见附录 B）。
- **任务组合**（图 6B）：路点 + 避障，目标在正前方，机器人绕开障碍到达；把路点换成摇杆，用户推得稍偏也能避免碰撞。

<h3 id="exp-4-潜空间与状态表示消融">潜空间消融（v4）与状态表示消融（v1–v3）</h3>

- v4：MuJoCo 仿真到仿真的侧手翻，不用潜空间 **5%**、用潜空间 **95%**，结果搬上了真机。
- v1–v3（v4 删掉了）：当时的扩散是「状态—动作」联合扩散（没有 VAE），比较两种状态表示 —— 各部位笛卡尔位置与速度（Body-Pos）和关节角与速度（Joint-Rot）。Walk + Perturb（15 s 行走，每秒随机推 0–0.5 m/s）成功率 100% 对 72%，摇杆（前、后、左转、右转各 3 s）80% 对 0%，各 50 次。作者解释：关节角理论上更马尔可夫，但关节误差沿运动链累积，多步预测更容易崩，加引导会迅速出分布。v4 的状态仍是各部位的笛卡尔位置与速度，相当于沿用了这个结论。

</details>

---

## ⚠️ 边界与局限

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文 Limitations 的四条，加上读者要注意的几点</summary>

论文自己列的（Limitations and Future Works）：

1. **继承状态估计的误差**：本体感受的误差直接传到生成的轨迹里；潜空间扩散对噪声观测有一些鲁棒性，但更好的状态估计（传感器融合、学出来的估计器）仍是方向。
2. **视野短**：0.64 s 够反应式控制和局部避障，不够需要提前预判的长程规划。
3. **历史的两面性**：历史让预测稳定，也会让模型困在重复的动作模式里，即使引导在起作用；加大引导权重能拉出来，但在模式切换或高方差状态时会让去噪不稳 —— 所以「步态一旦建立就稳，动作开始和结束时容易绊」。
4. **任务粒度**：引导对粗粒度目标效果好，细粒度的差，还要轻调引导权重；方向是视觉领域里的监督微调和适配层。

读者还要注意：

- **路点与避障用了动作捕捉**提供环境和更准的定位（S4 节），摇杆与补全才只用机载估计。
- **每段动作仍是一个跟踪策略**：「可扩展」指同一份配方、不用调参，不是一个策略跟所有动作；第二阶段才合成一个模型，论文没写蒸馏了哪些、多少个跟踪策略。
- **扩散与引导部分的代码没公开**：引导权重、$\delta$、$r_b$、噪声表、关键帧怎么注入都没写（见[写明 vs 没写](#src-11-写明-vs-没写)）。
- **数字以读图为主**：图 8A、图 S2 的消融都没标数，三次试验、误差棒很大（5 ms、10 ms 那几根尤其），只能看趋势。

</details>

---

## 🤖 对人形机器人学习的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：1. 把「调参」换成「建模」 / 2. 跟踪成了公共基础设施 / 3. 生成模型 + 测试时优化</summary>

<h3 id="1-把调参换成建模">1. 把「调参」换成「建模」</h3>

和 [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html) 去真机采数据学残差、[域随机化](../Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html) 撒大范围参数不同，BeyondMimic 的 sim-to-real 主要靠「把仿真建对」：正确的电机惯量、按惯量算的阻抗、低延迟的部署，随机化只给真正不确定的量。图 8A 的 armature 与延迟两行就是这个主张的证据。

<h3 id="2-跟踪成了公共基础设施">2. 跟踪成了公共基础设施</h3>

正文 Discussion：开源的跟踪管线已被 MJLab、Unitree RL Lab 当作默认方法；[GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) 用它当「中性」的训练框架比较重定向质量，[SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) 把它当对照。

<h3 id="3-生成模型--测试时优化">3. 生成模型 + 测试时优化</h3>

把 [Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.html) 的「扩散出动作」推进到「扩散出状态 + 潜动作的一段未来」，任务目标能直接写在未来状态上；训练完全任务无关、不要标签，新动作数据只扩充技能库，不用重新定义目标或按任务重训。作者把它看作走向人形「行为基础模型」的一步。

</details>

---

## 📁 源码对照 {#源码对照}

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（11 节）：仓库结构 / 锚定 / 奖励 / 观测 / 增益与动作缩放 / 随机化与重置 / 终止 / 自适应采样 / 25 Hz 版本 / 部署 / 写明 vs 没写</summary>

<h3 id="src-1-仓库结构">1. 仓库结构</h3>

`whole_body_tracking`（Isaac Lab 2.1 扩展，MIT）：

| 路径 | 内容 |
|---|---|
| `tasks/tracking/mdp/commands.py` | `MotionLoader`（读 NPZ）、`MotionCommand`：锚定、重置扰动、自适应采样 |
| `tasks/tracking/mdp/rewards.py` / `observations.py` / `terminations.py` / `events.py` | 奖励、观测、终止、随机化（零位、质心） |
| `tasks/tracking/tracking_env_cfg.py` | MDP 的全部超参数（下面几节的数都从这里来） |
| `tasks/tracking/config/g1/flat_env_cfg.py` | G1 的 14 个目标部位、锚点 `torso_link`、无状态估计版与 25 Hz 版 |
| `tasks/tracking/config/g1/agents/rsl_rl_ppo_cfg.py` | 表 S5 的 PPO 超参数 |
| `robots/g1.py` | 电机惯量、$k_p$ / $k_d$、动作缩放 |
| `scripts/csv_to_npz.py` | 重定向后的 CSV（只有广义坐标）→ 前向运动学补出各部位位姿与速度 → 上传 WandB registry |
| `scripts/rsl_rl/train.py` / `play.py` | 训练；回放并导出 ONNX（关节顺序、增益等写进 ONNX 元数据） |

另有一个 MuJoCo-Warp 版的复现在 [mjlab](https://github.com/mujocolab/mjlab)（仓库 README 推荐）。

<h3 id="src-2-锚定">2. 锚定（`MotionCommand._update_command`，对应 S1 的 $\mathcal{A}$）</h3>

```python
delta_pos_w = robot_anchor_pos_w_repeat           # 机器人锚点的位置……
delta_pos_w[..., 2] = anchor_pos_w_repeat[..., 2]   # ……但高度用参考的
delta_ori_w = yaw_quat(quat_mul(robot_anchor_quat_w_repeat, quat_inv(anchor_quat_w_repeat)))  # 只取偏航差
self.body_quat_relative_w = quat_mul(delta_ori_w, self.body_quat_w)
self.body_pos_relative_w = delta_pos_w + quat_apply(delta_ori_w, self.body_pos_w - anchor_pos_w_repeat)
```

和 S1 的 $p^{des}_b = p_\Delta + R_\Delta (p^{ref}_b - p^{ref} _ {anchor})$、$R^{des}_b = R_\Delta R^{ref}_b$ 逐项对应。速度奖励用的是 `body_lin_vel_w` / `body_ang_vel_w`（参考的世界系速度，不转），即 $\mathcal{V}^{des}_b = \mathcal{V}^{ref}_b$。

<h3 id="src-3-奖励">3. 奖励（`tracking_env_cfg.py` 的 `RewardsCfg`）</h3>

| 代码里的项 | std | weight |
|---|---|---|
| `motion_global_anchor_pos` / `_ori` | 0.3 / 0.4 | 0.5 / 0.5（论文说「可选」，代码默认开着） |
| `motion_body_pos` / `motion_body_ori`（相对，即锚定后的目标） | 0.3 / 0.4 | 1.0 / 1.0 |
| `motion_body_lin_vel` / `motion_body_ang_vel`（全局） | 1.0 / 3.14 | 1.0 / 1.0 |
| `action_rate_l2` | — | −0.1 |
| `joint_limit`（软限位系数 `soft_joint_pos_limit_factor = 0.9`） | — | −10.0 |
| `undesired_contacts`（除左右 `ankle_roll_link`、`wrist_yaw_link` 外，阈值 1.0 N） | — | −0.1 |

奖励函数都是 `torch.exp(-error.mean(-1) / std**2)`，`error` 是各部位误差平方和，和表 S1 一致。

<h3 id="src-4-观测">4. 观测（`ObservationsCfg`）</h3>

演员 8 项：`command`（参考关节角 + 关节速度，58）、`motion_anchor_pos_b`（3，噪声 ±0.25）、`motion_anchor_ori_b`（Rot6D 6，噪声 ±0.05）、`base_lin_vel`（3，±0.5）、`base_ang_vel`（3，±0.2）、`joint_pos_rel`（29，±0.01）、`joint_vel_rel`（29，±0.5）、`last_action`（29）= 160，开着均匀观测噪声（论文没写这些噪声）。评论家去掉噪声、多 `robot_body_pos_b` 与 `robot_body_ori_b`（14 个部位相对锚点）。`G1FlatWoStateEstimationEnvCfg` 把 `motion_anchor_pos_b` 和 `base_lin_vel` 设成 `None`。

<h3 id="src-5-增益与动作缩放">5. 增益与动作缩放（`robots/g1.py`）</h3>

```python
ARMATURE_7520_22 = 0.025101925           # 表 S3 的 Total
NATURAL_FREQ = 10 * 2.0 * 3.1415926535   # 10Hz
DAMPING_RATIO = 2.0
STIFFNESS_7520_22 = ARMATURE_7520_22 * NATURAL_FREQ**2
DAMPING_7520_22 = 2.0 * DAMPING_RATIO * ARMATURE_7520_22 * NATURAL_FREQ
...
"feet": ImplicitActuatorCfg(..., stiffness=2.0 * STIFFNESS_5020, damping=2.0 * DAMPING_5020, armature=2.0 * ARMATURE_5020)
...
G1_ACTION_SCALE[n] = 0.25 * e[n] / s[n]  # 0.25 × 力矩上限 / 刚度
```

髋俯仰、髋偏航、腰偏航用 7520-14.3，髋横滚、膝用 7520-22.5，踝与腰横滚 / 俯仰用两个 5020（×2），肩、肘、腕横滚用 5020，腕俯仰 / 偏航用 4010。仿真里的 armature 也设成同一个值 —— 图 8A 说明它必须对。动作项 `JointPositionActionCfg(use_default_offset=True)` 不裁剪。

<h3 id="src-6-随机化与重置">6. 随机化与重置（`EventCfg`、`CommandsCfg`）</h3>

`physics_material`：静摩擦 (0.3, 1.6)、动摩擦 (0.3, 1.2)、恢复系数 (0, 0.5)，64 个桶；`add_joint_default_pos`：所有关节 (−0.01, 0.01)（**没有**正文说的脚踝 ±0.1），并同步改动作的偏置；`base_com`：`torso_link` 的 x ±0.025、y / z ±0.05；`push_robot`：每 (1, 3) s 按 `VELOCITY_RANGE` 设一次速度。`MotionCommandCfg` 的重置扰动：`pose_range` 与 S1 相同，`velocity_range = VELOCITY_RANGE`，另有 `joint_position_range = (-0.1, 0.1)`（论文没写），加完裁到软限位。

<h3 id="src-7-终止">7. 终止（`TerminationsCfg`）</h3>

`anchor_pos`：`bad_anchor_pos_z_only`，高度差 > 0.25；`ee_body_pos`：左右踝、左右腕的高度差 > 0.25；`anchor_ori`：`bad_anchor_ori`，比的是参考与机器人锚点的**重力投影 $z$ 分量**之差 > 0.8 —— 只看倾斜，不看偏航（v1–v3 写的就是「只看俯仰和横滚」，v4 写成了整个旋转误差 $\lVert e _ {R,anchor} \rVert > 0.8$ rad）。另有 10 s 的超时。

<h3 id="src-8-自适应采样">8. 自适应采样（`MotionCommand._adaptive_sampling`）</h3>

```python
sampling_probabilities = self.bin_failed_count + self.cfg.adaptive_uniform_ratio / float(self.bin_count)  # 加 0.1/S 的底
sampling_probabilities = torch.nn.functional.pad(sampling_probabilities.unsqueeze(0).unsqueeze(0),
                                                 (0, self.cfg.adaptive_kernel_size - 1), mode="replicate")  # 非因果：右边补
sampling_probabilities = torch.nn.functional.conv1d(sampling_probabilities, self.kernel.view(1, 1, -1)).view(-1)
...
self.bin_failed_count = self.cfg.adaptive_alpha * self._current_bin_failed + (1 - self.cfg.adaptive_alpha) * self.bin_failed_count
```

- 平滑的是**每一步**各箱的失败次数（`torch.bincount` 记的是终止发生时所在的箱），`adaptive_alpha = 0.001`，在每个控制步的 `_update_command` 里更新一次；
- 核 `adaptive_lambda ** i` 归一化，`adaptive_lambda = 0.8`；
- **`adaptive_kernel_size` 的默认值**：2025-08-16 加入时是 3，2025-10-03 的提交（提交信息是「Remove redundant assignment of time_steps」）把它改成了 **1** —— 当前 main 等于不卷积，和 v4 正文的 $u \in \{0, 1, 2\}$ 不一样；
- 抽到箱以后，在箱内再均匀抽一个时刻。

<h3 id="src-9-25-hz-版本">9. 25 Hz 版本（`Tracking-Flat-G1-Low-Freq-v0`）</h3>

S4 节说第二阶段的跟踪策略「按同一套配方在 25 Hz 训练和部署」。代码里是 `G1FlatLowFreqEnvCfg`：`decimation` 从 4 改成 8，动作变化率的权重乘 0.5；PPO 配置 `G1FlatLowFreqPPORunnerCfg` 把每环境步数减半（12），$\gamma$、$\lambda$ 取平方（0.99² = 0.9801、0.95² = 0.9025）—— 让「每秒」的折扣不变。

<h3 id="src-10-部署">10. 部署（`motion_tracking_controller`）</h3>

基于 `legged_control2` 与 ROS 2 Jazzy：`controller_manager` 500 Hz（状态估计在这一层），`walking_controller`（`MotionTrackingController`）50 Hz；`MotionOnnxPolicy` 从 ONNX 元数据读关节顺序、增益、锚点与目标部位名，参考动作由 ONNX 的 `forward()` 一起给出；观测项 `MotionAnchorPosition` / `MotionAnchorOrientation` 等与训练一一对应。

<h3 id="src-11-写明-vs-没写">11. 写明 vs 没写</h3>

| 写明（论文或代码） | 没写 |
|---|---|
| 锚定公式、表 S1 的 $\sigma$ 与权重、三项正则的式子 | 第二阶段蒸馏了哪些、多少个跟踪策略 |
| 观测、动作、$k_p$ / $k_d$ / $\alpha$、表 S3 / S4 | 扩散的噪声表（$\alpha_k, \gamma_k, \sigma_k$）与 $K$ 之外的细节 |
| 表 S2 的随机化、重置扰动、终止阈值 | 引导权重、$\delta$、各部位碰撞半径 $r_b$、障碍的 SDF 怎么建 |
| 自适应采样的公式与代码 | 关键帧补全是写成代价，还是直接设成干净的元素 |
| VAE 与扩散的超参数（表 S6、S7）、OU 噪声、emphasis projection | 状态向量里根的旋转用什么表示（v1–v3 是旋转向量）、每个时刻的状态有多少维 |
| 部署硬件与时间（20 ms、TensorRT、CppAD） | 扩散与引导的代码（截至 2026-10 未公开） |
| 代码里的观测噪声、关节角重置扰动 | 论文正文都没提这两项 |

</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：Q1 和 DeepMimic / PHC / ASAP 的区别 / Q2 锚定放开了什么 / Q3 为什么增益按电机惯量算 / Q4 跟踪不加历史、扩散却要历史 / Q5 为什么要潜空间 / Q6 引导和条件生成的区别 / Q7 局限</summary>

<h3 id="q1-和-deepmimic--phc--asap-的区别">Q1：和 DeepMimic / PHC / ASAP 的区别？</h3>

[DeepMimic](../DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html) 是指数跟踪奖励的源头，但在仿真里、每段动作单独设计；PHC 在仿真里一个策略跟大量动作；ASAP 上真机，但每段动作要学自己的残差动作模型。BeyondMimic 是「同一份配方、每段一个策略、上真机不调参」，然后多一步：蒸馏成一个可引导的扩散模型，测试时零样本完成新任务。

<h3 id="q2-锚定跟踪放开了什么">Q2：锚定跟踪放开了什么、保留了什么？</h3>

放开水平位置和偏航：其他部位的目标平移到机器人脚下、转到机器人的偏航；保留高度、俯仰、横滚和相对协调。锚点自己照参考跟，它的误差进观测、进可选的全局奖励，给平衡和纠偏留一条最小的全局线索；终止只看高度和倾斜。

<h3 id="q3-为什么增益按电机惯量算">Q3：为什么 PD 增益按电机惯量算，还取 ζ = 2？</h3>

高增益把关节变成刚硬的伺服，上真机放大噪声、失去柔顺，还抹掉了动作里隐含的力矩信息。按「反射惯量 × $\omega^2$」算，相当于给每个关节同一个 10 Hz 的二阶响应；连杆子树惯量随姿态变，只算电机惯量会低估，所以取过阻尼的 $\zeta = 2$ 留余量（膝代入真实惯量只有 0.86）。动作缩放取 0.25 倍最大力矩 / $k_p$，让动作 1 对应 25% 的最大力矩。

<h3 id="q4-跟踪不加历史扩散却要-4-步历史">Q4：跟踪策略不加历史，扩散却要 4 步历史，矛盾吗？</h3>

不矛盾。跟踪策略加历史在真机上更差（图 8A）：随机化很少，历史让它记住仿真特有的规律。扩散模型做的是多步轨迹生成，需要过去的状态—潜码当上下文才能预测得稳；代价是会困在重复步态里、起止容易绊（Limitations）。

<h3 id="q5-为什么要潜空间">Q5：为什么扩散潜动作，不直接扩散动作？</h3>

PD 设定点不规则、带力矩尖峰，扩散学不稳；大网络推理慢，动作会落后于最新状态。潜空间平滑，解码器很轻、能用最新观测出动作。消融：侧手翻成功率 5% → 95%。

<h3 id="q6-引导和条件生成有什么不同">Q6：classifier guidance 和条件生成有什么不同？</h3>

条件生成要在训练时就把目标当输入、给数据打标签，组合要枚举。引导利用已经学到的无条件得分，部署时才指定可微代价 $G$，加 $-\nabla G$ 就行，多个代价可以相加；前提是代价写在模型生成的东西上 —— 所以要扩散「状态 + 潜动作」，而不只是动作。

<h3 id="q7-局限">Q7：局限？</h3>

视野 0.64 s；历史让步态卡住、起止易绊；依赖状态估计，路点与避障还用了动作捕捉；细粒度目标效果差、引导权重要轻调；扩散部分代码没公开。

</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（3 节）：A. 数字出处 / B. 旧版笔记的改正与论文内部的出入 / C. 与路线图其他论文的关联</summary>

<h3 id="a-数字出处">A. 数字出处</h3>

- 照抄 v4：正文 Results（2.5 小时、30 段 / 15 分钟、31 m/s²、20 / 7.01 / 7.75 rad/s、5 次、用户研究、12.14% / 13.65%、50 m、0.2 s）、Materials and Methods（锚定、奖励、观测、动作、随机化、自适应采样、VAE、扩散、引导）、Validation（图 8A 的文字结论、图 8B、5% / 95%）、补充材料 S1–S4 与表 S1–S8。
- 读图：图 8A、图 S2 的倍数，图 3B、图 4C 的形状。
- 官方代码：14 个目标部位、160 / 286 / 154 维、力矩上限、观测噪声、关节角重置扰动、终止的写法、核长的历史、25 Hz 版的配置、部署频率。
- 现算：$k_p$、$k_d$、$\alpha$、真实频率与阻尼比、0.062 / 0.779、半衰点、核权重、效应量、时间账、OU 的相关性、代价数值、表 S8 的段数。
- v1–v3：Body-Pos / Joint-Rot 的 100% / 72%、80% / 0%，19.95M、4 头 Transformer 解码器，表 II 的迭代数（C 罗 3k → 1.5k、燕式平衡 2.8k → 1.8k、三段长参考失败 → 8k / 9k / 10k）。

<h3 id="b-旧版笔记的改正与论文内部的出入">B. 旧版笔记的改正与论文内部的出入</h3>

旧版笔记的改正：

1. **锚定吸收偏航**：旧版说锚定只放开水平位置、偏航仍然算误差，实际 $R_\Delta$ 正是把参考转到机器人的偏航，偏航和水平位置一起被放开；偏航误差只留在锚点自己的观测和可选的全局奖励里。
2. **v1–v3 与 v4 混在一起**：旧版的 Body-Pos / Joint-Rot 消融、「扩散阶段补充 AMASS 行走数据」、路点代价里的 $P_x$ / $V_x$、均匀混合 $\lambda$ 都来自短版，而 VAE、32 维、Transformer 编码器 8 头、25 Hz 来自 v4。现在以 v4 为准，短版的数单独标出。
3. **「奖励只有 7 项、随机化只有 3 类」**：论文的三类随机化之外还有恢复系数、定期推、重置扰动；官方代码还默认开着两项全局奖励、加了观测噪声和关节角重置扰动。
4. **「7 条短序列 + 29 条 LAFAN1 长参考 sim-to-sim 全部跑通」**：v4 说的是约 2.5 小时动作全部在仿真里验证；表 S8 的 29 行 LAFAN1 里有一行重复；v1–v3 写的是「从 40 条里随机选 25 条」。
5. 旧版参考来源里 Diffuse-CLoC 的链接写成了 arXiv 2410.05272（那是一篇血癌检测的论文），应为 [2503.11801](https://arxiv.org/abs/2503.11801)。
6. 旧版动画按「6 层 × 12 $d^2$」只数注意力与前馈权重现算了一个参数量，那不是论文的数，已去掉（论文是约 19.8M）。

论文内部的出入：

1. **脚踝零位**：S1 正文说脚踝放大到 U(−0.1, 0.1) rad，表 S2 和官方代码都是所有关节 ±0.01。
2. **朝向终止**：v4 写 $\lVert e _ {R,anchor} \rVert > 0.8$ rad（含偏航），v1–v3 写「只看俯仰和横滚」，代码比的是重力投影 —— 只看倾斜。
3. **侧手翻个数**：正文说长程演示是「三个连续侧手翻」，图 6A(iii) 图注说「四个关键帧条件的侧手翻」，图上数出来也是四个（1 + 1 + 双侧手翻 2）。
4. **上真机的段数**：正文 30 段，表 S8 数出来 32 段。
5. **图 3B(iii)** 的角速度纵轴只画到 15 rad/s，正文说峰值 20 rad/s；图 3A(i) 还标了一处 12.0 m/s，正文没说是什么速度。
6. **自适应采样**：论文说平滑失败率、核长 3；代码平滑失败次数，2025-10-03 起核长默认 1。
7. **表 S3 的齿比是四舍五入后的**：照抄 3.56 / 4.5 算 5020 的总惯量是 3.619e-3，表里 3.610e-3（用 32/9 才对得上）；7520-14.3 也差约 0.2%。代码用的是表里的 Total。
8. VAE 损失的期望下标写成了 $q _ {\mathcal{E}}(z \mid [c, e _ {anchor}])$，$c$ 是短版对相位的记号，v4 正文其他地方都写 $\psi$。

<h3 id="c-与路线图其他论文的关联">C. 与路线图其他论文的关联</h3>

| 论文 | 关系 |
|---|---|
| [DeepMimic](../DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html) | 指数跟踪奖励的源头；BeyondMimic 把它写成「任务空间、均匀权重」的四项 |
| [PHC](../PHC_Perpetual_Humanoid_Control/PHC_Perpetual_Humanoid_Control.html) / [PULSE](../PULSE_Physics-based_Universal_Latent_Space/PULSE_Physics-based_Universal_Latent_Space.html) | 仿真里的大规模跟踪与潜空间；「编码参考而不是动作」的经验来自这一路 |
| [Diffusion Policy](../Diffusion_Policy/Diffusion_Policy.html) | 纯动作扩散；BeyondMimic 改成扩散「状态 + 潜动作」，才能在状态上加代价 |
| [LCP](../LCP_Sim-to-Real_Action_Smoothing/LCP_Sim-to-Real_Action_Smoothing.html) | 都在压真机抖动：LCP 罚策略的梯度，BeyondMimic 靠低阻抗 + 动作变化率罚 |
| [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html) | 被比较的「单动作专用」路线；C 罗庆祝动作来自 ASAP，图 S2 比了 ASAP 的增益 |
| Diffuse-CLoC、PDP | 同组前作：状态—动作联合扩散 + 引导、带扰动的离线蒸馏 |
| [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) | 用 BeyondMimic 当中性的跟踪器比较重定向质量 |
| [SONIC](../../03_High_Impact_Selection/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control/SONIC_Supersizing_Motion_Tracking_for_Natural_Humanoid_Control.html) | 同期大规模跟踪：一个策略 + token 接口，和 BeyondMimic 做对比 |

</details>

---

## 参考来源

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：arXiv、项目页、官方代码；直觉解释与类比属于整理者的归纳</summary>

- [arXiv:2508.08241](https://arxiv.org/abs/2508.08241)（v4 与 v1–v3）
- [项目页](https://beyondmimic.github.io/)
- [HybridRobotics/whole_body_tracking](https://github.com/HybridRobotics/whole_body_tracking)、[HybridRobotics/motion_tracking_controller](https://github.com/HybridRobotics/motion_tracking_controller)
- [Diffuse-CLoC（Huang 等，arXiv 2503.11801）](https://arxiv.org/abs/2503.11801)

文中「整理者的推测 / 统计 / 推算」与各处直觉解释属于整理者的归纳，不是论文原文。

</details>
