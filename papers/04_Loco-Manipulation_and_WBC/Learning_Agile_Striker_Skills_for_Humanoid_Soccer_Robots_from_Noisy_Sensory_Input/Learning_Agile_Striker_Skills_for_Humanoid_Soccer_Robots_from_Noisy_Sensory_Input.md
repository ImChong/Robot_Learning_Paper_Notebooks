---
layout: paper
title: "Learning Agile Striker Skills for Humanoid Soccer Robots from Noisy Sensory Input"
zhname: "从含噪感知学习人形足球机器人的敏捷射门技能"
category: "Loco-Manipulation and WBC"
arxiv: "2512.06571"
---

# Learning Agile Striker Skills for Humanoid Soccer Robots from Noisy Sensory Input
**从含噪感知学习人形足球机器人的敏捷射门技能**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 人形足球 · 射门技能 · 教师-学生 · 含噪感知 · 约束 RL · 真机
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 12 月 |
| arXiv | [2512.06571](https://arxiv.org/abs/2512.06571) · [PDF](https://arxiv.org/pdf/2512.06571) · [HTML](https://arxiv.org/html/2512.06571v1) |
| 作者 | Zifan Xu、Myoungkyu Seo、Dongmyeong Lee、Hao Fu、Jiaheng Hu、Jiaxun Cui、Yuqian Jiang 等（UT Austin，Peter Stone 组） |
| 主题 | cs.RO · 人形足球 / 敏捷踢球 / 视觉运动技能 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 学**又快又稳的踢球技能**是人形足球机器人的核心能力，但很难：需要**快速摆腿**、**单脚支撑下的姿态稳定**，还要在**含噪感知**与**外部扰动（如对手）**下鲁棒。本文用**四阶段训练流水线**：① **长距离追球**（教师，用真值）；② **定向踢球**（教师，用真值）；③ **教师蒸馏**给只用**含噪感知**的学生；④ **学生自适应/精修**（约束 RL）。配合**真实噪声建模**与**定制奖励**，系统在**多样球-门配置**下取得**强射门精度与进球成功率**，并成功**真机部署**，为全身控制中的视觉运动技能学习树立基准。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Striker Skill | 射门/踢球技能 |
| Teacher-Student | 教师-学生，教师用特权/真值，学生用真实观测蒸馏 |
| Noisy Sensing | 含噪感知，真实传感的噪声输入 |
| Constrained RL | 约束强化学习，带约束的策略优化 |
| Single Support | 单脚支撑，踢球时一脚支撑的稳定挑战 |
| Distillation | 蒸馏，把教师策略压进学生 |

---

## ❓ 论文要解决什么问题？

人形踢球同时要：
- **快速摆腿**产生球速；
- **单脚支撑下保持姿态稳定**；
- 在**含噪感知**与**对手扰动**下仍鲁棒。

直接用含噪观测端到端学很难收敛，纯真值训练又无法部署。论文要：一套能把「真值教师的本领」迁到「含噪感知学生」并真机可用的训练配方。

---

## 🔧 方法详解

### 1. 四阶段教师-学生流水线
| 阶段 | 内容 |
|---|---|
| ① 长距离追球（教师） | 用真值训练把球追到可踢位置 |
| ② 定向踢球（教师） | 用真值训练朝目标方向踢 |
| ③ 蒸馏到学生 | 把教师能力蒸馏给**只用含噪感知**的学生 |
| ④ 学生自适应/精修 | 用**约束 RL** 做适应与细化，提升鲁棒 |

### 2. 真实噪声建模 + 定制奖励
显式**建模真实传感噪声**并设计**针对性奖励**，让学生在贴近真实的观测下学到鲁棒技能。

### 3. 评测
- **多样球-门配置**下的踢球精度与进球成功率；
- **仿真 + 真机**；
- 消融验证**约束 RL、噪声建模、适应阶段**各自的贡献。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph TEACH["教师（真值）"]
        C["①长距离追球"]
        K["②定向踢球"]
    end
    TEACH --> DIST["③蒸馏到含噪感知学生"]
    DIST --> ADAPT["④约束 RL 自适应/精修"]
    ADAPT --> OUT["⚽ 多样球-门配置高精度<br/>真机部署"]

    style TEACH fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **四阶段教师-学生流水线**：追球/踢球教师 → 含噪感知学生 → 约束 RL 精修；
2. **含噪感知鲁棒**：真实噪声建模 + 定制奖励，弥合真值训练与真机部署；
3. **真机敏捷踢球**：多样球-门配置下高精度、可进球；
4. **方法基准**：为全身控制中的视觉运动技能学习提供参考。

---

## 🤖 对人形机器人学习的启发

- **教师-学生 + 含噪建模**是「特权训练→真机部署」的经典而有效配方；
- **运动技能（踢球）= 敏捷 + 稳定 + 感知鲁棒三难并存**，是检验全身控制的好任务；
- **约束 RL 做学生精修**有助于在保持安全/稳定约束下提升性能；
- **与人形球类运动线（羽毛球、拳击、足球门将）** 互为补充，体育任务正成为高动态全身控制的试金石。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2512.06571](https://arxiv.org/abs/2512.06571) | 论文正文（四阶段流水线、噪声建模、真机实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；**逐项数值以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人形体育/运动技能**：[Learning Human-Like Badminton Skills](../Learning_Human-Like_Badminton_Skills_for_Humanoid_Robots/Learning_Human-Like_Badminton_Skills_for_Humanoid_Robots.html) · [RoboStriker（自主拳击分层决策）](../RoboStriker__Hierarchical_Decision-Making_for_Autonomous_Humanoid_Boxing/RoboStriker__Hierarchical_Decision-Making_for_Autonomous_Humanoid_Boxing.html)；
- **含噪感知 / 教师-学生**：经典特权蒸馏 sim-to-real 范式。
