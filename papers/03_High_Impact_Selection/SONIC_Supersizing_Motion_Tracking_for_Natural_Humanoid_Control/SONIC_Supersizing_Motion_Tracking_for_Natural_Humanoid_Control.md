---
layout: paper
title: "SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control"
category: "高影响力精选 High Impact Selection"
subcategory: "Whole-Body Control Core"
zhname: "SONIC：用规模化运动跟踪打造自然的人形全身控制器"
demos: ["sonic"]
---

# SONIC: Supersizing Motion Tracking for Natural Humanoid Whole-Body Control
**SONIC：用规模化运动跟踪打造自然的人形全身控制器**

> 📅 阅读日期: 2026-05-20（2026-05-16 扩充：补全官方训练 / 评估命令与源码对照）
>
> 🏷️ 板块: 03_High_Impact_Selection / Whole-Body Control Core（H5）
>
> 🧭 状态: 已对照 [NVlabs/GR00T-WholeBodyControl](https://github.com/NVlabs/GR00T-WholeBodyControl)（`gear_sonic/` 子树）官方实现核对方法描述，并附训练 / 评估 / ONNX 导出全流程命令。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2511.07820](https://arxiv.org/abs/2511.07820) |
| **HTML** | [arxiv.org/html/2511.07820v2](https://arxiv.org/html/2511.07820v2) |
| **PDF** | [arxiv.org/pdf/2511.07820](https://arxiv.org/pdf/2511.07820) |
| **项目主页** | [nvlabs.github.io/SONIC](https://nvlabs.github.io/SONIC/) |
| **发布时间** | 2025-11-11 (arXiv) |
| **配套文档** | [GR00T-WholeBodyControl Documentation](https://nvlabs.github.io/GR00T-WholeBodyControl/) |
| **官方代码** | [NVlabs/GR00T-WholeBodyControl](https://github.com/NVlabs/GR00T-WholeBodyControl) · 训练 / 部署位于 [`gear_sonic/`](https://github.com/NVlabs/GR00T-WholeBodyControl/tree/main/gear_sonic) 与 [`gear_sonic_deploy/`](https://github.com/NVlabs/GR00T-WholeBodyControl/tree/main/gear_sonic_deploy) |
| **作者** | Zhengyi Luo, Ye Yuan, Tingwu Wang, Chenran Li, Sirui Chen, Jim Fan, Yuke Zhu 等 |
| **机构** | NVIDIA Research |
| **机器人** | Unitree G1（实机部署） |
| **训练规模** | 100M+ 帧 (≈700 h MoCap) · 1.2M→42M 参数 · 9k–32k GPU·h（最大跨 128 GPU 训练 3 天） |

> ✅ 训练代码已随 NVIDIA `GR00T-WholeBodyControl` 一并开源，论文中的 **GEAR-SONIC** 就对应仓库内的 `gear_sonic/` 目录；下游 C++ 部署侧在 `gear_sonic_deploy/`。本笔记的 §源码对照 / §训练 & 评估速查 均基于 `main` 分支（commit 时间 ≈ 2026-05）核对。

---

## 🎯 一句话总结

SONIC 把"动作跟踪 (motion tracking)"明确当作人形控制的**可扩展基础任务**，沿数据 (100M+ 帧)、参数 (1.2M→42M)、算力 (9k GPU·h) 三个轴一起放大，再用一个**统一 token 空间**把 VR 遥操作 / 视频 / 文本 / 音乐 / VLA 各种输入接入同一策略，让 Unitree G1 在仿真和实机都做到对未见动作的零样本跟踪与交互式全身控制。

> 🎮 **本文内嵌 1 段讲解动画**（不用装任何东西）：
> [七幕动画：SONIC 全流程](#sonic-explainer-anim) —— 约 90 秒串完「任务选错了 → 三轴一起放大 → Universal token space → 五项 aux loss 焊住潜空间 → 实时 Kinematic Planner → System-1 + System-2 → 数据到实机的闭环」。空格播放/暂停，← → 换幕，也可以直接点分幕标签跳着看。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **MoCap** | Motion Capture | 人体动作捕捉数据，SONIC 的"密集监督来源" |
| **MPJPE** | Mean Per-Joint Position Error | 关节位置误差，跟踪精度核心指标 |
| **AMASS** | Archive of Motion Capture As Surface Shapes | SONIC 评测使用的开源 MoCap 数据集 |
| **LaFAN** | LaForge Animation Dataset | 0.4M 帧规模的 baseline 数据子集 |
| **VLA** | Vision-Language-Action | 用 GR00T N1.5 等基础模型做 System-2 |
| **SMPL** | Skinned Multi-Person Linear model | PICO VR 反传的人体姿态模型 |
| **SE(3)** | Special Euclidean Group | 3D 刚体位姿（位置+朝向） |
| **GENMO** | Generative Motion 模型 | 多模态运动生成器（视频/文本/音乐） |

---

## 🎬 七幕动画：SONIC 全流程 {#sonic-explainer-anim}

<div class="paper-demo" data-demo="sonic-explainer"><p class="demo-fallback">（本节含动画演示，需要启用 JavaScript）</p></div>

> 📖 **动画之后的正文默认全部折叠**：动画覆盖到的那几节（问题定义、方法详解、模型架构、实验亮点）按小节收起，再往后的源码对照、训练 & 评估速查、面试参考与附录各整块收起。想细读哪一块就点开对应的折叠条，内容一字未删；两张流程图留在外面，目录里的标题依旧可以直接点，会自动展开所在折叠块，左侧目录顶部还有「展开全部文字」一键铺开。

---

## ❓ 论文要解决什么问题？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：三个症结 —— 逐任务奖励工程 / 输入接口五花八门 / tracker 换域就崩</summary>

人形控制为什么没有像 LLM 那样吃到「规模红利」？SONIC 把症结归结为**任务选错了**：

1. **逐任务奖励工程**：行走、跳舞、起身、遥操作每换一个目标就得重写 reward；多训练反而过拟合。  
2. **输入接口五花八门**：teleop / 视频 / 语言指令 / VLA 现在各搭一套 pipeline，没法共用一个 controller。  
3. **现有 motion tracker 只在自家训练分布上能跑**：换了 motion 域立刻崩。

SONIC 的论点是：**只要把 motion tracking 当作 foundational task 放大**，就既能拿到密集监督（不需要手写 reward），又能用一个统一控制器接所有输入模态。

</details>

---

## 🔧 方法详解

### 1. 把 motion tracking 当作"规模化任务"

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据 100M+ 帧、参数 1.2M→42M、算力 32k GPU·h，三个轴分别放大了多少</summary>

- **数据**：把 MoCap 拼到 100M+ 帧（≈700 h），是过去人形跟踪工作的几个数量级以上。
- **参数**：策略从 1.2M MLP 一路放大到 42M（仍可在 Jetson Orin 上实时推理）。
- **算力**：单次训练最大 128 GPU × 3 天 ≈ 32k GPU·h。论文给出的核心结论是**三个轴单独放大都涨点**，而**数据量收益最大**。

</details>

### 2. Universal token space + Hybrid encoder（多模态接入）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四种输入接口各自怎么编码成 token</summary>

| 输入接口 | 编码到 token 的方式 |
|---|---|
| **VR 全身追踪 (PICO)** | SMPL 姿态 → encoder |
| **VR 三点 (头/双手)** | 上身 SE(3) + 腰部高度 + nav 命令 |
| **视频 / 文本 / 音乐** | GENMO 生成参考动作 → encoder |
| **VLA (GR00T N1.5)** | 输出与 teleop 相同格式的命令，复用同一接口 |

所有输入最终都被编码成同一套 token，再喂给同一个 robot decoder。这意味着**新增一个输入模态不需要重训控制器**。

</details>

### 3. 实时 Universal Kinematic Planner（"自由意志"）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：片段长度、推理延迟、replan 周期与已演示的技能清单</summary>

- 自回归式生成 0.8–2.4 s 的参考动作片段；
- 笔记本上推理 < 5 ms，Jetson Orin GPU 12 ms；
- 用户改命令时 100 ms 内重新规划；
- 已演示：0–6 m/s 任意方向行走 / 醉步、伤步、潜行等"风格"控制 / 拳击 / 蹲下 / 跪行 / 爬行（0–0.5 m/s 全方向）。

</details>

### 4. 与 VLA 串成 System-1 + System-2

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：300 条遥操数据微调 GR00T N1.5，20 trial 95% 成功</summary>

300 条 VR 三点遥操数据（apple-to-plate 取放） → 微调 GR00T N1.5 → VLA 输出 SONIC 接得住的命令格式 → **20 trial 95% 成功率**。证明了基础模型规划 (System 2) + SONIC 的快速反应控制 (System 1) 是可行的搭法。

</details>

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["📚 规模化 MoCap 监督"]
        direction TB
        D1["100M+ 帧 / 700h<br/>多源 motion 数据"]
        D2["不需手写 reward<br/>逐帧密集监督"]
        D1 ~~~ D2
    end

    subgraph SCALE["📈 三轴一起放大"]
        direction TB
        S1["参数: 1.2M → 42M"]
        S2["数据: 0.4M → 7.4M → 100M"]
        S3["GPU 时长: 9k–32k h"]
        S1 ~~~ S2 ~~~ S3
    end

    subgraph TOKEN["🧩 Universal Token Space"]
        direction TB
        T1["VR 全身 (PICO)<br/>VR 三点 (头/双手)"]
        T2["视频 / 文本 / 音乐 (GENMO)<br/>VLA: GR00T N1.5"]
        ENC["Hybrid Encoder"]
        T1 ~~~ T2 ~~~ ENC
    end

    subgraph PLAN["🧠 实时运动规划器"]
        direction TB
        P1["自回归生成<br/>0.8 – 2.4 s 片段"]
        P2["笔记本 < 5 ms<br/>Jetson 12 ms"]
        P3["100 ms 内 replan"]
        P1 ~~~ P2 ~~~ P3
    end

    subgraph POLICY["🤖 SONIC 跟踪策略"]
        direction TB
        R1["Robot Control Decoder"]
        R2["Unitree G1<br/>实机部署"]
        R1 --> R2
    end

    subgraph DEPLOY["🌍 下游能力"]
        direction TB
        E1["未见 motion 零样本跟踪<br/>导航 0–6 m/s + 风格化"]
        E2["蹲/跪/爬 全身技能<br/>拳击等交互娱乐"]
        E3["VLA 取放 95% 成功"]
        E1 ~~~ E2 ~~~ E3
    end

    DATA --> SCALE
    SCALE --> TOKEN
    SCALE --> PLAN
    TOKEN --> POLICY
    PLAN --> POLICY
    POLICY --> DEPLOY

    style DATA fill:#e8f4fd,stroke:#1f78b4,color:#0b3d5c
    style SCALE fill:#fdebd0,stroke:#e67e22,color:#7a3e00
    style TOKEN fill:#e8f8e8,stroke:#27ae60,color:#0b3d1a
    style PLAN fill:#f4ecf7,stroke:#7d3c98,color:#3d1f5c
    style POLICY fill:#fef9e7,stroke:#b7950b,color:#5c4a00
    style DEPLOY fill:#fce4ec,stroke:#c2185b,color:#5c0b2b
</div>

---

## 🧠 模型架构详解（每层神经元数 / 参数规模）

> 这一节专门解释 SONIC 的"网络长什么样"。所有数字都来自论文 §3 与官方 `gear_sonic/config/actor_critic/` 中 `sonic_release` 实验所用的 `all_mlp_v1` 配置（即论文报告的 42M 参数版本），不是泛泛的"差不多大概"。

### 1. 高层结构：3 路 encoder × FSQ × 2 个 decoder

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：七个子模块的隐层结构表：三路 encoder / FSQ / 两个 decoder / critic</summary>

整个 actor 是一个 **Action Transform Module (ATM)**：3 路异构输入各走一条 encoder，统一压成离散 token，再由一个 G1 解码器解出 29 维关节动作；训练时额外挂一个 kinematic decoder 把 token 还原回参考动作做自监督。

| 子模块 | 角色 | 隐层结构 (`hidden_dims`) | 激活 | 训练用 / 部署用 |
|---|---|---|---|---|
| **G1 Encoder** | 机器人本体未来 N=10 帧目标 → token | `[2048, 1024, 512, 512]` | SiLU | 训练 + 部署 |
| **Teleop Encoder** | VR 三点 (头/双手 SE(3)) + 下身命令 → token | `[2048, 1024, 512, 512]` | SiLU | 训练 + 部署 (VR) |
| **SMPL Encoder** | SMPL 全身 N=10 帧关节 + 根朝向 → token | `[2048, 1024, 512, 512]` | SiLU | 训练 + 部署 (视频/VR 全身) |
| **FSQ Quantizer** | 把 64 维潜空间离散成 token | 32 levels × 32 dim × 2 token/帧 = **64-d / 帧, ~320 bit/帧** | — | 训练 + 部署 |
| **G1 Dynamic Decoder** (`g1_dyn`) | token + 本体感觉 → 29 DOF 关节动作 | `[2048, 2048, 1024, 1024, 512, 512]` | SiLU | 训练 + **部署** |
| **G1 Kinematic Decoder** (`g1_kin`) | token → 还原 N 帧参考动作 | `[2048, 1024, 512, 512]` | SiLU | **仅训练**（aux loss）|
| **Critic** (单独网络) | 全部 critic obs → 标量 value | `[2048, 2048, 1024, 1024, 512, 512]` | SiLU | 仅训练 |

> 注意：SONIC **没有用 Transformer**——所有 backbone 都是密集 MLP + SiLU 激活。论文里之所以能"放大就涨"，靠的是把 MLP 宽度 + 数据 + GPU 数量同步放大，而不是换更复杂的算子。

</details>

### 2. 详细网络拓扑（mermaid）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：这张拓扑图怎么读</summary>

下图把 `sonic_release` 实际在跑的网络逐层画出来；每个矩形里的数字就是该层的 **神经元数 (=隐层宽度)**。

</details>

<div class="mermaid" style="max-width:760px;margin:0 auto;">
flowchart TB
    subgraph IN["📥 多模态输入 (per-frame)"]
        direction TB
        I1["G1 obs<br/>未来 10 帧 + anchor 朝向"]
        I2["Teleop obs<br/>头/左手/右手 SE(3) +<br/>腰高 + nav 命令"]
        I3["SMPL obs<br/>未来 10 帧 SMPL 关节 +<br/>root 朝向"]
    end

    subgraph ENC["🧬 三路 Encoder (MLP, SiLU)"]
        direction TB
        E1["G1 Encoder<br/>2048 → 1024 → 512 → 512"]
        E2["Teleop Encoder<br/>2048 → 1024 → 512 → 512"]
        E3["SMPL Encoder<br/>2048 → 1024 → 512 → 512"]
    end

    subgraph FSQ["🎛 FSQ 量化器 (共享潜空间)"]
        direction TB
        Q1["latent dim = 32<br/>num_tokens / 帧 = 2<br/>每维 32 levels (≈5 bit)"]
        Q2["输出: 离散 token<br/>flatten = 64-d 实数向量"]
        Q1 --> Q2
    end

    subgraph PROP["🦿 本体感觉 (proprioception)"]
        direction TB
        P1["关节位姿 / 关节速度<br/>角速度 / 重力方向<br/>last_actions"]
    end

    subgraph DEC["🤖 G1 Dynamic Decoder (部署用)"]
        direction TB
        D0["token (64) ⊕ proprio"]
        D1["FC 2048"]
        D2["FC 2048"]
        D3["FC 1024"]
        D4["FC 1024"]
        D5["FC 512"]
        D6["FC 512"]
        D7["action_mean<br/>= 29 DOF 关节目标"]
        D0 --> D1 --> D2 --> D3 --> D4 --> D5 --> D6 --> D7
    end

    subgraph KIN["🪞 G1 Kinematic Decoder (仅训练 / aux loss)"]
        direction TB
        K1["FC 2048 → 1024 → 512 → 512"]
        K2["还原未来 10 帧 G1 命令<br/>+ anchor 朝向"]
        K1 --> K2
    end

    subgraph CRI["📏 Critic (独立 MLP, 仅训练)"]
        direction TB
        C1["critic_obs (含特权信息)"]
        C2["FC 2048 → 2048 → 1024<br/>→ 1024 → 512 → 512"]
        C3["scalar V(s)"]
        C1 --> C2 --> C3
    end

    I1 --> E1
    I2 --> E2
    I3 --> E3
    E1 --> Q1
    E2 --> Q1
    E3 --> Q1
    Q2 --> D0
    Q2 --> K1
    PROP --> D0

    style IN fill:#e8f4fd,stroke:#1f78b4,color:#0b3d5c
    style ENC fill:#e8f8e8,stroke:#27ae60,color:#0b3d1a
    style FSQ fill:#fdebd0,stroke:#e67e22,color:#7a3e00
    style PROP fill:#f4ecf7,stroke:#7d3c98,color:#3d1f5c
    style DEC fill:#fef9e7,stroke:#b7950b,color:#5c4a00
    style KIN fill:#fce4ec,stroke:#c2185b,color:#5c0b2b
    style CRI fill:#eaf2f8,stroke:#2e86c1,color:#1b4f72
</div>

### 3. 参数规模解读（论文报告 1.2M → 42M）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：Tiny / Small / Base / Large 四档容量与 42M 的粗略拆账</summary>

论文里 scaling 实验扫描了 4 档容量，核心做法是 **同比缩放每个 MLP 的隐层宽度**（`hidden_dims` 整体打折），而层数、激活、模块拓扑保持不变：

| 容量档 | 大致 actor 参数 | 典型 `hidden_dims` 比例 | 用途 |
|---|---|---|---|
| **Tiny** | ~1.2 M | `[256, 128, 64, 64]` 量级 | 论文 Fig.2(b) scaling 起点 |
| **Small** | ~5 M | `[1024, 512, 256, 256]` 量级 | 中间档 |
| **Base** | ~15 M | `[1536, 768, 384, 384]` 量级 | 中间档 |
| **Large（`sonic_release`）** | **~42 M** | `[2048, 1024, 512, 512]` (encoder) <br/> `[2048, 2048, 1024, 1024, 512, 512]` (g1_dyn) | 论文主实验 + 开源 checkpoint |

> 粗略估算（`sonic_release`，仅 actor 侧、不含 critic）：3×encoder ≈ 9.5 M、g1_dyn decoder ≈ 8.5 M、g1_kin decoder ≈ 4 M、加上 FSQ / running stats / token embedding 等共 **≈ 30 M**；再加上独立的 critic（≈ 8.5 M）就接近论文报告的 **~42 M actor + critic 总规模**。具体数字会随 `tokenizer / policy / critic obs` 维度浮动，权威值请以 W&B `n_parameters` 为准。

</details>

### 4. 实时性数据（部署）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：决策频率 / 规划器推理 / 端到端遥操延迟五项部署数据</summary>

| 指标 | 数值 | 来源 |
|---|---|---|
| **决策频率** | 50 Hz（与 Isaac Lab `dt=0.02s` 对齐） | 论文 §3.2 |
| **Kinematic Planner 推理** | 笔记本 < 5 ms / Jetson Orin GPU 12 ms | 论文 §2.2 |
| **跟踪策略推理** | Jetson Orin 上单帧 sub-ms 量级（仅 MLP，无 Transformer） | 推断 |
| **VR teleop 端到端延迟** | 平均 121.9 ms（含 PICO → 网络 → 执行器整链） | 论文 §2.4.2 |
| **Replan 周期** | ≤ 100 ms 或用户改命令立即触发 | 论文 §2.2 |

</details>

### 5. 为什么是这样的"扁宽 MLP"而不是 Transformer？

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：四条理由：延迟硬约束 / 离散 token 已做序列瓶颈 / scaling law 仍成立 / 训练稳定</summary>

- **延迟硬约束**：人形 sim-to-real 需要 ≥ 50 Hz 的决策频率和 sub-10 ms 的 onboard 推理；同等参数下 MLP 比 Transformer 在 Jetson Orin 上更省时。
- **离散 token 已经做了"序列瓶颈"**：FSQ 把每帧潜空间压成 2 个 token，相当于把"长上下文压缩"的活外包给了量化器，decoder 只需做单帧 control。
- **Scaling law 仍然成立**：论文 Fig.2 显示 MPJPE 随宽度 + 数据 + GPU 时长单调下降——证明在 motion tracking 这种 dense 监督任务上，MLP 也有"放大就涨"的红利，没必要立刻上 Transformer。
- **训练稳定**：PPO + 5 项 aux loss（见 §源码对照③）已经够"挑战"，再加 attention 容易引入额外的稳定性问题。

</details>

---

## 📊 实验亮点（节选）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：scaling 曲线 / OOD 跟踪 / 真机零样本 / VR 延迟 / System 1+2 五条</summary>

- **Scaling 曲线**：MPJPE 在数据量、模型容量、GPU 时长三个维度上都是单调下降；**数据维度收益最大**。
- **Out-of-distribution 跟踪**（同一未见数据集，MuJoCo 评估）：在成功率 / MPJPE / 加速度误差 / 速度误差全部超越 Any2Track / BeyondMimic / GMT。
- **真机零样本**：Unitree G1 上 50 条舞蹈、跳跃、loco-manipulation 序列**全部 100% 成功**。
- **VR teleop 延迟**：右手腕命令到实际位姿平均 121.9 ms，95 分位 13.3 cm 位置误差、0.27 rad 朝向误差。
- **System 1 + 2**：300 条遥操数据微调 GR00T N1.5 → 苹果取放 95%（20 trial）。

</details>

---

## 🤖 对人形机器人领域的意义

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：任务定义 / 架构层 / System 1-2 / 数据时代信号 / 下游集成五个方向</summary>

| 方向 | 含义 |
|------|------|
| **任务定义** | 把 motion tracking 立为「人形控制的 GPT-prompt」——一个能横扫各种行为且**有规模红利**的目标 |
| **架构层** | Universal token space 让 VR / 视频 / 文本 / 音乐 / VLA 共用同一控制器，是 GR00T 体系的底层一块拼图 |
| **System 1 / 2** | 给 VLA 提供了一个真正可用的快速 reactive 全身控制底座，VLA 只需输出 teleop 格式命令 |
| **数据时代信号** | 700 h MoCap + 128 GPU 训练成为新的人形 controller "scale baseline"，后来者很难再用 8 GPU 三天对标 |
| **下游集成** | 蹲/跪/爬 / 多步态 / 拳击 / 任意速度方向，是 humanoid 系列论文里最"自由意志"的展示之一 |

</details>

---

## 🧬 源码对照（论文概念 ↔ `gear_sonic/`）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五节源码对照：UniversalTokenModule / FSQ 与三路配置 / 五项 aux loss / sonic_release / 训练入口</summary>

把论文里 4 个关键设计点逐个对到 [NVlabs/GR00T-WholeBodyControl](https://github.com/NVlabs/GR00T-WholeBodyControl) 仓库（`gear_sonic/` 子树）。代码片段只摘要核心字段，全量文件请按链接到原仓库查看。

<h3 id="-universal-token-space--hybrid-encoder">① Universal Token Space + Hybrid Encoder</h3>

论文 §3 的「universal token + 多 encoder + 共享 decoder」对应的 PyTorch 模块就是 **`UniversalTokenModule`**：把 `g1 / teleop / smpl`（必要时 + `soma`）多路 encoder 编码到同一潜空间，经 **FSQ** 量化为离散 token，再交给一个共享的 G1 decoder 解出 29 DOF 关节目标。

文件：[`gear_sonic/trl/modules/universal_token_modules.py`](https://github.com/NVlabs/GR00T-WholeBodyControl/blob/main/gear_sonic/trl/modules/universal_token_modules.py)

```python
class UniversalTokenModule(nn.Module):
    """SONIC-style action transform module (ATM) with FSQ token bottleneck.

    Token flow:
        tokenizer_obs ──► encoder(s) ──► [+ additive encoders]
                                      ──► [latent_residual (pre_quantization)]
                                      ──► FSQ quantizer
                                      ──► [+ latent_residual (post_quantization)]
                                      ──► decoder(s)
                                      ──► action_mean
    """

    def __init__(self, env_config, algo_config, *,
                 num_fsq_levels=5, fsq_level_list=16, max_num_tokens=None,
                 num_future_frames=1, quantizer=None,
                 encoders=None, decoders=None,
                 aux_loss_func={}, aux_loss_coef={},
                 encoder_sample_probs=None,
                 reencode_smpl_g1_recon=False, ...):
        ...
        self.quantizer = common.custom_instantiate(quantizer, levels=fsq_level_list)
        self.encoders = nn.ModuleDict(...)   # g1 / teleop / smpl / (soma)
        self.decoders = nn.ModuleDict(...)   # g1_dyn (动力学动作) + g1_kin (kin 重建)
```

`forward()` 内部的实际数据通路（精简版）：

```python
def forward(self, input_data, compute_aux_loss=False, latent_residual=None, ...):
    tokenizer_obs = self.parse_tokenizer_obs(input_data)
    proprioception_input = torch.cat([input_data[k] for k in self.proprioception_features], -1)

    encoder_masks = self.create_encoder_masks(tokenizer_obs)
    encoded_tokens = {}
    for encoder_name in self.encoders_to_iterate:        # "g1" / "teleop" / "smpl"
        latent = self.encode(encoder_name, tokenizer_obs,
                             encoder_masks[encoder_name])
        encoded_tokens[encoder_name] = self.quantize(latent)   # FSQ -> 离散 token

    decoded = self.decode(encoded_tokens, proprioception_input)
    return decoded["action_mean"]                         # 29 DOF G1 关节
```

要点：
- **`encoder_sample_probs`** 决定每个环境用哪一路 encoder 监督。`sonic_release` 里三路各 1.0（均匀采样）。
- **FSQ token bottleneck** 直接复用 `vector_quantize_pytorch.FSQ`，单 token 维度=`num_fsq_levels=32`，每帧 `max_num_tokens=2`。
- **`latent_residual`** 接口暴露给上层 VLA / HOI 策略：可以在量化前/后注入残差，**实现"VLA 不重训控制器，只产 token 修正量"**。

<h3 id="-fsq-量化器与三大-encoder--decoder-配置">② FSQ 量化器与三大 encoder / decoder 配置</h3>

Hydra 配置在 `gear_sonic/config/actor_critic/`：

```yaml
# gear_sonic/config/actor_critic/quantizers/fsq.yaml
_target_: vector_quantize_pytorch.FSQ
```

```yaml
# gear_sonic/config/actor_critic/encoders/g1_mf_mlp.yaml （机器人本体跟踪 encoder）
g1:
  inputs: ["command_multi_future_nonflat", "motion_anchor_ori_b_mf_nonflat"]
  params:
    _target_: gear_sonic.trl.modules.base_module.BaseModule
    num_input_temporal_dims: ${manager_env.commands.motion.num_future_frames}
    num_output_temporal_dims: ${algo.config.actor.backbone.max_num_tokens}
    module_config_dict:
      layer_config:
        type: MLP
        hidden_dims: [2048, 1024, 512, 512]
        activation: SiLU
```

```yaml
# gear_sonic/config/actor_critic/encoders/teleop_mlp.yaml （VR 三点 encoder）
teleop:
  inputs: ["command_multi_future_lower_body",
           "vr_3point_local_target", "vr_3point_local_orn_target",
           "motion_anchor_ori_b"]
  params:
    _target_: gear_sonic.trl.modules.base_module.BaseModule
    module_config_dict:
      layer_config: { type: MLP, hidden_dims: [2048, 1024, 512, 512], activation: SiLU }
```

```yaml
# gear_sonic/config/actor_critic/encoders/smpl_mlp.yaml （SMPL 人体姿态 encoder）
smpl:
  inputs: ["smpl_joints_multi_future_nonflat", "smpl_root_ori_b_multi_future"]
  params:
    _target_: gear_sonic.trl.modules.base_module.BaseModule
    num_input_temporal_dims: ${manager_env.commands.motion.smpl_num_future_frames}
    module_config_dict:
      layer_config: { type: MLP, hidden_dims: [2048, 1024, 512, 512], activation: SiLU }
```

```yaml
# gear_sonic/config/actor_critic/decoders/g1_dyn_mlp.yaml （共享 robot decoder，输出关节动作）
g1_dyn:
  inputs: ["token_flattened", "proprioception"]
  outputs: ["action"]
  has_temporal_dim: False
  params:
    module_config_dict:
      layer_config:
        type: MLP
        hidden_dims: [2048, 2048, 1024, 1024, 512, 512]
        activation: SiLU
```

整套 actor / critic 用 `gear_sonic/config/actor_critic/universal_token/all_mlp_v1.yaml` 组装：

```yaml
defaults:
  - critics/mlp@algo.config.critic
  - quantizers/fsq@algo.config.actor.backbone.quantizer
  - encoders/g1_mf_mlp@algo.config.actor.backbone.encoders
  - encoders/teleop_mlp@algo.config.actor.backbone.encoders
  - encoders/smpl_mlp@algo.config.actor.backbone.encoders
  - decoders/g1_dyn_mlp@algo.config.actor.backbone.decoders
  - decoders/g1_kin_mf_mlp@algo.config.actor.backbone.decoders

algo:
  config:
    actor:
      backbone:
        _target_: gear_sonic.trl.modules.universal_token_modules.UniversalTokenModule
        num_fsq_levels: 32
        fsq_level_list: 32
        max_num_tokens: 2
```

> 这里就是论文 §「universal-token architecture」字面落地的一份 yaml：3 个 encoder 共用 FSQ → 1 个 G1 decoder，每帧只压成 `2 × 32 = 64` 维离散 token。

<h3 id="-跨模态对齐辅助损失论文-4">③ 跨模态对齐辅助损失（论文 §4）</h3>

论文里强调"让所有 encoder 落到同一潜空间"靠的是一组 **cross-modal latent alignment + cycle reconstruction** loss。配置就在 `gear_sonic/config/aux_losses/universal_token/g1_recon_and_all_latent.yaml`：

```yaml
# @package algo.config.actor.backbone
defaults:
  - terms/g1_recon@aux_loss_func
  - terms/g1_smpl_latent@aux_loss_func
  - terms/g1_teleop_latent@aux_loss_func
  - terms/teleop_smpl_latent@aux_loss_func
  - terms/reencoded_smpl_g1_latent@aux_loss_func

aux_loss_coef:
  g1_recon:                 0.01   # G1 kin decoder 重建监督
  g1_smpl_latent:           1.0    # G1 ↔ SMPL latent 对齐
  g1_teleop_latent:         1.0    # G1 ↔ Teleop latent 对齐
  teleop_smpl_latent:       1.0    # Teleop ↔ SMPL latent 对齐
  reencoded_smpl_g1_latent: 1.0    # SMPL→G1→重编码 的 cycle consistency
```

`g1_recon` 把 G1 encoder 的 token 用一个 kin decoder 还原回参考动作，保证 token 没丢运动学信息；后面四项把不同模态的 latent 拉到同一空间，是论文里 universal token 能"零控制器改动"接 VR / SMPL / VLA 的工程保证。

<h3 id="-sonic_release-主实验配置">④ <code>sonic_release</code> 主实验配置</h3>

论文 5.1 的 "released SONIC" 对应的 Hydra 实验入口就是 `+exp=manager/universal_token/all_modes/sonic_release`，文件 [`gear_sonic/config/exp/manager/universal_token/all_modes/sonic_release.yaml`](https://github.com/NVlabs/GR00T-WholeBodyControl/blob/main/gear_sonic/config/exp/manager/universal_token/all_modes/sonic_release.yaml)：

```yaml
# @package _global_
# SONIC release config — 3 encoders (G1, teleop, SMPL), no SOMA.
defaults:
  - /algo: ppo_im_phc                                          # PPO + 模仿监督
  - /manager_env: base_env
  - /callbacks/im_resample                                     # 失败动作自适应采样
  - /aux_losses: universal_token/g1_recon_and_all_latent       # ③ 的 5 项 aux loss
  - override /trainer: trl_ppo_aux
  - override /actor_critic: universal_token/all_mlp_v1         # ② 的网络拼装
  - override /manager_env/observations/tokenizer: unitoken_all_noz
  - override /manager_env/observations/policy: local_dir_hist
  - override /manager_env/observations/critic: privileged_mf_hist
  - override /manager_env/events: tracking/level0_4
  - override /manager_env/terminations: tracking/base_adaptive_strict_ori_foot_xyz
  - override /manager_env/rewards: tracking/base_5point_local_feet_acc

num_envs: 4096
manager_env:
  config:
    robot: { type: g1_model_12_dex }
    terrain_type: trimesh
  commands:
    motion:
      num_future_frames: 10
      dt_future_ref_frames: 0.1
      smpl_num_future_frames: 10
      smpl_dt_future_ref_frames: 0.02
      cat_upper_body_poses: true
      cat_upper_body_poses_prob: 0.5
      freeze_frame_aug: true
      teleop_sample_prob_when_smpl: 0.5
      motion_lib_cfg:
        adaptive_sampling: { adp_samp_failure_rate_max_over_mean: 200 }
        motion_file: data/motion_lib_bones_seed/robot_filtered
        smpl_motion_file: data/bones_seed_smpl
        smpl_y_up: true
```

注意三件事，对应论文里的几个易忽略细节：
- **PPO + 模仿监督** —— 算法 base 是 `algo: ppo_im_phc`（即论文 §「PPO with auxiliary losses」）；不是纯监督学习。
- **自适应失败采样**（`im_resample` + `adp_samp_failure_rate_max_over_mean: 200`）—— 论文里强调的"自动把难 motion 翻出来重训"机制。
- **`teleop_sample_prob_when_smpl=0.5`** —— 用 SMPL 监督的同时按 50% 概率混入 teleop 命令，这是论文里 universal token 跨模态训练在工程上的落点。

<h3 id="-训练--评估入口">⑤ 训练 / 评估入口</h3>

| 论文中的"训练循环" | 仓库入口 |
|---|---|
| 主训练（PPO + aux loss + Isaac Lab 仿真）| [`gear_sonic/train_agent_trl.py`](https://github.com/NVlabs/GR00T-WholeBodyControl/blob/main/gear_sonic/train_agent_trl.py) |
| 评估（MPJPE / 成功率 / 渲染视频）| [`gear_sonic/eval_agent_trl.py`](https://github.com/NVlabs/GR00T-WholeBodyControl/blob/main/gear_sonic/eval_agent_trl.py) |
| 数据预处理（Bones-SEED → motion_lib PKL）| [`gear_sonic/data_process/convert_soma_csv_to_motion_lib.py`](https://github.com/NVlabs/GR00T-WholeBodyControl/blob/main/gear_sonic/data_process) |
| ONNX 导出（部署到 Jetson Orin）| `eval_agent_trl.py +export_onnx_only=true` |
| C++ 实机部署 | [`gear_sonic_deploy/`](https://github.com/NVlabs/GR00T-WholeBodyControl/tree/main/gear_sonic_deploy)（含 `g1/`、`policy/`、`docker/`） |

训练脚本头部就强制依赖 Isaac Lab，**没装 Isaac Lab 是跑不起来的**：

```python
# gear_sonic/train_agent_trl.py
try:
    import isaaclab  # noqa: F401
except ImportError:
    print("ERROR: Isaac Lab is required for training but not installed.")
    sys.exit(1)
```

并发训练用 HuggingFace `accelerate` + `transformers` 的 `PPOConfig` 框架（即仓库里那个本地 `gear_sonic/trl/` 子包是对官方 TRL 的二次封装）：

```python
# gear_sonic/train_agent_trl.py::main
parser = HfArgumentParser((ScriptArguments, PPOConfig, ModelConfig))
script_args, training_args, model_args = parser.parse_dict(config.algo.trl)

ddp_kwargs = DistributedDataParallelKwargs(find_unused_parameters=False)
accelerator = Accelerator(
    gradient_accumulation_steps=training_args.gradient_accumulation_steps,
    kwargs_handlers=[ddp_kwargs, InitProcessGroupKwargs(timeout=timedelta(seconds=6000))],
)
```

</details>

---

## 🧑‍💻 训练 & 评估速查（来自官方 `docs/source/user_guide/training.md`）

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：数据准备 → 训练 → 评估 → ONNX 导出 → 收敛参考指标，全套官方命令</summary>

下面命令都摘自仓库官方训练指南，并按"先单机能跑 → 再放大到论文规模"的顺序整理。所有命令前提：已经在装好 Isaac Lab 4.5 的 conda / venv 中、并 `cd` 到仓库根目录。

<h3 id="0-数据准备">0. 数据准备</h3>

```bash
# Step 1: Bones-SEED CSV → motion_lib PKL（G1 机器人参考动作）
python gear_sonic/data_process/convert_soma_csv_to_motion_lib.py \
    --input /path/to/bones_seed/g1/csv/ \
    --output data/motion_lib_bones_seed/robot \
    --fps 30 --fps_source 120 --individual --num_workers 16

# Step 2: 过滤掉 G1 做不了的动作（家具交互/车辆/空中杂技/高台等，去掉 ~8.7%）
python gear_sonic/data_process/filter_and_copy_bones_data.py \
    --source data/motion_lib_bones_seed/robot \
    --dest   data/motion_lib_bones_seed/robot_filtered \
    --workers 16
```

最终数据布局：

```
<repo_root>/
├── data/motion_lib_bones_seed/
│   ├── robot/              # 全量 motion library (~142K PKLs)
│   └── robot_filtered/     # 过滤后 (~130K PKLs)
├── data/bones_seed_smpl/   # SMPL 监督源
└── gear_sonic/
```

<h3 id="1-开始训练论文主实验--sonic_release">1. 开始训练（论文主实验 = <code>sonic_release</code>）</h3>

最小可跑（debug，单卡 16 envs）：

```bash
python gear_sonic/train_agent_trl.py \
    +exp=manager/universal_token/all_modes/sonic_release \
    num_envs=16 headless=False \
    ++algo.config.num_learning_iterations=100
```

单机 8 GPU 标准训练：

```bash
accelerate launch --num_processes=8 gear_sonic/train_agent_trl.py \
    +exp=manager/universal_token/all_modes/sonic_release \
    num_envs=4096 headless=True \
    ++manager_env.commands.motion.motion_lib_cfg.motion_file=data/motion_lib_bones_seed/robot_filtered \
    ++manager_env.commands.motion.motion_lib_cfg.smpl_motion_file=data/bones_seed_smpl
```

**论文规模**（推荐 ≥ 64 GPU，对应 9k–32k GPU·h 那一档）：

```bash
accelerate launch \
    --multi_gpu \
    --num_machines=8 --num_processes=64 \
    --machine_rank=$MACHINE_RANK \
    --main_process_ip=$MASTER_ADDR \
    --main_process_port=$MASTER_PORT \
    gear_sonic/train_agent_trl.py \
    +exp=manager/universal_token/all_modes/sonic_release \
    num_envs=4096 headless=True \
    ++manager_env.commands.motion.motion_lib_cfg.motion_file=data/motion_lib_bones_seed/robot_filtered \
    ++manager_env.commands.motion.motion_lib_cfg.smpl_motion_file=data/smpl_filtered
```

从官方发布 checkpoint 继续 finetune：

```bash
python gear_sonic/train_agent_trl.py \
    +exp=manager/universal_token/all_modes/sonic_release \
    +checkpoint=sonic_release/last.pt \
    num_envs=4096 headless=True \
    ++manager_env.commands.motion.motion_lib_cfg.motion_file=<path/to/robot_filtered> \
    ++manager_env.commands.motion.motion_lib_cfg.smpl_motion_file=<path/to/smpl_filtered>
```

带第 4 路 SOMA encoder 的扩展实验（对应论文里 `sonic_bones_seed`）：

```bash
accelerate launch --multi_gpu --num_machines=8 --num_processes=64 \
    gear_sonic/train_agent_trl.py \
    +exp=manager/universal_token/all_modes/sonic_bones_seed \
    num_envs=4096 headless=True \
    ++manager_env.commands.motion.motion_lib_cfg.motion_file=data/motion_lib_bones_seed/robot_filtered \
    ++manager_env.commands.motion.motion_lib_cfg.smpl_motion_file=data/smpl_filtered \
    ++manager_env.commands.motion.motion_lib_cfg.soma_motion_file=data/motion_lib_bones_seed/soma_filtered
```

W&B 默认开启，常用开关：

```bash
WANDB_MODE=offline python gear_sonic/train_agent_trl.py ...     # 离线
... wandb.wandb_project=my_project wandb.wandb_entity=my_team  # 改项目
... use_wandb=false                                              # 完全关闭
```

可视化参考动作（不训练，只跑 replay 校验数据）：

```bash
python gear_sonic/train_agent_trl.py \
    +exp=manager/universal_token/all_modes/sonic_release \
    ++replay=True num_envs=4 headless=False
```

<h3 id="2-评估metrics--渲染视频">2. 评估（metrics + 渲染视频）</h3>

跑 MPJPE / 成功率指标：

```bash
python gear_sonic/eval_agent_trl.py \
    +checkpoint=<path_to_checkpoint.pt> \
    +headless=True \
    ++eval_callbacks=im_eval \
    ++run_eval_loop=False \
    ++num_envs=128 \
    "+manager_env/terminations=tracking/eval" \
    "++manager_env.commands.motion.motion_lib_cfg.max_unique_motions=512"
```

渲染对比视频（输出 `000000.mp4` ... 到 `save_rendering_dir`）：

```bash
python gear_sonic/eval_agent_trl.py \
    +checkpoint=<path_to_checkpoint.pt> \
    +headless=True \
    ++eval_callbacks=im_eval \
    ++run_eval_loop=False \
    ++num_envs=8 \
    ++manager_env.config.render_results=True \
    "++manager_env.config.save_rendering_dir=/tmp/renders" \
    ++manager_env.config.env_spacing=10.0 \
    "~manager_env/recorders=empty" "+manager_env/recorders=render"
```

> 如果用的是官方 release checkpoint（不是你自己训练的），它的 `config.yaml` 里写的是 NVIDIA 内部数据路径，需要追加一行覆盖：  
> `"++manager_env.commands.motion.motion_lib_cfg.motion_file=data/motion_lib_bones_seed/robot_filtered"`

<h3 id="3-导出-onnx给-jetson-orin--c-部署用">3. 导出 ONNX（给 Jetson Orin / C++ 部署用）</h3>

```bash
python gear_sonic/eval_agent_trl.py \
    +checkpoint=<path_to_checkpoint.pt> \
    +headless=True ++num_envs=1 \
    +export_onnx_only=true
```

导出文件（生成在 checkpoint 同目录 `exported/` 下）：

| 文件 | 用途 |
|---|---|
| `*_smpl.onnx`     | SMPL encoder + decoder（外部姿态估计输入） |
| `*_g1.onnx`       | G1 encoder + decoder（机器人本体跟踪） |
| `*_teleop.onnx`   | Teleop encoder + decoder（VR 三点遥操） |
| `*_encoder.onnx`  | 三路 encoder 合体 |
| `*_decoder.onnx`  | 共享 decoder |

部署侧 C++ 在 `gear_sonic_deploy/policy/` 加载对应的 encoder+decoder 对。

<h3 id="4-收敛参考指标">4. 收敛参考指标</h3>

训练 W&B 关键 reward（`Episode_Reward/`）：

| 指标 | 收敛区间 | 含义 |
|---|---|---|
| `tracking_vr_5point_local` | > 0.80 | 5 点（头/双手/双脚）局部跟踪 |
| `tracking_relative_body_pos` | > 0.44 | 上身相对位置跟踪 |
| `tracking_anchor_pos` | > 0.14 | 根节点位置跟踪 |
| `time_out` | > 0.90 | 整段 episode 跑完率 |

`eval_agent_trl.py` 的离线指标：

| 指标 | 收敛区间 | 含义 |
|---|---|---|
| `success_rate` | > 0.97 | 未早终止地跟完一条 motion 的比例 |
| `mpjpe_l` | < 30 mm | 局部坐标 per-joint 误差 |
| `mpjpe_g` | < 200 mm | 全局坐标 per-joint 误差 |

> 官方文档明确：**100K 迭代后 sonic_release 应做到 `success_rate > 0.98` 且 `mpjpe_l < 29 mm`**——可作为复现达标线。

</details>

---

## 🎤 面试参考

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：五问：为什么放大就涨 / token space 解决了什么 / 为什么要规划器 / 与同期工作差在哪 / 为什么是 G1</summary>

**Q：SONIC 凭什么"放大就涨"，过去人形 RL 不也是越训越差吗？**  
A：关键在任务选取。过去的 walking / 跑酷 / 跳舞 reward 都是手写、稀疏、互相冲突；越训越容易过拟合到某种 reward 形态。SONIC 把任务换成「逐帧跟随参考动作」，监督信号是密集的、来源（MoCap）是天然多样的，于是数据 / 模型 / 算力三轴都能稳定换来 MPJPE 下降。

**Q：Universal token space 解决了什么？**  
A：以前的人形系统 teleop / 视频 / 文本控制各搭一套 pipeline，要么靠多 expert + 切换器，要么各自独训。SONIC 把所有输入都映射到统一 token，再用同一个 robot decoder 解，**新接口零控制器改动**就能上线。这是它能直接接 VLA、变成 GR00T 系列底座的根因。

**Q：为什么需要 Universal Kinematic Planner？直接给参考动作不行吗？**  
A：人在交互时给的命令是高层稀疏的（"右转"/"加速"/"换风格"），不是逐帧 motion。Planner 把这种命令自动展开成 0.8–2.4 s 的 motion 片段（短到能立刻 replan，长到能保持自然过渡），让控制器既能稳定地"跟一个 motion"，又能在 100 ms 内反应到新指令。

**Q：和 BeyondMimic / Any2Track / GMT 等同期工作差在哪？**  
A：核心差异是规模 + 通用接口。BeyondMimic 等工作训练数据规模 < 1M 帧，集中在自家训练分布；SONIC 用 100M 帧训练，对未见 motion 的 OOD 成功率显著更高，并且原生暴露 token 接口给 VLA / 多模态。

**Q：实机为什么用 Unitree G1，不是 Atlas/Digit？**  
A：G1 是当前研究界最容易拿到、调试链条最成熟的人形之一，也契合 NVIDIA Isaac Lab 训练管线。论文目标是验证 scaling + token 接口，不依赖特定本体；后续向其它人形迁移属于跨 embodiment 工程问题。

</details>

---

## 🔗 相关阅读

- [HOVER (2410.21229)](https://arxiv.org/abs/2410.21229)：NVIDIA 上一代 versatile WBC，SONIC 的设计哲学延续
- [GMT / BeyondMimic / Any2Track]：SONIC 论文里直接对标的同期 motion tracker
- [TWIST (2505.07815)](https://arxiv.org/abs/2505.07815)：评测集来源，SONIC 用其 retargeted AMASS 子集
- [GENMO (2505.01425)](https://arxiv.org/abs/2505.01425)：视频/文本/音乐 → motion 的统一生成器
- [GR00T N1 / N1.5](https://nvidia.com/en-us/ai/gr00t/)：与 SONIC 串成 System-1/System-2 的 VLA 基础模型
- [GR00T-WholeBodyControl 文档](https://nvlabs.github.io/GR00T-WholeBodyControl/)：SONIC 在 GR00T 体系中的角色
- [NVlabs/GR00T-WholeBodyControl - `gear_sonic/`](https://github.com/NVlabs/GR00T-WholeBodyControl/tree/main/gear_sonic)：本笔记 §源码对照 / §训练 & 评估速查 的代码来源

---

## 📎 附录：与该笔记并行的"高影响力精选"笔记

<details class="paper-fold" markdown="1">
<summary>📖 展开文字：与该笔记并行的「高影响力精选」进度表</summary>

| 类别 | 已完成 | 待补 |
|------|------|------|
| 全身控制核心 | ExBody1 / ExBody2 / HOVER / HugWBC / **SONIC（本文）** | UH-1 |
| 遥操作与模仿学习 | OmniH2O / HOMIE / HumanPlus（07_Teleoperation）/ EgoMimic（06_Manipulation）/ iDP3 | （本分类已全部覆盖） |
| 仿真平台与工具 | ProtoMotions3 / Isaac Lab / Humanoid-Gym / HumanoidBench / BEHAVIOR Robot Suite | （本分类已全部覆盖） |

</details>
