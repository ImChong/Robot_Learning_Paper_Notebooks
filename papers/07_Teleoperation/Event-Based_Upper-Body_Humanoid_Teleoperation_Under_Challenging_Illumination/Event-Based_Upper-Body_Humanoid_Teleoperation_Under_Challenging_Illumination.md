---
layout: paper
title: "Event-Based Upper-Body Humanoid Teleoperation Under Challenging Illumination"
zhname: "极端光照下的事件相机上肢人形遥操作"
category: "Teleoperation"
arxiv: "2607.29227"
---

# Event-Based Upper-Body Humanoid Teleoperation Under Challenging Illumination
**用神经形态事件相机替代 RGB 做上肢人形遥操作：借助事件相机的高动态范围与异步高时间分辨率，在强逆光与 <5 lux 极暗、以及快速运动场景下稳定跟踪人体上肢姿态，再经头戴 IMU 重力对齐 + One-Euro 滤波 + TWIST 因果重定向映射到 18-DoF 人形上半身，端到端「光子到动作」延迟仅 23–34 ms**

> 📅 阅读日期: 2026-08-25
>
> 🏷️ 板块: 07 Teleoperation · 事件相机 / 神经形态视觉 · 上肢遥操作 · 极端光照 · 运动重定向
>
> 🔁 推进轨: 模块轮转（06_Manipulation → 07_Teleoperation）· 优先该模块最新发表且尚无笔记的论文

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| 时间 | 2026 年 7 月（arXiv v1，2026-07-31） |
| arXiv | [2607.29227](https://arxiv.org/abs/2607.29227) · [PDF](https://arxiv.org/pdf/2607.29227) · [HTML](https://arxiv.org/html/2607.29227v1) |
| 作者 | Haoyu Fu、Zhou Ge、Chengze Li、Chenzhao Sun、Ze Cui、Wenjing Zhou、Xulei Qin |
| 单位 | 上海大学（机电工程与自动化学院 / SHU 通用智能机器人研究院）× 长春理工大学（物理学院） |
| 主题 | cs.RO · 事件相机遥操作 / 人体姿态估计 / 运动重定向 |
| 源码 | 论文未给出公开代码或项目主页（故本篇无源码运行时序图） |

> 来源：arXiv cs.RO · Teleoperation 模块最新发表且尚无笔记的一篇。

---

## 🎯 一句话总结

> 传统 RGB 相机在**强逆光 / 极暗 / 快速运动**下会过曝、欠曝、运动模糊，导致遥操作跟人「跟丢」。本文提出一个**由神经形态事件相机驱动的实时上肢人-人形动作模仿框架**：用事件相机（>120 dB 动态范围、异步微秒级响应）替代 RGB 做上肢姿态感知，配**重力对齐的惯性融合**抑抖，末端接 **TWIST 运动模块**做运动学重定向，实现 **23–34 ms** 的「光子到动作」端到端延迟；在**逆光、<5 lux 极暗、快速运动**等困难场景下显著优于 RGB 基线，而在**光照良好的静态**场景 RGB 仍略占优。

---

## 📌 英文缩写速查

| 缩写 | 含义 |
|---|---|
| Event Camera | 事件相机 / 神经形态视觉，逐像素异步输出亮度变化事件 |
| DVS | Dynamic Vision Sensor，动态视觉传感器（事件相机的一类） |
| Time-Surface | 时间面表征，把近期事件按时间衰减编码成稠密张量 |
| MPJPE | Mean Per-Joint Position Error，平均每关节位置误差 |
| One-Euro Filter | 一种低延迟自适应平滑滤波器 |
| TWIST | 论文采用的运动重定向 / 遥操作模仿模块 |
| DoF | Degree of Freedom，自由度 |
| lux | 勒克斯，照度单位（<5 lux 约为极暗环境） |

---

## ❓ 论文要解决什么问题？

上肢人形遥操作普遍依赖 **RGB 相机**做人体姿态感知，但 RGB 在真实工况下有硬伤：

- **强逆光 / 高动态范围**：主体过曝或成剪影，关节看不清；
- **极暗（<5 lux）**：欠曝、噪声大，姿态估计崩溃；
- **快速运动**：曝光时间内产生运动模糊、丢帧，跟踪滞后。

论文要回答：**能否用事件相机的高动态范围与高时间分辨率，做出一套在这些困难光照/运动条件下仍稳定、低延迟的上肢遥操作系统？**

---

## 🔧 方法详解

### 1. 事件表征：轻量时间面（Time-Surface）
对事件流以 **5 ms 累积窗、1 ms 步长** 生成时间面：每个像素按 `∑ exp(-(t-tᵢ)/τ)`（τ=5 ms）对近期事件做时间衰减聚合，得到 **256×256** 的稀疏张量。选这种稀疏编码是为了在嵌入式平台上**低延迟**。

### 2. 感知模块：轻量 3D 姿态骨干
用一个类 **MediaPipe** 的 3D 骨干（**2.1M 参数**）从事件张量回归 **17 个 3D 关节 + 置信度**；训练用 **V2E** 把 Human3.6M 转成事件数据、再在 **DHP19** 上微调；**TensorRT FP16** 推理在 NVIDIA **Booster T1** 上 **>100 Hz**，留出验证集 **MPJPE 31.8 mm**。

### 3. 惯性融合 + 重力对齐
头戴 **IMU** 用于**对齐重力方向**，并施加 **One-Euro 滤波（β=0.4，f_min=1.5 Hz）** 抑制抖动；辅以事件密度归一化与时间一致性检查，稳住异步感知。

### 4. TWIST 运动重定向（因果优化）
因果优化器最小化：`w_t·‖FK(Qₖ)−S_target‖² + w_s·‖Q̇ₖ‖² + w_l·‖Qₖ−Q_nom‖²`（权重 1.0 / 0.1 / 0.01，分别对应**跟踪 / 平滑 / 靠近名义位形**）；求解在 **10 ms 控制周期**内 **3–5 次迭代**收敛，并用**置信度自适应加权**下调低置信度的远端关节。

### 5. 部署
控制 **18-DoF** 人形**上半身**（躯干 + 双臂），下肢保持名义站姿；端到端**光子到动作延迟 23–34 ms**。

---

### 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart LR
    OP["🧑 操作者上肢动作"] --> EVK["📷 事件相机<br/>Prophesee EVK4<br/>&gt;120dB / 异步"]
    EVK --> TS["时间面表征<br/>5ms 窗 / 1ms 步长"]
    TS --> POSE["3D 姿态骨干<br/>2.1M 参数 · 17 关节+置信度<br/>TensorRT FP16 &gt;100Hz"]
    IMU["🧭 头戴 IMU"] --> FUSE
    POSE --> FUSE["重力对齐 + One-Euro 融合<br/>置信度自适应"]
    FUSE --> TWIST["TWIST 因果重定向<br/>跟踪+平滑+名义位形<br/>3–5 迭代 / 10ms"]
    TWIST --> ROBOT["🤖 18-DoF 人形上半身<br/>Booster T1"]
    ROBOT --> LAT["⏱️ 光子到动作 23–34 ms"]

    style EVK fill:#e8f4fd,stroke:#1f78b4,color:#0b3954
    style TWIST fill:#eafaf1,stroke:#27ae60,color:#145a32
    style LAT fill:#fde8e8,stroke:#c0392b,color:#641e16
</div>

---

## 📊 关键结果

| 指标 | 事件相机 | RGB (30 FPS) |
|---|---|---|
| 延迟 (ms) | **23–34** | 43–74 |
| 时间抖动 (mm) | **10.8±3.1** | 18.9±5.5 |
| 关节 RMSE (°) | **4.9±1.3** | 6.2±2.0 |
| MPJPE (mm) | 33.8±4.6 | **31.7±4.2** |

**困难条件（跟踪成功率 / 丢帧率）**

- **HDR 逆光**：事件 **93.8%** vs RGB 38.6%；
- **极暗 (<5 lux)**：事件 **84.7%** vs RGB 49.2%；丢帧 **3.8%** vs 14.7%；
- **快速运动**：事件丢帧 **2.9%** vs RGB 10.8%。

> 结论：**快速或弱光**场景事件相机全面占优；**光照良好的静态**场景 RGB 的 MPJPE 略好——事件与 RGB 各有适用区间。

---

## 💡 核心贡献

1. **首个由事件相机驱动的实时上肢人形遥操作框架**：把神经形态视觉引入「人→人形」上肢动作模仿；
2. **困难光照鲁棒**：在强逆光、<5 lux 极暗、快速运动下稳定跟踪，成功率大幅超过 RGB；
3. **低延迟工程闭环**：时间面稀疏编码 + 轻量骨干 + TensorRT + TWIST 因果优化，端到端 **23–34 ms**；
4. **重力对齐惯性融合**：头戴 IMU + One-Euro 抑抖，配置信度自适应加权稳住远端关节。

---

## 🤖 对人形机器人学习的启发

- **传感器选型是遥操作鲁棒性的第一性问题**：在照度/动态范围恶劣的工况，换用事件相机比堆算法更直接；
- **仿真到事件的数据合成（V2E）** 让缺乏事件标注数据的姿态任务也能训练，是一条可复用路径；
- **稀疏时间面 + 轻量骨干 + TensorRT** 的组合，为嵌入式端上「感知—重定向」实时闭环提供了参考；
- 与 TWIST 系遥操作、Mobile-TeleVision 等「沉浸式视觉反馈」工作互补：本文补上了**极端光照**这一被忽视的维度。

---

## 📁 资源对照

| 资源 | 内容 |
|---|---|
| [arXiv 2607.29227](https://arxiv.org/abs/2607.29227) | 论文正文（事件表征、姿态骨干、IMU 融合、TWIST 重定向、困难光照实验） |
| [PDF](https://arxiv.org/pdf/2607.29227) · [HTML](https://arxiv.org/html/2607.29227v1) | 原文 PDF / 网页版 |

> ℹ️ 备注：本笔记依据 arXiv 摘要与网页版整理；**逐项数值以原文/PDF 为准**。论文未公开代码/项目页，故未附源码运行时序图。

---

## 🔗 相关阅读

- **同模块·运动重定向遥操作底座**：[TWIST: Teleoperated Whole-Body Imitation System](../TWIST__Teleoperated_Whole-Body_Imitation_System/TWIST__Teleoperated_Whole-Body_Imitation_System.html)；
- **同模块·沉浸式视觉反馈**：[Mobile-TeleVision: Predictive Motion Priors for Humanoid Whole-Body Control](../Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control/Mobile-TeleVision__Predictive_Motion_Priors_for_Humanoid_Whole-Body_Control.html)；
- **同模块·全体感遥操作系统**：[Teleopit: A Full-Embodiment Humanoid Teleoperation System](../Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System/Teleopit__A_Full-Embodiment_Humanoid_Teleoperation_System.html)。
