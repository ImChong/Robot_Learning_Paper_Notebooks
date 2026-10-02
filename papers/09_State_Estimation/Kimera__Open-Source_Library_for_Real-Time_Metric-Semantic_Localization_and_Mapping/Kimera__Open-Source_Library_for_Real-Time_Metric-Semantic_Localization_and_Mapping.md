---
layout: paper
title: "Kimera: an Open-Source Library for Real-Time Metric-Semantic Localization and Mapping"
zhname: "Kimera：实时度量-语义定位与建图的开源库"
category: "State Estimation"
arxiv: "1910.02490"
---

# Kimera: an Open-Source Library for Real-Time Metric-Semantic Localization and Mapping
**用双目 + IMU 在 CPU 上实时跑出「位姿 + 三维网格 + 语义标签」：四个可拆可合的模块——基于 GTSAM 因子图的视觉-惯性里程计 Kimera-VIO、带 PCM 外点剔除的鲁棒位姿图优化 Kimera-RPGO、低延迟局部网格 Kimera-Mesher、基于 TSDF 与语义光线投射的全局语义网格 Kimera-Semantics，分跑在四个不同频率的线程里。**

> 📅 总结日期: 2026-10-02
>
> 🏷️ 板块: 09 State Estimation · 视觉-惯性里程计(VIO) · 因子图 / 固定滞后平滑 · 鲁棒位姿图优化 · 三维网格 · 度量-语义建图
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → ~~08_Navigation~~ → **09_State_Estimation**）· 08_Navigation 中上游 awesome-humanoid-robot-learning 收录的论文已全部有笔记，顺延到 09；本模块上游仅剩 GTSAM / Kimera / VINS-Fusion 三个库类条目，Kimera（2019.10）为其中发表最新者

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [1910.02490](https://arxiv.org/abs/1910.02490) |
| HTML | [在线阅读（arXiv HTML 视图）](https://arxiv.org/html/1910.02490) |
| PDF | [下载](https://arxiv.org/pdf/1910.02490) |
| 会议 | IEEE International Conference on Robotics and Automation (ICRA) 2020 |
| **发布时间** | 2019-10-06 (arXiv v1) · 2020-03-04 (arXiv v3) |
| 源码 | 🌟 总入口 [github.com/MIT-SPARK/Kimera](https://github.com/MIT-SPARK/Kimera)（BSD），各模块分仓：[Kimera-VIO](https://github.com/MIT-SPARK/Kimera-VIO) · [Kimera-VIO-ROS](https://github.com/MIT-SPARK/Kimera-VIO-ROS) · [Kimera-RPGO](https://github.com/MIT-SPARK/Kimera-RPGO) · [Kimera-Semantics](https://github.com/MIT-SPARK/Kimera-Semantics)；依赖 GTSAM ≥ 4.1、OpenCV、OpenGV、DBoW2 |
| 视频 | [YouTube 演示](https://www.youtube.com/watch?v=-5XxXRABXJs) |

**作者**：Antoni Rosinol, Marcus Abate, Yun Chang, Luca Carlone（MIT LIDS · SPARK Lab）

---

## 🎯 一句话总结

Kimera 把 **VIO、位姿图优化、网格重建、三维语义分割** 四个原本分开研究的方向拼进同一个 C++ 库（名字取自希腊神话里的「嵌合体」Chimera）。它只用**双目相机 + IMU**、**只靠 CPU** 实时运行，输出 IMU 频率的位姿、全局一致的轨迹、低延迟的局部网格和带语义标签的全局网格；四个模块可以单独用（比如只当一个 VIO），也可以组合成完整的度量-语义 SLAM。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VIO | Visual-Inertial Odometry | 视觉-惯性里程计 |
| PGO / RPGO | (Robust) Pose Graph Optimization | （鲁棒）位姿图优化 |
| PCM | Pairwise Consistent Measurement Set Maximization | 成对一致性最大测量集，用来剔除错误闭环 |
| iSAM2 | incremental Smoothing and Mapping 2 | GTSAM 里的增量因子图求解器 |
| TSDF | Truncated Signed Distance Function | 截断符号距离场，体素化稠密建图 |
| DBoW2 | Bag of Binary Words | 词袋图像检索，用于闭环检测 |
| ATE | Absolute Trajectory Error | 绝对轨迹误差 |
| mIoU | mean Intersection over Union | 语义分割平均交并比 |

---

## ❓ 论文要解决什么问题？

1. **几何与语义各做各的**：SLAM 只给几何（点云 / 位姿），深度学习语义分割只在 2D 图像上，机器人要「把杯子拿给我」「从红门出去」需要两者合在一起的三维模型。
2. **已有度量-语义方案太重**：SemanticFusion、Mask-Fusion 等大多依赖 RGB-D、要 GPU、采用跟踪与建图交替（alternation）的方式，室外和资源受限的平台用不了。
3. **闭环外点会毁掉地图**：感知混叠（两层楼长得一样的房间）会产生错误闭环，传统 PGO 对 DBoW2 阈值非常敏感，需要大量调参。
4. **缺统一开源基线**：VIO、网格、语义各有代码，研究者想在其中某一块做改进时，没有一套能直接替换模块的完整系统。

---

## 🔧 方法拆解

**① Kimera-VIO：基于因子图的视觉-惯性里程计**
- **IMU 前端**：两关键帧之间做流形上的 IMU 预积分（Forster et al.），约 40 µs，可按 IMU 频率（> 200 Hz）输出状态；
- **视觉前端**：Shi-Tomasi 角点 + Lucas-Kanade 光流跟踪 + 左右目立体匹配；几何验证用单目 5 点 RANSAC 和双目 3 点 RANSAC（也可借 IMU 旋转改用 2 点 / 1 点）。检测、立体匹配、验证只在关键帧做（约 45 ms），普通帧只跟踪（约 4.5 ms）；
- **后端**：关键帧时把预积分 IMU 因子和**无结构（structureless）视觉因子**加入固定滞后平滑器，用 GTSAM 的 iSAM2 求解；三维点由 DLT 三角化后被解析消元出状态，消元前剔除相机背后、视差不足和重投影误差过大的点；滑出窗口的状态被边缘化。后端每次优化 < 40 ms。

**② Kimera-RPGO：鲁棒位姿图优化**
- DBoW2 词袋快速召回候选闭环，再用与前端相同的单目 / 双目几何验证过滤；
- 剩下的闭环仍可能有外点，于是改造 **PCM**：(i) 加一项**里程计一致性检验**——沿「里程计 + 闭环」构成的环路复合位姿应接近单位变换，用卡方检验判外点；(ii) 把成对一致性邻接矩阵改为**增量构建**（每来一个新闭环只加一行一列），再用快速最大团找出最大一致闭环集合，与里程计一起交给 GTSAM 做 Gauss-Newton。

**③ Kimera-Mesher：低延迟三维网格**
- **单帧网格**：对当前关键帧中成功跟踪的 2D 特征做 Delaunay 三角剖分，再用后端三维点反投影成 3D 网格（< 5 ms），可直接用于快速避障，也可贴 2D 语义标签；
- **多帧网格**：把 VIO 窗口内的单帧网格合并、按最新后端估计更新顶点、删掉滑出窗口的旧顶点（约 15 ms）；检测到平面时还能把规则性因子回加到 VIO 后端，形成网格与 VIO 的紧耦合。

**④ Kimera-Semantics：全局度量-语义网格**
- 每个关键帧用半全局匹配（SGM）求稠密双目点云，借 Voxblox 的 **bundled raycasting** 融合进 TSDF，再用 marching cubes 提取全局网格；
- 2D 语义分割（任意现成网络）给每个三维点打标签；每束光线统计标签频率得到概率向量，只在 TSDF 截断距离内（表面附近）沿光线做**贝叶斯更新**，最终每个体素取最可能标签。每个关键帧更新约 0.1 s。

**⑤ 四线程架构**
- 线程 1：VIO 前端（IMU 频率位姿）；线程 2：VIO 后端 + Mesher（低延迟，服务控制与避障）；线程 3：RPGO（慢，全局一致轨迹）；线程 4：Semantics（慢，服务路径规划等低频需求）。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["📷 输入"]
        ST["双目图像"]
        IMU["IMU（高频）"]
        SEG["2D 语义分割<br/>(任意现成网络)"]
    end

    subgraph VIO["⚡ Kimera-VIO（线程 1–2）"]
        PRE["IMU 预积分<br/>~40 µs"]
        FE["视觉前端<br/>Shi-Tomasi + KLT<br/>立体匹配 · RANSAC 验证"]
        KF{"关键帧？"}
        BE["后端：固定滞后平滑<br/>预积分因子 + 无结构视觉因子<br/>GTSAM iSAM2"]
    end

    subgraph MESH["🔺 Kimera-Mesher（线程 2）"]
        M1["单帧网格<br/>2D Delaunay → 反投影 3D"]
        M2["多帧网格<br/>窗口内合并 + 更新"]
    end

    subgraph RPGO["🔁 Kimera-RPGO（线程 3）"]
        LCD["DBoW2 候选闭环<br/>+ 几何验证"]
        PCM["PCM 外点剔除<br/>里程计一致性 + 成对一致性<br/>增量最大团"]
        PGO["GTSAM 位姿图优化"]
    end

    subgraph SEM["🏷️ Kimera-Semantics（线程 4）"]
        DS["稠密双目 SGM"]
        RC["bundled raycasting<br/>TSDF + 语义贝叶斯更新"]
        MC["marching cubes<br/>全局语义网格"]
    end

    O1["IMU 频率位姿"]
    O2["全局一致轨迹"]
    O3["低延迟局部网格<br/>→ 避障"]
    O4["全局度量-语义网格<br/>→ 规划 / 人机交互"]

    IMU --> PRE --> FE
    ST --> FE --> KF
    PRE --> O1
    KF -->|是| BE
    BE -->|里程计边| PCM
    FE --> LCD --> PCM --> PGO --> O2
    BE --> M1 --> M2 --> O3
    M2 -.平面规则性因子.-> BE
    ST --> DS --> RC
    SEG --> RC
    BE -->|位姿| RC
    RC --> MC --> O4

    style IN fill:#fff7e0,stroke:#d4a017
    style VIO fill:#eef6ff,stroke:#2e86de
    style MESH fill:#eafaf1,stroke:#27ae60
    style RPGO fill:#fdecea,stroke:#c0392b
    style SEM fill:#f3eafe,stroke:#8e44ad
</div>

---

## 🖥️ 源码运行时序（MIT-SPARK/Kimera-VIO）

> 以 EuRoC 双目 + IMU 离线运行为例，入口 `examples/KimeraVIO.cpp`，函数名取自 `src/pipeline/Pipeline.cpp`、`src/pipeline/StereoImuPipeline.cpp`、`src/frontend/StereoVisionImuFrontend.cpp`、`src/backend/VioBackend.cpp`、`src/loopclosure/LoopClosureDetector.cpp`、`src/mesh/Mesher.cpp`。各模块之间用线程安全队列 + 回调相连；`StereoImuPipeline` 构造末尾 `launchThreads()` 为前端、后端、Mesher、LCD、可视化各起一个 `std::thread`。Kimera-Semantics 在独立仓库中以 ROS 节点运行，订阅 VIO 位姿与语义图像，不在下图中。

<div class="mermaid">
sequenceDiagram
    participant Main as KimeraVIO.cpp
    participant DP as EurocDataProvider
    participant Pipe as StereoImuPipeline
    participant FE as 前端线程<br/>VisionImuFrontendModule
    participant BE as 后端线程<br/>VioBackendModule
    participant MS as Mesher 线程
    participant LCD as LCD 线程<br/>LoopClosureDetector

    Main->>DP: 创建 EurocDataProvider(vio_params)
    Main->>Pipe: 创建 StereoImuPipeline(vio_params)
    Pipe->>Pipe: 创建 DataProvider / Frontend / Backend / Mesher / Lcd 模块<br/>registerOutputCallback 连成队列
    Pipe->>FE: launchThreads()
    Pipe->>BE: launchThreads()
    Main->>DP: registerImuSingleCallback / Left / RightFrameCallback
    par std::async
        Main->>DP: DataProviderInterface::spin()
    and
        Main->>Pipe: Pipeline::spin()
    end

    loop 每帧
        DP->>Pipe: fillSingleImuQueue / fillLeft / RightFrameQueue
        Pipe->>FE: frontend_input_queue_ ← StereoImuSyncPacket
        FE->>FE: nominalSpinStereo()：preintegrateImuMeasurements()
        FE->>FE: processStereoFrame()（KLT 跟踪；关键帧再检测 + 立体匹配 + RANSAC）
        alt 是关键帧
            FE->>BE: backend_input_queue.push(BackendInput{pim, 双目量测})
            BE->>BE: VioBackend::spinOnce()<br/>addVisualInertialStateAndOptimize() → iSAM2
            BE-->>FE: registerImuBiasUpdateCallback：更新 IMU 零偏
            BE->>MS: fillBackendQueue(BackendOutput)
            FE->>MS: fillFrontendQueue(StereoFrontendOutput)
            MS->>MS: Mesher::spinOnce()：2D Delaunay → 3D 网格
            BE->>LCD: fillBackendQueue(BackendOutput)
            FE->>LCD: fillFrontendQueue(FrontendOutput)
            LCD->>LCD: spinOnce()：addOdometryFactorAndOptimize()
            LCD->>LCD: detectLoop()（DBoW2）→ verifyAndRecoverPose()
            opt 闭环通过几何验证
                LCD->>LCD: addLoopClosureFactorAndOptimize()<br/>KimeraRPGO::RobustSolver（PCM）
            end
        end
    end

    DP-->>Main: hasData() == false
    Main->>Pipe: waitForShutdown() → shutdown()
</div>

---

## 💡 核心贡献

1. **首个把 VIO、鲁棒 PGO、网格、三维语义打包在一起的开源库**，并且只需双目 + IMU、纯 CPU 实时运行（Table I 中其他度量-语义方案多为 RGB-D 且需 GPU）。
2. **Kimera-VIO**：基于 GTSAM 的固定滞后平滑 VIO，预积分 + 无结构视觉因子，在 EuRoC 上与当时最好的开源 VIO 相当或更好。
3. **Kimera-RPGO**：把多机 PCM 改造成单机在线版本（加入里程计一致性检验 + 增量邻接矩阵），让闭环对 DBoW2 阈值几乎不敏感，省去调参。
4. **两档网格**：毫秒级的单帧 / 多帧网格服务避障，0.1 s 级的 TSDF 全局语义网格服务规划，各取所需。
5. **模块化 + 工程配套**：各模块可单独替换或关闭，附带 Jenkins 持续集成（自动在 EuRoC 上用 evo 评测）、Jupyter 调试笔记本和 Open3D 重建评测脚本。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 位姿精度（EuRoC, Table II） | 与 OKVIS / MSCKF / ROVIO / VINS-Mono / SVO-GTSAM 等相比，Kimera-VIO（固定滞后与全平滑两种设置）和 Kimera-RPGO（带闭环）在各自类别中整体处于最好水平；注意对比方法多为单目，Kimera 使用双目，且采用更严格的 SE(3) 对齐 |
| 闭环鲁棒性（V1_01, Table III） | 不用 PCM 时，DBoW2 阈值 α 从 10 降到 0.1，ATE 从 0.05 m 恶化到 1.74 m；用 PCM 的 Kimera-RPGO 在 α = 10 ~ 0.001 范围内都稳定在约 0.05 m |
| 几何重建（EuRoC V1/V2） | 全局 TSDF 网格最精确；多帧网格误差最多高约 24%，但计算快两个数量级 |
| 语义重建（MIT Lincoln Lab 仿真器） | bundled raycasting 本身带来的损失很小（网格误差 < 8 cm、语义准确率 > 94%）；VIO 漂移 < 0.2%（32 m 轨迹约 4 cm）影响可忽略；最大损失来自稠密双目在白墙等弱纹理区域的深度错误 |
| 运行时间 | IMU 预积分约 40 µs；普通帧跟踪 4.5 ms / 关键帧 45 ms；单帧网格 < 5 ms、多帧网格 15 ms；后端 < 40 ms；RPGO 平均 55 ms；Semantics 每关键帧约 0.1 s（720×480 深度图） |

> ⚠️ 上表数值取自论文 III 节与 Table III–V，具体以 ICRA 正式版为准。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **外感定位 + 建图一体** | 人形头部双目 + 机身 IMU 正好是 Kimera 的输入配置，一套系统同时给出位姿和可用于规划的网格 |
| **网格比稀疏点更有用** | ORB-SLAM3 这类稀疏地图不能直接用于避障或落脚点判断；Kimera 的低延迟网格可直接喂给局部避障，TSDF 全局网格可以继续提取可通行区域 |
| **语义 → 任务** | 带语义的三维网格是「去厨房拿杯子」这类导航 / 移动操作任务的基础，后续 Kimera 发展出的 3D 动态场景图（Kimera DSG、Hydra）也被用于机器人高层规划 |
| **鲁棒闭环** | 室内走廊、楼层重复导致的感知混叠在人形巡检场景很常见，PCM 式外点剔除能避免一次错误闭环毁掉整张地图 |
| **局限** | 视觉前端仍会受人形行走冲击、运动模糊影响；稠密双目在弱纹理区域效果差；未利用腿部运动学 / 接触信息，人形上常与 InEKF 等本体估计器互补使用 |

---

## 🎤 面试参考

**Q：Kimera-VIO 的「无结构视觉因子」是什么意思？**
A：不把三维路标点当作优化变量，而是在每次 iSAM2 迭代中先用 DLT 三角化出点，再把点从线性化系统里解析消元，只留下对相机位姿的约束（Schur 补的思路）。这样状态维度小、求解快，同时可以在消元前顺手剔除视差不足或重投影误差大的点。

**Q：Kimera-RPGO 怎样剔除错误闭环？**
A：两步检验。先检查每个闭环与里程计是否一致：沿里程计和闭环围成的环路复合位姿，误差要通过卡方检验；再检查闭环之间两两是否一致，构建成对一致性矩阵并求最大团，只保留最大的一致闭环集合参与位姿图优化。原 PCM 每次从头建矩阵，Kimera 改成每来一个闭环增量加一行一列，能在线运行。

**Q：为什么要两种网格？**
A：延迟和精度要取舍。Mesher 用前端已经跟踪好的稀疏特征做 Delaunay，几毫秒就能出，适合控制与避障；Semantics 用稠密双目 + TSDF 融合，精度高、能带语义，但每关键帧约 0.1 s，适合规划和建图。

---

## 🔗 相关阅读

- [ORB-SLAM3 (2007.11898)](https://arxiv.org/abs/2007.11898)：同板块的视觉 / 视觉-惯性 SLAM 开源库，稀疏特征地图路线
- [On-Manifold Preintegration for Real-Time Visual-Inertial Odometry (1512.02363)](https://arxiv.org/abs/1512.02363)：Kimera-VIO 后端的理论基础
- Pairwise Consistent Measurement Set Maximization for Robust Multi-robot Map Merging（PCM，Mangelson et al., ICRA 2018）：Kimera-RPGO 外点剔除的出处
- [Kimera: from SLAM to Spatial Perception with 3D Dynamic Scene Graphs (2101.06894)](https://arxiv.org/abs/2101.06894)：Kimera 的后续，构建分层三维动态场景图
- [VINS-Mono (1708.03852)](https://arxiv.org/abs/1708.03852)：VINS-Fusion 的基础，同为上游 State Estimation 条目
