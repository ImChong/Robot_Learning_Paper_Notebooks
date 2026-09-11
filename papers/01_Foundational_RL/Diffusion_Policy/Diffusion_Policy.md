---
layout: paper
paper_order: 10
title: "Diffusion Policy: Visuomotor Policy Learning via Action Diffusion"
category: "基础强化学习"
zhname: "Diffusion Policy：基于动作扩散的视觉运动策略学习"
demos: ["diffusion_policy"]
---

# Diffusion Policy: Visuomotor Policy Learning via Action Diffusion
**Diffusion Policy：基于动作扩散的视觉运动策略学习**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 扩散+控制主线起点
>
> 🚧 本笔记已填充基本信息，深度技术细节待细化。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2303.04137](https://arxiv.org/abs/2303.04137) |
| **PDF** | [Download](https://arxiv.org/pdf/2303.04137.pdf) |
| **作者** | Cheng Chi, Siyuan Feng, Yilun Du, Zhenjia Xu, Eric Cousineau, Benjamin Burchfiel, Shuran Song |
| **机构** | Columbia / MIT / Toyota Research Institute |
| **发布时间** | 2023-03 (arXiv), RSS 2023 |
| **项目主页** | [Diffusion Policy Website](https://diffusion-policy.cs.columbia.edu/) |
| **代码** | [GitHub - columbia-ai-robotics/diffusion_policy](https://github.com/columbia-ai-robotics/diffusion_policy) |

---

## 🎯 一句话总结

> Diffusion Policy 将机器人策略表示为条件去噪扩散过程，将动作生成从"单步回归"升级为"多步轨迹生成"，从而完美处理模仿学习中的多模态分布挑战。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| DDPM | Denoising Diffusion Probabilistic Model | 去噪扩散概率模型 |
| DDIM | Denoising Diffusion Implicit Model | 非马尔可夫采样的加速版本，大幅减少推理步数 |
| FiLM | Feature-wise Linear Modulation | 用于视觉特征与扩散噪声融合的调制机制 |
| RHC | Receding Horizon Control | 后退水平控制：预测序列，仅执行前段，滚动规划 |

---

## ❓ Diffusion Policy 要解决什么问题？

- **多模态挑战 (Multimodality)**：传统 BC（Behavior Cloning）使用 MLP 直接回归动作，在遇到人类演示中有多种解法时（例如从左绕开或从右绕开障碍），会因均方误差（MSE）损失而产生"平均动作"，导致机器人撞上障碍。
- **高维连续空间建模**：传统方案如 GMM 或 VAE 在高维复杂动作序列上的表现力不足。
- **训练稳定性**：相比于 GAN 或 EBM（能量模型），扩散模型的训练过程更加稳定且可扩展。

「平均动作会撞上障碍」这句话值得亲眼看一次。下面这个实验台里，人类演示一半从上绕、一半从下绕——MSE 回归给出的是两峰的**均值**，正好是障碍所在的位置；扩散策略采的是分布，每次落在某一侧：

<div class="paper-demo" data-demo="dp-multimodal"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🔧 方法详解

1. **Action Chunking**：不再预测单步动作，而是预测一个长度为 $H$ 的动作序列。
2. **Conditional Denoising**：
   - 输入：当前视觉观测 $O$（ResNet/ViT 提取）和包含高斯噪声的动作序列 $A_k$。
   - 目标：通过网络 $f_\theta$ 预测噪声 $\epsilon$，逐步剔除噪声还原真实动作。
3. **网络结构**：
   - **CNN-based**：使用 1D 时序卷积，推理延迟低。
   - **Transformer-based**：擅长处理长序列，能建模更复杂的交互。
4. **推理优化**：通过 DDIM 采样，将训练时的数百步扩散压缩至推理时的 10-20 步。

### 📊 条件扩散策略与 RHC 执行流程

<div class="mermaid">
flowchart TB
    O["视觉观测 O"] --> Enc["视觉编码器"]
    Enc --> Cond["条件特征"]
    Cond --> S0["从高斯噪声初始化<br/>动作序列 A_K"]
    S0 --> Denoise["多步去噪 f_θ<br/>预测 ε 或 x0"]
    Denoise --> Ak["干净动作序列 A_0<br/>长度 H chunk"]
    Ak --> RHC["RHC：执行前段<br/>滑动窗口重规划"]
    RHC --> Exec["发送到机器人"]
    Exec --> O
</div>

下面这个演示真的在浏览器里跑 DDIM：拖动步数滑块，看长度 16 的动作 chunk 怎么从一团高斯噪声收敛成一条平滑轨迹。注意**整条 chunk 是一起锁定模式的**——这正是 action chunking 除了「预测得远」之外的另一半价值：

<div class="paper-demo" data-demo="dp-denoise"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🚶 具体实例

<div class="mermaid">
flowchart TB
    O["观测：双目 + 关节"] --> D["10步去噪 → 16步动作 chunk"]
    D --> X["执行前 8 步"]
    X --> O
</div>

在一个"抓取方块"的任务中：
- **观测**：双目摄像头画面 + 机械臂关节角。
- **去噪**：模型从随机轨迹开始，经过 10 步迭代，逐渐形成一条平滑的抓取路径。
- **执行**：预测未来 16 步，实际执行前 8 步，随后接收新观测再次预测。

「预测 16 步、执行前 8 步」这个配置背后是一个取舍。拖动 $T_a$，看反应延迟和推理开销怎么此消彼长：

<div class="paper-demo" data-demo="dp-rhc"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## 🤖 工程价值

- **行业标准**：已成为现代端到端模仿学习（Imitation Learning）的事实标准。
- **鲁棒性**：在 15 个复杂操作任务中，成功率平均提升 46.9%。
- **通用性**：支持多种传感器输入（RGB、Depth、Proprioception），并能轻松扩展到双臂甚至全身控制。

---

## 📁 官方源码对照

Diffusion Policy **不在 MimicKit 内**；官方实现为 [columbia-ai-robotics/diffusion_policy](https://github.com/columbia-ai-robotics/diffusion_policy)。

| 论文概念 | 官方路径 | 说明 |
|----------|----------|------|
| 条件去噪 UNet（1D 时序） | `diffusion_policy/model/diffusion/conditional_unet1d.py` | action chunk 扩散骨干 |
| Transformer 变体 | `diffusion_policy/model/diffusion/transformer_for_diffusion.py` | 长序列交互建模 |
| 训练工作区 | `diffusion_policy/workspace/` | 各 benchmark 的训练脚本与配置 |
| 推理与 RHC | workspace 内 rollout 逻辑 | 预测 $H$ 步、执行前 $k$ 步、滑动重规划 |

### 源码运行时序图

官方仓库训练入口是 `train.py`（Hydra 按 `--config-name` 实例化对应 Workspace），评估入口是 `eval.py`。训练与推理（RHC 滚动执行）的时序如下：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant T as train.py / eval.py<br/>(Hydra)
    participant W as Workspace<br/>(TrainDiffusionUnetImageWorkspace)
    participant DL as ReplayBuffer +<br/>SequenceSampler
    participant P as DiffusionUnetImagePolicy<br/>(视觉编码器 + ConditionalUnet1D)
    participant ER as EnvRunner<br/>(仿真/真机环境)
    Note over U,ER: 训练（train.py --config-name=image_pusht_diffusion_policy_cnn.yaml）
    U->>T: python train.py --config-name=... training.seed=42
    T->>W: hydra 实例化 Workspace → workspace.run()
    loop 每个 epoch
        W->>DL: 采样 batch：obs 序列 + 长度 H 的动作 chunk A₀
        W->>P: 视觉编码器提取 obs 特征（FiLM 条件）
        W->>P: 随机采样扩散步 k，加噪 A₀ → A_k
        P-->>W: ConditionalUnet1D 预测噪声 ε̂ → MSE(ε̂, ε) 反向传播
        W->>W: EMA 更新影子权重
        W->>ER: 定期 env_runner.run()：整段 rollout 评估成功率
        W->>W: save_checkpoint()
    end
    Note over U,ER: 推理 / RHC 滚动执行（eval.py --checkpoint ...）
    U->>T: python eval.py --checkpoint ... --output_dir ...
    T->>ER: 加载 EMA 权重 → env_runner.run()
    loop 每个控制周期
        ER-->>P: 最近 n_obs_steps=2 帧观测
        P->>P: 从高斯噪声初始化动作 chunk A_K
        loop DDIM 去噪 ~10 步
            P->>P: ε̂ = UNet(A_k, k, obs 特征) → A_(k−1)
        end
        P-->>ER: 干净动作序列 A₀（H=16 步）
        ER->>ER: 只执行前 8 步（action horizon）
        ER-->>P: 新观测 → 滑动窗口重新预测
    end
</div>

- 训练阶段的核心就是 ⑤–⑥：不回归动作本身，而是学"从加噪 chunk 里预测噪声"；EMA（⑦）是复现成功率的关键工程细节。
- 推理阶段对应上文 RHC 流程图：⑬–⑮ 用 DDIM 把训练时的百步扩散压到 ~10 步，⑯–⑰ 只执行 chunk 前段就滑动重规划，兼顾平滑与反应速度。

### MimicKit 关系

> ❌ MimicKit 面向物理仿真 RL 与运动模仿（PPO/AMP/ASE 等），**未集成视觉-运动扩散策略**。MimicKit 仓库中有 `mimickit/learning/tinymdm/` 子目录，属于另一套运动扩散实验，**不是** Columbia Diffusion Policy 实现。

---

## 🎤 面试高频问题 & 参考回答

1. **为什么扩散模型擅长处理多模态？**
   - 因为它不直接预测均值，而是学习梯度的得分函数（Score function），能收敛到分布的多个局部极大值。
2. **预测噪声还是预测动作？**
   - 实践中预测噪声 $\epsilon$ 通常更稳定。
3. **Diffusion Policy vs ACT (Action Chunking Transformer)？**
   - ACT 侧重于 CVAE 框架，而 Diffusion Policy 利用扩散过程提供了更强的表达能力和训练稳定性。

---

## 📎 附录

### A. 与路线图的关系

| 论文 | 关系 |
|------|------|
| **Diffusion Policy (2023)** | 扩散 + 控制主线的**起点** |
| BeyondMimic (2025) | 扩散控制在人形机器人全身动态运动上的突破性应用 |

### B. 参考来源

- [arXiv:2303.04137](https://arxiv.org/abs/2303.04137)
- [Project Website](https://diffusion-policy.cs.columbia.edu/)
