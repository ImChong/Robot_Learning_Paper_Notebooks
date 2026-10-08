---
layout: paper
paper_order: 2
title: "Characteristics, Management, and Utilization of Muscles in Musculoskeletal Humanoids: Empirical Study on Kengoro and Musashi"
zhname: "肌骨型人形机器人「肌肉」的特性、管理与利用：Kengoro 与 Musashi 上的实证研究"
category: "硬件设计"
---

# Characteristics, Management, and Utilization of Muscles in Musculoskeletal Humanoids
**肌骨型人形机器人肌肉的特性、管理与利用**

> 📅 阅读日期: 2026-05-23
>
> 🏷️ 板块: 12 Hardware Design · 肌骨型人形 / 仿生驱动 / 肌肉建模
>
> 🔁 推进轨: 模块轮转（11_Simulation_Benchmark → **12_Hardware_Design**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2602.08518](https://arxiv.org/abs/2602.08518) |
| HTML | [在线阅读](https://arxiv.org/html/2602.08518v1) |
| PDF | [下载](https://arxiv.org/pdf/2602.08518) |
| 期刊 | **Advanced Intelligent Systems**（Wiley, 2026） |
| **发布时间** | 2026-02-09 (arXiv) |
| 源码 | ⚠️ 截至当前未见配套代码仓库（综述/实证类文章，作者 [haraduka/GitHub](https://github.com/haraduka) 仅维护各子方向的独立工程） |
| 作者主页 | [haraduka.github.io](https://haraduka.github.io/) |
| 提交日期 | 2026-02 |

**作者**：Kento Kawaharazuka, Kei Okada, Masayuki Inaba

**机构**：**东京大学 JSK 机器人实验室**（人机模仿肌骨型人形长期研究组）

**研究对象**：两台肌骨型人形机器人 **Kengoro**（174 块"肌肉"）与 **Musashi**（74 块"肌肉" + 39 个关节，模块化平台）。

---

## 🎯 一句话总结

把 JSK 实验室十几年在 **腱-驱动肌骨型人形** 上的「设计 / 控制 / 学习」经验，浓缩成一篇「**特性 → 管理 → 利用**」的三段式实证综述：先把肌肉的五大固有特性（冗余 / 独立 / 各向异性 / 可变力臂 / 非线性弹性）讲清楚，再讲怎么用硬件模块把这些特性"管住"，最后讲怎么用反射 + 学习的方法把它们"用好"。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| DOF | Degree of Freedom | 自由度 |
| MCD / MM | Muscle Module | 集成「张力 / 长度 / 温度」传感的模块化肌肉单元 |
| SEA | Series Elastic Actuator | 串联弹性驱动器 |
| MAE | Musculoskeletal AutoEncoder | 作者前作：用自编码器学习「关节-肌肉」对应关系 |
| Dyneema | - | 超高分子量聚乙烯纤维，肌骨型人形最常用的"肌腱"线 |

---

## ❓ 论文要解决什么问题？

**肌骨型人形（musculoskeletal humanoid）** 用一根根仿生"肌肉"代替关节扭矩电机，结构上更接近人，理论上也更适合**柔顺接触 / 抗冲击 / 自重利用**。但这条技术路线长期被两类问题困住：

1. **特性散落**：「冗余」「独立」「各向异性」「可变力臂」「非线性弹性」这五大特性在不同论文里被零散讨论，从没人把它们摆在一张表上系统比较；
2. **难管、难用**：肌肉数量是关节的几倍，传统反向运动学和雅可比控制基本失效，还要面对**温度漂移 / 线断裂 / 长度估计不准**等工程现实问题。

本文用 JSK 两台代表性平台 **Kengoro & Musashi** 的多年实验数据回答：肌肉到底有什么本质特性？工程上靠什么模块去"管住"它？算法上靠什么策略去"用好"它？

---

## 🧬 肌肉的五大特性

| 特性 | 含义 | 给控制带来的麻烦 / 收益 |
|---|---|---|
| **Redundancy 冗余** | 肌肉数远多于关节 DOF；常组成拮抗对 | 麻烦：欠定；收益：抗损伤、可主动调刚度 |
| **Independency 独立** | 每根肌肉独立测张力 / 长度 / 温度，独立驱动 | 收益：分布式控制；麻烦：传感/线缆爆炸 |
| **Anisotropy 各向异性** | 同一肌肉拉向不同方向时输出力学特性不同 | 收益：仿生；麻烦：模型很难解析写出 |
| **Variable Moment Arm 可变力臂** | 关节角度变化时杠杆臂随之改变 | 麻烦：关节力矩不是肌肉张力的线性函数 |
| **Nonlinear Elasticity 非线性弹性** | 末端串联非线性弹性元件 | 收益：吸冲击；麻烦：长度→关节角度的关系非线性 |

> 📌 把这五条作为「肌骨型人形是什么」的标准答案：相比扭矩电机驱动的人形，肌骨型本质是「**多对一 + 弹性 + 各向异性**」的复杂动力学系统，工程和算法都得围绕这一点重写。

---

## 🛠 怎么"管"——硬件 + 传感模块

JSK 的肌肉模块（**Muscle Module**）做了三件事：

1. **三参量传感**：每条肌肉都集成 **张力 / 长度 / 温度** 传感；
2. **机械标准化**：肌肉绳（Dyneema 线）从张力测量单元出来，经过中继轮（pulley relay）改向，末端接一个**非线性弹性单元**；外裹海绵和弹簧做缓冲；
3. **结构模块化**：关节模块连接骨架，骨架上挂肌肉模块——整机可像乐高一样组合，这也是 **Musashi** 之所以能成为**学习类研究的标准平台**的原因。

> 📌 实际工程经验：肌肉是消耗品，会过热、会断裂；管住它就是把「**温度 / 张力 / 长度**」实时拿到手并允许**热插拔**。

---

## 🧠 怎么"用"——反射 + 学习

围绕五大特性，本文系统梳理了 JSK 多年来积累的控制 / 学习策略：

| 策略族 | 利用了哪个特性 | 代表做法 |
|---|---|---|
| **变刚度控制** | 冗余 + 非线性弹性 | 同时拉拮抗对，靠拮抗共激发改关节刚度 |
| **身体图式学习（Body Schema Learning）** | 冗余 + 可变力臂 | 用 MAE 等自编码器自动学习「肌肉→关节角」映射，可在线适配 |
| **反射式控制** | 独立 + 弹性 | 检测张力/碰撞→局部触发肌肉级动作，毫秒级响应 |
| **肌肉分组（Muscle Grouping）** | 冗余 + 独立 | 算法自动把高度相关的肌肉分组，简化高维控制 |
| **断裂鲁棒控制** | 冗余 | 一根/几根肌肉断了仍能继续完成动作 |
| **超关节速度极限** | 冗余 + 可变力臂 | 用拮抗腱组合突破单关节最大角速度（[arXiv 2502.12808](https://arxiv.org/abs/2502.12808)） |

这些方法之所以是「**反射 + 学习**」而不是「精确建模 + MPC」，正是因为五大特性使得**解析建模代价过高**——必须用数据驱动的近似 + 局部反射兜底。

---

## 🧭 整体框架（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PLAT["🤖 平台<br/>Kengoro / Musashi（JSK）"]
        K["Kengoro<br/>174 muscles<br/>人机模仿"]
        M["Musashi<br/>74 muscles · 39 joints<br/>模块化学习平台"]
    end

    subgraph CHAR["🧬 五大特性 Characteristics"]
        C1["Redundancy<br/>冗余"]
        C2["Independency<br/>独立"]
        C3["Anisotropy<br/>各向异性"]
        C4["Variable Moment Arm<br/>可变力臂"]
        C5["Nonlinear Elasticity<br/>非线性弹性"]
    end

    subgraph MGMT["🛠 管理 Management（硬件）"]
        H1["📏 Muscle Module<br/>张力 / 长度 / 温度 传感"]
        H2["🪢 Dyneema 腱 + Pulley Relay<br/>非线性弹性末端"]
        H3["🧱 模块化骨架<br/>可拆可换"]
    end

    subgraph UTIL["🧠 利用 Utilization（算法）"]
        U1["⚖️ 变刚度控制"]
        U2["🧠 身体图式学习<br/>MAE / 自适应"]
        U3["⚡ 反射控制<br/>张力/碰撞触发"]
        U4["🔗 肌肉分组"]
        U5["🛡 断裂鲁棒控制"]
        U6["🚀 超关节速度极限"]
    end

    PLAT --> CHAR
    CHAR --> MGMT
    CHAR --> UTIL
    MGMT -- "高质量观测" --> UTIL
    UTIL -- "需求反推硬件" --> MGMT

    style PLAT fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style CHAR fill:#fff7e0,stroke:#d4a017,color:#5a3d00
    style MGMT fill:#e8fbe8,stroke:#27ae60,color:#0f3d1e
    style UTIL fill:#f3e8ff,stroke:#8e44ad,color:#3d0f5a
</div>

---

## 💡 核心贡献

1. **首个"特性-管理-利用"三段式框架**：把肌骨型人形的**五大特性**系统化，给后续研究一张"地图"；
2. **跨平台实证**：在 Kengoro（174 肌）与 Musashi（74 肌）上长期实验，验证理论可在不同机型上复用；
3. **硬件方法论可复制**：Muscle Module 的「张力 / 长度 / 温度」三传感设计 + Dyneema + Pulley Relay 的机械方案，给同类平台提供了可直接借鉴的工程蓝图；
4. **学习/反射方法的系统综述**：把作者团队多年发表的 MAE、肌肉分组、断裂鲁棒、超速控制等独立工作串成一条主线。

---

## 📊 与"扭矩电机驱动人形"的对比

| 维度 | 扭矩电机人形（H1 / G1 / GR1） | **肌骨型人形（Kengoro / Musashi）** |
|---|---|---|
| 驱动方式 | 每关节 1 个高扭矩电机 | 多根「肌肉」拉绳 + 弹性末端 |
| 控制 DOF | 关节级 | 肌肉级（5–10×） |
| 接触柔顺 | 需虚拟阻抗 / SEA 加持 | **天然柔顺** |
| 抗损伤 | 关节坏=失能 | 部分肌肉断裂仍可工作 |
| 建模 | 刚体动力学清晰 | 高度非线性、需学习近似 |
| 行业落地 | ✅ 当前主流路线 | 🔬 学术 / 仿生研究为主 |

> 📌 肌骨型人形短期内难以取代扭矩电机平台跑工业任务，但在**接触密集 / 仿生研究 / 抗损伤场景**有独特价值——它是**「真把人体当机器人造一遍」**的那条路。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **仿生机器人** | 给"用肌肉造机器人"流派提供一份成熟工程参考 |
| **柔顺接触** | 反射 + 弹性带来的天然柔顺，是接触密集任务的另一条路径 |
| **数据驱动控制** | 因为难以解析建模，肌骨型平台天然适合 RL / 自监督学习 |
| **生物力学验证** | Kengoro 的 174 肌结构常被生物学家用于反推人体力学 |
| **冗余鲁棒性** | "几根肌肉断了不影响整体"对长时部署机器人是个理想属性 |

---

## 🎤 面试参考

**Q：肌骨型人形相比 Unitree H1 / GR1 这类扭矩电机驱动人形最大的优势是什么？**
A：**天然柔顺 + 抗损伤 + 仿生**。每个关节由多根弹性肌肉合作驱动，碰撞被弹性元件吸收；部分肌肉损坏后冗余仍可维持动作。代价是建模复杂、控制需要大量数据。

**Q：为什么作者要强调"五大特性"？**
A：因为这是肌骨型平台所有"难"与"妙"的根源。讲清这五点就讲清了为什么不能照搬扭矩电机的控制框架，必须重新做硬件传感模块 + 反射/学习算法。

**Q：肌肉里加"非线性弹性单元"的意义？**
A：模拟人体肌肉的力-长曲线非线性，吸收冲击 + 储存能量，但代价是**长度→关节角**不再是线性映射，需要在线学习。

**Q：为什么 Musashi 比 Kengoro 更适合做学习研究？**
A：Musashi 是**模块化平台**（74 肌、39 关节），肌肉单元可热插拔；Kengoro 走的是"极致仿人 174 肌"的科研验证机，工程上更难维护。Musashi 牺牲一点仿生度换来研究友好性。

**Q：肌骨型机器人能用 RL 训练吗？**
A：能，但要小心维度爆炸（肌肉级动作空间）。常见做法包括：肌肉分组（降维）、MAE 学习关节-肌肉映射做中间层、反射控制兜底安全性。

---

## 🔗 相关阅读 / 作者前作

- [Musashi 平台论文 (arXiv 2410.22000)](https://arxiv.org/abs/2410.22000)：模块化肌骨型人形平台
- [Musculoskeletal AutoEncoder (arXiv 2406.17134)](https://arxiv.org/abs/2406.17134)：用 AE 学肌肉-关节映射
- [Exceeding Joint Speed Limits via Redundant Tendons (arXiv 2502.12808)](https://arxiv.org/abs/2502.12808)：本仓库已收录待读，#434
- [Robust Continuous Motion Against Muscle Rupture (arXiv 2409.14951)](https://arxiv.org/abs/2409.14951)
- [Adaptive Body Schema Learning (arXiv 2411.06322)](https://arxiv.org/abs/2411.06322)
- [Human-Mimetic Humanoid (Science Robotics 2017)](https://www.science.org/doi/10.1126/scirobotics.aaq0899)：Kengoro 设计原典

---

> 备注：因 arXiv 全文与 Wiley AISY 期刊页对当前自动化抓取临时返回 403，本笔记基于 arXiv 元信息、作者主页（[haraduka.github.io](https://haraduka.github.io/)）、JSK 实验室公开材料及作者一系列前作（已在「相关阅读」列出）整理；五大特性分类与 Muscle Module 设计细节来自 JSK 多年发表的硬件论文。论文 PDF 释出后可补充：(1) 各特性的具体定量化指标；(2) Kengoro vs Musashi 在同一任务上的对照实验数值；(3) Wiley AISY 卷期 / DOI。
