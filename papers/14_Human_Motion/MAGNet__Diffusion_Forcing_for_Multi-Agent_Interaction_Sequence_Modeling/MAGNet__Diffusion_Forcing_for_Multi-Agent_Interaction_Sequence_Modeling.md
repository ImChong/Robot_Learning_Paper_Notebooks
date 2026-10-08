---
layout: paper
paper_order: 5
title: "MAGNet: Diffusion Forcing for Multi-Agent Interaction Sequence Modeling"
zhname: "MAGNet：用扩散强制把多人长时序交互装进一个自回归生成模型"
category: "人体动作生成"
---

# MAGNet: Diffusion Forcing for Multi-Agent Interaction Sequence Modeling
**MAGNet：用扩散强制把多人长时序交互装进一个自回归生成模型**

> 📅 阅读日期: 2026-06-01
>
> 🏷️ 板块: 14 Human Motion · 多人交互生成 / 自回归扩散 / Diffusion Forcing
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月（v1）· 2026 年 3 月（v2 修订）（arXiv） |
| arXiv | [2512.17900](https://arxiv.org/abs/2512.17900) |
| HTML | [arxiv.org/html/2512.17900v2](https://arxiv.org/html/2512.17900v2) |
| PDF | [arxiv.org/pdf/2512.17900](https://arxiv.org/pdf/2512.17900) |
| 项目页 | [Berkeley · MAGNet 项目页](https://people.eecs.berkeley.edu/~vongani_maluleke/blogs/blog-magnet.html) |
| 代码 | [Von31/MAGNet-code](https://github.com/Von31/MAGNet-code)（✅ 已开源 · 训练/推理代码 + Google Drive 预训练 checkpoint，对应 v2 2026-03-26） |
| 作者 | Vongani H. Maluleke, K. Horiuchi, L. Wilken, Evonne Ng, Jitendra Malik, Angjoo Kanazawa |
| 机构 | UC Berkeley · Sony Group Corporation · Meta |

> 来源：YanjieZe/awesome-humanoid-robot-learning · 14 Human Motion Analysis and Synthesis 第 479 项。

---

## 🎯 一句话总结

> 把 **Diffusion Forcing**（每个 token 独立加噪/独立去噪的自回归扩散）从单序列搬到**多人交互**——把每个人的姿态先用 VQ-VAE 压成 token，再把所有人的 token **交错喂给同一个 Transformer**，训练时每个 token 独立采噪声、推理时按需控制每个人/每个时刻的噪声等级，从而**一个模型**同时支持双人/三人/N 人预测、Partner Inpainting、Partner Prediction、超长动作生成等任务。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| DFOT | Diffusion Forcing Transformer，本文核心架构 |
| Diffusion Forcing | 训练时给序列里每个 token **独立**抽噪声等级的扩散范式（Chen et al. 2024） |
| Dyadic / Polyadic | 双人 / 多人（≥3 人）交互 |
| VQ-VAE | 向量量化变分自编码器，本文用来把单人姿态压成离散 token |
| Partner Inpainting | 给定其他人完整动作，补出某个人的动作 |
| Partner Prediction | 给定一人的动作，预测另一人的反应 |
| Inter-X / InterHuman / DD100 / DuoBox / Embody3D | 本文用到的双人/多人动作数据集 |

---

## ❓ 论文要解决什么问题？

多人交互运动生成有三个老大难：

1. **时序长**：跳舞、拳击、社交对话动辄上百帧，扩散模型一旦一次生成一整段，**长序列采样很慢**，而且训练 GT 长度有上限；
2. **强耦合**：两人/三人动作互相依赖（推手→对方退步、伸手→对方挡），独立生成各自的动作很容易"动作打架"；
3. **任务多 + 群组规模可变**：每来一个新任务（partner inpainting / partner prediction / joint generation / motion control / in-betweening / turn-taking）就重新训练一个模型，难以泛化到 N 人。

现有路线要么 **专门搞 dyadic**（只两人）、要么 **一次预测固定长度**、要么 **每个任务一个模型**。MAGNet 想要的是 **「一个模型 × 任意人数 × 多种任务 × 超长序列」**。

---

## 🔧 方法详解 —— 用 Diffusion Forcing 把多智能体序列「token 交错」起来

### 核心想法

把 [Diffusion Forcing](https://arxiv.org/abs/2407.01392)（每个 token 独立加噪 / 独立去噪的"自回归 + 扩散"杂交体）从单序列推广到 **多智能体序列**：

- 把每个人的姿态先用 **VQ-VAE 编码成 latent token 序列**；
- 多个人的 token 在时间轴上 **交错排列**（agent A 的 t、agent B 的 t、agent C 的 t、agent A 的 t+1、…）；
- 训练时给每个 token **独立采一个噪声等级**，让 Transformer 同时学会「不同人/不同时刻的不同条件 → 同一段干净 token」；
- 推理时通过 **噪声 schedule 的设计** 决定要做哪种任务：把某人保持 σ=0（条件）、另一人从 σ_max 去噪（生成）、或者所有人都同步去噪。

### 两阶段架构

| 阶段 | 模块 | 训练目标 |
|---|---|---|
| Stage 1 | **Pose VQ-VAE** | 把单人姿态序列编码为离散 codebook token（latent pose token） |
| Stage 2 | **DFOT（Diffusion Forcing Transformer）** | 在多人交错 token 序列上做 **每 token 独立加噪 → 去噪** 训练 |

### Diffusion Forcing 在多人上的妙处

| 任务 | 噪声 schedule（推理时） |
|---|---|
| **Joint Generation**（无条件生成 N 人动作） | 所有 token 同时从 σ_max → 0 |
| **Partner Inpainting**（给定 A 完整动作，补 B） | A 的 token σ=0，B 的 token σ_max → 0 |
| **Partner Prediction**（给 A 过去 + B 过去，预测 B 未来） | 历史 token σ=0，未来 token 滑窗去噪 |
| **In-betweening**（首末固定，补中间） | 首末关键帧 σ=0，中间 σ_max → 0 |
| **Turn-taking / Motion Control** | 在任意 token 上注入条件即可 |
| **超长序列**（≫训练长度） | 把已生成的 token 当作条件，**滑窗自回归** 续写 |

> 也就是说，**训练只跑一次**，推理时通过「对哪些 token 设 σ=0、对哪些做去噪」就能实现各种任务，不用为每个任务单独训练。

### 训练数据集（全部多人）

- **Inter-X**：丰富的双人交互（拥抱、握手、对打、舞蹈片段）
- **InterHuman / DD100 / DuoBox**：双人 / 双人格斗、双人舞蹈
- **Embody3D**：duo / trio / quad 变体，让模型见到 ≥3 人交互
- 训练参数：batch size 256，约 300k steps（PyTorch + W&B + TensorBoard，Conda Python 3.12）

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["🧍 多人姿态序列"]
        A1["Agent A 姿态序列"]
        A2["Agent B 姿态序列"]
        A3["Agent C 姿态序列 …"]
    end

    subgraph VQ["📦 Stage 1: Pose VQ-VAE"]
        VQ1["共享 codebook<br/>(单人姿态 → 离散 token)"]
        A1 --> VQ1
        A2 --> VQ1
        A3 --> VQ1
    end

    subgraph TOK["🔀 时间轴交错 token 序列"]
        T1["A_t #124; B_t #124; C_t #124; A_{t+1} #124; B_{t+1} #124; C_{t+1} #124; …"]
        VQ1 --> T1
    end

    subgraph DF["🌀 Stage 2: Diffusion Forcing Transformer (DFOT)"]
        DF1["每个 token 独立采噪声等级 σ_i"]
        DF2["Transformer 同时去噪所有 token<br/>(显式建模 agent 间耦合)"]
        T1 --> DF1
        DF1 --> DF2
    end

    subgraph TASK["🎛 推理：噪声 schedule 决定任务"]
        K1["Joint Generation<br/>(所有 σ → 0)"]
        K2["Partner Inpainting<br/>(A: σ=0, B: σ_max→0)"]
        K3["Partner Prediction<br/>(历史 σ=0, 未来去噪)"]
        K4["In-betweening<br/>(首末 σ=0)"]
        K5["超长序列<br/>(滑窗自回归)"]
    end

    DF2 --> K1
    DF2 --> K2
    DF2 --> K3
    DF2 --> K4
    DF2 --> K5

    K1 --> OUT["🎬 多人协调动作<br/>(dyadic / polyadic, 数百帧)"]
    K2 --> OUT
    K3 --> OUT
    K4 --> OUT
    K5 --> OUT

    style IN fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style VQ fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style TOK fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style DF fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style TASK fill:#fff8dc,stroke:#b8860b,color:#5b3a00
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **首次把 Diffusion Forcing 扩展到多智能体序列**：训练时每 token 独立加噪 + 多 agent token 交错排列，让模型显式学到 agent 间的耦合；
2. **单模型多任务**：joint generation / partner inpainting / partner prediction / motion control / in-betweening / turn-taking 仅靠**调噪声 schedule** 就能切换，不再一任务一模型；
3. **从 dyadic 自然扩展到 polyadic**：通过 Embody3D 的 trio / quad 数据，在 2 人/3 人/4 人交互上都保持协调；
4. **超长序列**：滑窗自回归把"已生成 token"当条件，可以**远超训练长度**（论文展示数百时间步连续生成）；
5. **代码 + checkpoint 已开源**（[Von31/MAGNet-code](https://github.com/Von31/MAGNet-code)，含两阶段训练/推理代码 + 各数据集的 Google Drive 预训练权重，详见下方「源码解读」）。

---

## 📊 与相关工作的关系

| 方法 | 一次几人 | 任务通用性 | 长序列 | 自回归？ |
|---|---|---|---|---|
| InterGen / InterDiff | 2 人 | ❌ 一任务一模型 | ❌ 固定长 | ❌ |
| RIG / in2IN | 2 人 | ❌ | ❌ | ❌ |
| **MAGNet（本文）** | **2 / 3 / 4+ 人** | **✅ 单模型多任务** | **✅ 滑窗** | **✅ Diffusion Forcing** |
| Diffusion Forcing（原版，Chen 2024） | 单序列 | ✅ | ✅ | ✅ |

> MAGNet 的核心创新点其实是 **「把单序列的 Diffusion Forcing 推广到多人多 agent 场景，并通过 token 交错让 Transformer 显式建模 agent 耦合」**——这一推广同时解锁了"多任务通用 + 群组规模可变 + 超长序列"。

---

## 🤖 对人形机器人学习的启发

虽然 MAGNet 本身是「人体动作生成」工作，但对人形机器人有几个清晰的下游价值：

- **双人/多人交互数据生成器**：人-人交互、机器人-人交互的数据非常稀缺。MAGNet 可以批量合成"对打 / 共抬 / 牵手 / 跟舞"等双 agent 数据，给 HumanX / GentleHumanoid / Collaborative Carrying 等工作提供训练样本；
- **机器人陪练（partner）模型**：把"机器人"当一个 agent、"人"当另一个 agent，Partner Prediction 就是"预测人对机器人某个动作的反应"——这是 RoboStriker（拳击）、Humanoid Goalkeeper、Badminton 等对抗 / 配合类工作的天然先验；
- **协调性约束**：Diffusion Forcing 的每 token 独立去噪保证了 agent 间的"接触/对齐/节奏"耦合不会被破坏，对人形机器人**双人协作搬运 / 接力 / 同步动作**任务有直接借鉴；
- **超长动作脚本**：BeyondMimic / SONIC / GMT 这类全身动作跟踪非常需要"高质量的长动作脚本"，MAGNet 的滑窗自回归可以提供数百帧、保持双方一致的参考动作。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.17900](https://arxiv.org/abs/2512.17900) | 论文正文（v1 2025-12-19 · v2 2026-03-26） |
| [arXiv HTML](https://arxiv.org/html/2512.17900v2) | 在线阅读 v2 |
| [PDF](https://arxiv.org/pdf/2512.17900) | PDF 直链 |
| [Berkeley 项目页](https://people.eecs.berkeley.edu/~vongani_maluleke/blogs/blog-magnet.html) | demo 视频、概述 |
| [Von31/MAGNet-code](https://github.com/Von31/MAGNet-code) | 训练代码（VQ-VAE + DFOT）+ 预训练 checkpoint（Google Drive） |
| 训练数据 | [Inter-X](https://liangxuy.github.io/inter-x/) · InterHuman · DD100 · DuoBox · [Embody3D](https://github.com/facebookresearch/embody3d)（Meta） |

---

## 🎤 面试参考

**Q：Diffusion Forcing 和普通 Diffusion / Autoregressive 有什么本质区别？**
A：普通 diffusion 一整段同噪声等级；普通 autoregressive 一次一个 token、看上文。Diffusion Forcing 把它们融合：每个 token **独立**采一个噪声等级，训练时模型同时见到「上文清晰 + 下文模糊」「中间清晰 + 两端模糊」等各种 mask 模式。这让同一个权重在推理时能自由切换 generation / inpainting / prediction / 滑窗续写——本文的「多任务通用」性正是来源于此。

**Q：为什么要 token 交错（A_t, B_t, A_{t+1}, B_{t+1}, …），而不是 [A 整段, B 整段]？**
A：交错让 Transformer 的注意力**同一时间窗里**既能看到自己人，又能看到对手——这正是多人交互"我看着你才能决定我下一步"的关键。如果整段串接，agent 间的耦合就被推到长程依赖里，模型很难学。

**Q：超长序列怎么不爆炸？**
A：滑窗自回归——把最近 K 帧的 token 当作 σ=0 的条件，下一窗只对新增 token 去噪，旧 token 直接复用。和 Diffusion Forcing 的"每 token 独立 σ"完美契合，等价于"无限上下文 + 每步增量去噪"。

**Q：和 InterDiff / InterGen 这类双人扩散相比，主要差距在哪？**
A：InterDiff / InterGen 是**一次性扩散整段双人序列**，做不了 inpainting / prediction / 续写，群组也固定为 2 人。MAGNet 把"哪些 token 该被生成、哪些当条件"做成 σ schedule 的事，所以**单模型** = 多任务 + 任意人数 + 任意长度。

---

## 🔬 源码解读

> 官方代码已开源：[Von31/MAGNet-code](https://github.com/Von31/MAGNet-code)（Conda + PyTorch，Python 3.12 / Linux / NVIDIA GPU）。仓库严格对应正文的**两阶段**设计——Stage 1 训练 Pose VQ-VAE，Stage 2 在交错 token 序列上训练 DFOT（Diffusion Forcing Transformer）；并把论文里"靠噪声 schedule 切换任务"的核心思想落成了**一套配置 + 多个推理脚本**。

**目录结构**

| 路径 | 内容 |
|---|---|
| `libs/model/vqvae/` | Pose VQ-VAE 模型（单人姿态 → 离散 token，对应 Stage 1） |
| `libs/model/dfot/` | Diffusion Forcing Transformer 架构（多人交错 token 去噪，对应 Stage 2） |
| `libs/train/vqvae_train.py` · `libs/train/dfot_train.py` | 两阶段训练入口 |
| `libs/inference/vqvae_inference.py` · `libs/inference/dfot_inference.py` | 两阶段推理入口 |
| `libs/utils/eval.py` | 评测指标（FID/多样性、关节位置/速度误差、人间相关性、滑步、穿模等） |
| `configs/train/...` | 各数据集训练配置（如 `vqvae/dd100.yaml`） |
| `scripts/` | `download_data_checkpoint.sh`（拉数据+权重）、`run_*_train.sh`、`run_dfot_inference.sh`、`run_visualizer.sh` |
| `demo_inference.ipynb` | 交互式推理 demo |

**复现路径（最小命令）**

```bash
git clone https://github.com/Von31/MAGNet-code.git && cd MAGNet-code
conda env create -f environment.yml && conda activate mc
bash scripts/download_data_checkpoint.sh          # 预处理数据 + VQ-VAE/DFOT 预训练权重
bash scripts/run_vqvae_train.sh  [GPU] configs/train/vqvae/dd100.yaml   # Stage 1
bash scripts/run_dfot_train.sh   [GPU] <dfot_cfg>                       # Stage 2（需在 cfg 填好 vqvae_model_path）
bash scripts/run_dfot_inference.sh <cfg>                                # 推理：靠 cfg 选任务
python -m libs.utils.eval --data_dir <out> --fps 30 --sample_num 10     # 评测
bash scripts/run_visualizer.sh <out>                                    # Viser 浏览器端 3D 可视化
```

**实现要点（与正文对照）**

- **两阶段解耦落地清晰**：`libs/model/vqvae`（Stage 1 离散化）与 `libs/model/dfot`（Stage 2 扩散去噪）各自独立，Stage 2 的配置里通过 `vqvae_model_path` 显式挂载已训练好的 codebook——正是正文"先把单人姿态压成 token，再在 token 上做 Diffusion Forcing"的工程映射。
- **"一个模型多任务"靠 cfg 实现**：仓库不为每个任务单独训模型，而是用同一份 DFOT 权重 + 不同推理配置覆盖 **joint generation / partner prediction / partner inpainting / inbetweening / motion control / agentic turn-taking**——这与正文"任务 = 不同噪声 schedule"的设计完全一致，验证了核心卖点不是纸面声明。
- **训练超参可核对**：脚本默认 batch size 至多 256、学习率 2e-4、最多 ~300k steps，与笔记前文记录的训练规模吻合；推理支持可变序列长度、自回归/整段去噪两种 schedule，以及 classifier-free guidance。
- **权重与许可边界**：VQ-VAE 与 DFOT 在 DD100 / DuoBox / Embody3D（duo/trio/quad）/ Inter-X 上均提供 checkpoint（Google Drive，`download_data_checkpoint.sh` 可自动拉取）；README 注明**部分数据集因许可不允许再分发**而被省略，复现这些 split 需自行向原数据集申请——这是把它当作"人形交互数据生成器"前需要注意的合规点。

---

## 🔗 相关阅读

- **基石方法**：[Diffusion Forcing（Chen et al., NeurIPS 2024）](https://arxiv.org/abs/2407.01392)——单序列每 token 独立加噪的扩散自回归杂交体，本文的"母版"；
- **双人扩散先驱**：[InterDiff（ICCV 2023）](https://arxiv.org/abs/2308.16905) · [InterGen（IJCV 2024）](https://tr3e.github.io/intergen-page/)；
- **多人多 agent 数据**：[Inter-X](https://liangxuy.github.io/inter-x/) · [Embody3D](https://github.com/facebookresearch/embody3d)（Meta）；
- **人形机器人下游可衔接**：HumanX（人形交互技能）、Collaborative Object Carrying、GentleHumanoid、RoboStriker（人-人拳击 / 对抗）；
- **同模块前作**：[EmbodMocap](../EmbodMocap__In-the-Wild_4D_Human-Scene_Reconstruction_for_Embodied_Agents/EmbodMocap__In-the-Wild_4D_Human-Scene_Reconstruction_for_Embodied_Agents.html) · [WHOLE](../WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos/WHOLE__World-Grounded_Hand-Object_Lifted_from_Egocentric_Videos.html) · [Learned Motion Matching](../Learned_Motion_Matching/Learned_Motion_Matching.html)。
