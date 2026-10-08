---
layout: paper
title: "Humanoid Parkour Learning"
category: "高影响力精选 High Impact Selection"
subcategory: "Locomotion Classics"
zhname: "人形跑酷：无动作先验的端到端视觉全身控制（Unitree H1）"
paper_order: 294
---

# Humanoid Parkour Learning
**人形跑酷学习**

> 📅 阅读日期: 2026-05-25
>
> 🏷️ 板块: 03_High_Impact_Selection / Locomotion Classics（H14）
>
> 🧭 状态: 首版基础摘要稿；含 PDF / HTML / 项目页、相关代码与流程图。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2406.10759](https://arxiv.org/abs/2406.10759) |
| **HTML** | [arxiv.org/html/2406.10759v2](https://arxiv.org/html/2406.10759v2) |
| **PDF** | [arxiv.org/pdf/2406.10759.pdf](https://arxiv.org/pdf/2406.10759.pdf) |
| **项目主页** | [humanoid4parkour.github.io](https://humanoid4parkour.github.io/) |
| **OpenReview（CoRL 2024）** | [openreview.net/forum?id=fs7ia3FqUM](https://openreview.net/forum?id=fs7ia3FqUM) |
| **作者** | Ziwen Zhuang, Shenzhe Yao, Hang Zhao |
| **机构** | 上海期智研究院、上海科技大学、清华大学 |
| **机器人** | **Unitree H1**（Isaac Gym 训练与实机部署） |
| **发布时间** | 2024-06-15 (arXiv) |
| **源码** | 论文管线与前期四足跑酷工作同系；可参考作者仓库 [ZiwenZhuang/parkour](https://github.com/ZiwenZhuang/parkour)（Robot Parkour Learning / legged_gym 生态）；人形扩展细节以论文与项目页为准 |

---

## 🎯 一句话总结

用 **RL 在仿真里练「神谕」地形策略（scandots 地形编码 + GRU 状态估计）**，再通过 **DAgger 把感知蒸馏成机载深度图 CNN**，在 **无参考轨迹、无抬脚奖励项** 的前提下，让人形在多种跑酷障碍上 **零样本 sim-to-real**，并能跟随摇杆转向命令；手臂通道可覆盖以迁移到移动操作。

---

## ❓ 论文在解决什么？

跑酷需要 **主动感知 + 多种全身机动**。以往人形学习行走常依赖 **大量参考动作或「滞空时间」类奖励** 才能抬脚，限制腿法多样性。本文要一个 **统一框架**：十种量级障碍（跳上/跳下、跨栏、大间距跳跃、斜坡、楼梯等），**端到端** 用机载 **RealSense D435i 深度** + 本体感知闭环控制，且 **不依赖动作先验**。

---

## 🔧 方法要点（摘要）

1. **平地预训练**：在带 **分形噪声高度场** 的平地上用 PPO 训练跟速策略，使策略自然学会抬脚，避免与后续跑酷奖励冲突。  
2. **自动朝向指令**：跑酷赛道沿直线布置，通过目标方向与当前朝向差生成 **偏航速率命令**，保留「听摇杆转弯」能力。  
3. **神谕策略**：仿真中用 **scandots**（GPU 高度场采样，约 11×19）编码地形 → MLP 嵌入；**GRU + MLP** 估计基座线速度；与本体、上一动作一起输出全身关节目标。**自动课程** 在 10×40 障碍网格上调节难度。  
4. **安全塑形**：**虚拟障碍穿透惩罚**（身体采样点）减少 exploit 边缘；楼梯类任务加 **推荐落脚点奖励** 稳定落足。  
5. **视觉蒸馏**：把 scandots 分支换成 **48×64 深度图 CNN**；对渲染深度加噪声以贴近 RealSense；**4×GPU 多进程 DAgger** 加速采集，用教师动作做 L1 监督。  
6. **实机**：策略拷到 H1，视觉与策略分进程，**ROS 2 + Cyclone DDS** 通信。

---

## 🧭 训练与部署流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph P0["① 平地跟速"]
        A1["分形噪声地形<br/>PPO"]
        A2["速度/偏航跟踪<br/>能耗与安全正则"]
    end

    subgraph P1["② 神谕跑酷"]
        B1["scandots 地形嵌入"]
        B2["GRU 线速度估计"]
        B3["10 类障碍<br/>自动课程"]
        B4["虚拟障碍 / 落脚点奖励"]
    end

    subgraph P2["③ 视觉学生"]
        C1["深度 CNN 替换 scandots"]
        C2["仿真深度加噪"]
        C3["多进程 DAgger<br/>L1 模仿教师"]
    end

    subgraph P3["④ 实机 H1"]
        D1["RealSense D435i"]
        D2["ROS2 + DDS<br/>分进程推理"]
    end

    P0 --> P1 --> P2 --> P3
</div>

---

## 📚 二读建议

- 对照附录中的 **障碍几何参数范围** 与消融（分形噪声 vs feet air time、纯盲策略等）。  
- 若后续放出人形专用训练分支，将 **GitHub** 链从「parkour 同系仓库」升级为独立条目。
