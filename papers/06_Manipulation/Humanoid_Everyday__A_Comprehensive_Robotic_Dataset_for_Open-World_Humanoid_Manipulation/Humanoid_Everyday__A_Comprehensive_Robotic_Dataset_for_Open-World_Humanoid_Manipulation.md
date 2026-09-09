---
layout: paper
title: "Humanoid Everyday: A Comprehensive Robotic Dataset for Open-World Humanoid Manipulation"
zhname: "Humanoid Everyday：面向开放世界人形操作的综合机器人数据集"
category: "Manipulation"
arxiv: "2510.08807"
---

# Humanoid Everyday: A Comprehensive Robotic Dataset for Open-World Humanoid Manipulation
**一个大规模、多样化的人形操作数据集：用一套高效的「人监督遥操作」流水线，在 Unitree G1 / H1 上采集 10.3k 条轨迹、300 万+ 帧、260 个任务、7 大类，覆盖灵巧操作、人-人形交互、行走-操作一体化等；每帧含 RGB / 深度 / LiDAR / 触觉 / IMU 多模态与自然语言标注，并配套云端标准化评测平台，让研究者一键部署策略拿到成绩。**

> 📅 阅读日期: 2026-09-09
>
> 🏷️ 板块: 06 Manipulation · 人形操作数据集 · 多模态 · 遥操作采集 · 云端评测基准
>
> 🔁 推进轨: 模块轮转（05_Locomotion → 06_Manipulation）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 10 月 9 日（arXiv v1）/ 2026 年 7 月 4 日（v3） |
| arXiv | [2510.08807](https://arxiv.org/abs/2510.08807) · [PDF](https://arxiv.org/pdf/2510.08807) · [HTML](https://arxiv.org/html/2510.08807v3) |
| 项目页 | [humanoideveryday.github.io](https://humanoideveryday.github.io/) · 云端评测 [humanoideveryday.com](https://humanoideveryday.com/) |
| 源码 | 🌟 开源 [physical-superintelligence-lab/Humanoid-Everyday](https://github.com/physical-superintelligence-lab/Humanoid-Everyday)（数据加载器 + LeRobot 格式转换脚本） |
| 数据集 | 🤗 [USC-GVL/humanoid-everyday](https://huggingface.co/datasets/USC-GVL/humanoid-everyday) |
| 作者 | Zhenyu Zhao、Hongyi Jing、Xiawei Liu、Jiageng Mao、Abha Jha、Hanwen Yang、Rong Xue、Sergey Zakharov、Vitor Guizilini、Yue Wang（USC / Toyota Research Institute） |
| 主题 | cs.RO · 人形操作数据集 / 多模态遥操作采集 / 策略学习基准 / 云端评测 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> **Humanoid Everyday** 想补齐「人形操作数据」这一块短板：现有机器人学习数据/基准大多围绕**固定机械臂**，少数人形数据集要么**环境固定**、要么**任务单一**，普遍缺**人-人形交互**与**下肢行走**。作者用一套高效的**人监督遥操作**流水线（Apple Vision Pro 捕手/腕 → dex-retargeting 映射到灵巧手 + Pinocchio 逆运动学解臂），在 **Unitree G1 / H1** 上采集了 **10.3k 条轨迹、300 万+ 帧、260 个任务、7 大类**，每帧同步 **RGB / 深度 / LiDAR / 触觉 / IMU** 与**自然语言标注**。在此之上，他们**基准测试了 7 种代表性策略**（Diffusion Policy、3D Diffusion Policy、ACT、OpenVLA、π₀-FAST、π₀.₅、GR00T N1.5），并搭建一个**云端标准化评测平台**，让外部研究者能把自己的策略部署进受控环境拿到统一成绩。目标：为通用人形操作研究打好「数据 + 基准」的地基。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Loco-Manipulation | 行走-操作一体化：移动底盘/双腿与上肢操作协同 |
| dex-retargeting | 把人手指关键点映射到机器人灵巧手的重定向库 |
| Pinocchio IK | 用 Pinocchio 刚体动力学库解腕位姿 → 机械臂关节角 |
| ACT | Action Chunking with Transformers，动作分块模仿学习 |
| VLA | Vision-Language-Action，视觉-语言-动作大模型（如 OpenVLA、π₀、GR00T） |
| LeRobot | HuggingFace 的机器人数据/训练标准格式 |

---

## ❓ 论文要解决什么问题？

- **数据集偏「桌面机械臂」**：主流机器人操作数据大多是**静止机械臂**采集，与人形机器人的**全身、移动、双臂灵巧手**形态脱节。
- **已有人形数据集不够全**：要么**场景固定**、要么**任务种类少**，普遍**缺人-人形交互**与**行走-操作一体化**这类真正体现人形优势的任务。
- **缺标准化评测**：几乎没有面向人形数据的**统一评测平台**，不同工作各测各的，结果难以横向对比。

Humanoid Everyday 的目标：造一个**任务足够多样、模态足够丰富、且可复现评测**的开放世界人形操作数据集与基准。

---

## 🔧 方法详解

### 1. 采集平台与遥操作流水线
- **机器人**：Unitree **G1**（29-DoF，配 Dex3-1 三指手）与 **H1**（27-DoF，配 INSPIRE 手）。
- **遥操作**：**Apple Vision Pro** 捕捉操作者的**腕部与手指关键点** → 手指动作经 **dex-retargeting** 映射到灵巧手；腕部位姿经 **Pinocchio 逆运动学**解算成机械臂指令。
- **采集频率**：多模态传感流以 **30 Hz** 同步记录。

### 2. 多模态数据
每帧同步保存：
- **高维**：第一视角 **RGB(480×640)**、**深度**、**LiDAR 点云**（约 6k 点/帧）；
- **低维**：手臂/腿/手**关节角**、**IMU**、**里程计**、灵巧手**压力/触觉**、遥操作**指令动作**；
- **语言**：每条轨迹带**自然语言任务描述**。

### 3. 数据规模与 7 大任务类别
- **规模**：**10.3k 轨迹 / 300 万+ 帧 / 260 任务**，每任务约 40 条 episode。
- **7 大类**：① **Basic Manipulation**（抓放）② **Deformable**（布料等柔性体）③ **Articulated**（带关节/铰链物体）④ **Tool Use**（借助工具）⑤ **High-Precision**（高精度）⑥ **Human-Robot Interaction**（人-人形协作）⑦ **Loco-Manipulation**（行走+操作）。

### 4. 策略学习基准 + 云端评测
- **基准 7 种代表性方法**：Diffusion Policy、3D Diffusion Policy、ACT、OpenVLA、π₀-FAST、π₀.₅、**GR00T N1.5**。
- **云端评测平台**：研究者把训练好的策略上传，在**受控真实/标准环境**里部署运行并拿到**统一的成功率反馈**，实现可复现横评。

### 🧭 Humanoid Everyday 整体流程（mermaid）

<div class="mermaid">
flowchart TD
    OP["操作者<br/>Apple Vision Pro"] --> TELE
    subgraph TELE["① 人监督遥操作"]
        DEX["手指关键点<br/>→ dex-retargeting → 灵巧手"]
        IK["腕部位姿<br/>→ Pinocchio IK → 机械臂"]
    end
    TELE --> ROB["② Unitree G1 / H1<br/>执行任务"]
    ROB --> REC
    subgraph REC["③ 多模态同步记录 · 30Hz"]
        M1["RGB · 深度 · LiDAR"]
        M2["触觉 · IMU · 里程计 · 关节"]
        M3["自然语言标注"]
    end
    REC --> DS
    subgraph DS["④ Humanoid Everyday 数据集"]
        D1["10.3k 轨迹 · 300万+ 帧"]
        D2["260 任务 · 7 大类"]
    end
    DS --> BM["⑤ 策略基准<br/>DP / 3D-DP / ACT / OpenVLA / π₀ / GR00T N1.5"]
    BM --> EVAL["⑥ 云端标准化评测平台<br/>一键部署 · 统一成功率反馈"]

    style TELE fill:#e8f4fd,stroke:#2980b9,color:#1a4c66
    style REC fill:#fff5e6,stroke:#e67e22,color:#6b3b0a
    style DS fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style EVAL fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 📊 关键结果（据论文）

- **GR00T N1.5 综合最强**：在全部任务上取得约 **51% 平均成功率**，为所测方法中最好。
- **难类别普遍吃力**：所有方法在**高维动作空间**及 **Loco-Manipulation / 高精度**这类挑战性类别上表现明显下降，说明「全身+移动+灵巧手」远未被现有策略学好。
- **多模态 + 语言 + 云评测**是本数据集相对已有人形数据集的主要增量。

> ℹ️ 逐项数值以 arXiv 原文/PDF 为准。

---

## 🧩 源码运行时序图（数据加载器）

> 基于开源仓库 [physical-superintelligence-lab/Humanoid-Everyday](https://github.com/physical-superintelligence-lab/Humanoid-Everyday) 的 `humanoid_everyday` 数据加载器与 `scripts/he2lerobot.py` 转换脚本梳理典型用法流程。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant U as 用户脚本
    participant DL as Dataloader
    participant ZIP as 任务 zip 包
    participant HF as HuggingFace / Google Sheet
    participant CV as he2lerobot.py

    U->>HF: 按任务下载 task_name.zip（~500GB 全量可选）
    U->>DL: pip install -e . 后 Dataloader("task_name.zip")
    DL->>ZIP: 解析 episode / timestep 索引
    ZIP-->>DL: 返回嵌套字典（states/actions/obs）
    U->>DL: ds[episode][timestep]
    DL-->>U: RGB / depth / LiDAR / 关节 / 触觉 / 语言
    U->>DL: ds.display_image(episode, timestep) 可视化抽查
    opt 转 LeRobot 训练格式
        U->>CV: python scripts/he2lerobot.py
        CV->>ZIP: 读取原始 he 数据
        CV-->>U: 输出 LeRobot 格式数据集（供 DP/ACT/VLA 训练）
    end
</div>

---

## 💡 核心贡献

1. **大规模多样人形操作数据集**：10.3k 轨迹 / 300 万+ 帧 / 260 任务 / 7 大类，含**人-人形交互**与**行走-操作一体化**这些以往稀缺的类别。
2. **高效人监督遥操作流水线**：Vision Pro + dex-retargeting + Pinocchio IK，快速在 G1 / H1 上量产多模态数据。
3. **多模态 + 语言标注**：RGB / 深度 / LiDAR / 触觉 / IMU 同步 + 自然语言，覆盖面比现有人形数据集更广。
4. **策略基准 + 云端标准化评测平台**：横评 7 种代表性策略，并开放可复现的云端部署评测。

---

## 🤖 对人形机器人学习的启发

- **数据侧的「补全」**：把机器人学习数据从「桌面机械臂」拉到「移动 + 双臂 + 灵巧手」的人形形态，是通向通用人形操作的必要地基。
- **触觉 / LiDAR 值得纳入**：多模态（尤其触觉与 LiDAR）为接触密集、开放场景任务提供了额外监督信号。
- **评测标准化**：云端统一评测缓解了人形研究「各测各」的复现难题，利于方法横向对比。
- 与仓库中 [RoboTacDex](../RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation/RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation.md)、[A Humanoid Visual-Tactile-Action Dataset](../A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation/A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation.md) 同属「多模态人形操作数据集」路线，但本文任务面更广（含人-人形交互与 loco-manipulation）并自带云端评测。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2510.08807](https://arxiv.org/abs/2510.08807) | 论文正文（采集流水线、数据组成、7 大类、策略基准与评测） |
| [physical-superintelligence-lab/Humanoid-Everyday](https://github.com/physical-superintelligence-lab/Humanoid-Everyday) | 数据加载器 + LeRobot 格式转换脚本（`he2lerobot.py`） |
| [🤗 USC-GVL/humanoid-everyday](https://huggingface.co/datasets/USC-GVL/humanoid-everyday) | LeRobot 格式数据集 |
| [humanoideveryday.github.io](https://humanoideveryday.github.io/) · [评测站](https://humanoideveryday.com/) | 项目页 + 云端标准化评测平台 |

> ℹ️ 备注：本笔记依据 arXiv 摘要/论文与项目页整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块 · 多模态操作数据集**：[RoboTacDex](../RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation/RoboTacDex__A_Dexterous_Visual-Tactile-Action_Dataset_for_Humanoid_Manipulation.md) · [A Humanoid Visual-Tactile-Action Dataset](../A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation/A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation.md)
- **同模块 · 人类视频/数据规模化**：[RoboEdit](../RoboEdit__Turning_Human_Manipulation_Videos_into_Scalable_Robot_Experience/RoboEdit__Turning_Human_Manipulation_Videos_into_Scalable_Robot_Experience.md) · [EgoDex](../EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video/EgoDex__Learning_Dexterous_Manipulation_from_Large-Scale_Egocentric_Video.md)
- **同模块 · 仿真/评测平台**：[Genie Sim 3.0](../Genie_Sim_3.0__A_High-Fidelity_Comprehensive_Simulation_Platform_for_Humanoid_Robot/Genie_Sim_3.0__A_High-Fidelity_Comprehensive_Simulation_Platform_for_Humanoid_Robot.md)
