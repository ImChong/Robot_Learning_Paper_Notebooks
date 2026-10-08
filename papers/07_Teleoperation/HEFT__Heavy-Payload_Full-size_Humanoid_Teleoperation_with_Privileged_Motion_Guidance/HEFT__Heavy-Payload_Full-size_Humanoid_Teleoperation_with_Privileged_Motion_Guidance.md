---
layout: paper
title: "HEFT: Heavy-Payload Full-size Humanoid Teleoperation with Privileged Motion Guidance and Windowed Payload Curriculum"
zhname: "HEFT：面向重载全尺寸人形的全身遥操作"
category: "Teleoperation"
arxiv: "2607.02332"
---

# HEFT: Heavy-Payload Full-size Humanoid Teleoperation with Privileged Motion Guidance and Windowed Payload Curriculum
**HEFT：面向重载全尺寸人形的全身遥操作**

> 📅 阅读日期: 2026-07-13
>
> 🏷️ 板块: 07 Teleoperation · 全身运动跟踪 · 重载 · 全尺寸人形 · 课程学习
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2607.02332](https://arxiv.org/abs/2607.02332) |
| HTML | [在线阅读](https://arxiv.org/html/2607.02332v1) |
| PDF | [下载](https://arxiv.org/pdf/2607.02332) |
| **发布时间** | 2026-07-02 (arXiv) |
| 项目主页 | [heft.axell.top](https://heft.axell.top/) |
| 源码 | 截至当前论文与项目页未见公开代码仓库 |

**作者**：Chenxin Liu, Qingzhou Lu, Guangxiao Yang, Xuanyang Shi, Chenghan Yang, Yanjiang Guo, Jianyu Chen

**机器人**：L7 全尺寸人形（175 cm / 65 kg / 29 个驱动关节）· 输入为 VR 头显 + 手柄追踪的头/双手位姿

---

## 🎯 一句话总结

现有全身遥操作大多在**小型平台**或**空载**下验证，一旦换成**全尺寸人形 + 真实重物**，更大的惯量与更窄的平衡余量就会让跟踪崩掉。HEFT 针对这两个痛点各出一招：**Privileged Motion Guidance（PMG，特权动作引导）** 用「干净重建的参考」当特权信号训练、却让策略在「带噪 VR 原始流」上练手，从而学会过滤追踪器噪声；**Windowed Payload Curriculum（WPC，窗口化负载课程）** 认识到「可承载重量随动作片段而变」，把动作切成 5 秒窗口、由专家给每个窗口标一个负载上限并渐进加重。最终在 L7 上实现最多 **24kg 重物**下的行走、下蹲、搬举遥操作。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| PMG | Privileged Motion Guidance | 特权动作引导：critic/奖励用干净参考，actor 用带噪 VR 输入 |
| WPC | Windowed Payload Curriculum | 窗口化负载课程：按 5 秒窗口逐段渐进加载 |
| RMA | Rapid Motor Adaptation | 快速运动自适应，teacher-student + adapter 结构 |
| MPJPE | Mean Per-Joint Position Error | 平均每关节位置误差 |
| VR | Virtual Reality | 这里指 VR 头显/手柄作动捕输入 |
| PPO | Proximal Policy Optimization | 近端策略优化 |

---

## ❓ 论文要解决什么问题？

通用运动跟踪 / 遥操作是**规模化获取人形技能**的一条有前景的路，但现有框架几乎都在**小型人形**或**无真实负载交互**的设定下验证，把它们直接搬到**全尺寸人形 + 真实重物**上会遇到两个新难题：

1. **平台放大带来的物理挑战**：全尺寸人形惯量更大、平衡余量更窄，负重时更易失稳，普通跟踪策略扛不住。
2. **VR 追踪信号带噪**：部署时只能拿到原始 VR 流（漂移、延迟、偏置），而训练常用的是干净动捕，训练-部署输入不一致。

HEFT 的答案：用 **PMG** 弥合「带噪部署输入」与「干净训练目标」之间的鸿沟，用 **WPC** 让策略按动作分段稳步学会重载。

---

## 🔧 方法拆解

### 1. 数据准备与离线重建
- 动捕库（SEED / 100STYLE / LaFAN1）与 VR 遥操作数据**配对**。
- 用 **RoHM 扩散模型**离线清洗 VR 伪影，为每段 VR 片段生成对齐的「原始 (raw) + 重建 (clean)」两份序列。

### 2. Privileged Motion Guidance（解决「带噪」）
- **非对称 actor-critic**：actor 只看**带噪 VR 参考** `S_raw`；critic 与奖励用**干净重建参考** `S_clean`。
- 策略因此在**真实部署输入**上练手，却被干净信号「引导」学会过滤追踪器噪声。
- 效果：VR 动作上根位置误差 0.544m（G1），显著优于 TWIST2 的 0.99m；干净参考下 MPJPE 0.021m（vs TWIST2 0.061m）。

### 3. Windowed Payload Curriculum（解决「重载」）
- 核心洞见：**可行负载随动作片段变化**，不该全局设一个常数。
- 把动作切成 **5 秒窗口**，由一个「参考跟踪专家」（拿干净参考 + 特权信息）在每个窗口做 rollout，逐步加下压力（30kg 内、每步 5kg），**最大成功负载**即该窗口的负载上限。
- 训练时在各窗口上限内均匀采样负载，并按训练进度缩放（约在 80% 进度达到满强度）；负载施加到双腕、随机分配、绕重力方向 ±12° 锥内扰动。

### 4. Teacher-Student 蒸馏与部署
- **Teacher**：接收特权编码器给出的潜变量 `z_t`（可见干净参考、仿真态、负载、接触）。
- **Student**：只用可部署观测，经 **adapter** 预测潜变量 `ẑ_t`，用 L2 距离监督对齐 teacher。
- 流程：PPO 训 teacher（含 PMG + WPC）→ adapter 潜变量蒸馏 → student 微调。部署时 student + adapter 跑在 L7 硬件上，底层 PD 跟踪关节指令。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📚 数据准备"]
        MOCAP["动捕库<br/>SEED / 100STYLE / LaFAN1"]
        VR["🥽 VR 遥操作数据"]
        ROHM["🌫️ RoHM 扩散重建<br/>清洗 VR 伪影"]
        PAIR["配对: 原始 raw + 干净 clean"]
    end

    subgraph TRAIN["🧠 训练 (PPO)"]
        subgraph PMG["PMG 特权动作引导"]
            ACTOR["🎮 Actor ← 带噪 VR (raw)"]
            CRITIC["⚖️ Critic/奖励 ← 干净 (clean)"]
        end
        subgraph WPC["WPC 窗口化负载课程"]
            WIN["✂️ 5s 窗口切分"]
            EXPERT["🧑‍🏫 专家标注负载上限"]
            RAMP["📈 按进度渐进加载"]
        end
        TEACHER["👨‍🏫 Teacher (特权潜变量 z)"]
        STUDENT["🎓 Student + Adapter (ẑ)"]
    end

    subgraph DEPLOY["🤖 部署 L7 (175cm/65kg)"]
        POLICY["部署策略 (仅可观测)"]
        PD["🦿 底层 PD 关节跟踪"]
        LOAD["🏋️ 最多 24kg 负载<br/>行走 / 下蹲 / 搬举"]
    end

    MOCAP --> PAIR
    VR --> ROHM --> PAIR
    PAIR --> ACTOR
    PAIR --> CRITIC
    WIN --> EXPERT --> RAMP
    ACTOR --> TEACHER
    CRITIC --> TEACHER
    RAMP --> TEACHER
    TEACHER -->|潜变量蒸馏| STUDENT
    STUDENT --> POLICY --> PD --> LOAD

    style DATA fill:#fff7e0,stroke:#d4a017
    style TRAIN fill:#f3e8ff,stroke:#8e44ad
    style PMG fill:#eef6ff,stroke:#2e86de
    style WPC fill:#eafaf1,stroke:#27ae60
    style DEPLOY fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **面向全尺寸 + 重载的遥操作框架**：首次把全身运动跟踪 / 遥操作推到 175cm/65kg 全尺寸人形与真实重物场景。
2. **PMG（特权动作引导）**：非对称 actor-critic，让策略在带噪 VR 输入上训练、由干净参考引导，弥合训练-部署输入鸿沟。
3. **WPC（窗口化负载课程）**：认识到负载可行性随动作分段变化，用专家标注 + 渐进课程实现稳健重载跟踪。
4. **真机验证**：L7 上完成多阶段搬放、10kg 非对称搬运、24kg 壶铃行走/下蹲、举桌、推架等重载任务。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| VR 抗噪（PMG） | VR 动作根误差 0.544m（G1）vs TWIST2 0.99m；干净参考 MPJPE 0.021m vs 0.061m |
| 高动态负载（WPC） | 高动态动作成功率 73%（有专家）vs 64%（无专家） |
| 负载上限 | 20kg≈95%、25kg 90%、30kg 75% 成功率 |
| 对比基线 | 25kg 时 TWIST2+FC 仅 35%、30kg 仅 29%，HEFT 大幅领先 |
| 真机任务 | 24kg 壶铃行走/下蹲、10kg 非对称搬运、举桌、推架等均可完成 |

> ⚠️ 上表数值取自论文 v1，具体以正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **全尺寸 + 重载常态化** | 把遥操作从"小平台空载演示"推向"全尺寸扛真实重物"，更贴近工业/物流落地 |
| **特权信号新用法** | PMG 把"干净重建参考"当特权信号，专治部署端 VR 噪声，可推广到各类带噪追踪输入 |
| **分段课程思想** | WPC 说明课程学习的难度维度（负载）应随动作分段自适应，而非全局常数 |

---

## 🎤 面试参考

**Q：HEFT 与 CLONE / CLOT 这类闭环遥操作的侧重点有何不同？**
A：CLONE/CLOT 主攻"长时序的全局漂移"，靠 LiDAR/里程计闭环校正位置。HEFT 主攻"全尺寸人形 + 真实重载"，核心难点是负重下的平衡与带噪 VR 输入，靠 PMG 抗噪、WPC 渐进加载，而非全局位姿闭环。

**Q：PMG 为什么要让 actor 看带噪、critic 看干净？**
A：部署时只有带噪 VR 流，若训练也只喂干净参考会有分布偏移。让 actor 在带噪输入上练、由干净参考构成的奖励/critic 引导，策略就学会"在噪声里输出接近干净目标的动作"，即隐式去噪。

**Q：为什么负载课程要按窗口而不是全局设一个上限？**
A：同一段轨迹里，站立/慢走能扛很重，但跳跃/高动态段可承载重量骤降。全局取最小值会过于保守、取最大值会在难段失稳。按 5 秒窗口由专家分别标定上限，才能既充分加载又不在难段崩掉。

---

## 🔗 相关阅读

- [CLONE (2506.08931)](https://arxiv.org/abs/2506.08931)：MoE 全身协调 + LiDAR 闭环校正
- [TWIST2 (2510.xxxxx)](https://arxiv.org/abs/2505.02833)：可规模化的全身遥操作数据采集系统（本文主要对比基线）
- [SONIC](https://nvlabs.github.io/SONIC/)：大规模自然全身运动跟踪（对比基线）
- [FALCON](https://arxiv.org/abs/2505.06776)：力课程（force curriculum）思路，WPC 的对照
- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858)：通用全身 H2H 遥操作
