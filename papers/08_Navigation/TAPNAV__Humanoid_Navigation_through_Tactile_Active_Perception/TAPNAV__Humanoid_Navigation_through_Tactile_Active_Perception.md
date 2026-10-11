---
layout: paper
title: "TAPNAV: Humanoid Navigation through Tactile Active Perception"
zhname: "TAPNAV：基于触觉主动感知的人形机器人导航"
category: "Navigation"
arxiv: "2610.10748"
---

# TAPNAV: Humanoid Navigation through Tactile Active Perception
**不用相机和激光雷达，让人形机器人在已知平面图里「摸着墙走」：全局规划挑一条沿途摸得到东西、定位不确定度不会失控的路线，每到一个子目标就用期望信息增益选左手 / 右手往哪个方向戳，用触觉的「碰到 / 没碰到」修正粒子滤波里的位姿**

> 📅 总结日期: 2026-10-11
>
> 🏷️ 板块: 08 Navigation · 无视觉导航 · 触觉主动感知 · 信念空间规划 · 期望信息增益 · 粒子滤波 · Unitree G1
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· `_data/papers.json` 里 Navigation 条目已全部有笔记，取上游 awesome-humanoid-robot-learning Navigation 章节中尚无笔记的最新论文（2026.10）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.10748](https://arxiv.org/abs/2610.10748) |
| HTML | [arxiv.org/html/2610.10748v1](https://arxiv.org/html/2610.10748v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.10748v1) |
| 项目主页 | [tapnav.github.io/TAPNAV-Project](https://tapnav.github.io/TAPNAV-Project/) |
| **发布时间** | 2026-10-07（arXiv v1） |
| 源码 | ⏳ 项目主页标注「Code coming soon」，暂未开源（故本笔记无源码运行时序图） |

**作者**：Huaze Liu, Zhenyu Wu, Jaehwi Jang, Junjie Sheng, Andrew Collins, Aaron Xie, Zhaoyuan Gu, Kaijie Zhu, Ding Jiang, Kevin Cai, Ye Zhao（Georgia Tech LIDAR 实验室为主，另有 Harvey Mudd College、Walton High School）

---

## 🎯 一句话总结

火场、漏气巡检、昏暗机舱这类视觉失效的室内场景里，人形机器人只靠里程计和 IMU 会越走越偏。TAPNAV 给 G1 两只手装上触觉末端（TouchTronix SensX 160，20 × 8 taxel），把「戳一下墙」当成**主动的感知动作**：粒子滤波维护 SE(2) 位姿信念，约束 A\* 只接受预测不确定度不超过 (0.18 m, 20°) 的路线，每个子目标上按期望信息增益（同时考虑碰到和没碰到两种结果）挑探测动作，底层由上下身解耦的 RL 全身控制器执行落脚点跟踪与末端力控。MuJoCo 四张地图平均成功率 95%，随机戳 77.5%、扫描式戳 38.8%、只用里程计 22.5%；真机在办公室走廊和厨房完成导航。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| EIG | Expected Information Gain | 期望信息增益：按「碰到 / 没碰到」的概率对两种结果的信息增益加权 |
| IG | Information Gain | 一次观测带来的熵减少（单位 nats） |
| PF | Particle Filter | 粒子滤波，本文 $N_p = 600$ 个位姿假设 |
| SE(2) | Special Euclidean group in 2D | 平面位姿 $(x, y, \psi)$ |
| ESS / $N _ {\text{eff}}$ | Effective Sample Size | 有效粒子数，低于 $0.5N_p$ 时重采样 |
| ZMP / 3D-LIPM | Zero Moment Point / 3D Linear Inverted Pendulum Model | 生成落脚步态参考的经典模型 |
| WBC | Whole-Body Control | 全身控制，这里是上身 + 下身两个 RL 策略 |

---

## ❓ 论文要解决什么问题？

1. **视觉失效时人形定位会快速发散**：RGB-D / LiDAR 在烟雾、黑暗中不可靠；纯本体里程计和 IMU 会积累漂移，人形走路时漂移更大。
2. **触觉只用于「手上的小事」**：已有触觉研究多是抓取物体识别、手内位姿估计；拿触觉做全局定位的工作（如四足的 Haptic MCL）用的是走路时**被动**踩到的接触，不会主动选择「去摸哪里」。
3. **人形要边走边摸还要站稳**：探测动作要求手臂在走走停停中精确到达并施加可控的接触力，同时下身必须精确移动到子目标——速度指令式的行走控制器在开环执行时朝向误差会累积。

---

## 🔧 方法拆解

### 1. 问题设定

已知静态平面图 $M$、已知起点 $\mathbf{x}_0$，状态 $\mathbf{x}_t = (p^x_t, p^y_t, \psi_t) \in \mathrm{SE}(2)$。探测动作 $a = (j, \alpha)$：$j \in \{L, R\}$ 选手，$\alpha \in [-40°, 110°]$ 离散化的方向（0 为正前方，正值朝外），末端沿直线伸出直到碰到东西或到达行程上限。触觉观测 $\mathbf{o}^{\text{tac}}_t = (\mathbf{s}_t, c_t)$：停下时末端在身体系中的位置和是否接触。

### 2. 触觉信号处理

taxel 图像去偏置、滤波后求和得到总激活 $T(t)$，按 WT-UMI 的逆指数响应模型换算成法向力，再用力阈值二值化成接触 / 未接触。硅胶垫（Ecoflex 00-50）+ 曲面硬外壳让传感器在不同接近角度都能感到接触。

### 3. 粒子滤波位姿信念

- **预测**：每个粒子按里程计增量 $\mathbf{u}_t$ 加高斯噪声做 SE(2) 复合（式 1）。
- **更新**：权重乘以触觉似然和 IMU 航向似然（式 2）；航向似然是方差随时间累加的 wrapped Gaussian。
- **触觉似然（式 3）**：记 $\delta^{(i)}_t$ 为停止点在粒子 $i$ 假设下到最近墙面的有符号法向距离。碰到时按 $\exp(-\delta^2 / 2\sigma_c^2)$ 惩罚「停止点不在墙上」的假设；**没碰到也是信息**——只惩罚那些「按理早该撞墙（停止点穿进墙里）」的假设，即 $\exp(-[-\delta]_+^2 / 2\sigma_c^2)$。
- 规划时把粒子集近似成高斯 $\mathcal{N}(\boldsymbol\mu_t, \boldsymbol\Sigma_t)$。

### 4. 不确定度有界的全局规划（约束 A\*）

最短路未必最可靠：一条走廊中间空旷、两边摸不到墙的路线会让不确定度一路长。规划器在 0.1 m 栅格上做 A\*，每段位移 $\le 0.4$ m，朝向设为面对最近的可达墙面；对每个候选位移先按式 1 传播 $(\boldsymbol\mu, \boldsymbol\Sigma)$，若预测均值位姿的探测范围内有墙，就用一个沿墙面法向 $\mathbf{n}_t$ 的卡尔曼更新近似「摸一下」之后的协方差，再剪掉违反式 4 界限 $(\bar\sigma_p, \bar\sigma_\psi) = (0.18\,\text{m}, 20°)$ 的候选。执行时估计位姿偏离路线超过 0.1 m 就重规划。

### 5. 按期望信息增益选探测动作

对每个候选 $a$：

- 在均值位姿下算末端行程终点最近的墙面点 $\mathbf{c}^a_t$ 和外法向 $\mathbf{n}^a_t$，把有符号距离对位姿线性化得到 $H^a_t \in \mathbb{R}^{1\times3}$（平移部分就是 $\mathbf{n}^\top$，朝向部分取决于接触点的力臂）。
- 余量 $\tilde m^a_t$ 视为高斯，方差 $H\Sigma H^\top + \sigma^2 _ {\text{control}}$（式 5），由此得到接触概率 $p_t(a)$。
- 碰到：$\mathrm{IG}^c = \tfrac12\log(1 + H\Sigma H^\top / \sigma_c^2)$；没碰到：余量分布在 0 处被截断，$\mathrm{IG}^f = -\tfrac12\log[1 - f(1-\varrho)]$，$f$ 是余量方差里来自位姿不确定度的比例，$\varrho$ 是截断正态与原分布的方差比。
- 选 EIG 最大的动作（式 6）：

$$a_t = \arg\max _ {a\in\mathcal{A}}\; p_t(a)\,\mathrm{IG}^c_t(a) + \big(1 - p_t(a)\big)\,\mathrm{IG}^f_t(a)$$

每个子目标最多戳 4 次，最大 EIG 低于 0.15 nats 就走向下一个子目标。

### 6. 底层全身控制器（上下身解耦，PPO 联合训练）

- **上身策略**：输入每只手的目标末端位姿、目标法向力、是否施力标志。两阶段课程：先在 IK 生成的参考上学位姿跟踪，再在仿真里加沿探测方向的弹簧—阻尼虚拟力场，设定点放在 $\mathbf{x}^s = \hat{\mathbf{p}}^{\text{ee}} - (f / K_p)\,\mathbf{n}$，使得保持目标位姿恰好需要施加指令力。
- **下身策略**：输入当前支撑脚坐标系下的目标落脚点、落脚倒计时、摆动标志。参考由分段常值 ZMP + 3D-LIPM（零初末速度）生成质心轨迹，摆动脚三次样条，IK 得关节参考——专门为走走停停、精确挪位设计。
- 两个策略共享 $H$ 步本体历史，输出拼成全身动作，$\hat{\mathbf{a}} = \mathbf{q} _ {\text{default}} + \alpha\,\mathbf{a}^\pi$ 交给 PD；控制频率 200 / 50 Hz。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TD
    MAP["已知静态平面图 M<br/>起点 x0 · 目标区域 Xg"]
    subgraph EST["位姿估计：600 粒子滤波"]
        PRED["预测：里程计增量 ⊕ 高斯噪声"]
        UPD["更新：触觉似然 × IMU 航向似然<br/>碰到 → 停止点应在墙上<br/>没碰到 → 剔除「早该撞墙」的假设"]
        GAUSS["近似为高斯 N(μ, Σ)"]
        PRED --> UPD --> GAUSS
    end
    subgraph GLOBAL["全局规划：约束 A*"]
        PROP["候选位移 ≤ 0.4 m，朝向面对最近墙面<br/>传播 (μ, Σ)"]
        KF["墙在探测范围内 → 沿法向的卡尔曼更新<br/>（预测「摸一下」后的协方差）"]
        PRUNE["剪掉违反 (0.18 m, 20°) 界限的候选<br/>输出最短子目标序列"]
        PROP --> KF --> PRUNE
    end
    subgraph LOCAL["局部规划：EIG 选探测动作"]
        CAND["候选 a = (左/右手, α ∈ [−40°, 110°])"]
        GEO["墙面点 c、法向 n、雅可比 H"]
        PROB["余量 ~ N(μm, HΣHᵀ + σ²control)<br/>→ 接触概率 p(a)"]
        EIG["EIG = p·IG碰到 + (1−p)·IG没碰到<br/>取 argmax；最多 4 次，低于 0.15 nats 即前进"]
        CAND --> GEO --> PROB --> EIG
    end
    subgraph WBC["底层全身控制（PPO）"]
        UP["上身策略：末端位姿 + 法向力跟踪<br/>（虚拟弹簧—阻尼力场课程）"]
        LOW["下身策略：落脚点跟踪<br/>（ZMP + 3D-LIPM 步态参考）"]
    end
    TAC["触觉末端 SensX 160<br/>激活和 → 法向力 → 阈值二值化"]

    MAP --> GLOBAL
    GAUSS --> GLOBAL
    PRUNE -- "子目标 Δx" --> LOW
    PRUNE --> LOCAL
    GAUSS --> LOCAL
    EIG -- "探测动作 a" --> UP
    UP --> TAC
    TAC -- "(停止点 s, 接触 c)" --> UPD
    LOW -- "里程计 / IMU" --> PRED
    GAUSS -- "偏离路线超过 0.1 m" --> GLOBAL
</div>

---

## 🚶 具体实例：正前方一堵墙，值不值得戳？

取论文表 I 的参数 $\sigma_c = 0.018$ m、$\sigma _ {\text{control}} = 0.045$ m。机器人朝向 $\psi = 0$，正前方有一堵墙（外法向 $\mathbf{n} = (-1, 0)$），用一只手正前方探测，行程终点恰好落在墙面上（余量均值 $\mu_m = 0$，所以 $p = 0.5$）。此时 $H = [-1, 0, 0]$，只看得见 $x$ 方向的不确定度。

| 前后方向位置标准差 $\sigma_x$ | $H\Sigma H^\top$ | $\mathrm{IG}^c$（碰到） | $f$ | $\mathrm{IG}^f$（没碰到） | EIG |
|---|---|---|---|---|---|
| 0.10 m | 0.0100 | 1.731 | 0.832 | 0.377 | **1.054 nats** |
| 0.05 m | 0.0025 | 1.083 | 0.553 | 0.217 | **0.650 nats** |

（没碰到时余量 $N(0, \sigma_m^2)$ 在 0 处截成半正态，方差比 $\varrho = 1 - 2/\pi \approx 0.363$。）

- 两种情况都远高于 0.15 nats 的停止阈值，所以都会戳；不确定度越大，戳一下越值。
- 「没碰到」也有信息：$\sigma_x = 0.10$ m 时它在 EIG 里贡献 $0.5 \times 0.377 \approx 0.19$ nats（约 18%）。它告诉机器人「墙至少比行程上限远」，把余量分布砍掉一半；若只算碰到的那一半，就会低估「伸手扑空」的价值。
- 若换成朝侧面空旷处探测（附近没有墙，接触概率 $\approx 0$、截断几乎不发生，$\varrho \approx 1$），两项都趋近 0，EIG ≈ 0——这就是 Random-touch 浪费动作的地方。
- 平直墙面只约束法向一个方向；论文图 7 里不确定度下降最大的时刻都发生在**墙角、柱子**这类法向不同的表面，两次正交的接触才能同时压住 $x$ 和 $y$。

---

## 💡 核心贡献

1. **信念空间触觉导航规划器**：约束 A\* 在路线搜索阶段就预测「哪里能摸到墙」，用不确定度界限换取可靠性，而不是只找几何最短路。
2. **基于 EIG 的主动触觉探测**：同时建模接触和**无接触**两种结果的信息量，选最能减少位姿不确定度的手和方向。
3. **完整的无视觉人形导航系统**：触觉末端硬件 + 粒子滤波 + 两级规划 + 上下身 RL 全身控制，在仿真和 G1 真机的办公室尺度环境中验证。作者称这是第一个用「主动规划的触觉探测」而非被动接触来做人形室内导航的系统。

---

## 📊 关键发现

**表 II（MuJoCo，四张地图 × 20 次）**

| 方法 | 地图 a 位置误差 / SR | 地图 b | 地图 c | 地图 d | 平均 SR |
|---|---|---|---|---|---|
| **TAPNAV** | 6.5 cm / 95% | 9.4 cm / 100% | 5.9 cm / 100% | 16.8 cm / 85% | **95%** |
| Random-touch | 9.6 cm / 90% | 11.4 cm / 70% | 8.7 cm / 75% | 16.6 cm / 75% | 77.5% |
| Sweep-touch | 11.7 cm / 50% | 11.2 cm / 50% | 10.9 cm / 30% | 13.7 cm / 25% | 38.8% |
| Odometry-only | 23.4 cm / 35% | 36.5 cm / 5% | 13.2 cm / 5% | 28.5 cm / 45% | 22.5% |

- 误差只在成功的试次上统计，所以 Odometry-only 在地图 b、c 上只有一次成功、没有标准差；地图 d（散落障碍物）上 Sweep-touch 的误差反而最低，但成功率只有 25%。
- **加航向噪声（图 8）**：在所有 IMU 噪声水平下 TAPNAV 的位置 / 航向误差最低、成功率最高。
- **落脚点 vs 速度跟踪（图 9，各 30 次开环）**：速度控制器的朝向误差在连续目标间累积、偏离路线；落脚点控制器漂移更小——这是选择落脚点指令的依据。
- **真机**：G1 在厨房（绕台面、连续转弯）和办公室走廊完成导航，沿途在不同表面上主动探测；论文只给出成功示例，没有真机成功率统计。

---

## 🤖 对人形机器人领域的意义

- **把接触从「要避免的事」变成「要规划的传感动作」**：多数导航工作把墙当障碍；这里刻意贴近墙、柱子走，因为它们是定位信息源。
- **「没碰到」的信息量**被显式计入，是主动感知里容易被忽略的一半。
- **局限**：需要已知静态平面图；规划时把粒子信念近似为单峰高斯，对称走廊等多峰情形处理不了（作者计划扩展到多峰信念和部分已知地图）；行走速度被限制在 0.2 m/s 左右，靠走走停停换精度。

---

## 🎤 面试参考

1. **为什么没碰到也能更新位姿？** 没碰到说明「行程终点之前没有墙」，把所有预测终点已穿墙的粒子降权；数学上是对余量分布做单侧截断。
2. **EIG 为什么偏好墙角？** 线性化后一次接触只约束 $H$ 的方向（墙法向 + 朝向耦合项），平直墙只压一个方向；墙角两个法向互补，两次接触就能压住平面位置。
3. **全局规划里为什么不直接模拟粒子？** 每个候选位移都传播 600 个粒子太贵，所以用高斯近似 + 「有墙就沿法向做一次卡尔曼更新」的简化观测模型。
4. **为什么下身用落脚点指令而不是速度指令？** 导航是走走停停、需要精确挪到子目标；速度指令开环执行时朝向误差会累积（图 9）。

---

## 🔗 相关阅读

- [STATE-NAV](../STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain/STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain.html)：同出 Ye Zhao 组的双足导航，用稳定性感知的可通行性做规划
- [ARMOR](../ARMOR__Egocentric_Perception_for_Humanoid_Robot_Collision_Avoidance/ARMOR__Egocentric_Perception_for_Humanoid_Robot_Collision_Avoidance.html)：同样不依赖头部相机，用分布在身上的距离传感器做避碰
- [Contact-Aided Invariant EKF](../../09_State_Estimation/Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.html)：用足端接触做本体状态估计，是本文「里程计」那一层的经典做法
- WT-UMI（Jang et al., CoRL 2026）：本文触觉信号到法向力的标定模型来源
- Navigating by Touch: Haptic Monte Carlo Localization（Buchanan et al., 2021）：四足用步态被动接触做定位，本文的对照起点
