---
layout: paper
title: "QDD-MM: A Simple and Compact Open-Source Muscle Module with Quasi-Direct-Drive Motor for Tendon-driven Robots"
zhname: "QDD-MM：面向腱驱动机器人的紧凑开源准直驱肌肉模块"
arxiv: "2611.24279"
original_check: done
original_check_date: 2026-11-26
original_check_scope: "官方 HTML v1 正文 I–IV 节、表 I；官方仓库 README；PDF 未独立复核，CAD 未下载"
---

# QDD-MM: A Simple and Compact Open-Source Muscle Module with Quasi-Direct-Drive Motor for Tendon-driven Robots
**利用低减速比电机和可重组机械接口，简化腱驱动机器人肌肉模块并改善反驱性能。**

> 📅 总结日期：2026-11-26

## 📋 基本信息

- 作者：Kento Kawaharazuka、Yoshimoto Ribayashi、Takahiro Hattori、Shunnosuke Yoshimura、Kei Okada（东京大学）。
- 首次发表：2026-11-18，arXiv v1；作者注明已被 IEEE-RAS Humanoids 2026 接收。
- 模块：12 Hardware Design。
- 论文：[arXiv](https://arxiv.org/abs/2611.24279) · [HTML](https://arxiv.org/html/2611.24279v1) · [PDF](https://arxiv.org/pdf/2611.24279)
- [项目主页](https://haraduka.github.io/qddmm/) · [官方仓库](https://github.com/haraduka/qddmm)
- 核验：2026-11-26 已阅读 HTML 正文 I–IV 节和表 I，核对仓库 README。PDF 未独立复核；机械设计文件由官方 README 链接分发，未下载核验。README 明确不包含电机控制软件，因此不绘制源码时序图。

## ❓ 研究问题

高减速比腱驱动模块的摩擦、迟滞及传感器集成增加控制与维护难度。如何以通用机械接口兼顾反驱、速度及不同肌肉布局？

## 🔧 核心方法

采用 RobStride05（7.75:1），通过 CAN 控制；可换卷线轮决定力与速度的折中。独立导线单元改变牵引方向，连接件支持模块并排或首尾安装。首尾连接可兼作骨架。电流用于近似估计张力，而非直接测量。

<div class="mermaid">
flowchart TD
 A["关节角目标"] --> B["PD 计算关节力矩"]
 B --> C["分配肌肉张力"]
 C --> D["张力换算电机电流"]
 D --> E["CAN 控制 QDD 电机"]
 E --> F["卷线轮与导线单元"]
 F --> G["腱驱动关节"]
 G --> H["关节角反馈"]
 H --> B
</div>

图依据正文 III-B 的控制描述，非软件调用图。

## 📊 实验与结果

- 表 I：24 mm 卷线轮对应连续额定张力 133 N、空载速度 603 mm/s。
- 图 9：以 5 mm/s 拉线时，阻力约从旧模块的 8 N 降至 4 N。
- 图 10：两种模块实际张力约为指令的九成；QDD-MM 迟滞更小。
- 图 12：三种单关节构型均能跟踪角度；增加并联主动肌肉后，每条主动腱的负载约减半。
- 图 13：八模块驱动肩胛和上臂，尚非完整人形机器人。

## 🧮 计算实例：卷线轮选型

依据表 I 与 II-A，连续输出力矩为 1.6 N·m。忽略额外摩擦，张力等于力矩除以半径。直径 24 mm 时，半径 0.012 m，得到 1.6/0.012≈133.3 N；换成直径 12 mm 时，半径 0.006 m，得到约 266.7 N。若轴转速不变，线速度随半径减半，表 I 的空载速度由 603 mm/s 变为约 302 mm/s。上述是额定力矩与几何关系的换算，不表示电机可以同时达到连续额定张力与空载速度。选型还需检查行程、热限制、卷绕层数造成的有效半径变化、摩擦及动态负载。实际张力应以标定结果为准。

## ⚠️ 局限与阅读骨架

先读 II-A 至 II-D 的机械接口与力速折中，再读 III-A 的反驱及迟滞对比，最后看 III-B/C 的重构实验。齿槽力矩仍引入波动，电流估力存在误差；长期耐久性和完整人形集成留待后续验证。论文没有训练学习策略，不能据此推断强化学习效果。
