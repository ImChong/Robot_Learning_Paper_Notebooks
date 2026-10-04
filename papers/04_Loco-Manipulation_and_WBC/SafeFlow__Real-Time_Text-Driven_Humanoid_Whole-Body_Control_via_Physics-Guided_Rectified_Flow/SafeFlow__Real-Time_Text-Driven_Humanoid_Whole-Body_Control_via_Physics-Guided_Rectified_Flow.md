---
layout: paper
title: "SafeFlow: Real-Time Text-Driven Humanoid Whole-Body Control via Physics-Guided Rectified Flow and Selective Safety Gating"
zhname: "SafeFlow：物理引导整流流与安全门控的实时文本驱动人形全身控制"
category: "Loco-Manipulation and WBC"
arxiv: "2603.23983"
---

# SafeFlow: Real-Time Text-Driven Humanoid Whole-Body Control via Physics-Guided Rectified Flow and Selective Safety Gating
**文本驱动的人形全身控制框架：高层在 VAE 隐空间用「物理引导整流流」生成可被真机执行的运动、再用 Reflow 减少函数评估次数做到实时；外加「三段式安全门」——文本嵌入空间 Mahalanobis 分数识别语义 OOD、方向敏感度差异过滤不稳定生成、最后强制关节/速度等硬运动学约束，再交给低层跟踪器**

