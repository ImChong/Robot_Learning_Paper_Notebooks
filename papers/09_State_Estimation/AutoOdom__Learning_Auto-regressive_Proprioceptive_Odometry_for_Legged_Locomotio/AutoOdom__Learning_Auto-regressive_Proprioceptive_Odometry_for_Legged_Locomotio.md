---
layout: paper
paper_order: 2
title: "AutoOdom: Learning Auto-regressive Proprioceptive Odometry for Legged Locomotion"
zhname: "AutoOdom：用自回归式纯本体感知里程计撑住足式机器人的长程定位"
category: "State Estimation"
---

# AutoOdom: Learning Auto-regressive Proprioceptive Odometry for Legged Locomotion
**AutoOdom：用自回归式纯本体感知里程计撑住足式机器人的长程定位**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: State Estimation · 本体感知里程计 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2511.18857](https://arxiv.org/abs/2511.18857) |
| HTML | [在线阅读](https://arxiv.org/html/2511.18857v1) |
| PDF | [下载](https://arxiv.org/pdf/2511.18857) |
| **发布时间** | 2025-11-24 (arXiv) |
| 源码 / 权重 | 截至当前未见公开发布（论文未给出 GitHub 链接） |
| 提交日期 | 2025-11 |

**作者**：Changsheng Luo 等（共 4 位作者，含清华大学相关研究组）

**机构**：清华大学 / Booster Robotics 研究方向（依据作者背景与实验平台推断）

**机器人**：**Booster T1** 人形机器人

---

## 🎯 一句话总结

AutoOdom 把"足式机器人**本体感知里程计**（只用 IMU + 关节传感器）"这件事**纯学习化**：第一阶段在大规模仿真里学到非线性动力学和频繁变化的接触状态，第二阶段在**少量真机数据**上做**自回归微调**——让模型学着"喂自己的预测当输入"，由此自然抑制传感器噪声和累计漂移，在 Booster T1 上把 ATE / RPE 相比 Legolas 砍掉了 36%–59%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Odometry | - | 里程计，从传感器估计机器人位姿轨迹 |
| Proprioceptive | - | 本体感知（IMU + 关节编码器 / 力矩），不含视觉 / LiDAR |
| ATE | Absolute Trajectory Error | 绝对轨迹误差 |
| RPE | Relative Pose Error | 相对位姿误差（短时段位姿差） |
| Umeyama-aligned Error | - | 用 Umeyama 算法对齐尺度/旋转后的误差 |
| AR | Auto-regressive | 自回归（用自己之前的输出作为下一步输入） |
| Sim-to-Real | - | 仿真到真实的迁移 |
| EKF / InEKF | (Invariant) Extended Kalman Filter | 经典解析式滤波家族 |

---

## ❓ 论文要解决什么问题？

足式机器人在 **GPS 失效、视觉退化**（黑夜、烟雾、纹理稀少）等场景下，需要**只靠本体传感器**就能撑住的里程计。但现有三类路线都各有死结：

1. **解析滤波路线（InEKF / 互补滤波）**：建模假设强、依赖足底接触理想化，长程必然漂移；
2. **学习 + 滤波的混合路线**：滤波部分仍是瓶颈，模型只在残差上"打补丁"；
3. **纯学习路线（如 Legolas）**：需要大量**真机**轨迹做监督，sim-to-real 困难，且容易在分布外失稳。

AutoOdom 给出的答案是「**两段式 + 自回归**」：把"学动力学"和"学抗噪 / 抗漂移"拆开，分别用最适合的数据源训练。

---

## 🔧 方法拆解

### 1. 两阶段训练范式

**Stage 1：仿真大规模预训练**
- 在仿真里跑大量步态 / 地形 / 速度组合，采集 IMU + 关节传感器流；
- 用**有监督回归**让网络学到：从一窗口的本体感知输入 → 机器人 base 在 world 系下的相对位姿；
- 这一步关键收益：**接触切换、非线性动力学**这些在解析模型里被简化掉的细节，被网络直接吃进权重里。

**Stage 2：真机数据上的自回归增强**
- 真机数据**稀缺**（高精度位姿标注昂贵），所以只用很少量；
- 训练时**喂模型自己上一步的预测**而不是 ground-truth 历史，让网络在 train 阶段就经历"自己造的误差"，学会**自我纠偏**；
- 这一步关键收益：**抑制传感器噪声 + 控制累计漂移**，把 sim-to-real 的 gap 填掉。

### 2. 为什么是「自回归」而非「Teacher Forcing」

- 传统监督学习（Teacher Forcing）训练时永远拿到干净历史，**测试时却必须用自己的预测**——这就是 Exposure Bias，预测一旦偏一点就会越滚越远；
- AutoOdom 用 AR 把这层 mismatch 在训练里就显式建模，**测试时分布和训练时分布一致**，自然鲁棒。

### 3. 输入 / 输出形态（基于论文描述推测）

| 项 | 说明 |
|---|---|
| 输入 | 一段 IMU（角速度、线加速度）+ 关节角 / 角速度 / 力矩窗口 + 历史预测位姿 |
| 输出 | 机器人 base 相对当前帧的位姿增量（位置 + 朝向），可积分为全局轨迹 |
| 训练目标 | 位姿增量回归 + 长程一致性约束（自回归滚动展开） |

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["🦿 输入（本体感知）"]
        IMU["📡 IMU<br/>(角速度 / 加速度)"]
        JOINT["⚙️ 关节状态<br/>(角度 / 速度 / 力矩)"]
        HIST["⏮️ 历史预测位姿<br/>(自回归喂入)"]
    end

    subgraph STAGE1["🟦 Stage 1: 仿真大规模预训练"]
        SIMDATA["🕹️ 大规模仿真轨迹<br/>(多步态 / 多地形 / 多速度)"]
        NET1["🧠 里程计网络<br/>(序列回归)"]
        SUP["🎯 监督回归损失<br/>(GT 位姿增量)"]
        SIMDATA --> NET1
        NET1 --> SUP
    end

    subgraph STAGE2["🟧 Stage 2: 真机自回归增强"]
        REALDATA["🎬 少量真机轨迹"]
        AR["🔁 自回归滚动展开<br/>(用模型自己的预测当输入)"]
        FT["🧪 微调网络<br/>(消除 Exposure Bias)"]
        REALDATA --> AR
        AR --> FT
        NET1 -.初始化.-> FT
    end

    subgraph DEPLOY["🤖 部署 (Booster T1)"]
        INFER["📈 实时推理"]
        TRAJ["🧭 轨迹积分<br/>(位姿增量逐步累加)"]
    end

    subgraph EVAL["📊 指标"]
        ATE["ATE ↓ 57.2%"]
        UME["Umeyama-aligned ↓ 59.2%"]
        RPE["RPE ↓ 36.2%"]
    end

    IMU --> INFER
    JOINT --> INFER
    HIST --> INFER
    FT --> INFER
    INFER --> TRAJ
    TRAJ --> ATE
    TRAJ --> UME
    TRAJ --> RPE

    style IN fill:#fff7e0,stroke:#d4a017
    style STAGE1 fill:#e8f4fd,stroke:#1f78b4
    style STAGE2 fill:#fde8e8,stroke:#c0392b
    style DEPLOY fill:#f3e8ff,stroke:#8e44ad
    style EVAL fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **首个为足式机器人设计的「两阶段 + 自回归」纯学习里程计**：既不依赖解析滤波，也不需要海量真机数据。
2. **显式建模 Exposure Bias**：Stage 2 训练时就让模型吃自己的预测，使噪声 / 漂移在训练分布内被压制。
3. **数据效率高**：真机数据需求被压到「少量」级别，对实机调试与新平台移植非常友好。
4. **真机验证扎实**：Booster T1 上对照 Legolas，三项主流轨迹误差指标全部大幅领先。

---

## 📊 关键发现

| 指标（vs Legolas） | 提升 |
|---|---|
| ATE（Absolute Trajectory Error） | **↓ 57.2%** |
| Umeyama-aligned Error | **↓ 59.2%** |
| RPE（Relative Pose Error） | **↓ 36.2%** |

> 📌 评测平台：**Booster T1** 人形机器人；对比基线：**Legolas: Deep Leg-Inertial Odometry**（CoRL 2025 Wasserman 等）。

---

## 🤖 对人形 / 状态估计领域的意义

| 方向 | 含义 |
|---|---|
| **替代 InEKF 作为底座** | 纯学习里程计在指标上已经能压过经典 InEKF / 解析方法，可以与之并联或替代 |
| **数据范式更便宜** | 仿真大数据 + 真机少量 AR 微调 = **不再依赖大规模高精度真机轨迹采集** |
| **配合视觉退化场景** | 在夜间 / 烟雾 / 地下 / 隧道等视觉失效环境下，本体感知里程计是导航的最后一道防线 |
| **可与高层 SLAM 解耦集成** | 输出位姿增量的标准接口，可直接喂给 GTSAM / 因子图后端做全局优化 |

---

## 🎤 面试参考

**Q：AutoOdom 跟 InEKF 这种经典方法相比，最本质的区别在哪？**
A：InEKF 把里程计建模成一个**带几何结构（李群）的状态估计问题**，需要假设接触理想化和动力学解析化。AutoOdom 直接把这些建模假设**绕过**——让网络从仿真数据里**学**到非线性动力学和接触切换，再用真机数据 + 自回归微调把 sim-to-real 的差距打平。一句话：从「模型驱动 + 数据校正」变成了「**数据驱动 + 自回归抗漂移**」。

**Q：Stage 2 为什么不直接做监督微调，而要用自回归？**
A：监督微调（Teacher Forcing）训练时永远看到真实历史，但测试时模型只能拿到自己之前的预测，存在 **Exposure Bias**。预测稍微偏一点，误差就会被自身一路放大。AR 训练时就让模型吃自己的预测，让训练分布 = 测试分布，所以**抗噪 + 抗漂移**的能力是被"打进去"的，而不是寄希望于推理阶段不出错。

**Q：为什么仿真预训练这么重要？**
A：因为足式机器人的步态切换、足底打滑、接触瞬变这些**非线性强、采集贵**的现象，仿真里可以**几乎免费**生成无数样本；Stage 1 把这部分先吃进网络权重，Stage 2 只需要少量真机数据去填 sim-to-real gap，整体性价比远高于"全靠真机"。

**Q：为什么对人形机器人（而不只是四足）特别重要？**
A：人形机器人**接触面积小、姿态高、惯性力矩大**，IMU 和关节噪声放大效应比四足更明显，对里程计鲁棒性的要求更高。AutoOdom 在 Booster T1 上把 ATE / RPE 一起砍掉一大块，意味着这套范式对人形场景是直接可用的。

---

## 🔗 相关阅读

- [Legolas: Deep Leg-Inertial Odometry](https://learned-odom.github.io/)：纯学习四足里程计的前作，AutoOdom 的主要对比基线
- [Contact-Aided Invariant EKF (1904.09251)](https://arxiv.org/abs/1904.09251)：解析路线代表，本仓库已有笔记
- [InEKFormer (2511.16306)](https://arxiv.org/abs/2511.16306)：混合 InEKF + Transformer 的并行思路
- [Learning Inertial Odometry for Dynamic Legged Robot State Estimation (2111.00789)](https://arxiv.org/abs/2111.00789)：早期学习式 inertial odometry
- [Interacting Multiple Model Proprioceptive Odometry (2603.29383)](https://arxiv.org/abs/2603.29383)：多模型本体感知里程计的并行工作

---

> 备注：本笔记基于 arXiv 摘要 + 公开搜索结果整理，方法细节（如网络架构层数、loss 系数、训练窗口长度等）待官方代码 / 完整 PDF 释出后补充。
