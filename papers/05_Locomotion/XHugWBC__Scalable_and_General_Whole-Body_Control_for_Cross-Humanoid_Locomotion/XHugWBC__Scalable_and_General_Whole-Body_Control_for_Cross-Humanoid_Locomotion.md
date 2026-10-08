---
layout: paper
paper_order: 8
title: "Scalable and General Whole-Body Control for Cross-Humanoid Locomotion"
zhname: "XHugWBC：跨形态人形行走的规模化通用全身控制"
category: "Locomotion"
---

# Scalable and General Whole-Body Control for Cross-Humanoid Locomotion (XHugWBC)
**XHugWBC：跨形态人形行走的规模化通用全身控制**

> 📅 阅读日期: 2026-05-28
>
> 🏷️ 板块: 05 Locomotion · 跨本体 / 全身控制 / 形态随机化 / 零样本迁移 / 遥操作
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.05791](https://arxiv.org/abs/2602.05791) |
| HTML | [arXiv HTML v1](https://arxiv.org/html/2602.05791v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.05791) |
| 项目主页 | [xhugwbc.github.io](https://xhugwbc.github.io/) |
| **发布时间** | 2026-02-05 (arXiv) |
| 源码 | 截至当前未见公开发布（关注项目主页与 [SJTU-Marl](https://github.com/sjtu-marl) 后续更新） |
| 作者 | Yufei Xue, Yunfeng Lin, Wentao Dong, Yang Tang, Jingbo Wang, Jiangmiao Pang, Ming Zhou, Minghuan Liu, Weinan Zhang |
| 机构 | Shanghai Jiao Tong University · Shanghai AI Lab · ECNU |
| 发表时间 | 2026-02 |
| 前作 | [HugWBC (2502.03206)](https://arxiv.org/abs/2502.03206) — 单本体的统一全身控制器 |

---

## 🎯 一句话总结

> 现有人形全身控制器（HugWBC、HOVER、ExBody2 等）一次只能针对**一种**机器人训练，换平台就要重训甚至重新调奖励；本文提出 **XHugWBC** = **物理一致的形态随机化** + **语义对齐的观测/动作空间** + **形态-动力学感知的策略架构**，**一次训练、十二仿真 + 七真机零样本通用**，并且**同一策略**就能直接接全身遥操作，跨本体的复杂技能（蹲跳、单脚站、负载行走）都能跑。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| WBC | Whole-Body Control | 全身控制：上下肢一致的力矩/位置指令生成 |
| DoF | Degree of Freedom | 自由度，不同机器人差异极大（从 ~17 到 ~30） |
| Cross-Embodiment | 跨本体 | 同一策略适配不同机型，本文核心目标 |
| Morphological Randomization | 形态随机化 | 训练时随机改 link 长/惯量/质量分布、关节限位等 |
| DR | Domain Randomization | 域随机化，本文 morph 是其形态分支 |
| Zero-shot Transfer | 零样本迁移 | 训练阶段没见过的本体，部署即能用 |
| Semantic Alignment | 语义对齐 | obs/action 不按关节物理顺序，而按身体语义槽位编码 |
| RSI | Reference State Initialization | 用参考动作初始化训练状态，沿用 DeepMimic 习惯 |

---

## ❓ 论文要解决什么问题？

人形 WBC 的现状：
1. **HugWBC / HOVER / ExBody2** 在 Unitree H1、G1、AgiBot A2 这些**单一**平台上能跑得很好；
2. 但**每换一个新机型**——Booster T1、Fourier GR-1、Tien Kung、Dobby、Adam Lite 等——都要重新训练，甚至要重写 reward / 重新调 limit；
3. 工程团队和研究社区都被"一机一策略"卡得很死，**没有"WBC 通用模型"**。

**本文的目标**：训出一个**真正跨本体**的策略，做到：
- 零样本部署到新机器人；
- 对极端的 morph / 动力学差异稳健（DoF、link 长度、传动比、惯量都不同）；
- 不光会走，还能**直接接遥操作**输出全身动作。

---

## 🔧 方法详解

XHugWBC 的核心配方包含三个技术点：

### 1. 物理一致的形态随机化（Physics-Consistent Morphological Randomization）

不是随便乱改 URDF 参数，而是**保持物理量自洽**：

| 维度 | 随机化内容 | 约束 |
|---|---|---|
| 几何 | 上下肢 link 长度、宽度 | 必须满足"质量 / 惯量 / 连杆比"自洽 |
| 质量 | base / link 质量分布 | 总质心位置不能漂离合理范围 |
| 关节 | 关节限位、传动比、电机参数 | 力矩-速度曲线保持物理可达 |
| 接触 | 足底形状 / 摩擦系数 | 与 link 几何一致 |

→ 这一步让训练分布**覆盖未来真机可能出现的"任何合理"形态**，而不是塌缩到几个固定机型。

### 2. 语义对齐的观测 / 动作空间（Semantically Aligned Obs / Action）

最关键的工程巧思：

- 传统做法：obs/action **按关节物理顺序** flatten，机器人 A 的"左肩 pitch"和机器人 B 的"左肩 pitch"在向量里**索引不一样**，策略学不到通用映射；
- XHugWBC：把所有人形机器人的关节按**语义槽位**编排（头/左肩/左肘/左腕/左髋/左膝/左踝/腰/右半身……），缺失的关节用 mask 标记；
- 这样无论是 17 DoF 的 Dobby 还是 30+ DoF 的 H1/G1，策略看到的都是**同一个抽象身体**。

→ 这是把 cross-embodiment 从"多任务学习"层面真正降到"统一表征"层面。

### 3. 形态-动力学感知的策略架构（Morph-Dynamics-Aware Policy）

- 策略额外接收**机器人的形态/动力学描述向量**（link 长度、质量分布、关节限位、传动比……）作为 condition；
- 类似 Foundation Model 的"prompt 模式"——身体描述当作 context，策略据此调出对应的运动先验；
- 配合大规模并行（IsaacGym/IsaacLab）形态随机化训练，策略学到一个**条件运动先验**，看到新机器人的描述就能立即生成合理动作。

### 4. 训练流程

- **数据驱动**：用 AMASS / 重定向后的人形参考动作做 RSI；
- **指令空间**：与 HugWBC 一致——速度命令、姿态偏置、步频、上身关节角度 …… 适合直接接遥操作；
- **奖励**：仿真精度跟踪 + 上身风格 + 接触/能耗约束，跨本体共用一套结构。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["🎥 训练数据"]
        AMASS["AMASS / 人形重定向<br/>参考动作库"]
        DESC["机器人形态描述<br/>(link 长 / 质量 / 限位 / 传动)"]
    end

    subgraph DR["🎲 物理一致形态随机化"]
        GEO["几何随机化<br/>(link 长 / 宽)"]
        MASS["质量 / 惯量分布"]
        JOINT["关节限位 / 传动 / 电机参数"]
        CONS["物理自洽约束<br/>(质心 / 力矩-速度)"]
    end

    subgraph OBS["🧩 语义对齐观测 / 动作"]
        SLOT["按身体语义槽位编排<br/>(头 / 肩 / 肘 / 髋 / 膝 / 踝 ...)"]
        MASK["缺失关节用 mask"]
    end

    subgraph POL["🧠 形态-动力学感知策略"]
        ENC["形态 / 动力学 Encoder<br/>(条件运动先验)"]
        ACTOR["Actor-Critic<br/>(HugWBC 指令空间)"]
    end

    subgraph TRAIN["🚂 大规模并行训练"]
        SIM["IsaacGym / IsaacLab<br/>多本体并行环境"]
        RSI["参考状态初始化 + 奖励"]
    end

    subgraph DEPLOY["🚀 零样本部署"]
        SIM12["12 个仿真人形<br/>(H1/G1/T1/GR-1/A2/Dobby/Tien Kung ...)"]
        REAL7["7 台真机零样本<br/>+ 实时全身遥操作"]
    end

    AMASS --> RSI
    DESC --> ENC
    GEO --> CONS
    MASS --> CONS
    JOINT --> CONS
    CONS --> SIM
    SLOT --> ACTOR
    MASK --> ACTOR
    ENC --> ACTOR
    ACTOR --> SIM
    SIM --> RSI
    RSI --> ACTOR
    ACTOR --> SIM12
    ACTOR --> REAL7

    style DATA fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style DR fill:#fef6e4,stroke:#d35400,color:#5e2c00
    style OBS fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style POL fill:#fde2e2,stroke:#c0392b,color:#5d1a14
    style TRAIN fill:#f3e8ff,stroke:#7e57c2,color:#311b92
    style DEPLOY fill:#fff3e0,stroke:#fb8c00,color:#4e342e
</div>

---

## 💡 核心贡献

1. **首个"跨本体通用 WBC"**：一次训练，覆盖 12 仿真 + 7 真机，零样本不再"一机一策略"。
2. **物理一致形态随机化**：在 link / 质量 / 关节 / 接触参数四个维度同时变，且保持物理自洽，让训练分布真正覆盖目标本体集合。
3. **语义对齐 obs/action**：用身体语义槽位 + mask 解决"不同 DoF 维度不一致"难题，把跨本体迁移从多任务降到统一表征。
4. **形态-动力学感知策略**：用机器人描述向量当 condition，让策略具备 Foundation-Model 风格的"prompt 即新本体"能力。
5. **同策略 → 全身遥操作**：与 HugWBC 一致的指令空间，让 cross-embodiment 模型直接可作为遥操作底层执行器。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 结论 |
|---|---|
| 仿真覆盖 | **12 个不同 DoF / 形态的人形机器人** 一次性通用 |
| 真机覆盖 | **7 台真实人形零样本部署**（包含 Unitree H1/G1、Booster、Fourier、Tien Kung、Dobby 等） |
| 任务成功率 | 论文报告：跨平台综合 **100% 任务成功率**（基础移动 + 全身命令跟随） |
| 任务多样性 | 速度行走 / 转向 / 姿态偏置 / 步频调节 / 单脚站 / 蹲 / 负载携带 / 蹬腿 / 全身遥操作 |
| 对比基线 | 单本体训练的 HugWBC / Per-embodiment policy；XHugWBC 在 morph 随机化下显著更鲁棒 |
| 失败模式 | 极端 morph（远超训练分布边界）会出现细节抖动，但不会跌倒 |

> ⚠️ 详细数值（每台机器人独立成功率、任务级误差、消融配置）以 arXiv [2602.05791](https://arxiv.org/abs/2602.05791) 论文正文与项目主页 [xhugwbc.github.io](https://xhugwbc.github.io/) 为准。

---

## 🤖 工程价值

- **量产人形的"内核"**：人形赛道现在硬件迭代极快（每半年一台新机），**让 WBC 跟着硬件迭代**是个一直成本巨大的问题——XHugWBC 给出了"训练一次、新本体即插即用"的工程路径。
- **统一遥操作底层**：把同一策略复用为遥操作执行器，省掉每台机器人单独训"motion tracker"的工作。
- **Foundation 思路在 WBC 落地**：形态-动力学描述当作 prompt，是把 LLM 的 conditioning 范式搬进 motor control，未来还可以接更复杂的语言/视觉 condition。
- **限制**：物理一致随机化对仿真器的 URDF 处理、电机模型有强依赖，迁移到非常异构（如带轮足、外骨骼）的本体还需要专门扩 morph schema。

---

## 🎤 面试参考

**Q：和 HugWBC、HOVER 的最大区别？**
A：HugWBC / HOVER 都是**单一本体**上的通用全身控制器（覆盖多任务、多步态），但策略本身是 per-robot 训练的。XHugWBC 是**跨本体**——一套策略服务多机器人，关键是 obs/action 的语义对齐与策略输入加上形态描述。

**Q：物理一致的形态随机化和普通 DR 有何不同？**
A：普通 DR 随便扰动质量 / 摩擦 / 延迟。物理一致 = 改 link 长度时，质量、惯量、质心、关节限位、电机力矩-速度曲线**同时按物理可行约束一起改**，避免训出来的策略在仿真里 work、在真机上瞬间崩溃。

**Q：语义对齐 obs/action 具体怎么做？**
A：定义一组**身体语义槽位**（头/颈/左肩/左肘/左腕/左髋/左膝/左踝/腰/右半身/双手指 ……），每个真机按其关节对应到槽位，缺失的槽位置零 + mask 标记。所有机器人共享同一个观测/动作向量布局，只是 mask 不同。

**Q：策略架构为什么需要看到"机器人描述向量"？**
A：因为光看 mask 仍然不知道这个机器人"腿有多长、有多重、最大力矩多少"。把这些静态属性作为 condition 给策略，等价于"这是机器人 A 的身体说明书"，让策略据此调整步幅 / 力矩输出。

**Q：怎么验证它真的"零样本"而不是在某个隐式 distribution 里？**
A：论文设计训练形态分布，真机集合（7 台）刻意选择训练时**未出现的具体型号**（仅在 morph 参数包络内），观察真机零样本任务成功率作为验证。

**Q：哪些是它的边界？**
A：①训练分布外的极端形态（轮足、外骨骼、过小/过大尺寸）需扩 schema；②对力矩-速度曲线偏离仿真假设的真机仍需少量 sysid；③细粒度灵巧操作（手指级）不在 WBC 覆盖范围。

---

## 🔗 相关阅读

- [HugWBC (2502.03206)](https://arxiv.org/abs/2502.03206) — 同一作者前作，单本体 WBC，本文的"内核"
- [HOVER (2410.21229)](https://arxiv.org/abs/2410.21229) — 通用神经 WBC，单本体多任务
- [ExBody2 (2412.13196)](https://arxiv.org/abs/2412.13196) — 全身表达性控制，单本体
- [General Humanoid WBC via Pretraining and Fast Adaptation (FAST)](https://github.com/BeingBeyond/FAST) — 与本文互补：FAST 偏"少样本快速适配"，XHugWBC 偏"零样本通用"
- [HumanPlus / OmniH2O](https://human2humanoid.com/) — 遥操作执行器的近邻线索，可与 XHugWBC 接驳

---

> 备注：本笔记基于 arXiv 摘要、项目主页 [xhugwbc.github.io](https://xhugwbc.github.io/) 与公开搜索结果整理；详细数值（每平台成功率、消融、训练规模 / 算力开销、所用仿真器版本）以 arXiv [2602.05791](https://arxiv.org/abs/2602.05791) 论文正文为准。截至当前未见作者团队公开训练代码，关注 [SJTU MARL](https://github.com/sjtu-marl) 与项目主页后续更新。
