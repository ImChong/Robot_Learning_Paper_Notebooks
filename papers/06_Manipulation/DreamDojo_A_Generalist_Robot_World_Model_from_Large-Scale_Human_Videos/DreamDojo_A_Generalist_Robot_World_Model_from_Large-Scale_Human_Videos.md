---
layout: paper
paper_order: 4
title: "DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos"
zhname: "DreamDojo：从大规模人类视频中学到的通用机器人世界模型"
category: "Manipulation"
---

# DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos
**用 4.4 万小时第一视角人类视频，预训练一个能"做梦"的机器人通用世界模型**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: 06 Manipulation · 世界模型 · 视频生成 · 通用机器人
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.06949](https://arxiv.org/abs/2602.06949) |
| HTML | [arXiv HTML v1](https://arxiv.org/html/2602.06949v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.06949) |
| 项目主页 | [dreamdojo-world.github.io](https://dreamdojo-world.github.io/) |
| **发布时间** | 2026-02-06 (arXiv) |
| 源码 | [NVIDIA/DreamDojo](https://github.com/nvidia/DreamDojo)（Apache-2.0） |
| HuggingFace | [papers/2602.06949](https://huggingface.co/papers/2602.06949) |
| 概览（alphaXiv） | [alphaxiv.org/overview/2602.06949](https://www.alphaxiv.org/overview/2602.06949) |
| 机构 | NVIDIA Research（合作含 UC Berkeley、CMU 等） |
| 发表时间 | 2026-02 |
| 模型规模 | 2B / 14B 参数；预训练用 ~10 万 H100 GPU·小时 |
| 支持机器人 | GR-1 · Unitree G1 · AgiBot · YAM |

---

## 🎯 一句话总结

> DreamDojo 把"世界模型"做成了一个**像素级的视频扩散梦境**：先用 **4.4 万小时第一视角人类视频** + **连续潜在动作（latent action）** 做硬件无关的预训练，再用少量目标机器人数据后训练把"梦"接上真实关节，最后用蒸馏把推理压到 **10 FPS 实时**——给遥操作、策略评测、模型预测规划提供一个**不依赖物理引擎**的通用沙盒。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| LAM | Latent Action Model | 潜在动作模型，从连续帧抽取 32 维潜动作向量 |
| WAN2.2 | Wan2.2 Video Tokenizer | DreamDojo 用的视频 token 化模块（4× 时间压缩） |
| Cosmos-Predict2.5 | NVIDIA Cosmos 系列 | 底层潜变量视频扩散模型 |
| VAE | Variational Autoencoder | 变分自编码器，用于潜动作的提取 |
| Embodiment | 机器人本体 | GR-1 / G1 / AgiBot / YAM 等不同形态 |
| MBP | Model-Based Planning | 基于世界模型的规划 |

---

## ❓ 论文要解决什么问题？

机器人想"在脑子里走一步"再行动，需要一个**够通用、够真实、够快**的世界模型。但现有方案都被卡在某一处：

1. **物理引擎（MuJoCo / Isaac）**：真但贵——每个新场景都要建模、调参，跨场景几乎不可迁移。
2. **早期视频世界模型**：通用但糙——只在小规模、特定任务数据上训，跨物体 / 跨场景立刻穿帮。
3. **机器人轨迹数据稀缺**：即便想直接学，带动作标签的机器人示范数据数量远不足以训出"通用先验"。

DreamDojo 的切入点是：**人类的第一视角视频本来就遍地都是**，但缺动作标签。如果能找到一个**统一的"代理动作"**把人类视频和机器人数据拉到同一空间，就能把"几万小时无标动作的人类视频"利用起来，得到一个真正**通用的视觉世界模型**，再用少量真机数据"对齐"到目标机器人。

---

## 🔧 方法详解

### 1. DreamDojo-HV：迄今为止最大的世界模型预训练数据集

- **总量**：44,711 小时第一视角人类视频。
- **覆盖度**：6,015 个独立任务 · 9,869 个场景 · 43,237 个物体。
- 相比此前同类数据集："**时长 × 15**、**技能 × 96**、**场景 × 2000**"。
- 全部为**无动作标签**的纯视频，强迫模型从像素里挖出"动作"。

### 2. 连续潜在动作（LAM）：把人 → 机器人接到同一动作空间

- 用一个 **时空 Transformer VAE** 看相邻帧，回归出一个 **32 维连续潜在动作向量** $z_a$。
- 这个 $z_a$ 是**硬件无关**的：手揉番茄 / 机器人末端推番茄都会得到相似的 $z_a$。
- 预训练时把 $z_a$ 当作"代理动作"喂给视频扩散，于是模型学到 "**给定一段当前画面 + $z_a$，未来帧应该长什么样**"——这其实就是**像素空间的动力学**。

### 3. 视频扩散骨干：Cosmos-Predict2.5 + WAN2.2 tokenizer

- 底座是 NVIDIA 的 **Cosmos-Predict2.5** 潜变量视频扩散模型。
- 视频 token 化用 **WAN2.2**，**时间压缩比 4**（每 4 帧合 1 个潜帧）。
- 为了配合这个压缩比，DreamDojo 引入三个关键改造：

  | 改造 | 作用 |
  |---|---|
  | **Relative Actions** | 用关节增量（delta）替代绝对位姿，迁移到不同机器人时更稳 |
  | **Chunked Action Injection** | 每个潜帧注入连续 **4 个动作** ↔ 对齐 tokenizer 的 4× 时间压缩 |
  | **Temporal Consistency Loss** | 让预测帧之间的速度匹配 GT，减少"物体跳变 / 重影"伪影 |

### 4. 两阶段训练：预训练 → 后训练 → 蒸馏

1. **预训练**：在 DreamDojo-HV 上以 LAM 提取的 $z_a$ 为条件训练扩散模型。模型规模 2B / 14B。
2. **后训练**：在目标机器人（GR-1 / G1 / AgiBot / YAM）的小规模真机数据上，把条件从 LAM 切换到**真实连续关节动作** —— 像素级的物理先验得以保留，只学一个"动作语义对齐"。
3. **蒸馏**：把多步去噪压成少步，做到 **10.81 FPS 实时**，长达 **1 分钟以上**的稳定自回归生成。

### 5. 下游用法：把"梦境"当万能仿真

- **Live Teleoperation**：操作员动作 → LAM → 实时生成机器人"未来画面"，预览动作效果。
- **Policy Evaluation**：策略在梦境中跑闭环，无需架设真机就能粗筛策略。
- **Model-Based Planning**：把梦境当滚动展开（rollout）做规划，比如 fruit-packing 任务，把成功率从随机采样的基线提升 **+17%（≈ 2× 提升）**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 数据层"]
        HV["🎥 4.4 万小时<br/>第一视角人类视频<br/>(DreamDojo-HV)"]
        ROBOT["🤖 目标机器人少量数据<br/>GR-1 / G1 / AgiBot / YAM"]
    end

    subgraph LAM["🧬 潜在动作模型 (LAM)"]
        ENC["⏱️ 时空 Transformer VAE"]
        Z["📐 32 维潜在动作 z_a<br/>(硬件无关)"]
    end

    subgraph WM["🌀 视频扩散世界模型"]
        TOK["🧩 WAN2.2 Tokenizer<br/>(4× 时间压缩)"]
        COS["🎞️ Cosmos-Predict2.5 主干<br/>2B / 14B"]
        RA["🔁 Relative Actions"]
        CA["📦 Chunked Action Injection"]
        TCL["📈 Temporal Consistency Loss"]
    end

    PRE["🏋️ 预训练<br/>条件 = z_a<br/>(~10 万 H100·h)"]
    POST["🎯 后训练<br/>条件 = 真实关节 Δq"]
    DIST["⚡ 蒸馏<br/>→ 10.81 FPS 实时"]

    APP["🚀 下游应用<br/>遥操作 · 策略评测 · 基于模型规划"]

    HV --> ENC --> Z
    HV --> TOK
    Z --> PRE
    TOK --> COS
    COS --> PRE
    RA --> COS
    CA --> COS
    TCL --> COS
    PRE --> POST
    ROBOT --> POST
    POST --> DIST
    DIST --> APP

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style LAM fill:#fff7e0,stroke:#d4a017
    style WM fill:#f3e8ff,stroke:#8e44ad
    style APP fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **DreamDojo-HV 数据集**：44,711 小时 × 6,015 任务 × 9,869 场景，把"世界模型预训练"的数据规模一举推到史上最大。
2. **连续潜在动作（LAM）**：用 32 维潜动作把无标签人类视频与机器人动作打通，为"跨本体迁移"提供统一接口。
3. **三件工程关键**：Relative Actions + Chunked Action Injection + Temporal Consistency Loss，把 Cosmos-Predict2.5 改造成"机器人就绪"的视频世界模型。
4. **首个证明可实时使用的通用机器人世界模型**：蒸馏到 10.81 FPS，可在多种机器人形态、任意环境下做 1 分钟以上稳定 rollout。

---

## 📊 关键数据

| 维度 | 数值 |
|---|---|
| 预训练视频时长 | **44,711 h** |
| 任务 / 场景 / 物体 | 6,015 / 9,869 / 43,237 |
| 模型规模 | 2B / 14B |
| 训练算力 | ~10 万 H100·h |
| 实时推理速度 | **10.81 FPS**（蒸馏后） |
| 稳定 rollout 时长 | > 1 min |
| Fruit-packing 任务真机成功率 | **+17%（≈ 2× 提升）** vs. 随机采样 |
| 支持机器人本体 | GR-1 · G1 · AgiBot · YAM |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **数据效率** | 把"机器人动作数据贵"转移到"人类视频便宜"，是又一次用人类数据补机器人数据的范式 |
| **跨本体迁移** | LAM 让"在 GR-1 上学到的动力学先验"几乎免费迁到 G1 / AgiBot / YAM |
| **VLA / 策略评测** | 给 VLA 类模型一个**像素级闭环评估器**，不必再为每个任务单独搭仿真 |
| **MBP 与 Sim-Free 控制** | 像素世界模型可承担 MPC 的"内部模拟器"角色，省掉物理引擎的接触/形变建模 |
| **遥操作辅助** | 在真机执行前先在梦里走一步，给操作员提供前瞻画面以纠正动作 |

---

## ⚠️ 局限与开放问题

- **像素 ≠ 物理**：扩散模型可能"看起来对、力学上错"，做精细接触任务（推叠、拧螺丝）时需谨慎。
- **长时漂移**：自回归 1 分钟稳定，但更长 horizon 仍会偏移；MBP 中需要短滚动 + 真机校正。
- **后训练数据量**：虽然主打"小规模真机数据"，但目标 embodiment 的多样性仍直接决定迁移效果。
- **算力门槛**：14B 模型 + 实时推理对部署端 GPU 要求高，落地需要权衡 2B vs. 14B。

---

## 🎤 面试参考

**Q：DreamDojo 和传统物理引擎仿真（Isaac / MuJoCo）的本质区别？**
A：物理引擎靠**白盒方程 + 资产建模**模拟世界；DreamDojo 直接用**视频扩散**在像素空间里"梦出"未来帧。前者精度高但每个场景要单独搭，后者天然跨场景、跨物体，但物理一致性是统计意义上的。两者互补：DreamDojo 适合"大覆盖度、粗精度"的策略筛选 / 前瞻预览，物理引擎适合最终精调。

**Q：为什么要引入连续潜在动作 $z_a$？直接用人手位姿不行吗？**
A：不行。人手位姿和机器人关节空间维度、约束、坐标系都不一样，强行映射会"丢失语义"；而 $z_a$ 是**通过未来帧重建反向监督学到的**——只要"动作的视觉后果"一致，$z_a$ 就一致，于是人类视频和机器人轨迹被天然地拉到同一空间。

**Q：Chunked Action Injection 为什么是关键？**
A：WAN2.2 tokenizer 把 4 帧压成 1 个潜帧。如果一个潜帧只对应一个动作，时间分辨率被强制砍 4 倍，精细动作（如灵巧手指弯曲）就被糊掉。Chunked Injection 让每个潜帧都看到完整的 4 个连续动作，**保留时间分辨率**、对齐压缩比。

**Q：怎么把这个模型用在策略训练里？**
A：三种常见用法：① 当作 rollout 仿真器评估策略；② 在 MPC / CEM 里做内部预测；③ 给策略提供 reward shaping（梦境中是否完成任务）。论文 fruit-packing 的实验属于第 ②③ 类的混合。

**Q：和同期 GR00T 系列、Cosmos 主线的关系？**
A：GR00T 是面向 VLA 的端到端策略；Cosmos 是 NVIDIA 的视频生成主线；DreamDojo **基于 Cosmos-Predict2.5 的扩散骨干**，专门做"机器人就绪"的世界模型，是把 Cosmos 的视觉先验下沉到机器人控制的那块拼图。

---

## 🔗 相关阅读

- 项目主页 / 演示：[dreamdojo-world.github.io](https://dreamdojo-world.github.io/)
- 源码：[NVIDIA/DreamDojo](https://github.com/nvidia/DreamDojo)
- arXiv：[2602.06949](https://arxiv.org/abs/2602.06949) · [HTML](https://arxiv.org/html/2602.06949v1) · [PDF](https://arxiv.org/pdf/2602.06949)
- 底层视频扩散：[NVIDIA Cosmos-Predict2.5](https://research.nvidia.com/labs/cosmos-lab/cosmos-predict2.5/)
- 视频 tokenizer：[Wan2.2](https://github.com/Wan-Video/Wan2.2)
- 同模块对照：[HumDex](../HumDex_Humanoid_Dexterous_Manipulation_Made_Easy/HumDex_Humanoid_Dexterous_Manipulation_Made_Easy.html)（人类视频→机器人数据）· [cuRoboV2](../cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields/cuRoboV2_Dynamics-Aware_Motion_Generation_with_Depth-Fused_Distance_Fields.html)（GPU 原生运动生成）· [EgoMimic](../EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.html)（第一视角人类视频驱动模仿）
