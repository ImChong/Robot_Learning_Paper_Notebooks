---
layout: paper
paper_order: 4
title: "MolmoSpaces: A Large-Scale Open Ecosystem for Robot Navigation and Manipulation"
zhname: "MolmoSpaces：230k+ 室内场景 × 130k+ 物体 × 42M 抓取的全开源具身 AI 评测生态"
category: "Simulation Benchmark"
---

# MolmoSpaces: A Large-Scale Open Ecosystem for Robot Navigation and Manipulation
**MolmoSpaces：面向机器人导航与操作的大规模开放生态**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: 11 Simulation Benchmark · 大规模室内仿真 / 抓取标注 / 多模拟器统一接口 / VLA 基准
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.11337](https://arxiv.org/abs/2602.11337) |
| HTML | [在线阅读 v2](https://arxiv.org/html/2602.11337v2) |
| PDF | [下载](https://arxiv.org/pdf/2602.11337) |
| 项目页 | [allenai.org/blog/molmospaces](https://allenai.org/blog/molmospaces) · [论文页](https://allenai.org/papers/molmospaces) |
| **发布时间** | 2026-02-11 (arXiv) |
| 源码 | [allenai/molmospaces](https://github.com/allenai/molmospaces) |
| Hugging Face | [papers/2602.11337](https://huggingface.co/papers/2602.11337) |
| 提交日期 | 2026-02 |

**作者机构**：**Allen Institute for AI (Ai2)** 等
**配套模型**：[MolmoBot](https://allenai.org/blog/molmobot-robot-manipulation)（同期 Ai2 释出的"完全在仿真里训练"的操作策略）

---

## 🎯 一句话总结

MolmoSpaces 把"做具身 AI 评测要拼数据集、要拼资产、要拼模拟器"这件事一次性解决：开放 **230k+** 室内场景（iTHOR-120 / ProcTHOR-10K / ProcTHOR-Objaverse / Holodeck 四源拼合）、**130k+** 富标注物体（其中 48k 可操作物体附 **42M** 稳定抓取标注），并通过 **simulator-agnostic** 资产格式同时跑通 **MuJoCo / Isaac (Lab & Sim) / ManiSkill** 三大主流仿真器，配套 **MolmoSpaces-Bench**（8 个长程任务）首次报告出**仿真分数与真机成功率 R = 0.96 / ρ = 0.98 的极强 sim-to-real 相关性**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Ai2 | Allen Institute for AI | 论文出品方 |
| VLA | Vision-Language-Action model | 视觉-语言-动作通用机器人模型 |
| ProcTHOR | Procedural THOR | 程序化生成的多房间室内场景生成器 |
| iTHOR | Interactive THOR | 手工搭建的家庭交互场景 |
| Holodeck | LLM-driven 3D scene generator | 文本到 3D 室内场景生成系统 |
| sim-to-real correlation | 仿真分数与真机成功率的统计相关性（R / ρ）|

---

## ❓ 论文要解决什么问题？

当前"在仿真里训通用机器人策略"卡在三件事：

1. **数据规模上不去**：现有家用 / 室内 benchmark（AI2-THOR、RoboCasa、ManiSkill 等）场景数百到几千，**长尾分布严重**，难以训出真正泛化的 VLA；
2. **资产标准散乱**：抓取标注、关节信息、碰撞模型在不同模拟器之间格式各异，**换个模拟器就要重做一次资产**；
3. **评测不可比 / 不对真**：很多 benchmark 缺少配对的真机实验，**仿真上涨点不代表真机也涨**，sim-to-real 相关性没人系统量化过。

MolmoSpaces 的回应：**一次性把数据、资产、模拟器适配、任务定义、真机对照实验全部统一并开源**——让"评测一个新策略"变成"换条命令"。

---

## 🔧 方法 / 数据集 / 评测

### 1. 资产生态（"Open Ecosystem"的核心）

| 维度 | 数量 / 内容 |
|---|---|
| 室内场景 | **230,000+**（iTHOR-120 手工 + ProcTHOR-10K 程序化 + ProcTHOR-Objaverse 增强 + Holodeck LLM 生成）|
| 物体资产 | **130,000+** 富标注 |
| 可操作物体 | **48,000** 附关节 / 物理参数 |
| 抓取标注 | **42M** 稳定抓取（grasps）|
| 场景类型 | 家庭 / 办公室 / 教室 / 医院 / 学校 / 博物馆 等 |
| 资产格式 | **simulator-agnostic**：MuJoCo / Isaac Lab / Isaac Sim / ManiSkill 通用 |

> 💡 与 ProcTHOR 等单一来源 benchmark 的区别：**Holodeck 通过 LLM 生成长尾场景** + **Objaverse 注入大规模 3D 物体**，让分布从"家居样板间"扩展到"博物馆、医院、教室"这类真正长尾的室内空间。

### 2. MolmoSpaces-Bench：8 个任务的统一评测

| 类别 | 任务 |
|---|---|
| 导航 | **navigate-to**（找目标） |
| 静态操作 | **pick**、**open**、**close**、**open-door** |
| 操作 + 空间推理 | **pick-and-place**、**pick-and-place-next-to**、**pick-and-place-color** |

> 这 8 个任务覆盖**短程操作 / 长程移动操作 / 多房间长程任务**三档难度，相同任务可以在 MuJoCo / Isaac / ManiSkill 三个仿真器下各跑一遍——评估"仿真器无关性"。

### 3. 基线策略 & 关键实验

- **基线类型**：state-of-the-art **VLA 模型** + 经典 **模块化基线**（perception → planner → motion）；
- **评测结果**：
  - **sim-to-real 相关性极强**：MolmoSpaces-Bench 分数与真机成功率 **R = 0.96 / Spearman ρ = 0.98**，**pick 任务上 Pearson R² ≈ 0.92**；
  - **新一代 VLA > 旧 VLA**：代代提升明显，但**对 prompt 改写、初始关节位姿、相机遮挡极敏感**——这是论文重点指出的"VLA 脆性"；
  - **分布漂移测试**：指令措辞或初始位姿的微小扰动会让早期 VLA 成功率显著下降，新一代模型更鲁棒但仍未饱和。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SCENES["🏠 场景源（230k+）"]
        S1["iTHOR-120<br/>(手工家庭)"]
        S2["ProcTHOR-10K<br/>(程序化多房)"]
        S3["ProcTHOR-Objaverse<br/>(注入长尾物体)"]
        S4["Holodeck<br/>(LLM 生成)"]
    end

    subgraph ASSETS["📦 资产层"]
        O1["130k+ 物体模型"]
        O2["48k 可操作物体<br/>(关节 / 物理)"]
        O3["42M 稳定抓取标注"]
    end

    subgraph FORMAT["🔌 simulator-agnostic 资产格式"]
        F["统一 metadata + 物理参数 + URDF/MJCF 桥接"]
    end

    subgraph SIM["🧪 多模拟器后端"]
        M1["MuJoCo"]
        M2["Isaac Lab / Sim"]
        M3["ManiSkill"]
    end

    subgraph BENCH["📊 MolmoSpaces-Bench (8 个任务)"]
        B1["navigate-to"]
        B2["pick"]
        B3["pick-and-place / next-to / color"]
        B4["open / close / open-door"]
    end

    subgraph EVAL["🎯 评测对象"]
        E1["VLA 模型"]
        E2["模块化基线"]
        E3["真机对照实验"]
    end

    subgraph OUT["📈 关键发现"]
        R1["sim-real 相关性<br/>R=0.96, ρ=0.98"]
        R2["pick 任务 R²≈0.92"]
        R3["VLA 对 prompt /<br/>初始位姿 / 遮挡敏感"]
    end

    S1 & S2 & S3 & S4 --> ASSETS
    ASSETS --> FORMAT
    FORMAT --> SIM
    SIM --> BENCH
    BENCH --> EVAL
    EVAL --> OUT

    OPEN["📤 全部开源:<br/>资产 + 生成管线 + 基准 + 工具链"]
    OUT --> OPEN

    style SCENES fill:#e8f4fd,stroke:#1f78b4
    style ASSETS fill:#fff7e0,stroke:#d4a017
    style FORMAT fill:#f3e8ff,stroke:#8e44ad
    style SIM fill:#e8fbe8,stroke:#27ae60
    style BENCH fill:#fde8e8,stroke:#c0392b
    style EVAL fill:#fff3e0,stroke:#e67e22
    style OPEN fill:#e0f7fa,stroke:#0097a7
</div>

---

## 💡 核心贡献

1. **史上最大开源室内具身 AI 数据底座**：230k 场景 × 130k 物体 × 42M 抓取，**全部开放下载**，配合生成管线可继续扩充。
2. **simulator-agnostic 资产格式**：同一份场景 / 物体 / 抓取标注**直连 MuJoCo / Isaac / ManiSkill 三大主流仿真器**，研究者不再需要"为每个模拟器重做一次资产"。
3. **MolmoSpaces-Bench**：8 个跨"短程操作 → 长程移动操作 → 多房间任务"的统一基准，覆盖 navigate / pick / place / open-close 全谱。
4. **首次系统量化 sim-to-real 相关性**：R = 0.96 / ρ = 0.98 / 单任务 R² ≈ 0.92——给"仿真分数能不能预言真机表现"一个有量化依据的回答。
5. **暴露 VLA 脆性**：实证发现**指令措辞 / 初始关节位姿 / 相机遮挡**对 VLA 成功率影响极大，指出下一阶段 VLA 鲁棒性研究的具体维度。
6. **完全开放栈**：模型权重（配套 [MolmoBot](https://allenai.org/blog/molmobot-robot-manipulation)）、数据、生成管线、资产、benchmark、工具链**一次性全部公开**——是当前最贴近"具身 AI 的 ImageNet"的开放生态。

---

## 🤖 对人形 / 具身 AI 领域的意义

| 方向 | 含义 |
|---|---|
| **VLA 训练** | 130k 物体 + 42M 抓取直接当 pretrain 监督，缓解机器人数据稀缺 |
| **多模拟器 sim-to-real** | 同份资产跨 MuJoCo / Isaac / ManiSkill 验证一致性，天然形成 dynamics-level DR（与 PolySim 形成互补） |
| **长程任务 benchmark** | 多房间 / 多目标任务终于有公平标尺 |
| **真机预测** | R = 0.96 的强相关性，**让"先在仿真里跑分"变成靠谱的真机预筛** |
| **VLA 鲁棒性研究** | 论文给出的 prompt / 位姿 / 遮挡敏感性，是下一代 VLA 必须解决的 OOD 维度 |
| **生态外溢** | 资产可直接被 04_WBC / 06_Manipulation / 08_Navigation 复用，是"通用底座" |

---

## 🎤 面试参考

**Q：MolmoSpaces 和已有的 ProcTHOR、RoboCasa、HumanoidBench 比，质的差别在哪？**
A：(1) **规模量级**：230k 场景 + 42M 抓取——比 RoboCasa（~1k 场景）和 ProcTHOR（10k 场景）都高 1–2 个数量级。(2) **simulator-agnostic 资产格式**：同一份资产能直接喂 MuJoCo / Isaac / ManiSkill，**没有"换模拟器要重做资产"的工程税**。(3) **首次量化 sim-to-real 相关性**（R = 0.96），让仿真基准对真机的预测价值有可信数字背书，这是之前所有具身 benchmark 缺的关键证据。

**Q：为什么 sim-to-real 相关性能做到 R = 0.96？**
A：核心因素是**资产多样性 + 任务难度匹配**：(1) 230k 场景覆盖家庭/办公/医院/教室等长尾分布，**仿真上能区分的策略差异，真机也保持得住**；(2) 42M 稳定抓取标注让 pick 类任务在仿真里"作弊"空间小；(3) 任务难度梯度合理（短程 → 长程 → 多房间），让分数不至于天花板饱和。但论文也指出这是"在他们设定的真机任务上的相关性"，不代表所有真机场景都能保持。

**Q：论文指出"VLA 对 prompt 改写、初始位姿、相机遮挡敏感"，这对后续工作意味着什么？**
A：意味着**单纯堆数据 / 模型大小不够**——下一代 VLA 必须在三个 OOD 维度上专门加强：(1) 语言鲁棒性（同义指令应得到同等执行）；(2) 物理鲁棒性（初始关节位姿扰动下仍能完成任务）；(3) 感知鲁棒性（部分遮挡 / 视角偏移）。具体到训练范式，可能要引入 prompt augmentation、初始状态域随机化、相机视角随机化等模块。

**Q：MolmoSpaces 跟 GRUtopia 都是大规模室内仿真，怎么取舍？**
A：(1) **GRUtopia** 强调**城市级（多建筑、社会化）**、含 NPC、长程语言任务；(2) **MolmoSpaces** 强调**室内规模（230k 场景）+ 资产精细度（42M 抓取）+ 跨模拟器统一**——更偏向"操作 / 抓取 / 短到中程任务"。如果做服务机器人语义任务用 GRUtopia，做通用操作 / VLA pretrain 用 MolmoSpaces。

---

## 🔗 相关阅读

- [GRUtopia (arXiv 2407.10943)](https://arxiv.org/abs/2407.10943)：城市级具身仿真平台（本仓库已有笔记）
- [HumanoidBench (arXiv 2403.10506)](https://arxiv.org/abs/2403.10506)：人形全身控制基准（本仓库已有笔记）
- [Towards Motion Turing Test (arXiv 2603.06181)](https://arxiv.org/abs/2603.06181)：类人度评估基准（本仓库已有笔记）
- [ProcTHOR (NeurIPS 2022)](https://arxiv.org/abs/2206.06994)：程序化生成的室内场景
- [Objaverse](https://arxiv.org/abs/2212.08051)：开放 3D 物体宇宙，被 MolmoSpaces 用作物体来源
- [Holodeck (CVPR 2024)](https://arxiv.org/abs/2312.09067)：LLM 驱动的 3D 场景生成
- [MolmoBot 官方介绍](https://allenai.org/blog/molmobot-robot-manipulation)：本生态配套的"全仿真训练"操作策略
- [ManiSkill3 (arXiv 2410.00425)](https://arxiv.org/abs/2410.00425)：被 MolmoSpaces 适配的模拟器之一
- [PolySim (arXiv 2510.01708)](https://arxiv.org/abs/2510.01708)：多模拟器联合训练（10_Sim-to-Real 模块姊妹工作）

---

> 备注：本笔记基于 arXiv 摘要、Ai2 官方博客、Hugging Face 论文页与公开技术报道整理。具体每个任务在 MuJoCo / Isaac / ManiSkill 三模拟器下的成功率数值表、各代 VLA（如 OpenVLA / Pi0 / GR00T 等）的逐任务对比、prompt / 初始位姿扰动下的退化曲线等细节，待论文正式 PDF 完整阅读后回填。
