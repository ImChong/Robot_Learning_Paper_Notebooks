---
layout: paper
paper_order: 35
title: "MeshMimic: Geometry-Aware Humanoid Motion Learning through 3D Scene Reconstruction"
zhname: "MeshMimic：通过三维场景重建实现几何感知的人形机器人运动学习"
category: "Loco-Manipulation and WBC"
---

# MeshMimic: Geometry-Aware Humanoid Motion Learning through 3D Scene Reconstruction
**MeshMimic：通过三维场景重建实现几何感知的人形机器人运动学习**

> 📅 阅读日期: 2026-04-29
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 几何感知模仿学习

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.15733](https://arxiv.org/abs/2602.15733) |
| HTML | [在线阅读](https://arxiv.org/html/2602.15733) |
| PDF | [下载](https://arxiv.org/pdf/2602.15733) |
| 项目主页 | [meshmimic.github.io](https://meshmimic.github.io/) |
| **发布时间** | 2026-02-17 (arXiv) |
| 代码 | 暂未公开（项目主页标注 Code Coming Soon，截至 2026-04-29） |
| 数据/模型 | 暂未公开（项目主页标注 Data and Model Coming Soon，截至 2026-04-29） |
| 机构 | X-Humanoid, HKUST(GZ), HKU, Tsinghua, CUHK, SJTU, ANU |
| 提交日期 | 2026-02-17 |

**作者**：Qiang Zhang\*, Jiahao Ma\*, Peiran Liu\*, Shuai Shi\*, Zeran Su, Zifan Wang, Jingkai Sun, Wei Cui, Jialin Yu, Gang Han, Wen Zhao, Pihai Sun, Kangning Yin, Jiaxu Wang, Jiahang Cao, Lingfeng Zhang, Hao Cheng, Xiaoshuai Hao, Yiding Ji, Junwei Liang, Jian Tang, Renjing Xu, Yijie Guo

---

## 🎯 一句话总结

MeshMimic 把普通单目 RGB 视频变成可训练人形机器人的“运动-地形”耦合数据：先用 3D 视觉重建人体 SMPL-X、场景几何和接触，再通过运动优化与接触不变重定向，将人类在复杂地形上的动作迁移到人形机器人策略中，缓解传统 MoCap 缺少环境几何导致的脚滑、穿模和接触不一致问题。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| MoCap | Motion Capture | 动作捕捉，常见于实验室光学采集系统 |
| SMPL-X | Skinned Multi-Person Linear Model eXpressive | 带身体、手和面部的人体参数化模型 |
| RL | Reinforcement Learning | 强化学习，用奖励训练控制策略 |
| Contact-Invariant Retargeting | - | 保持人与地形接触关系的动作重定向 |
| Real-Sim-Real | - | 真实视频采集、仿真重建训练、真实机器人部署的闭环 |

---

## ❓ 论文要解决什么问题？

现有 humanoid motion learning 往往依赖 MoCap。MoCap 的动作质量高，但采集成本高，而且通常只记录人体骨架，不记录“人踩在哪个台阶上、手撑住哪个表面、身体是否绕过障碍”等环境几何。结果是策略学到的动作与场景割裂：在平地看起来合理，一到斜坡、台阶、石块、栏杆等接触丰富的地形，就容易出现脚底滑动、身体穿过网格、接触点不稳定。

MeshMimic 的核心问题是：能不能只用廉价的单目消费级相机，从野外视频中恢复出足够可靠的运动、地形和接触，让人形机器人直接学习这些“动作和环境绑定”的技能？

---

## 🔧 方法拆解

### 1) 单目视频到 3D 人-场景重建

输入是普通 RGB 视频，不需要 MoCap 或专门 RGB-D 设备。系统从视频中估计人体 SMPL-X 轨迹，同时重建地形、障碍物和可接触表面的三维几何，得到一个包含人、场景、相机轨迹和接触候选的统一表示。

这一步的价值不只是“看见人怎么动”，而是恢复动作发生的空间上下文：脚踩在石头边缘、手扶在台阶上、身体跨过障碍物，这些信息决定了后续控制策略能否学到真实接触。

### 2) 基于运动学一致性的轨迹优化

单目重建不可避免会有噪声、尺度漂移和遮挡错误。论文引入运动学一致性优化，把人体姿态、场景几何和接触关系一起校正，目标是减少脚滑、穿模和不合理的身体-地形关系。

可以把这一步理解为“把视觉重建结果修成能被物理控制器学习的数据”，而不是直接相信每一帧视觉估计。

### 3) 接触不变动作重定向

人体和机器人形态不同，简单把关节角复制到机器人上会破坏原始接触关系。MeshMimic 强调 contact-invariant retargeting：重定向时保留关键的人-环境交互特征，例如脚掌相对坡面的位置、手与支撑面的关系、身体相对障碍物的通过方式。

这比传统只追踪人体骨架更适合地形技能，因为机器人真正需要复现的是“如何借助环境完成动作”，不是人体每个关节的精确姿态。

### 4) 用耦合数据训练地形感知策略

经过重建、优化和重定向后，系统得到可用于仿真的 humanoid reference motion 与对应 terrain mesh。策略训练时不再只面对孤立动作，而是同时面对动作参考、地形几何和接触约束，从而学习跨越、攀爬、下落、支撑等复杂 terrain-aware 行为。

---

## 🧪 实验与结果要点

- 项目页展示了 **Real-Sim-Real** 流程：左侧为普通单目 RGB 视频，中间为带 SMPL-X 的重建场景，右侧为机器人部署结果。
- 展示场景覆盖长时程、接触丰富、复杂地形的人类动作，包括台阶、障碍、坡面和不规则环境。
- 项目页提供与 VideoMimic 的交互式比较，重点对比高动态、严重遮挡和复杂人-场景交互下的重建质量。
- 论文主张该流程能用低成本单目视频训练复杂物理交互技能，为大规模收集 humanoid 地形技能数据提供路径。

---

## 💡 阅读备注

1. 这篇工作的关键不是单个控制算法，而是数据管线：从单目视频恢复“动作 + 场景 + 接触”，再把它变成可训练策略的数据。
2. 对后续复现而言，最难的环节可能是接触质量控制。视觉重建误差会直接传导到奖励、参考轨迹和地形碰撞。
3. 如果后续代码和数据公开，优先检查三个模块：单目重建依赖的 3D vision backbone、运动学一致性优化目标、contact-invariant retargeting 的约束设计。
4. MeshMimic 与 PHP、LessMimic 的关系值得放在一起看：PHP 侧重动态技能链与 motion matching，LessMimic 侧重距离场交互表征，MeshMimic 则侧重从真实视频中恢复几何上下文并扩展训练数据来源。

---

## 🔗 参考

```bibtex
@misc{zhang2026meshmimic,
  title         = {MeshMimic: Geometry-Aware Humanoid Motion Learning through 3D Scene Reconstruction},
  author        = {Zhang, Qiang and Ma, Jiahao and Liu, Peiran and Shi, Shuai and Su, Zeran and Wang, Zifan and Sun, Jingkai and Cui, Wei and Yu, Jialin and Han, Gang and Zhao, Wen and Sun, Pihai and Yin, Kangning and Wang, Jiaxu and Cao, Jiahang and Zhang, Lingfeng and Cheng, Hao and Hao, Xiaoshuai and Ji, Yiding and Liang, Junwei and Tang, Jian and Xu, Renjing and Guo, Yijie},
  year          = {2026},
  eprint        = {2602.15733},
  archivePrefix = {arXiv},
  primaryClass  = {cs.RO},
  url           = {https://arxiv.org/abs/2602.15733}
}
```
