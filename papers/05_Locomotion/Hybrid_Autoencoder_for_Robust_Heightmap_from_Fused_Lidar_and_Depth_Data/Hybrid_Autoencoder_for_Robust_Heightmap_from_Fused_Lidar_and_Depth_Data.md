---
layout: paper
paper_order: 7
title: "A Hybrid Autoencoder for Robust Heightmap Generation from Fused Lidar and Depth Data for Humanoid Robot Locomotion"
zhname: "融合 LiDAR 与深度数据的鲁棒高度图混合自编码器（人形行走）"
category: "Locomotion"
---

# A Hybrid Autoencoder for Robust Heightmap Generation from Fused Lidar and Depth Data for Humanoid Robot Locomotion
**融合 LiDAR 与深度的鲁棒高度图混合自编码器**

> 📅 阅读日期: 2026-05-23
>
> 🏷️ 板块: 05 Locomotion · 多模态融合 / 地形感知 / 高度图 / 自编码器
>
> 🔁 推进轨: 模块轮转（04_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.05855](https://arxiv.org/abs/2602.05855) |
| HTML | [arXiv HTML v1](https://arxiv.org/html/2602.05855v1) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2602.05855) |
| 项目主页 | 截至当前未见公开发布 |
| **发布时间** | 2026-02-05 (arXiv), VDI Mechatronics Conference 2026 |
| 源码 | 截至当前未见公开发布 |
| 作者 | Dennis Bank, Joost Cordes, Thomas Seel, Simon F. G. Ehlers |
| 机构 | Institute of Mechatronic Systems · Leibniz University Hannover |
| 发表时间 | 2026-02 |
| 发表 venue | VDI Mechatronics Conference 2026 |
| 传感器 | Intel RealSense 深度相机 + LIVOX MID-360 LiDAR + IMU |

---

## 🎯 一句话总结

> 人形 perceptive locomotion 的"上游 = 地形感知"长期被「单传感器手工管线（深度图 / 体素栅格 / 占据图）」卡住——深度相机视场窄、近距离精但远处糊，LiDAR 反过来；本文提出**用一个 hybrid Encoder-Decoder（CNN 抽空间 + GRU 维持时序）**把**深度图 + LiDAR（球面投影） + IMU** 三路数据**直接学**到一个**以机器人为中心的统一 2.5D 高度图**上，让下游 locomotion 策略只面对一种规范化的地形表征，融合相比单模态把重建误差降了 7.2–9.9 %，3.2 s 时序窗口把地图漂移也压了下来。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| EDS | Encoder-Decoder Structure | 编码-解码结构，本文把它做成 CNN（空间）+ GRU（时序）的混合体 |
| CNN | Convolutional Neural Network | 卷积神经网络，负责从 2D 投影中抽局部几何 |
| GRU | Gated Recurrent Unit | 门控循环单元，本文用它把多帧空间特征在时间维度对齐 |
| Heightmap | 2.5D Elevation Grid | 高度图，把"地表"压成一张以机器人为中心的 (x, y) → z 网格 |
| Spherical Projection | 球面 / 距离图投影 | 把 LiDAR 点云投到（方位角、俯仰角）平面变成 2D image，方便给 CNN 吃 |
| Multimodal Fusion | 多模态融合 | 把不同传感器的几何信息拼到同一中间表征 |
| Drift | Mapping Drift | 因里程计 / 标定误差，地图随时间累积偏移 |

---

## ❓ 论文要解决什么问题？

人形 locomotion 在不平整地形上跑得越来越猛了（APEX、Now You See That、Parkour Learning…），但**上游的地形感知**仍存在三道老问题：

1. **单传感器各有死角**
   - 深度相机：近距离精、远处糊、视场窄、对透明 / 强反光材质容易整块失效；
   - LiDAR：远距离稳、稀疏、在近场 / 边缘容易出现"无回波黑洞"；
   - 只用一种 → 上下游策略要被迫学会兜底各种缺失。

2. **手工融合 / 体素栅格管线很重**
   - 现有 elevation-map 包（Fankhauser et al. 的 GridMap、OpenVDB 等）需要手工设标定、滤波、概率融合规则，对未知场景泛化差；
   - 体素 / Octomap 在机载算力上算不到 50 Hz。

3. **时序不一致 / 漂移**
   - 单帧地图抖动剧烈；纯几何 ICP / 里程计在长时间走动后累积偏移，下游策略经常踩到"昨天的地"。

**目标**：一个**学习式、端到端、规范化**的地形前端——输入异构传感器，输出**机器人坐标系下、稳定的高度图**，让下游 locomotion / footstep 规划只需面对一种统一表征。

---

## 🔧 方法详解

### 1. 多模态数据进编码器：先把所有东西投到 2D image

| 来源 | 预处理 | 进网络的张量 |
|---|---|---|
| Intel RealSense 深度图 | 内参畸变校正 + 限定深度范围 | H×W 单通道深度 image |
| LIVOX MID-360 LiDAR | **球面投影**（方位角×俯仰角→距离值） | H×W 单通道 range image，稀疏点用 mask 标 |
| IMU | 提取重力方向 / 姿态偏角 | 与中间特征做 concat / FiLM 调制 |

→ 把三路统一成"图像式"输入，CNN 才能一键抽特征。

### 2. 空间编码 + 时序编码 = Hybrid Encoder

- **空间侧（CNN）**：对每一帧的两路投影 image 做特征提取，得到稠密的几何特征图；
- **时序侧（GRU）**：把过去 ~3.2 s 内的空间特征序列串到一个循环核里，让"我上一秒看到的远处石头"被记住，缓解单帧瞬时遮挡 / 闪烁；
- **融合**：在 GRU 输出端和当前帧空间特征做对齐（concat / 残差），由 decoder 输出统一坐标系下的高度图。

### 3. 高度图 Decoder：以机器人为中心的 (x, y) → z

- **坐标系**：以机器人 base / 双足支撑多边形中心为原点，朝向用 IMU 拉正；
- **输出**：以一定分辨率（典型 1–4 cm/cell）覆盖机器人前方/周围 N×N 的高度图，每格输出 z 值（必要时附置信度通道）；
- **监督**：以 SLAM / mocap 重建的真实地形或仿真 ground-truth 高度图作 L1 / Huber 损失。

### 4. 与下游 locomotion 的接口

- 高度图当作**统一中间观测**，喂给"现有"的 RL footstep / 全身控制策略（与 ANYmal Parkour / APEX / NYST 等同类范式兼容），不需要为每一种传感器组合都重训策略。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph SENS["🛰 多模态前端"]
        DEP["📷 RealSense 深度图<br/>(近距稠密，远距糊)"]
        LDR["📡 LIVOX MID-360 LiDAR<br/>点云"]
        IMU["🧭 IMU<br/>重力向 / 姿态"]
    end

    subgraph PROJ["🗺 投影到 2D"]
        SPH["球面投影<br/>方位角 × 俯仰角 → range image"]
        DEPNORM["深度归一化 / 截断"]
        LDR --> SPH
        DEP --> DEPNORM
    end

    subgraph ENC["🧠 Hybrid Encoder（CNN + GRU）"]
        CNN["CNN 空间特征<br/>逐帧抽局部几何"]
        GRU["GRU 时序核<br/>~3.2 s 窗口去抖 / 缓存遮挡"]
        FUSE["跨模态融合<br/>(IMU 重力做姿态校正)"]
    end

    subgraph DEC["🧱 高度图 Decoder"]
        HMAP["机器人中心 2.5D 高度图<br/>(x, y) → z + 置信度"]
    end

    subgraph DOWN["🚶 下游 locomotion"]
        POL["RL / footstep planner<br/>(APEX / NYST / Parkour 等兼容)"]
        WBC["全身控制 / PD"]
        BOT["🤖 人形机器人"]
    end

    DEPNORM --> CNN
    SPH --> CNN
    IMU --> FUSE
    CNN --> FUSE
    FUSE --> GRU
    GRU --> HMAP

    HMAP --> POL --> WBC --> BOT

    style SENS fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style PROJ fill:#fef6e4,stroke:#d35400,color:#5e2c00
    style ENC fill:#e8f8e8,stroke:#27ae60,color:#1b5e20
    style DEC fill:#fde2e2,stroke:#c0392b,color:#5d1a14
    style DOWN fill:#f3e8ff,stroke:#7e57c2,color:#311b92
</div>

---

## 💡 核心贡献

1. **统一中间表征**：把异构传感器一起学到「机器人中心 2.5D 高度图」，让下游 locomotion 不再为每种组合单独定制。
2. **CNN + GRU 的 Hybrid Encoder-Decoder**：空间抽几何 / 时序压抖动 / IMU 校姿态，三件套放在一个端到端可训网络里。
3. **LiDAR 球面投影**：用 range image 表征 MID-360 这类全向 LiDAR，避免点云直接 voxel / 八叉树的算力代价。
4. **定量证明融合的必要性**：相对纯深度 +7.2 %、相对纯 LiDAR +9.9 %，3.2 s 时序窗口显著抑制漂移。

---

## 📊 关键实验结果（结构性总结）

| 维度 | 结论 |
|---|---|
| 评测指标 | 高度图重建精度（与真值/SLAM 重建 ground-truth 对比） |
| 模态消融 | **融合 vs Depth-only**：+7.2 %；**融合 vs LiDAR-only**：+9.9 % |
| 时序窗口 | ≈ 3.2 s 历史显著减少 mapping drift |
| 部署侧 | 设计目标为机载 / 在线推理，作为 perceptive locomotion 的统一前端 |
| 真机 | VDI Mechatronics 2026 现场展示 / 在 Hannover 团队人形平台上联通 locomotion 流水线 |

> ⚠️ 详细绝对精度数字、消融配置与下游 locomotion 成功率以 arXiv [2602.05855](https://arxiv.org/abs/2602.05855) 论文正文为准。

---

## 🤖 工程价值

- **"地形感知前端 + 通用中间表征"** 思路非常工程化：相比"每个项目自己写一遍 octomap / elevation-mapping"，本文给出了一条**学习化**的替代路线，特别适合多传感器配置不固定的人形平台。
- **球面投影 + CNN** 是 LiDAR 走 deep learning 的成熟范式（自动驾驶里早就用，本文把它搬进了人形 locomotion），相比直接点云 backbone 显著省算力。
- **GRU 维持时序一致性** 对人形非常对症——双足走动比四足/汽车更晃，单帧高度图抖动会直接传到下游脚步规划。
- **可与 NYST / APEX / Parkour Learning 等下游策略解耦**：上游换感知前端，下游策略不用全部重训；反之亦然。

---

## 🎤 面试参考

**Q：为什么不直接把点云塞给一个 PointNet++？**
A：点云 backbone 算力 / 内存代价高，对全向 LiDAR 来说点数也多；**球面投影 → range image → CNN** 是工业界长期验证的高效折中（KITTI 时代就在用），更容易在机载算力上跑到 locomotion 需要的 50 Hz。

**Q：为什么要把 LiDAR + 深度相机一起用？不能挑一个 SOTA 的就完事？**
A：深度相机 **远处糊 / 视场窄**，LiDAR **近场稀疏 / 边缘有黑洞**——它们的失效模式互补。本文 7.2 / 9.9 % 的相对增益本质上来自"任何一边失效时，另一边能补"。

**Q：GRU 在这里到底解决什么？**
A：解决两件事——①**瞬时遮挡/闪烁**（一帧失败下一帧别跟着失败），②**短期漂移**（IMU + 滚动窗口把姿态拉正）；与"一阶 ICP 或卡尔曼"不同的是，GRU 是学到的、跟具体场景统计分布对齐的去抖。

**Q：与 NYST（Now You See That）是什么关系？**
A：NYST 是把**原始深度像素**直接喂给 locomotion 策略，本文相反——它把"地形几何"先抽成统一的 2.5D 高度图，让下游策略只看几何。两者代表了"端到端"与"显式中间表征"两种路径，是同一现实约束的两套答案。

**Q：和 ROS 生态里的 ETH `elevation_mapping` 有什么本质差别？**
A：传统 `elevation_mapping` 是**手工概率融合 + Kalman 更新**；本文是**端到端学习** + **GRU 学到的时序融合**，不需要手工调置信度衰减常数，对未知场景 / 不同硬件组合的迁移更友好。

---

## 🔗 相关阅读

- [APEX: Learning Adaptive High-Platform Traversal (2602.11143)](https://arxiv.org/abs/2602.11143)：高度图被下游用到极致——本文正是 APEX 类策略的上游候选
- [Now You See That: Learning End-to-End Humanoid Locomotion from Raw Pixels (2602.06382)](https://arxiv.org/abs/2602.06382)：与本文相反的范式——直接吃像素，不依赖显式高度图
- [HumanoidPano: Hybrid Spherical Panoramic-LiDAR Cross-Modal Perception (2503.09010)](https://arxiv.org/abs/2503.09010)：球面投影范式在人形多模态感知上的延伸
- ETH Robotic Systems Lab · `grid_map` / `elevation_mapping_cupy`：传统手工高度图融合的事实标准基线

---

> 备注：本笔记基于 arXiv 摘要、HTML v1 与公开搜索结果整理；具体精度数字（绝对 RMSE / MAE、消融配置、下游 locomotion 接口实测）以 arXiv [2602.05855](https://arxiv.org/abs/2602.05855) 论文正文为准。截至当前未见作者团队公开训练代码，关注 [Institute of Mechatronic Systems @ Leibniz Hannover](https://www.imes.uni-hannover.de/) 后续发布。
