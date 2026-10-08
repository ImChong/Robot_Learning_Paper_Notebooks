---
layout: paper
paper_order: 37
title: "HAIC: Humanoid Agile Object Interaction Control via Dynamics-Aware World Model"
zhname: "HAIC：通过动力学感知世界模型实现人形机器人敏捷物体交互控制"
category: "Loco-Manipulation and WBC"
---

# HAIC: Humanoid Agile Object Interaction Control via Dynamics-Aware World Model
**HAIC：通过动力学感知世界模型实现人形机器人敏捷物体交互控制**

> 📅 阅读日期: 2026-04-29
>
> 🏷️ 板块: Loco-Manipulation and Whole-Body-Control · 物体交互世界模型

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.11758](https://arxiv.org/abs/2602.11758) |
| HTML | [在线阅读](https://arxiv.org/html/2602.11758) |
| PDF | [下载](https://arxiv.org/pdf/2602.11758) |
| 项目主页 | [haic-humanoid.github.io](https://haic-humanoid.github.io/) |
| **发布时间** | 2026-02-12 (arXiv) |
| 源码 | [ldt29/HAIC](https://github.com/ldt29/HAIC)（已开源，官方实现；RSS 2026） |
| 提交日期 | 2026-02-12 |

**作者**：Dongting Li, Xingyu Chen, Qianyang Wu, Bo Chen, Sikai Wu, Hanyu Wu, Guoyao Zhang 等（共 13 位作者，详见 arXiv 页）。

---

## 🎯 一句话总结

HAIC 针对“人形机器人与具有独立动力学的欠驱动物体（滑板、推车、装载箱等）交互时，如何在没有外部状态估计的前提下保持稳定控制”这个问题：仅用本体感觉历史预测物体的高阶状态（速度、加速度），把它投影到静态几何先验上形成 **动态占据图**，再用非对称微调让 world model 跟着学生策略的探索持续适配，从而支持滑板、推车、跨地形抱箱等敏捷长时程交互任务。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|---|---|---|
| HAIC | Humanoid Agile Object Interaction Control | 人形机器人敏捷物体交互控制框架 |
| World Model | - | 学习环境动力学的内部模型，用于规划/估计 |
| Proprioception | - | 本体感觉，机器人自身关节、IMU 等内部状态 |
| Dynamic Occupancy Map | - | 把物体动力学预测投影到几何空间形成的动态占据表示 |
| Asymmetric Fine-Tuning | - | 教师/学生权重不对称的微调策略，避免分布漂移 |
| OOD | Out-of-Distribution | 分布外，遇到训练未覆盖的负载或动力学条件 |

---

## ❓ 论文要解决什么问题？

人形机器人与物体交互的现有研究，大多假设物体被刚性抓取并完全受机器人驱动（fully actuated），物体只是末端的延伸。但真实任务里很多物体是 **欠驱动 + 独立动力学**：

- 滑板：受机器人脚部蹬地后自行运动，方向由非完整约束决定。
- 推车 / 拉车：内部惯性、负载质量、轮子摩擦各异，会反作用回机器人。
- 抱箱跨地形：箱子的姿态、质心和接触点会随地形改变，遮挡视觉。

这类物体带来三重挑战：
1. **耦合力反馈**：物体动力学会改变机器人自身的力矩平衡。
2. **遮挡与盲区**：交互时物体往往在机器人视野盲区，外部状态估计不可靠。
3. **分布漂移**：负载、地面摩擦、地形几何变了，控制策略很容易失败。

HAIC 的目标是 **不依赖外部状态估计，仅用机器人自身历史信号**，在多种物体动力学下保持稳定的敏捷交互。

---

## 🔧 方法拆解

### 1) 仅用本体感觉的物体动力学预测器

HAIC 训练一个动力学预测器，从机器人本体感觉历史（关节位置/速度、IMU、目标命令等）出发，估计与机器人交互的物体的 **高阶状态**：物体速度、加速度等。

直觉是：当机器人推动一辆负载未知的小车时，自身关节的反作用力和姿态偏移其实已经"暗含"了车的动力学。让网络从这些蛛丝马迹里反推，比依赖摄像头去看物体精确位置更鲁棒，也避开了视觉遮挡问题。

### 2) 动态占据图（Dynamic Occupancy Map）

光有数值的物体高阶状态还不够，策略不知道这些动力学发生在 **空间的哪里**。HAIC 把动力学预测投影到 **静态几何先验**（机器人附近的已知几何布局）上，得到一个空间锚定的动态占据表示。

策略可以从这张图中读到：
- 在哪些位置可能发生碰撞（collision boundaries）。
- 哪些区域可以借力或施力（contact affordances）。
- 视野盲区里，物体大概在哪个方位、以什么速度移动。

这样，原本的"动力学回归问题"被转换成"空间感知问题"，对 RL 策略更友好。

### 3) 非对称微调（Asymmetric Fine-Tuning）

部署后策略会进入新的状态分布，世界模型如果还固定在训练分布上，预测就会越来越偏。HAIC 让 world model **持续随学生策略的探索而微调**，但教师与学生的更新节奏不对称，避免世界模型为了拟合异常轨迹而崩溃。

效果是：在分布漂移下，状态估计仍然稳健，策略不会因为物体动力学预测变差而失控。

### 4) 端到端策略

最终，策略以本体感觉 + 动态占据图为输入，输出全身关节动作。整个系统的核心特性是 **不需要外部相机或状态机给出物体位姿/速度**，因此可以直接部署到没有专门感知设备的真实机器人上。

---

## 🧪 实验与结果要点

- **滑板（skateboarding）**：在动态欠驱动物体上完成蹬地、平衡、转向。
- **推车 / 拉车（cart pushing / pulling）**：在不同负载条件下保持稳定，主动补偿惯性扰动。
- **多物体长时程任务**：跨复合地形抱箱行走，需同时预测自身平衡、地形几何与所抱物体的动力学。

论文强调这些任务的共同点：**物体动力学独立于机器人，且交互过程长、容易跌倒**。HAIC 通过"动力学预测 + 空间投影 + 非对称适配"组合，在多种工况下取得高成功率。

---

## 💡 阅读备注

1. HAIC 提供了一个值得复用的设计模式：当外部感知不可靠时，**用本体感觉历史去回归不可见物理量**，再投影到几何空间作为策略输入，这比直接喂原始 IMU 序列更结构化。
2. 与 LATENT、SteadyTray 等"物体相关"工作放在一起看：LATENT 偏运动数据质量与重定向，SteadyTray 偏托盘平衡的残差 RL，HAIC 偏物体高阶动力学预测与世界模型适配，三者覆盖了不同层次的"物体交互"问题。
3. "动态占据图"这个抽象很关键。如果后续代码释出，重点关注两点：(a) 投影函数如何把数值预测转成空间分布；(b) 静态几何先验来自何处（机器人 URDF / 局部体素 / 上下文记忆）。
4. 非对称微调在世界模型方法中很常见，但具体的不对称形式（更新频率？loss 权重？参数子集？）通常决定稳定性，复现时需要仔细对照。

---

## 🔬 源码解读

> 官方代码已开源（RSS 2026）：[ldt29/HAIC](https://github.com/ldt29/HAIC)，基于 **Isaac Lab v2.3.2 + Isaac Sim v5.1.0** 构建，并在 [LeCAR-Lab 的 HDMI](https://github.com/LeCAR-Lab)（Learning Interactive Humanoid Whole-Body Control from Human Videos）框架之上扩展。README 明确对应本文（arXiv 2602.11758）。

**目录结构**

| 路径 | 内容 |
|---|---|
| `active_adaptation/` | 核心算法：环境、动力学感知世界模型、教师/学生训练实现，以及 G1 机器人与交互物体的 USD 资产 |
| `cfg/` | 分层配置系统（任务 / 算法），如任务 `G1/haic/skateboard` |
| `data/motion/g1/` | G1 动捕 / 参考运动数据 |
| `scripts/` | `train.py`、`play.py` 训练与评估入口 |

**实现要点**

- 训练采用**教师-学生**两段式：先训特权教师（`ppo_haic_train`），再蒸馏到仅用本体感觉的学生（`ppo_haic_finetune`），对应论文的非对称微调思路——世界模型随学生策略探索持续适配。
- 论文核心的"动力学预测器 + 动态占据图"落在 `active_adaptation/` 内：世界模型从本体感觉历史回归物体高阶状态，再投影到静态几何先验形成空间占据表示，作为策略观测。这恰好回答了阅读备注里关注的两个问题——投影函数与几何先验来源都在该模块中实现。
- 任务以分层 config（`cfg/`）切换滑板 / 推车 / 抱箱等场景，策略可导出为 ONNX 用于部署；sim2sim（MuJoCo）部署在独立仓库 [Cybercal/HOIC-baseline](https://github.com/Cybercal/HOIC-baseline)。
- 释出节奏：资产模块（2026-06-02）、核心训练框架（2026-06-08）、sim2sim 部署（2026-06-10）已陆续提交；部分安装/使用文档仍在补充，且未提供预训练 checkpoint（数据为仿真生成）。

---

## 🔗 参考

```bibtex
@article{li2026haic,
  title         = {HAIC: Humanoid Agile Object Interaction Control via Dynamics-Aware World Model},
  author        = {Li, Dongting and Chen, Xingyu and Wu, Qianyang and Chen, Bo and Wu, Sikai and Wu, Hanyu and Zhang, Guoyao and others},
  year          = {2026},
  eprint        = {2602.11758},
  archivePrefix = {arXiv},
  primaryClass  = {cs.RO},
  url           = {https://arxiv.org/abs/2602.11758}
}
```
