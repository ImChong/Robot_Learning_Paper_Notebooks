---
layout: paper
paper_order: 10
title: "OCELOT: Odometry and Contact Estimation for Legged Robots"
zhname: "OCELOT：面向足式机器人的纯本体感知腿部里程计与接触估计"
category: "State Estimation"
---

# OCELOT: Odometry and Contact Estimation for Legged Robots
**OCELOT：面向足式机器人的纯本体感知腿部里程计与接触估计**

> 📅 阅读日期: 2026-08-05
>
> 🏷️ 板块: State Estimation · 腿部里程计 · Error-State EKF · 接触/打滑检测
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2605.21863](https://arxiv.org/abs/2605.21863) |
| HTML | [在线阅读](https://arxiv.org/html/2605.21863) |
| PDF | [下载](https://arxiv.org/pdf/2605.21863) |
| **发布时间** | 2026-05-21 (arXiv) |
| 源码 / ROS2 包 | 🌟 [srge-erau/leg_odometry_uncertainty](https://github.com/srge-erau/leg_odometry_uncertainty)（Python 实现 + 实时 ROS2 包，CC BY 4.0） |

**作者**：Emre Girgin, Cagri Kilic

**机构**：美国 **Embry-Riddle Aeronautical University** 航空航天工程系（SRGE 实验室）

**机器人**：**Unitree Go2** 四足（机身 IMU + 关节编码器 + 足底力传感器，均 500 Hz），并附 29 段、共 2.4 km 的多地形数据集

---

## 🎯 一句话总结

OCELOT 是一条**只用本体感知**的腿部里程计流水线：核心是一个 **Error-State EKF（ESEKF）**，用 IMU 做预测、用「被判定为静止支撑」的脚做零速度更新。它最大的贡献是一个**双路接触检测 + 不确定度量化**模块——每只脚同时跑 ① 基于力的 **GMM-FSM**（判断"是否受力触地"）和 ② 基于运动学的 **GLRT**（判断"脚是否真的静止"），两路质量分**相乘融合** `q = q_FSM × q_GLRT`，再据此**自适应放大打滑脚的测量噪声**，从而在源头把打滑的错误约束"软性剔除"。在 2.4 km 多地形数据上，绝对轨迹误差全面优于经典 InEKF 基线（Hartley、Bloesch），在碎石地形上甚至优于 VINS-Fusion / OpenVINS 等视觉惯性方案。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Proprioceptive | - | 本体感知（IMU + 关节编码器 + 力传感器），不含视觉 / LiDAR |
| ESEKF | Error-State Extended Kalman Filter | 误差状态 EKF：估计"名义状态的误差量"，几何一致性好、线性化更稳 |
| GMM | Gaussian Mixture Model | 高斯混合模型，这里对足底力做双成分聚类分出"摆动 / 支撑" |
| FSM | Finite State Machine | 有限状态机，对触地判断做去抖动（debounce） |
| GLRT | Generalized Likelihood Ratio Test | 广义似然比检验，判断脚的估计速度是否"统计上为零"（即真静止） |
| ATE | Absolute Trajectory Error | 绝对轨迹误差，评估里程计漂移的主指标 |
| ZUPT | Zero-velocity UPdaTe | 零速度更新：支撑脚速度≈0 作为测量约束 |

---

## ❓ 论文要解决什么问题？

足式机器人做**纯本体感知里程计**时，几乎都依赖"支撑脚速度为零"（ZUPT 式约束）来压制 IMU 积分漂移。这条链路有一个致命弱点：

- **接触判断一旦出错 → 注入错误约束**。脚在**打滑**、软地形下陷、或触地/离地瞬间被误判为"静止支撑"时，滤波器会强行把一个错误的零速度约束塞进来，直接污染速度与位置估计。
- 传统做法要么用**固定力阈值**（对不同地形/步态不鲁棒），要么额外挂**足端 IMU**（增加硬件与标定成本）。

OCELOT 的答案：**不做非黑即白的接触判断，而是给每只脚一个连续的"可信度"**，并把这个可信度直接转成滤波器的**自适应测量噪声**——可信就多信、疑似打滑就自动放大方差、少信这一路。

---

## 🔧 方法拆解

### 1. Error-State EKF 骨架

- **名义状态**：机身在世界系下的位置、速度、姿态（旋转矩阵 body→world），以及加速度计 / 陀螺仪的加性零偏。
- **误差状态**：**15 维**（位置/速度/姿态各 3 + 两个 bias 各 3）。
- **预测步**：IMU 驱动，用去偏后的加速度 / 角速度做欧拉积分向前传播。
- **更新步**：对每只**被判定为静止支撑**的脚，用前向运动学算出的足端速度做"应为零"的测量更新。

### 2. 双路并行接触检测（核心）

每只脚**同时**跑两个互补的检测器，各输出一个连续质量分 ∈ [0,1]：

- **检测器 ①：力驱动 GMM-FSM** —— 对足底力的滑动窗口拟合**双成分 GMM**，自动分出"摆动 / 支撑"两簇（免手调固定阈值）；再用 FSM 对触地状态**去抖动**，得到质量分 `q_FSM`（把测得的力在两个阈值间归一化）。判断"**脚有没有受力**"。
- **检测器 ②：运动学 GLRT** —— 只用机身 IMU + 运动学（**不需要足端 IMU**）对足端估计速度做**广义似然比检验**，判断"脚是不是真的静止"，得到 `q_GLRT`。判断"**脚是不是在打滑**"。

### 3. 相乘融合 + 自适应协方差

- **融合**：`q_final = q_FSM × q_GLRT`。相乘意味着**只有"既受力又静止"才拿高分**——受力但在滑（GLRT 低）或静止但没受力（FSM 低）都会被压低。
- **自适应噪声**：每只脚的测量噪声协方差按 `σ_i = σ_base / max(q_final,i, ε)` 动态设定——`q_final` 越低（越像打滑），`σ_i` 越大，ESEKF 就**越不信这一路测量**，实现"软性剔除打滑"而非硬阈值切断。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENS["🦿 本体感知输入 (500 Hz)"]
        IMU["📡 机身 IMU<br/>(角速度 / 加速度)"]
        ENC["⚙️ 关节编码器<br/>(前向运动学 → 足端速度)"]
        FRC["⚖️ 足底力传感器"]
    end

    subgraph DET["🟦 双路接触检测 (每只脚)"]
        FSM["🟠 力驱动 GMM-FSM<br/>→ q_FSM (是否受力)"]
        GLRT["🟢 运动学 GLRT<br/>→ q_GLRT (是否静止)"]
        FUSE["🔀 相乘融合<br/>q = q_FSM × q_GLRT"]
        FRC --> FSM
        ENC --> GLRT
        IMU --> GLRT
        FSM --> FUSE
        GLRT --> FUSE
    end

    subgraph EKF["🟧 Error-State EKF"]
        PRED["🔮 预测步<br/>IMU 去偏 + 欧拉积分"]
        COV["📈 自适应噪声<br/>σ = σ_base / max(q, ε)"]
        UPD["🧮 更新步<br/>静止支撑脚零速度约束"]
        STATE["🧭 15 维误差状态<br/>位置/速度/姿态 + IMU bias"]
        IMU --> PRED --> UPD
        FUSE --> COV --> UPD
        ENC -->|足端速度| UPD
        UPD --> STATE
        STATE -.反馈校正.-> PRED
    end

    STATE --> OUT["🛰️ 低漂移里程计轨迹"]

    style SENS fill:#fff7e0,stroke:#d4a017
    style DET fill:#e8f4fd,stroke:#1f78b4
    style EKF fill:#fde8e8,stroke:#c0392b
</div>

---

## 🧑‍💻 源码运行时序图（mermaid）

> 基于开源仓库 [srge-erau/leg_odometry_uncertainty](https://github.com/srge-erau/leg_odometry_uncertainty)：离线回放入口 `python src/run_ekf.py ./data/<seq>/lowstate.csv`，逐帧跑 ESEKF，最后由 `analysis.py` 出轨迹/指标图；`run_all.sh` 批量跑多段序列。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户 / run_all.sh
    participant Main as run_ekf.py
    participant P as parameters.py
    participant Data as lowstate.csv
    participant EKF as ESEKF 循环
    participant Det as 接触检测(FSM+GLRT)
    participant An as analysis.py

    U->>Main: python run_ekf.py <seq>/lowstate.csv
    Main->>P: 载入滤波/检测参数(噪声·GLRT阈值·开关)
    Main->>Data: 读取 IMU/关节/力 时序 (500Hz)
    Main->>EKF: 初始化 15 维误差状态 + 协方差

    loop 每一帧传感数据
        Main->>EKF: 预测步 (IMU 去偏 + 积分)
        loop 每只脚
            EKF->>Det: q_FSM = 力 GMM-FSM 去抖
            EKF->>Det: q_GLRT = 运动学静止检验
            Det-->>EKF: q = q_FSM × q_GLRT
            EKF->>EKF: σ = σ_base / max(q, ε)
            EKF->>EKF: 静止支撑脚零速度更新
        end
        EKF-->>Main: 记录当前状态估计
    end

    Main->>An: 输出状态/协方差序列到带时间戳目录
    An->>An: 计算 ATE + 生成诊断图
    An-->>U: 轨迹对比图 / 误差指标
</div>

---

## 💡 核心贡献

1. **纯本体感知、抗打滑的腿部里程计**：不挂视觉 / LiDAR、不挂足端 IMU，只靠机身 IMU + 编码器 + 足底力。
2. **双路互补接触检测**：力（受力否）与运动学（静止否）各管一半，**相乘融合**天然排除"受力但打滑"和"静止但悬空"两类误判。
3. **不确定度 → 自适应协方差**：把连续可信度接进 ESEKF 的测量噪声，实现"软性剔除打滑"，避免硬阈值的抖动。
4. **开源 + 数据集**：给出 Python/ROS2 实现与 29 段 2.4 km 多地形（水泥/瓷砖/草地/碎石/岩石）本体感知数据集。

---

## 📊 关键发现（绝对轨迹误差 ATE，越小越好）

**vs 经典本体感知 InEKF 基线**

| 地形 | OCELOT | Hartley et al. | Bloesch et al. |
|---|---|---|---|
| 水泥 concrete | **12.019 m** | 50.785 m | 81.450 m |
| 草地 grass | **1.385 m** | 6.908 m | 5.315 m |
| 岩石 rock（松散颗粒） | **6.857 m** | 15.028 m | 30.876 m |

**vs 视觉惯性方案（碎石 pebble）**

| 方法 | ATE |
|---|---|
| **OCELOT（纯本体感知）** | **1.273 m** |
| VINS-Fusion | 2.274 m |
| OpenVINS | 4.393 m |

> 📌 亮点：在**颗粒松散、易打滑**的碎石 / 岩石地形上优势最明显——正是"接触/打滑判断"最容易出错、最能体现自适应协方差价值的场景；纯本体感知里程计在这类地形上反超视觉惯性方案，说明打滑抑制做得足够扎实。

---

## 🤖 对状态估计领域的意义

| 方向 | 含义 |
|---|---|
| **软性接触替代硬阈值** | 把"接触/打滑"从二值判断改成连续可信度 → 自适应协方差，是比固定力阈值更鲁棒的范式 |
| **免足端 IMU** | GLRT 只用机身 IMU + 运动学就能判静止，省掉足端 IMU 的硬件与标定 |
| **与经典滤波栈兼容** | 基于标准 ESEKF，工程上易接入现有 InEKF / VIO 融合管线，作为"腿部速度源" |
| **可复现基准** | 开源代码 + 多地形数据集，方便后续接触估计 / 里程计工作直接对比 |

---

## 🎤 面试参考

**Q：为什么要用两个检测器，而不是一个更强的？**
A：因为"接触"其实是两个独立条件的合取——**脚要受力**（否则谈不上支撑）且**脚要静止**（否则是打滑，不满足零速度约束）。力传感器擅长判前者、运动学 GLRT 擅长判后者，二者互补；**相乘融合**保证只有两者都满足才给高分，任一失败都会被压低，从源头排除误判。

**Q：为什么用"自适应协方差"而不是直接把打滑脚剔除？**
A：硬剔除是二值的，在临界状态会频繁开关、引入抖动，而且一旦误剔就丢失了本可利用的部分信息。自适应协方差是连续的：可信度低就把方差调大、让 EKF 自动少信这一路，既平滑又保留了信息，是更"贝叶斯"的处理方式。

**Q：为什么在碎石/岩石地形反而能赢过视觉惯性？**
A：这类地形颗粒松散、脚极易打滑，是传统零速度约束最容易被污染的场景；OCELOT 的双路检测 + 自适应协方差正是针对打滑设计的，能把错误约束降权。而视觉惯性在这种低纹理/震动大的环境里特征跟踪也不稳，所以纯本体感知反而更稳。

---

## 🔗 相关阅读

- [Contact-Aided Invariant EKF (1904.09251)](https://arxiv.org/abs/1904.09251)：接触辅助 IEKF 奠基工作，本仓库已有笔记，是 OCELOT 的主要对比基线（Hartley et al.）
- [GAIT (2606.14160)](https://arxiv.org/abs/2606.14160)：用注意力把接触信息隐式吸进权重，本仓库已有笔记；OCELOT 则用显式双路检测 + 自适应协方差，是"显式 vs 隐式"的对照
- [AutoOdom (2511.18857)](https://arxiv.org/abs/2511.18857)：纯学习式本体感知里程计，本仓库已有笔记，走"绕开滤波"的另一条路
- [Learning Contact Representation for Leg Odometry (2606.05501)](https://arxiv.org/abs/2606.05501)：同期学习接触表征的里程计工作，本仓库已有笔记
- [The InEKF as a Stable Observer (1410.1465)](https://arxiv.org/abs/1410.1465)：不变卡尔曼滤波的理论基础，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要 + HTML 全文 + 开源仓库整理；源码运行时序图依据 [srge-erau/leg_odometry_uncertainty](https://github.com/srge-erau/leg_odometry_uncertainty) 的 `run_ekf.py` / `parameters.py` / `analysis.py` 离线回放结构绘制，部分内部实现细节以仓库最新代码为准。
