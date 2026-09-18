---
layout: paper
paper_order: 8
title: "Expressive Whole-Body Control for Humanoid Robots"
category: "High Impact Selection"
subcategory: "Whole-Body Control Core"
---

# Expressive Whole-Body Control for Humanoid Robots
**人形机器人的表达性全身控制**

> 📅 阅读日期: -
>
> 🏷️ 板块: Whole-Body Control / Humanoid

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2402.16796](https://arxiv.org/abs/2402.16796) |
| **PDF** | [下载](https://arxiv.org/pdf/2402.16796) |
| **作者** | Xuxin Cheng, Yandong Ji, Junming Chen, Ruihan Yang, Ge Yang, Xiaolong Wang |
| **机构** | UC San Diego |
| **发布时间** | 2024-02-26 (arXiv), RSS 2024 |
| **项目主页** | [expressive-humanoid.github.io](https://expressive-humanoid.github.io/) |
| **代码** | [GitHub 🌟](https://github.com/chengxuxin/expressive-humanoid) |

---

## 🎯 一句话总结

让人形机器人在**保持行走稳定性**的同时，用上半身做出**丰富的表达性动作**（挥手、舞蹈等）——全身控制的开山之作，开源，工程参考价值极高。

---
## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **DoF** | Degrees of Freedom | 自由度：机器人可独立运动的轴数 |
| **RL** | Reinforcement Learning | 强化学习：通过奖惩反馈训练策略 |
| **MoCap** | Motion Capture | 动作捕捉：记录人体运动数据的技术 |
| **Sim-to-Real** | Simulation to Reality | 仿真到真实迁移：仿真训练迁移到真实机器人 |
| **RSS** | Robotics Science and Systems | 机器人学顶级会议，本论文发表场所 |


## 🔍 核心问题与动机

**问题：** 如何让人形机器人在完成运动任务（走路）的同时，还能控制上半身做出有意义的姿态和动作？

**挑战：**
- 上下半身动作会相互干扰（上半身摆动影响行走平衡）
- 人类动作捕捉数据与机器人运动学不匹配（自由度不同）
- 实现 sim-to-real 迁移

**动机：** 实用的人形机器人不只需要"走路"，还需要与人交互——挥手、指引、舞蹈、搬运等，这要求全身协调控制。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TD
  subgraph data["参考动作"]
    Mo["AMASS 等人体 MoCap"]
    Rt["Motion Retargeting<br/>→ 机器人关节参考"]
    Mo --> Rt
  end
  subgraph ctrl["分层全身控制"]
    Up["上层：参考轨迹 / 目标姿态"]
    Lo["下层 RL：跟踪 + 行走稳定性"]
    Rt --> Up
    Up --> Lo
  end
  subgraph sim2real["Sim-to-Real"]
    DR["Isaac Gym 训练 + Domain Randomization"]
    Real["Unitree H1 等真机部署"]
    Lo --> DR
    DR --> Real
  end
</div>

---

## 🛠️ 方法详解

### 整体框架

**两级控制结构：**
1. **上层：** 接收参考动作（来自人类动作捕捉），生成全身目标姿态
2. **下层（RL策略）：** 在物理约束下执行目标姿态，同时保持行走平衡

### 关键技术

**1. 运动重定向（Motion Retargeting）**
- 将人类 mocap 数据映射到机器人关节空间
- 处理自由度不匹配问题（人类 ~73 DOF → 机器人 ~19 DOF）

**2. 分层 RL 训练**
- 下半身策略：专注行走稳定
- 上半身策略：跟踪参考动作
- 联合训练实现全身协调

**3. Sim-to-Real**
- 域随机化（Domain Randomization）
- 在 Isaac Gym 中训练，部署到真实机器人

---

## 📐 关键公式

**奖励函数（全身控制）：**

$$r = r _ {\text{tracking}} + r _ {\text{locomotion}} + r _ {\text{regularization}}$$

- $r _ {\text{tracking}}$：上半身关节角度跟踪误差
- $r _ {\text{locomotion}}$：行走速度、姿态稳定性
- $r _ {\text{regularization}}$：动作平滑、能量消耗惩罚

---

## 🔧 工程复现要点

- **训练框架：** Isaac Gym（GPU 并行仿真）
- **机器人：** Unitree H1
- **开源代码：** 完整训练和部署代码公开
- **关键超参：** 上下半身奖励权重需要仔细调节

---

## 🚶 具体实例：机器人边走边挥手

用一个"边走边挥右手"的简化场景把 ExBody 的数据流程走通。

### 输入

- **上层参考动作**：来自 AMASS 数据集的一段人类动作片段
  - 上半身：右手从低位抬到肩部高度、来回挥动
  - 下半身：以 0.8 m/s 前进

### 第 1 步：Motion Retargeting

人类骨架约 73 DoF（有锁骨、脊柱多段、多指手），H1 约 19 DoF。重定向过程大致是：

```
for each frame f in human_motion:
    q_human = f.joint_angles           # 73 DoF
    q_robot = min ||FK_robot(q) - FK_human(q_human)||²
                   # 在机器人可达空间里找姿态最接近的解
                   # 受关节限位、自碰撞约束
    reference_motion.append(q_robot)
```

输出：一段 19 DoF 的参考轨迹 $\hat{q}_t$（仅上半身部分用于 tracking）。

### 第 2 步：RL 策略推断

观测向量典型组成：

| 分量 | 维度示意 | 说明 |
|------|---------|------|
| 基座姿态 / 角速度 | ~6 | IMU |
| 关节位置 / 速度 | ~38 | 19 关节 × 2 |
| 上半身参考 $\hat{q}^{upper}_t$ | ~9 | 作为条件输入 |
| 行走速度指令 | 2–3 | $v_x, v_y, \omega_z$ |

网络输出 19 维关节目标，PD 控制器给出关节力矩。

### 第 3 步：奖励求值（某一帧）

假设当前帧：躯干俯仰 3°、右手相比参考滞后 0.2 rad、前进速度 0.75 m/s。

- $r _ {tracking}$：右手误差项 $\exp(-k \cdot 0.2^2)$ ≈ 较高值
- $r _ {locomotion}$：速度误差 $0.05$ m/s、姿态平稳 → 正贡献
- $r _ {regularization}$：动作相对上一步的变化、能耗项 → 小幅负贡献

汇总奖励用于 PPO 更新。

### 第 4 步：Sim-to-Real 部署

- Isaac Gym 中用 4096 并行环境训练 ≈ 数小时收敛
- Domain randomization（参见 `Domain_Randomization` 笔记）：摩擦 / 质量 / 延迟
- 部署到 H1 真机：策略直接跑，无需额外微调

---

## 💡 核心贡献

1. **首次**在真实人形机器人上实现行走 + 丰富上半身表达的联合控制
2. **开源**完整训练流程，社区影响力大
3. 提出运动重定向方法，将人类 mocap 迁移到机器人

---

## 🤔 局限性

- 上半身动作受机器人自由度限制，表达能力有上限
- 复杂地形下全身协调性下降
- mocap 数据质量直接影响效果

---

## 🤖 ExBody 在学习路线中的位置

- **上承**：DeepMimic / AMP 等 motion tracking 思路——把"精确模仿"从角色动画拉到真机。
- **下启**：ExBody2、HOVER、H2O 等后续"全身 + 表达"工作。
- **横向关联**：
  - 与 `PHC` 同属"tracking 方向"，但 PHC 聚焦仿真角色的稳健模仿、ExBody 聚焦真机部署与表达性。
  - 与 `LCP`、`Domain_Randomization` 共同构成 sim-to-real 工具箱。
- **工程意义**：提供了一条清晰的"人类动捕 → 机器人动作"端到端配方，且代码开源，是社区复现的基准线。

---

## ❓ 面试高频问题

**Q1: ExBody 和纯行走控制有什么区别？**
A: 纯行走只优化下半身稳定性，ExBody 同时追踪上半身参考动作，奖励函数包含跟踪误差项，需要协调上下半身不相互干扰。

**Q2: 运动重定向怎么处理自由度不匹配？**
A: 通过优化问题将人类姿态投影到机器人可达关节空间，最小化关节角度差异，同时满足运动学约束。

**Q3: 为什么这篇论文影响力大？**
A: 开源 + 真机验证 + 首次做到表达性全身控制，后续 ExBody2、HOVER 等都以此为基础。

**Q4: 上下半身为什么不会互相"打架"？**
A: 奖励函数里明确区分了 tracking（主要针对上半身关节）和 locomotion（主要针对基座速度 / 姿态），两边在网络共享骨干但在奖励层面解耦。regularization 项进一步抑制上半身动作对基座的扰动。

**Q5: 为什么 ExBody 用 mocap 数据而不是直接手工设计参考动作？**
A: mocap 数据包含自然的时序节奏、关节协调和过渡，手工设计容易出现僵硬、不自然的姿态转换；同时 AMASS 等大规模人体动作库让动作库规模化成为可能。

**Q6: 直接迁移到不同形状的机器人（比如 G1、Optimus）可行吗？**
A: 核心方法（重定向 + RL tracking）通用，但要重新做：
1. 针对新机器人骨架的重定向优化
2. 针对新机器人动力学参数的 domain randomization 范围
3. 可能需要针对关节限位调整奖励权重
后续工作如 HOVER 提出了更统一的框架来降低跨机器人迁移成本。

**Q7: ExBody 有没有视觉感知？**
A: 原版 ExBody 使用 proprioception + 参考动作作为输入，不依赖视觉。后续 VIGOR、HERO 等工作把视觉引入类似框架中做 loco-manipulation。

---

## 💬 讨论记录

### 2026-04-18：ExBody 的"表达性"具体是什么？

不是纯粹关节追踪精度高，而是：
1. **行走时上半身能做有语义的动作**（挥手、指向、舞蹈），而非僵硬直臂；
2. **动作过渡自然**，不会为了保持稳定就突然"僵住"；
3. **可用人类动捕数据直接驱动**——这让内容制作门槛大幅降低。

这三条共同决定了为什么它比"把 AMP 迁到真机"更有传播力。

---

## 📎 附录

### A. 与 ExBody2 / HOVER 的对比

| 维度 | ExBody | ExBody2 | HOVER |
|------|--------|---------|-------|
| 年份 | 2024 RSS | 2024 | 2024 |
| 表达层级 | 关节跟踪 | 关节 + 末端位姿 | 多目标（关节/末端/轨迹）统一框架 |
| 控制精度 | 中 | 高（加入末端目标） | 最高 |
| 泛化能力 | 中 | 中 | 强（one-policy-fits-all） |

### B. 复现清单

- 机器人 URDF + 关节限位（H1 官方）
- AMASS 或自采 mocap 数据
- 重定向工具（PHC / RFC 等社区实现）
- Isaac Gym + rl_games / skrl 等训练脚手架
- Domain randomization 配置（可借鉴 `Domain_Randomization` 笔记附录 B 的范围）
