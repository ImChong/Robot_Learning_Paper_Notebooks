---
layout: paper
title: "Deep Imitation Learning for Humanoid Loco-manipulation through Human Teleoperation"
zhname: "TRILL：通过人类遥操作的人形移动操作深度模仿学习"
category: "Teleoperation"
arxiv: "2309.01952"
---

# Deep Imitation Learning for Humanoid Loco-manipulation through Human Teleoperation (TRILL)
**用 VR 遥操作低成本采集人形「移动 + 操作」演示，再以模仿学习训练端到端视觉运动策略：策略在任务空间以 20 Hz 输出高层指令，交给全身控制器（WBC）以 100 Hz 转成关节力矩并稳定动力学，从而在高自由度双臂人形 DRACO 3 上完成取放工具、拧喷雾盖等真机移动操作任务**

> 📅 阅读日期: 2026-09-05
>
> 🏷️ 板块: 07 Teleoperation · VR 遥操作 / 深度模仿学习 · 全身控制 · 移动操作 · 高自由度人形
>
> 🔁 推进轨: 模块轮转（06_Manipulation → 07_Teleoperation）· 优先该模块最新发表且尚无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2023 年 9 月（arXiv v1，2023-09-05）· v2 2023-11-19 · **IEEE-RAS Humanoids 2023**（最佳论文奖入围 · WBC 技术委员会） |
| arXiv | [2309.01952](https://arxiv.org/abs/2309.01952) · [PDF](https://arxiv.org/pdf/2309.01952) · [HTML](https://arxiv.org/html/2309.01952v2) |
| 项目页 | [ut-austin-rpl.github.io/TRILL](https://ut-austin-rpl.github.io/TRILL) |
| 源码 | ✅ 已开源 [UT-Austin-RPL/TRILL](https://github.com/UT-Austin-RPL/TRILL)（含仿真环境、遥操作采集、模仿学习训练与回放，Robosuite/MuJoCo） |
| 作者 | Mingyo Seo、Steve Han、Kyutae Sim、Seung Hyeon Bang、Carlos Gonzalez、Luis Sentis、Yuke Zhu |
| 单位 | 德州大学奥斯汀分校（UT Austin）机器人感知与学习实验室 RPL × 人本机器人实验室 HCRL |
| 主题 | cs.RO · 人形遥操作 / 模仿学习 / 全身控制 / 移动操作 |

> 来源：07_Teleoperation 模块最新发表且尚无笔记的一篇（本模块 2026 年新论文均已建笔记，按「已有内容则跳过」规则顺延到本篇）。

---

## 🎯 一句话总结

> 高自由度人形想做「边走边操作（loco-manipulation）」，但**演示难采、策略难训**：直接遥控几十个关节对操作者认知/体力负担极大，硬采关节轨迹也不利于学习。**TRILL** 的思路是把人放在一个**直觉的 VR 界面**里，只需指挥双手末端与视角这种**任务空间高层指令**，底层由**全身控制器 WBC** 负责把指令翻译成稳的关节力矩；采集到的演示用**模仿学习**训练出一个从**双目相机 + 本体感觉**直接输出任务空间指令的视觉运动策略，在仿真与真机 DRACO 3 上完成多种移动操作任务。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| TRILL | 本文系统名（Teleoperation & Imitation Learning for Loco-manipulation） |
| Loco-manipulation | 移动操作，行走/移动与手臂操作耦合的任务 |
| WBC | Whole-Body Control，全身控制，把任务空间指令转成满足动力学/约束的关节力矩 |
| IL / BC | Imitation Learning / Behavior Cloning，模仿学习 / 行为克隆 |
| DoF | Degree of Freedom，自由度 |
| Task-space | 任务空间（末端位姿等），相对「关节空间」的高层抽象 |
| Robosuite | 基于 MuJoCo 的机器人操作仿真框架 |
| DRACO 3 | UT Austin 研制的双臂人形机器人 |

---

## ❓ 论文要解决什么问题？

给高自由度人形做「移动操作」技能，卡在两处：

- **演示采集难**：人形有几十个自由度，若让操作者直接遥控所有关节，认知与体力负担极大、难以采到高质量演示；
- **策略学习难**：直接在**关节空间**做模仿学习，动作维度高、与动力学约束纠缠，样本效率低、易学崩。

论文要回答：**能否设计一套「直觉 VR 遥操作 + 全身控制 + 任务空间抽象」的闭环，让演示采集变轻松、模仿学习变数据高效，从而在真机人形上学会走+操作耦合的技能？**

---

## 🔧 方法详解

### 1. 直觉的 VR 遥操作界面
操作者戴 VR，只需给出**任务空间高层指令**（双手末端目标位姿、朝向/视角等），而非逐关节遥控，显著降低「人开人形」的认知与物理负担，便于规模化采集移动操作演示。

### 2. 全身控制（WBC）做底座
一个全身控制器把人给出的**任务空间指令**转换为机器人的**关节力矩驱动**，同时**稳定动力学**并遵守机器人约束（关节限位、接触、平衡）。这样上层只需关心「要做什么」，下层负责「怎么稳稳地做」。

### 3. 面向移动操作的高层动作抽象
为人形移动操作**量身定制的高层动作抽象**（把「移动 + 双臂操作」组织成便于学习的任务空间指令），让模仿学习**数据高效**地获得复杂的感知—运动技能。

### 4. 模仿学习策略（视觉运动）
用采到的演示训练神经网络策略：输入**机载双目相机观测 + 本体感觉状态**，以 **20 Hz** 输出任务空间指令；这些指令再交给 WBC，以 **100 Hz** 执行为关节力矩。策略与控制器的**双频分层**（20 Hz 决策 / 100 Hz 控制）是实时闭环的关键。

### 5. 仿真 + 真机验证
在 **Robosuite（MuJoCo）** 仿真环境采集/训练，并迁移到真机人形 **DRACO 3** 执行多种移动操作任务（自由行走、灵巧操作、取放工具、拧喷雾盖等）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑 操作者<br/>VR 头显 + 手柄"] -->|"任务空间高层指令<br/>(末端位姿/视角)"| WBC1["全身控制 WBC<br/>任务空间→关节力矩<br/>稳定动力学 · 100Hz"]
    WBC1 --> ROBOT1["🤖 人形 DRACO 3 / 仿真"]
    ROBOT1 -->|"双目相机 + 本体状态"| DEMO["📦 演示数据集<br/>(观测–任务空间指令)"]

    DEMO --> IL["模仿学习训练<br/>视觉运动策略<br/>面向移动操作的高层抽象"]

    subgraph DEPLOY["部署闭环"]
      OBS["双目相机 + 本体感觉"] --> POLICY["策略网络<br/>输出任务空间指令 · 20Hz"]
      POLICY --> WBC2["全身控制 WBC<br/>关节力矩 · 100Hz"]
      WBC2 --> ROBOT2["🤖 执行移动操作"]
      ROBOT2 --> OBS
    end
    IL --> POLICY

    style OP fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style IL fill:#eafaf1,stroke:#27ae60,color:#145a32
    style POLICY fill:#eafaf1,stroke:#27ae60,color:#145a32
    style WBC1 fill:#fff5e6,stroke:#e67e22,color:#7e3f00
    style WBC2 fill:#fff5e6,stroke:#e67e22,color:#7e3f00
</div>

---

## 📊 关键结果

| 任务 | 场景 | 成功率 |
|---|---|---|
| 自由行走 | 仿真 | **96%** |
| 灵巧操作 | 仿真 | **80%** |
| 移动操作（走+操作耦合） | 仿真 | **92%** |
| 取放工具 pick-and-place | 真机 · 10 次 | **80%** |
| 拧下喷雾盖 spray cap removal | 真机 · 10 次 | **90%** |

> 结论：任务空间抽象 + WBC 底座让高自由度人形的移动操作演示**易采、易学**，并成功迁移到真机 DRACO 3。

---

## 💡 核心贡献

1. **TRILL 系统**：面向人形移动操作的「VR 遥操作 → 全身控制 → 模仿学习」端到端闭环；
2. **任务空间遥操作**：VR 界面让操作者只给高层末端/视角指令，大幅降低采集负担、利于规模化；
3. **WBC 作为可学习底座**：把任务空间指令稳定地翻译为关节力矩，让上层策略无需操心动力学约束；
4. **数据高效的移动操作抽象**：为「走 + 操作」定制的高层动作抽象，提升模仿学习样本效率，真机可用。

---

## 🤖 对人形机器人学习的启发

- **「任务空间 + WBC」是高自由度学习的天然解耦点**：让策略在低维、语义清晰的任务空间学习，底层稳定交给 WBC，是遥操作/模仿学习在人形上落地的通用范式；
- **遥操作界面的直觉性直接决定数据规模与质量**：降低操作者负担 = 能采到更多更好的移动操作演示；
- **双频分层（20 Hz 决策 / 100 Hz 控制）** 为「视觉策略 + 力矩控制」实时闭环提供了工程模板；
- 与后续 TWIST、Mobile-TeleVision、Teleopit 等全身遥操作/模仿工作一脉相承——TRILL 是把「移动操作」纳入遥操作模仿学习的较早代表作之一。

---

## 🧩 源码运行时序图（mermaid）

> 基于开源仓库 [UT-Austin-RPL/TRILL](https://github.com/UT-Austin-RPL/TRILL) 的模块划分（`simulator` / `pnc`(WBC) / `mimic`+`models`(IL) / `scripts` / `configs`）整理的**采集 → 训练 → 回放**运行时序（示意，具体入口以仓库 `docs` 的 Getting Started / Implementation Details 为准）。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 🧑 操作者(VR)
    participant SC as scripts(采集/训练/回放)
    participant SIM as simulator(Robosuite/MuJoCo)
    participant WBC as pnc(全身控制)
    participant DS as 演示数据集(hdf5)
    participant IL as mimic+models(模仿学习)
    participant POL as 策略网络

    Note over U,WBC: ① 遥操作采集演示
    U->>SC: 运行采集脚本(VR 任务空间指令)
    SC->>SIM: 初始化环境(configs: 门/工作台等)
    loop 每个演示回合
        U->>WBC: 末端位姿/视角高层指令
        WBC->>SIM: 解算关节力矩(100Hz) 并施加
        SIM-->>SC: 双目图像 + 本体状态
        SC->>DS: 写入(观测, 任务空间指令)对
    end

    Note over SC,IL: ② 训练视觉运动策略
    SC->>IL: 运行训练脚本(读取 DS)
    IL->>POL: 优化 BC 目标, 保存 checkpoint

    Note over SC,SIM: ③ 回放/评估
    SC->>POL: 加载 checkpoint
    loop 部署闭环
        SIM-->>POL: 双目图像 + 本体状态
        POL->>WBC: 任务空间指令(20Hz)
        WBC->>SIM: 关节力矩(100Hz)
        SIM-->>SC: 统计成功率/回合结果
    end
</div>

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2309.01952](https://arxiv.org/abs/2309.01952) | 论文正文（VR 遥操作、WBC、任务空间抽象、模仿学习、真机实验） |
| [PDF](https://arxiv.org/pdf/2309.01952) · [HTML](https://arxiv.org/html/2309.01952v2) | 原文 PDF / 网页版 |
| [项目页](https://ut-austin-rpl.github.io/TRILL) | 视频、任务演示、方法概览 |
| [GitHub UT-Austin-RPL/TRILL](https://github.com/UT-Austin-RPL/TRILL) | 开源代码：仿真环境、遥操作采集、模仿学习训练/回放（Robosuite 1.4 · Robomimic · PyTorch） |

> ℹ️ 备注：本笔记依据 arXiv 摘要、项目页与开源仓库信息整理；**逐项数值/入口脚本以原文与仓库文档为准**。源码运行时序图为基于目录结构的示意。

---

## 🔗 相关阅读

- **同模块·遥操作全身模仿底座**：[TWIST: Teleoperated Whole-Body Imitation System](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)；
- **同模块·沉浸式视觉反馈遥操作**：[Mobile-TeleVision: Predictive Motion Priors for Humanoid Whole-Body Control](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)；
- **同模块·全体感遥操作系统**：[Teleopit: A Full-Embodiment Humanoid Teleoperation System](../Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System/Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System.html)。
