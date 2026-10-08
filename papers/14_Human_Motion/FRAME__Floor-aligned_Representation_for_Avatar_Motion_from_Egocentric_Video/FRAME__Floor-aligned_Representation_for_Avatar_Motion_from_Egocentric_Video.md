---
layout: paper
title: "FRAME: Floor-aligned Representation for Avatar Motion from Egocentric Video"
zhname: "FRAME：面向第一视角视频化身动作的地面对齐表示"
category: "Human Motion"
arxiv: "2503.23094"
---

# FRAME: Floor-aligned Representation for Avatar Motion from Egocentric Video
**FRAME：面向第一视角视频化身动作的地面对齐表示**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 第一视角动捕 · 地面对齐 · 设备位姿融合 · VR/AR · 300 FPS
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 3 月 |
| arXiv | [2503.23094](https://arxiv.org/abs/2503.23094) · [PDF](https://arxiv.org/pdf/2503.23094) · [HTML](https://arxiv.org/html/2503.23094v1) |
| 作者 | Andrea Boscolo Camiletto、Jian Wang、Rishabh Dabral、Thabo Beeler、Marc Habermann、Christian Theobalt（MPI / Google） |
| 主题 | cs.CV · 第一视角动捕 / 化身动作 / VR/AR |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 用**头戴、朝身立体相机**做**第一视角动捕**对 **VR/AR** 至关重要，但面临**严重遮挡**与**真实标注数据稀缺**。作者开发了一套**轻量 VR 数据采集装置**，带**实时 6D 位姿跟踪**，为朝身相机建立大规模数据集；并提出 **FRAME**，**几何一致地融合设备位姿与相机画面**做**身体姿态预测**，在现代硬件上以 **300 FPS** 运行。FRAME 达 **SOTA**，**消除以往方法的常见伪影**，尤其在真实场景下**下肢预测**表现更优。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| FRAME | Floor-aligned Representation（本文方法） |
| Egocentric | 第一视角（头戴相机） |
| 6D Pose | 设备 6 自由度位姿 |
| Body-facing Stereo | 朝身立体相机 |
| Floor-aligned | 地面对齐表示 |
| FPS | 帧率（300 FPS） |

---

## ❓ 论文要解决什么问题？

头戴朝身相机第一视角动捕难：
- **严重遮挡**（自遮挡）；
- **真实标注数据稀缺**；
- 要**实时**且融合**设备位姿**做准确身体姿态。

FRAME 要：地面对齐 + 设备位姿与相机融合，实时高精度地预测全身姿态。

---

## 🔧 方法详解

### 1. 轻量 VR 采集 + 实时 6D 跟踪
搭建**轻量 VR 数据采集装置**，带**实时 6D 位姿跟踪**，建立大规模朝身相机数据集，缓解标注稀缺。

### 2. 几何一致融合设备位姿 + 相机
**FRAME** 把**设备位姿**与**相机画面**做**几何一致**融合（地面对齐表示），预测身体姿态。

### 3. 实时 + 新训练策略
**300 FPS** 运行；用新训练策略改善泛化、消除伪影。

### 4. 结果
**SOTA** 身体姿态预测，尤其**下肢**更准。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DEV["📟 设备 6D 位姿"] --> FUSE
    CAM["📷 朝身立体相机画面"] --> FUSE
    subgraph FUSE["FRAME 地面对齐融合"]
        G["几何一致融合"]
    end
    FUSE --> OUT["🕺 身体姿态预测<br/>300 FPS · SOTA · 下肢更准"]

    style FUSE fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **轻量 VR 采集 + 6D 跟踪数据集**：缓解第一视角标注稀缺；
2. **FRAME 地面对齐融合**：几何一致融合设备位姿 + 相机；
3. **300 FPS 实时 SOTA**：消除伪影、下肢更准；
4. **面向 VR/AR**：实用的第一视角动捕。

---

## 🤖 对人形机器人学习的启发

- **设备位姿 + 视觉融合**对第一视角姿态估计很关键，呼应人形 egocentric 控制（ZeroWBC 等）需要的状态估计；
- **地面对齐表示**对全身姿态/重心一致性有益；
- **实时高帧率**是机器人闭环所需；
- 第一视角全身姿态是"从人类视频学全身控制"的上游感知。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.23094](https://arxiv.org/abs/2503.23094) | 论文正文（采集装置、FRAME 融合、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（300 FPS）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·第一视角姿态/动捕**：[EgoPoser](../EgoPoser__Robust_Real-Time_Egocentric_Pose_Estimation_from_Sparse_Sensors/EgoPoser__Robust_Real-Time_Egocentric_Pose_Estimation_from_Sparse_Sensors.html) · [AvatarPoser](../AvatarPoser__Articulated_Full-Body_Pose_Tracking_from_Sparse_Motion_Sensing/AvatarPoser__Articulated_Full-Body_Pose_Tracking_from_Sparse_Motion_Sensing.html)。
