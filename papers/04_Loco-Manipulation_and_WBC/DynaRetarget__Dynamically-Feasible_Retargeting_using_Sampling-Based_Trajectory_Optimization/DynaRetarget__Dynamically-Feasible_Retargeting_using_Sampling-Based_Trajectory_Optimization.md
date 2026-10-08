---
layout: paper
title: "DynaRetarget: Dynamically-Feasible Retargeting using Sampling-Based Trajectory Optimization"
zhname: "DynaRetarget：基于采样轨迹优化的动力学可行运动重定向"
category: "Loco-Manipulation and WBC"
arxiv: "2602.06827"
---

# DynaRetarget: Dynamically-Feasible Retargeting using Sampling-Based Trajectory Optimization
**DynaRetarget：基于采样轨迹优化的动力学可行运动重定向**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 运动重定向 · 采样轨迹优化 · 动力学可行 · 长时程 · 合成数据
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 2 月 |
| arXiv | [2602.06827](https://arxiv.org/abs/2602.06827) · [PDF](https://arxiv.org/pdf/2602.06827) · [HTML](https://arxiv.org/html/2602.06827v1) |
| 作者 | Victor Dhedin、Ilyass Taouil、Shafeef Omar、Dian Yu、Kun Tao、Angela Dai、Majid Khadiv |
| 机构 | Technical University of Munich（TUM，作者群） |
| 主题 | cs.RO · 运动重定向 / 轨迹优化 / 人-物交互数据 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> DynaRetarget 是一条把**人类动作**重定向到**人形控制策略**的**完整流水线**。其核心是一个新颖的**基于采样的轨迹优化（Sampling-Based Trajectory Optimization, SBTO）**框架：把**不完美的运动学轨迹**精修成**动力学可行（dynamically feasible）**的运动。SBTO 通过**逐步推进优化时域（incrementally advances the optimization horizon）**，从而能**对整条轨迹**做优化，适配**长时程任务**。作者通过**成功重定向数百条人-物（humanoid-object）演示**来验证，并取得**高于现有 SOTA 的成功率**；同一套**跟踪目标**还能**泛化到不同物体属性**（质量、尺寸、几何）。这种「稳健重定向多样演示」的能力，为**生成大规模合成的人形 loco-manip 轨迹数据集**打开了大门，直击真实世界数据采集的瓶颈。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Retargeting | 运动重定向，把人体动作迁移到人形机器人 |
| SBTO | Sampling-Based Trajectory Optimization，基于采样的轨迹优化 |
| Dynamically Feasible | 动力学可行，满足机器人动力学约束、真能被执行 |
| Optimization Horizon | 优化时域，一次优化覆盖的时间窗口 |
| Humanoid-Object Demo | 人-物演示，含物体交互的人形示范轨迹 |
| Synthetic Dataset | 合成数据集，由方法自动生成的大规模训练数据 |

---

## ❓ 论文要解决什么问题？

把人类（含**物体交互**）的动作重定向给人形机器人时，原始的**运动学轨迹是不完美的**：未必满足机器人**动力学约束**，直接拿来训练/执行会不可行。更难的是：

- **长时程任务**需要对**整条轨迹**保持可行，而不是局部逐帧修；
- 要能**泛化到不同物体**（质量/尺寸/几何各异），否则每换一个物体就要重调；
- 真实世界**数据采集是瓶颈**，亟需可规模化的合成途径。

DynaRetarget 想要：一条**完整、稳健、可规模化**的重定向流水线，把多样的人-物演示**批量**转成**动力学可行**的人形轨迹。

---

## 🔧 方法详解

### 1. 完整流水线 + SBTO 核心
DynaRetarget 是端到端的重定向**流水线**，核心组件是**基于采样的轨迹优化（SBTO）**：把**不完美的运动学轨迹**精修为**动力学可行**的运动。采样式优化对**非光滑/接触丰富**的人-物交互更稳健（无需处处可微）。

### 2. 逐步推进优化时域（支持长时程）
SBTO **增量式地推进优化时域**：不是一次性优化超长轨迹（难且不稳），而是**逐段扩展窗口**，最终实现**对整条轨迹**的优化——这让长时程任务可解。

### 3. 同一跟踪目标，泛化到不同物体
**用同一套 tracking objective**即可在**不同物体属性（质量、尺寸、几何）**上工作，无需为每个物体重设目标，体现良好泛化。

### 4. 评测与意义
- **规模**：成功重定向**数百条**人-物演示；
- **效果**：成功率**高于 SOTA**；
- **泛化**：跨物体属性稳健；
- **价值**：能**批量生成大规模合成 loco-manip 轨迹数据集**，缓解真实数据采集瓶颈。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    H["🧍 人-物演示<br/>(不完美运动学轨迹)"] --> SBTO
    subgraph SBTO["🎲 基于采样的轨迹优化"]
        W["逐步推进优化时域<br/>→ 整条轨迹可行"]
        F["动力学可行性约束"]
        W --> F
    end
    SBTO --> OUT["🤖 动力学可行人形轨迹<br/>成功率 > SOTA<br/>跨物体(质量/尺寸/几何)泛化"]
    OUT --> DATA["📦 大规模合成<br/>loco-manip 数据集"]

    style SBTO fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
    style DATA fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
</div>

---

## 💡 核心贡献

1. **完整重定向流水线**：把人-物演示稳健转成人形可执行轨迹；
2. **SBTO 框架**：用基于采样的轨迹优化把不完美运动学轨迹精修为动力学可行运动，适合接触丰富场景；
3. **增量时域优化**：逐步推进优化窗口以覆盖整条长时程轨迹；
4. **跨物体泛化 + 规模化**：同一跟踪目标泛化到不同物体属性，成功率超 SOTA，支撑大规模合成数据集生成。

---

## 🤖 对人形机器人学习的启发

- **重定向是 loco-manip 数据飞轮的上游闸门**：把「人-物演示 → 可行轨迹」做稳、做规模化，下游策略学习才有大数据可吃；这与 SUGAR 的「人类视频 → 技能」是同一信念的不同实现；
- **采样式优化擅长接触/非光滑**：相较可微优化，SBTO 在接触丰富的人-物交互里更稳健，值得在重定向/精修环节优先考虑；
- **增量时域是长时程的实用技巧**：逐段扩窗优化，兼顾可解性与全局可行性；
- **「同一目标跨物体」降低工程量**：免去逐物体调参，对构建大规模多样数据集至关重要。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2602.06827](https://arxiv.org/abs/2602.06827) | 论文正文（SBTO、增量时域、跨物体泛化、数据集生成） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值结果以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·重定向 / 合成数据**：[ReActor（物理感知 RL 重定向）](../../02_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting/ReActor__Reinforcement_Learning_for_Physics-Aware_Motion_Retargeting.html) · [SUGAR（人类视频 → 技能的可扩展流水线）](../SUGAR__A_Scalable_Human-Video-Driven_Generalizable_Humanoid_Loco-Manipulation_Learning_Framework/SUGAR__A_Scalable_Human-Video-Driven_Generalizable_Humanoid_Loco-Manipulation_Learning_Framework.html)；
- **物体交互 / 动力学可行**：[HAIC（动力学感知世界模型）](../HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model/HAIC__Humanoid_Agile_Object_Interaction_Control_via_Dynamics-Aware_World_Model.html)；
- **运动重定向（本仓 02 模块）**：GMR / OmniH2O 等人到人形重定向工作。
