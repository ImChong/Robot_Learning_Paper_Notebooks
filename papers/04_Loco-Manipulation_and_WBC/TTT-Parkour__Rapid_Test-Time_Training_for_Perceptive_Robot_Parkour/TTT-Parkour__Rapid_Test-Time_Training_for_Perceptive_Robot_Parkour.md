---
layout: paper
paper_order: 49
title: "TTT-Parkour: Rapid Test-Time Training for Perceptive Robot Parkour"
zhname: "TTT-Parkour：用快速测试时训练让人形跑酷适应未见地形"
category: "Loco-Manipulation and WBC"
---

# TTT-Parkour: Rapid Test-Time Training for Perceptive Robot Parkour
**TTT-Parkour：用快速测试时训练让人形跑酷适应未见地形**

> 📅 阅读日期: 2026-05-13
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · Perceptive Locomotion · Real→Sim→Real · 测试时训练 (TTT)

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.02331](https://arxiv.org/abs/2602.02331) |
| HTML | [在线阅读](https://arxiv.org/html/2602.02331v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.02331) |
| 项目主页 | [ttt-parkour.github.io](https://ttt-parkour.github.io/) |
| 演示视频 | [YouTube](https://www.youtube.com/watch?v=ayfYpZf4N6M) |
| **发布时间** | 2026-02-02 (arXiv) |
| 源码 | 截至论文发布暂未公开（参见项目主页的后续释出说明） |
| 提交日期 | 2026-02 |

**作者**：Shaoting Zhu, Baijun Ye, Jiaxuan Wang, Jiakang Chen, Ziwen Zhuang, Linzhan Mou, Runhan Huang, Hang Zhao（清华大学 / 上海期智研究院 / Princeton）

**机器人**：Unitree G1（29 DoF，板载 Jetson Orin NX + Intel RealSense D435i）

---

## 🎯 一句话总结

TTT-Parkour 把"**对一段陌生地形拍 RGB-D 视频 → 前馈式快速重建出可仿真的网格 → 在仿真里对预训练好的跑酷策略做 ≤10 分钟的微调 → 直接零样本部署回真机**"做成了端到端流水线，让 Unitree G1 能在楔块、桩柱、箱子、梯形台、窄梁等极端地形上稳定通行，**摆脱了"只能在程序化生成的简单地形上训练"这一根本限制**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| TTT | Test-Time Training | 测试时训练：部署前对新分布做一轮快速微调 |
| Real→Sim→Real | Real-to-Sim-to-Real | 真→仿→真：从真实采集 → 重建到仿真 → 部署回真机 |
| PPO | Proximal Policy Optimization | 预训练与 TTT 微调阶段都用的 RL 算法 |
| AMP | Adversarial Motion Priors | 用对抗判别器奖励"动作自然" |
| RGB-D | Color + Depth | 同时给彩色与深度的相机数据（D435i） |
| 3DGS / NeRF | 3D Gaussian Splatting / Neural Radiance Fields | 高保真但需要长时优化的重建方案，被 TTT-Parkour 弃用 |
| RANSAC + PCA | 随机采样一致性 + 主成分分析 | 用来稳健估计地面法向、对齐重力方向 |

---

## ❓ 论文要解决什么问题？

把"会走路 / 会跑酷"的策略真正放到野外，过去主要卡在以下几点：

1. **程序化地形覆盖不全**：训练用的箱子 / 楔块 / 梁通常是参数化几何，真实障碍物的位置、尺寸、走向、纹理远比生成器多。  
2. **OOD 直接崩**：预训练通用策略在见过的形态上 ~98% 通过，**碰到楔形坡 / 梯形台 / 桩柱阵几乎降到 0%**（见 Table I 的 Pre-train 一栏）。  
3. **从零再训也学不会**：在单个陌生地形上**从头**训 25k 步，往往因为窄站位收敛失败（Scratch-1 多数地形仍为 0%）。  
4. **高保真重建太慢**：NeRF / 3DGS 视觉重建好看，但每个场景动辄几十分钟，**赶不上"上场前 10 分钟"的实际节奏**。  

**目标**：在面对一个**陌生的、复杂的真实地形**时，让机器人能在 ~10 分钟内完成"扫描 → 建模 → 仿真微调 → 重新部署"的闭环，达到 ≥99% 仿真通过率与稳定真机表现。

---

## 🔧 方法拆解：TTT-Parkour 怎么工作

### Stage 1 · 预训练通用感知行走策略

- **策略形式**：CNN 深度编码器 + 本体感知 history → MLP → 29 维目标关节位置 → PD 控制器。  
- **训练算法**：PPO + **非对称 Actor-Critic**（Critic 享有特权信息：无噪声状态 + 基座线速度）。  
- **观测**：本体感知滑窗（角速度、重力投影、命令、关节状态、上一动作）+ 深度图历史窗（带跨步采样，保证看到长时序）。  
- **奖励**：任务速度跟踪 + 正则化（边缘踏空惩罚、能耗、动作平滑）+ 安全（关节限位）+ **AMP**（用 MPC 生成的人形动作做风格判别）。  
- **课程**：在 20×10 网格里放 5 类地形 × 10 级难度，从易到难。  
- **结果**：通用策略在常见参数化障碍上 ~80–98% 通过，但在极端形状（陡楔块、梯形台、桩柱阵）上几近全部失败——这正是 TTT 要补的差距。

### Stage 2 · 快速几何重建（≤几分钟）

把"现场"映射进仿真的关键工程模块，分四步：

1. **真实采集**：用 RGB-D 相机扫描场地（彩色 + 深度序列）。  
2. **前馈重建**：用前馈模型从 RGB 序列得到 *scale-ambiguous* 点云，再用 *screened Poisson* 表面重建得到网格——比 NeRF/3DGS 快一个数量级。  
3. **尺度校准**：拿前馈模型预测的深度与 RGB-D 真实深度（取深度图下半区的中位数）求比例系数，把整个场景缩放到米制。**这一步至关重要**：尺度估错 10% 时，窄梁可能根本没法落脚。  
4. **坐标对齐**：3D 语义分割出"地面"→ RANSAC + PCA 估计法向 → 旋转使 z 轴对齐重力；再用起点/终点平台质心连线对齐 x 轴。最终得到与仿真 world frame 严格一致的 simulation-ready mesh。

### Stage 3 · 测试时训练（TTT）

- **关键约束**：保留预训练的 MDP（同一个观测/动作空间、同一组奖励），只换 terrain mesh。  
- **微调策略对比**：作者比较了 4 种——**Full Fine-tuning**（端到端解冻全部参数）、**Adapter 模块**（在编码器和 MLP 各层后插入 Adapter）、**残差网络**（并联一个零初始化的残差动作头）、**Last Layer**（只调 actor 最后一层）。**Full Fine-tuning 综合最稳**。  
- **算力 / 时间**：RTX 5090 × 4096 并行环境 × 每步 < 4 s × ≈1k 迭代 → **整套"拍-重建-微调"通常 ≤ 10 分钟**。  
- **真机部署**：直接把更新后的策略导回 Jetson Orin NX，推理 50 Hz，深度图下采样为 32×18 居中区域。  

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph PRE["🎓 Stage 1 · 预训练"]
        P0["程序化生成 5 类 × 10 级<br/>地形 + 课程学习"]
        P1["PPO + Asymmetric AC<br/>CNN(depth) + 本体 history → MLP"]
        P2["AMP 风格奖励<br/>(MPC 数据集)"]
        P0 --> P1
        P2 --> P1
    end

    subgraph RECON["🛠️ Stage 2 · 快速几何重建 (≤ 几分钟)"]
        R1["📷 RGB-D 采集<br/>(D435i)"]
        R2["前馈重建<br/>点云 + Poisson 表面"]
        R3["尺度校准<br/>(对齐前馈深度 ↔ 传感器深度)"]
        R4["坐标对齐<br/>RANSAC + PCA → z 轴对重力<br/>start→end 对 x 轴"]
        R5["✅ Simulation-ready Mesh"]
        R1 --> R2 --> R3 --> R4 --> R5
    end

    subgraph TTT["⚡ Stage 3 · 测试时训练 TTT (≈ 1k iters)"]
        T1["Full Fine-tune (最稳)"]
        T2["Adapter / Residual / LastLayer"]
        T1 --- T2
    end

    DEPLOY["🤖 零样本部署<br/>Unitree G1 · Jetson Orin NX · 50 Hz"]

    PRE -->|"预训练 checkpoint π_0"| TTT
    R5 -->|"加载到 IsaacLab 物理仿真"| TTT
    TTT -->|"更新后的 π*"| DEPLOY

    style PRE fill:#e8f4fd,stroke:#1f78b4
    style RECON fill:#fdebd0,stroke:#e67e22
    style TTT fill:#fce4ec,stroke:#c2185b
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **两阶段感知行走范式**：把"通用预训练 + 现场快速 TTT"作为人形跑酷的可行流程，证明两者**缺一不可**（Scratch-1 失败、Pre-train 单独也不行）。  
2. **快速几何重建管线**：前馈重建 + 尺度校准 + 物理一致坐标对齐，**把 NeRF/3DGS 几十分钟级别的重建压到分钟级**，并保证物理仿真可用。  
3. **完整 Real→Sim→Real 闭环**：从扫描到部署 ≤10 分钟，验证了"测试时训练"在 sim-to-real 场景中的可行性。  
4. **跨多种极端地形验证**：13 个真实地形（楔块、桩柱、箱子、梯形台、窄梁、混合）+ 仿真 99%+ 通过率 + 真机零样本部署。  

---

## 📊 实验亮点（节选自 Table I）

| 方法 | 典型陡楔块 | 梯形台 Trap.1 | 窄梁 Nar.3 | 桩柱 Stake2 | 混合地形 Mix1 |
|---|---|---|---|---|---|
| Pre-train（通用策略） | **0.1%** | 0.0% | 65.6% | 0.0% | 0.0% |
| Scratch-1（25k 从零）| 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| TTT-13（多地形联训 1k）| 100.0% | 100.0% | 99.6% | 100.0% | 99.9% |
| **TTT-1（单地形微调收敛）** | **100.0%** | **100.0%** | **99.4%** | **100.0%** | **99.9%** |

- **从 0% 到 100% 只用 ~1k 迭代**，体感时间在分钟量级。  
- **真机零样本**：在楔块 / 桩柱 / 箱子 / 梯形台 / 窄梁 / 混合地形 6 类地形上稳定通行，仅依赖板载 D435i，无 LiDAR。  
- **重建消融**：纯 RGB 前馈方案在桩柱、窄梁这类高几何约束地形上会因为尺度偏差导致策略不收敛，**RGB-D 提供的尺度参考是工程关键**。  

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **训练范式** | 从"一次训练打天下"转向"通用预训练 + 现场 TTT"；与基础模型的 in-context adaptation 理念对齐 |
| **感知行走** | 证明端到端深度策略 + 板载相机就能完成跑酷，无需 LiDAR / 全局地图 |
| **Sim-to-Real** | 把 sim-to-real gap 的责任前移到"现场重建质量"上，重建一旦尺度正确，标准 domain randomization 就够用 |
| **工程价值** | 10 分钟的现场流程是真正可落地的运维节奏；对运动会、室内救援等"先看场地再上场"的任务尤其友好 |

---

## 🎤 面试参考

**Q：TTT 和"在线域随机化 / Domain Adaptation"有什么区别？**  
A：传统域随机化是**离线**把变量分布拉宽，希望部署时落在训练分布里；DA 一般在策略层面做表征对齐。TTT-Parkour 是**在仿真里针对当前真实地形再做一轮 RL 微调**——相当于"换张地图重训一段"，但代价被压到分钟级。它不是替代域随机化，而是叠加在它之上，专门补"现场陌生几何"这一类 OOD。

**Q：为什么不直接在真机上做强化学习微调？**  
A：跑酷地形容错率极低，真机摔一次成本高；仿真里有 4096 个并行环境可以并发尝试。论文的关键是**让仿真足够像真实场地**，于是把强化学习放回仿真，避免硬件磨损与人身风险。

**Q：尺度校准为什么是 RGB-D 而不是纯 RGB？**  
A：纯 RGB 前馈方案在长跨度跑酷场景下尺度漂移严重（论文 Table IV）。若桩柱尺度被低估，机器人在仿真里的有效落脚面会被缩小到不可解，PPO 直接卡死。RGB-D 的深度图给出一个"中位数尺度"参考，把残余偏差压回标准 domain randomization 的 [0.9, 1.1] 范围内，于是 PPO 才能正常收敛。

**Q：为什么 Full Fine-tuning 反而比 Adapter / Residual 好？**  
A：Adapter / Residual 适合"分布漂移有限、想保护原能力"的场景；这里地形跨度大、需要的步态分布变化大，限制参数空间反而拖慢收敛。Last-Layer 直接欠拟合。当微调预算就是几分钟 + 1k 迭代时，Full Fine-tune 既能彻底改造行为又不会过拟合（因为单一地形里轨迹分布相对窄）。

**Q：和 H14 *Humanoid Parkour Learning* 的关系？**  
A：HPL 关注**通用跑酷策略**的从零训练与课程；TTT-Parkour 假设你已经有一个 HPL 风格的预训练策略，**专攻"部署阶段如何吃下未见地形"**。两者是流水线上下游关系——HPL 提供 π₀，TTT-Parkour 提供 π₀ → π* 的快速适配。

---

## 🔗 相关阅读

- [Humanoid Parkour Learning (2406.10759)](https://arxiv.org/abs/2406.10759)：通用跑酷预训练的代表作（H14）
- [Real-World Humanoid Locomotion with RL (2303.03381)](https://arxiv.org/abs/2303.03381)：人形 sim-to-real 行走奠基（H12）
- [Adversarial Motion Priors (2104.02180)](https://arxiv.org/abs/2104.02180)：本文风格奖励的来源
- [IsaacLab](https://github.com/isaac-sim/IsaacLab)：训练所用的高性能仿真栈
- [NeRF / 3DGS](https://arxiv.org/abs/2308.04079)：被本文换掉的"慢但精"重建方案，做对比的天然 baseline
