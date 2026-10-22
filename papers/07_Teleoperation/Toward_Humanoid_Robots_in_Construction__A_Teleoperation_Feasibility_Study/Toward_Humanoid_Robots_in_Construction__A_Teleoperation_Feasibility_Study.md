---
layout: paper
title: "Toward Humanoid Robots in Construction: A Teleoperation Feasibility Study"
zhname: "迈向建筑工地的人形机器人：遥操作可行性研究"
category: "Teleoperation"
arxiv: "2610.00718"
---

# Toward Humanoid Robots in Construction: A Teleoperation Feasibility Study
**操作员坐着戴 Quest 3 控上半身和双手、踩 GLYDR 脚踏板控行走和下蹲，把 G1 带到真实工地做搬工具和刷漆两项 O\*NET 任务：搬工具 20/20 成功、刷漆 16/20，但分别比人手慢约 18 倍和 3 倍**

> 📅 总结日期: 2026-10-21
>
> 🏷️ 板块: 07 Teleoperation · XR 遥操作 · 脚踏板行走 · 建筑工地 · 可行性研究 · Unitree G1 · LeRobot 数据采集
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）· 上游 awesome-humanoid-robot-learning Teleoperation 章节中尚无笔记的最新论文（2026.09.30，PROGRESS #714）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2610.00718](https://arxiv.org/abs/2610.00718) |
| HTML | [arxiv.org/html/2610.00718v1](https://arxiv.org/html/2610.00718v1) |
| PDF | [下载 v1](https://arxiv.org/pdf/2610.00718v1) |
| **发布时间** | 2026-09-30（arXiv v1） |
| 会议 | IROS 2026 Workshop on Future of Construction |
| 项目主页 | 没有单独的项目页 |
| 源码 | ⏳ 论文自己的整合代码未开源（作者计划公开采集的示范数据集） |
| 配套开源组件 | 上半身与双手用 [unitreerobotics/xr_teleoperate](https://github.com/unitreerobotics/xr_teleoperate)，下半身用 [GR00T Whole Body Control](https://github.com/NVlabs/GR00T-WholeBodyControl)（论文引的是 [NVIDIA/Isaac-GR00T](https://github.com/NVIDIA/Isaac-GR00T)），数据存成 [LeRobot](https://github.com/huggingface/lerobot) 格式；下文的源码时序图按 xr_teleoperate 画 |

**作者**：Parastoo Ali Pour, David R. Martin, Chang Min Hur, Bo Zhang, Tommy Zhou, Brandon Thomas Lichter, Shane Stanfield, Pramod Khargonekar, Mohammad Abdullah Al Faruque（UC Irvine 机械与航空系、电子工程与计算机系、嵌入式与信息物理系统硕士项目 · Genova Construction；工作部分由 Genova Construction 资助）

---

## 🎯 一句话总结

建筑业缺人、危险、自动化程度低，而人形机器人在杂乱工地上还做不到可靠的自主。这篇 4 页的 workshop 论文把遥操作当作近期可落地的办法：操作员**坐在工作站**，Quest 3 负责头部（转动 2 自由度颈部上的 ZED Mini）和手部追踪（xr_teleoperate 映射到手臂和 Inspire 五指手），**GLYDR 脚踏板**给 GR00T WBC 发线速度 / 角速度和下蹲 / 站起指令，于是双手干活的同时能走。G1 在真实工地上做了两项从 O\*NET「建筑工人」职业库里挑的任务，两名操作员（VR 新手 / 老手）各 10 次：搬工具成功率 100%、平均 72 s（人手 4 s）；刷漆 80%、平均 149 s（人手 47 s）。失败主要来自握不稳滚筒刷，长时间操作还出现电机过热。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| XR | Extended Reality | 扩展现实；这里指 Meta Quest 3 头显，同时做立体视频显示与头 / 手追踪 |
| O\*NET | Occupational Information Network | 美国劳工部的职业信息库，列出每个职业的核心 / 补充任务；本文从「建筑工人（47-2061.00）」里挑任务 |
| WBC | Whole-Body Control | 全身控制器；这里是 NVIDIA 的 GR00T WBC，接收速度和高度指令生成下半身电机指令 |
| PWM | Pulse Width Modulation | 脉宽调制；头显的俯仰 / 偏航角转成 PWM 驱动颈部舵机 |
| WebRTC | Web Real-Time Communication | 实时音视频传输协议，ZED Mini 的双目画面经它推到头显 |
| VLA | Vision-Language-Action | 视觉-语言-动作模型；论文把采到的示范数据视作将来训练它的原料 |

---

## ❓ 论文要解决什么问题？

1. **建筑业的自动化一直是「一项任务一台专机」**：砌砖、装石膏板、预制框架都有专用机器人，但工地本身动态、杂乱，需要能在为人设计的空间里走、又能用手工具的通用平台；人形机器人形态合适，可自主还不可靠（HRP-5P 能装石膏板，但依赖大量环境建模，脱离脚本条件就很慢）。
2. **现有全身遥操作都在家里和实验室里评测**：OmniH2O、TWIST、TWIST2 证明了示范数据对训练 VLA 的价值，却没人在真实工地上试过。
3. **全身模仿让操作员也得「出力」**：TWIST / TWIST2 要求操作员真的走同样远、蹲到同样低，体力负担没有转移给机器人，长时间作业不现实。本文要的是**坐着**就能同时控制行走和操作。

---

## 🔧 方法拆解

### 1. 坐姿工作站：三个设备、一台中转 PC

操作员端是 Meta Quest 3 头显 + GLYDR 双脚踏板；它们接到一台控制 PC，由 PC 把指令转发给机器人。机器人是 Unitree G1，装 Inspire 五指手（带触觉）。系统要达成三件事：从机器人视角主动观察、手部追踪操作、不用手的行走控制。

### 2. 主动视觉：跟着头转的双目相机

ZED Mini 双目相机装在 TWIST2 设计的 2 自由度颈部上，画面经 WebRTC 推到头显；头显记录的头部俯仰、偏航角换算成 PWM，驱动颈部舵机，让相机朝向跟着操作员的头走。

### 3. 上半身：xr_teleoperate 的手部追踪

手臂和手指直接用 Unitree 官方的 xr_teleoperate：手腕位姿经 IK 解成手臂关节角，手部关键点经 dex-retargeting 变成 Inspire 手的关节角。手部追踪直观、精细，但代价是**两只手都被占了**——手柄不能用，行走只能交给脚。

### 4. 下半身：GLYDR 脚踏板 → GR00T WBC

左右两块踏板各自独立，构成差速控制：

| 踏板状态 | 指令 |
|---|---|
| 两块都在中位 | 原地不动 |
| 只推一块 | 向**另一侧**转（推左转右） |
| 两块同时推 | 前进 |
| 踏板上的辅助翻板 | 下蹲 / 站起（调高度，便于够地面或低层货架） |

得到的线速度、角速度和高度指令交给 GR00T Whole Body Control 生成下半身电机指令。

### 5. 数据采集：一边干活一边攒示范

每次遥操作都按 LeRobot 数据集格式记录：ZED Mini 视频、触觉、电机状态、电机动作和速度指令，时间对齐。这样每一次遥操作既完成了实际工作，也为以后的模仿学习攒了一条示范。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph OP["🧑‍🔧 坐姿操作员工作站"]
        Q3["Meta Quest 3<br/>头部姿态 + 手部追踪"]
        GL["GLYDR 双脚踏板<br/>差速推板 + 辅助翻板"]
    end

    PC["🖥️ 控制 PC<br/>转发指令 / 记录数据"]

    subgraph ROBOT["🤖 Unitree G1 + Inspire 五指手（触觉）"]
        NECK["2 自由度颈部<br/>头部俯仰 / 偏航 → PWM"]
        UP["xr_teleoperate<br/>手腕位姿 → 手臂 IK<br/>手部关键点 → 手指重定向"]
        WBC["GR00T WBC<br/>线速度 / 角速度 / 下蹲站起<br/>→ 下半身电机指令"]
        CAM["ZED Mini 双目相机"]
    end

    subgraph DATA["💾 LeRobot 格式数据"]
        REC["双目视频 · 触觉 · 电机状态<br/>电机动作 · 速度指令（同步）"]
    end

    subgraph EVAL["🏗️ 工地可行性评测（O*NET 建筑工人任务）"]
        T1["任务 1：搬工具<br/>拿起抹刀，走约 4 m 放进工具箱<br/>成功 100% · 72 s vs 人手 4 s"]
        T2["任务 2：刷漆<br/>握滚筒刷涂满纸面 ≥ 90%<br/>成功 80% · 149 s vs 人手 47 s"]
        LIM["暴露的问题：握持不稳<br/>电机过热 · 远慢于人手"]
    end

    Q3 --> PC
    GL --> PC
    PC --> NECK
    PC --> UP
    PC --> WBC
    CAM -- WebRTC 双目画面 --> Q3
    NECK --- CAM
    PC --> REC
    CAM --> REC
    ROBOT --> EVAL
    T1 --> LIM
    T2 --> LIM
    REC -. 将来训练模仿学习 / VLA .-> FUT["🔮 自主策略"]

    style OP fill:#eef6ff,stroke:#2e86de
    style ROBOT fill:#fff7e0,stroke:#d4a017
    style DATA fill:#f3eafe,stroke:#8e44ad
    style EVAL fill:#eafaf1,stroke:#27ae60
</div>

---

## 🚶 具体实例：两块踏板怎么变成速度，表 II 的平均怎么来

**踏板 → 速度（玩具映射，论文没给公式）**：设左右踏板前推量 $p_L, p_R \in [0, 1]$，一种符合论文描述的线性映射是

$$v = k_v \cdot \tfrac{p_L + p_R}{2}, \qquad \omega = k_\omega \,(p_R - p_L)$$

（$\omega > 0$ 为左转）。只推左板 $p_L = 0.6, p_R = 0$：$v = 0.3k_v$、$\omega = -0.6k_\omega$，边往前挪边右转，对应「推左转右」；两板都推到 0.6：$v = 0.6k_v$、$\omega = 0$，直走；都回中位：$v = \omega = 0$。真实系统里 GLYDR 的增益、死区以及纯转向时是否带前进分量，论文都没写。

**表 II 的数怎么平均**：每行「Avg」是两名操作员的简单平均。

| 任务 | 新手遥操作 | 老手遥操作 | 平均 | 人手（新手 / 老手 → 平均） | 慢多少 |
|---|---|---|---|---|---|
| 搬工具 | 83 s | 62 s | 72.5 → 表中 72 | 5 / 3 → 4 s | 72 ÷ 4 = **18 倍** |
| 刷漆 | 169 s | 129 s | 149 | 40 / 53 → 46.5，表中 47 | 149 ÷ 47 ≈ **3.2 倍** |

按人分开算更能看出差距落在哪里：搬工具新手慢 16.6 倍、老手慢 20.7 倍（老手人手只要 3 s，比值反而更大）；刷漆新手 4.2 倍、老手 2.4 倍。刷漆 80% 是两人各 8/10，合计 16/20。搬工具差得多，是因为要走路和反复调整站位；刷漆基本站着不动、只做连续接触，遥操作的劣势小得多。

---

## 📊 关键结果

**表 II（每名操作员每项任务 10 次）**：

| 任务 | 操作员 | 遥操作成功率 | 遥操作平均用时 | 人手平均用时 |
|---|---|---|---|---|
| 搬工具 | VR 新手 | 100% | 83 s | 5 s |
| 搬工具 | VR 老手 | 100% | 62 s | 3 s |
| 搬工具 | 平均 | 100% | 72 s | 4 s |
| 刷漆 | VR 新手 | 80% | 169 s | 40 s |
| 刷漆 | VR 老手 | 80% | 129 s | 53 s |
| 刷漆 | 平均 | 80% | 149 s | 47 s |

- **成功的定义**：搬工具是拿起目标工具并送到目标位置；刷漆是涂层至少覆盖纸面 90%。
- **VR 经验有用**：老手两项都比新手快（搬工具 62 vs 83 s，刷漆 129 vs 169 s），成功率相同。
- **失败原因**：刷漆的失败主要是滚筒刷没抓住或抓不稳——纯手部追踪缺少力 / 触觉反馈，握持的获取和保持是瓶颈。
- **电机过热**：长时间遥操作时出现，作者认为需要更好的控制策略才能持续作业。

两项任务都只有两名操作员、每人 10 次，没有和其它遥操作系统对比，也没有报告数据量或用这些数据训出的策略，是一份初步的可行性报告。

---

## 💡 核心贡献

1. **坐姿、可同时走和操作的人形遥操作系统**：Quest 3 管头和手，脚踏板管行走与高度，全部用开源组件（xr_teleoperate、GR00T WBC、LeRobot）搭成；
2. **第一次把全身人形遥操作带到真实在建工地**：作者称此前没有人评估过人形机器人全身遥操作做建筑任务的可行性；
3. **按职业库选任务的初步评测**：两项 O\*NET 建筑工人任务、两名操作员、对比人手用时，给出成功率与慢多少的基线数字。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **「坐着遥操作」是一条省力路线** | 与 TWIST2 那样要人亲自走、亲自蹲的全身模仿相比，脚踏板 + 手部追踪把体力负担真正交给了机器人，代价是行走只剩速度指令、腿部不能做精细动作 |
| **评测任务从职业库里来** | 用 O\*NET 的职业任务描述挑任务，比自己设计的桌面任务更接近「替代哪部分劳动」的问题，可以作为垂直行业评测的一种做法 |
| **暴露的是硬件与交互短板** | 握不稳（缺触觉反馈）、电机过热、比人慢 3–18 倍——说明工地落地卡在持续作业能力和操作效率上，而不只是控制算法 |
| **局限** | 只有两项任务、两名操作员；没有放出代码和数据（作者计划公开数据集）；GLYDR 映射、延迟、续航都没有量化 |

---

## 🛠️ 源码运行时序图（xr_teleoperate 上半身遥操作）

论文的上半身与双手直接用 Unitree 的 xr_teleoperate（下图按 2026-09 的 `teleop/teleop_hand_and_arm.py` 画，`--ee inspire_ftp --input-mode hand`）；论文没有放出自己的整合代码，脚踏板 → GR00T WBC 那一路和 LeRobot 记录是论文的描述，不在这份代码里（xr_teleoperate 自带的 `EpisodeWriter` 记录的是它自己的格式）。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 操作员（Quest 3）
    participant TV as TeleVuerWrapper（televuer）
    participant M as 主循环 teleop_hand_and_arm.py（30 Hz）
    participant IK as G1_29_ArmIK（pinocchio + casadi）
    participant AC as G1_29_ArmController（250 Hz 线程）
    participant HC as Inspire_Controller_FTP（100 Hz 进程）
    participant R as G1 + Inspire 手（DDS）
    participant G as GLYDR → GR00T WBC（论文描述）

    M->>M: ChannelFactoryInitialize()，ImageClient 连头部相机
    M->>TV: TeleVuerWrapper(use_hand_tracking=True, webrtc_url=…)
    M->>AC: 启动订阅 rt/lowstate 与发布线程
    M->>HC: 启动手部控制进程（dex-retargeting）
    U->>M: 键盘 r 开始（START）
    loop 每个控制周期（1 / frequency）
        TV-->>U: 头部相机画面（WebRTC 或本地渲染）
        U->>TV: 头 / 双腕 / 手部关键点位姿
        M->>TV: get_tele_data()
        TV-->>M: left/right_wrist_pose、left/right_hand_pos
        M->>HC: 写共享数组 left/right_hand_pos_array
        HC->>HC: 指尖向量 → retarget() → 归一化到 Inspire 量程
        HC->>R: rt/inspire_hand/ctrl/l、/r
        M->>AC: get_current_dual_arm_q / dq()
        M->>IK: solve_ik(双腕位姿, q, dq)
        IK-->>M: sol_q（加权滑动滤波）+ 重力补偿 sol_tauff
        M->>AC: ctrl_dual_arm(sol_q, sol_tauff)
        AC->>AC: clip_arm_q_target() 限速
        AC->>R: rt/arm_sdk（运动模式，腿交给机载行走控制）或 rt/lowcmd
        opt --record
            M->>M: recorder.add_item(图像, 状态, 动作)
        end
    end
    G->>R: 踏板 → 线 / 角速度、下蹲站起 → 下半身电机（论文自行整合，未开源）
    U->>M: 退出 → ctrl_dual_arm_go_home()，关闭 TeleVuer 与记录器
</div>

---

## 🎤 面试参考

**Q：为什么用脚踏板控行走，而不是像 TWIST 那样让人真的走？**
A：一是体力：要人走同样的距离、蹲同样低，负担没有转移给机器人，工地上长时间做不下去；二是手部追踪把两只手都占了，摇杆没法用，只能交给脚。代价是行走被压成速度 + 高度指令，脚下的精细动作做不了。

**Q：搬工具为什么比刷漆慢得多（18 倍 vs 3 倍）？**
A：搬工具要拿起、走约 4 m、再放下，涉及行走和反复调整站位，而人手只要 4 s，任何遥操作的固定开销都会被放大；刷漆是站着做连续接触，人手本身要 47 s，遥操作的相对劣势小。

**Q：刷漆 80% 的失败说明什么？**
A：主要是滚筒刷抓不住或抓不稳。纯视觉 + 手部追踪没有力 / 触觉反馈，操作员不知道握得够不够紧，持续接触时就容易滑。作者把触觉反馈列为后续工作。

**Q：这类可行性研究的数据价值在哪里？**
A：遥操作同时完成真实工作和采集示范（LeRobot 格式的视频、触觉、电机状态 / 动作、速度指令），工地场景又恰好是现有数据集缺的，可以给后续的模仿学习 / VLA 做领域数据。

---

## 🔗 相关阅读

- [TWIST2](../TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html)：本文 2 自由度颈部的出处，也是「人要亲自走、蹲」的全身遥操作代表
- [TWIST](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html) / [OmniH2O](../../03_High_Impact_Selection/OmniH2O_Universal_Whole-Body_Teleoperation/OmniH2O_Universal_Whole-Body_Teleoperation.html)：用遥操作示范训练自主策略的全身系统
- [Open-TeleVision](../Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback/Open-TeleVision__Teleoperation_with_Immersive_Active_Visual_Feedback.html)：跟着头转的立体相机 + 手部追踪，xr_teleoperate 的前身思路
- [Mobile-TeleVision](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html) / [HOMIE](../../03_High_Impact_Selection/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit/HOMIE_Humanoid_Loco-Manipulation_with_Isomorphic_Exoskeleton_Cockpit.html)：上下身分开控制的遥操作（HOMIE 也用脚踏板控行走）
- [LapSurgie](../LapSurgie__Humanoid_Robots_Performing_Surgery_via_Teleoperated_Handheld_Laparoscopy/LapSurgie__Humanoid_Robots_Performing_Surgery_via_Teleoperated_Handheld_Laparoscopy.html) / [Humanoids in Hospitals](../../06_Manipulation/Humanoids_in_Hospitals__Humanoid_Surrogates_for_Dexterous_Medical_Interventions/Humanoids_in_Hospitals__Humanoid_Surrogates_for_Dexterous_Medical_Interventions.html)：同样是「把人形遥操作带进一个具体行业」的可行性研究（医疗）
