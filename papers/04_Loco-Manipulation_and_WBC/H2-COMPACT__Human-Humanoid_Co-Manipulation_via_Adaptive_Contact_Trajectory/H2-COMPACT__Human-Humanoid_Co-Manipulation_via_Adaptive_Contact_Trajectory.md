---
layout: paper
paper_order: 136
title: "H2-COMPACT: Human-Humanoid Co-Manipulation via Adaptive Contact Trajectory Policies"
zhname: "H2-COMPACT：基于自适应接触轨迹策略的人-人形协同搬运"
category: "Loco-Manipulation and WBC"
---

# H2-COMPACT: Human-Humanoid Co-Manipulation via Adaptive Contact Trajectory Policies
**只靠手腕上的力/力矩传感器"读懂"人的意图，让 Unitree G1 与人合力抬运长条重物——上层行为克隆把力信号翻译成速度指令，下层强化学习把速度指令变成负载下的稳定步态**

> 📅 阅读日期: 2026-09-07
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 人机协同搬运 · 触觉意图推断 · 分层控制
>
> 🔁 推进轨: 模块轮转（09_State_Estimation → 10 → 11 → 12 → 13 → 14 → **04_Loco-Manipulation_and_WBC**；09–14 已无未整理的上游论文，循环回到 04）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2505.17627](https://arxiv.org/abs/2505.17627) |
| HTML | [在线阅读](https://arxiv.org/html/2505.17627v1) |
| PDF | [下载](https://arxiv.org/pdf/2505.17627) |
| 项目主页 | [h2compact.github.io/h2compact](https://h2compact.github.io/h2compact/) |
| 源码 | 🌟 [github.com/bethalageetachandraraju/h2_compact](https://github.com/bethalageetachandraraju/h2_compact) |
| 数据 | [Google Drive](https://drive.google.com/drive/folders/1I-Ic7cmqhOst9rerkO2ywVcCCxWG3Odd) |
| **发布时间** | 2025-05-23 (arXiv) |

**作者**：Geeta Chandra Raju Bethala, Hao Huang, Niraj Pudasaini, Abdullah Mohamed Ali, Shuaihang Yuan, Congcong Wen, Anthony Tzes, Yi Fang
**机构**：纽约大学（NYU / NYU Abu Dhabi，Embodied AI 方向）
**实机**：Unitree **G1** 人形机器人 · 双手腕 6 轴力/力矩（F/T）传感器（ATI）
**仿真/验证**：Isaac Gym 训练 → MuJoCo + 真机迁移

---

## 🎯 一句话总结

两个人一起抬一根长桌/长杆时，走在后面的人往往看不见前方，只靠"手上传来的力"感知前面人想往哪走、走多快——H2-COMPACT 让人形机器人扮演这个"盲跟随者"：机器人**不依赖动捕、不依赖视觉**，仅凭**双手腕力/力矩传感器**读出人施加的力，用**上层行为克隆网络**把力信号翻译成"整体平面速度指令（twist）"，再用**下层强化学习步态策略**把速度指令转成"负载下仍然稳定的关节轨迹"。最终在完成时间、轨迹偏差、速度同步性、跟随者出力等指标上，达到**与"蒙眼人类跟随者"相当**的协同搬运水平。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Co-Manipulation | Cooperative Manipulation | 协同搬运/操作：人与机器人合力搬同一物体 |
| Haptic | — | 触觉/力觉：通过接触力感知意图 |
| F/T Sensor | Force/Torque Sensor | 力/力矩传感器，装在手腕处测接触力旋量 |
| BC | Behavior Cloning | 行为克隆：监督式模仿人类示范 |
| RL | Reinforcement Learning | 强化学习：训练负载下的鲁棒步态 |
| Twist | — | 平面速度指令（线速度 + 偏航角速度），即 `/cmd_vel` |
| Leader / Follower | — | 领导者（看得见路的人）/ 跟随者（此处由机器人扮演） |

---

## ❓ 论文要解决什么问题？

**场景**：人与人形机器人**合抬一件较长/较重的物体**（如长桌、长杆），机器人当"跟随者"。难点在于——机器人怎么知道人要往哪走、走多快？

现有做法的短板：

1. **依赖动捕/外部定位**：需要 MoCap 或场景标定，出了实验室就用不了；
2. **依赖视觉读意图**：视线易被搬运物遮挡、光照/遮挡鲁棒性差，"盲跟随"场景根本看不到领导者；
3. **上层意图 → 下层步态脱节**：即使推断出速度指令，人形在**负载 + 变摩擦**下也容易失稳。

**核心问题**：

> 能否**只用手腕接触力**这一种廉价、随处可用的信号，既准确推断人的运动意图，又能在负重行走时保持稳定，从而实现"开箱即用"的人-人形协同搬运？

---

## 🔧 方法拆解：分层的"触觉意图 → 稳定步态"

### 上层 · 触觉意图推断（Behavior Cloning）

- 输入：**双手腕 6 轴 F/T 传感器**读到的接触力旋量（力 + 力矩）时序；
- 网络：一个**轻量 Transformer 行为克隆网络**（`transformer.py` / 随机版 `stoch_transformer.py`），从人类协同搬运示范数据中学到"力 → 意图"的映射；
- 输出：**整体平面速度指令 twist**（前进/侧移线速度 + 偏航角速度），即机器人该往哪走、走多快。

直觉：人往前推 → 机器人前进；人施加侧向力/力矩 → 机器人转向或侧移。把"人手上的力"当作沟通带宽，机器人无需看见人也能跟随。

### 下层 · 负载自适应步态（Reinforcement Learning）

- 输入：上层给出的 twist 指令 + 本体感知；
- 策略：在 **Isaac Gym** 中用 RL 训练的步行策略，把高层速度指令映射为**负载下稳定的关节轨迹**；
- **自适应/鲁棒性**：训练时对**负载重量（0–3 kg）与地面摩擦**做域随机化，使策略在不同重物、不同地面下都能稳住重心、跟准速度。

### 闭环

`人施力 → 手腕 F/T → BC 推断 twist → RL 步态执行 → 机器人移动带动重物 → 人感到阻力/牵引并调整施力 →（回到起点）`，形成一个**以接触力为通信媒介**的人机协同闭环。

---

## 🧭 方法整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph HUMAN["🧑 人类领导者（看得见路）"]
        H["施加接触力<br/>推 / 拉 / 侧向 / 扭转"]
    end

    subgraph SENSE["🖐️ 触觉感知"]
        FT["双手腕 6 轴 F/T 传感器<br/>力 + 力矩时序"]
    end

    subgraph UPPER["① 上层：触觉意图推断 (BC)"]
        BC["轻量 Transformer 行为克隆<br/>从人类协同搬运示范学习"]
        TW["输出平面速度指令 twist<br/>(vx, vy, ωyaw) → /cmd_vel"]
        BC --> TW
    end

    subgraph LOWER["② 下层：负载自适应步态 (RL)"]
        RL["Isaac Gym 训练的步行策略<br/>域随机化: 负载 0–3kg + 摩擦"]
        JT["负载下稳定关节轨迹"]
        RL --> JT
    end

    subgraph ROBOT["🤖 Unitree G1 人形（盲跟随者）"]
        MOVE["跟随人的速度移动<br/>合力搬运长条重物"]
    end

    H -->|接触力| FT
    FT --> BC
    TW --> RL
    JT --> MOVE
    MOVE -. 牵引/阻力反馈 .-> H

    style UPPER fill:#e8f4fd,stroke:#1f78b4
    style LOWER fill:#fff7e0,stroke:#d4a017
    style ROBOT fill:#e8f8e8,stroke:#27ae60
    style SENSE fill:#f3e8ff,stroke:#8e44ad
</div>

---

## 🧑‍💻 源码运行时序图（mermaid）

> 基于开源仓库 [bethalageetachandraraju/h2_compact](https://github.com/bethalageetachandraraju/h2_compact) 的脚本流程整理：数据采集 → 训练意图模型 → 部署推断 → 驱动 G1（ROS 话题串联）。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant Dev as 👩‍💻 开发者
    participant Cam as camera_publish.py / ati_zero_offset.py
    participant Bag as ROSBag + sync_save_bag.py
    participant Train as main.sh → transformer.py / dataset.py
    participant CKPT as checkpoints/
    participant Infer as test.sh → demo.py（意图推断）
    participant Ros as ROS 话题 /cmd_vel
    participant G1 as g1_walk.py → Unitree G1

    Note over Dev,Bag: 阶段一 · 数据采集与对齐
    Dev->>Cam: 启动相机与 ATI 力传感器采集
    Cam->>Bag: 录制多模态流（力/力矩 + 图像）
    Bag->>Bag: 按时间戳同步，导出 extracted_data/

    Note over Dev,CKPT: 阶段二 · 训练触觉意图模型（BC）
    Dev->>Train: bash main.sh
    Train->>Bag: dataset.py 读取同步后的力-意图样本
    Train->>Train: Transformer 行为克隆：力旋量 → twist
    Train->>CKPT: 保存权重

    Note over Dev,G1: 阶段三 · 实机部署（在线闭环）
    Dev->>Infer: bash test.sh
    Infer->>CKPT: 加载训练好的意图模型
    loop 实时控制回路
        Infer->>Infer: 读手腕 F/T → 推断平面速度
        Infer->>Ros: 发布 twist 到 /cmd_vel
        G1->>Ros: 订阅 /cmd_vel
        Ros-->>G1: 速度指令
        G1->>G1: RL 步态策略 → 负载下稳定关节轨迹
        G1-->>Infer: 机器人移动带动重物（人感知牵引并调整施力）
    end
</div>

---

## 💡 核心贡献

1. **纯触觉的意图推断**：只用**双手腕 F/T 传感器**即可推断人类运动意图，**摆脱动捕/视觉依赖**，天然适配"看不见领导者"的盲跟随协同搬运；
2. **分层 BC + RL 架构**：上层轻量 Transformer 行为克隆负责"力 → 速度"语义翻译，下层 RL 步态负责"速度 → 稳定关节轨迹"，职责清晰、易于分别训练；
3. **负载自适应步态**：训练时对负载（0–3 kg）与摩擦做域随机化，使人形在负重、变地面下仍能跟准速度、稳住重心；
4. **实机验证 + 人类基线对照**：在 Unitree G1 上完成人机协同抬运，完成时间、轨迹偏差、速度同步性、跟随者出力等指标**与蒙眼人类跟随者相当**；
5. **完整开源**：🌟 代码、视频与数据均公开，含从数据采集、训练到 G1 部署的完整流水线（ROS + Isaac Gym）。

---

## 📊 关键设定与结果

| 维度 | 值 |
|---|---|
| 机器人 | Unitree G1 人形（担任协同搬运的"跟随者"） |
| 感知 | 双手腕 6 轴力/力矩传感器（ATI），无动捕、无视觉意图 |
| 上层模型 | 轻量 Transformer 行为克隆：F/T → 平面速度 twist |
| 下层策略 | Isaac Gym RL 步态，域随机化负载 0–3 kg + 摩擦 |
| 验证链路 | Isaac Gym 训练 → MuJoCo → 真机 |
| 任务 | 人-机合力搬运较长/较重物体，机器人盲跟随 |
| 对照基线 | **蒙眼人类跟随者**（blindfolded human-follower） |
| 结论 | 完成时间 / 轨迹偏差 / 速度同步性 / 跟随者出力 与人类基线相当 |

> 📌 各指标精确数值、消融与不同负载/路径下的表现请以 arXiv v1 PDF 与项目主页为准。

---

## 🤖 对 Loco-Manipulation 领域的意义

| 方向 | 含义 |
|---|---|
| **触觉作为通信带宽** | 证明"手上的力"足以承载人机协同的意图沟通，为无标定、开箱即用的协作打开思路 |
| **意图 ↔ 步态解耦** | BC 管语义、RL 管稳定，两层分工降低了"高动态负载行走 + 意图理解"的联合训练难度 |
| **盲跟随的现实价值** | 面向搬家、抬长物、灾后搬运等视线受阻场景，比依赖视觉/动捕的方案更接地气 |
| **可复现的完整栈** | 开源数据+训练+部署脚本，便于社区在其他人形/负载/传感器上复现与扩展 |

---

## 🎤 面试参考

**Q：为什么用"接触力"而不是视觉来推断人的意图？**
A：协同搬运的典型场景是"两人合抬长物"，跟随者常常被搬运物挡住视线，视觉根本看不到领导者的动作；而**手腕接触力**是人机之间天然、实时、始终在线的沟通通道——人往哪使劲、使多大劲，力信号里都有。用力做意图推断既廉价（一对 F/T 传感器）又不受遮挡/光照影响，还免去了动捕标定，真正做到"出实验室也能用"。

**Q：为什么要做成上层 BC + 下层 RL 的分层结构，而不是端到端一个网络？**
A：这两件事的学习信号和难度差异很大。"力 → 意图速度"是一个**语义映射**，用人类示范做监督式行为克隆最直接、样本效率高；"速度 → 负载下稳定行走"则是一个**长时程、强物理约束的控制问题**，更适合在仿真里用 RL + 域随机化训练。分层后各自用最合适的范式训练，接口（twist / `/cmd_vel`）清晰，也便于分别调试与替换。

**Q：负载会变、地面摩擦会变，下层步态怎么保证稳？**
A：核心手段是**训练期域随机化**——在 Isaac Gym 里随机化负载（0–3 kg）与地面摩擦等物理量，逼策略学会"对未知负载/摩擦鲁棒"的重心调节与落脚策略，从而零样本迁移到 MuJoCo 与真机时仍能跟准速度、不失稳。

**Q：怎么证明它"够好"？基线是什么？**
A：论文用**蒙眼人类跟随者**作对照——这是人机协同里很聪明的基线：蒙眼人同样只能靠手上的力去跟随。结果显示机器人在完成时间、轨迹偏差、速度同步性、跟随者出力等指标上与蒙眼人相当，说明"纯触觉跟随"这条路已能达到人类水准的协作质量。

---

## 🔗 相关阅读

- [ZEST: Zero-shot Embodied Skill Transfer for Athletic Robot Control (2602.00401)](../ZEST__Zero-shot_Embodied_Skill_Transfer_for_Athletic_Robot_Control/ZEST__Zero-shot_Embodied_Skill_Transfer_for_Athletic_Robot_Control.md)：同属全身控制/loco-manipulation，运动模仿+跨形态迁移路线，本仓库已有笔记
- [HOVER / 全身控制类论文](../)：全身控制模块下的多模态控制器与 loco-manipulation 相关笔记，可对照"上层意图 → 下层全身控制"的不同实现
- [awesome-humanoid-robot-learning · Loco-Manipulation 章节](https://github.com/YanjieZe/awesome-humanoid-robot-learning#loco-manipulation-and-whole-body-control)：上游论文清单来源

---

> 备注：本笔记基于 arXiv 摘要与 v1 HTML、项目主页（[h2compact.github.io/h2compact](https://h2compact.github.io/h2compact/)）及开源仓库（[github.com/bethalageetachandraraju/h2_compact](https://github.com/bethalageetachandraraju/h2_compact)）整理；**各指标精确数值、消融与实现细节**请以 arXiv v1 PDF 为准。源码与数据均已开源。
</content>
</invoke>
