---
layout: paper
title: "RoboMirror: Understand Before You Imitate for Video to Humanoid Locomotion"
zhname: "RoboMirror：先理解再模仿的视频驱动人形运动框架"
category: "Locomotion"
---

# RoboMirror: Understand Before You Imitate for Video to Humanoid Locomotion
**首个免重定向（retargeting-free）的「视频→人形运动」框架：秉持「先理解、再模仿」，用视觉语言模型（VLM）把第一/第三人称视频先蒸馏成「视觉运动意图」，再直接条件化一个扩散策略生成物理可信、语义对齐的运动，全程不做显式姿态重建与重定向**

> 📅 阅读日期: 2026-09-08
>
> 🏷️ 板块: Locomotion · 视频驱动 · 先理解再模仿 · VLM 运动意图 · 扩散策略 · MoE 教师 + 扩散学生蒸馏
>
> 🔁 推进轨: 模块轮转（04_Loco-Manipulation_and_WBC → **05_Locomotion**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2512.23649](https://arxiv.org/abs/2512.23649) |
| HTML | [在线阅读](https://arxiv.org/html/2512.23649v5) |
| PDF | [下载](https://arxiv.org/pdf/2512.23649) |
| 项目主页 | [gentlefress.github.io/RoboMirror-proj](https://gentlefress.github.io/RoboMirror-proj/) |
| 源码 | ⏳ 项目页标注 **Code Coming Soon**，截至当前未见公开仓库（故本笔记不含源码运行时序图） |
| **发布时间** | 2025-12-29 (v1) / 2026-08-29 (v5) |

**作者**：Zhe Li、Boan Zhu、Yangyang Wei、Shuanghao Bai、Yuheng Ji、Yibo Peng、Tao Huang、Pengwei Wang、Zhongyuan Wang、S.-H. Gary Chan、Chang Xu、Cheng Chi、Jianfei Yang、Shanghang Zhang

**机构**：北京智源 BAAI · 悉尼大学 · 香港科技大学 HKUST · 哈尔滨工业大学 HIT · 西安交通大学 XJTU · 中国科学院 CAS · 上海交通大学 SJTU · 北京大学 PKU

> 📎 与本仓库已收录的 [Do You Have Freestyle?（RoboPerform，音频驱动）](../Do_You_Have_Freestyle__Expressive_Humanoid_Locomotion_via_Audio_Control/Do_You_Have_Freestyle__Expressive_Humanoid_Locomotion_via_Audio_Control.md) 为同一课题组姊妹工作：都采用「MoE 教师 + 扩散学生蒸馏」，区别在于 RoboPerform 用**音频**当风格信号、RoboMirror 用**视频**经 VLM 抽取**运动意图**。

---

## 🎯 一句话总结

人是**看视频学动作**的：先看懂在做什么，再模仿。可现有人形运动系统要么依赖精心整理的动捕轨迹、要么靠稀疏文本指令，缺了「视觉理解 → 控制」这一环。文本到动作（T2M）语义太稀疏且级联管线误差累积；已有视频方法又只做「机械的姿态照搬」，并没有真正理解视频。RoboMirror 提出**首个免重定向的视频→运动框架**，把口号落到实处——**Understand before you imitate（先理解，再模仿）**：用 VLM 把原始第一/第三人称视频蒸馏成**视觉运动意图（visual motion intent）**，用它直接条件化一个**扩散策略**，端到端产出物理可信、语义对齐的运动，**无需显式姿态重建、也无需重定向**。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| RoboMirror | — | 本文方法名，视频驱动人形运动框架 |
| VLM | Vision-Language Model | 视觉语言模型（本文用 Qwen3-VL）理解视频、抽取运动意图 |
| T2M | Text-to-Motion | 文生动作，作为对照的稀疏文本路线 |
| DiT | Diffusion Transformer | 扩散 Transformer，用于生成运动 latent |
| MoE | Mixture of Experts | 专家混合，教师策略骨干 |
| RL | Reinforcement Learning | 强化学习，训练 MoE 教师策略 |
| retargeting-free | 免重定向 | 推理时不做「人体动作→机器人」的姿态重定向 |

---

## ❓ 论文要解决什么问题？

让人形「看视频学动作」，主流有两条路，各有硬伤：

1. **文本到动作（T2M）**：先把意图写成文字再生成动作——**语义稀疏**，一句「走过去」丢失大量节奏/风格细节，且「文本→动作→控制」分阶段级联，**误差逐级放大**。
2. **视频照搬**：直接从视频估计人体姿态再让机器人跟——只是**机械的 pose mimicry**，没有「理解」视频里发生了什么，遇到视角变化、遮挡、人机形态差异就崩，且通常要**显式姿态重建 + 迭代重定向**，延迟高。

RoboMirror 的洞见：**先理解、再模仿**。不要急着还原每个关节角，而是先让 VLM「看懂」视频、抽出**视觉运动意图**这一紧凑语义表征，再让它**直接**去条件化控制策略——从而绕开姿态重建与重定向的级联误差与高延迟，把人形控制**重构成一个「视频理解」问题**。

---

## 🔧 方法拆解（两阶段）

### 阶段一：视觉理解 → 运动意图（Understand）

- 用 **Qwen3-VL** 处理**第一人称 / 第三人称**视频输入，读出「在做什么运动」的语义。
- 经**扩散模型 + DiT** 把视觉理解转成**运动 latent（视觉运动意图）**——这是一段紧凑的意图表征，不是逐帧关节角，因此天然免重定向、对视角/形态更鲁棒。

### 阶段二：策略学习 → 模仿执行（Imitate）

- **MoE 教师策略**：用 **RL** 在仿真中训练，负责把目标运动学得稳、学得物理可信。
- **扩散学生策略**：以**重建出的运动 latent 为条件（guidance）**，学习「去噪出动作」，从教师蒸馏而来。
- 推理时**只跑学生**：视频 → 运动意图 → 扩散去噪出动作，**不做显式姿态重建、不做重定向**。

### 关键特性

| 特性 | 说明 |
|---|---|
| **免重定向** | 推理端彻底取消「人体姿态估计 + 重定向」，绕开级联误差 |
| **双视角输入** | 同时支持第一人称（telepresence 遥现）与第三人称视频 |
| **语义对齐** | 运动来自 VLM「理解」而非「照搬」，与视频语义一致 |
| **低延迟** | 第三人称控制延迟较基线**降低约 80%** |

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["🎥 输入视频"]
        EGO["第一人称视频<br/>(egocentric)"]
        THIRD["第三人称视频<br/>(third-person)"]
    end

    subgraph UNDERSTAND["🧠 阶段一：先理解"]
        VLM["Qwen3-VL<br/>看懂视频语义"]
        DIT["扩散 + DiT<br/>→ 视觉运动意图<br/>(motion latent)"]
    end

    subgraph IMITATE["🤸 阶段二：再模仿"]
        TEACH["MoE 教师策略<br/>(RL 训练, 物理可信)"]
        STU["扩散学生策略<br/>以运动 latent 为条件去噪出动作"]
    end

    ROBOT["🤖 人形机器人<br/>物理可信 · 语义对齐运动"]

    EGO --> VLM
    THIRD --> VLM
    VLM --> DIT
    DIT -->|视觉运动意图| STU
    TEACH -->|蒸馏| STU
    STU --> ROBOT
    ROBOT -.本体反馈.-> STU

    style IN fill:#fff7e0,stroke:#d4a017
    style UNDERSTAND fill:#e8f4fd,stroke:#1f78b4
    style IMITATE fill:#e8f8e8,stroke:#27ae60
</div>

> 💡 核心信息流：**视频 →(VLM 理解)→ 视觉运动意图 →(扩散学生去噪)→ 动作**，中间不经过「显式人体姿态 → 重定向」这一步，这正是「retargeting-free」与低延迟的来源。

---

## 💡 核心贡献

1. **首个免重定向的视频→运动框架**：把「先理解再模仿」落地，用 VLM 抽取视觉运动意图直接条件化控制策略，取消推理端的姿态重建与重定向。
2. **视频理解重构人形控制**：不再把控制看成「跟踪一段还原出的动作」，而是「理解视频语义并生成对齐运动」，弥合视觉理解与动作之间的鸿沟。
3. **双视角 + 遥现能力**：第一人称视频可做 telepresence（遥现操控）；第三人称控制**延迟降低约 80%**。
4. **MoE 教师 + 扩散学生**：教师用 RL 保物理可信，学生以运动 latent 为条件蒸馏，兼顾稳定性与语义对齐，任务成功率较基线**高 3.7%**。

---

## 📊 关键结果

| 指标 | 数值 |
|---|---|
| 第三人称控制延迟 | 较基线**降低 ~80%** |
| 任务成功率 | 较基线**高 3.7%** |
| 第一人称视频 | 可实现 **telepresence 遥现操控** |
| 运动质量 | 物理可信、与视频语义对齐（消融显示扩散策略优于 MLP 变体） |

> ⚠️ 具体数值以论文最终版为准；上表为结构性摘录。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **视频作为控制通道** | 视频不必先还原成显式动作，可经 VLM「理解」后直接驱动控制，为「看视频学动作」提供通用范式 |
| **免重定向** | 绕开人机形态差异带来的重定向难题与级联误差，降低部署复杂度与延迟 |
| **理解 vs 照搬** | 强调「先理解再模仿」，相较机械 pose mimicry 对视角变化/遮挡更鲁棒、语义更一致 |
| **遥现交互** | 第一人称视频遥现，为人形远程操作与陪伴交互补上「看我做→机器人做」的自然接口 |

---

## 🎤 面试参考

**Q：RoboMirror 与「视频估姿态再重定向」的路线本质区别在哪？**
A：后者是「照搬」——先显式重建人体姿态，再迭代重定向到机器人，级联误差大、延迟高，且没有真正理解视频。RoboMirror 是「先理解再模仿」——用 VLM 把视频蒸馏成紧凑的**视觉运动意图**，直接条件化扩散策略生成动作，推理端**不做姿态重建、不做重定向**，因此更鲁棒、延迟更低。

**Q：「视觉运动意图」为什么能免重定向？**
A：它不是逐帧关节角，而是一段语义层面的运动 latent。策略以它为条件去「生成机器人自己的动作」，而非「跟踪一段人体动作」，所以不需要把人体姿态一一映射到机器人（重定向），自然规避了人机形态差异。

**Q：为什么用「MoE 教师 + 扩散学生」而不是单一策略？**
A：MoE 教师用 RL 训练，擅长把多样运动学得稳、物理可信；扩散学生以运动 latent 为条件去噪出动作，语义对齐且可低延迟部署。教师保物理、学生保对齐与实时，二者蒸馏结合。这也是该课题组姊妹工作 RoboPerform（音频驱动）一致的设计范式。

---

## 🔗 相关阅读

- [Do You Have Freestyle?（RoboPerform，音频驱动）](../Do_You_Have_Freestyle__Expressive_Humanoid_Locomotion_via_Audio_Control/Do_You_Have_Freestyle__Expressive_Humanoid_Locomotion_via_Audio_Control.md)：同组姊妹工作，「MoE 教师 + 扩散学生」范式一致，风格信号换成音频
- [Now You See That: End-to-End Humanoid Locomotion from Raw Pixels (2602.06382)](https://arxiv.org/abs/2602.06382)：另一条「感知直驱控制」路线（视觉像素直驱），可与本文「视频理解直驱」对照
- [Humanoid Locomotion as Next Token Prediction (2402.19469)](https://arxiv.org/abs/2402.19469)：把人形控制重构为序列建模的另一新范式
- [VideoMimic: Visual imitation enables contextual humanoid control (2505.03729)](https://arxiv.org/abs/2505.03729)：视觉模仿驱动人形控制的相关工作
