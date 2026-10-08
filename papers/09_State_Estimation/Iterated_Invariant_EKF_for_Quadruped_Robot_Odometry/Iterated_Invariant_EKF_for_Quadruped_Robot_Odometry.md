---
layout: paper
title: "Iterated Invariant EKF for Quadruped Robot Odometry"
zhname: "IterIEKF：面向四足机器人里程计的迭代不变扩展卡尔曼滤波"
category: "State Estimation"
arxiv: "2604.15449"
---

# Iterated Invariant EKF for Quadruped Robot Odometry
**IterIEKF：面向四足机器人里程计的迭代不变扩展卡尔曼滤波**

> 📅 阅读日期: 2026-08-16
>
> 🏷️ 板块: 09 State Estimation · 不变卡尔曼滤波 · 本体感知里程计 · 迭代更新 · SE₂(3)
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）· 该模块已有笔记覆盖至 2026-06，按「取模块最新发表且尚无笔记的论文」补齐

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2604.15449](https://arxiv.org/abs/2604.15449) |
| HTML | [在线阅读](https://arxiv.org/html/2604.15449v1) |
| PDF | [下载](https://arxiv.org/pdf/2604.15449) |
| **发布时间** | 2026-04-16 (arXiv v1) |
| 项目主页 | [Legged-IterIEKF](https://hilton-santana.github.io/Legged-IterIEKF/) |
| 源码 | 项目页标注「Code coming soon」，截至当前尚未公开仓库（下方给出算法运行时序图，代码开源后可替换为源码时序图） |

**作者**：Hilton Marques Souza Santana、João Carlos Virgolino Soares、Sven Goffin、Ylenia Nisticò、Silvère Bonnabel、Claudio Semini、Marco Antonio Meggiolaro

**单位**：PUC-Rio（巴西里约天主教大学）· Dynamic Legged Systems Lab @ IIT（意大利技术研究院）· Mines Paris（巴黎矿业）

**平台**：MuJoCo + Quadruped-PyMPC 仿真（8 字轨迹、平整/不平地形），以及真机四足数据集

---

## 🎯 一句话总结

足式机器人在没有外部定位（GPS/动捕/相机）时，需要**纯本体感知**地把「我在哪、朝哪、走多快」估出来。经典做法是**不变扩展卡尔曼滤波（IEKF）**：把状态放到李群 SE₂(3) 上，让误差动力学与状态本身无关，从而收敛性、一致性都比普通 EKF 好。但 IEKF 的更新步仍然只在当前估计处**线性化一次**，在强非线性/大初始误差时不够准。本文提出 **IterIEKF（Iterated Invariant EKF）**：把更新步写成一个**最大后验（MAP）优化问题**，用**高斯-牛顿迭代**反复重线性化、逼近后验的「模态」，而不是只走一步。更新只吃**本体感知量**——用接触足在触地时「世界系速度约为零」的运动学约束反推基座速度（类 ZUPT），配合 IMU 做预测。仿真与真机上，IterIEKF 相比 vanilla IEKF、SO(3)-EKF 及其迭代版，在收敛时间、速度/重力方向估计、俯仰角误差上都更优、更一致。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| IEKF | Invariant Extended Kalman Filter | 不变扩展卡尔曼滤波，误差定义在李群上，误差动力学与状态无关 |
| IterIEKF | Iterated Invariant EKF | 本文方法：在 IEKF 更新步加高斯-牛顿迭代 |
| SE₂(3) | — | 含姿态 R、速度 v、位置 p 的李群（SO(3) ⋉ ℝ⁶），本文状态空间 |
| MAP | Maximum A Posteriori | 最大后验，迭代更新逼近的目标 |
| ZUPT | Zero-velocity UPdate | 零速更新：触地足在世界系速度≈0，反推基座速度 |
| IMU | Inertial Measurement Unit | 惯性测量单元，提供角速度与线加速度做预测 |
| ESKF | Error-State Kalman Filter | 误差状态卡尔曼滤波，常见对照基线 |

---

## ❓ 论文要解决什么问题？

- **纯本体感知里程计**：足式机器人常在无外部定位环境（室内、地下、野外）工作，需要只靠 IMU + 关节编码器 + 接触信息估计基座位姿与速度，且要抗打滑、抗地形变化。
- **IEKF 的「只线性化一次」短板**：不变卡尔曼滤波把状态嵌到 SE₂(3)、让误差动力学与状态解耦，一致性优于普通 EKF；但更新步仍在单点线性化，遇到**大初始误差 / 强非线性**时估计偏差与收敛速度受限。
- **测量不确定度难刻画**：直接用「腿部运动学位置」做更新，其噪声协方差很难标定；本文改用**接触足速度约束**这种更干净的量。

答案：把 IEKF 的更新步升级为**迭代**（高斯-牛顿）求 MAP，既保留不变滤波的几何优势，又逼近后验模态，收敛更快、一致性更好。

---

## 🔧 方法拆解

### 1. 状态与李群结构（SE₂(3)）
- 状态 = 姿态 **R** ∈ SO(3)、基座速度 **v** ∈ ℝ³、位置 **p** ∈ ℝ³，整体嵌入李群 SE₂(3)。
- 误差用右不变形式 δ𝒳 = Exp(ξ) 定义，使误差动力学**与状态轨迹无关**，这是不变滤波一致性优势的来源。

### 2. 预测步（IMU 传播）
- 用 IMU 角速度、线加速度按 SE₂(3) 上的「自然动力学」传播 R/v/p（含重力补偿），协方差随之传播。

### 3. 更新步（本文核心：迭代不变更新）
- **测量来自接触约束**：在触地阶段，接触足在世界系速度≈0，据此把各接触足速度平均映射回基座，得到基座速度伪测量（类 ZUPT），避开难以标定的腿部位置协方差。
- **写成 MAP 优化**：最小化 ½‖ξ‖²_P + ½‖测量残差(Exp(ξ))‖²_N。
- **高斯-牛顿迭代**：不再只线性化一次，而是反复在最新估计处重线性化、更新 ξ，逼近后验模态；收敛后再更新协方差 P。

### 4. 与基线的关系
- 相比 vanilla IEKF：多了「迭代重线性化」；相比 SO(3)-EKF / 迭代 SO(3)：用了更完整的 SE₂(3) 不变结构。四者在同一实验框架下对照。

### 5. 实验设置
- **仿真**：MuJoCo + Quadruped-PyMPC，8 字轨迹，平整与不平地形，蒙特卡洛评估收敛性与一致性。
- **真机**：公开四足数据集，评估俯仰角等估计误差。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph SENSE["🦿 本体感知输入"]
        IMU["IMU<br/>角速度 ω + 线加速度 a"]
        ENC["关节编码器<br/>→ 足端运动学"]
        CON["接触检测<br/>哪些足触地 (S)"]
    end

    subgraph PRED["📈 预测步 (SE₂(3) 传播)"]
        PROP["按 IMU 传播 R,v,p<br/>误差动力学与状态无关"]
    end

    subgraph MEAS["🎯 测量构造 (类 ZUPT)"]
        VEL["触地足世界系速度≈0<br/>→ 平均映射得基座速度伪测量"]
    end

    subgraph UPD["🔁 迭代不变更新 (核心)"]
        MAP["写成 MAP: ½‖ξ‖²_P + ½‖残差‖²_N"]
        GN["高斯-牛顿迭代<br/>反复重线性化逼近后验模态"]
        COV["收敛后更新协方差 P"]
    end

    subgraph OUT["📤 输出"]
        STATE["基座位姿 R,p + 速度 v<br/>低漂移里程计"]
    end

    IMU --> PROP
    ENC --> VEL
    CON --> VEL
    PROP --> MAP
    VEL --> MAP --> GN --> COV --> STATE
    STATE -.下一时刻反馈.-> PROP

    style SENSE fill:#eef6ff,stroke:#2e86de
    style PRED fill:#f3e8ff,stroke:#8e44ad
    style MEAS fill:#fff7e0,stroke:#d4a017
    style UPD fill:#eafaf1,stroke:#27ae60
    style OUT fill:#fde8e8,stroke:#c0392b
</div>

---

## 🧩 算法运行时序图（mermaid）

> 官方项目页 [Legged-IterIEKF](https://hilton-santana.github.io/Legged-IterIEKF/) 标注「Code coming soon」，暂无公开仓库；下图按论文算法（预测—迭代更新回路）绘制，代码开源后可替换为真实源码时序图。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant SEN as 传感器<br/>(IMU / 编码器)
    participant CD as 接触检测
    participant PR as 预测模块<br/>(SE₂(3) 传播)
    participant UP as 迭代更新<br/>(Gauss-Newton)
    participant ST as 状态 X=(R,v,p), P

    Note over PR,ST: 初始化 X₀, P₀
    loop 每个滤波周期
        SEN-->>PR: 读 IMU (ω, a)
        PR->>ST: 按 SE₂(3) 传播 X, P (预测)
        SEN-->>CD: 读关节编码器 → 足端速度
        CD->>UP: 输出触地足集合 S + 基座速度伪测量
        Note over UP: 更新步写成 MAP 优化
        loop 高斯-牛顿迭代直至收敛
            UP->>ST: 在最新估计处重线性化残差
            UP->>UP: 解增量 ξ 并回代 Exp(ξ) 更新 X
        end
        UP->>ST: 迭代收敛后更新协方差 P
        ST-->>PR: 反馈最新 X 供下周期预测
    end
    Note over ST: 输出低漂移基座位姿与速度里程计
</div>

---

## 💡 核心贡献

1. **迭代化的不变更新**：把 IEKF 的更新步从「单次线性化」升级为「高斯-牛顿迭代求 MAP」，在保持不变滤波几何一致性的同时逼近后验模态。
2. **纯本体感知、抗环境**：更新只用接触足速度约束（类 ZUPT），不依赖难标定的腿部位置协方差，也无需外部传感器。
3. **系统性对照**：在同一框架下与 IEKF、SO(3)-EKF、迭代 SO(3)-EKF 四者对比，验证收敛时间、速度/重力方向、俯仰角误差全面改善。
4. **开源计划**：作者提供项目页并声明将开源，便于足式状态估计社区复现与扩展。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 收敛速度 | 收敛时间最多缩短约 60% |
| 速度/重力估计 | 基座速度与重力方向误差最多降低约 60% |
| 真机俯仰角 | 俯仰角估计误差降低约 12% |
| 一致性 | 迭代不变更新在强非线性/大初始误差下比单次线性化更一致 |
| 依赖 | 仅本体感知（IMU + 编码器 + 接触），无外部定位 |

> ⚠️ 上表为论文定性/近似归纳，具体数值以原文与项目页为准。

---

## 🤖 对（人形）机器人状态估计的意义

| 方向 | 含义 |
|---|---|
| **迭代 × 不变** | 把「迭代卡尔曼滤波」的重线性化优势与「不变滤波」的几何一致性结合，思路可迁移到人形基座估计 |
| **接触约束更新** | 用触地足速度约束替代难标定的腿部位置测量，对多接触、易打滑的人形同样适用 |
| **纯本体感知** | 不依赖相机/动捕，适合算力与传感受限、需在遮挡环境稳健运行的人形本体 |

---

## 🎤 面试参考

**Q：IterIEKF 相比普通 IEKF 到底改了什么？**
A：改的是**更新步**。普通 IEKF 只在当前估计处线性化一次就更新；IterIEKF 把更新写成一个最大后验优化，用高斯-牛顿**反复重线性化**、逼近后验模态。预测步和 SE₂(3) 的不变结构不变，所以既保留不变滤波的一致性优势，又在强非线性/大初始误差时更准、收敛更快。

**Q：为什么用接触足速度约束而不是腿部位置做更新？**
A：因为「腿部运动学位置」的测量噪声协方差很难标定，直接用容易让滤波过/欠自信。IterIEKF 改用触地阶段「接触足世界系速度≈0」这一运动学约束（类 ZUPT），把它平均映射成基座速度伪测量——这个量更干净、协方差更好刻画，对打滑也更稳。

**Q：SE₂(3) 的「不变性」为什么重要？**
A：把状态放到 SE₂(3) 上、用右不变误差，可以让误差动力学**与具体状态轨迹无关**。这带来更好的可观测性与一致性（协方差不会因线性化点乱跳），是不变卡尔曼滤波相对普通 EKF 的核心优势，也是本文迭代更新能稳定收敛的基础。

---

## 🔗 相关阅读

- [Contact-Aided Invariant EKF (1904.09251)](https://arxiv.org/abs/1904.09251)：接触辅助不变 EKF，本模块经典
- [The Invariant EKF as a Stable Observer (1410.1465)](https://arxiv.org/abs/1410.1465)：不变 EKF 稳定观测器理论基础
- [OCELOT (2605.21863)](https://arxiv.org/abs/2605.21863)：纯本体感知抗打滑腿部里程计（同模块）
- [InEKFormer (2511.16306)](https://arxiv.org/abs/2511.16306)：InEKF + Transformer 混合人形状态估计（同模块）
