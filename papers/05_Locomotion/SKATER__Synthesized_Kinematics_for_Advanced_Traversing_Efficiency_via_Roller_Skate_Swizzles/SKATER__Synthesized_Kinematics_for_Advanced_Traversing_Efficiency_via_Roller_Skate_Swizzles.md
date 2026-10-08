---
layout: paper
paper_order: 15
title: "SKATER: Synthesized Kinematics for Advanced Traversing Efficiency on a Humanoid Robot via Roller Skate Swizzles"
zhname: "SKATER：用轮滑「葫芦步」实现高效通行的人形机器人"
category: "Locomotion"
---

# SKATER: Synthesized Kinematics for Advanced Traversing Efficiency on a Humanoid Robot via Roller Skate Swizzles

**SKATER：用轮滑「葫芦步」实现高效通行的人形机器人**

> 📅 阅读日期: 2026-08-12
>
> 🏷️ 板块: 05 Locomotion · 轮滑运动 / 被动轮足 / 隐式步态奖励 / 节能通行
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.04948](https://arxiv.org/abs/2601.04948) |
| HTML | [arXiv HTML](https://arxiv.org/html/2601.04948v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.04948) |
| **发布时间** | 2026-01-08（arXiv v1） |
| 源码 | 截至当前未见公开发布（论文未给出 GitHub / 项目页链接） |
| 作者 | Junchi Gu、Feiyang Yuan、Weize Shi、Tianchen Huang、Haopeng Zhang、Xiaohu Zhang、Yu Wang、Wei Gao、Shiwu Zhang |
| 主题 | cs.RO · 人形机器人 · 轮滑运动 · 深度强化学习 |
| 平台 | 25 自由度人形机器人（38 kg / 140 cm）· 每足一排 4 个被动轮（62 mm 聚氨酯轮） |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Humanoid Locomotion 章节。

---

## 🎯 一句话总结

> 人形机器人靠双足行走，每一步都是「离散落脚 → 冲击 → 制动 → 再抬腿」，冲击大、能耗高、关节磨损快。SKATER 换个思路：**给每只脚装一排被动轮**，把「走」变成「滑」——学人类轮滑的**葫芦步（swizzle）**，双脚沿受非完整约束的滑行方向连续外撇/内收蹬地，产生持续推进而不抬脚。作者用 **PPO + IsaacLab（4096 并行环境）+ 多阶段课程 + 域随机化**训练一个**不含显式步态时序**的 22 项奖励策略，让机器人自己学会平滑滑行。实测相比双足行走：**冲击强度降 75.86%（10231→2469 N/s）、CoT 降 63.34%**，髋/踝 pitch 关节峰值力矩与能耗大幅下降，并在瓷砖/橡胶/碎石三类不同摩擦地面 100% 成功滑行。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DRL | Deep Reinforcement Learning | 深度强化学习，本文控制策略训练范式 |
| PPO | Proximal Policy Optimization | 近端策略优化，主训练算法 |
| Swizzle Gait | 葫芦步 / 蛇形步 | 轮滑中双脚外撇-内收连续蹬地、无需抬脚的滑行步态 |
| CoT | Cost of Transport | 单位运输能耗，衡量移动效率的无量纲指标 |
| Nonholonomic | 非完整约束 | 轮子只能沿滚动方向前进、不能侧滑的运动学约束 |
| Domain Randomization | 域随机化 | 随机化摩擦/质量/增益等以弥合 sim-to-real 差距 |
| PD Control | 比例-微分控制 | 关节位置伺服，动作即目标关节角增量 |

---

## ❓ 论文要解决什么问题？

传统双足行走对人形机器人有两个「先天成本」：

1. **冲击大、伤关节**：每步落地都是刚性碰撞，力的变化率（冲击强度）高，长期磨损髋/踝等关节；
2. **能耗高**：行走需反复加减速、抬腿抗重力，单位距离能耗（CoT）大，续航受限。

人类穿轮滑鞋能「省力滑很远」正是靠**连续滚动**代替离散落脚。SKATER 的目标：**给人形机器人赋予轮滑能力**，用滑行式运动同时降低冲击与能耗、延长关节寿命、提升长距离续航——并解决随之而来的控制难题：被动轮带来非完整约束、易失稳，且没有现成的「滑行步态」可直接照搬。

---

## 🧠 核心方法

### ① 硬件：被动轮足
- 25 自由度人形（38 kg、140 cm）；**每只脚集成一排 4 个 62 mm 聚氨酯被动轮**（而非直接穿轮滑鞋），以保持力传递精度、不干涉踝关节活动范围。
- 轮子**被动**（无驱动），推进完全靠腿部关节按滑行方向蹬地产生。

### ② 葫芦步（Swizzle Gait）
- 模仿人类轮滑：双脚周期性**外撇-内收**，让轮子沿其**非完整滚动方向**连续蹬地滑行，形成持续推进而**无需抬脚落脚**；
- 因此避免了行走的离散冲击，关节冲击力约为跑步的 **50%**。

### ③ 深度 RL 控制框架
- **观测**：actor 用「当前 + 过去 4 帧历史」的关节位置/速度、机身角速度、重力向量、速度指令、上一动作；critic 额外拿**特权信息**（真实线速度、双踝间距、踝朝向角）。
- **动作**：力矩式 PD 控制，输出限幅到 [-1,1] 的目标关节角增量，乘系数 β 调节运动速度。
- **奖励**：**22 项**综合奖励，**不含显式步态时序**——含速度跟踪、姿态维持、双脚间距边界（0.2–0.5 m）、肢体对称、能量最小化等，让滑行步态**自发涌现**。
- **训练**：**PPO + IsaacLab GPU 仿真、4096 并行环境**，配**多阶段课程**逐步加难。
- **Sim-to-Real**：**域随机化**（摩擦 0.1–0.8、连杆质量、质心偏移、驱动增益）弥合仿真-真机差距。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph HW["🛞 硬件：被动轮足人形"]
        R["25-DoF 人形<br/>38kg · 140cm"]
        W["每足一排 4 被动轮<br/>62mm 聚氨酯"]
        R --- W
    end

    subgraph TRAIN["🧪 训练（IsaacLab · 4096 并行）"]
        OBS["观测<br/>本体感知 + 4 帧历史<br/>+ 速度指令"]
        POL["策略 π（Actor）<br/>力矩式 PD 目标角增量"]
        CRIT["Critic（特权）<br/>真实线速度/踝间距/踝朝向"]
        REW["22 项隐式步态奖励<br/>速度跟踪·对称·间距·能量"]
        OBS --> POL
        POL --> REW
        REW --> CRIT
        CRIT -.更新.-> POL
        CUR["多阶段课程 + 域随机化<br/>摩擦0.1-0.8/质量/质心/增益"] -.-> POL
    end

    HW --> OBS
    POL --> SWZ["🌀 葫芦步 Swizzle<br/>双脚外撇-内收连续滑行"]
    SWZ --> OUT["✅ 结果<br/>冲击 -75.86% · CoT -63.34%<br/>瓷砖/橡胶/碎石 100% 通行"]

    style HW fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style TRAIN fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style SWZ fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style OUT fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 📊 实验与结果（要点）

- **冲击强度**：葫芦步较双足行走降 **75.86%**（力变化率 10231.42 → 2469.44 N/s）。
- **运输能耗（CoT）**：等速下较行走降 **63.34%**；髋 pitch、踝 pitch 关节能耗分别降约 **95.39% / 92.29%**。
- **关节力矩**：滑行时髋 pitch、踝 pitch 峰值力矩较行走约降 **74% / 65–75%**。
- **地形适应**：瓷砖（摩擦 0.2–0.4）、橡胶（0.5–0.7）、碎石（0.8–1.0）各 10 次试验**均 100% 成功**滑行，策略泛化稳健。
- **平台**：ASUS NUC 迷你主机 50 Hz 推理，经 EtherCAT-CAN 转换驱动 25 电机，Xsens MTi-630R IMU 反馈。

---

## 💡 核心贡献

1. **新型被动轮足人形平台**：25-DoF 人形，每足一排被动轮，直接把「滑行」引入人形运动；
2. **隐式步态 DRL 框架**：22 项奖励**不写死步态时序**，配多阶段课程让节能葫芦步自发涌现；
3. **量化节能与护关节**：系统验证滑行相比行走在冲击、CoT、关节力矩上的大幅优势，兼顾平滑高效与长距离续航。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **运动形态创新** | 「轮 + 腿」混合把连续滚动引入人形，提示节能通行的新硬件-控制协同设计空间 |
| **关节寿命** | 用连续滑行替代离散冲击，从运动学层面降低长期磨损，利于真机耐久 |
| **隐式步态奖励** | 不指定步态时序、仅约束任务与物理量，让复杂周期步态自发涌现，减少人工设计 |
| **续航/物流** | 低 CoT 的滑行适合长距离巡检、搬运等对能效敏感的场景 |

---

## ⚠️ 局限与可改进点

- **地形受限**：轮滑天然适合平整/低起伏地面，面对台阶、缝隙、松软/极不平地形时滑行优势会退化，需与行走模式切换；
- **稳定性与制动**：被动轮的非完整约束下急停、转向、上下坡制动更难，论文侧重稳态滑行；
- **暂无公开代码**：截至当前未见开源仓库或项目页，复现依赖论文细节；
- **模式切换未展开**：滑↔走的无缝切换、以及在轮滑与双足间自主选择的策略仍有空间。

---

## 🎤 面试参考

**Q：为什么给人形装被动轮能省能耗？**
A：双足行走每步都要离散落脚、加减速、抬腿抗重力，冲击与代谢代价高；被动轮让脚沿滚动方向连续滑行（葫芦步），用持续滚动代替离散碰撞，冲击强度降约 76%、CoT 降约 63%，髋/踝 pitch 关节能耗降 90%+。

**Q：「葫芦步」是怎么产生推进力的？被动轮没有电机。**
A：靠腿部关节让双脚周期性外撇-内收蹬地，轮子只能沿其滚动方向前进（非完整约束），侧向蹬地被约束转化为前向滑行，从而在不抬脚的情况下连续推进。

**Q：奖励里没有步态时序，滑行步态怎么学出来的？**
A：22 项奖励只约束速度跟踪、姿态、双脚间距、对称与能量等物理/任务量，配多阶段课程与 PPO 大规模并行探索，节能的周期滑行作为满足这些约束的最优解自发涌现，无需显式相位/接触时钟。

**Q：怎么保证仿真训练能迁到真机？**
A：域随机化摩擦（0.1–0.8）、连杆质量、质心偏移、驱动增益等，配合 critic 用特权信息、actor 只用可部署观测，缩小 sim-to-real 差距；实测在三类不同摩擦地面均 100% 成功。

---

## 🔗 相关阅读

- [Biomechanical Comparisons Reveal Divergence of Human and Humanoid Gaits](../Biomechanical_Comparisons_Reveal_Divergence_of_Human_and_Humanoid_Gaits/Biomechanical_Comparisons_Reveal_Divergence_of_Human_and_Humanoid_Gaits.html) — 人形步态的生物力学度量，与本文「护关节/降冲击」动机对照
- [FastStair: Learning to Run Up Stairs with Humanoid Robots](../FastStair__Learning_to_Run_Up_Stairs_with_Humanoid_Robots/FastStair__Learning_to_Run_Up_Stairs_with_Humanoid_Robots.html) — 结构化地形上的敏捷运动对照（轮滑的互补面）
- [Walk the PLANC: Physics-Guided RL for Agile Humanoid Locomotion on Constrained Footholds](../Walk_the_PLANC__Physics-Guided_RL_for_Agile_Humanoid_Locomotion_on_Constrained_Footholds/Walk_the_PLANC__Physics-Guided_RL_for_Agile_Humanoid_Locomotion_on_Constrained_Footholds.html) — 物理引导 RL 的落脚约束运动对照

---

> 备注：本笔记基于 arXiv 摘要与 HTML 版正文整理。方法命名（葫芦步 swizzle gait、隐式步态 22 项奖励、被动轮足）与关键数值（冲击 -75.86%、CoT -63.34%、关节能耗/力矩降幅、三类地面 100% 成功）以官方 PDF 为准。该论文截至当前未见公开源码，故本笔记不含源码运行时序图；若后续开源将再补充。
