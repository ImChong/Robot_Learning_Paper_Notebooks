---
layout: paper
title: "Learning Agile and Dynamic Motor Skills for Legged Robots"
category: "高影响力精选 High Impact Selection"
subcategory: "Sim-to-Real & Foundation Model"
zhname: "ANYmal 敏捷运动技能学习（sim-to-real RL 奠基作）"
---

# Learning Agile and Dynamic Motor Skills for Legged Robots
**足式机器人敏捷动态运动技能学习**

> 📅 阅读日期: 2026-05-17
>
> 🏷️ 板块: 03_High_Impact_Selection / Sim-to-Real & Foundation Model
>
> 🧭 状态: 首版基础摘要（含 mermaid 流程图）；后续可补 actuator network 训练细节与 reward shaping 全表。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [1901.08652](https://arxiv.org/abs/1901.08652) |
| **HTML** | [arxiv.org/html/1901.08652](https://arxiv.org/html/1901.08652) |
| **PDF** | [arxiv.org/pdf/1901.08652](https://arxiv.org/pdf/1901.08652) |
| **期刊版** | Science Robotics 4(26): eaau5872 |
| **DOI** | [10.1126/scirobotics.aau5872](https://doi.org/10.1126/scirobotics.aau5872) |
| **发布时间** | 2019-01-24 (arXiv) |
| **源码 / 数据** | [junja94/anymal_science_robotics_supplementary](https://github.com/junja94/anymal_science_robotics_supplementary)（含 ANYmal 任务环境与训练好的策略） |
| **同组后续生态** | [leggedrobotics/legged_gym](https://github.com/leggedrobotics/legged_gym)、[leggedrobotics/RSLGym](https://github.com/leggedrobotics/RSLGym)（基于 RaiSim） |
| **作者** | Jemin Hwangbo, Joonho Lee, Alexey Dosovitskiy, Dario Bellicoso, Vassilios Tsounis, Vladlen Koltun, Marco Hutter |
| **机构** | ETH Zurich (RSL) · Intel Intelligent Systems Lab · KAIST |
| **发表时间** | 2019-01 arXiv，2019-01 Science Robotics |
| **机器人** | ANYmal（四足，12 个 ANYdrive 电机，串联弹性驱动 SEA） |

---

## 🎯 一句话总结

把"电机 + 减速箱 + 控制器 + 通信延迟"全部用一个 **LSTM 致动器网络（actuator network）** 离线辨识，然后在 RaiSim 里以神经网络代替传统刚体力学做高速 RL 训练，最终把策略**零样本**搬到 ANYmal 上，让它能跟随速度指令、奔跑（最高 1.5 m/s，比厂家 MPC 快 25%）以及**从任意倒地姿态自主翻身爬起**——首次系统性证明 sim-to-real RL 可以在真实四足上稳定落地。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|------|------|------|
| **SEA** | Series Elastic Actuator | 串联弹性致动器，ANYdrive 的核心结构 |
| **MLP** | Multi-Layer Perceptron | 策略网络主体 |
| **LSTM** | Long Short-Term Memory | actuator network 用的循环单元 |
| **TRPO** | Trust Region Policy Optimization | 论文采用的 RL 算法（同期 PPO 前身） |
| **MPC** | Model Predictive Control | 比较的传统控制基线（ANYmal 出厂 WBC） |
| **RaiSim** | Recursive AI Simulation | 第一作者团队自研的快速刚体仿真器 |
| **DR** | Domain Randomization | 域随机化 |

---

## ❓ 论文要解决什么问题？

四足机器人传统控制（WBC + MPC + 优化）需要精确的接触模型、动力学参数与人工调参，**复杂动作（高速跑、跌倒恢复）几乎无法手写完成**。RL 在仿真里可以学会很多东西，但搬到真机时会遇到：

1. **执行器建模差距**：SEA 的扭矩-位置-速度关系与电流环、温度、缆线弹性都强耦合，刚体仿真里假设的"理想电机"完全不准；
2. **接触/碰撞建模差距**：足端与地面接触的刚度、摩擦、滑移行为复杂；
3. **采样效率**：需要数千万步才能训出鲁棒策略，传统仿真慢到不可接受；
4. **零样本迁移**：直接部署常常一站起来就摔。

> **核心问题：能不能把"难建模的真实电机"变成神经网络，再用快速 RaiSim 仿真完成大规模 RL，从而做到一次训练直接上真机？**

---

## 🔧 方法详解

### 1. 关键创新：致动器网络（Actuator Network）

ANYmal 的每个 ANYdrive 模块上有一个低层 PI 控制器，闭环带宽与摩擦/弹性高度非线性。论文做的事情是：

- 在真机上**只采集"关节位置误差 / 关节速度 / 历史"→ 关节扭矩"的数据**（用现成的 WBC 控制器在地面上随便走采集即可，约几十分钟）；
- 训练一个 **3 层 MLP（每层 32 单元，softsign 激活）**（文中也对比了 LSTM 版本）作为 actuator network，输入最近 3 个时刻的 (位置误差, 速度) 三元组，输出当前时刻应施加的扭矩；
- 把这个网络嵌入 RaiSim：每个仿真步先由策略网络给出**关节位置目标**，actuator net 根据当前误差给出**扭矩**，再交给刚体引擎积分。

> 💡 这相当于把"电机 + 控制器 + 通信延迟 + 摩擦"等所有难以建模的部分一次性用数据驱动的方式黑盒化，**无需识别每一个物理参数**——这是 sim-to-real 真正"打通"的关键拼图。

### 2. 仿真：RaiSim + 大规模并行

- 自研 [RaiSim](https://raisim.com/) 物理仿真器，对 ANYmal 单步仿真比 ODE / Bullet 快 4–10×；
- 用 TRPO 训练，单台工作站 ~4 小时即可学会跟踪指令；
- 域随机化主要打在地面摩擦、推力扰动、初始姿态上，**电机部分不再随机化**（已被 actuator net 捕捉）。

### 3. 任务设置

| 任务 | 状态 / 奖励要点 |
|------|-----------------|
| **指令跟踪（Locomotion）** | 命令 = 期望线速度 $v_x, v_y$ 与偏航 $\omega_z$；奖励 = 速度跟踪 + 能耗 + 姿态稳定 + 关节加速度惩罚 |
| **高速奔跑** | 在指令跟踪基础上去掉低速优先项，让策略最大化前进速度，最终硬件实测 1.5 m/s |
| **跌倒恢复（Recovery）** | 状态 = 全身姿态 + 接触；奖励 = 朝目标姿态收敛 + 站起后维持平衡；包括"四脚朝天"等极端初始姿态 |

### 4. 策略网络

非常简单的 MLP（[256, 128]，tanh 激活），输入 ~120 维状态（包括 IMU、关节、命令、历史动作），输出 12 维关节位置目标。**没有用到任何手写步态、足端轨迹生成或 IK**——全部由网络自己涌现。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DATA["📦 真机数据采集"]
        D1["WBC 走行 30 min<br/>记录 (q_err, q_dot, τ)"]
    end

    subgraph ACT["⚙️ Actuator Network 离线训练"]
        A1["输入: 最近 3 步<br/>(q_err_t, q_dot_t)"]
        A2["MLP / LSTM<br/>3×32 softsign"]
        A3["输出: 估计扭矩 τ̂"]
        A1 --> A2 --> A3
    end

    subgraph SIM["🧪 RaiSim 大规模并行 RL"]
        S1["策略 MLP [256,128]<br/>输入: 状态 + 命令"]
        S2["输出: 关节位置目标 q*"]
        S3["Actuator Net 给 τ̂"]
        S4["刚体动力学 + 接触<br/>(RaiSim, ~10× 快)"]
        S1 --> S2 --> S3 --> S4 --> S1
    end

    subgraph TRAIN["🎯 TRPO 训练目标"]
        L1["速度跟踪 / 能耗 / 稳定<br/>(Locomotion)"]
        L2["跌倒姿态 → 站立<br/>(Recovery)"]
    end

    subgraph REAL["🤖 ANYmal 真机零样本部署"]
        R1["指令跟踪误差 ↓ 25%"]
        R2["速度极限 1.5 m/s"]
        R3["四脚朝天自主翻身"]
    end

    DATA --> ACT
    ACT -->|嵌入仿真| SIM
    SIM --> TRAIN
    TRAIN -->|sim-to-real<br/>zero-shot| REAL

    style DATA fill:#e8f4fd,stroke:#1f78b4
    style ACT fill:#fdebd0,stroke:#e67e22
    style SIM fill:#f4ecf7,stroke:#8e44ad
    style TRAIN fill:#fce4ec,stroke:#c2185b
    style REAL fill:#e8f8e8,stroke:#27ae60
</div>

---

## 📊 实验亮点（节选）

- **指令跟踪精度**：相比 ANYmal 出厂 MPC 控制器，平均跟踪误差降低 ~25%，机械功耗降低 ~30%；
- **峰值速度**：硬件实测 1.5 m/s，是出厂控制器的 ~1.6×（同电池、同电机）；
- **跌倒恢复**：从随机倒地姿态（包括四脚朝天）站起成功率 **97/100**，平均 2.9 s 站起完成；
- **训练效率**：单台 8 核工作站，RaiSim 约 11 万次环境调用 / 秒，**4 小时学会 locomotion**；
- **消融**：去掉 actuator network 改用解析电机模型 → 真机直接发散；用 actuator network 但不做随机扰动 → 仅个别地面失败；二者结合最稳。

---

## 🤖 对人形机器人领域的意义

| 方向 | 意义 |
|------|------|
| **执行器建模新范式** | "数据驱动 actuator network" 方案被几乎所有后续工作沿用（Atlas / Cassie / Digit / 宇树 H1 都做了类似的电机辨识网络） |
| **sim-to-real 工程模板** | 高速仿真 + actuator net + 简单域随机化的组合，是后来 Berkeley、ETH、CMU、NVIDIA 团队的"教科书"路线 |
| **Recovery 行为** | 让"摔倒不可怕"成为部署标配，是后续人形（HumanPlus、Berkeley Humanoid）"敢上街"的前提 |
| **RaiSim 与 RSLGym** | 催生了一整套 ETH-RSL 的开源仿真训练栈，最终演化为 legged_gym → Isaac Lab 系列 |

---

## 🎤 面试参考

**Q：actuator network 为什么必须是数据驱动的，不能用电机解析模型？**  
A：SEA 的扭矩-位置-速度关系受到弹簧弹性、谐波减速器摩擦、电流环 PID、温度、通信延迟等多种因素叠加影响，解析建模时每一项都要单独识别且耦合严重；而真机用 WBC 走 30 分钟就能把这种"输入历史 → 输出扭矩"的映射学出来，**精度比手工模型高得多且对老化鲁棒**。

**Q：为什么训练得这么快（4 小时）？**  
A：(1) RaiSim 比通用刚体仿真器快约一个数量级；(2) actuator network 替代了精细电机仿真，每步前向只是个 3 层 MLP，几乎不增加成本；(3) TRPO 在 ANYmal 这个动作维度（12）下样本效率本来就高；(4) 任务奖励 well-shaped。

**Q：和后来 Lee 2020「Learning Quadrupedal Locomotion over Challenging Terrain」（同 03 文件夹）的区别？**  
A：Hwangbo 2019（本文）解决的是"平地敏捷 + 跌倒恢复"，关键创新是 actuator network；Lee 2020 解决的是"复杂地形（楼梯/沼泽/苔藓）", 关键创新是"特权教师 → 本体感觉学生"的两阶段蒸馏与地形 curriculum。可以认为 Lee 2020 在 Hwangbo 2019 打下的电机基座上做地形泛化。

**Q：能不能直接迁移到人形？**  
A：思路完全可迁移——ExBody / OmniH2O / HOVER 等都隐式或显式地做了 actuator network 或 motor delay net；但人形的浮动基与闭运动链（如 Digit 膝部弹簧）需要在仿真侧额外补丁（参见同模块 Real-World Humanoid Locomotion 笔记的"closed-chain simulation"段落）。

---

## 🔗 相关阅读

- [Learning Quadrupedal Locomotion over Challenging Terrain (Lee 2020, Sci. Robotics)](https://doi.org/10.1126/scirobotics.abc5986)：同组后续地形版（同 03 文件夹有笔记）
- [Real-World Humanoid Locomotion with RL (Radosavovic 2023)](https://arxiv.org/abs/2303.03381)：把同套 sim-to-real 模板搬到全尺寸人形 Digit（同 03 文件夹有笔记）
- [RaiSim](https://raisim.com/) 与 [legged_gym](https://github.com/leggedrobotics/legged_gym) / [RSLGym](https://github.com/leggedrobotics/RSLGym)：作者团队自研仿真与训练框架
- [supplementary 仓库](https://github.com/junja94/anymal_science_robotics_supplementary)：含本文用到的 ANYmal 任务、训练好的策略与 actuator network 权重

---

## 📎 附录：高影响力精选 · 进度小结

| 子模块 | 已完成 | 待补 |
|------|------|------|
| 全身控制核心 | Expressive WBC / ExBody2 / HOVER | HugWBC / SONIC / UH-1 |
| 遥操作与模仿学习 | OmniH2O / HOMIE | HumanPlus / EgoMimic / iDP3 |
| Locomotion 经典 | Real-World Humanoid Loco / Learning Quadrupedal Loco (Lee 2020) | Next Token Prediction (H13) / Humanoid Parkour (H14) / 15-min S2R (H15) / ECO (H16) |
| Sim-to-Real & Foundation | GR00T N1 / **ANYmal Agile Motor Skills (本文 · H17)** | ASAP / BFM |
| 仿真平台与工具 | ProtoMotions3 / Isaac Lab | Humanoid-Gym / HumanoidBench / BEHAVIOR Robot Suite |
