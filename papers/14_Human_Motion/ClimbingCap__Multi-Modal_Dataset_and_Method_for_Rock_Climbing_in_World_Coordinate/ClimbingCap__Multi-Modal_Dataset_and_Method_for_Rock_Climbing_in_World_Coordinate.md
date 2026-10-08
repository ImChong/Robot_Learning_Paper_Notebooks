---
layout: paper
title: "ClimbingCap: Multi-Modal Dataset and Method for Rock Climbing in World Coordinate"
zhname: "ClimbingCap：世界坐标系下攀岩的多模态数据集与方法"
category: "Human Motion"
arxiv: "2503.21268"
---

# ClimbingCap: Multi-Modal Dataset and Method for Rock Climbing in World Coordinate
**ClimbingCap：世界坐标系下攀岩的多模态数据集与方法**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 14 Human Motion · 攀岩动捕 · 多模态(RGB+LiDAR+IMU) · 世界坐标 · 离地动作 · CVPR 2025
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 3 月 |
| arXiv | [2503.21268](https://arxiv.org/abs/2503.21268) · [PDF](https://arxiv.org/pdf/2503.21268) · [HTML](https://arxiv.org/html/2503.21268v1) |
| 会议 | CVPR 2025 |
| 作者 | Ming Yan、Xincheng Lin、Yudi Dai、Yuexin Ma、Lan Xu、Chenglu Wen、Siqi Shen、Cheng Wang（厦大 / 上科大等） |
| 主题 | cs.CV · 攀岩动捕 / 多模态 / 世界坐标重建 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Human Motion 模块。

---

## 🎯 一句话总结

> 人体动作恢复（HMR）研究多聚焦**地面动作**（如跑步），对**离地（off-ground）**的**攀岩动作**研究**稀少**，部分因**攀岩动作数据集**（尤其大规模、有挑战性的 3D 标注）**匮乏**。作者采集 **AscendMotion** ——一个**大规模、标注良好、有挑战性**的攀岩动作数据集：**41.2 万帧 RGB、LiDAR 帧与 IMU 测量**，含 **22 位熟练攀岩教练**在 **12 面不同岩壁**上的攀岩动作。攀岩动作捕捉难在需**精确恢复复杂姿态 + 全局位置**；现有全局 HMR 方法难以胜任。为此提出 **ClimbingCap**，在**全局坐标系**下**连续重建 3D 攀岩动作**：关键是用 **RGB 与 LiDAR** 分别在**相机坐标**与**全局坐标**重建动作，并**联合优化**。CVPR 2025 收录。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| HMR | Human Motion Recovery，人体动作恢复 |
| AscendMotion | 本文攀岩多模态数据集 |
| RGB / LiDAR / IMU | 彩色 / 激光雷达 / 惯性 |
| Off-ground | 离地动作（攀岩） |
| World Coordinate | 世界（全局）坐标系 |
| Global Position | 全局位置 |

---

## ❓ 论文要解决什么问题？

攀岩这类**离地动作**的动捕被忽视：
- 缺**大规模 3D 标注**攀岩数据；
- 需同时恢复**复杂姿态 + 全局位置**；
- 现有全局 HMR 方法难胜任。

ClimbingCap 要：建数据集（AscendMotion）+ 方法，在世界坐标下连续重建攀岩动作。

---

## 🔧 方法详解

### 1. AscendMotion 多模态数据集
**41.2 万帧 RGB + LiDAR + IMU**，22 位教练、12 面岩壁，大规模有挑战性。

### 2. ClimbingCap：RGB + LiDAR 分坐标重建 + 联合优化
- **RGB** 在**相机坐标**重建动作；
- **LiDAR** 在**全局坐标**重建；
- **联合优化**得到世界坐标下连续 3D 攀岩动作（含全局位置）。

### 3. 结果
在世界坐标系下有效捕捉复杂攀岩动作；CVPR 2025。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DATA["AscendMotion<br/>41.2万帧 RGB+LiDAR+IMU"] --> CC
    subgraph CC["ClimbingCap"]
        RGB["RGB → 相机坐标动作"]
        LID["LiDAR → 全局坐标动作"]
        RGB --> JO["联合优化"]
        LID --> JO
    end
    CC --> OUT["🧗 世界坐标连续 3D 攀岩动作<br/>(姿态 + 全局位置) · CVPR 2025"]

    style CC fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **AscendMotion 攀岩数据集**：41.2 万帧多模态，22 教练/12 岩壁；
2. **ClimbingCap 方法**：RGB（相机）+ LiDAR（全局）分坐标重建 + 联合优化；
3. **世界坐标连续重建**：姿态 + 全局位置；
4. **离地动作**：填补攀岩动捕空白（CVPR 2025）。

---

## 🤖 对人形机器人学习的启发

- **离地/强接触动作（攀岩）**是高难全身动作，对人形多接触/跑酷有数据价值；
- **RGB + LiDAR 分坐标 + 联合优化**是世界坐标全身重建的实用方案；
- **全局位置恢复**对人形 loco-manip 的世界系跟踪相关（呼应 HiWET）；
- 攀岩这类极限动作可作为人形高难技能的参考动作源。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2503.21268](https://arxiv.org/abs/2503.21268) | 论文正文（AscendMotion、ClimbingCap、实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（41.2 万帧）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人体重建/交互**：[PICO（人-物接触重建）](../PICO__Reconstructing_3D_People_In_Contact_with_Objects/PICO__Reconstructing_3D_People_In_Contact_with_Objects.html)；
- **世界系跟踪（本仓 04）**：[HiWET](../../04_Loco-Manipulation_and_WBC/HiWET__Hierarchical_World-Frame_End-Effector_Tracking_for_Long-Horizon_Humanoid_Loco-Manipulation/HiWET__Hierarchical_World-Frame_End-Effector_Tracking_for_Long-Horizon_Humanoid_Loco-Manipulation.html)。
