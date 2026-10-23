---
layout: paper
title: "A Multimodal Label Forecasting Method for Aperiodic Visuo-Motor Time Series"
zhname: "EMP：面向非周期视觉—运动时间序列的多模态标签预测方法"
category: "State Estimation"
arxiv: "2609.07930"
---

# A Multimodal Label Forecasting Method for Aperiodic Visuo-Motor Time Series
**把「人形机器人会不会在 P 步后摔倒」做成逐时间步的时间序列标签预测：头部相机画面、实测关节角和运动规划器给出的（含未来段的）计划关节轨迹三路编码后拼起来做二分类，并发布一个真机、一个仿真的 Poppy 摔倒预测数据集**

> 📅 总结日期: 2026-10-23
>
> 🏷️ 板块: 09 State Estimation · 摔倒预测 · 时间序列预测（TSF）· 外生变量 · 第一视角视觉 + 本体感受 · Poppy 人形 · PyBullet
>
> 🔁 推进轨: 模块轮转（08_Navigation → **09_State_Estimation**）· 上游 awesome-humanoid-robot-learning State Estimation 章节中尚无笔记的最新论文（2026.09.07，PROGRESS #700）

---

## 📋 基本信息

| 项目 | 链接 |
|---|---|
| arXiv | [2609.07930](https://arxiv.org/abs/2609.07930) |
| HTML | [arxiv.org/html/2609.07930](https://arxiv.org/html/2609.07930) |
| PDF | [下载最新版（v2）](https://arxiv.org/pdf/2609.07930) |
| **发布时间** | 2026-09-07（arXiv v1） |
| 版本 / 会议 | v2（2026-09-18）是 ICMLA 2026 录用论文的扩展版，本笔记以 v2 为准 |
| 项目主页 | 没有单独的项目页 |
| 源码 | ⏳ 截至 2026-10-23 未公开（摘要写明「代码和数据集将在录用后公开」） |
| 依赖的开源组件 | 回归基线取自清华 [Time-Series-Library](https://github.com/thuml/Time-Series-Library)；仿真用 [PyBullet](https://pybullet.org)，场景家具来自 [XWorld](https://github.com/PaddlePaddle/XWorld)；机器人是开源的 [Poppy Humanoid](https://www.poppy-project.org/) |

**作者**：Borui He, Garrett E. Katz（雪城大学 EECS 系）

---

## 🎯 一句话总结

主流深度时间序列预测（TSF）基准——ETT、Electricity、Traffic、Weather 等——几乎都带明显周期，模型也围绕周期设计（时间戳编码、多周期分解）；本文换了一个**没有周期**的任务：根据头部相机画面和关节角，**预测人形机器人在 P 个时间步之后的那一帧是否已经摔倒**。作者用 Poppy 人形采了一个真机数据集 RP（110 段、约 16 fps）和一个 PyBullet 仿真数据集 SimP（2000 段、30 fps），并提出 EMP 模型：**E**gocentric vision（低通 FFT + 3D 卷积）、**M**otion planning（规划器给出的过去 + 未来计划关节轨迹，作外生变量，TimesNet 式频域卷积）、**P**roprioception（DCT + 时空分离 MLP + 空间维归一化）三个编码器拼接后接线性分类头。EMP 在 RP（P = 12）上准确率 95.45%、SimP（P = 30）上 95.90%，比 TimesNet / FlowFormer / EgoFalls 高 10 个百分点以上；消融显示**提供未来的计划轨迹**是最主要的增益来源。

---

## 📌 英文缩写速查

| 缩写 | 全称 | 解释 |
|---|---|---|
| TSF | Time Series Forecasting | 时间序列预测 |
| EMP | Egocentric vision + Motion planning + Proprioception | 本文模型，三路输入的首字母 |
| MP / EP / P | — | 消融：去掉视觉 / 去掉计划轨迹 / 只用本体感受 |
| RP / SimP | Real Poppy / Simulated Poppy | 本文的真机 / 仿真数据集 |
| DCT / iDCT | (Inverse) Discrete Cosine Transform | 离散余弦变换及其逆，运动编码器的首尾层 |
| rFFT | Real Fast Fourier Transform | 实数快速傅里叶变换，轨迹编码器用它选主频 |
| RRT | Rapidly-exploring Random Tree | 快速扩展随机树，仿真里生成多样轨迹 |
| MAPE | Mean Absolute Percentage Error | 平均绝对百分比误差 |
| ECE | Expected Calibration Error | 期望校准误差，置信度与实际准确率之差 |

---

## ❓ 论文要解决什么问题？

1. **TSF 基准太「周期」**：图 1 / 图 5 的自相关曲线里，ETT、PEMS、Electricity 等都有接近 1 的周期峰，只有汇率不周期；而机器人走得足够多样时，关节角、画面和摔倒标签都不再周期，现有模型的设计假设失效。
2. **缺「逐时间步的未来标签」这类任务**：TSF 里的回归预测未来数值，分类给整段序列一个标签；摔倒预测需要的是「未来第 $t+P$ 步的类别」，关节角数值本身也不如「会不会摔」好用。
3. **外生变量用得少**：多数模型唯一的外生变量是时间戳；机器人有一个物理上真正有意义、且**未来值已知**的外生变量——运动规划器提前算好的计划关节轨迹。
4. **多模态用得少**：现有 TSF 模型大多单模态，没有把第一视角画面与关节读数结合起来。

> 放在 09 State Estimation 模块里看：这是一篇「从本体感受 + 视觉推断机器人未来状态（是否摔倒）」的工作，比典型的里程计 / 滤波更偏机器学习，机器人也是小型的 Poppy（约 83 cm、位置控制），不是全尺寸人形。

---

## 🔧 方法拆解

### 1. 问题形式化

- 过去 $N$ 步的内生序列 $X _ {t-N:t} \in \mathbb{R}^{N \times C _ {endo}}$（关节角 + 图像像素）；
- 过去 $N$ 步加未来 $P$ 步的外生序列 $Y _ {t-N:t+P} \in \mathbb{R}^{(N+P) \times C _ {exo}}$（计划关节轨迹）；
- 预测未来第 $P$ 步的类别 $L _ {t+P}$（站着 / 已摔倒）。RP 用 $N = 24$、$P \in \{6, 12, 18, 24\}$；SimP 用 $N = 60$、$P \in \{15, 30, 45, 60\}$。

### 2. 三个编码器（图 2）

| 编码器 | 输入 | 结构 | 设计理由 |
|---|---|---|---|
| **运动（P）** | 实测关节角 $M \in \mathbb{R}^{B \times N \times C}$ | DCT → 空间块 → 若干时间块 → 空间块 → iDCT（式 6）；每块 = 线性层 + **沿空间维（关节）的 instance norm**（式 3–5） | 借鉴 siMLPe：一层只在时间或关节一个维度上混合，计算量小；表 5 显示空间维归一化比 LayerNorm / BatchNorm 高 10–25 个点 |
| **视觉（E）** | 头部相机 RGB 序列 $(B, 3, N, H, W)$ | 2D FFT → 方形低通掩码（阈值 $a = 30$）→ iFFT（式 8）→ 多尺度 3D 卷积（式 9） | 摔倒表现为视野大面积快速变化，低空间频率保留大结构、丢掉细节 |
| **轨迹（M）** | 计划关节轨迹 $T \in \mathbb{R}^{B \times (N+P) \times C}$ | rFFT 取幅值最大的 $k = 3$ 个频率 → 按周期折成 2D → 多尺度 2D 卷积（inception）→ softmax 幅值加权残差（式 10） | 实测关节角受噪声扰动不周期，但计划轨迹（重复步态）可能仍有周期，可借 TimesNet 的周期折叠 |

三路特征展平、拼接，再过一层线性层（$d _ {model} = 1024$）输出类别。

### 3. 数据集与采样（第 4.1 节）

- **RP（真机）**：Poppy 在办公室、计算机实验室（地毯）和走廊（瓷砖，更滑）各走 6 步，步态是手工设计步态加随机扰动；人工记录哪一步摔倒，那一步及之后的帧都标为摔倒。办公室 + 实验室用于训练 / 验证，**走廊做测试**（换场景）。
- **SimP（仿真）**：PyBullet 位置控制，RRT 规划出更多样的轨迹，对路点加扰动诱发摔倒（式 11–12）：$\sigma \le 0.01$ 时 factor = 1，否则 factor 按 logistic 曲线从 0 长到 1.5（$a = 90$、$b = 0.125$），$\sigma \in \{0.005, 0.010, 0.035, 0.040\}$；四面墙从 28 张贴图里随机选，6 件家具随机摆在视野里；头部高度低于 0.7 m 起的所有帧标为摔倒。划分 0.8 / 0.1 / 0.1。
- **严格 i.i.d.**：每个训练样本来自不同 episode（不用同一 episode 的滑动窗口），拒绝采样平衡两类；历史窗口的最后一帧不超过「首次摔倒帧 − $P$」（附录图 9），保证窗口里没有已经摔倒的信号，模型是真的在**预测**而不是「持续性模型」。

### 4. 训练

单张 A40，Adam，最多 10 个 epoch、patience 3 的早停，batch size 4（加载视频是瓶颈）；三个编码器与分类头各自有学习率 / 权重衰减（附录表 6，例如 SimP 上视觉模块学习率只有 $10^{-6}$）。每种配置跑 5 次，用 Welch t 检验比较。

---

## 🧭 整体流程（mermaid）

<div class="mermaid">
flowchart TB
    subgraph DATA["📦 数据集（Poppy 人形）"]
        RP["RP 真机：110 段 · 约 16 fps<br/>办公室 / 实验室训练，走廊测试<br/>人工标注摔倒步"]
        SIM["SimP 仿真：2000 段 · 30 fps<br/>RRT 轨迹 + logistic 路点扰动<br/>随机墙纸 + 家具<br/>头高 &lt; 0.7 m 记为摔倒"]
        SAMP["每段只取一个样本（严格 i.i.d.）<br/>拒绝采样平衡类别<br/>窗口末帧 ≤ 首次摔倒帧 − P"]
        RP --> SAMP
        SIM --> SAMP
    end

    subgraph EMP["🧠 EMP 模型"]
        E["E：头部相机 RGB × N 帧<br/>FFT 低通（a = 30）→ iFFT → 多尺度 3D 卷积"]
        M["M：计划关节轨迹（过去 N + 未来 P）<br/>rFFT 取前 3 个主频 → 2D 折叠 → inception 卷积 → 残差"]
        P["P：实测关节角 × N 帧<br/>DCT → 空间块 → 时间块 × 6 → 空间块 → iDCT<br/>每块沿关节维 instance norm"]
        CAT["展平拼接 → 线性层（d_model = 1024）"]
        OUT["L_{t+P}：P 步后站着 / 已摔倒"]
        E --> CAT
        M --> CAT
        P --> CAT
        CAT --> OUT
    end

    SAMP --> E
    SAMP --> M
    SAMP --> P
    OUT --> EVAL["评测：准确率 · F1 / ECE / ROC-AUC<br/>对比 TimesNet / FlowFormer / EgoFalls<br/>与逻辑回归、LinearSVC、三模型投票集成"]
</div>

---

## 🚶 具体实例

### 例 1：仿真扰动什么时候「开闸」（式 12）

$\sigma > 0.01$ 时 factor $= 1.5 / (1 + e^{90 - 0.125\rho})$，$\rho$ 是本段已经走过的仿真步数：

| $\rho$ | $90 - 0.125\rho$ | factor |
|---|---|---|
| 560 | 20 | $3.1 \times 10^{-9}$（几乎没有扰动） |
| 640 | 10 | $6.8 \times 10^{-5}$ |
| 720 | 0 | 0.75（一半） |
| 760 | −5 | 1.49 |
| 800 | −10 | 1.50（饱和） |

也就是前 600 多步机器人正常走，之后 100 步左右扰动迅速放大到 1.5 倍噪声——论文说 $a = 90$ 是为了「避免过早失败」，这样每段摔倒前都有一段足够长的正常历史可以采样。

### 例 2：窗口能放在哪里（附录图 9）

SimP 中 $N = 60$。假设某段在第 300 帧头部首次低于 0.7 m，取 $P = 30$：历史窗口最后一帧最多是第 $300 - 30 = 270$ 帧，所以窗口落在第 211–270 帧之间或更早，标签取第 $t + 30$ 帧。$P$ 越大，停止线越往前，窗口离摔倒越远、任务越难——但表 2 里 EMP 在 SimP 上从 $P = 15$ 到 $60$ 只从 96.60% 降到 95.50%，而只用本体的 MP 从 96.00% 掉到 87.90%。

### 例 3：浅层基线的「推断比」（附录 D）

作者定义 ROI = 最佳预测跨度 / 历史长度。prePARE（四足打滑预测）历史 3.6 s、最佳跨度 0.72 s，ROI = 0.2；本文 RP 上逻辑回归 / LinearSVC 在 $P = 6$、$N = 24$（ROI = 0.25）时准确率 81.82%，**反而高于 EMP 的 70.91%**；但 $P = 24$ 时降到 75–81%，EMP 是 95.00%。短跨度靠手工特征也能做，长跨度才需要 EMP。

---

## 📊 关键结果

### 表 2：主结果（准确率 %，5 次平均）

| 数据集 | $P$ | EMP | MP | TimesNet | FlowFormer | EgoFalls |
|---|---|---|---|---|---|---|
| RP | 6 | **70.91** | 67.27 | **70.91** | 70.00 | 54.55 |
| RP | 12 | **95.45** | 94.55 | 80.91 | 81.82 | 51.80 |
| RP | 18 | 89.00 | **93.00** | 81.00 | 87.00 | 42.50 |
| RP | 24 | **95.00** | 94.00 | 86.00 | 89.00 | 50.00 |
| SimP | 15 | **96.60** | 96.00 | 79.90 | 90.90 | 78.17 |
| SimP | 30 | **95.90** | 90.40 | 74.10 | 80.00 | 76.35 |
| SimP | 45 | **96.10** | 89.50 | 76.70 | 76.10 | 78.08 |
| SimP | 60 | **95.50** | 87.90 | 75.80 | 76.30 | 79.65 |

- RP、$P = 12$ 时 EMP 95.45% 比最好的深度基线 FlowFormer（81.82%）高 13.63 个点；摘要说的「真实数据上至少高 12.73%」论文没写明怎么算，数值上恰好等于 EMP 与附录表 8 里逻辑回归（只用关节角，82.73%）之差（我们的推测）。SimP、$P = 30$ 下 t 检验 p 值从 0.024（TimesNet）到 $10^{-40}$（EgoFalls）。
- RP、$P = 18$ 时 MP 反超 EMP（93 vs 89）；加跑 25 次后差距缩小到 1.67 个点，t 检验不显著——作者认为视觉在小数据上更容易过拟合。
- 回归任务（表 1）里 6 个 SOTA 模型几乎都没法把 MAPE 降到 1 以下（只有 TiDE、TimeXer 在短跨度上做到），作者据此认为直接改造回归模型来做这个分类也不会好，只保留了 TimesNet 当分类基线。

### 表 3–5：消融

| 设计 | RP 准确率（$P = 12$） | SimP 准确率（$P = 30$） |
|---|---|---|
| EMP（全部） | **95.45** | **95.90** |
| MP（去视觉） | 94.55 | 90.40 |
| EP（去计划轨迹） | 92.73 | 86.60 |
| P（只用关节角） | 89.09 | 85.90 |
| 计划轨迹换成实测关节角（表 4） | 94.55 | 84.80 |
| 计划轨迹只给过去 $N$ 步（表 4） | 94.54 | 84.20 |

- SimP 上 30 次重复的 t 检验都显著（$p \le 3 \times 10^{-11}$）；RP 上差异不显著（数据少、测试只有走廊）。
- **未来的计划轨迹**是关键：SimP 上只给过去部分就从 95.90% 掉到 84.20%，和把它换成实测关节角（84.80%）差不多——说明有用的是「未来还要做什么」这部分信息。RP 上的手工步态多样性有限，所以差别小。
- 表 5：空间维 instance norm 在 8 种组合里都最好（例如 SimP 上 EMP 95.90% vs LayerNorm 80.48% / BatchNorm 80.13%）。

### 附录：更多指标与集成

- 表 7：SimP 上 EMP 的 F1 0.95–0.97、ECE 0.024–0.035、ROC-AUC 0.98–0.99；RP 在 $P = 12$ / $24$ 时召回率为 1。
- 表 9：TimesNet + FlowFormer + EgoFalls 多数投票的「多模态集成」只有 RP、$P = 6$ 时比 EMP 高（72.73% vs 70.91%），长跨度都明显落后。

---

## 💡 核心贡献

1. **新任务**：非周期、带外生变量的「逐时间步未来类别预测」，用人形摔倒预测作为实例。
2. **两个数据集**：Poppy 真机 RP 与 PyBullet 仿真 SimP，同时记录头部相机视频、关节角、计划轨迹和逐帧摔倒标签，自相关分析证明它们不周期。
3. **EMP 基线**：三路编码器（低通视觉、频域轨迹、DCT 时空 MLP），把运动规划器的未来计划作为物理上有意义的外生变量，配合严格 i.i.d. 采样，在两种数据上都显著优于现有 TSF 分类模型。

---

## 🤖 对人形机器人领域的意义

- **摔倒预警的信息来源**：消融说明，比起看更多传感器，知道「规划器接下来要让关节怎么走」更能判断会不会摔——对有 MPC / 轨迹规划器的人形控制栈来说，计划轨迹是现成的、几乎免费的输入。
- **提醒数据切分方式**：机器人时间序列常用同一 episode 的滑动窗口，训练 / 测试样本高度相关；本文每段只取一个样本、并保证窗口不含摔倒信号，是更严格的评测做法。
- **局限**：Poppy 是位置控制的小型机器人、真机只有 110 段且只在三处室内场景采集；没有和基于物理量的摔倒检测（ZMP / 捕获点 / 质心）或基于 RL 策略的人形对比；预测只是二分类，没有接到下游的防摔 / 保护动作上；代码与数据集尚未放出。

---

## 🛠️ 运行时序图（按论文描述；官方代码未开源）

论文没有放出代码，下图按第 3、4 节与附录 A 画一次训练迭代和一次在线预测的调用顺序，便于对照三路编码器各自吃什么；在线部署是我们的推演，论文只做了离线评测。

<div class="mermaid">
sequenceDiagram
    autonumber
    participant DS as 数据集（RP / SimP）
    participant SP as 采样器（每段一个样本）
    participant ENC_E as 视觉编码器 E
    participant ENC_M as 轨迹编码器 M
    participant ENC_P as 运动编码器 P
    participant HEAD as 拼接 + 线性分类头
    participant OPT as Adam（各模块独立学习率）

    DS->>SP: 一段 episode（视频、关节角、计划轨迹、逐帧标签）
    SP->>SP: 找首次摔倒帧 f，窗口末帧 t ≤ f − P；拒绝采样平衡类别
    SP->>ENC_E: RGB[t−N:t]
    SP->>ENC_M: 计划关节轨迹[t−N:t+P]（含未来）
    SP->>ENC_P: 实测关节角[t−N:t]
    ENC_E->>ENC_E: FFT → 方形低通 a=30 → iFFT → 3D 卷积
    ENC_M->>ENC_M: rFFT 取前 3 主频 → 2D 折叠 → inception 卷积 → 加权残差
    ENC_P->>ENC_P: DCT → 空间块 → 时间块×6 → 空间块 → iDCT
    ENC_E-->>HEAD: 视觉特征
    ENC_M-->>HEAD: 轨迹特征
    ENC_P-->>HEAD: 运动特征
    HEAD->>HEAD: 展平拼接 → d_model=1024 → logits
    HEAD-->>OPT: 与标签 L[t+P] 的分类损失
    OPT->>ENC_E: 更新（lr 1e-5 / 1e-6）
    OPT->>ENC_M: 更新
    OPT->>ENC_P: 更新
    Note over SP,OPT: 最多 10 个 epoch，验证集 patience 3 早停
    Note over DS,HEAD: 在线时（推演）：规划器每次给出新计划，就用最近 N 帧 + 计划未来 P 步预测 P 步后是否摔倒
</div>

---

## 🎤 面试参考

**Q：为什么说现有 TSF 模型不适合这个任务？**
A：它们大多围绕周期设计（时间戳编码、多周期分解），基准也几乎都周期明显；机器人在多样轨迹下关节角和摔倒标签都不周期。论文先用回归任务验证：6 个 SOTA 模型 MAPE 大多高于 1，说明连预测未来关节角都做不好。

**Q：用「未来的计划轨迹」算不算信息泄漏？**
A：不算。计划轨迹由规划器提前生成、本来就驱动位置控制，在 $t$ 时刻确实已知；未来的**实测**关节角才不可用，模型也没用。消融表明增益确实来自未来段：只给过去部分时 SimP 掉了 11.7 个点。

**Q：怎么保证模型在预测，而不是看到已经开始摔就报警？**
A：历史窗口末帧不超过「首次摔倒帧 − $P$」，窗口里没有任何摔倒帧；且每段只取一个样本，避免同一段的相邻窗口同时出现在训练和测试里。

**Q：为什么视觉要做低通？**
A：摔倒时画面是整体快速旋转 / 下坠，信息在低空间频率；高频细节（墙纸纹理、家具）在仿真里是随机化的干扰。低通后再用 3D 卷积建模帧间变化。

---

## 🔗 相关阅读

- [InEKFormer](../InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots/InEKFormer__A_Hybrid_State_Estimator_for_Humanoid_Robots.html)：同模块里另一篇用 Transformer 处理本体感受时间序列的人形状态估计
- [AutoOdom](../AutoOdom__Learning_Auto-regressive_Proprioceptive_Odometry_for_Legged_Locomotio/AutoOdom__Learning_Auto-regressive_Proprioceptive_Odometry_for_Legged_Locomotio.html)：学习式本体里程计，对照「从本体序列推断状态」的另一种目标
- [Transformer](../../01_Foundational_RL/Transformer_Attention_Is_All_You_Need/Transformer_Attention_Is_All_You_Need.html)：TSF 里 Informer / Autoformer / FlowFormer 等基线的底座
- PROGRESS #705 [Standing Tall: Sim to Real Fall Classification and Lead Time Prediction for Bipedal Robots](https://arxiv.org/abs/2506.01141)：同模块里另一篇双足摔倒预测（尚无笔记）
