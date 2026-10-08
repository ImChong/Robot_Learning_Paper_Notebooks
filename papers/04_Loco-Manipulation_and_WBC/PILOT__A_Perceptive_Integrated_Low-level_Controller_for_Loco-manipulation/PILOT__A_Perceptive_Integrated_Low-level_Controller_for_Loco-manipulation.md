---
layout: paper
paper_order: 1
title: "PILOT: A Perceptive Integrated Low-level Controller for Loco-manipulation over Unstructured Scenes"
zhname: "PILOT：在非结构化场景中实现感知-动作一体化的人形 Loco-Manipulation 底层控制器"
category: "Loco-Manipulation and WBC"
---

# PILOT: A Perceptive Integrated Low-level Controller for Loco-manipulation over Unstructured Scenes
**PILOT：感知集成的人形 Loco-Manipulation 底层控制器**

> 📅 阅读日期: 2026-06-02
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 感知 Loco-Manipulation · 单阶段 RL · 跨模态融合 · MoE 策略
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.17440](https://arxiv.org/abs/2601.17440) |
| HTML | [arXiv HTML](https://arxiv.org/html/2601.17440v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.17440) |
| alphaXiv | [alphaXiv 概览页](https://www.alphaxiv.org/overview/2601.17440v1) |
| 项目主页 | 截至当前未见公开发布 |
| **发布时间** | 2026-01-24 (arXiv) |
| 源码 | 截至当前未见公开发布 |
| 作者 | Xinru Cui, Linxi Feng, Yixuan Zhou, Haoqi Han, Zhe Liu, Hesheng Wang |
| 机构 | 上海交通大学 自动化与感知学院（School of Automation and Intelligent Sensing, SJTU） |
| 提交日期 | 2026-01-24 |
| 评测平台 | Unitree G1（仿真 + 真机） |

---

## 🎯 一句话总结

> PILOT 把"感知地形 + 全身运动 + 上肢执行"塞进**一个单阶段 RL 策略**里训出一套人形机器人 loco-manipulation 底层控制器：用**跨模态 context encoder** 把"预测式本体感知特征"和"基于注意力的外部感知特征"融合，再用 **Mixture-of-Experts (MoE)** 策略头让不同运动模式有专家分工，从而在非结构化场景里既能稳走又能精准放脚，给上层任务一个能直接调用的统一底层接口。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| Loco-manipulation | Locomotion + Manipulation | 移动 + 操作一体化 |
| WBC | Whole-Body Control | 全身控制 |
| MoE | Mixture-of-Experts | 多专家网络，按状态路由到不同子网络 |
| RL | Reinforcement Learning | 强化学习 |
| Proprioception | — | 本体感知（关节角速度、IMU、力矩） |
| Exteroception | — | 外部感知（高度图 / 深度等环境感知） |
| Foot Placement | — | 落脚点选择 |
| Sim-to-Real | — | 仿真到真机迁移 |

---

## ❓ 论文要解决什么问题？

现在的人形 WBC 大多只看本体感知，"看不见地"导致在非结构化场景（杂物、台阶、不平地面）里既不敢迈大步，也不敢在保持精确末端跟踪的同时安全落脚。常见的解决套路有两类：

1. **分阶段拼接**：底层 locomotion 一个策略、上层 manipulation 一个策略、再加一个感知模块——三者接口要手动对齐，整合代价大；
2. **加感知不加专家**：单一 MLP 直接把高度图+本体感知喂进去，策略要同时学"走+操作+躲障"，多任务相互拉扯，训练不稳。

PILOT 的答案是：**一个策略、两个关键设计——跨模态 context encoder + MoE 策略头**，让一个策略既知道脚下是什么样的地，又能在不同运动模式间快速切换。

---

## 🔧 方法详解

### 1) 跨模态 Context Encoder

- **预测式本体特征**：用一个辅助预测头让本体感知编码器学到对未来本体状态的可预测表征，类似 RMA 风格的隐式扰动估计；
- **注意力式感知特征**：在高度图等外部感知输入上用 attention 抽取局部地形结构（凸起 / 凹陷 / 边缘）；
- **跨模态融合**：把两路 token 拼成共享 context 向量，作为后续策略的条件输入——既"知地形"又"知自身"。

### 2) Mixture-of-Experts 策略头

- 不再用单一 MLP 输出全身动作，而是用若干个**专家子网络**分别负责"平地行走 / 台阶跨越 / 转身 / 高末端跟踪 / 静止操作"等运动模式；
- 一个**门控网络（router）**根据当前 context 把状态路由到对应的专家组合上，专家之间的梯度互相不打架，多技能能在同一策略里专门化共存。

### 3) 单阶段端到端训练

- 直接在仿真里用 RL 端到端训"感知 + WBC + 末端任务"一锅炖；
- 不需要先训 locomotion 再蒸馏到 loco-manipulation，省掉了多阶段课程的工程负担；
- 训练奖励同时包含：命令跟踪 / 末端跟踪 / 落脚点精度 / 能耗与稳定性等。

### 🧭 整体流程

<div class="mermaid">
flowchart TB
    subgraph IN["输入"]
        P["本体感知<br/>关节 / IMU / 力矩"]
        E["外部感知<br/>高度图 / 局部地形"]
        C["上层指令<br/>速度 + 末端目标"]
    end

    subgraph ENC["跨模态 Context Encoder"]
        EP["预测式本体编码器<br/>(RMA 风格 latent)"]
        EE["注意力感知编码器<br/>(地形 attention)"]
        F["跨模态融合 → context z"]
        P --> EP
        E --> EE
        EP --> F
        EE --> F
    end

    subgraph POL["MoE 策略头"]
        R["门控网络 router"]
        X1["专家 1<br/>平地行走"]
        X2["专家 2<br/>台阶 / 不平地形"]
        X3["专家 3<br/>转身 / 步态切换"]
        X4["专家 N<br/>末端跟踪 / 静止操作"]
        R --> X1
        R --> X2
        R --> X3
        R --> X4
    end

    F --> R
    C --> R
    X1 --> A["关节指令<br/>50 Hz 控制"]
    X2 --> A
    X3 --> A
    X4 --> A

    A --> SIM["仿真 PPO 单阶段训练"]
    A --> REAL["Unitree G1 真机部署"]

    style ENC fill:#e8f4fd,stroke:#1f78b4
    style POL fill:#fdebd0,stroke:#e67e22
    style SIM fill:#e8f8e8,stroke:#27ae60
    style REAL fill:#fceae8,stroke:#c0392b
</div>

---

## 💡 核心贡献

| 创新 | 描述 |
|---|---|
| **单阶段感知 loco-manipulation** | 一个 RL 策略同时学"感知地形 + 全身运动 + 末端跟踪"，不再分阶段拼接 |
| **跨模态 context encoder** | 预测式本体特征 + 注意力式感知特征融合，地形感知和本体扰动估计共存 |
| **MoE 策略头** | 多个专家覆盖不同运动模式，避免单 MLP 的多任务相互干扰 |
| **真机验证** | 在 Unitree G1 上完成 sim-to-real，非结构化场景里走得稳、放脚准、末端跟得上 |

---

## 📊 实验亮点

- **平台**：Unitree G1 人形机器人（仿真 + 真机）；
- **对比**：相对只用本体感知的 baseline / 不带 MoE 的单 MLP baseline，PILOT 在**稳定性、命令跟踪精度、地形通过率**三项都领先；
- **场景**：包括不平地面、台阶、低矮障碍等非结构化室内场景，配合末端 / 全身命令同时给出。

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---|---|
| **底层控制器范式** | 给上层任务（VLA / teleop / planner）提供一个"既知地形又能 WBC"的统一底层接口，省掉重复造控制器的成本 |
| **MoE 在控制里的实用化** | 验证 Mixture-of-Experts 对多运动模式专门化的实用价值，是后续多技能 WBC 的好参考 |
| **感知融合工程模板** | 预测式 + 注意力式双编码器的拼法可以直接复用到其他需要"主动避障 / 精准落脚"的足式平台 |

---

## 🎤 面试参考

**Q：为什么不用分阶段（先 locomotion 再 manipulation）？**
A：分阶段在工程上要手动对齐两层策略的接口（命令空间、坐标系、频率），而且高层任务一变，底层往往要重训。PILOT 直接把感知 / 步态 / 末端塞进一个策略，单阶段 RL 训完就能直接被上层调用，工程闭环更短。

**Q：MoE 在控制里相比单 MLP 的优势？**
A：单 MLP 在多任务训练里很容易出现"梯度互打架"——比如"平地快走"和"台阶谨慎落脚"的最优动作分布差异很大，MLP 在均值意义上折中后两个任务都不算好。MoE 用 router 给不同状态走不同专家，专家内部梯度只服务自己负责的子模式，专门化效果更好。

**Q：跨模态 context encoder 解决了什么？**
A：纯本体感知"看不见地"，纯外部感知"不知道自己当前的扰动状态"。预测式本体编码器近似估计扰动 / 接触 latent，注意力式感知编码器抽取局部地形结构，融合后策略能同时回答"现在脚下是什么样 + 我的身体正在被怎么干扰"，落脚和姿态都更稳。

---

## 💬 讨论记录

> 此部分在阅读讨论后更新
