---
layout: paper
paper_order: 10
title: "CMR: Contractive Mapping Embeddings for Robust Humanoid Locomotion on Unstructured Terrains"
zhname: "CMR：非结构地形上的鲁棒人形行走收缩映射嵌入"
category: "Locomotion"
---

# CMR: Contractive Mapping Embeddings for Robust Humanoid Locomotion on Unstructured Terrains
**CMR：非结构地形上的鲁棒人形行走收缩映射嵌入**

> 📅 阅读日期: 2026-06-15
>
> 🏷️ 板块: 05 Locomotion · 鲁棒控制 / 表示学习 / 收缩理论 / 抗观测噪声 / 非结构地形
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.03511](https://arxiv.org/abs/2602.03511) |
| HTML | [arXiv HTML](https://arxiv.org/html/2602.03511) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.03511) |
| **发布时间** | 2026-02-03 (arXiv) |
| 源码 | 截至当前论文未给出公开仓库链接（以 arXiv 后续版本/作者主页为准） |
| 作者 | Qixin Zeng, Hongyin Zhang, Shangke Lyu, Junxi Jin, Donglin Wang\*, Chao Huang\* |
| 机构 | University of Southampton · Westlake University · Nanjing University |
| 平台 | Unitree G1（12-DOF 下肢 / 29-DOF 全身两种配置） |
| 仿真 | Isaac Gym 训练 → MuJoCo sim-to-sim 验证 |

---

## 🎯 一句话总结

> 非结构地形上，人形机器人的传感器会出错、模型也不准，**观测噪声**容易在闭环里被放大成失稳。CMR 的思路是：与其在原始观测空间里硬抗噪声，不如**把观测映射到一个「收缩」潜空间**——在那里相邻状态的扰动会**随时间逐步收缩衰减**。它用**对比学习（InfoNCE）**保住任务相关的语义结构（防止收缩过度把有用信息也压没了），同时用 **Lipschitz 正则**显式逼策略满足收缩条件，二者写成一个**辅助损失**直接加进 PPO；理论上还证明了：当潜动态满足收缩性（κ<1），策略性能因噪声的退化被一个**与时间步长无关**的上界 `O(η/(1−κ))` 框住，而非标准分析里随时域指数爆炸。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| CMR | Contractive Mapping for Robustness | 本文方法名：收缩映射做鲁棒性 |
| Contractive Mapping | 收缩映射 | 把观测映到潜空间后，扰动随时间衰减而非放大 |
| Contraction Theory | 收缩理论 | 用收缩映射定理给「噪声→性能退化」一个紧上界 |
| InfoNCE | 对比学习损失 | 保留任务相关语义结构，防止收缩过度丢信息 |
| Lipschitz | 利普希茨约束 | 限制映射对输入的敏感度，显式逼出收缩性 |
| κ (kappa) | 收缩因子 | <1 时潜动态收缩；本文取 0.1 |
| HIM / LCP | Hybrid Internal Model / Lipschitz-Constrained Policies | 两个对比基线 |

---

## ❓ 论文要解决什么问题？

1. **非结构地形 = 观测不可靠**：碎石、踏脚石、平衡木等地形上，本体感知/外感知都可能含噪、缺失或失真，模型本身也不精确。
2. **噪声会在闭环里被放大**：标准分析中，一步动作误差 η 经过 H 步会按 `O(L_f^H)` 指数放大，鲁棒性随时域迅速崩坏。
3. **现有抗噪手段代价高 / 不通用**：要么靠大量域随机化与工程调参堆鲁棒性，要么单独设计估计模块；缺一个**轻量、可即插进现成 RL 管线**的通用表示层。

**目标**：用一个**几乎零额外开销的辅助损失**，让策略在含噪观测下保持鲁棒，并给出可证明的退化上界。

---

## 🔧 方法详解

### 核心：把观测映到「收缩」潜空间

- 一个**收缩编码器**把高维含噪观测压成潜表示；目标是让潜动态满足**收缩性**——相邻状态之间的距离随时间步**不断缩小**，于是观测里的扰动会被**逐步吸收**而非传播放大。
- 理论支撑：当潜动态收缩因子 κ<1，性能退化（return gap）被 `O(η/(1−κ))` 框住，**与时域 H 无关**——这正是收缩映射相比普通编码器的关键好处。

### 两个目标缝在一起

1. **Lipschitz 正则（显式逼收缩）**：惩罚违反 κ-有界状态差的情形，形如 `L_Lipschitz = E[(S_{t+1} − κ² S_t)_+]`，其中 `S_t` 度量潜空间里的距离。它直接逼编码器满足收缩条件。
2. **对比学习（防过度收缩）**：用 **InfoNCE** 保留任务相关的语义结构——光收缩会把信息全压没，对比损失确保「该区分的状态仍可区分」。

### 总损失（即插即用）

```
L_CMR = L_InfoNCE + λ · L_Lipschitz + L_PPO
```

- 直接挂在 **PPO（双 Critic）** 上作为辅助项，几乎不增加技术复杂度。
- 关键超参：温度 τ=0.04、Lipschitz 权重 λ=0.05、收缩因子 κ=0.1。

### 网络与训练管线

- **收缩编码器**：隐藏维 [256, 256, 128] + ELU。
- **策略网络**：Actor/Critic 隐藏层 [512, 256, 128]。
- **流程**：Isaac Gym 用真值环境数据起训 → 对感知观测**注入噪声**（基准强度 α=1）训练 → MuJoCo **sim-to-sim** 验证零样本迁移。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["📡 含噪观测"]
        PROP["本体感知<br/>(含噪)"]
        PERC["外感知/地形<br/>(含噪/缺失)"]
    end

    subgraph ENC["🌀 收缩编码器"]
        Z["潜表示 z<br/>(扰动随时间衰减)"]
    end

    subgraph LOSS["🎯 辅助损失 (插进 PPO)"]
        LIP["Lipschitz 正则<br/>显式逼 κ<1 收缩"]
        NCE["InfoNCE 对比<br/>保任务语义,防过度收缩"]
        PPO["PPO 策略/价值损失<br/>(双 Critic)"]
    end

    subgraph OUT["🚀 部署: Unitree G1"]
        ROB["抗放大噪声<br/>走得更远"]
        S2S["MuJoCo sim-to-sim<br/>零样本迁移"]
    end

    PROP --> Z
    PERC --> Z
    Z --> LIP
    Z --> NCE
    Z --> PPO
    LIP --> ROB
    NCE --> ROB
    PPO --> ROB
    ROB --> S2S

    style IN fill:#fdecea,stroke:#c0392b,color:#641e16
    style ENC fill:#e8eef8,stroke:#2c3e80,color:#1a2452
    style LOSS fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style OUT fill:#fff3e0,stroke:#fb8c00,color:#4e342e
</div>

---

## 💡 核心贡献

1. **收缩映射做鲁棒表示**：首次把**收缩理论**引入人形抗噪运动——观测扰动在潜空间随时间衰减，而非闭环放大。
2. **可证明的退化上界**：证明潜动态收缩时，噪声导致的性能退化被 `O(η/(1−κ))` 框住，**与时域无关**，跳出 `O(L_f^H)` 指数爆炸。
3. **对比 + Lipschitz 双目标**：InfoNCE 保任务信息、Lipschitz 逼收缩，二者互补，避免「只收缩不保信息」或「只保信息不抗噪」。
4. **即插即用、近零开销**：写成辅助损失 `L_InfoNCE + λL_Lipschitz + L_PPO`，直接挂进现成深度 RL（PPO）管线。
5. **实证抗噪更强**：六类非结构地形、五档噪声（α 从 0.01 到 3）下，比 HIM / LCP / Naive PPO 走得明显更远，sim-to-sim 零样本迁移指令跟踪更准、能耗更低。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 设置 / 结论 |
|---|---|
| 平台 | Unitree G1（12-DOF 下肢 / 29-DOF 全身） |
| 仿真 | Isaac Gym 训练 → MuJoCo sim-to-sim 验证 |
| 地形 | 六类非结构地形（不平地、踏脚石、平衡木等） |
| 噪声档位 | 五档，α 从 0.01（轻微）到 3（极端），作用于本体/外感知观测 |
| 基线 | HIM（混合内部模型）、LCP（Lipschitz 约束策略）、Naive PPO |
| 指标 | 行进距离、指令跟踪误差、关节功率、动作变化率/平滑度、关节速度/加速度 |
| 核心结论 | 噪声放大时**一致走得比所有基线更远**；sim-to-sim 零样本迁移跟踪更准、能耗更低 |

> ⚠️ 详细数值（各地形/各噪声档的距离与跟踪误差、消融）以 arXiv [2602.03511](https://arxiv.org/abs/2602.03511) 论文正文为准。

---

## 🤖 工程价值

- **轻量即插**：只是一个辅助损失项，不动 PPO 主体、不加独立估计模块，迁移成本极低，适合挂到现有 locomotion 训练框架上。
- **抗噪即抗未建模扰动**：把「观测噪声」当成一类一般扰动来收缩，对传感缺失/失真、轻度建模误差都有缓冲作用。
- **理论给安全感**：收缩界 `O(η/(1−κ))` 与时域无关，意味着长时域 rollout 下鲁棒性不随步数崩坏，对长距离穿越有意义。
- **限制**：收缩因子 κ、Lipschitz 权重 λ 需调，过强收缩可能压掉有用信息（靠 InfoNCE 平衡）；论文主要在仿真 + sim-to-sim 验证，真机表现待后续；超出训练噪声包络（α≫3）的极端情形仍可能退化。

---

## 🎤 面试参考

**Q：为什么「收缩映射」能抗噪？和普通加噪训练有何本质不同？**
A：普通加噪只是让策略见过噪声分布，没改变误差在闭环里的传播规律——一步误差仍可能逐步放大。收缩映射改的是**动态的几何性质**：在潜空间里相邻状态距离随时间缩小，扰动被持续吸收，于是性能退化有一个**与时域无关**的上界 `O(η/(1−κ))`，而非 `O(L_f^H)` 指数爆炸。

**Q：为什么要再加对比学习（InfoNCE）？**
A：只压收缩会把所有状态都映到一起，连任务需要区分的信息也丢掉。InfoNCE 拉开正负样本、保留任务相关语义结构，防止「过度收缩」——是收缩与信息保留之间的平衡器。

**Q：和 LCP（Lipschitz-Constrained Policies）的区别？**
A：LCP 约束的是**策略**对输入的 Lipschitz 常数；CMR 约束的是**表示/潜动态**的收缩性，并配合对比学习保信息，目标是让扰动在潜空间随时间衰减，二者出发点不同，CMR 在抗放大噪声上更强。

---

## 🔗 相关阅读

- [Contrastive Representation Learning for Robust Sim-to-Real Transfer of Adaptive Humanoid Locomotion (2509.12858)](https://arxiv.org/abs/2509.12858) — 同样用对比表示提升 locomotion 鲁棒/迁移
- [HoRD (2602.04412)](https://arxiv.org/abs/2602.04412) — 用历史条件在线推断动力学上下文做鲁棒自适应，另一条抗扰动路线
- [HIM: Hybrid Internal Model](https://arxiv.org/abs/2312.11460) — 本文基线之一，从响应估计内部状态
- [XHugWBC (2602.05791)](https://arxiv.org/abs/2602.05791) — 跨本体通用 WBC，鲁棒/通用思路相关

---

> 备注：本笔记基于 arXiv 摘要、[arXiv HTML 正文](https://arxiv.org/html/2602.03511)与公开搜索结果整理；公式记号（κ、λ、τ 与各损失项）与详细数值以 arXiv [2602.03511](https://arxiv.org/abs/2602.03511) 论文正文为准。
