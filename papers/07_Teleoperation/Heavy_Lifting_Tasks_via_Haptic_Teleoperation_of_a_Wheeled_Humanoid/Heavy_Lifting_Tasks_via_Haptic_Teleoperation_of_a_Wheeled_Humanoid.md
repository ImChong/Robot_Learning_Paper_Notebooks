---
layout: paper
title: "Heavy lifting tasks via haptic teleoperation of a wheeled humanoid"
zhname: "通过力触觉遥操作让轮式人形完成重物搬运"
category: "Teleoperation"
arxiv: "2505.19530"
---

# Heavy lifting tasks via haptic teleoperation of a wheeled humanoid
**面向「动态移动操作（DMM）」——同时控制行走、操作与姿态以搬运重物——的力触觉遥操作框架：人机接口把人体动作重定向到可调高度的轮式人形并施加力反馈；操作者用身体姿态调节机器人姿态与移动、用手臂引导操作，实时反馈末端力旋量与平衡线索；并比较不同遥行走映射的平衡辅助程度，在抬举至多 2.5 kg（21% 自重）的杠铃/箱子上验证协调全身控制与抗扰**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 07 Teleoperation · 力触觉反馈 · 动态移动操作 · 轮式人形 · 重物搬运 · 平衡辅助
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 5 月 |
| arXiv | [2505.19530](https://arxiv.org/abs/2505.19530) · [PDF](https://arxiv.org/pdf/2505.19530) · [HTML](https://arxiv.org/html/2505.19530v1) |
| 作者 | Amartya Purushottam、Jack Yan、Christopher Yu、Joao Ramos（UIUC） |
| 主题 | cs.RO · 力触觉遥操作 / 动态移动操作 / 轮式人形 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Teleoperation 模块。

---

## 🎯 一句话总结

> 人形可在体力要求高的环境里支援人类，做需要**全身协调**的任务（抬运重物）。本文称之为**动态移动操作（Dynamic Mobile Manipulation, DMM）**——需要在**动态交互力**下**同时控制行走、操作与姿态**。论文提出在**可调高度的轮式人形**上做 DMM 的**遥操作框架**：一个**人机接口（HMI）**通过捕捉人体动作并施加**力触觉反馈**，把人体动作**全身重定向**到机器人。操作者用**身体姿态**调节机器人**姿态与移动**、用**手臂**引导**操作**；**实时力反馈**传递**末端力旋量**与**平衡线索**，闭合"人感知 ↔ 机器人环境交互"的回路。论文还比较了提供不同**平衡辅助**程度的**遥行走映射**，让操作者**手动或自动**调节机器人对**负载扰动**的倾斜。最终在抬举至多 **2.5 kg（机器人质量 21%）**的杠铃/箱子实验中验证了协调全身控制、变高度与抗扰。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| DMM | Dynamic Mobile Manipulation，动态移动操作 |
| HMI | Human-Machine Interface，人机接口 |
| Haptic Feedback | 力触觉反馈 |
| Wrench | 力旋量（力 + 力矩） |
| Telelocomotion | 遥行走，远程控制机器人行走 |
| Balance Assistance | 平衡辅助，帮助操作者维持机器人平衡 |

---

## ❓ 论文要解决什么问题？

搬重物的**动态移动操作**要**同时**控制行走、操作、姿态，且面对**负载扰动**：
- 纯自主难、纯手动遥操作又难维持平衡；
- 操作者需要**感知**末端力与平衡状态才能稳。

论文要：一套**带力触觉反馈、可调平衡辅助**的轮式人形遥操作框架。

---

## 🔧 方法详解

### 1. HMI 全身重定向 + 力反馈
**人机接口**捕捉人体动作、施加**力触觉反馈**，把动作**全身重定向**到可调高度轮式人形。

### 2. 身体管姿态/移动、手臂管操作
- **身体姿态** → 调节机器人**姿态与移动（telelocomotion）**；
- **手臂动作** → 引导**操作**。

### 3. 实时力反馈闭环
反馈**末端力旋量**与**平衡线索**，让操作者"感受到"机器人与环境的交互，闭合感知-动作回路。

### 4. 可调平衡辅助 + 评测
比较不同**遥行走映射**（手动/自动调节机器人倾斜以抵抗负载扰动）；在抬举至多 **2.5 kg（21% 自重）**杠铃/箱子上验证协调全身控制、变高度与抗扰。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    PILOT["🧑‍✈️ 操作者<br/>身体→姿态/移动, 手臂→操作"] --> HMI
    subgraph HMI["HMI(力触觉反馈)"]
        RT["全身重定向"]
        FB["末端力旋量 + 平衡线索反馈"]
    end
    HMI --> BAL["可调平衡辅助<br/>(手动/自动调倾斜)"]
    BAL --> OUT["🤖 轮式人形抬 ≤2.5kg(21%自重)<br/>协调全身控制 + 抗扰"]

    style HMI fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **DMM 遥操作框架**：力触觉 HMI 把人体动作全身重定向到轮式人形；
2. **分工映射**：身体管姿态/移动、手臂管操作；
3. **实时力旋量 + 平衡反馈**：闭合感知-交互回路；
4. **可调平衡辅助**：手动/自动抗负载扰动，2.5 kg（21% 自重）重物验证。

---

## 🤖 对人形机器人学习的启发

- **力触觉反馈是重载遥操作的关键**：让操作者"感受到"负载与平衡才能稳；
- **平衡辅助可调**兼顾操作者掌控与系统稳定；
- **轮式人形**在重载移动操作上是务实平台（与同组的物体参数估计工作互补）；
- DMM 的"同时控行走+操作+姿态"是全身控制的硬命题。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2505.19530](https://arxiv.org/abs/2505.19530) | 论文正文（HMI、力反馈、平衡辅助、重物实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·轮式/重载遥操作**：[Whole-Body Bilateral Teleop（多阶段物体参数估计）](../Whole-Body_Bilateral_Teleoperation_with_Multi-Stage_Object_Parameter_Estimation/Whole-Body_Bilateral_Teleoperation_with_Multi-Stage_Object_Parameter_Estimation.html)；
- **负载搬运**：[SplitAdapter](../../04_Loco-Manipulation_and_WBC/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation/SplitAdapter__Load-Aware_Humanoid_Loco-Manipulation_via_Factorized_Adaptation.html)。
