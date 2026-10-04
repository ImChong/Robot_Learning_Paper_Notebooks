---
layout: paper
paper_order: 17
title: "GuideWalk: Learning Unified Autonomous Navigation and Locomotion for Humanoid Robots across Versatile Terrains"
zhname: "GuideWalk：面向多样地形的人形机器人统一自主导航与运动策略"
category: "Navigation"
---

# GuideWalk: Learning Unified Autonomous Navigation and Locomotion for Humanoid Robots across Versatile Terrains
**把「可通过性感知的导航规划」与「地形自适应的运动控制」用复合教师蒸馏成一个统一策略，再经 RL+行为克隆微调，让人形机器人在楼梯/斜坡/窄梁/杂乱场景中既能避障又能稳步行走**

> 📅 阅读日期: 2026-07-03
>
> 🏷️ 板块: 08 Navigation · 导航-运动统一策略 · 可通过性感知 · 复合教师蒸馏 · 多地形
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2606.10449](https://arxiv.org/abs/2606.10449) |
| HTML | [arXiv HTML](https://arxiv.org/html/2606.10449) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2606.10449) |
| 项目主页 | [guide-walk.github.io/GuideWalk](https://guide-walk.github.io/GuideWalk) |
| 源码 | 截至当前未见公开发布（项目页仅提供演示视频，未挂代码/数据） |
| **发布时间** | 2026-06-09（arXiv v1，v2 2026-06-13） |
| 机构 | **哈尔滨工业大学 HIT / 乐聚机器人 Leju Robotics** |
| 主要作者 | **Haoxuan Han**, Chen Chen, Linao Gong, Xin Yang, …, Yao Su, Fenghua He |
| 机器人 | **Kuavo 人形（28-DoF：12 腿 + 14 臂 + 2 头）· Livox MID360 LiDAR + Orbbec Gemini 335Lg 深度相机** |

---

## 🎯 一句话总结

> 让人形机器人「自己走到目标」需要同时做两件难以兼顾的事：**高层导航**要绕开障碍、选择可走的路；**底层运动**要在楼梯、斜坡、窄梁上维持动态平衡。以往常把两者拆成独立模块，接口处容易「规划出一条运动上根本走不稳的路」。GuideWalk 把二者拧成**一个统一端到端策略**：先用一个「导航教师（DWA）+ 运动教师（AMP）」组成的**复合教师**做 DAgger 蒸馏，再用 **PPO + 行为克隆** 联合微调，既保留教师的稳态行为，又让策略在真实退化下自我探索改进。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DWA | Dynamic Window Approach | 动态窗口法，经典局部避障，按 (v, ω) 评分选速度 |
| AMP | Adversarial Motion Priors | 对抗式动作先验，用动捕数据训练自然步态 |
| DAgger | Dataset Aggregation | 数据集聚合式模仿学习，逐步纠正学生策略分布偏移 |
| BC | Behavior Cloning | 行为克隆，监督式模仿教师动作 |
| Traversability | — | 可通过性，衡量某地形区域是否可安全走过 |
| Elevation Map | — | 高程图，由 LiDAR 构建的局部地形高度栅格 |

---

## ❓ 论文要解决什么问题？

人形机器人自主移动，本质上要在**两个层级**同时成功：

1. **导航层**：在有障碍、地形起伏的环境里，规划出一条既能到达目标、又能避开碰撞的路径；
2. **运动层**：把导航给出的速度指令，转成在**楼梯/斜坡/窄梁**上仍能保持动态平衡的关节动作。

传统「导航 + 运动」两段式流水线的痛点在于**解耦**：导航模块往往不知道脚下地形能不能走稳，可能规划出运动层执行不了的路径；而运动模块也不理解全局避障意图。GuideWalk 的目标就是把这两层**统一到一个策略**里，让「往哪走」和「怎么走」相互知情。

---

## 🔧 方法详解

### 1. 显式速度引导（解耦避障与地形评估）
设计一个**显式的速度引导模块**：把「避障」与「地形可通过性评估」拆开单独处理，再合成为一个速度指令。避障沿用 **DWA**——枚举可行 (v, ω) 速度对，按「朝向目标的对齐度 + 距障碍的最小余量 + 速度大小」打分，并受运动学、动态窗口、碰撞约束限制。地形侧则依赖 **LiDAR 高程图**判断脚下是否可走。

### 2. 复合教师（导航教师 + 运动教师）
- **导航教师**：基于 DWA 的引导，给出目标导向、可行的速度命令；
- **运动教师**：用 **AMP + 动捕数据**训练的参数化步态策略，输入速度命令与**特权观测**（精确地形、无噪本体感知），输出关节动作。
- 两位教师的输出被合成为「目标导向 + 动态可行」的动作监督信号。

### 3. 两阶段训练：DAgger 蒸馏 → RL+BC 微调
- **阶段一（DAgger 蒸馏）**：学生策略用**真实可得的观测**（含降采样到 32×18 的深度图）监督模仿复合教师的动作，得到统一的「导航-运动」策略；
- **阶段二（RL+BC 联合微调）**：用 **PPO** 做强化学习，附加**行为克隆辅助损失**保住教师的稳态行为，联合目标为 `Loss = L_PPO + λ·L_BC`（λ=0.2），在探索改进与「不忘教师」之间取得平衡。

### 4. 为何这样设计
教师用特权信息学到「稳而优」的行为，但部署时拿不到特权信息；纯蒸馏又会在分布外场景崩掉。GuideWalk 用 BC 辅助的 RL 微调，让策略在**真实观测 + 真实退化**下继续自我优化，同时不丢掉教师的动态平衡先验——这正是「统一策略」能同时兼顾导航意图与运动稳定的关键。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SENS["👁️ 感知输入"]
        LIDAR["Livox MID360<br/>高程图/可通过性"]
        DEPTH["深度相机<br/>降采样 32×18"]
        GOAL["目标位姿"]
    end

    subgraph GUIDE["🧭 显式速度引导"]
        DWA["DWA 避障<br/>(v,ω) 评分"]
        TRAV["地形可通过性评估"]
        VEL["合成速度指令"]
    end

    subgraph TEACHER["👨‍🏫 复合教师(特权信息)"]
        NAVT["导航教师<br/>目标导向速度"]
        LOCOT["运动教师 AMP<br/>动捕→稳态步态"]
    end

    subgraph TRAIN["🎓 两阶段训练"]
        DAGGER["阶段一 DAgger 蒸馏<br/>真实观测→统一策略"]
        RLBC["阶段二 RL+BC 微调<br/>L_PPO + 0.2·L_BC"]
    end

    subgraph OUT["🤖 统一策略执行"]
        EXEC["Kuavo 28-DoF<br/>楼梯/斜坡/窄梁/杂乱"]
    end

    LIDAR --> TRAV
    DEPTH --> DAGGER
    GOAL --> DWA
    DWA --> VEL
    TRAV --> VEL
    VEL --> NAVT
    NAVT --> DAGGER
    LOCOT --> DAGGER
    DAGGER --> RLBC --> EXEC
    EXEC -. 反馈观测 .-> TRAV

    style SENS fill:#e8f4fd,stroke:#1f78b4
    style GUIDE fill:#fff7e0,stroke:#d4a017
    style TEACHER fill:#f3e8ff,stroke:#8e44ad
    style TRAIN fill:#fde8f0,stroke:#c0399a
    style OUT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 📊 实验与结果

- **仿真（1000 并行环境）**：导航成功率 **99.0%**，平均导航耗时 **15.51s**；在楼梯、斜坡、窄梁等地形上的通过成功率 **96.8%–99.8%**；对障碍保持约 **0.65m** 的安全余量。
- **多地形覆盖**：平地、上/下楼梯、斜坡、窄梁、杂乱障碍等场景均通过测试。
- **真机验证**：在 Kuavo 人形上完成「无障碍直行、静态障碍避让、动态障碍碰撞响应」三类实机演示。

---

## 💡 核心贡献

1. **导航-运动统一策略**：把可通过性感知的导航规划与地形自适应运动控制融进一个端到端策略，避免两段式流水线的接口失配。
2. **复合教师蒸馏**：DWA 导航教师 + AMP 运动教师联合监督，兼顾「到达目标」与「动态可行」。
3. **RL+BC 微调范式**：PPO 加行为克隆辅助损失，在探索改进与保留教师稳态行为之间取得平衡。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **导航即运动** | 让「往哪走」与「怎么走稳」相互知情，是人形自主移动落地的关键 |
| **可通过性感知** | 用 LiDAR 高程图把地形能否走稳纳入导航决策，减少「规划出走不稳的路」 |
| **特权蒸馏 + 微调** | 教师用特权信息学稳态行为、学生在真实观测下微调，是 sim-to-real 的常用而有效范式 |
| **多地形鲁棒** | 楼梯/斜坡/窄梁统一处理，向「家庭/楼宇场景自主移动」靠近 |

---

## 🎤 面试参考

**Q：为什么把导航和运动做成一个统一策略，而不是分两段？**
A：两段式里导航模块通常不知道脚下地形能否走稳，可能规划出运动层执行不了的路径；运动模块也不理解全局避障意图。统一策略让两层信息相互知情，从源头避免「规划-执行」失配，尤其在楼梯、窄梁这类稳定性敏感的地形上更重要。

**Q：复合教师里的两个教师各自解决什么？**
A：导航教师（DWA）负责给出目标导向、避障可行的速度命令；运动教师（AMP + 动捕）负责把速度命令转成自然且动态稳定的步态。它们用特权信息（精确地形、无噪本体感知）学到「稳而优」的行为，作为学生蒸馏的监督。

**Q：为什么蒸馏后还要 RL+BC 微调？**
A：教师依赖部署时拿不到的特权信息，纯蒸馏在分布外场景易崩。用 PPO 在真实观测下继续探索改进，同时加行为克隆辅助损失（λ=0.2）拉住教师的稳态先验，兼顾「继续变强」与「不忘会走稳」。

---

## 🔗 相关阅读

- [GuideWalk arXiv](https://arxiv.org/abs/2606.10449) · [HTML](https://arxiv.org/html/2606.10449) · [PDF](https://arxiv.org/pdf/2606.10449) · [项目主页](https://guide-walk.github.io/GuideWalk)
- 同模块对照：
  - [FocusNav](../FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local/FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local.html)（路径点引导的局部导航注意力）
  - [Gallant](../Gallant__Voxel_Grid-based_Humanoid_Locomotion_and_Local-navigation_across_3D_Constrained_Terrains/Gallant__Voxel_Grid-based_Humanoid_Locomotion_and_Local-navigation_across_3D_Constrained_Terrains.html)（体素栅格局部导航 + 运动跨约束地形）
  - [STATE-NAV](../STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain/STATE-NAV__Stability-Aware_Traversability_Estimation_for_Bipedal_Navigation_on_Rough_Terrain.html)（稳定性感知的可通过性估计）
- 方法线对照：可通过性感知导航 + 教师蒸馏 + RL 微调，是「导航-运动统一控制」的代表工作
