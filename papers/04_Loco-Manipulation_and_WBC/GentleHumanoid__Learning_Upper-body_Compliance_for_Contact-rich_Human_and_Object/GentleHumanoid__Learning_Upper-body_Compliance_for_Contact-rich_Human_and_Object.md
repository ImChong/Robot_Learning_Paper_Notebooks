---
layout: paper
paper_order: 14
title: "GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction"
zhname: "GentleHumanoid：面向密集接触人机与物体交互的上半身柔顺学习"
category: "Loco-Manipulation and WBC"
arxiv: "2511.04679"
demos: ["gentle"]
---

# GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction
**把阻抗模型写进全身动作跟踪的参考：肩、肘（腕）、手各当一个虚拟质量，由朝目标动作的弹簧阻尼和「造出来的」交互弹簧共同推动，积分出柔顺参考让 RL 去跟；驱动力按可调的安全阈值（5–15 N）截断，让 G1 抱人、扶人、托气球时既不硬顶也不失力**

> 📅 阅读日期: 2026-04-19（2026-09-24 扩充：对照全文与开源训练 / 部署代码重写，新增七幕讲解动画与具体实例）
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 上肢柔顺 · 阻抗参考动力学 · 人机物理交互
>
> ℹ️ 笔记已对照 [arXiv 2511.04679v1](https://arxiv.org/abs/2511.04679v1) 全文（含附录 A–D、Table I–III），以及官方训练仓库 [Axellwppr/gentle-humanoid-training](https://github.com/Axellwppr/gentle-humanoid-training)（2025-12-18 的 `main`）与部署仓库 [Axellwppr/gentle-humanoid](https://github.com/Axellwppr/gentle-humanoid)（2025-12-17 的 `main`）整理。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2511.04679](https://arxiv.org/abs/2511.04679) |
| **HTML** | [在线阅读](https://arxiv.org/html/2511.04679) |
| **PDF** | [下载](https://arxiv.org/pdf/2511.04679) |
| **项目主页** | [gentle-humanoid.axell.top](https://gentle-humanoid.axell.top)（含浏览器内 MuJoCo 在线演示） |
| **源码** | [训练](https://github.com/Axellwppr/gentle-humanoid-training)（Isaac Lab + 自带 PPO）· [部署](https://github.com/Axellwppr/gentle-humanoid)（sim2sim / sim2real + 预训练 ONNX） |
| **发布时间** | 2025年11月6日（arXiv） |
| **作者** | Qingzhou Lu\*, Yao Feng\*, Baiyu Shi, Michael Piseno, Zhenan Bao, C. Karen Liu（\* 共同一作） |
| **机构** | Stanford University（一作 Qingzhou Lu 实习期间完成，现在清华大学） |
| **实验平台** | Unitree G1（29 DoF） |
| **控制频率** | 策略 50 Hz 输出 29 维关节位置目标，底层 PD 跟踪；仿真物理步长 0.005 s |

---

## 🎯 一句话总结

最近的人形全身跟踪 RL 大多追求「别偏离参考」，把外力当扰动顶回去，所以一抱人、扶人、托软物就显得僵硬；已有把阻抗 / 导纳接进 RL 的工作又只管基座或末端，而且目的是扛住大力。GentleHumanoid 把肩、肘、手（代码里是肩、腕、手）当成 0.1 kg 的虚拟质量：**驱动力**是朝目标动作的临界阻尼弹簧，**交互力**用同一个弹簧公式造出两种接触——抵抗式（锚点固定在刚接触的位置）和引导式（锚点从人类动作的整条手臂姿态里采样，保证肩—肘—手受力协调）；两者积分出一条**柔顺参考**，策略去跟它。驱动力再按**可调安全阈值**（训练时 5–15 N 随机，部署时按钮调）截断，阈值同时作为观测喂给策略。结果：仿真拥抱被外拉时手部力稳在约 10 N（基线 13–20 N 以上）；真机拉动手腕，Extreme-RL 峰值 51.14 N、Vanilla-RL 24.59 N，GentleHumanoid 停在设定阈值附近且与姿态无关；5 N 阈值能托住气球不挤爆。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 | 生活类比 |
|------|------|----------|----------|
| **RL** | Reinforcement Learning | 强化学习：通过奖惩训练控制策略 | 像带小孩学骑车，做对了鼓励、做错了纠正 |
| **PPO** | Proximal Policy Optimization | 常用稳定 RL 算法 | 每次只小步改策略，避免一把改坏 |
| **PD** | Proportional-Derivative | 比例-微分控制 | 像弹簧 + 阻尼器，一边拉回目标一边防抖 |
| **Impedance** | Impedance Control | 阻抗控制：规定「受力 ↔ 位移」的关系（像弹簧阻尼） | 被推时按设定的软硬程度让开 |
| **HRI** | Human-Robot Interaction | 人机交互 | 人和机器人发生直接协作或身体接触 |
| **FACET** | Force-Adaptive Control via Impedance Reference Tracking | 本文沿用其教师—学生架构的前作（腿足机器人） | 同一思路先在四足 / 基座上做过 |
| **ISO/TS 15066** | — | 协作机器人安全技术规范，给出各身体部位的疼痛起始压强 | 「最多能多用力」的国际参考线 |
| **Taxel** | Tactile Pixel | 触觉阵列里的一个感测单元 | 压力垫上的一个「像素」 |
| **SMPL / SMPL-X** | Skinned Multi-Person Linear Model | 参数化人体模型 | 用一串数字描述人体姿态和形状 |
| **GMR** | General Motion Retargeting | 人类动作到机器人动作的重定向方法 | 把「人做的动作」翻译成「机器人能做的动作」 |
| **AMASS / InterX / LAFAN** | — | 三个人体动捕数据集（通用 / 人-人交互 / 动画） | 人类运动的素材库 |
| **BEDLAM / PromptHMR** | — | 单图 / 单目视频的人体网格估计方法 | 从照片或手机视频还原人的 3D 体型与动作 |
| **Sim-to-Real** | Simulation to Reality | 仿真训练迁移到真机 | 游戏里练熟，再上真实赛场 |

---

## 🎬 七幕动画：GentleHumanoid 全流程 {#gentle-explainer-anim}

<div class="paper-demo" data-demo="gentle-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（问题、方法、实验）按小节收起，再往后的具体实例、源码对照、与其他笔记的关系、核心贡献、局限、面试参考与引用各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；整体框架图与源码时序图留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画第 2–6 幕里的小算例（参考动力学的 4 个子步、三档阈值的平衡点、压强换算、奖励核），和下文「🚶 具体实例」是同一组数字。

---

## ❓ 要解决什么问题

### 问题 1：跟踪策略把外力当扰动

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：「别偏离参考」的目标让机器人一被碰就硬顶回去</summary>

最近很多人形 RL 控制器（全身跟踪、遥操作）本质上都在做同一件事：尽量跟住参考动作，把外力当成要压制的扰动。一旦被推、被拉、贴到物体上，就拼命把自己拉回参考——这在拥抱、搀扶、握手、托气球这类任务里就是「僵硬」。论文的真机测试里，把基线的手腕推开要 24.59 N（Vanilla-RL）甚至 51.14 N（Extreme-RL），而且让开的往往不是手臂，而是整个躯干被带着走、容易失衡。

</details>

### 问题 2：以前的柔顺只管基座或末端

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：真实接触落在整条上肢：肩、肘、手可能同时受力</summary>

已有把阻抗 / 导纳控制接进 RL 的工作（如 FACET、Portela 等人的腿足力控、统一力位控制）以及隐式学习抗力的 FALCON，要么只作用在基座或末端执行器上，要么目的是**扛住极端外力**而不是柔顺交互。可拥抱时手、前臂、肘、肩都可能同时接触；扶人站起时力沿手—肘—肩—躯干传递。只控制末端，做不到整条运动链的协调。

</details>

### 问题 3：柔顺程度要随任务变

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：太软抱不住、扶不起；太硬挤疼人、挤爆气球</summary>

论文把挑战归纳成两条：（1）在运动链的多个 link 之间协调力响应；（2）适应从轻触到强支撑的多种接触场景，并且始终在安全力阈值以内。训练得太软，抱不住人、扶不起人、拿不稳东西；训练得太硬，接触生硬，甚至超过安全或舒适阈值。

> 💡 **类比**：以前很多策略像「只会按既定动作出拳的拳击陪练」。GentleHumanoid 更像一个有分寸的康复师——既能给力，也知道什么时候该顺着你、托着你。

</details>

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    MOT["人类动作 25 h（AMASS / InterX / LAFAN）<br/>GMR 重定向到 29-DoF G1，50 Hz"]

    subgraph REF["(a) 阻抗参考动力学（每个 link 一个 0.1 kg 虚拟质量）"]
        DRV["驱动力 f_drive = K_p(x_tar − x) + K_d(v_tar − ẋ)<br/>K_p = τ_safe / 0.05，K_d 临界阻尼，按 τ_safe 截断"]
        INT["交互力 f_interact = K_spring(x_anchor − x)<br/>抵抗：锚点 = 刚接触的位置<br/>引导：锚点 = 采样的人类手臂姿态"]
        INTG["M ẍ = f_drive + f_interact − Dẋ<br/>每个策略步 4 × 0.005 s 子步积分"]
    end

    subgraph TR["(b) 训练（教师—学生，PPO）"]
        TEA["教师：+ x_ref、ẋ_ref、参考力、仿真实测力、离地高度、力矩、累计误差"]
        STU["学生：τ_safe + 目标动作 + 角速度 + 重力 + 关节 / 动作历史"]
        RW["柔顺奖励：参考状态跟踪 2.0 · 参考力跟踪 2.0 · 不安全力惩罚 6.0<br/>+ 动作跟踪 + 行走稳定项"]
    end

    DEP["(c) 部署：G1 真机<br/>τ_safe 5–15 N 按钮可调（默认 10 N）<br/>拥抱 / 扶站 / 握手 / 托气球 / 视觉定制拥抱"]

    MOT --> DRV
    DRV --> INTG
    INT --> INTG
    INTG -->|"x_ref, ẋ_ref"| RW
    TEA --> RW
    RW --> STU --> DEP

    style REF fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style TR fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style DEP fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

> 关键设计：交互力**不是从仿真碰撞里读出来的**。物理引擎的接触力只在碰撞时出现，而且噪、局部、不协调；GentleHumanoid 直接在参考动力学里「造」出有结构的交互力，再在仿真里把同样的力施加到机器人身上，让策略学会复现参考。

---

## 🔧 方法详解

### 1. 问题建模：上半身多 link 阻抗系统

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：每个关键点一个虚拟质量，所有量都在机器人根坐标系里</summary>

论文把上半身建成多 link 阻抗系统，关键点在肩、肘、手（附录与代码里是肩、腕、手，见「源码对照」）。每个 link 的位置受两种力共同作用：

$$
M\ddot{x}_i=f_{\mathrm{drive},i}+f_{\mathrm{interact},i}
$$

$M$ 是每个 link 的标量虚拟质量，取 **0.1 kg**。所有位置 $x$、速度 $\dot x$ 都是机器人**根坐标系**下的三维笛卡尔量；策略本身输出关节空间的动作，由底层关节 PD 跟踪——把这些笛卡尔柔顺力「翻译」成关节动作，是 RL 要学的事。

附录 B 的完整形式多了一个积分阻尼项：$M\ddot{x}_t=f _ {\mathrm{drive}}+f _ {\mathrm{interact}}-D\dot{x}_t$，$D=2.0$。

</details>

### 2. 驱动力：朝目标动作的弹簧阻尼

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：K_p 由安全阈值决定、K_d 取临界阻尼</summary>

$$
f_{\mathrm{drive}}=K_p(x_{\mathrm{tar}}-x_{\mathrm{cur}})+K_d(v_{\mathrm{tar}}-v_{\mathrm{cur}}),\qquad K_d=2\sqrt{MK_p}
$$

附录 Table III 与代码都给出 $K_p=\tau _ {\mathrm{safe}}/0.05$：**偏离目标 5 cm 时驱动力正好等于安全阈值**。τ = 10 N 时 $K_p=200$ N/m、$K_d=2\sqrt{0.1\times200}\approx8.94$ N·s/m。

直观理解：参考动作不是「死命令」，而是一根把 link 温和拉回目标的弹簧；外界施力时允许偏移，但不会完全散掉。

</details>

### 3. 交互力：同一个弹簧、两种锚点

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：抵抗式 vs 引导式接触、从人类姿态采样锚点、单侧投影</summary>

$$
f_{\mathrm{interact}}=K_{\mathrm{spring}}\left(x_{\mathrm{anchor}}-x_{\mathrm{cur}}\right),\qquad
x_{\mathrm{anchor}}=\begin{cases}x_{\mathrm{cur}}(t_0), & \text{抵抗式接触}\\ x_{\mathrm{sample}}, & \text{引导式接触}\end{cases}
$$

- **抵抗式接触（resistive）**：机器人自己压到人或物体上。锚点固定在**刚接触那一刻**的 link 位置，继续偏离就产生回复力——像碰到一个有弹性的表面。
- **引导式接触（guiding）**：外部主体推 / 拉机器人的手臂。锚点从**人类动作数据集里的完整上半身姿态**采样（先预计算姿态分布，训练时选与当前多 link 位置接近的姿态，再随机取一个）。因为三个锚点来自同一个姿态，肩—肘—腕的受力方向天然协调，而不是各拉各的。
- **单侧投影**（附录 A-3）：只取位移在指定方向上的分量，且只在 link「压向锚点」时有力；离开接触侧力就归零，避免在空中凭空把手拽回去。

**为什么不直接用仿真碰撞力**：MuJoCo / IsaacGym 的接触力只在 rollout 里真的撞上时才出现，而且噪、局部、不协调，覆盖不了多样的交互场景。

</details>

### 4. 多样化的受力暴露

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：弹簧刚度、受力 link 组合、重采样与躯干净力限制</summary>

- **弹簧刚度**：$K _ {\mathrm{spring}}\sim U(5,250)$。
- **受力 link 组合**（论文正文）：40% 不加力；15% 双臂 6 个 link；30% 单臂 3 个 link（左右各 15%）；15% 只有单个 link。
- **重采样**：锚点与组合每 5 s 重采样一次，带短暂过渡保证连续（论文正文说法；代码的时间表更细，见「源码对照」）。
- **躯干净力限制**（附录 A-4，Table II）：单个 link 的交互力上限 30 N；把所有 link 的力 / 力矩加起来，若躯干处净力超过 30 N 或净力矩超过 20 N·m，就在躯干上施加反向的补偿力。

Fig. 3 显示这样造出的力方向铺满整个球面、大小 0–25 N；但肩部受力偏小——论文在局限里承认，这是人类动作数据本身肩部姿态变化少造成的。

</details>

### 5. 安全力阈值

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：按阈值截断驱动力、5–15 N 的取值依据、训练与部署时怎么设</summary>

驱动力随跟踪误差线性增长，不加限制就可能超过安全交互水平。于是

$$
f^{\mathrm{limited}}_{\mathrm{drive}}=\min\!\left(1.0,\ \frac{\tau_{\mathrm{safe}}}{\lVert f_{\mathrm{drive}}\rVert}\right)\cdot f_{\mathrm{drive}}
$$

训练时 $\tau _ {\mathrm{safe}}$ 在 $[F_1,F_2]=[5,15]$ N 里分段常值采样（论文说每 5 s 重采样），并作为观测提供给策略；部署时用户按任务调。

**取值依据**（§III-D）：最坏情况 0.5 × 0.5 cm 的接触面积（0.25 cm²）下，15 N 对应 60 N/cm²，仍低于 ISO/TS 15066 对躯干和手臂的疼痛起始限值（背 / 肩 160 N/cm²、胸 120 N/cm²）；更真实的拥抱接触约 16 cm²，5–15 N 对应 3–9 kPa，与儿童拥抱的测量（轻抱 < 7 kPa、用力抱约 18 kPa）和康复研究建议的 ≤ 13 kPa 相符。

**用法**：阈值越低越软越安全（握手、托气球用 5 N），越高越能给支撑（论文说扶人站起这类任务用更高的阈值，但没给该实验的具体数值）；拥抱人台实验用 10 N。

</details>

### 6. 教师—学生策略与奖励

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：参考动力学积分、两套观测、柔顺奖励三项与 Table I 权重</summary>

**参考动力学积分**（式 6–7）：

$$
\dot{x}^{\mathrm{ref}}_{t+1}=\dot{x}^{\mathrm{ref}}_t+\Delta t\cdot\frac{f_{\mathrm{drive}}+f_{\mathrm{interact}}}{M},\qquad x^{\mathrm{ref}}_{t+1}=x^{\mathrm{ref}}_t+\Delta t\cdot\dot{x}^{\mathrm{ref}}_{t+1}
$$

先更新速度、再用新速度更新位置（半隐式欧拉），固定步长 0.005 s。附录 B 补充：每个仿真步（0.02 s）积 4 个子步，并截断速度（4 m/s）和加速度（1000 m/s²）。

**教师—学生**：沿用 FACET 的架构与训练流程，师生都用 PPO。

- 学生观测：$o_t=(\tau _ {\mathrm{safe}},m _ {\mathrm{tar}},\omega,g,q^{\mathrm{hist}}_t,a _ {t-3:t-1})$——安全阈值、目标动作（未来根位姿与目标关节位置）、根角速度、投影重力、关节位置历史、最近 3 步动作；
- 教师额外的特权：$x^{\mathrm{ref}}_t,\dot{x}^{\mathrm{ref}}_t$、参考动力学预测的交互力 $f _ {\mathrm{interact}}$ 与仿真实测的 $f^{\mathrm{sim}} _ {\mathrm{interact}}$、各 link 离地高度、上一步关节力矩、累计跟踪误差；
- 两者都输出 $a_t\in\mathbb{R}^{29}$ 关节位置目标，50 Hz。

**柔顺奖励**（论文写法）：

$$
r_{\mathrm{dyn}}=\exp\!\left(-\frac{\lVert x^{\mathrm{sim}}_t-x^{\mathrm{ref}}_t\rVert^2}{\sigma_x}\right)+\exp\!\left(-\frac{\lVert\dot{x}^{\mathrm{sim}}_t-\dot{x}^{\mathrm{ref}}_t\rVert^2}{\sigma_v}\right),\quad
r_{\mathrm{force}}=\exp\!\left(-\frac{\lVert f_{\mathrm{interact}}-f^{\mathrm{sim}}_{\mathrm{interact}}\rVert^2}{\sigma_f}\right),\quad
r_{\mathrm{pen}}=-\mathbb{I}\!\left(\lVert f_{\mathrm{interact}}\rVert>\tau_{\mathrm{safe}}+\delta_{\mathrm{tol}}\right)
$$

$\delta _ {\mathrm{tol}}=10$ N，留出容差免得策略过度保守。

| 奖励 | 权重 |
|---|---|
| 参考动力学跟踪 | 2.0 |
| 参考力跟踪 | 2.0 |
| 不安全力惩罚 | 6.0 |
| 根跟踪 / 关节跟踪 | 0.5 / 1.0 |
| 存活 / 腾空时间 / 冲击力 / 打滑 | 5.0 / 10.0 / 4.0 / 2.0 |
| 动作变化率 / 关节速度 / 关节限位 | 0.1 / 5e-4 / 1.0 |

**数据**：用 GMR 重定向 AMASS、InterX、LAFAN，滤掉不符合交互场景的高动态动作，约 25 小时、50 Hz。**对照组**：Vanilla-RL（不加外力训练）与 Extreme-RL（末端最高 30 N 随机扰动训练，代表力自适应方法）。

</details>

---

## 🚶 具体实例：拥抱中手腕被人往外拉——参考动力学逐步算

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（8 节）：环境设定 / 第 1 步：参数 / 第 2 步：交互力 / 第 3 步：4 个子步 / 第 4 步：平衡点 / 第 5 步：三档阈值 / 第 6 步：奖励 / 第 7 步：压强与论文数字</summary>

> ⚠️ 本节把论文与开源代码的公式代入一个具体场景逐步算。**标「示意」的数字是我构造的**：一维化的拉力方向、锚点 +0.15 m、$K_s=150$ N/m、2 cm / 2 N 的奖励算例。其余参数取自附录 Table II / III 与训练仓库 `MotionTrackingCommand_impedance`、`AdmittanceMassChain`。我**没有运行**训练或部署代码。动画第 2–6 幕用的是同一组数字。

<h3 id="实例-环境设定">环境设定</h3>

- G1 正在执行拥抱动作，右手腕的目标位置（沿拉力方向取一维坐标）在 $x _ {\mathrm{tar}}=0$、目标速度 0；
- 被抱的人想挣开，往外拉手腕——建模成**引导式接触**：锚点在 $+0.15$ m、交互弹簧 $K_s=150$ N/m（示意，在 5–250 范围内）；
- 安全阈值 $\tau _ {\mathrm{safe}}=10$ N（论文拥抱实验的设定），参考点从静止开始。

<h3 id="实例-第-1-步参数">第 1 步：把参数算出来</h3>

| 量 | 算式 | 值 |
|---|---|---|
| 虚拟质量 $M$ | 附录 Table III | 0.1 kg |
| $K_p$ | $\tau _ {\mathrm{safe}}/0.05=10/0.05$ | 200 N/m |
| $K_d$ | $2\sqrt{MK_p}=2\sqrt{20}$ | 8.944 N·s/m |
| 积分阻尼 $D$ | Table III | 2.0 |
| 子步 | 4 × 0.005 s | 1 个 0.02 s 策略步 |

<h3 id="实例-第-2-步交互力">第 2 步：交互力怎么算（单侧投影）</h3>

代码里方向 $d$ 取「从锚点指向参考点」，$\mathrm{coef}=\min\big(0,\ (x _ {\mathrm{anchor}}-x)\cdot d\big)$，$f=K_s\cdot\mathrm{coef}\cdot d$。一维下 $d=-1$：

- 参考点在锚点内侧（$x<0.15$）：$f=K_s(0.15-x)>0$，把它往锚点拉；
- 参考点越过锚点（$x\ge0.15$）：$\mathrm{coef}$ 被截成 0，$f=0$——这就是「单侧」。

$x=0$ 时 $f=150\times0.15=22.5$ N（低于单 link 上限 30 N）。

<h3 id="实例-第-3-步4-个子步">第 3 步：第一个策略步的 4 个子步（半隐式欧拉）</h3>

每个子步：$f_d=\mathrm{clip}\big(K_p(0-x)+K_d(0-v),\ \pm10\big)$，$a=(f_d+f_i-Dv)/M$，$v\leftarrow v+a\,\Delta t$，$x\leftarrow x+v\,\Delta t$，$\Delta t=0.005$ s。

| 子步 | $f_d$ (N) | $f_i$ (N) | $a$ (m/s²) | $v$ (m/s) | $x$ (m) |
|---|---|---|---|---|---|
| 1 | 0.0 | 22.50 | 225.0 | 1.125 | 0.0056 |
| 2 | **−10.0**（原值 −11.19，被截断） | 21.66 | 94.06 | 1.595 | 0.0136 |
| 3 | −10.0 | 20.46 | 72.69 | 1.959 | 0.0234 |
| 4 | −10.0 | 18.99 | 50.73 | 2.212 | **0.0345** |

以第 2 步为例手算：$f_d=-200\times0.005625-8.944\times1.125=-1.125-10.062=-11.19$，截到 −10；$f_i=150\times(0.15-0.005625)=21.66$；阻尼 $-2\times1.125=-2.25$；$a=(-10+21.66-2.25)/0.1=94.06$。

**读法**：第一个 0.02 s 策略步结束时，参考点已经被拉出 3.45 cm——策略这一步要跟踪的就是这个「让开了一点」的位置，而不是原动作里的 0。

<h3 id="实例-第-4-步平衡点">第 4 步：继续积分，停在哪</h3>

继续积分（每 0.005 s 一步）：0.04 s 时 8.11 cm、0.06 s 冲到 11.27 cm（此时交互力只剩 6.4 N），之后回摆，约 0.25 s 时在 8.8 cm 附近，最终停在 **8.33 cm**。

平衡条件：若驱动力不截断，$K_px=K_s(0.15-x)\Rightarrow x=\frac{150\times0.15}{200+150}=6.43$ cm，此时驱动力 $200\times0.0643=12.86$ N > 10 N，**截断生效**；于是平衡改为 $K_s(0.15-x)=\tau _ {\mathrm{safe}}\Rightarrow x=0.15-10/150=8.33$ cm，**接触力正好是 10 N**。

<h3 id="实例-第-5-步三档阈值">第 5 步：换一个阈值会怎样</h3>

| $\tau _ {\mathrm{safe}}$ | $K_p$ | 不截断的平衡 | 截断后的平衡（让开） | 接触力 |
|---|---|---|---|---|
| 5 N | 100 | 9.00 cm（驱动力 9 N > 5） | **11.7 cm** | 5.0 N |
| 10 N | 200 | 6.43 cm（12.86 N > 10） | **8.3 cm** | 10.0 N |
| 15 N | 300 | 5.00 cm（15 N，正好不超） | **5.0 cm** | 15.0 N |
| 刚性跟踪（不让） | — | — | 0 cm | **22.5 N** |

**读法**：

1. 因为 $K_p=\tau _ {\mathrm{safe}}/0.05$，三档阈值的驱动力都在**偏离 5 cm 时封顶**；阈值决定的是「封顶的高度」。
2. 只要外力大到让驱动力封顶，平衡时的接触力就等于阈值——这就是论文说的「柔顺程度与用户设的力限一致、与姿态无关」的来源（我从式子推的）。
3. 刚性跟踪时这根弹簧要承受 22.5 N；论文仿真里 Vanilla-RL 的手部力「高于 20 N」，量级相符（只是量级对照，场景参数并不相同）。

<h3 id="实例-第-6-步奖励">第 6 步：奖励怎么给（按开源代码的核）</h3>

代码的奖励核是 $\exp(-e/\sigma)$，$e$ 是各 link 误差范数的平均，多个 $\sigma$ 时取平均（`_calc_exp_sigma`）；配置里 `force_target: [0.3]`、`force: [8.0, 4.0]`：

| 情况（示意） | 算式 | 奖励 |
|---|---|---|
| 仿真 link 与 $x _ {\mathrm{ref}}$ 差 2 cm | $\exp(-0.02/0.3)$ | 0.936 |
| 仿真实测力比参考力大 2 N | $[\exp(-2/8)+\exp(-2/4)]/2=(0.779+0.607)/2$ | 0.693 |
| 力超过 $\tau _ {\mathrm{safe}}+10=20$ N 且比参考力大 5 N 以上 | 该 link 计入惩罚比例 | × 6.0 |

论文把核写成 $\exp(-\lVert\cdot\rVert^2/\sigma)$，代码实际没有平方，这里按代码算。另外代码的力跟踪奖励在任一 link 超过 $\tau _ {\mathrm{safe}}+10$ N 时直接清零。

<h3 id="实例-第-7-步压强与论文数字">第 7 步：压强与论文里的几个数</h3>

| 换算 | 算式 | 结果 |
|---|---|---|
| 最坏接触面积下的压强 | $15\ \mathrm{N}/0.25\ \mathrm{cm^2}$ | 60 N/cm²（ISO：胸 120、背 / 肩 160） |
| 拥抱接触的压强 | $5$–$15\ \mathrm{N}/16\ \mathrm{cm^2}$，1 N/cm² = 10 kPa | 3.1–9.4 kPa（康复建议 ≤ 13 kPa） |
| 压力垫一个 taxel 的面积 | 6 mm × 6 mm | 36 mm² |
| 100 kPa 对应的力 | $100\times10^3\times36\times10^{-6}$ | 3.6 N |
| 真机推手腕 Extreme / Vanilla | $51.14/24.59$ | 约 2.08 倍 |
| 期望受力 link 数（论文正文口径） | $0.15\times6+0.30\times3+0.15\times1$ | 1.95 |
| 期望受力 link 数（代码口径，子集里每个 link 50%） | $0.15\times6+0.15\times3\times2+0.15\times6\times0.5$ | 2.25 |

</details>

---

## 📊 实验与结果

### 1. 仿真：拥抱中被往外拉（Fig. 4）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：手部力约 10 N vs 基线 13–20 N 以上；肘 / 肩 7–10 N vs 15–20 N</summary>

在拥抱参考上施加一个「把机器人往外拉」的外力，模拟被抱的人想挣开：

- **手部**：GentleHumanoid 稳定在约 10 N；Vanilla-RL 稳定在 20 N 以上；Extreme-RL 超过 13 N。
- **肘 / 肩**：基线很快饱和到 15–20 N、响应僵硬；GentleHumanoid 保持在 7–10 N 附近。

这些数字是论文对 Fig. 4 曲线的文字描述，没有表格。

</details>

### 2. 真机：静态姿态下推拉手腕（Fig. 5）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Mark-10 测峰值力 51.14 / 24.59 N；柔顺与姿态无关、与设定阈值一致</summary>

机器人基座静止，用手持测力计（Mark-10 M5-10）在手腕施力并记录峰值：

- 两个基线都硬顶：手臂不动、躯干被带着走，常导致失衡。Extreme-RL 需要峰值 **51.14 N**，Vanilla-RL 需要 **24.59 N**；
- GentleHumanoid 用小得多的力就能把手臂推开，同时保持平衡；
- **与姿态无关**：不同手臂位形下，同样的力就能调整手臂位置；**与设定阈值一致**：设 10 N 时，机器人在各个姿态下都在这个阈值附近保持平衡，有效范围 5–15 N。论文把这种一致性归功于「用虚拟弹簧阻尼 + 安全阈值调柔顺，而不是靠原始关节力学」。

</details>

### 3. 真机：抱人台（Fig. 6）与托气球

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：40 个电容 taxel 的压力垫、对齐与错位两种条件；5 N 托气球</summary>

- **拥抱人台**：人台腰部贴定制的压力垫（40 个标定过的电容 taxel），分「正确对齐」和「故意错位」两种条件；GentleHumanoid 设 τ = 10 N。标定用电动平台 + PDMS 施压头，把归一化读数映射到测力计测得的真实压强；局部接触时每个 taxel 的有效面积按 6 mm × 6 mm 算。结果：GentleHumanoid 在错位时也保持有界、平稳的力；Vanilla-RL 与 Extreme-RL 出现更高、更难预测的力，或者维持不住动作（图注说基线会产生局部高压峰值，尤其是 Vanilla-RL）。
- **托气球**：阈值设 5 N。GentleHumanoid 托住气球不损坏；两个基线挤压过度，最后 G1 失衡把气球弄掉（Fig. 1d）。

</details>

### 4. 更多应用

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：遥操作行走 + 触发动作、视觉定制拥抱、手机视频 → G1</summary>

1. **遥操作**：接入 G1 的行走遥操作框架，用手柄控制行走并触发拥抱、扶站、搬物等预定义动作（论文把扩展到 TWIST 这类全身遥操作列为未来工作）。
2. **自主、按体型定制的拥抱**（附录 C）：动捕（帽子上的标记）给出人的位置和身高；G1 头部 RGB 相机单图估计人体网格（BEDLAM 方法），按真实身高缩放后提取腰部目标点；再优化上半身关节角与平面基座位姿 $(x,y,\psi)$，让手到后腰、肘到对侧腰等 link—目标对对齐，躯干朝向人（前向偏移约 5 cm），并用 $\lVert q-q_0\rVert^2$ 正则贴近中立姿态。先用一个行走策略走到人正前方 10 cm 处，再切换到 GentleHumanoid 执行拥抱。
3. **手机视频 → G1**（附录 D）：单目视频经 PromptHMR 估计 SMPL-X 动作、GMR 重定向，再用训练好的策略执行；即使估计的参考有脚滑等噪声，也能稳定地与枕头、气球、不同大小的篮子交互。

</details>

---

## 📁 源码对照

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：两个仓库的目录、论文 ↔ 代码对照表、关键参数、训练 / 部署命令、论文与代码的出入</summary>

<h3 id="源码-两个仓库">两个仓库</h3>

```text
gentle-humanoid-training/                     # Isaac Sim 4.5 + Isaac Lab v2.2，自带 PPO（active-adaptation）
├── train.sh                                  # train（教师）→ adapt（学生）→ finetune（学生）三段
├── cfg/task/G1/G1.yaml                       # step_dt 0.02、isaac_physics_dt 0.005、num_envs 16384
├── cfg/task/G1/G1_gentle.yaml                # ★ 本文方法：MotionTrackingCommand_impedance + 柔顺奖励
├── cfg/task/G1/G1_no_force.yaml              # Vanilla-RL：max_force 0，compliance False
├── cfg/task/G1/G1_extreme_force.yaml         # Extreme-RL：max_force 30，compliance False（随机扰动）
├── active_adaptation/envs/mdp/commands/
│   ├── motion_tracking.py                    # ★ MotionTrackingCommand_impedance（力的调度、锚点、积分、奖励）
│   └── admittance.py                         # ★ AdmittanceMassChain（虚拟质量的半隐式欧拉积分）
└── scripts/data_process/hand_grid_samples.pt # ★ 引导式接触的锚点库：每侧 5414 组（肩、腕、手）位置

gentle-humanoid/                              # 部署
├── src/deploy.py / sim2sim.py / motion_select.py
├── src/observation.py                        # force_limit 默认 10 N，范围 5–15，每按一次 ±1 N
├── config/controller.yaml                    # control_freq 50
└── assets/ckpts/G1/policy.onnx               # 预训练学生策略（输入 450 维）
```

<h3 id="源码-论文与代码对照">论文 ↔ 代码对照</h3>

| 论文 | 代码 | 备注 |
|---|---|---|
| 式 1 虚拟质量 + 附录 B 阻尼 | `AdmittanceMassChain(mass=0.1, damping=2.0, vel_clip=4.0, acc_clip=1000.0, dt=physics_dt)` | `step()`：`v = v + a*dt`，`x = x + v*dt`（半隐式） |
| 4 个子步 | `for _ in range(4): ... self.admit.step(...)` | 每个 0.005 s，合计一个 0.02 s 策略步 |
| 式 2 + $K_p$ | `K_p_drive = force_limit / 0.05`，`K_d_drive = 2*sqrt(K_p_drive*0.1)` | |
| 式 5 截断 | `F_drive_b = clamp_norm(..., max=force_limit)` | |
| 式 3 交互力 + 单侧投影 | `F_ext_b = clamp_norm(force_kp_scaled * project_pos_diff(origin - x, dir), max_force)` | `project_pos_diff`：`coef.clamp_max(0.0) * dir` |
| 引导式锚点 | `sample_origin()` 从 `hand_grid_samples.pt` 随机取一组（躯干系 → 根系） | 每侧概率 `force_origin_sample_prob = 0.5`，否则锚点 = 当前位置（抵抗式） |
| 锚点过渡 | `force_origin_tl.set(..., total_steps=25–100)` | 线性插值 0.5–2 s |
| $K _ {\mathrm{spring}}\sim U(5,250)$ | `kp_range = (5.0, 250.0)`，之后按 `kp_slope_range = (-5, 5)` 每步漂移 | 一半概率斜率为 0 |
| 躯干净力 / 力矩限制 | `_limit_net_wrench_about_torso()`，`net_force_limit 30`、`net_torque_limit 20` | 超出部分在躯干补反向力 |
| $\tau _ {\mathrm{safe}}$ 随机 + 观测 | `force_safe_bounds = (5.0, 15.0)`，`command()` 最后一维就是当前阈值 | |
| 三项柔顺奖励 | `force_target_tracking`(2.0)、`force_target_vel_tracking`(1.0)、`force_reward`(2.0)、`force_exd_penalty`(6.0) | 论文的「参考动力学跟踪」在代码里拆成位置 / 速度两项 |
| $\delta _ {\mathrm{tol}}=10$ N | `force_penalty_offset = 10.0` | 惩罚还要求比参考力大 5 N |

<h3 id="源码-跑起来">跑起来（README 实录）</h3>

```bash
# 训练（4 × A100 约 5 小时；train.sh 里依次跑 train → adapt → finetune）
bash generate_dataset.sh          # 先用改过的 GMR 导出 npz，再生成数据集
bash train.sh                     # 默认 G1/G1_gentle；取消注释可训 G1_no_force / G1_extreme_force

# 评估 / 导出 ONNX
python scripts/eval.py --run_path ${wandb_run_path} -p
python scripts/eval.py --run_path ${wandb_run_path} -p --export

# 部署仓库：sim2sim（MuJoCo）
python3 src/sim2sim.py --xml_path assets/g1/g1.xml
python3 src/deploy.py --net lo --sim2sim     # s 回默认姿态、a 启动策略、u / d 调阈值（默认 10 N）
# 真机
python3 src/deploy.py --net <robot_iface> --real   # 手柄 up / down 调阈值，select 急停
```

sim2sim 窗口里可以双击某个 link、Ctrl + 右键拖动给它施加外力，直接感受柔顺效果。

<h3 id="源码-论文与代码的出入">论文与代码的出入（我核对到的）</h3>

1. **施力的 link**：论文正文说肩、肘、手；附录 A 说肩、腕、手；代码是 `shoulder_yaw_link`、`wrist_roll_link`、`hand_mimic`——与附录一致，**没有肘**。
2. **受力组合**：正文写「15% 只有单个 link」；代码第 5 种模式是随机子集（每个 link 50% 概率），与附录 A-1 的「random partial subset」一致。
3. **时间表**：正文说锚点、组合和阈值每 5 s 重采样；代码里一段受力持续 20–200 步（0.4–4 s），阈值每 100–200 步（2–4 s）重采样并在 25–100 步内渐变。
4. **锚点采样**：正文说「选与当前多 link 位置接近的姿态再随机取」；开源代码是从 5414 组里**均匀随机**取一组，没有「接近」这一步。
5. **奖励核**：论文写 $\exp(-\lVert\cdot\rVert^2/\sigma)$；代码是 $\exp(-\lVert\cdot\rVert/\sigma)$，且多个 $\sigma$ 取平均。
6. **积分方式**：正文写半隐式欧拉、步长 0.005 s；附录 B 写「explicit Euler」、Table III 写「时间步与仿真 dt = 0.02 s 相同、4 个子步」。代码是半隐式欧拉，每个子步用 `physics_dt = 0.005`，4 个子步合起来正好 0.02 s——两处附录表述容易读岔，以代码为准。
7. **教师课程**：代码在教师阶段（`student_train=False`）把非零受力模式的概率从 15% × 25% 起步、在训练进度 60% 前线性升到 15%（`step_schedule`），论文没提。

</details>

### 源码运行时序（mermaid）

<div class="mermaid">
sequenceDiagram
    autonumber
    participant E as 环境步（50 Hz）
    participant C as MotionTrackingCommand_impedance
    participant A as AdmittanceMassChain
    participant S as Isaac 物理（4 × 0.005 s）
    participant P as 策略

    E->>C: before_update()
    C->>C: force_schedule()：抽受力组合 / K_s / τ_safe，锚点开始过渡
    C->>C: 锚点：hand_grid_samples（引导）或当前位置（抵抗）
    loop 4 个子步
        C->>A: F_drive = clamp_norm(K_p Δx + K_d Δv, τ_safe)<br/>F_ext = clamp_norm(K_s · 单侧投影, 30 N)
        A->>A: v += a·dt；x += v·dt
    end
    A-->>C: x_ref（force_keypoint）
    P->>E: 29 维关节目标
    loop 每个物理子步
        C->>S: force_apply()：同样的弹簧力施加到仿真 link 上
        C->>S: 躯干净力 / 力矩超限 → 补反向力
    end
    S-->>C: 实测 link 位置、速度、力
    C-->>P: 奖励：跟 x_ref、跟参考力、超 τ_safe+10 N 罚
</div>

---

## 🧩 与本仓库其他笔记的关系

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：CHIP / HAFO / TWIST / SafeHumanoid 等柔顺与力控路线怎么分工</summary>

| 笔记 | 与 GentleHumanoid 的关系 |
|---|---|
| [CHIP](../CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html) | 同样给跟踪控制器加可控柔顺，但用「事后扰动」给末端刚度；GentleHumanoid 用阻抗参考动力学，覆盖肩 / 腕 / 手多 link |
| [HAFO](../HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact/HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact.html) | 也用弹簧阻尼虚拟外力显式建模，但目标是强交互下的力自适应；GentleHumanoid 目标是「轻」，并有安全阈值 |
| [TWIST](../../07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html) | 同组的全身遥操作；奖励设计参考了它，论文把与 TWIST 结合列为未来工作 |
| [Retargeting Matters（GMR）](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) | 训练数据与视频 → G1 管线都用 GMR 重定向 |
| [SafeHumanoid](../../06_Manipulation/SafeHumanoid__VLM-RAG-driven_Control_of_Upper_Body_Impedance/SafeHumanoid__VLM-RAG-driven_Control_of_Upper_Body_Impedance.html) / [HumanoidVLM](../../06_Manipulation/HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation/HumanoidVLM_Vision-Language-Guided_Impedance_Control_for_Contact-Rich_Humanoid_Manipulation.html) | 由 VLM 按场景选阻抗参数；GentleHumanoid 的 τ_safe 正是这类上层可以调的旋钮（论文也提到未来接视觉语言模型） |
| [HumanPlus](../../03_High_Impact_Selection/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html) / [OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html) | 论文批评的「刚性跟踪」代表：全身跟踪做得好，但接触时把外力当扰动 |

</details>

---

## 💡 核心贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：统一的交互力建模、力阈值机制、拥抱压力评测装置</summary>

1. **GentleHumanoid 框架**：把阻抗控制与动作跟踪结合，实现带上半身柔顺的全身控制；核心是统一的交互力建模，覆盖抵抗式与引导式接触，并从人类动作数据采样，保证运动学一致、覆盖多样交互场景。
2. **力阈值机制**：把交互力维持在安全范围内，使物理人机交互更舒适、更安全，阈值可按任务调。
3. **拥抱评测装置**：为拥抱定制的压力感测垫，可靠测量分布式接触力；在仿真与 G1 真机上，于拥抱、扶站、物体操作中都比基线更安全、更平滑、适应性更强。

</details>

---

## ⚠️ 局限与可改进点

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据覆盖、弹簧近似、1–3 N 超调、依赖动捕，以及开源部分的缺口</summary>

1. **数据覆盖**：力分布受人类动作数据限制，例如肩部受力偏小；加入舞蹈等更丰富的动作可能改善。
2. **接触物理简化**：弹簧力提供了结构化覆盖与运动学一致性，但不含摩擦、人体组织黏弹性等真实接触的复杂性。
3. **sim-to-real 残差**：真机偶有 **1–3 N** 超调；更精细的力调节可能需要触觉传感。
4. **依赖动捕**：人的定位与身高目前来自动捕，换成视觉管线才能更自主，尤其是长时任务。
5. **开源缺口**（部署仓库 TODO）：从 RGB 视频到 G1 部署的完整流程、行走与动作跟踪的切换模块尚未放出。
6. **定量评估有限**：仿真与真机对比的数字多来自图和正文描述，没有多次重复的统计表；扶人站起只有定性展示。

</details>

---

## 🎤 面试参考

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七个高频问题：为什么要参考动力学、两种接触、为什么从人类姿态采样、阈值怎么起作用……</summary>

**Q：为什么不直接在奖励里罚接触力，而要搞一套「参考动力学」？**
A：只罚力只告诉策略「别用力」，没告诉它「被推时应该怎么动」。参考动力学把阻抗规则（被拉多少就让多少、多快恢复）显式积分成一条参考轨迹，策略只要跟住它，就等价于表现出这个阻抗；再配参考力跟踪和不安全力惩罚，就同时约束了运动与力。

**Q：抵抗式和引导式接触的区别？**
A：抵抗式是机器人压到别人身上，锚点固定在刚接触的位置，继续压就被弹回；引导式是别人推拉机器人，锚点从人类手臂姿态里采样，代表「对方想把你的手臂带到那里」。两者用同一个弹簧公式，只是锚点来源不同。

**Q：为什么引导式锚点要从完整的人类手臂姿态采样？**
A：如果给肩、肘 / 腕、手各自独立地随机施力，三个点的受力方向可能互相矛盾，学到的是不协调的反应。从同一个人类姿态取三个锚点，力沿运动链是一致的——像一个人真的在拉你的整条手臂。

**Q：安全阈值是怎么让「柔顺程度可调」的？**
A：驱动力按 τ_safe 截断，而且 $K_p=\tau _ {\mathrm{safe}}/0.05$。外力足够大时驱动力封顶，平衡状态下接触力就等于 τ_safe，所以用户设多少，机器人大致就「顶」多少；阈值同时作为观测喂给策略，训练时在 5–15 N 随机，部署时可以直接调。

**Q：学生看不到力，怎么表现出柔顺？**
A：教师有参考动力学状态和实测交互力等特权；学生只有本体历史、动作历史和阈值。外力会反映在关节位置历史的偏差上，学生从历史里隐式推断「现在被推了多少」，再按教师学到的阻抗规律输出动作（这是我的理解；论文只说沿用 FACET 的教师—学生架构）。

**Q：Extreme-RL 训练时见过 30 N 的外力，为什么反而最硬？**
A：它见过大力，但学到的是「扛住」：目标仍是跟住参考，外力只是要抵消的扰动，所以测力计要 51.14 N 才推得动。GentleHumanoid 的目标本身就包含「按阻抗规则让开」。

**Q：这套方法最大的风险在哪？**
A：交互力是造出来的弹簧，不含摩擦与人体组织的黏弹性；上半身之外（腿、躯干）不柔顺；真机有 1–3 N 超调。另外论文与开源代码在施力 link、组合方式、奖励核上有几处出入，复现时要以代码为准。

</details>

---

## 🔗 相关笔记与外链

- [CHIP](../CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html) · [HAFO](../HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact/HAFO__A_Force-Adaptive_Control_Framework_for_Humanoid_Robots_in_Intense_Interact.html) — 其他柔顺 / 力自适应路线
- [TWIST](../../07_Teleoperation/TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html) · [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) — 同组的遥操作与重定向工具
- [SafeHumanoid](../../06_Manipulation/SafeHumanoid__VLM-RAG-driven_Control_of_Upper_Body_Impedance/SafeHumanoid__VLM-RAG-driven_Control_of_Upper_Body_Impedance.html) — 由 VLM 决定上半身阻抗
- 官方仓库：[训练](https://github.com/Axellwppr/gentle-humanoid-training) · [部署](https://github.com/Axellwppr/gentle-humanoid) · [在线演示](https://gentle-humanoid.axell.top/#/demo) · [视频](https://www.youtube.com/watch?v=rF6N2o0IQJg)
- 前作：[FACET（arXiv 2505.06883）](https://arxiv.org/abs/2505.06883) — 本文沿用的教师—学生阻抗参考跟踪架构

---

## 📚 引用（BibTeX 备忘）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX</summary>

```bibtex
@article{lu2025gentlehumanoid,
  title   = {GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction},
  author  = {Lu, Qingzhou and Feng, Yao and Shi, Baiyu and Piseno, Michael and Bao, Zhenan and Liu, C. Karen},
  journal = {arXiv preprint arXiv:2511.04679},
  year    = {2025}
}
```

</details>

---

> 备注：本笔记基于 arXiv v1 全文（2025-11-06）与两个官方仓库的 `main`（2025-12）整理。论文数字直接取自正文、图注与附录 Table I–III；代码参数取自仓库，可能随更新而变化。文中「示意 / 我从式子推的 / 我核对到的」标出的部分不是论文原文。
