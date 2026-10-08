---
layout: paper
title: "Learning Sim-to-Real Humanoid Locomotion in 15 Minutes"
category: "高影响力精选 High Impact Selection"
subcategory: "Locomotion Classics"
zhname: "15 分钟人形 sim-to-real：FastSAC / FastTD3 大规模并行配方（Amazon FAR）"
paper_order: 205
---

# Learning Sim-to-Real Humanoid Locomotion in 15 Minutes
**15 分钟学会人形 Sim-to-Real 行走**

> 📅 阅读日期: 2026-05-17
>
> 🏷️ 板块: 03_High_Impact_Selection / Locomotion Classics（H15）
>
> 🧭 状态: 首版基础摘要稿；含 PDF / HTML、项目页、开源实现与流程图。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2512.01996](https://arxiv.org/abs/2512.01996) |
| **HTML** | [arxiv.org/html/2512.01996v1](https://arxiv.org/html/2512.01996v1) |
| **PDF** | [arxiv.org/pdf/2512.01996.pdf](https://arxiv.org/pdf/2512.01996.pdf) |
| **项目主页 / 视频** | [younggyo.me/fastsac-humanoid](https://younggyo.me/fastsac-humanoid) |
| **作者** | Younggyo Seo*, Carmelo Sferrazza*, Juyue Chen, Guanya Shi, Rocky Duan, Pieter Abbeel |
| **机构** | Amazon FAR（Frontier AI & Robotics） |
| **硬件** | **Unitree G1**、**Booster T1**（速度跟踪与全身动作跟踪的 sim-to-real） |
| **发布时间** | 2025-12-01 (arXiv) |
| **源码** | 官方实现收录于 **Holosoma** 仓库：[amazon-far/holosoma](https://github.com/amazon-far/holosoma)（论文正文亦指向该仓库） |

---

## 🎯 一句话总结

在 **单张 RTX 4090 + 数千并行仿真环境** 下，用 **为大规模并行调参的 FastSAC / FastTD3（离策略 RL）** 配合 **极简奖励 + 强域随机化（动力学、粗糙地形、推扰、延迟等）**，把 **全关节人形速度跟踪** 的训练墙钟时间压到约 **15 分钟**，并在 G1 / T1 上完成 **sim-to-real**；同一套配方也可加速 **全身人形动作跟踪**（相对 PPO 更快）。

---

## ❓ 论文在解决什么？

高吞吐 GPU 仿真把机器人 RL 从「天级」拉到「分钟级」，但 **人形 sim-to-real** 仍常被 **高维动作空间 + 重域随机化** 拖慢：探索难、奖励项臃肿、超参敏感，迭代仍像在多小时训练里打转。本文给出一套 **刻意保持简单** 的工程配方：**离策略算法复用数据**、**少量关键稳定化设计**、**少于 10 项的核心奖励**，让研究者能快速试错闭环。

---

## 🔧 方法要点（摘要）

1. **算法**：以 **FastSAC**、**FastTD3** 为主（相对 PPO 等 on-policy 方法，在大 batch 下更好利用回放数据）；在全身人形上补全了先前 FastTD3 工作里「只控子集关节」的缺口。  
2. **规模化训练**：大量并行环境、**每仿真步多步梯度**、**大 batch（如至 8K）**；难地形下仿真往往成瓶颈，离策略复用数据更有优势。  
3. **稳定技巧（节选）**：**关节限位感知动作边界**（基于各关节相对默认姿态的可动范围设 tanh 边界）、**观测归一化 + LayerNorm**、**双 Q 取平均**（而非 clipped double Q 最小值）、**分布式 Critic（C51 系）**、**折扣因子** 按任务选 γ≈0.97（简单跟速）或 0.99（难全身跟踪）、**FastSAC 探索** 上限制 σ、**较低权重衰减** 与 **Adam β₂=0.95** 等微调。  
4. **奖励**：速度跟踪任务用 **线/角速度跟踪 + 摆脚高度 + 默认姿态/足部几何正则 + 躯干姿态 + 动作变化率惩罚 + alive** 等少量项，并配合 **课程式逐渐加大惩罚权重**；全身跟踪沿用 BeyondMimic 式简洁结构并加推扰等 DR。  
5. **实验**：G1 / T1 **粗糙地形 + 强推扰 + 延迟/摩擦/质量/PD 随机化** 等条件下的 **15 分钟 loco**；多卡环境下 **全身舞蹈等长序列跟踪** 相对 PPO 更快，且展示 **真机 G1** 部署视频。

---

## 🧭 从仿真配方到实机部署（mermaid）

<div class="mermaid">
flowchart TB
    subgraph Sim["大规模并行仿真"]
        E1["Isaac 类 GPU 并行环境<br/>数千 env"]
        E2["域随机化<br/>动力学 / 地形 / 推扰 / 延迟"]
        E3["极简奖励 + 课程<br/>loco 或 WBT"]
    end

    subgraph RL["离策略 RL"]
        R1["FastSAC 或 FastTD3"]
        R2["大 batch 多步更新<br/>回放复用"]
        R3["LayerNorm / 关节界<br/>C51 critic 等稳定项"]
    end

    subgraph Out["产出与迁移"]
        O1["约 15 分钟 loco checkpoint"]
        O2["全身跟踪 checkpoint"]
        O3["sim-to-real<br/>G1 / T1 实机"]
    end

    Sim --> RL --> Out
</div>

---

## 📚 二读建议

- 对照文中 **Figure 2** 各消融（更新步数、归一化、γ、环境数）理解瓶颈在「仿真吞吐」还是「优化稳定性」。  
- 在 [Holosoma](https://github.com/amazon-far/holosoma) 中对照 **奖励权重与课程调度** 做复现实验。  
- 与 **Real-World Humanoid Locomotion (H12)**、**Humanoid Parkour (H14)** 等对照：本文侧重 **算法与训练效率**，而非特定感知架构。
