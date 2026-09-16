---
layout: paper
paper_order: 12
title: "Spherical Latent Motion Prior for Physics-Based Simulated Humanoid Control"
zhname: "SLMP：面向物理仿真人形控制的球面隐空间运动先验"
category: "物理动画"
---

# Spherical Latent Motion Prior for Physics-Based Simulated Humanoid Control
**用「专家跟踪 → 蒸馏进单位球面隐空间 + 判别器引导的语义一致性」造出一个既保真又能稳定随机采样的运动先验，让物理仿真人形在稀疏规则奖励下涌现出类人格斗行为**

> 📅 阅读日期: 2026-09-16
>
> 🏷️ 板块: 13 Physics-Based Animation · 运动先验 / 球面隐空间 / 蒸馏 + 判别器引导 / 多智能体格斗
>
> 🔁 推进轨: 模块轮转（12_Hardware_Design → **13_Physics-Based_Animation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2603.01294](https://arxiv.org/abs/2603.01294) |
| HTML | [在线阅读](https://arxiv.org/html/2603.01294) |
| PDF | [下载](https://arxiv.org/pdf/2603.01294) |
| 源码 | [Colin-Jing/SLMP_Combat](https://github.com/Colin-Jing/SLMP_Combat) |
| 作者 | Jing Tan, Weisheng Xu, Xiangrui Jiang, Jiaxi Zhang, Kun Yang, Kai Wu, Jiaqi Xiong, Shiting Chen, Yangfan Li, Yixiao Feng, Yuetong Fang, Yujia Zou, Yiqun Song, Renjing Xu 等 |
| 平台 | Isaac Gym（60 Hz 物理步）· 基于 PHC / SMPLOlympics 代码框架 · PPO(GCRL) + 蒸馏 |
| 本体 | SMPL 人形 + Unitree G1 + ENGINEAI PM01（验证跨形态迁移） |
| **发布时间** | 2026-03-01（arXiv v1） |

---

## 🎯 一句话总结

现有运动先验各有硬伤：**VAE 类先验**（如 PULSE）走「重构瓶颈」，压缩会丢运动细节，且隐空间低密度区随机采样容易产出无效动作；**AMP/对抗类先验**（如 ASE）易**模式崩塌**，难覆盖多样技能。SLMP 换一条路：先用 RL 训一个高质量**动作跟踪专家**，再把它**蒸馏进一个单位球面隐空间**——用 ①蒸馏损失保真、②判别器区分「专家动作 vs 随机隐码动作」、③**判别器引导的局部语义一致性损失**塑形邻域，让球面上处处可采、语义连贯。于是既没有信息损失、又能稳定随机采样，最终仅靠稀疏的规则奖励（打中/击倒）就在双人格斗任务里涌现出类人且物理合理的行为，并可迁移到 G1、PM01 等真实人形形态。

---

## ❓ 要解决什么问题？

物理仿真角色控制普遍先学一个**运动先验（motion prior）**，再让高层策略在先验的隐空间里做下游任务。但两大主流先验都不理想：

- **VAE 先验（重构式）**：编码-解码引入信息损失，细节被抹平；隐空间概率密度不均，**低密度区随机采样会解码出无效/失衡动作**，下游探索踩坑。
- **对抗先验（AMP/GAN 式）**：判别器约束风格，但训练不稳、**模式崩塌**，难以同时覆盖大量多样技能。

**本文目标**：构造一个「保真 + 可稳定随机采样 + 覆盖多样技能」的运动先验，使高层只需稀疏奖励即可学出复杂多智能体行为，并能跨人形形态复用。

---

## 🔧 方法核心

### ① 阶段一：训练动作跟踪专家 π_track

用**目标条件 RL（GCRL）+ PPO** 训练专家：输入人形本体感受状态与参考驱动的目标，输出 PD 目标角。奖励是关节位置/朝向/线速度/角速度的指数匹配项 + 能耗惩罚（抑制过大力矩）。这一步保证「隐空间蒸馏」有一个高保真的动作来源。

### ② 阶段二：把专家蒸馏进「单位球面」隐空间

训练一个隐码条件策略 `π_φ(s_t, z_t)`，其中隐码约束在单位球面上（`‖z_t‖₂ = 1`）：

- **目标编码器 E**：把参考目标 `g_t` 归一化投影到球面得到 `z1 = E(g_t)`；
- **随机隐码**：从高斯噪声归一化采样得到 `z2 = ε/‖ε‖₂, ε~𝒩(0,I)`，覆盖整张球面。

用三项损失联合优化（**不走重构瓶颈**）：

1. **蒸馏损失** —— 目标隐码下的动作对齐专家监督：
   `L_distill = ‖a_t1 − a_t*‖₂²`
2. **判别器损失** —— 二元交叉熵区分「专家动作 a_t1」与「随机隐码动作 a_t2」：
   `L_disc = −E[ log D(s,a_t1) + log(1−D(s,a_t2)) ]`
3. **判别器引导的局部语义一致性损失（DLSC）** —— 把随机隐码动作往专家流形拉、并按几何/语义加权：
   - 几何权重 `w_d = e^(−β·d12)`（`d12` 为球面距离，近的更受约束）；
   - 语义权重 `w_c = 1 + |min(0, D(s,a_t2))|`（强调判别器判为「离群」的样本）；
   - `L_DLSC = w_d · w_c · ‖a_t2 − a_t*‖₂²`。
   训练先只用 `w_d` 收敛，再引入 `w_c` 联合优化。

> **球面的好处**：均匀采样处处有效，避免 VAE 低密度区「采样即失效」；语义一致性让邻域随状态自适应——站立态邻域多模态（可接多种后续），腾空态则收敛到少数「可恢复」选项。

### ③ 下游：稀疏规则奖励 + 自博弈学格斗

高层策略 `π_h(z|s_t)` 采样隐码驱动 SLMP 生成最终 PD 动作。用**自博弈**训练（冻结/学习智能体交替，每 250 epoch 互换），奖励**只有稀疏规则信号**：命中检测（接触力 > 30 且距离 < 0.3m）、击倒奖励（+50），跌倒或超距则提前终止。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S1["① 阶段一：动作跟踪专家 (GCRL + PPO)"]
        MOCAP["格斗动捕数据集<br/>~502 clips / 2 小时"]
        TRACK["π_track：状态+参考目标 → PD 目标角<br/>指数匹配奖励 + 能耗惩罚"]
        MOCAP --> TRACK
    end

    subgraph S2["② 阶段二：球面隐空间蒸馏"]
        ENC["目标编码器 E<br/>z1 = E(g_t) 投影到球面"]
        RAND["随机隐码<br/>z2 = ε/‖ε‖₂"]
        PI["π_φ(s, z) 隐码条件策略<br/>‖z‖₂ = 1"]
        DISC["判别器 D<br/>区分 专家动作 / 随机隐码动作"]
        LOSS["L = L_distill + L_disc + L_DLSC<br/>w_d=e^(−β·d12), w_c=1+|min(0,D)|"]
        ENC --> PI
        RAND --> PI
        PI --> DISC
        DISC --> LOSS
        TRACK -->|"专家动作 a*"| LOSS
        LOSS -.->|"更新"| PI
    end

    subgraph S3["③ 下游：双人格斗 (自博弈 + 稀疏奖励)"]
        HIGH["高层 π_h(z|s)<br/>采样球面隐码"]
        SPARSE["稀疏规则奖励<br/>命中 / 击倒(+50) / 跌倒终止"]
        HIGH -->|"z_t"| PI
        HIGH --> SPARSE
    end

    subgraph SIM["🦿 Isaac Gym (60 Hz)"]
        BODY["SMPL / Unitree G1 / ENGINEAI PM01"]
    end

    PI -->|"PD 动作"| BODY
    BODY -->|"新状态"| PI
    SPARSE -.->|"PPO 更新"| HIGH

    style S1 fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style S2 fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style S3 fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style SIM fill:#e0f7fa,stroke:#0097a7,color:#003f47
</div>

---

## 💻 源码运行时序图（mermaid）

> 依据官方仓库 [Colin-Jing/SLMP_Combat](https://github.com/Colin-Jing/SLMP_Combat)（基于 PHC / SMPLOlympics，`phc/` 为核心代码，`scripts/` 提供各形态的 train/eval 脚本，`output/HumanoidIm/` 存放预训练先验），整理典型的「训练格斗策略 / 评测」调用时序。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant SH as scripts/*_combat.sh
    participant RUN as phc 训练入口 (run.py)
    participant ENV as IsaacGym 环境 (Humanoid* task)
    participant PRIOR as SLMP 先验 π_φ (球面隐空间)
    participant HIGH as 高层格斗策略 π_h
    participant PPO as PPO 学习器

    U->>SH: bash scripts/train_g1_combat.sh
    SH->>RUN: 传入 cfg（本体/任务/加载预训练先验路径）
    RUN->>PRIOR: 载入 output/HumanoidIm/ 下的先验权重（冻结）
    RUN->>ENV: 创建并行 env（60Hz 物理步 + 自博弈对手池）
    loop 每个训练迭代
        ENV-->>HIGH: 观测 s_t（双智能体本体状态）
        HIGH->>HIGH: 采样球面隐码 z_t ~ π_h(z|s_t)
        HIGH->>PRIOR: z_t, s_t
        PRIOR-->>ENV: PD 目标角 a_t（先验解码）
        ENV->>ENV: 物理步进 + 命中/击倒判定
        ENV-->>PPO: 稀疏规则奖励 r_t（命中/击倒/终止）
        PPO->>HIGH: 更新高层策略（先验保持冻结）
        Note over ENV,HIGH: 每 250 epoch 冻结/学习智能体互换（自博弈）
    end
    U->>SH: bash scripts/eval_g1_combat.sh
    SH->>RUN: 加载已训练 π_h + 先验
    RUN->>ENV: rollout 可视化 / 统计成功率、生存率
</div>

---

## 📊 实验与结果

- **数据集**：自采 **2 小时格斗动捕**（~502 clips），含站架、步法、直/勾/上勾拳、正/回旋/转身踢、膝肘、以及闪避/下潜/后仰等防守；Xsens 惯性套装 180 Hz 采集、降采样到 30 Hz，含慢/正常/快三档速度与头/身/腿三种目标高度。
- **仿真**：Isaac Gym，60 Hz；训练时长 —— 专家跟踪约 24h、隐空间先验约 12h、格斗策略约 8h（双卡 RTX 4090）；隐维度 `d=64`，`λ_distill=1.0, λ_DLSC=1.0, β=0.1`。
- **指标**：Success（不跌倒完成跟踪的片段比例）、MPJPE（对参考的平均关节位置误差）、Survival rate（1000 次随机 rollout 在 5/10/20/30s 仍未跌倒的比例）。
- **基线**：**PULSE（VAE 类）**、**ASE（AMP 类）**，以及 VAE / VQ-VAE / 裸球面等消融。
- **结论**：SLMP 在保真（低 MPJPE）与随机采样稳定性（高 survival）上同时占优，稀疏奖励下涌现出**类人、物理合理**的双人格斗；并成功迁移到 **Unitree G1 / ENGINEAI PM01** 真实人形模型，验证跨形态兼容与实用约束下的可行性。

---

## 💡 核心贡献

1. **球面隐空间运动先验**：以「专家蒸馏 + 单位球面 + 判别器引导语义一致性」取代重构瓶颈，既保真（无信息损失）又保证**随机采样处处有效**，兼顾多样性与稳定性。
2. **判别器引导的局部语义一致性损失（DLSC）**：用几何权重 + 语义权重把随机隐码动作往专家流形拉，并让邻域随状态自适应（站立多模态 / 腾空少选项）。
3. **稀疏奖励下的多智能体格斗涌现**：仅命中/击倒等规则奖励即学出类人对抗行为，并**跨形态迁移**到 G1、PM01，配套开源代码（基于 PHC / SMPLOlympics）。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **先验空间几何** | 把隐空间约束到「处处可采」的紧致流形（单位球面），能显著降低下游探索踩到无效动作的风险——对真实机器人尤为重要（无效动作=摔机） |
| **蒸馏而非重构** | 从高保真跟踪专家蒸馏，避免 VAE 压缩丢细节，为高动态技能（格斗/敏捷动作）保住关键运动特征 |
| **稀疏奖励可用** | 好的运动先验能把「奖励工程」压到最简（命中/击倒），下游任务定义更贴近真实目标 |
| **跨形态迁移** | 同一套先验方法在 SMPL / G1 / PM01 上复用，提示「先验方法」比「某具体本体」更可迁移 |

---

## ⚠️ 局限与可改进点

- **任务偏对抗/格斗**：先验在格斗动捕上蒸馏，泛化到搬运、精细操作等长时程任务仍待验证；
- **两阶段成本**：需先训高质量跟踪专家（约 24h）再蒸馏，整体训练开销不低；
- **仿真为主**：跨形态迁移在仿真中验证，真实机器人硬件闭环（接触、时延、传感噪声）尚未展示；
- **稀疏奖励的塑形边界**：命中/击倒阈值等规则仍是任务先验，换任务需重新设计；
- 具体定量数值（MPJPE / survival / 成功率）以官方 PDF 为准，本笔记基于摘要、HTML 版与仓库信息整理。

---

## 🎤 面试参考

**Q：SLMP 想同时解决 VAE 先验和对抗先验的什么问题？**
A：VAE 先验有重构信息损失、且低密度隐区随机采样会产出无效动作；对抗先验（AMP）易模式崩塌、难覆盖多样技能。SLMP 用「专家蒸馏（保真）+ 单位球面（处处可采）+ 判别器引导语义一致性（覆盖多样、邻域连贯）」把两者的缺陷一起绕开。

**Q：为什么选「单位球面」而不是普通欧氏隐空间？**
A：球面是紧致且可均匀采样的流形，`z=ε/‖ε‖₂` 处处覆盖、没有 VAE 那种低密度「死角」，因此随机采样得到的动作更可能有效，下游探索更稳。

**Q：DLSC 损失里的两个权重各起什么作用？**
A：几何权重 `w_d=e^(−β·d12)` 让球面上相近的隐码动作更被约束一致（局部平滑）；语义权重 `w_c=1+|min(0,D)|` 强调判别器判为「离群/不像专家」的样本，把它们优先拉回专家流形。先只用 `w_d` 收敛、再加 `w_c` 联合训练。

**Q：下游格斗是怎么训的？先验会被更新吗？**
A：高层策略在冻结的球面先验上采样隐码，用自博弈（每 250 epoch 冻结/学习互换）+ 稀疏规则奖励（命中、击倒 +50、跌倒终止）由 PPO 更新；先验一般保持冻结，保证动作始终落在保真流形内。

---

## 🔗 相关阅读

- [PULSE: Physically Plausible Universal Latent Skill Extraction (本仓库进度列表)](../../PROGRESS.md) — VAE 类通用运动先验，SLMP 的重要对照基线
- [ASE: Adversarial Skill Embeddings (2022)](https://arxiv.org/abs/2205.01906) — AMP/对抗类技能隐空间，SLMP 指出其模式崩塌问题
- [PHC: Perpetual Humanoid Control (2023)](https://arxiv.org/abs/2305.06456) — 本文代码框架基础之一（动作跟踪）
- [Learning to Ball (本仓库笔记)](../Learning_to_Ball__Composing_Policies_for_Long-Horizon_Basketball_Moves/Learning_to_Ball__Composing_Policies_for_Long-Horizon_Basketball_Moves.html) — 同为物理仿真角色的技能组合与长时程任务

---

> 备注：本笔记基于 arXiv 摘要、HTML v1 与官方仓库 [Colin-Jing/SLMP_Combat](https://github.com/Colin-Jing/SLMP_Combat) 整理；源码运行时序图依据仓库结构（`phc/` 核心 + `scripts/` 各形态 train/eval 脚本 + `output/HumanoidIm/` 预训练先验）与 PHC/SMPLOlympics 通用调用流程绘制，具体入口与参数以仓库最新代码为准；定量指标以官方 PDF 为准。
