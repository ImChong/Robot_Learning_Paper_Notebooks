---
layout: paper
paper_order: 3
title: "PolySim: Bridging the Sim-to-Real Gap for Humanoid Control via Multi-Simulator Dynamics Randomization"
zhname: "PolySim：把「域随机化」从参数维度推到「整套仿真器」维度"
category: "Sim-to-Real"
---

# PolySim: Bridging the Sim-to-Real Gap for Humanoid Control via Multi-Simulator Dynamics Randomization
**PolySim：把「域随机化」从参数维度推到「整套仿真器」维度**

> 📅 阅读日期: 2026-05-20
>
> 🏷️ 板块: Sim-to-Real · 多仿真器联合训练 · 动力学级域随机化 · 人形 WBC
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2510.01708](https://arxiv.org/abs/2510.01708) |
| HTML | [在线阅读 v3](https://arxiv.org/html/2510.01708v3) |
| PDF | [下载](https://arxiv.org/pdf/2510.01708) |
| **发布时间** | 2025-10-02 (arXiv) |
| 源码 | [EmboMaster/PolySim](https://github.com/EmboMaster/PolySim) |
| 依赖框架 | [LeCAR-Lab/HumanoidVerse](https://github.com/LeCAR-Lab/HumanoidVerse) |
| OpenReview | [Zi1oawm4cA](https://openreview.net/forum?id=Zi1oawm4cA) |
| 提交日期 | 2025-10 |

**作者**：Zixing Lei 等 9 位作者
**机构**：上海交通大学 · 中关村学院 · Nerv.ai
**机器人**：**Unitree G1** 人形机器人（零样本实机迁移）

---

## 🎯 一句话总结

PolySim 把传统「在一个仿真器内随机化质量 / 摩擦 / PD 增益」的 domain randomization 升级为**「跨仿真器联合训练」**：让 IsaacGym / IsaacSim / Genesis / MuJoCo **同时**为同一个策略提供并行 rollout，每个仿真器自身的归纳偏置（接触模型、积分器、关节软约束差异）就是一种天然的 dynamics-level 噪声；理论上得到比单仿真器更紧的归纳偏置上界，工程上靠 **client-server 架构 + Simulator Router** 把异构仿真器虚拟成统一向量化环境，实机部署到 Unitree G1 时**零样本 (zero-shot)** 即可走通。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| WBC | Whole-Body Control | 人形全身控制 |
| DR | Domain Randomization | 域随机化 |
| RPC | Remote Procedure Call | 远程过程调用，跨进程通信 |
| TrainClient / SimServer | 本文术语 | 训练侧客户端 / 仿真侧服务端 |
| Simulator Router | 本文术语 | 把异构仿真器 API 统一到同一接口 |
| Inductive Bias | 归纳偏置 | 仿真器自身建模假设带来的偏差 |
| Sim-to-Real | - | 仿真到真实的迁移 |
| Zero-shot | - | 训练后无需 fine-tune 直接上实机 |

---

## ❓ 论文要解决什么问题？

**Sim-to-real gap 的根因是什么？** 主流答案是「仿真物理跟真实物理不一致」，于是大家在**单一仿真器**里疯狂地随机化质量、摩擦、电机增益、延迟……但这条路有两个隐藏前提：

1. **仿真器本身是"对的"**，只要参数扫得够广就能覆盖真实分布；
2. **真实物理差距主要落在参数维度**，而不是模型结构维度。

PolySim 指出：**这两个前提都不成立**。每个仿真器都有自己的归纳偏置——例如 IsaacGym 的接触模型与 MuJoCo 不同，Genesis 的积分器与 IsaacSim 又不同；**单仿真器随机化永远逃不出该仿真器的"结构性误差"**。这意味着，哪怕参数扫得再广，策略也仍然只学到"该仿真器认为可能的轨迹"。

PolySim 的回答是：**别在一个仿真器里加噪声，让多个仿真器并行喂数据**——把"哪个仿真器"本身当作一个高维随机变量，这样训练出的策略**被迫学会跨结构性误差也成立的控制律**。

---

## 🔧 方法拆解

### 1. 核心思想：Dynamics-Level Domain Randomization

| 维度 | 传统 DR | PolySim |
|---|---|---|
| 随机化对象 | 单仿真器**内部的参数** (mass, friction, PD gains, latency) | **整套仿真器**（IsaacGym / IsaacSim / Genesis / MuJoCo） |
| 覆盖范围 | 仿真器**结构假设**之内 | 跨**结构性差异** |
| 理论上界 | 受限于单一仿真器的归纳偏置 | 多仿真器交集，**更紧** |
| 工程难度 | 改 YAML 就行 | 需要跨仿真器 API 统一 + 资源调度 |

> 💡 一句话直觉：传统 DR 是"**同一座山换不同雪量**"，PolySim 是"**直接换不同的山**"——后者覆盖的真实地形显然更广。

### 2. 系统架构（client-server）

PolySim 没有把多个仿真器塞进同一个进程，而是**显式解耦**：

```
┌──────────────────────┐         RPC (gRPC / GPU pass-through)
│   TrainClient (RL)   │ ◄─────────────────────────────────────────┐
│   - PPO learner      │                                            │
│   - Replay buffer    │                                            │
│   - GAE / loss       │                                            │
└──────────┬───────────┘                                            │
           │ obs / reward / done                                    │
           ▼                                                        │
┌──────────────────────────────────────────────────────────────────┐│
│                   Simulator Router (统一接口)                     ││
│   - reset / step / get_state  ── 同一套 vectorized API           ││
│   - 资源调度（哪几张卡给哪个 sim）                                ││
│   - API 翻译（IsaacGym/Sim/Genesis/MuJoCo 各自 quirks）           ││
└─────────┬────────────┬─────────────────┬───────────────┬─────────┘│
          ▼            ▼                 ▼               ▼          │
   ┌────────────┐ ┌──────────┐    ┌────────────┐  ┌──────────┐    │
   │ SimServer  │ │SimServer │... │ SimServer  │  │SimServer │────┘
   │ IsaacGym×N │ │IsaacSim×N│    │ Genesis ×N │  │MuJoCo ×N │
   └────────────┘ └──────────┘    └────────────┘  └──────────┘
```

**关键设计点**：

- **TrainClient ↔ SimServer 解耦**：训练侧只跟统一接口对话，仿真侧崩了不会拖垮训练；
- **Simulator Router**：负责把四种仿真器的 API 翻译成同一套 vectorized env，并按显存 / 算力调度环境数量；
- **GPU pass-through 通信**：tensor 直接在显卡之间传递，避免 CPU 中转的带宽浪费；
- **弹性、分布式、容错**：可以在多机多卡上拉起任意比例的仿真器。

### 3. 训练目标

- **任务**：人形 motion tracking（跟着参考动作走、跑、转身、做花式动作）；
- **算法**：基础是 PPO + asymmetric actor-critic，无特殊改动；
- **奖励**：标准 motion imitation 奖励 + 节奏 / 接触 / 关节软约束；
- **依赖框架**：[HumanoidVerse](https://github.com/LeCAR-Lab/HumanoidVerse) 提供跨仿真器统一观测/动作空间，PolySim 复用它的 env 接口。

### 4. 理论支撑

论文给了一个**归纳偏置上界**的形式化论证：

> 若用 N 个仿真器联合训练，策略学习到的"等效动力学"是 N 个仿真器各自动力学分布的**交集近似**；该交集的 sim-to-real 误差**严格不大于**任意单个仿真器的 sim-to-real 误差。

直觉版：每个仿真器都有自己的盲点，但**多个仿真器的盲点不会完全重合**——它们共同未覆盖到的部分，正好是真实物理也不太可能落入的极端区域。

### 5. 零样本实机部署

- 训练完直接上 Unitree G1，**不做任何 fine-tune**；
- 跟踪多种参考动作（走 / 跑 / 转身 / 复杂全身花式）；
- 对比单仿真器训练的基线，跌倒率显著更低。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["🎬 参考动作数据"]
        MOTION["📜 Motion Library<br/>(AMASS / 自采人体动作)"]
    end

    subgraph CLIENT["🧠 TrainClient (RL 学习器, 单进程)"]
        POLICY["🎮 PPO Actor-Critic<br/>(共享一套权重)"]
        BUFFER["📦 Replay / Rollout Buffer"]
        OPT["⚙️ Loss + Optimizer"]
        POLICY --> OPT
        BUFFER --> OPT
        OPT -.update.-> POLICY
    end

    subgraph ROUTER["🔀 Simulator Router (统一接口)"]
        API["🧩 reset / step / get_state<br/>(统一 vectorized API)"]
        SCHED["🗂️ 资源调度<br/>(显卡 / 环境数分配)"]
        TRANS["🔄 API 翻译<br/>(各仿真器 quirks)"]
    end

    subgraph SERVERS["🧪 SimServers（异构并行）"]
        SIM1["🟦 IsaacGym ×N₁<br/>GPU-PhysX, fast"]
        SIM2["🟪 IsaacSim ×N₂<br/>IsaacLab v1.4.1"]
        SIM3["🟩 Genesis ×N₃<br/>solver 不同"]
        SIM4["🟧 MuJoCo ×N₄<br/>接触模型不同"]
    end

    subgraph REAL["🤖 实机部署 (Zero-shot)"]
        G1["Unitree G1<br/>(无 fine-tune)"]
        TRACK["✅ 跟随多样参考动作<br/>跌倒率↓"]
    end

    MOTION --> CLIENT
    POLICY -- action --> ROUTER
    ROUTER --> SIM1
    ROUTER --> SIM2
    ROUTER --> SIM3
    ROUTER --> SIM4
    SIM1 -- obs/reward --> ROUTER
    SIM2 -- obs/reward --> ROUTER
    SIM3 -- obs/reward --> ROUTER
    SIM4 -- obs/reward --> ROUTER
    ROUTER --> BUFFER

    POLICY -.训练完成.-> G1 --> TRACK

    style CLIENT fill:#e8f4fd,stroke:#1f78b4
    style ROUTER fill:#fff7e0,stroke:#d4a017
    style SERVERS fill:#f3e8ff,stroke:#8e44ad
    style REAL fill:#e8f8e8,stroke:#27ae60
    style DATA fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **概念创新**：首次把 domain randomization 从「参数维度」推到「整套仿真器维度」，提出 dynamics-level DR；
2. **理论结果**：证明多仿真器联合训练能给出比任意单仿真器**更紧**的 sim-to-real 误差上界；
3. **系统工程**：client-server + Simulator Router 让 IsaacGym / IsaacSim / Genesis / MuJoCo **真的能在同一次训练里并行 rollout**；
4. **开源开放**：基于 HumanoidVerse 把代码与配置完整释出（[github.com/EmboMaster/PolySim](https://github.com/EmboMaster/PolySim)）；
5. **零样本上机**：Unitree G1 实机无 fine-tune 跟踪多种动作，验证范式可落地。

---

## 📊 关键设定与结果

| 维度 | 值 |
|---|---|
| 支持仿真器 | IsaacGym (Preview 4) · IsaacSim/IsaacLab (v1.4.1) · Genesis (v0.2.1) · MuJoCo |
| 机器人 | Unitree G1 |
| 训练任务 | 人形 motion tracking（跟跑、跟走、转身、花式动作） |
| 实机迁移 | **零样本**（无 fine-tune） |
| 跌倒率（vs 单仿真器） | 显著降低（详细数值见 v3 PDF Table）|

> 📌 工程提示：在 README 的训练脚本 `polysim_train_agent.py` 里，可以通过 YAML 直接指定每个仿真器分配多少环境（如 `IsaacGym: 4096, MuJoCo: 1024, Genesis: 512`）。

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **DR 的"二阶升级"** | 单仿真器 DR 是一阶（参数级），PolySim 是二阶（结构级），等同于把"仿真器选择"也当成一个超参 |
| **跟 [RAPT](../RAPT__Model-Predictive_Out-of-Distribution_Detection_and_Failure_Diagnosis_for_/RAPT__Model-Predictive_Out-of-Distribution_Detection_and_Failure_Diagnosis_for_.html) 互补** | PolySim 在仿真侧压窄结构性 gap，RAPT 在部署侧实时监控残余 gap |
| **跟 [LIFT](../LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F/LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F.html) 思路不同** | LIFT 走"超大规模 SAC 预训练 + Dyna 微调"，PolySim 走"多仿真器并行喂数据"，两者可叠加 |
| **对开发者社区友好** | HumanoidVerse 已经统一了仿真器接口，PolySim 把工程门槛进一步降到"改 YAML 就能加新仿真器"|

---

## 🎤 面试参考

**Q：为什么单纯加大 domain randomization 范围解决不了 sim-to-real gap？**
A：因为 DR 假设"真实分布是仿真器分布的子集"，只要扫得够广就能覆盖。但每个仿真器都有自己的**归纳偏置**（接触模型 / 积分器 / 软约束实现方式），有些真实物理特征**根本不在该仿真器的可能轨迹空间里**，参数扫到极端也覆盖不到。PolySim 把"换仿真器"这件事本身做成一种随机化，相当于跳出单仿真器的盲区。

**Q：PolySim 跟"在 MuJoCo 上验证、在 IsaacGym 上训练"这种二阶段评测有什么本质区别？**
A：二阶段是先训后验，验证只能告诉你**好不好**；PolySim 是**同一次训练里**多个仿真器**同时**喂梯度，策略被迫学会让多个仿真器都"满意"的控制律，本质是**联合优化**而不是顺序评估。

**Q：客户端-服务端架构相比传统的"单进程 vectorized env"有什么代价？**
A：代价是跨进程 RPC 通信开销，但收益是**容错 + 弹性**：某个仿真器崩了不会拖垮训练；不同仿真器可以放到不同机器上；GPU pass-through 也降低了 CPU 中转的带宽损失。对于 8×A100 / 多机训练，这种解耦带来的扩展性远胜单进程。

**Q：理论上的"更紧上界"听起来像噱头，工程上怎么验证？**
A：作者通过对比"单仿真器训练 + 实机部署"vs"多仿真器联合 + 实机部署"，看实机跟踪误差、跌倒率、关节扭矩异常等指标。Unitree G1 上零样本可行就是最直观的实证。

**Q：为什么选这四个仿真器？不能再加一个 Drake 或 Brax？**
A：作者选的是**当下人形社区最主流**的四个：IsaacGym 速度快、IsaacSim 精度高、Genesis 新兴 GPU 物理、MuJoCo 长期参考实现。它们的归纳偏置在工程上有显著差异，组合后覆盖较广。理论上加更多仿真器只会让上界更紧，但工程成本会上升（每个仿真器都要写 API 翻译），是一个 ROI 权衡。

---

## 🔗 相关阅读

- [LIFT: Large-Scale Pretraining + Efficient Finetuning for Humanoid Control (2510.xxxxx)](../LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F/LIFT__Towards_Bridging_the_Gap_between_Large-Scale_Pretraining_and_Efficient_F.html)：同期 sim-to-real 路线，本仓库已有笔记
- [RAPT: Model-Predictive OOD Detection for Sim-to-Real Humanoids (2602.01515)](../RAPT__Model-Predictive_Out-of-Distribution_Detection_and_Failure_Diagnosis_for_/RAPT__Model-Predictive_Out-of-Distribution_Detection_and_Failure_Diagnosis_for_.html)：部署侧监控 gap，本仓库已有笔记
- [Domain Randomization for Sim-to-Real Transfer (1703.06907)](https://arxiv.org/abs/1703.06907)：经典单仿真器 DR
- [HumanoidVerse: LeCAR-Lab/HumanoidVerse](https://github.com/LeCAR-Lab/HumanoidVerse)：PolySim 依赖的多仿真器统一框架
- [MOSAIC: Sim-to-Real Residual Adaptation (2602.08594)](https://arxiv.org/abs/2602.08594)：另一条残差适配路线

---

> 备注：本笔记基于 arXiv 摘要、v3 HTML 检索结果与 [EmboMaster/PolySim](https://github.com/EmboMaster/PolySim) README 整理。详细的训练曲线、消融数值（不同仿真器组合的贡献分布、跌倒率对比）请以 PDF v3 Table 为准。
