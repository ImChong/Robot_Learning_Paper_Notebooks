---
layout: paper
paper_order: 40
title: "Learning Human-Like Badminton Skills for Humanoid Robots"
zhname: "面向仿人机器人的类人羽毛球技能学习"
category: "Loco-Manipulation and WBC"
---

# Learning Human-Like Badminton Skills for Humanoid Robots
**面向仿人机器人的类人羽毛球技能学习**

> 📅 阅读日期: 2026-05-02
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 运动技能 · Sim-to-Real

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.08370](https://arxiv.org/abs/2602.08370) |
| HTML | [在线阅读](https://arxiv.org/html/2602.08370) |
| PDF | [下载](https://arxiv.org/pdf/2602.08370) |
| 项目主页 | [astrorix.github.io/LHBS](https://astrorix.github.io/LHBS/) |
| **发布时间** | 2026-02-09 (arXiv) |
| 源码 | 待官方释出 |
| 提交日期 | 2026-02-09 |

**作者**：Yeke Chen, Shihao Dong, Xiaoyu Ji, Jingkai Sun, Zeren Luo, Liu Zhao, Jiahui Zhang, Wanyue Li, Ji Ma, Bowen Xu, Yimin Han, Yudong Zhao, Peng Lu

---

## 🎯 一句话总结

提出 **Imitation-to-Interaction** 渐进式强化学习框架，将人形机器人的羽毛球学习拆解为四阶段：运动先验建立 → 目标条件蒸馏 → 对抗先验稳定 → 交互流形扩展，实现首个零样本迁移到真实机器人的拟人羽毛球技能。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| AMP | Adversarial Motion Priors | 对抗运动先验，用于保持动作风格自然性 |
| TTH | Time-to-Hit | 预计击球时刻，用于状态表示 |
| THS | Target Hit State | 目标击球状态 |
| TRS | Target Recovery State | 目标恢复状态 |
| WBC | Whole-Body Control | 全身控制 |

---

## ❓ 论文要解决什么问题？

羽毛球对机器人提出了极高要求：

1. **爆发式全身协调**：击球需要腿部蹬地、躯干旋转、手臂挥拍的精确时序配合。
2. **时序关键的精准拦截**：羽毛球飞行速度快、轨迹多变，要求毫秒级精度的预判与击打。
3. **模仿与功能的鸿沟**：直接模仿人类动作捕捉数据往往缺乏物理交互的功能性，难以实际击打到球。

核心挑战：如何在保持动作拟人自然性的同时，让机器人真正具备功能性的击球能力，并成功完成零样本 Sim-to-Real 迁移。

---

## 🔧 方法拆解：Imitation-to-Interaction 四阶段框架

### 阶段 1：运动先验建立（Motor Prior Learning）
- 通过运动跟踪（motion tracking）从人类动作数据建立健壮的运动先验。
- 确保机器人具备人类运动的基本风格与姿态库。

### 阶段 2：目标条件蒸馏（Goal-Conditioned Distillation）
- 将先验蒸馏为紧凑的模型化状态表示，包含三个关键时序信号：
  - **TTH（Time-to-Hit）**：距离预计击球的剩余时间
  - **THS（Target Hit State）**：击球时的目标关节状态
  - **TRS（Target Recovery State）**：击球后的恢复目标状态
- 引入**前向兼容评论网络（forward-compatible critics）**，为后续阶段提供稳定的价值估计基础。

### 阶段 3：对抗先验稳定（AMP Stabilization）
- 使用**对抗运动先验（AMP）**在强化学习训练中维持动作风格的自然性。
- 防止功能优化阶段破坏前期建立的拟人运动模式。

### 阶段 4：交互驱动精炼与流形扩展（Interaction-Driven Refinement）
- 在物理交互环境中对策略进行精炼。
- 引入**流形扩展策略（manifold expansion）**：将稀疏的专家示范击球点扩展为密集的交互体积，解决专家数据稀疏问题。
- 完成从"模仿者"到"击球手"的跨越。

---

## 💡 核心贡献

1. **框架**：提出四阶段 Imitation-to-Interaction 渐进式 RL 框架，系统性解耦全身协调与精准击打。
2. **状态表示**：设计 TTH / THS / TRS 三元时序状态，使策略能够对多样化击球需求进行目标条件规划。
3. **流形扩展**：克服专家数据稀疏瓶颈，将离散示范点泛化至连续交互空间。
4. **零样本迁移**：首次实现拟人羽毛球技能（提球、吊球等）从仿真到真实人形机器人的零样本 Sim-to-Real 迁移。
