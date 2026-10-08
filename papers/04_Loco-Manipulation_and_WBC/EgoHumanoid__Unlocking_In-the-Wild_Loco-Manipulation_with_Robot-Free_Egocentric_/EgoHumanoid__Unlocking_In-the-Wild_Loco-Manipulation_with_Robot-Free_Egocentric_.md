---
layout: paper
paper_order: 38
title: "EgoHumanoid: Unlocking In-the-Wild Loco-Manipulation with Robot-Free Egocentric Demonstration"
zhname: "EgoHumanoid：利用免机器人第一视角示范解锁野外环境全身操作"
category: "Loco-Manipulation and WBC"
---

# EgoHumanoid: Unlocking In-the-Wild Loco-Manipulation with Robot-Free Egocentric Demonstration
**EgoHumanoid：利用免机器人第一视角示范解锁野外环境全身操作**

> 📅 阅读日期: 2026-04-29
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 跨体态迁移 · 视觉-语言-动作模型

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.10106](https://arxiv.org/abs/2602.10106) |
| HTML | [在线阅读](https://arxiv.org/html/2602.10106) |
| PDF | [下载](https://arxiv.org/pdf/2602.10106) |
| 项目主页 | [opendrivelab.com/EgoHumanoid](https://opendrivelab.com/EgoHumanoid/) |
| **发布时间** | 2026-02-10 (arXiv) |
| 源码 | [OpenDriveLab/EgoHumanoid](https://github.com/OpenDriveLab/EgoHumanoid)（Apache 2.0） |
| 提交日期 | 2026-02-10 |

**作者**：Modi Shi, Shijia Peng, Jin Chen, Haoran Jiang, Yinghui Li, Di Huang, Ping Luo, Hongyang Li, Li Chen（OpenDriveLab / 上海 AI 实验室）

---

## 🎯 一句话总结

EgoHumanoid 是第一个将大量 **免机器人** 第一视角人类演示数据与少量机器人数据联合训练 VLA 策略的框架，通过视角对齐和动作对齐的双阶段管线弥合人机形态差异，使 Unitree G1 在四类室内外全身操作任务中平均提升 **20%**，在未见场景中提升高达 **51%**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| VLA | Vision-Language-Action model | 视觉-语言-动作模型，以图像+语言为输入输出动作 |
| WBC | Whole-Body Control | 全身控制，协调躯干、腿、臂的整体运动 |
| Loco-Manipulation | Locomotion + Manipulation | 行走中同时操作物体 |
| View Alignment | - | 将人类视角图像重投影到机器人视角，减少视觉域差距 |
| Action Alignment | - | 将人类全身动作重定向到机器人可行关节空间 |
| Embodiment Gap | - | 人类与机器人在形态、视点、动力学上的差异 |
| PICO VR | - | 搭载 VR 头显 + 5 点体追踪器的便携数据采集套件 |

---

## ❓ 论文要解决什么问题？

人形机器人的全身操作需要大量高质量演示数据，但直接用机器人收集数据成本极高：硬件昂贵、部署繁琐、场景覆盖有限。与此同时，人类的第一视角（egocentric）视频数据极其丰富，却因为 **体态差异（morphology gap）** 和 **视角差异（viewpoint gap）** 无法直接用于机器人训练。

具体挑战包括：

1. **视角差异**：机器人头部摄像头与人类佩戴头显的高度、视场角和视点均不同。
2. **形态差异**：人类手臂/腿的运动学与 G1 机器人不完全一致，直接重映射会产生不可行轨迹。
3. **数据规模不对等**：机器人数据极少，人类数据丰富但需要对齐才能使用。

---

## 🔧 方法拆解

### 1) 便携数据采集套件

无需机器人即可在任意真实场景收集：
- **PICO VR 头显** + **5 个 PICO 体态追踪器** → 全身关节运动姿态
- **头戴 ZED X Mini 相机** → 第一视角 RGB 图像

可以在房间、厨房、室外等各类环境中自由演示任务，成本远低于机器人演示。

### 2) 视角对齐（View Alignment）

利用深度重投影（depth-based reprojection）和图像修复（inpainting），将人类第一视角图像转换为接近机器人摄像头视角的图像。具体包括：
- 按照机器人头部摄像头的高度和视场角对图像进行重采样。
- 对遮挡区域做 inpainting 填充，消除因高度差异暴露的地面/天花板等额外区域。

### 3) 动作对齐（Action Alignment）

将人类追踪到的全身姿态重定向至机器人统一动作空间：
- 以逆运动学（IK）+ 优化为基础，生成运动学可行的关节轨迹。
- 统一动作表示，确保人类演示和机器人演示使用相同的动作接口送入 VLA。

### 4) VLA 联合训练

以 **π₀.₅ 架构** 为基础，将对齐后的人类演示数据与少量机器人演示数据混合后联合训练 VLA 策略，直接端到端输出机器人全身关节指令。

---

## 🧪 实验与结果要点

- **机器人平台**：Unitree G1 + dex3-1 灵巧手
- **任务**：4 类室内外全身操作任务（如端盘、开门、搬箱等）
- **基线对比**：仅机器人数据训练 vs. EgoHumanoid 联合训练
- **平均提升**：+20%（所有任务）
- **未见场景泛化**：+51%（机器人数据未覆盖的新环境）
- **关键结论**：免机器人的人类第一视角数据可显著提升策略的泛化能力，对未见环境尤为重要。

---

## 💡 阅读备注

1. 本文的核心贡献不在于 VLA 架构本身（复用 π₀.₅），而在于 **对齐管线**（视角 + 动作）+ **可扩展采集系统**，这两者使得"廉价的人类数据"真正能迁移到机器人身上。
2. 与 ZeroWBC（也使用人类第一视角视频）对比：ZeroWBC 重点在于直接从视频学控制信号（无需体态追踪），EgoHumanoid 则通过体态追踪获得更精确的动作对齐，两者路线互补。
3. +51% 的未见场景泛化增益意味着人类演示提供了比机器人演示更广泛的视觉/场景覆盖，这对工程实践很有启发——在难以部署机器人的复杂场景中先收集人类演示作为预训练数据。
4. 源码已开源，重点关注 `view_alignment` 和 `action_alignment` 两个模块的实现细节。

---

## 🔗 参考

```bibtex
@article{shi2026egohumanoid,
  title         = {EgoHumanoid: Unlocking In-the-Wild Loco-Manipulation with Robot-Free Egocentric Demonstration},
  author        = {Shi, Modi and Peng, Shijia and Chen, Jin and Jiang, Haoran and Li, Yinghui and Huang, Di and Luo, Ping and Li, Hongyang and Chen, Li},
  year          = {2026},
  eprint        = {2602.10106},
  archivePrefix = {arXiv},
  primaryClass  = {cs.RO},
  url           = {https://arxiv.org/abs/2602.10106}
}
```
