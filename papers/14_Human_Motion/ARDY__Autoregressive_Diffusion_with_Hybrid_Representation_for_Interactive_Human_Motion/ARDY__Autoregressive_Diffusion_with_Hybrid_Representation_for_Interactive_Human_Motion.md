---
layout: paper
title: "ARDY: Autoregressive Diffusion with Hybrid Representation for Interactive Human Motion Generation"
zhname: "ARDY：自回归扩散 + 混合表征，做可实时交互的人体动作生成"
category: "Human Motion"
---

# ARDY: Autoregressive Diffusion with Hybrid Representation for Interactive Human Motion Generation
**ARDY：自回归扩散 + 混合表征，做可实时交互的人体动作生成**

> 📅 阅读日期: 2026-07-30
>
> 🏷️ 板块: 14 Human Motion · 可交互动作生成 / 自回归扩散 / 混合表征 / 流式实时
>
> 🔁 推进轨: 模块轮转（13_Physics-Based_Animation → **14_Human_Motion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2607.08741](https://arxiv.org/abs/2607.08741) |
| HTML | [在线阅读](https://arxiv.org/html/2607.08741v1) |
| PDF | [下载](https://arxiv.org/pdf/2607.08741) |
| 项目页 | [research.nvidia.com/labs/sil/projects/ardy](https://research.nvidia.com/labs/sil/projects/ardy/) |
| 源码 | 🌟 [github.com/nv-tlabs/ardy](https://github.com/nv-tlabs/ardy)（含推理/交互 Demo/生成脚本，模型自动从 HuggingFace 下载；代码 Apache-2.0，模型 NVIDIA Open Model Agreement） |
| 作者 | Kaifeng Zhao, Mathis Petrovich, Haotian Zhang, Tingwu Wang, Siyu Tang, Davis Rempe |
| 机构 | NVIDIA · ETH Zürich（Switzerland） |
| 发表 | **SIGGRAPH 2026（ACM Transactions on Graphics）** |
| 平台 | 27 关节统一比例骨架 · 4 步扩散 · 平均延迟 ~33ms |
| **发布时间** | 2026-07-09（arXiv v1） |

---

## 🎯 一句话总结

想在动画、游戏、仿真、人形机器人里**实时**生成逼真的 3D 人体动作，一直有个两难：**离线**方法（如运动扩散模型）能靠文本 + 运动学约束做精确控制，但推理太慢、跟不上交互；**在线**方法能实时出动作，却往往牺牲可控性，或因上下文窗口有限而处理不好复杂文本语义与长时程目标。ARDY 用一个**流式生成框架**弥合这道鸿沟：① **混合表征**——用**显式的根（root）特征**保证轨迹/朝向的精确可控，用**隐式的身体隐嵌入**保证生成高效自然；② **两阶段自回归 Transformer 去噪器**——支持**可变历史上下文**，并能条件于**灵活的长时程运动学约束**（根路径/航点、全身关键帧、稀疏关节位姿）；③ **4 步扩散**把单步生成延迟压到平均 **33ms**，从而能实时响应鼠标/键盘等在线用户输入。在 HumanML3D 与大规模高保真的 **Bones Rigplay** 动捕数据集上，动作质量与约束遵从度都很强。

---

## ❓ 要解决什么问题？

- **离线 vs 在线的矛盾**：离线运动生成可控但慢，无法交互；在线生成快但可控性差、难处理复杂文本与长时程目标。
- **上下文窗口受限**：很多流式方法只能看很短的历史，导致长动作前后不连贯、跟不上「先走到门口再蹲下」这类长时程指令。
- **控制与效率的表征取舍**：纯隐空间表征利于快速生成但难做精确轨迹控制；纯显式表征利于控制但生成负担重、不易学。

**目标**：做一个**既能实时流式出动作、又能被在线文本与灵活运动学约束精确控制**、并支持长时程目标的统一框架。

---

## 🔧 方法核心

### ① 混合运动表征（Hybrid Representation）
把一帧动作拆成两部分：
- **显式根特征（explicit root）**：世界系下的根平移/朝向等，直接、可解释，便于施加**轨迹/航点/路径跟随**这类精确空间约束；
- **隐式身体嵌入（latent body embedding）**：身体其余自由度压进一个学习到的隐空间，利于**高效且自然**的生成学习。

> 直觉：用显式根管「人往哪走、朝哪转」，用隐嵌入管「身体怎么动得自然」，各取所长。

### ② 两阶段自回归 Transformer 去噪器（Two-Stage AR Denoiser）
自回归地一段段生成动作，去噪器具备：
- **可变历史上下文（variable history context）**：按需回看更长/更短的历史，兼顾连贯性与效率；
- **灵活的长时程运动学约束条件**：训练时直接从真值位姿采样文本标签 + 运动学约束（根路径、全身关键帧、稀疏关节位姿/旋转）并作为条件，让模型**原生**学会「可控生成」，从而支持**在线提示**与**灵活长时程目标**。

### ③ 少步扩散做实时（4-step, ~33ms）
高效的 **4 步扩散**采样把每次生成的平均延迟压到约 **33ms**，配合自回归流式结构，可实时响应鼠标/键盘等在线交互输入。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["🕹️ 在线交互输入"]
        TXT["文本提示<br/>（可随时切换）"]
        KIN["运动学约束<br/>根路径/航点·全身关键帧·稀疏关节"]
        MK["鼠标/键盘<br/>运动控制"]
    end

    subgraph REP["🧬 混合表征"]
        ROOT["显式根特征<br/>精确轨迹/朝向控制"]
        LAT["隐式身体嵌入<br/>高效自然生成"]
    end

    subgraph GEN["🔁 两阶段自回归扩散去噪器"]
        HIST["可变历史上下文"]
        DN["4 步扩散去噪<br/>~33ms/段"]
        HIST --> DN
    end

    HistFrames["已生成动作历史"] --> HIST
    IN --> REP
    REP --> GEN
    GEN --> OUT["下一段动作<br/>（根 + 身体）"]
    OUT -->|"自回归回灌"| HistFrames
    OUT --> RENDER["实时渲染 / 驱动角色"]

    style IN fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style REP fill:#e6e0f7,stroke:#6a4caf,color:#2a1a4a
    style GEN fill:#e0f7fa,stroke:#0097a7,color:#003f47
    style RENDER fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
</div>

---

## 🧩 源码运行时序（mermaid）

> 基于官方仓库 [nv-tlabs/ardy](https://github.com/nv-tlabs/ardy) README 的工作流整理：安装 → （可选）文本编码器服务 → 批量生成 / 交互 Demo → 可视化。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant ENV as conda/pip 安装
    participant TE as run_text_encoder_server.py
    participant GEN as generate.py
    participant DEMO as run_demo.py
    participant HF as HuggingFace（权重）
    participant VIS as visualize.py

    Note over U,ENV: 步骤 1 · 安装环境
    U->>ENV: conda create -n ardy python=3.11<br/>pip install -e ".[all]" + hf auth login
    ENV-->>U: 就绪（含运动修正 C++ 扩展）

    Note over U,TE: 步骤 2 · 可选启动文本编码器服务（后台）
    U->>TE: python scripts/run_text_encoder_server.py
    TE-->>U: 提供 Llama-3-8B 文本条件编码

    Note over U,GEN: 步骤 3a · 批量生成
    U->>GEN: generate.py "A person walks in a circle."<br/>--model core --duration 8.0 --seed 0
    GEN->>HF: 首次自动下载 ARDY-Core / ARDY-G1 权重
    HF-->>GEN: 模型 ckpt
    GEN-->>U: outputs/output.npz

    Note over U,DEMO: 步骤 3b · 交互 Demo（在线文本/关键帧/路径/鼠标键盘）
    U->>DEMO: python scripts/run_demo.py → http://localhost:2333
    DEMO->>HF: 加载权重
    loop 流式自回归（~33ms/段）
        U->>DEMO: 在线文本 / 运动学约束 / 鼠标键盘
        DEMO-->>U: 实时生成下一段动作
    end

    Note over U,VIS: 步骤 4 · 可视化
    U->>VIS: python scripts/visualize.py outputs/output.npz
    VIS-->>U: http://localhost:2334 查看结果
</div>

---

## 📊 实验与结果

- **HumanML3D 基准**：沿用 Guo et al. (2022) 协议，用 **FID**（分布相似度）与 **Top-3 R-precision**（文本-动作对齐）评测；论文指出该基准部分指标已「饱和」（有方法在 R-precision 上甚至超过真值数据），因此额外引入更大规模数据评测。
- **Bones Rigplay 动捕数据集**：大规模、高保真商用级动捕，来自 **150+** 名参与者，重定向到**统一比例 27 关节骨架**便于学习；用于在**隔离专有数据影响**的受控设置下评估动作质量与运动学约束遵从度。
- **效率**：**4 步扩散**，单段平均生成延迟 **~33ms**，支撑实时交互。
- **交互 Demo**：展示动态文本控制、多样关键帧位姿约束、路径跟随、以及**鼠标/键盘**的交互式行走控制，验证方法的实用通用性。
- **消融**：验证混合表征（隐身体 + 显式根）、全局→局部转换、两阶段去噪器设计各自的贡献。

---

## 💡 核心贡献

1. **混合「隐身体 + 显式根」表征**：兼顾快速生成与精确可控，是可交互动作生成的关键设计；
2. **两阶段自回归 Transformer 去噪器**：可变历史上下文 + 灵活长时程运动学约束条件，原生支持在线提示与长时程目标；
3. **实时流式框架**：4 步扩散把延迟压到 ~33ms，实现由在线文本/关键帧/路径/鼠标键盘驱动的实时交互动作合成；
4. **开源 + 大规模评测**：放出代码与预训练模型，并在 HumanML3D 与商用级 Bones Rigplay 动捕数据集上系统验证。

---

## 🤖 对人形机器人的启示

| 方向 | 影响 |
|---|---|
| **实时可控运动源** | 33ms 级流式生成可作人形上层「动作指挥」的实时参考轨迹源，供下层追踪控制器跟踪 |
| **显式根 + 隐身体** | 「用显式量控轨迹、用隐空间保自然」的拆分，天然契合人形「先定根轨迹再解全身」的分层控制直觉 |
| **长时程约束条件** | 支持根路径/航点/关键帧的条件生成，方便把导航/任务目标编码成运动学约束下发 |
| **少步扩散做实时** | 4 步扩散是「扩散模型上机载实时」的一条工程路径，对预算受限的机载推理有借鉴价值 |

---

## ⚠️ 局限与可改进点

- **纯运动学、无物理**：ARDY 生成的是运动学动作，不含接触/动力学约束，直接用于真机仍需下游物理追踪与稳定控制；
- **依赖数据规模与骨架**：高保真效果部分来自商用 Bones Rigplay 数据与统一 27 关节骨架，跨骨架/跨形态的迁移需验证；
- **文本编码器较重**：在线文本控制依赖 Llama-3-8B 级编码器，端侧部署有算力/内存成本；
- **评测基准饱和**：HumanML3D 指标已趋饱和，动作可控性与真实性的更细粒度评价仍是开放问题。

---

## 🎤 面试参考

**Q：离线动作生成和在线（流式）动作生成的核心矛盾是什么？ARDY 怎么弥合？**
A：离线方法可控但慢、不能交互；在线方法快但可控性差、上下文短。ARDY 用自回归流式结构 + 4 步扩散把延迟压到 ~33ms 做到实时，同时通过混合表征与「条件于灵活运动学约束」的两阶段去噪器保住可控性与长时程目标。

**Q：为什么要用「显式根 + 隐式身体」的混合表征，而不是全隐或全显？**
A：全隐空间利于高效自然生成但难做精确轨迹控制；全显式利于控制但生成负担重、不易学。混合表征让显式根管精确轨迹/朝向、隐嵌入管身体自然度，取二者之长。

**Q：它是怎么支持长时程目标和在线文本切换的？**
A：去噪器带可变历史上下文，能回看较长历史保持连贯；训练时直接从真值采样文本标签与运动学约束（根路径/关键帧/稀疏关节）作为条件，使模型原生学会可控生成，因而推理时可在线切换文本、施加长时程约束。

**Q：4 步扩散为什么重要？**
A：标准扩散采样步数多、延迟高，无法交互；把采样压到 4 步使单段生成 ~33ms，配合自回归流式结构才能实时响应鼠标/键盘等在线输入。

---

## 🔗 相关阅读

- [OmniControl: Control Any Joint at Any Time (ICLR 2024)](../OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation/OmniControl__Control_Any_Joint_at_Any_Time_for_Human_Motion_Generation.html) — 同为「任意关节运动学约束」的可控动作生成，离线扩散路线的对照
- [Kimodo: Scaling Controllable Human Motion Generation](../Kimodo__Scaling_Controllable_Human_Motion_Generation/Kimodo__Scaling_Controllable_Human_Motion_Generation.html) — 同为 NVIDIA 系可控运动扩散，数据/骨架规模化视角对照
- [PRIMAL: Physically Reactive and Interactive Motor Model for Avatar Learning](../PRIMAL__Physically_Reactive_and_Interactive_Motor_Model_for_Avatar_Learning/PRIMAL__Physically_Reactive_and_Interactive_Motor_Model_for_Avatar_Learning.html) — 同走「可交互 avatar 实时驱动」路线
- [Guided Motion Diffusion (ICCV 2023)](../Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis/Guided_Motion_Diffusion_for_Controllable_Human_Motion_Synthesis.html) — 可控人体动作扩散的代表工作
- [HumanML3D](../HumanML3D/HumanML3D.html) — ARDY 主基准数据集

---

> 备注：本笔记基于 arXiv 摘要、HTML v1 与官方仓库 [nv-tlabs/ardy](https://github.com/nv-tlabs/ardy) README 整理，方法命名（混合表征、两阶段自回归去噪器、4 步扩散）与关键数字（延迟 ~33ms、Bones Rigplay 150+ 人 / 27 关节）以官方 PDF 为准。源码运行时序图依据仓库 README 的安装—服务—生成/Demo—可视化流程绘制，实际脚本参数以仓库为准。
