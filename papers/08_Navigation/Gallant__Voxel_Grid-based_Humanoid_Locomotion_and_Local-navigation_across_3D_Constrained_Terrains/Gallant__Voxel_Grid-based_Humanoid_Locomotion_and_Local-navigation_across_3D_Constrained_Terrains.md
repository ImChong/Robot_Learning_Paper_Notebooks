---
layout: paper
paper_order: 8
title: "Gallant: Voxel Grid-based Humanoid Locomotion and Local-navigation across 3D Constrained Terrains"
zhname: "Gallant：3D 受限地形上的体素栅格人形行走与局部导航"
category: "Navigation"
---

# Gallant: Voxel Grid-based Humanoid Locomotion and Local-navigation across 3D Constrained Terrains
**Gallant：3D 受限地形上的体素栅格人形行走与局部导航**

> 📅 阅读日期: 2026-06-17
>
> 🏷️ 板块: 08 Navigation · 体素占据栅格感知 · 局部导航 · 高保真 LiDAR 仿真 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2511.14625](https://arxiv.org/abs/2511.14625) |
| HTML | [arXiv HTML](https://arxiv.org/html/2511.14625) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2511.14625) |
| 会议版本 | [CVPR 2026 Poster](https://cvpr.thecvf.com/virtual/2026/poster/37444) |
| 源码 | [github.com/InternRobotics/Gallant](https://github.com/InternRobotics/Gallant) |
| **发布时间** | 2025-11-18 (arXiv) |
| 机构 | **上海人工智能实验室（Shanghai AI Lab）/ 港中文 CUHK / 中科大 USTC / 东京大学 / 上海交大** |
| 主要作者 | **Qingwei Ben**, Botian Xu, Kailin Li, Feiyu Jia, Wentao Zhang, Jingping Wang, Jingbo Wang, Dahua Lin, **Jiangmiao Pang** |
| 机器人 | **Unitree G1**（29 DoF）+ 双 Hesai JT128 + Livox Mid-360 LiDAR，机载 Orin NX |

---

## 🎯 一句话总结

> 以前的人形感知大多靠**深度图**或**高程图（elevation map）**——前者视野/量程有限，后者本质是 2.5D 高度场，把垂直结构（头顶限高、多层悬挑）压扁丢掉了。Gallant 改用**体素化 LiDAR 占据栅格**作为完整 3D 感知表示，并用一个把 **z 轴当通道**的 **z-分组 2D CNN** 端到端映射到策略；再配一套 **GPU 高保真 LiDAR 仿真**（含自身运动连杆扫描 + 域随机化）保证 Sim-to-Real 一致。结果是**单一策略**跨越「只会躲地面障碍」的旧局限，能同时处理侧向杂物、头顶限高、多层平台与窄门，爬楼/上台阶成功率首次逼近 100%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Voxel Grid | — | 体素占据栅格，机器人中心的 3D 二值占据张量 |
| Elevation Map | — | 高程图，2.5D 高度场（旧方案，丢垂直结构） |
| Z-grouped 2D CNN | — | 把 z 轴当通道维、在 x-y 平面做 2D 卷积，替代昂贵 3D 卷积 |
| LiDAR | Light Detection and Ranging | 激光雷达，提供 360° 点云 |
| PPO | Proximal Policy Optimization | 近端策略优化，本文 RL 算法 |
| DR | Domain Randomization | 域随机化，弥合 Sim-to-Real |
| FoV | Field of View | 视场角/感知覆盖 |

---

## ❓ 论文要解决什么问题？

鲁棒的人形行走需要对周围 **3D 环境**有准确、全局一致的感知。但现有感知模块：

1. **深度图**：视野窄、量程短，只能看正前方一小块；
2. **高程图**：是把世界压成「每个 (x,y) 一个高度」的 2.5D 表示，**天然无法表达头顶限高、悬挑、多层结构**——机器人「不知道头会不会撞到天花板」。

于是这类方法被困在「**地面障碍**」上：能跨石堆、上台阶，却无法在限高通道里低头穿行、在侧向杂物中侧身通过。Gallant 想要一种**既保留完整 3D 几何、又足够轻量能实时机载**的感知表示，让**一个策略**通吃地面 / 侧向 / 头顶 / 多层 / 窄道。

---

## 🔧 方法详解

### 1. 体素占据栅格（核心感知表示）

- 把 LiDAR 点云转成**固定尺寸、机器人中心**的二值占据栅格；
- 感知体积 **1.6m × 1.6m × 2.0m**，分辨率 **5cm**，得到 **32×32×40** 张量，占据为 1、空闲为 0；
- 关键细节 **动态自身扫描（self-scan）**：把机器人自己运动连杆的回波也算进去——这样在受限位形（低头、侧身）下才能正确推理「身体与障碍的间隙」。消融显示**去掉 self-scan，限高场景成功率从 97.1% 暴跌到 28.4%**。

### 2. Z-分组 2D CNN（轻量感知网络）

- 不用昂贵的 3D 卷积，而是把 **z 轴当成通道维（C=40）**，仅在 x-y 平面做 2D 卷积；
- 利用「LiDAR 占据在垂直方向稀疏集中」的特性，**精度不输 3D CNN，推理更快、训练迭代更省**。

### 3. 高保真 LiDAR 仿真（撑起 Sim-to-Real）

- 基于 **NVIDIA Warp** 的 GPU 光线投射-体素化管线，**预算每个 mesh 的包围体层次（BVH）**，避免逐时刻重建；
- **域随机化**：LiDAR 位姿抖动（±1cm/±1°）、命中位置噪声（±1cm）、**延迟仿真 100–200ms**、随机体素丢失（2%）——把真实雷达的噪声/延迟提前学进策略。

### 4. RL 训练与奖励

- **PPO**，1024×8 并行环境、4000 迭代，8 张 RTX 4090；
- 观测：目标位置、已用/剩余时间、动作历史、本体感受（角速度、重力向量、关节位置/速度）、体素栅格，**+ 特权高程图（仅 critic 用）**；actor/critic 共享卷积特征但参数独立；
- **稀疏到达奖励**（只在最后 2s 激活）+ **几何感知 shaping**：方向速度（含障碍排斥/切向绕行）、头部高度（主动避顶）、抬脚高度（主动上台阶）。

### 5. 八类地形课程

平地 / 限高（Ceiling）/ 稀疏丛林（Forest）/ 窄门（Door）/ 高台与缝隙（Platform）/ 踏石（Pile）/ 上楼 / 下楼，难度参数 $s\in[0,1]$ 平滑插值，成功升级、失败降级，自动课程。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SENSE["📡 感知输入"]
        LIDAR["🛰️ 双 Hesai JT128 + Livox<br/>360° LiDAR 点云"]
        PROP["🦿 本体感受<br/>角速度/重力/关节"]
    end

    subgraph PERC["🧊 体素占据感知"]
        VOX["📦 体素栅格 32×32×40<br/>1.6×1.6×2.0m @5cm"]
        SELF["🤖 动态自身扫描<br/>算进自己连杆回波"]
        ZCNN["🧠 z-分组 2D CNN<br/>z 当通道, x-y 卷积"]
    end

    subgraph POLICY["🎮 端到端策略 (PPO)"]
        ACTOR["🕹️ Actor<br/>关节动作"]
        CRITIC["📈 Critic<br/>(特权高程图仅此用)"]
    end

    subgraph SIM["🏗️ 高保真 LiDAR 仿真"]
        WARP["⚡ NVIDIA Warp 光线投射<br/>BVH 预算"]
        DR["🎲 域随机化<br/>位姿抖动+延迟100-200ms+丢点"]
    end

    subgraph OUT["🎯 行为"]
        BEH["🚶 单策略通吃<br/>限高/侧向/多层/窄道/爬楼"]
    end

    LIDAR --> VOX --> SELF --> ZCNN
    PROP --> ACTOR
    ZCNN --> ACTOR
    ZCNN --> CRITIC
    ACTOR --> BEH
    SIM -.训练时生成观测.-> VOX
    WARP --> DR

    style SENSE fill:#e8f4fd,stroke:#1f78b4
    style PERC fill:#fff7e0,stroke:#d4a017
    style POLICY fill:#f3e8ff,stroke:#8e44ad
    style SIM fill:#fde8f0,stroke:#c0399a
    style OUT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 📊 实验与结果

**仿真（每地形 1000 episodes × 5 次独立运行）**：平地 100%、限高 97.1%、丛林 84.3%、窄门 98.7%、高台 96.1%、踏石 82.1%、上楼 96.2%、下楼 97.9%。

**真机（Unitree G1，同一策略零微调，每地形 15 次）**：限高/窄门/高台/地面障碍均接近 100%，踏石约 80%（瓶颈是 LiDAR 延迟）。**所有行为来自同一策略，无需逐地形调参**。

**关键消融**：
- 去掉 self-scan → 限高 97.1%→28.4%（看不到自身遮挡，体素被「磨平」）；
- z-分组 2D CNN ≥ 稀疏/稠密 3D CNN，而训练更快；
- 只用高程图 → 限高场景仅 5.3%（彻底失败），证明高程图无法表达垂直约束；
- 体素分辨率 5cm 最优（10cm 视野大但精度差，2.5cm 精度高但视野不足）；
- 去掉域随机化（NoDR）→ 真机对障碍「判位失准、反应过晚」，成功率明显下降。

**对照（Table 1）**：Gallant 感知覆盖约 4π 立体角，远超高程图法（~1.97π）与深度相机（~0.43π），且是唯一能**同时**处理地面 + 侧向 + 头顶障碍的方法。

---

## 💡 核心贡献

1. **全 3D 感知表示**：用体素占据栅格替代高程图/深度图，第一次让人形在**单一策略**下同时处理侧向杂物、头顶限高、多层结构与窄道。
2. **z-分组 2D CNN**：把 z 当通道做 2D 卷积，精度比肩 3D CNN 而更轻量，可机载实时。
3. **高保真 LiDAR 仿真 + 自身扫描**：GPU 光线投射 + BVH 预算 + 域随机化，撑起可扩展的 LiDAR 训练与零微调 Sim-to-Real；self-scan 是受限位形避碰的关键。
4. **SOTA 结果**：爬楼/上台阶等高难场景成功率首次逼近 100%，并开源实现。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **感知维度升级** | 从 2.5D 高程图迈向完整 3D 占据，让「头顶/悬挑/多层」这类被长期忽略的约束进入策略视野 |
| **轻量可部署** | z-分组 2D CNN + 体素栅格，在 Orin NX 上机载实时，证明全 3D 感知不必昂贵 |
| **LiDAR Sim-to-Real 范式** | 高保真雷达仿真 + 域随机化，为越来越多用 LiDAR 的人形提供可复制的训练-迁移路线 |
| **局部导航与控制一体** | 把「局部导航」直接端到端融进底层运动策略，而非分层规划+跟踪 |

---

## 🎤 面试参考

**Q：为什么高程图不够，一定要体素栅格？**
A：高程图是「每个 (x,y) 一个高度」的 2.5D 表示，本质假设世界是单层地面，**无法表达头顶限高、悬挑、多层平台**。体素栅格保留完整 3D 占据，机器人才能推理「低头能不能过、身体会不会撞到上方/侧方」。消融里只用高程图在限高场景仅 5.3% 成功率，直接说明问题。

**Q：z-分组 2D CNN 为什么比 3D CNN 好？**
A：LiDAR 占据在垂直方向稀疏且集中，直接用 3D 卷积大量算力浪费在空体素上。把 z 当通道维、只在 x-y 做 2D 卷积，既利用了这种稀疏性，精度不输甚至优于 3D CNN，推理延迟与训练迭代时间都更低，便于机载实时。

**Q：self-scan（动态自身扫描）为什么这么关键？**
A：真实 LiDAR 会被机器人自己的运动连杆遮挡/反射。若仿真里不建模自身回波，体素表示会被「磨平」成虚假的空旷，机器人在低头/侧身等受限位形里就误判间隙。加上 self-scan 后限高成功率从 28.4% 回到 97.1%。

**Q：Sim-to-Real 靠什么撑住？**
A：一套 GPU 高保真 LiDAR 仿真（Warp 光线投射 + 逐 mesh BVH 预算保证可扩展）+ 域随机化（位姿抖动、命中噪声、100–200ms 延迟、2% 丢点）。去掉域随机化后真机会「判位失准、反应过晚」，说明延迟/噪声建模是迁移成功的核心。

---

## 🔗 相关阅读

- [Gallant arXiv](https://arxiv.org/abs/2511.14625) · [HTML](https://arxiv.org/html/2511.14625) · [PDF](https://arxiv.org/pdf/2511.14625) · [代码 InternRobotics/Gallant](https://github.com/InternRobotics/Gallant) · [CVPR 2026 Poster](https://cvpr.thecvf.com/virtual/2026/poster/37444)
- 同模块对照：
  - [STATE-NAV](../STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain/STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain.html)（稳定性感知的可通过性估计）
  - [FocusNav](../FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local/FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local.html)（路径点引导的局部导航）
  - [LookOut](../LookOut__Real-World_Humanoid_Egocentric_Navigation/LookOut__Real-World_Humanoid_Egocentric_Navigation.html)（第一视角头部位姿预测导航）
  - [Thinking in 360°](../Thinking_in_360__Humanoid_Visual_Search_in_the_Wild/Thinking_in_360__Humanoid_Visual_Search_in_the_Wild.html)（转头主动视觉搜索）
- 感知线对照：体素占据 vs 高程图/深度图，是从 2.5D 走向完整 3D 感知的代表工作
