---
layout: paper
title: "Humanoid Dodgeball: Learning Fast Dynamic Obstacle Avoidance Motions for Humanoids"
zhname: "Humanoid Dodgeball：人形机器人快速动态避障动作学习"
category: "Loco-Manipulation and WBC"
arxiv: "2610.40003"
original_check: done
original_check_date: 2026-11-08
original_check_scope: arXiv v1 正文全文（第 I–VI 节、式 1–11、表 I–III）+ 项目页；图 3–6 按图注与正文描述核对；论文没有附录，也没有放出源码
---

# Humanoid Dodgeball: Learning Fast Dynamic Obstacle Avoidance Motions for Humanoids
**让人形机器人躲开飞来的球：把每个身体部位和球都当成球体，用「恒速外推到最近点还差多少、剩多少时间、要多大加速度」算出每个部位的威胁度，按威胁加权奖励「往远离最近点的方向动」；四个按躲避方向（左 / 右 / 前 / 后）分开的 AMP 判别器把动作拉向人类的闪躲动作，威胁消失后用捕获点奖励把身体稳住**

> 📅 阅读日期: 2026-11-08
>
> 🏷️ 板块: 04 Loco-Manipulation and WBC · 动态避障 · 全身闪躲 · 威胁感知奖励 · 多判别器 AMP · 捕获点恢复
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.40003](https://arxiv.org/abs/2610.40003) |
| HTML | [arXiv HTML](https://arxiv.org/html/2610.40003) |
| PDF | [下载](https://arxiv.org/pdf/2610.40003) |
| 项目主页 | [humanoid-dodge.github.io](https://humanoid-dodge.github.io/)（一段补充视频，文件名 `ICRA_video_web.mp4`） |
| 源码 | 截至 2026-11-08 未开源（论文和项目页都没有代码仓库），所以本笔记**没有源码运行时序图** |
| **发布时间** | 2026-10-29（arXiv v1） |

**作者**：Aoqian Zhang、Chunzheng Wang、Haoran Chen（共同贡献）、Annan Tang、Cheng Xiang、Fan Shi、Shuzhi Sam Ge。新加坡国立大学（NUS）电子与计算机工程系、深圳众擎机器人（EngineAI）、大连理工大学。

**定位**：一个**单一的端到端 RL 策略**：输入本体感受 + 球在机体系下的三维位置（真机由动捕给），直接输出关节目标；没有分层规划，也没有在「行走 / 躲避」策略之间切换。仿真在 Unitree G1 和 EngineAI PM01 上训练与评测，真机在 PM01 上验证。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| AMP | Adversarial Motion Priors | 用判别器把策略的状态转移拉向参考动作分布，见 [AMP](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html) |
| TTH | Time-To-Hit | 名义命中时间 $d^o / v^o$（发射距离 ÷ 发射速度） |
| SR | Success Rate | 躲开且没摔倒的比例 |
| LIPM | Linear Inverted Pendulum Model | 线性倒立摆，用来算捕获点 |
| REBot | Reflexive Evasion Robot | 四足机器人反射式避障框架（基线，作者团队有重叠） |
| PAC-MAN | Perception-Aware CBF-RL | 同期的人形躲球工作，CBF 式奖励 + AMP（基线） |

---

## 🎯 一句话总结

人形机器人已经会踢球、打网球、跑酷，但还不会**躲开飞来的东西**——它没法像无人机那样直接平移，必须协调全身和落脚点，还要躲完不摔。本文把这个问题写成纯 RL：10 个关键身体部位各用一个球体表示，对每个部位算**预测威胁**（恒速假设下最近点会不会进入半径加 0.5 m 余量的安全区、离得多远、还剩多少时间，换算成需要的加速度再压到 $[0,1]$）和**近场威胁**（当前间隙的单边高斯）；奖励按威胁加权鼓励部位朝「远离最近点」的方向动、惩罚靠近、再要求根部往正确方向走（反方向罚 5 倍）；四个**按躲避方向分开的 AMP 判别器**（BONES-SEED 里 90 段人类闪躲动作）让动作既自然又多样；威胁消失后用**捕获点奖励**等让机器人站稳。仿真 2304 种发射配置 × 100 次：TTH ≥ 1.2 s 时 G1 / PM01 成功率 **95.6% / 97.2%**（PAC-MAN 81.9% / 86.6%，REBot 53.1% / 43.9%），代价是功率更高、恢复更慢；PM01 真机扔 0.12 m 半径的球（3–10 m/s）30 次躲开 **22 次（约 73%）**。

---

## ❓ 要解决什么问题？

1. **人形缺「躲」这一项基本能力**：已有工作做了保护性摔倒（[SafeFall](../SafeFall__Learning_Protective_Control_for_Humanoid_Robots/SafeFall__Learning_Protective_Control_for_Humanoid_Robots.html)）和静态杂乱场景的无碰撞通行（[Collision-Free Traversal](../Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes/Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes.html)），但面对快速飞来的物体还没有可靠的全身反应；
2. **比无人机、四足难**：人形维度高、只有两只脚接触地面、平衡约束严，不能只靠调速度或整体平移躲开，必须每个部位与落脚点一起协调；
3. **三件事要同时兼顾**：反应要快（球可能 1 s 内到）、动作要像人且物理可行、躲完要站得稳；
4. **同期的 PAC-MAN 只考虑了有限几种球的轨迹**，换个方向、速度就容易失效。

---

## 🔧 方法

### 1. 问题设定

- **观测** $\mathbf o_t = [\mathbf s_t^p, \mathbf s_t^o]$：本体感受（基座角速度、横滚、俯仰、$N$ 个关节位置与速度、上一步动作）+ 球在机体系下的位置 $(x^o, y^o, z^o)$。**不给球的速度**，策略要从 20 步观测历史里自己推断；
- **动作**：相对默认站姿的关节偏移，$\mathbf q^{\mathrm{target}} = \alpha \mathbf a_t + \mathbf q^{\mathrm{default}}$，PD 跟踪；
- **失败**：除脚以外任何部位碰到地面。

### 2. 威胁怎么算

球与 $K = 10$ 个关键部位（头、躯干、两臂上下段、两腿上下段）都近似成球体，安全半径 $R^i _ {\mathrm{safe}} = R^o + R^i + m$，余量 $m = 0.5$ m。设 $\Delta\mathbf p$、$\mathbf w$ 为部位到球的相对位置与相对速度：

- **预测威胁 $S^i$**（预测视界 $H = 3$ s，恒速外推）：最近点时刻 $\tau^{\ast} = -\Delta\mathbf p^\top \mathbf w / \lVert\mathbf w\rVert^2$，只在 $0 < \tau^{\ast} < H$ 时有效（球已远离或太远不算）；最近距离 $d^{\ast} = \lVert\Delta\mathbf p + \tau^{\ast}\mathbf w\rVert$，还差 $\delta = \max(0, R _ {\mathrm{safe}} - d^{\ast})$；在 $\tau^{\ast}$ 内挪开 $\delta$ 需要的加速度 $a^{\mathrm{req}} = 2\delta / \tau^{*2}$，威胁 $S = 1 - \exp[-(a^{\mathrm{req}}/a _ {\mathrm{ref}})^2]$，$a _ {\mathrm{ref}} = 2\ \mathrm{m/s^2}$。一个数同时编码了「几何上会不会撞」「还剩多久」「要多使劲」；
- **近场威胁 $D^i$**：只看当前间隙 $c = \lVert\Delta\mathbf p\rVert - R _ {\mathrm{safe}}$，$D = \exp[-(\max(c,0)/\sigma _ {\mathrm{near}})^2]$，$\sigma _ {\mathrm{near}} = 0.5$ m，球进了安全区就是 1。

### 3. 奖励（表 I）

| 组 | 项 | 权重 |
|---|---|---|
| 躲避（$T > 0$） | 部位逃离 $r^{\mathrm{escape}} = \sum_i S^i \tanh(\max(0, \mathbf v^i \cdot \mathbf e^{\mathrm{pred},i})/1.5)$，$\mathbf e^{\mathrm{pred}}$ 指向远离最近点的方向 | 40 |
| | 部位距离 $r^{\mathrm{distance}}$：安全区外 $-D^i$，安全区内 $-(1 + \lvert c^i\rvert/\sigma _ {\mathrm{near}})$ | 50 |
| | 根部逃离方向 $r^{\mathrm{root\text{-}dir}} = \mathbb I(S^{\mathrm{root}}>0)\,\phi(\hat{\mathbf v}^{\mathrm{root}} _ {xy}\cdot \mathbf e^{\mathrm{pred,root}} _ {xy})$，$\phi(x) = \max(x,0) - 5\max(-x,0)$ | 60 |
| 恢复（$T = 0$） | 根部速度 $\exp(-\lVert\mathbf v _ {xy}\rVert^2/0.5^2)$ | 10 |
| | 躯干横滚² + 俯仰² | −20 |
| | 关节偏离默认姿态 | −40 |
| | 捕获点 $r^{\mathrm{capture}} = \exp(-\lVert\mathbf p^{\mathrm{capture}} - \mathbf p^{\mathrm{supp}}\rVert^2/\sigma _ {\mathrm{cp}}^2)$，$\sigma _ {\mathrm{cp}} = 0.12$ m | 10 |
| 正则（一直开） | AMP 奖励 | 10 |
| | 角速度、关节速度 / 加速度、动作变化率 / 二阶差分、关节位置 / 速度 / 力矩限位、脚滑 | 负权重 |
| | 抬脚高度（腾空时 clip 到 0.25 m） | 20 |

总威胁 $T = \max_i[1 - (1-S^i)(1-D^i)]$，实际用 $T < 10^{-3}$ 判定「没有威胁」，切到恢复奖励。捕获点 $\mathbf p^{\mathrm{capture}} = \mathbf p^{\mathrm{root}} _ {xy} + \mathbf v^{\mathrm{root}} _ {xy}/\omega_0$，$\omega_0 = \sqrt{g/z^{\mathrm{root}}}$，支撑点取两脚中点。

**为什么需要根部方向项**：各部位各自算出来的逃离方向可能互相冲突（头往左、腿往右），根部项给整体位移定一个方向，反方向罚 5 倍。

### 4. 四个按方向分开的 AMP 判别器

- 数据：BONES-SEED 里 90 段人类闪躲动作，分左 / 右 / 后 / 前四个方向，每个方向有多种风格（直着身体躲、低头弯腰躲），用 [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html) 重定向到机器人；
- 每一步按根部期望逃离方向 $\mathbf e^{\mathrm{pred,root}} _ {xy}$ 就近映射到四个方向之一，只激活对应的判别器 $D_k$（没有威胁时随机挑一个）；
- 判别器输入关节状态转移 $(\mathbf q_t, \mathbf q _ {t+1})$，最小二乘 GAN 目标；AMP 奖励 $r^{\mathrm{AMP}} = \max[0, 1 - 0.25(D_k - 1)^2]$。

一个共用判别器会让策略收敛到少数几种动作（多是往后躲）；分方向后每个方向都有自己的「像人」标准。

### 5. 训练细节

- mjlab 仿真、4096 个并行环境、PPO 训练 30,000 次迭代；
- 球的初始化两种方式：瞄准随机一个部位、随机速度直线飞；或水平瞄准根部再加竖直速度，走抛物线。球半径 0.05–0.125 m，水平发射速度 2–16 m/s，竖直 1–6 m/s，起点水平 ±6 m、高 0–1.8 m，**球受的重力在 0–1 g 之间随机**；
- 域随机化（表 II）：摩擦 0.1–2.0、$K_p / K_d$ ×0.8–1.2、关节零偏 ±0.05 rad、躯干质心 ±0.05 m、各传感器噪声（球位置 ±0.2 m）、随机推（线速度 ±1 m/s 等）；
- 网络：actor / critic 都是 MLP [512, 256, 128]，20 步历史经「逐帧线性嵌入 → 两层一维时间卷积 → 线性投影」得到 128 维潜变量；critic 额外看特权信息（各部位 $S$、$D$，脚接触，根部速度，**球速度**，各部位位置，球半径）。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph OBS["👀 观测（actor）"]
        P["本体感受：角速度 · 横滚 / 俯仰<br/>关节位置 / 速度 · 上一步动作"]
        O["球在机体系下的位置 (x, y, z)<br/>真机由动捕给；不给球速"]
        HIS["20 步历史 → 逐帧线性嵌入<br/>→ 两层 1D TCN → 128 维潜变量"]
        P --> HIS
        O --> HIS
    end

    subgraph POL["🤖 策略"]
        A["Actor MLP [512, 256, 128]"]
        C["Critic MLP（训练时）<br/>+ 特权：S、D、脚接触、根部速度<br/>球速度、部位位置、球半径"]
        HIS --> A
        HIS --> C
    end

    subgraph THREAT["⚠️ 威胁计算（训练时，10 个关键部位的球体）"]
        T1["预测威胁 S：恒速外推，τ* ∈ (0, 3 s)<br/>差距 δ → a_req = 2δ/τ*² → 1 − exp(−(a/2)²)"]
        T2["近场威胁 D：当前间隙 c<br/>exp(−(max(c,0)/0.5)²)"]
        T3{"总威胁 T = max[1 − (1−S)(1−D)]<br/>T ≥ 1e-3 ?"}
        T1 --> T3
        T2 --> T3
    end

    subgraph REW["🎯 奖励"]
        R1["躲避：部位逃离 ×40 · 距离 ×50<br/>根部方向 ×60（反向罚 5 倍）"]
        R2["恢复：根部速度 · 躯干姿态 · 关节偏离<br/>捕获点（σ = 0.12 m）"]
        R3["正则：平滑 · 限位 · 脚滑 · 抬脚"]
        T3 -- 有威胁 --> R1
        T3 -- 无威胁 --> R2
    end

    subgraph AMP["🧍 四个方向的 AMP 判别器"]
        M0["BONES-SEED 90 段人类闪躲动作<br/>→ GMR 重定向"]
        M1["按根部逃离方向选 D_左 / D_右 / D_前 / D_后<br/>（无威胁时随机选一个）"]
        M2["r_AMP = max[0, 1 − 0.25(D_k − 1)²] ×10"]
        M0 --> M1 --> M2
    end

    A --> ACT["关节目标 q = α·a + q_default<br/>→ PD 力矩"]
    ACT --> ROB["Unitree G1 / EngineAI PM01<br/>mjlab · 4096 环境 · PPO 3 万次迭代"]
    ROB --> T1
    ROB --> T2
    ROB --> M1
    R1 --> PPO["PPO 更新"]
    R2 --> PPO
    R3 --> PPO
    M2 --> PPO
    PPO --> A
</div>

> 部署时只剩上半部分：动捕给出球的位置 → 换到机体系 → actor 输出关节目标；威胁、奖励、判别器都只在训练时用。

---

## 🚶 具体实例

**例 1：同一颗球，剩 0.5 s 和剩 1.5 s，威胁差多少**

设球正对躯干飞来、横向偏 0.1 m，相对速度 6 m/s；球半径 0.1 m、躯干球半径取 0.15 m（假设），安全半径 $R _ {\mathrm{safe}} = 0.1 + 0.15 + 0.5 = 0.75$ m。最近距离 $d^{\ast} = 0.1$ m，还差 $\delta = 0.65$ m。

| 球现在在前方 | $\tau^{\ast}$ | $a^{\mathrm{req}} = 2\delta/\tau^{*2}$ | $S = 1 - e^{-(a/2)^2}$ |
|---|---|---|---|
| 3 m | 0.5 s | 5.2 m/s² | 0.9988 |
| 9 m | 1.5 s | 0.578 m/s² | 0.080 |

时间多三倍，要的加速度小九倍，威胁从几乎 1 降到 0.08——远处的球只轻轻推一下策略，近处的球才全力触发闪躲。此时两种情况的近场威胁 $D$ 都约等于 0（间隙 2.25 m 已经远大于 $\sigma _ {\mathrm{near}} = 0.5$ m），近场项只在球快到身边时才起作用。

**例 2：部位逃离奖励** 3 m 那种情况下，若躯干沿逃离方向以 1 m/s 移动：$S \cdot \tanh(1/1.5) = 0.9988 \times 0.583 = 0.582$，再乘权重 40 ≈ 23.3。沿反方向动只是这项得 0（被 $\max(0,\cdot)$ 截掉），惩罚交给距离项和根部方向项。

**例 3：根部方向的不对称惩罚** 若根部水平速度方向与期望逃离方向夹角 120°（点积 −0.5），$\phi = -5 \times 0.5 = -2.5$，乘 60 得 −150；同角度朝对的方向（点积 +0.5）只得 +30。往错误方向跑的代价是往对的方向跑收益的 5 倍。

**例 4：捕获点** 根部高度 0.75 m（假设）：$\omega_0 = \sqrt{9.81/0.75} = 3.62\ \mathrm{s^{-1}}$。躲完还以 0.5 m/s 往外滑，捕获点超前根部 $0.5/3.62 = 0.138$ m；若两脚中点正好在根部下方，$r^{\mathrm{capture}} = \exp(-0.138^2/0.12^2) = 0.265$。只有把速度降下来、或者把脚迈到捕获点下面，这一项才接近 1。

---

## 📊 实验与结果

**设置**：发射速度 4–15 m/s（12 档）× 来向 16 个角度 × 水平发射距离 1.0–6.5 m（12 档）= **2304 种配置**，每种 100 次，瞄准的部位随机、球的重力 0–1 g 随机。基线是作者在人形上重新实现的 REBot（四足反射式避障）和用同一份人类动作数据重训、actor 能看到真实球状态的 PAC-MAN。

**表 III：按名义命中时间分组的成功率（%）**

| TTH (s) | G1：本文 / REBot / PAC-MAN | PM01：本文 / REBot / PAC-MAN |
|---|---|---|
| < 0.4 | **11.8** / 4.8 / 5.9 | **14.2** / 8.1 / 3.9 |
| 0.4–0.8 | **64.6** / 10.0 / 36.8 | **55.5** / 9.8 / 33.6 |
| 0.8–1.2 | **95.1** / 34.0 / 79.2 | **94.2** / 17.3 / 79.5 |
| ≥ 1.2 | **95.6** / 53.1 / 81.9 | **97.2** / 43.9 / 86.6 |

- 所有区间、两台机器人上成功率都最高；可用反应时间越多，优势越明显；
- **代价**：PAC-MAN 的恢复时间和功率几乎都最低（G1 在 TTH ≥ 1.2 s：恢复 0.262 s / 305 W，本文 1.190 s / 399 W）；REBot 在 PM01 上功率最高（750–830 W）；
- **图 3**：PAC-MAN 对来向很敏感，正前、正后和侧面若干方向掉得明显；本文几乎全角度都高，60% 成功率等高线明显推向更快、更近的发射配置；
- **图 4**：PAC-MAN 被打中多在头、躯干和小腿；本文上身被打中少得多，剩下的碰撞集中在小腿和脚——脚要负责支撑，能躲的自由度最少；
- **图 5（t-SNE，1 万个 20 帧窗口）**：本文前 / 后 / 左 / 右四类动作分布最均衡；PAC-MAN 以往后躲为主；单判别器 AMP 几乎没有往前躲。

**消融（图 6）**：去掉部位距离项，短 TTH 下成功率掉得最多；去掉部位逃离项，TTH < 1.4 s 掉得明显；去掉根部方向项，TTH < 1.0 s 掉得明显；换成单个判别器，成功率普遍下降、**摔倒率最高**；去掉捕获点奖励，所有 TTH 下摔倒率都明显上升。

**真机（PM01）**：动捕跟踪机器人和球，扔半径 0.12 m 的球，动捕测得球速 3–10 m/s。30 次里躲开 22 次（约 73%）；8 次失败中 6 次被打中、2 次躲的时候摔倒。被打中的多是 > 8 m/s 冲着躯干来的球（触发了闪躲但时间不够），还有一种是贴地滚来的快球：机器人侧向迈步，摆动的脚反而踢到了球。成功案例里有前跨步、左 / 右侧跨步加低头。

---

## 💡 核心贡献

1. **按部位的威胁量化**：恒速外推的最近点 + 所需加速度给出连续、有界的预测威胁，再配一个近场威胁兜底，一套球体几何算完 10 个部位，便于大规模并行训练；
2. **威胁加权的三项躲避奖励**：部位往外逃、离球远一点、根部往对的方向走（反向重罚），解决局部方向冲突；
3. **按方向分开的 AMP 判别器**：同样的人类数据，换成四个判别器后动作更多样、成功率更高、摔得更少；
4. **捕获点恢复奖励**：把「躲完要站稳」用 LIPM 的捕获点写成奖励，显著降低摔倒率；
5. 两台人形的仿真对比 + PM01 真机 30 次投球验证。

---

## 🤖 对人形机器人的启示

- **把「多快、多近、多使劲」压进一个数**：$a^{\mathrm{req}}$ 这种物理上有意义的中间量，比直接用距离或时间做奖励更好调，也天然适合按部位加权；
- **AMP 判别器可以按任务语义拆开**：一个判别器面对多模态动作库时容易模式坍缩，按「往哪躲」拆成几个条件判别器是一个简单有效的做法，可迁移到其它多方向的技能（推、让、扑）；
- **成功率和能耗、恢复时间是一对权衡**：本文躲得更多但更费劲，PAC-MAN 更省但躲得少，部署时要按场景选择；
- **感知仍是短板**：真机靠动捕给球的位置，换成机载相机后延迟和噪声都会吃掉本来就很紧的反应时间。

---

## ⚠️ 局限与可改进点

- **短反应时间仍难**：TTH < 0.4 s 时成功率只有 12–14%；真机失败也集中在 > 8 m/s 的球；
- **更费电、恢复更慢**：功率和恢复时间都不如 PAC-MAN；
- **依赖动捕**：真机球位置来自动捕系统，没有机载感知；
- **只有一个球、只会站着躲**：不处理多个障碍，也没有和行走、操作策略结合（作者列为未来工作）；
- **评测规模**：真机只有 30 次投球；仿真评测用的是 actor 看真实球位置的设定（加了噪声随机化），PAC-MAN 也用了 state-oracle 选项；
- 未开源代码，部位球体半径、动作缩放 $\alpha$、PD 增益等细节论文没给，暂时无法复现。

---

## 🎤 面试参考

1. **为什么不直接用距离做惩罚？** 只看当前距离会对「远但很快冲过来」的球反应太晚，对「近但正在远离」的球反应过度；预测威胁用相对速度外推最近点，并只在 $0 < \tau^{\ast} < H$ 时生效，同时考虑了几何、时间和所需加速度。
2. **$a^{\mathrm{req}} = 2\delta/\tau^2$ 怎么来的？** 匀加速从静止出发，$\tau$ 时间内走过 $\delta$ 需要 $\delta = \tfrac12 a\tau^2$；它把「还差多远」和「还剩多久」合成「要多使劲」。
3. **actor 为什么不给球速？** 真机上动捕或视觉给速度会更噪；用 20 步位置历史让网络自己估计速度，同时 critic 用特权的真实球速降低方差（非对称 actor-critic）。
4. **为什么要四个判别器？** 一个判别器只要求「像数据集里某个动作」，策略可以只学会最容易的一种（往后躲）；按期望逃离方向选判别器，相当于把「像人」的标准条件化到方向上，迫使每个方向都学出对应的闪躲。
5. **捕获点奖励起什么作用？** LIPM 下捕获点是「把脚放在这里就能停下」的点；让它靠近两脚中点等于要求速度降下来、重心回到支撑区，消融里去掉后摔倒率明显上升。

---

## 🔗 相关阅读

- [AMP](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html)：本文动作先验的基础，本文把单个判别器拆成按方向的四个
- [GMR](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)：把人类闪躲动作重定向到 G1 / PM01
- [SafeFall](../SafeFall__Learning_Protective_Control_for_Humanoid_Robots/SafeFall__Learning_Protective_Control_for_Humanoid_Robots.html)：躲不开、站不住时的保护性摔倒
- [Collision-Free Humanoid Traversal](../Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes/Collision-Free_Humanoid_Traversal_in_Cluttered_Indoor_Scenes.html)：静态障碍下的人形无碰撞通行
- PAC-MAN：[Perception-Aware CBF-RL for Whole-Body Safety in Humanoid Dodgeball](https://arxiv.org/abs/2607.28623)（同期工作，基线）
- REBot：Reflexive Evasion Robot for Instantaneous Dynamic Obstacle Avoidance（RA-L，四足，基线）
- 后续：[Learning Agile Humanoid Dodgeball with Onboard Monocular Vision](https://arxiv.org/abs/2611.01197)（上游列表 2026.11 新增，机载单目视觉躲球）
