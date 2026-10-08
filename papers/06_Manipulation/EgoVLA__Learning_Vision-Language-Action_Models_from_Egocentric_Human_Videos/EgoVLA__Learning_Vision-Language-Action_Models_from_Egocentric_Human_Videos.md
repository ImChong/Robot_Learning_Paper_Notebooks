---
layout: paper
title: "EgoVLA: Learning Vision-Language-Action Models from Egocentric Human Videos"
zhname: "EgoVLA：从第一视角人类视频学习视觉-语言-动作模型"
category: "Manipulation"
arxiv: "2507.12440"
---

# EgoVLA: Learning Vision-Language-Action Models from Egocentric Human Videos
**EgoVLA：从第一视角人类视频学习视觉-语言-动作模型**

> 📅 阅读日期: 2026-07-01
>
> 🏷️ 板块: Manipulation · 视觉-语言-动作(VLA) · 第一视角人类视频 · 双手灵巧操作
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2507.12440](https://arxiv.org/abs/2507.12440) |
| HTML | [在线阅读](https://arxiv.org/html/2507.12440v3) |
| PDF | [下载](https://arxiv.org/pdf/2507.12440) |
| **发布时间** | 2025-07-16 (arXiv v1，v3 2025-07-18) |
| 项目主页 | [rchalyang.github.io/EgoVLA](https://rchalyang.github.io/EgoVLA/) |
| 源码（训练/推理） | [RchalYang/EgoVLA_Release](https://github.com/RchalYang/EgoVLA_Release) |
| 源码（仿真 Benchmark） | [quincy-u/Ego_Humanoid_Manipulation_Benchmark](https://github.com/quincy-u/Ego_Humanoid_Manipulation_Benchmark) |

**机构**：UC San Diego（王小龙组，Ruihan Yang 等）+ NVIDIA + MIT

**机器人 / 仿真**：Unitree **H1** 人形 + 双 **Inspire** 灵巧手，基准搭建在 **NVIDIA Isaac Lab** 上

---

## 🎯 一句话总结

真机数据贵、规模受限，是模仿学习的老大难。EgoVLA 的主张是：**先在便宜且海量的第一视角人类操作视频上训练 VLA**，让模型学会「看画面 + 读指令 → 预测人手（手腕位姿 + 手型）动作」，把人和机器人统一到**同一套以 MANO 手部参数为核心的动作空间**里；部署时用**逆运动学 + 重定向**把人手动作翻译成机器人关节指令，再用**少量真机演示微调**贴合本体差异，得到人形双手操作策略 EgoVLA。作者同时开源了一个 **Ego Humanoid Manipulation Benchmark**（Isaac Lab、12 个双手任务）用于可复现评测。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLA | Vision-Language-Action Model | 视觉-语言-动作模型，输入图像+语言，输出动作 |
| MANO | hand Model with Articulated and Non-rigid defOrmations | 参数化手部模型，本文作为「人/机器人共享」的手型表示 |
| IK | Inverse Kinematics | 逆运动学，把末端目标位姿解成关节角 |
| Retargeting | Motion Retargeting | 动作重定向，把人手运动映射到机器人手/臂 |
| Egocentric | 第一视角 | 摄像头戴在头上、与操作者视线一致的画面 |
| BC | Behavior Cloning | 行为克隆，监督式模仿学习 |

---

## ❓ 论文要解决什么问题？

模仿学习靠**真机遥操作采集数据**推动了操作能力的进步，但存在根本瓶颈：

1. **规模受限**：每条数据都要真机 + 人在环，采集慢、贵，难以覆盖足够多的场景与任务。
2. **多样性不足**：真机数据往往局限在实验室固定几张桌子、几个物体，泛化差。

而**第一视角人类视频**恰好互补：不仅**规模大**，更重要的是**场景与任务极其丰富**（人本来就在各种环境里用手做各种事）。难点在于——人类视频里**没有机器人动作标签**，人手和机器人手的形态、驱动方式也不同，如何把「人怎么动」变成「机器人怎么动」？

EgoVLA 的答案：**用一套统一的动作表示把人和机器人对齐**，让人类视频直接成为 VLA 的预训练语料。

---

## 🔧 方法拆解

### 1. 统一动作空间（人/机器人共享）

- 动作用**手腕 6-DoF 位姿 + MANO 手型参数**表示。人手天然就是 MANO；机器人手则**预优化一组 MANO 参数**，使其产生与目标等价的指尖位置。
- 这样，VLA 预测的「人手动作」与机器人执行的「机器人手动作」落在**同一表示空间**，人类视频的监督信号可直接迁移。

### 2. VLA 模型

- 输入：**视觉历史帧 + 语言指令 + 动作查询 token（action query）**；经 VLM 骨干抽取潜特征，送入一个 **action head** 输出未来动作序列（手腕位姿 + MANO 手型）。

### 3. 两段式训练

- **预训练**：在多个带手部标注的**第一视角人类操作视频**数据集上训练，学到「视觉 + 语言 → 人手动作」的通用先验。
- **微调**：用**少量机器人演示**把模型适配到具体本体，得到机器人策略 EgoVLA。

### 4. 部署：人手动作 → 机器人指令

- 手腕位姿经 **IK** 解成机械臂关节角；
- MANO 手型经**重定向**得到指尖目标，再用一个**小 MLP** 把指尖位置映射为灵巧手关节指令。

### 5. Ego Humanoid Manipulation Benchmark

- 基于 **Isaac Lab**，机器人为 **Unitree H1 + 双 Inspire 手**；
- **12 个双手操作任务**，从短程原子动作到长程多阶段技能（如 Insert Cans、Stack Can into Drawer）；
- 提供多房间 / 多桌面配置测试视觉泛化，作为**可复现**的操作策略评测台。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📚 数据源"]
        HV["🎥 第一视角人类视频<br/>规模大·场景/任务丰富<br/>(无机器人动作标签)"]
        RD["🤖 少量真机演示<br/>Unitree H1 + Inspire 手"]
    end

    subgraph UNI["🔗 统一动作空间"]
        MANO["✋ 手腕 6-DoF 位姿<br/>+ MANO 手型参数<br/>人/机器人共享表示"]
    end

    subgraph MODEL["🧠 VLA 模型"]
        IN["图像历史 + 语言指令<br/>+ 动作查询 token"]
        VLM["VLM 骨干 → 潜特征"]
        HEAD["🎯 Action Head<br/>输出手腕位姿 + MANO"]
    end

    subgraph TRAIN["🏋️ 两段式训练"]
        PRE["① 人类视频预训练<br/>学通用「视觉→人手动作」先验"]
        FT["② 少量真机演示微调<br/>适配本体 → EgoVLA"]
    end

    subgraph DEPLOY["🚀 部署映射"]
        IK["📐 IK：手腕位姿→机械臂关节角"]
        RT["🔁 重定向 + 小 MLP<br/>MANO→指尖→灵巧手关节"]
        ROB["🦾 机器人双手执行"]
    end

    HV --> MANO
    RD --> MANO
    MANO --> IN --> VLM --> HEAD
    HEAD --> PRE --> FT
    FT --> IK
    FT --> RT
    IK --> ROB
    RT --> ROB
    ROB -.->|Ego Humanoid Benchmark<br/>12 双手任务·Isaac Lab| HEAD

    style DATA fill:#fff7e0,stroke:#d4a017
    style UNI fill:#e8f4fd,stroke:#1f78b4
    style MODEL fill:#f3e8ff,stroke:#8e44ad
    style TRAIN fill:#e8fce8,stroke:#27ae60
    style DEPLOY fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **人类视频直接当 VLA 预训练语料**：通过「手腕位姿 + MANO」统一动作空间，把无动作标签的第一视角人类视频转成可监督的动作数据。
2. **人→机器人的可执行映射**：IK + 重定向 + 小 MLP，把预测的人手动作落到 Unitree H1 双灵巧手上。
3. **开源双手操作基准**：Ego Humanoid Manipulation Benchmark（Isaac Lab、12 任务、多场景），填补人形双手操作可复现评测的空白。
4. **全套开源**：训练/推理代码 + 仿真基准代码均已公开。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 人类视频预训练 | 相比「无预训练」基线在所有任务上显著提升 |
| 长程 / 精细任务 | 增益尤为明显（多阶段技能最吃通用先验） |
| 视觉泛化 | 在未见背景/场景下仍保持高成功率；仅用真机数据的基线在新视觉环境掉点明显 |
| 数据多样性 | 人类数据越丰富，泛化越好（消融验证「多样性 > 单纯规模」的价值） |

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **数据来源解耦** | 把「学操作先验」和「贴合本体」拆开：前者用便宜海量的人类视频，后者用少量真机数据 |
| **统一动作表示** | MANO 作为人/机器人手的公共语言，是「人类视频 → 机器人策略」这条链路的关键接口 |
| **双手人形基准** | 为社区提供可复现的人形双手操作评测，利于横向对比 |
| **局限** | 依赖手部标注质量与 IK/重定向精度；仿真为主，真机验证与更复杂长程任务仍待扩展 |

---

## 🎤 面试参考

**Q：人类视频没有机器人动作标签，EgoVLA 怎么把它变成可训练的动作数据？**
A：核心是**统一动作空间**——动作统一用「手腕 6-DoF 位姿 + MANO 手型参数」表示。人手天然是 MANO；机器人手预优化一组 MANO 参数使指尖等价。于是人类视频里估计出的人手动作就成了 VLA 的监督标签，人和机器人共享同一套输出。

**Q：预测出来的是「人手动作」，机器人怎么执行？**
A：手腕位姿走 **IK** 解成机械臂关节角；MANO 手型经**重定向**得到指尖目标，再用一个小 MLP 把指尖位置映射到灵巧手关节指令。IK + 重定向把「人手空间」翻译到「机器人关节空间」。

**Q：为什么强调人类视频的「多样性」而不只是「规模」？**
A：消融显示，仅靠真机数据的策略在换背景/换场景时掉点严重，而人类视频天然覆盖大量场景与任务；作者发现人类数据越多样，泛化越好——多样性带来的分布覆盖，是纯规模难以替代的。

**Q：和同模块「用人类演示/第一视角」的工作（如 EgoMimic、EgoDex）有何差异？**
A：都想用人类第一视角数据降低真机采集成本。EgoVLA 的特点是**训练一个 VLA**（吃语言指令、可多任务），并用 **MANO 统一动作空间 + IK/重定向**把人手动作落到人形双灵巧手，同时开源了配套的 Isaac Lab 双手操作基准。

---

## 🔗 相关阅读

- [EgoMimic (2410.24221)](https://arxiv.org/abs/2410.24221)：同模块，第一视角视频扩展模仿学习（笔记见本目录）
- [EgoDex (2505.11709)](https://arxiv.org/abs/2505.11709)：大规模第一视角视频学习灵巧操作（笔记见本目录）
- [Being-H0 (2507.15597)](https://arxiv.org/abs/2507.15597)：从大规模人类视频做 VLA 预训练（笔记见本目录）
- [iDP3 (2410.10803)](https://arxiv.org/abs/2410.10803)：泛化人形操作的 3D 扩散策略（笔记见 03_High_Impact_Selection）
