---
layout: paper
paper_order: 12
title: "Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World"
category: "Sim-to-Real"
zhname: "域随机化：从仿真到真实世界的深度神经网络迁移"
demos: ["domain_randomization"]
---

# Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World
**域随机化：从仿真到真实世界的深度神经网络迁移**

> 📅 阅读日期: 2026-05-01
>
> 🏷️ 板块: Sim-to-Real / Foundational Method

---

## 📋 基本信息

| 项目 | 链接 |
|------|------|
| **arXiv** | [1703.06907](https://arxiv.org/abs/1703.06907) |
| **PDF** | [下载](https://arxiv.org/pdf/1703.06907) |
| **作者** | Josh Tobin, Rachel Fong, Alex Ray, Jonas Schneider, Wojciech Zaremba, Pieter Abbeel |
| **机构** | OpenAI, UC Berkeley |
| **会议** | IROS 2017 |
| **发布时间** | 2017年3月（arXiv） |
| **代码** | OpenAI **未发布**官方实现；社区复现可参考 [matwilso/domrand](https://github.com/matwilso/domrand)（KUKA 臂物体定位，非 Fetch 原版） |

---

## 🎯 一句话总结

在视觉参数随机化的仿真环境里训练神经网络，让真实世界看起来只是仿真的"另一个变体"，从而无需任何真实数据即可完成 sim-to-real 迁移。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 简单解释 |
|------|------|----------|
| **DR** | Domain Randomization | 域随机化，仿真中随机化外观/物理参数 |
| **Sim-to-Real** | Simulation to Real World | 从仿真迁移到真实机器人 |
| **CNN** | Convolutional Neural Network | 卷积神经网络，用于图像处理 |

---

## ❓ 这篇论文要解决什么问题？

从仿真迁移到真实机器人有两条路：

1. **照片级真实渲染**：把仿真环境做得足够逼真，但代价极高
2. **域适应（Domain Adaptation）**：需要真实数据，采集成本高

本文提出第三条路：**故意让仿真"不真实"，但随机化到足够多样**，使策略/网络在分布覆盖真实世界时自然泛化，完全不需要真实世界的训练数据。

---

## 🔧 方法详解

### 核心思想

随机化仿真中的视觉参数，生成足够多样的训练分布，迫使网络学习对这些参数不变的、更鲁棒的特征表达。

$$\mathcal{E}(\xi) = \text{仿真环境，参数 } \xi \text{ 随机采样}$$

只要真实世界的分布落在训练时覆盖的随机化空间内，模型就能迁移。

### 📊 视觉域随机化训练与零真实样本部署

<div class="mermaid">
flowchart TB
    Xi["采样随机参数 ξ<br/>纹理 / 光照 / 相机 / 噪声"] --> Sim["仿真渲染 E(ξ)"]
    Sim --> Img["RGB 图像输入"]
    Img --> CNN["CNN 预测<br/>物体 3D 位姿"]
    CNN --> Loss["监督损失<br/>仿真真值"]
    Loss --> CNN
    CNN --> Deploy["零真实训练样本<br/>迁移到真实机械臂"]
</div>

「足够多样」到底长什么样？下面这个实验台画了九张训练图——把所有开关关掉，九张图会变得一模一样，网络立刻就能靠「红块在棕色桌面的哪个位置」作弊：

<div class="paper-demo" data-demo="dr-scene"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 随机化的参数

本文针对**物体检测/定位**任务，随机化以下视觉参数：

| 类别 | 随机化内容 |
|------|-----------|
| 纹理 | 桌面、地板、物体本体、干扰物体 |
| 光照 | 灯光数量、位置、颜色、强度 |
| 相机 | 位置、朝向、视场角 |
| 物体 | 位置、姿态、干扰物体的形状和数量 |
| 噪声 | 随机高斯噪声叠加到图像 |

### 任务设置

- **任务**：机械臂从桌面抓取物体，需预测物体的 3D 位置
- **网络输入**：RGB 图像
- **网络输出**：物体在相机坐标系下的 3D 位置
- **数据来源**：仅使用 DR 仿真数据，零真实世界训练样本

「只要真实世界的分布落在训练时覆盖的随机化空间内」这句话可以直接画出来。拖动真实世界的位置和随机化范围，注意右边那条 **U 形曲线**——范围并不是越大越好：

<div class="paper-demo" data-demo="dr-coverage"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

### 实验结果

| 方法 | 定位误差 |
|------|----------|
| 仅用单一仿真纹理训练 | 迁移失败 |
| 使用 DR 训练（本文方法） | 成功迁移到真实机器人 |
| 在真实数据上微调 | 略有提升，但 DR 单独已可用 |

机器人抓取成功率：**DR-only 训练达到 78%，微调后达到 87%**。

上面这张清单里五类随机化的贡献并不平均。逐个关掉看成功率掉多少，就知道哪一项是真的在救迁移：

<div class="paper-demo" data-demo="dr-ablation"><p class="demo-fallback">（本节含交互演示，需要启用 JavaScript）</p></div>

---

## ✅ 主要贡献

1. 提出 **Domain Randomization** 作为 sim-to-real 的独立方法，无需真实数据
2. 证明充分的视觉随机化可以完全替代照片级真实渲染
3. 在真实机械臂抓取任务上验证了有效性
4. 奠定了后续 DR 在 locomotion、manipulation、humanoid 领域的应用基础

---

## 💡 个人理解

这篇论文的核心洞察非常反直觉：**不需要仿真更真实，只需要仿真更多样**。

真实世界之所以难以迁移，是因为网络在单一仿真环境里过拟合了那套固定的视觉特征。DR 通过极度多样化训练分布，逼着网络放弃纹理/光照这些无关特征，学习更本质的几何和位置线索。

在人形机器人领域，DR 已经成为事实标准：摩擦系数、质量、延迟、观测噪声等物理参数的随机化配合 Isaac Gym/Lab 的 GPU 并行，是当前 sim-to-real locomotion pipeline 的核心组成。

---

## 🤖 对人形机器人学习的影响

| 影响方向 | 说明 |
|---------|------|
| **Locomotion** | 物理参数 DR（摩擦、质量、延迟）是 sim-to-real 行走的标配 |
| **视觉感知** | 相机位置、光照随机化用于视觉策略 sim-to-real |
| **后续工作** | AMP、PHC、MimicKit 等均使用 DR；ADR（自动域随机化）扩展了本文思路 |
| **理论基础** | Understanding DR（2021）从理论上解释了 DR 有效性，揭示了 memory-based policy 的必要性 |

---

## 📁 源码与 MimicKit 对照

| 类型 | 说明 |
|------|------|
| 官方代码 | OpenAI 2017 论文**无公开仓库**（仅方法描述 + 实验结果） |
| 社区复现 | [matwilso/domrand](https://github.com/matwilso/domrand)：MuJoCo 纹理/光照/相机随机化 + 物体定位 CNN |
| MimicKit | DR 作为**通用训练技术**而非独立算法：各 env 的 domain randomization 在环境配置与 `events` 中开启（如 BeyondMimic 的 `events.py`、MimicKit humanoid env yaml 中的物理参数扰动） |

> 本篇是 DR 的奠基实证工作；读代码时更常对照的是后续 Isaac Gym/Lab 系 locomotion 仓库中的 `domain_rand` / `events` 模块，而非 MimicKit 的单一 agent 文件。

---

## 📚 相关工作

- **后续**：ADR (Automatic Domain Randomization, OpenAI)：自动扩展随机化范围
- **理论**：Understanding Domain Randomization for Sim-to-real Transfer (Chen et al., 2021)
- **应用**：几乎所有 Isaac Gym/Lab 的 humanoid locomotion 工作均使用 DR

---

## 🏷️ 标签

`#Sim-to-Real` `#DomainRandomization` `#Foundational` `#ObjectDetection` `#RobotGrasping` `#OpenAI`
