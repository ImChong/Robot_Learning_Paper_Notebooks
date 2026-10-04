---
layout: paper
paper_order: 15
title: "A Framework for Optimal Ankle Design of Humanoid Robots"
zhname: "人形机器人踝关节最优设计框架"
category: "硬件设计"
arxiv: "2509.16469"
---

# A Framework for Optimal Ankle Design of Humanoid Robots
**把「并联踝选哪种构型、配哪款电机、几何参数怎么定」变成一条可量化的流水线：闭式逆运动学 + 保证工作空间可行的 RSU 重参数化 + 多目标优化出 Pareto 前沿 + 七指标标量代价做跨构型排序。**

> 📅 阅读日期: 2026-10-04
>
> 🏷️ 板块: 12 Hardware Design · 踝关节机构 · 并联机构 · 设计优化
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2509.16469](https://arxiv.org/abs/2509.16469) |
| HTML | [在线阅读](https://arxiv.org/html/2509.16469v1) |
| PDF | [下载](https://arxiv.org/pdf/2509.16469) |
| 源码 | 论文未给出公开代码/项目页（框架用 Grasshopper + Python 实现，NSGA-II 通过 Tunny 插件求解） |
| **发布时间** | 2025-09-19 (arXiv v1) |
| 收录 | IEEE-RAS Humanoids 2025（首尔） |

**作者**：Guglielmo Cervettini⋆、Roberto Mauceri⋆（共同一作）、Alex Coppola、Fabio Bergonti、Luca Fiorio、Marco Maggiali、Daniele Pucci（意大利技术研究院 IIT · Artificial and Mechanical Intelligence Lab / iCub Tech Facility；两位一作同时隶属曼彻斯特大学）。

**定位**：一篇**设计方法学**论文，不提新机构，而是回答「Optimus、G1、Digit 都改用并联踝了，可到底该选哪种并联构型、配哪款执行器、几何参数取多少」——给出一套能横向比较不同构型和不同电机的量化框架。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| SPU | Spherical-Prismatic-Universal | 每条支链为「球铰–移动副–万向节」，用**直线执行器**（伸缩杆）驱动 |
| RSU | Revolute-Spherical-Universal | 每条支链为「转动副–球铰–万向节」，用**旋转电机 + 曲柄连杆**驱动（G1 式踝） |
| IK | Inverse Kinematics | 逆运动学：给定脚的 roll/pitch，求两个执行器的位移/转角 |
| EE | End-Effector | 末端执行器，这里就是脚 |
| CoM | Center of Mass | 质心 |
| NSGA-II | Non-dominated Sorting Genetic Algorithm II | 经典多目标遗传算法，输出 Pareto 前沿 |

---

## ❓ 这篇论文要解决什么问题？

踝是腿上**最先接触地面**的关节，对敏捷性影响最大。近年新一代人形大多把踝从串联改成并联：

- **好处**：电机可以上移到小腿近端（远端质量小、CoM 高、更省能），两台电机共同分担力矩（单台可以更小），结构刚度和精度也更好；
- **难处**：并联机构参数多、力矩/速度需求随姿态在工作空间里**剧烈变化**，不能像串联那样「每个关节单独选电机」，必须**全局耦合地优化**；
- **空白**：已有综述只列出可选构型，**没有量化标准**告诉设计者「对我这台机器人、这些任务、这几款能买到的电机，哪种构型最好」。

所以本文要做的是：**一个统一框架，同时选构型、选执行器、定几何参数，并且不同构型之间可以直接比较。**

---

## 🦴 两种踝构型与闭式逆运动学

小腿当「基座」、脚当「末端」，两者之间有 3 条支链：中间一条只是一个万向节 $\mathrm{U}_0$（决定脚的 roll $\varphi$ / pitch $\vartheta$），左右两条是被驱动的支链。按 Grübler–Kutzbach 公式机构自由度为 2，所以两个执行器就够。

| 构型 | 支链 | 驱动量 | 闭式 IK |
|---|---|---|---|
| **SPU** | 球铰 S → 移动副 P → 万向节 U | 伸缩长度 $\zeta_i$ | $\zeta_i = \sqrt{\lVert\bm a_i\rVert^2 + \lVert\bm b_i\rVert^2 - 2\,\bm a_i^\top R(\varphi,\vartheta)\,\bm b_i}$（取正根，负根会穿脚） |
| **RSU** | 转动副 R → 球铰 S → 万向节 U | 曲柄转角 $\alpha_i$ | 化成 $\rho_i \sin(\alpha_i + \phi_i) = k_i$，$\alpha_i = -\phi_i + \arcsin(k_i/\rho_i)$ 或 $\pi - \dots$ |

技巧是在**球铰处把闭链剪开**，令两侧的点重合（每个回路 3 个方程），再对两边取范数把万向节的未知角消掉，于是两种构型都得到**解析 IK**，优化时可以每秒评估大量候选设计。

RSU 有个麻烦：IK 只在 $\lvert k_i/\rho_i\rvert \le 1$ 时有解——参数随便取，曲柄和连杆可能在某些脚姿下「连不上」。

---

## 🧮 关键创新：RSU 重参数化，让「可行」自动成立

不再直接优化曲柄长 $c_i$、连杆长 $r_i$，而是先由期望工作区 $\Omega$ 推出它们的**可行区间**，再用 $[0,1]$ 的新变量插值：

- **曲柄**：从存在条件反推出下界 $c _ {i,\min} = \max _ {\Omega} \dfrac{\lvert d^\star _ {i,\max} d^\star _ {i,\min} - \lVert\bm d_i\rVert^2\rvert}{2\lVert\bm d_i\rVert\rho_i}$（无上界），令 $c_i(\gamma_i) = \dfrac{c _ {i,\min}}{1-\gamma_i}$，$\gamma_i\in[0,1]$；
- **连杆**：给定 $c_i$ 后，$r_i^2$ 必须落在所有脚姿区间的交集 $[r _ {i,\min}^2,\ r _ {i,\max}^2]$ 内，令 $r_i(\delta_i) = (1-\delta_i)\,r _ {i,\min} + \delta_i\,r _ {i,\max}$。

于是**任意** $(\gamma_i,\delta_i)\in[0,1]^2$ 都保证整个 $\Omega$ 内 IK 有解。论文 Fig. 4 把 $\Omega$ 从 $\pm15^\circ$ 一路放大到 $\pm150^\circ$ 验证：期望区域始终在可解区域之内（$\gamma,\delta$ 取 0.001 时刚好贴着曲柄–连杆共线的奇异曲线）。优化器不再浪费时间在「装不起来」的设计上。

---

## 📐 两阶段评估框架

**阶段 1：每个「构型 × 执行器」组合各跑一次多目标优化**

$$\min _ {\bm\pi\in\Pi}\big(f_1(\bm\pi),\ f_2(\bm\pi)\big)$$

- 设计变量：SPU 是 $\bm\pi = [\bm a_i, \bm b_i]$；RSU 是 $[\bm a_i, \bm b_i, \psi_i, \gamma_i, \delta_i]$；
- $f_1$ = 所有参考任务上**执行器峰值力/力矩**（$J^\top \mathrm f$），$f_2$ = **执行器峰值速度**（$J^{-1}\mathrm v$）；
- 可行集 $\Pi$：执行器额定值、行程、硬件限位、避碰，以及工作区 $\Omega$；
- 用 NSGA-II 求出 Pareto 前沿。这一步最贵，所以每个组合只算一次。

**阶段 2：七指标标量代价 $\xi$，跨构型、跨电机排序**

把视角从「执行器内部」切到「踝关节外部」（roll/pitch）：

| # | 指标 | 方向 |
|---|---|---|
| i | 速度：执行器额定速度下踝能转多快 | 越大越好 |
| ii | 力矩：执行器额定力矩下踝能出多少力矩 | 越大越好 |
| iii | 反驱力矩：克服执行器静摩擦需要的踝力矩 | 越小越好 |
| iv | 可操作度比 $\kappa = \sqrt{\lambda _ {\max}/\lambda _ {\min}}$ | 越接近 1 越好（各向同性） |
| v | 紧凑度：中立位包络圆柱半径 | 越小越好 |
| vi | 驱动质量（RSU 含曲柄连杆） | 越小越好 |
| vii | 执行器 CoM 高度 | 越高越好 |

- 前四项随姿态变，在姿态网格上算**加权均值 $\mu$ 与方差 $\sigma^2$**：任务覆盖的**核心区**权重为 1，外圈**扩展区**用升余弦平滑衰减到 0；
- 所有指标在全体候选上 min–max 归一化，$\xi = \sum_j \eta_j \tilde m_j$，$\sum_j\eta_j = 1$；
- 权重 $\eta_j$ 可按应用改（偏重反驱性或紧凑度），**改权重不用重跑优化**——这是把两阶段拆开的主要原因。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PROB["❓ 问题：并联踝怎么选、怎么定参数"]
        P1["并联踝优势<br/>电机上移 · 力矩分担 · 刚度高"]
        P2["难点：参数多<br/>力矩/速度随姿态剧烈变化"]
        P3["空白：缺少跨构型<br/>跨执行器的量化标准"]
    end

    subgraph TASK["📥 任务输入"]
        T1["实验动态行走"]
        T2["仿真 20% 坡道"]
        T3["仿真 20 cm 台阶上下"]
        T4["工作区 Ω<br/>roll ±35° · pitch −70°~30°"]
    end

    subgraph KIN["🦴 运动学建模"]
        K1["SPU：直线执行器<br/>ζᵢ 闭式 IK"]
        K2["RSU：旋转电机+曲柄连杆<br/>αᵢ 闭式 IK"]
        K3["RSU 重参数化<br/>γᵢ, δᵢ ∈ [0,1] 保证 Ω 内必有解"]
    end

    subgraph OPT["⚙️ 阶段 1：多目标优化（每个构型×执行器）"]
        O1["设计变量 π<br/>aᵢ, bᵢ (+ψᵢ, γᵢ, δᵢ)"]
        O2["min 峰值力 f₁ / 峰值速度 f₂<br/>Jacobian 映射"]
        O3["NSGA-II（Grasshopper+Tunny）<br/>→ Pareto 前沿"]
    end

    subgraph EVAL["📊 阶段 2：七指标标量代价 ξ"]
        E1["速度 · 力矩 · 反驱力矩 · κ<br/>核心区/升余弦加权 μ 与 σ²"]
        E2["紧凑度 · 驱动质量 · CoM 高度"]
        E3["min-max 归一化<br/>ξ = Σ ηⱼ·m̃ⱼ"]
    end

    subgraph RES["🏁 结果"]
        R1["RSU 多数指标优于 SPU<br/>SPU 波动更小"]
        R2["Synapticon 执行器<br/>均值低、方差小"]
        R3["最优 RSU：代价比原串联踝 −41%<br/>比人工设计 RSU −14%"]
    end

    PROB --> TASK
    T1 --> T4
    T2 --> T4
    T3 --> T4
    TASK --> KIN
    K2 --> K3
    KIN --> OPT
    O1 --> O2 --> O3
    OPT --> EVAL
    E1 --> E3
    E2 --> E3
    EVAL --> RES

    style PROB fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style TASK fill:#eef6ff,stroke:#5b8def,color:#10335e
    style KIN fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OPT fill:#f3e8ff,stroke:#8e44ad,color:#3d0f5a
    style EVAL fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style RES fill:#ffe8ec,stroke:#c0392b,color:#5a1010
</div>

---

## 🔬 案例：把一台现有人形的串联踝改成并联

- **任务**：① 实验采集的动态行走；② 仿真 20% 坡道行走；③ 仿真上下 20 cm 台阶（轨迹优化生成）。所有任务的踝轨迹并集定出工作区 roll $[-35^\circ, 35^\circ]$、pitch $[-70^\circ, 30^\circ]$；核心区为 roll $[-17.5^\circ, 17.5^\circ]$、pitch $[-60^\circ, 20^\circ]$。
- **执行器（全部商用）**：SPU 用 Wittenstein AL32 直线执行器（滚珠丝杠，导程 2 mm，行程 160 mm）；RSU 用三款低减速比（9:1–19:1）旋转执行器 Maxon HEJ 70-48-50、MyActuator RMD-X6-P20-60、Synapticon ACTILINK JD 10，以保证反驱性。
- **代价权重**：七个指标均匀分配。

---

## 📊 实验结果速览

| 对比 | 结论 |
|---|---|
| 不同执行器的 Pareto 解 | **Synapticon** 组的平均代价最低、方差最小 |
| 最优 RSU vs 最优 SPU | RSU 在大多数指标上更好；SPU 在工作区内的**性能波动更小**，但整体仍是 RSU 胜 |
| 最优 RSU vs 人工迭代 CAD 设计的 RSU | 把人工几何配上三款旋转执行器得到 3 个候选，优化种群里**都有代价更低的解**；最优解代价低 **14%** |
| 最优 RSU vs 原串联踝 | 代价低 **41%**；几乎所有优化解都比原串联踝好（串联踝性能与姿态无关，不需要区域加权） |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **设计工具** | 把「凭经验 + CAD 反复试」的并联踝设计变成可复现、可横向比较的量化流程 |
| **构型 × 选型联合决策** | 同一套代价可以同时比较「直线 vs 旋转」构型和不同厂家的电机 |
| **重参数化思路** | 把可行性约束「编码」进参数化里（$\gamma,\delta\in[0,1]$ 永远可装配），大幅提升优化效率；可迁移到其他闭链机构 |
| **任务驱动** | 工作区与力/速需求来自真实/仿真步态数据，设计直接对准机器人要做的动作 |

---

## ⚠️ 局限

- **只做到代价层面**：没有造出并联踝样机，也没有在真机上验证行走性能；
- **代价不在优化环里**：优化目标只有峰值力/速度，七指标代价是事后排序；作者把「代价直接进优化循环」列为未来工作；
- **避碰检查不完整**：目前只在可行集里加了几何约束，全工作区碰撞检测留待后续；
- **权重主观**：均匀权重只是一种选择，换应用场景需要重新定 $\eta_j$，结论可能随之改变；
- **只比较两种构型**：SPU/RSU 之外的并联踝（如 2-RSS、球面机构）不在本文范围内。

---

## 🎤 面试参考

**Q：为什么新一代人形踝普遍用并联机构？**
A：并联踝把两台电机放到小腿上部，通过连杆驱动脚，带来三点好处：远端质量小、CoM 高，摆腿更省能；两台电机共同分担 roll/pitch 力矩，单台可以更小；闭链结构刚度和精度也更高。代价是运动学耦合、力矩/速度需求随姿态变化，设计更难。

**Q：SPU 和 RSU 有什么区别？**
A：都是「中间一个万向节 + 两条驱动支链」的 2 自由度踝。SPU 的支链是球铰–移动副–万向节，用直线执行器（伸缩杆）推拉；RSU 的支链是转动副–球铰–万向节，用旋转电机带曲柄、经连杆推拉脚（Unitree G1 这类踝）。本文案例里 RSU 整体指标更好，SPU 的性能在工作区内更均匀。

**Q：RSU 的重参数化解决什么问题？**
A：RSU 的 IK 只在 $\lvert k_i/\rho_i\rvert\le 1$ 时有解，几何参数取得不好，某些脚姿下曲柄和连杆就连不上。作者从期望工作区反推曲柄长度下界和连杆长度区间，再用 $\gamma,\delta\in[0,1]$ 在区间内插值，使任何参数取值都保证全工作区可装配，优化器不必浪费时间在不可行设计上。

**Q：为什么把多目标优化和标量代价拆成两个阶段？**
A：多目标优化最贵，而且依赖具体执行器的约束，每个「构型 × 执行器」组合只能各跑一遍；标量代价计算很快，可以随应用随意调整权重而不用重跑优化。这样也把执行器内部负担（力/速度）和踝外部任务性能分开了。

---

## 🔗 相关阅读 / 类似方向

- [Dual-Cam Parallel Elastic Actuator for Humanoid Ankles (arXiv 2608.30832)](https://arxiv.org/abs/2608.30832)：同模块，用双凸轮 + 共享气弹簧给踝加并联弹性补偿
- [DecARt Leg (arXiv 2511.10021)](https://arxiv.org/abs/2511.10021)：同模块，解耦驱动人形腿 + 多连杆踝传动
- [Control of Humanoid Robots with Parallel Mechanisms using Kinematic Actuation Models (arXiv 2503.22459)](https://arxiv.org/abs/2503.22459)：并联踝/膝的控制侧建模，与本文的设计侧互补
- [Human-Level Actuation for Humanoids (arXiv 2511.06796)](https://arxiv.org/abs/2511.06796)：同模块，关节驱动器的量化基准与选型讨论

---

> 备注：本笔记依据 arXiv 元信息与论文 HTML 公开内容整理；工作区范围、执行器型号与代价下降百分比以论文为准。论文未开源代码（框架基于 Grasshopper + Python + Tunny/NSGA-II），也未公开被改造机器人的具体型号，故本笔记只给出方法流程 mermaid，没有源码运行时序图。
