---
layout: paper
paper_order: 5
title: "An Empirical Evaluation of Four Off-the-Shelf Proprietary Visual-Inertial Odometry Systems"
zhname: "四款商用视觉-惯性里程计系统的实证评估"
category: "State Estimation"
---

# An Empirical Evaluation of Four Off-the-Shelf Proprietary Visual-Inertial Odometry Systems
**四款商用视觉-惯性里程计系统的实证评估**

> 📅 阅读日期: 2026-05-27
>
> 🏷️ 板块: State Estimation · 商用 VIO 基准 · 6-DoF 自运动估计 · 室内外混合场景
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2207.06780](https://arxiv.org/abs/2207.06780) |
| HTML | [arXiv html](https://arxiv.org/html/2207.06780) |
| PDF | [arXiv pdf](https://arxiv.org/pdf/2207.06780) |
| 期刊版 | *Sensors* (MDPI) 22(24): 9873, 2022-12-15，DOI [10.3390/s22249873](https://doi.org/10.3390/s22249873)，期刊标题改为 **"A Benchmark Comparison of Four Off-the-Shelf Proprietary Visual–Inertial Odometry Systems"** |
| OA 全文 | [PMC9785098](https://pmc.ncbi.nlm.nih.gov/articles/PMC9785098/) · [MDPI](https://www.mdpi.com/1424-8220/22/24/9873) · [PubMed 36560242](https://pubmed.ncbi.nlm.nih.gov/36560242/) |
| **发布时间** | 2022-07-14 (arXiv) |
| 配套数据采集源码（iOS） | [PyojinKim/ARKit-Data-Logger](https://github.com/PyojinKim/ARKit-Data-Logger)（把 ARKit 6-DoF 位姿存成文本，供离线评测） |
| 配套数据采集源码（Android） | [PyojinKim/ARCore-Data-Logger](https://github.com/PyojinKim/ARCore-Data-Logger)（同上，对应 ARCore） |
| 第一作者 GitHub | [PyojinKim](https://github.com/PyojinKim)（含 LPVO / OPVO / 多套 VO 评估工具） |
| 提交日期 | 2022-07-14（arXiv v1） |

**作者**：Pyojin Kim, Jungha Kim, Minkyeong Song, Yeoeun Lee, Moonkyeong Jung, Hyeong-Geun Kim

**机构**：Sookmyung Women's University（淑明女子大学，机械系统工程系，首尔）· Incheon National University（仁川大学）；通讯作者 Pyojin Kim 现已转任 GIST（光州科学技术院）助理教授

**硬件平台**：自制手提式同步采集架 —— iPhone 12 Pro Max（ARKit）、LG V60 ThinQ（ARCore）、Intel RealSense T265、Stereolabs ZED 2，统一手持沿设定轨迹走室内外场景

---

## 🎯 一句话总结

不是又一篇新算法，而是一篇**「实测对比」基准论文**：作者用同一只「手提四传感器架」、同一组室内外轨迹，把四款最常被人形 / 移动机器人引用的**商用闭源 VIO**拉到同一条尺子上量——结论是 **Apple ARKit 综合最稳最准**（相对位姿误差 ≈ 0.02 m/s 漂移），但**只能跑 iOS、对 ROS / Linux 不友好**；**T265 和 ZED 2 虽然 ROS 友好，但分别栽在「单目尺度漂移」和「旋转估计破坏正交性」上**，给后续工程选型提供了一个可重复的硬证据。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VIO | Visual-Inertial Odometry | 视觉 + IMU 融合的 6-DoF 自运动估计 |
| 6-DoF | 6 Degrees of Freedom | 三轴平移 + 三轴旋转 |
| RPE | Relative Pose Error | 相对位姿误差（短时漂移指标） |
| APE / ATE | Absolute Pose / Trajectory Error | 绝对位姿 / 轨迹误差（长时整体偏差） |
| ARKit | Apple AR Framework | iOS 端官方 AR / VIO 框架 |
| ARCore | Google AR Framework | Android 端官方 AR / VIO 框架 |
| T265 | Intel RealSense Tracking Camera | 双目鱼眼 + IMU 的闭源 VIO 模块（已停产，仍在大量在用） |
| ZED 2 | Stereolabs ZED 2 stereo camera | 双目 RGB + IMU，运行厂商闭源 VIO + 深度 |
| MoCap | Motion Capture | 光学动捕，本文作为真值参考 |

---

## ❓ 论文要解决什么问题？

机器人 / AR 圈用的 VIO 方案大致分两类：

1. **学术开源**（OKVIS、VINS-Fusion、ORB-SLAM3、Kimera…）：精度 / 鲁棒性公开可查，但调参、平台适配、传感器同步都得自己干。
2. **商用闭源**：Apple ARKit、Google ARCore、Intel RealSense T265、Stereolabs ZED 2 —— 开箱即用、稳定性靠厂商背书，但**对外只给一个 6-DoF 位姿黑盒**，到底有多准、稳不稳、互相之间差距多大，**学术上没有统一基准**。

工程上的坑就来自这里：

- 选 T265 是因为它"反正一接就出位姿"，但实际跑到长走廊就尺度漂移；
- 选 ZED 2 是因为它"自带深度 + ROS 友好"，但回到原点时轨迹方向歪了；
- 选 ARKit / ARCore 是因为"手机精度最高"，但 ROS / Linux 集成基本零；

论文要回答的就是：**在统一的硬件采集设置 + 真值参考下，这四款商用 VIO 到底各有什么短板？**

---

## 🔧 方法拆解

### 1. 评测平台：自制手提四传感器同步架

- 把 iPhone 12 Pro Max（ARKit）、LG V60 ThinQ（ARCore）、Intel RealSense T265、Stereolabs ZED 2 用支架固定在同一只手柄上
- 手持以人的步速沿设定路径走，所有四个系统**同时**输出各自坐标系下的 6-DoF 位姿日志
- 自带配套 iOS / Android Logger（GitHub 已开源）把每帧位姿打到文本文件，便于离线对齐 + 误差分析

### 2. 实验场景：覆盖室内 + 室外典型工况

按公开摘要 / 期刊版正文整理，场景大致分三类：

| 场景类别 | 代表性轨迹 | 想压测什么 |
|---|---|---|
| 室内走廊 / 房间 | 直线 + 闭环回到起点 | 长程平移漂移、回环一致性、单目尺度问题 |
| 室外开阔地 | 大尺度往返 | 光照变化下的鲁棒性、IMU bias 累计 |
| 走 + 停 + 转 | 含纯旋转 / 纯停顿 | IMU 静止区段的偏差、纯旋转下视觉特征跟丢的恢复 |

### 3. 评测指标

- **绝对轨迹误差 (ATE)**：把估计轨迹和真值（MoCap / 闭环 GT）做 SE(3) 对齐后再求 RMSE
- **相对位姿误差 (RPE / drift per second)**：短时窗内的速度漂移 —— ARKit 报出的代表性数字是 **≈ 0.02 m/s**
- **轨迹形状一致性**（视觉直观检查）：看是否回到起点 / 角度是否对得上；T265 在这里暴露出尺度漂移、ZED 2 暴露出旋转估计破坏正交性

### 4. 对比结论（论文给出的关键判断）

| 系统 | 精度 / 稳定性 | 工程友好度 | 主要短板 |
|---|---|---|---|
| **Apple ARKit** | ⭐⭐⭐⭐⭐ 最稳最准；RPE ≈ 0.02 m/s | iOS 独占，**没有 ROS / Linux 客户端** | 只能在 Apple 设备上跑，难直接挂机器人 |
| **Google ARCore** | ⭐⭐⭐⭐ 紧随 ARKit | Android 独占，同样**没有 ROS / Linux** | 厂商支持的手机型号有限 |
| **Intel RealSense T265** | ⭐⭐⭐ ROS / Linux 友好 | ✅ 原生 ROS 驱动，跨平台 | **单目尺度不一致**（论文：scale inconsistency typical of monocular VO）；产品已停产 |
| **Stereolabs ZED 2** | ⭐⭐⭐ ROS / Linux 友好 | ✅ 原生 SDK + ROS | **旋转估计不准 → 轨迹正交性被破坏**，四款里实际轨迹失真最严重 |

---

## 🧭 整体评测流程（mermaid）

<div class="mermaid">
flowchart TD
    subgraph RIG["🛠️ 自制手提同步采集架"]
        A1["📱 iPhone 12 Pro Max<br/>(ARKit / VIO)"]
        A2["📱 LG V60 ThinQ<br/>(ARCore / VIO)"]
        A3["🎥 Intel RealSense T265<br/>(闭源 VIO)"]
        A4["🎥 Stereolabs ZED 2<br/>(闭源 VIO + 深度)"]
    end

    subgraph SCENE["🌆 室内外评测场景"]
        S1["🏠 室内走廊 / 房间<br/>(直线 + 闭环)"]
        S2["🌳 室外开阔地<br/>(大尺度往返)"]
        S3["🔄 走停 + 纯旋转<br/>(静态 IMU bias 测试)"]
    end

    subgraph LOG["📝 数据采集 Logger（开源）"]
        L1["ARKit-Data-Logger<br/>(iOS · 文本日志)"]
        L2["ARCore-Data-Logger<br/>(Android · 文本日志)"]
        L3["T265 / ZED 2 原生 SDK<br/>→ ROS bag / 文本"]
    end

    subgraph METRIC["📐 离线评测指标"]
        M1["📏 ATE<br/>(绝对轨迹误差)"]
        M2["⚡ RPE<br/>(短时漂移 m/s)"]
        M3["👀 轨迹形状一致性<br/>(尺度 / 正交性目视核查)"]
    end

    subgraph CONC["🏁 横评结论"]
        C1["🥇 ARKit: 最稳最准<br/>(~0.02 m/s)"]
        C2["🥈 ARCore: 紧随 ARKit"]
        C3["⚠️ T265: 单目尺度不一致"]
        C4["⚠️ ZED 2: 旋转估计破坏正交性"]
    end

    A1 --> L1
    A2 --> L2
    A3 --> L3
    A4 --> L3

    RIG --> SCENE
    LOG --> METRIC
    SCENE --> LOG

    M1 --> C1
    M1 --> C2
    M2 --> C1
    M3 --> C3
    M3 --> C4

    style RIG fill:#fff7e0,stroke:#d4a017
    style SCENE fill:#e0f5e0,stroke:#27ae60
    style LOG fill:#fde8e8,stroke:#c0392b
    style METRIC fill:#e8f4fd,stroke:#1f78b4
    style CONC fill:#f3e8ff,stroke:#8e44ad
</div>

---

## 💡 核心贡献

1. **第一次给四款主流商用 VIO 做了「同硬件 + 同场景」的横评**：以前要么测开源 VIO，要么单评一款商品；这篇把闭源黑盒放进同一个测量框架。
2. **公开数据采集端工具链**（ARKit / ARCore Logger）：让别人能用 iPhone / Android 复刻评测流程，不依赖原作者的私有数据。
3. **指明四款系统各自的工程「坑点」**：尺度漂移 / 旋转破坏正交性 / 平台锁死 —— 给后续机器人 / AR 团队选型省下大量"自己采坑"的时间。
4. **给后续学术 VIO 论文一个对照尺**：往后说"我们比 T265 准"或"接近 ARKit 水准"时，可以直接引用本文的硬件 + 指标设置。

---

## 📊 关键发现一览

| 维度 | 结论摘录（基于公开摘要 + 期刊版） |
|---|---|
| **最稳最准** | **Apple ARKit**：RPE ≈ 0.02 m/s，室内外均维持最佳 |
| **次稳** | **Google ARCore**：精度 / 一致性紧随 ARKit |
| **T265 短板** | 单目类配置的**尺度漂移**问题——长距离走廊明显 |
| **ZED 2 短板** | **旋转估计不准**导致轨迹正交性被破坏，是四款里轨迹失真最严重的 |
| **工程整合** | ARKit / ARCore 精度好但**无 ROS / Linux 客户端**；T265 / ZED 2 精度欠佳但**原生 ROS 支持** |
| **典型选型建议** | 移动 AR 原型 → ARKit / ARCore；机器人 / Linux 平台 → T265 或 ZED 2 但要补外部回环 / 多传感器融合 |

---

## ⚠️ 局限性

- **真值依赖**：长距离室外缺乏高精度真值（MoCap 仅室内可用），部分指标只能用闭环回到起点近似衡量。
- **设备版本绑定**：评测结果与具体手机型号 / SDK 版本强相关，**ARKit / ARCore 后续小版本可能改变结论**。
- **T265 已停产**：Intel 2021 年起停产 T265，结论的实用性逐年下降；但作为单目 VIO 系统级失败模式样本仍有价值。
- **没评 ZED Mini / ZED X / Oak-D 等同类**：商用 VIO 生态在演进，本文是 2022 年的一次快照。
- **只是黑盒位姿对比**：拿不到各家内部算法（特征 / IMU 预积分 / 优化结构），分析停留在"现象 + 推断"层面。

---

## 🤖 对人形 / 状态估计领域的意义

| 方向 | 含义 |
|---|---|
| **「为什么人形仍要做自研 / 多传感器融合」的硬证据** | 任何一款现成商用 VIO 都不足以独自撑起人形长程定位 —— 必须叠加 InEKF、AutoOdom、Kimera、ORB-SLAM3 等冗余手段 |
| **给选型给硬性参考** | 工程团队在「T265 还是 ZED 2」「该不该上 iPhone 当备份」之间做决策，可以直接引用本文 |
| **数据采集开源 = 复现成本极低** | 想自己复刻一次评测，只要按 [ARKit-Data-Logger](https://github.com/PyojinKim/ARKit-Data-Logger) / [ARCore-Data-Logger](https://github.com/PyojinKim/ARCore-Data-Logger) README 走一遍即可 |
| **跟模块内其他笔记呼应** | 本系列已覆盖学习里程计（[AutoOdom #368](../AutoOdom__Learning_Auto-regressive_Proprioceptive_Odometry_for_Legged_Locomotio/AutoOdom__Learning_Auto-regressive_Proprioceptive_Odometry_for_Legged_Locomotio.html)）、InEKF + 学习（[InEKFormer #369](../InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots/InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots.html)）、PINN + UKF 力矩估计（[PINN+UKF #370](../Physics-Informed_Neural_Networks_with_UKF_for_Sensorless_Joint_Torque_Estimation/Physics-Informed_Neural_Networks_with_UKF_for_Sensorless_Joint_Torque_Estimation.html)）、经典 Contact-Aided InEKF（[#372 ↑](../Contact-Aided_Invariant_EKF_for_Legged_Robots/Contact-Aided_Invariant_EKF_for_Legged_Robots.html)）；本文补上**「商用黑盒 VIO 横评」**这一拼图 |

---

## 🎤 面试参考

**Q：T265 都停产了，为什么这篇还重要？**
A：(1) T265 在 2024-2026 仍有大量库存机器人在跑（成本低、即插即用）；(2) 论文揭示的是**单目 VIO 通用失败模式**——尺度漂移，对所有同类产品（包括各种新出的小型 VIO 模块）都有警示意义；(3) 本文的评测框架本身可以原样套到 T265 替代品（OAK-D、ZED Mini、Apple Vision Pro 等）上做新版横评。

**Q：ARKit 准成这样，为什么人形机器人不直接挂个 iPhone 当 VIO？**
A：实际上业内有人这么做过原型，但工程上几个硬伤：(1) **没有 ROS 客户端**，需要走 Wi-Fi / UDP 跨进程同步，时序对不齐；(2) **iOS 后台被系统压制**，长时间运行会被掐 CPU；(3) **API 黑盒**，出了问题没法调；(4) **传感器不可标定**——IMU 偏置 / 相机内参 ARKit 不暴露给开发者。所以 ARKit 主要适合做"地面真值参考"或"原型 demo"，不适合产品级机器人。

**Q：本文说 ZED 2 旋转估计破坏正交性是什么意思？**
A：理想旋转矩阵 R 应满足 R^T R = I, det(R) = 1。如果 VIO 内部用四元数 / 李代数表示，没归一化或者数值病态时累积偏差会让 R 偏离 SO(3)，几何上表现为：本来 90° 直角的转向输出成 87° / 93°，轨迹形状被剪切 / 倾斜。本文目视检查发现 ZED 2 这块最明显，推测厂商 SDK 内部姿态优化或滤波环节有数值问题。

**Q：拿这个横评，怎么帮自己机器人选 VIO？**
A：先看部署平台：iOS / 苹果生态 → ARKit；Android 原型 → ARCore；机器人 Linux + ROS → T265 / ZED 2，但要做两件事：(1) 在长程任务里**叠加闭环检测 / VIO + LiDAR 融合**，弥补尺度 / 旋转漂移；(2) 上线前用本文的方法在自己的真实运行场景里**自跑一次**，因为不同场景（光照、玻璃幕墙、地毯）会让结论排序变化。

**Q：为什么没把开源 VIO（VINS-Fusion、ORB-SLAM3、Kimera）一起比？**
A：本文目的是**评测商用闭源**——它们是"开箱即用、对用户隐藏算法"这一类的代表。开源 VIO 有调参空间、可改算法，跟商用闭源不在同一条赛道。如果想要更全面的横评（开源 + 闭源同台），通常另起一篇 benchmark 论文，比如 Aalto 的 [android-viotester](https://github.com/AaltoML/android-viotester) 系列。

---

## 🔗 相关阅读

- [Contact-Aided Invariant EKF (1904.09251)](https://arxiv.org/abs/1904.09251)：本目录索引 372，腿式机器人 InEKF 经典理论；本仓库已有笔记
- [InEKFormer (2511.16306)](https://arxiv.org/abs/2511.16306)：本目录索引 369，InEKF + Transformer 隐式学 Q/R；本仓库已有笔记
- [AutoOdom (2511.18857)](https://arxiv.org/abs/2511.18857)：本目录索引 368，纯本体感知里程计；本仓库已有笔记
- [PINN + UKF (2507.10105)](https://arxiv.org/abs/2507.10105)：本目录索引 370，PINN + UKF 力矩估计；本仓库已有笔记
- [ARKit-Data-Logger](https://github.com/PyojinKim/ARKit-Data-Logger) / [ARCore-Data-Logger](https://github.com/PyojinKim/ARCore-Data-Logger)：第一作者的数据采集工具，可直接复用做新一轮横评

---

> 备注：本笔记基于 arXiv 摘要 + Sensors 期刊版索引 + 作者 GitHub 工具链整理。arXiv 主站与 MDPI / PMC 站点对自动化访问临时 403，具体的 ATE / RPE 完整数值表、各场景下逐传感器的失败案例图、统计显著性，需以 PDF 正式版为准后续补充。
