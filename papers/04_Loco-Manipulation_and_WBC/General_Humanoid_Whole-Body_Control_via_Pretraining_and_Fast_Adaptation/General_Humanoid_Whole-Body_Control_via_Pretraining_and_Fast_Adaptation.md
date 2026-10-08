---
layout: paper
paper_order: 36
title: "General Humanoid Whole-Body Control via Pretraining and Fast Adaptation"
zhname: "FAST：通过预训练与快速适应实现通用人形机器人全身控制"
category: "Loco-Manipulation and WBC"
---

# General Humanoid Whole-Body Control via Pretraining and Fast Adaptation
**FAST：通过预训练与快速适应实现通用人形机器人全身控制**

> 📅 阅读日期: 2026-04-29
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 通用全身控制

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.11929](https://arxiv.org/abs/2602.11929) |
| HTML | [在线阅读](https://arxiv.org/html/2602.11929) |
| PDF | [下载](https://arxiv.org/pdf/2602.11929) |
| 项目主页 | [BeingBeyond FAST](https://research.beingbeyond.com/fast) |
| **发布时间** | 2026-02-12 (arXiv) |
| 源码 | [BeingBeyond/FAST](https://github.com/BeingBeyond/FAST) |
| 机构 | WHU, BeingBeyond, PKU |
| 提交日期 | 2026-02-12 |

**作者**：Zepeng Wang, Jiangxing Wang, Shiqing Yao, Yu Zhang, Ziluo Ding, Ming Yang, Yuxuan Wang, Haobin Jiang, Chao Ma, Xiaochuan Shi, Zongqing Lu

---

## 🎯 一句话总结

FAST 面向“一个人形机器人控制器能否稳定追踪大量不同来源动作，并在遇到分布外或低质量参考时快速适应”这个问题：它先用大规模重定向动作预训练一个 Mixture-of-Experts 全身控制器，再通过 Parseval 约束和 KL 正则训练轻量残差动作策略，最后用 CoM-aware control 强化高动态动作中的平衡稳定性。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| FAST | Fast Adaptation and Stable Motion Tracking | 快速适应与稳定动作跟踪框架 |
| MoE | Mixture of Experts | 多专家网络，不同专家处理不同运动模式 |
| CoM | Center of Mass | 质心，反映整体平衡状态 |
| KL | Kullback-Leibler Divergence | 约束新旧策略分布距离，避免适应时漂太远 |
| OOD | Out-of-Distribution | 分布外动作，训练集中不常见或质量较差的参考 |
| PPO | Proximal Policy Optimization | 常用强化学习算法 |

---

## ❓ 论文要解决什么问题？

通用 humanoid motion tracking 的难点不只是“能不能跟踪一个动作”，而是同一个策略要处理很多不同分布的动作：走路、跳跃、踢腿、长时程舞蹈、人与物体交互、实时遥操作。现有方法常见两类问题：

- **任务特化重训练成本高**：每换一批动作或任务就重新训练，无法像基础控制器一样复用。
- **快速适应容易遗忘**：只针对新动作微调会提升目标动作表现，但可能破坏原来动作集上的稳定性。
- **高动态动作平衡差**：只追关节/关键点时，策略可能姿态像，但质心和支撑关系不稳，真实机器人上容易漂移或跌倒。

FAST 的设计目标是把“预训练泛化能力”和“少量适应带来的专门化能力”结合起来，同时维持真实部署所需的平衡鲁棒性。

---

## 🔧 方法拆解

### 1) 构建带物理辅助信号的动作数据集

FAST 先将多来源人体动作重定向到 humanoid 上，并附加脚接触、质心等辅助物理信号。这样训练数据不只是参考关节轨迹，还包含与平衡和接触相关的监督线索。

这一步对应项目主页中的第一阶段：通过 human-to-humanoid retargeting 构建 curated humanoid motion dataset，并加入 auxiliary physical signals。

### 2) 预训练通用全身控制器

主控制器采用 Mixture-of-Experts 架构，用强化学习训练一个可覆盖多种动作分布的 tracking policy。MoE 的作用是让不同专家承担不同运动模式，减少单一策略同时拟合所有行为时的冲突。

与只追踪参考动作的控制器相比，FAST 在观测和目标中显式纳入 CoM 相关信息，形成 **Center-of-Mass-Aware Control**，让策略在高动态动作中更关注整体平衡。

### 3) CoM-Aware Control 提升真实稳定性

论文/项目页强调 CoM-aware baseline 对比：加入 CoM 观测和目标后，策略在代表性高动态动作中更能维持平衡，减少漂移和摔倒。

直观理解：腿和手的位置追得像不代表身体稳定；CoM 是“整个机器人重量落在哪里”的信号，直接影响支撑多边形、落脚恢复和抗扰能力。

### 4) Parseval-Guided Residual Policy Adaptation

遇到低质量或 OOD 参考动作时，FAST 不直接大幅微调整个主策略，而是学习一个轻量的 delta action residual policy，在原动作输出上加小修正。

关键约束有两个：

- **Parseval/orthogonality 约束**：限制残差网络的 Lipschitz 性和扰动放大，避免适应过程变得不稳定。
- **KL 正则**：约束适应后策略不要偏离原策略太远，降低灾难性遗忘。

因此，FAST 的适应更像“给通用控制器加一个可控的小补丁”，而不是把已有能力全部重写。

---

## 🧪 实验与结果要点

- 项目页展示了真实机器人高动态踢腿、单脚跳、长时程太极/舞蹈、推椅子、拿玩具并提篮子等 demo。
- FAST 支持 zero-shot 高动态 motion tracking 和实时 teleoperation；对低质量或分布外动作参考，可通过轻量残差适应提升稳定性。
- 消融实验显示 Parseval 与 KL 正则组合能在目标适应数据集（LaFan1）和源数据集（AMASS）之间取得更好的平衡：既提升目标域，又保留源域能力。
- CoM-Aware Control 的可视化对比显示，相比 baseline 更少出现漂移或跌倒。

---

## 💡 阅读备注

1. FAST 适合放在“通用运动跟踪控制器”脉络里看：它不是只追求某个任务 SOTA，而是强调预训练控制器的可复用性和后续快速适应。
2. Parseval + KL 的残差适应思路很工程化：真实部署时，不希望为了一个新动作牺牲已有动作的稳定性。
3. CoM-aware 设计提醒我们：motion tracking 不应只看姿态误差，高动态 humanoid 必须把质心、接触和支撑稳定性纳入控制目标。
4. 与 MeshMimic 互补：MeshMimic 关注如何从真实视频扩展“动作-场景”数据，FAST 关注如何让一个通用控制器吸收多分布动作并快速适配新参考。

---

## 🔗 参考

```bibtex
@article{wang2026fast,
  title={General Humanoid Whole-Body Control via Pretraining and Fast Adaptation},
  author={Zepeng Wang and Jiangxing Wang and Shiqing Yao and Yu Zhang and Ziluo Ding and Ming Yang and Yuxuan Wang and Haobin Jiang and Chao Ma and Xiaochuan Shi and Zongqing Lu},
  journal={arXiv preprint arXiv:2602.11929},
  year={2026}
}
```
