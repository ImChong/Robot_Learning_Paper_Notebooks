---
layout: paper
title: "Delay Randomization Widens the Delay Margin of Learned Humanoid Motion Trackers"
zhname: "延迟随机化拓宽学习型人形动作跟踪器的延迟裕度"
category: "Sim-to-Real"
arxiv: "2610.32277"
---

# Delay Randomization Widens the Delay Margin of Learned Humanoid Motion Trackers
**量一量学出来的人形动作跟踪器到底能扛多大的指令延迟：不随机化延迟时只能扛 20–30 ms，过了就从 67% 存活一步掉到 15%；训练时把延迟随机到 0–50 ms，裕度拓宽到 50–70 ms，且等量加训的对照组没有这个效果——前提是先确认 sim-to-sim 的评测环境本身没搭错**

> 📅 总结日期: 2026-11-04
>
> 🏷️ 板块: 10 Sim-to-Real · 指令延迟 · 延迟随机化 · sim-to-sim 评测 · 动作跟踪（BeyondMimic 配方）· mjlab / MuJoCo · 24 关节人形
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → **10_Sim-to-Real**）· 上游 awesome-humanoid-robot-learning Sim-to-Real 章节中尚无笔记的最新论文（2026-10-23，PROGRESS #1190）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.32277](https://arxiv.org/abs/2610.32277) |
| HTML | [arxiv.org/html/2610.32277](https://arxiv.org/html/2610.32277) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.32277v1) |
| **发布时间** | 2026-10-23（arXiv v1，cs.RO） |
| 项目页 | 没有单独的项目页 |
| 源码 | ⏳ 未开源：论文与 arXiv 页面都没有给出代码链接（截至 2026-11-04 也没有搜到）。下文的时序图是**按论文第 3 节整理的评测流程**，不是从源码读出来的调用链 |
| 依赖的开源组件 | [mjlab](https://github.com/mujocolab/mjlab)（MuJoCo-Warp 训练）、[BeyondMimic](https://github.com/HybridRobotics/whole_body_tracking)（跟踪配方）、[GVHMR](https://github.com/zju3dv/GVHMR) + [GMR](https://github.com/YanjieZe/GMR)（视频 → 参考动作）、MuJoCo（CPU 评测） |

**作者**：Shaoqin Li、Yi Sun（The City College of New York，电气工程系）

---

## 🎯 一句话总结

学出来的人形控制器一般在 GPU 仿真里训、再在另一个仿真器里做 sim-to-sim 检查，但检查通常是「同步」的——不加指令延迟。作者用 BeyondMimic 配方在 mjlab 里为一台 24 关节、28.9 kg 的人形训练了 5 段视频动作的跟踪策略，导出 ONNX 放进**独立的 CPU MuJoCo 评测器**，以 10 ms 为步长加恒定指令延迟测存活率。不随机化延迟的策略：**延迟裕度只有 20–30 ms，40 ms 时平均存活 15%**；训练时每 1 s 随机抽 0–50 ms 延迟：**裕度 50–70 ms，40 ms 时存活 95%**。同样多加 3000 次迭代但不加延迟的对照组没有改善，说明收益来自随机化本身。代价是跟踪误差略升（4 段动作多 0.02–0.06 rad），最剧烈的那段对其他扰动反而更脆。另一个发现：最初看到的 sim-to-sim「差距」全是评测器搭错了（没有地面、步长 2 ms 而不是 5 ms），不是物理引擎的差别。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Delay margin | 延迟裕度 | 本文定义：10 ms 网格上、该延迟及所有更小延迟都至少一半回合存活的最大延迟 |
| PD | Proportional-Derivative | 关节 PD 位置控制，200 Hz（5 ms 物理步） |
| PPO | Proximal Policy Optimization | 训练算法，4096 个并行机器人 |
| ONNX | Open Neural Network Exchange | 导出的策略格式，评测器在 CPU 上跑 |
| GVHMR | Gravity-View Human Motion Recovery | 从单目视频恢复世界坐标人体动作 |
| GMR | General Motion Retargeting | 人体动作重定向到人形 |

---

## ❓ 这篇论文要解决什么问题？

- **真机控制回路总有延迟**（策略输出到电机响应），经典控制里延迟会吃掉相位裕度、让稳定回路失稳；学习型控制器通常靠训练时随机一点延迟处理，人形行走框架常用 0–20 ms。
- **但很少有人报告**：一个学出来的动作跟踪器到底能扛多少延迟？随机化延迟到底换来了什么？
- **还有一个前置问题**：sim-to-sim 检查本身靠不靠谱——评测器和训练模型对不上，看到的「差距」可能是假的。

---

## 🔧 方法拆解

### 1. 机器人与策略（第 3 节）

- 24 个驱动关节（每条腿 6、腰 2、每条手臂 5），28.9 kg；关节 PD 200 Hz，力矩上限取自厂商部署描述。
- 策略 50 Hz，输出相对默认站姿的关节目标偏移；观测 135 维：参考关节角与速度、躯干相对参考的位置朝向、基座线速度角速度、关节角与速度、上一步动作。
- 训练随机化：观测噪声、初始姿态速度、每 1–3 s 推一把、躯干质心偏移、编码器偏置 ±0.01 rad、脚底摩擦 0.3–1.2。

### 2. 延迟模型

每个机器人抽整数滞后 $L\sim U\{0,\dots,10\}$ 个物理步（0–50 ms），每 200 个物理步（1 s）按各自的相位重抽，复位后到第一次重抽前为 0。在第 $k$ 步发出的目标在第 $k+L$ 步才生效。

### 3. 参考动作（表 1）

5 段单目视频经 GVHMR → GMR 重定向，按视频原始帧率：网球发球（10.4 s）、两段舞蹈（26.4 s / 8.7 s，固定相机）、空拳（15.0 s）、街舞（15.0 s，移动相机）。

### 4. 训练日程：三组对照

先训**基线策略**（无延迟 3000 次迭代；网球 12,998 次），再从同一个检查点分两组各续训 3000 次、各 3 个种子：

- **control**：同样的任务，不加延迟——用来排除「只是多训了」；
- **delay**：加延迟随机化。

### 5. 独立评测器与压力测试

ONNX 策略跑在纯 CPU MuJoCo 里；评测器用 MuJoCo 的 spec API 从机器人描述重建物理模型，复刻训练模型的地面、接触参数、5 ms 步长、求解器与 implicit-fast 积分器，重写观测、训练随机化和终止条件（躯干朝向 / 高度或末端高度偏离超过 0.25 m）。跑完整段动作算存活。压力测试在训练随机化之上加：恒定延迟 $d\in\{0,10,\dots,80\}$ ms（每档 20 回合）、3 倍推力、摩擦 0.15、PD 增益 ±20%、2 kg 负载、去掉基座速度观测。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph REF["🎬 参考动作"]
        V["5 段单目视频<br/>网球 · 三段舞 · 空拳"]
        G["GVHMR → GMR<br/>重定向到 24 关节人形"]
        V --> G
    end

    subgraph TRAIN["🏋️ mjlab 训练（BeyondMimic 配方，PPO × 4096）"]
        B["基线策略<br/>无延迟 3000 次迭代"]
        C["control 组<br/>续训 3000 次 · 无延迟 · 3 种子"]
        D["delay 组<br/>续训 3000 次 · L ~ U{0..10} 步<br/>0–50 ms，每 1 s 重抽 · 3 种子"]
        B --> C
        B --> D
    end

    subgraph HARNESS["🧪 独立 CPU MuJoCo 评测器"]
        CHK["先验证评测器<br/>地面 · 5 ms 步长 · 接触 · 积分器<br/>第一帧观测误差 1e-5"]
        SW["恒定延迟扫描<br/>0, 10, …, 80 ms · 每档 20 回合"]
        PERT["其他扰动<br/>推力 ×3 · 摩擦 0.15 · Kp ±20%<br/>2 kg 负载 · 去掉基座速度"]
        CHK --> SW
        CHK --> PERT
    end

    G --> B
    C -->|ONNX| CHK
    D -->|ONNX| CHK
    SW --> R1["control：裕度 20–30 ms<br/>40 ms 存活 15%"]
    SW --> R2["delay：裕度 50–70 ms<br/>40 ms 存活 95%"]
    PERT --> R3["代价：误差 +0.02–0.06 rad<br/>最剧烈的动作对扰动更脆"]
    style D fill:#d8ecff,stroke:#3b7dd8
    style R2 fill:#d8ecff,stroke:#3b7dd8
    style CHK fill:#fde7c8,stroke:#d08a2c
</div>

> 读法：蓝色是论文要验证的东西——延迟随机化把裕度从 20–30 ms 推到 50–70 ms；橙色是前提——评测器必须先和训练模型对上，否则看到的「sim-to-sim 差距」可能只是评测器搭错了。control 组和 delay 组从同一个检查点出发、多训同样的次数，所以差别只能归到延迟随机化上。

---

## ⏱️ 评测时序图（按论文第 3 节整理；源码未放出）

<div class="mermaid">
sequenceDiagram
    autonumber
    participant H as 评测器（CPU MuJoCo）
    participant P as ONNX 策略（50 Hz）
    participant Q as 延迟缓冲区
    participant M as 物理（PD 200 Hz，5 ms）
    Note over H: 从机器人描述用 spec API 重建模型：<br/>补地面、5 ms 步长、implicit-fast 积分器
    H->>H: 采样训练随机化 + 本回合恒定延迟 d
    loop 每个策略步（20 ms = 4 个物理步）
        H->>P: 135 维观测（参考 + 本体 + 上一步动作）
        P-->>Q: 关节目标偏移 a_t（第 k 步发出）
        loop 4 个物理步
            Q->>M: 取出第 k − d/5ms 步发出的目标
            M->>M: PD 力矩（截到力矩上限）→ 积分一步
        end
        M-->>H: 新状态
        H->>H: 终止检查：躯干朝向 / 高度、末端高度偏离 > 0.25 m
    end
    H->>H: 跑完整段动作记一次存活，每档延迟 20 回合
</div>

---

## 🚶 具体实例

### 例 1：40 ms 延迟相当于几个控制步

物理步 5 ms，策略步 20 ms（50 Hz）。40 ms 延迟 = 8 个物理步 = **2 个策略步**：策略此刻发出的目标，要等它再看两次观测之后才真正作用到电机上。训练时 $L$ 最多 10 个物理步（50 ms），即两个半策略步。

### 例 2：「40 ms 时平均存活 15% / 95%」怎么来的（表 3）

每档 20 回合，control 组五段动作的平均存活回合数是 4.7、7.7、0.3、2.3、0，平均 $15.0/5=3.0$ 回合，即 $3/20=15\%$；delay 组是 18.3、20、18.7、19.3、18.7，平均 $95.0/5=19.0$，即 $95\%$。两组的种子区间（control 最多 9，delay 最少 15）在每段动作上都不重叠。

### 例 3：裕度为什么是「悬崖」

control 组平均存活：30 ms 67%、40 ms 15%、50 ms 1%、60 ms 起 0%——在一个 10 ms 的格子里从三分之二掉到 15%。所以**只在一个延迟值上做检查很容易错过**：0–10 ms 下几乎所有策略都能过。delay 组则是 40 ms 95%、50 ms 86%、60 ms 69%、70 ms 37%，缓慢下降。

---

## 📊 关键结果

**表 2：评测器的逐项消融（网球策略，名义回放的关节误差 rad）**

| 保留原始描述里的哪项设置 | 关节误差 |
|---|---|
| 无（与训练等价的模型） | 0.577 |
| 接触维度 / 求解器迭代 / 接触优先级 | 0.576 / 0.577 / 0.577 |
| 脚底摩擦 | 0.582 |
| 步长 2 ms | 1.719 |
| 没有地面 | 6.969 |

**表 4：代价（control / delay，三种子平均）**

| 动作 | 名义误差 (rad) | 推力 ×3 | 摩擦 0.15 | 2 kg | 去掉基座速度 |
|---|---|---|---|---|---|
| 网球发球 | 0.60 / 0.65 | 63 / 63 | 23 / 48 | 98 / 100 | 40 / 30 |
| 舞蹈（家中） | 0.61 / 0.63 | 90 / 85 | 73 / 77 | 100 / 100 | 73 / 70 |
| 空拳 | 0.69 / 0.75 | 42 / 35 | 13 / 20 | 97 / 100 | 82 / 83 |
| 街舞 | 0.59 / 0.61 | 25 / 33 | 73 / 83 | 100 / 98 | 63 / 65 |
| 舞蹈（工作室） | 1.88 / 1.82 | 10 / 3 | 57 / 52 | 98 / 82 | 37 / 5 |

- **裕度**：control 组 4 段动作 30 ms、工作室舞蹈 20 ms，三个种子完全一致；delay 组 15 个策略里 10 个 60 ms、4 个 70 ms，14 个超过训练用的 50 ms 上限。
- **加训不管用**：基线策略在 40 ms 时也只活 0–2 / 20，和 control 组一样；加训唯一可见的作用是让最难的工作室舞蹈误差从 2.27 降到 1.88 rad、裕度从 10 ms 升到 20 ms。
- **换物理引擎**：Isaac Lab（PhysX）里用 BeyondMimic 代码训的舞蹈策略呈现同样规律：无延迟版名义 29/30、40 ms 时 0/20；延迟版 40 ms 时 15/20，但名义只剩 17/30（作者未调查）。
- **代价**：摩擦 0.15 下网球的存活翻倍（23% → 48%）；但最剧烈的工作室舞蹈在 2 kg 负载（98% → 82%）、推力（10% → 3%）、去掉基座速度（37% → 5%）下都更差，作者推测是控制余量被延迟容忍占掉了，未验证。

---

## 💡 核心贡献

1. **验证过的评测协议**：评测器先对齐训练模型再用；逐项消融说明最初的 sim-to-sim 差距来自「没有地面 + 步长 2 ms」，不是物理引擎。
2. **学习型跟踪器的延迟裕度**：5 段动作 × 3 种子，以 10 ms 分辨率量出有 / 无延迟随机化的存活曲线。
3. **受控归因**：等量加训的 control 组把「随机化延迟」和「多训了」分开；PhysX 训练的策略给出同样的失败和同样的补救。

---

## 🤖 对人形机器人领域的意义

- **0–20 ms 的常用随机化范围可能没用**：不随机化的跟踪器本来就能扛 20–30 ms，随机化范围要按真机测到的指令延迟设、并留余量，才会有收益。
- **把延迟裕度当成标准的 sim-to-sim 指标**：评测器只需加一个延迟缓冲区，测量很便宜；和 [Humanoid-Gym](../../03_High_Impact_Selection/Humanoid-Gym_Zero-Shot_Sim2Real_Transfer/Humanoid-Gym_Zero-Shot_Sim2Real_Transfer.html) 把 sim-to-sim 当成上真机前的一步、[PolySim](../PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato/PolySim__Bridging_the_Sim-to-Real_Gap_for_Humanoid_Control_via_Multi-Simulato.html) 跨多个仿真器训练是一个方向的补充。
- **先查评测器，再谈 gap**：「没有地面」「步长不同」这种低级错误就能造成 4.6–8.9 rad 的发散，很容易被误认为是引擎差异。
- **局限**（论文第 5 节）：全部在仿真里、理想 PD 执行器；一台机器人、5 段第三方视频动作；三个种子从同一检查点续训，低估了从头重训的方差；存活是二值指标、每档 20 回合；评测时延迟整回合恒定，比训练更严；还没测真机延迟、没上真机。没试更宽的范围、课程或把延迟作为观测输入。

---

## 🎤 面试参考

1. **为什么需要 control 组？** delay 组比基线多训了 3000 次迭代，不加对照就无法排除「多训就更鲁棒」；control 组同样多训但不加延迟，40 ms 时没有任何改善。
2. **延迟裕度怎么定义？** 10 ms 网格上至少一半回合存活、且所有更小延迟也满足的最大延迟——要求单调，避免偶然的高点。
3. **为什么只在一个延迟值上检查不够？** 存活率是悬崖式下降，30 → 40 ms 就从 67% 到 15%，单点检查容易落在悬崖两侧之一。
4. **sim-to-sim 差距怎么排查？** 一次只把一项设置恢复成训练值（表 2），看误差怎么变；本文发现地面和步长占了全部差距，接触参数、摩擦的影响不到 0.006 rad。
5. **延迟随机化的代价？** 名义跟踪变松一点；动作越剧烈，余量被占得越多，对其他扰动可能更脆。

---

## 🔗 相关阅读

- [BeyondMimic](../../01_Foundational_RL/BeyondMimic/BeyondMimic.html)——本文使用的跟踪配方
- [GMR: Retargeting Matters](../../02_Motion_Retargeting/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking/Retargeting_Matters__General_Motion_Retargeting_for_Humanoid_Motion_Tracking.html)——视频动作到人形的重定向
- [Domain Randomization](../../01_Foundational_RL/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World/Domain_Randomization_for_Transferring_Deep_Neural_Networks_from_Simulation_to_the_Real_World.html)——随机化思路的起点
- [ASAP](../../03_High_Impact_Selection/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills/ASAP_Aligning_Simulation_and_Real-World_Physics_for_Agile_Humanoid_Skills.html)——用真机数据修正残差动力学，另一条缩小 sim-to-real 差距的路
- [Learning Sim-to-Real Humanoid Locomotion in 15 Minutes](../../03_High_Impact_Selection/Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes/Learning_Sim-to-Real_Humanoid_Locomotion_in_15_Minutes.html)——文中引用的 0–20 ms 延迟随机化范围的来源之一
- Reinforcement Learning with Random Delays（[arXiv 2010.02966](https://arxiv.org/abs/2010.02966)）——把随机延迟写进决策过程
