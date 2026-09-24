---
layout: paper
title: "ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual-Inertial and Multi-Map SLAM"
zhname: "ORB-SLAM3：视觉、视觉-惯性与多地图 SLAM 的高精度开源库"
category: "State Estimation"
arxiv: "2007.11898"
---

# ORB-SLAM3: An Accurate Open-Source Library for Visual, Visual-Inertial and Multi-Map SLAM
**在 ORB-SLAM2 的「跟踪 / 局部建图 / 闭环」三线程框架上加了两件事：一是从 IMU 初始化阶段起就完全基于最大后验（MAP）估计的紧耦合视觉-惯性 SLAM，二是由 Atlas 管理的多地图系统——跟丢时新开一张地图，重访旧区域时用高召回的位置识别把地图无缝合并；同一套代码支持单目 / 双目 / RGB-D、针孔 / 鱼眼相机，有无 IMU 均可。**

> 📅 总结日期: 2026-09-24
>
> 🏷️ 板块: 09 State Estimation · 视觉 SLAM · 视觉-惯性里程计(VIO) · 光束法平差(BA) · 多地图 / 位置识别
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → ~~08_Navigation~~ → **09_State_Estimation**）· 08_Navigation 中上游 awesome-humanoid-robot-learning 收录的论文已全部有笔记，顺延到 09；本模块上游仅剩 4 个库类条目，ORB-SLAM3（2020.07）为其中发表最新者

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2007.11898](https://arxiv.org/abs/2007.11898) |
| HTML | [在线阅读（arXiv HTML 视图）](https://arxiv.org/html/2007.11898) |
| PDF | [下载](https://arxiv.org/pdf/2007.11898) |
| 期刊 | IEEE Transactions on Robotics (T-RO), vol. 37, no. 6, 2021 · DOI [10.1109/TRO.2021.3075644](https://doi.org/10.1109/TRO.2021.3075644) |
| **发布时间** | 2020-07-23 (arXiv v1) · 2021-04-23 (IEEE T-RO) |
| 源码 | 🌟 [github.com/UZ-SLAMLab/ORB_SLAM3](https://github.com/UZ-SLAMLab/ORB_SLAM3)（C++，GPLv3；依赖 OpenCV / Eigen3 / Pangolin，`Thirdparty/` 内置 DBoW2、g2o、Sophus；附 EuRoC / TUM-VI / KITTI 等示例与 ROS 节点） |

**作者**：Carlos Campos, Richard Elvira, Juan J. Gómez Rodríguez, José M. M. Montiel, Juan D. Tardós（西班牙萨拉戈萨大学 I3A）

---

## 🎯 一句话总结

ORB-SLAM3 是**第一个在单目 / 双目 / RGB-D、针孔 / 鱼眼相机上同时支持纯视觉、视觉-惯性和多地图 SLAM 的开源系统**。它有两处核心创新：① **全程基于 MAP 的紧耦合视觉-惯性 SLAM**，连 IMU 初始化也写成 MAP 问题（先纯惯性优化求尺度、重力方向、速度和零偏，再联合视觉-惯性 BA），精度比此前方法高 **2–5 倍**；② **Atlas 多地图 + 高召回位置识别**：视觉信息差、跟丢时不再重定位失败退出，而是新开一张地图继续跑，重访旧区域时检测到公共区域就把两张地图合并。借此它能在 BA 里用到**时间上相隔很久、甚至来自之前建图会话**的共视关键帧，拿到高视差约束。双目-惯性配置在 EuRoC 上平均误差 **3.6 cm**，在 TUM-VI room 快速手持序列上 **9 mm**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| SLAM | Simultaneous Localization and Mapping | 同时定位与建图 |
| VIO / VI | Visual-Inertial (Odometry) | 视觉-惯性（里程计） |
| MAP | Maximum-a-Posteriori | 最大后验估计 |
| BA | Bundle Adjustment | 光束法平差，联合优化相机位姿与三维点 |
| ORB | Oriented FAST and Rotated BRIEF | 本系统使用的二进制特征点 |
| DBoW2 | Bag of Binary Words | 基于词袋的图像检索库，用于位置识别 |
| Atlas | — | ORB-SLAM3 的多地图容器：一张活动地图 + 若干非活动地图 |
| KF / MP | KeyFrame / MapPoint | 关键帧 / 地图点 |
| ATE | Absolute Trajectory Error | 绝对轨迹误差 |

---

## ❓ 论文要解决什么问题？

1. **视觉-惯性初始化又慢又不准**：以往 VI 系统（如 VINS-Mono、ORB-SLAM-VI）的 IMU 初始化多用解析/分步近似，忽略传感器不确定性，尺度和零偏要十几秒才收敛，初值差还会拖累后续精度。
2. **跟丢就前功尽弃**：纯靠短时窗口的视觉里程计在弱纹理、快速运动、遮挡时容易跟丢；传统单地图 SLAM 跟丢后只能等重定位，期间的轨迹和地图都会丢失。
3. **只用短期信息**：多数 VIO 只用最近几秒的数据，没法利用「很久以前 / 上一次建图时见过的同一区域」提供的高视差约束，长时间运行必然漂移。
4. **传感器 / 相机模型各一套代码**：单目、双目、RGB-D、鱼眼往往需要不同系统，缺少一个统一、可复现的高精度开源基线。

---

## 🔧 方法拆解

**① 三线程框架（沿袭 ORB-SLAM2）**
- **Tracking**：每帧提取 ORB 特征，基于上一帧 / 参考关键帧 / 局部地图做位姿跟踪；有 IMU 时先用预积分预测位姿，只优化当前帧（及上一帧）的视觉-惯性状态；决定是否插入新关键帧。
- **Local Mapping**：接收新关键帧，三角化新地图点、剔除坏点和冗余关键帧，对局部共视窗口做（视觉或视觉-惯性）局部 BA；IMU 初始化也在这个线程完成。
- **Loop Closing & Map Merging**：对每个新关键帧做位置识别；命中同一张地图则闭环，命中 Atlas 中另一张地图则合并，之后在独立线程里跑全局 BA。

**② 基于 MAP 的视觉-惯性初始化**
- 先跑约 2 s 的纯视觉单目/双目 SLAM，得到按比例的轨迹；
- 再做**纯惯性 MAP 优化**：以视觉轨迹为固定值，联合估计尺度、重力方向、各关键帧速度和 IMU 零偏，并把 IMU 噪声的先验一并考虑；
- 最后进入**视觉-惯性联合 BA**，并在运行初期再做几次尺度 / 重力精修（源码中的 `InitializeIMU` 与 `ScaleRefinement`）。约 2 s 内就能得到误差约 5% 的尺度估计，远快于以往方法。

**③ Atlas 多地图**
- Atlas 维护一张**活动地图**（Tracking 正在用）和若干**非活动地图**；
- 跟丢且短时间重定位失败时，新建一张活动地图继续工作，旧图保存进 Atlas；
- 所有地图共享一个关键帧数据库（DBoW2），位置识别可以跨地图检索。

**④ 高召回位置识别 + 地图合并**
- 先用 DBoW2 取出 3 个最佳候选关键帧，再用候选的共视关键帧做几何验证（ORB 匹配 + Sim(3)/SE(3) 对齐）；只要再检查 3 个时间上相邻的共视关键帧就能确认，不必像 ORB-SLAM2 那样等连续 3 帧都命中，召回率更高、延迟更小；
- 同一地图 → **闭环**：位姿图优化 + 全局 BA；
- 不同地图 → **合并**：先在连接区域做 *welding BA*（缝合 BA）把两张图局部缝上，再做本质图优化，把非活动地图整体并入活动地图。

**⑤ 相机模型抽象**
- 把投影 / 反投影 / 雅可比封装成 `GeometricCamera` 接口（针孔、Kannala-Brandt 鱼眼），SLAM 流程与相机模型解耦；鱼眼双目只需在两目重叠区域做立体匹配。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph IN["📷 输入"]
        CAM["图像<br/>单目 / 双目 / RGB-D<br/>针孔 / 鱼眼"]
        IMU["IMU 测量<br/>(可选)"]
    end

    subgraph TRK["🏃 Tracking 线程（逐帧）"]
        ORB["提取 ORB 特征"]
        PRE["IMU 预积分<br/>预测当前位姿"]
        TR["跟踪：运动模型 / 参考关键帧<br/>→ 局部地图跟踪"]
        LOST{"跟丢？"}
        RELOC["重定位"]
        NEWMAP["在 Atlas 中新建活动地图"]
        KFQ["需要新关键帧？"]
    end

    subgraph LM["🧱 Local Mapping 线程"]
        PROC["插入关键帧 · 剔除坏地图点<br/>三角化新地图点"]
        LBA["局部 BA<br/>(视觉 / 视觉-惯性)"]
        INIT["MAP 式 IMU 初始化<br/>纯惯性优化 → 联合 VI-BA<br/>尺度 / 重力精修"]
        CULL["剔除冗余关键帧"]
    end

    subgraph LC["🔁 Loop Closing & Merging 线程"]
        PR["位置识别<br/>DBoW2 取 3 个候选 + 共视几何验证"]
        SAME{"命中同一地图？"}
        LOOP["闭环校正<br/>位姿图优化"]
        MERGE["地图合并<br/>welding BA + 本质图优化"]
        GBA["全局 BA（独立线程）"]
    end

    ATLAS[("🗺️ Atlas<br/>活动地图 + 非活动地图<br/>共享关键帧数据库")]
    OUT["✅ 输出：相机位姿 Tcw + 稀疏地图"]

    CAM --> ORB
    IMU --> PRE
    ORB --> TR
    PRE --> TR
    TR --> LOST
    LOST -->|是| RELOC
    RELOC -->|失败| NEWMAP --> ATLAS
    LOST -->|否| KFQ
    KFQ -->|是| PROC
    TR --> OUT
    PROC --> LBA --> INIT --> CULL --> PR
    PR --> SAME
    SAME -->|是| LOOP --> GBA
    SAME -->|否，另一张地图| MERGE --> GBA
    GBA --> ATLAS
    LBA --> ATLAS
    ATLAS -.局部地图.-> TR

    style IN fill:#fff7e0,stroke:#d4a017
    style TRK fill:#eef6ff,stroke:#2e86de
    style LM fill:#f3eafe,stroke:#8e44ad
    style LC fill:#fdecea,stroke:#c0392b
    style OUT fill:#eafaf1,stroke:#27ae60,color:#1b1b1b
</div>

---

## 🖥️ 源码运行时序（UZ-SLAMLab/ORB_SLAM3）

> 以双目-惯性（`IMU_STEREO`）为例，函数名取自仓库 `src/System.cc`、`src/Tracking.cc`、`src/LocalMapping.cc`、`src/LoopClosing.cc`。`System` 构造时会创建 `Atlas`、`Tracking`，并分别用 `std::thread` 启动 `LocalMapping::Run`、`LoopClosing::Run`（以及可选的 `Viewer::Run`）；Tracking 跑在调用者线程里。

<div class="mermaid">
sequenceDiagram
    participant App as 示例程序<br/>(stereo_inertial_euroc)
    participant Sys as System
    participant Trk as Tracking
    participant Atlas as Atlas
    participant LM as LocalMapping 线程
    participant LC as LoopClosing 线程
    participant GBA as 全局 BA 线程

    App->>Sys: System(vocab, settings, IMU_STEREO)
    Sys->>Atlas: new Atlas(0)
    Sys->>LM: new thread(LocalMapping::Run)
    Sys->>LC: new thread(LoopClosing::Run)

    loop 每一帧图像
        App->>Sys: TrackStereo(imL, imR, t, vImuMeas)
        Sys->>Trk: GrabImuData(imu) × N
        Sys->>Trk: GrabImageStereo(imL, imR, t)
        Trk->>Trk: Track()：PreintegrateIMU()
        alt 尚未初始化
            Trk->>Trk: StereoInitialization()
        else 正常跟踪
            Trk->>Trk: TrackWithMotionModel() / TrackReferenceKeyFrame()
            Trk->>Trk: TrackLocalMap()
        end
        alt 跟丢且 Relocalization() 失败
            Trk->>Atlas: CreateMapInAtlas() → CreateNewMap()
        end
        opt NeedNewKeyFrame()
            Trk->>LM: CreateNewKeyFrame() → InsertKeyFrame(KF)
        end
        Trk-->>Sys: 返回位姿 Tcw
        Sys-->>App: Tcw
    end

    loop LocalMapping::Run
        LM->>LM: ProcessNewKeyFrame() · MapPointCulling()
        LM->>LM: CreateNewMapPoints() · SearchInNeighbors()
        LM->>LM: LocalInertialBA() 或 LocalBundleAdjustment()
        LM->>LM: InitializeIMU() / ScaleRefinement()（初始化阶段）
        LM->>LM: KeyFrameCulling()
        LM->>LC: InsertKeyFrame(KF)
    end

    loop LoopClosing::Run
        LC->>LC: NewDetectCommonRegions()<br/>(DetectNBestCandidates + 几何验证)
        alt 检测到另一张地图（merge）
            LC->>Atlas: MergeLocal() / MergeLocal2()（有 IMU 时）
            LC->>GBA: new thread(RunGlobalBundleAdjustment)
        else 检测到同一地图（loop）
            LC->>LC: CorrectLoop()（位姿图优化）
            LC->>GBA: new thread(RunGlobalBundleAdjustment)
        end
    end
</div>

---

## 💡 核心贡献

1. **全程 MAP 的紧耦合 VI-SLAM**：从 IMU 初始化到跟踪、局部建图都基于最大后验估计，初始化快且准，精度较此前 VI 方法提升 2–5 倍。
2. **Atlas 多地图系统**：跟丢时新开地图、重访时无缝合并，能挺过长时间视觉退化；也支持多会话建图（复用之前会话的地图）。
3. **高召回位置识别**：用候选关键帧的共视邻域做几何验证，而不是等时间上的连续命中，召回更高、闭环 / 合并更及时。
4. **中长期数据关联**：BA 中能纳入时间上相距很远、甚至来自旧会话的共视关键帧，这是只看最近几秒的 VIO 做不到的。
5. **统一开源实现**：单目 / 双目 / RGB-D × 针孔 / 鱼眼 × 有无 IMU，同一套 C++ 代码，成为此后视觉 / 视觉-惯性 SLAM 的事实基线。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| EuRoC（无人机） | 双目-惯性平均轨迹误差约 **3.6 cm**；各传感器配置下鲁棒性与当时最好系统相当，精度明显更高 |
| TUM-VI（手持，AR/VR 场景） | room 序列快速手持运动下误差约 **9 mm** |
| IMU 初始化 | 约 2 s 即可把尺度误差压到约 5%，远快于以往方法 |
| 多地图 / 多会话 | 在跟丢后通过合并地图恢复全局一致的轨迹；多会话 EuRoC / TUM-VI 实验中复用旧地图进一步降低误差 |
| 对比基线 | ORB-SLAM2、VINS-Mono / VINS-Fusion、OKVIS、ROVIO、DSO、Kimera、BASALT 等 |

> ⚠️ 上表数值取自论文摘要与正文实验部分，具体以 T-RO 正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **外感定位基线** | 人形头部相机 + 机身 IMU 是最常见的外感配置，ORB-SLAM3 是做视觉 / 视觉-惯性定位时最常用的开源对照基线（本板块 KILVO、VIO 评测等工作都以这类系统为参照） |
| **与本体里程计互补** | InEKF / 腿部运动学里程计在打滑、腾空时会漂移，但频率高；视觉-惯性 SLAM 频率低，却能靠闭环消掉累计误差。两者常组合使用：高频本体估计给控制，低频 SLAM 给全局位姿与地图 |
| **跟丢后的恢复** | 人形行走中的冲击、抖动和快速转头很容易导致视觉跟丢，Atlas「跟丢就新开一张图、之后再合并」的机制正好适合这种场景 |
| **导航与建图** | 稀疏地图 + 全局一致位姿是人形室内导航、重复任务（多会话复用地图）的基础组件 |
| **局限** | 稀疏特征地图不直接适用于避障 / 落脚点规划；弱纹理、强光照变化和剧烈抖动下仍会退化，人形上通常还需叠加稠密建图或 LiDAR |

---

## 🎤 面试参考

**Q：ORB-SLAM3 相比 ORB-SLAM2 主要多了什么？**
A：两件事。一是紧耦合视觉-惯性 SLAM，且 IMU 初始化也写成 MAP 优化（先纯惯性优化尺度、重力、速度、零偏，再联合 VI-BA）；二是 Atlas 多地图 + 更高召回的位置识别，跟丢后新开地图、重访时合并地图。此外还把相机模型抽象出来，支持鱼眼。

**Q：为什么说它能利用「中长期」数据关联？**
A：普通 VIO 只在最近几秒的滑窗里优化。ORB-SLAM3 保留全部关键帧和共视图，局部 BA 会纳入时间上很远但共视的关键帧；闭环 / 合并还能把之前会话的地图接进来。这些关键帧和当前帧之间视差大，约束强，所以精度高、漂移小。

**Q：地图合并和闭环有什么区别？**
A：闭环是同一张地图里发现回到了老地方，做位姿图优化 + 全局 BA 校正漂移；合并是发现当前活动地图和 Atlas 里另一张非活动地图有公共区域，先 welding BA 把连接处缝起来，再把旧图整体并入活动地图。

---

## 🔗 相关阅读

- [ORB-SLAM2: an Open-Source SLAM System for Monocular, Stereo and RGB-D Cameras (1610.06475)](https://arxiv.org/abs/1610.06475)：ORB-SLAM3 的前身
- [VINS-Mono: A Robust and Versatile Monocular Visual-Inertial State Estimator (1708.03852)](https://arxiv.org/abs/1708.03852)：VINS-Fusion 的基础，同为上游 State Estimation 条目
- [Kimera: an Open-Source Library for Real-Time Metric-Semantic Localization and Mapping (1910.02490)](https://arxiv.org/abs/1910.02490)：度量-语义 SLAM 开源库（同板块）
- [An Empirical Evaluation of Four Off-the-Shelf Proprietary Visual-Inertial Odometry Systems (2207.06780)](https://arxiv.org/abs/2207.06780)：商用 VIO 评测（同板块）
- [Contact-Aided Invariant Extended Kalman Filtering (1904.09251)](https://arxiv.org/abs/1904.09251)：足式机器人本体状态估计的经典方法，可与视觉 SLAM 互补（同板块）
