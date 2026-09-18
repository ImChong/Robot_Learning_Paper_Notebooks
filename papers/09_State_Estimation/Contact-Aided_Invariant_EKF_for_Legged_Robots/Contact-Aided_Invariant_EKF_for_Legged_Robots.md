---
layout: paper
paper_order: 1
title: "Contact-Aided Invariant Extended Kalman Filtering for Legged Robot State Estimation"
category: "状态估计"
zhname: "基于接触辅助的不变扩展卡尔曼滤波的足式机器人状态估计"
---

# Contact-Aided Invariant Extended Kalman Filtering for Legged Robot State Estimation
**基于接触辅助的不变扩展卡尔曼滤波的足式机器人状态估计**

> 📅 阅读日期: 2026-04-21
>
> 🏷️ 板块: 08 State Estimation · 分类起步样例
>
> 🚧 本笔记已填充基本信息，深度技术细节待细化。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [1904.09251](https://arxiv.org/abs/1904.09251) (RSS 2018) |
| **PDF** | [Download](https://arxiv.org/pdf/1904.09251.pdf) |
| **作者** | Ross Hartley, Maani Ghaffari, Jessy W. Grizzle, Eustice |
| **机构** | University of Michigan |
| **发布时间** | 2018-06 (RSS 2018), 2019-04-19 (arXiv) |
| **项目主页** | 🚧 |
| **代码** | 🚧 |

---

## 🎯 一句话总结

> 本论文将李群（Lie Group）理论中的不变卡尔曼滤波（InEKF）应用于足式机器人，通过融合 IMU 和腿部运动学信息，实现了比传统 EKF 更准确、收敛更快的状态估计。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| InEKF | Invariant Extended Kalman Filter | 不变扩展卡尔曼滤波，利用状态空间的几何结构（李群）改进滤波效果 |
| IMU | Inertial Measurement Unit | 惯性测量单元，测量加速度和角速度 |
| SE(3) | Special Euclidean Group | 三维欧几里得群，表示三维空间的旋转和平移 |
| SE_n+2(3) | Extended SE(3) | 针对包含速度和接触点位置的扩展状态空间表示 |

---

## ❓ 论文要解决什么问题？

- **传统 EKF 的一致性问题**：标准 EKF 在欧几里得空间线性化动力学方程，其线性化误差取决于当前的估值。在足式机器人这种大范围、高动态运动中，这会导致估计不一致（过分自信）甚至发散。
- **足式机器人特殊性**：足式机器人拥有间歇性的地面接触。如何利用这种"脚踏实地"的几何约束来修正漂移？
- **可观测性分析**：如何从数学上清晰地定义哪些状态（如航向角、绝对位置）在仅有本体感受传感器时是不可观测的？

---

## 🔧 方法详解

1. **李群建模 (Lie Group State Space)**：
   - 将机器人位姿、速度以及所有触地点的位置统一建模在 $SE _ {n+2}(3)$ 群上。
   - 证明了在这种表示下，接触 - 惯性系统的误差动力学是"对数线性的"（Log-linear），即误差演化独立于机器人的具体轨迹。
2. **不变性观测器设计**：
   - 无论机器人如何旋转或平移，滤波器的增益和协方差更新都保持几何上的一致性。
3. **接触管理**：
   - 设计了动态添加和移除接触点的机制，能够处理步行过程中频繁的步态切换。
4. **优势**：
   - 相比标准 EKF，InEKF 拥有更大的收敛域，且不会因线性化点选取不当而产生假性的可观测信息（如错误的偏航角修正）。

---

## 🚶 具体实例

- **Cassie 机器人实验**：在密歇根大学的测试中，Cassie 在复杂、特征匮乏的户外环境下行走。InEKF 提供了极其稳健的里程计，即使在没有视觉/激光雷达辅助的情况下，也能长时间保持低漂移。

---

## 🤖 工程价值

- **足式机器人标配**：InEKF 思想已成为现代足式机器人（如 MIT Cheetah, Mini Cheetah, Unitree 系列）状态估计器的基石。
- **鲁棒性保障**：在视觉失效（黑夜、烟雾、剧烈晃动）时，基于 InEKF 的本体感受估计是保证机器人不摔倒的最后一道防线。
- **数学美感与实用结合**：将高深的微分几何理论转化为可实时运行的工业级滤波算法。

---

## 🎤 面试高频问题 & 参考回答

1. **为什么足式机器人用 InEKF 比普通 EKF 好？**
   - 因为 InEKF 的线性化误差不依赖于估值状态，解决了 EKF 常见的一致性（Consistency）问题，收敛更快且更鲁棒。
2. **InEKF 能观测到偏航角（Yaw）吗？**
   - 不能。InEKF 能够正确反映出在重力参考系下偏航角和绝对位置是不可观的，从而避免了普通 EKF 产生的假修正。

---

## 📎 附录

### A. 参考来源
- [arXiv:1904.09251](https://arxiv.org/abs/1904.09251)
- [RSS 2018 Paper](http://www.roboticsproceedings.org/rss14/p40.pdf)
