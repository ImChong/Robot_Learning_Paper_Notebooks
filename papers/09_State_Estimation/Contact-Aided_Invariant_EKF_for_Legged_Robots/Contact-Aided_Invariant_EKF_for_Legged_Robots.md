---
layout: paper
paper_order: 1
title: "Contact-Aided Invariant Extended Kalman Filtering for Robot State Estimation"
category: "状态估计"
zhname: "接触辅助 InEKF：面向机器人状态估计的不变扩展卡尔曼滤波"
demos: ["inekf"]
---

# Contact-Aided Invariant Extended Kalman Filtering for Robot State Estimation
**接触辅助 InEKF：面向机器人状态估计的不变扩展卡尔曼滤波**

**只用 IMU、关节编码器和接触开关估计足式机器人的朝向、速度、位置与触地点：把它们拼成一个矩阵李群 $SE _ {N+2}(3)$，误差定义成右不变误差，过程模型的线性误差方程 $A$ 和运动学观测矩阵 $H$ 就都与估计值无关；从 ±30° 的随机初值出发，Cassie 上约 0.3–0.4 s 收拢（读图），QEKF 1–2 s 后还分散。**

> 📅 阅读日期: 2026-04-21（2026-10-08 对照两版原文与官方代码重写，补十二幕动画、三个交互演示与配音视频）
>
> 🏷️ 板块: 09 State Estimation（推荐路线：BeyondMimic 之后补状态估计，再到 Berkeley Humanoid 的硬件与部署）
>
> 🧭 状态: 已对照 IJRR 扩展版 [arXiv:1904.09251](https://arxiv.org/abs/1904.09251) v2 全文（44 页）与 RSS 2018 会议版 [arXiv:1805.10410](https://arxiv.org/abs/1805.10410)（9 页），以及官方 C++ 库 [RossHartley/invariant-ekf](https://github.com/RossHartley/invariant-ekf) 的 `InEKF.cpp` / `NoiseParams.cpp` / 例子。**本笔记以扩展版为准**（[上游清单](https://github.com/YanjieZe/awesome-humanoid-robot-learning)收录的是 arXiv 2019.04 这一版），两版的关系见[「两个版本」](#两个版本是什么关系)。旧版起步笔记把会议版的标题、年份和扩展版的 arXiv 号混在一起，作者顺序也不对，还有一句「MIT Cheetah、Unitree 的估计器都以 InEKF 为基石」找不到出处，已改正，见[附录 B](#b-旧版笔记的改正)。

---

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| **arXiv** | [1904.09251](https://arxiv.org/abs/1904.09251)（v1 2019-04-19、v2 2019-11-10，44 页） |
| **PDF** | [arxiv.org/pdf/1904.09251](https://arxiv.org/pdf/1904.09251) |
| **期刊** | The International Journal of Robotics Research **39(4): 402–430**，2020（DOI [10.1177/0278364919894385](https://doi.org/10.1177/0278364919894385)） |
| **会议版** | Contact-Aided Invariant Extended Kalman Filtering for **Legged** Robot State Estimation，RSS 2018（匹兹堡）；[arXiv:1805.10410](https://arxiv.org/abs/1805.10410)，DOI [10.15607/RSS.2018.XIV.050](https://doi.org/10.15607/RSS.2018.XIV.050) |
| **作者** | Ross Hartley, Maani Ghaffari, Ryan M. Eustice, Jessy W. Grizzle（会议版顺序是 Hartley, Ghaffari Jadidi, Grizzle, Eustice） |
| **机构** | University of Michigan（Robotics Institute、College of Engineering） |
| **发布时间** | 2019-04-19 (arXiv v1), 2020-01-16 (IJRR), 2018-06 (RSS 2018) |
| **代码** | C++ 库 [RossHartley/invariant-ekf](https://github.com/RossHartley/invariant-ekf)（扩展版发布，含运动学 / 路标两类观测与例子；ROS 封装 [invariant-ekf-ros](https://github.com/RossHartley/invariant-ekf-ros)）；会议版的 MATLAB 实现 [UMich-BipedLab/Contact-Aided-Invariant-EKF](https://github.com/UMich-BipedLab/Contact-Aided-Invariant-EKF) |
| **视频** | [长距离里程计](https://youtu.be/jRUltB_dMlo)、[激光建图 1](https://youtu.be/pNyXsZ5zVZk)、[激光建图 2](https://youtu.be/nbQTQw0gJ-k) |
| **机器人** | Cassie（Agility Robotics）：20 自由度、10 个电机、4 根弹簧；IMU（VectorNav VN-100）800 Hz，14 个编码器 2000 Hz |

---

## 🎯 一句话总结

足式机器人要知道自己的朝向和速度才能走稳，相机怕光照与环境变化，所以最底层的估计器只用本体传感器：IMU 积分做预测，触地点假设不动，正运动学测出「脚相对身体」做校正。这套拆法来自 Bloesch 等人的四元数 EKF（QEKF），但 EKF 在**当前估计值**处线性化，估计偏得远时线性化本身就错。这篇把朝向、速度、位置和所有触地点拼成一个矩阵李群 $SE _ {N+2}(3)$，用 Barrau 与 Bonnabel 的**不变 EKF**：IMU + 接触的动力学满足「群仿射」，右不变误差满足**精确的**对数线性方程，$A$ 只含重力；正运动学正好是右不变观测，$H = [0, 0, -I, I]$ 也是常数。于是收敛域与轨迹无关、不可观方向（航向 + 3 个位置）和真实系统一致；加上 IMU 零偏后理论保证不再完整成立（「不完美的 InEKF」），但 Cassie 实验里仍比 QEKF 收敛得快。

> 🎮 **本文内嵌 1 段讲解动画 + 1 段配音视频 + 3 个交互演示**（不用装任何东西）：
> 1. [十二幕动画：接触辅助 InEKF 全流程](#inekf-explainer-anim) —— 约 204 秒串完「为什么要状态估计 → IMU 推、脚踩住、运动学校正 → 线性化点选错会怎样 → 一个矩阵装下全部状态 → 误差不看轨迹（图 4）→ 运动学校正：H 是常数 → 看不见的方向 → 不确定性长成香蕉（图 6、7）→ IMU 零偏 → 增删接触点 → 收敛（图 3、8）→ Cassie 实测（图 9–12）」
> 2. [配音讲解视频](#inekf-video) —— 同样十二幕，加中文配音与字幕，10 分 6 秒竖屏，可下载
> 3. [线性化误差方程准不准](#inekf-linearize) —— 第 6.3 节（图 4、5）的实验在浏览器里重跑：初始朝向误差放大，InEKF 的线性误差一直精确，QEKF 越错越多
> 4. [从差的初值收敛](#inekf-converge) —— 二维行走玩具里，InEKF 与普通 EKF 从随机初值收敛，拖初始误差的范围看差别（对应图 3、图 8 的做法）
> 5. [不确定性的形状](#inekf-banana) —— 图 6、7：航向不确定时真分布弯成香蕉，InEKF 跟得上，QEKF 的椭圆套不住

> 🚶 [具体实例](#实例-环境设定)手算状态维度、一次预测、站立例子里 InEKF 与 QEKF 的线性化、一次运动学校正、可观性矩阵的秩、香蕉的弯度、新触地点的初始化、实验对账和二维玩具的收敛时刻；动画、三个演示和这一节用的是同一组数。[源码对照](#源码对照)把官方 C++ 库的 `Propagate()`、`Correct()`、`CorrectKinematics()` 逐段对上论文。

---

## 🔤 英文缩写速查

| 缩写 | 全称 | 在这篇论文里指什么 |
|------|------|-------------------|
| **EKF** | Extended Kalman Filter | 扩展卡尔曼滤波：在当前估计值处线性化，再套卡尔曼滤波 |
| **InEKF** | Invariant EKF | 不变 EKF：误差定义在李群上、对群作用不变；论文用这个缩写和迭代 EKF（IEKF）区分 |
| **RIEKF / RI-EKF** | Right-Invariant EKF | 用右不变误差 $\eta = \bar X X^{-1}$ 的 InEKF（本文的主角） |
| **QEKF** | Quaternion-based EKF | 四元数 EKF（也叫 MEKF、乘性 EKF）：朝向误差用 3 维旋转向量，其余误差逐项相减；对照基线，类似 Bloesch 等 2013、Rotella 等 2014 |
| **ErEKF** | Error-state EKF | 误差状态 EKF：滤波的变量是误差而不是状态本身 |
| **IMU** | Inertial Measurement Unit | 惯性测量单元：测机身系角速度 $\tilde\omega$ 与比力（加速度）$\tilde a$ |
| **FK** | Forward Kinematics | 正运动学：由关节角 $\alpha$ 算脚相对身体的位置 $h _ p(\alpha)$ |
| **$SE _ {N+2}(3)$** | Extended Special Euclidean group | 朝向 + 速度 + 位置 + $N$ 个触地点拼成的矩阵李群（比 $SE(3)$ 多 $N+1$ 列平移） |
| **OC-EKF** | Observability-Constrained EKF | 可观性约束 EKF（Huang 等 2010）：人为修正 EKF 的雅可比，免得它把不可观方向当成可观 |
| **SLAM** | Simultaneous Localization and Mapping | 同时定位与建图；第 12 节指出触地点和路标在这个框架里是一回事 |

---

## 🧭 两个版本是什么关系 {#两个版本是什么关系}

发布清单里写的「Contact-Aided InEKF（2018 / 2019）」是同一项工作的两版，内容是包含关系：

| | RSS 2018 会议版 | IJRR 2020 扩展版（本笔记） |
|---|---|---|
| 标题 | …for **Legged** Robot State Estimation | …for Robot State Estimation |
| arXiv | [1805.10410](https://arxiv.org/abs/1805.10410)（2018-05-26，9 页） | [1904.09251](https://arxiv.org/abs/1904.09251)（v1 2019-04-19、v2 2019-11-10，44 页） |
| 发表 | Robotics: Science and Systems XIV，2018-06 | IJRR 39(4): 402–430，2020（在线 2020-01-16） |
| 作者顺序 | Hartley, Ghaffari Jadidi, Grizzle, Eustice | Hartley, Ghaffari, Eustice, Grizzle |
| 理论 | 右不变 EKF、可观性、零偏增广、增删触地点 | 同左，另加第 4 节朝向的入门例子、第 10 节左不变写法与左右互换、第 11 节机器人中心的估计器、第 12 节更多观测与 SLAM 的关系、附录 A 的解析离散化、附录 C 的误差换算 |
| 实验 | 仿真 100 次收敛对比（图 2）、Cassie 真机 100 次（图 3） | 同左（图 3、8），另加线性化精度（图 4、5）、协方差形状（图 6、7）、动捕（图 9、10）、约 200 m 长距离里程计（图 11）、激光建图（图 12） |
| 代码 | MATLAB（UMich-BipedLab） | C++ 库 invariant-ekf |

两版共有的数字（表 1 的噪声、±30° / ±1 m/s、100 次、0.3 m/s、800 / 2000 Hz）完全相同；扩展版里少数写法改了（运动学雅可比从「几何雅可比的线速度部分」$J _ v$ 改成「解析雅可比」$J _ p$，协方差更新从 $(I-KH)P$ 改成 Joseph 形式，表 1 零偏噪声的单位从 m/s²、rad/s 改成 m/s³、rad/s²），见[附录 C](#c-论文内部与两版之间的出入)。day6 课程引用的是会议版；本仓库的视频片头写「2018 年发表在 RSS，扩展版 2020 年发表在 IJRR」。

---

## 🎬 十二幕动画：接触辅助 InEKF 全流程 {#inekf-explainer-anim}

<div class="paper-demo" data-demo="inekf-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

## 📺 配音讲解视频（可下载） {#inekf-video}

<div class="paper-demo" data-demo="inekf-video" data-src="media/inekf_explainer_video.mp4" data-poster="media/inekf_explainer_video_poster.jpg"><p class="demo-fallback">（本节含讲解视频播放器，需要启用 JavaScript；也可以直接<a href="media/inekf_explainer_video.mp4" download="InEKF_讲解视频.mp4">下载 mp4（11.1 MB）</a>）</p></div>

> 📖 **动画之后的正文默认全部折叠**：问题、方法按小节收起，具体实例、实验、边界、源码对照、面试和附录各收成一块。想细读哪一块就点开，内容一字未删；三个交互演示和流程图留在外面。目录里的标题可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」。

---

## ❓ 这篇论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：只用本体传感器估计姿态和速度；EKF 只是局部稳定；InEKF 换误差的定义</summary>

**要估什么**（引言、第 2.2 节）：关节角有编码器直接量，身体（IMU）在世界里的朝向 $R$、速度 $v$、位置 $p$ 没有传感器能直接读，可反馈控制器和规划器都要用。视觉里程计会受光照和环境变化影响，所以论文要的是一个**只用本体传感器**（IMU、关节编码器、接触）的底层估计器，高频、稳。

**已有的办法**（第 2 节）：

| 办法 | 做法 | 问题 |
|---|---|---|
| 运动学航位推算 | 假设支撑脚不动，由编码器推身体的位姿和速度 | 编码器噪声、建模误差、打滑让速度很噪、位置和朝向漂得厉害 |
| 带动力学模型的 EKF | 写出机器人的动力学当过程模型 | 模型复杂、强非线性、平台专用 |
| 捷联式误差状态 EKF（Bloesch 等 2012/2013） | IMU 积分当过程模型，把触地点放进状态，正运动学做校正 | 本文的直接前作；它是 EKF，在估计值处线性化 |

**EKF 的毛病**（第 2.1 节）：EKF 在当前估计值处线性化，最多只是**局部**稳定的观测器——证明依赖非线性项的 Lipschitz 界，「系统越非线性，EKF 可能越差」；初值差时可能发散；还可能把**不可观的状态当成可观**（Huang 等的 OC-EKF 能缓解，但不能根治）。误差状态 EKF 的误差方程虽然是误差的线性函数，系数却仍然含估计值。

**本文的做法**：沿用 Bloesch 的传感器和模型，只把误差换成**不变误差**（Barrau & Bonnabel，IEEE TAC 2017，[本仓库笔记](../The_Invariant_Extended_Kalman_Filter_as_a_Stable_Observer/The_Invariant_Extended_Kalman_Filter_as_a_Stable_Observer.html)）：证明 IMU + 接触的系统是「群仿射」的，误差方程精确地对数线性，正运动学是右不变观测。扩展版列的 7 条贡献：连续时间右不变 EKF 与可观性分析、零偏增广、仿真与 Cassie 实验、左不变写法、它和「世界中心 / 机器人中心」的对应、解析离散化、开源 C++ 库。

> 💡 **类比（整理者的）**：EKF 像拿着一张局部地图找路——你以为自己在哪，就按那里的地形去估计下一步；你一开始就站错了地方，看的就是错的那块地图。InEKF 换了一种「记录偏差」的方式：偏差本身怎么变，和你站在哪无关，所以站错了也不会被带进沟里。
</details>

---

## 🔧 InEKF 是怎么做的？

### 1. 状态是一个矩阵李群（第 3、5.1 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：SE_{N+2}(3) 的矩阵、李代数与伴随；左 / 右不变误差的定义</summary>

$N$ 个触地点时，状态写成 $(N+5)\times(N+5)$ 的矩阵（世界系下的 IMU 朝向、速度、位置与触地点）：

$$
X _ t = \begin{bmatrix} R _ t & v _ t & p _ t & d _ {1,t} & \cdots & d _ {N,t} \\ 0 _ {1,3} & 1 & 0 & 0 & \cdots & 0 \\ \vdots & & \ddots & & & \vdots \\ 0 _ {1,3} & 0 & 0 & 0 & \cdots & 1 \end{bmatrix} \in SE _ {N+2}(3)
$$

这类矩阵相乘、求逆还是这类矩阵，构成矩阵李群；李代数是 $N+5$ 阶方阵，用「帽子」$(\cdot)^\wedge: \mathbb{R}^{3N+9} \to \mathfrak{g}$ 把误差向量 $\xi = (\xi^R, \xi^v, \xi^p, \xi^{d _ 1}, \dots)$ 放进去，指数映射 $\exp(\xi) = \mathrm{expm}(\xi^\wedge)$ 有闭式（附录 B）。伴随矩阵（式 7）是

$$
\mathrm{Ad} _ {X} = \begin{bmatrix} R & 0 & 0 & 0 \\ (v) _ \times R & R & 0 & 0 \\ (p) _ \times R & 0 & R & 0 \\ (d) _ \times R & 0 & 0 & R \end{bmatrix}.
$$

**不变误差**（定义 1）：右不变 $\eta^r _ t = \bar X _ t X _ t^{-1}$，左不变 $\eta^l _ t = X _ t^{-1}\bar X _ t$。右不变误差在世界系里量——它是把真值整体「转一下、平移一下」变成估计值的那个变换；左不变误差在机身系里量。写开（单个触地点）：$\eta^r$ 的各块是 $\bar R R^\top$、$\bar v - \bar R R^\top v$、$\bar p - \bar R R^\top p$、$\bar d - \bar R R^\top d$。和 QEKF 逐项相减的误差（式 21：$\exp(\delta\theta) = R^\top \bar R$、$\delta v = v - \bar v$……）比，**朝向误差和平移误差绑在一起**。
</details>

### 2. 过程模型：群仿射与对数线性（第 3、5.2 节；定理 1、2） {#inekf-linearize}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：IMU + 接触的动力学、为什么误差方程与轨迹无关、A 只含重力</summary>

**测量模型**：IMU 读数带高斯白噪声 $\tilde\omega = \omega + w^g$、$\tilde a = a + w^a$；接触传感器说「着地」时，假设触地点在世界里不动，为了容许打滑，把它的速度看成白噪声 $w^v$。于是（式 8）

$$
\dot R = R(\tilde\omega - w^g) _ \times,\quad \dot v = R(\tilde a - w^a) + g,\quad \dot p = v,\quad \dot d = R\,h _ R(\tilde\alpha)(-w^v),
$$

$h _ R(\tilde\alpha)$ 是由编码器和正运动学算出的接触坐标系相对 IMU 的朝向。写成矩阵是 $\tfrac{d}{dt}X = f _ {u _ t}(X) - X w^\wedge$。

**定理 1（误差自治）**：若 $f _ u(X _ 1X _ 2) = f _ u(X _ 1)X _ 2 + X _ 1 f _ u(X _ 2) - X _ 1 f _ u(I _ d) X _ 2$（「群仿射」），左 / 右不变误差的演化**和轨迹无关**。上面的确定性动力学满足这条。**定理 2（对数线性）**：定义 $g _ u(\exp\xi) = (A _ t\xi)^\wedge + O(\lVert\xi\rVert^2)$，则 $\dot\xi = A _ t\xi$ 的解经 $\exp$ 后**精确**等于非线性的误差 $\eta _ t$，不是一阶近似——误差从多远出发都一样。

对这个系统（式 12、14）：

$$
A = \begin{bmatrix} 0 & 0 & 0 & 0 \\ (g) _ \times & 0 & 0 & 0 \\ 0 & I & 0 & 0 \\ 0 & 0 & 0 & 0 \end{bmatrix},\qquad \bar Q _ t = \mathrm{Ad} _ {\bar X _ t}\,\mathrm{Cov}(w _ t)\,\mathrm{Ad} _ {\bar X _ t}^\top .
$$

$A$ 是常数，**只含重力**；估计值只出现在噪声的映射 $\bar Q$ 里。预测步：状态按确定性动力学积分，协方差按 Riccati 方程 $\dot P = AP + PA^\top + \bar Q$。有噪声时定理 2 不再精确（扩展版脚注 4），但线性化仍对初值误差不敏感（图 5）。

**第 4 节的入门例子**：只估朝向时，若用欧拉角，误差方程 $\tfrac{d}{dt}\delta q \approx A(\tilde\omega, \bar q)\,\delta q$ 含着估计的横滚、俯仰（矩阵只依赖 $\bar q_x$、$\bar q_y$）；改用旋转矩阵、误差 $\eta = R^\top\bar R$，方程变成 $\dot\xi = -(\tilde\omega) _ \times\xi$——估计值不见了，而且可以验证 $\eta _ t = R _ t^\top\eta _ 0 R _ t$、$\xi _ t = R _ t^\top\xi _ 0$ 是精确解。QEKF 在朝向这一块已经用了这件事，InEKF 把它推广到整个状态。
</details>

<div class="paper-demo" data-demo="inekf-linearize"><p class="demo-fallback">（本节含交互演示：第 6.3 节的线性化精度实验重跑，需要启用 JavaScript）</p></div>

### 3. 运动学校正：右不变观测，H 是常数（第 5.3 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Y = X⁻¹b + V、新息只依赖不变误差、更新公式与 Joseph 形式</summary>

编码器 $\tilde\alpha = \alpha + w^\alpha$，正运动学给出脚相对身体的位置 $h _ p(\tilde\alpha) \approx R^\top(d - p) + J _ p(\tilde\alpha)w^\alpha$（式 16–17）。写成矩阵正好是**右不变观测** $Y _ t = X _ t^{-1}b + V _ t$，其中 $Y^\top = [h _ p^\top, 0, 1, -1]$、$b^\top = [0 _ {1,3}, 0, 1, -1]$。于是新息只依赖不变误差，更新为（式 18–20）

$$
\bar X^+ = \exp\!\big(K\,\Pi\,\bar X Y\big)\,\bar X,\qquad H = \begin{bmatrix} 0 & 0 & -I & I \end{bmatrix},\qquad \bar N = \bar R\,J _ p\,\mathrm{Cov}(w^\alpha)\,J _ p^\top\bar R^\top,
$$

$\Pi = [I, 0 _ {3,3}]$ 只取前三行；$S = HPH^\top + \bar N$、$K = PH^\top S^{-1}$；协方差在扩展版用 Joseph 形式 $P^+ = (I-KH)P(I-KH)^\top + K\bar N K^\top$（会议版写的是 $(I-KH)P$）。**$H$ 是常数**；QEKF 的观测矩阵是 $[(\bar R^\top(\bar d - \bar p)) _ \times,\ 0,\ -\bar R^\top,\ \bar R^\top]$，含估计值（第 6.1 节）。

**左还是右**（第 10、11 节）：运动学在世界中心的写法里是右不变观测，所以用右不变误差；GPS 这类测量是左不变观测，用左不变误差更合适。两种误差之间精确地互换：$\xi^r = \mathrm{Ad} _ {\bar X}\xi^l$、$P^r = \mathrm{Ad} _ {\bar X}P^l\mathrm{Ad} _ {\bar X}^\top$（式 36）——收到右不变观测时，把左不变协方差临时换成右不变的、更新完再换回去。若改成**机器人中心**的估计器（状态取逆，直接估机身系下的速度，控制器更爱用），运动学变成左不变观测，左右误差方程正好对调（式 42）。
</details>

### 4. 可观性：航向和绝对位置看不见（第 5.4 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：线性可观性矩阵、4 个不可观方向、为什么 InEKF 不会「假装看见」</summary>

误差方程是对数线性的，所以不用做非线性可观性分析，直接看离散线性系统：$A$ 是常数且幂零（$A^3 = 0$），

$$
\Phi = e^{A\Delta t} = \begin{bmatrix} I & 0 & 0 & 0 \\ (g) _ \times\Delta t & I & 0 & 0 \\ \tfrac12 (g) _ \times\Delta t^2 & I\Delta t & I & 0 \\ 0 & 0 & 0 & I \end{bmatrix},
\qquad
\mathcal{O} = \begin{bmatrix} H \\ H\Phi \\ H\Phi^2 \\ \vdots \end{bmatrix} = \begin{bmatrix} 0 & 0 & -I & I \\ -\tfrac12 (g) _ \times\Delta t^2 & -I\Delta t & -I & I \\ -2(g) _ \times\Delta t^2 & -2I\Delta t & -I & I \\ \vdots \end{bmatrix}.
$$

最后两大列只差符号——整体平移看不见（3 维）；$g$ 只有 $z$ 分量，$(g) _ \times$ 的第 3 列全是 0——绕重力方向的旋转（航向）看不见（1 维）。这和 Bloesch 等的非线性可观性结论一致，但算起来省事得多。更要紧的是：误差方程不依赖估计值，**线性化不会把可观性矩阵的秩虚增**；EKF 在每一步的估计值处求雅可比，各时刻的零空间对不齐，航向会被「假装看见」，协方差过度自信——以前要靠 OC-EKF 专门修，InEKF 天生没这个问题。（第 7 步用一个 12 维小例子把这件事算了一遍。）
</details>

### 5. 不确定性的形状：李代数里的高斯（第 6.4 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：QEKF 的高斯在位置上，InEKF 的高斯在李代数里；香蕉与圆环</summary>

两种滤波器都假设误差是零均值高斯，但放在不同的空间里：QEKF 的位置误差是 $p = \bar p + \delta p$，位置分布只能是以 $\bar p$ 为中心的椭圆；InEKF 是 $X = \exp(\xi)\bar X$，$\xi$ 是高斯，经指数映射与矩阵乘法后朝向和位置耦合在一起，叫「李群上的集中高斯」。论文的仿真：Cassie 以平均 1 m/s 走 8 s，初始位置每轴标准差 0.1 m、航向标准差 10°，用 1 万个粒子代表真分布。真分布因为航向不可观而越走越弯（图 6），InEKF 的样本也弯得过来，QEKF 只能是直的椭圆。航向标准差设成 360°（完全不知道朝哪），InEKF 画出一圈圈圆环（图 7）——这是高斯椭圆根本表示不了的。论文还提到：协方差秩亏（某些状态的协方差为 0）时，InEKF 会让估计一直留在群的一个子集里（等式约束的 EKF，Chauchat 等、Barrau & Bonnabel）。
</details>

<div class="paper-demo" data-demo="inekf-banana"><p class="demo-fallback">（本节含交互演示：图 6、7 的位置分布，需要启用 JavaScript）</p></div>

### 6. IMU 零偏：「不完美的 InEKF」（第 7 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：零偏放在群外、A 多出两列且含估计值、表 1 的数</summary>

真 IMU 有缓慢漂移的零偏：$\tilde\omega = \omega + b^g + w^g$、$\tilde a = a + b^a + w^a$，零偏建模成随机游走 $\dot b^g = w^{bg}$、$\dot b^a = w^{ba}$。Barrau 的博士论文指出：**没有哪个李群既包含零偏、又让动力学满足群仿射**。于是状态成了元组 $(X _ t, \theta _ t) \in G\times\mathbb{R}^6$，$\theta = (b^g, b^a)$，误差是 $(\bar X X^{-1},\ \bar\theta - \theta)$。线性化后（式 27–28）

$$
A _ t = \begin{bmatrix} 0 & 0 & 0 & 0 & -\bar R _ t & 0 \\ (g) _ \times & 0 & 0 & 0 & -(\bar v _ t) _ \times\bar R _ t & -\bar R _ t \\ 0 & I & 0 & 0 & -(\bar p _ t) _ \times\bar R _ t & 0 \\ 0 & 0 & 0 & 0 & -(\bar d _ t) _ \times\bar R _ t & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 \\ 0 & 0 & 0 & 0 & 0 & 0 \end{bmatrix},
$$

零偏那两列含估计值（右上角那块和伴随矩阵有关：把机身系的零偏误差搬到世界系）。没有零偏误差时这些项乘 0，所以误差方程只「通过零偏误差」依赖估计轨迹。很多理论性质因此不再成立，论文称之为「不完美的 InEKF」，但实验里它仍比 QEKF 好（图 8）。运动学观测不含零偏，$H$ 补两个 0 块即可。表 1：初始零偏标准差陀螺 0.005 rad/s、加速度计 0.05 m/s²；零偏噪声 0.001 rad/s²、0.001 m/s³；零偏的初值用机器人静止时的 IMU 数据估一个。
</details>

### 7. 增删触地点（第 8 节）与和 SLAM 的关系（第 12 节）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：抬脚 = 边缘化；落脚 = 正运动学初始化 + 协方差增广；触地点就是路标</summary>

**抬脚**：把这只脚对应的那一行一列从 $X$ 里删掉，协方差删掉对应的 3 行 3 列——边缘化，线性映射 $P^{\text{new}} = M P M^\top$，$M$ 与左右误差无关。**落脚**：均值用正运动学初始化 $\bar d = \bar p + \bar R\,h _ p(\tilde\alpha)$（式 31）；右不变误差下 $\xi^d \approx \xi^p + \bar R J _ p w^\alpha$，所以协方差增广是 $P^{\text{new}} = FPF^\top + G\,\mathrm{Cov}(w^\alpha)G^\top$，$F$ 把位置那几行抄一份给新触地点、$G$ 的新块是 $\bar R J _ p$（式 32）；左不变误差下 $F$ 多一项 $-(h _ p) _ \times$（式 38）。Cassie 每条腿两根弹簧，弹簧形变用编码器量、过阈值就算着地。

**和路标 SLAM**：把触地点换成路标位置，矩阵结构一模一样；正运动学就是「测路标相对机器人在哪」。差别是触地点的速度当白噪声（容许打滑），测量频率高（Cassie 上 2000 Hz），而且没有数据关联问题。路标也能放进同一个矩阵；第 12 节说触地点与路标组合起来「有可能」做出没有不可观状态的观测器——前提是有**已知位置**的路标（表 2 的绝对路标观测，$H$ 里含 $(l)_\times$），只有相对观测的路标和触地点一样，仍留着位置与航向 4 个不可观方向；代价是维数随路标增长（和 EKF-SLAM 一样）。官方 C++ 库同时支持两类观测。
</details>

### 📊 一个滤波周期

<div class="mermaid">
flowchart TB
    IMU["IMU 800 Hz：ω̃、ã"] --> P["预测：R̄、v̄、p̄ 捷联积分<br/>P ← ΦPΦᵀ + Q̄（A 只含重力）"]
    C["接触开关：弹簧形变过阈值"] --> S{"这只脚的状态变了？"}
    S -->|"抬起"| M["边缘化：删掉 d 那一列与 3 行 3 列"]
    S -->|"落下"| A["增广：d̄ = p̄ + R̄ h_p(α̃)，协方差抄 p 那几行再加运动学噪声"]
    S -->|"一直踩着"| K["校正：Y = X⁻¹b + V，H = [0, 0, −I, I]<br/>X̄ ← exp(KΠX̄Y) X̄，Joseph 形式更新 P"]
    E["编码器 2000 Hz → 正运动学 h_p"] --> A
    E --> K
    P --> S
    M --> P
    A --> P
    K --> P
</div>

---

## 🚶 具体实例：把论文里的几个机制手算一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（12 节）：环境设定 / 维度对账 / 一次预测 / InEKF 的线性误差 / QEKF 的线性误差 / 图 4 重跑 / 一次校正 / 可观性的秩 / 香蕉的弯度 / 新触地点 / 实验对账 / 二维玩具的收敛 / 代码与表 1 的噪声</summary>

<h3 id="实例-环境设定">环境设定</h3>

和官方代码一样取 $g = (0, 0, -9.81)$ m/s²。第 2–4 步的「站立例子」：真值是 Cassie 站着不动（$R = I$、$v = p = 0$，IMU 读到 $\tilde\omega = 0$、$\tilde a = (0, 0, 9.81)$），滤波器的初始估计除了俯仰错了 $\theta$（$\bar R = R _ y(\theta)$）之外都对，不做校正、只预测 1 秒——这是在论文的式子上手算，不是论文的实验。第 6 步的一次校正用对角协方差，只为看清 $H$ 怎么分账。第 11 步的二维玩具是浏览器演示里那个模型。

<h3 id="实例-第-1-步维度对账">第 1 步：维度对账</h3>

| 情形 | $X$ 的大小 | 误差 $\xi$ 的维数 | 协方差 $P$ |
|---|---|---|---|
| 不估零偏、单脚着地 | 6 × 6 | $3\cdot1+9 = 12$ | 12 × 12 |
| 不估零偏、双脚着地 | 7 × 7 | $3\cdot2+9 = 15$ | 15 × 15 |
| 估零偏、双脚着地（Cassie 实验） | 7 × 7（零偏在群外） | 15 + 6 = **21** | 21 × 21 |

代码里 `dimP = 3·dimX − 6 + dimTheta`：双脚 $3\cdot7-6 = 15$，再加 `dimTheta = 6`。

<h3 id="实例-第-2-步一次预测">第 2 步：一次预测（代码 `Propagate()`）</h3>

站立例子里 $\theta = 0.1$ rad：$\bar R\tilde a + g = (9.81\sin0.1,\ 0,\ 9.81\cos0.1 - 9.81) = (0.9794,\ 0,\ -0.0490)$ m/s²——一个 **0.98 m/s² 的「假加速度」**。IMU 800 Hz，一步 $\Delta t = 1/800$ s，速度估计每步多出 0.0012 m/s；积分 1 秒：$\bar v = \mathbf{(0.9794,\ 0,\ -0.0490)}$ m/s，$\bar p = \tfrac12(\bar R\tilde a + g) = (0.4897,\ 0,\ -0.0245)$ m。

<h3 id="实例-第-3-步inekf-的线性误差">第 3 步：InEKF 的线性误差——过一次指数映射就一位不差</h3>

初始右不变误差 $\xi^R _ 0 = (0, 0.1, 0)$，其余为 0。按 $\dot\xi = A\xi$ 传 1 秒：$\xi^v = (g) _ \times\xi^R\cdot1 = g\times\xi^R = \mathbf{(0.981,\ 0,\ 0)}$，$\xi^p = \tfrac12 g\times\xi^R = \mathbf{(0.4905,\ 0,\ 0)}$。注意这是**李代数里的**误差；回到群上要乘左雅可比 $\Gamma _ 1(\xi^R) = I + \tfrac{1-\cos\theta}{\theta^2}(\xi^R) _ \times + \tfrac{\theta-\sin\theta}{\theta^3}(\xi^R) _ \times^2$：

$$
\begin{aligned}
\Gamma _ 1(\xi^R)\,\xi^v &= (0.981,0,0) + 0.49958\,(0,0,-0.0981) + 0.16658\,(-0.00981,0,0) \\
&= (0.9794,\ 0,\ -0.0490),
\end{aligned}
$$

和第 2 步滤波器自己积分出来的 $\bar v - \bar R R^\top v = \bar v$ **完全相同**（位置同理得 $(0.4897, 0, -0.0245)$）。这就是定理 2：线性方程不是近似。动画第 5 幕、第 5 幕之后的演示用的是这组数。

<h3 id="实例-第-4-步qekf-的线性误差">第 4 步：QEKF 的线性误差——估计越偏错得越多</h3>

QEKF 的误差 $\delta v = v - \bar v$，按式 (21) 的定义 $\exp(\delta\theta) = R^\top\bar R$ 推出 $\tfrac{d}{dt}\delta v = \bar R\,(\tilde a) _ \times\,\delta\theta$——系数里有估计值 $\bar R$。

| 俯仰估错 | 真实的 $v - \bar v$ | QEKF 的线性预测 | 差 |
|---|---|---|---|
| 0.1 rad | $(-0.9794,\ 0,\ 0.0490)$ | $(-0.9761,\ 0,\ 0.0979)$ | 竖直分量**多算一倍** |
| 0.5 rad | $(-4.7032,\ 0,\ 1.2009)$ | $(-4.3045,\ 0,\ 2.3516)$ | 水平差 0.40、竖直差 1.15 |

协方差是按这个线性方程传的，所以估计偏得越远，QEKF 的协方差越不可信。

<h3 id="实例-第-5-步图-4-重跑">第 5 步：图 4 在浏览器里重跑</h3>

[上面的演示](#inekf-linearize)按第 6.3 节的做法：真值从单位元出发，初始朝向误差 $s\cdot(\pi/2, \pi/2, \pi/2)$，两者吃同一串随机 IMU 读数（我们自取 $\omega\sim\mathcal{N}(0,1)$、$\tilde a\sim(0,0,9.81)+\mathcal{N}(0,1)$，论文没给）传 1000 步。默认种子下 $s = 1$ 时 QEKF 的「线性预测 − 真实误差」范数约 **27.3**（论文图 4 读图约 25），$s = 0.5$ 时约 8.0；InEKF 是 **$2\times10^{-13}$** 量级的浮点误差。给估计值的读数加噪声后，InEKF 也有了约 0.035 的差，QEKF 仍约 27（图 5 的走势）。

<h3 id="实例-第-6-步一次校正">第 6 步：一次运动学校正（$H$ 怎么分账）</h3>

估计 $\bar R = I$、$\bar p = (0.30, 0, 0.90)$、$\bar d = (0.40, -0.13, 0)$，腿测出 $h _ p = (0.12, -0.13, -0.88)$——比估计的脚靠前 2 cm、高 2 cm。新息（世界系）$z = \Pi\bar X Y = \bar R h _ p + \bar p - \bar d = (0.02,\ 0,\ 0.02)$。取对角协方差 $\sigma _ p = \sigma _ d = 0.1$ m、运动学噪声 0.01 m（演示用）：$S = 0.01 + 0.01 + 0.0001 = 0.0201$，

$$
K _ p = -\tfrac{0.01}{0.0201} = -0.4975,\qquad K _ d = +0.4975,
$$

于是身体挪 $\delta p = -0.4975z = (-0.995, 0, -0.995)$ cm、脚挪 $+0.995$ cm（每轴），新的 $\bar d - \bar p = (0.1199, -0.13, -0.8801)$，和测量只差 0.1 mm——缺口合上了。$H = [0, 0, -I, I]$ 和这组估计值无关；QEKF 在这里的 $H$ 要用 $(\bar R^\top(\bar d - \bar p)) _ \times = ((0.10, -0.13, -0.90)) _ \times$。

<h3 id="实例-第-7-步可观性的秩">第 7 步：可观性矩阵的秩</h3>

取 $\Delta t = 0.01$ s、堆 20 块 $H\Phi^k$：单脚（12 列）秩 **8**，双脚（15 列）秩 **11**——不可观的都是 4 维（3 个平移 + 航向），旋转那块第 3 列的范数是 0。我们再拿 QEKF 的雅可比做了个对照：估计的朝向、位置、触地点每步带一点抖动（像真的滤波器那样），各步在各自的估计值处求 $A$、$H$，堆出来的 12 列矩阵秩是 **9**——只剩 3 个不可观方向，航向被「看见」了。这是我们自己算的小例子，不是论文的数，但正是第 5.4 节说的「线性化虚增可观性矩阵的秩」。

<h3 id="实例-第-8-步香蕉的弯度">第 8 步：香蕉的弯度（图 6、7）</h3>

走 8 m、航向偏 $\psi$：侧向偏 $8\sin\psi$，往回弯 $8(1-\cos\psi)$。$\psi = 10°$（1σ）：侧向 **1.39 m**、回弯 0.12 m；$\psi = 20°$（2σ）：侧向 2.74 m、回弯 **0.48 m**；$30°$（3σ）：4.0 m、1.07 m——和图 6 绿色那一团的两端（$y\approx\pm4$、$x\approx7.5$，读图）对得上。QEKF 的一阶线性化给的是以 $(8, 0)$ 为中心、侧向标准差 $\sqrt{0.1^2 + 8^2\cdot0.1745^2} = 1.40$ m 的直椭圆；用 200 万个真样本算，落在这个椭圆的 2σ 范围里的只有 **70.0%**（高斯本该是 86.5%），航向 20° 时只剩 44%。航向标准差 360° 时，真分布与 InEKF 都是半径 2、4、6、8 m 的圆环。

<h3 id="实例-第-9-步新触地点">第 9 步：新触地点的初始化</h3>

沿用第 6 步的 $\bar p$ 与 $h _ p$：$\bar d = \bar p + \bar R h _ p = \mathbf{(0.42,\ -0.13,\ 0.02)}$。右不变误差下 $\xi^d = \xi^p + \bar R J _ p w^\alpha$：位置标准差 0.1 m、运动学噪声 0.01 m 时，新触地点的标准差 $\sqrt{0.1^2 + 0.01^2} \approx \mathbf{0.1005}$ m，并且和身体位置**完全相关**（协方差的交叉块就是 $P _ {pp}$）——代码里 `F` 把位置那三行抄过来、`G` 的新块是 $\bar R$。

<h3 id="实例-第-10-步实验对账">第 10 步：实验对账</h3>

| 项目 | 论文的数 | 现算 |
|---|---|---|
| IMU / 编码器 | 800 Hz / 2000 Hz | 一个 IMU 周期里 2.5 次运动学测量 |
| 滤波器速度 | > 2000 Hz（第 2.2 节） | 每次更新 < 0.5 ms |
| 收敛对比 | 100 次，欧拉角 ±30°、速度 ±1 m/s | InEKF 约 0.3 s（仿真）/ 0.4 s（真机）收拢，读图 |
| 动捕 | 18 台相机，60 s，约 15 m，终点误差 < 5% | < 0.75 m；平均约 0.25 m/s |
| 长距离 | 约 200 m，7 分 45 秒 | 465 s，平均约 0.43 m/s |
| 激光建图 | VLP-32C 10 Hz，叠 10 s 点云 | 一帧扫描里有 80 个 IMU 样本可做运动补偿 |

<h3 id="实例-第-11-步二维玩具的收敛">第 11 步：二维玩具的收敛（演示的数）</h3>

[收敛演示](#inekf-converge)是矢状面里的二维版本（俯仰 + 二维速度 / 位置 + 一个触地点，误差 7 维，每 0.5 s 换脚），两种滤波器的预测、换脚、校正一一对应，只差误差的定义。「收敛时刻」= 此后俯仰误差一直在 ±2° 以内。同一批 40 组随机初值（种子 7），初始速度误差 ±1 m/s：

| 初始俯仰误差 | EKF 收敛时刻中位数 | InEKF 收敛时刻中位数 | 2 s 内没收敛（EKF / InEKF） | 1 s 时平均 \|俯仰误差\|（EKF / InEKF） |
|---|---|---|---|---|
| ±30° | 0.98 s | **0.47 s** | 0 / 0 | 2.16° / 0.21° |
| ±60° | 1.40 s | **0.49 s** | 5 / 0 | 5.03° / 0.21° |
| ±90° | 1.80 s | **0.49 s** | 18 / 0 | 10.08° / 0.23° |

InEKF 的收敛时刻几乎不随初始误差变，EKF 随之变长——「吸引域与轨迹无关」在玩具里的样子。演示默认的 24 组（±30°）是 0.87 s 对 0.42 s。这是简化模型，数值不能和 Cassie 比。

<h3 id="实例-第-12-步代码与表-1-的噪声">第 12 步：代码的默认噪声和表 1 不一样</h3>

| 量 | 表 1（论文实验） | `NoiseParams.cpp` 默认 | `kinematics.cpp` 例子 |
|---|---|---|---|
| 陀螺 | 0.002 rad/s | 0.01 | 0.01 |
| 加速度计 | 0.04 m/s² | 0.1 | 0.1 |
| 陀螺零偏 | 0.001 rad/s² | 0.00001 | 0.00001 |
| 加速度计零偏 | 0.001 m/s³ | 0.0001 | 0.0001 |
| 接触速度 | 0.05 m/s | 0.1 | 0.01 |

库里的是通用默认值，换平台要自己按传感器标定；论文实验用的是表 1。
</details>

---

## 📊 实验里实际报了什么 {#inekf-experiments}

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：仿真收敛（图 3）、线性化精度（图 4、5）、协方差形状（图 6、7）、真机收敛（图 8）、动捕（图 9、10）、长距离（图 11）、建图（图 12）</summary>

**平台**（第 9 节）：Cassie，20 自由度（含机身位姿）、10 个电机、4 根弹簧；VectorNav VN-100 IMU 在躯干里，800 Hz；14 个编码器量所有电机和弹簧的角度，2000 Hz；每条腿两根弹簧，形变过阈值当二值接触传感器。滤波器和控制器（Gong 等）都在 MATLAB Simulink Real-Time 里跑。

**仿真收敛**（第 6.2 节、图 3）：Simscape Multibody 里的 Cassie，小落一下后从 0 加速到 0.3 m/s；接触力用线性弹簧—阻尼 + 库仑摩擦。测量加白噪声（表 1）。两种滤波器用同一组测量、噪声统计与初始协方差，只把初值随机化：欧拉角在 −30°…30°、速度在 −1…1 m/s 里均匀抽，各跑 100 次，零偏估计关掉。InEKF 的俯仰、横滚和机身系速度都比 QEKF 收得快得多（读图：InEKF 约 0.3 s 收拢，QEKF 1 s 时俯仰仍分散十来度）。航向两者都不收敛（不可观），所以速度画在估计的机身系里。

**线性化精度**（第 6.3 节、图 4、5）：见[第 5 步](#实例-第-5-步图-4-重跑)。无噪声时 InEKF 的「真实误差 − 线性传播误差」恒为 0，QEKF 随初始误差增大（读图约 25）；有噪声时 InEKF 也不为 0，但仍小得多。

**协方差形状**（第 6.4 节、图 6、7）：见[第 8 步](#实例-第-8-步香蕉的弯度)与上面的演示。读图 6：QEKF 在 8 s 时的侧向范围约 ±2 m，比真值（约 ±4 m）还窄。

**真机收敛**（第 9.1 节、图 8）：Cassie 以约 0.3 m/s 慢走，同一段记录离线跑 100 次，初值同上，**零偏估计打开**，零偏初值来自静止时的 IMU 数据。「真值」黑线是让滤波器从好的初值提前跑起来得到的（朝向初值取 VN-100 自带的 EKF，速度取运动学）。InEKF 在 100 次里都收得更快、更稳（读图约 0.4 s；QEKF 2 s 后仍分散约 5°）。论文的解释：初值接近真值时两者相近；初值远时 QEKF 在错的工作点上线性化；零偏打开后 InEKF 的理论优势不再完整，但对初值仍不敏感。

**动捕**（第 9.2 节、图 9、10）：密歇根大学 M-Air 户外场地，18 台 Qualisys 相机；Cassie 不拴安全绳走 60 s、约 15 m。终点误差不到路程的 5%；漂移来自传感器噪声、打滑与运动学建模误差（可能给运动学测量带偏差）。图 10 画了 3σ 包络：可观的状态误差一直很小，航向的协方差随时间慢慢长大。朝向的「真值」用的是 VN-100 的 QEKF（动捕的朝向不准），所以画的是指数坐标。把右不变协方差换成欧氏误差的协方差要用式 (33) 与 SO(3) 的左雅可比（附录 C）。

**长距离里程计**（第 9.3 节、图 11）：绕密歇根大学 Wave Field 的人行道走约 200 m、7 分 45 秒，估计的轨迹叠到卫星图上一直在人行道上，终点误差几米，航向漂移看不出来。

**激光建图**（第 9.4 节、图 12）：躯干换成装 Velodyne VLP-32C 的版本，按当前估计把每包点云投到世界系，10 秒的点云叠成局部地图；高频位姿还能对 10 Hz 的单帧扫描做运动补偿。
</details>

<div class="paper-demo" data-demo="inekf-converge"><p class="demo-fallback">（本节含交互演示：二维行走玩具里的收敛对比，需要启用 JavaScript）</p></div>

---

## ⚠️ 边界与局限

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：论文自己说的，加上读者要注意的几点</summary>

- **位置与航向随时间漂**：只用本体传感器时它们本来就不可观；要全局一致得加视觉 / 激光 / GPS 或路标（第 12 节、结论）。
- **零偏打破理论**：加了零偏就没有群仿射了，「误差与轨迹无关」「线性化精确」只在零偏误差为 0 时成立；论文用实验说明它仍比 QEKF 好，没有给新的收敛证明。
- **噪声下不再精确**：定理 2 是对确定性系统说的，有噪声时误差方程只是近似（图 5）。
- **接触模型简单**：二值接触 + 触地点速度白噪声，打滑大时会把偏差带进估计；论文的漂移分析也点名了打滑与运动学建模误差。
- **只有点接触的位置**：没有用脚的朝向（Rotella 等 2014 对平脚人形加过朝向测量）；论文提到的扩展方向包括在线估计运动学参数、识别站立 / 平地走 / 转弯等模式加约束、视觉—惯性—接触融合、引入地形先验。
- **（整理者补充）收敛对比只比了 QEKF**，没有和 OC-EKF、UKF、平滑器比；图 3、8 的「快多少」只能读图，论文没给数字。
</details>

---

## 🤖 对人形机器人学习的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：1. 状态估计是策略的输入 / 2. 一个高频、可信的本体里程计 / 3. 后续工作</summary>

<h3 id="1-状态估计是策略的输入">1. 状态估计是策略的输入</h3>

学出来的策略多数要读机身朝向（重力投影）、角速度，跟踪类策略还要根速度甚至全局位置；这些都来自状态估计。发布清单把它排在 [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) 之后，是教学上的衔接（BeyondMimic 论文里用的是广义动量观测器 + 卡尔曼滤波，不是 InEKF）。读这篇能回答一个常被跳过的问题：仿真里直接拿到的根速度，上真机是从哪来的、可信到什么程度、哪些方向会漂。

<h3 id="2-一个高频可信的本体里程计">2. 一个高频、可信的本体里程计</h3>

InEKF 的两点对部署很实用：从很差的初值也能快速收敛（上电时不用先「对准」），以及协方差的形状和不可观方向是对的（不会对航向过度自信）。它只依赖 IMU、编码器和接触信号，这些在几乎所有足式平台上都有。

<h3 id="3-后续工作">3. 后续工作</h3>

本仓库里接着这条线的笔记：理论源头 [Barrau & Bonnabel 的 InEKF](../The_Invariant_Extended_Kalman_Filter_as_a_Stable_Observer/The_Invariant_Extended_Kalman_Filter_as_a_Stable_Observer.html)；同组把接触做成因子图里的预积分因子（[Hartley 等 2018](../Legged_Robot_State-Estimation_via_Forward_Kinematic_and_Preintegrated_Contact_Factors/Legged_Robot_State-Estimation_via_Forward_Kinematic_and_Preintegrated_Contact_Factors.html)，也就是本文结论里说的「接触预积分」）；更新步加高斯—牛顿迭代的 [Iterated InEKF](../Iterated_Invariant_EKF_for_Quadruped_Robot_Odometry/Iterated_Invariant_EKF_for_Quadruped_Robot_Odometry.html)；让 Transformer 学噪声参数的 [InEKFormer](../InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots/InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots.html)；在晃动地面上做人形状态估计的 [非惯性地面 InEKF](../Proprioceptive_Invariant_State_Estimation_for_Humanoid_Robots_on_Non-Inertial_Ground/Proprioceptive_Invariant_State_Estimation_for_Humanoid_Robots_on_Non-Inertial_Ground.html)。
</details>

---

## 📁 源码对照 {#源码对照}

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（6 节）：仓库结构 / 预测 Propagate() / 校正 Correct() / 运动学 CorrectKinematics() / 增删接触 / 写明 vs 没写</summary>

<h3 id="src-1-仓库结构">1. 仓库结构</h3>

[RossHartley/invariant-ekf](https://github.com/RossHartley/invariant-ekf)（C++ / Eigen，最后提交 2019-08）：`include/` 与 `src/` 里是 `InEKF`（滤波器）、`RobotState`（$X$、$\theta$、$P$）、`NoiseParams`（噪声）、`LieGroup`（`skew`、`Exp_SO3`、`Exp_SEK3`、`Adjoint_SEK3`）；`src/examples/kinematics.cpp` 是接触辅助的例子（读 `IMU / CONTACT / KINEMATIC` 三种行的数据文件），`landmarks.cpp` 是路标的例子。README 引的是会议版。

<h3 id="src-2-预测-propagate">2. 预测 `Propagate()`（对应式 13–14、附录 A）</h3>

节选：

```cpp
Eigen::Vector3d w = m.head(3) - state_.getGyroscopeBias();
Eigen::Vector3d a = m.tail(3) - state_.getAccelerometerBias();
Eigen::Matrix3d R_pred = R * Exp_SO3(w*dt);
Eigen::Vector3d v_pred = v + (R*a + g_)*dt;
Eigen::Vector3d p_pred = p + v*dt + 0.5*(R*a + g_)*dt*dt;
A.block<3,3>(3,0) = skew(g_);                 // (g)×
A.block<3,3>(6,3) = Eigen::Matrix3d::Identity();
A.block<3,3>(0,dimP-dimTheta) = -R;           // 零偏那两列：含估计值（式 28）
A.block<3,3>(3,dimP-dimTheta+3) = -R;
for (int i=3; i<dimX; ++i)
    A.block<3,3>(3*i-6,dimP-dimTheta) = -skew(X.block<3,1>(0,i))*R;
Eigen::MatrixXd Phi = I + A*dt;               // 一阶近似 exp(AΔt)
Eigen::MatrixXd Qk_hat = PhiAdj * Qk * PhiAdj.transpose() * dt;
P_pred = Phi * P * Phi.transpose() + Qk_hat;
```

状态是会议版那种欧拉积分（例子里还用的是**上一帧**的 IMU 读数，零阶保持），协方差的 $\Phi$ 是一阶近似，噪声矩阵 $\bar Q _ k \approx \Phi\,\mathrm{Ad}\,Q\,\mathrm{Ad}^\top\Phi^\top\Delta t$ 与会议版第 IV-E 节一致。扩展版附录 A 给了用 $\Gamma _ 0$、$\Gamma _ 1$、$\Gamma _ 2$ 的解析离散化，代码没用。$g$ 是 `(0, 0, −9.81)`。

<h3 id="src-3-校正-correct">3. 校正 `Correct()`（对应式 18–20）</h3>

节选（合并了几行）：

```cpp
Eigen::MatrixXd S = obs.H * P * obs.H.transpose() + obs.N;
Eigen::MatrixXd K = P * obs.H.transpose() * S.inverse();
Eigen::MatrixXd Z = BigX*obs.Y - obs.b;       // X̄Y − b
Eigen::VectorXd delta = K*obs.PI*Z;
Eigen::MatrixXd X_new = Exp_SEK3(delta.segment(0, ...)) * state_.getX();  // 右不变更新：左乘
Eigen::VectorXd Theta_new = state_.getTheta() + dTheta;                    // 零偏直接相加
P_new = IKH * P * IKH.transpose() + K*obs.N*K.transpose();                 // Joseph 形式
```

<h3 id="src-4-运动学-correctkinematics">4. 运动学 `CorrectKinematics()`（对应式 17、20）</h3>

对每个已在状态里、而且仍着地的触地点，拼一段观测：`Y` 的前三维是测量的 `p_bc`，下标 4（对应 $X$ 里 $p$ 那一列）是 1、这个触地点那一列的下标是 −1；`b` 在同样的位置是 1 / −1；`H` 在位置块写 $-I$、触地点块写 $I$；`N = R·Cov·Rᵀ`（式 20 的 $\bar N$，协方差直接用 `Kinematics` 里给的 6×6 的位置那块）；`PI` 只取前三行。多个触地点的观测堆在一起做一次 `Correct()`。

<h3 id="src-5-增删接触">5. 增删接触（对应第 8 节）</h3>

接触状态从 `setContacts()` 来：之前在状态里、现在不着地 → 记入 `remove_contacts`；现在着地、之前不在 → 记入 `new_contacts`。校正之后先删：`removeRowAndColumn` 从 `X` 删一行一列、从 `P` 删三行三列，并更新其他触地点 / 路标的下标；再加：`X_aug` 多一行一列，新列是 `p + R*p_bc`（式 31），协方差 `F` 把旧状态原样抄过来、把位置那三行再抄一份给新触地点，`G` 的新块是 `R`，`P_aug = F P Fᵀ + G Cov Gᵀ`（式 32）。

<h3 id="src-6-写明-vs-没写">6. 写明 vs 没写</h3>

| 论文写明 | 代码里 | 论文没写 / 和代码不同 |
|---|---|---|
| 右不变误差、$A$、$H$、Joseph 更新 | 一一对应 | — |
| 解析离散化（附录 A） | 用 $\Phi = I + A\Delta t$ | 代码取了一阶近似，注释写着「可以改用完整的 exp」 |
| 表 1 的噪声 | 默认值不同（见第 12 步） | 通用默认，不是论文实验的参数 |
| 接触由弹簧形变阈值给出 | 库里由外部传入 `CONTACT` 行 | 阈值多少论文没写 |
| 左不变 / 机器人中心（第 10–11 节） | 库里只实现了世界中心的右不变 | — |
</details>

---

## 🎤 面试高频问题 & 参考回答

<details class="paper-fold" markdown="1">
<summary>📖 展开全文：Q1 InEKF 和 EKF 差在哪 / Q2 为什么用右不变误差 / Q3 航向为什么看不见 / Q4 零偏怎么办 / Q5 脚抬起落下怎么处理 / Q6 和 QEKF 的协方差有什么不同</summary>

<h3 id="q1-inekf-和-ekf-差在哪">Q1: InEKF 和普通 EKF 差在哪？</h3>

传感器和模型可以完全一样，差别只在误差的定义。EKF 的误差逐项相减，误差方程和观测矩阵都在当前估计值处线性化，估计偏得远时线性化本身就错。InEKF 把状态放在矩阵李群上、误差定义成 $\bar X X^{-1}$（或 $X^{-1}\bar X$）；若动力学「群仿射」、观测是左 / 右不变观测，误差方程 $\dot\xi = A\xi$ 和观测矩阵 $H$ 都与估计值无关，而且确定性情形下线性方程是精确的，于是吸引域与轨迹无关、不会虚增可观性。

<h3 id="q2-为什么用右不变误差">Q2: 为什么这里用右不变误差？</h3>

因为正运动学测的是「脚相对身体」，写成 $Y = X^{-1}b + V$，是右不变观测；右不变误差下新息只依赖不变误差、$H = [0, 0, -I, I]$ 是常数。GPS 这类世界系的测量是左不变观测，用左不变误差更合适。两者之间可以用伴随矩阵精确换算；机器人中心的估计器（状态取逆）里，运动学变成左不变观测。

<h3 id="q3-航向为什么看不见">Q3: 航向和位置为什么看不见？InEKF 怎么处理？</h3>

把机器人连同触地点整体平移、或绕重力方向整体旋转，IMU 和运动学的读数都不变。InEKF 的可观性矩阵里位置与触地点两列只差符号、$(g) _ \times$ 的第 3 列为 0，正好对应这 4 个方向；因为线性化不依赖估计值，不会把它们误判成可观，协方差会老实地慢慢长大。EKF 在不同时刻的估计值处线性化，会虚增秩（需要 OC-EKF 修）。

<h3 id="q4-零偏怎么办">Q4: IMU 零偏怎么办？</h3>

没有既包含零偏又满足群仿射的李群，所以零偏 $\theta = (b^g, b^a)$ 放在群外，状态是 $(X, \theta)$；$A$ 多出零偏两列，里面含 $\bar R$、$(\bar v) _ \times\bar R$ 等估计值，理论保证只在零偏误差为 0 时成立——「不完美的 InEKF」。实验上它对初值仍比 QEKF 不敏感。零偏初值用静止时的 IMU 数据估。

<h3 id="q5-脚抬起落下怎么处理">Q5: 脚抬起、落下怎么处理？</h3>

抬起：边缘化，从 $X$ 删掉那一列、从 $P$ 删掉 3 行 3 列。落下：$\bar d = \bar p + \bar R h _ p(\tilde\alpha)$；协方差增广时新触地点的误差 $\xi^d = \xi^p + \bar R J _ p w^\alpha$，即把位置那几行抄过来再加上运动学噪声。触地点在世界里假设不动，速度是白噪声，容许一点打滑。

<h3 id="q6-和-qekf-的协方差有什么不同">Q6: 和 QEKF 的协方差有什么不同？</h3>

QEKF 的高斯在位置上，分布只能是以估计为中心的椭圆；InEKF 的高斯在李代数里，经指数映射回到群上，朝向和位置耦合，航向不确定时位置分布会弯成香蕉、甚至成为圆环（图 6、7）。即使均值一样，InEKF 的协方差也更能代表真实的不确定性。
</details>

---

## 📎 附录

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（4 节）：A. 数字出处 / B. 旧版笔记的改正 / C. 论文内部与两版之间的出入 / D. 与路线图其他论文的关联</summary>

<h3 id="a-数字出处">A. 数字出处</h3>

- 照抄论文：Cassie 的自由度、电机、弹簧、编码器、800 / 2000 Hz（第 9 节）；表 1；100 次、±30°、±1 m/s、0.3 m/s（第 6.2、9.1 节）；1 m/s、8 s、0.1 m、10°、1 万个粒子、360°（第 6.4 节）；18 台相机、60 s、约 15 m、< 5%（第 9.2 节）；约 200 m、7 分 45 秒（第 9.3 节）；VLP-32C、10 Hz、10 s（第 9.4 节）；> 2000 Hz（第 2.2 节）。
- 照抄公式：式 (7)、(8)、(12)–(14)、(17)–(20)、(28)、(31)–(32)、(36)；第 5.4 节的 $\Phi$ 与 $\mathcal{O}$。
- 在论文式子上现算：站立例子（第 2–4 步）、一次校正（第 6 步）、香蕉的弯度与覆盖率（第 8 步）、新触地点（第 9 步）、实验对账里的比例（第 10 步）。
- 我们自己算的：可观性矩阵的秩与 QEKF 的「秩 9」（第 7 步）、图 4 的重跑（第 5 步）、二维玩具（第 11 步）。
- 读图：图 3、4、6、8、9 没有标数，0.3 s、0.4 s、约 25、±2 m、约 5° 与图 9 的轨迹都是读图近似值。
- 官方代码：$g$、`Propagate()` / `Correct()` / `CorrectKinematics()` 的写法、默认噪声（第 12 步、源码对照）。

<h3 id="b-旧版笔记的改正">B. 旧版笔记的改正</h3>

- **标题与版本**：旧版标题、年份用的是会议版（…for Legged Robot State Estimation，RSS 2018），链接却是扩展版的 arXiv 1904.09251，还写成「1904.09251 (RSS 2018)」。现在以上游清单收录的扩展版为准，标题改成扩展版的，两版关系单列一节。
- **作者**：旧版把 Grizzle 排在第三、Eustice 排在最后且没写名字；扩展版顺序是 Hartley, Ghaffari, Eustice, Grizzle（会议版是 Hartley, Ghaffari Jadidi, Grizzle, Eustice）。
- **板块**：旧版写「08 State Estimation」，实际在 09。
- **「MIT Cheetah、Mini Cheetah、Unitree 系列都以 InEKF 为基石」**：论文和本仓库都找不到出处，已删去。
- **「Cassie 在复杂、特征匮乏的户外环境」「长时间保持低漂移」**：论文的户外实验是人行道上约 200 m、7 分 45 秒，终点误差几米；改成论文的说法。
- 状态的记号从 $SE _ {n+2}(3)$ 统一成论文的 $SE _ {N+2}(3)$。

<h3 id="c-论文内部与两版之间的出入">C. 论文内部与两版之间的出入</h3>

- **QEKF 误差方程的符号**：第 6.1 节写 $\tfrac{d}{dt}\delta v = -\bar R(\tilde a) _ \times\delta\theta$；按式 (21) 的定义 $\exp(\delta\theta) = R^\top\bar R$、$\delta v = v - \bar v$ 推，$R = \bar R\exp(-\delta\theta)$，得到的是 $+\bar R(\tilde a) _ \times\delta\theta$（第 4 步的数值也验证了正号）。观测矩阵第一块的符号同理。不影响结论。
- **可观性矩阵第三行**：论文印的速度块是 $-2I\Delta t^2$，按 $\Phi^2 = e^{2A\Delta t}$ 算应为 $-2I\Delta t$。不影响秩。
- **表 1 零偏噪声的单位**：会议版写 m/s²、rad/s，扩展版改成 m/s³、rad/s²（随机游走噪声的密度单位）。
- **运动学雅可比**：会议版说 $J _ v$ 是几何（「机械臂」）雅可比的线速度部分，扩展版改成正运动学的解析雅可比 $J _ p$。
- **协方差更新**：会议版 $(I-KH)P$，扩展版 Joseph 形式；代码是 Joseph。
- **离散化**：会议版第 IV-E 节是欧拉积分 + 一阶近似（代码就是这样），扩展版附录 A 给了解析离散化。

<h3 id="d-与路线图其他论文的关联">D. 与路线图其他论文的关联</h3>

- 前一篇 [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html)：片尾说「它离不开状态估计」，引到这篇；这是教学衔接，BeyondMimic 并没有用 InEKF。
- 下一篇 [Berkeley Humanoid](https://arxiv.org/abs/2407.21781)（笔记待建）：硬件、执行器辨识与仿真训练一起设计，补上「控制命令怎样落到硬件上」这一环。
- 理论源头与后续工作见[对人形机器人学习的意义](#3-后续工作)。
</details>
