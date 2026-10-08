---
layout: paper
title: "HumanoidVLN: A Physics-Grounded Simulator and Benchmark for Vision-Language Navigation Across Diverse Humanoid Embodiments"
zhname: "HumanoidVLN：面向多样人形本体的物理接地视觉-语言导航仿真器与基准"
category: "Navigation"
arxiv: "2608.12860"
---

# HumanoidVLN: A Physics-Grounded Simulator and Benchmark for Vision-Language Navigation Across Diverse Humanoid Embodiments
**HumanoidVLN：面向多样人形本体的物理接地视觉-语言导航仿真器与基准**

> 📅 阅读日期: 2026-08-26
>
> 🏷️ 板块: 08 Navigation · 视觉-语言导航（VLN）· 物理接地基准 · 多本体人形 · Isaac Sim
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2608.12860](https://arxiv.org/abs/2608.12860) |
| HTML | [在线阅读](https://arxiv.org/html/2608.12860v1) |
| PDF | [下载](https://arxiv.org/pdf/2608.12860) |
| **发布时间** | 2026-08-13 (arXiv v1) |
| 项目主页 | [humanoid-vln.github.io](https://humanoid-vln.github.io/) |
| 源码 | 论文标注「代码 / 基准 / 数据将于接收后释出」，截至当前未见公开仓库（故无源码运行时序图） |

**作者**：Quan-Dung Pham, Anh Dao, The-Anh Nguyen, Minh Nguyen-Dinh, Phuong Nam Dang, Tri Pham, Hung Tran, Bach Dao, Tuyen P. Le, Truong Nguyen, Quan Nguyen

**平台**：基于 **NVIDIA Isaac Sim** 的物理仿真；在 **Unitree G1 / H1 + 两款内部人形** 上评测，并做 Unitree G1 真机 sim-to-real 试点

---

## 🎯 一句话总结

以往的 VLN 基准大多把智能体当成「悬浮的相机 / 轮式底盘」——给个位置就能瞬移，忽略了双足人形真实行走时的物理约束。HumanoidVLN 的核心主张是：**人形 VLN 必须在物理执行下评测**。它把三件被现有基准回避的难点摆到台面上——① 双足运动带来的物理约束（轮式智能体没有）；② 人形形态在不同平台间差异很大；③ 第一视角观测会被行走引起的**相机抖动**扭曲。为此，作者在 Isaac Sim 上搭了一套**可扩展的人形 VLN 仿真器 + 基准**：底层是「RL 运动策略 + 可换的 PD / MPC 路径跟踪器」分层控制栈，上层是**可插拔的 VLN 模型**（NaVILA、DualVLN、StreamVLN、JanusVLN 都能接入），场景来自艺术家设计与 3D 高斯泼溅（3DGS）重建，指令由「生成器–审阅器 + 改写器」多智能体流水线加人工校验产出。最终得到 **933 条防碰撞参考轨迹**，每条配 1 条细粒度指令 + 3 条不同风格的粗粒度指令。评测显示 **JanusVLN 平均成功率最高 43.55%、nDTW 48.38**，且 20 集真机试点里仿真与真机导航误差**强相关（r=0.935）**，说明这套物理接地基准确实能预测真实表现。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLN | Vision-Language Navigation | 视觉-语言导航：按自然语言指令在环境中走到目标 |
| DoF | Degrees of Freedom | 自由度，这里指人形下肢关节数（10–12） |
| 3DGS | 3D Gaussian Splatting | 3D 高斯泼溅，用于把真实场景重建成可导航仿真环境 |
| MPC | Model Predictive Control | 模型预测控制，作为可换的路径跟踪器之一 |
| PD | Proportional-Derivative | 比例-微分控制，另一种可换路径跟踪器 |
| SR | Success Rate | 成功率：是否到达目标 |
| nDTW | normalized Dynamic Time Warping | 归一化动态时间规整，衡量轨迹与参考路径的贴合度 |
| MAD | Mean Absolute Difference | 平均绝对误差（真机 vs 仿真导航误差） |

---

## ❓ 论文要解决什么问题？

人形机器人做 VLN，比轮式 / 无实体智能体难在三处，而这三处恰恰是现有基准的盲区：

1. **双足物理约束**：轮式智能体可以近似「给坐标就到位」，人形却要靠真实双足运动闭环执行，转向、加减速、平衡都受物理限制——语言指令再对，脚下走不出来也白搭。
2. **本体差异大**：不同人形平台身高（1.17m–1.80m）、下肢自由度（10–12）、步态都不同，一个策略换台机器人可能就失效，基准必须覆盖**多本体**。
3. **相机抖动扭曲观测**：人形行走时头部 / 相机随步伐上下左右晃动，第一视角图像被运动扭曲，直接影响视觉语言模型的判断。

因此需要一套**把 VLN 模型真正放进物理运动闭环**、且能跨多种人形本体统一评测的仿真器与基准。

---

## 🔧 方法拆解

**① 物理接地仿真器（NVIDIA Isaac Sim）**
- 支持可扩展的人形配置，已在 4 台机器人上演示：**Unitree G1、Unitree H1、Internal-A、Internal-B**，覆盖 10–12 下肢自由度、身高 1.17–1.80m。
- **分层控制栈**：底层 RL 运动策略负责稳定双足行走，上层接**可互换的 PD 或 MPC 路径跟踪器**执行 VLN 模型给出的导航路径。
- 新机器人 / 新 VLN 模型都能以最小改动接入。

**② 可插拔的 VLN 模型**
- 已验证兼容 **NaVILA、DualVLN、StreamVLN、JanusVLN** 四款模型，形成「模型 × 本体」交叉评测矩阵。

**③ 环境与指令构建**
- 场景来自**艺术家设计场景**与 **3DGS 重建**，筛选可导航面积 **>100 m²** 的环境。
- 指令由**「生成器–审阅器」双智能体 + 改写器**多智能体流水线产出，并加**人在环校验**；最终得 **933 条防碰撞参考轨迹**，每条 1 条细粒度指令 + 3 条粗粒度风格变体（正式 / 自然 / 随意）。

**④ 评测与真机对齐**
- 指标：成功率 SR、nDTW；在「4 模型 × 4 本体」上系统评测。
- **Sim-to-real 试点**：用 DualVLN + Unitree G1 跑 20 集，验证仿真结论能否迁移真机。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph BUILD["🏗️ 基准构建"]
        SCENE["🏙️ 场景来源<br/>艺术家设计 + 3DGS 重建<br/>可导航面积 &gt;100 m²"]
        INSTR["📝 指令生成流水线<br/>生成器–审阅器 + 改写器<br/>+ 人在环校验"]
        EP["📦 933 条防碰撞参考轨迹<br/>1 细粒度 + 3 粗粒度风格<br/>(正式/自然/随意)"]
    end

    subgraph SIM["🧪 物理仿真 (NVIDIA Isaac Sim)"]
        CTRL["🎮 分层控制栈<br/>RL 运动策略 + PD/MPC 路径跟踪"]
        EMB["🤖 多人形本体<br/>G1 / H1 / Internal-A/B<br/>10–12 下肢 DoF · 1.17–1.80m"]
        CAM["📷 第一视角观测<br/>含行走诱导相机抖动"]
    end

    subgraph VLN["🧠 可插拔 VLN 模型"]
        M["NaVILA / DualVLN<br/>StreamVLN / JanusVLN"]
    end

    subgraph EVAL["📊 评测"]
        METRIC["成功率 SR / nDTW<br/>JanusVLN 最优 43.55% / 48.38"]
        S2R["🔁 Sim-to-Real 试点<br/>Unitree G1 · r=0.935"]
    end

    SCENE --> EP
    INSTR --> EP
    EP --> CAM
    CTRL --> EMB --> CAM
    CAM --> M
    M -->|导航路径| CTRL
    SIM --> METRIC --> S2R

    style BUILD fill:#fff7e0,stroke:#d4a017
    style SIM fill:#eef6ff,stroke:#2e86de
    style VLN fill:#f3e8ff,stroke:#8e44ad
    style EVAL fill:#eafaf1,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **首个物理接地的人形 VLN 基准**：把 VLN 智能体放进真实双足运动闭环评测，直面轮式基准回避的物理约束、本体差异与相机抖动三大难点。
2. **多本体 + 可插拔架构**：底层 RL 运动策略 + 可换 PD/MPC 跟踪器，上层可插拔 VLN 模型；4 本体 × 4 模型交叉评测，新机器人 / 新模型都能低成本接入。
3. **高质量指令数据**：多智能体「生成–审阅–改写」+ 人在环，产出 933 条防碰撞参考轨迹，每条含细 / 粗粒度多风格指令。
4. **真机可迁移性验证**：sim-to-real 试点里仿真与真机导航误差强相关（r=0.935，MAD 0.68m），证明该基准的结论对真实部署有预测力。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 最优模型 | **JanusVLN**：平均成功率 **43.55%**、nDTW **48.38**（4 本体平均） |
| 评测规模 | 4 VLN 模型 × 4 人形本体；933 条防碰撞参考轨迹 |
| 本体范围 | 下肢 10–12 DoF、身高 1.17–1.80m（G1 / H1 / Internal-A / Internal-B） |
| Sim-to-Real | 20 集试点：误差相关 **r=0.935**、MAD **0.68m**、轨迹相似度 **0.782±0.188** nDTW |
| 核心洞见 | 表现由「VLN 模型 × 控制器 × 人形本体」三者在物理执行下的交互共同决定，单看模型不够 |

> ⚠️ 上表数值取自论文 v1，具体以正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **VLN 评测去「悬浮化」** | 强制在双足物理闭环下评测，暴露「指令看懂了但走不出来」的真实差距 |
| **本体泛化成一等公民** | 多身高 / 多自由度人形统一基准，推动 VLN 模型跨平台泛化研究 |
| **控制器与感知联合优化** | 明确指出成功率取决于「模型 + 控制器 + 本体」的交互，为联合设计提供试验台 |
| **真机预测力** | 强 sim-to-real 相关性让研究者可先在仿真里低成本迭代，再迁真机 |

---

## 🎤 面试参考

**Q：为什么人形 VLN 不能沿用轮式 / 无实体的 VLN 基准？**
A：轮式基准常把导航简化成「给坐标即到位」，忽略双足运动的物理约束、平衡与加减速；同时人形头部相机随步伐晃动，第一视角观测被运动扭曲。这些都会让「语言指令正确」与「真实走到」之间出现巨大落差，必须在物理执行下评测才有意义。

**Q：HumanoidVLN 怎么做到「换个机器人 / 换个 VLN 模型」都能评？**
A：靠分层解耦——底层用 RL 运动策略保证双足稳定行走，中间是可互换的 PD / MPC 路径跟踪器，上层是可插拔的 VLN 模型接口。VLN 模型只输出导航意图，落地由控制栈负责，于是「模型」「控制器」「本体」三层可各自替换，形成交叉评测矩阵。

**Q：933 条指令是怎么保证质量的？为什么要细 / 粗粒度多风格？**
A：用「生成器–审阅器」双智能体自动产指令、改写器做风格改写，再加人在环校验，且轨迹是防碰撞的参考轨迹。每条配 1 细粒度 + 3 粗粒度（正式 / 自然 / 随意）变体，是为了测模型对**不同抽象层级与口吻**指令的鲁棒性，更贴近真实用户表达。

---

## 🔗 相关阅读

- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：腿式机器人视觉-语言-动作导航模型（本文接入的基线之一）
- [DA-Nav (2607.11638)](https://arxiv.org/abs/2607.11638)：方向感知的城市级视觉-语言导航
- [FocusNav (2601.12790)](https://arxiv.org/abs/2601.12790)：面向人形局部导航的空间选择性注意 + 路点引导
- [Gallant (2511.14625)](https://arxiv.org/abs/2511.14625)：体素网格的人形运动与局部导航，跨 3D 受限地形
- [LookOut (2508.14466)](https://arxiv.org/abs/2508.14466)：真实世界人形第一视角导航
