---
layout: paper
title: "FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation"
zhname: "FALCON：力自适应的人形移动操作"
category: "Loco-Manipulation and WBC"
arxiv: "2505.06776"
---

# FALCON: Learning Force-Adaptive Humanoid Loco-Manipulation
**把全身拆成上身、下身两个 RL 智能体，但让两者看同一份全身本体感受一起训练；再按关节力矩上限算出末端「最多能吃多大的力」，用逐步加大的 3D 外力课程逼策略学会隐式补偿——推车、开门、搬重物不用力传感器**

> 📅 阅读日期: 2026-10-05
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 力自适应 · 双智能体 RL · 力课程
>
> 🧭 状态: 精读版；数值均取自 arXiv v2 正文、表 1–6 与附录。

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| **arXiv** | [2505.06776](https://arxiv.org/abs/2505.06776) |
| **项目主页** | [lecar-lab.github.io/falcon-humanoid](https://lecar-lab.github.io/falcon-humanoid/) |
| **代码** | [LeCAR-Lab/FALCON](https://github.com/LeCAR-Lab/FALCON) |
| **作者** | Yuanhang Zhang, Yifu Yuan, Prajwal Gurunath, Ishita Gupta, Shayegan Omidshafiei, Ali-akbar Agha-mohammadi, Marcell Vazquez-Chanlatte, Liam Pedersen, Tairan He, Guanya Shi |
| **机构** | Carnegie Mellon University；Field AI；Nissan USA |
| **发布时间** | 2025-05-10 |
| **机器人** | Unitree G1、Booster T1 |
| **关键词** | Humanoid loco-manipulation, force adaptation, dual-agent RL, force curriculum |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

FALCON 解决的是「手上有力」的移动操作：推车时手被往后拽、开门时手被往侧面带、搬箱子时手被往下压，这些力会顺着手臂传到躯干和腿。它的做法是**上身、下身各一个 PPO 智能体，奖励分开、观测共享**，并在训练时往两只手上施加**按力矩上限算出来的、逐步加大的 3D 外力**。策略从本体感受历史里隐式推断外力并补偿，部署时不需要力传感器或力估计器。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| **FALCON** | Force-Adaptive Humanoid Loco-Manipulation | 本文方法名 |
| **EE** | End-Effector | 末端执行器，这里指两只手腕末端 |
| **Lower-RL-Upper-IK** | — | 下身 RL 走路、上身逆运动学 + PD 跟手的解耦范式（HOMIE 属于这一类） |
| **M-WB-RL** | Monolithic Whole-Body RL | 一个策略管全身所有关节的范式（Expressive WBC、HOVER 属于这一类） |
| **IK / ID** | Inverse Kinematics / Inverse Dynamics | 逆运动学 / 逆动力学 |
| **PPO** | Proximal Policy Optimization | 两个智能体各自用 PPO 更新 |
| **AMASS** | Archive of Motion Capture as Surface Shapes | 训练时上身目标姿态从这里采样 |

---

## ❓ FALCON 要解决什么问题？

论文把已有的人形移动操作分成两类，各有一个毛病：

1. **Lower-RL-Upper-IK**（PMP、HOMIE）：下身是 RL，上身用 IK 求关节目标再交给 PD。样本效率高，但上身**没有力补偿**——手上一受力，PD 只能事后被动地追误差，而且上下身之间没有全身动力学协调。
2. **Monolithic Whole-Body RL**（Expressive WBC、HOVER 的设计）：一个策略输出全身动作，表达力够，但动作空间大、走路和操作两个目标关联很弱，探索效率低，容易出现一半身体「压过」另一半的情况。

此外，四足移动机械臂上已有不少力自适应工作，但人形更难：更不稳、更复杂、**关节力矩上限更紧**（G1 的手腕尤其弱）。FALCON 的目标是让人形在 **0–100 N、最高约体重 30%** 的未知末端外力下，既走得稳又跟得准。

---

## 🔧 方法详解

### 1. 统一的目标空间

全身关节分成下身 $n_l$ 个和上身 $n_u$ 个。本体感受取 5 步历史：

$$
s^p_t = [\,q_{t-4:t},\ \dot q_{t-4:t},\ \omega^{root}_{t-4:t},\ g_{t-4:t},\ a_{t-5:t-1}\,]
$$

目标分两部分：

- **移动目标** $G^l_t$：根的线 / 角速度、站立标志、根高度、腰部偏航角；
- **操作目标** $G^u_t$：上身（肩、肘、腕）目标关节角 $q^{upper*}_t$。训练时从 AMASS 随机采样，部署时由 IK 根据手的目标位姿算出来。

### 2. 双智能体：奖励分开，观测共享

$$
r^l_t = R^l(s^p_t, G^l_t), \qquad r^u_t = R^u(s^p_t, G^u_t)
$$

- 下身智能体 $\pi^l$ 只拿移动奖励（速度、高度、腰部跟踪、步态启发），上身智能体 $\pi^u$ 只拿上身关节跟踪奖励；两者各有自己的价值函数，各自用 PPO 更新。
- **关键在于两者看同一份全身本体感受**，并且**一起训练**：上身能感知到步态变化，下身能根据手上负载调整支撑。论文强调这和「分别训好再拼起来」不同。
- 动作拼成 $a_t = [a^l_t;\ a^u_t]$ 交给关节 PD。
- 非对称 actor-critic：critic 额外看根线速度和末端外力 $F^{ee}_t$，部署时不用。

### 3. 按力矩上限算力的 3D 外力课程

这是论文第二个核心设计，三条原则：

**（1）先算「最多能施加多大的力」**。设末端雅可比 $J _ {EE}$、关节力矩上限 $\tau^{lim}$、重力补偿力矩 $\tau^g$，要求

$$
-\tau^{lim} \le \tau^g + J_{EE}^\top f^{ee} \le \tau^{lim}
$$

对每个坐标轴 $i \in \{x, y, z\}$ 取各关节的最坏情况：

$$
f^{max}_i = \min_j \frac{\tau^{lim}_j - \tau^g_j}{\lvert J^{ji}_{EE} \rvert + \epsilon}, \qquad
f^{min}_i = \max_j \frac{-\tau^{lim}_j - \tau^g_j}{\lvert J^{ji}_{EE} \rvert + \epsilon}
$$

再用 Dirichlet 分布采样三轴比例 $\gamma = (\gamma_x, \gamma_y, \gamma_z)$（和为 1），每轴力在 $[\gamma_i f^{min}_i,\ \gamma_i f^{max}_i]$ 里均匀采样。左右手的上身姿态不同，可施加的力也可能不同。

**（2）逐步加大**：施加的力是 $F^{ee}_t = \alpha_g \cdot f^{ee}_t$，全局系数 $\alpha_g \in (0, 1)$ 随训练增大；走路时水平分量投影到与速度相反的方向，并做低通滤波防抖。

**（3）施力位置随机**：力的作用点在腕偏航连杆到末端之间随机。作用点变了，雅可比映射就变了——这也是论文认为显式力估计 + 逆动力学补偿在真机上不够用的原因（附录 A.3：估计出的力再准，作用点一变补偿项 $J^\top _ {EE}\tilde F$ 就不对，还得靠力传感器定位）。

### 4. 训练细节

- 奖励在 OmniH2O / Expressive WBC 的基础上加了髋位置、负膝角、站立踏脚、站立根位置、踝滚转等惩罚，以及根速度、行走高度、腰部、上身关节的跟踪奖励（表 5）。
- 域随机化（表 6）：摩擦 $U(0.5, 1.25)$、连杆质量 ×$U(0.9, 1.2)$、基座质量 $U(-1, 3)$ kg、P/D 增益 ×$U(0.9, 1.1)$、控制延迟 $U(0, 20)$ ms、每 5 s 推一次（1 m/s）。
- 同一套训练设置在 G1 和 T1 上都能用，论文强调**不需要针对机器人调奖励或课程**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
  subgraph TRAIN["训练（IsaacGym）"]
    P["全身本体感受<br/>5 步历史"] --> L["下身智能体<br/>速度 / 高度 / 腰部奖励"]
    P --> U["上身智能体<br/>关节跟踪奖励"]
    C["力矩上限 → 每轴最大力<br/>Dirichlet 分配三轴"] --> F["末端外力<br/>系数逐步加大"]
    F --> SIM["仿真"]
    L --> SIM
    U --> SIM
    SIM --> P
  end
  subgraph DEPLOY["部署"]
    T["遥操作 / 摇杆<br/>或 FoundationPose + IK"] --> G["上身目标关节角<br/>根速度与高度"]
    G --> L2["下身智能体"]
    G --> U2["上身智能体"]
  end
  L --> L2
  U --> U2
</div>

---

## 🚶 具体实例：手腕最多能吃多大的力

下面用一个**两关节的玩具例子**走一遍第 3 节的公式（数字是我编的，用来说明计算方式，不是 G1 的真实参数）。

设某只手腕链路上两个关节：力矩上限 $\tau^{lim} = (5, 5)$ N·m，当前姿态下的重力补偿力矩 $\tau^g = (1, -1)$ N·m，雅可比在 $x$ 方向那一列的绝对值 $\lvert J^{\cdot x} _ {EE} \rvert = (0.2, 0.1)$ m。

| 关节 $j$ | $(\tau^{lim}_j - \tau^g_j) / \lvert J^{jx} \rvert$ | $(-\tau^{lim}_j - \tau^g_j) / \lvert J^{jx} \rvert$ |
|---|---|---|
| 1 | $(5 - 1) / 0.2 = 20$ | $(-5 - 1) / 0.2 = -30$ |
| 2 | $(5 + 1) / 0.1 = 60$ | $(-5 + 1) / 0.1 = -40$ |
| 取值 | $f^{max}_x = \min = 20$ N | $f^{min}_x = \max = -30$ N |

关节 1 的余量最先用完，所以它决定了 $x$ 方向的上限。若 Dirichlet 采到 $\gamma = (0.5, 0.3, 0.2)$，则 $x$ 方向的力在 $[0.5 \times (-30),\ 0.5 \times 20] = [-15, 10]$ N 里均匀采样；课程走到 $\alpha_g = 0.6$ 时，实际施加的范围是 $[-9, 6]$ N。

这个算法的意义在第 4 节的对照里：**不考虑力矩上限、在固定范围（$\pm 100$ N）里乱采样**时，经常出现力矩打满的情况，课程卡在 $\alpha_g = 0.6$ 推不上去（论文图 3a），上身跟踪误差也明显更大。

---

## 📊 实验结果

**仿真对比（表 1，IsaacGym，G1，252 段 ACCAD 动作目标）**：三档外力为无力（$\alpha_g = 0$）、中等（0.5）、大力（1.0）。论文没有给误差单位。

| 方法 | 上身误差（大力） | 根速度误差（大力） |
|---|---|---|
| Lower-RL-Upper-IK：PD + 力课程 | 1.42 | 0.46 |
| Lower-RL-Upper-IK：PID + 力课程 | 0.60 | 0.46 |
| Lower-RL-Upper-IK：PD + 力估计 + 逆动力学 | 0.53 | 0.47 |
| M-WB-RL + 力课程 | 0.73 | 0.44 |
| **FALCON + 力课程** | **0.37** | 0.45 |
| FALCON 不加力课程 | 1.06 | 1.24 |

- 大力档下，FALCON 的上身误差约为 PID 基线的 0.6 倍、M-WB-RL 的一半，对应摘要里「上身跟踪精度提升 2 倍」。
- 根速度误差各方法差不多，FALCON 的优势主要在上身。
- 力课程对所有方法都有帮助，但 FALCON 受益最多：不加力课程时它在大力档的上身误差是 1.06。

**力矩感知课程（表 2）**：大力档上身误差 0.36 vs 0.61（不考虑力矩上限）。

**训练效率（图 4、5）**：FALCON 的动作噪声标准差下降更快更平稳；M-WB-RL 的躯干朝向与踝滚转惩罚更大，真机上会出现不自然的弯腰和重心偏斜。

**真机跟踪（表 4，G1，每只手 1.2 kg，0.5 m/s 前进）**：

| 方法 | 上身误差 | 根速度误差 |
|---|---|---|
| Upper-PD + 力课程 | 1.81 | 0.40 |
| M-WB-RL + 力课程 | 0.81 | 0.58 |
| **FALCON** | **0.39** | 0.42 |

**真机任务**：搬运（0–20 N 竖直力）、拉车（最高 100 N 水平力）、开门（站立时最高 40 N 的 3D 力），G1 和 T1 都能做。用测力计测到的峰值：拉车 107.9 N、开门 47.3 N、站立抗拉 G1 57.4 N / T1 66.3 N（附录 A.4）。另外还演示了自主搬周转箱：动捕定位 + FoundationPose 估计箱子位姿 + IK 求抓取，状态机切换四个阶段。

---

## ⚠️ 局限（论文第 6 节与附录 A.6）

1. **只考虑末端受力**：没有处理身体其他部位的接触和多点接触（靠墙、抵住、协作抬举）。
2. **只有力没有力矩**：拧把手、偏心负载这类转动扰动处理不了。
3. **电机发热**：真机长时间大力矩会让腕部电机过热，默认姿态下每只手只能稳定搬 2 kg 左右；同一策略在 MuJoCo 里（只裁剪力矩、不建模发热）能搬 3 kg 以上。
4. **任务层仍靠外部模块**：自主搬箱依赖动捕定位和手写状态机，FALCON 本身只负责执行给定目标。

---

## 🤖 工程价值

1. **「拆奖励、不拆观测」**：上下身目标关联弱，硬放进一个策略探索低效；完全分开又失去协调。共享观测 + 联合训练是一个简单的折中，后续 SoFTA（Hold My Beer）也采用上下身双智能体共享观测的结构。
2. **课程要尊重硬件**：外力随机化不是越大越好，超出力矩可行域的样本只会让课程卡住。用雅可比和力矩上限算可行范围，这个思路可以搬到任何「对末端施加扰动」的训练里。
3. **隐式力补偿**：不依赖力传感器，靠本体感受历史推断负载，和 RMA 一类「从历史推断环境」的思路一脉相承（这句是我的类比）。

---

## 🎤 面试高频问题 & 参考回答

**Q1：FALCON 为什么不直接用一个全身策略？**

A：走路和操作的目标关联很弱，一个策略要在很大的动作空间里同时探索两件事，样本效率低，而且容易让一半身体主导。论文图 4 显示单策略的动作噪声下降慢、躯干和踝部惩罚大。拆成两个智能体后，各自的奖励更聚焦；共享观测保证它们仍能感知对方。

**Q2：为什么上身不用 IK + PD，而要用 RL？**

A：IK + PD 只能被动追误差，手上一受力就跟不准（表 1 里 PD + 力课程在大力档上身误差 1.42）。RL 策略能从本体感受历史里推断外力并主动补偿；即使加积分项或用力估计 + 逆动力学补偿，误差也只降到 0.53–0.60，而且作用点一变补偿就失准。

**Q3：力课程为什么要按力矩上限来算？**

A：在固定范围里随机施力时，经常施加机器人根本扛不住的力，力矩打满后策略学不到有效补偿，课程也推不上去（停在 $\alpha_g = 0.6$）。按雅可比和力矩余量算出每轴可行范围，既能把力加到可行上限，又不会让训练浪费在不可能的情况上。

**Q4：FALCON 和 HOMIE 是什么关系？**

A：HOMIE 属于 Lower-RL-Upper-IK 范式（下身 RL、上身 IK + 外骨骼遥操作），FALCON 把这一范式当作基线之一（论文 4.2 节 (a) 基线「following [8, 9]」，[9] 即 HOMIE），并指出它缺上身力补偿。

---

## 💬 讨论记录

- 表 1 的误差没有单位，读的时候只比相对大小。
- 「2 倍」指的是上身关节跟踪；根速度跟踪各方法相差不大。

---

## 🔗 相关阅读

| 论文 | 关系 |
|---|---|
| [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html) | Lower-RL-Upper-IK 范式的代表，FALCON 的对照基线 |
| [HOVER](../../03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html) / [Expressive WBC](../../03_High_Impact_Selection/Expressive_Whole-Body_Control_for_Humanoid_Robots/Expressive_Whole-Body_Control_for_Humanoid_Robots.html) | 单策略全身 RL 基线的设计来源 |
| [OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html) | 基础奖励项的来源之一 |
| [CHIP](../CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html) | 同样处理末端受力，但目标是可调柔顺而不是抗扰 |
| [HDMI](../HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos/HDMI__Learning_Interactive_Humanoid_Whole-Body_Control_from_Human_Videos.html) | 同组工作，把物体状态写进跟踪目标 |

---

## 📎 附录：参考来源

- arXiv：<https://arxiv.org/abs/2505.06776>（v2，2025-11-16 更新）
- 项目主页：<https://lecar-lab.github.io/falcon-humanoid/>
- 代码：<https://github.com/LeCAR-Lab/FALCON>
