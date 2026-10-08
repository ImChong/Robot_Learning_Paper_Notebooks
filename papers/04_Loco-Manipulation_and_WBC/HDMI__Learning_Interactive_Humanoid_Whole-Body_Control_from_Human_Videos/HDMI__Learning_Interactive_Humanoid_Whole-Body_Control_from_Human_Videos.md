---
layout: paper
title: "HDMI: Learning Interactive Humanoid Whole-Body Control from Human Videos"
zhname: "HDMI：从人类视频学习人形全身交互控制"
category: "Loco-Manipulation and WBC"
arxiv: "2509.16757"
---

# HDMI: Learning Interactive Humanoid Whole-Body Control from Human Videos
**HDMI：从人类视频学习人形全身交互控制**

> 📅 阅读日期: 2026-10-05
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 人—物交互 · 从视频学习 · 机器人—物体共同跟踪
>
> 🧭 状态: 精读版；数值均取自 arXiv v3 正文、表 I–II 与图 6–9。

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| **arXiv** | [2509.16757](https://arxiv.org/abs/2509.16757) |
| **项目主页** | [hdmi-humanoid.github.io](https://hdmi-humanoid.github.io/) |
| **代码** | [LeCAR-Lab/HDMI](https://github.com/LeCAR-Lab/HDMI) |
| **作者** | Haoyang Weng, Yitang Li, Nikhil Sobanbabu, Zihan Wang, Zhengyi Luo, Tairan He, Deva Ramanan, Guanya Shi |
| **机构** | Carnegie Mellon University |
| **发布时间** | 2025-09-20 |
| **机器人** | Unitree G1 |
| **关键词** | Humanoid-object interaction, learning from human videos, motion tracking, residual action, interaction reward |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

只跟踪人的身体，说明不了门开没开、箱子动没动。HDMI（HumanoiD iMitation for Interaction）把**物体轨迹和接触阶段也写进参考**：从单目视频里用 GVHMR 恢复人体、配上物体轨迹和接触标注，然后训练一个 DeepMimic 式的 RL 策略**同时跟踪机器人和物体**。三个关键设计——统一的物体表示、残差动作空间、统一的交互奖励——让同一套框架能学推门、踢门、跪下搬箱、推箱子、开折叠椅等十几种技能，并零样本部署到 G1。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| **HDMI** | HumanoiD iMitation for Interaction | 本文方法名 |
| **HOI** | Human-Object Interaction | 人—物交互 |
| **GVHMR** | Gravity-View Human Motion Recovery | 从单目视频恢复世界坐标人体动作的方法，HDMI 用它提取人体轨迹 |
| **RSI** | Reference State Initialization | 从参考动作的随机一帧初始化，DeepMimic 的训练技巧 |
| **OMOMO** | Object Motion Guided Human Motion Synthesis | 人—物交互数据集，HDMI 的搬行李箱参考取自这里 |
| **Mocap** | Motion Capture | 真机部署时用来获取机器人与物体位姿 |

---

## ❓ HDMI 要解决什么问题？

论文指出全身人—物交互有两个难点：

1. **数据少**：比起自由空间的行走动作，同时带 3D 人体和物体运动的数据稀缺。
2. **RL 难训**：参考动作不完美时要怎么引导出期望的接触？在跪下、弯腰这类远离站立的姿态里怎么保持平衡？

已有工作要么为每个任务单独做参考生成和奖励工程（搬箱子），要么依赖 VLM 或基于模型的高层规划器。HDMI 想要一个**通用框架**：换任务只换视频，不换架构、不重写奖励；支持手和脚两种接触部位，支持铰接 / 刚体、固定基座 / 浮动基座的物体。

---

## 🔧 方法详解

### 1. 从视频到结构化参考

用 GVHMR 做 SMPL 姿态估计、用 LocoMujoco 做重定向，再后处理并标注物体轨迹和接触信号。每一帧的参考状态是：

$$
s^{ref}_t = (\,s^{robot}_t,\ s^{obj}_t,\ c_t\,)
$$

- $s^{robot}$：机器人参考根位置、根朝向、参考关节角 $\theta^{ref}_t$；
- $s^{obj}$：物体位置与朝向；门、折叠椅这类铰接物体还包含关节状态 $\theta^{obj}$；
- $c_t \in \{0, 1\}$：这一帧是否应该接触；
- 另有每帧的期望接触点 $p^{contact}_t$，定义在物体自身坐标系里。

### 2. 机器人—物体共同跟踪

训练沿用 DeepMimic 式三件套：参考状态初始化（机器人和物体从参考的随机帧出发，加小扰动）、相位变量 $\phi \in [0, 1]$、跟踪误差过大就提前终止。奖励包括机器人跟踪、物体跟踪、交互奖励和正则项（表 I），用 PPO 训练。

### 3. 三个关键设计

**（1）统一的物体表示**：策略观测里的物体位姿一律变到**机器人根坐标系**，再附上同样变到根坐标系的**期望接触点**（论文图 3 的黄点），连同本体感受和相位变量。这样不同类型的物体不需要改网络结构，而且这种空间不变的表示以后可以换成机载相机的输入。

**（2）残差动作空间**：策略不直接输出关节目标，而是输出相对参考关节角的修正量：

$$
\theta^{target}_t = \theta^{ref}_t + a_t
$$

如果参考是跪姿，普通策略的探索围绕默认站姿展开，第一步动作就会让机器人「弹起来」失去平衡，产生大量无用样本；残差动作让探索围绕参考姿态展开。

**（3）统一的交互奖励**：视频重定向得到的参考是纯运动学的，接触往往不准、还可能穿模。对每个应接触的末端 $i$：

$$
R_{contact,i} = \exp\!\left(-\frac{\lVert p_{eef,i} - p_{target,i} \rVert^2}{\sigma_{pos}}\right) \cdot \min\!\left(\exp\!\left(\frac{\lVert F_{contact,i} \rVert - F_{thres}}{\sigma_{frc}}\right),\ 1\right)
$$

位置项鼓励末端贴到目标接触点；力项鼓励有足够的接触力，超过阈值 $F _ {thres}$ 后封顶为 1，不再奖励更大的力。整体交互奖励对所有应接触的末端取平均，并由接触信号 $c _ {t,i}$ 门控：

$$
R_{interaction} = \frac{1}{N_c} \sum_{i=1}^{N_c} R_{contact,i} \cdot c_{t,i}
$$

### 4. 奖励权重与终止条件（表 I、表 II）

- 机器人跟踪：身体局部位姿 2.0、根全局位姿 1.0、身体全局速度 1.0、关节跟踪 1.0；物体位姿 2.0；**接触奖励 5.0**（全表最大的跟踪类权重）。
- 正则：动作变化率 0.1、关节位置越限 10.0、关节速度 $5 \times 10^{-4}$、力矩越限 0.01、足底冲击 1.0、打滑 0.5、腾空时间 5.0。
- 终止：根全局位姿、身体局部位姿、物体位姿误差超过 0.5 m 或 1.2 rad；接触丢失为位置偏差 0.2 m 且接触力 1.0 N；表中每项另标有 Min Steps = 25。
- 域随机化：机器人和物体的惯性、摩擦参数。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
  subgraph DATA["① 视频 → 参考"]
    V["单目 RGB 视频"] --> H["GVHMR 人体恢复<br/>LocoMujoco 重定向"]
    V --> O["物体轨迹<br/>接触信号与接触点"]
    H --> R["结构化参考<br/>机器人 + 物体 + 接触"]
    O --> R
  end
  subgraph TRAIN["② 共同跟踪训练"]
    R --> OBS["观测：本体感受、相位<br/>物体位姿与接触点（根坐标系）"]
    OBS --> PI["策略输出残差<br/>参考关节角 + 修正"]
    PI --> RW["跟踪奖励 + 交互奖励"]
  end
  subgraph REAL["③ 真机"]
    M["动捕给机器人与物体位姿"] --> D["G1 零样本部署"]
  end
  PI --> D
</div>

---

## 🚶 具体实例：交互奖励怎么算

论文正文没有给 $\sigma _ {pos}$、$\sigma _ {frc}$、$F _ {thres}$ 的具体数值，下面**假设** $\sigma _ {pos} = 0.01\ \text{m}^2$、$\sigma _ {frc} = 2$ N、$F _ {thres} = 5$ N，只为说明公式的行为。

推箱子，两只手都应接触（$N_c = 2$，$c _ {t,1} = c _ {t,2} = 1$）：

| 手 | 离接触点距离 | 接触力 | 位置项 | 力项 | $R _ {contact}$ |
|---|---|---|---|---|---|
| 左手 | 5 cm | 3 N | $\exp(-0.0025/0.01) = 0.779$ | $\min(\exp((3-5)/2), 1) = 0.368$ | 0.287 |
| 右手 | 5 cm | 8 N | 0.779 | $\min(\exp((8-5)/2), 1) = 1$ | 0.779 |

$R _ {interaction} = (0.287 + 0.779)/2 = 0.533$。读法：

- 左手位置对了但力不够，被力项打了折扣；右手力超过阈值后力项封顶，只剩位置项决定奖励——所以策略**没有动机用更大的力去推**，这是论文说的「足够但不过量」。
- 如果参考动作里的手本来就放错了地方（重定向误差），跟踪奖励会把手拉向错误位置，而交互奖励把它拉向物体上的接触点。消融（图 7b）显示：在不完美参考上训练搬行李箱，去掉交互奖励就抓不起来；用一条成功策略录下的完美参考重训时，去掉它也能成功——说明它的作用正是**弥补参考不准**。

**残差动作的直观算例**（数字为示意）：假设参考是跪姿，某个膝关节参考角 1.8 rad，默认站姿 0.3 rad。残差动作下，策略初期输出接近 0 的 $a_t$，目标就是 1.8 rad 附近；非残差动作下，策略要先学会输出约 $1.8 - 0.3 = 1.5$ rad 的大偏移才能保持跪姿，在学会之前每次初始化都会「弹起来」。论文图 9b 里，非残差版本最后学成了「双脚平放、靠弯腰去够箱子」的次优解。

---

## 📊 实验结果

**真机（G1，IsaacSim 训练，同一套超参数，零样本部署）**：

| 任务 | 结果 |
|---|---|
| 开门穿门（手推门过去、转身、脚踢门回来） | 连续 67 次（约 34 分钟）后才失败；起点随机偏移 10–30 cm；撤掉地面木板后又完成约 7 次 |
| 搬行李箱（跪下、抬起、带负载行走） | 连续 7 次成功；参考来自 OMOMO 数据集 |
| 搬面包箱 | 完成 2 次，难点是快速转身 180° 时腿会互相碰 |
| 搬泡沫垫 | 走过去、抓起、侧步、放下 |
| 「杜鲁门鞠躬」长序列（上台阶、鞠躬、坐台阶、挥手、跳下、走回） | 连续完成 3 次；上台阶时有人在背后轻扶 |

摘要说真机完成 6 种移动操作任务、仿真 14 种；第 IV 节的实验设置写的是 5 种真机交互任务，两处说法不完全一致。

**仿真消融（IsaacSim，4096 个并行环境）**：

- **交互奖励 + 接触丢失终止**：8 个任务里大部分去掉它们最终成功率差别不大（图 6）；关键在两类任务——参考不准（搬行李箱）和需要精确接触位置（推箱子要把 L 形末端卡在箱子边缘，去掉交互奖励会经常放在箱子侧面，接触不稳）。
- **残差动作空间**：完整方法在 8 个任务上关节与身体跟踪误差都最低，收敛也快得多（图 8、9a）。

---

## ⚠️ 局限（论文第 VI 节）

1. **依赖动捕**：真机上机器人骨盆和物体的全局位姿都靠动捕标记点提供，下一步需要从机载相机等传感器直接获取。
2. **一个技能一个策略**：每个任务单独训练一个专家策略，还没有把多个技能的数据合成一个通才模型。
3. **任务失败后的重新选点、换技能**仍需要高层逻辑（day4 文章的总结，非论文原话）。

---

## 🤖 工程价值

1. **把物体写进参考**：动作跟踪的「目标」不再只是机器人自己的姿态，而是「机器人 + 物体 + 接触」。这让从视频学交互技能变成一个统一的跟踪问题，不用每个任务重新设计奖励。
2. **残差动作是低成本的大改进**：只改动作的参考零点，就能让远离站姿的技能（跪、蹲、坐）变得可学。
3. **交互奖励专治「参考不准」**：从视频来的参考注定有误差，与其花大力气修参考，不如在奖励里显式要求接触到位。

---

## 🎤 面试高频问题 & 参考回答

**Q1：HDMI 和普通的动作跟踪（DeepMimic、BeyondMimic）有什么区别？**

A：训练套路相同（参考状态初始化、相位变量、误差终止），区别在跟踪对象：HDMI 同时跟踪机器人和物体，观测里有物体位姿和期望接触点，奖励里有物体跟踪和交互项。普通跟踪只关心机器人姿态像不像，不关心门开没开。

**Q2：为什么不直接输出关节目标，要用残差？**

A：远离站姿的参考（跪、蹲）下，普通策略的初始探索围绕默认站姿，一出手就把机器人弹起来，样本没用。残差把探索中心放到参考姿态上，策略只需学小修正和平衡。论文消融显示没有残差时收敛慢得多，搬行李箱还会学成不跪下、靠弯腰的次优解。

**Q3：交互奖励的力项为什么要封顶？**

A：要的是「足够但不过量」的接触力：力不够时按指数打折，超过阈值后不再给更多奖励，避免策略用过大的力（也是为了部署安全）。

**Q4：HDMI 离「真正自主」还差什么？**

A：两件事：物体和机器人的位姿目前靠动捕，需要换成机载感知；每个技能一个策略，需要多技能统一模型。后续 VIRAL、DoorMan 就是在 HOMIE 控制器之上直接从 RGB 学移动操作，走的是另一条路。

---

## 💬 讨论记录

- 和 FALCON 对照着读：FALCON 处理的是「手上被施加了未知外力」，HDMI 处理的是「要主动和物体建立并维持接触」。
- 0.5 m / 1.2 rad 的终止阈值和 H2O 的 0.5 m 成功率阈值量级一致，都是「明显跟丢」才算失败。

---

## 🔗 相关阅读

| 论文 | 关系 |
|---|---|
| [DeepMimic](../../01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html) | 参考状态初始化、相位变量、提前终止三件套的来源 |
| [FALCON](../FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation/FALCON__Learning_Force-Adaptive_Humanoid_Loco-Manipulation.html) | 同组工作，处理末端未知外力 |
| [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html) | 论文相关工作里列出的人形移动操作已有工作；VIRAL、DoorMan 用它当低层控制器 |
| [VIRAL](../VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation/VIRAL__Visual_Sim-to-Real_at_Scale_for_Humanoid_Loco-Manipulation.html) | 从仿真特权教师蒸馏 RGB 学生，去掉对动捕的依赖 |
| [OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) | 另一条路线：在重定向阶段保住人—物—地形交互 |

---

## 📎 附录：参考来源

- arXiv：<https://arxiv.org/abs/2509.16757>（v3，2025-09-27 更新）
- 项目主页：<https://hdmi-humanoid.github.io/>
- 代码：<https://github.com/LeCAR-Lab/HDMI>
