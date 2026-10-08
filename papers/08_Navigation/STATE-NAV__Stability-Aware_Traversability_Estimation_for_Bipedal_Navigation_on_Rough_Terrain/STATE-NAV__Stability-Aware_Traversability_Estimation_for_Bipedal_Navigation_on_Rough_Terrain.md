---
layout: paper
paper_order: 4
title: "STATE-NAV: Stability-Aware Traversability Estimation for Bipedal Navigation on Rough Terrain"
zhname: "STATE-NAV：用稳定性感知的可通过性估计做双足机器人粗糙地形导航"
category: "Navigation"
---

# STATE-NAV: Stability-Aware Traversability Estimation for Bipedal Navigation on Rough Terrain
**STATE-NAV：用稳定性感知的可通过性估计做双足机器人粗糙地形导航**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: Navigation · 可通过性估计 · 双足导航 · 粗糙地形 · 风险敏感规划
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2506.01046](https://arxiv.org/abs/2506.01046) |
| HTML | [在线阅读](https://arxiv.org/html/2506.01046v2) |
| PDF | [下载](https://arxiv.org/pdf/2506.01046) |
| 项目主页 | [state-nav.github.io/statenav](https://state-nav.github.io/statenav/) |
| **发布时间** | 2025-06-01 (arXiv) |
| 源码 | [yzwfromk/STATE-NAV](https://github.com/yzwfromk/STATE-NAV)（已开源，官方实现；ROS1/ROS2 + Docker） |
| 出版 | IEEE RA-L 2025 |
| 提交日期 | 2025-06 |

**机构**：Georgia Tech · **LIDAR Group + Lunar Lab**（导师：Prof. Ye Zhao、Prof. Lu Gan）。
**作者**：Ziwon Yoon, Lawrence Y. Zhu, Jingxi Lu, Lu Gan, Ye Zhao。

**任务定位**：双足机器人在**真实粗糙、起伏地形**上的**风险敏感导航**——不仅要"走到目标"，还要"按机器人能稳住的速度走"。

---

## 🎯 一句话总结

STATE-NAV 把双足机器人的"可通过性"重新定义为**"在不失稳的前提下能跑多快"**：用 Transformer（**TravFormer**）从局部几何特征预测出**稳定性感知的命令速度图**，再把这张速度图灌进 **TravRRT\* + MPC** 的分层规划器里，从而在粗糙地形上同时拿到**安全**和**时效**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| TravFormer | Traversability Transformer | 论文提出的可通过性估计器（Transformer 主干） |
| TravRRT\* | Traversability-informed RRT\* | 接受速度图的 RRT\* 路径搜索 |
| RRT\* | Rapidly-exploring Random Tree Star | 一种渐近最优采样路径规划 |
| MPC | Model Predictive Control | 模型预测控制 |
| RA-L | IEEE Robotics and Automation Letters | IEEE 机器人与自动化快报 |

---

## ❓ 论文要解决什么问题？

传统的"可通过性"在车辆、四足上已经被研究很多，但**双足**走的是**离散的脚步**、动力学高度欠驱动，"地形看上去能走 ≠ 双足能走稳"。已有做法多依赖**人工规则**（如基于坡度、台阶高度），在真实粗糙地形上往往：

1. **忽略本体动力学**：不考虑双足在该地形上保持平衡的能力，把可通过性退化成"几何可行性"；
2. **没有速度概念**：要么二值"能 / 不能"，要么连续值但和真正的安全行走速度脱钩；
3. **难以做风险敏感规划**：上层 planner 拿不到"我以多大速度通过这片区域更稳"的连续信号。

STATE-NAV 的核心切入：把可通过性**显式定义为「能在不失稳的前提下跑到的最大命令速度」**——一个**连续、可优化、可作为代价函数的速度图**。

---

## 🔧 方法拆解

### 1. TravFormer：用 Transformer 学"双足失稳概率"

- **输入**：以机器人当前位姿为中心截取的**局部几何表征**（点云 / 高度图），由 LiDAR + 深度相机融合得到。
- **自监督信号**：用 **body-to-stance-foot angle**（躯干相对支撑脚的倾斜角）作为**失稳代理**——在仿真里大量跑双足，让模型直接从地形 + 速度预测这个角的统计量，无需人工标注稳定 / 不稳定。
- **输出**：在不同**候选命令速度**下的**失稳概率分布**（带不确定性）。
- **可通过性 = 速度**：取**满足"失稳概率 < 用户定义阈值"的最大速度**，作为该点的可通过性数值。整张地图就构成了一张**稳定性感知的命令速度图**。

### 2. TravRRT\*：把速度图灌进路径搜索

- 经典 RRT\* 的代价通常是**距离 / 时间**；
- TravRRT\* 把节点 / 边的代价改写成"按当前速度图走这条边需要多久"，于是规划器**自动绕开高失稳风险区域**、偏好**能跑快的安全走廊**。
- 论文给出的实现：**RRT\* 迭代数 500**，节点扩展用速度图作为局部代价。

### 3. MPC：双足执行层

- 上层 TravRRT\* 给出参考路径；下层用 **MPC（horizon = 5 步）** 在线生成**脚步落点 / 速度命令**；
- MPC 的成本同时含**跟踪参考路径 + 局部稳定性 + 速度上限**，把"高速但仍稳"压成实际行走指令。

### 4. 验证

- **平台**：Agility Robotics **Digit**（典型欠驱动双足），在 **MuJoCo** 里搭粗糙地形，机载 **LiDAR + 深度相机**做局部感知。
- **对比**：与几何规则可通过性 / 不带稳定性约束的 RRT\* 等基线对比，STATE-NAV 在**到达率、用时、失稳事件数**上同时占优。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENSE["👁️ 感知与几何"]
        LIDAR["📡 LiDAR"]
        DEPTH["🎥 深度相机"]
        GEO["🗺️ 局部几何<br/>(点云 / 高度图)"]
    end

    subgraph EST["🧠 TravFormer<br/>稳定性感知可通过性估计"]
        ENC["🔡 Transformer 编码<br/>(地形 + 候选速度)"]
        ANG["📐 自监督代理:<br/>body-to-stance-foot angle"]
        INSTAB["⚠️ 失稳概率<br/>(带不确定性)"]
        VMAP["🚦 速度图<br/>v*(x) = max v s.t.<br/>P(unstable) < δ"]
    end

    subgraph PLAN["🧭 分层规划"]
        RRT["🌳 TravRRT*<br/>(500 iter, 用速度图作代价)"]
        REF["🛤️ 参考路径 + 期望速度"]
        MPC["🎮 MPC<br/>(horizon = 5 步)"]
    end

    subgraph EXEC["🤖 Digit 双足执行"]
        STEP["🦶 落脚 + 速度命令"]
        SIM["🧪 MuJoCo 粗糙地形"]
    end

    LIDAR --> GEO
    DEPTH --> GEO
    GEO --> ENC
    ENC --> INSTAB
    ANG -. "训练自监督" .-> ENC
    INSTAB --> VMAP

    VMAP --> RRT
    RRT --> REF
    REF --> MPC
    MPC --> STEP
    STEP --> SIM
    SIM -. "下一帧几何" .-> GEO

    style SENSE fill:#e8f4fd,stroke:#1f78b4
    style EST fill:#f3e8ff,stroke:#8e44ad
    style PLAN fill:#fff7e0,stroke:#d4a017
    style EXEC fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **可通过性 = 稳定性感知的命令速度**：把"能不能走"升级成"能多快走还不会摔"，连续、可优化、可直接作为 planner 代价。
2. **TravFormer**：首个为**双足**设计的、用**身体-支撑脚倾角**做自监督的 Transformer 可通过性估计器，支持**不确定性输出**，便于风险敏感决策。
3. **TravRRT\* + MPC 分层架构**：把速度图分别灌进**全局搜索（RRT\*）**与**局部执行（MPC）**两层，全栈打通"地形 → 路径 → 行走"。
4. **MuJoCo + Digit 验证**：在不规则地形上**到达率、用时、失稳次数**全面优于几何可通过性基线。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 速度图的意义 | 用"能跑多快"作连续可通过性，比二值/几何更贴合双足真实能力 |
| 自监督信号 | body-to-stance-foot angle 是**便宜、可在仿真里大量采样**的稳定性代理，无需人工标注 |
| 风险敏感 | 不确定性输出 + 阈值 δ 使得"安全 vs 时效"成为**用户可调**的旋钮 |
| 分层规划 | RRT\* 拿到速度图后能**自动选快慢通道**；MPC 在 5 步窗口里把高层意图落到脚步上 |

> ⚠️ 上表为结构性总结，具体数值请以论文正式版与项目页为准。

---

## 🤖 对人形 / 双足导航领域的意义

| 方向 | 含义 |
|---|---|
| **可通过性的重定义** | 从"地形可行性"转向"动力学可行性"，给双足 / 人形导航提供了一个**与平台耦合**的合理度量 |
| **自监督代理** | 用倾角这类**易获取的本体信号**做训练标签，避开"标注稳定性"的不可能任务，是稳定性学习里很有用的范式 |
| **与上层 VLM / 语义导航互补** | NaVILA / EgoActor 等语义路径下游需要**"能跑多快还稳"** 这件事，STATE-NAV 提供的速度图是天然的下层接口 |
| **风险敏感闭环** | 不确定性 + 阈值机制让"激进 / 保守"成为一行配置，符合真实部署对**可控冒险**的需求 |

---

## 🎤 面试参考

**Q：为什么用"body-to-stance-foot angle"做自监督信号，而不是直接预测摔倒？**
A：摔倒是**稀疏、滞后**的事件，难以训练稳定的回归模型；身体相对支撑脚的倾角是**连续、稠密、可微**的量，并且与失稳具有强单调关系——倾角越大越接近失稳。它本质上是"失稳的早期指示器"，在仿真里**几乎免费**就能采到大量样本。

**Q：可通过性输出"速度"而不是"概率"，工程上有什么好处？**
A：路径规划器天然要回答**"按多大速度走这一段需要多久"**——给概率还得二次映射；给速度可以**直接作为代价**计算时间，跟 RRT\* / Dijkstra / MPC 全兼容。同时"满足阈值的最大速度"是**单调凸结构**，易于解析。

**Q：和 FocusNav、NaVILA、Skill-Nav 这类工作的关系？**
A：可以理解为**互补的三层**：
- **语义层（NaVILA / EgoActor）**：理解任务和高层目标；
- **几何 + 注意力层（FocusNav）**：在视野里挑出真正该看的局部；
- **动力学层（STATE-NAV）**：告诉规划器"这块地我能以多快通过还不会摔"。
组合起来正好是一套"语义 → 注意力 → 稳定速度图"的人形 / 双足导航分层栈。

**Q：从仿真训出来的 TravFormer 在真机上为什么有泛化基础？**
A：核心在于**输入与标签的"内禀性"**：输入是局部几何（点云 / 高度图），标签是倾角统计量——这两者**对机器人型号、地形纹理的依赖都比较弱**，主要由几何与刚体动力学决定。再叠加 MPC 在线滚动，**模型即便不完全准确**，也能在每一步上做局部纠偏。

---

## 🔬 源码解读

> 官方代码已开源：[yzwfromk/STATE-NAV](https://github.com/yzwfromk/STATE-NAV)（可从项目页 [state-nav.github.io/statenav](https://state-nav.github.io/statenav/) 的 "Code" 进入），README 对应 IEEE RA-L 2025 论文（DOI 10.1109/LRA.2025.3648502），自述为"首个面向人形/双足、覆盖多样粗糙地形的学习式可通过性估计与导航框架"。这是一个**面向部署的 ROS 集成栈**（同时支持 ROS1/ROS2 + Docker），而非纯训练仓库。

**目录结构**

| 路径 | 内容 |
|---|---|
| `ROS/` | ROS 集成节点（可通过性估计 + 规划） |
| `statenav_global/` | 核心全局规划模块（TravRRT* 等） |
| `executables/` | 可运行入口与配置 |
| `launch/` | ROS launch 文件 |
| `docker/` | 可复现容器环境 |
| `images/` | 文档配图 |

**实现要点**

- 学习组件实现论文的 **TravFormer**——一个预测双足失稳风险（含不确定性）的 Transformer，对应"Body-to-Stance-Foot Angle 自监督信号 + 机器人专属的速度代价图"；下游接 **TravRRT\*** 风险敏感采样规划器，把"学到的速度图"转成可执行路径。
- 复用 MIT 许可的 [elevation_mapping_cupy](https://github.com/leggedrobotics/elevation_mapping_cupy)（高度图）与 pypolo 等依赖；仓库顶层未单独声明 license，二次使用需向作者确认。
- Docker + RViz 工具链表明这是一个**部署导向**的释出：可在真实/仿真双足机器人上复现粗糙地形导航管线，约 98% 代码为 Python。

---

## 🔗 相关阅读

- [FocusNav (2601.12790)](https://arxiv.org/abs/2601.12790)：路径点引导注意力 + 稳定性门控，**SASG 与 STATE-NAV 的速度图思想互补**
- [EgoActor (2602.04515)](https://arxiv.org/abs/2602.04515)：VLM 任务规划，可作 STATE-NAV 的语义上层
- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：足式 VLA 导航，需要下层稳定速度估计
- [ProNav (2307.09754)](https://arxiv.org/abs/2307.09754)：四足的本体感知可通过性估计，**STATE-NAV 把这一思路推到双足并 Transformer 化**
- [Traversability-Aware Legged Navigation (2410.10621)](https://arxiv.org/abs/2410.10621)：从真实视觉数据学可通过性的四足工作，与本文形成"四足 → 双足"的研究脉络
