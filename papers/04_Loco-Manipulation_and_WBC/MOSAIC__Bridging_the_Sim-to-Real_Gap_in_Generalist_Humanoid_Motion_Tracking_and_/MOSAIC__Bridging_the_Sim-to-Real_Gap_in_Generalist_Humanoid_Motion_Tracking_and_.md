---
layout: paper
paper_order: 39
title: "MOSAIC: Bridging the Sim-to-Real Gap in Generalist Humanoid Motion Tracking and Teleoperation with Rapid Residual Adaptation"
zhname: "MOSAIC：通过快速残差自适应弥合通用人形运动跟踪与遥操作的仿真到真实差距"
category: "Loco-Manipulation and WBC"
---

# MOSAIC: Bridging the Sim-to-Real Gap in Generalist Humanoid Motion Tracking and Teleoperation with Rapid Residual Adaptation
**MOSAIC：通用人形动作跟踪与遥操作的 Sim-to-Real 桥接**

> 📅 阅读日期: 2026-05-01
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · Sim-to-Real · 遥操作

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.08594](https://arxiv.org/abs/2602.08594) |
| HTML | [在线阅读](https://arxiv.org/html/2602.08594v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.08594) |
| **发布时间** | 2026-02-09 (arXiv) |
| 源码 | [BAAI-Humanoid/MOSAIC](https://github.com/BAAI-Humanoid/MOSAIC) |
| 数据集 | [BAAI-Humanoid/MOSAIC_Dataset](https://huggingface.co/datasets/BAAI-Humanoid/MOSAIC_Dataset) |
| 提交日期 | 2026-02-09 |

**作者**：Zhenguo Sun, Bo-Sheng Huang, Yibo Peng, Xukun Li, Jingyu Ma, Yu Sun, Zhe Li, Haojun Jiang, Biao Gao, Zhenshan Bing, Xinlong Wang, Alois Knoll（北京人工智能研究院 BAAI / 清华大学 / 慕尼黑工业大学 / 南京大学）

---

## 🎯 一句话总结

MOSAIC 将**通用运动跟踪训练**与**快速残差接口适配**解耦：先在仿真中学会泛化的动作跟踪，再用少量真实数据通过加法残差模块消除遥操接口特有的时延/噪声等系统误差，实现分钟级稳定遥操，同时保留对大规模动作库的泛化能力。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| MOSAIC | — | 论文方法名称 |
| Sim-to-Real | Simulation to Reality | 仿真到真实迁移 |
| WBC | Whole-Body Control | 全身控制 |
| RRA | Rapid Residual Adaptation | 快速残差自适应 |
| AMASS | Archive of Motion Capture as Surface Shapes | 大规模动作捕捉数据集 |

---

## ❓ 论文要解决什么问题？

通用人形运动跟踪策略在仿真中表现良好，但部署到真实机器人遥操场景时仍会出现大量失败。作者通过实验发现：

1. **仿真跟踪指标饱和后**，真实失败并非源于动作多样性不足，而是由**接口/动力学差距**引发（时延、状态估计偏差、遥操指令噪声）。
2. 现有 Sim-to-Real 方法（增加周期运动增广、领域随机化等）只改善了动作覆盖，无法有效消除接口引入的系统误差。

---

## 🔧 方法拆解

### 1) 面向遥操的通用跟踪器（General Tracker）

- 在大规模多源动作库（AMASS 等）上通过强化学习训练。
- 使用**自适应重采样**控制动作分布，优先保证难度较高的运动。
- 引入**世界坐标系运动一致性奖励**，提升跟踪稳定性。

### 2) 快速残差自适应（Rapid Residual Adaptation）

- 在冻结的通用跟踪器上附加一个**加法残差模块**，只用少量真实遥操数据训练。
- 残差模块专门补偿接口特有误差（时延、估计偏差、噪声），而不改变整体运动策略。
- 比整体微调（fine-tuning）或持续学习更稳定、数据效率更高。

### 关键发现

| 方法 | 仿真指标 | 真实遥操稳定性 |
|---|---|---|
| 仅增加运动多样性 | 提升明显 | 提升有限 |
| 快速残差适配（RRA）| 基本不变 | **显著提升** |

---

## 💡 核心贡献

1. **诊断**：量化识别出仿真 Sim-to-Real 差距的主要来源是接口/动力学误差，而非动作覆盖不足。
2. **方法**：提出残差自适应模块，冻结通用骨干，只训练轻量残差分支，实现快速接口适配。
3. **工程**：支持分钟级遥操接口适配，公开代码与数据集，便于复现。
