---
layout: paper
title: "ManiSkill-HAB: A Benchmark for Low-Level Manipulation in Home Rearrangement Tasks"
zhname: "ManiSkill-HAB：家居重排任务中低层操作的基准"
category: "Simulation Benchmark"
arxiv: "2412.13211"
---

# ManiSkill-HAB: A Benchmark for Low-Level Manipulation in Home Rearrangement Tasks
**ManiSkill-HAB：家居重排任务中低层操作的基准**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 家居重排 · 低层操作 · GPU 加速 · RL/IL 基线 · 演示生成
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2024 年 12 月 |
| arXiv | [2412.13211](https://arxiv.org/abs/2412.13211) · [PDF](https://arxiv.org/pdf/2412.13211) · [HTML](https://arxiv.org/html/2412.13211v1) |
| 作者 | Arth Shukla、Stone Tao、Hao Su（UC San Diego） |
| 主题 | cs.RO · 家居重排 / 低层操作 / GPU 加速仿真 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。

---

## 🎯 一句话总结

> 高质量基准是具身 AI 的基础，能推动**长时程导航、操作与重排**的进展。本文提出 **MS-HAB（ManiSkill-HAB）**：一个 **GPU 加速**的**家庭助理基准（Home Assistant Benchmark, HAB）**实现，提供**真实的低层控制**，相比此前"**魔法抓取（magical grasp）**"实现取得 **3 倍以上提速**且**显存更省**。作者训练了 **RL 与 IL 基线**，并开发一个**基于规则的轨迹过滤系统**，以**大规模**生成**可控的演示数据**。这把以往偏抽象/魔法抓取的家务重排基准，落到**真实低层操作**与**高效仿真**上。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| MS-HAB | ManiSkill-HAB，本文基准 |
| HAB | Home Assistant Benchmark，家庭助理基准 |
| Low-Level Control | 低层控制（真实物理操作，非魔法抓取） |
| Magical Grasp | 魔法抓取，抽象的瞬时抓取 |
| Trajectory Filtering | 轨迹过滤，筛选高质量演示 |
| RL / IL | 强化学习 / 模仿学习 |

---

## ❓ 论文要解决什么问题？

家务**重排**基准常用"**魔法抓取**"（抽象抓取），与真实**低层操作**脱节，且**仿真慢**：
- 缺**真实低层控制**的家居重排基准；
- 仿真**效率低**，难规模化训练/采集。

ManiSkill-HAB 要：一个 **GPU 加速、真实低层、可大规模生成演示**的家居重排基准。

---

## 🔧 方法详解

### 1. GPU 加速 + 真实低层控制
**MS-HAB** 在 ManiSkill 上实现 **HAB**，提供**真实低层控制**（非魔法抓取），相比旧实现**提速 3 倍以上**、**显存更省**。

### 2. RL / IL 基线
训练 **RL 与 IL 基线**，给出可比较的参考。

### 3. 规则化轨迹过滤生成演示
用**基于规则的轨迹过滤系统**，**大规模**生成**可控**的演示数据，支撑模仿学习。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    HAB["家庭助理基准(HAB)"] --> MS
    subgraph MS["MS-HAB"]
        G["GPU 加速 + 真实低层控制(>3x)"]
        B["RL/IL 基线"]
        F["规则轨迹过滤 → 大规模演示"]
    end
    MS --> OUT["📊 长时程导航/操作/重排<br/>高效仿真 + 可控演示"]

    style MS fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **真实低层家居重排基准**：取代魔法抓取，落到真实操作；
2. **GPU 加速 >3x、显存更省**：高效仿真；
3. **RL/IL 基线**：提供可比较参考；
4. **规则轨迹过滤大规模生成演示**：支撑模仿学习。

---

## 🤖 对人形机器人学习的启发

- **"真实低层 vs 魔法抓取"很关键**：抽象抓取会高估能力，真实操作才有迁移价值；
- **GPU 加速仿真**是规模化训练/采集的前提；
- **规则过滤生成可控演示**是低成本扩数据的实用手段；
- 虽以移动机械臂为主，重排/低层操作经验对人形家务同样适用。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2412.13211](https://arxiv.org/abs/2412.13211) | 论文正文（MS-HAB、基线、轨迹过滤） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；本基准以移动机械臂家居重排为主，因收录于上游而纳入；**数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·家居/重排基准**：[RoboCasa（日常任务大规模仿真）](../RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots/RoboCasa__Large-Scale_Simulation_of_Everyday_Tasks_for_Generalist_Robots.html) · [BiGym（演示驱动移动双手基准）](../BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark/BiGym__A_Demo-Driven_Mobile_Bi-Manual_Manipulation_Benchmark.html)。
