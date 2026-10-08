---
layout: paper
paper_order: 33
title: "Humanoid Manipulation Interface: Humanoid Whole-Body Manipulation from Robot-Free Demonstrations"
zhname: "Humanoid Manipulation Interface: 基于无机器人演示的人形机器人全身操作"
category: "Loco-Manipulation and WBC"
---

# Humanoid Manipulation Interface: Humanoid Whole-Body Manipulation from Robot-Free Demonstrations
**Humanoid Manipulation Interface：基于无机器人演示的人形全身操作**

> 📅 阅读日期: 2026-05-04
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · Robot-Free · Hierarchical Control

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.06643](https://arxiv.org/abs/2602.06643) |
| HTML | [在线阅读](https://arxiv.org/html/2602.06643) |
| PDF | [下载](https://arxiv.org/pdf/2602.06643) |
| 项目主页 | [humanoid-manipulation-interface.github.io](https://humanoid-manipulation-interface.github.io/) |
| **发布时间** | 2026-02-06 (arXiv) |
| 源码 | 暂未开源 |
| 提交日期 | 2026-02-18 (v2) |

**作者**：Ruiqian Nai, Boyuan Zheng, Junming Zhao, Haodong Zhu, Sicong Dai, Zunhao Chen, Yihang Hu, Yingdong Hu, Tong Zhang, Chuan Wen, Yang Gao

**机构**：清华大学、上海期智研究院、Spirit.AI、上海交通大学

---

## 🎯 一句话总结

HuMI 提出了一个便携、无机器人的演示系统，通过捕捉人类全身动作进行高低层分层控制学习，极大提高了人形机器人数据收集效率并在真实环境中实现了包括深蹲拾取、投掷等高难度全身任务。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| HuMI | Humanoid Manipulation Interface | 人形操作接口，本论文提出的系统 |
| UMI | Universal Manipulation Interface | 通用操作接口，HuMI夹爪硬件基础 |
| IK | Inverse Kinematics | 逆运动学 |
| EE | End-Effector | 末端执行器（通常指机器人的手或夹爪） |

---

## ❓ 论文要解决什么问题？

目前的人形机器人全身控制方法通常依赖于**遥操作**（Teleoperation）或**视觉Sim-to-Real强化学习**：
1. **遥操作**需要昂贵复杂的设备，且操作员需要花费大量精力来维持平衡和补偿控制误差，导致数据收集效率低下。
2. **强化学习**需要复杂的奖励函数设计。
因此，大多数现有方法只在受控的实验室环境中进行展示，动作往往受限于直立行走并伴随简单的手臂动作。

**目标**：设计一个**便携、高效、无机器人（Robot-Free）**的数据收集框架，并在多样化的现实环境中捕获丰富的全身动作（如深蹲、下跪、弯腰等）。

---

## 🔧 方法拆解：硬件系统与分层策略

HuMI 由**无机器人演示系统**和**分层策略学习框架**组成。

### 1. Robot-Free 演示系统
*   **便携硬件**：基于 UMI 改装的两个手持夹爪（带 GoPro 摄像头），并在双手、腰部（骨盆）、双脚共佩戴 5 个 HTC VIVE Ultimate 追踪器，记录 $SE(3)$ 轨迹。
*   **痛点**：传统的无机器人数据收集通常只记录夹爪（EE）轨迹。但对于人形机器人，仅有夹爪轨迹会导致动作欠定义（例如，不知道是弯腰还是深蹲）。
*   **Human-in-the-loop 运动学适应**：由于人类和机器人体型差异（Embodiment gap），直接缩放人类动作会破坏与物理环境的交互几何。HuMI 不缩放动作，而是提供一个**在线 IK 预览界面**。演示者可以实时看到虚拟机器人的姿态，从而主动调整自己的动作以避免碰撞或超出机器人的工作空间。

### 2. 分层控制框架
收集到的数据用于分别训练高层策略和低层控制器：
*   **高层（High-Level）策略：**
    *   **架构**：Diffusion Policy（扩散策略）。
    *   **输入**：RGB 图像和本体感觉（关节角度）。
    *   **输出**：5 Hz 输出一段（chunk）关键点（夹爪、骨盆、脚）的相对目标轨迹。
*   **低层（Low-Level）控制器：**
    *   **架构**：在仿真中训练的强化学习（RL）全身控制器，运行频率为 50 Hz。
    *   **难点**：低层控制器不可避免地会有跟踪误差（4-6cm），这会导致高层下发的动作块边界出现不连续（跳变）。
    *   **接口改进 1：相对上一时刻的“目标位姿”下发动作**。如果基于当前“实际位姿”下发新动作块，误差累积会导致动作回撤。使用“目标位姿”能保证轨迹平滑连贯。
    *   **接口改进 2：“盲点”的相对位姿跟踪**。骨盆等位置没有视觉锚定（不像夹爪有摄像头），绝对位置容易漂移。因此采用**相对当前动作块内的局部坐标系**进行跟踪。
    *   **控制器训练技巧**：
        1.  **自适应 EE 奖励**：在机器人快速移动时放宽 EE 精度要求，在缓慢交互时收紧 EE 精度要求。这避免了单纯追求末端精度而牺牲全身平衡。
        2.  **变速增强（Variable-speed augmentation）**：在 RL 训练时随机改变参考轨迹的播放速度，让策略有足够时间纠正微小误差，提升最终精度。

---

## 💡 核心贡献

1. 提出了**首个**专门针对人形机器人全身操作的无机器人（Robot-Free）演示系统。
2. 设计了一套系统的分层学习框架，通过精心设计的接口和训练技巧（IK 预览、相对轨迹、自适应奖励），成功克服了人类与机器人之间的形态学差异（Embodiment gap）。
3. 相比传统遥操作（如 TWIST2），数据收集吞吐量提高了 **3 倍**，同时支持更难的全身动作（如深蹲）。

---

## 📊 实验亮点

实验在 Unitree G1 机器人上进行，验证了 5 种高难度动作：
1. **单膝下跪求婚（Marriage proposal）**：成功率 85%。证明了系统能捕获并执行复杂的全身协调动作。
2. **拔剑（Unsheathing a sword）**：成功率 85%，平均末端误差低至 15.7 mm。展示了极高的双手协同和操作精度。
3. **动态投掷（Dynamic tossing）**：成功率 75%。证明了改进的动作接口能保持动量，实现高速连贯动作。
4. **长距离移动并清理桌面（Long-range loco-manipulation）**：成功率 75%。证明了高层策略能很好地完成从“导航”到“操作”的意图切换。
5. **深蹲捡瓶子（泛化性测试）**：在 7 个环境中收集数据后，在 4 个**未知环境**和 6 个**未知物体**上测试，取得了 **70%** 的高泛化成功率。

---

## 💬 讨论记录

*(在接下来的对话中如果有讨论可以记录在此)*
