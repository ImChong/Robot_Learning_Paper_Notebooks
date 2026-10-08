---
layout: paper
paper_order: 11
title: "MIDAS Hand: Modular low-Impedance Direct-drive Anthropomorphic Sensing Hand"
zhname: "MIDAS Hand：模块化低阻抗直驱仿人触觉灵巧手"
category: "硬件设计"
arxiv: "2607.14487"
---

# MIDAS Hand: Modular low-Impedance Direct-drive Anthropomorphic Sensing Hand
**MIDAS Hand：模块化低阻抗直驱仿人触觉灵巧手**

> 📅 阅读日期: 2026-08-08
>
> 🏷️ 板块: 12 Hardware Design · 灵巧手 · 直驱驱动 · 分布式触觉 · 开源硬件 · 遥操作
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）· 优先推进模块最新发表且有开源代码的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2607.14487](https://arxiv.org/abs/2607.14487) |
| HTML | [在线阅读](https://arxiv.org/html/2607.14487v1) |
| PDF | [下载](https://arxiv.org/pdf/2607.14487) |
| **发布时间** | 2026-07-16（arXiv v1） |
| 项目页 | [midas-hand.com](https://midas-hand.com) |
| 源码 | 🌟 [midas-hand-org](https://github.com/midas-hand-org)（硬件设计文件 + 软件栈全开源，CC BY 4.0） |
| ├ 硬件控制 API | [midas_hand_api](https://github.com/midas-hand-org/midas_hand_api) |
| ├ 仿真模型 | [midas_hand_mujoco](https://github.com/midas-hand-org/midas_hand_mujoco) |
| ├ 重定向 | [midas_hand_retargeter](https://github.com/midas-hand-org/midas_hand_retargeter) |
| └ 遥操作 | [midas_hand_teleop](https://github.com/midas-hand-org/midas_hand_teleop) |

**作者**：Alvin Zhu、Mingzhang Zhu、Beom Jun Kim、Quanyou Wang、Jose Victor S. H. Ramos、Dennis Hong

**机构**：UCLA RoMeLa（Robotics & Mechanisms Laboratory）

---

## 🎯 一句话总结

灵巧手研究长期被「贵、难造、难修、少触觉」卡住：高性能手动辄上万美元、传动复杂难维护，或牺牲触觉与反驱性能。**MIDAS Hand** 反其道而行——**全部关节直驱（direct-drive）**，牺牲一点力密度换来**极低反驱扭矩（low backdrive）**，让手在接触时能「顺从地让位」而非硬顶；配 **283 个三轴触觉 taxel** 做分布式力感知；整机 **16 自由度（13 主动）**、**700 g**、**BoM < 3000 美元**、**3D 打印 < 3 小时装配**。更关键的是**软硬件全开源**：设计文件、控制/触觉 Python API、MuJoCo 仿真、重定向与遥操作管线一应俱全，把「接触丰富的灵巧操作」变成人人可复现的研究平台。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DoF | Degrees of Freedom | 自由度；MIDAS 共 16，其中 13 为主动驱动 |
| Direct-drive | 直接驱动 | 电机不经高减速比传动直接驱动关节，反驱阻抗低、透明度高 |
| Backdrive torque | 反驱扭矩 | 从关节侧反向推动电机所需扭矩；越低越「顺从」、越安全 |
| Taxel | Tactile Element | 触觉传感单元；MIDAS 用 283 个三轴 taxel 测 [Fx, Fy, Fz] |
| BoM | Bill of Materials | 物料清单成本；MIDAS < 3000 美元 |
| Retargeting | 动作重定向 | 把人手姿态映射为机器人手关节目标 |

---

## ❓ 论文要解决什么问题？

灵巧操作研究长期受限于手的硬件：现有平台往往在**四个目标间只能取其一二**——

1. **人手尺寸形态**（能装进人形、复用人类先验/演示）；
2. **易制造与易维护**（研究者能自己造、坏了能修）；
3. **触觉感知**（接触丰富任务离不开分布式力反馈）；
4. **可负担成本**（不至于一只手上万美元、限制规模化）。

高端商用手贵且封闭；低成本手常缺触觉或反驱性能差、接触时「硬顶」易损坏。**MIDAS 的目标是把这四点同时做到「够用」**，并以完全开源的软硬件降低复现门槛。

---

## 🔧 方法拆解：MIDAS 的设计取舍

### 1. 直驱 + 低反驱：用力密度换「透明度」
- 关节由 **Dynamixel 伺服直接驱动**，不引入高减速比传动；
- 代价是峰值力密度较低，收益是**极低反驱扭矩**——手在接触中能被外力反向推动，实现**接触顺从**而非刚性硬顶；
- 默认工作在 **current-based position control（模式 5）**：仍下发位置目标，但用 Goal Current 作为电流/扭矩上限，负载超限时「让位」，天然适配接触丰富操作。

### 2. 分布式触觉：283 个三轴 taxel
- 集成 **Paxini 触觉模组**，四指分布式感知；
- API `read_tactile()` 按手指返回力向量字典，每指给出多点 **[Fx, Fy, Fz]（单位 N）**。

### 3. 易造易修：3D 打印 + 模块化
- **3D 打印零件**为主，**< 3 小时**完成装配；
- 模块化结构 + 串行总线接线，维护/更换简单。

### 4. 全开源软件栈（四件套）
- **`midas_hand_api`**：硬件控制核心，`MidasHand` 类经 U2D2/USB 走 **Dynamixel Protocol 2.0（4 Mbps）** 通信；
- **`midas_hand_mujoco`**：MuJoCo 仿真模型（含右手模型），可离线验证策略；
- **`midas_hand_retargeter`**：人手姿态 → 关节目标的重定向；
- **`midas_hand_teleop`**：MediaPipe 视觉 → 重定向 → API 的端到端遥操作，**硬件后端以固定频率（默认 50 Hz）插值下发指令**，视觉帧只更新目标。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    GOAL["🎯 设计目标：同时兼顾<br/>人手形态 · 易造易修 · 触觉 · 低成本"]

    subgraph HW["🖐️ 硬件"]
        DD["直驱关节 (Dynamixel)<br/>低反驱扭矩 → 接触顺从"]
        TAC["283 个三轴触觉 taxel<br/>四指分布式 [Fx,Fy,Fz]"]
        PRINT["3D 打印 · 模块化<br/>16 DoF(13 主动) · 700g · <3h 装配"]
    end

    subgraph SW["💻 开源软件栈"]
        API["midas_hand_api<br/>current-based 位置控制(模式5)"]
        SIM["midas_hand_mujoco<br/>仿真验证"]
        RETG["midas_hand_retargeter<br/>人手→关节目标"]
        TELE["midas_hand_teleop<br/>MediaPipe→重定向→API, 50Hz"]
    end

    OUT["📦 BoM <3000 美元 · 全开源(CC BY 4.0)<br/>接触丰富操作的可复现研究平台"]

    GOAL --> HW
    GOAL --> SW
    DD --> OUT
    TAC --> OUT
    PRINT --> OUT
    API --> OUT
    SIM --> OUT
    RETG --> OUT
    TELE --> OUT

    style HW fill:#eef6ff,stroke:#2e86de
    style SW fill:#fff7e0,stroke:#d4a017
    style OUT fill:#eafaf1,stroke:#27ae60
</div>

---

## 🧑‍💻 源码运行时序图（mermaid）

> 基于开源仓库 [midas-hand-org](https://github.com/midas-hand-org)：遥操作入口 `midas-hand-teleop` 控制台命令编排全流程；视觉用 **MediaPipe** 抽手部关键点，经 `midas_hand_retargeter` 转关节目标，再由 `midas_hand_api` 的 `MidasHand`（走 Dynamixel Protocol 2.0）下发；硬件后端跑**独立固定频率命令环**（默认 50 Hz）做插值，视觉帧只更新目标。触觉经 `PaxiniHandSensor` 读回四指 [Fx,Fy,Fz]。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 操作者
    participant CAM as 摄像头 + MediaPipe
    participant RT as midas_hand_retargeter
    participant TL as midas-hand-teleop (编排)
    participant API as MidasHand (midas_hand_api)
    participant HW as Dynamixel 电机 (Protocol 2.0, 4Mbps)
    participant TAC as PaxiniHandSensor

    U->>TL: 启动 midas-hand-teleop
    TL->>API: HandConfig.load() → with MidasHand(...) as hand
    API->>HW: configure(enable_torque=True), 设电流/运动 profile
    TL->>U: 中性位标定 (按 'c')

    loop 遥操作循环
        CAM-->>TL: 手部关键点 (视觉帧)
        TL->>RT: 人手姿态 → 关节目标
        RT-->>TL: 13 维关节目标 (含手性校正)
        TL->>API: set_positions(targets) 更新目标
        loop 硬件固定频率命令环 (默认 50Hz)
            API->>HW: 插值下发位置 + Goal Current 限扭 (模式5)
            HW-->>API: 超载则让位 (低反驱, 接触顺从)
        end
        API->>TAC: read_tactile()
        TAC-->>API: {finger: (N,3) [Fx,Fy,Fz]}
        API-->>TL: 关节状态 / 触觉反馈
    end
</div>

---

## 💡 核心贡献

1. **一只「四目标兼顾」的灵巧手**：人手尺寸形态、易造易修、分布式触觉、可负担成本，同时做到够用；
2. **直驱 + 低反驱的接触哲学**：牺牲力密度换低反驱扭矩，用「current-based 位置控制」让手在接触时顺从让位，适配接触丰富操作且更安全；
3. **分布式三轴触觉**：283 个 taxel 覆盖四指，提供逐点 [Fx,Fy,Fz] 力反馈；
4. **软硬件全开源**：设计文件 + 控制/触觉 Python API + MuJoCo 仿真 + 重定向 + 遥操作管线（CC BY 4.0），把复现门槛降到「3D 打印 + < 3 小时装配 + < 3000 美元」；
5. **完整表征数据**：给出工作空间、抓取分类、负载测试、反驱性可量化指标，便于横向对比。

---

## 📊 关键指标

| 维度 | 数值 |
|---|---|
| 自由度 | 16 DoF（13 主动） |
| 触觉 | 283 个三轴 taxel（四指分布式，[Fx,Fy,Fz]） |
| 重量 | 700 g |
| 成本 | BoM < 3000 美元 |
| 驱动方式 | 直驱（Dynamixel），低反驱扭矩 |
| 控制模式 | current-based 位置控制（模式 5，位置 + 电流上限） |
| 通信 | Dynamixel Protocol 2.0，4 Mbps，U2D2/USB |
| 制造 / 装配 | 3D 打印 · < 3 小时装配 |
| 遥操作频率 | 硬件端默认 50 Hz 插值命令 |
| 许可 | CC BY 4.0（软硬件开源） |

> ⚠️ 上表数值取自论文 v1 与项目页，具体以正式版/仓库最新为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **降低灵巧操作门槛** | 3D 打印 + < 3000 美元 + 全开源，让接触丰富操作研究可规模化复现 |
| **接触友好硬件** | 低反驱 + 电流限扭把「顺从」写进硬件，减少接触硬顶损坏、利于 sim-to-real 与安全交互 |
| **触觉 × 学习闭环** | 分布式触觉 + 现成 MuJoCo/遥操作管线，方便采集人类演示、训练触觉策略 |

---

## 🔗 相关阅读

- [OSMO: Open-Source Tactile Glove for Human-to-Robot Skill Transfer (arXiv 2512.08920)](https://arxiv.org/abs/2512.08920)：开源触觉手套做人到机技能迁移（本模块，触觉采集侧）
- [MCR-Bionic Hand: Anatomical Structural Priors for Dexterous Manipulation (arXiv 2606.13601)](https://arxiv.org/abs/2606.13601)：用解剖结构先验做仿生手（本模块，另一条「机械先验」路线）
- [Antagonistic Bowden-Cable Actuation of a Lightweight Robotic Hand (arXiv 2512.24657)](https://arxiv.org/abs/2512.24657)：拮抗鲍登线驱动的轻量手（本模块，对比传动方案）
- [Human-Level Actuation for Humanoids (arXiv 2511.06796)](https://arxiv.org/abs/2511.06796)：从驱动能力角度量化人形硬件上限（本模块）
