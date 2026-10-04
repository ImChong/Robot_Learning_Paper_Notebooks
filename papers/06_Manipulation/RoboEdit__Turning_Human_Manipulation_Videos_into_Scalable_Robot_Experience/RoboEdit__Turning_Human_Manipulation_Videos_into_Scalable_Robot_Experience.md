---
layout: paper
title: "RoboEdit: Turning Human Manipulation Videos into Scalable Robot Experience"
zhname: "RoboEdit：把人类操作视频改写成可规模化的机器人经验"
category: "Manipulation"
arxiv: "2608.18948"
---

# RoboEdit: Turning Human Manipulation Videos into Scalable Robot Experience
**一套「人类→机器人」视频改写工具：把海量无标注的人手操作视频，改写成动作一致、物理可信、并带对齐 3D 手部状态的机器人视频；配自动重建-重定向流水线 RoboEdit-ADC 造出 RoboEdit-14M（174K 对齐视频对 / 14M 帧 / 7 种机器人本体），核心引擎 RoboEdit-Trans 做跨本体外观+运动改写并解码逐帧手部状态，为通用机器人学习提供可规模化的视觉与 3D 运动监督。**

> 📅 阅读日期: 2026-08-24
>
> 🏷️ 板块: 06 Manipulation · 人类视频→机器人数据 · 跨本体视频改写 · 3D 手-物交互重建 · 大规模数据集
>
> 🔁 推进轨: 模块轮转（05_Locomotion → 06_Manipulation）· 优先推进模块最新发表且无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 8 月 19 日（arXiv 首发） |
| arXiv | [2608.18948](https://arxiv.org/abs/2608.18948) · [PDF](https://arxiv.org/pdf/2608.18948) · [HTML](https://arxiv.org/html/2608.18948) |
| 源码 | 截至当前未见公开代码仓库 / 项目页（论文刚发布，故暂无源码运行时序图） |
| 作者 | Yaowei Guo、Zeng Tao、Yuxin Jiang、Yunuo Chen、Zhiyang Dou、Yuxiang Ma、Yin Yang、Demetri Terzopoulos、Ying Jiang、Chenfanfu Jiang（UCLA / Utah 等） |
| 主题 | cs.RO · 人类视频到机器人数据 / 跨本体视频编辑 / 手-物交互重建 / 模仿学习数据 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。与仓库已有的 [EgoMimic](../EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.html)、[DreamDojo](../DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.html) 同属「用人类/人手视频喂机器人学习」路线，但本文聚焦「把人手视频**直接改写成机器人视频**」这一数据侧问题。

---

## 🎯 一句话总结

> **RoboEdit** 想解决「机器人手-物交互数据既贵又绑本体，而海量人手操作视频却用不上」的矛盾：它把一段**人类操作视频**改写成**动作一致、物理可信、且带对齐 3D 手部状态**的**机器人操作视频**。为做到可规模化，作者设计了自动化流水线 **RoboEdit-ADC** 从 RGB 视频里**重建并重定向 3D 手-物交互**，量产出 **RoboEdit-14M**（**174K 对齐视频对、约 14M 帧、覆盖 7 种机器人本体**、多样场景与交互类型）。核心改写引擎 **RoboEdit-Trans** 用**跨本体适配模块**在保持时间连贯的同时替换外观与运动，并内嵌 **3D Robot-State Decoder** 恢复逐帧手部状态作为结构化运动监督。实验显示改写质量达到 SOTA，产出的数据能支撑真实世界操作的下游控制策略——把无标注人类视频变成可用的机器人监督信号。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| RoboEdit-ADC | 本文自动化「重建-重定向」数据流水线（Auto Data Curation 式管线，从 RGB 视频造出对齐数据） |
| RoboEdit-Trans | 核心视频改写引擎（Transformer 式，跨本体外观+运动编辑） |
| RoboEdit-14M | 产出的大规模数据集（约 14M 帧、174K 对齐视频对） |
| Cross-Embodiment | 跨本体：同一交互迁移到不同机器人（手/臂/夹爪等 7 种形态） |
| 3D Robot-State Decoder | 逐帧恢复机器人手部（末端）3D 状态的解码头，供运动监督 |
| Retarget | 重定向：把人手/人-物几何映射到机器人本体运动学 |

---

## ❓ 论文要解决什么问题？

- **机器人数据贵且绑本体**：采集真实机器人手-物交互数据成本高，而且**换一个本体就得重采**，难以规模化。
- **人类视频海量却「用不上」**：互联网上有海量人手操作视频，但它们**不是机器人本体**，动作/外观都对不上，无法直接当机器人训练数据。
- **中间转换缺一环**：以往「人类视频→机器人学习」多在**动作/策略层**做迁移，缺一套能把**视频本身**改写成「机器人在做同一件事」且**物理可信 + 带 3D 状态标签**的通用工具。

RoboEdit 的目标：造一台「视频改写机」，输入人手操作视频，输出**动作一致、物理可信、跨本体、带对齐 3D 手部状态**的机器人操作视频，从而把无标注人类视频转成可规模化的机器人监督数据。

---

## 🔧 方法详解

### 1. RoboEdit-ADC：自动重建-重定向流水线（造数据）
- 从**单目 RGB** 人类操作视频里**重建 3D 手-物交互**，再**重定向**到不同机器人本体的运动学结构上。
- 全自动、可规模化，量产出 **RoboEdit-14M**：**174K 对齐视频对（人类↔机器人）**、约 **14M 帧**，覆盖 **7 种机器人本体**、多样场景与交互类型。
- 「对齐视频对」是关键：人类视频与改写后的机器人视频在**时间与动作语义上一一对应**，天然形成监督信号。

### 2. RoboEdit-Trans：跨本体视频改写引擎（改视频）
- **跨本体适配模块（Cross-Embodiment Adaptation）**：在**保持时间连贯**的前提下，替换视频中的**外观（人手→机器人手/臂）与运动**，避免逐帧改写导致的抖动/闪烁。
- **3D Robot-State Decoder**：在改写的同时**逐帧解码机器人手部（末端）3D 状态**，把「视频像素监督」升级为「像素 + 结构化 3D 运动监督」，供下游策略学习。

### 3. 用途：喂给下游控制策略
- 产出的机器人视频 + 3D 状态可作为**模仿学习/策略训练**的监督数据；论文报告改写在**真实世界操作任务**上支撑了下游控制策略。

### 🧭 RoboEdit 整体流程（mermaid）

<div class="mermaid">
flowchart TD
    HV["人类操作视频<br/>(单目 RGB · 无标注 · 海量)"] --> ADC
    subgraph ADC["① RoboEdit-ADC · 自动重建-重定向流水线"]
        R3D["3D 手-物交互重建<br/>从 RGB 恢复手/物几何与接触"]
        RT["跨本体重定向<br/>映射到目标机器人运动学"]
        R3D --> RT
    end
    ADC --> TRANS
    subgraph TRANS["② RoboEdit-Trans · 视频改写引擎"]
        CE["跨本体适配模块<br/>换外观+运动 · 保时间连贯"]
        DEC["3D Robot-State Decoder<br/>逐帧恢复手部 3D 状态"]
        CE --> DEC
    end
    TRANS --> DS
    subgraph DS["③ RoboEdit-14M 数据集"]
        D1["174K 对齐视频对 · ~14M 帧"]
        D2["7 种机器人本体 · 多场景 · 多交互类型"]
        D3["机器人视频 + 逐帧 3D 手部状态标签"]
    end
    DS --> DOWN["④ 下游机器人学习<br/>模仿学习 / 控制策略"]
    DOWN --> REAL["真实世界操作任务<br/>可用监督 · 支撑策略落地"]

    style ADC fill:#e8f4fd,stroke:#2980b9,color:#1a4c66
    style TRANS fill:#fff5e6,stroke:#e67e22,color:#6b3b0a
    style DS fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style REAL fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 📊 关键结果（据摘要）

- **改写质量 SOTA**：在「人类→机器人」视频改写任务上取得当前最优的编辑质量（外观真实、动作一致、时间连贯）。
- **可支撑下游策略**：用改写数据训练/监督的控制策略，在**真实世界操作任务**上有效，验证了「无标注人类视频→可用机器人监督」这条链路。
- **规模化**：一条自动化流水线即可产出 **14M 帧 / 174K 对齐视频对 / 7 本体**，显著降低机器人数据的采集成本与本体绑定。

> ℹ️ 论文尚未开源，逐项数值与实现细节以 arXiv 原文/PDF 为准。

---

## 💡 核心贡献

1. **人类→机器人视频改写范式**：把「用人类视频」从策略层下沉到**视频数据层**——直接改写出物理可信、动作一致的机器人视频。
2. **RoboEdit-ADC 自动流水线**：从单目 RGB 自动重建 3D 手-物交互并跨本体重定向，量产对齐数据。
3. **RoboEdit-14M 大规模数据集**：174K 对齐视频对 / ~14M 帧 / 7 种机器人本体，跨场景跨交互。
4. **RoboEdit-Trans 改写引擎**：跨本体适配保时间连贯 + 3D Robot-State Decoder 提供结构化运动监督。

---

## 🤖 对人形机器人学习的启发

- **数据瓶颈的另一条解法**：与其「更便宜地采机器人数据」，不如「把已有海量人类视频改写成机器人数据」，对高自由度人形/灵巧手尤其划算。
- **视频层监督 + 3D 状态**：像素改写叠加逐帧 3D 手部状态，比纯策略迁移提供更密、更结构化的监督，利于模仿学习与 VLA。
- **跨本体是关键**：一次重建、多本体重定向，天然契合人形/灵巧手「本体多样」的现实。
- 与仓库中 [EgoMimic](../EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.html)、[Being-H0](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html)、[DreamDojo](../DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.html) 等「人类视频驱动机器人学习」路线互补：本文补齐「视频数据改写」这一环。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2608.18948](https://arxiv.org/abs/2608.18948) | 论文正文（改写范式、ADC 流水线、Trans 引擎、RoboEdit-14M 与实验） |
| 源码 / 项目页 | 论文刚发布，截至当前未见公开仓库/项目页（故无源码运行时序图） |
| 数据集 | RoboEdit-14M（174K 对齐视频对 / ~14M 帧 / 7 本体），发布情况以官方后续为准 |

> ℹ️ 备注：本笔记依据 arXiv 摘要/论文整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块 · 人类/自我中心视频驱动**：[EgoMimic](../EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video/EgoMimic_Scaling_Imitation_Learning_via_Egocentric_Video.html) · [Being-H0](../Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos/Being-H0__Vision-Language-Action_Pretraining_from_Large-Scale_Human_Videos.html) · [EgoVLA](../EgoVLA__Learning_Vision-Language-Action_Models_from_Egocentric_Human_Videos/EgoVLA__Learning_Vision-Language-Action_Models_from_Egocentric_Human_Videos.html)
- **同模块 · 世界模型 / 生成数据**：[DreamDojo](../DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos/DreamDojo_A_Generalist_Robot_World_Model_from_Large-Scale_Human_Videos.html) · [DreamZero](../DreamZero_World_Action_Models_are_Zero-shot_Policies/DreamZero_World_Action_Models_are_Zero-shot_Policies.html)
