---
layout: paper
title: "Towards Miniature Humanoid Tele-Loco-Manipulation Using Virtual Reality and Reinforcement Learning"
zhname: "面向小型人形的远程移动操作：VR 上肢遥操作 + RL 下肢行走"
category: "Teleoperation"
arxiv: "2607.20399"
---

# Towards Miniature Humanoid Tele-Loco-Manipulation Using Virtual Reality and Reinforcement Learning
**面向小型人形的远程移动操作：VR 上肢遥操作 + RL 下肢行走**

> 📅 阅读日期: 2026-08-03
>
> 🏷️ 板块: 07 Teleoperation · 全身遥操作 · VR 上肢映射 · RL 下肢行走 · 小型人形 · DYNAMIXEL 舵机建模
>
> 🔁 推进轨: 模块轮转（06_Manipulation → 07_Teleoperation）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 7 月（arXiv）· Humanoids 2025（IEEE-RAS，pp. 1233–1240，DOI 10.1109/Humanoids65713.2025.11264861） |
| arXiv | [2607.20399](https://arxiv.org/abs/2607.20399) · [PDF](https://arxiv.org/pdf/2607.20399) · [HTML](https://arxiv.org/html/2607.20399) |
| 源码 | 论文未公开代码 / 项目页（截至当前未见 GitHub 仓库） |
| 作者 | Nicolas Kosanovic、Jordan Dowdy、Jean Chagas Vaz |
| 主题 | cs.RO / 全身遥操作 · 移动操作 · 强化学习行走 · 小型人形执行器建模 |

> 来源：Teleoperation 模块最新发表且尚无笔记的论文（模块轮转到 07）。

---

## 🎯 一句话总结

> 大多数遥操作 / 全身控制工作都建立在**全尺寸、带仿生关节布局**的人形上；本文关注**小型人形**——它们通常缺乏仿生结构、执行器（DYNAMIXEL 舵机）也没有精确力矩接口，直接照搬大型人形的方案会失败。作者提出一套**上下半身解耦**的全身远程移动操作栈：**上半身**用 VR 头显 + 手柄，经**多目标 IK**（避关节限位 / 自碰撞）把操作者双手实时映射到机器人手臂，再由一套**数据驱动的 DYNAMIXEL 力矩控制器**（200 Hz PD 阻抗、低增益增柔顺）驱动；**下半身**用**强化学习**训练的行走策略自主维持平衡、按触控板速度指令行走，**与手臂动作解耦**。在 **ROBOTIS OP3**（20 DoF）上验证：行走可达 **0.45 m/s** 且不受手臂动作影响，遥操作端到端动作延迟约 **220 ms**，并完成「边走 5 米边搬 40 g 方块」的移动操作任务。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Tele-Loco-Manipulation | 远程「移动 + 操作」，即遥操作下同时行走与操作物体 |
| VR / HMD | 虚拟现实 / 头戴显示器（本文用 VIVE Pro 2） |
| IK | Inverse Kinematics，逆运动学（把手部目标位姿解算成关节角） |
| RL | Reinforcement Learning，强化学习（训练下肢行走策略） |
| PD Control | 位置-微分控制；本文用作关节阻抗控制 τ = K_P(q_des−q) − K_D q̇ |
| DoF | Degree of Freedom，自由度（OP3 共 20 DoF） |
| DYNAMIXEL | ROBOTIS 智能舵机（XM430-W350-R），仅电流接口、无原生力矩传感 |
| Domain Randomization | 域随机化，训练时随机化物理参数以缩小 sim-to-real 差距 |
| MAE / RMSE | 平均绝对误差 / 均方根误差（此处衡量手臂跟踪精度） |

---

## ❓ 论文要解决什么问题？

- 现有**遥操作 / 全身控制**几乎都针对**全尺寸人形**：它们有仿生关节布局、算力充足、执行器可精确控扭矩。
- **小型人形**（如 OP3）恰恰相反——**结构非仿生、DYNAMIXEL 舵机只有电流接口、没有精确力矩控制**，无法直接套用大型人形的力矩级全身控制方案。
- 作者的目标：给这类平价小型人形做一套**能真正跑起来的全身远程移动操作系统**——上半身要能让人「像自己手一样」直觉操作，下半身要能**自主平衡行走**、把「走」与「操作」解耦，让操作者只需管手、不用管脚。

---

## 🔧 方法详解

### 1. 上半身：VR 遥操作 + 多目标 IK + 数据驱动力矩控制
- **采集**：操作者戴 **VIVE Pro 2** 头显与手柄；虚拟机器人模型按操作者肩宽 / 身高缩放，增强「化身感」。
- **重定向**：手柄位姿送入**多目标 IK 求解器**，在**避关节限位与自碰撞**约束下解出手臂关节角。
- **执行**：自研 **200 Hz PD 力矩控制器**把目标关节角换成电机电流——针对 DYNAMIXEL **无精确力矩接口**的问题，用**堵转扭矩规格**做「电流↔力矩」近似线性开环控制；**手臂 / 头部用低增益**提高柔顺性，接触更安全。
  - 控制律：`τ_cmd = K_P (q_des − q) − K_D q̇`
- **视频回传**：VR180 双鱼眼相机 → GPU 加速 H.265 编码 → UDP / GStreamer，约 **100 ms** 延迟、**<4 Mbps**。

### 2. 下半身：强化学习行走策略（与手臂解耦）
- **观测**：本体感受（机身角速度、机体系投影重力、关节位置）+ **9 步历史**，拼成 **330×1** 向量。
- **奖励**：速度跟踪、**步态同步**（双支撑 / 单支撑相位）、**抬脚高度**、动作平滑；对力矩、加速度、关节偏移施加惩罚。
- **训练与域随机化**：随机化连杆质量（0.7–1.3×）、重力（0.95–1.3×）、足底摩擦（0.5–0.9），每 10–15 s 施加机身扰动。
- **sim-to-real**：用**单摆测试台 + Better Actuator Modeling** 辨识舵机执行器动力学（armature 0.045、摩擦损耗 0.03、力矩上限 3.6），缩小仿真-实机差距。

### 3. 系统架构（数据流）
- **VR→机器人**：HMD / 手柄 → **Unity（IK 求解）** → ROS 桥 → 机器人；
- **速度指令**：触控板速度命令经 ROS 送到下肢控制器；
- **视频回传**：机载 VR180 相机 → H.265 → UDP/GStreamer → 头显。

### 4. 硬件
- **ROBOTIS OP3**：**20 个转动 DoF**（两条 6-DoF 腿 + 两条 3-DoF 臂 + 2-DoF 头 + 1-DoF 腰），**DYNAMIXEL XM430-W350-R** 驱动，机载 i7 NUC + OpenCR（9 轴 IMU），有线供电。
- **上位机**：i9 + RTX 4090。

### 5. 主要结果
- **行走**：随机速度指令下可达 **0.45 m/s**，且**不受手臂动作影响**，归一化投影重力稳定在 −1 附近（保持直立）。
- **遥操作**：端到端动作延迟约 **220 ms**；手臂位置跟踪 **MAE 8.76–10.58%**、**RMSE 11.17–15.07%**。
- **移动操作**：10 分钟内成功搬运 6 个 **40 g** 方块中的 **2 个**，累计行走约 **5 米**、平均约 **0.35 m/s**。

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑 操作者<br/>VIVE Pro 2 头显 + 手柄"] --> UP
    subgraph UP["上半身：VR 遥操作"]
        U1["手柄位姿采集<br/>按肩宽/身高缩放化身"]
        U2["多目标 IK<br/>避关节限位 / 自碰撞"]
        U3["200Hz PD 力矩控制器<br/>电流↔力矩近似·低增益增柔顺"]
        U1 --> U2 --> U3
    end
    OP -. 触控板速度指令 .-> LO
    subgraph LO["下半身：RL 行走（与手臂解耦）"]
        L1["观测: 角速度+投影重力+关节位置<br/>9 步历史 → 330×1"]
        L2["RL 策略<br/>速度跟踪·步态同步·抬脚·平滑"]
        L3["域随机化 + 单摆辨识执行器<br/>sim-to-real"]
        L1 --> L2 --> L3
    end
    UP --> ROB["🤖 ROBOTIS OP3<br/>20 DoF · DYNAMIXEL XM430"]
    LO --> ROB
    ROB --> CAM["VR180 相机 → H.265<br/>UDP/GStreamer ~100ms"]
    CAM -. 视频回传 .-> OP
    ROB --> RES["行走 0.45 m/s（不受手臂影响）<br/>延迟 220ms · 边走 5m 边搬 40g 方块"]

    style UP fill:#e8f4fd,stroke:#2980b9,color:#1a3e5c
    style LO fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style RES fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **系统**：面向小型人形的**全身远程移动操作软件架构**，把 VR 上肢遥操作与 RL 下肢行走解耦拼合；
2. **执行器建模**：**数据驱动的 DYNAMIXEL 力矩控制器**——用堵转扭矩规格 + 单摆辨识补上小型舵机「无精确力矩接口」的短板；
3. **控制器**：面向 DYNAMIXEL 关节链的**全身 PD 阻抗控制器**，低增益换柔顺、利于接触安全；
4. **验证**：在平价 **ROBOTIS OP3** 上跑通「边走边搬」的完整移动操作闭环。

---

## ⚠️ 局限

- 任务效率低（10 分钟仅搬 6 块中的 2 块）；
- 行走**抬脚高度有限**，操作困难；
- 机械臂**柔顺 / 抓握不足**，操作者需「交叉双臂」才能夹稳；
- **有线供电**限制移动范围；
- 执行器模型**过于粗糙**，只能靠**大量域随机化**硬扛 sim-to-real；
- 系统**缺乏重力与摩擦补偿**。

---

## 🤖 对人形机器人学习的启发

- **「上肢遥操作 + 下肢 RL」解耦**是低成本平台快速落地全身遥操作的务实范式：让人只管手、机器人自管平衡；
- 小型 / 平价人形的**执行器建模**（无力矩接口 → 数据驱动近似）是被大型人形工作长期忽视、却决定 sim-to-real 成败的关键一环；
- 论文诚实暴露的**柔顺不足 / 抬脚受限 / 无重力补偿**等短板，正是「小型人形要走向实用移动操作」需要补齐的工程清单。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2607.20399](https://arxiv.org/abs/2607.20399) | 论文正文（系统架构、IK、力矩建模、RL 行走、实验） |
| [PDF](https://arxiv.org/pdf/2607.20399) · [HTML](https://arxiv.org/html/2607.20399) | 全文（含图表与数值） |
| Humanoids 2025 | IEEE-RAS 24th Int. Conf. on Humanoid Robots, pp. 1233–1240 |

> ℹ️ 备注：本笔记依据 arXiv 摘要 / HTML 整理；**逐项数值以原文 PDF 为准**。论文未公开源码，故本笔记不含源码运行时序图。

---

## 🔗 相关阅读

- **同模块·VR / 全身遥操作**：[CLONE](../CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks/CLONE__Closed-Loop_Whole-Body_Humanoid_Teleoperation_for_Long-Horizon_Tasks.html) · [TeleGate](../TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior/TeleGate__Whole-Body_Humanoid_Teleoperation_via_Gated_Expert_Selection_with_Motion_Prior.html) · [Mobile-TeleVision](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)
- **上肢重定向 / 外骨骼采集**：[SEW-Mimic](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html) · [ACE](../ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation/ACE__A_Cross-Platform_Visual-Exoskeletons_System_for_Low-Cost_Dexterous_Teleoperation.html)
- **移动操作底座 / 全身控制**：[HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html) · [HOVER](../../03_High_Impact_Selection/HOVER_Versatile_Neural_Whole-Body_Controller/HOVER_Versatile_Neural_Whole-Body_Controller.html)
