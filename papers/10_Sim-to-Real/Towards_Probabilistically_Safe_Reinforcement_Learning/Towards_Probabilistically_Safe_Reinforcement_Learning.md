---
layout: paper
title: "Towards Probabilistically Safe Reinforcement Learning: Theory and Deployment on Humanoid and Aerial Robots"
zhname: "迈向概率安全强化学习：理论与人形及飞行机器人部署"
arxiv: "2611.19616"
original_check: partial
original_check_date: 2026-11-24
original_check_scope: "官方 HTML 正文主要方法、实验与结论；附录未完整核验"
---

# Towards Probabilistically Safe Reinforcement Learning: Theory and Deployment on Humanoid and Aerial Robots
**通过约束梯度流修正策略更新方向，使任务优化兼顾轨迹级安全。**

> 📅 总结日期：2026-11-24

## 📋 基本信息

- 作者：Pol Mestres、Varun Gabbita、Jason H.K. Siu、Sergio A. Esteban、Hampus Serneke、Joel W. Burdick、Aaron D. Ames（Caltech）
- 发表：2026-11-14，arXiv v1 预印本
- 模块：10 Sim-to-Real
- 原文：[HTML](https://arxiv.org/html/2611.19616v1) · [PDF](https://arxiv.org/pdf/2611.19616) · [摘要](https://arxiv.org/abs/2611.19616)
- 核验：HTML 主要正文已阅读；附录未完整核验；PDF 未独立复核；项目页与专用公开源码未确认，故不绘制源码时序图。

## ❓ 研究问题

普通 PPO 优化任务收益，不能自动确保整个轨迹的安全概率。如何在允许价值和梯度估计存在偏差的情况下约束策略训练，并迁移至真机？

## 🔧 核心方法

设任务目标为 V0，安全约束为 V1≤0。RSGF-RL 根据采样估计构造二次约束优化，将任务下降方向投影至满足安全条件的更新方向。若经验子问题不可行，则沿安全成本的负梯度更新。论文命题 4 给出依赖估计偏差、采样误差和步长的概率界；命题 5 在相应假设下给出近似 KKT 收敛性质。

<div class="mermaid">
flowchart TD
 A["当前策略"] --> B["采样轨迹"]
 B --> C["PPO 目标梯度"]
 B --> D["Actor-Critic 安全值与梯度"]
 C --> E["RSGF 约束优化"]
 D --> E
 E --> F{"经验约束可行"}
 F -->|是| G["采用约束更新方向"]
 F -->|否| H["采用安全负梯度方向"]
 G --> I["更新策略参数"]
 H --> I
 I --> A
 I --> J["训练结束后零样本部署"]
</div>

## 📊 实验与结果

G1 在 mjlab 中训练行走、下蹲和爬行动作，策略输出关节位置目标，由 PD 跟踪。相比普通 PPO，论文报告安全违规减少；Crazyflie 在 IsaacLab 中训练避障导航，实机展示避障。实验采用域随机化。具体曲线数值不作未核实的量化解读。

## 🧮 具体实例

根据正文第 4 节，G1 仿真频率 200 Hz、策略频率 50 Hz，分别对应 5 ms 和 20 ms 周期，每次策略更新覆盖 4 个仿真步。10 秒回合包含 500 次策略更新和 2000 个物理步。无人机对应 400 Hz 与 100 Hz，10 秒包含 1000 次策略更新与 4000 个物理步。这些是根据论文配置换算的控制周期，而不是实机通信延迟或推理耗时。实际部署还应考虑观测采集、计算、通信及低层控制的时序预算。

## ⚠️ 局限与阅读骨架

- 问题：轨迹安全与任务收益的联合优化。
- 方法：先读概率约束定义，再读式 11–12 和命题 4–5。
- 结果：阅读第 4 节的机器人实验，区分训练安全与硬件安全。
- 局限：第 4.3 节明确说明实验没有满足全部理论假设；不能把理论界当作实机无碰撞保证。爬行课程学习改变约束，估计偏差也未被紧致刻画。
