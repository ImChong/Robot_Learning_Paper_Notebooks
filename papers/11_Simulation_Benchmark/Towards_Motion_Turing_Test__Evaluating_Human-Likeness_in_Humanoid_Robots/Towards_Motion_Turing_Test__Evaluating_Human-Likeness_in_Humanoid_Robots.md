---
layout: paper
paper_order: 3
title: "Towards Motion Turing Test: Evaluating Human-Likeness in Humanoid Robots"
zhname: "迈向动作图灵测试：评估人形机器人的「类人度」"
category: "Simulation Benchmark"
---

# Towards Motion Turing Test: Evaluating Human-Likeness in Humanoid Robots
**迈向动作图灵测试：评估人形机器人的「类人度」**

> 📅 阅读日期: 2026-05-19
>
> 🏷️ 板块: 11 Simulation Benchmark · 人形评测 / 类人度 / 数据集与基准
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2603.06181](https://arxiv.org/abs/2603.06181) |
| HTML | [在线阅读](https://arxiv.org/html/2603.06181v1) |
| PDF | [下载](https://arxiv.org/pdf/2603.06181) |
| **发布时间** | 2026-03-06 (arXiv) |
| 源码 / 数据集 | 论文声明「dataset, code, and benchmark will be publicly released」，截至 2026-05 尚未在 GitHub 公开 |
| 提交日期 | 2026-03 |

**作者**：Mingzhe Li 等

**机构**：**厦门大学**（School of Informatics）· Fujian Key Laboratory of Urban Intelligent Sensing and Computing · Key Laboratory of Multimedia Trusted Perception and Efficient Computing (Ministry of Education)

---

## 🎯 一句话总结

把「图灵测试」从对话搬到运动上：让 30 名标注员对 **11 台人形机器人 + 10 个真人**、**15 个动作类别**、共 **1,000 段** 统一转成 **SMPL-X 表示**的运动序列做 0–5 分类人度评分（累计 500+ 小时），第一次量化指出——**人形动作离真人差距最大的地方在于跳跃 / 拳击 / 跑步这些动态行为**，并把数据、协议、benchmark 三件套作为后续研究的统一底座释出。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| MTT | Motion Turing Test | 本文提出的"动作图灵测试"评测框架 |
| HHMotion | Human-Humanoid Motion Dataset | 配套数据集，含真人与机器人成对动作 |
| SMPL-X | Skinned Multi-Person Linear eXpressive | 参数化人体模型，可同时表达身体/手/脸 |
| MoS | Mean of Score | 多标注员平均分（0–5）作为类人度指标 |

---

## ❓ 论文要解决什么问题？

当前评估人形机器人「类人度」存在三大短板：

1. **指标割裂**：要么用关节误差、要么用步态周期、要么用速度光滑度，**没有一个面向"主观人感"的统一标尺**；
2. **可比性差**：不同机器人尺寸、外观、视觉风格各异，**人眼一眼就能"作弊"判断**——很难让评测聚焦在运动本身；
3. **缺数据集**：业界没有"同一动作类别由真人和多台机器人各自演一遍"的成对数据，无法形成**公平横向对比**。

作者把图灵测试搬到运动维度——**让人单看动作判断「这是人 vs 机器人」**，并通过 SMPL-X 抹去外观差异，从而把问题压缩到「**纯运动学**」层面。

---

## 🔧 方法 / 数据集 / 评测

### 1. HHMotion 数据集

- **规模**：1,000 段运动序列；
- **来源覆盖**：**11 台人形机器人**（包括代表性国产 / 国际型号）+ **10 名真人受试**；
- **动作分类**：**15 类**，含**站立、行走、跑步、跳跃、拳击、舞蹈、负重、上下楼**等静态与动态行为；
- **统一表示**：所有序列都转成 **SMPL-X**——既消除外观差异，又让真人与机器人共享同一关节定义。

### 2. 评测协议（Motion Turing Test）

- **标注员**：30 位志愿者，无需机器人背景；
- **任务**：观看单段 SMPL-X 动画，**给"这段动作有多像真人"打 0–5 分**；
- **总工作量**：> **500 小时**累计标注；
- **指标**：以 **MoS（Mean of Score）** 为主，配合**真假二选一可分辨率**（图灵测试式判别准确度）做附加分析。

### 3. 主要发现

- 静态 / 慢动作（站立、行走、坐下）机器人已接近人类；
- **动态高速动作（跳跃、拳击、跑步）类人度显著掉档**——这正是当前 sim-to-real & Locomotion 工作仍未啃下的硬骨头；
- 类人度与传统物理指标（速度光滑度、关节角误差）**只弱相关**，提示**主观类人感是一个独立维度**，不能用现有 reward 完全代偿。

---

## 🧭 评测流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SRC["🎬 源动作采集"]
        H["👤 10 名真人受试<br/>(动捕)"]
        R["🤖 11 台人形机器人<br/>(各自策略 / 控制器执行)"]
    end

    subgraph CONV["🔄 统一表示"]
        SMPL["📐 SMPL-X 参数化<br/>(消除外观差异)"]
    end

    subgraph TASK["🏷 15 个动作类别 × 1,000 段"]
        T1["🚶 行走 / 跑步"]
        T2["🤸 跳跃 / 舞蹈"]
        T3["🥊 拳击 / 负重"]
        T4["…静态 + 动态共 15 类"]
    end

    subgraph ANNO["🧑‍⚖️ Motion Turing Test 标注"]
        A1["👀 30 位标注员"]
        A2["⭐ 0–5 分类人度评分"]
        A3["⏱ 累计 500+ 小时"]
    end

    subgraph OUT["📊 输出"]
        MOS["📈 MoS<br/>(机器人 vs 人均值)"]
        DIS["❓ 真/假可分辨率<br/>(图灵测试式)"]
        INS["💡 短板诊断<br/>(动态动作类人度断崖)"]
    end

    H --> SMPL
    R --> SMPL
    SMPL --> TASK
    TASK --> ANNO
    ANNO --> MOS & DIS & INS

    BENCH["🧪 HHMotion + MTT 协议<br/>开放给社区做统一对比"]
    OUT --> BENCH

    style SRC fill:#e8f4fd,stroke:#1f78b4
    style CONV fill:#fff7e0,stroke:#d4a017
    style ANNO fill:#fde8e8,stroke:#c0392b
    style OUT fill:#e8fbe8,stroke:#27ae60
    style BENCH fill:#f3e8ff,stroke:#8e44ad
</div>

---

## 💡 核心贡献

1. **首次系统化"运动图灵测试"框架**：把图灵测试从语言迁移到动作维度，给「类人度」一个**主观-客观结合**的可比指标。
2. **HHMotion 数据集**：**1,000 段 × 15 类 × 11 机器人 + 10 真人** 的成对统一表示数据，是后续策略 / 重定向 / 模仿学习工作的天然评测集。
3. **SMPL-X 公平场**：把所有动作折叠到同一参数化人体模型上，**消除颜色 / 材质 / 体型干扰**，让评测真正面向"运动本身"。
4. **量化短板**：实证指出**动态行为（跳跃 / 拳击 / 跑步）是当前人形最大的类人度鸿沟**，给下一轮 Locomotion / Sim-to-Real 研究指明方向。
5. **基准开放计划**：数据、代码、benchmark 计划公开，期望成为**类人度评估的"通用语言"**。

---

## 🤖 对人形 / Sim-to-Real 领域的意义

| 方向 | 含义 |
|---|---|
| **奖励设计** | 现有 RL reward 多看跟踪误差/能耗，**主观类人感缺失**——MTT 提供了一个可外接的"人感评估口" |
| **重定向 / 模仿** | HHMotion 同时含人与机器人，可作为**重定向算法（GMR、Retargeting Matters）的标尺** |
| **Sim-to-Real 评测** | 实机部署常被"能不能走"主导，MTT 提示后续要把"走得像不像人"作为二级目标 |
| **跨机型对比** | 11 个机器人统一坐标系评分，**第一次让国产/国际人形在同一坐标下排座次** |
| **社会接受度** | 服务 / 家用人形最终要被人共处，类人度直接关联使用者心理接受度，这是工程价值的隐线 |

---

## 🎤 面试参考

**Q：Motion Turing Test 跟传统的 imitation-style metric（如 MPJPE、跟踪误差）有什么区别？**
A：MPJPE 等是**客观几何误差**——告诉你"动作差多少米"，但人感不一定线性。MTT 是**主观人感分数**——直接由人判断"像不像人"。论文实验显示这两者**只弱相关**，意味着"几何对齐"做得再好，主观类人度仍可能很低，必须把人感作为独立维度评测。

**Q：为什么必须用 SMPL-X 而不是直接看视频？**
A：直接看视频会让标注员被**机器人外观（金属壳、颜色、Logo）**主导判断，"机器人就是机器人"。把所有动作映射到同一个 SMPL-X 人体模型，标注员看到的全是"人形骨架在动"，**只能依靠运动学差异（节奏、轨迹、姿态过渡）做判断**——这才是评测真正想要的信号。

**Q：HHMotion 含 11 台机器人 + 10 真人，怎么保证可比？**
A：每台机器人都被要求执行相同的 15 类动作（站立、行走、跑步、跳跃、拳击、负重…），动作由各机器人各自的控制器 / 策略生成，最后**全部通过同一 SMPL-X 重定向标准化**。这套设计让"机器人 X 在跳跃任务下的类人度 = 3.2 / 5、机器人 Y 在同任务下 = 4.1 / 5"成为可直接对比的数字。

**Q：为什么动态动作（跳跃、拳击、跑步）是类人度最大短板？**
A：这些动作要求**高动态平衡 + 大幅度关节加速度 + 富接触**，目前主流 sim-to-real 的 DR + tracking 范式在动态行为上**容易出现机械感、抖动、相位漂移**。论文的发现正好对应了 BeyondMimic、ASAP、APEX 等近期工作的核心痛点——这是 Locomotion 下一阶段的主战场。

---

## 🔗 相关阅读

- [HumanoidBench (arXiv 2403.10506)](https://arxiv.org/abs/2403.10506)：全身控制评测基准，本仓库已有笔记
- [GRUtopia (arXiv 2407.10943)](https://arxiv.org/abs/2407.10943)：城市级具身仿真基准，本仓库已有笔记
- [Retargeting Matters (2025)](https://arxiv.org/abs/2507.16942)：重定向质量对策略上限的影响（评测视角的姊妹工作）
- [GMR: Generalizable Motion Retargeting](https://arxiv.org/abs/2305.07916)：被本文评测过的重定向基线之一
- [BeyondMimic (2025)](https://arxiv.org/abs/2510.08767)：聚焦"超越模仿"的动态动作生成
- [SMPL-X 官方主页](https://smpl-x.is.tue.mpg.de/)：本文使用的统一人体表示

---

> 备注：本笔记基于 arXiv 摘要、HTML 预览以及公开搜索整理。具体每台机器人在 15 类动作下的 MoS 数值表、二选一可分辨率、标注一致性（Krippendorff α 等）以及消融实验细节，待论文正式释出 PDF 与数据集后回填。
