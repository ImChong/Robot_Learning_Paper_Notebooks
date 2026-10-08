---
layout: paper
paper_order: 13
title: "Walk the PLANC: Physics-Guided RL for Agile Humanoid Locomotion on Constrained Footholds"
zhname: "Walk the PLANC：受约束落脚点上的物理引导人形敏捷行走"
category: "Locomotion"
arxiv: "2601.06286"
---

# Walk the PLANC: Physics-Guided RL for Agile Humanoid Locomotion on Constrained Footholds
**Walk the PLANC：受约束落脚点上的物理引导人形敏捷行走**

> 📅 阅读日期: 2026-06-30
>
> 🏷️ 板块: 05 Locomotion · 踏脚石行走 / 受约束落脚点 / 降阶模型规划 / CLF 引导 RL / 师生蒸馏
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.06286](https://arxiv.org/abs/2601.06286) |
| HTML | [arXiv HTML](https://arxiv.org/html/2601.06286) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.06286) |
| 项目主页 | [caltech-amber.github.io/planc](https://caltech-amber.github.io/planc/) |
| 视频 | [YouTube 演示](https://youtu.be/D_CZ_FRYjtc) |
| 源码 | [匿名仓库 anonymous.4open.science](https://anonymous.4open.science/r/robot_rl-E4FF)（以项目页后续正式开源为准） |
| **发布时间** | 2026-01-09 (arXiv) |
| 作者 | Min Dai, William D. Compton, Junheng Li, Lizhi Yang, Aaron D. Ames |
| 机构 | Caltech AMBER Lab（加州理工） |
| 平台 | Unitree G1 人形机器人（21 自由度） |
| 仿真 | IsaacLab / NVIDIA Isaac Sim 训练 → MuJoCo sim-to-sim → G1 真机零样本部署 |

---

## 🎯 一句话总结

> 踏脚石/稀疏落脚点上的人形行走，最难的是**「敏捷」和「精准落脚」要同时满足**：纯 model-free RL 在这种离散、受约束地形上很难学，常常退化成原地站着不动；纯模型法（落脚规划）落脚精准但动作保守、对未建模动力学不鲁棒。**PLANC** 把两者缝起来——用一个 **降阶 LIP 落脚规划器**实时生成「动力学一致」的全状态参考轨迹，再用 **控制李雅普诺夫函数（CLF）奖励**把 RL 策略**引导**到这条物理可行的参考上，最终在 Unitree G1 上实现既快又准、可真机部署的踏脚石行走。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| LIP | Linear Inverted Pendulum | 线性倒立摆，双足步态规划的经典降阶模型 |
| HLIP | Hybrid / Horizontal LIP | LIP 的混合系统变体，用于步态周期落脚预测 |
| RoM | Reduced-order Model | 降阶模型，相对全身动力学的简化表示 |
| CLF | Control Lyapunov Function | 控制李雅普诺夫函数，用 V(η) 度量输出跟踪误差并约束其衰减 |
| PPO | Proximal Policy Optimization | 近端策略优化，本文 RL 训练算法 |
| MPC | Model Predictive Control | 模型预测控制，对比的传统模型法 |
| DoF | Degree of Freedom | 自由度；G1 共 21 个驱动自由度 |

---

## ❓ 论文要解决什么问题？

1. **受约束落脚点难学**：踏脚石、稀疏/离散落脚点要求脚必须落在指定可行区域，纯 model-free RL 探索效率低，常退化为保守的「原地踏步/站立」。
2. **敏捷 vs. 精准的矛盾**：既要动态、敏捷地迈步跨越，又要每一步都精准落到目标点，奖励整形很难两全。
3. **模型法太保守、RL 太脆弱**：传统降阶模型规划落脚精准但对未建模动力学鲁棒性差、动作保守；端到端 RL 鲁棒但缺乏物理结构、训练不稳定。

**目标**：让降阶模型的「物理结构与落脚精度」去引导 RL 的「鲁棒性与动态能力」，在受约束地形上又快又准地行走。

---

## 🔧 方法详解

### 核心：降阶落脚规划器 + CLF 奖励引导 RL

- **降阶 LIP 落脚规划器（实时参考生成器）**：基于线性倒立摆模型，在每个时间步输出一条**动力学一致的全状态参考轨迹**：
  - **步时（step timing）**：由 LIP 动力学解析计算，使落脚刚好到达目标落脚点；
  - **质心（CoM）轨迹**：三次样条生成，并通过竖直速度控制做动量调节；
  - **摆动脚落点**：贝塞尔多项式插值，精确命中受约束的目标落脚点；
  - **轨道能量调节**：维持期望能量水平（E* ≈ 0.6）以保证持续向前推进。
- **CLF 引导奖励**：用控制李雅普诺夫函数 V(η) 度量「实际输出 vs. 期望输出」的误差，奖励项鼓励满足衰减条件 V̇(η) ≤ −cV(η)，从而把策略学习**塑形到物理一致的轨迹周围**，而不是仅靠手工奖励硬调。

### 师生蒸馏三阶段管线

1. **教师策略**：用特权信息（真值地形高度、接触相位等）训练，先学会高质量的受约束落脚。
2. **学生蒸馏**：行为克隆把教师蒸馏到不依赖特权信息的学生，去掉对真值的依赖。
3. **学生微调**：在噪声与部分可观测条件下用 PPO 继续微调，提升真机可部署性与鲁棒性。

### 训练与部署设置

- **仿真**：IsaacLab（NVIDIA Isaac Sim 物理引擎）训练；真机用动捕系统 + 射线投射高程图获取落脚点。
- **迁移链路**：IsaacLab 训练 → MuJoCo sim-to-sim（楼梯、变高踏脚石、稀疏落脚点的混合地形）→ Unitree G1 真机零样本部署。
- **平台**：Unitree G1（21 DoF）。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PLAN["🧮 降阶 LIP 落脚规划器（实时参考）"]
        TIMING["步时解析<br/>命中目标落脚点"]
        COM["CoM 样条 + 动量调节"]
        SWING["摆动脚 Bézier 落点"]
        ENERGY["轨道能量调节 E*≈0.6"]
    end

    subgraph TRAIN["🎓 CLF 引导 RL + 师生蒸馏 (IsaacLab)"]
        CLF["CLF 奖励<br/>V̇(η) ≤ −cV(η) 引导到物理参考"]
        TEACHER["① 教师: 特权信息训练"]
        STUDENT["② 学生: 行为克隆去特权"]
        FINETUNE["③ PPO 微调: 噪声 + 部分可观测"]
    end

    subgraph DEPLOY["🚀 迁移与部署: Unitree G1 (21 DoF)"]
        S2S["MuJoCo sim-to-sim<br/>楼梯 / 变高踏脚石 / 稀疏落脚"]
        REAL["真机零样本<br/>未见石块深度泛化 + 抗扰"]
    end

    PLAN -->|动力学一致参考轨迹| CLF
    CLF --> TEACHER
    TEACHER --> STUDENT
    STUDENT --> FINETUNE
    FINETUNE --> S2S
    S2S --> REAL

    style PLAN fill:#e8eef8,stroke:#2c3e80,color:#1a2452
    style TRAIN fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style DEPLOY fill:#fff3e0,stroke:#fb8c00,color:#4e342e
</div>

---

## 💡 核心贡献

1. **物理引导而非纯奖励整形**：用降阶 LIP 规划器在线生成动力学一致的参考，再以 CLF 奖励把 RL 引导到该参考上，兼得模型法的落脚精度与 RL 的鲁棒性。
2. **CLF 作为可学习的稳定性塑形信号**：把控制李雅普诺夫函数的衰减条件写进奖励，使训练围绕物理一致轨迹收敛，显著优于纯 model-free 基线（后者在难地形上退化为站立）。
3. **师生蒸馏 + PPO 微调**：从特权教师蒸馏到无特权学生，再在噪声/部分可观测下微调，打通从特权训练到真机部署的链路。
4. **真机验证的受约束行走**：Unitree G1 上实现踏脚石/稀疏落脚点的敏捷精准行走，对未见石块深度零样本泛化，并能抵抗 ±100 Nm / 0.2s 的外部推力扰动。

---

## 📊 关键实验结果（结构性总结）

| 地形 / 设置 | model-free 基线 | PLANC（本文） |
|---|---|---|
| 平面踏脚石（高难度） | 57.6% | **100%** |
| 变高踏脚石（中难度） | 0% | **99.2%** |
| 变高踏脚石（高难度） | 0% | **97.2%** |
| 端到端 RL 无模型引导 | 退化为原地站立 | — |
| 抗扰 | — | 抵抗 ±100 Nm / 0.2s 推力 |
| 真机 | — | G1 零样本，泛化到未见石块深度 |

> ⚠️ 消融实验表明：去掉步时自适应或动量调节都会明显掉点，证实两者均必要。详细数值以 arXiv [2601.06286](https://arxiv.org/abs/2601.06286) 论文正文为准。

---

## 🤖 工程价值

- **「规划器当参考 + CLF 当引导」是可迁移范式**：把降阶模型的物理结构作为 RL 的软引导，而非硬约束，适用于踏脚石、沟壑、稀疏落脚点等强离散接触地形。
- **CLF 奖励提供物理可解释的塑形**：相比堆砌手工奖励项，CLF 衰减条件给出明确的稳定性目标，训练更稳、更不易退化。
- **师生蒸馏打通部署**：特权教师 → 无特权学生 → PPO 抗噪微调，是从仿真特权信息走向真机的成熟工程路线。
- **限制**：LIP 是降阶近似，复杂富接触/三维地形下可能损失最优性；真机依赖动捕 + 高程图获取落脚点，野外感知尚未完全自洽；评测以踏脚石/稀疏落脚为主，更广义地形泛化待验证。

---

## 🎤 面试参考

**Q：为什么纯 model-free RL 在踏脚石上会「退化成站着不动」？**
A：受约束落脚点是强离散、稀疏奖励的探索难题，随机探索很难偶然踩中可行落脚序列；在缺乏物理引导时，策略容易收敛到「不动也不摔」的保守局部最优。PLANC 用降阶规划器提供动力学一致的落脚参考，把探索方向锚定到可行解附近，从而跳出这个退化解。

**Q：CLF 奖励和普通跟踪奖励有什么区别？**
A：普通跟踪奖励只惩罚瞬时误差；CLF 奖励鼓励满足李雅普诺夫衰减条件 V̇ ≤ −cV，即要求误差**按指数收敛**，提供了带稳定性保证语义的塑形信号，让策略学到的是「能把误差拉回去」的行为，而不只是某一时刻贴近参考。

**Q：降阶 LIP 规划器具体生成哪些参考量？**
A：解析步时（保证按时落到目标点）、三次样条质心轨迹（含竖直速度的动量调节）、贝塞尔摆动脚落点（命中受约束目标）、以及轨道能量调节（维持 E*≈0.6 保证前进），合起来是一条每步刷新的全状态动力学一致参考。

---

## 🔗 相关阅读

- [FastStair: Learning to Run Up Stairs with Humanoid Robots (2601.10365)](https://arxiv.org/abs/2601.10365) — 同样把基于模型的落脚规划器塞进 RL 回路，面向楼梯攀爬
- [BeamDojo: Learning Agile Humanoid Locomotion on Sparse Footholds (2502.10363)](https://arxiv.org/abs/2502.10363) — 稀疏落脚点上的敏捷人形运动，另一条路线
- [APEX: Learning Adaptive High-Platform Traversal for Humanoid Robots (2602.11143)](https://arxiv.org/abs/2602.11143) — 高平台攀爬，富接触多技能编排
- [Chasing Stability: Humanoid Running via Control Lyapunov Function Guided RL (2509.19573)](https://arxiv.org/abs/2509.19573) — 同样用 CLF 引导 RL，面向人形奔跑

---

> 备注：本笔记基于 arXiv 摘要、[arXiv HTML 正文](https://arxiv.org/html/2601.06286)、[项目主页](https://caltech-amber.github.io/planc/)与公开搜索结果整理；具体数值、奖励权重与网络细节以 arXiv [2601.06286](https://arxiv.org/abs/2601.06286) 论文正文为准。
</content>
