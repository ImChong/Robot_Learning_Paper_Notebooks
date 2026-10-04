---
layout: paper
title: "Teleopit: A Full-Embodiment Humanoid Teleoperation System"
zhname: "Teleopit：用一副 VR 头显统管身-手-头的全体感人形遥操作系统"
category: "Teleoperation"
arxiv: "2608.01834"
---

# Teleopit: A Full-Embodiment Humanoid Teleoperation System
**用单副 Meta PICO 头显同时驱动人形的身体、灵巧手与主动视觉：运动跟踪器 + 免调参手部重定向 + 2-DoF 主动头，采集的演示能把 ACT / GR00T N1.7 训到 90%~95% 成功率**

> 📅 阅读日期: 2026-08-14
>
> 🏷️ 板块: 07 Teleoperation · 全体感遥操作 · 全身运动跟踪 · 灵巧手重定向 · 主动视觉 · 数据采集
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2608.01834](https://arxiv.org/abs/2608.01834) |
| HTML | [arXiv HTML](https://arxiv.org/html/2608.01834v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2608.01834) |
| 项目主页 | [botrunner64.github.io/teleopit-page](https://botrunner64.github.io/teleopit-page) |
| 源码（全身控制） | [BotRunner64/Teleopit](https://github.com/BotRunner64/Teleopit) |
| 源码（灵巧手） | [BotRunner64/somehand](https://github.com/BotRunner64/somehand) |
| 源码（PICO 接口） | [BotRunner64/pico-bridge](https://github.com/BotRunner64/pico-bridge) |
| 源码（主动视觉） | [BotRunner64/OpenNeck](https://github.com/BotRunner64/OpenNeck) |
| 源码（模仿学习） | [BotRunner64/lerobot-teleopit](https://github.com/BotRunner64/lerobot-teleopit) |
| 视频 | [YouTube](https://youtu.be/MNDOi0vQFEc) · [Bilibili](https://www.bilibili.com/video/BV1KJuw66EPQ) |
| **发布时间** | 2026-08-03（arXiv） |
| 机构 | 西湖大学（Westlake University） |
| 作者 | Bingqian Wu · Zicheng Xu · Xianghui Fan · Dayu Li · Xiangru Huang |
| 平台 | Unitree G1（29 DoF）+ 6 款可配置灵巧手 + 2-DoF 主动视觉云台 + Meta PICO 头显 |

---

## 🎯 一句话总结

> 遥操作要采「能训策略」的演示，需要**同时**做到三件事：协调的**全身动作**、连续的**灵巧手控制**、以及能看清操作对象的**视角控制**。Teleopit 用**一副 Meta PICO 头显**把操作者的身体骨架、双手关键点、头部姿态一次性映射到人形的**身体（运动跟踪器）+ 可配置灵巧手（优化式重定向）+ 2-DoF 主动头**。跟踪器靠**历史编码**与**失败感知回退采样（failure-aware rewind sampling）**提升难段稳定性；手部重定向用**归一化指向 + 指尖距离 + 拇指对掌**三目标做 SLSQP 优化，**换手只需指定链接、无需重调参数**。用它采的 96 条演示把 ACT / GR00T N1.7 训到 **90.0% / 95.0%** 成功率。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VR | Virtual Reality | 虚拟现实（此处即 Meta PICO 头显）|
| DoF | Degrees of Freedom | 自由度 |
| PPO | Proximal Policy Optimization | 近端策略优化，RL 训练算法 |
| SLSQP | Sequential Least-Squares Quadratic Programming | 序列最小二乘二次规划，求解手部重定向 |
| ACT | Action Chunking with Transformers | 动作分块 Transformer，模仿学习策略 |
| GR00T N1.7 | NVIDIA 人形基础模型（VLA）| 视觉-语言-动作策略 |
| Privileged Info | Privileged Information | 特权信息，仅训练时给 critic |

---

## ❓ 论文要解决什么问题？

要训出好用的人形操作策略，得先有**高质量演示数据**。但人形演示比桌面机械臂难在「全体感（full-embodiment）」：

1. **全身要协调**：走位、下蹲、转身、单腿平衡都得跟得动，而不是只动两只手臂。
2. **手要连续灵巧**：抓、放、捏、开门这些动作依赖手指的连续控制，而且机器人可能装的是**各式各样**的灵巧手（自由度、连杆结构都不同）。
3. **视角要能主动看**：固定相机看不到操作细节，操作者需要能「主动转头去看」。

过去的系统往往只覆盖其中一两点：要么全身跟踪但手很粗糙，要么手灵巧但视角固定，要么每换一款手就要重新调一套重定向参数。Teleopit 的目标是**用一副 VR 头显把三者一次性打通**，并且**对灵巧手型即插即用**。

---

## 🔧 方法详解

### 1. 全身运动跟踪器（Whole-Body Motion Tracker）

- 用 **PPO** 在 GPU 加速的 MuJoCo 仿真器（mjlab）里训练，8×A800、65,536 并行环境、约 50 小时 / 40,000 迭代。
- 输入操作者参考动作，输出 **29 维关节目标**，50 Hz 决策、200 Hz PD 执行；跟踪锚定在躯干的 **14 个身体链接**。
- **历史编码器（History Encoder）**：把 actor 观测在过去 `H=10` 步堆叠，做一维时序卷积 + 全局平均池化，免额外估计器就给出运动上下文。
- **失败感知回退采样（Failure-Aware Rewind Sampling）**：rollout 失败时以高概率**保留该片段**并把参考时间**随机回退一个偏移**，让训练更多暴露在「难转移状态」上，而非均匀重采样。
- 非对称 Actor-Critic：**特权信息**只给 critic；配域随机化（摩擦 / 质心 / 惯量 / 关节偏置 + 观测噪声）与参考态初始化弥合 sim-to-real。
- 训练语料混合三套公开 mocap（BONES-SEED / TWIST2 / LAFAN1，共约 219 小时）+ 少量 PICO 实录。

### 2. 优化式手部重定向（Hand Retargeter）

- 把人手 26 个关键点映射到**任意机器人手**，核心是三个优化目标：
  1. **归一化指向**：把骨长尺度从主目标中剔除，只对齐手指方向；
  2. **指尖距离**：编码捏合（pinch）闭合程度；
  3. **拇指坐标系**：编码拇指对掌（opposition）。
- 用 **SLSQP + 解析运动学梯度**在 **60 Hz** 求解，单帧 1.56–8.53 ms。
- **换手即插即用**：新手只需指定「对应机器人链接」的语义映射，**不必重调目标权重**。论文在 6 款手上共享同一套参数验证：Dex5、Inspire DFQ、LinkerHand L20 / L6、Rohand、Sharpa Wave。

### 3. 主动视觉模块（Active Vision）

- 一套约 **500 元**成本的 **2-DoF 偏航-俯仰**云台。
- 把头部相对躯干的朝向映射为视点指令，让操作者**主动转头看向操作对象**。

### 4. 统一参考动作空间 & 数据闭环

- 人的演示与学到的策略共用同一套 **50 维参考动作空间**（根位姿 + 身体 / 双手 / 颈部关节目标）。
- 用 Teleopit 采演示 → 训 ACT / GR00T N1.7 → 部署回 Unitree G1，形成「遥操作采数 → 模仿学习 → 自主执行」闭环。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OP["🧑 操作员侧（Meta PICO）"]
        BODY["🧍 身体骨架<br/>24 关节"]
        HAND["✋ 双手关键点<br/>26/手"]
        HEAD["👀 头部姿态"]
    end

    subgraph MAP["🗺️ 映射层"]
        TRK["🧠 全身运动跟踪器<br/>PPO + 历史编码<br/>+ 失败感知回退采样"]
        RET["🖐️ 优化式手部重定向<br/>SLSQP · 60Hz · 免调参"]
        VIS["🎥 主动视觉<br/>2-DoF 云台"]
    end

    subgraph G1["🤖 Unitree G1 (29 DoF)"]
        BODYC["🦿 身体关节目标<br/>50Hz→PD 200Hz"]
        HANDC["🤏 可配置灵巧手<br/>6 款即插即用"]
        CAM["📷 视点"]
    end

    DATA["📦 演示数据<br/>96 条成功轨迹"]
    POL["🎯 训练策略<br/>ACT 90% / GR00T N1.7 95%"]

    BODY --> TRK --> BODYC
    HAND --> RET --> HANDC
    HEAD --> VIS --> CAM
    BODYC & HANDC & CAM --> DATA --> POL

    style OP fill:#e8f4fd,stroke:#1f78b4
    style MAP fill:#fff7e0,stroke:#d4a017
    style G1 fill:#f3e8ff,stroke:#8e44ad
    style DATA fill:#e8f8e8,stroke:#27ae60
    style POL fill:#e8f8e8,stroke:#27ae60
</div>

---

## ⏱️ 源码运行时序图（mermaid）

> 基于开源仓库 [BotRunner64/Teleopit](https://github.com/BotRunner64/Teleopit)（全身控制）· [pico-bridge](https://github.com/BotRunner64/pico-bridge)（VR 接口）· [somehand](https://github.com/BotRunner64/somehand)（灵巧手）· [OpenNeck](https://github.com/BotRunner64/OpenNeck)（主动头）· [lerobot-teleopit](https://github.com/BotRunner64/lerobot-teleopit)（模仿学习）整理的典型调用时序。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 操作员
    participant PICO as pico-bridge<br/>(VR 采集)
    participant TRK as Teleopit<br/>(运动跟踪策略)
    participant HAND as somehand<br/>(手部重定向)
    participant NECK as OpenNeck<br/>(主动视觉)
    participant G1 as Unitree G1<br/>(仿真/真机)
    participant IL as lerobot-teleopit<br/>(模仿学习)

    U->>PICO: 戴上 PICO，输出身体/双手/头部信号
    PICO-->>TRK: 身体骨架 24 关节 + 根位姿
    PICO-->>HAND: 双手 26 关键点
    PICO-->>NECK: 头部相对躯干朝向
    loop 每个控制步 50Hz
        TRK->>TRK: 堆叠 H=10 步历史 + 时序卷积
        TRK->>G1: 29 维关节目标（PD 200Hz 执行）
        HAND->>HAND: SLSQP 解三目标（60Hz，1.5-8.5ms）
        HAND->>G1: 灵巧手关节指令（6 款即插即用）
        NECK->>G1: 2-DoF 云台视点指令
        G1-->>PICO: 回传第一视角画面
    end
    G1-->>IL: 录制 (观测,动作) 演示轨迹
    U->>IL: 采满 96 条成功演示
    IL->>IL: 训练 ACT / GR00T N1.7
    IL-->>G1: 部署自主策略（90% / 95% 成功率）
</div>

---

## 💡 核心贡献

1. **全体感一体化**：用**单副 VR 头显**同时驱动身体、灵巧手、主动视觉，补齐人形遥操作「全身 + 灵巧手 + 视角」三缺一的短板。
2. **跟踪器两处改进**：**历史编码**给出免估计器的运动上下文，**失败感知回退采样**让训练更多命中难转移状态——mocap 验证 91.7%、live PICO 参考 100%，优于 TWIST2 / SONIC / HoloMotion。
3. **免调参手部重定向**：归一化指向 + 指尖距离 + 拇指对掌三目标 + SLSQP，**换手只需语义链接映射**，一套参数覆盖 6 款差异极大的灵巧手。
4. **低成本主动视觉**：约 500 元的 2-DoF 云台让操作者主动「转头看」。
5. **数据闭环验证**：96 条演示训 ACT / GR00T N1.7 达 **90.0% / 95.0%**，全链路开源（控制 / 手 / 视觉 / VR 接口 / 模仿学习）。

---

## 📊 关键数据

| 维度 | 数值 |
|---|---|
| 机器人 | Unitree G1（29 DoF），14 身体链接跟踪 |
| VR | Meta PICO：身体 24 关节 + 双手各 26 关键点 + 头部姿态 |
| 运动跟踪成功率 | mocap 91.7% · live PICO **100%** |
| 手部重定向 | 指向误差 9.02°–43.04°，单帧 1.56–8.53 ms，60 Hz |
| 端到端延迟 | 全身 ≈0.10s · 视点 ≈0.05s · 灵巧手显示 ≈0.15s |
| 下游策略 | ACT 90.0%（18/20）· GR00T N1.7 95.0%（19/20），取放瓶入箱 |
| 训练成本 | 8×A800、65,536 并行、约 50h、40k 迭代 |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **数据采集标准化** | 「一副头显 + 一套参考动作空间」把人形全体感演示压成可复现流程，降低采数据门槛 |
| **灵巧手可移植** | 免调参、语义链接映射的重定向，让「同一遥操作系统 + 不同灵巧手」成为工程默认，而非每次重调 |
| **训练技巧可复用** | 失败感知回退采样对「难转移状态覆盖不足」是通用解，可迁移到其它运动跟踪 / 模仿任务 |
| **VLA 数据源** | 采出的演示直接喂 GR00T N1.7 等 VLA，验证「遥操作采数 → 基础模型」链路的可行性 |

---

## 🎤 面试参考

**Q：Teleopit 相比 TWIST2 / SONIC 这类全身跟踪方法，新在哪？**
A：不是单纯的「更强跟踪器」，而是把**全身 + 灵巧手 + 主动视觉**做成一体化全体感系统，并且手部重定向对多款灵巧手即插即用。跟踪器本身也有两处改进——历史编码给运动上下文、失败感知回退采样提升难段稳定性，在 live PICO 参考上做到 100% 成功率。

**Q：失败感知回退采样（failure-aware rewind sampling）解决什么问题？**
A：均匀采样会让训练大量时间花在「容易的稳态」，难转移状态（如起步、变向、蹲起交界）曝光不足。失败时以高概率保留该片段并把参考时间随机回退一点，等于把探针重新压回失败前的难段反复练，提升这些关键转移的鲁棒性。

**Q：为什么手部重定向要用「归一化指向」而不是直接对齐关键点？**
A：不同灵巧手骨长差异极大，直接对齐位置会被尺度污染。归一化指向把骨长尺度从主目标里剔除，只对齐手指方向；再用指尖距离编码捏合、拇指坐标系编码对掌。这样一套参数能覆盖 Dex5 / Inspire / LinkerHand / Rohand / Sharpa 等结构迥异的手，换手只需给出语义链接映射。

**Q：源码提供了什么？**
A：全链路开源为 5 个仓库——`Teleopit`（全身控制 / mjlab + PPO 训练与部署）、`somehand`（手部重定向）、`OpenNeck`（2-DoF 主动头）、`pico-bridge`（PICO VR 接口）、`lerobot-teleopit`（基于 lerobot 的模仿学习采数与训练）。按「pico-bridge 采信号 → Teleopit/somehand/OpenNeck 分别驱动身体/手/头 → lerobot-teleopit 录演示训 ACT/GR00T」的时序即可复现。

---

## 🔗 相关阅读

- [Teleopit 项目主页](https://botrunner64.github.io/teleopit-page)
- 同模块对照：[TWIST2](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html)（可移植整体数据采集系统） · [CLONE](../CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks.html)（闭环长时序遥操作） · [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html)（低延迟末端控制）
- 跨模块对照：[Humanoid-GPT](../Humanoid-GPT__Scaling_Data_and_Structure_for_Zero-Shot_Motion_Tracking/Humanoid-GPT__Scaling_Data_and_Structure_for_Zero-Shot_Motion_Tracking.html)（把全身动作跟踪当序列建模）
