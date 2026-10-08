---
layout: paper
paper_order: 4
title: "Sampling-Based System Identification with Active Exploration for Legged Robot Sim2Real Learning"
zhname: "SPI-Active：面向腿足机器人 Sim2Real 的主动探索采样式系统辨识"
category: "Sim-to-Real"
---

# Sampling-Based System Identification with Active Exploration for Legged Robot Sim2Real Learning

**SPI-Active：面向腿足机器人 Sim2Real 的主动探索采样式系统辨识**

> 📅 阅读日期: 2026-07-05
>
> 🏷️ 板块: Sim-to-Real · 系统辨识 · 主动探索 · Fisher 信息 / D-最优 · CMA-ES
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2505.14266](https://arxiv.org/abs/2505.14266) |
| HTML | [在线阅读 v1](https://arxiv.org/html/2505.14266v1) |
| PDF | [下载](https://arxiv.org/pdf/2505.14266) |
| 项目主页 | [lecar-lab.github.io/spi-active_](https://lecar-lab.github.io/spi-active_/) |
| 源码 | 🌟 [github.com/LeCAR-Lab/SPI-Active](https://github.com/LeCAR-Lab/SPI-Active) |
| 会议 | CoRL 2025 |
| **发布时间** | 2025-05-20 (arXiv) |

**作者**：Nikhil Sobanbabu, Guanqi He, Tairan He, Yuxiang Yang, Guanya Shi
**机构**：LeCAR Lab · Carnegie Mellon University（CMU）
**实机**：Unitree Go2 四足（含 4.7 kg ≈ 33% 体重负载）+ Unitree G1 人形（速度跟踪验证）

---

## 🎯 一句话总结

高精度腿足技能（如精准落点的跳跃）对 sim-real gap 极其敏感——差一点动力学参数，跳跃就偏几十厘米。主流做法**域随机化（DR）**靠"把未知量全随机化"求鲁棒，但会让策略偏保守、且难以精确。传统**系统辨识（SysID）**又常假设动力学可微、能直接测扭矩，这些在富接触腿足系统里根本不成立。SPI-Active 给出两阶段方案：**① SPI**——用 GPU 上的大规模并行采样（CMA-ES）最小化"仿真 vs 真实"轨迹误差，反推质量-惯量与电机扭矩参数；**② Active**——不再被动采数据，而是**优化探索策略的指令序列去最大化 Fisher 信息（等价 D-最优实验设计）**，专门激发"最能暴露参数"的高扭矩步态，再回炉重新辨识。最终高精度技能零样本迁移，较基线提升 **42–63%**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Sim2Real | Sim-to-Real | 仿真训练，真实部署 |
| DR | Domain Randomization | 域随机化：随机化物理参数以求鲁棒 |
| SysID | System Identification | 系统辨识：从数据反推物理参数 |
| SPI | Sampling-based Parameter Identification | 采样式参数辨识（本文第一阶段） |
| FIM | Fisher Information Matrix | Fisher 信息矩阵，刻画参数可辨识程度 |
| D-optimality | D-最优 | 一种最优实验设计准则：最小化参数估计协方差 |
| CMA-ES | Covariance Matrix Adaptation Evolution Strategy | 无梯度进化优化算法 |
| CoM | Center of Mass | 质心 |

---

## ❓ 论文要解决什么问题？

**问题陈述**：腿足机器人要做**高精度**任务（精准落点的前跳、偏航跳、精确速度/姿态跟踪），对动力学参数误差极其敏感——名义模型和真机差一点，误差就被放大到几十厘米。而弥合 sim-real gap 的两条主流路线都有硬伤：

1. **域随机化（DR）**：把摩擦、质量、增益、延迟大范围随机化。结果策略被迫**保守**，牺牲精度；且随机化范围靠启发式手调。
2. **传统 SysID**：多假设**动力学可微**、能**直接测量关节扭矩**。这些前提在**富接触**腿足系统里不成立——接触不可微、真机也没有力矩传感器。

**核心问题**：

> 能否在只用标准传感器、不假设可微动力学的前提下，把关键物理参数**量准**，并且**主动**去采集"最有信息量"的数据，让高精度技能可靠迁移？

---

## 🔧 方法拆解：SPI-Active（两阶段）

### 阶段 1 · SPI —— 采样式参数辨识

在 GPU 仿真里开**大规模并行采样**，用无梯度的 **CMA-ES** 搜索一组物理参数，使**仿真轨迹与真实轨迹的状态预测误差最小**。辨识两类参数：

- **质量-惯量参数 θ_in**：质量、质心（3D）、转动惯量矩阵。用 **log-Cholesky 分解**保证惯量矩阵物理可行，得到 10 个可独立辨识参数；
- **执行器扭矩参数 θ_mo**：用双曲正切饱和模型 `τ_motor = κ · tanh(τ_PD / κ)` 刻画每个关节的电机扭矩缩放常数 κ。

关键：**不需要可微动力学、不需要力矩传感器**，只用真机轨迹（位置/速度）反推。

### 阶段 2 · Active —— 主动探索（最大化 Fisher 信息）

阶段 1 的数据来自启发式先验/已训练策略，未必"最有信息量"。阶段 2 引入**最优实验设计**思想：

- 目标是**最小化 Fisher 信息矩阵之逆的迹** `tr(F(θ̂₁, π)⁻¹)`（即 **D-最优**准则），等价于压低参数估计的不确定性上界；
- 做法**不是从零学探索策略**，而是**优化一个多行为策略的指令序列 c₁:T**，去诱导**高扭矩步态 + 多样速度分布**，专门"激发"最能暴露参数的动力学；
- 在真机执行这些精心设计的指令、采集有针对性的数据，再以阶段 1 结果为初值**重新辨识** θ̂_active。

### 闭环

辨识 → 用参数在仿真里训 RL 策略 → 部署 → （若需要）主动探索采新数据 → 再辨识。参数越准，仿真越接近真机，高精度技能就越能零样本落地。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S1["① SPI：采样式参数辨识"]
        D0["真机轨迹<br/>(启发式先验 / 预训练策略)"]
        CMA["🧬 CMA-ES 大规模并行采样<br/>min ‖sim 轨迹 − real 轨迹‖"]
        P1["θ̂₁ = {质量-惯量 θ_in, 电机扭矩 θ_mo}<br/>log-Cholesky 保证惯量可行"]
        D0 --> CMA --> P1
    end

    subgraph S2["② Active：主动探索（D-最优）"]
        FIM["最大化 Fisher 信息<br/>min tr(F(θ̂₁,π)⁻¹)"]
        CMD["优化指令序列 c₁:T<br/>诱导高扭矩步态 + 多样速度"]
        DR["真机采集针对性数据"]
        P2["以 θ̂₁ 为初值重新辨识<br/>→ θ̂_active"]
        P1 --> FIM --> CMD --> DR --> P2
    end

    subgraph TRAIN["🎮 RL 训练（辨识参数下的高保真仿真）"]
        SIM["仿真用 θ̂_active<br/>gap 已被量准"]
        POL["🦿 高精度技能策略 π"]
        P2 --> SIM --> POL
    end

    subgraph DEPLOY["🤖 零样本部署"]
        GO2["Unitree Go2 (+4.7kg 负载)<br/>前跳 / 偏航跳 / 速度·姿态跟踪"]
        G1["Unitree G1 人形<br/>速度跟踪验证"]
        RES["✅ 较基线 ↑ 42–63%<br/>✅ 前跳落点误差 ~3.6cm"]
    end

    POL -. 零样本 .-> GO2
    POL -. 零样本 .-> G1
    GO2 --> RES
    G1 --> RES

    style S1 fill:#e8f4fd,stroke:#1f78b4
    style S2 fill:#fff7e0,stroke:#d4a017
    style TRAIN fill:#f3e8ff,stroke:#8e44ad
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **两阶段辨识范式**：SPI（采样式辨识）+ Active（主动探索），把"辨识"与"最优数据采集"耦合成闭环，用**辨识**替代**盲目域随机化**；
2. **无需可微动力学/力矩传感器**：CMA-ES 采样式优化天然适配富接触、不可微系统，仅用标准状态轨迹即可辨识质量-惯量与电机扭矩参数；
3. **把最优实验设计引入腿足 SysID**：以 **D-最优（最小化 FIM 之逆迹）** 为目标，**优化指令序列**而非从零学探索策略，专门激发高信息量数据；
4. **高精度技能实证**：Unitree Go2（含 33% 体重负载）完成精准前跳/偏航跳/速度/姿态跟踪，较基线提升 **42–63%**，前跳落点误差低至 ~3.6 cm；并在 G1 人形上验证泛化；
5. **工程价值**：🌟 全套代码开源（[LeCAR-Lab/SPI-Active](https://github.com/LeCAR-Lab/SPI-Active)），可复用于新平台的辨识流水线。

---

## 📊 关键设定与结果

| 维度 | 值 |
|---|---|
| 平台 | Unitree Go2 四足（+4.7 kg ≈ 33% 体重负载）· Unitree G1 人形 |
| 辨识算法 | CMA-ES（无梯度、GPU 并行采样） |
| 辨识参数 | 质量-惯量（10 参数，log-Cholesky）+ 每关节电机扭矩常数 κ |
| 主动探索目标 | D-最优：min tr(F⁻¹)，优化指令序列诱导高扭矩步态 |
| 任务 | 前跳 / 偏航跳 / 速度跟踪 / 姿态跟踪（另有绕杆开环演示） |
| 前跳 | SPI ↑39.9%，SPI-Active ↑~52%（落点误差 ~3.6 cm） |
| 偏航跳 | SPI ↑35.9%，SPI-Active ↑~63% |
| 速度跟踪 | SPI ↑20%，SPI-Active ↑42% |
| 姿态跟踪 | SPI-Active ↑27% |

> 📌 各任务详细数值、消融与辨识收敛曲线请以 arXiv v1 PDF 实验章节为准。

---

## 🤖 对 Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **"辨识 vs 随机化"再平衡** | 与 DR 主流互补：DR 盖住 gap，SPI-Active 量准 gap，且专门服务高精度任务 |
| **把主动学习带进 SysID** | 用 Fisher 信息 / D-最优主动"设计实验"，而非被动采数据——数据效率与辨识精度双赢 |
| **无梯度采样的工程友好** | CMA-ES 不要求可微仿真，天然适配富接触、真机零力矩传感器的现实约束 |
| **与 PACE 同思潮** | 都主张"辨识优先"，[PACE](../PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots.html) 侧重跨机器人系统化标定，本文侧重高精度技能 + 主动探索 |

---

## 🎤 面试参考

**Q：为什么高精度技能对 sim-real gap 这么敏感，DR 又为什么不够？**
A：像"精准落点跳跃"这类技能是**开环强、误差不可回收**的——起跳瞬间的动力学参数偏差会被弹道放大到几十厘米，落地才发现已经晚了。DR 的思路是"不知道真值就在一个范围里全练一遍"，让策略学到对整个范围鲁棒；但这必然**牺牲精度**（为最坏情况买单）且范围靠手调。SPI-Active 反过来：把关键参数**量准**，让仿真本身就贴近真机，策略便可专注把动作做精而非做保守。

**Q：主动探索（Active）到底在优化什么？和普通"多采点数据"有何区别？**
A：核心是**信息量**而非**数据量**。它把辨识精度写成 Fisher 信息矩阵 F 的函数，目标是最小化 `tr(F⁻¹)`（D-最优）——直觉上就是让参数估计的协方差最小。为达到这点，它**优化探索指令序列**去诱导高扭矩、多样速度的步态，这些运动最能"激发"待辨识动力学、暴露参数差异。普通"多采点"可能全是低信息量的匀速走，采再多也压不下不确定性。

**Q：为什么用 CMA-ES 而不是梯度辨识？**
A：腿足系统有接触、饱和、非线性电机，动力学**不可微**，也没有真机力矩传感器供直接监督。CMA-ES 是无梯度进化策略，只需前向仿真评估"轨迹匹配误差"作为适应度，天然绕开可微性要求；配合 GPU 大规模并行采样，样本效率的劣势被算力补上。

**Q：辨识电机为什么用 `κ·tanh(τ_PD/κ)` 这种饱和模型？**
A：真实电机有**扭矩上限**，PD 控制器算出的期望扭矩超过上限时会被削顶。tanh 饱和模型用单个常数 κ 就能刻画"小扭矩近似线性、大扭矩饱和"的行为，参数少、可辨识、且能捕捉真机在剧烈动作（跳跃）时的关键非线性——而这恰恰是高精度技能最吃紧的工况。

---

## 🔗 相关阅读

- [Towards Bridging the Gap: Systematic Sim-to-Real Transfer for Diverse Legged Robots (PACE, 2509.06342)](../PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots/PACE_Systematic_Sim-to-Real_Transfer_for_Diverse_Legged_Robots.html)：同属"辨识优先"思潮，跨机器人系统化标定，本仓库已有笔记
- [PolySim: Multi-Simulator Domain Randomization (2510.01708)](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.html)：仿真侧随机化路线，与本文思路对照，本仓库已有笔记
- [Contrastive Representation Learning for Adaptive Humanoid Locomotion (2509.12858)](../Contrastive_Representation_Learning_for_Adaptive_Humanoid_Locomotion/Contrastive_Representation_Learning_for_Adaptive_Humanoid_Locomotion.html)：表征侧 sim-to-real 路线，本仓库已有笔记
- [Learning Agile and Dynamic Motor Skills for Legged Robots (1901.08652)](https://arxiv.org/abs/1901.08652)：ANYmal Actuator Net 奠基，执行器建模经典

---

> 备注：本笔记基于 arXiv 摘要与 v1 HTML、项目主页（[lecar-lab.github.io/spi-active_](https://lecar-lab.github.io/spi-active_/)）及开源仓库整理；**各任务精确数值、消融与辨识收敛细节**请以 arXiv v1 PDF 为准。源码已开源：[github.com/LeCAR-Lab/SPI-Active](https://github.com/LeCAR-Lab/SPI-Active)。
</content>
