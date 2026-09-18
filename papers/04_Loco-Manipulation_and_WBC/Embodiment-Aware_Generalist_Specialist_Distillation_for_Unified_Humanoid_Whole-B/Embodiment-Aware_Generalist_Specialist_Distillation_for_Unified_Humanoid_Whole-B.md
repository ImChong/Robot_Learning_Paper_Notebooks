---
layout: paper
paper_order: 47
title: "Embodiment-Aware Generalist Specialist Distillation for Unified Humanoid Whole-Body Control"
zhname: "EAGLE：面向跨本体人形全身控制的泛化-专家迭代蒸馏"
category: "Loco-Manipulation and WBC"
---

# Embodiment-Aware Generalist Specialist Distillation for Unified Humanoid Whole-Body Control
**一个策略管多种人形：用"泛化—专家"循环蒸馏，把 H1 / G1 / N1 / T1 / Adam 统一成一份 WBC 控制器**

> 📅 阅读日期: 2026-05-08
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 跨本体 · 策略蒸馏 · 统一指令空间

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.02960](https://arxiv.org/abs/2602.02960) |
| HTML | [在线阅读](https://arxiv.org/html/2602.02960v2) |
| PDF | [下载](https://arxiv.org/pdf/2602.02960) |
| alphaXiv | [overview](https://www.alphaxiv.org/overview/2602.02960) |
| **发布时间** | 2026-02-03 (arXiv) |
| 源码 | 截至论文发布暂未公开（作者主页 [@Bariona](https://github.com/Bariona)） |
| 提交日期 | 2026-02 |

**作者**：Quanquan Peng, Yunfeng Lin, Yufei Xue, Jiangmiao Pang, Weinan Zhang（上海交大 / 上海 AI Lab）

**机器人**：Unitree H1、Unitree G1、Booster T1、Fourier N1、PNDbotics Adam（仿真 5 台 + 实机 4 台）

---

## 🎯 一句话总结

EAGLE 把"跨本体人形 WBC"建成一个**迭代的"泛化—专家"蒸馏循环**：先在一个池子里同时训练多种本体的泛化策略；再为每个本体派生一个专家做精修；最后把各专家的新技能通过 DAgger 蒸馏回泛化策略，反复循环直至收敛——配合一套**统一的高维指令接口**（蹲、倾、底盘速度等同时支持），最终用**一份策略**驱动 H1 / G1 / N1 / T1 / Adam 等异构人形。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| WBC | Whole-Body Control | 全身控制 |
| RL | Reinforcement Learning | 强化学习 |
| DAgger | Dataset Aggregation | 模仿学习中"专家纠正轨迹"的在线蒸馏 |
| Embodiment | 机器人本体 | DoF / 拓扑 / 动力学不同的具体机器人 |
| Generalist | 跨本体的统一策略 | 一份网络对应多种本体 |
| Specialist | 单本体专家策略 | 在某台机器人上微调到最优 |

---

## ❓ 论文要解决什么问题？

当前主流人形 WBC 的 RL 工作（OmniH2O、HumanPlus、HOMIE 等）几乎都是**一台机器人 = 一份策略 + 一套奖励**：

1. **本体差异大**：不同机器人 DoF、关节限位、惯量分布、kinematic 拓扑都不同，奖励权重往往要重调；
2. **指令空间受限**：很多策略只能跟踪 base 速度，无法同时让"蹲下/侧倾/转身"作为统一可调指令；
3. **规模化部署困难**：当机器人型号 N 大时，重复"调奖励 → 训练 → 部署"的成本接近线性增长。

EAGLE 想直接拿出**一个网络**就能管多种机器人，并且只暴露"高维指令接口"给上层策略 / 用户，做 fleet-level 的人形控制。

---

## 🔧 方法拆解：EAGLE 怎么工作

### 1. 统一的高维指令接口

- 不再只跟踪 base 线/角速度，而是把
  - 底盘速度（v_x, v_y, ω_yaw）
  - 躯干姿态（pitch / roll，对应"前倾、侧倾"）
  - 高度指令（对应"蹲下 / 站起"）
  - 头部 / 手部目标（视任务）
  统一成一份**高维指令向量**喂给策略。
- 这样同一个策略就能在不同机器人上完成"蹲、倾、走、转"。

### 2. 泛化-专家迭代蒸馏循环

记当前 generalist 为 $\pi_G^{(k)}$，每个本体 $i$ 的 specialist 为 $\pi _ {S_i}^{(k)}$，循环：

1. **Pool training**：在多本体仿真池上训练 $\pi_G^{(0)}$，得到一个粗糙但通用的策略。
2. **Specialize**：对每台机器人 $i$，从 $\pi_G^{(k)}$ 派生 $\pi _ {S_i}^{(k)}$，在该机器人上做 RL 微调（针对它的 DoF / 动力学限制把性能推满）。
3. **Distill back**：用各 specialist 在自己机器人上 rollout 得到状态-动作分布，再以 DAgger 风格把多本体数据合并，蒸馏出新的 $\pi_G^{(k+1)}$。
4. **Repeat**：回到第 2 步，直至 generalist 在所有本体上都接近 specialist 性能。

### 3. 嵌入"本体感知"的输入

- 输入除了本体感知 (proprio) 还包含**本体 ID / 拓扑描述符**（DoF 数、关节顺序的 padding mask、URDF 语义特征等），让网络在前向时就知道"我现在是 G1 还是 N1"，自然分化出不同子流形。

### 4. 训练 & 部署栈

- 仿真：Isaac Sim / 类似 GPU 大规模并行；
- 算法：PPO（specialist）+ DAgger（蒸馏）；
- 部署：导出统一策略，跨 H1、G1、N1、T1 切换无需改奖励/重训。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph CMD["统一高维指令接口"]
        C1["base 速度 v_x v_y ω"]
        C2["躯干姿态 pitch / roll"]
        C3["高度指令 (蹲/站)"]
        C4["头部 / 手部目标 (可选)"]
    end

    subgraph POOL["多本体仿真池"]
        P1["Unitree H1"]
        P2["Unitree G1"]
        P3["Booster T1"]
        P4["Fourier N1"]
        P5["PNDbotics Adam"]
    end

    subgraph LOOP["EAGLE 迭代循环"]
        G0["Generalist π_G^(k)<br/>(单一网络 + 本体ID编码)"]
        S1["Specialist π_S1 (H1)"]
        S2["Specialist π_S2 (G1)"]
        S3["Specialist π_S3 (N1)"]
        S4["Specialist π_S4 (T1)"]
        S5["Specialist π_S5 (Adam)"]
        DAG["DAgger 蒸馏<br/>(多本体经验汇聚)"]
        G1NEW["Generalist π_G^(k+1)"]

        G0 -->|fork| S1
        G0 -->|fork| S2
        G0 -->|fork| S3
        G0 -->|fork| S4
        G0 -->|fork| S5
        S1 --> DAG
        S2 --> DAG
        S3 --> DAG
        S4 --> DAG
        S5 --> DAG
        DAG --> G1NEW
        G1NEW -.下一轮.-> G0
    end

    subgraph DEPLOY["统一部署"]
        D1["一份策略权重"]
        D2["仿真 5 机 / 实机 4 机"]
        D3["fleet-level 控制"]
    end

    CMD --> G0
    POOL --> G0
    G1NEW --> DEPLOY

    style CMD fill:#e8f4fd,stroke:#1f78b4
    style POOL fill:#f4ecf7,stroke:#8e44ad
    style LOOP fill:#fdebd0,stroke:#e67e22
    style DEPLOY fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **首个把"泛化-专家迭代蒸馏"完整跑通在跨本体人形 WBC 上**：5 仿真本体 + 4 实机统一训练。
2. **统一高维指令接口**：单一策略同时支持速度跟踪、躯干侧倾/前倾、高度（蹲/站），无需为每个能力单独训练 head。
3. **本体感知输入设计**：把 DoF / 拓扑信息送进策略，让一份网络在不同机器人上自然分化，规避了"per-robot reward tuning"。
4. **fleet-level 训练方法学**：当机器人种类增加时，只需为新机器人加一个 specialist + 重做一轮蒸馏，旧本体能力不退化。
5. **稳定性与精度都优于单本体基线**：实验显示统一策略在 command-tracking 精度与鲁棒性上**反超**部分单本体专门策略——蒸馏正向迁移。

---

## 📊 实验亮点

- **本体覆盖**：仿真 H1 / G1 / T1 / N1 / Adam 共 5 种；实机 H1 / G1 / N1 / T1 共 4 种。
- **任务**：变速行走、转向、蹲下走、躯干前倾走、抗扰动；
- **对比**：
  - 单本体 PPO（per-robot tuning）—— EAGLE 与之相当或更好；
  - 不蒸馏的多本体共训 baseline —— EAGLE 显著超过；
  - 去掉本体编码 —— 在 DoF 差异大的机器人上明显掉点。
- **真机表现**：同一份权重直接刷到 4 台不同人形，无需调参即能跟踪上述指令组合，是论文最核心的"工程信号"。

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---------|------|
| **跨本体范式** | 与传统"per-robot 训练"分道扬镳；为 humanoid foundation model 提供了一条"控制层先泛化"的路径 |
| **训练流程** | 把"PPO + DAgger"作为 generalist-specialist 循环的标准组合，可推广到操作策略蒸馏 |
| **指令接口** | 高维统一接口为上层 VLA / planner 提供了更稳定的"控制契约"，不再受不同机器人 API 差异困扰 |
| **fleet-level 部署** | 给后续人形量产场景（一个公司同时养 H1/G1/N1）提供了"加机器人不加策略"的可行性 |

---

## 🎤 面试参考

**Q：为什么需要"专家"这一步？直接多本体共训不行吗？**
A：纯共训容易陷入"折中策略"——所有本体上都还行但没一个最优；而且不同本体的奖励梯度方向常常冲突。先把 generalist 派生成 specialist，让每个 specialist 在自家机器人上把性能推满，再把这些极致经验蒸馏回 generalist，相当于让 generalist 同时拥有多个专家的"上限"，避免 race-to-the-bottom。

**Q：DAgger 蒸馏比直接行为克隆好在哪？**
A：DAgger 在 generalist 当前策略下采样状态，再用 specialist 给出修正动作，能持续覆盖 generalist 自己访问到的状态分布；行为克隆只学专家轨迹，会有 covariate shift。对于 WBC 这种长 horizon、误差累积大的任务，DAgger 能显著缓解发散。

**Q：本体差异这么大，一份网络真能吃下吗？**
A：关键是 (1) 输入侧加 embodiment 编码，让网络做条件化；(2) 动作维度统一到最大 DoF + mask；(3) 蒸馏阶段强制约束跨本体共享中间表示。这三点合起来，网络更像"在条件子空间里切换"而不是"硬塞 5 个策略"。

---

## 🔗 相关阅读

- [HOMIE (2502.13013)](https://arxiv.org/abs/2502.13013)：单本体 G1 上的 WBC 工程模板，可作为 specialist 起点
- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858)：另一个多任务 WBC 框架，但以单本体为主
- [DAgger (1011.0686)](https://arxiv.org/abs/1011.0686)：本工作蒸馏阶段的核心算法
- [Scalable and General WBC for Cross-Humanoid Locomotion](https://xhugwbc.github.io/)：另一条跨本体 WBC 路线，可对照
