---
layout: paper
paper_order: 1
title: "Collision-Free Humanoid Traversal in Cluttered Indoor Scenes"
zhname: "在杂乱室内场景中实现无碰撞人形穿越（Click-and-Traverse / CAT）"
category: "Loco-Manipulation and WBC"
---

# Collision-Free Humanoid Traversal in Cluttered Indoor Scenes
**杂乱室内场景中的人形无碰撞穿越**

> 📅 阅读日期: 2026-06-13
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 感知穿越 · 全空间约束 · 势场表征 · 场景生成 · RL + DAgger 蒸馏
>
> 🔁 推进轨: 模块轮转（14_Human_Motion → **04_Loco-Manipulation_and_WBC**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.16035](https://arxiv.org/abs/2601.16035) |
| HTML | [arXiv HTML](https://arxiv.org/html/2601.16035v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2601.16035) |
| 项目主页 | [axian12138.github.io/CAT](https://axian12138.github.io/CAT/) |
| **发布时间** | 2026-01-22 (arXiv) |
| 源码 | [GalaxyGeneralRobotics/Click-and-Traverse](https://github.com/GalaxyGeneralRobotics/Click-and-Traverse)（Apache-2.0） |
| 作者 | Han Xue, Sikai Liang, Zhikai Zhang, Zicheng Zeng, Yun Liu, Yunrui Lian, Jilong Wang, Qingtao Liu, Xuesong Shi, Li Yi |
| 机构 | 清华大学（Li Yi 团队）· 银河通用 Galaxy General Robotics |
| 提交日期 | 2026-01（arXiv:2601.16035） |
| 评测平台 | Unitree G1（MuJoCo 仿真 + 真机） |

---

## 🎯 一句话总结

> CAT 想解决"人形机器人在塞满杂物的室内里既要走又不能撞"的问题：核心是提出 **HumanoidPF（Humanoid Potential Field，人形势场）**——把"机器人身体 vs 周围障碍物"的空间关系直接编码成**无碰撞的运动方向场**，作为一种 sim-to-real gap 极小的感知表征喂给 RL 策略；再配合**混合场景生成**（真实 3D 室内场景裁片 + 程序化合成障碍）和**专家→通才 DAgger 蒸馏**，让一个策略学会跨障、下蹲、侧身挤过窄缝等"全空间约束"下的穿越技能。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| HumanoidPF | Humanoid Potential Field | 人形势场，把身体-障碍关系编码成无碰撞运动方向 |
| Full-Spatial Constraint | — | 全空间约束：地面 / 侧向 / 头顶三类障碍同时存在 |
| RL | Reinforcement Learning | 强化学习 |
| PPO | Proximal Policy Optimization | 近端策略优化，训练单场景专家 |
| DAgger | Dataset Aggregation | 数据集聚合，把多个专家蒸馏成一个通才策略 |
| Sim-to-Real | — | 仿真到真机迁移 |
| ONNX | Open Neural Network Exchange | 跨框架模型导出格式，便于真机部署 |

---

## ❓ 论文要解决什么问题？

人形机器人在真实室内里行动，难点不是平地走路，而是**周围全是不规则障碍**：地上散落杂物（要跨）、头顶有低矮悬挂物（要蹲）、两侧家具夹出窄缝（要侧身挤）。这类"全空间约束（full-spatial constraint）"有三个麻烦：

1. **障碍几何复杂**：不是规则方块，而是各种真实形状和摆放，策略很难把"看到的障碍"映射到"该怎么走"；
2. **感知表征难迁移**：直接喂原始点云 / 深度，仿真和真机分布差异大，sim-to-real gap 难收敛；
3. **技能多样且互相干扰**：跨、蹲、挤是差异很大的运动模式，单策略同时学容易顾此失彼。

CAT 的回答是：**别让策略直接啃原始几何，而是先把"身体和障碍的关系"翻译成一个无碰撞方向场（HumanoidPF）**，再用"先单场景练专家、后蒸馏成通才"的训练范式覆盖多样场景。

---

## 🔧 方法详解

### 1) HumanoidPF：人形势场

- 把机器人身体（按关键链节/采样点）与周围障碍物之间的空间关系，构造成一个类似**势场**的结构化表征；
- 它直接给出每个身体部位"往哪个方向移动可以远离碰撞"的**无碰撞运动方向**，相当于把"看障碍"这件事提前消化成了"该往哪躲"的可执行信号；
- 关键优势：作为感知表征，它的 **sim-to-real gap 出奇地小**——因为它描述的是几何相对关系而非原始传感器外观，仿真里学到的方向场在真机上几乎直接可用。

### 2) 混合场景生成（Hybrid Scene Generation）

- **真实 3D 室内场景裁片**：从真实室内三维场景里裁取局部，保证障碍布局贴近现实；
- **程序化合成障碍**：再叠加程序化生成的障碍物，扩大几何/摆放的多样性与难度；
- 两者混合 → 让策略在训练阶段就见过足够多样、足够难的杂乱场景，从而泛化到没见过的真实房间。

### 3) 专家 → 通才：PPO + DAgger 蒸馏

- **专家阶段**：在具体场景上用 **PPO** 训练单场景专家策略，专注把某类穿越技能学扎实；
- **通才阶段**：用 **DAgger** 把多个专家策略蒸馏进一个通才策略，让单一策略覆盖跨障 / 下蹲 / 侧身挤缝等多技能；
- **部署**：策略导出为 **ONNX**，在 MuJoCo 中评测并迁移到 Unitree G1 真机。

### 🧭 整体流程

<div class="mermaid">
flowchart TB
    subgraph SCENE["混合场景生成"]
        R3D["真实 3D 室内场景裁片"]
        PROC["程序化合成障碍"]
        R3D --> MIX["多样杂乱训练场景"]
        PROC --> MIX
    end

    subgraph PERC["感知表征"]
        OBS["机器人本体 + 障碍几何"]
        PF["HumanoidPF 人形势场<br/>→ 无碰撞运动方向场<br/>(sim-to-real gap 极小)"]
        OBS --> PF
    end

    subgraph TRAIN["训练范式"]
        EXP["单场景专家<br/>PPO"]
        GEN["通才策略<br/>DAgger 蒸馏"]
        EXP --> GEN
    end

    MIX --> EXP
    PF --> EXP
    PF --> GEN

    GEN --> ONNX["导出 ONNX"]
    ONNX --> SIMV["MuJoCo 仿真评测"]
    ONNX --> REAL["Unitree G1 真机：跨障 / 下蹲 / 挤窄缝"]

    style PERC fill:#e8f4fd,stroke:#1f78b4
    style SCENE fill:#fdebd0,stroke:#e67e22
    style TRAIN fill:#e8f8e8,stroke:#27ae60
    style REAL fill:#fceae8,stroke:#c0392b
</div>

---

## 💡 核心贡献

| 创新 | 描述 |
|---|---|
| **HumanoidPF 势场表征** | 把身体-障碍空间关系编码成无碰撞运动方向场，作为 sim-to-real gap 极小的感知输入，显著降低 RL 学穿越技能的难度 |
| **混合场景生成** | 真实 3D 室内场景裁片 + 程序化合成障碍，兼顾真实性与多样性，撑起泛化能力 |
| **专家→通才蒸馏** | PPO 训单场景专家、DAgger 蒸馏成一个通才策略，让单策略覆盖多类全空间约束穿越技能 |
| **真机验证** | 在 Unitree G1 上实现跨障、下蹲、侧身挤窄缝等无碰撞穿越，ONNX 直接部署 |

---

## 📊 实验亮点

- **平台**：Unitree G1 人形机器人（MuJoCo 仿真 + 真机）；
- **任务**：全空间约束下的无碰撞穿越——跨过地面杂物、蹲过低矮悬挂物、侧身挤过窄缝；
- **关键结论**：HumanoidPF 作为感知表征 sim-to-real gap 极小，仿真训练的策略可直接迁移真机；混合场景生成显著提升对未见真实室内场景的泛化。

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---|---|
| **感知表征设计** | "把原始几何先翻译成可执行的方向场再喂策略"是一种很实用的降 sim-to-real gap 思路，可复用到其他富接触/避障足式任务 |
| **数据生成范式** | 真实场景裁片 + 程序化障碍的混合生成，为"训练数据多样性 vs 真实性"的权衡提供了可借鉴模板 |
| **多技能整合** | 专家→通才蒸馏给"如何在一个策略里塞进差异很大的运动模式"提供了工程闭环 |

---

## 🎤 面试参考

**Q：为什么不直接把点云/深度喂给 RL 策略，而要先算 HumanoidPF？**
A：原始传感器输入在仿真和真机之间外观差异大（噪声、缺失、纹理），策略容易过拟合到仿真外观，迁移时崩。HumanoidPF 描述的是"身体各部位相对障碍的无碰撞方向"，是几何相对关系，几乎不受传感器外观影响，所以 sim-to-real gap 很小，仿真里学的方向场真机直接能用。

**Q：为什么要"专家→通才"两段式，而不是一上来训一个通才？**
A：跨障、下蹲、挤窄缝的最优动作分布差异很大，一个策略从零同时学多技能容易梯度互相拉扯、谁都学不好。先在单场景把每个技能用 PPO 练扎实拿到高质量专家，再用 DAgger 把它们的行为蒸馏进一个通才，相当于"先分头攻坚再合并"，训练更稳、覆盖更全。

**Q：混合场景生成解决了什么？**
A：纯程序化障碍够多样但不真实，纯真实场景够真实但难规模化、难覆盖罕见难例。混合二者——真实裁片保证分布贴近现实、程序化障碍补足多样性和难度——让策略在部署到没见过的真实房间时仍然稳。

---

## 💬 讨论记录

> 此部分在阅读讨论后更新
