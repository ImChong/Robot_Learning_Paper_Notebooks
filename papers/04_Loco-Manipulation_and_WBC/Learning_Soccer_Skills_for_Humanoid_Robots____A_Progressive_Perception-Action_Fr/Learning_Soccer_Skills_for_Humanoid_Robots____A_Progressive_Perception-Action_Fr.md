---
layout: paper
paper_order: 44
title: "Learning Soccer Skills for Humanoid Robots: A Progressive Perception-Action Framework"
zhname: "面向仿人机器人足球技能的渐进式感知-动作学习框架"
category: "Loco-Manipulation and WBC"
---

# Learning Soccer Skills for Humanoid Robots: A Progressive Perception-Action Framework
**面向仿人机器人足球技能的渐进式感知-动作学习框架**

> 📅 阅读日期: 2026-05-05
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 运动技能 · 视觉-动作集成

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.05310](https://arxiv.org/abs/2602.05310) |
| HTML | [在线阅读](https://arxiv.org/html/2602.05310) |
| PDF | [下载](https://arxiv.org/pdf/2602.05310) |
| 项目主页 | [soccer-humanoid.github.io](https://soccer-humanoid.github.io/) |
| **发布时间** | 2026-02-05 (arXiv) |
| 源码 | [TeleHuman/HumanoidSoccer](https://github.com/TeleHuman/HumanoidSoccer)（已开源 · CC BY-NC 4.0；部分 PAiD 组件仍标注 TODO） |
| 提交日期 | 2026-02-05 |

**作者**：Jipeng Kong, Xinzhe Liu, Yuhang Lin, Jinrui Han, Sören Schwertfeger, Chenjia Bai, Xuelong Li

**机构**：上海科技大学（ShanghaiTech University）、中国电信 TeleAI 人工智能研究院

---

## 🎯 一句话总结

PAiD 把"踢球"这件事拆成 **运动跟踪 → 感知融合 → 物理对齐迁移** 三个递进阶段，先在干净的运动学世界里学会拟人的踢球姿态，再加入第一视角感知泛化到任意球位与滚动球，最后通过接触动力学对齐和感知噪声建模完成 Unitree G1 真机部署，实现 **91.3% 踢球成功率**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| PAiD | Perception-Action integrated Decision-making | 本文方法名，感知-动作一体化决策框架 |
| WBC | Whole-Body Control | 全身控制，腿部支撑+腰部转体+腿部摆动协同 |
| RL | Reinforcement Learning | 强化学习 |
| Sim-to-Real | Simulation to Real-world | 仿真训练后零样本迁移到真机 |
| MoCap | Motion Capture | 人类动作捕捉数据 |

---

## ❓ 论文要解决什么问题？

人形机器人踢球需要 **感知 + 全身爆发性动作** 的紧密耦合，但现有方案存在两类问题：

1. **模块化流水线（perception → planning → control）**：模块间接口的微小误差会沿链路放大，导致瞄不准、踢空。
2. **端到端方案**：把"看球-定位-平衡-踢中"塞进同一个 RL 目标，训练时多目标互相干扰，奖励冲突使策略难以收敛到既稳又准的解。

此外，踢球涉及短时高冲击的接触动力学，仿真和真机之间的 gap 比一般行走任务大得多，传统域随机化容易失效。

---

## 🔧 方法拆解：PAiD 的三段递进训练

整体思路：**先把基础打稳，再逐步加入扰动维度**——每一阶段只引入一个新的难点，避免多目标互相打架。

### 阶段 1：运动跟踪（Motion Skill Acquisition）

- 把多种**人类踢球动捕**重定向到 G1 的 29-DoF 关节空间
- 训练一个**统一跟踪策略**，使用**自适应采样**：哪些关节相位跟得差就多采，加快收敛
- 此阶段 **没有感知**：策略输入只有本体感觉 + 参考帧，专注学好"怎么踢得像人"
- 输出：一个具备多种拟人踢球姿态库的基础策略

### 阶段 2：感知-动作融合（Perception-Guided Kicking）

- 在阶段 1 基础上接入**第一视角（egocentric）相机或检测**得到的球位/球速
- 用任务专属奖励（命中率、球速、击球方向）做微调
- 训练目标：**对随机化的静止球与滚动球都能瞄准**
- 此时基础踢球技能已经稳定，感知模块只需要学习"如何把视觉信号映射成踢球时机/方向的微调"，避免和底层平衡相互干扰

### 阶段 3：物理感知 Sim-to-Real（Physics-Aware Sim-to-Real）

- 用真机测量校准**接触动力学**（球-脚摩擦、恢复系数等），让仿真接触行为更贴近现实
- 引入**物理引导的观测噪声**模型（相机时延、检测抖动、IMU 漂移），让策略在训练时就见过类似的真实噪声
- 零样本迁移到 Unitree G1，无需真机微调

### 整体结构（mermaid）

<div class="mermaid">
flowchart TB
    subgraph S1["阶段 1: 运动跟踪 (无感知)"]
        A1["人类踢球 MoCap"] --> A2["重定向到 G1 (29 DoF)"]
        A2 --> A3["统一跟踪策略<br/>obs = 本体 + 参考帧"]
        A3 --> A4["自适应采样<br/>难相位多采"]
        A4 --> A5["拟人踢球姿态库"]
    end

    subgraph S2["阶段 2: 感知融合 (静/动球泛化)"]
        A5 --> B1["接入 egocentric 视觉<br/>(球位 / 球速)"]
        B1 --> B2["任务奖励<br/>命中率 + 方向 + 球速"]
        B2 --> B3["随机化球位与滚动速度"]
        B3 --> B4["感知-动作融合策略"]
    end

    subgraph S3["阶段 3: 物理感知 Sim-to-Real"]
        B4 --> C1["真机测量接触动力学<br/>摩擦 / 恢复系数"]
        C1 --> C2["对齐仿真接触模型"]
        C2 --> C3["物理引导观测噪声<br/>(时延 / 检测抖动)"]
        C3 --> C4["零样本部署"]
    end

    C4 --> D["Unitree G1 真机<br/>91.3% 踢球成功率"]

    style S1 fill:#e8f4fd,stroke:#1f78b4
    style S2 fill:#fdebd0,stroke:#e67e22
    style S3 fill:#e8f8e8,stroke:#27ae60
    style D fill:#fceae8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **PAiD 渐进式架构**：把"运动学技能 / 感知融合 / 物理迁移"解耦为三阶段训练，避免端到端 RL 的奖励冲突。
2. **拟人踢球技能库**：在阶段 1 通过运动跟踪 + 自适应采样，让策略具备多样、自然的人类踢球风格。
3. **轻量感知-动作集成**：阶段 2 在已稳定的运动技能上"叠加"感知模块，仅微调即可泛化到随机静止/滚动球。
4. **物理感知 Sim-to-Real**：通过接触动力学校准 + 物理引导噪声模型，显著缩小高冲击任务的仿真-真实差距。
5. **真机验证**：在 Unitree G1 上达到 91.3% 踢球成功率，且在不同灯光、室内/室外、外部扰动下保持稳定。

---

## 📊 实验亮点

- **平台**：Unitree G1（29-DoF 全尺寸人形机器人）
- **成功率**：91.3% 踢球成功率（随机球位 + 滚动球 + 扰动）
- **泛化范围**：静止球 / 缓慢滚动球 / 快速滚动球
- **环境鲁棒性**：室内、室外、光照变化、外部物理推搡
- **拟人度**：动作风格保留了人类踢球的爆发性与自然摆腿轨迹

---

## 🤖 对人形机器人领域的意义

| 影响方向 | 说明 |
|---------|------|
| **感知-动作集成** | 三阶段训练范式可推广到其他需要视觉引导的高动态任务（投球、接物等） |
| **接触密集任务的 Sim-to-Real** | 接触动力学校准 + 物理引导噪声为短时高冲击任务提供了可借鉴的迁移流程 |
| **运动技能积累** | 阶段 1 训练的"无感知运动库"可作为后续多任务策略的复用基础 |
| **机器人足球** | 朝着人形机器人参加 RoboCup 等真实足球赛事更进了一步 |

---

## 🔬 源码解读

> 官方实现已开源：[TeleHuman/HumanoidSoccer](https://github.com/TeleHuman/HumanoidSoccer)（CC BY-NC 4.0，禁止商用）。README 明确标注其为本文（arXiv 2602.05310）官方代码，基于 **Isaac Lab + RSL-RL** 训练栈构建。

**目录结构**

| 路径 | 内容 |
|---|---|
| `source/whole_body_tracking/soccer/` | 核心任务与环境定义（观测、奖励、踢球任务逻辑） |
| `scripts/rsl_rl/` | 训练 / 推理入口（`train.py`、`play.py`） |
| `exp/` | MuJoCo sim2sim 回放与评估代码 |
| `motions/` | 已公开的踢球动捕数据集与标签 |
| `ckp/` | 策略 checkpoint 存放目录 |
| `shell/` | 训练/评估辅助脚本 |

**实现要点**

- 代码组织直接对应论文的渐进式三阶段流水线：`soccer/` 下的任务环境实现"运动跟踪 → 感知融合 → sim-to-real"的观测/奖励配置，`scripts/rsl_rl` 提供基于 RSL-RL 的 PPO 训练与播放入口，`exp/` 用 MuJoCo 做 sim2sim 验证以检查零样本迁移行为。
- 动捕数据（`motions/`）随仓库一并释出，可直接复现阶段 1 的拟人踢球技能库；Isaac Lab 的任务注册机制让"运动跟踪策略"与"踢球任务策略"以不同 task 配置切换。
- **注意**：当前为**部分释出**。README 的 TODO 列表显示 PAiD 专属组件——PAiD 训练代码、PAiD 动捕数据集、PAiD checkpoint 与对应 sim2sim、PAiD 域随机化代码——尚未提交，因此暂无法端到端复现论文最终的 91.3% 成功率配置，但基础运动跟踪与环境框架已可运行。

---

## 🎤 面试参考

**Q：为什么不直接端到端训练？**
A：踢球同时要求平衡、感知、瞄准、爆发力，多目标在 RL 中容易互相干扰。PAiD 通过三阶段训练，每阶段只新增一个挑战维度，避免奖励冲突，使每一层技能在加入下一层之前都已经稳定。

**Q：为什么 Sim-to-Real 需要专门处理？**
A：踢球瞬间的高冲击让接触参数（摩擦、弹性恢复）极大影响球的运动轨迹，普通域随机化覆盖不到这些关键物理量。论文通过真机测量直接校准仿真接触模型，并加入物理意义明确的观测噪声，使迁移更稳。

**Q：PAiD 与一般"分层控制"的区别？**
A：分层控制是**架构上**分高低两层 policy；PAiD 是**训练流程上**的分阶段，最终得到的依然是一个统一的端到端策略，但训练课程经过了精心设计的递进。
