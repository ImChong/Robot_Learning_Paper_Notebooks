---
layout: paper
title: "Real-World Humanoid Locomotion with Reinforcement Learning"
category: "高影响力精选 High Impact Selection"
subcategory: "Locomotion Classics"
zhname: "首个 RL 真实世界人形行走（Berkeley · Causal Transformer）"
---

# Real-World Humanoid Locomotion with Reinforcement Learning
**首个 RL 真实世界人形行走（Berkeley · Causal Transformer）**

> 📅 阅读日期: 2026-05-16
>
> 🏷️ 板块: 03_High_Impact_Selection / Locomotion Classics
>
> 🧭 状态: 首版基础摘要（含 mermaid 流程图）；后续可结合 v2 附录消融与 Digit URDF 二读补表。

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [2303.03381](https://arxiv.org/abs/2303.03381) |
| **HTML** | [arxiv.org/html/2303.03381v2](https://arxiv.org/html/2303.03381v2) |
| **PDF** | [arxiv.org/pdf/2303.03381](https://arxiv.org/pdf/2303.03381) |
| **项目主页** | [learning-humanoid-locomotion.github.io](https://learning-humanoid-locomotion.github.io/) |
| **进阶版** | [humanoid-transformer.github.io](https://humanoid-transformer.github.io/)（CoRL/Workshop 版） |
| **作者** | Ilija Radosavovic*, Tete Xiao*, Bike Zhang*, Trevor Darrell, Jitendra Malik, Koushil Sreenath |
| **机构** | UC Berkeley（Hybrid Robotics / BAIR） |
| **发布时间** | 2023-03 arXiv，2024 Science Robotics |
| **机器人** | Agility Robotics **Digit**（1.6 m，45 kg，30 DoF，含被动膝弹簧 + 四杆联动） |
| **相关代码** | 原文未开源；同组后续开源参见 [HybridRobotics/isaac_berkeley_humanoid](https://github.com/HybridRobotics/isaac_berkeley_humanoid) 与 [Berkeley-Humanoid-Lite](https://github.com/HybridRobotics/Berkeley-Humanoid-Lite) |

---

## 🎯 一句话总结

把"观测-动作历史"塞进一个 **1.4 M 参数的因果 Transformer**，用 Isaac Gym 上千并行环境 + 大规模 PPO 训练完，**零样本部署到全尺寸 Digit 上**直接在户外稳走——首次证明纯学习方案能取代传统模型预测控制（MPC）做真实人形 locomotion，且能"在上下文里"自适应地形变化与脚被卡的紧急情况。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **POMDP** | Partially Observable MDP | 真机只有噪声观测，建模为部分可观 MDP |
| **PPO** | Proximal Policy Optimization | 大规模并行 RL 训练算法 |
| **DR** | Domain Randomization | 域随机化，把摩擦/质量/延迟/地形抖一抖 |
| **MPC** | Model Predictive Control | 经典控制 baseline（Agility 出厂控制器） |
| **TCN / LSTM** | 时序网络 baseline | 论文对照的两类历史编码网络 |
| **In-context Adaptation** | 上下文内适应 | 不更新权重，靠 prompt（历史轨迹）改行为 |

---

## ❓ 论文要解决什么问题？

传统人形机器人控制（Atlas 后空翻那类）由 MPC、轨迹优化和手调状态机搭出来：**性能极致但极度依赖工程师的调参与精细动力学建模**，每换地形/负载/扰动就要重新写一套，难以泛化。

学习方法在四足（ANYmal / Cassie）和小型双足上已经验证可行，但**全尺寸人形机器人**（含浮动基座、被动关节、闭运动链）一直缺一个"端到端 RL 直接上真机"的里程碑。本文要回答：

> **能不能用一个简单、通用的因果 Transformer，从仿真直接零样本迁移到 Digit，让它在户外多地形上稳定行走？**

挑战：

1. **POMDP**：真机看不到接触力 / 摩擦 / 质量；
2. **动力学闭链**：Digit 被动膝弹簧 + 四杆联动让 Isaac Gym 自带刚体不能直接模拟；
3. **Sim-to-Real**：仿真域与真实域之间的"现实差距"必须靠某种自适应吸收；
4. **可扩展性**：希望架构未来能加视觉/语言 token，所以选 Transformer 路线而非 LSTM/TCN。

---

## 🔧 方法详解

### 1. 控制器架构：Causal Transformer over (o, a) tokens

策略 $\pi_o$ 输入是长度 $l=16$ 的历史窗口

$$\{o_t, a _ {t-1}, o _ {t-1}, a _ {t-2}, \ldots, o _ {t-l+1}, a _ {t-l}\}$$

每一对 (obs, act) 由一个 MLP（hidden=[512,512]）压成 192 维 token，加正弦位置编码后送入 **4 层、4 头、MLP-ratio 2.0 的因果 Transformer**；最后接 MLP（[256,128]）回归下一步动作 $a_t$。**总参数仅 1.4 M**，但足以承载 in-context adaptation。

> 💡 关键直觉：transformer 把"期望状态 vs 实际状态"的历史误差作为隐式"系统辨识"信号——慢变量（摩擦、负载）从长时段误差里推断，快变量（突发外力、脚卡住）从近段尖峰里捕捉。

### 2. 训练范式：教师 → 学生两阶段

| 阶段 | 输入 | 网络 | 监督 |
|------|------|------|------|
| ① 教师 $\pi_s$ | 完整 privileged 状态 $s_t$ | MLP [512,512,256,128] | PPO 直接最大化奖励 |
| ② 学生 $\pi_o$ | 仅可观测历史 $(o _ {t-l+1:t}, a _ {t-l:t-1})$ | Causal Transformer | **PPO + 教师 imitation 联合损失** |

联合训练比"纯模仿 + 后调"更优——消融显示对足卡场景尤其关键，因为纯模仿学不到教师没见过的恢复策略。

### 3. 仿真与并行：Isaac Gym + 4×A100

- 4 张 A100，并行数千个域随机环境，**一天采样量 ~10 B steps**；
- 地形：平地、粗糙平地、平滑坡（最高 10% 坡度）；
- DR：地面摩擦、电机增益、刚体质量、关节阻尼、动作延迟、外力扰动；
- 命令：每 10 s 重采线速度 $v_x, v_y$ 与偏航角速度 $\omega_z$；
- **闭运动链建模**：对 Digit 膝-踝-趾的四杆联动 + 弹簧用自实现的耦合约束补丁，使刚体仿真可跑（论文方法节给了一段专门的"closed-chain simulation"）。

### 4. 零样本部署到 Digit

- 训完先在 Agility 提供的高保真闭环仿真中过一轮再上真机；
- 真机端 50 Hz 关节位置指令，PD 转矩；
- 没有任何状态估计器、动力学模型、参考步态、IK 求解——**完全 end-to-end**。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SIM["🧪 Isaac Gym (4×A100, 1000s env)"]
        S1["域随机化<br/>摩擦/质量/延迟/外力"]
        S2["地形池<br/>平地·粗糙·坡"]
        S3["闭运动链建模<br/>Digit 弹簧+四杆"]
    end

    subgraph TEACHER["👨‍🏫 教师阶段"]
        T1["MLP 策略 π_s<br/>输入: 特权状态 s_t"]
        T2["PPO 最大化<br/>r = v 跟踪 + 能耗 + 稳态"]
        T1 --> T2
    end

    subgraph STUDENT["🎓 学生阶段（部署目标）"]
        ST1["历史窗口 l=16<br/>{o,a} 配对 token"]
        ST2["MLP 嵌入 (512,512)<br/>+ 正弦位置编码"]
        ST3["Causal Transformer<br/>4 层 · 4 头 · 192 dim"]
        ST4["动作头 MLP<br/>(256,128) → a_t"]
        ST1 --> ST2 --> ST3 --> ST4
    end

    subgraph LOSS["⚖️ 联合损失"]
        L1["PPO 强化目标"]
        L2["教师模仿 BC"]
        L1 -.联合.-> L2
    end

    subgraph REAL["🤖 Digit 真机（户外零样本）"]
        R1["50 Hz 关节目标<br/>PD → 扭矩"]
        R2["户外 / 草地 / 步道 / 坡"]
        R3["扰动: 推力 / 瑜伽球 / 负载"]
        R4["紧急: 脚卡台阶<br/>→ 抬腿更高更快（涌现）"]
    end

    SIM --> TEACHER
    SIM --> STUDENT
    TEACHER --> LOSS
    STUDENT --> LOSS
    LOSS -->|sim-to-real<br/>zero-shot| REAL

    style SIM fill:#e8f4fd,stroke:#1f78b4
    style TEACHER fill:#fdebd0,stroke:#e67e22
    style STUDENT fill:#f4ecf7,stroke:#8e44ad
    style LOSS fill:#fce4ec,stroke:#c2185b
    style REAL fill:#e8f8e8,stroke:#27ae60
</div>

---

## 📊 实验亮点（节选）

- **户外稳定**：在加州校园里连续一周的草地 / 砖地 / 跑道 / 湿地步道部署，**零 fall**；
- **抗扰动**：被木棍推、瑜伽球砸、绳索拉拽均不倒（除非用极大力拉）；
- **携带负载**：背包 / 手提袋 / 垃圾袋皆能持续行走，**主动调摆臂幅度**抵消负载；
- **超 MPC**：在 Agility 高保真仿真中，**坡 / 阶梯 / 不稳定地板** 三场景全面胜过厂家 MPC，尤其阶梯（厂家会因 foot trapping 自动关机，本文策略能抬腿恢复）；
- **涌现行为**：
  - 摆臂与腿对侧同步（contralateral arm swing），**没有奖励强制**；
  - 下坡时自动改"小碎步贴地走"，回平地恢复正常步幅；
  - 撞到台阶后下一步主动抬高；
- **架构消融**：Transformer > LSTM > TCN > MLP；context 越长越稳；teacher imitation + PPO 联合最佳。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|------|------|
| **学习取代经典控制** | 首次在全尺寸人形上证明纯 RL 可优于精心调优的厂家 MPC（在难地形上） |
| **Transformer 进入运动控制** | 把 GPT 风格的因果序列建模搬到 50 Hz 实时控制，为 H13 "Humanoid Locomotion as Next Token Prediction" 与后续 NVIDIA SONIC 等大规模 motion tracking 铺路 |
| **In-context adaptation** | 不再依赖显式的 system ID / RMA / privileged encoder，靠 prompt（历史）自适应 |
| **Sim-to-Real 模板** | Isaac Gym + 域随机化 + 教师-学生蒸馏，成为后续 ExBody / OmniH2O / HOVER 全部跟随的范式 |

---

## 🎤 面试参考

**Q：为什么用 Transformer 而不是 LSTM / TCN？**  
A：Transformer 显式访问完整历史，without recency bias；多头注意力允许"长时摩擦特征"和"短时碰撞 spike"并行抽取；同时为后续接入视觉 / 语言 token 留下了 scaling 路径（论文消融里 Transformer 在 context 长度增加时性能持续提升，LSTM 早早饱和）。

**Q：本文如何处理 Digit 的闭运动链与被动弹簧？**  
A：Isaac Gym 原生只支持开链刚体，作者在 sim 端实现了一段自定义耦合约束补丁，把膝-踝-趾的四杆联动与弹簧近似为对应关节扭矩-位置约束；这部分在方法节"closed-chain simulation"独立成段，后续 ExBody / HOVER 等基本都跟随这一处理方式。

**Q：教师 + 学生两阶段相比 RMA 有什么不同？**  
A：RMA 的学生回归一个显式 "z = system embedding"；本文学生直接吃历史 token、用 Transformer in-context 适应，**不解耦显式 latent**，更接近 GPT 路线。优势是更简单 / 更可扩展；缺点是可解释性弱，需要靠神经元可视化（论文专门分析了对应地形/卡脚的神经元激活）。

**Q：为什么涌现摆臂？**  
A：奖励中只惩罚关节加速度与能耗，没有强制摆臂；但摆臂对躯干角动量补偿是能量最小化解，**RL 自然收敛到生物力学已发现的"对侧摆臂"模式**。背负重物在手时摆臂被抑制，机器人改用其他关节补偿——印证了能量最小化才是真正驱动力。

**Q：和 H13（Next Token Prediction）的区别？**  
A：H12 把控制建模为"用历史预测下一个动作"，但训练目标仍是 RL；H13 进一步把它统一成 GPT 风格的多模态 token 预测，混训 MoCap / YouTube / MPC / 实测多类数据，**完全离线监督学**，无需 RL，落地旧金山街头零样本步行。可以把 H13 看作 H12 范式的"大数据 +多源数据"扩展。

---

## 🔗 相关阅读

- [Humanoid Locomotion as Next Token Prediction (H13, 2402.19469)](https://arxiv.org/abs/2402.19469)：同组后续，把 RL 训练替换为多源轨迹 token 预测
- [Learning Quadrupedal Locomotion over Challenging Terrain (Lee et al., 2020)](https://doi.org/10.1126/scirobotics.abc5986)：ANYmal 教师-学生蒸馏开山作（同 03 文件夹有笔记）
- [RMA: Rapid Motor Adaptation (Kumar et al., 2021)](https://arxiv.org/abs/2107.04034)：基于显式 system embedding 的另一条 sim-to-real 路线
- [HybridRobotics/Berkeley-Humanoid-Lite](https://github.com/HybridRobotics/Berkeley-Humanoid-Lite)：同实验室的低成本开源人形复现栈
- 项目主页与视频集：[learning-humanoid-locomotion.github.io](https://learning-humanoid-locomotion.github.io/)

---

## 📎 附录：与该笔记并行的"高影响力精选"笔记

| 子模块 | 已完成 | 待补 |
|------|------|------|
| 全身控制核心 | Expressive WBC / ExBody2 / HOVER | HugWBC / SONIC / UH-1 |
| 遥操作与模仿学习 | OmniH2O / HOMIE | HumanPlus / EgoMimic / iDP3 |
| Locomotion 经典 | **Real-World Humanoid Loco (本文 · H12)** / Learning Quadrupedal Loco (Lee 2020) | Next Token Prediction (H13) / Humanoid Parkour (H14) / 15-min S2R (H15) / ECO (H16) |
| Sim-to-Real & Foundation | GR00T N1 | ANYmal Agile Motor Skills / ASAP / BFM |
| 仿真平台与工具 | ProtoMotions3 / Isaac Lab | Humanoid-Gym / HumanoidBench / BEHAVIOR Robot Suite |
