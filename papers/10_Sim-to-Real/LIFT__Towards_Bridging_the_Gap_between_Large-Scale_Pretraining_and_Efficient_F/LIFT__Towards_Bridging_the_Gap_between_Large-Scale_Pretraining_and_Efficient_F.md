---
layout: paper
paper_order: 3
title: "LIFT: Towards Bridging the Gap between Large-Scale Pretraining and Efficient Finetuning for Humanoid Control"
zhname: "LIFT：用大批量 SAC 预训练 + 物理先验世界模型微调，把人形 sim-to-real 压到 1 小时"
category: "Sim-to-Real"
---

# LIFT: Towards Bridging the Gap between Large-Scale Pretraining and Efficient Finetuning for Humanoid Control
**LIFT：弥合大规模预训练与高效微调的鸿沟**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: Sim-to-Real · 大规模预训练 · 模型化微调 · 物理先验世界模型
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.21363](https://arxiv.org/abs/2601.21363) |
| HTML | [在线阅读](https://arxiv.org/html/2601.21363) |
| PDF | [下载](https://arxiv.org/pdf/2601.21363) |
| 项目主页 | [lift-humanoid.github.io](https://lift-humanoid.github.io/) |
| **发布时间** | 2026-01-29 (arXiv) |
| 源码 | [bigai-ai/LIFT-humanoid](https://github.com/bigai-ai/LIFT-humanoid) |
| OpenReview | [NEOTsyyYH7](https://openreview.net/forum?id=NEOTsyyYH7) |
| HuggingFace Papers | [2601.21363](https://huggingface.co/papers/2601.21363) |
| 发表 | **ICLR 2026** |
| 提交日期 | 2026-01 |

**作者**：Weidong Huang, Zhehan Li, Hangxin Liu, Biao Hou, Yao Su, Jingwen Zhang

**机构**：**BigAI（北京通用人工智能研究院）**

**机器人**：**Booster T1**（12-DoF 仅腿 / 23-DoF 全身）· **Unitree G1**（29-DoF 全身）— 仿真使用 MuJoCo Playground (MJX) + Brax，实机部署 outdoor walking

---

## 🎯 一句话总结

LIFT（**L**arge-scale pretra**I**ning and efficient **F**ine**T**uning）把人形 sim-to-real 的两端都做"狠"：**预训练**用 JAX 实现的 off-policy SAC，配大批量 + 高 UTD ratio，在 MuJoCo Playground 上把巨大并行优势从 on-policy 算法手里抢回来，做到与 PPO / FastTD3 同等甚至更优的奖励但收敛更快；**微调**则训一个 **Lagrangian 解析项 + 神经残差** 的物理先验世界模型，**实环境只执行确定性动作（安全），随机探索全部放进世界模型里 rollout（高样本效率）**——单卡 4090 上 **1 小时**就能把策略迁到新环境与新任务，含腿部和全身两个层级。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| SAC | Soft Actor-Critic | 经典 off-policy 最大熵 RL 算法 |
| PPO | Proximal Policy Optimization | 主流 on-policy RL（同领域基准） |
| UTD | Update-To-Data ratio | 每条新数据被用来训练的步数比例 |
| MJX | MuJoCo XLA | MuJoCo 在 JAX/XLA 上的 GPU 并行版 |
| DR | Domain Randomization | 域随机化 |
| Dyna | - | 模型化 RL 范式：真实数据 + 模型 rollout 数据共同训练策略 |
| Lagrangian dynamics | - | 用拉格朗日方程描述刚体动力学的解析形式 |
| Residual predictor | - | 神经网络对解析模型预测残差的补偿器 |
| WBC | Whole-Body Control | 全身控制 |
| DoF | Degree of Freedom | 自由度 |

---

## ❓ 论文要解决什么问题？

人形机器人 sim-to-real 目前主要靠两条腿走路，但两条腿都不够长：

1. **PPO 一统天下的预训练**：on-policy 算法天然吃满 GPU 并行采样的好处，但**样本利用率低**——一旦真实部署遇到新环境（不同地形、不同负载、不同传感器漂移），重新训练的成本极高；模型化 / off-policy 方案样本效率高但**没人把它们扩到大规模并行预训练**。
2. **实机微调风险高**：传统的 finetune 直接在真实环境里跑随机探索，**摔机器人是大概率事件**；安全微调要么走 model-free 的保守梯度，要么完全依赖手工设计的安全约束，缺一个"既安全又有探索覆盖"的方案。

LIFT 的回答非常工程化：**两个阶段各上各的最强方法，再用一个稳健的世界模型把它们粘起来**——预训练阶段把 off-policy SAC 用 JAX 重写、配大批量 + 高 UTD，**第一次让 SAC 在大规模并行仿真上跑赢/打平 PPO**；微调阶段把 Lagrangian 解析项 + 神经残差的物理先验世界模型挂上 Dyna 风格的循环，**真实环境只走确定性策略（不摔机器人），随机性全在世界模型里**。

---

## 🔧 方法拆解

### 1. 整体范式：两阶段大规模训练 + 安全微调

LIFT 由三块顺序模块组成：

| 阶段 | 输入 | 输出 | 算法核心 |
|---|---|---|---|
| ① 大规模策略预训练 | MuJoCo Playground 并行仿真 + DR | 初始策略 \(\pi_0\) + 重放缓冲 \(\mathcal{D}\) | **JAX-SAC（大批量 + 高 UTD）** |
| ② 物理先验世界模型预训练 | 重放缓冲 \(\mathcal{D}\) | 世界模型 \(\hat{f}(s_t, a_t)\) | **Lagrangian 解析项 + 残差网络** |
| ③ 高效微调 | 新环境少量真实数据 + 世界模型 rollout | 微调后的 \(\pi^*\) | **Dyna 风格：实环境确定性 + 模型内随机** |

> 💡 关键洞察：**仿真侧追求 wall-clock 效率（大批量 GPU 并行），实机侧追求样本效率（模型化 + 物理先验）**——两端各取所长，避免一招吃遍天下。

### 2. 阶段一：JAX-SAC 大规模预训练

传统 SAC 在大规模并行仿真上"用不动"，原因是默认实现的 batch 大小、UTD ratio 跟不上 GPU 的吞吐。LIFT 的关键工程改造：

- **JAX 重写 + MJX 并行**：把 SAC 整套重写到 JAX，actor/critic 都 jit 编译，**采样和更新都在 GPU 上做**；
- **大批量更新（Large-Batch Update）**：每次梯度步用 **数万级别 batch**，配合 LayerNorm / target network 软更新，避免方差爆炸；
- **高 UTD ratio**：每条新数据被多次用来更新 critic 与 actor，**让 off-policy 算法吃干净每一条样本**；
- **域随机化（DR）开足**：质量、摩擦、传感器噪声、控制延迟等都随机化，配合大批量 SAC 的稳健性。

结果：在 6 个 humanoid 任务上（Booster T1 12/23-DoF + Unitree G1 29-DoF × 平地 / 崎岖地），**SAC + UTD 的 evaluation return 与 PPO / FastTD3 相当或更高，崎岖地形上更快收敛到峰值**。这一阶段也直接支持**零样本 outdoor 实机部署**。

### 3. 阶段二：Lagrangian + 残差的物理先验世界模型

直接用神经网络做世界模型在接触富集的步态里**容易学坏**——动力学高度非线性，long-horizon rollout 漂移严重。LIFT 的世界模型由两部分组成：

$$
\hat{s}_{t+1} = \underbrace{f_{\text{Lag}}(s_t, a_t; \theta_{\text{phys}})}_{\text{解析项: 拉格朗日动力学}} + \underbrace{g_{\text{res}}(s_t, a_t; \phi)}_{\text{神经残差: 接触/摩擦/未建模}}
$$

- **Lagrangian 项**：使用人形的近似刚体参数（惯量、质心、关节质量），写出解析的拉格朗日方程，给出大部分主导动力学；
- **残差项**：神经网络只学"差量"——接触力、摩擦、电机非线性、传感器延迟等**难以建模的剩余项**；
- **训练目标**：监督一步预测 / 多步 rollout 误差，数据来源于阶段一 SAC 的重放缓冲 \(\mathcal{D}\)。

> ✨ 这种结构等价于把"已知物理"写进网络的归纳偏置——**残差小、外推稳**，比纯黑盒世界模型 long-horizon rollout 更可靠。

### 4. 阶段三：安全 + 高效的微调

新环境（不同地形 / 新机型 / 不同负载）下的微调流程：

1. **真实环境只走 \(\pi(s)\) 的确定性动作**——不在真实环境注入策略熵，**避免摔机器人**；
2. 真实数据用于持续校准世界模型（残差项）；
3. **所有随机探索都在世界模型里 rollout**——Dyna 风格 SAC 更新继续吃模型内的 imagined transitions，**保留探索覆盖**；
4. 用模型 rollout + 真实数据共同更新策略和 critic。

> 🎯 这一步是 LIFT 的工程价值核心：**安全（实机不冒进）+ 高效（模型 rollout 几乎免费）+ 物理先验稳定（Lagrangian 让长程 rollout 不漂）**，三合一让单卡 4090 上**1 小时即可解决新环境/新任务**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PRETRAIN["🟦 阶段一：JAX-SAC 大规模策略预训练"]
        MJX["⚡ MuJoCo Playground (MJX)<br/>大规模 GPU 并行仿真 + DR"]
        SAC["🧠 JAX-SAC<br/>(大批量 + 高 UTD ratio)"]
        BUF["📦 重放缓冲 𝒟<br/>(40–60M timesteps)"]
        POL0["🤖 初始策略 π₀"]
        MJX --> SAC
        SAC <--> BUF
        SAC --> POL0
    end

    subgraph WORLD["🟩 阶段二：物理先验世界模型预训练"]
        LAG["📐 Lagrangian 解析项<br/>(刚体惯量 / 关节质量)"]
        RES["🌀 神经残差 g_res<br/>(接触 / 摩擦 / 未建模)"]
        WM["🧮 世界模型<br/>ŝ_{t+1} = f_Lag + g_res"]
        BUF -.重用.-> WM
        LAG --> WM
        RES --> WM
    end

    subgraph FT["🟧 阶段三：安全 + 高效微调"]
        REAL["🦿 新环境（地形 / 机型 / 负载变化）"]
        DET["🎯 仅确定性策略<br/>(实环境不冒进)"]
        ROLL["💭 世界模型内随机 rollout<br/>(Dyna 风格)"]
        UPD["🔁 SAC 更新<br/>(真实数据 + 模型 rollout)"]
        PIST["🌟 微调后策略 π*"]
        REAL --> DET
        DET --> UPD
        WM --> ROLL --> UPD
        UPD --> PIST
        PIST -.下一步动作.-> REAL
    end

    POL0 -.warm start.-> DET
    POL0 -.→ outdoor 零样本.-> ZS["🌳 零样本户外行走<br/>(无需微调)"]

    style PRETRAIN fill:#e8f4fd,stroke:#1f78b4
    style WORLD fill:#e8fde8,stroke:#2ecc71
    style FT fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **第一次把 off-policy SAC 推到人形大规模并行预训练**：JAX 实现 + 大批量 + 高 UTD ratio，让 SAC 在 wall-clock 收敛速度上**追平 / 超越 PPO 和 FastTD3**，打破了"PPO 才能吃 GPU 并行"的惯性。
2. **物理先验世界模型（Lagrangian + 残差）**：解析动力学托底 + 神经网络只学差量，long-horizon rollout 稳定，**适合接触富集的步态任务**。
3. **Dyna 风格安全微调范式**：实环境只走确定性策略，随机探索全在世界模型里 → **既不摔机器人，又保留探索覆盖**；单卡 4090 内 1 小时迁移。
4. **完整三机型实验闭环**：Booster T1（12 / 23-DoF）+ Unitree G1（29-DoF）× 平地 / 崎岖地共 6 个任务，再加 outdoor 零样本实机部署，**覆盖了腿部到全身、低维到高维、室内到户外**。
5. **代码与权重开源**：[bigai-ai/LIFT-humanoid](https://github.com/bigai-ai/LIFT-humanoid) 含 JAX-SAC、世界模型训练与微调脚本，工程可复现。

---

## 📊 关键结果

| 评测场景 | 关键指标 | LIFT vs 基线 |
|---|---|---|
| Booster T1 12-DoF / 23-DoF · 平地 + 崎岖地 | 评估 return | **≥ PPO / FastTD3**，崎岖地更快达峰 |
| Unitree G1 29-DoF · 平地 + 崎岖地 | 评估 return | **≥ PPO / FastTD3** |
| 实机 outdoor 零样本部署 | 行走能力 | **直接成功**（无需实机数据） |
| 新环境 / 新任务微调 | 单卡 4090 wall-clock | **≈ 1 小时**完成腿部 + 全身控制微调 |
| 预训练规模 | timesteps | **40–60M**（仿真侧，按任务） |

> 📌 **硬件**：训练用 NVIDIA H800 / RTX 4090；微调可在单 4090 完成。
>
> 📌 重点突出**两个数字**：(a) SAC 在大规模并行下达到 PPO 同等水平——首次；(b) 微调时间从传统数小时压到 ~1 小时且**实机不摔**。

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **预训练范式更新** | 把 off-policy SAC 重新拉回到大规模并行训练的主舞台，PPO 不再是唯一选择；JAX-SAC 模板可直接复用 |
| **物理先验回流** | Lagrangian + 残差是经典的"灰盒动力学建模"，本文证明它在 Dyna RL 里依然能打，**为后续机理 + 数据混合范式提供模板** |
| **安全微调范式** | "实环境确定性 + 模型内随机"是一个非常工程友好的 trade-off，可以直接迁到工业部署、外场实验，**对于昂贵的人形硬件尤其重要** |
| **跨机型迁移基线** | 在三个机型上跑通一致流程，意味着对**机型扩展**（如更高 DoF 的全身机器人）有较强外推能力 |
| **与 MOSAIC / RAPT 互补** | MOSAIC 走残差适配（动作侧）、RAPT 走 OOD 监控（信号侧），LIFT 走模型化微调（动力学侧），三者构成 sim-to-real 的"加一条 / 监一条 / 想一条"完整工具链 |

---

## 🎤 面试参考

**Q：为什么 SAC 在大规模并行上以前打不过 PPO？LIFT 做了什么改变？**
A：传统 SAC 默认实现 batch 不够大、UTD 不够高，无法吃满 GPU 并行采样带来的 throughput，所以 PPO 主导了大规模仿真预训练。LIFT 把 SAC 整套用 JAX 重写并 jit，**用数万级 batch + 高 UTD**，让 critic / actor 都在 GPU 上密集更新；同时 LayerNorm 等稳定化技巧避免大批量带来的方差爆炸。结果就是在 wall-clock 上追平甚至超越 PPO。

**Q：物理先验世界模型为什么用 Lagrangian + 残差，而不是直接神经网络？**
A：人形机器人主体动力学**大部分可解析**（刚体连接 + 关节约束），剩下的接触、摩擦、电机非线性才是真正难建模的部分。把已知物理写进模型（Lagrangian）能极大缩小神经网络需要学的复杂度，残差网络只学"差"，**外推更稳、long-horizon rollout 漂移更小**——这对 Dyna 风格的策略 imagine rollout 非常关键。纯神经网络做世界模型一旦 rollout 长就发散。

**Q："实环境确定性 + 模型内随机"为什么是好 trade-off？**
A：实机随机探索会摔机器人——人形硬件昂贵，单次故障代价远大于一次仿真失败。LIFT 让真实环境只跑确定性动作收集 nominal 数据，**所有 SAC 需要的探索熵全在世界模型里**生成。这样既保住了 off-policy 的探索覆盖（熵正则、Q 更新仍然有效），又把物理风险降到最低。代价是世界模型若不准会偏差累积——所以才需要前一段的 Lagrangian + 残差结构。

**Q：跟 RMA / MOSAIC 这类残差适配相比，LIFT 强在哪？**
A：RMA / MOSAIC 都是**动作 / 编码层面的实时残差**，本质上仍在原策略基础上"打补丁"；LIFT 走的是**全策略 + 全 critic 微调路线**，能适应更大的环境差异（包括新机型、新任务）。代价是要训世界模型，但通过 Lagrangian 先验降低了这个成本。两条路线互补：RMA/MOSAIC 适合"参数级残差"，LIFT 适合"任务级 / 机型级迁移"。

**Q：4090 上 1 小时微调全身策略，怎么做到的？**
A：三件事乘起来：(1) JAX 全栈 jit 编译，CPU-GPU 几乎零数据搬运；(2) 世界模型 rollout 比真实仿真便宜得多，且 Lagrangian 结构让 rollout 稳定，可以做长 horizon；(3) 预训练 \(\pi_0\) 已经是个"很好"的起点，微调只需要少量真实数据 + 模型 rollout 修补差异。这也是为什么 LIFT 命名直击"pretraining + finetuning"——它把传统 RL 单阶段的"从头训练几小时到几天"压成了两阶段的"预训练一次 + 频繁微调一小时"。

---

## 🔗 相关阅读

- [RAPT: Model-Predictive OOD Detection & Failure Diagnosis (2602.01515)](https://arxiv.org/abs/2602.01515)：sim-to-real 监控视角的并行方法，本仓库已有笔记
- [RMA: Rapid Motor Adaptation for Legged Robots (2107.04034)](https://arxiv.org/abs/2107.04034)：残差适配奠基，本仓库已有笔记
- [MOSAIC: Bridging the Sim-to-Real Gap via Rapid Residual Adaptation (2602.08594)](https://arxiv.org/abs/2602.08594)：残差适配 + 通用 motion tracking
- [PolySim: Multi-Simulator Dynamics Randomization (2510.01708)](https://arxiv.org/abs/2510.01708)：仿真侧扩 DR 的并行工作
- [MuJoCo Playground (2502.08844)](https://arxiv.org/abs/2502.08844)：本文的训练基础设施，JAX + MJX 大规模并行框架
- [FastTD3](https://huggingface.co/papers)：本文对比的另一条大规模 off-policy 基线
- [ASAP: Aligning Simulation and Real-World Physics (2502.01143)](https://arxiv.org/abs/2502.01143)：sim-real 物理对齐的另一种思路，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要 + 项目主页 + 官方 GitHub README + 公开搜索结果整理。具体网络架构细节（actor/critic 隐藏维度、世界模型残差网络深度、Dyna rollout 长度等）以及与 FastTD3、PPO 的精确数值对比，待 ICLR 2026 camera-ready PDF 完整释出后补充。
