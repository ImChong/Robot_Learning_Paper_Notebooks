---
layout: paper
paper_order: 10
title: "SIMPLE: Simulation-Based Policy Learning and Evaluation for Humanoid Loco-manipulation"
zhname: "SIMPLE：面向人形机器人全身移动操作的仿真策略学习与评测平台"
category: "Simulation Benchmark"
---

# SIMPLE: Simulation-Based Policy Learning and Evaluation for Humanoid Loco-manipulation

**SIMPLE：面向人形机器人全身移动操作的仿真策略学习与评测平台**

> 📅 阅读日期: 2026-07-06
>
> 🏷️ 板块: 11 Simulation Benchmark · 混合仿真平台 / 全身移动操作 / VLA 评测基准 / Sim-to-Real 相关性
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2606.08278](https://arxiv.org/abs/2606.08278) |
| HTML | [在线阅读 v1](https://arxiv.org/html/2606.08278) |
| PDF | [下载](https://arxiv.org/pdf/2606.08278) |
| **发布时间** | 2026-06-06（arXiv） |
| 项目主页 | [psi-lab.ai/SIMPLE](https://psi-lab.ai/SIMPLE/) |
| 源码 | 🌟 [physical-superintelligence-lab/SIMPLE](https://github.com/physical-superintelligence-lab/SIMPLE) |

**作者团队**：Songlin Wei、Zhenhao Ni、Jie Liu、Zhenyu Zhao、Junjie Ye、Hongyi Jing、Junkai Xia、Xiawei Liu、Michael Leong、Liang Heng、Di Huang、Yue Wang 等。
**机构**：南加州大学 **Physical Superintelligence（PSI）Lab**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Loco-manipulation | Locomotion + Manipulation | 移动操作：把「走位/全身平衡」与「双手操作」耦合在一起完成任务 |
| VLA | Vision-Language-Action model | 视觉-语言-动作大模型，直接从图像+指令输出动作 |
| WAM | World-Action Model | 世界动作模型，边「想象未来」边输出动作（如 DreamZero） |
| HSSD | Habitat Synthetic Scenes Dataset | 高质量合成室内场景数据集，本文取 50 个完整场景 |
| CoACD | Collision-Aware Convex Decomposition | 碰撞感知凸分解，把复杂网格拆成凸块以稳定接触仿真 |
| USD | Universal Scene Description | Pixar/NVIDIA 的场景描述格式，Isaac Sim 渲染用 |
| CuRobo | CUDA Robot motion generation | GPU 加速运动规划库，用于自动生成轨迹 |
| LeRobot | Hugging Face LeRobot format | 通用机器人轨迹数据格式，两条管线统一导出用 |

---

## ❓ 要解决什么问题？

人形基础模型（VLA / 世界模型）越来越多，但**怎么公平、可复现地比较它们**却是个空白：

- **真机评测**贵、难复现、还有安全与硬件维护成本；
- 现有仿真基准大多面向**桌面机械臂或轮式底盘**，缺少针对「**全身移动操作**」——即行走、全身平衡与灵巧操作三者耦合——的可扩展、可复现基准。

SIMPLE 的目标就是补上这块：**把数据采集、训练、公平对比统一到一个 full-stack 仿真平台里**。

---

## 🔧 SIMPLE 是怎么搭的？

### 1. 混合双引擎：物理与渲染解耦

核心设计是「**物理算一份、画面渲一份**」：

- **MuJoCo** 负责全部刚体动力学、接触求解与机器人控制（接触保真度高 → 行走/平衡稳）；
- **Isaac Sim** 负责**光线追踪的真实感渲染**（视觉多样 → 感知更鲁棒）；
- 每个仿真步在两个引擎间**同步物理状态**，兼得「接触物理准」与「画面真实」。

平台用标准 **OpenAI Gym 接口**；采用**解耦的全身控制**：高层策略（如 VLA）预测上半身的运动学轨迹 + 底盘导航指令，底层跟踪控制器以更高频率执行、负责保持平衡。

### 2. 规模：60 任务 / 50 场景 / 1000+ 物体

| 维度 | 内容 |
|---|---|
| 任务 | **60** 个全身移动操作任务：刚体抓放、非抓握式（non-prehensile）交互、铰接物体操作 |
| 场景 | **50** 个完整室内环境（来自 **HSSD**） |
| 物体 | **1500+** 资产：1000+ 来自 **Objaverse**、53+ 来自 **GraspNet-1B**；统一经 **CoACD** 凸分解稳定接触，转 **USD** 高清渲染 |

### 3. 两条数据生成管线

- **① 运动规划自动生成**：用 **CuRobo** 生成运动学轨迹；物体先在 MuJoCo 里「掉落」找稳定放置位姿，再由 **BoDex** 合成可行抓取；脚本化策略把任务拆成原子动作并协调底盘移动。产量 **24–59 条/小时**。
- **② 低延迟 VR 遥操作**：操作员戴 **PICO XR** 头显、接收 MuJoCo 的第一视角立体视频；手部经 IK 重定向到上半身，全身跟踪策略自动管平衡与行走。产量 **156–310 条/小时**——因为省了真机复位与硬件维护，**比真机遥操作快约 1.5×**（抓放任务 310 vs 207 条/小时）。

两条管线都导出**统一的 LeRobot 格式**，累计采集 **6000+ 条轨迹**。

### 4. 三档难度评测协议

| 档位 | 变化 |
|---|---|
| Level 0 | 加入随机干扰物 |
| Level 1 | 视觉随机化（材质 / 光照） |
| Level 2 | 空间随机化（物体 / 机器人位姿变动） |

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph ENGINE["🧩 混合双引擎（物理/渲染解耦）"]
        M["MuJoCo<br/>刚体动力学 · 接触 · 控制"]
        I["Isaac Sim<br/>光追真实感渲染"]
        M <-->|每步同步物理状态| I
    end

    subgraph ASSET["📦 大规模环境"]
        A1["60 全身移动操作任务"]
        A2["50 室内场景 (HSSD)"]
        A3["1500+ 物体<br/>Objaverse+GraspNet → CoACD → USD"]
    end

    subgraph DATA["🛠️ 两条数据管线 → LeRobot 格式"]
        D1["① 运动规划自动生成<br/>CuRobo + BoDex · 24–59/h"]
        D2["② VR 遥操作<br/>PICO XR + IK · 156–310/h"]
    end

    ENGINE --> DATA
    ASSET --> DATA
    DATA -->|6000+ 轨迹| TRAIN["训练策略"]

    subgraph POLICY["🤖 被测策略（8 类基线）"]
        P1["VLA: Ψ₀ / π₀.₅ / GR00T-N1.6"]
        P2["世界动作模型: DreamZero"]
        P3["模仿: ACT / Diffusion Policy"]
        P4["第一视角/人增强: EgoVLA / H-RDT / InternVLA-M1"]
    end

    TRAIN --> POLICY
    POLICY --> EVAL["📊 三档难度评测<br/>L0 干扰物 / L1 视觉 / L2 空间"]
    EVAL --> S2R["✅ 排名与真机高度相关<br/>零样本迁移：抓放 90%→80%，交接 100%→80%"]

    style ENGINE fill:#e8f4fd,stroke:#1f78b4
    style ASSET fill:#e8fbe8,stroke:#27ae60
    style DATA fill:#fde8e8,stroke:#c0392b
    style POLICY fill:#f3e8ff,stroke:#8e44ad
    style S2R fill:#fff7e0,stroke:#d4a017
</div>

---

## 💡 核心贡献与要点

1. **统一混合平台**：首个把「接触物理保真（MuJoCo）」与「真实感渲染（Isaac Sim）」拼在一起、面向**全身移动操作**的 full-stack 仿真框架，标准化数据采集→训练→公平对比。
2. **大规模环境**：60 任务 + 50 场景 + 1500+ 物体，配自动 + 遥操作两条管线，产出 6000+ 轨迹。
3. **Sim-to-Real 相关性**：仿真里的策略排名与前作真机实验高度吻合；且**仿真训练的策略可零样本迁移真机**（抓放 90%→80%、交接 100%→80%）——证明它是可信的真机评测代理。
4. **广覆盖基线**：一口气评了 VLA（Ψ₀ 最强，2.5B）、世界动作模型（DreamZero 泛化强）、模仿学习（ACT 因数据高效意外能打）等 8 类主流范式。

---

## 🤖 对人形 / 具身 AI 领域的意义

| 方向 | 含义 |
|---|---|
| **可复现评测** | 给「全身移动操作」这一空白领域补上统一标尺，降低各说各话的评测乱象 |
| **混合仿真范式** | 「物理引擎管接触 + 渲染引擎管画面」是兼顾稳定行走与鲁棒感知的高性价比路线 |
| **数据飞轮** | 自动 + VR 两条管线让仿真数据比真机采集更快更省，可持续喂 VLA / WAM |
| **真机代理** | 强 sim-real 相关性意味着可先在仿真里筛模型，减少昂贵真机试验 |
| **基础模型竞技场** | 为 Ψ₀ / π₀.₅ / GR00T / DreamZero 等提供同台竞技的公平擂台 |

---

## 🎤 面试参考

**Q：为什么 SIMPLE 要同时用 MuJoCo 和 Isaac Sim，而不用其中一个？**
A：两者各有所长。MuJoCo 的接触求解精度高，全身移动操作里行走/平衡对接触极敏感，用它算物理更稳；Isaac Sim 的光追渲染真实、视觉多样，利于感知策略的鲁棒学习。SIMPLE 让物理与渲染解耦、每步同步状态，等于「物理算一份、画面渲一份」，同时拿到接触保真与视觉真实，避免单引擎在其中一头妥协。

**Q：为什么强调 sim-to-real 相关性，它是怎么验证的？**
A：仿真基准的价值在于「能不能替真机说话」。SIMPLE 一方面显示各基线在仿真里的**排名**和前作真机实验高度一致，另一方面做了零样本迁移测试——仿真训练的策略直接上真机，抓放 90%→80%、交接 100%→80%，说明仿真表现是真机表现的可信代理，可以先在仿真里低成本筛模型。

**Q：两条数据管线的取舍是什么？**
A：运动规划自动生成（CuRobo+BoDex）无需人力、可大规模跑，但受限于脚本化策略、产量偏低（24–59 条/h）且多样性有限；VR 遥操作靠人类操作员，动作更自然多样、产量高（156–310 条/h，比真机遥操作快约 1.5×，因为省了物理复位与硬件维护），但需要人在环。二者互补：自动管线铺量、遥操作补质与难例，统一导出 LeRobot 格式便于混训。

---

## 🔗 相关阅读

- [SIMPLE 项目主页](https://psi-lab.ai/SIMPLE/) / [GitHub 仓库](https://github.com/physical-superintelligence-lab/SIMPLE)：内置对 Ψ₀ / π₀.₅ / GR00T / DreamZero 等主流 VLA 的支持
- [Ψ₀（本仓库已有笔记）](../../04_Loco-Manipulation_and_WBC/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation/Ψ₀__An_Open_Foundation_Model_Towards_Universal_Humanoid_Loco-Manipulation.html)：SIMPLE 里最强的开放全身移动操作基础模型
- [Genie Sim 3.0（本仓库已有笔记）](../../06_Manipulation/Genie_Sim_3.0__A_High-Fidelity_Comprehensive_Simulation_Platform_for_Humanoid_Robot/Genie_Sim_3.0__A_High-Fidelity_Comprehensive_Simulation_Platform_for_Humanoid_Robot.html)：基于 Isaac Sim 的一体化人形操作仿真平台
- [HumanoidBench (arXiv 2403.10506)](https://arxiv.org/abs/2403.10506)：全身控制基准，本仓库已有笔记
- [MolmoSpaces (arXiv 2602.11337)](https://arxiv.org/abs/2602.11337)：大规模室内仿真生态，本仓库已有笔记
- [Objaverse](https://objaverse.allenai.org/) / [HSSD](https://3dlg-hcvc.github.io/hssd/)：SIMPLE 的物体与场景资产来源

---

> 备注：本笔记基于 arXiv 摘要、HTML 全文与项目主页 / GitHub 说明整理。各任务/难度档的逐项成功率曲线、状态同步的实现细节、底层全身跟踪控制器结构与更完整的基线超参，待完整阅读正式 PDF 后回填。
