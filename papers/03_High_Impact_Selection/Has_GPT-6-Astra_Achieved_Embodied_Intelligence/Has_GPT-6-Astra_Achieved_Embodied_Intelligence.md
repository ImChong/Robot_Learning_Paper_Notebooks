---
layout: paper
title: "Has GPT-6-Astra Achieved Embodied Intelligence?"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "GPT-6-Astra 是否已实现具身智能？"
---

# Has GPT-6-Astra Achieved Embodied Intelligence?
**通过 12 项具身基准、8 种真实机器人配置和新型基准原型评估 GPT-6-Astra：具身能力已显现，但实用具身智能仍未达到。**

> 📅 收录日期: 2026-10-19
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model
>
> 🧭 状态: 依据论文 v1 与官方项目页整理；论文作者将其结论限定为“具身能力（embodied competence）基本达到”，并未声称已实现实用具身智能。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2610.22471](https://arxiv.org/abs/2610.22471)（2026-10-15，v1） |
| **HTML** | [arXiv HTML](https://arxiv.org/html/2610.22471v1) |
| **PDF** | [arXiv PDF](https://arxiv.org/pdf/2610.22471) · [官方技术报告 PDF](https://sensenova.ai/gpt-6/assets/docs/has_gpt-6_achieved_embodied_intelligence.pdf) |
| **项目主页** | [SenseNova 官方报告页](https://sensenova.ai/has-gpt-6-astra-achieved-embodied-intelligence) |
| **配套代码** | [OpenSenseNova/SenseNova-RoboRSI](https://github.com/OpenSenseNova/SenseNova-RoboRSI)（官方项目页的 Code 链接；仓库说明该框架用于报告中的实验） |
| **数据** | [ICL 知识包](https://huggingface.co/datasets/sensenova/SenseNova-RoboRSI-Packages) · [运行日志](https://huggingface.co/datasets/sensenova/SenseNova-RoboRSI-Log) |
| **作者** | SenseNova, Joint Research Team；论文署名 Zhongang Cai 等 60 位作者 |
| **研究范围** | 12 项仿真基准；8 种真实机器人配置；下一代具身基准原型 |

---

## 🎯 一句话总结

论文用统一协议测量 GPT-6-Astra 的具身能力：允许从训练集示例构建上下文知识包，并把仿真执行步数扩展到标准预算的最多 10 倍；再通过系统消融和 8 种真实机器人配置，分析高层推理、低层控制及现实部署之间的差距。

---

## 🧪 研究设计与主要发现

### 1. 12 项仿真基准：测量能力上限

评估覆盖桌面操作、人形机器人、移动平台和灵巧手。实验允许模型在测试前从训练集成功示例中整理任务指引、动作与视觉参考、可执行辅助工具、恢复流程等知识包；测试时知识包冻结。多数任务的执行预算最多扩展到官方步数上限的 10 倍，失败重试在同一回合继续，不重置环境。

这套协议展示的是结合上下文学习与更长执行预算后的能力上限。作者指出，知识包的收益受训练任务分布限制，长时间推理也带来显著 token 成本和延迟；“能做成”并不等于高效或可实时部署。

### 2. Harness：高层推理与低层控制协作

论文比较 GPT-6-Astra 单独执行、与 VLA 控制器协作以及不同反馈频率。高层模型负责分析与复核，低层控制器提出动作；闭环复核有效，但增加推理开销。实验发现每次动作都复核成本很高，按动作块批量复核可以降低 token 消耗；加入上下文学习后效果进一步提升。

作者还指出，动作接口会影响结果：方向指令更有帮助，直接要求关节角反而降低表现；让模型调整动作块长度可提高成功率，但也需要付出更多 token。

### 3. 真实机器人：验证能力与部署限制

报告在 8 种机器人配置上测试，包括单臂与双臂机械臂、灵巧手平台、轮式移动操作平台以及 Unitree G1。不同配置完成堆叠、折叠、插入、双臂协作、移动搜索及人形机器人桌面操作等任务。

同一个模型可跨平台工作，但成功率依任务而变：刚性物体抓放相对可靠，柔性物体、精确接触和长时程移动任务更难。实机试验也有明确前提：模型使用人工整理的工具接口、关节限制、相机布置、安全约束等结构化信息；这不是不提供任何机器人知识的“裸模型”测试。

真实硬件不能像仿真一样免费增加步数：动作耗时、碰撞保护、硬件故障、温度限制和人工监督都会限制重试。论文因此认为，仿真中用更长执行换取更高成功率的做法，不能直接搬到真实部署。

### 4. 下一代基准原型：按现实世界的时间与需求评测

作者提出的基准原型包含三点：

1. 任务从人的真实需求出发，而非只由固定技能模板定义；
2. 不提供同分布示例，要求智能体在测试时探索环境；
3. 评测使用持续运行的“世界时钟”，模型思考期间环境时间也会流逝，并由评测者依据完整执行轨迹判断结果。

这一设计试图补上现有仿真评测中对示例依赖、推理时间和真实任务完成质量覆盖不足的问题。

---

## ⚠️ 论文给出的边界

- **示例泛化有限**：从训练集构建的知识包容易对特定任务有效，跨任务迁移仍是开放问题。
- **推理成本与时间高**：长时程任务会消耗大量 token 和墙钟时间，推理延迟不计入传统仿真步数预算。
- **物理状态验证困难**：模型可能看起来完成了任务，却没有满足接触、支撑或对齐等真实条件。
- **不可逆失败与长时程进度**：错误动作会改变后续恢复条件；长链任务还需要避免后续动作破坏已完成的子目标。
- **实机不支持无限重试**：保护停机、硬件应力、温升与人工值守使“多跑几步”有实际代价。

因此，标题所问的答案不是简单的“是/否”：报告支持 GPT-6-Astra 已具备相当强的具身任务能力，但证据尚不足以说明它已成为高效、稳健、可实际部署的具身智能系统。

---

## 🔗 来源

- [论文原文（arXiv）](https://arxiv.org/abs/2610.22471)
- [官方技术报告与交互图表](https://sensenova.ai/has-gpt-6-astra-achieved-embodied-intelligence)
- [SenseNova-RoboRSI 代码与实验框架](https://github.com/OpenSenseNova/SenseNova-RoboRSI)
