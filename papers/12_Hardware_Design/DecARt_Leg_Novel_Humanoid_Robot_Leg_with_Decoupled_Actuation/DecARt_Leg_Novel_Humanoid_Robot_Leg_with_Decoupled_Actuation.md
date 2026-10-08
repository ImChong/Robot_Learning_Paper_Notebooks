---
layout: paper
paper_order: 7
title: "DecARt Leg: Design and Evaluation of a Novel Humanoid Robot Leg with Decoupled Actuation for Agile Locomotion"
zhname: "DecArt Leg：面向敏捷运动的解耦驱动新型人形机器人腿设计与评估"
category: "硬件设计"
---

# DecARt Leg: Design and Evaluation of a Novel Humanoid Robot Leg with Decoupled Actuation for Agile Locomotion
**DecArt Leg：面向敏捷运动的解耦驱动新型人形机器人腿设计与评估**

> 📅 阅读日期: 2026-06-26
>
> 🏷️ 板块: 12 Hardware Design · 腿部机构 / 解耦驱动 / 敏捷运动评测
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2511.10021](https://arxiv.org/abs/2511.10021) |
| HTML | [在线阅读](https://arxiv.org/html/2511.10021v1) |
| PDF | [下载](https://arxiv.org/pdf/2511.10021) |
| 源码（FAST 评测指标） | [egordv/the_FAST_metric](https://github.com/egordv/the_FAST_metric) |
| **发布时间** | 2025-11-13 (arXiv) |
| 提交日期 | 2025-11 |

**作者**：Egor Davydenko、Andrei Volchenkov、Vladimir Gerasimov、Roman Gorbachev（莫斯科物理技术学院 MIPT）。

**定位**：一篇**腿部机构设计 + 敏捷度评测指标**的硬件论文——既给出一条新结构的电驱人形腿，又给出一个能跨机器人比较「腿到底有多敏捷」的标准化指标 FAST。

---

## 🎯 一句话总结

人形腿长期卡在「**好看 vs 敏捷**」的二选一里：要拟人外观（前向膝、串联结构）就牺牲速度，要敏捷（Cassie/Digit 的解耦结构）就长得像鸟腿。DecARt Leg 用 **准伸缩（pantograph + 齿轮膝）机构把「腿长」和「腿俯仰」解耦、把所有电机都放到膝盖以上以压低摆动惯量、再用多连杆把 2 自由度踝的力矩从近端远程传过来**，做到一条**前向膝、拟人外观**的腿也能拿到 Cassie 级的摆腿速度。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DoF | Degree of Freedom | 自由度 |
| FAST | Fastest Achievable Swing Time | 最快可达摆动时间（本文提出的敏捷度指标） |
| TSID | Task Space Inverse Dynamics | 任务空间逆动力学（求 FAST 时所用的全动力学控制器） |
| WBC | Whole-Body Control | 全身控制 |
| QP | Quadratic Programming | 二次规划（QP-WBC 求解器） |
| IK | Inverse Kinematics | 逆运动学 |
| RL | Reinforcement Learning | 强化学习 |

---

## ❓ 这篇论文要解决什么问题？

人形机器人的腿设计存在一条长期的张力：

- **拟人 / 串联（serial）结构**：膝盖朝前、外观像人，但电机沿腿串联布置 → 大腿小腿都挂着电机、**摆动惯量大**，限制了摆腿速度和敏捷度；
- **解耦 / 并联结构（Cassie、Digit）**：把电机集中到髋部、用连杆/弹簧远程传力，**摆动惯量小、跑得快**，但外观像鸟腿、反屈膝，不拟人。

DecARt Leg 想同时要这两头：**保留前向膝的拟人外观，又拿到解耦结构的低惯量与敏捷度**。为此它必须解决「电机怎么全挪到膝盖以上、又能独立控制腿长、腿俯仰和 2 自由度踝」这个机构难题，并提出一个**能脱离上半身重量、只评测腿本身敏捷度**的指标来量化收益。

---

## 🦴 机构设计要点

| 子系统 | 做法 | 目的 |
|---|---|---|
| **准伸缩腿（quasi-telescopic）** | 紧凑的 pantograph 类机构 + 齿轮膝，用旋转电机模拟「伸缩（移动副）」行为 | 让「腿长」可独立驱动，外观仍是前向膝 |
| **解耦驱动** | 一对无源齿轮 + 4 杆平行机构，使**腿俯仰电机**与**腿长电机**互不耦合 | 摆动与伸缩独立控制，便于敏捷摆腿 |
| **电机布局** | 所有执行器（含 2-DoF 踝）全部布置在**膝关节以上** | 压低小腿摆动惯量 → 提升敏捷度 |
| **多连杆踝传动** | 多组连杆（前/后杆组）在不同姿态（伸直 / 半蹲 / 全蹲）切换承力 | 把踝力矩从近端远程传过来，同时让踝可完全收拢 |
| **拟人外观** | 膝盖朝前，不同于 pantograph 鸟腿 | 兼顾人形外观与解耦机构收益 |

> 📌 核心取舍：**用更复杂的连杆/齿轮机构（设计与制造更难）换「拟人外观 + 低惯量敏捷」两者兼得**，而不是在「像人」和「跑得快」里二选一。

---

## 📏 FAST 指标：怎么公平地比「腿有多敏捷」

直接比最大速度会受上半身重量、整机尺度干扰。本文提出 **FAST（Fastest Achievable Swing Time）**——只评测**腿本身**的敏捷度：

1. 生成一组**摆动长度相同、时长可变**的三次样条摆腿轨迹；
2. 用 **TSID（全机器人动力学）控制器**去跟踪；
3. 找到**仍能满足精度的最短摆动时长**：位置误差 < 摆动长度的 3%、速度误差 < 0.1 m/s；
4. 按实际腿尺寸缩放，得到可跨机器人比较的指标（不依赖上半身重量）。

**对比结果（FAST，越小越敏捷）**：

| 机器人 | 结构 | FAST | 理论行走速度 |
|---|---|---|---|
| **DecARt** | 解耦（本文） | **0.17 s** | **4.18 m/s** |
| DecARt-Serial | 耦合（消融变体） | 0.25 s | 2.84 m/s |
| Cassie | 解耦 | 0.24 s | 3.94 m/s |
| Fourier GR1T2 | 耦合 | 0.24 s | 2.92 m/s |

> DecArt 的解耦设计把摆腿时间压到 0.17 s，明显优于其串联消融版本与典型耦合人形腿，并优于 Cassie。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PROB["❓ 痛点：好看 vs 敏捷的二选一"]
        P1["串联/拟人腿<br/>前向膝但摆动惯量大"]
        P2["解耦/并联腿<br/>Cassie 敏捷但鸟腿外观"]
    end

    subgraph MECH["🦴 DecARt 机构"]
        M1["准伸缩腿<br/>pantograph + 齿轮膝"]
        M2["解耦驱动<br/>无源齿轮 + 4 杆平行"]
        M3["电机全在膝上<br/>压低摆动惯量"]
        M4["多连杆踝传动<br/>2-DoF 踝远程驱动"]
        M5["前向膝<br/>拟人外观"]
    end

    subgraph EVAL["📏 FAST 敏捷度评测"]
        E1["等长变时摆腿轨迹"]
        E2["TSID 全动力学跟踪"]
        E3["取满足精度的最短摆动时长"]
        E4["脱离上半身重量<br/>跨机器人可比"]
    end

    subgraph CTRL["⚙️ 控制验证（真机）"]
        C1["逆运动学 IK"]
        C2["QP 全身控制 WBC"]
        C3["强化学习 RL"]
    end

    subgraph RES["📊 结果"]
        R1["FAST 0.17s<br/>＞ Cassie 0.24s"]
        R2["仿真 2.2 m/s 平地<br/>0.8 m/s 崎岖"]
        R3["推力恢复 95N/50N<br/>10cm 台阶 · 3.5kg 负载"]
        R4["真机：免缆行走 + 跳跃 + 半崎岖"]
    end

    PROB --> MECH
    M1 --> M2 --> M3
    M3 --> M4
    M2 --> M5
    MECH --> EVAL
    EVAL --> R1
    MECH --> CTRL
    CTRL --> RES

    style PROB fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style MECH fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style EVAL fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style CTRL fill:#f3e8ff,stroke:#8e44ad,color:#3d0f5a
    style RES fill:#ffe8ec,stroke:#c0392b,color:#5a1010
</div>

---

## 💡 核心贡献

1. **新型解耦腿机构**：用「准伸缩（pantograph + 齿轮膝）+ 无源齿轮/4 杆平行 + 多连杆踝传动」，把腿长、腿俯仰、2-DoF 踝**全部用膝上电机解耦驱动**，在**保留前向膝拟人外观**的同时压低摆动惯量；
2. **FAST 敏捷度指标**：提出一个**只评测腿本身、脱离上半身重量、可跨机器人比较**的标准化敏捷度量，并**开源**了计算代码；
3. **多控制器验证**：在仿真与真机上分别用 **IK / QP-WBC / RL** 三套控制方法跑通免缆行走，证明该腿结构对不同控制范式都适配；
4. **量化收益**：FAST 0.17 s 优于其串联消融版（0.25 s）、Cassie（0.24 s）与 GR1T2（0.24 s），并通过仿真与真机实验交叉验证。

---

## 📊 实验结果速览

| 维度 | 结果 |
|---|---|
| FAST 敏捷度 | **0.17 s**（理论行走 4.18 m/s），优于 Cassie 0.24 s |
| 仿真最大行走速度 | 平地 **2.2 m/s**、崎岖 0.8 m/s（PyBullet） |
| 抗扰（推力恢复） | 矢状面 **95 N**、侧向 50 N |
| 台阶 / 负载 | 10 cm 台阶 · 携带 3.5 kg 负载 |
| 整机质量 | 约 35 kg（含躯干），每腿 6 DoF |
| 真机验证 | 两条 DecArt Leg + 简易骨盆，**免缆行走 + 跳跃 + 半崎岖地形**，三种控制器（IK/QP-WBC/RL）均跑通 |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **腿部机构设计** | 给出「拟人外观 + 解耦敏捷」可兼得的一个具体机构样本，打破二选一惯性 |
| **敏捷度评测** | FAST 提供一个脱离整机尺度/上半身重量的腿级横向对比标尺，且开源可复现 |
| **控制范式无关** | IK / QP-WBC / RL 都能驱动，说明机构收益不绑定特定控制栈 |
| **硬件-控制协同** | 把「低摆动惯量」做进机构，等于在硬件层先替控制器减负 |

---

## 🎤 面试参考

**Q：DecArt Leg 的「解耦驱动」到底解耦了什么？**
A：解耦的是**腿长（伸缩）**与**腿俯仰（摆动）**两个自由度。它用一对无源齿轮 + 4 杆平行结构，让俯仰电机和腿长电机互不干扰；再配 pantograph + 齿轮膝把旋转电机「伪装」成伸缩副。这样既能像 Cassie 那样把电机集中、压低摆动惯量，又能保住前向膝的拟人外观。

**Q：为什么要把电机都放到膝盖以上？**
A：摆动相时小腿要被快速甩动，挂在小腿上的电机会大幅增加摆动惯量、拖慢摆腿速度。把电机全挪到膝上、用多连杆把踝力矩远程传下去，等于减小了需要被加速的远端质量 → 直接提升敏捷度（FAST）。

**Q：FAST 指标相比「直接比最大速度」好在哪？**
A：最大速度会被上半身重量、整机尺度、控制器调参等混入。FAST 只给腿一组等长变时的摆腿轨迹、用全动力学控制器找出「仍达标的最短摆动时长」，再按腿尺寸缩放——**脱离上半身、可跨机器人公平比较腿本身的敏捷度**，而且作者开源了计算代码。

**Q：这条腿对控制有什么要求？**
A：论文用 IK、QP-WBC、RL 三种控制器都跑通了免缆行走，说明机构本身不绑定特定控制范式；复杂的多连杆/齿轮传动主要增加的是**建模与制造**成本，而非控制可行性。

---

## 🔗 相关阅读 / 类似平台

- [Human-Level Actuation for Humanoids (arXiv 2511.06796)](https://arxiv.org/abs/2511.06796)：人级关节驱动器设计（同模块）
- [Fauna Sprout (arXiv 2601.18963)](https://arxiv.org/abs/2601.18963)：轻量亲和人形开发平台（本模块）
- [Antagonistic Bowden-Cable Hand (arXiv 2512.24657)](https://arxiv.org/abs/2512.24657)：把电机搬离末端、远程驱动手指（同模块，思路相通）
- [Berkeley Humanoid (arXiv 2407.21781)](https://arxiv.org/abs/2407.21781)：研究人形参考平台

---

> 备注：本笔记以 arXiv 元信息与论文 HTML/PDF 公开内容整理；机构、FAST 数值、仿真/真机指标以论文为准。FAST 评测指标已开源（egordv/the_FAST_metric），完整腿部 CAD/控制代码论文未明确开源，后续若释放可补充到「源码」一栏。
