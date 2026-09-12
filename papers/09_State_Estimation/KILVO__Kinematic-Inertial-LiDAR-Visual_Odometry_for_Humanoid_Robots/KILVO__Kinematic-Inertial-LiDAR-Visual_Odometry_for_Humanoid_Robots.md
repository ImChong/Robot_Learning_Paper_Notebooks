---
layout: paper
title: "KILVO: Kinematic-Inertial-LiDAR-Visual Odometry with Robust Multimodal Adaptation for Humanoid Robots"
zhname: "KILVO：面向人形机器人的运动学-惯性-激光-视觉多模态自适应里程计"
category: "State Estimation"
arxiv: "2608.05647"
---

# KILVO: Kinematic-Inertial-LiDAR-Visual Odometry with Robust Multimodal Adaptation for Humanoid Robots
**把关节编码器（运动学）、IMU、LiDAR、相机四类传感器塞进一个「异步-顺序混合」的误差状态迭代卡尔曼滤波器（ESIKF）：高频腿部运动学做本体约束、LiDAR 与视觉光度误差做外感更新，再配一个不加装额外传感器的接触估计模块；当某一路传感器退化或失效时能在 KI / KIL / LIV / KILV 之间平滑切换，实现 1 kHz 输出、对多种人形与步态都鲁棒的里程计。**

