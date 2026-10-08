---
layout: paper
title: "HMC: Learning Heterogeneous Meta-Control for Contact-Rich Loco-Manipulation"
zhname: "HMC：面向接触丰富移动操作的异构元控制学习"
category: "Loco-Manipulation and WBC"
arxiv: "2511.14756"
---

# HMC: Learning Heterogeneous Meta-Control for Contact-Rich Loco-Manipulation
**HMC：面向接触丰富移动操作的异构元控制学习**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 接触丰富 · 异构控制 · 阻抗/力-位 · MoE 路由 · 真机
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.14756](https://arxiv.org/abs/2511.14756) · [PDF](https://arxiv.org/pdf/2511.14756) · [HTML](https://arxiv.org/html/2511.14756v1) |
| 作者 | Lai Wei、Xuanbin Peng、Ri-Zhao Qiu、Tianshu Huang、Xuxin Cheng、Xiaolong Wang（UC San Diego 等） |
| 主题 | cs.RO · 接触丰富操作 / 异构控制 / 模仿学习 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 从真实机器人演示学习有望应对复杂环境，但交互动力学**复杂多变**，**纯位置控制器**在**接触**或**变负载**时常**力不从心**。HMC（**Heterogeneous Meta-Control**）提出一个 loco-manip 框架，**自适应地拼接多种控制模态**：**位置、阻抗、力-位混合**。它包含两部分：① **HMC-Controller 接口**——在**力矩空间**把不同**控制档（control profiles）**的动作**混合**，同时服务**遥操作**与**策略部署**；② **HMC-Policy 架构**——用**专家混合（MoE）式路由**把异构控制器**统一**起来。在**擦桌、开抽屉**等接触丰富真机任务上，相对基线取得**超过 50% 的相对提升**，展示了对**力感知**控制的有效性。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Meta-Control | 元控制，调度/拼接多种底层控制模态 |
| Position / Impedance / Force-Position | 位置 / 阻抗 / 力-位混合控制 |
| Control Profile | 控制档，一组控制模态/参数 |
| Torque Space | 力矩空间，在关节力矩层面混合 |
| MoE Routing | 专家混合路由，按情境选择/混合专家 |
| Contact-Rich | 接触丰富，频繁/复杂接触的任务 |

---

## ❓ 论文要解决什么问题？

接触丰富的 loco-manip 里：
- **纯位置控制**遇**接触/变负载**易**僵硬、失稳或发不出力**；
- 单一控制模态难覆盖**多变交互动力学**。

HMC 要：让策略**按情境自适应地用不同控制模态**（位置/阻抗/力-位），并能同时支持遥操作采集与策略部署。

---

## 🔧 方法详解

### 1. HMC-Controller：力矩空间混合控制档
在**力矩空间**把**位置、阻抗、力-位混合**等不同**控制档**的输出**混合**成最终指令。这个接口**同时服务**：
- **遥操作**（人采集接触丰富演示）；
- **策略部署**（学到的策略输出可被同一接口执行）。

### 2. HMC-Policy：MoE 路由统一异构控制器
用**专家混合式路由**把**异构控制器**统一进一个策略：按当前情境**选择/混合**合适的控制模态，实现自适应。

### 3. 评测
- **真机**接触丰富任务：**柔顺擦桌**、**开抽屉**；
- 相对基线**>50% 相对提升**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OBS["👀 观测/演示"] --> POL
    subgraph POL["🧠 HMC-Policy (MoE 路由)"]
        R["按情境选择/混合控制模态"]
    end
    POL --> CTRL
    subgraph CTRL["🎛️ HMC-Controller (力矩空间混合)"]
        P["位置"]
        I["阻抗"]
        F["力-位混合"]
    end
    CTRL --> OUT["🤖 擦桌 / 开抽屉<br/>相对基线 >50% 提升"]

    style POL fill:#f7e8fd,stroke:#9b59b6,color:#4a1c5d
    style CTRL fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **异构元控制框架 HMC**：自适应拼接位置/阻抗/力-位多模态；
2. **HMC-Controller**：力矩空间混合控制档，统一服务遥操作与策略部署；
3. **HMC-Policy**：MoE 路由统一异构控制器；
4. **接触丰富真机提升**：擦桌、开抽屉相对基线 >50%。

---

## 🤖 对人形机器人学习的启发

- **单一控制模态难通吃接触任务**：把位置/阻抗/力-位作为可调度资源是务实方向；
- **遥操作与部署共用同一控制接口**很关键：保证采集分布与执行分布一致；
- **MoE 路由统一异构控制器**是优雅的抽象，可迁移到更多模态/任务；
- **与 CHIP、力自适应控制等柔顺/力工作同向**，共同攻克接触丰富操作。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.14756](https://arxiv.org/abs/2511.14756) | 论文正文（HMC-Controller / HMC-Policy、接触任务实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值（>50%）取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·柔顺/力/接触**：[CHIP（事后扰动可控柔顺）](../CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation/CHIP__Adaptive_Compliance_for_Humanoid_Control_through_Hindsight_Perturbation.html) · [面向力交互的多策略 RL](../Kinematics-Aware_Multi-Policy_RL_for_Force-Capable_Humanoid_Loco-Manipulation/Kinematics-Aware_Multi-Policy_RL_for_Force-Capable_Humanoid_Loco-Manipulation.html)。
