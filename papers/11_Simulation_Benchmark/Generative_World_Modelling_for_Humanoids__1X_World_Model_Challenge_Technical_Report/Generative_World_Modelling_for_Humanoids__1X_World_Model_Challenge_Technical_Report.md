---
layout: paper
paper_order: 6
title: "Generative World Modelling for Humanoids: 1X World Model Challenge Technical Report"
zhname: "人形机器人生成式世界建模：1X 世界模型挑战赛技术报告"
category: "Simulation Benchmark"
---

# Generative World Modelling for Humanoids: 1X World Model Challenge Technical Report

**人形机器人生成式世界建模：1X 世界模型挑战赛技术报告**

> 📅 阅读日期: 2026-06-09
>
> 🏷️ 板块: 11 Simulation Benchmark · 世界模型 / 视频预测 / 离散 token 压缩 / 人形机器人基准
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2510.07092](https://arxiv.org/abs/2510.07092) |
| HTML | [在线阅读 v1](https://arxiv.org/html/2510.07092v1) |
| PDF | [下载](https://arxiv.org/pdf/2510.07092) |
| **发布时间** | 2025-10-08 (arXiv) |
| 挑战赛 / 源码 | [1x-technologies/1xgpt](https://github.com/1x-technologies/1xgpt) |
| 数据集 | [HuggingFace · 1x-technologies/worldmodel](https://huggingface.co/datasets/1x-technologies/worldmodel)（Apache 2.0） |
| 提交日期 | 2025-10-08 |

**作者团队**：**Team Revontuli**（Riccardo Mereu, Aidan Scannell, Yuxin Hou, Yi Zhao, Aditya Jitta, Antonio Dominguez, Luigi Acerbi, Amos Storkey, Paul Chang），主要来自赫尔辛基大学 / 爱丁堡大学 / Aalto 等北欧研究机构（"Revontuli" 芬兰语意为"极光"）。
**挑战赛主办方**：**1X Technologies**（EVE 人形机器人）。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| World Model | 世界模型 | 学习一个能从历史观测/动作预测未来观测的"可学习模拟器" |
| PSNR | Peak Signal-to-Noise Ratio | 峰值信噪比，衡量预测帧与真值帧的像素级保真度（越大越好） |
| CE | Cross-Entropy | 交叉熵，衡量 token 分布预测准确度（越小越好） |
| AdaLN-Zero | Adaptive LayerNorm (Zero-init) | 用条件信号调制 LayerNorm 的缩放/偏置，零初始化保证训练稳定（源自 DiT） |
| LoRA | Low-Rank Adaptation | 低秩适配，仅微调少量增量参数即可适配大模型 |
| MAGVIT2 | Masked Generative Video Transformer 2 | 把图像/视频离散化成 token 的视觉 tokenizer |
| TI2V | Text-Image-to-Video | 文本+图像到视频的生成范式（Wan-2.2 的一种配置） |

---

## ❓ 挑战赛要解决什么问题？

人形机器人要在真实世界里做规划与控制，一个核心瓶颈是缺少**便宜、可微、贴近真机的"模拟器"**。1X World Model Challenge 的思路是：**与其手工搭物理引擎，不如直接从海量真机第一视角数据里"学"一个世界模型**——给定一段历史观测（和动作），预测接下来会看到什么。

为了让"世界模型"这个开放问题变得可比、可竞赛，1X 把它拆成两条互补赛道：

1. **采样赛道（Sampling）**：直接**预测未来的图像帧**，允许任意生成范式（GAN / 扩散 / MaskGIT / 自回归等），用图像保真度（PSNR）评价；
2. **压缩赛道（Compression）**：预测未来帧的**离散 latent token 分布**，本质是"对未来的概率建模有多准"，用交叉熵评价（temporally teacher-forced，即给定此前所有真值帧再预测当前帧）。

这套基准的价值在于：**第一次把"为人形机器人学世界模型"这件事放在统一的真机数据 + 统一指标 + 公开 baseline 之上**。

---

## 🔧 数据集与方法

### 1. 数据集（EVE 第一视角）

| 维度 | 内容 |
|---|---|
| 来源 | 1X **EVE** 人形机器人在 1X 办公室真实作业 |
| 规模 | **100+ 小时**第一视角交互数据 |
| 序列 | 每条样本 **16 帧 @ 2Hz**（共 8 秒） |
| 表示 | 图像经 **MAGVIT2** tokenizer 切成 **16×16 patch**，每 patch 取值空间高达 **2¹⁸** |
| 内容 | 人类环境中多样化的第一视角操作场景 |
| 许可 | **Apache 2.0**（商用/学术皆可，需署名）|

> 💡 为了内存可行，token 分布被**因子化**为 `p(x₁,x₂)=p(x₁)·p(x₂)`，即把 2¹⁸ 类预测拆成两个 2⁹ 类预测——这也是压缩赛道交叉熵的计算基础。

### 2. 官方 Baseline（GENIE）

| 模型 | 交叉熵 | LPIPS |
|---|---|---|
| GENIE_138M | 8.79 | 0.207 |
| GENIE_35M | 8.99 | 0.217 |

> 压缩赛道的入门门槛被定为"teacher-forced 损失 < 8.0"，即要明显超过官方 GENIE baseline。

### 3. Team Revontuli 的两套方案

**采样赛道：复用视频生成大模型 + 状态条件 + LoRA 微调**

- 以视频生成基础模型 **Wan-2.2 TI2V-5B** 为骨干，把它从"文本/图像生成视频"改造成 **"视频 + 机器人状态条件下的未来帧预测"**；
- 用 **AdaLN-Zero** 把**机器人状态（动作/本体信息）**注入生成网络——零初始化让附加条件以"温和"的方式接入，不破坏预训练知识；
- 再用 **LoRA** 做轻量 post-training，在真机数据上适配，而不全量重训这个 5B 大模型；
- **结果：23.0 dB PSNR，采样赛道第 1 名。**

**压缩赛道：从零训练时空 Transformer**

- 不复用大模型，而是**从头训练一个 Spatio-Temporal Transformer**，对未来帧的离散 token 分布做自回归概率建模；
- **结果：Top-500 CE = 6.6386，压缩赛道第 1 名。**

> 一个有意思的对照：采样赛道"借力"通用视频生成大模型（迁移先验最划算），压缩赛道则"自建"专用时空模型（更贴合 token 概率建模目标）——**两条赛道的最优解法并不相同**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 1X World Model 数据集"]
        D1["EVE 第一视角<br/>100+ 小时"]
        D2["16 帧 @ 2Hz (8s)"]
        D3["MAGVIT2 → 16×16 patch<br/>token 空间 2^18"]
    end

    DATA --> SPLIT{"两条赛道"}

    subgraph SAMP["🎬 采样赛道 (Sampling)"]
        SA1["骨干: Wan-2.2 TI2V-5B<br/>(视频生成大模型)"]
        SA2["AdaLN-Zero<br/>注入机器人状态条件"]
        SA3["LoRA 轻量 post-training"]
        SA4["预测未来图像帧"]
        SA1 --> SA2 --> SA3 --> SA4
    end

    subgraph COMP["🧮 压缩赛道 (Compression)"]
        CO1["从零训练<br/>时空 Transformer"]
        CO2["因子化 token 分布<br/>p(x1,x2)=p(x1)p(x2)"]
        CO3["预测未来 token 概率"]
        CO1 --> CO2 --> CO3
    end

    SPLIT --> SAMP
    SPLIT --> COMP

    SAMP --> RS["📈 23.0 dB PSNR<br/>🥇 采样第 1"]
    COMP --> RC["📈 Top-500 CE 6.6386<br/>🥇 压缩第 1"]

    BASE["官方 baseline: GENIE_138M / 35M<br/>(CE 8.79 / 8.99)"]
    COMP -.对照.-> BASE

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style SAMP fill:#fde8e8,stroke:#c0392b
    style COMP fill:#e8fbe8,stroke:#27ae60
    style RS fill:#fff7e0,stroke:#d4a017
    style RC fill:#fff7e0,stroke:#d4a017
    style BASE fill:#f3e8ff,stroke:#8e44ad
</div>

---

## 💡 核心贡献与要点

1. **基准本身**：1X 把"为人形学世界模型"做成可竞赛、可复现的开放基准（真机 EVE 数据 + 采样/压缩双赛道 + 官方 baseline + Apache 2.0 数据），是该方向少有的统一标尺。
2. **采样赛道的关键洞见**：**通用视频生成大模型可以高效迁移到机器人帧预测**——通过 AdaLN-Zero 注入机器人状态 + LoRA 微调，无需全量重训 5B 模型即可拿下第一（23.0 dB PSNR）。
3. **压缩赛道的关键洞见**：**离散 token 的概率建模更适合"专用、从零训练"的时空 Transformer**，而非直接复用图像生成大模型（Top-500 CE 6.6386）。
4. **方法论对照**：同一份数据、不同评价目标，**最优建模范式可以完全不同**——这对"用一个世界模型同时服务规划与控制"的设计是重要提醒。
5. **工程可复现性**：方案大量复用现成组件（Wan-2.2 / AdaLN-Zero / LoRA / MAGVIT2 token），落地与复现门槛低。

---

## 🤖 对人形 / 具身 AI 领域的意义

| 方向 | 含义 |
|---|---|
| **可学习模拟器** | 世界模型作为"从真机数据学出来的模拟器"，是 model-based RL / MPC 规划的潜在底座 |
| **数据驱动 sim** | 与传统物理引擎（10/11 模块的 Isaac/MuJoCo/Genesis 等）互补：物理引擎给可控性，世界模型给真机分布保真度 |
| **视频大模型迁移** | 验证了"通用视频生成基础模型 + 轻量条件/LoRA"是把大模型先验注入机器人预测的高性价比路线 |
| **统一基准** | 采样/压缩双指标为后续世界模型工作提供了可比标尺，降低"各说各话"的评测乱象 |
| **离散 vs 连续表示** | 两赛道结果提示：图像保真度任务偏好像素级生成，概率/压缩任务偏好离散 token 建模 |

---

## 🎤 面试参考

**Q：为什么 1X World Model Challenge 要分"采样"和"压缩"两条赛道？**
A：两者评价的是世界模型的不同侧面。**采样赛道**关心"生成的未来帧像不像真的"（PSNR，像素级保真度），允许任意生成范式；**压缩赛道**关心"对未来的概率分布建得准不准"（teacher-forced 交叉熵），更接近 model-based 规划里"对未来不确定性的量化"。一个好的世界模型理论上两者都要强，但本次结果表明两条赛道的最优建模范式并不相同。

**Q：Team Revontuli 在采样赛道为什么选择复用 Wan-2.2 而不是从零训？**
A：视频生成基础模型已经在海量视频上学到了强时空先验，直接从零训一个机器人帧预测器既费数据又费算力。他们用 **AdaLN-Zero** 把机器人状态作为条件温和注入（零初始化避免一上来就破坏预训练分布），再用 **LoRA** 做低秩微调——只动很少参数就把通用视频先验"对齐"到 EVE 第一视角分布，这是性价比最高的迁移路线，最终 23.0 dB PSNR 拿下第一。

**Q：压缩赛道为什么反而从零训练时空 Transformer？**
A：压缩赛道的目标是对**离散 token 分布**做精确概率建模（交叉熵），而图像生成大模型的优势在像素级生成，并不天然对齐"token 概率"这个目标；token 空间还被因子化成两个 2⁹ 类预测。专门为这个目标从零训练一个时空 Transformer，结构与损失更匹配，最终 Top-500 CE 6.6386 超过官方 GENIE baseline（8.79）拿下第一。

**Q：世界模型和传统物理仿真器（Isaac/MuJoCo/Genesis）是什么关系？**
A：互补。物理引擎可控、可重置、参数可调，但需要手工建模且有 sim-to-real gap；学习型世界模型直接从真机数据拟合，**分布上更贴近真机**，且可微、便于做 model-based 规划，但可控性/长程稳定性较弱、可能产生不符合物理的幻觉。实际系统里两者常结合：物理引擎做大规模 RL 训练，世界模型做贴近真机的短程预测与规划。

---

## 🔗 相关阅读

- [1X World Model Challenge / 1xgpt 仓库](https://github.com/1x-technologies/1xgpt)：官方挑战赛代码、baseline 与数据加载
- [HuggingFace · 1x-technologies/worldmodel](https://huggingface.co/datasets/1x-technologies/worldmodel)：EVE 第一视角数据集
- [Genie (DeepMind, 2024)](https://arxiv.org/abs/2402.15391)：官方 baseline GENIE 的来源，交互式生成世界模型
- [Wan-2.2 视频生成模型](https://github.com/Wan-Video/Wan2.2)：采样赛道的骨干基础模型
- [DiT / AdaLN-Zero (arXiv 2212.09748)](https://arxiv.org/abs/2212.09748)：AdaLN-Zero 条件注入的来源
- [LoRA (arXiv 2106.09685)](https://arxiv.org/abs/2106.09685)：低秩适配微调
- [MolmoSpaces (arXiv 2602.11337)](https://arxiv.org/abs/2602.11337)：本仓库已有笔记，大规模室内仿真生态（物理引擎路线）
- [HumanoidBench (arXiv 2403.10506)](https://arxiv.org/abs/2403.10506)：本仓库已有笔记，人形全身控制基准

---

> 备注：本笔记基于 arXiv 摘要、1X 官方挑战赛仓库说明、HuggingFace 数据卡与公开技术报道整理。Team Revontuli 在两条赛道上的具体网络结构超参、LoRA rank / 训练细节、各帧 PSNR/CE 的逐步曲线，以及与其他参赛队伍的横向对比等细节，待完整阅读正式 PDF 后回填。
