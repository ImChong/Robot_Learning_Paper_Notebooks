---
layout: paper
title: "Humanoid Whole-Body Badminton via Multi-Stage Reinforcement Learning"
zhname: "多阶段强化学习实现人形全身羽毛球"
category: "Loco-Manipulation and WBC"
arxiv: "2511.11218"
---

# Humanoid Whole-Body Badminton via Multi-Stage Reinforcement Learning
**不用动作先验或专家示范，用三阶段课程（步法获取 → 精度引导挥拍生成 → 任务精修）训出协调步法与击球的统一全身控制器；部署时用 EKF 估计预测羽毛球轨迹做定点击球，并给出去掉 EKF 的免预测变体；仿真双机对打可连续 21 拍，真机出球速度达 19.1 m/s、平均回球落点 4 米**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 人形羽毛球 · 多阶段课程 · 动态物体交互 · EKF 预测 · 真机
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2025 年 11 月 |
| arXiv | [2511.11218](https://arxiv.org/abs/2511.11218) · [PDF](https://arxiv.org/pdf/2511.11218) · [HTML](https://arxiv.org/html/2511.11218v1) |
| 作者 | Chenhao Liu、Leyun Jiang、Yibo Wang、Kairan Yao、Jinchen Fu、Xiaoyu Ren |
| 主题 | cs.RO · 人形体育 / 动态物体交互 / 多阶段 RL |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 人形已能与**静态场景**交互（行走、操作），但**动态实时交互**仍难。作为迈向**快速运动物体交互**的一步，本文给出一条 RL 训练流水线，产出**人形羽毛球的统一全身控制器**，**协调步法与击球**，且**不用动作先验、不用专家示范**。训练遵循**三阶段课程**：① **步法获取**；② **精度引导的挥拍生成**；③ **任务聚焦精修**——使**腿与臂共同服务击球目标**。部署时用**扩展卡尔曼滤波（EKF）**估计并预测**羽毛球轨迹**实现定点击球；并开发一个**免预测变体**（去掉 EKF 与显式预测）。仿真中双机可连续对打 **21 拍**；真机**出球速度达 19.1 m/s**、**平均回球落点 4 米**；EKF 版与免预测版表现相当。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Whole-Body Badminton | 全身羽毛球，腿+臂协同击球 |
| Multi-Stage Curriculum | 多阶段课程，分步训练 |
| EKF | Extended Kalman Filter，扩展卡尔曼滤波 |
| Prediction-Free | 免预测，不显式预测球路的变体 |
| Footwork | 步法，移动到击球位 |
| Motion Prior | 动作先验，参考运动（本文不用） |

---

## ❓ 论文要解决什么问题？

人形与**快速运动物体**实时交互（如羽毛球）很难：
- 要**协调步法与击球**（腿臂同服务于打到球）；
- 既想**不依赖动作先验/示范**（难采、不泛化）；
- 还要**预测球路**做定点击球。

论文要：一个**统一全身控制器**，从零（无先验）学会打羽毛球并真机可用。

---

## 🔧 方法详解

### 1. 三阶段课程（无先验、无示范）
| 阶段 | 内容 |
|---|---|
| ① 步法获取 | 学会移动到击球位置 |
| ② 精度引导挥拍生成 | 学会朝目标精准挥拍 |
| ③ 任务聚焦精修 | 腿臂联合优化击球目标 |

课程让高自由度全身击球可学，且**不需动作捕捉先验或专家示范**。

### 2. 部署：EKF 球路预测 + 免预测变体
- **EKF**：估计并预测**羽毛球轨迹**，实现**定点击球**；
- **免预测变体**：去掉 EKF 与显式预测，简化系统；二者**表现相当**。

### 3. 结果
- **仿真**：双机连续对打 **21 拍**；
- **真机**：出球速度 **19.1 m/s**、平均回球落点 **4 米**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    subgraph CUR["三阶段课程（无先验/示范）"]
        F["①步法获取"]
        S["②精度引导挥拍"]
        R["③任务精修(腿臂联合)"]
        F --> S --> R
    end
    R --> CTRL["统一全身控制器"]
    EKF["EKF 球路预测<br/>(或免预测变体)"] --> CTRL
    CTRL --> OUT["🏸 仿真 21 连拍<br/>真机出球 19.1 m/s · 回球 4m"]

    style CUR fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **无先验/无示范的统一羽毛球全身控制器**：三阶段课程让腿臂协同服务击球；
2. **EKF 球路预测**实现定点击球，并给出**免预测变体**（表现相当）；
3. **动态快速物体交互**：从静态场景迈向高速运动物体；
4. **真机实测**：出球 19.1 m/s、回球落点 4m、仿真 21 连拍。

---

## 🤖 对人形机器人学习的启发

- **体育任务是动态交互的好试金石**：羽毛球要求步法+击球+预测三合一，区分度高；
- **课程学习可替代动作先验**：分阶段从零学复杂全身技能，减少对动捕的依赖；
- **「预测 vs 免预测表现相当」很有意思**：提示策略可隐式吸收球路规律；
- **与人形足球、拳击、网球等体育线互补**，共同推动高动态全身控制。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2511.11218](https://arxiv.org/abs/2511.11218) | 论文正文（三阶段课程、EKF、真机实验） |

> ℹ️ 备注：本笔记依据 arXiv 摘要整理；数值取自摘要，**细节以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·人形体育**：[Learning Human-Like Badminton Skills](../Learning_Human-Like_Badminton_Skills_for_Humanoid_Robots/Learning_Human-Like_Badminton_Skills_for_Humanoid_Robots.html) · [人形足球敏捷射门](../Learning_Agile_Striker_Skills_for_Humanoid_Soccer_Robots_from_Noisy_Sensory_Input/Learning_Agile_Striker_Skills_for_Humanoid_Soccer_Robots_from_Noisy_Sensory_Input.html) · [RoboStriker（拳击）](../RoboStriker__Hierarchical_Decision-Making_for_Autonomous_Humanoid_Boxing/RoboStriker__Hierarchical_Decision-Making_for_Autonomous_Humanoid_Boxing.html)。
