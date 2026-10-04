---
layout: paper
title: "RoboTacDex: A Dexterous Visual-Tactile-Action Dataset for Humanoid Manipulation"
zhname: "RoboTacDex：面向人形操作的灵巧视觉-触觉-动作数据集"
category: "Manipulation"
arxiv: "2606.31836"
---

# RoboTacDex: A Dexterous Visual-Tactile-Action Dataset for Humanoid Manipulation
**在 Unitree G1 人形上采集的大规模灵巧「视觉-触觉-动作」数据集：6k 条轨迹 / 19 任务 / 23 技能 / 22 物体，含多视角 RGB-D、指尖法向+切向接触力与自电容近距感知的触觉、以及语义标注；配毫秒级多相机同步系统，并在 ACT / Diffusion Policy / GR00T N1.5 三种模仿学习方法上给出基准。**

> 📅 阅读日期: 2026-08-13
>
> 🏷️ 板块: 06 Manipulation · 灵巧操作 · 视觉-触觉-动作数据集 · 双臂双灵巧手 · 模仿学习基准
>
> 🔁 推进轨: 模块轮转（05_Locomotion → 06_Manipulation）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 6 月（IEEE RA-L 投稿） |
| arXiv | [2606.31836](https://arxiv.org/abs/2606.31836) · [PDF](https://arxiv.org/pdf/2606.31836) · [HTML](https://arxiv.org/html/2606.31836v1) |
| 源码 | 论文声明「数据集将很快开源」，截至当前未见公开仓库/项目页 |
| 作者 | Xinyi Wang、Donghan Li、Zi'Ang Chen、Chong Yu、Chen Xin、Peng Ye、Yingkai Sun、Tao Chen 等 |
| 主题 | cs.RO · 人形操作数据集 / 触觉感知 / 灵巧手 / 模仿学习基准 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。与仓库已有的 [A Humanoid Visual-Tactile-Action Dataset for Contact-Rich Manipulation](../A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation/A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation.html) 主题相近但为不同、更新的数据集工作。

---

## 🎯 一句话总结

> **RoboTacDex** 面向「人形灵巧操作缺高质量数据」这一痛点，在公开可得的 **Unitree G1** 人形（双臂 + 双灵巧手）上，通过遥操作采集了一份**大规模、多模态、多样化**的灵巧操作数据集：**6k 条轨迹**，覆盖 **19 个任务 / 23 种技能 / 22 种物体**。每条轨迹同时记录**多视角 RGB 与深度**、**指尖触觉（法向 + 切向接触力方向 + 自电容近距感知）**、**关节状态**与**语义标注**，并特意收纳「必须双臂 + 灵巧手协同才能完成」的挑战性任务，以模拟真实世界的操作复杂度。为保证数据质量，作者设计了**软硬件结合的多相机同步系统**做到**毫秒级同步**；最后在 **ACT / Diffusion Policy / GR00T N1.5** 三种代表性模仿学习方法上给出基准评测，验证数据的有效性与一定的泛化能力。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| RoboTacDex | 本文数据集名（Robot Tactile Dexterous） |
| RGB-D | 彩色 + 深度图像 |
| DDS | Data Distribution Service，机器人上常用的实时消息中间件 |
| ACT | Action Chunking with Transformers，动作分块 Transformer 策略 |
| DP | Diffusion Policy，扩散策略 |
| VLA | Vision-Language-Action，视觉-语言-动作模型（此处指 GR00T N1.5） |
| DoF | Degrees of Freedom，自由度 |

---

## ❓ 论文要解决什么问题？

- **人形操作数据稀缺**：面向固定基座机械臂的数据采集已相对成熟、也有众多大规模数据集；但**面向人形机器人**的高质量操作数据仍**极度匮乏**。
- **人形采集更难**：① 人形自由度极高，需要精确记录复杂、高维的**双臂协同**动作；② 人们期望人形在**非结构化、开放世界**中完成复杂任务，对**数据多样性、系统完整性与评测客观性**要求更高。
- **触觉这一关键模态常缺席**：接触丰富的灵巧操作依赖指尖力反馈，而多数数据集只有视觉。

RoboTacDex 的目标：在**真实人形 + 双灵巧手**上，采集一份**带触觉**、**多视角**、**规模够大、任务够难**的数据集，并给出可复现的模仿学习基准。

---

## 🔧 方法详解

### 1. 采集平台与模态
- **本体**：Unitree G1 人形，双臂 + 双灵巧手，聚焦「双手协同」才能完成的任务。
- **视觉**：第一视角 / 第三视角相机为 **RealSense D435i**（支持硬件同步），另有腕部相机；提供多视角 **RGB + 深度**。
- **触觉**：每个指尖提供**法向 + 切向接触力（含方向）**，并由**自电容近距感知**给出手指与物体间的距离；触觉与灵巧手关节状态以 **100Hz** 通过 **DDS** 发布，本地按 **30Hz** 与其他模态一同记录。
- **标注**：附带详细的语义标注。

### 2. 多相机同步系统
- **硬件同步**用于支持硬同步的 D435i 相机；**软件同步**用于头部/第三视角相机与腕部相机之间，消除视频流时间错位，实现**毫秒级**多模态对齐。

### 3. 数据规模与结构
- **6k 轨迹 / 19 任务 / 23 技能 / 22 物体**；物体按用途分类：可抓取 33.6%、受约束 26.0%、容器 18.3%、功能性 11.7%、铰接 8.4%。
- 为提升鲁棒性，在 **4 种配置**下采集：机器人到桌面距离 **5cm / 15cm** × **白色 / 绿色网格背景**。

### 4. 模仿学习基准
- 评测 **ACT**、**Diffusion Policy (DP)**、**GR00T N1.5(VLA)** 三种方法；主要在 4 个代表性任务上各做 **10 次试验**：`PickAndPlacePear`（取梨放篮）、`TurnPage`（翻页）、`InsertBook`（单手持袋、另一手插书入袋）、`UnscrewBottle`（拧开瓶盖）。

### 🧭 数据集构建与评测流程（mermaid）

<div class="mermaid">
flowchart TD
    subgraph CAP["① 采集平台 · Unitree G1 双臂双灵巧手"]
        V["多视角 RGB-D<br/>RealSense D435i(头/三视角)+腕部相机"]
        T["指尖触觉<br/>法向+切向力方向 · 自电容近距感知<br/>100Hz DDS"]
        J["关节状态 + 语义标注"]
    end
    V --> SYNC
    T --> SYNC
    J --> SYNC
    SYNC["② 多相机同步<br/>硬件+软件 · 毫秒级对齐 · 30Hz 记录"] --> DS
    subgraph DS["③ RoboTacDex 数据集"]
        D1["6k 轨迹 / 19 任务 / 23 技能 / 22 物体"]
        D2["4 种配置：桌距 5/15cm × 白/绿网格背景"]
    end
    DS --> TRAIN["④ 模仿学习训练<br/>ACT · Diffusion Policy · GR00T N1.5"]
    TRAIN --> EVAL["⑤ 4 任务 ×10 试验评测<br/>取梨/翻页/插书/拧瓶盖"]
    EVAL --> RES["平均成功率：ACT 3/10 · DP 3/10 · GR00T N1.5 6/10"]

    style CAP fill:#e8f4fd,stroke:#2980b9,color:#1a4c66
    style DS fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style RES fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 📊 关键结果

| 任务 | ACT | Diffusion Policy | GR00T N1.5 |
|---|:---:|:---:|:---:|
| PickAndPlacePear | 0/10 | 3/10 | 9/10 |
| TurnPage | 6/10 | 5/10 | 6/10 |
| InsertBook | 4/10 | 3/10 | 4/10 |
| UnscrewBottle | 3/10 | 2/10 | 6/10 |
| **平均** | **3/10** | **3/10** | **6/10** |

- **VLA（GR00T N1.5）整体最好**：得益于大规模操作数据预训练，对物体位置/操作距离有更强泛化，尤其在常见的「取梨放篮」上表现突出。
- 但在 `InsertBook`、`UnscrewBottle` 等**少见任务**上，VLA 未能学到关键语义与空间约束（如插书时书与文件袋对不齐），说明 VLA 仍需**大量数据**才能学到不同任务的关键操作要点。
- **ACT / DP** 属于「观测→动作」映射的小模型：当示例中物体空间位置分布过散时，插值点成功率不佳；ACT 的时序集成模块在**多模态**演示（如左右手皆可取物）下还可能出现双手都动却都不到位。

---

## 💡 核心贡献

1. **面向人形的大规模灵巧操作数据集**：Unitree G1 双臂双灵巧手，6k 轨迹 / 19 任务 / 23 技能 / 22 物体，聚焦「双手协同」难任务。
2. **触觉是一等公民**：指尖法向 + 切向接触力（含方向）+ 自电容近距感知，补齐接触丰富操作的关键模态。
3. **毫秒级多模态同步系统**：软硬件结合，保证多视角视觉、触觉、关节状态时间对齐与数据质量。
4. **模仿学习基准**：在 ACT / DP / GR00T N1.5 上给出统一评测，剖析大小模型在人形灵巧任务上的优劣。

---

## 🤖 对人形机器人学习的启发

- **数据是人形操作的地基**：真实人形 + 触觉的高质量数据集，直接决定模仿学习/VLA 的上限。
- **触觉 + 视觉多模态**：接触丰富的灵巧任务里，指尖力与近距感知能补足纯视觉的盲区。
- **VLA 需要「量」**：预训练 VLA 在常见任务泛化好，但少见任务仍受限于领域数据规模——继续「补数据」是务实路线。
- 与仓库中 [RGMP](../RGMP__Recurrent_Geometric-prior_Multimodal_Policy_for_Generalizable_Humanoid_Manipulation/RGMP__Recurrent_Geometric-prior_Multimodal_Policy_for_Generalizable_Humanoid_Manipulation.html)、[HTD（Touch Dreaming）](https://arxiv.org/abs/2604.13015) 等「触觉/多模态操作」路线互补。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2606.31836](https://arxiv.org/abs/2606.31836) | 论文正文（数据集构建、同步系统、模仿学习基准） |
| 数据集 | 论文声明「将很快开源」，截至当前未见公开下载/项目页 |

> ℹ️ 备注：本笔记依据 arXiv 论文整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块 · 视觉-触觉-动作数据集**：[A Humanoid Visual-Tactile-Action Dataset for Contact-Rich Manipulation](../A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation/A_Humanoid_Visual-Tactile-Action_Dataset_for_Contact-Rich_Manipulation.html)
- **同模块 · 触觉/多模态操作**：[HTD：Touch Dreaming](https://arxiv.org/abs/2604.13015) · [RGMP](../RGMP__Recurrent_Geometric-prior_Multimodal_Policy_for_Generalizable_Humanoid_Manipulation/RGMP__Recurrent_Geometric-prior_Multimodal_Policy_for_Generalizable_Humanoid_Manipulation.html) · [Visual-Tactile Pretraining](../Visual-Tactile_Pretraining_and_Online_Multitask_Learning_for_Humanlike_Manipulation_Dexterity/Visual-Tactile_Pretraining_and_Online_Multitask_Learning_for_Humanlike_Manipulation_Dexterity.html)
