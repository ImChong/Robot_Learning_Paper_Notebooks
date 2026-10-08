---
layout: paper
paper_order: 8
title: "Stability-Aware Retargeting for Humanoid Multi-Contact Teleoperation"
zhname: "面向多接触遥操作的稳定性感知重定向（用质心稳定裕度梯度实时改写操作员指令）"
category: "Teleoperation"
---

# Stability-Aware Retargeting for Humanoid Multi-Contact Teleoperation
**面向多接触人形遥操作的稳定性感知重定向**

> 📅 阅读日期: 2026-06-16
>
> 🏷️ 板块: 07 Teleoperation · 多接触遥操作 / 质心稳定性 / 稳定裕度梯度 / 重定向(retargeting)
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|---|---|
| arXiv | [2510.04353](https://arxiv.org/abs/2510.04353) |
| HTML | [arXiv HTML](https://arxiv.org/html/2510.04353) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2510.04353) |
| 期刊版 | [IEEE Xplore（RA-L）](https://ieeexplore.ieee.org/document/11204000) |
| **发布时间** | 2025-10-05（arXiv） |
| 源码 | 截至当前未见公开仓库（论文未给出 GitHub / 项目页链接） |
| 机构 | **IHMC**（Florida Institute for Human and Machine Cognition，佛罗里达人机认知研究所） |
| 主要作者 | **Stephen McCrory**, Romeo Orsolino, Dhruv Thanki, Luigi Penco, **Robert Griffin** |
| 实验平台 | IHMC 液压-电驱混合人形机器人（下肢液压、上肢电驱）+ Valve Index VR 遥操作 |

---

## 🎯 一句话总结

> 当人形机器人需要**用手去推墙、撑天花板、按在斜面/不平表面上**完成作业时，多了几个接触点反而让稳定性更难算、更易崩——操作员一个看似合理的指令就可能让某个关节力矩饱和或让手打滑。本文提出**稳定性感知的重定向（stability-aware retargeting）**：用 actuation-aware 的**质心稳定区域**度量「现在离失稳还有多远」，再**解析地算出稳定裕度对接触点/关节位形的梯度**，从而在遥操作回路里实时、低开销地**微调接触位置与上身姿态**，把机器人往更稳的位形拉，同时仍尊重操作员的高层意图。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| CoM | Center of Mass | 质心 |
| LP | Linear Program | 线性规划（求稳定区域边界用） |
| IK | Inverse Kinematics | 逆运动学 |
| RA-L | Robotics and Automation Letters | IEEE 机器人快报 |
| DoF | Degrees of Freedom | 自由度 |

---

## ❓ 论文要解决什么问题？

遥操作人形机器人做 loco-manipulation 时，常需要**手部接触环境**来辅助平衡或施力（撑墙、按住、推门）。但一旦接触面**不共面、不规则**，问题就来了：

- **失稳与打滑**：手的接触力方向受限于摩擦锥，操作员随手给的指令可能让接触点滑掉；
- **电机力矩饱和**：多接触下重力/外力如何在关节间分配很敏感，某个关节很容易先到力矩极限，机器人"使不上劲"；
- **操作员看不见这些约束**：VR 里的人只知道"我想把手放那儿"，对机器人当前**离失稳/饱和有多近**毫无感知。

已有的可行性可视化（feasibility visualization）只是把约束**画给人看**，仍要人自己去躲。本文要做的是**让系统主动帮忙**：把"还能稳多久"量化成一个可微的标量，并据此**自动改写指令**。

---

## 🔧 方法详解

### 1. 稳定性度量：actuation-aware 质心稳定区域

沿用 Bretl & Lall 的思路，对当前位形求**可行质心（CoM）区域**——在力平衡、线性化摩擦锥、以及**关节力矩上下限**约束下，质心 x-y 能落在哪。区域边界由一组 LP（沿各查询方向 **a**ᵢ 最大/最小化质心）刻画。关键约束把**执行器力矩极限**写进去：

```
g(q) − τ⁺ ≤ J(q)ᵀ_c · f ≤ g(q) − τ⁻
```

当前质心到区域边界的最短距离就是**稳定裕度 m**——越大越抗冲击。

### 2. 核心招式：稳定裕度的解析梯度（LP 灵敏度分析）

直接对每个候选调整都重算 LP 太贵。本文用**线性规划灵敏度**：若 LP 约束随参数 θ 线性变化 A(θ)=F+Gθ，则最优值导数

```
∂a*/∂θ = − y*ᵀ G x*
```

（x\*、y\* 为原/对偶最优解）。把**接触点 pₖ** 与**关节位形 q** 当参数，沿标准基方向评估即可一次性拼出梯度 ∇m(pₖ)、∇m(q)，**无需重复解 LP**。增量更新稳定区域 ~79 μs、算梯度 ~334 μs，足以 **kHz 级**实时跑。

### 3. 重定向：把梯度注入遥操作 IK

遥操作底层是一个**加权 IK / QP**，硬约束里挂上稳定裕度约束 A_xy·v_d ≤ h(m_min)（质心留 4 cm 硬安全裕度）。两类调整：

- **接触重定向**：手接触前，沿接触面法向、按"扩大稳定区域面积"的梯度微调手的落点 pₕ；
- **姿态重定向**：在手位姿、质心 x-y 等高优先任务的**零空间**里，当"姿态灵敏度 s_q 超阈值"时按 ∇m(q) 调上身姿态。

### 4. 何时改写操作员指令（三档策略 + 迟滞）

- **(a) 标称**：s_q≈0（被摩擦约束主导）或裕度 m>15 cm 时——直接听操作员，姿态缓回标称；
- **(b) 主动重定向**：s_q 超阈且 m<15 cm（上身负载重）——把期望设定点改为 `ṫᵢ = k_q·Jᵢ·Nₕ·∇m(q)`，**操作员意图与稳定性改善通过零空间投影耦合**；
- **(c) 冻结**：用迟滞避免在阈值附近来回抖。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OP["🧑 操作员(VR)"]
        CMD["🎮 高层指令<br/>手位姿 / 质心摇杆"]
    end

    subgraph STAB["📐 稳定性引擎 (kHz)"]
        REGION["🟦 质心稳定区域<br/>力平衡+摩擦锥+力矩极限 (LP)"]
        MARGIN["📏 稳定裕度 m<br/>离边界最短距离"]
        GRAD["∇ 解析梯度<br/>LP 灵敏度: ∂m/∂p, ∂m/∂q"]
    end

    subgraph RETARGET["🔧 稳定性感知重定向 (加权 IK/QP)"]
        DECIDE{"s_q 超阈 且 m<15cm?"}
        CONTACT["✋ 接触点沿法向微调"]
        POSTURE["🧍 零空间姿态调整"]
        NOMINAL["➡️ 标称: 直接听操作员"]
    end

    ROBOT["🤖 液压-电驱人形<br/>多接触作业"]

    CMD --> DECIDE
    REGION --> MARGIN --> GRAD
    GRAD --> DECIDE
    DECIDE -- 是 --> CONTACT
    DECIDE -- 是 --> POSTURE
    DECIDE -- 否 --> NOMINAL
    CONTACT --> ROBOT
    POSTURE --> ROBOT
    NOMINAL --> ROBOT
    ROBOT -. 位形/接触回传 .-> REGION

    style OP fill:#fff7e0,stroke:#d4a017
    style STAB fill:#e8f4fd,stroke:#1f78b4
    style RETARGET fill:#f3e8fd,stroke:#8e44ad
    style ROBOT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 📊 实验与结果

**仿真**（三种非共面接触：前方斜墙、上方天花板、后方不平墙，去取一个罐子）：

| 方案 | 稳定裕度变化 |
|---|---|
| 仅接触重定向 | **−3%**（单靠启发式挪接触点不够） |
| 仅姿态重定向 | **+20%** |
| 接触 + 姿态联合 | **+27%** |

- 稳定裕度与抗冲击能力正相关：裕度 vs 最大可承受冲量回归 **R²=0.69**。

**真机**（回放三段操作轨迹）：

- 平均稳定裕度 **+7%**（峰值裕度最高 **+121%**）；
- 关节力矩裕度 **+12.6%**（代表轨迹约 +10%）；
- 所有抓取均达标（位置 <5 cm、姿态 <20°），同时鲁棒性指标提升；
- 计算开销：稳定区域增量更新 ~79 μs、梯度 ~334 μs → 满足 kHz 控制。

---

## 💡 核心贡献

1. **稳定裕度的解析梯度**：用 LP 灵敏度分析一次性算出稳定裕度对接触点/位形的方向梯度，避免反复重解 LP，做到 kHz 级实时。
2. **稳定性感知重定向框架**：把梯度直接嵌进遥操作 IK/QP，**接触点 + 上身姿态**双管齐下扩大稳定区域。
3. **不抢操作员控制权的耦合方式**：零空间投影 + 三档策略 + 迟滞，让"稳定性改善"作为操作员意图的补充而非覆盖。
4. **仿真 + 真机双验证**：在 IHMC 液压-电驱人形上完成多接触取物，量化证明裕度提升与抗扰/力矩裕度的相关性。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **多接触作业落地** | 给"用手撑环境做活"的遥操作提供了实时稳定性护栏，是 loco-manipulation 走向真实场景的关键一环 |
| **可微稳定性度量** | 把"离失稳多远"做成可微标量并高效求梯度，可被 RL 奖励、MPC 代价、共享自治等多处复用 |
| **共享自治(shared autonomy)范式** | 示范了"听人 + 自动兜底"的好分工：人给意图，系统在零空间里保平衡 |
| **与算法/界面路线互补** | 同模块 [SEW-Mimic](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html) 解决"重定向到哪"，本文解决"重定向时别失稳" |

---

## 🎤 面试参考

**Q：为什么"质心稳定区域"要把关节力矩极限也写进去？**
A：因为多接触下失败往往不是几何上质心跑出支撑域，而是**某个关节先到力矩极限**、机器人使不出维持平衡所需的接触力。把力矩界写进 LP，得到的才是"执行器真正能撑住"的可行区域（actuation-aware）。

**Q：为什么强调"解析梯度"而不是数值差分？**
A：遥操作要 kHz 级闭环。数值差分要对每个参数方向重解一次 LP，开销爆炸；用 LP 原/对偶最优解的灵敏度公式，~334 μs 就拼出全梯度，才跑得动实时。

**Q：怎么保证不"抢"操作员的控制？**
A：稳定性调整放在高优先任务（手位姿、质心）的**零空间**里，且只有在裕度低、姿态灵敏度高时才激活，配迟滞防抖——本质是"操作员意图优先，剩余自由度用来保稳"。

**Q：仅接触重定向为何反而 −3%？**
A：实验里启发式地沿法向挪接触点、缺乏全局位形配合时，单独动接触点不足以扩大稳定区域；要和上身姿态联合优化才有 +27% 的收益，说明**姿态自由度才是主要杠杆**。

---

## 🔗 相关阅读

- 本文：[arXiv abs](https://arxiv.org/abs/2510.04353) · [HTML](https://arxiv.org/html/2510.04353) · [PDF](https://arxiv.org/pdf/2510.04353) · [IEEE Xplore](https://ieeexplore.ieee.org/document/11204000)
- IHMC 前作（同一条多接触遥操作线）：
  - [Feasibility Retargeting for Multi-contact Teleoperation and Physical Interaction](https://arxiv.org/abs/2308.03479)
  - [Generating Humanoid Multi-Contact through Feasibility Visualization](https://arxiv.org/abs/2303.08232)
- 同模块对照：
  - [SEW-Mimic](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html)（上肢闭式几何重定向）
  - [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html)（低延迟直接末端控制）
  - [Intuitive GUI](../Intuitive_GUI_for_Non-Expert_Teleoperation_of_Humanoid_Robots/Intuitive_GUI_for_Non-Expert_Teleoperation_of_Humanoid_Robots.html)（非专家遥操作界面）

---

## 💬 讨论记录

> 待补充。
</content>
</invoke>
