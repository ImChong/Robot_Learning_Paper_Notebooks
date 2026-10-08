---
layout: paper
title: "BFM-Zero: A Promptable Behavioral Foundation Model for Humanoid Control Using Unsupervised Reinforcement Learning"
zhname: "BFM-Zero：用无监督强化学习的前向-后向表征打造「可提示」的人形全身控制行为基础模型"
category: "Loco-Manipulation and WBC"
---

# BFM-Zero: A Promptable Behavioral Foundation Model for Humanoid Control Using Unsupervised Reinforcement Learning

**BFM-Zero：可提示的人形行为基础模型**

> 📅 阅读日期: 2026-08-11
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 行为基础模型(BFM) · 无监督 RL · Forward-Backward 表征 · 零样本提示 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 6 日（arXiv v1） |
| arXiv | [2511.04131](https://arxiv.org/abs/2511.04131) · [PDF](https://arxiv.org/pdf/2511.04131) · [HTML](https://arxiv.org/html/2511.04131v1) |
| 项目页 | [lecar-lab.github.io/BFM-Zero](https://lecar-lab.github.io/BFM-Zero/) |
| 代码 | 🌟 [LeCAR-Lab/BFM-Zero](https://github.com/LeCAR-Lab/BFM-Zero)（预训练权重 + 部署代码，deploy 分支；CC BY-NC 4.0） |
| 会议 | ICLR 2026 Poster · [OpenReview](https://openreview.net/forum?id=jkhl2oI0g5) |
| 作者 | Yitang Li、Zhengyi Luo、Tonghe Zhang、Cunxi Dai、Anssi Kanervisto、Andrea Tirinzoni、Haoyang Weng、Kris Kitani、Mateusz Guzek、Ahmed Touati、Alessandro Lazaric、Matteo Pirotta、Guanya Shi |
| 机构 | CMU LeCAR Lab（Guanya Shi）× Meta FAIR |
| 主题 | cs.RO / cs.LG · 人形全身控制 · 行为基础模型 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 第 83 项（PROGRESS.md 同号）。

---

## 🎯 一句话总结

> 以往人形 RL 控制器大多是「一个任务训一套策略」：要追踪动作、要走到目标、要满足某个奖励，各训各的，泛化差、复用难。BFM-Zero 想做的是**一个可提示的行为基础模型**——预训练阶段**不给任务奖励**，用无监督 RL 的 **Forward-Backward（FB）表征**学出一个把「动作 / 目标 / 奖励」都编码进去的**统一、平滑、可解释**的隐空间 z；部署时只要把想要的东西转成一个 z 向量喂给同一个策略 π(·|z)，就能**零样本**完成动作追踪、目标到达、奖励优化，还能用少量仿真搜索做 few-shot 微调。最终在 Unitree G1 上跑出跳舞、拳击、行走、抗推抗拉等多种鲁棒全身技能。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| BFM | Behavioral Foundation Model，行为基础模型：一个可提示、覆盖多任务的通用控制模型 |
| FB | Forward-Backward 表征：前向 F(s,a,z) + 后向 B(s)，把状态转移分解到隐空间 |
| z | 任务隐编码：动作 / 目标 / 奖励都被投影成同一空间中的一个向量 |
| Unsupervised RL | 无监督 RL：预训练不依赖任务标注奖励，学到覆盖多行为的通用策略/表征 |
| Zero-shot | 零样本：新任务只需算出对应 z，不再重新训练 |
| Asymmetric Actor-Critic | 非对称 Actor-Critic：Critic 可见特权/历史信息，Actor 只用可部署观测 |

---

## ❓ 论文要解决什么问题？

- **专才 vs 通才**：主流人形 RL 是任务专用的——换个任务（追踪某段舞蹈、走到某个点、最小化某个代价）几乎都要重训一套策略，既贵又难复用。
- **缺少「可提示」的统一接口**：动作追踪、目标到达、奖励优化在传统框架里是**互不相通**的三套流程，没有一个统一的表示能同时承载它们。
- **无监督 RL 落地真机难**：FB 这类无监督 RL 表征此前多停留在仿真/小规模，直接迁到高维、易失稳的人形真机会遇到 sim-to-real 鸿沟。

BFM-Zero 的目标：**训练一次**，得到一个能被「动作 / 目标 / 奖励」任意提示、且能在真机稳定运行的人形全身控制基础模型。

---

## 🧠 核心方法

### ① Forward-Backward（FB）无监督表征
FB 模型学两个互补部分：**前向 F(s, a, z)** 预测在隐编码 z 下的未来占用，**后向 B(s)** 把状态编码进共享隐空间，两者满足占用度量 P(s'|s,a,z) ≈ F(s,a,z)ᵀ B(s')。好处是：任意奖励 r 的 **Q 函数天然写成 Q_z = Fᵀz**，无需显式奖励监督即可在预训练中学到覆盖大量行为的策略族 π(·|z)。

### ② 统一隐空间：动作 / 目标 / 奖励同构成 z
- **目标到达**：目标姿态 s_g 直接 z = B(s_g)；
- **动作追踪**：把未来 N 帧折扣求和 z_t = Σ λⁿ B(s_{t+n})；
- **奖励优化**：对任意奖励 r，z = Σ B(sᵢ) r(sᵢ)。
三类任务被投影到**同一个平滑、可解释**的隐空间，靠切换 z 而非重训来切换行为，还能在 z 上做球面插值（slerp）实现技能间自然过渡。

### ③ Sim-to-Real 的三板斧
为把无监督 RL 表征迁到 Unitree G1 真机，加入：**奖励塑形（reward shaping）**引导预训练、**域随机化（domain randomization）**提鲁棒、**历史相关的非对称学习**（Critic 用特权/历史信息、Actor 只用可部署观测）。

### ④ Few-shot 适配
借助隐空间的平滑性，在仿真里做**基于搜索的优化**快速找到更优 z，用极少代价把某个下游任务再拔高一截。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PRE["🧪 预训练（无监督 RL · 无任务奖励）"]
        FB["Forward-Backward 模型<br/>F(s,a,z) · B(s)"]
        POL["策略族 π(·#124;z)<br/>Q_z = Fᵀz"]
        FB --> POL
        SR["奖励塑形 + 域随机化<br/>+ 非对称 Actor-Critic"] -.-> POL
    end

    POL --> LAT["🌐 统一隐空间 z<br/>动作 / 目标 / 奖励同构"]

    subgraph PROMPT["🎛️ 提示方式（把需求转成 z）"]
        G["目标到达<br/>z = B(s_g)"]
        T["动作追踪<br/>z = Σ λⁿ B(s_{t+n})"]
        R["奖励优化<br/>z = Σ B(sᵢ)r(sᵢ)"]
        F2["few-shot 搜索<br/>仿真里优化 z"]
    end

    LAT --> PROMPT
    PROMPT --> PI["🤖 单策略 π(a#124;s,z)"]
    PI --> ROBOT["🦿 Unitree G1 真机<br/>跳舞/拳击/行走/抗推拉"]

    style PRE fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style LAT fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style PROMPT fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style ROBOT fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 🧩 源码运行时序（mermaid）

> 基于官方仓库 [LeCAR-Lab/BFM-Zero](https://github.com/LeCAR-Lab/BFM-Zero) README 的工作流整理：环境安装（uv）→ 无监督预训练 →（不同提示方式）计算隐编码 z → 仿真/ONNX 推理 → 真机部署（deploy 分支）。实际脚本参数以仓库为准。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant ENV as uv 环境
    participant TR as humanoidverse.train
    participant CKPT as model/（FB 权重）
    participant INF as *_inference（tracking/goal/reward）
    participant SIM as MuJoCo / IsaacSim
    participant G1 as Unitree G1（deploy 分支）

    Note over U,ENV: 步骤 1 · 安装环境
    U->>ENV: uv sync（安装 humanoidverse 依赖）
    ENV-->>U: 就绪

    Note over U,TR: 步骤 2 · 无监督预训练 FB 模型
    U->>TR: uv run python -m humanoidverse.train<br/>（TrainConfig：steps/envs/buffer/motion 数据）
    TR-->>CKPT: 输出 F/B/π 权重（Q_z = Fᵀz）

    Note over U,INF: 步骤 3 · 按提示方式算隐编码 z
    U->>INF: tracking_inference（z=ΣλⁿB(s)）<br/>goal_inference（z=B(s_g)）<br/>reward_inference（z=ΣB(s)r(s)）
    INF->>CKPT: 加载 model_folder 权重
    INF-->>U: 得到任务隐编码 z + 导出 ONNX 到 exported/

    Note over U,SIM: 步骤 4 · 仿真验证
    U->>SIM: --simulator mujoco --save_mp4
    SIM-->>U: 回放动作追踪/目标到达/奖励优化结果

    Note over U,G1: 步骤 5 · 真机部署
    U->>G1: 加载 ONNX 策略 π(a#124;s,z)，切换 z 即切换行为
    G1-->>U: 零样本执行 + 抗推/抗拉/抗踢鲁棒恢复
</div>

---

## 📊 实验与结果（要点）

- **一策略多任务**：同一个 π(·|z) 通过切换 z，零样本完成**动作追踪**（跳舞、拳击、多种行走变体）、**目标到达**（姿态间平滑过渡）与**奖励优化**（多种 locomotion / 手臂控制任务）。
- **鲁棒性**：真机在**重推、踢击、地面牵拉**等强扰动下稳定恢复；抗扰动过程中还**涌现出跑步**等未显式训练的行为。
- **隐空间性质**：z 空间**平滑、可解释**，支持球面插值（slerp）做技能组合与行为多样性调节；few-shot 搜索可在极短时间内进一步优化。
- **平台**：Unitree G1 人形，真实世界部署。

---

## 💡 核心贡献

1. **首个在真人形上跑通的可提示行为基础模型**：把无监督 RL 的 FB 表征从仿真推进到 Unitree G1 真机；
2. **动作 / 目标 / 奖励统一到一个隐空间 z**：三类下游任务用同一策略、零样本切换，无需重训；
3. **一整套 sim-to-real 配方**：奖励塑形 + 域随机化 + 历史相关非对称学习，弥合无监督 RL 表征的真机鸿沟；
4. **开源**：预训练权重与部署代码公开（CC BY-NC 4.0），可作人形全身控制的通用先验底座。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **通用控制底座** | 「训练一次、提示复用」范式让一个策略承载多任务，替代大量任务专用策略 |
| **无监督 RL 落地** | FB / 无监督 RL 首次在高维人形真机跑通，为「行为基础模型」提供可复制配方 |
| **统一接口** | 动作追踪 / 目标到达 / 奖励优化被统一成「算一个 z」，上层规划器只需产出隐编码 |
| **平滑隐空间** | z 上可插值/搜索，为技能组合、快速适配与安全边界探索提供结构化抓手 |

---

## ⚠️ 局限与可改进点

- **表达上限受预训练数据/奖励塑形影响**：z 空间能覆盖的行为取决于预训练时见过的动作与塑形设计，超出分布的新技能仍可能力不从心；
- **FB 表征训练成本与稳定性**：前向-后向联合学习对超参、缓冲区规模敏感，大规模训练工程量不小；
- **奖励优化质量依赖 B 的采样近似**：z = Σ B(s)r(s) 是对目标奖励的线性近似，复杂/非线性目标可能需 few-shot 搜索补偿；
- **代码分阶段释出**：当前主要放出权重与部署代码，完整训练/分布式训练仍在陆续开源中。

---

## 🎤 面试参考

**Q：BFM-Zero 和传统「一个任务一套策略」的 RL 有何本质区别？**
A：它在预训练阶段**不用任务奖励**，用无监督 RL 的 FB 表征学一个策略族 π(·|z)；任意奖励的 Q 函数可写成 Fᵀz，于是新任务只需算出对应 z 就能零样本执行，而不是重训策略。

**Q：为什么 FB 表征能同时表示动作、目标和奖励？**
A：后向模型 B(s) 把状态编码进共享隐空间，目标 = B(s_g)、动作追踪 = 未来帧 B 的折扣和、奖励 = 以奖励为权的 B 加权和——三者都落回同一个 z 空间，因而能被同一策略消费。

**Q：无监督 RL 表征迁到真机最难的是什么？他们怎么解决？**
A：难在 sim-to-real 与稳定性。方案是奖励塑形引导预训练、域随机化提鲁棒、以及历史相关的非对称 Actor-Critic（Critic 用特权/历史信息、Actor 只用可部署观测）。

**Q：z 空间平滑有什么用？**
A：可在 z 上做球面插值实现技能自然过渡与组合，也能做基于搜索的 few-shot 优化在仿真里快速找到更优行为。

---

## 🔗 相关阅读

- [Behavior Foundation Model for Humanoid Robots](../../03_High_Impact_Selection/Behavior_Foundation_Model_for_Humanoid_Robots/Behavior_Foundation_Model_for_Humanoid_Robots.html) — 行为基础模型主线，BFM 概念对照
- [HOVER: Versatile Neural Whole-Body Controller](../../03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html) — 多模式统一全身控制器对照
- [General Humanoid Whole-Body Control via Pretraining and Fast Adaptation](../General_Humanoid_Whole-Body_Control_via_Pretraining_and_Fast_Adaptation/General_Humanoid_Whole-Body_Control_via_Pretraining_and_Fast_Adaptation.html) — 「预训练 + 快速适配」思路对照

---

> 备注：本笔记基于 arXiv 摘要、项目页与官方仓库 [LeCAR-Lab/BFM-Zero](https://github.com/LeCAR-Lab/BFM-Zero) README 整理。方法命名（Forward-Backward 表征、统一隐空间 z、非对称 Actor-Critic）与公式（Q_z = Fᵀz、z = B(s_g)、z = Σ λⁿ B(s_{t+n})、z = Σ B(s)r(s)）以官方 PDF 为准。源码运行时序图依据仓库 README 的安装—预训练—提示推理—部署流程绘制，实际脚本参数以仓库为准。
