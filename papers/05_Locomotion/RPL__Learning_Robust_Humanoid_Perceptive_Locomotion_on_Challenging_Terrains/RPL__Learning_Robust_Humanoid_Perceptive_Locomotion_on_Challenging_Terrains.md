---
layout: paper
paper_order: 11
title: "RPL: Learning Robust Humanoid Perceptive Locomotion on Challenging Terrains"
zhname: "RPL：挑战性地形上的鲁棒人形感知行走"
category: "Locomotion"
---

# RPL: Learning Robust Humanoid Perceptive Locomotion on Challenging Terrains
**RPL：挑战性地形上的鲁棒人形感知行走**

> 📅 阅读日期: 2026-06-17
>
> 🏷️ 板块: 05 Locomotion · 感知行走 / 特权蒸馏 / Transformer 策略 / 深度相机 / 挑战地形
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.03002](https://arxiv.org/abs/2602.03002) |
| HTML | [arXiv HTML](https://arxiv.org/html/2602.03002) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.03002) |
| 项目主页 | [rpl-humanoid.github.io](https://rpl-humanoid.github.io/) |
| **发布时间** | 2026-02-03 (arXiv) |
| 源码 | 截至当前未见公开代码仓库（以项目主页/arXiv 后续版本为准） |
| 作者 | Yuanhang Zhang, Younggyo Seo, Juyue Chen, Yifu Yuan, Koushil Sreenath, Pieter Abbeel, Carmelo Sferrazza, Karen Liu, Rocky Duan, Guanya Shi |
| 机构 | Amazon FAR · Carnegie Mellon University · UC Berkeley · Stanford University |
| 平台 | Unitree G1（双 ZED 2i 深度相机，前后各一） |
| 仿真 | NVIDIA IsaacGym 训练 → MuJoCo sim-to-sim 验证（自研 NVIDIA Warp 深度渲染，约 5× 加速） |

---

## 🎯 一句话总结

> 让人形机器人**只靠机载深度相机**在斜坡、上下楼梯、踏脚石这类挑战地形上稳健行走、还能背着负载来回走，是个又要感知、又要鲁棒、又得上真机的难题。RPL 的解法是经典但被认真做对的**「特权专家 → 深度学生」两阶段蒸馏**：先在仿真里用「上帝视角」的**特权高程图**为每类地形单独训一个**专家策略**（地形简单、专家好学），再用 **DAgger** 把这些专家**蒸馏**进一个统一的 **Transformer 学生策略**——它只能看机载**多路深度图 + 本体历史**。关键在两招专为深度感知设计的鲁棒化：**DFSV（随速度命令调节深度特征）**让策略按行进方向决定信任哪只相机、看多远，**RSM（随机侧向遮挡）**在训练时随机遮掉外围深度区域以适配未见过的地形宽度与不对称视野。真机 G1 带 **2kg 负载**双向穿越 20° 斜坡、台阶（22–30cm）、间隔 60cm 的 25cm 踏脚石。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RPL | Robust Perceptive Locomotion | 本文方法名：鲁棒感知行走 |
| DFSV | Depth Feature Scaling based on Velocity | 随速度命令调节深度特征：按行进方向决定信任哪只相机/看多远 |
| RSM | Random Side Masking | 随机侧向遮挡：训练时随机遮外围深度区，提升对地形宽度/不对称视野的泛化 |
| DAgger | Dataset Aggregation | 蒸馏所用的交互式模仿学习算法 |
| Height Map | 高程图 | 第一阶段专家用的特权地形高度栅格（1.6m×1.0m，0.1m 分辨率） |
| Privileged | 特权信息 | 仿真可得、真机不可得的「上帝视角」观测（如完美高程图） |

---

## ❓ 论文要解决什么问题？

1. **挑战地形 + 纯机载感知很难**：斜坡、上下楼梯、踏脚石需要精确的地形几何理解，而真机上只有**带噪、视野受限、可能不对称**的机载深度相机，没有特权高程图。
2. **单一端到端策略难一次学会所有地形**：把多种地形塞进一个策略直接 RL，探索难、训练不稳。
3. **感知鲁棒性是部署瓶颈**：相机噪声、视野遮挡、地形宽度变化、还要在**负载**下保持稳定，是 sim-to-real 失败的常见根因。

**目标**：用一个统一的、只依赖机载深度的策略，在多类挑战地形上鲁棒双向行走并承载负载。

---

## 🔧 方法详解

### 第一阶段：地形专家（特权高程图）

- 为四类地形分别训练**专家策略**：斜坡（最高 37°）、上楼、下楼（台阶 0.25–0.30m）、踏脚石（直径 0.25–0.40m、间隔 0.05–0.70m）。
- 专家可用**特权高程图**（1.6m×1.0m 栅格、0.1m 分辨率）作观测——地形已知，专家容易学好、学稳，把「运动 + 负载承载」技能解耦掌握。

### 第二阶段：Transformer 学生（多路深度相机）

- 用 **DAgger** 把多个地形专家**蒸馏**进一个**统一 Transformer 策略**；学生只能看**机载多路深度图 + 本体感知历史**，用**动作回归损失**对齐教师动作。
- 架构：每路深度图过 **CNN 编码器**，再用 **Transformer 融合**多视角观测 + 本体历史。

### 两招感知鲁棒化（核心创新）

1. **DFSV（随速度调节深度特征）**：根据**命令速度**自适应调制感知特征——由「速度-相机朝向对齐度」算出注意力缩放 δᵢ，让策略按行进方向**决定信任哪只相机、关注多远**（前进多看前相机，后退多看后相机）。
2. **RSM（随机侧向遮挡）**：训练时**随机遮掉外围深度区域**，迫使策略不依赖固定视野，泛化到**未见过的地形宽度与不对称传感数据**。

### 工程支撑：高效深度渲染

- 自研基于 **NVIDIA Warp** 的 GPU 深度渲染，同时支持**动态机器人 mesh + 静态地形 mesh** 的大规模并行环境，较现有仿真器约 **5× 加速**，让「多相机 + 大规模并行」的蒸馏训练变得可行。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph S1["🏔️ 阶段一: 地形专家 (特权高程图)"]
        HM["特权高程图<br/>1.6m×1.0m @0.1m"]
        E1["斜坡专家<br/>(≤37°)"]
        E2["上/下楼专家<br/>(0.25-0.30m)"]
        E3["踏脚石专家<br/>(间隔≤0.7m)"]
        HM --> E1
        HM --> E2
        HM --> E3
    end

    subgraph S2["🤖 阶段二: Transformer 学生 (机载深度)"]
        DEP["多路深度图<br/>(前后 ZED 2i)"]
        CNN["CNN 编码器<br/>每路一份"]
        TF["Transformer 融合<br/>+ 本体历史"]
        ACT["关节动作"]
        DEP --> CNN --> TF --> ACT
    end

    subgraph ROB["🛡️ 感知鲁棒化"]
        DFSV["DFSV<br/>随速度调节深度特征"]
        RSM["RSM<br/>随机侧向遮挡"]
    end

    subgraph OUT["🚀 部署: Unitree G1"]
        REAL["带 2kg 负载<br/>双向穿越斜坡/楼梯/踏脚石"]
        S2S["MuJoCo sim-to-sim<br/>零样本验证"]
    end

    E1 -. "DAgger 蒸馏" .-> TF
    E2 -. "DAgger 蒸馏" .-> TF
    E3 -. "DAgger 蒸馏" .-> TF
    DFSV --> TF
    RSM --> CNN
    ACT --> REAL
    REAL --> S2S

    style S1 fill:#e8eef8,stroke:#2c3e80,color:#1a2452
    style S2 fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style ROB fill:#fdecea,stroke:#c0392b,color:#641e16
    style OUT fill:#fff3e0,stroke:#fb8c00,color:#4e342e
</div>

---

## 💡 核心贡献

1. **两阶段特权蒸馏做感知行走**：地形专家用特权高程图各个击破，再蒸馏成一个只看机载深度的统一 Transformer 策略，兼顾「易训练」与「可部署」。
2. **DFSV——感知跟着速度走**：按命令速度自适应调节深度特征，让多相机系统在双向行走时知道「该看哪、看多远」。
3. **RSM——随机侧向遮挡**：训练期遮外围深度，提升对未见地形宽度与不对称视野的鲁棒性。
4. **高效 Warp 深度渲染**：约 5× 加速的多 mesh 深度仿真，支撑多相机大规模并行蒸馏。
5. **真机验证**：Unitree G1 带 2kg 负载，在 20° 斜坡、22–30cm 台阶、间隔 60cm 的 25cm 踏脚石上双向稳健行走。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 设置 / 结论 |
|---|---|
| 平台 | Unitree G1（前后各一只 ZED 2i 深度相机，Ncam=2 支持 2D 双向行走） |
| 仿真 | IsaacGym 训练 → MuJoCo sim-to-sim 验证；自研 Warp 深度渲染约 5× 加速 |
| 训练资源 | 阶段一 4×L40S / 24h；阶段二 8×L40S / 12h |
| 地形（训练） | 斜坡 ≤37°、上/下楼 0.25–0.30m、踏脚石 直径 0.25–0.40m·间隔 0.05–0.70m |
| 真机演示 | 20° 斜坡、台阶 22–30cm、25cm 踏脚石(间隔 60cm)，**带 2kg 负载双向穿越** |
| 关键结论 | 专家蒸馏 + DFSV + RSM 共同支撑「纯机载深度 + 负载」下的鲁棒双向感知行走 |

> ⚠️ 详细数值（各地形成功率、与基线/消融对比）以 arXiv [2602.03002](https://arxiv.org/abs/2602.03002) 论文正文与[项目主页](https://rpl-humanoid.github.io/)为准。

---

## 🤖 工程价值

- **专家-学生范式仍然好使**：把难训的「多地形 + 感知 + 鲁棒」拆成「特权专家分头学 + 深度学生统一蒸馏」，是 perceptive locomotion 落地的可靠工程路线。
- **感知该「按需」分配**：DFSV 把「行进方向 → 信任哪只相机」显式建模，是多相机人形的通用思路，比固定融合更省也更稳。
- **遮挡增广提泛化**：RSM 这类「训练期主动破坏感知」的增广，对真机视野受限/不对称很有针对性。
- **渲染是隐形瓶颈**：多相机蒸馏的真正成本在深度渲染，Warp 自研管线把它压下来才让训练规模可行。
- **限制**：以仿真训练 + sim-to-sim + 真机演示为主，缺与同类感知行走方法的大规模定量横评；截至当前未见开源代码，复现待官方释出。

---

## 🎤 面试参考

**Q：为什么不直接端到端用深度图 RL，而要先训特权专家再蒸馏？**
A：直接用带噪、视野受限的深度图做 RL，探索空间大、信号弱、训练极不稳。先给专家「上帝视角」高程图，地形已知、技能好学好稳；再用 DAgger 把成熟策略蒸馏给只看深度的学生，把「学技能」和「学感知」解耦，训练效率与稳定性都更好。

**Q：DFSV 解决了多相机的什么痛点？**
A：双向行走时前后相机的重要性随方向变化——前进该多信前相机、看远处落脚点，后退反之。DFSV 用速度-相机对齐度算注意力缩放，让策略自适应决定信任哪只相机、关注多远，而非把多路深度等权硬融合。

**Q：RSM 为什么有用？**
A：真机视野常被遮挡、地形宽度多变、左右传感也可能不对称。训练时随机遮外围深度，迫使策略不死依赖固定视野，从而对未见宽度与不对称感知更鲁棒——本质是针对感知的领域增广。

---

## 🔗 相关阅读

- [Learning Perceptive Humanoid Locomotion over Challenging Terrain (2503.00692)](https://arxiv.org/abs/2503.00692) — 同主题感知行走，可对比感知与训练范式
- [Gallant: 体素栅格人形 3D 受限地形行走](https://arxiv.org/abs/2511.14625) — 用体素占据栅格做完整 3D 感知，另一条感知路线
- [A Hybrid Autoencoder for Robust Heightmap from Fused Lidar and Depth (2602.05855)](https://arxiv.org/abs/2602.05855) — 同样关注鲁棒高程/深度感知
- [APEX: Adaptive High-Platform Traversal (2602.11143)](https://arxiv.org/abs/2602.11143) — 人形高平台穿越，挑战地形相关

---

> 备注：本笔记基于 arXiv 摘要、[arXiv HTML 正文](https://arxiv.org/html/2602.03002)、[项目主页](https://rpl-humanoid.github.io/)与公开搜索结果整理；公式记号与详细数值以 arXiv [2602.03002](https://arxiv.org/abs/2602.03002) 论文正文为准。
