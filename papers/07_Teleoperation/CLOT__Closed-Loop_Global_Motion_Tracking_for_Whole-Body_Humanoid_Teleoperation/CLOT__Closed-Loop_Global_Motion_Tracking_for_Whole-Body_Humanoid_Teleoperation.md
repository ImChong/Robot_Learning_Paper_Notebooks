---
layout: paper
paper_order: 2
title: "CLOT: Closed-Loop Global Motion Tracking for Whole-Body Humanoid Teleoperation"
zhname: "CLOT：用闭环全局动作跟踪做长时序人形遥操作"
category: "Teleoperation"
---

# CLOT: Closed-Loop Global Motion Tracking for Whole-Body Humanoid Teleoperation
**CLOT：用闭环全局动作跟踪做长时序人形遥操作**

> 📅 阅读日期: 2026-05-17
>
> 🏷️ 板块: Teleoperation · 全身控制 · 动作跟踪 · Sim-to-Real
>
> 🔁 推进轨: 模块轮转（06_Manipulation → **07_Teleoperation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.15060](https://arxiv.org/abs/2602.15060) |
| HTML | [在线阅读](https://arxiv.org/html/2602.15060v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.15060) |
| **发布时间** | 2026-02-13 (arXiv) |
| 源码 | [zhutengjie/CLOT](https://github.com/zhutengjie/CLOT) |
| 提交日期 | 2026-02 |

**机构**：上海交通大学 MoE 人工智能重点实验室 · 上海人工智能实验室

**作者**：Tengjie Zhu, Guanyu Cai, Zhaohui Yang, Guanzhu Ren, Haohui Xie, Junsong Wu, ZiRui Wang, Jingbo Wang, Xiaokang Yang, Yao Mu, Yichao Yan

**机器人**：**Adam Pro**（31 DoF，不含手）· **Unitree G1**（23 DoF，锁腕配置）

---

## 🎯 一句话总结

CLOT 把人形遥操作的核心痛点定位在「**长时序全局漂移**」——既有方法都在机器人**局部坐标系**里做动作跟踪，没人闭合全局位姿反馈。CLOT 用**高频定位 + 闭环反馈** + 一个**解耦观测轨迹与奖励评估**的数据级随机化技巧，让人形机器人能在几分钟尺度上**不漂移地**镜像操作者，并在 Adam Pro / G1 上做了 sim-to-real 验证。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| WBC | Whole-Body Control | 全身控制 |
| Teleop | Teleoperation | 遥操作 |
| AMP | Adversarial Motion Priors | 对抗式运动先验（用判别器学风格） |
| DoF | Degrees of Freedom | 关节自由度 |
| MoCap | Motion Capture | 动作捕捉 |
| MLP / Transformer | - | 两种策略 backbone，论文同时支持 |

---

## ❓ 论文要解决什么问题？

主流人形遥操作（H2O / OmniH2O / HumanPlus / Exbody2 等）已经能让机器人镜像人类做出敏捷、协调的全身动作，但当任务**时间被拉长**——例如几十秒到几分钟的长 horizon 操作——一个老大难问题暴露出来：

> **全局位姿漂移**：策略只在机器人**局部坐标系**里跟踪关节/末端，没人把"机器人**全局位置 / 朝向**"闭环反馈给策略，于是误差累积，机器人会逐渐"飘走"。

而朴素地把全局位置塞进观测里，又会带来两个副作用：
1. **奖励反向耦合**：直接惩罚全局误差时，策略容易学到"用躯干乱晃来糊住误差"，破坏跟踪自然度；
2. **Sim-to-real 不稳**：在仿真里的全局观测过拟合到完美定位，到真机噪声 / 漂移就崩。

CLOT 的解法：**闭环把全局位姿喂回去** + **数据级随机化把"观测轨迹"和"奖励参照"解耦**，让策略学会"我看着的是带噪声的全局位姿，但目标是干净的参考"，从而拿到稳定的全局校正能力。

---

## 🔧 方法拆解

### 1. 闭环全局跟踪框架

- 在传统 motion tracking 之上，加一路**高频全局定位反馈**（仿真里直接读，真机用外部定位或视觉惯性融合）。
- 策略观测同时包含：本体感知（关节角/速度/重力投影）+ 参考动作 + **当前全局位姿 vs 参考全局位姿的偏差**。
- 输出是 PD 目标关节角，由全身 PD 控制器执行。

### 2. 数据驱动的随机化（核心 trick）

- **关键洞察**：直接对全局误差惩罚会让策略「为了好看的 reward 做坏的事」。
- CLOT 把**用来生成观测的轨迹**和**用来计算奖励的参考**做**解耦随机化**——观测里塞带扰动的轨迹，奖励仍然按干净参考评估。
- 效果：策略被迫学到"无论观测噪声怎么扰，都要往真参考靠"，得到**平滑而稳健的全局校正**。

### 3. 大规模人类动作数据训练

- 自建/整理了约 **20 小时**精挑细选的人类动作数据，按 ASAP 格式做 retargeting，覆盖 Adam Pro 与 G1。
- 数据范围覆盖高动态动作、长时序行走、原地动作切换等。

### 4. 策略架构 & 训练规模

- 支持 **MLP / MLP+AMP / Transformer** 三种 backbone（仓库提供 `motion_tracking` / `motion_tracking_amp` / `motion_tracking_transformer` 三套配置）。
- 训练规模：**> 1300 GPU·小时**，默认 8× RTX 4090 (48GB) 并行；多仿真器支持（IsaacGym / IsaacSim / MjLab）。

### 5. 真机部署

- 导出 ONNX，在 MuJoCo 与真机上闭环跑。
- 在 **Adam Pro (31 DoF)** 上做了完整 sim-to-real 验证；G1 提供 23 DoF 锁腕的并行 checkpoint。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph OP["🧑 操作者侧"]
        MOCAP["🎥 全身动作捕捉"]
        REF["📜 参考轨迹<br/>(关节 + 全局位姿)"]
    end

    subgraph RAND["🎲 解耦随机化"]
        OBS_TRAJ["🌪️ 观测用扰动轨迹"]
        REW_REF["✨ 奖励用干净参考"]
    end

    subgraph POLICY["🧠 CLOT 策略"]
        ENC["🔁 编码器<br/>MLP / Transformer"]
        ACT["🎯 动作 = PD 关节目标"]
    end

    subgraph LOOP["🔁 闭环全局反馈"]
        GLOB["📍 高频全局定位<br/>(仿真直读 / 真机融合)"]
        ERR["📏 全局位姿误差"]
    end

    subgraph ROBOT["🤖 Adam Pro (31 DoF) / G1"]
        PD["🦾 全身 PD 控制"]
        STATE["📡 本体感知"]
    end

    MOCAP --> REF
    REF --> OBS_TRAJ
    REF --> REW_REF
    OBS_TRAJ --> ENC
    GLOB --> ERR
    ERR --> ENC
    STATE --> ENC
    ENC --> ACT
    ACT --> PD
    PD --> STATE
    PD --> GLOB
    REW_REF -.->|训练时奖励| ENC

    style OP fill:#fff7e0,stroke:#d4a017
    style RAND fill:#e8f4fd,stroke:#1f78b4
    style POLICY fill:#f3e8ff,stroke:#8e44ad
    style LOOP fill:#fde8e8,stroke:#c0392b
    style ROBOT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **首次在人形遥操作里把「全局位姿」闭环化**：定位漂移问题被显式建模并解决，长 horizon 不再"飘"。
2. **数据驱动的解耦随机化**：用一招"观测轨迹 ≠ 奖励参考"绕过全局误差惩罚的耦合陷阱，是论文最具迁移价值的工程 trick。
3. **20 小时精挑动作数据集**：开源，覆盖高动态 + 长时序，供后续工作复用。
4. **多 backbone + 多仿真器开源**：MLP / AMP / Transformer + IsaacGym / IsaacSim / MjLab 全开源。
5. **Adam Pro 全尺寸真机验证**：把方法做到 31 DoF 全尺寸机器人 sim-to-real。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 全局漂移 | 闭环反馈 + 解耦随机化下，长 horizon 全局误差**显著低于**局部跟踪基线 |
| 动作动态性 | 在高动态动作（跳跃 / 快速转身）上仍可保持精度 |
| Sim-to-Real | Adam Pro 真机部署稳定；G1 (23 DoF) checkpoint 可复现 |
| Backbone | Transformer 在大规模数据下相比 MLP 有可见收益 |

> ⚠️ 上表为结构性总结，具体数值与对比请以论文正式版与仓库 README 为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **长 horizon 遥操作** | 把"几秒钟演示"升级到"几分钟稳定执行"，是真实任务前置条件 |
| **闭环全局观测的范式** | 提示后续工作把"全局位姿 / 地图 / 锚点"作为标配观测，而非可选项 |
| **数据级随机化思路** | 解耦"训练观测来源"与"奖励监督来源"，是个轻量但通用的稳态训练手段 |
| **全尺寸开源** | Adam Pro 31 DoF 全尺寸真机 + G1 双 checkpoint，对学术界复现友好 |

---

## 🎤 面试参考

**Q：为什么直接把全局位姿加进观测 + 奖励里不行？**
A：直接把全局误差当奖励会让策略"为了奖励作弊"——例如躯干主动晃来对齐全局位姿，但牺牲了关节级的自然度。CLOT 的关键是**只用全局位姿当反馈观测**，奖励仍用关节级参考，因此策略学到的是"根据全局观测做局部姿态的微调"，而不是"为了全局好看做大幅躯干动作"。

**Q：解耦随机化具体是怎么做的？**
A：训练时每个 episode 准备一对轨迹——一份**带扰动**的（关节角加噪声、全局位姿带漂移等）只喂给策略观测，另一份**干净**的只用来算奖励。这样策略学会"无论观测被扰多大，目标都是逼近干净参考"，自然获得对真机噪声的鲁棒性。

**Q：CLOT 跟 CLONE / OmniH2O / H2O 这些遥操作工作的差异？**
A：H2O / OmniH2O 偏向**人到人形的运动重定向 + 局部跟踪**；CLONE（同名"闭环"系列后续工作）做的是**长 horizon 任务级闭环**。CLOT 更聚焦在**底层运动控制层的全局位姿闭环**——它解决的是"机器人会飘"这件物理问题，是上层任务级闭环的前提。

**Q：为什么要做到 31 DoF 全尺寸机器人？**
A：很多遥操作工作只在小型平台（Booster T1, G1）上演示。全尺寸（如 Adam Pro）的惯量、力矩耦合远更复杂，全局漂移问题更突出。在 Adam Pro 上跑通 sim-to-real 是对方法 robustness 的重要佐证。

---

## 🔗 相关阅读

- [CLONE (2506.08931)](https://arxiv.org/abs/2506.08931)：同思路的"任务级"闭环长 horizon 遥操作（PKU）
- [OmniH2O (2406.08858)](https://arxiv.org/abs/2406.08858)：H2H 通用遥操作开山工作
- [H2O (2403.04436)](https://arxiv.org/abs/2403.04436)：Human-to-Humanoid 实时全身遥操作
- [HumanPlus (2406.10454)](https://arxiv.org/abs/2406.10454)：Stanford 的影子跟随路线
- [HOMIE (2502.13013)](https://arxiv.org/abs/2502.13013)：外骨骼 cockpit 路线对照
- [Exbody2 (2412.13196)](https://arxiv.org/abs/2412.13196)：表达性 WBC 系列
