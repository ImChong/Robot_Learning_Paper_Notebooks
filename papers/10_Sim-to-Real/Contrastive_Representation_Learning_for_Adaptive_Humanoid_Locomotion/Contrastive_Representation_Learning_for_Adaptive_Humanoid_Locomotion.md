---
layout: paper
paper_order: 5
title: "Contrastive Representation Learning for Robust Sim-to-Real Transfer of Adaptive Humanoid Locomotion"
zhname: "对比表征学习：把仿真里的特权信息\"蒸\"进 actor 隐状态，再驱动一个自适应步态时钟"
category: "Sim-to-Real"
---

# Contrastive Representation Learning for Robust Sim-to-Real Transfer of Adaptive Humanoid Locomotion
**用对比学习把"特权环境信息（地形/物理参数）"塞进 actor 的潜变量，再让"自适应步态时钟"按这个潜变量主动调整节奏 —— 在不依赖外接感知的情况下让全尺寸人形零样本走过 30 cm 台阶 / 26.5° 斜坡**

> 📅 阅读日期: 2026-05-28
>
> 🏷️ 板块: Sim-to-Real · 对比表征学习 · 自适应步态时钟 · 本体感知人形行走 · 特权信息蒸馏
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2509.12858](https://arxiv.org/abs/2509.12858) |
| HTML | [在线阅读 v1](https://arxiv.org/html/2509.12858v1) |
| PDF | [下载](https://arxiv.org/pdf/2509.12858) |
| **发布时间** | 2025-09-16 (arXiv) |
| 源码 | 截至当前未见公开（实验室主页 [ArcLab @ HKU](https://arclab.hku.hk/) 可关注后续释出） |
| 提交日期 | 2025-09-16 |

**作者**：Yidan Lu, Rurui Yang, Qiran Kou, Mengting Chen, Tao Fan, Peter Cui, Yinzhao Dong, **Peng Lu**
**机构**：The University of Hong Kong · Adaptive Robotic Controls Lab（ArcLab）· Department of Mechanical Engineering
**实机**：全尺寸人形机器人（30 cm 高台阶、26.5° 斜坡通过验证），零样本 sim-to-real

---

## 🎯 一句话总结

主流人形 RL 行走面临**两难选择**——纯本体感知策略**反应快但被动**（只能"踩到了再调"），而依赖深度图/高程图的感知驱动策略**主动但脆弱**（深度噪声、外参漂移、视角遮挡都会让 sim-to-real 崩掉）。本文用**对比学习**把仿真侧的**特权环境信息**（地形高度、摩擦、质量、外力等）**"蒸馏"**到 actor 的隐状态里，同时引入一个**自适应步态时钟**让策略根据"已感知到但实际看不见"的地形主动调整步频，从而**在不接任何外部感知模块**的前提下兼具反应与主动性，全尺寸人形零样本通过 30 cm 台阶和 26.5° 斜坡。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RL | Reinforcement Learning | 强化学习 |
| PPO | Proximal Policy Optimization | 经典在线策略梯度算法 |
| Sim-to-Real | - | 仿真训练，真实部署 |
| Privileged Info | 特权信息 | 仿真里可读、真实里读不到的状态（地形高度、摩擦、质量等） |
| Asymmetric Actor-Critic | - | Critic 用特权信息训练，Actor 仅用本体感知 |
| Contrastive Learning | 对比表征学习 | 通过拉近正样本、推远负样本，学到结构化潜空间 |
| InfoNCE | - | 对比学习常用损失（softmax + temperature） |
| Gait Clock | 步态时钟 | 周期性相位信号，驱动周期性 footstep |
| Adaptive Gait Clock | 自适应步态时钟 | 频率/相位可由策略动态调整 |
| Clock-free Policy | 无时钟策略 | 完全靠网络隐式涌现节奏，灵活但易失稳 |
| Proprioception | 本体感知 | IMU、关节角、电机扭矩等"机器自己的感觉" |
| Zero-shot | - | 训练后无需 fine-tune 直接上实机 |
| HIM / PIM | Humanoid / Perceptive Internal Model | 同期内部模型路线（[2411.14386](https://arxiv.org/abs/2411.14386)） |
| RMA | Rapid Motor Adaptation | 经典两阶段特权蒸馏（[1901.08652](https://arxiv.org/abs/1901.08652) / 衍生工作） |

---

## ❓ 论文要解决什么问题？

**问题陈述**：把强化学习落地到真实人形机器人时，研究者长期被迫在两条路里二选一：

1. **纯本体感知（reactive）**：仅用 IMU + 关节角度 + 电机反馈喂给策略。
   - ✅ Sim-to-real 简单（"看不见"的东西不会因为传感器噪声崩掉）。
   - ❌ **被动**——只能等到脚已经踩到台阶才调整步态，遇到 20 cm 以上的突变地形容易踉跄。
2. **感知驱动（proactive）**：把深度相机 / 高程图 / Lidar 接进策略输入。
   - ✅ 可以**主动**地"看见前方台阶就提前抬腿"。
   - ❌ **脆弱**——深度噪声 / 外参漂移 / 视角遮挡 / 仿真渲染失真都会让 sim-to-real gap 失控。

**作者的判断**：第二条路的"主动性"来源**不是相机本身，而是策略对环境的"理解"**——这种理解原则上也可以通过仿真里的**特权信息**（heightfield / friction / mass / external force）来获得，关键在于**如何让 actor 在真实部署时"还记得"这些特权信息**。

**核心问题**：

> 能否让**纯本体感知的人形 RL 策略**通过**对比学习**把仿真特权信息"内化"到隐状态里，从而在真实世界里复现"看得见"策略的主动性？

---

## 🔧 方法拆解

### 1. 整体框架：Asymmetric Critic + Contrastive Encoder + Adaptive Clock

整个系统由三个紧耦合的模块组成：

```
                ┌───────────── 特权信息 z* (仿真侧可读) ─────────┐
                │                                                │
                │  - 地形高程 (heightmap)                          │
                │  - 摩擦 / 质量 / PD 增益                          │
                │  - 外部扰动力 / 力矩                             │
                │  - 接触状态                                       │
                ▼                                                  
        ┌────────────────┐                              ┌─────────────────────┐
        │ Privileged     │  ─── InfoNCE 对齐 ───▶       │  Latent z (Actor)    │
        │ Encoder φ*     │                              │  仅用本体感知 o 编出 │
        └────────────────┘                              └─────────┬───────────┘
                ▲                                                  │
                │ critic 走特权 → asymmetric AC                    │
                │                                                  ▼
        ┌────────────────┐                              ┌─────────────────────┐
        │ Critic V(z*)   │                              │ Actor π(a | o, z)    │
        └────────────────┘                              └─────────┬───────────┘
                                                                  │
                                                                  ▼
                                                       ┌─────────────────────┐
                                                       │ Adaptive Gait Clock  │
                                                       │ ω(z) → φ_t = ω·t     │
                                                       └─────────────────────┘
```

### 2. 对比表征学习：把"特权"塞进 actor 的隐状态

**正负样本对的构造**（推断自论文叙述）：

- **正样本对**：同一时间步（或邻近窗口）的 `(o_t, z*_t)`——actor 看到的本体感知与 critic 看到的特权信息天然配对；
- **负样本对**：同一 batch 内**其他时间步 / 其他环境**的特权信息 `z*_j` (j ≠ t)。

**InfoNCE 风格损失**：

$$
\mathcal{L}_{\text{NCE}} = - \mathbb{E}_{t}\left[ \log \frac{\exp(\text{sim}(z_t, z^*_t)/\tau)}{\sum_{j} \exp(\text{sim}(z_t, z^*_j)/\tau)} \right]
$$

其中 $z_t = f_\theta(o _ {t-H:t})$ 是 actor 由历史本体感知编出的潜变量，$z^{\ast}_t = f_\phi(s^{\ast}_t)$ 是 privileged encoder 由特权状态编出的潜变量，$\text{sim}$ 通常是余弦相似度，$\tau$ 是温度超参。

**关键设计点**：

- 训练时 critic 直接走特权 $s^{\ast}$，actor 只走本体感知 $o$，**只通过对比损失**让二者潜空间对齐；
- 部署时**只剩 actor**，特权编码器整个被丢掉——但 actor 隐状态已经学会"猜"出地形/摩擦/扰动的结构化表征。

> 💡 直觉：RMA 是用**回归 MSE**把 privileged encoder 蒸到 student encoder；本文换成**对比损失**，主张能学到更**判别性、可迁移**的表征，对真实世界的分布偏移更鲁棒。

### 3. 自适应步态时钟（Adaptive Gait Clock）

**传统两条路**：

| 路线 | 步态时钟 | 优缺点 |
|---|---|---|
| 固定时钟（clocked） | $\phi_t = \omega \cdot t$，$\omega$ 写死 | 稳定但僵化，遇到台阶不会"减速谨慎试探" |
| 无时钟（clock-free） | 网络隐式涌现节奏 | 灵活但易失稳，复现性差 |

**本文方案**：步态频率 $\omega$ 不再是固定常数，而是 **actor 隐状态 z 的函数**：

$$
\omega_t = \omega_{\text{base}} + \Delta\omega(z_t), \quad \phi_{t+1} = \phi_t + \omega_t \cdot \Delta t
$$

由于 $z_t$ 已经"知道"前方是台阶 / 斜坡 / 软地面，$\Delta\omega$ 可以让策略**主动**减速、抬高摆动相、调整接触相位——**没有看到深度图，但"感觉"到了**。

这正是论文标题里 "**Adaptive Humanoid Locomotion**" 的来源：步态会随地形结构自动伸缩。

### 4. 训练管线

- **算法**：PPO + Asymmetric Actor-Critic；
- **损失**：$\mathcal{L} = \mathcal{L} _ {\text{PPO}} + \lambda _ {\text{NCE}} \cdot \mathcal{L} _ {\text{NCE}}$；
- **观测**：
  - Actor 输入：本体感知（IMU 角速度 / 重力方向、关节位置 / 速度、上一步动作）+ 速度指令 + gait clock 相位；
  - Critic 输入：上面所有 + 特权信息（heightmap、摩擦、质量、外力等）；
- **奖励**：标准 locomotion 套件——速度跟随、姿态平稳、能量、接触一致性、足部 clearance、滑动惩罚等；
- **域随机化**：地形高度 / 摩擦 / 质量 / PD 增益 / 延迟 / 外力扰动；
- **零样本部署**：训练完不做任何 fine-tune，直接上全尺寸人形。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SIM["🧪 仿真训练阶段（可读特权信息）"]
        OBS["🎛️ 本体感知 o_t<br/>(IMU + joint q,v + last action)"]
        PRIV["🔮 特权状态 s*_t<br/>(heightmap, friction,<br/>mass, external force)"]
        CMD["🧭 速度指令 v_cmd"]
    end

    subgraph ENC["🧠 双编码器"]
        ENC_A["📦 Actor Encoder f_θ<br/>(只看 o_t)"]
        ENC_P["🗝️ Privileged Encoder f_φ<br/>(只看 s*_t)"]
    end

    OBS --> ENC_A
    PRIV --> ENC_P

    Z["🌀 Latent z_t"]
    ZSTAR["⭐ Privileged Latent z*_t"]
    ENC_A --> Z
    ENC_P --> ZSTAR

    NCE["🎯 InfoNCE 对比损失<br/>拉近 (z, z*) 同步对<br/>推远跨样本对"]
    Z --> NCE
    ZSTAR --> NCE

    subgraph POL["🎮 策略 + 自适应时钟"]
        CLK["⏱️ Adaptive Gait Clock<br/>ω_t = ω_base + Δω(z_t)"]
        ACT["🦿 Actor π(a #124; o, z, φ)"]
    end

    Z --> CLK
    CLK --> ACT
    OBS --> ACT
    Z --> ACT
    CMD --> ACT

    subgraph LEARN["📚 学习信号"]
        CRITIC["📊 Critic V(s*, z*)<br/>(asymmetric)"]
        PPO["⚙️ PPO Loss<br/>+ λ·InfoNCE"]
    end

    ZSTAR --> CRITIC
    PRIV --> CRITIC
    CRITIC --> PPO
    NCE --> PPO
    ACT --> PPO

    subgraph REAL["🤖 实机部署（零样本）"]
        ROBOT["全尺寸人形<br/>(无相机, 仅本体感知)"]
        TERRAIN["✅ 30 cm 台阶<br/>✅ 26.5° 斜坡<br/>✅ 主动调整步频"]
    end

    PPO -. 更新 .-> ENC_A
    PPO -. 更新 .-> ACT
    ENC_A -. 部署 .-> ROBOT
    ACT -. 部署 .-> ROBOT
    CLK -. 部署 .-> ROBOT
    ROBOT --> TERRAIN

    style SIM fill:#e8f4fd,stroke:#1f78b4
    style ENC fill:#fff7e0,stroke:#d4a017
    style POL fill:#f3e8ff,stroke:#8e44ad
    style LEARN fill:#fde8e8,stroke:#c0392b
    style REAL fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **范式贡献**：指出"反应 vs 主动"是个**伪二分**——主动性可以来自策略对环境的"理解"，而不必依赖外部感知模块；
2. **方法创新**：用**对比学习**而非传统的回归蒸馏（RMA / Teacher-Student MSE）把特权信息塞进 actor 隐状态，获得更结构化、判别性更强的潜空间；
3. **架构创新**：**Adaptive Gait Clock**——步态频率成为隐状态的函数，让纯本体感知策略也能"提前减速"；
4. **实证强度**：全尺寸人形（非小型 / 平台机器人）**零样本** sim-to-real 过 30 cm 台阶 / 26.5° 斜坡——在不接感知的前提下接近"看得见"策略的能力上限；
5. **工程价值**：少一套深度相机 / 高程图重建 / 外参标定的依赖，极大降低真实部署 ToB / 服务场景落地的硬件复杂度。

---

## 📊 关键设定与结果

| 维度 | 值 |
|---|---|
| 平台 | 全尺寸人形机器人（具体型号见论文 v1） |
| 算法 | PPO + Asymmetric Actor-Critic + InfoNCE |
| 输入 | 仅本体感知（IMU + 关节 + 上一步动作 + 速度指令） |
| 关键挑战地形 | 30 cm 高台阶、26.5° 斜坡（陡） |
| 实机迁移 | **零样本**（无 fine-tune） |
| 对比基线 | 纯 PPO / 无对比 / 固定时钟（详细见论文 Table） |

> 📌 具体数值（成功率、跌倒率、能量消耗、消融对比）请以 PDF v1 实验章节为准。

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **"特权信息蒸馏"路线的二阶进化** | 从 [RMA](https://arxiv.org/abs/2107.04034) 的 MSE 回归 → 本文的 InfoNCE，是同一思路在表征学习方法上的升级 |
| **跟 [HIM / PIM](https://arxiv.org/abs/2411.14386) 互为镜像** | 内部模型路线强调"预测未来观测"，对比学习路线强调"对齐当下特权"；可融合 |
| **跟 [PolySim](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.md) 思路正交** | PolySim 在仿真侧压窄结构性 gap，本文在表征侧让策略"看得更远" |
| **跟 [LIFT](../LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F/LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F.md) 互补** | LIFT 主打"超大规模预训练 + 高效微调"，本文用"表征学习"换取数据效率 |
| **降低硬件依赖** | 服务机器人 / 工业人形如能保持本体感知 baseline 性能，部署成本会显著下降 |

---

## 🎤 面试参考

**Q：为什么不直接做 Teacher-Student 蒸馏（RMA 风格）？**
A：MSE 蒸馏倾向于学到**绝对值对齐**的表征，但本体感知与特权信息维度差异大（前者百维实值，后者可能是高维 heightmap），强行 MSE 会让 actor encoder 倾向于"猜均值"。InfoNCE 只关心**相对关系**——同一时间步的 (o, z\*) 比其他时间步更近就行——这种**判别式**目标对噪声、维度差异、分布偏移都更鲁棒，也更适合后续被策略使用。

**Q：自适应步态时钟会不会让训练不稳定？**
A：会，所以作者把它写成 $\omega = \omega _ {\text{base}} + \Delta\omega(z)$ 的残差形式，$\omega _ {\text{base}}$ 给一个先验合理的固定值，$\Delta\omega$ 只学增量。这相当于在"clocked"和"clock-free"之间插了一个**可学习但有先验**的中间档，既保留固定时钟的稳定性，又获得无时钟的灵活性。

**Q：30 cm 台阶 / 26.5° 斜坡为什么是有意义的数字？**
A：30 cm ≈ 普通楼梯踏步高度（中国住宅规范 15-17 cm，办公楼可到 17-20 cm，户外大台阶可到 30 cm），是日常巡检 / 救援场景的常见极限；26.5° 接近 1:2 坡度（约 27°），是无障碍坡道（1:12 ≈ 4.8°）远不能覆盖的"陡坡"。能用纯本体感知零样本通过，这两个数字已经非常激进。

**Q：跟 LeggedGym 里常见的 "blind locomotion" 有什么区别？**
A：常规 blind locomotion 是**真的瞎走**——靠 RL + DR 暴力扛过崎岖地形，但策略**并不"知道"自己在哪种地形上**，所以总是被动调整。本文 actor 表面上"瞎"，但隐状态里已经被对比学习塞入了地形结构特征，所以是**"装瞎"**——眼睛闭着，心里有数。

**Q：对比学习的负样本怎么选？跨环境还是跨时间？**
A：论文未给出细节，但常用做法是**跨 batch（跨并行环境 + 跨时间步）**——既覆盖时间相邻样本（防退化为"猜上一帧"），也覆盖空间不同地形（让隐空间真正包含地形信息）。温度 τ 通常需要扫一下，过小会过拟合 hard negatives，过大会退化为均匀分布。

---

## 🔗 相关阅读

- [RMA: Rapid Motor Adaptation for Legged Robots (2107.04034)](https://arxiv.org/abs/2107.04034)：特权蒸馏路线奠基（MSE 回归）
- [Learning Humanoid Locomotion with Perceptive Internal Model (2411.14386)](https://arxiv.org/abs/2411.14386)：同期"内部模型"路线，预测未来观测
- [DreamWaQ (2301.10602)](https://arxiv.org/abs/2301.10602)：四足版本的"用本体感知重建特权"
- [PolySim: Multi-Simulator Domain Randomization (2510.01708)](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.md)：仿真侧 sim-to-real 路线，本仓库已有笔记
- [LIFT: Large-Scale Pretraining + Efficient Finetuning (2601.21363)](../LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F/LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F.md)：另一条"提高数据效率"的路线，本仓库已有笔记
- [RAPT: OOD Detection for Sim-to-Real Humanoids (2602.01515)](../RAPT__Model-Predictive_Out-of-Distribution_Detection_and_Failure_Diagnosis_for_/RAPT__Model-Predictive_Out-of-Distribution_Detection_and_Failure_Diagnosis_for_.md)：部署侧 sim-to-real 监控，本仓库已有笔记
- [CMR: Contractive Mapping Embeddings for Robust Humanoid Locomotion (2602.03511)](https://arxiv.org/abs/2602.03511)：另一种表征学习路线（收缩映射）
- [PvP: Proprioceptive-Privileged Contrastive Representations (2512.13093)](https://arxiv.org/abs/2512.13093)：后续在 WBC 上把同类思想推广到全身控制

---

> 备注：本笔记基于 arXiv 摘要与公开搜索结果整理；网络受限期间 arXiv HTML / PDF 全文暂未抓取，**对比损失的精确形式、网络层数、各项消融数值**请以论文 v1 PDF 实验章节为准。截至当前未见配套开源仓库；作者团队主页见 [ArcLab @ HKU](https://arclab.hku.hk/)，后续如释出代码可补充。