> 📅 阅读日期: 2026-06-21
>
> 🏷️ 板块: 04 Loco-Manipulation / WBC · 文本驱动 · 整流流 / Rectified Flow · 安全门控 · OOD 检测 · Unitree G1
>
> 🔁 推进轨: 模块轮转补全（与上游 awesome-humanoid-robot-learning 对齐）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 3 月 |
| arXiv | [2603.23983](https://arxiv.org/abs/2603.23983) · [PDF](https://arxiv.org/pdf/2603.23983) · [HTML](https://arxiv.org/html/2603.23983v1) |
| 项目页 | [hanbyelcho.info/safeflow](https://hanbyelcho.info/safeflow/) |
| 作者 | Hanbyel Cho、Sang-Hun Kim、Jeonguk Kang、Donghan Koo |
| 主题 | cs.RO · 文本驱动全身控制 / 生成式运动 / 安全部署 |

> 来源：YanjieZe/awesome-humanoid-robot-learning · Loco-Manipulation and Whole-Body-Control 模块。

---

## 🎯 一句话总结

> 实时**文本驱动**的运动生成能让人形做各种动作，但「**只管运动学**」的生成器常出现**物理幻觉**：生成的轨迹**下游跟踪器追不动**、或对真机**不安全**，在**分布外（OOD）文本**输入下更糟。SafeFlow 把**物理引导的生成**与**显式风险指标驱动的三段式安全门**结合：**高层**在 **VAE 隐空间**用 **Physics-Guided Rectified Flow Matching** 生成「真机可执行」的轨迹，并用 **Reflow** 降低函数评估次数（NFE）以满足**实时**；**三段式安全门**做**选择性执行**——① 用**文本嵌入空间的 Mahalanobis 分数**检测语义 OOD 提示，② 用**方向敏感度差异（directional sensitivity discrepancy）**过滤不稳定生成，③ 在交给低层跟踪器前**强制关节/速度等硬运动学约束**。在 **Unitree G1** 上，SafeFlow 在**成功率、物理合规性、推理速度**上均优于既有扩散方法，同时保持动作多样性。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Rectified Flow | 整流流，一种用近似直线概率路径加速采样的生成模型 |
| Reflow | 对整流流再拉直，进一步减少采样步数（NFE） |
| NFE | Number of Function Evaluations，采样所需网络前向次数，越少越快 |
| VAE Latent | 变分自编码器隐空间，在低维隐变量上做生成 |
| OOD | Out-of-Distribution，分布外（此处指语义异常的文本提示） |
| Mahalanobis Score | 马氏距离分数，衡量样本相对分布的异常程度 |
| Safety Gate | 安全门，对生成结果按风险指标做选择性放行 |

---

## ❓ 论文要解决什么问题？

文本驱动的实时运动生成虽强，但**只管运动学**的生成器有两类隐患：

- **物理幻觉**：生成的轨迹**物理上不可被下游跟踪器执行**，或对真机**不安全**；
- **缺乏面向真机执行的物理目标**，并且在**OOD 文本输入**下失败更严重。

SafeFlow 想要：**既要文本驱动的多样表达，又要真机可执行与安全**——通过把**物理引导生成**与**显式风险门控**结合，做到「该执行的执行、该拦的拦下」。

---

## 🔧 方法详解

SafeFlow 是**两级架构**：高层负责「生成真机可执行轨迹」，安全门负责「选择性放行」。

### 1. 高层：物理引导整流流 + Reflow 实时化
- 在 **VAE 隐空间**用 **Physics-Guided Rectified Flow Matching** 生成运动轨迹，把「真机可执行性」作为物理引导注入生成；
- 用 **Reflow** 把概率路径进一步拉直，**降低 NFE**，从而满足**实时控制**所需的采样速度。

### 2. 三段式安全门（Selective Safety Gating）
按**显式风险指标**对生成做**选择性执行**：
| 阶段 | 机制 | 作用 |
|---|---|---|
| ① 语义 OOD 检测 | 文本嵌入空间 **Mahalanobis 分数** | 拦截语义异常/越界的提示 |
| ② 稳定性过滤 | **方向敏感度差异**指标 | 过滤不稳定/易发散的生成 |
| ③ 硬约束 | **关节 / 速度限制**等运动学约束 | 放行前强制满足物理硬边界 |

通过三段筛查，才把轨迹交给**低层运动跟踪控制器**执行。

### 3. 评测
- **平台**：**Unitree G1** 人形机器人；
- **对比**：优于既有**扩散类**方法；
- **指标**：**成功率、物理合规性、推理速度**均更好，且**保持动作多样表达**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    T["📝 文本提示"] --> HI
    subgraph HI["高层：物理引导整流流"]
        RF["VAE 隐空间 Rectified Flow Matching<br/>（物理引导可执行性）"]
        RFL["Reflow 降 NFE → 实时"]
        RF --> RFL
    end
    RFL --> GATE
    subgraph GATE["三段式安全门"]
        G1["① Mahalanobis 语义 OOD 检测"]
        G2["② 方向敏感度差异过滤"]
        G3["③ 关节/速度硬约束"]
        G1 --> G2 --> G3
    end
    GATE --> LL["⚙️ 低层运动跟踪器"]
    LL --> OUT["🤖 Unitree G1：成功率↑ 合规↑ 速度↑"]

    style HI fill:#fff4e6,stroke:#e67e22,color:#7d3c08
    style GATE fill:#eef7ee,stroke:#27ae60,color:#0f3d1e
    style OUT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 💡 核心贡献

1. **物理引导整流流生成**：在 VAE 隐空间生成「真机可执行」轨迹，并用 Reflow 降 NFE 实现实时；
2. **三段式选择性安全门**：语义 OOD（Mahalanobis）→ 稳定性（方向敏感度差异）→ 硬运动学约束，逐级把关；
3. **抗 OOD 部署**：显式风险指标专门应对分布外文本输入导致的失败；
4. **真机实测领先**：Unitree G1 上成功率、物理合规、推理速度均超扩散基线，且保持多样性。

---

## 🤖 对人形机器人学习的启发

- **「生成 + 门控」是文本驱动控制走向真机的务实范式**：纯生成易出物理幻觉，加一层风险门控能显著降低部署风险；
- **整流流/Reflow 把生成式控制带进实时**：扩散类方法的采样慢是实时控制的硬伤，整流流是有效解；
- **OOD 文本是被低估的失败源**：把语义异常检测显式纳入控制回路，对开放词表指令系统尤为重要；
- **与同组 SplitAdapter 一脉**：作者群与三星系人形工作风格一致，关注「真机可执行/安全」的工程闭环。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2603.23983](https://arxiv.org/abs/2603.23983) | 论文正文（整流流生成、三段安全门、G1 实验） |
| [项目页 hanbyelcho.info/safeflow](https://hanbyelcho.info/safeflow/) | 概述、方法图、真机视频 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与项目页整理；**逐项数值结果以原文/PDF 为准**。

---

## 🔗 相关阅读

- **同模块·文本/语言驱动全身控制**：[ULTRA（统一多模态控制）](../ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation/ULTRA_Unified_Multimodal_Control_for_Autonomous_Humanoid_Whole-Body_Loco-Manipulation.html) · [TextOp（实时交互式文本驱动运动生成）](../TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C/TextOp__Real-time_Interactive_Text-Driven_Humanoid_Robot_Motion_Generation_and_C.html)；
- **生成式 + 控制融合**：[Heracles（状态条件扩散中间件）](../Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control/Heracles__Bridging_Precise_Tracking_and_Generative_Synthesis_for_General_Humanoid_Control.html)；
- **安全 / 跌落**：[VIGOR（统一跌落安全）](../VIGOR_Visual_Goal-In-Context_Inference_for_Unified_Humanoid_Fall_Safety/VIGOR_Visual_Goal-In-Context_Inference_for_Unified_Humanoid_Fall_Safety.html)。
