---
layout: paper
paper_order: 2
title: "GRUtopia: Dream General Robots in a City at Scale"
zhname: "GRUtopia：城市级交互式 3D 社会，给通用机器人造一座可训练的「乌托邦」"
category: "Simulation Benchmark"
---

# GRUtopia: Dream General Robots in a City at Scale
**GRUtopia：城市级交互式 3D 社会，给通用机器人造一座可训练的「乌托邦」**

> 📅 阅读日期: 2026-05-17
>
> 🏷️ 板块: 11 Simulation Benchmark · 城市级仿真 / 服务型场景 / 具身 AI
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2407.10943](https://arxiv.org/abs/2407.10943) |
| HTML | [在线阅读](https://arxiv.org/html/2407.10943v1) |
| PDF | [下载](https://arxiv.org/pdf/2407.10943) |
| **发布时间** | 2024-07-15 (arXiv) |
| 源码 | [OpenRobotLab/GRUtopia](https://github.com/OpenRobotLab/GRUtopia)（现已更名 InternUtopia，2.2.x 维护中） |
| HuggingFace | [papers/2407.10943](https://huggingface.co/papers/2407.10943) |
| 提交日期 | 2024-07 |

**作者**：Hanqing Wang, Jiahe Chen, Wensi Huang, Qingwei Ben, Tai Wang, Boyu Mi, Tao Huang, Siheng Zhao, Yilun Chen, Sizhe Yang, Peizhou Cao, Wenye Yu, Zichao Ye, Jialun Li, Junfeng Long, Zirui Wang, Huiling Wang, Ying Zhao, Zhongying Tu, Yu Qiao, Dahua Lin, Jiangmiao Pang 等

**机构**：**上海人工智能实验室 OpenRobotLab**（核心团队）· 香港中文大学 · 浙江大学 等

**底座**：NVIDIA Omniverse **Isaac Sim 4.5.0**（Python 3.10、Ubuntu 20/22）

---

## 🎯 一句话总结

GRUtopia 把"具身 AI 仿真"从「**单一房间 / 厨房**」直接拉到「**89 类、10 万张精标注交互场景拼成的城市**」，再叠加一个 **LLM 驱动的 NPC 社会（GRResidents）**给机器人「派活、对话、评估」，最后用 **GRBench（Object Loco-Nav / Social Loco-Nav / Loco-Manip）**给腿式机器人一个统一打分台——首次回答了「通用机器人在服务场景里到底能不能像在仿真城市里那样跑起来」这件事。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| NPC | Non-Player Character | 非玩家角色，借自游戏概念，本文用 LLM 扮演 |
| Loco-Nav | Locomotion + Navigation | 移动+导航复合任务 |
| Loco-Manip | Locomotion + Manipulation | 移动+操作复合任务 |
| Sim2Real | Simulation-to-Real | 仿真到真实迁移 |
| Embodied AI | - | 具身智能，把语言/视觉模型放到带身体的智能体上 |
| Isaac Sim | - | NVIDIA Omniverse 旗下的高保真机器人仿真平台 |

---

## ❓ 论文要解决什么问题？

通用人形 / 服务机器人最大的瓶颈是「**数据**」：

1. **真实数据成本爆炸**：让一台 Unitree G1 真去 100 个餐厅、超市、医院跑路，成本与人力不可承受；
2. **现有仿真集中"住宅化"**：HabitatHM3D / Replica / iGibson 大多是「家」，但通用机器人首先要落地的恰恰是**餐厅、超市、办公、博物馆、医院**等**服务型场景**；
3. **缺"社会性"**：真正的服务任务都带交互——人下指令、人提问、人评价。现有仿真基本是「死的」3D 模型，没有"住户"；
4. **基准割裂**：导航是导航、操作是操作，缺一个让腿式机器人**复合任务**统一打分的台子。

GRUtopia 的回答：**直接做一座"仿真城市 + 仿真居民 + 统一打分台"**——场景叫 **GRScenes**，居民叫 **GRResidents**，打分台叫 **GRBench**。

---

## 🏗 三件套：GRScenes / GRResidents / GRBench

### 1. GRScenes：10 万张精标注交互场景，89 个场景类

- **规模**：约 **100k 交互式精标注场景**，可自由拼接成城市级环境；
- **覆盖**：**89 个场景类别**，包括**餐厅、超市、办公室、图书馆、博物馆、医院、展览馆、游乐园、住宅**等服务型空间——相比 HM3D / Replica 的"住宅压倒性"，GRScenes 把"通用机器人首先要去的地方"补齐了；
- **交互性**：每件家具 / 道具都有精细的物理属性、关节定义、可交互标签，机器人可以**真的去开门、推椅子、捡杯子**，而不是只能"走过去"；
- **发行**：在 GitHub 仓库中以 **full（约 80 GB）/ mini（约 500 MB）** 两档释出，CC-BY-NC-SA 4.0。

### 2. GRResidents：LLM 驱动的 NPC 社会

GRResidents 给每个场景安排了一群"虚拟居民"，由 **LLM（GPT-4 / Qwen 等）**扮演，负责三件事：

| 角色 | 做什么 |
|---|---|
| **任务生成器** | 根据场景上下文自动生成任务，如「帮我把厨房柜台上的那个白色杯子拿过来」 |
| **社交对话方** | 给机器人提供自然语言指令、回答问题、模拟人类交互行为 |
| **评估员** | 任务执行结束后做"语义级"评估（不仅看坐标是否到位，也看是不是真的完成了用户意图） |

这把"基准"从过去的「数据集 + 评分脚本」升级成「**一个会说话、会派活、会打分的仿真社会**」，使**长时序、多轮、社交化任务**第一次有了统一容器。

### 3. GRBench：腿式机器人三大复合任务

GRBench 以**腿式机器人**（Unitree H1 / G1、Fourier GR1 等）为主角，分三档难度：

| 任务族 | 内容 | 评测重点 |
|---|---|---|
| **Object Loco-Navigation** | "走到那个物体边上" | 长距离移动 + 视觉物体识别 + 语义对齐 |
| **Social Loco-Navigation** | 跟随/避让/接近 NPC | 移动 + 社交感知 + 动态决策 |
| **Loco-Manipulation** | 移动到位 → 抓 / 放 / 推 | 行走稳定性 + 末端控制 + 任务规划 |

> 📌 关键点：任务全部要求「**先走过去、再做事**」——这才是通用服务机器人真正的工作模式，也是过去任何一个 benchmark（Manipulation only / Navigation only）都没单独覆盖的部分。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph CITY["🏙️ GRScenes 城市级场景库"]
        S1["🍽 餐厅"]
        S2["🛒 超市"]
        S3["🏢 办公"]
        S4["🏥 医院"]
        S5["🏠 住宅"]
        SN["…89 类场景<br/>100k 精标注"]
    end

    subgraph NPC["🤖 GRResidents（LLM 驱动 NPC）"]
        GEN["📝 任务生成<br/>(自然语言指令)"]
        DLG["💬 对话与社交<br/>(多轮交互)"]
        EVAL["📊 语义评估<br/>(任务是否真正完成)"]
    end

    subgraph BENCH["🎯 GRBench（腿式机器人三大基准）"]
        T1["🚶 Object Loco-Nav<br/>找到目标物体"]
        T2["👥 Social Loco-Nav<br/>跟随/避让 NPC"]
        T3["🦾 Loco-Manipulation<br/>走过去 + 抓放推"]
    end

    subgraph AGENT["🦿 机器人智能体"]
        R1["Unitree H1 / G1"]
        R2["Fourier GR1"]
        R3["Franka 等机械臂"]
        POLICY["🧠 策略<br/>(VLM / RL / Diffusion)"]
        R1 & R2 & R3 --> POLICY
    end

    SIM["⚙️ Isaac Sim 4.5.0<br/>(高保真物理 + 渲染)"]

    CITY --> SIM
    NPC --> SIM
    SIM --> AGENT
    AGENT --> BENCH
    BENCH -- 任务派发 --> NPC
    NPC -- 评估反馈 --> BENCH

    style CITY fill:#e8f4fd,stroke:#1f78b4
    style NPC fill:#fff7e0,stroke:#d4a017
    style BENCH fill:#fde8e8,stroke:#c0392b
    style AGENT fill:#f3e8ff,stroke:#8e44ad
    style SIM fill:#e8fbe8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **第一个"城市级"具身仿真社会**：从「家」走向「服务型城市」，89 类场景把通用机器人最该练的地方补齐。
2. **LLM 把"任务/评估"也仿真了**：以前是人写 reward / metric，现在 NPC 自己派活 + 自己打分，**长尾任务可无限扩展**。
3. **腿式机器人的复合任务基准**：第一次把 Loco-Nav 与 Loco-Manip 放在同一座舞台，特别适配人形 / 四足。
4. **底座可用**：Isaac Sim 4.5.0 + Gym 兼容（v2.0+）+ Python 3.10，开发者门槛低；mini 包 500 MB 即可跑通 demo。
5. **生态延伸**：后续衍生 **InternNav**（导航专项）与 **InternManip**（操作专项），形成"GRUtopia 内核 + 专项 benchmark"的双层结构。

---

## 📊 关键能力 vs 现有仿真

| 维度 | HabitatHM3D / Replica | iGibson / Robocasa | **GRUtopia** |
|---|---|---|---|
| 场景类型 | 住宅为主 | 厨房 / 住宅 | **89 类服务场景** |
| 场景数量 | ~1k 级 | ~100 级 | **100k** |
| 交互性 | 弱（多为静态） | 中（部分关节） | **精标注 + 可操作** |
| NPC / 社交 | 无 | 无 | **LLM 驱动 NPC** |
| 复合任务 | 导航为主 | 操作为主 | **Loco-Nav + Loco-Manip** |
| 机器人 | 轮式 / 浮动相机 | 主要轮式 | **腿式优先**（H1 / G1 / GR1） |

> 📌 这是「具身 AI 仿真」的一次代际跳跃：场景从「家」到「城」、智能体从「机器人」到「社会」、评估从「坐标」到「语义」。

---

## 🤖 对人形 / 通用机器人领域的意义

| 方向 | 含义 |
|---|---|
| **训练数据飞轮** | 10 万级场景 + 自动任务生成 = 接近无限的"虚拟数据" |
| **VLM/VLA 落地** | NPC 用自然语言派活，正好对接当下 VLM / VLA 策略 |
| **腿式优先** | Object/Social Loco-Nav 直接服务于 H1 / G1 / GR1 等人形落地 |
| **基准统一** | 后续 InternNav / InternManip / 论文复现都可以共享同一套底座 |
| **Sim2Real 评估** | 在仿真城市跑得过，再迁到真机，是工业部署的天然路径 |

---

## 🎤 面试参考

**Q：GRUtopia 跟 Habitat / iGibson 这种老牌具身仿真比，"本质区别"是什么？**
A：三点——**场景从家变城（89 类服务场景）**、**任务从脚本变 NPC（LLM 自动派活+评估）**、**评估从坐标变语义（NPC 看用户意图是否被满足）**。这让通用机器人**第一次有了「下楼买杯咖啡」级别的长链路评估容器**。

**Q：为什么 NPC 要用 LLM？传统脚本不行吗？**
A：脚本任务一上规模就**冗余且固化**，10 万张场景每一张都人工写任务模板是不现实的。LLM 用作 NPC 的最大价值是**任务/对话/评估的可扩展性**——给它场景描述，它能源源不断生成符合常识的任务并按用户意图打分。

**Q：GRBench 为什么强调腿式机器人？**
A：通用服务场景里**地形不平、楼梯、门槛**几乎处处都有，轮式平台不够通用。GRBench 让 H1 / G1 / GR1 等人形 / 类人形机器人作为一等公民，倒逼算法把**行走稳定性 + 任务能力**一起打磨，这正是 RL+VLA 类工作的最大痛点。

**Q：100k 场景真的能用得起吗？**
A：仓库释出 **mini 包 500 MB** 与 **full 包 80 GB** 两档；研究者可以先用 mini 跑通流程再按需扩展。配合 Isaac Sim 的 GPU 加速渲染与并行环境，10 万场景在分布式集群里是可以训练利用起来的。

**Q：GRUtopia 跟 NVIDIA Isaac Lab / HumanoidBench 是什么关系？**
A：Isaac Lab 是**通用 RL 训练底座**（含 Isaac Sim 与 Gym 接口）；HumanoidBench 是**全身控制为主的任务集**（PPO/SAC/DreamerV3 对比）；GRUtopia 则是**面向"通用机器人在城市/服务场景里完成长时序任务"**的仿真社会，**互补、不冲突**。理想路线：Isaac Lab 训底层控制策略 → HumanoidBench 评估全身能力 → GRUtopia 跑长时序服务任务。

---

## 🔗 相关阅读

- [HumanoidBench (arXiv 2403.10506)](https://arxiv.org/abs/2403.10506)：全身控制基准，本仓库已有笔记
- [iGibson 2.0 (arXiv 2108.03272)](https://arxiv.org/abs/2108.03272)：家庭交互仿真前作
- [Habitat 3.0 (arXiv 2310.13724)](https://arxiv.org/abs/2310.13724)：人机协同导航的同期工作
- [Holodeck (arXiv 2312.09067)](https://arxiv.org/abs/2312.09067)：LLM 生成 3D 场景的相关思路
- [InternUtopia 2.x](https://github.com/OpenRobotLab/GRUtopia)：GRUtopia 的后续迭代，含 Gym 兼容 / 程序化室内场景生成

---

> 备注：本笔记基于 arXiv 摘要、官方 README（OpenRobotLab/GRUtopia）与公开搜索整理。GRResidents 内部 LLM 调用细节、GRBench 各任务的具体打分公式与 SOTA 数值，待 PDF / 论文附录详细阅读后补充。
