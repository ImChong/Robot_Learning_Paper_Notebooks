---
layout: paper
paper_order: 9
title: "GRAIL: Generating Humanoid Loco-Manipulation from 3D Assets and Video Priors"
zhname: "GRAIL：用 3D 资产与视频先验生成人形 Loco-Manipulation 数据"
category: "Simulation Benchmark"
---

# GRAIL: Generating Humanoid Loco-Manipulation from 3D Assets and Video Priors
**全数字的数据生成管线：把 3D 资产、可仿真场景与「视频基础模型（VFM）」先验拼起来，直接合成人形机器人的全身操作 + 行走交互数据，部署前完全不碰真机、不做遥操作。**

> 📅 阅读日期: 2026-06-25
>
> 🏷️ 板块: 11 Simulation Benchmark · 数据生成管线 / 视频先验 / 4D 人-物交互重建 / Sim-to-Real
>
> 🔁 推进轨: 模块轮转（10_Sim-to-Real → **11_Simulation_Benchmark**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2606.05160](https://arxiv.org/abs/2606.05160) |
| HTML | [在线阅读](https://arxiv.org/html/2606.05160) |
| PDF | [下载](https://arxiv.org/pdf/2606.05160) |
| 项目主页 | [research.nvidia.com/labs/dair/grail](https://research.nvidia.com/labs/dair/grail/) |
| 源码 | [NVlabs/GRAIL](https://github.com/NVlabs/GRAIL)（已开源，NVIDIA 非商业许可） |
| 数据集 | [HuggingFace · PhysicalAI-Robotics-Locomanipulation-GRAIL](https://huggingface.co/datasets/nvidia/PhysicalAI-Robotics-Locomanipulation-GRAIL) |
| **发布时间** | 2026-06-03（arXiv v1） |

**作者 / 机构**：Tianyi Xie、Ye Yuan、Yuke Zhu、Linxi Fan、Jan Kautz、Sanja Fidler 等（NVIDIA，DAIR Lab 等）
**机器人平台**：Unitree **G1** 人形（真机部署：取物成功率 84%、爬楼成功率 90%）
**领域归属**：面向人形 loco-manipulation 的**仿真就绪数据生成 / 数据扩展**

---

## 🎯 一句话总结

人形机器人要学「边走边操作（loco-manipulation）」，最缺的是**机器人可用的演示数据**——要覆盖多样物体、全身动作和不同场景几何。但遥操作和动捕都**很难规模化**：每采一批数据都要搭真实场景、给演员穿戴设备、还得真机上场。GRAIL 给出一条**全数字**的路：在部署前**始终停留在虚拟世界里**，把三样东西拼起来——① 现成 **3D 资产**、② **可仿真（simulator-ready）的场景**、③ 来自**视频基础模型（VFM）**的运动先验，从而**不重建真实环境、不遥操作机器人**就合成出交互数据。管线先用 VFM 生成一段「人-物交互参考视频」，再把它**重建成度量级的 4D 人-物交互轨迹**，最后**重定向（retarget）到 G1 人形**并训练「任务通用」的跟踪策略，落到第一视角 RGB 策略上真机部署。最终产出 **2 万+ 条序列**，真机上取物 84%、爬楼 90%。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| Loco-Manipulation | Locomotion + Manipulation | 边走边操作，需要全身协调的人形任务 |
| VFM | Video Foundation Model | 视频基础模型，提供运动 / 交互先验 |
| 4D HOI | 4D Human-Object Interaction | 带时间维的三维人-物交互轨迹 |
| Retargeting | - | 把人体动作映射到机器人（G1）关节的过程 |
| Simulator-ready | - | 场景已配好物理 / 碰撞，可直接进物理仿真 |

---

## ❓ 论文要解决什么问题？

> 人形 loco-manipulation 的数据为什么贵？因为**每一批演示都绑死在物理世界**：要搭真实场景、要动捕设备、要真机遥操作。换物体、换场景、换动作都得重来一遍，**规模化几乎不可能**。

GRAIL 的核心问题：

> 能否**完全在虚拟世界里**，仅靠现成 3D 资产 + 视频模型先验，**自动批量生成**机器人可直接训练的全身操作 + 行走数据，并迁移到真机？

---

## 🔧 方法拆解：三阶段全数字管线

### ① 场景装配 + 视频生成
组装一个**完整指定的 3D 配置**：把一个**已按目标机器人比例预拟合**的虚拟角色放进可仿真场景，再用**视频基础模型**合成一段「人-物交互参考视频」。这一步把「想要什么交互」用视频先验表达出来。

### ② 4D 人-物交互重建
利用已知的场景上下文，对参考视频做**位姿估计 + 物体跟踪 + 交互感知优化**，恢复出**度量级、时间连贯的 4D 人-物交互轨迹**——既知道人怎么动，也知道物体怎么被推/抓/搬。

### ③ 机器人适配 + 策略训练
把重建出的运动**重定向到 Unitree G1 人形**，训练**任务通用（task-general）的跟踪策略**覆盖操作与行走，最终蒸馏成**第一视角 RGB 策略**用于真机部署。

> 三阶段串成一条「部署前全虚拟」的流水线，产出 **20,000+ 序列**，覆盖取物、操作、坐下、地形通过等任务。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    ASSET["🧱 现成 3D 资产 + 可仿真场景<br/>角色按 G1 比例预拟合"]

    subgraph S1["① 场景装配 + 视频生成"]
        CFG["完整 3D 配置"]
        VFM["🎬 视频基础模型 (VFM)<br/>合成人-物交互参考视频"]
        CFG --> VFM
    end

    subgraph S2["② 4D 人-物交互重建"]
        POSE["位姿估计 + 物体跟踪"]
        OPT["交互感知优化<br/>→ 度量级 4D HOI 轨迹"]
        POSE --> OPT
    end

    subgraph S3["③ 机器人适配 + 策略训练"]
        RT["重定向到 Unitree G1"]
        POL["任务通用跟踪策略<br/>→ 第一视角 RGB 策略"]
        RT --> POL
    end

    ASSET --> S1 --> S2 --> S3
    POL --> OUT["🚀 20,000+ 仿真就绪序列<br/>真机: 取物 84% · 爬楼 90%"]

    style S1 fill:#e8f4fd,stroke:#1f78b4
    style S2 fill:#fff7e6,stroke:#e67e22
    style S3 fill:#eafaf1,stroke:#27ae60
</div>

---

## 💡 核心贡献

1. **数据生成范式**：提出**部署前全虚拟**的 loco-manipulation 数据管线，靠 3D 资产 + VFM 先验合成交互，**摆脱真实场景搭建与遥操作**，从根上解决数据规模化难题；
2. **4D 重建桥接**：用「位姿估计 + 物体跟踪 + 交互感知优化」把生成视频还原成**度量级 4D 人-物交互**，为重定向提供可用监督；
3. **任务通用跟踪策略**：同一套策略覆盖操作与地形通过，落到第一视角 RGB 策略真机部署；
4. **开放资源**：开源 [NVlabs/GRAIL](https://github.com/NVlabs/GRAIL) 与 HuggingFace 数据集（**20,000+ 序列**），真机验证取物 84% / 爬楼 90%。

---

## 📊 关键设定

| 维度 | 值 |
|---|---|
| 数据来源 | 3D 资产 + 可仿真场景 + 视频基础模型先验（全数字） |
| 中间表示 | 度量级 4D 人-物交互轨迹（4D HOI） |
| 机器人 | Unitree G1 人形 |
| 策略形态 | 任务通用跟踪策略 → 第一视角 RGB 策略 |
| 数据规模 | 20,000+ 序列 |
| 真机结果 | 取物 84%、爬楼 90% |
| 许可 | NVIDIA 非商业研究许可 |

> 📌 具体合成质量、消融、与遥操作/动捕基线的数据效率对比等数值，请以论文 PDF 实验章节为准。

---

## 🤖 对仿真数据 / 人形学习的意义

| 方向 | 含义 |
|---|---|
| **数据规模化** | 把「采数据」从物理世界搬进纯虚拟管线，理论上可随资产/场景数量任意扩展 |
| **视频先验落地机器人** | 展示了如何把 VFM 的运动想象力经 4D 重建「接地」成机器人可执行的轨迹 |
| **与 DexMimicGen / HumanoidGen 的关系** | 同属「自动数据生成」赛道，但卖点在用**视频先验 + 全身 loco-manipulation**，而非纯桌面双手操作 |

---

## 🔗 相关阅读

- [DexMimicGen: Automated Data Generation for Bimanual Dexterous Manipulation](../DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation/DexMimicGen__Automated_Data_Generation_for_Bimanual_Dexterous_Manipulation.html)：另一条自动数据生成路线（双手灵巧操作），本仓库已有笔记
- [HumanoidGen: Data Generation for Bimanual Dexterous Manipulation via LLM Reasoning](../HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning/HumanoidGen__Data_Generation_for_Bimanual_Dexterous_Manipulation_via_LLM_Reasoning.html)：用 LLM 推理生成人形操作数据，与视频先验路线形成对照，本仓库已有笔记
- [Humanoid Everyday: A Comprehensive Robotic Dataset for Open-World Humanoid Manipulation](../Humanoid_Everyday__Comprehensive_Robotic_Dataset_for_Open-World_Humanoid_Manipulation/Humanoid_Everyday__Comprehensive_Robotic_Dataset_for_Open-World_Humanoid_Manipulation.html)：真实采集的人形操作数据集，与全合成路线对照，本仓库已有笔记

---

> 备注：本笔记基于 arXiv 摘要、项目主页（[research.nvidia.com/labs/dair/grail](https://research.nvidia.com/labs/dair/grail/)）与源码仓库（[NVlabs/GRAIL](https://github.com/NVlabs/GRAIL)）整理；网络受限期间论文全文 HTML/PDF 未完整抓取，**合成质量、消融与各项数据效率对比**请以论文 PDF 为准。
