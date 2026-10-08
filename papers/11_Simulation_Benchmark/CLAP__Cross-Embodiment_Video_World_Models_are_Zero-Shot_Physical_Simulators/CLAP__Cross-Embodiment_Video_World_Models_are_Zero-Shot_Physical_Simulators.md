---
layout: paper
paper_order: 11
title: "CLAP: Cross-Embodiment Video World Models are Zero-Shot Physical Simulators"
zhname: "CLAP：跨本体视频世界模型即零样本物理仿真器"
category: "Simulation Benchmark"
---

# CLAP: Cross-Embodiment Video World Models are Zero-Shot Physical Simulators

**CLAP：跨本体视频世界模型即零样本物理仿真器**

> 📅 总结日期: 2026-08-29
>
> 🏷️ 板块: 11 Simulation Benchmark · 跨本体视频世界模型 / 动作条件视频生成 / 潜在动作 / 零样本物理仿真
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2608.27406](https://arxiv.org/abs/2608.27406) |
| HTML | [在线阅读](https://arxiv.org/html/2608.27406) |
| PDF | [下载](https://arxiv.org/pdf/2608.27406) |
| **发布时间** | 2026-08-27（arXiv v1） |
| 项目主页 | [omni-clap.github.io](https://omni-clap.github.io) |
| 源码 | 🌟 [github.com/omni-CLAP/clap](https://github.com/omni-CLAP/clap)（全部代码与模型开源） |
| 模型权重 | [huggingface.co/omni-CLAP/CLAP](https://huggingface.co/omni-CLAP/CLAP) |

**作者团队**：Kechen Liu、Ola Shorinwa。
**许可**：CC BY 4.0。

---

## 📌 名词速查

| 名词 | 解释 |
|---|---|
| 动作条件视频世界模型 (action-conditioned video world model) | 给定当前帧 + 一段动作，生成未来帧的视频模型；可当「会预测未来的仿真器」用 |
| 跨本体 (cross-embodiment) | 一个模型同时吃人类视频、单臂、双臂、人形等不同本体的数据训练 |
| 潜在动作 (latent action, LAM) | 从相邻帧变化里自监督学出的 32 维「代理动作」，无需真实动作标签，让无标注视频也能训 |
| 末端位姿动作 (end-effector, EE) | 7 维笛卡尔位姿 + 夹爪，跨本体通用、可直接对接真机部署 |
| 课程式训练 (curriculum) | 两阶段：先用潜在动作学通用物理先验，再接地到 EE 动作空间做零样本部署 |
| 零样本物理仿真器 | 训好后不针对目标本体微调，也能预测其在给定动作下的物理演化 |

---

## ❓ 要解决什么问题？

当前最强的**动作条件视频模型**几乎都被绑死在**单一机器人本体**上：它们只能吃某一台机器人自己的数据，无法利用互联网规模、跨人类与各种机器人的**海量异构视频**——而这些视频里恰恰藏着学「可泛化物理」的丰富信号。

跨本体学习难在两点：
1. **动作表征差异极大**——不同机器人平台的动作空间（关节/末端/夹爪定义）互不相同；
2. **人类视频根本没有动作标签**——占比最大的一类数据无法直接用作「动作条件」。

CLAP 的洞见是：**支配时空动力学的物理规律与「谁在动」无关**——人推杯子和机械臂推杯子遵循同一套物理。于是它想造一个能横跨人/机器人、把这些异构视频统一起来训练的**跨本体视频世界模型**，训好后可当**零样本物理仿真器**用。

---

## 🔧 CLAP 是怎么做的？

### 1. 用三种动作表征「调和」异构动作空间

CLAP 同时支持三种动作条件，互补短板：

| 条件模式 | 维度/形式 | 作用 |
|---|---|---|
| **末端位姿 EE** | 7 维笛卡尔位姿 + 夹爪 | 跨本体通用、可直接对接真机，做零样本部署 |
| **潜在动作 LAM** | 学出的 32 维嵌入 | 让**无标注视频**（含人类视频）也能作为动作条件参与训练 |
| **语言 Language** | CLIP 编码的逐帧文本描述 | 语义层面的粗粒度动作指令 |

### 2. 课程式跨本体学习：先学物理先验，再接地末端动作

- **阶段一（潜在动作预训练）**：在无标注的跨本体/人类视频上，用 32 维**潜在动作**作为代理条件，学「基础物理先验」——不需要任何真实动作标签，从而吃得下互联网规模数据；
- **阶段二（末端动作接地）**：把学到的物理先验**接地到末端位姿（EE）动作空间**，使模型可**零样本部署**到真实任务；
- 两阶段互补：潜在动作解决「无标签也能训」，末端位姿解决「能落到真机、跨本体通用」。

### 3. 模型骨架与训练数据

- 骨架基于 **SVD（Stable Video Diffusion）式 UNet** + 动作/文本条件注入；
- 训练数据：**Open X-Embodiment (OXE)** + **EgoDex**（人类第一视角，约 100K 步）等；
- 覆盖本体：跨本体、**DROID**、**Bridge/WidowX** 单臂、**YAM** 双臂、**G1 人形**，以及人类第一视角视频。

### 4. 效果

- 在 **DROID** 这类高难环境中，用**更少领域内样本**却能**匹配或超过**最强的单本体视频模型；
- 优势可通过**少样本自适应**进一步放大，形成「用跨本体预训练去训单本体世界模型」的新范式；
- 支持**推理期跨策略规划**（inference-time cross-policy planning），当作世界模型来提升真机基线策略表现；
- 交付了迄今**动作条件空间最全**（末端/语言/潜在）、**本体覆盖最广**（跨本体/DROID/Bridge/双臂 YAM/G1 人形）的一整套视频世界模型。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 异构训练数据"]
        H["人类第一视角视频<br/>EgoDex（无动作标签）"]
        R["机器人数据 OXE<br/>DROID · Bridge · YAM · G1"]
    end

    subgraph ACT["🎛️ 三种动作表征（调和异构动作空间）"]
        L["潜在动作 LAM<br/>自监督 32 维"]
        E["末端位姿 EE<br/>7 维 + 夹爪"]
        T["语言 Language<br/>CLIP 文本"]
    end

    subgraph TRAIN["🎓 课程式跨本体训练"]
        S1["阶段一：潜在动作预训练<br/>学通用物理先验（吃无标注视频）"]
        S2["阶段二：接地末端动作空间<br/>为零样本部署做准备"]
        S1 --> S2
    end

    H -->|无标签→潜在动作| L
    R -->|有末端标签| E
    R --> T
    L --> S1
    E --> S2
    T --> S2

    S2 --> WM["🌍 跨本体视频世界模型<br/>（SVD 式 UNet）"]
    WM --> USE1["零样本物理仿真器<br/>给动作→预测未来帧"]
    WM --> USE2["少样本自适应<br/>→ 新本体（YAM / G1）"]
    WM --> USE3["推理期跨策略规划<br/>提升真机基线策略"]

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style ACT fill:#fde8e8,stroke:#c0392b
    style TRAIN fill:#e8fbe8,stroke:#27ae60
    style WM fill:#fff7e0,stroke:#d4a017
</div>

---

## 🧬 源码运行时序图（依据 [omni-CLAP/clap](https://github.com/omni-CLAP/clap)）

仓库以 `src/clap/` 组织，提供 `clap-train`（训练）、`clap-eval`（PSNR/SSIM/LPIPS/FVD/FID 评测）、`clap-rollout-replay` / `clap-rollout-deploy` / `clap-teleop`（自回归回放 / 策略在环部署 / 键盘遥操作）等入口，配置走 Hydra 式 YAML 组合。下面按「训练 → 评测/回放」的典型流程给出时序：

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户 (examples/*.sh)
    participant CFG as clap.config<br/>(Hydra YAML)
    participant DATA as clap.data<br/>(EE/LAM/Language 条件)
    participant TR as clap.training<br/>(train loop)
    participant M as clap.models<br/>(CLAPModel · SVD-UNet)
    participant CK as checkpoint 管理
    participant RO as clap.rollout / clap.eval

    Note over U,CK: ① 训练阶段（clap-train）
    U->>CFG: 加载 model/data/training/experiment YAML
    CFG->>DATA: 构建数据集与动作条件（7 维 EE / 32 维 LAM / CLIP 文本）
    DATA-->>TR: 批数据 (帧序列 + 动作条件)
    loop 每个训练步
        TR->>M: 前向：当前帧 + 动作 → 预测未来帧
        M-->>TR: 去噪损失（SVD 扩散目标）
        TR->>M: 反向 + 优化器更新
        TR->>CK: 周期性保存 checkpoint + 验证
    end

    Note over U,RO: ② 评测 / 回放（clap-eval / clap-rollout-replay）
    U->>CFG: 指定 checkpoint 与测试集
    CFG->>DATA: clap-build-test-sets 选可复现测试片段
    DATA-->>RO: 真值片段 + 动作序列
    RO->>M: 自回归逐帧预测（replay / deploy）
    M-->>RO: 生成视频帧
    RO-->>U: 指标 (PSNR/SSIM/LPIPS/FVD/FID) 或部署可视化

    Note over RO,M: 部署时 clap.rollout.deploy 可接 openpi / MolmoAct 策略在环
</div>

> 说明：以上时序依据仓库公开的目录结构（`config/ data/ models/ training/ eval/ rollout/ preprocess/`）与入口脚本命名整理，具体张量维度与调度细节以实际代码为准。

---

## 💡 核心贡献与要点

1. **跨本体动作条件视频生成**：首次把动作条件视频模型从「单本体」扩展到「人 + 多种机器人」的互联网规模异构视频。
2. **三表征调和 + 课程式训练**：用「潜在动作（吃无标签）/ 末端位姿（跨本体通用、可部署）/ 语言（语义）」互补短板，先学物理先验再接地末端动作。
3. **世界模型即零样本物理仿真器**：训好后不针对目标本体微调，也能预测其在给定动作下的物理演化，并支持推理期跨策略规划提升真机策略。
4. **最全的一套模型 + 全开源**：动作条件空间（EE/语言/潜在）与本体（跨本体/DROID/Bridge/双臂 YAM/G1 人形）覆盖最广，代码与权重全部开源。

---

## 🤖 对人形 / 具身 AI 领域的意义

| 方向 | 含义 |
|---|---|
| **数据规模突破** | 让占比最大、却没有动作标签的**人类视频**能进入动作条件世界模型训练，绕开「必须逐帧标动作」的瓶颈 |
| **可当仿真器用** | 视频世界模型作为**零样本物理仿真器**，为策略提供「预测未来」的低成本 rollout，减少真机/物理引擎依赖 |
| **人形可迁移** | G1 人形作为受支持本体，少样本自适应即可迁移，验证跨本体先验对人形有效 |
| **规划新范式** | 推理期跨策略规划把世界模型接进控制回路，提升现成策略的表现，指向「世界模型 + 策略」协同 |

---

## 🎤 面试参考

**Q：CLAP 为什么要做「跨本体」，只训单本体视频模型不行吗？**
A：单本体视频模型只能吃某一台机器人自己的数据，规模有限；而互联网规模的人类与各种机器人视频里藏着学「可泛化物理」的丰富信号。CLAP 的核心洞见是物理规律与「谁在动」无关，于是想把这些异构视频统一起来训练。难点在于不同本体动作空间差异大、人类视频没动作标签——CLAP 用「潜在动作 + 末端位姿 + 语言」三种表征来调和，并证明跨本体预训练反而能在 DROID 上用更少领域内样本匹配甚至超过单本体模型。

**Q：潜在动作（LAM）和末端位姿（EE）各自解决什么问题？为什么要两阶段？**
A：潜在动作是从相邻帧变化里自监督学出的 32 维代理动作，不需要真实动作标签，让无标注的人类视频也能作为动作条件参与训练，负责「学通用物理先验」；末端位姿是 7 维笛卡尔位姿 + 夹爪，跨本体通用且能直接对接真机，负责「能落地部署」。两阶段课程先用潜在动作在海量无标签数据上学物理先验，再接地到末端动作空间做零样本部署，既吃得下大数据又能迁到真机。

**Q：「视频世界模型当零样本物理仿真器」在实际中怎么用？**
A：给定当前帧和一段候选动作，模型能生成未来帧，相当于预测「这么做会发生什么」。这可以在推理期做跨策略规划——用世界模型评估/挑选候选动作来提升现成基线策略的表现，也可以为策略学习提供低成本的想象 rollout，减少对真机或传统物理引擎的依赖；且因为是跨本体训练，换到 YAM 双臂或 G1 人形只需少样本自适应。

---

## 🔗 相关阅读

- [CLAP 项目主页](https://omni-clap.github.io)：视频演示与模型说明
- [Generative World Modelling for Humanoids: 1X World Model（本仓库已有笔记）](../Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report/Generative_World_Modelling_for_Humanoids__1X_World_Model_Challenge_Technical_Report.html)：人形世界模型技术报告
- [Humanoid World Models（本仓库已有笔记）](../Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics/Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics.html)：人形开放世界基础模型
- [SIMPLE（本仓库已有笔记）](../SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation.html)：面向全身移动操作的混合仿真评测平台

---

> 备注：本笔记基于 arXiv 摘要、项目主页与开源仓库结构整理。潜在动作模型的具体训练目标、SVD-UNet 条件注入细节、各数据集的定量指标与跨策略规划的完整实验，待完整阅读正式 PDF 后回填；源码运行时序图依据仓库公开目录与入口脚本命名，实现细节以实际代码为准。
