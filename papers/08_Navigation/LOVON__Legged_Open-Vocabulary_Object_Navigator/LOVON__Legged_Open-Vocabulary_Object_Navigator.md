---
layout: paper
paper_order: 16
title: "LOVON: Legged Open-Vocabulary Object Navigator"
zhname: "LOVON：足式机器人开放词汇目标导航器"
category: "Navigation"
---

# LOVON: Legged Open-Vocabulary Object Navigator
**用 LLM 做分层任务规划、用开放词汇视觉检测识别任意目标，并以拉普拉斯方差滤波稳像，构成一个可即插即用部署到 Go2 / B2 / H1-2 的长时程目标导航框架**

> 📅 阅读日期: 2026-06-24
>
> 🏷️ 板块: 08 Navigation · 开放词汇目标导航 · LLM 分层规划 · 长时程任务 · 跨本体部署
>
> 🔁 推进轨: 模块轮转（07_Teleoperation → **08_Navigation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2507.06747](https://arxiv.org/abs/2507.06747) |
| HTML | [arXiv HTML](https://arxiv.org/html/2507.06747) |
| PDF | [arXiv PDF](https://arxiv.org/pdf/2507.06747) |
| 项目主页 | [daojiepeng.github.io/LOVON](https://daojiepeng.github.io/LOVON/) |
| 源码 | [github.com/DaojiePENG/LOVON](https://github.com/DaojiePENG/LOVON) |
| 演示视频 | [Bilibili](https://www.bilibili.com/video/BV1xh3ezJEJn) |
| **发布时间** | 2025-07-09 (arXiv) |
| 机构 | **香港科技大学（广州）HKUST(GZ) / 北京人形机器人创新中心 / 香港科技大学 HKUST** |
| 主要作者 | **Daojie Peng**, Jiahang Cao, Qiang Zhang, Jun Ma |
| 机器人 | **Unitree Go2 / B2（四足）+ H1-2（人形）** |

---

## 🎯 一句话总结

> 开放世界里的「找东西并走过去」是一个长时程任务：既要能识别**任意自然语言指定**的目标（开放词汇），又要把「找 → 搜 → 接近 → 完成」拆成可执行的子动作（高层规划），还要扛住足式机器人行走时的**画面抖动、盲区、目标暂时丢失**等现实问题。LOVON 把 **LLM 分层规划** + **开放词汇视觉检测** + **拉普拉斯方差滤波稳像** + 一套**鲁棒执行逻辑**组合起来，做成一个**即插即用**、能在 Go2 / B2 / H1-2 上直接跑的目标导航框架。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| LLM | Large Language Model | 大语言模型，负责把长任务拆成有序基础指令 |
| Open-Vocabulary Detection | — | 开放词汇检测，无需预定义类别即可按自然语言识别目标 |
| L2MM | Language to Motion Model | 把语言指令映射到运动控制目标的模块 |
| Laplacian Variance Filtering | — | 拉普拉斯方差滤波，用于剔除运动模糊帧、视觉稳像 |
| Long-Horizon Task | — | 长时程任务，需要多步规划与持续执行 |

---

## ❓ 论文要解决什么问题？

传统目标导航方法难以同时满足三件事：

1. **开放世界检测**：现实目标千变万化，预定义类别根本覆盖不全；
2. **高层任务规划**：「去厨房拿那个红杯子」要拆成一连串可执行的搜索与移动动作；
3. **现实鲁棒性**：足式机器人边走边看，画面**抖动/模糊**，目标进**盲区**或**暂时消失**是常态。

以往工作往往把这几块割裂处理，导致**长程导航任务**容易中途失败。LOVON 想做一个把三者打通、且能直接换不同机器人就跑的统一框架。

---

## 🔧 方法详解

### 1. LLM 分层任务规划
用大语言模型把复杂的长时程导航任务**分解为有序的基础指令**（如「搜索目标 → 接近目标 → 到达确认」），形成高层任务流。

### 2. 开放词汇视觉检测
接入开放词汇检测模型，按**自然语言**识别任意目标，不依赖固定类别表，使框架能应对开放世界的新物体。

### 3. 语言到运动（L2MM）
把语言指令与检测结果转换为底层运动控制目标，驱动足式控制器朝目标移动，衔接「理解」与「行走」。

### 4. 鲁棒执行逻辑（针对现实退化）
- **拉普拉斯方差滤波**：用图像拉普拉斯响应的方差衡量清晰度，**丢弃运动模糊帧**，稳定视觉输入；
- **盲区 / 目标丢失处理**：当目标进入盲区或暂时消失时，触发搜索/重定位逻辑，保证任务可持续推进与稳健完成。

### 5. 跨本体即插即用
同一框架**无需重训核心逻辑**即可部署到 Go2、B2（四足）与 H1-2（人形），训练仅约 1.5 小时，体现强通用性与可移植性。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph IN["🗣️ 任务输入"]
        TASK["自然语言长任务<br/>「找到并走向某物体」"]
    end

    subgraph PLAN["🧠 LLM 分层规划"]
        DECOMP["任务分解<br/>搜索→接近→到达"]
    end

    subgraph PERCEPT["👁️ 开放词汇感知"]
        DET["开放词汇检测<br/>按语言识别任意目标"]
        LAP["拉普拉斯方差滤波<br/>剔除模糊帧稳像"]
    end

    subgraph CTRL["🦿 语言到运动 L2MM"]
        L2MM["指令+检测→运动目标"]
        ROBUST["盲区/目标丢失<br/>搜索与重定位"]
    end

    subgraph OUT["🤖 跨本体执行"]
        EXEC["Go2 / B2 / H1-2<br/>即插即用部署"]
    end

    TASK --> DECOMP --> L2MM
    LAP --> DET --> L2MM
    L2MM --> ROBUST --> EXEC
    EXEC -. 反馈观测 .-> DET

    style IN fill:#e8f4fd,stroke:#1f78b4
    style PLAN fill:#f3e8ff,stroke:#8e44ad
    style PERCEPT fill:#fff7e0,stroke:#d4a017
    style CTRL fill:#fde8f0,stroke:#c0399a
    style OUT fill:#e8f8e8,stroke:#27ae60
</div>

---

## 📊 实验与结果

- **长序列任务**：在实时检测、搜索与朝向**开放词汇动态目标**导航的长序列任务上成功完成，验证了分层规划 + 开放词汇检测的有效性。
- **现实退化鲁棒性**：拉普拉斯方差滤波显著缓解行走抖动带来的运动模糊；盲区/目标暂失时仍能恢复并完成任务。
- **跨机器人验证**：在 Unitree **Go2、B2、H1-2** 三种本体上均成功部署，展示出即插即用的兼容性；核心训练约 1.5 小时。

---

## 💡 核心贡献

1. **统一框架**：首次把 LLM 分层规划、开放词汇检测与足式运动控制整合到一个长时程目标导航系统中。
2. **现实鲁棒设计**：拉普拉斯方差滤波 + 盲区/目标丢失处理，专门针对足式行走的视觉退化场景。
3. **跨本体即插即用**：同一框架可直接迁移到四足与人形多种机器人，部署门槛低。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **开放世界导航** | 用开放词汇检测摆脱固定类别限制，让人形能「按一句话去找任意东西」 |
| **长时程任务** | LLM 分层规划把复杂任务拆成可执行子步骤，支撑长程自主作业 |
| **行走视觉退化** | 拉普拉斯方差滤波给「边走边看」的足式感知提供了简单有效的稳像思路 |
| **通用部署** | 一套框架通吃四足/人形，降低不同本体上的工程迁移成本 |

---

## 🎤 面试参考

**Q：为什么足式目标导航比轮式更难？**
A：足式机器人行走时机身周期性起伏，相机画面**抖动、运动模糊**严重，目标还频繁进盲区或暂时丢失。LOVON 用拉普拉斯方差滤波剔除模糊帧、用专门的搜索/重定位逻辑处理目标丢失，正是针对这些足式特有的视觉退化。

**Q：开放词汇检测在这里解决了什么？**
A：现实目标无法用固定类别穷举。开放词汇检测让系统能按自然语言识别**任意**目标，配合 LLM 把「去找某物」拆成有序子任务，才能真正支撑开放世界的长时程导航。

**Q：为什么强调「即插即用、跨本体」？**
A：框架把高层规划/感知与底层运动解耦，运动目标通过 L2MM 下发给不同控制器，因此核心逻辑无需重训即可在 Go2、B2、H1-2 上运行，迁移成本低。

---

## 🔗 相关阅读

- [LOVON arXiv](https://arxiv.org/abs/2507.06747) · [HTML](https://arxiv.org/html/2507.06747) · [PDF](https://arxiv.org/pdf/2507.06747) · [项目主页](https://daojiepeng.github.io/LOVON/) · [代码 DaojiePENG/LOVON](https://github.com/DaojiePENG/LOVON)
- 同模块对照：
  - [NaVILA](../NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation/NaVILA_Legged_Robot_Vision-Language-Action_Model_for_Navigation.html)（足式 VLA 导航模型）
  - [EgoActor](../EgoActor__Grounding_Task_Planning_into_Spatial-aware_Egocentric_Actions_for_Hum/EgoActor__Grounding_Task_Planning_into_Spatial-aware_Egocentric_Actions_for_Hum.html)（VLM 任务规划落地到第一视角动作）
  - [FocusNav](../FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local/FocusNav__Spatial_Selective_Attention_with_Waypoint_Guidance_for_Humanoid_Local.html)（路径点引导的局部导航）
- 方法线对照：LLM 分层规划 + 开放词汇检测，是「语言驱动开放世界导航」的代表工作
