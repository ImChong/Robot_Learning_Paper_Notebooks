---
layout: paper
paper_order: 3
title: "Fauna Sprout: A lightweight, approachable, developer-ready humanoid robot"
zhname: "Fauna Sprout：一款轻量、亲和、开发者友好的人形机器人开发平台"
category: "硬件设计"
---

# Fauna Sprout: A lightweight, approachable, developer-ready humanoid robot
**Fauna Sprout：一款轻量、亲和、开发者友好的人形机器人开发平台**

> 📅 阅读日期: 2026-05-24
>
> 🏷️ 板块: 12 Hardware Design · 软体外壳 / 顺应控制 / 开发者平台
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2601.18963](https://arxiv.org/abs/2601.18963) |
| HTML | [在线阅读](https://arxiv.org/html/2601.18963v1) |
| PDF | [下载](https://arxiv.org/pdf/2601.18963) |
| 技术报告（厂商镜像） | [Fauna Robotics Technical Report (PDF)](https://cdn.prod.website-files.com/6931911db0300aa6e7e3fc81/6977d45ede8301c558098bf9_Fauna_Robotics_Technical_Report.pdf) |
| 产品页 | [Sprout Creator Edition](https://faunarobotics.com/product) |
| 公司主页 | [Fauna Robotics（NYC）](https://faunarobotics.com/) |
| **发布时间** | 2026-01-26 (arXiv) |
| 源码 | ⚠️ 截至当前未发布开源仓库，仅提供 Python / C++ SDK 给"Creator Edition"用户；兼容 Isaac Sim / Isaac Lab / Gazebo / MuJoCo |
| 提交日期 | 2026-01 |

**作者**：Fauna Robotics Team（团队署名，纽约）。

**定位**：面向研究者与开发者的**轻量化人形开发平台**，强调安全、表达力与开发者易用性，而非工业搬运负载。

---

## 🎯 一句话总结

Sprout 把"**在共享人类空间里安全、表达丰富、上手即用**"放在硬件设计的最前面：用 **22.7 kg / 107 cm 的轻量身体 + 软外壳 + 顺应电机 + 受限关节扭矩**，配上 **VR 遥操作 + Isaac Lab 训练的全身 RL 策略 + 360° 面部 LED 表情头**，做成一台"开箱即开发"的人形机器人。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DOF | Degree of Freedom | 自由度 |
| WBC | Whole-Body Control | 全身控制 |
| ToF | Time-of-Flight | 飞行时间测距（深度/避障传感） |
| VR | Virtual Reality | 虚拟现实（这里指 Meta Quest 3 沉浸式遥操作） |
| SDK | Software Development Kit | 软件开发工具包（提供 Python / C++ API） |
| RL | Reinforcement Learning | 强化学习 |

---

## ❓ 这篇技术报告要解决什么问题？

近两年人形赛道的硬件平台分化越来越明显：

- 一端是 **Atlas / Optimus / G1 / GR1 / H1** 这类"高性能 + 高扭矩"的产业级平台，跑得快、能搬重物，但**离人太"硬"**——20 kg 起的躯干、几百牛米的关节扭矩，部署到办公室 / 家庭 / 课堂里就很难"敢让它和人共处一室"；
- 另一端是各种科研级原型机，**性能足够但调试门槛、维护成本、安全性都不友好**。

Sprout 想填的就是中间这条缝：**做一台开发者一上手就敢在身边跑、价格和重量都能进高校 / 工作室 / 家庭实验场景**的人形开发平台，把研究关注点从"先解决摔坏 / 撞人 / 调电池"提前到"直接做策略 / 数据采集"。

---

## 🧱 硬件一览

| 维度 | 参数 | 备注 |
|---|---|---|
| **身高** | 107 cm | 接近 5 岁儿童身高，"非威胁性"是设计意图 |
| **体重** | 22.7 kg | 远低于 G1(~35 kg) / H1(~47 kg)，撞击动能小 |
| **总自由度** | **29 DOF**（含主动眉毛） | 表达力 = 显式硬件资源 |
| 手臂 | 6 DOF × 2，**地板–台面**可达 | 适合家居 / 桌面 loco-manipulation |
| 腿 | 5 DOF × 2，**顺应** | 双足慢速、低冲击 |
| 颈部 | 2 DOF | 表达性凝视 |
| 头部其他 | 360° 全彩**面部 LED 阵列 + 电动眉毛** | 用于社交交互、状态指示 |
| 执行器 | **背驱（backdrivable）电机 + 软件限扭 + 电流限幅** | 关节遇外力会"让"开 |
| 外壳 | 软质包裹 + 钝化的边缘几何 | 削减夹点 / 撞点 |
| 计算 | **NVIDIA Jetson AGX Orin 64GB** | 整机感知 / 规划 / 高层决策 |
| 主感知 | **ZED 2i 双目立体相机** | 深度 + RGB |
| 辅助感知 | **4 颗 ToF 测距 + IMU + 4 麦克风阵列** | 近场避障、姿态、语音 |
| 末端 | 集成简化夹爪 | 配合 VR 遥操作做模仿数据采集 |
| 电池 | **可热插拔 / 续航 3–3.5 h** | 不打断开发节奏 |

> 📌 关键设计取舍：**不追求"奔跑 / 跳跃 / 搬重物"，主动让出动力学上限去换"撞到人不会受伤"**。这与 H1 / G1 / Atlas 的设计哲学是相反方向。

---

## 🧠 软件栈与控制

Sprout 提供一个**统一的硬件–软件栈**，把研究中最常拆开来做的几件事整合进同一台机器：

1. **WBC 全身控制**：每个控制模式（行走 / 蹲下 / 爬行 / 跳舞 / 手臂任务等）背后挂**一条或多条 RL 策略**，由参数化的命令接口触发；
2. **策略观测**：短段历史的本体感知 + IMU + 上一动作；输出**中间控制目标**，再交由**底层 PD + 电流限幅 + 功率约束**执行，保留硬件保护与顺应性；
3. **训练管线**：**全部策略在 Isaac Sim + Isaac Lab 内训练**，再 sim-to-real；
4. **VR 遥操作**：兼容 **Meta Quest 3**，沉浸式直接驱动 Sprout 末端 / 全身做精细任务，**主要目的是数据采集 → 模仿学习**；
5. **开发接口**：**Python / C++ SDK**，并支持 Isaac Sim / Gazebo / MuJoCo 三种主流仿真器一键对接；
6. **预置行为**：开机即可走、跪、爬、跳舞——降低"先跑通基本动作"的隐藏成本。

> 📌 这套栈对研究者最重要的特点是：**底层安全机制（顺应控制、限扭、限流）是平台内置的、不由用户策略保证**——意味着即使训练中的策略输出离谱动作，硬件层也不会立即"打到人"。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DESIGN["🎯 设计哲学 Design Principles"]
        D1["Lightweight<br/>轻量化（22.7 kg）"]
        D2["Approachable<br/>儿童身高 + 软外壳"]
        D3["Developer-ready<br/>开箱即开发"]
    end

    subgraph HW["🦴 硬件 Hardware"]
        H1["29 DOF 全身<br/>6×2 臂 / 5×2 腿 / 2 颈 / 面部"]
        H2["背驱电机<br/>软件限扭 + 限流"]
        H3["软外壳 + 钝化几何<br/>削减夹点"]
        H4["可热插拔电池<br/>3-3.5 h 续航"]
    end

    subgraph SENSE["👀 感知 Sensing"]
        S1["ZED 2i 立体相机"]
        S2["4× ToF 测距"]
        S3["IMU"]
        S4["4-mic 麦克风阵列"]
        S5["360° 面部 LED + 电动眉毛<br/>(输出/表达)"]
    end

    subgraph COMPUTE["🧠 计算 Compute"]
        C1["NVIDIA Jetson<br/>AGX Orin 64GB"]
        C2["电机控制器<br/>实时控制环（以太网下发）"]
    end

    subgraph SW["⚙️ 软件 Software Stack"]
        SW1["WBC 多模式策略<br/>(走/跪/爬/舞/操作)"]
        SW2["底层 PD + 限流 + 限功率"]
        SW3["VR 遥操作<br/>(Meta Quest 3)"]
        SW4["Python / C++ SDK"]
    end

    subgraph TRAIN["🧪 训练管线 Training"]
        T1["Isaac Sim"]
        T2["Isaac Lab 训练框架"]
        T3["sim → real 部署到 Sprout"]
    end

    DESIGN --> HW
    DESIGN --> SW
    HW --> SENSE
    HW --> COMPUTE
    COMPUTE --> SW
    SW1 --> SW2
    SW2 --> H2
    SW3 -- "数据采集→模仿学习" --> SW1
    T1 --> T2 --> T3 --> SW1

    style DESIGN fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style HW fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style SENSE fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style COMPUTE fill:#f3e8ff,stroke:#8e44ad,color:#3d0f5a
    style SW fill:#ffe8ec,stroke:#c0392b,color:#5a1010
    style TRAIN fill:#e0f7fa,stroke:#0097a7,color:#003f47
</div>

---

## 💡 核心贡献

1. **平台层面**：把"**安全性 + 表达力 + 开发者友好**"作为人形硬件设计的核心约束，给出一个完整可买到的实现，而不是论文级原型；
2. **硬件层面**：用**轻量化身体 + 软外壳 + 背驱关节 + 受限关节扭矩**把"撞到人"造成伤害的概率压到一个研究室能接受的水平；
3. **软件层面**：提供**统一的 WBC + VR 遥操作 + Isaac Lab 训练管线**，让"采数据 → 训策略 → 真机部署"在同一台机器同一个 SDK 上闭环；
4. **社交表达**：**360° 面部 LED + 主动眉毛 + 颈部凝视**第一次把"表情/凝视"作为人形硬件的一等公民，而不是事后贴的屏幕。

---

## 📊 与"产业级人形"的对比

| 维度 | H1 / G1 / Optimus / Atlas | **Fauna Sprout** |
|---|---|---|
| 身高 / 体重 | 165–190 cm / 35–80 kg | **107 cm / 22.7 kg** |
| 关节扭矩 | 高（hundreds N·m） | **受限**（顺应 + 限流 + 限功率） |
| 主目标场景 | 物流 / 工厂 / 户外 | **办公室 / 家庭 / 课堂 / 研究室** |
| 表达模块 | 无 / 屏幕代替 | **360° LED 面 + 主动眉毛 + 凝视** |
| 安全策略 | 主要靠"远离人" | **本征硬件柔顺 + 软外壳** |
| 开发栈 | 厂商各自 SDK | **统一栈 + 三仿真器 + VR 遥操作** |
| 适合做的研究 | 高动态 / 重负载 | **HRI / loco-manipulation / 模仿学习数据采集** |

> 📌 Sprout 不是"小一号的 H1"，**它是一条不同的产品线**：把动力学上限主动让出去，换接近人的可部署性。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **人形 HRI 研究** | 首次有一台"敢和人长时间共处"的可量产开发平台 |
| **模仿学习** | VR 遥操作 + 顺应硬件 = 高质量、低风险的人形动作数据采集源 |
| **教学 / 入门** | 22.7 kg + 软外壳 + 统一 SDK，把人形从"实验室仪器"压到"课程器材"门槛 |
| **社交机器人复兴** | 360° 面部 LED + 表情头，让"表达力"重新成为评估人形机器人的一个独立维度 |
| **安全-性能权衡范式** | 给行业一个"先把安全做满，再谈性能扩展"的反向样本 |

---

## 🎤 面试参考

**Q：Sprout 跟 Unitree G1 / H1 最大区别是什么？**
A：**设计目标不同**。G1 / H1 是"通用全尺寸高动态平台"，关节扭矩高、动能大，更适合工业/户外场景；Sprout 是"在共享人类空间里安全开发的平台"——107 cm / 22.7 kg / 软外壳 / 受限关节扭矩 / 顺应控制 / 表情头，**主动把动力学上限让出**以换可部署性和 HRI 友好度。

**Q：Sprout 的控制是怎么做的？**
A：**多模式 RL 策略 + 底层 PD/限流/限功率 + 顺应硬件**。每种行为（走/跪/爬/舞/抓取）对应若干在 Isaac Sim + Isaac Lab 内训练的 RL 策略，输出中间控制目标，再被硬件层和实时电机控制器约束执行。VR 遥操作主要用于采集人类示教数据反哺策略。

**Q：为什么要把面部 LED 和电动眉毛当作硬件去做？**
A：因为 HRI 实验反复证明**机器人的"凝视方向 + 面部状态"是人类协作中最强的隐含通信通道之一**。把这些信号交给硬件，比贴一块屏幕更可信、更易和身体动作同步、也更容易在脏 / 暗 / 远距离条件下被人类看见。

**Q：Sprout 适合训 sim-to-real 吗？**
A：适合。**所有底层策略都是在 Isaac Sim + Isaac Lab 中训练并部署**到真机的，仿真器还兼容 Gazebo / MuJoCo；同时硬件本征顺应，sim-to-real 时的"硬撞硬"风险显著低于刚性大扭矩平台。

**Q：会不会因为受限扭矩，导致很多人形动作（跑步、跳跃、搬重物）做不了？**
A：会，且这是**明确的设计取舍**。Sprout 的目标受众是 HRI / 模仿学习 / 教育研究者，不是仓储工厂工程师；论文也坦承动力学上限被主动让出以换安全与亲和。

---

## 🔗 相关阅读 / 类似平台

- [Berkeley Humanoid Lite (arXiv 2504.17249)](https://arxiv.org/abs/2504.17249)：3D 打印开源低成本人形（本仓库 #430）
- [ToddlerBot (arXiv 2502.00893)](https://arxiv.org/abs/2502.00893)：开源 ML-friendly 小人形（#435）
- [Berkeley Humanoid (arXiv 2407.21781)](https://arxiv.org/abs/2407.21781)：研究人形参考平台（#446）
- [AGILOped (arXiv 2509.09364)](https://arxiv.org/abs/2509.09364)：开源敏捷人形研究平台（#423）
- [Human-Level Actuation for Humanoids (arXiv 2511.06796)](https://arxiv.org/abs/2511.06796)：人级关节驱动器设计（#417）

---

> 备注：本笔记以 arXiv 元信息、Fauna Robotics 官方产品页 / 技术报告 PDF、Humanoids Daily / The Robot Report / heise online 等公开报道整理；自动化抓取 arXiv 全文 / Wiley 镜像临时 403，所有数值以厂商公开规格为准。截至当前 Fauna 尚未开放完整源码仓库，仅以 SDK 形式向 Creator Edition 用户分发；后续若释放公开训练代码或 URDF，可补充到「源码」一栏。
