---
layout: paper
title: "OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction"
zhname: "OmniRetarget：面向人形全身运动操作与场景交互的交互保持数据生成"
category: "Motion Retargeting"
paper_order: 4
demos: ["omniretarget"]
---

# OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction
**用 interaction mesh + 硬约束优化，把「人-物-地形」的空间关系保真地搬到机器人上，再系统性扩增数据**

> 📅 阅读日期: 2026-06-08
>
> 🏷️ 板块: Motion Retargeting · 交互保持重定向 · 数据扩增
>
> 🧭 状态: 深度技术细节已填充（基于 arXiv:2509.26633 + 项目页 + Holosoma 仓库）

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **论文** | OmniRetarget: Interaction-Preserving Data Generation for Humanoid Whole-Body Loco-Manipulation and Scene Interaction |
| **会议** | **ICRA 2026** |
| **arXiv** | [2509.26633](https://arxiv.org/abs/2509.26633) |
| **项目页** | [omniretarget.github.io](https://omniretarget.github.io) |
| **论文 PDF** | [项目页 PDF](https://omniretarget.github.io/static/images/paper.pdf) |
| **代码 / 数据入口** | [amazon-far/holosoma](https://github.com/amazon-far/holosoma) |
| **数据集** | [Hugging Face · OmniRetarget_Dataset](https://huggingface.co/datasets/omniretarget/OmniRetarget_Dataset) |
| **发布时间** | 2025 年 9 月（arXiv） |
| **实验平台** | Unitree G1（主硬件验证）；亦支持 H1、Booster T1 跨本体 |

**作者**: Lujie Yang*, Xiaoyu Huang*, Zhen Wu*, Angjoo Kanazawa†, Pieter Abbeel†, Carmelo Sferrazza†, C. Karen Liu†, Rocky Duan†, Guanya Shi†

**机构**: 1 Amazon FAR (Frontier AI & Robotics), 2 MIT, 3 UC Berkeley, 4 Stanford University, 5 CMU

**一行定位**：首个**显式保持人-物-地形交互关系**的开源人形重定向引擎——用 interaction mesh 最小化 Laplacian 形变 + **硬运动学约束**（非穿透、脚粘地、关节/速度限位），从单条人体演示系统性扩增到不同物体位姿/形状、地形高度与机器人本体，生成 9+ 小时高质量参考轨迹，下游 RL 仅用 **5 项奖励 + 4 项域随机化**（与 BeyondMimic 同款超参、零调参）即可在 G1 上零样本 sim-to-real 完成 30 秒级跑酷与 loco-manipulation。

---

## 🎯 一句话总结

OmniRetarget 把重定向从「关键点匹配 + 软惩罚」升级为「**interaction mesh 保形 + 序贯 SOCP 硬约束**」：在保持人与物体/地形相对空间关系的同时，消除脚滑与穿透；并能把一条 OMOMO / LAFAN1 / 自采 MoCap 演示扩成覆盖多物体配置、地形与机器人本体的数据集，使 proprioceptive RL 跟踪器无需课程学习与繁重 reward 工程即可跟住长时程动态交互。

> 🎮 **本文内嵌 1 段讲解动画**（不用装任何东西）：
> [七幕动画：OmniRetarget 全流程](#omniretarget-explainer-anim) —— 约 90 秒串完「现有 retargeting 只盯人体关键点 → interaction mesh 的 Delaunay 四面体 → Laplacian 形变能 → 序贯 SOCP 硬约束 → 一条演示四路扩增 → 极简 RL 与 Table II 定量论据 → 数据工厂到 G1 真机的闭环」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。

> 🚶 [具体实例](#实例-环境设定)用 Holosoma 自带的 OMOMO 搬箱 demo，把一条演示从缩放、15 个关键点 + 100 个箱面点建网格、一次 SQP 迭代的代价与约束、五种箱子位姿扩增，到 50 fps 转换和 RL 奖励逐步走一遍，最后列出论文与开源代码的出入（支撑相阈值、求解器、自碰撞默认关闭）。

---

## 📌 英文缩写速查

| 缩写 | 全称 / 含义 | 简单解释 |
|------|-------------|----------|
| **IMMA** | Interaction Mesh based Motion Adaptation | 图形学中基于 interaction mesh 的动作适配（OmniRetarget 最近邻 prior） |
| **SOCP** | Second-Order Cone Program | 二阶锥规划；OmniRetarget 每帧用 SQP 式序贯求解 |
| **SQP** | Sequential Quadratic Programming | 序贯二次规划；非凸约束每步线性化 |
| **GMR** | General Motion Retargeting | 关键点 + 朝向匹配基线（本文对比方法之一） |
| **PHC** | Perpetual Humanoid Control | 无约束优化 retargeting 基线 |
| **OMOMO** | Object MOtion with human MOtion | 人-物交互 mocap 数据集 |
| **LAFAN1** | Lafayette Animation Dataset | 常用 BVH 动作库（本文 flat-terrain 来源之一） |
| **RL** | Reinforcement Learning | 下游用参考轨迹训练跟踪策略 |
| **Laplacian** | 图 Laplacian 坐标 | 衡量关键点相对邻域的局部几何关系 |

---

## 🎬 七幕动画：OmniRetarget 全流程 {#omniretarget-explainer-anim}

<div class="paper-demo" data-demo="omniretarget-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（问题定义、方法详解、实验结果）按小节收起，具体实例、主线关系、代码入口、个人笔记与参考文献各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；系统总览、网格构建、扩增与 RL 配方等流程图留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ OmniRetarget 要解决什么问题？

<div class="mermaid">
flowchart TB
    NEED["loco-manipulation 需要保持"] --> I1["手 ↔ 物体接触关系"]
    NEED --> I2["脚 ↔ 地形接触序列"]
    NEED --> I3["身体 ↔ 平台 / 墙壁空间关系"]

    GAP["PHC / GMR 等：仅关键点匹配"] --> MISS["不显式建模物体与地形"]
    MISS --> FAIL["交互 contact 失真"]
    FAIL --> PATCH["下游 RL 靠 ad-hoc 正则补救<br/>脚滞空 / 接触时长 ..."]

    style NEED fill:#e8f4fd,stroke:#1f78b4
    style PATCH fill:#fdebd0,stroke:#e67e22
</div>

### 问题 1：现有 retargeting 忽视「交互」，只盯人体关键点

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：手↔物体、脚↔地形、身体↔墙壁，PHC / GMR 都不显式建模</summary>

人形 loco-manipulation 需要的不只是「关节角像人」，还要保持：

- 手与箱子的相对位姿与接触关系；
- 脚与台阶/坡面的接触序列；
- 身体与墙壁、平台的空间关系。

PHC、GMR 等主流管线以**无约束或软惩罚优化**做关键点匹配，**不显式建模物体与地形**，导致参考轨迹在交互任务上 contact 失真，下游 RL 不得不靠大量 ad-hoc 正则（脚滞空、接触时长等）补救。

</details>

### 问题 2：软约束无法杜绝物理不可行动作

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：脚滑 / 自穿 / 关节突变，VideoMimic 的软惩罚也没有保证</summary>

常见 artifact：

| 现象 | 后果 |
|------|------|
| 脚滑（foot skating） | 策略学到错误接触时序 |
| 自穿 / 地穿 | 仿真与真机跟踪发散 |
| 关节突变 | 参考不连续，跟踪难收敛 |

VideoMimic 用软接触/碰撞惩罚有所改善，但**无保证**且需仔细调参。OmniRetarget 把碰撞、关节限位、速度限位、stance 脚位置**写成硬约束**。

</details>

<div class="mermaid">
flowchart LR
    SKATE["脚滑 foot skating"] --> E1["错误接触时序"]
    PENET["自穿 / 地穿"] --> E2["仿真 / 真机发散"]
    JUMP["关节突变"] --> E3["参考不连续"]

    SOFT["软惩罚 retargeting<br/>VideoMimic 等"] -.->|无保证| SKATE
    SOFT -.-> PENET

    HARD["OmniRetarget 硬约束<br/>SDF / 限位 / 脚粘地"] --> FIX["运动学可行轨迹"]

    style SOFT fill:#fdebd0,stroke:#e67e22
    style HARD fill:#e8f8e8,stroke:#27ae60
</div>

### 问题 3：交互数据稀缺，单演示难以覆盖场景变化

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：一条演示要能扩到新物体位姿 / 尺寸 / 地形 / 本体，才叫数据工厂</summary>

遥操作可在线适应，但难规模化；离线 retargeting 若不能从**一条演示**扩增到不同物体位姿、尺寸、地形高度与机器人本体，数据瓶颈依旧。OmniRetarget 把每次扩增都建模为**新的约束优化问题**（固定源 interaction mesh，变换目标侧采样点/物体/地形）。

> 💡 **范式**：高质量参考 → 极简 RL 配方。与 BeyondMimic 一致，当参考干净时，DeepMimic 式 5 项奖励已足够；脏参考才逼出十几项 reward 调参。

</details>

<div class="mermaid">
flowchart LR
    subgraph LEGACY["传统 retargeting"]
        H1["人体 mocap"] --> RT1["关键点匹配<br/>+ 软惩罚"]
        RT1 --> ART["脚滑 / 穿透<br/>contact 失真"]
        ART --> RL1["十几项 reward 调参"]
    end

    subgraph OMNI["OmniRetarget"]
        H2["人体演示"] --> RT2["interaction mesh<br/>+ 硬约束"]
        RT2 --> CLEAN["干净参考轨迹"]
        CLEAN --> RL2["5 项奖励<br/>零调参"]
    end

    style LEGACY fill:#fdebd0,stroke:#e67e22
    style OMNI fill:#e8f8e8,stroke:#27ae60
</div>

---

## 🔧 方法详解

### 系统总览

<div class="mermaid">
flowchart TB
    DEMO["人体演示<br/>OMOMO / LAFAN1 / 自采 MoCap"] --> MESH

    subgraph MESH["Interaction Mesh 构建"]
        KP["语义关键点"] --> DEL["Delaunay 四面体剖分"]
        SAMP["物体 / 地形表面采样点"] --> DEL
        DEL --> IM["volumetric interaction mesh"]
    end

    MESH --> OPT

    subgraph OPT["序贯 SOCP / SQP（每帧）"]
        OBJ["min Laplacian 形变能 + 时间平滑"]
        C1["s.t. 非穿透 SDF"]
        C2["关节 / 速度限位"]
        C3["stance 脚粘地"]
    end

    OPT --> AUG{"数据扩增？"}
    AUG -->|是| VAR["物体位姿 / 形状<br/>地形高度 / 本体"]
    VAR --> REF
    AUG -->|否| REF["机器人关节参考轨迹"]
    REF --> RL["RL 跟踪<br/>5 rewards + 4 DR"]
    RL --> HW["Unitree G1 真机<br/>零样本部署"]

    style MESH fill:#e8f4fd,stroke:#1f78b4
    style OPT fill:#fdebd0,stroke:#e67e22
    style HW fill:#e8f8e8,stroke:#27ae60
</div>

### 1. Interaction Mesh 与硬约束优化

#### 1.1 网格构建

<div class="mermaid">
flowchart LR
    HKP["人体语义关键点<br/>hand / foot / pelvis ..."] --> CORR["语义对应<br/>hand ↔ hand"]
    RKP["机器人语义关键点"] --> CORR
    OBJ["物体表面采样<br/>接触区更密"] --> TET
    ENV["地形 / 环境采样<br/>平台 / 地面网格"] --> TET
    CORR --> TET["Delaunay 四面体剖分"]
    TET --> MESH["Interaction Mesh<br/>源 P_source / 目标 P_target(q_t)"]

    style MESH fill:#e8f4fd,stroke:#1f78b4
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：语义关键点 + 表面采样，Delaunay 四面体剖分得到体积网格</summary>

- 顶点 = 用户指定的人体/机器人**语义关键点** + 物体与环境的**随机表面采样点**（接触区域更密采样）。
- 对顶点集做 **Delaunay 四面体剖分**，得到 volumetric interaction mesh。
- 人体与机器人只需**语义一致**的 keypoint 对应（如 hand↔hand），对精确解剖位置相对鲁棒。

</details>

#### 1.2 目标函数：Laplacian 形变能

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Laplacian 坐标、形变能 E_L，以及每帧带硬约束的优化问题</summary>

对关键点 \(p_{t,i}\)，Laplacian 坐标：

\[
L(p_{t,i}) = p_{t,i} - \sum_{j \in \mathcal{N}(i)} w_{ij} \cdot p_{t,j}
\]

形变能（源 mesh \(\mathcal{P}^{\text{source}}\) vs 目标 mesh \(\mathcal{P}^{\text{target}}(q_t)\)）：

\[
E_L = \sum_i \| L(p_{t,i}^{\text{source}}) - L(p_{t,i}^{\text{target}}(q_t)) \|^2
\]

每帧求解：

\[
q_t^\star = \arg\min_{q_t} \sum_i \| L(p_{t,i}^{\text{source}}) - L(p_{t,i}^{\text{target}}(q_t)) \|^2 + \| q_t - q_{t-1} \|_Q^2
\]

\[
\text{s.t. } \phi_j(q_t) \geq 0 \;(\text{碰撞对 SDF}),\; q_{\min} \leq q_t \leq q_{\max},\; v_{\min} dt \leq q_t - q_{t-1} \leq v_{\max} dt,\; p_t^F = p_{t-1}^F \;(\text{stance 脚})
\]

- **Stance 判定**：源动作中脚在 xy 平面速度 < 1 cm/s → 该脚位置硬约束为上一帧。
- **求解器**：自定义 SQP——目标二次近似、约束线性化；用 Drake 自动微分处理四元数浮基在 \(\mathbb{S}^3\) 上的导数；**warm-start** 上一帧解。

</details>

<div class="mermaid">
flowchart TB
    subgraph FRAME["帧 t 序贯优化"]
        WS["Warm-start<br/>上一帧 q*"] --> SQP["SQP 迭代"]
        SQP --> OBJ["二次近似目标<br/>Laplacian 形变 +  ## q_t - q_{t-1} ## _Q"]
        SQP --> LIN["线性化硬约束"]
        LIN --> C1["phi_j(q_t) >= 0<br/>碰撞对 SDF"]
        LIN --> C2["q_min <= q_t <= q_max<br/>速度限位"]
        LIN --> C3["stance 脚<br/>p_t^F = p_{t-1}^F"]
        SQP --> SOLVE["Drake 自动微分<br/>四元数浮基 S^3"]
        SOLVE --> QT["q_t*"]
    end

    QT --> NEXT["帧 t+1<br/>继续 warm-start"]

    style FRAME fill:#e8f4fd,stroke:#1f78b4
</div>

#### 1.3 与 prior 方法对比（论文 Table I）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Table I —— 只有 OmniRetarget 同时勾了硬约束、物体、地形和扩增</summary>

| 方法 | 硬运动学约束 | 物体交互 | 地形交互 | 数据扩增 | 优化 |
|------|:---:|:---:|:---:|:---:|------|
| IMMA | ✓ | ✗ | ✗ | ✗ | QP |
| PHC | ✗ | ✗ | ✗ | ✗ | 梯度下降 |
| GMR | ✗ | ✗ | ✗ | ✗ | Mink |
| VideoMimic | 软惩罚 | ✗ | ✓ | ✗ | JAX L-M |
| **OmniRetarget** | **✓** | **✓** | **✓** | **✓** | **序贯 SOCP** |

</details>

### 2. 系统性数据扩增

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：固定源 mesh，目标侧改配置后重求解同一优化</summary>

固定源 demonstration 的 \(\mathcal{P}_t^{\text{source}}\)，变换目标侧配置后**重新求解**同一优化问题。

</details>

<div class="mermaid">
flowchart TB
    SRC["单条人体演示<br/>固定 P_source"] --> REOPT["重求解同一优化<br/>变换目标侧配置"]

    REOPT --> POSE["物体初始位姿<br/>平移 / 旋转 + 指数插值"]
    REOPT --> SHAPE["物体形状<br/>三轴缩放"]
    REOPT --> TERR["地形高度<br/>平台高度 / 深度缩放"]
    REOPT --> EMB["机器人本体<br/>G1 / H1 / T1"]

    POSE --> ANCHOR
    SHAPE --> ANCHOR
    TERR --> ANCHOR
    EMB --> ANCHOR

    subgraph ANCHOR["防平凡解锚定"]
        LOC["物体局部系建 mesh"]
        LB["下身锚定名义轨迹 q_bar*"]
        FEET["初始双脚位置约束"]
    end

    ANCHOR --> OUT["多样 kinematic 参考轨迹集"]

    style SRC fill:#e8f4fd,stroke:#1f78b4
    style ANCHOR fill:#fdebd0,stroke:#e67e22
    style OUT fill:#e8f8e8,stroke:#27ae60
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四条扩增轴，以及防止整机刚体平移的下身锚定</summary>

| 扩增类型 | 做法 | 防平凡解技巧 |
|----------|------|----------------|
| **物体初始位姿** | 平移/旋转物体初始姿态，与原始物体轨迹指数插值混合 | 物体局部系建 mesh；下身锚定名义轨迹 \(\bar{q}_t^\star\) |
| **物体形状** | 三轴缩放物体几何 | 同上 |
| **地形高度** | 缩放平台高度/深度；地面网格点加入 mesh | 鼓励稳定接地接触 |
| **机器人本体** | 改 keypoint 对应与碰撞模型（G1 / H1 / T1） | 跨本体复用同一套管线 |

下身锚定示例：对 pick-up 任务加重惩罚下身偏离 \(\bar{q}_t^\star\)，并约束初始双脚位置与名义轨迹一致，避免「整机关节刚体平移」式无效扩增。

</details>

### 3. 下游 RL：极简配方（与 BeyondMimic 对齐）

<div class="mermaid">
flowchart TB
    REF["OmniRetarget 参考轨迹<br/>关节 + 物体位姿"] --> OBS

    subgraph OBS["本体感受观测（无显式场景感知）"]
        O1["参考关节 pos / vel"]
        O2["骨盆位姿误差"]
        O3["本体线 / 角速度"]
        O4["上一步动作"]
    end

    OBS --> POL["RL 策略 pi(a#124;o)"]
    POL --> SIM["仿真跟踪训练"]

    subgraph REW["5 项奖励（BeyondMimic 权重）"]
        R1["Body Tracking"]
        R2["Object Tracking"]
        R3["Action Rate"]
        R4["Soft Joint Limit"]
        R5["Self-Collision"]
    end

    subgraph DR["4 项域随机化"]
        D1["躯干质心"]
        D2["关节默认位"]
        D3["随机推力"]
        D4["观测噪声"]
    end

    REW --> SIM
    DR --> SIM
    SIM --> DEPLOY["G1 真机零样本<br/>无课程学习"]

    style OBS fill:#e8f4fd,stroke:#1f78b4
    style REW fill:#fdebd0,stroke:#e67e22
    style DR fill:#f5eef8,stroke:#8e44ad
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

#### 3.1 观测（纯本体感受，无显式场景/物体感知）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：参考关节 / 骨盆误差 / 本体速度 / 上一步动作；wall-flip 可 mask 骨盆</summary>

- 参考：关节 pos/vel、骨盆位姿误差；
- 本体：骨盆线/角速度、关节 pos/vel；
- 上一步动作。

高动态动作（如 wall-flip）可 mask 骨盆线速度/位置误差（状态估计不可靠）。

</details>

#### 3.2 奖励（仅 5 项，权重直接沿用 BeyondMimic，零调参）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Body / Object Tracking、Action Rate、Soft Joint Limit、Self-Collision</summary>

1. **Body Tracking** — DeepMimic 式 body pos/ori/线角速度；
2. **Object Tracking**（适用时）— 物体 pos/ori；
3. **Action Rate**；
4. **Soft Joint Limit**；
5. **Self-Collision** — 自碰力 > 1 N 时二值惩罚。

</details>

#### 3.3 域随机化（仅 4 项）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：躯干质心、关节默认位、随机推力、观测噪声，外加物体侧扰动</summary>

- 躯干质心位置；
- 关节默认位置；
- 随机推力；
- 观测噪声。

物体侧另随机：质量 0.1–2 kg、质心 ±0.08 m、惯量 50–150%、形状 ±10%。

</details>

#### 3.4 训练分组

<div class="mermaid">
flowchart TB
    DATA["OmniRetarget 参考轨迹库"] --> BOX["搬箱类动作<br/>多轨迹"]
    DATA --> CLIMB["爬平台类动作<br/>多条参考"]

    BOX --> MT["单一多任务策略<br/>shared policy"]
    CLIMB --> PER["每条参考独立策略<br/>one policy per ref"]

    MT --> EVAL1["仿真 + 真机评测"]
    PER --> EVAL2["仿真 + 真机评测"]

    style MT fill:#e8f4fd,stroke:#1f78b4
    style PER fill:#fdebd0,stroke:#e67e22
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：搬箱共用一个多任务策略，爬平台每条参考一个策略</summary>

- 所有搬箱动作 → **单一多任务策略**；
- 爬平台 → **每条参考一个策略**。

</details>

---

## 🚶 具体实例：一条 OMOMO 搬箱演示怎么变成 G1 参考轨迹

<div class="mermaid">
flowchart LR
    PT["sub3_largebox_003.pt<br/>52 个人体关节 + 箱子位姿"] --> S1["① 缩放到 G1 身高<br/>1.32 / 人身高"]
    S1 --> S2["② 15 个关键点 + 100 个箱面点<br/>换到箱子坐标系"]
    S2 --> S3["③ Delaunay → 邻接表<br/>→ 目标 Laplacian"]
    S3 --> S4["④ 每帧 SQP<br/>cvxpy + Clarabel"]
    S4 --> ORI["_original.npz<br/>qpos (T, 43)"]
    ORI --> S5["⑤ 5 种扩增<br/>平移 ×3 · 旋转 ×2"]
    ORI --> S6["⑥ 转 50 fps<br/>→ exp:g1-29dof-wbt-w-object"]
    S5 --> S6

    style S4 fill:#fdebd0,stroke:#e67e22
    style S6 fill:#e8f8e8,stroke:#27ae60
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开全文（9 节）：环境设定 / 四条命令 / 第 1 步：读数据、缩放 / 第 2 步：15 个关键点与 100 个箱面点 / 第 3 步：箱子坐标系里的 interaction mesh / 第 4 步：一次 SQP 迭代 / 第 5 步：五种扩增 / 第 6 步：输出与 RL 训练 / 论文与代码对照</summary>

> 💡 **说明**：下面用 [amazon-far/holosoma](https://github.com/amazon-far/holosoma) 仓库 `src/holosoma_retargeting/` 自带的 demo 数据 `demo_data/OMOMO_new/sub3_largebox_003.pt`（OMOMO 搬大箱子，InterMimic 处理后的格式）走一遍。函数名、超参数、张量形状都读自源码（`examples/robot_retarget.py`、`examples/parallel_robot_retarget.py`、`src/interaction_mesh_retargeter.py`、`src/utils.py`、`config_types/*.py`，2026-09 的 `main`）。
>
> **我没有实际运行这条管线**（需要 MuJoCo / cvxpy，训练还要 IsaacSim）。文中的人身高、坐标、距离这类数都是**我为了手算取的示例值**，会逐处标出；只有带代码出处的数才是仓库里的真实值。

<h3 id="实例-环境设定">环境设定</h3>

| 项目 | 具体值 | 出处 |
|------|--------|------|
| **输入** | `sub3_largebox_003.pt`：每帧一行，第 162–317 列是 52 个 SMPL-H 关节的世界坐标，第 318–324 列是箱子位姿 | `load_intermimic_data()` |
| **任务类型** | `object_interaction`（另有 `robot_only`、`climbing`） | `config_types/retargeting.py` |
| **机器人** | Unitree G1，29 自由度，`ROBOT_HEIGHT = 1.32` m | `config_types/robot.py` |
| **物体** | `models/largebox/largebox.obj`，包围盒约 0.47 × 0.46 × 0.41 m（按 obj 顶点坐标的最大值减最小值算） | 模型文件 |
| **优化变量** | 浮动基 7 维（位置 + 四元数）+ 29 个关节 = 36 维（`q_a_init_idx = -7`） | `config_types/retargeter.py` |
| **保存帧率** | `fps=30`（写死在 `np.savez` 里） | `retarget_motion()` |

<h3 id="实例-四条命令">四条命令</h3>

```bash
cd src/holosoma_retargeting/holosoma_retargeting

# ① 原始序列：人-物交互重定向（README 原命令）
python examples/robot_retarget.py --data_path demo_data/OMOMO_new \
    --task-type object_interaction --task-name sub3_largebox_003 --data_format smplh
#    → demo_results/g1/object_interaction/omomo/sub3_largebox_003_original.npz

# ② 批量 + 扩增：先跑 original，再在它的基础上跑 5 种箱子位姿扩增
python examples/parallel_robot_retarget.py --data-dir demo_data/OMOMO_new \
    --task-type object_interaction --data_format smplh --augmentation \
    --save_dir demo_results_parallel/g1/object_interaction/omomo \
    --task-config.object-name largebox

# ③ 转成 RL 训练用的格式：30 fps → 50 fps，带动态物体（README 原命令）
python data_conversion/convert_data_format_mj.py \
    --input_file ./demo_results/g1/object_interaction/omomo/sub3_largebox_003_original.npz \
    --output_fps 50 --output_name converted_res/object_interaction/sub3_largebox_003_mj_w_obj.npz \
    --data_format smplh --object_name "largebox" --has_dynamic_object --once

# ④ 训练带物体的全身跟踪策略（回到仓库根目录）
python src/holosoma/holosoma/train_agent.py exp:g1-29dof-wbt-w-object \
    --command.setup_terms.motion_command.params.motion_config.motion_file=<③ 的输出>
```

④ 是我把两处文档拼起来的：`exp:g1-29dof-wbt-w-object` 来自 `config_values/wbt/g1/experiment.py` 末尾的示例，`--command...motion_file=` 来自 `demo_scripts/demo_omomo_wb_tracking.sh`（那个脚本跑的是 robot-only）。这条组合命令我没跑过。

<h3 id="实例-第-1-步读数据缩放">第 1 步：读数据、缩放到 G1 的身高</h3>

`load_intermimic_data()` 取出 `human_joints`（T × 52 × 3）和 `object_poses`（T × 7，四元数顺序从 `[qx,qy,qz,qw]` 改成 `[qw,qx,qy,qz]`）。缩放系数按受试者身高算：

$$
s = \frac{\text{ROBOT\_HEIGHT}}{h_{\text{sub3}}} = \frac{1.32}{h_{\text{sub3}}}
$$

$h _ {\text{sub3}}$ 存在 `demo_data/height_dict.pkl` 里（我没读这个文件）。**假设** $h=1.75$ m，那么 $s = 1.32/1.75 = 0.754$。

`preprocess_motion_data()` 接着做三件事：

1. **落地**：用两只脚趾（`L_Toe` / `R_Toe`）在整段里的最低 $z$ 当地面，全体关节减掉它；如果这个最低值 ≥ 0.1 m，就认为人站在垫子上，少减 0.1 m。
2. **人整体乘 $s$**。
3. **箱子只缩一部分**：$xy$ 乘 $s$，$z$ 只缩「相对第一帧的抬升量」：

$$
z'_t = z_0 + s\,(z_t - z_0)
$$

**示例值**：箱子初始中心在 $(0.60,\,0.80,\,0.20)$，被抬到 $z=1.00$ 时，机器人这边的箱子在 $(0.453,\,0.603,\,0.20+0.754\times0.80)=(0.453,\,0.603,\,0.803)$。

为什么 $z_0$ 不缩（**这是我的理解**）：机器人场景 `g1_29dof_w_largebox.xml` 里的箱子是**原尺寸**（`scale="1 1 1"`），中心离底面约 0.198 m。要是把 $z_0=0.20$ 也乘 0.754 变成 0.151，箱子就会插进地面约 4.7 cm。

<h3 id="实例-第-2-步15-个关键点与-100-个箱面点">第 2 步：15 个关键点与 100 个箱面点</h3>

**人 ↔ 机器人关键点**：`JOINTS_MAPPINGS[("smplh", "g1")]` 从 52 个 SMPL-H 关节里只挑 15 个。手指、胸椎、头都不用：

| SMPL-H | G1 link | SMPL-H | G1 link |
|--------|---------|--------|---------|
| `Pelvis` | `pelvis_contour_link` | `L/R_Elbow` | `left/right_elbow_link` |
| `L/R_Hip` | `left/right_hip_pitch_link` | `L/R_Wrist` | `left/right_rubber_hand_link` |
| `L/R_Knee` | `left/right_knee_link` | `L/R_Ankle` | `left/right_ankle_intermediate_1_link` |
| `L/R_Shoulder` | `left/right_shoulder_roll_link` | `L/R_Toe` | `left/right_ankle_roll_sphere_5_link` |

**箱面采样**：`load_object_data(..., sample_count=100)` 用 `trimesh.sample.sample_surface_even`（`seed=42`）在箱子表面均匀撒 100 个点。它返回两份：

- `object_local_pts_demo = 点 × s`：跟缩小后的人配套，用来建**源**网格；
- `object_local_pts = 原始点`：跟原尺寸的机器人箱子配套，用来建**目标**网格。

所以源场景是「缩小的人抱缩小的箱子」（箱子约 $0.355\times0.346\times0.308$ m，按上面的示例 $s$ 算），目标场景是「G1 抱原尺寸箱子」。Laplacian 坐标不随平移变，但会随尺度变，所以两边的尺寸差最后由优化来折中（**这是我的推断**）。

<h3 id="实例-第-3-步箱子坐标系里的-interaction-mesh">第 3 步：箱子坐标系里的 interaction mesh</h3>

`retarget_motion()` 对第 $t$ 帧：

1. 用 `transform_points_world_to_local()` 把 15 个人体关键点变到**箱子局部坐标系**。在箱子坐标系里建网格，箱子被搬着走的时候，手和箱面的相对关系才不会因为整体运动而变（`robot_only` 任务没有箱子，直接用世界系）。
2. 15 + 100 = **115 个顶点**，交给 `scipy.spatial.Delaunay` 剖分成四面体，`get_adjacency_list()` 把每个四面体的 6 条边记成邻接关系。
3. `calculate_laplacian_coordinates(uniform_weight=True)` 算出每个顶点的目标 Laplacian 坐标，权重取均匀的 $w _ {ij}=1/\|\mathcal N(i) \mid $，和论文一致。

**手算一个顶点（坐标都是示例值，单位 m，箱子坐标系）**。左手腕 $p=(-0.10,\,0.25,\,0.05)$，Delaunay 给它连了 4 个邻居：三个箱面点 $(0,\,0.23,\,0.10)$、$(-0.15,\,0.23,\,0)$、$(-0.10,\,0.23,\,-0.10)$，以及左肘 $(-0.25,\,0.40,\,0.10)$。

$$
\bar p = \tfrac14\big(\textstyle\sum p_j\big) = (-0.125,\;0.2725,\;0.025),\qquad
\delta = p-\bar p = (0.025,\;-0.0225,\;0.025)
$$

这个 $\delta$ 就是要在机器人身上复现的目标。设机器人的手腕在 $y$ 方向多离开箱面 5 cm（其余顶点先当作不动），$\delta$ 的 $y$ 分量就差 0.05，这一项代价是

$$
w\,\|\Delta\delta\|^2 = 10\times0.05^2 = 0.025
$$

（`laplacian_weights = 10`，所有 115 个顶点用同一个权重）。反过来，如果人和箱子一起平移，$\delta$ 不变，所以这项代价只管「相对关系」，不管绝对位置。箱面点也有自己的 $\delta$，它的邻居里有手腕，所以箱子那一侧也在把手往回拉。

<h3 id="实例-第-4-步一次-sqp-迭代">第 4 步：一次 SQP 迭代</h3>

对应函数 `solve_single_iteration()`。

决策变量有两组：36 维的 $\Delta q$ 和 345 维（= 115 × 3）的 Laplacian 辅助变量 `lap_var`。用 cvxpy 建模、**Clarabel** 求解。第 0 帧最多迭代 50 次，之后每帧最多 10 次，代价不再变化（`np.isclose`）就提前停；每帧从上一帧的解热启动。

**代价**（四项相加）：

| 项 | 写法 | 权重 |
|----|------|------|
| Laplacian 形变 | $\sum_i 10\,\lVert \text{lap}_i - \delta_i^{\text{src}}\rVert^2$ | 10 |
| 时间平滑 | $0.2\,\lVert \Delta q - (q _ {t-1}-q)\rVert^2$ | `smooth_weight = 0.2` |
| 限制腰部扭转 | 只罚 qpos 第 19、20 维（腰 yaw、腰 roll）的绝对值 | 0.2（`MANUAL_COST`） |
| 下身锚定 | 只在扩增时开，见第 5 步 | $5e^{-t/\tau}$ |

**约束**（全部线性化到 $\Delta q$）：

| 约束 | 线性化形式 | 默认参数 |
|------|-----------|---------|
| Laplacian 定义 | $J_L\,\Delta q - \text{lap} = -L\,V$ | $J_L = (L\otimes I_3)\,J_V$ |
| 脚粘地 | $\lvert J _ {xy}\Delta q - (p _ {t-1} - p)\rvert \le \epsilon$ | $\epsilon = 1$ mm，每脚 4 个接触球 |
| 不穿透 | $J_n\,\Delta q \ge -\phi - 0.001$ | 只查 < 0.1 m 的箱子 / 地面对 |
| 关节限位 | $q _ {lb} - q \le \Delta q \le q _ {ub} - q$ | URDF 范围 + 手工收紧 |
| 信赖域 | $\lVert\Delta q\rVert_2 \le 0.2$ | `step_size = 0.2` |

脚粘地只约束 $xy$，每个接触球占 4 行不等式。不穿透只查箱子和地面，距离阈值是 `collision_detection_threshold = 0.1`。关节限位在 URDF 的基础上又手工收紧了一些，例如腰 roll 从 ±0.52 收到 ±0.3（`MANUAL_LB / MANUAL_UB`）。信赖域是一个二阶锥约束，半径和论文的 $\epsilon = 0.2$ 一样，这就是论文说的「SOCP」。求完之后 `q[3:7]` 重新归一化成单位四元数。

**手算两条约束（数值是示例值）**：

- **不穿透**：右手和箱面的有向距离 $\phi = 0.03$ m，约束是 $J_n\Delta q \ge -0.031$，这一步最多让手朝箱子走 3.1 cm，走完还允许 1 mm 的穿透。如果已经插进去 5 mm（$\phi=-0.005$），约束变成 $J_n\Delta q \ge 0.004$，这一步必须至少退出 4 mm。
- **脚粘地**：左脚处于支撑相，某个接触球上一帧在 $(0.312,\,0.105)$，当前迭代在 $(0.318,\,0.105)$。于是 $-0.007 \le J_x\Delta q \le -0.005$、$-0.001 \le J_y\Delta q \le 0.001$，这一步必须把球往回拉 5–7 mm。

**支撑相怎么判定**：`extract_foot_sticking_sequence_velocity()` 看人体脚趾相邻两帧的 $xy$ 位移是否 ≤ 0.01。第 0 帧强制判成「不粘」，`object_interaction` 在主流程里也会再把第 0 帧关掉一次。

<h3 id="实例-第-5-步五种扩增">第 5 步：五种扩增</h3>

对应函数 `generate_augmentation_configs()`。

`--augmentation` 必须在 `_original.npz` 已经存在之后才能跑：扩增拿原始解的 `qpos` 当名义轨迹 $\bar q^\star$，第 0 帧直接从 $\bar q^\star_0$ 出发。人体源网格不变，只改机器人这边的箱子轨迹：

| 名字 | 平移（人体坐标系） | 绕 $z$ 旋转 |
|------|------------------|-------------|
| `original` | 0 | 0 |
| `trans_0` | $(0.2,\,0,\,0)$，往前 | 0 |
| `trans_1` | $(0,\,0.2,\,0)$，往左 | 0 |
| `trans_2` | $(0,\,-0.2,\,0)$，往右 | 0 |
| `rot_0` | $(0,\,0.2,\,0)$ | $+\pi/4$ |
| `rot_1` | $(0,\,-0.2,\,0)$ | $-\pi/4$ |

「人体坐标系」由 `transform_from_human_to_world()` 定义：$x$ 轴从人的初始骨盆指向箱子（水平投影），$z$ 轴朝上。

**手算 `trans_0`（示例值）**：骨盆在原点，箱子在 $(0.6,\,0.8)$，$x$ 轴就是 $(0.6,\,0.8)$，世界系偏移 $=0.2\times(0.6,\,0.8)=(0.12,\,0.16)$。`augment_object_poses()` 的做法：

- 箱子开始动之前（`extract_object_first_moving_frame`：相邻帧位姿差的范数第一次超过 0.0025），整段加满偏移；
- 开始动之后第 $k$ 帧，偏移乘 $e^{-k/50}$：$k=50$ 时剩 $(0.044,\,0.059)$，$k=150$ 时剩 $(0.006,\,0.008)$。

也就是说，箱子起点挪远了 20 cm，被搬起来以后会逐渐回到原轨迹。旋转同理，衰减常数是 25：$45°$ 在 $k=25$ 时剩 $16.6°$，$k=75$ 时剩 $2.2°$。

**下身锚定**：`NOMINAL_TRACKING_INDICES` 对 G1 是 `np.arange(19)`，也就是浮动基 7 维加两条腿 12 个关节。代价是 $w\,\lVert q _ {[0:19]} - \bar q^\star _ {[0:19]}\rVert^2$，权重 $w = 5\,e^{-t/\tau}$。

- `object_interaction` 没有把配置里的 `nominal_tracking_tau = 1e6` 传进去，用的是构造函数默认的 $\tau = 10$：$t=10$ 时 $w=1.84$，$t=30$ 时 $w=0.25$。等于只在开头约 1 秒（30 fps）拉住下身。
- `climbing` 会传 $\tau=10^6$，锚定基本一直满权重。

这是我从代码读出来的行为，论文只写了「惩罚下身偏离原动作 + 约束初始脚位」，没给 $\tau$。

**爬平台的扩增**换成地形：`z_scale ∈ {0.8, 0.9, 1.1, 1.2}` 把平台按高度缩放，同时往网格里加一张 8 × 8、覆盖 $[-2,\,2]^2$ m 的地面点阵（`climbing_ground_size / range`）。

<h3 id="实例-第-6-步输出与-rl-训练">第 6 步：输出与 RL 训练</h3>

**重定向输出** `sub3_largebox_003_original.npz`：

| 字段 | 形状 | 内容 |
|------|------|------|
| `qpos` | $(T,\,43)$ | `[0:3]` 基座位置、`[3:7]` 基座四元数 wxyz、`[7:36]` 29 个关节、`[36:43]` 箱子位姿 |
| `human_joints` | $(T,\,52,\,3)$ | 缩放后的人体关节 |
| `fps` | 标量 | 30 |
| `cost` | 标量 | 最后一帧的优化代价 |

**转换**：`convert_data_format_mj.py` 对基座位置做线性插值、对旋转做 slerp，重采样到 50 fps，再在 MuJoCo 里前向算出 `joint_pos / joint_vel / body_pos_w / body_quat_w / body_lin_vel_w / body_ang_vel_w`；带 `--has_dynamic_object` 时再加 `object_pos_w / object_quat_w / object_lin_vel_w / object_ang_vel_w`。

**奖励**（`g1_29dof_wbt_reward_w_object`）和论文的 5 项对得上：

| 论文 | Holosoma 里的项 | 权重 |
|------|----------------|------|
| Body Tracking | 全局参考位置 / 朝向（σ = 0.3 / 0.4）；相对身体位置 / 朝向（σ = 0.3 / 0.4）；身体线速度 / 角速度（σ = 1.0 / 3.14） | 0.5、0.5、1.0、1.0、1.0、1.0 |
| Object Tracking | 物体全局位置 / 朝向（σ = 0.3 / 0.4） | 1.0、1.0 |
| Action Rate | `penalty_action_rate` | −0.1 |
| Soft Joint Limit | `limits_dof_pos`（`soft_dof_pos_limit = 0.9`） | −10.0 |
| Self-Collision | `UndesiredContacts`：除脚底、手腕、踝以外的任何 link 接触力 > 1 N 就计数 | −0.1 |

最后一行按代码看，罚的是「不该碰的部位的任何接触」，比论文字面上的「自碰撞」宽（**我读 `UndesiredContacts` 实现得出的结论**）。

<h3 id="实例-论文与代码对照">论文与代码对照</h3>

| 细节 | 论文 | 开源代码 |
|------|------|---------|
| Laplacian 权重 | 均匀 $1/\lvert\mathcal N(i)\rvert$ | 一致（`uniform_weight=True`） |
| 信赖域 | $\epsilon = 0.2$ | 一致（`step_size = 0.2`，`cp.SOC`） |
| 求解器与微分 | 自定义 SQP + Drake 自动微分 | cvxpy + Clarabel，雅可比由 MuJoCo 解析计算 |
| 支撑相阈值 | 源动作脚的水平速度 < 1 cm/s | 相邻帧位移 ≤ 0.01（按 30 fps 相当于 30 cm/s）；README 还建议 LAFAN 放宽 `--retargeter.foot-sticking-tolerance 0.02` |
| 关键点 / 采样点数 | 没给 | 15 个关键点 + 100 个箱面点 |
| 自碰撞硬约束 | 列在约束里 | 默认关闭（`SelfCollisionConfig.enable = False`），需要手动配几何对 |
| 扩增衰减 | 只说「指数衰减」 | 平移 $\tau=50$、旋转 $\tau=25$、下身锚定 $\tau=10$（人-物）或 $10^6$（爬平台） |

支撑相阈值那一行：代码按帧算位移，论文写的是每秒速度，两边差了一个帧率因子。我猜是论文里的单位写法问题，但没法验证。

</details>

---

## 📊 实验结果

### 运动学质量 vs 基线（OMOMO 人-物交互）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Table II 人-物栏 —— OmniRetarget 82.20%，脚滑为 0，穿透 1.34 cm</summary>

| 方法 | 穿透时长 ↓ | 最大深度 (cm) ↓ | 脚滑时长 ↓ | 接触保持 ↑ | 下游 RL 成功率 ↑ |
|------|:---:|:---:|:---:|:---:|:---:|
| PHC | 0.68±0.21 | 5.11±3.09 | 0.05±0.05 | 0.96±0.09 | 71.28%±22.55% |
| GMR | 0.83±0.14 | 8.50±3.94 | 0.02±0.01 | 0.99±0.04 | 50.83%±23.89% |
| VideoMimic | 0.60±0.27 | 7.48±4.95 | 0.12±0.07 | 0.77±0.25 | 3.85%±8.41% |
| **OmniRetarget** | **0.00±0.01** | **1.34±0.34** | **0** | **0.96±0.09** | **82.20%±9.74%** |

论文 Table II 原值。人-地形（自采 MoCap）栏 OmniRetarget 成功率 **94.73%±22.33%**（GMR 78.94%，PHC 52.63%）；脚滑时长与最大滑速均为 0。LAFAN1 机器人-only 栏 OmniRetarget 与 Unitree 基线同为 100%。

</details>

### 真机亮点（Unitree G1）

<div class="mermaid">
flowchart LR
    subgraph PARKOUR["30 s 跑酷串联（旗舰 demo）"]
        P1["搬 4.6 kg 椅子"] --> P2["踩椅作踏台"]
        P2 --> P3["爬上平台"]
        P3 --> P4["跳下"]
        P4 --> P5["翻滚缓冲落地"]
    end

    subgraph SKILLS["其他真机技能"]
        S1["OMOMO 搬箱<br/>多样风格"]
        S2["爬 0.9 m 平台<br/>~70% 身高"]
        S3["坡面爬行"]
        S4["Wall-flip<br/>15 rad/s · 5/5"]
    end

    style PARKOUR fill:#e8f4fd,stroke:#1f78b4
    style SKILLS fill:#e8f8e8,stroke:#27ae60
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：搬箱、0.9 m 平台、30 s 跑酷、15 rad/s wall-flip，以及扩增 79.1% vs 82.2%</summary>

| 任务 | 要点 |
|------|------|
| 搬箱（OMOMO） | 多样搬箱风格，自然全身协调 |
| 爬 0.9 m 平台 | 约为机器人身高 70% |
| 坡面爬行 | 干净接触序列 |
| **30 s 跑酷串联** | 搬 4.6 kg 椅子 → 踩椅上台 → 跳下翻滚缓冲（灵感来自 Atlas demo） |
| **Wall-flip** | ~0.5 s 完成翻转，峰值角速度 **15 rad/s**；真机 **5/5** 成功率 |

扩增数据评估：全扩增集训练、名义轨迹上评测成功率 **79.1%**，仅名义轨迹评测 **82.2%**——扩增显著扩大覆盖且性能几乎不降级。

</details>

### 数据规模

<div class="mermaid">
flowchart LR
    OMOMO["OMOMO<br/>人-物交互"] --> RET["OmniRetarget<br/>interaction mesh 管线"]
    LAFAN["LAFAN1<br/>平地动作"] --> RET
    MOCAP["自采 MoCap<br/>人-地形交互"] --> RET
    RET --> DS["9+ 小时参考轨迹"]
    DS --> HF["Hugging Face 数据集"]
    DS --> HS["Holosoma 训练栈"]

    style RET fill:#e8f4fd,stroke:#1f78b4
    style DS fill:#e8f8e8,stroke:#27ae60
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：OMOMO 2.78 h + 自采 1 h + LAFAN1 4.6 h = 8.38 h，开源入口</summary>

- 从 OMOMO、LAFAN1、自采 MoCap **retarget 生成 9+ 小时**轨迹（项目页；摘要写 8+ 小时）。
- 论文 §V-B 给出可加总的三段：OMOMO 搬箱 **2.78 h** + 自采 MoCap **1 h** + LAFAN1 **4.6 h** = **8.38 h**。
- 开源：[Hugging Face 数据集](https://huggingface.co/datasets/omniretarget/OmniRetarget_Dataset) + [Holosoma 代码](https://github.com/amazon-far/holosoma)。

</details>

---

## 🔗 与重定向主线关系

<div class="mermaid">
flowchart TB
    IN["人体 mocap / 视频重建"] --> GMR
    IN --> PHC
    IN --> REACT
    IN --> NMR
    IN --> OMNI

    GMR["GMR / PHC<br/>关键点 IK<br/>无交互建模"] --> OUT1["平面动作 tracking"]
    REACT["ReActor<br/>RL 内嵌双层优化"] --> OUT2["跨本体<br/>物理可行参考"]
    NMR["NMR<br/>学习式时序映射 + CEPR"] --> OUT3["抑制 IK 跳变"]
    OMNI["OmniRetarget<br/>interaction mesh<br/>硬约束 + 扩增"] --> OUT4["人-物-地形交互<br/>loco-manipulation 数据工厂"]

    OUT1 --> RL["下游 RL tracking / 模仿"]
    OUT2 --> RL
    OUT3 --> RL
    OUT4 --> RL

    style OMNI fill:#e8f8e8,stroke:#27ae60
    style RL fill:#e8f4fd,stroke:#1f78b4
</div>

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：先读 GMR 理解「重定向质量决定下游 RL」，再看本文的交互保持</summary>

**阅读顺序建议**：先读 [Retargeting Matters](Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.md) 理解「重定向质量决定下游 RL」；再读本文看**交互保持 + 硬约束 + 数据扩增**如何把 loco-manipulation 参考做到 BeyondMimic 级简洁 RL 可跟踪。

</details>

---

## 💻 代码与数据入口

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Holosoma、Hugging Face 数据集、项目页 3D 对照</summary>

| 资源 | 说明 |
|------|------|
| [amazon-far/holosoma](https://github.com/amazon-far/holosoma) | Amazon FAR 统一仿真/训练栈；OmniRetarget 重定向与 RL 训练代码入口 |
| [OmniRetarget_Dataset](https://huggingface.co/datasets/omniretarget/OmniRetarget_Dataset) | 已 retarget 的大规模 loco-manipulation 轨迹 |
| [项目页交互 Demo](https://omniretarget.github.io) | 物体位姿/尺寸、地形高度、本体扩增的 3D 对比可视化 |

</details>

---

## 📝 个人笔记 / 待跟进

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Holosoma 闭环、与 GMR 对指标、Drake SQP 耗时、和 MeshMimic 对比</summary>

- [ ] 在 Holosoma 中跑通单条 OMOMO → G1 retarget → RL 跟踪闭环
- [ ] 对照 GMR 输出，统计同一段动作的穿透/脚滑指标
- [ ] 阅读 Drake SQP 实现细节与每帧耗时（是否满足离线批处理规模）
- [ ] 与 LessMimic / MeshMimic 等「场景感知模仿」对比数据侧差异

</details>

---

## 📚 参考文献（核心）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：OmniRetarget、Interaction Mesh、GMR、BeyondMimic、OMOMO</summary>

- Yang et al., **OmniRetarget**, arXiv:2509.26633, ICRA 2026.
- Kim et al., **Interaction Mesh** (SIGGRAPH 2013) — Laplacian 保形核心。
- Araújo et al., **GMR / Retargeting Matters** — 关键点 IK 强基线。
- Luo et al., **BeyondMimic** — 极简 reward 跟踪框架。
- Li et al., **OMOMO** — 人-物交互 mocap 来源。

</details>
