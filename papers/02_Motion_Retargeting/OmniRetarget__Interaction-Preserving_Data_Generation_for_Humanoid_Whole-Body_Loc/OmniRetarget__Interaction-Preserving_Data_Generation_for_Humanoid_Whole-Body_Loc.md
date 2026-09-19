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

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（问题定义、方法详解、实验结果）按小节收起，再往后的主线关系、代码入口、个人笔记与参考文献各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；系统总览、网格构建、扩增与 RL 配方等流程图留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

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