> 📅 总结日期: 2026-09-12
>
> 🏷️ 板块: 09 State Estimation · 多模态里程计 · 误差状态迭代卡尔曼滤波(ESIKF) · 运动学-惯性-激光-视觉紧耦合 · 接触估计
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2608.05647](https://arxiv.org/abs/2608.05647) |
| HTML | [在线阅读](https://arxiv.org/html/2608.05647v1) |
| PDF | [下载](https://arxiv.org/pdf/2608.05647) |
| 期刊 | IEEE/ASME Transactions on Mechatronics (TMECH) 2026 · DOI [10.1109/TMECH.2026.3721778](https://doi.org/10.1109/TMECH.2026.3721778) |
| **发布时间** | 2026-08-06 (arXiv v1) |
| 源码 | [github.com/JixinGao/KILVO](https://github.com/JixinGao/KILVO) —— **数据集已放出**（15 段 rosbag，OneDrive 下载），代码仓库声明「code will be released soon」；截至笔记时源码尚未释出，故本篇给出的是**据论文描述整理的运行流程**，而非源码调用时序图 |

**作者**：Jixin Gao, Fucheng Liu, Teng Zhang, Fusheng Zha

**平台**：BHR-B3 人形（公开 LIKO 数据集）· Unitree G1（定制传感器套件的真机实验）

---

## 🎯 一句话总结

人形机器人做导航、建图、规划都需要**准确的浮动基座位姿与速度**，而单一传感器各有短板：纯 IMU 会漂移，腿部运动学在打滑/腾空时失准，LiDAR 在几何退化的走廊里失效，视觉在弱纹理或暗光下崩掉。KILVO 的思路是把**运动学(Kinematic) + 惯性(Inertial) + 激光(LiDAR) + 视觉(Visual)** 四路一起融合进一个**误差状态迭代卡尔曼滤波器(ESIKF)**，但不像常见方案那样把所有观测在同一时刻同步更新，而是采用**异步-顺序混合**结构：IMU 做高频预测，腿部运动学在 **1 kHz** 高频侧做约束更新（配合基于偏差的噪声自适应），LiDAR 配准与视觉光度对齐在 **10 Hz** 侧顺序更新；额外挂一个**接触估计模块**，无需力/触觉传感器就能判断脚是否着地，为运动学约束提供开关。最关键的是**多模态自适应**——一路退化时系统能在 KI / KIL / LIV / KILV 组合间无缝切换，保证输出不中断。在公开 LIKO 数据集与真机 15 段序列上，平均轨迹误差约 **1.5 cm**、输出 **1 kHz**、单帧平均处理 **13.99 ms**，接触估计准确率 **>95%**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| KILVO | Kinematic-Inertial-LiDAR-Visual Odometry | 本文方法：四模态紧耦合里程计 |
| ESIKF | Error-State Iterated Kalman Filter | 误差状态迭代卡尔曼滤波，估计状态相对标称值的误差量并迭代重线性化 |
| IMU | Inertial Measurement Unit | 惯性测量单元（陀螺 + 加速度计） |
| ATE / RTE | Absolute / Relative Trajectory Error | 绝对/相对轨迹误差，里程计精度常用指标 |
| RMSE | Root Mean Square Error | 均方根误差 |
| FPR | False Positive Rate | 假阳率，这里指接触估计误判「着地」的比例 |
| KI / KIL / LIV / KILV | — | 传感器模态组合：运动学-惯性 / +激光 / 激光-惯性-视觉 / 全模态 |
| DoF | Degrees of Freedom | 自由度 |

---

## ❓ 论文要解决什么问题？

1. **单模态里程计对人形不够鲁棒**：人形步态含冲击、腾空、打滑，纯运动学-惯性(KI)会漂移；纯 LiDAR-惯性在几何退化环境失效；纯视觉-惯性在弱纹理/暗光崩溃。人形恰恰经常同时遇到这些。
2. **多传感器「同步融合」代价高、脆弱**：把 LiDAR、视觉、运动学都放到同一时刻做紧耦合更新，既拖慢频率，又会因某一路坏掉而拖垮整体；人形控制却需要**高频(≈1 kHz)**、低延迟的状态输出。
3. **接触时机难判且常需额外传感器**：腿部运动学约束只在脚真正着地时才成立，误判接触会污染估计；而加装足底力/触觉传感器又增加硬件成本与故障点。

---

## 🔧 方法拆解

**① 状态与预测：IMU 驱动的 ESIKF 骨架**
- 浮动基座状态含姿态、位置、速度、IMU 零偏等；用 IMU 高频**预测**（状态传播），在误差状态空间里迭代更新，保证一致性与效率。

**② 异步-顺序混合更新（KILVO 的核心结构）**
- **异步高频侧（≈1 kHz）**：腿部**运动学约束**在高频更新——支撑腿着地时其足端在世界系近似零速/零位移，用作观测；配合**基于偏差(deviation-based)的噪声自适应**，动态调大打滑/冲击时刻的测量噪声，避免坏约束污染滤波。
- **顺序低频侧（≈10 Hz）**：先做 **LiDAR 配准**（点到面等几何残差）更新，再做**视觉光度误差**对齐更新——两类外感观测**顺序**注入而非同时，降低耦合复杂度、提升数值稳定。

**③ 接触估计模块（不加额外传感器）**
- 复用已有本体信息推断脚是否着地，输出接触概率作为运动学约束的「开关/权重」，>95% 准确率、FPR≈3.67%，避免误判接触带来的估计偏差。

**④ 多模态自适应（鲁棒性来源）**
- 实时监控各路传感器「健康度」，当 LiDAR/视觉/运动学任一退化时，在 **KI → KIL → LIV → KILV** 等模态组合间**无缝切换**，保证在传感器退化甚至失效时仍连续输出，不中断控制回路。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENSORS["🛰️ 多模态传感器输入"]
        IMU["IMU (高频)"]
        ENC["关节编码器<br/>→ 腿部运动学"]
        LID["LiDAR 点云"]
        CAM["相机图像"]
    end

    HEALTH["🩺 数据健康检查<br/>评估各路传感器质量/退化"]
    PRED["📈 IMU 预测<br/>ESIKF 状态传播"]

    subgraph ASYNC["⚡ 异步高频侧 (≈1 kHz)"]
        CONTACT["👣 接触估计模块<br/>(无额外传感器, >95% 准确)"]
        KIN["🦿 运动学约束更新<br/>+ 基于偏差的噪声自适应"]
    end

    subgraph SEQ["🐢 顺序低频侧 (≈10 Hz)"]
        LREG["📡 LiDAR 配准更新"]
        VIS["📷 视觉光度误差更新"]
    end

    ADAPT["🔀 多模态自适应<br/>KI / KIL / LIV / KILV 无缝切换"]
    OUT["✅ 高频状态输出<br/>浮动基座位姿 + 速度 (1 kHz)"]

    IMU --> HEALTH
    ENC --> HEALTH
    LID --> HEALTH
    CAM --> HEALTH
    HEALTH --> PRED
    PRED --> CONTACT --> KIN
    KIN --> LREG --> VIS
    HEALTH -->|某路退化/失效| ADAPT
    ADAPT -.控制启用哪些更新.-> ASYNC
    ADAPT -.控制启用哪些更新.-> SEQ
    VIS --> OUT
    KIN --> OUT

    style SENSORS fill:#fff7e0,stroke:#d4a017
    style ASYNC fill:#eef6ff,stroke:#2e86de
    style SEQ fill:#f3eafe,stroke:#8e44ad
    style OUT fill:#eafaf1,stroke:#27ae60
</div>

---

## 🖥️ 运行时序（据论文描述，非源码调用时序图）

> 说明：官方代码仍为「即将释出」，以下时序**依据论文对异步-顺序混合 ESIKF 的描述**整理，用于理解各更新阶段的先后与频率关系。

<div class="mermaid">
sequenceDiagram
    participant IMU as IMU
    participant KIN as 腿部运动学 + 接触估计
    participant LID as LiDAR
    participant CAM as 相机
    participant F as ESIKF 状态
    participant CTRL as 控制/导航

    loop 高频回路 (≈1 kHz)
        IMU->>F: 惯性数据 → 状态预测(传播)
        KIN->>KIN: 接触估计判断脚是否着地
        KIN->>F: 着地则注入运动学约束<br/>(基于偏差的噪声自适应)
        F-->>CTRL: 高频输出位姿 + 速度
    end
    loop 低频回路 (≈10 Hz)
        LID->>F: LiDAR 配准残差 → 顺序更新①
        CAM->>F: 视觉光度误差 → 顺序更新②
    end
    Note over F: 多模态自适应实时监控各路健康度<br/>退化时在 KI/KIL/LIV/KILV 间切换，输出不中断
</div>

---

## 💡 核心贡献

1. **四模态紧耦合里程计**：首次把运动学 + 惯性 + LiDAR + 视觉统一进面向人形的 ESIKF，覆盖单模态各自的失效场景。
2. **异步-顺序混合更新结构**：高频(1 kHz)运动学约束 + 低频(10 Hz)LiDAR/视觉顺序更新，兼顾人形控制所需的高频低延迟与外感精度。
3. **免额外传感器的接触估计**：>95% 准确率、FPR≈3.67%，为运动学约束提供可靠开关，避免误判接触污染滤波。
4. **多模态自适应鲁棒性**：传感器退化/失效时在 KI/KIL/LIV/KILV 间无缝切换，保证输出连续；跨多种人形、步态与真实场景验证。
5. **开放数据集**：随文放出 15 段真机 rosbag 数据（含定制传感器套件的 Unitree G1），便于后续复现与对比。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 公开 LIKO 数据集 | 平均 ATE RMSE ≈ **0.0151 m**，最优 RTE ≈ **0.0011 m**（各序列领先） |
| 真机 15 段序列 | 全模态平均端到端平移误差 ≈ **0.0145 m** |
| 输出频率 / 延迟 | **1 kHz** 输出，单帧平均处理 **13.99 ms** |
| 接触估计 | 准确率 **> 95%**，平均 FPR ≈ **3.67%** |
| 对比基线 | FAST-LIO2、LIO-SAM、R3LIVE、FAST-LIVO2、LIKO、HR2-KILO |
| 鲁棒性 | 单路（LiDAR/视觉/运动学）退化或失效时仍连续稳定输出 |

> ⚠️ 上表数值取自论文 v1，具体以正式版 / TMECH 期刊版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **状态估计范式** | 从「单/双模态」走向「运动学-惯性-激光-视觉」四模态紧耦合，覆盖人形复杂步态与多变环境 |
| **高频 + 鲁棒兼得** | 异步-顺序结构让 1 kHz 高频输出与外感精度共存，直接对接人形高频全身控制 |
| **降硬件门槛** | 接触估计无需足底力/触觉传感器，减少硬件成本与故障点 |
| **工程可落地** | 面向传感器退化/失效的多模态自适应，是真机长时运行不可或缺的容错能力 |
| **可复现** | 开放真机数据集（代码承诺随后释出），为社区提供人形多模态里程计的评测基准 |

---

## 🎤 面试参考

**Q：为什么人形里程计要同时用运动学、惯性、LiDAR 和视觉四种传感器？**
A：因为人形的运行场景会同时触发多种失效：步态冲击/打滑让腿部运动学失准、纯 IMU 会漂移、几何退化走廊让 LiDAR 失效、弱纹理暗光让视觉崩溃。单模态总有盲区，KILVO 把四路融合并做多模态自适应，一路坏了还能靠其余组合继续输出。

**Q：KILVO 的「异步-顺序混合」结构解决了什么？**
A：如果把所有观测都放同一时刻同步紧耦合，既拖慢频率又脆弱。KILVO 让 IMU 预测 + 腿部运动学约束在 1 kHz 高频侧跑（满足控制需求），LiDAR 配准与视觉光度对齐在 10 Hz 侧**顺序**注入（先 LiDAR 后视觉），降低耦合复杂度、提升数值稳定，同时保证高频低延迟输出。

**Q：接触估计为什么重要，KILVO 怎么做到不加传感器？**
A：腿部运动学约束只有在脚真正着地时才成立，误判接触会把错误观测灌进滤波。KILVO 复用已有本体信息推断接触概率（>95% 准确、FPR≈3.67%），作为运动学约束的开关/权重，避免污染，且无需额外的足底力或触觉传感器。

---

## 🔗 相关阅读

- [Proprioceptive Invariant State Estimation for Humanoid Robots on Non-Inertial Ground (2606.19512)](https://arxiv.org/abs/2606.19512)：非惯性地面上的人形不变式状态估计（同板块）
- [InEKFormer: A Hybrid State Estimator for Humanoid Robots (2511.16306)](https://arxiv.org/abs/2511.16306)：InEKF + Transformer 的人形混合状态估计（同板块）
- [GAIT: Legged Robot Proprioceptive State Estimation with Attention over Inertial-Leg Tokens (2606.14160)](https://arxiv.org/abs/2606.14160)：以注意力融合惯性-腿部 token 的本体感知状态估计
- [AutoOdom: Learning Auto-regressive Proprioceptive Odometry for Legged Locomotion (2511.18857)](https://arxiv.org/abs/2511.18857)：自回归的学习式本体里程计
- [Contact-Aided Invariant Extended Kalman Filtering (1904.09251)](https://arxiv.org/abs/1904.09251)：接触辅助不变式 EKF，多模态里程计的经典基座
