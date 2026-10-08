---
layout: paper
title: "Unified Humanoid Fall-Safety Policy from a Few Demonstrations"
zhname: "从少量示范学习统一的人形跌落安全策略"
category: "Loco-Manipulation and WBC"
arxiv: "2511.07407"
---

# Unified Humanoid Fall-Safety Policy from a Few Demonstrations
**从少量示范学习统一的人形跌落安全策略**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 跌落安全 · 防摔+减损+起身统一 · 少量示范 · 扩散记忆 · G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.07407](https://arxiv.org/abs/2511.07407) · [PDF](https://arxiv.org/pdf/2511.07407) · [HTML](https://arxiv.org/html/2511.07407v1) |
| 作者 | Zhengjie Xu、Ye Li、Kwan-yee Lin、Stella X. Yu |
| 主题 | cs.RO · 跌落安全 / 少示范学习 / 扩散记忆 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 跌倒是人形移动的固有风险。维持平衡是控制与学习的首要安全焦点，但**没有方法能完全杜绝失衡**。当失稳真的发生时，已有工作只处理**孤立的一段**：要么**防摔**、要么**编排受控下降**、要么**摔后起身**——因此人形**缺乏整合的策略**来在真实跌倒**不按剧本**时做**减损与即时恢复**。本文要**超越"保持平衡"**，让**整个"跌倒-恢复"过程都安全且自主**：**能防则防、不可避免则减损、摔倒则起身**。通过**融合稀疏人类示范 + 强化学习 + 一个自适应的扩散式「安全反应记忆」**，学出**自适应全身行为**，把**防摔、减损、快速恢复统一进一个策略**。在仿真与真机 **Unitree G1** 上验证，具备稳健 sim-to-real、降低跌落冲击、并在多扰动场景下持续快速恢复。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Fall-Safety | 跌落安全，覆盖防摔/减损/起身全过程 |
| Few Demonstrations | 少量示范，稀疏人类演示 |
| Diffusion Memory | 扩散式记忆，存取安全反应模式 |
| Impact Mitigation | 冲击减损，降低落地受力 |
| Recovery | 恢复，摔后起身 |
| Unified Policy | 统一策略，一策略覆盖多阶段 |

---

## ❓ 论文要解决什么问题？

跌落安全此前被**割裂**处理：
- 防摔 / 受控下降 / 起身**各管一段**；
- 真实跌倒常**不按剧本**，缺乏**整合策略**做减损 + 即时恢复。

论文要：把**防摔 + 减损 + 快速恢复**统一进**一个自适应策略**，并能从**少量示范**学到。

---

## 🔧 方法详解

### 1. 三融合：稀疏示范 + RL + 扩散记忆
- **稀疏人类示范**：少量演示提供安全反应的先验；
- **强化学习**：在仿真中优化全身行为；
- **自适应扩散式「安全反应记忆」**：存取多样安全反应模式，按情境自适应调用。

### 2. 一个策略统一三阶段
学出的**自适应全身行为**把：
- **防摔**（能防则防）；
- **减损**（不可避免则软着陆/护件）；
- **快速恢复**（摔倒则起身）

**统一进同一策略**，覆盖整个跌倒-恢复过程。

### 3. 评测
- **仿真 + 真机 Unitree G1**；
- 稳健 **sim-to-real**、降低冲击、在**多样扰动**下**持续快速恢复**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    DEMO["🙋 稀疏人类示范"] --> POL
    MEM["🧠 自适应扩散安全记忆"] --> POL
    subgraph POL["🧠 统一跌落安全策略 (RL)"]
        P["防摔"]
        I["减损"]
        R["快速起身"]
    end
    POL --> OUT["🤖 Unitree G1<br/>整个跌倒-恢复过程安全自主"]

    style POL fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **统一跌落安全策略**：把防摔、减损、快速恢复整合进一个自适应策略；
2. **三融合学习**：稀疏示范 + RL + 自适应扩散安全记忆；
3. **少示范即可**：从少量演示学到鲁棒安全行为；
4. **真机验证**：Unitree G1 稳健 sim-to-real、降冲击、多扰动快速恢复。

---

## 🤖 对人形机器人学习的启发

- **"全过程"视角胜过"单点"**：把防摔/减损/起身一体化，更贴合真实不按剧本的跌倒；
- **扩散式记忆做"安全反应库"**是新颖思路，可按情境检索合适反应；
- **少示范 + RL**降低对大规模安全数据的依赖；
- **与 SafeFall、自保护跌落、Robot Crash Course、VIGOR 共同构成人形跌落安全研究簇**，本文强调"统一"。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.07407](https://arxiv.org/abs/2511.07407) | 论文正文（三融合、统一策略、G1 实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·跌落安全**：[SafeFall](../SafeFall__Learning_Protective_Control_for_Humanoid_Robots/SafeFall__Learning_Protective_Control_for_Humanoid_Robots.html) · [Robot Crash Course（软跌+可指定终姿）](../Robot_Crash_Course__Learning_Soft_and_Stylized_Falling/Robot_Crash_Course__Learning_Soft_and_Stylized_Falling.html) · [自保护跌落策略](../Discovering_Self-Protective_Falling_Policy_for_Humanoid_Robot_via_Deep_RL/Discovering_Self-Protective_Falling_Policy_for_Humanoid_Robot_via_Deep_RL.html) · [VIGOR](../VIGOR_Visual_Goal-In-Context_Inference_for_Unified_Humanoid_Fall_Safety/VIGOR_Visual_Goal-In-Context_Inference_for_Unified_Humanoid_Fall_Safety.html)。
