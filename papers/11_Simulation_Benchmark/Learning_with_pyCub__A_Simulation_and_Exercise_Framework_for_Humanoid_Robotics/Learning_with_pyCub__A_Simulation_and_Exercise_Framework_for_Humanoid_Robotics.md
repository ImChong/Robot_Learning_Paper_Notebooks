---
layout: paper
title: "Learning with pyCub: A Simulation and Exercise Framework for Humanoid Robotics"
zhname: "Learning with pyCub：人形机器人学的仿真与练习框架"
category: "Simulation Benchmark"
arxiv: "2506.01756"
---

# Learning with pyCub: A Simulation and Exercise Framework for Humanoid Robotics
**Learning with pyCub：人形机器人学的仿真与练习框架**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 11 Simulation & Benchmark · 教学仿真 · iCub · 纯 Python · 触觉皮肤 · 开源
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 6 月 |
| arXiv | [2506.01756](https://arxiv.org/abs/2506.01756) · [PDF](https://arxiv.org/pdf/2506.01756) · [HTML](https://arxiv.org/html/2506.01756v1) |
| 作者 | Lukas Rustler、Matej Hoffmann（捷克理工大学 CTU） |
| 代码 | 开源，含文档与 Docker 支持 |
| 主题 | cs.RO · 教学仿真 / iCub / 人形机器人学 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Simulation Benchmark 模块。

---

## 🎯 一句话总结

> pyCub 是一个**开源、基于物理**的 **iCub 人形仿真**，并配套**练习**用于教学生人形机器人学基础。相比已有 iCub 仿真器（iCub SIM、iCub Gazebo）需要 **C++ 代码与 YARP 中间件**，pyCub **无需 YARP**、用 **Python** 即可。它**完整仿真**了带全部关节的机器人，含**眼部双相机**与 iCub **独特的敏感皮肤**（体表 **4000 个感受器**）。练习从**速度/关节/笛卡尔空间**的基础控制，到**注视、抓取、反应式控制**等更复杂任务；整套用 **Python** 编写与控制，**即使编程基础很少**的人也能用，练习可**分级**到不同难度。作者在**两轮人形机器人课程**中验证了该框架。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| pyCub | 本文的 Python iCub 仿真框架 |
| iCub | 一款知名人形研究平台 |
| YARP | iCub 传统中间件（本文免去） |
| Cartesian Control | 笛卡尔空间控制 |
| Tactile Skin | 触觉皮肤（4000 感受器） |
| Exercise Framework | 练习框架，分级教学任务 |

---

## ❓ 论文要解决什么问题？

人形机器人学**教学门槛高**：
- 现有 iCub 仿真需 **C++ + YARP**，对学生不友好；
- 缺**纯 Python、低门槛**且涵盖触觉皮肤等特性的教学仿真与练习。

pyCub 要：一个**纯 Python、免 YARP、带分级练习**的 iCub 教学仿真框架。

---

## 🔧 方法详解

### 1. 纯 Python、免 YARP 的 iCub 物理仿真
**无需 YARP**、用 **Python** 控制，完整仿真带全部关节的 iCub，含**眼部双相机**与**敏感皮肤（4000 感受器）**。

### 2. 分级练习
练习覆盖：
- **基础**：速度/关节/笛卡尔空间控制；
- **进阶**：注视、抓取、反应式控制。

可**分级**到不同难度，适配不同水平学生。

### 3. 低门槛 + 课程验证
全 Python、**少编程基础也能用**；在**两轮人形机器人课程**中实测验证；**开源**含文档与 Docker。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    PY["🐍 纯 Python (免 YARP)"] --> SIM
    subgraph SIM["pyCub 仿真"]
        I["完整 iCub + 双相机 + 4000 感受器皮肤"]
    end
    SIM --> EX["分级练习<br/>控制→注视/抓取/反应式"]
    EX --> OUT["🎓 两轮课程验证<br/>低门槛 · 开源 + Docker"]

    style SIM fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **纯 Python、免 YARP 的 iCub 仿真**：大幅降低使用门槛；
2. **完整仿真含触觉皮肤**：双相机 + 4000 感受器，覆盖 iCub 特色；
3. **分级练习框架**：从基础控制到注视/抓取/反应式；
4. **教学验证 + 开源**：两轮课程实测，开源含 Docker。

---

## 🤖 对人形机器人学习的启发

- **降低教学/上手门槛**对扩大人形研究社区很重要；
- **触觉皮肤仿真**为接触/灵巧研究提供少见的教学资源；
- **纯 Python 生态**契合当下 RL/IL 工具链，利于教学到科研衔接；
- 与重型仿真（Isaac、MuJoCo）互补，定位"教学友好"。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2506.01756](https://arxiv.org/abs/2506.01756) | 论文正文（pyCub 框架、练习、课程验证） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·仿真平台**：[Humanoid World Models（人形世界模型）](../Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics/Humanoid_World_Models__Open_World_Foundation_Models_for_Humanoid_Robotics.html) · 本仓 11 其它仿真/基准工作。
