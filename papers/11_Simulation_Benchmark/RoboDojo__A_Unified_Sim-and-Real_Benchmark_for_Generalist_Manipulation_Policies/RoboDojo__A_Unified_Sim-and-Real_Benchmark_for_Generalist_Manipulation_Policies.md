---
layout: paper
paper_order: 12
title: "RoboDojo: A Unified Sim-and-Real Benchmark for Comprehensive Evaluation of Generalist Robot Manipulation Policies"
zhname: "RoboDojo：统一「仿真+真机」评测通用机器人操作策略的基准"
category: "Simulation Benchmark"
---

# RoboDojo: A Unified Sim-and-Real Benchmark for Comprehensive Evaluation of Generalist Robot Manipulation Policies
**RoboDojo：统一「仿真+真机」评测通用机器人操作策略的基准**

> 📅 阅读日期: 2026-08-07
>
> 🏷️ 板块: 11 Simulation & Benchmark · 通用操作策略 · Sim-and-Real 评测 · VLA · 排行榜
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2607.04434](https://arxiv.org/abs/2607.04434) |
| HTML | [在线阅读](https://arxiv.org/html/2607.04434v1) |
| PDF | [下载](https://arxiv.org/pdf/2607.04434) |
| **发布时间** | 2026-07（arXiv） |
| 源码 | 🌟 [RoboDojo-Benchmark/RoboDojo](https://github.com/RoboDojo-Benchmark/RoboDojo)（评测框架，仿真侧入口开源） |
| 策略集成 | [XPolicyLab](https://xpolicylab.github.io/)（统一 30 个策略的训练/部署/评测模板） |
| 项目页 / 排行榜 | [robodojo-benchmark.com](https://robodojo-benchmark.com/) · [Leaderboard](https://robodojo-benchmark.com/leaderboard) |

**作者**：Tianxing Chen、Yue Chen、Zixuan Li 等（44+ 作者，共同一作 3 人）

**机构**：MMLab@HKU、UC Berkeley、清华、北大、Stanford、MIT 等多机构联合

**机器人**：仿真用 ARX X5 双臂平台；真机评测覆盖 **ARX X5 / Piper / Piper X** 三种双臂协作平台（本版本聚焦桌面双臂，非人形全身控制）

---

## 🎯 一句话总结

> 通用机器人操作策略（尤其是 VLA）越来越多，但**怎么公平、全面、可复现地评测它们**却缺一把统一的尺子——仿真评测便宜但和真机脱节，真机评测真实但难复现、难横向比较。RoboDojo 给出一个**统一「仿真 + 真机」基准**：仿真侧 **42 个任务**按 **泛化 / 记忆 / 精度 / 长时程 / 开放语义** 五个能力维度组织；真机侧 **18 个任务**用 **RoboDojo-RealEval** 标准化硬件/布局/光照/复位并支持云端远程评测、三人双盲打分；通过 **XPolicyLab** 把 **30 个策略**统一成「同一套观测-动作接口」，做到**一次接入、仿真真机都能评**。结果很扎心：最强策略仿真成功率仅 **8.80%**、真机 **12.8%**，而人类专家分别为 **76%/100%**——当前通用策略离「可靠完成多样操作」还很远。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Generalist Policy | 通用（操作）策略，一个模型应对多任务 |
| VLA | Vision-Language-Action，视觉-语言-动作模型 |
| Sim-and-Real | 仿真 + 真机双轨评测 |
| RealEval | RoboDojo 的标准化真机评测系统 |
| XPolicyLab | 统一策略集成/训练/部署/评测的基础设施 |
| Long-Horizon | 长时程，多子步骤顺序任务 |
| Open-Semantic | 开放语义，未见指令/技能重组 |

---

## ❓ 论文要解决什么问题？

通用操作策略层出不穷，但**评测体系割裂**：

- **仿真评测**：便宜、可并行、可复现，但**任务单一**、和真机存在 sim-real gap，容易「刷仿真分」；
- **真机评测**：真实，但**硬件/布局/光照/复位难标准化**，不同论文各评各的，**没法横向比较**，且复现成本高；
- **策略接口不统一**：每个策略的数据格式、观测-动作接口、部署方式都不一样，**换一个策略就要重接一遍**。

RoboDojo 要的是一把**统一的尺子**：既有仿真的规模与可复现，又有真机的真实性，还能**一次接入、处处评测**，并沿**多个能力维度**给出细粒度诊断，而不是只报一个总成功率。

---

## 🔧 方法详解

### 1. 五个能力维度（仿真 42 任务）

不只报「成功率」，而是把任务按**能力**切分，暴露策略到底强在哪、弱在哪：

| 维度 | 任务数 | 考什么 |
|---|---|---|
| **泛化 Generalization** | 12 | 对未见背景/光照/杂物/目标物体的鲁棒（含标准 + 随机化两档） |
| **记忆 Memory** | 6 | 长上下文观测建模、关键帧记忆、非马尔可夫决策 |
| **长时程 Long-Horizon** | 8 | 推断任务结构、维持进度、完成所有子步骤 |
| **精度 Precision** | 8 | 细粒度定位、轨迹平滑、富接触控制稳定性（严格空间容差） |
| **开放语义 Open** | 8 | 未见任务规格，需技能重组 + 开放语义 grounding |

### 2. 异构并行仿真（Heterogeneous Parallel Simulation）

不是把同一个环境复制 N 份，而是**共享一套向量化接口、每个并行环境各自独立采样场景配置**——不同实例的物体几何、杂物布局、铰接结构、任务设计都不同。既保住并行评测的效率，又保住评测所需的**多样性**。任务从 **YAML 规格**实例化（定义资产、布局、随机化范围、成功条件），共 **2100 次 episode**（42 任务 × 50 次），报成功率与平均分。

### 3. RoboDojo-RealEval（真机 18 任务）

标准化真机评测系统，把「难复现」打成「可复现」：

- 机器人与相机用**模块化结构件固定安装**，统一工作区布局、光照、复位流程；
- **触屏界面**管理场景，靠**视觉叠加回放**布局做一致初始化；
- 支持**本地与云端远程评测**；
- **三名独立评审双盲打分**，同时算最终成功与中间子步骤完成度；
- 每个策略每任务 10 次、跨三平台各 6 任务。

### 4. XPolicyLab（一次接入、处处评测）

统一 30 个策略的**数据转换 + 训练模板 + 观测-动作接口 + 部署流程 + 评测脚本**。策略在仿真里快速拿反馈训练，再以**最小的策略侧改动**部署到真机。集成一个策略只需提供两份文件：启动策略服务器的 `eval.sh` 与声明服务器配置的 `deploy.yml`——「integrate once, evaluate everywhere」。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph TASK["📦 任务与配置"]
        YAML["YAML 任务规格<br/>资产/布局/随机化/成功条件"]
        DIM["五能力维度<br/>泛化·记忆·精度·长时程·开放"]
    end

    subgraph SIM["🟦 仿真评测 (Isaac Sim · 42 任务)"]
        HET["异构并行仿真<br/>各环境独立采样场景"]
        EP["2100 episodes<br/>成功率 + 平均分"]
    end

    subgraph REAL["🟧 RoboDojo-RealEval (18 任务)"]
        HW["标准化硬件/布局/光照/复位<br/>ARX X5 · Piper · Piper X"]
        BLIND["三人双盲打分<br/>成功 + 子步骤完成度"]
        CLOUD["本地 / 云端远程评测"]
    end

    subgraph POL["🟩 XPolicyLab (30 策略)"]
        IFACE["统一观测-动作接口<br/>eval.sh + deploy.yml"]
    end

    TASK --> SIM
    TASK --> REAL
    POL -->|一次接入| SIM
    POL -->|处处评测| REAL
    SIM --> BOARD["📊 公开排行榜<br/>五维细粒度诊断"]
    REAL --> BOARD

    style TASK fill:#fff7e0,stroke:#d4a017
    style SIM fill:#e8f4fd,stroke:#1f78b4
    style REAL fill:#fde8e8,stroke:#c0392b
    style POL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style BOARD fill:#e8fdf0,stroke:#27ae60,color:#145a32
</div>

---

## 🧑‍💻 源码运行时序图（mermaid）

> 基于开源仓库 [RoboDojo-Benchmark/RoboDojo](https://github.com/RoboDojo-Benchmark/RoboDojo)：仿真侧入口 `scripts/robodojo.sh`（公开评测入口）与 `scripts/eval_policy.sh`（仿真客户端，由 XPolicyLab 的 `eval.sh` 拉起）；任务逻辑在 `task/RoboDojo/`、模拟器与管理器在 `env/`、配置在 `env_cfg/`。策略服务器归属 [XPolicyLab](https://xpolicylab.github.io/)，每个策略各带一份 `eval.sh` / `deploy.yml`。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户
    participant X as XPolicyLab/policy/&lt;name&gt;/eval.sh
    participant PS as 策略服务器
    participant RD as scripts/robodojo.sh
    participant EP as scripts/eval_policy.sh (仿真客户端)
    participant ENV as env/ 模拟器管理器
    participant CFG as env_cfg/ + task/RoboDojo/*.yaml

    U->>X: 启动策略服务器 (deploy.yml)
    X->>PS: 加载策略权重, 监听观测请求
    U->>RD: 运行公开评测入口
    RD->>EP: 拉起仿真客户端
    EP->>CFG: 读取任务 YAML (资产/布局/随机化/成功条件)
    EP->>ENV: 异构并行实例化场景 (各环境独立采样)

    loop 每个 episode (共 42×50)
        loop 每步
            ENV-->>EP: 观测 (多相机 RGB + 本体状态)
            EP->>PS: 请求动作 (统一观测-动作接口)
            PS-->>EP: 返回动作
            EP->>ENV: step, 判定成功条件
        end
        EP->>RD: 记录成功率 / 平均分
    end

    RD->>U: 汇总五维得分 → 排行榜
</div>

---

## 💡 核心贡献

1. **统一「仿真 + 真机」基准**：60 个任务（42 仿真 + 18 真机），一套体系兼顾规模/可复现与真实性；
2. **五能力维度细粒度诊断**：泛化 / 记忆 / 精度 / 长时程 / 开放语义，不再只看单一成功率；
3. **异构并行仿真**：共享向量化接口 + 各环境独立场景，兼顾效率与多样性；
4. **RoboDojo-RealEval**：标准化真机硬件/布局/光照/复位 + 云端远程 + 三人双盲，让真机评测**可复现、可横比**；
5. **XPolicyLab + 公开排行榜**：统一 30 个策略接口，「一次接入、处处评测」，配系统性排行榜与分析。

---

## 📊 关键发现（数值以原文为准）

**仿真（评测 30 个策略）**

| 项目 | 最强策略 | 人类专家 |
|---|---|---|
| 成功率 | **8.80%**（Hy-Embodied-0.5-VLA） | 76.03% |
| 平均分 | 13.07 | 80.42 |

- **泛化崩塌**：场景随机化后性能掉 **67–100%**，即便最强方法在随机设定下也只剩标准设定的约 **33%**；
- **精度瓶颈**：细粒度任务上最强方法（X-VLA）成功率仅 **12%**；
- **开放语义几乎失效**：最佳成功率仅 **1.67%**，暴露「开放指令 ↔ 视觉可供性 ↔ 可执行动作」对齐能力的缺失；
- **长时程/记忆**：有专门记忆结构的方法有改善但仍不可靠。

**真机（10 策略 · 180 次试验）**

| 项目 | 最强策略 | 人类 |
|---|---|---|
| 成功率 | **12.8%**（π0.5） | 100% |
| 平均分 | 22.9 | — |

- **执行瓶颈**：分数普遍高于成功率，说明策略常「开了头却完不成」；
- **平台差异 + 仿真-真机错位**：部分策略真机排名高于仿真，佐证仿真与真机是**互补**而非替代的评测视角。

> 📌 结论：当前通用操作策略在各能力维度上进展**参差不齐**，离「跨多样场景可靠完成任务」仍有明显差距。

---

## 🤖 对仿真 / 基准领域的意义

| 方向 | 含义 |
|---|---|
| **能力维度而非单一成功率** | 把「泛化/记忆/精度/长时程/开放」拆开评，能定位策略短板，指导有针对性的改进 |
| **仿真-真机互补** | 二者排名不完全一致 → 应双轨评测，避免只刷仿真分或只报单点真机 demo |
| **可复现真机评测** | 标准化硬件/布局 + 云端远程 + 双盲打分，是真机基准从「难横比」走向「可横比」的关键工程 |
| **统一策略接口** | XPolicyLab 的「一次接入、处处评测」降低了社区横向对比 VLA 的门槛 |

---

## 🔗 相关阅读

- **同模块 · 人形/操作基准**：[SIMPLE（人形移动操作仿真评测）](../SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation/SIMPLE__Simulation-Based_Policy_Learning_and_Evaluation_for_Humanoid_Loco-manipulation.html) · [Labimus（化学实验室灵巧操作基准）](../Labimus__A_Simulation_and_Benchmark_for_Humanoid_Dexterous_Manipulation_in_Chemical_Lab/Labimus__A_Simulation_and_Benchmark_for_Humanoid_Dexterous_Manipulation_in_Chemical_Lab.html) · [MolmoSpaces（大规模导航+操作生态）](../MolmoSpaces__A_Large-Scale_Open_Ecosystem_for_Robot_Navigation_and_Manipulation/MolmoSpaces__A_Large-Scale_Open_Ecosystem_for_Robot_Navigation_and_Manipulation.html)
- **同模块 · 通用任务仿真**：[RoboCasa（日常任务大规模仿真）](../RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots/RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots.html) · [ManiSkill-HAB](../ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks/ManiSkill-HAB__A_Benchmark_for_Low-Level_Manipulation_in_Home_Rearrangement_Tasks.html)

---

> 备注：本笔记基于 arXiv 摘要 + HTML 全文 + 开源仓库结构整理；数值指标以原文/PDF 为准。源码运行时序图依据 [RoboDojo-Benchmark/RoboDojo](https://github.com/RoboDojo-Benchmark/RoboDojo) 的 `scripts/robodojo.sh` / `scripts/eval_policy.sh` / `env/` / `task/RoboDojo/` 结构及 XPolicyLab 策略集成方式绘制，内部实现细节以仓库最新代码为准。
