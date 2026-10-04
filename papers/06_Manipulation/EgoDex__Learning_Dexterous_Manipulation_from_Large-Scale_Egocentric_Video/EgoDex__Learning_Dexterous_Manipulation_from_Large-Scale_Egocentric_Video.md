---
layout: paper
title: "EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video"
zhname: "EgoDex：从大规模第一视角视频学习灵巧操作"
category: "Manipulation"
arxiv: "2505.11709"
---

# EgoDex: Learning Dexterous Manipulation from Large-Scale Egocentric Video
**用 Apple Vision Pro 采集迄今最大、最多样的人类灵巧操作数据集：829 小时第一视角视频，录制时即配 3D 手与手指跟踪（多标定相机 + 机载 SLAM 精确跟踪每个关节），覆盖 194 个桌面任务（从系鞋带到叠衣服）；并训练评测手部轨迹预测的模仿学习策略、建立度量与基准，数据集公开**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 第一视角数据集 · 灵巧操作 · Apple Vision Pro · 手姿跟踪 · 开源
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月 |
| arXiv | [2505.11709](https://arxiv.org/abs/2505.11709) · [PDF](https://arxiv.org/pdf/2505.11709) · [HTML](https://arxiv.org/html/2505.11709v1) |
| 代码 | [github.com/apple/ml-egodex](https://github.com/apple/ml-egodex) |
| 作者 | Ryan Hoque、Peide Huang、David J. Yoon、Mouli Sivapurapu、Jian Zhang（Apple） |
| 主题 | cs.RO · 第一视角数据集 / 灵巧操作 / 模仿学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 操作模仿学习有**数据稀缺**问题：不像语言/2D 视觉有互联网规模语料，灵巧操作没有。**第一视角人类视频**是被动可扩展的诱人来源，但现有大数据集（如 Ego4D）**无原生手姿标注**、也**不聚焦物体操作**。为此，作者用 **Apple Vision Pro** 采集 **EgoDex** ——**迄今最大、最多样**的人类灵巧操作数据集：**829 小时**第一视角视频，**录制时即配 3D 手与手指跟踪**（多台**标定相机 + 机载 SLAM** 精确跟踪**每只手每个关节**的位姿）。数据覆盖**194 个桌面任务**（从**系鞋带**到**叠衣服**）的多样操作行为。作者还在该数据上**训练并系统评测**用于**手部轨迹预测**的模仿学习策略，引入**度量与基准**。数据集**公开下载**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| EgoDex | 本文数据集 |
| Egocentric | 第一视角 |
| 3D Hand/Finger Tracking | 3D 手与手指跟踪 |
| SLAM | 同步定位与建图（机载） |
| Hand Trajectory Prediction | 手部轨迹预测任务 |
| Apple Vision Pro | 采集硬件 |

---

## ❓ 论文要解决什么问题？

灵巧操作缺**互联网规模数据**：
- Ego4D 等大数据集**无手姿标注、不聚焦操作**；
- 缺**带精确 3D 手姿**的大规模灵巧操作数据。

EgoDex 要：用 Vision Pro 采集**带 3D 手姿**的**大规模多样**灵巧操作数据集。

---

## 🔧 方法详解

### 1. Apple Vision Pro 采集 + 精确手姿
用 **Vision Pro**，**录制时即配 3D 手/手指跟踪**：多台**标定相机 + 机载 SLAM** 精确跟踪**每个关节**位姿——避免事后估计的误差。

### 2. 规模与多样性
**829 小时**视频、**194 个桌面任务**（系鞋带、叠衣服等），覆盖丰富日常操作行为。

### 3. 基准：手部轨迹预测
在数据上**训练并系统评测**模仿学习策略做**手部轨迹预测**，引入**度量与基准**。

### 4. 开源
数据集**公开**（apple/ml-egodex）。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    VP["🥽 Apple Vision Pro<br/>多标定相机 + 机载 SLAM"] --> DATA
    subgraph DATA["EgoDex 数据集"]
        D["829h 视频 + 3D 手/指跟踪<br/>194 桌面任务"]
    end
    DATA --> BENCH["手部轨迹预测 IL 策略<br/>度量 + 基准"]
    BENCH --> OUT["📊 最大灵巧操作数据集 · 公开"]

    style DATA fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **迄今最大灵巧操作数据集**：829h、194 任务、3D 手姿；
2. **录制即配精确手姿**：标定相机 + SLAM，免事后估计误差；
3. **手部轨迹预测基准**：度量 + IL 策略评测；
4. **开源**：推动机器人/视觉/基础模型。

---

## 🤖 对人形机器人学习的启发

- **精确 3D 手姿是灵巧操作数据的金标准**，Vision Pro 让其规模化可行；
- **数据集 + 基准**是子领域进步的基础设施；
- 第一视角灵巧数据是人形操作的关键先验，与 Being-H0、H-RDT 等下游方法配套；
- Apple 等大厂入场，提示该方向的工业关注。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.11709](https://arxiv.org/abs/2505.11709) | 论文正文（采集、数据集、轨迹预测基准） |
| [github.com/apple/ml-egodex](https://github.com/apple/ml-egodex) | 公开数据集 |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（829h/194 任务）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·第一视角灵巧数据**：[Being-H0](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html) · [H-RDT](../H-RDT__Human_Manipulation_Enhanced_Bimanual_Robotic_Manipulation/H-RDT__Human_Manipulation_Enhanced_Bimanual_Robotic_Manipulation.html) · [Dexterity from Smart Lenses](../Dexterity_from_Smart_Lenses__Multi-Fingered_Manipulation_with_In-the-Wild_Human_Demos/Dexterity_from_Smart_Lenses__Multi-Fingered_Manipulation_with_In-the-Wild_Human_Demos.html)。
