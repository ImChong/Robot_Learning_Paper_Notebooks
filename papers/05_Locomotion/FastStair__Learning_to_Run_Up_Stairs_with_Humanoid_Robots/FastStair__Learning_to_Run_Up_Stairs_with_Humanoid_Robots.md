---
layout: paper
paper_order: 12
title: "FastStair: Learning to Run Up Stairs with Humanoid Robots"
zhname: "FastStair：让人形机器人快速跑上楼梯"
category: "Locomotion"
arxiv: "2601.10365"
---

# FastStair: Learning to Run Up Stairs with Humanoid Robots
**FastStair：让人形机器人快速跑上楼梯**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 05 Locomotion · 楼梯攀爬 / 落脚点规划 / 规划器引导 RL / 多阶段训练 / LoRA 分速段专家
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.10365](https://arxiv.org/abs/2601.10365) |
| HTML | [arXiv HTML](https://arxiv.org/html/2601.10365) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.10365) |
| 项目主页 | [npcliu.github.io/FastStair](https://npcliu.github.io/FastStair) |
| 视频 | [YouTube 演示](https://youtu.be/SoLBK7VEGDo) |
| 源码 | 截至当前项目页未给出公开仓库链接（以后续更新为准） |
| **发布时间** | 2026-01-15 (arXiv) |
| 作者 | Yan Liu, Tao Yu, Haolin Song, Hongbo Zhu, Nianzong Hu, Yuzhi Hao, Xiuyong Yao, Xizhe Zang, Hua Chen, Jie Zhao |
| 机构 | 哈尔滨工业大学(HIT) · LimX Dynamics(松延动力) · USTC · HKUST · NUS · ZJUI |
| 平台 | LimX Oli 人形机器人（身高 1.65m / 体重 55kg / 31 DOF） |
| 仿真 | IsaacLab（4096 并行环境）训练 → 真机零任务级微调部署 |

---

## 🎯 一句话总结

> 人形机器人跑楼梯难在「敏捷」与「稳定」要同时满足：纯 model-free RL 能跑出动态步态，但隐式稳定奖励 + 大量任务奖励整形容易产生不安全行为，楼梯上尤甚；基于模型的落脚点规划器天然编码了接触可行性与稳定结构，但硬约束会让动作过于保守、限制速度。**FastStair** 的思路是把两者的长处缝起来：用一个 **GPU 并行的落脚点规划器** 在训练回路里**引导 RL 探索朝向动力学可行的接触点**，分「预训练学安全落脚 → 后训练恢复速度跟踪 → LoRA 融合分速段专家」三步走，最终在保证稳定的前提下把上楼速度推到 1.65 m/s。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DCM | Divergent Component of Motion | 运动发散分量，常用于双足/人形步态稳定的落脚点规划 |
| LoRA | Low-Rank Adaptation | 低秩适配；本文用来把多个分速段专家融进单一网络 |
| MPC | Model Predictive Control | 模型预测控制；本文落脚点规划相比并行 MPC 提速约 25× |
| DoF | Degree of Freedom | 自由度；Oli 共 31 个驱动自由度 |
| MAE | Mean Absolute Error | 平均绝对误差；用于速度跟踪评估 |

---

## ❓ 论文要解决什么问题？

1. **敏捷 vs. 稳定的矛盾**：上楼既要高敏捷（快速迈步、甚至跨级），又要严格稳定（落脚点必须落在台阶上、不踩空）。
2. **纯 RL 不安全**：隐式稳定奖励 + 重度任务奖励整形，在楼梯这种离散接触地形上容易学出危险行为。
3. **纯规划器太保守**：基于模型的落脚点规划器编码了接触可行性与稳定性，但强行施加硬约束会牺牲速度，跑不快。

**目标**：让规划器的「稳定结构」去引导 RL 的「动态能力」，既快又稳地登楼。

---

## 🔧 方法详解

### 核心：把落脚点规划器塞进 RL 训练回路

- **并行 DCM 落脚点规划器**：把落脚点优化重构成 GPU 上的**离散可行落脚点并行搜索**，单步规划耗时从约 100ms 降到约 4ms（相比并行 MPC 约 25× 提速），从而能挂进大规模并行 RL 训练。
- 规划器输出的可行落脚点用作**高权重落脚点跟踪奖励**，把 RL 的探索**偏置到动力学可行的接触上**，而不是用硬约束卡死动作。

### 多阶段训练管线

1. **预训练（学安全落脚）**：用高权重落脚点跟踪奖励，让策略先学会把脚稳稳放到规划器给的可行点上。
2. **后训练（恢复速度）**：训练两个**分速段专家**——低速 [−0.3, 0.8] m/s、高速 [0.8, 1.6] m/s，调低落脚约束权重、调高速度跟踪权重，把被规划器压住的速度找回来。
3. **LoRA 融合**：把两个专家参数合进单一网络，加 **LoRA 层**做低秩适配，得到一个能在全速段平滑切换的统一策略。

### 训练设置

- **仿真**：IsaacLab，4096 并行环境；地形含平地、崎岖地形、金字塔形楼梯。
- **课程 / 随机化**：步频 1.0–1.5 Hz、随机基座位姿、指令速度重采样；质量/惯量/摩擦/恢复系数/关节增益/外力域随机化。
- **控制**：31 驱动自由度（腿/臂/腰/头），100 Hz 控制频率；真机搭载 Jetson Orin NX + RK3588 与 RealSense D435i 深度相机。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PLAN["🧮 并行 DCM 落脚点规划器"]
        SEARCH["GPU 并行离散搜索<br/>可行落脚点 (~4ms/步, 25×↑)"]
    end

    subgraph TRAIN["🎓 多阶段训练 (IsaacLab 4096 envs)"]
        PRE["① 预训练<br/>高权重落脚跟踪→学安全落脚"]
        POST["② 后训练 分速段专家<br/>低速 / 高速, 调回速度权重"]
        LORA["③ LoRA 融合<br/>专家合并→全速段平滑切换"]
    end

    subgraph DEPLOY["🚀 真机部署: LimX Oli (31 DOF)"]
        REAL["零任务级微调<br/>室外 15-20cm 台阶"]
        FAST["峰值 1.65 m/s<br/>33 级旋转梯 12s · 高速跨级"]
    end

    SEARCH -->|落脚点跟踪奖励<br/>引导探索| PRE
    PRE --> POST
    POST --> LORA
    LORA --> REAL
    REAL --> FAST

    style PLAN fill:#e8eef8,stroke:#2c3e80,color:#1a2452
    style TRAIN fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style DEPLOY fill:#fff3e0,stroke:#fb8c00,color:#4e342e
</div>

---

## 💡 核心贡献

1. **规划器引导 RL**：把基于模型的落脚点规划器嵌入 RL 训练回路，用「软引导（高权重跟踪奖励）」替代「硬约束」，兼得规划器的稳定结构与 RL 的动态能力。
2. **并行 DCM 规划器**：把落脚点优化改成 GPU 并行离散搜索，单步约 4ms（约 25× 于并行 MPC），使其能匹配大规模并行训练吞吐。
3. **多阶段 + LoRA 分速段专家**：预训练学安全落脚、后训练分速段恢复速度、LoRA 融合成单一全速段策略，缓解「快与稳难两全」。
4. **真机高速登楼**：LimX Oli 上峰值 1.65 m/s，12 秒登 33 级旋转楼梯，室外 15–20cm 台阶零任务级微调部署，高速时出现跨级（单步跨两级）行为；**广州塔机器人登楼赛冠军**。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 设置 / 结论 |
|---|---|
| 平台 | LimX Oli（1.65m / 55kg / 31 DOF），100 Hz 控制 |
| 仿真 | IsaacLab 4096 并行环境 → 真机零任务级微调 |
| 峰值上楼速度 | 1.65 m/s |
| 33 级旋转楼梯（17cm/级） | 约 12 秒登顶 |
| 1.5 m/s（25cm 台阶）成功率 | ≈ 85% |
| 速度跟踪 MAE | ≈ 0.05 m/s |
| 落脚点规划时延 | ≈ 4 ms/步（≈ 25× 于 MPC） |
| 真机室外台阶 | 15–20 cm/级，零任务级微调 |

> ⚠️ 详细数值与消融以 arXiv [2601.10365](https://arxiv.org/abs/2601.10365) 论文正文为准。

---

## 🤖 工程价值

- **软引导范式可迁移**：把「规划器输出当奖励而非硬约束」这一思路推广到台阶/踏脚石/沟壑等离散接触地形，是平衡安全与敏捷的通用手段。
- **并行规划器是关键使能**：4ms 级别的 GPU 并行落脚搜索，让 model-based 先验真正能挂进高吞吐 RL 训练，而非成为瓶颈。
- **LoRA 做能力合并**：用低秩适配把多个专精策略融成一个，避免多策略切换的工程复杂度，对「分工况专家 → 统一控制器」有借鉴意义。
- **限制**：DCM 动力学里 a≈1 的近似简化了优化但可能损失最优性；依赖局部高程图重建（1.8m × 1.2m 感知范围）；多阶段训练比单一统一策略更复杂；评测主要在金字塔/旋转楼梯，其他地形泛化尚未验证。

---

## 🎤 面试参考

**Q：为什么不直接用落脚点规划器的硬约束，而要做成奖励去「引导」？**
A：硬约束会把 RL 的动作空间卡死、逼出保守步态，跑不快；FastStair 把规划器输出的可行落脚点写成**高权重跟踪奖励**，只是把探索**偏置**到可行接触上，既保留稳定结构，又留出 RL 学动态、提速的余地。

**Q：为什么要把落脚规划器并行化？**
A：传统落脚优化单步约 100ms，挂进 4096 并行环境的 RL 训练会成为吞吐瓶颈；改成 GPU 上的离散可行落脚并行搜索后降到约 4ms（约 25× 于并行 MPC），才能与大规模并行训练匹配。

**Q：LoRA 在这里解决什么？**
A：低速与高速对落脚约束/速度跟踪的权重需求不同，先各训一个专家；LoRA 把两个专家低秩地融进单一网络，得到能在全速段平滑过渡的统一策略，省去运行时多策略切换。

---

## 🔗 相关阅读

- [BeamDojo: Learning Agile Humanoid Locomotion on Sparse Footholds (2502.10363)](https://arxiv.org/abs/2502.10363) — 同样面向稀疏/离散落脚点的敏捷人形运动
- [PolygMap: A Perceptive Locomotion Framework for Humanoid Robot Stair Climbing (2510.12346)](https://arxiv.org/abs/2510.12346) — 人形爬楼的感知运动框架，另一条路线
- [APEX: Learning Adaptive High-Platform Traversal for Humanoid Robots (2602.11143)](https://arxiv.org/abs/2602.11143) — 高平台攀爬，富接触多技能编排
- [Walk the PLANC: Physics-Guided RL for Agile Humanoid Locomotion on Constrained Footholds (2601.06286)](https://arxiv.org/abs/2601.06286) — 受约束落脚点上的物理引导 RL

---

> 备注：本笔记基于 arXiv 摘要、[arXiv HTML 正文](https://arxiv.org/html/2601.10365)、[项目主页](https://npcliu.github.io/FastStair)与公开搜索结果整理；具体数值、奖励权重与网络细节以 arXiv [2601.10365](https://arxiv.org/abs/2601.10365) 论文正文为准。
</content>
</invoke>
