---
layout: paper
title: "HumanoidMimicGen: Data Generation for Loco-Manipulation via Whole-Body Planning"
zhname: "HumanoidMimicGen：用全身规划为「行走+操作」自动生成数据"
category: "Simulation Benchmark"
arxiv: "2605.27724"
---

# HumanoidMimicGen: Data Generation for Loco-Manipulation via Whole-Body Planning
**MimicGen / DexMimicGen 的人形续作：只给「一条带每臂技能标注的源演示」，就能把接触密集的全身技能适配到新物体位姿、并用全身规划把「单/双臂操作」与「行走+操作」串起来，自动合成大规模、稳定且无碰撞的 loco-manipulation 数据；同时配套一个 9 任务的仿真基准来公平评测。**

> 📅 总结日期: 2026-09-14
>
> 🏷️ 板块: 11 Simulation & Benchmark · 数据生成 · loco-manipulation · 全身规划 · 模仿学习 · 仿真基准
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2605.27724](https://arxiv.org/abs/2605.27724) |
| HTML | [在线阅读 v1](https://arxiv.org/html/2605.27724v1) |
| PDF | [下载](https://arxiv.org/pdf/2605.27724) |
| 项目页 | [humanoidmimicgen.github.io](https://humanoidmimicgen.github.io/)（含 9 任务策略回放视频） |
| 源码 | 截至笔记时项目页/论文未给出公开 GitHub 仓库链接；故本篇附的是**据论文描述整理的方法流程 mermaid**，而非源码调用时序图 |
| **发布时间** | 2026-05-26（arXiv v1） |

**作者**：Kevin Lin, Ajay Mandlekar, Caelan Reed Garrett, Nikita Chernyadev, Yu Fang, Runyu Ding, Yuqi Xie, Justin Tran, Linxi Fan, Yuke Zhu
**机构**：NVIDIA（GEAR）· UT Austin —— MimicGen / DexMimicGen 数据生成谱系的人形延伸
**平台**：Unitree G1 人形（上半身关节空间控制 + 下半身由学习式行走策略接收 pelvis 速度指令）· 仿真 + 真机

---

## 🎯 一句话总结

模仿学习要教人形「既会走又会操作」，但演示数据靠遥操作采集**又慢又难**。已有的自动数据生成算法（如 MimicGen）能给**固定基座机械臂**合成演示，可一旦搬到人形就失效——因为人形的动作空间是**手臂 + 腿 + 躯干的高维复合空间**，光把手臂轨迹「搬运」到新场景，脚下的平衡、导航、避障全对不上。

HumanoidMimicGen 的做法是：从**少量源演示**里，把**接触密集的全身技能**适配到新的物体位姿（对物体位姿变化做泛化）；再用**全身运动规划**把「单臂 / 双臂操作技能」与「行走 + 操作」交织起来，从而在多样场景与布局下生成**稳定、无碰撞**的数据。为了评测，作者还建了一个**9 任务的仿真 loco-manipulation 基准**。结果：用它生成的数据**共训（co-train）**出来的全身视觉运动策略，比只用真机数据训练的**成功率高出约 20%（71% vs 51%）**——说明「一条源演示 → 上千条合成演示」的放大是真的有用。

---

## 📌 英文缩写速查

| 缩写 / 术语 | 全称 | 解释 |
|---|---|---|
| Loco-Manipulation | Locomotion + Manipulation | 行走与操作一体：边走边搬/抓/推 |
| MimicGen | —— | 用少量源演示 + 场景适配自动放大操作演示的经典框架（本文前身） |
| DexMimicGen | Dexterous MimicGen | 双手灵巧版数据生成（本文同谱系前作） |
| Whole-Body Planning | 全身规划 | 同时规划手臂/腿/躯干，保证可行、稳定、无碰撞 |
| Source Demonstration | 源演示 | 人给的一条（或少数几条）带每臂技能标注的示范 |
| Co-training | 共训 | 合成（仿真）数据 + 真机数据一起训练策略 |
| VLA | Vision-Language-Action | 视觉-语言-动作策略（论文用作被训练的策略形式之一） |

---

## ❓ 论文要解决什么问题？

**问题陈述**：训练人形做 loco-manipulation，模仿学习是很有希望的路线，但它**吃演示数据**——而人形演示靠遥操作采集，既耗时又难做。

- 现有自动数据生成（MimicGen 系）只对**机械臂**有效：它们把源演示里的操作段**变换/重放**到新物体位姿即可；
- 但人形是**高维复合动作空间（臂 + 腿 + 躯干）**：即使操作段能搬，脚下的**站姿平衡、走位靠近、绕障导航**都得跟着变，简单重放会失稳、穿模、够不到。

**核心问题**：

> 能不能像 MimicGen 那样「一条源演示放大成上千条」，但**放大的是整套「行走 + 操作」的全身行为**，且生成的数据**稳定、无碰撞、可直接拿来训策略**？

---

## 🔧 方法拆解：HumanoidMimicGen

### ① 源演示：一条 + 每臂技能标注

从**一条**遥操作源演示出发，对其做**每臂（per-arm）技能切分与标注**——把整段拆成一系列「单臂 / 双臂」的接触密集操作技能片段。这就是被放大的「种子」。

### ② 技能适配：对物体位姿泛化

对每个操作技能片段，按**新场景里物体的实际位姿**做变换适配，让「抓、举、推、放」这类**接触密集的全身技能**从源状态迁移到新状态，实现跨物体位姿的泛化。

### ③ 全身规划：把「操作」缝进「行走」

用**全身运动规划**在技能片段之间插入并衔接：既做**单臂/双臂操作**的手臂运动规划，又做**行走 + 操作**的移动规划（靠近工作台、绕过货架、调整站位），保证整段轨迹**稳定、无碰撞、运动学/接触可行**。控制上，**上半身用关节空间控制**，**下半身把 pelvis 速度指令交给学习式行走策略**执行。

### ④ 放大与共训

如上把「一条源演示」放大成**多样场景/布局**下的**上千条**合成演示；再用这些仿真数据与真机数据**共训**全身视觉运动策略（含 VLA 形式）。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SRC["① 源演示（少量）"]
        DEMO["1 条遥操作演示"]
        ANNO["每臂技能标注<br/>切成 单臂/双臂 技能片段"]
        DEMO --> ANNO
    end

    subgraph GEN["② 数据生成引擎"]
        ADAPT["技能适配<br/>按新物体位姿变换<br/>接触密集全身技能"]
        WBP["全身规划<br/>操作段 ⟷ 行走段 交织<br/>稳定 · 无碰撞 · 可行"]
        SCENE["多样场景/布局<br/>物体位姿随机化"]
        ANNO --> ADAPT
        SCENE --> ADAPT
        ADAPT --> WBP
    end

    subgraph CTRL["控制约定"]
        UP["上半身：关节空间控制"]
        LOW["下半身：pelvis 速度指令<br/>→ 学习式行走策略"]
    end

    subgraph OUT["③ 放大 → 共训 → 评测"]
        DATASET["~1000 条合成演示<br/>（1 条源演示放大）"]
        POLICY["全身视觉运动策略<br/>（含 VLA）· 仿真+真机共训"]
        BENCH["📊 9 任务仿真基准<br/>共训 71% vs 真机-only 51%（+20%）"]
        WBP --> DATASET --> POLICY --> BENCH
    end

    WBP -. 遵循 .-> UP
    WBP -. 遵循 .-> LOW

    style SRC fill:#e8f4fd,stroke:#1f78b4
    style GEN fill:#fff7e0,stroke:#d4a017
    style CTRL fill:#f7e8fd,stroke:#9b59b6
    style OUT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 🧪 9 任务仿真基准

| # | 任务 | 说明 |
|---|---|---|
| 1 | Box Lift Floor | 从地面抓箱并举到目标高度 |
| 2 | Push Button | 走近工业面板并按下按钮 |
| 3 | Box Lift | 走近桌子、抓箱、举到目标高度 |
| 4 | Push Shelf Forward | 把货架推车推入标记目标区 |
| 5 | Drill Lift | 走近桌子、抓电钻、举起 |
| 6 | Drill PnP | 从一张桌子取电钻放到另一张桌子（pick-and-place） |
| 7 | Box Table To Shelf | 把箱子从桌面转移到货架 |
| 8 | Pick Drill From Holder | 从支架里取出电钻并举起 |
| 9 | Obstacle-Aware Pick Drill | 绕过挡路货架后抓取并举起电钻 |

> 覆盖「走近—抓取—举起—转移—避障」等复合技能，专门考察**行走与操作耦合**的能力。

---

## 💡 核心贡献

1. **面向高维复合动作空间的人形数据生成**：把 MimicGen/DexMimicGen 从「固定基座机械臂」推进到「臂+腿+躯干」的人形 loco-manipulation；
2. **技能适配 + 全身规划**：接触密集技能对物体位姿泛化，再用全身规划把操作与行走交织成稳定、无碰撞的完整轨迹；
3. **一条源演示 → 上千条合成演示**的放大能力，大幅降低对遥操作的依赖；
4. **9 任务仿真基准**：为人形 loco-manipulation 提供可复现的公平评测；
5. **实证**：合成数据与真机共训的全身视觉运动策略较「真机-only」**成功率 +20%（71% vs 51%）**。

---

## 📊 关键设定与结果

| 维度 | 值 |
|---|---|
| 所属方向 | 仿真基准 + 自动数据生成（loco-manipulation） |
| 输入 | 1 条带每臂技能标注的源演示 |
| 产出 | 多样场景下 ~1000 条稳定无碰撞合成演示 |
| 机器人 | Unitree G1 人形（上半身关节控制 / 下半身 pelvis 速度 → 行走策略） |
| 基准 | 9 个 loco-manipulation 任务 |
| 主要结果 | 共训（仿真+真机）比真机-only 平均成功率 71% vs 51%（+20%） |
| 策略形式 | 全身视觉运动策略，含 VLA |

> 📌 精确任务指标、消融（数据规模/规划选项/共训比例）与网络细节请以 arXiv v1 PDF 实验章节为准。

---

## 🤖 对领域的意义

| 方向 | 含义 |
|---|---|
| **补齐人形数据瓶颈** | 遥操作贵、慢，自动放大是把人形模仿学习「喂饱」的关键路径 |
| **规划 × 学习的分工** | 用全身规划保证「可行/稳定/无碰撞」，把学习留给视觉运动策略，二者各展所长 |
| **走操一体的评测标准** | 9 任务基准让「行走+操作」耦合能力可被公平横比，而非各说各话 |
| **与同模块数据生成呼应** | 与 [DexMimicGen](../DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation.md)、[HumanoidGen](../HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning/HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning.md) 共同壮大人形操作/移动操作的数据供给 |

---

## 🎤 面试参考

**Q：MimicGen 那套「重放源演示」为什么直接搬到人形会失败？**
A：因为机械臂是**固定基座**，只要把操作段按新物体位姿做刚体变换重放即可；而人形是**臂+腿+躯干的高维复合体**，操作段一旦位移，脚下的**站位、靠近路径、平衡、避障**都要跟着变。简单重放会失稳、穿模、够不着。HumanoidMimicGen 的关键就是加上**全身规划**，把「怎么走过去、怎么站稳、怎么绕障」和「怎么操作」一起生成。

**Q：它怎么保证生成的数据是「能用」的（稳定、无碰撞）？**
A：靠**全身运动规划**在技能片段间做衔接与可行性约束——运动学可达、接触合理、碰撞免除、且下半身用学习式行走策略执行 pelvis 速度指令来维持平衡。这样放大出来的不是「几何上对但物理上翻车」的轨迹，而是可直接训练的稳定演示。

**Q：为什么强调「共训」而不是纯用合成数据？**
A：合成数据量大但有仿真-真实差距，真机数据真实但稀缺。**共训**把两者互补：合成数据补覆盖与规模，真机数据补真实分布。论文里共训相比真机-only 成功率 +20%（71% vs 51%），说明放大出的数据确实带来了净增益。

**Q：这类工作和「用 LLM 规划生成数据」（如 HumanoidGen）区别在哪？**
A：HumanoidMimicGen 走的是**几何/运动规划 + 源演示适配**路线（MimicGen 谱系），强调物理可行与全身稳定；HumanoidGen 更偏**LLM 语义规划 + MCTS**去生成任务与约束链。两者出发点不同、可互补：一个擅长把「怎么做」放大得可执行，一个擅长把「做什么」拓展得多样。

---

## 🔗 相关阅读

- [DexMimicGen: Automated Data Generation for Bimanual Dexterous Manipulation (2410.24185)](../DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation.md)：同谱系的双手灵巧数据生成前作，本仓库已有笔记
- [HumanoidGen: Data Generation for Bimanual Dexterous Manipulation via LLM Reasoning (2507.00833)](../HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning/HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning.md)：LLM+MCTS 数据生成路线对照，本仓库已有笔记
- [GRAIL: Generating Humanoid Loco-Manipulation from 3D Assets and Video Priors (2606.05160)](../GRAIL__Generating_Humanoid_Loco-Manipulation_from_3D_Assets_and_Video_Priors/GRAIL__Generating_Humanoid_Loco-Manipulation_from_3D_Assets_and_Video_Priors.md)：同为 loco-manipulation 数据生成，本仓库已有笔记
- [SIMPLE: Simulation-Based Policy Learning and Evaluation for Humanoid Loco-manipulation (2606.08278)](../SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation.md)：走操一体的仿真评测平台，本仓库已有笔记
- [BiGym: A Demo-Driven Mobile Bi-Manual Manipulation Benchmark (2407.07788)](../BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark/BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark.md)：作者之一 Nikita Chernyadev 的移动双臂基准，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要、v1 HTML 与项目页整理；**各任务精确指标、消融与网络结构细节**请以 arXiv v1 PDF 为准。截至笔记时未见公开源码仓库，故未附源码运行时序图；若后续开源，可再补充源码调用时序。
