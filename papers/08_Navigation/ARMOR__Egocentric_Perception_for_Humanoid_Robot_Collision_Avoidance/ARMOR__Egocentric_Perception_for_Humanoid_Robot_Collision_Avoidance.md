---
layout: paper
title: "ARMOR: Egocentric Perception for Humanoid Robot Collision Avoidance and Motion Planning"
zhname: "ARMOR：面向人形机器人碰撞规避与运动规划的第一视角感知"
category: "Navigation"
arxiv: "2412.00396"
---

# ARMOR: Egocentric Perception for Humanoid Robot Collision Avoidance and Motion Planning
**ARMOR：面向人形机器人碰撞规避与运动规划的第一视角感知**

> 📅 阅读日期: 2026-08-04
>
> 🏷️ 板块: 08 Navigation · 人形避障 · 第一视角感知（Egocentric）· 分布式深度传感 · 模仿学习运动规划
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2412.00396](https://arxiv.org/abs/2412.00396) |
| HTML | [在线阅读](https://arxiv.org/html/2412.00396v1) |
| PDF | [下载](https://arxiv.org/pdf/2412.00396) |
| **发布时间** | 2024-11-30 (arXiv v1) |
| 项目主页 | [Apple ML Research: ARMOR](https://machinelearning.apple.com/research/armor-egocentric) |
| 源码 | 论文声明将公开源码 / 硬件说明 / 3D CAD，截至当前尚未见公开代码仓库 |

**作者**：Daehwa Kim（CMU）、Mario Srouji、Chen Chen、Jian Zhang（Apple）

**平台**：Fourier Intelligence **GR1** 全尺寸人形机器人（双臂 14 DoF）真机部署

---

## 🎯 一句话总结

人形机器人在拥挤空间里避障，长期受制于「感知」这一环：头戴 / 外置深度相机 FoV 有限、被自身躯干与手臂**遮挡**，看不到贴近身体的障碍。ARMOR 的核心思路是把感知**分布到身体本身**——在双臂上贴满 **40 颗微型 ToF 激光雷达**（每臂 20 颗），像「盔甲」一样提供全向、低遮挡的**第一视角深度**。有了这套感知，作者进一步用一个 **Transformer 模仿学习策略 ARMOR-Policy** 把「避障运动规划」学成一个前馈网络：输入当前 / 目标关节角 + 40 路深度图，输出未来一段避障关节轨迹，在推理时再采样多条轨迹并按**符号距离函数（SDF）**选最优。相比头戴 / 外置多相机方案，碰撞减少 **63.7%**、成功率提升 **78.7%**；相比采样式规划器 cuRobo，碰撞再降 **31.6%**、成功率再升 **16.9%**，而延迟只有其 **1/26**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| ToF | Time-of-Flight | 飞行时间测距，本文用微型激光雷达做低成本深度感知 |
| DoF | Degrees of Freedom | 自由度，本文两臂共 14 DoF |
| IL | Imitation Learning | 模仿学习，用专家（无碰撞）轨迹监督策略 |
| ACT | Action Chunking Transformer | 动作分块 Transformer，ARMOR-Policy 的骨干变体 |
| SDF | Signed Distance Function | 符号距离函数，推理时按它给采样轨迹打分选最优 |
| AMASS | Archive of Motion Capture as Surface Shapes | 大规模人类动作捕捉数据集，重定向到 GR1 造训练轨迹 |
| FoV | Field of View | 视场角，单颗传感器约 63° 对角 |
| cuRobo | CUDA Robot motion generation | NVIDIA 的 GPU 采样式运动规划器，本文对照基线 |

---

## ❓ 论文要解决什么问题？

人形机器人在人群 / 杂乱环境中做移动操作时，避障的瓶颈往往不在「规划」而在「感知」：

1. **遮挡严重**：头戴或外置深度相机受躯干、手臂遮挡，贴近身体、腋下、身后的障碍常常「看不见」。
2. **视场有限**：少量相机难以覆盖机器人周身，需要多机位并做复杂标定 / 拼接。
3. **规划太慢**：传统采样 / 优化式规划器（如 cuRobo）在稠密点云上求解耗时、且在紧约束下常「找不到解」。

ARMOR 的答案是**软硬一体**：硬件上用分布式微型 ToF 传感器把感知铺到身体表面消除遮挡；软件上用**模仿学习**把避障规划压缩成一次前馈推理，兼顾覆盖度与实时性。

---

## 🔧 方法拆解

### 1. 硬件：可穿戴式分布 ToF「盔甲」
- **40 颗 SparkFun VL53L5CX ToF 激光雷达**（每臂 20 颗），单颗仅 6.4×3.0×1.5 mm，8×8 分辨率、约 63° 对角 FoV、15 Hz。
- **走线**：每 4 颗传感器经 I2C 接一颗 XIAO ESP32S3 微控制器 → USB 汇到机载 Jetson Xavier NX → 无线回传到带 RTX 4090 的 Linux 主机做推理。
- 低剖面、贴身分布，天然覆盖周身并**消除自遮挡**，比头戴 / 外置稠密相机的可视范围更全。

### 2. 感知融合：40 路第一视角深度
- 每颗传感器在**各自的 ego-frame** 下输出一张 8×8 灰度深度图，共 40 路。
- 每路各过一个改造的**单通道 ResNet18** 提取 512 维特征，再送入 Transformer；注意力头可对不同传感器输入做**协调性**关注。

### 3. ARMOR-Policy：Transformer 模仿学习做运动规划
- **骨干**：编码器-解码器 Transformer（ACT 变体），约 **84M** 参数。
- **输入**：当前 + 目标关节角（28 维，覆盖两臂 14 DoF）、40 路深度图、风格潜变量 *z*（控制轨迹多样性）。
- **输出**：动作分块 *k*×14 的未来关节轨迹（避障运动规划结果）。
- **推理时优化**：一次采样多条候选轨迹，用 **SDF 最小化**挑碰撞最少的一条执行。

### 4. 训练数据：从 AMASS 合成 86.6 小时避障轨迹
- 把 AMASS 人类手臂动作**重定向到 GR1**，在轨迹周围放置紧凑障碍，得到 **311,922 条合成轨迹（≈86.6 小时）**。
- 三类数据策略：**避障（collision-avoidance）**、**急停（emergency-stop）**、**无碰撞（collision-free）**，让策略既会绕、也会停。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph HW["🛡️ 硬件：可穿戴式分布 ToF 盔甲"]
        TOF["40× ToF 激光雷达<br/>每臂 20 颗 · 8×8 · 15Hz · 63°FoV"]
        MCU["XIAO ESP32S3 ×N<br/>4 传感器/颗 · I2C"]
        JET["Jetson Xavier NX<br/>USB 汇聚 → 无线回传"]
    end

    subgraph PERC["👁️ 第一视角感知融合"]
        DEP["40 路 ego-frame 深度图<br/>各 8×8 灰度"]
        RES["单通道 ResNet18 ×40<br/>各出 512 维特征"]
    end

    subgraph POLICY["🧠 ARMOR-Policy (ACT 变体, ~84M)"]
        IN["输入: 当前+目标关节角(28)<br/>+40 路深度特征 + 风格 z"]
        TF["编码器-解码器 Transformer"]
        OUT["输出: 动作分块 k×14<br/>未来避障关节轨迹"]
        SEL["推理时采样多轨迹<br/>按 SDF 最小化选最优"]
    end

    subgraph TRAIN["📚 训练 (仿真)"]
        AM["AMASS → 重定向 GR1<br/>311,922 条 / 86.6h"]
        STR["避障 / 急停 / 无碰撞<br/>三类策略"]
    end

    subgraph ROBOT["🤖 部署"]
        GR1["Fourier GR1 双臂 14 DoF<br/>动态避障移动操作"]
    end

    TOF --> MCU --> JET --> DEP --> RES --> IN
    IN --> TF --> OUT --> SEL --> GR1
    AM -.训练.-> TF
    STR -.训练.-> TF

    style HW fill:#fff7e0,stroke:#d4a017
    style PERC fill:#eef6ff,stroke:#2e86de
    style POLICY fill:#f3e8ff,stroke:#8e44ad
    style TRAIN fill:#eafaf1,stroke:#27ae60
    style ROBOT fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **可穿戴式分布感知硬件**：用 40 颗微型 ToF 激光雷达把深度感知铺到人形手臂表面，实现全向、低遮挡的第一视角感知，硬件低成本、低剖面。
2. **软硬一体的避障系统**：感知与规划协同设计，感知直接喂给学习式规划器，端到端解决拥挤环境下的动态避障。
3. **ARMOR-Policy（学习式运动规划）**：把避障规划学成一次 Transformer 前馈 + 推理时 SDF 选优，兼顾覆盖度与实时性，替代慢速采样式规划器。
4. **大规模合成训练**：从 AMASS 重定向出 86.6 小时、31 万条带障碍轨迹，含避障 / 急停 / 无碰撞三类策略。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| vs 头戴/外置稠密相机 | 碰撞 **−63.7%**、成功率 **+78.7%**（分布式感知优势） |
| vs cuRobo（同用 ARMOR 感知） | 碰撞 **−31.6%**、成功率 **+16.9%** |
| 延迟 | ARMOR-Policy ≈ **240ms**，cuRobo ≈ 1300ms → **26× 更快** |
| cuRobo 失败率 | 在 64% 评测样本上**找不到解** |
| 训练数据 | 311,922 条合成轨迹 / 86.6 小时（AMASS→GR1） |

> ⚠️ 上表数值取自论文 v1，具体以正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **感知去遮挡** | 把「相机装在头上」换成「传感铺满身体」，从根上解决人形自遮挡 / 有限 FoV 的避障感知短板 |
| **规划实时化** | 用模仿学习把避障规划压成前馈推理，比采样 / 优化式规划器快一个量级，适配高频闭环 |
| **低成本可复制** | ToF 传感器 + ESP32 + Jetson 的方案硬件门槛低，便于其他人形本体复用 |

---

## 🎤 面试参考

**Q：ARMOR 为什么用「一堆贴身的 8×8 微型 ToF」而不是几颗高分辨率深度相机？**
A：人形避障的痛点是**遮挡**——头戴 / 外置相机看不到贴近身体、腋下、身后的障碍。把 40 颗低剖面 ToF 分布到手臂表面，能以极低成本获得全向、低遮挡的第一视角覆盖；单颗分辨率虽低（8×8），但数量与分布带来的**覆盖度**才是避障真正需要的，且总数据量小、便于实时处理。

**Q：既然有了感知，为什么不用 cuRobo 这类成熟规划器，而要学一个 ARMOR-Policy？**
A：cuRobo 是采样 / 优化式规划，在稠密点云与紧约束下**耗时且常找不到解**（论文里 64% 样本失败），延迟约 1.3s。ARMOR-Policy 把避障学成一次 Transformer 前馈 + 推理时按 SDF 选优，延迟约 240ms（26× 更快），碰撞更少、成功率更高，更适合动态、高频的闭环避障。

**Q：训练数据从哪来？为什么要分「避障 / 急停 / 无碰撞」三类？**
A：从 AMASS 人类动作重定向到 GR1，并在轨迹周围放障碍，合成 31 万条 / 86.6 小时。三类策略让策略既学会**绕开**障碍、也学会在无路可走时**急停**、在空旷时走**自然无碰撞**轨迹，覆盖真实避障中的不同应对模式。

---

## 🔗 相关阅读

- [HumanoidPano (2503.09010)](https://arxiv.org/abs/2503.09010)：全景相机 + LiDAR 跨模态感知，另一条破解人形自遮挡 / 有限 FoV 的感知路线
- [NaVILA (2412.04453)](https://arxiv.org/abs/2412.04453)：足式机器人视觉-语言-动作导航模型（同期 Navigation 代表作）
- [LookOut (2508.14466)](https://arxiv.org/abs/2508.14466)：真实世界人形第一视角导航与主动看路
- [Humanoid Occupancy (2507.20217)](https://arxiv.org/abs/2507.20217)：面向人形的通用多模态占据感知系统
