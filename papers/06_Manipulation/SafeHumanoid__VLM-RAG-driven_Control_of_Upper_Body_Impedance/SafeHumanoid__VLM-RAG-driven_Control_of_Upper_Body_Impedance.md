---
layout: paper
paper_order: 11
title: "SafeHumanoid: VLM-RAG-driven Control of Upper Body Impedance for Humanoid Robot"
zhname: "SafeHumanoid：用 VLM-RAG 驱动人形上身阻抗控制"
category: "Manipulation"
arxiv: "2511.23300"
---

# SafeHumanoid: VLM-RAG-driven Control of Upper Body Impedance for Humanoid Robot
**SafeHumanoid：用 VLM-RAG 驱动人形上身阻抗控制**

> 📅 阅读日期: 2026-06-22
>
> 🏷️ 板块: Manipulation · 阻抗控制 · 人机协作安全 · VLM/RAG
>
> 🔁 推进轨: 模块轮转（05_Locomotion → **06_Manipulation**）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2511.23300](https://arxiv.org/abs/2511.23300) |
| HTML | [在线阅读](https://arxiv.org/html/2511.23300v1) |
| PDF | [下载](https://arxiv.org/pdf/2511.23300) |
| **发布时间** | 2025-11-28 (arXiv) |
| 源码 | 论文未公开代码 / 项目页 |
| 提交日期 | 2025-11 |

**机构**：Skoltech 智能空间机器人实验室（ISR Lab，Artem Lykov、Dzmitry Tsetserukou 等）

**机器人**：Unitree **G1** 人形（双臂各 14 关节，共 28 关节做阻抗控制）

---

## 🎯 一句话总结

SafeHumanoid 把「**怎么调阻抗**」这个低层控制问题，交给一个**第一视角 VLM + RAG 检索库**来回答：头部相机画面 → VLM 抽成结构化场景语义（任务、物体易碎性、是否有人、障碍等）→ 在 16 条**经安全标准验证**的模板库里做最近邻检索 → 取回每关节的刚度 Kp / 阻尼 Kd / 速度，下发给 50 Hz 的板载阻抗控制器。一旦画面里出现人手，机器人自动**降刚度、升阻尼、减速**，在不丢任务的前提下提升人机协作安全性。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| VLM | Vision-Language Model | 视觉语言模型，本文用 Molmo-7B 把画面转成结构化语义 |
| RAG | Retrieval-Augmented Generation | 检索增强生成，这里是「查模板库取参数」 |
| Impedance | Impedance Control | 阻抗控制，用刚度 Kp / 阻尼 Kd 调节交互柔顺度 |
| IK | Inverse Kinematics | 逆运动学，把 6-DoF 目标位姿解成关节参考角 |
| FAISS | Facebook AI Similarity Search | 向量近邻检索库，做语义模板匹配 |
| HRI | Human-Robot Interaction | 人机交互 |
| ISO/TS 15066 | — | 协作机器人人机协作安全技术规范 |

---

## ❓ 论文要解决什么问题？

人形机器人和人**共享同一工作空间**做桌面操作（擦桌、递物、倒液体）时，安全的核心矛盾是：

1. **刚度高 = 精度好但危险**：硬碰到人手会产生大的接触力。
2. **刚度低 = 安全但任务做不好**：太软抓不稳、对不准。
3. 传统做法的阻抗参数是**固定 / 手调**的，无法随「现在面前是不是有人、物体易不易碎」自动变化。

SafeHumanoid 的主张：**让语义来指挥阻抗**（"semantics guiding impedance control"）——机器人先「看懂」当前场景，再据此**在线调阻抗**，做到该硬的时候硬、该软的时候软。

---

## 🔧 方法拆解

整体是一个 **离板感知 + 板载控制** 的 C/S 架构，分四级流水线：

### 1. 第一视角感知（1–2 Hz）

- G1 头部 RealSense RGB-D 取第一视角画面，经 Wi-Fi（TCP/IP）传到离板服务器（RTX 4090）。

### 2. VLM 抽语义（Molmo-7B）

- 用一个**固定的、任务相关的提示词**约束输出，强制 VLM 返回 schema 合规的 JSON：
  任务类型、主物体、物体易碎性、是否有人、障碍数量/类型、工作区状态、手臂姿态、置信度。
- 关键点：提示词把输出**约束成确定性结构**，避免自由生成带来的不稳定。

### 3. RAG 两阶段检索

- **阶段一 检索**：结构化语义用 all-MiniLM-L6-v2 编成 384 维向量，FAISS 精确最近邻匹配到预存的场景嵌入。
- **阶段二 生成**：取回最匹配场景的载荷（每关节阻抗增益 + 标称速度），以标准 JSON/CSV 返回。
- **模板库**：仅 **16 条**人工验证场景，单个 CSV / 34 列；覆盖 pick(9)/handover(4)/other(3)，有人(7)/无人(9)。参数范围 Kp ∈ [10,60]、Kd ∈ [0.1,2.0]、3 档速度。每条都按 **ISO/TS 15066、ISO 13855** 实测过稳定性与合规性。
- **兜底**：两候选打分相近或置信度低于阈值时，回退到保守默认参数。

### 4. 关节级阻抗执行（50 Hz，板载 Jetson Orin NX）

- 阻抗律：`τ = Kp(q_ref − q) + Kd(q̇_ref − q̇) + τ_ff`，再经雅可比映射到末端力 `F = J(q)^{−T}τ`，因此调 Kp/Kd 直接调节交互力。
- IK：锁住腿/腰的简化模型上解 6-DoF 目标位姿，输出参考角 q_ref，并用 RNEA 算重力补偿前馈 τ_ff。
- **语义→阻抗的直觉映射**：易碎物体 → 低 Kp、高 Kd、慢速度；非易碎 → 更硬更快。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph PERC["👁️ 第一视角感知 (1-2 Hz)"]
        CAM["📷 G1 头部 RealSense<br/>RGB 帧"]
    end

    subgraph OFF["🖥️ 离板服务器 (RTX 4090)"]
        VLM["🧠 Molmo-7B VLM<br/>固定提示词 → 结构化 JSON<br/>任务/易碎性/有无人/障碍"]
        EMB["🔢 all-MiniLM-L6-v2<br/>编码 384 维向量"]
        FAISS["🔎 FAISS 最近邻检索<br/>16 条安全验证模板库"]
        PAY["📦 取回载荷<br/>每关节 Kp/Kd + 速度"]
    end

    subgraph ON["🤖 板载 Jetson Orin NX (50 Hz)"]
        IK["📐 逆运动学<br/>锁腿/腰 · RNEA 重力补偿"]
        IMP["🦾 阻抗控制器<br/>τ=Kp(Δq)+Kd(Δq̇)+τ_ff"]
        ARM["💪 G1 双臂 28 关节"]
    end

    CAM -->|Wi-Fi TCP/IP| VLM
    VLM --> EMB --> FAISS --> PAY
    PAY -->|Kp/Kd/v_ref| IMP
    PAY -->|目标位姿| IK
    IK -->|q_ref, τ_ff| IMP
    IMP --> ARM
    ARM -.->|有人在场→降Kp/升Kd/减速| CAM

    FAISS -.->|低置信/打分相近| FB["🛟 回退保守默认参数"]
    FB --> IMP

    style PERC fill:#fff7e0,stroke:#d4a017
    style OFF fill:#e8f4fd,stroke:#1f78b4
    style ON fill:#f3e8ff,stroke:#8e44ad
    style FB fill:#fde8e8,stroke:#c0392b
</div>

---

## 💡 核心贡献

1. **语义驱动阻抗的闭环系统**：第一个把「VLM 看场景 → RAG 取参数 → 关节阻抗」串成在线闭环、并跑在真 G1 上的工作。
2. **安全标准入库**：模板库里的每条阻抗配置都按 ISO/TS 15066、ISO 13855 实测验证，把「合规」前移到检索库设计阶段。
3. **结构化检索而非自由生成**：用固定提示词 + FAISS 最近邻，换来确定、可复现、可兜底的参数输出，规避 LLM 端到端生成控制量的不稳定。
4. **一定泛化能力**：库里没有的物体（如 pin 销钉）也能被 VLM-RAG 归到一个合适的柔顺配置。

---

## 📊 关键发现

| 维度 | 结论 |
|---|---|
| 有人在场 | 系统能自动降 Kp、升 Kd、减速，行为与语义一致 |
| 任务完成 | 擦桌/抓方块/取销钉/倒液体/递物等任务在加入安全调节后仍可完成 |
| 泛化 | 对库外物体（pin）能检索到合理的柔顺 profile |
| 主要短板 | 离板推理延迟最高 **1.4 s**，对高动态 HRI 不够用 |

> ⚠️ 论文以**定性表格（Table 1）** 呈现结果，未给成功率/接触力等定量指标；上表为结构化归纳。

---

## 🤖 对人形机器人领域的意义

| 方向 | 含义 |
|---|---|
| **人机协作安全** | 提供一条「语义 → 阻抗」的可落地路径，把安全标准嵌进控制参数选择 |
| **VLM 接低层控制** | 不让 LLM 直接吐扭矩，而是经检索库做中介，工程上更稳、更可控 |
| **模板库范式** | 用少量人工验证模板 + 近邻检索，权衡了「可解释/合规」与「自动化」 |
| **延迟瓶颈** | 也暴露了离板大模型 + 低频感知在动态 HRI 下的实时性天花板 |

---

## 🎤 面试参考

**Q：为什么不让 VLM/LLM 直接输出关节扭矩或阻抗增益？**
A：自由生成控制量不可复现、可能越界、难保证安全合规。SafeHumanoid 改成「VLM 只负责把画面抽成结构化语义，参数从一个**人工验证过、符合 ISO 标准**的模板库里检索」，既拿到语义自适应，又把控制量约束在安全集合内，还能在低置信时兜底。

**Q：阻抗为什么能提升安全？刚度/阻尼怎么对应到交互力？**
A：关节阻抗律 `τ = Kp(q_ref−q) + Kd(q̇_ref−q̇) + τ_ff`，经雅可比映射成末端力 `F = J^{−T}τ`。降低 Kp 让机器人「更软」，同样位移误差产生的接触力更小；提高 Kd 抑制速度、吸收冲击；再配合减速，碰到人手时的瞬时力被压低。

**Q：1.4 s 的延迟是什么造成的，怎么缓解？**
A：第一视角帧只有 1–2 Hz 上传、离板 Molmo-7B 推理 + 检索 + 回传都走 Wi-Fi。缓解方向：把 VLM 蒸馏/量化到板载、提高感知频率、用事件触发（只在场景变化时重查）、或在板载维护一个轻量预测器在两次检索间插值。

**Q：和 HumanoidVLM（同模块）有何异同？**
A：两者都用「视觉语言 + 阻抗」做接触丰富的人形操作。HumanoidVLM 偏向用 VLM 引导阻抗控制本身；SafeHumanoid 的差异点是引入 **RAG 检索一个安全标准验证过的模板库**，强调**人机协作安全合规**与确定性参数取回，而非端到端生成。

---

## 🔗 相关阅读

- [HumanoidVLM (2601.14874)](https://arxiv.org/abs/2601.14874)：同模块、视觉语言引导阻抗控制的接触丰富人形操作（笔记见本目录）
- [HumDex (2603.12260)](https://arxiv.org/abs/2603.12260)：人形灵巧操作数据采集，关注遥操作与手部重定向（笔记见本目录）
- ISO/TS 15066：协作机器人安全技术规范，本文模板库的合规依据
</content>
</invoke>
