---
layout: paper
title: "DexHub and DART: Towards Internet Scale Robot Data Collection"
zhname: "DexHub 与 DART：迈向互联网规模的机器人数据采集"
category: "Manipulation"
arxiv: "2411.02214"
---

# DexHub and DART: Towards Internet Scale Robot Data Collection
**DexHub 与 DART：迈向互联网规模的机器人数据采集**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 06 Manipulation · 互联网规模采集 · 众包遥操作 · 云仿真 · AR · 公共数据库
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 11 月 |
| arXiv | [2411.02214](https://arxiv.org/abs/2411.02214) · [PDF](https://arxiv.org/pdf/2411.02214) · [HTML](https://arxiv.org/html/2411.02214v1) |
| 作者 | Younghyo Park、Jagdeep Singh Bhatia、Lars Ankile、Pulkit Agrawal（MIT） |
| 主题 | cs.RO · 数据采集 / 云仿真 / 众包遥操作 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Manipulation 模块。

---

## 🎯 一句话总结

> 构建**通才机器人系统**受制于**多样高质量数据的稀缺**。本文提出 **DART**：一个借**云端仿真**与**增强现实（AR）**做**可扩展机器人数据采集**的**众包遥操作平台**。采集的数据**自动存入** **DexHub** ——一个**云端托管数据库**，意在成为机器人学习的**公共仓库**。用户研究表明 DART 相比**真机遥操作**实现**更高采集吞吐、更低体力疲劳**，并能成功 **sim-to-real 迁移**、对**视觉扰动鲁棒**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| DART | 众包遥操作采集平台（云仿真 + AR） |
| DexHub | 云端公共机器人数据仓库 |
| Crowdsourcing | 众包 |
| Cloud Simulation | 云端仿真 |
| AR | 增强现实 |
| Throughput | 采集吞吐量 |

---

## ❓ 论文要解决什么问题？

通才机器人缺**互联网规模**数据：
- 真机遥操作**吞吐低、疲劳高、难规模化**；
- 缺**公共、可众包**的采集平台与仓库。

DexHub/DART 要：用**云仿真 + AR 众包**采集，建**公共数据库**，迈向互联网规模。

---

## 🔧 方法详解

### 1. DART：云仿真 + AR 众包遥操作
**任何人**可经**云端仿真 + AR** 远程遥操作采集数据，不需本地机器人/仿真，天然可**众包、可扩展**。

### 2. DexHub：云端公共数据库
采集数据**自动入库 DexHub**，意在成为机器人学习的**公共仓库**。

### 3. 验证
- 用户研究：DART 比真机遥操作**吞吐更高、疲劳更低**；
- **sim-to-real 迁移成功**、对**视觉扰动鲁棒**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    USERS["🌍 众包用户(AR)"] --> DART
    subgraph DART["DART(云仿真 + AR)"]
        T["可扩展遥操作采集"]
    end
    DART --> DEXHUB["DexHub 云端公共数据库"]
    DEXHUB --> OUT["🤖 高吞吐/低疲劳<br/>sim-to-real + 视觉鲁棒"]

    style DART fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **DART 众包采集平台**：云仿真 + AR，可扩展、低门槛；
2. **DexHub 公共数据库**：意在成为机器人学习公共仓库；
3. **优于真机遥操作**：吞吐更高、疲劳更低；
4. **sim-to-real + 视觉鲁棒**：采集数据可迁移真机。

---

## 🤖 对人形机器人学习的启发

- **"云仿真 + AR 众包"是互联网规模采集的可行路径**，绕开本地硬件；
- **公共数据库**对社区共享与基础模型训练意义重大；
- 对人形（硬件稀缺）尤其友好；
- 与 ARMADA（AR 无机器人采集）思路相通、规模更大。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2411.02214](https://arxiv.org/abs/2411.02214) | 论文正文（DART 平台、DexHub、用户研究） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·数据采集**：[ARMADA（AR 无机器人采集）](../ARMADA__Augmented_Reality_for_Robot_Manipulation_and_Robot-Free_Data_Acquisition/ARMADA__Augmented_Reality_for_Robot_Manipulation_and_Robot-Free_Data_Acquisition.html) · [TWIST2（本仓 07）](../../07_Teleoperation/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System/TWIST2__Scalable_Portable_and_Holistic_Humanoid_Data_Collection_System.html)。
