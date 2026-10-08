---
layout: paper
title: "Coordinated Humanoid Manipulation with Choice Policies"
zhname: "Coordinated Humanoid Manipulation：用「选择策略」做协调全身操作"
category: "Loco-Manipulation and WBC"
arxiv: "2512.25072"
---

# Coordinated Humanoid Manipulation with Choice Policies
**基于选择策略的人形协调操作**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 模块化遥操作 · 模仿学习 · 多模态 · 手眼协调 · 真机
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月 |
| arXiv | [2512.25072](https://arxiv.org/abs/2512.25072) · [PDF](https://arxiv.org/pdf/2512.25072) · [HTML](https://arxiv.org/html/2512.25072v1) |
| 作者 | Haozhi Qi、Yen-Jen Wang、Toru Lin、Brent Yi、Yi Ma、Koushil Sreenath、Jitendra Malik（UC Berkeley） |
| 主题 | cs.RO · 全身协调操作 / 遥操作 / 模仿学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形要在人类环境中干活，难点是**头、手、腿的全身协调**。本文把**模块化遥操作接口**与**可扩展学习框架**结合：遥操作设计把人形控制**分解为直观子模块**——**手眼协调、抓取基元、臂末端跟踪、行走**，从而**高效采集高质量演示**。在此之上提出 **Choice Policy**：一种**生成多个候选动作并学会给候选打分**的模仿学习方法——既**推理快**又能**建模多模态行为**。在两个真实任务（**洗碗机装载**、**擦白板的全身移动操作**）上，Choice Policy **显著优于扩散策略与标准行为克隆**；并发现**手眼协调**对**长时程任务**的成功**至关重要**。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Choice Policy | 生成多个候选动作并学习打分的策略 |
| Modular Teleop | 模块化遥操作，把控制分解为直观子模块 |
| Grasp Primitive | 抓取基元，可复用的抓取动作单元 |
| End-Effector Tracking | 末端执行器跟踪，臂末端位姿跟踪 |
| Hand-Eye Coordination | 手眼协调，视觉与手部动作的配合 |
| Multimodal Behavior | 多模态行为，同一情境下多种合理动作 |

---

## ❓ 论文要解决什么问题？

人形**全身协调**（头/手/腿）既难采数据又难学策略：
- **采集难**：整体遥操作一个高自由度人形，难得到高质量演示；
- **建模难**：操作行为常是**多模态**的（多种合理做法），单一回归/扩散各有取舍（扩散慢、BC 易塌缩到均值）。

论文要：一套**好采数据**的遥操作接口 + 一个**又快又能建多模态**的策略。

---

## 🔧 方法详解

### 1. 模块化遥操作接口
把人形控制**分解为直观子模块**：**手眼协调、抓取基元、臂末端跟踪、行走**。模块化让操作者更容易给出**高质量、可组合**的演示，提升数据效率。

### 2. Choice Policy：生成候选 + 学习打分
不直接回归单一动作，而是：
- **生成多个候选动作**；
- **学习一个打分器**对候选排序、择优执行。

这一架构同时获得**快速推理**（不像扩散需多步采样）与**多模态建模**（候选集天然覆盖多种行为），规避 BC 的均值塌缩与扩散的速度短板。

### 3. 评测
- **真实任务**：① **洗碗机装载**；② **擦白板**的全身 loco-manipulation；
- **对比**：显著优于**扩散策略**与**标准 BC**；
- **发现**：**手眼协调**对**长时程任务**成功**至关重要**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph TELE["🕹️ 模块化遥操作"]
        HE["手眼协调"]
        GP["抓取基元"]
        EE["臂末端跟踪"]
        LO["行走"]
    end
    TELE --> DEMO["高质量演示"]
    DEMO --> CP
    subgraph CP["🎯 Choice Policy"]
        GEN["生成多候选动作"]
        SC["学习打分择优"]
        GEN --> SC
    end
    CP --> OUT["🤖 洗碗机装载 / 擦白板<br/>优于 Diffusion & BC<br/>手眼协调对长时程关键"]

    style TELE fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style CP fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **模块化遥操作接口**：把人形控制拆成手眼/抓取/末端/行走子模块，高效采高质量演示；
2. **Choice Policy**：生成多候选 + 学打分，兼顾快推理与多模态建模；
3. **真机验证**：洗碗机装载、擦白板全身操作上显著超越扩散与 BC；
4. **关键发现**：手眼协调是长时程任务成功的要素。

---

## 🤖 对人形机器人学习的启发

- **「生成候选 + 打分」是 BC 与扩散之间的折中**：保住多模态又不牺牲速度，值得在实时操作里推广；
- **模块化遥操作提升数据质量**：把高自由度控制拆成直观子模块，是人形数据采集的实用工程经验；
- **手眼协调被实证为长时程关键**：提示全身操作策略应显式建模视觉-手部耦合；
- **与 HumanProcessing / 末端跟踪类工作呼应**：如 HiWET、Learning Humanoid End-Effector Control。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.25072](https://arxiv.org/abs/2512.25072) | 论文正文（模块化遥操作、Choice Policy、真机实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·全身操作 / 末端跟踪**：[HiWET（长时程世界系末端跟踪）](../HiWET__Hierarchical_World-Frame_End-Effector_Tracking_for_Long-Horizon_Humanoid_Loco-Manipulation/HiWET__Hierarchical_World-Frame_End-Effector_Tracking_for_Long-Horizon_Humanoid_Loco-Manipulation.html) · [Humanoid Manipulation Interface](../Humanoid_Manipulation_Interface__Humanoid_Whole-Body_Manipulation_from_Robot-Fre/Humanoid_Manipulation_Interface__Humanoid_Whole-Body_Manipulation_from_Robot-Fre.html)；
- **多模态策略**：本仓 06 操作板块中的扩散/流匹配策略工作。
