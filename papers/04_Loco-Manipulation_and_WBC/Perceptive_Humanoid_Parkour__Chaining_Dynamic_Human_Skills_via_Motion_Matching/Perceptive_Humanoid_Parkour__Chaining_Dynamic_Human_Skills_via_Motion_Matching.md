---
layout: paper
paper_order: 34
title: "Perceptive Humanoid Parkour: Chaining Dynamic Human Skills via Motion Matching"
zhname: "Perceptive Humanoid Parkour：通过动作匹配串联动态人类技能"
category: "Loco-Manipulation and WBC"
arxiv: "2602.15827"
demos: ["php"]
---

# Perceptive Humanoid Parkour: Chaining Dynamic Human Skills via Motion Matching
**PHP：用游戏动画里的「动作匹配」把几秒长的人类跑酷片段拼成长程参考，先训单技能跟踪专家，再用 DAgger + PPO 蒸馏成一个只看深度图和速度命令的学生策略，让 G1 自己决定迈过、爬上、撑越还是滚下**

> 📅 阅读日期: 2026-04-28（2026-09-24 重写：对照全文精读，新增八幕讲解动画与具体实例）
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 感知跑酷 · 动作匹配 · 专家蒸馏
>
> ℹ️ 笔记已对照 [arXiv v2](https://arxiv.org/abs/2602.15827v2)（2026-05-06）全文、附录 Table III–VI，以及[项目主页](https://php-parkour.github.io/)桌面版与[移动版](https://php-parkour.github.io/index-mobile.html)整理。截至 2026-09-24，项目页的代码按钮仍是「Coming Soon」，所以本文没有源码对照，涉及实现细节的地方都以论文原文为准。

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| **arXiv** | [2602.15827](https://arxiv.org/abs/2602.15827)（v2：2026-05-06） |
| HTML | [在线阅读](https://arxiv.org/html/2602.15827) |
| PDF | [下载](https://arxiv.org/pdf/2602.15827) |
| 项目主页 | [php-parkour.github.io](https://php-parkour.github.io/)（含浏览器内 MuJoCo 交互演示）· [移动版](https://php-parkour.github.io/index-mobile.html) |
| **发布时间** | 2026年2月17日（arXiv v1），RSS 2026 |
| 代码 | 暂未公开（项目页标注 Coming Soon，截至 2026-09-24） |
| 作者 | Zhen Wu\*, Xiaoyu Huang\*, Lujie Yang\*（共同一作），Yuanhang Zhang, Xi Chen, Pieter Abbeel†, Rocky Duan†, Angjoo Kanazawa†, Carmelo Sferrazza†, Guanya Shi†, C. Karen Liu†（† Amazon FAR team co-lead） |
| 机构 | Amazon FAR（Frontier AI & Robotics）· UC Berkeley · CMU · Stanford |
| 实验平台 | Unitree G1（1.3 m，29 DoF），机载深度相机 |
| 上游工具 | 动作重定向用 [OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html)，跟踪配方沿用 [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) |

> 作者列表以 v2 PDF 为准：v2 首页没有 Koushil Sreenath，但项目页 BibTeX 里仍然列着他。项目页移动版的「arXiv」按钮链接到的是 `2509.26633`（那是 OmniRetarget 的编号），PHP 自己的编号是 `2602.15827`。

---

## 🎯 一句话总结

人形跑酷难在四件事叠在一起：动作要高动态且接触密集（零点几秒撑越、爬过与身高相当的墙），要和视觉闭环（障碍位置随时在变），几十个技能要进同一个策略，而人类跑酷数据又少得可怜（一个技能一两段、几秒长）。PHP 的做法是**把「组合技能」和「学控制」拆开**：先用游戏行业的**动作匹配**（在 27 维特征空间里做最近邻检索）把少量原子技能和大量走跑数据拼成「走跑 → 技能 → 走跑」的长程运动学参考，并刻意制造各种助跑距离、步相和转向；再为每条参考训一个带高度扫描与全局位置特权的**跟踪专家**；最后用 **DAgger + PPO 的混合目标**把所有专家蒸馏成一个只看深度图、本体感受和离散二维速度命令的学生。仿真里六个跑酷任务平均成功率 0.98（纯奖励塑形 0.33、不拼接 0.13、端到端深度 RL 0.37）；真机 G1 零样本爬上 1.25 m 墙（身高 96%），并能在障碍被临时推开约 0.5 m 时临场改变步点完成 48 s 多障碍连跑。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| **PHP** | Perceptive Humanoid Parkour | 本文方法 |
| **MM** | Motion Matching | 动作匹配：每隔几帧在动作库里找「特征最像」的一帧接着播 |
| **Inertialization** | — | 切换片段时把跳变量记成偏移，再平滑衰减掉的过渡技术 |
| **Critically Damped Spring** | — | 临界阻尼弹簧：把目标速度 / 朝向外推成平滑的未来轨迹 |
| **DAgger** | Dataset Aggregation | 让学生自己跑、专家在学生访问的状态上给标签的模仿学习 |
| **PPO** | Proximal Policy Optimization | 本文在蒸馏阶段与 DAgger 混用的 RL 目标 |
| **Adaptive Sampling** | — | 按失败率挑回合起点，常失败的段落多练（BeyondMimic 提出） |
| **Anchor** | — | 跟踪里作为参考系的身体（通常是骨盆 / 躯干） |
| **GAP** | Global Average Pooling | 全局平均池化，把深度 CNN 的特征图压成一个向量 |
| **Warp** | NVIDIA Warp | GPU 上的 Python 仿真 / 渲染框架，这里用来高速渲染深度图 |
| **Cat / Dash / Speed Vault** | — | 跑酷里的三种撑越：猫跃（双手撑、腿从中间过）/ 冲刺撑越 / 侧撑越 |

---

## 🎬 八幕动画：PHP 全流程 {#php-explainer-anim}

<div class="paper-demo" data-demo="php-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（问题、方法、实验）按小节收起，再往后的具体实例、与其他笔记的关系、核心贡献、局限、面试参考与引用各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；整体框架图留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。
>
> 动画里的弹簧、最近邻、课程权重、奖励核与延迟换算，和下文「🚶 具体实例」是同一组数字。

---

## ❓ 论文要解决什么问题？

### 问题 1：跑酷同时考四件事

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：高动态接触 / 视觉闭环 / 多技能整合 / 数据稀缺，为什么它们叠在一起才难</summary>

论文把跑酷当作「像人一样按环境挑选、串联全身技能」这个更大目标的试金石，点出三个核心挑战：

1. **高动态、接触密集**：爬与身高相当的墙、零点几秒内撑越，需要在高维动作空间里做很精确的控制；
2. **与外感知紧耦合**：要对环境变化和突发扰动做反应，不能按脚本回放；
3. **很多技能进一个视觉策略**：技能越多、越异质，整合越难。

再叠上第四件事：**人类高动态动作数据天然稀缺**。捕捉快速的接触动作要专门的场地和精细的整理，一个技能往往只有一两段、每段几秒。Table III 把这件事量化了：整个技能库里走 / 跑有 495.5 s，12 个跑酷片段合计只有 66.2 s（约 11.8%），最短的猫跃只有 1.5 s。

</details>

### 问题 2：现有路线各缺一块

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四足式奖励塑形、AMP、生成式过渡、纯 DAgger 蒸馏各自卡在哪</summary>

| 路线 | 代表 | 卡在哪 |
|---|---|---|
| 奖励塑形从零学 | 四足跑酷、Humanoid Parkour Learning | 四足上好用，人形的全身控制维度太高，学出来多是「用脚迈」，不会用手撑 |
| AMP 这类对抗风格奖励 | AMP 及其人形变体 | 过渡靠 RL 探索「自然涌现」，人形真机上目前只到走、迈、搬箱这类低敏捷技能 |
| 用生成模型造过渡参考 | MDM、PARC、Diffuse-CLoC 等 | 在跑酷这种低数据量下生成质量明显下降，要么迭代共训练，要么带感知做实时重规划，都很贵 |
| 专家 → 视觉学生只用 DAgger | Extreme Parkour、Parkour in the Wild 等 | 对迈步够用，对爬墙、撑越这种靠短促大力矩的技能不够 |

</details>

### PHP 的回答

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：动作匹配管组合、跟踪专家管控制、DAgger + PPO 管整合</summary>

- **组合问题交给动作匹配**：它是游戏行业成熟的技术，本质是最近邻检索，**不生成新动作，只重排真实动作**，所以低数据量下也不会「糊」；而且检索天然会从各种步相、距离进入同一个技能，等于把稀疏的库**加密**了。
- **控制问题交给跟踪专家**：每条长程参考一个专家，沿用 BeyondMimic 的配方，不做逐技能调参。
- **整合问题交给混合蒸馏**：DAgger 让学生像专家，PPO 按回合成败补上 DAgger 看不见的「短促大力矩」。
- **决策来自感知**：部署时只给离散的二维速度命令，迈 / 爬 / 撑越 / 滚下由学生看着深度图自己选。

</details>

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    DATA["人类动作（走跑 495.5 s + 12 个跑酷片段 66.2 s）<br/>OmniRetarget 重定向到 29-DoF G1，并做左右镜像"]

    subgraph S1["🧩 阶段一 · 动作匹配合成长程参考（离线）"]
        CMD["2D 速度命令<br/>2 档速度 × 5 个转向"]
        SPR["临界阻尼弹簧<br/>→ 0.33 / 0.67 / 1 s 未来根轨迹"]
        MM["最近邻检索<br/>27 维特征，窗口 C_t"]
        COMP["走跑 → 入口窗口 E_k → 技能 → 走跑<br/>技能前步行 U[0.1, 3] s + 地形随机化 + 干扰箱"]
    end

    subgraph S2["🎯 阶段二 · 单技能跟踪专家（特权）"]
        EXP["参考 + 本体 + 0.7 m 高度扫描<br/>+ 骨盆全局位置 / 速度特权"]
        AS["BeyondMimic 跟踪奖励 + 自适应采样<br/>动作尺度 = 1"]
    end

    subgraph S3["🎓 阶段三 · 深度学生（DAgger + PPO）"]
        STU["深度 58×87 → 3 层 CNN → 32 维<br/>+ 本体 + 速度命令 → 5 层 MLP"]
        MIX["L = λ_PPO·L_PPO + λ_D·L_D<br/>λ_D: 1 → 0.1（前半程），终止阈值 0.5 → 1 m"]
    end

    REAL["✅ Unitree G1 零样本部署<br/>迈 / 爬 / 撑越 / 滚下由策略自选"]

    DATA --> MM
    CMD --> SPR --> MM --> COMP
    COMP --> EXP --> AS
    AS -->|多个专家| MIX
    STU --> MIX --> REAL

    style S1 fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style S2 fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style S3 fill:#f3e8ff,stroke:#7b3fbf,color:#2a0f4a
    style REAL fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

> 关键设计：**训练数据里只有单障碍**（每条参考只过一个障碍），多障碍连跑是靠「走跑段把技能串起来」自然学会的——学生在走跑段里就能看到下一个障碍，提前准备。

---

## 🔧 方法详解

### 1. 动作匹配：在特征空间里找「最像的下一帧」

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：27 维特征的组成、查询怎么拼、检索频率与 inertialization</summary>

动作库有 $N$ 帧，每帧存运动学位形 $\mathbf{q}_i=(\mathbf{p}_i,\mathbf{r}_i,\boldsymbol{\theta}_i)$（根平移 $\mathbb{R}^3$、根四元数 $\mathbb{R}^4$、29 个关节角）和一个预计算的匹配特征 $\mathbf{x}_i\in\mathbb{R}^{27}$（角色局部坐标系，沿用 Learned Motion Matching 的设计）：

| 特征 | 维数 | 内容 |
|---|---|---|
| 未来根轨迹 $\mathbf{t}_i$ | 12 | 0.33 / 0.67 / 1 s 三个时刻的平面位置（2）与朝向（2） |
| 局部脚状态 $\mathbf{f}_i$ | 12 | 左右脚在根坐标系下的位置（3）与线速度（3） |
| 根速度 $\mathbf{h}_i$ | 3 | 根线速度 |

运行时，**查询特征** $\hat{\mathbf{x}}_t$ 一半来自当前姿态（脚状态 $\hat{\mathbf{f}}_t$、根速度 $\hat{\mathbf{h}}_t$），一半来自速度命令（未来轨迹 $\hat{\mathbf{t}}_t$，由下一节的弹簧算出）。然后

$$
i^\star_t=\arg\min_{i\in\mathcal{C}_t}\lVert\hat{\mathbf{x}}_t-\mathbf{x}_i\rVert^2
$$

$\mathcal{C}_t$ 是**搜索窗口**：走跑模式下是整个走跑库，切技能时收窄到该技能的入口窗口。检索每 $M$ 帧做一次，或者速度命令变化较大时立即做；找到 $i^\star_t$ 后从那一帧**顺序往下播**，直到下一次检索。

> 这一点决定了 PHP 的性格：输出的每一帧都是**真实捕捉的人类动作**，只是被重新排了顺序。所以不会有生成模型在低数据量下的「糊动作」，代价是能力上限就是动作库本身。

</details>

### 2. 临界阻尼弹簧与 inertialization

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：弹簧闭式解、位置积分式、朝向、切换时的偏移衰减</summary>

速度命令 $\mathbf{u}^{\mathrm{cmd}}_t\in\mathbb{R}^2$ 要先变成「接下来一秒怎么走」。沿用 Holden 等人的做法，用**临界阻尼弹簧**：记弹簧状态 $s$、速度 $\dot s$、目标 $s _ {\mathrm{goal}}$、阻尼参数 $y>0$，令 $j_0=s_0-s _ {\mathrm{goal}}$、$j_1=\dot s_0+yj_0$，则

$$
s(\tau)=e^{-y\tau}\left(j_0+\tau j_1\right)+s_{\mathrm{goal}}
$$

- **平面位置**：把弹簧用在速度空间（「位置」是平面速度），对闭式速度积分得未来位置
  $p(\tau)=p_0-\frac{j_1}{y^2}e^{-y\tau}+\frac{-j_0-\tau j_1}{y}e^{-y\tau}+\frac{j_1}{y^2}+\frac{j_0}{y}+u^{\mathrm{cmd}}\tau$（逐分量）；
- **朝向**：直接对航向角 $\psi$ 用弹簧，目标 $\psi^{\mathrm{cmd}}=\mathrm{atan2}(u_y,u_x)$，不用积分；
- 在 $\tau\in\lbrace0.33,0.67,1.0\rbrace$ s 处取值，转到角色局部坐标系，就是 $\hat{\mathbf{t}}_t$。

**Inertialization**：切到新检索的帧时，先算出旧片段与新片段在切换瞬间的差，把这个偏移加到新片段上让输出连续，再用同一个弹簧（目标设为 0）把偏移衰减掉。

> 论文没有给出 $y$（或半衰期）的取值；下文实例里用 $y=4$ 只是示意。

</details>

### 3. 长程合成：走跑 → 技能 → 走跑

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：入口窗口、三种模式切换、地形摆放、合成配方、入口密度与地形随机化</summary>

走跑是所有技能都能复用的「连接段」，所以长程轨迹一律写成 **Locomotion → Parkour Skill → Locomotion**：所有技能都经由同一条走跑流形出入，**不需要逐对采集技能之间的过渡**。

维护一个走跑库 $\mathcal{D} _ {\mathrm{loco}}$ 和每个技能一个技能库 $\mathcal{D}_k$；每个技能片段配一个手工拟合的盒子地形，并人工标注起止帧 $(s_k,e_k)$ 与一个技能相关长度的**入口窗口**

$$
E_k=[s_k-H_k,\ s_k]
$$

它对应主动作之前的助跑段（比如撑越的最后几步），只在这里切进去才有意义。

| 模式 | 检索窗口 | 怎么播 |
|---|---|---|
| 走跑 | $\mathcal{C}_t=\mathcal{D} _ {\mathrm{loco}}$ | 标准动作匹配 |
| 走跑 → 技能 | $\mathcal{C}_t=E_k$ | 切到匹配的入口帧；**同时**把入口帧里「地形相对根」的偏移施加到机器人当前根位姿上，摆好障碍 |
| 技能段 | 不检索 | 顺序播放到 $e_k$，保住接触密集的人类动作 |
| 技能 → 走跑 | $\mathcal{C}_t=\mathcal{D} _ {\mathrm{loco}}$ | 恢复动作匹配 |

**合成配方**：从站立开始，速度命令从两档速度（1 / 2 m/s）× 五个转向（−90°、−45°、0°、45°、90°）里采；技能段内命令改为直行、保持同档速度；技能结束后再走 2 s 停下。全程记录逐帧速度命令与参考位姿，作为后续训练的成对数据。

**入口密度**：同一个技能可以从特征空间里相邻的多个走跑状态进入，于是会自然出现「起跳前多垫一步」「从跑步的不同相位起跳」这类变体。Fig. 3(a) 的例子：助跑 3.9 m 与 4.8 m 会让引擎选出不同步幅序列，进而是左脚还是右脚领跳。为防止策略学到「数步数 / 看时钟起跳」这种非因果捷径，技能前的步行时长从 $U[0.1,3]$ s 里采。

**地形随机化与干扰物**：障碍宽度从参考所需最小值采到 1.5 m，其余尺寸 ±5 cm，偏航 ±45°；在轨迹附近撒几个随机大小、位姿的干扰箱，减少对无关物体的过拟合。

</details>

### 4. 单技能跟踪专家

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：观测、全局跟踪特权、自适应采样、奖励与动作尺度</summary>

专家沿用 BeyondMimic / OmniRetarget 的运动跟踪配方，改了几处：

- **观测**：参考关节位置 / 速度、参考骨盆位姿误差、骨盆线 / 角速度、关节位置 / 速度、上一步动作；**额外**给一块 0.7 m × 0.7 m 的高度扫描，适应地形随机化。
- **全局跟踪 + 特权**：与 OmniRetarget 不同，这里开全局跟踪并给骨盆全局位置 / 速度作为特权观测。原因是参考和地形焊死在一起，漂一点、慢一点就错过台阶，必须能纠回来；这些量硬件上拿不到，但学生可以从视觉里推断。
- **自适应采样**：优先从常失败的区段起跑；论文说没有它，高墙爬升专家根本收敛不到有意义的行为。
- **奖励 / 终止 / 域随机化**：照搬 BeyondMimic——DeepMimic 式高斯跟踪奖励（Table IV：身体位置 / 朝向 / 线速度 / 角速度，锚点位置 / 朝向，$\sigma$ 分别为 0.3 m、0.4 rad、1.0 m/s、3.14 rad/s、0.3 m、0.4 rad，权重都是 1.0）+ 动作平滑（−0.1）、关节限位（−10）、自碰撞（−0.5）罚项；按跟踪误差提前终止；轻量随机化（Table V）。
- **动作尺度**：动作是关节 PD 目标除以固定尺度；因为探索难，所有专家一律设成 1，而不用 BeyondMimic 的逐关节启发式。

</details>

### 5. DAgger + PPO 蒸馏出统一学生

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：为什么纯 DAgger 不够、混合目标与三段课程、镜像模式与标签屏蔽</summary>

**纯 DAgger 的盲区**：爬、撑越依赖**短促、大幅**的力矩爆发，而逐步模仿目标不看回合结局，不会特意偏向这种大力矩动作。论文举的例子：骨盆比参考高一点和低一点、偏差对称的两条轨迹，DAgger 损失一模一样，但只有高的那条能过障碍。

于是加上 PPO，并用课程混合：

$$
\mathcal{L}=\lambda_{\mathrm{PPO}}\mathcal{L}_{\mathrm{PPO}}+\lambda_D\mathcal{L}_D,\qquad \lambda_{\mathrm{PPO}}+\lambda_D=1
$$

论文强调 PPO 的作用是提供**按成败的信号去「用足」专家行为**（比如大力矩），而不是去专家分布之外探索。课程分三部分：

1. **权重**：前半程线性降 $\lambda_D(k)=\max\!\left(0.1,\ 1-\frac{k}{K/2}\right)$，$k$ 为当前迭代、$K$ 为总迭代数；
2. **镜像模式**：很多技能左右都能做（左脚或右脚领跨），参考只给了其中一种；学生做了镜像版本虽然也完成了，但跟踪误差很大会被误判终止，给 PPO 带来很大的奖励方差。所以把终止阈值从专家的 0.5 m 用同一条线性课程放宽到 1 m；
3. **优化器**：$\lambda _ {\mathrm{PPO}}$ 超过 0.1 之后才打开自适应学习率与 KL 探索控制。

附录 B-3 还补了一个细节：放宽终止后，学生会访问专家从没见过的状态；当学生超出了**专家原本的**终止阈值、但还在放宽后的阈值内时，专家给的动作不可靠，这些步**不算 DAgger 损失**，只用 PPO。

**学生侧的采样**：关掉自适应采样（它会少采那些「仿真里不失败、但动作发抖」的边缘片段，而这类片段恰恰是真机上 sim-to-real 差距大的来源），各技能均匀采、技能内均匀采。

</details>

### 6. 深度感知与相机建模

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：学生的观测、Warp 深度渲染、外参随机化、噪声与延迟</summary>

- **学生观测**：骨盆重力向量与角速度、关节位置 / 速度、上一步动作（本体）；NVIDIA Warp 渲染的深度图（58 × 87）；§III-B 定义的速度命令。动作空间与域随机化同专家。
- **网络**：3 层 CNN + 全局平均池化把深度压成 32 维，接 5 层 MLP [2048, 1024, 512, 256, 128]；critic 是 [512, 256, 128]（Table VI）。
- **相机标定**：在一组姿态下对比仿真与真机的「机器人自身可见区域」（ROI 重叠）来标定仿真相机，再在标定值附近随机外参（平移 2.5 cm、旋转 2.5°）。
- **深度噪声**：沿用 Parkour in the Wild 的深度噪声模型，但**不加高斯模糊**——高速时模糊会把障碍糊掉；附录 B-3 另加 ±3 cm 随机偏移与 $\sigma=3$ cm 的逐像素高斯噪声。
- **延迟**：观测延迟在 60–80 ms 之间随机；机载深度相机 30 Hz。

</details>

---

## 🚶 具体实例：一次 2 m/s 冲向 58 cm 障碍，从参考合成到部署走一遍

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（9 节）：环境设定 / 第 1 步：技能库 / 第 2 步：弹簧 / 第 3 步：检索 / 第 4 步：切入技能 / 第 5 步：专家 / 第 6 步：蒸馏 / 第 7 步：深度与延迟 / 第 8 步：评估换算</summary>

> ⚠️ 本节把论文里的配方代入一个具体场景逐步走通。**标「示意」的数字是我构造的**，只为把机制算清楚：弹簧参数 $y=4$、三维玩具特征与数据库帧、1.0 / 1.2 / 0.8 的动作值。其余参数（特征维数、合成配方、$\sigma$、课程、网络、噪声、延迟、Table I–III 数字）都取自论文正文与附录。因为代码未公开，**没有实际运行任何管线**。动画里用的是同一组数字。

<h3 id="实例-环境设定">环境设定</h3>

- 机器人：Unitree G1，身高 1.3 m，29 DoF；
- 任务：Table I 里的「2.0 m/s × 58 cm」——固定速度命令向前，障碍带 20° 偏航随机，机器人起点在障碍前 3.0–4.5 m 均匀采；越过障碍后再走 1.5 m 不摔即成功；100 个障碍实例 × 每个 5 次 = 500 次试验；
- 用到的技能片段：Table III 里的「Climb (58 cm) @ 2.0 m/s」，共 6.1 s。

<h3 id="实例-第-1-步技能库里有什么">第 1 步：技能库里有什么（Table III）</h3>

| 类别 | 片段 | 时长 (s) |
|---|---|---|
| 走跑 | 站、走、跑，覆盖 0.8–3.5 m/s | 495.5 |
| @ 1.0 m/s | Step 36 / Climb 58 / 76 / 94 cm | 2.2 + 12.1 + 8.8 + 10.3 = 33.4 |
| @ 2.0 m/s | Step 36 / Climb 58 / 76 / 94 / 125 cm / Dash Vault / Speed Vault | 1.6 + 6.1 + 4.4 + 5.2 + 5.9 + 5.0 + 3.1 = 31.3 |
| @ 3.0 m/s | Cat Vault | 1.5 |

- 跑酷片段合计 $33.4+31.3+1.5=66.2$ s，占全库 $66.2/(66.2+495.5)=11.8\%$；走跑时长是跑酷的 $495.5/66.2\approx7.5$ 倍。
- 所有片段先经 OmniRetarget 重定向到 G1，再**左右镜像**一份（库容量翻倍）；每个跑酷片段手工拟合一个盒子地形。

<h3 id="实例-第-2-步命令变成未来轨迹">第 2 步：命令变成未来轨迹（弹簧，$y=4$ 示意）</h3>

当前根速度 1 m/s、加速度 0，命令 2 m/s。$j_0=1-2=-1$，$j_1=0+4\times(-1)=-4$。

| $\tau$ (s) | 速度 $s(\tau)$ (m/s) | 位置 $p(\tau)$（弹簧） | 直接按命令 $2\tau$ | 按当前速度 $1\cdot\tau$ |
|---|---|---|---|---|
| 0.33 | $2+e^{-1.32}(-1-1.32)=1.38$ | $0.38$ m | 0.66 m | 0.33 m |
| 0.67 | $1.75$ | $0.92$ m | 1.34 m | 0.67 m |
| 1.00 | $1.91$ | $1.53$ m | 2.00 m | 1.00 m |

以 $\tau=0.33$ 为例手算位置：$\frac{j_0}{y}+\frac{j_1}{y^2}=-0.25-0.25=-0.5$，括号项 $-0.5-\frac{4\times0.33}{4}=-0.83$，于是 $p=-0.5-e^{-1.32}\times(-0.83)+2\times0.33=-0.5+0.2217+0.66=0.3817$ m。

朝向同理：命令转向 45°（从 0° 起、角速度 0），三个时刻依次是 17.1°、33.6°、40.9°。三个时刻 × (x, y, cosψ, sinψ) 就是查询里的 12 维 $\hat{\mathbf{t}}_t$。

**读法**：弹簧给出的是「会加速但不会瞬间到位」的未来，查询因此能匹配到「正在加速的小跑」，而不是直接跳到「全速跑」的帧。

<h3 id="实例-第-3-步最近邻检索">第 3 步：最近邻检索（三维玩具特征，示意）</h3>

把 27 维压成三维：(未来 1 s 位移, 左脚前向速度, 根速度)。查询 $\hat{\mathbf{x}}=(1.527,\ 3.0,\ 1.0)$，第一维就是上一步弹簧算出的 $p(1.0)$。

| 走跑库里的帧 | 特征 | $d^2$ |
|---|---|---|
| L1 慢走 1 m/s | (1.00, 2.6, 1.0) | $0.527^2+0.4^2+0=0.4382$ |
| L2 跑 2 m/s | (2.00, 4.5, 2.0) | 3.4733 |
| **L3 加速中的小跑** | (1.55, 3.1, 1.2) | $0.023^2+0.1^2+0.2^2=$ **0.0505** |

走跑模式下选 L3，从它往下播。过一会儿速度到 2 m/s、接近障碍，系统要切进技能，窗口收窄到入口窗口 $E_k$，里面有两个候选：S1 左脚领跳入口 (2.0, 4.8, 2.0)、S2 右脚领跳入口 (2.0, 0.4, 2.0)。

| 到窗口时的查询 | $d^2(\mathrm{S1})$ | $d^2(\mathrm{S2})$ | 选中 |
|---|---|---|---|
| 左脚正在摆动 (2.0, 4.3, 2.0) | **0.25** | 15.21 | S1：左脚领跳 |
| 左脚正在支撑 (2.0, 0.3, 2.0) | 20.25 | **0.01** | S2：右脚领跳 |

**读法**：助跑距离不同 → 到窗口时处在不同步相 → 选中不同的入口。这正是 Fig. 3(a) 里 3.9 m 与 4.8 m 两种助跑导致左 / 右脚领跳的机制，也是「入口密度」的来源。

> 我的补充（非论文内容）：真实实现里 27 维特征的各组量纲不同（米、米每秒），Learned Motion Matching 的常见做法是逐维标准化并给各组加权；PHP 论文没写这一步，这里的玩具例子也没做标准化。

<h3 id="实例-第-4-步切入技能摆好地形">第 4 步：切入技能、摆好地形</h3>

1. 切到入口帧的同时，读出参考片段里「盒子相对根」的偏移，施加到机器人**当前**根位姿上——障碍就摆在了正确的相对位置；
2. 之后关掉检索，顺序播放 Climb (58 cm) 直到标注的结束帧 $e_k$，期间速度命令改为「直行、2 m/s」；
3. 结束后恢复动作匹配，再走 2 s 停下；
4. 障碍再做随机化：宽度采到最多 1.5 m，其他尺寸 ±5 cm，偏航 ±45°；附近撒几个干扰箱。

一个简单换算（我算的）：评估时 2 m/s 下起点在 3.0–4.5 m，若匀速跑，到障碍需 1.5–2.25 s；训练里技能前步行时长 $U[0.1,3]$ s 覆盖了这个区间，再加上 10 种命令组合（2 档速度 × 5 个转向），同一个技能会被以非常多样的姿态和时机进入。

<h3 id="实例-第-5-步专家跟踪">第 5 步：专家怎么跟住这条参考</h3>

跟踪奖励每一项都是高斯核 $r=\exp(-e^2/\sigma^2)$（Table IV）：

| 情况 | 算式 | 奖励 |
|---|---|---|
| 锚点位置偏 0.15 m（$\sigma=0.3$） | $\exp(-0.0225/0.09)=e^{-0.25}$ | 0.779 |
| 锚点位置偏 0.30 m | $e^{-1}$ | 0.368 |
| 锚点朝向偏 0.4 rad（$\sigma=0.4$） | $e^{-1}$ | 0.368 |
| 六个跟踪项全满 | $6\times1.0$ | 6.0 |

专家的配置（Table VI，Motion Tracking 列）：actor / critic MLP [512, 256, 128]、ELU、初始噪声 std 1.0、学习率 1e-3（adaptive）、熵系数 0.005、5 个 epoch、4 个 minibatch、每环境 24 步、20K 迭代、16,384 个并行环境。终止阈值 0.5 m；这条 58 cm 爬台参考从常失败的「手撑上台」附近被自适应采样多练。

<h3 id="实例-第-6-步蒸馏进学生">第 6 步：蒸馏进学生（DAgger + PPO）</h3>

先看 DAgger 的盲区（示意）：起跳那几步某个关节的专家 PD 目标是 1.0，学生 A 输出 1.2、学生 B 输出 0.8。

- DAgger（MSE）：$(1.2-1.0)^2=(0.8-1.0)^2=0.04$，**两者一样**；
- 结局：A 的骨盆更高、越过障碍，B 更低、撞上被终止；PPO 看回合成败，给 A 正优势、B 负优势。

课程（$K=20{,}000$）：

| 迭代 $k$ | $\lambda_D=\max(0.1,1-k/10000)$ | $\lambda _ {\mathrm{PPO}}$ | 终止阈值（按我的理解线性放宽） | 备注 |
|---|---|---|---|---|
| 0 | 1.0 | 0.0 | 0.50 m | 纯 DAgger 起步 |
| 1,000 | 0.9 | 0.1 | 0.55 m | 之后 $\lambda _ {\mathrm{PPO}}>0.1$，打开自适应学习率 |
| 5,000 | 0.5 | 0.5 | 0.75 m | |
| 9,000 | 0.1 | 0.9 | 0.95 m | $\lambda_D$ 触底 |
| 10,000–20,000 | 0.1 | 0.9 | 1.00 m | Table VI「Curriculum end epoch 10,000」 |

两个对得上的地方：

1. $\lambda _ {\mathrm{PPO}}>0.1\iff\lambda_D<0.9\iff k>1000$，正好对应 Table VI 里蒸馏阶段的「adaptive after 1000 iterations」；
2. $\lambda_D$ 在 $k=9000$ 触底，Table VI 写课程在第 10,000 次结束——终止阈值放宽的线性段是「同一条线性课程」，放宽到 1 m 的时刻取 $K/2=10{,}000$ 是我的理解，论文没给出这条曲线。

学生侧超参（Table VI，Distillation 列）：初始噪声 std 0.01、学习率 3e-4、熵系数 0.001、2 个 epoch、96 个 minibatch、蒸馏损失 MSE、「DAgger loss coefficient」10.0。这个 10.0 与 $\lambda_D$ 如何组合论文没写，我推测是 $\lambda_D\times10\times\mathrm{MSE}$。

<h3 id="实例-第-7-步深度与延迟">第 7 步：深度与延迟换算</h3>

| 量 | 算式 | 结果 |
|---|---|---|
| 深度图像素 | $58\times87$ | 5046 |
| 深度特征 | 3 层 CNN + GAP | 32 维 |
| 2 m/s 下 60–80 ms 延迟 | $2\times0.06$ – $2\times0.08$ | 晚看见 0.12–0.16 m |
| 3 m/s（猫跃档）下的延迟 | $3\times0.06$ – $3\times0.08$ | 0.18–0.24 m |
| 30 Hz 相机两帧之间 | $2/30$、$3/30$ | 0.067 m、0.10 m |

**读法**：3 m/s 时 80 ms 的延迟相当于晚看见 24 cm，相机两帧之间又跑出 10 cm。论文在结论里也承认：近距、窄视场相机在高速下看不到足够远，机器人有时要在「没看清」时就决定起跳。

<h3 id="实例-第-8-步评估换算">第 8 步：评估与表格换算</h3>

这个任务（2.0 m/s × 58 cm）在 Table I 的结果：速度跟踪 0.00、不拼接 0.27、端到端深度 0.19、**PHP 0.99**。把六个任务平均：

| 方法 | 六任务平均成功率 |
|---|---|
| 速度跟踪（纯奖励塑形） | $(1+0+0+1+0+0)/6=0.33$ |
| 不拼接（原子片段） | 0.13 |
| 端到端深度 RL | 0.37 |
| **PHP** | $(1+0.99+0.95+1+0.99+0.95)/6=$ **0.98** |

Table II 的消融（六任务平均，保留三位小数，因为有几项正好落在 0.xx5 上）：只保留两端距离 0.735、一半密度 0.748、**只用 DAgger 0.188**、DAgger + 存活奖励 0.925、DAgger + 根跟踪 0.888、1/4 环境 0.622、1/2 环境 0.788、3 层 MLP 0.615、4 层 MLP 0.807、**PHP 0.970**。

> 一个小出入（我对照两张表发现的）：Table I 与 Table II 的「Ours」在 2.0 m/s 的 58 / 76 cm 上分别是 0.99 / 0.95 与 0.98 / 0.90，同一设置两个数不完全一致，论文没有解释，可能是不同批次的评估（推测）。

真机换算：猫跃平均 2.53 m/s × 0.8 s = 2.02 m（论文说「超过 2 m，身高的 154%」：$2/1.3=1.54$）；1.25 m 墙是身高的 $1.25/1.3=96\%$。

</details>

---

## 📊 实验与结果

### 1. 真机：人类水平的敏捷

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：1.25 m 高墙与人类对比、猫跃 0.8 s、1.25 m 落地缓冲</summary>

- **高墙爬升（Fig. 4）**：与人类跑酷者做同一个动作对比，关键事件（离地 → 拉起 → 摆腿 → 站稳）的时间点接近；1.25 m 墙（身高 96%）从离地起 **3.63 s** 站上平台。
- **猫跃（Fig. 5a）**：0.4 m 高、0.5 m 长的障碍，离地到落地 **0.8 s**，前进超过 2 m（身高 154%），峰值前向速度 3.41 m/s、平均 2.53 m/s——跨越接触的过程中动量保持得很好。
- **1.25 m 平台落地（Fig. 5b）**：落地时下肢屈曲吸收冲击再稳住。
- 项目页另有 Dash Vault、Speed Vault、爬台后坐下、四种爬行（Crawling）等片段；移动版页面还展示了 10 / 12 / 15 cm 的侧跳，这些在论文正文里没有单独讨论。

</details>

### 2. 真机：多障碍连跑与临场适应

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：训练只见过单障碍，真机能连过多个；障碍被推开 0.5 m 仍能完成</summary>

- 训练数据**只有单障碍**，但策略能在多障碍场地里连贯地把迈、低墙爬、高墙爬串起来（Fig. 5c）。论文把这归功于动作匹配的组合：走跑段让策略在走的时候就看到下一个障碍，提前准备。
- **障碍临时移动**：执行过程中把多个障碍随机推开约 0.5 m，策略会调整助跑和动作时机完成通行；48 s 的连跑片段里就包含这种扰动（项目页的 60 s 片段也是同类）。
- 所有技能都是自主执行的，人只给简单的二维速度命令用于导航。

</details>

### 3. 仿真基线对比（Table I）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：速度跟踪 / 不拼接 / 端到端深度三条基线各自怎么失败</summary>

评估协议：固定速度命令（1.0 或 2.0 m/s）过单个障碍，障碍 20° 偏航随机；起点距离 1 m/s 时 1.5–3.0 m、2 m/s 时 3.0–4.5 m；每任务 100 个障碍实例 × 5 次。所有变体都用完整技能集训练。

| 方法 | 1 m/s · 36 cm | 1 m/s · 58 cm | 1 m/s · 76 cm | 2 m/s · 36 cm | 2 m/s · 58 cm | 2 m/s · 76 cm |
|---|---|---|---|---|---|---|
| 速度跟踪 | 1.00 | 0.00 | 0.00 | 1.00 | 0.00 | 0.00 |
| 不拼接 | 0.06 | 0.02 | 0.00 | 0.37 | 0.27 | 0.07 |
| 端到端深度 | 0.95 | 0.07 | 0.08 | 0.78 | 0.19 | 0.14 |
| **PHP** | **1.00** | **0.99** | **0.95** | **1.00** | **0.99** | **0.95** |

- **速度跟踪**（IsaacLab 的 G1 rough-terrain 配方 + 10 级地形课程，而且直接给了特权高度图）：能过 36 cm，更高就不行——主要靠脚迈，**找不到用手撑的全身爬法**。
- **不拼接**：给了原子技能，但策略常常走到障碍前就停住。没有长程组合，它训练时既没经历过「走 → 技能」的过渡，也没在走的阶段看过障碍、为即将到来的技能做准备。
- **端到端深度 RL**（同样的动作匹配数据与跟踪奖励，但不蒸馏）：低障碍还行，高了就掉，说明从零探索很难。
- 附录还提到一条 AMP 基线（按 MimicKit 的官方实现）：能稳定行走并跟踪速度，但大多数越障任务失败；作者承认 AMP 对调参很敏感、没精力调透，所以只作为背景说明，没进正式对比。

</details>

### 4. 消融（Table II）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：拼接密度、规模、RL 在蒸馏里的角色</summary>

| 设置 | 1.0 m/s 58 / 76 / 94 cm | 2.0 m/s 36 / 58 / 76 cm |
|---|---|---|
| 只保留两端距离 | 0.99 / 0.62 / 0.64 | 0.98 / 0.60 / 0.58 |
| 一半密度 | 0.95 / 0.32 / 0.57 | 0.99 / 0.85 / 0.81 |
| 只用 DAgger | 0.16 / 0.03 / 0.12 | 0.63 / 0.09 / 0.10 |
| DAgger + 存活奖励 | 1.00 / 0.90 / 0.96 | 0.94 / 0.91 / 0.84 |
| DAgger + 根跟踪 | 1.00 / 0.79 / 0.75 | 1.00 / 0.92 / 0.87 |
| 1/4 并行环境 | 0.97 / 0.00 / 0.59 | 0.94 / 0.65 / 0.58 |
| 1/2 并行环境 | 0.94 / 0.60 / 0.68 | 0.97 / 0.79 / 0.75 |
| 3 层 MLP [512, 256, 128] | 0.99 / 0.02 / 0.00 | 0.98 / 0.89 / 0.81 |
| 4 层 MLP [1024, 512, 256, 128] | 1.00 / 0.94 / 0.08 | 1.00 / 0.94 / 0.88 |
| **PHP** | **0.99 / 0.95 / 1.00** | **1.00 / 0.98 / 0.90** |

- **拼接密度**：只留最近 / 最远两端距离，中间距离的接触时机泛化不了；数据砍半，尤其当剩下的样本偏向一端时，1 m/s 爬 76 / 94 cm 的**手撑时机**变得不可靠。
- **规模**：和从零训练不同，蒸馏框架随并行环境数和网络容量**正向扩展**。
- **RL 在蒸馏里的角色**：只用 DAgger 在 76 cm 上总是卡在「拉起」阶段——手放对了，但给不出把躯干拉上去的那一下大力矩；加 PPO 后奖励更高、DAgger 损失反而更低。换成只给根跟踪甚至**只给存活奖励**，成功率也接近全身跟踪奖励——说明和 DAgger 共训时，RL 主要是「按成败补偿 DAgger 的低估」，不依赖精细奖励；作者据此建议扩展到更多技能时，一个简单的存活奖励可能就够。
- **DAgger 必须一直在**：课程结束后如果拿掉 DAgger 只留 RL，策略常会出现发抖、不自然的动作——在高维动作空间里，模仿项是 RL 必要的正则。这也是它和 Parkour in the Wild「先训好 DAgger 策略、再单独 RL 微调」的区别：PHP 在蒸馏**过程中**就用 RL 纠正模仿带来的保守。

</details>

---

## 🧩 与本仓库其他跑酷 / 跟踪笔记的关系

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：OmniRetarget / BeyondMimic / Humanoid Parkour Learning / Deep Whole-body Parkour / Hiking in the Wild / Perceptive BFM 各自的位置</summary>

| 笔记 | 与 PHP 的关系 |
|---|---|
| [OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) | 同一团队（Amazon FAR）；PHP 用它把人类片段重定向到 G1，专家训练也沿用它的跟踪设定（但 PHP 打开了全局跟踪） |
| [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) | 专家的奖励、终止、域随机化与自适应采样全部来自这里；PHP 只把动作尺度改成 1 |
| [DeepMimic](../../01_Foundational_RL/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills/DeepMimic_Example-Guided_Deep_RL_of_Physics-Based_Character_Skills.html) / [AMP](../../01_Foundational_RL/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control/AMP_Adversarial_Motion_Priors_for_Stylized_Physics-Based_Character_Control.html) | 两种用人类数据的范式：显式跟踪（PHP 走这条）vs 对抗风格奖励（附录里 AMP 基线越障大多失败） |
| [Humanoid Parkour Learning](../../03_High_Impact_Selection/Humanoid_Parkour_Learning/Humanoid_Parkour_Learning.html) | 奖励塑形 + 分形噪声的人形跑酷；PHP 论文里的「速度跟踪」基线就是这一类，能迈 36 cm 但不会手撑 |
| [Extreme Parkour](../../05_Locomotion/Extreme_Parkour_with_Legged_Robots/Extreme_Parkour_with_Legged_Robots.html) / [ANYmal Parkour](../../05_Locomotion/ANYmal_Parkour_Robust_Perceptive_Locomotion/ANYmal_Parkour_Robust_Perceptive_Locomotion.html) | 四足跑酷的「特权专家 → DAgger 视觉学生」范式；PHP 发现这套在人形高动态技能上不够，要加 PPO |
| [Deep Whole-body Parkour](../Deep_Whole-body_Parkour/Deep_Whole-body_Parkour.html) / [Hiking in the Wild](../Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids.html) | 同期的人形感知跑酷：前者把外感知并进通用跟踪，后者单阶段端到端深度 → 动作；PHP 的差异在于**用动作匹配显式组合技能** |
| [Perceptive BFM](../../03_High_Impact_Selection/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.html) | 把 PHP 当相关工作引用：PHP 由**系统挑技能**（命令是速度），Perceptive BFM 保留**用户给的任意动作参考**当命令，只让感知补落脚点和时机 |

</details>

---

## 💡 核心贡献

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：高效的技能组合管线、可扩展的蒸馏框架、深度策略零样本上真机</summary>

1. **高效的运动学技能组合管线**：用动作匹配把重定向后的人类动作串成多样的长程轨迹，并通过入口窗口与随机助跑制造高密度的技能入口。
2. **可扩展的训练框架**：多个单技能专家经 DAgger + PPO 蒸馏成一个视觉策略，技能间过渡无缝；统一配方、不做逐技能调参。
3. **深度策略零样本上真机**：G1 上完成 1.25 m 高墙、猫跃、冲刺撑越、落地缓冲等高动态跑酷，以及带实时障碍扰动的长程多障碍通行。

</details>

---

## ⚠️ 局限与可改进点

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：没有语义理解、相机视场与延迟、硬件手部、代码未开源、表格小出入</summary>

- **缺语义场景理解**：作者自己列的第一条；想用语言等更丰富的条件控制风格与多样性。
- **相机太近、视场太窄**：高速下障碍几何看得不够早，机器人要在感知不确定时「先起跳再说」。更好的传感和场景理解能缓解。
- **硬件手不够强**：没有能抓住边缘或杆子的手 / 夹爪，所以没测「高于身高的攀爬」或悬挂动作。
- **能力上限 = 动作库**：动作匹配只重排真实动作，库里没有的技能就不会有；每个跑酷片段还要手工拟合盒子地形、标注起止帧与入口窗口。
- **弹簧参数、特征标准化、检索周期 $M$、混合窗口长度**等动作匹配细节论文都没给数值，代码也未开源，复现要自己补。
- **表格一致性**：Table I 与 Table II 在 2.0 m/s 同一设置上的「Ours」数字略有出入（0.99 / 0.95 vs 0.98 / 0.90）。
- **评估以单障碍为主**：多障碍与扰动适应只有真机定性展示，没有定量统计。

</details>

---

## 🎤 面试参考

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七个高频问题：为什么用动作匹配、入口窗口、DAgger 盲区、为什么还要 DAgger、全局特权……</summary>

**Q：为什么用动作匹配而不是扩散模型生成过渡？**
A：跑酷数据极少（每个技能一两段、几秒），生成模型在这种低数据量下质量明显下降，要么迭代共训练，要么在线带感知重规划，都很贵。动作匹配只做最近邻检索、重排真实帧，天然保住人类动作的质感；而且同一个技能能从很多相邻的走跑状态进入，把稀疏库「加密」成大量多样的入口。

**Q：入口窗口 $E_k$ 起什么作用？**
A：限制切进技能的位置只能是主动作前的助跑段（比如撑越前最后几步），避免从不合理的相位切进去；同时它是检索窗口 $\mathcal{C}_t$ 的来源——窗口里的多个候选帧（左 / 右脚领跳等）由当前步相决定选谁。

**Q：为什么要随机化技能前的步行时长？**
A：防止非因果捷径。如果每次都走固定时间 / 步数就起跳，策略可以靠计时起跳而不看障碍；从 $U[0.1,3]$ s 采样后，唯一可靠的线索就是视觉里的障碍距离。

**Q：DAgger 为什么学不会爬墙？**
A：爬墙、撑越依赖几步之内的短促大力矩。逐步 MSE 对「略低估」几乎不惩罚，而对高于 / 低于专家的对称偏差一视同仁，可结局天差地别（高的越过、低的撞上）。PPO 看回合成败，会推着学生把力矩用足。Table II：只用 DAgger 六任务平均 0.19，加 PPO 到 0.97。

**Q：既然 PPO 这么有用，为什么不在课程后去掉 DAgger？**
A：试过，策略会变得发抖、不自然。高维动作空间里，行为克隆项是 RL 的关键正则；所以 $\lambda_D$ 降到 0.1 后保持，而不是降到 0。

**Q：专家为什么要全局位置特权？**
A：参考轨迹和地形焊死在一起（台阶就在那个位置），一点漂移或节拍误差就会累积到错过台阶，专家必须能纠回来。硬件上拿不到全局位置，但学生可以从深度图里推断相对障碍的位置。

**Q：学生的训练为什么关掉自适应采样？**
A：自适应采样会多采「常失败」的片段、少采「仿真里不失败但发抖」的边缘片段，而后者恰恰是真机上 sim-to-real 差距大的来源；再加上技能间的数据平衡问题，学生改为各技能均匀采样。

</details>

---

## 🔗 相关笔记与外链

- [OmniRetarget](../../02_Motion_Retargeting/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc/OmniRetarget__Interaction-Preserving_Data_Generation_for_Humanoid_Whole-Body_Loc.html) — PHP 用的重定向工具，同一团队
- [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html) — 专家跟踪配方的来源
- [Perceptive Behavior Foundation Model](../../03_High_Impact_Selection/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain/Perceptive_BFM_Adapting_Human_Motion_Priors_to_Robot-Centric_Terrain.html) — 另一条「人类动作 + 地形感知」路线：保留任意参考当命令
- [Deep Whole-body Parkour](../Deep_Whole-body_Parkour/Deep_Whole-body_Parkour.html) · [Hiking in the Wild](../Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids/Hiking_in_the_Wild__A_Scalable_Perceptive_Parkour_Framework_for_Humanoids.html) · [TTT-Parkour](../TTT-Parkour__Rapid_Test-Time_Training_for_Perceptive_Robot_Parkour/TTT-Parkour__Rapid_Test-Time_Training_for_Perceptive_Robot_Parkour.html) — 同期人形感知跑酷
- [Humanoid Parkour Learning](../../03_High_Impact_Selection/Humanoid_Parkour_Learning/Humanoid_Parkour_Learning.html) · [Extreme Parkour](../../05_Locomotion/Extreme_Parkour_with_Legged_Robots/Extreme_Parkour_with_Legged_Robots.html) — 奖励塑形与专家蒸馏的前作
- 外部资料：Holden 等 [Learned Motion Matching](https://theorangeduck.com/page/learned-motion-matching)（特征设计与弹簧的出处）· 项目主页的[浏览器交互演示](https://php-parkour.github.io/)

---

## 📚 引用（BibTeX 备忘）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：BibTeX（项目页版本）</summary>

```bibtex
@article{wu2026perceptive,
  title={Perceptive humanoid parkour: Chaining dynamic human skills via motion matching},
  author={Wu, Zhen and Huang, Xiaoyu and Yang, Lujie and Zhang, Yuanhang and Sreenath, Koushil and Chen, Xi and Abbeel, Pieter and Duan, Rocky and Kanazawa, Angjoo and Sferrazza, Carmelo and others},
  journal={arXiv preprint arXiv:2602.15827},
  volume={1},
  year={2026}
}
```

</details>

---

> 备注：本笔记基于 arXiv v2 全文（2026-05-06）与项目主页整理；Table I–VI 的数字直接取自论文，均值与换算为现算。代码未开源，文中「我推测 / 我的理解 / 示意」标出的部分不是论文原文。
