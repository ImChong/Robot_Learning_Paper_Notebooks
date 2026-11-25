---
layout: paper
title: "PhyDEX: A Benchmark for Physical Reasoning in Vision-Language-Action Models via Dynamic Extrinsic Dexterity"
zhname: "PhyDEX：基于动态外在灵巧性的视觉语言动作模型物理推理基准"
arxiv: "2611.26565"
original_check: partial
original_check_date: 2026-11-25
original_check_scope: "官方 HTML v1 第 1–5 节及表 1–4、项目页；PDF 和附录未独立复核"
---

# PhyDEX: A Benchmark for Physical Reasoning in Vision-Language-Action Models via Dynamic Extrinsic Dexterity
**以超出机械臂工作空间的投掷任务检验 VLA 对物体物理属性的推理能力。**

> 📅 总结日期：2026-11-25

## 📋 基本信息

- 作者：Hao Vo、Taisei Hanyu、Yuki Ikebe、Pham Tri Quang、Sreevenkata Anjani Tishita Godavarthi、Nghi D. Q. Bui、Daniel Sonntag、Chase Rainwater、Duy Minh Ho Nguyen、Anh Nguyen、Ngan Le。
- 发表：2026-11-19，arXiv v1 预印本。
- 模块：11 Simulation Benchmark。
- 原文：[摘要](https://arxiv.org/abs/2611.26565) · [HTML](https://arxiv.org/html/2611.26565v1) · [PDF](https://arxiv.org/pdf/2611.26565)。
- [官方项目页](https://uark-aicv.github.io/PhyDEX/)。
- 核验状态：HTML 正文第 1–5 节及实验表已阅读；PDF 与附录未独立复核；项目页于 2026-11-25 标注代码和数据 Coming soon，故无源码时序图。

## ❓ 研究问题

外观相同的物体可能具有不同质量、质心和摩擦系数。仅靠视觉模仿是否足以完成依赖这些隐藏参数的动态操作？

## 🔧 核心方法

基准将三类物体质量分布与三类目标运动设置交叉组合，得到 9 类任务。Isaac Sim 自动生成示教，随机化外观、初始状态与物理参数。GraspGen-X 提供抓取候选，cuRobo 负责避碰接近，SLSQP 在运动学、动力学约束下优化投掷轨迹，仿真反馈用于修正偏差。成功轨迹存入 LeRobot，包含图像、关节状态、动作及腕部力矩/力观测。

<div class="mermaid">
flowchart TD
 A["任务模板与资产库"] --> B["视觉、轨迹与物理随机化"]
 B --> C["GraspGen-X 抓取候选"]
 C --> D["cuRobo 接近规划"]
 D --> E["SLSQP 轨迹优化"]
 E --> F["仿真执行与反馈"]
 F --> G{"任务成功"}
 G -->|否| E
 G -->|是| H["LeRobot 数据"]
 H --> I["逐任务微调 VLA"]
 I --> J["闭环评测与失败分析"]
</div>

## 📊 实验与结果

数据规模为 35,357 条轨迹、143.2 小时、100 个场景。表 1 的完整随机化平均成功率：GR00T N1.7 为 0.9%，DynamicVLA 为 0.2%，ForceVLA 为 2.4%。表 4 的真实 UR10e 实验经过真机示教微调，ForceVLA 达到 51.3%，并非零样本迁移。作者的失败分析显示约 89% 的失败发生于投掷前，说明抓取鲁棒性与物理推理都需改善。

## 🧮 具体实例

根据表 2，静态单目标任务中 ForceVLA 在随机化强度 0、0.5、1 时的平均成功率分别为 35.3%、11.3%、3.3%。从 0 到 1 下降 32 个百分点，相对下降约 90.7%。这组数字只能比较相同任务子集，不能直接与表 1 的九任务整体平均值混用。工程验收时应固定任务、试验次数和成功判据，再逐项改变随机化强度，分别统计抓取成功率及抓取后的条件成功率，避免把前置动作失败误判成物理推理失败。论文的消融结果支持这种分阶段诊断，但不意味着随机化是所有失败的唯一原因。

## ⚠️ 局限与阅读骨架

先读第 3 节的数据生成，再看第 4 节的整体、随机化消融、跨本体与真机评测，最后阅读第 5 节。该基准只覆盖一种动态技能及有限物理属性，比较的模型也只有三种。真机动态操作仍需独立安全验证；不能将基准成功率视为部署安全保证。
