---
layout: paper
paper_order: 7
title: "Development of an Intuitive GUI for Non-Expert Teleoperation of Humanoid Robots"
zhname: "为非专家用户设计的人形机器人遥操作直观图形界面（面向 FIRA HuroCup 障碍赛）"
category: "Teleoperation"
---

# Development of an Intuitive GUI for Non-Expert Teleoperation of Humanoid Robots
**不研究控制算法，而是从"人机交互 + UI 设计"角度出发：为人形机器人遥操作做一个简单、直观、可扩展的图形界面，让没有机器人背景的普通人也能开着机器人走完 FIRA HuroCup 障碍赛**

> 📅 阅读日期: 2026-06-16
>
> 🏷️ 板块: 07 Teleoperation · 人机交互(HRI) · 界面设计(UI/GUI) · 非专家操作
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 / 内容 |
|---|---|
| arXiv | [2510.13594](https://arxiv.org/abs/2510.13594) |
| HTML | [arXiv HTML](https://arxiv.org/html/2510.13594v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2510.13594) |
| **发布时间** | 2025-10-15 (arXiv) |
| 源码 | 截至当前未见公开仓库（论文未给出 GitHub 链接） |
| 机构 | Laurentian University，Bharti School of Engineering and Computer Science（加拿大）· Laurentian Intelligent Mobile Robotics Lab（LIMRL） |
| 主要作者 | **Austin Barrett**, **Meng Cheng Lau** |
| 发表时间 | 2025-09（arXiv preprint，会议汇报于 FIRA World Summit） |
| 应用场景 | **FIRA RoboWorld Cup · HuroCup 遥操作障碍赛**（机器人需无接触穿越障碍道） |

---

## 🎯 一句话总结

> 大多数人形机器人遥操作系统都把精力放在控制算法上，操作界面又难用又"只有写代码的人才会用"。这篇论文反其道而行：**它不碰底层控制，而是专门做一个面向非专家的图形界面（GUI）**——以摄像头画面为核心、清晰呈现机器人状态、布局简单可扩展，目标是让任何普通人都能凭这个界面，把人形机器人开过 FIRA HuroCup 的障碍赛道。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| GUI | Graphical User Interface | 图形用户界面 |
| UI | User Interface | 用户界面（设计） |
| HRI | Human-Robot Interaction | 人机交互 |
| FIRA | Federation of International Robot-soccer Association | 国际机器人足球联合会 |
| HuroCup | Humanoid Robot World Cup | FIRA 旗下的人形机器人综合竞赛项目 |

---

## ❓ 论文要解决什么问题？

人形机器人遥操作的研究，绝大多数集中在**"怎么把人的动作映射到机器人"**这类控制/重定向算法上（VR、外骨骼、运动捕捉……）。但有一个被长期忽视的环节：**操作界面本身**。

现实中的遥操作界面往往是：
- **为开发者而生**：满屏调试参数、命令行、各种专业术语，非专家根本看不懂；
- **状态不透明**：机器人现在是站着还是要摔了？电量、姿态、和障碍物的距离——这些关键信息散落各处或干脆没有；
- **不可扩展**：每换一个任务/机器人就得重写界面。

作者所在的 LIMRL 实验室长期参加 **FIRA HuroCup** 比赛（其 Snobots 队在 2024 巴西世界杯的成人组 HuroCup 夺冠），其中的**遥操作障碍赛**要求操作员控制人形机器人**不碰到障碍物**地穿越赛道。这就需要一个**普通人也能上手**的界面。

于是论文的目标很明确：**用规范的 UI 设计方法 + HRI 理论，做一个简单、直观、可扩展的遥操作 GUI**，把"会不会操作机器人"的门槛从"专业工程师"降到"任何人"。

---

## 🔧 方法详解

这是一篇**以工程与设计为主**的论文，核心不是公式，而是"按用户体验原则把界面做对"。

### 1. 设计原则（来自 UI / HRI 实践）

- **以摄像头视觉为中心**：界面主区域是机器人第一/第三人称摄像头画面——遥操作时人最需要的就是"我现在看到什么"，所以视觉反馈优先级最高。
- **清晰传达机器人状态**：把姿态、当前动作、关键传感信息以直观控件（而非数字堆）呈现，让操作员一眼判断机器人"安不安全、在干嘛"。
- **简单 = 减少认知负担**：按非专家心智模型组织控件，按钮少而语义明确，避免专业术语。
- **可扩展架构**：界面与具体任务/机器人解耦，方便迁移到 HuroCup 之外的更多场景。

### 2. 任务载体：FIRA HuroCup 遥操作障碍赛

界面就是围绕这一具体任务打磨的：
- 操作员**看着摄像头画面**，通过 GUI 下发"前进 / 转向 / 步态"等高层指令；
- 机器人需**无接触**地走完障碍道——这要求界面把"机器人与障碍的相对位置、当前朝向"传达得足够清楚；
- 比赛规则（FIRA-regulated）天然提供了**可量化的成功标准**（完赛、是否碰撞、用时）。

### 3. 评估方式

论文沿用 HRI 领域的思路，让**非专家用户**用该界面尝试完成障碍赛任务，从**可用性 / 易学性 / 完赛表现**等角度衡量界面是否达到了"直观好用"的目标，并据此迭代界面布局。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph DESIGN["🎨 设计输入"]
        UI["📐 UI 设计实践<br/>布局/认知负担"]
        HRI["🧠 HRI 理论<br/>状态可读性"]
        TASK["🏁 FIRA HuroCup<br/>障碍赛任务约束"]
    end

    subgraph GUI["🖥️ 直观遥操作 GUI"]
        CAM["📷 摄像头画面<br/>(界面核心)"]
        STATE["📊 机器人状态<br/>姿态/动作/传感"]
        CTRL["🕹️ 简洁控制控件<br/>前进/转向/步态"]
    end

    subgraph LOOP["🔁 遥操作闭环"]
        OP["🧑 非专家操作员"]
        ROBOT["🤖 人形机器人"]
        COURSE["🚧 障碍赛道<br/>(无接触穿越)"]
    end

    UI --> GUI
    HRI --> GUI
    TASK --> GUI

    CAM --> OP
    STATE --> OP
    OP --> CTRL
    CTRL --> ROBOT
    ROBOT --> COURSE
    ROBOT -. 视频/状态回传 .-> CAM
    COURSE -. 完赛/碰撞反馈 .-> OP

    style DESIGN fill:#fff7e0,stroke:#d4a017
    style GUI fill:#e8f4fd,stroke:#1f78b4
    style LOOP fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **把"界面"当成一等公民**：在人人研究控制算法的遥操作领域，专门补上"非专家可用的 GUI"这块短板。
2. **以摄像头 + 状态可读性为核心的设计准则**：给出一套面向人形遥操作的实用界面设计取舍。
3. **可扩展架构**：界面与任务/机器人解耦，不只服务 HuroCup。
4. **真实竞赛任务驱动**：以 FIRA HuroCup 障碍赛作为可量化、可复现的评测场景。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **降低操作门槛** | 让非专业人士也能遥操作人形机器人，对教育、科普、应急/救援等"操作员未必是工程师"的场景很重要 |
| **HRI / UI 视角补位** | 提醒社区：遥操作的瓶颈不只在算法，**人能不能看懂、能不能控好界面**同样关键 |
| **与算法路线互补** | 与本模块 [SEW-Mimic](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html)（重定向算法）、[ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html)（低延迟控制）形成"算法 ↔ 界面"两端的互补 |
| **竞赛驱动研究** | 展示了 FIRA 这类机器人竞赛如何反哺学术研究与人才培养 |

---

## 🎤 面试参考

**Q：这篇论文为什么"不做算法"也值得读？**
A：因为遥操作是一个**人在环（human-in-the-loop）**系统，整体性能 = 控制算法 × 人对界面的理解效率。再好的控制器，如果操作员看不懂界面、判断不了机器人状态，照样会撞障碍。这篇论文补的就是后半截，提醒我们系统级思考。

**Q：为什么把摄像头画面放在界面最核心？**
A：遥操作里操作员"不在现场"，唯一的现场感来自视频流。优先保证视觉反馈，才能让人判断机器人与障碍的相对关系，这是完成"无接触穿越"的前提。

**Q：FIRA HuroCup 障碍赛作为评测场景有什么好处？**
A：它有明确、第三方规定的规则（是否碰撞、是否完赛、用时），天然提供了**可量化、可复现**的成功标准，比自定义任务更有说服力。

**Q：这种"非专家界面"思路还能用到哪里？**
A：教育/科普展示、灾害救援（操作员是消防员而非机器人专家）、远程医疗辅助、工业巡检——凡是"操作者不是工程师"的遥操作场景都适用。

---

## 🔗 相关阅读

- 本文：[arXiv abs](https://arxiv.org/abs/2510.13594) · [HTML](https://arxiv.org/html/2510.13594v1) · [PDF](https://arxiv.org/pdf/2510.13594)
- 背景：[Teleoperation of Humanoid Robots: A Survey](https://arxiv.org/abs/2301.04317)（人形遥操作综述，可了解算法侧全景）
- 同模块对照：
  - [HumanPlus](../HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans/HumanPlus_Humanoid_Shadowing_and_Imitation_from_Humans.html)（影子模仿遥操作）
  - [Learning Adaptive Neural Teleoperation](../Learning_Adaptive_Neural_Teleoperation_for_Humanoid_Robots/Learning_Adaptive_Neural_Teleoperation_for_Humanoid_Robots.html)（端到端 RL 遥操作）
  - [SEW-Mimic](../SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation/SEW-Mimic__Closed-Form_Geometric_Retargeting_Solver_for_Upper_Body_Humanoid_Teleoperation.html)（闭式几何重定向）
  - [ExtremControl](../ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control/ExtremControl__Low-Latency_Humanoid_Teleoperation_with_Direct_Extremity_Control.html)（低延迟直接末端控制）

---

## 💬 讨论记录

> 待补充。
